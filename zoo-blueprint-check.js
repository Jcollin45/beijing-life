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
  ['preservation.keepExact',bp.preservation.keepExact],
  ['preservation.existingStaffGates',bp.preservation.existingStaffGates],
  ['preservation.relocateForCentralSpine',bp.preservation.relocateForCentralSpine],
  ['preservation.retainSouthWall',bp.preservation.retainSouthWall],
  ['controlledCrossings',bp.controlledCrossings],
  ['barrierArchetypes',bp.habitatBarrierSystem?.archetypes],
  ['animalTransferCrossings',bp.animalTransferCrossings],
  ['visitorLoops',bp.routes.visitorLoops], ['keeperRoutes',bp.routes.keeperRoutes],
  ['keeperAccessSpurs',bp.routes.keeperAccessSpurs],
  ['habitatThings',bp.interactions.habitatThings],
  ['requiredPublicThings',bp.interactions.requiredPublicThings],
  ['wayfinding.groundMedallions',bp.wayfinding.groundMedallions],
  ['wayfinding.fingerposts',bp.wayfinding.fingerposts],
]) for (const item of list || []) ownId(item, group);
ownId(bp.routes.serviceCart, 'serviceCart');
ownId(bp.routes.accessibleTour, 'accessibleTour');
for (const [group,list] of Object.entries(bp.objectSchedules || {}))
  for (const item of list || []) {
    ownId(item, `objectSchedules.${group}`);
    if (item.thingId) ownId({id:item.thingId}, `objectSchedules.${group}.thingId`);
  }
for (const [group,list] of Object.entries(bp.planting || {}))
  for (const item of list || []) ownId(item, `planting.${group}`);
for (const x of bp.animalTransferCrossings || [])
  for (const g of x.interlockedGates || []) ownId(g, `${x.id}.interlockedGates`);
for (const b of bp.buildings || [])
  for (const [group,list] of [['internalDriveAisles',b.internalDriveAisles],
    ['solidSegments',b.solidSegments],['perimeterFence.runs',b.perimeterFence?.runs]])
    for (const q of list || []) ownId(q, `${b.id}.${group}`);
