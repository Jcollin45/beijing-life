// 车厢 — the inside of a 二号线 train, and the only room in this game that moves.
//
// Every other interior is somewhere you walk into and out of at your own pace. This one takes
// you somewhere, and the whole point of it is the waiting: you get on, the doors close, and the
// next two minutes are yours to sit down, hold a pole, read the line map over the door and watch
// the tunnel go past until the station you actually want is announced. A subway ride you can
// skip with a menu is a teleporter with Chinese written on it.
//
// So the car is built to be sat in. The interior borrows the calm, premium language of a modern
// Chinese intercity carriage: paired high-back seats facing down the car, white antimacassars,
// warm ivory panels, luggage shelves and hanging information screens. The subway essentials
// remain — wide vestibules, route maps and a clear central aisle to every door.
//
// Which side the doors open is a property of the station, not of the car, and the announcement
// says so — 请从左边下车 — because that is the sentence you actually have to understand on a
// Beijing train, and standing at the wrong doors while the right ones close is how you learn it.
//
// The world outside the windows is two bands per side: a dark tunnel wall with light fittings
// scrolling past at the speed the train is doing, and behind it a lit platform that fades up as
// the train stops. Neither is real geometry going anywhere — the car never moves in world space.
// It is the tunnel that moves, which is both cheaper and, from inside, indistinguishable.
const Train = Lazy('Train', () => {
  const col = {
    floor: C('#323235'), floorL: C('#48443f'), tread: C('#3a3938'), yellow: C('#d5a62c'),
    // The pale surfaces came down a step each. The car is lit by two 15 m emissive strips and
    // was surfaced in near-white above the seat backs, so the ceiling, the coving and the top of
    // the walls clipped to flat white and the whole upper half of the carriage lost its edges.
    // These still read as a white train; they just leave the highlights somewhere to go.
    // Warmer by a step and a shade denser. The car was surfaced in a cool ivory that photographed
    // as printer paper: with one directional light, no bounce and two 15 m emissive strips, every
    // pale plane above the seat backs sat within a few units of white and the upper half of the
    // carriage had no separation left in it at all. Everything here has been pulled toward the
    // sand/champagne end and dropped four or five per cent in value, which is enough for the
    // moulded roof, the wall panels and the luggage shelves to read as three different materials.
    wall: C('#e4dac4'), wallD: C('#cabfa4'), panel: C('#d3c7ad'), trim: C('#b6a482'),
    ceil: C('#d6ceba'), ceilD: C('#c6bca4'), tube: C('#fff1c6'),
    steel: C('#b7afa2'), steelD: C('#766f67'), chrome: C('#d2cbc0'), black: C('#17191c'),
    charcoal: C('#2f353c'), navy: C('#24344a'), navyL: C('#365b82'), glass: C('#c3d6e2'),
    seat: C('#a2764a'), seatL: C('#c69c66'), seatD: C('#553f2b'),
    care: C('#8f4f3f'), careL: C('#ad6a55'),          // restrained priority-seat upholstery
    linen: C('#f4efe2'), linenD: C('#d8d0bd'),
    tray: C('#8d7c63'), trayL: C('#b9ab90'), wood: C('#6d5139'), bronze: C('#b49465'),
    carpet: C('#4b382c'), carpetL: C('#6a5240'), luggage: C('#4c5966'),
    // The set dressing: what is in the pockets, on the racks and hanging at the windows.
    mesh: C('#3b3833'), paper: C('#d6ccb4'), bottle: C('#7fa9b4'),
    curtain: C('#c8b795'), curtainD: C('#a3906f'),
    caseA: C('#3a4b5c'), caseB: C('#6b4436'), caseC: C('#8d8577'), caseD: C('#2c3a34'),
    strap: C('#dfe2e4'), strapD: C('#8d949a'),
    red: C('#b2402d'), redL: C('#e26b51'), jade: C('#3d7361'), jadeL: C('#75aa91'),
    white: C('#f2f0e9'), cream: C('#e6e0d2'), amber: C('#e0a847'), green: C('#65b892'),
    tunnel: C('#15181c'), tunnelL: C('#2a2f36'), lampT: C('#ffe6ac'), platform: C('#cfcabf'),
  };
  const G = { matte: .06, paint: .16, metal: .58, glass: .80, fabric: .05 };
  // ---------------------------------------------------------------- surfaces
  // Tiling materials, sampled triplanar in world space, so nothing here needs UVs and the curved
  // shoulder panel takes the same plaster as the flat crown beside it without anybody having to
  // unwrap a rotated box. `matScale` is one repeat in metres — a seat weave is a quarter of a
  // metre, a wall panel is two — and `matAmt` is how far the tile is allowed to move the colour.
  //
  // Everything in a carriage is a moulded, pressed or upholstered panel that left a factory
  // eighteen months ago, not a weathered outdoor surface, so the amounts stay in the low half of
  // the useful range: enough that the eye stops reading forty seats as forty identical flat
  // brown slabs, not so much that the car looks like it has been left out in the rain.
  //
  // Nothing emissive gets one. The tubes, the LED route board, the door lamps and the platform
  // are all mode 1, and a lamp with a fabric weave printed across it stops being a lamp.
  const MAT = {
    seat:     { mat: 'fabric',  matScale: .26, matAmt: .42 },  // upholstery, and the shelf bags
    seatBk:   { mat: 'fabric',  matScale: .32, matAmt: .38 },  // back shells, one size coarser
    linen:    { mat: 'fabric',  matScale: .17, matAmt: .30 },  // antimacassars: finer, and pale
    carpet:   { mat: 'fabric',  matScale: .30, matAmt: .46 },  // the woven aisle runner
    vinyl:    { mat: 'concrete', matScale: .70, matAmt: .30 }, // the composite aisle deck
    rubber:   { mat: 'asphalt', matScale: .44, matAmt: .32 },  // the dark deck and the door treads
    paved:    { mat: 'paving',  matScale: .66, matAmt: .36 },  // the platform outside, which is
                                                              // the one surface here really paved
    panel:    { mat: 'plaster', matScale: 2.10, matAmt: .28 }, // wall linings and end bulkheads
    shoulder: { mat: 'plaster', matScale: 2.60, matAmt: .26 }, // the moulded roof, one size larger
    metal:    { mat: 'metal',   matScale: .50, matAmt: .32 },  // luggage shelves and door leaves
    trim:     { mat: 'metal',   matScale: .34, matAmt: .30 },  // brackets, bezels, frames, plinths
    rail:     { mat: 'metal',   matScale: .40, matAmt: .28 },  // stanchions and grab rails
    // The one genuinely corrugated material in the set, so it is spent on the two things in a
    // carriage that really are ribbed: the sill plate you step over and the extract grilles in
    // the roof. Anywhere else it turns a moulded panel into a shed.
    ribbed:   { mat: 'steel',   matScale: .16, matAmt: .34 },
    wood:     { mat: 'wood',    matScale: .72, matAmt: .40 },  // the ceiling spine and seat trays
  };

  // What a tiling texture actually does to the colour underneath it. The shader multiplies the
  // surface by the tile it samples, normalised against a mid grey — `base *= mix(1, t/0.22,
  // matAmt)` — on the stated understanding that this leaves the chosen colour where it was and
  // lets only the variation through. That holds only if the tile averages the grey it is being
  // divided by, and none of these do. Measured in linear light: Metal049A comes out 4.34 times
  // it, the upholstery fabric 2.69, painted plaster 2.32, and the road asphalt 0.37 of it.
  //
  // Which matters more in this room than it would in most, because the materials a carriage wants
  // most — fabric, metal, plaster, concrete — are the flattest of the set. Their colour maps vary
  // by one or two per cent end to end; everything they are worth lives in their normal maps, in
  // the weave and the brushed grain and the roller stipple. Used raw they therefore contribute no
  // pattern whatsoever and a two-to-four-fold lift in value, which is the worst of both: the
  // first pass through this file did exactly that and turned every door leaf, luggage shelf and
  // wall panel white. That is the same failure the palette notes at the top of the file were
  // written about, reached from the other direction.
  //
  // So the colour goes in divided by the mean the material is about to multiply it by, in linear
  // light, and comes back out where it was set. The tile is left supplying the relief it was added
  // for. Memoised, because forty seats ask the same two questions.
  const MEAN = { wood: 1.675, concrete: 2.190, plaster: 2.323, asphalt: .367,
                 fabric: 2.686, metal: 4.336, steel: 1.032, paving: 1.201 };
  const toLin  = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const toSrgb = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
  const dimmed = new Map();
  function D(c, m) {
    const key = c[0] + ',' + c[1] + ',' + c[2] + '|' + m.mat + '|' + m.matAmt;
    let out = dimmed.get(key);
    if (!out) {
      const k = 1 / (1 + m.matAmt * (MEAN[m.mat] - 1));
      out = c.map(v => toSrgb(Math.min(1, toLin(v) * k)));
      dimmed.set(key, out);
    }
    return out;
  }
  // Three more things the tick moves, and one number it keeps.
  const mirrorProps = [];   // the ceiling strip, reflected in the window
  const lightProps = [];    // the fittings, which brown out at a section gap
  const lightPools = [];    // and the pools of light they throw, which brown out with them
  const streakProps = [];   // the tunnel lamps, which are streaks and not lamps at speed
  let dist = 0;             // metres travelled, for anything that happens per metre of track

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  // Sixteen metres of car, three of width, and 2.4 in the clear. Four seats fit across each row,
  // but the centre aisle is deliberately a little wider than scale so keyboard steering remains
  // comfortable and a player can reach every vestibule without clipping an armrest.
  const RX = 7.90, RZ = 1.62, H = 2.42;
  const SEATZ = 1.06;
  const WALLZ = RZ - .02;
  const DOORX = [-5.55, -1.85, 1.85, 5.55];
  const DOORW = 1.34;                     // the clear opening, per pair
  const LEAF = DOORW / 2;

  // Every platform is on the passenger-facing +z wall. Alternating this per station was
  // technically plausible, but from the normal camera it looked exactly as if only every second
  // stop opened. The spoken left/right direction still changes when the train runs in reverse.
  const SIDES = [1, 1, 1, 1, 1, 1, 1];
  const NAMES = ['杨柳胡同', '商务区', '大学城', '火车站', '公园', '动物园', '机场'];

  // ---------------------------------------------------------------- the roof line
  // A carriage roof is a curve, and this renderer's primitive list stops at boxes, cylinders and
  // capsules — there is no lathe and no extrude, so a tube is what you get unless you build one.
  // The shoulder is therefore five long facets stepped around a quarter ellipse: it springs off
  // the top of the luggage shelf at z 1.52, y 2.16 and turns through to the flat crown at z 0.98,
  // y 2.445. The chord angles come out of the ellipse rather than out of a guess, so consecutive
  // panels meet without a step and the shading breaks between them read as one continuous
  // moulding rather than as five separate planks leaning on each other.
  const ARC = [], ARC_N = 5, ARC_Z = .98, ARC_A = .54, ARC_Y = 2.16, ARC_B = .285;
  for (let i = 0; i <= ARC_N; i++) {
    const th = i / ARC_N * Math.PI / 2;
    ARC.push([ARC_Z + ARC_A * Math.cos(th), ARC_Y + ARC_B * Math.sin(th)]);
  }
  // Where a fitting has to go if it is to lie flush on that curve rather than cut into it: a
  // fraction `t` of the way along facet `i`, standing `drop` metres off its inner face along the
  // chord's own inward normal, and the roll angle it has to be given to sit parallel with it.
  // The angle is handed back per side, because the mirrored panel turns the other way.
  function arcAt(i, t, drop) {
    const [za, ya] = ARC[i], [zb, yb] = ARC[i + 1];
    const dz = zb - za, dy = yb - ya, len = Math.hypot(dz, dy);
    return { z: za + dz * t - dy / len * drop, y: ya + dy * t + dz / len * drop, len,
             rx: s => Math.atan2(-dy, s * dz) };
  }

  // Everything that has to move after the room is built.
  const doorLeaves = [], doorLamps = [], strapProps = [], tunnelProps = [], platformProps = [];
  const signGroups = [], mapDots = [], routeNodes = [], nextFrames = [], platformNameGroups = [];
  const nextHeaders = [], arrivedHeaders = [], destinationHeaders = [], statusRails = [];
  const tvStationGroups = [], tvHeaders = [], tvFaces = [], tvAccents = [];

  // `Build.finish` packs cull spheres once. Animated props may write `p.cx` later, but that packed
  // copy cannot follow them, so reserve the whole motion around a chosen centre before finishing.
  function reserveMover(p, pad, cx, cy, cz) {
    if (!p || !p.ob) return p;
    p.fixed = true;
    p.cx = cx === undefined ? p.ob.x : cx;
    p.cy = cy === undefined ? p.ob.y : cy;
    p.cz = cz === undefined ? p.ob.z : cz;
    p.r = .5 * Math.hypot(p.ob.sx, p.ob.sy, p.ob.sz) + pad;
    return p;
  }

  // ---------------------------------------------------------------- the shell
  function shell() {
    // Floor: a dark rubber deck with a lighter aisle down the middle and a tread strip at each
    // door, which is the one bit of a subway floor anybody ever looks at.
    flat(0, .004, 0, RX * 2, RZ * 2, D(col.floor, MAT.rubber),
      { mode: 7, gloss: .10, ...MAT.rubber });
    flat(0, .008, 0, RX * 2 - .4, 1.72, D(col.floorL, MAT.vinyl),
      { mode: 7, gloss: .12, ...MAT.vinyl });
    // A woven runner and fine champagne borders lead the eye down the cabin like the carpet in
    // a premium intercity car. The doorway treads are laid later and remain visually dominant.
    flat(0, .011, 0, RX * 2 - .46, .70, D(col.carpet, MAT.carpet),
      { mode: 7, gloss: .04, ...MAT.carpet });
    for (const s of [-1, 1])
      flat(0, .013, s * .365, RX * 2 - .52, .018, col.bronze, { mode: 1, gloss: .26 });
    // A restrained route-colour inlay keeps the long aisle from reading as one empty grey slab.
    // It is broken at the door areas so it feels laid into the floor rather than painted over it.
    for (const [x0, x1] of wallSpans()) if (x1 - x0 > .5)
      flat((x0 + x1) / 2, .014, 0, x1 - x0 - .10, .026, col.bronze,
        { mode: 1, gloss: .24 });
    for (const dx of DOORX) for (const s of [-1, 1]) {
      flat(dx, .012, s * (SEATZ - .06), DOORW + .30, .74, D(col.tread, MAT.rubber),
        { mode: 7, gloss: .08, ...MAT.rubber });
      // the yellow line you are told to stand behind
      flat(dx, .014, s * (RZ - .30), DOORW + .30, .05, col.yellow, { mode: 1 });
      // two short blue chevrons point from the aisle toward each threshold
      for (const o of [-1, 1])
        flat(dx + o * .22, .016, s * .72, .30, .045, col.navyL,
          { mode: 1, ry: o * s * .32, gloss: .22 });
    }

    // The crown: the flat part of the roof, turned over, or it is a floor at head height facing
    // the wrong way and the car has no ceiling from inside. Narrowed to 2.24 from the old full
    // 3.24, because the moulded shoulder now takes the outer half-metre either side and a flat
    // plane running all the way to the wall is exactly the rectangular tube this is trying to
    // stop being. It overlaps the top of the curve by 14 cm so no camera can find a seam.
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, 2.24))) });
    // The shoulder. Lit rather than emissive, unlike the crown, and that is the whole point: a
    // flat emissive panel is one value across its entire face however it is angled, so five
    // emissive facets would have been five identical stripes. Lit, each one takes the light at
    // its own pitch and the tonal steps between them are what say "curved".
    for (let i = 0; i < ARC_N; i++) {
      const a = arcAt(i, .5, 0);
      // The moulding darkens toward the shelf, the way a real one does with nothing under it to
      // bounce light back up. It also gives the eye the three separate materials — shelf, shoulder,
      // crown — that the old single pale box could not.
      const tone = i === 0 ? col.wallD : i < 3 ? col.ceilD : col.ceil;
      for (const s of [-1, 1])
        box(0, a.y, s * a.z, RX * 2, .05, a.len + .014, D(tone, MAT.shoulder),
          { hard: true, gloss: .17, rx: a.rx(s), ...MAT.shoulder });
    }
    for (const s of [-1, 1]) {
      // The two luminous lines that flank the crown, lying flush on the fourth facet with the
      // diffuser tucked behind them. Built parallel to the panel they sit on, or a straight tube
      // laid across a curve stands off it at one end and buries itself at the other.
      const cove = arcAt(3, .50, .048), lens = arcAt(3, .50, .030);
      lightProps.push({ p: box(0, cove.y, s * cove.z, RX * 2 - .5, .046, .150, col.tube,
        { hard: true, mode: 1, glow: .58, rx: cove.rx(s) }), g: .58 });
      lightProps.push({ p: box(0, lens.y, s * lens.z, RX * 2 - .5, .020, .190, col.white,
        { hard: true, mode: 1, glow: .16, rx: lens.rx(s) }), g: .16 });
      // And a second line right at the springing, washing up the inside of the shoulder. This is
      // the one you actually see from a seat: the luggage shelf hides everything above it at close
      // range, so without a light below the shelf line the new moulding is in its own shadow for
      // the whole length of the car and might as well not have been built.
      const wash = arcAt(0, .62, .038);
      lightProps.push({ p: box(0, wash.y, s * wash.z, RX * 2 - .9, .030, .055, col.tube,
        { hard: true, mode: 1, glow: .42, rx: wash.rx(s) }), g: .42 });
      // the air-conditioning duct down the centre, and its grilles
      box(0, H - .07, s * .30, RX * 2 - 1.2, .14, .26, D(col.wallD, MAT.trim),
        { hard: true, gloss: .20, ...MAT.trim });
    }
    // Pools of light down the length of the car, so the floor and the seats are lit by the
    // fittings rather than by the one lamp a room is allowed in the middle of it.
    // Captured, so the pools go down with the fittings that cast them. A tube that browns out
    // while the patch of floor under it stays lit reads as the tube changing colour, not as the
    // car losing power.
    for (let i = -3; i <= 3; i++)
      lightPools.push({ g: glow(M.trs(i * 2.1, .02, 0, 0, 3.4, 1, RZ * 2.1), C('#f2f6fa'), .09),
        a: .09 });
    for (let i = -6; i <= 6; i++)
      box(i * 1.20, H - .155, 0, .52, .02, .30, D(col.trim, MAT.trim),
        { hard: true, gloss: .30, ...MAT.trim });
    // Dark intake slots and a timber centre spine give the roof some rhythm when the camera is
    // pulled back. Previously the whole ceiling merged into one undifferentiated pale plane.
    box(0, H - .115, 0, RX * 2 - .8, .045, .16, D(col.wood, MAT.wood),
      { hard: true, gloss: .30, ...MAT.wood });
    for (let i = -6; i <= 6; i++)
      box(i * 1.16, H - .145, 0, .54, .022, .075, D(col.charcoal, MAT.ribbed),
        { hard: true, gloss: .12, ...MAT.ribbed });

    // The side walls, in the panels between the doors, with the window band above the seats.
    for (const s of [-1, 1]) {
      const spans = wallSpans();
      for (const [x0, x1] of spans) {
        const w = x1 - x0, cx = (x0 + x1) / 2;
        // The wall, cut around the window instead of running behind it. This used to be one
        // 2.40 m panel with a dark pane laid on the inside face, which meant the window was
        // painted on: the tunnel, its lamps, its cable trays and the whole lit platform with
        // its posters were all built out there and all of them were behind an opaque wall.
        // Nobody had ever seen any of it. Four pieces make a real opening -- the sill panel
        // under the glass, the header over it, and a jamb at each end of the span -- and the
        // sill and header overrun the glass by 2 cm so no seam can leak the dark through.
        // Collision is separate (the solid() rectangles at the end of this function), so the
        // hole costs nothing but the boxes.
        const WY0 = 1.19, WY1 = 1.85;
        box(cx, WY0 / 2, s * WALLZ, w, WY0, .06, D(col.wall, MAT.panel),
          { hard: true, gloss: .16, ...MAT.panel });
        box(cx, (WY1 + 2.40) / 2, s * WALLZ, w, 2.40 - WY1, .06, D(col.wall, MAT.panel),
          { hard: true, gloss: .16, ...MAT.panel });
        // The jambs are the rubber surround now, so the sides of the opening are dark and the
        // frame still reads as a manufactured window rather than a hole sawn in a panel.
        for (const o of [-1, 1])
          box(cx + o * (w - .08) / 2, (WY0 + WY1) / 2, s * WALLZ, .08, WY1 - WY0, .06,
            col.charcoal, { hard: true, gloss: .30 });
        // and a lip along the top, because a pale cut edge above a black tunnel looks unfinished
        box(cx, WY1 - .02, s * (WALLZ - .012), w - .16, .05, .04, col.charcoal,
          { hard: true, gloss: .30 });
        // The pane's tint came down from .26 to .12. Mode 1 means the tint is added regardless of
        // the light, so .26 of a pale blue laid a fixed slate haze over the opening: with a wall
        // behind it that read as glass, but with the real tunnel behind it the haze was brighter
        // than the tunnel and the lamps had nothing to be brighter than.
        box(cx, 1.52, s * (WALLZ - .055), w - .24, .70, .012, col.glass,
          { hard: true, mode: 1, alpha: .12, gloss: G.glass });
        // What the window does when there is nothing behind it. A pane with a dark tunnel on the
        // far side stops being a window and becomes a mirror, and what you see in it is the strip
        // light over your head -- so the reflection is a bar at that height rather than a wash over
        // the whole pane, which is what makes it read as a reflection and not as dirty glass. The
        // tick fades it up as the platform goes and down again as the next one arrives.
        // Low in the pane, and thin. Built at 1.70 with a 5 cm face it lay exactly across the band
        // the tunnel lamps go past in -- 1.49 to 1.83 -- so the reflection hid the one thing outside
        // the window worth seeing. Down here it is clear of them, and a bright line low in the glass
        // is the honest reflection anyway: what a standing passenger sees down there is the lit
        // strip further along the car and the tops of the seat backs, not the lamp overhead.
        mirrorProps.push(box(cx, 1.28, s * (WALLZ - .072), w - .30, .028, .008, col.tube,
          { hard: true, mode: 1, glow: 0, alpha: 0 }));
        // Slim mullions and a bronze sill turn the long black band into a manufactured window
        // system rather than one continuous textureless opening.
        for (const q of [-.24, .24])
          box(cx + w * q, 1.52, s * (WALLZ - .070), .026, .72, .018, col.trim,
            { hard: true, gloss: .28 });
        box(cx, 1.135, s * (WALLZ - .068), w - .22, .028, .028, col.bronze,
          { hard: true, gloss: .34 });
        // the moulding under the window and the skirting under the seats
        box(cx, 1.06, s * (WALLZ - .03), w, .05, .03, col.trim, { hard: true, gloss: .34 });
        box(cx, 1.015, s * (WALLZ - .045), w - .06, .025, .018, col.navyL,
          { hard: true, mode: 1, glow: .05 });
        box(cx, .06, s * (WALLZ - .02), w, .12, .04, D(col.wallD, MAT.panel),
          { hard: true, gloss: .20, ...MAT.panel });
      }
      // The ends of the car: a full-height wall with a window through to the next carriage.
      for (const ex of [-RX, RX]) {
        box(ex, 1.20, s * .78, .08, 2.40, 1.60, D(col.wall, MAT.panel),
          { hard: true, gloss: .16, ...MAT.panel });
      }
    }
    // The end walls themselves, with the gangway door in the middle of each.
    for (const ex of [-1, 1]) {
      box(ex * RX, 1.20, 0, .08, 2.40, RZ * 2, D(col.wallD, MAT.panel),
        { hard: true, gloss: .16, ...MAT.panel });
      box(ex * (RX - .05), 1.05, 0, .03, 2.02, .84, D(col.panel, MAT.metal),
        { hard: true, gloss: .22, ...MAT.metal });
      box(ex * (RX - .07), 1.45, 0, .02, .92, .58, D(col.charcoal, MAT.trim),
        { hard: true, gloss: .30, ...MAT.trim });
      box(ex * (RX - .08), 1.45, 0, .015, .84, .50, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass });
      capsule(ex * (RX - .09), 1.02, .30, .022, .26, .022, D(col.chrome, MAT.rail),
        { gloss: G.metal, ...MAT.rail });
    }
    solid(-RX - .5, -RX + .06, -RZ, RZ); solid(RX - .06, RX + .5, -RZ, RZ);
    solid(-RX, RX, RZ - .10, RZ + .5);   solid(-RX, RX, -RZ - .5, -RZ + .10);
  }

  // The wall runs between the door openings, which is also where the windows and seats go.
  function wallSpans() {
    const out = [];
    let x = -RX;
    for (const dx of DOORX) { out.push([x, dx - LEAF - .04]); x = dx + LEAF + .04; }
    out.push([x, RX]);
    return out;
  }

  // ---------------------------------------------------------------- 座位 the seats
  // Two rows live in every wall span, with a pair either side of the aisle. The player sees the
  // sculpted back shells, tray panels and white antimacassars when looking down the carriage —
  // the three details that do most of the visual work in the reference photograph.
  function coachSeats() {
    // The inner pair moved 10 cm outward and the outer pair a little closer to the wall. That
    // creates a visibly wider aisle and, more importantly, enough collision-safe steering room
    // for a player body to pass without having to hold a mathematically perfect centre line.
    const seats = [], zs = [-1.10, -.68, .68, 1.10], spans = wallSpans();
    spans.forEach(([x0, x1], spanIndex) => {
      const w = x1 - x0;
      for (let row = 0; row < 2; row++) {
        const x = x0 + w * (.29 + row * .42);
        // Two end rows retain the priority-seat meaning without breaking the warm palette.
        const careRow = (spanIndex === 0 && row === 0) ||
                        (spanIndex === spans.length - 1 && row === 1);
        for (let slot = 0; slot < zs.length; slot++) {
          const z = zs[slot], c = careRow ? col.care : col.seat;
          const cl = careRow ? col.careL : col.seatL;
          const backX = x - .235;

          // Black plinth, champagne frame and thick upholstered pan.
          box(x - .06, .125, z, .22, .17, .24, D(col.black, MAT.trim),
            { hard: true, gloss: .18, ...MAT.trim });
          box(x, .49, z, .59, .17, .42, D(c, MAT.seat), { mode: 7, gloss: G.fabric, ...MAT.seat });
          box(x + .11, .565, z, .50, .12, .37, D(cl, MAT.seat),
            { mode: 7, gloss: G.fabric, ...MAT.seat });

          // High back: a dark shell around a softly rounded insert, with pale piping down both
          // sides. The head cloth is proud of the front face so it reads cleanly at a distance.
          // A single deep, wide soft shell supplies the rounded shoulder and lumbar silhouette.
          // Folding both into this existing piece keeps forty seats plush without forty extra
          // draw calls from a separate decorative bolster.
          box(backX, .99, z, .20, .99, .52, D(col.seatD, MAT.seatBk),
            { mode: 7, gloss: .10, ...MAT.seatBk });
          box(backX + .108, .98, z, .075, .80, .42, D(c, MAT.seat),
            { mode: 7, gloss: G.fabric, ...MAT.seat });
          // One deep piece wraps over the crown, so the white cloth is visible from the front
          // and from the seat-back view used when walking down the aisle.
          box(backX, 1.285, z, .205, .32, .38, D(col.linen, MAT.linen),
            { mode: 7, gloss: .04, ...MAT.linen });

          // A slim tray and latch on the rear reproduce the ordered seat-back rhythm in the
          // photograph, especially from the new down-aisle spawn view.
          box(backX - .078, .88, z, .035, .30, .34, D(col.tray, MAT.wood),
            { hard: true, gloss: .24, ...MAT.wood });

          seats.push({ x, z, yaw: Math.PI / 2, care: careRow, slot, row,
            group: `${spanIndex}:${row}` });
        }

        // Shared armrests visually tie each pair together while preserving the broad aisle.
        for (const z of [-1.31, -.89, -.46, .46, .89, 1.31]) {
          box(x + .05, .70, z, .42, .10, .075, D(col.seatL, MAT.seat),
            { mode: 7, gloss: .12, ...MAT.seat });
        }
        // Only the two side pairs block walking; the centre aisle remains continuous.
        // The collider covers the structural half of each pair rather than spilling into the
        // aisle. With the player's radius included this leaves roughly 76 cm of usable width.
        solid(x - .32, x - .14, -1.35, -.66);
        solid(x - .32, x - .14, .66, 1.35);
      }
    });

    // Which seats a body can actually walk out of, and where it has to stand to do it. Nothing in
    // here stops an NPC — they have no collision — so this is the only thing that can tell them.
    //
    // Leaving a seat means crossing the armrest shared with the seat beside it. It sits 0.05 ahead
    // of the seat centre and is 0.42 long, so its front face is 0.26 ahead; with 0.18 of shoulder
    // that is 0.44 before a body is past it. The row in front is the other wall: its back shell
    // reaches 0.335 behind its own centre, so a body has to stay 0.515 short of it. A seat is only
    // walkable if those two leave a gap, and rows are 0.42 of a wall span apart — 0.69 in the two
    // short spans, 0.96 in the three long ones — so it is the rear row of each span that works and
    // the front row of none of them. Widen the pitch later and the front rows come back on their
    // own; that is the point of deriving it rather than listing it.
    const ARMREST = .44, ROW_AHEAD = .515;
    for (const s of seats) {
      let ahead = 9;
      for (const o of seats) if (o.z === s.z && o.x > s.x + .01) ahead = Math.min(ahead, o.x - s.x);
      s.legroom = ahead;
      const hi = ahead - ROW_AHEAD;
      s.walkOut = hi >= ARMREST + .06 ? Math.min(ARMREST + .08, hi - .04) : null;
    }
    return seats;
  }

  // ---------------------------------------------------------------- vestibule rails and premium-carriage fittings
  function poles() {
    // Floor-to-ceiling rails remain at the vestibules, where standing passengers actually need
    // them. Removing the dense forest of straps keeps the long seated sightline from the photo.
    for (const dx of DOORX) for (const s of [-1, 1]) for (const o of [-1, 1]) {
      const px = dx + o * (LEAF + .16);
      capsule(px, 1.21, s * (SEATZ - .42), .030, 2.38, .030, D(col.chrome, MAT.rail),
        { gloss: G.metal, ...MAT.rail });
      box(px, 2.40, s * (SEATZ - .42), .09, .05, .09, D(col.steelD, MAT.trim),
        { hard: true, gloss: G.metal, ...MAT.trim });
    }
  }

  function cabinFittings() {
    // Deep continuous luggage shelves above the windows, with a warm wash underneath. Each
    // span is separately framed so the shelf never crosses a door or hides a route display.
    for (const s of [-1, 1]) {
      const spans = wallSpans();
      for (let i = 0; i < spans.length; i++) {
        const [x0, x1] = spans[i], w = x1 - x0, cx = (x0 + x1) / 2;
        box(cx, 2.055, s * (RZ - .25), w - .10, .13, .52, D(col.panel, MAT.metal),
          { hard: true, gloss: .20, ...MAT.metal });
        box(cx, 1.975, s * (RZ - .48), w - .16, .035, .10, col.tube,
          { hard: true, mode: 1, glow: .56 });
        capsule(cx, 1.925, s * (RZ - .51), .025, w - .18, .025, D(col.bronze, MAT.rail),
          { rz: Math.PI / 2, gloss: .52, ...MAT.rail });
        for (const ex of [x0 + .12, x1 - .12])
          box(ex, 1.99, s * (RZ - .40), .045, .24, .38, D(col.trim, MAT.trim),
            { hard: true, gloss: .24, ...MAT.trim });

        // A few restrained bags break up the perfect shelves and add depth without cluttering
        // every bay. Their dark fabric also gives the warm ivory trim some needed contrast.
        if ((i + (s > 0 ? 0 : 1)) % 2 === 0 && w > 1.45) {
          const bag = i % 3 === 0 ? col.luggage : i % 3 === 1 ? col.seatD : col.charcoal;
          box(cx, 2.205, s * (RZ - .27), Math.min(.58, w - .42), .22, .30, D(bag, MAT.seat),
            { mode: 7, gloss: .10, ...MAT.seat });
          box(cx, 2.205, s * (RZ - .425), Math.min(.34, w - .58), .025, .018, col.bronze,
            { hard: true, gloss: .34 });
        }
      }
    }

    // Circular ceiling lamps soften the formerly clinical metro roof.
    for (const x of [-6.1, -3.05, 0, 3.05, 6.1]) {
      cyl(x, H - .055, 0, .205, .028, col.tube, { mode: 1, glow: .88, gloss: .18 });
      cyl(x, H - .072, 0, .115, .035, D(col.ceil, MAT.trim), { gloss: .12, ...MAT.trim });
    }

    // Three suspended information screens make the long aisle feel serviced and inhabited.
    // Every face owns all six station-name glyph groups; refreshScreens reveals only the station
    // outside the doors and blacks the panel once those doors finish closing.
    // The end units sit beyond the default third-person eye, preventing a close screen from
    // filling the top of the picture while the centre unit remains the clear focal display.
    for (const x of [-5.35, 0, 5.35]) {
      capsule(x, 2.25, 0, .028, .26, .028, col.steelD, { gloss: .42 });
      box(x, 2.07, 0, .105, .60, 1.10, col.black, { hard: true, gloss: .30 });
      for (const d of [-1, 1]) {
        const faceX = x + d * .044, yaw = d < 0 ? -Math.PI / 2 : Math.PI / 2;
        tvFaces.push(box(faceX, 2.08, 0, .018, .49, .96, col.black,
          { hard: true, mode: 1, glow: .02, gloss: .42 }));
        tvAccents.push(
          box(x + d * .066, 1.875, -.20, .014, .032, .40, col.redL,
            { hard: true, mode: 1, glow: .32, alpha: 0 }),
          box(x + d * .066, 1.875, .25, .014, .032, .30, col.jadeL,
            { hard: true, mode: 1, glow: .26, alpha: 0 })
        );
        tvHeaders.push(...glyphs(x + d * .068, 2.255, 0, yaw, '本站',
          { size: .052, gap: .012, color: col.jadeL, mode: 1, glow: .52, alpha: 0,
            lift: .050 }));
        tvStationGroups.push(NAMES.map(name => glyphs(x + d * .069, 2.095, 0, yaw, name,
          { size: .132, gap: .010, color: col.white, mode: 1, glow: 1.05, alpha: 0,
            lift: .055 })));
      }
    }
  }

  // ---------------------------------------------------------------- doors
  // Four pairs a side. Each leaf slides into the wall beside it, so the pair opens outward from
  // the middle of the opening, and the glass goes with it.
  function doors() {
    for (const s of [-1, 1]) for (const dx of DOORX) {
      for (const o of [-1, 1]) {
        const cx = dx + o * LEAF / 2;
        const leaf = [
          box(cx, 1.20, s * WALLZ, LEAF, 2.36, .05, D(col.panel, MAT.metal),
            { hard: true, gloss: .22, ...MAT.metal }),
          box(cx, 1.52, s * (WALLZ - .035), LEAF - .12, .78, .02, D(col.charcoal, MAT.trim),
            { hard: true, gloss: .30, ...MAT.trim }),
          box(cx, 1.52, s * (WALLZ - .05), LEAF - .18, .68, .012, col.glass,
            { hard: true, mode: 1, alpha: .28, gloss: G.glass }),
          // a route-colour kick panel turns a blank lower leaf into something recognisably part
          // of this car, while staying low enough not to compete with the view through the glass
          box(cx, .44, s * (WALLZ - .035), LEAF - .15, .08, .018, col.navyL,
            { hard: true, mode: 1, glow: .04 }),
          // the yellow edge that meets its opposite number, and the rubber seal on it
          box(cx + o * (LEAF / 2 - .03), 1.20, s * (WALLZ - .03), .05, 2.30, .04, col.yellow,
            { hard: true, mode: 1 }),
        ];
        for (const p of leaf) {
          reserveMover(p, LEAF * .92);
          doorLeaves.push({ p, dir: o, side: s });
        }
      }
      // the head and threshold of the opening, which do not move
      box(dx, 2.41, s * (WALLZ - .02), DOORW + .12, .06, .07, D(col.trim, MAT.trim),
        { hard: true, gloss: .30, ...MAT.trim });
      box(dx, .03, s * (WALLZ - .02), DOORW + .12, .06, .07, D(col.steelD, MAT.ribbed),
        { hard: true, gloss: G.metal, ...MAT.ribbed });
      // One indicator per doorway: red while shut, green only on the platform side once the
      // leaves have cleared. It makes the correct side legible before the player reads the text.
      box(dx, 2.30, s * (WALLZ - .075), .30, .14, .045, col.charcoal,
        { hard: true, gloss: .28 });
      const lamp = ball(dx, 2.30, s * (WALLZ - .115), .050, .050, .025, col.redL,
        { mode: 1, glow: .30, gloss: .34 });
      doorLamps.push({ p: lamp, side: s });
      // A full-width light bar makes the opening side readable from the other end of the car;
      // the old five-centimetre dot was technically correct but visually easy to miss.
      const openBar = box(dx, 2.30, s * (WALLZ - .108), .48, .025, .020, col.redL,
        { hard: true, mode: 1, glow: .24, gloss: .24 });
      doorLamps.push({ p: openBar, side: s });
      // 当心夹手 — mind the doors, stencilled beside every one of them
      glyphs(dx + LEAF + .30, 1.70, s * (WALLZ - .04), s > 0 ? Math.PI : 0, '当心夹手',
        { size: .07, gap: .018, color: col.red, mode: 1 });
    }
  }

  // ---------------------------------------------------------------- carriage colour and posters
  // Real metro cars use the strip above the windows as a changing little street of adverts.
  // A handful of tidy graphic panels gives this car scale and personality without turning it
  // into a wall of unreadably small type.
  function adverts() {
    const copy = ['北京生活', '文明乘车', '一路平安', '绿色出行', '今天很好'];
    const inks = [col.red, col.jade, col.navyL, col.amber, col.jadeL];
    const spans = wallSpans();
    for (const s of [-1, 1]) spans.forEach(([x0, x1], i) => {
      const w = x1 - x0;
      if (w < 1.30) return;
      const cx = (x0 + x1) / 2, aw = Math.min(1.48, w - .22);
      const z = s * (WALLZ - .052), yaw = s > 0 ? Math.PI : 0;
      box(cx, 2.17, z, aw, .31, .025, col.cream, { hard: true, gloss: .20 });
      box(cx - aw / 2 + .055, 2.17, z - s * .016, .075, .27, .012, inks[i],
        { hard: true, mode: 1, glow: .05 });
      box(cx + aw / 2 - .10, 2.17, z - s * .017, .12, .12, .014, inks[(i + 2) % inks.length],
        { hard: true, mode: 1, glow: .05 });
      glyphs(cx - .06, 2.17, z - s * .020, yaw, copy[(i + (s > 0 ? 0 : 2)) % copy.length],
        { size: .082, gap: .018, color: col.charcoal, mode: 1 });
    });
  }

  // ---------------------------------------------------------------- the line map and the sign
  // Over the two centre doors on both sides: a dark illuminated route panel modelled after the
  // reference display. The complete line remains readable, while a bright framed header and a
  // pulsing amber node make the next stop unmistakable from across the car.
  function signage() {
    const dotStep = .46;
    for (const s of [-1, 1]) for (const dx of [DOORX[1], DOORX[2]]) {
      const yaw = s > 0 ? Math.PI : 0, z = s * (WALLZ - .05);
      // Brushed-metal bezel, then a recessed black LED face. The separation gives the board a
      // manufactured edge instead of looking like a flat black rectangle pasted over a window.
      box(dx, 1.94, z, 3.30, .72, .045, D(col.steelD, MAT.trim),
        { hard: true, gloss: .52, ...MAT.trim });
      box(dx, 1.94, z - s * .020, 3.18, .62, .020, col.black,
        { hard: true, gloss: .28 });
      statusRails.push(
        box(dx, 2.26, z - s * .042, 3.22, .025, .016, col.red,
          { hard: true, mode: 1, glow: .30 }),
        box(dx, 1.62, z - s * .042, 3.22, .025, .016, col.red,
          { hard: true, mode: 1, glow: .20 })
      );

      glyphs(dx - 1.18, 2.10, z - s * .045, yaw, '二号线',
        { size: .072, gap: .014, color: col.white, mode: 1, glow: .12 });
      nextHeaders.push(...glyphs(dx - .45, 2.10, z - s * .045, yaw, '下一站',
        { size: .078, gap: .016, color: col.redL, mode: 1, glow: .30 }));
      arrivedHeaders.push(...glyphs(dx - .45, 2.10, z - s * .047, yaw, '已到站',
        { size: .078, gap: .016, color: col.green, mode: 1, glow: .50, alpha: 0 }));
      destinationHeaders.push(...glyphs(dx - .45, 2.10, z - s * .049, yaw, '目的地',
        { size: .078, gap: .016, color: col.green, mode: 1, glow: .62, alpha: 0 }));

      // A luminous outline around the changing name echoes the red next-stop frame in the
      // reference without obscuring the Chinese characters inside it.
      const fx = dx + .72, fw = 1.18, fh = .21, fz = z - s * .050;
      nextFrames.push(
        box(fx, 2.10 + fh / 2, fz, fw, .018, .012, col.redL,
          { hard: true, mode: 1, glow: .34 }),
        box(fx, 2.10 - fh / 2, fz, fw, .018, .012, col.redL,
          { hard: true, mode: 1, glow: .34 }),
        box(fx - fw / 2, 2.10, fz, .018, fh, .012, col.redL,
          { hard: true, mode: 1, glow: .34 }),
        box(fx + fw / 2, 2.10, fz, .018, fh, .012, col.redL,
          { hard: true, mode: 1, glow: .34 })
      );

      // Centred on the count rather than on a written-down 2.5. With 动物园 added the strip is
      // seven stops, and the old constant hung the whole line half a stop to the left of the panel
      // it is printed on — the sort of thing that reads as a rendering fault rather than as an
      // out-of-date literal.
      const half = (NAMES.length - 1) / 2;
      box(dx, 1.82, z - s * .045, dotStep * (NAMES.length - 1), .030, .012, col.red,
        { hard: true, mode: 1, glow: .20 });
      NAMES.forEach((name, i) => {
        const px = dx + (i - half) * dotStep;
        const node = box(px, 1.82, z - s * .050, .070, .070, .014, col.white,
          { hard: true, mode: 1, glow: .18 });
        routeNodes.push({ p: node, index: i });
        glyphs(px, 1.69, z - s * .050, yaw, name,
          { size: .043, gap: .005, color: col.cream, mode: 1, glow: .10 });
      });
      // the ring that says which one you are at, parked on the first station until told otherwise
      const ringX = dx - half * dotStep, ringTravel = dotStep * (NAMES.length - 1);
      const ring = box(ringX, 1.82, z - s * .055, .125, .125, .014,
        col.green, { hard: true, mode: 1, glow: .58 });
      reserveMover(ring, ringTravel / 2, ringX + ringTravel / 2, 1.82, z - s * .055);
      mapDots.push({ p: ring, x0: dx - half * dotStep, step: dotStep });

      // All six next-stop names are built in advance; setStops parks the five not in use.
      const group = NAMES.map(n =>
        glyphs(fx, 2.10, z - s * .060, yaw, n,
          { size: .088, gap: .012, color: col.lampT, mode: 1, glow: .58 }));
      signGroups.push(group);
    }
  }

  // ---------------------------------------------------------------- outside the windows
  // Two bands a side. The tunnel is dark and scrolls; the platform behind it is lit and fades up
  // when the train stops. Both are built well past the ends of the car so that sliding the
  // tunnel along by up to one lamp spacing never runs out of tunnel.
  const LAMP_STEP = 3.10;
  function outside() {
    for (const s of [-1, 1]) {
      const z = s * (RZ + .62);
      // the tunnel wall itself, and the cable trays that run along it
      // Unlit. As a lit surface the car's own interior light was landing on it and ambient lifted
      // #15181c to a mid slate around luminance 59, which is not a tunnel and left the lamps with
      // nothing to be brighter than. Nothing in a tunnel is lit except the lamps.
      tunnelProps.push(box(0, 1.40, z, 44, 3.20, .10, col.tunnel,
        { hard: true, mode: 1, gloss: .06 }));
      for (const y of [1.86, 1.70])
        tunnelProps.push(box(0, y, s * (RZ + .55), 44, .05, .05, col.tunnelL,
          { hard: true, gloss: .18 }));
      for (let i = -7; i <= 7; i++) {
        const lx = i * LAMP_STEP;
        const lamp = box(lx, 1.66, s * (RZ + .52), .09, .34, .05, col.lampT,
          { hard: true, mode: 1, glow: .90 });
        tunnelProps.push(lamp);
        streakProps.push(lamp);
        tunnelProps.push(box(lx, 1.20, s * (RZ + .54), .16, .90, .04, col.tunnelL,
          { hard: true, gloss: .14 }));
      }
      // and the platform, which is simply there when the tunnel is not
      // Set the platform wall far enough behind the threshold that an open doorway has real
      // depth. At the old 44 cm offset, the platform wall looked exactly like a closed door leaf.
      const wallZ = s * (RZ + .62);
      const floorZ = s * (RZ + .29);
      platformProps.push(box(0, .006, floorZ, 40, .012, .52, D(col.floorL, MAT.paved),
        { hard: true, mode: 7, gloss: .12, alpha: 0, ...MAT.paved }));
      platformProps.push(box(0, .014, s * (RZ + .14), 40, .018, .09, col.yellow,
        { hard: true, mode: 1, glow: .10, alpha: 0 }));
      platformProps.push(box(0, .012, s * (RZ + .31), 40, .016, .055, col.white,
        { hard: true, mode: 1, alpha: 0 }));
      platformProps.push(box(0, 1.44, wallZ, 40, 2.60, .06, col.platform,
        { hard: true, mode: 1, glow: .10, gloss: .20, alpha: 0 }));
      platformProps.push(box(0, .30, wallZ - s * .035, 40, .60, .06, col.wallD,
        { hard: true, mode: 1, glow: .04, gloss: .18, alpha: 0 }));
      // A tile datum, overhead light and alternating poster blocks give the platform parallax
      // and make a stop feel like a real place rather than a single beige wall fading in.
      platformProps.push(box(0, 1.02, wallZ - s * .045, 40, .12, .035, col.navyL,
        { hard: true, mode: 1, glow: .06, alpha: 0 }));
      platformProps.push(box(0, 2.58, wallZ - s * .12, 40, .08, .10, col.tube,
        { hard: true, mode: 1, glow: .75, alpha: 0 }));
      for (let i = -6; i <= 6; i++) {
        const c = i % 3 === 0 ? col.jade : i % 3 === 1 ? col.amber : col.red;
        platformProps.push(box(i * 3.4, 1.90, wallZ - s * .025, 1.30, .70, .04, col.navy,
          { hard: true, mode: 1, glow: .10, alpha: 0 }));
        platformProps.push(box(i * 3.4 - .56, 1.90, wallZ - s * .055, .08, .58, .025, c,
          { hard: true, mode: 1, glow: .08, alpha: 0 }));
      }
      // The station name appears on the two boards most likely to pass a window. All six names
      // are built once; the tick only reveals the one matching the stop the train is at.
      for (const sx of [-3.4, 0, 3.4]) {
        const names = NAMES.map(n => glyphs(sx, 1.90, wallZ - s * .070, s > 0 ? Math.PI : 0, n,
          { size: .115, gap: .025, color: col.white, mode: 1, glow: .18, alpha: 0 }));
        platformNameGroups.push(names);
      }
    }
  }

  // ---------------------------------------------------------------- the room
  // The outside is built first, and the order is load-bearing. Props are drawn in array order in
  // one pass with the depth buffer written by every one of them, so a translucent prop hides
  // whatever is built after it and further away: the window glass sits at z 1.545 and used to be
  // built before the tunnel at 2.14, which meant the glass wrote depth over the whole opening and
  // depth-rejected the tunnel, its lamps and the entire platform. Nothing outside the car had ever
  // been drawn. Building the outside first puts it behind the glass in the array as well as in
  // space, so the glass now blends over it. If anything below is ever moved above this line, the
  // windows go blank again.
  outside();
  // Tunnel strips wrap by one lamp pitch. Small lamps otherwise retain a packed sphere at their
  // unswept position and can pop at the edge of the window even though their matrix is in view.
  for (const p of tunnelProps) reserveMover(p, LAMP_STEP + .45);
  shell();
  const SEATS = coachSeats();
  poles();
  cabinFittings();
  doors();
  adverts();
  signage();
  shade(0, 0, RX * 2, RZ * 2, .18);
  lightPools.push({ g: glow(M.trs(0, .02, 0, 0, RX * 2, 1, 2.2), C('#eef3f8'), .12), a: .12 });

  // ---------------------------------------------------------------- the light itself
  // Everything above this line paints light: an emissive tube is a bright rectangle and a glow is
  // a bright patch on the floor, and neither of them makes the seat under it any lighter. That was
  // survivable while the car was surfaced in flat colour, because a flat colour looks the same
  // wherever it is standing. It stops being survivable now that every panel carries a tiling
  // material, because a weave or a brushed grain is only visible where the light across it changes
  // — with one directional source and no bounce, forty upholstered seats down a sixteen-metre tube
  // were all lit identically and the fabric read as printed-on noise rather than as cloth.
  //
  // So the fittings get real lights to go with their emissive faces. A carriage is not lit by one
  // bulb in the middle: it is a continuous run down the length of the roof, plus a warmer wash
  // spilling out from under each luggage shelf onto the seat backs below it. Both are declared
  // here as rows. Only the eight nearest the eye ever reach the shader, which is exactly the right
  // eight — from any seat in the car they are the fittings over your own end of it, and the ones
  // forty feet away that get dropped were contributing nothing you could have seen.
  //
  // Kept in a list with the power each one was declared at, because the tick browns them out along
  // with the tubes they belong to. A section gap that dims the fitting but leaves the seat below it
  // lit reads as the tube changing colour rather than as the car losing its supply.
  const carLights = [];
  const lamp = (x, y, z, c, p, r) => carLights.push({ l: B.light(x, y, z, c, p, r), p0: p });
  // The run down the crown, one under each of the circular ceiling fittings, so the light in the
  // room comes from where the room can see a lamp. Hung at 2.20 rather than up against the crown:
  // the roof carries a batten, a grille and a timber spine between 2.255 and 2.33, and a light
  // declared inside the spine lit it from zero range and turned sixteen metres of dark walnut into
  // a strip of hot orange down the middle of the ceiling.
  for (const x of [-6.1, -3.05, 0, 3.05, 6.1])
    lamp(x, 2.20, 0, [1.00, 0.95, 0.80], .40, 3.4);
  // And the wash under the luggage shelves, over the three long bays. Warmer and shorter-range
  // than the crown run: this is the one that lands on the headrests and the tops of the seat
  // backs, which is where a passenger's own eye actually is.
  for (const x of [-3.70, 0, 3.70]) for (const s of [-1, 1])
    lamp(x, 1.90, s * 1.06, [1.00, 0.88, 0.68], .32, 2.1);

  // The things you can look at and use. The doors are one per opening per side, so 下车 always
  // means the door you are actually standing at.
  for (const s of [-1, 1]) DOORX.forEach((dx, i) => {
    const th = thing('车门', dx, 1.70, s * (WALLZ - .12),
      '车门关了，别扒门。', 'The doors are closed — do not force them.',
      '车 vehicle + 门 door. 上车 get on, 下车 get off.',
      { focus: [dx, s * (SEATZ - .55)], reach: 1.5 });
    th.side = s;
    th.labelGroup = 'train-doors';
  });
  SEATS.forEach((st, i) => {
    // Both seats on one side open into the same clear aisle strip. The former outer-seat focus at
    // z ±.55 was still inside the seat bank after the player's .30 m radius was applied, so
    // standing up caused collision recovery to throw the body roughly three quarters of a metre.
    const aisle = st.z > 0 ? .30 : -.30;
    const th = thing(st.care ? '爱心专座' : '座位', st.x, 1.00, st.z + (st.z > 0 ? -.1 : .1),
      st.care ? '这是爱心专座，让给别人吧。' : '有座位，坐下吧。',
      st.care ? 'A priority seat — better left for somebody who needs it.'
              : 'There is a seat free. Sit down.',
      st.care ? '爱心 loving heart + 专座 reserved seat.' : '座 to sit + 位 place.',
      { focus: [st.x, aisle], reach: 1.15 });
    // What the body does with it: settle onto the upper cushion. Its centre is .565 m and its
    // thickness is .12 m, so the physical surface is .625 m high; using the former .49 m pan
    // value buried the player's hips thirteen and a half centimetres into the upholstery.
    th.seat = { type: 'sit', at: [st.x + .04, st.z], yaw: st.yaw, seatY: .625 };
    th.stand = [st.x, aisle];
    th.labelGroup = st.care ? 'train-priority-seats' : 'train-seats';
  });
  for (const s of [-1, 1]) {
    const th = thing('扶手', 0, 1.94, s * (SEATZ - .50), '抓好扶手。', 'Hold on to the rail.',
      '扶 to support + 手 hand.', { focus: [0, s * (SEATZ - .70)], reach: 1.6 });
    th.labelGroup = 'train-handrails';
  }
  for (const s of [-1, 1]) {
    const th = thing('线路图', DOORX[2], 2.14, s * (WALLZ - .10), '我看看线路图。',
      'Let me look at the line map.', 'Six stations, and 二号线 runs in a ring.',
      { focus: [DOORX[2], s * (SEATZ - .40)], reach: 1.6 });
    th.labelGroup = 'train-route-maps';
  }
  // The long shelves are one continuous fixture on each side. These two grouped targets make the
  // authored racks learnable without pretending the carriage has a separate luggage-state system.
  for (const s of [-1, 1]) {
    const th = thing('行李架', 0, 2.05, s * (RZ - .34), '行李放在头顶的架子上。',
      'Luggage goes on the rack overhead.', '行李 luggage + 架 rack.',
      { focus: [0, s * (SEATZ - .40)], reach: 1.6 });
    th.labelGroup = 'train-luggage-racks';
  }

  // ---------------------------------------------------------------- 充电站 charging socket
  // Wall-mounted socket panel on the end wall beside the gangway, one per side.
  // Follows the airport charger() pattern: panel, faceplate, sockets, indicator, label, thing.
  for (const s of [-1, 1]) {
    const cx = RX - .10, cz = s * (RZ - .16), tag = '充电站';
    box(cx, .55, cz, .16, .50, .10, D(col.panel, MAT.trim),
      { tag, hard: true, gloss: .22, ...MAT.trim });
    box(cx, .55, cz + s * .04, .10, .34, .025, col.charcoal, { tag, hard: true, mode: 1 });
    for (const row of [-1, 1])
      box(cx + row * .03, .52, cz + s * .055, .025, .035, .008, col.black,
        { tag, hard: true, mode: 1 });
    box(cx, .76, cz + s * .055, .035, .018, .008, col.green,
      { tag, hard: true, mode: 1, glow: .16 });
    glyphs(cx, .88, cz + s * .055, s > 0 ? Math.PI : 0, '充电',
      { size: .048, gap: .010, color: col.navyL, mode: 1, tag });
    const z0 = Math.min(cz - s * .10, cz + s * .20);
    const z1 = Math.max(cz - s * .10, cz + s * .20);
    solid(cx - .10, RX - .06, z0, z1);
    thing(tag, cx, .60, cz - s * .06, '手机没电了，充一会儿。',
      'The phone is nearly flat. Give it a few minutes.',
      '充电 to charge + 插座 a socket.',
      { focus: [cx, 0], reach: 2.0 });
  }

  // ---------------------------------------------------------------- state the game drives
  // `bright` starts at 1 because you board a stationary train standing at a platform. Starting at
  // 0 meant the first half second in the carriage was spent watching the tunnel outside fade out
  // and the platform fade in, which is the transition played backwards.
  let motion = 0, doorV = 0, doorMotion = 0, displayCue = 0;
  let scroll = 0, bright = 1, here = 0, next = 1;
  // How loaded the electrical supply is, lagging `motion` by a second and a half. Separate from
  // `motion` because the lights should still be coming down as the platform slides away.
  let load = 0;
  let arrived = false, destination = -1;

  // What an information screen looks like with nothing to say: on, and dark blue.
  const TV_IDLE = C('#16203a');
  function refreshScreens() {
    // Arrival becomes false as soon as closing begins so the route maps can announce what is
    // next. The TVs intentionally use the still-open door amount as well, keeping the current
    // station visible through the entire closing animation and going black only at the seal.
    const on = arrived || doorV > 2e-3;
    for (const p of tvFaces) {
      // Between stations these used to go to black at glow .02, which on a panel this size is a
      // hole cut in the ceiling of the car — the one thing a powered screen never looks like. Idle
      // is now a dim backlit navy: on, and with nothing to say, which is what it should be while
      // the station name is being kept for the moment the doors open.
      p.color = on ? col.navy : TV_IDLE;
      p.glow = on ? .24 : .085;
    }
    for (const p of tvHeaders) p.alpha = on ? .92 : 0;
    for (const p of tvAccents) p.alpha = on ? 1 : 0;
    for (const group of tvStationGroups)
      group.forEach((name, i) => {
        const show = on && i === here;
        for (const p of name) {
          p.alpha = show ? 1 : 0;
          p.m = show ? p.m0 : PARKED;
          p.cx = p.m[12];
          p.cy = show ? p.m[13] : -60;
          p.cz = p.m[14];
        }
      });
  }

  function setDoors(v) {
    v = Math.max(0, Math.min(1, v));
    const dv = v - doorV;
    if (Math.abs(dv) < 2e-3) {
      if (v < 2e-3 || v > .998) doorMotion = 0;
      return;
    }
    doorMotion = dv > 0 ? 1 : -1;
    doorV = v;
    for (const d of doorLeaves) {
      const open = d.side === SIDES[here] ? v : 0;
      d.p.m = M.mul(M.trans(d.dir * LEAF * .92 * open, 0, 0), d.m0);
      d.p.cx = d.p.m[12]; d.p.cy = d.p.m[13]; d.p.cz = d.p.m[14];
      if (d.p.ob && d.ob) d.p.ob.x = d.ob.x + d.dir * LEAF * .92 * open;
    }
    for (const d of doorLamps) {
      const open = d.side === SIDES[here] && v > .92;
      d.p.color = open ? col.green : col.redL;
      d.p.glow = open ? .62 : .30;
    }
    if (v < 2e-3 || v > .998) doorMotion = 0;
    refreshScreens();
  }

  function refreshDisplay() {
    const shown = arrived ? here : next;
    const atDestination = arrived && here === destination;
    for (const n of routeNodes) {
      n.p.color = n.index === shown ? (arrived ? col.green : col.amber)
        : n.index === destination ? col.jadeL : col.white;
      n.p.glow = n.index === shown ? .58 : n.index === destination ? .34 : .18;
      n.p.alpha = 1;
    }
    for (const group of signGroups)
      group.forEach((name, i) => {
        for (const p of name) {
          p.m = i === shown ? p.m0 : PARKED;
          p.color = arrived ? col.green : col.lampT;
          p.cx = p.m[12]; p.cy = i === shown ? p.m[13] : -60; p.cz = p.m[14];
        }
      });
    for (const p of nextHeaders) p.alpha = arrived ? 0 : 1;
    for (const p of arrivedHeaders) p.alpha = arrived && !atDestination ? 1 : 0;
    for (const p of destinationHeaders) p.alpha = atDestination ? 1 : 0;
    for (const p of nextFrames) {
      p.color = arrived ? col.green : col.redL;
      p.glow = arrived ? .54 : .34;
    }
    for (const p of statusRails) {
      p.color = arrived ? col.green : col.red;
      p.glow = arrived ? .48 : .26;
    }
  }

  // Which station the map ring sits on, and which name the status panel is showing.
  function setStops(hereIdx, nextIdx) {
    here = hereIdx; next = nextIdx;
    displayCue = 1;
    for (const d of mapDots) {
      d.p.m = M.mul(M.trans(hereIdx * d.step, 0, 0), d.m0);
      d.p.cx = d.p.m[12];
    }
    refreshDisplay();
    refreshScreens();
  }

  function setArrived(on) {
    on = !!on;
    if (on !== arrived) displayCue = 1;
    arrived = on; refreshDisplay(); refreshScreens();
  }
  function setDestination(index) {
    const value = Number.isInteger(index) ? index : -1;
    if (value !== destination) displayCue = 1;
    destination = value; refreshDisplay();
  }

  // 0 stopped, 1 at line speed. Drives the tunnel, the straps and how lit it is outside.
  function setMotion(v) { motion = Math.max(0, Math.min(1, v)); }

  // The game calls every scene's tick as tick(seconds, player), so the step is worked out here
  // rather than taken as an argument. Clamped, because coming back to a backgrounded tab must
  // not teleport the tunnel a hundred metres in one frame.
  let lastT = 0;
  function tick(t) {
    const d = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
    // The tunnel slides past at up to nine metres a second and wraps on the lamp spacing, so
    // the same fourteen lamps serve the whole journey.
    scroll = (scroll + motion * 9.0 * d) % LAMP_STEP;
    // Outside is a platform when you are standing at one and a black tunnel when you are not.
    const want = 1 - motion;
    bright += (want - bright) * (1 - Math.exp(-d / .45));
    // Only one of the two can be out there at a time. They are built in the same slab of space
    // beyond the glass, and since a prop at alpha 0 still writes depth, leaving the unwanted one
    // in place at alpha 0 would blank the other one out. So the loser is parked, and each fades
    // across its own half of `bright`: the tunnel goes dark over the first half, the platform
    // lights up over the second. The window is briefly black in between, which is what the last
    // few metres of a tunnel mouth look like anyway.
    const onPlatform = bright >= .5;
    const tunnelA = Math.max(0, Math.min(1, (.5 - bright) * 2));
    const platA = Math.max(0, Math.min(1, (bright - .5) * 2));
    for (const p of tunnelProps) {
      p.m = onPlatform ? PARKED : M.mul(M.trans(-scroll, 0, 0), p.m0);
      p.cx = p.m[12];
      p.alpha = tunnelA;
    }
    for (const p of platformProps) {
      p.m = onPlatform ? p.m0 : PARKED;
      p.cx = p.m[12];
      p.alpha = platA * .96;
    }
    for (const names of platformNameGroups) names.forEach((name, i) => {
      for (const p of name) p.alpha = i === here ? platA * .98 : 0;
    });
    // The display stays legible and steady, then gives one short brightness lift when the shown
    // stop or arrival state changes. The old permanent sine pulse made an otherwise calm carriage
    // throb forever and conveyed no new state.
    displayCue = Math.max(0, displayCue - d * 1.35);
    const displayBoost = displayCue * .18;
    const shown = arrived ? here : next;
    const atDestination = arrived && here === destination;
    for (const n of routeNodes) if (n.index === shown) {
      n.p.alpha = 1;
      n.p.glow = .58 + displayBoost;
    }
    for (const group of signGroups) for (const p of group[shown]) {
      p.alpha = 1;
      p.glow = .58 + displayBoost;
    }
    for (const p of nextFrames) {
      p.alpha = 1; p.glow = (arrived ? .54 : .34) + displayBoost;
    }
    for (const p of nextHeaders) p.alpha = arrived ? 0 : 1;
    for (const p of arrivedHeaders) p.alpha = arrived && !atDestination ? 1 : 0;
    for (const p of destinationHeaders) p.alpha = atDestination ? 1 : 0;
    for (const p of statusRails) p.alpha = 1;

    // Door lamps communicate a real transition only: amber while opening, a red warning flash
    // while closing, green when clear, and a quiet red when sealed. The flash ends with the motion.
    for (const lamp of doorLamps) {
      const active = lamp.side === SIDES[here];
      if (!active) {
        lamp.p.color = col.redL; lamp.p.glow = .22;
      } else if (doorMotion < 0 && doorV > .002) {
        lamp.p.color = col.redL;
        lamp.p.glow = Math.floor(t * 8) % 2 ? .70 : .22;
      } else if (doorMotion > 0 && doorV < .998) {
        lamp.p.color = col.amber; lamp.p.glow = .48;
      } else if (doorV > .92) {
        lamp.p.color = col.green; lamp.p.glow = .62;
      } else {
        lamp.p.color = col.redL; lamp.p.glow = .30;
      }
    }
    // ---- the window, once the tunnel is dark behind it. `bright` is already the platform fading
    // in and out, so the mirror is simply the other side of that: nothing at a stop, and the ceiling
    // strip lying across the glass by the time the tunnel has taken over.
    const dark = 1 - bright;
    for (const p of mirrorProps) {
      p.alpha = dark * .30;
      p.glow = .10 + dark * .55;
    }

    // ---- 缺口 section gaps. Where two lengths of conductor rail meet, the shoe leaves one before it
    // reaches the next and for a fraction of a second the car is running on nothing at all: the
    // lights brown out, the fans wind down, and everything comes back. It is the most characteristic
    // thing about older stock and it is one multiplication.
    //
    // Counted in metres rather than seconds, so it happens as the gaps go past. On a timer it would
    // keep dipping while the train stood at a platform, which is the one place it cannot happen.
    dist += motion * 9.0 * d;
    const since = dist % 63;
    const sag = since < .40 ? 1 - .58 * Math.sin(since / .40 * Math.PI) : 1;

    // ---- and the dip that lasts the whole journey. Standing at a platform the car is on shore
    // supply with nothing to do; on the move the traction motors and the compressor are pulling
    // against the same shoe as the lights, and the whole interior sits a step darker for it. It is
    // subtle on purpose -- 16 per cent, and eased in over about a second and a half so it arrives
    // as the train pulls away rather than snapping the moment the wheels turn -- because the point
    // is that a stop feels bright by comparison, not that the carriage goes gloomy.
    //
    // On top of it, a slow unsteadiness while running: two frequencies that do not divide into each
    // other, so the light never settles into a pulse you could count.
    load += (motion - load) * (1 - Math.exp(-d / 1.5));
    const ripple = 1 - load * .030 * (.5 + .5 * Math.sin(t * 7.3 + Math.sin(t * 2.1) * 1.4));
    const lit = (1 - load * .16) * ripple * sag;
    for (const L of lightProps) L.p.glow = L.g * lit;
    for (const L of lightPools) L.g.a = L.a * lit;
    // The real lights go with them. These are the only things in the car that actually change what
    // a surface is lit by, so leaving them at full power through a section gap would have the
    // seats and the roof panels holding steady while every tube and every pool on the floor dipped
    // around them — the one reading that says "this is a rendering trick" rather than "the supply
    // just went away". The sag is deliberately not squared into `expose` below: that lever moves
    // the whole room at once, this one moves what is near a fitting, and a brownout is both.
    for (const L of carLights) L.l.power = L.p0 * lit;
    // The fittings and their pools are not enough on their own. There is no bounce in this
    // renderer -- an emissive prop does not light the surfaces around it -- and the tube is a
    // clipped white either way, so turning its glow down 16 per cent moved the measured ceiling
    // by nothing at all. The room's exposure is the only lever that reaches the walls, the seats
    // and the faces, so it takes the same dip. It is read fresh off the scene every frame by the
    // draw call, and the tick runs before it, so writing to it here is what the frame uses.
    api.expose = 1 - load * .11 - (1 - sag) * .16;

    // ---- and the lamps in the tunnel, which at nine metres a second are not lamps but streaks.
    // Stretching each one along the direction of travel is what a photograph of it would show, and
    // it is the cheapest motion blur there is: the same prop, scaled in its own x. Applied after the
    // loop above, because these are in tunnelProps too and this has to be the transform that wins.
    const streak = 1 + motion * motion * 7.0;
    if (!onPlatform) for (const p of streakProps) {
      p.m = M.mul(M.trans(-scroll, 0, 0), M.mul(p.m0, M.scale(streak, 1, 1)));
      p.cx = p.m[12];
    }

    // The straps swing, and only while there is something to swing them. Two frequencies so a
    // row of them never looks like one object: the car's sway, and each strap's own hang.
    const sway = motion * .085;
    for (const s of strapProps) {
      const a = Math.sin(t * 2.3 + s.phase) * sway + Math.sin(t * 1.31 + s.phase * 1.7) * sway * .5;
      const piv = M.mul(M.trans(s.x, s.y, s.z),
        M.mul(M.rotZ(a), M.trans(-s.x, -s.y, -s.z)));
      for (const p of s.props) {
        p.m = M.mul(piv, p.m0);
        p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      }
    }
  }

  // Underground: the daylight opening is a formality, kept tiny so the room shader has one and
  // the sun contributes nothing to a tunnel.
  const WIN = { x: 0, y: H - .1, z: -RZ, hw: .05, hh: .05 };

  // Straps pivot around the ceiling rail. Their centres move only a little, but their original
  // small spheres were packed before that pivot was applied; keep the full sway inside the bound.
  for (const s of strapProps) for (const p of s.props) reserveMover(p, .14);

  const api = B.finish({
    RX, RZ, H, WIN, SEATS, DOORX, SIDES, NAMES,
    setDoors, setMotion, setStops, setArrived, setDestination, tick,
    state: () => ({
      here, next, destination, doors: doorV, doorMotion, openSide: SIDES[here], motion, arrived,
      displayCue: +displayCue.toFixed(3),
      displayMode: arrived ? (here === destination ? 'destination' : 'arrived') : 'next',
      displayStation: NAMES[arrived ? here : next],
      screenVisible: arrived || doorV > 2e-3,
      screenStation: (arrived || doorV > 2e-3) ? NAMES[here] : null,
      screenRenderedStation: NAMES.find((_, i) =>
        tvStationGroups.length && tvStationGroups.every(group =>
          group[i].length && group[i].every(p => p.m === p.m0 && p.alpha > .5)
        )
      ) || null,
      physicalOpenSides: [-1, 1].filter(side => doorLeaves.some(d =>
        d.side === side && d.m0 && Math.abs(d.p.cx - d.m0[12]) > .10)),
    }),
    label: '车厢', labelK: '车厢 · on the train',
    // Cutaway on, like every other interior. A car is 3.2 m across and the camera sits further
    // back than that, so without it the near wall is between you and your own body and half the
    // screen is a grey panel.
    indoor: true, cutaway: true, near: .05, far: 46, expose: 1,
    // You get on through the middle vestibule looking down the long premium-carriage aisle.
    spawn: { x: DOORX[1], z: -.10, yaw: Math.PI / 2 },
    zones: [{ id: 'car', x0: -RX + .30, x1: RX - .30, z0: -SEATZ + .34, z1: SEATZ - .34,
              light: [0, H - .30, .20] }],
    roomAt() { return this.zones[0]; },
  });

  // After `finish`, so every prop is measured where it was built: the rest transform each mover
  // works from, and the parking slot for a station name that is not being shown.
  const PARKED = M.trs(0, -60, 0, 0, .001, .001, .001);
  for (const d of doorLeaves) { d.m0 = d.p.m; d.ob = d.p.ob && { ...d.p.ob }; }
  for (const s of strapProps) for (const p of s.props) p.m0 = p.m;
  for (const p of tunnelProps) p.m0 = p.m;
  // The platform needs a park matrix for the same reason the tunnel does: the two of them occupy
  // the same slab of space outside the window, and a prop at alpha 0 still writes depth, so
  // whichever one is not wanted has to leave rather than merely turn invisible.
  for (const p of platformProps) p.m0 = p.m;
  for (const d of mapDots) d.m0 = d.p.m;
  for (const group of signGroups) for (const name of group) for (const p of name) p.m0 = p.m;
  // Transparent glyph quads still write depth. Park every inactive TV label so the first
  // station's invisible geometry cannot hide the five station names drawn after it.
  for (const group of tvStationGroups)
    for (const name of group)
      for (const p of name) p.m0 = p.m;
  setStops(0, 1);
  setDoors(0);
  return api;
});
