'use strict';

// Geometry-only quality gate for the university interiors.  It reads the generated source of
// truth and checks the mistakes that a scene-build test cannot see: furniture outside its room,
// objects occupying a door approach, and independent floor objects intersecting each other.
// Decorations explicitly marked collision:none and wall/ceiling anchored fixtures are ignored,
// except for accessible tables that explicitly opt their measured supports into collision.

const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const plan=JSON.parse(fs.readFileSync(path.join(ROOT,'UNIVERSITY-INTERIORS-BLUEPRINT.json'),'utf8'));
const wanted=new Set(process.argv.slice(2).map(s=>s.toUpperCase()));
const prefabs=new Map(plan.prefabCatalog.map(p=>[p.id,p]));
const failures=[];
const totals={rooms:0,physicalFixtures:0,containment:0,doorClearance:0,routeClearance:0,overlaps:0};
const byBuilding={};
const EPS=.055,CONTAIN_TOL=.14,DOOR_DEPTH=1.15;

const axesFor=yaw=>{
  const c=Math.cos(yaw||0),s=Math.sin(yaw||0);
  return [[c,-s],[s,c]];
};

function obb(f){
  const [w,,d]=f.size,yaw=f.yaw||0,axes=axesFor(yaw);
  return {id:f.id,f,c:[f.at[0],f.at[2]],u:axes[0],v:axes[1],hu:w/2,hv:d/2};
}

function supportCollisionTable(f){
  const p=prefabs.get(f.prefab);
  return p&&p.anchor==='floor'&&f.prefab==='PF-MEETING-TABLE'&&f.accessible===true&&
    f.supportCollision===true&&f.size[1]>.20;
}

function tableSupportObbs(f){
  const [w,,d]=f.size,yaw=f.yaw||0,leg=Math.min(.045,w*.05,d*.08),
    c=Math.cos(yaw),s=Math.sin(yaw),all=[
      ['front-left',-w/2+leg/2,-d/2+leg/2],
      ['front-right',w/2-leg/2,-d/2+leg/2],
      ['rear-left',-w/2+leg/2,d/2-leg/2],
      ['rear-right',w/2-leg/2,d/2-leg/2],
    ],positions=all,axes=axesFor(yaw);
  return positions.map(([name,dx,dz])=>({
    id:`${f.id}/ACCESS-SUPPORT-${name}`,f,
    c:[f.at[0]+c*dx+s*dz,f.at[2]-s*dx+c*dz],
    u:axes[0],v:axes[1],hu:leg/2,hv:leg/2,
  }));
}

function corners(o){
  const out=[];
  for(const a of [-1,1])for(const b of [-1,1])out.push([
    o.c[0]+a*o.hu*o.u[0]+b*o.hv*o.v[0],
    o.c[1]+a*o.hu*o.u[1]+b*o.hv*o.v[1],
  ]);
  return out;
}

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function projection(o,axis){
  const centre=dot(o.c,axis),radius=o.hu*Math.abs(dot(o.u,axis))+o.hv*Math.abs(dot(o.v,axis));
  return [centre-radius,centre+radius];
}

function penetration(a,b){
  let min=Infinity;
  for(const axis of [a.u,a.v,b.u,b.v]){
    const pa=projection(a,axis),pb=projection(b,axis),over=Math.min(pa[1],pb[1])-Math.max(pa[0],pb[0]);
    if(over<=EPS)return 0;
    min=Math.min(min,over);
  }
  return min;
}

function physical(f){
  const p=prefabs.get(f.prefab);
  return p&&p.anchor==='floor'&&f.collision!=='none'&&f.size[1]>.20&&
    !['PF-EXTINGUISHER','PF-BIN'].includes(f.prefab);
}

const audited=f=>physical(f)||supportCollisionTable(f);
const footprints=f=>supportCollisionTable(f)?tableSupportObbs(f):[obb(f)];

function doorApproach(room,door){
  const along=door.width/2+.20,depth=DOOR_DEPTH;
  if(door.side==='east')return {id:door.id,c:[door.at[0]-depth/2,door.at[2]],u:[1,0],v:[0,1],hu:depth/2,hv:along};
  if(door.side==='west')return {id:door.id,c:[door.at[0]+depth/2,door.at[2]],u:[1,0],v:[0,1],hu:depth/2,hv:along};
  if(door.side==='north')return {id:door.id,c:[door.at[0],door.at[2]-depth/2],u:[1,0],v:[0,1],hu:along,hv:depth/2};
  return {id:door.id,c:[door.at[0],door.at[2]+depth/2],u:[1,0],v:[0,1],hu:along,hv:depth/2};
}

