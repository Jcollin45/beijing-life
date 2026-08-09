// 户型 — the flat's interior partitions
//
// Registered into FlatFit (declared at the top of js/world.js), and built LAST: the plan below is
// laid between the rooms as they were actually built, so it has to run after all of them.
//
// ---------------------------------------------------------------------------------------------
// WHY THIS FILE EXISTS AT ALL
//
// The flat had no interior walls. `buildShell` in js/world.js builds the building's outer walls,
// the wall between the corridor and the flat, and the lift shaft — its own comment says so — and
// across the seven room files there were three `wall()` calls in total. Ten rooms of furniture
// stood in one open 12.0 × 8.2 m box.
//
// That is one fault with three symptoms, and all three were reported as separate problems: rooms
// that are not defined, furniture that reads as sprawled, and pictures hanging in mid-air. A
// picture hung on a partition that nobody built does not look like a missing wall. It looks like a
// broken picture.
//
// The ten agents were each given a room's *contents*; the shell owner was given the *envelope*.
// Nobody owned what goes between them. This file is that owner, and it is one file rather than
// seven because a partition belongs to two rooms and can therefore belong to neither.
//
// ---------------------------------------------------------------------------------------------
// THE PLAN IS DERIVED, NOT CHOSEN. This matters more than anything else in here.
//
// A wall placed by fiat goes through somebody's wardrobe. So every line below was read off the
// build itself — `World.roomBoxes` records each room's true extent and its span of `props`, and
// each candidate line was tested against every individual prop it would pass through before being
// committed. Three things that came out of that, which no plan drawn on paper would have known:
//
//  1. THE ROOMS HAD ALREADY BUILT SOME OF THESE WALLS. js/home-second.js stands a real 0.10 ×
//     2.60 × 2.70 wall at x -2.60, and js/home-entry.js has two full-height quads — one at z 1.61
//     running x 2.60..5.20, one at x 5.19 running z 1.60..3.20. Those are the 玄关's own south and
//     east walls. They are not rebuilt here; the plan aligns to them.
//
//  2. THE TALL FURNITURE SAYS WHERE THE WALLS WERE MEANT TO GO. The 次卧 has a 1.50 × 2.05 × 0.60
//     wardrobe standing at z -1.72 and a 1.98 m unit at z -1.68 — both backed onto a north wall
//     that did not exist. The 主卧 has a 0.14 × 1.62 × 0.52 jamb at x -2.65, z 1.30, which is a
//     door frame around a doorway in a wall that did not exist. The plan puts a wall behind that
//     furniture and a door opening around that jamb.
//
//  3. js/home-second.js HAD ALREADY PLANNED HALF THE SOUTH-WEST. It builds two rooms, not one —
//     次卧 at x -6.00..-2.60 and a 书房 at x -2.60..-1.40 — with a 0.10 partition between them, a
//     doorway at z -2.30..-1.50, a header, lined jambs, an architrave and a hung leaf. It even
//     guards the lot behind `if (A.partitions !== false)`, which is a file that expected somebody
//     to come along and own this. So this file does not wall the south-west at all; it walls the
//     two rooms' north side, which is the one side nobody had.
//
//  4. AN OPEN DOOR CAN SEAL A ROOM. The 次卧's leaf hung at 1.15 rad, a third of the way across
//     its own 0.80 m opening, and its axis-aligned collider covered 0.44 m of it. Flood-filling
//     the flat's walkable floor from the front door reached the second bedroom in 0 cells. The
//     leaf is now swung to 1.52 and its collider derived from the angle — see js/home-second.js.
//
// ---------------------------------------------------------------------------------------------
// THE ROOMS, as this file settles them. x -6.00..6.00, z -5.00..3.20, ceiling A.FLAT.h.
//
//        x -6.00        -2.60      -1.40  1.20  2.20    2.75      6.00
//   3.20 ┌────────────────┬────────────────────────────┬──────────┐
//        │                │      走道 hall  [储藏]     │   玄关   │  inside the front door
//   1.65 │     主卧       ├────────────────────────────┤          │
//        │    bedroom     │                            ├──────────┤
//   1.61 │                │          客厅              │   餐厅   │
//        │                │         living             │  dining  │
//  -1.30 ├────────────────┼──────────┐                 │          │
//        │                │   书房   │                 │          │
//  -2.20 │     次卧       │  study   ├───────────┬─────┴──────────┤
//        │    second      │          │  卫生间   │阳台│    厨房    │
//        │                │          │   bath    │balc│  kitchen   │
//  -5.00 └────────────────┴──────────┴───────────┴────┴────────────┘
//
// Ten rooms, which is what APARTMENT.md:55-64 always said and what this file used to register
// eight of. The two that were missing are the two below the diagram's own fold: 走道 was folded
// into the living room's box and 阳台 was a label inside the bathroom's.
//
// 厨房 and 卫生间 are the two rooms js/home-kitchen.js and js/home-bath.js have never furnished —
// both are seven-line stubs. They are walled and doored here anyway, because a flat whose kitchen
// is an unmarked corner of the living room is the sprawl this file exists to end, and because a
// room with walls and a door is a room somebody can now furnish without also having to plan it.
//
// ---------------------------------------------------------------------------------------------
// WHAT IS STILL WRONG, measured, so nobody has to rediscover it. `node .flatcheck.js --full`
// reports it every run, and these are that run's numbers with all ten rooms registered:
//
//   主卧 386/394 · 次卧 159/159 · 书房 48/57 · 卫生间 206/212 · 阳台 69/69
//   厨房 409/409 · 客厅 824/824 · 走道 377/377 · 餐厅 410/411 · 玄关 88/98
//
// Every room is entered. The one that is still thin is the 书房 at 0.6 m² of standable floor, and
// that is not a partition fault — it is 1.20 m wide with a desk, a chair, a printer and a 2.00 m
// bookshelf in it, and `clampMove` inflates each of those by the 0.30 body radius. Fixing it means
// moving that furniture, which is js/home-second.js's to do.
//
// The 次卧 line in the version of this paragraph before the 走道 landed said the second bedroom
// reached "only a ninth" of its floor. That is no longer true — it reads 159/159 — and the reason
// is the doorway widening recorded on the 书房|客厅 wall below: the study was reached through a
// 0.10 m slot, and everything past the study inherited that.
//
// The 客厅 drops from 1366 standable cells to 824 and the 走道 takes 377 of the difference. The
// remaining ~165 cells are the partition itself and the floor its own body radius denies. That is
// what a wall costs, and it is the price of the room existing.