const tropical = (bp.buildings || []).find(q => q.id === 'B08-tropical-house')?.scene;
if (tropical) {
  for (const [group,list] of [['tropical.rooms',tropical.rooms],['tropical.paths',tropical.paths],
    ['tropical.objects',tropical.objects],['tropical.doors',tropical.doors],
    ['tropical.restNiches',tropical.restNiches],['tropical.staffPaths',tropical.staffPaths],
    ['tropical.speciesThings',tropical.speciesThings],['tropical.outerWalls',tropical.outerWalls]])
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
  for (const id of p.connects || []) {
    const q=pathMap.get(id);
    if (!q) continue;
    const d=polylineDistance(p,q), allowed=(p.width+q.width)/2+.05;
    assert(d<=allowed,'PATH_CONNECTION_GEOMETRY',`${p.id}/${id}`,
      `declared connection is ${d.toFixed(2)}m apart; surface tolerance is ${allowed.toFixed(2)}m`);
  }
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
  if (p && h.focus?.length===2) assert(pathDistance(h.focus,p) <= p.width/2 - bp.engineContract.playerRadius + 1e-6,
    'HABITAT_FOCUS_PATH', h.id,
    `focus is ${pathDistance(h.focus,p).toFixed(2)}m from ${p.id}; standable inset is ${(p.width/2-bp.engineContract.playerRadius).toFixed(2)}m`);
  assert((bp.habitatBarrierSystem?.archetypes||[]).some(q=>q.id===h.barrier?.archetypeId),
    'HABITAT_BARRIER_ARCHETYPE',h.id,`unknown barrier archetype ${h.barrier?.archetypeId}`);
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
  if (ordered(b.footprint)) assert(insideRect(b.footprint,site),
    'BUILDING_SITE', b.id, 'outside site');
  if (b.district!==null) {
    const d=districts.get(b.district);
    assert(!!d,'BUILDING_DISTRICT',b.id,`unknown district ${b.district}`);
    if (d&&ordered(b.footprint)) assert(insideRect(b.footprint,d.bounds),'BUILDING_DISTRICT_BOUNDS',b.id,
      `footprint leaves ${b.district}`);
  } else assert(b.owner==='site-perimeter','BUILDING_OWNER',b.id,
    'district-null building must declare owner=site-perimeter');
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
  for (const aisle of b.internalDriveAisles || []) {
    const q=rect(aisle.rect);
    assert(ordered(q)&&insideRect(q,b.footprint),'BUILDING_AISLE',`${b.id}/${aisle.id}`,
      'internal aisle must be ordered and inside the compound');
    for (const room of b.rooms || []) assert(!overlap(q,rect(room.rect)),'BUILDING_AISLE_ROOM',
      `${b.id}/${aisle.id}/${room.id}`,'internal drive aisle enters a room');
  }
  for(const seg of b.solidSegments||[]) {
    const q=rect(seg.rect);
    assert(ordered(q)&&insideRect(q,b.footprint),'BUILDING_SOLID_SEGMENT',`${b.id}/${seg.id}`,
      'explicit solid segment must lie inside footprint');
  }
  if(b.perimeterFence?.runs) {
    for(const run of b.perimeterFence.runs) assert(['x','z'].includes(run.axis)&&finite(run.at)&&
      Array.isArray(run.range)&&run.range.length===2&&run.range[0]<run.range[1],
      'FENCE_RUN',`${b.id}/${run.id}`,'invalid fence run');
    for(const door of b.serviceDoors||[]) {
      const onX=near(door.at[0],b.footprint.x0)||near(door.at[0],b.footprint.x1);
      const at=onX?door.at[0]:door.at[1], axis=onX?'z':'x', c=onX?door.at[1]:door.at[0];
      const opening=[c-door.width/2,c+door.width/2];
      for(const run of b.perimeterFence.runs) if(run.axis===axis&&near(run.at,at))
        assert(Math.min(run.range[1],opening[1])<=Math.max(run.range[0],opening[0])+1e-7,
          'FENCE_DOOR_BLOCKED',`${b.id}/${run.id}`,'fence run seals a declared service door');
    }
  }
}
for (let i=0; i<(bp.habitats||[]).length; i++)
  for (const [id,q] of buildingRects) {
    const intentional = bp.habitats[i].id==='H31-waterfowl-lake' && id==='B04-lake-pavilion';
    assert(intentional || !overlap(bp.habitats[i].bounds,q), 'HABITAT_BUILDING',
      `${bp.habitats[i].id}/${id}`, 'unrelated footprints overlap');
  }

// Ground-level public paving cannot pass through a building. The west gate is a deliberately
// roofed clear passage and the conservation bridge is elevated above the public walk.
for (const p of (bp.paths||[]).filter(q=>q.access==='public'))
  for (let i=1;i<p.centerline.length;i++) {
    const surface=segmentRect(p.centerline[i-1],p.centerline[i],p.width);
    for (const [id,q] of buildingRects) {
      const intentional=(id==='B01-west-gate-pavilion'&&p.id==='P117-west-gate-approach')||
        id==='B06b-conservation-bridge'||((p.connects||[]).includes(id)&&
          (bp.buildings||[]).find(b=>b.id===id)?.publicDoors?.length);
      assert(intentional||!overlap(surface,q),'PATH_BUILDING',`${p.id}/${id}`,
        'ground-level public path enters building footprint');
    }
  }

const registeredCrossings=new Set((bp.controlledCrossings||[]).map(q=>
  [q.publicPath,q.staffPath].sort().join('|')));
