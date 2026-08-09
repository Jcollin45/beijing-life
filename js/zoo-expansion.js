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
      glow, light, thing, transform,
    } = B;

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
    const nightLights = [], nightGlows = [], movers = [];
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
      if (Math.abs(dx) <= EPS)
        p = flat(x, .010, z, width, len, color, opt);
      else if (Math.abs(dz) <= EPS)
        p = flat(x, .010, z, len, width, color, opt);
      else
        p = flat(x, .010, z, len, width, color,
          { ...opt, ry: -Math.atan2(dz, dx) });
      return mark(p, id);
    }

    function tree(x, z, h, id, kind = 'broadleaf') {
      const trunk = mark(cyl(x, h * .27, z, .13 + h * .012, h * .54, P.timberD,
        { gloss: .16, ...MAT.timber }), id);
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
      for (let i = 1; i < p.centerline.length; i++)
        pathSegment(p.centerline[i - 1], p.centerline[i], p.width, color, opt,
          i === 1 ? p.id : `${p.id}/G${String(i).padStart(2, '0')}`);
      counts.paths++;
    }
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
      mark(first, segmentIndex ? `${id}/G${String(segmentIndex).padStart(2, '0')}` : id);
      solid(...rect);
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
      mark(p, id); solid(...rect);
    }

    function buildHabitatObject(h, o, i) {
      const id = `${h.id}/O${String(i + 1).padStart(2, '0')}`;
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
      const [x, y, z] = rec.position;
      const dx = rec.focus[0] - x, dz = rec.focus[1] - z;
      const yaw = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) :
        (dz > 0 ? 0 : Math.PI);
      const p = mark(box(x, y, z, 1.55, .92, .12, P.charcoal,
        { tag: rec.hz, hard: true, gloss: .10, ry: yaw }), rec.id);
      box(x, y + .35, z, 1.64, .10, .16, P.tileL,
        { tag: rec.hz, hard: true, gloss: .18, ry: yaw });
      glyphs(x + Math.sin(yaw) * .067, y + .08, z + Math.cos(yaw) * .067,
        yaw, rec.hz, { size: .20, gap: .04, color: P.cream, mode: 1, tag: rec.hz });
      localThing(rec.hz, rec.position,
        `这里是${rec.hz}的生活区。`, `This is the ${rec.hz} habitat.`,
        `The interpretation board and viewing position are compiled from ${rec.habitat}.`,
        { tag: rec.hz, focus: rec.focus, reach: rec.reach }, rec.id);
      return p;
    }
    plan.interactions.habitatThings.forEach(interpretationBoard);