const HomeWalls = { built: false, ROOMS: [], WALLS: [] };

// ================================================================ FLAT_PALETTE — one owner, one kit
//
// The flat reads as eight showrooms rather than as one home, and this is the measured half of why.
// Counting `C('#rrggbb')` literals and `A.col.*` references across the seven room modules on the
// day this was written:
//
//   entry 73 unique hexes / 3 col refs      kitchen 42 / 0     bedroom  59 / 0
//   living 97 / 67                          second  82 / 0     bath     30 / 0
//   dining 47 / 67
//
// 430 distinct hex literals counted per module — and they barely overlap, so the flat-wide figure
// is close to the same: no hex appears in more than four of the seven files, and four of the seven
// rooms reference the shared `A.col` set exactly zero times. After this change the flat-wide count
// of distinct hexes is 408, which is the honest measure of how far this goes: it unifies the
// materials and the timber tones, not the four hundred one-off colours.
//
// Each module also declares its own material kit, so the flat currently owns SIX different
// carcass timbers — wood at matScale .90, .92, .95, .90, .48 and .42 — for what is one landlord's
// fit-out. Nothing in a real flat varies that way; a joiner buys one board.
//
// So this is the kit, and it lives here because ART.md's ownership table gives this file "anything
// a room shares with the room next door", which is exactly what a palette is. It is deliberately
// SMALL: a few surfaces carried across every room read as one dwelling, and unifying all 430
// colours would be a repaint, not a composition pass.
//
// Rooms consume it by aliasing their own kit constant, not by editing five hundred call sites:
//
//     const TIMBER = { ...FLAT_PALETTE.timber };
//
// LOAD ORDER. js/home-walls.js is last of the eleven home modules in index.html, so this binding
// is in the temporal dead zone while the earlier modules' top level runs. Read it INSIDE a builder
// — every FlatFit builder runs long after all scripts have executed — never at a module's top
// level. `window.FLAT_PALETTE` is the same object, for harnesses.
const FLAT_PALETTE = {
  // ---- materials. ART.md's domestic kit, resolved to one value per surface class.
  // Carcass timber: wardrobes, bed, bookcase, cabinets, table legs. .92 is living's value, which
  // sits between the .90 and .95 the other rooms picked and is nearest ART.md's .9 row.
  timber:  { mat: 'wood',    matScale: .92,  matAmt: .29, nrmAmt: .32 },
  // Small joinery: frames, beading, glazing bars, anything narrower than a hand. A narrow member
  // at the carcass repeat gets a fraction of one plank and comes out a flat wash — the reason
  // M_TRIM below is .48 rather than .9, and the same reason applies inside the rooms.
  joinery: { mat: 'wood',    matScale: .46,  matAmt: .24, nrmAmt: .36 },
  // Upholstery and bedding. .34 is living's MEASURED value — Fabric081C's weave at .70 came out
  // twice life size — and it is the one number in here that was established from a picture.
  cloth:   { mat: 'fabric',  matScale: .34,  matAmt: .28, nrmAmt: .48 },
  // Curtains, throws, rug: the same cloth over a much larger area, so a coarser repeat.
  drape:   { mat: 'fabric',  matScale: .48,  matAmt: .26, nrmAmt: .48 },
  // Handles, rails, hinges, appliance trim. Metal049A is near-featureless, so this is a whisper.
  fitting: { mat: 'metal',   matScale: .55,  matAmt: .22, nrmAmt: .46 },
  // Wet-room wall tile, and painted plaster. `paint` is M_WALL below, kept in one place so a
  // partition and a room's own boxed-in wall cannot drift apart.
  tileW:   { mat: 'tile',    matScale: 1.86, matAmt: .24, nrmAmt: .80, gloss: .18 },
  paint:   { mat: 'plaster', matScale: 1.30, matAmt: .24, nrmAmt: .90 },
  // ---- the colours a dwelling actually repeats. Hex, so a room can use them without A.col, and
  // NOT invented: these are js/world.js:120-128's own values, which the 客厅 and the 餐厅 already
  // copy verbatim. Putting a ninth timber set in here to "unify" eight would have been the joke.
  // What the rooms actually did: 次卧 restated the same three woods one or two units off
  // (#4a3628 / #78593f / #a8845c), and the 厨房 and 卫生间 invented their own outright
  // (#765536, #ad8557 / #684a37, #987153). Those are the drifts this closes.
  woodD:  '#4b3628',    // dark carcass: wardrobe body, bookcase, bed frame, worktop
  woodM:  '#76583e',    // mid carcass: doors, drawer fronts, table tops
  woodL:  '#a7835b',    // pale carcass: shelves, sill, bamboo goods
  // Painted joinery — the same cream as every door lining. 76.1% mean-channel value, not the
  // 86.3% this entry used to carry: ART.md:67-79 puts white-painted joinery at 0.72–0.78, and
  // item 394's value pass already moved the rooms' own literals to #cbc4b7. This was the last
  // copy left forked from them, so the door linings read brighter than the joinery they meet.
  trim:   '#cbc4b7',
  skirt:  '#cdc4b4',    // skirting and plinth
  accent: '#a43c2c',    // 春联, cushions, the one red in the flat — the shell's own col.red
};
if (typeof window !== 'undefined') window.FLAT_PALETTE = FLAT_PALETTE;

