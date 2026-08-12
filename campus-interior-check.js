'use strict';

// Browser-free acceptance check for the university interior construction system.  It executes
// the real matrix, Build.scene and campus-interior renderer, then forces all 28 Lazy floor builders.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=__dirname,builders=new Map(),failures=[];
// Review poses are selected from discrete orbit options. A 1.95 m resolved floor excludes the
// cramped 1.70 m option while leaving a small live-camera settling margin below the 2.00 m option.
// Opaque furniture within 0.80 m of the lens reads as an obstruction even when it misses the eye.
const REVIEW_FRONT_MIN=1.50,REVIEW_BACK_MIN=1.95,REVIEW_NEAR_FIXTURE_MIN=.80,
  REVIEW_FACING_VALUES=new Set(['omnidirectional','local-negative-z','local-positive-z']);
let passed=0;
const check=(name,ok,detail='')=>ok?passed++:failures.push(name+(detail?` — ${detail}`:''));
const walkBlockerContractDefects=(fixtures,solids)=>{
  const defects=[],authored=(fixtures||[]).filter(fixture=>fixture.walkBlocker===true),
    authoredIds=new Set(authored.map(fixture=>fixture.id));
  if(authoredIds.size!==authored.length)defects.push('duplicate-authored-fixture-id');
  for(const fixture of authored){
    const bodies=(solids||[]).filter(solid=>solid.fixtureId===fixture.id);
    if(bodies.length!==1)defects.push(`${fixture.id}:scene-solids-${bodies.length}`);
    else if(bodies[0].walkBlocker!==true)defects.push(`${fixture.id}:missing-runtime-walkBlocker`);
  }
  for(const solid of (solids||[]).filter(candidate=>candidate.walkBlocker===true))
    if(!solid.fixtureId||!authoredIds.has(solid.fixtureId))
      defects.push(`${solid.fixtureId||'anonymous'}:unauthored-runtime-walkBlocker`);
  return defects;
};
const walkBlockerControlFixture={id:'CONTROL/WALK-BLOCKER',walkBlocker:true},
  walkBlockerControlBody={fixtureId:'CONTROL/WALK-BLOCKER',walkBlocker:true};
check('authored walk-blocker contract control accepts one tagged body and rejects missing, duplicate, untagged and stray bodies',
  walkBlockerContractDefects([walkBlockerControlFixture],[walkBlockerControlBody]).length===0&&
  walkBlockerContractDefects([walkBlockerControlFixture],[]).length>0&&
  walkBlockerContractDefects([walkBlockerControlFixture],[walkBlockerControlBody,walkBlockerControlBody]).length>0&&
  walkBlockerContractDefects([walkBlockerControlFixture],[{fixtureId:walkBlockerControlFixture.id}]).length>0&&
  walkBlockerContractDefects([walkBlockerControlFixture],[walkBlockerControlBody,
    {fixtureId:'CONTROL/STRAY',walkBlocker:true}]).length>0);
const color=hex=>{const raw=String(hex).replace('#',''),v=raw.length===3?[...raw].map(c=>c+c).join(''):raw;
  return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255);};

const context={
  console,C:color,
  performance:{now:()=>0},
  Glyphs:{
    need:t=>String(t),
    role:(text,size,opt={})=>opt.glyphRole||(size>=.14?'primary':'micro'),
    isHan:c=>/[\u3400-\u9fff]/u.test(c),
    rect:()=>[0,0,1,1]
  },
  Lazy(name,builder){if(builders.has(name))throw new Error(`duplicate Lazy ${name}`);builders.set(name,builder);return {__lazyName:name};},
};
context.window=context;context.globalThis=context;
context.UNIVERSITY_INTERIORS_BLUEPRINT=JSON.parse(fs.readFileSync(path.join(ROOT,'UNIVERSITY-INTERIORS-BLUEPRINT.json'),'utf8'));
vm.createContext(context);
const run=file=>vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
run('js/math.js');run('js/build.js');run('js/campus-interior-core.js');

const plan=context.UNIVERSITY_INTERIORS_BLUEPRINT;
const PUBLIC_PORTAL_WIDTHS=Object.freeze({
  'B01/PUBLIC':3.2,'B02/PUBLIC':3.2,'B03/PUBLIC':4.2,'B04/PUBLIC':2.6,
  'B05/PUBLIC':3.2,'B06/PUBLIC':3.2,'B07/STUDENT':2.2,'B07/CLINIC':2.2,
  'B08/STAFF':.95,
}),PUBLIC_PORTAL_HEIGHT=2.24;
function expectedPublicPortalGeometry(building,portal){
  const [x0,x1,z0,z1]=building.localBounds,[spawnX,,spawnZ]=portal.localSpawn||[],
    width=PUBLIC_PORTAL_WIDTHS[portal.id];
  if(!Number.isFinite(width)||![spawnX,spawnZ].every(Number.isFinite))return null;
  const nearest=[
    {d:Math.abs(spawnX-x0),side:'west',fixed:x0,along:spawnZ,x:x0+.07,z:spawnZ,
      ix:1,iz:0,vertical:true,lo:z0,hi:z1},
    {d:Math.abs(spawnX-x1),side:'east',fixed:x1,along:spawnZ,x:x1-.07,z:spawnZ,
      ix:-1,iz:0,vertical:true,lo:z0,hi:z1},
    {d:Math.abs(spawnZ-z0),side:'south',fixed:z0,along:spawnX,x:spawnX,z:z0+.07,
      ix:0,iz:1,vertical:false,lo:x0,hi:x1},
    {d:Math.abs(spawnZ-z1),side:'north',fixed:z1,along:spawnX,x:spawnX,z:z1-.07,
      ix:0,iz:-1,vertical:false,lo:x0,hi:x1},
  ].sort((a,b)=>a.d-b.d)[0];
  return{...nearest,portal,width,height:PUBLIC_PORTAL_HEIGHT,opening:[nearest.along-width/2,nearest.along+width/2]};
}
function publicPortalOwningRoomDoor(building,floor,door){
  if(floor.level!==1||door.portal!==true||door.destination!=='campus')return null;
  const vertical=door.side==='west'||door.side==='east',fixed=vertical?door.at[0]:door.at[2],
    along=vertical?door.at[2]:door.at[0];
  return building.portals.filter(portal=>portal.localSpawn).map(portal=>expectedPublicPortalGeometry(building,portal))
    .find(geometry=>geometry&&geometry.side===door.side&&Math.abs(geometry.fixed-fixed)<=.03&&
      Math.abs(geometry.along-along)<=.03&&Math.abs(geometry.width-(door.width||.9))<=.03)||null;
}
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
check('indoor figures use compact contact shadows rather than corridor-length sun shadows',
  /width=\(indoorContact \? \.48 :/.test(gameJs)&&/depth=\(indoorContact \? \.34 :/.test(gameJs)&&
  /alpha:indoorContact \? \.16 :/.test(gameJs));
check('shared chair and bench geometry follows the authored +z facing convention',
  /ground\+\.70,-d\*\.38/.test(coreJs)&&/y\+h\*\.74,-d\*\.35/.test(coreJs));
check('university door leaves use a closer-controlled half-open resting pose',
  /openAngle=50\*Math\.PI\/180/.test(coreJs)&&/leafYaw=Math\.atan2\(-vz,vx\)/.test(coreJs));
const renderedPrefabCases=new Set([...coreJs.matchAll(/case\s+'(PF-[A-Z0-9-]+)'/g)].map(m=>m[1]));
const primitiveFallbacks=plan.prefabCatalog.map(p=>p.id).filter(id=>id!=='PF-WALL-RUN'&&!renderedPrefabCases.has(id));
check('every furniture prefab has a composed renderer',primitiveFallbacks.length===0,primitiveFallbacks.join(','));
const allFixtures=plan.buildings.flatMap(b=>b.floorsPlan.flatMap(f=>
  f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[])));
const prefabSpecs=new Map(plan.prefabCatalog.map(p=>[p.id,p]));
const invalidPrefabFacing=plan.prefabCatalog.filter(prefab=>!REVIEW_FACING_VALUES.has(prefab.reviewFacing)),
  invalidFixtureFacing=allFixtures.filter(fixture=>fixture.reviewFacing!==undefined&&
    !REVIEW_FACING_VALUES.has(fixture.reviewFacing));
check('every prefab declares an explicit review-facing axis',invalidPrefabFacing.length===0,
  invalidPrefabFacing.map(prefab=>`${prefab.id}:${prefab.reviewFacing}`).join(','));
check('every fixture review-facing override uses the supported enum',invalidFixtureFacing.length===0,
  invalidFixtureFacing.map(fixture=>`${fixture.id}:${fixture.reviewFacing}`).join(','));
const unpopulatedActiveScreens=allFixtures.filter(fixture=>fixture.prefab==='PF-SCREEN'&&
  !/daylight|window|outlook/i.test(`${fixture.label||''} ${fixture.purpose||''}`)&&
  (typeof fixture.text!=='string'||!fixture.text.trim()));
check('every active screen carries concise authored in-world content',unpopulatedActiveScreens.length===0,
  unpopulatedActiveScreens.map(fixture=>fixture.id).join(','));
const narrowCirculation=plan.buildings.flatMap(building=>building.floorsPlan.flatMap(floor=>(floor.circulation||[])
    .filter(route=>!Number.isFinite(route.clearWidth)||route.clearWidth<.90-.001).map(route=>route.id))),
  narrowDoors=plan.buildings.flatMap(building=>building.floorsPlan.flatMap(floor=>floor.rooms.flatMap(room=>
    room.doors.filter(door=>!Number.isFinite(door.width)||door.width<.90-.001).map(door=>door.id))));
check('every authored circulation route provides at least 0.90 m clear width',narrowCirculation.length===0,
  narrowCirculation.join(','));
check('every authored room threshold provides at least 0.90 m clear width',narrowDoors.length===0,narrowDoors.join(','));
const minimumDetailedParts=new Map([
  ['PF-WALL-RUN',3],
  ['PF-BIN',4],['PF-TOILET',6],['PF-BASIN',7],['PF-HANDWASH',7],
  ['PF-LAB-SINK',8],['PF-EYEWASH',11],['PF-STOOL',13],['PF-SHOWER',9],
  ['PF-FLAG',30],
  ['PF-COMPUTER-DESK',15],['PF-ROBOTICS',16],['PF-SCREEN',7],['PF-DANCE-MIRROR',6],
]);
const architecturalSlabLanguage=/wall|panel|datum|raft|ceiling|floor|rug|mat|runner|line|route|field|inset|marker|curtain|blind|window|glass|glazed|glazing|mirror|sill|headboard|pinboard|rail|divider|partition|curb|drain|grille|threshold|jamb|portal|reveal|canopy|inlay|turning|approach|privacy|identity|feature|acoustic|tactile|welcome|backdrop|circuit|calibration|alignment|work grid|aisle|wheelchair|dining bay|sash|plenum|duct|fixed services|service strip|service identification/i;
const furnitureOrEquipmentLanguage=/speaker|side table|tea table|medicine stock|electrical cabinet|coat-hook|\bdesk\b|\bchair\b|\bbench\b|\bcounter\b|\bshelf\b|\blocker\b|\bbed\b|\bsofa\b|\bstool\b|\bkiosk\b|\bappliance\b/i;
const slabMisuse=allFixtures.filter(o=>o.prefab==='PF-WALL-RUN'&&(
  (furnitureOrEquipmentLanguage.test(o.label)&&!/headboard|pinboard|approach|position|bay|field/i.test(o.label))||
  !architecturalSlabLanguage.test(`${o.label} ${o.purpose}`)));
check('wall-run slabs are architectural layers only',slabMisuse.length===0,
  slabMisuse.slice(0,12).map(o=>o.id).join(','));
const namedSeatVectors={north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]},seatFacingDefects=[];
for(const o of allFixtures.filter(o=>['PF-CHAIR','PF-LECTURE-SEAT','PF-BENCH','PF-WAIT-CHAIRS'].includes(o.prefab)&&o.facing)){
  const expected=namedSeatVectors[o.facing],actual=[Math.sin(o.yaw||0),Math.cos(o.yaw||0)];
  if(!expected||actual[0]*expected[0]+actual[1]*expected[1]<.999)seatFacingDefects.push(o.id);
}
check('every named seat direction follows the shared +z yaw convention',seatFacingDefects.length===0,
  seatFacingDefects.slice(0,16).join(','));
const b02B06SeatDefects=[],b02B06Seats=allFixtures.filter(o=>
  /^B0[26]\//.test(o.id)&&['PF-CHAIR','PF-BENCH','PF-WAIT-CHAIRS'].includes(o.prefab));
for(const o of b02B06Seats){
  const expected=namedSeatVectors[o.facing],target=o.facesPoint;
  if(!expected||!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite)){
    b02B06SeatDefects.push(`${o.id}:missing-facing-target`);continue;
  }
  const actual=[Math.sin(o.yaw||0),Math.cos(o.yaw||0)],dx=target[0]-o.at[0],dz=target[1]-o.at[2],
    length=Math.hypot(dx,dz),semanticDot=actual[0]*expected[0]+actual[1]*expected[1],
    targetDot=length?(actual[0]*dx+actual[1]*dz)/length:-1;
  if(semanticDot<.999||targetDot<.999)b02B06SeatDefects.push(
    `${o.id}:semantic=${semanticDot.toFixed(3)}/target=${targetDot.toFixed(3)}`);
}
check('B02 and B06 benches, waiting banks and loose chairs face their authored room targets',
  b02B06Seats.length>0&&b02B06SeatDefects.length===0,
  b02B06SeatDefects.length?b02B06SeatDefects.slice(0,16).join(','):`${b02B06Seats.length} seat vectors`);
const darkRooms=[];
for(const b of plan.buildings)for(const f of b.floorsPlan){
  const luminaires=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[]).filter(o=>
    o.prefab==='PF-CEILING-LIGHT'||o.prefab==='PF-PENDANT'||o.prefab==='PF-EMERGENCY-LIGHT');
  for(const r of f.rooms)if(!luminaires.some(o=>o.at[0]>=r.bounds[0]&&o.at[0]<=r.bounds[1]&&
    o.at[2]>=r.bounds[2]&&o.at[2]<=r.bounds[3]))darkRooms.push(r.id);
}
check('every enclosed room or core has an authored luminaire',darkRooms.length===0,darkRooms.slice(0,16).join(','));
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
const b04=plan.buildings.find(b=>b.id==='B04'),b04WindowDefects=[];
if(b04){
  const westBays=(b04.facadeAlignment.westWindows||{}).localZ||[];
  const eastBays=(b04.facadeAlignment.eastServiceWindows||{}).localZ||[];
  if(!westBays.length||!eastBays.length)b04WindowDefects.push('missing-facade-bay-metadata');
  for(const f of b04.floorsPlan)for(const r of f.rooms.filter(q=>/\/(?:A01|\d{3})$/.test(q.id))){
    const windows=r.contents.filter(o=>o.id.endsWith('/WINDOW'));
    if(f.level===1){if(windows.length)b04WindowDefects.push(`${r.id}:false-ground-window`);continue;}
    const bays=r.bounds[1]<=-1.2?westBays:eastBays;
    if(windows.length!==1||!bays.some(z=>Math.abs(z-windows[0].at[2])<.001))
      b04WindowDefects.push(`${r.id}:${windows.map(o=>o.at[2]).join('/')}`);
  }
}
check('B04 dorm glazing aligns with constructed facade bays',b04&&b04WindowDefects.length===0,
  b04WindowDefects.slice(0,12).join(','));

// B08's south facade is a real exterior window, not a backdrop for an opaque command wall.
// Lock the inside leaf to the authored exterior bay and reject any tall opaque fixture placed
// close enough to cover that clear span. The jamb/head/sill assembly is explicitly exempt.
const b08=plan.buildings.find(b=>b.id==='B08'),b08South=b08&&b08.facadeAlignment.southWindow;
const b08F1=b08&&b08.floorsPlan.find(f=>f.level===1);
const b08Fixtures=b08F1?b08F1.rooms.flatMap(r=>r.contents).concat(b08F1.sharedObjects||[]):[];
const b08Glass=b08Fixtures.find(o=>o.id==='B08/F1/WORK/SOUTH-WINDOW/GLASS');
const close=(a,b,t=.001)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t;
const b08GlazingAligned=!!(b08&&b08South&&b08Glass&&
  Array.isArray(b08South.exteriorGlazingCampus)&&Array.isArray(b08South.interiorGlazingLocal)&&
  b08Glass.material==='M-GLASS'&&b08Glass.collision==='none'&&
  close(b08Glass.at[0],b08South.interiorGlazingLocal[0])&&
  close(b08Glass.at[2],b08South.interiorGlazingLocal[1])&&
  close(b08Glass.size[0],b08South.width)&&close(b08Glass.size[1],b08South.height)&&
  close(b08.centreCampus[0]+b08Glass.at[0],b08South.exteriorGlazingCampus[0])&&
  close(b08.centreCampus[1]+b08South.localZ,b08South.exteriorGlazingCampus[1],.05)&&
  b08Glass.at[2]>b08South.localZ&&b08Glass.at[2]-b08South.localZ<.45);
check('B08 south exterior window has aligned transparent interior glazing',b08GlazingAligned,
  b08Glass?`${b08Glass.at.join('/')} ${b08Glass.size.join('x')}`:'missing B08/F1/WORK/SOUTH-WINDOW/GLASS');
function fixtureVerticalSpan(o){
  const anchor=prefabSpecs.get(o.prefab)?.anchor;
  return anchor==='floor'?[o.at[1],o.at[1]+o.size[1]]:[o.at[1]-o.size[1]/2,o.at[1]+o.size[1]/2];
}
const b08WindowBlockers=[];
if(b08Glass){
  const gx0=b08Glass.at[0]-b08Glass.size[0]/2,gx1=b08Glass.at[0]+b08Glass.size[0]/2;
  const gy0=b08Glass.at[1]-b08Glass.size[1]/2,gy1=b08Glass.at[1]+b08Glass.size[1]/2;
  for(const o of b08Fixtures){
    if(o===b08Glass||o.id.startsWith('B08/F1/WORK/SOUTH-WINDOW/')||o.material==='M-GLASS')continue;
    const yaw=o.yaw||0,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
    const hx=(c*o.size[0]+s*o.size[2])/2,hz=(c*o.size[2]+s*o.size[0])/2;
    const [oy0,oy1]=fixtureVerticalSpan(o);
    const xOverlap=Math.min(gx1,o.at[0]+hx)-Math.max(gx0,o.at[0]-hx);
    const yOverlap=Math.min(gy1,oy1)-Math.max(gy0,oy0);
    const surfaceGap=Math.abs(o.at[2]-b08Glass.at[2])-hz-b08Glass.size[2]/2;
    if(xOverlap>.10&&yOverlap>.30&&surfaceGap<.20)b08WindowBlockers.push(o.id);
  }
}
check('B08 south window clear span has no opaque full-height feature obstruction',
  !!b08Glass&&b08WindowBlockers.length===0,b08WindowBlockers.join(','));

// Chair yaw zero now means +z. Assert the authored seat-to-monitor vector, not just copy text.
const b08Console=b08Fixtures.find(o=>o.id==='B08/F1/WORK/CONSOLE');
const b08Chair=b08Fixtures.find(o=>o.id==='B08/F1/WORK/CHAIR');
let b08ChairDot=-1,b08ChairGap=NaN;
if(b08Console&&b08Chair){
  const dx=b08Console.at[0]-b08Chair.at[0],dz=b08Console.at[2]-b08Chair.at[2];
  const length=Math.hypot(dx,dz),facing=[Math.sin(b08Chair.yaw||0),Math.cos(b08Chair.yaw||0)];
  b08ChairDot=length?(dx*facing[0]+dz*facing[1])/length:-1;
  b08ChairGap=(b08Console.at[2]-b08Console.size[2]/2)-(b08Chair.at[2]+b08Chair.size[2]/2);
}
check('B08 guard chair faces its four-monitor console under the shared +z convention',
  !!(b08Console&&b08Chair&&b08Chair.facesFixture===b08Console.id&&b08Chair.facing==='north'&&
    close(b08Console.yaw||0,0)&&close(b08Chair.yaw||0,0)&&b08ChairDot>.999&&close(b08ChairGap,.35)),
  `dot=${b08ChairDot.toFixed(3)} gap=${Number.isFinite(b08ChairGap)?b08ChairGap.toFixed(3):'n/a'}`);

// A 0.20 m lattice is fine enough to sample a 0.90 m clear door with a 0.30 m player radius;
// a 0.30 m lattice can alias a valid opening completely depending on the building origin.
function walkMap(scene,b,step=.20,radius=.30){
  const [x0,x1,z0,z1]=b.localBounds,w=Math.floor((x1-x0)/step)+1,h=Math.floor((z1-z0)/step)+1;
  const blocked=new Uint8Array(w*h),seen=new Uint8Array(w*h),index=(ix,iz)=>iz*w+ix;
  for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++){
    const x=x0+ix*step,z=z0+iz*step;
    blocked[index(ix,iz)]=scene.solids.some(s=>!s.open&&x>s.x0-radius&&x<s.x1+radius&&z>s.z0-radius&&z<s.z1+radius)?1:0;
  }
  let sx=0,sz=0;
  const candidates=[];for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++)if(!blocked[index(ix,iz)])
    candidates.push([ix,iz,(x0+ix*step-scene.spawn.x)**2+(z0+iz*step-scene.spawn.z)**2]);
  candidates.sort((a,b)=>a[2]-b[2]);if(!candidates.length)return{points:[],rooms:[]};
  [sx,sz]=candidates[0];const queue=[[sx,sz]];seen[index(sx,sz)]=1;
  for(let q=0;q<queue.length;q++){
    const [ix,iz]=queue[q];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=ix+dx,nz=iz+dz;if(nx<0||nz<0||nx>=w||nz>=h)continue;const k=index(nx,nz);
      if(blocked[k]||seen[k])continue;
      const px=x0+ix*step,pz=z0+iz*step,tx=x0+nx*step,tz=z0+nz*step,
        moved=scene.clampMove(px,pz,tx,tz,radius);
      // Solids are not the whole movement contract: Build also clamps against authored zones.
      // Requiring each lattice edge to survive the real runtime clamp catches disconnected zone
      // islands such as the former B06 entrance, which a solids-only flood incorrectly approved.
      if(Math.abs(moved[0]-tx)>.011||Math.abs(moved[1]-tz)>.011)continue;
      seen[k]=1;queue.push([nx,nz]);
    }
  }
  const points=queue.map(([ix,iz])=>[x0+ix*step,z0+iz*step]);
  return{points,rooms:scene.blueprintFloor.rooms.filter(room=>points.some(([x,z])=>
    x>room.bounds[0]+radius&&x<room.bounds[1]-radius&&z>room.bounds[2]+radius&&z<room.bounds[3]-radius))};
}
const walkMapCache=new WeakMap();
function cachedWalkMap(scene,b){
  if(!walkMapCache.has(scene))walkMapCache.set(scene,walkMap(scene,b));
  return walkMapCache.get(scene);
}
function walkReaches(scene,walk,targetX,targetZ,tolerance=.24,radius=.30){
  return walk.points.some(([x,z])=>{
    if(Math.hypot(x-targetX,z-targetZ)>tolerance)return false;
    const moved=scene.clampMove(x,z,targetX,targetZ,radius);
    return Math.abs(moved[0]-targetX)<=.011&&Math.abs(moved[1]-targetZ)<=.011;
  });
}

const scenes=[],visualReviewDefects=[],entryReviewDefects=[],compositionDefects=[],authoredVisualReviewFloors=new Set(),
  authoredEntryReviewFloors=new Set(),authoredGroundEntryReviews=new Set(),bodyEvidenceRows=new Set(),
  reviewBackOptions=[3.6,3.2,2.8,2.4,2.0,1.7,1.4],reviewDoorSampleCache=new WeakMap(),
  reviewFixtureCache=new WeakMap(),reviewRenderedBoundsCache=new WeakMap();
const REVIEW_FOV=.90,REVIEW_ASPECT=1.6,REVIEW_PITCH=.28,
  REVIEW_TAN_Y=Math.tan(REVIEW_FOV/2),REVIEW_TAN_X=REVIEW_TAN_Y*REVIEW_ASPECT,
  REVIEW_COS_PITCH=Math.cos(REVIEW_PITCH),REVIEW_SIN_PITCH=Math.sin(REVIEW_PITCH);
