'use strict';

// Browser-free acceptance check for the university interior construction system.  It executes
// the real matrix, Build.scene and campus-interior renderer, then forces all 28 Lazy floor builders.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=__dirname,builders=new Map(),failures=[];
let passed=0;
const check=(name,ok,detail='')=>ok?passed++:failures.push(name+(detail?` — ${detail}`:''));
const color=hex=>{const raw=String(hex).replace('#',''),v=raw.length===3?[...raw].map(c=>c+c).join(''):raw;
  return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255);};

const context={
  console,C:color,
  performance:{now:()=>0},
  Glyphs:{need:t=>String(t),role:()=> 'body',isHan:c=>/[\u3400-\u9fff]/u.test(c),rect:()=>[0,0,1,1]},
  Lazy(name,builder){if(builders.has(name))throw new Error(`duplicate Lazy ${name}`);builders.set(name,builder);return {__lazyName:name};},
};
context.window=context;context.globalThis=context;
context.UNIVERSITY_INTERIORS_BLUEPRINT=JSON.parse(fs.readFileSync(path.join(ROOT,'UNIVERSITY-INTERIORS-BLUEPRINT.json'),'utf8'));
vm.createContext(context);
const run=file=>vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
run('js/math.js');run('js/build.js');run('js/campus-interior-core.js');

const plan=context.UNIVERSITY_INTERIORS_BLUEPRINT;
const counts=vm.runInContext('CampusInteriors.counts',context);
const keys=vm.runInContext('Object.keys(CampusInteriors.places)',context);
const entryHtml=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const gameJs=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8');
const coreJs=fs.readFileSync(path.join(ROOT,'js/campus-interior-core.js'),'utf8');
const manifestMatch=entryHtml.match(/var FILES\s*=\s*\[([\s\S]*?)\];/);
const manifestFiles=manifestMatch?[...manifestMatch[1].matchAll(/'([^']+)'/g)].map(m=>m[1]):[];
check('blueprint schema',plan.meta.schema==='chinesegame.university-interiors/v1',plan.meta.schema);
check('runtime loader accepts blueprint version 2',/university\.meta\.blueprintVersion\s*!==\s*2/.test(entryHtml));
check('runtime fetches university blueprint',/fetch\('UNIVERSITY-INTERIORS-BLUEPRINT\.json\?v='/.test(entryHtml));
check('script manifest loads interior consumer',manifestFiles.includes('campus-interior-core'));
check('interior consumer loads before game',manifestFiles.indexOf('campus-interior-core')>=0&&
  manifestFiles.indexOf('campus-interior-core')<manifestFiles.indexOf('game'));
check('runtime contract requires CampusInteriors',/\['CampusInteriors',\s*'places placeKey buildFloor validate'\]/.test(entryHtml));
check('game registers blueprint places',/Object\.assign\(PLACES,\s*CampusInteriors\.places\)/.test(gameJs));
const renderedPrefabCases=new Set([...coreJs.matchAll(/case\s+'(PF-[A-Z0-9-]+)'/g)].map(m=>m[1]));
const primitiveFallbacks=plan.prefabCatalog.map(p=>p.id).filter(id=>id!=='PF-WALL-RUN'&&!renderedPrefabCases.has(id));
check('every furniture prefab has a composed renderer',primitiveFallbacks.length===0,primitiveFallbacks.join(','));
const allFixtures=plan.buildings.flatMap(b=>b.floorsPlan.flatMap(f=>
  f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[])));
const prefabSpecs=new Map(plan.prefabCatalog.map(p=>[p.id,p]));
const minimumDetailedParts=new Map([
  ['PF-BIN',4],['PF-TOILET',6],['PF-BASIN',7],['PF-HANDWASH',7],
  ['PF-LAB-SINK',8],['PF-EYEWASH',11],['PF-STOOL',13],['PF-SHOWER',9],
]);
const architecturalSlabLanguage=/wall|panel|datum|raft|ceiling|floor|rug|mat|runner|line|route|field|inset|marker|curtain|blind|window|glass|glazed|glazing|mirror|sill|headboard|pinboard|rail|divider|partition|curb|drain|grille|threshold|jamb|portal|reveal|canopy|inlay|turning|approach|privacy|identity|feature|acoustic|tactile|welcome|backdrop|circuit|calibration|alignment|work grid|aisle|wheelchair|dining bay/i;
const furnitureOrEquipmentLanguage=/speaker|side table|tea table|medicine stock|electrical cabinet|coat-hook|\bdesk\b|\bchair\b|\bbench\b|\bcounter\b|\bshelf\b|\blocker\b|\bbed\b|\bsofa\b|\bstool\b|\bkiosk\b|\bappliance\b/i;
const slabMisuse=allFixtures.filter(o=>o.prefab==='PF-WALL-RUN'&&(
  (furnitureOrEquipmentLanguage.test(o.label)&&!/headboard|pinboard/i.test(o.label))||
  !architecturalSlabLanguage.test(`${o.label} ${o.purpose}`)));
