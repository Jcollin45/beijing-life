// Scenic depth for the four central-conservation habitats. This pass is deliberately
// presentation-only: it contributes props, stable art IDs and distance culling, but no
// collision, picking, interaction, lighting or simulation state.
const ZooArtCentral = (() => {
  'use strict';

  const PI = Math.PI;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function build(B, context = {}) {
    if (!B || !Array.isArray(B.props))
      throw new Error('ZooArtCentral: a Build scene is required');
    const { ball, capsule, cyl, taper } = B;
    if (![ball, capsule, cyl, taper].every(fn => typeof fn === 'function'))
      throw new Error('ZooArtCentral: Build primitives are incomplete');

    const begin = B.props.length, ids = [];
    const palette = context.palette || {};
    const color = typeof context.color === 'function' ? context.color :
      (typeof C === 'function' ? C : null);
    const swatch = (key, fallback) => {
      if (has(palette, key)) return palette[key];
      if (!color) throw new Error(`ZooArtCentral: missing colour ${key}`);
      return color(fallback);
    };
    const P = {
      bark: swatch('bark', '#64462f'),
      barkDark: swatch('barkDark', '#443126'),
      leafDeep: swatch('leafDeep', '#244b34'),
      leaf: swatch('leaf', '#3f7048'),
      leafLight: swatch('leafLight', '#668452'),
      reed: swatch('reed', '#617943'),
      reedGold: swatch('reedGold', '#92814b'),
      earth: swatch('earth', '#6d583d'),
      mud: swatch('mud', '#554b3d'),
      stone: swatch('stone', '#747a70'),
      stoneDark: swatch('stoneDark', '#565d56'),
      straw: swatch('straw', '#b0924d'),
      strawDark: swatch('strawDark', '#826a3c'),
      rope: swatch('rope', '#9a7547'),
    };

    // The first prop owns ART-Hxx; subsequent geometry is deterministically numbered /G01…
    // Clearing the primitive pick box makes this scenery transparent to every interaction ray.
    function group(stem) {
      let serial = 0;
      return (p, lod = 26) => {
        if (!p) throw new Error(`ZooArtCentral: ${stem} produced an empty prop`);
        const id = serial === 0 ? stem : `${stem}/G${String(serial).padStart(2, '0')}`;
        serial++;
        p.blueprintId = id;
        p.zooLodMax = lod;
        p.ob = null;
        ids.push(id);
        return p;
      };
    }

    function span(add, a, b, y, radius, pigment, lod = 26, gloss = .10) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      return add(capsule((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2,
        radius, Math.hypot(dx, dz), radius, pigment,
        { rz: PI / 2, ry: -Math.atan2(dz, dx), gloss }), lod);
    }

    // H30 — red panda: two offset canopy layers frame (rather than cover) the central
    // climbing tree. New limbs tie the authored tower, rope and nest retreat into one route.
    {
      const add = group('ART-H30');
      add(cyl(-31.55, 1.85, 45.15, .16, 3.70, P.barkDark, { gloss: .10 }), 34);
      add(capsule(-31.62, 3.62, 45.06, .58, 1.82, .68, P.leafDeep,
        { mode: 15, ry: -.48, rz: .42, gloss: .05 }), 34);
      add(capsule(-30.93, 3.76, 44.92, .52, 1.62, .61, P.leaf,
        { mode: 15, ry: .72, rz: -.58, gloss: .05 }), 34);
      add(capsule(-32.12, 3.38, 45.70, .48, 1.48, .56, P.leaf,
        { mode: 15, ry: .24, rz: .66, gloss: .05 }), 34);
      add(capsule(-31.42, 4.28, 44.76, .44, 1.30, .50, P.leafLight,
        { mode: 15, ry: 1.18, rz: -.30, gloss: .05 }), 34);

      add(cyl(-29.35, 1.62, 50.20, .14, 3.24, P.bark, { gloss: .10 }), 34);
      add(capsule(-29.48, 3.26, 50.12, .52, 1.55, .61, P.leafDeep,
        { mode: 15, ry: .38, rz: -.48, gloss: .05 }), 34);
      add(capsule(-28.82, 3.48, 50.34, .47, 1.42, .55, P.leaf,
        { mode: 15, ry: -.82, rz: .54, gloss: .05 }), 34);
      add(capsule(-29.83, 3.72, 49.72, .43, 1.28, .49, P.leafLight,
        { mode: 15, ry: .94, rz: .32, gloss: .05 }), 34);

      add(taper(-32.55, .47, 46.92, .72, .92, .58, P.leafDeep,
        { mode: 15, ry: -.30, rz: .10, gloss: .04 }));
      add(taper(-26.02, .54, 50.92, .76, 1.05, .62, P.leaf,
        { mode: 15, ry: .55, rz: -.12, gloss: .04 }));
      add(taper(-25.12, .48, 44.22, .61, .91, .50, P.leafLight,
        { mode: 15, ry: -1.02, rz: .15, gloss: .04 }));

      span(add, [-31.45, 45.28], [-28.35, 46.86], 2.92, .11, P.barkDark, 34);
      span(add, [-29.32, 50.05], [-28.12, 47.28], 3.48, .10, P.bark, 34);
      span(add, [-27.82, 47.12], [-25.72, 49.52], 1.56, .085, P.bark, 26);
      span(add, [-30.74, 47.60], [-29.48, 48.26], 2.34, .16, P.barkDark, 26);
      span(add, [-32.38, 50.60], [-30.52, 51.06], .09, .18, P.barkDark, 26);
    }

    // H31 — waterfowl lake: a broken, species-rich shore line keeps open-water views and both
    // gates legible. A windswept bank pine and stone basin give B04 a restrained tea-garden edge.
    {
      const add = group('ART-H31');
      const reeds = [
        [-15.18, .48, 23.82, .43, .94, .30, -.16, P.reedGold],
        [-15.08, .59, 27.02, .50, 1.15, .34, .12, P.reed],
        [-15.15, .51, 30.22, .40, .99, .29, -.08, P.reedGold],
        [-11.86, .57, 34.62, .58, 1.10, .36, .18, P.reed],
        [-8.48, .48, 34.55, .45, .93, .31, -.13, P.reedGold],
        [-7.38, .61, 32.32, .52, 1.19, .35, .10, P.reed],
        [-7.36, .53, 24.36, .47, 1.02, .32, -.18, P.reed],
      ];
      for (const [x, y, z, sx, sy, sz, rz, col] of reeds)
        add(taper(x, y, z, sx, sy, sz, col,
          { mode: 15, ry: x + z, rz, gloss: .04 }));

      add(ball(-13.62, .10, 23.34, .68, .10, .35, P.mud,
        { mode: 10, ry: .26, gloss: .03 }));
      add(ball(-9.02, .09, 34.68, .82, .09, .29, P.stoneDark,
        { mode: 10, ry: -.31, gloss: .04 }));
      add(cyl(-14.18, .22, 32.48, .49, .14, P.straw,
        { mode: 10, gloss: .03 }));
      add(cyl(-14.47, .27, 32.16, .30, .12, P.strawDark,
        { mode: 10, gloss: .03 }));

      add(cyl(-6.64, 1.08, 33.02, .085, 2.16, P.barkDark, { gloss: .09 }), 34);
      add(taper(-6.72, 1.58, 32.94, .64, .74, .88, P.leafDeep,
        { mode: 15, ry: .42, rz: .20, gloss: .04 }), 34);
      add(taper(-6.55, 2.15, 33.10, .47, .61, .68, P.leaf,
        { mode: 15, ry: -1.02, rz: -.14, gloss: .04 }), 34);
      add(cyl(-6.58, .22, 26.28, .25, .44, P.stoneDark,
        { mode: 10, gloss: .04 }));
      add(cyl(-6.58, .48, 26.28, .32, .10, P.stone,
        { mode: 10, gloss: .04 }));
    }

    // H32 — family farm: hoof-worn desire lines, bedding windrows and a fresh browse rack make
    // this read as a managed working yard. All standing dressing remains east of the contact yard.
    {
      const add = group('ART-H32');
      add(ball(5.05, .028, 27.02, 1.28, .027, .34, P.earth,
        { mode: 10, ry: .13, gloss: .02 }));
      add(ball(5.28, .030, 30.92, 1.20, .029, .31, P.earth,
        { mode: 10, ry: -.18, gloss: .02 }));
      add(ball(8.10, .032, 29.62, .96, .031, .27, P.mud,
        { mode: 10, ry: .38, gloss: .02 }));
      add(ball(10.42, .034, 27.82, 1.05, .033, .25, P.earth,
        { mode: 10, ry: -.29, gloss: .02 }));

      span(add, [9.56, 32.52], [10.84, 32.20], .10, .20, P.straw, 26, .03);
      span(add, [9.62, 33.28], [10.72, 33.58], .085, .17, P.strawDark, 26, .03);
      span(add, [12.70, 26.42], [13.92, 26.70], .09, .18, P.straw, 26, .03);

      add(cyl(8.02, .76, 23.48, .075, 1.52, P.barkDark, { gloss: .08 }), 34);
      add(cyl(9.22, .70, 23.12, .070, 1.40, P.bark, { gloss: .08 }), 34);
      add(capsule(8.42, 1.20, 23.36, .26, 1.10, .38, P.leaf,
        { mode: 15, rz: PI / 2, ry: .28, gloss: .04 }));
      add(capsule(8.86, .91, 23.22, .23, .92, .34, P.leafLight,
        { mode: 15, rz: PI / 2, ry: -.18, gloss: .04 }));

      add(capsule(15.66, .35, 30.44, .12, .70, .53, P.barkDark,
        { gloss: .08 }));
      add(ball(4.02, .24, 34.42, .24, .24, .20, P.stone,
        { mode: 10, gloss: .03 }));
    }

    // H33 — golden monkey: broadleaf and conifer silhouettes create two forest strata while
    // irregular deadwood and rope diagonals turn the authored grid into a vertical route hierarchy.
    {
      const add = group('ART-H33');
      add(cyl(4.28, 2.22, 45.82, .17, 4.44, P.barkDark, { gloss: .09 }), 34);
      add(capsule(4.14, 4.38, 45.72, .66, 2.12, .74, P.leafDeep,
        { mode: 15, ry: -.48, rz: .42, gloss: .04 }), 34);
      add(capsule(4.82, 4.70, 45.94, .56, 1.80, .66, P.leaf,
        { mode: 15, ry: .72, rz: -.55, gloss: .04 }), 34);
      add(capsule(3.78, 5.12, 46.16, .48, 1.52, .57, P.leafLight,
        { mode: 15, ry: 1.04, rz: .30, gloss: .04 }), 34);

      add(cyl(14.08, 2.53, 47.62, .16, 5.06, P.bark, { gloss: .09 }), 34);
      add(taper(13.96, 3.55, 47.72, 2.18, 1.48, 1.76, P.leafDeep,
        { mode: 15, ry: .20, rz: .04, gloss: .04 }), 34);
      add(taper(14.28, 4.58, 47.42, 1.67, 1.36, 1.43, P.leaf,
        { mode: 15, ry: -.50, rz: -.05, gloss: .04 }), 34);
      add(taper(13.88, 5.54, 47.76, 1.12, 1.24, 1.02, P.leafLight,
        { mode: 15, ry: .76, rz: .06, gloss: .04 }), 34);

      add(taper(5.42, .75, 50.62, .82, 1.45, .65, P.leafDeep,
        { mode: 15, ry: .30, rz: .12, gloss: .04 }));
      add(taper(11.48, .66, 44.10, .72, 1.27, .58, P.leaf,
        { mode: 15, ry: -.72, rz: -.10, gloss: .04 }));

      span(add, [4.42, 45.82], [8.48, 47.12], 3.54, .12, P.barkDark, 34);
      span(add, [9.28, 47.46], [13.92, 47.64], 4.24, .12, P.bark, 34);
      span(add, [5.68, 50.42], [9.08, 48.05], 2.62, .105, P.barkDark, 26);
      span(add, [11.22, 50.18], [14.02, 47.72], 3.12, .105, P.bark, 26);

      span(add, [4.68, 46.30], [8.82, 47.36], 4.72, .042, P.rope, 26, .05);
      span(add, [8.86, 47.32], [13.68, 46.82], 3.08, .038, P.rope, 26, .05);
      span(add, [5.46, 50.22], [13.10, 45.18], 4.02, .040, P.rope, 26, .05);
    }

    const props = B.props.slice(begin);
    if (props.length !== 63 || ids.length !== 63 || new Set(ids).size !== 63)
      throw new Error(`ZooArtCentral: expected 63 unique props, found ${props.length}/${ids.length}`);
    return { props, ids };
  }

  return Object.freeze({ build });
})();