const reviewInside=(bounds,x,z,pad=0)=>x>=bounds[0]+pad&&x<=bounds[1]-pad&&z>=bounds[2]+pad&&z<=bounds[3]-pad;
function reviewFixtures(floor){
  if(!reviewFixtureCache.has(floor))reviewFixtureCache.set(floor,new Map(
    floor.rooms.flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[]).map(fixture=>[fixture.id,fixture])));
  return reviewFixtureCache.get(floor);
}
function reviewTransform(m,x,y,z){
  return[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
}
function reviewCamera(pose,back){
  const fx=Math.sin(pose.yaw),fz=Math.cos(pose.yaw);
  return{eye:[pose.x-fx*back,1.15+Math.tan(REVIEW_PITCH)*back,pose.z-fz*back],
    forward:[fx*REVIEW_COS_PITCH,-REVIEW_SIN_PITCH,fz*REVIEW_COS_PITCH],
    right:[-Math.cos(pose.yaw),0,Math.sin(pose.yaw)],
    up:[REVIEW_SIN_PITCH*fx,REVIEW_COS_PITCH,REVIEW_SIN_PITCH*fz]};
}
function reviewCameraBlockLimit(origin,dir,maxDistance,blockers){
  let limit=maxDistance;
  for(const blocker of blockers||[]){
    let t0=0,t1=maxDistance,hit=true;const pad=blocker.pad===undefined?.4:blocker.pad;
    for(const [axis,lo,hi] of [[0,blocker.x0-pad,blocker.x1+pad],[2,blocker.z0-pad,blocker.z1+pad]]){
      if(Math.abs(dir[axis])<1e-5){if(origin[axis]<lo||origin[axis]>hi){hit=false;break;}continue;}
      let a=(lo-origin[axis])/dir[axis],b=(hi-origin[axis])/dir[axis];if(a>b)[a,b]=[b,a];
      t0=Math.max(t0,a);t1=Math.min(t1,b);if(t1<t0){hit=false;break;}
    }
    const eyeY=origin[1]+dir[1]*t0;
    if(hit&&t0>.2&&eyeY<blocker.top&&(blocker.bot===undefined||eyeY>=blocker.bot))
      limit=Math.min(limit,t0-.05);
  }
  return limit;
}
function reviewCameraStable(scene,pose,back){
  const requested=back/REVIEW_COS_PITCH,target=[pose.x,1.15,pose.z],
    dir=[-Math.sin(pose.yaw)*REVIEW_COS_PITCH,REVIEW_SIN_PITCH,-Math.cos(pose.yaw)*REVIEW_COS_PITCH],
    room=scene.roomAt&&scene.roomAt(pose.x,pose.z,null,true);
  if(!room)return false;
  const endpoint=[target[0]+dir[0]*requested,target[2]+dir[2]*requested];
  // Keep the resolved eye in the same semantic room as the review target. Then the game's
  // cutaway is inactive (hideX/hideZ are both zero), and the offline visibility proof describes
  // the same set of props the PNG actually draws rather than guessing which cross-room wall drops.
  if(endpoint[0]<room.x0+.02||endpoint[0]>room.x1-.02||endpoint[1]<room.z0+.02||endpoint[1]>room.z1-.02)
    return false;
  let distance=Math.min(requested,room.near||12);
  if(room.id==='lift')distance=Math.min(distance,2.30);
  else if((room.near||12)>=3){
    for(const [axis,lo,hi] of [[0,room.x0,room.x1],[2,room.z0,room.z1]]){
      if(Math.abs(dir[axis])<1e-4)continue;const sign=dir[axis]>0?1:-1,wall=sign>0?hi:lo,
        inner=(wall-sign*.52-target[axis])/dir[axis],outer=(wall+sign*.18-target[axis])/dir[axis];
      if(inner>0&&distance>inner&&distance<outer)distance=inner;
    }
  }
  if(room.ceil!==undefined&&dir[1]>1e-4)
    distance=Math.min(distance,Math.max((room.ceil-target[1])/dir[1],.85));
  // The hosted capture must use the authored orbit, not a shorter clearWall/blocker solution.
  // Once both comparisons are exact, the game's recovery branch has no reason to add slide/rise.
  if(Math.abs(distance-requested)>1e-6)return false;
  return reviewCameraBlockLimit(target,dir,requested,scene.blockers)>=requested-.005;
}
function reviewProject(camera,point){
  const delta=[point[0]-camera.eye[0],point[1]-camera.eye[1],point[2]-camera.eye[2]],
    dot=axis=>delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2],forward=dot(camera.forward);
  if(forward<=.05)return{inside:false,forward};
  const horizontal=dot(camera.right),vertical=dot(camera.up);
  const nx=horizontal/(forward*REVIEW_TAN_X),ny=vertical/(forward*REVIEW_TAN_Y);
  return{inside:Math.abs(nx)<=1&&Math.abs(ny)<=1,forward,horizontal,vertical,nx,ny};
}
const REVIEW_CUBE_VERTICES=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],
  [-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],REVIEW_BOX_TRIANGLES=[
  [0,1,2],[0,2,3],[4,6,5],[4,7,6],
  [0,4,5],[0,5,1],[3,2,6],[3,6,7],
  [0,3,7],[0,7,4],[1,5,6],[1,6,2],
];
const reviewPropVertices=prop=>REVIEW_CUBE_VERTICES.map(vertex=>reviewTransform(prop.m,...vertex));
function reviewPointInProp(prop,point){
  const m=prop.m,delta=[point[0]-m[12],point[1]-m[13],point[2]-m[14]];
  for(const offset of [0,4,8]){const axis=[m[offset],m[offset+1],m[offset+2]],length2=
      axis[0]*axis[0]+axis[1]*axis[1]+axis[2]*axis[2];
    if(length2<1e-12||Math.abs((delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2])/length2)>.500001)
      return false;
  }
  return true;
}
function reviewRayProp(origin,target,prop){
  const local=point=>{const delta=[point[0]-prop.m[12],point[1]-prop.m[13],point[2]-prop.m[14]],out=[];
    for(const offset of [0,4,8]){const axis=[prop.m[offset],prop.m[offset+1],prop.m[offset+2]],
        length2=axis[0]*axis[0]+axis[1]*axis[1]+axis[2]*axis[2];
      if(length2<1e-12)return null;out.push((delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2])/length2);}
    return out;},a=local(origin),b=local(target);if(!a||!b)return false;let lo=0,hi=1;
  for(let axis=0;axis<3;axis++){const delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-10){if(a[axis]<=-.5||a[axis]>=.5)return false;continue;}
    let near=(-.5-a[axis])/delta,far=(.5-a[axis])/delta;if(near>far)[near,far]=[far,near];
    lo=Math.max(lo,near);hi=Math.min(hi,far);if(lo>=hi)return false;
  }
  return Math.max(lo,.002)<Math.min(hi,.985);
}
function reviewClipTriangle(camera,triangle){
  const dot=(point,axis)=>(point[0]-camera.eye[0])*axis[0]+(point[1]-camera.eye[1])*axis[1]+
      (point[2]-camera.eye[2])*axis[2],
    planes=[
      point=>dot(point,camera.forward)-.05,
      point=>dot(point,camera.forward)*REVIEW_TAN_X-dot(point,camera.right),
      point=>dot(point,camera.forward)*REVIEW_TAN_X+dot(point,camera.right),
      point=>dot(point,camera.forward)*REVIEW_TAN_Y-dot(point,camera.up),
      point=>dot(point,camera.forward)*REVIEW_TAN_Y+dot(point,camera.up),
    ];
  let polygon=triangle;
  for(const plane of planes){
    if(!polygon.length)break;const clipped=[];let previous=polygon[polygon.length-1],dp=plane(previous);
    for(const current of polygon){const dc=plane(current),previousInside=dp>=-1e-9,currentInside=dc>=-1e-9;
      if(previousInside!==currentInside){const t=dp/(dp-dc);clipped.push([
        previous[0]+(current[0]-previous[0])*t,
        previous[1]+(current[1]-previous[1])*t,
        previous[2]+(current[2]-previous[2])*t,
      ]);}
      if(currentInside)clipped.push(current);previous=current;dp=dc;
    }
    polygon=clipped;
  }
  return polygon;
}
function reviewClipPolygonPlane(polygon,plane){
  if(!polygon.length)return polygon;const clipped=[];let previous=polygon[polygon.length-1],dp=plane(previous);
  for(const current of polygon){const dc=plane(current),previousInside=dp>=-1e-9,currentInside=dc>=-1e-9;
    if(previousInside!==currentInside){const t=dp/(dp-dc);clipped.push([
      previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t,
      previous[2]+(current[2]-previous[2])*t]);}
    if(currentInside)clipped.push(current);previous=current;dp=dc;
  }
  return clipped;
}
function reviewRayBox(origin,target,box){
  const delta=[target[0]-origin[0],target[2]-origin[2]];let lo=0,hi=1;
  for(const [o,v,min,max] of [[origin[0],delta[0],box.x0,box.x1],[origin[2],delta[1],box.z0,box.z1]]){
    if(Math.abs(v)<1e-9){if(o<=min||o>=max)return null;}
    else{let a=(min-o)/v,b=(max-o)/v;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>=hi)return null;}
  }
  return[lo,hi];
}
function reviewFixtureSpan(floor,fixture){
  const anchor=(prefabSpecs.get(fixture.prefab)||{}).anchor||'floor',y=fixture.at[1]-floor.elevation,h=fixture.size[1];
  return anchor==='floor'?[y,y+h]:[y-h/2,y+h/2];
}
const reviewFixtureOwnerCache=new WeakMap();
function reviewFixtureOwner(fixtures,tag){
  if(typeof tag!=='string')return null;if(!reviewFixtureOwnerCache.has(fixtures))reviewFixtureOwnerCache.set(fixtures,new Map());
  const cache=reviewFixtureOwnerCache.get(fixtures);if(cache.has(tag))return cache.get(tag);
  if(fixtures.has(tag)){cache.set(tag,tag);return tag;}let owner=null;
  for(const id of fixtures.keys())if(tag.startsWith(`${id}/`)&&(!owner||id.length>owner.length))owner=id;
  cache.set(tag,owner);return owner;
}
const reviewPropBelongs=(fixtures,tag,fixtureId)=>reviewFixtureOwner(fixtures,tag)===fixtureId;
function reviewRenderedFixtureBounds(scene,floor,fixture){
  if(!reviewRenderedBoundsCache.has(scene))reviewRenderedBoundsCache.set(scene,new Map());
  const cache=reviewRenderedBoundsCache.get(scene);if(cache.has(fixture.id))return cache.get(fixture.id);
  let [bottom,top]=reviewFixtureSpan(floor,fixture),x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const solid of scene.solids.filter(s=>s.fixtureId===fixture.id)){
    x0=Math.min(x0,solid.x0);x1=Math.max(x1,solid.x1);z0=Math.min(z0,solid.z0);z1=Math.max(z1,solid.z1);
  }
  const fixtures=reviewFixtures(floor);
  for(const prop of scene.props.filter(prop=>reviewPropBelongs(fixtures,prop.tag,fixture.id)&&prop.m&&prop.mesh!=='quad')){
    const m=prop.m,radius=.5*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]));
    bottom=Math.min(bottom,m[13]-radius);top=Math.max(top,m[13]+radius);
    for(const point of reviewPropVertices(prop)){x0=Math.min(x0,point[0]);x1=Math.max(x1,point[0]);
      z0=Math.min(z0,point[2]);z1=Math.max(z1,point[2]);}
  }
  const bounds={x0,x1,z0,z1,bottom,top};cache.set(fixture.id,bounds);return bounds;
}
function reviewLineOfSight(scene,floor,origin,target,excludeFixtureId,architecturalOnly=false){
  const fixtures=reviewFixtures(floor);
  for(const solid of scene.solids){
    if(solid.open||solid.fixtureId===excludeFixtureId||architecturalOnly&&solid.fixtureId)continue;
    // A public portal boundary is laminated glazing: it blocks movement but is not opaque
    // architecture. Only that explicitly tagged proxy is transparent to the review ray. A shell
    // body containing the target must now fail instead of being silently excused.
    if(architecturalOnly&&solid.portalBoundary===true&&solid.transparent===true)continue;
    const fixture=solid.fixtureId&&fixtures.get(solid.fixtureId),rendered=fixture&&
      reviewRenderedFixtureBounds(scene,floor,fixture),box=rendered||solid,
      hit=reviewRayBox(origin,target,box);if(!hit)continue;
    const lo=Math.max(hit[0],.002),hi=Math.min(hit[1],.985);if(lo>=hi)continue;
    let bottom=0,top=scene.H||Math.max(2.75,floor.height-.18);
    if(rendered){bottom=rendered.bottom;top=rendered.top;}
    const dy=target[1]-origin[1],y0=origin[1]+dy*lo,y1=origin[1]+dy*hi;
    if(Math.min(y0,y1)<top-.01&&Math.max(y0,y1)>bottom+.01)return false;
  }
  if(!architecturalOnly)for(const prop of scene.props||[]){
    if(!prop||!prop.m||prop.mesh==='quad'||reviewPropBelongs(fixtures,prop.tag,excludeFixtureId)||
      prop.alpha!==undefined&&prop.alpha<.55)continue;
    if(reviewRayProp(origin,target,prop))return false;
  }
  return true;
}
function reviewArchitecturalSolidBlocksPoint(scene,solid,origin,target){
  if(!solid||solid.open||solid.fixtureId)return false;
  if(solid.portalBoundary===true&&solid.transparent===true)return false;
  const hit=reviewRayBox(origin,target,solid);if(!hit)return false;
  const lo=Math.max(hit[0],.002),hi=Math.min(hit[1],.985);if(lo>=hi)return false;
  const bottom=solid.bot===undefined?0:solid.bot,
    top=solid.top===undefined?(scene.H||3):solid.top,dy=target[1]-origin[1],
    y0=origin[1]+dy*lo,y1=origin[1]+dy*hi;
  return Math.min(y0,y1)<top-.01&&Math.max(y0,y1)>bottom+.01;
}
function reviewPolygonArchitecturallyOccluded(scene,floor,origin,polygon){
  const fixtures=reviewFixtures(floor),centroid=polygon.reduce((sum,point)=>[
    sum[0]+point[0]/polygon.length,sum[1]+point[1]/polygon.length,
    sum[2]+point[2]/polygon.length],[0,0,0]),samples=[centroid,...polygon];
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];
    samples.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}
  // A single convex opaque architectural body must cover the entire clipped polygon. Allowing
  // separate solids to hide separate rays let slats/pinholes certify a visibly exposed door.
  if(scene.solids.some(solid=>samples.every(point=>
    reviewArchitecturalSolidBlocksPoint(scene,solid,origin,point))))return true;
  // A deliberately authored privacy wall may hide a clinical/internal threshold, but only its
  // actual opaque rendered OBB can prove that coverage. Furniture collision proxies remain
  // ineligible, and several slats cannot collectively forge a fully hidden polygon.
  return scene.props.some(prop=>{const owner=prop&&reviewFixtureOwner(fixtures,prop.tag),fixture=owner&&fixtures.get(owner);
    return fixture?.architecturalOccluder===true&&prop.m&&prop.mesh!=='quad'&&
      (prop.alpha===undefined||prop.alpha>=.55)&&samples.every(point=>reviewRayProp(origin,point,prop));});
}
function reviewPolygonOpaquelyOccluded(scene,floor,origin,polygon,excludeFixtureId){
  const fixtures=reviewFixtures(floor),centroid=polygon.reduce((sum,point)=>[
    sum[0]+point[0]/polygon.length,sum[1]+point[1]/polygon.length,
    sum[2]+point[2]/polygon.length],[0,0,0]),samples=[centroid,...polygon];
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];
    samples.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}
  if(scene.solids.some(solid=>samples.every(point=>
    reviewArchitecturalSolidBlocksPoint(scene,solid,origin,point))))return true;
  return scene.props.some(prop=>prop&&prop.m&&prop.mesh!=='quad'&&
    reviewFixtureOwner(fixtures,prop.tag)!==excludeFixtureId&&
    (prop.alpha===undefined||prop.alpha>=.55)&&samples.every(point=>reviewRayProp(origin,point,prop)));
}
function reviewBodyOccludes(origin,target,x,z,radius=.42,height=1.85){
  const dx=target[0]-origin[0],dz=target[2]-origin[2],ox=origin[0]-x,oz=origin[2]-z,
    a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-radius*radius;
  if(a<1e-10)return c<=0&&Math.min(origin[1],target[1])<=height&&Math.max(origin[1],target[1])>=0;
  const discriminant=b*b-4*a*c;if(discriminant<0)return false;const root=Math.sqrt(discriminant),
    lo=Math.max(.002,(-b-root)/(2*a)),hi=Math.min(.985,(-b+root)/(2*a));
  if(lo>hi)return false;const y0=origin[1]+(target[1]-origin[1])*lo,y1=origin[1]+(target[1]-origin[1])*hi;
  return Math.min(y0,y1)<=height&&Math.max(y0,y1)>=0;
}
function reviewDoorSamples(scene,floor){
  if(reviewDoorSampleCache.has(scene))return reviewDoorSampleCache.get(scene);
  // The renderer is authoritative here. Public portal panels and authored PF-DOOR fire leaves
  // are not room-door records, and a hard glass panel is not a softBox. Every visible door panel
  // marks itself explicitly so the review gate cannot silently omit either class.
  const rows=scene.props.filter(prop=>prop.doorLeaf===true).map(prop=>{const vertices=reviewPropVertices(prop),
    xs=vertices.map(point=>point[0]),zs=vertices.map(point=>point[2]);return{
      leaf:{id:prop.tag||'untagged-door-leaf'},prop,vertices,
      aabb:{x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)},
    };});
  reviewDoorSampleCache.set(scene,rows);return rows;
}
function reviewSightBlocked(scene,floor,x,z,pad=.055){
  return scene.blockers.some(s=>x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
    scene.solids.some(s=>!s.open&&x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
    // Rendered markers are complete and cardinality-checked below; synthetic source aliases can
    // describe panels that the reciprocal-opening dedup intentionally suppresses.
    reviewDoorSamples(scene,floor).some(({aabb})=>x>aabb.x0-pad&&x<aabb.x1+pad&&z>aabb.z0-pad&&z<aabb.z1+pad);
}
function reviewBack(scene,floor,envelope,pose){
  const fx=Math.sin(pose.yaw),fz=Math.cos(pose.yaw);
  return reviewBackOptions.find(distance=>{
    const cx=pose.x-fx*distance,cz=pose.z-fz*distance;
    if(!reviewInside(envelope,cx,cz,.18)||!reviewCameraStable(scene,pose,distance))return false;
    for(let q=.12;q<=distance;q+=.10)if(reviewSightBlocked(scene,floor,pose.x-fx*q,pose.z-fz*q))return false;
    return true;
  })||0;
}
function reviewFront(scene,floor,envelope,pose){
  const fx=Math.sin(pose.yaw),fz=Math.cos(pose.yaw);let front=0;
  // The .04 m step with a .025 m radius overlaps continuously, so a thin partition cannot sit
  // between probes and masquerade as open depth.
  for(let q=.04;q<=6;q+=.04){const x=pose.x+fx*q,z=pose.z+fz*q;
    if(!reviewInside(envelope,x,z,.10)||reviewSightBlocked(scene,floor,x,z,.025))break;front=q;}
  return front;
}
function reviewForegroundDoor(scene,floor,pose,back){
  const camera=reviewCamera(pose,back);
  for(const {leaf,prop,vertices} of reviewDoorSamples(scene,floor)){
    if(!prop||!prop.m)continue;
    if(reviewPointInProp(prop,camera.eye))return{...leaf,point:camera.eye};
    // Clip all twelve transformed face triangles against the exact hosted perspective frustum.
    // This catches a panel that covers the camera while every fixed lattice point lies outside,
    // as well as arbitrarily thin edge slivers. Only real architecture may then hide the clipped
    // polygon; open/glazed furniture collision proxies never certify a door as invisible.
    for(const indices of REVIEW_BOX_TRIANGLES){const polygon=reviewClipTriangle(camera,indices.map(i=>vertices[i]));
      if(!polygon.length)continue;
      if(!reviewPolygonArchitecturallyOccluded(scene,floor,camera.eye,polygon))
        return{...leaf,point:polygon[0]};
    }
  }
  return null;
}
function reviewCameraFixtureIntrusion(scene,floor,pose,back){
  const camera=reviewCamera(pose,back),fixtures=reviewFixtures(floor);
  for(const prop of scene.props){
    const owner=prop&&reviewFixtureOwner(fixtures,prop.tag);
    if(!prop||!prop.m||prop.mesh==='quad'||(prop.alpha!==undefined&&prop.alpha<.55)||!owner)continue;
    const vertices=reviewPropVertices(prop),ys=vertices.map(point=>point[1]);
    // Floor insets and ceiling skins are deliberately allowed to meet the camera envelope. The
    // review blocker is opaque furniture/equipment that creates a giant near-field slab.
    if(Math.max(...ys)<.24||Math.min(...ys)>(scene.H||Math.max(2.75,floor.height-.18))-.18)continue;
    if(reviewPointInProp(prop,camera.eye))return{id:owner,forward:0};
    for(const indices of REVIEW_BOX_TRIANGLES){let polygon=reviewClipTriangle(camera,indices.map(i=>vertices[i]));
      polygon=reviewClipPolygonPlane(polygon,point=>REVIEW_NEAR_FIXTURE_MIN-reviewProject(camera,point).forward);
      if(polygon.length&&!reviewPolygonOpaquelyOccluded(scene,floor,camera.eye,polygon,owner)){
        const forward=Math.min(...polygon.map(point=>reviewProject(camera,point).forward));
        return{id:owner,forward};
      }
    }
  }
  return null;
}
function reviewFocusEvidence(scene,floor,pose,back,ids,minimum,bodyVisible=false){
  if(!Array.isArray(ids)||ids.length<minimum)return{error:`focus-fixtures-${Array.isArray(ids)?ids.length:0}/${minimum}`};
  if(new Set(ids).size!==ids.length)return{error:'duplicate-focus-fixtures'};
  const fixtures=reviewFixtures(floor),prefabs=new Map(plan.prefabCatalog.map(spec=>[spec.id,spec])),
    anchorOf=fixture=>(prefabs.get(fixture.prefab)||{}).anchor||'floor',
    sightY=fixture=>/centre/.test(anchorOf(fixture))?fixture.at[1]:
      fixture.at[1]+Math.min(fixture.size[1]*.65,1.35),fx=Math.sin(pose.yaw),fz=Math.cos(pose.yaw),
    rx=Math.cos(pose.yaw),rz=-Math.sin(pose.yaw),cameraX=pose.x-fx*back,cameraZ=pose.z-fz*back,
    camera=reviewCamera(pose,back),evidence=[];
  for(const id of ids){
    const fixture=fixtures.get(id);
    if(!fixture||!fixture.at)return{error:`missing-focus-fixture:${id}`};
    const dx=fixture.at[0]-cameraX,dz=fixture.at[2]-cameraZ,distance=Math.hypot(dx,dz),
      forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz),
      point=[fixture.at[0],sightY(fixture)-floor.elevation,fixture.at[2]];
    if(forward<=.35||lateral>forward*.58+.12||!reviewProject(camera,point).inside)
      return{error:`focus-outside-camera-frustum:${id}`};
    if(!reviewLineOfSight(scene,floor,camera.eye,point,id))return{error:`focus-occluded:${id}`};
    if(bodyVisible&&reviewBodyOccludes(camera.eye,point,pose.x,pose.z))
      return{error:`focus-occluded-by-evidence-body:${id}`};
    const parts=scene.props.filter(prop=>reviewPropBelongs(fixtures,prop.tag,id)&&prop.m&&prop.mesh!=='quad'),
      readable=new Set(['PF-SCREEN','PF-DIRECTORY','PF-ROOM-SIGN','PF-EXIT-SIGN','PF-CHALKBOARD','PF-WHITEBOARD'])
        .has(fixture.prefab),reviewFacing=fixture.reviewFacing||(prefabs.get(fixture.prefab)||{}).reviewFacing,
      facingSign=reviewFacing==='local-positive-z'?1:reviewFacing==='local-negative-z'?-1:0;
    let samples=0,visibleSamples=0,innerSamples=0,minNx=Infinity,maxNx=-Infinity,minNy=Infinity,maxNy=-Infinity;
    for(const prop of parts)for(const u of [-.5,0,.5])for(const v of [-.5,0,.5])for(const w of [-.5,0,.5]){
      samples++;const sample=reviewTransform(prop.m,u,v,w),projected=reviewProject(camera,sample);
      if(!projected.inside||!reviewLineOfSight(scene,floor,camera.eye,sample,id))continue;
      if(bodyVisible&&reviewBodyOccludes(camera.eye,sample,pose.x,pose.z))continue;visibleSamples++;
      minNx=Math.min(minNx,projected.nx);maxNx=Math.max(maxNx,projected.nx);
      minNy=Math.min(minNy,projected.ny);maxNy=Math.max(maxNy,projected.ny);
      if(Math.abs(projected.nx)<=.88&&Math.abs(projected.ny)<=.78)innerSamples++;
    }
    const projectedWidth=visibleSamples?maxNx-minNx:0,projectedHeight=visibleSamples?maxNy-minNy:0,
      projectedArea=projectedWidth*projectedHeight,toCamera=[cameraX-fixture.at[0],cameraZ-fixture.at[2]],
      planarDistance=Math.hypot(...toCamera)||1,faceOn=facingSign?Math.max(0,
        (toCamera[0]*facingSign*Math.sin(fixture.yaw||0)+
          toCamera[1]*facingSign*Math.cos(fixture.yaw||0))/planarDistance):1,
      minWidth=readable?.10:.055,minHeight=readable?.07:.055,minArea=readable?.015:.008,
      minVisiblePercent=readable?55:35,minInnerPercent=readable?35:20;
    if(faceOn<.50)return{error:`focus-back-facing:${id}:${faceOn.toFixed(3)}`};
    if(!parts.length||visibleSamples<3||visibleSamples*100<samples*minVisiblePercent||
      innerSamples<3||innerSamples*100<samples*minInnerPercent||
      projectedWidth<minWidth||projectedHeight<minHeight||projectedArea<minArea)
      return{error:`focus-render-cropped:${id}:${visibleSamples}/${samples}`};
    evidence.push({id,prefab:fixture.prefab,reviewFacing,forward:+forward.toFixed(2),lateral:+lateral.toFixed(2),visibleSamples,samples,innerSamples,
      projectedWidth:+projectedWidth.toFixed(3),projectedHeight:+projectedHeight.toFixed(3),
      projectedArea:+projectedArea.toFixed(3),faceOn:+faceOn.toFixed(3)});
  }
  return{evidence};
}
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
  const verticalEscapes=scene&&scene.props.filter(p=>{
    // Quads are mathematical planes whose unused unit axis is still present in the transform;
    // check volumetric meshes here and leave plane validity to the finite-transform gate.
    if(p.mesh==='quad')return false;
    if(!p.m)return true;
    const m=p.m,radius=.5*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]));
    return m[13]-radius<-.061||m[13]+radius>scene.H+.061;
  });
  check(`${name} rendered geometry stays between floor and ceiling`,verticalEscapes&&verticalEscapes.length===0,
    verticalEscapes&&verticalEscapes.slice(0,8).map(p=>p.tag||p.mesh).join(','));
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
  const campusDoorHotspots=scene&&scene.things.filter(t=>t.exit&&t.exit.place==='campus');
  check(`${name} visible campus exit door is usable at its threshold`,campusDoorHotspots&&campusDoorHotspots.every(t=>
    Math.hypot(t.pos[0]-t.focus[0],t.pos[2]-t.focus[1])<=1.55&&
    !scene.solids.some(s=>!s.open&&t.focus[0]>s.x0-.30&&t.focus[0]<s.x1+.30&&
      t.focus[1]>s.z0-.30&&t.focus[1]<s.z1+.30)),
    campusDoorHotspots&&campusDoorHotspots.map(t=>`${t.hz}:${Math.hypot(t.pos[0]-t.focus[0],t.pos[2]-t.focus[1]).toFixed(2)}m`).join(','));

  const b=plan.buildings.find(q=>q.id===scene.buildingId),f=scene.blueprintFloor;
  const programmeReview=f.visualReview&&f.visualReview.programme;
  if(programmeReview){
    authoredVisualReviewFloors.add(`${b.id}/F${f.level}`);
    const room=f.rooms.find(q=>q.id===programmeReview.roomId),pose=programmeReview.at||{},radius=.32,
      poseBlocker=scene.solids.find(s=>!s.open&&pose.x>s.x0-radius&&pose.x<s.x1+radius&&
        pose.z>s.z0-radius&&pose.z<s.z1+radius);
    if(!room)visualReviewDefects.push(`${b.id}/F${f.level}:missing-room:${programmeReview.roomId}`);
    else if(![pose.x,pose.z,pose.yaw].every(Number.isFinite))visualReviewDefects.push(`${b.id}/F${f.level}:non-finite-pose`);
    else if(!reviewInside(room.bounds,pose.x,pose.z,radius))visualReviewDefects.push(`${b.id}/F${f.level}:pose-outside-${room.id}`);
    else if(poseBlocker)
      visualReviewDefects.push(`${b.id}/F${f.level}:pose-body-blocked:${poseBlocker.fixtureId||'architectural-solid'}`);
    else {
      const walk=cachedWalkMap(scene,b);
      if(!walkReaches(scene,walk,pose.x,pose.z))
        visualReviewDefects.push(`${b.id}/F${f.level}:pose-path-blocked-${room.id}`);
      const back=reviewBack(scene,f,room.bounds,pose),front=reviewFront(scene,f,room.bounds,pose);
      if(!back)visualReviewDefects.push(`${b.id}/F${f.level}:rear-camera-blocked`);
      else if(back<REVIEW_BACK_MIN)visualReviewDefects.push(`${b.id}/F${f.level}:camera-back-${back.toFixed(2)}m`);
      if(front<REVIEW_FRONT_MIN)visualReviewDefects.push(`${b.id}/F${f.level}:front-depth-${front.toFixed(2)}m`);
      if(back){
        const focus=reviewFocusEvidence(scene,f,pose,back,programmeReview.focusFixtureIds,2),door=reviewForegroundDoor(scene,f,pose,back),
          intrusion=reviewCameraFixtureIntrusion(scene,f,pose,back);
        if(focus.error)visualReviewDefects.push(`${b.id}/F${f.level}:${focus.error}`);
        if(door)visualReviewDefects.push(`${b.id}/F${f.level}:foreground-door-leaf:${door.id}`);
        if(intrusion)visualReviewDefects.push(`${b.id}/F${f.level}:camera-near-fixture:${intrusion.id}`);
      }
    }
  }
  const entryReview=f.visualReview&&f.visualReview.entry;
  if(entryReview){
    authoredEntryReviewFloors.add(`${b.id}/F${f.level}`);
    if(entryReview.body==='evidence')bodyEvidenceRows.add(`${b.id}/F${f.level}/entry`);
    if(entryReview.body!==undefined&&entryReview.body!=='hidden'&&entryReview.body!=='evidence')
      entryReviewDefects.push(`${b.id}/F${f.level}:invalid-entry-body-policy`);
    const zones=[...(f.circulation||[]),...f.rooms],zone=zones.find(q=>q.id===entryReview.zoneId),pose=entryReview.at||{},radius=.32;
    if(!zone)entryReviewDefects.push(`${b.id}/F${f.level}:missing-entry-zone:${entryReview.zoneId}`);
    else if(![pose.x,pose.z,pose.yaw].every(Number.isFinite))entryReviewDefects.push(`${b.id}/F${f.level}:non-finite-entry-pose`);
    else if(!reviewInside(zone.bounds,pose.x,pose.z,radius))entryReviewDefects.push(`${b.id}/F${f.level}:entry-pose-outside-${zone.id}`);
    else if(scene.solids.some(s=>!s.open&&pose.x>s.x0-radius&&pose.x<s.x1+radius&&pose.z>s.z0-radius&&pose.z<s.z1+radius))
      entryReviewDefects.push(`${b.id}/F${f.level}:entry-pose-body-blocked`);
    else {
      // The chosen arrival may be a connected public room beyond a corridor or open pocket
      // threshold. Prove it with the real clampMove flood rather than requiring the entire route
      // from the floor spawn to lie inside the destination zone or along one straight segment.
      const walk=cachedWalkMap(scene,b),arrivalReachable=walkReaches(scene,walk,pose.x,pose.z);
      if(!arrivalReachable)entryReviewDefects.push(`${b.id}/F${f.level}:entry-path-blocked-${zone.id}`);
      const back=reviewBack(scene,f,zone.bounds,pose),front=reviewFront(scene,f,zone.bounds,pose);
      if(!back)entryReviewDefects.push(`${b.id}/F${f.level}:entry-rear-camera-blocked`);
      else if(back<REVIEW_BACK_MIN)entryReviewDefects.push(`${b.id}/F${f.level}:entry-camera-back-${back.toFixed(2)}m`);
      if(front<REVIEW_FRONT_MIN)entryReviewDefects.push(`${b.id}/F${f.level}:entry-front-depth-${front.toFixed(2)}m`);
      if(back){
        const focus=reviewFocusEvidence(scene,f,pose,back,entryReview.focusFixtureIds,1,entryReview.body==='evidence'),
          door=reviewForegroundDoor(scene,f,pose,back),intrusion=reviewCameraFixtureIntrusion(scene,f,pose,back);
        if(focus.error)entryReviewDefects.push(`${b.id}/F${f.level}:entry-${focus.error}`);
        if(door)entryReviewDefects.push(`${b.id}/F${f.level}:entry-foreground-door-leaf:${door.id}`);
        if(intrusion)entryReviewDefects.push(`${b.id}/F${f.level}:entry-camera-near-fixture:${intrusion.id}`);
      }
    }
  }
  const groundEntries=f.visualReview&&f.visualReview.entries;
  if(groundEntries!==undefined){
    if(f.level!==1||!Array.isArray(groundEntries)||!groundEntries.length)
      entryReviewDefects.push(`${b.id}/F${f.level}:invalid-ground-entry-list`);
    else for(const entry of groundEntries){
      const key=`${b.id}/F${f.level}/${entry&&entry.suffix}`,portal=entry&&b.portals.find(q=>q.id===entry.portalId),
        zones=[...(f.circulation||[]),...f.rooms],focusRoom=entry&&f.rooms.find(q=>q.id===entry.focusRoomId),
        cameraZone=entry&&zones.find(q=>q.id===entry.cameraZoneId),pose=entry&&entry.focusAt||{},radius=.32;
      if(authoredGroundEntryReviews.has(key))entryReviewDefects.push(`${key}:duplicate-ground-entry-review`);
      else authoredGroundEntryReviews.add(key);
      if(!entry||!['entry','clinic-entry'].includes(entry.suffix))entryReviewDefects.push(`${key}:invalid-ground-entry-suffix`);
      if(!portal||!portal.localSpawn)entryReviewDefects.push(`${key}:missing-ground-entry-portal:${entry&&entry.portalId}`);
      if(!focusRoom)entryReviewDefects.push(`${key}:missing-ground-focus-room:${entry&&entry.focusRoomId}`);
      if(!cameraZone)entryReviewDefects.push(`${key}:missing-ground-camera-zone:${entry&&entry.cameraZoneId}`);
      if(entry&&entry.body!=='hidden')entryReviewDefects.push(`${key}:ground-entry-body-must-be-hidden`);
      if(!focusRoom||!cameraZone)continue;
      if(![pose.x,pose.z,pose.yaw].every(Number.isFinite))entryReviewDefects.push(`${key}:non-finite-ground-entry-pose`);
      else if(!reviewInside(focusRoom.bounds,pose.x,pose.z,radius))
        entryReviewDefects.push(`${key}:ground-focus-outside-${focusRoom.id}`);
      else if(scene.solids.some(s=>!s.open&&pose.x>s.x0-radius&&pose.x<s.x1+radius&&pose.z>s.z0-radius&&pose.z<s.z1+radius))
        entryReviewDefects.push(`${key}:ground-focus-body-blocked`);
      else {
        const walk=cachedWalkMap(scene,b);
        if(!walkReaches(scene,walk,portal.localSpawn[0],portal.localSpawn[2],.32))
          entryReviewDefects.push(`${key}:ground-portal-spawn-path-blocked-${portal.id}`);
        if(!walkReaches(scene,walk,pose.x,pose.z))
          entryReviewDefects.push(`${key}:ground-focus-path-blocked-${focusRoom.id}`);
        const back=reviewBack(scene,f,cameraZone.bounds,pose),front=reviewFront(scene,f,focusRoom.bounds,pose);
        if(!back)entryReviewDefects.push(`${key}:ground-rear-camera-blocked-${cameraZone.id}`);
        else if(back<REVIEW_BACK_MIN)entryReviewDefects.push(`${key}:ground-camera-back-${back.toFixed(2)}m`);
        if(front<REVIEW_FRONT_MIN)entryReviewDefects.push(`${key}:ground-front-depth-${front.toFixed(2)}m`);
        if(back){
          const focus=reviewFocusEvidence(scene,f,pose,back,entry.focusFixtureIds,1),door=reviewForegroundDoor(scene,f,pose,back),
            intrusion=reviewCameraFixtureIntrusion(scene,f,pose,back);
          if(focus.error)entryReviewDefects.push(`${key}:ground-${focus.error}`);
          if(door)entryReviewDefects.push(`${key}:ground-foreground-door-leaf:${door.id}`);
          if(intrusion)entryReviewDefects.push(`${key}:ground-camera-near-fixture:${intrusion.id}`);
        }
      }
    }
  }
  const authoredCompositions=[];
  if(programmeReview&&programmeReview.at)authoredCompositions.push({suffix:'programme',pose:programmeReview.at});
  if(entryReview&&entryReview.at)authoredCompositions.push({suffix:'entry',pose:entryReview.at});
  if(Array.isArray(groundEntries))for(const entry of groundEntries)if(entry&&entry.focusAt)
    authoredCompositions.push({suffix:entry.suffix,pose:entry.focusAt});
  for(let i=0;i<authoredCompositions.length;i++)for(let j=i+1;j<authoredCompositions.length;j++){
    const a=authoredCompositions[i],brow=authoredCompositions[j],pa=a.pose,pb=brow.pose,
      distance=Math.hypot(pa.x-pb.x,pa.z-pb.z),
      yawDelta=Math.abs(Math.atan2(Math.sin(pa.yaw-pb.yaw),Math.cos(pa.yaw-pb.yaw)));
    if(distance<.75&&yawDelta<.20)
      compositionDefects.push(`${b.id}/F${f.level}:${a.suffix}-${brow.suffix}-same-pose`);
  }
  const fixtureRows=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects);
  const walkBlockerDefects=walkBlockerContractDefects(fixtureRows,scene.solids);
  check(`${name} authored walk blockers map one-to-one to tagged runtime solids`,walkBlockerDefects.length===0,
    walkBlockerDefects.slice(0,8).join(','));
  const textGlyphDefects=[],fixtureNeedsText=fixture=>
    !!fixture.text||fixture.prefab==='PF-SCREEN'&&!/daylight|window|outlook/i.test(`${fixture.label||''} ${fixture.purpose||''}`);
  for(const fixture of fixtureRows.filter(o=>fixtureNeedsText(o)&&
    ['PF-SCREEN','PF-DIRECTORY','PF-ROOM-SIGN','PF-EXIT-SIGN'].includes(o.prefab))){
    const glyphRows=scene.props.filter(p=>p.mesh==='quad'&&p.tag===fixture.id&&p.ch);
    if(!glyphRows.length){textGlyphDefects.push(`${fixture.id}:missing`);continue;}
    const minSize=Math.min(...glyphRows.map(p=>Math.hypot(p.m[0],p.m[1],p.m[2]))),
      han=glyphRows.filter(p=>/[\u3400-\u9fff]/u.test(p.ch)),
      latin=glyphRows.filter(p=>/[A-Za-z0-9]/.test(p.ch)),yaw=fixture.yaw||0,
      axis=[Math.cos(yaw),-Math.sin(yaw)],faceRatio=fixture.prefab==='PF-DIRECTORY'?.84:
        fixture.prefab==='PF-SCREEN'?1:.90,halfWidth=fixture.size[0]*faceRatio/2;
    if(minSize<.072)textGlyphDefects.push(`${fixture.id}:size-${minSize.toFixed(3)}`);
    if(han.some(p=>p.glyphPrimary!==true))textGlyphDefects.push(`${fixture.id}:unstable-han`);
    if(latin.some(p=>{const size=Math.hypot(p.m[0],p.m[1],p.m[2]);return p.glyphProportional!==true||
      !Number.isFinite(p.glyphAdvance)||p.glyphAdvance>size*.70;}))
      textGlyphDefects.push(`${fixture.id}:full-width-latin`);
    for(const glyph of glyphRows){
      const rel=[glyph.m[12]-fixture.at[0],glyph.m[14]-fixture.at[2]],centre=rel[0]*axis[0]+rel[1]*axis[1],
        radius=.5*(Math.abs(glyph.m[0]*axis[0]+glyph.m[2]*axis[1])+
          Math.abs(glyph.m[4]*axis[0]+glyph.m[6]*axis[1])+
          Math.abs(glyph.m[8]*axis[0]+glyph.m[10]*axis[1]));
      if(Math.abs(centre)+radius>halfWidth+.002){textGlyphDefects.push(`${fixture.id}:horizontal-overflow`);break;}
    }
  }
  check(`${name} authored screen and sign text stays legible and distance-stable`,textGlyphDefects.length===0,
    textGlyphDefects.slice(0,8).join(','));
  const directoryGlyphDefects=[];
  for(const fixture of fixtureRows.filter(o=>o.prefab==='PF-DIRECTORY'&&o.text)){
    const yaw=fixture.yaw||0,v=[Math.sin(yaw),Math.cos(yaw)],front=-(fixture.size[2]*.55+.035/2),
      glyphRows=scene.props.filter(p=>p.mesh==='quad'&&p.tag===fixture.id&&p.ch);
    if(!glyphRows.length)directoryGlyphDefects.push(`${fixture.id}:missing`);
    else for(const glyph of glyphRows){const rel=[glyph.m[12]-fixture.at[0],glyph.m[14]-fixture.at[2]],localZ=rel[0]*v[0]+rel[1]*v[1];
      if(localZ>front-.004)directoryGlyphDefects.push(`${fixture.id}:${localZ.toFixed(3)}/${front.toFixed(3)}`);}
  }
  check(`${name} directory glyphs sit in front of their display glass`,directoryGlyphDefects.length===0,
    directoryGlyphDefects.slice(0,8).join(','));
  const materialDiversity=new Set(fixtureRows.map(o=>o.material)).size;
  check(`${name} uses a coherent multi-material palette`,materialDiversity>=10,materialDiversity);
  const authoredRoomLights=fixtureRows.filter(o=>o.prefab==='PF-CEILING-LIGHT'||o.prefab==='PF-PENDANT').length;
  check(`${name} instantiates every authored room luminaire`,scene.lights.length===authoredRoomLights,
    `${scene.lights.length}/${authoredRoomLights}`);
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
  if(b.id==='B07'&&f.level===3){
    const manikin=fixtureRows.find(o=>o.id==='B07/F3/HEALTH/DEMO'),
      manikinParts=scene.props.filter(p=>p.tag===manikin?.id&&p.mesh!=='quad'),
      manikinBodies=fixtureBodies.filter(s=>s.fixtureId===manikin?.id),
      manikinOutside=manikin&&manikinParts.filter(p=>renderedPartOutsideFixture(p,manikin));
    check('B07 health-training manikin is a contained multipart couch variant',
      !!manikin&&manikin.prefab==='PF-EXAM-COUCH'&&manikin.trainingManikin===true&&
      manikin.size.join(',')==='1.75,0.78,0.68'&&manikinParts.length>=17&&
      manikinParts.filter(p=>p.mesh==='ball').length>=3&&manikinBodies.length===1&&manikinOutside.length===0,
      `parts=${manikinParts.length} bodies=${manikinBodies.length} footprintEscapes=${manikinOutside&&manikinOutside.length}`);
  }
  const singlePrimitive=fixtureRows.filter(o=>(partCounts.get(o.id)||0)<2);
  check(`${name} has no single-primitive fixtures or architectural layers`,singlePrimitive.length===0,
    singlePrimitive.slice(0,8).map(o=>`${o.id}:${o.prefab}:${partCounts.get(o.id)||0}`).join(','));
  const underDetailed=fixtureRows.filter(o=>minimumDetailedParts.has(o.prefab)&&
    (partCounts.get(o.id)||0)<minimumDetailedParts.get(o.prefab));
  check(`${name} sanitary and safety prefabs retain detailed compositions`,underDetailed.length===0,
    underDetailed.slice(0,8).map(o=>`${o.id}:${partCounts.get(o.id)||0}/${minimumDetailedParts.get(o.prefab)}`).join(','));
  const [x0,x1,z0,z1]=b.localBounds;
  check(`${name} spawn inside floor envelope`,scene.spawn.x>=x0&&scene.spawn.x<=x1&&scene.spawn.z>=z0&&scene.spawn.z<=z1,JSON.stringify(scene.spawn));
  const blocked=scene.solids.some(s=>!s.open&&scene.spawn.x>s.x0-.20&&scene.spawn.x<s.x1+.20&&scene.spawn.z>s.z0-.20&&scene.spawn.z<s.z1+.20);
  check(`${name} spawn has body clearance`,!blocked,JSON.stringify(scene.spawn));
  const walk=cachedWalkMap(scene,b);
  const unreachable=f.rooms.filter(room=>!walk.rooms.includes(room));
  check(`${name} rooms connect to the spawn`,unreachable.length===0,unreachable.map(r=>r.id).join(','));
  const unreachableThings=scene.things.filter(t=>!walk.points.some(([x,z])=>Math.hypot(x-t.focus[0],z-t.focus[1])<=(t.reach||1.5)));
  check(`${name} interactions have a reachable approach`,unreachableThings.length===0,unreachableThings.map(t=>t.hz).join(','));
}

