// 🚬 Smoking room — The glass vitrine with its two haze volumes, ash bin, smoker
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x 6.0 .. 8.0, -z side  (airside)
//   camera  D-smoke (new)
//
// The glass vitrine with its two haze volumes, ash bin, smoker. A real Chinese airside fixture
// and the most camera-worthy small space in the terminal. The haze is translucent, so read the
// note about alpha and batching below before you build it.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D-smoke`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHERE THE ROOM ACTUALLY IS, AND WHY THIS FILE ONLY BUILDS HALF OF IT
//
// Read this before adding anything, because the obvious first move here is wrong and expensive.
//
// The 吸烟室 is ALREADY BUILT, inline, in js/airport.js (`const SMX = 6.20`, in `build()`). Wave 0
// carved out the AirFit registry and the `A` toolkit but did NOT migrate the zone bodies out of
// `build()` — no zone's geometry has moved yet. So the vitrine, its five translucent props, its
// extract grille, its standing ashtray and its one smoker all exist and are drawn on every frame,
// and `build()` runs BEFORE `buildZones()` (see the note above `const A` in airport.js).
//
// That has two consequences this file is written around:
//
//   1. REBUILDING THE VITRINE HERE WOULD DOUBLE IT. Same coordinates, same panes: coincident
//      translucent faces z-fighting against each other, ten translucent props where five will do,
//      and double the fill through the most overdrawn 3.6 m² in the terminal. So this file does
//      not build the box. It builds the DELTA — the things the room was missing — at the existing
//      room's own datums, restated in `R` below and kept in step with airport.js by hand.
//
//   2. THE CONTRACT TABLE'S `z-` IS WRONG FOR THIS ZONE. AIRPORT.md puts the smoking room at
//      `x 6..8 z-`, but the built room is on `+z`, against the back wall at x 4.40..8.00, and its
//      front pane faces the concourse across -z. The `-z` half of x 6..8 is not free either: the
//      gate lounge's seat rows sit at z -3.40 / -4.70 / -6.60 (airport.js `seatRun`), so a vitrine
//      dropped there would land in another agent's furniture and inside DC-lounge's frame. The
//      table's z column is unreliable for the airside back wall generally — it also puts the WC at
//      `x 6..8 z+`, which is this room. Tickets 1 and 4 in the report.
//
// The shipped D-smoke camera was framed from that table rather than from the code, so it looked
// at (7.0, -2.0) — out across the lounge, with the smoking room squarely behind it. The brief
// allows reframing; the row now stands off the front pane at (8.59, 3.43) and looks back at the
// glass. That is the one row this file's owner touched.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The airport draws at ~15.6 ms a frame today (60+ fps) with 4,141 props. Fifteen zones adding
// freely is how that becomes 30 ms. Your budget is **250 props**, and the rules that decide
// whether a prop is cheap or expensive are not obvious:
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Fifty identical seats are
//     one draw call. Fifty seats in fifty slightly different colours are still one draw call —
//     colour, gloss, alpha and glow travel per instance. Vary those freely.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Haze, glass, steam: use them where they
//     earn it and count them.
//   * Glyphs DO batch now (as of 2026-08-04 — the atlas cell is a per-instance attribute), so
//     real writing is cheap. Use real characters; that is the whole point of the game.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Reuse the
//     shell's materials off `A` (A.M_STONE, A.M_METAL, …) rather than inventing your own.
//
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// THIS FILE ADDS ZERO TRANSLUCENT PROPS. Measured before building, the airport was already over
// budget — 20.7 ms median, 48 fps, 377 draw calls — so the third, drifting haze volume that was
// going to sell the room's motion was cut rather than shipped quietly. It would have cost one more
// unbatchable draw call and, worse, another 3.3 × 0.6 m of near-camera overdraw across the frame's
// brightest area, which is fill rate on a scene that is already fill-bound. The five translucent
// props the room needs — three glass panes and two graded haze volumes — already exist in
// airport.js, and two volumes is the right order of magnitude for the effect. What this file adds
// The cigarette and ember now belong to each animated NPC's wrist attachment. Keeping another
// world-space ember in this room would make the glow drift away from the hand as the pose moves.
//
// The lit-box read is likewise bought with opaque props: an emissive tube under the ceiling slab,
// drawn in the opaque pass so the existing haze blends OVER it, which is exactly a fluorescent
// seen through smoke. That is one batched box standing in for a light the room could not afford —
// the hall ranks only its eight nearest point lights per frame, so a second `A.light` in here
// would have been taken out of the lounge's or duty-free's allowance for the sake of one fitting.
//
// ---------------------------------------------------------------------------------------------

registerAirportAmbient('smoking-room-east', 7.62, 7.28, Math.PI * .88,
  { hz:'旅客', roleClass:'civilian', top:'#33383f', pants:'#23272d',
    act:'smoke', held:'cigarette', temper:'bored', source:'air-smoke' });
