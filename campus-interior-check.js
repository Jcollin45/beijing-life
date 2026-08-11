'use strict';

// Browser-free acceptance check for the university interior construction system.  It executes
// the real matrix, Build.scene and campus-interior renderer, then forces all 28 Lazy floor builders.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=__dirname,builders=new Map(),failures=[];
const REVIEW_FRONT_MIN=1.20;
let passed=0;
const check=(name,ok,detail='')=>ok?passed++:failures.push(name+(detail?` — ${detail}`:''));
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
  (furnitureOrEquipmentLanguage.test(o.label)&&!/headboard|pinboard/i.test(o.label))||
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
  let sx=Math.round((scene.spawn.x-x0)/step),sz=Math.round((scene.spawn.z-z0)/step);
  const candidates=[];for(let iz=0;iz<h;iz++)for(let ix=0;ix<w;ix++)if(!blocked[index(ix,iz)])
    candidates.push([ix,iz,(ix-sx)**2+(iz-sz)**2]);
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

const scenes=[],visualReviewDefects=[],entryReviewDefects=[],authoredVisualReviewFloors=new Set(),
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
function reviewRenderedFixtureBounds(scene,floor,fixture){
  if(!reviewRenderedBoundsCache.has(scene))reviewRenderedBoundsCache.set(scene,new Map());
  const cache=reviewRenderedBoundsCache.get(scene);if(cache.has(fixture.id))return cache.get(fixture.id);
  let [bottom,top]=reviewFixtureSpan(floor,fixture),x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const solid of scene.solids.filter(s=>s.fixtureId===fixture.id)){
    x0=Math.min(x0,solid.x0);x1=Math.max(x1,solid.x1);z0=Math.min(z0,solid.z0);z1=Math.max(z1,solid.z1);
  }
  for(const prop of scene.props.filter(prop=>prop.tag===fixture.id&&prop.m&&prop.mesh!=='quad')){
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
    // Public portal panels sit on the visual wall plane, inside the shell's deliberately broad
    // walking proxy. That proxy cannot hide the very door surface it contains; only an earlier
    // architectural solid along the ray may occlude a marked leaf.
    if(architecturalOnly&&target[0]>=solid.x0-.01&&target[0]<=solid.x1+.01&&
      target[2]>=solid.z0-.01&&target[2]<=solid.z1+.01)continue;
    const fixture=solid.fixtureId&&fixtures.get(solid.fixtureId),rendered=fixture&&
      reviewRenderedFixtureBounds(scene,floor,fixture),box=rendered||solid,
      hit=reviewRayBox(origin,target,box);if(!hit)continue;
    const lo=Math.max(hit[0],.002),hi=Math.min(hit[1],.985);if(lo>=hi)continue;
    let bottom=0,top=scene.H||Math.max(2.75,floor.height-.18);
    if(rendered){bottom=rendered.bottom;top=rendered.top;}
    const dy=target[1]-origin[1],y0=origin[1]+dy*lo,y1=origin[1]+dy*hi;
    if(Math.min(y0,y1)<top-.01&&Math.max(y0,y1)>bottom+.01)return false;
  }
  return true;
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
  for(let q=.16;q<=6;q+=.12){const x=pose.x+fx*q,z=pose.z+fz*q;
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
      if(!polygon.length)continue;const centroid=polygon.reduce((sum,point)=>
        [sum[0]+point[0]/polygon.length,sum[1]+point[1]/polygon.length,sum[2]+point[2]/polygon.length],[0,0,0]);
      for(const point of [centroid,...polygon])if(reviewLineOfSight(scene,floor,camera.eye,point,leaf.id,true))
        return{...leaf,point};
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
    const parts=scene.props.filter(prop=>prop.tag===id&&prop.m&&prop.mesh!=='quad');
    let samples=0,visibleSamples=0,innerSamples=0;
    for(const prop of parts)for(const u of [-.5,0,.5])for(const v of [-.5,0,.5])for(const w of [-.5,0,.5]){
      samples++;const sample=reviewTransform(prop.m,u,v,w),projected=reviewProject(camera,sample);
      if(!projected.inside||!reviewLineOfSight(scene,floor,camera.eye,sample,id))continue;
      if(bodyVisible&&reviewBodyOccludes(camera.eye,sample,pose.x,pose.z))continue;visibleSamples++;
      if(Math.abs(projected.nx)<=.88&&Math.abs(projected.ny)<=.78)innerSamples++;
    }
    if(!parts.length||visibleSamples<Math.max(3,Math.ceil(samples*.12))||!innerSamples)
      return{error:`focus-render-cropped:${id}:${visibleSamples}/${samples}`};
    evidence.push({id,forward:+forward.toFixed(2),lateral:+lateral.toFixed(2),visibleSamples,samples,innerSamples});
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
    const room=f.rooms.find(q=>q.id===programmeReview.roomId),pose=programmeReview.at||{},radius=.32;
    if(!room)visualReviewDefects.push(`${b.id}/F${f.level}:missing-room:${programmeReview.roomId}`);
    else if(![pose.x,pose.z,pose.yaw].every(Number.isFinite))visualReviewDefects.push(`${b.id}/F${f.level}:non-finite-pose`);
    else if(!reviewInside(room.bounds,pose.x,pose.z,radius))visualReviewDefects.push(`${b.id}/F${f.level}:pose-outside-${room.id}`);
    else if(scene.solids.some(s=>!s.open&&pose.x>s.x0-radius&&pose.x<s.x1+radius&&pose.z>s.z0-radius&&pose.z<s.z1+radius))
      visualReviewDefects.push(`${b.id}/F${f.level}:pose-body-blocked`);
    else {
      const back=reviewBack(scene,f,room.bounds,pose),front=reviewFront(scene,f,room.bounds,pose);
      if(!back)visualReviewDefects.push(`${b.id}/F${f.level}:rear-camera-blocked`);
      if(front<REVIEW_FRONT_MIN)visualReviewDefects.push(`${b.id}/F${f.level}:front-depth-${front.toFixed(2)}m`);
      if(back){
        const focus=reviewFocusEvidence(scene,f,pose,back,programmeReview.focusFixtureIds,2),door=reviewForegroundDoor(scene,f,pose,back);
        if(focus.error)visualReviewDefects.push(`${b.id}/F${f.level}:${focus.error}`);
        if(door)visualReviewDefects.push(`${b.id}/F${f.level}:foreground-door-leaf:${door.id}`);
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
      const walk=cachedWalkMap(scene,b),arrivalReachable=walk.points.some(([x,z])=>Math.hypot(x-pose.x,z-pose.z)<=.24);
      if(!arrivalReachable)entryReviewDefects.push(`${b.id}/F${f.level}:entry-path-blocked-${zone.id}`);
      const back=reviewBack(scene,f,zone.bounds,pose),front=reviewFront(scene,f,zone.bounds,pose);
      if(!back)entryReviewDefects.push(`${b.id}/F${f.level}:entry-rear-camera-blocked`);
      if(front<REVIEW_FRONT_MIN)entryReviewDefects.push(`${b.id}/F${f.level}:entry-front-depth-${front.toFixed(2)}m`);
      if(back){
        const focus=reviewFocusEvidence(scene,f,pose,back,entryReview.focusFixtureIds,1,entryReview.body==='evidence'),
          door=reviewForegroundDoor(scene,f,pose,back);
        if(focus.error)entryReviewDefects.push(`${b.id}/F${f.level}:entry-${focus.error}`);
        if(door)entryReviewDefects.push(`${b.id}/F${f.level}:entry-foreground-door-leaf:${door.id}`);
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
        const back=reviewBack(scene,f,cameraZone.bounds,pose),front=reviewFront(scene,f,focusRoom.bounds,pose);
        if(!back)entryReviewDefects.push(`${key}:ground-rear-camera-blocked-${cameraZone.id}`);
        if(front<REVIEW_FRONT_MIN)entryReviewDefects.push(`${key}:ground-front-depth-${front.toFixed(2)}m`);
        if(back){
          const focus=reviewFocusEvidence(scene,f,pose,back,entry.focusFixtureIds,1),door=reviewForegroundDoor(scene,f,pose,back);
          if(focus.error)entryReviewDefects.push(`${key}:ground-${focus.error}`);
          if(door)entryReviewDefects.push(`${key}:ground-foreground-door-leaf:${door.id}`);
        }
      }
    }
  }
  const fixtureRows=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects);
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
    if(minSize<.064)textGlyphDefects.push(`${fixture.id}:size-${minSize.toFixed(3)}`);
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
const approvedOpenPocketDoorIds=new Set([
  'B07/F2/DANCE/TO-COR-W','B07/F2/DANCE/TO-COR-E',
  'B07/F3/MEDIA/TO-COR','B07/F3/HEALTH/TO-COR',
]),unmarkedDoorScenes=[],openPocketDefects=[],seenApprovedOpenPocketDoorIds=new Set();
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
  const expectedRoomGroups=[...roomDoorGroups.entries()].filter(([,doors])=>!doors.every(door=>
      approvedOpenPocketDoorIds.has(door.id)&&door.operation==='sliding-pocket'&&door.reviewOpen===true)),
    exactExpectedIds=new Set([
      ...fixtureDoors.map(fixture=>fixture.id),
      ...(floor.level===1?building.portals.filter(portal=>portal.localSpawn).map(portal=>`${portal.id}/DOOR`):[]),
    ]),expectedRoomIds=new Set(expectedRoomGroups.flatMap(([,doors])=>doors.map(door=>door.id))),
    markedRows=reviewDoorSamples(scene,floor),markedIds=new Set(markedRows.map(row=>row.leaf.id)),
    // A shared opening may legitimately suppress one source-side record, but B03 also contains
    // paired records that render two different leaves swinging to opposite sides. Identify every
    // actual full-height room panel independently of the marker and require that exact render ID;
    // a marked neighbour at the same opening cannot mask an unmarked visible panel.
    roomDoorIds=new Set(roomDoors.map(door=>door.id)),renderedRoomDoorPanels=scene.props.filter(prop=>
      roomDoorIds.has(prop.tag)&&prop.ob&&prop.ob.sy>2&&Math.min(prop.ob.sx,prop.ob.sz)<.12),
    missingRoomGroups=expectedRoomGroups.filter(([,doors])=>!doors.some(door=>markedIds.has(door.id)))
      .map(([key,doors])=>`${key}[${doors.map(door=>door.id).join('|')}]`),
    roomGroupCardinality=[...roomDoorGroups.entries()].flatMap(([key,doors])=>{
      const approvedPocket=doors.every(door=>approvedOpenPocketDoorIds.has(door.id)&&
        door.operation==='sliding-pocket'&&door.reviewOpen===true),ids=new Set(doors.map(door=>door.id)),
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
  for(const door of roomDoors){
    const approved=approvedOpenPocketDoorIds.has(door.id),optedIn=door.operation==='sliding-pocket'&&door.reviewOpen===true,
      exposed=scene.props.some(prop=>prop.doorLeaf===true&&prop.tag===door.id),
      pocketParts=scene.props.filter(prop=>prop.tag===`${door.id}/POCKET-TRACK`||prop.tag===`${door.id}/POCKET-REVEAL`).length;
    if(approved)seenApprovedOpenPocketDoorIds.add(door.id);
    if(approved&&(!optedIn||exposed||pocketParts!==2))openPocketDefects.push(
      `${door.id}:metadata=${optedIn} exposed=${exposed} pocketParts=${pocketParts}`);
    if(!approved&&door.reviewOpen===true)openPocketDefects.push(`${door.id}:unapproved-reviewOpen`);
    if(!approved&&exposed&&!ordinaryDoorLeafProof)ordinaryDoorLeafProof=door.id;
  }
}
check('every expected room, fire-separation and public portal door maps to an exact marked render ID',
  unmarkedDoorScenes.length===0,unmarkedDoorScenes.slice(0,12).join(','));
check('approved permanently-open pocket thresholds retain frames and pocket details without exposed leaves',
  openPocketDefects.length===0&&[...approvedOpenPocketDoorIds].every(id=>seenApprovedOpenPocketDoorIds.has(id)),
  openPocketDefects.slice(0,8).join(','));
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
let nativePortalDoorGateProof=null;
for(const [,scene] of scenes){
  const floor=scene.blueprintFloor;if(floor.level!==1)continue;
  const building=plan.buildings.find(b=>b.id===scene.buildingId),portal=building.portals.find(p=>p.localSpawn);
  if(!portal)continue;const prop=scene.props.find(p=>p.doorLeaf===true&&p.tag===`${portal.id}/DOOR`);
  if(!prop)continue;const px=prop.m[12],pz=prop.m[14],[x0,x1,z0,z1]=building.localBounds,
    dx=px-(x0+x1)/2,dz=pz-(z0+z1)/2,yaw=Math.atan2(dx,dz),
    containingShell=scene.solids.filter(s=>!s.fixtureId&&px>=s.x0&&px<=s.x1&&pz>=s.z0&&pz<=s.z1),
    isolated={props:[prop],solids:containingShell,H:scene.H};
  const hit=reviewForegroundDoor(isolated,floor,{x:px,z:pz,yaw},1.4);
  if(hit&&containingShell.length){nativePortalDoorGateProof={id:hit.id,shells:containingShell.length};break;}
}
check('native review frustum detects a public portal panel through its co-located shell proxy',
  !!nativePortalDoorGateProof,nativePortalDoorGateProof&&JSON.stringify(nativePortalDoorGateProof));
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