const b03Plan=plan.buildings.find(building=>building.id==='B03'),b03Dining=b03Plan&&
  b03Plan.floorsPlan[0].rooms.find(room=>room.id==='B03/F1/DINING'),b03Contents=b03Dining?.contents||[],
  b03Tables=b03Contents.filter(fixture=>/^B03\/F1\/DINING\/T\d+\/TABLE$/.test(fixture.id)).length,
  b03FixedSeats=b03Contents.filter(fixture=>fixture.prefab==='PF-CHAIR'&&
    fixture.id.startsWith('B03/F1/DINING/T')).length,
  b03WheelchairPlaces=b03Contents.filter(fixture=>fixture.accessible===true&&
    fixture.id.endsWith('/WHEELCHAIR')).length,b03Seating=b03Plan?.operationalClearances?.seating;
check('B03 authored dining capacity matches its rendered fixed and wheelchair places',
  b03Tables===8&&b03FixedSeats===27&&b03WheelchairPlaces===3&&
  b03Dining?.capacity===b03FixedSeats+b03WheelchairPlaces&&b03Dining.fixedSeats===b03FixedSeats&&
  b03Dining.wheelchairPlaces===b03WheelchairPlaces&&b03Seating?.tables===b03Tables&&
  b03Seating.fixedChairs===b03FixedSeats&&b03Seating.wheelchairPlaces===b03WheelchairPlaces&&
  b03Seating.totalPlaces===b03FixedSeats+b03WheelchairPlaces,
  `tables=${b03Tables} chairs=${b03FixedSeats} wheelchair=${b03WheelchairPlaces} `+
  `room=${b03Dining?.capacity}/${b03Dining?.fixedSeats}/${b03Dining?.wheelchairPlaces} `+
  `plan=${b03Seating?.totalPlaces}/${b03Seating?.fixedChairs}/${b03Seating?.wheelchairPlaces}`);

const b04Plan=plan.buildings.find(building=>building.id==='B04'),b04Ground=b04Plan?.floorsPlan
  .find(floor=>floor.level===1),b04Accessible=b04Ground?.rooms.find(room=>room.id==='B04/F1/A01'),
  b04AccessibleContents=b04Accessible?.contents||[],b04AccessibleById=new Map(b04AccessibleContents.map(o=>[o.id,o])),
  b04RequiredClearFields=[
    ['B04/F1/A01/TURN',[1.50,.02,1.50]],['B04/F1/A01/BED-TRANSFER',[2.0,.02,.90]],
    ['B04/F1/A01/DESK-APPROACH',[1.25,.02,.90]],['B04/F1/A01/WARD-APPROACH',[.90,.02,1.0]],
    ['B04/F1/A01/ACCESS-ROUTE',[1.16,.018,.90]],
  ],reviewHorizontalBounds=fixture=>{const w=fixture.size[0],d=fixture.size[2],c=Math.abs(Math.cos(fixture.yaw||0)),
    s=Math.abs(Math.sin(fixture.yaw||0)),hx=(c*w+s*d)/2,hz=(s*w+c*d)/2;
    return[fixture.at[0]-hx,fixture.at[0]+hx,fixture.at[2]-hz,fixture.at[2]+hz];},
  reviewRectOverlap=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>.01&&
    Math.min(a[3],b[3])-Math.max(a[2],b[2])>.01,
  b04ClearFixtures=b04RequiredClearFields.map(([id])=>b04AccessibleById.get(id)),
  b04PhysicalFixtures=b04AccessibleContents.filter(fixture=>fixture.collision!=='none'&&fixture.size[1]>.20&&
    prefabSpecs.get(fixture.prefab)?.anchor==='floor'),b04ClearFieldDefects=[];
for(const clearFixture of b04ClearFixtures){
  if(!clearFixture)continue;const bounds=reviewHorizontalBounds(clearFixture),roomBounds=b04Accessible?.bounds||[];
  if(bounds[0]<roomBounds[0]-.001||bounds[1]>roomBounds[1]+.001||bounds[2]<roomBounds[2]-.001||
    bounds[3]>roomBounds[3]+.001)b04ClearFieldDefects.push(`${clearFixture.id}:outside-room`);
  for(const physical of b04PhysicalFixtures)if(reviewRectOverlap(bounds,reviewHorizontalBounds(physical)))
    b04ClearFieldDefects.push(`${clearFixture.id}:${physical.id}`);
}
const b04AccessibleScene=scenes.map(([,scene])=>scene).find(scene=>scene.buildingId==='B04'&&scene.blueprintFloor.level===1),
  b04AccessibleWalk=b04AccessibleScene&&cachedWalkMap(b04AccessibleScene,b04Plan),
  b04ClearFieldsReachable=!!b04AccessibleWalk&&b04ClearFixtures.every(fixture=>fixture&&
    walkReaches(b04AccessibleScene,b04AccessibleWalk,fixture.at[0],fixture.at[2],.24)),
  b04Turn=b04AccessibleById.get('B04/F1/A01/TURN'),b04Transfer=b04AccessibleById.get('B04/F1/A01/BED-TRANSFER'),
  b04DeskApproach=b04AccessibleById.get('B04/F1/A01/DESK-APPROACH'),
  b04WardApproach=b04AccessibleById.get('B04/F1/A01/WARD-APPROACH'),b04Route=b04AccessibleById.get('B04/F1/A01/ACCESS-ROUTE'),
  b04Beds=b04AccessibleContents.filter(fixture=>fixture.prefab==='PF-BED'),
  b04Desks=b04AccessibleContents.filter(fixture=>fixture.id==='B04/F1/A01/DESK1'&&fixture.prefab==='PF-MEETING-TABLE'),
  b04Wards=b04AccessibleContents.filter(fixture=>fixture.prefab==='PF-WARDROBE');
check('B04 accessible residence is a genuine single room with protected turning, transfer and approach clearances',
  b04Accessible?.accessible===true&&b04Accessible.beds===1&&b04Beds.length===1&&b04Desks.length===1&&b04Wards.length===1&&
  b04Accessible.doors.length===1&&b04Accessible.doors[0].width>=1.0&&
  b04RequiredClearFields.every(([id,size])=>{const fixture=b04AccessibleById.get(id);return fixture&&
    fixture.collision==='none'&&fixture.accessible===true&&fixture.size.every((value,index)=>Math.abs(value-size[index])<.001);})&&
  b04Turn?.turningDiameter===1.50&&b04Transfer?.clearWidth===.90&&b04Transfer?.clearBay?.join(',')==='2,0.9'&&
  b04DeskApproach?.clearBay?.join(',')==='1.25,0.9'&&b04WardApproach?.clearBay?.join(',')==='0.9,1'&&
  b04Route?.clearWidth===.90&&b04Accessible.planning?.publicRoutes?.length===1&&
  b04Accessible.planning.publicRoutes[0].id===b04Route.id&&b04Accessible.planning.publicRoutes[0].width===.90&&
  b04Accessible.planning.publicRoutes[0].bounds.join(',')==='-2.5,-1.34,-6.2,-5.3'&&
  b04Accessible.planning?.turns?.length===1&&b04Accessible.planning.turns[0].id===b04Turn.id&&
  b04Accessible.planning.turns[0].centre.join(',')==='-2.6,-4.95'&&b04Accessible.planning.turns[0].diameter===1.50&&
  b04Accessible.planning?.bedTransfers?.length===1&&b04Accessible.planning.bedTransfers[0].id===b04Transfer.id&&
  b04Accessible.planning.bedTransfers[0].fixtureId===b04Beds[0]?.id&&
  b04Accessible.planning.bedTransfers[0].bounds.join(',')==='-5.9,-3.9,-6.27,-5.37'&&
  b04Accessible.planning.bedTransfers[0].width===.90&&b04Accessible.planning.bedTransfers[0].depth===2.0&&
  b04Accessible.planning?.deskApproaches?.[0]?.id===b04DeskApproach.id&&
  b04Accessible.planning.deskApproaches[0].fixtureId===b04Desks[0]?.id&&
  b04Accessible.planning.deskApproaches[0].bounds.join(',')==='-2.675,-1.425,-6.74,-5.84'&&
  b04Accessible.planning?.wardrobeApproaches?.[0]?.id===b04WardApproach.id&&
  b04Accessible.planning.wardrobeApproaches[0].fixtureId===b04Wards[0]?.id&&
  b04Accessible.planning.wardrobeApproaches[0].bounds.join(',')==='-5.15,-4.25,-5.1,-4.1'&&
  b04ClearFieldDefects.length===0&&b04ClearFieldsReachable,
  `beds=${b04Beds.length} desks=${b04Desks.length} wards=${b04Wards.length} `+
  `clear=${b04ClearFixtures.filter(Boolean).length}/${b04RequiredClearFields.length} `+
  `reachable=${b04ClearFieldsReachable} defects=${b04ClearFieldDefects.join('|')||'-'}`);
const b04AccessibleWash=b04Ground?.rooms.find(room=>room.id==='B04/F1/WASH'),
  b04WashContents=b04AccessibleWash?.contents||[],b04WashById=new Map(b04WashContents.map(o=>[o.id,o])),
  b04WashClearIds=['B04/F1/WASH/TURN','B04/F1/WASH/ACCESS-ROUTE','B04/F1/WASH/T-TRANSFER','B04/F1/WASH/SHOWER-APPROACH'],
  b04WashClearFixtures=b04WashClearIds.map(id=>b04WashById.get(id)),
  b04WashPhysical=b04WashContents.filter(fixture=>fixture.collision!=='none'&&fixture.size[1]>.20&&
    prefabSpecs.get(fixture.prefab)?.anchor==='floor'),b04WashClearDefects=[];
for(const clearFixture of b04WashClearFixtures){
  if(!clearFixture)continue;const bounds=reviewHorizontalBounds(clearFixture),roomBounds=b04AccessibleWash?.bounds||[];
  if(bounds[0]<roomBounds[0]-.001||bounds[1]>roomBounds[1]+.001||bounds[2]<roomBounds[2]-.001||
    bounds[3]>roomBounds[3]+.001)b04WashClearDefects.push(`${clearFixture.id}:outside-room`);
  for(const physical of b04WashPhysical)if(reviewRectOverlap(bounds,reviewHorizontalBounds(physical)))
    b04WashClearDefects.push(`${clearFixture.id}:${physical.id}`);
}
const b04WashTurn=b04WashById.get('B04/F1/WASH/TURN'),b04WashRoute=b04WashById.get('B04/F1/WASH/ACCESS-ROUTE'),
  b04WashTransfer=b04WashById.get('B04/F1/WASH/T-TRANSFER'),
  b04ShowerApproach=b04WashById.get('B04/F1/WASH/SHOWER-APPROACH'),
  b04AccessibleToilet=b04WashById.get('B04/F1/WASH/T-ACCESS'),
  b04RollInShower=b04WashById.get('B04/F1/WASH/SHOWER-ROLLIN'),
  b04WashClearReachable=!!b04AccessibleWalk&&b04WashClearFixtures.every(fixture=>fixture&&
    walkReaches(b04AccessibleScene,b04AccessibleWalk,fixture.at[0],fixture.at[2],.24)),
  b04RollInParts=b04AccessibleScene?.props.filter(prop=>prop.tag===b04RollInShower?.id&&prop.mesh!=='quad').length||0;
check('B04 accessible resident route reaches a protected toilet transfer and visibly equipped roll-in shower',
  b04AccessibleWash?.accessible===true&&b04AccessibleWash.doors.length===1&&b04AccessibleWash.doors[0].width>=1.0&&
  b04WashTurn?.turningDiameter===1.50&&b04WashTurn.size.join(',')==='1.5,0.02,1.5'&&
  b04WashRoute?.clearWidth===.90&&b04WashRoute.size[2]>=.90&&
  b04WashTransfer?.clearBay?.join(',')==='1.2,0.9'&&b04ShowerApproach?.clearBay?.join(',')==='1.2,1'&&
  b04AccessibleToilet?.prefab==='PF-TOILET'&&b04AccessibleToilet.accessible===true&&b04AccessibleToilet.grabRails===true&&
  b04RollInShower?.prefab==='PF-SHOWER'&&b04RollInShower.accessible===true&&b04RollInShower.rollIn===true&&
  b04RollInShower.foldingSeat===true&&b04RollInShower.grabRails===true&&b04RollInParts>=13&&
  b04AccessibleWash.planning?.publicRoutes?.[0]?.id===b04WashRoute.id&&
  b04AccessibleWash.planning.publicRoutes[0].bounds.join(',')==='1.2,2.36,4.55,5.45'&&
  b04AccessibleWash.planning?.turns?.[0]?.id===b04WashTurn.id&&
  b04AccessibleWash.planning.turns[0].diameter===1.50&&
  b04AccessibleWash.planning?.toiletTransfers?.[0]?.id===b04WashTransfer.id&&
  b04AccessibleWash.planning.toiletTransfers[0].fixtureId===b04AccessibleToilet.id&&
  b04AccessibleWash.planning.toiletTransfers[0].bounds.join(',')==='3.65,4.85,6.5,7.4'&&
  b04AccessibleWash.planning?.showerApproaches?.[0]?.id===b04ShowerApproach.id&&
  b04AccessibleWash.planning.showerApproaches[0].fixtureId===b04RollInShower.id&&
  b04AccessibleWash.planning.showerApproaches[0].bounds.join(',')==='3.6,4.8,4.6,5.6'&&
  b04WashClearDefects.length===0&&b04WashClearReachable,
  `clear=${b04WashClearFixtures.filter(Boolean).length}/${b04WashClearIds.length} `+
  `reachable=${b04WashClearReachable} rollInParts=${b04RollInParts} defects=${b04WashClearDefects.join('|')||'-'}`);

