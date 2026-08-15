// 次卧+书房 — the second bedroom and study
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
//   次卧   x -6.0 .. -2.6   z -5.0 .. -1.4      3.4 × 3.6 m
//   书房   x -2.6 .. -1.4   z -5.0 .. -1.4      1.2 × 3.6 m
//   floor at DECK[2], H 2.60
//
// ---------------------------------------------------------------------------------------------
// What these two rooms are.
//
// A 次卧 in a Chinese flat is almost never a guest room kept made up. It is the room the rest of
// the flat overflows into: a single bed you cannot see the middle of, cartons that have not been
// opened since the move, the winter quilts in vacuum bags, the suitcase on top of the wardrobe,
// and the exercise bike somebody bought in January. The service balcony owns the drying rack;
// duplicating it here used to turn an honest overflow room into a furniture store. The
// design instruction for this file is therefore *honest, not tidy* — every clear horizontal
// surface in here has something on it, because that is what makes a room read as lived in rather
// than as a showroom with the lights off.
//
// The 书房 is the opposite problem: 1.2 m wide and 3.6 m deep, so it is a corridor with a desk in
// it. Everything is against one wall or the other. It is also the room that says who lives here —
// a wall of 奖状 and a shelf of 教辅 exam-prep books means there is a child in the household, and
// that costs about forty draw calls to say.
//
// ---------------------------------------------------------------------------------------------
// Two things this file assumes about the shell, both flagged in the hand-back:
//
//  1. `F` below is the y of this deck's floor. If the toolkit is handed to builders in
//     floor-relative y (0 at the floor) rather than absolute world y, the shell sets `A.y0 = 0`
//     and everything here follows. Nothing else in the file mentions the deck height.
//  2. The only partition built here is x = -2.6, the wall between these two rooms, which is
//     interior to this file on both faces. The walls at z = -1.4 (to 主卧), x = -6.0 and
//     z = -5.0 (both exterior) are the shell's. If the shell also builds x = -2.6, set
//     `A.partitions = false` and this file stops building it — coplanar walls stripe.
FlatFit['second'] = A => {
  // A toolkit that is not there yet, or is a different shape, must not take the boot down with
  // it. A missing room is a hole; a throw is everybody's problem.
  if (!A || typeof A.box !== 'function') return;

  const box = A.box, cyl = A.cyl, ball = A.ball, taper = A.taper;
  const cap = A.cap || A.capsule || A.taper;
  const quad = A.wall, deck = A.flat;
  const glyph = A.glyph || A.glyphs || (() => {});
  const stop = A.stop || (() => {});
  const th = A.th || A.thing || (() => ({}));
  // Named `light`, not `lamp`, and the rename is the whole of items 163 and 168 — which are wrong
  // as written. They say this file "registers **zero** `light()` calls across both the second
  // bedroom and the study", and conclude two of the flat's rooms are lit only by the bulb
  // HomeWalls.ROOMS hangs in the middle of them. Neither is true. The file has had three lights
  // since it was written: the 次卧 ceiling fitting, the study's 台灯 clamped to the desk, and the
  // study's own ceiling batten. What it did not have was the word — the alias was spelled `lamp`,
  // so every grep for `light(` came back empty and the room read as unlit on paper.
  //
  // So the fix is the name, not two more lights. Adding real lights to satisfy a mistaken audit
  // would have cost frame time in a flat that is already carrying nine of them, to fix nothing.
  const light = A.light || (() => ({}));
  // Contact shadow. Passed this room's floor y explicitly: a shadow that defaults to y = .02
  // lands on the lobby three metres below.
  const F = A.y0 !== undefined ? A.y0 : (A.floorY !== undefined ? A.floorY : 3.10);
  const H = A.H !== undefined ? A.H : 2.60;
  const shade = (x, z, w, d, a) => { if (A.shade) A.shade(x, z, w, d, a, F + .020); };
  const Y = h => F + h;                       // heights are written as heights above this floor

  // Deterministic. A junk room is mostly generated clutter, and clutter that reshuffles every
  // time the flat is rebuilt is a room the player can never learn the shape of.
  let seed = 20260804 >>> 0;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // ---------------------------------------------------------------------------- room extents
  const X0 = -6.00, X1 = -2.60;               // 次卧 in x
  const SX0 = -2.60, SX1 = -1.40;             // 书房 in x
  const Z0 = -5.00, Z1 = -1.40;               // both rooms in z
  const PT = .10;                             // partition thickness, centred on x = -2.60
  const PF = X1 - PT / 2;                     // -2.65, the partition's face on the bedroom side
  const PB = X1 + PT / 2;                     // -2.55, its face on the study side
  // The doorway between the two rooms. Widened from 0.80 on 2026-08-08 with the other four
  // in the flat: clampMove inflates each jamb by the 0.30 body radius, so 0.80 left a 0.20 m run
  // of legal centre positions, and .flatcheck.js samples the floor on a 0.10 m lattice — a 0.20
  // run passes only when a cell happens to land within millimetres of its middle. It did not here,
  // and the 次卧 read "0 cells at 0.2 m clearance" while showing a clean 100% on the plain fill.
  // The opening now runs the last 5 cm to the north return. The old decorative wall nib became a
  // 65 cm-deep obstruction after body padding, so the .95 m reveal carries a normal .89 m leaf
  // and gives the turn into both rooms a little tolerance.
  const DZ0 = -2.35, DZ1 = Z1, DTOP = 2.05;

  // ---------------------------------------------------------------------------- palette
  // Deliberately cheaper and greyer than the master bedroom's. This is the room that got the
  // furniture the living room replaced.
  const K = {
    wall:    C('#d3ccbc'), ceil: C('#ceccc2'),
    // Was #4a3628 / #78593f / #a8845c — the flat's three woods restated a unit or two off, which
    // is drift rather than a choice. FLAT_PALETTE (js/home-walls.js) holds the one set.
    woodD:   C(FLAT_PALETTE.woodD), woodM: C(FLAT_PALETTE.woodM), woodL: C(FLAT_PALETTE.woodL),
    ply:     C('#c1a077'), lam: C('#cbb896'),
    white:   C('#ceccc2'), cream: C('#e3d8c3'), linen: C('#d3ccbc'),
    card:    C('#b39a72'), cardD: C('#a7835b'), tape: C('#c8a877'),
    steel:   C('#aeb5bb'), steelD: C('#79818a'), chrome: C('#bfc6cb'),
    black:   C('#171a1f'), char: C('#2e343b'), plastic: C('#c6c9c6'),
    jade:    C('#3f7564'), jadeL: C('#69a08a'), red: C('#a43c2c'), rust: C('#8a4a3c'),
    blue:    C('#3d6484'), navy: C('#2b3a4d'), sky: C('#c4dbea'),
    bag:     C('#84a8bf'), bagG: C('#8ba892'),
    warm:    C('#ffe9c2'), screen: C('#3b5468'), ink: C('#2b2620'),
    paper:   C('#cbc4b7'), gold: C('#c9a049'),
  };
  const G = { matte: .05, wood: .20, paint: .14, fabric: .03, metal: .55, plastic: .30 };
  // Material settings, repeated rather than reached for, so this file stands on its own. `matAmt`
  // is kept at .30 and `nrmAmt` well under 1: a photographed normal map at full strength on a
  // primitive that has no relief of its own tips whole faces away from the light and reads as
  // baked-in dirt rather than as grain.
  // "Repeated rather than reached for, so this file stands on its own" is what produced six carcass
  // timbers in one flat, and this room's bookcase is visible from the hall in the same frame as the
  // 主卧 wardrobe. FLAT_PALETTE (js/home-walls.js) is now the one kit; the file still stands alone
  // in the sense that matters — it owns every placement in here.
  //
  // PLASTER was the shell's old .65/.20/.25, which js/home-walls.js measured as too fine to resolve
  // at the distance these walls are seen from: one repeat lands at about 50 px and averages to flat
  // grey. It now carries the same painted plaster as every partition it meets.
  const TIMBER  = { ...FLAT_PALETTE.timber };
  const PLASTER = { ...FLAT_PALETTE.paint };
  const CLOTH   = { ...FLAT_PALETTE.cloth };
  // Shorthands. Batching groups by mesh, mode, corner radius and material, so the fewer distinct
  // combinations this file uses the fewer draw calls it costs. Nearly everything in here is one
  // of these six.
  const HARD = { hard: true, gloss: G.paint };                 // machined panel, mode 0
  const WOOD = { mode: 6, ...TIMBER };                          // rounded joinery
  const BOARD = { hard: true, mode: 6, gloss: G.wood, ...TIMBER }; // machined joinery
  const SOFT = { mode: 7, gloss: G.fabric, ...CLOTH };          // upholstery and bedding
  const LIT  = { hard: true, mode: 1 };                         // small emissive faces

  // =============================================================== the partition, x = -2.6
  // Built as boxes rather than as two quads because it is 100 mm thick and both of its faces are
  // seen from rooms in this file — a wall you can walk round the end of has to have an end.
  if (A.partitions !== false) {
    // `partition: true` — the walls-down setting in js/game.js (SET.wallsOff, via `hiddenProp`).
    // This file stood the x -2.60 wall before js/home-walls.js existed, so the flag has to be set
    // here too or the flat drops nine partitions and keeps one. Drawing only; `stop` is untouched.
    // Two pieces per stretch, matching js/home-walls.js:190: the bottom STUB carries no flag and
    // stays with the walls down, so the flat still reads as a plan and the doorway between DZ0 and
    // DZ1 comes out as a gap in it. Nothing here is a collider — `stop` below is untouched.
    const S = { hard: true, mode: 4, gloss: .10, ...PLASTER };
    const P = { ...S, partition: true };
    // The stub height, the 2 mm overlap that keeps the two boxes off a coincident horizontal
    // face, and the flag itself all live in `A.partition` (js/build.js `partitionSplit`). This
    // file states none of them, so it cannot drift from js/home-walls.js the way two hand-written
    // copies of the same three numbers eventually do.
    const stretch = (z0, z1) => A.partition(Y(0), H, (yc, hh, o) =>
      box(X1, yc, (z0 + z1) / 2, PT, hh, z1 - z0, K.wall, { ...S, ...o }));
    stretch(Z0, DZ0);                                                        // south of the door
    box(X1, Y((DTOP + H) / 2), (DZ0 + DZ1) / 2, PT, H - DTOP, DZ1 - DZ0, K.wall, P); // header
    stop(PF, PB, Z0, DZ0);
  }
  // The lining and architrave of the doorway, on both faces. A cased opening with no lining is
  // the single clearest tell that a wall is a slab with a hole punched in it.
  // The lining is part of the wall for walls-down purposes: an architrave surviving a partition
  // that has gone is the "skirting floating in front of a wall that had been taken" fault the
  // cutaway band comment in js/game.js records, reintroduced by a setting instead of by a number.
  const CASE = { hard: true, gloss: G.paint, partition: true };
  for (const zj of [DZ0, DZ1]) {
    const s = zj === DZ0 ? 1 : -1;
    box(X1, Y(DTOP / 2), zj + s * .022, PT + .004, DTOP, .044, K.cream, CASE);
    for (const fx of [PF - .010, PB + .010])
      box(fx, Y(DTOP / 2 + .02), zj + s * .034, .020, DTOP + .04, .068, K.white, CASE);
  }
  box(X1, Y(DTOP + .022), (DZ0 + DZ1) / 2, PT + .004, .044, DZ1 - DZ0, K.cream, CASE);
  for (const fx of [PF - .010, PB + .010])
    box(fx, Y(DTOP + .034), (DZ0 + DZ1) / 2, .020, .068, DZ1 - DZ0 + .136, K.white, CASE);

  // ---- the leaf, hinged on the north jamb and standing open into the bedroom, because a spare
  // room's door is open unless somebody is sleeping in it. rotY(a) sends +z to (sin a, cos a), so
  // a leaf that hangs toward -z when shut swings toward -x for a positive angle.
  {
    // 1.52 rad, not 1.15, and the collider is derived rather than written down. At 1.15 the leaf
    // stood a third of the way across its own doorway and its axis-aligned collider covered
    // z -1.94..-1.46 — 0.44 m of an 0.80 m opening. `clampMove` adds the 0.30 body radius to each
    // side of what is left, so the 次卧 was sealed: measured by flood-filling the flat's walkable
    // floor from the front door, it had 0 reachable cells. The room existed and nothing could
    // enter it.
    //
    // At 1.52 the leaf lies almost flat against the partition, which is where an open door in a
    // spare room actually sits. The .89 m leaf fits cleanly inside the current .95 m reveal.
    const a = 1.52, hx = X1, hz = DZ1 - .02, half = .445, T = .042;   // half the .89 leaf in the .95 reveal
    const cx = hx - Math.sin(a) * half, cz = hz - Math.cos(a) * half;
    box(cx, Y(1.01), cz, T, 1.98, .89, K.cream, { hard: true, gloss: G.paint, ry: a });
    // Two sunk panels, so a two-metre door is not one blank sheet.
    for (const dy of [-.44, .44])
      box(cx - Math.sin(a) * .002 + .0, Y(1.01 + dy), cz, .050, .74, .64, K.linen,
        { hard: true, gloss: G.paint, ry: a });
    cap(cx - Math.sin(a) * (half - .09), Y(1.02), cz - Math.cos(a) * (half - .09),
      .019, .13, .019, K.chrome, { gloss: G.metal, ry: a });
    // THE LEAF NO LONGER HAS A COLLIDER, and that is the second half of the 次卧 fix.
    //
    // The derived footprint that used to stand here was an improvement on the box drawn round
    // where the door used to be — it moved with `a`, which is why the room stopped reading as
    // sealed. It was still wrong in kind. At a = 1.52 the leaf's true extent in z is 0.081 m, and
    // clampMove inflates that to 0.681 m of denied centre positions lying directly across the only
    // way into the room. Measured when the doorway was 0.90: the opening's own run of legal
    // centres is z -2.05 .. -1.75, and the leaf's inflated footprint reaches -1.83, eating a
    // quarter of it and leaving 0.22 — under the 0.30 that .flatcheck.js's lattice can resolve.
    // The room failed again, on the leaf rather than on the wall.
    //
    // So: geometry, not collision. An open internal door you can walk through is a small lie; a
    // spare bedroom you cannot enter is a broken room, and this leaf has now caused that twice.
    // The two leaves js/home-walls.js hangs carry no collider for the same reason.
    //
    // ponytail: if this door is ever made to swing and latch, the SHUT state needs a collider —
    // derive it from the angle as before, start it `open`, and re-run node .flatcheck.js --full.
  }

  // =============================================================== 次卧 · the second bedroom
  // ---------------------------------------------------------------- window, west wall x = -6.0
  // The exterior wall belongs to the shell, so this is a frame, a sill, a blind and a pale pane
  // standing 15–40 mm proud of x = -6.0. It reads as a curtained window whether or not the shell
  // has cut an opening behind it, and nothing here is coplanar with the wall plane.
  const WZ = -2.60, WW = 1.20, WSILL = .95, WHEAD = 2.05;
  {
    const fx = X0 + .035;
    box(X0 + .105, Y(WSILL - .025), WZ, .21, .050, WW + .16, K.white, { hard: true, gloss: .18 });
    for (const s of [-1, 1])                                       // jambs
      box(fx, Y((WSILL + WHEAD) / 2), WZ + s * (WW / 2 - .035), .070, WHEAD - WSILL, .070,
        K.white, { hard: true, gloss: G.paint });
    box(fx, Y(WHEAD - .035), WZ, .070, .070, WW, K.white, { hard: true, gloss: G.paint });
    box(fx, Y((WSILL + WHEAD) / 2), WZ, .058, WHEAD - WSILL - .07, .050, K.white,
      { hard: true, gloss: G.paint });                             // centre mullion
    // Daylight. Kept dim on purpose: a window is a small bright face, not a lightbox, and this
    // one has a blind three-quarters down over it anyway.
    for (const s of [-1, 1])
      quad(X0 + .012, Y((WSILL + WHEAD) / 2), WZ + s * .29, WW / 2 - .10, WHEAD - WSILL - .09,
        Math.PI / 2, K.sky, { mode: 1, glow: .05, gloss: .40 });
    // ---- 窗帘 · a roller blind, pulled down to about a third. Nobody in a store room raises it.
    const BH = .74, BBOT = WHEAD - .02 - BH;
    cyl(X0 + .055, Y(WHEAD - .015), WZ, .028, WW + .06, K.steelD, { rx: Math.PI / 2, gloss: G.metal });
    box(X0 + .055, Y(BBOT + BH / 2), WZ, .034, BH, WW - .02, K.cream,
      { hard: true, mode: 7, gloss: G.fabric, tag: '窗帘' });
    box(X0 + .058, Y(BBOT + .014), WZ, .040, .028, WW - .01, K.linen,
      { hard: true, gloss: .16, tag: '窗帘' });                     // hem bar
    cap(X0 + .058, Y(BBOT - .085), WZ + WW / 2 - .09, .008, .16, .008, K.linen, { gloss: .12 });
    ball(X0 + .058, Y(BBOT - .175), WZ + WW / 2 - .09, .014, .020, .014, K.linen, { gloss: .18 });
    // ---- 空调 · the indoor head of a split unit, over the window where they always go.
    box(X0 + .125, Y(2.29), WZ + .05, .245, .300, 1.00, K.white, { gloss: .26, tag: '次卧空调' });
    box(X0 + .225, Y(2.155), WZ + .05, .105, .048, .900, K.char,
      { hard: true, gloss: .22, tag: '次卧空调' });                     // the outlet louvre
    box(X0 + .105, Y(2.435), WZ + .05, .200, .022, .960, K.linen, { hard: true, gloss: .20, tag: '次卧空调' });
    box(X0 + .238, Y(2.235), WZ + .40, .022, .030, .090, K.steelD, { hard: true, gloss: .30, tag: '次卧空调' });
  }

  // ---------------------------------------------------------------- 单人床 · the single bed
  // Along the south wall, with the head to the west. Everything about it is one size down from
  // the bed in the master bedroom, because it is the bed that was here first.
  const BX = -5.00, BZ = -4.50;
  {
    for (const [ox, oz] of [[-.80, -.36], [.80, -.36], [-.80, .36], [.80, .36]])
      taper(BX + ox, Y(.15), BZ + oz, .085, .30, .085, K.woodD, WOOD);
    box(BX, Y(.30), BZ, 1.88, .26, .91, K.woodM, WOOD);
    box(BX, Y(.475), BZ, 1.84, .20, .88, K.white, SOFT);                       // mattress
    box(BX - .925, Y(.66), BZ, .080, .94, .95, K.woodD, WOOD);                 // headboard
    // ---- what is actually on it, which is the point of the room.
    // Three folded quilts at the foot, squared off the way they come back from the airing.
    [[.60, K.jade, .78], [.735, K.cream, .74], [.858, K.rust, .70]].forEach(([y, c, w], i) => {
      box(-4.40, Y(y), BZ + (i - 1) * .02, w, .125, .80, c, { ...SOFT, ry: (i % 2 ? .04 : -.05), tag: '被子' });
    });
    // Seasonal bedding, compressed flat in vacuum bags — the most Chinese object in the flat.
    box(-5.42, Y(.615), BZ - .11, .70, .215, .52, K.bag, { mode: 7, gloss: .24, ry: .09, tag: '被子' });
    box(-5.40, Y(.815), BZ - .06, .66, .185, .48, K.bagG, { mode: 7, gloss: .24, ry: -.06, tag: '被子' });
    for (const [x, z] of [[-5.42, BZ - .11], [-5.40, BZ - .06]])               // the valve on each
      cyl(x + .19, Y(z === BZ - .11 ? .726 : .911), z + .16, .028, .014, K.steelD, { gloss: .35 });
    // A stack of clothes somebody folded and never put away.
    for (let i = 0; i < 4; i++)
      box(-4.94, Y(.60 + i * .052), BZ + .30, .40, .048, .34,
        [K.linen, K.blue, K.white, K.jadeL][i], { hard: true, mode: 7, gloss: G.fabric, ry: (rnd() - .5) * .16 });
    // And a carton that got put on the bed because there was nowhere else.
    box(-4.86, Y(.72), BZ - .30, .40, .30, .34, K.card, { hard: true, gloss: G.matte, ry: -.11 });
    box(-4.86, Y(.872), BZ - .30, .30, .012, .09, K.tape, { hard: true, gloss: .10, ry: -.11 });
    shade(BX, BZ, 2.06, 1.10, .42);
    stop(-5.98, -4.02, Z0, -4.00);
  }

  // ---------------------------------------------------------------- 衣柜 · the wardrobe
  // Against the north wall, and the thing on top of it is half of why this room exists.
  const WX = -4.55, WDZ = -1.72, WH = 2.05;
  {
    box(WX, Y(WH / 2), WDZ, 1.50, WH, .60, K.woodL, { ...WOOD, tag: '次卧衣柜' });
    box(WX, Y(WH + .028), WDZ, 1.56, .056, .64, K.woodD, { hard: true, mode: 6, gloss: G.wood, tag: '次卧衣柜' });
    for (const s of [-1, 1]) {
      const dx = s * .375;
      // Front face steps 12 mm clear of the carcass front, because a door panel flush with the
      // box behind it is a wall of stripes the moment the camera moves.
      box(WX + dx, Y(1.03), WDZ - .307, .715, 1.92, .046, K.woodM, { hard: true, mode: 6, gloss: G.wood, tag: '次卧衣柜' });
      box(WX + dx, Y(1.03), WDZ - .318, .62, 1.78, .026, K.lam, { hard: true, mode: 6, gloss: G.wood, tag: '次卧衣柜' });
      cap(WX - s * .028, Y(1.03), WDZ - .345, .017, .21, .017, K.gold, { gloss: G.metal, tag: '次卧衣柜' });
    }
    // ---- 行李箱 · the suitcase, lying flat on top. One case a year, so up it goes.
    const LX = -5.00, LZ = -1.76;
    box(LX, Y(WH + .195), LZ, .76, .27, .50, C('#5b6b7c'), { gloss: .26, tag: '行李箱' });
    for (const dz of [-.15, 0, .15])
      box(LX, Y(WH + .335), LZ + dz, .70, .020, .055, C('#4c5a63'), { hard: true, gloss: .28, tag: '行李箱' });
    box(LX, Y(WH + .195), LZ - .262, .74, .030, .020, C('#3d444b'), { hard: true, gloss: .30, tag: '行李箱' });
    cap(LX + .28, Y(WH + .345), LZ, .016, .19, .016, K.chrome, { rz: Math.PI / 2, gloss: G.metal, tag: '行李箱' });
    box(LX - .30, Y(WH + .225), LZ + .19, .09, .055, .012, K.linen, { hard: true, gloss: .12, tag: '行李箱' });
    // ---- and the rest of the top: two more bags of bedding and a carton.
    box(-4.14, Y(WH + .155), WDZ + .02, .58, .19, .46, K.bagG, { mode: 7, gloss: .22, ry: .07 });
    box(-4.10, Y(WH + .325), WDZ - .01, .54, .16, .42, K.bag, { mode: 7, gloss: .22, ry: -.10 });
    box(-3.98, Y(WH + .16), WDZ - .04, .40, .32, .34, K.cardD, { hard: true, gloss: G.matte, ry: .13 });
    shade(WX, WDZ, 1.62, .74, .40);
    stop(-5.32, -3.78, -2.06, Z1);
  }

  // ---------------------------------------------------------------- 纸箱 · the carton stack
  // North-west corner, three high, the top one still open. Cardboard is the material of a Chinese
  // move and it never entirely leaves the flat.
  {
    box(-5.63, Y(.21), -1.79, .60, .42, .58, K.card, { hard: true, gloss: G.matte, tag: '东西' });
    box(-5.63, Y(.425), -1.79, .50, .014, .10, K.tape, { hard: true, gloss: .12, tag: '东西' });
    box(-5.61, Y(.58), -1.80, .56, .32, .52, K.cardD, { hard: true, gloss: G.matte, ry: .09, tag: '东西' });
    box(-5.65, Y(.845), -1.78, .44, .21, .40, K.card, { hard: true, gloss: G.matte, ry: -.12, tag: '东西' });
    for (const s of [-1, 1])                                    // the top carton's open flaps
      box(-5.65 + s * .21 * Math.cos(-.12), Y(1.02), -1.78 - s * .21 * Math.sin(-.12),
        .05, .30, .38, K.card, { hard: true, gloss: G.matte, ry: -.12, rz: s * .42, tag: '东西' });
    // Written on the side in marker, the way every carton in every Chinese flat is.
    glyph(-5.325, Y(.30), -1.79, Math.PI / 2, '冬被',
      { size: .062, gap: .018, vertical: true, lift: .006, color: K.ink, gloss: G.matte, tag: '东西' });
    shade(-5.63, -1.79, .72, .70, .38);
    stop(-5.97, -5.29, -2.14, Z1);
  }

  // ---------------------------------------------------------------- 健身车 · the exercise bike
  // Bought in January. Used in January. It is now the room's one clothes horse. The redundant
  // floor drying rack used to fill the opposite side of this 3.4 m room even though the service
  // balcony already owns a ceiling rack; removing that duplicate restores a direct window-to-door
  // sightline. The bike moves 25 cm toward the partition so the useful centre aisle widens without
  // hiding it behind the bed or changing the lived-in story.
  const EX = -3.05, EZ = -3.55;
  {
    const M = { gloss: G.metal };
    for (const dz of [-.50, .50])
      box(EX, Y(.045), EZ + dz, .58, .09, .09, K.char, { hard: true, gloss: .30 });
    cap(EX, Y(.405), EZ - .075, .038, .905, .038, C('#7d1f18'), { rx: .800, ...M });   // spine
    cap(EX, Y(.79), EZ + .27, .030, .26, .030, K.steelD, { rx: -.15, ...M });          // seat post
    box(EX, Y(.94), EZ + .32, .15, .075, .30, K.black, { gloss: .26 });                // saddle
    cap(EX, Y(.68), EZ - .34, .030, .70, .030, K.steelD, { rx: .10, ...M });           // stem
    cap(EX, Y(1.03), EZ - .30, .022, .46, .022, K.black, { rz: Math.PI / 2, gloss: .26, tag: '自行车' });
    for (const s of [-1, 1])
      cap(EX + s * .225, Y(.96), EZ - .27, .020, .17, .020, K.black, { rx: .55, rz: s * .12, gloss: .26 });
    box(EX, Y(1.13), EZ - .32, .17, .10, .055, K.char, { hard: true, gloss: .30 });    // console
    quad(EX, Y(1.13), EZ - .350, .13, .062, 0, C('#2c4a37'), { mode: 1, glow: .05, gloss: .3 });
    cyl(EX, Y(.34), EZ - .21, .205, .055, K.steelD, { rz: Math.PI / 2, gloss: .48, tag: '自行车' });
    cyl(EX, Y(.34), EZ - .21, .075, .075, K.char, { rz: Math.PI / 2, gloss: .40 });
    for (const s of [-1, 1]) {
      cap(EX + s * .075, Y(.34), EZ - .21, .014, .19, .014, K.steelD, { rz: s * 1.0, gloss: .45 });
      box(EX + s * .13, Y(.245 + s * .11), EZ - .21, .05, .022, .13, K.black, { hard: true, gloss: .28 });
    }
    // The jacket over the handlebars, which is what the bike is for now.
    box(EX, Y(.80), EZ - .40, .44, .50, .085, C('#44586f'), { hard: true, mode: 7, gloss: G.fabric, tag: '次卧衣服' });
    for (const s of [-1, 1])
      box(EX + s * .245, Y(.76), EZ - .38, .095, .40, .075, C('#44586f'),
        { hard: true, mode: 7, gloss: G.fabric, rz: s * .10 });
    shade(EX, EZ - .08, .70, 1.20, .34);
    stop(EX - .36, EX + .36, EZ - .67, EZ + .65);
  }

  // ---------------------------------------------------------------- the corners
  {
    // 电风扇 · a pedestal fan, out of season, shoved against the partition.
    const fx = -2.90, fz = -4.72;
    cyl(fx, Y(.035), fz, .190, .070, K.plastic, { gloss: G.plastic });
    cyl(fx, Y(.435), fz, .028, .730, K.plastic, { gloss: G.plastic });
    cyl(fx, Y(.905), fz, .195, .085, K.plastic, { rx: Math.PI / 2, gloss: .22 });
    cyl(fx, Y(.905), fz - .055, .165, .020, K.steelD, { rx: Math.PI / 2, gloss: .40 });
    cyl(fx, Y(.905), fz - .068, .050, .020, K.plastic, { rx: Math.PI / 2, gloss: .25 });
    shade(fx, fz, .44, .44, .30);
    // The 38 cm fan base is light enough to slide; a stop would inflate it into a 1.04 m obstacle
    // and join the bike to the south wall across the room's only clear turn.

    // A folding stool, the kind that lives against every wall in China.
    const sx = -3.92, sz = -4.58;
    cyl(sx, Y(.415), sz, .155, .038, K.red, { gloss: G.plastic });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + .78;
      taper(sx + Math.cos(a) * .075, Y(.20), sz + Math.sin(a) * .075, .036, .42, .036, K.red,
        { rz: -Math.cos(a) * .22, rx: Math.sin(a) * .22, gloss: G.plastic });
    }
    shade(sx, sz, .38, .38, .28);
    // Likewise the folding stool yields when touched. Its old 36 cm stop denied almost a square
    // metre after body padding despite being small enough to pick up with one hand.

    // A rolled floor mat and a length of skirting board, leaning in the south-east corner. The
    // leftovers of a job somebody did to the flat and never finished carrying out.
    cap(-2.78, Y(.66), -4.90, .062, 1.30, .062, C('#8d8579'), { rz: .11, rx: -.06, gloss: .12 });
    box(-2.84, Y(.60), -4.84, .045, 1.22, .105, K.woodL, { hard: true, mode: 6, gloss: G.wood, rz: .16 });

    // A carrier bag of empty bottles, waiting to go down to the man who buys them.
    taper(-3.06, Y(.155), -2.58, .24, .31, .21, C('#dad6cd'), { gloss: .34 });
    for (const [dx, dz] of [[-.05, .02], [.04, -.03], [.00, .06]])
      cyl(-3.06 + dx, Y(.355), -2.58 + dz, .030, .10, C('#9fb6a8'), { gloss: .45, rz: dx * 2 });
    // A carrier bag yields when you brush past it. Making this little soft bag a hard stop joined
    // the wardrobe's inflated footprint to the exercise bike's and sealed the whole back half of
    // the room; leave its visible geometry in place, but keep the only route through the clutter.

    // Hooks on the back of the door wall, with the bags that live on them. The back of a bedroom
    // door in a Chinese flat is a wardrobe.
    box(PF - .010, Y(1.70), -4.00, .020, .050, .80, K.woodM, { hard: true, mode: 6, gloss: G.wood });
    [-4.30, -4.10, -3.90, -3.70].forEach((z, i) => {
      cap(PF - .030, Y(1.665), z, .010, .075, .010, K.chrome, { rz: Math.PI / 2 - .5, gloss: G.metal });
      if (i === 1 || i === 3) {
        const c = i === 1 ? C('#684a37') : C('#3b5468');
        cap(PF - .046, Y(1.55), z, .009, .22, .009, c, { gloss: .18 });
        box(PF - .086, Y(1.30), z, .085, .30, .24, c, { hard: true, mode: 7, gloss: G.fabric });
      }
    });
  }

  // ---------------------------------------------------------------- light
  {
    const lx = -4.32, lz = -3.16;
    cyl(lx, Y(H - .055), lz, .195, .085, K.white, { mode: 1, glow: .12, gloss: .10 });
    cyl(lx, Y(H - .018), lz, .215, .034, K.steel, { gloss: .38 });
    light(lx, Y(H - .20), lz, K.warm, .85, 3.30);
  }

  // ---------------------------------------------------------------- 次卧 · the words in it
  // ---------------------------------------------------------------- what the room still owed
  //
  // Three things the brief at the head of this file names and the build never delivered: the
  // vacuum-bagged winter quilts, the folding bed, and a string of drying chillies at the window.
  // All three are the same argument — a 次卧 is where the flat overflows, and overflow is objects
  // stored in the wrong shape.
  //
  // 真空袋 · the compressed quilts, flat on the wardrobe beside the suitcase. This is the prop
  // that makes the room read as overflow rather than as spare: a quilt in a vacuum bag is a quilt
  // somebody has decided will not be needed for six months. Squashed proportions on purpose —
  // 0.62 × 0.14 for something that is 0.62 × 0.40 loose is the whole visual joke.
  for (const [bx, bz, bw, bc] of [[-4.14, -1.80, .62, K.bag], [-4.16, -1.62, .54, K.bagG]]) {
    box(bx, Y(2.14), bz, bw, .135, .44, bc,
      { mode: 7, gloss: .26, ry: .06, tag: '次卧衣柜', ...CLOTH });
    box(bx, Y(2.21), bz, bw - .10, .010, .36, K.white,
      { hard: true, gloss: .30, ry: .06, tag: '次卧衣柜' });
    cyl(bx + bw / 2 - .07, Y(2.20), bz - .13, .026, .030, K.plastic,
      { gloss: .34, tag: '次卧衣柜' });
  }
  // 折叠床 · the folding bed, on its edge against the study partition. What a Chinese 次卧 keeps
  // for the relative who stays two nights a year, and it lives folded for the other 363.
  //
  // x -2.78 with a 0.25 thickness leans it to -2.905 .. -2.655, which clears the partition's own
  // collider at -2.65 by 5 mm. It carries no `A.stop` of its own: this room has 1.6 m² of
  // standable floor in twelve, and a folded bed against a wall is exactly the object you would
  // squeeze past rather than the one you would walk into.
  {
    const fx = -2.78, fz = -3.55;
    box(fx, Y(.95), fz, .250, 1.86, .900, K.ply,
      { rz: .05, mode: 6, gloss: G.wood, tag: '折叠床', ...TIMBER });
    box(fx - .028, Y(.95), fz, .200, 1.78, .820, K.lam,
      { rz: .05, hard: true, gloss: .18, tag: '折叠床', ...TIMBER });
    for (const oy of [.30, 1.60])
      cap(fx - .040, Y(oy), fz, .022, .880, .022, K.steelD,
        { rz: Math.PI / 2 + .05, gloss: G.metal, tag: '折叠床' });
    for (const s of [-1, 1])
      cyl(fx - .010, Y(.06), fz + s * .38, .045, .026, K.black,
        { rx: Math.PI / 2, gloss: .30, tag: '折叠床' });
    shade(fx, fz, .34, .96, .34);
  }
  // 辣椒 · a string of them drying at the window. APARTMENT.md:130 asks for "a drying rack of
  // vegetables or chillies" in here and the chillies existed only in the kitchen, hung as cooking
  // stock. These are storage: a household that bought a catty in autumn and is drying them.
  {
    const cx = X0 + .12, cz = -3.34;
    cap(cx, Y(1.98), cz, .010, .620, .010, K.rust, { rz: Math.PI / 2 - 1.52, gloss: .18 });
    for (let i = 0; i < 11; i++) {
      const t = i / 10, hy = 1.96 - t * .62, sw = .10 + rnd() * .05;
      // One taper per chilli and no separate stalk. A 45 mm green cap on a 100 mm pod doubles the
      // prop count of this string for something under a centimetre on screen from anywhere in the
      // room — the jade tip is folded into the pod's own colour run instead.
      taper(cx + .014, Y(hy - sw / 2), cz + (rnd() - .5) * .05, .034, sw, .034,
        i % 4 === 3 ? K.rust : K.red,
        { rz: (rnd() - .5) * .5, rx: (rnd() - .5) * .4, gloss: .22, tag: '辣椒' });
    }
    th('辣椒', cx + .06, Y(1.62), cz, '辣椒是秋天买的，晾在窗户旁边。',
      'The chillies were bought in the autumn and hung to dry by the window.',
      '辣 hot + 椒 pepper. 干辣椒 gānlàjiāo is the dried one — a string of them keeps all winter ' +
      'and is why a northern kitchen never runs out.',
      { focus: [-5.28, WZ], reach: 1.9 });
  }

  th('衣柜', WX, Y(1.55), -2.10, '换季的衣服都放在次卧的衣柜里。',
    'The out-of-season clothes all go in the wardrobe in the spare room.',
    '衣 clothes + 柜 cabinet. Every flat has one; this is the one the good clothes are not in.',
    { focus: [WX, -2.72], reach: 1.7, tag: '次卧衣柜' });
  th('行李箱', -5.00, Y(2.38), -1.86, '行李箱一年用一次，就放在衣柜上面。',
    'The suitcase gets used once a year, so it lives on top of the wardrobe.',
    '行李 luggage + 箱 case. Up there since you came back at 春节, next to the winter quilts ' +
    'in their 真空袋 — 真空 vacuum + 袋 bag, which is how a flat this size stores bedding.',
    { focus: [-5.00, -2.66], reach: 2.1 });
  th('被子', -4.40, Y(.94), BZ, '床上堆着叠好的被子，没人睡这儿。',
    'Folded quilts are piled on the bed — nobody sleeps in here.',
    '被子 quilt. 一床被子 — quilts are counted with 床, the same word as bed.',
    { focus: [-4.40, -3.74], reach: 1.7 });
  th('东西', -5.63, Y(.72), -2.06, '这些东西一直没地方放。',
    'There has never been anywhere to put this stuff.',
    '东西 literally east-west, and it means things. 买东西 is to go shopping.',
    { focus: [-5.10, -2.62], reach: 1.8 });
  th('自行车', EX, Y(.98), EZ - .34, '这辆车买了三年，骑过两次。',
    'Three years since this bike was bought. Ridden twice.',
    '自行车 bicycle. 这台是健身车 — an exercise bike — but nobody at home calls it anything but 车.',
    { focus: [-3.86, EZ - .30], reach: 1.7 });
  th('窗帘', X0 + .06, Y(1.66), WZ, '窗帘一直拉着，这屋子白天也是暗的。',
    'The blind stays down; the room is dark even in the daytime.',
    '窗 window + 帘 hanging screen. 拉窗帘 to draw it.',
    { focus: [-5.28, WZ], reach: 1.9 });
  th('空调', X0 + .14, Y(2.29), WZ + .05, '次卧的空调坏了，还没找人来修。',
    'The air conditioner in here is broken and nobody has been called yet.',
    '空 air + 调 to adjust. 开空调 to put it on — if it worked.',
    { focus: [-5.14, WZ + .05], reach: 2.3, tag: '次卧空调' });
  th('衣服', EX, Y(.86), EZ - .40, '外套搭在健身车上。',
    'The jacket has been draped over the exercise bike.',
    '衣服 clothes. 搭在 dā zài means to drape something over a rail or another object.',
    { focus: [-3.82, EZ - .22], reach: 1.7 });

  // =============================================================== 书房 · the study
  // 1.2 m wide. The desk goes across the south end, the shelving down the east wall, and
  // everything that is not those two things is on the west wall or on the floor.
  const DX = -2.00, DTZ = -4.69, DTOPY = .7575;      // desk centre, and the working surface
  {
    // ---------------------------------------------------------------- 书桌 · the desk
    box(DX, Y(DTOPY - .0225), DTZ, 1.08, .045, .62, K.woodL, { ...BOARD, tag: '书桌' });
    box(DX, Y(DTOPY - .052), DTZ, 1.04, .014, .58, K.woodD, { hard: true, gloss: G.wood, tag: '书桌' });
    box(-2.505, Y(.375), DTZ, .035, .72, .58, K.woodM, { ...BOARD, tag: '书桌' });     // left end panel
    box(-2.10, Y(.50), -4.955, .84, .44, .030, K.woodM, { ...BOARD, tag: '书桌' });    // modesty panel
    // A three-drawer pedestal on the right. Fronts stand 12 mm proud of the carcass.
    box(-1.66, Y(.36), DTZ, .36, .70, .56, K.woodM, { ...BOARD, tag: '书桌' });
    [.15, .38, .61].forEach(y => {
      box(-1.66, Y(y), -4.384, .330, .195, .028, K.woodL, { hard: true, mode: 6, gloss: G.wood, tag: '书桌' });
      cap(-1.66, Y(y), -4.358, .014, .13, .014, K.chrome, { rz: Math.PI / 2, gloss: G.metal, tag: '书桌' });
    });
    // A desk mat, which is what stops the top reading as a bare plank.
    deck(-2.06, Y(DTOPY + .004), -4.62, .72, .34, C('#3d444b'), { mode: 7, gloss: .06, ...CLOTH });

    // ---- 电脑 · the computer. A monitor is a small bright face; .11 is bright enough to be the
    // brightest thing in the room at night and nowhere near a lightbox.
    box(-2.06, Y(DTOPY + .018), -4.86, .22, .036, .16, K.char, { hard: true, gloss: .34, tag: '电脑' });
    box(-2.06, Y(DTOPY + .115), -4.86, .05, .195, .04, K.char, { hard: true, gloss: .34, tag: '电脑' });
    box(-2.06, Y(1.145), -4.858, .52, .335, .030, K.char, { hard: true, gloss: .30, tag: '电脑' });
    quad(-2.06, Y(1.150), -4.831, .48, .295, 0, K.screen, { mode: 1, glow: .11, gloss: .35 });
    for (let i = 0; i < 5; i++)                                   // lines of something, on screen
      box(-2.15 + (i % 2) * .05, Y(1.245 - i * .042), -4.828, .26 - (i % 3) * .07, .011, .004,
        C('#a6c8de'), { ...LIT, glow: .07, tag: '电脑' });
    box(-2.06, Y(DTOPY + .013), -4.56, .40, .026, .135, K.char, { hard: true, gloss: .26, tag: '电脑' });
    box(-2.06, Y(DTOPY + .028), -4.56, .375, .006, .115, C('#3d444b'), { hard: true, gloss: .20, tag: '电脑' });
    ball(-1.79, Y(DTOPY + .020), -4.56, .034, .018, .052, K.char, { gloss: .30, tag: '电脑' });
    // The tower, on the floor under the desk where it collects dust.
    box(-2.34, Y(.22), -4.80, .20, .44, .42, K.char, { hard: true, gloss: .24, tag: '电脑' });
    box(-2.24, Y(.38), -4.80, .012, .10, .30, C('#3d444b'), { hard: true, gloss: .28, tag: '电脑' });
    box(-2.238, Y(.14), -4.86, .010, .020, .020, C('#7fe0a0'), { ...LIT, glow: .09, tag: '电脑' });

    // ---- 台灯 · the task lamp, clamped at the left where the light will not sit on the screen.
    cyl(-2.42, Y(DTOPY + .016), -4.82, .078, .032, K.char, { gloss: .34, tag: '次卧台灯' });
    cap(-2.40, Y(.98), -4.80, .017, .44, .017, K.char, { rz: -.14, rx: .06, gloss: .34, tag: '次卧台灯' });
    taper(-2.335, Y(1.185), -4.755, .135, .105, .135, K.char, { rx: .52, gloss: .28, tag: '次卧台灯' });
    cyl(-2.322, Y(1.128), -4.732, .058, .014, K.warm, { rx: .52, mode: 1, glow: .15, tag: '次卧台灯' });
    light(-2.24, Y(1.06), -4.62, K.warm, .55, 1.60);

    // ---- 保温杯 · the vacuum flask. There is one on every desk in this country.
    cyl(-1.88, Y(DTOPY + .100), -4.80, .038, .195, C('#5b6b7c'), { gloss: .50, tag: '杯子' });
    cyl(-1.88, Y(DTOPY + .120), -4.80, .040, .036, C('#8a3a2c'), { gloss: .40, tag: '杯子' });
    cyl(-1.88, Y(DTOPY + .213), -4.80, .040, .034, K.char, { gloss: .38, tag: '杯子' });
    cyl(-1.88, Y(DTOPY + .233), -4.80, .014, .012, K.steelD, { gloss: .45, tag: '杯子' });

    // ---- the pen pot, and a stack of 教辅 that came off the shelf and never went back.
    cyl(-1.63, Y(DTOPY + .052), -4.85, .043, .105, C('#68808d'), { gloss: .30 });
    [[.32, -.10], [-.24, .16], [.05, .02], [.48, -.22]].forEach(([a, b], i) => {
      cap(-1.63 + b * .05, Y(DTOPY + .155), -4.85 + a * .03, .0055, .17, .0055,
        [K.blue, K.red, K.char, K.jade][i], { rz: b * .9, rx: a * .5, gloss: .26 });
    });
    for (let i = 0; i < 4; i++)
      box(-2.40, Y(DTOPY + .019 + i * .031), -4.52, .195, .030, .265,
        [C('#8a4a3c'), C('#44586f'), C('#6a6a52'), C('#7b5b7a')][i],
        { hard: true, gloss: G.matte, ry: (rnd() - .5) * .22 });
    // Cables off the back edge, and the power strip they all go to.
    for (const [dz, c] of [[-.16, K.black], [-.02, K.white]])
      cap(-2.30 + dz, Y(.36), -4.93, .008, .74, .008, c, { rx: .18, rz: dz * 1.2, gloss: .20 });
    box(-2.46, Y(.026), -4.44, .095, .052, .275, K.white, { hard: true, gloss: .22 });
    box(-2.46, Y(.055), -4.44, .050, .008, .022, C('#e04a3a'), { ...LIT, glow: .06 });
    shade(DX, DTZ + .02, 1.16, .70, .40);
    stop(-2.56, -1.44, Z0, -4.36);

    // ---------------------------------------------------------------- 椅子 · the swivel chair
    const CX = -2.02, CZ = -4.02;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + .40;
      taper(CX + Math.cos(a) * .13, Y(.055), CZ + Math.sin(a) * .13, .075, .055, .26, K.char,
        { hard: true, gloss: .28, ry: -a, tag: '椅子' });
      ball(CX + Math.cos(a) * .245, Y(.030), CZ + Math.sin(a) * .245, .030, .030, .030, K.black,
        { gloss: .34, tag: '椅子' });
    }
    cyl(CX, Y(.28), CZ, .036, .42, K.steelD, { gloss: .48, tag: '椅子' });
    box(CX, Y(.50), CZ, .45, .095, .43, C('#3d444b'), { ...SOFT, tag: '椅子' });
    box(CX, Y(.83), CZ + .215, .43, .56, .075, C('#3d444b'), { ...SOFT, rx: -.13, tag: '椅子' });
    for (const s of [-1, 1]) {
      cap(CX + s * .235, Y(.62), CZ + .04, .016, .21, .016, K.char, { gloss: .30, tag: '椅子' });
      box(CX + s * .235, Y(.73), CZ - .02, .055, .035, .21, K.char, { hard: true, gloss: .26, tag: '椅子' });
    }
    shade(CX, CZ, .60, .60, .34);
    // The chair is on casters in a room only 1.20 m wide. Even an 8 cm pedestal stop becomes a
    // 76 cm square after body padding and blocks the entire aisle between desk and bookcase.
    // Keep the visible five-star base; a moving desk chair yields when the player brushes past.

    // ---------------------------------------------------------------- 书架 · the bookcase
    // Floor to near-ceiling down the east wall. Its back stands 10 mm clear of x = -1.40 so it
    // never fights the wall behind it for the same pixels. The case is a real 21.5 cm-deep wall
    // unit, not the old 29 cm case: in a 1.20 m study that extra depth left only an 11 cm
    // comfort-clear body-centre aisle after the west partition was padded.
    const SFX = -1.533, SZ = -3.30, SL = 2.00, SH = 2.30, FRONT = -1.625;
    box(-1.425, Y(SH / 2), SZ, .030, SH, SL, K.woodD, { hard: true, mode: 6, gloss: G.wood, tag: '书架' });
    for (const dz of [-SL / 2 + .015, 0, SL / 2 - .015])
      box(SFX, Y(SH / 2), SZ + dz, .185, SH, .030, K.woodM, { ...BOARD, tag: '书架' });
    for (const [y, t] of [[SH - .020, .040], [.020, .040]])
      box(SFX, Y(y), SZ, .190, t, SL, K.woodM, { ...BOARD, tag: '书架' });
    const SHELVES = [.30, .66, 1.02, 1.38, 1.74, 2.10];
    // Muted first, bright as the exception. A shelf where every spine is saturated averages out
    // to a stripe of colour; a shelf that is mostly brown and grey is the one that reads as books.
    const SPINE = ['#6d5442', '#7a6a58', '#4e5a63', '#8a7a63', '#59503f', '#3f4a52', '#6b6152',
                   '#7d6b76', '#94856b', '#3d3f46', '#5c4a6b', '#6f6a55', '#a8452f', '#2f5f74',
                   '#4a6f4e', '#8a6a2c'].map(C);
    const PAGES = C('#ddd3bb');
    const titleable = [];
    for (const sy of SHELVES) {
      box(SFX, Y(sy), SZ, .180, .035, SL - .04, K.woodL, { ...BOARD, tag: '书架' });
      const top = Y(sy + .0175);
      let z = SZ - SL / 2 + .05;
      while (z < SZ + SL / 2 - .09) {
        const r = rnd();
        if (r < .07 && z > SZ - SL / 2 + .22) { z += .030 + rnd() * .055; continue; }
        if (r < .17) {                                   // a short flat stack, laid on its side
          const sw = .13 + rnd() * .06, n = 2 + ((rnd() * 3) | 0);
          for (let k = 0; k < n; k++) {
            const d = .14 + rnd() * .025, t = .028 + rnd() * .012;
            box(FRONT + d / 2, top + k * .034 + t / 2, z + sw / 2, d, t, sw,
              SPINE[(rnd() * SPINE.length) | 0], { hard: true, gloss: G.matte, ry: (rnd() - .5) * .10, tag: '书架' });
          }
          z += sw + .015; continue;
        }
        const w = .050 + rnd() * .055, h = .185 + rnd() * .140, d = .135 + rnd() * .030;
        const lean = r > .88 ? (rnd() - .5) * .26 : 0;
        const cs = Math.cos(lean), sn = Math.abs(Math.sin(lean));
        const cy = top + h / 2 * cs + w / 2 * sn;
        const c = SPINE[(rnd() * SPINE.length) | 0];
        box(FRONT + d / 2, cy, z + w / 2, d, h, w, c,
          { hard: true, gloss: G.matte, rx: lean, tag: '书架' });
        if (!lean && w > .068 && h > .25) titleable.push({ z: z + w / 2, cy, h, c });
        if (h > .245)                                     // cream page block, seen from above
          box(FRONT + d / 2 + .006, cy + h / 2 - .007, z + w / 2, d * .90, .013, w * .78, PAGES,
            { hard: true, gloss: G.matte, rx: lean, tag: '书架' });
        z += w + .008 + sn * .32;
      }
    }
    // ---- four spines with writing on them, spread over the case rather than stacked on
    // whichever books the generator laid down first. Ink is chosen off the spine's own luminance,
    // because one fixed colour disappears completely on half of them.
    ['汉语', '精讲', '中考', '古文'].forEach((txt, i) => {
      const b = titleable[Math.min(titleable.length - 1,
        Math.floor((i + .5) * titleable.length / 4))];
      if (!b) return;
      const lum = b.c[0] * .30 + b.c[1] * .59 + b.c[2] * .11;
      glyph(FRONT - .004, b.cy + b.h / 2 - .062, b.z, -Math.PI / 2, txt,
        { size: .034, gap: .009, vertical: true, lift: .004, tag: '书架', gloss: G.matte,
          color: lum > .52 ? C('#2b2620') : C('#efe4cd') });
    });
    // ---- 词典 · one fat volume you can actually pick out, standing at the end of a shelf.
    box(FRONT + .085, Y(.30 + .0175 + .135), SZ + .74, .170, .270, .072, C('#793025'),
      { hard: true, gloss: .12, tag: '词典' });
    box(FRONT + .083, Y(.30 + .0175 + .135), SZ + .74, .150, .245, .058, PAGES,
      { hard: true, gloss: G.matte, tag: '词典' });
    box(FRONT + .006, Y(.30 + .0175 + .135), SZ + .74, .012, .200, .058, C('#c9a049'),
      { hard: true, gloss: .22, tag: '词典' });
    // ---- box files, a tin, and magazines flat on the top shelf.
    for (let i = 0; i < 3; i++)
      box(FRONT + .083, Y(1.74 + .0175 + .155), SZ - .78 + i * .095, .165, .310, .088,
        [C('#4c5a63'), C('#6b5340'), C('#4c5a63')][i], { hard: true, gloss: .14, tag: '书架' });
    cyl(FRONT + .090, Y(2.10 + .0175 + .075), SZ + .62, .052, .150, C('#3f6b4e'), { gloss: .34, tag: '书架' });
    for (let i = 0; i < 5; i++)
      box(FRONT + .080, Y(2.10 + .0175 + .012 + i * .012), SZ + .10, .160, .011, .175,
        [K.linen, C('#8a6a52'), K.cream, C('#5f7386'), K.linen][i],
        { hard: true, gloss: G.matte, ry: (rnd() - .5) * .10, tag: '书架' });
    shade(SFX, SZ, .28, SL + .06, .36);
    // Stop begins just outside every visible face (including the slightly yawed labelled spines),
    // so the avatar never clips the shallower case even though the aisle is now honestly wider.
    stop(-1.63, -1.40, SZ - SL / 2, SZ + SL / 2);

    // ---------------------------------------------------------------- 打印机 · the printer
    // On the floor against the partition, because a 1.2 m wide room has no other flat surface
    // left and nobody was going to buy furniture for it.
    box(-2.44, Y(.11), -2.60, .38, .22, .34, C('#dad6cd'), { gloss: .24, tag: '打印机' });
    box(-2.44, Y(.232), -2.60, .35, .026, .31, C('#bfc5bd'), { hard: true, gloss: .30, tag: '打印机' });
    box(-2.44, Y(.20), -2.395, .30, .012, .16, K.paper, { hard: true, gloss: .10, rx: -.14, tag: '打印机' });
    box(-2.44, Y(.078), -2.435, .24, .012, .11, K.paper, { hard: true, gloss: .10, tag: '打印机' });
    box(-2.30, Y(.243), -2.72, .050, .010, .014, C('#7fe0a0'), { ...LIT, glow: .07, tag: '打印机' });
    cap(-2.55, Y(.10), -2.44, .008, .40, .008, K.black, { rx: 1.35, rz: .30, gloss: .20 });
    shade(-2.44, -2.60, .48, .44, .34);
    // Small floor clutter remains visible and interactive, but is not a metre-wide navigation
    // obstacle after the player's 30 cm collision radius is added on every side.

    // ---------------------------------------------------------------- the wall of 奖状
    // Certificates of merit, on the partition's study face. Three of them, and a calendar under.
    // If there is a child in this household this wall is where you find out.
    const AW = PB + .020;                       // 20 mm clear of the plaster, never coplanar
    [[-4.06, 1.72, C('#efe4cd')], [-3.62, 1.55, C('#efe4cd')], [-3.18, 1.74, C('#efe4cd')]]
      .forEach(([z, y, c], i) => {
        box(AW, Y(y), z, .016, .225, .310, C('#8a2c22'), { hard: true, gloss: .18 });
        box(AW + .006, Y(y), z, .008, .190, .275, c, { hard: true, gloss: .12 });
        if (i === 1)
          glyph(AW + .014, Y(y + .006), z, Math.PI / 2, '三好学生',
            { size: .034, gap: .010, lift: .004, color: C('#8a2c22'), gloss: G.matte });
        else
          for (let k = 0; k < 3; k++)         // ruled lines, at a distance you cannot read anyway
            box(AW + .012, Y(y - .02 + k * .035), z, .004, .006, .18 - k * .03,
              C('#a89880'), { hard: true, gloss: G.matte });
      });
    // 日历 · the wall calendar, the red-headed kind that comes free from the bank.
    box(AW, Y(1.24), -4.48, .016, .380, .285, K.paper, { hard: true, gloss: .12 });
    box(AW + .006, Y(1.375), -4.48, .008, .105, .270, C('#a53326'), { hard: true, gloss: .14 });
    glyph(AW + .014, Y(1.375), -4.48, Math.PI / 2, '八月',
      { size: .060, gap: .016, lift: .004, color: C('#efe4cd'), gloss: G.matte });
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 6; k++)
        box(AW + .012, Y(1.275 - r * .043), -4.48 - .105 + k * .042, .004, .016, .020,
          r === 1 && k === 3 ? C('#a53326') : C('#8d8579'), { hard: true, gloss: G.matte });
    cap(AW + .004, Y(1.445), -4.48, .006, .030, .006, K.steelD, { gloss: G.metal });

    // ---------------------------------------------------------------- light
    box(-2.00, Y(H - .045), -3.40, .300, .048, .820, K.white, { hard: true, mode: 1, glow: .10 });
    box(-2.00, Y(H - .018), -3.40, .340, .030, .870, K.steel, { hard: true, gloss: .36 });
    light(-2.00, Y(H - .22), -3.40, K.warm, .70, 3.00);
  }

  // ---------------------------------------------------------------- 书房 · the words in it
  th('书桌', DX, Y(.95), -4.32, '他每天晚上在这张书桌前写作业。',
    'He does his homework at this desk every evening.',
    '书 book + 桌 table. A 书桌 is for study; the one you eat at is a 餐桌.',
    { focus: [DX, -3.90], reach: 1.7 });
  th('电脑', -2.06, Y(1.16), -4.80, '电脑有点儿旧了，开机很慢。',
    'The computer is getting old — it takes forever to start.',
    '电 electric + 脑 brain. 上网 to go online, 关机 to shut it down.',
    { focus: [-2.06, -4.12], reach: 1.8 });
  th('台灯', -2.35, Y(1.16), -4.76, '写字的时候要开台灯，别伤眼睛。',
    'Put the desk lamp on when you write — do not ruin your eyes.',
    '台 desktop + 灯 lamp. The sentence every Chinese parent has said at this desk.',
    { focus: [-2.20, -4.14], reach: 1.8 });
  th('书架', -1.62, Y(1.46), -3.30, '书架上一半是课本，一半是教辅。',
    'Half the shelf is textbooks and half is exam-prep books.',
    '书 book + 架 rack. 教辅 is the supplementary drill book, and there is never only one.',
    { focus: [-2.16, -3.30], reach: 1.6 });
  th('词典', -1.60, Y(.57), -2.56, '查词典比问人快。',
    'Looking it up in the dictionary is faster than asking somebody.',
    '词 word + 典 canon. 查词典 to look a word up — which is what you are doing right now.',
    { focus: [-2.14, -2.56], reach: 1.5 });
  th('椅子', -2.02, Y(.88), -3.86, '这把椅子能转，坐着不舒服。',
    'The chair swivels and it is not comfortable.',
    '椅子 chair. 一把椅子 — chairs take 把, the measure word for things with handles.',
    { focus: [-2.02, -3.50], reach: 1.5 });
  th('打印机', -2.44, Y(.32), -2.60, '打印机没纸了。',
    'The printer is out of paper.',
    '打印 to print + 机 machine. 打印 is literally to strike a print.',
    { focus: [-1.94, -2.60], reach: 1.5 });
  th('杯子', -1.88, Y(1.00), -4.80, '桌上那个杯子是喝水用的。',
    'The cup on the desk is the one you drink water from.',
    '杯子 cup — the plain one. The tall one beside it is a 保温杯, which is a different object.',
    { focus: [-1.92, -4.20], reach: 1.7 });

  // ---------------------------------------------------------------- 保温杯 the vacuum flask
  //
  // APARTMENT.md:125 names it as a desk object and the desk had a 杯子, which is a mug. They are
  // not the same thing and the difference is the point: a mug goes cold and a 保温杯 does not,
  // which is why every desk, train seat and building site in the country has one on it and why
  // the note on 杯子 above used to have to explain a flask that was not there.
  //
  // Stood front-left of the desk, clear of the screen at x -2.06 and the clamped 台灯 at -2.35,
  // and inside the desk's own collider so it costs no floor.
  {
    const fx = -2.42, fz = -4.52;
    cyl(fx, Y(DTOPY + .095), fz, .039, .190, K.jade, { gloss: .34, tag: '保温杯' });
    cyl(fx, Y(DTOPY + .020), fz, .041, .040, K.steel, { gloss: .46, tag: '保温杯' });
    cyl(fx, Y(DTOPY + .205), fz, .036, .036, K.steelD, { gloss: .44, tag: '保温杯' });
    cyl(fx, Y(DTOPY + .232), fz, .033, .022, K.jadeL, { gloss: .38, tag: '保温杯' });
    box(fx, Y(DTOPY + .105), fz - .039, .046, .085, .008, K.gold,
      { hard: true, gloss: .40, tag: '保温杯' });
    th('保温杯', fx, Y(DTOPY + .42), fz, '保温杯里的水还是热的。',
      'The water in the flask is still hot.',
      '保 keep + 温 warm + 杯 cup. Filled from the 饮水机 in the morning and topped up all day; ' +
      'the leaves stay in it from one filling to the next.',
      { focus: [DX, -3.90], reach: 1.7 });
  }
};
