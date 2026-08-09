// Visual-only biome pass for the seven preserved zoo habitats.
//
// This module deliberately owns no collision, interaction, lighting or animal state.  It is a
// deterministic layer of low terrain, planting and husbandry props that can be appended to the
// existing Zoo Build.scene before Build.finish().  All coordinates remain in the established zoo
// scene frame and every footprint is checked against the original habitat rectangle at build time.
const ZooArtCore = (() => {
  'use strict';

  const EPS = 1e-6;
  const FINE_LOD = 26;
  const VEGETATION_LOD = 34;
  const BOUNDS = Object.freeze({
    H00: Object.freeze([-6, 0, -11, -5.5]),
    H01: Object.freeze([5, 14, -11, -5.5]),
    H02: Object.freeze([-16, -8, -2.5, 4]),
    H03: Object.freeze([-4, 2, -2.5, 4]),
    H04: Object.freeze([6, 16, -2.5, 4]),
    H05: Object.freeze([-13, -5, 7, 13.5]),
    H06: Object.freeze([1, 10, 7, 13.5]),
  });

  const pad = n => String(n).padStart(2, '0');

  function build(B, context = {}) {
    if (!B || !Array.isArray(B.props))
      throw new Error('ZooArtCore.build requires an unfinished Build.scene');
    for (const name of ['box', 'cyl', 'ball', 'capsule', 'flat'])
      if (typeof B[name] !== 'function')
        throw new Error(`ZooArtCore.build requires Build.${name}`);

    const source = context.colors || context.col || {};
    const tone = (key, hex) => source[key] || C(hex);
    // These values match the existing zoo palette exactly, allowing the new opaque primitives to
    // join its current batches without creating a second material family.
    const P = Object.freeze({
      grass: tone('grass', '#5c7442'),
      grassD: tone('grassD', '#4a6136'),
      grassL: tone('grassL', '#6b8449'),
      stone: tone('stone', '#918c83'),
      stoneD: tone('stoneD', '#6f6a62'),
      stoneL: tone('stoneL', '#a8a29a'),
      water: tone('water', '#3d565c'),
      waterD: tone('waterD', '#334750'),
      sand: tone('sand', '#c2ad82'),
      sandD: tone('sandD', '#9c8b6a'),
      mud: tone('mud', '#6b5a45'),
      mudD: tone('mudD', '#54462f'),
      trunk: tone('trunk', '#5b4a38'),
      trunkL: tone('trunkL', '#74604a'),
      leaf: tone('leaf', '#4f7a3c'),
      leafD: tone('leafD', '#3c6130'),
      leafL: tone('leafL', '#6b9450'),
      willow: tone('willow', '#6d8f45'),
      steel: tone('steel', '#a7adb2'),
      steelD: tone('steelD', '#7b8288'),
      black: tone('black', '#22262b'),
    });

    const allProps = [];
    const ids = [];
    let activeBounds = null;
    let activeId = '';

    function inside(x0, x1, z0, z1) {
      const b = activeBounds;
      if (!b || x0 < b[0] - EPS || x1 > b[1] + EPS || z0 < b[2] - EPS || z1 > b[3] + EPS)
        throw new Error(`${activeId}: art footprint [${x0},${x1}] x [${z0},${z1}] leaves habitat bounds`);
    }

    function keep(p, lod = FINE_LOD) {
      if (!p) throw new Error(`${activeId}: Build primitive returned no prop`);
      p.zooLodMax = lod;
      return p;
    }

    // Overlapping, almost-flat ellipsoids replace rectangular paint swatches with soft, irregular
    // substrate edges.  They remain ordinary opaque props and have no collision.
    function patch(x, z, rx, rz, color, mode = 10, y = .026) {
      inside(x - rx, x + rx, z - rz, z + rz);
      // Water joins the scene's established mode-16 surface batch. A water-shaded ellipsoid was
      // both an unnecessary draw type and visibly domed; water needs to read level.
      if (mode === 16)
        return keep(B.flat(x, y, z, rx * 2, rz * 2, color, { mode: 16, gloss: .52 }));
      // Mode 17 is a ground-plane grass shader. On a flattened ball it bends the whole patch like
      // foliage, so irregular turf/leaf-litter patches use the existing terrain batch instead.
      return keep(B.ball(x, y, z, rx, .035, rz, color,
        { mode: mode === 17 ? 10 : mode, gloss: .07 }));
    }

    function rock(x, z, rx, ry, rz, color = P.stone) {
      inside(x - rx, x + rx, z - rz, z + rz);
      return keep(B.ball(x, ry * .72, z, rx, ry, rz, color, { mode: 10, gloss: .06 }));
    }

    // A shrub is an understory mass rather than a trunk-and-ball tree.  Several overlapping shrubs
    // are placed as one asymmetrical screen in each applicable habitat.
    function shrub(x, z, rx, ry, rz, color = P.leafD) {
      inside(x - rx, x + rx, z - rz, z + rz);
      return keep(B.ball(x, ry * .82, z, rx, ry, rz, color,
        { mode: 15, gloss: .09 }), VEGETATION_LOD);
    }

    function box(x, y, z, w, h, d, color, opt = {}) {
      inside(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      return keep(B.box(x, y, z, w, h, d, color, { gloss: .10, ...opt }));
    }

    function cylinder(x, y, z, radius, height, color, opt = {}) {
      inside(x - radius, x + radius, z - radius, z + radius);
      return keep(B.cyl(x, y, z, radius, height, color, { gloss: .12, ...opt }));
    }

    function cone(x, y, z, w, h, d, color, opt = {}) {
      inside(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      // A faceted terrain ellipsoid shares the established rock batch while still giving the
      // shelter cap and termite mound a tapered-looking silhouette at habitat distance.
      return keep(B.ball(x, y, z, w / 2, h / 2, d / 2, color,
        { mode: 10, gloss: .08, ...opt }));
    }

    function upright(x, y, z, radius, height, color, opt = {}) {
      inside(x - radius, x + radius, z - radius, z + radius);
      return keep(B.capsule(x, y, z, radius, height, radius, color, { gloss: .12, ...opt }));
    }

    function log(x, y, z, radius, length, yaw, color = P.trunkL, opt = {}) {
      const hx = Math.abs(Math.cos(yaw)) * length / 2 + radius;
      const hz = Math.abs(Math.sin(yaw)) * length / 2 + radius;
      inside(x - hx, x + hx, z - hz, z + hz);
      return keep(B.capsule(x, y, z, radius, length, radius, color,
        { rz: Math.PI / 2, ry: yaw, gloss: .14, ...opt }));
    }

    function habitat(code, compose) {
      activeBounds = BOUNDS[code];
      activeId = `ART-${code}`;
      const start = B.props.length;
      compose();
      const made = B.props.slice(start);
      if (!made.length) throw new Error(`${activeId}: empty art group`);
      made.forEach((p, i) => {
        const id = i === 0 ? activeId : `${activeId}/G${pad(i)}`;
        p.blueprintId = id;
        ids.push(id);
        allProps.push(p);
      });
    }

    // H00 — a wet, slate-grey rookery.  The low shale fan leads from the south view to a sheltered
    // back-wall nest; the water and feeding pan remain visible between them.
    habitat('H00', () => {
      patch(-4.55, -9.45, 1.18, .72, P.stoneD);
      patch(-3.55, -9.05, 1.12, .58, P.stone);
      patch(-1.05, -6.35, .82, .52, P.stoneL);
      patch(-2.55, -6.85, 1.22, .76, P.waterD, 16, .032);
      // The base habitat's irregular haul-out rocks already form this sheltered corner. The old
      // extra cuboid-and-cap stack was the last purely decorative block form in the rookery.
      cylinder(-.62, .11, -8.42, .27, .14, P.steelD);
      box(-1.08, .035, -10.42, 1.26, .05, .18, P.black);
    });

    // H01 — a dry browse paddock.  Hoof-worn earth sweeps diagonally across the foreground while
    // one thorny back-corner thicket frames a termite mound and a low browse station.
    habitat('H01', () => {
      patch(6.10, -9.95, .92, .48, P.sandD);
      patch(10.20, -10.25, 1.48, .44, P.mud);
      // H01/O07 and its service-gate sweep own the entire north-east corner. The former two shrubs
      // grew through the painted safety square and the relocated browse tree now supplies the
      // intended soft backdrop farther south.
      cone(6.08, .62, -6.34, .92, 1.24, .82, P.mudD);
      rock(6.62, -6.43, .48, .24, .38, P.sandD);
      log(6.35, .075, -7.62, .15, 1.62, .18, P.trunkL);
      shrub(6.82, -7.48, .52, .28, .38, P.leaf);
      cylinder(13.02, .22, -9.12, .24, .40, P.stoneL);
    });

    // H02 — a cool bamboo-forest floor.  Moss, a small drinking hollow and deadwood occupy the
    // east clearing; the north understory closes the backdrop without blocking the public east rail.
    habitat('H02', () => {
      patch(-10.45, -1.62, 1.18, .56, P.grassD, 17);
      patch(-10.55, 3.08, 1.06, .48, P.mudD);
      patch(-9.22, .82, .66, .80, P.waterD, 16, .032);
      // Canonical H02/O07, both climbing frames and the compact bamboo groves already articulate
      // this edge. Extra boulders here buried the north frame and turned the clearing into clutter.
      // The south bamboo apron now hosts two scheduled feeding stops. Deadwood once laid across
      // that exact footing added no behavior the two purpose-built climbing frames do not supply.
      // The canonical H02/O08 fixture already supplies the browse platform at this edge.
    });

    // H03 — a planted woodland aviary.  A damp understory island anchors a natural forked roost;
    // the bright south clearing stays open for display, dust-bathing and feeding.
    habitat('H03', () => {
      patch(-2.72, 2.72, 1.02, .62, P.mudD);
      patch(.78, 2.96, .86, .44, P.grassD, 17);
      patch(.72, -1.42, .72, .50, P.sand);
      // H03/O04 feeder remains visible at the damp-island edge.
      shrub(-3.48, 3.28, .42, .32, .38, P.leafL);
      log(-1.48, 1.42, 2.02, .09, 2.32, .34, P.trunkL);
      upright(-2.46, 1.02, 1.66, .09, 2.02, P.trunk);
      cylinder(-2.86, .28, 3.42, .46, .18, P.trunkL);
      cylinder(-.18, .10, -1.46, .28, .12, P.sandD);
      patch(1.02, -.78, .30, .30, P.waterD, 16, .09);
    });

    // H04 — a worked elephant yard rather than a flat sand box.  Dust, compacted tracks and hardy
    // north-wall scrub lead to a rubbing-stone/browse-log cluster; keeper drainage stays at the rear.
    habitat('H04', () => {
      patch(7.88, -1.62, 1.22, .52, P.sand);
      patch(8.72, 2.78, 1.26, .60, P.sandD);
      patch(10.42, 3.30, 1.12, .34, P.mud);
      // Backdrop planting is east of the calf's (7.4,3.09) drink stop and west of the x=16
      // service gate. The rubbing stones sit on the foreground dust patch, clear of all six adult
      // and six calf schedule points.
      shrub(10.90, -1.85, .54, .42, .46, P.grassD);
      shrub(11.60, -1.95, .62, .38, .42, P.grass);
      shrub(12.30, -1.82, .52, .34, .46, P.grassL);
      // The canonical south-west rubbing outcrop supplies the stone mass here; duplicating it in
      // the art layer made a dense boulder pile and narrowed the elephants' open walking ground.
      log(8.12, .095, 1.08, .19, 2.10, .24, P.trunkL);
      rock(10.58, -1.52, .52, .38, .44, P.sand);
      box(15.18, .035, 3.38, 1.16, .05, .18, P.steelD);
    });

    // H05 — a water-ringed macaque island.  Mossy ledges rise toward one high rope-and-platform
    // composition, backed by dense north-east scrub; the front half of the hill remains a clear stage.
    habitat('H05', () => {
      patch(-9.12, 9.42, 1.42, .54, P.stoneD);
      patch(-10.52, 10.12, .82, .48, P.grassD, 17);
      shrub(-6.08, 12.58, .62, .48, .50, P.leafD);
      shrub(-6.62, 12.88, .66, .40, .46, P.leaf);
      // H05/O10 habitat camera owns the north-east corner.
      log(-8.92, 3.22, 11.82, .075, 3.62, 0, P.trunkL);
      upright(-10.66, 1.88, 11.82, .11, 3.76, P.trunk);
      box(-7.18, 2.18, 11.48, 1.22, .18, 1.00, P.trunkL);
      // The macaque's 11:00 grooming root owns this foreground ledge; another freestanding stone
      // here merged with its body and added no useful structure to the island composition.
      // The canonical H05/O08 trough and the keeper ingress own this corner.
    });

    // H06 — a shaded forest-edge tiger habitat.  Leaf litter flows toward an irregular bathing
    // pool, with one screened back corner and a scent-post/feed cluster kept clear of the south view.
    habitat('H06', () => {
      patch(3.10, 8.22, 1.18, .54, P.grassD, 17);
      patch(5.18, 12.54, 1.34, .46, P.mudD);
      patch(7.72, 11.10, 1.42, .78, P.mud);
      // One irregular water plane reads as a pool. The former second rectangle sat only 4 mm
      // above it and flickered into a conspicuous nested tile at the wide camera.
      patch(8.02, 11.02, 1.16, .62, P.water, 16, .040);
      shrub(2.00, 12.65, .64, .46, .52, P.leafD);
      shrub(2.75, 12.95, .58, .38, .42, P.leaf);
      upright(4.06, .86, 11.46, .14, 1.72, P.trunk);
      rock(8.72, 8.08, .71, .22, .41, P.stoneD);
      log(5.72, .080, 12.72, .16, 2.18, .12, P.trunkL);
    });

    if (allProps.length > 75)
      throw new Error(`ZooArtCore: ${allProps.length} props exceeds the 75-prop budget`);
    if (new Set(ids).size !== ids.length)
      throw new Error('ZooArtCore: duplicate generated blueprintId');
    return { props: allProps, ids };
  }

  return Object.freeze({ build, bounds: BOUNDS });
})();

if (typeof globalThis !== 'undefined') globalThis.ZooArtCore = ZooArtCore;
