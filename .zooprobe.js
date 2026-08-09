// Pure-Node build and acceptance probe for the revision-2 zoo expansion.
// It exercises the real Build.scene compiler without launching a browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const ROOT = __dirname;
const PLAN = require('./ZOO-EXPANSION-BLUEPRINT.json');
const CONTENTS = require('./ZOO-PENS-BUILDINGS-BLUEPRINT.json');

function context() {
  const ctx = {
    console, performance, Math, Date, JSON, Map, Set, WeakMap, WeakSet, Proxy, Reflect,
    Object, Array, Number, String, Boolean, RegExp, Error, TypeError, Float32Array,
    Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer,
    setTimeout() { return 0; }, clearTimeout() {},
    ZOO_BLUEPRINT: PLAN,
    ZOO_CONTENTS_BLUEPRINT: CONTENTS,
    C(hex) {
      const h = String(hex).replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    },
    Glyphs: {
      need: s => String(s),
      isHan: ch => /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(ch),
      role(text, size, opt = {}) {
        if (opt.glyphRole === 'primary' || opt.glyphRole === 'micro') return opt.glyphRole;
        return size >= .14 && [...String(text)].some(ch =>
          /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(ch)) ? 'primary' : 'micro';
      },
    },
    Assets: { get() { return null; }, upload() { return null; }, material() { return null; },
      materialNormal() { return null; } },
    R: { gl: null },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

function run(ctx, file, suffix = '') {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(source + suffix, ctx, { filename:file, timeout:120000 });
}

function buildProbe() {
  const ctx = context();
  run(ctx, 'js/math.js');
  run(ctx, 'js/figure.js');
  run(ctx, 'js/zoo-animals.js');
  run(ctx, 'js/lazy.js');
  run(ctx, 'js/build.js');
  run(ctx, 'js/zoo-contents.js');
  run(ctx, 'js/zoo-expansion.js');
  run(ctx, 'js/zoo.js');
  run(ctx, 'js/zoo-tropical.js');
  const outdoor = vm.runInContext("Lazy.force('Zoo')", ctx, { timeout:120000 });
  const tropical = vm.runInContext("Lazy.force('ZooTropical')", ctx, { timeout:120000 });
  const npcRows = vm.runInContext('ZooExpansion.npcRows(ZOO_BLUEPRINT)',ctx,{timeout:30000});
  const zooUse = vm.runInContext("Object.assign({},ZooExpansion.useRows(ZOO_BLUEPRINT,'zoo'),ZooContents.useRows(ZOO_CONTENTS_BLUEPRINT,'zoo',ZOO_BLUEPRINT))",ctx,{timeout:30000});
  const tropicalUse = vm.runInContext("Object.assign({},ZooExpansion.useRows(ZOO_BLUEPRINT,'zoo_tropical'),ZooContents.useRows(ZOO_CONTENTS_BLUEPRINT,'zoo_tropical',ZOO_BLUEPRINT))",ctx,
    {timeout:30000});
  return { ctx, outdoor, tropical, npcRows, zooUse, tropicalUse, plan:PLAN, contents:CONTENTS };
}

const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
function standable(scene, at, radius = PLAN.engineContract.playerRadius) {
  if (scene.expansion && scene.expansion.refreshCollision)
    scene.expansion.refreshCollision(at[0], at[1], true);
  const q = scene.clampMove(at[0], at[1], at[0], at[1], radius);
  return dist(q, at) < 1e-5;
}
function finiteScene(scene) {
  return scene.props.every(p => p.color && p.color.length === 3 &&
    p.color.every(Number.isFinite) && p.m && [...p.m].every(Number.isFinite));
}
function idSet(rows) { return new Set(rows.map(x => x.blueprintId).filter(Boolean)); }
function contentBuildRows(contents, scope) {
  const rows=scope==='outdoor'
    ? [...contents.habitats.flatMap(h=>h.contents),
       ...contents.buildings.flatMap(b=>[...b.sharedFixtures,...b.rooms.flatMap(r=>r.fixtures)])]
    : [...contents.tropicalScene.rooms.flatMap(r=>r.contents),...contents.tropicalScene.sharedObjects];
  return rows.filter(q=>q.implementationStatus==='build-v1');
}
function contentBuildIds(contents, scope) { return contentBuildRows(contents,scope).map(q=>q.id); }
function uniquePropIds(scene) {
  const seen=new Set();
  for(const p of scene.props) if(p.blueprintId) {
    if(seen.has(p.blueprintId)) return false;
    seen.add(p.blueprintId);
  }
  return true;
}
function tagsResolveLocally(scene) {
  const tags=new Set(scene.things.map(x=>x.tag));
  return scene.props.every(p=>!p.tag || tags.has(p.tag));
}
function routeStandable(scene, route, radius = PLAN.engineContract.playerRadius) {
  for(let i=1;i<route.waypoints.length;i++) {
    const a=route.waypoints[i-1],b=route.waypoints[i];
    const n=Math.max(1,Math.ceil(dist(a,b)/.05));
    for(let k=0;k<=n;k++) {
      const u=k/n,at=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
      if(scene.expansion&&scene.expansion.refreshCollision)
        scene.expansion.refreshCollision(at[0],at[1]);
      const q=scene.clampMove(at[0],at[1],at[0],at[1],radius);
      if(dist(q,at)>1e-6) return {ok:false,segment:i-1,at,to:q};
    }
  }
  return {ok:true};
}
function movementSweep(scene, waypoints, radius = PLAN.engineContract.playerRadius) {
  let at=waypoints[0].slice();
  for(let i=1;i<waypoints.length;i++) {
    const target=waypoints[i],limit=Math.max(8,Math.ceil(dist(at,target)/.05)*3);
    let stalled=0;
    for(let k=0;k<limit&&dist(at,target)>1e-4;k++) {
      const dx=target[0]-at[0],dz=target[1]-at[1],d=Math.hypot(dx,dz),step=Math.min(.05,d);
      const want=[at[0]+dx/d*step,at[1]+dz/d*step],before=at;
      if(scene.expansion&&scene.expansion.refreshCollision)
        scene.expansion.refreshCollision(at[0],at[1],true);
      at=scene.clampMove(at[0],at[1],want[0],want[1],radius);
      stalled=dist(at,before)<1e-5?stalled+1:0;
      if(stalled>3)break;
    }
    if(dist(at,target)>1e-4) return {ok:false,segment:i-1,at,target};
  }
  return {ok:true,at};
}
function segmentDistance(a,b,c,d) {
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const orient=(p,q,r)=>Math.sign(cross(p,q,r));
  if(orient(a,b,c)*orient(a,b,d)<=0&&orient(c,d,a)*orient(c,d,b)<=0) return 0;
  const pointSeg=(p,q,r)=>{
    const dx=r[0]-q[0],dz=r[1]-q[1],dd=dx*dx+dz*dz;
    const u=dd?Math.max(0,Math.min(1,((p[0]-q[0])*dx+(p[1]-q[1])*dz)/dd)):0;
    return Math.hypot(p[0]-q[0]-dx*u,p[1]-q[1]-dz*u);
  };
  return Math.min(pointSeg(a,c,d),pointSeg(b,c,d),pointSeg(c,a,b),pointSeg(d,a,b));
}
function connectedSegments(rows, width=.18) {
  if(!rows.length)return false;
  const seen=new Set([0]),queue=[0];
  while(queue.length){
    const i=queue.shift(),p=rows[i];
    for(let j=0;j<rows.length;j++) if(!seen.has(j)) {
      const q=rows[j];
      if(segmentDistance(p.a,p.b,q.a,q.b)<=width+1e-6){seen.add(j);queue.push(j);}
    }
  }
  return seen.size===rows.length;
}

function validate(probe = buildProbe()) {
  const { outdoor:o, tropical:t, npcRows, zooUse, tropicalUse, plan:p, contents } = probe;
  const failures = [], pass = [];
  const check = (name, ok, detail = '') => (ok ? pass : failures).push(detail ? `${name}: ${detail}` : name);
  check('outdoor scene built', o.props.length > 0);
  check('Tropical House built', t.props.length > 0);
  check('all outdoor prop transforms and colours are finite', finiteScene(o));
  check('all tropical prop transforms and colours are finite', finiteScene(t));
  check('outdoor marked prop IDs are unique',uniquePropIds(o));
  check('tropical marked prop IDs are unique',uniquePropIds(t));
  check('every outdoor prop tag resolves locally',tagsResolveLocally(o));
  check('every tropical prop tag resolves locally',tagsResolveLocally(t));
  const expectedOutdoorContents=contentBuildIds(contents,'outdoor');
  const expectedTropicalContents=contentBuildIds(contents,'tropical');
  const actualOutdoorContents=o.expansion&&o.expansion.contentsStats&&o.expansion.contentsStats.ids;
  const actualTropicalContents=t.contentsStats&&t.contentsStats.ids;
  check('all planned outdoor content records compile exactly once',!!actualOutdoorContents&&
    actualOutdoorContents.length===expectedOutdoorContents.length&&
    new Set(actualOutdoorContents).size===expectedOutdoorContents.length&&
    expectedOutdoorContents.every(id=>actualOutdoorContents.includes(id)),
    `${actualOutdoorContents?actualOutdoorContents.length:0}/${expectedOutdoorContents.length}`);
  check('all planned Tropical House content records compile exactly once',!!actualTropicalContents&&
    actualTropicalContents.length===expectedTropicalContents.length&&
    new Set(actualTropicalContents).size===expectedTropicalContents.length&&
    expectedTropicalContents.every(id=>actualTropicalContents.includes(id)),
    `${actualTropicalContents?actualTropicalContents.length:0}/${expectedTropicalContents.length}`);
  const outdoorPropIds=idSet(o.props),tropicalPropIds=idSet(t.props);
  check('every planned outdoor content ID owns rendered geometry',
    expectedOutdoorContents.every(id=>outdoorPropIds.has(id)));
  check('every planned Tropical House content ID owns rendered geometry',
    expectedTropicalContents.every(id=>tropicalPropIds.has(id)));
  for(const [scope,scene,table] of [['outdoor',o,zooUse],['Tropical House',t,tropicalUse]]){
    for(const q of contentBuildRows(contents,scope==='outdoor'?'outdoor':'tropical').filter(q=>q.interaction)){
      const tag=q.interaction.tag;
      check(`${scope} fixture ${q.id} exposes its visible interaction tag`,
        scene.props.some(p=>p.tag===tag&&p.blueprintId&&
          (p.blueprintId===q.id||p.blueprintId.startsWith(q.id+'/'))));
      check(`${scope} fixture ${q.id} resolves to a local thing`,q.interaction.aliasOf?
        scene.things.some(th=>th.tag===tag):scene.things.some(th=>th.blueprintId==='TH-'+q.id&&th.tag===tag));
      check(`${scope} fixture ${q.id} has a place-specific action`,!!table[tag]);
      check(`${scope} fixture ${q.id} has a standable interaction focus`,standable(scene,q.interaction.focus),
        q.interaction.focus.join(','));
      if(q.at)check(`${scope} fixture ${q.id} focus stays within its authored reach`,
        Math.hypot(q.at[0]-q.interaction.focus[0],q.at[2]-q.interaction.focus[1])<=q.interaction.reach+1e-6);
    }
  }
  check('outdoor prop budget', o.props.length <= p.performanceBudgets.outdoorTotalProps,
    `${o.props.length}/${p.performanceBudgets.outdoorTotalProps}`);
  check('tropical prop budget', t.props.length <= p.performanceBudgets.tropicalProps,
    `${t.props.length}/${p.performanceBudgets.tropicalProps}`);
  check('outdoor batch budget',o.batches.length<=p.performanceBudgets.outdoorBatches,
    `${o.batches.length}/${p.performanceBudgets.outdoorBatches}`);
  check('tropical batch budget',t.batches.length<=p.performanceBudgets.tropicalBatches,
    `${t.batches.length}/${p.performanceBudgets.tropicalBatches}`);
  check('loose dynamic-prop budget',o.loose.length<=p.performanceBudgets.looseDynamicProps,
    `${o.loose.length}/${p.performanceBudgets.looseDynamicProps}`);
  check('outdoor solid budget', o.solids.length <= p.performanceBudgets.bodySolids,
    `${o.solids.length}/${p.performanceBudgets.bodySolids}`);
  check('outdoor blocker budget', o.blockers.length <= p.performanceBudgets.cameraBlockers,
    `${o.blockers.length}/${p.performanceBudgets.cameraBlockers}`);
  check('outdoor things budget', o.things.length <= contents.performanceExtension.outdoorThingCap,
    `${o.things.length}/${contents.performanceExtension.outdoorThingCap}`);
  check('outdoor defined-light budget',o.lights.length<=p.performanceBudgets.pointLightsDefined,
    `${o.lights.length}/${p.performanceBudgets.pointLightsDefined}`);
  check('Tropical House active-light budget',t.lights.filter(q=>q.on!==false).length<=
    p.performanceBudgets.pointLightsOnAtOnce,
    `${t.lights.filter(q=>q.on!==false).length}/${p.performanceBudgets.pointLightsOnAtOnce}`);
  check('runtime exposes the canonical expansion contract',!!(o.expansion &&
    o.expansion.revision===p.revision && o.expansion.geometryHash===p.geometryHash));
  if(o.expansion) {
    check('canonical solids retained behind active chunking',
      o.expansion.canonicalSolids.length>=o.solids.length &&
      o.expansion.solidBudget.cap===p.performanceBudgets.bodySolids);
    check('canonical blockers retained behind active chunking',
      o.expansion.canonicalBlockers.length>=o.blockers.length &&
      o.expansion.blockerBudget.cap===p.performanceBudgets.cameraBlockers);
    for(const [name,at] of [['west',[-50,24]],['central',[0,45]],['east',[50,45]]]) {
      o.setNight(1);
      o.expansion.refreshCollision(at[0],at[1],true);
      check(`${name} collision chunk stays within budgets`,
        o.solids.length<=p.performanceBudgets.bodySolids &&
        o.blockers.length<=p.performanceBudgets.cameraBlockers,
        `${o.solids.length} solids, ${o.blockers.length} blockers`);
      check(`${name} active-light chunk stays within budget`,
        o.lights.filter(q=>q.on!==false).length<=p.performanceBudgets.pointLightsOnAtOnce,
        `${o.lights.filter(q=>q.on!==false).length}/${p.performanceBudgets.pointLightsOnAtOnce}`);
      check(`${name} render chunk stays within visible-prop budget`,
        o.expansion.renderChunks&&o.expansion.renderChunks.active()<=
          p.performanceBudgets.outdoorVisiblePropsAtOneTime,
        `${o.expansion.renderChunks&&o.expansion.renderChunks.active()}/`+
          p.performanceBudgets.outdoorVisiblePropsAtOneTime);
    }
    o.expansion.refreshRenderChunks(-50,65,true);
    check('all preserved-core and expansion props belong to the five-chunk/LOD manager',
      o.expansion.renderChunks.managed===o.props.length&&o.props.every(q=>q.renderChunk));
    check('the preserved core can leave the active three-chunk set at the north boundary',
      !o.expansion.renderChunks.current().includes('core')&&
      o.props.some(q=>q.renderChunk==='core'&&q.renderHidden));
    o.setNight(0);
    check('accessible-route overlay toggles on and off',
      o.expansion.toggleAccessibleRoute()===true &&
      o.expansion.toggleAccessibleRoute()===false);
    const blockedOverlay=[];
    for(const s of o.expansion.accessibleRoute){
      const q=routeStandable(o,{waypoints:[s.a,s.b]});
      if(!q.ok)blockedOverlay.push(`${s.owner}@${q.at.join(',')}`);
    }
    check('every displayed R-ACCESSIBLE-ALL segment is collision-traversable at 0.05m',
      blockedOverlay.length===0,blockedOverlay.slice(0,5).join('; '));
  }

  const oThingIds=idSet(o.things), tThingIds=idSet(t.things), oPropIds=idSet(o.props);
  const m100=o.props.find(q=>q.blueprintId==='M100-south-existing');
  check('M100 base ID belongs to its exact centered backing',!!(m100&&
    Math.abs(m100.m[12]+16.2)<1e-6&&Math.abs(m100.m[14]+9)<1e-6));
  for(const h of p.interactions.habitatThings) {
    check(`${h.id} thing exists`, oThingIds.has(h.id));
    check(`${h.id} tagged board exists`, o.props.some(x=>x.blueprintId===h.id&&x.tag===h.hz));
    check(`${h.id} focus is standable`, standable(o,h.focus), h.focus.join(','));
  }
  for(const h of p.interactions.requiredPublicThings) {
    check(`${h.id} public thing exists`, oThingIds.has(h.id));
    check(`${h.id} focus is standable`, standable(o,h.focus), h.focus.join(','));
  }
  for(const group of ['benches','bins','lamps','mapBoards','waterStations','firstAid',
                       'accessibleRouteSigns']) {
    const rows=p.objectSchedules[group] || [];
    for(const q of rows) {
      if(q.thingId) check(`${q.thingId} fixture thing exists`,oThingIds.has(q.thingId));
      check(`${q.id} visible fixture exists`,oPropIds.has(q.id));
      if(q.focus) check(`${q.id} focus is standable`,standable(o,q.focus),q.focus.join(','));
    }
  }
  check('accessible-route thing exists',o.things.some(x=>x.hz==='无障碍路线'));
  check('R-ACCESSIBLE-ALL is one continuous displayed route',
    connectedSegments(o.expansion.accessibleRoute),
    `${o.expansion.accessibleRoute.length} route segments`);
  for(const rec of p.preservation.keepExact.filter(q=>q.focus&&q.hz)) {
    const th=o.things.find(q=>q.hz===rec.hz);
    check(`${rec.id} interaction focus stays exact`,!!(th&&dist(th.focus,rec.focus)<1e-6),
      th?`${th.focus} expected ${rec.focus}`:'thing missing');
  }
  const tropDoor=o.things.find(x=>x.blueprintId==='TH-tropical');
  check('Tropical House entrance transitions',!!(tropDoor&&tropDoor.exit&&tropDoor.exit.place==='zoo_tropical'));
  const publicBypass=movementSweep(o,[[23,52],[30,52]]);
  const serviceBypass=movementSweep(o,[[52,59],[48,59]]);
  check('Tropical House public threshold cannot bypass its scene transition',!publicBypass.ok);
  check('Tropical House staff threshold remains player-closed',!serviceBypass.ok);
  const exit=t.things.find(x=>x.blueprintId==='TH-trop-exit');
  check('Tropical House exit returns exactly',!!(exit&&exit.exit&&exit.exit.place==='zoo'&&
    exit.exit.at.x===p.site.tropicalReturn.at[0]&&exit.exit.at.z===p.site.tropicalReturn.at[1]));
  for(const s of p.buildings.find(b=>b.id==='B08-tropical-house').scene.speciesThings)
    check(`${s.id} tropical species thing exists`,tThingIds.has(s.id));
  check('T04 butterfly exhibit is walk-through and standable',standable(t,[4.5,5.8]));
  for(const th of t.things)
    check(`${th.blueprintId||th.hz} tropical focus is standable`,standable(t,th.focus),th.focus.join(','));
  check('every outdoor bench has an authored seat and safe stand point',
    o.things.filter(q=>q.hz==='长椅').every(q=>q.seat&&q.stand&&dist(q.stand,q.focus)<1e-9));
  check('every Tropical House bench has an authored seat and safe stand point',
    t.things.filter(q=>q.hz==='长椅').every(q=>q.seat&&q.stand&&dist(q.stand,q.focus)<1e-9));
  check('Tropical House guide map contains its local diagram and legend',
    t.props.filter(q=>q.tag==='导游图').length>=35);
  check('Tropical House service-desk action resolves locally',!!tropicalUse['服务台']);
  check('Tropical House bin action resolves locally',!!tropicalUse['垃圾桶']);
  check('H31 tea pavilion child is emitted',oPropIds.has('H31-waterfowl-lake/O01'));
  check('animal hospital public thing is a glazed observation destination',
    o.things.some(q=>q.blueprintId==='TH-animal-hospital'&&q.hz==='动物医院'));
  check('B02 entrance apron is emitted',oPropIds.has('B02-west-restroom/APRON'));
  check('B03 entrance apron is emitted',oPropIds.has('B03-east-rest-hub/APRON'));
  check('B04 exact apron and 1:20 approach are emitted',
    oPropIds.has('B04-lake-pavilion/APRON')&&oPropIds.has('B04-lake-pavilion/RAMP-SOUTH')&&
    oPropIds.has('B04-lake-pavilion/RAMP-NORTH'));
  check('B04 lift is continuous and limited to 1:20',
    Math.abs(o.liftAt(-3.5,19))<1e-9&&Math.abs(o.liftAt(-3.5,24)-.25)<1e-9&&
    Math.abs(o.liftAt(-3.5,29)-.5)<1e-9&&Math.abs(o.liftAt(-3.5,34)-.25)<1e-9&&
    Math.abs(o.liftAt(-3.5,39))<1e-9);
  check('B06b keeps P104 underpass at grade and bridge walkers at y=4.2',
    o.liftAt(-2,59.5,0)===0&&o.liftAt(-2,59.5,4.2)===4.2&&
    o.liftAt(-6.6,59.5,0)===4.2&&o.liftAt(2.6,59.5,4.2)===4.2);
  for(const [id,x] of [['B05',-11.5],['B06',9]]) {
    check(`${id} south public-door centreline stays open`,standable(o,[x,55.8]));
    check(`${id} north public-door centreline stays open`,standable(o,[x,61.2]));
  }
  for(const [id,waypoints] of [
    ['B04 pavilion approach',[[-3.5,19],[-3.5,29],[-9.9,29]]],
    ['H32 family public gate',[[-2,29],[4,29]]],
  ]) {const q=routeStandable(o,{waypoints});
    check(`${id} stays continuously reachable`,q.ok,
      q.ok?'':`segment ${q.segment} ${q.at} -> ${q.to}`);}
  for(const route of p.routes.visitorLoops) {
    const q=routeStandable(o,route);
    check(`${route.id} passes 0.05m compiled-collision sweep`,q.ok,
      q.ok?'':`segment ${q.segment} ${q.at} -> ${q.to}`);
  }
  const westGateSweep=movementSweep(o,[[-36.5,24],[-55.2,24]]);
  check('P117 transfers continuously from the main zoo into the west-gate zone',westGateSweep.ok,
    westGateSweep.ok?'':`stopped at ${westGateSweep.at}; expected ${westGateSweep.target}`);
  const scheduledTrees=[...p.planting.perimeterTrees,...p.planting.districtTrees,
    ...p.planting.wetlandWillows,...p.planting.highlandPines];
  for(const tr of scheduledTrees)
    check(`${tr.id} owns its exact trunk solid`,o.expansion.canonicalSolids.some(s=>
      Math.abs(s.x0-(tr.at[0]-.28))<1e-8&&Math.abs(s.x1-(tr.at[0]+.28))<1e-8&&
      Math.abs(s.z0-(tr.at[1]-.28))<1e-8&&Math.abs(s.z1-(tr.at[1]+.28))<1e-8));
  check('outdoor spawn standable',standable(o,[o.spawn.x,o.spawn.z]));
  check('tropical spawn standable',standable(t,[t.spawn.x,t.spawn.z]));
  const animals=npcRows.filter(n=>n.animal), expectedAnimals=p.habitats.reduce((n,h)=>
    n+h.animalSlots.length,0);
  check('every expansion animal slot has one NPC',animals.length===expectedAnimals,
    `${animals.length}/${expectedAnimals}`);
  check('H32 goat feed slot has a goat',animals.some(n=>
    /H32-family-farm-goat-feed$/.test(n.npcId||'')&&n.hz==='山羊'));
  check('H32 rabbit rest slot has a rabbit',animals.some(n=>
    /H32-family-farm-rabbit-rest$/.test(n.npcId||'')&&n.hz==='兔子'));
  check('three keeper routes are populated',npcRows.filter(n=>n.serviceRoute).length===3);
  check('three visitor loops are populated',npcRows.filter(n=>
    /(?:^|-)R-VIS-/.test(n.npcId||'') && !n.pairedRoute &&
    Array.isArray(n.patrol) && n.patrol.length>1).length===3);
  for(const route of [...p.routes.keeperRoutes,...p.routes.visitorLoops]) {
    const row=npcRows.find(n=>n.routeId===route.id);
    check(`${route.id} runtime patrol preserves every sequential waypoint`,!!(row&&
      JSON.stringify(row.patrol)===JSON.stringify(route.waypoints)));
  }
  const family=npcRows.find(n=>n.routeId==='R-VIS-FAMILY');
  const child=npcRows.find(n=>n.pairedRoute==='R-VIS-FAMILY');
  check('family visitor route has a paired child at exact 0.50m separation',!!(family&&child&&
    family.patrol.length===child.patrol.length&&family.patrol.every((q,i)=>
      Math.abs(dist(q,child.patrol[i])-.50)<1e-9)));
  check('paired family members share one raw pace before their runtime formation tether',
    !!(family&&child&&family.speed===child.speed&&family.temper===child.temper));
  if(child){const q=routeStandable(o,{waypoints:child.patrol});
    check('paired child route passes 0.05m compiled-collision sweep',q.ok,
      q.ok?'':`segment ${q.segment} ${q.at} -> ${q.to}`);}
  check('all generated NPC coordinates are finite',npcRows.every(n=>
    [...(n.spots||[]).flatMap(s=>s.at||[]),...(n.patrol||[]).flat()].every(Number.isFinite)));
  const tropicalWords=new Set(p.buildings.find(b=>b.id==='B08-tropical-house').scene.speciesThings
    .map(x=>x.hz));
  for(const hz of p.interactions.newHeadwords) {
    const table=tropicalWords.has(hz)?tropicalUse:zooUse;
    check(`${hz} has a place-specific action`,!!table[hz]);
  }

  return { pass:failures.length===0, passed:pass.length, failures,
    summary:{
      revision:p.revision,geometryHash:p.geometryHash,
      outdoor:{props:o.props.length,batches:o.batches.length,loose:o.loose.length,
        things:o.things.length,solids:o.solids.length,blockers:o.blockers.length,lights:o.lights.length},
      tropical:{props:t.props.length,batches:t.batches.length,loose:t.loose.length,
        things:t.things.length,solids:t.solids.length,blockers:t.blockers.length,lights:t.lights.length},
      generated:{npcRows:npcRows.length,animals:animals.length,zooActions:Object.keys(zooUse).length,
        tropicalActions:Object.keys(tropicalUse).length},
    }};
}

if (require.main === module) {
  try {
    const result=validate();
    console.log(JSON.stringify(result.summary,null,2));
    if(result.failures.length) for(const f of result.failures) console.error('FAIL '+f);
    console.log(`${result.passed}/${result.passed+result.failures.length} zoo runtime checks passed`);
    if(!result.pass) process.exitCode=1;
  } catch(error) { console.error(error.stack||error.message); process.exitCode=1; }
}

module.exports={buildProbe,validate};