function allowedPair(a,b,over){
  const pa=a.f.prefab,pb=b.f.prefab;
  // A loose chair can be deliberately tucked under a meeting/art table, but a deep collision
  // still indicates that both were authored at the same coordinate.
  const chairTable=(pa==='PF-CHAIR'&&/TABLE/.test(pb))||(pb==='PF-CHAIR'&&/TABLE/.test(pa));
  return chairTable&&over<.24;
}

function rectObb(id,bounds){
  const [x0,x1,z0,z1]=bounds;
  return {id,c:[(x0+x1)/2,(z0+z1)/2],u:[1,0],v:[0,1],hu:(x1-x0)/2,hv:(z1-z0)/2};
}

function add(building,kind,message){
  failures.push(`${building.id} ${kind}: ${message}`);
  byBuilding[building.id][kind]++;
  totals[kind]++;
}

for(const building of plan.buildings){
  if(wanted.size&&!wanted.has(building.id))continue;
  byBuilding[building.id]={rooms:0,physicalFixtures:0,containment:0,doorClearance:0,routeClearance:0,overlaps:0};
  for(const floor of building.floorsPlan){
    const floorObjects=[];
    const approaches=[];
    for(const room of floor.rooms){
      totals.rooms++;byBuilding[building.id].rooms++;
      const fixtures=(room.contents||[]).filter(audited),
        objects=fixtures.flatMap(f=>footprints(f).map(o=>({...o,owner:room.id})));
      floorObjects.push(...objects);
      totals.physicalFixtures+=fixtures.length;byBuilding[building.id].physicalFixtures+=fixtures.length;
      const [x0,x1,z0,z1]=room.bounds;
      for(const door of room.doors||[])approaches.push({room,door,shape:doorApproach(room,door)});
      for(const o of objects){
        const outside=corners(o).filter(([x,z])=>x<x0-CONTAIN_TOL||x>x1+CONTAIN_TOL||z<z0-CONTAIN_TOL||z>z1+CONTAIN_TOL);
        if(outside.length)add(building,'containment',`${o.id} extends outside ${room.id}`);
        for(const door of room.doors||[]){
          const over=penetration(o,doorApproach(room,door));
          if(over>EPS)add(building,'doorClearance',`${o.id} intrudes ${door.id} by ${over.toFixed(2)}m`);
        }
      }
      for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
        const over=penetration(objects[i],objects[j]);
        if(over>EPS&&!allowedPair(objects[i],objects[j],over))
          add(building,'overlaps',`${objects[i].id} intersects ${objects[j].id} by ${over.toFixed(2)}m`);
      }
    }

    // Shared floor-standing fixtures participate in the same geometry as room contents.  They
    // must remain within the building, outside every doorway approach and clear of route plates.
    const sharedFixtures=(floor.sharedObjects||[]).filter(audited),
      shared=sharedFixtures.flatMap(f=>footprints(f).map(o=>({...o,owner:`${building.id}/F${floor.level}/SHARED`})));
    floorObjects.push(...shared);
    totals.physicalFixtures+=sharedFixtures.length;byBuilding[building.id].physicalFixtures+=sharedFixtures.length;
    const [bx0,bx1,bz0,bz1]=building.localBounds;
    for(const o of shared){
      const outside=corners(o).filter(([x,z])=>x<bx0-CONTAIN_TOL||x>bx1+CONTAIN_TOL||z<bz0-CONTAIN_TOL||z>bz1+CONTAIN_TOL);
      if(outside.length)add(building,'containment',`${o.id} extends outside ${building.id}/F${floor.level}`);
      for(const {door,shape} of approaches){
        const over=penetration(o,shape);
        if(over>EPS)add(building,'doorClearance',`${o.id} intrudes ${door.id} by ${over.toFixed(2)}m`);
      }
    }

    for(const route of floor.circulation||[]){
      const shape=rectObb(route.id,route.bounds);
      for(const o of floorObjects){
        const over=penetration(o,shape);
        if(over>EPS)add(building,'routeClearance',`${o.id} intrudes ${route.id} by ${over.toFixed(2)}m`);
      }
    }

    // Finally compare objects owned by different rooms and the shared layer. Same-room pairs were
    // already reported above; this catches furniture crossing a thin partition or a shared prop
    // authored on top of room equipment.
    for(let i=0;i<floorObjects.length;i++)for(let j=i+1;j<floorObjects.length;j++){
      if(floorObjects[i].owner===floorObjects[j].owner)continue;
      const over=penetration(floorObjects[i],floorObjects[j]);
      if(over>EPS&&!allowedPair(floorObjects[i],floorObjects[j],over))
        add(building,'overlaps',`${floorObjects[i].id} intersects ${floorObjects[j].id} by ${over.toFixed(2)}m`);
    }
  }
}

console.log(JSON.stringify({totals,byBuilding,failures:failures.slice(0,160)},null,2));
if(failures.length){
  console.error(`FAIL ${failures.length} university spacing defects`);
  process.exitCode=1;
}else console.log('PASS university interior spacing gate');