FlatFit['walls'] = A => {
  if (!A || typeof A.box !== 'function' || !A.FLAT) return HomeWalls;
  const { box, C } = A;
  const F = A.FLAT;
  const Y = A.y0;                       // the deck this flat stands on
  const H = F.h;                        // clear height, floor to ceiling
  const T = 0.10;                       // partition thickness
  // The doll's-house stub. With the walls down a partition is not deleted, it is cut off at this
  // height and the bottom of it stays — which is what The Sims does, and what the owner asked for:
  // "I don't know where the doors are so I run into them". The cull is unchanged (a draw test on
  // `partition`, js/game.js:2351) and so is every collider, so the wall is still there to walk
  // into — the stub is the only thing that says where. A doorway needs no marking of its own: it
  // is simply a stretch where `run` built no wall, so it comes out as a gap in the stub.
  //
  // The height, the 2 mm overlap and the flag all live in `A.partition` (js/build.js
  // `partitionSplit`) now, not here — this flat was where they were chosen by looking, and every
  // other building gets them from the same place rather than by copying this file.

  // A tag per stretch of wall, not one tag for all of them — and this is not cosmetic.
  // `hiddenProp` in js/game.js hides a *tagged* prop by its tag's bounding box, so that a fixture
  // never loses half of itself to the cutaway. Tagging every partition in the flat '墙' makes them
  // one fixture 12 m across: the camera stepping outside the living room then hides every wall in
  // the flat, or none, and what you see is a grey wash with the labels still floating in it.
  // Each solid stretch and each doorway lining gets its own tag, so each hides when the eye is
  // actually behind it and its skirting goes with it.
  let tagN = 0;

  // Plaster on both faces, and a skirting, because a bare slab of `col.wall` at this scale reads
  // as a screen rather than as building. The skirting is what makes it meet the floor.
  // Read off FLAT_PALETTE rather than restated here: the skirting and the jamb cream are two of the
  // five colours the whole flat is supposed to share, and a partition that drifts from the room's
  // own boxed-in joinery is exactly the seam this file exists to close.
  const K = {
    wall:  A.col.wall,
    skirt: C(FLAT_PALETTE.skirt),
    jamb:  C(FLAT_PALETTE.trim),
  };

  // ---------------------------------------------------------------- the material kit
  //
  // ART.md's ownership table gives this file the partitions AND the seams — skirting, door
  // reveals, and anything a room shares with the room next door. Before this, every surface in
  // here was flat colour: the walls were spread with the *shell's* `A.MAT.plaster`, which is
  // matScale .65 / matAmt .20 / nrmAmt .25, and the skirting and the door linings carried no
  // material at all. `.art-walls-before-day.png` is what that looks like at orbit distance — the
  // partitions read as cardboard flats, and the value steps where one solid stretch meets the next
  // are visible *because* there is no texture across the join to break them up.
  //
  // Two materials, not one, and that is the point rather than an economy. A partition is painted
  // plaster; a skirting and a door lining are painted joinery. In a real flat those are the same
  // colour and different materials, and it is the material difference — grain under paint against
  // roller stipple — that makes the skirting read as meeting the floor rather than as a lighter
  // stripe drawn along the bottom of the wall. Flat colour cannot say that; two textures can.
  //
  // WALL. Built at ART.md's painted-interior-wall row exactly (2.4 / .26 / .55), rendered, and
  // MEASURED — not eyeballed, because eyeballing it got the answer wrong. Sampling a
  // partition-only rectangle of the 1-wide-day frame (the 主卧|客厅 face left of its doorway) gave
  // mean luminance 0.7194 before and 0.7129 at the table values, with standard deviation moving
  // 0.0249 to 0.0262. That is the whole effect: six thousandths of a stop darker and 5% more
  // variation. ART.md's row is very nearly a no-op on these walls, and the reason is in the shader:
  //
  //  - matAmt CANNOT lift this wall, so the table's caution is aimed at a risk that is not live
  //    here. gl.js line 744 is `base *= mix(vec3(1.0), t / max(uMatMean, 0.015), uMatAmt)` — the
  //    sample is divided by the material's measured mean before it is applied, so the average
  //    multiplier is 1 by construction and the colour map redistributes value rather than adding
  //    it. The measurement above is that arithmetic showing up in a picture. So matAmt is kept at
  //    the table's value, trimmed only to .24, and it is not the knob that matters.
  //
  //  - nrmAmt at .55 is far weaker than it sounds, and this is the real finding. gl.js line 1028 is
  //    `n = normalize(n + add * uNrmAmt)`, where `add` is the triplanar tangent xy — for plaster
  //    that is a few tenths at most. At .55 the normal tilts by single-figure degrees, and diffuse
  //    falloff is flat near head-on, so a partition lit by its own room's ceiling lamp shows
  //    essentially nothing. The engine's own default is 1.0. .90 puts the tilt where the stipple
  //    actually shades, and because the result is renormalised it cannot blow the value out — which
  //    is why the height channel is the safe place to spend on a pale wall and the colour map is
  //    not. ART.md is right that nrmAmt matters more than matAmt on plaster; it is understated
  //    about how much more.
  //
  //  - matScale comes DOWN from 2.4 to 1.30, and this is the one number I would defend hardest.
  //    Metres per repeat: PaintedPlaster017 is captured at roughly a metre across, so 2.4 stretches
  //    it to two and a half times life size. In the iteration-A frame that is exactly what it looks
  //    like — the colour map stops being stipple and becomes soft metre-wide patches, which read as
  //    damp or as dirt rather than as paint. The shell's .65 fails at the other end: one repeat is
  //    about 50 px at the distance these walls are actually seen from, so the detail lands below a
  //    pixel and averages to flat grey, paying for a texture fetch and showing nothing. At 1.30 the
  //    map sits near the scale it was photographed at, its largest features land around 0.3 m —
  //    some 25 px in this framing — and the wall reads as a wall.
  // These measured values ARE FLAT_PALETTE.paint — stated once, at the top of this file, so a room
  // that boxes in a wall of its own cannot end up with a different plaster from the partition it
  // meets. The paragraphs above are the derivation; the numbers live in the kit.
  const M_WALL = { ...FLAT_PALETTE.paint };

  // JOINERY — the skirting, the two jambs and the soffit of every opening. ART.md has no skirting
  // row; the nearest is its carcass row (wood .9 / .30). Both numbers move, because a skirting is
  // neither a wardrobe door nor bare timber:
  //
  //  - matScale .48, not .9. A skirting is 110 mm tall and a jamb is 60 mm wide. At .9 m per repeat
  //    a member that narrow gets a fraction of one plank and comes out as a single flat wash of
  //    whatever part of the map it happened to land on — which is how you get a skirting that is a
  //    different colour at each end of the same run. At .48 there is grain within the height of the
  //    board, so it reads as a board.
  //
  //  - matAmt .13, well under the table's .30, because this trim is PAINTED. Wood095's colour map
  //    is a strong brown, and unlike plaster it has a wide spread about its mean, so here matAmt
  //    really does move the surface: at .30 on a cream member it stops being paint over timber and
  //    becomes bare timber, and a bare-timber skirting against a cream wall is a louder mistake
  //    than an untextured one. .13 leaves the figure showing through the paint, which is what satin
  //    paint on MDF actually does, and leaves the colour where K.skirt and K.jamb put it.
  //
  //  - nrmAmt .55, for the reason established on the wall above: the height channel is where the
  //    detail is affordable. On a member this narrow it is also the only channel with room to work,
  //    since the colour has to stay pale. It is set below the wall's .90 deliberately — trim is
  //    painted smoother than a skimmed wall, and the gloss below already gives it its edge.
  //
  // The existing gloss values are deliberate and are left alone — .28 on the skirting and .34 on
  // the linings against .10 on the plaster is what makes trim read as trim, and it was already
  // right. Material is being added underneath it, not in place of it.
  const M_TRIM = { mat: 'wood', matScale: .48, matAmt: .13, nrmAmt: .55 };

  // ---------------------------------------------------------------- the plan
  //
  // Each wall is an axis, a position, a run, and its door openings along that run. `ax: 0` is a
  // wall standing at a fixed x running through z; `ax: 2` is the other way about. Openings are
  // given in the run's own coordinate and are holes, not doors.
  //
  // EVERY OPENING IS 0.90 m OR WIDER, AND 0.80 IS NOT ENOUGH. This paragraph used to say 0.80 was
  // "what keeps a 0.30 m body able to get through", which is arithmetically true and practically
  // false, and the difference cost this flat five sealed rooms.
  //
  // clampMove inflates each jamb by the 0.30 body radius, so an opening of width W leaves a run of
  // legal centre positions W - 0.60 wide. At 0.80 that run is 0.20 m. .flatcheck.js samples the
  // floor on a 0.10 m lattice and asks whether the run through a sampled point reaches 0.20 on
  // both axes — so a 0.20 run passes only if a lattice cell lands within about 5 mm of its centre,
  // which is a coin toss on where F.x0 fell and not a property of the building. That is exactly
  // how the 0.70 m 书房 door read as connected: one cell, at x -1.95, dead centre.
  //
  // A run needs to be 2 x STEP wide to be resolvable at all and 3 x STEP for SOME cell to land
  // with a full step either side whatever the phase. 3 x 0.10 = 0.30 of run, which is an opening
  // of 0.90. So 0.90 is the floor here, and it is a lattice fact, not a taste:
  //
  //   0.70 -> 0.10 run   1 lucky cell   sealed in practice   (the 书房, found by audit)
  //   0.80 -> 0.20 run   0 cells        five rooms failed    (次卧 卫生间 阳台 厨房 餐厅)
  //   0.85 -> 0.25 run   passed on luck (主卧, 玄关) — widened anyway, for the same reason
  //   0.90 -> 0.30 run   passes at every lattice phase
  //
  // The 阳台 and 次卧 were on that list without having a narrow door of their own: they sit behind
  // the 卫生间 and 书房 doors, so a throat anywhere on the route seals everything past it. Widen
  // the class, not the instance.
  //
  // Every `at` below has been checked against every prop in the flat. Where a number looks odd it
  // is because the furniture put it there; see the three notes at the head of the file.
  const WALLS = [
    // 主卧 | 客厅. Aligned to x -2.60, which js/home-second.js already uses for its own partition
    // further south, so the two read as one line down the flat.
    //
    // The opening is at z 1.95..2.80 and that is measured, not chosen. The first version put it at
    // z 1.00..1.85, which looked right on the plan and sealed the master bedroom completely: the
    // 主卧 stands a solid 0.22 × 0.62 pier at x -2.82..-2.60, z 1.00..1.62, straight through it.
    // Sweeping the whole line for stretches where a body fits on both sides gives exactly two
    // gaps — z -0.50..0.65 and z 1.95..2.80 — and this is the northern one, which puts the door
    // where you meet it walking in from the 玄关 rather than behind the bed.
    { id: '主卧|客厅', ax: 0, at: -2.60, lo: -1.30, hi: 3.15, doors: [[1.90, 2.80]] },

    // 主卧 | 次卧, the west end of the south wall. No door: the second bedroom opens off the
    // 书房, which js/home-second.js builds and doors itself, and a spare room reached through the
    // master is not a room anybody would plan.
    { id: '主卧|次卧', ax: 2, at: -1.30, lo: -6.00, hi: -2.55, doors: [] },

    // 书房 | 客厅. The study's north wall. js/home-second.js owns the study's west side (its own
    // partition at x -2.60) and its floor; this is the only side of it nobody had built.
    //
    // The opening was 0.70 m — x -2.30 .. -1.60 — and the only one in this list under the
    // 0.80 the note above says a body needs. MEASURED, not argued: clampMove inflates each of the
    // two flanking colliders by the 0.30 body radius, so the standable slot for a body *centre*
    // was x -2.00 .. -1.90, a tenth of a metre. .flatcheck.js passed it anyway and that pass was
    // an accident of its own grid: it samples cell centres on a 0.10 m lattice off F.x0 = -6.00,
    // which puts exactly one column, x = -1.95, inside the slot — dead centre, by luck. One
    // column of a 0.10 grid is not a doorway, it is a needle the flood fill happened to thread.
    // 0.90 here rather than 0.80: the study is only 1.20 m wide, so a cased opening is what you
    // would actually build, and it widens the slot to 0.30 m — four sampled columns instead of
    // one. The two stubs left, 0.15 and 0.10, are above run()'s 0.02 floor and still get built.
    { id: '书房|客厅', ax: 2, at: -1.30, lo: -2.55, hi: -1.40, doors: [[-2.40, -1.50]] },

    // 客厅 | 卫生间 + 厨房, the long south wall, with a door into each. It starts at x -1.40
    // because west of that is the 书房, which is somebody else's room and already walled.
    { id: '客厅|卫生间+厨房', ax: 2, at: -2.20, lo: -1.40, hi: 6.00,
      doors: [[-0.65, 0.25], [3.20, 4.20]] },

    // 书房 | 卫生间. The study runs to z -5.00 in js/home-second.js, so this closes the bathroom
    // off from it rather than from the living room.
    { id: '书房|卫生间', ax: 0, at: -1.40, lo: -5.00, hi: -2.20, doors: [] },

    // 卫生间 | 厨房. The fitted bathroom and kitchen meet on this service wall; it gives the
    // bathroom the smaller half, which is how the two divide in a flat this size.
    { id: '卫生间|厨房', ax: 0, at: 2.20, lo: -5.00, hi: -2.20, doors: [] },

    // 客厅 | 餐厅 + 玄关. Runs the full depth, meeting the 玄关's own south wall at z 1.61 in a T.
    // Two openings: the 餐厅 in the middle of the room, and the 玄关 up by the front door — so you
    // come in, take your shoes off, and step through into the living room, which is the sequence
    // the 玄关 exists for.
    { id: '客厅|餐厅+玄关', ax: 0, at: 2.75, lo: -2.20, hi: 3.15,
      doors: [[-0.40, 0.60], [2.15, 3.05]] },

    // 走道 | 客厅. Room 10 in APARTMENT.md and the one strip of this flat nobody owned: the
    // ROOMS table below used to fold z 1.60..3.20 into the living room, so the walk from the
    // front door to the sofa never crossed a hall, it crossed a lit corner of the room it was
    // walking into. This is the line that makes it a hall.
    //
    // at 1.65, not 1.60, and the 5 cm is the whole point. js/home-living.js:194 already names
    // z = 1.60 "the television wall, backing onto the 走道", and hangs the photograph wall on it
    // at PZ = 1.565 with frame boxes 34 mm deep — so the frames reach z 1.582 and the note at
    // :497 says they were built to stand 18 mm proud of a wall surface at 1.600. A partition
    // centred on 1.60 would have swallowed them. Centred on 1.65 its south face lands exactly on
    // 1.600, which is the wall those frames were measured against, and the TV console collider
    // (x -0.03..1.93, z 1.12..1.60) butts it without overlapping.
    //
    // One opening, and it is west of the television because it is the only place it can be. The
    // console occupies x -0.03..1.93 and clampMove inflates that to -0.33..2.23, so a doorway
    // anywhere across it is a doorway you cannot stand south of; east of it there is only 0.27 m
    // of standable x before the x 2.75 wall, which is the 书房's disease again. West of it there
    // is room, so 1.00 m at x -1.85..-0.85 — wider than the flat's 0.80 doors on purpose, since a
    // hall opening is a cased opening, and it leaves a 0.40 m standable slot.
    { id: '走道|客厅', ax: 2, at: 1.65, lo: -2.60, hi: 2.75, doors: [[-1.85, -0.85]] },
  ];

  // ---------------------------------------------------------------- building one
  //
  // A wall is its solid stretches, not the whole run minus holes drawn on top: a hole in this
  // renderer is a hole, and drawing a full slab and then a doorway in front of it is two coplanar
  // faces, which is the trap that has taken this game down three times. So the openings are sorted
  // and the gaps between them are built as separate boxes.
  function run(w) {
    // Everything this function builds IS the partition — the slab, its skirting, the head over
    // each opening and the lining round it — so the flag goes on once here rather than being
    // repeated in six option objects that would then drift apart. `SET.wallsOff` in js/game.js
    // reads it through `hiddenProp`, which is a drawing test only: the `A.stop` colliders below
    // are untouched, so walls down never makes a wall walkable. Shadowing `box` inside `run`
    // keeps the flag off every other prop this file makes (the door leaves take it separately,
    // because a leaf left hanging in a doorway that no longer exists is worse than no door).
    const box = (...a) => { const p = A.box(...a); if (p) p.partition = true; return p; };
    const cuts = w.doors.slice().sort((a, b) => a[0] - b[0]);
    const segs = [];
    let at = w.lo;
    for (const [a, b] of cuts) {
      if (a > at) segs.push([at, a]);
      at = Math.max(at, b);
    }
    if (at < w.hi) segs.push([at, w.hi]);

    for (const [a, b] of segs) {
      const len = b - a, mid = (a + b) / 2;
      if (len < .02) continue;
      const tag = '墙' + (++tagN);
      const x = w.ax === 0 ? w.at : mid, z = w.ax === 0 ? mid : w.at;
      const sx = w.ax === 0 ? T : len, sz = w.ax === 0 ? len : T;
      // Two boxes, not one, and the split is the whole doll's-house fix: the lower stub carries
      // no `partition` flag and survives walls-down, everything above it takes the flag and goes.
      // Same plane, same thickness, same paint — the seam is invisible with the walls up.
      //
      // `A.partition` (js/build.js `partitionSplit`) owns the stub height, the 2 mm overlap and
      // the flag, so this file no longer states any of the three and no other building has to
      // restate them either. It is handed the UNSHADOWED `A.box` and the flag arrives in `o` on
      // the upper piece only — the shadowed `box` above would have flagged both and deleted the
      // stub, which is the thing the stub exists to be.
      A.partition(Y, H, (yc, hh, o) =>
        A.box(x, yc, z, sx, hh, sz, K.wall, { hard: true, gloss: .10, tag, ...M_WALL, ...o }));
      // The skirting, 8 mm proud of the plaster on both faces so it catches the light the wall
      // does not. Built as one box straddling the wall rather than two stuck on the sides: at this
      // size the 8 mm either side is all that is ever seen and one box cannot z-fight with itself.
      // `A.box`, not the shadowed `box`: the skirting is the bottom of the wall, so it belongs to
      // the stub. A stub standing with its trim stripped off would read as an unfinished kerb.
      A.box(x, Y + .055, z, sx + (w.ax === 0 ? .016 : 0), .11, sz + (w.ax === 0 ? 0 : .016),
        K.skirt, { hard: true, gloss: .28, tag, ...M_TRIM });
      // A collider per stretch, so the doorways are genuinely walkable and the wall genuinely is
      // not. `A.stop` inflates by nothing; `clampMove` in js/build.js adds the body radius.
      A.stop(x - sx / 2, x + sx / 2, z - sz / 2, z + sz / 2);
    }

    // The head over each opening, and its two reveals. Without the head an internal doorway is a
    // slot cut to the ceiling, which reads as a missing wall rather than as a door — which is the
    // whole problem this file was opened to fix, reintroduced one hole at a time.
    for (const [a, b] of cuts) {
      const len = b - a, mid = (a + b) / 2, top = 2.06;   // standard internal door head
      if (len < .02 || top >= H) continue;
      const tag = '墙' + (++tagN);
      const x = w.ax === 0 ? w.at : mid, z = w.ax === 0 ? mid : w.at;
      const sx = w.ax === 0 ? T : len, sz = w.ax === 0 ? len : T;
      box(x, Y + (top + H) / 2, z, sx, H - top, sz, K.wall,
        { hard: true, gloss: .10, tag, ...M_WALL });
      // The lining round the opening: two jambs and a soffit, 12 mm proud of the plaster. These
      // three are the door reveal, which ART.md's table names as this file's, and they are the one
      // seam in the flat that is looked at from a metre away rather than from orbit — you walk
      // through it. So they carry the same joinery material as the skirting: same paint, same board,
      // and the reveal turning the corner out of the room reads as lined rather than as a hole.
      for (const s of [-1, 1]) {
        const jx = w.ax === 0 ? x : mid + s * (len / 2 - .03);
        const jz = w.ax === 0 ? mid + s * (len / 2 - .03) : z;
        box(jx, Y + top / 2, jz,
          w.ax === 0 ? T + .024 : .06, top, w.ax === 0 ? .06 : T + .024,
          K.jamb, { hard: true, gloss: .34, tag, ...M_TRIM });
      }
      box(x, Y + top - .03, z,
        w.ax === 0 ? T + .024 : len, .06, w.ax === 0 ? len : T + .024,
        K.jamb, { hard: true, gloss: .34, tag, ...M_TRIM });
    }
  }

  for (const w of WALLS) run(w);

  // ---------------------------------------------------------------- leaves on two of the openings
  //
  // The note at the head of the plan chose holes over doors for the whole flat. That is right for
  // a 走道 opening and wrong for a bedroom and a bathroom, which are the two rooms in any flat
  // that are expected to shut. A leaf standing open in the reveal is what says the opening is a
  // door rather than a gap somebody forgot to fill.
  //
  // ponytail: these are geometry, not colliders — `A.stop` is deliberately not called for either.
  // Note 4 at the head of this file is a room that an open leaf's axis-aligned collider sealed
  // completely, and neither leaf below stands anywhere the body's own slot through its doorway
  // passes. If a leaf is ever made to swing and latch, its collider has to be derived from the
  // angle the way js/home-second.js:139-155 does it, and re-flood-filled.
  //
  // Both are parked at an angle that leaves them axis-aligned, which is not laziness for its own
  // sake: an angled leaf needs its position derived through a rotation, and it was a leaf hung at
  // an angle with a box-shaped collider that produced note 4 in the first place.
  function doorLeaf(cx, cz, sx, sz, hx, hz) {
    // The leaf goes with its wall. Same shadow as in `run` above, for the same reason: a door
    // standing open in mid-air with no wall to hang from reads as a bug rather than as a doll's
    // house. The handle is A.cyl and takes the flag on the object after the fact.
    const box = (...a) => { const p = A.box(...a); if (p) p.partition = true; return p; };
    const tag = '墙' + (++tagN);
    const top = 2.03;                                   // 30 mm under the head, as a leaf hangs
    box(cx, Y + top / 2, cz, sx, top, sz, K.jamb, { hard: true, gloss: .34, tag, ...M_TRIM });
    // Two sunk panels and a mid rail, which is what a domestic internal door is. Sunk rather than
    // planted: the recess is a darker box set 6 mm into the face, so it reads at a metre without
    // adding a silhouette that can catch the light wrongly at orbit distance.
    // Planted, straddling the leaf's face rather than sunk flush with it: a moulding whose back
    // face lands exactly on the face it is applied to is two coplanar faces, which is the trap
    // the head of this file records taking the game down three times.
    const along = sx > sz, L = along ? sx : sz, T = along ? sz : sx;
    for (const s of [-1, 1]) {
      const py = Y + top / 2 + s * top * .245, ph = top * .34;
      box(along ? cx : cx - T * .42, py, along ? cz - T * .42 : cz,
        along ? L - .16 : T * .30, ph, along ? T * .30 : L - .16,
        K.skirt, { hard: true, gloss: .30, tag, ...M_TRIM });
    }
    // The handle, on the leading stile — the end away from the hinge.
    const dx = along ? Math.sign(cx - hx) : 0, dz = along ? 0 : Math.sign(cz - hz);
    const h = A.cyl && A.cyl(cx + dx * (L / 2 - .07), Y + 1.03, cz + dz * (L / 2 - .07),
      .017, .10, K.skirt, { rx: Math.PI / 2, gloss: .52, tag });
    if (h) h.partition = true;
  }
  // 主卧, hinged on the south jamb of its z 1.90..2.80 opening and standing square open into the
  // bedroom. Checked against every collider that room builds — bed (z -1.40..0.80), both
  // nightstands, the wardrobe (z 2.48..3.20), the mirror at z 1.30 and the 0.22 pier at
  // z 1.00..1.62 — the leaf's z 1.88..1.92 band is clear of all of them. It is also clear of the
  // body's own slot through the doorway, which clampMove puts at z 2.20..2.50.
  doorLeaf(-3.05, 1.900, .90, .042, -2.60, 1.90);
  // 卫生间, hinged on the east jamb of its x -0.65..0.25 opening and standing square open into the
  // bathroom rather than folded flat against the wall.
  //
  // Flat was WRONG and this is the correction: laid back along the wall the leaf covered x 0.25 ..
  // 1.15 at z -2.271, and the vanity carcass at js/home-bath.js:107 is x 0.38..1.14, z -2.69 ..
  // -2.23. The leaf was buried inside it. Square open it stands at x 0.23..0.27 running z -2.27 ..
  // -3.17, which clears the vanity's west face by 0.11 and the shower screen at x 0.03 by 0.20 —
  // and it is 0.28 clear of the body's own slot through the door, at x -0.35 .. -0.05.
  doorLeaf(.250, -2.721, .042, .90, .25, -2.271);

  // ---------------------------------------------------------------- 储藏 the store off the hall
  //
  // APARTMENT.md:64 promises 走道 + 储藏 as one room and no file built either half. The hall is
  // the wall above; this is the store, and it is a cupboard rather than a walk-in because the
  // strip is 1.55 m deep and a walk-in would eat the route it stands on.
  //
  // Sited on the hall's north wall between its two doors, and that is measured rather than
  // chosen: the 主卧 door lands at x -2.60 z 1.95..2.80 and the 玄关 door at x 2.75 z 2.20..3.05,
  // so x 0.20..1.60 is the one stretch of north wall neither of them approaches. At 0.34 deep its
  // inflated collider stops the body at z 2.56, which still leaves the 0.55 m of hall the through
  // route needs, and it is deep enough for what actually goes in one — the boxed shoes, the
  // folding table, the spare quilt, the suitcase that will not fit on a wardrobe.
  const SBX0 = .20, SBX1 = 1.60, SBZ0 = 2.86, SBZ1 = 3.20;
  const sbW = SBX1 - SBX0, sbCX = (SBX0 + SBX1) / 2, sbCZ = (SBZ0 + SBZ1) / 2, sbH = 2.32;
  box(sbCX, Y + sbH / 2, sbCZ, sbW, sbH, SBZ1 - SBZ0, K.jamb,
    { hard: true, gloss: .30, tag: '储藏', ...M_TRIM });
  // Two doors with a shadow gap between them, and a hand's worth of handle on each. The gap is
  // the whole reason this reads as a cupboard rather than as a boxed-in pipe: a 1.40 m slab of
  // one colour is a duct, and one dark 12 mm line down the middle of it is a pair of doors.
  // Every layer is set proud of the one under it by more than half its own thickness, so no two
  // faces are coplanar — the door front sits at z 2.816 against a carcass face at 2.860, and each
  // planted panel straddles its door's face rather than lying flush on it.
  for (const s of [-1, 1]) {
    const dcx = sbCX + s * (sbW / 4 + .006);
    box(dcx, Y + 1.12, SBZ0 - .026, sbW / 2 - .022, 2.16, .036, K.jamb,
      { hard: true, gloss: .34, tag: '储藏', ...M_TRIM });
    box(dcx - s * .012, Y + 1.12, SBZ0 - .044, sbW / 2 - .30, 1.92, .014,
      K.skirt, { hard: true, gloss: .30, tag: '储藏', ...M_TRIM });
    if (A.cyl) A.cyl(dcx - s * (sbW / 4 - .07), Y + 1.05, SBZ0 - .062, .016, .11,
      K.skirt, { rx: Math.PI / 2, gloss: .52, tag: '储藏' });
  }
  if (A.shade) A.shade(sbCX, sbCZ, sbW + .10, (SBZ1 - SBZ0) + .12, .34);
  A.stop(SBX0, SBX1, SBZ0, SBZ1);
  if (A.th) A.th('储藏', sbCX, Y + 1.62, SBZ0 - .06,
    '储藏柜里塞满了不常用的东西。', 'The store cupboard is stuffed with things nobody uses.',
    '储藏 chǔcáng — to store away. 储藏室 is a store room; this flat only runs to a cupboard.',
    { focus: [sbCX, 2.50], reach: 1.60, tag: '储藏' });

  // ---------------------------------------------------------------- the rooms themselves
  //
  // Handed to js/world.js so `roomAt` can return the room you are standing in rather than "the
  // flat". That is what gives each one its own overhead lamp and its own cutaway bounds — without
  // it a 12 × 8 m flat is lit by a single bulb hanging in the middle of it, which is the other
  // half of why nothing read as a room.
  //
  // These are the *rooms*, not the walkable zones: the body still walks the flat as one region and
  // is kept out of the walls by the colliders above. Keeping the two separate is deliberate —
  // per-room walkable zones would have to model every doorway as a zone of its own, and a body
  // that steps into a gap between two zones stops dead in a doorway.
  //
  // `near` is the camera's orbit limit in this room, and setting it per room is what stops the
  // flat feeling like it needs constant re-zooming.
  //
  // Measured: the player's own `CAM.tDist` is 4.4, and every room's `clearWall` band tops out
  // below 2.9 — the widest, the 客厅, clamps at 2.16..2.86. So at the default distance the eye was
  // outside the walls in every room and in every direction, permanently. The cutaway then hid
  // whichever walls it was behind, and because each room is a differently shaped box, crossing a
  // doorway swapped the box and swapped which walls vanished. The camera had not moved and the
  // framing changed anyway, which is exactly the thing that makes you reach for the scroll wheel.
  //
  // So each room asks for a distance its own size can hold: 0.42 of its narrow dimension plus a
  // metre and a third, floored at 1.9 so the 书房 at 1.20 m wide is not unusable and capped at 3.4
  // so the 客厅 does not send the eye out through the building. game.js eases `CAM.near` toward
  // this rather than snapping, and its own note is explicit that this is a limit laid over the
  // player's zoom and released the moment they walk out — it never overwrites `CAM.tDist`, so
  // zooming still works and still means something.
  const camNear = (w, d) => Math.max(1.9, Math.min(3.4, 0.42 * Math.min(w, d) + 1.35));
  const R = (id, hz, x0, x1, z0, z1, lx, lz) => ({
    id, hz, x0, x1, z0, z1,
    light: [lx === undefined ? (x0 + x1) / 2 : lx, Y + H - .18,
            lz === undefined ? (z0 + z1) / 2 : lz],
    ceil: Y + H - .04,
    near: camNear(x1 - x0, z1 - z0),
  });
  // 阳台 — THE DECISION, recorded here because item 175 asks for one and because two files
  // disagreed. APARTMENT.md:63 gives the balcony its own grid cell at x 1.40..3.40, z -5.00..-1.60.
  // That cell cannot exist: js/home-bath.js has built the bathroom across x -1.40..2.20 and
  // js/home-kitchen.js the kitchen across x 2.20..6.00, so APARTMENT.md's balcony overlaps both of
  // them, and this file's own rule is that the plan is read off the build rather than off the
  // paper. The build is also the more Beijing answer: js/home-bath.js:1 already calls itself
  // "卫生间 + 生活阳台" and its :207-240 laundry end — front-loader, pulley rack, mop, detergent —
  // is a 生活阳台 enclosed behind the same frosted outer window, which is what happened to most of
  // them. So 阳台 is the east metre of the bathroom, not a tenth room, and it is registered below
  // as its own box carved out of the bathroom's rather than left as a label inside it. The two
  // boxes tile the old one exactly at x 1.20: everything west of that line is bathroom (basin,
  // toilet at -1.25, shower to 0.03, towel rail and heater at 0.36..0.65) and everything east of
  // it is laundry (machine from 1.36, rack 1.38..2.02, mop, slippers).
  HomeWalls.ROOMS = [
    R('bed',    '主卧',   -6.00, -2.60, -1.30,  3.20),
    R('second', '次卧',   -6.00, -2.60, -5.00, -1.30),
    R('study',  '书房',   -2.60, -1.40, -5.00, -1.30),
    R('bath',   '卫生间', -1.40,  1.20, -5.00, -2.20),
    R('balcony','阳台',    1.20,  2.20, -5.00, -2.20),
    R('kitchen','厨房',    2.20,  6.00, -5.00, -2.20),
    R('living', '客厅',   -2.60,  2.75, -2.20,  1.65),
    R('hall',   '走道',   -2.60,  2.75,  1.65,  3.20),
    R('dining', '餐厅',    2.75,  6.00, -2.20,  1.61),
    R('entry',  '玄关',    2.75,  6.00,  1.61,  3.20),
  ];
  HomeWalls.WALLS = WALLS;
  HomeWalls.built = true;
  return HomeWalls;
};
