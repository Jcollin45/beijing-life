// Visual-only habitat art for the eastern savannah.
//
// This module adds opaque static scenery only. It deliberately has no access to the scene's
// collision, interaction, lighting or dynamic registries, so it can be built before Build.finish
// without changing gameplay.
const ZooArtEast = (() => {
  'use strict';

  const LIMIT = 80;
  const STRUCTURE_LOD = 26;
  const FOLIAGE_LOD = 34;
  const EPS = 1e-4;
  const HABITAT_BOUNDS = Object.freeze({
    H40: Object.freeze([24, 36.5, -10, 15]),
    H41: Object.freeze([41.5, 50, -10, 15]),
    H42: Object.freeze([24, 36.5, 23, 37]),
    H43: Object.freeze([41.5, 50, 24, 37]),
  });

  function build(B, context = {}) {
    void context;
    const { box, cyl, ball, capsule, taper, flat } = B;
    if (![box, cyl, ball, capsule, taper, flat].every(q => typeof q === 'function'))
      throw new Error('ZooArtEast: Build primitives are incomplete');

    const color = typeof C === 'function' ? C : value => value;
    const P = Object.freeze({
      redEarth: color('#95714f'),
      redEarthDark: color('#78563e'),
      dust: color('#b99a70'),
      dryGrass: color('#92915d'),
      straw: color('#a79a63'),
      sand: color('#b9a06f'),
      mud: color('#6b583c'),
      mudDark: color('#51483a'),
      water: color('#365f67'),
      timber: color('#72563e'),
      timberDark: color('#513d2f'),
      metal: color('#41494a'),
      rock: color('#77766f'),
      rockLight: color('#99978e'),
      rockWarm: color('#8d806b'),
      shade: color('#555a4e'),
      browse: color('#487139'),
      browseLight: color('#668f4b'),
    });
    const made = [];
    const ids = [];

    function group(code) {
      const prefix = `ART-${code}`;
      let child = 0;
      return (prop, lod = STRUCTURE_LOD) => {
        if (!prop) throw new Error(`ZooArtEast: ${prefix} primitive returned no prop`);
        const id = child === 0 ? prefix : `${prefix}/G${String(child).padStart(2, '0')}`;
        child++;
        prop.blueprintId = id;
        prop.zooLodMax = lod;
        made.push(prop);
        ids.push(id);
        if (made.length > LIMIT) throw new Error(`ZooArtEast: ${LIMIT}-prop budget exceeded`);
        return prop;
      };
    }

    function inside(code, x, z, hx, hz) {
      const [x0, x1, z0, z1] = HABITAT_BOUNDS[code];
      if (x - hx <= x0 + EPS || x + hx >= x1 - EPS ||
          z - hz <= z0 + EPS || z + hz >= z1 - EPS)
        throw new Error(`ZooArtEast: ${code} art leaves habitat bounds at ${x},${z}`);
    }

    function rotatedHalf(w, d, yaw) {
      return [
        Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * d / 2,
        Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * d / 2,
      ];
    }

    function surface(code, add, x, z, w, d, pigment, opt = {}) {
      const yaw = opt.ry || 0;
      const [hx, hz] = rotatedHalf(w, d, yaw);
      inside(code, x, z, hx, hz);
      return add(flat(x, opt.y === undefined ? .018 : opt.y, z, w, d, pigment,
        { mode: opt.mode === undefined ? 10 : opt.mode, gloss: opt.gloss || .05,
          ...(yaw ? { ry: yaw } : {}) }));
    }

    function patch(code, add, x, z, rx, rz, pigment, opt = {}) {
      const yaw=opt.ry||0,[hx,hz]=rotatedHalf(rx*2,rz*2,yaw);
      inside(code,x,z,hx,hz);
      const y=opt.y===undefined ? .027 : opt.y,
        thick=opt.thick===undefined ? .024 : opt.thick;
      return add(ball(x,y,z,rx,thick,rz,pigment,
        {mode:opt.mode===undefined?10:opt.mode,gloss:opt.gloss||.04,
          ...(yaw?{ry:yaw}:{})}));
    }

    function drainGrille(code,add,x,z,y=.046) {
      for(const dx of [-.13,0,.13])
        surface(code,add,x+dx,z,.035,.42,P.metal,{mode:10,gloss:.32,y});
    }

    function stone(code, add, x, z, rx, ry, rz, pigment = P.rock) {
      inside(code, x, z, rx, rz);
      return add(ball(x, ry * .84, z, rx, ry, rz, pigment, { mode: 10, gloss: .05 }));
    }

    function ledge(code, add, x, z, w, h, d, yaw = 0, pigment = P.rock) {
      const [hx, hz] = rotatedHalf(w, d, yaw);
      inside(code, x, z, hx, hz);
      return add(ball(x, h / 2, z, w / 2, h / 2, d / 2, pigment,
        { mode: 10, gloss: .05, ...(yaw ? { ry: yaw } : {}) }));
    }

    function groundLog(code, add, x, z, length, radius, yaw = 0) {
      const hx = Math.abs(Math.cos(yaw)) * length / 2 + Math.abs(Math.sin(yaw)) * radius;
      const hz = Math.abs(Math.sin(yaw)) * length / 2 + Math.abs(Math.cos(yaw)) * radius;
      inside(code, x, z, hx, hz);
      return add(capsule(x, radius / 2, z, radius, length, radius, P.timberDark,
        { gloss: .10, rz: Math.PI / 2, ry: yaw }));
    }

    function post(code, add, x, z, height, radius = .13, lean = 0) {
      inside(code, x, z, radius + Math.abs(Math.sin(lean)) * height / 2, radius);
      return add(cyl(x, height / 2, z, radius, height, P.timber,
        { gloss: .10, rz: lean }));
    }

    function grass(code, add, x, z, height, spread, dark = false) {
      inside(code, x, z, spread / 2, spread / 2);
      return add(taper(x, height / 2, z, spread, height, spread,
        dark ? P.browse : P.dryGrass, { mode: 15, gloss: .03 }), FOLIAGE_LOD);
    }

    function browseTree(code, add, x, z, height, spread, yaw = 0) {
      inside(code, x, z, spread * .57, spread * .47);
      add(cyl(x, height * .25, z, .12, height * .50, P.timberDark,
        { gloss: .10, rz: yaw * .12 }));
      add(taper(x - spread * .10, height * .69, z + spread * .05,
        spread, height * .38, spread * .66, P.browse,
        { mode: 15, gloss: .03, ry: yaw }), FOLIAGE_LOD);
      add(taper(x + spread * .30, height * .66, z - spread * .14,
        spread * .62, height * .28, spread * .50, P.browseLight,
        { mode: 15, gloss: .03, ry: yaw - .20 }), FOLIAGE_LOD);
    }

    function termiteMound(code, add, x, z, w, h, d, yaw = 0) {
      const [hx, hz] = rotatedHalf(w, d, yaw);
      inside(code, x, z, hx, hz);
      return add(ball(x, h / 2, z, w / 2, h / 2, d / 2, P.redEarthDark,
        { mode: 10, gloss: .04, ry: yaw }));
    }

    // H40 — elephant reserve. Low, broad massing preserves the long westward view: a worn red-earth
    // migration lane links water, dust and shade, while all raised dressing stays away from z=11.
    {
      const add = group('H40');
      // Broad overlapping earth lenses keep the reserve warm without drawing a ruler-straight
      // red rectangle over the canonical grass.  At art LOD range the underlying substrate now
      // returns gradually around an irregular edge rather than changing the whole pen at once.
      patch('H40', add, 29.25, 1.70, 4.65, 6.80, P.redEarth,
        { gloss: .045, ry:.08 });
      patch('H40', add, 32.20, 6.00, 3.10, 5.60, P.redEarthDark,
        { gloss: .055, y:.029, ry:-.10 });
      // H40's canonical pool already owns this water plane; a second near-identical quad made the
      // surface flicker and read as a blue tile laid over the basin.
      patch('H40', add, 28.25, 6.55, 1.70, 1.40, P.dust,
        { gloss:.035,ry:-.12,y:.031 });
      patch('H40', add, 31.60, 9.20, 2.00, 1.35, P.mud,
        { gloss:.075,ry:.15,y:.033 });
      groundLog('H40', add, 27.72, 2.20, 2.55, .19, .34);
      post('H40', add, 28.45, 4.45, 1.32, .16, -.07);
      stone('H40', add, 26.75, 8.72, .62, .30, .48, P.rockWarm);
      stone('H40', add, 32.72, 5.62, .80, .36, .57, P.rock);
      // Surface-level overflow hardware stays visible even though the authored drain body is
      // below the mud plane.
      drainGrille('H40',add,34.20,11.80);
      patch('H40', add, 33.70, -4.60, 1.80, 2.40, P.shade,
        { gloss:.03,ry:.10,y:.026 });
      // The browse tree now grows west of the shelter, with its crown clearing the roof edge
      // instead of merely moving its trunk outside while the foliage still clipped the canopy.
      post('H40', add, 29.25, -8.55, 2.35, .17, .04);
      add(taper(29.00, 2.52, -8.60, 3.20, 1.05, 2.20, P.browse,
        { mode: 15, gloss: .03, ry: .12 }), FOLIAGE_LOD);
      add(taper(29.70, 2.38, -8.40, 2.15, .72, 1.55, P.browseLight,
        { mode: 15, gloss: .03, ry: -.18 }), FOLIAGE_LOD);
      groundLog('H40', add, 32.00, -9.00, 2.15, .17, -.15);
      grass('H40', add, 35.42, 1.08, .62, .38, true);
      grass('H40', add, 32.05, 13.42, .72, .46);
    }

    // H41 — mixed savannah. A loose grass/sand mosaic keeps a clear west-to-east sightline; browse
    // trees cluster at the back rather than forming a fence, and the z=10 service approach is open.
    {
      const add = group('H41');
      patch('H41', add, 45.20, 1.00, 3.20, 8.20, P.dryGrass,
        { mode:10,gloss:.035 });
      patch('H41', add, 45.80, 9.50, 3.40, 4.80, P.sand,
        { gloss:.04,y:.029 });
      patch('H41', add, 43.70, -4.80, 1.50, 4.20, P.straw,
        { gloss:.035,ry:.05,y:.030 });
      patch('H41', add, 47.20, 4.80, 1.35, 3.00, P.redEarth,
        { gloss:.045,ry:-.11,y:.031 });
      termiteMound('H41', add, 46.18, 5.72, 1.05, 1.48, .82, -.10);
      termiteMound('H41', add, 46.72, 5.38, .62, .82, .55, .20);
      stone('H41', add, 43.18, 7.02, .48, .25, .35, P.rockWarm);
      stone('H41', add, 48.35, -4.20, .58, .28, .40, P.rock);
      stone('H41', add, 45.20, 12.82, .35, .18, .28, P.rockLight);
      groundLog('H41', add, 44.58, -7.72, 1.42, .12, -.28);
      browseTree('H41', add, 47.05, -5.62, 4.20, 2.05, .15);
      // A low thorn scrub breaks the repeated three-tree silhouette while leaving the giraffe
      // rack and long public sightline open.
      browseTree('H41', add, 48.15, 1.42, 2.35, 1.45, -.22);
      grass('H41', add, 42.72, -7.92, .72, .44, true);
      grass('H41', add, 43.12, 13.72, .58, .38);
      patch('H41', add, 47.02, 13.58, .82, .24, P.redEarthDark,
        { gloss:.04,ry:.13,y:.035,thick:.018 });
    }

    // H42 — rhino yard. The wallow is layered and churned, with a dry west bank and concentrated
    // rock shade in the southeast. The elevated composition stays south of the east gate at z=34.
    {
      const add = group('H42');
      patch('H42', add, 29.30, 29.50, 4.70, 5.40, P.sand,
        { gloss:.04,y:.020,thick:.017 });
      // The canonical irregular mud-wallow supplies all wet layers here. Art starts at the dry bank
      // so the rhino basin is not rendered three times at almost the same elevation.
      patch('H42', add, 26.90, 30.00, 1.15, 4.20, P.dust,
        { gloss:.035,ry:.025,y:.028 });
      patch('H42', add, 29.00, 27.80, .55, 2.20, P.redEarthDark,
        { gloss:.055,ry:-.10,y:.032,thick:.021 });
      post('H42', add, 28.20, 26.55, 1.38, .16, .08);
      post('H42', add, 29.02, 27.02, 1.05, .14, -.10);
      groundLog('H42', add, 31.10, 35.40, 2.22, .18, .48);
      patch('H42', add, 33.50, 25.70, 2.10, 1.25, P.shade,
        { gloss:.03,ry:-.03,y:.027 });
      ledge('H42', add, 33.80, 28.60, 3.42, .46, 1.55, -.08, P.rock);
      stone('H42', add, 34.70, 29.50, 1.05, .58, .78, P.rockLight);
      stone('H42', add, 32.40, 28.10, .82, .42, .62, P.rockWarm);
      drainGrille('H42',add,34.20,34.00);
      grass('H42', add, 27.22, 35.78, .72, .44, true);
      grass('H42', add, 30.18, 24.02, .58, .38);
      grass('H42', add, 35.48, 28.52, .62, .40, true);
      stone('H42', add, 26.12, 24.82, .40, .22, .31, P.rockWarm);
    }

    // H43 — lion habitat. Tawny ground remains open at the west glass; a compact kopje and shade
    // shadow form the focal overlook while deadfall and grass cluster away from the z=27 gate.
    {
      const add = group('H43');
      patch('H43', add, 44.80, 30.30, 2.75, 5.40, P.dryGrass,
        { mode:10,gloss:.035 });
      patch('H43', add, 43.85, 29.80, 1.55, 3.40, P.dust,
        { gloss:.04,ry:.045,y:.029 });
      patch('H43', add, 47.10, 32.40, 1.75, 1.05, P.shade,
        { gloss:.03,ry:-.08,y:.030 });
      ledge('H43', add, 47.25, 31.50, 3.25, .62, 2.05, -.12, P.rockWarm);
      ledge('H43', add, 47.22, 31.72, 2.18, .48, 1.42, .18, P.rock);
      stone('H43', add, 45.48, 31.55, 1.10, .66, .82, P.rockLight);
      ledge('H43', add, 46.65, 32.48, 1.72, .28, .92, -.08, P.rockLight);
      patch('H43', add, 47.00, 33.20, 1.40, .65, P.shade,
        { gloss:.03,ry:-.10,y:.036,thick:.020 });
      // Keep both deadfalls legible: this one is separated from authored O03 instead of sitting
      // almost exactly on top of it.
      groundLog('H43', add, 46.20, 25.25, 1.80, .15, -.35);
      // The north log clears OPS02's water basin by more than a metre.
      groundLog('H43', add, 45.00, 35.90, 1.30, .12, .10);
      post('H43', add, 44.92, 25.02, .82, .14, .18);
      grass('H43', add, 42.32, 35.92, .82, .46, true);
      // H43/OPS02 owns the north-west trough position.
      grass('H43', add, 47.45, 36.05, .72, .42, true);
      grass('H43', add, 48.62, 29.62, .58, .36);
      grass('H43', add, 42.45, 24.72, .52, .34, true);
      patch('H43', add, 48.55, 24.75, .60, .18, P.redEarthDark,
        { gloss:.045,ry:-.05,y:.036,thick:.017 });
      stone('H43', add, 43.20, 28.38, .44, .24, .34, P.rockWarm);
      stone('H43', add, 48.75, 36.10, .52, .28, .38, P.rock);
    }

    if (new Set(ids).size !== ids.length)
      throw new Error('ZooArtEast: duplicate stable art ID');
    return Object.freeze({ props: made, ids: Object.freeze(ids.slice()) });
  }

  return Object.freeze({ build });
})();

if (typeof globalThis !== 'undefined') globalThis.ZooArtEast = ZooArtEast;
