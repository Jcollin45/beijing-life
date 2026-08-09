// Zoo expansion compiler.
//
// This file deliberately contains no second copy of the plan. The browser loads
// ZOO-EXPANSION-BLUEPRINT.json before the game scripts and every placement below is compiled from
// that canonical object. Revision/hash checks make a stale runtime fail loudly instead of quietly
// constructing an older zoo over a newer blueprint.
const ZooExpansion = (() => {
  'use strict';

  const SCHEMA = 'chinesegame.zoo-expansion/v1';
  const REVISION = 2;
  const GEOMETRY_HASH =
    'sha256:d83fda0095d68a322ba6d3e5567edf1293a9052f417ce07517def7eb2e403110';
  const EPS = 1e-6;

  const planOf = plan => plan ||
    (typeof window !== 'undefined' ? window.ZOO_BLUEPRINT : null);

  function validatePlan(input) {
    const plan = planOf(input);
    if (!plan || plan.schema !== SCHEMA || plan.revision !== REVISION ||
        plan.geometryHash !== GEOMETRY_HASH)
      throw new Error('ZooExpansion: canonical blueprint revision/hash mismatch');
    if (!plan.site || !plan.site.bounds || !Array.isArray(plan.paths) ||
        !Array.isArray(plan.habitats) || plan.habitats.length !== 14 ||
        !Array.isArray(plan.buildings) || plan.buildings.length !== 9)
      throw new Error('ZooExpansion: canonical blueprint is structurally incomplete');

    const ids = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (Object.prototype.hasOwnProperty.call(value, 'id')) {
        if (typeof value.id !== 'string' || !value.id)
          throw new Error('ZooExpansion: invalid stable ID');
        if (ids.has(value.id)) throw new Error(`ZooExpansion: duplicate stable ID ${value.id}`);
        ids.add(value.id);
      }
      if (Array.isArray(value)) value.forEach(visit);
      else Object.values(value).forEach(visit);
    };
    visit(plan);
    return plan;
  }

  const center = r => [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2];
  const dims = r => [r[1] - r[0], r[3] - r[2]];
  const fpRect = fp => [fp.x0, fp.x1, fp.z0, fp.z1];
  const clamp01 = n => Math.max(0, Math.min(1, n));
  const BOARD_FACTS = Object.freeze({
    '水獭':['水獭很会游泳','会用石头开贝壳'],
    '河马':['白天常在水里','晚上到岸上吃草'],
    '火烈鸟':['小动物让羽毛变红','常常一只脚站立'],
    '丹顶鹤':['头顶有红色皮肤','会在湿地里找食物'],
    '羚牛':['住在高山森林','冬天有厚厚的毛'],
    '雪豹':['长尾巴帮助平衡','脚掌适合走雪地'],
    '小熊猫':['喜欢竹子和果子','常在树上休息'],
    '天鹅':['长脖子方便找食物','一生常有固定伴侣'],
    '鸳鸯':['雄鸟羽毛颜色鲜艳','喜欢有树的水边'],
    '山羊':['四个胃帮助消化','很会爬石头'],
    '兔子':['长耳朵帮助散热','牙齿会一直生长'],
    '金丝猴':['住在寒冷的山林','一家常在一起活动'],
    '亚洲象':['鼻子能闻也能拿','家族由母象带领'],
    '斑马':['条纹各不相同','常常一起吃草'],
    '羚羊':['跑得快也跳得远','耳朵会听远处声音'],
    '长颈鹿':['长舌头能卷树叶','心脏很有力量'],
    '犀牛':['厚皮也需要泥巴','角由角蛋白组成'],
    '狮子':['母狮一起照顾幼崽','吼声能传得很远'],
  });

  function subtractIntervals(lo, hi, cuts) {
    const ordered = cuts
      .map(q => [Math.max(lo, q[0]), Math.min(hi, q[1])])
      .filter(q => q[1] - q[0] > EPS)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const q of ordered) {
      const last = merged[merged.length - 1];
      if (!last || q[0] > last[1] + EPS) merged.push(q.slice());
      else last[1] = Math.max(last[1], q[1]);
    }
    const out = [];
    let p = lo;
    for (const q of merged) {
      if (q[0] > p + EPS) out.push([p, q[0]]);
      p = Math.max(p, q[1]);
    }
    if (p < hi - EPS) out.push([p, hi]);
    return out;
  }

  // Rectangle subtraction is used for player-only habitat masses. A declared public access zone
  // is the only thing allowed to cut one; service and animal gates cut the perimeter barrier but
  // not this body collider.
  function subtractRect(rect, cut) {
    const [x0, x1, z0, z1] = rect;
    const [a0, a1, b0, b1] = cut;
    const ix0 = Math.max(x0, a0), ix1 = Math.min(x1, a1);
    const iz0 = Math.max(z0, b0), iz1 = Math.min(z1, b1);
    if (ix1 - ix0 <= EPS || iz1 - iz0 <= EPS) return [rect];
    const out = [];
    if (x0 < ix0 - EPS) out.push([x0, ix0, z0, z1]);
    if (ix1 < x1 - EPS) out.push([ix1, x1, z0, z1]);
    if (z0 < iz0 - EPS) out.push([ix0, ix1, z0, iz0]);
    if (iz1 < z1 - EPS) out.push([ix0, ix1, iz1, z1]);
    return out;
  }

  function rectMinusCuts(rect, cuts) {
    let cells = [rect.slice()];
    for (const cut of cuts) cells = cells.flatMap(cell => subtractRect(cell, cut));
    return cells;
  }

  function build(B, input, options = {}) {
    // Convenient scene integration is `build(B, helpers)`, while tests and offline compilers may
    // pass `build(B, plan, helpers)`. Distinguish the two without ever treating helper state as a
    // second source of geometry.
    if (!input || input.schema !== SCHEMA) { options = input || {}; input = null; }
    const plan = validatePlan(input);
    const {
      box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade,
      glow, light, thing, transform, props, blockers, solids, lights,
    } = B;
    const propBaseCount = props.length;
    const blockerBaseCount = blockers.length;
    const solidBaseCount = solids.length;
    const lightBaseCount = lights.length;

    const P = {
      grass: C('#58733e'), grass2: C('#69824b'), forest: C('#415b36'),
      path: C('#a39b8e'), pathD: C('#817a70'), redPath: C('#a86f59'),
      service: C('#777c79'), timber: C('#72563e'), timberD: C('#513d2f'),
      brick: C('#9c503f'), brickD: C('#74392f'), render: C('#ded2bb'),
      tile: C('#355f4b'), tileL: C('#48755e'), steel: C('#58636a'),
      steelD: C('#343d42'), glass: C('#789aa0'), water: C('#365f67'),
      waterL: C('#4d7e82'), sand: C('#b9a06f'), mud: C('#6b583c'),
      earth: C('#8a6545'), rock: C('#77766f'), rockL: C('#99978e'),
      meadow: C('#73864d'), leaf: C('#487139'), leafL: C('#668f4b'),
      pine: C('#315a40'), willow: C('#668c49'), cream: C('#eee1c4'),
      white: C('#edf1eb'), gold: C('#d5ad42'), orange: C('#cb772f'),
      blue: C('#3574a0'), teal: C('#438d84'), purple: C('#765b92'),
      green: C('#3b8452'), yellow: C('#d9b536'), charcoal: C('#30373a'),
      pink: C('#cf6f82'), red: C('#b63e31'), black: C('#202529'),
    };
    const DISTRICT_ACCENT = Object.freeze({
      D0:P.red, D1:P.blue, D2:P.purple, D3:P.green,
      D4:P.teal, D5:P.orange, D6:P.yellow, D7:P.charcoal,
    });
    const MAT = {
      path: { mat: 'paving', matScale: .72, matAmt: .34 },
      timber: { mat: 'wood', matScale: .60, matAmt: .32 },
      brick: { mat: 'brick', matScale: .88, matAmt: .34 },
      concrete: { mat: 'concrete', matScale: 1.45, matAmt: .28 },
      roof: { mat: 'rooftile', matScale: .58, matAmt: .30 },
      steel: { mat: 'steel', matScale: .55, matAmt: .28 },
    };
    const archetypes = new Map(plan.habitatBarrierSystem.archetypes.map(a => [a.id, a]));
    const habitats = new Map(plan.habitats.map(h => [h.id, h]));
    const buildings = new Map(plan.buildings.map(b => [b.id, b]));
    const conservationBridge=buildings.get('B06b-conservation-bridge');
    const conservationBridgeRect=fpRect(conservationBridge.footprint);
    const conservationLifts=Object.freeze([
      Object.freeze([-7.25,-5.85,58.2,60.8]),
      Object.freeze([1.85,3.25,58.2,60.8]),
    ]);
    const nightGlows = [], movers = [], accessibleOverlay = [], accessibleRouteSegments = [];
    const counts = {
      paths: 0, walls: 0, gates: 0, habitats: 0, buildings: 0,
      furniture: 0, planting: 0, things: 0,
    };

    const mark = (p, id) => {
      if (p) p.blueprintId = id;
      return p;
    };
    const localThing = (hz, pos, sentence, tr, note, o = {}, id) => {
      const th = thing(hz, pos[0], pos[1], pos[2], sentence, tr, note, o);
      th.blueprintId = id;
      counts.things++;
      return th;
    };

    const groundColor = kind => {
      if (/water|pool|marsh/.test(kind)) return P.water;
      if (/sand|scree|mud|island/.test(kind)) return /mud/.test(kind) ? P.mud : P.sand;
      if (/forest/.test(kind)) return P.forest;
      if (/rock/.test(kind)) return P.rock;
      if (/meadow|grass/.test(kind)) return P.meadow;
      return P.earth;
    };
    const groundMode = kind => /water|pool/.test(kind) ? 16 :
      /sand|mud|scree|island/.test(kind) ? 10 : 17;

    function rectFlat(rect, y, color, opt = {}, id) {
      const [x, z] = center(rect), [w, d] = dims(rect);
      return mark(flat(x, y, z, w, d, color, opt), id);
    }

    function pathSegment(a, b, width, color, opt, id) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (len <= EPS) return null;
      const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
      let p;
      const y = opt.y === undefined ? .010 : opt.y;
      if (Math.abs(dx) <= EPS)
        p = flat(x, y, z, width, len, color, opt);
      else if (Math.abs(dz) <= EPS)
        p = flat(x, y, z, len, width, color, opt);
      else
        p = flat(x, y, z, len, width, color,
          { ...opt, ry: -Math.atan2(dz, dx) });
      return mark(p, id);
    }

    function tactileGuide(owner, points) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        pathSegment(a, b, .14, P.gold, { mode:9, gloss:.13, ...MAT.path, y:.031 },
          `${owner}/TACTILE${String(i).padStart(2, '0')}`);
        const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
        const n = Math.max(1, Math.floor(len / .42));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          cyl(a[0] + dx * u, .040, a[1] + dz * u, .025, .018, P.gold,
            { mode:1, gloss:.16 });
        }
      }
    }

    function tree(x, z, h, id, kind = 'broadleaf') {
      const trunk = mark(cyl(x, h * .27, z, .13 + h * .012, h * .54, P.timberD,
        { gloss: .16, ...MAT.timber }), id);
      const crownStart = props.length;
      const crown = kind === 'pine' ? P.pine : kind === 'willow' ? P.willow : P.leaf;
      if (kind === 'pine') {
        for (let i = 0; i < 3; i++)
          taper(x, h * (.54 + i * .13), z, h * (.42 - i * .07), h * .32,
            h * (.42 - i * .07), crown, { mode: 15, gloss: .06 });
      } else {
        ball(x, h * .67, z, h * .27, h * .25, h * .26, crown,
          { mode: 15, gloss: .06 });
        ball(x - h * .16, h * .61, z + h * .07, h * .20, h * .20, h * .20,
          crown, { mode: 15, gloss: .06 });
        ball(x + h * .16, h * .64, z - h * .05, h * .21, h * .21, h * .20,
          P.leafL, { mode: 15, gloss: .06 });
        if (kind === 'willow') for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          capsule(x + Math.cos(a) * h * .20, h * .40, z + Math.sin(a) * h * .20,
            .025, h * .62, .025, P.willow, { rz: Math.sin(a) * .18, mode: 15 });
        }
      }
      for (const p of props.slice(crownStart)) p.zooLodMax = 34;
      const proxy = kind === 'pine' ?
        taper(x,h*.75,z,h*.46,h*.72,h*.46,P.pine,{mode:15,gloss:.06}) :
        ball(x,h*.72,z,h*.36,h*.30,h*.36,crown,{mode:15,gloss:.06});
      proxy.zooLodMin = 34;
      // The planting contract gives every scheduled trunk the same measured 0.56 m body. Crowns
      // remain visual only, so paths under a canopy stay usable while nobody walks through bark.
      solid(x - .28, x + .28, z - .28, z + .28);
      counts.planting++;
      return trunk;
    }

    function rockCluster(x, z, scale, id, height = 1.1) {
      let first = null;
      const offsets = [[0,0,1],[-.46,.18,.66],[.42,.12,.72],[-.15,-.38,.58],[.34,-.32,.48]];
      offsets.forEach(([ox, oz, s], i) => {
        const p = ball(x + ox * scale, height * s * .45, z + oz * scale,
          scale * s * .52, height * s * .45, scale * s * .46,
          i % 2 ? P.rockL : P.rock, { gloss: .06, mode: 10 });
        if (!first) first = mark(p, id);
      });
      return first;
    }

    // One exact, low ground sheet expands the grade without covering the preserved core paving.
    const sb = plan.site.bounds;
    mark(flat((sb.x0 + sb.x1) / 2, -.003, (sb.z0 + sb.z1) / 2,
      sb.x1 - sb.x0, sb.z1 - sb.z0, P.grass, { mode: 17, gloss: .07 }), 'SITE-GROUND');

    // District undertones are subtle but make the plan's ecological zoning legible from the
    // elevated camera. D0 is intentionally untouched so the heritage core remains exact.
    for (const d of plan.districts.filter(d => d.id !== 'D0')) {
      const r = fpRect(d.bounds);
      const col = d.id === 'D1' ? C('#526f47') : d.id === 'D2' ? C('#676b50') :
        d.id === 'D3' ? C('#4e7044') : d.id === 'D4' ? C('#577b58') :
        d.id === 'D5' ? C('#806f46') : d.id === 'D6' ? C('#486b47') : C('#5b6259');
      rectFlat(r, -.002, col, { mode: 17, gloss: .06 }, `${d.id}/GROUND`);
    }

    // Public and staff circulation, including every exact keeper spur.
    for (const p of plan.paths) {
      const publicPath = p.access === 'public';
      const color = p.surface === 'timber-boardwalk' ? P.timber :
        p.surface === 'red-paving' ? P.redPath : publicPath ?
          (p.surface === 'paving-dark' ? P.pathD : P.path) : P.service;
      const opt = p.surface === 'timber-boardwalk' ? { mode: 6, gloss: .14, ...MAT.timber } :
        { mode: publicPath ? 9 : 10, gloss: .10, ...MAT.path };
      for (let i = 1; i < p.centerline.length; i++) {
        pathSegment(p.centerline[i - 1], p.centerline[i], p.width, color, opt,
          i === 1 ? p.id : `${p.id}/G${String(i).padStart(2, '0')}`);
        if (publicPath && p.accessible) {
          const q = pathSegment(p.centerline[i - 1], p.centerline[i], .18, P.blue,
            { mode:1, alpha:0, alphaGroup:'zoo-accessible-route', glow:0,
              gloss:.18, y:.026 }, null);
          if (q) {
            q.blueprintId = undefined; q.accessibleOwner=p.id; accessibleOverlay.push(q);
            accessibleRouteSegments.push({a:p.centerline[i-1].slice(),b:p.centerline[i].slice(),
              owner:p.id});
          }
        }
      }
      counts.paths++;
    }
    // Complete R-ACCESSIBLE-ALL across the preserved core and every public building threshold.
    // Expansion paths above supply their own line; these derived segments fill the deliberately
    // preserved D0 rectangles and the short final approaches not represented as plan.path rows.
    const accessibleLine = (a,b,id) => {
      const p=pathSegment(a,b,.18,P.blue,{mode:1,alpha:0,
        alphaGroup:'zoo-accessible-route',glow:0,gloss:.18,y:.034},null);
      if(p){
        p.accessibleOwner=id;accessibleOverlay.push(p);
        accessibleRouteSegments.push({a:a.slice(),b:b.slice(),owner:id});
      }
      return p;
    };
    for(const q of plan.preservation.existingCorePaths) {
      const r=q.rect,w=r.x1-r.x0,d=r.z1-r.z0;
      if(w>=d) accessibleLine([r.x0,(r.z0+r.z1)/2],[r.x1,(r.z0+r.z1)/2],q.id);
      else accessibleLine([(r.x0+r.x1)/2,r.z0],[(r.x0+r.x1)/2,r.z1],q.id);
    }
    for(const b of plan.buildings.filter(q=>Array.isArray(q.entranceApron))) {
      const r=b.entranceApron,door=b.publicDoors[0],f=b.footprint;
      // Follow the public door normal; the long apron axis ends in its flanking wall solids.
      if(Math.abs(door.at[1]-f.z0)<EPS||Math.abs(door.at[1]-f.z1)<EPS)
        accessibleLine([door.at[0],r[2]],[door.at[0],r[3]],b.id);
      else accessibleLine([r[0],door.at[1]],[r[1],door.at[1]],b.id);
    }
    accessibleLine([-3.75,19],[-3.75,29],'B04-lake-pavilion');
    accessibleLine([-3.75,29],[-10.5,29],'B04-lake-pavilion');
    accessibleLine([-11.5,53.5],[-11.5,55.5],'B05-conservation-west');
    accessibleLine([9,53.5],[9,55.5],'B06-conservation-east');
    accessibleLine(plan.site.mainSpawn.at,[-12,-13.2],'G01-main-south');
    // Surface rectangles overlap at these junctions, while their abstract centre lines stop at
    // opposite edges. Bridge those small gaps so the displayed blue route is one graph too.
    for(const [a,b,id] of [
      [[-12,-13.2],[-12,-12.8],'P00-P01'],
      [[-14.55,-12.8],[-14.55,-9.7],'P00-P09'],
      [[-9.45,-12.8],[-9.45,-9.7],'P00-P10'],
      [[-2,5.5],[-2,6.6],'P06-P104'],
      [[-36.5,18],[-36.5,40],'P106-P112-P107'],
      [[39,18],[39,40],'P106-P114-P107'],
      [[-31.2,18],[-31.2,20.35],'B02-connector'],
      [[46,18],[46,20.35],'B03-connector'],
      [[-3.75,19.5],[-2,19.5],'B04-connector'],
    ]) accessibleLine(a,b,`R-ACCESSIBLE-ALL/${id}`);
    const focusSegments = id => {
      const p=plan.paths.find(q=>q.id===id);
      if(p)return p.centerline.slice(1).map((b,i)=>[p.centerline[i],b]);
      const q=plan.preservation.existingCorePaths.find(q=>q.id===id);
      if(!q)return [];
      const r=q.rect,w=r.x1-r.x0,d=r.z1-r.z0;
      return w>=d?[[[r.x0,(r.z0+r.z1)/2],[r.x1,(r.z0+r.z1)/2]]]:
        [[[(r.x0+r.x1)/2,r.z0],[(r.x0+r.x1)/2,r.z1]]];
    };
    for(const h of plan.habitats) {
      let best=null,bd=Infinity;
      for(const [a,b] of focusSegments(h.viewingPath)) {
        const dx=b[0]-a[0],dz=b[1]-a[1],dd=dx*dx+dz*dz;
        const u=dd?clamp01(((h.focus[0]-a[0])*dx+(h.focus[1]-a[1])*dz)/dd):0;
        const q=[a[0]+dx*u,a[1]+dz*u],d=(q[0]-h.focus[0])**2+(q[1]-h.focus[1])**2;
        if(d<bd){bd=d;best=q;}
      }
      if(best&&bd>EPS)accessibleLine(best,h.focus,`${h.id}/FOCUS`);
    }
    const connectPointToRoute = (at,id) => {
      let best=null,bd=Infinity;
      // Snapshot the route before adding this spur. This keeps each destination tied to the
      // canonical network rather than accidentally chaining a row of nearby destinations.
      for(const s of accessibleRouteSegments.slice()) {
        const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],dd=dx*dx+dz*dz;
        const u=dd?clamp01(((at[0]-s.a[0])*dx+(at[1]-s.a[1])*dz)/dd):0;
        const q=[s.a[0]+dx*u,s.a[1]+dz*u],d=(q[0]-at[0])**2+(q[1]-at[1])**2;
        if(d<bd){bd=d;best=q;}
      }
      if(best&&bd>EPS)accessibleLine(best,at,id);
    };
    for(const h of plan.preservation.existingHabitatBounds)
      connectPointToRoute(h.focus,`${h.id}/FOCUS`);
    for(const b of plan.buildings)
      for(const door of b.publicDoors||[])
        connectPointToRoute(door.at,`${b.id}/PUBLIC-DOOR/${door.at.join(',')}`);
    // Raised tactile lines join both public gates to their maps, then bind all three avenues to
    // the conservation doors and Tropical House. They sit only 2 cm above the paving and carry
    // no body solid, matching the blueprint's level, step-free public-path contract.
    tactileGuide('G01-main-south', [[-12,-15.5],[-12,-10],[-15.2,-10],[-15.2,-9]]);
    tactileGuide('G02-west-secondary', [[-57.4,24],[-54.5,24],[-54.5,23.2]]);
    tactileGuide('P118-conservation-front', [[-19,53.5],[19,53.5]]);
    tactileGuide('B05-conservation-west', [[-11.5,53.5],[-11.5,55]]);
    tactileGuide('B06-conservation-east', [[9,53.5],[9,55]]);
    tactileGuide('P116-tropical-forecourt', [[19,52],[25,52]]);
    for (const p of plan.routes.keeperAccessSpurs) {
      for (let i = 1; i < p.centerline.length; i++)
        pathSegment(p.centerline[i - 1], p.centerline[i], p.width, P.service,
          { mode: 10, gloss: .08, ...MAT.path },
          i === 1 ? p.id : `${p.id}/G${String(i).padStart(2, '0')}`);
    }
    for (const c of plan.controlledCrossings) {
      const [x, z] = c.at;
      mark(flat(x, .019, z, c.width, c.width, P.redPath,
        { mode: 9, gloss: .12, ...MAT.path }), c.id);
      // The stop line and removable bollards make the public-priority state visible.
      flat(x - c.width * .34, .024, z, .10, c.width * .76, P.white, { gloss: .12 });
      for (const dz of [-1.45, 1.45])
        cyl(x + 1.55, .42, z + dz, .065, .84, P.charcoal, { gloss: .40, ...MAT.steel });
    }

    function buildRun(run, style = 'outer') {
      const t = run.thickness || .18, h = run.height || 2.4;
      let p, rect;
      if (run.axis === 'x') {
        const x = (run.range[0] + run.range[1]) / 2, len = run.range[1] - run.range[0];
        p = box(x, (run.y0 || 0) + h / 2, run.at, len, h, t,
          style === 'outer' ? P.brick : P.steelD,
          { hard: true, gloss: .08, ...(style === 'outer' ? MAT.brick : MAT.steel) });
        rect = [run.range[0], run.range[1], run.at - t / 2, run.at + t / 2];
        if (style === 'outer')
          box(x, (run.y0 || 0) + h + .12, run.at, len + .08, .24, t + .28, P.tile,
            { hard: true, gloss: .16, ...MAT.roof });
      } else {
        const z = (run.range[0] + run.range[1]) / 2, len = run.range[1] - run.range[0];
        p = box(run.at, (run.y0 || 0) + h / 2, z, t, h, len,
          style === 'outer' ? P.brick : P.steelD,
          { hard: true, gloss: .08, ...(style === 'outer' ? MAT.brick : MAT.steel) });
        rect = [run.at - t / 2, run.at + t / 2, run.range[0], run.range[1]];
        if (style === 'outer')
          box(run.at, (run.y0 || 0) + h + .12, z, t + .28, .24, len + .08, P.tile,
            { hard: true, gloss: .16, ...MAT.roof });
      }
      mark(p, run.id);
      if (run.bodySolid !== false) solid(...rect);
      if ((run.cameraBlockerTop || 0) > 0) blocker(...rect, run.cameraBlockerTop);
      counts.walls++;
    }

    plan.outerWalls.forEach(w => buildRun(w, 'outer'));

    // Closed staff gates occupy only the declared opening; public gates remain genuinely clear.
    for (const gate of plan.gates) {
      if (gate.state === 'open') continue;
      const o = gate.opening, t = .20;
      let rect;
      if (o.x !== undefined) {
        const z = (o.z0 + o.z1) / 2, d = o.z1 - o.z0;
        mark(box(o.x, 1.1, z, t, 2.2, d, P.steelD,
          { hard: true, gloss: .52, ...MAT.steel }), gate.id);
        for (let q = o.z0 + .35; q < o.z1; q += .48)
          cyl(o.x - .03, 1.15, q, .035, 2.3, P.steel, { gloss: .58 });
        rect = [o.x - t / 2, o.x + t / 2, o.z0, o.z1];
      } else {
        const x = (o.x0 + o.x1) / 2, w = o.x1 - o.x0;
        mark(box(x, 1.1, o.z, w, 2.2, t, P.steelD,
          { hard: true, gloss: .52, ...MAT.steel }), gate.id);
        for (let q = o.x0 + .35; q < o.x1; q += .48)
          cyl(q, 1.15, o.z - .03, .035, 2.3, P.steel, { gloss: .58 });
        rect = [o.x0, o.x1, o.z - t / 2, o.z + t / 2];
      }
      solid(...rect); blocker(...rect, 2.4); counts.gates++;
    }

    function gateCuts(h, side) {
      const gates = [h.serviceGate, ...(h.publicGates || []), ...(h.animalGates || [])]
        .filter(Boolean).filter(g => g.side === side);
      return gates.map(g => {
        const v = side[0] === 'x' ? g.center[1] : g.center[0];
        return [v - g.width / 2, v + g.width / 2];
      });
    }

    function barrierSegment(h, side, range, archetype, id, segmentIndex) {
      const b = h.bounds, pub = h.publicSide === side;
      const height = pub ? archetype.publicHeight : archetype.backHeight;
      const t = archetype.thickness;
      const isGlass = /GLASS|HIPPO|BIGCAT/.test(archetype.id);
      const isTimber = archetype.id === 'BA-FAMILY-TIMBER';
      const isRail = /RAIL|LAKE|MOAT|RHINO/.test(archetype.id);
      const matCol = isTimber ? P.timber : isGlass ? P.rock :
        isRail ? P.rock : P.steelD;
      let x, z, w, d, rect;
      if (side[0] === 'x') {
        x = b[side]; z = (range[0] + range[1]) / 2;
        w = t; d = range[1] - range[0];
        rect = [x - t / 2, x + t / 2, range[0], range[1]];
      } else {
        x = (range[0] + range[1]) / 2; z = b[side];
        w = range[1] - range[0]; d = t;
        rect = [range[0], range[1], z - t / 2, z + t / 2];
      }
      let first;
      if (isGlass && pub) {
        first = box(x, .18, z, w, .36, d, P.rock,
          { hard: true, gloss: .08, ...MAT.concrete });
        box(x, .36 + (height - .36) / 2, z, w * (side[0] === 'x' ? .42 : 1),
          height - .36, d * (side[0] === 'z' ? .42 : 1), P.glass,
          { hard: true, mode: 1, alpha: .30, gloss: .88 });
      } else if (isTimber) {
        first = box(x, .34, z, w, .16, d, P.timber,
          { hard: true, gloss: .16, ...MAT.timber });
        box(x, .92, z, w, .14, d, P.timber,
          { hard: true, gloss: .16, ...MAT.timber });
      } else if (isRail && pub) {
        first = box(x, .23, z, w + (side[0] === 'z' ? 0 : .22), .46,
          d + (side[0] === 'x' ? 0 : .22), P.rock,
          { hard: true, gloss: .08, ...MAT.concrete });
        for (const y of [.62, Math.max(.82, height)])
          box(x, y, z, side[0] === 'z' ? w : .045, .045,
            side[0] === 'x' ? d : .045, P.steelD,
            { hard: true, gloss: .54, ...MAT.steel });
      } else {
        first = box(x, height / 2, z, w, height, d, matCol,
          { hard: true, gloss: isTimber ? .16 : .30,
            ...(isTimber ? MAT.timber : MAT.steel) });
        // Cable/mesh rhythm: enough verticals to read as a containment surface without turning
        // every distant enclosure into hundreds of loose alpha props.
        const len = range[1] - range[0], n = Math.max(2, Math.ceil(len / 1.8));
        for (let i = 0; i <= n; i++) {
          const v = range[0] + len * i / n;
          if (side[0] === 'x') cyl(x, height / 2, v, .025, height, P.steel, { gloss: .46 });
          else cyl(v, height / 2, z, .025, height, P.steel, { gloss: .46 });
        }
      }
      if (pub) {
        // District identity is redundant by design: this slim coloured top rail repeats the map
        // and sign colour, while the nearby board supplies the written species name.
        const accent=DISTRICT_ACCENT[h.district]||P.gold, ay=Math.min(height+.07,1.36);
        box(x,ay,z,side[0]==='z'?w:.065,.055,side[0]==='x'?d:.065,accent,
          {hard:true,gloss:.28});
      }
      mark(first, segmentIndex ? `${id}/G${String(segmentIndex).padStart(2, '0')}` : id);
      // Ordinary habitats already own an exact player-only rectangle below. Adding every
      // perimeter run to the same collider list would duplicate collision and exceed the scene's
      // solid budget. H31 is the deliberate exception: only its water is player-solid, so its
      // non-gate perimeter still needs these thin threshold solids.
      if (h.id === 'H31-waterfowl-lake') solid(...rect);
      if ((archetype.cameraBlockerTop || 0) > 0)
        blocker(...rect, archetype.cameraBlockerTop);
    }

    function closedHabitatGate(h, gate, id) {
      const b = h.bounds, t = .10;
      let rect, p;
      if (gate.side[0] === 'x') {
        const x = b[gate.side], z = gate.center[1];
        // The panel is drawn open against the inside wall so the authored opening remains visible;
        // the exact threshold collider below keeps it staff/animal-only for the player.
        p = box(x + (gate.side === 'x0' ? .34 : -.34), .9, z - gate.width / 2 + .08,
          .08, 1.8, gate.width - .16, P.steelD,
          { hard: true, gloss: .48, ...MAT.steel });
        rect = [x - t / 2, x + t / 2, z - gate.width / 2, z + gate.width / 2];
      } else {
        const x = gate.center[0], z = b[gate.side];
        p = box(x - gate.width / 2 + .08, .9, z + (gate.side === 'z0' ? .34 : -.34),
          gate.width - .16, 1.8, .08, P.steelD,
          { hard: true, gloss: .48, ...MAT.steel });
        rect = [x - gate.width / 2, x + gate.width / 2, z - t / 2, z + t / 2];
      }
      mark(p, id);
      if (h.id === 'H31-waterfowl-lake') solid(...rect);
    }

    function buildHabitatObject(h, o, i) {
      const id = `${h.id}/O${String(i + 1).padStart(2, '0')}`;
      const propStart = props.length;
      const at = o.at || (o.rect ? center(o.rect) : null);
      let first = null;
      const rect = o.rect;
      switch (o.type) {
        case 'rock-cluster': case 'rock-slope': case 'rock-shelf': case 'kopje':
        case 'shade-rock':
          first = rockCluster(at[0], at[1], o.scale || (rect ? Math.min(...dims(rect)) * .34 : 1.2),
            id, o.height || 1.3);
          break;
        case 'log': case 'deadfall-log': case 'scrub-log': {
          const p = capsule(at[0], .24, at[1], .20, o.type === 'scrub-log' ? 2.0 : 3.0,
            .20, P.timber, { rz: Math.PI / 2, ry: o.yaw || 0, gloss: .16, ...MAT.timber });
          first = mark(p, id); break;
        }
        case 'den': case 'rabbit-shelter': case 'heated-shelter': {
          const [x, z] = center(rect), [w, d] = dims(rect);
          first = mark(box(x, .62, z, w, 1.24, d, P.rock,
            { hard: true, gloss: .06, ...MAT.concrete }), id);
          box(x + w * .26, .44, z + (h.publicSide === 'z0' ? -d / 2 - .01 : 0),
            Math.min(1.0, w * .34), .88, .10, P.black, { hard: true });
          break;
        }
        case 'keeper-landing':
          first = rectFlat(rect, .016, P.service, { mode: 10, gloss: .10, ...MAT.path }, id);
          break;
        case 'shade-shelter': {
          const [x, z] = center(rect), [w, d] = dims(rect), ht = o.height || 3.2;
          first = mark(box(x, ht, z, w, .18, d, P.timberD,
            { hard: true, gloss: .14, ...MAT.timber }), id);
          for (const xx of [rect[0] + .22, rect[1] - .22])
            for (const zz of [rect[2] + .22, rect[3] - .22])
              cyl(xx, ht / 2, zz, .10, ht, P.steelD, { gloss: .42, ...MAT.steel });
          break;
        }
        case 'feed-trough': case 'water-trough': case 'feeder': case 'feed-pan': {
          first = mark(box(at[0], .22, at[1], o.type === 'feed-pan' ? .85 : 1.35,
            .34, o.type === 'feed-pan' ? .85 : .55,
            o.type === 'water-trough' ? P.waterL : P.steel,
            { hard: true, gloss: .34, ...MAT.steel }), id);
          break;
        }
        case 'scrub-post':
          first = mark(cyl(at[0], .75, at[1], .16, 1.5, P.timberD,
            { gloss: .16, ...MAT.timber }), id);
          break;
        case 'nest-island': {
          const r = o.radius || 1;
          first = mark(cyl(at[0], .10, at[1], r, .20, P.earth, { mode: 10, gloss: .04 }), id);
          for (let q = 0; q < 10; q++) {
            const a = q / 10 * Math.PI * 2;
            capsule(at[0] + Math.cos(a) * r * .72, .24, at[1] + Math.sin(a) * r * .72,
              .018, .42, .018, P.sand, { rz: Math.sin(a) * .7 });
          }
          break;
        }
        case 'reed-bed': {
          const n = Math.min(28, o.count || 16);
          for (let q = 0; q < n; q++) {
            const a = q * 2.399, r = .18 + .055 * q;
            const p = capsule(at[0] + Math.cos(a) * r, .45 + (q % 4) * .05,
              at[1] + Math.sin(a) * r, .018, .9 + (q % 4) * .1, .018,
              q % 2 ? P.willow : P.leaf, { rz: Math.sin(a) * .10, mode: 15 });
            if (!first) first = mark(p, id);
          }
          break;
        }
        case 'nest-platform':
          first = mark(cyl(at[0], .30, at[1], .72, .20, P.timber,
            { gloss: .12, ...MAT.timber }), id);
          break;
        case 'shallow-pool': case 'mud-wallow':
          first = rectFlat(rect, .018, o.type === 'shallow-pool' ? P.waterL : P.mud,
            { mode: o.type === 'shallow-pool' ? 16 : 10, gloss: .28 }, id);
          break;
        case 'pine':
          first = tree(at[0], at[1], o.height || 5.2, id, 'pine');
          break;
        case 'hay-rack': case 'browse-rack': {
          const ht = o.height || 1.7;
          first = mark(box(at[0], ht * .52, at[1], 1.6, .12, .12, P.timber,
            { ry: .35, hard: true, gloss: .16, ...MAT.timber }), id);
          for (const s of [-1, 1])
            capsule(at[0] + s * .58, ht / 2, at[1], .065, ht, .065, P.timberD,
              { rz: s * .18, gloss: .14, ...MAT.timber });
          break;
        }
        case 'tree-climb': case 'climbing-tower': {
          const ht = o.height || 4;
          first = mark(cyl(at[0], ht / 2, at[1], .20, ht, P.timberD,
            { gloss: .14, ...MAT.timber }), id);
          for (let q = 0; q < 3; q++)
            capsule(at[0], 1.2 + q * 1.15, at[1], .10, 3.2 - q * .35, .10, P.timber,
              { rz: Math.PI / 2, ry: q * 1.1, gloss: .14, ...MAT.timber });
          break;
        }
        case 'rope-bridge': {
          const a = o.from, b = o.to, dx = b[0] - a[0], dz = b[1] - a[1];
          first = mark(capsule((a[0] + b[0]) / 2, o.height, (a[1] + b[1]) / 2,
            .065, Math.hypot(dx, dz), .065, P.timber,
            { rz: Math.PI / 2, ry: -Math.atan2(dz, dx), gloss: .12 }), id);
          break;
        }
        case 'nest-box':
          first = mark(box(at[0], o.height || 2.4, at[1], .70, .72, .65, P.timber,
            { hard: true, gloss: .14, ...MAT.timber }), id);
          cyl(at[0], o.height || 2.4, at[1] - .34, .11, .03, P.black,
            { rx: Math.PI / 2, hard: true });
          break;
        case 'tea-pavilion':
          // B04 owns this record's geometry; retain the stable child ID on its map entry below.
          break;
        case 'footbridge': {
          const [x, z] = center(rect), [w, d] = dims(rect);
          first = mark(box(x, .50, z, w, .16, d, P.timber,
            { hard: true, gloss: .14, ...MAT.timber }), id);
          for (const zz of [rect[2] + .10, rect[3] - .10]) {
            box(x, .86, zz, w, .08, .08, P.timberD, { hard: true, ...MAT.timber });
            for (let xx = rect[0] + .2; xx <= rect[1] - .1; xx += .65)
              cyl(xx, .68, zz, .035, .72, P.timberD, { gloss: .14 });
          }
          break;
        }
        case 'barn': {
          const [x, z] = center(rect), [w, d] = dims(rect), ht = o.height || 3.5;
          first = mark(box(x, ht / 2, z, w, ht, d, P.brickD,
            { hard: true, gloss: .10, ...MAT.brick }), id);
          taper(x, ht + .62, z, w + .35, 1.25, d + .35, P.tile,
            { hard: true, rz: Math.PI / 4, gloss: .15, ...MAT.roof });
          break;
        }
        case 'handwash':
          first = mark(cyl(at[0], .62, at[1], .25, 1.24, P.steel,
            { gloss: .56, ...MAT.steel }), id);
          box(at[0], 1.18, at[1] - .16, .12, .12, .42, P.steelD,
            { hard: true, gloss: .56 });
          break;
        case 'hay-bale':
          first = mark(cyl(at[0], .46, at[1], .48, .92, P.sand,
            { rz: Math.PI / 2, gloss: .05, mode: 10 }), id);
          break;
        case 'rope-network': {
          const [x, z] = center(rect), [w, d] = dims(rect), ht = o.height || 3.2;
          first = mark(capsule(x, ht, z, .045, w, .045, P.timber,
            { rz: Math.PI / 2, gloss: .12 }), id);
          for (let q = 0; q < 5; q++) {
            const zz = rect[2] + d * (q + .5) / 5;
            capsule(x, ht - (q % 2) * .28, zz, .035, w, .035, P.timber,
              { rz: Math.PI / 2, gloss: .12 });
          }
          break;
        }
        case 'acacia':
          first = tree(at[0], at[1], o.height || 5.5, id, 'broadleaf');
          break;
        default:
          if (at) first = mark(box(at[0], .35, at[1], .72, .70, .72, P.rock,
            { hard: true, gloss: .08, ...MAT.concrete }), id);
      }
      // Keep the first, broad structural shape as the long-distance silhouette. Fine habitat
      // clutter retires beyond 26 m, as required by the graphics contract.
      if (o.type !== 'pine' && o.type !== 'acacia')
        props.slice(propStart + 1).forEach(p => { p.zooLodMax = 26; });
      return first;
    }

    function buildHabitat(h) {
      const b = h.bounds, rect = [b.x0, b.x1, b.z0, b.z1];
      h.ground.forEach((g, i) => {
        const id = `${h.id}/G${String(i + 1).padStart(2, '0')}`;
        if (g.rect) rectFlat(g.rect, .006 + i * .002, groundColor(g.kind),
          { mode: groundMode(g.kind), gloss: /water|pool/.test(g.kind) ? .30 : .07 }, id);
        else if (g.centres) g.centres.forEach((q, j) =>
          mark(cyl(q[0], .026, q[1], .72 + j * .12, .052, P.mud,
            { mode: 10, gloss: .12 }), j ? `${id}/G${String(j + 1).padStart(2, '0')}` : id));
      });

      const archetype = archetypes.get(h.barrier.archetypeId);
      for (const side of ['x0', 'x1', 'z0', 'z1']) {
        const range = side[0] === 'x' ? [b.z0, b.z1] : [b.x0, b.x1];
        const sideId = `HW-${h.id}-${side}`;
        const runs = subtractIntervals(range[0], range[1], gateCuts(h, side));
        runs.forEach((r, i) => barrierSegment(h, side, r, archetype, sideId,
          runs.length === 1 ? 0 : i + 1));
      }

      // The special waterfowl plan already supplies its exact water-only body rectangles. Every
      // other habitat follows the canonical rectangle-minus-public-access contract.
      if (h.waterSolids) h.waterSolids.forEach(r => solid(...r));
      else {
        const cuts = (h.publicAccessZones || []).map(z => z.rect);
        rectMinusCuts(rect, cuts).forEach(r => solid(...r));
      }
      if (h.serviceGate) closedHabitatGate(h, h.serviceGate, `HG-${h.id}-service`);
      (h.animalGates || []).forEach((g, i) => closedHabitatGate(h, g,
        g.id || `HG-${h.id}-animal-${String(i + 1).padStart(2, '0')}`));
      h.objects.forEach((o, i) => buildHabitatObject(h, o, i));
      counts.habitats++;
    }

    plan.habitats.forEach(buildHabitat);

    // Four interlocked transfer gates make the elephant link operationally legible. The source
    // gate at x=16 belongs to the preserved yard; the other animal gate is closed, while the two
    // public-path gates are visibly folded back because the plan's released state keeps P03 open.
    for (const crossing of plan.animalTransferCrossings) {
      const c = crossing.corridor;
      rectFlat([c.x0, c.x1, c.z0, c.z1], .014, P.earth,
        { mode: 10, gloss: .08 }, crossing.id);
      crossing.interlockedGates.forEach((g, i) => {
        const closed = i === 0 || i === crossing.interlockedGates.length - 1;
        const x = g.at[0], z = g.at[1], d = g.width;
        const p = box(x + (closed ? 0 : .42), .72, z + (closed ? 0 : d / 2 - .06),
          .10, 1.44, closed ? d : .10, P.steelD,
          { hard: true, gloss: .52, ...MAT.steel });
        mark(p, g.id);
        if (closed && i > 0) solid(x - .05, x + .05, z - d / 2, z + d / 2);
      });
    }

    function interpretationBoard(rec) {
      const propStart = props.length;
      const [x, y, z] = rec.position;
      const dx = rec.focus[0] - x, dz = rec.focus[1] - z;
      const yaw = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) :
        (dz > 0 ? 0 : Math.PI);
      const habitat = habitats.get(rec.habitat);
      const accent = DISTRICT_ACCENT[habitat.district] || P.green;
      const facts = BOARD_FACTS[rec.hz] || [`${rec.hz}需要安静环境`, `请在参观时保持距离`];
      const p = mark(box(x, y, z, 1.82, 1.28, .12, P.charcoal,
        { tag: rec.hz, hard: true, gloss: .10, ry: yaw }), rec.id);
      box(x, y + .58, z, 1.92, .11, .16, accent,
        { tag: rec.hz, hard: true, gloss: .18, ry: yaw });
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const point = (u, v, d = .072) => [x + c * u + s * d, y + v, z - s * u + c * d];
      const write = (u, v, text, size, color = P.cream, gap = size * .12) => {
        const q = point(u, v, .073);
        glyphs(q[0], q[1], q[2], yaw, text,
          { size, gap, color, mode:1, tag:rec.hz, glyphRole:size >= .14 ? 'primary' : 'micro' });
      };
      // A durable relief portrait occupies the left medallion. Broad species-family silhouettes
      // remain recognisable at the camera's normal distance and require no downloaded texture.
      const orb = (u, v, rx, ry, color, d = .085) => {
        const q = point(u, v, d);
        ball(q[0], q[1], q[2], rx, ry, .028, color,
          { tag:rec.hz, gloss:.14, ry:yaw });
      };
      const stem = (u, v, sx, sy, color, rz = 0) => {
        const q = point(u, v, .091);
        capsule(q[0], q[1], q[2], sx, sy, .035, color,
          { tag:rec.hz, gloss:.14, ry:yaw, rz });
      };
      orb(-.62, .13, .245, .245, P.cream, .078);
      const birds = /火烈鸟|丹顶鹤|天鹅|鸳鸯/.test(rec.hz);
      const large = /河马|亚洲象|犀牛/.test(rec.hz);
      const cats = /雪豹|狮子/.test(rec.hz);
      if (birds) {
        orb(-.63, .10, .14, .10, accent); stem(-.54, .25, .035, .30, accent, -.18);
        orb(-.49, .39, .065, .065, accent); stem(-.69, -.03, .025, .25, P.steelD);
      } else if (large) {
        orb(-.66, .10, .18, .13, accent); orb(-.46, .16, .10, .10, accent);
        stem(-.75, -.04, .035, .23, accent); stem(-.57, -.05, .035, .23, accent);
        if (rec.hz === '亚洲象') stem(-.39, .05, .035, .25, accent, -.22);
      } else {
        orb(-.66, .10, .18, .115, accent); orb(-.45, .18, .09, .09, accent);
        stem(-.73, -.03, .032, .22, accent); stem(-.56, -.03, .032, .22, accent);
        if (cats) { orb(-.50, .28, .035, .045, accent); orb(-.40, .28, .035, .045, accent); }
      }
      write(.24, .34, rec.hz, .18, P.cream, .035);
      write(.24, .15, PINYIN[rec.hz] || rec.hz, .060, P.white, .009);
      write(.24, .035, ENGLISH[rec.hz] || rec.hz, .052, P.white, .008);
      write(.12, -.20, facts[0], .072, P.cream, .012);
      write(.12, -.39, facts[1], .072, P.cream, .012);
      // The tagged backing is pickable, but intentionally visual-only. Mixed habitats place two
      // boards beside one narrow public gate; a full-width body for each would seal that gate.
      localThing(rec.hz, rec.position,
        `这里是${rec.hz}的生活区。`, `This is the ${rec.hz} habitat.`,
        `The interpretation board and viewing position are compiled from ${rec.habitat}.`,
        { tag: rec.hz, focus: rec.focus, reach: rec.reach }, rec.id);
      // The backing and district strip remain as the distant silhouette; relief, facts and small
      // type collapse at the plan's 28 m sign-detail threshold.
      props.slice(propStart + 2).forEach(p => { p.zooLodMax = 28; });
      return p;
    }
    plan.interactions.habitatThings.forEach(interpretationBoard);

    function buildingDoorCuts(b, side) {
      const f = b.footprint;
      const doors = [...(b.publicDoors || []), ...(b.serviceDoors || [])];
      const edge = f[side];
      const cuts=doors.filter(d => {
        const v = side[0] === 'x' ? d.at[0] : d.at[1];
        return Math.abs(v - edge) < .02;
      }).map(d => {
        const v = side[0] === 'x' ? d.at[1] : d.at[0];
        return [v - d.width / 2, v + d.width / 2];
      });
      // The glazed gallery joins the two wings at y=4.2. Its end portals are genuine cuts in the
      // facing facades; a lower visual panel remains below them in buildB06b while the lift state
      // prevents ground-level visitors from mistaking that panel for a door.
      if ((b.id==='B05-conservation-west'&&side==='x1')||
          (b.id==='B06-conservation-east'&&side==='x0'))
        cuts.push([conservationBridgeRect[2],conservationBridgeRect[3]]);
      return cuts;
    }

    function buildingWallSegment(b, side, range, id, glass = false) {
      const f = b.footprint, t = .20, h = b.height;
      let x, z, w, d, rect;
      if (side[0] === 'x') {
        x = f[side]; z = (range[0] + range[1]) / 2; w = t; d = range[1] - range[0];
        rect = [x - t / 2, x + t / 2, range[0], range[1]];
      } else {
        x = (range[0] + range[1]) / 2; z = f[side]; w = range[1] - range[0]; d = t;
        rect = [range[0], range[1], z - t / 2, z + t / 2];
      }
      let p;
      if (glass) {
        p = box(x, .55, z, w, 1.10, d, P.brick,
          { hard: true, gloss: .08, ...MAT.brick });
        box(x, 1.10 + (h - 1.1) / 2, z,
          side[0] === 'x' ? t * .42 : w, h - 1.10,
          side[0] === 'z' ? t * .42 : d, P.glass,
          { hard: true, mode: 1, alpha: .27, gloss: .92 });
        const len = range[1] - range[0];
        for (let q = .8; q < len; q += 2.4) {
          const v = range[0] + q;
          if (side[0] === 'x') box(x, h / 2, v, .08, h, .08, P.steelD,
            { hard: true, gloss: .52, ...MAT.steel });
          else box(v, h / 2, z, .08, h, .08, P.steelD,
            { hard: true, gloss: .52, ...MAT.steel });
        }
      } else {
        p = box(x, h / 2, z, w, h, d, P.brick,
          { hard: true, gloss: .08, ...MAT.brick });
        box(x, h * .70, z,
          side[0] === 'x' ? t + .025 : w, .13,
          side[0] === 'z' ? t + .025 : d, P.timberD,
          { hard: true, gloss: .14, ...MAT.timber });
      }
      mark(p, id); solid(...rect); blocker(...rect, h + .3);
    }

    function buildingRoomFloors(b) {
      (b.rooms || []).forEach((r, i) => {
        const h = r.height === undefined ? b.height : r.height;
        if (h <= 0) {
          rectFlat(r.rect, .015, P.service, { mode: 10, gloss: .08, ...MAT.path }, r.id);
          return;
        }
        // Ground-level public buildings retain their authored room rectangles as floor inlays.
        // B07 is staff-only and its rooms are actual separate masses, handled by its compiler.
        rectFlat(r.rect, .017 + i * .001, i % 2 ? P.pathD : P.path,
          { mode: 9, gloss: .08, ...MAT.path }, r.id);
      });
    }

    function interiorWallX(id, at, z0, z1, gap, h = 2.65) {
      const runs = gap ? subtractIntervals(z0, z1, [[gap[0], gap[1]]]) : [[z0, z1]];
      runs.forEach((r, i) => {
        const z = (r[0] + r[1]) / 2, d = r[1] - r[0], rid =
          runs.length === 1 ? id : `${id}/G${String(i + 1).padStart(2, '0')}`;
        mark(box(at, h / 2, z, .12, h, d, P.render,
          { hard:true, gloss:.07, ...MAT.concrete }), rid);
        solid(at - .06, at + .06, r[0], r[1]);
        blocker(at - .06, at + .06, r[0], r[1], h + .1);
      });
    }

    function fixtureSolid(rect) { solid(rect[0], rect[1], rect[2], rect[3]); }

    function buildingLabel(b, text, at, yaw = Math.PI) {
      const q = glyphs(at[0], at[1], at[2], yaw, text,
        { size:.17, gap:.026, color:P.white, mode:1 });
      q.forEach(p => { p.glow = .025; });
    }

    function buildBuildingInterior(b) {
      if (b.id === 'B02-west-restroom') {
        interiorWallX(`${b.id}/PART01`, -31.3, 21, 24.2, [21,22.05]);
        buildingLabel(b, '卫生间', [-31.2,2.35,20.57], 0);
        // Women's cubicles, washbasins and an accessible family room with a transfer rail.
        mark(box(-33.35,.75,23.55,1.02,1.50,.08,P.render,
          { hard:true,...MAT.concrete }), `${b.id}/women/FIX01`);
        box(-32.15,.75,23.55,1.02,1.50,.08,P.render,{ hard:true,...MAT.concrete });
        for (const x of [-33.35,-32.15]) {
          cyl(x,.27,23.12,.22,.30,P.white,{ gloss:.42 });
          box(x,.48,23.42,.40,.44,.24,P.white,{ gloss:.40 });
        }
        for (const x of [-33.25,-32.25]) {
          box(x,.72,21.55,.62,.16,.38,P.white,{ gloss:.38 });
          cyl(x,.88,21.55,.035,.20,P.steel,{ gloss:.58,...MAT.steel });
        }
        mark(box(-30.15,.46,23.42,.62,.84,.56,P.white,{ gloss:.40 }),
          `${b.id}/accessible-family/FIX01`);
        box(-29.40,.73,22.00,.72,.16,.40,P.white,{ gloss:.40 });
        capsule(-29.55,.72,23.33,.035,.72,.035,P.steel,
          { rz:Math.PI/2,gloss:.60,...MAT.steel });
        fixtureSolid([-33.65,-32.95,22.92,23.70]);
        fixtureSolid([-32.45,-31.85,22.92,23.70]);
        fixtureSolid([-30.52,-29.78,23.10,23.74]);
      } else if (b.id === 'B03-east-rest-hub') {
        interiorWallX(`${b.id}/PART01`, 45.75, 21, 22.7, [21,22.05]);
        buildingLabel(b, '休息服务', [46,2.35,20.57], 0);
        mark(box(44.0,.72,21.62,2.55,1.05,.62,P.timberD,
          { hard:true,gloss:.15,...MAT.timber }), `${b.id}/snack-counter/FIX01`);
        box(44.0,1.31,21.92,2.75,.14,.25,P.timber,{ hard:true,...MAT.timber });
        for (const x of [43.0,44.0,45.0])
          box(x,1.72,22.52,.62,.60,.18,iColor(x),{ hard:true,gloss:.22 });
        for (const x of [47.0,48.25]) {
          box(x,.78,22.50,1.00,1.55,.08,P.render,{ hard:true,...MAT.concrete });
          cyl(x,.27,22.08,.22,.30,P.white,{ gloss:.42 });
          box(x,.48,22.38,.40,.44,.24,P.white,{ gloss:.40 });
          fixtureSolid([x-.30,x+.30,21.88,22.58]);
        }
        box(49.05,.72,21.45,.66,.16,.38,P.white,{ gloss:.40 });
        fixtureSolid([42.65,45.35,21.25,21.98]);
      } else if (b.id === 'B05-conservation-west') {
        // Both exact facade doors open into the shared spine; stop the divider short of each
        // threshold, then retain the central internal doorway.
        interiorWallX(`${b.id}/PART01`, -12.20, 56.0, 61.0, [58.05,59.25], 3.0);
        buildingLabel(b, '保育教室', [-11.5,3.25,54.88], 0);
        // Six classroom desks face a teaching wall; the adjacent gallery uses low glass cases.
        let first = true;
        for (const z of [56.7,58.25,59.8]) for (const x of [-15.45,-13.35]) {
          const q = box(x,.72,z,1.20,.12,.48,P.timber,{ hard:true,...MAT.timber });
          if (first) { mark(q, `${b.id}/classroom/FIX01`); first = false; }
          box(x,.40,z,.08,.62,.38,P.steelD,{ hard:true,...MAT.steel });
          fixtureSolid([x-.63,x+.63,z-.27,z+.27]);
        }
        box(-14.25,1.85,61.27,3.5,1.35,.08,P.green,{ hard:true,gloss:.12 });
        glyphs(-14.25,1.9,61.20,Math.PI,'保护动物',{size:.16,color:P.white,mode:1});
        first = true;
        for (const z of [57.2,59.6]) for (const x of [-10.1,-8.0]) {
          const q = box(x,.82,z,1.25,.86,.72,P.glass,
            { hard:true,mode:1,alpha:.30,gloss:.90 });
          if (first) { mark(q, `${b.id}/panda-lab-gallery/FIX01`); first = false; }
          taper(x,1.12,z,.50,.55,.34,P.pine,{mode:15,gloss:.08});
          fixtureSolid([x-.65,x+.65,z-.38,z+.38]);
        }
        glyphs(-9.0,2.22,61.22,Math.PI,'熊猫保护',{size:.16,color:P.gold,mode:1});
      } else if (b.id === 'B06-conservation-east') {
        interiorWallX(`${b.id}/PART01`, 6.25, 55.5, 58.5, [56.15,57.35], 3.0);
        interiorWallX(`${b.id}/PART02`, 9.60, 56.0, 61.0, [58.25,59.45], 3.0);
        buildingLabel(b, '保育中心', [9,3.25,54.88], 0);
        mark(box(4.15,.54,57.18,.95,.56,2.05,P.white,{ gloss:.35 }),
          `${b.id}/first-aid/FIX01`);
        box(5.42,1.18,57.78,.72,1.72,.42,P.render,{ hard:true,...MAT.concrete });
        cyl(3.25,.82,56.25,.16,1.35,P.steel,{ gloss:.55,...MAT.steel });
        fixtureSolid([3.62,4.68,56.08,58.28]);
        fixtureSolid([5.05,5.78,57.52,58.02]);
        let first = true;
        for (const [x,z] of [[7.35,56.8],[8.25,58.3],[7.35,60.0]]) {
          const q = box(x,.68,z,.74,1.25,.74,P.render,{ hard:true,...MAT.concrete });
          if (first) { mark(q, `${b.id}/exhibition/FIX01`); first = false; }
          ball(x,1.55,z,.23,.23,.23,P.rockL,{ gloss:.10 });
          fixtureSolid([x-.39,x+.39,z-.39,z+.39]);
        }
        first = true;
        for (const z of [56.5,58.1,59.7]) {
          const q = box(15.55,1.30,z,.50,2.45,1.18,P.timberD,
            { hard:true,...MAT.timber });
          if (first) { mark(q, `${b.id}/library-shop/FIX01`); first = false; }
          for (let y=.45;y<2.3;y+=.43) box(15.22,y,z,1.03,.06,1.05,P.timber,
            { hard:true,...MAT.timber });
          fixtureSolid([15.25,15.85,z-.62,z+.62]);
        }
        box(11.0,.74,56.25,2.25,1.05,.62,P.timberD,{ hard:true,...MAT.timber });
        fixtureSolid([9.82,12.18,55.91,56.59]);
        glyphs(12.6,2.20,61.22,Math.PI,'图书商店',{size:.16,color:P.gold,mode:1});
      }

      function iColor(x) { return Math.round(x * 10) % 2 ? P.orange : P.green; }
    }

    function buildEntranceApron(b) {
      if (!Array.isArray(b.entranceApron)) return;
      rectFlat(b.entranceApron, .022, b.id === 'B03-east-rest-hub' ? P.timber : P.path,
        b.id === 'B03-east-rest-hub' ? { mode:6,gloss:.13,...MAT.timber } :
          { mode:9,gloss:.10,...MAT.path }, `${b.id}/APRON`);
    }

    function buildShell(b, glass = false) {
      const f = b.footprint;
      for (const side of ['x0', 'x1', 'z0', 'z1']) {
        const range = side[0] === 'x' ? [f.z0, f.z1] : [f.x0, f.x1];
        const runs = subtractIntervals(range[0], range[1], buildingDoorCuts(b, side));
        const base = `BW-${b.id}-${side}`;
        runs.forEach((r, i) => buildingWallSegment(b, side, r,
          runs.length === 1 ? base : `${base}/G${String(i + 1).padStart(2, '0')}`, glass));
      }
      const [x, z] = center(fpRect(f)), [w, d] = dims(fpRect(f));
      if (glass) {
        mark(box(x, b.height + .08, z, w + .18, .16, d + .18, P.glass,
          { hard: true, mode: 1, alpha: .26, gloss: .94 }), `${b.id}/ROOF`);
        for (let xx = f.x0 + 1.2; xx < f.x1; xx += 3.0)
          box(xx, b.height + .16, z, .09, .22, d + .28, P.steelD,
            { hard: true, gloss: .50, ...MAT.steel });
      } else {
        const liftCut=b.id==='B05-conservation-west'?conservationLifts[0]:
          b.id==='B06-conservation-east'?conservationLifts[1]:null;
        if(liftCut){
          const roof=[f.x0-.20,f.x1+.20,f.z0-.20,f.z1+.20];
          rectMinusCuts(roof,[liftCut]).forEach((r,i)=>{
            const q=box((r[0]+r[1])/2,b.height+.12,(r[2]+r[3])/2,
              r[1]-r[0],.24,r[3]-r[2],P.tile,{hard:true,gloss:.16,...MAT.roof});
            mark(q,i?`${b.id}/ROOF/G${String(i).padStart(2,'0')}`:`${b.id}/ROOF`);
          });
        }else{
          mark(box(x, b.height + .12, z, w + .40, .24, d + .40, P.tile,
            { hard: true, gloss: .16, ...MAT.roof }), `${b.id}/ROOF`);
          box(x, b.height + .32, z, Math.max(.5, w - 1.0), .20,
            Math.max(.5, d - 1.0), P.tileL, { hard: true, gloss: .16, ...MAT.roof });
        }
      }
      buildEntranceApron(b);
      buildingRoomFloors(b);
      buildBuildingInterior(b);
      if(b.id==='B08-tropical-house'){
        const publicDoor=b.publicDoors[0],serviceDoor=b.serviceDoors[0];
        // The public opening is a scene portal, not an invitation to walk into the outdoor shell.
        // Its thin threshold keeps the body at the tagged transition while preserving the opening.
        solid(publicDoor.at[0]+.30,publicDoor.at[0]+.46,
          publicDoor.at[1]-publicDoor.width/2,publicDoor.at[1]+publicDoor.width/2);
        // The east opening remains visible for staff logistics but is physically closed to visitors.
        mark(box(serviceDoor.at[0],1.18,serviceDoor.at[1],.14,2.36,serviceDoor.width,P.steelD,
          {hard:true,gloss:.52,...MAT.steel}),`${b.id}/SERVICE-GATE`);
        for(let z=serviceDoor.at[1]-serviceDoor.width/2+.25;
            z<serviceDoor.at[1]+serviceDoor.width/2;z+=.42)
          cyl(serviceDoor.at[0]-.03,1.18,z,.03,2.25,P.steel,{gloss:.58,...MAT.steel});
        solid(serviceDoor.at[0]-.09,serviceDoor.at[0]+.09,
          serviceDoor.at[1]-serviceDoor.width/2,serviceDoor.at[1]+serviceDoor.width/2);
        blocker(serviceDoor.at[0]-.09,serviceDoor.at[0]+.09,
          serviceDoor.at[1]-serviceDoor.width/2,serviceDoor.at[1]+serviceDoor.width/2,2.5);
      }
      counts.buildings++;
    }

    function buildB01(b) {
      for (const s of b.solidSegments) {
        const [x, z] = center(s.rect), [w, d] = dims(s.rect);
        mark(box(x, b.height / 2, z, w, b.height, d, P.brick,
          { hard: true, gloss: .08, ...MAT.brick }), s.id);
        solid(...s.rect); blocker(...s.rect, b.height + .2);
        for (const xx of [s.rect[0] + .22, s.rect[1] - .22])
          for (const zz of [s.rect[2] + .22, s.rect[3] - .22])
            box(xx, b.height * .48, zz, .34, b.height * .96, .34, P.brickD,
              { hard: true, ...MAT.brick });
      }
      const r = fpRect(b.footprint), [x, z] = center(r), [w, d] = dims(r);
      mark(box(x, b.height + .10, z, w + .5, .22, d + .5, P.tile,
        { hard: true, gloss: .17, ...MAT.roof }), b.id);
      box(x, b.height + .32, z, w - .35, .22, d - 1.1, P.tileL,
        { hard: true, gloss: .17, ...MAT.roof });
      counts.buildings++;
    }

    function buildB04(b) {
      const r = fpRect(b.footprint), [x, z] = center(r), [w, d] = dims(r);
      mark(box(x, .42, z, w, .16, d, P.timber,
        { hard: true, gloss: .14, ...MAT.timber }), b.id);
      for (const xx of [r[0] + .22, r[1] - .22])
        for (const zz of [r[2] + .22, r[3] - .22]) {
          box(xx, 2.35, zz, .20, 3.70, .20, P.timberD,
            { hard: true, gloss: .15, ...MAT.timber });
          solid(xx - .12, xx + .12, zz - .12, zz + .12);
        }
      mark(box(x, b.height, z, w + .65, .20, d + .65, P.tile,
        { hard: true, gloss: .17, ...MAT.roof }), 'H31-waterfowl-lake/O01');
      taper(x, b.height + .36, z, Math.max(.8, w - .45), .70,
        Math.max(.8, d - .45), P.tileL, { gloss: .17, ...MAT.roof });
      const apron = b.entranceApron.rect;
      rectFlat(apron, b.entranceApron.y0, P.timber,
        { mode: 6, gloss: .13, ...MAT.timber }, `${b.id}/APRON`);
      // r2 puts the lake deck 0.5 m above grade while the global accessibility contract limits
      // public ramps to 1:20. The authored 4.7 m apron stays level at its exact y0; a derived
      // two-sided 10 m approach occupies the west verge of P104 and leaves its centreline clear.
      const rise = b.entranceApron.y0, run = rise * 20;
      const midZ = (apron[2] + apron[3]) / 2;
      const rampX0 = apron[1] - .5, rampX1 = apron[1] + 2.0;
      const rampW = rampX1 - rampX0, rampX = (rampX0 + rampX1) / 2;
      const slope = Math.atan2(rise, run), rampLen = Math.hypot(run, rise);
      mark(box(rampX, rise / 2 - .04, midZ - run / 2, rampW, .08, rampLen, P.timber,
        { hard:true,rx:-slope,gloss:.13,...MAT.timber }), `${b.id}/RAMP-SOUTH`);
      mark(box(rampX, rise / 2 - .04, midZ + run / 2, rampW, .08, rampLen, P.timber,
        { hard:true,rx:slope,gloss:.13,...MAT.timber }), `${b.id}/RAMP-NORTH`);
      rectFlat([rampX0,rampX1,apron[2],apron[3]], rise, P.timber,
        { mode:6,gloss:.13,...MAT.timber }, `${b.id}/RAMP-LANDING`);
      const rail = (id, xx, z0, z1, down) => {
        const zz = (z0 + z1) / 2, len = z1 - z0;
        const localLift = rise * (1 - Math.abs(zz - midZ) / run);
        mark(box(xx, localLift + .60, zz, .055, .055, Math.hypot(len, len * .05), P.steelD,
          { hard:true,rx:down ? slope : -slope,gloss:.50,...MAT.steel }), id);
        for (let pz = z0; pz <= z1 + EPS; pz += 2) {
          const lift = rise * (1 - Math.abs(pz - midZ) / run);
          box(xx,lift+.31,pz,.055,.62,.055,P.steelD,{ hard:true,gloss:.50,...MAT.steel });
        }
        solid(xx-.04,xx+.04,z0,z1);
      };
      // Body-width opening for the accessible connector from P104 at the ramp foot.
      rail(`${b.id}/RAMP-RAIL-E-S`,rampX1,midZ-run+1.3,apron[2],false);
      rail(`${b.id}/RAMP-RAIL-E-N`,rampX1,apron[3],midZ+run,true);
      // A gap beside M102 makes the map reachable from its exact focus without crossing a rail.
      rail(`${b.id}/RAMP-RAIL-W-S1`,rampX0,midZ-run,20.05,false);
      rail(`${b.id}/RAMP-RAIL-W-S2`,rampX0,21.60,apron[2],false);
      rail(`${b.id}/RAMP-RAIL-W-N`,rampX0,apron[3],midZ+run,true);
      if (b.entranceApron.edgeRails) for (const [id, rz] of [['N',apron[3]],['S',apron[2]]]) {
        const x0 = apron[0] + .18, x1 = rampX0 - .15, cx = (x0 + x1) / 2;
        mark(box(cx,rise+.60,rz,x1-x0,.055,.055,P.steelD,
          { hard:true,gloss:.50,...MAT.steel }), `${b.id}/APRON-RAIL-${id}`);
        for (const px of [x0,(x0+x1)/2,x1])
          box(px,rise+.31,rz,.055,.62,.055,P.steelD,{ hard:true,gloss:.50,...MAT.steel });
        solid(x0,x1,rz-.04,rz+.04);
      }
      // Tea counter and one communal table occupy their exact room rectangles.
      const counter = b.rooms.find(r => r.id === 'tea-counter');
      if (counter) {
        const [cx, cz] = center(counter.rect), [cw, cd] = dims(counter.rect);
        box(cx, 1.03, cz, cw, 1.05, cd, P.timberD,
          { hard: true, gloss: .16, ...MAT.timber });
        solid(...counter.rect);
      }
      const seating = b.rooms.find(r => r.id === 'seating');
      if (seating) {
        const [sx, sz] = center(seating.rect);
        box(sx, .93, sz, .82, .10, 1.55, P.timber,
          { hard: true, gloss: .16, ...MAT.timber });
      }
      counts.buildings++;
    }

    function buildB06b(b) {
      const r = fpRect(b.footprint), [x, z] = center(r), [w, d] = dims(r);
      // Open-ended elevated gallery: floor/roof and north/south glazing, never a filled box whose
      // end faces visually seal the wing connections.
      mark(box(x,b.y0-.06,z,w,.12,d,P.path,
        {hard:true,mode:9,gloss:.10,...MAT.path}),b.id);
      box(x,b.y0+b.height+.06,z,w+.18,.12,d+.18,P.glass,
        {hard:true,mode:1,alpha:.26,gloss:.92});
      for(const zz of [r[2],r[3]]){
        box(x,b.y0+b.height/2,zz,w,b.height,.10,P.glass,
          {hard:true,mode:1,alpha:.30,gloss:.92});
        box(x,b.y0+.95,zz,w,.07,.11,DISTRICT_ACCENT.D3,
          {hard:true,gloss:.30});
      }
      for (let zz = r[2]; zz <= r[3] + EPS; zz += 1.5)
        box(x, b.y0 + b.height / 2, zz, w, .11, .11, P.steelD,
          { hard: true, gloss: .50, ...MAT.steel });
      // Lower facade panels preserve the two wings below the upper openings. They deliberately
      // have no 2-D solid: the adjacent lift volume owns the floor state, while P104 remains a
      // genuine ground-level underpass through the middle of the bridge footprint.
      for(const xx of [r[0],r[1]])
        box(xx,b.clearanceBelow/2,z,.18,b.clearanceBelow,d,P.brick,
          {hard:true,gloss:.08,...MAT.brick});
      conservationLifts.forEach((lr,i)=>{
        const [lx,lz]=center(lr),[lw,ld]=dims(lr),stem=`${b.id}/LIFT-${i?'E':'W'}`;
        mark(box(lx,b.y0-.06,lz,lw,.12,ld,P.path,
          {hard:true,mode:9,gloss:.10,...MAT.path}),stem);
        for(const px of [lr[0],lr[1]])for(const pz of [lr[2],lr[3]])
          box(px,(b.y0+b.height)/2,pz,.08,b.y0+b.height,.08,P.steelD,
            {hard:true,gloss:.52,...MAT.steel});
        for(const zz of [lr[2],lr[3]])
          box(lx,b.y0+b.height/2,zz,lw,b.height,.07,P.glass,
            {hard:true,mode:1,alpha:.24,gloss:.90});
        box(lx,b.y0+b.height+.06,lz,lw+.12,.12,ld+.12,P.tile,
          {hard:true,gloss:.16,...MAT.roof});
        glyphs(lx,b.y0+.72,i?lr[3]+.045:lr[2]-.045,i?0:Math.PI,'电梯',
          {size:.13,gap:.02,color:P.gold,mode:1});
      });
      for(const xx of [-4.2,-1.8,.6]){
        box(xx,b.y0+.78,r[3]-.22,1.35,.78,.32,P.glass,
          {hard:true,mode:1,alpha:.28,gloss:.90});
        ball(xx,b.y0+1.15,r[3]-.22,.18,.18,.18,P.green,{gloss:.12});
      }
      counts.buildings++;
    }

    function buildB07(b) {
      // Exact explicit perimeter runs supersede the generic building-wall rule for this compound.
      b.perimeterFence.runs.forEach(run => {
        if(run.id!=='B07-FW05'){
          buildRun({ ...run,height:b.perimeterFence.height,
            thickness:b.perimeterFence.thickness,bodySolid:true,
            cameraBlockerTop:b.perimeterFence.cameraBlockerTop },'fence');
          return;
        }
        for(const [i,range] of [[0,[-51,-48.7]],[1,[-45.3,-37]]])
          buildRun({...run,id:i?`${run.id}/G02`:run.id,range,
            height:b.perimeterFence.height,thickness:b.perimeterFence.thickness,
            bodySolid:true,cameraBlockerTop:b.perimeterFence.cameraBlockerTop},'fence');
        box(-47,.34,42.5,3.4,.68,.18,P.brick,{hard:true,gloss:.08,...MAT.brick});
        box(-47,1.48,42.5,3.4,1.60,.10,P.glass,
          {hard:true,mode:1,alpha:.25,gloss:.92,tag:'动物医院'});
        for(const x of [-48.65,-47,-45.35])
          box(x,1.48,42.5,.07,1.65,.12,P.steelD,{hard:true,gloss:.52,...MAT.steel});
        solid(-48.7,-45.3,42.41,42.59);blocker(-48.7,-45.3,42.41,42.59,2.6);
      });
      b.internalDriveAisles.forEach(a => rectFlat(a.rect, .012, P.service,
        { mode: 10, gloss: .08, ...MAT.path }, a.id));
      b.rooms.forEach(r => {
        const [x, z] = center(r.rect), [w, d] = dims(r.rect), h = r.height || 0;
        if (!h) {
          rectFlat(r.rect, .014, P.service, { mode: 10, gloss: .08, ...MAT.path }, r.id);
          for (let q = 0; q < 4; q++)
            box(r.rect[0] + .42 + q * .74, .38, z, .58, .76, .72, P.steelD,
              { hard: true, gloss: .36, ...MAT.steel });
          return;
        }
        if(r.id==='animal-hospital'){
          rectFlat(r.rect,.018,P.path,{mode:9,gloss:.08,...MAT.path},r.id);
          box(r.rect[0],h/2,z,.18,h,d,P.brick,{hard:true,gloss:.08,...MAT.brick});
          box(r.rect[1],h/2,z,.18,h,d,P.brick,{hard:true,gloss:.08,...MAT.brick});
          box(x,h/2,r.rect[3],w,h,.18,P.brick,{hard:true,gloss:.08,...MAT.brick});
          box(x,.38,r.rect[2],w,.76,.18,P.brick,{hard:true,gloss:.08,...MAT.brick});
          box(x,2.23,r.rect[2],w,2.90,.10,P.glass,
            {hard:true,mode:1,alpha:.24,gloss:.92,tag:'动物医院'});
          for(const px of [-49.6,-48.3,-47,-45.7,-44.4])
            box(px,2.2,r.rect[2],.07,2.85,.12,P.steelD,{hard:true,gloss:.52,...MAT.steel});
          // Exam table, imaging screen and recovery kennel are readable through both windows.
          box(-47,1.02,49.1,2.05,.18,.78,P.white,{hard:true,gloss:.36});
          box(-47,.56,49.1,.14,.90,.62,P.steelD,{hard:true,...MAT.steel});
          box(-49.1,1.75,49.7,.18,1.55,1.85,P.charcoal,{hard:true,gloss:.18});
          box(-49.0,1.78,49.68,.035,1.20,1.52,P.blue,{hard:true,mode:1,glow:.04});
          for(const zz of [51.4,53.0])
            box(-45.0,.72,zz,1.55,1.35,1.20,P.steel,
              {hard:true,mode:1,alpha:.20,gloss:.58});
        }else mark(box(x,h/2,z,w,h,d,P.brickD,
          {hard:true,gloss:.08,...MAT.brick}),r.id);
        box(x, h + .10, z, w + .3, .20, d + .3, P.tile,
          { hard: true, gloss: .16, ...MAT.roof });
        solid(...r.rect); blocker(...r.rect, h + .3);
      });
      // Both service openings are staff-only closed gates for player collision.
      for (const d of b.serviceDoors) {
        const onWest = Math.abs(d.at[0] - b.footprint.x0) < .02;
        const x = d.at[0], z = d.at[1];
        mark(box(x, 1.18, z, .12, 2.36, d.width, P.steelD,
          { hard: true, gloss: .50, ...MAT.steel }), `${b.id}/GATE-${onWest ? 'W' : 'E'}`);
        solid(x - .07, x + .07, z - d.width / 2, z + d.width / 2);
      }
      counts.buildings++;
    }

    for (const b of plan.buildings) {
      if (b.id === 'B01-west-gate-pavilion') buildB01(b);
      else if (b.id === 'B04-lake-pavilion') buildB04(b);
      else if (b.id === 'B06b-conservation-bridge') buildB06b(b);
      else if (b.id === 'B07-operations-campus') buildB07(b);
      else buildShell(b, b.id === 'B08-tropical-house');
    }

    function signBoard(x, y, z, yaw, hz, id, focus, reach, sentence, tr, note) {
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      mark(box(x, y, z, Math.max(1.6, [...hz].length * .48), .88, .11, P.charcoal,
        { tag: hz, hard: true, gloss: .10, ry: yaw }), id);
      glyphs(x + nx * .062, y, z + nz * .062, yaw, hz,
        { size: .23, gap: .045, color: P.cream, mode: 1, tag: hz });
      return localThing(hz, [x, y, z], sentence, tr, note,
        { tag: hz, focus, reach }, id);
    }

    // Required public destinations, with their plan positions/focuses unchanged.
    for (const rec of plan.interactions.requiredPublicThings) {
      const dx = rec.focus[0] - rec.position[0], dz = rec.focus[1] - rec.position[2];
      const yaw = Math.abs(dx) >= Math.abs(dz) ?
        (dx >= 0 ? Math.PI / 2 : -Math.PI / 2) : (dz >= 0 ? 0 : Math.PI);
      let th;
      if(rec.id==='TH-animal-hospital'){
        mark(box(rec.position[0],rec.position[1],rec.position[2],3.4,.34,.12,P.charcoal,
          {tag:rec.hz,hard:true,gloss:.12,ry:yaw}),rec.id);
        glyphs(rec.position[0],rec.position[1],rec.position[2]-.07,yaw,rec.hz,
          {size:.19,gap:.03,color:P.cream,mode:1,tag:rec.hz});
        th=localThing(rec.hz,rec.position,'透过观察窗看看动物医院。',
          'Look into the animal hospital through the observation window.',
          'The public window looks across the service court into the treatment room.',
          {tag:rec.hz,focus:rec.focus,reach:rec.reach},rec.id);
      }else th = signBoard(rec.position[0], rec.position[1], rec.position[2], yaw,
          rec.hz, rec.id, rec.focus, rec.reach,
          rec.hz === '热带馆' ? '进去看看热带动物吧。' : `这里是${rec.hz}。`,
          rec.hz === '热带馆' ? 'Go inside to see the tropical animals.' : `This is ${rec.hz}.`,
          `Destination ${rec.id} is fixed by the zoo expansion blueprint.`);
      if (rec.transition) {
        th.go = rec.transition;
        th.exit = { place: rec.transition };
      }
    }

    function buildBench(rec) {
      const [x, z] = rec.at, yaw = rec.faceYaw || 0;
      const tag = '长椅', c = Math.cos(yaw), s = Math.sin(yaw);
      const atLocal = (u, v) => [x + c * u + s * v, z - s * u + c * v];
      const [sx, sz] = atLocal(0, 0);
      mark(box(sx, .48, sz, 1.50, .11, .52, P.timber,
        { tag, hard: true, gloss: .16, ry: yaw, ...MAT.timber }), rec.id);
      // `faceYaw` points from the seat toward the exhibit/focus; the backrest belongs behind it.
      const [bx, bz] = atLocal(0, -.25);
      box(bx, .87, bz, 1.50, .72, .10, P.timber,
        { tag, hard: true, gloss: .16, ry: yaw, ...MAT.timber });
      for (const u of [-.58, .58]) {
        const [lx, lz] = atLocal(u, .02);
        box(lx, .25, lz, .10, .50, .42, P.steelD,
          { tag, hard: true, gloss: .44, ry: yaw, ...MAT.steel });
      }
      const ex = plan.objectScheduleContract.benches.bodyHalfExtents;
      if (Math.abs(Math.sin(yaw)) > .7) solid(x - ex[1], x + ex[1], z - ex[0], z + ex[0]);
      else solid(x - ex[0], x + ex[0], z - ex[1], z + ex[1]);
      shade(x, z, 1.75, .75, .25);
      const th=localThing(tag, [x, .80, z], '在长椅上歇一会儿。', 'Rest on the bench for a while.',
        `This is the local interaction for ${rec.id}.`,
        { tag, focus: rec.focus, reach: plan.objectScheduleContract.benches.reach },
        `TH-${rec.id}`);
      th.seat={at:[x,z],yaw,seatY:.48};th.stand=rec.focus.slice();
      counts.furniture++;
    }

    function buildBin(rec) {
      const [x, z] = rec.at;
      mark(cyl(x, .43, z, .22, .86, P.charcoal,
        { gloss: .34, ...MAT.steel }), rec.id);
      cyl(x, .88, z, .24, .08, P.steel, { gloss: .48, ...MAT.steel });
      box(x, .69, z - .205, .20, .20, .04, P.black, { hard: true });
      const r = plan.objectScheduleContract.bins.bodyRadius;
      solid(x - r, x + r, z - r, z + r); counts.furniture++;
    }

    function buildLamp(rec, i) {
      const [x, z] = rec.at, h = plan.objectScheduleContract.lamps.bodyHeight;
      mark(cyl(x, h / 2, z, .07, h, P.steelD,
        { gloss: .52, ...MAT.steel }), rec.id);
      box(x, h + .08, z, .42, .16, .42, P.charcoal,
        { hard: true, gloss: .46, ...MAT.steel });
      const bulb = box(x, h - .05, z, .29, .13, .29, P.cream,
        { hard: true, mode: 1, glow: 0, gloss: .64 });
      const pool = glow(M.trs(x, .018, z, 0, 4.6, 1, 4.6), [1.0, .76, .46], 0);
      const lampLight = light(x, h - .05, z, [1.0, .77, .48], .72, 5.2);
      lampLight.on = false;
      nightGlows.push({ bulb, pool });
      const r = plan.objectScheduleContract.lamps.bodyRadius;
      solid(x - r, x + r, z - r, z + r); counts.furniture++;
    }

    function facingBoard(rec, color = P.blue) {
      const [x, z] = rec.at, yaw = rec.yaw || 0, tag = rec.tag;
      const nx = Math.sin(yaw), nz = Math.cos(yaw), c = Math.cos(yaw), s = Math.sin(yaw);
      mark(box(x, 1.34, z, 1.18, 1.55, .13, color,
        { tag, hard: true, gloss: .14, ry: yaw }), rec.id);
      for (const u of [-.42, .42]) {
        const px = x + Math.cos(yaw) * u, pz = z - Math.sin(yaw) * u;
        box(px, .53, pz, .07, 1.06, .07, P.steelD,
          { tag, hard: true, gloss: .48, ...MAT.steel });
      }
      const detailStart = props.length;
      const mapPoint = (u, y, d = .075) => [x + c * u + nx * d, y, z - s * u + nz * d];
      const mapBox = (u, y, w, h, fill, d = .077) => {
        const q = mapPoint(u, y, d);
        return box(q[0], q[1], q[2], Math.max(.008, w), Math.max(.008, h), .012, fill,
          { tag, hard:true, gloss:.10, ry:yaw, mode:1 });
      };
      // These are real whole-zoo maps, not generic blue signs. Geometry is projected directly
      // from the canonical site/habitat/path coordinates, so every map stays current with r2.
      mapBox(0, 1.25, 1.02, .92, P.cream, .076);
      const sx = .0080, sz = .0096, zMid = (plan.site.bounds.z0 + plan.site.bounds.z1) / 2;
      const mapU = wx => wx * sx, mapV = wz => 1.25 + (wz - zMid) * sz;
      for (const h of plan.preservation.existingHabitatBounds) {
        mapBox(mapU((h.bounds.x0+h.bounds.x1)/2),mapV((h.bounds.z0+h.bounds.z1)/2),
          (h.bounds.x1-h.bounds.x0)*sx,(h.bounds.z1-h.bounds.z0)*sz,P.red,.080);
      }
      for (const h of plan.habitats) {
        const u = mapU((h.bounds.x0 + h.bounds.x1) / 2);
        const v = mapV((h.bounds.z0 + h.bounds.z1) / 2);
        mapBox(u, v, (h.bounds.x1 - h.bounds.x0) * sx,
          (h.bounds.z1 - h.bounds.z0) * sz,
          DISTRICT_ACCENT[h.district] || P.green, .081);
      }
      for (const b of plan.buildings) {
        const f=b.footprint;
        mapBox(mapU((f.x0+f.x1)/2),mapV((f.z0+f.z1)/2),
          (f.x1-f.x0)*sx,(f.z1-f.z0)*sz,P.charcoal,.083);
      }
      for (const q of plan.preservation.existingCorePaths) {
        const r = q.rect;
        mapBox(mapU((r.x0 + r.x1) / 2), mapV((r.z0 + r.z1) / 2),
          (r.x1 - r.x0) * sx, (r.z1 - r.z0) * sz, P.pathD, .084);
      }
      for (const p of plan.paths.filter(q => q.access === 'public')) {
        for (let i = 1; i < p.centerline.length; i++) {
          const a = p.centerline[i - 1], b = p.centerline[i];
          if (Math.abs(a[0] - b[0]) < EPS)
            mapBox(mapU(a[0]), mapV((a[1] + b[1]) / 2),
              Math.max(.018, p.width * sx), Math.abs(a[1] - b[1]) * sz, P.white, .087);
          else if (Math.abs(a[1] - b[1]) < EPS)
            mapBox(mapU((a[0] + b[0]) / 2), mapV(a[1]),
              Math.abs(a[0] - b[0]) * sx, Math.max(.018, p.width * sz), P.white, .087);
        }
      }
      mapBox(mapU(plan.site.mainSpawn.at[0]), mapV(plan.site.mainSpawn.at[1]), .055, .055, P.red, .091);
      mapBox(mapU(plan.site.secondarySpawn.at[0]), mapV(plan.site.secondarySpawn.at[1]), .045, .045, P.red, .091);
      const title = mapPoint(0, 1.96, .078);
      glyphs(title[0], title[1], title[2], yaw, '全园导游图',
        { size:.135, gap:.022, color:P.white, mode:1, tag });
      const north = mapPoint(.40, 1.72, .094);
      glyphs(north[0], north[1], north[2], yaw, '北',
        { size:.10, gap:0, color:P.red, mode:1, tag, glyphRole:'micro' });
      props.slice(detailStart).forEach(p => { p.zooLodMax = 28; });
      localThing(tag, [x, 1.34, z], '先看一下园区导游图。', 'Check the zoo map first.',
        `Map fixture ${rec.id} has its own plan-authored focus.`,
        { tag, focus: rec.focus, reach: rec.reach }, rec.thingId);
      const ex = plan.objectScheduleContract.mapBoards.bodyHalfExtents;
      if (Math.abs(Math.sin(yaw)) > .7) solid(x - ex[1], x + ex[1], z - ex[0], z + ex[0]);
      else solid(x - ex[0], x + ex[0], z - ex[1], z + ex[1]);
      counts.furniture++;
    }

    function waterStation(rec) {
      const [x, z] = rec.at, tag = rec.tag;
      mark(cyl(x, .58, z, .25, 1.16, P.steel,
        { tag, gloss: .60, ...MAT.steel }), rec.id);
      cyl(x, 1.11, z, .20, .10, P.waterL, { tag, gloss: .70 });
      box(x, .91, z - .23, .12, .10, .34, P.steelD,
        { tag, hard: true, gloss: .60 });
      localThing(tag, [x, 1.0, z], '在这里接一点饮用水。', 'Fill some drinking water here.',
        `Water station ${rec.id}.`, { tag, focus: rec.focus, reach: rec.reach }, rec.thingId);
      const r = plan.objectScheduleContract.waterStations.bodyRadius;
      solid(x - r, x + r, z - r, z + r); counts.furniture++;
    }

    plan.objectSchedules.benches.forEach(buildBench);
    plan.objectSchedules.bins.forEach(buildBin);
    plan.objectSchedules.lamps.forEach(buildLamp);
    // M100 is the preserved south board built by zoo.js at this exact revised anchor.
    // Wrap the callback: Array#forEach passes its numeric index as a second argument, which would
    // otherwise override facingBoard's palette-colour default and create five invalid props.
    plan.objectSchedules.mapBoards.filter(r => r.id !== 'M100-south-existing')
      .forEach(rec => facingBoard(rec));
    plan.objectSchedules.waterStations.forEach(waterStation);

    for (const rec of plan.objectSchedules.firstAid) {
      const [x, z] = rec.at, tag = rec.tag;
      mark(box(x, 1.35, z, 1.20, .72, .10, P.white,
        { tag, hard: true, gloss: .12 }), rec.id);
      box(x, 1.35, z - .065, .18, .55, .04, P.red,
        { tag, hard: true, gloss: .18 });
      box(x, 1.35, z - .068, .55, .18, .04, P.red,
        { tag, hard: true, gloss: .18 });
      localThing(tag, [x, 1.35, z], '医务室可以处理轻伤。', 'The first-aid room can treat minor injuries.',
        `First aid is inside ${rec.building}.`,
        { tag, focus: rec.focus, reach: rec.reach }, rec.thingId);
      counts.furniture++;
    }

    for (const rec of plan.objectSchedules.accessibleRouteSigns) {
      const [x, z] = rec.at, yaw = rec.yaw, tag = rec.tag;
      mark(box(x, 1.20, z, .94, .88, .10, P.blue,
        { tag, hard: true, gloss: .16, ry: yaw }), rec.id);
      glyphs(x + Math.sin(yaw) * .058, 1.22, z + Math.cos(yaw) * .058, yaw, '无障碍',
        { size: .15, gap: .025, color: P.white, mode: 1, tag });
      localThing(tag, [x, 1.20, z], '显示园区无障碍路线。', 'Show the accessible route through the zoo.',
        `This sign controls the ${plan.routes.accessibleTour.id} overlay.`,
        { tag, focus: rec.focus, reach: rec.reach }, rec.thingId).action = rec.action;
      const ex = plan.objectScheduleContract.accessibleRouteSigns.bodyHalfExtents;
      if (Math.abs(Math.sin(yaw)) > .7) solid(x - ex[1], x + ex[1], z - ex[0], z + ex[0]);
      else solid(x - ex[0], x + ex[0], z - ex[1], z + ex[1]);
      counts.furniture++;
    }

    // Planting schedules are exhaustive; each record keeps its stable ID on the trunk/first prop.
    for (const rec of plan.planting.perimeterTrees)
      tree(rec.at[0], rec.at[1], rec.height, rec.id);
    for (const rec of plan.planting.districtTrees)
      tree(rec.at[0], rec.at[1], rec.height, rec.id);
    for (const rec of plan.planting.wetlandWillows)
      tree(rec.at[0], rec.at[1], rec.height, rec.id, 'willow');
    for (const rec of plan.planting.highlandPines)
      tree(rec.at[0], rec.at[1], rec.height, rec.id, 'pine');
    for (const rec of plan.planting.hedgeRuns) {
      const a = rec.from, b = rec.to, dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz), x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
      const p = Math.abs(dx) >= Math.abs(dz) ?
        box(x, rec.height / 2, z, len, rec.height, .42, P.leaf,
          { mode: 15, gloss: .05 }) :
        box(x, rec.height / 2, z, .42, rec.height, len, P.leaf,
          { mode: 15, gloss: .05 });
      mark(p, rec.id); counts.planting++;
    }

    const districtColors = {
      red: P.red, blue: P.blue, purple: P.purple, green: P.green,
      teal: P.teal, orange: P.orange, yellow: P.yellow, charcoal: P.charcoal,
    };
    plan.wayfinding.groundMedallions.forEach(rec => {
      const [x, z] = rec.at;
      mark(cyl(x, .028, z, .58, .056, districtColors[rec.color] || P.gold,
        { gloss: .18 }), rec.id);
      cyl(x, .054, z, .31, .024, P.cream, { gloss: .14 });
      const lines=rec.label.split('/').map(q=>q.trim());
      lines.forEach((line,li)=>{
        const chars=[...Glyphs.need(line)],size=Math.min(.13,.54/Math.max(1,chars.length)),
          step=size+.012,span=chars.length*step-.012;
        chars.forEach((ch,i)=>{
          const q={mesh:'quad',m:M.trs(x-span/2+step*(i+.5),.071,
            z+(li-(lines.length-1)/2)*.15,0,size,1,size),color:P.charcoal,ch,
            glyphPrimary:Glyphs.isHan(ch),mode:1,gloss:.10,zooLodMax:28};
          props.push(q);
        });
      });
    });
    const armDistrict=Object.freeze({
      '西部湿地':'D1','西部山地':'D2','湖区':'D4','亲子园':'D4','东部草原':'D5',
      '热带馆':'D6','南门':'D0','动物医院':'D7','小熊猫':'D3','西门':'D2',
      '保育中心':'D3','金丝猴':'D3','狮子':'D5','北环路':'D7',
    });
    plan.wayfinding.fingerposts.forEach(rec => {
      const [x, z] = rec.at;
      mark(cyl(x, 1.28, z, .075, 2.56, P.steelD,
        { gloss: .52, ...MAT.steel }), rec.id);
      rec.arms.forEach((label, i) => {
        const yaw = i === 0 ? Math.PI / 2 : i === 1 ? -Math.PI / 2 : Math.PI;
        const y = 2.12 - i * .36, nx = Math.sin(yaw), nz = Math.cos(yaw);
        const district=armDistrict[label],armColor= district ?
          districtColors[plan.wayfinding.districtColors[district]] : P.tile;
        box(x + nx * .44, y, z + nz * .44, 1.24, .28, .08, armColor,
          { hard: true, gloss: .16, ry: yaw });
        glyphs(x + nx * .486, y, z + nz * .486, yaw, label,
          { size: .105, gap: .012, color: P.cream, mode: 1 });
      });
      // Fingerposts are deliberately visual-only: several exact visitor loops begin at these
      // junction coordinates, and the blueprint gives them no body-collision contract.
    });

    // A world-space mover on the exact service-patrol polyline. All parts are marked dynamic so
    // Build.finish keeps their cull centres fresh without invalidating static district batches.
    const cartRoute = plan.routes.serviceCart.waypoints;
    const cartParts = [];
    function cartPart(u, y, v, sx, sy, sz, color, o = {}) {
      const x = cartRoute[0][0] + u, z = cartRoute[0][1] + v;
      const p = box(x, y, z, sx, sy, sz, color,
        { hard: true, dynamic: true, gloss: o.gloss || .28, ...o });
      const partIndex = cartParts.length;
      p.blueprintId = partIndex === 0 ? plan.routes.serviceCart.id :
        `${plan.routes.serviceCart.id}/G${String(partIndex).padStart(2, '0')}`;
      cartParts.push({ p, u, y, v, sx, sy, sz, o });
      return p;
    }
    cartPart(0, .48, 0, 1.15, .52, 1.80, P.service, { ...MAT.steel });
    cartPart(0, .91, .25, 1.02, .42, .94, P.tile, { ...MAT.steel });
    cartPart(0, .78, -.49, .98, .18, .60, P.cream, { gloss: .20 });
    for (const u of [-.50, .50]) for (const v of [-.58, .58])
      cartPart(u, .22, v, .18, .36, .18, P.black, { gloss: .42 });
    const routeLengths = [], routeCumulative = [0];
    for (let i = 1; i < cartRoute.length; i++) {
      const d = Math.hypot(cartRoute[i][0] - cartRoute[i - 1][0],
        cartRoute[i][1] - cartRoute[i - 1][1]);
      routeLengths.push(d); routeCumulative.push(routeCumulative[i - 1] + d);
    }
    const routeTotal = routeCumulative[routeCumulative.length - 1];

    // Five render chunks are named by the canonical performance contract. Construction remains
    // one lazy Zoo build, but only nearby chunk members enter the draw passes; fine-detail LOD is
    // evaluated in the same refresh. This is renderer state only and never changes interactions.
    const chunkNames = plan.performanceBudgets.districtChunking.slice();
    const chunkBounds = Object.freeze({
      core:{x0:-22,x1:22,z0:-16,z1:18}, west:{x0:-58,x1:-18,z0:-16,z1:54},
      central:{x0:-22,x1:22,z0:16,z1:55}, east:{x0:18,x1:58,z0:-16,z1:54},
      'north-buildings':{x0:-58,x1:58,z0:52,z1:70},
    });
    if (chunkNames.some(name => !chunkBounds[name]))
      throw new Error('ZooExpansion: unknown canonical render chunk');
    const chunkFor = (x, z) => z >= 52 ? 'north-buildings' :
      (z < 18 && x >= -22 && x <= 22) ? 'core' : x < -18 ? 'west' :
        x > 18 ? 'east' : 'central';
    const managedRenderProps = props;
    for (const p of managedRenderProps) {
      const x = p.m[12], z = p.m[14];
      p.renderChunk = chunkFor(x, z);
      if (p.ch && p.zooLodMax === undefined) p.zooLodMax = 28;
      const sx=Math.hypot(p.m[0],p.m[1],p.m[2]);
      const sy=Math.hypot(p.m[4],p.m[5],p.m[6]);
      const sz=Math.hypot(p.m[8],p.m[9],p.m[10]);
      p._zooRenderR=.5*Math.hypot(sx,sy,sz);
    }
    const renderCap = plan.performanceBudgets.outdoorVisiblePropsAtOneTime;
    let renderFocusX=NaN,renderFocusZ=NaN,activeRenderCount=props.length;
    let activeChunkNames=[];
    const pointRectDistance2 = (q,x,z) => {
      const dx=x<q.x0?q.x0-x:x>q.x1?x-q.x1:0;
      const dz=z<q.z0?q.z0-z:z>q.z1?z-q.z1:0;
      return dx*dx+dz*dz;
    };
    function refreshRenderChunks(x,z,force=false) {
      if(!force&&(x-renderFocusX)**2+(z-renderFocusZ)**2<9)return;
      renderFocusX=x;renderFocusZ=z;
      activeChunkNames=chunkNames.map((name,i)=>({name,i,d:pointRectDistance2(chunkBounds[name],x,z)}))
        .sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,3).map(q=>q.name);
      const active=new Set(activeChunkNames),visible=[];
      for(const p of managedRenderProps) {
        if(p.dynamic){p.renderHidden=false;visible.push({p,score:-1e9});continue;}
        const dx=p.m[12]-x,dz=p.m[14]-z,d=Math.max(0,Math.hypot(dx,dz)-p._zooRenderR);
        let hidden=(p.zooLodMax!==undefined&&d>p.zooLodMax)||
          (p.zooLodMin!==undefined&&d<p.zooLodMin);
        if(!hidden&&!active.has(p.renderChunk)&&d>44)hidden=true;
        p.renderHidden=hidden;
        if(!hidden){
          const structural=p.blueprintId&&/^(?:SITE-GROUND|D\d\/GROUND|P\d|W\d|HW-|BW-)/.test(p.blueprintId);
          visible.push({p,score:d-(structural?24:0)-(p.tag?5:0)-p._zooRenderR*.35});
        }
      }
      const allowance=renderCap;
      if(visible.length>allowance){
        visible.sort((a,b)=>a.score-b.score);
        for(let i=allowance;i<visible.length;i++)visible[i].p.renderHidden=true;
      }
      activeRenderCount=Math.min(allowance,visible.length);
    }

    // Camera blockers retain their canonical individual runs (and therefore every identical gate
    // cut) but only the current/adjacent runs stay in the hot scene list. Camera collision is a
    // local query around the player; carrying blockers on the opposite side of a 116 m site costs
    // the performance budget without affecting the result. Never merge these rectangles: a merge
    // would seal authored openings.
    const canonicalBlockers = blockers.slice();
    const coreBlockers = canonicalBlockers.slice(0, blockerBaseCount);
    const expansionBlockers = canonicalBlockers.slice(blockerBaseCount);
    const blockerCap = plan.performanceBudgets.cameraBlockers;
    const canonicalSolids = solids.slice();
    const coreSolids = canonicalSolids.slice(0, solidBaseCount);
    const expansionSolids = canonicalSolids.slice(solidBaseCount);
    const solidCap = plan.performanceBudgets.bodySolids;
    const canonicalLights = lights.slice();
    const coreLights = canonicalLights.slice(0, lightBaseCount);
    const lightCap = plan.performanceBudgets.pointLightsOnAtOnce;
    let nightAmount = 0;
    let collisionFocusX = NaN, collisionFocusZ = NaN;
    let activeBlockerCount = canonicalBlockers.length, activeSolidCount = canonicalSolids.length;
    const rectDistance2 = (q, x, z) => {
      const dx = x < q.x0 ? q.x0 - x : x > q.x1 ? x - q.x1 : 0;
      const dz = z < q.z0 ? q.z0 - z : z > q.z1 ? z - q.z1 : 0;
      return dx * dx + dz * dz;
    };
    const nearest = (list, capacity, x, z) => list
      .map((q, i) => ({ q, i, d: rectDistance2(q, x, z) }))
      .sort((a, b) => a.d - b.d || a.i - b.i).slice(0, capacity).map(v => v.q);
    function refreshLights(x, z) {
      const candidates = nightAmount > .08 ? canonicalLights : coreLights;
      const active = new Set(candidates.map((q, i) =>
        ({ q, i, d:(q.x - x) ** 2 + (q.z - z) ** 2 }))
        .sort((a, b) => a.d - b.d || a.i - b.i).slice(0, lightCap).map(v => v.q));
      for (const q of canonicalLights) q.on = active.has(q);
    }
    function refreshCollision(x, z, force = false) {
      refreshRenderChunks(x,z,force);
      if (!force && (x - collisionFocusX) ** 2 + (z - collisionFocusZ) ** 2 < 9) return;
      collisionFocusX = x; collisionFocusZ = z;
      const blockerCapacity = Math.max(0, blockerCap - coreBlockers.length);
      blockers.splice(0, blockers.length, ...coreBlockers,
        ...nearest(expansionBlockers, blockerCapacity, x, z));
      activeBlockerCount = blockers.length;
      const solidCapacity = Math.max(0, solidCap - coreSolids.length);
      solids.splice(0, solids.length, ...coreSolids,
        ...nearest(expansionSolids, solidCapacity, x, z));
      activeSolidCount = solids.length;
      refreshLights(x, z);
    }
    refreshCollision(plan.site.mainSpawn.at[0], plan.site.mainSpawn.at[1], true);

    function tick(t, player) {
      let d = (Math.max(0, t) * 1.35) % routeTotal, si = 0;
      while (si < routeLengths.length - 1 && d > routeCumulative[si + 1]) si++;
      const a = cartRoute[si], b = cartRoute[si + 1];
      const u = clamp01((d - routeCumulative[si]) / routeLengths[si]);
      const x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
      const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      for (const q of cartParts) {
        const px = x + c * q.u + s * q.v, pz = z - s * q.u + c * q.v;
        q.p.m = transform(px, q.y, pz, q.sx, q.sy, q.sz, { ...q.o, ry: yaw });
        q.p.cx = px; q.p.cy = q.y; q.p.cz = pz;
        if (q.p.ob) { q.p.ob.x = px; q.p.ob.y = q.y; q.p.ob.z = pz; q.p.ob.ry = yaw; }
      }
      const game = typeof window !== 'undefined' && window.__game;
      const livePlayer = player || (game && game.P);
      if (livePlayer) refreshCollision(livePlayer.x, livePlayer.z);
    }

    function setNight(k) {
      const soft = clamp01(k) ** 2 * (3 - 2 * clamp01(k));
      nightAmount = soft;
      refreshLights(Number.isFinite(collisionFocusX) ? collisionFocusX :
        plan.site.mainSpawn.at[0], Number.isFinite(collisionFocusZ) ? collisionFocusZ :
        plan.site.mainSpawn.at[1]);
      for (const q of nightGlows) {
        q.bulb.glow = soft * .72;
        q.pool.a = soft * .22;
      }
    }

    let accessibleVisible = false;
    function toggleAccessibleRoute() {
      accessibleVisible = !accessibleVisible;
      for (const p of accessibleOverlay) {
        p.alpha = accessibleVisible ? .82 : 0;
        p.glow = accessibleVisible ? .18 : 0;
      }
      return accessibleVisible;
    }

    const pavilion = buildings.get('B04-lake-pavilion');
    const pavilionRect = fpRect(pavilion.footprint);
    const pavilionApron = pavilion.entranceApron.rect;
    const pavilionRise = pavilion.entranceApron.y0;
    const pavilionRun = pavilionRise * 20;
    const pavilionMidZ = (pavilionApron[2] + pavilionApron[3]) / 2;
    const pavilionRamp = [pavilionApron[1] - .5, pavilionApron[1] + 2,
      pavilionMidZ - pavilionRun, pavilionMidZ + pavilionRun];
    const pavilionLanding = [pavilionRamp[0],pavilionRamp[1],pavilionApron[2],pavilionApron[3]];
    function liftAt(x, z, currentLift = 0) {
      const inside = r => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
      if(conservationLifts.some(inside))return conservationBridge.y0;
      // The same x/z rectangle is also P104's underpass. Only someone who arrived at bridge
      // height through a lift stays on the gallery; a ground-level walker keeps all 4.10 m clear.
      if(inside(conservationBridgeRect))
        return currentLift>conservationBridge.y0/2?conservationBridge.y0:0;
      if (inside(pavilionRect) || inside(pavilionApron) || inside(pavilionLanding))
        return pavilionRise;
      if (inside(pavilionRamp))
        return pavilionRise * Math.max(0, 1 - Math.abs(z - pavilionMidZ) / pavilionRun);
      return 0;
    }

    const publicZones = [
      { id: 'zoo-expanded-main', x0: -52, x1: 52, z0: -15.4, z1: 67,
        light: [-12, 3.6, -10] },
      // Overlap the main zone by more than the player's .60 m diameter.  clampMove only hands
      // control to a neighbouring zone once the actor body can fit inside both, so a narrower
      // overlap makes the otherwise-continuous P117 approach behave like an invisible wall.
      { id: 'zoo-west-public-gate', x0: -58.2, x1: -50.8, z0: 22, z1: 26,
        light: [-55.2, 3.6, 24] },
    ];
    const pens = Object.freeze(Object.fromEntries(plan.habitats.map(h => [h.id,
      Object.freeze({ ...h.bounds, face: h.publicSide, species: Object.freeze(h.species.slice()),
        animalSlots: Object.freeze(h.animalSlots.map(s => Object.freeze({ ...s }))) })])));

    return Object.freeze({
      plan, schema: SCHEMA, revision: REVISION, geometryHash: GEOMETRY_HASH,
      RX: 58, RZ: 70, OUT: 2.8, PENS: pens, zones: Object.freeze(publicZones),
      tick, setNight, liftAt, counts,
      canonicalBlockers: Object.freeze(canonicalBlockers.slice()),
      blockerBudget: Object.freeze({ cap: blockerCap, canonical: canonicalBlockers.length,
        active: () => activeBlockerCount }),
      canonicalSolids: Object.freeze(canonicalSolids.slice()),
      solidBudget: Object.freeze({ cap: solidCap, canonical: canonicalSolids.length,
        active: () => activeSolidCount }),
      lightBudget: Object.freeze({ cap: lightCap, canonical: canonicalLights.length,
        active: () => canonicalLights.filter(q => q.on !== false).length }),
      renderChunks:Object.freeze({names:Object.freeze(chunkNames),cap:renderCap,
        managed:managedRenderProps.length,active:()=>activeRenderCount,
        current:()=>activeChunkNames.slice()}),
      accessibleRoute:Object.freeze(accessibleRouteSegments.map(q=>Object.freeze({
        a:Object.freeze(q.a),b:Object.freeze(q.b),owner:q.owner}))),
      refreshCollision, refreshRenderChunks, toggleAccessibleRoute,
      spawn: { x: plan.site.mainSpawn.at[0], z: plan.site.mainSpawn.at[1],
        yaw: plan.site.mainSpawn.yaw },
      secondarySpawn: { x: plan.site.secondarySpawn.at[0], z: plan.site.secondarySpawn.at[1],
        yaw: plan.site.secondarySpawn.yaw },
      tropicalReturn: { x: plan.site.tropicalReturn.at[0], z: plan.site.tropicalReturn.at[1],
        yaw: plan.site.tropicalReturn.yaw },
      districtAt(x, z) {
        return plan.districts.find(d => x >= d.bounds.x0 && x <= d.bounds.x1 &&
          z >= d.bounds.z0 && z <= d.bounds.z1) || null;
      },
    });
  }

  const FALLBACK_SPECIES_PROFILE = Object.freeze({
    '水獭':'otter', '河马':'hippo', '火烈鸟':'flamingo', '丹顶鹤':'crane', '羚牛':'takin',
    '雪豹':'snowLeopard', '小熊猫':'redPanda', '天鹅':'swan', '鸳鸯':'mandarinDuck',
    '山羊':'goat', '兔子':'rabbit', '金丝猴':'goldenMonkey', '亚洲象':'elephant',
    '斑马':'zebra', '羚羊':'antelope', '长颈鹿':'giraffe', '犀牛':'rhino', '狮子':'lion',
  });

  function npcRows(input) {
    const plan = validatePlan(input);
    const profiles = typeof ZooAnimals !== 'undefined' ?
      ZooAnimals.speciesProfile : FALLBACK_SPECIES_PROFILE;
    const rows = [];
    const slotSpecies = Object.freeze({
      goat:'山羊', rabbit:'兔子', swan:'天鹅', duck:'鸳鸯', zebra:'斑马',
      antelope:'羚羊', giraffe:'长颈鹿',
    });
    for (const h of plan.habitats) {
      const b = h.bounds;
      h.animalSlots.forEach((slot, i) => {
        const stem = Object.keys(slotSpecies).find(k => slot.id.startsWith(k));
        const species = stem && h.species.includes(slotSpecies[stem]) ? slotSpecies[stem] :
          h.species[i % h.species.length];
        const x = b.x0 + (b.x1 - b.x0) * slot.uv[0];
        const z = b.z0 + (b.z1 - b.z0) * slot.uv[1];
        rows.push({
          hz: species, npcId: `zoo-${h.id}-${slot.id}`, place: 'zoo',
          animal: profiles[species], habitat: h.id, animalSlot: slot.id,
          temper: i % 3 === 0 ? 'genial' : i % 3 === 1 ? 'shy' : 'steady',
          speed: /swim/.test(slot.act) ? .28 : .38, hours: [7, 20],
          look: { scale: .90 + (i % 3) * .06 },
          spots: [{ h0: 7, h1: 20, at: [x, z], face: (i * 2.17) % (Math.PI * 2), act: slot.act }],
        });
      });
    }

    const keeperLooks = [
      { skin:'#c9955f', hair:'#332c28', hairStyle:'bun', top:'#496747', pants:'#34453a',
        shoe:'#39362f', sleeve:'long', collar:'shirt', hat:'cap', hatColor:'#31533b',
        badge:'#e0ca89', bag:'tote', bagColor:'#6a5b45', faceSeed:341 },
      { skin:'#b98258', hair:'#24201d', hairStyle:'short', top:'#536c4e', pants:'#334039',
        shoe:'#353a32', sleeve:'long', collar:'polo', hat:'cap', hatColor:'#425a3e',
        badge:'#e1d29b', faceSeed:342 },
      { skin:'#d0a075', hair:'#29221f', hairStyle:'crop', top:'#3f624a', pants:'#303f38',
        shoe:'#343832', sleeve:'short', collar:'polo', vest:'#75845b',
        badge:'#e3ce8d', faceSeed:343 },
    ];
    plan.routes.keeperRoutes.forEach((route, ri) => {
      const first = route.waypoints[0], next = route.waypoints[1] || first;
      rows.push({
        hz: '饲养员', name: ['周师傅', '吴师傅', '赵师傅'][ri],
        py: ['Zhōu shīfu', 'Wú shīfu', 'Zhào shīfu'][ri],
        npcId: `zoo-${route.id}`, place: 'zoo', routeId: route.id,
        hours: [7, 19], temper: ri === 1 ? 'genial' : 'steady', serviceRoute: true,
        look: keeperLooks[ri],
        // Patrol legs advance only after physical arrival. Time-windowed spots skipped long legs
        // whenever an activity compressed game time, making keepers chord through habitats.
        patrol: route.waypoints.map(at => at.slice()),
        spots: [{ h0:7,h1:19,at:first.slice(),
          face:Math.atan2(next[0]-first[0],next[1]-first[1]),act:'walk' }],
        lines: [
          ['请走游客通道，工作门不能进。', 'Please keep to the visitor paths; staff gates are restricted.'],
          ['动物的饮食和活动每天都要记录。', 'We record every animal’s food and activity each day.'],
          ['下午巡一遍围栏，晚上再检查门锁。', 'We inspect every barrier in the afternoon and every lock at night.'],
        ],
      });
    });

    const visitorLooks = [
      { skin:'#d1a17b', hair:'#332824', hairStyle:'short', top:'#7086a1', pants:'#3d4652',
        shoe:'#33383d', bag:'pack', packColor:'#806246', faceSeed:351 },
      { skin:'#c68e64', hair:'#241f1d', hairStyle:'pony', top:'#b86f63', pants:'#414653',
        shoe:'#3b3d42', bag:'tote', bagColor:'#d1b270', faceSeed:352 },
      { skin:'#d9ab83', hair:'#4b372e', hairStyle:'bob', top:'#638a72', pants:'#4a4c4f',
        shoe:'#383b40', hat:'cap', hatColor:'#e1c16b', faceSeed:353 },
    ];
    plan.routes.visitorLoops.forEach((route, ri) => {
      const h0 = 9 + ri, span = 8, first = route.waypoints[0], next = route.waypoints[1] || first;
      rows.push({
        hz: '游客', name: ['小林', '阿芳', '乐乐妈妈'][ri],
        py: ['Xiǎo Lín', 'Ā Fāng', 'Lèlè māma'][ri], npcId: `zoo-${route.id}`,
        place: 'zoo', routeId: route.id, hours: [h0, h0 + span], speed: .80,
        temper: ri === 2 ? 'genial' : 'steady', look: visitorLooks[ri],
        patrol: route.waypoints.map(at => at.slice()),
        spots: [{ h0,h1:h0+span,at:first.slice(),
          face:Math.atan2(next[0]-first[0],next[1]-first[1]),act:'walk' }],
        lines: [
          ['这个园区比以前大多了。', 'The zoo is much larger than it used to be.'],
          ['导游图上每个颜色是一个园区。', 'Each map colour marks a different district.'],
          ['先看动物，再去湖边坐一会儿。', 'Animals first, then a rest beside the lake.'],
        ],
      });
      if (route.id === 'R-VIS-FAMILY') {
        const patrol = route.waypoints.map(at => [at[0] + .50, at[1]]);
        const a=patrol[0],b=patrol[1]||a;
        rows.push({
          hz:'小孩',name:'乐乐',py:'Lèlè',npcId:'zoo-R-VIS-FAMILY-child',place:'zoo',
          routeId:'R-VIS-FAMILY-child',pairedRoute:route.id,pairedWith:'zoo-R-VIS-FAMILY',
          hours:[h0,h0+span],speed:.80,temper:'genial',
          look:{skin:'#d9ab83',hair:'#3a2b25',hairStyle:'short',top:'#e0a93c',pants:'#4d6f8c',
            shoe:'#e7e0d2',pack:true,packColor:'#c65d4c',tall:.70,wide:.82,youth:1,
            headScale:1.10,faceSeed:354},
          patrol,spots:[{h0,h1:h0+span,at:a.slice(),
            face:Math.atan2(b[0]-a[0],b[1]-a[1]),act:'walk'}],
          lines:[
            ['妈妈，我想先看兔子！','Mum, I want to see the rabbits first!'],
            ['蓝色的线是无障碍路线。','The blue line is the accessible route.'],
            ['湖里有天鹅和鸳鸯。','There are swans and mandarin ducks on the lake.'],
          ],
        });
      }
    });
    return rows;
  }

  const PINYIN = Object.freeze({
    '水獭':'shuǐtǎ', '河马':'hémǎ', '火烈鸟':'huǒlièniǎo', '丹顶鹤':'dāndǐnghè',
    '羚牛':'língniú', '雪豹':'xuěbào', '小熊猫':'xiǎoxióngmāo', '天鹅':'tiān’é',
    '鸳鸯':'yuānyang', '山羊':'shānyáng', '兔子':'tùzi', '金丝猴':'jīnsīhóu',
    '亚洲象':'Yàzhōuxiàng', '斑马':'bānmǎ', '羚羊':'língyáng', '长颈鹿':'chángjǐnglù',
    '犀牛':'xīniú', '狮子':'shīzi', '扬子鳄':'Yángzǐ’è', '中华鲟':'Zhōnghuáxún',
    '蛇':'shé', '蜥蜴':'xīyì', '蝴蝶':'húdié', '果蝠':'guǒfú',
  });
  const ENGLISH = Object.freeze({
    '水獭':'otters', '河马':'hippos', '火烈鸟':'flamingos', '丹顶鹤':'red-crowned cranes',
    '羚牛':'takin', '雪豹':'snow leopards', '小熊猫':'red pandas', '天鹅':'swans',
    '鸳鸯':'mandarin ducks', '山羊':'goats', '兔子':'rabbits', '金丝猴':'golden monkeys',
    '亚洲象':'Asian elephants', '斑马':'zebras', '羚羊':'antelopes', '长颈鹿':'giraffes',
    '犀牛':'rhinos', '狮子':'lions', '扬子鳄':'Chinese alligators', '中华鲟':'Chinese sturgeon',
    '蛇':'snakes', '蜥蜴':'lizards', '蝴蝶':'butterflies', '果蝠':'fruit bats',
  });

  function watchAction(hz, i = 0) {
    const en = ENGLISH[hz] || hz;
    return {
      zh: `看${hz}`, py: `kàn ${PINYIN[hz] || hz}`, en: `watch the ${en}`,
      secs: 3.0 + (i % 4) * .28, mins: 12 + (i % 5) * 4,
      gain: { mood: 14 + (i % 4) * 3, rest: i % 3 === 0 ? 3 : 0 },
      pose: { type: 'stand' }, done: `看了一会儿${hz}。`, doneTr: `Spent a while watching the ${en}.`,
    };
  }

  function useRows(input, placeKey = 'zoo') {
    const plan = validatePlan(input);
    if (placeKey === 'zoo_tropical') {
      const tropical = plan.buildings.find(b => b.id === 'B08-tropical-house').scene;
      const out = {};
      tropical.speciesThings.forEach((rec, i) => { out[rec.hz] = watchAction(rec.hz, i); });
      out['出口'] = { zh:'离开热带馆', py:'líkāi rèdài guǎn', en:'leave the Tropical House',
        secs:1.8, mins:1, gain:{}, pose:{type:'stand'}, go:'zoo',
        at:{ x:plan.site.tropicalReturn.at[0], z:plan.site.tropicalReturn.at[1],
          yaw:plan.site.tropicalReturn.yaw } };
      out['导游图'] = { zh:'看导游图', py:'kàn dǎoyóutú', en:'read the Tropical House map',
        secs:2.2, mins:4, gain:{mood:4}, pose:{type:'stand'} };
      out['长椅'] = { zh:'坐下', py:'zuòxia', en:'sit on the bench', secs:2.4, mins:12,
        gain:{rest:12,mood:7}, pose:{type:'sit',seatY:.48} };
      out['服务台'] = { zh:'领取导览', py:'lǐngqǔ dǎolǎn', en:'pick up a guide',
        secs:2.0, mins:3, gain:{mood:4}, pose:{type:'stand'},
        done:'领了一份热带馆导览。', doneTr:'Picked up a Tropical House guide.' };
      out['垃圾桶'] = { zh:'扔垃圾', py:'rēng lājī', en:'use the rubbish bin',
        secs:1.6, mins:2, gain:{mood:2}, pose:{type:'stand'},
        done:'把垃圾扔进了垃圾桶。', doneTr:'Put the rubbish in the bin.' };
      return out;
    }
    if (placeKey !== 'zoo') return {};

    const out = {};
    plan.interactions.habitatThings.forEach((rec, i) => {
      if (!out[rec.hz]) out[rec.hz] = watchAction(rec.hz, i);
    });
    Object.assign(out, {
      '热带馆': { zh:'进入热带馆', py:'jìnrù rèdài guǎn', en:'enter the Tropical House',
        secs:2.2, mins:2, gain:{mood:4}, pose:{type:'stand'}, go:'zoo_tropical' },
      '饮水处': { zh:'喝水', py:'hē shuǐ', en:'drink some water', secs:2.0, mins:4,
        gain:{rest:8,food:3}, pose:{type:'stand'}, done:'喝了点水，舒服多了。',
        doneTr:'A drink of water feels much better.' },
      '医务室': { zh:'去医务室', py:'qù yīwùshì', en:'visit first aid', secs:2.6, mins:12,
        gain:{rest:10,mood:4}, pose:{type:'stand'}, done:'简单处理了一下。',
        doneTr:'The first-aid staff dealt with it.' },
      '无障碍路线': { zh:'查看无障碍路线', py:'chákàn wúzhàng’ài lùxiàn',
        en:'check the accessible route', secs:2.1, mins:4, gain:{mood:4}, pose:{type:'stand'},
        accessibleRoute:true,
        done:'路线避开了台阶和工作通道。', doneTr:'The route avoids steps and service paths.' },
      '西门': { zh:'看看西门', py:'kànkan xīmén', en:'look at the west gate', secs:1.8,
        mins:2, gain:{mood:2}, pose:{type:'stand'} },
      '保育中心': { zh:'参观保育中心', py:'cānguān bǎoyù zhōngxīn',
        en:'visit the conservation centre', secs:3.2, mins:24, gain:{mood:16},
        pose:{type:'stand'} },
      '动物医院': { zh:'看看动物医院', py:'kànkan dòngwù yīyuàn',
        en:'look into the animal hospital', secs:2.4, mins:8, gain:{mood:8},
        pose:{type:'stand'} },
      '游客': { zh:'说话', py:'shuōhuà', en:'talk to the visitor', secs:2.6, mins:5,
        gain:{mood:6}, pose:{type:'talk'}, talk:true },
    });
    return out;
  }

  return Object.freeze({
    SCHEMA, REVISION, GEOMETRY_HASH, validatePlan, build, npcRows, useRows,
  });
})();
