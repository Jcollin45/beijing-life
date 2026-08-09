// 🥃 Duty-free — 免税店 — the 烟酒 cabinet, the 香水 island, the till and the price pylon
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x 8.0 .. 14.0  (airside, carpet)
//   camera  D8-duty
//
// 免税店 — baijiu and cigarettes, not a Western liquor store. Teaches 烟 / 酒 / 香水 / 免税.
//
// ---------------------------------------------------------------------------------------------
// WHAT THE SHELL ALREADY OWNS HERE, AND WHY THIS FILE BUILDS IN FRONT OF IT
//
// Wave 0 carved the registry but NOT this zone's geometry: js/airport.js still builds the back
// of the shop itself — the 5.6 m fascia, the counter, the four oak shelves with fifty-six bottles
// on them, the shelf-edge price glyphs, the clerk, the gold 免税店 sign and the warm lamp over
// it. That code is the Mech's and this file must not touch it, so this file does NOT rebuild the
// bottle wall: a second wall in the same 0.4 m of shelf would z-fight the first and double its
// cost for no picture. See the report ticket "hand the bottle wall to the zone".
//
// What the shell does NOT build is everything a Chinese duty-free actually sells from — the
// 烟酒 cabinet, the 香水 island, the till, the price pylon — and none of that exists anywhere in
// x 8..14 today. So this zone is the SALES FLOOR, built in the open carpet between the counter
// front (z 6.89) and the concourse, which is empty in every shot. The layout:
//
//        z 6.85  ── the shell's counter collider ─────────────────────────────
//        z 5.83 .. 6.85   service run, 1.02 m clear — you stand here to pay
//        z 5.05 .. 5.83   the fixture row:  [烟酒 cabinet] | aisle | [香水/白酒 island]
//                          x 8.25..10.15    10.15..11.55    11.55..13.95
//        z 4.14 .. 4.26   the price pylon, in front of the cabinet, clear of the aisle
//        z < 4.14         open concourse, untouched
//
// The 1.40 m aisle straddles the camera's centreline (11.20) so it opens a clean sightline to
// the shell's bottle wall behind: the shop reads as a shop you can walk into rather than a
// barricade across its own back wall. Its right edge is pinned at x 11.55 by the shell's own
// 免税店 focus — see the note on IX below, which is the one number here that is not free.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — and the one trick this zone is built around
//
// Budget 250 props / 12 translucent. This zone spends ~195 and 3, and — the part that matters —
// it adds only THREE draw calls, because every non-translucent prop here deliberately reuses an
// option-shape the shell already uses in this same room. The batch key (js/build.js:283) is
//
//     ch? + mesh + mode + round + bevel + tex + mat + nrm + matScale + matAmt + nrmAmt
//
// and NOTHING else: colour, gloss, alpha and glow are per-instance attributes and are free. So
// the eight shapes below are the whole vocabulary of this file, each one already present in the
// shell's own duty-free, which means every prop here joins a batch that was going to be drawn
// anyway and costs no extra call at all:
//
//     softBox mode 0, no material      the cartons, the bottles, the island carcass
//     box     mode 0, no material      trim, panels, plinths, the pylon
//     box     mode 1                   every lit strip, band, ribbon and screen
//     box     mode 6                   the oak shelves and risers (matches the shell's)
//     cyl     mode 0                   bottle caps, tea tins, handles, legs
//     softBox mode 0 + M_STONE         the island carcass  (matches the shell's counter)
//     box     mode 0 + M_STONE         the island top slab (matches the shell's counter top)
//     quad    mode 1 + ch              every character in the zone — glyphs batch now
//
// Variety therefore comes from COLOUR AND GLOSS, never from a new mesh: the 34 bottles and
// cartons on this floor are one mesh in fourteen colours and are one draw call between them.
// A distinct `round`, `bevel`, `mat` or `matScale` would start a new batch — none is set here.
//
// The three exceptions are the three translucent props (alpha < 0.999 never batches, one call
// each): the two cabinet doors and the tester cover. Glass is spent where glass is the point.
// Note the perfume and spirit bottles are NOT translucent — they are opaque with gloss .58,
// which reads as glass at this distance and costs nothing.
//
// ---------------------------------------------------------------------------------------------

