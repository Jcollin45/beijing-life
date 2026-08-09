// 玄关 — the entry hall
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
// ---------------------------------------------------------------------------------------------
// The 玄关 is not a hallway. It is the room where the flat decides you are allowed in, and the
// whole of it is organised around one rule that no Western entry has: shoes come off here. That
// rule is what puts a 1.4 m 鞋柜 across the short wall of a four-square-metre room, what makes
// two pairs of 拖鞋 sit on the floor pointing inwards, and what makes the floor finish change
// where the room ends. Everything else — the coat hooks, the key dish, the umbrella stand — is
// ordinary. The shoes are the room.
//
//   x 2.60 ································· 5.20
//         ┌───────────────────────────────────────┐  z 3.20 · the 走廊 wall, and the front door
//    走道 │ 挂钩  上联 ▓▓▓▓ 大门 ▓▓▓▓ 下联  开关  │
//    ←──  │ 外套              ↘ swings in      对讲│
//         │        拖鞋   ·doormat·         雨伞筒 │  ← the courier stands the far side of this
//         │  凳  鞋垫·鞋                 快递      │
//         │ ┌──────────────┬──────────┐    ┌─────┐│
//         │ │  低鞋柜 1.40 │ 高鞋柜.91│    │镜子 ││  ← mirror on the EAST wall, not opposite
//         └─┴──────────────┴──────────┴────┴─────┴┘  z 1.60      the door: 镜子不宜正对大门
//
// Three decisions worth writing down, because they are all geometry rather than taste.
//
// **The door is at the east end and the way out is at the west.** The 走道 opens off the x = 2.60
// wall and the 走廊 is beyond z = 3.20, so the two openings are on adjacent walls and the walk
// through this room is its long diagonal. That is the whole sequence a 玄关 is for: step over the
// mat, turn, put your shoes in the cabinet, step into slippers, go in. Had the door been at the
// west end you would have arrived already past everything.
//
// **The leaf hinges on its west jamb, so it only ever sweeps x ≥ 3.44.** The swing is a quarter
// disc centred on (3.44, 3.135) with a 0.92 m radius, and it has to stay empty: it is why the
// umbrella stand is in the far corner at x 4.98 and not beside the door where it would be handier,
// why the parcel sits at x 4.80, and why every soft thing — coats, slippers, the folded stool — is
// west of 3.44 where the door cannot reach it. The coats hang at x 2.92 and 3.10 for exactly this
// reason and for no other.
//
// **The mirror is on the east wall.** A mirror facing the front door is the one piece of Chinese
// domestic superstition that actually shows up in how flats are furnished — 镜子不宜正对大门 — so
// it goes on the wall perpendicular to the door, where you turn into it on the way out anyway.
//
// THE PARAGRAPH THAT USED TO BE HERE WAS OUT OF DATE, and it cost this room nine words. It said
// only headwords already in js/vocab.js could be `A.th` tags, because `Vocab.get` had no fallback
// and a thing the dictionary had never heard of was a crash on the frame you walked near it — so
// the whole shoe story was labelled 鞋, and 春联 / 福 / 钥匙 were painted rather than labelled.
//
// That crash was fixed on 2026-08-04 and .thingcheck.js's own header records it: the walk-up
// prompt falls back to the bare headword and `openWord` guards with `if (!e || doing) return;`.
// A missing row is now a content gap — an object you can walk up to and learn nothing from — not
// a crash. The same stale wording had already made an agent file the airport's hot-water urn
// under 水 to dodge a bug that no longer existed.
//
// So this room now labels what it builds: 春联 钥匙 鞋柜 拖鞋 门垫 挂钩 凳 对讲, alongside the
// 鞋 门 外套 镜子 雨伞 快递 it already had. Of those, 门垫 挂钩 凳 对讲 have no js/vocab.js row
// yet — the dictionary is lane 4's file — and are queued in .reports/vocab-rows-queue.md.
FlatFit['entry'] = A => {

  // ---------------------------------------------------------------- the frame
  //
  // `A` takes flat WORLD coordinates, so the floor of this room is DECK[2] itself and every
  // height below is written as F + h. `A.y0` is the shell's own accessor for the deck the room
  // being built stands on — it reads `deckY(curDeck)`, and world.js pins curDeck to 2 for every
  // room in the flat before calling this. Read once, because it is fixed for the whole call.
  // The literal is the contract value from APARTMENT.md and only stands in if the getter is gone.
  const F  = A.y0 !== undefined ? A.y0 : 3.10;
  const X0 = 2.60, X1 = 5.20, Z0 = 1.60, Z1 = 3.20;   // the room, per APARTMENT.md
  const CH = 2.60;                                     // ceiling height above F

  // The grid lines are taken to be the finished inner faces of the walls, which is the natural
  // reading of "x 2.6 .. 5.2" for a room you stand in. Everything that backs onto a wall therefore
  // stops 1.5–3 cm short of the line: if the shell's plaster is exactly on it that gap is a shadow
  // reveal, and if the shell insets its face by a few centimetres the object simply buries its back
  // in the wall, which is invisible either way. Nothing here is coplanar with a wall plane.

  // Contact shadows. The raw `Build.shade` defaults its quad to y = 0.020, which is the LOBBY
  // floor; the shell's `A.shade` wrapper does lift it to the current deck, but it lifts it to
  // +0.020 and several things in here sit on mats and trays at +0.016. So the height is passed
  // explicitly and 2 mm lower, which keeps every shadow under its object rather than through it.
  const shade = (x, z, w, d, a) => A.shade(x, z, w, d, a, F + .027);

  // Pivot about a vertical axis, for the door. `World`'s own `piv`/`hingeY` live inside its
  // closure and cannot be reached from out here, so they are written again. `setPart` does
  // `p.m = T · m0`, so T has to be a world-space transform, not a local one.
  const piv = (x, z, R) => M.mul(M.trans(x, 0, z), M.mul(R, M.trans(-x, 0, -z)));

  // ---------------------------------------------------------------- palette
  //
  // A Beijing entry hall is warm timber and pale stone with one red object in it. The joinery
  // colours are written a shade darker than they should look because every one of them is about
  // to be multiplied by a tiling photograph, and the maps brighten what they are laid over.
  const c = {
    oak    : C('#8a6a47'),   // the cabinet doors and carcass
    oakL   : C('#a7835b'),   // shelf edges, the lipped pulls
    oakD   : C('#5a4433'),   // plinths and the shadow gaps between units
    walnut : C('#42301f'),
    ink    : C('#24272b'),   // matte black: hooks, the trim line, hardware
    slab   : C('#bbb29f'),   // the cabinet top, a pale stone
    tile   : C('#8d8579'),   // the drop-zone floor
    tileD  : C('#7c756d'),
    cream  : C('#e6ded0'),
    white  : C('#e8ebe7'),
    steel  : C('#a4a9ac'),
    chrome : C('#bfc6cb'),
    brass  : C('#b3873c'),
    brassD : C('#8a6528'),
    gold   : C('#e3c470'),
    // The 防盗门. A high-rise front door here is a steel security door in a dark lacquer, not the
    // pillar-box red of a courtyard gate — but the flat's door has always been red and the player
    // knows it by that, so this is the same door taken two steps down: a deep maroon-brown that
    // still reads red against cream walls.
    door   : C('#8a3a2c'),
    doorD  : C('#67271e'),
    doorL  : C('#a44a35'),
    // 春联 red, and deliberately hotter and more orange than the door. Printed couplets are a
    // different red from any paint in a room, and matching the two makes the paper read as
    // joinery instead of as something stuck on.
    paper  : C('#bf2f26'),
    paperD : C('#96231d'),
    mirror : C('#c6d6dc'),
    coir   : C('#4a4038'),   // the doormat
    coirL  : C('#655648'),
    jade   : C('#3f7564'),
    navy   : C('#2b3a4d'),
    plum   : C('#7a3f52'),
    leaf   : C('#42794a'),
    lining : C('#efe4cd'),   // shoe linings, the inside of the slippers
    warm   : C('#ffe9c2'),   // every lit thing in here is this one colour
  };

  // Materials. Five, reused everywhere, because build.js batches on
  // (mesh, mode, radius, textures, matScale, matAmt, nrmAmt) and a room that invents a sixth
  // timber pays a draw call for it. `nrmAmt` is 0.30 throughout: the default of 1 lays the whole
  // relief of the photograph over a primitive that has none, which on cabinet doors is a grey
  // cloud rather than grain.
  // "A room that invents a sixth timber pays a draw call for it" was right and understated: the
  // FLAT had six, one per module, so every carcass in the place was its own batch. Timber, cloth
  // and metal now come from FLAT_PALETTE (js/home-walls.js) and batch with the rest of the flat.
  // The 玄关's own two floor materials stay local — it is the only room with a stone threshold.
  const Mtimber = { ...FLAT_PALETTE.timber };
  const Mstone  = { mat:'paving',  matScale:.70,  matAmt:.22, nrmAmt:.30 };
  const Mfloor  = { mat:'tile',    matScale:.42,  matAmt:.24, nrmAmt:.30 };
  const Mcloth  = { ...FLAT_PALETTE.drape };
  const Mmetal  = { ...FLAT_PALETTE.fitting };

  const G = { matte:.06, wood:.20, paint:.15, cloth:.04, metal:.58, lacq:.34 };

  // ================================================================ 地面 the floor
  //
  // The 玄关 is tiled and the rest of the flat is not. That change of finish is not decoration:
  // it is the 落尘区, the strip of hard floor by the door that outdoor shoes are allowed to stand
  // on, and it is why a Chinese flat has a visible line across its entrance and a Western one does
  // not. The line here runs down x ≈ 2.66, at the 走道 opening, with a brass 过门石 strip over the
  // change — which is where the joint goes when the entry and the hall are different rooms.
  //
  // Laid OVER whatever the shell puts down rather than replacing it, so a change of floor in
  // world.js still shows through at the edges of this room instead of leaving a hole.
  //
  // The heights below are not arbitrary and must not be lowered. world.js lays the flat's floor at
  // `y2 + .004`, which on this deck is exactly F + .004 — so the first version of this tile field,
  // written at F + .004 to sit "4 mm over" the deck, was precisely coplanar with it. Two full-room
  // quads at one height is the worst case of the z-fighting this file warns about everywhere else,
  // and the render showed the shell's boards winning outright: the 落尘区 was simply not there.
  // Everything that lies flat in this room is therefore on a ladder starting at F + .014, with at
  // least 3 mm between any two quads that share a footprint.
  A.flat(3.93, F + .014, 2.40, 2.48, 1.56, c.tile, { mode:9, gloss:.16, ...Mfloor });
  // Two darker tiles laid off-pattern, because a floor of one flat colour reads as paint.
  // The second of these was at (4.55, 2.85), where its east edge lapped 30 mm over the doormat at
  // a height difference of 1 mm — invisible head-on and a band of stripes at a grazing angle.
  // Moved east so no two quads on adjacent rungs of the ladder share any footprint at all.
  for (const [tx, tz] of [[3.20, 2.05], [4.74, 2.88], [2.98, 2.90], [4.92, 2.12]])
    A.flat(tx, F + .019, tz, .58, .58, c.tileD, { mode:9, gloss:.16, ...Mfloor });
  // 过门石 — the threshold strip at the 走道 opening.
  A.flat(2.665, F + .023, 2.40, .075, 1.56, c.brass, { mode:1, glow:.03, gloss:G.metal });

  // ================================================================ 墙 the two inner faces
  //
  // world.js builds "the envelope only ... everything that stands inside these walls belongs to
  // one of the ten room files". That is literal: the shell puts up the z = 3.20 corridor wall with
  // this room's doorway in it, and nothing else. A probe of the built scene found no geometry at
  // all on z = 1.60 or on x = 5.20 — so the 玄关 was a room with one wall, the mirror was screwed
  // to thin air, and standing at the 鞋柜 you looked straight over it into the 客厅 and the 餐厅.
  //
  // Both faces are set a few millimetres INSIDE the grid line rather than on it, and this is the
  // whole reason the numbers are 1.612 and 5.188 rather than 1.600 and 5.200:
  //
  //   · z = 1.60 is shared with the 客厅 (x 2.6..3.4) and the 餐厅 (x 3.4..5.2), both being written
  //     right now by other agents. Every surface here is one-sided, so the correct thing for two
  //     rooms sharing a partition is one inner face each, back to back, and the cavity between them
  //     is never seen from either side. If they line their side on 1.600 facing -z and this one is
  //     on 1.600 facing +z, the two quads are coplanar and the partition flickers in stripes. Eight
  //     millimetres of offset makes that impossible however they build it, and costs nothing.
  //   · x = 5.20 has no other claimant: the strip x 5.2..6.0, z 1.6..3.2 is not in APARTMENT.md's
  //     room table at all, so it is a void behind this wall and nobody will ever line it.
  //
  // Colour and material come off `A.col`/`A.MAT` rather than this file's own palette, so the two
  // faces are the same plaster as the rest of the flat instead of nearly the same.
  const PL = { ...A.MAT.plaster };
  A.wall(3.90, F + CH / 2, 1.612, 2.60, CH, 0, A.col.wall, PL);            // south, faces +z
  A.wall(5.188, F + CH / 2, 2.40, 1.60, CH, -Math.PI / 2, A.col.wall, PL); // east,  faces -x
  // Solid, both of them. The only way out of the 玄关 on the inside is west into the 走道 — that
  // is what makes this a room you pass through rather than a corner of the living room.
  A.stop(2.60, 5.20, 1.55, 1.66);
  A.stop(5.13, 5.24, 1.60, 3.20);
  // Skirting to match the shell's, along the one stretch of these two walls that is not hidden
  // behind a cabinet. 30 mm thick, its back 2 mm inside the wall face so the two are never
  // coplanar, and it stops below the mirror (glass starts at F + 0.515) so they cannot intersect.
  A.box(5.175, F + .065, 2.62, .030, .130, 1.14, A.col.trim,
    { hard:true, mode:6, gloss:G.wood, ...Mtimber });

  // ================================================================ 大门 the front door
  //
  // The opening is x 3.44 .. 4.36 by 2.06 high, in the z = 3.20 wall. The corridor face of this
  // door belongs to the 走廊 — the flat number, the neighbours' doors, whatever is pasted out
  // there — so nothing below crosses z = 3.20. The lining sits in the reveal on this side of it
  // and the leaf hangs 2 cm proud of the wall line so no two faces are ever coplanar.
  const DX0 = 3.44, DX1 = 4.36, DCX = (DX0 + DX1) / 2, DW = DX1 - DX0;
  const DH  = 2.06;                       // leaf height
  const DZ  = 3.135;                      // leaf centre; .085 thick, so z 3.093 .. 3.178
  const SWING = 1.15;                     // radians, fully open

  // ---- lining: two jambs, a head and a sill, each of them overlapping the leaf, so a shut door
  // shows nothing of the corridor round its edges.
  for (const s of [-1, 1])
    A.box(DCX + s * (DW / 2 + .055), F + 1.09, 3.13, .11, 2.18, .14, c.oakD,
      { hard:true, mode:6, gloss:G.wood, ...Mtimber });
  A.box(DCX, F + 2.12, 3.13, DW + .22, .12, .14, c.oakD,
    { hard:true, mode:6, gloss:G.wood, ...Mtimber });
  A.box(DCX, F + .008, 3.13, DW + .22, .016, .14, c.ink,
    { hard:true, gloss:G.metal, ...Mmetal });

  // ---- the leaf, and everything that travels with it. Collected into an array so the whole lot
  // can be handed to the `frontdoor` mover in one go: game.js drives that name (`FIXTURE['门']`,
  // and `want.frontdoor = 1` for as long as the courier is standing there), so anything nailed to
  // the leaf and left out of this array would hang in mid-air the moment the door opened.
  const leaf = [];
  const L = p => (Array.isArray(p) ? leaf.push(...p) : leaf.push(p), p);

  L(A.box(DCX, F + 1.05, DZ, DW, DH, .085, c.door, { tag: '门', gloss:G.lacq }));
  // Pressed panels, ONE to a row and full width, not two side by side. There were two, at
  // DCX ± 0.21 and 0.38 wide, which left a 40 mm strip of bare leaf running floor to head down the
  // centre line — and a pale vertical strip down the middle of a red door is a meeting stile. The
  // render was unambiguous: it looked like the double doors of a hall rather than the front door
  // of a flat, and removing the decorative bead that ran down the same line did not help, because
  // the gap between the panels was drawing it just as well. One panel per row has no centre line
  // at all, and is what a pressed steel 防盗门 leaf actually looks like.
  for (const y of [.62, 1.52]) for (const dz of [-.050, .050])
    L(A.box(DCX, F + y, DZ + dz, .62, .68, .020, c.doorD,
      { tag: '门', hard:true, gloss:.22 }));
  // No bead down the centre line. There was one, and it was wrong twice over: a 防盗门 is a single
  // steel leaf, and a pale vertical stripe down the middle of it reads unmistakably as the meeting
  // stile of a *pair* of doors — in the first render this door looked like the double doors of a
  // hall, not the front door of a flat. The panels above already give the face its scale.
  // A single horizontal reveal across the waist of the leaf instead, dark rather than pale, and
  // only 8 mm proud. It reads as the pressing between the two panel rows — which is a thing steel
  // doors have — and being horizontal it cannot be mistaken for a meeting stile.
  for (const dz of [-.048, .048])
    L(A.box(DCX, F + 1.07, DZ + dz, DW - .10, .028, .008, c.doorD,
      { tag: '门', hard:true, gloss:.20 }));

  // ---- hardware. The lever is on the east edge because the hinge is on the west one.
  const HDX = DX1 - .10;
  for (const [dz, ry] of [[-.072, 0], [.072, Math.PI]]) {
    L(A.ball(HDX, F + 1.02, DZ + dz, .052, .052, .012, c.brassD,
      { tag: '门', gloss:G.metal, ...Mmetal }));                                    // rose
    L(A.cap(HDX - .015, F + 1.02, DZ + dz * 1.9, .055, .130, .055, c.brass,
      { rx:Math.PI / 2, ry, tag: '门', gloss:G.metal, ...Mmetal }));                 // lever
  }
  // 猫眼 — the peephole. Every flat door in the country has one and it is the single detail that
  // makes a door read as a front door rather than a bedroom door. The barrel passes through the
  // leaf and gets a bezel on BOTH faces: this file now owns the one physical leaf seen from both
  // the 玄关 and the 走廊, rather than relying on a second static door outside it.
  //
  // The bezel is at DZ − .066 and not DZ − .050 for the same reason as the 福 below: the pressed
  // panels stand 10 mm proud of the leaf and their front face is at DZ − .060, so anything mounted
  // at −.050 is *inside* the panel and simply does not appear. The barrel is .150 rather than .200
  // so it passes through the leaf without standing 6 cm out the other side into the corridor.
  L(A.cyl(DCX + .30, F + 1.52, DZ, .014, .150, c.brassD,
    { rx:Math.PI / 2, tag: '门', gloss:G.metal, ...Mmetal }));
  L(A.cyl(DCX + .30, F + 1.52, DZ - .066, .022, .014, c.chrome,
    { rx:Math.PI / 2, tag: '门', gloss:.72 }));
  L(A.cyl(DCX + .30, F + 1.52, DZ + .066, .022, .014, c.chrome,
    { rx:Math.PI / 2, tag: '门', gloss:.72 }));
  // The thumb-turn and the chain, both on the inside face only.
  L(A.box(HDX, F + 1.24, DZ - .056, .052, .092, .022, c.brassD, { tag: '门', hard:true, gloss:G.metal }));
  L(A.cyl(HDX, F + 1.24, DZ - .072, .012, .046, c.brass, { rx:Math.PI / 2, tag: '门', gloss:G.metal }));
  // The chain sits over the upper panel, so it is pushed to DZ − .072 like everything else on that
  // panel: at −.052 its mounting plate's front face landed on DZ − .060, exactly coplanar with the
  // panel it was screwed to, and the links behind it. Coplanar is the one thing that must not
  // happen here. The links are also .016 rather than .012 across — at .012 a five-link chain 1.6 m
  // up read as two disconnected specks of grey rather than as a chain.
  // …and on the LOCK side, at DCX + .12, not the hinge side. It was at DCX − .16, which put a
  // security chain 0.6 m from the hinge and 0.9 m from the edge it is supposed to hold shut —
  // the one place on a door where a chain can do nothing at all. It now runs outward towards the
  // opening edge, below the 猫眼 and above the thumb-turn, which is where your hand finds it.
  L(A.box(DCX + .12, F + 1.40, DZ - .072, .034, .026, .016, c.steel, { tag: '门', hard:true, gloss:.55 }));
  for (let i = 0; i < 5; i++)
    L(A.cap(DCX + .12 + .036 + i * .030, F + 1.38 - i * .012, DZ - .074,
      .032, .016, .016, c.steel, { rz:.5, tag: '门', gloss:.55 }));

  // ---- 福. Pasted on the inside face, which is where it survives in a block of flats — the
  // corridor face is management's and gets scraped every spring. A diamond of red paper turned
  // 45°, gold character on it. The character is drawn upright rather than 倒 because `A.glyph`
  // builds its own transform and cannot be flipped without rebuilding it here for one glyph.
  // Two diamonds, not one. Red paper on a red door is invisible — the first render put a 福 on
  // this leaf and the paper it is printed on simply was not there, because c.paper and c.door are
  // four points apart in hue and the eye reads them as one surface. The gold sheet behind it is
  // 16 mm wider all round, so what separates the charm from the door is a metallic edge rather
  // than a change of red. Printed 福 paper really does have a gold border, so this is also right.
  //
  // The whole stack sits forward of DZ − .060, which is the front face of the pressed panel it is
  // stuck to. At −.044 and −.052 the gold sheet was *behind* that panel and all that came through
  // were two chevrons where its top and bottom corners cleared the panel edge — the charm read as
  // a stray arrow rather than as a diamond. Paper stuck to a raised panel stands proud of it, so
  // this is also what it does in life. Back to front: gold −.068, paper −.076, character −.082.
  L(A.box(DCX, F + 1.74, DZ - .068, .232, .232, .005, c.gold,
    { rz:Math.PI / 4, tag: '门', hard:true, gloss:.42, ...Mmetal }));
  L(A.box(DCX, F + 1.74, DZ - .076, .200, .200, .006, c.paper,
    { rz:Math.PI / 4, tag: '门', hard:true, gloss:G.matte }));
  L(A.glyph(DCX, F + 1.74, DZ - .082, Math.PI, '福',
    { size:.115, color:c.gold, gloss:G.matte, lift:.004, tag: '门' }));

  // ---- the corridor face. Number and 福 used to be nailed to a second complete door built by
  // home-corridor.js. That duplicate stayed shut while this leaf swung, leaving two leaves in one
  // reveal and a floating 202. Keep the landing identity, but make every piece pasted or screwed
  // to the real leaf travel in this same mover. yaw 0 faces north, toward somebody in the 走廊.
  L(A.box(DCX, F + 1.84, DZ + .072, .300, .130, .024, c.steel,
    { tag: '门', hard:true, gloss:.48, ...Mmetal }));
  L(A.glyph(DCX, F + 1.84, DZ + .084, 0, '202',
    { size:.073, gap:.012, color:c.ink, gloss:G.matte, lift:.004, tag: '门' }));
  L(A.box(DCX, F + 1.47, DZ + .068, .216, .216, .005, c.gold,
    { rz:Math.PI / 4, tag: '门', hard:true, gloss:.42, ...Mmetal }));
  L(A.box(DCX, F + 1.47, DZ + .076, .188, .188, .006, c.paper,
    { rz:Math.PI / 4, tag: '门', hard:true, gloss:G.matte }));
  L(A.glyph(DCX, F + 1.47, DZ + .082, 0, '福',
    { size:.108, color:c.gold, gloss:G.matte, lift:.004, tag: '门' }));

  // The mover. `A.mover` is the shell's hook onto World's own `mover`, and this is the one
  // fixture in the flat that game.js opens by itself — see the note above the array.
  if (A.mover) A.mover('frontdoor', leaf, v => piv(DX0, DZ, M.rotY(SWING * v)));

  // A shut leaf is a wall and an open one is a doorway. The shell already leaves a walkable gap
  // through this wall; this narrow stop is therefore the physical leaf, not another wall segment.
  // World.setPart flips its `open` bit from the same value that drives the mover, so geometry and
  // collision cannot disagree. The record is shared through A.frontDoor for that one purpose.
  const doorStop = A.stop(DX0, DX1, DZ - .055, DZ + .055);
  if (A.frontDoor) Object.assign(A.frontDoor, {
    hinge:[DX0, DZ], swing:SWING, leaf, stop:doorStop, number:'202', floor:'2',
  });

  A.th('门', DCX, F + 2.30, 3.02, '我要出门了。', "I'm heading out.",
    'Beyond it: the 走廊, the 电梯, and the city. It is also where the 外卖员 stands when your ' +
    'dinner arrives — the two of you either side of this threshold, one of you in slippers.',
    { focus:[DCX, 2.25], reach:1.6 });

  // The lock is its own card. 门 is the leaf and 钥匙 is what you carry; 门锁 is the part of a
  // 防盗门 a tenant actually touches twice a day, and it is the word on every notice about one.
  // No new geometry — the thumb-turn, the escutcheon and the chain above it are already built on
  // the opening edge, and a second plate over them would be coplanar with the first.
  A.th('门锁', DCX + .12, F + 1.05, DZ - .09, '出门别忘了锁门。', "Don't forget to lock up.",
    '门 door + 锁 a lock, and as a verb 锁 is to lock. 反锁 is to deadlock it from the inside.',
    { focus:[DCX, 2.25], reach:1.4 });

  // ================================================================ 春联 the couplets
  //
  // Pasted on the wall inside, flanking the door. Outside would be more usual and is the 走廊's
  // wall, not this room's; inside is what plenty of flats do anyway once the corridor gets swept.
  // 上联 goes on the right as you face the door — and facing -z, right is -x, so 上联 is the strip
  // at the SMALLER x. Getting that backwards is the sort of thing a Chinese player notices
  // immediately and nobody else ever does.
  const couplet = (x, text) => {
    A.box(x, F + 1.62, 3.185, .110, .840, .006, c.paper, { hard:true, gloss:G.matte, ...Mcloth });
    A.box(x, F + 1.62, 3.180, .094, .820, .004, c.paperD, { hard:true, gloss:G.matte });
    A.glyph(x, F + 1.62, 3.176, Math.PI, text,
      { vertical:true, size:.072, gap:.020, color:c.gold, gloss:G.matte, lift:.004 });
  };
  couplet(3.24, '天增岁月人增寿');
  couplet(4.56, '春满乾坤福满门');
  // 横批, across the top. Reads left to right for the viewer: `A.glyph` lays characters along
  // local +x, and at yaw π that is world -x, which is the viewer's right.
  A.box(DCX, F + 2.32, 3.185, .500, .160, .006, c.paper, { hard:true, gloss:G.matte, ...Mcloth });
  A.glyph(DCX, F + 2.32, 3.176, Math.PI, '万象更新',
    { size:.085, gap:.022, color:c.gold, gloss:G.matte, lift:.004 });

  // ================================================================ 鞋 shoes
  //
  // Five silhouettes, built once and used a dozen times. What makes a shoe a shoe at two metres
  // is not detail, it is a descending profile — a tall block at the heel, a lower instep, a low
  // toe — and a dark rim across the top of the heel where the opening is. Without that rim these
  // are erasers.
  //
  // (x0, z0) is where the heel sits on the floor or the shelf; `yaw` points the toe. Build's
  // transform is trans · rotY · rotX · rotZ · scale, so rotating a part by the same yaw as the
  // shoe turns it instead of shearing it, and the offsets are resolved into world x/z here.
  const SH_TRAINER = 0, SH_LEATHER = 1, SH_SLIPPER = 2, SH_BOOT = 3, SH_FLAT = 4;
  const SH_ROUND = { hard:.008, soft:.016 };

  function shoePart(x0, z0, y0, yaw, u, v, len, wid, hgt, col, o) {
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    return A.box(x0 + u * fx, y0 + v, z0 + u * fz, len, hgt, wid, col, { ry:yaw, ...o });
  }
  function shoe(kind, x0, z0, y0, yaw, c1, c2, tag, sc = 1) {
    const o = tag ? { tag } : {};
    const firm = { ...o, mode:7, round:SH_ROUND.hard, ...Mcloth };
    const soft = { ...o, mode:7, round:SH_ROUND.soft, ...Mcloth };
    const P = (u, v, len, wid, hgt, col, oo) =>
      shoePart(x0, z0, y0, yaw, u * sc, v * sc, len * sc, wid * sc, hgt * sc, col, oo);
    if (kind === SH_TRAINER) {
      P(.137, .015, .274, .094, .030, c2, { ...firm, gloss:.18 });
      P(.135, .040, .264, .092, .022, c.lining, firm);
      P(.058, .098, .120, .088, .092, c1, soft);
      P(.060, .150, .108, .092, .018, c2, { ...firm, gloss:.22 });
      P(.150, .086, .132, .088, .070, c1, soft);
      P(.234, .072, .104, .080, .052, c1, soft);
    } else if (kind === SH_LEATHER) {
      P(.132, .011, .268, .088, .022, c2, { ...firm, gloss:.30 });
      P(.040, .034, .066, .086, .030, c2, { ...firm, gloss:.26 });
      P(.074, .078, .136, .086, .072, c1, { ...soft, gloss:.42 });
      P(.066, .118, .112, .090, .016, c2, { ...firm, gloss:.24 });
      P(.180, .066, .142, .082, .060, c1, { ...soft, gloss:.42 });
      P(.254, .046, .070, .066, .040, c1, { ...soft, gloss:.46 });
    } else if (kind === SH_SLIPPER) {
      // 拖鞋. A flat sole, an open back and one band over the instep — and the open back is the
      // whole silhouette. A slipper drawn as a low shoe is a low shoe.
      P(.118, .013, .246, .096, .026, c2, firm);
      P(.118, .032, .232, .088, .014, c.lining, firm);
      P(.152, .064, .104, .102, .062, c1, soft);
      P(.224, .036, .062, .080, .028, c1, soft);
      P(.040, .050, .052, .092, .044, c1, soft);
    } else if (kind === SH_BOOT) {
      P(.130, .017, .266, .094, .034, c2, firm);
      P(.124, .076, .240, .090, .076, c1, soft);
      P(.240, .056, .080, .076, .044, c1, soft);
      P(.056, .160, .104, .094, .140, c1, soft);
      P(.056, .240, .112, .102, .034, c2, soft);
      P(.056, .262, .100, .092, .014, c.walnut, firm);
    } else {
      // A woman's flat: low all the way, so it needs the collar rim more than any of them.
      P(.128, .012, .258, .082, .022, c2, { ...firm, gloss:.30 });
      P(.104, .048, .200, .080, .052, c1, { ...soft, gloss:.38 });
      P(.086, .078, .150, .084, .014, c2, firm);
      P(.220, .038, .086, .070, .036, c1, { ...soft, gloss:.38 });
    }
  }
  // A pair, set down side by side across the direction they point.
  function pair(kind, x, z, y, yaw, c1, c2, tag, gap = .115, sc = 1) {
    const sx = Math.cos(yaw + Math.PI / 2), sz = -Math.sin(yaw + Math.PI / 2);
    for (const s of [-.5, .5])
      shoe(kind, x + sx * gap * s, z + sz * gap * s, y, yaw + s * .10, c1, c2, tag, sc);
  }

  // ================================================================ 低鞋柜 the shoe cabinet
  //
  // 1.40 × 0.34, top at 1.04 — the height a Chinese 鞋柜 actually is, which is the height of the
  // surface you drop your keys on when both hands are full. Six tilt-out fronts (翻斗) in two rows,
  // and a 0.18 m open recess under them: that recess is the point of the whole thing, because it is
  // where the shoes you have this second taken off go, without opening anything.
  const LX0 = 2.86, LX1 = 4.26, LCX = (LX0 + LX1) / 2, LW = LX1 - LX0;
  const LZ = 1.79, LD = .34;                     // z 1.62 .. 1.96
  const LTOP = F + 1.04;

  A.box(LCX, F + .60, LZ, LW, .84, LD, c.oak,
    { hard:true, mode:6, gloss:G.wood, tag: '鞋', ...Mtimber });                    // carcass
  A.box(LCX, F + .11, LZ + .035, LW - .06, .18, LD - .07, c.oakD,
    { hard:true, mode:6, gloss:.14, tag: '鞋', ...Mtimber });                       // recessed plinth
  A.box(LCX, LTOP - .02, LZ - .010, LW + .05, .045, LD + .04, c.slab,
    { hard:true, gloss:.34, tag: '鞋', ...Mstone });                                // stone top
  // Fronts. Three columns, two rows; a lipped pull along the top of each rather than a knob,
  // because a 翻斗 front is grabbed by its edge and tipped.
  for (let ci = 0; ci < 3; ci++) for (let ri = 0; ri < 2; ri++) {
    const fx = LX0 + (LW / 3) * (ci + .5), fy = F + .60 + (ri - .5) * .40;
    A.box(fx, fy, LZ - LD / 2 + .009, LW / 3 - .022, .375, .018, c.oakL,
      { hard:true, mode:6, gloss:.24, tag: '鞋', ...Mtimber });
    A.box(fx, fy + .175, LZ - LD / 2 - .006, LW / 3 - .060, .022, .030, c.ink,
      { hard:true, gloss:.30, tag: '鞋' });
  }
  A.stop(LX0, LX1, Z0, LZ + LD / 2 + .01);
  shade(LCX, LZ + .06, LW + .18, LD + .22, .40);

  // Outdoor shoes in the open recess, which is what the recess is for. They face out because that
  // is how a shoe lands when it is kicked off, and because the toe is the readable end.
  pair(SH_LEATHER, 3.12, LZ - .02, F + .022, -Math.PI / 2, C('#2b2620'), c.walnut, '鞋');
  pair(SH_TRAINER, 3.58, LZ - .02, F + .022, -Math.PI / 2 + .12, C('#e6ded0'), C('#b23a2b'), '鞋');
  pair(SH_FLAT,    4.02, LZ - .02, F + .022, -Math.PI / 2 - .10, C('#7a3f52'), C('#3a2a1e'), '鞋');

  // ---- what lives on top of a 鞋柜, which is never nothing.
  // 钥匙盘 — the key dish. Everything that comes out of a pocket lands in one of these.
  A.cyl(3.06, LTOP + .012, 1.78, .085, .024, c.jade, { gloss:.44, tag: '鞋' });
  A.cyl(3.06, LTOP + .020, 1.78, .068, .012, C('#2f5f52'), { gloss:.40, tag: '鞋' });
  for (const [kx, kz, ky] of [[3.03, 1.76, .0], [3.09, 1.80, .006], [3.06, 1.82, .012]])
    A.box(kx, LTOP + .030 + ky, kz, .052, .006, .014, c.brass,
      { hard:true, ry:.7 + kz, gloss:G.metal, ...Mmetal, tag: '鞋' });
  A.cyl(3.11, LTOP + .034, 1.74, .014, .005, c.brassD, { gloss:G.metal, tag: '鞋' });
  // A squat pot with one green thing in it. Not a feature plant — the one that lives by the door
  // and gets watered when somebody remembers.
  A.taper(4.02, LTOP + .055, 1.77, .120, .110, .120, C('#96573c'),
    { rx:Math.PI, gloss:.26, tag: '鞋', ...Mstone });
  A.cyl(4.02, LTOP + .108, 1.77, .052, .014, C('#3a2a1e'), { gloss:.10, tag: '鞋' });
  for (let i = 0; i < 7; i++) {
    const a = i * 1.9;
    A.ball(4.02 + Math.sin(a) * .062, LTOP + .150 + (i % 3) * .034, 1.77 + Math.cos(a) * .058,
      .048, .020, .040, i % 2 ? c.leaf : C('#356b3d'), { mode:15, ry:a, gloss:.14, tag: '鞋' });
  }
  // The post. Two flyers and a utility notice, squared off against the wall.
  for (let i = 0; i < 3; i++)
    A.box(3.52 + i * .006, LTOP + .008 + i * .0035, 1.76 - i * .008, .200, .004, .140,
      [c.white, c.cream, C('#ddd3bb')][i], { hard:true, ry:.06 - i * .05, gloss:G.matte, tag: '鞋' });

  A.th('鞋', 3.30, LTOP + .30, 2.06, '进门先换鞋。', 'Change your shoes when you come in.',
    '鞋 xié. The cabinet is a 鞋柜 and the slippers waiting on the floor are 拖鞋 — taking your ' +
    'shoes off at the door is not tidiness here, it is the rule of the house.',
    { focus:[3.30, 2.62], reach:1.5 });

  // ================================================================ 高鞋柜 the tall unit
  //
  // The other half of the same run: boots, the vacuum, the things that do not fit in a tilt-out.
  // Four doors — a horizontal reveal at 1.17 rather than one 1.78 m slab, which is both how the
  // carcass is really made and the only thing that gives this face any scale.
  const TX0 = 4.26, TX1 = 5.17, TCX = (TX0 + TX1) / 2, TW = TX1 - TX0;
  const TZ = 1.81, TD = .38, TH = 2.02;          // z 1.62 .. 2.00

  A.box(TCX, F + TH / 2, TZ, TW, TH, TD, c.oak,
    { hard:true, mode:6, gloss:G.wood, tag: '鞋', ...Mtimber });
  A.box(TCX, F + .11, TZ + .035, TW - .06, .18, TD - .07, c.oakD,
    { hard:true, mode:6, gloss:.14, tag: '鞋', ...Mtimber });
  A.box(TCX, F + TH + .022, TZ - .008, TW + .05, .044, TD + .04, c.slab,
    { hard:true, gloss:.34, tag: '鞋', ...Mstone });
  for (const s of [-1, 1]) for (const [y, h] of [[.68, .90], [1.60, .82]]) {
    A.box(TCX + s * TW / 4, F + y, TZ - TD / 2 + .009, TW / 2 - .020, h, .018, c.oakL,
      { hard:true, mode:6, gloss:.24, tag: '鞋', ...Mtimber });
    // Slim vertical bar handles, on the meeting stiles.
    A.cap(TCX + s * .055, F + y, TZ - TD / 2 - .022, .018, h * .42, .018, c.brass,
      { tag: '鞋', gloss:G.metal, ...Mmetal });
  }
  A.stop(TX0, TX1, Z0, TZ + TD / 2 + .01);
  shade(TCX, TZ + .06, TW + .16, TD + .20, .42);
  // Boots standing in its recess, and two fabric boxes on top of it — a cupboard top at 2.02 in a
  // 2.60 room is storage, and everybody uses it as storage.
  pair(SH_BOOT, 4.72, TZ - .04, F + .022, -Math.PI / 2 + .06, C('#5a4128'), C('#2b2620'), '鞋');
  A.box(4.52, F + TH + .13, TZ, .38, .19, .30, C('#8d8579'),
    { hard:true, mode:7, gloss:G.cloth, tag: '鞋', ...Mcloth });
  A.box(4.95, F + TH + .15, TZ + .01, .36, .23, .29, C('#6f6a63'),
    { hard:true, mode:7, gloss:G.cloth, tag: '鞋', ...Mcloth });
  A.box(4.52, F + TH + .21, TZ - .152, .150, .050, .008, c.cream,
    { hard:true, gloss:G.matte, tag: '鞋' });

  // ================================================================ 拖鞋 the slippers
  //
  // Two pairs on the floor, toes pointing west — into the flat, because that is the direction you
  // are about to walk when you step into them. A pair laid facing the door is a pair somebody is
  // about to leave in, and this room's job is the other half of that.
  // The small mat they wait on, then the slippers standing ON it. A 玄关 has two mats: the one you
  // step over coming in, and this one, for indoor shoes, which never leaves the room.
  A.flat(3.06, F + .040, 2.60, .52, .68, C('#5f6b63'), { mode:7, gloss:G.cloth, ...Mcloth });
  A.flat(3.06, F + .043, 2.60, .46, .62, C('#6e7475'), { mode:7, gloss:G.cloth, ...Mcloth });
  pair(SH_SLIPPER, 3.02, 2.42, F + .046, Math.PI, C('#c8503c'), C('#e6ded0'), '鞋', .125);
  pair(SH_SLIPPER, 3.02, 2.78, F + .046, Math.PI + .08, C('#3f6f8c'), C('#e6ded0'), '鞋', .125);

  // A shallow tray of just-removed outdoor shoes in front of the cabinet — the overflow, which is
  // what a real entry looks like on a Tuesday.
  A.box(3.44, F + .032, 2.13, .70, .030, .34, C('#3d444b'), { hard:true, gloss:.30 });
  A.box(3.44, F + .052, 2.13, .66, .014, .30, C('#4a5856'), { hard:true, gloss:.26 });
  pair(SH_TRAINER, 3.26, 2.11, F + .060, -Math.PI / 2 + .35, C('#2b3f5c'), c.white, '鞋', .105, .92);
  pair(SH_FLAT,    3.66, 2.15, F + .060, -Math.PI / 2 - .28, C('#6a4a2c'), C('#2b2620'), '鞋', .105, .92);

  // ================================================================ 门垫 the doormat
  //
  // Just inside the leaf, and deliberately under the swing: the leaf's underside is at F + 0.022
  // and the mat is 12 mm, so the door passes over it the way a real one does. A mat placed clear
  // of the swing is a mat nobody would ever step on.
  // This mat alone stays low on the ladder — F + .018 / .022 / .026 rather than up with the
  // slipper mat — because it is the one flat thing the swinging leaf passes over, and the leaf's
  // underside is at F + .020. It clears the shell's floor (F + .004) and this room's tile field
  // (F + .014) by 4 mm each, which is enough that no two of the three ever fight, and it keeps the
  // stack under the door as thin as a coir mat really is.
  A.flat(DCX, F + .018, 2.88, .78, .46, c.coir, { mode:7, gloss:G.cloth, ...Mcloth });
  A.flat(DCX, F + .022, 2.88, .70, .38, c.coirL, { mode:7, gloss:G.cloth, ...Mcloth });
  for (let i = 0; i < 9; i++)
    A.box(DCX - .30 + i * .075, F + .026, 2.88, .050, .006, .34, c.coir,
      { hard:true, mode:7, gloss:G.cloth });

  // ================================================================ 挂钩 the coat hooks
  //
  // West of the door, on the strip of the corridor wall the leaf can never reach. A rail with
  // four hooks at 1.68 — high enough that a long coat clears the floor in a room this shallow.
  const HKX = 2.99, HKY = F + 1.68;
  A.box(HKX, HKY, 3.168, .380, .075, .026, c.walnut,
    { hard:true, mode:6, gloss:G.wood, ...Mtimber });
  for (let i = 0; i < 4; i++) {
    const hx = HKX - .135 + i * .090;
    A.cyl(hx, HKY - .020, 3.130, .010, .070, c.ink, { rx:Math.PI / 2, gloss:.42 });
    A.ball(hx, HKY - .046, 3.108, .020, .020, .020, c.ink, { gloss:.42 });
  }
  // Two coats and a canvas tote. A coat is a shoulder block, a hanging body that narrows, and two
  // sleeves — three parts, and without the taper it is a towel.
  const coat = (x, top, len, wid, col, colD) => {
    A.box(x, F + top - .075, 3.075, wid, .150, .105, col,
      { mode:7, gloss:G.cloth, tag: '外套', ...Mcloth });
    A.taper(x, F + top - .075 - len / 2, 3.070, wid + .045, len, .130, col,
      { rx:Math.PI, mode:7, gloss:G.cloth, tag: '外套', ...Mcloth });
    for (const s of [-1, 1])
      A.cap(x + s * (wid / 2 + .012), F + top - .30, 3.062, .070, .380, .070, colD,
        { rz:s * .10, mode:7, gloss:G.cloth, tag: '外套', ...Mcloth });
    A.box(x, F + top - .012, 3.096, .030, .026, .046, c.steel, { hard:true, gloss:.50, tag: '外套' });
  };
  coat(2.92, 1.66, .78, .30, c.navy, C('#1d3345'));
  coat(3.10, 1.62, .62, .26, C('#5c5a4e'), C('#4b4740'));
  // The tote. Canvas, printed, and the single most common object hanging by a Chinese front door.
  A.box(2.79, F + 1.42, 3.088, .230, .290, .085, C('#ddd3bb'),
    { mode:7, gloss:G.cloth, ...Mcloth });
  A.cap(2.79, F + 1.62, 3.088, .190, .150, .026, C('#ddd3bb'), { rz:Math.PI / 2, mode:7, gloss:G.cloth });
  A.glyph(2.79, F + 1.42, 3.042, Math.PI, '北京', { size:.058, gap:.014, color:c.jade, gloss:G.matte, lift:.004 });

  A.th('外套', 3.00, F + 1.94, 3.02, '外套挂在门口。', 'The coat hangs by the door.',
    '外 outside + 套 a cover you pull on. What you take off second, after the shoes.',
    { focus:[3.00, 2.55], reach:1.5 });

  // 中国结 — the knot, hanging on the last bit of free wall. Red silk, gold tassel.
  A.box(2.68, F + 1.98, 3.176, .130, .130, .020, c.paper, { rz:Math.PI / 4, hard:true, gloss:.22 });
  A.box(2.68, F + 1.98, 3.162, .078, .078, .014, c.paperD, { rz:Math.PI / 4, hard:true, gloss:.20 });
  for (const s of [-1, 1])
    A.cap(2.68 + s * .028, F + 1.83, 3.170, .020, .120, .020, c.gold, { gloss:.30 });
  A.cyl(2.68, F + 2.06, 3.170, .012, .060, c.paperD, { gloss:.20 });

  // ================================================================ 镜子 the mirror
  //
  // East wall, perpendicular to the door — 镜子不宜正对大门, and quite apart from the
  // superstition it is the wall you are already turning towards on the way out. Full length,
  // because a 玄关 mirror that stops at the waist cannot show you your shoes.
  //
  // The backer's front face is at x 5.15 and the glass at 5.126: 24 mm apart, and 50 mm off the
  // wall plane at 5.20. Nothing here is coplanar with anything, which on a flat pale panel mounted
  // to a flat pale wall is the difference between a mirror and a field of flickering stripes.
  const MZ = 2.60, MY = F + 1.30, MH = 1.50, MW = .46;
  A.box(5.175, MY, MZ, .050, MH + .07, MW + .07, c.walnut,
    { hard:true, mode:6, gloss:G.wood, tag: '玄关镜子', ...Mtimber });
  A.box(5.138, MY, MZ, .024, MH, MW, c.mirror,
    { hard:true, mode:1, glow:.05, gloss:.86, tag: '玄关镜子' });
  // A brass slip round the glass, in four pieces.
  for (const s of [-1, 1]) {
    A.box(5.132, MY + s * (MH / 2 + .012), MZ, .016, .024, MW + .024, c.brass,
      { hard:true, gloss:G.metal, tag: '玄关镜子', ...Mmetal });
    A.box(5.132, MY, MZ + s * (MW / 2 + .012), .016, MH + .048, .024, c.brass,
      { hard:true, gloss:G.metal, tag: '玄关镜子', ...Mmetal });
  }
  A.th('镜子', 5.02, MY + .42, MZ, '出门前照照镜子。', 'Check the mirror before you go out.',
    '镜子 jìngzi. It is on the side wall on purpose: a mirror facing the front door is the one ' +
    'bit of household superstition that really does decide where furniture goes here.',
    { focus:[4.62, MZ], reach:1.5 });

  // ================================================================ 雨伞 the umbrella stand
  //
  // Far corner, well outside the door's arc. A glazed ceramic drum, which is what these are, with
  // three umbrellas leaning at different angles because a stand of parallel umbrellas is a vase.
  const UX = 4.98, UZ = 2.94;
  A.cyl(UX, F + .21, UZ, .115, .420, C('#4a6d74'), { gloss:.52, tag: '雨伞', ...Mstone });
  A.cyl(UX, F + .415, UZ, .118, .026, C('#3a5a60'), { gloss:.56, tag: '雨伞' });
  A.cyl(UX, F + .012, UZ, .120, .024, C('#3a5a60'), { gloss:.40, tag: '雨伞' });
  A.glyph(UX - .118, F + .24, UZ, -Math.PI / 2, '雨',
    { size:.085, color:C('#d3e2e2'), gloss:.30, lift:.006, tag: '雨伞' });
  const brolly = (dx, dz, lean, col, colD) => {
    const rx = lean * .35, rz = -lean * .55;
    A.cap(UX + dx, F + .58, UZ + dz, .046, .880, .046, col,
      { rx, rz, mode:7, gloss:.24, tag: '雨伞', ...Mcloth });
    A.taper(UX + dx * 1.9, F + 1.02, UZ + dz * 1.9, .058, .130, .058, colD,
      { rx, rz, gloss:.28, tag: '雨伞' });
    A.cap(UX + dx * 2.4, F + 1.14, UZ + dz * 2.4, .022, .130, .022, c.walnut,
      { rx, rz, mode:6, gloss:G.wood, tag: '雨伞' });
  };
  brolly(.045, -.035,  .16, c.navy,        C('#1f2a3a'));
  brolly(-.040, .030, -.13, C('#3f6b4e'),  C('#2c4a37'));
  brolly(.010,  .055,  .06, C('#7d2f3c'),  C('#5c2029'));
  A.stop(UX - .14, UX + .14, UZ - .14, UZ + .14);
  shade(UX, UZ, .34, .34, .38);
  A.th('雨伞', UX, F + 1.02, UZ - .16, '外面下雨，带把伞。', "It's raining out — take an umbrella.",
    '雨 rain + 伞 umbrella, and 伞 is a picture of one. Measure word 把: 一把伞.',
    { focus:[4.72, 2.66], reach:1.5 });

  // ================================================================ 快递 the parcel
  //
  // Left inside the door, because it was handed over across that threshold half an hour ago and
  // has not moved since. Taped, labelled, and slightly the wrong way up.
  const PX = 4.78, PZ = 2.42;
  A.box(PX, F + .105, PZ, .320, .210, .250, C('#c1a077'),
    { hard:true, ry:.24, gloss:.14, tag: '快递' });
  A.box(PX, F + .212, PZ, .326, .012, .066, C('#d3ccbc'),
    { hard:true, ry:.24, gloss:.24, tag: '快递' });                          // the tape down the seam
  A.box(PX + .030, F + .150, PZ - .118, .150, .092, .010, c.white,
    { hard:true, ry:.24, gloss:G.matte, tag: '快递' });                      // the label
  A.glyph(PX + .030, F + .162, PZ - .128, .24 + Math.PI, '快递',
    { size:.032, gap:.006, color:c.ink, gloss:G.matte, lift:.003, tag: '快递' });
  for (let i = 0; i < 5; i++)
    A.box(PX + .030 - .052 + i * .026, F + .128, PZ - .128, .008, .028, .006, c.ink,
      { hard:true, ry:.24, gloss:G.matte, tag: '快递' });                    // a barcode, at four bars
  A.stop(PX - .18, PX + .18, PZ - .15, PZ + .15);
  shade(PX, PZ, .42, .36, .40);
  A.th('快递', PX, F + .34, PZ - .18, '快递放在门口了。', 'The parcel was left by the door.',
    '快 fast + 递 to hand over. Downstairs there are 快递柜 lockers; up here it just gets left ' +
    'against the 鞋柜 until somebody trips over it.',
    { focus:[4.46, 2.66], reach:1.5 });

  // ================================================================ 小板凳 the folded stool
  //
  // Leaning in the corner the 鞋柜 does not reach. Everybody who has ever done up a boot standing
  // on one leg owns one of these, and it lives folded against a wall.
  A.box(2.70, F + .30, 1.74, .055, .560, .300, c.oakL,
    { hard:true, mode:6, rz:.12, gloss:G.wood, ...Mtimber });
  A.box(2.745, F + .30, 1.74, .040, .520, .250, c.oakD,
    { hard:true, mode:6, rz:.12, gloss:.18, ...Mtimber });
  A.box(2.70, F + .58, 1.74, .075, .045, .310, c.walnut,
    { hard:true, mode:6, rz:.12, gloss:G.wood, ...Mtimber });
  shade(2.72, 1.76, .22, .38, .34);

  // ================================================================ 开关 · 对讲 the wall plates
  //
  // The switch is on the handle side of the door, which is where your hand already is, and the
  // 可视对讲 handset above it. Every flat in a block like this has one, and it is the object that
  // says the door downstairs is locked and somebody has to buzz you through it.
  A.box(4.70, F + 1.28, 3.176, .086, .130, .016, c.white, { hard:true, gloss:.26 });
  for (const s of [-1, 1])
    A.box(4.70 + s * .020, F + 1.28, 3.164, .030, .052, .012, C('#e6ded0'), { hard:true, gloss:.30 });

  A.box(4.98, F + 1.46, 3.174, .150, .230, .022, c.white, { hard:true, gloss:.28 });
  A.box(4.98, F + 1.50, 3.158, .112, .130, .012, C('#2a2e33'), { hard:true, mode:1, glow:.04, gloss:.60 });
  A.box(4.98, F + 1.375, 3.160, .026, .026, .010, C('#7fd08a'), { hard:true, mode:1, glow:.16 });
  A.cap(4.912, F + 1.44, 3.152, .034, .180, .034, C('#dad6cd'), { gloss:.30 });   // the handset
  A.glyph(4.98, F + 1.596, 3.150, Math.PI, '对讲',
    { size:.028, gap:.006, color:C('#8d8579'), gloss:G.matte, lift:.003 });

  // ================================================================ 凳 the folding stool
  //
  // The plan at the head of this file draws one and the file never built it, which left the room
  // with a shoes-off rule and nowhere to sit down and obey it. Folded and leaned against the tall
  // unit rather than stood open, because that is where it lives between uses and because open it
  // would be a collider in the middle of a four-square-metre room.
  //
  // No `A.stop`. Deliberate: it stands inside the footprint the tall cabinet and the parcel
  // already deny the body, so a collider of its own could only take away floor that is not there.
  const STX = 5.04, STZ = 2.30;
  A.box(STX, F + .48, STZ, .060, .900, .320, c.walnut,
    { rz:-.085, hard:true, mode:6, gloss:G.wood, tag: '凳', ...Mtimber });
  A.box(STX - .038, F + .74, STZ, .022, .330, .300, C('#8a6a52'),
    { rz:-.085, hard:true, mode:6, gloss:.22, tag: '凳', ...Mtimber });
  for (const s of [-1, 1])
    A.cap(STX - .020, F + .30, STZ + s * .130, .022, .560, .022, c.walnut,
      { rz:-.085, gloss:G.wood, tag: '凳', ...Mtimber });
  shade(STX - .04, STZ, .22, .38, .34);

  // ================================================================ the words this room owed
  //
  // Everything below already existed as geometry and had no headword, which the note at the top
  // of this file records as a deliberate hold: `Vocab.get` had no fallback and a thing whose word
  // was missing took the game down. That is no longer true — see .thingcheck.js, whose own header
  // records the fix — so the hold is lifted and the door's Chinese is finally readable.
  //
  // FIVE OF THESE NINE HEADWORDS ARE NOT IN js/vocab.js YET: 门垫, 挂钩, 凳, 对讲 here, and the
  // dictionary is lane 4's file, not this one's. The rows are queued in
  // .reports/vocab-rows-queue.md. Until they land, walking up to one of these gets the bare
  // headword instead of a gloss and its card will not open — a content gap, not a crash, and
  // .thingcheck.js is the harness that reports it.
  A.th('春联', 3.24, F + 1.62, 3.10, '春联是过年的时候贴的。',
    'The couplets go up at New Year.',
    '春联 chūnlián — the pair of red strips flanking a door. 上联 goes on the right as you face ' +
    'it, which from inside is the smaller x. The 横批 across the top reads 万象更新.',
    { focus:[3.24, 2.66], reach:1.6 });
  A.th('钥匙', 3.06, LTOP + .15, 1.78, '钥匙放在门口的盘子里。',
    'The keys go in the dish by the door.',
    '钥匙 yàoshi. 一把钥匙 — the measure word 把 is for things you hold by a handle.',
    { focus:[3.06, 2.42], reach:1.5 });
  A.th('鞋柜', LCX, LTOP + .46, 1.88, '鞋柜是进门第一件家具。',
    'The shoe cabinet is the first furniture inside the door.',
    '鞋柜 xiéguì — 鞋 shoe + 柜 cabinet. 1.40 m of it across the short wall is not storage, it ' +
    'is the shoes-off rule made into joinery.',
    { focus:[LCX, 2.45], reach:1.6 });
  A.th('拖鞋', 3.44, F + .18, 2.13, '进门换上拖鞋。', 'Change into slippers when you come in.',
    '拖鞋 tuōxié — 拖 to drag, which is what they do on a tiled floor. They point inwards on ' +
    'their own mat because that is the direction you step into them.',
    { focus:[3.44, 2.50], reach:1.5 });
  A.th('门垫', DCX, F + .18, 2.88, '门垫上写着欢迎。', 'The doormat says welcome.',
    '门垫 méndiàn — 门 door + 垫 mat. It sits under the swing on purpose: a mat clear of the ' +
    'leaf is a mat nobody ever steps on.',
    { focus:[DCX, 2.55], reach:1.5 });
  A.th('挂钩', HKX, HKY + .18, 3.10, '外套挂在挂钩上。', 'The coat hangs on the hooks.',
    '挂钩 guàgōu — 挂 to hang + 钩 hook. The rail is on the one strip of wall the door leaf can ' +
    'never reach, which is why it is west of the door and not beside it.',
    { focus:[HKX, 2.55], reach:1.5 });
  A.th('凳', STX - .10, F + .62, STZ, '换鞋的时候坐在凳子上。',
    'You sit on the stool to change your shoes.',
    '凳 dèng — a stool with no back. 板凳 is the wooden one, 马扎 the folding canvas one that ' +
    'lives by every Beijing front door.',
    { focus:[STX, STZ], reach:1.7 });
  A.th('对讲', 4.98, F + 1.62, 3.10, '有人按对讲，你去接。',
    'Someone buzzes the intercom — you answer it.',
    '对讲 duìjiǎng — 对 facing + 讲 to speak. This is where the 外卖员 announces himself rather ' +
    'than materialising at the door.',
    { focus:[4.98, 2.85], reach:2.0 });

  // ================================================================ 灯 the light
  //
  // One flush disc, warm, and a real point light under it. An entry in a Chinese flat is lit
  // hard and from directly overhead — there is no lamp in here and there never has been. Kept off
  // the 灯 tag on purpose: the flat's pendant already owns that headword and `thingOf` keeps the
  // first thing it is given, so a second 灯 would quietly steal or lose the card.
  const CX = 3.85, CZ = 2.48;
  A.cyl(CX, F + CH - .045, CZ, .190, .070, c.white, { gloss:.24, ...Mstone });
  A.cyl(CX, F + CH - .082, CZ, .168, .028, c.warm, { mode:1, glow:.14 });
  A.cyl(CX, F + CH - .092, CZ, .150, .012, C('#fff3d8'), { mode:1, glow:.12 });
  A.light(CX, F + CH - .13, CZ, c.warm, .95, 2.90);
  // A second, much weaker one low down at the threshold, so the courier standing outside and the
  // player standing inside are both in light rather than one of them being a silhouette. It is the
  // one place in the flat where two people are meant to be looking at each other.
  A.light(DCX, F + 1.35, 2.98, c.warm, .34, 1.60);
};