registerAirportAmbient('smoking-room-west', 5.35, 7.30, Math.PI * 1.14,
  { hz:'旅客', roleClass:'civilian', top:'#3d3630', pants:'#292420',
    act:'smoke', held:'cigarette', temper:'weary', source:'air-smoke' });

AirFit['smoke'] = A => {
  const { box, cyl, glyphs, thing } = A;
  const { C, G, col } = A;
  const M_METAL = A.M_METAL;

  // ---- the room's datums, restated from js/airport.js `build()`.
  //
  // These are a COPY, not a source. If the vitrine in airport.js ever moves, or the Mech migrates
  // it into this file (ticket 1), these are the numbers to reconcile. Every one of them is read
  // off the inline block rather than guessed:
  //
  //   front pane   box(SMX, 1.45, RZ - 1.60, 3.60, 2.90, .12)   → z 6.84 .. 6.96, x 4.40 .. 8.00
  //   side panes   box(SMX ± 1.80, 1.45, RZ - .80, .12, 2.90, 1.60)
  //   ceiling slab box(SMX, 2.94, RZ - .80, 3.72, .10, 1.70)    → underside 2.89
  //   bin          box(SMX - 1.10, .45, RZ - .70, 1.20, .90, .50) → x 4.50..5.70, z 7.55..8.05
  //   ashtray      cyl(SMX + 1.00, .50, RZ - 1.00, .22, 1.00)     → x 6.98..7.42, z 7.28..7.72
  //   smoker       agent(SMX + .18, RZ - .96, π/2)                → (6.38, 7.54), facing +x
  //   grille       box(SMX, 2.86, RZ - .60, 1.10, .05, .70)
  //   fascia       box(SMX, 3.20, RZ - 1.68, 2.20, .40, .10)      → z 6.77 .. 6.87
  const RZ = A.RZ;
  const R = {
    x: 6.20,                    // SMX, the room's centre line
    zFront: RZ - 1.60,          // 6.90 — centre of the front pane
    zBack: RZ,                  // 8.50 — the +z wall the box is built against
    xIn0: 6.20 - 1.74, xIn1: 6.20 + 1.74,   // 4.46 .. 7.94, inside the side panes
    zIn0: RZ - 1.54,            // 6.96, inside the front pane
    ceil: 2.89,                 // underside of the slab
  };
  const T = { tag: '吸烟室' };

  // ================================================================ inside the box
  // The room had one man in it and nowhere to sit, which is the one thing a smoking room in a
  // Chinese terminal never is: they are standing-room, busy, and there is always a bench along
  // the back that nobody is using because everyone is crowded at the ashtray.

  // ---- the bench, along the back wall between the bin and the ashtray.
  // The clear run is x 5.70 (end of the bin) .. 6.98 (start of the ashtray), so this is a
  // 1.20 m two-seater and not a metre more. Steel, and on A.M_METAL so it batches with the
  // terminal's other metal rather than opening a draw call for four boxes.
  const BX = 6.38, BZ = 8.22;
  const BM = { ...T, hard: true, gloss: G.metal, ...M_METAL };
  // steelD throughout, not steel: the pale grey read as a lit white slab behind the smokers and
  // pulled the eye off them. The one bright thing in this box is the tube.
  for (const s of [-1, 1]) box(BX + s * .50, .22, BZ, .07, .44, .34, col.steelD, BM);
  box(BX, .46, BZ, 1.20, .07, .40, col.steelD, BM);
  box(BX, .74, BZ + .17, 1.20, .34, .06, col.steelD, BM);
  // Somebody's bag on it, because an empty bench in a full room is furniture and a bag on it is
  // a person who is standing up over there.
  box(BX + .34, .60, BZ - .02, .40, .24, .22, C('#3b3a35'),
    { ...T, hard: true, mode: 7, gloss: .10, ry: .22 });

  // ---- two more smokers, so the box has a crowd in it.
  //
  // Placed to clear the fittings, not by eye: the ashtray column occupies x 6.98..7.42, so the
  // man using it stands at 7.62 (body x 7.42..7.82, inside the far pane at 7.94); the bin
  // occupies z 7.55..8.05, so the other stands in front of it at z 7.30. With the inline smoker
  // at 6.38 the three of them spread evenly across the glass at x 5.35 / 6.38 / 7.62.
  //
  // Both are in dark clothes on purpose, and the reason is recorded in airport.js: the glazing is
  // 28% alpha and a pale figure behind it goes to a smudge, so the people in this room are the
  // darkest silhouettes in it. Through smoked glass in a smoke-filled room that is the correct
  // amount of indistinct.
  // ---- the fluorescent under the slab.
  //
  // The room is a fog you can only see if something is putting light through it, and the hall's
  // point lights are rationed (eight nearest, ranked per frame). An emissive tube is the whole
  // effect for one batched box: it is drawn in the OPAQUE pass, so the two haze volumes — which
  // are drawn after everything opaque — blend over the top of it, and a bright line seen through
  // smoke is exactly what a smoking room's ceiling looks like. Two of them, fore and aft of the
  // extract grille at z 7.90, so the light is spread across the box rather than a hot spot in
  // the middle of it.
  // Glow .22 and not the .52 this shipped at first. The renderer runs bloom, and 5.6 m of emissive
  // tube pointed straight down the camera axis at half a unit of glow smeared a milky veil across
  // the WHOLE frame — the duty-free shelves two bays away and the 出口 door on the far side of the
  // hall both came out fogged. A smoking room is supposed to be the only hazy thing in the
  // picture; when the haze is everywhere it stops reading as haze.
  // 7.24 and 8.36 clear the extract grille, which spans z 7.55..8.25 with its slats ending at
  // 8.165 — at 8.30 the far tube clipped the grille's back edge by 5 mm.
  for (const tz of [7.24, 8.36])
    box(R.x, 2.84, tz, 2.80, .05, .11, col.tube, { ...T, hard: true, mode: 1, glow: .22 });

  // ================================================================ the front, and the notice
  // ---- the door.
  //
  // The vitrine is sealed — airport.js closes the whole footprint with `solid(SMX ± 1.9, RZ - 1.70,
  // RZ)`, and this file does not open it, because the brief's framing is the room "seen from
  // outside" and because the collider belongs to the shell. So this is a door LEAF drawn on the
  // glass, not a way in: two stiles, a head rail and a pull. It costs four boxes and it is the
  // difference between a glass box and a room that people are getting into and out of.
  //
  // No clamp check is owed on it: with the footprint solid there is no opening for the 0.30 m
  // body radius to fail to fit through. Ticket 3 if the room is ever meant to be enterable.
  const DXc = 6.95, DFz = R.zFront - .06;              // 6.84, the outer face of the pane
  const DM = { ...T, hard: true, gloss: G.metal, ...M_METAL };
  for (const s of [-1, 1]) box(DXc + s * .43, 1.06, DFz, .05, 2.12, .04, col.chrome, DM);
  box(DXc, 2.10, DFz, .91, .05, .04, col.chrome, DM);
  cyl(DXc + .30, 1.06, DFz - .05, .017, .34, col.chrome, { ...T, gloss: G.metal });   // the pull

  // ---- 请勿在此区域外吸烟, on the outside of the glass.
  //
  // The sign that makes the room mean something. A smoking room is only a smoking room because
  // of the rule outside it, and the hall already says the other half of the sentence — the PA
  // reads 航站楼内禁止吸烟，需要吸烟的旅客请到吸烟室 (airport.js NOTICES) and there is a 禁止吸烟
  // on the security partition. This is the notice at the door itself.
  //
  // White on red, which is what a prohibition reads as in a Chinese terminal, and mounted at
  // z 6.80 — .04 clear in front of the pane's outer face at 6.84, because a plate sharing a
  // face with glass is a plate that flickers through it.
  const NX = 5.05, NZ = R.zFront - .10;
  box(NX, 1.90, NZ, 1.00, .22, .04, col.red, { ...T, hard: true, gloss: .18 });
  // Lifted .025 above the plate's centre: a glyph sits low in its atlas cell, so text set on the
  // plate's own centre line prints in the bottom third of it.
  glyphs(NX, 1.925, NZ - .022, Math.PI, '请勿在此区域外吸烟',
    { size: .075, gap: .022, color: col.white, tag: '吸烟室' });

  // ---- the stub-out bin on the concourse side, at the left of the approach.
  // You put it out before you walk away, and the terminal gives you somewhere to do it.
  // Same option signature as the inline ashtray column (`gloss: G.metal`, no material override), so
  // the three cylinders this zone puts in the room batch together instead of taking a draw call each.
  cyl(4.15, .40, 6.42, .17, .80, col.steelD, { ...T, gloss: G.metal });
  cyl(4.15, .81, 6.42, .155, .03, C('#8d8878'), { ...T, gloss: G.metal });

  // The notice's own word. 吸烟室 is already a `thing` on the room itself (airport.js), so this one
  // teaches the prohibition rather than repeating the noun, and stands off to the -x side where
  // the plate is so the two do not compete for the same ray.
  thing('请勿吸烟', NX, 1.90, NZ - .30, '请勿在此区域外吸烟。',
    'Please do not smoke outside this area.',
    '请勿 is the polite written "please do not" — 勿 on a sign where speech would use 别. ' +
    '区域 an area, 外 outside it.',
    { tag: '吸烟室', focus: [NX, R.zFront - 1.60], reach: 2.0 });
};
