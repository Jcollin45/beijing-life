// Visual-only civic art pass for zoo entrances, public buildings and path verges.
//
// Append this deterministic layer to the unfinished outdoor Build.scene.  It deliberately creates
// no gameplay state: no collision, blockers, interactions, tags, lights, glow, alpha or materials.
// The compositions use the revision-2 zoo frame and keep every public threshold clear at grade.
const ZooArtInfrastructure = (() => {
  'use strict';

  const EPS = 1e-6;
  const SITE = Object.freeze([-58, 58, -16, 70]);
  const FINE_LOD = 26;
  const PLANT_LOD = 34;
  const pad = n => String(n).padStart(2, '0');

  function build(B, context = {}) {
    if (!B || !Array.isArray(B.props))
      throw new Error('ZooArtInfrastructure.build requires an unfinished Build.scene');
    for (const name of ['box', 'ball', 'capsule', 'taper'])
      if (typeof B[name] !== 'function')
        throw new Error(`ZooArtInfrastructure.build requires Build.${name}`);

    const gameplayBefore = Object.fromEntries(['solids', 'blockers', 'things', 'lights']
      .map(key => [key, Array.isArray(B[key]) ? B[key].length : null]));
    const source = context.colors || context.col || {};
    const tone = (key, hex) => source[key] || C(hex);
    // Exact matches to the existing zoo palette preserve current opaque batch signatures.
    const P = Object.freeze({
      brick: tone('brickR', '#a2705a'),
      brickD: tone('redD', '#7f2a20'),
      roof: tone('roofG', '#3f6a55'),
      roofD: tone('roofGD', '#31543f'),
      timber: tone('timber', '#74604a'),
      timberD: tone('timberD', '#5b4a38'),
      render: tone('render', '#e6dcc6'),
      stone: tone('stone', '#918c83'),
      stoneD: tone('stoneD', '#6f6a62'),
      leaf: tone('leaf', '#4f7a3c'),
      leafD: tone('leafD', '#3c6130'),
      leafL: tone('leafL', '#6b9450'),
      bamboo: tone('bamboo', '#7c9a44'),
      bambooD: tone('bambooD', '#5e7a33'),
      willow: tone('willow', '#6d8f45'),
      steelD: tone('steelD', '#7b8288'),
      soil: tone('soil', '#5b4937'),
    });

    const props = [];
    const ids = [];
    let sectionId = '';

    function finite(...values) {
      if (!values.every(Number.isFinite))
        throw new Error(`${sectionId}: non-finite infrastructure coordinate`);
    }

    function inSite(x0, x1, z0, z1) {
      finite(x0, x1, z0, z1);
      if (x0 < SITE[0] - EPS || x1 > SITE[1] + EPS ||
          z0 < SITE[2] - EPS || z1 > SITE[3] + EPS)
        throw new Error(`${sectionId}: footprint [${x0},${x1}] x [${z0},${z1}] leaves zoo site`);
    }

    function keep(p, lod) {
      if (!p) throw new Error(`${sectionId}: Build primitive returned no prop`);
      p.zooLodMax = lod;
      return p;
    }

    function box(x, y, z, w, h, d, color, opt = {}) {
      finite(x, y, z, w, h, d);
      inSite(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      return keep(B.box(x, y, z, w, h, d, color, { gloss: .12, ...opt }), FINE_LOD);
    }

    function shrub(x, z, rx, ry, rz, color = P.leafD) {
      finite(x, z, rx, ry, rz);
      inSite(x - rx, x + rx, z - rz, z + rz);
      return keep(B.ball(x, ry * .82, z, rx, ry, rz, color,
        { mode: 15, gloss: .09 }), PLANT_LOD);
    }

    function canopy(x, y, z, rx, ry, rz, color = P.leafD) {
      finite(x, y, z, rx, ry, rz);
      inSite(x - rx, x + rx, z - rz, z + rz);
      return keep(B.ball(x, y, z, rx, ry, rz, color,
        { mode:15, gloss:.08 }), PLANT_LOD);
    }

    function oval(x, y, z, rx, ry, rz, color, mode = 0) {
      finite(x, y, z, rx, ry, rz);
      inSite(x - rx, x + rx, z - rz, z + rz);
      return keep(B.ball(x, y, z, rx, ry, rz, color,{mode,gloss:.08}),FINE_LOD);
    }

    function trunk(x, y, z, w, h, d, color = P.timberD) {
      finite(x, y, z, w, h, d);
      inSite(x-w/2,x+w/2,z-d/2,z+d/2);
      return keep(B.capsule(x,y,z,w,h,d,color,{gloss:.10}),FINE_LOD);
    }

    function finial(x, y, z, w, h, d, color = P.roofD) {
      finite(x, y, z, w, h, d);
      inSite(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      return keep(B.taper(x, y, z, w, h, d, color, { gloss: .14 }), FINE_LOD);
    }

    function section(name, compose) {
      sectionId = `ART-INFRA-${name}`;
      const start = B.props.length;
      compose();
      const made = B.props.slice(start);
      if (!made.length) throw new Error(`${sectionId}: empty art section`);
      made.forEach((p, i) => {
        const id = i === 0 ? sectionId : `${sectionId}/G${pad(i)}`;
        p.blueprintId = id;
        props.push(p);
        ids.push(id);
      });
    }

    // Main entrance: two low, unequal planted verges terminate the arrival plaza without entering
    // the gate lane, either entrance branch or the spawn at (-12,-13.4).
    section('SOUTH-ARRIVAL', () => {
      box(-17.00, .21, -10.46, .80, .42, .66, P.brick);
      shrub(-17.15, -10.55, .25, .34, .28, P.leafD);
      shrub(-16.85, -10.26, .22, .27, .30, P.leafL);
      box(-7.00, .21, -10.46, .80, .42, .66, P.brick);
      shrub(-6.85, -10.55, .25, .34, .28, P.leafD);
      shrub(-7.15, -10.26, .22, .27, .30, P.leafL);
    });

    // West gate: planting sits east of B01 and entirely above/below P117's z=22..26 envelope, so
    // the seven-metre covered passage and secondary spawn remain visually and physically open.
    section('WEST-FORECOURT', () => {
      box(-54.66, .19, 20.72, 1.10, .38, .54, P.brickD);
      shrub(-54.82, 20.71, .42, .31, .22, P.leafD);
      shrub(-54.47, 20.82, .34, .25, .22, P.leafL);
      box(-54.66, .19, 27.34, 1.10, .38, .54, P.brickD);
      shrub(-54.48, 27.30, .42, .31, .22, P.leafD);
      shrub(-54.84, 27.44, .34, .25, .22, P.leafL);
    });

    // B02: a deep green awning and paired facade planters make the restroom legible as a public
    // building.  All ground pieces sit outside the x=-32..-30.4 entrance apron.
    section('B02-RESTROOM', () => {
      box(-31.20, 2.48, 20.50, 2.60, .16, .64, P.roof);
      box(-31.20, 2.36, 20.18, 2.78, .15, .12, P.roofD);
      box(-33.18, .21, 20.58, 1.12, .42, .50, P.brick);
      shrub(-33.18, 20.54, .46, .34, .20, P.leafD);
      box(-29.30, .21, 20.58, 1.12, .42, .50, P.brick);
      shrub(-29.30, 20.63, .46, .34, .20, P.leafL);
      box(-33.66, 1.38, 20.65, .18, 2.18, .16, P.timberD);
    });

    // B03 repeats the same civic vocabulary at a wider scale while keeping the x=45..47 apron and
    // the public door at (46,20.7) unobstructed.
    section('B03-REST-HUB', () => {
      box(46.00, 2.48, 20.50, 3.10, .16, .64, P.roof);
      box(46.00, 2.36, 20.18, 3.28, .15, .12, P.roofD);
      box(43.22, .21, 20.58, 1.18, .42, .50, P.brick);
      shrub(43.22, 20.54, .48, .35, .20, P.leafD);
      box(48.78, .21, 20.58, 1.18, .42, .50, P.brick);
      shrub(48.78, 20.63, .48, .35, .20, P.leafL);
      box(49.46, 1.38, 20.65, .18, 2.18, .16, P.timberD);
    });

    // B04: substantial ridge, fascia and west-side timber screens enrich the lakeside pavilion.
    // Nothing projects into its east ramp rectangle x=-9.2..-4.5, z=28.2..29.8.
    section('B04-LAKE-PAVILION', () => {
      box(-11.00, 4.34, 29.50, 2.60, .12, .16, P.roofD);
      finial(-11.00, 4.68, 29.50, .42, .58, .42, P.roofD);
      box(-12.62, 1.66, 28.42, .16, 2.42, 1.02, P.timberD);
      box(-12.62, 1.66, 30.58, .16, 2.42, 1.02, P.timberD);
      box(-11.00, 3.66, 31.38, 3.10, .22, .16, P.timber);
      box(-11.00, 3.66, 27.62, 3.10, .22, .16, P.timber);
    });

    // B05/B06: paired full-height timber screens, broad eave bands and asymmetric inner-court
    // planting create a shared conservation-campus rhythm.  Screens flank—not cross—the four door
    // openings, and planters stop south of the elevated bridge at z=58.
    section('CONSERVATION-CAMPUS', () => {
      box(-15.24, 2.36, 55.05, .22, 3.62, .14, P.timberD);
      box(-14.42, 2.36, 55.05, .22, 3.62, .14, P.timber);
      box(-14.82, 4.72, 55.04, 4.18, .18, .22, P.roofD);
      box(-5.25, .24, 57.10, .74, .48, 1.20, P.brick);
      shrub(-5.30, 56.78, .34, .42, .42, P.bambooD);
      shrub(-5.18, 57.42, .38, .34, .38, P.bamboo);
      box(3.52, 2.36, 55.05, .22, 3.62, .14, P.timberD);
      box(4.36, 2.36, 55.05, .22, 3.62, .14, P.timber);
      box(3.94, 4.72, 55.04, 4.20, .18, .22, P.roofD);
      box(1.54, .24, 56.42, .74, .48, 1.56, P.brick);
      shrub(1.56, 56.10, .34, .42, .54, P.bambooD);
      shrub(1.48, 56.80, .38, .34, .48, P.bamboo);
    });

    // B07: a single deep hospital-view bay adds facade depth while preserving the public focus at
    // (-47,40).  Low planting is recessed behind the z=42.5 compound line and leaves its centre open.
    section('B07-HOSPITAL-VIEW', () => {
      box(-47.00, 3.34, 42.26, 5.00, .22, .78, P.roofD);
      box(-49.20, 1.82, 42.64, .50, 3.64, .72, P.render);
      box(-44.80, 1.82, 42.64, .50, 3.64, .72, P.render);
      oval(-48.10, .36, 42.48, .73, .24, .14, P.stoneD,10);
      box(-50.20, .20, 42.72, 1.02, .40, .48, P.brickD);
      shrub(-50.20, 42.74, .42, .30, .20, P.leafD);
      box(-43.80, .20, 42.72, 1.02, .40, .48, P.brickD);
      shrub(-43.80, 42.74, .42, .30, .20, P.leafL);
    });

    // B08: two dense, layered facade planters bracket the main door from outside its z=50.4..53.6
    // opening.  The south group also stays well clear of WS105 and the return point at (23.2,52);
    // no detail is placed near the east service door at (50,59).
    section('B08-TROPICAL-FORECOURT', () => {
      box(25.46, .26, 47.18, .76, .52, 2.06, P.brickD);
      shrub(25.45, 46.72, .34, .54, .54, P.leafD);
      shrub(25.40, 47.35, .38, .45, .50, P.leaf);
      shrub(25.52, 47.88, .30, .38, .38, P.leafL);
      box(25.46, .26, 56.42, .76, .52, 2.08, P.brickD);
      shrub(25.48, 55.92, .34, .55, .52, P.leafD);
      shrub(25.38, 56.55, .38, .46, .50, P.leaf);
      shrub(25.54, 57.12, .30, .38, .38, P.leafL);
      oval(24.70, 4.18, 52.00, .59, .11, 2.36, P.roofD);

      // Interior proxy planting is visible through the glass shell from the forecourt. Two low
      // organic beds flank the straight entry corridor; layered trunks and asymmetric crowns make
      // the roof read as a living greenhouse rather than an empty pavilion.
      oval(35.50,.10,47.20,6.50,.10,1.70,P.soil,10);
      oval(40.50,.10,57.30,7.25,.10,2.10,P.soil,10);
      trunk(34.00,2.00,47.30,.28,4.00,.28,P.timberD);
      trunk(42.50,2.25,57.00,.30,4.50,.30,P.timberD);
      trunk(37.60,1.70,58.20,.25,3.40,.25,P.timber);
      canopy(34.00,3.75,47.30,1.70,1.10,1.40,P.leafD);
      canopy(35.20,4.10,47.00,1.40,.90,1.20,P.leaf);
      canopy(42.50,4.25,57.00,2.00,1.20,1.60,P.leafD);
      canopy(44.00,4.55,56.60,1.55,.95,1.40,P.leafL);
      canopy(37.50,3.20,58.20,1.40,.90,1.25,P.leaf);
      canopy(36.40,3.45,58.00,1.10,.75,1.00,P.leafL);
      shrub(30.15,47.25,.78,.55,.88,P.leafD);
      shrub(46.35,57.35,.82,.58,.92,P.leafL);
    });

    // Three junction verges receive the same low brick-and-plant marker.  Each is placed in a
    // diagonal corner beyond both intersecting path envelopes and away from mapped civic fixtures.
    section('JUNCTION-VERGES', () => {
      box(-22.66, .16, 20.74, 1.08, .32, .58, P.brick);
      shrub(-22.66, 20.76, .46, .29, .22, P.willow);
      box(4.95, .16, 20.74, .70, .32, .58, P.brick);
      shrub(4.95, 20.76, .28, .29, .22, P.willow);
      box(.96, .16, 42.76, .78, .32, .54, P.brick);
      shrub(.96, 42.77, .32, .27, .20, P.willow);
    });

    if (props.length > 80)
      throw new Error(`ZooArtInfrastructure: ${props.length} props exceeds the 80-prop budget`);
    if (ids.length !== props.length || new Set(ids).size !== ids.length)
      throw new Error('ZooArtInfrastructure: generated IDs are missing or duplicated');
    if (!props.every(p => p && Number.isFinite(p.zooLodMax) &&
      (p.zooLodMax === FINE_LOD || p.zooLodMax === PLANT_LOD)))
      throw new Error('ZooArtInfrastructure: invalid prop or LOD assignment');
    for (const [key, before] of Object.entries(gameplayBefore))
      if (before !== null && B[key].length !== before)
        throw new Error(`ZooArtInfrastructure: visual build mutated B.${key}`);

    return { props, ids };
  }

  return Object.freeze({ build });
})();

if (typeof globalThis !== 'undefined')
  globalThis.ZooArtInfrastructure = ZooArtInfrastructure;