check('wall-run slabs are architectural layers only',slabMisuse.length===0,
  slabMisuse.slice(0,12).map(o=>o.id).join(','));
check('eight buildings',counts.buildings===8,counts.buildings);
check('28 floors',counts.floors===28,counts.floors);
check('at least the 198 canonical programmed rooms',counts.rooms>=198,counts.rooms);
check('room count matches generated blueprint',counts.rooms===plan.totals.rooms,`${counts.rooms}/${plan.totals.rooms}`);
check('fixture count matches generated blueprint',counts.fixtures===plan.totals.fixtureInstances,`${counts.fixtures}/${plan.totals.fixtureInstances}`);
check('all canonical plus clinic-alias place keys',keys.length===31,keys.length);
check('28 unique Lazy floor builders',builders.size===28,builders.size);
const stairDefects=[];
for(const b of plan.buildings.filter(b=>b.floors>1))for(const f of b.floorsPlan){
  const stairs=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[]).filter(o=>o.prefab==='PF-STAIR');
  const requiredSeparation=Math.max(6,Math.hypot(b.localBounds[1]-b.localBounds[0],b.localBounds[3]-b.localBounds[2])/3);
  let separation=0;
  for(let i=0;i<stairs.length;i++)for(let j=i+1;j<stairs.length;j++)
    separation=Math.max(separation,Math.hypot(stairs[i].at[0]-stairs[j].at[0],stairs[i].at[2]-stairs[j].at[2]));
  if(stairs.length<2||separation<requiredSeparation)
    stairDefects.push(`${b.id}/F${f.level}:${stairs.length} stairs/${separation.toFixed(2)}m<${requiredSeparation.toFixed(2)}m`);
}
check('multi-storey floors have two remote protected stairs',stairDefects.length===0,stairDefects.slice(0,12).join(','));
const stairSafetyDefects=[];
for(const b of plan.buildings.filter(b=>b.floors>1))for(const f of b.floorsPlan){
  const all=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[]);
  for(const stair of all.filter(o=>o.prefab==='PF-STAIR'))for(const required of ['PF-EXIT-SIGN','PF-EMERGENCY-LIGHT']){
    const matching=all.filter(o=>o.prefab===required);
    const nearest=Math.min(...matching.map(o=>Math.hypot(o.at[0]-stair.at[0],o.at[2]-stair.at[2])));
    const linkedAtDoor=matching.some(o=>o.id.startsWith(`${stair.id}/LOCAL-`));
    if(!linkedAtDoor&&(!Number.isFinite(nearest)||nearest>3.001))
      stairSafetyDefects.push(`${stair.id}:${required}:${nearest.toFixed(2)}m`);
  }
}
check('every protected stair has local exit marking and emergency light',stairSafetyDefects.length===0,
  stairSafetyDefects.slice(0,12).join(','));