const b01Plan=plan.buildings.find(building=>building.id==='B01'),b01AccessDefects=[];
for(const floor of b01Plan?.floorsPlan||[]){
  const prefix=`B01/F${floor.level}/LIFT-E`,room=floor.rooms.find(candidate=>candidate.id===prefix),
    contents=room?.contents||[],byId=new Map(contents.map(fixture=>[fixture.id,fixture])),
    clearIds=[`${prefix}/TURN`,`${prefix}/LIFT-APPROACH`,`${prefix}/T-TRANSFER`,`${prefix}/B-APPROACH`],
    clearFixtures=clearIds.map(id=>byId.get(id)),physical=contents.filter(fixture=>(fixture.collision!=='none'||fixture.walkBlocker===true)&&
      fixture.size[1]>.20&&prefabSpecs.get(fixture.prefab)?.anchor==='floor'),
    scene=scenes.map(([,candidate])=>candidate).find(candidate=>candidate.buildingId==='B01'&&
      candidate.blueprintFloor.level===floor.level),walk=scene&&cachedWalkMap(scene,b01Plan),planning=room?.planning,
    turn=byId.get(`${prefix}/TURN`),liftApproach=byId.get(`${prefix}/LIFT-APPROACH`),
    transfer=byId.get(`${prefix}/T-TRANSFER`),basinApproach=byId.get(`${prefix}/B-APPROACH`),
    lift=byId.get(`${prefix}/LIFT`),toilet=byId.get(`${prefix}/T`),basin=byId.get(`${prefix}/B`),
    partition=byId.get(`${prefix}/WC-PARTITION`),partitionBounds=partition&&reviewHorizontalBounds(partition);
  if(room?.accessible!==true||turn?.turningDiameter!==1.50||turn?.size.join(',')!=='1.5,0.02,1.5'||
    liftApproach?.clearWidth!==.90||transfer?.clearBay?.join(',')!=='1.2,0.9'||
    basinApproach?.clearBay?.join(',')!=='0.9,0.9'||lift?.accessible!==true||toilet?.accessible!==true||
    toilet.grabRails!==true||basin?.accessible!==true||partition?.walkBlocker!==true||
    partition?.openingWidth!==1.50||!partitionBounds||Math.abs(partitionBounds[0]-14.40)>.001||
    Math.abs(partitionBounds[1]-15.50)>.001||Math.abs(partitionBounds[2]-2.24)>.001||
    Math.abs(partitionBounds[3]-2.32)>.001||partitionBounds[0]-room.bounds[0]<1.50||
    planning?.turns?.[0]?.id!==turn.id||
    planning.turns[0].diameter!==1.50||planning?.liftApproaches?.[0]?.fixtureId!==lift.id||
    planning.liftApproaches[0].bounds.join(',')!=='12.8,14.3,2.92,3.32'||
    planning?.toiletTransfers?.[0]?.fixtureId!==toilet.id||
    planning.toiletTransfers[0].bounds.join(',')!=='13.3,14.5,1.02,1.92'||
    planning?.basinApproaches?.[0]?.fixtureId!==basin.id||
    planning.basinApproaches[0].bounds.join(',')!=='13.3,14.2,1.02,1.92')
    b01AccessDefects.push(`${prefix}:metadata`);
  for(const clearFixture of clearFixtures){
    if(!clearFixture){b01AccessDefects.push(`${prefix}:missing-clear-field`);continue;}
    const bounds=reviewHorizontalBounds(clearFixture),roomBounds=room.bounds;
    if(bounds[0]<roomBounds[0]-.001||bounds[1]>roomBounds[1]+.001||bounds[2]<roomBounds[2]-.001||
      bounds[3]>roomBounds[3]+.001)b01AccessDefects.push(`${clearFixture.id}:outside-room`);
    for(const fixture of physical)if(reviewRectOverlap(bounds,reviewHorizontalBounds(fixture)))
      b01AccessDefects.push(`${clearFixture.id}:${fixture.id}`);
    if(!walk||!walkReaches(scene,walk,clearFixture.at[0],clearFixture.at[2],.24))
      b01AccessDefects.push(`${clearFixture.id}:unreachable`);
  }
}
check('all five B01 accessible lift/WC suites protect a real turn, toilet transfer, basin and lift approach',
  b01Plan?.floorsPlan.length===5&&b01AccessDefects.length===0,b01AccessDefects.slice(0,12).join(','));

const sceneForFloor=(buildingId,level)=>scenes.map(([,scene])=>scene).find(scene=>
    scene.buildingId===buildingId&&scene.blueprintFloor.level===level),
  accessibleSurfaceDefects=[],accessNear=(a,b,tolerance=1e-5)=>Number.isFinite(a)&&Math.abs(a-b)<=tolerance,
  accessSurfacePrefabs=new Set(['PF-MEETING-TABLE','PF-READING-TABLE','PF-COMPUTER-DESK',
    'PF-LANGUAGE-DESK','PF-OFFICE-DESK','PF-DORM-DESK','PF-SERVICE-COUNTER','PF-CIRC-DESK',
    'PF-PHARMACY','PF-CASHIER','PF-SIDE-TABLE','PF-BASIN','PF-LIFT']),
  accessWorkstations=new Set(['PF-COMPUTER-DESK','PF-LANGUAGE-DESK','PF-OFFICE-DESK','PF-DORM-DESK']),
  accessCounters=new Set(['PF-SERVICE-COUNTER','PF-CIRC-DESK','PF-PHARMACY','PF-CASHIER']),
  accessPropGeometry=(prop,fixture,floor)=>{
    const m=prop?.m,c=Math.cos(fixture.yaw||0),s=Math.sin(fixture.yaw||0),
      wx=m?.[12]-fixture.at[0],wz=m?.[14]-fixture.at[2];
    return m&&m.length>=15?[
      c*wx-s*wz,m[13]-(fixture.at[1]-floor.elevation),s*wx+c*wz,
      Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])]:[];
  },
  accessPropMatches=(prop,fixture,floor,expected)=>{
    const actual=accessPropGeometry(prop,fixture,floor);
    return actual.length===expected.length&&actual.every((value,index)=>accessNear(value,expected[index]));
  },
  accessExactProps=(props,fixture,floor,tag,expected)=>{
    const remaining=props.filter(prop=>prop.tag===`${fixture.id}/${tag}`);
    if(remaining.length!==expected.length)return false;
    for(const geometry of expected){const index=remaining.findIndex(prop=>accessPropMatches(prop,fixture,floor,geometry));
      if(index<0)return false;remaining.splice(index,1);}
    return remaining.length===0;
  },
  accessExpectedBounds=(fixture,dx,dz,w,d)=>{
    const c=Math.abs(Math.cos(fixture.yaw||0)),s=Math.abs(Math.sin(fixture.yaw||0)),
      yaw=Math.sin(fixture.yaw||0),cos=Math.cos(fixture.yaw||0),x=fixture.at[0]+cos*dx+yaw*dz,
      z=fixture.at[2]-yaw*dx+cos*dz,hx=(c*w+s*d)/2,hz=(s*w+c*d)/2;
    return[x-hx,x+hx,z-hz,z+hz];
  },
  accessSolidMatches=(solid,fixture,spec)=>{
    const [kind,dx,dz,w,d,meta={}]=spec,expected=accessExpectedBounds(fixture,dx,dz,w,d),
      actual=[solid?.x0,solid?.x1,solid?.z0,solid?.z1];
    return solid?.fixtureId===fixture.id&&solid.accessibleSurface===true&&solid.collisionKind===kind&&
      actual.every((value,index)=>accessNear(value,expected[index]))&&
      Object.entries(meta).every(([key,value])=>typeof value==='number'?
        accessNear(solid[key],value):solid[key]===value);
  },
  accessExactSolids=(solids,fixture,expected)=>{
    const remaining=[...solids];if(remaining.length!==expected.length)return false;
    for(const spec of expected){const index=remaining.findIndex(solid=>accessSolidMatches(solid,fixture,spec));
      if(index<0)return false;remaining.splice(index,1);}
    return remaining.length===0;
  },
  accessTableGeometry=(fixture,floor,props,solids,w,h,d,offsetZ=0)=>{
    const leg=Math.min(.045,w*.05,d*.08),foot=.018,columnH=h-.04-foot,
      directions={east:[1,0],west:[-1,0],north:[0,1],south:[0,-1]},
      direction=directions[fixture.wheelchairSide],c=Math.cos(fixture.yaw||0),s=Math.sin(fixture.yaw||0),
      localX=direction&&direction[0]*c-direction[1]*s,endApproach=direction&&Math.abs(localX)>.707,
      clear=(endApproach?d:w)-2*leg,
      allPositions=[[-w/2+leg/2,-d/2+leg/2],[w/2-leg/2,-d/2+leg/2],
        [-w/2+leg/2,d/2-leg/2],[w/2-leg/2,d/2-leg/2]],positions=allPositions,
      rendered=positions.flatMap(([dx,dz])=>[[dx,foot+columnH/2,offsetZ+dz,leg,columnH,leg],
        [dx,foot/2,offsetZ+dz,leg,foot,leg]]),
      bodies=positions.map(([dx,dz])=>[`accessible-table-${dz<0?'front':'rear'}-${dx<0?'left':'right'}`,
        dx,offsetZ+dz,leg,leg,
        {kneeClearance:h-.04,usableKneeWidth:clear}]),
      top=props.filter(prop=>prop.tag===fixture.id&&
        accessPropMatches(prop,fixture,floor,[0,h-.02,offsetZ,w,.04,d])).length===1;
    return !!direction&&h-.04>=.68-1e-6&&clear>=.75-1e-6&&top&&
      accessExactProps(props,fixture,floor,'ACCESS-KNEE',rendered)&&accessExactSolids(solids,fixture,bodies);
  };

// Positive and negative controls ensure the exact-body matcher rejects both a moved support and
// the old full-footprint proxy, instead of merely counting tagged bodies.
const accessControlFixture={id:'CONTROL/ACCESS-TABLE',at:[0,0,0],yaw:0},
  accessControlSpec=['accessible-table-front-left',-.4775,-.2775,.045,.045,
    {kneeClearance:.72,usableKneeWidth:.955}],
  accessControlBounds=accessExpectedBounds(accessControlFixture,-.4775,-.2775,.045,.045),
  accessControlSolid={fixtureId:accessControlFixture.id,accessibleSurface:true,
    collisionKind:'accessible-table-front-left',x0:accessControlBounds[0],x1:accessControlBounds[1],
    z0:accessControlBounds[2],z1:accessControlBounds[3],kneeClearance:.72,usableKneeWidth:.955};
check('accessible surface geometry matcher accepts measured supports and rejects moved or full-body proxies',
  accessSolidMatches(accessControlSolid,accessControlFixture,accessControlSpec)&&
  !accessSolidMatches({...accessControlSolid,x1:accessControlSolid.x1+.01},accessControlFixture,accessControlSpec)&&
  !accessExactSolids([accessControlSolid,{...accessControlSolid,collisionKind:'legacy-full-body'}],
    accessControlFixture,[accessControlSpec]));

for(const building of plan.buildings)for(const floor of building.floorsPlan){
  const scene=sceneForFloor(building.id,floor.level);
  for(const room of floor.rooms)for(const fixture of room.contents||[]){
    const claim=/accessible|无障碍/i.test(fixture.label||'')||/^\s*accessible\b/i.test(fixture.purpose||''),
      surface=accessSurfacePrefabs.has(fixture.prefab);
    if(surface&&claim&&fixture.accessible!==true)accessibleSurfaceDefects.push(`${fixture.id}:unflagged-claim`);
    if(!surface||fixture.accessible!==true||!scene)continue;
    const props=scene.props.filter(prop=>typeof prop.tag==='string'&&
        (prop.tag===fixture.id||prop.tag.startsWith(`${fixture.id}/`))&&prop.mesh!=='quad'),
      solids=scene.solids.filter(solid=>solid.fixtureId===fixture.id),[w,h,d]=fixture.size;
    if(fixture.prefab==='PF-MEETING-TABLE'||fixture.prefab==='PF-SIDE-TABLE'){
      if(!accessTableGeometry(fixture,floor,props,solids,w,h,d))
        accessibleSurfaceDefects.push(`${fixture.id}:table-geometry`);
    }else if(accessWorkstations.has(fixture.prefab)){
      if(!accessTableGeometry(fixture,floor,props,solids,w,h,d*.58,d*.14))
        accessibleSurfaceDefects.push(`${fixture.id}:workstation-geometry`);
      if(props.some(prop=>prop.tag===`${fixture.id}/TASK-CHAIR`))
        accessibleSurfaceDefects.push(`${fixture.id}:fixed-task-chair`);
    }else if(fixture.prefab==='PF-READING-TABLE'){
      const side=fixture.wheelchairSide,baySign=side==='north'?1:-1,topW=w*.72,topD=d*.46,
        leg=Math.min(.045,topW*.05,topD*.08),foot=.018,columnH=h-.04-foot,
        supportPositions=[[-topW/2+leg/2,-topD/2+leg/2],[topW/2-leg/2,-topD/2+leg/2],
          [-topW/2+leg/2,topD/2-leg/2],[topW/2-leg/2,topD/2-leg/2]],
        renderedSupports=supportPositions.flatMap(([dx,dz])=>[[dx,foot+columnH/2,dz,leg,columnH,leg],
          [dx,foot/2,dz,leg,foot,leg]]),chairW=Math.min(.42,w*.24),chairD=Math.min(.42,d*.31),
        x=w*.38,z=d*.30,chairs=[[-x,-z],[x,-z],[-x,z],[x,z]].filter(([dx,dz])=>
          !(Math.sign(dz)===baySign&&dx>0)),chairSpecs=chairs.map(([dx,dz])=>[
          `accessible-reading-chair-${dz<0?'south':'north'}-${dx<0?'left':'right'}`,dx,dz,
          chairW*.72,chairD*.72,{wheelchairSide:side,kneeClearance:h-.04,usableKneeWidth:.90}]),
        expectedChairTags=new Set(chairs.map(([dx,dz])=>`${fixture.id}/CHAIR/${dx}/${dz}`)),
        actualChairTags=new Set(props.filter(prop=>prop.tag.startsWith(`${fixture.id}/CHAIR/`)).map(prop=>prop.tag)),
        correctTags=actualChairTags.size===3&&[...expectedChairTags].every(tag=>actualChairTags.has(tag)),
        exactTop=props.filter(prop=>prop.tag===fixture.id&&
          accessPropMatches(prop,fixture,floor,[0,h-.02,0,topW,.04,topD])).length===1;
      if((side!=='north'&&side!=='south')||h-.04<.68-1e-6||topW<.90-1e-6||
        !exactTop||!accessExactProps(props,fixture,floor,'ACCESS-KNEE',renderedSupports)||
        !correctTags||!accessExactSolids(solids,fixture,chairSpecs))
        accessibleSurfaceDefects.push(`${fixture.id}:reading-${side||'missing'}-geometry`);
    }else if(accessCounters.has(fixture.prefab)){
      const returnW=Math.min(.90,w),wing=(w-returnW)/2,low=Math.min(.76,h),support=.045,knee=low-.06,
        usable=returnW-2*support,rendered=[[0,low-.03,0,returnW,.06,d*.92],
          [-returnW/2+support/2,knee/2,d*.34,support,knee,support],
          [returnW/2-support/2,knee/2,d*.34,support,knee,support],
          [0,low+.025,-d*.08,Math.min(.44,returnW*.52),.025,d*.28]],
        bodySpecs=[],bodyW=Math.max(.02,wing-.04);
      if(wing>.04)for(const sign of [-1,1])bodySpecs.push([
        sign<0?'accessible-counter-standing-left':'accessible-counter-standing-right',
        sign*(returnW/2+wing/2),0,bodyW,d*.72,{returnWidth:returnW,kneeClearance:knee}]);
      for(const sign of [-1,1])bodySpecs.push([
        sign<0?'accessible-counter-return-support-left':'accessible-counter-return-support-right',
        sign*(returnW/2-support/2),d*.34,support,support,
        {returnWidth:returnW,kneeClearance:knee,usableKneeWidth:usable}]);
      if(returnW<.90-1e-6||knee<.68-1e-6||usable<.75-1e-6||
        !accessExactProps(props,fixture,floor,'ACCESS-RETURN',rendered)||
        !accessExactSolids(solids,fixture,bodySpecs))
        accessibleSurfaceDefects.push(`${fixture.id}:counter-return-geometry`);
    }else if(fixture.prefab==='PF-BASIN'){
      const rim=Math.min(.80,h-.05),bowlH=Math.min(.10,Math.max(.06,rim-.68)),knee=rim-bowlH,
        usable=w*.90,rendered=[[0,(rim+.68)/2,d*.40,w*.62,rim-.68,d*.12]],
        bodies=[['accessible-basin-wall',0,d*.40,w*.62,d*.12,
          {kneeClearance:knee,usableKneeWidth:usable}]];
      if(knee<.68-1e-6||usable<.75-1e-6||!accessExactProps(props,fixture,floor,'ACCESS-KNEE',rendered)||
        !accessExactSolids(solids,fixture,bodies))
        accessibleSurfaceDefects.push(`${fixture.id}:basin-wall-geometry`);
    }else if(fixture.prefab==='PF-LIFT'){
      const rail=[[0,h*.38,d*.41,w*.62,.055,.055]];
      if(!accessExactProps(props,fixture,floor,'ACCESS-HANDRAIL',rail)||solids.length!==0)
        accessibleSurfaceDefects.push(`${fixture.id}:lift-handrail-geometry`);
    }
  }
}
check('every accessible surface renders a lowered or open-knee variant and every lift has its claimed handrail',
  accessibleSurfaceDefects.length===0,accessibleSurfaceDefects.slice(0,18).join(','));

// Accessibility claims below are geometric release contracts, not labels. Every clear field must
// remain inside its room, clear every physical floor fixture and reachable through the real runtime
// clamp map. Exact renderer child tags keep the source flags tied to visible open-knee/lowered forms.
const accessSame=(actual,expected,tolerance=.001)=>Array.isArray(actual)&&actual.length===expected.length&&
    actual.every((value,index)=>Number.isFinite(value)&&Math.abs(value-expected[index])<=tolerance),
  accessFixtureMatches=(fixture,prefab,atXZ,size)=>fixture?.prefab===prefab&&
    accessSame([fixture.at[0],fixture.at[2]],atXZ)&&accessSame(fixture.size,size),
  accessPhysicalFixtures=room=>(room?.contents||[]).filter(fixture=>(fixture.collision!=='none'||fixture.walkBlocker===true)&&
    fixture.size[1]>.20&&prefabSpecs.get(fixture.prefab)?.anchor==='floor'),
  accessTaggedParts=(scene,id,suffix)=>scene?.props.filter(prop=>prop.mesh!=='quad'&&
    prop.tag===`${id}/${suffix}`).length||0,
  accessFixtureParts=(scene,id)=>scene?.props.filter(prop=>prop.mesh!=='quad'&&prop.tag===id).length||0,
  accessChairTags=(scene,id)=>new Set((scene?.props||[]).filter(prop=>prop.mesh!=='quad'&&
    typeof prop.tag==='string'&&prop.tag.startsWith(`${id}/CHAIR/`)).map(prop=>prop.tag)).size,
  accessRequire=(ok,defects,label)=>{if(!ok)defects.push(label);},
  accessAuditRoom=(building,room,scene,clearFixtures,accessibleFixtures,defects)=>{
    if(!room||!scene){defects.push(`${room?.id||building?.id||'access'}:missing-room-or-scene`);return;}
    const physical=accessPhysicalFixtures(room),roomBounds=room.bounds,
      audited=[...new Set([...clearFixtures,...accessibleFixtures].filter(Boolean))];
    for(const fixture of audited){
      const bounds=reviewHorizontalBounds(fixture);
      if(bounds[0]<roomBounds[0]-.001||bounds[1]>roomBounds[1]+.001||bounds[2]<roomBounds[2]-.001||
        bounds[3]>roomBounds[3]+.001)defects.push(`${fixture.id}:outside-room`);
    }
    for(const clearFixture of clearFixtures.filter(Boolean))for(const fixture of physical)
      if(reviewRectOverlap(reviewHorizontalBounds(clearFixture),reviewHorizontalBounds(fixture)))
        defects.push(`${clearFixture.id}:blocked-by-${fixture.id}`);
    for(const accessibleFixture of accessibleFixtures.filter(Boolean))for(const fixture of physical)
      if(fixture!==accessibleFixture&&reviewRectOverlap(reviewHorizontalBounds(accessibleFixture),
        reviewHorizontalBounds(fixture)))defects.push(`${accessibleFixture.id}:overlaps-${fixture.id}`);
    const walk=cachedWalkMap(scene,building);
    for(const clearFixture of clearFixtures.filter(Boolean))if(!walk||
      !walkReaches(scene,walk,clearFixture.at[0],clearFixture.at[2],.24))
      defects.push(`${clearFixture.id}:unreachable`);
  };

const b02AccessPlan=plan.buildings.find(building=>building.id==='B02'),b02CoreWcDefects=[];
for(const floor of b02AccessPlan?.floorsPlan||[]){
  const corePrefix=`B02/F${floor.level}/CORE`,core=floor.rooms.find(room=>room.id===corePrefix),
    coreById=new Map((core?.contents||[]).map(fixture=>[fixture.id,fixture])),
    coreLift=coreById.get(`${corePrefix}/LIFT`),coreTurn=coreById.get(`${corePrefix}/LIFT-TURN`),
    coreRoute=coreById.get(`${corePrefix}/ACCESS-ROUTE`),scene=sceneForFloor('B02',floor.level),
    coreDoor=core?.doors?.[0],corePlanning=core?.planning;
  accessRequire(core?.accessible===true&&accessSame(core.bounds,[1.1,6.15,-11.6,-5.35])&&
    core?.doors?.length===1&&coreDoor.id===`${corePrefix}/D-AUTO-01`&&coreDoor.side==='north'&&
    accessSame([coreDoor.at[0],coreDoor.at[2]],[2.25,-5.35])&&coreDoor.width===1.20&&
    coreDoor.autoCompleted===true&&coreDoor.destination===`B02/F${floor.level}/${floor.level===1?'SERVICE-SPINE':'SPINE'}`,
    b02CoreWcDefects,`${corePrefix}:room-door`);
  accessRequire(accessFixtureMatches(coreLift,'PF-LIFT',[2.20,-9.20],[1.65,2.45,1.55])&&
    coreLift.accessible===true&&coreLift.facing==='north'&&Math.abs(coreLift.yaw-Math.PI)<.001&&
    accessFixtureMatches(coreTurn,'PF-WALL-RUN',[2.20,-7.55],[1.50,.02,1.50])&&
    coreTurn.accessible===true&&coreTurn.collision==='none'&&coreTurn.turningDiameter===1.50&&
    accessFixtureMatches(coreRoute,'PF-WALL-RUN',[2.20,-6.075],[1.50,.018,1.45])&&
    coreRoute.accessible===true&&coreRoute.collision==='none'&&coreRoute.clearWidth===1.20,
    b02CoreWcDefects,`${corePrefix}:fixtures`);
  accessRequire(corePlanning?.publicRoutes?.length===1&&corePlanning.publicRoutes[0].id===coreRoute?.id&&
    accessSame(corePlanning.publicRoutes[0].bounds,[1.45,2.95,-6.80,-5.35])&&
    corePlanning.publicRoutes[0].width===1.20&&corePlanning?.turns?.length===1&&
    corePlanning.turns[0].id===coreTurn?.id&&accessSame(corePlanning.turns[0].centre,[2.20,-7.55])&&
    corePlanning.turns[0].diameter===1.50&&corePlanning?.liftApproaches?.length===1&&
    corePlanning.liftApproaches[0].liftId===coreLift?.id&&
    corePlanning.liftApproaches[0].turnId===coreTurn?.id&&corePlanning.liftApproaches[0].front==='north'&&
    corePlanning.liftApproaches[0].clearGap===.125,b02CoreWcDefects,`${corePrefix}:planning`);
  accessAuditRoom(b02AccessPlan,core,scene,[coreTurn,coreRoute],[coreLift],b02CoreWcDefects);
  if(accessTaggedParts(scene,coreLift?.id,'ACCESS-HANDRAIL')!==1)
    b02CoreWcDefects.push(`${corePrefix}:missing-rendered-handrail`);

  const wcPrefix=`B02/F${floor.level}/WC`,wc=floor.rooms.find(room=>room.id===wcPrefix),
    wcById=new Map((wc?.contents||[]).map(fixture=>[fixture.id,fixture])),wcDoor=wc?.doors?.[0],
    toilet=wcById.get(`${wcPrefix}/T1`),transfer=wcById.get(`${wcPrefix}/T1-TRANSFER`),
    turn=wcById.get(`${wcPrefix}/TURN`),route=wcById.get(`${wcPrefix}/ACCESS-ROUTE`),
    basin=wcById.get(`${wcPrefix}/B1`),planning=wc?.planning;
  accessRequire(wc?.accessible===true&&accessSame(wc.bounds,[3.55,6.15,-3.85,-.90])&&wc?.doors?.length===1&&
    wcDoor.id===`${wcPrefix}/D-AUTO-01`&&wcDoor.side==='west'&&
    accessSame([wcDoor.at[0],wcDoor.at[2]],[3.55,-2.375])&&wcDoor.width===1.20&&wcDoor.autoCompleted===true,
    b02CoreWcDefects,`${wcPrefix}:room-door`);
  accessRequire((wc?.contents||[]).filter(fixture=>fixture.prefab==='PF-TOILET').length===1&&
    accessFixtureMatches(toilet,'PF-TOILET',[5.75,-1.25],[.72,.78,.55])&&toilet.accessible===true&&
    toilet.grabRails===true&&toilet.facing==='south'&&
    accessFixtureMatches(transfer,'PF-WALL-RUN',[4.70,-1.35],[1.20,.02,.90])&&
    transfer.accessible===true&&transfer.collision==='none'&&accessSame(transfer.clearBay,[1.20,.90])&&
    accessFixtureMatches(turn,'PF-WALL-RUN',[4.35,-2.65],[1.50,.02,1.50])&&
    turn.accessible===true&&turn.collision==='none'&&turn.turningDiameter===1.50&&
    accessFixtureMatches(route,'PF-WALL-RUN',[4.125,-2.375],[1.15,.018,1.20])&&
    route.accessible===true&&route.collision==='none'&&route.clearWidth===1.20&&
    accessFixtureMatches(basin,'PF-BASIN',[5.85,-2.60],[.84,.88,.45])&&basin.accessible===true&&
    basin.facing==='west',b02CoreWcDefects,`${wcPrefix}:fixtures`);
  accessRequire(planning?.publicRoutes?.length===1&&planning.publicRoutes[0].id===route?.id&&
    accessSame(planning.publicRoutes[0].bounds,[3.55,4.70,-2.975,-1.775])&&
    planning.publicRoutes[0].width===1.20&&planning?.protectedDoorRoutes?.length===1&&
    planning.protectedDoorRoutes[0].doorId===wcDoor?.id&&planning.protectedDoorRoutes[0].id===route?.id&&
    accessSame(planning.protectedDoorRoutes[0].at,[3.55,-2.375])&&planning.protectedDoorRoutes[0].width===1.20&&
    planning.protectedDoorRoutes[0].depth===1.15&&planning?.turns?.[0]?.id===turn?.id&&
    accessSame(planning.turns[0].centre,[4.35,-2.65])&&planning.turns[0].diameter===1.50&&
    planning?.toiletTransfers?.[0]?.toiletId===toilet?.id&&planning.toiletTransfers[0].id===transfer?.id&&
    planning.toiletTransfers[0].side==='west'&&accessSame(planning.toiletTransfers[0].clearBay,[1.20,.90]),
    b02CoreWcDefects,`${wcPrefix}:planning`);
  accessAuditRoom(b02AccessPlan,wc,scene,[transfer,turn,route],[toilet,basin],b02CoreWcDefects);
  if(accessFixtureParts(scene,toilet?.id)<8)b02CoreWcDefects.push(`${wcPrefix}:rendered-grab-rails`);
  if(accessTaggedParts(scene,basin?.id,'ACCESS-KNEE')!==1)b02CoreWcDefects.push(`${wcPrefix}:rendered-basin-knee`);
}
check('all four B02 lift and WC cores preserve exact reachable turns, routes and toilet transfers',
  b02AccessPlan?.floorsPlan.length===4&&b02CoreWcDefects.length===0,b02CoreWcDefects.slice(0,18).join(','));

