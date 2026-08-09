// 🚉 Arrivals · Stairs — The stairwell up to the street, the daylight panel at WIN, the first thing a commuter sees when they come down
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    concourse, z -5.2..-4.0 around x -5.10 (SX)
//   camera  91-metro, 91b-stairs, 96-crowd
//
// The stairwell up to the street, the daylight panel at WIN, the first thing a commuter sees when
// they come down. Owns the spawn view and the body-removal plane.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 91-metro`, open the PNG, and look at it.
// A zone whose code boots but whose shot is black, empty or unchanged has not shipped.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE — metro-specific, load-bearing, and the one that has no equivalent elsewhere
//
// `setStation(hz)` rewrites signs, floor inlays, the map ring and the exit in place, and `tick`
// moves flaps, boards and the train. All of that works off a REST MATRIX captured after the scene
// finishes building. If your zone adds a prop that will later be rewritten or moved, register it:
//
//     A.rest(myProp);
//
// ...or the shell will fight it and it will snap back to a matrix nobody meant. Props tagged
// `地铁` are collected automatically — that is how the car interior travels with the train.
// Tag interior props `地铁`; never tag anything that stays on the platform.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The metro is one of the healthiest scenes in the game: ~10.9 ms a frame (90+ fps) with 1,590
// props. It is thin on CONTENT, not on performance, and fifteen agents filling it is exactly how
// that changes. Your budget is **160 props** — lower than the airport's, because this room is a
// third of the size and you are much closer to everything in it.
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Twenty identical seats are
//     one draw call. Twenty seats in twenty colours are STILL one draw call — colour, gloss,
//     alpha and glow travel per instance. Vary those freely; they are free.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Screen doors and chiller glass earn it;
//     budget **8** and no more.
//   * Glyphs DO batch now (as of 2026-08-04 the atlas cell became a per-instance attribute — the
//     street went from 978 glyph draws a frame to two batches). Real Chinese on every sign is
//     cheap, and this is a game about reading Chinese. Use real characters everywhere.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Pick one tile
//     scale and one concrete scale and stay with them.
//   * If you tick, allocate NOTHING per frame and write matrices in place.
//
// Check yourself: `node .fpscheck.js metro` must stay under 16.7 ms median. Take your own baseline
// BEFORE you build — the machine varies run to run. If your zone pushes it over, say so in your
// report rather than shipping it quietly.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS ZONE ADDS, AND WHY EACH PIECE IS HERE
//
// The shell already builds the *architecture* of the way out: the hole in the -z wall, the two
// tiled cheeks, eight cast treads with a yellow nosing on each, the two raked handrails, the
// daylight panels at the head of the flight, the painted street beyond them, the 出口 board over
// the opening and the `门` that takes you up. None of that is touched here and none of it should
// be — it is good, and it is the shell's.
//
// What was missing was everything a Beijing station entrance actually *says*, and everything that
// stands in it:
//
//   1. 指示牌 — a hung, double-sided wayfinding board across the mouth of the well. On the way OUT
//      it letters the exits (A出口 with the street it comes up on, B出口 暂缓开通); on the way IN it
//      points at 售票处 and 服务中心. A Chinese station is *covered* in this and the concourse had
//      exactly one sign on it, over the gate line.
//   2. The A出口 destination changes with the station. That is the m0 rule's own example, and it is
//      the only prop in this zone the shell would otherwise fight — see `dest` below.
//   3. 安检 — the security check. Every Beijing station has one immediately inside the entrance and
//      this one had none, which is the single loudest way a Chinese metro reads as a Western tube.
//      Kept to a duty post in the dead corner west of the flight rather than a full belt: a 1.6 m
//      X-ray tunnel does not fit in a 1.2 m strip without standing in the walking line.
//   4. 提示砖 — the dotted warning paving at the foot of a flight. The shell's guide path (`tacRun`)
//      already runs from the stair foot to the platform; what a real one has at the bottom of steps
//      and the shell did not is the studded field either side of it that means "hazard, not path".
//   5. The things the eye finds at two metres: brackets under the handrails, a return-air grille,
//      a 安全检查 notice, and — against the daylight at the top — a blade sign and a parked bicycle,
//      because the head of these steps is a street and a street has bicycles on it.
//
// ---------------------------------------------------------------------------------------------