// A 0.20 m lattice is fine enough to sample a 0.90 m clear door with a 0.30 m player radius;
// a 0.30 m lattice can alias a valid opening completely depending on the building origin.
function walkMap(scene,b,step=.20,radius=.30){
  const [x0,x1,z0,z1]=b.localBounds,w=Math.floor((x1-x0)/step)+1,h=Math.floor((z1-z0)/step)+1;
  const blocked=new Uint8Array(w*h),seen=new Uint8Array(w*h),index=(ix,iz)=>iz*w+ix;
  for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++){
    const x=x0+ix*step,z=z0+iz*step;
    blocked[index(ix,iz)]=scene.solids.some(s=>!s.open&&x>s.x0-radius&&x<s.x1+radius&&z>s.z0-radius&&z<s.z1+radius)?1:0;
  }
  let sx=Math.round((scene.spawn.x-x0)/step),sz=Math.round((scene.spawn.z-z0)/step);
  const candidates=[];for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++)if(!blocked[index(ix,iz)])
    candidates.push([ix,iz,(ix-sx)**2+(iz-sz)**2]);
  candidates.sort((a,b)=>a[2]-b[2]);if(!candidates.length)return{points:[],rooms:[]};
  [sx,sz]=candidates[0];const queue=[[sx,sz]];seen[index(sx,sz)]=1;
  for(let q=0;q<queue.length;q++){
    const [ix,iz]=queue[q];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=ix+dx,nz=iz+dz;if(nx<0||nz<0||nx>=w||nz>=h)continue;const k=index(nx,nz);
      if(!blocked[k]&&!seen[k]){seen[k]=1;queue.push([nx,nz]);}
    }
  }
  const points=queue.map(([ix,iz])=>[x0+ix*step,z0+iz*step]);
  return{points,rooms:scene.blueprintFloor.rooms.filter(room=>points.some(([x,z])=>
    x>room.bounds[0]+radius&&x<room.bounds[1]-radius&&z>room.bounds[2]+radius&&z<room.bounds[3]-radius))};
}