const b02GroundAccessDefects=[],b02Ground=b02AccessPlan?.floorsPlan.find(floor=>floor.level===1),
  b02GroundScene=sceneForFloor('B02',1),b02Circ=b02Ground?.rooms.find(room=>room.id==='B02/F1/CIRC'),
  b02CircById=new Map((b02Circ?.contents||[]).map(fixture=>[fixture.id,fixture])),
  b02CircDesk=b02CircById.get('B02/F1/CIRC/DESK'),b02CircApproach=b02CircById.get('B02/F1/CIRC/DESK-APPROACH'),
  b02Read=b02Ground?.rooms.find(room=>room.id==='B02/F1/READ'),
  b02ReadById=new Map((b02Read?.contents||[]).map(fixture=>[fixture.id,fixture])),
  b02Mag=b02ReadById.get('B02/F1/READ/MAG'),b02MagApproach=b02ReadById.get('B02/F1/READ/MAG-APPROACH');
accessRequire(b02Circ?.accessible===true&&accessSame(b02Circ.bounds,[-2.05,.90,-4.50,.55])&&
  accessFixtureMatches(b02CircDesk,'PF-CIRC-DESK',[.64,-2.15],[2.20,1.0,.52])&&
  b02CircDesk.accessible===true&&b02CircDesk.lowerSection===true&&
  accessFixtureMatches(b02CircApproach,'PF-WALL-RUN',[-.22,-2.15],[1.20,.02,.90])&&
  b02CircApproach.accessible===true&&b02CircApproach.collision==='none'&&
  accessSame(b02CircApproach.clearBay,[1.20,.90])&&b02Circ?.planning?.serviceApproaches?.length===1&&
  b02Circ.planning.serviceApproaches[0].counterId===b02CircDesk?.id&&
  b02Circ.planning.serviceApproaches[0].id===b02CircApproach?.id&&
  accessSame(b02Circ.planning.serviceApproaches[0].clearBay,[1.20,.90]),b02GroundAccessDefects,'B02/F1/CIRC:contract');
accessAuditRoom(b02AccessPlan,b02Circ,b02GroundScene,[b02CircApproach],[b02CircDesk],b02GroundAccessDefects);
if(accessTaggedParts(b02GroundScene,b02CircDesk?.id,'ACCESS-RETURN')<4)
  b02GroundAccessDefects.push('B02/F1/CIRC/DESK:rendered-return');
const b02ReadExpected=[
  ['B02/F1/READ/TABLE01',[4.65,3.30],'south','B02/F1/READ/TABLE01/WHEELCHAIR',[4.65,2.175]],
  ['B02/F1/READ/TABLE02',[4.65,5.80],'north','B02/F1/READ/TABLE02/WHEELCHAIR',[4.65,6.925]],
],b02ReadTables=[],b02ReadBays=[];
accessRequire(b02Read?.accessible===true&&accessSame(b02Read.bounds,[1.70,6.15,1.0,11.60])&&
  b02Read?.planning?.wheelchairReadingPlaces?.length===2&&b02Read.planning?.workstationApproaches?.length===1,
  b02GroundAccessDefects,'B02/F1/READ:room-planning');
for(const [tableId,tableAt,side,bayId,bayAt] of b02ReadExpected){
  const table=b02ReadById.get(tableId),bay=b02ReadById.get(bayId),planning=b02Read?.planning?.wheelchairReadingPlaces
    ?.find(item=>item.tableId===tableId);
  b02ReadTables.push(table);b02ReadBays.push(bay);
  accessRequire(accessFixtureMatches(table,'PF-READING-TABLE',tableAt,[2.10,.78,1.05])&&
    table.accessible===true&&table.openLeg===true&&table.wheelchairSide===side&&
    accessFixtureMatches(bay,'PF-WALL-RUN',bayAt,[.90,.02,1.20])&&bay.accessible===true&&
    bay.collision==='none'&&bay.side===side&&bay.tableId===tableId&&accessSame(bay.clearBay,[.90,1.20])&&
    planning?.id===bayId&&planning.side===side&&accessSame(planning.clearBay,[.90,1.20])&&
    Math.abs((side==='south'?bayAt[1]+.60:bayAt[1]-.60)-
      (side==='south'?tableAt[1]-.525:tableAt[1]+.525))<.001,b02GroundAccessDefects,`${tableId}:contract`);
  if(accessTaggedParts(b02GroundScene,tableId,'ACCESS-KNEE')<5||accessChairTags(b02GroundScene,tableId)!==3)
    b02GroundAccessDefects.push(`${tableId}:rendered-access-surface`);
}
accessRequire(accessFixtureMatches(b02Mag,'PF-COMPUTER-DESK',[2.75,10.80],[1.20,.76,.72])&&
  b02Mag.accessible===true&&b02Mag.openLeg===true&&b02Mag.wheelchairSide==='east'&&
  Math.abs(b02Mag.yaw+Math.PI/2)<.001&&
  accessFixtureMatches(b02MagApproach,'PF-WALL-RUN',[3.71,10.80],[1.20,.02,.90])&&
  b02MagApproach.accessible===true&&b02MagApproach.collision==='none'&&
  accessSame(b02MagApproach.clearBay,[1.20,.90])&&
  b02Read.planning.workstationApproaches[0].workstationId===b02Mag?.id&&
  b02Read.planning.workstationApproaches[0].id===b02MagApproach?.id&&
  accessSame(b02Read.planning.workstationApproaches[0].clearBay,[1.20,.90]),b02GroundAccessDefects,
  'B02/F1/READ/MAG:contract');
if(accessTaggedParts(b02GroundScene,b02Mag?.id,'ACCESS-KNEE')<5||
  (b02GroundScene?.props||[]).some(prop=>prop.tag===`${b02Mag?.id}/TASK-CHAIR`))
  b02GroundAccessDefects.push('B02/F1/READ/MAG:rendered-access-surface');
accessAuditRoom(b02AccessPlan,b02Read,b02GroundScene,[...b02ReadBays,b02MagApproach],
  [...b02ReadTables,b02Mag],b02GroundAccessDefects);
check('B02 ground reader services provide exact reachable wheelchair places and rendered open-knee surfaces',
  b02GroundAccessDefects.length===0,b02GroundAccessDefects.slice(0,18).join(','));

const b03AccessDefects=[],b03Scene=sceneForFloor('B03',1),b03Wc=b03Plan?.floorsPlan[0].rooms
  .find(room=>room.id==='B03/F1/WC'),b03WcById=new Map((b03Wc?.contents||[]).map(fixture=>[fixture.id,fixture])),
  b03Toilet=b03WcById.get('B03/F1/WC/TOILET'),b03Transfer=b03WcById.get('B03/F1/WC/TOILET-TRANSFER'),
  b03Basin=b03WcById.get('B03/F1/WC/BASIN'),b03BasinApproach=b03WcById.get('B03/F1/WC/BASIN-APPROACH'),
  b03Turn=b03WcById.get('B03/F1/WC/TURN'),b03Route=b03WcById.get('B03/F1/WC/ACCESS-ROUTE'),
  b03WcPlanning=b03Wc?.planning;
accessRequire(b03Wc?.accessible===true&&accessSame(b03Wc.bounds,[-6.60,-4.45,-5.0,-1.50])&&
  b03Wc?.doors?.length===1&&b03Wc.doors[0].id==='B03/F1/WC/CHANGE'&&b03Wc.doors[0].side==='east'&&
  accessSame([b03Wc.doors[0].at[0],b03Wc.doors[0].at[2]],[-4.45,-2.60])&&b03Wc.doors[0].width===1.0,
  b03AccessDefects,'B03/F1/WC:room-door');
accessRequire(accessFixtureMatches(b03Toilet,'PF-TOILET',[-6.15,-4.70],[.72,.78,.55])&&
  b03Toilet.accessible===true&&b03Toilet.grabRails===true&&b03Toilet.facing==='north'&&
  accessFixtureMatches(b03Transfer,'PF-WALL-RUN',[-5.19,-4.55],[1.20,.02,.90])&&
  b03Transfer.accessible===true&&b03Transfer.collision==='none'&&accessSame(b03Transfer.clearBay,[1.20,.90])&&
  accessFixtureMatches(b03Basin,'PF-BASIN',[-6.18,-1.725],[.84,.88,.45])&&b03Basin.accessible===true&&
  b03Basin.facing==='south'&&accessFixtureMatches(b03BasinApproach,'PF-WALL-RUN',[-6.05,-2.40],[.90,.02,.90])&&
  b03BasinApproach.accessible===true&&accessSame(b03BasinApproach.clearBay,[.90,.90])&&
  accessFixtureMatches(b03Turn,'PF-WALL-RUN',[-5.45,-2.70],[1.50,.02,1.50])&&
  b03Turn.accessible===true&&b03Turn.turningDiameter===1.50&&
  accessFixtureMatches(b03Route,'PF-WALL-RUN',[-5.025,-2.60],[1.15,.02,1.0])&&
  b03Route.accessible===true&&b03Route.clearWidth===1.0,b03AccessDefects,'B03/F1/WC:fixtures');
accessRequire(b03WcPlanning?.publicRoutes?.[0]?.id===b03Route?.id&&
  accessSame(b03WcPlanning.publicRoutes[0].bounds,[-5.60,-4.45,-3.10,-2.10])&&
  b03WcPlanning.publicRoutes[0].width===1.0&&b03WcPlanning?.turns?.[0]?.id===b03Turn?.id&&
  accessSame(b03WcPlanning.turns[0].centre,[-5.45,-2.70])&&b03WcPlanning.turns[0].diameter===1.50&&
  b03WcPlanning?.toiletTransfers?.[0]?.toiletId===b03Toilet?.id&&
  b03WcPlanning.toiletTransfers[0].id===b03Transfer?.id&&b03WcPlanning.toiletTransfers[0].side==='east'&&
  accessSame(b03WcPlanning.toiletTransfers[0].clearBay,[1.20,.90])&&
  b03WcPlanning?.basinApproaches?.[0]?.basinId===b03Basin?.id&&
  b03WcPlanning.basinApproaches[0].id===b03BasinApproach?.id&&
  accessSame(b03WcPlanning.basinApproaches[0].clearBay,[.90,.90]),b03AccessDefects,'B03/F1/WC:planning');
accessAuditRoom(b03Plan,b03Wc,b03Scene,[b03Transfer,b03BasinApproach,b03Turn,b03Route],
  [b03Toilet,b03Basin],b03AccessDefects);
if(accessFixtureParts(b03Scene,b03Toilet?.id)<8)b03AccessDefects.push('B03/F1/WC:rendered-grab-rails');
if(accessTaggedParts(b03Scene,b03Basin?.id,'ACCESS-KNEE')!==1)b03AccessDefects.push('B03/F1/WC:rendered-basin-knee');
const b03DiningAccessExpected=[['T03',[2.55,-3.50],[2.91,-2.525]],
  ['T04',[5.10,-3.50],[5.46,-2.525]],['T06',[5.10,3.50],[5.46,4.475]]],
  b03DiningTables=[],b03DiningBays=[];
accessRequire(b03Dining?.capacity===30&&b03Dining.fixedSeats===27&&b03Dining.wheelchairPlaces===3&&
  b03Contents.filter(fixture=>fixture.prefab==='PF-MEETING-TABLE'&&fixture.accessible===true).length===3&&
  b03Contents.filter(fixture=>fixture.id.endsWith('/WHEELCHAIR')&&fixture.accessible===true).length===3,
  b03AccessDefects,'B03/F1/DINING:capacity');
for(const [shortId,tableAt,bayAt] of b03DiningAccessExpected){
  const tableId=`B03/F1/DINING/${shortId}/TABLE`,bayId=`B03/F1/DINING/${shortId}/WHEELCHAIR`,
    table=b03Contents.find(fixture=>fixture.id===tableId),bay=b03Contents.find(fixture=>fixture.id===bayId);
  b03DiningTables.push(table);b03DiningBays.push(bay);
  accessRequire(accessFixtureMatches(table,'PF-MEETING-TABLE',tableAt,[1.35,.76,.75])&&
    table.accessible===true&&table.openLeg===true&&table.wheelchairSide==='north'&&
    accessFixtureMatches(bay,'PF-WALL-RUN',bayAt,[.90,.02,1.20])&&bay.accessible===true&&
    bay.collision==='none'&&bay.side==='north'&&bay.tableId===tableId&&accessSame(bay.clearBay,[.90,1.20])&&
    Math.abs((bay.at[2]-bay.size[2]/2)-(table.at[2]+table.size[2]/2))<.001,
    b03AccessDefects,`${bayId}:truth`);
  if(accessTaggedParts(b03Scene,tableId,'ACCESS-KNEE')<5)
    b03AccessDefects.push(`${tableId}:rendered-open-knee`);
}
accessAuditRoom(b03Plan,b03Dining,b03Scene,b03DiningBays,b03DiningTables,b03AccessDefects);
check('B03 staff WC and all three dining places preserve exact reachable transfer geometry',
  b03AccessDefects.length===0,b03AccessDefects.slice(0,18).join(','));

const b05AccessPlan=plan.buildings.find(building=>building.id==='B05'),b05LiftWcDefects=[];
for(const floor of b05AccessPlan?.floorsPlan||[]){
  const prefix=`B05/F${floor.level}/LIFT-WC`,room=floor.rooms.find(candidate=>candidate.id===prefix),
    byId=new Map((room?.contents||[]).map(fixture=>[fixture.id,fixture])),scene=sceneForFloor('B05',floor.level),
    route=byId.get(`${prefix}/ROUTE`),turn=byId.get(`${prefix}/TURN`),lift=byId.get(`${prefix}/LIFT`),
    toilet=byId.get(`${prefix}/TOILET`),transfer=byId.get(`${prefix}/TOILET-TRANSFER`),
    basin=byId.get(`${prefix}/BASIN`),door=room?.doors?.[0],planning=room?.planning;
  accessRequire(room?.accessible===true&&accessSame(room.bounds,[-6.60,-4.30,1.30,5.60])&&room?.doors?.length===1&&
    door.id===`${prefix}/TO-COR`&&door.side==='south'&&accessSame([door.at[0],door.at[2]],[-5.45,1.30])&&
    door.width===1.20, b05LiftWcDefects,`${prefix}:room-door`);
  accessRequire(accessFixtureMatches(route,'PF-WALL-RUN',[-5.45,2.20],[1.20,.004,1.80])&&
    route.accessible===true&&route.collision==='none'&&route.clearWidth===1.20&&
    accessFixtureMatches(turn,'PF-WALL-RUN',[-5.50,3.10],[1.50,.004,1.50])&&
    turn.accessible===true&&turn.collision==='none'&&turn.turningDiameter===1.50&&
    accessFixtureMatches(lift,'PF-LIFT',[-5.95,4.775],[1.30,2.45,1.55])&&lift.accessible===true&&
    accessFixtureMatches(toilet,'PF-TOILET',[-4.575,4.94],[.72,.78,.55])&&toilet.accessible===true&&
    toilet.grabRails===true&&toilet.facing==='west'&&
    accessFixtureMatches(transfer,'PF-WALL-RUN',[-4.75,3.98],[.90,.02,1.20])&&
    transfer.accessible===true&&transfer.collision==='none'&&accessSame(transfer.clearBay,[.90,1.20])&&
    accessFixtureMatches(basin,'PF-BASIN',[-4.525,2.85],[.84,.88,.45])&&basin.accessible===true&&
    basin.facing==='west',b05LiftWcDefects,`${prefix}:fixtures`);
  accessRequire(planning?.publicRoutes?.[0]?.id===route?.id&&
    accessSame(planning.publicRoutes[0].bounds,[-6.05,-4.85,1.30,3.10])&&
    planning.publicRoutes[0].width===1.20&&planning?.turns?.[0]?.id===turn?.id&&
    accessSame(planning.turns[0].centre,[-5.50,3.10])&&planning.turns[0].diameter===1.50&&
    planning?.toiletTransfers?.[0]?.toiletId===toilet?.id&&planning.toiletTransfers[0].id===transfer?.id&&
    planning.toiletTransfers[0].side==='south'&&accessSame(planning.toiletTransfers[0].clearBay,[.90,1.20]),
    b05LiftWcDefects,`${prefix}:planning`);
  accessAuditRoom(b05AccessPlan,room,scene,[route,turn,transfer],[lift,toilet,basin],b05LiftWcDefects);
  if(accessTaggedParts(scene,lift?.id,'ACCESS-HANDRAIL')!==1)b05LiftWcDefects.push(`${prefix}:rendered-handrail`);
  if(accessFixtureParts(scene,toilet?.id)<8)b05LiftWcDefects.push(`${prefix}:rendered-grab-rails`);
  if(accessTaggedParts(scene,basin?.id,'ACCESS-KNEE')!==1)b05LiftWcDefects.push(`${prefix}:rendered-basin-knee`);
}
check('all four B05 lift/WC suites preserve exact reachable routes, turns and 0.90 by 1.20 m transfers',
  b05AccessPlan?.floorsPlan.length===4&&b05LiftWcDefects.length===0,b05LiftWcDefects.slice(0,18).join(','));

const b05ServiceAccessDefects=[],b05Ground=b05AccessPlan?.floorsPlan.find(floor=>floor.level===1),
  b05GroundScene=sceneForFloor('B05',1),b05ServiceExpected=[
    ['A','B05/F1/A/COUNTER','PF-SERVICE-COUNTER',[-2.75,-4.70],[2.0,1.05,.72],'lowerSection','ACCESS-RETURN'],
    ['B','B05/F1/B/COUNTER-ACCESS','PF-SIDE-TABLE',[2.92,-4.70],[.90,.78,.60],'openLeg','ACCESS-KNEE'],
    ['C','B05/F1/C/COUNTER','PF-SERVICE-COUNTER',[-2.75,4.70],[2.0,1.05,.72],'lowerSection','ACCESS-RETURN'],
    ['D','B05/F1/D/FORM-TABLE','PF-MEETING-TABLE',[2.25,5.15],[1.20,.78,.55],'openLeg','ACCESS-KNEE'],
  ],b05ServicePlanning=new Map([
    ['A',[[-2.35,-1.15,-3.25,-1.30],[-1.75,-3.25]]],
    ['B',[[3.05,4.25,-3.15,-1.30],[3.65,-3.15]]],
    ['C',[[-2.35,-1.15,1.30,3.25],[-1.75,3.25]]],
    ['D',[[1.65,2.85,1.30,2.65],[2.25,2.65]]],
  ]);
for(const [roomKey,id,prefab,at,size,flag,renderSuffix] of b05ServiceExpected){
  const room=b05Ground?.rooms.find(candidate=>candidate.id===`B05/F1/${roomKey}`),
    byId=new Map((room?.contents||[]).map(fixture=>[fixture.id,fixture])),surface=byId.get(id),
    route=byId.get(`B05/F1/${roomKey}/ROUTE`),turn=byId.get(`B05/F1/${roomKey}/TURN`),
    [routeBounds,turnCentre]=b05ServicePlanning.get(roomKey),planning=room?.planning;
  accessRequire(accessFixtureMatches(surface,prefab,at,size)&&surface.accessible===true&&surface[flag]===true&&
    route?.accessible===true&&route.collision==='none'&&route.clearWidth===1.20&&
    turn?.accessible===true&&turn.collision==='none'&&turn.turningDiameter===1.50&&
    planning?.publicRoutes?.[0]?.id===route?.id&&accessSame(planning.publicRoutes[0].bounds,routeBounds)&&
    planning.publicRoutes[0].width===1.20&&planning?.turns?.[0]?.id===turn?.id&&
    accessSame(planning.turns[0].centre,turnCentre)&&planning.turns[0].diameter===1.50,
    b05ServiceAccessDefects,`${id}:metadata`);
  accessAuditRoom(b05AccessPlan,room,b05GroundScene,[route,turn],[surface],b05ServiceAccessDefects);
  if(accessTaggedParts(b05GroundScene,id,renderSuffix)<(renderSuffix==='ACCESS-RETURN'?4:5))
    b05ServiceAccessDefects.push(`${id}:rendered-${renderSuffix}`);
}
check('B05 public service claims map to exact reachable turns and visibly accessible work surfaces',
  b05ServiceAccessDefects.length===0,b05ServiceAccessDefects.slice(0,18).join(','));

const b01East=b01Plan?.floorsPlan[0].rooms.find(room=>room.id==='B01/F1/EAST'),
  b01EastContents=b01East?.contents||[],b01EastBays=b01EastContents.filter(fixture=>
    /^B01\/F1\/EAST\/WHEELCHAIR-BAY(?:-2)?$/.test(fixture.id)),
  b01EastTables=b01EastContents.filter(fixture=>fixture.prefab==='PF-MEETING-TABLE'&&fixture.accessible===true),
  b01EastRoute=b01EastContents.find(fixture=>fixture.id==='B01/F1/EAST/ROUTE'),
  b01EastChairs=b01EastContents.filter(fixture=>fixture.prefab==='PF-CHAIR'&&/^B01\/F1\/EAST\/CHAIR/.test(fixture.id)),
  b01EastScene=sceneForFloor('B01',1),b01EastWalk=b01EastScene&&cachedWalkMap(b01EastScene,b01Plan),
  b01EastPhysical=b01EastContents.filter(fixture=>fixture.collision!=='none'&&fixture.size[1]>.20&&
    prefabSpecs.get(fixture.prefab)?.anchor==='floor'),b01EastDefects=[];
for(const bay of b01EastBays){
  const bounds=reviewHorizontalBounds(bay),table=[...b01EastTables].sort((a,b)=>
    Math.abs(a.at[2]-bay.at[2])-Math.abs(b.at[2]-bay.at[2]))[0];
  if(!table||table.size.join(',')!=='1.4,0.76,0.9'||table.yaw!==0||table.wheelchairSide!=='east'||
    table.openLeg!==true||Math.abs(table.at[2]-bay.at[2])>.001||
    Math.abs((bay.at[0]-bay.size[0]/2)-(table.at[0]+table.size[0]/2))>.001)
    b01EastDefects.push(`${bay.id}:paired-table-contract`);
  for(const physical of b01EastPhysical)if(reviewRectOverlap(bounds,reviewHorizontalBounds(physical)))
    b01EastDefects.push(`${bay.id}:${physical.id}`);
  if(!b01EastWalk||!walkReaches(b01EastScene,b01EastWalk,bay.at[0],bay.at[2],.24))
    b01EastDefects.push(`${bay.id}:unreachable`);
  if(table){
    const moved=b01EastScene?.clampMove(bay.at[0],bay.at[2],table.at[0],table.at[2],.30),
      supports=(b01EastScene?.solids||[]).filter(solid=>solid.fixtureId===table.id);
    if(!moved||Math.hypot(moved[0]-table.at[0],moved[1]-table.at[2])>.011)
      b01EastDefects.push(`${bay.id}:knee-unreachable`);
    if(supports.length!==4||supports.some(solid=>Math.min(bounds[1],solid.x1)-Math.max(bounds[0],solid.x0)>.001&&
      Math.min(bounds[3],solid.z1)-Math.max(bounds[2],solid.z0)>.001))
      b01EastDefects.push(`${bay.id}:support-intrusion`);
  }
}
const b01EastRouteBounds=b01EastRoute&&reviewHorizontalBounds(b01EastRoute);
if(!b01EastRouteBounds||b01EastRoute?.size?.join(',')!=='1.2,0.02,7.45'||
  b01EastRoute.clearWidth!==1.20||b01East?.planning?.doorSideRoute!==1.20)
  b01EastDefects.push('B01/F1/EAST/ROUTE:contract');
else{
  for(const bay of b01EastBays)if(Math.abs((bay.at[0]+bay.size[0]/2)-b01EastRouteBounds[0])>.001)
    b01EastDefects.push(`${bay.id}:route-edge`);
  for(const physical of b01EastPhysical)if(reviewRectOverlap(b01EastRouteBounds,reviewHorizontalBounds(physical)))
    b01EastDefects.push(`B01/F1/EAST/ROUTE:${physical.id}`);
}
if(!b01EastRoute||!b01EastWalk||!walkReaches(b01EastScene,b01EastWalk,b01EastRoute.at[0],b01EastRoute.at[2],.24))
  b01EastDefects.push('B01/F1/EAST/ROUTE:unreachable');
check('B01 accessible classroom has two real wheelchair bays and two open-leg writing surfaces',
  b01East?.accessible===true&&b01East?.planning?.wheelchairBays===2&&
  b01East.planning.accessibleWritingSurfaces===2&&b01EastBays.length===2&&b01EastTables.length===2&&
  b01EastChairs.length===16&&b01EastBays.every(bay=>bay.accessible===true&&bay.collision==='none'&&
    bay.clearBay?.join(',')==='1.2,1.2')&&b01EastDefects.length===0,
  `bays=${b01EastBays.length} tables=${b01EastTables.length} chairs=${b01EastChairs.length} `+
  `defects=${b01EastDefects.join('|')||'-'}`);

const b01West=b01Plan?.floorsPlan[0].rooms.find(room=>room.id==='B01/F1/WEST'),
  b01WestContents=b01West?.contents||[],b01WestBays=b01WestContents.filter(fixture=>
    /^B01\/F1\/WEST\/WHEELCHAIR-BAY(?:-2)?$/.test(fixture.id)),
  b01WestTables=b01WestContents.filter(fixture=>/^B01\/F1\/WEST\/ACCESS-TABLE-[12]$/.test(fixture.id)),
  b01WestRoute=b01WestContents.find(fixture=>fixture.id==='B01/F1/WEST/ROUTE'),
  b01WestSeats=b01WestContents.filter(fixture=>fixture.prefab==='PF-LECTURE-SEAT'),
  b01WestScene=sceneForFloor('B01',1),b01WestWalk=b01WestScene&&cachedWalkMap(b01WestScene,b01Plan),
  b01WestPhysical=b01WestContents.filter(fixture=>fixture.collision!=='none'&&fixture.size[1]>.20&&
    prefabSpecs.get(fixture.prefab)?.anchor==='floor'),b01WestDefects=[];
