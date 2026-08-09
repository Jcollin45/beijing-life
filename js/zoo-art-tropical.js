// Render-only ecological depth for the Tropical House.
//
// The authored room shell, animals, fixtures and circulation remain authoritative. This layer only
// adds opaque static scenery, makes every prop non-pickable and never touches gameplay registries.
const ZooArtTropical = (() => {
  'use strict';

  const LIMIT = 360, FINE_LOD = 26, FOLIAGE_LOD = 34, EPS = 1e-6;
  const EXPECTED = Object.freeze({ T00:16, T01:28, T02:30, T03:28, T04:34, T05:22, T06:50 });
  const BOUNDS = Object.freeze({
    T00:Object.freeze([-12.7,-10,-2.5,2.5]),
    T01:Object.freeze([-8,-2,-8.5,-3]),
    T02:Object.freeze([2,7,-8.5,-3]),
    T03:Object.freeze([-8,-2,3,8.5]),
    T04:Object.freeze([2,7,3,8.5]),
    T05:Object.freeze([9,11.5,3,6]),
    // The authored pool already widens beyond the nominal [-1,1] planting strip. Keep its art
    // inside that existing pool/spine envelope and leave the outer public lanes untouched.
    T06:Object.freeze([-1.8,1.8,-8.5,8.5]),
  });
  const FORBIDDEN_PROP_KEYS = Object.freeze([
    'tag','dynamic','alpha','alphaGroup','glow','mat','matScale','matAmt','tex','nrm','nrmAmt','action',
  ]);
  const PROTECTED_ARRAYS = Object.freeze([
    'solids','blockers','things','lights','glows','shadows','actions',
  ]);

  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const pad = n => String(n).padStart(2, '0');

  function build(B, context = {}) {
    if (!B || !Array.isArray(B.props))
      throw new Error('ZooArtTropical.build requires an unfinished Build.scene');
    for (const name of ['ball','capsule','cyl','flat','taper'])
      if (typeof B[name] !== 'function')
        throw new Error(`ZooArtTropical.build requires Build.${name}`);

    const source = context.colors || context.col || context.palette || {};
    const color = typeof context.color === 'function' ? context.color :
      (typeof C === 'function' ? C : null);
    const tone = (key, hex) => {
      if (own(source, key)) return source[key];
      if (!color) throw new Error(`ZooArtTropical: missing colour ${key}`);
      return color(hex);
    };
    const P = Object.freeze({
      soil:tone('soil','#5b4937'), soilD:tone('soilD','#46382d'),
      mud:tone('mud','#66503c'), mudD:tone('mudD','#473b31'), sand:tone('sand','#a89570'),
      rock:tone('rock','#686a64'), rockL:tone('rockL','#888b82'), rockD:tone('rockD','#4f514d'),
      water:tone('water','#315f64'), waterL:tone('waterL','#4d8585'),
      trunk:tone('trunk','#66503a'), trunkD:tone('trunkD','#44362b'),
      cork:tone('cork','#7a563b'), vine:tone('vine','#537a3f'),
      leaf:tone('leaf','#387044'), leafD:tone('leafD','#245534'),
      leafL:tone('leafL','#5f985b'), fern:tone('fern','#4b8750'),
      reed:tone('reed','#6c8145'), reedL:tone('reedL','#879555'),
      orchid:tone('orchid','#a86f84'), nectar:tone('nectar','#c29248'),
      bloom:tone('bloom','#d4bd85'), cave:tone('cave','#343735'),
    });

    const before = {};
    for (const key of PROTECTED_ARRAYS)
      if (Array.isArray(B[key])) before[key] = B[key].length;
    const start = B.props.length, made = [], ids = [], counts = {};
    let activeCode = '', activeBounds = null, serial = 0;

    function inside(x0, x1, z0, z1) {
      const b = activeBounds;
      if (!b || x0 < b[0] - EPS || x1 > b[1] + EPS || z0 < b[2] - EPS || z1 > b[3] + EPS)
        throw new Error(`ZooArtTropical: ART-${activeCode} footprint leaves room bounds`);
    }

    function add(p, lod = FINE_LOD) {
      if (!p) throw new Error(`ZooArtTropical: ART-${activeCode} primitive returned no prop`);
      const id = serial === 0 ? `ART-${activeCode}` : `ART-${activeCode}/G${pad(serial)}`;
      serial++;
      p.blueprintId = id;
      p.zooLodMax = lod;
      p.ob = null;
      made.push(p); ids.push(id);
      if (made.length > LIMIT) throw new Error(`ZooArtTropical: ${LIMIT}-prop budget exceeded`);
      return p;
    }

    function room(code, compose) {
      activeCode = code; activeBounds = BOUNDS[code]; serial = 0;
      const first = made.length;
      compose();
      counts[code] = made.length - first;
      if (counts[code] !== EXPECTED[code])
        throw new Error(`ZooArtTropical: ${code} expected ${EXPECTED[code]} props, found ${counts[code]}`);
    }

    function mass(x, y, z, rx, ry, rz, pigment, lod = FINE_LOD) {
      inside(x-rx,x+rx,z-rz,z+rz);
      return add(B.ball(x,y,z,rx,ry,rz,pigment,{mode:10,gloss:.045}),lod);
    }

    function water(x, y, z, w, d, yaw = 0, pigment = P.waterL) {
      const hx=Math.abs(Math.cos(yaw))*w/2+Math.abs(Math.sin(yaw))*d/2;
      const hz=Math.abs(Math.sin(yaw))*w/2+Math.abs(Math.cos(yaw))*d/2;
      inside(x-hx,x+hx,z-hz,z+hz);
      return add(B.flat(x,y,z,w,d,pigment,{mode:16,ry:yaw,gloss:.48}));
    }

    function stem(x, y, z, radius, height, pigment = P.trunk, lod = FINE_LOD, lean = 0) {
      const spread=radius+Math.abs(Math.sin(lean))*height/2;
      inside(x-spread,x+spread,z-radius,z+radius);
      return add(B.cyl(x,y,z,radius,height,pigment,{rz:lean,gloss:.09}),lod);
    }

    function frond(x, y, z, sx, sy, sz, pigment = P.leaf, ry = 0, rz = 0,
      lod = FOLIAGE_LOD) {
      const spread=Math.max(sx,sz)/2+Math.abs(Math.sin(rz))*sy/2;
      inside(x-spread,x+spread,z-spread,z+spread);
      return add(B.capsule(x,y,z,sx,sy,sz,pigment,
        {mode:15,ry,rz,gloss:.045}),lod);
    }

    function log(x, y, z, length, radius, yaw, pigment = P.trunkD, lod = FINE_LOD) {
      const hx=Math.abs(Math.cos(yaw))*length/2+Math.abs(Math.sin(yaw))*radius;
      const hz=Math.abs(Math.sin(yaw))*length/2+Math.abs(Math.cos(yaw))*radius;
      inside(x-hx,x+hx,z-hz,z+hz);
      return add(B.capsule(x,y,z,radius,length,radius,pigment,
        {rz:Math.PI/2,ry:yaw,gloss:.085}),lod);
    }

    function caveForm(x, y, z, w, h, d, pigment = P.cave, yaw = 0) {
      const hx=Math.abs(Math.cos(yaw))*w/2+Math.abs(Math.sin(yaw))*d/2;
      const hz=Math.abs(Math.sin(yaw))*w/2+Math.abs(Math.cos(yaw))*d/2;
      inside(x-hx,x+hx,z-hz,z+hz);
      return add(B.taper(x,y,z,w,h,d,pigment,{ry:yaw,gloss:.035}));
    }

    // T00 — planted arrival frames live on the high wall edges. The floor, spawn, desk, map,
    // queue rails and both sides of the four-metre entrance remain visually unobstructed.
    room('T00', () => {
      mass(-12.43,1.18,-2.12,.16,.15,.27,P.soilD);
      stem(-12.40,1.65,-2.12,.035,.94,P.trunk);
      frond(-12.37,1.84,-2.05,.10,.82,.15,P.leafD,-.35,.18);
      frond(-12.45,1.93,-2.20,.09,.76,.14,P.leaf,.65,-.16);
      frond(-12.33,1.72,-2.24,.09,.68,.13,P.leafL,1.15,.12);
      mass(-12.42,1.24,2.12,.17,.16,.26,P.soil);
      stem(-12.39,1.73,2.12,.036,.98,P.trunkD);
      frond(-12.35,1.94,2.03,.10,.86,.15,P.leaf,-.72,.17);
      frond(-12.46,2.00,2.19,.09,.78,.14,P.leafD,.38,-.15);
      frond(-12.31,1.78,2.24,.09,.70,.13,P.leafL,1.26,.11);
      frond(-10.34,4.72,-2.14,.075,1.74,.11,P.vine,.22,.05);
      frond(-10.52,4.94,-1.88,.070,1.42,.10,P.leafD,-.48,-.08);
      frond(-10.33,4.68,2.14,.078,1.80,.11,P.vine,-.20,-.05);
      frond(-10.55,4.98,2.25,.068,1.38,.10,P.leaf,.56,.07);
      frond(-11.48,4.72,-1.82,.12,.92,.20,P.leafL,.84,1.00);
      frond(-11.42,4.78,1.80,.12,.96,.20,P.fern,-.76,-.98);
    });

    // T01 — crocodile paludarium. Low banks form a water-to-mud gradient; all raised roots,
    // reeds and logs sit on the rear/side frame so the north glass keeps a broad animal view.
    room('T01', () => {
      mass(-7.23,.09,-4.42,.62,.08,.72,P.mud);
      mass(-3.02,.08,-7.82,.72,.07,.52,P.mudD);
      mass(-7.30,.08,-6.78,.52,.07,.78,P.soilD);
      water(-4.28,.022,-4.36,2.25,.30,.06,P.waterL);
      water(-3.35,.024,-7.95,1.42,.27,-.13,P.water);
      mass(-7.26,.23,-4.18,.31,.22,.39,P.rockD);
      mass(-6.90,.19,-4.54,.43,.18,.31,P.rock);
      mass(-2.78,.18,-7.58,.36,.17,.30,P.rockL);
      mass(-3.18,.13,-8.05,.24,.12,.21,P.rockD);
      mass(-2.58,.15,-5.18,.28,.14,.24,P.rock);
      log(-5.14,.25,-8.02,2.45,.15,.04,P.trunkD);
      log(-6.08,.25,-7.68,1.30,.11,.68,P.cork);
      log(-5.43,.24,-7.72,1.52,.10,-.58,P.trunk);
      log(-4.22,.23,-7.78,1.22,.09,.82,P.cork);
      stem(-5.92,.73,-8.02,.085,1.46,P.trunkD);
      log(-3.20,.24,-6.38,1.68,.12,1.02,P.trunkD);
      log(-6.72,.22,-3.78,1.38,.10,.18,P.cork);
      frond(-7.56,.53,-3.67,.05,.98,.08,P.reed,.12,.08);
      frond(-7.31,.68,-3.80,.05,1.28,.08,P.reedL,-.22,-.10);
      frond(-7.05,.48,-3.61,.045,.88,.075,P.reed,.48,.12);
      frond(-2.55,.59,-8.02,.05,1.10,.08,P.reed,-.40,-.08);
      frond(-2.79,.47,-8.16,.045,.86,.075,P.reedL,.18,.10);
      frond(-7.58,.56,-7.86,.05,1.05,.08,P.reed,.66,.07);
      frond(-2.48,.51,-4.60,.045,.94,.075,P.reedL,-.54,-.09);
      mass(-6.43,.17,-5.00,.62,.15,.50,P.rockL);
      mass(-6.92,.13,-5.33,.50,.12,.40,P.rock);
      mass(-5.88,.12,-4.78,.39,.11,.31,P.rockL);
      mass(-7.38,.10,-5.02,.25,.09,.31,P.rockD);
    });

    // T02 — river aquarium. The riverbed grades from fine gravel into boulders and root wood;
    // four submerged plant fans frame depth without crossing the sturgeon swimming envelope.
    room('T02', () => {
      mass(2.72,.045,-8.02,.58,.04,.30,P.sand);
      mass(3.92,.047,-8.03,.92,.042,.34,P.soil);
      mass(5.18,.044,-4.02,.82,.039,.28,P.sand);
      mass(6.35,.046,-5.10,.48,.041,.52,P.soilD);
      for (const q of [
        [2.45,-7.00,.18,.12,.15,P.rockD],[2.72,-6.42,.24,.14,.20,P.rock],
        [3.34,-8.08,.20,.11,.17,P.rockL],[3.62,-5.08,.31,.18,.24,P.rockD],
        [4.28,-8.10,.23,.13,.20,P.rock],[4.58,-5.96,.18,.10,.16,P.rockL],
        [5.16,-8.04,.29,.16,.23,P.rockD],[5.48,-3.78,.21,.12,.18,P.rock],
        [6.47,-4.28,.27,.15,.22,P.rockL],[6.52,-5.14,.18,.10,.15,P.rockD],
      ]) mass(q[0],q[3],q[1],q[2],q[3],q[4],q[5]);
      log(3.04,.22,-7.08,1.22,.10,.76,P.trunkD);
      log(3.36,.28,-7.38,1.40,.09,-.66,P.cork);
      log(4.02,.20,-7.52,1.08,.085,.34,P.trunk);
      stem(3.46,.58,-7.34,.075,1.16,P.trunkD);
      for (const q of [
        [2.40,.48,-5.10,.045,.90,.10,P.fern,-.30,.14],
        [2.58,.61,-5.24,.05,1.14,.11,P.leaf,.28,-.12],
        [2.76,.43,-5.02,.04,.78,.09,P.leafL,.72,.16],
        [3.58,.55,-8.08,.05,1.02,.11,P.fern,-.62,-.10],
        [3.84,.68,-8.12,.055,1.26,.12,P.leafD,.18,.13],
        [4.02,.46,-7.92,.045,.84,.10,P.leafL,.82,-.15],
        [5.82,.58,-3.74,.05,1.08,.11,P.leafD,-.38,.12],
        [6.06,.72,-3.84,.055,1.34,.12,P.fern,.42,-.11],
        [6.30,.48,-3.70,.045,.88,.10,P.leafL,.96,.14],
        [6.42,.54,-7.10,.05,1.00,.11,P.fern,-.58,-.12],
        [6.58,.67,-7.34,.055,1.24,.12,P.leaf,.22,.10],
        [6.28,.42,-7.42,.045,.76,.09,P.leafL,.72,-.14],
      ]) frond(...q);
    });

    // T03 — two visibly different microhabitats: damp cork/leaf litter for the snake on the west,
    // and a dry ledge-and-branch basking landscape for the lizard on the east.
    room('T03', () => {
      mass(-6.58,.055,4.82,.72,.05,.34,P.soilD);
      mass(-6.08,.057,7.72,.96,.052,.29,P.mudD);
      log(-6.88,.30,7.18,1.20,.11,.30,P.cork);
      log(-5.54,.78,7.34,1.48,.09,-.48,P.trunkD);
      stem(-7.28,.90,7.42,.09,1.80,P.cork);
      log(-5.45,.38,4.78,.92,.085,.42,P.trunk);
      frond(-7.42,.58,7.64,.06,1.04,.12,P.leafD,-.35,.13);
      frond(-7.18,.72,7.88,.06,1.30,.12,P.fern,.25,-.11);
      frond(-6.78,.50,8.00,.05,.88,.10,P.leafL,.76,.14);
      frond(-5.22,.60,7.82,.055,1.10,.11,P.leaf,-.52,-.12);
      frond(-5.08,.43,7.48,.045,.76,.09,P.fern,.48,.14);
      mass(-7.12,.18,5.04,.32,.17,.25,P.rockD);
      mass(-5.24,.13,4.18,.25,.12,.20,P.rock);
      mass(-7.44,.11,6.42,.22,.10,.18,P.rockL);

      mass(-3.48,.052,4.88,.70,.047,.31,P.sand);
      mass(-3.10,.054,7.82,.82,.049,.28,P.soil);
      mass(-4.34,.20,6.96,.42,.18,.34,P.rockD);
      mass(-3.38,.26,7.30,.48,.24,.38,P.rockL);
      mass(-2.72,.16,6.76,.31,.15,.26,P.rock);
      mass(-3.02,.13,6.10,.27,.12,.22,P.rockD);
      log(-3.34,.82,7.78,1.38,.085,.28,P.cork);
      log(-2.82,.62,5.04,1.12,.08,1.02,P.trunkD);
      stem(-4.42,.82,7.62,.085,1.64,P.cork);
      frond(-4.38,.55,7.90,.055,1.00,.11,P.leafD,-.46,.12);
      frond(-4.10,.70,8.04,.06,1.28,.12,P.fern,.22,-.10);
      frond(-2.50,.58,7.88,.055,1.06,.11,P.leaf,.58,.13);
      frond(-2.64,.43,7.48,.045,.76,.09,P.leafL,-.72,-.14);
      frond(-4.45,.40,5.02,.045,.70,.09,P.fern,.92,.12);
    });

    // T04 — all floor mass remains inside the two authored planting beds. Four asymmetric edge
    // plants, nectar flowers and high hanging foliage leave x[4,5] and both 1.5 m airlocks open.
    room('T04', () => {
      mass(2.72,.050,4.42,.38,.045,.56,P.soilD);
      mass(3.50,.052,7.78,.36,.047,.32,P.soil);
      mass(5.54,.051,3.82,.36,.046,.30,P.soilD);
      mass(6.25,.053,7.12,.31,.048,.54,P.soil);
      for (const q of [[2.55,3.72,1.65,.06],[3.62,7.92,1.82,-.08],
                       [6.38,3.78,1.72,-.05],[5.42,8.00,1.90,.07]]) {
        const [x,z,h,lean]=q;
        stem(x,h*.34,z,.055,h*.68,P.trunkD,FINE_LOD,lean);
        frond(x-.13,h*.67,z+.05,.12,h*.74,.24,P.leafD,-.42,.22);
        frond(x+.16,h*.74,z-.08,.11,h*.68,.22,P.leaf,.66,-.20);
        frond(x+.02,h*.88,z+.16,.10,h*.58,.20,P.leafL,1.22,.16);
      }
      for (const q of [
        [2.72,.68,5.02,P.orchid,-.15],[3.25,.62,5.62,P.bloom,.12],
        [3.62,.72,6.30,P.nectar,-.10],[5.34,.64,5.02,P.bloom,.14],
        [5.78,.75,6.78,P.orchid,-.12],[6.30,.66,5.62,P.nectar,.10],
      ]) frond(q[0],q[1],q[2],.09,.58,.13,q[3],q[0],q[4]);
      for (const q of [
        [2.38,4.58,4.82,1.58,P.vine,.05],[3.72,4.92,3.42,1.35,P.leafD,-.08],
        [2.52,4.78,7.72,1.52,P.fern,.07],[6.58,4.64,4.34,1.62,P.vine,-.06],
        [5.38,5.02,3.48,1.28,P.leafD,.08],[6.42,4.84,7.88,1.42,P.fern,-.07],
      ]) frond(q[0],q[1],q[2],.07,q[3],.11,q[4],q[0],q[5]);
      frond(6.48,2.55,7.38,.12,.56,.15,P.leafL,.40,.16);
      frond(6.62,2.88,7.42,.11,.48,.14,P.orchid,-.36,-.14);
    });

    // T05 — a low cave apron and a broken rear silhouette frame the flight volume; roost ledges
    // remain irregular and below/behind the moving bats rather than forming another visible grid.
    room('T05', () => {
      for (const q of [
        [9.38,.24,3.38,.28,.22,.24,P.rockD],[9.62,.34,5.58,.38,.31,.30,P.rock],
        [10.18,.20,5.76,.31,.18,.20,P.rockL],[10.82,.28,5.68,.36,.25,.28,P.rockD],
        [11.15,.18,3.42,.25,.16,.21,P.rock],[11.18,.38,5.32,.28,.35,.24,P.cave],
      ]) mass(...q);
      log(10.84,2.86,5.44,1.02,.08,.10,P.trunkD);
      log(9.70,2.34,5.30,.88,.07,-.36,P.cork);
      log(10.96,1.92,4.78,.92,.07,.72,P.trunkD);
      log(9.72,3.40,4.06,.78,.065,-.82,P.cork);
      log(10.52,1.28,5.58,.72,.07,.18,P.trunk);
      stem(11.15,2.18,5.50,.075,4.36,P.trunkD,FINE_LOD,-.03);
      stem(9.42,1.82,5.56,.070,3.64,P.trunk,FINE_LOD,.04);
      frond(11.08,3.72,5.48,.16,1.30,.26,P.leafD,.32,.20);
      frond(10.82,4.18,5.30,.14,1.10,.23,P.vine,-.56,-.18);
      frond(9.48,3.28,5.50,.15,1.18,.24,P.leafD,.74,.16);
      frond(9.72,3.72,5.34,.13,1.02,.22,P.fern,-.28,-.17);
      frond(11.12,2.62,3.42,.13,.92,.21,P.leafD,.92,.14);
      frond(9.38,2.48,3.58,.12,.86,.20,P.vine,-.82,-.13);
      caveForm(9.36,5.46,5.62,.32,1.20,.38,P.cave,.12);
      caveForm(10.24,5.58,5.72,.42,1.42,.44,P.rockD,-.08);
      caveForm(11.18,5.40,5.54,.30,1.08,.36,P.cave,.16);
    });

    // T06 — the added mass is concentrated in the already-authored north tree/pool focal zone.
    // The long central spine remains ground-clear; only high edge vines continue toward the south.
    room('T06', () => {
      for (const q of [
        [-.46,.18,4.62,1.18,.11,-.18], [.48,.17,4.70,1.26,.10,.22],
        [-.58,.15,5.02,.96,.09,.58], [.56,.16,5.12,1.02,.09,-.54],
        [-.18,.14,4.38,.88,.08,1.06], [.20,.13,5.28,.82,.08,-1.00],
      ]) log(q[0],q[1],q[2],q[3],q[4],q[5],P.trunkD);
      for (const q of [
        [-.62,4.52,4.10,.22,1.66,.40,P.leafD,-.42,.42],
        [.58,4.72,4.22,.20,1.52,.38,P.leaf,.60,-.46],
        [-.38,5.18,4.72,.19,1.42,.36,P.leafL,.92,.32],
        [.40,5.36,4.90,.18,1.36,.34,P.fern,-.86,-.30],
        [-.72,4.86,5.42,.20,1.50,.38,P.leaf,.24,.44],
        [.74,4.62,5.58,.21,1.58,.39,P.leafD,-.34,-.40],
        [-.34,5.72,5.76,.17,1.22,.31,P.leafL,1.20,.28],
        [.28,5.82,4.26,.16,1.14,.30,P.leaf,.76,-.26],
        [-.92,4.30,4.80,.17,1.30,.30,P.vine,-.18,.34],
        [.96,4.42,5.02,.17,1.34,.31,P.vine,.38,-.32],
        [-.18,5.96,4.48,.15,1.02,.28,P.fern,-.70,.24],
        [.12,6.02,5.38,.15,.96,.27,P.leafL,.58,-.22],
      ]) frond(...q);
      for (const q of [
        [-1.18,.34,7.70,.38,.31,.30,P.rockD],[-1.02,.50,7.28,.46,.45,.37,P.rock],
        [-.82,.62,7.82,.35,.57,.31,P.rockL],[1.14,.36,7.72,.40,.33,.31,P.rockD],
        [1.00,.52,7.26,.48,.47,.38,P.rock],[.78,.66,7.86,.34,.61,.30,P.rockL],
        [-1.26,.24,6.30,.30,.21,.28,P.rock],[1.30,.26,6.04,.31,.23,.29,P.rockD],
      ]) mass(...q);
      for (const q of [
        [-1.34,.18,5.72,.32,.16,.30,P.rockD],[-1.42,.15,6.78,.27,.13,.25,P.rock],
        [-1.30,.16,8.08,.29,.14,.27,P.rockL],[1.36,.17,5.76,.30,.15,.28,P.rock],
        [1.44,.14,6.82,.26,.12,.24,P.rockD],[1.28,.18,8.10,.31,.16,.28,P.rockL],
      ]) mass(...q);
      for (const q of [
        [-1.34,4.78,-6.20,.07,1.90,.11,P.vine,.12,.04],
        [1.30,4.96,-4.82,.07,1.62,.11,P.leafD,-.32,-.06],
        [-1.28,5.06,-2.72,.065,1.48,.10,P.vine,.54,.05],
        [1.32,4.82,-.92,.07,1.76,.11,P.fern,-.42,-.04],
        [-1.36,5.12,.86,.065,1.42,.10,P.vine,.68,.06],
        [1.34,4.90,2.62,.07,1.64,.11,P.leafD,-.58,-.05],
        [-1.22,4.72,3.72,.07,1.80,.11,P.fern,.36,.05],
        [1.24,5.18,3.96,.065,1.36,.10,P.vine,-.72,-.06],
        [-1.12,4.98,5.18,.065,1.52,.10,P.leafD,.46,.05],
        [1.10,5.06,5.42,.065,1.44,.10,P.fern,-.38,-.05],
      ]) frond(...q);
      for (const q of [
        [-.90,2.72,4.18,.12,.72,.18,P.fern,-.32,.18],
        [.92,2.88,4.36,.11,.68,.17,P.leafL,.42,-.16],
        [-1.12,2.56,5.62,.12,.76,.18,P.leaf,.78,.15],
        [1.14,2.66,5.78,.11,.70,.17,P.fern,-.70,-.14],
        [-1.24,1.08,7.08,.10,.62,.16,P.leafL,.30,.13],
        [1.26,1.16,7.42,.10,.66,.16,P.leaf,-.42,-.12],
        [-.72,3.12,6.20,.11,.74,.17,P.fern,.92,.14],
        [.66,3.28,6.08,.11,.78,.17,P.leafL,-.84,-.13],
      ]) frond(...q);
    });

    const props = B.props.slice(start);
    const expectedTotal = Object.values(EXPECTED).reduce((a,b) => a+b, 0);
    if (props.length !== expectedTotal || made.length !== expectedTotal || ids.length !== expectedTotal)
      throw new Error(`ZooArtTropical: expected ${expectedTotal} canonical props`);
    if (props.some((p,i) => p !== made[i]))
      throw new Error('ZooArtTropical: non-canonical prop order');
    if (new Set(ids).size !== ids.length)
      throw new Error('ZooArtTropical: duplicate stable art ID');
    for (let i=0;i<props.length;i++) {
      const p=props[i];
      if (p.blueprintId !== ids[i] || !/^ART-T0[0-6](?:\/G\d{2,})?$/.test(ids[i]))
        throw new Error('ZooArtTropical: invalid stable art ID sequence');
      if (!p.m || !p.color || ![...p.m].every(Number.isFinite) ||
          ![...p.color].every(Number.isFinite))
        throw new Error(`ZooArtTropical: ${ids[i]} has non-finite geometry`);
      if (p.zooLodMax !== FINE_LOD && p.zooLodMax !== FOLIAGE_LOD)
        throw new Error(`ZooArtTropical: ${ids[i]} has invalid LOD`);
      if (FORBIDDEN_PROP_KEYS.some(key => own(p,key)))
        throw new Error(`ZooArtTropical: ${ids[i]} violates the render-only contract`);
      if (p.ob !== null) throw new Error(`ZooArtTropical: ${ids[i]} remains pickable`);
    }
    for (const [key,n] of Object.entries(before))
      if (B[key].length !== n) throw new Error(`ZooArtTropical: changed protected ${key} array`);
    return { props, ids };
  }

  return Object.freeze({ build, bounds:BOUNDS });
})();

if (typeof globalThis !== 'undefined') globalThis.ZooArtTropical = ZooArtTropical;
