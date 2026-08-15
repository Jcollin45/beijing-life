// 街 · 西口 — the west end of the hutong: the dead-end square where the old men play chess.
// See STREET.md. Registers into `StreetFit`; the shell in js/street.js calls it at the end of its
// own build, so everything here measures against a square that is already standing.
//
// ---------------------------------------------------------------------------------------------
// What the shell already puts here, and is therefore NOT rebuilt below
//
//   the stepped 李家 compound at x -33.4 with 李师傅's recessed red door and enamel plaque
//   the separate pitched ranges closing the square north (face z -3.0) and south (face z 8.0)
//   the 灰砖 boundary wall along z 7.4 from x -33.2 to -23.6, 2.55 m to its coping
//   one younger 国槐 on the far western shoulder at (-32.0, 3.0) — `tree()` limewashes its trunk
//     to a hard top edge, the whitewash band this district was going to be asked for. Nothing to add.
//   the 麻将 table, its four stools and its 暖壶 at (-29.0, 0.6)
//   the two-room, bay-built 公共厕所 at (-27.2, 6.15), with real entrance depth and service tap
//   the pigeons. The shell keeps two 鸽子笼 (x -18.6 and x 8.2) and flies their flocks from its
//     own tick on a 92-second cycle at radii of 3.4–6.1 m, which brings the nearer flock to within
//     four metres of this zone and turns it over the roofline you look at from the square. This
//     end is covered. A third loft here would need a second copy of that flight loop — the shell's
//     `birds` array is private to it and nothing on `S` reaches it — so there is no loft in this
//     file, on purpose.
//
// What this district is for is the thing the square is missing. `data.js` already has two old men
// called 棋友一 and 棋友二 sitting at (-30.05, 0.60) and (-27.95, 0.60) — which is the 麻将 table.
// Two men named "chess friend" sat at a mahjong board is the defect this file exists to fix: it
// builds them a real 象棋 game, and the report carries the two-number ticket that moves them onto
// it. A Beijing street chess game is never two men and a board anyway. It is two men, a board and
// four or five who stand and watch and never say a word, plus the whole apparatus of an afternoon:
// the flask, the folded paper, the palm-leaf fan, the radio, the birdcage hung on a branch, the
// dog. That, a 葡萄架 over it, a 门楼 with a new padlock in the boundary wall, and the 拆 in a
// circle on the wall behind — which is what the afternoon is actually sitting under.
//
// ---- the ground it has to fit on
//
// The west zone is x -32.2..-25.0, z -3.1..6.4, and `clampMove` inflates every collider by the
// 0.30 m body radius. Flood-filled through the real `clampMove` before a line of this was written,
// the square has two deliberate ways through it from the alley mouth to 李师傅's door:
//
//   north, along z ≈ -0.8, between the 麻将 table and whatever stands north of it
//   south, along z ≈ 2.1, between the 麻将 table and the 国槐
//
// The shell now fits the 麻将 collider to its apron and moves the tree to the far western shoulder.
// The tightened front edge of the ONE chess collider below leaves 1.25 m clear on the northern
// route; the southern apron has no tree edge at all and remains open to the 公厕 approach.
StreetFit['west'] = S => {
  const { box, cyl, ball, taper, flat, glyphs, solid, shade, thing, cap, light, C, G, col } = S;
  const PI = Math.PI;

  // Local colour. Everything below carries one of these or one off the shell's palette: a prop
  // that reaches game.js with an undefined colour puts the boot overlay up.
  const K = {
    board:   C('#c9b284'), boardIn: C('#c3ab7c'), line: C('#4b3a26'),
    ivory:   C('#ddd2b6'), ivoryD: C('#c3b795'),
    redInk:  C('#8f2f22'), inkB: C('#25211d'), red: C('#a8352a'),
    // The two leaves are the same paint at two ages: the one that stands open lives in the shade
    // of the passage, the one that stays shut takes the afternoon sun and has gone chalky.
    doorRed: C('#8e3b2c'), doorWorn: C('#9c4b39'), bare: C('#7a604a'),
    brass:   C('#8e7434'), brassD: C('#7d6630'),
    zinc:    C('#c6ccd0'),                                // the NEW padlock, and only it
    stone:   C('#958e80'), stoneD: C('#6f6a5e'), stoneL: C('#8a8375'),
    lime:    C('#cdc7b4'),
    moss:    C('#556047'), mossD: C('#414a37'),
    vine:    C('#6b5a3f'),
    leaf1:   C('#5e6d3e'), leaf2: C('#74814c'), leaf3: C('#47522f'),
    grape:   C('#4a3a55'), grapeL: C('#5d4a68'),
    tan:     C('#c09a63'), tanD: C('#a37c4a'), snout: C('#8f6c42'),
    cat:     C('#8a8378'), catD: C('#6b6560'),
    chalk:   C('#d6d2c4'), paint: C('#cfcabb'), paintD: C('#c8c3b4'),
    stencil: C('#a13a2c'), stencilD: C('#96382b'), grime: C('#5b5348'), grimeD: C('#4e4a44'),
    pot:     C('#9c5a3b'), crock: C('#4a4038'), crockD: C('#3d342d'), water: C('#2b3b3a'),
    tin:     C('#b9b0a0'), paper: C('#d8d3c3'), paperD: C('#c9c3b1'),
    plasticR: C('#b8443a'), plasticRD: C('#8f342d'), plasticB: C('#37628c'),
    canvas:  C('#b8a583'), sack: C('#b9b2a0'), sackB: C('#8d95a3'),
    caneL:   C('#9a7f4e'), cane: C('#8a7043'), bird: C('#7f8a72'), birdL: C('#93a084'),
    fanLeaf: C('#cbb583'), flask: C('#3f6f5c'), flaskC: C('#e2dccb'), tea: C('#8a7a46'),
    bulb:    C('#ffe6b4'), pool: C('#ff9c5e'), lampWarm: C('#ffcf92'),
    brickNew: C('#8d6a55'), mortar: C('#a8907c'), mort1: C('#7b7367'), mort2: C('#8f8779'),
    streak:  C('#6b665c'), pipe: C('#5f5b53'), pipeC: C('#54504a'),
    dark:    C('#191b1d'), yard: C('#7f7768'), worn: C('#7d786d'),
    fruit:   C('#a8402f'), fruitD: C('#8f3324'),
    wood:    col.trunkL, woodD: col.trunk, steel: col.steel, steelD: col.steelD,
  };
  const LEAF = [K.leaf1, K.leaf2, K.leaf3];
  const BRICK = { mat: 'brick',    matScale: .90,  matAmt: .18 };
  const RTILE = { mat: 'rooftile', matScale: 1.60, matAmt: .20 };
  const PAVE  = { mat: 'paving',   matScale: 1.30, matAmt: .30 };
  const WOODM = { mat: 'wood',     matScale: .40,  matAmt: .16 };

  // A headword is only safe on a `thing` if the dictionary already has a row for it. `Vocab.get`
  // is `DICT[hz]` with no fallback and game.js builds the walk-up prompt straight out of it, so a
  // thing whose word is missing is not a missing label — it is the boot overlay, which is what
  // `.thingcheck.js` exists to stop. This takes the first candidate the dictionary actually knows,
  // so the district ships correct today and upgrades itself the moment the Hub lands the better
  // word. See the vocab ticket in the report.
  const word = (...cands) => {
    for (const w of cands) {
      try { if (typeof Vocab !== 'undefined' && Vocab.get && Vocab.get(w)) return w; } catch (_) {}
    }
    return null;
  };
  // A thing whose word has not landed yet is simply not built. Nothing else about the scene moves.
  // Callers retain a display label as their second argument. It normally equals the headword but
  // can be a more specific physical label after `word()` falls back. The former wrapper omitted
  // this parameter and shifted every following argument one place, handing `thing()` a string for
  // x; accepting it here restores all west things to their authored positions without changing
  // their vocabulary keys, focus points or reach.
  const say = (hz, label, x, y, z, sentence, tr, note, o) => {
    if (hz) thing(hz, x, y, z, sentence, tr, note, o);
  };
  // A glyph laid flat, face up. `glyphs` stands every character up on its yaw, which is right for
  // a sign and wrong for a board or an upside-down 福, so these re-lay the quad afterwards: the
  // quad mesh's own resting orientation faces +y, which is what `flat` relies on too.
  const lieFlat = (p, x, y, z, size, yaw) => {
    if (p) p.m = M.mul(M.trans(x, y, z), M.mul(M.rotY(yaw), M.scale(size, 1, size)));
    return p;
  };

  // Props that are only out while the game is on. Written once per change, never per frame.
  const kit = [];
  const HIDDEN = M.trs(0, -60, 0, 0, .001, .001, .001);
  const packable = p => {
    if (p) {
      if (!p.stateOwner) p.stateOwner = 'west:state';
      kit.push({ p, m0: p.m });
    }
    return p;
  };

  // ============================================================ 1 · the chess pitch
  //
  // Against the north wall, under a 葡萄架. `BX`/`BZ` is the middle of the board; the two men sit
  // east and west of it at 0.63 m, on stools whose seats are at 0.42 — which is the `seatY` both
  // 棋友 already carry in `data.js`, so moving them here is two numbers and nothing else.
  const BX = -30.75, BZ = -2.05;
  const TOP = .665;                       // the table top: low, because the stools are at 0.45
  const SEAT = .42;
  const RX = BX - .72, RZ = BZ - .62;     // the upturned crate: the radio, and the taken pieces

  // ---- the ground first, so everything laid on it sits above it. A pale patch of concrete worn
  // smooth by sixty years of stool legs, and the fire-lane line nobody has ever obeyed.
  flat(BX, .006, BZ, 2.6, 2.0, K.worn, { gloss: .10, ...PAVE });
  for (let i = 0; i < 7; i++)
    box(-32.05 + i * .34, .020, -2.66, .26, .005, .075, K.stencil, { hard: true, gloss: .08 });

  // ---- the table. A 折叠桌: a painted board on a folded steel frame, carried out every day and
  // carried in again, which is why the top is chipped through to the ply along its front edge.
  box(BX, TOP - .018, BZ, .60, .036, .58, K.canvas, { hard: true, gloss: .20, ...WOODM });
  box(BX, TOP - .046, BZ, .56, .022, .54, K.woodD, { hard: true, gloss: .14 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    cap(BX + sx * .25, (TOP - .06) / 2, BZ + sz * .24, .020, TOP - .06, .020, K.steelD,
      { gloss: G.metal, rz: sx * .045 });
  for (const sx of [-1, 1])
    cap(BX + sx * .25, .18, BZ, .014, .48, .014, K.steelD, { rx: PI / 2, gloss: G.metal });
  for (const [ox, w] of [[-.16, .09], [.04, .06], [.19, .05]])
    box(BX + ox, TOP - .001, BZ - .27, w, .006, .05, K.woodD, { hard: true, gloss: .12 });

  // ---- 象棋盘. Nine files by ten ranks with the 河 across the middle. The men face each other
  // along x, so the ten-rank axis runs east–west and the nine-file axis runs north–south. 48 mm
  // spacing under a 41 mm piece, which is a real board rather than a draughts set.
  //
  // The heights are stacked so that no two faces ever land on one plane, which on a board this
  // small means being explicit about every layer: the table surface is at 0.665, the printed sheet
  // occupies .666–.671, the grid .670–.673 (deliberately sunk into the sheet, so its underside is
  // nowhere near the sheet's), and a piece .674–.686.
  const SP = .048, TG = { tag: '象棋' };
  const SHEET = .6685, LINE = .6715, PIECE = .680, INK = .688;
  const fx = r => BX + (r - 4.5) * SP;               // rank 0..9; 0 is red's back rank, to the west
  const fz = f => BZ + (f - 4) * SP;                 // file 0..8
  packable(box(BX, SHEET, BZ, .524, .005, .468, K.board, { hard: true, gloss: .10, ...TG }));
  for (let r = 0; r < 10; r++)
    packable(box(fx(r), LINE, BZ, .006, .003, .384, K.line,
      { hard: true, gloss: .06, ...TG }));
  // The nine file lines. Seven of them are drawn in two halves and the gap between the halves IS
  // the 河 — the one mark that tells a 象棋 board from every other grid in the world. The outer
  // two run right through, because the river is bounded by the edge of the board.
  for (let f = 1; f < 8; f++) for (const half of [-1, 1])
    packable(box(BX + half * .12, LINE, fz(f), .192, .003, .006, K.line,
      { hard: true, gloss: .06, ...TG }));
  for (const f of [0, 8])
    packable(box(BX, LINE, fz(f), .432, .003, .006, K.line,
      { hard: true, gloss: .06, ...TG }));
  // 九宫 — the crossed square in front of each general.
  for (const [r0, r1] of [[0, 2], [7, 9]]) for (const s of [-1, 1])
    packable(box((fx(r0) + fx(r1)) / 2, LINE, BZ, .137, .003, .006, K.line,
      { hard: true, gloss: .06, ry: s * (PI / 4), ...TG }));
  // 楚河 · 汉界, in the river, each pair reading from its own side of the board.
  for (const [ch, zz] of [['楚', -.155], ['河', -.105], ['汉', .105], ['界', .155]])
    packable(lieFlat(glyphs(BX, .674, BZ + zz, PI / 2, ch,
      { size: .034, gap: 0, color: K.line, ...TG })[0], BX, .674, BZ + zz, .034, PI / 2));

  // ---- the position. A real middlegame, not a set-up board: red has a horse over the river and a
  // pawn pushed, black has a knight across and has lost a cannon and two pawns. [rank, file, char,
  // red]. Red is at low rank, which is the west stool — the man the shell's own note calls thin,
  // folded and bespectacled.
  const POS = [
    [0, 0, '车', 1], [0, 1, '马', 1], [0, 2, '相', 1], [0, 3, '仕', 1], [0, 4, '帅', 1],
    [0, 5, '仕', 1], [0, 6, '相', 1], [0, 8, '车', 1],
    [2, 1, '炮', 1], [2, 7, '炮', 1],
    [3, 0, '兵', 1], [3, 2, '兵', 1], [3, 6, '兵', 1], [4, 4, '兵', 1], [4, 7, '马', 1],
    [9, 0, '车', 0], [9, 2, '象', 0], [9, 3, '士', 0], [9, 4, '将', 0], [9, 5, '士', 0],
    [9, 6, '象', 0], [9, 7, '马', 0], [9, 8, '车', 0],
    [7, 1, '炮', 0],
    [6, 0, '卒', 0], [6, 2, '卒', 0], [6, 4, '卒', 0], [5, 2, '马', 0],
  ];
  for (const [r, f, ch, red] of POS) {
    const px = fx(r), pz = fz(f);
    packable(cyl(px, PIECE, pz, .0205, .012, red ? K.ivory : K.ivoryD,
      { gloss: .26, mat: 'wood', matScale: .18, matAmt: .12, ...TG }));
    packable(lieFlat(glyphs(px, INK, pz, PI / 2, ch,
      { size: .026, gap: 0, color: red ? K.redInk : K.inkB, ...TG })[0], px, INK, pz, .026, PI / 2));
  }
  // The pieces already taken, face-down on the crate — there is no room for them on a table this
  // size, which is exactly why they end up on whatever is next to it.
  for (const [ox, oz] of [[.10, .07], [.14, .02], [.07, .01]])
    packable(cyl(RX + ox, .488, RZ + oz, .0205, .012, K.ivoryD, { gloss: .24, ...TG }));

  // ---- the stools. Seat top at 0.45 so `seatY: 0.42` lands a man on the seat and not through it.
  const stool = (x, z, cc) => {
    box(x, SEAT, z, .30, .052, .30, cc, { hard: true, gloss: G.wood, mat: 'wood',
      matScale: .30, matAmt: .16 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      cap(x + sx * .115, SEAT / 2 - .01, z + sz * .115, .020, SEAT - .04, .020, K.woodD,
        { gloss: G.wood, rz: sx * .075, rx: -sz * .075 });
    for (const sz of [-1, 1])
      box(x, .175, z + sz * .128, .26, .022, .020, K.woodD, { hard: true, gloss: G.wood });
  };
  stool(BX - .63, BZ, K.wood);                       // 棋友一, red
  stool(BX + .63, BZ, C('#7d6549'));                 // 棋友二, black
  stool(BX - .20, BZ - .64, C('#6f5a44'));           // the spare, for whoever wins the next game

  // ---- a folding chair with a back, because in a crowd of five somebody always sits, and because
  // a walking stick has to be hooked over something.
  const CHX = BX + .78, CHZ = BZ - .48;
  box(CHX, .445, CHZ, .34, .040, .32, K.plasticB, { hard: true, gloss: .28, ry: -.5 });
  box(CHX - .07, .70, CHZ - .13, .34, .44, .035, K.plasticB, { hard: true, gloss: .28, ry: -.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    cap(CHX + sx * .13, .215, CHZ + sz * .13, .016, .44, .016, K.steelD, { gloss: G.metal });
  // 拐杖, hooked over the chair back — the only place a stick is ever put down.
  cap(CHX + .12, .60, CHZ - .19, .017, .80, .017, K.woodD, { rz: .17, rx: .10, gloss: G.wood });
  cap(CHX + .175, .97, CHZ - .18, .016, .11, .016, K.woodD, { rz: 1.25, gloss: G.wood });

  // ---- the crate, upended: the fifth seat, the table for everything that will not fit on the
  // table, and what the radio stands on.
  box(RX, .24, RZ, .38, .48, .30, K.plasticR, { hard: true, gloss: .26, ry: .35 });
  for (let i = 0; i < 3; i++)
    box(RX - .10 + i * .10, .24, RZ - .160, .045, .34, .012, K.plasticRD,
      { hard: true, gloss: .22, ry: .35 });
  // 收音机 — a transistor set, aerial up, playing 京剧 all afternoon while nobody listens to it.
  const RT = { tag: '收音机' };
  packable(box(RX, .55, RZ, .215, .135, .085, K.tin, { hard: true, gloss: .30, ry: .35, ...RT }));
  packable(box(RX - .045, .55, RZ - .046, .095, .095, .010, C('#4a463f'),
    { hard: true, gloss: .18, ry: .35, ...RT }));
  packable(cyl(RX + .058, .552, RZ - .048, .026, .008, C('#3b3730'),
    { rx: PI / 2, ry: .35, gloss: .34, ...RT }));
  packable(cap(RX + .09, .74, RZ + .01, .007, .34, .007, K.steel,
    { rz: .22, gloss: G.metal, ...RT }));

  // ---- the 大爷 kit. None of it is interesting on its own; all of it together is the difference
  // between a table with a board on it and an afternoon. 暖壶 on the paving, cork out, two jam
  // jars of tea beside it. The flask at the 麻将 table is the shell's; two tables means two.
  const FX = BX - .96, FZ = BZ + .28;
  packable(cyl(FX, .155, FZ, .105, .31, K.flask, { gloss: .32 }));
  packable(cyl(FX, .19, FZ, .107, .085, K.flaskC, { gloss: .24 }));
  packable(taper(FX, .333, FZ, .210, .068, .210, K.flask, { gloss: .30 }));
  packable(cyl(FX, .383, FZ, .048, .032, K.wood, { gloss: G.wood }));
  packable(cap(FX, .360, FZ, .009, .20, .009, K.steelD, { rz: PI / 2, gloss: G.metal }));
  for (const [ox, oz] of [[.19, -.06], [.30, .06]]) {
    packable(cyl(FX + ox, .055, FZ + oz, .043, .11, K.tea, { gloss: .56 }));
    packable(cyl(FX + ox, .112, FZ + oz, .044, .010, K.steelD, { gloss: .40 }));
  }
  // 报纸 — yesterday's, folded to the chess column and weighted with a stone. On the spare stool,
  // not the table: the board takes the whole of a 折叠桌 this size, which is why every loose thing
  // at a street chess game is on something else.
  const NX = BX - .20, NZ = BZ - .64;
  packable(box(NX, .456, NZ, .22, .008, .16, K.paper, { hard: true, gloss: .10, ry: .22 }));
  packable(box(NX + .01, .463, NZ, .20, .005, .14, K.paperD, { hard: true, gloss: .10, ry: .30 }));
  packable(ball(NX + .05, .474, NZ - .02, .028, .017, .024, K.stoneD, { gloss: .22 }));
  // 蒲扇 — the palm-leaf fan, dropped on the folding chair between hands.
  packable(ball(CHX - .02, .472, CHZ + .03, .085, .006, .100, K.fanLeaf, { gloss: .12, ry: .5 }));
  packable(cap(CHX - .115, .470, CHZ + .105, .012, .15, .012, K.woodD,
    { rz: PI / 2, ry: .5, gloss: G.wood }));

  // ---- 猫. Under the west stool, curled nose-to-tail. Curled rather than stretched out on
  // purpose: the shell's own note about its dog says a lying animal reads as a capsule with a
  // stick beside it, and a ring is the one sleeping silhouette that survives being this small.
  const CX = BX - .60, CZ = BZ - .32, CT = { tag: '猫' };
  ball(CX, .105, CZ, .145, .095, .120, K.cat, { gloss: .14, ry: .6, ...CT });
  ball(CX + .10, .098, CZ + .07, .062, .055, .058, K.catD, { gloss: .14, ry: .6, ...CT });
  for (const t of [-1, 1])
    ball(CX + .085 + t * .026, .142, CZ + .055 + t * .014, .022, .026, .016, K.catD,
      { gloss: .14, ...CT });
  cap(CX - .04, .055, CZ + .11, .026, .21, .026, K.catD, { rz: PI / 2, ry: 1.15, gloss: .14,
    ...CT });
  say(word('猫'), '猫', CX, .30, CZ, '猫在小板凳底下睡觉。',
    'The cat is asleep under the stool.',
    '一只猫 — 只 zhī, the measure word for most small animals.',
    // Focus on the clear paving south of the pitch's collider, never inside it: a focus the body
    // cannot stand on is a word the player can see and never be handed.
    { focus: [CX + .15, BZ + 1.15], reach: 2.4 });

  // ---- cigarette ends and a chalk score from a game three days ago.
  for (const [ox, oz, a] of [[-.42, .44, .3], [-.30, .50, 1.1], [.36, .34, -.4], [.54, -.24, .8]])
    box(BX + ox, .022, BZ + oz, .028, .005, .008, K.paperD, { hard: true, gloss: .08, ry: a });
  for (const [ox, oz, w, a] of [[-.10, .80, .13, .2], [.06, .82, .08, 1.4], [.22, .78, .11, .1]])
    box(BX + ox, .026, BZ + oz, w, .004, .010, K.chalk, { hard: true, gloss: .06, ry: a });

  // ============================================================ 2 · 葡萄架, the grape trellis
  //
  // Over the chess, against the north wall — which faces south and takes the sun all day, which is
  // why the vine is on it and not on the other three. Four posts, two beams, laths across, and the
  // vine running up the west post and out along the top. This is the shade the game is played in.
  const TR = { x0: BX - 1.20, x1: BX + 1.15, z0: BZ - .75, z1: BZ + .50, y: 2.14 };
  for (const px of [TR.x0, TR.x1]) for (const pz of [TR.z0, TR.z1]) {
    cap(px, TR.y / 2, pz, .078, TR.y, .078, K.woodD, { gloss: G.wood, mat: 'wood',
      matScale: .50, matAmt: .18 });
    box(px, .055, pz, .19, .11, .19, K.stoneD, { hard: true, gloss: .20 });     // its footing stone
  }
  for (const pz of [TR.z0, TR.z1])
    cap((TR.x0 + TR.x1) / 2, TR.y + .05, pz, .068, TR.x1 - TR.x0 + .30, .068, K.woodD,
      { rz: PI / 2, gloss: G.wood });
  for (let i = 0; i < 8; i++)
    cap(TR.x0 - .12 + i * ((TR.x1 - TR.x0 + .24) / 7), TR.y + .105, (TR.z0 + TR.z1) / 2,
      .034, TR.z1 - TR.z0 + .34, .034, K.wood, { rx: PI / 2, gloss: G.wood });
  // The vine. Leaves hang UNDER the laths rather than lying on top of them: from underneath —
  // which is the only place you ever stand — a vine is a ceiling of leaves with light through it.
  for (let i = 0; i < 4; i++)
    cap(TR.x0 + .085 + Math.sin(i * 1.9) * .04, .28 + i * .52, TR.z0 + Math.cos(i * 2.3) * .04,
      .050 - i * .006, .58, .050 - i * .006, K.vine, { rz: Math.sin(i * 1.3) * .16, gloss: .14 });
  for (const pz of [TR.z0, TR.z1]) for (let i = 0; i < 5; i++)
    cap(TR.x0 + .22 + i * .52, TR.y + .095, pz + Math.sin(i * 2.1) * .05, .028, .56, .028,
      K.vine, { rz: PI / 2, ry: Math.sin(i * 1.7) * .13, gloss: .14 });
  // Leaves. The first pass hung 26 flat lozenges 35 mm thick in three neat heights along the two
  // beams, and from underneath that is a row of green pills on a rack, not a canopy. What makes a
  // vine read is depth: forty clusters, rounder than they are wide, spread over 26 cm of height so
  // some hang below the laths and some sit on top of them, and none of them the same size.
  for (let i = 0; i < 40; i++) {
    const u = (i * .3819) % 1, v = (i * .6180) % 1, w = (i * .2360) % 1;
    ball(TR.x0 - .10 + u * (TR.x1 - TR.x0 + .20), TR.y + .10 - w * .26,
      TR.z0 - .14 + v * (TR.z1 - TR.z0 + .28), .095 + (i % 5) * .020, .055 + (i % 3) * .022,
      .090 + ((i + 2) % 5) * .018, LEAF[i % 3], { gloss: .10, mode: 15, ry: i * .77 });
  }
  // Three bunches, hanging through the laths where the sun does not get at them. Green-black:
  // a 北京 courtyard grape is a wine grape and never goes anywhere near supermarket purple.
  for (const [gx, gz] of [[TR.x0 + .55, BZ - .12], [TR.x0 + 1.42, BZ + .16], [TR.x1 - .32, BZ - .36]])
    for (let i = 0; i < 7; i++) {
      const row = (i / 3) | 0;
      ball(gx + ((i % 3) - 1) * .030 * (1 - row * .3), TR.y - .10 - row * .054,
        gz + (row % 2 ? .020 : -.014), .030 - row * .004, .030 - row * .004, .030 - row * .004,
        i % 2 ? K.grape : K.grapeL, { gloss: .30, tag: '葡萄' });
    }
  say(word('葡萄'), '葡萄', TR.x0 + .55, TR.y - .20, BZ - .12,
    '葡萄架下面凉快，他们就在这儿下棋。',
    'It is cool under the grape trellis, so this is where they play.',
    '葡萄架 pútaojià — a grape frame. Half the courtyards in this city have one.',
    { focus: [TR.x0 + .6, BZ + 1.05], reach: 2.6 });

  // ---- 鸟笼. Hung off the trellis where its owner can watch it while he watches the board, which
  // is the entire reason a man brings a bird to a chess game.
  const GX0 = TR.x1 - .18, GZ0 = TR.z1 - .12, GY = 1.60, BC = { tag: '鸟笼' };
  packable(cap(GX0, GY + .41, GZ0, .008, .44, .008, K.steelD, { gloss: G.metal, ...BC }));
  packable(cap(GX0, GY + .64, GZ0, .012, .07, .012, K.steelD, { rz: 1.2, gloss: G.metal, ...BC }));
  for (let i = 0; i < 12; i++) {
    const a = i * PI / 6;
    packable(cap(GX0 + Math.cos(a) * .092, GY, GZ0 + Math.sin(a) * .092, .007, .34, .007,
      K.caneL, { gloss: .28, ...BC }));
  }
  for (const [yy, rr] of [[GY - .17, .100], [GY + .17, .100], [GY + .195, .078]])
    packable(cyl(GX0, yy, GZ0, rr, .016, K.cane, { gloss: .26, ...BC }));
  packable(taper(GX0, GY + .245, GZ0, .150, .085, .150, K.cane, { gloss: .26, ...BC }));
  packable(cap(GX0, GY - .05, GZ0, .008, .17, .008, K.caneL, { rz: PI / 2, gloss: .26, ...BC }));
  packable(ball(GX0 + .01, GY - .01, GZ0, .038, .042, .052, K.bird, { gloss: .18, ...BC }));
  packable(ball(GX0 + .045, GY + .045, GZ0 + .005, .022, .024, .022, K.birdL,
    { gloss: .18, ...BC }));
  packable(cyl(GX0 - .055, GY - .13, GZ0 + .03, .018, .026, K.flaskC, { gloss: .30, ...BC }));
  const cage = word('鸟笼', '灯笼');
  if (cage === '鸟笼')
    say(cage, '鸟笼', GX0, GY, GZ0, '看棋的时候，他把鸟笼挂在葡萄架上。',
      'While he watches the chess he hangs the birdcage on the trellis.',
      '鸟笼 niǎolóng — 鸟 bird + 笼 cage, the same 笼 as in 灯笼.',
      { focus: [GX0, GZ0 + .95], reach: 2.2 });

  // ---- the board itself, as something the player can walk up to and be told the word for. The
  // collider below stops the body at z -1.40, so the focus stands beyond it and the reach covers
  // the short look back to the middle of the board.
  const chessWord = word('象棋', '下棋');
  say(chessWord, chessWord, BX, TOP + .12, BZ,
    '大爷们每天下午在这儿下象棋。',
    'The old men play Chinese chess here every afternoon.',
    '象棋 xiàngqí — 象 elephant + 棋 board game. The river across the middle is 楚河汉界.',
    { focus: [BX, BZ + 1.10], reach: 2.6, tag: '象棋' });

  // The whole pitch as ONE collider. Its back edge still covers the wall-side trellis posts; the
  // front edge fits the table and occupied stools instead of claiming the empty spectator apron.
  // Inflated by the body radius it ends at z -1.40, leaving 1.25 m to the tightened 麻将 collider.
  solid(BX - 1.29, BX + 1.24, BZ - .85, BZ + .35);
  shade(BX, BZ, 2.9, 2.1, .30);

  // ============================================================ 3 · the old wall
  //
  // The north side of the square is ten metres of blank 灰砖 and it is what you look at over the
  // players' heads. Everything below stands proud of that face (z = -3.0) in layers at least 10 mm
  // apart — never on it: two faces on one plane is the fault that has taken this game down three
  // times, and a wall is where it happens.
  const W0 = -2.980;                                  // mortar, moss, damp
  const W1 = -2.955;                                  // painted text
  const W2 = -2.945;                                  // the bricked-up window
  const W3 = -2.938;                                  // the 拆 and its circle

  // ---- what a wall this old actually looks like up close, first, so the paint goes on top of it:
  // the mortar gone out of a dozen perpends, moss in the bottom courses where the rain comes off
  // the paving, and a black streak down from a gutter that has not worked since the nineties.
  for (let i = 0; i < 14; i++) {
    const u = (i * .618) % 1, v = (i * .381) % 1;
    box(-32.4 + u * 4.9, .35 + v * 2.6, W0, .23, .085, .020, i % 3 ? K.mort1 : K.mort2,
      { hard: true, gloss: .05 });
  }
  // Moss in the bottom two courses, where the rain comes off the paving. Kept low and small: at
  // 60 cm across and 22 cm tall these read as shrubs planted against the wall.
  for (let i = 0; i < 11; i++) {
    const u = (i * .7549) % 1;
    ball(-32.3 + u * 4.7, .075 + (i % 3) * .045, W0 + .008, .075 + (i % 4) * .030, .042, .014,
      i % 2 ? K.moss : K.mossD, { gloss: .06, mode: 15 });
  }
  box(-32.14, 1.55, W0, .17, 3.05, .014, K.streak, { hard: true, gloss: .05 });
  cyl(-32.14, 1.60, -2.900, .048, 3.20, K.pipe, { gloss: .22 });
  for (const yy of [.42, 1.62, 2.82])
    cyl(-32.14, yy, -2.900, .058, .06, K.pipeC, { gloss: .24 });

  // ---- the bricked-up window. A window that was there and is not any more: the opening is still
  // read by its stone lintel and sill, and what fills it is newer, redder, coarser brick laid by
  // somebody who was not a bricklayer.
  const QX = -31.30, QY = 1.92;
  box(QX, QY, W2, 1.02, 1.26, .024, K.brickNew,
    { hard: true, mode: 11, gloss: G.matte, ...BRICK });
  for (let i = 0; i < 6; i++)
    box(QX + ((i % 2) ? .06 : -.05), QY - .55 + i * .215, W2 + .014, .96, .028, .012, K.mortar,
      { hard: true, gloss: .10 });
  box(QX, QY + .70, W2 + .02, 1.24, .17, .10, K.stone, { hard: true, gloss: .22 });
  box(QX, QY - .66, W2 + .03, 1.20, .10, .13, K.stone, { hard: true, gloss: .20 });

  // ---- 拆. The character in a circle, in white paint gone grey, which is the most loaded mark
  // anywhere in this city: it says this wall, this square and this chess game have a date on them.
  // Drawn as a ring of short chords rather than as two discs, because two discs on one plane is
  // exactly the coplanar fault above.
  const DX = -28.60, DY = 2.24, DR = .46;
  for (let i = 0; i < 26; i++) {
    const a = i * (PI * 2 / 26);
    box(DX + Math.cos(a) * DR, DY + Math.sin(a) * DR, W3, .118, .036, .014, K.paint,
      { hard: true, gloss: .08, rz: a + PI / 2, tag: '墙' });
  }
  glyphs(DX, DY, W3 + .004, 0, '拆',
    { size: .58, gap: 0, color: K.paint, gloss: .06, lift: .004, tag: '墙' });
  // The dribbles under it, clear of the ring: whoever paints these is not careful and the paint
  // is always too thin.
  for (const [ox, len] of [[-.30, .20], [-.05, .31], [.24, .14], [.41, .09]])
    box(DX + ox, DY - DR - .02 - len / 2, W3, .016, len, .014, K.paintD,
      { hard: true, gloss: .06, tag: '墙' });

  // ---- 消防通道 禁止占用, stencilled low in red where the paint has half gone. Every hutong has
  // it and nobody has ever obeyed it, which is why the chess table is standing on the line.
  for (const [txt, yy, sz, cc] of [['消防通道', .82, .19, K.stencil],
                                   ['禁止占用', .58, .13, K.stencilD]])
    glyphs(-27.90, yy, W1, 0, txt,
      { size: sz, gap: sz * .22, color: cc, gloss: .08, lift: .004 });

  // ---- 小广告. The stencilled numbers that go up faster than anyone scrubs them off: a man who
  // unblocks drains, and a man who will sell you a certificate. Small, crooked and grubby — they
  // are the texture of a Beijing wall, not signage.
  for (const [txt, xx, yy, sz, cc] of [
    ['疏通下水道', -30.30, 2.70, .125, K.grime],
    ['13800135566', -30.30, 2.53, .092, K.grime],
    ['办证', -27.95, 1.66, .155, K.grimeD],
    ['13800139900', -27.95, 1.46, .082, K.grimeD]])
    glyphs(xx, yy, W1, 0, txt, { size: sz, gap: sz * .12, color: cc, gloss: .06, lift: .004 });

  say(word('墙'), '墙', DX, DY, W3,
    '墙上写着一个圈里的“拆”字。',
    'A 拆 in a circle is painted on the wall.',
    '拆 chāi — to demolish. Painted on a wall, it means this one is coming down.',
    { focus: [DX, -1.35], reach: 2.8 });

  // ---- 狗. Against the wall on a rice-sack mat, asleep at two in the afternoon and asleep at ten
  // at night — the one fixture of this square that never changes, and the thing that is still here
  // when the chess has been packed away. Curled, for the same reason as the cat.
  const DGX = -28.30, DGZ = -2.72, DG = { tag: '狗' };
  box(DGX, .012, DGZ, .86, .020, .60, K.sack, { hard: true, gloss: .10, ry: .12, mode: 7 });
  for (const t of [-1, 1])
    box(DGX + t * .22, .022, DGZ, .17, .006, .54, K.sackB,
      { hard: true, gloss: .10, ry: .12, mode: 7 });
  // The head sits ON the flank rather than beside it, high enough to break the outline, with real
  // ears and a dark muzzle. Tucked level with the body the whole animal was one tan lump: what
  // makes a sleeping dog read at three metres is the step from body to head and the two ears.
  ball(DGX, .155, DGZ, .215, .135, .180, K.tan, { gloss: .15, ry: -.4, ...DG });
  ball(DGX - .195, .175, DGZ + .105, .110, .098, .100, K.tanD, { gloss: .15, ry: -.4, ...DG });
  ball(DGX - .295, .135, DGZ + .150, .058, .048, .050, K.snout, { gloss: .16, ...DG });
  ball(DGX - .345, .128, DGZ + .172, .022, .020, .020, K.inkB, { gloss: .34, ...DG });
  for (const t of [-1, 1])
    box(DGX - .155 + t * .045, .268, DGZ + .075 + t * .062, .062, .105, .050, K.tanD,
      { rz: t * .55, ry: -.4, gloss: .15, ...DG });
  cap(DGX + .12, .075, DGZ - .12, .042, .36, .042, K.tanD,
    { rz: PI / 2, ry: -1.05, gloss: .15, ...DG });
  ball(DGX + .155, .085, DGZ + .125, .075, .048, .105, K.tan, { gloss: .15, ry: -.4, ...DG });
  shade(DGX, DGZ, 1.15, .8, .30);
  solid(DGX - .45, DGX + .45, DGZ - .22, DGZ + .22);
  say(word('狗'), '狗', DGX, .40, DGZ, '那只狗一天到晚在墙边睡觉。',
    'That dog sleeps by the wall all day long.',
    '一只狗 — 只 zhī again, the same measure word as for the cat.',
    { focus: [DGX, DGZ + 1.20], reach: 2.2 });

  // ============================================================ 4 · 门楼, the gate in the wall
  //
  // In the boundary wall on the south side, at the west end where the 公共厕所 does not stand in
  // front of it. Everything here is in FRONT of that wall's own face (z 7.19): the shell draws the
  // wall from x -33.2 to -23.6 and it is not this file's to cut a hole in. So the gate is a mass
  // standing proud of it, and what you see through the open leaf is a 影壁 screen — which is
  // exactly what you are meant to see through the open leaf of a 四合院 gate anyway. The screen is
  // narrower than the opening on purpose: at an angle you see past its edges, which is the whole
  // pleasure of walking past a gate that is open.
  const GA = -31.05, GF = 6.06, GB = 7.42;         // face, and a back buried inside the wall
  const GH = 2.42, GW = .58, OPEN = 1.32, GT = { tag: '大门' };
  for (const s of [-1, 1])
    box(GA + s * (OPEN / 2 + GW / 2), 1.44, (GF + GB) / 2, GW, 2.88, GB - GF, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
  box(GA, GH + (2.88 - GH) / 2, (GF + GB) / 2, OPEN + .04, 2.88 - GH, GB - GF, col.brick,
    { hard: true, mode: 11, gloss: G.matte, ...BRICK });
  // Nothing fills the opening. The first version put a dark reveal panel across it, the way the
  // shell's 公厕 doorways do — and that is right for a doorway with a solid wall behind it and
  // exactly wrong here, because it stood in front of the 影壁 and turned the one thing worth
  // looking through the gate at into a black rectangle. What is in the opening is depth.

  // 门槛 — the raised stone threshold you step over, and the strip of yard floor beyond it. Half a
  // metre of courtyard is still a courtyard.
  box(GA, .10, GF + .34, OPEN + .10, .20, .70, K.stoneD, { hard: true, gloss: .22 });
  flat(GA, .028, GF + .60, OPEN - .06, .70, K.yard, { gloss: .12, ...PAVE });
  // The courtyard's own inner wall, in front of the boundary wall's face at z 7.19, so the slivers
  // past the edges of the screen show a warm lit room-side rather than more of the street's brick.
  box(GA, 1.30, 7.170, 1.44, 2.30, .020, C('#b09a72'),
    { hard: true, mode: 14, gloss: .12, mat: 'plaster', matScale: 2.60, matAmt: .14 });
  for (const s of [-1, 1])
    cyl(GA + s * .60, 1.14, 7.140, .055, 2.10, C('#7e3a2c'), { gloss: G.wood });

  // 抱鼓石 — the drum stones, standing proud of the gate face so they are not swallowed by their
  // own jambs. A hutong gate never had the free-standing 石狮子 the shell puts outside 王家; those
  // belong to a much grander door than this one. What it has is a drum each side with a small lion
  // crouched on top.
  const LT = { tag: '石狮子' }, DSZ = GF - .06;
  for (const s of [-1, 1]) {
    const dx = GA + s * (OPEN / 2 + GW / 2);
    box(dx, .115, DSZ, .34, .23, .50, K.stoneD, { hard: true, gloss: .22, ...LT });
    cyl(dx, .50, DSZ - .04, .245, .155, K.stone, { rz: PI / 2, gloss: .24, ...LT });
    for (const t of [-1, 1])
      cyl(dx + t * .082, .50, DSZ - .04, .175, .012, K.stoneL, { rz: PI / 2, gloss: .26, ...LT });
    ball(dx, .755, DSZ - .05, .085, .075, .105, K.stone, { gloss: .24, ...LT });
    ball(dx, .858, DSZ - .12, .068, .068, .062, K.stone, { gloss: .24, ...LT });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047;
      ball(dx + Math.sin(a) * .072, .858 + Math.cos(a) * .068, DSZ - .09, .024, .024, .022,
        K.stoneD, { gloss: .22, ...LT });
    }
    ball(dx, .838, DSZ - .185, .036, .030, .030, K.stone, { gloss: .26, ...LT });
    cap(dx, .70, DSZ + .02, .026, .17, .026, K.stone, { rx: -.7, gloss: .24, ...LT });
  }
  say(word('石狮子'), '石狮子', GA - OPEN / 2 - GW / 2, .80, DSZ,
    '门口有一对抱鼓石，上面各有一只小狮子。',
    'A pair of drum stones at the gate, each with a small lion on top.',
    '抱鼓石 bàogǔshí — the drum stones a hutong gate stands on. 一对 yí duì is a pair.',
    { focus: [GA - .25, GF - .96], reach: 2.4 });

  // The door frame, and the 门簪 through the head of it — the two carved pegs that say "gate"
  // rather than "doorway", carrying one character each.
  box(GA, GH - .09, GF + .13, OPEN + .08, .18, .17, K.doorRed, { hard: true, gloss: G.wood });
  for (const s of [-1, 1])
    box(GA + s * (OPEN / 2 + .04), GH / 2, GF + .13, .09, GH, .17, K.doorRed,
      { hard: true, gloss: G.wood });
  for (const [s, ch] of [[-1, '吉'], [1, '祥']]) {
    cyl(GA + s * .34, GH - .19, GF + .14, .082, .19, K.doorRed,
      { rx: PI / 2, gloss: G.wood, ...GT });
    cyl(GA + s * .34, GH - .19, GF + .050, .070, .012, col.gold,
      { rx: PI / 2, gloss: .30, ...GT });
    glyphs(GA + s * .34, GH - .19, GF + .036, PI, ch,
      { size: .085, gap: 0, color: K.doorRed, gloss: .16, lift: .004, ...GT });
  }

  // 对联 — pasted flat on the brick each side of the opening, with the 横批 above. A different
  // couplet from the three the shell pastes up the alley: these gates are not clones of each other
  // and this one belongs to a family that has been here a long time. 上联 on the viewer's right,
  // which — facing the gate, so facing +z — is -x.
  const LIAN = ['忠厚传家久', '诗书继世长'];
  for (const s of [-1, 1]) {
    box(GA + s * (OPEN / 2 + GW / 2), 1.46, GF - .012, .20, 1.32, .012, K.red,
      { hard: true, gloss: .10 });
    glyphs(GA + s * (OPEN / 2 + GW / 2), 1.46, GF - .022, PI, LIAN[s < 0 ? 0 : 1],
      { size: .175, gap: .050, vertical: true, color: col.goldL, gloss: .18, lift: .006 });
  }
  box(GA, 2.60, GF - .012, 1.16, .24, .012, K.red, { hard: true, gloss: .10 });
  glyphs(GA, 2.60, GF - .022, PI, '耕读传家',
    { size: .175, gap: .10, color: col.goldL, gloss: .18, lift: .006 });

  // ---- the doors. Both leaves stood back against the passage walls, which is what a gate like
  // this is at four in the afternoon — open because somebody is in, with a padlock hanging on the
  // hasp that is thirty years newer than anything else on the door. The first pass had one leaf
  // shut, and a shut leaf plus a half-open one leaves a 32 cm slot to see the 影壁 through, which
  // is the same as not building a 影壁.
  //
  // The swing is 58° and 46°, not the 70° the shell's own gates use, and never the same on both
  // sides. There are only 0.70 m between the doors and the screen and a leaf is 0.64 m wide: past
  // 60° the leaf goes straight through it.
  const DZ = GF + .26, HH = 2.30;
  for (const s of [-1, 1]) {
    const a = s < 0 ? -1.02 : .81;
    const hx = GA + s * (OPEN / 2 - .01), hz = DZ;
    const ca = Math.cos(a), sa = Math.sin(a);
    const at = (lx, lz) => [hx + ca * lx + sa * lz, hz - sa * lx + ca * lz];
    const [dx, dz] = at(-s * (OPEN / 4), 0);
    box(dx, HH / 2 + .12, dz, OPEN / 2 - .02, HH, .075, s < 0 ? K.doorWorn : K.doorRed,
      { hard: true, gloss: .22, ry: a, ...GT });
    // 门钉 in three columns. Dull brass, not gold: nobody has polished these since the eighties.
    for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) {
      const [sx2, sz2] = at(-s * (OPEN / 4) + c * .17, -.043);
      ball(sx2, .70 + r * .43, sz2, .027, .027, .019, K.brass, { gloss: G.metal, ...GT });
    }
    // Peeling paint, on the leaf that stands out in the afternoon sun rather than in the shade of
    // the passage. Bare wood shows through where the sun has had it.
    if (s > 0) for (const [ox, oy, w, h] of [[-.10, .95, .17, .30], [.07, 1.62, .11, .19],
                                             [-.02, .52, .22, .14]]) {
      const [px2, pz2] = at(-s * (OPEN / 4) + ox, -.042);
      box(px2, oy, pz2, w, h, .010, K.bare, { hard: true, gloss: .14, ry: a, ...GT });
    }
    const [kx, kz] = at(-s * (OPEN / 2 - .14), -.052);
    ball(kx, 1.14, kz, .052, .052, .022, K.brass, { gloss: G.metal, ry: a, ...GT });
    cap(kx, 1.06, kz - .014, .012, .13, .012, K.brassD, { ry: a, gloss: G.metal, ...GT });
    // The hasp, on the leading edge of the east leaf, with the padlock hanging open through it —
    // the one bright, cold, machine-made object anywhere on this gate, which is the point of it.
    // Placed through the leaf's own hinge frame so it swings with the door instead of hanging in
    // the air where the door used to be.
    if (s > 0) {
      const [hx2, hz2] = at(-s * (OPEN / 2 - .13), -.050);
      box(hx2, 1.30, hz2, .20, .055, .014, K.steel, { hard: true, gloss: G.metal, ry: a, ...GT });
      const [lx2, lz2] = at(-s * (OPEN / 2 - .13) - .085, -.062);
      box(lx2, 1.30, lz2, .045, .075, .012, K.steelD,
        { hard: true, gloss: G.metal, ry: a, ...GT });
      box(lx2, 1.230, lz2 - .014, .052, .062, .034, K.zinc,
        { hard: true, gloss: .62, round: .008, ry: a, ...GT });
      cap(lx2, 1.300, lz2 - .014, .009, .050, .009, K.zinc,
        { rz: PI / 2, ry: a, gloss: .62, ...GT });
      cap(lx2 + .026, 1.286, lz2 - .014, .009, .044, .009, K.zinc, { ry: a, gloss: .62, ...GT });
    }
  }

  // ---- 影壁, the screen wall a couple of feet inside the gate: so that the courtyard is not open
  // to the lane, and — in the older reading — so that nothing travelling in a straight line can
  // get in. 3 cm clear of the boundary wall's own face at z 7.19, and every centimetre of that gap
  // is passage depth the leaves need to swing back into.
  const YZ = 7.09;
  box(GA, .10, YZ, 1.12, .20, .20, K.stoneD, { hard: true, gloss: .22 });
  box(GA, 1.02, YZ, 1.06, 1.84, .14, col.brick, { hard: true, mode: 11, gloss: G.matte, ...BRICK });
  box(GA, 1.02, YZ - .078, .82, 1.44, .020, K.lime,
    { hard: true, gloss: .12, mode: 14, mat: 'plaster', matScale: 2.60, matAmt: .14 });
  box(GA, 1.98, YZ, 1.24, .09, .30, col.tileD, { hard: true, mode: 13, gloss: .18, ...RTILE });
  cap(GA, 2.05, YZ, .075, 1.24, .075, col.tileD, { rz: PI / 2, gloss: .18 });
  // 福, on the diamond, upside down — 福倒了 / 福到了, the pun every gate in China makes. The
  // extra rotZ turns the character over inside the same chain `glyphs` builds for a yaw of π.
  box(GA, 1.02, YZ - .094, .48, .48, .010, K.red, { hard: true, gloss: .12, rz: PI / 4 });
  const fu = glyphs(GA, 1.02, YZ - .104, PI, '福',
    { size: .32, gap: 0, color: col.goldL, gloss: .18, lift: .004 })[0];
  if (fu) fu.m = M.mul(M.trans(GA, 1.02, YZ - .108),
    M.mul(M.rotY(PI), M.mul(M.rotZ(PI), M.mul(M.rotX(PI / 2), M.scale(.32, 1, .32)))));
  // the top of a 石榴 branch showing over the screen, which is the whole of the courtyard you get
  for (let i = 0; i < 5; i++)
    ball(GA - .25 + i * .13, 2.26 + (i % 2) * .11, YZ - .05, .13, .085, .07, LEAF[i % 3],
      { gloss: .10, mode: 15, ry: i * .9 });

  // ---- the canopy: a small pitched roof on two brackets, overhanging the paving. Old, so the
  // eave course has half a tile missing off the west end.
  const RG = GF + .22;
  for (const s of [-1, 1])
    box(GA + s * (OPEN / 2 + .18), 2.94, GF + .06, .15, .17, .58, K.doorRed,
      { hard: true, gloss: G.wood });
  for (const s of [-1, 1])
    box(GA, 3.14, RG + s * .34, OPEN + 1.10, .085, .80, col.tileD,
      { hard: true, mode: 13, gloss: .18, rx: s * .38, ...RTILE });
  cap(GA, 3.29, RG, .075, OPEN + 1.10, .075, col.tileL, { rz: PI / 2, gloss: .20 });
  for (let i = 0; i < 9; i++)
    cyl(GA - .95 + i * .24, 2.98, RG - .70, .052, .062, col.tileD,
      { rx: PI / 2, gloss: .18, ...RTILE });

  // ---- the number, and the light over the door. The plate is the blue enamel one that is the
  // same on every door in the city; the light is a caged bulb that comes on at dusk and is the
  // only lit thing at this end of the street once the shops have gone dark.
  box(GA + OPEN / 2 + .34, 2.26, GF - .012, .40, .23, .035, col.blueSign,
    { hard: true, gloss: .30 });
  glyphs(GA + OPEN / 2 + .34, 2.26, GF - .036, PI, '8',
    { size: .16, gap: .02, color: col.white, mode: 1, lift: .006 });
  const lampBulb = ball(GA, 2.52, GF - .02, .062, .070, .062, K.bulb, { mode: 1, glow: 0 });
  cap(GA, 2.68, GF - .02, .014, .18, .014, K.steelD, { gloss: G.metal });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.047;
    cap(GA + Math.sin(a) * .080, 2.52, GF - .02 + Math.cos(a) * .080, .007, .20, .007, K.steelD,
      { gloss: G.metal });
  }
  const gateLight = light(GA, 2.44, GF - .16, K.lampWarm, 0, 3.2);
  gateLight.on = false;
  const gatePool = S.glow(M.trs(GA, .022, GF - .60, 0, 2.6, 1, 2.2), K.pool, 0);

  say(word('大门'), '大门', GA, 1.60, GF,
    '这个大门上了新锁，可门还开着。',
    'There is a new padlock on this gate, but it is still standing open.',
    '大门 dàmén is the gate onto the street; 锁 suǒ is the lock on it.',
    { focus: [GA, GF - 1.30], reach: 2.6, tag: '大门' });
  // Stops the body at the drum stones. The south-west pocket stays enterable: you walk in from the
  // north and stand a little over half a metre off the threshold, looking through the open leaf.
  solid(GA - OPEN / 2 - GW - .10, GA + OPEN / 2 + GW + .10, DSZ - .26, GB);
  shade(GA, GF + .30, 3.2, 1.6, .34);

  // ============================================================ 5 · the corner it lives in
  //
  // The strip between 李师傅's gable and the boundary wall, at x < -31.9 and z > 6.4 — outside
  // anything the body can reach, so none of it needs a collider and none of it can seal anything.
  //
  // ---- 石榴 in a pot. A pomegranate by the gate is not decoration: 榴 is seeds, seeds are sons,
  // and the tree is there for the same reason the 福 is upside down.
  const PX = -32.68, PZ = 6.28;
  taper(PX, .21, PZ, .52, .42, .52, K.pot, { gloss: .20 });
  cyl(PX, .40, PZ, .245, .05, K.pot, { gloss: .22 });
  cyl(PX, .425, PZ, .215, .03, col.dirt, { gloss: .08 });
  cyl(PX, .70, PZ, .045, .58, K.woodD, { gloss: G.wood });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257;
    cap(PX + Math.sin(a) * .16, 1.14, PZ + Math.cos(a) * .16, .040, .58, .040, K.vine,
      { ry: a, rz: .48, gloss: .14 });
  }
  // A crown of a dozen rounded clusters rather than sixteen flat discs on sticks: at 23 × 10 cm
  // they read as a bonsai in a pot, which is not what a 石榴 by a gate looks like.
  ball(PX, 1.28, PZ, .30, .24, .28, K.leaf3, { gloss: .08, mode: 15 });
  for (let i = 0; i < 12; i++) {
    const u = (i * .618) % 1, a = i * 1.13;
    ball(PX + Math.sin(a) * (.16 + u * .18), 1.20 + ((i % 4) - 1.4) * .17,
      PZ + Math.cos(a) * (.16 + u * .18), .155, .120, .145, LEAF[i % 3],
      { gloss: .10, mode: 15, ry: a });
  }
  // The fruit hangs on the outside of the crown, or it is inside it and might as well not exist.
  for (const [ox, oy, oz] of [[.30, 1.12, .16], [-.30, 1.34, -.12], [.08, .96, -.32]]) {
    ball(PX + ox, oy, PZ + oz, .088, .094, .088, K.fruit, { gloss: .26 });
    for (let i = 0; i < 4; i++)
      box(PX + ox + Math.sin(i * 1.57) * .032, oy + .094, PZ + oz + Math.cos(i * 1.57) * .032,
        .022, .042, .022, K.fruitD, { hard: true, gloss: .24, rz: (i - 1.5) * .3 });
  }
  const pom = word('石榴', '树');
  say(pom, pom, PX, 1.20, PZ,
    '门口种着一棵石榴树，这是老规矩。',
    'A pomegranate planted by the gate — that is the old custom.',
    '石榴 shíliu — pomegranate. 多子多福: many seeds, many sons.',
    // The gate's collider ends the pocket at z 5.40, so the focus goes on paving the body can
    // actually reach and the reach covers the rest.
    { focus: [PX + 1.38, PZ - 1.08], reach: 2.8 });

  // ---- 水缸. The glazed butt that stands under the eaves and catches what comes off the roof,
  // with a board over it and a dipper hooked on the rim. Half of these have a goldfish in.
  const VX = -32.62, VZ = 4.66;
  taper(VX, .30, VZ, .58, .60, .58, K.crock, { rx: PI, gloss: .40 });
  cyl(VX, .60, VZ, .335, .05, K.crockD, { gloss: .42 });
  cyl(VX, .588, VZ, .300, .02, K.water, { gloss: .70 });
  box(VX + .10, .645, VZ - .04, .46, .028, .38, K.woodD, { hard: true, gloss: G.wood, ry: .3 });
  cyl(VX - .27, .70, VZ + .16, .062, .045, K.tin, { gloss: .34 });
  cap(VX - .27, .86, VZ + .16, .014, .30, .014, K.woodD, { rz: .22, gloss: G.wood });
  taper(VX, .11, VZ, .70, .06, .70, K.stoneD, { gloss: .20 });

  // ---- two bikes against the boundary wall east of the gate, where it is blank. Past z 6.4 the
  // body cannot reach them, so they are geometry and nothing else.
  const bike = (x, z, ry, frame) => {
    const s = Math.sin(ry), c = Math.cos(ry);
    const at = (fw, side) => [x + s * fw + c * side, z + c * fw - s * side];
    const put = (kind, fw, up, side, sx, sy, sz, cc, o = {}) => {
      const [wx, wz] = at(fw, side), oo = { ry, ...o };
      if (kind === 'cyl') return cyl(wx, up, wz, sx / 2, sy, cc, oo);
      if (kind === 'ball') return ball(wx, up, wz, sx / 2, sy / 2, sz / 2, cc, oo);
      if (kind === 'cap') return cap(wx, up, wz, sx, sy, sz, cc, oo);
      return box(wx, up, wz, sx, sy, sz, cc, oo);
    };
    // `fw` is forward along the bike, `side` across it, so the wheels lie in the fore-aft plane
    // and every tube in the frame has to be turned about x, not z. A capsule written as if it
    // were long in x comes out a flat puck lying across the frame — the classic way to lose an
    // afternoon on a bicycle.
    for (const fw of [-.52, .52]) {
      put('cyl', fw, .34, 0, .66, .045, .66, col.black, { rz: PI / 2, gloss: .22 });
      put('cyl', fw, .34, 0, .11, .05, .11, K.steel, { rz: PI / 2, gloss: G.metal });
      for (let i = 0; i < 6; i++)
        put('cap', fw, .34, 0, .008, .62, .008, K.steel, { rx: i * .52, gloss: G.metal });
    }
    put('cap', .08, .95, 0, .026, .78, .026, frame, { rx: PI / 2 - .12, gloss: .34 });   // top tube
    put('cap', .21, .625, 0, .026, .80, .026, frame, { rx: .62, gloss: .34 });           // down tube
    put('cap', -.15, .59, 0, .026, .64, .026, frame, { rx: -.42, gloss: .34 });          // seat tube
    put('cap', -.27, .32, 0, .022, .52, .022, frame, { rx: PI / 2 - .08, gloss: .34 });  // chainstay
    put('cap', -.40, .61, 0, .022, .60, .022, frame, { rx: -.42, gloss: .34 });          // seatstay
    put('cap', .48, .645, 0, .024, .62, .024, K.steelD, { rx: .13, gloss: G.metal });    // fork
    put('cap', .46, 1.02, 0, .022, .48, .022, K.steelD, { rz: PI / 2, gloss: G.metal }); // bars
    put('box', -.29, .90, 0, .24, .06, .13, col.black, { gloss: .26 });                  // saddle
    put('box', -.56, .78, 0, .34, .035, .26, K.steelD, { gloss: G.metal });              // rack
    put('box', .48, .82, 0, .22, .20, .28, K.canvas, { mode: 7, gloss: G.fabric });      // basket
    put('box', -.30, .17, 0, .78, .05, .09, K.steelD, { gloss: .30 });                   // guard
  };
  bike(-30.55, 6.86, .06, col.bikeB);
  bike(-29.90, 6.90, -.10, C('#4a6f5a'));
  // a broom stood on its head, which is how a broom is kept so it holds its shape
  cap(-29.35, .62, 6.94, .018, 1.24, .018, K.woodD, { rz: .13, gloss: G.wood });
  ball(-29.43, 1.34, 6.94, .085, .13, .055, C('#a8925e'), { gloss: .10, rz: .13 });

  // ============================================================ hours
  //
  // 象棋 is an afternoon. The board, the pieces, the flask, the paper, the fan, the radio and the
  // birdcage come out after lunch and go in at eight, and what is left after dark is a bare table,
  // three stools and the dog — which is the picture this district is actually for. Written once
  // per change rather than per frame: this is a hundred-odd matrices and it moves twice a day.
  const OUT = 12.5, IN = 20.0;
  let up = null, lit = null;
  StreetFit['west'].tick = (t, body, mins) => {
    if (mins === undefined) return;
    const h = (mins / 60) % 24;
    const now = h >= OUT && h < IN;
    if (now !== up) {
      up = now;
      for (const k of kit) k.p.m = now ? k.m0 : HIDDEN;
    }
    // The bulb over the gate. The shell's own `setNight` only walks the props it registered
    // itself, so this one is switched here — the light, its pool and the emissive bulb together.
    const dark = h < 6.1 || h > 18.5;
    if (dark !== lit) {
      lit = dark;
      lampBulb.glow = dark ? .55 : 0;
      gateLight.power = dark ? 1.15 : 0;
      gateLight.on = dark;
      gatePool.a = dark ? .34 : 0;
    }
  };
};
