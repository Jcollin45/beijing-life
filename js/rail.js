// 火车站 — the railway station's waiting hall, five stops down the line.
//
// A Chinese station is not a concourse you pass through, it is a room you are held in: rows of
// linked steel seats bolted to the floor, a departure board high on the wall that everybody in the
// room is watching, ticket windows down one side with a queue at two of them, the gates at the far
// end shut until twenty minutes before the train, and a shop selling instant noodles and phone
// chargers. The words it teaches are 火车票, 候车 and 检票.
//
// Same convention as every other interior: the one daylight opening is on the -z wall — here the
// tall glazed frontage over the entrance — and the way back to the subway is tagged 地铁站.
const Rail = Lazy('Rail', () => {
  // Every colour in here used to be a cool near-white within four points of every other, and the
  // hall came out as a white box with furniture standing in it. The regrade keeps the *values*
  // roughly where they were — one directional light, no bounce, so darkening the floor darkens
  // the whole room — and spends the change on hue instead: warm stone on the ground, warm plaster
  // on the walls, and a proper step of value between floor, wall and ceiling so the room has a
  // ground, a middle and a lid rather than one continuous fog.
  const col = {
    floor: C('#c2b9a8'), floorD: C('#a49a89'), grout: C('#8d8576'), band: C('#7b7365'),
    granite: C('#a79d8c'), inlay: C('#6f6759'), tactile: C('#cfa42c'),
    wall: C('#d7cfbf'), wallD: C('#bdb4a2'), wallT: C('#cac1af'),
    ceil: C('#ded7c7'), slab: C('#b4ab99'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), steelX: C('#5a6067'), chrome: C('#c6ccd0'),
    white: C('#f0eee7'), cream: C('#e6dfd0'), charcoal: C('#31363c'), black: C('#1b1e22'),
    red: C('#a8372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    jade: C('#3d7361'), jadeL: C('#5b9a83'), blue: C('#2f6392'), blueSign: C('#1f4f8f'),
    navy: C('#26354a'), yellow: C('#d9b02f'), orange: C('#cf7a2b'),
    seat: C('#41637d'), seatD: C('#2c485c'), seatS: C('#6d757c'), seatSD: C('#4a5056'),
    glass: C('#bed3e0'), tube: C('#f4f6ee'), board: C('#111820'), boardOn: C('#e8b34a'),
    wood: C('#8c6c47'), woodD: C('#5d4630'), lug: C('#3b4450'), lug2: C('#6d5a49'),
    leaf: C('#436d3e'), leafD: C('#2e5232'), pot: C('#8a7864'),
    ad1: C('#b8483c'), ad2: C('#2e6c8c'), ad3: C('#c08430'), ad4: C('#4a7a5e'),
    card: C('#9d7f5c'), weave: C('#c3ccd2'), weaveR: C('#b0483f'),
  };
  const G = { matte: .06, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .05 };
  // The tiling surface materials, read triplanar in world space (js/assets.js), one entry per
  // real surface the hall is built out of. `matScale` is the size of one repeat in metres and is
  // mostly set to what the thing actually is: a 30 cm tile in the toilet surround, .55 m on
  // machined steelwork, .34 m on the small stuff — a gate housing, a seat leg — where a metre-wide
  // repeat would put one smear across a whole part and read as a stain rather than a surface.
  //
  // Two of them are not the size of the thing, and both are noted where they are set: the floor,
  // whose repeat is six tiles wide and so is six times its slab, and the plaster, whose repeat is
  // chosen against the size of the blotches in the photograph rather than against the wall.
  //
  // `matAmt` is how far the texture may move the colour, and it is restrained on purpose. The
  // palette above is a deliberate regrade — warm stone on the ground, warm plaster on the walls,
  // a step of value between floor, wall and ceiling so the room has a ground, a middle and a lid.
  // The texture is here to stop those surfaces reading as painted card, not to repaint the hall
  // in whatever colour the photograph happened to be: past about .5 the stone goes grey, the
  // value steps close up, and the whole regrade is thrown away for some noise.
  //
  // Nothing emissive gets one. Every `mode: 1` surface in this room — the board, the ticker, the
  // gate lamps, the lightboxes, the battens, the glazing — is a thing that makes light rather
  // than a thing that has a surface, and a concrete grain over an LED matrix is just dirt.
  const MAT = {
    // The concourse floor is `tile` and not `paving`, which is not what the brief guessed and is
    // what the texture actually is: `paving` is PavingStones138, a mossy cobbled street, and at
    // any scale small enough to read as stone it puts green in the joints of an indoor hall. It
    // belongs outdoors. `tile` is Tiles141, a pale limestone slab in a 6 x 6 grid — which is a
    // Chinese station concourse exactly.
    //
    // 6.90 is chosen, not picked: the grid is six tiles to the repeat, so one tile comes out at
    // 1.15 m, and 1.15 m is already the spacing of the grout lines drawn over this floor below.
    // The texture reads from world position with no offset, so the photographed joints land on
    // the drawn ones instead of beating against them.
    floor:  { mat: 'tile',     matScale: 6.90, matAmt: .30 },
    // The border course is the same stone in a smaller format — 57 cm — the way a real floor is
    // laid, with a finer band framing the big slabs in the middle.
    border: { mat: 'tile',     matScale: 3.45, matAmt: .30 },
    // Plaster is the one material here whose scale is not the size of the thing it is on. The
    // photograph has metre-wide blotches in it, so a wall set to the 2.4 m sweep it would really
    // be painted in came out with three-metre clouds of damp across eighteen metres of concourse —
    // which is the same failure as too much `matAmt`, arriving by the other road. At .70 the same
    // blotches are the size of a hand and read as what they are: a trowelled finish.
    plast:  { mat: 'plaster',  matScale:  .70, matAmt: .28 },
    conc:   { mat: 'concrete', matScale: 1.40, matAmt: .30 },
    concF:  { mat: 'concrete', matScale:  .95, matAmt: .30 },
    metal:  { mat: 'metal',    matScale:  .55, matAmt: .34 },
    metalF: { mat: 'metal',    matScale:  .34, matAmt: .30 },
    steel:  { mat: 'steel',    matScale:  .60, matAmt: .36 },
    tile:   { mat: 'tile',     matScale:  .30, matAmt: .34 },
    wood:   { mat: 'wood',     matScale:  .80, matAmt: .34 },
  };
  // ---- and the correction that keeps the regrade.
  //
  // The shader does `base *= mix(1.0, texel / 0.22, matAmt)` (js/gl.js): the texture multiplies
  // the chosen colour rather than replacing it, normalised against mid grey. That is the right
  // design — it is what lets a wall stop being flat without ceasing to be the colour it was
  // picked to be — but it has a consequence that is invisible until the whole room has been
  // materialled at once: mid grey is 0.22 and almost none of these photographs average 0.22.
  //
  // Measured mean linear value of each of them:
  //
  //   metal  .954   plaster .511   tile    .601   concrete .482
  //   wood   .369   paving  .264   steel   .227   brick    .278
  //
  // So `metal` at matAmt .34 multiplies a surface by 2.14 and `concrete` by 1.36, while `paving`
  // and `steel` are near enough neutral. Applied to twenty surfaces at once that is not grain,
  // it is a global exposure lift: the first pass here took the hall's warm stone, warm plaster
  // and the deliberate step of value between floor, wall and ceiling and washed the lot out to
  // one pale grey — which looks exactly like matAmt being too high and cannot be fixed by
  // lowering it, because every value in the permitted .28–.50 band does it.
  //
  // The fix is to hand the shader a colour that is already darker by the factor it is about to
  // multiply by. `dim` does that, in linear space, so the rendered value lands where the palette
  // put it and the texture spends itself on what it is actually for: variation.
  // Those means already divided by 0.22 — i.e. the factor each texture multiplies by at matAmt 1.
  // All eleven are listed, not only the six this room uses, because the next surface added here
  // will want to look its material up rather than rediscover this.
  const MB = { paving: 1.20, plaster: 2.32, concrete: 2.19, metal: 4.34, steel: 1.03,
               tile: 2.73, wood: 1.68, brick: 1.26, asphalt: .37, fabric: 2.69, rooftile: .15 };
  const s2l = v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
  const l2s = v => v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055;
  const kOf = m => 1 + m.matAmt * ((MB[m.mat] === undefined ? 1 : MB[m.mat]) - 1);
  const dim = (c, m) => {
    const k = kOf(m);
    return k <= 1.02 ? c : c.map(v => Math.min(1, Math.max(0, l2s(s2l(v) / k))));
  };
  // The palette, once per material it is worn under. #d7cfbf under plaster and #d7cfbf under
  // concrete are not the same number, so they are not the same entry.
  const D = {
    floorT:  dim(col.floor,  MAT.floor),  granT:  dim(col.granite, MAT.border),
    inlayC:  dim(col.inlay,  MAT.concF),
    wallP:   dim(col.wall,   MAT.plast),  wallDP: dim(col.wallD,  MAT.plast),
    wallDC:  dim(col.wallD,  MAT.conc),   slabC:  dim(col.slab,   MAT.conc),
    slabCF:  dim(col.slab,   MAT.concF),  bandCF: dim(col.band,   MAT.concF),
    steelM:  dim(col.steel,  MAT.metal),  steelDM: dim(col.steelD, MAT.metal),
    steelXM: dim(col.steelX, MAT.metal),
    steelF:  dim(col.steel,  MAT.metalF), steelDF: dim(col.steelD, MAT.metalF),
    steelXF: dim(col.steelX, MAT.metalF), chromeF: dim(col.chrome, MAT.metalF),
    whiteT:  dim(col.white,  MAT.tile),
    woodW:   dim(col.wood,   MAT.wood),   woodDW: dim(col.woodD,  MAT.wood),
  };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, wall, flat, glyphs,
          solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 9.0, RZ = 7.0, H = 5.60;
  const WIN = { x: 0, y: 3.10, z: -RZ + .08, hw: 5.20, hh: 1.70 };
  const DX = -6.30;                       // the way out to the subway, in the -z wall
  const GATEZ = RZ - 1.10;                // the ticket gates, at the far end
  const OUT = { x: -11.4, z: -RZ + 3.20, yaw: 0 };   // unused; the metro sets where you arrive

  const litProps = [], boardRows = [];
  // The board's six lines, each holding its own departure and one set of state words per state it
  // could be in. Filled during the build, read every minute by `tick`.
  const rows = [];
  // The gate, and the pieces of it that have to move when it opens. `open` is what the rest of the
  // room reads to know whether anybody can go through.
  const gate = {
    open: false, visual: 0, lastT: 0, changedAt: -Infinity,
    flaps: [], lamps: [], portalLamps: [], shut: [], boarding: [], th: null,
  };
  // A fixed row of glyph quads becomes a marquee by changing the atlas character in each slot.
  // Nothing translates beyond the black aperture, so the ticker cannot spill out over the frame
  // and there is no moving cull centre to keep in step with it.
  const ticker = {
    text: [...'请按车次到检票口候车·请照看好随身行李·'], slots: [], step: -1,
  };
  const clock = { x: 0, y: 0, hour: null, min: null, mins: 0 };
  // A matrix that draws nothing: every vertex collapses onto one point, so the triangles have no
  // area and never reach the depth buffer. This is how a prop is put away without deleting it.
  const GONE = M.scale(0, 0, 0);
  function litten(p, k) { litProps.push({ p, k }); return p; }

  let seed = 0x5ea11c;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- parts
  // 座位 a run of linked seats: one steel beam on two legs with the pans hung off it. Bolted
  // down, in fours, facing the board — which is what everyone in the room is looking at.
  const seats = [];
  // `pan`/`panD` pick the upholstery: the blocks on one side are the blue vinyl the station was
  // fitted out with, and the blocks on the other are the perforated stainless every Chinese
  // station has been replacing it with, so the floor is not one colour of chair.
  //
  // These two arguments have existed since the run was written and nothing ever passed them, so
  // every one of the six blocks fell through to blue and `col.seatS`/`col.seatSD` sat in the
  // palette unused. They are passed now, in `build`.
  //
  // NOTHING in here may move a pan. `.sitcheck.js` measures every seated NPC against the nearest
  // pan within 65 cm and two passengers are sat on this furniture — the pan's centre and its
  // .45/.05 height are load-bearing numbers, not styling. Colour and material are free; the six
  // numbers in the three `box` calls below are not. Everything else added here is frame.
  function seatRun(cx, cz, ry, n, pan, panD) {
    const steely = !!pan;
    const T = { ry, tag: '座位' };
    const w = n * .56;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    pan = pan || col.seat; panD = panD || col.seatD;
    // The frame is machined steel and now says so. `metalF` and not `metal`: a seat leg is 11 cm
    // across and a .55 m repeat would lay a single smear down the whole of it.
    const F = { ...T, hard: true, gloss: G.metal, ...MAT.metalF };
    // No material on the pans, either kind. The blue is vinyl and vinyl is smooth; and Metal049A
    // is a near-white plate with faint scratches in it, so on a stainless pan it contributes a
    // batch and no visible grain — the perforation that would actually read is not in that
    // photograph. The two pans are told apart by colour and by the frame under them, which is
    // where the metal is worth paying for.
    const P = { ...T, hard: true, gloss: steely ? .38 : .30 };
    for (const s of [-1, 1]) {
      const lx = cx + cs * s * (w / 2 - .22), lz = cz - sn * s * (w / 2 - .22);
      box(lx, .21, lz, .11, .42, .46, D.steelDF, F);
      // A rubber foot and a floor plate. A steel leg that stops dead at the terrazzo is the one
      // detail that says a bench was dropped into the room rather than bolted into it.
      box(lx, .022, lz, .24, .045, .58, col.charcoal, { ...T, hard: true, gloss: .20 });
    }
    // A centre leg. Four seats on two legs sags in the eye even when the geometry does not.
    box(cx, .21, cz, .09, .42, .40, D.steelDF, F);
    box(cx, .40, cz, w, .08, .16, D.steelDF, F);
    // the stretcher across the back of the frame, under the pans
    box(cx, .25, cz - cs * .19, w - .28, .05, .05, D.steelXF, F);
    for (let i = 0; i < n; i++) {
      const o = -w / 2 + .28 + i * .56;
      const sx = cx + Math.cos(ry) * o, sz = cz - Math.sin(ry) * o;
      box(sx, .45, sz, .50, .05, .46, pan, P);
      box(sx, .68, sz - Math.cos(ry) * .22, .50, .44, .05, pan, { ...P, rx: -.16 });
      box(sx, .50, sz + Math.cos(ry) * .21, .50, .05, .05, panD,
        { ...T, hard: true, gloss: .28 });
      // Every one of them, not one of them. Twenty-four chairs were built and a single 座位 stood
      // in front of the second run on the left, so the other twenty-three were scenery in a room
      // that exists to be sat in. One thing per pan, the way the carriage does it.
      //
      // Facing, not -z. A run turned round to sit back-to-back with the one in front of it wants
      // the player stood on the side its occupants face, and `cz - .95` put them behind the
      // backrest of every reversed row.
      seats.push(thing('座位', sx, 1.00, sz, '在候车室的座位上等车。',
        'Wait for the train on a seat in the waiting hall.',
        '座位 seat. 候车 is to wait for a train; 候车室 the room you do it in.',
        { focus: [sx, sz - cs * .95], reach: 1.15 }));
    }
    // 扶手 an armrest on every division including the two ends. Without them a run of four reads
    // as one bench; with them it reads as the seating a station buys precisely so that nobody can
    // lie down across it, which is the truest thing about it.
    for (let i = 0; i <= n; i++) {
      const o = -w / 2 + i * .56;
      const ax = cx + cs * o, az = cz - sn * o;
      capsule(ax, .705, az - cs * .02, .024, .44, .024,
        col.chrome, { ...T, rx: Math.PI / 2, gloss: G.metal });
      capsule(ax, .575, az + cs * .19, .022, .26, .022, col.chrome, { ...T, gloss: G.metal });
    }
    solid(cx - w / 2 - .1, cx + w / 2 + .1, cz - .34, cz + .34);
    shade(cx, cz, w + .4, 1.0, .24);
  }

  // A piece of somebody's luggage, left at their feet. Three sizes, and the wheels are what stop
  // a suitcase reading as a cardboard box.
  function bag(cx, cz, kind, c) {
    if (kind === 0) {
      box(cx, .32, cz, .42, .62, .24, c, { gloss: .28, round: .07 });
      box(cx, .66, cz, .10, .10, .05, col.charcoal, { hard: true, gloss: .30 });
      capsule(cx, .78, cz, .020, .22, .020, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
      for (const s of [-1, 1])
        cyl(cx + s * .15, .03, cz + .08, .035, .04, col.black, { rz: Math.PI / 2, gloss: .26 });
    } else if (kind === 1) {
      box(cx, .20, cz, .56, .40, .34, c, { gloss: .24, round: .09 });
      capsule(cx, .42, cz, .018, .28, .018, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
    } else {
      cyl(cx, .26, cz, .19, .52, c, { gloss: .22 });
      box(cx, .52, cz, .30, .05, .22, col.charcoal, { hard: true, gloss: .26 });
    }
  }

  // 编织袋 the red-white-blue woven sack. Not luggage so much as the national container: it moves
  // bedding, tools, a whole kitchen and half of everybody's year. Nothing says the room is in
  // China faster than three of them stood against a bench, and a suitcase cannot do it.
  function sack(cx, cz, ry) {
    const T = { ry, gloss: .16 };
    box(cx, .30, cz, .56, .60, .38, col.weave, { ...T, round: .10 });
    for (const oy of [-.16, .02, .20])
      box(cx, .30 + oy, cz, .58, .07, .40, oy > 0 ? col.weaveR : col.blue,
        { ...T, hard: true, round: .06 });
    box(cx, .62, cz, .30, .07, .18, col.weave, { ...T, hard: true });
  }
  // A carton, tied. The other half of what people carry through a station.
  function carton(cx, cy, cz, s, ry) {
    box(cx, cy + s * .5, cz, s * 1.15, s, s * .95, col.card,
      { ry, hard: true, gloss: .12, round: .02 });
    box(cx, cy + s * 1.005, cz, s * 1.16, s * .02, s * .18, col.cream,
      { ry, hard: true, gloss: .10 });
  }
  // 绿植 a planter. Every Chinese public hall has these standing where a queue would otherwise
  // cut a corner, and they are the one soft thing in a room made entirely of steel and stone.
  function planter(px, pz, r = .40) {
    // Cast concrete, at a .55 m repeat so the aggregate reads on a pot 80 cm across.
    cyl(px, .30, pz, r, .60, dim(col.pot, MAT.concF),
      { gloss: .24, ...MAT.concF, matScale: .55 });
    cyl(px, .60, pz, r - .02, .05, C('#4b4238'), { gloss: .16 });
    cyl(px, .04, pz, r + .03, .08, D.steelDF, { gloss: G.metal, ...MAT.metalF });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, rr = (i % 3) * .16;
      ball(px + Math.cos(a) * rr, .80 + (i % 4) * .17, pz + Math.sin(a) * rr,
        .30, .25, .30, i & 1 ? col.leaf : col.leafD, { mode: 15 });
    }
    solid(px - r - .04, px + r + .04, pz - r - .04, pz + r + .04);
    shade(px, pz, r * 2.6, r * 2.6, .26);
  }
  // 隔离带 a belt post. `n` belts fan off it; each is one thin capsule to the next post along.
  function post(px, pz, top = 1.00) {
    cyl(px, top / 2, pz, .045, top, col.chrome, { gloss: G.metal });
    cyl(px, .035, pz, .17, .07, col.charcoal, { gloss: .26 });
    cyl(px, top + .02, pz, .055, .05, col.charcoal, { gloss: .30 });
  }
  function belt(x0, z0, x1, z1, y = .96, c) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    capsule((x0 + x1) / 2, y, (z0 + z1) / 2, .014, L, .014,
      c || col.charcoal, { rx: Math.PI / 2, ry: Math.atan2(dx, dz), gloss: .24 });
  }
  // 灯箱 a backlit poster. A station wall is never blank — it is sold. Emissive on purpose: this
  // one really is a lightbox, which is exactly the excuse `mode: 1` needs.
  function lightbox(ax, ay, az, w, h, c, yaw) {
    const d = yaw === 0 ? 1 : -1;              // which way the face is turned
    box(ax, ay, az, w + .14, h + .14, .14, col.charcoal, { hard: true, gloss: .32 });
    // .06 and not .11. At the glow this was written with, a 2 m panel of flat saturated colour in
    // a hall lit to near-white reads as a switched-on television rather than a printed poster with
    // a tube behind it, and four of them turned the walls into a bank of screens. A real 灯箱 is
    // only a little brighter than the wall it is screwed to.
    litten(box(ax, ay, az + d * .085, w, h, .03, c, { hard: true, mode: 1, glow: .06 }), .34);
    // Two printed bands across it, so the face is a poster and not a colour swatch. No lettering:
    // an advertisement is not a word this room is teaching, and a legible character on it would
    // read as signage the player is meant to act on.
    for (const [oy, hh, t] of [[h * .30, h * .055, .82], [-h * .07, h * .030, .55]])
      box(ax, ay + oy, az + d * .10, w * .74, hh, .02, C('#f2ece0'),
        { hard: true, mode: 1, glow: .04, alpha: t });
    box(ax, ay - h / 2 + .13, az + d * .10, w * .92, .18, .02, col.charcoal,
      { hard: true, mode: 1, glow: .02 });
    for (const s of [-1, 1])
      box(ax + s * (w / 2 + .05), ay, az + d * .07, .05, h + .12, .05, col.steel,
        { hard: true, gloss: G.metal });
  }
  // A batten under the slab ceiling. Two rows of these and the hall reads as public.
  //
  // Three things per batten, and they are not the same thing three times. The emissive strip is
  // what the fitting looks like; the `glow` decal is the pool it paints on the floor, which no
  // renderer without bounce will ever produce on its own; and the point light is the only one of
  // the three that actually lights anything. Until now this room had the first two and nothing
  // else — a hall lit entirely by the single overhead bulb nine metres from most of it, with six
  // bright strips on the ceiling that contributed no light to any surface in the building.
  //
  // One point per batten rather than one for the room. Six of them at a five-metre radius is what
  // makes a concourse read as evenly lit; one strong lamp in the middle makes a cave with a fire
  // in it, and that is exactly what the far corners looked like.
  function batten(cx, cz, len) {
    box(cx, H - .10, cz, len, .12, .28, col.steel, { hard: true, gloss: G.metal });
    litten(box(cx, H - .19, cz, len - .14, .05, .20, col.tube,
      { hard: true, mode: 1, glow: .46 }), .8);
    glow(M.trs(cx, .02, cz, 0, len + 2.4, 1, 3.6), C('#eef3f8'), .11);
    // Just under the tube, and the colour of it: col.tube is a barely-warm white and the light
    // coming off it has to be the same or the fitting and the pool under it disagree.
    B.light(cx, H - .34, cz, [0.98, 0.98, 0.94], .60, 5.0);
  }

  function build() {
    // ================================================================ shell
    // Big-format stone, 1.15 m to the slab, which is the size a concourse is actually laid in and
    // the size the grout grid drawn over it below already implies. Eighteen metres by fourteen of
    // one flat tone was the largest untextured surface in the game.
    flat(0, 0, 0, RX * 2, RZ * 2, D.floorT, { mode: 0, gloss: .46, ...MAT.floor });
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // The -x wall gets a little glow of its own. The room has one bulb, over the middle of the
    // floor nine metres away, and the ticket bay in front of that wall was reading as a cellar.
    for (const [x, y, z, w, h, yaw, lift] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI, 0], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2, .07],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2, 0], [0, H / 2, -RZ, RX * 2, H, 0, 0],
    ]) wall(x, y, z, w, h, yaw, D.wallP, { mode: 4, glow: lift, ...MAT.plast });
    // a dark band at the floor all round, and the joints in the terrazzo
    for (const [x, z, sx, sz] of [[0, RZ - .06, RX * 2, .11], [-RX + .06, 0, .11, RZ * 2],
                                  [RX - .06, 0, .11, RZ * 2], [0, -RZ + .06, RX * 2, .11]])
      box(x, .16, z, sx, .32, sz, D.bandCF, { hard: true, gloss: .26, ...MAT.concF });
    // A border of darker stone round the whole floor and two inlay strips down the length: the
    // floor of a Chinese station is laid out, not poured, and a plain field of one tone across
    // eighteen metres was the largest untouched surface in the room after the walls.
    for (const [x, z, sx, sz] of [[0, RZ - .60, RX * 2, 1.20], [0, -RZ + .60, RX * 2, 1.20],
                                  [-RX + .60, 0, 1.20, RZ * 2], [RX - .60, 0, 1.20, RZ * 2]])
      flat(x, .0015, z, sx, sz, D.granT, { mode: 9, gloss: .44, ...MAT.border });
    for (const ix of [-4.32, 4.32]) {
      flat(ix, .003, 0, .22, RZ * 2, col.inlay, { gloss: .44 });
      flat(ix, .0035, 0, .07, RZ * 2, col.floorD, { gloss: .40 });
    }
    for (let i = -8; i <= 8; i++) flat(i * 1.15, .004, 0, .04, RZ * 2, col.grout, { gloss: .10 });
    for (let i = -6; i <= 6; i++) flat(0, .004, i * 1.15, RX * 2, .04, col.grout, { gloss: .10 });
    // 盲道 the tactile guide path, running from the door to the gates. It is the one line on the
    // floor of a Chinese public building a foreigner can read without knowing a single character,
    // and no interior in this game had one.
    for (let i = 0; i < 42; i++) {
      const tz = -RZ + .42 + i * .28;
      if (tz > GATEZ - .95) break;
      box(0, .014, tz, .32, .028, .17, col.tactile, { hard: true, gloss: .26 });
    }
    box(0, .006, -.6, .40, .012, RZ * 2 - 1.6, C('#b9a06a'), { hard: true, gloss: .30 });
    // the coffered ceiling: two coffers with the battens in them
    for (const cz of [-3.2, 0, 3.2]) {
      box(0, H - .04, cz, RX * 2 - .8, .08, 2.30, D.slabC,
        { hard: true, gloss: .18, ...MAT.conc });
      for (const s of [-1, 1])
        box(0, H - .30, cz + s * 1.20, RX * 2 - .8, .60, .14, D.slabC,
          { hard: true, gloss: .18, ...MAT.conc });
    }
    // ---- 钢屋架 the roof trusses, in the four gaps the coffers leave.
    // A concourse is a shed with a good ceiling and this one was a plastered lid. Four trusses,
    // each a top and a bottom chord with the web zig-zagging between them, sitting on a corbel at
    // each wall. They cost nothing at eye level and they are most of what makes the hall read as
    // a building rather than a room.
    // Painted structural steel, at .55 m to the repeat — the chords are 11 and 13 cm deep, so the
    // grain runs along them rather than sitting as one blotch per member.
    const TR = { hard: true, gloss: G.metal, ...MAT.metal };
    for (const tz of [-5.60, -1.60, 1.60, 5.60]) {
      box(0, 5.30, tz, RX * 2 - .5, .11, .17, D.steelM, TR);
      box(0, 4.76, tz, RX * 2 - .5, .13, .21, D.steelM, TR);
      for (let i = -4; i <= 4; i++)
        box(i * 2.10, 5.03, tz, .085, .56, .11, D.steelDM, TR);
      for (let i = -4; i < 4; i++)
        box(i * 2.10 + 1.05, 5.03, tz, .07, 1.24, .07, D.steelDM,
          { ...TR, rz: (i & 1 ? 1 : -1) * 1.19 });
      for (const s of [-1, 1])
        box(s * (RX - .26), 4.99, tz, .38, .76, .40, D.slabCF,
          { hard: true, gloss: .20, ...MAT.concF });
    }
    // ---- 风管 the ducting, slung under the chords in the two bays the coffers do not fill.
    // The volume between the trusses and the ceiling was empty air, and a concourse of this size
    // is air-conditioned by something the size of a car. Corrugated galvanised steel, which is
    // exactly what `steel` is, and the one place in the room a coarse repeat is right: it is a
    // corrugation, and it wants to be legible as one from the floor five metres down.
    for (const dz2 of [-4.40, 4.40]) {
      box(0, 4.35, dz2, RX * 2 - 1.0, .36, .44, col.steelD,
        { hard: true, gloss: .40, ...MAT.steel });
      for (let i = -3; i <= 3; i++) {
        // The joint flange, which is the whole reason a duct reads as a duct and not a beam,
        // and the pair of straight drop rods up to the slab that hang it there. Their cylinder
        // ends sit inside the duct and ceiling, preserving the visible 14 mm shaft without
        // spending rounded capsule geometry on hidden joints.
        box(i * 2.40, 4.35, dz2, .06, .42, .50, col.steel, { hard: true, gloss: G.metal });
        for (const s of [-1, 1])
          cyl(i * 2.40, 4.96, dz2 + s * .21, .007, 1.30, col.steelX,
            { gloss: G.metal });
        // A diffuser between each pair: the grille the air actually comes out of.
        if (i === 3) continue;
        box(i * 2.40 + 1.20, 4.13, dz2, .46, .09, .34, D.steelF,
          { hard: true, gloss: G.metal, ...MAT.metalF });
        box(i * 2.40 + 1.20, 4.08, dz2, .38, .02, .26, col.steelX, { hard: true, gloss: .34 });
      }
    }
    // A cornice all round where the roof springs. Three metres of blank plaster above the signage
    // was the largest single surface in the room, and the known AO haze lives on exactly that kind
    // of surface — capping it is worth more than any amount of arguing with the shader.
    for (const [x, z, sx, sz] of [[0, RZ - .18, RX * 2, .36], [0, -RZ + .18, RX * 2, .36],
                                  [-RX + .18, 0, .36, RZ * 2], [RX - .18, 0, .36, RZ * 2]]) {
      box(x, 5.22, z, sx, .32, sz, D.slabC, { hard: true, gloss: .20, ...MAT.conc });
      box(x, 5.44, z, sx, .10, sz * 1.25, D.wallDP, { hard: true, gloss: .18, ...MAT.plast });
    }

    // ---- the frontage: a tall glazed wall over the entrance, which is where the daylight is
    box(0, .90, -RZ + .14, RX * 2, 1.80, .28, D.wallDC,
      { hard: true, gloss: G.paint, ...MAT.conc });
    box(0, 1.86, -RZ + .20, RX * 2, .12, .40, D.slabCF,
      { hard: true, gloss: .22, ...MAT.concF });
    box(0, 3.10, -RZ + .04, RX * 2 - .6, 2.60, .04, C('#c8d6e0'),
      { hard: true, mode: 1, glow: .18 });
    box(0, 2.24, -RZ + .035, RX * 2 - .6, .70, .04, C('#aeb5b4'),
      { hard: true, mode: 1, glow: .09 });
    for (const gx of [-6.4, -3.2, 0, 3.2, 6.4])
      box(gx, 3.10, -RZ + .08, 2.90, 2.50, .05, col.glass,
        { hard: true, mode: 1, alpha: .26, gloss: G.glass, glow: .06 });
    for (let i = -5; i <= 5; i++)
      box(i * 1.60, 3.10, -RZ + .13, .10, 2.60, .12, D.steelF,
        { hard: true, gloss: G.metal, ...MAT.metalF });
    box(0, 4.44, -RZ + .13, RX * 2, .14, .16, D.steelF,
      { hard: true, gloss: G.metal, ...MAT.metalF });
    box(0, 1.78, -RZ + .13, RX * 2, .14, .16, D.steelF,
      { hard: true, gloss: G.metal, ...MAT.metalF });

    // ================================================================ 地铁站 the way back down
    // A lift lobby in the corner with the subway's own sign over it: in a real station the two are
    // the same building, and you never go outside to change.
    const dz = -RZ + .16;
    box(DX, 1.40, dz + .10, 3.20, 2.80, .32, D.wallDP,
      { hard: true, gloss: G.paint, ...MAT.plast });
    box(DX, 1.30, dz, 2.60, 2.60, .10, col.charcoal, { tag: '地铁站', hard: true, gloss: .24 });
    litten(box(DX, 1.30, dz - .04, 2.30, 2.30, .04, C('#8a99a4'),
      { tag: '地铁站', hard: true, mode: 1, glow: .10 }), .3);
    for (let i = 0; i < 5; i++)
      box(DX, .12 + i * .17, dz - .10 - i * .26, 2.20, .17, .28, D.slabCF,
        { tag: '地铁站', hard: true, gloss: .20, ...MAT.concF });
    for (const s of [-1, 1])
      box(DX + s * 1.42, 1.40, dz + .02, .22, 2.80, .38, D.wallDP,
        { hard: true, gloss: G.paint, ...MAT.plast });
    box(DX, 2.94, dz + .06, 2.90, .40, .12, col.blueSign,
      { tag: '地铁站', hard: true, gloss: .26 });
    // Read from inside the hall, so off the +z face of the board and facing +z. At yaw π on the
    // far side of it the whole sign was lettered into the wall behind.
    for (const g of glyphs(DX + .38, 2.94, dz + .13, 0, '地铁站',
        { size: .21, gap: .06, color: col.white, mode: 1, tag: '地铁站' })) litten(g, .9);
    // rx, not rz: about z the disc stands on edge and the roundel reads as a white bar.
    cyl(DX - 1.02, 2.94, dz + .13, .155, .03, col.white,
      { tag: '地铁站', rx: Math.PI / 2, mode: 1, gloss: .20 });
    for (const g of glyphs(DX - 1.02, 2.94, dz + .16, 0, '地',
        { size: .18, gap: 0, color: col.blueSign, mode: 1, tag: '地铁站' })) litten(g, .5);
    solid(DX - 1.60, DX + 1.60, -RZ, dz + .34);
    thing('地铁站', DX, 3.34, dz + .60, '换乘地铁，往下走。',
      'Change for the subway — down the escalator.',
      '换乘 to change lines. The station and the subway are the same building.',
      { focus: [DX, dz + 1.90], reach: 2.4 }).station = '火车站';

    // ================================================================ 电子屏 the departure board
    // High on the far wall where the whole room can see it, and the whole room is watching it.
    // Six services with a number, a destination, a time and a state, and the state is the only
    // thing anybody cares about.
    const bx = 2.0, by = 3.90;
    // The mounting frame the board hangs off, which is most of why it now reads as a fixture
    // bolted to a wall rather than a black rectangle painted on one. The frame takes the steel
    // grain; nothing inboard of it does. The matrix, the ticker and every glyph on both are
    // `mode: 1` and are meant to be flat and bright — they are the point of this room, and a
    // texture over an LED panel is a smear on a screen.
    const BF = { hard: true, gloss: G.metal, ...MAT.metal };
    box(bx, by, RZ - .04, 8.10, 2.36, .10, D.steelXM, BF);
    for (const s of [-1, 1]) {
      box(bx + s * 4.00, by, RZ - .16, .14, 2.36, .30, D.steelM, BF);
      box(bx, by + s * 1.13, RZ - .16, 8.10, .12, .30, D.steelM, BF);
    }
    box(bx, by, RZ - .10, 7.60, 2.10, .14, col.charcoal, { tag: '电子屏', hard: true, gloss: .28 });
    litten(box(bx, by, RZ - .18, 7.30, 1.86, .04, col.board,
      { tag: '电子屏', hard: true, mode: 1, glow: .06 }), .4);
    // Six services, spread across the whole day rather than bunched into one morning hour, because
    // the state column is live now and a board whose every train left before lunch is a poster. The
    // fourth number is the departure in minutes past midnight — the same clock the game runs on —
    // and the fifth is how many minutes late it is running. D712 is always late. Somebody's is.
    const TRAINS = [
      ['G101', '上海', '07:15', 435, 0],
      ['G233', '南京', '09:40', 580, 0],
      ['K589', '西安', '12:05', 725, 0],
      ['D712', '天津', '14:18', 858, 25],
      ['G415', '广州', '17:50', 1070, 0],
      ['K177', '成都', '21:26', 1286, 0],
    ];
    // Every state each row can be in, all built at the same spot and all but one held at zero
    // alpha. Glyphs are geometry: there is no way to rewrite the text on a prop once it is built,
    // so a live board is a stack of every word it might say with one of them switched on. Five
    // words times six rows is ninety-odd quads that mostly never draw, which is the cheap half of
    // the trade — the expensive half would be rebuilding the scene every minute.
    const STATES = [['正点', col.boardOn], ['晚点', C('#e07a4a')],
                    ['正在检票', C('#7fe0a4')], ['停止检票', C('#e0d24a')],
                    ['已开', C('#5d6b78')]];
    // The board faces -z, and a viewer looking that way sees +x on their left, so the columns run
    // from the largest x down: 车次 first on the left, 状态 last, the way a real one reads.
    const TCX = [2.70, .90, -.90, -2.80];
    TRAINS.forEach(([no, to, at, dep, late], i) => {
      const y = by + .74 - i * .30;
      const row = { no, to, at, dep: dep + late, late, st: -1, words: [], line: [] };
      row.line.push(
        ...glyphs(bx + TCX[0], y, RZ - .21, Math.PI, no,
          { size: .15, gap: -.055, color: col.boardOn, mode: 1, tag: '电子屏' }),
        ...glyphs(bx + TCX[1], y, RZ - .21, Math.PI, to,
          { size: .16, gap: .04, color: col.white, mode: 1, tag: '电子屏' }),
        ...glyphs(bx + TCX[2], y, RZ - .21, Math.PI, at,
          { size: .15, gap: -.048, color: col.boardOn, mode: 1, tag: '电子屏' }));
      for (const [txt, c] of STATES) {
        const w = glyphs(bx + TCX[3], y, RZ - .21, Math.PI, txt,
          { size: .14, gap: .03, color: c, mode: 1, tag: '电子屏' });
        // Zero alpha for the first frame, and then `tick` takes over and hides the four it does
        // not want by collapsing their matrices instead.
        //
        // Alpha alone is not enough: all five words sit on the same four centimetres of board,
        // exactly coplanar, and a glyph held at zero alpha still draws and still writes depth. The
        // four invisible ones were winning the depth test against the one meant to show, so the
        // column came out with 正点 crisp and 晚点 and 已开 as orange slivers where a stroke happened
        // to stick out past a quad in front of it.
        //
        // The matrix is not stashed here, though. `tick` captures it the first time it runs. Doing
        // both in one line at build time — save the matrix, then overwrite it — means that if the
        // saved value is ever not what was expected, the real one is gone and unrecoverable, and
        // what you get is a board with no state column at all and no clue why.
        for (const g of w) g.alpha = 0;
        row.words.push(w);
      }
      boardRows.push(...row.line);
      rows.push(row);
    });
    ['车次', '终点', '开点', '状态'].forEach((h, i) =>
      glyphs(bx + TCX[i], by + 1.02, RZ - .21, Math.PI, h,
        { size: .12, gap: .03, color: C('#8fa2b4'), mode: 1, tag: '电子屏' }));
    // The running red ticker under the board. Every board in China has one and it is always
    // saying the same thing, which is why it is worth having: the player reads it once, and after
    // that it is furniture that happens to be made of characters they now know.
    box(bx, 2.68, RZ - .10, 7.60, .30, .14, col.charcoal, { hard: true, gloss: .28 });
    litten(box(bx, 2.68, RZ - .18, 7.34, .22, .04, col.black,
      { hard: true, mode: 1, glow: .05 }), .3);
    ticker.slots = glyphs(bx, 2.68, RZ - .21, Math.PI, ticker.text.join(''),
      { size: .125, gap: .032, color: C('#e2553a'), mode: 1 });
    for (const g of ticker.slots) litten(g, .6);
    thing('电子屏', bx, by - 1.30, RZ - .30, '电子屏上写着车次和开点。',
      'The board shows the train numbers and departure times.',
      '电子 electronic + 屏 screen. 正点 on time, 晚点 delayed.',
      { focus: [bx, RZ - 3.4], reach: 3.6 });

    // ================================================================ 检票口 the gates
    // Two channels under the board, shut, with the guard's lectern beside them and the queue rails
    // fanning back into the room. Shut is the point of them: everybody is waiting because of this.
    // A plinth of dark granite the whole line stands on, so the pedestals grow out of the floor.
    // Polished dark granite, so it takes the concrete grain and not the floor's limestone: the
    // plinth is a different stone from the slabs it is set into, which is the whole point of it.
    box(bx, .035, GATEZ, 5.00, .07, 1.10, D.inlayC,
      { hard: true, gloss: .40, ...MAT.concF });
    // Three pedestals, not two. Two pedestals 3.2 m apart is not a gate line, it is two filing
    // cabinets with a corridor between them, and that is exactly what it looked like.
    //
    // The housing and its brushed side panels are the fine metal, not the coarse one: a gate is
    // 34 cm across the top and the .55 m repeat put less than one tile on it, which is a stain.
    const GM = { tag: '检票口', hard: true, gloss: G.metal, ...MAT.metalF };
    for (const gx of [bx - 1.60, bx, bx + 1.60]) {
      box(gx, .52, GATEZ, .34, 1.04, .90, D.steelDF, GM);
      // A brushed panel let into each side, and the black rubber nose the trolleys knock into.
      for (const s of [-1, 1])
        box(gx + s * .175, .60, GATEZ, .02, .74, .74, D.chromeF, GM);
      box(gx, .10, GATEZ, .37, .16, .93, col.charcoal,
        { tag: '检票口', hard: true, gloss: .22 });
      box(gx, 1.06, GATEZ, .38, .06, .94, D.chromeF, GM);
      // The reader you tap the ticket on, canted up towards whoever is walking at it.
      box(gx, 1.14, GATEZ - .26, .30, .06, .30, col.charcoal,
        { tag: '检票口', hard: true, rx: -.30, gloss: .26 });
      litten(box(gx, 1.17, GATEZ - .27, .21, .02, .21, C('#7fc9e8'),
        { tag: '检票口', hard: true, rx: -.30, mode: 1, glow: .16 }), .4);
      // The lamp on the top face and the strip on the face you walk at. Both were one flat plate
      // buried at y = .74 *inside* the housing, so the single prop in this room that tells you
      // whether you may board has never once been visible. `tick` only ever sets their colour.
      gate.lamps.push(box(gx, 1.13, GATEZ + .26, .22, .04, .26, col.yellow,
        { tag: '检票口', hard: true, mode: 1, glow: .18 }));
      gate.lamps.push(box(gx, .82, GATEZ - .455, .22, .18, .02, col.yellow,
        { tag: '检票口', hard: true, mode: 1, glow: .16 }));
    }
    // The glass wings at the two ends of the line. Shut is where they start and where they spend
    // most of the day; `tick` swings them out of the way when boarding is called.
    for (const s of [-1, 1]) {
      const gx = bx + s * 1.60;
      const fx = gx + s * .42;
      const fl = box(fx, .62, GATEZ, .05, .70, .84, col.glass,
        { tag: '检票口', hard: true, mode: 1, alpha: .38, gloss: G.glass,
          // `finish` packs cull bounds once. Reserve the whole swept wing now rather than relying
          // on the later matrix writes to move a packed centre that cannot move.
          fixed: true, cx: fx, cy: .62, cz: GATEZ, r: .64 });
      gate.flaps.push({ p: fl, m0: fl.m, x: gx + s * .42, s });
    }
    // The wall behind the line, up to head height with a capping band, and the two piers that turn
    // it from a partition into a gate mouth.
    box(bx, 1.28, GATEZ + .70, 4.20, 2.56, .30, D.wallDP,
      { hard: true, gloss: G.paint, ...MAT.plast });
    // Two shallow platform-passage portals over the partition face. The gate line is a visual
    // boundary rather than a second playable room, so its collider remains exactly where it was;
    // opening the glass must nevertheless reveal a credible continuation, not plaster at arm's
    // length. Dark reveals, converging rails and receding ceiling bars provide that continuation
    // in a few centimetres of depth without pretending there is walkable space behind the wall.
    const portalZ = GATEZ + .535;
    for (const [q, no] of [[-1, '1'], [1, '2']]) {
      const px = bx + q * .80;
      box(px, 1.22, portalZ, 1.18, 2.20, .025, C('#15222b'),
        { tag: '检票口', hard: true, mode: 1, glow: .025 });
      // A distant, cooler end wall and a floor lane establish depth before detail.
      box(px, 1.24, portalZ - .018, .48, 1.34, .010, C('#263945'),
        { hard: true, mode: 1, glow: .055 });
      box(px, .28, portalZ - .025, .92, .34, .010, C('#53616a'),
        { hard: true, mode: 1, glow: .04 });
      for (const s of [-1, 1])
        box(px + s * .43, .93, portalZ - .035, .028, 1.52, .010, D.chromeF,
          { hard: true, mode: 1, glow: .05, rz: -s * .10 });
      // Three diminishing ceiling bars read as fixtures receding down the boarding corridor.
      for (let i = 0; i < 3; i++) {
        const lamp = box(px, 1.97 - i * .27, portalZ - .040 - i * .004,
          .78 - i * .18, .035, .009, col.tube,
          { hard: true, mode: 1, glow: .18 + i * .03 });
        gate.portalLamps.push(lamp);
      }
      box(px, 2.23, portalZ - .045, .70, .20, .010, col.navy,
        { hard: true, mode: 1, glow: .08 });
      glyphs(px, 2.23, portalZ - .052, Math.PI, no + '站台',
        { size: .10, gap: .025, color: col.white, mode: 1, glow: .18, lift: .004 });
      // Steel jambs keep the painted opening attached to the architecture around it.
      for (const s of [-1, 1])
        box(px + s * .61, 1.22, portalZ - .055, .055, 2.28, .06, D.steelDF,
          { hard: true, gloss: G.metal, ...MAT.metalF });
    }
    box(bx, 2.64, GATEZ + .66, 4.34, .18, .38, D.slabCF, { hard: true, gloss: .22, ...MAT.concF });
    box(bx, .16, GATEZ + .68, 4.24, .32, .34, D.bandCF, { hard: true, gloss: .26, ...MAT.concF });
    for (const s of [-1, 1]) {
      const px = bx + s * 2.28;
      box(px, 1.32, GATEZ + .50, .36, 2.64, .74, D.slabCF,
        { hard: true, gloss: .22, ...MAT.concF });
      box(px, 1.32, GATEZ + .12, .30, 2.30, .04, D.chromeF,
        { hard: true, gloss: G.metal, ...MAT.metalF });
      box(px, 2.72, GATEZ + .50, .46, .20, .84, D.steelXM,
        { hard: true, gloss: G.metal, ...MAT.metal });
      solid(px - .22, px + .22, GATEZ + .10, RZ);
    }
    box(bx, 2.36, GATEZ + .55, 3.60, .42, .12, col.jade, { hard: true, gloss: .24 });
    glyphs(bx, 2.36, GATEZ + .48, Math.PI, '检票口',
      { size: .20, gap: .07, color: col.white, mode: 1 });
    // The two channel numbers, over the mouth each one belongs to.
    for (const [nx, no] of [[bx - .80, '1'], [bx + .80, '2']]) {
      box(nx, 2.36, GATEZ + .48, .30, .30, .04, C('#12352c'), { hard: true, gloss: .20 });
      for (const g of glyphs(nx, 2.36, GATEZ + .45, Math.PI, no,
          { size: .22, gap: 0, color: col.goldL, mode: 1 })) litten(g, .8);
    }
    litten(box(bx, 1.90, GATEZ + .52, 1.90, .30, .06, col.charcoal,
      { hard: true, mode: 1, glow: .06 }), .3);
    // What the strip under the header says. Both are built; `tick` shows one. Until now it said
    // 停止检票 for ever, on a gate that was shut for ever, in a room whose entire purpose is
    // waiting for it to open.
    gate.shut = glyphs(bx, 1.90, GATEZ + .48, Math.PI, '停止检票',
      { size: .14, gap: .04, color: C('#e07a4a'), mode: 1 });
    gate.boarding = glyphs(bx, 1.90, GATEZ + .48, Math.PI, '正在检票',
      { size: .14, gap: .04, color: C('#7fe0a4'), mode: 1 });
    // Hidden until it is true. Both strings sit on the same six centimetres of sign, so whichever
    // one is not being said has to be switched off before the first frame rather than on it.
    for (const g of gate.boarding) g.alpha = 0;
    // the lectern, and the rails that make you queue
    box(bx - 2.70, .55, GATEZ - .10, .70, 1.10, .50, D.woodW,
      { hard: true, gloss: G.wood, ...MAT.wood });
    box(bx - 2.70, 1.12, GATEZ - .10, .78, .06, .58, D.woodDW,
      { hard: true, gloss: G.wood, ...MAT.wood });
    for (let i = 0; i < 4; i++) {
      const rz2 = GATEZ - .9 - i * 1.05;
      for (const s of [-1, 1]) {
        cyl(bx + s * 1.10, .50, rz2, .07, 1.00, D.steelDF, { gloss: G.metal, ...MAT.metalF });
        cyl(bx + s * 1.10, .04, rz2, .17, .07, col.charcoal, { gloss: .28 });
        if (i < 3)
          capsule(bx + s * 1.10, .96, rz2 - .52, .015, 1.05, .015, col.charcoal,
            { rx: Math.PI / 2, gloss: .24 });
      }
    }
    // The eighth light, over the gate mouth. A Chinese gate line is always the brightest strip of
    // floor in the building — it is where a guard has to read a ticket and a face — and the whole
    // room is pointed at it. Cooler than the hall battens, because that is how those downlights
    // are specified, and short-radius so it stays a pool over the line rather than a second sun.
    B.light(bx, 3.05, GATEZ - .28, [0.94, 0.98, 1.00], .78, 3.6);
    solid(bx - 3.15, bx + 2.20, GATEZ - .55, RZ);
    gate.th = thing('检票口', bx, 1.60, GATEZ - .60, '还没开始检票，再等等。',
      'They have not started checking tickets yet. A bit longer.',
      '检 to inspect + 票 ticket + 口 opening. 检票 is to have your ticket checked.',
      { focus: [bx, GATEZ - 2.1], reach: 2.4 });

    // ================================================================ 售票窗口 the ticket windows
    // Four of them down the -x wall behind a stone counter, two shut, with the fare notice over
    // the top and a slot under each pane.
    const wx = -RX + .30;
    box(wx + .10, 1.55, 1.0, .60, 3.10, 8.60, D.wallP,
      { hard: true, gloss: G.paint, glow: .06, ...MAT.plast });
    box(wx + .48, .55, 1.0, .40, 1.10, 8.20, D.slabCF,
      { tag: '售票窗口', hard: true, gloss: G.matte, glow: .05, ...MAT.concF });
    box(wx + .52, 1.13, 1.0, .52, .06, 8.30, D.bandCF,
      { tag: '售票窗口', hard: true, gloss: .24, ...MAT.concF });
    for (let i = 0; i < 4; i++) {
      const z2 = -2.1 + i * 2.1;
      box(wx + .42, 1.80, z2, .07, 1.10, 1.40, col.glass,
        { tag: '售票窗口', hard: true, mode: 1, alpha: .30, gloss: G.glass });
      box(wx + .44, 1.20, z2, .10, .06, 1.44, D.chromeF,
        { tag: '售票窗口', hard: true, gloss: G.metal, ...MAT.metalF });
      box(wx + .40, 1.24, z2, .02, .04, .28, col.black,
        { tag: '售票窗口', hard: true, gloss: .26 });
      // the number over each window, and the two that are shut
      const shut = i === 0 || i === 3;
      box(wx + .40, 2.52, z2, .04, .34, .58, shut ? col.charcoal : col.jade,
        { tag: '售票窗口', hard: true, gloss: .24 });
      litten(glyphs(wx + .44, 2.52, z2, Math.PI / 2, String(i + 1),
        { size: .20, gap: 0, color: col.white, mode: 1, tag: '售票窗口' })[0], shut ? 0 : .6);
      if (shut) {
        box(wx + .38, 1.80, z2, .03, .60, 1.30, col.cream,
          { tag: '售票窗口', hard: true, gloss: .18 });
        glyphs(wx + .41, 1.80, z2, Math.PI / 2, '暂停',
          { size: .15, gap: .05, color: col.redD, mode: 1, tag: '售票窗口' });
      }
    }
    box(wx + .40, 3.10, 1.0, .05, .50, 3.40, col.blueSign,
      { tag: '售票窗口', hard: true, gloss: .24 });
    for (const g of glyphs(wx + .44, 3.10, 1.0, Math.PI / 2, '售票处',
        { size: .26, gap: .09, color: col.white, mode: 1, tag: '售票窗口' })) litten(g, .9);
    // A batten of its own down the ticket bay. The room light hangs 9 m away over the middle of the
    // floor, which left the whole counter reading as a cellar.
    box(wx + 1.30, H - .10, 1.0, .26, .12, 8.20, D.steelF,
      { hard: true, gloss: G.metal, ...MAT.metalF });
    litten(box(wx + 1.30, H - .19, 1.0, .19, .05, 8.00, col.tube,
      { hard: true, mode: 1, glow: .46 }), .8);
    glow(M.trs(wx + 1.10, .02, 1.0, 0, 4.0, 1, 10.4), C('#eef3f8'), .13);
    // And the light that batten is actually giving off, which is the seventh of the room's eight.
    // It sits out from the wall rather than on it: a point light inside the plaster lights the
    // counter's top edge and nothing else, and the queue stands on this side of it.
    B.light(wx + 1.40, H - .40, 1.0, [0.98, 0.98, 0.94], .70, 4.8);
    solid(-RX, wx + .80, -3.4, 5.4);
    thing('售票窗口', wx + .90, 1.90, -2.1, '在窗口买一张火车票。',
      'Buy a train ticket at the window.',
      '售票 ticket sales + 窗口 window. 一张火车票 — one train ticket.',
      { focus: [wx + 2.0, -2.1], reach: 2.2 });

    // ================================================================ 座位 the waiting seats
    // Six runs of four, all facing the board, with the aisle down the middle that everyone stands
    // in anyway. This is what the room is: a floor of seats and a screen to watch.
    // The two arguments `seatRun` has always taken and nothing ever passed. The -x block keeps
    // the blue vinyl the hall was fitted out with; the +x block — the one on your left as you
    // walk in from the subway lobby and face the board — is the perforated stainless every
    // Chinese station has been replacing that vinyl with since about 2010. Two generations of
    // seating in one room is what a station actually looks like, and it costs one argument.
    for (let r = 0; r < 3; r++) {
      seatRun(-2.6, -3.0 + r * 2.3, 0, 4);
      seatRun(2.6, -3.0 + r * 2.3, 0, 4, col.seatS, col.seatSD);
    }
    // the luggage at people's feet, and a trolley left against the wall
    bag(-3.9, -2.4, 0, col.lug); bag(-1.4, -.2, 1, col.lug2);
    bag(3.9, -2.2, 2, C('#7a3f3a')); bag(1.5, 2.1, 0, C('#3f5a4a'));
    bag(4.1, 2.3, 1, col.lug); bag(-4.1, 2.0, 2, C('#5a5148'));
    // 编织袋 and the cartons. `sack` and `carton` have been written and commented in this file
    // since it was made and were never once called, which is how a Chinese waiting hall ended up
    // furnished entirely with wheeled suitcases. The comment on `sack` is right: the red-white-
    // blue woven bag is the national container and nothing else in the room says the country as
    // fast, so three of them stand against the benches where their owners left them.
    sack(-4.32, -3.22, .22); sack(-1.06, 1.98, -.35); sack(4.28, 1.18, .48);
    carton(1.42, 0, -5.06, .42, .28);
    carton(1.42, .42, -5.06, .30, -.19);
    carton(-4.62, 0, 2.44, .36, .13);
    for (const s of [-1, 1])
      cyl(RX - .70 + s * .0, .30, -4.4 + s * .3, .022, .60, col.steelD,
        { gloss: G.metal, rx: -.2 });
    box(RX - .72, .06, -4.4, .50, .06, .40, col.steelD, { hard: true, gloss: G.metal });

    // ================================================================ 小卖部 the shop
    // A kiosk in the corner selling the three things anybody buys in a station: instant noodles,
    // bottled water and a phone charger. Shuttered top and bottom, lit inside.
    const kx = RX - 2.10, kz = 3.60;
    box(kx, 1.30, kz, 3.60, 2.60, 2.20, D.wallDP,
      { hard: true, gloss: G.paint, ...MAT.plast });
    box(kx, .62, kz - 1.14, 3.20, 1.24, .12, D.slabCF,
      { tag: '小卖部', hard: true, gloss: .24, ...MAT.concF });
    box(kx, 1.28, kz - 1.16, 3.20, .08, .18, D.chromeF,
      { tag: '小卖部', hard: true, gloss: G.metal, ...MAT.metalF });
    // Keep the warm interior luminous without clipping it to a featureless white panel; at .30
    // the bottle and noodle silhouettes in front of it disappeared in the C2-board review view.
    litten(box(kx, 1.90, kz - 1.10, 3.00, 1.10, .06, C('#ffe9c0'),
      { tag: '小卖部', hard: true, mode: 1, glow: .12 }), .8);
    // Stock belongs in front of the luminous backing. It used to sit 8 cm behind the opaque
    // panel, so lowering the glow alone could never reveal it from the waiting hall.
    for (let i = 0; i < 12; i++)
      cyl(kx - 1.30 + (i % 6) * .52, 1.42 + ((i / 6) | 0) * .46, kz - 1.20, .10, .17,
        pick([col.red, col.gold, col.orange, col.jade]),
        { tag: '小卖部', gloss: .26 });
    box(kx, 2.62, kz - 1.16, 3.40, .44, .14, col.red, { tag: '小卖部', hard: true, gloss: .22 });
    for (const g of glyphs(kx, 2.62, kz - 1.24, Math.PI, '小卖部',
        { size: .22, gap: .08, color: col.goldL, mode: 1, tag: '小卖部' })) litten(g, .9);
    solid(kx - 1.9, RX, kz - 1.3, RZ);
    thing('小卖部', kx, 1.70, kz - 1.50, '小卖部有方便面和水。',
      'The kiosk has instant noodles and water.',
      '小卖部 — the little sales department. Every station and factory has one.',
      { focus: [kx, kz - 2.6], reach: 2.2 });

    // ================================================================ 洗手间 the toilets
    // Against the +x wall, which was nine metres of blank plaster. A waiting room is somewhere you
    // are held for an hour with a bag; the one facility nobody can do without was the one facility
    // it did not have. Two doors in a tiled surround with the pictograms over them, and the corridor
    // between them going nowhere the player can follow — the room behind it is not modelled, and a
    // door that plainly leads somewhere is enough.
    const tx = RX - .30, tz = -1.20;
    box(tx + .10, 1.55, tz, .60, 3.10, 3.60, D.wallP,
      { hard: true, gloss: G.paint, ...MAT.plast });
    // The tiled surround the comment above has always claimed and the geometry never showed: a
    // 30 cm wall tile, which is the size the whole country lines a public washroom in.
    box(tx - .22, 1.20, tz, .06, 2.40, 3.40, D.whiteT,
      { hard: true, gloss: .30, ...MAT.tile });
    for (const [oz, w] of [[-.95, '男'], [.95, '女']]) {
      box(tx - .26, 1.05, tz + oz, .05, 2.10, 1.00, col.charcoal, { hard: true, gloss: .26 });
      box(tx - .30, 1.05, tz + oz, .04, 2.00, .90, D.steelDF,
        { tag: '洗手间', hard: true, gloss: G.metal, ...MAT.metalF });
      box(tx - .34, 1.10, tz + oz, .03, .30, .26, col.jade,
        { tag: '洗手间', hard: true, mode: 1, glow: .10 });
      glyphs(tx - .36, 1.10, tz + oz, -Math.PI / 2, w,
        { size: .18, gap: .04, color: col.white, mode: 1, tag: '洗手间' });
    }
    box(tx - .28, 2.42, tz, .10, .40, 1.70, col.jade, { hard: true, gloss: .24 });
    for (const g of glyphs(tx - .35, 2.42, tz, -Math.PI / 2, '洗手间',
        { size: .19, gap: .07, color: col.white, mode: 1, tag: '洗手间' })) litten(g, .6);
    solid(tx - .40, RX, tz - 1.85, tz + 1.85);
    thing('洗手间', tx - .50, 1.60, tz, '洗手间在那边。', 'The toilets are over there.',
      '洗 wash + 手 hand + 间 room. 厕所 is the blunter word for the same door.',
      { focus: [tx - 1.90, tz], reach: 2.0 });

    // ================================================================ 问询处 the information desk
    // An island by the entrance, because that is where somebody who has just walked in with a
    // question is standing. A curved counter, a clerk behind it as a silhouette against her own
    // lamp, and the sign on a post above so it can be found from the door.
    const qx = -3.90, qz = -5.05;
    cyl(qx, .52, qz, 1.05, 1.04, D.wallDP,
      { tag: '问询处', gloss: G.paint, ...MAT.plast, matAmt: .28 });
    cyl(qx, 1.06, qz, 1.14, .07, D.slabCF,
      { tag: '问询处', hard: true, gloss: .26, ...MAT.concF });
    // mode 6 is the wood shading; the tiling grain rides on top of it rather than replacing it.
    cyl(qx, 1.10, qz, .84, .04, D.woodW,
      { tag: '问询处', mode: 6, gloss: G.wood, ...MAT.wood });
    litten(cyl(qx + .40, 1.42, qz + .30, .09, .58, col.tube,
      { tag: '问询处', mode: 1, glow: .26 }), .7);
    // Her, seen against that lamp: shoulders, a neck, a head, and a forearm on the counter.
    box(qx - .10, 1.34, qz + .40, .44, .30, .22, col.charcoal,
      { tag: '问询处', hard: true, mode: 1, alpha: .84 });
    ball(qx - .10, 1.62, qz + .40, .11, .13, .11, col.charcoal,
      { tag: '问询处', mode: 1, alpha: .86 });
    box(qx + .16, 1.14, qz + .16, .30, .05, .16, col.charcoal,
      { tag: '问询处', hard: true, mode: 1, alpha: .78 });
    capsule(qx, 2.10, qz, .05, 2.10, .05, col.steelD, { tag: '问询处', gloss: G.metal });
    box(qx, 2.42, qz, 1.50, .40, .12, col.blueSign, { tag: '问询处', hard: true, gloss: .22 });
    for (const yaw of [0, Math.PI])
      for (const g of glyphs(qx, 2.42, qz + (yaw ? -.07 : .07), yaw, '问询处',
          { size: .18, gap: .06, color: col.white, mode: 1, tag: '问询处' })) litten(g, .8);
    solid(qx - 1.2, qx + 1.2, qz - 1.2, qz + 1.2);
    shade(qx, qz, 2.6, 2.6, .26);
    thing('问询处', qx, 1.40, qz - .30, '我去问询处问一下。', "I'll go and ask at the information desk.",
      '问 to ask + 询 to enquire + 处 a place. The desk you go to when the board makes no sense.',
      { focus: [qx, qz - 2.15], reach: 2.0 });

    // ================================================================ 充电站 the charging point
    // A bench of sockets on the +x wall by the front, which in a real station is the most contested
    // furniture in the room. Six outlets, a shelf to stand a phone on, and the lit sign over it.
    const cgx = RX - .34, cgz = -4.60;
    box(cgx, .70, cgz, .34, 1.40, 2.20, D.wallDP,
      { tag: '充电站', hard: true, gloss: G.paint, ...MAT.plast });
    box(cgx - .22, 1.02, cgz, .16, .06, 2.00, D.woodW,
      { tag: '充电站', mode: 6, gloss: G.wood, ...MAT.wood });
    for (let i = 0; i < 6; i++) {
      const sz2 = cgz - .80 + i * .32;
      box(cgx - .18, 1.22, sz2, .04, .16, .18, col.white,
        { tag: '充电站', hard: true, gloss: .28 });
      for (const oy of [-.03, .03])
        box(cgx - .21, 1.22 + oy, sz2, .02, .02, .05, col.charcoal,
          { tag: '充电站', hard: true, gloss: .24 });
    }
    box(cgx - .20, 1.62, cgz, .10, .34, 1.30, col.blue, { tag: '充电站', hard: true, gloss: .22 });
    for (const g of glyphs(cgx - .27, 1.62, cgz, -Math.PI / 2, '充电站',
        { size: .16, gap: .06, color: col.white, mode: 1, tag: '充电站' })) litten(g, .8);
    solid(cgx - .30, RX, cgz - 1.15, cgz + 1.15);
    thing('充电站', cgx - .60, 1.20, cgz, '手机没电了，去充电站。',
      'My phone is dead — there is a charging point.',
      '充电 to charge + 站 station. 充电宝 is the power bank everyone carries instead.',
      { focus: [cgx - 1.70, cgz], reach: 1.8 });

    // ================================================================ 行李车 the trolleys
    // Two of them nested by the door and one abandoned mid-floor, which is where they all are.
    function trolley(cx, cz, ry, load) {
      const T = { ry, tag: '行李车', hard: true, gloss: G.metal, ...MAT.metalF };
      box(cx, .18, cz, .64, .06, .96, D.steelDF, T);
      for (const [ox, oz] of [[-.27, -.42], [.27, -.42], [-.27, .42], [.27, .42]])
        cyl(cx + ox, .07, cz + oz, .07, .05, col.black,
          { ry, tag: '行李车', rz: Math.PI / 2, gloss: .26 });
      box(cx, .62, cz - .50, .60, .82, .05, D.steelF, T);
      // The grip is rubber, and 2.8 cm across: no material on it. A .34 m repeat over a part
      // that small lays down a fraction of one tile and reads as a stain rather than a surface.
      capsule(cx, 1.02, cz - .46, .028, .58, .028, col.charcoal,
        { ry, tag: '行李车', rz: Math.PI / 2, gloss: .30 });
      if (load) bag(cx, cz + .10, 1, col.lug2);
      solid(cx - .40, cx + .40, cz - .58, cz + .58);
      shade(cx, cz, 1.1, 1.4, .20);
    }
    trolley(-.30, -5.30, .10, 0);
    trolley(.55, -5.24, .06, 1);
    trolley(5.30, -.40, -1.15, 0);
    thing('行李车', .55, .90, -5.24, '推个行李车吧。', "Let's take a baggage trolley.",
      '行李 luggage + 车 cart. 托运 is to check a bag in.',
      { focus: [.55, -4.30], reach: 1.7 });

    // 消防栓 the hydrant cabinet, which every public room in China has on the wall in red.
    box(RX - .22, 1.10, 2.30, .30, 1.10, .70, col.red, { hard: true, gloss: .26 });
    box(RX - .38, 1.10, 2.30, .04, .96, .58, col.redD, { hard: true, gloss: .22 });
    glyphs(RX - .41, 1.10, 2.30, -Math.PI / 2, '消防栓',
      { size: .12, gap: .04, color: col.white, mode: 1 });

    // ================================================================ signage and lighting
    // A clock the size of a dinner table, the notices nobody reads, and the two rows of battens.
    // Beside the board, not on it: at x=0 the clock sat over the 终点 column and blanked two rows.
    const clx = -4.70, cly = 4.30;
    cyl(clx, cly, RZ - .16, .44, .10, col.white, { rz: 0, rx: Math.PI / 2, gloss: .26 });
    cyl(clx, cly, RZ - .22, .39, .03, col.cream, { rx: Math.PI / 2, mode: 1 });
    // The hands, pinned at the centre and swung by `tick` from the same clock the board reads.
    // Painted at half past ten for ever until now, in a room whose whole business is what time it
    // is — with a live departure board four metres to the right of it disagreeing.
    clock.x = clx; clock.y = cly;
    clock.hour = box(clx, cly, RZ - .25, .022, .30, .02, col.charcoal,
      { hard: true, gloss: .30, fixed: true, cx: clx, cy: cly, cz: RZ - .25, r: .36 });
    clock.min = box(clx, cly, RZ - .26, .018, .42, .018, col.charcoal,
      { hard: true, gloss: .30, fixed: true, cx: clx, cy: cly, cz: RZ - .26, r: .48 });
    glyphs(-RX + .14, 2.30, -4.6, Math.PI / 2, '禁止吸烟',
      { size: .13, gap: .04, color: col.redD, mode: 1 });
    for (const [sx, sz, txt] of [[6.6, -RZ + .16, '出站口'], [-2.2, RZ - .12, '候车室']]) {
      box(sx, 2.80, sz + (sz < 0 ? .04 : -.04), 1.90, .34, .10,
        col.jade, { hard: true, gloss: .24 });
      glyphs(sx, 2.80, sz + (sz < 0 ? .00 : -.09), sz < 0 ? 0 : Math.PI, txt,
        { size: .17, gap: .06, color: col.white, mode: 1 });
    }
    batten(-4.4, -3.2, 7.4); batten(4.4, -3.2, 7.4);
    batten(-4.4, 0, 7.4); batten(4.4, 0, 7.4);
    batten(-4.4, 3.2, 7.4); batten(4.4, 3.2, 7.4);

    // ---- 灯箱 the backlit posters, and 绿植 the planters, and 隔离带 the belt line.
    //
    // All four of these helpers — `lightbox`, `planter`, `post`, `belt` — were written, commented
    // and never called, along with the four `ad` colours in the palette that exist for nothing
    // else. That is the state this file was found in: a parts bin with nothing assembled out of
    // it, which is most of why a hall this size read as bare.
    //
    // Two lightboxes on the +z wall either side of the gate mouth, and two on the frontage dado
    // by the entrance. A station wall is never blank, it is sold; and these are the only things
    // in the room that put a saturated colour at eye level, which the hall badly wanted.
    lightbox(-6.50, 1.60, RZ - .10, 1.30, 2.00, col.ad2, Math.PI);
    lightbox(-3.60, 1.50, RZ - .10, 1.30, 1.90, col.ad4, Math.PI);
    lightbox(3.60, 1.02, -RZ + .30, 1.20, 1.30, col.ad1, 0);
    lightbox(6.70, 1.02, -RZ + .30, 1.20, 1.30, col.ad3, 0);
    // The planters stand exactly where a Chinese public hall puts them: on the corner a queue
    // would otherwise cut, and in the gap between the seating and the wall that people drift into.
    //
    // Two, and not the three that were placed first. The third stood at (-5.30, 4.10), a couple of
    // metres off the +z wall — and the known AO artifact in this renderer ghosts whatever is in
    // front of a large flat surface onto it, so six 30 cm foliage balls silhouetted against the
    // biggest blank wall in the room printed six soft grey circles across it. The artifact is not
    // mine to fix and this file does not touch it; what this file can do is not hand it the one
    // shape it renders worst, in the one place it renders it most.
    planter(-5.30, .90); planter(5.00, -2.55, .38);
    // The queue rail down the far half of the ticket counter, away from the two windows that are
    // actually staffed — which is where a real one is, because it is corralling the tail of the
    // queue rather than the head of it. No collider: you walk through a belt in this game the way
    // you walk through the gate rails eight metres away, and one of them behaving differently
    // would be worse than both being scenery.
    const QZ = [1.00, 2.20, 3.40, 4.60];
    for (let i = 0; i < QZ.length; i++) {
      post(-6.95, QZ[i]);
      if (i) belt(-6.95, QZ[i - 1], -6.95, QZ[i]);
    }
    // bins between the seat blocks
    for (const [ox, oz] of [[0, -3.0], [0, -.7], [0, 1.6]]) {
      cyl(ox, .34, oz, .19, .68, D.steelDF, { gloss: .30, ...MAT.metalF });
      cyl(ox, .70, oz, .20, .05, col.charcoal, { gloss: .26 });
      solid(ox - .22, ox + .22, oz - .22, oz + .22);
    }
  }

  build();

  // The room, every frame: the flicker on the matrix, the state of each service, the gate that
  // follows it, and the hands on the clock. `mins` is the game clock in minutes past midnight —
  // the same number the departures in TRAINS are written in.
  function tick(t, P, mins) {
    const dt = gate.lastT ? Math.min(.10, Math.max(0, t - gate.lastT)) : 0;
    gate.lastT = t;

    // A powered matrix is steady to the eye. The old whole-board sine pulse imitated a camera
    // artefact and made every row throb together; the live ticker below is the motion cue now.
    const k = .96;
    for (const g of boardRows) g.alpha = k;

    // Four characters a second: quick enough to read as a running LED ribbon, slow enough that a
    // learner can still catch the words. Rewriting only when the integer step changes keeps the
    // atlas work off the other frames and never rebuilds geometry.
    const tickerStep = Math.floor(t * 4);
    if (tickerStep !== ticker.step) {
      ticker.step = tickerStep;
      for (let i = 0; i < ticker.slots.length; i++)
        ticker.slots[i].ch = ticker.text[(i + tickerStep) % ticker.text.length];
    }

    // What each train is doing. Half an hour out they call it, eight minutes out they stop letting
    // anybody through, and after that it has gone. A service still an hour off says 正点, or 晚点 if
    // it is one of the ones running late — and D712 always is.
    let boarding = false;
    for (const r of rows) {
      const d = r.dep - mins;
      const st = d > 30 ? (r.late ? 1 : 0) : d > 8 ? 2 : d > 0 ? 3 : 4;
      if (st === 2) boarding = true;
      if (st !== r.st) {
        r.st = st;
        r.words.forEach((w, i) => {
          for (const g of w) {
            if (!g.m0) g.m0 = g.m;       // whatever the build gave it, taken once
            g.m = i === st ? g.m0 : GONE;
            g.alpha = i === st ? 1 : 0;
          }
        });
      }
      // A train that has gone dims its whole line rather than clearing it, the way they do.
      const dim = st === 4 ? .34 : 1;
      for (const g of r.line) g.alpha = k * dim;
    }

    // And the gate, which is the thing the entire room is waiting for. The flaps swing back into
    // their housings, the lamp goes from amber to green, the strip under the header changes its
    // mind, and the sentence the gate says to you changes with it.
    if (boarding !== gate.open) {
      gate.open = boarding;
      gate.changedAt = t;
      for (const p of gate.lamps) p.color = boarding ? col.jadeL : col.yellow;
      for (const [group, show] of [[gate.shut, !boarding], [gate.boarding, boarding]])
        for (const g of group) {
          g.m = show ? g.m0 : GONE;
          g.alpha = show ? 1 : 0;
        }
      if (gate.th) {
        gate.th.sentence = boarding ? '开始检票了，快走。' : '还没开始检票，再等等。';
        gate.th.tr = boarding ? 'They have started checking tickets — go on through.'
                              : 'They have not started checking tickets yet. A bit longer.';
      }
    }

    // The timetable state still changes at the exact same minute; only the glass catches up over
    // a fraction of a second. Lamps and text answer immediately, then brighten slightly while the
    // mechanism is moving instead of pulsing forever after it has stopped.
    const wantGate = boarding ? 1 : 0;
    gate.visual += (wantGate - gate.visual) * (1 - Math.exp(-dt / .16));
    if (Math.abs(wantGate - gate.visual) < .001) gate.visual = wantGate;
    const gateMoving = Math.abs(wantGate - gate.visual) > .01;
    for (const f of gate.flaps)
      f.p.m = M.mul(M.trans(f.x, .62, GATEZ),
        M.mul(M.rotY(f.s * 1.35 * gate.visual), M.scale(.05, .70, .84)));
    for (const p of gate.lamps)
      p.glow = (boarding ? .34 : .18) + (gateMoving ? .12 : 0);
    for (const p of gate.portalLamps) p.glow = .12 + gate.visual * .24;

    if (clock.hour) {
      clock.mins = mins;
      const hand = (p, z, len, w, ang) => {
        p.m = M.mul(M.trans(clock.x, clock.y, z),
          M.mul(M.rotZ(-ang), M.mul(M.trans(0, len / 2, 0), M.scale(w, len, .012))));
      };
      // Positive, not negative. The face hangs on the +z wall and is looked at from -z, so world +x
      // is on the *viewer's* left — and a clock laid out in world coordinates is therefore read
      // mirrored. Nine o'clock pointed at the three. Every analogue clock in this game built the
      // same way has the same problem; this is the one on this wall.
      hand(clock.hour, RZ - .25, .215, .026, -(mins % 720) / 720 * Math.PI * 2);
      hand(clock.min, RZ - .26, .330, .019, -(mins % 60) / 60 * Math.PI * 2);
    }
  }
  function setNight(kk) {
    const soft = kk * kk * (3 - 2 * kk);
    for (const { p, k } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * k * .24;
  }

  const api = B.finish({
    setNight, tick, RX, RZ, H, WIN, OUT,
    state: () => ({
      gateOpen: gate.open,
      gateVisual: +gate.visual.toFixed(3),
      gateMoving: Math.abs((gate.open ? 1 : 0) - gate.visual) > .01,
      platformPassagesLit: gate.portalLamps.some(p => p.glow > .24),
      gateChangedAt: gate.changedAt,
      tickerStep: ticker.step,
      tickerText: ticker.slots.map(p => p.ch).join(''),
      clockMinutes: clock.mins,
      departures: rows.map(r => ({
        no: r.no, destination: r.to, departure: r.dep, late: r.late, state: r.st,
      })),
    }),
    label: '火车站', labelK: '火车站 · railway',
    indoor: true, cutaway: true, near: .05, far: 60, expose: 1,
    // Out of the subway lobby, facing into the hall.
    spawn: { x: DX + .20, z: -RZ + 2.20, yaw: Math.PI * .10 },
    zones: [{ id: 'rail', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .60, 0] }],
    roomAt() { return this.zones[0]; },
  });
  // Both gate captions occupy the same pixels. Alpha-zero glyphs still write depth in this
  // renderer, so park the inactive wording after `finish` has measured its real cull position.
  for (const g of [...gate.shut, ...gate.boarding]) g.m0 = g.m;
  for (const g of gate.boarding) g.m = GONE;
  return api;
});
