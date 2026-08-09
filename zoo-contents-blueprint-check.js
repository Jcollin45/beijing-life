#!/usr/bin/env node
'use strict';

const fs=require('fs');
const crypto=require('crypto');
const plan=JSON.parse(fs.readFileSync('ZOO-PENS-BUILDINGS-BLUEPRINT.json','utf8'));
const parent=JSON.parse(fs.readFileSync('ZOO-EXPANSION-BLUEPRINT.json','utf8'));
let checks=0;
const failures=[];
const ok=(condition,message)=>{checks++;if(!condition)failures.push(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const inRect=(x,z,r,tol=0.001)=>x>=r[0]-tol&&x<=r[1]+tol&&z>=r[2]-tol&&z<=r[3]+tol;

function stable(value){
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}

ok(plan.schema==='chinesegame.zoo-contents/v1','schema must be chinesegame.zoo-contents/v1');
ok(plan.revision===1,'revision must be 1');
ok(plan.status==='construction-ready','status must be construction-ready');
ok(plan.parent.schema===parent.schema,'parent schema mismatch');
ok(plan.parent.revision===parent.revision,'parent revision mismatch');
ok(plan.parent.geometryHash===parent.geometryHash,'parent geometry hash mismatch');
ok(plan.performanceExtension.parentOutdoorThingCap===parent.performanceBudgets.things,
  'contents performance extension must start at the parent thing cap');
ok(plan.performanceExtension.addedLocalFixtureThings===8,
  'contents blueprint must declare eight local outdoor fixture things');
ok(plan.performanceExtension.outdoorThingCap===parent.performanceBudgets.things+8,
  'contents outdoor thing cap must equal parent cap plus local fixture things');
const unhashed={...plan};delete unhashed.contentHash;
const digest='sha256:'+crypto.createHash('sha256').update(stable(unhashed)).digest('hex');
ok(plan.contentHash===digest,`content hash mismatch: expected ${digest}`);

const ids=new Map();
function visit(v,path='$'){
  if(!v||typeof v!=='object')return;
  if(Object.prototype.hasOwnProperty.call(v,'id')){
    ok(typeof v.id==='string'&&v.id.length>0,`${path} has invalid id`);
    if(ids.has(v.id))failures.push(`duplicate stable id ${v.id}: ${ids.get(v.id)} and ${path}`);
    else ids.set(v.id,path);
  }
  if(Array.isArray(v))v.forEach((q,i)=>visit(q,`${path}[${i}]`));
  else Object.entries(v).forEach(([k,q])=>visit(q,`${path}.${k}`));
}
visit(plan);

const materialIds=new Set(plan.materials.map(q=>q.id));
const archetypeIds=new Set(plan.archetypes.map(q=>q.id));
ok(materialIds.size===plan.materials.length,'material IDs must be unique');
ok(archetypeIds.size===plan.archetypes.length,'archetype IDs must be unique');

function contentGeometry(q,owner){
  ok(archetypeIds.has(q.archetype)||q.archetype==='building-reference',`${q.id}: unknown archetype ${q.archetype}`);
  if(q.material)ok(materialIds.has(q.material),`${q.id}: unknown material ${q.material}`);
  ok(['existing-r2','build-v1'].includes(q.implementationStatus),`${q.id}: invalid implementationStatus`);
  ok(typeof q.label==='string'&&q.label.length>0,`${q.id}: missing label`);
  ok(typeof q.purpose==='string'&&q.purpose.length>0,`${q.id}: missing purpose`);
  ok(typeof q.collision==='string',`${q.id}: missing collision contract`);
  if(q.at){
    ok(q.at.length===3&&q.at.every(finite),`${q.id}: at must be three finite numbers`);
    ok(Array.isArray(q.size)&&q.size.length===3&&q.size.every(n=>finite(n)&&n>0),`${q.id}: size must be three positive numbers`);
  }else if(q.rect){
    ok(q.rect.length===4&&q.rect.every(finite)&&q.rect[0]<q.rect[1]&&q.rect[2]<q.rect[3],`${q.id}: invalid rect`);
    if(q.height!==undefined)ok(finite(q.height)&&q.height>=0,`${q.id}: invalid height`);
  }else if(q.centres){
    ok(q.centres.every(c=>c.length===2&&c.every(finite)),`${q.id}: invalid centres`);
  }else ok(q.archetype==='building-reference',`${q.id}: content record has no geometry`);
  if(q.interaction){
    ok(typeof q.interaction.tag==='string'&&q.interaction.tag.length>0,`${q.id}: interaction tag missing`);
    ok(Array.isArray(q.interaction.focus)&&q.interaction.focus.length===2&&q.interaction.focus.every(finite),`${q.id}: invalid interaction focus`);
    ok(finite(q.interaction.reach)&&q.interaction.reach>0&&q.interaction.reach<=plan.engineContract.maxInteractionReach,`${q.id}: invalid interaction reach`);
  }
  return owner;
}

let contentCount=0,plannedCount=0;
for(const h of plan.habitats){
  ok(h.bounds.length===4&&h.bounds.every(finite),`${h.id}: invalid habitat bounds`);
  ok(['x0','x1','z0','z1'].includes(h.publicSide),`${h.id}: invalid public side`);
  for(const q of h.contents){
    contentCount++;if(q.implementationStatus==='build-v1')plannedCount++;
    contentGeometry(q,h.id);
    const exempt=q.archetype==='building-reference'||q.source?.type==='handwash'||/public|visitor/.test(q.purpose);
    if(q.at&&!exempt)ok(inRect(q.at[0],q.at[2],h.bounds),`${q.id}: anchor outside ${h.id}`);
    if(q.rect&&!exempt){
      ok(inRect(q.rect[0],q.rect[2],h.bounds)&&inRect(q.rect[1],q.rect[3],h.bounds),`${q.id}: rect outside ${h.id}`);
    }
  }
  for(const a of h.activityAnchors||[])ok(a.at.length===3&&a.at.every(finite),`${a.id}: invalid activity anchor`);
}

for(const b of plan.buildings){
  ok(b.footprint.length===4&&b.footprint.every(finite),`${b.id}: invalid footprint`);
  const roomById=new Map(b.rooms.map(r=>[r.id,r]));
  const fixtures=[...b.sharedFixtures,...b.rooms.flatMap(r=>r.fixtures)];
  for(const q of fixtures){
    contentCount++;if(q.implementationStatus==='build-v1')plannedCount++;
    contentGeometry(q,b.id);
    const room=q.room&&roomById.get(q.room);
    const allowedOutside=!!q.allowOutside||/^B06b\/FIX0[12]$/.test(q.id)||/^B08\/FIX0[134]$/.test(q.id);
    const bounds=room?room.rect:b.footprint;
    if(q.at&&!allowedOutside)ok(inRect(q.at[0],q.at[2],bounds),`${q.id}: anchor outside ${room?q.room:b.id}`);
    if(q.rect&&!allowedOutside)ok(inRect(q.rect[0],q.rect[2],bounds)&&inRect(q.rect[1],q.rect[3],bounds),`${q.id}: rect outside ${room?q.room:b.id}`);
  }
  for(const r of b.rooms){
    ok(inRect(r.rect[0],r.rect[2],b.footprint)&&inRect(r.rect[1],r.rect[3],b.footprint),`${b.id}/${r.id}: room outside footprint`);
    for(const q of r.fixtures)ok(q.room===r.id,`${q.id}: fixture room ownership mismatch`);
  }
}

const tb=plan.tropicalScene.bounds;
for(const r of plan.tropicalScene.rooms){
  ok(inRect(r.rect[0],r.rect[2],tb)&&inRect(r.rect[1],r.rect[3],tb),`${r.id}: tropical room outside shell`);
  for(const q of r.contents){
    contentCount++;if(q.implementationStatus==='build-v1')plannedCount++;
    contentGeometry(q,r.id);
    if(q.at&&!q.allowOutside)ok(inRect(q.at[0],q.at[2],r.rect),`${q.id}: anchor outside ${r.id}`);
    if(q.rect&&!q.allowOutside)ok(inRect(q.rect[0],q.rect[2],r.rect)&&inRect(q.rect[1],q.rect[3],r.rect),`${q.id}: rect outside ${r.id}`);
  }
}
for(const q of plan.tropicalScene.sharedObjects){
  contentCount++;if(q.implementationStatus==='build-v1')plannedCount++;
  contentGeometry(q,'zoo_tropical');
  if(q.at)ok(inRect(q.at[0],q.at[2],tb),`${q.id}: shared tropical anchor outside scene`);
}

ok(plan.habitats.length===21,'expected 21 outdoor habitats');
ok(plan.buildings.length===9,'expected 9 buildings/structures');
ok(plan.tropicalScene.rooms.length===7,'expected 7 Tropical House rooms');
ok(contentCount===409,`expected 409 content records, found ${contentCount}`);
ok(plannedCount===237,`expected 237 build-v1 records, found ${plannedCount}`);
ok(plan.buildPhases.length===10,'expected ten ordered build phases');
ok(plan.validation.acceptance.length===10,'expected ten acceptance checks');

if(failures.length){
  console.error(`FAIL: ${failures.length} issue(s) across ${checks} checks`);
  failures.forEach(x=>console.error(' - '+x));
  process.exit(1);
}
console.log(`PASS: ${checks} construction checks`);
console.log(`${plan.habitats.length} habitats · ${plan.buildings.length} buildings · ${plan.tropicalScene.rooms.length} Tropical rooms`);
console.log(`${contentCount} exact content records · ${plannedCount} build-v1 additions · ${ids.size} stable IDs`);
console.log(plan.contentHash);
