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
      redEarth: color('#8a6545'),
      redEarthDark: color('#6f5038'),
      dust: color('#b48b5f'),
      dryGrass: color('#8a8753'),
      straw: color('#a79a63'),
      sand: color('#b9a06f'),
      mud: color('#6b583c'),
      mudDark: color('#51483a'),
      water: color('#365f67'),
      timber: color('#72563e'),
      timberDark: color('#513d2f'),
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
      surface('H40', add, 30.25, 2.50, 11.45, 23.85, P.redEarth,
        { mode: 10, gloss: .045 });
      surface('H40', add, 29.65, 1.55, 1.20, 16.40, P.redEarthDark,
        { mode: 10, gloss: .06, ry: -.055, y: .031 });
      surface('H40', add, 27.72, -5.42, 4.10, 4.30, P.water,
        { mode: 16, gloss: .28, ry: .025, y: .027 });
      surface('H40', add, 28.25, 6.55, 3.35, 2.75, P.dust,
        { mode: 10, gloss: .035, ry: -.12, y: .034 });
      surface('H40', add, 31.42, 9.05, 3.80, 2.20, P.mud,
        { mode: 10, gloss: .075, ry: .08, y: .035 });
      groundLog('H40', add, 27.72, 2.20, 2.55, .19, .34);
      post('H40', add, 28.45, 4.45, 1.32, .16, -.07);
      stone('H40', add, 26.75, 8.72, .62, .30, .48, P.rockWarm);
      stone('H40', add, 32.72, 5.62, .80, .36, .57, P.rock);
      surface('H40', add, 27.05, 10.28, 1.45, .52, P.redEarthDark,
        { mode: 10, gloss: .055, ry: .24, y: .038 });
      surface('H40', add, 31.15, -1.18, 1.65, .48, P.dust,
        { mode: 10, gloss: .04, ry: -.20, y: .037 });
      surface('H40', add, 34.35, -7.78, 2.65, 1.45, P.shade,
        { mode: 10, gloss: .035, ry: .08, y: .029 });
      post('H40', add, 33.72, -5.05, 2.35, .17, .04);
      add(taper(33.45, 2.52, -5.15, 3.20, 1.05, 2.35, P.browse,
        { mode: 15, gloss: .03, ry: .12 }), FOLIAGE_LOD);
      add(taper(34.65, 2.38, -4.82, 2.25, .72, 1.65, P.browseLight,
        { mode: 15, gloss: .03, ry: -.18 }), FOLIAGE_LOD);
      groundLog('H40', add, 33.42, -7.10, 2.15, .17, -.25);
      grass('H40', add, 35.42, 1.08, .62, .38, true);
      grass('H40', add, 32.05, 13.42, .72, .46);
      surface('H40', add, 34.62, -8.82, 2.25, .38, P.sand,
        { mode: 10, gloss: .045, ry: -.08, y: .038 });
    }

    // H41 — mixed savannah. A loose grass/sand mosaic keeps a clear west-to-east sightline; browse
    // trees cluster at the back rather than forming a fence, and the z=10 service approach is open.
    {
      const add = group('H41');
      surface('H41', add, 45.75, 2.50, 7.85, 23.80, P.dryGrass,
        { mode: 17, gloss: .035 });
      surface('H41', add, 44.42, 10.62, 4.65, 6.15, P.sand,
        { mode: 10, gloss: .04, ry: -.035, y: .027 });
      surface('H41', add, 44.02, -3.12, .62, 9.10, P.straw,
        { mode: 10, gloss: .035, ry: .08, y: .032 });
      surface('H41', add, 47.18, 5.18, 1.15, 5.70, P.redEarth,
        { mode: 10, gloss: .045, ry: -.11, y: .033 });
      termiteMound('H41', add, 46.18, 5.72, 1.05, 1.48, .82, -.10);
      termiteMound('H41', add, 46.72, 5.38, .62, .82, .55, .20);
      stone('H41', add, 43.18, 7.02, .48, .25, .35, P.rockWarm);
      stone('H41', add, 48.35, -4.20, .58, .28, .40, P.rock);
      stone('H41', add, 45.20, 12.82, .35, .18, .28, P.rockLight);
      groundLog('H41', add, 44.58, -7.72, 1.42, .12, -.28);
      browseTree('H41', add, 47.05, -5.62, 4.20, 2.05, .15);
      browseTree('H41', add, 48.15, 1.42, 3.55, 1.66, -.22);
      grass('H41', add, 42.72, -7.92, .72, .44, true);
      grass('H41', add, 43.12, 13.72, .58, .38);
      surface('H41', add, 47.02, 13.58, 1.65, .42, P.redEarthDark,
        { mode: 10, gloss: .04, ry: .13, y: .037 });
    }

    // H42 — rhino yard. The wallow is layered and churned, with a dry west bank and concentrated
    // rock shade in the southeast. The elevated composition stays south of the east gate at z=34.
    {
      const add = group('H42');
      surface('H42', add, 30.25, 30.00, 11.45, 12.85, P.sand,
        { mode: 10, gloss: .04 });
      surface('H42', add, 31.75, 32.08, 5.55, 4.95, P.mud,
        { mode: 10, gloss: .075, ry: .035, y: .029 });
      surface('H42', add, 32.05, 32.18, 3.65, 2.75, P.mudDark,
        { mode: 10, gloss: .09, ry: -.04, y: .034 });
      surface('H42', add, 27.10, 30.05, 2.35, 8.80, P.dust,
        { mode: 10, gloss: .035, ry: .025, y: .031 });
      surface('H42', add, 29.18, 28.15, .72, 5.05, P.redEarthDark,
        { mode: 10, gloss: .055, ry: -.13, y: .036 });
      post('H42', add, 28.20, 26.55, 1.38, .16, .08);
      post('H42', add, 29.02, 27.02, 1.05, .14, -.10);
      groundLog('H42', add, 31.10, 35.40, 2.22, .18, .48);
      surface('H42', add, 33.65, 25.35, 4.45, 2.55, P.shade,
        { mode: 10, gloss: .035, ry: -.03, y: .030 });
      ledge('H42', add, 33.80, 28.60, 3.42, .46, 1.55, -.08, P.rock);
      stone('H42', add, 34.70, 29.50, 1.05, .58, .78, P.rockLight);
      stone('H42', add, 32.40, 28.10, .82, .42, .62, P.rockWarm);
      surface('H42', add, 29.05, 34.95, 1.55, .48, P.mudDark,
        { mode: 10, gloss: .07, ry: .18, y: .038 });
      surface('H42', add, 34.58, 29.32, 1.18, .44, P.mud,
        { mode: 10, gloss: .07, ry: -.24, y: .038 });
      grass('H42', add, 27.22, 35.78, .72, .44, true);
      grass('H42', add, 30.18, 24.02, .58, .38);
      grass('H42', add, 35.48, 28.52, .62, .40, true);
      surface('H42', add, 35.62, 23.72, 1.18, .38, P.redEarthDark,
        { mode: 10, gloss: .045, ry: .08, y: .038 });
      stone('H42', add, 26.12, 24.82, .40, .22, .31, P.rockWarm);
    }

    // H43 — lion habitat. Tawny ground remains open at the west glass; a compact kopje and shade
    // shadow form the focal overlook while deadfall and grass cluster away from the z=27 gate.
    {
      const add = group('H43');
      surface('H43', add, 45.75, 30.50, 7.85, 11.85, P.dryGrass,
        { mode: 17, gloss: .035 });
      surface('H43', add, 44.35, 29.85, 2.25, 7.85, P.dust,
        { mode: 10, gloss: .04, ry: .045, y: .029 });
      surface('H43', add, 47.05, 32.28, 3.65, 2.15, P.shade,
        { mode: 10, gloss: .035, ry: -.08, y: .031 });
      ledge('H43', add, 47.25, 31.50, 3.25, .62, 2.05, -.12, P.rockWarm);
      ledge('H43', add, 47.22, 31.72, 2.18, .48, 1.42, .18, P.rock);
      stone('H43', add, 45.48, 31.55, 1.10, .66, .82, P.rockLight);
      ledge('H43', add, 46.65, 32.48, 1.72, .28, .92, -.08, P.rockLight);
      surface('H43', add, 47.05, 33.05, 2.95, 1.38, P.shade,
        { mode: 10, gloss: .03, ry: -.10, y: .036 });
      groundLog('H43', add, 44.18, 25.62, 2.05, .16, .72);
      groundLog('H43', add, 43.55, 34.85, 1.45, .13, -.38);
      post('H43', add, 44.92, 25.02, .82, .14, .18);
      grass('H43', add, 42.32, 35.92, .82, .46, true);
      // H43/OPS02 owns the north-west trough position.
      grass('H43', add, 48.78, 35.82, .72, .42, true);
      grass('H43', add, 48.62, 29.62, .58, .36);
      grass('H43', add, 42.45, 24.72, .52, .34, true);
      surface('H43', add, 48.62, 24.72, 1.22, .36, P.redEarthDark,
        { mode: 10, gloss: .045, ry: -.05, y: .038 });
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
