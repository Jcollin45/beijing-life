// Pure-Node build and acceptance probe for the revision-2 zoo expansion.
// It exercises the real Build.scene compiler without launching a browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const ROOT = __dirname;
const PLAN = require('./ZOO-EXPANSION-BLUEPRINT.json');

function context() {
  const ctx = {
    console, performance, Math, Date, JSON, Map, Set, WeakMap, WeakSet, Proxy, Reflect,
    Object, Array, Number, String, Boolean, RegExp, Error, TypeError, Float32Array,
    Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer,
    setTimeout() { return 0; }, clearTimeout() {},
    ZOO_BLUEPRINT: PLAN,
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
  run(ctx, 'js/zoo-expansion.js');
  run(ctx, 'js/zoo.js');
  run(ctx, 'js/zoo-tropical.js');
  const outdoor = vm.runInContext("Lazy.force('Zoo')", ctx, { timeout:120000 });
  const tropical = vm.runInContext("Lazy.force('ZooTropical')", ctx, { timeout:120000 });
  const npcRows = vm.runInContext('ZooExpansion.npcRows(ZOO_BLUEPRINT)',ctx,{timeout:30000});
  const zooUse = vm.runInContext("ZooExpansion.useRows(ZOO_BLUEPRINT,'zoo')",ctx,{timeout:30000});
  const tropicalUse = vm.runInContext("ZooExpansion.useRows(ZOO_BLUEPRINT,'zoo_tropical')",ctx,
    {timeout:30000});
  return { ctx, outdoor, tropical, npcRows, zooUse, tropicalUse, plan:PLAN };
}

const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
function standable(scene, at, radius = PLAN.engineContract.playerRadius) {
  const q = scene.clampMove(at[0], at[1], at[0], at[1], radius);
  return dist(q, at) < 1e-5;
}
function finiteScene(scene) {
  return scene.props.every(p => p.color && p.color.length === 3 &&
    p.color.every(Number.isFinite) && p.m && [...p.m].every(Number.isFinite));
}
function idSet(rows) { return new Set(rows.map(x => x.blueprintId).filter(Boolean)); }

function validate(probe = buildProbe()) {
  const { outdoor:o, tropical:t, npcRows, zooUse, tropicalUse, plan:p } = probe;
  const failures = [], pass = [];
  const check = (name, ok, detail = '') => (ok ? pass : failures).push(detail ? `${name}: ${detail}` : name);
  check('outdoor scene built', o.props.length > 0);
  check('Tropical House built', t.props.length > 0);
  check('all outdoor prop transforms and colours are finite', finiteScene(o));
  check('all tropical prop transforms and colours are finite', finiteScene(t));
  check('outdoor prop budget', o.props.length <= p.performanceBudgets.outdoorTotalProps,
    `${o.props.length}/${p.performanceBudgets.outdoorTotalProps}`);
  check('tropical prop budget', t.props.length <= p.performanceBudgets.tropicalProps,
    `${t.props.length}/${p.performanceBudgets.tropicalProps}`);
  check('outdoor solid budget', o.solids.length <= p.performanceBudgets.bodySolids,
    `${o.solids.length}/${p.performanceBudgets.bodySolids}`);
  check('outdoor blocker budget', o.blockers.length <= p.performanceBudgets.cameraBlockers,
    `${o.blockers.length}/${p.performanceBudgets.cameraBlockers}`);
  check('outdoor things budget', o.things.length <= p.performanceBudgets.things,
    `${o.things.length}/${p.performanceBudgets.things}`);

  const oThingIds=idSet(o.things), tThingIds=idSet(t.things), oPropIds=idSet(o.props);
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
  const tropDoor=o.things.find(x=>x.blueprintId==='TH-tropical');
  check('Tropical House entrance transitions',!!(tropDoor&&tropDoor.exit&&tropDoor.exit.place==='zoo_tropical'));
  const exit=t.things.find(x=>x.blueprintId==='TH-trop-exit');
  check('Tropical House exit returns exactly',!!(exit&&exit.exit&&exit.exit.place==='zoo'&&
    exit.exit.at.x===p.site.tropicalReturn.at[0]&&exit.exit.at.z===p.site.tropicalReturn.at[1]));
  for(const s of p.buildings.find(b=>b.id==='B08-tropical-house').scene.speciesThings)
    check(`${s.id} tropical species thing exists`,tThingIds.has(s.id));
  check('outdoor spawn standable',standable(o,[o.spawn.x,o.spawn.z]));
  check('tropical spawn standable',standable(t,[t.spawn.x,t.spawn.z]));
  const animals=npcRows.filter(n=>n.animal), expectedAnimals=p.habitats.reduce((n,h)=>
    n+h.animalSlots.length,0);
  check('every expansion animal slot has one NPC',animals.length===expectedAnimals,
    `${animals.length}/${expectedAnimals}`);
  check('three keeper routes are populated',npcRows.filter(n=>n.serviceRoute).length===3);
  check('three visitor loops are populated',npcRows.filter(n=>
    /(?:^|-)R-VIS-/.test(n.npcId||'') && Array.isArray(n.spots) && n.spots.length>1).length===3);
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