for (const p of (bp.paths||[]).filter(q=>q.access==='public'))
  for (const s of (bp.paths||[]).filter(q=>q.access.startsWith('staff')))
    for (let i=1;i<p.centerline.length;i++) for(let j=1;j<s.centerline.length;j++) {
      const a=segmentRect(p.centerline[i-1],p.centerline[i],p.width);
      const b=segmentRect(s.centerline[j-1],s.centerline[j],s.width);
      if (!overlap(a,b)) continue;
      const key=[p.id,s.id].sort().join('|');
      assert(registeredCrossings.has(key),'PUBLIC_STAFF_CROSSING',key,
        'public and staff surfaces overlap without a controlledCrossings record');
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

const allHabitats=new Map([...(bp.preservation.existingHabitatBounds||[]),...(bp.habitats||[])]
  .map(q=>[q.id,q]));
for (const x of bp.animalTransferCrossings || []) {
  const q=x.corridor;
  assert(ordered(q),'TRANSFER_CORRIDOR',x.id,'corridor must be an ordered rectangle');
  assert(allHabitats.has(x.from)&&allHabitats.has(x.to),'TRANSFER_ENDPOINT',x.id,
    `unknown endpoint ${x.from} or ${x.to}`);
  for (const h of allHabitats.values()) {
    if (h.id===x.from||h.id===x.to) continue;
    assert(!overlap(q,h.bounds),'TRANSFER_HABITAT',`${x.id}/${h.id}`,
      'animal transfer corridor enters an unrelated habitat');
  }
}

const operations=(bp.buildings||[]).find(q=>q.id==='B07-operations-campus');
const opsSpur=(bp.paths||[]).find(q=>q.id==='S204-operations-spur');
if (operations&&opsSpur) for(let i=1;i<opsSpur.centerline.length;i++) {
  const q=segmentRect(opsSpur.centerline[i-1],opsSpur.centerline[i],opsSpur.width);
  for(const room of operations.rooms||[]) assert(!overlap(q,rect(room.rect)),'OPS_SPUR_ROOM',
    `${opsSpur.id}/${room.id}`,'operations spur enters room');
}

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
const publicPaths=[...pathMap.values()].filter(q=>q.access==='public');
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
    let offPath=false;
    for (let i=0;i<=n;i++) {
      const t=i/n, p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const hit=routeObstacles.find(([,q])=>contains(q,p,bp.engineContract.playerRadius));
      if (hit) { error('VISITOR_COLLISION',r.id,`segment ${k} hits ${hit[0]} near (${p[0].toFixed(2)},${p[1].toFixed(2)})`); break; }
      const paved=publicPaths.some(q=>pathDistance(p,q)<=q.width/2-bp.engineContract.playerRadius+1e-6);
      if (!paved&&!offPath) {
        error('VISITOR_OFF_PATH',r.id,
          `segment ${k} leaves player-inset paving near (${p[0].toFixed(2)},${p[1].toFixed(2)})`);
        offPath=true;
      }
    }
  }
}

const standableOnPublic=p=>publicPaths.some(q=>
  pathDistance(p,q)<=q.width/2-bp.engineContract.playerRadius+1e-6);
const osc=bp.objectScheduleContract||{};
const fixtureRadius={benches:osc.benches?.bodyHalfExtents?.[1],bins:osc.bins?.bodyRadius,
  lamps:osc.lamps?.bodyRadius,mapBoards:osc.mapBoards?.bodyHalfExtents?.[1],
  waterStations:osc.waterStations?.bodyRadius,
  accessibleRouteSigns:osc.accessibleRouteSigns?.bodyHalfExtents?.[1]};
for(const [group,list] of Object.entries(bp.objectSchedules||{})) for(const item of list||[]) {
  if(fixtureRadius[group]!==undefined&&Array.isArray(item.at)) {
    const p=item.at.slice(0,2), radius=fixtureRadius[group];
    for(const q of publicPaths) assert(pathDistance(p,q)>q.width/2+radius-1e-6,
      'FIXTURE_ON_PATH',item.id,`${group} body intrudes ${q.id}`);
  }
  if(item.tag) {
    assert(typeof item.thingId==='string'&&item.thingId,'FIXTURE_THING',item.id,
      'tagged fixture requires its own thingId');
    assert(Array.isArray(item.focus)&&standableOnPublic(item.focus),'FIXTURE_FOCUS',item.id,
      `focus ${item.focus} is not on player-inset public paving`);
    if(item.focus&&item.at&&finite(item.reach)) assert(Math.hypot(item.focus[0]-item.at[0],
      item.focus[1]-item.at[1])<=item.reach+1e-6,'FIXTURE_REACH',item.id,
      'focus-to-fixture distance exceeds reach');
  }
}

