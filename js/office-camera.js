'use strict';

// Shared office-camera visibility kernel. The browser runtime and the Node adversaries execute
// this exact object: office furniture never rewrites requested yaw or zoom. Instead, the handful
// of local opaque parts that contain the eye or cover the avatar join the existing cutaway for a
// short, hysteretic interval. All hot-path arrays, maps and sets are retained per scene.
const OfficeCamera = (() => {
  const VERSION = 'office-camera-cut-v1';
  const CELL = 2, HOLD = .12, MAX_GROUP_PROPS = 32, MAX_GROUP_EXTENT = 2.8;
  // Renderer/weather contract: the strongest authored wind is sand.wind 1.05 times the live
  // gust multiplier ceiling (0.62 + 0.55). gl.js clamps uploads to this same value.
  const MAX_FOLIAGE_WIND = Math.fround(1.05 * 1.17);
  const FOLIAGE_BASE_SWAY = .055, FOLIAGE_WIND_SWAY = .16;
  const MAX_HIDDEN = 128, MAX_FOOTPRINT = 24;
  // This kernel is public to the runtime and the Node checks. A malformed numeric pose must not
  // turn the spatial-cell loops into an effectively unbounded walk: at Number.MAX_VALUE even
  // `ix++` cannot advance. Real office shots span fewer than twenty cells; this deliberately
  // generous ceiling rejects only an invalid camera segment while preserving every authored one.
  const MAX_QUERY_CELLS = 256, MAX_INDEX_CELLS = 1024;
  // The numeric grid key reserves 4096 z-cells per x-cell. Keeping this office-only domain below
  // half that stride makes the key injective even after the largest accepted indexed sweep.
  const MAX_VECTOR_COORD = 1024, MAX_CAMERA_DISTANCE = 64;
  const CAMERA_DOLLY_RATE = 2.80;
  // World alpha batches still write depth before the opaque player is drawn. Even a faint pane
  // can therefore erase avatar fragments; only presentation-noise below four percent is ignored.
  const MIN_DEPTH_ALPHA = .04, PAD = .035, BODY_PAD = .34;
  // These are the authored close-shot composition contract as well as the runtime cutaway rays:
  // torso centre, head centre/crown and both shoulder tips must remain visible. Keeping the two
  // lists identical prevents a legal orbit from passing a coarse centreline test while clipping
  // an outer shoulder or drawing a rail through the top of the head.
  const PROBES = [[0, 1.10], [0, 1.16], [0, 1.69], [0, 1.82], [-.22, 1.42], [.22, 1.42],
    [-.14, .86], [.14, .86], [0, .24]];
  const caches = new WeakMap();

  const boundedScalar = value => Number.isFinite(value) && Math.abs(value) <= MAX_VECTOR_COORD;
  const boundedVector = (value, count) => {
    if (!value) return false;
    for (let i = 0; i < count; i++) if (!boundedScalar(value[i])) return false;
    return true;
  };
  const boundedObb = b => !!b && boundedScalar(b.x) && boundedScalar(b.y) &&
    boundedScalar(b.z) && boundedScalar(b.sx) && boundedScalar(b.sy) && boundedScalar(b.sz) &&
    b.sx >= 0 && b.sy >= 0 && b.sz >= 0 && (b.ry === undefined || Number.isFinite(b.ry));
  const boundedAffineMatrix = m => !!m&&m.length===16&&boundedVector(m,16)&&
    m[3]===0&&m[7]===0&&m[11]===0&&m[15]===1;
  const obbContains = (outer, inner) => {
    if(!boundedObb(outer)||!boundedObb(inner)||
        inner.y-inner.sy/2<outer.y-outer.sy/2||
        inner.y+inner.sy/2>outer.y+outer.sy/2)return false;
    if(Math.abs(outer.ry||0)<=1e-12&&Math.abs(inner.ry||0)<=1e-12)
      return inner.x-inner.sx/2>=outer.x-outer.sx/2&&
        inner.x+inner.sx/2<=outer.x+outer.sx/2&&
        inner.z-inner.sz/2>=outer.z-outer.sz/2&&
        inner.z+inner.sz/2<=outer.z+outer.sz/2;
    const co=Math.cos(outer.ry||0),so=Math.sin(outer.ry||0);
    const ci=Math.cos(inner.ry||0),si=Math.sin(inner.ry||0);
    for(const ux of [-1,1])for(const uz of [-1,1]){
      const wx=inner.x+ci*ux*inner.sx/2+si*uz*inner.sz/2;
      const wz=inner.z-si*ux*inner.sx/2+ci*uz*inner.sz/2;
      const dx=wx-outer.x,dz=wz-outer.z;
      if(Math.abs(co*dx-so*dz)>outer.sx/2||
          Math.abs(so*dx+co*dz)>outer.sz/2)return false;
    }
    return true;
  };
  const transformAabb = (m,mode) => {
    if(!boundedAffineMatrix(m))return null;
    const f=i=>Math.fround(m[i]);
    let ex=(Math.abs(f(0))+Math.abs(f(4))+Math.abs(f(8)))/2;
    let ey=(Math.abs(f(1))+Math.abs(f(5))+Math.abs(f(9)))/2;
    let ez=(Math.abs(f(2))+Math.abs(f(6))+Math.abs(f(10)))/2;
    if(mode===15){
      const scaleX=Math.hypot(f(0),f(1),f(2)),scaleZ=Math.hypot(f(8),f(9),f(10));
      const a=(FOLIAGE_BASE_SWAY+FOLIAGE_WIND_SWAY*MAX_FOLIAGE_WIND)/
        Math.max(.35,.5*Math.hypot(scaleX,scaleZ));
      ex+=a*(Math.abs(f(0))+Math.abs(f(8)));
      ey+=a*(Math.abs(f(1))+Math.abs(f(9)));
      ez+=a*(Math.abs(f(2))+Math.abs(f(10)));
    }
    return {x:f(12),y:f(13),z:f(14),ry:0,sx:ex*2,sy:ey*2,sz:ez*2};
  };
  const effectiveCoversRender = (p,b,base) => {
    if(!obbContains(b,base))return false;
    if(!p.m)return true;
    const transformed=transformAabb(p.m,p.mode);
    return !!transformed&&obbContains(b,transformed);
  };
  const conservativeRenderObb = p => {
    const base=p&&p.ob,transformed=p&&p.m&&transformAabb(p.m,p.mode);
    if(!boundedObb(base))return transformed;
    if(!transformed)return base;
    const c=Math.cos(base.ry||0),s=Math.sin(base.ry||0);
    const ex=(Math.abs(c)*base.sx+Math.abs(s)*base.sz)/2;
    const ez=(Math.abs(s)*base.sx+Math.abs(c)*base.sz)/2;
    const x0=Math.min(base.x-ex,transformed.x-transformed.sx/2);
    const x1=Math.max(base.x+ex,transformed.x+transformed.sx/2);
    const y0=Math.min(base.y-base.sy/2,transformed.y-transformed.sy/2);
    const y1=Math.max(base.y+base.sy/2,transformed.y+transformed.sy/2);
    const z0=Math.min(base.z-ez,transformed.z-transformed.sz/2);
    const z1=Math.max(base.z+ez,transformed.z+transformed.sz/2);
    return {x:(x0+x1)/2,y:(y0+y1)/2,z:(z0+z1)/2,ry:0,
      sx:x1-x0,sy:y1-y0,sz:z1-z0};
  };
  const zeroSweep = p => {
    const x = p.cameraSweepX === undefined ? 0 : p.cameraSweepX;
    const z = p.cameraSweepZ === undefined ? 0 : p.cameraSweepZ;
    return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 1e-9 && Math.abs(z) <= 1e-9;
  };
  const optionalFalse = (p,key) => p[key]===undefined||p[key]===false;
  const aggregateMeshes = new Set(['cyl','ball']);
  const canonicalMode = p => p.mode===undefined||
    typeof p.mode==='number'&&Number.isInteger(p.mode)&&p.mode>=0&&p.mode<=19;
  const batchRenderMatches = p => {
    const batch=p.batch;
    if(batch===undefined||batch===null)return true;
    return Object.prototype.hasOwnProperty.call(p,'batch')&&typeof batch==='object'&&
      batch.mesh===p.mesh&&batch.opt&&typeof batch.opt==='object'&&
      batch.opt.mode===(p.mode===undefined?0:p.mode);
  };
  const blockedGroupSegments=new Set(['__proto__','constructor','prototype']);
  const canonicalAggregateGroup=(scene,p)=>{
    if(!p||!Object.prototype.hasOwnProperty.call(p,'cameraGroup'))return false;
    const id=p.cameraGroup;
    return typeof id==='string'&&id.length>0&&id===id.trim()&&
      !id.split(':').some(part=>blockedGroupSegments.has(part))&&
      (!(scene&&typeof scene.officeFloor==='string'&&scene.officeFloor)||
        id.startsWith(`${scene.officeFloor}:`));
  };
  const aggregateStaticMember = p => {
    const b=p&&(p.cameraOb||p.ob),base=p&&p.ob;
    return !!p&&optionalFalse(p,'renderHidden')&&optionalFalse(p,'dynamic')&&
      optionalFalse(p,'partition')&&canonicalMode(p)&&batchRenderMatches(p)&&
      aggregateMeshes.has(p.mesh)&&
    (p.alpha === undefined || Number.isFinite(p.alpha) && p.alpha >= MIN_DEPTH_ALPHA) &&
      zeroSweep(p)&&boundedObb(b)&&b.y+b.sy/2>=.20&&b.y-b.sy/2<=3.20&&
      boundedObb(base)&&effectiveCoversRender(p,b,base)&&
      (!p.m||boundedAffineMatrix(p.m)&&
        Math.abs(p.m[12]-base.x)<=1e-6&&Math.abs(p.m[13]-base.y)<=1e-6&&
        Math.abs(p.m[14]-base.z)<=1e-6)&&
      (!Object.prototype.hasOwnProperty.call(p,'cameraOccluder')||
        typeof p.cameraOccluder==='boolean')&&
      (Object.prototype.hasOwnProperty.call(p,'cameraOccluder')||
        p.cameraOccluder===undefined);
  };
  const aggregateDepthMember = (p, value) => aggregateStaticMember(p) &&
    Object.prototype.hasOwnProperty.call(p,'cameraOccluder')&&p.cameraOccluder === value;
  const localGroup = (count,x0,x1,z0,z1,footprint) =>
    count<=MAX_GROUP_PROPS&&Number.isFinite(footprint)&&
    x1-x0<=MAX_GROUP_EXTENT&&z1-z0<=MAX_GROUP_EXTENT&&footprint<=MAX_FOOTPRINT;
  const aggregateSnapshot = p => {
    const b = p.cameraOb || p.ob, m = p.m;
    const numbers=q=>q?[q.x,q.y,q.z,q.sx,q.sy,q.sz,q.ry]:null;
    const batch=p.batch,batchOpt=batch&&batch.opt;
    return { p, cameraOb:p.cameraOb, ob:p.ob, b,
      cameraObNumbers:numbers(p.cameraOb),obNumbers:numbers(p.ob),
      cameraOccluder:p.cameraOccluder,cameraGroup:p.cameraGroup,
      cameraOccluderOwn:Object.prototype.hasOwnProperty.call(p,'cameraOccluder'),
      cameraGroupOwn:Object.prototype.hasOwnProperty.call(p,'cameraGroup'),
      cameraSweepX:p.cameraSweepX,cameraSweepZ:p.cameraSweepZ,
      renderHidden:p.renderHidden,dynamic:p.dynamic,mesh:p.mesh,alpha:p.alpha,tag:p.tag,m,
      mode:p.mode,partition:p.partition,batch,batchMesh:batch&&batch.mesh,batchOpt,
      batchMode:batchOpt&&batchOpt.mode,batchOwn:Object.prototype.hasOwnProperty.call(p,'batch'),
      mNumbers:m?Array.from(m):null };
  };
  const sameAggregateOb=(a,o)=>a===null?o==null:!!o&&a[0]===o.x&&a[1]===o.y&&a[2]===o.z&&
    a[3]===o.sx&&a[4]===o.sy&&a[5]===o.sz&&a[6]===o.ry;
  function aggregateSnapshotFresh(q) {
    const p=q.p,b=p.cameraOb||p.ob,m=p.m;
    if(!sameAggregateOb(q.cameraObNumbers,p.cameraOb)||
        !sameAggregateOb(q.obNumbers,p.ob)||
        (q.mNumbers===null)!=(m===null||m===undefined)||q.mNumbers&&q.mNumbers.length!==m.length)
      return false;
    if(q.mNumbers)for(let i=0;i<q.mNumbers.length;i++)if(q.mNumbers[i]!==m[i])return false;
    return p.cameraOb===q.cameraOb&&p.ob===q.ob&&b===q.b&&
      p.cameraOccluder===q.cameraOccluder&&
      Object.prototype.hasOwnProperty.call(p,'cameraOccluder')===q.cameraOccluderOwn&&
      p.cameraGroup===q.cameraGroup&&
      Object.prototype.hasOwnProperty.call(p,'cameraGroup')===q.cameraGroupOwn&&
      p.cameraSweepX===q.cameraSweepX&&
      p.cameraSweepZ===q.cameraSweepZ&&p.renderHidden===q.renderHidden&&
      p.dynamic===q.dynamic&&p.partition===q.partition&&p.mesh===q.mesh&&p.mode===q.mode&&
      p.alpha===q.alpha&&p.tag===q.tag&&m===q.m&&p.batch===q.batch&&
      Object.prototype.hasOwnProperty.call(p,'batch')===q.batchOwn&&
      (!p.batch||p.batch.mesh===q.batchMesh&&p.batch.opt===q.batchOpt&&
        p.batch.opt&&p.batch.opt.mode===q.batchMode);
  }

  const substantial = b => {
    const footprint = b.sx * b.sz, span = Math.max(b.sx, b.sz), thin = Math.min(b.sx, b.sz);
    return footprint >= .012 && span >= .14 ||
      // Tall seals and rails can collectively cover the avatar despite tiny footprints. The
      // service-lift jambs are 26 x 20 mm in plan, so height is the truthful ownership signal.
      b.sy >= .70 && span >= .018 && thin >= .010 ||
      b.sy >= .025 && footprint >= .04 && span >= .20;
  };

  function build(scene, rejectAggregateEpoch = false) {
    const grid = new Map(), entries = [], byGroup = new Map(), allByGroup = new Map(),
      byProp = new Map(),groupIdByProp=new Map();
    let rejectedGeometry = 0, invalidOccluderMetadata = 0, explicitOccluders = 0,
      forcedOccluders = 0, invalidAggregateMetadata = 0, maxEntryCells = 0;
    const props = scene.props || [], actionTags = new Set((scene.things || [])
      .filter(th => th.officeAction).map(th => th.tag));
    const propSet=new Set(props),sceneBatchSet=new Set(Array.isArray(scene.batches)?scene.batches:[]),
      batchMemberCounts=new Map(),batchCoherence=new Map();
    for(const p of props)if(p&&p.batch)batchMemberCounts.set(p.batch,
      (batchMemberCounts.get(p.batch)||0)+1);
    const coherentBatchMember=p=>{
      const batch=p.batch;if(!batch)return true;
      let valid=batchCoherence.get(batch);
      if(valid===undefined){
        const members=batch.props,seen=new Set();
        valid=sceneBatchSet.has(batch)&&Array.isArray(members)&&
          members.length===batchMemberCounts.get(batch);
        if(valid)for(const member of members)if(!propSet.has(member)||member.batch!==batch||
            seen.has(member)){valid=false;break;}else seen.add(member);
        batchCoherence.set(batch,valid);
      }
      return valid&&batch.props.includes(p);
    };
    const authoredGroups = new Map(), aggregateRepresented = new Set(), aggregateLeaders = new Map();
    for (const p of props) if (p && typeof p === 'object' && canonicalAggregateGroup(scene,p)) {
      groupIdByProp.set(p,p.cameraGroup);
      let group = authoredGroups.get(p.cameraGroup);
      if (!group) { group = []; authoredGroups.set(p.cameraGroup, group); }
      group.push(p);
    }
    for(const group of authoredGroups.values())if(group.some(p=>
      Object.prototype.hasOwnProperty.call(p,'cameraOccluder')&&p.cameraOccluder===false))
      for(const p of group)if(p.batch&&!coherentBatchMember(p))throw new Error(
        'OfficeCamera aggregate batch membership changed; rebuild batches and invalidate(scene)');
    const obbAabb = b => {
      if (!boundedObb(b)) return null;
      const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0);
      const ex = (Math.abs(c) * b.sx + Math.abs(s) * b.sz) / 2;
      const ez = (Math.abs(s) * b.sx + Math.abs(c) * b.sz) / 2;
      return { x0:b.x-ex, x1:b.x+ex, y0:b.y-b.sy/2, y1:b.y+b.sy/2,
        z0:b.z-ez, z1:b.z+ez };
    };
    const aggregateGroupEligible=new Map();
    for(const [id,group] of authoredGroups){
      let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
      const leaders=group.filter(p=>aggregateDepthMember(p,true));
      let valid=leaders.length===1&&group.some(p=>aggregateDepthMember(p,false))&&
        group.length<=MAX_GROUP_PROPS&&group.every(p=>
        aggregateStaticMember(p)&&coherentBatchMember(p)&&canonicalAggregateGroup(scene,p)&&
        !actionTags.has(p.tag));
      if(valid)for(const p of group){
        const q=obbAabb(p.cameraOb||p.ob);
        x0=Math.min(x0,q.x0);x1=Math.max(x1,q.x1);
        z0=Math.min(z0,q.z0);z1=Math.max(z1,q.z1);
      }
      const extentX=x1-x0,extentZ=z1-z0,footprint=extentX*extentZ;
      valid=valid&&localGroup(group.length,x0,x1,z0,z1,footprint);
      aggregateGroupEligible.set(id,valid);
    }
    for (const p of props) if (p&&Object.prototype.hasOwnProperty.call(p,'cameraOccluder')&&
        p.cameraOccluder===false) {
      const group = canonicalAggregateGroup(scene,p)&&authoredGroups.get(p.cameraGroup),
        inner = obbAabb(p.cameraOb || p.ob);
      const leader = !rejectAggregateEpoch && scene.cutaway===false&&aggregateDepthMember(p, false) &&
        !actionTags.has(p.tag) && group&&aggregateGroupEligible.get(p.cameraGroup)&&
        group.find(q =>
          aggregateDepthMember(q, true) && obbContains(q.cameraOb || q.ob,p.cameraOb||p.ob));
      if (leader) { aggregateRepresented.add(p); aggregateLeaders.set(p, leader); }
      else invalidAggregateMetadata++;
    }
    const addCell = (key, entry) => {
      let list = grid.get(key);
      if (!list) { list = []; grid.set(key, list); }
      list.push(entry);
    };
    for (let index = 0; index < props.length; index++) {
      const p = props[index];
      if (!p || typeof p !== 'object') { rejectedGeometry++; continue; }
      const hasExplicitOccluder = Object.prototype.hasOwnProperty.call(p, 'cameraOccluder');
      const explicitOccluder=hasExplicitOccluder?p.cameraOccluder:undefined;
      if (hasExplicitOccluder && typeof p.cameraOccluder !== 'boolean') {
        invalidOccluderMetadata++; rejectedGeometry++; continue;
      }
      const groupId=groupIdByProp.get(p);
      if (groupId) {
        let all = allByGroup.get(groupId);
        if (!all) { all = []; allByGroup.set(groupId, all); }
        all.push(p);
      }
      // A validated false member is rendered with its fixture but represented in this index by a
      // same-group conservative leader. Invalid claims fail closed: they remain independently
      // indexable and are surfaced by metrics/audits rather than silently losing camera geometry.
      if (aggregateRepresented.has(p)) continue;
      const invalidAggregate = explicitOccluder===false;
      const b = invalidAggregate ? conservativeRenderObb(p) : p.cameraOb || p.ob;
      if (!b || p.mesh === 'flat' || p.alpha !== undefined && p.alpha < MIN_DEPTH_ALPHA) continue;
      if (!boundedObb(b)) { rejectedGeometry++; continue; }
      const bottom = b.y - b.sy / 2, top = b.y + b.sy / 2;
      const naturallySubstantial = substantial(b) || p.cameraSweepX || p.cameraSweepZ;
      if (top < .20 || bottom > 3.20 ||
          !naturallySubstantial && explicitOccluder!==true && !invalidAggregate) continue;
      const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0);
      const ex = Math.abs(c) * b.sx / 2 + Math.abs(s) * b.sz / 2;
      const ez = Math.abs(s) * b.sx / 2 + Math.abs(c) * b.sz / 2;
      const rawSweepX = p.cameraSweepX === undefined ? 0 : p.cameraSweepX;
      const rawSweepZ = p.cameraSweepZ === undefined ? 0 : p.cameraSweepZ;
      if (!boundedScalar(rawSweepX) || !boundedScalar(rawSweepZ)) {
        rejectedGeometry++; continue;
      }
      const sweepX = Math.abs(rawSweepX), sweepZ = Math.abs(rawSweepZ);
      const entry = { p, b, index, x0:b.x - ex - sweepX, x1:b.x + ex + sweepX,
        z0:b.z - ez - sweepZ, z1:b.z + ez + sweepZ,
        footprint:b.sx * b.sz, mark:0 };
      const ix0 = Math.floor(entry.x0 / CELL), ix1 = Math.floor(entry.x1 / CELL);
      const iz0 = Math.floor(entry.z0 / CELL), iz1 = Math.floor(entry.z1 / CELL);
      const nx = ix1 - ix0 + 1, nz = iz1 - iz0 + 1, cells = nx * nz;
      if (!Number.isSafeInteger(ix0) || !Number.isSafeInteger(ix1) ||
          !Number.isSafeInteger(iz0) || !Number.isSafeInteger(iz1) ||
          nx <= 0 || nz <= 0 || nx > MAX_INDEX_CELLS || nz > MAX_INDEX_CELLS ||
          cells > MAX_INDEX_CELLS) {
        rejectedGeometry++; continue;
      }
      maxEntryCells = Math.max(maxEntryCells, cells);
      entries.push(entry); byProp.set(p, entry);
      if (explicitOccluder===true) {
        explicitOccluders++;
        if (!naturallySubstantial) forcedOccluders++;
      }
      if (groupId) {
        let group = byGroup.get(groupId);
        if (!group) { group = []; byGroup.set(groupId, group); }
        group.push(entry);
      }
      for (let ix = ix0; ix <= ix1; ix++)
        for (let iz = iz0; iz <= iz1; iz++)
          addCell(ix * 4096 + iz, entry);
    }
    const groupMeta = new Map();
    for (const [group, props] of allByGroup) {
      const entriesForGroup = byGroup.get(group) || [];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of props) {
        const b = p.cameraOb || p.ob;
        if (!boundedObb(b)) continue;
        const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0);
        const ex = Math.abs(c) * b.sx / 2 + Math.abs(s) * b.sz / 2;
        const ez = Math.abs(s) * b.sx / 2 + Math.abs(c) * b.sz / 2;
        x0 = Math.min(x0, b.x - ex); x1 = Math.max(x1, b.x + ex);
        z0 = Math.min(z0, b.z - ez); z1 = Math.max(z1, b.z + ez);
      }
      const footprint = Number.isFinite(x0) ? (x1 - x0) * (z1 - z0)
        : entriesForGroup.reduce((sum, q) => sum + q.footprint, 0);
      const tags = [...new Set(props.map(p => p.tag).filter(Boolean))];
      groupMeta.set(group, { props, entries:entriesForGroup, count:props.length,
        footprint, x0, x1, z0, z1, tags,
        action:props.some(p=>actionTags.has(p.tag)) });
    }
    let groupedProps=0;
    for(const q of groupMeta.values())groupedProps+=q.count;
    const guarded=new Set();
    for(const [p,leader] of aggregateLeaders){
      guarded.add(p);guarded.add(leader);
      for(const member of authoredGroups.get(p.cameraGroup)||[])guarded.add(member);
    }
    const aggregateGuards=[...guarded].map(p=>({...aggregateSnapshot(p),index:props.indexOf(p)}));
    const guardedBatches=new Set();
    for(const guard of aggregateGuards)if(guard.p.batch)guardedBatches.add(guard.p.batch);
    const aggregateBatchGuards=[...guardedBatches].map(batch=>({batch,
      propsArray:batch.props,propsLength:batch.props.length,members:batch.props.slice()}));
    const groupActionTracked=authoredGroups.size>0;
    const aggregateActionGuards=groupActionTracked?(scene.things||[])
      .map((th,i)=>({th,i,tag:th.tag,officeAction:th.officeAction})):[];
    // Retained structure snapshots keep caller-owned scenes mutable. Freshness performs one
    // allocation-free pass and requires explicit invalidate(scene) before coherent regrouping.
    const aggregateStructureProps=aggregateGuards.length?props.slice():[];
    const aggregateStructureGroups=aggregateGuards.length?props.map(p=>p&&p.cameraGroup):[];
    const aggregateStructureOccluders=aggregateGuards.length?props.map(p=>p&&p.cameraOccluder):[];
    const aggregateStructureGroupOwn=aggregateGuards.length?props.map(p=>!!p&&
      Object.prototype.hasOwnProperty.call(p,'cameraGroup')):[];
    const aggregateStructureOccluderOwn=aggregateGuards.length?props.map(p=>!!p&&
      Object.prototype.hasOwnProperty.call(p,'cameraOccluder')):[];
    const cache = { propsLength:(scene.props || []).length, grid, entries,
      byGroup, allByGroup, groupMeta, byProp,groupIdByProp,actionTags,
      aggregateGuards,aggregateActionGuards,aggregatePropsArray:props,
      aggregateBatchGuards,
      aggregateBatchesArray:aggregateBatchGuards.length?scene.batches:null,
      aggregateBatchesLength:aggregateBatchGuards.length?scene.batches.length:0,
      aggregateBatchesMembers:aggregateBatchGuards.length?scene.batches.slice():[],
      aggregateStructureProps,aggregateStructureGroups,aggregateStructureOccluders,
      aggregateStructureGroupOwn,aggregateStructureOccluderOwn,
      aggregateThingsLength:groupActionTracked?(scene.things||[]).length:0,groupActionTracked,
      aggregateCutaway:aggregateGuards.length?scene.cutaway:undefined,
      aggregateOfficeFloor:aggregateGuards.length?scene.officeFloor:undefined,
      groupedProps,
      query:[], hidden:new Set(), hiddenGroups:new Set(), held:new Map(), heldGroups:new Map(),
      activeProps:new Set(), activeGroups:new Set(), serial:0, clock:0, roomId:null,
      queryValid:true,
      lastBodyX:NaN, lastBodyZ:NaN, lastYaw:NaN, currentFootprint:0, currentCount:0,
      metrics:{ builds:1, queries:0, examined:0, maxExamined:0, maxCandidates:0,
        rayTests:0, maxRayTests:0, maxHidden:0, maxFootprint:0, capHits:0,
        groupFallbacks:0, evictions:0, fastReleases:0, invalidInputs:0, rejectedQueries:0,
        rejectedGeometry, invalidOccluderMetadata, explicitOccluders, forcedOccluders,
        aggregateRepresented:aggregateRepresented.size, invalidAggregateMetadata,
        aggregateEpochRejected:rejectAggregateEpoch?1:0,
        maxEntryCells, maxQueryCells:0, lastQueryCells:0,
        maxCountCut:null, maxFootprintCut:null,
        lastCandidates:0, lastExamined:0, lastRayTests:0, lastHidden:0,
        lastCurrentGroups:0, lastHeldGroups:0, lastCurrentProps:0, lastHeldProps:0 } };
    caches.set(scene, cache);
    return cache;
  }

  function index(scene) {
    const q = caches.get(scene);
    const props=scene.props,propsLength=props?props.length:0;
    if(q&&q.aggregateGuards.length&&q.propsLength!==propsLength)
      throw new Error('OfficeCamera aggregate proxy geometry changed without invalidate(scene)');
    if(q&&q.propsLength===propsLength){
      let fresh=true;
      if(q.aggregateGuards.length&&props!==q.aggregatePropsArray)fresh=false;
      if(q.aggregateGuards.length&&scene.cutaway!==q.aggregateCutaway)fresh=false;
      if(q.aggregateGuards.length&&scene.officeFloor!==q.aggregateOfficeFloor)fresh=false;
      if(fresh&&q.aggregateBatchGuards.length){
        const batches=scene.batches;
        if(batches!==q.aggregateBatchesArray||!Array.isArray(batches)||
            batches.length!==q.aggregateBatchesLength)fresh=false;
        else for(let i=0;i<q.aggregateBatchesLength;i++)if(
          batches[i]!==q.aggregateBatchesMembers[i]){fresh=false;break;}
      }
      if(fresh)for(const guard of q.aggregateBatchGuards){
        const members=guard.batch.props;
        if(members!==guard.propsArray||!Array.isArray(members)||
            members.length!==guard.propsLength){fresh=false;break;}
        for(let i=0;i<guard.propsLength;i++)if(members[i]!==guard.members[i]){
          fresh=false;break;
        }
        if(!fresh)break;
      }
      if(fresh&&q.aggregateGuards.length)for(let i=0;i<q.propsLength;i++){
        const p=props[i];
        if(p!==q.aggregateStructureProps[i]||p&&
            (p.cameraGroup!==q.aggregateStructureGroups[i]||
             p.cameraOccluder!==q.aggregateStructureOccluders[i]||
             Object.prototype.hasOwnProperty.call(p,'cameraGroup')!==
               q.aggregateStructureGroupOwn[i]||
             Object.prototype.hasOwnProperty.call(p,'cameraOccluder')!==
               q.aggregateStructureOccluderOwn[i])){fresh=false;break;}
      }
      for(const guard of q.aggregateGuards)if(props[guard.index]!==guard.p||
          !aggregateSnapshotFresh(guard)){fresh=false;break;}
      if(fresh&&q.groupActionTracked&&q.aggregateThingsLength!==(scene.things||[]).length)
        fresh=false;
      if(fresh)for(const guard of q.aggregateActionGuards)
        if((scene.things||[])[guard.i]!==guard.th||guard.th.tag!==guard.tag||
            guard.th.officeAction!==guard.officeAction){fresh=false;break;}
      if(!fresh)throw new Error('OfficeCamera aggregate proxy geometry changed without invalidate(scene)');
      return q;
    }
    return build(scene);
  }

  function invalidate(scene) { if (scene) caches.delete(scene); }

  function segmentHitsExpandedAabb(ax, az, bx, bz, q, pad) {
    let lo = 0, hi = 1;
    const dx = bx - ax, dz = bz - az;
    if (Math.abs(dx) < 1e-9) {
      if (ax < q.x0 - pad || ax > q.x1 + pad) return false;
    } else {
      let a = (q.x0 - pad - ax) / dx, b = (q.x1 + pad - ax) / dx;
      if (a > b) { const t = a; a = b; b = t; }
      lo = Math.max(lo, a); hi = Math.min(hi, b); if (hi < lo) return false;
    }
    if (Math.abs(dz) < 1e-9) return az >= q.z0 - pad && az <= q.z1 + pad;
    let a = (q.z0 - pad - az) / dz, b = (q.z1 + pad - az) / dz;
    if (a > b) { const t = a; a = b; b = t; }
    lo = Math.max(lo, a); hi = Math.min(hi, b);
    return hi >= lo;
  }

  function query(scene, target, eye) {
    const cache = index(scene), out = cache.query;
    out.length = 0;
    const x0 = Math.min(target[0], eye[0]) - BODY_PAD;
    const x1 = Math.max(target[0], eye[0]) + BODY_PAD;
    const z0 = Math.min(target[2], eye[2]) - BODY_PAD;
    const z1 = Math.max(target[2], eye[2]) + BODY_PAD;
    const ix0 = Math.floor(x0 / CELL), ix1 = Math.floor(x1 / CELL);
    const iz0 = Math.floor(z0 / CELL), iz1 = Math.floor(z1 / CELL);
    const nx = ix1 - ix0 + 1, nz = iz1 - iz0 + 1;
    cache.queryValid = Number.isSafeInteger(ix0) && Number.isSafeInteger(ix1) &&
      Number.isSafeInteger(iz0) && Number.isSafeInteger(iz1) &&
      nx > 0 && nz > 0 && nx <= MAX_QUERY_CELLS && nz <= MAX_QUERY_CELLS &&
      nx * nz <= MAX_QUERY_CELLS;
    if (!cache.queryValid) {
      cache.metrics.rejectedQueries++;
      cache.metrics.lastQueryCells = cache.metrics.lastExamined = cache.metrics.lastCandidates = 0;
      return cache;
    }
    const queryCells = nx * nz;
    cache.metrics.lastQueryCells = queryCells;
    cache.metrics.maxQueryCells = Math.max(cache.metrics.maxQueryCells, queryCells);
    const mark = ++cache.serial;
    let examined = 0;
    for (let ix = ix0; ix <= ix1; ix++)
      for (let iz = iz0; iz <= iz1; iz++) {
        const list = cache.grid.get(ix * 4096 + iz);
        if (!list) continue;
        for (const q of list) {
          if (q.mark === mark) continue;
          q.mark = mark; examined++;
          if (q.x1 < x0 || q.x0 > x1 || q.z1 < z0 || q.z0 > z1 ||
              !segmentHitsExpandedAabb(eye[0], eye[2], target[0], target[2], q, BODY_PAD)) continue;
          out.push(q);
        }
      }
    const m = cache.metrics;
    m.queries++; m.examined += examined; m.lastExamined = examined; m.lastCandidates = out.length;
    m.maxExamined = Math.max(m.maxExamined, examined);
    m.maxCandidates = Math.max(m.maxCandidates, out.length);
    return cache;
  }

  function beyondCut(hideX, hideZ, cut, x, z) {
    return hideX > 0 && x > cut.x1 - .42 || hideX < 0 && x < cut.x0 + .42 ||
      hideZ > 0 && z > cut.z1 - .42 || hideZ < 0 && z < cut.z0 + .42;
  }

  function cutawayHidden(scene, room, eye, p, wallsOff) {
    if (p.renderHidden) return true;
    if (wallsOff && p.partition) return true;
    if (!scene.cutaway || p.nocut || !room) return false;
    const cut = room.cut || room;
    const hideX = eye[0] > cut.x1 ? 1 : eye[0] < cut.x0 ? -1 : 0;
    const hideZ = eye[2] > cut.z1 ? 1 : eye[2] < cut.z0 ? -1 : 0;
    if (!hideX && !hideZ) return false;
    const b = p.tag && scene.tagBox && scene.tagBox[p.tag];
    if (b && b.x0 >= room.x0 && b.x1 <= room.x1 && b.z0 >= room.z0 && b.z1 <= room.z1)
      return beyondCut(hideX, hideZ, cut, b.cx, b.cz);
    const ob = p.cameraOb || p.ob;
    return beyondCut(hideX, hideZ, cut, p.m ? p.m[12] : ob.x, p.m ? p.m[14] : ob.z);
  }

  function effectiveRoom(scene, room, body) {
    if (!room || typeof scene.roomAt !== 'function') return room;
    const cut = room.cut || room;
    if (body[0] >= cut.x0 && body[0] <= cut.x1 && body[1] >= cut.z0 && body[1] <= cut.z1)
      return room;
    const exact = scene.roomAt(body[0], body[1], null, true), box = exact && (exact.cut || exact);
    return box && body[0] >= box.x0 && body[0] <= box.x1 &&
      body[1] >= box.z0 && body[1] <= box.z1 ? exact : room;
  }

  function insideObb(x, y, z, b, pad = PAD) {
    const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0);
    const px = x - b.x, pz = z - b.z;
    return Math.abs(c * px - s * pz) <= b.sx / 2 + pad &&
      Math.abs(y - b.y) <= b.sy / 2 + pad &&
      Math.abs(s * px + c * pz) <= b.sz / 2 + pad;
  }

  // Pure room-limit transition shared by the browser and Node camera drivers. A place change
  // rebases immediately; a walked boundary keeps the existing exponential settle but cannot
  // outrun the commanded camera dolly rate at a coarse frame rate.
  function stepNear(current, target, walked, dt) {
    if (!Number.isFinite(target)) return Number.isFinite(current) ? current : 0;
    if (!Number.isFinite(current) || !walked) return target;
    const delta = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const ease = 1 - Math.pow(.08, delta);
    const step = Math.max(-CAMERA_DOLLY_RATE * delta,
      Math.min(CAMERA_DOLLY_RATE * delta, (target - current) * ease));
    return current + step;
  }

  function rayObb(ox, oy, oz, dx, dy, dz, b, maxDist) {
    const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0);
    const px = ox - b.x, pz = oz - b.z;
    const u = c * px - s * pz, v = s * px + c * pz;
    const du = c * dx - s * dz, dv = s * dx + c * dz;
    let lo = 0, hi = maxDist, a, z;
    if (Math.abs(du) < 1e-9) { if (Math.abs(u) > b.sx / 2) return null; }
    else { a = (-b.sx / 2 - u) / du; z = (b.sx / 2 - u) / du;
      if (a > z) { const t = a; a = z; z = t; } lo = Math.max(lo, a); hi = Math.min(hi, z); }
    if (hi < lo) return null;
    if (Math.abs(dy) < 1e-9) { if (Math.abs(oy - b.y) > b.sy / 2) return null; }
    else { a = (b.y - b.sy / 2 - oy) / dy; z = (b.y + b.sy / 2 - oy) / dy;
      if (a > z) { const t = a; a = z; z = t; } lo = Math.max(lo, a); hi = Math.min(hi, z); }
    if (hi < lo) return null;
    if (Math.abs(dv) < 1e-9) { if (Math.abs(v) > b.sz / 2) return null; }
    else { a = (-b.sz / 2 - v) / dv; z = (b.sz / 2 - v) / dv;
      if (a > z) { const t = a; a = z; z = t; } lo = Math.max(lo, a); hi = Math.min(hi, z); }
    return hi >= lo && lo <= maxDist ? lo : null;
  }

  function addFixture(scene, cache, entry) {
    const p = entry.p;
    // An actionable surface may cut only itself. Group expansion is disabled below for every
    // action-bearing fixture, so the camera stays readable without making adjacent controls blink.
    const groupId=cache.groupIdByProp.get(p);
    let meta = groupId&&cache.groupMeta.get(groupId);
    const local = meta&&!meta.action&&
      localGroup(meta.count,meta.x0,meta.x1,meta.z0,meta.z1,meta.footprint);
    let group = local&&groupId;
    if (meta && !local) {
      cache.metrics.groupFallbacks++; meta = null; group = null;
    }
    if (group) cache.activeGroups.add(group); else cache.activeProps.add(p);
    const added = group ? cache.heldGroups.has(group) ? 0 : meta.count : cache.held.has(p) ? 0 : 1;
    const footprint = added ? group ? meta.footprint : entry.footprint : 0;
    // Under rapid legal input, old hysteresis must yield before a current occluder is dropped.
    // Evict whole explicitly authored fixture groups, preserving visual cohesion.
    if (cache.currentCount + added > MAX_HIDDEN ||
        cache.currentFootprint + footprint > MAX_FOOTPRINT) {
      for (const [old] of cache.heldGroups) {
        if (cache.activeGroups.has(old)) continue;
        cache.heldGroups.delete(old); cache.hiddenGroups.delete(old); cache.metrics.evictions++;
        const q = cache.groupMeta.get(old);
        if (q) { cache.currentCount -= q.count; cache.currentFootprint -= q.footprint; }
        if (cache.currentCount + added <= MAX_HIDDEN &&
            cache.currentFootprint + footprint <= MAX_FOOTPRINT) break;
      }
      for (const [old] of cache.held) {
        if (cache.currentCount + added <= MAX_HIDDEN &&
            cache.currentFootprint + footprint <= MAX_FOOTPRINT) break;
        if (cache.activeProps.has(old)) continue;
        cache.held.delete(old); cache.hidden.delete(old); cache.metrics.evictions++;
        const q = cache.byProp.get(old);
        if (q) { cache.currentCount--; cache.currentFootprint -= q.footprint; }
      }
      if (cache.currentCount + added > MAX_HIDDEN ||
          cache.currentFootprint + footprint > MAX_FOOTPRINT) {
        cache.metrics.capHits++; return false;
      }
    }
    const until = cache.clock + HOLD;
    if (group) { cache.heldGroups.set(group, until); cache.hiddenGroups.add(group); }
    else { cache.held.set(p, until); cache.hidden.add(p); }
    cache.currentCount += added; cache.currentFootprint += footprint;
    return true;
  }

  function snapshotCut(scene, cache) {
    const currentGroups = [], heldGroups = [], currentProps = [], heldProps = [];
    for (const group of cache.hiddenGroups)
      (cache.activeGroups.has(group) ? currentGroups : heldGroups).push(group);
    for (const p of cache.hidden)
      (cache.activeProps.has(p) ? currentProps : heldProps).push(p);
    const describeGroup = group => {
      const q = cache.groupMeta.get(group);
      return { group, tags:q ? q.tags : [], props:q ? q.count : 0,
        footprint:+(q ? q.footprint : 0).toFixed(4),
        action:!!(q && q.action) };
    };
    const describeProp = p => {
      const q = cache.byProp.get(p);
      return { index:q ? q.index : -1, tag:p.tag || null,
        footprint:+(q ? q.footprint : 0).toFixed(4),
        action:!!(p.tag && cache.actionTags.has(p.tag)) };
    };
    return { hiddenProps:cache.currentCount, footprint:+cache.currentFootprint.toFixed(4),
      currentGroups:currentGroups.map(describeGroup), heldGroups:heldGroups.map(describeGroup),
      currentProps:currentProps.map(describeProp), heldProps:heldProps.map(describeProp) };
  }

  function clearTransient(cache) {
    cache.hidden.clear(); cache.hiddenGroups.clear(); cache.held.clear(); cache.heldGroups.clear();
    cache.activeProps.clear(); cache.activeGroups.clear(); cache.clock = 0; cache.roomId = null;
    cache.lastBodyX = cache.lastBodyZ = cache.lastYaw = NaN;
    cache.currentFootprint = 0; cache.currentCount = 0;
  }

  function update(scene, room, body, target, eye, options, requestedYaw) {
    const inputValid = boundedVector(body, 2) && boundedVector(target, 3) &&
      boundedVector(eye, 3);
    if (!inputValid) {
      const rejected = index(scene);
      rejected.metrics.invalidInputs++;
      rejected.query.length = 0; rejected.queryValid = false;
      rejected.metrics.lastCandidates = rejected.metrics.lastExamined =
        rejected.metrics.lastRayTests = rejected.metrics.lastHidden = 0;
      clearTransient(rejected);
      return rejected;
    }
    const opt = options || {}, cache = query(scene, target, eye);
    if (!cache.queryValid) {
      cache.metrics.invalidInputs++;
      cache.metrics.lastRayTests = cache.metrics.lastHidden = 0;
      clearTransient(cache);
      return cache;
    }
    const dt = Number.isFinite(opt.dt) ? Math.max(0, Math.min(.10, opt.dt)) : 1 / 60;
    // Runtime rendering corrects a hysteretic room when the body has already crossed its cut box.
    // Make the camera cut decision from that same exact owner, or the kernel can skip a partition
    // as "already hidden" while the renderer is still drawing it from the adjacent room.
    const cutOwner = effectiveRoom(scene, room, body), roomId = cutOwner && cutOwner.id;
    const fastYaw = Number.isFinite(requestedYaw) && Number.isFinite(cache.lastYaw) &&
      Math.abs(requestedYaw - cache.lastYaw) > .07;
    if (Number.isFinite(cache.lastBodyX) &&
        (Math.hypot(body[0] - cache.lastBodyX, body[1] - cache.lastBodyZ) > .75 ||
         roomId !== cache.roomId || fastYaw)) {
      if (fastYaw && (cache.held.size || cache.heldGroups.size)) cache.metrics.fastReleases++;
      cache.held.clear(); cache.heldGroups.clear();
    }
    cache.lastBodyX = body[0]; cache.lastBodyZ = body[1]; cache.roomId = roomId;
    cache.lastYaw = requestedYaw;
    cache.clock += dt; cache.hidden.clear(); cache.hiddenGroups.clear();
    cache.activeProps.clear(); cache.activeGroups.clear();
    cache.currentFootprint = 0; cache.currentCount = 0;
    for (const [group, until] of cache.heldGroups) {
      if (until + 1e-9 < cache.clock) { cache.heldGroups.delete(group); continue; }
      cache.hiddenGroups.add(group);
      const q = cache.groupMeta.get(group);
      if (q) { cache.currentCount += q.count; cache.currentFootprint += q.footprint; }
    }
    for (const [p, until] of cache.held) {
      if (until + 1e-9 < cache.clock) { cache.held.delete(p); continue; }
      cache.hidden.add(p);
      const q = cache.byProp.get(p);
      if (q) { cache.currentCount++; cache.currentFootprint += q.footprint; }
    }
    const beforeRays = cache.metrics.rayTests;
    const floorY = Number.isFinite(opt.floorY) ? opt.floorY : 0;
    const hx = eye[0], hy = eye[1], hz = eye[2];
    const horizontal = Math.hypot(target[0] - hx, target[2] - hz) || 1;
    const rightX = (target[2] - hz) / horizontal;
    const rightZ = -(target[0] - hx) / horizontal;
    for (const q of cache.query) {
      const p = q.p;
      if (cutawayHidden(scene, cutOwner, eye, p, !!opt.wallsOff)) continue;
      let occludes = insideObb(hx, hy, hz, q.b);
      for (let i = 0; !occludes && i < PROBES.length; i++) {
        const side = PROBES[i][0], ex = body[0] + rightX * side;
        const ey = floorY + PROBES[i][1], ez = body[1] + rightZ * side;
        const dx = ex - hx, dy = ey - hy, dz = ez - hz;
        const length = Math.hypot(dx, dy, dz) || 1;
        cache.metrics.rayTests++;
        const hit = rayObb(hx, hy, hz, dx / length, dy / length, dz / length,
          q.b, Math.max(0, length - .18));
        occludes = hit !== null && hit > .05;
      }
      if (occludes) addFixture(scene, cache, q);
    }
    const rays = cache.metrics.rayTests - beforeRays, m = cache.metrics;
    m.lastRayTests = rays; m.maxRayTests = Math.max(m.maxRayTests, rays);
    let currentGroupCount = 0, heldGroupCount = 0, currentPropCount = 0, heldPropCount = 0;
    for (const group of cache.hiddenGroups)
      if (cache.activeGroups.has(group)) currentGroupCount++; else heldGroupCount++;
    for (const p of cache.hidden)
      if (cache.activeProps.has(p)) currentPropCount++; else heldPropCount++;
    m.lastHidden = cache.currentCount;
    m.lastCurrentGroups = currentGroupCount; m.lastHeldGroups = heldGroupCount;
    m.lastCurrentProps = currentPropCount; m.lastHeldProps = heldPropCount;
    if (cache.currentCount > m.maxHidden) {
      m.maxHidden = cache.currentCount; m.maxCountCut = snapshotCut(scene, cache);
    }
    if (cache.currentFootprint > m.maxFootprint) {
      m.maxFootprint = cache.currentFootprint; m.maxFootprintCut = snapshotCut(scene, cache);
    }
    return cache;
  }

  function resolve(scene, room, body, target, yaw, pitch, distance, options, out) {
    const q = out || {};
    const targetValid = boundedVector(target, 3), bodyValid = boundedVector(body, 2);
    let safeTarget = target, safeBody = body;
    if (!targetValid) {
      safeTarget = q.safeTarget || (q.safeTarget = [0, 0, 0]);
      safeTarget[0] = boundedScalar(target && target[0]) ? target[0]
        : boundedScalar(body && body[0]) ? body[0] : 0;
      safeTarget[1] = boundedScalar(target && target[1]) ? target[1] : 0;
      safeTarget[2] = boundedScalar(target && target[2]) ? target[2]
        : boundedScalar(body && body[1]) ? body[1] : 0;
    }
    if (!bodyValid) {
      safeBody = q.safeBody || (q.safeBody = [0, 0]);
      safeBody[0] = boundedScalar(body && body[0]) ? body[0] : safeTarget[0];
      safeBody[1] = boundedScalar(body && body[1]) ? body[1] : safeTarget[2];
    }
    const safeYaw = Number.isFinite(yaw) ? yaw : 0;
    const safePitch = Number.isFinite(pitch) ? pitch : 0;
    const safeDistance = Number.isFinite(distance) && distance <= MAX_CAMERA_DISTANCE
      ? Math.max(0, distance) : 0;
    const cp = Math.cos(safePitch), sp = Math.sin(safePitch);
    const dir = q.dir || (q.dir = [0, 0, 0]), eye = q.eye || (q.eye = [0, 0, 0]);
    dir[0] = -Math.sin(safeYaw) * cp; dir[1] = sp; dir[2] = -Math.cos(safeYaw) * cp;
    let d = safeDistance;
    if (room && Number.isFinite(room.ceil) && dir[1] > 1e-4)
      d = Math.min(d, Math.max((room.ceil - safeTarget[1]) / dir[1], .85));
    eye[0] = safeTarget[0] + dir[0] * d; eye[1] = safeTarget[1] + dir[1] * d;
    eye[2] = safeTarget[2] + dir[2] * d;
    q.cache = update(scene, room, safeBody, safeTarget, eye, options, safeYaw);
    q.distance = d; q.resolvedYaw = safeYaw; q.room = room; q.target = safeTarget;
    return q;
  }

  function hidden(scene, p) {
    const q = caches.get(scene);
    return !!(q&&(q.hidden.has(p)||q.hiddenGroups.has(q.groupIdByProp.get(p))));
  }
  const hasHidden = scene => {
    const q = caches.get(scene); return !!(q && (q.hidden.size || q.hiddenGroups.size));
  };
  const stats = scene => {
    const q = caches.get(scene), m = q && q.metrics;
    return m ? { version:VERSION, indexed:q.entries.length, groups:q.groupMeta.size,
      groupedProps:q.groupedProps, ...m } :
      { version:VERSION, indexed:0, groups:0, groupedProps:0,
        builds:0, queries:0, examined:0, maxExamined:0,
        maxCandidates:0, rayTests:0, maxRayTests:0, maxHidden:0, maxFootprint:0,
        capHits:0, groupFallbacks:0, evictions:0, fastReleases:0,
        invalidInputs:0, rejectedQueries:0, rejectedGeometry:0,
        invalidOccluderMetadata:0, explicitOccluders:0, forcedOccluders:0,
        aggregateRepresented:0, invalidAggregateMetadata:0, aggregateEpochRejected:0,
        maxEntryCells:0, maxQueryCells:0, lastQueryCells:0,
        maxCountCut:null, maxFootprintCut:null,
        lastCandidates:0, lastExamined:0, lastRayTests:0, lastHidden:0,
        lastCurrentGroups:0, lastHeldGroups:0, lastCurrentProps:0, lastHeldProps:0 };
  };
  const reset = scene => {
    const q = caches.get(scene);
    if (!q) return;
    clearTransient(q);
  };

  return Object.freeze({ VERSION, HOLD, PROBE_COUNT:PROBES.length,
    MAX_GROUP_PROPS, MAX_GROUP_EXTENT, MAX_HIDDEN, MAX_FOOTPRINT, MAX_FOLIAGE_WIND,
    MAX_QUERY_CELLS, MAX_INDEX_CELLS, MAX_VECTOR_COORD, MAX_CAMERA_DISTANCE, CAMERA_DOLLY_RATE,
    index, invalidate, resolve, stepNear,
    update, hidden, hasHidden, stats, reset, effectiveRoom, cutawayHidden, rayObb, insideObb });
})();