const scenes=[];
function renderedPartOutsideFixture(part,fixture,tolerance=.09){
  const m=part.m;if(!m)return false;
  const yaw=fixture.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),u=[c,-s],v=[s,c];
  const rel=[m[12]-fixture.at[0],m[14]-fixture.at[2]];
  const centreU=rel[0]*u[0]+rel[1]*u[1],centreV=rel[0]*v[0]+rel[1]*v[1];
  // A transformed unit primitive has three half-extent columns. Project all three on each
  // fixture axis so rotated/tilted rails and ellipsoids are checked as rigorously as boxes.
  const radius=axis=>.5*(
    Math.abs(m[0]*axis[0]+m[2]*axis[1])+
    Math.abs(m[4]*axis[0]+m[6]*axis[1])+
    Math.abs(m[8]*axis[0]+m[10]*axis[1]));
  return Math.abs(centreU)+radius(u)>fixture.size[0]/2+tolerance||
    Math.abs(centreV)+radius(v)>fixture.size[2]/2+tolerance;
}
for(const [name,build] of builders){
  let scene;
  try{scene=build();}catch(error){failures.push(`${name} builds — ${error.stack||error}`);continue;}
  scenes.push([name,scene]);
  check(`${name} public contract`,scene&&Array.isArray(scene.props)&&Array.isArray(scene.things)&&Array.isArray(scene.solids));
  check(`${name} finite render transforms`,scene&&scene.props.every(p=>p.m&&[...p.m].every(Number.isFinite)));
  check(`${name} finite furniture shadows`,scene&&scene.shadows.every(s=>s.m&&[...s.m].every(Number.isFinite)&&Number.isFinite(s.a)));
  check(`${name} valid collision bodies`,scene&&scene.solids.every(s=>
    [s.x0,s.x1,s.z0,s.z1].every(Number.isFinite)&&s.x1>s.x0&&s.z1>s.z0));
  const fixtureBodies=scene?scene.solids.filter(s=>s.fixtureId):[],bodyOverlaps=[];
  for(let i=0;i<fixtureBodies.length;i++)for(let j=i+1;j<fixtureBodies.length;j++){
    const a=fixtureBodies[i],b=fixtureBodies[j];
    if(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>.01&&Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0)>.01)
      bodyOverlaps.push(`${a.fixtureId}<>${b.fixtureId}`);
  }
  check(`${name} collision bodies do not overlap`,bodyOverlaps.length===0,bodyOverlaps.slice(0,8).join(','));
  check(`${name} valid camera blockers`,scene&&scene.blockers.every(s=>
    [s.x0,s.x1,s.z0,s.z1,s.top].every(Number.isFinite)&&s.x1>s.x0&&s.z1>s.z0));
  check(`${name} finite authored lights`,scene&&scene.lights.every(l=>
    [l.x,l.y,l.z,l.power,l.radius,...l.col].every(Number.isFinite)&&l.radius>0));
  check(`${name} finite spawn`,scene&&scene.spawn&&Number.isFinite(scene.spawn.x)&&Number.isFinite(scene.spawn.z),JSON.stringify(scene&&scene.spawn));
  check(`${name} room zones`,scene&&scene.zones&&scene.zones.length>=scene.blueprintFloor.rooms.length,scene&&scene.zones&&scene.zones.length);
  check(`${name} fixture prop ceiling`,scene&&scene.props.length<2600,scene&&scene.props.length);
  const rounded=scene&&scene.props.filter(p=>p.mesh==='softBox').length;
  check(`${name} contains rounded furniture geometry`,rounded>=6,rounded);
  check(`${name} navigation targets exist`,scene&&scene.things.filter(t=>t.exit).every(t=>
    ['campus','classroom','library'].includes(t.exit.place)||keys.includes(t.exit.place)),
    scene&&scene.things.filter(t=>t.exit&&!['campus','classroom','library'].includes(t.exit.place)&&!keys.includes(t.exit.place)).map(t=>t.exit.place).join(','));

  const b=plan.buildings.find(q=>q.id===scene.buildingId),f=scene.blueprintFloor;
  const fixtureRows=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects);
  const bodyIds=new Set(fixtureBodies.map(s=>s.fixtureId));
  const missingBodies=fixtureRows.filter(o=>{
    const p=prefabSpecs.get(o.prefab);
    return p&&p.anchor==='floor'&&o.size[1]>.20&&o.collision!=='none'&&
      !['PF-EXTINGUISHER','PF-BIN','PF-LIFT'].includes(o.prefab)&&!bodyIds.has(o.id);
  });
  check(`${name} physical floor fixtures receive collision bodies`,missingBodies.length===0,
    missingBodies.slice(0,8).map(o=>o.id).join(','));
  const fixtureIds=fixtureRows.map(o=>o.id);
  const rendered=new Set(scene.props.map(p=>p.tag).filter(Boolean));
  const missing=fixtureIds.filter(id=>!rendered.has(id));
  check(`${name} renders every blueprint fixture`,missing.length===0,missing.slice(0,8).join(','));
  const fixturesBySpecificity=[...fixtureRows].sort((a,b)=>b.id.length-a.id.length);
  const outside=[],partCounts=new Map();
  for(const part of scene.props){
    // Glyph atlas quads deliberately float a few millimetres in front of their backing plate and
    // are typographic annotation, not furniture/collision geometry.
    if(!part.tag||part.mesh==='quad')continue;
    const fixture=fixturesBySpecificity.find(o=>part.tag===o.id||part.tag.startsWith(`${o.id}/`));
    if(fixture){
      partCounts.set(fixture.id,(partCounts.get(fixture.id)||0)+1);
      if(renderedPartOutsideFixture(part,fixture))outside.push(`${fixture.id}:${part.mesh}`);
    }
  }
  check(`${name} rendered parts stay in fixture footprints`,outside.length===0,[...new Set(outside)].slice(0,8).join(','));
  const singlePrimitive=fixtureRows.filter(o=>o.prefab!=='PF-WALL-RUN'&&(partCounts.get(o.id)||0)<2);
  check(`${name} has no single-primitive furniture or equipment`,singlePrimitive.length===0,
    singlePrimitive.slice(0,8).map(o=>`${o.id}:${o.prefab}:${partCounts.get(o.id)||0}`).join(','));
  const underDetailed=fixtureRows.filter(o=>minimumDetailedParts.has(o.prefab)&&
    (partCounts.get(o.id)||0)<minimumDetailedParts.get(o.prefab));
  check(`${name} sanitary and safety prefabs retain detailed compositions`,underDetailed.length===0,
    underDetailed.slice(0,8).map(o=>`${o.id}:${partCounts.get(o.id)||0}/${minimumDetailedParts.get(o.prefab)}`).join(','));
  const [x0,x1,z0,z1]=b.localBounds;
  check(`${name} spawn inside floor envelope`,scene.spawn.x>=x0&&scene.spawn.x<=x1&&scene.spawn.z>=z0&&scene.spawn.z<=z1,JSON.stringify(scene.spawn));
  const blocked=scene.solids.some(s=>!s.open&&scene.spawn.x>s.x0-.20&&scene.spawn.x<s.x1+.20&&scene.spawn.z>s.z0-.20&&scene.spawn.z<s.z1+.20);
  check(`${name} spawn has body clearance`,!blocked,JSON.stringify(scene.spawn));
  const walk=walkMap(scene,b);
  const unreachable=f.rooms.filter(room=>!walk.rooms.includes(room));
  check(`${name} rooms connect to the spawn`,unreachable.length===0,unreachable.map(r=>r.id).join(','));
  const unreachableThings=scene.things.filter(t=>!walk.points.some(([x,z])=>Math.hypot(x-t.focus[0],z-t.focus[1])<=(t.reach||1.5)));
  check(`${name} interactions have a reachable approach`,unreachableThings.length===0,unreachableThings.map(t=>t.hz).join(','));
}

