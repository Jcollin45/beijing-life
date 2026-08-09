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

    function buildingDoorCuts(b, side) {
      const f = b.footprint;
      const doors = [...(b.publicDoors || []), ...(b.serviceDoors || [])];
      const edge = f[side];
      return doors.filter(d => {
        const v = side[0] === 'x' ? d.at[0] : d.at[1];
        return Math.abs(v - edge) < .02;
      }).map(d => {
        const v = side[0] === 'x' ? d.at[1] : d.at[0];
        return [v - d.width / 2, v + d.width / 2];
      });
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
        mark(box(x, b.height + .12, z, w + .40, .24, d + .40, P.tile,
          { hard: true, gloss: .16, ...MAT.roof }), `${b.id}/ROOF`);
        box(x, b.height + .32, z, Math.max(.5, w - 1.0), .20,
          Math.max(.5, d - 1.0), P.tileL, { hard: true, gloss: .16, ...MAT.roof });
      }
      buildingRoomFloors(b); counts.buildings++;
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
      mark(box(x, .50, z, w, .16, d, P.timber,
        { hard: true, gloss: .14, ...MAT.timber }), b.id);
      for (const xx of [r[0] + .22, r[1] - .22])
        for (const zz of [r[2] + .22, r[3] - .22]) {
          box(xx, 2.35, zz, .20, 3.70, .20, P.timberD,
            { hard: true, gloss: .15, ...MAT.timber });
          solid(xx - .12, xx + .12, zz - .12, zz + .12);
        }
      box(x, b.height, z, w + .65, .20, d + .65, P.tile,
        { hard: true, gloss: .17, ...MAT.roof });
      taper(x, b.height + .36, z, Math.max(.8, w - .45), .70,
        Math.max(.8, d - .45), P.tileL, { gloss: .17, ...MAT.roof });
      const apron = b.entranceApron.rect;
      rectFlat(apron, b.entranceApron.y0, P.timber,
        { mode: 6, gloss: .13, ...MAT.timber }, `${b.id}/APRON`);
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
      mark(box(x, b.y0 + b.height / 2, z, w, b.height, d, P.glass,
        { hard: true, mode: 1, alpha: .30, gloss: .92 }), b.id);
      for (const xx of [r[0], r[1]])
        box(xx, b.y0 + b.height / 2, z, .14, b.height, d, P.steelD,
          { hard: true, gloss: .50, ...MAT.steel });
      for (let zz = r[2]; zz <= r[3] + EPS; zz += 1.5)
        box(x, b.y0 + b.height / 2, zz, w, .11, .11, P.steelD,
          { hard: true, gloss: .50, ...MAT.steel });
      counts.buildings++;
    }

    function buildB07(b) {
      // Exact explicit perimeter runs supersede the generic building-wall rule for this compound.
      b.perimeterFence.runs.forEach(run => buildRun({ ...run,
        height: b.perimeterFence.height, thickness: b.perimeterFence.thickness,
        bodySolid: true, cameraBlockerTop: b.perimeterFence.cameraBlockerTop }, 'fence'));
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
        mark(box(x, h / 2, z, w, h, d, r.id === 'animal-hospital' ? P.render : P.brickD,
          { hard: true, gloss: .08, ...MAT.brick }), r.id);
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
      let yaw = 0;
      if (rec.id === 'TH-west-gate') yaw = Math.PI / 2;
      else if (rec.id === 'TH-tropical') yaw = -Math.PI / 2;
      const th = signBoard(rec.position[0], rec.position[1], rec.position[2], yaw,
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
      const [bx, bz] = atLocal(0, .25);
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
      localThing(tag, [x, .80, z], '在长椅上歇一会儿。', 'Rest on the bench for a while.',
        `This is the local interaction for ${rec.id}.`,
        { tag, focus: rec.focus, reach: plan.objectScheduleContract.benches.reach },
        `TH-${rec.id}`);
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
      nightLights.push({ lampLight, activeSlot: i < 7 });
      nightGlows.push({ bulb, pool });
      const r = plan.objectScheduleContract.lamps.bodyRadius;
      solid(x - r, x + r, z - r, z + r); counts.furniture++;
    }

    function facingBoard(rec, color = P.blue) {
      const [x, z] = rec.at, yaw = rec.yaw || 0, tag = rec.tag;
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      mark(box(x, 1.34, z, 1.18, 1.55, .13, color,
        { tag, hard: true, gloss: .14, ry: yaw }), rec.id);
      for (const u of [-.42, .42]) {
        const px = x + Math.cos(yaw) * u, pz = z - Math.sin(yaw) * u;
        box(px, .53, pz, .07, 1.06, .07, P.steelD,
          { tag, hard: true, gloss: .48, ...MAT.steel });
      }
      glyphs(x + nx * .073, 1.50, z + nz * .073, yaw, tag,
        { size: .19, gap: .035, color: P.white, mode: 1, tag });
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
    });
    plan.wayfinding.fingerposts.forEach(rec => {
      const [x, z] = rec.at;
      mark(cyl(x, 1.28, z, .075, 2.56, P.steelD,
        { gloss: .52, ...MAT.steel }), rec.id);
      rec.arms.forEach((label, i) => {
        const yaw = i === 0 ? Math.PI / 2 : i === 1 ? -Math.PI / 2 : Math.PI;
        const y = 2.12 - i * .36, nx = Math.sin(yaw), nz = Math.cos(yaw);
        box(x + nx * .44, y, z + nz * .44, 1.24, .28, .08, P.tile,
          { hard: true, gloss: .16, ry: yaw });
        glyphs(x + nx * .486, y, z + nz * .486, yaw, label,
          { size: .105, gap: .012, color: P.cream, mode: 1 });
      });
      solid(x - .12, x + .12, z - .12, z + .12);
    });

    // A world-space mover on the exact service-patrol polyline. All parts are marked dynamic so
    // Build.finish keeps their cull centres fresh without invalidating static district batches.
    const cartRoute = plan.routes.serviceCart.waypoints;
    const cartParts = [];
    function cartPart(u, y, v, sx, sy, sz, color, o = {}) {
      const x = cartRoute[0][0] + u, z = cartRoute[0][1] + v;
      const p = box(x, y, z, sx, sy, sz, color,
        { hard: true, dynamic: true, gloss: o.gloss || .28, ...o });
      p.blueprintId = plan.routes.serviceCart.id;
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

    function tick(t) {
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
    }

    function setNight(k) {
      const soft = clamp01(k) ** 2 * (3 - 2 * clamp01(k));
      for (const q of nightLights) q.lampLight.on = q.activeSlot && soft > .08;
      for (const q of nightGlows) {
        q.bulb.glow = soft * .72;
        q.pool.a = soft * .22;
      }
    }

    const pavilion = buildings.get('B04-lake-pavilion');
    const pavilionRect = fpRect(pavilion.footprint);
    const pavilionApron = pavilion.entranceApron.rect;
    function liftAt(x, z) {
      const inside = r => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
      return inside(pavilionRect) || inside(pavilionApron) ? pavilion.entranceApron.y0 : 0;
    }

    const publicZones = [
      { id: 'zoo-expanded-main', x0: -52, x1: 52, z0: -15.4, z1: 67,
        light: [-12, 3.6, -10] },
      { id: 'zoo-west-public-gate', x0: -57.4, x1: -51.5, z0: 22, z1: 26,
        light: [-55.2, 3.6, 24] },
    ];
    const pens = Object.freeze(Object.fromEntries(plan.habitats.map(h => [h.id,
      Object.freeze({ ...h.bounds, face: h.publicSide, species: Object.freeze(h.species.slice()),
        animalSlots: Object.freeze(h.animalSlots.map(s => Object.freeze({ ...s }))) })])));

    return Object.freeze({
      plan, schema: SCHEMA, revision: REVISION, geometryHash: GEOMETRY_HASH,
      RX: 58, RZ: 70, OUT: 2.8, PENS: pens, zones: Object.freeze(publicZones),
      tick, setNight, liftAt, counts,
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
    for (const h of plan.habitats) {
      const b = h.bounds;
      h.animalSlots.forEach((slot, i) => {
        const species = h.species[i % h.species.length];
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
      const n = route.waypoints.length, step = 12 / n;
      rows.push({
        hz: '饲养员', name: ['周师傅', '吴师傅', '赵师傅'][ri],
        py: ['Zhōu shīfu', 'Wú shīfu', 'Zhào shīfu'][ri],
        npcId: `zoo-${route.id}`, place: 'zoo', routeId: route.id,
        hours: [7, 19], temper: ri === 1 ? 'genial' : 'steady', serviceRoute: true,
        look: keeperLooks[ri],
        spots: route.waypoints.map((at, i) => {
          const next = route.waypoints[(i + 1) % n];
          return { h0: 7 + i * step, h1: 7 + (i + 1) * step, at: at.slice(),
            face: Math.atan2(next[0] - at[0], next[1] - at[1]),
            act: i % 8 === 5 ? 'check' : 'walk' };
        }),
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
      const n = route.waypoints.length, h0 = 9 + ri, span = 8, step = span / n;
      rows.push({
        hz: '游客', name: ['小林', '阿芳', '乐乐妈妈'][ri],
        py: ['Xiǎo Lín', 'Ā Fāng', 'Lèlè māma'][ri], npcId: `zoo-${route.id}`,
        place: 'zoo', routeId: route.id, hours: [h0, h0 + span], speed: .80,
        temper: ri === 2 ? 'genial' : 'steady', look: visitorLooks[ri],
        spots: route.waypoints.map((at, i) => {
          const next = route.waypoints[(i + 1) % n];
          return { h0: h0 + i * step, h1: h0 + (i + 1) * step, at: at.slice(),
            face: Math.atan2(next[0] - at[0], next[1] - at[1]), act: 'walk' };
        }),
        lines: [
          ['这个园区比以前大多了。', 'The zoo is much larger than it used to be.'],
          ['导游图上每个颜色是一个园区。', 'Each map colour marks a different district.'],
          ['先看动物，再去湖边坐一会儿。', 'Animals first, then a rest beside the lake.'],
        ],
      });
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