for(const t of [...(bp.interactions?.habitatThings||[]),
  ...(bp.interactions?.requiredPublicThings||[])]) {
  assert(Array.isArray(t.focus)&&standableOnPublic(t.focus),'THING_FOCUS',t.id,
    `focus ${t.focus} is not on player-inset public paving`);
  if(Array.isArray(t.position)&&Array.isArray(t.focus)&&finite(t.reach))
    assert(Math.hypot(t.position[0]-t.focus[0],t.position[2]-t.focus[1])<=t.reach+1e-6,
      'THING_REACH',t.id,'focus-to-prop distance exceeds reach');
}
for(const h of bp.habitats||[]) for(const species of h.species||[])
  assert((bp.interactions?.habitatThings||[]).some(t=>t.habitat===h.id&&t.hz===species),
    'HABITAT_SPECIES_THING',`${h.id}/${species}`,'species has no dedicated interpretation thing');

const returnAt=bp.site?.tropicalReturn?.at;
if(Array.isArray(returnAt)) for(const [group,list] of Object.entries(bp.objectSchedules||{}))
  for(const item of list||[]) if(Array.isArray(item.at)&&group!=='firstAid')
    assert(Math.hypot(item.at[0]-returnAt[0],item.at[1]-returnAt[1])>=1.5,
      'TROPICAL_RETURN_CLEAR',item.id,'fixture is inside 1.5m tropical-return clear circle');

const treeGroups=['perimeterTrees','districtTrees','wetlandWillows','highlandPines'];
for(const group of treeGroups) for(const tree of bp.planting?.[group]||[]) {
  assert(tree&&typeof tree.id==='string'&&Array.isArray(tree.at)&&tree.at.length===2&&
    tree.at.every(finite)&&finite(tree.height),'TREE_RECORD',String(tree?.id||group),
    'tree must have id, [x,z], height and owner');
  if(!tree?.at) continue;
  assert(tree.at[0]>=site.x0&&tree.at[0]<=site.x1&&tree.at[1]>=site.z0&&tree.at[1]<=site.z1,
    'TREE_SITE',tree.id,'tree is outside site');
  for(const q of [...pathMap.values()]) assert(pathDistance(tree.at,q)>q.width/2+.55-1e-6,
    'TREE_ON_PATH',tree.id,`trunk/collar intrudes ${q.id}`);
  for(const h of bp.habitats||[]) {
    const owning=tree.owner===h.id;
    assert(owning||!contains(h.bounds,tree.at,.55),'TREE_HABITAT',`${tree.id}/${h.id}`,
      'non-owning tree collar enters habitat');
  }
  for(const [id,q] of buildingRects) assert(!contains(q,tree.at,.55),'TREE_BUILDING',
    `${tree.id}/${id}`,'tree collar enters building footprint');
}
for(const hedge of bp.planting?.hedgeRuns||[]) {
  const q=segmentRect(hedge.from,hedge.to,.3);
  for(const p of publicPaths) for(let i=1;i<p.centerline.length;i++)
    assert(!overlap(q,segmentRect(p.centerline[i-1],p.centerline[i],p.width)),
      'HEDGE_ON_PATH',`${hedge.id}/${p.id}`,'hedge run intrudes public paving');
}