for(const bay of b01WestBays){
  const table=[...b01WestTables].sort((a,b)=>Math.abs(a.at[2]-bay.at[2])-Math.abs(b.at[2]-bay.at[2]))[0],
    bounds=reviewHorizontalBounds(bay);
  if(!table||table.prefab!=='PF-MEETING-TABLE'||table.accessible!==true||table.openLeg!==true||
    table.wheelchairSide!=='east'||table.size.join(',')!=='0.9,0.78,0.9'||
    table.supportCollision!==true||table.collision==='none'||
    Math.abs((table.at[0]+table.size[0]/2)-(bay.at[0]-bay.size[0]/2))>.001||
    Math.abs(table.at[2]-bay.at[2])>.001)b01WestDefects.push(`${bay.id}:missing-adjacent-table`);
  for(const physical of b01WestPhysical)if(physical!==table&&reviewRectOverlap(bounds,reviewHorizontalBounds(physical)))
    b01WestDefects.push(`${bay.id}:${physical.id}`);
  if(!b01WestWalk||!walkReaches(b01WestScene,b01WestWalk,bay.at[0],bay.at[2],.24))
    b01WestDefects.push(`${bay.id}:unreachable`);
  if(table){
    const moved=b01WestScene?.clampMove(bay.at[0],bay.at[2],table.at[0],table.at[2],.30),
      supports=(b01WestScene?.solids||[]).filter(solid=>solid.fixtureId===table.id);
    if(!moved||Math.hypot(moved[0]-table.at[0],moved[1]-table.at[2])>.011)
      b01WestDefects.push(`${bay.id}:knee-unreachable`);
    if(supports.length!==4||supports.some(solid=>Math.min(bounds[1],solid.x1)-Math.max(bounds[0],solid.x0)>.001&&
      Math.min(bounds[3],solid.z1)-Math.max(bounds[2],solid.z0)>.001))
      b01WestDefects.push(`${bay.id}:support-intrusion`);
  }
}
const b01WestRouteBounds=b01WestRoute&&reviewHorizontalBounds(b01WestRoute);
if(!b01WestRouteBounds||b01WestRoute?.size?.join(',')!=='1.2,0.02,7.45'||
  b01WestRoute.clearWidth!==1.20)b01WestDefects.push('B01/F1/WEST/ROUTE:contract');
else for(const physical of b01WestPhysical)if(reviewRectOverlap(b01WestRouteBounds,reviewHorizontalBounds(physical)))
  b01WestDefects.push(`B01/F1/WEST/ROUTE:${physical.id}`);
if(!b01WestRoute||!b01WestWalk||!walkReaches(b01WestScene,b01WestWalk,b01WestRoute.at[0],b01WestRoute.at[2],.24))
  b01WestDefects.push('B01/F1/WEST/ROUTE:unreachable');
for(const table of b01WestTables)if((b01WestScene?.solids||[]).filter(solid=>solid.fixtureId===table.id).length!==4)
  b01WestDefects.push(`${table.id}:support-count`);
check('B01 lecture room replaces two fixed seats with real reachable wheelchair writing places',
  b01West?.planning?.capacity===20&&b01West.planning.fixedSeats===18&&b01West.planning.wheelchairBays===2&&
  b01West.planning.accessibleWritingSurfaces===2&&b01WestBays.length===2&&b01WestTables.length===2&&
  b01West.planning.doorSideRoute===1.20&&b01WestSeats.length===18&&b01WestDefects.length===0,
  `bays=${b01WestBays.length} tables=${b01WestTables.length} seats=${b01WestSeats.length} `+
  `defects=${b01WestDefects.join('|')||'-'}`);

const b04LiftDefects=[];
for(const floor of b04Plan?.floorsPlan||[]){
  const prefix=`B04/F${floor.level}/LIFT`,room=floor.rooms.find(candidate=>candidate.id===prefix),
    planning=room?.planning,turn=planning?.turns?.[0],route=planning?.publicRoutes?.[0],
    fixture=room?.contents.find(candidate=>candidate.id===`${prefix}/FIX`),scene=sceneForFloor('B04',floor.level),
    walk=scene&&cachedWalkMap(scene,b04Plan),turnBounds=turn&&[turn.centre[0]-turn.diameter/2,
      turn.centre[0]+turn.diameter/2,turn.centre[1]-turn.diameter/2,turn.centre[1]+turn.diameter/2],
    physical=(room?.contents||[]).filter(candidate=>candidate.collision!=='none'&&candidate.size[1]>.20&&
      prefabSpecs.get(candidate.prefab)?.anchor==='floor');
  if(room?.accessible!==true||fixture?.accessible!==true||turn?.diameter!==1.50||route?.width!==.90||
    !turnBounds||turnBounds[0]<room.bounds[0]||turnBounds[1]>room.bounds[1]||
    turnBounds[2]<room.bounds[2]||turnBounds[3]>room.bounds[3])b04LiftDefects.push(`${prefix}:metadata`);
  if(turnBounds)for(const candidate of physical)if(reviewRectOverlap(turnBounds,reviewHorizontalBounds(candidate)))
    b04LiftDefects.push(`${prefix}:turn-${candidate.id}`);
  const routeCentre=route&&[(route.bounds[0]+route.bounds[1])/2,(route.bounds[2]+route.bounds[3])/2];
  if(!walk||!turn||!walkReaches(scene,walk,turn.centre[0],turn.centre[1],.24)||!routeCentre||
    !walkReaches(scene,walk,routeCentre[0],routeCentre[1],.24))b04LiftDefects.push(`${prefix}:unreachable`);
}
check('all six B04 lift vestibules protect a real 1.50 m turn and 0.90 m threshold route',
  b04Plan?.floorsPlan.length===6&&b04LiftDefects.length===0,b04LiftDefects.slice(0,12).join(','));

// B06's old sanitary screen was only scenery. Lock the replacement as an enclosed, reachable
// WC on all four floors, including exact partition bodies and the unchanged core envelope/door.
const b06AccessPlan=plan.buildings.find(building=>building.id==='B06'),b06AccessDefects=[],
  b06AccessFieldIds=[];
for(const floor of b06AccessPlan?.floorsPlan||[]){
  const prefix=`B06/F${floor.level}/CORE-NE`,core=floor.rooms.find(room=>room.id===prefix),
    byId=new Map((core?.contents||[]).map(fixture=>[fixture.id,fixture])),scene=sceneForFloor('B06',floor.level),
    door=core?.doors?.[0],lift=byId.get(`${prefix}/LIFT`),entry=byId.get(`${prefix}/ENTRY-ROUTE`),
    liftRoute=byId.get(`${prefix}/LIFT-ROUTE`),liftTurn=byId.get(`${prefix}/LIFT-TURN`),
    wcRoute=byId.get(`${prefix}/WC-APPROACH`),wcTurn=byId.get(`${prefix}/WC-TURN`),
    wcDoor=byId.get(`${prefix}/WC-DOOR`),toilet=byId.get(`${prefix}/T1`),
    transfer=byId.get(`${prefix}/T1-TRANSFER`),basin=byId.get(`${prefix}/B1`),
    basinApproach=byId.get(`${prefix}/B1-APPROACH`),electrical=byId.get(`${prefix}/ELEC`),
    partitions=['WC-PARTITION-N','WC-PARTITION-WS','WC-PARTITION-WN'].map(id=>byId.get(`${prefix}/${id}`)),
    planning=core?.planning;
  b06AccessFieldIds.push(...[entry,liftRoute,liftTurn,wcRoute,wcTurn,transfer,basinApproach].filter(Boolean).map(row=>row.id));
  accessRequire(core?.accessible===true&&accessSame(core.bounds,[1.1,7.1,4.7,10.6])&&core?.doors?.length===1&&
    door?.id===`${prefix}/D-COR`&&door.side==='west'&&accessSame([door.at[0],door.at[2]],[1.1,5.70])&&
    door.at[1]===floor.elevation&&door.width===1.20&&door.destination===`B06/F${floor.level}/CORRIDOR`,
    b06AccessDefects,`${prefix}:protected-room-door`);
  accessRequire(accessFixtureMatches(lift,'PF-LIFT',[2.15,9.25],[1.65,2.45,1.55])&&lift.accessible===true&&
    accessFixtureMatches(entry,'PF-WALL-RUN',[1.85,5.70],[1.50,.02,.90])&&entry.clearWidth===.90&&
    accessFixtureMatches(liftRoute,'PF-WALL-RUN',[2.15,7.075],[.90,.022,2.75])&&liftRoute.clearWidth===.90&&
    accessFixtureMatches(liftTurn,'PF-WALL-RUN',[2.15,7.55],[1.50,.024,1.50])&&liftTurn.turningDiameter===1.50&&
    accessFixtureMatches(wcRoute,'PF-WALL-RUN',[3.25,5.45],[1.30,.02,.90])&&wcRoute.clearWidth===.90&&
    accessFixtureMatches(wcTurn,'PF-WALL-RUN',[4.70,5.46],[1.50,.024,1.50])&&wcTurn.turningDiameter===1.50,
    b06AccessDefects,`${prefix}:lift-route-turn`);
  accessRequire(accessFixtureMatches(partitions[0],'PF-WALL-RUN',[5.50,6.25],[3.20,2.70,.05])&&
    accessFixtureMatches(partitions[1],'PF-WALL-RUN',[3.90,4.85],[.10,2.70,.30])&&
    accessFixtureMatches(partitions[2],'PF-WALL-RUN',[3.90,6.062],[.10,2.70,.324])&&
    partitions.every(row=>row?.walkBlocker===true)&&!byId.has(`${prefix}/WC-SCREEN`)&&
    accessFixtureMatches(wcDoor,'PF-DOOR-SINGLE',[3.90,5.45],[.90,2.12,.08])&&
    Math.abs(wcDoor.yaw-Math.PI/2)<.001&&wcDoor.accessible===true&&wcDoor.clearWidth===.90&&
    wcDoor.operation==='sliding-pocket'&&wcDoor.pocketSide==='north'&&wcDoor.reviewOpen===true,
    b06AccessDefects,`${prefix}:physical-enclosure`);
  accessRequire(accessFixtureMatches(toilet,'PF-TOILET',[6.65,5.925],[.72,.78,.55])&&
    Math.abs(toilet.yaw-Math.PI)<.001&&toilet.accessible===true&&toilet.grabRails===true&&toilet.transferSide==='west'&&
    accessFixtureMatches(transfer,'PF-WALL-RUN',[5.69,5.75],[1.20,.025,.90])&&
    transfer.accessible===true&&accessSame(transfer.clearBay,[1.20,.90])&&
    accessFixtureMatches(basin,'PF-BASIN',[6.75,5.03],[.84,.88,.45])&&
    Math.abs(basin.yaw-Math.PI/2)<.001&&basin.accessible===true&&basin.facing==='west'&&
    accessFixtureMatches(basinApproach,'PF-WALL-RUN',[6.075,5.15],[.90,.022,.90])&&
    basinApproach.accessible===true&&accessSame(basinApproach.clearBay,[.90,.90])&&
    accessFixtureMatches(electrical,'PF-FILE-CABINET',[6.75,7.15],[.65,1.8,.35])&&
    Math.abs(electrical.yaw+Math.PI/2)<.001,b06AccessDefects,`${prefix}:sanitary-fixtures`);
  accessRequire(planning?.publicRoutes?.length===3&&
    planning.publicRoutes[0].id===entry?.id&&accessSame(planning.publicRoutes[0].bounds,[1.10,2.60,5.25,6.15])&&planning.publicRoutes[0].width===.90&&
    planning.publicRoutes[1].id===liftRoute?.id&&accessSame(planning.publicRoutes[1].bounds,[1.70,2.60,5.70,8.45])&&planning.publicRoutes[1].width===.90&&planning.publicRoutes[1].fixtureId===lift?.id&&
    planning.publicRoutes[2].id===wcRoute?.id&&accessSame(planning.publicRoutes[2].bounds,[2.60,3.90,5.00,5.90])&&planning.publicRoutes[2].width===.90&&planning.publicRoutes[2].doorId===wcDoor?.id&&
    planning?.turns?.length===2&&planning.turns[0].id===liftTurn?.id&&accessSame(planning.turns[0].centre,[2.15,7.55])&&planning.turns[0].diameter===1.50&&
    planning.turns[1].id===wcTurn?.id&&accessSame(planning.turns[1].centre,[4.70,5.46])&&planning.turns[1].diameter===1.50&&accessSame(planning.turns[1].enclosureBounds,[3.90,7.10,4.70,6.225])&&
    planning?.internalDoors?.length===1&&planning.internalDoors[0].id===wcDoor?.id&&planning.internalDoors[0].clearWidth===.90&&accessSame(planning.internalDoors[0].opening,[5.00,5.90])&&
    planning?.toiletTransfers?.length===1&&planning.toiletTransfers[0].id===transfer?.id&&planning.toiletTransfers[0].fixtureId===toilet?.id&&accessSame(planning.toiletTransfers[0].bounds,[5.09,6.29,5.30,6.20])&&planning.toiletTransfers[0].width===.90&&planning.toiletTransfers[0].depth===1.20&&planning.toiletTransfers[0].side==='west'&&
    planning?.basinApproaches?.length===1&&planning.basinApproaches[0].id===basinApproach?.id&&planning.basinApproaches[0].fixtureId===basin?.id&&accessSame(planning.basinApproaches[0].bounds,[5.625,6.525,4.70,5.60])&&planning.basinApproaches[0].width===.90&&planning.basinApproaches[0].depth===.90&&
    accessSame(planning?.enclosure?.bounds,[3.90,7.10,4.70,6.225])&&planning.enclosure.opaque===true&&
    JSON.stringify(planning.enclosure.walkBlockerIds)===JSON.stringify(partitions.map(row=>row?.id)),
    b06AccessDefects,`${prefix}:planning`);
  for(const partition of partitions){
    const bodies=(scene?.solids||[]).filter(body=>body.fixtureId===partition?.id&&body.walkBlocker===true);
    if(bodies.length!==1)b06AccessDefects.push(`${partition?.id||prefix}:runtime-body-${bodies.length}`);
  }
}
check('all four B06 cores preserve the exact enclosed accessible WC, lift route, turns and transfers',
  b06AccessPlan?.floorsPlan.length===4&&b06AccessDefects.length===0,b06AccessDefects.slice(0,18).join(','));

// B07 has intentionally shared lift landings because its protected lift rooms cannot contain a
// 1.50 m circle. Freeze the real corridor cut, every programme-room field and the clinic screen.
const b07AccessPlan=plan.buildings.find(building=>building.id==='B07'),b07AccessDefects=[],
  b07FieldContracts=[
    ['B07/F1/SC-MULTI/ACCESS-ROUTE',[2.25,3.15,-1.60,-.75],'clearWidth',.90],
    ['B07/F1/SC-MULTI/TURN',[1.95,3.45,-2.35,-.85],'turningDiameter',1.50],
    ['B07/F1/CL-WAIT/ACCESS',[-4.90,-3.40,1.50,3.00],'turningDiameter',1.50],
    ['B07/F1/CL-WAIT/ENTRY-ROUTE',[-6.10,-4.90,1.95,3.05],'clearWidth',1.10],
    ['B07/F1/CL-WAIT/COR-ROUTE',[-3.40,-2.50,.75,2.25],'clearWidth',.90],
    ['B07/F1/CL-WAIT/TREAT-ROUTE-W',[-4.60,-3.50,2.35,3.25],'clearWidth',1.10],
    ['B07/F1/CL-WAIT/TREAT-ROUTE-N',[-4.40,-2.20,3.25,4.35],'clearWidth',1.10],
    ['B07/F1/CL-WAIT/REC-APPROACH',[-5.35,-4.45,2.61,3.81],'clearBay',[.90,1.20]],
    ['B07/F1/LIFT/TURN',[1.65,3.15,-.75,.75],'turningDiameter',1.50],
    ['B07/F1/LIFT/ACCESS-ROUTE',[2.40,3.80,-1.00,-.10],'clearWidth',.90],
    ['B07/F2/DANCE/ACCESS-ROUTE',[2.10,3.00,-2.05,-1.10],'clearWidth',.90],
    ['B07/F2/DANCE/TURN',[1.80,3.30,-2.80,-1.30],'turningDiameter',1.50],
    ['B07/F2/SC-WC/ACCESS-ROUTE',[-4.70,-3.80,-.45,.45],'clearWidth',.90],
    ['B07/F2/SC-WC/TURN',[-5.35,-3.85,-.75,.75],'turningDiameter',1.50],
    ['B07/F2/SC-WC/T-TRANSFER',[-5.35,-4.15,-.88,.02],'clearBay',[1.20,.90]],
    ['B07/F2/LIFT/TURN',[1.65,3.15,-.75,.75],'turningDiameter',1.50],
    ['B07/F2/LIFT/ACCESS-ROUTE',[2.40,3.80,-1.00,-.10],'clearWidth',.90],
    ['B07/F3/PROJECT/ACCESS-ROUTE',[2.25,3.15,-1.90,-1.10],'clearWidth',.90],
    ['B07/F3/PROJECT/TURN',[1.80,3.30,-2.65,-1.15],'turningDiameter',1.50],
    ['B07/F3/HEALTH/ACCESS-ROUTE',[-3.75,-1.10,1.10,2.00],'clearWidth',.90],
    ['B07/F3/HEALTH/DEMO-ROUTE',[-2.00,-1.10,1.55,2.45],'clearWidth',.90],
    ['B07/F3/HEALTH/ACCESS',[-4.50,-3.00,1.20,2.70],'turningDiameter',1.50],
    ['B07/F3/HEALTH/DEMO-APPROACH',[-2.21,-1.01,2.45,3.35],'clearBay',[1.20,.90]],
    ['B07/F3/LIFT/TURN',[1.65,3.15,-.75,.75],'turningDiameter',1.50],
    ['B07/F3/LIFT/ACCESS-ROUTE',[2.40,3.80,-1.00,-.10],'clearWidth',.90],
  ],b07AllFixtures=(b07AccessPlan?.floorsPlan||[]).flatMap(floor=>
    floor.rooms.flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])),
  b07ById=new Map(b07AllFixtures.map(fixture=>[fixture.id,fixture]));
for(const [id,bounds,metric,value] of b07FieldContracts){
  const field=b07ById.get(id);
  accessRequire(field?.prefab==='PF-WALL-RUN'&&field.accessible===true&&field.collision==='none'&&
    field.size[1]===.022&&accessSame(reviewHorizontalBounds(field),bounds)&&
    (Array.isArray(value)?accessSame(field[metric],value):field[metric]===value),b07AccessDefects,`${id}:field-contract`);
}
const b07RoomContracts=[
  [1,'SC-MULTI',[1.8,3.6,-5.1,-.75],[['TO-COR','north',2.70,-.75,1.20,'B07/F1/DUAL-COR']]],
  [1,'CL-WAIT',[-6.1,-2.2,.75,5.1],[['EXT','west',-6.5,2.5,2.20,'campus','portal'],['TO-COR','south',-2.80,.75,1.20,'B07/F1/DUAL-COR'],['TO-TREAT','east',-2.20,3.80,1.10,'B07/F1/CL-TREAT']]],
  [2,'DANCE',[-6.1,3.6,-5.1,-1.1],[['TO-COR-W','north',-3.20,-1.10,1.20,'B07/F2/DUAL-COR','open-pocket'],['TO-COR-E','north',2.70,-1.10,1.20,'B07/F2/DUAL-COR','open-pocket']]],
  [2,'SC-WC',[-6.1,-3.8,-.9,.8],[['TO-COR','east',-3.80,0,1.0,'B07/F2/DUAL-COR']]],
  [3,'PROJECT',[-1.2,3.6,-5.1,-1.1],[['TO-COR','north',2.70,-1.10,1.20,'B07/F3/DUAL-COR']]],
  [3,'HEALTH',[-6.1,-.8,1.1,5.1],[['TO-COR','south',-1.55,1.10,1.20,'B07/F3/DUAL-COR','open-pocket']]],
];
for(const [level,suffix,bounds,doors] of b07RoomContracts){
  const floor=b07AccessPlan?.floorsPlan.find(row=>row.level===level),prefix=`B07/F${level}/${suffix}`,
    room=floor?.rooms.find(row=>row.id===prefix);
  accessRequire(room?.accessible===true&&accessSame(room.bounds,bounds)&&room.doors.length===doors.length&&
    doors.every(([doorSuffix,side,x,z,width,destination,mode])=>{const door=room.doors.find(row=>row.id===`${prefix}/${doorSuffix}`);
      return door?.side===side&&accessSame([door.at[0],door.at[2]],[x,z])&&door.at[1]===floor.elevation&&
        door.width===width&&door.destination===destination&&
        (mode!=='portal'||door.portal===true)&&(mode!=='open-pocket'||door.operation==='sliding-pocket'&&door.reviewOpen===true);
    }),b07AccessDefects,`${prefix}:protected-room-door`);
}
for(const level of [1,2,3]){
  const floor=b07AccessPlan?.floorsPlan.find(row=>row.level===level),prefix=`B07/F${level}`,
    lift=floor?.rooms.find(room=>room.id===`${prefix}/LIFT`),liftFix=lift?.contents.find(row=>row.id===`${prefix}/LIFT/FIX`),
    circulation=floor?.circulation.find(row=>row.id===`${prefix}/LIFT/ACCESS-ROUTE`),planning=floor?.planning,
    scene=sceneForFloor('B07',level),liftDoors=[
      ['TO-COR','west',3.80,-.65,`${prefix}/DUAL-COR`],['TO-STAIR-S','south',4.95,-2.40,`${prefix}/STAIR-S`],
      ['TO-STAIR-N','north',4.95,.80,`${prefix}/STAIR-N`],
    ];
  accessRequire(lift?.accessible===true&&accessSame(lift.bounds,[3.8,6.1,-2.4,.8])&&lift.doors.length===3&&
    liftDoors.every(([suffix,side,x,z,destination])=>{const door=lift.doors.find(row=>row.id===`${prefix}/LIFT/${suffix}`);
      return door?.side===side&&accessSame([door.at[0],door.at[2]],[x,z])&&door.at[1]===floor.elevation&&
        door.width===1.20&&door.destination===destination&&door.fireRated===true;})&&
    accessFixtureMatches(liftFix,'PF-LIFT',[5.18,-.72],[1.65,2.45,1.45])&&liftFix.accessible===true&&
    circulation?.clearWidth===.90&&circulation.accessible===true&&accessSame(circulation.bounds,[2.40,3.80,-1.00,-.10]),
    b07AccessDefects,`${prefix}/LIFT:protected-contract`);
  accessRequire(planning?.publicRoutes?.length===1&&planning.publicRoutes[0].id===`${prefix}/LIFT/ACCESS-ROUTE`&&
    accessSame(planning.publicRoutes[0].bounds,[2.40,3.80,-1.00,-.10])&&planning.publicRoutes[0].width===.90&&
    planning.publicRoutes[0].throughDoorId===`${prefix}/LIFT/TO-COR`&&planning.publicRoutes[0].fixtureId===liftFix?.id&&
    planning?.turns?.length===1&&planning.turns[0].id===`${prefix}/LIFT/TURN`&&
    accessSame(planning.turns[0].centre,[2.40,0])&&accessSame(planning.turns[0].bounds,[1.65,3.15,-.75,.75])&&
    planning.turns[0].diameter===1.50&&planning.turns[0].serves===liftFix?.id&&
    planning?.clampMoveProof?.bodyRadius===.30&&accessSame(planning.clampMoveProof.start,[1.80,0])&&
    accessSame(planning.clampMoveProof.turnWitness,[2.40,0])&&accessSame(planning.clampMoveProof.doorRouteWitness,[3.35,-.55])&&
    planning.clampMoveProof.targetFixtureId===liftFix?.id&&
    lift?.planning?.floorSharedLanding?.turnId===`${prefix}/LIFT/TURN`&&
    lift.planning.floorSharedLanding.routeId===`${prefix}/LIFT/ACCESS-ROUTE`&&
    accessSame(lift.planning.floorSharedLanding.turnCentre,[2.40,0])&&lift.planning.floorSharedLanding.diameter===1.50&&
    lift.planning.floorSharedLanding.clearRouteWidth===.90,b07AccessDefects,`${prefix}/LIFT:planning`);
  const waypoints=[[1.50,0],[2.40,0],[2.40,-.65],[4.30,-.65]];let position=[...waypoints[0]],accepted=0,expected=0,maxError=0;
  for(let segment=1;scene&&segment<waypoints.length;segment++){
    const start=waypoints[segment-1],end=waypoints[segment],steps=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/.01);expected+=steps;
    for(let index=1;index<=steps;index++){
      const target=[start[0]+(end[0]-start[0])*index/steps,start[1]+(end[1]-start[1])*index/steps],
        moved=scene.clampMove(position[0],position[1],target[0],target[1],.30),error=Math.hypot(moved[0]-target[0],moved[1]-target[1]);
      maxError=Math.max(maxError,error);if(error<=1e-8)accepted++;position=moved;
    }
  }
  if(!scene||accepted!==expected||maxError>1e-8||position[0]<=lift.bounds[0]+.30)
    b07AccessDefects.push(`${prefix}/LIFT:clampMove-${accepted}/${expected}-${maxError}`);
}
const b07F1=b07AccessPlan?.floorsPlan.find(floor=>floor.level===1),b07Wait=b07F1?.rooms.find(room=>room.id==='B07/F1/CL-WAIT'),
  b07WaitById=new Map((b07Wait?.contents||[]).map(fixture=>[fixture.id,fixture])),
  b07Privacy=b07WaitById.get('B07/F1/CL-WAIT/TREAT-PRIVACY-RETURN'),b07WaitPlanning=b07Wait?.planning,
  b07Entry=b07F1?.visualReview?.entries?.find(entry=>entry.suffix==='clinic-entry'),b07Programme=b07F1?.visualReview?.programme,
  b07ScWc=b07AccessPlan?.floorsPlan.find(floor=>floor.level===2)?.rooms.find(room=>room.id==='B07/F2/SC-WC'),
  b07ScWcById=new Map((b07ScWc?.contents||[]).map(fixture=>[fixture.id,fixture]));
accessRequire(accessFixtureMatches(b07Privacy,'PF-WALL-RUN',[-2.85,3.10],[1.30,2.70,.10])&&
  b07Privacy.walkBlocker===true&&b07Privacy.architecturalOccluder===true&&b07Privacy.privacy===true&&
  b07Privacy.screensDoorId==='B07/F1/CL-WAIT/TO-TREAT'&&
  JSON.stringify(b07Privacy.witnessPose)===JSON.stringify({x:-4.10,z:3.50,yaw:-.32})&&
  JSON.stringify(b07WaitPlanning?.privacyVestibules?.[0])===JSON.stringify({
    id:'B07/F1/CL-WAIT/TREAT-PRIVACY-RETURN',doorId:'B07/F1/CL-WAIT/TO-TREAT',
    bounds:[-3.50,-2.20,3.05,3.15],opaque:true,fullHeight:2.70,clearRouteWidth:1.10,
    witnessPose:{x:-4.10,z:3.50,yaw:-.32}}),b07AccessDefects,'B07/F1/CL-WAIT:privacy-return');
accessRequire(JSON.stringify(b07Entry)===JSON.stringify({suffix:'clinic-entry',portalId:'B07/CLINIC',
  focusRoomId:'B07/F1/CL-WAIT',cameraZoneId:'B07/F1/CL-WAIT',focusAt:{x:-4.10,z:3.50,yaw:-.32},body:'hidden',
  focusFixtureIds:['B07/F1/CL-WAIT/REC','B07/F1/CL-WAIT/STATUS']})&&
  JSON.stringify(b07Programme)===JSON.stringify({roomId:'B07/F1/CL-PHARM',at:{x:2.27,z:3.30,yaw:.17},
    focusFixtureIds:['B07/F1/CL-PHARM/HEADER','B07/F1/CL-PHARM/TEMP']}),b07AccessDefects,'B07/F1:clinic-entry-semantics');
