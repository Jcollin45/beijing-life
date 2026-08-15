// 杨柳消防救援站 — a complete west-side fire-station frontage and appliance hall.
//
// Coordinate contract (metres): the road is east of the building, so every public elevation in
// this file faces +x.  The authored site is x 10.50..23.20, z -54.00..-14.00; architectural trim
// reaches x=23.38 while the clear apron continues through the emergency-priority turnout to the
// road face at x=25.42. The old
// anonymous mass occupying this plot is intentionally not relied on: these are complete walls,
// returns, roofs and colliders, so removing that mass cannot expose a hollow stage set.

(() => {
  'use strict';

  // Declare everything this fit writes before the street is lazily built.  Depending on another
  // scene's atlas request makes a sign disappear as soon as that unrelated scene is refactored.
  try {
    Glyphs.need('杨柳消防救援站消防站消防车消防车入口保持畅通便民服务大厅值班室社区消防宣传栏'
      + '消火栓应急救援训练光荣使命安全第一防火巡查安全用电报警电话一二三四五六七八九零119★');
  } catch (_) {}

  const PI = Math.PI, HALF_PI = PI / 2;
  const FACE = 23.38;
  const FIRE_OUT = { x: 24.70, z: -35.15, yaw: -HALF_PI };
  const BAY_CENTRES = [-49.00, -44.30, -39.60];
  const BAY_CLEAR = 4.10, BAY_TRACK_CLEAR = 3.88, BAY_HEIGHT = 4.65;

  const lit = [], lamps = [], pools = [], entryLeaves = [];
  let lastNight = -1, lastTick = 0, doorOpen = 0, appliedDoorOpen = -1;
  const remember = (p, day = .01, night = .24) => {
    p.glow = day;
    lit.push({ p, day, night });
    return p;
  };

  StreetFit['firestation'] = S => {
    const p0 = S.props.length;
    const { box, cyl, ball, taper, flat, glyphs, solid, blocker, shade,
            glow, thing, light, C, G } = S;

    // ---------------------------------------------------------------- palette / material language
    const TAG = { tag: '消防站' }, HALL = { tag: '消防车库' }, ENG = { tag: '消防车' };
    const BRICK = C('#8f3a2d'), BRICKD = C('#67271f'), BRICKL = C('#aa4a39');
    const RENDER = C('#d8d2c5'), RENDER2 = C('#bbb4a8'), STONE = C('#8e8b84');
    const COPING = C('#d9d9d4'), INK = C('#24292d'), SHADOW = C('#172026');
    const RED = C('#b62f27'), REDD = C('#77221e'), REDL = C('#de4d3e');
    const WHITE = C('#f3f0e7'), WARM = C('#ffe2ac'), YELLOW = C('#d5aa28');
    const GLASS = C('#7795a3'), GLASSD = C('#263a43'), GLASSW = C('#d9bb83');
    const STEEL = C('#90979a'), STEELD = C('#575f63'), SILVER = C('#b9c0c1');
    const TYRE = C('#171a1c'), HOSE = C('#d2b239'), BLUE = C('#3077a3');
    const CONCRETE = C('#aaa69d'), CONCRETED = C('#77736c');
    // Human-scale render grain.  The former 2.7 scale produced storey-high swirls on every return.
    const PLASTER = { mat: 'plaster', matScale: .72, matAmt: .11 };
    const MASONRY = { mat: 'brick', matScale: .78, matAmt: .17 };
    const PAVING = { mat: 'concrete', matScale: 1.1, matAmt: .13 };
    // At this scale a straight tube does not benefit from the capsule mesh's ten rounded-end
    // rings.  This keeps every authored diameter, length and rotation while using the renderer's
    // lower-cost closed cylinder for rails, hoses, spokes, piping and badge linework.
    const rod = (x, y, z, sx, sy, _sz, color, o = {}) =>
      cyl(x, y, z, sx / 2, sy, color, o);

    const faceText = (y, z, text, size, color = WHITE, o = {}) =>
      glyphs(FACE + .115, y, z, HALF_PI, text,
        { size, gap: o.gap === undefined ? size * .18 : o.gap, color,
          mode: 1, glow: o.glow || 0, lift: .009, vertical: !!o.vertical,
          tag: o.tag || '消防站' });

    // ---------------------------------------------------------------- site / walkable forecourt
    // The appliance apron is one continuous hardstand. The ordinary public route occupies the
    // exact 2.04 m facade-to-kerb band; the shelter now sits independently on the protected island,
    // so neither its supports nor its passengers consume this branch-footway clear path.
    flat(25.39, .012, -45.25, 4.02, 16.90, CONCRETE,
      { mode: 7, gloss: .12, ...PAVING, tag: '消防站前场' });
    flat(24.52, .014, -26.65, 2.28, 19.70, RENDER2,
      { mode: 7, gloss: .14, ...PAVING, tag: '消防站前场' });
    flat((FACE + S.KW) / 2, .015, -14.825, S.KW - FACE, 4.05, RENDER2,
      { mode: 7, gloss: .14, ...PAVING, tag: '消防站通道' });

    // Saw-cut joints are shallow dark seams, not proud strips that could trip the player or turn
    // the apron into a ladder.  Bay-centre guides remain exactly aligned with the three openings.
    for (let x = 23.75; x <= 27.0; x += .82)
      flat(x, .020, -45.25, .026, 16.80, CONCRETED, { gloss: .08, tag: '消防站前场' });
    for (const z of [-52.55, -50.10, -47.70, -45.45, -43.15, -40.85, -38.30])
      flat(25.39, .021, z, 3.90, .026, CONCRETED, { gloss: .08, tag: '消防站前场' });
    for (const z of BAY_CENTRES) {
      flat(25.36, .036, z, 3.70, .10, WHITE, { gloss: .18, tag: '消防车引导线' });
      flat(27.02, .037, z, .20, .34, WHITE, { gloss: .18, tag: '消防车引导线' });
    }

    // Bay three crosses the west cycle track under an exclusive emergency phase. A red turnout
    // table, yellow transverse yield bars and repeated short white guides make that conflict
    // explicit on the ground; it is never an unmarked drive across a live cycle route.
    const turnoutX0 = S.KW, turnoutX1 = S.PL1, turnoutZ = BAY_CENTRES[2];
    flat((turnoutX0 + turnoutX1) / 2, .031, turnoutZ,
      turnoutX1 - turnoutX0, BAY_TRACK_CLEAR, C('#7d4037'),
      { mode: 10, gloss: .16, tag: '消防出车口' });
    for (const z of [turnoutZ - BAY_TRACK_CLEAR / 2, turnoutZ + BAY_TRACK_CLEAR / 2])
      flat((turnoutX0 + turnoutX1) / 2, .038, z,
        turnoutX1 - turnoutX0, .16, YELLOW, { gloss: .18, tag: '消防出车口' });
    for (let x = turnoutX0 + .28; x < turnoutX1 - .12; x += .52)
      flat(x, .040, turnoutZ, .18, BAY_TRACK_CLEAR - .38, WHITE,
        { gloss: .16, tag: '消防车引导线' });

    // A grated interceptor drain catches wash-down water before the kerb. It sits in the last
    // 30 cm of the footway hardstand, wholly west of x=25.42, rather than masquerading as a drain
    // down the middle of the live west cycle track. Cross bars stay flush inside the 24 cm channel.
    flat(25.12, .024, -45.25, .24, 16.72, STEELD, { gloss: .32, tag: '排水沟' });
    for (let z = -53.30; z < -37.15; z += .48)
      box(25.12, .038, z, .20, .018, .038, INK,
        { hard: true, gloss: .26, tag: '排水沟' });

    // Tactile route: east-west to the public threshold, then north on the building side of the
    // shelter.  The longitudinal leg is deliberately at x=24.70: 58 cm clear of the shelter and
    // more than 40 cm clear of the facade-mounted bollards, hydrant and flagpole.
    const ROUTE_X = 24.70;
    flat(25.22, .029, -35.15, 3.72, .30, YELLOW, { gloss: .14, tag: '无障碍' });
    flat(ROUTE_X, .030, -24.05, .30, 22.20, YELLOW, { gloss: .14, tag: '无障碍' });
    for (let x = 23.55; x <= 26.90; x += .28)
      for (const dz of [-.09, .09])
        cyl(x, .043, -35.15 + dz, .018, .010, C('#b68b20'), { tag: '无障碍' });
    for (let z = -34.60; z <= -13.10; z += .68)
      box(ROUTE_X, .044, z, .21, .012, .034, C('#b68b20'),
        { hard: true, gloss: .14, tag: '无障碍' });

    // The playable extension overlaps the road zone by 1.25 m at z=-13.5. This retains a 35 cm
    // shared centre band under the strict 0.45 m control-envelope audit; the former one-metre seam
    // was connected in arithmetic but gave a wide control envelope only ten centimetres to aim at.
    S.FIRE_ZONE = {
      id: 'fire-station-front', x0: FACE, x1: S.KW,
      z0: -53.70, z1: -12.25, light: [25.25, 5.2, -35.15],
    };
    S.FIRE_OUT = FIRE_OUT;

    // ---------------------------------------------------------------- appliance hall: honest shell
    // These four wall runs, the segmented front and the roof close the hall on all six sides.  No
    // hidden monolith is needed.  The western rear wall is set just inside the 10.50 site line and
    // the side returns land within -53.60..-36.80.
    const HX0 = 10.50, HX1 = 23.20, HZ0 = -53.60, HZ1 = -36.80, HH = 6.55;
    box(10.67, HH / 2, (HZ0 + HZ1) / 2, .34, HH, HZ1 - HZ0, BRICKD,
      { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
    for (const z of [HZ0 + .17, HZ1 - .17])
      box((HX0 + HX1) / 2, HH / 2, z, HX1 - HX0, HH, .34, BRICK,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
    flat((HX0 + HX1) / 2, .020, (HZ0 + HZ1) / 2, HX1 - HX0 - .30, HZ1 - HZ0 - .30,
      CONCRETED, { mode: 7, gloss: .10, ...PAVING, ...HALL });

    // Three separate roof plates keep the hall's 4.70 m structural rhythm legible from above.
    // Their lapped joints fall on piers, and the perimeter parapet/coping is a perimeter rather
    // than another full-depth storey.
    for (const [z, d] of [[-50.105, 6.99], [-44.300, 4.78], [-39.395, 5.19]])
      box((HX0 + HX1) / 2, HH + .08, z, HX1 - HX0 + .10, .22, d, RENDER2,
        { hard: true, gloss: .18, ...PAVING, ...HALL });
    for (const x of [HX0 + .14, HX1 - .14])
      box(x, HH + .34, (HZ0 + HZ1) / 2, .28, .58, HZ1 - HZ0 + .10, BRICKD,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
    for (const z of [HZ0 + .12, HZ1 - .12])
      box((HX0 + HX1) / 2, HH + .34, z, HX1 - HX0, .58, .24, BRICKD,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
    for (const x of [HX0 + .14, HX1 - .14])
      box(x, HH + .67, (HZ0 + HZ1) / 2, .34, .08, HZ1 - HZ0 + .18, COPING,
        { hard: true, gloss: .22, ...HALL });
    for (const z of [HZ0 + .12, HZ1 - .12])
      box((HX0 + HX1) / 2, HH + .67, z, HX1 - HX0 + .12, .08, .32, COPING,
        { hard: true, gloss: .22, ...HALL });

    // The west service elevation is deliberately industrial but no longer blank: a durable plinth,
    // three bounded intake louvres, structural piers and roof drainage repeat the bay rhythm.  These
    // are shallow wall layers only, so the measured hall envelope and rear service clearance stay put.
    box(HX0 - .025, .36, (HZ0 + HZ1) / 2, .070, .72, HZ1 - HZ0 - .10, STONE,
      { hard: true, mode: 9, gloss: .18, tag: '消防站后勤立面' });
    for (const z of BAY_CENTRES) {
      box(HX0 - .025, 4.57, z, .060, .88, 2.30, SHADOW,
        { hard: true, gloss: .16, tag: '消防站后勤通风' });
      for (const y of [4.36, 4.58, 4.80])
        box(HX0 - .060, y, z, .025, .040, 2.04, STEEL,
          { hard: true, gloss: .40, tag: '消防站后勤通风' });
      if (z === BAY_CENTRES[1])
        remember(box(HX0 - .068, 3.72, z, .025, .11, .42, WARM,
          { hard: true, mode: 1, glow: .04, gloss: .30, tag: '消防站后勤灯' }), .025, .24);
    }
    for (const z of [-51.35, -46.65, -41.95])
      box(HX0 - .020, 3.18, z, .075, 5.70, .18, BRICKL,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, tag: '消防站后勤立面' });
    for (const z of [HZ0 + .35, HZ1 - .35]) {
      cyl(HX0 - .070, 3.20, z, .055, 6.05, STEELD,
        { gloss: .42, tag: '消防站后勤排水' });
      rod(HX0 - .260, .26, z, .050, .38, .050, STEELD,
        { rz: HALF_PI, gloss: .42, tag: '消防站后勤排水' });
    }

    // Front wall: a substantial south identity pier, two 60 cm intermediate piers and the north
    // end pier carry three independent lintels.  Structural openings are 4.10 x 4.65 m; the side
    // tracks retain 3.88 m of genuinely clear width, safely over the 3.80 m requirement.
    const opening = z => [z - BAY_CLEAR / 2, z + BAY_CLEAR / 2];
    const intervals = [
      [HZ0, opening(BAY_CENTRES[0])[0]],
      [opening(BAY_CENTRES[0])[1], opening(BAY_CENTRES[1])[0]],
      [opening(BAY_CENTRES[1])[1], opening(BAY_CENTRES[2])[0]],
      [opening(BAY_CENTRES[2])[1], HZ1],
    ];
    for (let i = 0; i < intervals.length; i++) {
      const [a, b] = intervals[i];
      box(FACE - .21, HH / 2, (a + b) / 2, .42, HH, b - a, i === 0 ? BRICKD : BRICK,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
      box(FACE + .025, .31, (a + b) / 2, .12, .62, b - a + .02, STONE,
        { hard: true, mode: 9, gloss: .18, ...HALL });
    }
    for (const z of BAY_CENTRES) {
      // Closed doors get a shallow recess backing. Bay three is genuinely open: an opaque
      // plane here would sit in front of the appliance and flatten the hall into a black slab.
      if (z !== BAY_CENTRES[2])
        box(FACE - .30, BAY_HEIGHT / 2 + .10, z, .08, BAY_HEIGHT, BAY_CLEAR, SHADOW,
          { hard: true, mode: 1, gloss: .12, ...HALL });
      flat(23.10, .034, z, .56, BAY_TRACK_CLEAR, STONE,
        { mode: 9, gloss: .20, tag: '消防车库门槛' });
      box(FACE - .19, 5.10, z, .46, .60, BAY_CLEAR + .05, RENDER,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...HALL });
      box(FACE + .025, 4.79, z, .10, .12, BAY_CLEAR + .08, BRICKD,
        { hard: true, gloss: .22, ...HALL });

      // Recessed clerestory in the wall above each door, with three real lights and four mullions.
      box(FACE - .015, 5.70, z, .08, .66, BAY_CLEAR - .34, GLASSD,
        { hard: true, gloss: .18, ...HALL });
      const cl = remember(box(FACE + .040, 5.70, z, .025, .50, BAY_CLEAR - .52, GLASS,
        { hard: true, mode: 1, gloss: G.glass, ...HALL }), .008, .14);
      for (const dz of [-1.18, -.39, .39, 1.18])
        box(FACE + .070, 5.70, z + dz, .035, .58, .055, STEELD,
          { hard: true, gloss: G.metal, ...HALL });
      box(FACE + .075, 5.35, z, .05, .06, BAY_CLEAR - .30, COPING,
        { hard: true, gloss: .24, ...HALL });
    }

    // A red fascia is interrupted at every pier; it does not float over the openings as a single
    // unsupported slab.  The raised hall roof remains visibly higher than the admin wing.
    for (let i = 0; i < BAY_CENTRES.length; i++)
      remember(box(FACE + .035, 6.24, BAY_CENTRES[i], .12, .42, BAY_CLEAR - .12, REDD,
        { hard: true, mode: 1, glow: .018, gloss: .24, ...HALL }), .018, .14);
    faceText(6.26, -44.30, '杨柳消防救援站', .37, WHITE, { gap: .072, tag: '消防站' });

    // The wider south pier is an identity tower, not dead leftover wall.  A restrained open-line
    // shield/flame badge and the emergency number give it the scale of a civic entrance marker.
    box(FACE + .015, 3.38, -52.32, .14, 5.62, 1.78, REDD,
      { hard: true, mode: 1, gloss: .23, ...TAG });
    faceText(5.58, -52.32, '消防车入口', .145, WHITE, { gap: .026, tag: '消防站' });
    faceText(2.03, -52.32, '119', .58, WHITE, { gap: .06, tag: '消防站' });
    faceText(1.16, -52.32, '保持畅通', .145, C('#e7c95f'), { gap: .028, tag: '消防站' });
    const badgeX = FACE + .205, badgeGold = C('#e4bd55');
    const badgeRod = (y0, z0, y1, z1, color = badgeGold, r = .025) => {
      const dy = y1 - y0, dz = z1 - z0;
      rod(badgeX, (y0 + y1) / 2, (z0 + z1) / 2, r, Math.hypot(dy, dz), r, color,
        { rx: Math.atan2(dz, dy), gloss: .48, tag: '消防站徽章' });
    };
    const shield = [
      [5.12, -52.63], [5.21, -52.32], [5.12, -52.01],
      [4.67, -51.94], [4.25, -52.32], [4.67, -52.70],
    ];
    for (let i = 0; i < shield.length; i++)
      badgeRod(...shield[i], ...shield[(i + 1) % shield.length]);
    badgeRod(4.38, -52.32, 4.74, -52.48, WHITE, .030);
    badgeRod(4.74, -52.48, 4.65, -52.23, WHITE, .030);
    badgeRod(4.65, -52.23, 4.98, -52.35, badgeGold, .030);

    // ---------------------------------------------------------------- sectional appliance doors
    function closedDoor(z, number) {
      box(FACE + .055, 2.43, z, .075, 4.52, BAY_CLEAR - .12, C('#d5d7d3'),
        { hard: true, mode: 9, gloss: .30, tag: '消防车库门' });
      box(FACE + .105, .15, z, .030, .10, BAY_CLEAR - .18, INK,
        { hard: true, gloss: .24, tag: '消防车库门' });
      for (let y = .52; y <= 4.54; y += .57)
        box(FACE + .102, y, z, .026, .030, BAY_CLEAR - .20, STEELD,
          { hard: true, gloss: .40, tag: '消防车库门' });
      for (const dz of [-1.00, 0, 1.00])
        box(FACE + .104, 2.18, z + dz, .026, 3.75, .032, STEEL,
          { hard: true, gloss: .38, tag: '消防车库门' });
      // A continuous glazed vision band is divided into four framed panes.
      for (const dz of [-1.48, -.50, .50, 1.48]) {
        box(FACE + .115, 3.66, z + dz, .030, .56, .76, GLASSD,
          { hard: true, gloss: .20, tag: '消防车库门' });
        remember(box(FACE + .138, 3.66, z + dz, .016, .46, .64, GLASS,
          { hard: true, mode: 1, gloss: G.glass, tag: '消防车库门' }), .006, .09);
      }
      for (const s of [-1, 1])
        box(FACE + .015, 2.42, z + s * (BAY_CLEAR / 2 - .06), .20, 4.78, .10, STEELD,
          { hard: true, gloss: G.metal, tag: '消防车库门轨道' });
      faceText(.54, z, String(number), .22, REDD, { tag: '消防车库门' });
    }
    closedDoor(BAY_CENTRES[0], 1);
    closedDoor(BAY_CENTRES[1], 2);

    // Bay three is open.  Vertical tracks curve into two honest overhead rails and the sectional
    // leaves are parked flat under the roof, making the opening read as depth instead of black paint.
    const OPEN_Z = BAY_CENTRES[2];
    for (const s of [-1, 1]) {
      const tz = OPEN_Z + s * (BAY_CLEAR / 2 - .06);
      box(FACE - .02, 2.42, tz, .18, 4.76, .10, STEELD,
        { hard: true, gloss: G.metal, tag: '消防车库门轨道' });
      box(19.93, 5.49, tz, 6.55, .07, .10, STEELD,
        { hard: true, gloss: G.metal, tag: '消防车库门轨道' });
      rod(FACE - .35, 5.08, tz, .045, .82, .045, STEELD,
        { rz: -.80, gloss: G.metal, tag: '消防车库门轨道' });
    }
    for (let x = 18.10; x <= 22.75; x += .58)
      box(x, 5.43, OPEN_Z, .53, .075, BAY_CLEAR - .18, C('#d5d7d3'),
        { hard: true, mode: 9, gloss: .30, tag: '消防车库门' });
    box(FACE - .34, 5.03, OPEN_Z, .34, .32, BAY_CLEAR - .04, STEELD,
      { hard: true, gloss: .34, tag: '消防车库门卷轴' });
    box(FACE + .035, 4.27, OPEN_Z + 1.78, .12, .42, .34, REDD,
      { hard: true, gloss: .28, tag: '消防车库门' });
    faceText(4.27, OPEN_Z + 1.78, '3', .22, WHITE, { tag: '消防车库门' });

    // Bay depth and operational equipment visible behind the open door.
    flat(16.85, .030, OPEN_Z, 11.95, BAY_CLEAR - .04, C('#666762'),
      { mode: 7, gloss: .10, ...PAVING, ...HALL });
    box(10.88, 2.55, OPEN_Z, .16, 5.05, BAY_CLEAR + .02, BRICKD,
      { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...HALL });
    for (const s of [-1, 1]) {
      box(16.84, 2.58, OPEN_Z + s * (BAY_CLEAR / 2 + .10), 12.02, 5.16, .18, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...HALL });
      // Hoses, coat hooks and low protective kerb stay against the side walls.
      box(16.80, .19, OPEN_Z + s * (BAY_CLEAR / 2 + .01), 11.8, .38, .18, YELLOW,
        { hard: true, gloss: .20, ...HALL });
      for (const x of [12.1, 13.0, 13.9])
        rod(x, 1.78, OPEN_Z + s * (BAY_CLEAR / 2 - .01), .055, .72, .055, HOSE,
          { rz: HALF_PI, gloss: .28, ...HALL });
    }
    for (const x of [12.3, 15.4, 18.5, 21.4])
      remember(box(x, 5.18, OPEN_Z, 1.45, .035, .16, WARM,
        { hard: true, mode: 1, glow: .06, gloss: .18, ...HALL }), .035, .32);

    // ---------------------------------------------------------------- fire engine in open bay
    // The vehicle is length-first along x, nose to the road.  Rounded shoulder/cab volumes overlap
    // so there is no stack-of-boxes silhouette; the 8.95 x 3.06 x 3.53 m mirror-to-mirror envelope
    // leaves over 40 cm per flank at the door tracks and more than 2.5 m behind it in the bay.
    function fireEngine(z) {
      const EX0 = 13.55, EX1 = 22.20, ez = z;
      shade((EX0 + EX1) / 2, ez, EX1 - EX0 + .30, 2.72, .30, .021);
      box(17.86, .48, ez, 8.48, .30, 2.34, INK,
        { hard: true, gloss: .25, ...ENG });
      ball(16.62, 1.70, ez, 3.02, 1.22, 1.24, RED,
        { mode: 7, gloss: .58, ...ENG });
      box(16.55, 1.91, ez, 5.90, 2.48, 2.42, RED,
        { gloss: .58, round: .06, ...ENG });
      ball(16.55, 3.12, ez, 3.02, .19, 1.23, REDL,
        { mode: 7, gloss: .60, ...ENG });

      // Cab: tapered upper cell, rounded brow and a raked transparent windscreen.
      ball(20.78, 1.54, ez, 1.48, 1.05, 1.22, REDL,
        { mode: 7, gloss: .61, ...ENG });
      taper(20.72, 2.42, ez, 2.72, 1.34, 2.30, RED,
        { gloss: .60, ...ENG });
      box(20.62, 3.08, ez, 2.55, .16, 2.20, REDD,
        { round: .06, gloss: .54, ...ENG });
      for (const s of [-1, 1]) {
        const wind = remember(box(22.10, 2.47, ez + s * .45, .035, .82, .80, GLASS,
          { hard: true, mode: 1, alpha: .34, gloss: G.glass, rz: -.10, ...ENG }), .005, .07);
        wind.alpha = .34;
        rod(22.145, 2.34, ez + s * .45, .016, .45, .016, INK,
          { rx: s * .18, rz: -.12, gloss: .30, tag: '消防车雨刷' });
      }
      box(22.14, 2.47, ez, .040, .92, .055, INK,
        { hard: true, gloss: .30, rz: -.10, ...ENG });
      for (const y of [2.02, 2.91])
        box(22.13, y, ez, .040, .045, 1.73, INK,
          { hard: true, gloss: .28, rz: -.10, ...ENG });
      for (const s of [-1, 1]) {
        const sideGlass = box(20.78, 2.47, ez + s * 1.175, 1.70, .78, .025, GLASS,
          { hard: true, mode: 1, alpha: .40, gloss: G.glass, ...ENG });
        sideGlass.alpha = .40;
        box(19.89, 2.43, ez + s * 1.195, .070, .90, .035, INK,
          { hard: true, gloss: .28, ...ENG });
        // Mirrors have stalks into the cab and a separate glass face.
        rod(21.54, 2.48, ez + s * 1.31, .030, .35, .030, STEELD,
          { rx: HALF_PI, gloss: .48, ...ENG });
        ball(21.54, 2.49, ez + s * 1.48, .16, .12, .05, INK,
          { mode: 7, gloss: .54, ...ENG });
      }

      // Nose furniture: radiused bumper corners, grille slats, inset lamps and a fleet plate.
      ball(22.28, .68, ez, .23, .25, 1.28, STEELD,
        { mode: 7, gloss: .48, ...ENG });
      box(22.32, 1.35, ez, .055, .66, 1.44, STEELD,
        { hard: true, gloss: .34, ...ENG });
      box(22.365, 1.35, ez, .025, .54, 1.25, INK,
        { hard: true, gloss: .22, ...ENG });
      for (const y of [1.16, 1.29, 1.42, 1.55])
        box(22.39, y, ez, .025, .035, 1.12, SILVER,
          { hard: true, gloss: .48, ...ENG });
      for (const s of [-1, 1]) {
        ball(22.29, 1.77, ez + s * .79, .065, .21, .35, INK,
          { mode: 7, gloss: .38, ...ENG });
        remember(ball(22.34, 1.77, ez + s * .79, .050, .14, .25, WHITE,
          { mode: 1, glow: .08, gloss: .60, ...ENG }), .05, .22);
        remember(ball(22.34, 1.43, ez + s * .86, .045, .085, .16, YELLOW,
          { mode: 1, glow: .025, gloss: .48, ...ENG }), .015, .08);
      }
      box(22.43, .68, ez, .08, .15, .56, C('#2e6a8e'),
        { hard: true, gloss: .34, ...ENG });
      glyphs(22.48, 1.02, ez, HALF_PI, '消防',
        { size: .16, gap: .035, color: WHITE, mode: 1, lift: .008, tag: '消防车' });

      // Equipment lockers are separately framed and ribbed; the rear two bays carry pump outlets
      // and rolled hoses rather than six identical red rectangles.
      for (const s of [-1, 1]) {
        const side = ez + s * 1.235;
        for (const [x, w] of [[14.34, 1.05], [15.57, 1.12], [16.86, 1.12], [18.16, 1.08]]) {
          box(x, 1.84, side, w, 1.72, .032, SILVER,
            { hard: true, mode: 9, gloss: .38, ...ENG });
          for (let y = 1.14; y <= 2.53; y += .34)
            box(x, y, side + s * .018, w - .10, .022, .018, STEELD,
              { hard: true, gloss: .38, ...ENG });
          box(x - w / 2 + .055, 1.84, side + s * .020, .035, 1.78, .020, REDD,
            { hard: true, gloss: .30, ...ENG });
          box(x + w / 2 - .055, 1.84, side + s * .020, .035, 1.78, .020, REDD,
            { hard: true, gloss: .30, ...ENG });
        }
        for (const x of [14.08, 14.58]) {
          cyl(x, 1.37, side + s * .045, .13, .065, BLUE,
            { rx: HALF_PI, gloss: .46, ...ENG });
          cyl(x, 1.72, side + s * .045, .13, .065, REDD,
            { rx: HALF_PI, gloss: .46, ...ENG });
        }
      }

      // Open wheel rings and spokes.  A real torus replaces twelve overlapping capsule segments:
      // its silhouette is smoother, its centre remains genuinely open and it costs one instance
      // rather than twelve.  Every ring remains inside the 2.56 m width.
      function ringWheel(wx, side) {
        const wy = .66, wz = ez + side * 1.275, r = .53;
        const tyre = {
          mesh: 'ring', m: M.trs(wx, wy, wz, 0, 1.22, 1.22, .70), color: TYRE,
          ob: { x: wx, y: wy, z: wz, ry: 0, sx: 1.22, sy: 1.22, sz: .70 },
          gloss: .20, ...ENG,
        };
        S.props.push(tyre);
        for (let k = 0; k < 6; k++) {
          const a = k * PI / 3;
          rod(wx + Math.cos(a) * r * .43, wy + Math.sin(a) * r * .43,
            wz + side * .022, .025, r * .76, .025, SILVER,
            { rz: a - HALF_PI, gloss: .48, ...ENG });
        }
        cyl(wx, wy, wz + side * .045, .15, .08, STEELD,
          { rx: HALF_PI, gloss: .48, ...ENG });
        cyl(wx, wy, wz + side * .090, .065, .09, REDD,
          { rx: HALF_PI, gloss: .42, ...ENG });
      }
      for (const wx of [15.00, 17.05, 20.92]) for (const side of [-1, 1]) ringWheel(wx, side);

      // Roof ladder: two rails, ten rungs, end stops and a compact hose tray.
      for (const dz of [-.52, .52])
        rod(16.48, 3.48, ez + dz, .042, 5.45, .042, SILVER,
          { rz: HALF_PI, gloss: .54, ...ENG });
      for (let x = 14.05; x <= 18.92; x += .54)
        rod(x, 3.48, ez, .034, 1.09, .034, SILVER,
          { rx: HALF_PI, gloss: .52, ...ENG });
      box(14.12, 3.28, ez, .60, .18, 1.84, STEELD,
        { hard: true, gloss: .42, ...ENG });
      for (const dz of [-.54, 0, .54])
        rod(14.12, 3.38, ez + dz, .045, .46, .045, HOSE,
          { rz: HALF_PI, gloss: .30, ...ENG });

      // Cab lightbar and roof horn.  It is parked, so the beacons glow as lenses but do not flash.
      box(20.70, 3.30, ez, .78, .07, 1.04, INK,
        { hard: true, gloss: .35, ...ENG });
      for (const [dz, color] of [[-.34, BLUE], [.34, REDL]])
        remember(cyl(20.70, 3.39, ez + dz, .13, .14, color,
          { mode: 1, glow: .12, gloss: .62, ...ENG }), .08, .24);
      taper(21.30, 3.39, ez, .28, .20, .28, SILVER,
        { rz: HALF_PI, gloss: .54, ...ENG });

      thing('消防车', FACE - .10, 2.20, ez,
        '消防车停在三号车库里，车头朝着出车场。',
        'The fire engine is parked in bay three, facing the turnout apron.',
        '消防 fire control + 车 vehicle.',
        { focus: [24.18, ez], reach: 2.65, tag: '消防车' });
    }
    fireEngine(OPEN_Z);

    // ---------------------------------------------------------------- lower admin / community wing
    // The wing steps back at its west wall to x=12.10 and stops at y=5.30, a full 1.25 m below the
    // appliance roof.  The road elevation is assembled around a 1.60 m door and four recessed
    // windows; base, head and vertical piers line up with the returns and roof load above.
    const AX0 = 12.10, AX1 = 23.20, AZ0 = -36.80, AZ1 = -14.40, AH = 5.30;
    const entryZ = -35.15, entryA = entryZ - .80, entryB = entryZ + .80;
    const wins = [
      { z: -31.55, w: 2.60 }, { z: -27.75, w: 2.60 },
      { z: -23.90, w: 3.00 }, { z: -19.25, w: 2.80 },
    ];
    const openings = [[entryA, entryB], ...wins.map(w => [w.z - w.w / 2, w.z + w.w / 2])]
      .sort((a, b) => a[0] - b[0]);

    // The stone plinth stops at the public door jambs.  Running it continuously behind the glass
    // would turn a nominal entrance into a 72 cm wall with door leaves floating above it.
    for (const [a, b] of [[AZ0, entryA], [entryB, AZ1]])
      box(FACE - .20, .36, (a + b) / 2, .40, .72, b - a, STONE,
        { hard: true, mode: 9, gloss: .18, ...TAG });
    box(FACE - .20, 4.23, (AZ0 + AZ1) / 2, .40, 2.14, AZ1 - AZ0, RENDER,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    let cursor = AZ0;
    for (const [a, b] of openings) {
      if (a > cursor)
        box(FACE - .20, 2.34, (cursor + a) / 2, .40, 3.30, a - cursor, RENDER,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
      cursor = b;
    }
    if (cursor < AZ1)
      box(FACE - .20, 2.34, (cursor + AZ1) / 2, .40, 3.30, AZ1 - cursor, RENDER,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });

    // The upper storey is a civic facade, not an undifferentiated two-metre render billboard.
    // A brick soldier course ties the window heads together, a slim precast band shadows the
    // parapet, and four recessed ventilation grilles repeat the window rhythm.  All are shallow
    // facade layers: the real wall and its collision envelope remain unchanged.
    const adminMidZ = (AZ0 + AZ1) / 2, adminSpanZ = AZ1 - AZ0;
    box(FACE + .015, 3.56, adminMidZ, .070, .18, adminSpanZ - .10, BRICKD,
      { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...TAG });
    box(FACE + .025, 4.98, adminMidZ, .085, .15, adminSpanZ - .12, COPING,
      { hard: true, gloss: .24, ...TAG });
    for (const w of wins) {
      const ventW = Math.min(1.58, w.w - .62);
      box(FACE + .010, 4.30, w.z, .060, .58, ventW, SHADOW,
        { hard: true, gloss: .16, tag: '消防站高位通风' });
      box(FACE + .052, 4.30, w.z, .030, .44, ventW - .14, STEELD,
        { hard: true, mode: 6, gloss: .32, tag: '消防站高位通风' });
      for (const y of [4.20, 4.40])
        box(FACE + .075, y, w.z, .025, .035, ventW - .22, SILVER,
          { hard: true, gloss: .40, tag: '消防站高位通风' });
    }

    // West/rear admin wall: a real staff door and three real window gaps replace the former blank
    // 22-metre slab.  Base and middle wall runs stop at the openings while one continuous upper
    // wall carries the roof.  The collider remains the same documented wing envelope.
    const rearDoorZ = -34.55, rearDoorW = 1.16;
    const rearWins = [
      { z: -30.05, w: 2.24 }, { z: -24.40, w: 2.52 }, { z: -18.55, w: 2.24 },
    ];
    const rearOpenings = [
      { a: rearDoorZ - rearDoorW / 2, b: rearDoorZ + rearDoorW / 2, door: true },
      ...rearWins.map(w => ({ a: w.z - w.w / 2, b: w.z + w.w / 2, w })),
    ].sort((a, b) => a.a - b.a);
    const rearWallX = AX0 + .16;
    for (const [a, b] of [[AZ0, rearDoorZ - rearDoorW / 2],
                          [rearDoorZ + rearDoorW / 2, AZ1]])
      box(rearWallX, .36, (a + b) / 2, .32, .72, b - a, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤立面' });
    box(rearWallX, 4.29, (AZ0 + AZ1) / 2, .32, 2.02, AZ1 - AZ0, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤立面' });
    let rearCursor = AZ0;
    for (const q of rearOpenings) {
      if (q.a > rearCursor)
        box(rearWallX, 2.00, (rearCursor + q.a) / 2, .32, 2.56, q.a - rearCursor, RENDER2,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤立面' });
      rearCursor = q.b;
    }
    if (rearCursor < AZ1)
      box(rearWallX, 2.00, (rearCursor + AZ1) / 2, .32, 2.56, AZ1 - rearCursor, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤立面' });
    // Door lintel closes the taller window datum down to a 2.48 m staff opening.
    box(rearWallX, 2.88, rearDoorZ, .32, .80, rearDoorW, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤入口' });

    // Closed steel staff/service door, loading step and a column-free weather hood.
    box(AX0 - .035, 1.24, rearDoorZ, .065, 2.42, rearDoorW - .10, STEELD,
      { hard: true, mode: 6, gloss: .30, tag: '消防站后勤入口' });
    box(AX0 - .075, 1.72, rearDoorZ, .020, .66, .56, GLASSD,
      { hard: true, mode: 1, gloss: G.glass, tag: '消防站后勤入口' });
    for (const s of [-1, 1])
      box(AX0 - .050, 1.25, rearDoorZ + s * (rearDoorW / 2 + .005), .10, 2.50, .075, REDD,
        { hard: true, gloss: .34, tag: '消防站后勤入口' });
    box(AX0 - .050, 2.50, rearDoorZ, .10, .075, rearDoorW + .08, REDD,
      { hard: true, gloss: .34, tag: '消防站后勤入口' });
    rod(AX0 - .090, 1.16, rearDoorZ + .34, .018, .34, .018, SILVER,
      { gloss: .54, tag: '消防站后勤入口' });
    flat(AX0 - .43, .024, rearDoorZ, .72, 1.44, STONE,
      { mode: 9, gloss: .18, tag: '消防站后勤入口' });
    box(AX0 - .43, 2.80, rearDoorZ, .86, .09, 1.52, BRICKD,
      { hard: true, gloss: .26, tag: '消防站后勤入口' });
    remember(box(AX0 - .88, 2.70, rearDoorZ, .025, .10, .42, WARM,
      { hard: true, mode: 1, glow: .05, gloss: .30, tag: '消防站后勤灯' }), .025, .24);

    // Deep west-facing windows share the public facade's sill/head datum and restrained warm depth.
    for (const w of rearWins) {
      const glassX = AX0 + .09, backX = AX0 + .59;
      remember(box(backX, 2.02, w.z, .035, 2.18, w.w - .20, RENDER,
        { hard: true, mode: 1, glow: .012, gloss: .12, tag: '消防站后勤窗内' }), .008, .12);
      for (const side of [-1, 1])
        box(AX0 + .29, 2.02, w.z + side * (w.w / 2 - .055), .58, 2.44, .11, RENDER2,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤窗洞' });
      for (const [y, color] of [[.80, STONE], [3.24, RENDER2]])
        box(AX0 + .29, y, w.z, .58, .11, w.w, color,
          { hard: true, gloss: .20, tag: '消防站后勤窗洞' });
      const pane = box(glassX, 2.02, w.z, .025, 2.12, w.w - .18, GLASS,
        { hard: true, mode: 1, alpha: .34, gloss: G.glass, tag: '消防站后勤窗' });
      pane.alpha = .34;
      box(glassX - .018, 2.02, w.z, .035, 2.14, .045, STEELD,
        { hard: true, gloss: G.metal, tag: '消防站后勤窗' });
      box(glassX - .020, 2.02, w.z, .035, .045, w.w - .10, STEELD,
        { hard: true, gloss: G.metal, tag: '消防站后勤窗' });
      box(AX0 + .025, .74, w.z, .28, .12, w.w + .20, COPING,
        { hard: true, gloss: .22, tag: '消防站后勤窗' });
    }
    // Courses and corner flashing make the 1.6 m re-entrant joint read as a deliberate set-back,
    // not an open black wedge.
    for (const [y, color, h] of [[3.56, BRICKD, .18], [4.98, COPING, .15]])
      box(AX0 - .025, y, (AZ0 + AZ1) / 2, .075, h, AZ1 - AZ0 - .10, color,
        { hard: true, gloss: .24, tag: '消防站后勤立面' });
    box((HX0 + AX0) / 2, AH / 2, AZ0 + .025, AX0 - HX0 - .08, AH, .055, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站后勤转角' });
    box(AX0 - .035, AH / 2, AZ0 + .055, .075, AH - .18, .11, STEELD,
      { hard: true, gloss: .38, tag: '消防站后勤转角' });

    // South party wall still laps the hall by 8 cm so their single-sided skins cannot open a seam.
    box((AX0 + AX1) / 2, AH / 2, AZ0 + .08, AX1 - AX0, AH, .32, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    const returnWins = [
      { x: 14.35, w: 2.20 }, { x: 17.40, w: 2.20 }, { x: 20.45, w: 2.20 },
    ];
    const northZ = AZ1 - .16;
    box((AX0 + AX1) / 2, .36, northZ, AX1 - AX0, .72, .32, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    box((AX0 + AX1) / 2, 4.23, northZ, AX1 - AX0, 2.14, .32, RENDER2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    let returnCursor = AX0;
    for (const w of returnWins) {
      const a = w.x - w.w / 2, b = w.x + w.w / 2;
      if (a > returnCursor)
        box((returnCursor + a) / 2, 2.34, northZ, a - returnCursor, 3.30, .32, RENDER2,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
      returnCursor = b;
    }
    if (returnCursor < AX1)
      box((returnCursor + AX1) / 2, 2.34, northZ, AX1 - returnCursor, 3.30, .32, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    box((AX0 + AX1) / 2, AH + .07, (AZ0 + AZ1) / 2, AX1 - AX0 + .08, .20, AZ1 - AZ0 + .08,
      RENDER2, { hard: true, gloss: .18, ...PAVING, ...TAG });
    for (const x of [AX0 + .13, AX1 - .13])
      box(x, AH + .34, (AZ0 + AZ1) / 2, .26, .56, AZ1 - AZ0 + .08, BRICKD,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...TAG });
    for (const z of [AZ0 + .13, AZ1 - .13])
      box((AX0 + AX1) / 2, AH + .34, z, AX1 - AX0, .56, .26, BRICKD,
        { hard: true, mode: 11, gloss: G.matte, ...MASONRY, ...TAG });
    for (const x of [AX0 + .13, AX1 - .13])
      box(x, AH + .66, (AZ0 + AZ1) / 2, .33, .08, AZ1 - AZ0 + .16, COPING,
        { hard: true, gloss: .22, ...TAG });
    for (const z of [AZ0 + .13, AZ1 - .13])
      box((AX0 + AX1) / 2, AH + .66, z, AX1 - AX0 + .10, .08, .33, COPING,
        { hard: true, gloss: .22, ...TAG });

    // Recessed front windows.  The glazing is nine centimetres behind the wall face and the jamb,
    // head and sill returns run all the way back to a warm inner wall.  Small room-specific
    // silhouettes make the public wing agree with the occupied interior instead of reflecting an
    // empty blue plane.
    for (let wi = 0; wi < wins.length; wi++) {
      const w = wins[wi], night = wi === 2 ? .22 : .12 + wi * .025;
      const glassX = FACE - .09, backX = FACE - .59;
      const room = remember(box(backX, 2.04, w.z, .035, 2.20, w.w - .24,
        wi === 2 ? GLASSW : RENDER2,
        { hard: true, mode: 1, glow: .018, gloss: .12, tag: '消防站窗内' }), .012, night);
      for (const side of [-1, 1])
        box(FACE - .29, 2.04, w.z + side * (w.w / 2 - .055), .58, 2.46, .11, RENDER2,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站窗洞' });
      for (const [y, color] of [[.81, STONE], [3.27, RENDER2]])
        box(FACE - .29, y, w.z, .58, .11, w.w, color,
          { hard: true, gloss: .20, tag: '消防站窗洞' });

      // Open-frame furniture silhouettes: two desks, a dayroom sofa and a training credenza.  Thin
      // tops, legs and separated backs avoid the coloured one-piece blocks seen in the audit.
      const furnitureX = FACE - .37;
      if (wi < 2 || wi === 3) {
        const innerColor = wi === 3 ? BRICKD : C('#59666b');
        box(furnitureX, .94, w.z, .34, .10, w.w - .68, innerColor,
          { hard: true, gloss: .18, tag: '消防站窗内' });
        for (const side of [-1, 1])
          box(furnitureX - .02, .52, w.z + side * (w.w / 2 - .43), .08, .76, .08, STEELD,
            { hard: true, gloss: .30, tag: '消防站窗内' });
        if (wi !== 3)
          box(furnitureX - .08, 1.35, w.z + (wi ? .25 : -.20), .10, .52, .62, GLASSD,
            { hard: true, mode: 1, glow: .018, gloss: .22, tag: '消防站窗内' });
      } else {
        box(furnitureX, .66, w.z, .38, .15, w.w - .72, C('#52676d'),
          { hard: true, mode: 7, gloss: .06, tag: '消防站窗内' });
        box(backX + .08, 1.05, w.z, .12, .68, w.w - .72, C('#44575d'),
          { hard: true, mode: 7, gloss: .05, tag: '消防站窗内' });
        for (const side of [-1, 1])
          box(furnitureX, .82, w.z + side * (w.w / 2 - .43), .34, .42, .16, C('#44575d'),
            { hard: true, mode: 7, gloss: .05, tag: '消防站窗内' });
      }
      if (wi === 1 || wi === 3)
        box(backX + .035, 2.12, w.z, .025, .72, w.w - .72, wi === 1 ? GLASSD : WHITE,
          { hard: true, mode: 1, glow: wi === 1 ? .025 : 0, gloss: .15, tag: '消防站窗内' });

      const pane = remember(box(glassX, 2.04, w.z, .025, 2.20, w.w - .20, GLASS,
        { hard: true, mode: 1, alpha: .36, gloss: G.glass, tag: '消防站窗' }), .006, night * .25);
      pane.alpha = .36;
      for (const dz of [-w.w / 6, w.w / 6])
        box(glassX + .018, 2.04, w.z + dz, .035, 2.24, .045, STEELD,
          { hard: true, gloss: G.metal, tag: '消防站窗' });
      box(glassX + .020, 2.04, w.z, .038, .045, w.w - .12, STEELD,
        { hard: true, gloss: G.metal, tag: '消防站窗' });
      box(FACE - .025, .75, w.z, .28, .12, w.w + .24, COPING,
        { hard: true, gloss: .22, tag: '消防站窗' });
      box(FACE - .035, 3.34, w.z, .22, .14, w.w + .20, BRICKL,
        { hard: true, mode: 11, gloss: .24, ...MASONRY, tag: '消防站窗' });
    }

    // The exposed north-return windows use the same half-metre reveals and inner-wall depth.
    for (const w of returnWins) {
      const glassZ = AZ1 - .09, backZ = AZ1 - .59;
      remember(box(w.x, 2.08, backZ, w.w - .22, 2.14, .035, RENDER,
        { hard: true, mode: 1, glow: .012, gloss: .12, tag: '消防站窗内' }), .008, .12);
      for (const side of [-1, 1])
        box(w.x + side * (w.w / 2 - .055), 2.08, AZ1 - .29, .11, 2.40, .58, RENDER2,
          { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站窗洞' });
      for (const [y, color] of [[.83, STONE], [3.29, RENDER2]])
        box(w.x, y, AZ1 - .29, w.w, .11, .58, color,
          { hard: true, gloss: .20, tag: '消防站窗洞' });
      const p = remember(box(w.x, 2.08, glassZ, w.w - .22, 2.12, .025, GLASS,
        { hard: true, mode: 1, alpha: .36, gloss: G.glass, tag: '消防站窗' }), .006, .05);
      p.alpha = .36;
      box(w.x, .78, AZ1 - .025, w.w + .14, .12, .28, COPING,
        { hard: true, gloss: .22, tag: '消防站窗' });
      for (const x of [w.x - w.w / 6, w.x + w.w / 6])
        box(x, 2.08, glassZ + .018, .045, 2.12, .038, STEELD,
          { hard: true, gloss: G.metal, tag: '消防站窗' });
      box(w.x, 2.08, glassZ + .020, w.w - .14, .045, .038, STEELD,
        { hard: true, gloss: G.metal, tag: '消防站窗' });
    }

    // Recessed public lobby and a 1.60 m automatic double door.  Real jamb/head returns and a short
    // lit vestibule replace the former opaque dark slab that made the portal read as a black hole.
    for (const side of [-1, 1]) {
      box(FACE - .35, 1.50, entryZ + side * .80, .70, 3.00, .10, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站入口' });
      box(21.78, 1.48, entryZ + side * .70, 2.92, 2.84, .08, RENDER2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, tag: '消防站入口' });
    }
    box(FACE - .35, 2.96, entryZ, .70, .10, 1.70, RENDER2,
      { hard: true, gloss: .20, tag: '消防站入口' });
    box(21.78, 2.86, entryZ, 2.92, .08, 1.40, RENDER2,
      { hard: true, gloss: .18, tag: '消防站入口' });
    flat(21.55, .025, entryZ, 2.70, 1.48, RENDER2,
      { mode: 7, gloss: .14, ...PAVING, tag: '消防站入口' });
    flat(23.14, .026, entryZ, .48, 1.54, STONE,
      { mode: 9, gloss: .18, tag: '消防站入口' });
    remember(box(20.45, 1.63, entryZ, .10, 2.68, 1.34, GLASSW,
      { hard: true, mode: 1, glow: .07, gloss: .18, tag: '消防站入口' }), .055, .34);
    box(21.28, .96, entryZ, .76, .10, 1.08, BRICKD,
      { hard: true, gloss: .22, tag: '值班室' });
    for (const side of [-1, 1])
      box(21.18, .52, entryZ + side * .42, .10, .82, .09, STEELD,
        { hard: true, gloss: .32, tag: '值班室' });
    box(21.18, 1.34, entryZ, .10, .50, .60, GLASSD,
      { hard: true, mode: 1, glow: .025, gloss: .24, tag: '值班室' });
    glyphs(20.52, 1.70, entryZ, HALF_PI, '值班室',
      { size: .12, gap: .025, color: WHITE, mode: 1, lift: .008, tag: '值班室' });
    remember(box(21.80, 2.79, entryZ, .72, .025, .12, WARM,
      { hard: true, mode: 1, glow: .08, gloss: .18, tag: '消防站入口' }), .055, .34);
    for (const side of [-1, 1]) {
      const p = box(FACE + .030, 1.48, entryZ + side * .39, .035, 2.66, .74, GLASS,
        { hard: true, mode: 1, alpha: .43, gloss: G.glass, tag: '消防站入口' });
      p.alpha = .43; p.ob = null; p.fixed = true;
      p.cx = FACE + .03; p.cy = 1.48; p.cz = entryZ + side * .39;
      p.r = 1.85;
      entryLeaves.push({ p, side, m0: p.m });
      box(FACE + .055, 1.48, entryZ + side * .77, .08, 2.82, .075, REDD,
        { hard: true, gloss: .34, tag: '消防站入口' });
      rod(FACE + .085, 1.40, entryZ + side * .18, .020, .42, .020, STEELD,
        { rx: HALF_PI, gloss: G.metal, tag: '消防站入口' });
    }
    box(FACE + .060, 3.00, entryZ, .09, .16, 1.78, REDD,
      { hard: true, gloss: .32, tag: '消防站入口' });

    // Cantilevered glass canopy with wall brackets only: no columns occupy the tactile route.
    const canopy = remember(ball(FACE + .73, 3.28, entryZ, .78, .055, 1.25, GLASS,
      { mode: 1, alpha: .38, gloss: G.glass, tag: '消防站入口' }), .008, .10);
    canopy.alpha = .38;
    for (const s of [-1, 1]) {
      rod(FACE + .38, 3.08, entryZ + s * .92, .030, .72, .030, STEELD,
        { rz: -.78, gloss: G.metal, tag: '消防站入口' });
      box(FACE + .23, 3.25, entryZ + s * 1.13, .30, .11, .10, REDD,
        { hard: true, gloss: .32, tag: '消防站入口' });
    }
    box(FACE + 1.49, 3.27, entryZ, .07, .09, 2.30, STEELD,
      { hard: true, gloss: .42, tag: '消防站入口' });
    for (const side of [-1, 1])
      box(FACE + .76, 3.27, entryZ + side * 1.14, 1.42, .07, .055, STEELD,
        { hard: true, gloss: .42, tag: '消防站入口' });
    remember(box(FACE + .055, 4.18, entryZ, .11, .56, 3.10, REDD,
      { hard: true, mode: 1, glow: .015, gloss: .24, tag: '消防站入口' }), .015, .16);
    faceText(4.22, entryZ, '便民服务大厅', .225, WHITE, { gap: .043, tag: '消防站入口' });

    // ---------------------------------------------------------------- roof services / water management
    // Clerestory exhaust monitors sit over each appliance bay; low admin vents are kept behind its
    // parapet.  Downpipes land only on solid facade strips and turn into shoes above the paving.
    for (const z of BAY_CENTRES) {
      box(16.25, 7.25, z, 2.50, .84, 1.10, STEELD,
        { hard: true, gloss: .32, tag: '消防车库通风' });
      for (const x of [15.35, 16.05, 16.75, 17.45])
        box(x, 7.27, z + .555, .42, .48, .035, GLASSD,
          { hard: true, gloss: .28, tag: '消防车库通风' });
      ball(16.25, 7.70, z, 1.35, .09, .64, COPING,
        { mode: 7, gloss: .24, tag: '消防车库通风' });
    }
    for (const z of [-31.4, -25.7, -19.9]) {
      cyl(16.65, 5.55, z, .26, .42, STEELD, { gloss: .40, tag: '消防站通风' });
      ball(16.65, 5.79, z, .33, .09, .33, STEEL, { mode: 7, gloss: .42, tag: '消防站通风' });
    }
    for (const [z, h] of [[-53.22, HH], [-36.98, HH], [-14.72, AH]]) {
      cyl(FACE + .075, h / 2, z, .055, h - .30, STEELD,
        { gloss: .42, tag: '消防站排水' });
      rod(FACE + .22, .30, z, .050, .42, .050, STEELD,
        { rz: HALF_PI, gloss: .42, tag: '消防站排水' });
      cyl(FACE + .43, .19, z, .068, .11, STEELD,
        { rz: HALF_PI, gloss: .42, tag: '消防站排水' });
    }

    // ---------------------------------------------------------------- civic forecourt furniture
    // Bollards protect admin glazing only.  None lies within a bay's z-span or in front of the
    // 1.60 m entrance; a 3.18 m clear strip remains between each bollard and the kerb.
    for (const z of [-32.80, -30.35, -27.05]) {
      cyl(23.88, .42, z, .075, .74, STEELD,
        { gloss: .48, tag: '消防站防撞柱' });
      ball(23.88, .82, z, .085, .07, .085, SILVER,
        { mode: 7, gloss: .54, tag: '消防站防撞柱' });
      box(23.88, .48, z + .077, .15, .075, .015, WHITE,
        { hard: true, mode: 1, gloss: .28, tag: '消防站防撞柱' });
    }

    // Hydrant with bonnet, opposed outlets, chain and a painted ground ring.
    const HYDRANT_Z = -29.65;
    flat(23.88, .025, HYDRANT_Z, .76, .76, C('#c9c3b6'),
      { mode: 7, gloss: .14, tag: '消火栓' });
    cyl(23.88, .48, HYDRANT_Z, .17, .70, RED,
      { gloss: .48, tag: '消火栓' });
    ball(23.88, .87, HYDRANT_Z, .23, .14, .23, REDD,
      { mode: 7, gloss: .48, tag: '消火栓' });
    for (const s of [-1, 1]) {
      cyl(23.88, .57, HYDRANT_Z + s * .21, .105, .12, SILVER,
        { rx: HALF_PI, gloss: .58, tag: '消火栓' });
      rod(23.92, .42, HYDRANT_Z + s * .29, .018, .34, .018, C('#6d675e'),
        { rz: s * .32, gloss: .30, tag: '消火栓' });
    }
    thing('消火栓', 23.90, .95, HYDRANT_Z,
      '这是消防站门前的消火栓，周围不能停车。',
      'This is the hydrant outside the fire station; parking around it is forbidden.',
      '消火栓 fire hydrant.',
      { focus: [24.55, HYDRANT_Z], reach: 1.80, tag: '消火栓' });

    // Framed community noticeboard lives in the 1.75 m masonry pier between window bays.  Its
    // lettering is authored on the projected face (not buried inside the acrylic as before), and
    // three distinct advice cards remain readable at ordinary pavement distance.
    const NOTICE_Z = -21.52, NOTICE_X = FACE + .190;
    box(FACE + .055, 1.72, NOTICE_Z, .15, 1.92, 1.46, STEELD,
      { hard: true, gloss: .38, tag: '消防宣传栏' });
    const notice = remember(box(FACE + .138, 1.72, NOTICE_Z, .025, 1.72, 1.28, C('#eee7d4'),
      { hard: true, mode: 1, glow: .015, gloss: .18, tag: '消防宣传栏' }), .01, .10);
    box(FACE + .158, 2.40, NOTICE_Z, .025, .30, 1.18, REDD,
      { hard: true, mode: 6, gloss: .24, tag: '消防宣传栏' });
    glyphs(NOTICE_X, 2.40, NOTICE_Z, HALF_PI, '消防宣传',
      { size: .125, gap: .024, color: WHITE, mode: 1, lift: .010, tag: '消防宣传栏' });
    const advice = [
      [2.02, '防火巡查', RED], [1.63, '安全用电', BLUE], [1.24, '通道畅通', C('#3d7952')],
    ];
    for (const [y, text, color] of advice) {
      box(FACE + .158, y, NOTICE_Z, .025, .30, 1.12, WHITE,
        { hard: true, mode: 1, gloss: .12, tag: '消防宣传栏' });
      ball(NOTICE_X, y, NOTICE_Z - .38, .012, .040, .040, color,
        { mode: 1, gloss: .24, tag: '消防宣传栏' });
      glyphs(NOTICE_X, y, NOTICE_Z + .10, HALF_PI, text,
        { size: .115, gap: .024, color: INK, mode: 1, lift: .010, tag: '消防宣传栏' });
    }
    glyphs(NOTICE_X, .94, NOTICE_Z, HALF_PI, '报警119',
      { size: .115, gap: .024, color: REDD, mode: 1, lift: .010, tag: '消防宣传栏' });
    box(FACE + .13, 2.73, NOTICE_Z, .34, .075, 1.54, COPING,
      { hard: true, gloss: .30, tag: '消防宣传栏' });
    thing('消防宣传栏', FACE + .20, 2.12, -21.52,
      '宣传栏上写着社区防火注意事项。',
      'The noticeboard lists fire-safety advice for the neighbourhood.',
      '宣传栏 public noticeboard.',
      { focus: [24.15, -21.52], reach: 1.90, tag: '消防宣传栏' });

    // A real flag assembly: base shoe, pole, halyard, clips, hoist hem and six thin cloth panels.
    // The panels overlap by two centimetres and gently change x/y angle, preserving a rectangular
    // flag silhouette while producing folds instead of the former row of red ellipsoids.
    const FLAG_X = 23.78, FLAG_Z = -17.22, FLAG_GOLD = C('#e1bc4d');
    cyl(FLAG_X, .12, FLAG_Z, .13, .20, STEELD, { gloss: .42, tag: '消防站旗' });
    cyl(FLAG_X, .25, FLAG_Z, .075, .12, SILVER, { gloss: .56, tag: '消防站旗' });
    cyl(FLAG_X, 3.42, FLAG_Z, .045, 6.72, SILVER, { gloss: .56, tag: '消防站旗' });
    ball(FLAG_X, 6.83, FLAG_Z, .09, .09, .09, C('#d8b24b'),
      { mode: 7, gloss: .56, tag: '消防站旗' });
    rod(FLAG_X + .055, 3.88, FLAG_Z + .045, .011, 5.42, .011, C('#d5d0c3'),
      { gloss: .30, tag: '消防站旗' });
    for (const y of [5.77, 6.69]) {
      ball(FLAG_X + .045, y, FLAG_Z - .055, .032, .032, .032, SILVER,
        { gloss: .54, tag: '消防站旗' });
      rod(FLAG_X + .045, y, FLAG_Z - .105, .012, .12, .012, STEELD,
        { rx: HALF_PI, gloss: .42, tag: '消防站旗' });
    }
    box(FLAG_X + .040, 6.23, FLAG_Z - .14, .030, .98, .075, REDD,
      { hard: true, mode: 7, gloss: .14, tag: '消防站旗' });
    const clothN = 6, clothStep = .285;
    for (let i = 0; i < clothN; i++) {
      const wave = Math.sin(i * 1.12), end = i / (clothN - 1);
      box(FLAG_X + .075 + wave * .035, 6.23 + Math.sin(i * .82) * .025,
        FLAG_Z - .31 - i * clothStep, .026, .98 - end * .025, .325, RED,
        { mode: 7, gloss: .14, rx: wave * .035, ry: wave * .10, tag: '消防站旗' });
    }
    // Atlas stars give a true five-point silhouette and cost fewer props than a rod asterisk.
    glyphs(FLAG_X + .145, 6.42, FLAG_Z - .47, HALF_PI, '★',
      { size: .25, gap: 0, color: FLAG_GOLD, mode: 1, lift: .010, tag: '消防站旗' });
    for (const [y, z] of [[6.55, -17.86], [6.41, -18.02], [6.23, -18.03], [6.09, -17.88]])
      glyphs(FLAG_X + .145, y, z, HALF_PI, '★',
        { size: .075, gap: 0, color: FLAG_GOLD, mode: 1, lift: .010, tag: '消防站旗' });
    // Halyard cleat and opposed horns complete the hardware at hand height.
    box(FLAG_X + .045, 1.48, FLAG_Z + .02, .055, .22, .055, STEELD,
      { hard: true, gloss: .42, tag: '消防站旗' });
    for (const s of [-1, 1])
      rod(FLAG_X + .05, 1.48 + s * .07, FLAG_Z + s * .07, .014, .20, .014, SILVER,
        { rx: s * .75, gloss: .50, tag: '消防站旗' });

    // ---------------------------------------------------------------- lighting / interaction
    for (const z of [BAY_CENTRES[0], BAY_CENTRES[1], BAY_CENTRES[2], entryZ, -21.52]) {
      remember(box(FACE + .16, z === entryZ ? 3.13 : 5.02, z, .16, .10, .30, WARM,
        { hard: true, mode: 1, glow: .06, gloss: .34, tag: '消防站灯' }), .035, .35);
      if (typeof light === 'function') {
        const lm = light(FACE + .72, z === entryZ ? 3.0 : 4.85, z, [1.0, .82, .56], .40, 4.6);
        lm.on = false;
        lamps.push(lm);
      }
    }
    if (typeof glow === 'function' && typeof M !== 'undefined') {
      pools.push({ g: glow(M.trs(24.75, .032, entryZ, 0, 2.5, 1, 4.0), WARM, 0), a: .15 });
      pools.push({ g: glow(M.trs(24.55, .032, OPEN_Z, 0, 2.1, 1, 4.4), WARM, 0), a: .10 });
      for (const z of [BAY_CENTRES[0], BAY_CENTRES[1]])
        pools.push({ g: glow(M.trs(25.10, .032, z, 0, 2.3, 1, 3.8), WARM, 0), a: .065 });
    }

    const station = thing('消防站', FACE + .72, 2.10, entryZ,
      '这是杨柳消防救援站，我从便民服务大厅进去。',
      'This is Yangliu Fire and Rescue Station; I enter through the public service hall.',
      '消防站 fire station. 救援 rescue.',
      { focus: [FIRE_OUT.x, FIRE_OUT.z], reach: 2.35, tag: '消防站入口' });
    station.exit = { place: 'firestation' };

    // Camera blocking follows the complete mass, but player collision follows its actual walls
    // and closed doors. The former monolithic hall solid occupied the open bay and made any swept
    // appliance route fail before its nose reached the apron.
    blocker(HX0, HX1 + .18, HZ0, HZ1, HH + 1.35);
    solid(HX0, HX0 + .34, HZ0, HZ1);                         // rear wall
    solid(HX0, HX1 + .18, HZ0, HZ0 + .34);                  // south return
    solid(HX0, HX1 + .18, HZ1 - .34, HZ1);                  // north return
    const mouths = BAY_CENTRES.map(z => ({ z0:z - BAY_CLEAR / 2, z1:z + BAY_CLEAR / 2 }));
    const frontRuns = [[HZ0, mouths[0].z0], [mouths[0].z1, mouths[1].z0],
      [mouths[1].z1, mouths[2].z0], [mouths[2].z1, HZ1]];
    for (const [z0, z1] of frontRuns) if (z1 > z0)
      solid(HX1 - .12, HX1 + .18, z0, z1);                  // masonry piers
    for (let i = 0; i < 2; i++)
      solid(HX1 - .12, HX1 + .18, mouths[i].z0, mouths[i].z1); // closed doors
    blocker(AX0, AX1 + .18, AZ0, AZ1, AH + .75);
    solid(AX0, AX1 + .18, AZ0, AZ1);

    const applyNight = on => {
      for (const q of lit) q.p.glow = on ? q.night : q.day;
      for (const lm of lamps) lm.on = !!on;
      for (const q of pools) q.g.a = on ? q.a : 0;
    };
    S.firestationLit = applyNight;
    StreetFit['firestation']._applyNight = applyNight;
    StreetFit['firestation'].state = { entry: { open: doorOpen }, bayOpen: 3 };
    StreetFit['firestation'].OUT = FIRE_OUT;
    StreetFit['firestation'].propCount = S.props.length - p0;
  };

  // Geometry metadata is deliberately literal rather than inferred from the props.  It is the
  // audit contract used by the street shell and by future edits to check bay/route clearances.
  StreetFit['firestation'].PLAN = {
    site: { x0: 10.50, x1: 23.20, z0: -54.00, z1: -14.00, depth: 12.70 },
    bays: BAY_CENTRES.map((z, i) => ({
      id: i + 1, centre: { x: FACE, z }, clearWidth: BAY_TRACK_CLEAR,
      structuralWidth: BAY_CLEAR,
      clearHeight: BAY_HEIGHT, clearDepth: 11.95,
      opening: { x: FACE, z0: z - BAY_CLEAR / 2, z1: z + BAY_CLEAR / 2,
                 y0: .10, y1: .10 + BAY_HEIGHT },
      door: i === 2 ? 'open-overhead' : 'sectional-closed',
    })),
    entry: { x: FACE, z: -35.15, clearWidth: 1.60, doorHeight: 2.66,
             outside: FIRE_OUT },
    appliance: {
      length: 8.95, width: 3.06, wheelbase: 4.80, minimumTurnRadius: 9.00,
      source: { x: 17.875, z: BAY_CENTRES[2], heading: 0, bay: 3 },
    },
    apron: { x0: FACE, x1: 27.40, z0: -53.70, z1: -12.80,
             kerbEdgeX: 25.42, roadDatumX: 25.34,
             depthToKerb: 25.42 - FACE, drainX: 25.12 },
    // A truthful emergency-priority multi-point maneuver. The site cannot produce a physically
    // possible nine-metre single arc into one lane: doing so would require turning while the rear
    // is still in a 3.88 m door. These ordered forward/reverse moves clear the door first, use only
    // >=9 m arcs, stay on the bay/apron/road hardstand and finish aligned in the +z bus lane.
    turnout: {
      phase: 'exclusive-emergency-all-stop',
      controls: ['bikeW', 'south', 'north', 'bikeE'],
      cycleCrossing: { x0: 25.42, x1: 27.67,
        z0: BAY_CENTRES[2] - BAY_TRACK_CLEAR / 2,
        z1: BAY_CENTRES[2] + BAY_TRACK_CLEAR / 2,
        marking: 'red-table-yellow-yield-bars' },
      surfaces: [
        { id:'open-bay-3', x0:13.40, x1:FACE, z0:-41.54, z1:-37.66 },
        { id:'apron', x0:FACE, x1:27.40, z0:-53.70, z1:-12.80 },
        { id:'road', x0:25.34, x1:37.50, z0:-90.0, z1:90.0 },
      ],
      segments: [
        { kind:'straight', direction:'forward',
          from:{x:17.875,z:-39.600,heading:0}, to:{x:28.400,z:-39.600,heading:0} },
        { kind:'arc', direction:'forward', turn:'left', radius:9.00, degrees:27,
          center:{x:28.400,z:-30.600},
          from:{x:28.400,z:-39.600,heading:0},
          to:{x:32.485914,z:-38.619059,heading:.471238898} },
        { kind:'arc', direction:'reverse', turn:'right', radius:9.00, degrees:43,
          center:{x:36.571829,z:-46.638117},
          from:{x:32.485914,z:-38.619059,heading:.471238898},
          to:{x:28.114595,z:-43.559936,heading:1.221730476} },
        { kind:'arc', direction:'forward', turn:'left', radius:9.00, degrees:20,
          center:{x:19.657362,z:-40.481755},
          from:{x:28.114595,z:-43.559936,heading:1.221730476},
          to:{x:28.657362,z:-40.481755,heading:HALF_PI} },
        { kind:'arc', direction:'forward', turn:'right', radius:9.00, degrees:30,
          center:{x:37.657362,z:-40.481755},
          from:{x:28.657362,z:-40.481755,heading:HALF_PI},
          to:{x:29.863133,z:-35.981755,heading:PI/3} },
        { kind:'arc', direction:'forward', turn:'left', radius:9.00, degrees:30,
          center:{x:22.068905,z:-31.481755},
          from:{x:29.863133,z:-35.981755,heading:PI/3},
          to:{x:31.068905,z:-31.481755,heading:HALF_PI} },
        // A shallow, truthful S-offset moves the final alignment 8.1095 cm east. Without it the
        // 3.06 m appliance cleared the protected platform by only 6.89 cm; the new centre x31.15
        // preserves a measured 15 cm throughout the final approach while both arcs retain R=9 m.
        { kind:'arc', direction:'forward', turn:'right', radius:9.00,
          degrees:5.440785483, center:{x:40.068905,z:-31.481755},
          from:{x:31.068905,z:-31.481755,heading:HALF_PI},
          to:{x:31.109453,z:-30.628402,heading:1.475836706} },
        { kind:'arc', direction:'forward', turn:'left', radius:9.00,
          degrees:5.440785483, center:{x:22.150000,z:-29.775050},
          from:{x:31.109453,z:-30.628402,heading:1.475836706},
          to:{x:31.150000,z:-29.775050,heading:HALF_PI} },
        { kind:'straight', direction:'forward',
          from:{x:31.150000,z:-29.775050,heading:HALF_PI},
          to:{x:31.150000,z:-18.000,heading:HALF_PI} },
      ],
    },
    clearances: {
      minimumBayWidth: 3.80, actualBayWidth: BAY_TRACK_CLEAR,
      entranceToNearestBayEdge: 1.60,
      publicRouteWidth: 2.00,
      minimumPlatformGap: .15,
      busShelterEnvelope: { x0: 27.67, x1: 27.97, z0: -15.18, z1: -10.15 },
      northConnector: { x0: FACE, x1: 25.42, z0: -16.85, z1: -12.80 },
    },
  };
  StreetFit['firestation'].OUT = FIRE_OUT;

  // Dispatch uses the road signal's one deterministic emergency clock. A fire module with its own
  // timer could tell cars to stop while cycles kept moving (or vice versa), which is precisely the
  // conflict the four-stream turnout contract exists to prevent.
  StreetFit['firestation'].dispatch = (at, duration = 12) => {
    const emergency = StreetFit.road && StreetFit.road.signal &&
      StreetFit.road.signal.emergency;
    return emergency && typeof emergency.activate === 'function'
      ? emergency.activate('fire-turnout', at, duration) : 0;
  };
  StreetFit['firestation'].cancelDispatch = token => {
    const emergency = StreetFit.road && StreetFit.road.signal &&
      StreetFit.road.signal.emergency;
    return !!(emergency && typeof emergency.cancel === 'function' && emergency.cancel(token));
  };

  StreetFit['firestation'].tick = (t, body, mins) => {
    const dt = lastTick ? Math.min(.20, Math.max(0, t - lastTick)) : 0;
    lastTick = t;
    const x = body && Number.isFinite(body.x) ? body.x : 99;
    const z = body && Number.isFinite(body.z) ? body.z : 99;
    const near = Math.abs(x - FIRE_OUT.x) < 2.65 && Math.abs(z - FIRE_OUT.z) < 2.15;
    const target = near ? 1 : 0;
    doorOpen += (target - doorOpen) * (1 - Math.exp(-dt * (target ? 7.0 : 4.0)));
    if (Math.abs(target - doorOpen) < .001) doorOpen = target;
    // Once the leaves reach either stop, leave their matrices alone.  The district tick runs every
    // frame, but a closed civic entrance should not perform matrix allocations forever.
    if ((doorOpen === target && appliedDoorOpen !== target)
        || Math.abs(doorOpen - appliedDoorOpen) > .0005) {
      appliedDoorOpen = doorOpen;
      for (const q of entryLeaves)
        q.p.m = M.mul(M.trans(0, 0, q.side * .57 * doorOpen), q.m0);
    }
    const st = StreetFit['firestation'] && StreetFit['firestation'].state;
    if (st && st.entry) st.entry.open = doorOpen;

    if (mins !== undefined) {
      const h = ((mins / 60) % 24 + 24) % 24;
      const night = h < 6.2 || h >= 18.45 ? 1 : 0;
      if (night !== lastNight) {
        lastNight = night;
        const fn = StreetFit['firestation'] && StreetFit['firestation']._applyNight;
        if (fn) fn(night);
      }
    }
  };
})();
