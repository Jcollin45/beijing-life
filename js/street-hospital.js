// 北京市澄安医院 — the hospital frontage on the west side of the main road.
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
  try { Glyphs.need('北京市澄安医院门诊楼急诊住院部挂号药房检验科放射科影像中心综合楼发热无障碍救护车入口出口二十四小时'); } catch (_) {}

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
    const ACCESS = StreetFit.road && StreetFit.road.signal &&
      StreetFit.road.signal.hospitalAccess;
    if (!ACCESS) throw new Error('hospital frontage requires the road hospitalAccess contract');

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

    // The street renderer packs cull spheres once when the district finishes building.  Each
    // automatic-door part therefore carries one deliberately broad sphere spanning its full
    // travel, and no stale pick box; the named threshold remains the interaction target.
    const movingDoorPart = (door, p, side, y, z) => {
      p.ob = null; p.fixed = true;
      p.cx = FACE + .16; p.cy = y; p.cz = z - side * door.slide * .50;
      p.r = 1.82 + door.slide;
      door.parts.push({ p, side, m0:p.m });
      return p;
    };

    // ---------------------------------------------------------------- stepped civic campus
    // The old shell still supplies the structure and collisions, but its anonymous road face is
    // covered by five independently set-out wings. Their projections, heights, joints and caps
    // change at real programme boundaries instead of reading as one 34 metre texture strip.
    const SHELL_X = 23.04;
    const roadWing = (z0, z1, face, rear, height, color, tag = TAG) => {
      const d = face - rear;
      box(rear + d / 2, height / 2, (z0 + z1) / 2, d, height, z1 - z0, color,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...tag });
      box(face + .025, .42, (z0 + z1) / 2, .15, .84, z1 - z0 + .04, STONED,
        { hard: true, mode: 9, gloss: .20, ...tag });
      box(rear + d / 2, height + .10, (z0 + z1) / 2,
        d + .10, .20, z1 - z0 + .08, WHITE,
        { hard: true, gloss: G.paint, ...tag });
    };
    const joint = (z, a, b, h, color = STONED) => {
      const x0 = Math.min(a, b) - .015, x1 = Math.max(a, b) + .07;
      box((x0 + x1) / 2, h / 2, z, x1 - x0, h, .18, color,
        { hard: true, mode: 9, gloss: .20, ...TAG });
    };
    const roadWindow = (face, y, z, h, w, tint = GLASS, night = .15,
                        panes = 2, tag = TAG) => {
      box(face + .018, y, z, .075, h + .28, w + .28, INK,
        { hard: true, gloss: .20, ...tag });
      const p = box(face + .066, y, z, .028, h, w, tint,
        { hard: true, mode: 1, alpha: .80, gloss: G.glass, ...tag });
      if (night !== null) remember(p, .014, night);
      for (let i = 1; i < panes; i++)
        box(face + .089, y, z - w / 2 + w * i / panes, .025, h - .08, .045, STEEL,
          { hard: true, gloss: G.metal, ...tag });
      box(face + .10, y - h / 2 - .09, z, .16, .09, w + .36, WHITE,
        { hard: true, gloss: G.paint, ...tag });
    };
    const southWindow = (south, y, x, h, w, night = .14) => {
      box(x, y, south - .018, w + .28, h + .26, .075, INK,
        { hard: true, gloss: .20, ...TAG });
      const p = box(x, y, south - .066, w, h, .028, GLASS,
        { hard: true, mode: 1, alpha: .78, gloss: G.glass, ...TAG });
      remember(p, .012, night);
      box(x, y - h / 2 - .08, south - .09, w + .34, .08, .15, WHITE,
        { hard: true, gloss: G.paint, ...TAG });
    };
    const westWindow = (west, y, z, h, w, night = .14) => {
      box(west - .018, y, z, .075, h + .26, w + .28, INK,
        { hard: true, gloss: .20, ...TAG });
      const p = box(west - .066, y, z, .028, h, w, GLASS,
        { hard: true, mode: 1, alpha: .78, gloss: G.glass, ...TAG });
      remember(p, .012, night);
      box(west - .09, y - h / 2 - .08, z, .15, .08, w + .34, WHITE,
        { hard: true, gloss: G.paint, ...TAG });
    };
    const northWindow = (north, y, x, h, w, night = .14) => {
      box(x, y, north + .018, w + .28, h + .26, .075, INK,
        { hard: true, gloss: .20, ...TAG });
      const p = box(x, y, north + .066, w, h, .028, GLASS,
        { hard: true, mode: 1, alpha: .78, gloss: G.glass, ...TAG });
      remember(p, .012, night);
      box(x, y - h / 2 - .08, north + .09, w + .34, .08, .15, WHITE,
        { hard: true, gloss: G.paint, ...TAG });
    };

    const SOUTH_FACE = 23.58, MAIN_FACE = 23.31, WARD_FACE = 23.53;
    const ED_FACE = 23.44, NORTH_FACE = 23.27;
    // Each frontage is now its own deep clinical wing. The former shared street.js backing was a
    // single 13 x 14 x 34 m cuboid whose blank north return hid this authored facade from the
    // cycle track. Unequal rear setbacks make the first four real bars; the short north end is
    // resolved below as a service pavilion, stair lantern and clinical bar instead of one end wall.
    roadWing(Z0, 17.85, SOUTH_FACE, 10.92, 13.80, STONE2);
    roadWing(17.85, 26.55, MAIN_FACE, 11.68, 11.60, STONE);
    roadWing(26.55, 32.25, WARD_FACE, 10.72, 14.20, STONE2);
    roadWing(32.25, 39.25, ED_FACE, 11.82, 10.70, WHITE, EDT);

    // The transverse cycle-track view lands squarely on this end. Three staggered volumes keep
    // the hospital connected at its south spine while giving each programme an independent roof,
    // material and north line. The narrow clinical bar still occupies the complete z=39.25..43
    // road frontage at x=23.27, so none of the authored east facade or entrances move.
    const endMass = (x0, x1, z0, z1, height, color, tag = TAG) => {
      box((x0 + x1) / 2, height / 2, (z0 + z1) / 2,
        x1 - x0, height, z1 - z0, color,
        { hard:true, mode:14, gloss:G.paint, ...PLASTER, ...tag });
      box((x0 + x1) / 2, height + .10, (z0 + z1) / 2,
        x1 - x0 + .10, .20, z1 - z0 + .08, WHITE,
        { hard:true, gloss:G.paint, ...tag });
    };
    const SERVICE = { x0:11.18, x1:14.50, z0:39.25, z1:42.78, h:9.45 };
    const STAIR = { x0:14.98, x1:17.72, z0:39.25, z1:42.46, h:14.25 };
    const CLINIC = { x0:18.14, x1:NORTH_FACE, z0:39.25, z1:Z1, h:13.30 };
    // A low internal link is visible only in the two recessed joints. It makes the three wings a
    // credible connected hospital rather than freestanding scenery, while the joints remain deep.
    box((SERVICE.x0 + CLINIC.x1) / 2, 2.05, 39.72,
      CLINIC.x1 - SERVICE.x0, 4.10, .94, STONED,
      { hard:true, mode:14, gloss:G.paint, ...PLASTER, ...TAG });
    endMass(SERVICE.x0, SERVICE.x1, SERVICE.z0, SERVICE.z1,
      SERVICE.h, C('#b4b8b6'));
    endMass(STAIR.x0, STAIR.x1, STAIR.z0, STAIR.z1,
      STAIR.h, C('#445963'));
    endMass(CLINIC.x0, CLINIC.x1, CLINIC.z0, CLINIC.z1,
      CLINIC.h, STONE);
    // Preserve the original road-edge plinth datum on the full north clinical frontage.
    box(NORTH_FACE + .025, .42, (CLINIC.z0 + CLINIC.z1) / 2,
      .15, .84, CLINIC.z1 - CLINIC.z0 + .04, STONED,
      { hard:true, mode:9, gloss:.20, ...TAG });
    joint(17.85, SOUTH_FACE, MAIN_FACE, 13.85);
    joint(26.55, MAIN_FACE, WARD_FACE, 14.25);
    joint(32.25, WARD_FACE, ED_FACE, 14.25);
    joint(39.25, ED_FACE, NORTH_FACE, 13.35);

    // Recessed attic links cover the last pieces of the shared fourteen-metre shell above the
    // deliberately lower entrance wings. They are separate volumes with clerestories and service
    // screens, not a return to the old full-length facade plane.
    const upperLink = (z0, z1, y0, y1, face, rear, color, tag = TAG) => {
      const d = face - rear;
      box(rear + d / 2, (y0 + y1) / 2, (z0 + z1) / 2,
        d, y1 - y0, z1 - z0, color,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...tag });
      box(rear + d / 2, y1 + .08, (z0 + z1) / 2,
        d + .08, .16, z1 - z0 + .04, WHITE,
        { hard: true, gloss: G.paint, ...tag });
    };
    upperLink(17.85, 26.55, 11.60, 14.05, 23.20, 12.22, STONE2);
    upperLink(32.25, 39.25, 10.70, 14.05, 23.18, 12.34, C('#c8ccca'), EDT);
    upperLink(39.25, Z1, 13.30, 14.05, 23.16, CLINIC.x0, STONED);

    // Patient/service windows continue around the four long rear returns. The north end is the
    // exact transverse bike view that exposed the old blank shell and is detailed independently
    // below; the south end and staggered west faces keep their grouped clinical rhythm.
    const LOWER_SHELLS = [
      {z0:Z0,z1:17.85,rear:10.92,h:13.80},
      {z0:17.85,z1:26.55,rear:11.68,h:14.05},
      {z0:26.55,z1:32.25,rear:10.72,h:14.20},
      {z0:32.25,z1:39.25,rear:11.82,h:14.05},
    ];
    for (let wi = 0; wi < LOWER_SHELLS.length; wi++) {
      const q = LOWER_SHELLS[wi], span = q.z1 - q.z0;
      const zs = span > 7 ? [.22,.50,.78] : [.30,.70];
      for (let y = 2.35, row = 0; y < q.h - .55; y += 3.05, row++)
        for (let bi = 0; bi < zs.length; bi++)
          westWindow(q.rear, y, q.z0 + span * zs[bi], 1.34,
            span > 7 ? 1.34 : 1.18, ((wi + row + bi) % 4) ? .13 : .04);
    }
    // North service pavilion: a recessed louvre bay, a small staff canopy and deliberately sparse
    // upper openings. Its lower roof and blue service blade distinguish it from patient wards.
    box(12.30, 1.86, SERVICE.z1 + .022, 1.70, 3.32, .10, STONED,
      { hard:true, mode:9, gloss:.20, ...TAG });
    for (let i = 0; i < 9; i++)
      box(12.30, .48 + i * .34, SERVICE.z1 + .090, 1.44, .055, .08,
        i % 3 ? STEEL : C('#7f898c'), { hard:true, gloss:G.metal, ...TAG });
    box(12.30, 3.62, SERVICE.z1 + .17, 1.98, .12, .46, WHITE,
      { hard:true, gloss:G.paint, ...TAG });
    for (const x of [11.58,13.02])
      cap(x, 3.43, SERVICE.z1 + .05, .025, .48, .025, STEEL,
        { rz:x < 12.3 ? -.65 : .65, gloss:G.metal, ...TAG });
    box(14.25, 4.70, SERVICE.z1 + .075, .18, 8.90, .15, BLUE,
      { hard:true, gloss:.24, ...TAG });
    northWindow(SERVICE.z1, 5.55, 12.20, 1.08, 1.16, .08);
    northWindow(SERVICE.z1, 7.62, 13.18, 1.26, .72, .13);
    northWindow(SERVICE.z1, 7.30, 11.63, .82, .52, .04);
    // Its west return is service-scaled rather than another four-storey ward grid.
    westWindow(SERVICE.x0, 2.35, 40.58, 1.36, 1.18, .05);
    westWindow(SERVICE.x0, 5.55, 41.48, 1.10, .76, .12);
    westWindow(SERVICE.x0, 7.52, 40.28, 1.20, .94, .08);

    // Recessed stair lantern: paired doors at ground level and four tall landing lights above.
    // Dark joints between the panels describe actual floor plates and stop the core reading as a
    // single tinted rectangle. Side landing lights keep the oblique view equally resolved.
    box(16.35, 7.25, STAIR.z1 + .022, 2.34, 13.20, .10, INK,
      { hard:true, gloss:.20, ...TAG });
    for (const [y, h, tint, night] of [
      [1.42,2.38,GLASSD,.20], [4.18,2.42,GLASS,.18],
      [7.20,2.58,GLASSD,.11], [10.37,2.72,GLASS,.22], [12.76,1.26,GLASSD,.09],
    ]) {
      const q = box(16.35, y, STAIR.z1 + .082, 2.02, h, .034, tint,
        { hard:true, mode:1, alpha:.78, gloss:G.glass, ...TAG });
      remember(q, .012, night);
    }
    for (const x of [15.27,16.35,17.43])
      box(x, 7.18, STAIR.z1 + .112, .055, 12.96, .055, STEEL,
        { hard:true, gloss:G.metal, ...TAG });
    for (const y of [2.76,5.62,8.73,11.91])
      box(16.35, y, STAIR.z1 + .115, 2.20, .16, .06, STONED,
        { hard:true, gloss:.24, ...TAG });
    for (const x of [15.84,16.86])
      box(x, 1.38, STAIR.z1 + .143, .045, 2.10, .035, STEEL,
        { hard:true, gloss:G.metal, ...TAG });
    box(16.35, 1.34, STAIR.z1 + .162, 1.26, .065, .055, WHITE,
      { hard:true, gloss:G.paint, ...TAG });
    for (const [y,z,w] of [[4.25,40.10,.72],[7.30,41.23,.96],[10.52,40.48,.68]])
      westWindow(STAIR.x0, y, z, 1.54, w, y > 9 ? .07 : .16);
    for (const [y,z,w] of [[4.20,40.35,.78],[7.25,41.50,.72],[10.45,40.62,.92]])
      roadWindow(STAIR.x1, y, z, 1.48, w, GLASSD, y > 9 ? .08 : .16, 1);

    // The remaining north clinical bar is only five metres wide. Two unequal bays per floor,
    // offset from row to row, a vertical circulation blade and fine floor datums give it a room
    // rhythm without recreating the rejected four-by-four grid.
    for (const [y, bays] of [
      [2.30,[[19.03,1.12,1],[21.72,1.46,2]]],
      [5.42,[[19.35,1.52,2],[22.03,.78,1]]],
      [8.58,[[19.00,.88,1],[21.80,1.56,2]]],
      [11.48,[[19.38,1.28,2],[22.10,.70,1]]],
    ]) for (let i = 0; i < bays.length; i++) {
      const [x,w,panes] = bays[i];
      northWindow(Z1, y, x, y > 10 ? 1.24 : 1.42, w,
        ((y * 10 | 0) + i) % 3 ? .13 : .045);
      if (panes > 1)
        box(x, y, Z1 + .102, .045, y > 10 ? 1.14 : 1.32, .032, STEEL,
          { hard:true, gloss:G.metal, ...TAG });
    }
    box(20.56, 6.62, Z1 + .080, .17, 12.48, .16, BLUED,
      { hard:true, gloss:.24, ...TAG });
    for (const y of [3.92,9.93])
      box(20.70, y, Z1 + .075, 4.74, .10, .14, WHITE,
        { hard:true, gloss:G.paint, ...TAG });
    for (const [y, xs] of [
      [2.35,[12.95,15.35,17.95,20.55]], [5.40,[13.30,15.92,18.55,20.95]],
      [8.45,[13.02,15.45,18.18,20.62]], [11.50,[13.48,16.02,18.72,21.02]],
    ]) for (let i = 0; i < xs.length; i++)
      southWindow(Z0, y, xs[i], 1.34, i % 2 ? 1.30 : 1.10,
        (i + (y * 10 | 0)) % 3 ? .12 : .04);
    // The shared shell's original camera cage ends at x=23.20, behind the projected portals.
    // These low, camera-only extensions put their padded face at x=23.75 and hold the lens 5 cm
    // beyond it, outside every headwall/jamb. They do not add a body collider or consume
    // any of the x=23.2..27.4 pavement walk zone.
    blocker(10.50, 23.35, 17.85, 26.55, 6.15);
    blocker(10.50, 23.35, 32.25, 39.25, 5.35);
    for (const [z, w] of [[18.62, 1.05], [20.42, 1.36], [22.70, 1.70], [25.18, 1.40]])
      roadWindow(23.20, 12.82, z, .88, w, GLASSD, .055, w > 1.2 ? 2 : 1);
    for (let i = 0; i < 7; i++)
      box(23.225, 12.22, 32.80 + i * .94, .07, .16, .66,
        i === 3 ? REDD : STEEL, { hard: true, gloss: .25, ...EDT });

    // Diagnostics wing: irregular paired and triplet bays, with deep reveals and a vertical
    // circulation slot. The windows no longer repeat in lockstep across unrelated departments.
    for (const [y, bays] of [
      [2.25, [[10.10, 1.26, 1], [12.15, 1.55, 2], [15.05, 1.82, 2], [17.02, 1.12, 1]]],
      [5.95, [[10.45, 1.58, 2], [13.05, 2.05, 3], [16.05, 1.68, 2]]],
      [9.35, [[10.15, 1.18, 1], [12.22, 1.48, 2], [15.15, 2.12, 3], [17.18, .84, 1]]],
      [12.30, [[10.72, 2.18, 3], [14.04, 1.42, 2], [16.56, 1.70, 2]]],
    ]) for (const [z, w, panes] of bays)
      roadWindow(SOUTH_FACE, y, z, y > 11 ? 1.36 : 1.62, w,
        z > 15.8 ? LOBBY : GLASS, .09 + ((y * 7 + z * 3) % 4) * .035, panes);
    box(SOUTH_FACE + .07, 6.80, 17.63, .18, 13.05, .28, BLUED,
      { hard: true, gloss: .24, ...TAG });
    box(SOUTH_FACE + .10, 8.00, 9.32, .18, 10.70, .22, WHITE,
      { hard: true, gloss: G.paint, ...TAG });

    // Outpatient offices sit above the glazed entrance hall, while the ward shoulder has a
    // denser but still grouped clinical rhythm and a recessed ground-floor imaging bay.
    for (const [z, w, panes] of [[18.62, 1.06, 1], [20.35, 1.48, 2],
      [22.72, 1.86, 3], [25.22, 1.42, 2]]) {
      roadWindow(MAIN_FACE, 8.25, z, 1.52, w, GLASS, .13, panes);
    }
    for (const [y, bays] of [
      [2.30, [[27.30, 1.12, 1], [29.20, 1.52, 2], [31.28, 1.20, 1]]],
      [6.15, [[27.55, 1.58, 2], [30.32, 2.05, 3]]],
      [9.75, [[27.30, 1.10, 1], [29.10, 1.42, 2], [31.10, 1.18, 1]]],
      [12.70, [[27.82, 1.74, 2], [30.72, 1.70, 2]]],
    ]) for (const [z, w, panes] of bays)
      roadWindow(WARD_FACE, y, z, y > 11 ? 1.30 : 1.58, w,
        y < 3 ? LOBBY : GLASS, .10 + ((y + z) % 3) * .04, panes);
    box(WARD_FACE + .08, 3.95, 26.80, .18, 7.55, .24, BLUE2,
      { hard: true, gloss: .25, ...TAG });

    // Emergency is its own lower pavilion: red ceramic side bays, clerestories and a quieter
    // stone service wing beyond it. This distinction survives even when the signs are unreadable.
    box(ED_FACE + .06, 5.20, 32.48, .17, 10.10, .28, REDD,
      { hard: true, gloss: .24, ...EDT });
    box(ED_FACE + .06, 5.20, 39.03, .17, 10.10, .28, REDD,
      { hard: true, gloss: .24, ...EDT });
    for (const [z, w] of [[33.10, 1.10], [35.02, 1.46], [37.22, 1.70], [38.55, .72]])
      roadWindow(ED_FACE, 7.70, z, 1.52, w, z < 34 ? LOBBY : GLASS,
        .14 + (z % 2) * .04, w > 1.3 ? 2 : 1, EDT);
    for (const [y, bays] of [
      [2.45, [[40.12, .78, 1], [41.52, 1.18, 2], [42.55, .54, 1]]],
      [6.40, [[40.20, 1.05, 1], [41.92, 1.58, 2]]],
      [10.25, [[40.42, 1.36, 2], [42.22, .92, 1]]],
    ]) for (const [z, w, panes] of bays)
      roadWindow(NORTH_FACE, y, z, 1.46, w, GLASSD, .06 + (y % 3) * .025, panes);
    for (const y of [4.25, 8.20])
      box(NORTH_FACE + .07, y, 41.15, .15, .15, 3.42, STONED,
        { hard: true, gloss: .22, ...TAG });

    // ---------------------------------------------------------------- stepped inpatient tower
    // Three overlapping tiers move back in both x and z. The first contains patient rooms, the
    // second administration, and the small top volume is screened plant rather than another
    // full floor. Separate blockers follow those tiers and never enter the pavement walk zone.
    const A = { x0:11.85, x1:22.96, z0:13.45, z1:31.65, y0:13.50, y1:22.55 };
    const B = { x0:13.30, x1:22.08, z0:15.00, z1:30.20, y0:22.25, y1:27.80 };
    const P = { x0:15.15, x1:20.85, z0:17.30, z1:27.70, y0:27.55, y1:30.80 };
    const mass = (m, color) => box((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2,
      (m.z0 + m.z1) / 2, m.x1 - m.x0, m.y1 - m.y0, m.z1 - m.z0, color,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    // The lowest inpatient tier is three connected ward bars rather than one eighteen-metre-deep
    // cuboid.  All three retain the east room line, while their west returns step away from the
    // old courtyard and expose real joints between clinical departments.  The original A blocker
    // below deliberately remains unchanged: this is a skyline/facade correction, not a new route.
    const A1 = { x0:A.x0,       x1:A.x1, z0:A.z0,  z1:21.25, y0:A.y0, y1:A.y1 };
    const A2 = { x0:A.x0 + .62, x1:A.x1, z0:21.25, z1:24.30, y0:A.y0, y1:A.y1 };
    const A3 = { x0:A.x0 + 1.10,x1:A.x1, z0:24.30, z1:A.z1,  y0:A.y0, y1:A.y1 };
    mass(A1, STONE2); mass(A2, STONED); mass(A3, STONE2);
    mass(B, STONE); mass(P, C('#aeb5b6'));
    blocker(A.x0, A.x1, A.z0, A.z1, A.y1);
    blocker(B.x0, B.x1, B.z0, B.z1, B.y1);
    blocker(P.x0, P.x1, P.z0, P.z1, P.y1);

    const wardRows = [
      [15.45, [[14.45, .92, 1], [15.85, 1.18, 2], [18.45, 1.48, 2],
        [20.55, 1.28, 2], [23.10, 1.92, 3], [26.15, 1.36, 2], [28.55, 1.58, 2], [30.65, .78, 1]]],
      [18.45, [[14.72, 1.25, 2], [17.18, 1.72, 2], [20.12, 1.35, 2],
        [22.30, 1.28, 2], [24.55, 1.58, 2], [27.42, 1.78, 3], [30.22, 1.12, 1]]],
      [21.05, [[14.55, .96, 1], [16.20, 1.18, 2], [18.80, 1.72, 2],
        [21.60, 1.42, 2], [24.15, 1.72, 3], [27.30, 1.36, 2], [29.82, 1.55, 2]]],
    ];
    for (let r = 0; r < wardRows.length; r++) {
      const [y, bays] = wardRows[r];
      for (let i = 0; i < bays.length; i++) {
        const [z, w, panes] = bays[i];
        roadWindow(A.x1, y, z, 1.42, w, i % 5 === 2 ? LOBBY : GLASS,
          ((r * 7 + i * 3) % 5) ? .18 : .055, panes);
      }
    }
    for (const [y, bays] of [
      [23.72, [[16.05, 1.28, 2], [18.28, 1.62, 2], [21.10, 1.48, 2],
        [23.48, 1.54, 2], [26.38, 1.90, 3], [29.05, 1.10, 1]]],
      [26.25, [[16.28, 1.62, 2], [19.10, 1.42, 2], [21.42, 1.12, 1],
        [23.65, 1.62, 2], [26.60, 1.52, 2], [28.92, 1.24, 2]]],
    ]) for (let i = 0; i < bays.length; i++) {
      const [z, w, panes] = bays[i];
      roadWindow(B.x1, y, z, 1.28, w, i % 4 ? GLASS : LOBBY,
        ((i * 5 + y) | 0) % 4 ? .14 : .045, panes);
    }

    // South-return room clusters make the approach elevation useful too; setbacks ensure the
    // upper rows terminate instead of stretching into another monolithic grid.
    for (const [y, xs] of [
      [15.45, [[13.10, 1.32], [15.40, 1.58], [18.20, 1.72], [20.72, 1.24]]],
      [18.45, [[12.95, 1.12], [14.82, 1.38], [17.38, 1.62], [20.12, 1.52]]],
      [21.05, [[13.35, 1.70], [16.18, 1.42], [18.60, 1.16], [20.78, 1.30]]],
    ]) for (let i = 0; i < xs.length; i++)
      southWindow(A.z0, y, xs[i][0], 1.38, xs[i][1], i % 3 ? .16 : .05);
    for (const y of [23.65, 26.15])
      for (const [i, x] of [14.35, 16.55, 19.15, 21.15].entries())
        southWindow(B.z0, y, x, 1.24, i === 1 ? 1.38 : 1.12, i % 3 ? .13 : .04);

    // Courtyard-facing ward returns. These are the elevations seen above the sorting bins and
    // from the public-toilet oblique; previously they were unbroken 9 m-high plaster planes.
    // Grouped rooms follow each physical setback, while the narrow connector reads as a glazed
    // circulation joint rather than another pasted window grid.
    for (const [y, z, w, night] of [
      [15.45, 15.15, 1.28, .06], [15.45, 17.75, 1.58, .16], [15.45, 20.05, 1.10, .12],
      [18.45, 15.42, 1.54, .15], [18.45, 18.20, 1.24, .05], [18.45, 20.10, .94, .13],
      [21.05, 15.12, 1.18, .04], [21.05, 17.38, 1.42, .14], [21.05, 19.85, 1.26, .17],
    ]) westWindow(A1.x0, y, z, 1.34, w, night);
    for (const y of [15.45, 18.45, 21.05])
      westWindow(A2.x0, y, 22.78, 1.42, 1.42, y === 18.45 ? .05 : .15);
    for (const [y, z, w, night] of [
      [15.45, 25.55, 1.32, .14], [15.45, 28.08, 1.54, .05], [15.45, 30.35, 1.12, .17],
      [18.45, 25.72, 1.08, .06], [18.45, 27.78, 1.42, .15], [18.45, 30.22, 1.30, .12],
      [21.05, 25.42, 1.46, .15], [21.05, 28.18, 1.22, .04], [21.05, 30.38, 1.04, .13],
    ]) westWindow(A3.x0, y, z, 1.34, w, night);
    for (const [y, xs] of [
      [15.45, [[14.18, 1.16], [16.42, 1.42], [19.05, 1.58], [21.45, 1.14]]],
      [18.45, [[14.42, 1.40], [17.00, 1.18], [19.28, 1.32], [21.38, .92]]],
      [21.05, [[14.15, 1.08], [16.20, 1.36], [18.72, 1.48], [21.12, 1.22]]],
    ]) for (let i = 0; i < xs.length; i++)
      northWindow(A3.z1, y, xs[i][0], 1.34, xs[i][1], i % 3 ? .15 : .05);

    // Thin datum courses align the three returns and make the setbacks legible in daylight and
    // at night. They are facade joints, not freestanding bands or collision geometry.
    for (const y of [17.02, 20.02]) {
      box(A1.x0 - .055, y, (A1.z0 + A1.z1) / 2, .11, .12, A1.z1 - A1.z0 - .20,
        WHITE, { hard:true, gloss:G.paint, ...TAG });
      box(A2.x0 - .055, y, (A2.z0 + A2.z1) / 2, .11, .12, A2.z1 - A2.z0 - .16,
        WHITE, { hard:true, gloss:G.paint, ...TAG });
      box(A3.x0 - .055, y, (A3.z0 + A3.z1) / 2, .11, .12, A3.z1 - A3.z0 - .20,
        WHITE, { hard:true, gloss:G.paint, ...TAG });
      box((A3.x0 + A3.x1) / 2, y, A3.z1 + .055, A3.x1 - A3.x0 - .20, .12, .11,
        WHITE, { hard:true, gloss:G.paint, ...TAG });
    }

    // Terrace parapets, maintenance rails and screened services explain every upper ledge.
    box(22.72, 22.72, (A.z0 + A.z1) / 2, .20, .42, A.z1 - A.z0 - .15, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    box((B.x0 + B.x1) / 2, 27.92, B.z0 + .08, B.x1 - B.x0, .34, .18, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    box((B.x0 + B.x1) / 2, 27.92, B.z1 - .08, B.x1 - B.x0, .34, .18, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    box(B.x1 - .08, 27.92, (B.z0 + B.z1) / 2, .18, .34, B.z1 - B.z0, WHITE,
      { hard: true, gloss: G.paint, ...TAG });
    for (let i = 0; i < 6; i++)
      box(P.x1 + .045, 28.30 + i * .38, (P.z0 + P.z1) / 2,
        .08, .10, P.z1 - P.z0 - .48, i % 2 ? STEEL : STONED,
        { hard: true, gloss: .28, ...TAG });
    for (const z of [19.00, 23.15, 26.00]) {
      cyl(17.35, 31.16, z, .54, .64, C('#8f999c'),
        { gloss: .30, mat: 'steel', matScale: .7, matAmt: .26, ...TAG });
      cyl(17.35, 31.52, z, .57, .08, WHITE, { gloss: .28, ...TAG });
    }
    box(19.20, 31.20, 25.05, 2.25, .92, 2.85, STEEL,
      { hard: true, gloss: .28, mat: 'steel', matScale: .8, matAmt: .30, ...TAG });
    for (let i = 0; i < 4; i++)
      box(20.34, 31.20, 24.22 + i * .54, .08, .54, .34, GLASSD,
        { hard: true, gloss: .22, ...TAG });
    cap(17.10, 32.75, 22.30, .045, 3.65, .045, STEEL,
      { gloss: G.metal, ...TAG });
    ball(17.10, 34.60, 22.30, .14, .14, .14, REDL,
      { mode: 1, glow: .22, gloss: .32, ...TAG });

    // The civic identity is split across the diagnostics band, a true tower blade, and the
    // outpatient headwall below. No sign panel is carried on a canopy edge or in the sightline.
    remember(box(SOUTH_FACE + .075, 12.62, 13.34, .18, .88, 7.40, BLUED,
      { hard: true, mode: 1, gloss: .25, ...TAG }), .02, .22);
    glyphs(SOUTH_FACE + .19, 12.63, 13.34, Math.PI / 2, '北京市澄安医院',
      { size: .49, gap: .11, color: WHITE, mode: 1, lift: .009, tag: '医院' });
    remember(box(A.x1 + .062, 18.18, 31.10, .15, 7.30, 1.02, BLUED,
      { hard: true, mode: 1, gloss: .25, ...TAG }), .02, .22);
    glyphs(A.x1 + .15, 18.18, 31.10, Math.PI / 2, '澄安医院',
      { size: .46, gap: .10, color: WHITE, mode: 1, vertical: true,
        lift: .008, tag: '医院' });

    // Two dimensional crosses remain crisp but sit on actual wall surfaces, not floating above
    // the old flat skin. One marks diagnostics at street scale; one crowns the setback plant.
    remember(box(SOUTH_FACE + .18, 9.08, 10.18, .11, 2.10, .56, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .07, .56);
    remember(box(SOUTH_FACE + .19, 9.08, 10.18, .11, .56, 2.10, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .07, .56);
    remember(box(P.x1 + .11, 29.17, 18.55, .10, 1.72, .46, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .06, .48);
    remember(box(P.x1 + .12, 29.17, 18.55, .10, .46, 1.72, RED,
      { hard: true, mode: 1, gloss: .22, ...TAG }), .06, .48);

    // ---------------------------------------------------------------- 门诊 main entrance
    // A six-metre-wide stone portal gives the outpatient department its own address. Its glazing
    // is recessed between solid jambs, leaving legible wall at each side rather than consuming
    // the whole wing as one sheet of blue glass.
    // The reveal is constructed around an actual opening. A former full-depth blue box occupied
    // this entire 6.58 m bay and hid every pane and moving door behind one opaque rectangle.
    for (const z of [MAIN - 3.05, MAIN + 3.05])
      box(FACE - .04, 2.28, z, .48, 4.56, .48, BLUED,
        { hard: true, gloss: .22, ...TAG });
    box(FACE - .04, 4.22, MAIN, .48, .68, 6.58, BLUED,
      { hard: true, gloss: .22, ...TAG });
    for (const z of [MAIN - 2.94, MAIN + 2.94])
      box(FACE + .015, 1.94, z, .20, 3.76, .10, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
    for (const z of [MAIN - 3.20, MAIN + 3.20])
      box(FACE - .10, 2.70, z, .24, 5.40, .34, STONE2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    remember(box(FACE - .015, 1.98, MAIN, .08, 3.76, 6.08, LOBBY,
      { hard: true, mode: 1, alpha: .64, gloss: G.glass, ...TAG }), .05, .34);
    box(FACE + .020, 1.45, MAIN, .035, 2.70, 3.10, GLASSD,
      { hard: true, mode: 1, alpha: .42, gloss: G.glass, ...TAG });
    for (const z of [MAIN - 2.72, MAIN + 2.72])
      box(FACE + .055, 1.48, z, .08, 2.86, .075, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
    for (const side of [-1, 1]) {
      const z = MAIN + side * (.72 + entryDoors.main.slide);
      movingDoorPart(entryDoors.main, box(FACE + .13, 1.44, z, .065, 2.72, 1.38, GLASS,
        { hard: true, mode: 1, alpha: .62, gloss: G.glass, ...TAG }), side, 1.44, z);
      movingDoorPart(entryDoors.main,
        cap(FACE + .18, 1.43, z + side * .38, .018, .62, .018, STEEL,
          { rx: Math.PI / 2, gloss: G.metal, ...TAG }), side, 1.43, z);
    }

    // The bilingual sign is fixed to the portal headwall, safely above the moving doors. The
    // former deep blue fascia at the canopy nose is deliberately gone: it crossed the camera's
    // sightline and collided visually with the overhead member.
    remember(box(FACE + .08, 4.86, MAIN, .22, .92, 6.18, BLUED,
      { hard: true, mode: 1, gloss: .25, ...TAG }), .02, .24);
    glyphs(FACE + .22, 5.02, MAIN, Math.PI / 2, '门诊楼',
      { size: .42, gap: .12, color: WHITE, mode: 1, lift: .009, tag: '医院' });
    glyphs(FACE + .225, 4.64, MAIN, Math.PI / 2, 'OUTPATIENT',
      { size: .115, gap: .032, color: COOL, mode: 1, lift: .008, tag: '医院' });

    // Two shallow translucent roof leaves stay over the flanking door banks. Their 4.04 m centre
    // court is deliberately roofless: it is wider than the camera's full obstruction slide, so
    // the stored exit view has open sky rather than merely replacing an opaque slab with glass.
    // Each leaf has its own perimeter gutter and aligned wall stay; nothing bridges the sightline.
    for (const side of [-1, 1]) {
      remember(box(24.02, 4.88, MAIN + side * 2.55, 1.36, .075, 1.00, LOBBY,
        { hard: true, mode: 1, alpha: .34, gloss: G.glass, ...TAG }), .018, .16);
      box(24.02, 4.82, MAIN + side * 3.08, 1.32, .12, .10, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
      box(24.02, 4.82, MAIN + side * 2.02, 1.32, .12, .08, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
      remember(box(23.98, 4.77, MAIN + side * 2.55, 1.08, .025, .70, COOL,
        { hard: true, mode: 1, alpha: .44, gloss: .18, ...TAG }), .035, .31);
      box(24.72, 4.79, MAIN + side * 2.55, .09, .23, 1.06, STONED,
        { hard: true, gloss: .28, ...TAG });
    }
    for (const z of [MAIN - 2.58, MAIN + 2.58]) {
      // The 1.36 m glass leaves are structurally credible cantilevers. A horizontal outrigger and
      // diagonal wall stay carry each one; no post touches the forecourt or the camera slide.
      box(24.02, 4.76, z, 1.30, .095, .095, STEEL,
        { hard: true, gloss: G.metal, ...TAG });
      cap(23.72, 4.43, z, .035, .90, .035, STEEL,
        { rz: -Math.PI / 4, gloss: G.metal, ...TAG });
      box(23.46, 4.18, z, .12, .48, .18, STONED,
        { hard: true, gloss: .26, ...TAG });
    }

    // Tactile route from the patient-footway edge to the automatic doors. It terminates exactly at
    // x=25.42: extending the old strip to x=27.075 falsely invited a player into the live cycle
    // track and put a low hospital surface in a moving moped route.
    flat((FACE + ACCESS.footway[1]) / 2, .019, MAIN,
      ACCESS.footway[1] - FACE, .34, TACT, { gloss: .12, ...TAG });
    for (let i = 0; i < 8; i++) for (const dz of [-.13, .13])
      cyl(23.72 + i * .075, .034, MAIN + dz, .022, .012, C('#bc9020'),
        { gloss: .10, ...TAG });
    flat(23.98, .020, MAIN, .64, .88, TACT, { gloss: .12, ...TAG });

    // Two low bollards stop a car entering the lobby but sit at the door edges, not in the route.
    for (const z of [MAIN - 2.95, MAIN + 2.95]) {
      cyl(24.10, .34, z, .075, .68, STEEL, { gloss: G.metal, ...TAG });
      cyl(24.10, .70, z, .082, .045, WHITE, { gloss: .30, ...TAG });
    }

    const door = thing('医院', FACE + .40, 2.10, MAIN,
      '这是北京市澄安医院，先去一楼挂号。',
      "This is Beijing Cheng'an Hospital. Register on the ground floor first.",
      '医院 hospital. 门诊 is outpatient care, 挂号 is to register, and 住院 is to be admitted.',
      { tag: '医院', focus: [24.35, MAIN], reach: 2.35 });
    door.exit = { place: 'hospital', at: { x: 0, z: -9.65, yaw: 0 } };

    // ---------------------------------------------------------------- 急诊 emergency entrance
    // Farther north, a narrower red-lined portal and warm lobby make the department distinct
    // without turning its whole elevation into a signboard.
    // Emergency uses the same honest portal construction: red side returns and a head beam around
    // a glazed void, never an opaque red slab sitting in front of its doors.
    for (const z of [ED - 2.56, ED + 2.56])
      box(FACE - .025, 1.98, z, .46, 3.96, .43, REDD,
        { hard: true, gloss: .22, ...EDT });
    box(FACE - .025, 3.65, ED, .46, .62, 5.55, REDD,
      { hard: true, gloss: .22, ...EDT });
    for (const z of [ED - 2.44, ED + 2.44])
      box(FACE + .015, 1.66, z, .20, 3.18, .09, STEEL,
        { hard: true, gloss: G.metal, ...EDT });
    for (const z of [ED - 2.68, ED + 2.68])
      box(FACE + .12, 2.34, z, .42, 4.68, .38, STONE2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...EDT });
    remember(box(FACE - .010, 1.67, ED, .08, 3.18, 5.12, LOBBY,
      { hard: true, mode: 1, alpha: .60, gloss: G.glass, ...EDT }), .06, .42);
    for (const z of [ED - 2.30, ED + 2.30])
      box(FACE + .055, 1.55, z, .07, 2.86, .07, STEEL,
        { hard: true, gloss: G.metal, ...EDT });
    for (const side of [-1, 1]) {
      const z=ED+side*(.65+entryDoors.emergency.slide);
      movingDoorPart(entryDoors.emergency,
        box(FACE+.13,1.53,z,.065,2.78,1.24,GLASS,
          {hard:true,mode:1,alpha:.60,gloss:G.glass,...EDT}),side,1.53,z);
      movingDoorPart(entryDoors.emergency,
        box(FACE+.18,1.08,z,.018,.075,1.00,REDL,
          {hard:true,mode:1,alpha:.88,...EDT}),side,1.08,z);
    }

    // Emergency lettering belongs to the masonry headwall. The canopy itself is a thin white
    // slab with a red drip edge, not the former 84 cm billboard blocking the doorway view.
    remember(box(FACE + .075, 4.40, ED, .22, .88, 5.18, RED,
      { hard: true, mode: 1, gloss: .25, ...EDT }), .05, .42);
    glyphs(FACE + .215, 4.53, ED - .38, Math.PI / 2, '急诊',
      { size: .50, gap: .15, color: WHITE, mode: 1, lift: .010, tag: '急诊' });
    glyphs(FACE + .22, 4.15, ED - .30, Math.PI / 2, '24小时',
      { size: .16, gap: .046, color: WARM, mode: 1, lift: .008, tag: '急诊' });
    glyphs(FACE + .22, 4.17, ED + 1.65, Math.PI / 2, '救护车入口',
      { size: .13, gap: .030, color: WHITE, mode: 1, lift: .008, tag: '急诊' });

    box(24.55, 4.78, ED, 2.38, .20, 6.18, WHITE,
      { hard: true, gloss: G.paint, ...EDT });
    box(24.52, 4.64, ED, 2.24, .08, 5.94, REDD,
      { hard: true, gloss: .24, ...EDT });
    remember(box(24.48, 4.59, ED, 2.02, .030, 5.42, WARM,
      { hard: true, mode: 1, gloss: .18, ...EDT }), .055, .44);
    for (const z of [ED - 2.88, ED + 2.88])
      box(24.56, 4.56, z, 2.18, .14, .12, REDD,
        { hard: true, gloss: .26, ...EDT });
    box(25.76, 4.63, ED, .09, .22, 5.82, RED,
      { hard: true, gloss: .27, ...EDT });
    // Wall stays carry the emergency canopy without ground posts in either the patient footway or
    // the protected cycle track. The former columns stood at x=25.62, z=ED±2.40 — outside the one
    // controlled table and directly in the moped envelope.
    for (const z of [ED - 2.40, ED + 2.40]) {
      box(FACE + .10, 4.42, z, .20, .36, .30, STEEL,
        { hard:true, gloss:G.metal, ...EDT });
      cap(FACE + .55, 4.58, z, .040, .92, .040, C('#89949a'),
        { rz:Math.PI / 2, gloss:G.metal, ...EDT });
      beacons.push(cyl(25.62, 4.98, z, .10, .18, REDL,
        { mode: 1, glow: .28, gloss: .30, ...EDT }));
      taper(25.62, 5.12, z, .23, .12, .23, C('#5b6268'), { gloss: .30, ...EDT });
    }
    // One raised red table tells the truth about ambulance/cycle priority. Its exact width and
    // stream are the road controller's shared contract; no other hospital surface enters bikeW.
    const ambulance = ACCESS.ambulanceCrossing;
    // The base street's grated drain crosses beneath this table. Keep the red field 14 mm above
    // the grate plane and its tactile edges another 6 mm proud, preserving the marking hierarchy
    // without submitting coincident depth surfaces from two builders.
    flat((ACCESS.cycle[0] + ACCESS.cycle[1]) / 2, .034, ambulance.z,
      ACCESS.cycle[1] - ACCESS.cycle[0], ambulance.width, C('#7d4037'),
      { mode:10, gloss:.13, tag:'救护车入口' });
    for (const z of [ambulance.z - ambulance.width / 2,
                     ambulance.z + ambulance.width / 2])
      flat((ACCESS.cycle[0] + ACCESS.cycle[1]) / 2, .040, z,
        ACCESS.cycle[1] - ACCESS.cycle[0], .14, TACT,
        { gloss:.14, tag:'救护车入口' });
    // A second thing teaches the emergency word but uses the same hospital scene entry.
    const emergency = thing('急诊', FACE + .42, 2.00, ED,
      '急诊二十四小时开门。',
      'The emergency department is open twenty-four hours.',
      '急 urgent + 诊 to examine. 急诊 is the emergency department; 救护车 is an ambulance.',
      { tag: '急诊', focus: [24.35, ED], reach: 2.35 });
    emergency.exit = { place: 'hospital', at: { x: 6.4, z: -5.8, yaw: -Math.PI / 2 } };

    // ---------------------------------------------------------------- forecourt and wayfinding
    // A hospital directory at the start of the new pavement. It is close to the wall; the clear
    // walking spine remains centred on x 24.35 from z 13 to 42.
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

    // Waiting bench and planters stay against the wall. The centre of the 2.22 m patient footway
    // remains clear and no furniture borrows width from the protected cycle track.
    const bench = (z) => {
      box(23.77, .48, z, .55, .08, 2.25, STONED, { hard: true, gloss: .24, tag: '等候' });
      box(23.62, .82, z, .12, .74, 2.25, STEEL, { hard: true, gloss: .28, tag: '等候' });
      for (const zz of [z - .82, z + .82])
        cap(23.76, .24, zz, .035, .46, .035, STEEL, { gloss: G.metal, tag: '等候' });
    };
    bench(28.65);
    for (const z of [12.55, 17.05, 40.60]) {
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

    // The median-side rail tells the truth about the cycle boundary. It sits in the protected
    // furnishing strip at x=27.82, never inside the 25.42..27.67 cycle track, and opens only across
    // the explicitly controlled ambulance table.
    const RAIL_X = ACCESS.cycle[1] + .15;
    function rail(z0, z1) {
      const n = Math.ceil((z1 - z0) / 2.15);
      for (let i = 0; i <= n; i++) {
        const z = z0 + (z1 - z0) * (i / n);
        cap(RAIL_X, .54, z, .043, 1.02, .043, STEEL, { gloss: .38, tag: '护栏' });
        cyl(RAIL_X, 1.08, z, .050, .05, WHITE, { gloss: .36, tag: '护栏' });
      }
      for (const y of [.52, 1.02])
        cap(RAIL_X, y, (z0 + z1) / 2, .035, z1 - z0, .035, WHITE,
          { rx: Math.PI / 2, gloss: .36, tag: '护栏' });
    }
    rail(13.00, ambulance.z - ambulance.width / 2);
    rail(ambulance.z + ambulance.width / 2, 42.55);

    // Two wall-mounted hospital lamps preserve the north/south rhythm without putting a mast in
    // either the exact 2.22 m patient footway or the live west cycle track.
    for (const [z, label] of [[16.55, '门诊'], [30.20, '住院']]) {
      box(FACE + .10, 4.42, z, .20, .34, .28, STEEL,
        { hard:true, gloss:.34, tag:'路灯' });
      cap(FACE + .48, 4.55, z, .040, .78, .040, STEEL,
        { rz:Math.PI / 2, gloss:.36, tag:'路灯' });
      box(FACE + .86, 4.55, z, .30, .12, .58, STEEL,
        { hard:true, gloss:.34, tag:'路灯' });
      const lamp = light(FACE + .88, 4.42, z, [.82, .94, 1.0], .48, 7.2);
      lamp.on = false; lamps.push(lamp);
      remember(box(FACE + .16, 3.65, z, .06, .88, .78, BLUE,
        { hard: true, mode: 1, gloss: .22, tag: '路灯' }), .015, .22);
      glyphs(FACE + .20, 3.65, z, Math.PI / 2, label,
        { size: .17, gap: .04, color: WHITE, mode: 1, vertical: true, lift: .007, tag: '路灯' });
      pools.push({ g: glow(M.trs(24.35, .032, z, 0, 2.0, 1, 5.5), COOL, 0), a: .19 });
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

    StreetFit['hospital'].PLAN = { access: ACCESS };
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