accessRequire(accessFixtureMatches(b07ScWcById.get('B07/F2/SC-WC/T'),'PF-TOILET',[-5.72,-.48],[.72,.78,.55])&&
  b07ScWcById.get('B07/F2/SC-WC/T')?.accessible===true&&b07ScWcById.get('B07/F2/SC-WC/T')?.grabRails===true&&
  accessFixtureMatches(b07ScWcById.get('B07/F2/SC-WC/B'),'PF-BASIN',[-5.85,.38],[.84,.88,.45])&&
  Math.abs(b07ScWcById.get('B07/F2/SC-WC/B')?.yaw-Math.PI/2)<.001&&
  b07ScWcById.get('B07/F2/SC-WC/B')?.accessible===true&&
  accessFixtureMatches(b07ScWcById.get('B07/F2/SC-WC/MIRROR'),'PF-WALL-RUN',[-6.065,.38],[.82,.82,.04])&&
  Math.abs(b07ScWcById.get('B07/F2/SC-WC/MIRROR')?.yaw-Math.PI/2)<.001,b07AccessDefects,'B07/F2/SC-WC:fixtures');
accessRequire(JSON.stringify(b07AccessPlan?.portals)===JSON.stringify([
  {id:'B07/STUDENT',campusAt:[30,27],campusReturn:[27.4,27,Math.PI/2],localSpawn:[-5.2,0,-1.5,Math.PI/2],placeKey:'campus_student_f1'},
  {id:'B07/CLINIC',campusAt:[30,31],campusReturn:[27.4,31,Math.PI/2],localSpawn:[-5.2,0,2.5,Math.PI/2],placeKey:'campus_clinic_f1'},
]),b07AccessDefects,'B07:protected-portals');
check('B07 rooms preserve exact accessible routes, turns, transfers, lift landings and clinic privacy semantics',
  b07AccessPlan?.floorsPlan.length===3&&b07AccessDefects.length===0,b07AccessDefects.slice(0,20).join(','));

const b06b07ExpectedFieldIds=new Set([...b06AccessFieldIds,...b07FieldContracts.map(([id])=>id)]),
  b06b07ActualFields=allFixtures.filter(fixture=>/^(?:B06|B07)\//.test(fixture.id)&&fixture.accessible===true&&
    fixture.collision==='none'&&(fixture.clearWidth!==undefined||fixture.turningDiameter!==undefined||Array.isArray(fixture.clearBay))),
  b06b07ClearanceDefects=[];
for(const building of [b06AccessPlan,b07AccessPlan].filter(Boolean))for(const floor of building.floorsPlan){
  const scene=sceneForFloor(building.id,floor.level),fixtures=floor.rooms.flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[]),
    physical=fixtures.filter(fixture=>(fixture.walkBlocker===true||fixture.collision!=='none')&&fixture.size[1]>.20&&
      prefabSpecs.get(fixture.prefab)?.anchor==='floor'),walk=scene&&cachedWalkMap(scene,building);
  for(const field of fixtures.filter(fixture=>b06b07ExpectedFieldIds.has(fixture.id))){
    const bounds=reviewHorizontalBounds(field),owner=floor.rooms.find(room=>(room.contents||[]).includes(field));
    if(owner&&(bounds[0]<owner.bounds[0]-.001||bounds[1]>owner.bounds[1]+.001||bounds[2]<owner.bounds[2]-.001||bounds[3]>owner.bounds[3]+.001))
      b06b07ClearanceDefects.push(`${field.id}:outside-${owner.id}`);
    for(const fixture of physical)if(reviewRectOverlap(bounds,reviewHorizontalBounds(fixture)))
      b06b07ClearanceDefects.push(`${field.id}:full-fixture-${fixture.id}`);
    for(const body of (scene?.solids||[]).filter(solid=>solid.fixtureId))
      if(reviewRectOverlap(bounds,[body.x0,body.x1,body.z0,body.z1]))
        b06b07ClearanceDefects.push(`${field.id}:runtime-body-${body.fixtureId}`);
    if(!walk||!walkReaches(scene,walk,field.at[0],field.at[2],.24))b06b07ClearanceDefects.push(`${field.id}:unreachable`);
  }
}
const b06b07ActualIds=new Set(b06b07ActualFields.map(field=>field.id));
check('all 53 B06/B07 access fields clear full fixture extents and runtime bodies and remain clampMove reachable',
  b06b07ExpectedFieldIds.size===53&&b06b07ActualIds.size===53&&
  [...b06b07ExpectedFieldIds].every(id=>b06b07ActualIds.has(id))&&b06b07ClearanceDefects.length===0,
  `expected=${b06b07ExpectedFieldIds.size} actual=${b06b07ActualIds.size} ${b06b07ClearanceDefects.slice(0,18).join(',')}`);
const b07ClinicScene=sceneForFloor('B07',1),b07ClinicPose=b07Entry?.focusAt||{},
  b07ClinicBack=b07ClinicScene&&b07Wait?reviewBack(b07ClinicScene,b07F1,b07Wait.bounds,b07ClinicPose):0,
  b07ClinicFront=b07ClinicScene&&b07Wait?reviewFront(b07ClinicScene,b07F1,b07Wait.bounds,b07ClinicPose):0,
  b07ClinicFocus=b07ClinicBack?reviewFocusEvidence(b07ClinicScene,b07F1,b07ClinicPose,b07ClinicBack,b07Entry.focusFixtureIds,1):{error:'no-back'},
  b07ClinicDoor=b07ClinicBack&&reviewForegroundDoor(b07ClinicScene,b07F1,b07ClinicPose,b07ClinicBack),
  b07ClinicIntrusion=b07ClinicBack&&reviewCameraFixtureIntrusion(b07ClinicScene,b07F1,b07ClinicPose,b07ClinicBack);
check('B07 clinic entry is a reachable, door-free registration composition behind the opaque return',
  b07ClinicBack>=REVIEW_BACK_MIN&&b07ClinicFront>=REVIEW_FRONT_MIN&&!b07ClinicFocus.error&&!b07ClinicDoor&&!b07ClinicIntrusion,
  `back=${b07ClinicBack} front=${b07ClinicFront.toFixed(2)} focus=${b07ClinicFocus.error||'ok'} `+
  `door=${b07ClinicDoor?.id||'none'} intrusion=${b07ClinicIntrusion?.id||'none'}`);

const portalContractLiteralDefects=Object.entries(PUBLIC_PORTAL_WIDTHS).filter(([id,width])=>
  !coreJs.includes(`'${id}':${String(width).replace(/^0/,'')}`));
check('public portal apertures use the explicit immutable core width contract',
  /const PUBLIC_PORTAL_WIDTHS=Object\.freeze\(\{/.test(coreJs)&&portalContractLiteralDefects.length===0,
  portalContractLiteralDefects.map(([id,width])=>`${id}:${width}`).join(','));
const portalAlmost=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance,
  portalSpanMatches=(actual,expected)=>Array.isArray(actual)&&actual.length===2&&
    portalAlmost(actual[0],expected[0])&&portalAlmost(actual[1],expected[1]),
  portalClosedRuns=(lo,hi,openings)=>{const merged=[];
    for(const interval of openings.map(span=>[...span]).sort((a,b)=>a[0]-b[0])){
      const last=merged.at(-1);if(last&&interval[0]<=last[1]+.001)last[1]=Math.max(last[1],interval[1]);
      else merged.push(interval);
    }
    const runs=[];let cursor=lo;for(const [a,b] of merged){if(a>cursor+.001)runs.push([cursor,a]);cursor=Math.max(cursor,b);}
    if(cursor<hi-.001)runs.push([cursor,hi]);return runs;
  },portalLinearMove=(scene,start,end,radius=.30)=>{
    const distance=Math.hypot(end[0]-start[0],end[1]-start[1]),steps=Math.max(1,Math.ceil(distance/.01));
    let position=[...start],maxError=0,accepted=0;
    for(let index=1;index<=steps;index++){
      const target=[start[0]+(end[0]-start[0])*index/steps,start[1]+(end[1]-start[1])*index/steps],
        moved=scene.clampMove(position[0],position[1],target[0],target[1],radius),
        error=Math.hypot(moved[0]-target[0],moved[1]-target[1]);
      maxError=Math.max(maxError,error);if(error<=1e-8)accepted++;position=moved;
    }
    return{position,maxError,accepted,steps};
  };
const portalShellDefects=[],portalAssemblyDefects=[],portalMovementDefects=[],portalFrustumDefects=[];
let checkedPublicPortals=0;
for(const [,scene] of scenes){
  const floor=scene.blueprintFloor;if(floor.level!==1)continue;
  const building=plan.buildings.find(candidate=>candidate.id===scene.buildingId),
    geometries=building.portals.filter(portal=>portal.localSpawn)
      .map(portal=>expectedPublicPortalGeometry(building,portal)),[x0,x1,z0,z1]=building.localBounds,
    sideSpecs=[['south',x0,x1,false,z0,z0+.03],['north',x0,x1,false,z1,z1-.03],
      ['west',z0,z1,true,x0,x0+.03],['east',z0,z1,true,x1,x1-.03]];
  for(const [side,lo,hi,vertical,fixed,trimFixed] of sideSpecs){
    const openings=geometries.filter(geometry=>geometry.side===side).map(geometry=>geometry.opening),
      expectedRuns=portalClosedRuns(lo,hi,openings),expectedBaseRuns=expectedRuns.map(([a,b])=>
        [Math.max(a,lo+.10),Math.min(b,hi-.10)]).filter(([a,b])=>b>a+.001),
      wallRunProps=scene.props.filter(prop=>prop.shell===true&&prop.shellSide===side&&prop.shellPart==='run')
        .sort((a,b)=>a.shellSpan[0]-b.shellSpan[0]),wallRuns=wallRunProps.map(prop=>prop.shellSpan),
      bodyRunRows=scene.solids.filter(solid=>solid.shell===true&&solid.shellSide===side&&solid.shellPart==='run')
        .sort((a,b)=>a.shellSpan[0]-b.shellSpan[0]),bodyRuns=bodyRunRows.map(solid=>solid.shellSpan),
      baseRunProps=scene.props.filter(prop=>prop.shell===true&&prop.shellSide===side&&prop.shellPart==='base')
        .sort((a,b)=>a.shellSpan[0]-b.shellSpan[0]),baseRuns=baseRunProps.map(prop=>prop.shellSpan),
      cameraRunRows=scene.blockers.filter(blocker=>blocker.shell===true&&blocker.shellSide===side&&
        blocker.shellPart==='run').sort((a,b)=>a.shellSpan[0]-b.shellSpan[0]),
      cameraRuns=cameraRunRows.map(blocker=>blocker.shellSpan),
      coves=scene.props.filter(prop=>prop.shell===true&&prop.shellSide===side&&prop.shellPart==='cove'),
      spansEqual=(actual,expected)=>actual.length===expected.length&&
        actual.every((span,index)=>portalSpanMatches(span,expected[index])),
      wallGeometry=wallRunProps.every((prop,index)=>{const span=expectedRuns[index]||[],m=prop.m,
        along=vertical?m&&m[14]:m&&m[12],actualFixed=vertical?m&&m[12]:m&&m[14],
        length=m&&Math.hypot(m[0],m[1],m[2]),height=m&&Math.hypot(m[8],m[9],m[10]);
        return m&&portalAlmost(along,(span[0]+span[1])/2)&&portalAlmost(actualFixed,fixed)&&
          portalAlmost(length,span[1]-span[0])&&portalAlmost(m[13],scene.H/2)&&portalAlmost(height,scene.H);
      }),bodyGeometry=bodyRunRows.every((body,index)=>{const [a,b]=expectedRuns[index]||[],expected=vertical?
          [fixed-.16,fixed+.16,a,b]:[a,b,fixed-.16,fixed+.16];
        return[body.x0,body.x1,body.z0,body.z1].every((value,axis)=>portalAlmost(value,expected[axis]));
      }),baseGeometry=baseRunProps.every((prop,index)=>{const [a,b]=expectedBaseRuns[index]||[],ob=prop.ob,
        along=vertical?ob&&ob.z:ob&&ob.x,actualFixed=vertical?ob&&ob.x:ob&&ob.z,
        length=vertical?ob&&ob.sz:ob&&ob.sx,depth=vertical?ob&&ob.sx:ob&&ob.sz;
        return ob&&portalAlmost(along,(a+b)/2)&&portalAlmost(actualFixed,trimFixed)&&
          portalAlmost(length,b-a)&&portalAlmost(depth,.07)&&portalAlmost(ob.sy,.15);
      }),cameraGeometry=cameraRunRows.every((camera,index)=>{const [a,b]=expectedRuns[index]||[],expected=vertical?
          [fixed-.16,fixed+.16,a,b]:[a,b,fixed-.16,fixed+.16];
        return[camera.x0,camera.x1,camera.z0,camera.z1].every((value,axis)=>portalAlmost(value,expected[axis]))&&
          portalAlmost(camera.top,scene.H);
      }),coveGeometry=coves.length===1&&coves[0].ob&&portalAlmost(vertical?coves[0].ob.x:coves[0].ob.z,trimFixed)&&
        portalAlmost(vertical?coves[0].ob.z:coves[0].ob.x,(lo+hi)/2)&&
        portalAlmost(vertical?coves[0].ob.sz:coves[0].ob.sx,hi-lo-.20)&&
        portalAlmost(coves[0].ob.y,scene.H-.09)&&portalAlmost(coves[0].ob.sy,.10)&&
        coves[0].ob.y-coves[0].ob.sy/2>PUBLIC_PORTAL_HEIGHT;
    if(!spansEqual(wallRuns,expectedRuns)||!spansEqual(bodyRuns,expectedRuns)||
      !spansEqual(baseRuns,expectedBaseRuns)||!spansEqual(cameraRuns,expectedRuns)||
      !wallGeometry||!bodyGeometry||!baseGeometry||!cameraGeometry||!coveGeometry)
      portalShellDefects.push(`${building.id}/${side}:wall=${JSON.stringify(wallRuns)} body=${JSON.stringify(bodyRuns)} `+
        `base=${JSON.stringify(baseRuns)} camera=${JSON.stringify(cameraRuns)} expected=${JSON.stringify(expectedRuns)} `+
        `geometry=${wallGeometry}/${bodyGeometry}/${baseGeometry}/${cameraGeometry}/${coveGeometry}`);
  }
  for(const geometry of geometries){
    checkedPublicPortals++;
    const portal=geometry.portal,leaf=scene.props.filter(prop=>prop.tag===`${portal.id}/DOOR`&&prop.doorLeaf===true),
      sidelights=scene.props.filter(prop=>prop.portalId===portal.id&&prop.portalPart==='sidelight'),
      mullions=scene.props.filter(prop=>prop.portalId===portal.id&&prop.portalPart==='mullion'),
      jambs=scene.props.filter(prop=>prop.portalId===portal.id&&prop.portalPart==='jamb'),
      heads=scene.props.filter(prop=>prop.portalId===portal.id&&prop.portalPart==='head'),
      pulls=scene.props.filter(prop=>prop.portalId===portal.id&&prop.portalPart==='pull'),
      shellHeads=scene.props.filter(prop=>prop.portalId===portal.id&&prop.shellPart==='head'),
      glassSpan=geometry.width-.20,expectedLeafWidth=Math.min(1.35,glassSpan),
      expectedSidelights=(glassSpan-expectedLeafWidth)/2>.055+.08?2:0,
      alongSize=prop=>geometry.vertical?prop.ob&&prop.ob.sz:prop.ob&&prop.ob.sx,
      alongCentre=prop=>geometry.vertical?prop.ob&&prop.ob.z:prop.ob&&prop.ob.x,
      assembly=[...leaf,...sidelights,...mullions],assemblyLo=Math.min(...assembly.map(prop=>
        alongCentre(prop)-alongSize(prop)/2)),assemblyHi=Math.max(...assembly.map(prop=>
        alongCentre(prop)+alongSize(prop)/2)),jambLo=Math.min(...jambs.map(prop=>
        alongCentre(prop)-alongSize(prop)/2)),jambHi=Math.max(...jambs.map(prop=>
        alongCentre(prop)+alongSize(prop)/2)),shellHead=shellHeads[0],shellHeadMatrix=shellHead&&shellHead.m,
      shellHeadLength=shellHeadMatrix&&Math.hypot(shellHeadMatrix[0],shellHeadMatrix[1],shellHeadMatrix[2]),
      shellHeadHeight=shellHeadMatrix&&Math.hypot(shellHeadMatrix[8],shellHeadMatrix[9],shellHeadMatrix[10]),
      shellHeadAlong=geometry.vertical?shellHeadMatrix&&shellHeadMatrix[14]:shellHeadMatrix&&shellHeadMatrix[12],
      shellHeadFixed=geometry.vertical?shellHeadMatrix&&shellHeadMatrix[12]:shellHeadMatrix&&shellHeadMatrix[14];
    if(leaf.length!==1||!leaf[0].ob||!portalAlmost(leaf[0].ob.x,geometry.x)||
      !portalAlmost(leaf[0].ob.z,geometry.z)||!portalAlmost(alongSize(leaf[0]),expectedLeafWidth)||
      !portalAlmost(leaf[0].ob.sy,2.16)||!portalAlmost(leaf[0].portalOpeningWidth,geometry.width)||
      !portalAlmost(leaf[0].alpha,.54)||leaf[0].portalPart!=='leaf'||sidelights.length!==expectedSidelights||
      !sidelights.every(prop=>portalAlmost(prop.alpha,.54))||
      mullions.length!==expectedSidelights||jambs.length!==2||heads.length!==1||pulls.length!==2||
      !portalAlmost(assemblyLo,geometry.opening[0]+.10)||!portalAlmost(assemblyHi,geometry.opening[1]-.10)||
      !portalAlmost(jambLo,geometry.opening[0])||!portalAlmost(jambHi,geometry.opening[1])||
      !portalAlmost(alongCentre(heads[0]),geometry.along)||!portalAlmost(alongSize(heads[0]),geometry.width)||
      shellHeads.length!==1||!portalSpanMatches(shellHeads[0].shellSpan,geometry.opening)||
      !portalAlmost(shellHeads[0].shellBottom,geometry.height)||!portalAlmost(shellHeads[0].shellTop,scene.H)||
      !portalAlmost(shellHeadAlong,geometry.along)||!portalAlmost(shellHeadFixed,geometry.fixed)||
      !portalAlmost(shellHeadLength,geometry.width)||!portalAlmost(shellHeadHeight,scene.H-geometry.height)||
      !portalAlmost(shellHeadMatrix&&shellHeadMatrix[13],geometry.height+(scene.H-geometry.height)/2))
      portalAssemblyDefects.push(`${portal.id}:leaf=${leaf.length}/${leaf[0]&&alongSize(leaf[0])} `+
        `sidelights=${sidelights.length}/${expectedSidelights} mullions=${mullions.length} `+
        `jambs=${jambs.length} heads=${heads.length}/${shellHeads.length} pulls=${pulls.length} `+
        `span=${assemblyLo}..${assemblyHi}`);

    const halfDepth=.04,expectedBounds=geometry.vertical?
      [geometry.x-halfDepth,geometry.x+halfDepth,geometry.opening[0],geometry.opening[1]]:
      [geometry.opening[0],geometry.opening[1],geometry.z-halfDepth,geometry.z+halfDepth],
      boundaryBodies=scene.solids.filter(solid=>solid.portalBoundary===true&&solid.portalId===portal.id),
      boundaryCameras=scene.blockers.filter(blocker=>blocker.portalBoundary===true&&blocker.portalId===portal.id),
      boundsMatch=body=>body&&[body.x0,body.x1,body.z0,body.z1].every((value,index)=>
        portalAlmost(value,expectedBounds[index])),ordinaryBodies=scene.solids.filter(solid=>!solid.portalBoundary&&
        (geometry.vertical?Math.min(solid.x1,geometry.fixed+.10)-Math.max(solid.x0,geometry.fixed-.10)>.01&&
          Math.min(solid.z1,geometry.opening[1])-Math.max(solid.z0,geometry.opening[0])>.01:
          Math.min(solid.z1,geometry.fixed+.10)-Math.max(solid.z0,geometry.fixed-.10)>.01&&
          Math.min(solid.x1,geometry.opening[1])-Math.max(solid.x0,geometry.opening[0])>.01)),
      ordinaryBlockers=scene.blockers.filter(blocker=>!blocker.portalBoundary&&
        (geometry.vertical?Math.min(blocker.x1,geometry.fixed+.10)-Math.max(blocker.x0,geometry.fixed-.10)>.01&&
          Math.min(blocker.z1,geometry.opening[1])-Math.max(blocker.z0,geometry.opening[0])>.01:
          Math.min(blocker.z1,geometry.fixed+.10)-Math.max(blocker.z0,geometry.fixed-.10)>.01&&
          Math.min(blocker.x1,geometry.opening[1])-Math.max(blocker.x0,geometry.opening[0])>.01)),
      opaquePlanes=scene.props.filter(prop=>prop.mesh==='quad'&&prop.m&&
        (prop.alpha===undefined||prop.alpha>=.55)).filter(prop=>{const vertices=[[-.5,0,-.5],[.5,0,-.5],
          [.5,0,.5],[-.5,0,.5]].map(vertex=>reviewTransform(prop.m,...vertex)),
          fixedValues=vertices.map(point=>geometry.vertical?point[0]:point[2]),
          alongValues=vertices.map(point=>geometry.vertical?point[2]:point[0]),ys=vertices.map(point=>point[1]);
        return Math.max(...fixedValues)-Math.min(...fixedValues)<.04&&
          Math.abs((Math.max(...fixedValues)+Math.min(...fixedValues))/2-geometry.fixed)<.03&&
          Math.min(Math.max(...alongValues),geometry.opening[1])-
            Math.max(Math.min(...alongValues),geometry.opening[0])>.01&&
          Math.min(...ys)<geometry.height-.01&&Math.max(...ys)>.05;
      });
    if(boundaryBodies.length!==1||!boundsMatch(boundaryBodies[0])||boundaryBodies[0]?.transparent!==true||
      boundaryCameras.length!==1||!boundsMatch(boundaryCameras[0])||!portalAlmost(boundaryCameras[0]?.pad,.05)||
      !portalAlmost(boundaryCameras[0]?.top,scene.H)||ordinaryBodies.length||ordinaryBlockers.length||opaquePlanes.length)
      portalShellDefects.push(`${portal.id}:body=${boundaryBodies.length}/${boundsMatch(boundaryBodies[0])} `+
        `camera=${boundaryCameras.length}/${boundsMatch(boundaryCameras[0])} `+
        `ordinaryBodies=${ordinaryBodies.map(solid=>solid.partitionId||solid.shellSide||'?').join('|')||'-'} `+
        `ordinaryBlockers=${ordinaryBlockers.map(blocker=>blocker.shellSide||'?').join('|')||'-'} `+
        `opaquePlanes=${opaquePlanes.map(prop=>prop.tag||'?').join('|')||'-'}`);

    const contact=[geometry.x+geometry.ix*(halfDepth+.30),geometry.z+geometry.iz*(halfDepth+.30)],
      approach=[contact[0]+geometry.ix*.03,contact[1]+geometry.iz*.03],
      insideProof=portalLinearMove(scene,[portal.localSpawn[0],portal.localSpawn[2]],approach),
      outsideTarget=[geometry.x-geometry.ix*.80,geometry.z-geometry.iz*.80],
      boundaryProof=portalLinearMove(scene,approach,outsideTarget),
      atContact=Math.hypot(boundaryProof.position[0]-contact[0],boundaryProof.position[1]-contact[1]),
      exitThings=scene.things.filter(thing=>thing.portalId===portal.id&&thing.exit&&thing.exit.place==='campus'),
      exitThing=exitThings[0],returnAt=portal.campusReturn,
      cameraOrigin=[geometry.x+geometry.ix*.80,1.60,geometry.z+geometry.iz*.80],
      cameraLimit=reviewCameraBlockLimit(cameraOrigin,[-geometry.ix,0,-geometry.iz],1.60,scene.blockers);
    if(insideProof.accepted!==insideProof.steps||insideProof.maxError>1e-8||atContact>1e-8||
      exitThings.length!==1||!exitThing||!portalAlmost(exitThing.pos[0],geometry.x)||
      !portalAlmost(exitThing.pos[2],geometry.z)||!returnAt||!portalAlmost(exitThing.exit.at.x,returnAt[0])||
      !portalAlmost(exitThing.exit.at.z,returnAt[1])||!portalAlmost(exitThing.exit.at.yaw,returnAt[2])||
      !(cameraLimit<.80))portalMovementDefects.push(`${portal.id}:inside=${insideProof.accepted}/${insideProof.steps} `+
        `error=${insideProof.maxError} stop=${boundaryProof.position.join(',')}/${contact.join(',')} `+
        `exit=${exitThings.length} camera=${cameraLimit}`);

    const isolated={...scene,props:leaf,solids:scene.solids},outwardYaw=Math.atan2(-geometry.ix,-geometry.iz),
      hit=reviewForegroundDoor(isolated,floor,{x:geometry.x,z:geometry.z,yaw:outwardYaw},1.4);
    if(!hit||hit.id!==`${portal.id}/DOOR`)portalFrustumDefects.push(`${portal.id}:${hit&&hit.id||'hidden'}`);
  }
}
check('public portal wall, body, blocker and skirting runs split at every exact aperture',
  checkedPublicPortals===9&&portalShellDefects.length===0,
  `portals=${checkedPublicPortals} ${portalShellDefects.slice(0,12).join(',')}`);
check('public entrances compose bounded leaves, sidelights, frames and real lintels',
  portalAssemblyDefects.length===0,portalAssemblyDefects.slice(0,12).join(','));
check('public portal movement stops on the glazed boundary while every campus exit remains usable',
  portalMovementDefects.length===0,portalMovementDefects.slice(0,12).join(','));
check('native review frustum sees every public leaf through its genuine shell aperture',
  portalFrustumDefects.length===0,portalFrustumDefects.slice(0,12).join(','));

for(const building of plan.buildings){
  const entries=[];
  for(const floor of building.floorsPlan){
    if(floor.level>1&&floor.visualReview&&floor.visualReview.entry&&floor.visualReview.entry.at)
      entries.push({level:floor.level,suffix:'entry',pose:floor.visualReview.entry.at});
    if(floor.level===1&&floor.visualReview&&Array.isArray(floor.visualReview.entries))
      for(const entry of floor.visualReview.entries)if(entry&&entry.focusAt)
        entries.push({level:floor.level,suffix:entry.suffix,pose:entry.focusAt});
  }
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j],distance=Math.hypot(a.pose.x-b.pose.x,a.pose.z-b.pose.z),
      yawDelta=Math.abs(Math.atan2(Math.sin(a.pose.yaw-b.pose.yaw),Math.cos(a.pose.yaw-b.pose.yaw)));
    if(distance<.75&&yawDelta<.20)
      compositionDefects.push(`${building.id}:entry-${a.level}-${a.suffix}/entry-${b.level}-${b.suffix}-same-pose`);
  }
}

const requiredVisualReviewFloors=plan.buildings.flatMap(b=>b.floorsPlan.map(f=>`${b.id}/F${f.level}`)),
  missingVisualReviewFloors=requiredVisualReviewFloors
  .filter(key=>!authoredVisualReviewFloors.has(key));
check('every university floor has a curated programme review pose',missingVisualReviewFloors.length===0,
  missingVisualReviewFloors.join(','));
check('curated programme review poses are body-clear with open front and rear sightlines',
  visualReviewDefects.length===0,visualReviewDefects.slice(0,64).join(','));
const requiredEntryReviewFloors=plan.buildings.flatMap(b=>b.floorsPlan.filter(f=>f.level>1).map(f=>`${b.id}/F${f.level}`)),
  missingEntryReviewFloors=requiredEntryReviewFloors.filter(key=>!authoredEntryReviewFloors.has(key));
check('every occupied upper floor has a curated arrival review pose',missingEntryReviewFloors.length===0,
  missingEntryReviewFloors.join(','));
check('curated upper-floor arrival poses stay within their zones with clear paths and sightlines',
  entryReviewDefects.length===0,entryReviewDefects.slice(0,64).join(','));
