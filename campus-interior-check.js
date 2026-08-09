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
check('eight buildings',counts.buildings===8,counts.buildings);
check('28 floors',counts.floors===28,counts.floors);
check('198 rooms',counts.rooms===198,counts.rooms);
check('fixture count matches generated blueprint',counts.fixtures===plan.totals.fixtureInstances,`${counts.fixtures}/${plan.totals.fixtureInstances}`);
check('all canonical plus clinic-alias place keys',keys.length===31,keys.length);
check('28 unique Lazy floor builders',builders.size===28,builders.size);

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
for(const [name,build] of builders){
  let scene;
  try{scene=build();}catch(error){failures.push(`${name} builds — ${error.stack||error}`);continue;}
  scenes.push([name,scene]);
  check(`${name} public contract`,scene&&Array.isArray(scene.props)&&Array.isArray(scene.things)&&Array.isArray(scene.solids));
  check(`${name} finite spawn`,scene&&scene.spawn&&Number.isFinite(scene.spawn.x)&&Number.isFinite(scene.spawn.z),JSON.stringify(scene&&scene.spawn));
  check(`${name} room zones`,scene&&scene.zones&&scene.zones.length>=scene.blueprintFloor.rooms.length,scene&&scene.zones&&scene.zones.length);
  check(`${name} fixture prop ceiling`,scene&&scene.props.length<2600,scene&&scene.props.length);
  check(`${name} navigation targets exist`,scene&&scene.things.filter(t=>t.exit).every(t=>
    ['campus','classroom','library'].includes(t.exit.place)||keys.includes(t.exit.place)),
    scene&&scene.things.filter(t=>t.exit&&!['campus','classroom','library'].includes(t.exit.place)&&!keys.includes(t.exit.place)).map(t=>t.exit.place).join(','));

  const b=plan.buildings.find(q=>q.id===scene.buildingId),f=scene.blueprintFloor;
  const fixtureIds=f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects).map(o=>o.id);
  const rendered=new Set(scene.props.map(p=>p.tag).filter(Boolean));
  const missing=fixtureIds.filter(id=>!rendered.has(id));
  check(`${name} renders every blueprint fixture`,missing.length===0,missing.slice(0,8).join(','));
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
  }
}

const totalProps=scenes.reduce((n,[,s])=>n+s.props.length,0);
const maxProps=scenes.reduce((best,[name,s])=>s.props.length>best.props?{name,props:s.props.length}:best,{name:'',props:0});
console.log(JSON.stringify({buildings:counts.buildings,floors:scenes.length,rooms:counts.rooms,fixtures:counts.fixtures,
  placeKeys:keys.length,totalGeneratedProps:totalProps,maxFloor:maxProps},null,2));
for(const failure of failures)console.error('FAIL '+failure);
console.log(`\n${passed}/${passed+failures.length} campus-interior checks passed`);
if(failures.length)process.exitCode=1;