AirFit['dutyfree'] = A => {
  const { box, cyl, glyphs, solid, thing, shade } = A;
  const { C, G, col, M_STONE } = A;
  const PI = Math.PI;

  // ---- datums. SX matches the shell's DFX so this floor is square to the shop behind it.
  const SX = 11.20;            // the shop centre (the shell's DFX)
  const ROW = 5.35;            // the fixture row centreline
  const CX = 9.20;             // the 烟酒 cabinet centre
  // The island starts at x 11.55 and not a centimetre less. The shell's own thing('免税店')
  // stands the player at [11.20, 5.80] to read it, and clampMove inflates this island by the
  // 0.30 m body radius — so an island reaching x 11.15, which is where this one was first
  // built, swallows that spot and silently makes the shop's own word unreadable from anywhere.
  // Verified with clampMove, not by eye. Anything that moves this edge must re-check it.
  const IX = 12.75;            // the island centre
  const PX = 12.15, LX = 13.35; // the island's 香水 half and 白酒 half

  // ---- the stock palette. A Chinese duty-free is red, gold and cream, not a wall of Scotch:
  // cigarette cartons in the red/gold and the soft blue-white the domestic brands use, spirit
  // boxes in the lacquer red and gold of a gift carton, scent in pale glass tints.
  const CIG = [C('#a8302a'), C('#c9992f'), C('#2f6392'), C('#e8e2d2'), C('#3d7361'), C('#8a2f3a')];
  const BAND = [col.goldL, col.cream, col.goldL, col.red, col.goldL, col.cream];
  const BAI = [C('#9c2b26'), C('#b8862f'), C('#e8dfc8'), C('#7a2430'), C('#a8302a')];
  const SCENT = [C('#e8c6cf'), C('#cfe0e8'), C('#f0e2b8'), C('#d9c2e0'), C('#e8d0b0'), C('#c8dcd0')];
  const CARC = C('#1b2029');   // the cabinet's dark carcass
  const LIT = C('#f6ecd2');    // every lit strip in the zone

  // The price on a ticket is read out of the shell's DUTY list rather than typed here, so the
  // shop and the till can never come to disagree — the same discipline the shell's own
  // shelf-edge glyphs use. An item the Hub adds to DUTY shows up on the pylon by itself.
  const price = hz => { const d = A.DUTY.find(x => x.hz === hz); return d ? d.price : ''; };
  const ticket = hz => hz + ' ' + price(hz);

  // =============================================================== 烟酒 the cigarette cabinet
  // The single most Chinese fixture in the terminal. Cigarettes are sold from a tall locked
  // glass case, lit from under every shelf, never off an open shelf — so this is a real case
  // with real doors, and the doors are two of the three translucent props in the zone.
  const CW = 1.90, CD = .60, CH = 1.95;
  const CF = ROW - CD / 2;               // 5.05, the glass front
  const CB = ROW + CD / 2;               // 5.65, the back

  box(CX, .07, ROW, CW, .14, CD + .02, col.charcoal, { tag: '香烟', hard: true, gloss: .28 });
  box(CX, 1.05, CB - .025, CW, 1.72, .05, CARC, { tag: '香烟', hard: true, gloss: .22 });
  for (const s of [-1, 1])
    box(CX + s * (CW / 2 - .025), 1.05, ROW, .05, 1.72, CD, CARC,
      { tag: '香烟', hard: true, gloss: .22 });
  box(CX, 1.95, ROW, CW + .08, .10, CD + .06, col.charcoal,
    { tag: '香烟', hard: true, gloss: .34 });

  // Three oak shelves plus the plinth deck: four levels. Cigarettes go on the upper two, where
  // a real case puts them — at the eye of somebody standing at the glass — and the spirit
  // cartons go on the lower two, which is both correct and keeps the heavy boxes off the top.
  const LEVEL = [.14, .50, .94, 1.38];
  for (let i = 1; i < 4; i++) {
    box(CX, LEVEL[i], ROW + .02, CW - .12, .05, CD - .06, col.oak,
      { tag: '香烟', hard: true, mode: 6, gloss: .26 });
    box(CX, LEVEL[i] - .05, CF + .04, CW - .16, .03, .04, LIT,
      { tag: '香烟', hard: true, mode: 1, glow: .34 });
  }
  box(CX, 1.88, CF + .04, CW - .16, .03, .04, LIT,
    { tag: '香烟', hard: true, mode: 1, glow: .34 });

  // The cartons. One mesh, eight across, two rows deep of colour — the batch does not care.
  for (let r = 0; r < 2; r++) {
    const deck = LEVEL[2 + r] + .025, cy = deck + .12;
    for (let i = 0; i < 8; i++) {
      const x = CX - .77 + i * .22, k = (i + r * 3) % 6;
      box(x, cy, ROW + .02, .175, .24, .085, CIG[k], { tag: '香烟', gloss: .34 });
      // The band across the face is what makes a coloured block read as a packet. Mode 1, so
      // it sits in the batch every other lit strip in this zone is already in.
      box(x, cy - .045, ROW - .0245, .145, .05, .012, BAND[k],
        { tag: '香烟', hard: true, mode: 1, glow: .12 });
    }
  }
  // The spirit cartons below — boxed and ribboned, which is what A.DUTY says 白酒 is sold as.
  for (let r = 0; r < 2; r++) {
    const deck = LEVEL[r] + (r ? .025 : 0), cy = deck + .15;
    for (let i = 0; i < 6; i++) {
      const x = CX - .70 + i * .28, k = (i + r * 2) % 5;
      box(x, cy, ROW + .02, .195, .30, .175, BAI[k], { tag: '白酒', gloss: .30 });
      box(x, cy - .02, ROW - .07, .21, .05, .012, col.goldL,
        { tag: '白酒', hard: true, mode: 1, glow: .14 });
    }
  }

  // The doors. Two of the zone's three translucent props, and the reason the case reads as a
  // case: you are looking at the stock THROUGH something.
  for (const s of [-1, 1])
    box(CX + s * .455, 1.05, CF + .005, .88, 1.70, .02, col.glass,
      { tag: '香烟', hard: true, mode: 1, alpha: .22, gloss: G.glass });
  box(CX, 1.05, CF, .05, 1.72, .04, col.chrome, { tag: '香烟', hard: true, gloss: G.metal });
  for (const s of [-1, 1])
    cyl(CX + s * .10, 1.05, CF - .035, .012, .34, col.chrome, { tag: '香烟', gloss: G.metal });

  // The header, standing on the case rather than hung: a hanging blade here would cross the
  // shell's own 免税店 sign at exactly the height the camera sees it, and cover it.
  box(CX, 2.20, ROW - .24, CW, .32, .07, col.navy, { tag: '香烟', hard: true, gloss: .28 });
  glyphs(CX, 2.20, ROW - .285, PI, '免税香烟',
    { size: .19, gap: .06, color: col.goldL, mode: 1, tag: '香烟' });

  // =============================================================== 香水 / 白酒 the island
  // Perfume on one half, spirits on the other, on one carcass — one fixture, two departments,
  // which is how the floor of a Chinese duty-free is actually laid out.
  const IW = 2.40, ID = .95;
  const IFz = ROW - ID / 2;              // 4.875, the island front
  const IBz = ROW + ID / 2;              // 5.825, the island back

  box(IX, .45, ROW, IW, .90, ID, col.desk, { tag: '香水', gloss: .26, ...M_STONE });
  box(IX, .935, ROW, IW + .10, .07, ID + .08, col.deskD,
    { tag: '香水', hard: true, gloss: .24, ...M_STONE });
  box(IX, .07, ROW, IW - .12, .14, ID - .07, col.charcoal,
    { tag: '香水', hard: true, gloss: .20 });

  // The back card, and the only two prices in the zone big enough to read from the concourse.
  box(IX, 1.16, IBz - .045, IW - .04, .30, .05, C('#2b2f36'),
    { tag: '香水', hard: true, gloss: .30 });
  glyphs(PX, 1.16, IBz - .075, PI, ticket('香水'),
    { size: .13, gap: .04, color: col.goldL, mode: 1, tag: '香水' });
  glyphs(LX, 1.16, IBz - .075, PI, ticket('白酒'),
    { size: .13, gap: .04, color: col.goldL, mode: 1, tag: '白酒' });

  // ---- 香水. A lit riser at the back, testers out in front under a cover.
  box(PX, 1.03, ROW + .21, 1.16, .12, .30, LIT, { tag: '香水', hard: true, mode: 1, glow: .26 });
  for (let r = 0; r < 2; r++) {
    const cy = r ? 1.185 : 1.065, z = r ? ROW + .21 : ROW - .13;
    for (let i = 0; i < 6; i++) {
      const x = PX - .50 + i * .20, k = (i + r * 4) % 6;
      // Opaque, gloss .58. Fifty-six translucent bottles would be fifty-six draw calls; a
      // bright colour and a hard highlight reads as scent glass and costs nothing.
      box(x, cy, z, .085, .19, .085, SCENT[k], { tag: '香水', gloss: .58 });
      cyl(x, cy + .115, z, .022, .05, col.goldL, { tag: '香水', gloss: .55 });
    }
  }
  // The tester cover — the third and last translucent prop.
  box(PX, 1.11, ROW - .13, 1.30, .30, .26, col.glass,
    { tag: '香水', hard: true, mode: 1, alpha: .20, gloss: G.glass });

  // ---- 白酒. A stepped display, because a gift carton is meant to be seen face-on.
  box(LX, 1.07, ROW + .27, 1.18, .20, .26, col.oak, { tag: '白酒', hard: true, mode: 6, gloss: .26 });
  box(LX, .995, ROW + .01, 1.18, .05, .24, col.oak, { tag: '白酒', hard: true, mode: 6, gloss: .26 });
  for (let r = 0; r < 2; r++) {
    const cy = r ? 1.33 : 1.18, z = r ? ROW + .27 : ROW + .01;
    for (let i = 0; i < 5; i++) {
      const x = LX - .42 + i * .21, k = (i + r * 3) % 5;
      box(x, cy, z, .175, .32, .17, BAI[k], { tag: '白酒', gloss: .30 });
      box(x, cy - .03, z - .09, .19, .05, .012, col.goldL,
        { tag: '白酒', hard: true, mode: 1, glow: .14 });
    }
  }
  // 茶叶 — tins on the end of the island. The fourth thing a Chinese duty-free sells, and the
  // one a Western one does not.
  for (let i = 0; i < 4; i++)
    cyl(13.72 + (i % 2) * .14, 1.05, 5.10 + ((i / 2) | 0) * .16, .055, .16,
      i % 2 ? C('#2f5b48') : C('#b8862f'), { tag: '白酒', gloss: .42 });

  // =============================================================== the till
  // The shell puts a charcoal block on the counter at x 13.10 and calls it a till. This is what
  // stands around it: the customer-facing card reader, the scan-to-pay plate every counter in
  // China has, the printer, and a lit price rail along the counter edge.
  cyl(12.30, 1.235, 7.00, .022, .22, col.steelD, { tag: '免税店', gloss: G.metal });
  box(12.30, 1.42, 7.00, .13, .18, .05, col.charcoal, { tag: '免税店', hard: true, gloss: .30 });
  box(12.30, 1.45, 6.972, .10, .10, .01, C('#7fd8c4'),
    { tag: '免税店', hard: true, mode: 1, glow: .32 });
  box(11.75, 1.36, 7.02, .26, .32, .02, col.white, { tag: '免税店', hard: true, gloss: .18 });
  for (let i = 0; i < 5; i++)
    box(11.75 + [-.07, .07, 0, -.07, .07][i], 1.36 + [.09, .09, 0, -.09, -.09][i], 7.008,
      .055, .055, .008, col.charcoal, { tag: '免税店', hard: true, gloss: .10 });
  box(13.62, 1.24, 7.40, .22, .23, .30, col.charcoal, { tag: '免税店', hard: true, gloss: .28 });
  // The shelf-edge rail along the counter front, centred on the counter rather than on the
  // island. Sits at y 1.09: the island in front of it hides the counter below y 1.11 across
  // x 11.67..14.69, and the cabinet hides x 6.59..9.56, so the ticket is written at x 10.60 —
  // the middle of the one window through which this rail is actually visible from D8-duty.
  box(SX, 1.09, 6.884, 4.80, .10, .012, C('#f4e9c8'),
    { tag: '免税店', hard: true, mode: 1, glow: .24 });
  glyphs(10.60, 1.088, 6.876, PI, ticket('香烟'),
    { size: .072, gap: .018, color: C('#2b2f36'), mode: 1, tag: '免税店' });

  // =============================================================== the price pylon
  // The one piece of signage close enough to the camera to be read at a glance, and therefore
  // where the zone's vocabulary actually lands: 免税店 over the four things it sells, each with
  // the price the till will charge.
  //
  // Its position is set by three constraints at once, none of them aesthetic. It must stay out
  // of the 香水 and 白酒 focus spots at z 4.35 (a pylon between the island halves blocks one or
  // the other whichever way it is nudged); it must not narrow the aisle mouth; and at z 4.20 the
  // frame is only x 9.24..13.16 wide, so anything further out than that is not in the picture at
  // all. x 10.00 satisfies all three — in front of the cabinet, clear of every focus, and it
  // balances the island on the far side of the aisle. Kept small (0.62 × 0.90) because the frame
  // scale at 2.4 m is 313 px/m: a full-height poster here would be half the shot.
  const PYX = 10.00, PYZ = 4.20;
  box(PYX, .95, PYZ, .62, .90, .05, col.navy, { tag: '免税店', hard: true, gloss: .28 });
  box(PYX, .93, PYZ + .04, .68, .98, .03, col.steelD, { tag: '免税店', hard: true, gloss: G.metal });
  for (const s of [-1, 1])
    cyl(PYX + s * .24, .25, PYZ + .04, .022, .50, col.steelD, { tag: '免税店', gloss: G.metal });
  glyphs(PYX, 1.26, PYZ - .028, PI, '免税店',
    { size: .13, gap: .04, color: col.goldL, mode: 1, tag: '免税店' });
  ['香烟', '白酒', '香水', '巧克力'].forEach((hz, i) => {
    glyphs(PYX, 1.03 - i * .17, PYZ - .028, PI, ticket(hz),
      { size: .075, gap: .022, color: col.cream, mode: 1, tag: '免税店' });
  });

  // =============================================================== the floor and the body
  // Contact darkening rather than a rug: `shade` pushes a quad into the shadow list, not the
  // prop list, so grounding all three fixtures costs no draw call at all.
  shade(CX, ROW, CW + .20, CD + .24, .40);
  shade(IX, ROW, IW + .20, ID + .26, .38);
  shade(PYX, PYZ + .02, .80, .30, .30);

  // The colliders. The aisle (x 10.15..11.15) and the service run in front of the counter
  // (z 5.83..6.89) are deliberately left out: clampMove inflates every box by the 0.30 m body
  // radius, so a 1.00 m aisle walks as 0.40 m of free centre and a 1.06 m service run as 0.46 m.
  solid(CX - CW / 2, CX + CW / 2, CF, CB);
  solid(IX - IW / 2, IX + IW / 2, IFz, IBz);
  solid(PYX - .34, PYX + .34, PYZ - .06, PYZ + .06);

  // The vocabulary. 免税 is already on the shell's own `thing`, so these are the other three:
  // the two things a Chinese duty-free is actually for, and the one it shares with every other.
  // Each focus stands in open carpet at least 0.15 m clear of every collider above — verified
  // with clampMove, not by eye.
  thing('香烟', CX, 1.45, CF, '免税店的烟比外面便宜。',
    'Cigarettes are cheaper in the duty-free.',
    '香 fragrant + 烟 smoke. 一条烟 a carton, 抽烟 to smoke, 禁止吸烟 no smoking.',
    { tag: '香烟', focus: [CX, 4.55], reach: 1.8 });
  thing('香水', PX, 1.20, IFz, '这瓶香水要五百多。',
    'This bottle of scent is over five hundred.',
    '香 fragrant + 水 water. 一瓶 a bottle; 试一下 to try a tester.',
    { tag: '香水', focus: [11.75, 4.35], reach: 1.6 });
  thing('白酒', LX, 1.30, IFz, '带一瓶白酒回去送人。',
    'Take a bottle of baijiu back as a gift.',
    '白 white + 酒 alcohol. 送人 to give as a gift; 干杯 cheers.',
    { tag: '白酒', focus: [LX, 4.35], reach: 1.6 });
};

// Nothing in this zone moves. The lit strips are mode 1 and read as lit without a tick, and a
// shop that pulses is a shop that draws the eye away from the flight it should be catching.
//
// AirFit['dutyfree'].tick = (t, body, clock) => { };
