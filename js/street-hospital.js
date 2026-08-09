// 北京市仁和医院 — the hospital frontage on the west side of the main road.
//
// The street shell already carries a deliberately plain civic mass here: x 10.5..23.2,
// z 9..43, fourteen metres high, with an anonymous grid of windows on its road face at x 23.1.
// That mass is useful structure and stays. This district skins it as a real public hospital,
// raises the central bed tower to thirty metres, and gives the long blank pavement a destination.
// Nothing named is removed or rebuilt.
//
// Access is from the west-side pavement only. street.js adds a narrow overlapping walk zone up
// that pavement; it does not extend the carriageway or the opposite pavement, so this building
// cannot become a way around the controlled crossing at the hutong mouth.

(() => {
  'use strict';

  // The atlas is assembled after scripts load but before the lazy street scene is first built.
  // Register every character unique to this facade now, not when the player is already outside.
  try { Glyphs.need('北京市仁和医院门诊楼急诊住院部挂号药房检验科放射科无障碍救护车入口出口二十四小时'); } catch (_) {}

  const lit = [];             // { p, day, night }
  const lamps = [];           // real lights, off in daylight
  const pools = [];           // { g, a }
  const entryDoors = {
    main: { parts:[], open:1, near:true, slide:.92 },
    emergency: { parts:[], open:0, near:false, slide:.82 },
  };
  const beacons = [];
  let lastLight = -1;
  let lastTick = 0;

  const remember = (p, day = .02, night = .34) => {
    p.glow = day;
    lit.push({ p, day, night });
    return p;
  };

  StreetFit['hospital'] = S => {
    const p0 = S.props.length;
    const { box, cyl, ball, taper, flat, glyphs, cap, blocker, shade, glow,
            thing, light, C, G, col } = S;

    // ---------------------------------------------------------------- site and palette
    const FACE = 23.38;       // 28 cm proud of the anonymous shell's x=23.10 window plane
    const Z0 = 9.00, Z1 = 43.00, MID = 26.00;
    const MAIN = 22.20, ED = 35.55;
    const TAG = { tag: '医院' };
    const EDT = { tag: '急诊' };

    const STONE = C('#d7d4cc'), STONE2 = C('#c2c2bd'), STONED = C('#8e9395');
    const WHITE = C('#f1f2ef'), INK = C('#263039'), BLUE = C('#286584');
    const BLUED = C('#17445d'), BLUE2 = C('#4d91ad'), GLASS = C('#6f8f9f');
    const GLASSD = C('#203744'), LOBBY = C('#b8d5dc'), RED = C('#b62f2a');
    const REDD = C('#7f201d'), REDL = C('#ed5a4c'), WARM = C('#ffe8ba');
    const COOL = C('#dff5f7'), TACT = C('#d5aa27'), GREEN = C('#3e7659');
    const CONC = C('#a9aaa6'), STEEL = C('#69757b');
    const PLASTER = { mat: 'plaster', matScale: 2.8, matAmt: .13 };

    const faceText = (y, z, text, size, color, o = {}) =>
      glyphs(FACE + .105, y, z, Math.PI / 2, text,
        { size, gap: size * .20, color, mode: 1, lift: .009, tag: o.tag || '医院',
          vertical: !!o.vertical });

    // The street renderer packs cull spheres once when the district finishes building.  Each
    // automatic-door part therefore carries one deliberately broad sphere spanning its full
    // travel, and no stale pick box; the named threshold remains the interaction target.
    const movingDoorPart = (door, p, side, y, z) => {
      p.ob = null; p.fixed = true;
      p.cx = FACE + .38; p.cy = y; p.cz = z - side * door.slide * .50;
      p.r = 1.82 + door.slide;
      door.parts.push({ p, side, m0:p.m });
      return p;
    };

    // ---------------------------------------------------------------- the old mass becomes a hospital
    // One opaque skin is essential. Merely adding hospital windows over the old anonymous ones
    // leaves both sets visible between the new bays; two buildings then occupy the same facade.
    box(FACE - .14, 7.00, MID, .28, 14.00, Z1 - Z0, STONE,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    box(FACE + .015, .46, MID, .16, .92, Z1 - Z0 + .20, STONED,
      { hard: true, mode: 9, gloss: .20, ...TAG });

    // Four strongly legible clinical floors in the long podium. Recess panels make the windows
    // read as openings rather than blue stickers; the white bands carry the floor rhythm.
    const floorY = [2.30, 6.15, 9.80, 13.15];
    const bayZ = [11.10, 14.15, 17.20, 27.70, 30.35, 39.40, 41.55];
    for (const y of floorY) {
      for (const z of bayZ) {
        box(FACE + .035, y, z, .10, 1.76, 2.18, GLASSD,
          { hard: true, gloss: .24, ...TAG });
        const pane = box(FACE + .095, y, z, .035, 1.56, 1.98, GLASS,
          { hard: true, mode: 1, gloss: G.glass, ...TAG });
        if (y < 3) remember(pane, .025, .17 + ((z * 7) % 3) * .035);
        box(FACE + .12, y - .90, z, .20, .10, 2.42, WHITE,
          { hard: true, gloss: G.paint, ...TAG });
      }
    }
    for (const y of [4.25, 8.05, 11.78])
      box(FACE + .045, y, MID, .18, .22, Z1 - Z0, WHITE,
        { hard: true, gloss: G.paint, ...TAG });
    for (const z of [9.22, 18.72, 25.78, 32.45, 38.02, 42.78])
      box(FACE + .055, 7.25, z, .20, 14.50, .34, STONE2,
        { hard: true, gloss: G.paint, ...TAG });

    // ---------------------------------------------------------------- the thirty-metre bed tower
    // The existing block supplies its lower fourteen metres. This volume overlaps it by 40 cm so
    // there is no daylight seam at the handoff, and its road face stays just behind the skin.
    const TZ0 = 13.65, TZ1 = 30.75, TC = (TZ0 + TZ1) / 2;
    box(17.40, 22.00, TC, 11.40, 16.80, TZ1 - TZ0, STONE2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    box(FACE - .16, 22.00, TC, .30, 16.80, TZ1 - TZ0, STONE,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    blocker(11.70, 23.24, TZ0, TZ1, 30.55);

    // Five upper window rows. Their staggered warmth keeps the inpatient tower alive at night
    // without turning every room into the same luminous square.
    const upperY = [15.55, 18.70, 21.85, 25.00, 28.15];
    const upperZ = [15.35, 18.05, 20.75, 23.45, 26.15, 28.85];
    for (let f = 0; f < upperY.length; f++) for (let i = 0; i < upperZ.length; i++) {
      const y = upperY[f], z = upperZ[i];
      box(FACE + .025, y, z, .09, 1.64, 1.82, GLASSD,
        { hard: true, gloss: .24, ...TAG });
      const p = box(FACE + .082, y, z, .028, 1.46, 1.64,
        i % 3 === 1 ? LOBBY : GLASS, { hard: true, mode: 1, gloss: G.glass, ...TAG });
      remember(p, .012, ((f * 5 + i * 3) % 4) ? .20 : .06);
      box(FACE + .105, y - .85, z, .14, .09, 2.02, WHITE,
        { hard: true, gloss: G.paint, ...TAG });
    }
    for (const y of [17.15, 20.30, 23.45, 26.60, 29.72])
      box(FACE + .035, y, TC, .16, .15, TZ1 - TZ0, WHITE,
        { hard: true, gloss: G.paint, ...TAG });

    // The tower's south return is visible all the way up the approach. Windows here stop that
    // thirty-metre flank becoming the next blank wall the hospital was meant to replace.
    for (const y of upperY) for (const x of [13.70, 16.55, 19.40, 21.80]) {
      box(x, y, TZ0 - .07, 2.05, 1.58, .10, GLASSD, { hard: true, gloss: .22, ...TAG });
      const p = box(x, y, TZ0 - .135, 1.85, 1.40, .035, GLASS,
        { hard: true, mode: 1, gloss: G.glass, ...TAG });
      remember(p, .01, ((x * 10 + y * 3) | 0) % 3 ? .16 : .04);
    }

    // Roof cap, plant and the red cross. Mechanical equipment is grouped behind the parapet,
    // high enough to silhouette but not high enough to compete with the hospital name.
    box(17.40, 30.52, TC, 11.82, .34, TZ1 - TZ0 + .42, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    box(16.10, 31.25, 19.10, 3.20, 1.20, 4.20, STEEL,
      { hard: true, gloss: .28, mat: 'steel', matScale: .8, matAmt: .30, ...TAG });
    for (let i = 0; i < 5; i++)
      box(22.00, 31.05, 15.35 + i * .62, 1.20, .62, .10, STONED,
        { hard: true, gloss: .24, ...TAG });

    // A primitive cross stays crisp at skyline distance and does not depend on a font symbol.
    remember(box(FACE + .16, 27.30, 12.12, .12, 2.70, .72, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .08, .58);
    remember(box(FACE + .17, 27.30, 12.12, .12, .72, 2.70, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .08, .58);

    // The civic name, large enough to read from the crossing. It is lettered twice: horizontal
    // over the entrance and vertically on the tower shoulder, as large Beijing hospitals are.
    box(FACE + .065, 12.68, MAIN, .18, 1.16, 14.20, BLUED,
      { hard: true, gloss: .26, ...TAG });
    faceText(12.70, MAIN, '北京市仁和医院', .86, WHITE);
    box(FACE + .070, 21.95, 31.48, .18, 13.70, 1.42, BLUED,
      { hard: true, gloss: .26, ...TAG });
    faceText(21.95, 31.48, '仁和医院', .75, WHITE, { vertical: true });

    // ---------------------------------------------------------------- 门诊 main entrance
    // The dark reveal is a room behind the glazing, not a charcoal door pasted over the wall.
    box(FACE + .015, 2.10, MAIN, .42, 4.20, 8.30, BLUED,
      { hard: true, gloss: .22, ...TAG });
    const lobby = remember(box(FACE + .255, 1.98, MAIN, .08, 3.76, 7.82, LOBBY,
      { hard: true, mode: 1, alpha: .64, gloss: G.glass, ...TAG }), .05, .34);
    box(FACE + .285, 1.45, MAIN, .035, 2.70, 3.10, GLASSD,
      { hard: true, mode: 1, alpha: .42, gloss: G.glass, ...TAG });
    for (const z of [MAIN - 1.48, MAIN, MAIN + 1.48])
      box(FACE + .345, 1.48, z, .08, 2.86, .075, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
    for (const side of [-1, 1]) {
      const z = MAIN + side * (.72 + entryDoors.main.slide);
      movingDoorPart(entryDoors.main, box(FACE + .37, 1.44, z, .065, 2.72, 1.38, GLASS,
        { hard: true, mode: 1, alpha: .62, gloss: G.glass, ...TAG }), side, 1.44, z);
      movingDoorPart(entryDoors.main,
        cap(FACE + .43, 1.43, z + side * .38, .018, .62, .018, STEEL,
          { rx: Math.PI / 2, gloss: G.metal, ...TAG }), side, 1.43, z);
    }

    // Deep porte-cochere, but with its two supports held against the facade edges. The whole line
    // x 24.45..26.85 around x 25.2 stays unobstructed for somebody walking along the pavement.
    box(24.72, 4.04, MAIN, 2.76, .24, 8.72, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    box(24.72, 3.88, MAIN, 2.66, .08, 8.52, STONED,
      { hard: true, gloss: .24, ...TAG });
    remember(box(24.72, 3.82, MAIN, 2.30, .035, 7.96, COOL,
      { hard: true, mode: 1, gloss: .18, ...TAG }), .05, .46);
    for (const z of [MAIN - 3.76, MAIN + 3.76]) {
      box(23.78, 1.94, z, .18, 3.88, .18, STONED,
        { hard: true, gloss: .28, ...TAG });
    }
    remember(box(26.12, 3.98, MAIN, .15, .66, 8.26, BLUE,
      { hard: true, mode: 1, gloss: .24, ...TAG }), .025, .25);
    glyphs(26.21, 4.00, MAIN, Math.PI / 2, '门诊楼',
      { size: .46, gap: .14, color: WHITE, mode: 1, lift: .010, tag: '医院' });
    glyphs(26.22, 3.57, MAIN, Math.PI / 2, 'OUTPATIENT',
      { size: .12, gap: .035, color: COOL, mode: 1, lift: .008, tag: '医院' });

    // Tactile route from the kerb to the automatic doors, with a warning field at the threshold.
    flat(25.25, .019, MAIN, 3.65, .34, TACT, { gloss: .12, ...TAG });
    for (let i = 0; i < 8; i++) for (const dz of [-.13, .13])
      cyl(23.72 + i * .075, .034, MAIN + dz, .022, .012, C('#bc9020'),
        { gloss: .10, ...TAG });
    flat(23.98, .020, MAIN, .64, .88, TACT, { gloss: .12, ...TAG });

    // Two low bollards stop a car entering the lobby but sit at the door edges, not in the route.
    for (const z of [MAIN - 1.88, MAIN + 1.88]) {
      cyl(24.10, .34, z, .075, .68, STEEL, { gloss: G.metal, ...TAG });
      cyl(24.10, .70, z, .082, .045, WHITE, { gloss: .30, ...TAG });
    }

    const door = thing('医院', FACE + .40, 2.10, MAIN,
      '这是北京市仁和医院，先去一楼挂号。',
      'This is Beijing Renhe Hospital. Register on the ground floor first.',
      '医院 hospital. 门诊 is outpatient care, 挂号 is to register, and 住院 is to be admitted.',
      { tag: '医院', focus: [HOSPITAL_OUT.x, HOSPITAL_OUT.z], reach: 2.35 });
    door.exit = { place: 'hospital', at: { x: 0, z: -9.65, yaw: 0 } };

    // ---------------------------------------------------------------- 急诊 emergency entrance
    // Farther north, visually and operationally separate. The canopy is high and deep enough for
    // an ambulance, but no decorative ambulance is parked across the pedestrian route.
    box(FACE + .015, 1.82, ED, .42, 3.64, 6.05, REDD,
      { hard: true, gloss: .22, ...EDT });
    remember(box(FACE + .255, 1.67, ED, .08, 3.18, 5.58, LOBBY,
      { hard: true, mode: 1, alpha: .60, gloss: G.glass, ...EDT }), .06, .42);
    for (const z of [ED - 1.28, ED, ED + 1.28])
      box(FACE + .35, 1.55, z, .07, 2.86, .07, STEEL,
        { hard: true, gloss: G.metal, ...EDT });
    for (const side of [-1, 1]) {
      const z=ED+side*(.65+entryDoors.emergency.slide);
      movingDoorPart(entryDoors.emergency,
        box(FACE+.37,1.53,z,.065,2.78,1.24,GLASS,
          {hard:true,mode:1,alpha:.60,gloss:G.glass,...EDT}),side,1.53,z);
      movingDoorPart(entryDoors.emergency,
        box(FACE+.425,1.08,z,.018,.075,1.00,REDL,
          {hard:true,mode:1,alpha:.88,...EDT}),side,1.08,z);
    }

    box(24.58, 4.30, ED, 2.42, .25, 8.10, WHITE,
      { hard: true, gloss: G.paint, ...EDT });
    box(24.58, 4.13, ED, 2.30, .08, 7.90, REDD,
      { hard: true, gloss: .24, ...EDT });
    remember(box(25.83, 4.25, ED, .16, .84, 7.62, RED,
      { hard: true, mode: 1, gloss: .24, ...EDT }), .06, .48);
    glyphs(25.93, 4.28, ED - .52, Math.PI / 2, '急诊',
      { size: .58, gap: .17, color: WHITE, mode: 1, lift: .010, tag: '急诊' });
    glyphs(25.94, 3.79, ED - .42, Math.PI / 2, '24小时',
      { size: .18, gap: .05, color: WARM, mode: 1, lift: .008, tag: '急诊' });
    glyphs(25.94, 3.83, ED + 2.15, Math.PI / 2, '救护车入口',
      { size: .145, gap: .034, color: WHITE, mode: 1, lift: .008, tag: '急诊' });
    for (const z of [ED - 3.52, ED + 3.52])
      box(23.80, 2.06, z, .18, 4.12, .18, STONED,
        { hard: true, gloss: .28, ...EDT });
    // Red beacons at each canopy corner.
    for (const z of [ED - 3.52, ED + 3.52]) {
      beacons.push(cyl(25.78, 4.86, z, .10, .18, REDL,
        { mode: 1, glow: .28, gloss: .30, ...EDT }));
      taper(25.78, 5.00, z, .23, .12, .23, C('#5b6268'), { gloss: .30, ...EDT });
    }
    // A second thing teaches the emergency word but uses the same hospital scene entry.
    const emergency = thing('急诊', FACE + .42, 2.00, ED,
      '急诊二十四小时开门。',
      'The emergency department is open twenty-four hours.',
      '急 urgent + 诊 to examine. 急诊 is the emergency department; 救护车 is an ambulance.',
      { tag: '急诊', focus: [24.35, ED], reach: 2.35 });
    emergency.exit = { place: 'hospital', at: { x: 6.4, z: -5.8, yaw: -Math.PI / 2 } };

    // ---------------------------------------------------------------- forecourt and wayfinding
    // A hospital directory at the start of the new pavement. It is close to the wall; the clear
    // walking spine remains centred on x 25.2 from z 13 to 42.
    const WX = 24.00, WZ = 14.75;
    box(WX, 1.48, WZ, .26, 2.78, 1.42, BLUED,
      { hard: true, gloss: .28, tag: '指示牌' });
    remember(box(WX + .145, 1.53, WZ, .035, 2.46, 1.20, WHITE,
      { hard: true, mode: 1, gloss: .18, tag: '指示牌' }), .02, .18);
    glyphs(WX + .172, 2.37, WZ, Math.PI / 2, '院区导航',
      { size: .16, gap: .044, color: BLUE, mode: 1, lift: .007, tag: '指示牌' });
    const rows = [['门诊', MAIN, BLUE], ['急诊', ED, RED], ['住院部', 28.2, GREEN],
                  ['药房', 18.5, BLUE2]];
    rows.forEach(([name, z, c], i) => {
      box(WX + .175, 1.93 - i * .42, WZ, .035, .30, 1.02, c,
        { hard: true, mode: 1, gloss: .18, tag: '指示牌' });
      glyphs(WX + .198, 1.93 - i * .42, WZ - .11, Math.PI / 2, name,
        { size: .12, gap: .025, color: WHITE, mode: 1, lift: .006, tag: '指示牌' });
      // Simple direction arrow: all destinations lie north except the pharmacy by the main door.
      box(WX + .202, 1.93 - i * .42, WZ + .39, .026, .035, .25, WHITE,
        { hard: true, mode: 1, gloss: .12, tag: '指示牌' });
      box(WX + .202, 1.93 - i * .42, WZ + .50, .026, .13, .13, WHITE,
        { hard: true, mode: 1, ry: Math.PI / 4, gloss: .12, tag: '指示牌' });
    });
    cyl(WX, .10, WZ, .32, .20, STONED, { gloss: .24, tag: '指示牌' });
    thing('指示牌', WX + .20, 1.50, WZ,
      '指示牌上写着门诊、急诊和住院部。',
      'The directory lists outpatients, emergency, and the inpatient department.',
      '指示 to indicate + 牌 a signboard. 院区 is the hospital campus.',
      { tag: '指示牌', focus: [24.55, WZ], reach: 1.8 });

    // Waiting bench and planters stay against the wall. Nothing occupies x 24.55..26.70.
    const bench = (z) => {
      box(23.77, .48, z, .55, .08, 2.25, STONED, { hard: true, gloss: .24, tag: '等候' });
      box(23.62, .82, z, .12, .74, 2.25, STEEL, { hard: true, gloss: .28, tag: '等候' });
      for (const zz of [z - .82, z + .82])
        cap(23.76, .24, zz, .035, .46, .035, STEEL, { gloss: G.metal, tag: '等候' });
    };
    bench(28.65);
    for (const z of [12.55, 17.05, 27.05, 40.60]) {
      taper(23.78, .29, z, .62, .58, .62, CONC, { gloss: .22, tag: '绿化' });
      cyl(23.78, .60, z, .25, .18, C('#514a3f'), { gloss: .14, tag: '绿化' });
      for (let i = 0; i < 4; i++)
        ball(23.78, .95 + (i % 2) * .16, z - .20 + i * .13, .31, .26, .28,
          i % 2 ? C('#496d4a') : C('#5b8355'), { mode: 15, gloss: .10, tag: '绿化' });
    }

    // Accessible entrance plate and call button beside the main doors.
    box(FACE + .37, 1.53, MAIN - 2.62, .08, .50, .52, BLUE,
      { hard: true, gloss: .28, tag: '无障碍' });
    glyphs(FACE + .425, 1.65, MAIN - 2.62, Math.PI / 2, '无障碍',
      { size: .10, gap: .022, color: WHITE, mode: 1, lift: .006, tag: '无障碍' });
    cyl(FACE + .435, 1.28, MAIN - 2.62, .045, .035, REDL,
      { rz: Math.PI / 2, gloss: .40, tag: '无障碍' });

    // The kerb rail tells the truth about the collision boundary and keeps this extension from
    // looking like a pavement that arbitrarily refuses to let you step into the road. The wide
    // break at 急诊 is the ambulance mouth; the walk zone still keeps the player safe.
    function rail(z0, z1) {
      const n = Math.ceil((z1 - z0) / 2.15);
      for (let i = 0; i <= n; i++) {
        const z = z0 + (z1 - z0) * (i / n);
        cap(27.20, .54, z, .043, 1.02, .043, STEEL, { gloss: .38, tag: '护栏' });
        cyl(27.20, 1.08, z, .050, .05, WHITE, { gloss: .36, tag: '护栏' });
      }
      for (const y of [.52, 1.02])
        cap(27.20, y, (z0 + z1) / 2, .035, z1 - z0, .035, WHITE,
          { rx: Math.PI / 2, gloss: .36, tag: '护栏' });
    }
    rail(13.00, 31.25);
    rail(39.75, 42.55);

    // Two hospital lamps, blue wayfinding pennants and realistic pools after dark.
    for (const [z, label] of [[16.55, '门诊'], [30.20, '住院']]) {
      cyl(26.58, 2.62, z, .075, 5.24, STEEL, { gloss: .36, tag: '路灯' });
      box(26.58, 5.20, z, .34, .14, .62, STEEL, { hard: true, gloss: .34, tag: '路灯' });
      const lamp = light(26.20, 4.92, z, [.82, .94, 1.0], .48, 7.2);
      lamp.on = false; lamps.push(lamp);
      remember(box(26.53, 3.65, z, .08, .88, .78, BLUE,
        { hard: true, mode: 1, gloss: .22, tag: '路灯' }), .015, .22);
      glyphs(26.47, 3.65, z, -Math.PI / 2, label,
        { size: .17, gap: .04, color: WHITE, mode: 1, vertical: true, lift: .007, tag: '路灯' });
      pools.push({ g: glow(M.trs(25.45, .032, z, 0, 3.3, 1, 5.5), COOL, 0), a: .19 });
    }
    const entryLamp = light(24.40, 3.80, MAIN, [1.0, .90, .72], .44, 6.0);
    entryLamp.on = false; lamps.push(entryLamp);
    const edLamp = light(24.60, 4.10, ED, [1.0, .80, .72], .52, 7.0);
    edLamp.on = false; lamps.push(edLamp);
    pools.push({ g: glow(M.trs(25.10, .034, MAIN, 0, 4.2, 1, 8.4), WARM, 0), a: .22 });
    pools.push({ g: glow(M.trs(25.10, .034, ED, 0, 4.0, 1, 8.2), REDL, 0), a: .14 });

    shade(22.70, MID, 4.8, Z1 - Z0 + 1.2, .23);
    shade(24.62, MAIN, 3.4, 9.2, .24);
    shade(24.55, ED, 3.2, 8.6, .22);

    StreetFit['hospital'].OUT = HOSPITAL_OUT;
    StreetFit['hospital'].propCount = S.props.length - p0;
  };

  // The street's setNight list is private to street.js. Drive this district's panels from the
  // same clock, quantised so a static building does no redundant work every frame.
  StreetFit['hospital'].tick = (t, body, mins) => {
    const dt=lastTick?Math.min(.20,Math.max(0,t-lastTick)):0;
    lastTick=t;
    const px=body&&Number.isFinite(body.x)?body.x:99;
    const pz=body&&Number.isFinite(body.z)?body.z:99;
    const animateDoor=(door,z,rangeZ)=>{
      const near=Math.abs(px-24.25)<3.35 && Math.abs(pz-z)<(door.near?rangeZ+.55:rangeZ);
      const target=near?1:0;
      const rate=target?7.2:4.4;
      door.open+=(target-door.open)*(1-Math.exp(-dt*rate));
      if(Math.abs(target-door.open)<.001) door.open=target;
      for(const q of door.parts)
        q.p.m=M.mul(M.trans(0,0,-q.side*door.slide*(1-door.open)),q.m0);
      door.near=near;
    };
    animateDoor(entryDoors.main,22.20,2.85);
    animateDoor(entryDoors.emergency,35.55,3.15);
    for(let i=0;i<beacons.length;i++)
      beacons[i].glow=.18+.22*(.5+.5*Math.sin(t*5.4+i*Math.PI));

    if (mins !== undefined) {
      const h = ((mins / 60) % 24 + 24) % 24;
      // Hospital interiors come up before shops and stay on until after dawn.
      const raw = h >= 17.75 ? Math.min(1, (h - 17.75) / 1.35)
                : h < 7.05 ? Math.min(1, (7.05 - h) / 1.20) : 0;
      const q = (raw * 30) | 0;
      if (q !== lastLight) {
        lastLight = q;
        const k0 = q / 30, k = k0 * k0 * (3 - 2 * k0);
        for (const e of lit) e.p.glow = e.day + (e.night - e.day) * k;
        for (const l of lamps) l.on = k > .08;
        for (const e of pools) e.g.a = e.a * k;
      }
    }
  };
})();