MetroFit['stairs'] = A => {
  const { box, cyl, cap, flat, glyphs, solid, glow, thing, shade, light } = A;
  const { C, G, col } = A;
  const SX = A.SX, RZ = A.RZ;

  // The two planes everything here is measured from: the -z wall the stair opening is cut in, and
  // the face of the tiled west wall. `tiledWall` stands its granite skirting .075 out and its
  // grout lines .105 out on a .024 thickness, so the furthest-forward point of that wall is at
  // x -6.283. Anything mounted on it starts at -6.25 or it is inside the grout.
  const WALLZ = -RZ;                 // -5.20
  const FACEX = -6.24;               // the back of anything hung on the west wall
  // Colours. `TAC`/`TACD` are the shell's own tactile-paving pair, repeated rather than exported so
  // the studs below batch with the ribs of the guide path they interrupt — same mesh, same mode,
  // same (absent) material, therefore the same draw call.
  const TAC = C('#d8b62e'), TACD = C('#a4861d');
  const SILHOUETTE = { hard: true, mode: 1, glow: .02 };
  // `lift` is how far a character stands off the face it is painted on, and the default .012 is
  // set for a shop board seen from across a street. Everything in this zone is read from two
  // metres, where 12 mm of air under a character is a character peeling off its sign. Five.
  const SIGNTXT = { size: .15, gap: .045, color: col.white, mode: 1, glow: .16, lift: .006 };
  const WALLTXT = { mode: 1, lift: .005 };

  // =============================================================== 出口指示牌 the hung sign
  // Beijing hangs these a metre in front of the stair mouth rather than flat on the wall over it,
  // because the wall over it is a lintel 16 cm deep and a sign there is edge-on to everybody
  // walking towards it. One metre out and it is square to the room from the gate line.
  //
  // y is the compromise the room forces. The opening is 2.70 tall and the daylight panel at the
  // head of the flight tops out at 2.57, so a board slung at 2.60 puts itself between the camera
  // and the only daylight in the station. At 2.35 the sight line from the gate line to the top of
  // that panel passes *under* the board, the daylight still reads, and there are still 2.13 m of
  // headroom to walk under — which is what a real one gives you.
  const GY = 2.35, GZ = -4.22;
  for (const s of [-1, 1])
    cap(SX + s * .95, 2.92, GZ, .016, .68, .016, col.steelD, { gloss: G.metal });
  // The carcass, and a face on each side of it. Tagged `出口` so the cursor can find the word:
  // `pick` raytraces the props and resolves the tag it hit to the nearest thing wearing it, so a
  // thing with nothing tagged is a thing only the walk-up prompt can ever offer.
  box(SX, GY, GZ, 2.30, .44, .08, col.navy, { hard: true, gloss: .26, tag: '出口' });
  // OUT (+z, read walking towards the steps): jade, which is what an exit is signed in here — the
  // shell's own 出口 board over the opening is `col.jade` and this has to agree with it.
  box(SX, GY, GZ + .046, 2.22, .38, .012, col.jade, { hard: true, gloss: .24, tag: '出口' });
  // IN (-z, read at the bottom of the flight, looking back into the room): navy, the wayfinding
  // colour, because what it points at is inside the station rather than out of it.
  box(SX, GY, GZ - .046, 2.22, .38, .012, col.navy, { hard: true, gloss: .26, tag: '出口' });

  // ---- the OUT face. Two exits, lettered, which is how you say where you are in a Chinese
  // station: not "the north entrance" but 从A口出.
  // The layout is arithmetic, not taste. The jade panel gives 2.22 m; 'A出口' at .15 on a .045 gap
  // is 0.54 wide and the arrow beside it is 0.23 including its rotated arms, so the A group is
  // centred at SX-.50 and the arrow at SX-.96 — which leaves 8 cm between the arrowhead and the
  // A, and 3.7 cm between the arrow and the edge of the panel. Both were negative on the first
  // pass and a character half off the end of its own board is the loudest wrong thing on a sign.
  glyphs(SX - .50, GY + .105, GZ + .050, 0, 'A出口', SIGNTXT);
  glyphs(SX + .62, GY + .105, GZ + .050, 0, 'B出口', SIGNTXT);
  // B is dug and signed and not open, the same fiction the line map tells about the stations with
  // no `out`. 暂缓开通 is the exact phrase Beijing puts on one — "opening deferred", not "closed".
  glyphs(SX + .62, GY - .105, GZ + .050, 0, '暂缓开通',
    { size: .105, gap: .035, color: C('#b9c2cc'), mode: 1, glow: .10, lift: .006 });
  // ---- ↑, because A出口 is up the steps and not along the concourse. Two bars meeting at a point
  // and a stem: three bars of decreasing height in a row read as a bar chart, which is the same
  // note the shell wrote about the chevron over the opening.
  for (const s of [-1, 1])
    box(SX - .96 + s * .046, GY + .10, GZ + .056, .155, .026, .01, col.white,
      { hard: true, mode: 1, rz: -s * .72 });
  box(SX - .96, GY - .045, GZ + .056, .026, .27, .01, col.white, { hard: true, mode: 1 });

  // ---- the IN face. Whoever is reading this has just come down eight steps and has not yet
  // bought anything, so it names the two places that sell them something.
  glyphs(SX - .30, GY + .105, GZ - .050, Math.PI, '售票处',
    { size: .145, gap: .045, color: col.white, mode: 1, glow: .16, lift: .006 });
  glyphs(SX - .30, GY - .105, GZ - .050, Math.PI, '服务中心',
    { size: .125, gap: .04, color: col.white, mode: 1, glow: .16, lift: .006 });

  // =============================================================== A出口 · where it comes up
  // THE m0 PROP. `setStation(hz)` rewrites the name boards, the floor inlay, the ring on the line
  // map and `exitThing.exit` — and the street an exit comes up on is a fact about which station
  // this is, exactly like all four of those. It is rewritten the same way they are: the slot keeps
  // its matrix and only `ch` changes, so the three characters never move and never need a matrix
  // written for them. They are registered through `A.rest` anyway, because that is the contract
  // and because the day somebody wants a four-character destination centred in three slots is the
  // day the shell would otherwise have eaten the shift.
  //
  // Every station gets a street rather than a repeat of its own name: a sign that says 机场·机场
  // tells a commuter nothing, and the whole point of an exit letter is that it names the piece of
  // pavement you will be standing on. Three characters each, so a slot is never parked and never
  // shifted — the shell's own name boards need both because station names run two to four.
  const DEST = {
    '杨柳胡同': '柳荫街',        // the lane the hutong scene comes out on
    '商务区':   '金台路',
    '大学城':   '学院路',
    '火车站':   '站前街',
    '公园':     '湖滨路',
    '动物园':   '西园路',
    '机场':     '航站楼',
  };
  const DEST0 = '柳荫街';
  // The atlas only holds characters somebody asked for, and `glyphs` asks for the text it is
  // built with. Six of these seven destinations are never built, only written later — so they are
  // asked for here or they would come out of the sheet as nothing at all.
  Glyphs.need('柳荫街金台路学院路站前街湖滨路西园路航站楼');
  const destSlots = glyphs(SX - .50, GY - .105, GZ + .050, 0, DEST0,
    { size: .125, gap: .04, color: C('#e9f0e9'), mode: 1, glow: .14, lift: .006 }).map(A.rest);

  // =============================================================== 安检 the security check
  // Inside the entrance of every station on the network, and absent from this one. A duty post,
  // not a belt: the corner west of the flight is 46 cm deep once the tiled wall has taken its
  // 16 cm, and an X-ray tunnel put anywhere it fits would stand in the one route between the
  // steps and the gates.
  //
  // Its footprint is chosen against the collider, not by eye. `clampMove` inflates every solid by
  // the 0.30 body radius, so this one reaches x -5.46 and z -3.95 in practice — and the `门`'s own
  // focus, the spot the game walks you to in order to leave, is at (-5.10, -3.70). Both axes clear
  // it. This codebase has shipped a doorway through a solid pier; the way not to is arithmetic.
  //
  // Two z's, not one. The podium stands at -4.50 so the studded paving at the stair foot runs past
  // its south edge instead of under it — a prop inside another prop is a prop nobody will ever see
  // and it still costs an instance. The notice above it sits 14 cm further back, because the west
  // wall carries a pilaster at z -4.32..-4.18 and a 58 cm board centred on the podium would run
  // into it. A sign not quite concentric with the desk under it is what every real one looks like.
  const PX = -5.99, PZ = -4.50, SZW = -4.64;
  const AJ = { tag: '安检' };
  box(PX, .46, PZ, .46, .92, .50, col.steelD,
    { ...AJ, gloss: .34, mat: 'steel', matScale: .40, matAmt: .32 });
  box(PX, .945, PZ, .50, .05, .54, col.chrome, { ...AJ, hard: true, gloss: G.metal });
  // the screen the operator watches, raked back off the top
  box(PX + .02, 1.20, PZ - .06, .34, .28, .04, col.charcoal, { ...AJ, hard: true, gloss: .28, rx: -.20 });
  box(PX + .045, 1.20, PZ - .045, .29, .23, .01, C('#1d3140'),
    { ...AJ, hard: true, mode: 1, glow: .24, rx: -.20 });
  // what is on it: the orange-and-blue smear an X-ray of a bag comes out as. Two shapes, because
  // one is a rectangle and a rectangle on a screen is a screen that is off.
  box(PX + .05, 1.21, PZ - .040, .13, .09, .008, C('#c8842f'), { ...AJ, hard: true, mode: 1, glow: .30, rx: -.20 });
  box(PX + .05, 1.16, PZ - .040, .19, .04, .008, C('#3f7fa8'), { ...AJ, hard: true, mode: 1, glow: .26, rx: -.20 });
  // A narrow scan bar is the one piece that tells the eye this is live equipment rather than a
  // framed picture. It sweeps inside the 29 cm aperture; the bag shapes and the manned lamp stay
  // steady, so the whole corner does not pulse merely to advertise that it is animated.
  const scanX0 = PX - .075, scanTravel = .24;
  const scan = A.rest(box(scanX0, 1.20, PZ - .035, .018, .205, .006, C('#8fd8e8'),
    { ...AJ, hard: true, mode: 1, glow: .46, rx: -.20,
      // Animated cull data is packed by `finish`. Centre the reserved sphere on the complete
      // sweep now, before packing, rather than moving `p.cx` later and assuming the packed copy
      // follows it.
      fixed: true, cx: PX + .045, cy: 1.20, cz: PZ - .035, r: .20 }));
  // 安检筐, the stack of blue trays. Nobody who has been through one of these forgets them.
  for (let i = 0; i < 3; i++)
    box(PX, 1.005 + i * .045, PZ + .13, .34, .045, .26, C('#3c608a'), { ...AJ, gloss: .22 });
  // the wand, lying across the top where it is put down between passengers
  cyl(PX, .985, PZ - .13, .017, .30, col.charcoal, { ...AJ, rz: Math.PI / 2, gloss: .26 });
  // and the lamp that says the post is manned
  cyl(PX + .17, .995, PZ - .19, .026, .022, C('#4fd68c'), { ...AJ, mode: 1, glow: .40 });
  shade(PX, PZ, .78, .82, .34);
  solid(PX - .23, PX + .23, PZ - .25, PZ + .25);

  // ---- 安全检查, the notice over it. Vertical is not decoration: a 58 cm strip of wall between a
  // pilaster and the corner takes four characters down and would take two across.
  // The board's own front face lands at FACEX + .025; the jade header is a 14 mm plate laid on top
  // of it, not a second slab the same thickness — an inset that thick simply buries itself inside
  // the board and draws nothing. yaw π/2 is the facing for a wall on -x: the glyph quad stands up
  // to face its local +z and rotY takes that to (sin yaw, 0, cos yaw), which at π/2 is +x.
  box(FACEX, 1.80, SZW, .05, 1.00, .58, col.panel, { hard: true, gloss: .22, tag: '安检' });
  box(FACEX + .032, 2.16, SZW, .014, .28, .58, col.jade, { hard: true, gloss: .24, tag: '安检' });
  glyphs(FACEX + .040, 2.16, SZW, Math.PI / 2, '安全检查',
    { ...WALLTXT, size: .105, gap: .035, color: col.white, glow: .18 });
  // what you may not bring down here, which is the other half of what the sign is for
  glyphs(FACEX + .026, 1.86, SZW, Math.PI / 2, '禁止携带',
    { ...WALLTXT, size: .10, gap: .032, color: col.charcoal });
  glyphs(FACEX + .026, 1.64, SZW, Math.PI / 2, '易燃易爆',
    { ...WALLTXT, size: .095, gap: .03, color: col.redD });
  glyphs(FACEX + .026, 1.44, SZW, Math.PI / 2, '管制刀具',
    { ...WALLTXT, size: .095, gap: .03, color: col.redD });

  // ---- 回风口 the return-air grille, above the notice. Every station of this vintage has a run of
  // them along the concourse walls and the reason to put one here is the reason to put a bin in a
  // corridor: a wall with nothing on it above head height reads as a set, not a building.
  box(FACEX, 2.62, SZW, .06, .40, .58, col.steelP, { hard: true, gloss: G.metal });
  for (let i = 0; i < 5; i++)
    box(FACEX + .022, 2.47 + i * .075, SZW, .02, .030, .53, col.charcoal, { hard: true, gloss: .20 });

  // =============================================================== 提示砖 the warning paving
  // At the bottom of a flight the paving changes from ribs to studs, because ribs mean "this way"
  // and studs mean "something happens here". The shell's guide path already runs up the middle at
  // x SX on a 24 cm rib, so the studded field goes either side of it rather than over it — which
  // is also how it is laid in the street: the warning surrounds the guide, it does not replace it.
  for (const [x0, x1] of [[-6.14, -5.30], [-4.90, -4.06]]) {
    flat((x0 + x1) / 2, .005, -4.87, x1 - x0, .30, TAC, { gloss: .14 });
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++)
        box(x0 + .15 + i * ((x1 - x0 - .30) / 2), .011, -4.95 + j * .16, .075, .010, .075, TACD,
          { hard: true, gloss: .16, tag: '盲道' });
  }
  // ---- the threshold. A granite band across the mouth, where the room's floor stops and the
  // flight starts. It is the only prop in this zone that is tagged for the word 楼梯, because the
  // treads themselves belong to the shell and a word with nothing tagged can only ever be walked
  // up to, never pointed at.
  box(SX, .012, WALLZ + .09, 2.30, .024, .10, col.granite,
    { hard: true, gloss: .34, tag: '楼梯' });

  // =============================================================== 扶手 the handrail, fixed to something
  // The shell's two rails are raked capsules 2.30 long and they float: nothing holds them to the
  // cheeks they run beside. The brackets are placed off the RAIL'S OWN rake and not off the
  // flight, which matters here because the two disagree — `rx: -.62` puts the rail at 54.5° and
  // eight treads of .18 on a .26 going put the stair at 34.7°. Parameterise the capsule instead:
  // its axis is (0, cos .62, -sin .62), so t metres up from its centre is
  //   y = 1.02 + .8139 t,  z = -6.05 - .5810 t
  // and a bracket written that way lands on the rail wherever the rail actually is. Placing them
  // by the stair's arithmetic would have hung all four in mid-air, and from six metres away
  // through a 2.3 m hole nobody would have been able to say why the stairwell looked wrong.
  const RAILX = [SX - .96, SX + .96], CHEEK = [-6.24, -3.96];
  const railY = t => 1.02 + t * .8139, railZ = t => -6.05 - t * .5810;
  for (let r = 0; r < 2; r++) {
    for (const t of [-.80, .30]) {
      box((RAILX[r] + CHEEK[r]) / 2, railY(t), railZ(t), Math.abs(CHEEK[r] - RAILX[r]), .036, .036,
        col.steelP, { hard: true, gloss: G.metal, tag: '扶手' });
    }
    // and the plate where the top of it dies into the tile
    cyl(CHEEK[r] + (r ? -.014 : .014), railY(1.08), railZ(1.08), .050, .028, col.chrome,
      { rz: Math.PI / 2, gloss: G.metal, tag: '扶手' });
  }

  // =============================================================== up there
  // The head of the flight is a backdrop by design — the big panel is what takes a body out of the
  // world, so nothing can stand behind it and nothing may stand instead of it. What can go in
  // front of it is a silhouette, which is what the shell's newel posts and top rail already are.
  //
  // Two more, and both are chosen for shape rather than detail, because at this distance through a
  // 2.30 m hole shape is all that survives: a blade sign on a post, and a bicycle left against the
  // railing. A Beijing subway entrance always has both, and the bicycle is the one that says which
  // city this is.
  // Everything up here stands on the eighth tread, whose top is at y 1.445 — the flight is the one
  // floor in this station that is not at zero and the whole point of the shot is that you can see
  // it. UPZ is 2 cm in front of the shell's own railing silhouettes and 12 cm in front of the
  // painted street, so these read as nearer than both rather than fighting either for pixels.
  const UPZ = -RZ - 2.00, DECK = 1.445;
  box(-4.60, DECK + .46, UPZ, .05, .92, .05, col.black, SILHOUETTE);
  box(-4.60, DECK + .97, UPZ, .40, .24, .04, col.black, SILHOUETTE);
  // the characters cut out of it, lit by the daylight behind: a black board with black writing on
  // it is a black board.
  glyphs(-4.60, DECK + .97, UPZ + .022, 0, '地铁',
    { size: .155, gap: .05, color: C('#eaf2f8'), mode: 1, glow: .34, lift: .006 });
  // the bicycle, standing in the gap between the west newel post and the middle of the opening.
  // The shell tried a bollard beyond the east post and took it straight out again, because two
  // near-black shapes 3 cm apart against a bright panel read as one lump with a bite out of it.
  // This one has 42 cm of daylight to its west and 58 to its east, and it is a shape nothing else
  // in the game is: two circles and a triangle is a bicycle at any distance.
  const BX = -5.44, WR = .195;
  for (const s of [-1, 1])
    cyl(BX + s * .30, DECK + WR, UPZ - .04, WR, .035, col.black,
      { ...SILHOUETTE, rz: Math.PI / 2 });
  box(BX - .02, DECK + .48, UPZ - .04, .52, .034, .03, col.black, SILHOUETTE);
  box(BX + .12, DECK + .34, UPZ - .04, .034, .34, .03, col.black, { ...SILHOUETTE, rz: .40 });

  // =============================================================== the light down the well
  // The shell paints one broad pool at the bottom of the steps. What it does not have is the hard
  // core of it — the patch directly under the opening where the sky actually reaches the floor,
  // which is brighter and much smaller than the wash around it, and a real light so the granite
  // threshold and the tactile studs answer to it instead of only to the ceiling tubes.
  glow(M.trs(SX, .021, -4.72, 0, 2.05, 1, 1.15), C('#e8f1f8'), .15);
  glow(M.trs(SX, .019, -4.05, 0, 1.30, 1, .90), C('#dfe9f2'), .07);
  light(SX, 2.05, -4.86, C('#d8e6f4'), .85, 3.2);

  // =============================================================== the words
  // Four, and the metro had ten in the whole station. Each one's `focus` is a spot the body can
  // actually stand on — checked against both solids in this strip after inflation — and each
  // reach is short enough that the `门` still wins wherever somebody is actually walking in order
  // to leave. That is the same rule the shell wrote for 刷卡 against 闸机: a word to read, not a
  // second way out.
  thing('出口', SX - .50, 2.18, GZ + .10, '从A出口出去。', 'Leave by exit A.',
    '出 out + 口 mouth or opening. Chinese stations letter their exits — A出口, B出口 — and you say ' +
    '从A口出, "out by A". The board tells you which street each one comes up on.',
    { focus: [-4.40, -4.25], reach: 1.15 });
  thing('楼梯', SX, .42, WALLZ + .05, '上楼梯就到街上了。', 'Up the stairs and you are on the street.',
    '楼 storey + 梯 ladder. A moving one is a 扶梯 and a lift is a 电梯; this station has neither yet.',
    { focus: [-4.62, -4.60], reach: .90 });
  thing('扶手', SX + .96, 1.22, -5.78, '请扶好扶手。', 'Please hold the handrail.',
    '扶 to steady or support + 手 hand. 请扶好 is said over the PA on every escalator in the country.',
    { focus: [-4.95, -4.55], reach: .95 });
  thing('安检', PX + .10, 1.30, PZ, '进站要先过安检。', 'You go through security before entering.',
    '安 safe + 检 to inspect. Every station on the network has one inside the entrance: bags on the ' +
    'belt, and 请配合安检 — "please co-operate with the check".',
    { focus: [-5.25, -4.42], reach: 1.05 });

  // ---- the destination slots and screen sweep. Kept on the builder so the tick below can reach
  // them without module-level scene props that would survive a rebuild.
  MetroFit['stairs']._dest = destSlots;
  MetroFit['stairs']._table = DEST;
  MetroFit['stairs']._fallback = DEST0;
  MetroFit['stairs']._scan = { p: scan, travel: scanTravel, u: 0, m: scan.m.slice() };
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on. Do not start your own
// timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the station.
//
// The security scan is a constant-speed equipment cue, while the station name changes only when
// the room moves under it. `setStation` rewrites the shell's own props directly and there is no
// hook to register a fifth, so polling is the honest answer; the rewrite itself still happens on
// the one frame you arrive and never again.
//
// `Metro.__lazyBuilt` is answered by the proxy without building anything (js/lazy.js), so this is
// safe on a frame where the station somehow is not up yet, and `stationAt` is cached off the
// module rather than read through the proxy sixty times a second.
MetroFit['stairs'].tick = t => {
  const self = MetroFit['stairs'];
  const scan = self._scan;
  if (scan && scan.p.m0) {
    // Mutate one retained matrix rather than allocating a translation every frame. `m0` remains
    // the untouched left edge captured by the metro shell after the room finished building.
    const u = ((t * .42) % 1 + 1) % 1;
    scan.u = u;
    scan.p.m = scan.m;
    scan.m[12] = scan.p.m0[12] + u * scan.travel;
    if (scan.p.ob && scan.p.obx0 !== undefined) scan.p.ob.x = scan.p.obx0 + u * scan.travel;
  }
  if (!self._at) {
    if (typeof Metro === 'undefined' || !Metro.__lazyBuilt) return;
    self._at = Metro.stationAt;
  }
  const s = self._at();
  const hz = s && s.hz;
  if (hz === self._hz) return;
  self._hz = hz;
  const slots = self._dest;
  if (!slots) return;
  const name = self._table[hz] || self._fallback;
  for (let i = 0; i < slots.length && i < name.length; i++) slots[i].ch = name[i];
};

// Read-only and allocation-free during play; the object is made only when a harness asks for it.
MetroFit['stairs'].probe = () => {
  const self = MetroFit['stairs'], scan = self._scan;
  return {
    station: self._hz || null,
    securityScan: scan ? +scan.u.toFixed(3) : 0,
    securityScanX: scan && scan.p.m ? +scan.p.m[12].toFixed(3) : null,
  };
};