const byBuilding=new Map();
for(const [,scene] of scenes){const row=byBuilding.get(scene.buildingId)||[];row.push(scene);byBuilding.set(scene.buildingId,row);}
for(const b of plan.buildings){
  const rows=byBuilding.get(b.id)||[];
  check(`${b.id} built every floor`,rows.length===b.floors,rows.length);
  const ground=rows.find(s=>s.blueprintFloor.level===1);
  check(`${b.id} ground floor returns to campus`,ground&&ground.things.some(t=>t.exit&&t.exit.place==='campus'));
  for(const scene of rows){
    const level=scene.blueprintFloor.level;
    check(`${b.id}/F${level} upward route`,level===b.floors||scene.things.some(t=>t.hz==='上楼'&&t.exit));
    check(`${b.id}/F${level} downward route`,level===1||scene.things.some(t=>t.hz==='下楼'&&t.exit));
    const verticalCount=scene.blueprintFloor.rooms.flatMap(r=>r.contents).concat(scene.blueprintFloor.sharedObjects||[])
      .filter(o=>o.prefab==='PF-LIFT'||o.prefab==='PF-STAIR').length;
    const expectedVerticalLinks=verticalCount*((level<b.floors?1:0)+(level>1?1:0));
    const actualVerticalLinks=scene.things.filter(t=>(t.hz==='上楼'||t.hz==='下楼')&&t.exit).length;
    check(`${b.id}/F${level} exposes every lift and protected stair`,actualVerticalLinks===expectedVerticalLinks,
      `${actualVerticalLinks}/${expectedVerticalLinks}`);
  }
}

const sceneByPlace=new Map();
for(const [,scene] of scenes)sceneByPlace.set(vm.runInContext(
  `CampusInteriors.placeKey(${JSON.stringify(scene.buildingId)},${scene.blueprintFloor.level})`,context),scene);
const walkByScene=new Map(),verticalLandingDefects=[];
for(const [,source] of scenes)for(const t of source.things.filter(t=>t.exit&&t.exit.at&&sceneByPlace.has(t.exit.place))){
  const target=sceneByPlace.get(t.exit.place),at=t.exit.at,b=plan.buildings.find(q=>q.id===target.buildingId);
  const finite=[at.x,at.z,at.yaw].every(Number.isFinite);
  const inside=finite&&at.x>=b.localBounds[0]&&at.x<=b.localBounds[1]&&at.z>=b.localBounds[2]&&at.z<=b.localBounds[3];
  const clear=inside&&!target.solids.some(s=>!s.open&&at.x>s.x0-.30&&at.x<s.x1+.30&&at.z>s.z0-.30&&at.z<s.z1+.30);
  let walk=walkByScene.get(target);if(!walk){walk=walkMap(target,b);walkByScene.set(target,walk);}
  const connected=clear&&walk.points.some(([x,z])=>Math.hypot(x-at.x,z-at.z)<=.32);
  if(!connected)verticalLandingDefects.push(`${source.buildingId}/F${source.blueprintFloor.level}->${t.exit.place}@${JSON.stringify(at)}`);
}
check('every authored vertical route lands clear and connected',verticalLandingDefects.length===0,
  verticalLandingDefects.slice(0,12).join(','));

const totalProps=scenes.reduce((n,[,s])=>n+s.props.length,0);
const maxProps=scenes.reduce((best,[name,s])=>s.props.length>best.props?{name,props:s.props.length}:best,{name:'',props:0});
console.log(JSON.stringify({buildings:counts.buildings,floors:scenes.length,rooms:counts.rooms,fixtures:counts.fixtures,
  placeKeys:keys.length,totalGeneratedProps:totalProps,maxFloor:maxProps},null,2));
for(const failure of failures)console.error('FAIL '+failure);
console.log(`\n${passed}/${passed+failures.length} campus-interior checks passed`);
if(failures.length)process.exitCode=1;