if (tropical) {
  const local=tropical.localBounds;
  assert(ordered(local), 'TROPICAL_BOUNDS', tropical.id, 'local bounds invalid');
  const roomRects=[];
  for (const room of tropical.rooms || []) {
    const q=rect(room.rect);
    assert(ordered(q), 'TROPICAL_ROOM', room.id, 'room bounds invalid');
    if (ordered(q)) assert(insideRect(q,local), 'TROPICAL_ROOM_SITE', room.id, 'outside local bounds');
    roomRects.push([room.id,q]);
  }
  for(let i=0;i<roomRects.length;i++) for(let j=i+1;j<roomRects.length;j++)
    assert(!overlap(roomRects[i][1],roomRects[j][1]),'TROPICAL_ROOM_OVERLAP',
      `${roomRects[i][0]}/${roomRects[j][0]}`,'indoor room footprints overlap');

  const tp=(tropical.paths||[]).map(q=>[q.id,rect(q.rect),q]);
  for(const [id,q,p] of tp) {
    assert(ordered(q)&&insideRect(q,local),'TROPICAL_PATH_BOUNDS',id,'path rect is invalid/outside shell');
    assert(p.width>=bp.engineContract.minimumAccessiblePathWidth,'TROPICAL_PATH_WIDTH',id,
      `width ${p.width} is below accessible minimum`);
    for(const [rid,rq] of roomRects) {
      const publicZoneRoom=['T00-lobby','T06-atrium'].includes(rid);
      assert(publicZoneRoom||!overlap(q,rq),'TROPICAL_PATH_ROOM',`${id}/${rid}`,
        'public indoor path enters exhibit room');
    }
  }
  if(tp.length) {
    const seen=new Set([tp[0][0]]);
    let changed=true;
    while(changed){ changed=false; for(const [id,q] of tp) if(!seen.has(id)&&tp.some(([oid,oq])=>
      seen.has(oid)&&overlap(q,oq,.001))){seen.add(id);changed=true;} }
    for(const [id] of tp) assert(seen.has(id),'TROPICAL_PATH_CONNECTIVITY',id,
      'path is disconnected from TP01-entry');
  }

  const publicIndoorRects=tp.map(([,q])=>q).concat((tropical.restNiches||[]).map(q=>rect(q.rect)));
  const indoorStandable=p=>publicIndoorRects.some(q=>contains(q,p,-bp.engineContract.playerRadius));
  assert(indoorStandable(tropical.spawn.at),'TROPICAL_SPAWN_PATH',tropical.id,
    'spawn is not inside player-inset public paving');
  assert(indoorStandable(tropical.exit.at),'TROPICAL_EXIT_PATH',tropical.id,
    'exit trigger is not inside player-inset public paving');
  for(const t of tropical.speciesThings||[]) assert(indoorStandable(t.focus),'TROPICAL_THING_FOCUS',t.id,
    `focus ${t.focus} is not standable on an indoor public path`);

  for(const door of tropical.doors||[]) {
    const at=door.side==='x0'?local.x0:door.side==='x1'?local.x1:
      door.side==='z0'?local.z0:local.z1;
    const axis=door.side[0]==='x'?'z':'x';
    for(const wall of tropical.outerWalls||[]) {
      if(wall.axis!==axis||!near(wall.at,at)) continue;
      const intersects=Math.min(wall.range[1],door.range[1])>Math.max(wall.range[0],door.range[0])+1e-7;
      assert(!intersects,'TROPICAL_DOOR_WALL',door.id,
        `opening ${door.range} is sealed by wall range ${wall.range}`);
    }
  }
  for(const wall of tropical.outerWalls||[]) assert(wall.bodySolid===true&&finite(wall.cameraBlockerTop),
    'TROPICAL_WALL_COLLISION',wall.id,'wall needs matching body solid and camera blocker top');
  assert(tropical.exit?.destination==='zoo', 'TROPICAL_EXIT', tropical.id, 'exit must return to zoo');
  assert(tropical.exit?.door==='trop-exit','TROPICAL_EXIT_DOOR',tropical.id,
    'exit trigger must bind the labeled trop-exit door');
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
