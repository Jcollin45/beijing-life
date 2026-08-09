// Visual-only habitat art for the western wetlands and highlands.
//
// This layer intentionally owns no collision, interaction, lighting or material state. It can be
// added to the existing zoo Build.scene before Build.finish so its opaque primitives share the
// scene's normal static batches.
const ZooArtWest = (() => {
  'use strict';

  const LIMIT = 80;
  const STRUCTURE_LOD = 26;
  const VEGETATION_LOD = 34;
  const EPS = 1e-4;
  const HABITAT_BOUNDS = Object.freeze({
    H10: Object.freeze([-50, -39, -9, -1]),
    H11: Object.freeze([-50, -39, 2, 15]),
    H12: Object.freeze([-34, -24, -9, 3.5]),
    H13: Object.freeze([-34, -24, 6, 15]),
    H20: Object.freeze([-50, -39, 26, 37]),
    H21: Object.freeze([-34, -24, 26, 37]),
  });

  function build(B, context = {}) {
    void context;
    const { box, cyl, ball, capsule, taper, flat } = B;
    if (![box, cyl, ball, capsule, taper, flat].every(q => typeof q === 'function'))
      throw new Error('ZooArtWest: Build primitives are incomplete');

    const color = typeof C === 'function' ? C : value => value;
    const P = Object.freeze({
      water: color('#365f67'),
      waterEdge: color('#4d7e82'),
      mud: color('#6b583c'),
      wetEarth: color('#735f43'),
      sand: color('#b9a06f'),
      reed: color('#668c49'),
      reedDark: color('#487139'),
      timber: color('#72563e'),
      timberDark: color('#513d2f'),
      scree: color('#77766f'),
      screeLight: color('#99978e'),
      shadow: color('#565b57'),
      pine: color('#315a40'),
      snow: color('#d9ddd7'),
    });
    const made = [];
    const ids = [];

    function group(code) {
      const prefix = `ART-${code}`;
      let child = 0;
      return (prop, lod = STRUCTURE_LOD) => {
        if (!prop) throw new Error(`ZooArtWest: ${prefix} primitive returned no prop`);
        const id = child === 0 ? prefix : `${prefix}/G${String(child).padStart(2, '0')}`;
        child++;
        prop.blueprintId = id;
        prop.zooLodMax = lod;
        made.push(prop);
        ids.push(id);
        if (made.length > LIMIT) throw new Error(`ZooArtWest: ${LIMIT}-prop budget exceeded`);
        return prop;
      };
    }

    function inside(code, x, z, hx, hz) {
      const [x0, x1, z0, z1] = HABITAT_BOUNDS[code];
      if (x - hx <= x0 + EPS || x + hx >= x1 - EPS ||
          z - hz <= z0 + EPS || z + hz >= z1 - EPS)
        throw new Error(`ZooArtWest: ${code} art leaves habitat bounds at ${x},${z}`);
    }

    function surface(code, add, x, z, w, d, pigment, opt = {}) {
      const yaw = opt.ry || 0;
      const hx = Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * d / 2;
      const hz = Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * d / 2;
      inside(code, x, z, hx, hz);
      return add(flat(x, opt.y === undefined ? .018 : opt.y, z, w, d, pigment,
        { mode: opt.mode === undefined ? 10 : opt.mode, gloss: opt.gloss || .06,
          ...(yaw ? { ry: yaw } : {}) }));
    }

    function stone(code, add, x, z, rx, ry, rz, pigment = P.screeLight) {
      inside(code, x, z, rx, rz);
      return add(ball(x, ry * .72, z, rx, ry, rz, pigment, { mode: 10, gloss: .055 }));
    }

    function ledge(code, add, x, z, w, h, d, yaw = 0, pigment = P.scree) {
      const hx = Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * d / 2;
      const hz = Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * d / 2;
      inside(code, x, z, hx, hz);
      return add(ball(x, h / 2, z, w / 2, h / 2, d / 2, pigment,
        { mode: 10, gloss: .055, ...(yaw ? { ry: yaw } : {}) }));
    }

    function groundLog(code, add, x, z, length, radius, yaw = 0) {
      const hx = Math.abs(Math.cos(yaw)) * length / 2 + Math.abs(Math.sin(yaw)) * radius;
      const hz = Math.abs(Math.sin(yaw)) * length / 2 + Math.abs(Math.cos(yaw)) * radius;
      inside(code, x, z, hx, hz);
      return add(capsule(x, radius / 2, z, radius, length, radius, P.timberDark,
        { gloss: .10, rz: Math.PI / 2, ry: yaw }));
    }

    function reed(code, add, x, z, height, width = .20, dark = false) {
      inside(code, x, z, width / 2, width / 2);
      return add(taper(x, height / 2, z, width, height, width,
        dark ? P.reedDark : P.reed, { mode: 15, gloss: .035 }), VEGETATION_LOD);
    }

    function pine(code, add, x, z, height, spread) {
      inside(code, x, z, spread / 2, spread / 2);
      add(cyl(x, height * .23, z, .105, height * .46, P.timberDark,
        { gloss: .10 }));
      add(taper(x, height * .61, z, spread, height * .76, spread, P.pine,
        { mode: 15, gloss: .035 }), VEGETATION_LOD);
    }

    // H10 — a tight otter stream: deep water, a broken pebble shelf and clustered cover leave the
    // east viewing edge legible while the west keeper landing remains visually open.
    {
      const add = group('H10');
      surface('H10', add, -46.1, -5.0, 5.35, 6.35, P.water, { mode: 16, gloss: .31 });
      surface('H10', add, -43.12, -5.15, .46, 6.05, P.waterEdge,
        { mode: 16, gloss: .24, ry: -.025, y: .024 });
      surface('H10', add, -41.55, -4.95, 2.45, 6.35, P.wetEarth,
        { mode: 10, gloss: .055, ry: .025, y: .026 });
      surface('H10', add, -47.75, -3.45, 1.55, .42, P.mud,
        { mode: 10, gloss: .08, ry: .18, y: .033 });
      // H10/OPS01 owns the feed position at (-42,-7.3); keep its silhouette unobstructed.
      stone('H10', add, -40.65, -2.55, .50, .30, .38, P.scree);
      groundLog('H10', add, -45.25, -6.35, 2.05, .17, .42);
      reed('H10', add, -48.15, -7.45, 1.05, .22, true);
      reed('H10', add, -47.35, -2.25, .84, .18);
      reed('H10', add, -43.62, -7.72, .92, .20);
      reed('H10', add, -43.48, -2.38, 1.12, .22, true);
      stone('H10', add, -41.25, -7.95, .34, .20, .27, P.screeLight);
      surface('H10', add, -40.45, -6.15, .62, 1.55, P.mud,
        { mode: 10, gloss: .07, ry: -.10, y: .034 });
    }

    // H11 — broad hippo water reads as a heavy pool rather than another lawn rectangle. Churned
    // bank wear is concentrated around the feeding side; reeds screen only the far corners.
    {
      const add = group('H11');
      surface('H11', add, -45.75, 8.35, 5.55, 9.75, P.water,
        { mode: 16, gloss: .30 });
      surface('H11', add, -42.62, 8.55, .52, 9.15, P.waterEdge,
        { mode: 16, gloss: .23, ry: .018, y: .024 });
      surface('H11', add, -40.78, 8.45, 2.02, 9.65, P.sand,
        { mode: 10, gloss: .045, ry: -.016, y: .025 });
      surface('H11', add, -41.30, 6.10, 1.20, 2.35, P.mud,
        { mode: 10, gloss: .085, ry: -.16, y: .034 });
      surface('H11', add, -40.45, 8.25, .56, 4.15, P.wetEarth,
        { mode: 10, gloss: .07, ry: .07, y: .036 });
      stone('H11', add, -42.05, 4.05, .58, .32, .43, P.scree);
      stone('H11', add, -41.35, 13.55, .52, .28, .36);
      groundLog('H11', add, -44.35, 4.15, 1.65, .16, .22);
      reed('H11', add, -48.05, 3.62, 1.20, .23, true);
      reed('H11', add, -47.42, 13.22, .98, .19);
      reed('H11', add, -43.28, 5.25, .90, .20);
      reed('H11', add, -43.18, 12.42, 1.16, .23, true);
      surface('H11', add, -48.70, 5.35, .46, 1.62, P.mud,
        { mode: 10, gloss: .07, ry: -.08, y: .033 });
    }

    // H12 — flamingo shallows use two water tones, low nesting shelves and uneven reed islands.
    // The keeper line from the east gate at z=-3 remains completely uncluttered.
    {
      const add = group('H12');
      surface('H12', add, -29.0, -3.20, 7.55, 8.72, P.waterEdge,
        { mode: 16, gloss: .27 });
      surface('H12', add, -29.15, 1.28, 7.05, .52, P.water,
        { mode: 16, gloss: .23, ry: -.03, y: .025 });
      // Canonical mud islands already occupy both wading stops; duplicating them buried the birds.
      surface('H12', add, -27.20, -6.78, 1.18, .40, P.mud,
        { mode: 10, gloss: .075, ry: -.12, y: .034 });
      // H12/OPS01 owns the south-west feeding focus and remains visually open.
      reed('H12', add, -31.72, .62, 1.12, .22);
      reed('H12', add, -29.15, .92, .82, .17, true);
      reed('H12', add, -26.12, .48, 1.25, .24);
      reed('H12', add, -25.55, -5.85, .88, .18, true);
      reed('H12', add, -32.55, -1.72, 1.05, .21);
      surface('H12', add, -24.52, -4.30, .54, 1.05, P.sand,
        { mode: 10, gloss: .065, y: .035 });
    }

    // H13 — crane marsh: a broken wet meadow edge and taller, asymmetric reed masses leave a long
    // open sightline across the central pool and avoid the east service approach.
    {
      const add = group('H13');
      surface('H13', add, -29.0, 9.48, 7.52, 4.20, P.waterEdge,
        { mode: 16, gloss: .25 });
      surface('H13', add, -28.95, 11.88, 7.35, .52, P.wetEarth,
        { mode: 10, gloss: .07, ry: .025, y: .028 });
      surface('H13', add, -30.05, 8.78, 4.05, 1.82, P.water,
        { mode: 16, gloss: .29, ry: -.05, y: .027 });
      surface('H13', add, -32.72, 12.85, .48, 2.55, P.mud,
        { mode: 10, gloss: .07, ry: -.06, y: .034 });
      groundLog('H13', add, -29.55, 10.72, 1.48, .13, -.48);
      stone('H13', add, -27.42, 10.62, .62, .12, .48, P.mud);
      reed('H13', add, -32.42, 8.02, 1.22, .23, true);
      reed('H13', add, -31.12, 9.12, .92, .18);
      reed('H13', add, -29.22, 7.45, 1.08, .21, true);
      reed('H13', add, -27.18, 8.72, 1.28, .24);
      reed('H13', add, -25.52, 10.18, .88, .18, true);
      reed('H13', add, -31.82, 11.18, 1.14, .22);
      surface('H13', add, -25.12, 13.82, 1.20, .48, P.sand,
        { mode: 10, gloss: .055, ry: .08, y: .034 });
    }

    // H20 — takin highland: broad scree and shadow strata carry clustered rock massing. Two pines
    // anchor opposite corners without becoming the repeated lollipop-tree rhythm of the old pen.
    {
      const add = group('H20');
      surface('H20', add, -44.50, 31.50, 9.42, 9.35, P.scree,
        { mode: 10, gloss: .05 });
      surface('H20', add, -44.28, 34.82, 8.38, .72, P.shadow,
        { mode: 10, gloss: .045, ry: .07, y: .029 });
      surface('H20', add, -41.80, 29.20, .56, 3.55, P.wetEarth,
        { mode: 10, gloss: .055, ry: .12, y: .033 });
      stone('H20', add, -45.25, 32.12, 1.42, .62, 1.05, P.screeLight);
      stone('H20', add, -42.15, 35.02, .88, .44, .64, P.scree);
      stone('H20', add, -48.02, 35.20, .72, .36, .50, P.screeLight);
      pine('H20', add, -47.35, 28.55, 4.15, 1.55);
      pine('H20', add, -40.38, 27.65, 3.45, 1.28);
      ledge('H20', add, -41.25, 32.15, 1.62, .30, .76, -.18, P.screeLight);
      surface('H20', add, -46.72, 30.05, 1.85, .56, P.shadow,
        { mode: 10, gloss: .04, ry: -.16, y: .036 });
      surface('H20', add, -41.02, 33.20, .82, 1.12, P.sand,
        { mode: 10, gloss: .05, ry: .05, y: .037 });
    }

    // H21 — snow leopard highland: colder scree, snow-shadow pockets, a deadfall terrace and one
    // wind-shaped conifer create a steep, quiet silhouette while the east service gate stays open.
    {
      const add = group('H21');
      surface('H21', add, -29.0, 31.48, 8.92, 9.42, P.scree,
        { mode: 10, gloss: .045 });
      surface('H21', add, -29.15, 34.82, 8.20, .72, P.shadow,
        { mode: 10, gloss: .04, ry: -.06, y: .029 });
      surface('H21', add, -31.15, 27.92, 2.20, 1.10, P.snow,
        { mode: 10, gloss: .08, ry: .18, y: .034 });
      surface('H21', add, -29.72, 35.62, 2.45, .70, P.snow,
        { mode: 10, gloss: .075, ry: -.12, y: .035 });
      stone('H21', add, -31.30, 32.20, 1.36, .70, 1.02, P.screeLight);
      // H21/OPS01 owns the south-east trough position.
      stone('H21', add, -25.52, 29.08, .68, .34, .52, P.scree);
      groundLog('H21', add, -32.10, 27.50, 2.08, .15, .55);
      pine('H21', add, -32.20, 30.80, 3.55, 1.30);
      surface('H21', add, -26.12, 35.72, 1.35, .42, P.shadow,
        { mode: 10, gloss: .035, ry: .08, y: .037 });
      surface('H21', add, -27.40, 27.28, 1.62, .42, P.wetEarth,
        { mode: 10, gloss: .05, ry: -.10, y: .037 });
      surface('H21', add, -25.15, 31.58, .58, 1.18, P.sand,
        { mode: 10, gloss: .05, ry: .04, y: .038 });
    }

    if (new Set(ids).size !== ids.length)
      throw new Error('ZooArtWest: duplicate stable art ID');
    return Object.freeze({ props: made, ids: Object.freeze(ids.slice()) });
  }

  return Object.freeze({ build });
})();

if (typeof globalThis !== 'undefined') globalThis.ZooArtWest = ZooArtWest;