check('entry, clinic and programme reviews use distinct authored compositions',
  compositionDefects.length===0,compositionDefects.slice(0,64).join(','));
const approvedOpenPocketDoorIds=new Set([
  'B02/F1/LOBBY/IN',
  'B03/F1/SERVE/STORE','B03/F1/STORE/SERVICE',
  'B03/F1/SERVE/CLEAN-PASS','B03/F1/KITCHEN/CLEAN-PASS',
  'B07/F2/DANCE/TO-COR-W','B07/F2/DANCE/TO-COR-E',
  'B07/F3/MEDIA/TO-COR','B07/F3/HEALTH/TO-COR',
]),unmarkedDoorScenes=[],openPocketDefects=[],pocketOpeningDefects=[],pocketCavityDefects=[],
  b03PocketPairDefects=[],publicPortalAliasDefects=[],seenApprovedOpenPocketDoorIds=new Set();
const reviewOpeningComponent=(intervals,centre)=>{const merged=[];
  for(const interval of intervals.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){
    const last=merged.at(-1);if(last&&interval[0]<=last[1]+1e-8)last[1]=Math.max(last[1],interval[1]);
    else merged.push([...interval]);
  }
  return merged.find(([a,b])=>centre>=a-1e-8&&centre<=b+1e-8)||null;
};
let ordinaryDoorLeafProof=null,b07LobbyCommonsDedupProof=false;
for(const [,scene] of scenes){
  const floor=scene.blueprintFloor,building=plan.buildings.find(b=>b.id===scene.buildingId),
    roomDoorRows=floor.rooms.flatMap(room=>(room.doors||[]).map(door=>({room,door}))),
    roomDoors=roomDoorRows.map(row=>row.door),
    fixtureDoors=floor.rooms.flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])
      .filter(f=>f.prefab==='PF-DOOR-SINGLE'||f.prefab==='PF-DOOR-DOUBLE'),
    roomById=new Map(floor.rooms.map(room=>[room.id,room])),roundedDoorValue=value=>Math.round(value*1000)/1000,
    exactPhysicalKey=door=>{const vertical=door.side==='west'||door.side==='east',
      fixed=vertical?door.at[0]:door.at[2],along=vertical?door.at[2]:door.at[0],
      rounded=roundedDoorValue;
      return`${vertical?'v':'h'}:${rounded(fixed)}:${rounded(along)}:${rounded(door.width||.9)}`;},
    physicalKeyByDoor=new Map(),roomDoorGroups=new Map();
  for(const {room,door} of roomDoorRows){
    if(physicalKeyByDoor.has(door))continue;
    const vertical=door.side==='west'||door.side==='east',fixed=vertical?door.at[0]:door.at[2],
      along=vertical?door.at[2]:door.at[0],destination=roomById.get(door.destination),
      reciprocal=destination&&(destination.doors||[]).find(other=>{
        const otherVertical=other.side==='west'||other.side==='east',otherFixed=otherVertical?other.at[0]:other.at[2],
          otherAlong=otherVertical?other.at[2]:other.at[0];
        return other.destination===room.id&&otherVertical===vertical&&Math.abs(otherAlong-along)<=.03&&
          Math.abs((other.width||.9)-(door.width||.9))<=.03&&Math.abs(otherFixed-fixed)<=.30;
      });
    if(reciprocal){const otherAlong=vertical?reciprocal.at[2]:reciprocal.at[0],rooms=[room.id,destination.id].sort(),
        key=`pair:${rooms[0]}:${rooms[1]}:${vertical?'v':'h'}:`+
          `${roundedDoorValue((along+otherAlong)/2)}:${roundedDoorValue(((door.width||.9)+(reciprocal.width||.9))/2)}`;
      physicalKeyByDoor.set(door,key);physicalKeyByDoor.set(reciprocal,key);
    }else physicalKeyByDoor.set(door,exactPhysicalKey(door));
  }
  const physicalKey=door=>physicalKeyByDoor.get(door)||exactPhysicalKey(door);
  for(const door of roomDoors){const key=physicalKey(door);if(!roomDoorGroups.has(key))roomDoorGroups.set(key,[]);
    roomDoorGroups.get(key).push(door);}
  for(const {room,door} of roomDoorRows){
    if(!approvedOpenPocketDoorIds.has(door.id))continue;
    const vertical=door.side==='west'||door.side==='east',fixed=vertical?door.at[0]:door.at[2],
      along=vertical?door.at[2]:door.at[0],lo=vertical?room.bounds[2]:room.bounds[0],
      hi=vertical?room.bounds[3]:room.bounds[1],half=(door.width||.9)/2,
      authored=[along-half,along+half],intervals=(room.doors||[]).filter(other=>other.side===door.side)
        .map(other=>{const c=vertical?other.at[2]:other.at[0],h=(other.width||.9)/2;return[c-h,c+h];});
    for(const route of floor.circulation||[]){const [rx0,rx1,rz0,rz1]=route.bounds;
      if(vertical&&rx0<=fixed+.02&&rx1>=fixed-.02){const a=Math.max(lo,rz0),b=Math.min(hi,rz1);
        if(b>a+.05)intervals.push([a-.04,b+.04]);}
      else if(!vertical&&rz0<=fixed+.02&&rz1>=fixed-.02){const a=Math.max(lo,rx0),b=Math.min(hi,rx1);
        if(b>a+.05)intervals.push([a-.04,b+.04]);}
    }
    const component=reviewOpeningComponent(intervals,along);
    if(!component||component[0]<authored[0]-.051||component[1]>authored[1]+.051)
      pocketOpeningDefects.push(`${door.id}:authored=${authored.map(n=>n.toFixed(3)).join('..')} `+
        `component=${component?component.map(n=>n.toFixed(3)).join('..'):'missing'}`);
    const side=door.pocketSide,validSide=vertical?(side==='north'||side==='south'):(side==='east'||side==='west'),
      available=!validSide?-1:vertical?(side==='north'?hi-authored[1]:authored[0]-lo):
        (side==='east'?hi-authored[1]:authored[0]-lo);
    if(available<(door.width||.9)-.02)pocketCavityDefects.push(
      `${door.id}:side=${side||'missing'} available=${available.toFixed(3)} required=${(door.width||.9).toFixed(3)}`);
  }
  if(scene.buildingId==='B03'&&floor.level===1){
    for(const expected of [
      ['B03/F1/SERVE/STORE','B03/F1/STORE/SERVICE'],
      ['B03/F1/SERVE/CLEAN-PASS','B03/F1/KITCHEN/CLEAN-PASS'],
    ]){
      const group=[...roomDoorGroups.values()].find(doors=>doors.length===expected.length&&
        expected.every(id=>doors.some(door=>door.id===id))),doors=group||[],a=doors[0],b=doors[1],
        exact=!!a&&!!b&&Math.hypot(a.at[0]-b.at[0],a.at[2]-b.at[2])<1e-8&&
          Math.abs((a.width||.9)-(b.width||.9))<1e-8&&a.pocketSide===b.pocketSide&&
          a.staffOnly===true&&b.staffOnly===true&&a.destination===b.destination&&
          new Set([a.side,b.side]).size===2&&[a.side,b.side].every(side=>side==='west'||side==='east');
      if(!exact)b03PocketPairDefects.push(`${expected.join('|')}:group=${doors.map(door=>door.id).join('|')||'missing'}`);
    }
  }
  const publicOwnerByDoor=new Map(roomDoors.map(door=>[door,publicPortalOwningRoomDoor(building,floor,door)])),
    groupRenderIds=doors=>{const owners=doors.map(door=>publicOwnerByDoor.get(door));
      if(owners.length&&owners.every(Boolean)&&new Set(owners.map(owner=>owner.portal.id)).size===1)
        return new Set([`${owners[0].portal.id}/DOOR`]);
      return new Set(doors.map(door=>door.id));
    };
  for(const door of roomDoors.filter(door=>door.portal===true)){
    const owner=publicOwnerByDoor.get(door),renderedAliasParts=scene.props.filter(prop=>
      prop.tag===door.id||typeof prop.tag==='string'&&prop.tag.startsWith(`${door.id}/`));
    if(!owner||renderedAliasParts.length)publicPortalAliasDefects.push(
      `${door.id}:owner=${owner&&owner.portal.id||'missing'} rendered=${renderedAliasParts.map(prop=>prop.tag).join('|')||'-'}`);
  }
  const expectedRoomGroups=[...roomDoorGroups.entries()].filter(([,doors])=>!doors.every(door=>
      approvedOpenPocketDoorIds.has(door.id)&&door.operation==='sliding-pocket'&&door.reviewOpen===true)),
    exactExpectedIds=new Set([
      ...fixtureDoors.map(fixture=>fixture.id),
      ...(floor.level===1?building.portals.filter(portal=>portal.localSpawn).map(portal=>`${portal.id}/DOOR`):[]),
    ]),expectedRoomIds=new Set(expectedRoomGroups.flatMap(([,doors])=>[...groupRenderIds(doors)])),
    markedRows=reviewDoorSamples(scene,floor),markedIds=new Set(markedRows.map(row=>row.leaf.id)),
    // A shared opening may legitimately suppress one source-side record, but B03 also contains
    // paired records that render two different leaves swinging to opposite sides. Identify every
    // actual full-height room panel independently of the marker and require that exact render ID;
    // a marked neighbour at the same opening cannot mask an unmarked visible panel.
    roomDoorIds=new Set(roomDoors.map(door=>door.id)),renderedRoomDoorPanels=scene.props.filter(prop=>
      roomDoorIds.has(prop.tag)&&prop.ob&&prop.ob.sy>2&&Math.min(prop.ob.sx,prop.ob.sz)<.12),
    missingRoomGroups=expectedRoomGroups.filter(([,doors])=>![...groupRenderIds(doors)].some(id=>markedIds.has(id)))
      .map(([key,doors])=>`${key}[${doors.map(door=>door.id).join('|')}]`),
    roomGroupCardinality=[...roomDoorGroups.entries()].flatMap(([key,doors])=>{
      const approvedPocket=doors.every(door=>approvedOpenPocketDoorIds.has(door.id)&&
        door.operation==='sliding-pocket'&&door.reviewOpen===true),ids=groupRenderIds(doors),
        rendered=markedRows.filter(row=>ids.has(row.leaf.id)&&row.prop&&row.prop.ob&&row.prop.ob.sy>2).length,
        expected=approvedPocket?0:1;
      return rendered===expected?[]:[`${key}[${doors.map(door=>door.id).join('|')}]=${rendered}/${expected}`];
    }),
    missingRendered=renderedRoomDoorPanels.filter(prop=>prop.doorLeaf!==true).map(prop=>prop.tag),
    missingExact=[
      ...fixtureDoors.filter(fixture=>!scene.props.some(prop=>prop.tag===fixture.id&&prop.doorLeaf===true&&prop.ob&&
        Math.abs(prop.ob.sx-fixture.size[0])<.01&&Math.abs(prop.ob.sy-fixture.size[1])<.01&&
        Math.abs(prop.ob.sz-fixture.size[2])<.01)).map(fixture=>fixture.id),
      ...(floor.level===1?building.portals.filter(portal=>portal.localSpawn&&!scene.props.some(prop=>
        prop.tag===`${portal.id}/DOOR`&&prop.doorLeaf===true&&prop.ob&&prop.ob.sy>2)).map(portal=>`${portal.id}/DOOR`):[]),
    ],unexpectedRows=markedRows.filter(row=>!row.prop||!row.prop.ob||
      !['box','softBox'].includes(row.prop.mesh)).map(row=>`${row.leaf.id}:${row.prop&&row.prop.mesh||'missing'}`),
    unexpected=[...markedIds].filter(id=>id==='untagged-door-leaf'||
      !expectedRoomIds.has(id)&&!exactExpectedIds.has(id)).concat(unexpectedRows);
  if(scene.buildingId==='B07'&&floor.level===1){
    const pairIds=new Set(['B07/F1/SC-LOBBY/TO-COMMONS','B07/F1/SC-COMMONS/TO-LOBBY']),
      pair=[...roomDoorGroups.values()].find(doors=>doors.length===2&&doors.every(door=>pairIds.has(door.id)));
    b07LobbyCommonsDedupProof=!!pair&&markedRows.filter(row=>pairIds.has(row.leaf.id)&&row.prop&&row.prop.ob&&row.prop.ob.sy>2).length===1;
  }
  if(missingRoomGroups.length||roomGroupCardinality.length||missingRendered.length||missingExact.length||unexpected.length)unmarkedDoorScenes.push(
    `${scene.buildingId}/F${floor.level}:missingRoom=${missingRoomGroups.join('|')||'-'} `+
    `cardinality=${roomGroupCardinality.join('|')||'-'} `+
    `missingRendered=${missingRendered.join('|')||'-'} missingExact=${missingExact.join('|')||'-'} `+
    `unexpected=${unexpected.join('|')||'-'}`);
  // Reciprocal source records describe one physical threshold, and partitionRun deliberately
  // renders that threshold once. Validate the opt-in and the two pocket details per physical
  // group so the suppressed reciprocal alias neither demands a duplicate track nor masks a leaf.
  for(const [key,doors] of roomDoorGroups){
    const approvedRecords=doors.filter(door=>approvedOpenPocketDoorIds.has(door.id));
    if(!approvedRecords.length)continue;
    for(const door of approvedRecords)seenApprovedOpenPocketDoorIds.add(door.id);
    const everyRecordApproved=approvedRecords.length===doors.length,
      optedIn=doors.every(door=>door.operation==='sliding-pocket'&&door.reviewOpen===true),
      ids=new Set(doors.map(door=>door.id)),
      exposed=scene.props.some(prop=>prop.doorLeaf===true&&ids.has(prop.tag)),
      frameParts=scene.props.filter(prop=>[...ids].some(id=>
        prop.tag===`${id}/FRAME-A`||prop.tag===`${id}/FRAME-B`||prop.tag===`${id}/FRAME-T`)).length,
      thresholdParts=scene.props.filter(prop=>[...ids].some(id=>prop.tag===`${id}/THRESHOLD`)).length,
      pocketParts=scene.props.filter(prop=>[...ids].some(id=>
        prop.tag===`${id}/POCKET-TRACK`||prop.tag===`${id}/POCKET-REVEAL`)).length;
    if(!everyRecordApproved||!optedIn||exposed||frameParts!==3||thresholdParts!==1||pocketParts!==2)openPocketDefects.push(
      `${key}[${doors.map(door=>door.id).join('|')}]:approved=${approvedRecords.length}/${doors.length} `+
      `metadata=${optedIn} exposed=${exposed} frameParts=${frameParts} `+
      `thresholdParts=${thresholdParts} pocketParts=${pocketParts}`);
  }
  for(const door of roomDoors){
    const approved=approvedOpenPocketDoorIds.has(door.id),
      exposed=scene.props.some(prop=>prop.doorLeaf===true&&prop.tag===door.id);
    if(!approved&&door.reviewOpen===true)openPocketDefects.push(`${door.id}:unapproved-reviewOpen`);
    if(!approved&&exposed&&!ordinaryDoorLeafProof)ordinaryDoorLeafProof=door.id;
  }
}
check('every expected room, fire-separation and public portal door maps to an exact marked render ID',
  unmarkedDoorScenes.length===0,unmarkedDoorScenes.slice(0,12).join(','));
check('public portal room-door aliases cut partitions without rendering duplicate leaves or frames',
  publicPortalAliasDefects.length===0,publicPortalAliasDefects.slice(0,12).join(','));
check('approved open-pocket thresholds retain frames and pocket details without exposed leaves',
  openPocketDefects.length===0&&[...approvedOpenPocketDoorIds].every(id=>seenApprovedOpenPocketDoorIds.has(id)),
  openPocketDefects.slice(0,8).join(','));
check('approved pocket thresholds are not widened by crossing circulation plates',pocketOpeningDefects.length===0,
  pocketOpeningDefects.slice(0,8).join(','));
check('approved pocket panels have a full-length backing wall cavity',pocketCavityDefects.length===0,
  pocketCavityDefects.slice(0,8).join(','));
check('B03 staffed-service reciprocal aliases remain two exact physical pocket pairs',b03PocketPairDefects.length===0,
  b03PocketPairDefects.join(','));
const pocketOpeningControl=(intervals,centre,authored)=>{const component=reviewOpeningComponent(intervals,centre);
  return!!component&&component[0]>=authored[0]-.051&&component[1]<=authored[1]+.051;};
check('pocket opening-span control accepts exact padding and rejects an over-cut route',
  pocketOpeningControl([[-.5,.5],[-.54,.54]],0,[-.5,.5])&&
  !pocketOpeningControl([[-.5,.5],[-.44,1.84]],0,[-.5,.5]));
const pocketCavityControl=(lo,hi,centre,width,positive)=>
  (positive?hi-(centre+width/2):(centre-width/2)-lo)>=width-.02;
check('pocket cavity control accepts a full panel run and rejects a short backing wall',
  pocketCavityControl(-2.4,2.4,-.3,1.8,true)&&!pocketCavityControl(-6.1,3.6,2.7,1.2,true));
check('ordinary room doors retain exposed review-marked leaves',!!ordinaryDoorLeafProof,ordinaryDoorLeafProof||'missing');
check('B07 lobby and commons reciprocal aliases render one physical room panel',b07LobbyCommonsDedupProof);
const stableControl={roomAt:()=>({id:'control',x0:-5,x1:5,z0:-5,z1:5}),blockers:[]},
  wallBandControl={roomAt:()=>({id:'wall-band',x0:-2,x1:2,z0:-2,z1:2}),blockers:[]},
  blockerControl={roomAt:()=>({id:'blocker',x0:-5,x1:5,z0:-5,z1:5}),
    blockers:[{x0:-.10,x1:.10,z0:-1.10,z1:-.90,top:3}]},controlPose={x:0,z:0,yaw:0};
check('native review camera accepts an unaltered clear indoor orbit',
  reviewCameraStable(stableControl,controlPose,1.4));
check('native review camera rejects a clearWall-shortened orbit',
  !reviewCameraStable(wallBandControl,controlPose,1.7));
check('native review camera rejects a default-padded blocker-shortened orbit',
  !reviewCameraStable(blockerControl,controlPose,1.4));
const intrusionFixture={id:'REVIEW/CONTROL/OPAQUE',prefab:'PF-CABINET',at:[0,0,-1.15],size:[.8,1.4,.12],yaw:0},
  intrusionFloor={elevation:0,height:3,rooms:[],sharedObjects:[intrusionFixture]},
  controlMatrix=z=>vm.runInContext(`M.mul(M.trans(0,1.6,${z}),M.scale(.8,1.4,.12))`,context),
  intrusionProp={mesh:'box',m:controlMatrix(-1.15),alpha:1,tag:intrusionFixture.id},
  clearProp={mesh:'box',m:controlMatrix(0),alpha:1,tag:intrusionFixture.id},
  intrusionScene={props:[intrusionProp],solids:[],H:3},clearScene={props:[clearProp],solids:[],H:3};
check('native review camera rejects opaque fixture geometry inside its near envelope',
  reviewCameraFixtureIntrusion(intrusionScene,intrusionFloor,controlPose,1.6)?.id===intrusionFixture.id);
check('native review camera accepts opaque fixture geometry beyond its near envelope',
  reviewCameraFixtureIntrusion(clearScene,intrusionFloor,controlPose,1.6)===null);
const focusControlFixture={id:'REVIEW/CONTROL/FOCUS',prefab:'PF-SCREEN',at:[0,1.4,1],size:[1,.6,.08],yaw:0},
  focusControlFloor={elevation:0,height:3,rooms:[{id:'REVIEW/CONTROL/ROOM',bounds:[-2,2,-2,2],contents:[focusControlFixture]}],
    circulation:[],sharedObjects:[]},
  focusMatrix=(z,w,h,d)=>vm.runInContext(`M.mul(M.trans(0,1.4,${z}),M.scale(${w},${h},${d}))`,context),
  focusProp={mesh:'box',m:focusMatrix(1,1,.6,.08),alpha:1,tag:focusControlFixture.id},
  occluderProp={mesh:'box',m:focusMatrix(0,2,2,.10),alpha:1,tag:'REVIEW/CONTROL/NONCOLLIDING-OCCLUDER'},
  focusControlPose={x:0,z:0,yaw:0},visibleFocusScene={props:[focusProp],solids:[],blockers:[],H:3},
  hiddenFocusScene={props:[focusProp,occluderProp],solids:[],blockers:[],H:3};
check('focus proof accepts a materially visible rendered fixture',
  !reviewFocusEvidence(visibleFocusScene,focusControlFloor,focusControlPose,1.7,[focusControlFixture.id],1).error);
check('focus proof rejects a non-colliding opaque rendered occluder',
  !!reviewFocusEvidence(hiddenFocusScene,focusControlFloor,focusControlPose,1.7,[focusControlFixture.id],1).error);
const architecturalFixture={id:'REVIEW/CONTROL/PRIVACY-WALL',prefab:'PF-WALL-RUN',at:[0,0,0],
    size:[2,2,.10],yaw:0,architecturalOccluder:true},
  architecturalFloor={elevation:0,height:3,rooms:[{id:'REVIEW/CONTROL/ARCH',bounds:[-2,2,-2,2],
    contents:[architecturalFixture]}],sharedObjects:[]},
  architecturalProp={mesh:'box',m:focusMatrix(0,2,2,.10),alpha:1,tag:architecturalFixture.id},
  architecturalScene={props:[architecturalProp],solids:[],H:3},
  architecturalPolygon=[[-.4,.5,1],[.4,.5,1],[.4,1.5,1],[-.4,1.5,1]],
  unmarkedArchitecturalFloor={...architecturalFloor,rooms:[{...architecturalFloor.rooms[0],
    contents:[{...architecturalFixture,architecturalOccluder:false}]}]};
check('door proof accepts only an explicitly authored opaque privacy wall using its real rendered OBB',
  reviewPolygonArchitecturallyOccluded(architecturalScene,architecturalFloor,[0,1,-1],architecturalPolygon)&&
  !reviewPolygonArchitecturallyOccluded(architecturalScene,unmarkedArchitecturalFloor,[0,1,-1],architecturalPolygon));
const disconnectedWalkControl={points:[[0,0]]},
  disconnectedClampControl={clampMove:(x,z)=>[x,z]},
  connectedClampControl={clampMove:(x,z,targetX,targetZ)=>[targetX,targetZ]};
check('walk reachability rejects a nearby target across a clampMove-disconnected boundary',
  !walkReaches(disconnectedClampControl,disconnectedWalkControl,.20,0,.24));
check('walk reachability accepts a nearby target after the real final clampMove segment',
  walkReaches(connectedClampControl,disconnectedWalkControl,.20,0,.24));
let nativeDoorGateProof=null,nativeInsideDoorGateProof=null;
for(const [,scene] of scenes){
  const floor=scene.blueprintFloor,row=reviewDoorSamples(scene,floor)[0];if(!row)continue;
  const prop=row.prop;if(!prop)continue;
  // Positive-control the strict gate with an unobstructed synthetic camera aimed directly at a
  // real transformed leaf. A future simplification cannot silently turn every authored zero-door
  // result green by making the detector incapable of seeing a door at all.
  const isolated={props:[prop],solids:[],H:scene.H},pose={x:prop.m[12],z:prop.m[14],yaw:0};
  nativeDoorGateProof=reviewForegroundDoor(isolated,floor,pose,1.4);break;
}
check('native review frustum positively detects a visible transformed door leaf',
  !!nativeDoorGateProof,nativeDoorGateProof&&nativeDoorGateProof.id);
for(const [,scene] of scenes){
  const floor=scene.blueprintFloor,prop=scene.props.find(p=>p.doorLeaf===true&&p.m);if(!prop)continue;
  const back=.10,isolated={props:[prop],solids:[],H:scene.H},
    // yaw zero puts the eye at z-back; offset the target by +back so the eye is exactly inside
    // the panel. This catches the catastrophic close-door case that a surface lattice can miss.
    pose={x:prop.m[12],z:prop.m[14]+back,yaw:0};
  nativeInsideDoorGateProof=reviewForegroundDoor(isolated,floor,pose,back);break;
}
check('native review frustum rejects a camera eye inside a marked door cuboid',
  !!nativeInsideDoorGateProof,nativeInsideDoorGateProof&&nativeInsideDoorGateProof.id);
const requiredGroundEntryReviews=['B01/F1/entry','B02/F1/entry','B03/F1/entry','B04/F1/entry','B05/F1/entry',
    'B06/F1/entry','B07/F1/entry','B07/F1/clinic-entry','B08/F1/entry'],
  missingGroundEntryReviews=requiredGroundEntryReviews.filter(key=>!authoredGroundEntryReviews.has(key));
check('complex ground-floor arrivals have authored architectural review poses',missingGroundEntryReviews.length===0,
  missingGroundEntryReviews.join(','));
check('visual review exposes the player body and shadow in exactly one dedicated evidence frame',
  bodyEvidenceRows.size===1&&bodyEvidenceRows.has('B07/F2/entry'),[...bodyEvidenceRows].join(','));

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
const scienceGround=scenes.map(([,scene])=>scene).find(scene=>scene.buildingId==='B06'&&scene.blueprintFloor.level===1),
  scienceStart=scienceGround?[scienceGround.spawn.x,scienceGround.spawn.z]:[NaN,NaN],
  scienceWaypoints=[scienceStart,[0,-1],[0,2.35],[2.4,2.35]];
let scienceAccepted=0,scienceExpected=0,scienceMaxError=0,sciencePosition=[...scienceStart];
if(scienceGround)for(let segment=1;segment<scienceWaypoints.length;segment++){
  const start=scienceWaypoints[segment-1],end=scienceWaypoints[segment],distance=Math.hypot(end[0]-start[0],end[1]-start[1]),
    steps=Math.round(distance/.01);scienceExpected+=steps;
  for(let index=1;index<=steps;index++){
    const target=[start[0]+(end[0]-start[0])*index/steps,start[1]+(end[1]-start[1])*index/steps],
      moved=scienceGround.clampMove(sciencePosition[0],sciencePosition[1],target[0],target[1],.30),
      error=Math.hypot(moved[0]-target[0],moved[1]-target[1]);
    scienceMaxError=Math.max(scienceMaxError,error);if(error<=1e-8)scienceAccepted++;sciencePosition=moved;
  }
}
check('B06 science entrance reaches the corridor and emergency-lab lobby at player radius',
  !!scienceGround&&Math.hypot(scienceStart[0]-2.4,scienceStart[1]+1)<=1e-8&&
    scienceExpected===815&&scienceAccepted===scienceExpected&&scienceMaxError<=1e-8&&
    Math.hypot(sciencePosition[0]-2.4,sciencePosition[1]-2.35)<=1e-8,
  `start=${scienceStart.join(',')} ${scienceAccepted}/${scienceExpected} max=${scienceMaxError} final=${sciencePosition.join(',')}`);
const walkByScene=new Map(),verticalLandingDefects=[];
for(const [,source] of scenes)for(const t of source.things.filter(t=>t.exit&&t.exit.at&&sceneByPlace.has(t.exit.place))){
  const target=sceneByPlace.get(t.exit.place),at=t.exit.at,b=plan.buildings.find(q=>q.id===target.buildingId);
  const finite=[at.x,at.z,at.yaw].every(Number.isFinite);
  const inside=finite&&at.x>=b.localBounds[0]&&at.x<=b.localBounds[1]&&at.z>=b.localBounds[2]&&at.z<=b.localBounds[3];
  const clear=inside&&!target.solids.some(s=>!s.open&&at.x>s.x0-.30&&at.x<s.x1+.30&&at.z>s.z0-.30&&at.z<s.z1+.30);
  let walk=walkByScene.get(target);if(!walk){walk=walkMap(target,b);walkByScene.set(target,walk);}
  const connected=clear&&walkReaches(target,walk,at.x,at.z,.32);
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
