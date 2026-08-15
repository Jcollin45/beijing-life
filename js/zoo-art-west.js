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
      pineDark: color('#254735'),
      pine: color('#315a40'),
      pineLight: color('#47725a'),
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

    function patch(code, add, x, z, rx, rz, pigment, opt = {}) {
      const { y = .032, thickness = .030, ...rest } = opt;
      inside(code, x, z, rx, rz);
      return add(ball(x, y, z, rx, thickness, rz, pigment,
        { mode: 10, gloss: .055, ...rest }));
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
      // A narrow, gently leaning blade reads as marsh growth; the former square-section upright
      // repeated as a row of green stakes in the long wetland view. This remains one prop per clump.
      const leanX = Math.sin(x * 1.73 + z * .91) * .050;
      const leanZ = Math.cos(x * .83 - z * 1.37) * .042;
      return add(taper(x, height / 2, z, width * .72, height, width * .46,
        dark ? P.reedDark : P.reed,
        { mode: 15, gloss: .035, rx: leanZ, rz: leanX }), VEGETATION_LOD);
    }

    function pine(code, add, x, z, height, spread) {
      inside(code, x, z, spread * .61, spread * .61);
      add(cyl(x, height * .23, z, .105, height * .46, P.timberDark,
        { gloss: .10 }));
      // Two offset, unequal tiers replace the single oversized cone used by both highland pens.
      // One extra prop per tree is funded by folding a tiny ground accent into each habitat's
      // larger strata, so the outdoor scene's measured prop budget remains exactly unchanged.
      const lower = add(taper(x - spread * .065, height * .52, z + spread * .045,
        spread * .94, height * .58, spread * .70, P.pineDark,
        { mode: 15, gloss: .035, ry: .17, rz: -.028 }), VEGETATION_LOD);
      const upper = add(taper(x + spread * .075, height * .74, z - spread * .055,
        spread * .66, height * .43, spread * .78, P.pineLight,
        { mode: 15, gloss: .035, ry: -.22, rz: .020 }), VEGETATION_LOD);
      for (const crown of [lower, upper]) {
        crown.artPine = code;
        crown.treeLod = 'near';
      }
    }

    // H10 — a tight otter stream: deep water, a broken pebble shelf and clustered cover leave the
    // east viewing edge legible while the west keeper landing remains visually open.
    {
      const add = group('H10');
      // The canonical stream already owns the water plane. Art supplies only a narrow glint and
      // irregular bank wear; a second full rectangle made the habitat look like a tiled basin.
      surface('H10', add, -43.12, -5.15, .46, 6.05, P.waterEdge,
        { mode: 16, gloss: .24, ry: -.025, y: .040 });
      // Pull the irregular bank skin toward the public edge. Its curved outline now breaks the
      // canonical rock-bank rectangle while remaining behind the barrier and clear of every otter.
      patch('H10', add, -40.30, -4.95, .72, 2.60, P.wetEarth, { ry: .035 });
      patch('H10', add, -47.75, -3.45, .74, .23, P.mud, { ry: .18, gloss: .08 });
      // H10/OPS01 owns the feed position at (-42,-7.3); keep its silhouette unobstructed.
      stone('H10', add, -40.65, -2.55, .50, .30, .38, P.scree);
      reed('H10', add, -48.15, -7.45, 1.05, .22, true);
      reed('H10', add, -47.35, -2.25, .84, .18);
      // Paired near-bank blades frame the viewing window instead of forming another mid-pool row.
      reed('H10', add, -40.08, -7.72, .92, .20);
      reed('H10', add, -40.10, -2.38, 1.12, .22, true);
      stone('H10', add, -41.25, -7.95, .34, .20, .27, P.screeLight);
      patch('H10', add, -40.45, -6.15, .28, .70, P.mud, { ry: -.10, gloss: .07 });
    }

    // H11 — broad hippo water reads as a heavy pool rather than another lawn rectangle. Churned
    // bank wear is concentrated around the feeding side; reeds screen only the far corners.
    {
      const add = group('H11');
      // Pool water comes from the canonical habitat object; this thin highlight keeps depth without
      // laying a second perfectly rectangular sheet over it.
      surface('H11', add, -42.62, 8.55, .52, 9.15, P.waterEdge,
        { mode: 16, gloss: .23, ry: .018, y: .040 });
      patch('H11', add, -40.78, 8.45, .88, 4.42, P.sand, { ry: -.016 });
      patch('H11', add, -41.30, 6.10, .53, 1.03, P.mud, { ry: -.16, gloss: .085 });
      patch('H11', add, -40.45, 8.25, .25, 1.86, P.wetEarth, { ry: .07, gloss: .07 });
      // Leave the morning feeding apron open: the canonical trough and the hippo already give
      // this bank a focal object, while the old extra stone occupied the animal's whole shoulder.
      stone('H11', add, -41.35, 13.55, .52, .28, .36);
      groundLog('H11', add, -44.35, 4.15, 1.65, .16, .22);
      reed('H11', add, -48.05, 3.62, 1.20, .23, true);
      reed('H11', add, -47.42, 13.22, .98, .19);
      reed('H11', add, -43.28, 5.25, .90, .20);
      reed('H11', add, -43.18, 12.42, 1.16, .23, true);
      patch('H11', add, -48.70, 5.35, .21, .73, P.mud, { ry: -.08, gloss: .07 });
    }

    // H12 — flamingo shallows use two water tones, low nesting shelves and uneven reed islands.
    // The keeper line from the east gate at z=-3 remains completely uncluttered.
    {
      const add = group('H12');
      // Canonical wetland water remains the dominant surface; the art layer adds a slim color seam.
      surface('H12', add, -29.15, 1.28, 7.05, .52, P.water,
        { mode: 16, gloss: .23, ry: -.03, y: .025 });
      // Canonical mud islands already occupy both wading stops; duplicating them buried the birds.
      patch('H12', add, -27.20, -6.78, .53, .18, P.mud, { ry: -.12, gloss: .075 });
      // H12/OPS01 owns the south-west feeding focus and remains visually open.
      reed('H12', add, -31.72, .62, 1.12, .22);
      reed('H12', add, -29.15, .92, .82, .17, true);
      reed('H12', add, -26.12, .48, 1.25, .24);
      reed('H12', add, -25.55, -5.85, .88, .18, true);
      reed('H12', add, -32.55, -1.72, 1.05, .21);
      patch('H12', add, -24.52, -4.30, .24, .47, P.sand, { gloss: .065 });
    }

    // H13 — crane marsh: a broken wet meadow edge and taller, asymmetric reed masses leave a long
    // open sightline across the central pool and avoid the east service approach.
    {
      const add = group('H13');
      patch('H13', add, -28.95, 11.88, 3.32, .23, P.wetEarth, { ry: .025, gloss: .07 });
      // The canonical shallow pool already supplies the wet inset; a third water plane only nine
      // millimetres above it caused depth shimmer and another obvious rectangular tile.
      patch('H13', add, -32.72, 12.85, .21, 1.14, P.mud, { ry: -.06, gloss: .07 });
      groundLog('H13', add, -29.55, 10.72, 1.48, .13, -.48);
      stone('H13', add, -27.42, 10.62, .62, .12, .48, P.mud);
      reed('H13', add, -32.42, 8.02, 1.22, .23, true);
      reed('H13', add, -31.12, 9.12, .92, .18);
      reed('H13', add, -29.22, 7.45, 1.08, .21, true);
      reed('H13', add, -27.18, 8.72, 1.28, .24);
      reed('H13', add, -25.52, 10.18, .88, .18, true);
      reed('H13', add, -31.82, 11.18, 1.14, .22);
      patch('H13', add, -25.12, 13.82, .54, .21, P.sand, { ry: .08 });
    }

    // H20 — takin highland: broad scree and shadow strata carry clustered rock massing. Two pines
    // anchor opposite corners without becoming the repeated lollipop-tree rhythm of the old pen.
    {
      const add = group('H20');
      // The canonical habitat floor stays visible. Broken oval strata create highland geology
      // without carpeting the entire rectangular pen with a second slab.
      patch('H20', add, -46.35, 34.78, 2.10, .30, P.shadow, { ry: .10 });
      patch('H20', add, -42.65, 34.88, 1.72, .27, P.shadow, { ry: -.08 });
      patch('H20', add, -41.80, 29.20, .25, 1.59, P.wetEarth, { ry: .12 });
      stone('H20', add, -42.15, 35.02, .88, .44, .64, P.scree);
      stone('H20', add, -48.02, 35.20, .72, .36, .50, P.screeLight);
      pine('H20', add, -40.38, 27.65, 3.45, 1.28);
      ledge('H20', add, -41.25, 32.15, 1.62, .30, .76, -.18, P.screeLight);
      patch('H20', add, -46.72, 30.05, .83, .25, P.shadow, { ry: -.16 });
    }

    // H21 — snow leopard highland: colder scree, snow-shadow pockets, a deadfall terrace and one
    // wind-shaped conifer create a steep, quiet silhouette while the east service gate stays open.
    {
      const add = group('H21');
      patch('H21', add, -31.10, 34.78, 1.80, .29, P.shadow, { ry: -.08 });
      patch('H21', add, -27.35, 34.88, 1.68, .27, P.shadow, { ry: .09 });
      patch('H21', add, -31.15, 27.92, .99, .50, P.snow, { ry: .18, gloss: .08 });
      patch('H21', add, -29.72, 35.62, 1.10, .31, P.snow, { ry: -.12, gloss: .075 });
      stone('H21', add, -31.30, 32.20, 1.36, .70, 1.02, P.screeLight);
      // H21/OPS01 owns the south-east trough position.
      stone('H21', add, -25.52, 29.08, .68, .34, .52, P.scree);
      groundLog('H21', add, -32.10, 27.50, 2.08, .15, .55);
      pine('H21', add, -32.20, 30.80, 3.55, 1.30);
      patch('H21', add, -26.12, 35.72, .61, .19, P.shadow, { ry: .08 });
      patch('H21', add, -27.40, 27.28, .73, .19, P.wetEarth, { ry: -.10 });
    }

    if (new Set(ids).size !== ids.length)
      throw new Error('ZooArtWest: duplicate stable art ID');
    return Object.freeze({ props: made, ids: Object.freeze(ids.slice()) });
  }

  return Object.freeze({ build });
})();

if (typeof globalThis !== 'undefined') globalThis.ZooArtWest = ZooArtWest;
