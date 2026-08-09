// 大堂 — the ground-floor lobby
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
// x -6..6, z -5..6.2, and the deck is y 0 — but every height below is still written `Y + h`,
// because `A.y0` is what makes a room file portable and one day this may not be the storey it is
// now, and every z off `A.LOBBY`, because the back wall has already moved twice. The second move
// pushed it from 5.3 to 6.2 and took both lift shafts with it to z 4.9..6.2, which opened up two
// and a half metres of floor in front of the lifts that nothing had been designed for. Most of
// what this file gained in its last pass lives in that strip.
//
// The clear height is `A.LOBBY.h` and it is 3.02, not the 3.40 in APARTMENT.md: the flat stands
// directly over this room with its floor slab at 3.10, and 3.40 would put the ceiling inside it.
// The note over `LOBBY` in js/world.js has the whole of it.
//
// What the shell has already put here, and what this file must therefore build around:
//
//   * the four walls and a stone floor, with a 3.8 m hole in the street wall (z = -5) between
//     x ±1.9, up to y 2.62 — the vestibule fills it;
//   * two lift shafts at the +z end, their landing faces standing at z = 4.90 and covering
//     x -0.56 .. 3.50, with doors, indicators and a call panel at x 1.50 already on them;
//   * a stone plinth 11 cm deep round the foot of every wall, and a lit reveal 14 cm under the
//     ceiling.
//
// So the walking is the middle of the room, and everything this file builds lines the edges of it:
// the porch at -z, the porter at +x, the post and the notices at -x, the lockers, the lift portal
// and the waiting seat at +z. The one thing kept deliberately empty is the diagonal from the inner
// doors to the working lift.
//
// ---------------------------------------------------------------- the two datums
//
// This room lays its own finished floor and its own ceiling over the shell's, and every decal in
// the file is stacked off those two numbers rather than off the deck. `FY` is 29 mm over the deck,
// which is 11 mm clear of the top of the shell's floor build-up at 0.018 — the minimum this
// project allows between two faces that overlap, and measured against the surface actually there
// rather than guessed. Everything laid on the floor then steps up from it in clear increments:
// inlay, matting and the runner lines at FY + 12, the lift approach's dark stone and the two door
// sills at FY + 24, light pools at FY + 35, contact shadows at FY + 43. Nothing on this deck
// shares a plane with anything, and nothing is closer than a centimetre to what is under it.
//
// The pools and the shadows used to sit at FY + 21 and + 29, which put both of them *under* the
// lift approach panel — the one place on this floor that is two layers thick — so the brightest
// square metre of stone in the room, the one in front of the doors, had nothing drawn on it at
// all. Anything added here has to step over the top of that panel, not just over the field.
//
// The consequence to remember is that `A.shade`'s default y — the deck plus 20 mm — is now *under*
// the floor, so every contact shadow in this file passes `SY` explicitly. A shadow that forgets to
// is not drawn at all, and the object it belonged to stands on the stone with nothing under it.
//
// A Chinese lobby is not a Western one with Chinese labels, and the difference is mostly things a
// Western lobby has no reason to contain: somebody sitting in a glazed room by the door all day,
// a wall of letterboxes for forty flats, a bank of parcel lockers that the courier — the same one
// who already delivers to this flat — loads from the other side, a glazed case of notices, which
// is where the building actually talks to you, and a lit advertising frame either side of the lift
// doors, which is where somebody else does.
//
// ---------------------------------------------------------------- what the last pass was for
//
// Finishes, and it was measured rather than judged. A render of this room came back with the floor
// field at L 146–165 of 255, the wall above it at 172 and the ceiling at 182 — the whole room
// inside a band 36 values wide, which is why it read as one sheet of cream with furniture standing
// on it however much furniture there was. Four things came out of that:
//
//   * the floor's four stones are authored much darker and much further apart, and a pair of
//     inlaid lines now runs the length of the walk so the field is not nine metres of nothing;
//   * a 墙裙 — a stone wainscot with a dark cap — runs the whole way round at 80 cm, which is the
//     one height in this room where no fitting is in the way;
//   * every contact shadow is half again as strong, and the things that had none — the porter's
//     counter, the foot of every wall — have one;
//   * the ceiling's own glow is gone. It is `mode: 1`, so it draws at its authored colour with or
//     without it, and all the glow was doing was putting a hundred and twenty square metres of
//     emitter into the post chain's light mask.
//
// The one defect left in this room is not in this file: the occlusion pass lays a blurred ghost of
// the lobby across the ceiling and the far walls. Verified with `R.setAO(false)`, which removes it
// entirely and nothing else. See the report.
FlatFit['lobby'] = A => {
  const { col, G, MAT, C, M } = A;
  const Y = A.y0;                                   // the lobby's deck: 0
  const X0 = A.LOBBY.x0, X1 = A.LOBBY.x1, Z0 = A.LOBBY.z0, Z1 = A.LOBBY.z1, H = A.LOBBY.h;

  // The stack described above, once, so no line in this file has to remember which layer it is on.
  const FY = Y + .029;         // the finished stone floor this room lays
  const IY = Y + .041;         // inlay lines, matting, the tiled floor of the porter's room
  // 64 and 72, not 50 and 58. The lift-approach panel is the one thing on this floor that is two
  // layers thick — a pale kerb at IY and the dark stone inside it at IY + 12 mm, which is 53 —
  // so every light pool in front of the lift doors was drawn *under* a quad that had already
  // written depth, and the brightest square metre of stone in the room had nothing on it. Both
  // datums step over the top of it, and both keep the file's 10 mm minimum from what is below.
  const GY = Y + .064;         // light pools and the smears that stand in for a reflection
  const SY = Y + .072;         // contact shadows — always passed, never defaulted
  const CY = Y + 2.965;        // this room's ceiling plane, under the shell's at 3.02
  const BY = Y + 2.720;        // the soffit of the perimeter bulkhead
  const RFY = Y + 2.835;       // the underside of the floating raft in the middle of it

  // Colours this room adds to the palette. Everything structural is A.col; these are the ones a
  // lobby has and a flat does not — brushed aluminium, the dark stone of a wainscot, the green of
  // a locker cabinet and of an exit sign, which is a specific green and not a chosen one.
  const alu    = C('#aab1b5'), aluD = C('#8b9296'), steel = C('#c3c8cb');
  const stoneD = C('#6b6055'), stoneC = C('#9d9382');
  const glassC = C('#cfe0e2');
  const exitG  = C('#1e7a45'), lockG = C('#2b6b52');
  const boardW = C('#eae6dc'), paperR = C('#c0392b');
  const gold   = col.gold, red = col.red;
  // 墙裙 — the wainscot's three tones. A dark backing that only ever shows in the joints, the
  // stone panel itself, and a darker cap on top of it.
  // The panel is deliberately a step cooler and darker than the floor. Authored at the same warm
  // tan it read as a continuation of the stone rather than as the bottom of the wall, and the room
  // came back beige from the skirting to the ceiling.
  const wainD = C('#443e35'), wainP = C('#7c7466'), wainC = C('#4d473c');
  // The floor's own four stones. The shell lays a near-white field, and near-white is the one
  // value a polished floor cannot be: the specular the bulb puts on it lands on top of a surface
  // already at the top of the range, so the highlight has nowhere to go and the whole floor reads
  // as an overexposed sheet of paper. Every one of these is a good step down from col.tile, which
  // is what buys the sheen somewhere to sit.
  //
  // They were a step down and it was not enough. Measured off a render rather than judged: the
  // field came back at L 146–165 of 255, the wall above it at 172 and the ceiling at 182, so the
  // whole room lived in a band 36 values wide and read as one sheet of cream with furniture on
  // it. There is nothing wrong with the tonemap — the field rendered within a few points of the
  // colour it was authored — so the fix is simply to author darker, and to spread the four tones
  // much further apart than looked right on a swatch. The border in particular: a 波打线 is the
  // darkest thing on a lobby floor, near enough to charcoal, and at #6d6558 it was four values
  // off the field and invisible from standing height.
  const flrF = C('#948872');   // the field of it
  const flrB = C('#4b443a');   // the dark border band round the room
  const flrL = C('#d4c9ae');   // the pale line inlaid just inside it
  const flrC = C('#6d6454');   // the darker panel laid in front of the lifts

  // Interior glass is nearly clear. The first build had every pane at .26 and the porch is three
  // panes deep from the lobby — sliding leaf, side screen, street glass — so a quarter each
  // compounded to a white fog you could not see the entrance through.
  const GLASS  = { hard: true, alpha: .16, gloss: .82 };
  // The street panes are the exception and carry real body, because there is nothing modelled
  // behind them: what they stand in for is daylight, and `A.sky` re-colours them off the hour. At
  // .34 they read as dark tinted glass at noon; at .82 they read as the outside.
  const SKYGL  = { hard: true, alpha: .82, gloss: .55, glow: .03 };
  const METAL  = { hard: true, gloss: G.metal, ...MAT.metal };
  const SLAB   = { hard: true, gloss: .40, ...MAT.slab };
  const TIMBER = { hard: true, gloss: G.wood, ...MAT.timber };
  const PLAST  = { hard: true, gloss: .12, ...MAT.plaster };
  const CLOTH  = { gloss: .08, mat: 'fabric', matScale: .50, matAmt: .30, nrmAmt: .30 };
  // Polished stone. `mode: 9` cuts the field into the 0.62 m slabs the shader keeps in world
  // space, so this room's stone lines up with the shell's underneath it rather than drifting
  // across it; the gloss is what makes it polished. At .64 the bulb overhead lays a long soft
  // highlight down the middle of the room, which is the whole reason to have a stone floor —
  // and the reason the four colours below are a good step darker than the shell's near-white
  // `col.tile`: a specular on a surface already at the top of the range has nowhere to go.
  const POLI   = { mode: 9, gloss: .64, ...MAT.slab };
  const BAND   = { mode: 0, gloss: .52, ...MAT.slab };

  // ================================================================ the floor
  //
  // A lobby floor is never one field of stone. It is a field, a dark band round the edge of it —
  // 波打线, the line that tells you where the walking is — a pale line inlaid inside that, and a
  // panel of something different in front of the lifts. Four tones and three heights, and between
  // them they do more for this room than any object standing on them.
  //
  // The border is four strips that do not overlap each other or the field, so all five quads sit
  // at the same height without ever sharing a pixel. Only the inlay and the lift panel, which lie
  // *on* the field, have to step up.
  const BW = .55;                                   // the border band's width
  const fx0 = X0 + BW, fx1 = X1 - BW, fz0 = Z0 + BW, fz1 = Z1 - BW;
  A.flat(0, FY, (fz0 + fz1) / 2, fx1 - fx0, fz1 - fz0, flrF, POLI);
  A.flat(0, FY, Z0 + BW / 2, X1 - X0, BW, flrB, BAND);
  A.flat(0, FY, Z1 - BW / 2, X1 - X0, BW, flrB, BAND);
  A.flat(X0 + BW / 2, FY, (fz0 + fz1) / 2, BW, fz1 - fz0, flrB, BAND);
  A.flat(X1 - BW / 2, FY, (fz0 + fz1) / 2, BW, fz1 - fz0, flrB, BAND);
  // The pale line, 6 cm wide, set 8 cm inside the band. Four strips again, mitred by simply
  // running the long pair the full length and butting the short pair against them.
  const ix0 = fx0 + .08, ix1 = fx1 - .08, iz0 = fz0 + .08, iz1 = fz1 - .08, IW = .06;
  A.flat(0, IY, iz0 + IW / 2, ix1 - ix0, IW, flrL, { mode: 0, gloss: .55, ...MAT.slab });
  A.flat(0, IY, iz1 - IW / 2, ix1 - ix0, IW, flrL, { mode: 0, gloss: .55, ...MAT.slab });
  A.flat(ix0 + IW / 2, IY, (iz0 + iz1) / 2, IW, iz1 - iz0, flrL, { mode: 0, gloss: .55, ...MAT.slab });
  A.flat(ix1 - IW / 2, IY, (iz0 + iz1) / 2, IW, iz1 - iz0, flrL, { mode: 0, gloss: .55, ...MAT.slab });

  // 电梯厅 — the panel in front of the lifts, which is the one piece of floor everybody in this
  // building stands on twice a day. Darker than the field, with a pale kerb round it, so the
  // approach to the lift reads as a place and not as more of the same stone.
  const KZ0 = 3.44, KZ1 = 4.86, KX0 = -0.86, KX1 = 3.86;
  A.flat((KX0 + KX1) / 2, IY, (KZ0 + KZ1) / 2, KX1 - KX0, KZ1 - KZ0, flrL,
    { mode: 0, gloss: .55, ...MAT.slab });
  A.flat((KX0 + KX1) / 2, IY + .012, (KZ0 + KZ1) / 2, KX1 - KX0 - .22, KZ1 - KZ0 - .22, flrC,
    { mode: 9, gloss: .62, ...MAT.slab });

  // 引导铺装 — the line the stone itself draws from the inner doors to the lift.
  //
  // The field is nine metres by eleven and the border round it is at the walls, behind everything
  // standing on them, so from anywhere a body can stand the floor was one unbroken sheet of stone
  // with a slab joint every 62 cm and nothing else. This is the device every lobby of this size
  // uses and it costs six strips: a pair of dark lines 2.3 m apart running the length of the walk,
  // a pale line inside each, and a bar closing the porch end. The far end is left open because it
  // runs into the lift approach panel's own kerb, which closes it.
  //
  // 2.3 m apart because that is the width of the ceiling raft directly above it. The eye reads the
  // two as one thing without being told, and the reflection smear laid down the middle of them is
  // the raft coming back off the stone.
  //
  // Nothing here overlaps anything: the dark strips are centred at ±1.15 and 75 mm wide, the pale
  // ones at ±1.045 and 50 mm, and the two cross bars are cut short so they butt the verticals
  // rather than crossing them. Six quads at one height that never share a pixel — the same
  // arrangement as the border band, and for the same reason.
  const RNX = 1.15, RNZ0 = -3.30, RNL = KZ0 - RNZ0, RNC = (RNZ0 + KZ0) / 2;
  const inl = { mode: 0, gloss: .55, ...MAT.slab };
  for (const s of [-1, 1]) {
    A.flat(s * RNX, IY, RNC, .075, RNL, flrB, inl);
    A.flat(s * (RNX - .105), IY, RNC, .050, RNL, flrL, inl);
  }
  A.flat(0, IY, RNZ0 + .0375, RNX * 2 - .075, .075, flrB, inl);
  A.flat(0, IY, RNZ0 + .1425, (RNX - .105) * 2 - .050, .050, flrL, inl);

  // ================================================================ 墙裙 the wainscot
  //
  // The one thing the walls of this room did not have, and the reason every wide shot of it came
  // back as furniture standing in front of eleven metres of blank cream: between the shell's stone
  // plinth at 15 cm and the first fitting at 85 cm there was nothing at all, all the way round.
  //
  // What a Beijing lobby puts there is a stone wainscot, and the detail that makes one read is not
  // the stone — it is the joints. So this is three layers rather than one slab: a dark backing that
  // is only ever seen 12 mm at a time, panels standing 30 mm proud of it with a gap between each
  // pair, and a cap on top standing 20 mm proud of the panels with the backing showing as a shadow
  // line under it. Four faces, each a clear 20 mm out from the last, and none of them within reach
  // of the shell's plinth, whose own face is at 11 cm — the cap stops at 10.5 and sits just behind
  // it, which is what makes the plinth read as a plinth rather than as the bottom of the panel.
  //
  // `dado(axis, at, a0, a1)` lays one run. `axis` is which coordinate the wall is fixed in and
  // `at` is its value; the run goes from a0 to a1 in the other. The sign is derived from `at`
  // rather than passed, because every wall in this room is an outside wall and the room is always
  // the way back toward the middle of it — which is also why this cannot be reused for a partition.
  //
  // `MAT.slab` straight out of the box put a brick wall round this room. Its texture is paving at
  // a 0.70 world period, which is right for a floor read from two metres above it and wrong for a
  // panel you walk past with your shoulder 40 cm away: at that distance the period resolves into
  // courses and every wide shot came back with the lobby wainscotted in stock brick. Nearly twice
  // the period and less than half the amount, and it is polished stone.
  const DY0 = Y + .165, DY1 = Y + .775, DCY = Y + .805;
  const dadoM = { hard: true, gloss: .34, ...MAT.slab, matScale: 1.35, matAmt: .07, nrmAmt: .09 };
  function dado(axis, at, a0, a1) {
    const s = at > 0 ? -1 : 1;                       // into the room
    const c = (a0 + a1) / 2, len = a1 - a0;
    const put = (off, th, cy, h, cc, w, mat) => {
      const p = at + s * (off + th / 2);
      if (axis === 'x') A.box(p, cy, c, th, h, w, cc, mat);
      else A.box(c, cy, p, w, h, th, cc, mat);
    };
    put(0, .055, (DY0 + DY1) / 2 + .01, DY1 - DY0 + .02, wainD, len, dadoM);
    // The panels. `n` is rounded to a whole number and the step derived from it, so a run of any
    // length comes out in equal panels — and so that nothing in this loop can ever index anything
    // with a fraction, which is how a colourless prop got into this project once before.
    const n = Math.max(1, Math.round(len / .92)), step = len / n;
    for (let i = 0; i < n; i++) {
      const q = a0 + (i + .5) * step, p = at + s * .070;
      if (axis === 'x') A.box(p, (DY0 + DY1) / 2, q, .030, DY1 - DY0, step - .014, wainP, dadoM);
      else A.box(q, (DY0 + DY1) / 2, p, step - .014, DY1 - DY0, .030, wainP, dadoM);
    }
    put(.065, .040, DCY, .050, wainC, len,
      { hard: true, gloss: .44, ...MAT.slab, matScale: 1.35, matAmt: .06, nrmAmt: .08 });
    // And the crease where it meets the floor. A wall with a shadow at its foot stands on the
    // stone; a wall without one is pasted onto it.
    if (axis === 'x') A.shade(at + s * .17, c, .40, len, .34, SY);
    else A.shade(c, at + s * .17, len, .40, .34, SY);
  }
  // -x: the whole run, which passes under the letterbox ledge at 84 cm and the hydrant at 85 with
  // three centimetres to spare. +x: the public half only — the porter has his own room and a
  // lobby wainscot does not go inside it — and broken round the mirror, whose frame comes down to
  // 47 cm and would otherwise stand inside the panels.
  dado('x', X0, Z0 + .10, Z1 - .12);
  dado('x', X1, -0.86, 3.36);
  dado('x', X1, 4.84, Z1 - .12);
  // -z: both sides of the vestibule opening. +z: the three stretches the lockers, the lift core
  // and the stair door leave.
  dado('z', Z0, X0 + .10, -1.96);
  dado('z', Z0, 1.96, X1 - .10);
  dado('z', Z1, X0 + .12, -5.26);
  dado('z', Z1, -1.54, -0.78);
  dado('z', Z1, 3.72, 4.20);

  // ================================================================ the ceiling
  //
  // The shell lays one plane at 3.02 and a lit reveal round the top of the walls, and from an eye
  // four metres back that plane runs away to the far wall as a single unbroken field the tone of
  // paper — nothing to read a distance against, and at the far end of an eleven-metre room it went
  // to white. So this room lays its own, 55 mm under it, and then puts three levels into it:
  //
  //   2.72  a bulkhead round the perimeter, holding the downlights, standing 16 cm clear of the
  //         walls so the shell's lit reveal shows in the slot behind it;
  //   2.965 the flat between the bulkhead and the raft, washed by the cove;
  //   2.835 a floating raft over the middle of the room, which is what the eye actually reads the
  //         height of the room against.
  //
  // The 16 cm slot is the part worth keeping if any of this is ever rebuilt. A ceiling that stops
  // short of the wall reads as a ceiling; one that runs into it reads as a lid.
  //
  // No glow on it. `A.ceiling` is mode 1, the renderer's flat unlit shade, so this plane is
  // already drawn at exactly the colour it is authored whatever the lamps are doing — the glow was
  // buying nothing but a hundred and twenty square metres of emitter in the post chain's light
  // mask, which is the largest single thing in this room feeding the bloom. The cove and the raft
  // below keep theirs, because they are meant to be the bright part; the field they sit in is not.
  A.ceiling(0, CY, (Z0 + .55 + Z1) / 2, X1 - X0, Z1 - Z0 - .55, C('#dcd3bd'), { gloss: .07 });

  // The bulkhead. Four boxes, 90 cm wide, 30 cm deep, their outer faces 16 cm off each wall. The
  // +z leg stops at 4.87 and not at the back wall: past that is the lift shaft, and the car rides
  // through it for thirty-seven metres.
  //
  // Every soffit in this room is a *pair*: a box for the fascia, which has to shade so the step
  // reads, and a separate quad 14 mm under its bottom face carrying the lit surface. That is not
  // fussiness. A downward face in this renderer is lit by `uGround` alone — the warm bounce off a
  // floor, which is all a surface pointing at the ground can receive — so a mode-0 box hung in a
  // ceiling comes out the colour of a floorboard. The first build of this ceiling was a four-metre
  // slab of chocolate brown hanging over the middle of the lobby, and that is why `A.ceiling`
  // defaults to mode 1 everywhere else in this project.
  const BX0 = X0 + .16, BX1 = X1 - .16, BZ0 = Z0 + 1.22, BZ1 = 4.87, BD = .90;
  const BZL = BZ1 - BZ0 - BD * 2, BZC = (BZ0 + BZ1) / 2, BXL = BX1 - BX0;
  const bulk = { hard: true, gloss: .10, ...MAT.plaster };
  const soff = { gloss: .07, glow: .020 };
  const legs = [[0, BZ0 + BD / 2, BXL, BD], [0, BZ1 - BD / 2, BXL, BD],
                [BX0 + BD / 2, BZC, BD, BZL], [BX1 - BD / 2, BZC, BD, BZL]];
  for (const [cx, cz, w, d] of legs) {
    A.box(cx, BY + .157, cz, w, .286, d, C('#e7e0d1'), bulk);
    A.ceiling(cx, BY, cz, w, d, C('#e9e2d2'), soff);
  }
  // A shadow line along the inner edge of it, which is the cheapest way to make a step in a
  // ceiling read as a step rather than as a change of paint. Hung 10 mm clear under the soffit,
  // for the same reason everything else in this file is hung 10 mm clear of what it sits on.
  const REV = { hard: true, gloss: .16 }, RY2 = BY - .024;
  A.box(0, RY2, BZ0 + BD - .020, BXL - BD * 2, .028, .022, C('#b0a999'), REV);
  A.box(0, RY2, BZ1 - BD + .020, BXL - BD * 2, .028, .022, C('#b0a999'), REV);
  A.box(BX0 + BD - .020, RY2, BZC, .022, .028, BZ1 - BZ0, C('#b0a999'), REV);
  A.box(BX1 - BD + .020, RY2, BZC, .022, .028, BZ1 - BZ0, C('#b0a999'), REV);

  // The cove. Nothing here throws real light upward, so what stands in for it is the ceiling
  // itself carrying the wash: a 34 cm band of warm emissive laid 10 mm under the flat, hugging the
  // inside of the bulkhead. Four bands of about three square metres each, so they sit at the very
  // bottom of the glow scale — .04 is a wash, .14 would be a lightbox.
  const cove = { gloss: .06, glow: .050 };
  const cvx0 = BX0 + BD, cvx1 = BX1 - BD, cvz0 = BZ0 + BD, cvz1 = BZ1 - BD;
  A.ceiling(0, CY - .010, cvz0 + .17, cvx1 - cvx0, .34, C('#fff0d6'), cove);
  A.ceiling(0, CY - .010, cvz1 - .17, cvx1 - cvx0, .34, C('#fff0d6'), cove);
  A.ceiling(cvx0 + .17, CY - .010, (cvz0 + cvz1) / 2, .34, cvz1 - cvz0 - .68, C('#fff0d6'), cove);
  A.ceiling(cvx1 - .17, CY - .010, (cvz0 + cvz1) / 2, .34, cvz1 - cvz0 - .68, C('#fff0d6'), cove);

  // The raft. A slab hanging in the middle of the flat, its underside at 2.835, with a dark reveal
  // 16 mm below that so the edge of it reads from underneath as well as from the side.
  const RX0 = -2.30, RX1 = 2.30, RZ0 = -2.30, RZ1 = 2.90;
  const RXC = (RX0 + RX1) / 2, RZC = (RZ0 + RZ1) / 2;
  // Its top is 30 mm *above* the ceiling plane, not level with it: a box top flush with a quad is
  // two horizontal faces in the same plane, and back-face culling is the only thing standing
  // between that and a flicker. Pushed through, the two never meet.
  A.box(RXC, (RFY + .014 + CY + .030) / 2, RZC, RX1 - RX0, CY + .030 - RFY - .014, RZ1 - RZ0,
    C('#e9e2d3'), { hard: true, gloss: .10, ...MAT.plaster });
  A.ceiling(RXC, RFY, RZC, RX1 - RX0, RZ1 - RZ0, C('#f0eade'), { gloss: .07, glow: .024 });
  for (const [cx, cz, w, d] of [[RXC, RZ0 + .045, RX1 - RX0, .09], [RXC, RZ1 - .045, RX1 - RX0, .09],
                                [RX0 + .045, RZC, .09, RZ1 - RZ0],
                                [RX1 - .045, RZC, .09, RZ1 - RZ0]])
    A.box(cx, RFY - .026, cz, w, .020, d, C('#4a453d'), { hard: true, gloss: .22 });

  // A downlight is a disc sunk into the plane it hangs in rather than laid on it: the fitting
  // spans (soffit - .042) .. (soffit + .002), so it cuts two millimetres through the surface and
  // can never be caught fighting it for the same pixels.
  const POOL = [];
  function down(x, z, at, r = .085) {
    A.cyl(x, at - .020, z, r, .044, C('#fff4dc'), { mode: 1, glow: .22 });
    POOL.push([x, z]);
  }
  // Round the bulkhead. The two nearest the porter's room are left out: its own ceiling is at
  // 2.55 and a fitting above that is a fitting nobody can ever see.
  for (const x of [-4.80, -3.20, -1.60, 0, 1.60, 3.20]) down(x, BZ0 + BD / 2, BY);
  for (const x of [-4.80, -3.20, -1.60, 4.60])          down(x, BZ1 - BD / 2, BY);
  for (const z of [-2.40, -0.80, 0.80, 2.40, 3.70])     down(BX0 + BD / 2, z, BY);
  for (const z of [-0.40, 1.20, 2.80, 3.70])            down(BX1 - BD / 2, z, BY);
  // And in the raft.
  for (const x of [-1.35, 1.35]) for (const z of [-1.50, 0.30, 2.10]) down(x, z, RFY, .075);

  // 电梯厅的灯槽 — the long lit panel over the lift approach, hung under the +z bulkhead where you
  // stand still and look up while the car comes down. Nearly two and a half square metres of lit
  // face, so it sits right at the bottom of the glow scale.
  //
  // The surround is a frame of four bars with a hole in it rather than one plate with a lit panel
  // laid on top, because a plate and a panel are two horizontal faces over the same footprint and
  // there is no offset small enough to look flush and large enough not to fight. A hole has no
  // such problem: the lit quad hangs in it and touches nothing.
  const PX = 1.45, PZ2 = 4.45, PW = 4.90, PD = .66, PT = .07, PY = BY - .034;
  const pfr = { hard: true, gloss: .46, ...MAT.metal };
  A.box(PX, PY, PZ2 - PD / 2 + PT / 2, PW, .044, PT, C('#b7bdbf'), pfr);
  A.box(PX, PY, PZ2 + PD / 2 - PT / 2, PW, .044, PT, C('#b7bdbf'), pfr);
  A.box(PX - PW / 2 + PT / 2, PY, PZ2, PT, .044, PD - PT * 2, C('#b7bdbf'), pfr);
  A.box(PX + PW / 2 - PT / 2, PY, PZ2, PT, .044, PD - PT * 2, C('#b7bdbf'), pfr);
  A.ceiling(PX, PY - .006, PZ2, PW - PT * 2, PD - PT * 2, C('#fff6e6'), { gloss: .10, glow: .032 });

  // ---- and the light the room is actually lit by, as opposed to the fittings that show where it
  // comes from. Eight, which is what a room this size wants — see the note in BRIEF.md — spread so
  // that whichever of them the frame loop keeps, no corner of the lobby is left to the ambient.
  A.light(0, Y + 2.60, -2.20, [1.00, .96, .88], .42, 5.4);
  A.light(0, Y + 2.60, 1.40, [1.00, .96, .88], .42, 5.4);
  A.light(-4.90, Y + 2.55, 1.20, [1.00, .95, .86], .34, 4.2);    // the post and the notices
  A.light(4.70, Y + 2.35, -2.20, [1.00, .94, .84], .32, 3.6);    // inside the porter's room
  A.light(5.30, Y + 2.30, 1.40, [1.00, .93, .82], .26, 3.4);     // down the battened wall
  // Well back from the landing. At z 3.40 and .45 this stood two metres from a square metre of
  // steel and burned both leaves out to white paper; at the new depth it can come forward again.
  // ...and further back and weaker again. The shell's landing leaves are `steel` at gloss .34 —
  // world.js already came down from .52 once because "both leaves blew out to white paper" — and
  // a square metre of that facing straight at you is the brightest surface in the room whatever
  // this file does. Measured at the doors: 220 of 255 with the inset panel line no longer visible
  // at all. Half the power and 40 cm further off the face brings them back to steel, and the lit
  // panel in the soffit above is what actually reads as the lift lobby being lit.
  A.light(1.40, Y + 2.50, 3.80, [1.00, .97, .90], .12, 3.2);     // the lift approach
  A.light(-3.60, Y + 2.50, 4.60, [1.00, .96, .88], .28, 3.8);    // the lockers
  A.light(0, Y + 2.28, -4.40, [1.00, .96, .88], .30, 3.0);       // the porch

  // ---- the pools the fittings lay on a polished floor, and the smears that stand in for a
  // reflection in it. Neither is a light: `A.light` above makes surfaces respond, and these draw
  // what a renderer with no global illumination and no mirror pass will never produce on its own.
  // The rule for the smears is the one thing to keep: a reflection is *long in the direction you
  // are looking* and narrow across it, so every one of these is stretched in z under something
  // bright standing on the +z wall, and none of them is round.
  //
  // At .065 on a floor authored near-white these did nothing at all — six per cent added to a
  // surface already at four-fifths of the range is inside the dither. With the field twenty values
  // darker they have somewhere to land, and they carry the whole of what makes the
  // stone read as polished rather than as lino, so they are worth the step up.
  for (const [x, z] of POOL)
    A.glow(M.trs(x, GY, z, 0, 1.34, 1, 1.34), C('#ffe9c4'), .090);
  // And the one long smear that the ceiling raft lays down the middle of the room. Six metres of
  // it, narrow, dead centre: the single brightest thing on this floor and the reason an eye coming
  // in through the porch reads the stone as wet rather than as matt. A reflection of a raft is the
  // shape of the raft, so this is not four metres wide — it is the width the eye sees when it is
  // standing at one end looking down the length of it.
  A.glow(M.trs(0, GY - .002, 0.30, 0, 1.90, 1, 6.40), C('#ffeed2'), .062);
  A.glow(M.trs(0, GY - .004, 0.30, 0, .70, 1, 5.60), C('#fff6e2'), .055);

  // ================================================================ 门斗 the vestibule
  //
  // An airlock, and in a Beijing tower it is always glazed and always inside the line of the wall,
  // because the wall is the building. So this is a glass porch standing 1.1 m into the lobby: the
  // street doors in the shell's opening at z = -5, a slab capping the top of it at 2.50, and a
  // pair of sliding doors at z = -3.92 parked open, which is how they are found nine times in ten.
  //
  // Everything glazed to the street is registered with `A.sky`, so the panes take the colour of
  // the sky outside and the entrance changes with the hour without this file knowing the hour.
  const PZ = -4.94;                       // the street doors' plane
  A.box(0, Y + 2.35, PZ, 3.80, .14, .12, alu, METAL);                 // head
  A.wall(0, Y + 2.52, PZ, 3.80, .20, 0, col.wall, MAT.plaster);       // spandrel up to the shell's 2.62
  for (const s of [-1, 1]) {
    A.box(s * 1.84, Y + 1.14, PZ, .12, 2.28, .12, alu, METAL);        // jambs
    A.box(s * .92, Y + 1.14, PZ, .07, 2.28, .11, alu, METAL);         // mullions
  }
  A.box(0, Y + 1.14, PZ, .06, 2.28, .11, alu, METAL);                 // meeting stile
  for (const [cx, w] of [[-1.3675, .825], [-.46, .85], [.46, .85], [1.3675, .825]])
    A.sky(A.box(cx, Y + 1.16, PZ - .005, w, 2.16, .022, glassC, SKYGL));

  // ---------------------------------------------------------------- 胡同背景, behind the glass
  //
  // The comment over SKYGL said it outright: the street panes carry real body "because there is
  // nothing modelled behind them". So standing in the lift lobby you looked out at a tinted sheet
  // rather than at 杨柳胡同, and the .82 alpha was there to stop you noticing.
  //
  // Seven props, at z = -7.4, seen through the shell's 3.8 m hole in the street wall. The haze
  // card goes on `A.sky`, so js/game.js:12874 repaints it with `dl.glass` every frame and the view
  // out is pale at noon and dark at three in the morning without this file knowing the hour. The
  // masses in front of it are `mode: 1`, the renderer's flat unlit shade — there is no light out
  // there to catch, and a backlit silhouette is the same value at every hour anyway, which is the
  // one case where mode 1 is the truthful answer rather than the cheap one.
  //
  // Nothing here is a collider and nothing is reachable: the porch's own `A.stop` calls close the
  // opening, and this all stands 2.4 m beyond the wall.
  const OUTVIEW = -7.40;                       // the plane 杨柳胡同 stands on, seen from the lobby
  A.sky(A.box(0, Y + 2.60, OUTVIEW, 15.0, 6.40, .04, col.sky,
    { hard: true, mode: 1, glow: .02, tag: 'OUTVIEW' }));
  A.box(0, Y + 1.62, OUTVIEW + .12, 15.0, 3.24, .04, C('#4a4740'),
    { hard: true, mode: 1, tag: 'OUTVIEW' });                                     // the wall opposite
  A.box(-3.10, Y + 2.35, OUTVIEW + .16, 3.60, .70, .04, C('#3c3a35'),
    { hard: true, mode: 1, tag: 'OUTVIEW' });
  A.box(2.90, Y + 2.62, OUTVIEW + .16, 3.20, 1.24, .04, C('#413e39'),
    { hard: true, mode: 1, tag: 'OUTVIEW' });
  A.box(-1.05, Y + 1.05, OUTVIEW + .18, 2.30, .46, .04, C('#7a2f26'),
    { hard: true, mode: 1, tag: 'OUTVIEW' });                                     // an awning
  for (const wx of [-2.10, 1.35])                                    // two lit rooms opposite
    A.box(wx, Y + 1.30, OUTVIEW + .18, .62, .70, .04, C('#c8a86e'),
      { hard: true, mode: 1, glow: .06, tag: 'OUTVIEW' });
  A.flat(0, Y + .01, OUTVIEW + 1.20, 15.0, 2.40, C('#59564e'),
    { mode: 9, gloss: .18, tag: 'OUTVIEW' });                                     // the road
  for (const s of [-1, 1]) {
    A.cap(s * .13, Y + 1.15, PZ + .055, .016, .95, .016, steel, { gloss: .60, ...MAT.metal });
    A.box(s * .46, Y + .16, PZ + .035, .84, .32, .035, aluD, METAL);  // kick plates
  }

  // The two side screens of the porch, and the slab that caps it. Without the cap you look over
  // the top of the glass from four metres away and straight into a box with no lid.
  for (const s of [-1, 1]) {
    // On `A.sky` too. The porch is three panes deep from the lobby — sliding leaf, side screen,
    // street glass — and only the outermost was registered, so at dusk one layer went the colour
    // of the evening and the two in front of it stayed the colour of noon. Interior glass at
    // alpha .16 barely tints anything, which is exactly why leaving it out was easy to miss and
    // costs nothing to fix: three array entries in a loop js/game.js already runs.
    A.sky(A.box(s * 1.86, Y + 1.16, -4.41, .022, 2.16, .94, glassC, GLASS));
    A.box(s * 1.86, Y + 2.32, -4.41, .10, .10, .96, alu, METAL);
    A.box(s * 1.86, Y + 1.14, -3.94, .10, 2.28, .10, alu, METAL);
    A.stop(s * 1.86 - .06, s * 1.86 + .06, -4.98, -3.88);
  }
  A.box(0, Y + 2.46, -4.46, 3.84, .08, 1.10, C('#e6e0d3'), { hard: true, gloss: .10, ...MAT.plaster });

  // The sliding pair, parked open — a 1.84 m gap you walk straight through, with the leaves stood
  // off to the sides where the sensor leaves them.
  A.box(0, Y + 2.30, -3.92, 3.80, .24, .16, alu, METAL);              // header
  A.box(0, Y + 2.16, -3.92, 3.60, .05, .12, aluD, METAL);             // track
  for (const s of [-1, 1]) {
    const cx = s * 1.40;
    for (const t of [-1, 1]) A.box(cx + t * .445, Y + 1.07, -3.92, .06, 2.12, .05, alu, METAL);
    A.box(cx, Y + 2.08, -3.92, .95, .10, .05, alu, METAL);
    A.box(cx, Y + .12, -3.92, .95, .24, .05, aluD, METAL);
    A.sky(A.box(cx, Y + 1.13, -3.92, .83, 1.80, .022, glassC, GLASS));
    A.stop(cx - .50, cx + .50, -3.99, -3.85);
  }
  // The building's own name, on the porch side of the header, where you read it walking in.
  //
  // ---- and the rule every piece of signwriting in this file now follows, which is worth stating
  // once here because there are eleven of them. The characters are `mode: 1` with **no glow**; the
  // plate behind them keeps whatever glow it had. mode 1 is the renderer's flat unlit shade, so
  // gold on red reads at full strength whether the lamps are on or not — but `glow` is what writes
  // a pixel into the post chain's light mask, and every character is its own quad. Signed the
  // other way round, the eleven signs in this room put fifty-five small emitters into the frame:
  // individually invisible, and blurred together by the bloom into a half-transparent copy of the
  // lobby laid over the whole shot. That was measured on the second floor's corridor, not guessed
  // — see the note over `exitSign` in js/home-corridor.js — and the lobby is the room with the
  // most signwriting in the building.
  A.box(0, Y + 2.30, -3.995, 1.98, .19, .03, red, { hard: true, gloss: .16 });
  // The header names the unit as well as the block. Every 单元门 in the city has its own number on
  // it and the lobby glosses 单元门 as a word the player is expected to know, so the plate has to
  // be the place they read it. Eleven characters on a 1.98 m board, so the size comes down.
  A.glyph(0, Y + 2.30, -4.012, Math.PI, '杨柳胡同十八号楼二单元',
    { size: .105, color: gold, mode: 1, gloss: .18 });
  // And on the lobby side, the line every one of these headers has on it.
  A.glyph(0, Y + 2.30, -3.828, 0, '出入请随手关门', { size: .095, color: C('#4a4438') });

  // 春联 either side of the inner doors. Every 单元门 in the city carries a pair from the new year
  // until the paper gives up, and the two halves are a couplet.
  //
  // Printed on both faces, which real paper is not. The camera crosses this door twice a day and
  // sees it from both sides: walking in, the eye is out in the porch and the couplet's back is all
  // there is; standing in the lobby it is the other way round. One blank red slab in either shot
  // is worse than a couplet that is legible from the wrong side, and nobody has ever noticed the
  // second one is not reversed.
  for (const [s, line] of [[-1, '出入平安如意'], [1, '四季财源广进']]) {
    A.box(s * 1.955, Y + 1.36, -3.845, .175, 1.34, .020, C('#b8332a'), { hard: true, gloss: .12 });
    A.glyph(s * 1.955, Y + 1.36, -3.835, 0, line,
      { size: .108, color: C('#f2d98c'), vertical: true, gloss: .10 });
    A.glyph(s * 1.955, Y + 1.36, -3.855, Math.PI, line,
      { size: .108, color: C('#f2d98c'), vertical: true, gloss: .10 });
  }

  // 门禁, on the jamb of the sliding doors, inside the porch where you would actually reach it.
  A.box(1.60, Y + 1.15, -3.980, .11, .17, .05, C('#3a4046'), { hard: true, gloss: .34 });
  A.box(1.60, Y + 1.17, -4.008, .07, .07, .012, C('#59d18a'), { hard: true, mode: 1, glow: .18 });
  A.box(1.60, Y + 1.09, -4.006, .045, .012, .010, C('#d9d4c8'), { hard: true });
  A.th('门禁', 1.60, Y + 1.52, -3.98, '刷卡才能进楼。', 'You need the card to get into the building.',
    '门禁 is the entry system on a building door; 刷卡 is to swipe the card.',
    { focus: [1.60, -3.52], reach: 1.5 });

  // Matting: the dark rubber inside the street doors, and the red mat inside the sliding ones.
  A.flat(0, IY, -4.42, 3.56, .90, C('#3a3a38'),
    { mode: 7, gloss: .06, mat: 'fabric', matScale: .42, matAmt: .28, nrmAmt: .30 });
  A.flat(0, IY, -3.52, 2.10, .74, C('#7a2f26'),
    { mode: 7, gloss: .08, mat: 'fabric', matScale: .34, matAmt: .30, nrmAmt: .30 });
  A.flatText(0, IY + .012, -3.52, Math.PI, '欢迎回家', { size: .19, color: C('#e6d2a4') });
  // Daylight coming in off the street and lying on the stone inside the doors. Cool, because the
  // sky is, and much wider than it is deep, because the opening is.
  A.glow(M.trs(0, GY, -3.30, 0, 3.30, 1, 1.46), C('#dbe6ee'), .098);

  // Stepping outside is 出门, and it is the same word and the same verb it has always been at the
  // flat's own door: `USE['门']` in js/data.js carries `go:'street'`. This is simply the door the
  // building has, three metres below the one the flat has.
  A.th('门', 0, Y + 1.34, -4.62, '出门去胡同里。', 'Out into the hutong.',
    '门 is a door or a gate. 出门 is to go out; 单元门 is a building\'s own entrance door.',
    { focus: [0, -4.05], reach: 2.1 });

  // A pair of planters flanking the way in, which is where every one of these buildings puts them.
  for (const s of [-1, 1]) {
    A.cyl(s * 2.34, Y + .21, -3.72, .21, .42, C('#8d7d63'), { gloss: .26, ...MAT.slab });
    A.cyl(s * 2.34, Y + .43, -3.72, .225, .05, C('#a3927a'), { gloss: .30 });
    A.cyl(s * 2.34, Y + .445, -3.72, .195, .03, C('#3a2c22'), { gloss: .05 });
    for (let i = 0; i < 5; i++) {
      const a = i * 1.257 + s * .4;
      A.ball(s * 2.34 + Math.cos(a) * .11, Y + .60 + (i % 3) * .075, -3.72 + Math.sin(a) * .11,
        .13, .10, .13, i % 2 ? col.plant : col.plantD, { gloss: .16, ry: a });
    }
    A.shade(s * 2.34, -3.72, .62, .62, .58, SY);
    A.stop(s * 2.34 - .26, s * 2.34 + .26, -3.98, -3.46);
  }

  // 伞架 — the umbrella stand inside the inner doors, which in a city where it rains sideways for
  // a fortnight in July is not an ornament. A wire basket, a drip tray under it, and three
  // umbrellas nobody has come back for.
  A.cyl(-2.95, Y + .012, -3.15, .24, .024, C('#6a7075'), { gloss: .40, ...MAT.metal });
  for (const dy of [.16, .40, .58])
    A.cyl(-2.95, Y + dy, -3.15, .195, .022, C('#8b9196'), { gloss: .52, ...MAT.metal });
  for (let i = 0; i < 10; i++)
    A.cap(-2.95 + Math.cos(i * .628) * .19, Y + .34, -3.15 + Math.sin(i * .628) * .19,
      .010, .64, .010, C('#8b9196'), { gloss: .52 });
  for (const [a, c] of [[0.5, col.navy], [2.4, C('#4a4f55')], [4.4, C('#7d3b34')]]) {
    const ux = -2.95 + Math.cos(a) * .10, uz = -3.15 + Math.sin(a) * .10;
    A.cap(ux, Y + .40, uz, .028, .76, .028, c, { gloss: .22, rz: Math.cos(a) * .09 });
    A.cap(ux + Math.cos(a) * .04, Y + .82, uz, .014, .16, .014, col.woodD,
      { gloss: .26, rz: Math.cos(a) * .09 });
  }
  A.shade(-2.95, -3.15, .60, .60, .56, SY);
  A.stop(-3.17, -2.73, -3.37, -2.93);

  // ================================================================ 门卫室 the porter's room
  //
  // The one thing a Western lobby has no equivalent of. A glazed room by the door, occupied all
  // day, with a counter you talk across and a hatch in the glass to pass a parcel through. The
  // room is x 3.60..6.00, z -3.40..-1.00; the counter runs the length of its glazed side and
  // stands 34 cm into the lobby, which is what makes it a counter and not a window.
  const GX = 3.60, GZ0 = -3.40, GZ1 = -1.00, GZC = (GZ0 + GZ1) / 2, GZL = GZ1 - GZ0;
  A.box(GX, Y + .51, GZC, .12, 1.02, GZL, col.woodD, TIMBER);                 // counter base
  A.box(GX - .14, Y + 1.06, GZC, .40, .08, GZL, stoneC, SLAB);                // counter top
  // The counter's own dark plinth and the shadow under it — two and a half metres of joinery
  // standing on polished stone with nothing at its foot is the single most obvious thing in this
  // room that was floating.
  A.box(GX - .02, Y + .045, GZC, .16, .09, GZL - .04, C('#3b342c'), { hard: true, gloss: .26 });
  A.shade(GX - .12, GZC, .58, GZL + .10, .52, SY);
  A.box(GX - .14, Y + 1.005, GZC, .36, .03, GZL - .06, C('#7b7266'), { hard: true, gloss: .20 });
  A.box(GX, Y + (2.38 + H) / 2, GZC, .10, H - 2.38, GZL, col.wall, PLAST);
  A.box(GX, Y + 2.34, GZC, .10, .08, GZL, alu, METAL);                        // head rail
  // A lit reveal under the nose of the counter, which is what makes the light in a porter's room
  // reach the lobby side of the glass rather than stopping at it.
  A.box(GX - .30, Y + .965, GZC, .10, .028, GZL - .10, C('#ffeec9'),
    { hard: true, mode: 1, glow: .07 });
  // Glazing either side of a 70 cm hatch. The hatch is simply not glazed: it is the hole you are
  // spoken to through.
  for (const cz of [-2.975, -1.425])
    A.box(GX, Y + 1.70, cz, .022, 1.20, .85, glassC, GLASS);
  for (const cz of [GZ0 + .03, -2.55, -1.85, GZ1 - .03])
    A.box(GX, Y + 1.70, cz, .06, 1.20, .06, alu, METAL);
  // The sign over the glass. Red plate, gold characters, both standing clear of the plaster.
  A.box(GX - .07, Y + 2.62, GZC + .30, .04, .30, 1.16, red, { hard: true, gloss: .16 });
  A.glyph(GX - .102, Y + 2.62, GZC + .30, -Math.PI / 2, '门卫室',
    { size: .185, color: gold, mode: 1, gloss: .18 });

  // The far end of the room, which is a wall and not the 1.6 m of nothing it was: the shell's
  // street wall is at z -5.0 and the booth stops at -3.40, so from anywhere but dead ahead you
  // looked straight out of the back of it.
  A.box(4.80, Y + H / 2, GZ0, 2.40, H, .10, col.wall, PLAST);
  // The room's other side, facing the entrance, with the porter's own door in it.
  A.box(4.325, Y + H / 2, GZ1, 1.45, H, .10, col.wall, PLAST);
  A.box(5.975, Y + H / 2, GZ1, .05, H, .10, col.wall, PLAST);
  A.box(5.50, Y + (2.05 + H) / 2, GZ1, .90, H - 2.05, .10, col.wall, PLAST);
  A.box(5.50, Y + 1.02, GZ1 + .04, .88, 2.04, .045, col.woodM, TIMBER);
  A.box(5.50, Y + 1.62, GZ1 + .075, .30, .40, .020, glassC, GLASS);
  A.cyl(5.14, Y + 1.02, GZ1 + .085, .022, .11, steel, { gloss: .60, rz: Math.PI / 2 });

  // Inside: a suspended ceiling low enough to read as a room within the room, a floor of its own
  // in a small tile rather than the lobby's slabs, a desk along the glass, and the things that say
  // somebody works here — the tea, the log, the fan, the coat.
  A.flat(4.82, IY, -2.20, 2.28, 2.28, C('#c6c2b6'),
    { mode: 0, gloss: .30, mat: 'tile', matScale: .34, matAmt: .26, nrmAmt: .28 });
  A.ceiling(4.83, Y + 2.55, -2.225, 2.34, 2.35, C('#eae4d6'), { gloss: .08, glow: .02 });
  A.box(4.83, Y + 2.50, -2.20, 1.10, .05, .50, C('#fff6e2'), { hard: true, mode: 1, glow: .10 });
  A.box(4.25, Y + .37, -2.25, .60, .74, 2.10, col.woodM, TIMBER);
  A.box(4.25, Y + .755, -2.25, .66, .05, 2.16, col.woodL, TIMBER);
  for (const cz of [-2.75, -1.75]) {                                          // the monitors
    A.box(4.28, Y + 1.02, cz, .05, .40, .58, C('#22262a'), { hard: true, gloss: .34 });
    A.box(4.312, Y + 1.02, cz, .012, .34, .52, C('#3f6479'), { hard: true, mode: 1, glow: .08 });
    A.box(4.30, Y + .79, cz, .10, .06, .16, C('#2b3034'), { hard: true, gloss: .30 });
  }
  A.cyl(4.42, Y + .865, -1.55, .038, .21, red, { gloss: .34 });               // the 保温杯
  A.cyl(4.42, Y + .985, -1.55, .034, .04, C('#2f3438'), { gloss: .40 });
  A.cyl(4.40, Y + .810, -2.98, .046, .10, C('#e9e3d4'), { gloss: .28 });      // and the tea
  A.cyl(4.40, Y + .866, -2.98, .043, .012, C('#8a6b3c'), { gloss: .22 });
  A.box(4.36, Y + .788, -2.32, .24, .015, .32, paperR, { hard: true, ry: .14 });
  A.box(4.36, Y + .800, -2.32, .21, .012, .29, col.white, { hard: true, ry: .14 });
  // A desk fan, which every one of these rooms has whatever the month is.
  A.cyl(4.36, Y + .795, -1.20, .075, .02, C('#5b6167'), { gloss: .40 });
  A.cap(4.36, Y + .90, -1.20, .012, .22, .012, C('#5b6167'), { gloss: .45 });
  A.cyl(4.36, Y + 1.03, -1.20, .105, .05, C('#c8cdd0'), { gloss: .38, rz: Math.PI / 2 });
  // The swivel chair. It used to be "pushed back and turned away, and a jacket over the back of
  // it" — staging that only reads as *stepped out for a minute* while there is nobody who could
  // step back in, and nobody could: `grep -rn "place: 'home'" js/` finds one character in this
  // whole building and it is the courier. So it is square to the desk now and drawn up to it, at
  // x 4.86 facing -x toward the counter, which is the seat a 保安 is put into rather than the seat
  // he has just left. His roster row is queued for lane 2 (item 76) and the rig is lane 8's.
  //
  // The jacket stays on the back of the chair, and stays there when he arrives. A guard's tunic
  // over his own chair is what every one of these rooms has whether the man is in it or not, and
  // it is the wrong thing to model twice — once here and once on the figure.
  A.cyl(4.86, Y + .030, -2.15, .28, .05, C('#3f4449'), { gloss: .34 });
  A.cyl(4.86, Y + .240, -2.15, .045, .44, C('#5b6167'), { gloss: .50 });
  A.box(4.86, Y + .470, -2.15, .46, .09, .44, col.charcoal, CLOTH);
  A.box(5.08, Y + .755, -2.15, .07, .48, .42, col.charcoal, CLOTH);
  A.box(5.04, Y + .800, -2.15, .06, .40, .40, col.navy, CLOTH);
  A.shade(4.86, -2.15, .66, .66, .52, SY);
  // ---- the porter's hours
  //
  // The 门卫室 interactable claims 门卫室的师傅一天到晚都在, which is a sentence the room could not
  // honour either way: nothing in here knew what time it was. The desk lamp is the whole of the
  // night reading — a 保安 behind the glass at three in the morning with one lamp on, and the
  // room's own daytime tube dark. `A.timed` costs nothing per frame: js/world.js applies it on the
  // frames where the hour changes, which is twice a game-day.
  //
  //   HOURS 18–07   the desk lamp        HOURS 07–18   the fluorescent overhead
  A.cyl(4.30, Y + .830, -1.72, .075, .022, C('#4b5155'), { gloss: .40 });        // lamp base
  A.cap(4.30, Y + .93, -1.72, .011, .20, .011, C('#4b5155'), { gloss: .45 });
  A.timed(A.box(4.30, Y + 1.045, -1.72, .17, .05, .17, C('#ffeec9'),
    { hard: true, mode: 1, glow: 0 }), 18, 7, { on: .30, off: .02 });
  A.timed(A.box(4.80, Y + 2.30, -2.15, 1.10, .05, .16, C('#f4f2e8'),
    { hard: true, mode: 1, glow: 0 }), 7, 18, { on: .22, off: .01 });
  // The duty board on the back wall, which is the wall of the building.
  A.box(5.90, Y + 1.90, -2.70, .04, .52, .74, boardW, { hard: true, gloss: .20 });
  A.box(5.88, Y + 2.11, -2.70, .02, .12, .74, red, { hard: true, gloss: .18 });
  A.glyph(5.865, Y + 2.11, -2.70, -Math.PI / 2, '值班表', { size: .085, color: C('#f6e3b4') });
  for (let i = 0; i < 4; i++)
    A.box(5.875, Y + 1.90 - i * .105, -2.70, .008, .012, .60, C('#9a958c'), { hard: true });
  // The room's light, reaching the lobby: through the hatch and along the stone in front of it.
  A.glow(M.trs(3.18, GY, GZC, 0, 1.42, 1, 2.60), C('#ffdfa4'), .100);

  A.stop(3.24, 6.02, -3.46, -0.94);
  A.th('门卫室', GX - .30, Y + 1.55, -2.20, '门卫室的师傅一天到晚都在。',
    'The porter is in his room from morning to night.',
    '门卫室 is the porter\'s room by the door; 保安 is the guard himself.',
    { focus: [3.00, -2.20], reach: 1.7 });

  // ================================================================ the battened wall
  //
  // Four and a half metres of blank plaster on the +x side between the porter's door and the
  // mirror, which is the longest wall in the room you walk right past and the one thing in here
  // that was doing nothing at eye level. A dark recess with slim timber battens across it, warm
  // light in the slots top and bottom: the finish every lobby in this city put in some time in
  // the last ten years, and the cheapest way to give a wall a depth you can read at two metres.
  //
  // Set behind the dado cap rather than in front of it. The cap's face is at 5.900; the battens
  // stand at 5.910, so the cap reads as a shelf the whole run sits on.
  const WZ0 = -0.88, WZ1 = 3.36;
  A.box(5.978, Y + 1.90, (WZ0 + WZ1) / 2, .044, 1.52, WZ1 - WZ0, C('#332e27'),
    { hard: true, gloss: .14 });
  for (const dy of [1.22, 2.58])
    A.box(5.968, Y + dy, (WZ0 + WZ1) / 2, .020, .055, WZ1 - WZ0 - .06, C('#ffdda6'),
      { hard: true, mode: 1, glow: .05 });
  for (let z = WZ0 + .09; z < WZ1 - .05; z += .158)
    A.box(5.938, Y + 1.89, z, .056, 1.46, .055, (z * 7 | 0) % 3 ? col.woodM : col.woodL,
      { hard: true, gloss: .22, ...MAT.timber });
  // A stainless head and foot to stop the run, and the community's own line on it.
  for (const dy of [1.135, 2.665])
    A.box(5.950, Y + dy, (WZ0 + WZ1) / 2, .075, .030, WZ1 - WZ0 + .04, C('#9aa1a5'),
      { hard: true, gloss: .55, ...MAT.metal });
  A.box(5.880, Y + 1.94, 1.24, .022, .46, 1.34, C('#2c2822'), { hard: true, gloss: .30 });
  A.glyph(5.866, Y + 2.06, 1.24, -Math.PI / 2, '杨柳社区 · 十八号楼',
    { size: .105, color: C('#e8cf94'), mode: 1, gloss: .16 });
  A.glyph(5.866, Y + 1.86, 1.24, -Math.PI / 2, '远亲不如近邻',
    { size: .070, color: C('#b8ac93') });

  // ================================================================ 信箱 the letterbox wall
  //
  // Forty doors, which is a small block by the standards of this city and still forty. Laid out
  // from the wall outward: backing at 7 cm, doors at 7.4..10.2 cm, slots and locks past that, so
  // no two faces in the bank share a plane.
  const MZ = -0.20, MW = 2.80;
  A.box(-5.965, Y + 1.44, MZ, .07, 1.10, MW + .04, C('#4a5054'),
    { hard: true, gloss: .30, ...MAT.metal });
  A.box(-5.955, Y + 2.14, MZ, .09, .28, MW + .04, red, { hard: true, gloss: .18 });
  A.glyph(-5.898, Y + 2.14, MZ + 1.14, Math.PI / 2, '信箱',
    { size: .165, color: gold, mode: 1, gloss: .18 });
  A.glyph(-5.898, Y + 2.14, MZ - .55, Math.PI / 2, '二层至十一层 共六十户',
    { size: .070, color: C('#f0dcb4') });
  // ---- one door per flat, and one of them yours
  //
  // It was five rows of eight, forty doors, labelled 一至四十号: a bank of anonymous steel with no
  // relationship to the building behind it. The tower has ten residential decks of six flats
  // (js/home-corridor.js builds 201..206 and the directory at the lift says 二层至十一层 住户), so
  // the bank is 10 columns of 6 — a column per storey, a row per flat on it, sixty doors, and the
  // second door of the first column is 202.
  //
  // Two props per door instead of three: sixty doors at the old three would have been 180 props on
  // a wall that had 120. The lock is now the same box as the slot, one row lower, which is what it
  // reads as at any distance you can stand at.
  const MC = 10, MR = 6;                            // decks 2..11, flats x01..x06
  const MPZ = MW / MC, MPY = .17;
  const boxAt = (r, c) => [Y + 1.865 - r * MPY, MZ - MW / 2 + (c + .5) * MPZ];
  for (let c = 0; c < MC; c++) {
    // The storey over each column, which is how you find your own door on one of these.
    A.glyph(-5.898, Y + 1.985, MZ - MW / 2 + (c + .5) * MPZ, Math.PI / 2,
      ['二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'][c],
      { size: .048, color: C('#8f9295'), gloss: .10 });
    for (let r = 0; r < MR; r++) {
      const [dy, dz] = boxAt(r, c);
      const mine = c === 0 && r === 1;              // 202
      A.box(-5.912, dy, dz, .028, .150, .265, mine ? C('#c9ccc6') : C('#b9bec0'),
        { hard: true, gloss: .44, ...MAT.metal });
      A.box(-5.897, dy + .044, dz, .006, .010, .170, C('#2c3033'), { hard: true });
    }
  }
  // 202. A red flat-number tag on the door and the corner of something in the slot, which between
  // them are the whole of "this one is mine" on a wall of sixty identical steel flaps.
  {
    const [dy, dz] = boxAt(1, 0);
    A.box(-5.896, dy - .038, dz, .008, .052, .105, C('#a8352a'), { hard: true, gloss: .20 });
    A.glyph(-5.890, dy - .038, dz, Math.PI / 2, '202',
      { size: .034, gap: .006, color: C('#f4efe2'), gloss: .08 });
    A.box(-5.880, dy + .050, dz - .02, .034, .009, .110, col.white, { hard: true, rz: .10 });
  }
  A.box(-5.900, Y + .860, MZ, .16, .04, MW + .04, stoneC, SLAB);              // the ledge under it
  // Two other flats have not emptied theirs either.
  for (const [r, c] of [[3, 2], [0, 7]]) {
    const [dy, dz] = boxAt(r, c);
    A.box(-5.880, dy + .050, dz - .02, .034, .009, .110, col.white, { hard: true, rz: .10 });
  }
  A.stop(-6.03, -5.85, MZ - MW / 2 - .06, MZ + MW / 2 + .06);
  A.th('信箱', -5.72, Y + 1.62, MZ, '我看看有没有信。', 'Let me see whether there is any post.',
    '信 is a letter and 箱 is a box. 信箱 is also the word for an email address.',
    { focus: [-5.05, MZ], reach: 1.6 });
  // The bank is a wall of brushed steel with a lamp on it, and a polished floor under a wall of
  // brushed steel does not stay dark. Long in z, narrow in x, because that is the shape a
  // reflection of a wall is.
  A.glow(M.trs(-5.35, GY, MZ, 0, .84, 1, MW), C('#d7dee0'), .076);

  // ================================================================ 楼层表 the floor directory
  //
  // The lift's car panel was the only map of this building, which meant the one place you could
  // read the tower was a place you had already decided where to go. The lobby is the wayfinding
  // anchor and this is the board that makes it one.
  //
  // It sits in the 0.60 m of wall between the letterbox bank (z ..1.20) and the 通知栏 (z 1.80..),
  // which is the only clear run left on this wall and is why it is a tall narrow board rather
  // than a wide one — that being the shape a floor list wants anyway.
  //
  // **The twelve rows are a numeral and a rule, not twelve lines of text.** Each occupied line
  // would be four or five glyph quads, so the list as geometry is ~60 props for something read
  // at two metres; the tenancy of each storey is in the interaction card instead, where it costs
  // nothing and can be read. That is the standing "UI is cheaper than geometry" rule and this is
  // the shape it takes on a sign.
  {
    const DZ = 1.50, DW = .52, DY = Y + 1.575;
    A.box(-5.968, DY, DZ, .056, 1.16, DW, boardW, { hard: true, gloss: .14 });
    A.box(-5.940, DY + .655, DZ, .078, .17, DW + .03, red, { hard: true, gloss: .18 });
    A.glyph(-5.895, DY + .655, DZ, Math.PI / 2, '楼层表',
      { size: .092, color: gold, mode: 1, gloss: .18 });
    // Deck 2 is the flat, so its row is the one picked out — the same "this one is mine" the
    // letterbox wall does with 202, and the only reason a directory is worth reading twice.
    for (let i = 0; i < 12; i++) {
      const ry = DY + .455 - i * .088, floor = i + 1, mine = floor === 2;
      A.glyph(-5.930, ry, DZ - DW / 2 + .085, Math.PI / 2,
        ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][i],
        { size: .046, color: mine ? C('#a8352a') : C('#4a4640'), gloss: .08 });
      A.box(-5.933, ry, DZ + .085, .006, .010, DW - .29,
        mine ? C('#a8352a') : C('#9a958c'), { hard: true });
    }
    A.th('楼层表', -5.60, DY + .20, DZ, '一楼是门厅，二楼往上都是住户。',
      'The ground floor is the entrance hall; everything from the second floor up is flats.',
      '楼层 is a storey and 表 is a table or list, so 楼层表 is the floor directory by the door. ' +
      '一楼 门厅、门卫室、信箱、快递柜；二楼到十一楼 住户，一层六户；十二楼 天台。',
      { focus: [-5.00, DZ], reach: 1.6 });
  }

  // ================================================================ 电表箱 the meter bank
  //
  // The two and a half metres of -x wall between the letterboxes and the corner was the last thing
  // in this room doing nothing, and what goes there in a Beijing block is not a picture: it is the
  // electricity meters for the flats on this stack, in a grey steel case with a yellow triangle on
  // it. Nobody looks at it and everybody would notice its absence.
  //
  // Four layers off the wall, all of them clear of each other and of the dado below: carcass to
  // 14 cm, doors at 14.6..17.4, windows at 17.9..19.6, print at 20.2.
  const EZ = -2.55, EW = 1.62;
  A.box(-5.930, Y + 1.625, EZ, .140, .86, EW, C('#9aa1a5'),
    { hard: true, gloss: .38, ...MAT.metal });
  A.box(-5.930, Y + 2.085, EZ, .150, .06, EW + .03, C('#7b8286'), { hard: true, gloss: .44 });
  for (let c = 0; c < 4; c++) {
    const dz = EZ - EW / 2 + (c + .5) * (EW / 4);
    A.box(-5.860, Y + 1.615, dz, .028, .78, EW / 4 - .035, C('#b6bcc0'),
      { hard: true, gloss: .40, ...MAT.metal });
    A.box(-5.845, Y + 1.615, dz - EW / 8 + .050, .012, .10, .022, C('#6b7276'),
      { hard: true, gloss: .50 });                                  // the hasp
    for (const dy of [1.83, 1.55]) {                                // two meters a door
      A.box(-5.828, Y + dy, dz, .017, .17, .27, C('#2a3034'), { hard: true, gloss: .36 });
      A.box(-5.812, Y + dy + .020, dz, .012, .075, .21, C('#1d5b52'),
        { hard: true, mode: 1, glow: .05 });
      A.box(-5.806, Y + dy - .055, dz, .008, .014, .16, C('#8f969a'), { hard: true });
    }
  }
  A.box(-5.848, Y + 2.085, EZ - EW / 2 + .34, .020, .05, .62, C('#c9a227'),
    { hard: true, gloss: .22 });
  A.glyph(-5.836, Y + 2.085, EZ - EW / 2 + .34, Math.PI / 2, '当心触电',
    { size: .042, color: C('#2c2a22') });
  A.glyph(-5.848, Y + 2.085, EZ + EW / 2 - .30, Math.PI / 2, '电表箱',
    { size: .062, color: C('#e6ebee'), gloss: .16 });
  A.stop(-6.03, -5.79, EZ - EW / 2 - .05, EZ + EW / 2 + .05);
  A.th('电表', -5.66, Y + 1.72, EZ, '电表箱在楼道里，一家一个。',
    'The meter cupboard is in the lobby, one meter per flat.',
    '电 electricity + 表 a gauge. 抄表 is to read the meter; 电费 is the bill.',
    { focus: [-5.00, EZ], reach: 1.6 });

  // ================================================================ 快递柜 the parcel lockers
  //
  // Universal here, and the reason is upstream of this room: the courier does not come up. He
  // loads the back of this cabinet, the flat is sent a code, and the parcel waits in a steel box
  // in the lobby. It stands against the far wall to the left of the lifts, which is the stretch of
  // wall that is otherwise doing nothing.
  // `LZ` is the carcass centre and `LF` its front face; every depth below is written off LF, so
  // the whole bank moves with the back wall rather than with a number typed forty times.
  const LX = -3.40, LW = 3.60, LZ = Z1 - .24, LF = LZ - .24, HF = LZ - .20;
  A.box(LX, Y + .95, LZ, LW, 1.90, .48, C('#c9ccc7'), { hard: true, gloss: .34, ...MAT.metal });
  A.box(LX, Y + .045, LZ + .03, LW - .02, .09, .42, C('#5c6165'), { hard: true, gloss: .30 });
  A.box(LX, Y + 2.03, LZ + .02, LW, .26, .44, lockG, { hard: true, gloss: .26 });
  A.glyph(LX - 1.05, Y + 2.03, HF - .015, Math.PI, '社区快递柜',
    { size: .155, color: C('#f2f6f1'), mode: 1, gloss: .18 });
  A.glyph(LX + 1.02, Y + 2.03, HF - .015, Math.PI, '自助存取', { size: .105, color: C('#bfe0cf') });
  // The control module, which is the only part of this cabinet anybody touches.
  A.box(LX, Y + 1.42, LF - .015, .44, .58, .03, C('#1d2a2e'), { hard: true, gloss: .40 });
  A.box(LX, Y + 1.42, LF - .034, .40, .52, .012, C('#2f6f8c'), { hard: true, mode: 1, glow: .10 });
  A.glyph(LX, Y + 1.55, LF - .046, Math.PI, '请输入取件码',
    { size: .050, color: C('#e2f0f6'), mode: 1, gloss: .20 });
  A.glyph(LX, Y + 1.34, LF - .046, Math.PI, '取件 · 寄件', { size: .046, color: C('#bcd8e4') });
  A.box(LX, Y + 1.00, LF - .020, .32, .36, .025, C('#3a4247'), { hard: true, gloss: .36 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++)
    A.box(LX - .10 + c * .10, Y + 1.13 - r * .085, LF - .036, .072, .060, .012,
      C('#59626a'), { hard: true, gloss: .42 });
  A.box(LX, Y + .780, LF - .022, .16, .10, .022, C('#26303a'), { hard: true, mode: 1, glow: .07 });
  A.ball(LX + .16, Y + 1.76, LF - .024, .022, .022, .016, C('#20262a'), { gloss: .70 });
  // The doors. Four columns of five, in the mixed sizes these cabinets are actually built in. A
  // dark shadow line round every one of them: the pass before this had white doors on a white
  // carcass and the whole bank resolved to one blank panel with a screen in the middle of it.
  //
  // And a lamp on each door, which is the other half of why a bank of these reads as a machine
  // rather than as twenty white rectangles: dark on an empty box, green on a loaded one. Four of
  // the twenty are loaded — the pattern is written out as a list of two integers rather than
  // derived from an expression, because an index into a colour array that turns out not to be a
  // whole number is how this project has taken itself down before, and `[col, row]` pairs cannot.
  const DOORH = [.22, .22, .30, .42, .55];
  const LOADED = [[0, 3], [1, 0], [2, 4], [3, 1]];
  for (const [ci, cx] of [-4.80, -4.10, -2.70, -2.00].entries()) {
    let y = Y + .095;
    for (const [ri, h] of DOORH.entries()) {
      const cy = y + h / 2;
      A.box(cx, cy, LF - .006, .672, h - .008, .016, C('#7f8580'), { hard: true, gloss: .28 });
      A.box(cx, cy, LF - .026, .655, h - .034, .026, C('#e7eae4'),
        { hard: true, gloss: .36, ...MAT.metal });
      A.box(cx + .265, cy, LF - .046, .05, Math.min(.12, h - .08), .018, C('#98a0a4'),
        { hard: true, gloss: .50 });
      A.box(cx - .255, cy + h / 2 - .075, LF - .044, .11, .046, .012, C('#7c8489'),
        { hard: true, gloss: .30 });
      const lit = LOADED.some(([a, b]) => a === ci && b === ri);
      A.box(cx - .255, cy + h / 2 - .075, LF - .052, .022, .020, .010,
        lit ? C('#63e39a') : C('#2b3134'),
        lit ? { hard: true, mode: 1, glow: .06 } : { hard: true, gloss: .40 });
      y += h + .025;
    }
  }
  A.shade(LX, LF - .10, LW + .10, .66, .58, SY);
  A.stop(LX - LW / 2 - .05, LX + LW / 2 + .05, LF - .08, LZ + .26);
  A.th('快递柜', LX, Y + 1.90, LF - .16, '我的快递在柜子里。', 'My parcel is in the locker.',
    '快 fast + 递 to deliver. The code you are sent to open it is the 取件码.',
    { focus: [LX, LF - .70], reach: 1.7 });
  // The screen, in the floor. Cold, because it is, and only as wide as the module itself.
  A.glow(M.trs(LX, GY, LF - .90, 0, .74, 1, 1.56), C('#a8d3e6'), .088);

  // Overflow on the floor beside it, because there always is. Three boxes and a strip of tape.
  // The middle one is the one that becomes yours — see `A.parcel` under the interactable below.
  let mineCrate = null;
  for (const [ox, oy, oz, w, h, d, r] of [[-1.28, .17, LZ - .14, .46, .34, .38, .10],
                                          [-1.22, .46, LZ - .16, .40, .24, .34, -.16],
                                          [-1.34, .13, LZ - .56, .34, .26, .30, .26]]) {
    const p = A.box(ox, Y + oy, oz, w, h, d, C('#b08a5c'),
      { hard: true, gloss: .10, ry: r, ...MAT.slab });
    if (oy === .46) mineCrate = p;
    A.box(ox, Y + oy + h / 2 + .003, oz, .06, .006, d + .01, C('#d8cbb2'), { hard: true, ry: r });
  }
  A.shade(-1.28, LZ - .31, .84, .94, .58, SY);
  // And the courier's own sack barrow, stood on end against the wall in the corner where it lives
  // between rounds. Two uprights, a toe plate, a cross handle and two wheels is the whole of one.
  for (const s of [-1, 1]) {
    A.cap(-5.62 + s * .16, Y + .52, 5.18, .019, 1.02, .019, C('#8f4d34'),
      { gloss: .30, rz: .09 * s, ...MAT.metal });
    A.cyl(-5.66 + s * .17, Y + .105, 5.36, .105, .05, C('#2c3033'),
      { gloss: .24, rz: Math.PI / 2 });
  }
  A.box(-5.62, Y + .06, 5.05, .40, .022, .22, C('#9a5238'), { hard: true, gloss: .30, ...MAT.metal });
  for (const dy of [.44, .96])
    A.box(-5.62, Y + dy, 5.19, .38, .026, .026, C('#8f4d34'), { hard: true, gloss: .30 });
  A.box(-5.62, Y + .70, 5.21, .30, .46, .022, C('#c9c3b4'), { hard: true, gloss: .16, ...MAT.slab });
  A.shade(-5.62, 5.22, .58, .54, .52, SY);
  A.stop(-5.86, -5.38, 4.96, 5.46);
  // The pile said 这几个包裹是别人的 unconditionally, forever — including ten minutes after you
  // ordered something, which is the one moment a player looks at it. It answers for its own state
  // now: `A.parcel` registers the sentence and the crate with the shell, and js/game.js flips both
  // through `World.setParcel(mine)` when `courier.here` fires. Queued for lane 2 as item 84; until
  // that call lands the pile reads exactly as it did before, which is the correct default.
  A.parcel(
    A.th('包裹', -1.28, Y + .96, LZ - .46, '这几个包裹是别人的。',
      'These parcels belong to somebody else.',
      '包裹 is a parcel. 快递 is the delivery service that brought it.',
      { focus: [-1.28, LZ - .96], reach: 1.5 }),
    mineCrate,
    { other: '这几个包裹是别人的。', otherTr: 'These parcels belong to somebody else.',
      mine:  '这个是我的包裹，快递放在这儿了。',
      mineTr: 'This one is mine — the courier left it here.',
      otherC: C('#b08a5c'), mineC: C('#c8a05e') });

  // ================================================================ 通知栏 the notice board
  //
  // The building's own voice, and the best readable Chinese in the place: a water cut, a lift
  // inspection, and the standing complaint about electric bikes in the corridor.
  //
  // Five layers, each a clear centimetre out from the last, because a glazed case is exactly the
  // object where everything wants to sit in the same plane: backing at 6 cm off the wall, paper at
  // 7 cm, print at 8.2 cm, glass at 9.4..11 cm, frame at 8..12 cm.
  const NZ = 2.75, NW = 1.90;
  A.box(-5.970, Y + 1.575, NZ, .060, 1.10, NW, boardW, { hard: true, gloss: .14 });
  A.box(-5.940, Y + 2.240, NZ, .080, .22, NW + .04, red, { hard: true, gloss: .18 });
  A.glyph(-5.892, Y + 2.240, NZ + .62, Math.PI / 2, '通知栏',
    { size: .140, color: gold, mode: 1, gloss: .18 });
  // ---- one dated table, two boards
  //
  // These were three fixed slips, one of them naming 十月十五日 — a date that never comes round —
  // while the notice by the street door says 明天停水 (js/street.js). Two boards on one building,
  // both about the water, neither aware of the other.
  //
  // `NOTICE_DAY` keys each slip to a weekday the way js/mall.js:4304 keys its announcements, and
  // `noticeFor` picks the three that are up today. Evaluated once, at build: the slips are baked
  // glyph quads and swapping them at runtime would mean rebuilding the board every frame for a
  // thing nobody reads twice in one visit. The 停水 slip carries no weekday and is therefore always
  // up, which is what makes it agree with the street door instead of contradicting it.
  //
  // The sixth field is the BODY, and it is real copy rather than the four grey bars that used to
  // stand in for one. A headline over ruled lines is a sign that says "there is Chinese here" to a
  // player learning Chinese; every word below has a js/vocab.js row, so the body is glossable and
  // the board is the best readable text in the building rather than a picture of a board.
  //
  // 电梯维修 is no longer always up. A notice that is true every day of the year teaches the player
  // to stop reading the case, and 刘师傅 already says 二号梯停用 out loud. The real fix is an
  // out-of-service state on the car in js/world.js, which this lane does not own — QUEUED, item
  // 288. Until it lands the slip runs on a weekday key like every other slip, so the board is
  // wrong two days a week instead of right for the wrong reason.
  const NOTICE_DAY = [
    ['停水通知', C('#8c2f22'), '明日全天停水', '本周六停水请各位住户提前储水备用', col.white,    -1],
    ['电梯维修', C('#33383c'), '二号梯停用',   '二号梯停用维修请改乘一号梯上下',   col.white,     3],   // 星期三
    ['物业通知', C('#8c2f22'), '楼道禁停电动车', '楼道内禁止停放和充电电动车',     C('#e8ccc2'), -1],
    ['缴费通知', C('#8c2f22'), '本月物业费',   '本月物业费请于十五日前交清',       C('#e8ccc2'),  1],   // 星期一
    ['垃圾分类', C('#33383c'), '厨余请沥干',   '厨余垃圾请沥干水分再投绿桶',       col.white,     4],   // 星期四
    ['社区通知', C('#8c2f22'), '周末免费理发', '本周日上午在大堂免费理发',         C('#e8ccc2'),  6],   // 星期六
  ];
  // Three slots, and the slips that are up today fill them: the standing ones first, then whatever
  // is keyed to this weekday. `A.day` is not a thing the shell offers, so this uses the real one —
  // the same source js/mall.js reads.
  function noticeFor(day) {
    const up = NOTICE_DAY.filter(n => n[5] < 0 || n[5] === day);
    return up.slice(0, 3);
  }
  const notices = noticeFor(new Date().getDay()).map(([head, hc, sub, body, paper], i) =>
    [NZ - .62 + i * .62, paper, head, hc, sub, body]);
  for (const [nz, paper, head, hc, sub, body] of notices) {
    A.box(-5.933, Y + 1.575, nz, .006, .82, .54, paper, { hard: true, gloss: .06 });
    A.glyph(-5.918, Y + 1.880, nz, Math.PI / 2, head,
      { size: .088, color: hc, lift: 0, gloss: .08 });
    A.glyph(-5.918, Y + 1.735, nz, Math.PI / 2, sub,
      { size: .050, color: C('#4a4640'), lift: 0, gloss: .08 });
    // Wrapped in code rather than in the table so the copy stays one sentence at the point it is
    // written. Eight characters at .038 with a .008 gap is .368 across a .54 slip.
    for (let i = 0; i * 8 < body.length; i++)
      A.glyph(-5.918, Y + 1.600 - i * .075, nz, Math.PI / 2, body.slice(i * 8, i * 8 + 8),
        { size: .038, gap: .008, color: C('#4a4640'), lift: 0, gloss: .08 });
    A.box(-5.922, Y + 1.24, nz + .17, .004, .052, .20, C('#a8342a'), { hard: true });
  }
  A.box(-5.898, Y + 1.575, NZ, .016, 1.06, 1.82, glassC, { hard: true, alpha: .20, gloss: .80 });
  for (const [dy, dz, h, w] of [[.550, 0, .09, NW + .04], [-.550, 0, .09, NW + .04],
                                [0, -.965, 1.19, .07], [0, .965, 1.19, .07]])
    A.box(-5.900, Y + 1.575 + dy, NZ + dz, .040, h, w, C('#5a6166'),
      { hard: true, gloss: .50, ...MAT.metal });
  A.stop(-6.03, -5.85, NZ - NW / 2 - .06, NZ + NW / 2 + .06);
  A.th('通知栏', -5.72, Y + 1.62, NZ, '看看这星期有什么通知。', 'Let me see this week\'s notices.',
    '通知 is a notice and 栏 is the case it is in. 物业 is the management company.',
    { focus: [-5.05, NZ], reach: 1.6 });

  // 消防栓 — the hydrant cabinet, red, with the glass you break. It is on this wall in every one
  // of these buildings and the word is worth having.
  A.box(-5.900, Y + 1.30, 4.28, .20, .90, .70, C('#a8291f'),
    { hard: true, gloss: .34, ...MAT.metal });
  A.box(-5.792, Y + 1.32, 4.28, .014, .70, .54, glassC, { hard: true, alpha: .30, gloss: .80 });
  A.glyph(-5.776, Y + 1.32, 4.55, Math.PI / 2, '消防栓',
    { size: .078, color: col.white, vertical: true, gloss: .14 });
  A.stop(-6.03, -5.76, 3.88, 4.68);
  A.th('消防栓', -5.66, Y + 1.62, 4.28, '消防栓是不能挡住的。', 'A fire hydrant must never be blocked.',
    '消防 is fire-fighting and 栓 is the valve. 消防车 is a fire engine.',
    { focus: [-5.05, 4.28], reach: 1.5 });

  // ================================================================ waiting, and the money tree
  //
  // Two chairs and a low table against the street wall, which is where you wait for somebody
  // rather than where you sit down. Deliberately not labelled: `椅子` already means one specific
  // chair three metres above this room, at a fixed seat position in game.js, and a second chair
  // wearing the same word would sit you down in the flat.
  for (const cx of [-4.30, -3.05]) {
    A.box(cx, Y + .430, -4.52, .50, .06, .46, col.woodM, TIMBER);
    A.box(cx, Y + .740, -4.72, .50, .46, .06, col.woodM, TIMBER);
    for (const sx of [-1, 1]) {
      A.box(cx + sx * .265, Y + .620, -4.56, .05, .07, .40, aluD, METAL);
      for (const sz of [-1, 1])
        A.cyl(cx + sx * .21, Y + .200, -4.52 + sz * .19, .018, .40, aluD,
          { gloss: .50, ...MAT.metal });
    }
    A.shade(cx, -4.56, .66, .62, .56, SY);
    A.stop(cx - .30, cx + .30, -4.80, -4.26);
  }
  A.box(-3.675, Y + .440, -4.55, .55, .04, .40, C('#3f4449'),
    { hard: true, gloss: .34, ...MAT.metal });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    A.cyl(-3.675 + sx * .23, Y + .210, -4.55 + sz * .15, .014, .42, C('#3f4449'), { gloss: .50 });
  A.box(-3.60, Y + .478, -4.55, .30, .016, .24, col.white, { hard: true, ry: .16 });
  A.box(-3.60, Y + .490, -4.55, .26, .006, .20, C('#cfc7b8'), { hard: true, ry: .16 });
  A.shade(-3.675, -4.55, .66, .52, .50, SY);

  // 发财树. A braided money tree in a red pot is what stands in the corner of every lobby, every
  // bank and every restaurant in this country, and it is there for the name: 发财 is to get rich.
  const TX = 5.10, TZ = 2.30;
  A.cyl(TX, Y + .260, TZ, .250, .52, C('#8a3b2c'), { gloss: .32, ...MAT.slab });
  A.cyl(TX, Y + .530, TZ, .272, .06, C('#a04a37'), { gloss: .36 });
  A.cyl(TX, Y + .556, TZ, .235, .03, C('#3a2c22'), { gloss: .05 });
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    for (let s = 0; s < 2; s++)
      A.cap(TX + Math.cos(a + s * .9) * .046, Y + .78 + s * .38, TZ + Math.sin(a + s * .9) * .046,
        .032, .42, .032, C('#8a7a5c'), { gloss: .16, rz: (s ? -1 : 1) * .09, ry: a });
  }
  A.box(TX, Y + 1.14, TZ, .13, .075, .13, red, { hard: true, gloss: .20 });
  for (let i = 0; i < 8; i++) {
    const a = i * .785, rr = .20 + (i % 3) * .07;
    A.ball(TX + Math.cos(a) * rr, Y + 1.42 + (i % 4) * .105, TZ + Math.sin(a) * rr,
      .24, .105, .24, i % 2 ? col.plant : col.plantD, { gloss: .18, ry: a, rz: (i % 2 - .5) * .10 });
  }
  A.ball(TX, Y + 1.80, TZ, .26, .13, .26, col.plant, { gloss: .18 });
  A.box(TX - .19, Y + .30, TZ - .17, .12, .16, .012, red, { hard: true, gloss: .20, ry: -.7 });
  A.glyph(TX - .202, Y + .30, TZ - .181, -Math.PI / 2 - .7, '福',
    { size: .10, color: gold, mode: 1 });
  A.shade(TX, TZ, .82, .82, .60, SY);
  A.stop(TX - .32, TX + .32, TZ - .32, TZ + .32);
  A.th('发财树', TX, Y + 1.90, TZ, '大堂里有一棵发财树。', 'There is a money tree in the lobby.',
    '发财 is to make money, so 发财树 is a money tree. 恭喜发财 is what you say at New Year.',
    { focus: [4.30, TZ], reach: 1.7 });

  // ================================================================ the mirror by the lift
  //
  // Where you check yourself while the car comes down. Nothing in this renderer reflects, so a
  // mirror has to be *read* as one, and the way that is done here — and in three of the shops in
  // the mall, which is where the lesson was learned — is bands: ceiling, room, floor, each a
  // couple of steps darker than the surface it stands for, abutting rather than overlapping, in a
  // frame that is lighter than any of them. A pale glossy sheet is a lit fog panel; a bright
  // rectangle in a dark surround is a window. Darker than its own frame is the whole trick.
  // The frame is four bars round a hole and not one solid block, and that is the whole of why this
  // mirror was invisible for as long as it has existed: a 9 cm block standing 9 cm off the wall
  // has its front face at 5.910, and every version of the glass was written at 5.92 to 5.95 —
  // *inside* it. What the room showed was a plain timber panel with 镜子 written over it in the
  // interaction label, which is the sort of bug that survives because the label says it worked.
  const MB = { hard: true, gloss: .62, tag: '镜子' };
  for (const [dy, dz, hh, dd] of [[.89, 0, .08, 1.16], [-.89, 0, .08, 1.16],
                                  [0, -.54, 1.70, .08], [0, .54, 1.70, .08]])
    A.box(5.955, Y + 1.40 + dy, 4.10 + dz, .09, hh, dd, C('#7d6b4e'), TIMBER);
  A.box(5.985, Y + 1.40, 4.10, .030, 1.74, 1.06, C('#3a352d'), { hard: true, gloss: .30 });
  A.box(5.955, Y + 2.020, 4.10, .022, .46, 1.02, C('#9aa0a0'), MB);   // the ceiling, in it
  A.box(5.955, Y + 1.420, 4.10, .022, .74, 1.02, C('#7f8480'), MB);   // the room
  A.box(5.955, Y + .800, 4.10, .022, .50, 1.02, C('#61655e'), MB);    // the floor
  A.box(5.938, Y + 1.34, 4.28, .012, 1.28, .28, C('#43413c'), MB);    // and whoever is in front of it
  A.box(5.936, Y + 2.215, 4.10, .010, .046, .94, C('#ffeec9'),
    { hard: true, mode: 1, glow: .08, tag: '镜子' });                 // the cove, coming back off the top
  A.stop(5.86, 6.03, 3.46, 4.74);
  A.th('镜子', 5.72, Y + 1.52, 4.10, '出门前照一下镜子。', 'A look in the mirror before you go out.',
    '照镜子 is to look in a mirror; 镜子 on its own is the mirror itself.',
    { focus: [5.05, 4.10], reach: 1.6 });

  // ================================================================ 电梯厅 the lift portal
  //
  // The shell hangs the doors, the surrounds, the indicators and the call panel on the face of the
  // two shafts at z 4.90, and stops there — so the lift core ended at the edge of its own plaster
  // with a ten-centimetre slot open at each side, straight into a thirty-seven-metre shaft. Both
  // are closed here by a pier, and a pier at each end of a lift core is what the core wants
  // anyway: it makes the two doors one thing.
  //
  // The piers are the mirrored columns of a Chinese lift lobby — a stone base, a stainless shaft,
  // and a tall panel of mirror on the face you walk up to, banded the same way the one by the
  // stair door is. They also take the advertising frames, which is the other half of what stands
  // beside a lift in this country.
  for (const s of [-1, 1]) {
    const px = s < 0 ? -0.58 : 3.54;
    // Its flanks are polished stone, not the coarse slab they were. `MAT.slab` at full strength is
    // the right surface for a floor read from two metres up and the wrong one for a column you
    // walk within arm's reach of: at that distance it resolves into courses and the pier read as
    // a brick pillar in the middle of a marble lift lobby. A quarter of the texture and a step of
    // gloss and it is stone again.
    //
    // `mat: 'paving'`, which is what `MAT.slab` is a preset of — the preset is named for the
    // finish, the texture is named for the file, and writing `mat: 'slab'` here handed a string
    // no material answers to straight through `build.js`'s resolver and into `texId`, where a
    // string is an invalid WeakMap key and the whole game fell over on boot. Every material named
    // by hand in this file goes through `MAT` for that reason; these three numbers are the only
    // part worth overriding.
    A.box(px, Y + H / 2, 5.53, .28, H, 1.34, C('#6d6558'),
      { hard: true, gloss: .40, ...MAT.slab, matScale: .62, matAmt: .13, nrmAmt: .16 });
    A.box(px, Y + .075, 4.845, .30, .15, .04, C('#3a352e'), { hard: true, gloss: .30 });
    A.box(px, Y + 1.42, 4.850, .26, 2.52, .026, C('#b9bfc2'),
      { hard: true, gloss: .58, ...MAT.metal });                       // the stainless shaft
    // The mirror in it: three bands, abutting, all darker than the steel round them.
    A.box(px, Y + 2.020, 4.838, .20, .44, .022, C('#8d9392'), { hard: true, gloss: .60 });
    A.box(px, Y + 1.310, 4.838, .20, .98, .022, C('#767b76'), { hard: true, gloss: .60 });
    A.box(px, Y + .620, 4.838, .20, .40, .022, C('#5b5f58'), { hard: true, gloss: .60 });
    A.box(px, Y + 2.268, 4.836, .21, .030, .020, C('#ffeec9'), { hard: true, mode: 1, glow: .08 });
    A.stop(px - .17, px + .17, 4.84, 6.20);
  }

  // 广告灯箱 — the backlit frame beside each set of doors. Universal, and the only thing in a
  // Chinese lift lobby that is genuinely bright: half a square metre of lit face, which is why the
  // glow sits at .06 and the printed panel over it is what you actually see.
  for (const [bx, head, line] of [[-0.30, '本楼公告', '电梯维保 每月十五日'],
                                  [ 3.27, '社区服务', '物业电话 六二三八']]) {
    A.box(bx, Y + 1.52, 4.858, .40, 1.06, .045, C('#4a5054'), { hard: true, gloss: .44, ...MAT.metal });
    A.box(bx, Y + 1.52, 4.826, .35, 1.00, .022, C('#fff4de'), { hard: true, mode: 1, glow: .060 });
    A.box(bx, Y + 1.90, 4.804, .33, .20, .010, C('#9c2f24'), { hard: true, gloss: .14 });
    A.glyph(bx, Y + 1.90, 4.798, Math.PI, head, { size: .088, color: C('#f6e3b4'), gloss: .16 });
    A.glyph(bx, Y + 1.63, 4.804, Math.PI, line, { size: .052, color: C('#5a5347') });
    for (let i = 0; i < 5; i++)
      A.box(bx, Y + 1.42 - i * .085, 4.800, .25, .010, .006, C('#a49c8c'), { hard: true });
    A.glow(M.trs(bx, GY, 4.30, 0, .46, 1, 1.20), C('#ffe9c0'), .075);
  }

  // 楼层索引 — the floor index, on the pier between the two sets of doors, over the call panel the
  // shell puts at x 1.50. Twelve floors and what is on them, which is the one sign in this room
  // that tells you the building is twelve storeys and not two.
  A.box(1.52, Y + 1.94, 4.868, .84, .62, .035, C('#33383c'), { hard: true, gloss: .38 });
  A.box(1.52, Y + 1.94, 4.842, .78, .56, .022, C('#22282c'), { hard: true, gloss: .30 });
  A.glyph(1.52, Y + 2.13, 4.828, Math.PI, '楼层索引',
    { size: .080, color: C('#e8cf94'), mode: 1, gloss: .16 });
  for (const [i, line] of ['一层 大堂 门卫室', '二层至十一层 住户', '十二层 屋顶晾晒'].entries())
    A.glyph(1.52, Y + 1.97 - i * .105, 4.828, Math.PI, line,
      { size: .046, color: C('#b9c0c4') });

  // 门槛 — the metal sill each set of doors stands behind. Two reasons, and the second is the one
  // that matters: a lift landing in this country always has a strip of something harder than the
  // floor across its mouth because that is where every trolley and every bicycle wheel in the
  // building crosses, and a bright doorway with nothing under it reads as a hole cut in the wall.
  //
  // At IY + 12 mm, the same plane as the lift-approach panel's dark stone — which stops at 4.75,
  // where this starts. Two quads at one height that butt rather than overlap, the same
  // arrangement as the border band.
  //
  // The shafts are LIFT x 1.6..3.4 and LIFT_B x -0.4..1.4, so the doors are centred on 2.50 and
  // 0.50; their openings are DOORW and .92 (js/world.js). The sill runs 24 cm wider than the
  // opening, which is where the jamb linings land.
  for (const [dx, dw] of [[0.50, .92], [2.50, .80]]) {
    A.flat(dx, IY + .012, 4.805, dw + .24, .10, C('#71787c'),
      { mode: 0, gloss: .58, ...MAT.metal });
    // and, in the floor, what a square metre of lit steel does to polished stone. Long towards
    // you and narrow across, because that is the shape the reflection of a door is.
    A.glow(M.trs(dx, GY, 4.24, 0, dw + .06, 1, 1.36), C('#ccd6d8'), .105);
  }

  // 消防疏散示意图 — the evacuation plan, in the 88 cm of back wall between the parcel lockers and
  // the near pier. Read from the middle of the lift lobby rather than stood in front of: the slot
  // is 20 cm clear once the locker bank's and the pier's colliders have taken their share, which
  // the walk test confirms is not standing room. That is exactly the sort of leftover a building
  // puts an evacuation plan in, so it is left where it is rather than moved somewhere emptier.
  // Drawn rather than written: a red border, the floor plate in outline, the stair hatched
  // in green at the right-hand end where the stair actually is, and 您在这里 on a red dot roughly
  // where the reader is standing.
  const EVX = -1.16, EVZ = Z1 - .04;
  A.box(EVX, Y + 1.52, EVZ, .80, .62, .035, C('#4b5155'), { hard: true, gloss: .44, ...MAT.metal });
  A.box(EVX, Y + 1.52, EVZ - .026, .75, .57, .014, C('#f2efe4'), { hard: true, gloss: .12 });
  A.box(EVX, Y + 1.755, EVZ - .036, .75, .10, .008, C('#a8302a'), { hard: true, gloss: .14 });
  A.glyph(EVX, Y + 1.755, EVZ - .044, Math.PI, '消防疏散示意图',
    { size: .054, color: C('#f6e8c8'), mode: 1, gloss: .14 });
  // The plate, in outline. Two rectangles and a corridor, which is all any of these ever are.
  for (const [ox, oy, w, h] of [[0, 1.50, .60, .008], [0, 1.30, .60, .008],
                                [-.296, 1.40, .008, .20], [.296, 1.40, .008, .20],
                                [0, 1.40, .60, .006], [-.10, 1.40, .006, .20],
                                [.12, 1.40, .006, .20]])
    A.box(EVX + ox, Y + oy, EVZ - .040, w, h, .006, C('#5f6a72'), { hard: true });
  A.box(EVX + .225, Y + 1.35, EVZ - .042, .13, .09, .006, C('#2f8a55'), { hard: true });
  for (let i = 0; i < 4; i++)
    A.box(EVX + .185 + i * .026, Y + 1.35, EVZ - .046, .008, .085, .006, C('#e8f2ea'),
      { hard: true });
  A.box(EVX - .16, Y + 1.455, EVZ - .046, .030, .030, .006, C('#c8352a'), { hard: true });
  A.glyph(EVX - .16, Y + 1.245, EVZ - .044, Math.PI, '您在这里',
    { size: .036, color: C('#a8302a') });
  for (let i = 0; i < 3; i++)
    A.box(EVX + .06, Y + 1.185 - i * .048, EVZ - .040, .52, .008, .006, C('#8d8a80'),
      { hard: true });

  // A shadow line carried on round the back wall at the height the bulkhead's soffit stops. The
  // perimeter bulkhead ends at z 4.87 because the lift car rides through everything past it, so
  // the ceiling's own line simply stopped in mid-air over the lockers and left three metres of
  // blank plaster under it. Forty millimetres of dark reveal is enough to finish the line.
  const RUN = { hard: true, gloss: .18 };
  for (const [cx, w] of [[-3.39, 5.22], [4.86, 2.28]])
    A.box(cx, Y + 2.680, Z1 - .045, w, .040, .050, C('#b0a999'), RUN);
  for (const s of [-1, 1])
    A.box(s * (X1 - .045), Y + 2.680, 5.53, .050, .040, 1.30, C('#b0a999'), RUN);

  // A pair of planters flanking the approach, tucked against the piers where they are out of the
  // way of both lift doors. Square, dark, and taller than the pots by the entrance: this is the
  // end of the room you look down when you come in, and it wanted something with height in it.
  //
  // 虎皮兰, and not the balls-on-sticks the money tree is made of. Every leaf in this game is a
  // sphere, which is right for a canopy and wrong for this: a flattened sphere on a stalk reads as
  // a lily pad, and a pot of them reads as a joke. A snake plant is blades — one rounded box each,
  // splayed off the vertical and turned so no two are edge-on at once — and blades are the one
  // plant shape this toolkit draws exactly right.
  for (const [qx, s] of [[-1.05, -1], [4.05, 1]]) {
    A.box(qx, Y + .30, 4.80, .46, .60, .46, C('#4d4740'),
      { hard: true, gloss: .34, ...MAT.slab, matScale: 1.20, matAmt: .12, nrmAmt: .15 });
    A.box(qx, Y + .615, 4.80, .49, .05, .49, C('#615a51'), { hard: true, gloss: .34 });
    A.box(qx, Y + .638, 4.80, .40, .03, .40, C('#3a2c22'), { hard: true, gloss: .05 });
    for (let i = 0; i < 13; i++) {
      const a = i * 1.436 + s, rr = .045 + (i % 4) * .035, hgt = .50 + (i % 5) * .15;
      A.box(qx + Math.cos(a) * rr, Y + .65 + hgt / 2, 4.80 + Math.sin(a) * rr,
        .080, hgt, .020, i % 3 ? col.plant : col.plantD,
        { gloss: .20, ry: a, rz: Math.cos(a * 1.7) * .17 });
    }
    A.shade(qx, 4.80, .74, .74, .58, SY);
    A.stop(qx - .27, qx + .27, 4.52, 5.08);
  }

  // 休息椅 — the waiting seat, facing the lifts across the new floor. Three places on a stainless
  // frame with timber slats, which is the bench a 物业 buys: it is bolted down, it has no arms,
  // and nobody has ever sat on one for longer than a lift takes.
  const SX = -2.60, SZ = 3.58;
  for (const s of [-1, 1]) {
    A.box(SX + s * .78, Y + .21, SZ, .05, .42, .44, C('#8d9498'), { hard: true, gloss: .52, ...MAT.metal });
    A.box(SX + s * .78, Y + .012, SZ, .13, .024, .50, C('#5e6468'), { hard: true, gloss: .40 });
    A.box(SX + s * .78, Y + .62, SZ - .19, .05, .40, .05, C('#8d9498'), { hard: true, gloss: .52, ...MAT.metal });
  }
  for (let i = 0; i < 4; i++)
    A.box(SX, Y + .435, SZ - .16 + i * .115, 1.66, .045, .095, col.woodM,
      { hard: true, gloss: .24, ...MAT.timber });
  for (let i = 0; i < 3; i++)
    A.box(SX, Y + .60 + i * .115, SZ - .215, 1.66, .085, .042, col.woodM,
      { hard: true, gloss: .24, ...MAT.timber });
  A.shade(SX, SZ - .02, 1.92, .66, .56, SY);
  A.stop(SX - .90, SX + .90, SZ - .30, SZ + .28);

  // ================================================================ 安全出口 the stair door
  //
  // The other way down, and the sign over it is the same green in every building in the country.
  A.box(4.80, Y + 1.04, Z1 - .045, 1.12, 2.16, .09, aluD, METAL);
  A.box(4.80, Y + 1.02, Z1 - .082, .96, 2.04, .05, C('#6e7a80'),
    { hard: true, gloss: .40, ...MAT.metal });
  A.box(4.80, Y + 1.62, Z1 - .116, .24, .40, .02, C('#3d4a4e'), { hard: true, gloss: .60 });
  A.cap(4.80, Y + 1.02, Z1 - .132, .022, .78, .022, steel,
    { gloss: .60, rz: Math.PI / 2, ...MAT.metal });
  A.box(4.80, Y + 2.28, Z1 - .045, .68, .24, .05, exitG, { hard: true, mode: 1, glow: .06 });
  A.glyph(4.80, Y + 2.28, Z1 - .082, Math.PI, '安全出口',
    { size: .125, color: C('#f2f7f0'), mode: 1, gloss: .16 });
  // The pictogram beside it: a body, a stride and a doorway, which is all it ever is.
  A.box(5.30, Y + 2.28, Z1 - .045, .30, .24, .05, exitG, { hard: true, mode: 1, glow: .06 });
  A.ball(5.240, Y + 2.360, Z1 - .080, .022, .026, .012, col.white, { mode: 1, glow: .12 });
  A.cap(5.245, Y + 2.280, Z1 - .080, .016, .11, .010, col.white, { mode: 1, glow: .12, rz: .22 });
  A.cap(5.215, Y + 2.200, Z1 - .080, .012, .10, .010, col.white, { mode: 1, glow: .12, rz: -.55 });
  A.cap(5.278, Y + 2.200, Z1 - .080, .012, .10, .010, col.white, { mode: 1, glow: .12, rz: .45 });
  A.box(5.370, Y + 2.280, Z1 - .082, .015, .19, .012, col.white,
    { hard: true, mode: 1, glow: .12 });
  A.glow(M.trs(4.95, GY, Z1 - .70, 0, 1.30, 1, .90), C('#9fe0bb'), .045);
  A.th('安全出口', 4.80, Y + 1.72, Z1 - .28, '楼梯在安全出口后面。',
    'The stairs are behind the fire door.',
    '安全 safe + 出口 exit. 楼梯 is the staircase itself; 电梯 is the lift.',
    { focus: [4.80, Z1 - .95], reach: 1.7 });
  // Two extinguishers against the wall beside it, on a red base plate.
  A.box(5.72, Y + .012, Z1 - .22, .46, .03, .32, C('#8e2b22'), { hard: true, gloss: .24 });
  for (const ex of [5.63, 5.81]) {
    A.cyl(ex, Y + .27, Z1 - .22, .068, .48, C('#b3372a'), { gloss: .38, ...MAT.metal });
    A.cyl(ex, Y + .53, Z1 - .22, .028, .09, C('#4b5155'), { gloss: .55 });
    A.cap(ex - .05, Y + .57, Z1 - .22, .010, .09, .010, C('#7d8388'), { gloss: .55, rz: 1.2 });
  }
  A.shade(5.72, Z1 - .22, .52, .40, .54, SY);
  A.stop(5.48, 5.98, Z1 - .40, Z1 - .02);

  // ================================================================ the last of it
  //
  // A wet-floor sign, which on a polished stone floor is not decoration — it is out somewhere in
  // this room most days — and a bin by the money tree.
  // Off the diagonal from the porch to the lift, measured rather than eyeballed: at (1.10, 2.30)
  // its collider plus the 0.30 body radius closed that line completely and walking east across
  // the lobby stopped dead at x -1.10.
  const WX = -1.60, WZ = 2.20;
  for (const s of [-1, 1])
    A.box(WX + s * .075, Y + .34, WZ, .30, .62, .035, C('#e0b02a'),
      { hard: true, gloss: .30, rz: s * .13 });
  A.glyph(WX - .098, Y + .40, WZ - .024, Math.PI, '小心地滑',
    { size: .070, color: C('#3a3226'), vertical: true, gloss: .10 });
  A.shade(WX, WZ, .46, .38, .52, SY);
  // 拖把和水桶 — and the reason the sign is out. A wet-floor sign standing on a dry floor with
  // nobody near it is a prop; a sign with the 保洁's bucket parked behind it is a morning. The
  // mop leans out of the bucket, which is how one is always left while she goes for more water.
  //
  // Its collider is folded into the sign's rather than added beside it: two 0.4 m stops touching
  // each other are one 0.8 m obstacle to the eye and a 1.4 m one to the body, and this stands in
  // open floor where every metre of it is somebody's diagonal.
  A.cyl(WX - .05, Y + .135, WZ - .40, .155, .27, C('#c4453a'), { gloss: .30 });
  A.cyl(WX - .05, Y + .265, WZ - .40, .162, .022, C('#a63a30'), { gloss: .34 });
  A.cyl(WX - .05, Y + .250, WZ - .40, .130, .020, C('#6d7f86'), { gloss: .18 });   // the water
  A.cap(WX - .05, Y + .275, WZ - .40, .012, .30, .012, C('#8e9599'),
    { gloss: .50, rz: Math.PI / 2, ...MAT.metal });                                // the handle
  // Stood *in* the bucket rather than beside it, which is both how one is actually left and the
  // only way the head does not have to be modelled: a mop head drawn as a white box on the floor
  // next to the pail reads as a brick somebody has left out, and it did.
  A.cap(WX + .06, Y + .80, WZ - .47, .014, 1.20, .014, C('#b8a074'),
    { gloss: .22, rz: -.13, rx: .10 });                                            // the shaft
  A.cyl(WX + .015, Y + .215, WZ - .425, .055, .12, C('#b5b2a6'),
    { gloss: .10, mat: 'fabric', matScale: .28, matAmt: .34, nrmAmt: .34 });       // and the head
  A.cap(WX + .145, Y + 1.36, WZ - .555, .017, .13, .017, C('#3f4448'),
    { gloss: .30, rz: -.13, rx: .10 });                                            // the grip
  A.shade(WX - .04, WZ - .44, .48, .48, .50, SY);
  A.stop(WX - .24, WX + .24, WZ - .62, WZ + .18);
  // 拖把 already has a dictionary row — it is a 45-yuan item in js/data.js and line 1144 of
  // js/vocab.js — so this label is safe to hang. 摄像头 and 应急灯, the other two things added to
  // this room, have no row, and a headword with no row cannot be learned, which is the point of
  // the game; they are left unlabelled and written up as a ticket instead.
  A.th('拖把', WX + .02, Y + .78, WZ - .46, '保洁阿姨把拖把放在这儿了。',
    'The cleaner has left her mop here.',
    '拖 to drag + 把 a handle. 拖地 is to mop the floor; 保洁 is the cleaner.',
    { focus: [WX + .30, WZ - .96], reach: 1.5 });
  // The bin moved out of the lift approach when the planters went in: at (3.86, 4.42) its collider
  // and the +x planter's overlapped, which is 0.6 m of the walk to the stair door gone.
  A.cyl(5.68, Y + .30, 3.05, .16, .60, C('#9aa1a6'), { gloss: .46, ...MAT.metal });
  A.cyl(5.68, Y + .615, 3.05, .17, .03, C('#6f767b'), { gloss: .40 });
  A.cyl(5.68, Y + .620, 3.05, .085, .04, C('#2a2e31'), { gloss: .10 });
  A.shade(5.68, 3.05, .44, .44, .54, SY);
  A.stop(5.50, 5.86, 2.87, 3.23);

  // ================================================================ what watches, and what stays
  //                                                                  on when the power goes
  //
  // The two fittings that are in the corner of every Chinese lobby and that nobody has ever looked
  // at on purpose. They cost almost nothing to build and their absence is the sort of thing that
  // reads as "a room in a game" without anybody being able to say why.
  //
  // Both are placed by the direction they face rather than by a yaw, and that is not a style
  // choice — it is the second bug these two cost. Written with a yaw and a sign, the +z camera
  // came out correctly and the one over the entrance came out at z −5.09, which is a metre and a
  // half outside the building, because `-cos(yaw)·d` is +z at yaw 0 and also +z at yaw π. An
  // outward unit vector cannot be got wrong that way: `(ox, oz)` is where the room is from the
  // wall, every offset in both functions is a multiple of it, and the long axis is simply the
  // other one.
  //
  // 摄像头. A bracket, a barrel and a black lens, aimed down into the room. The barrel is `A.cap`,
  // which builds its capsule along local **Y** — so a camera written as if it were long in z comes
  // out as a flat puck stuck to the wall, which is exactly what the first one did. Laid down with
  // `rx` for a z-wall and `rz` for an x-wall, and by π/2 + 0.34 rather than π/2 − 0.34: a capsule
  // is symmetric, so the tilt has to put the *lens* end down, and the near sign of that is the
  // difference between a security camera and a camera watching the ceiling.
  function cctv(x, z, ox, oz) {
    A.box(x, Y + 2.56, z, .07, .07, .07, C('#d6d4cd'), { hard: true, gloss: .30 });
    A.box(x + ox * .10, Y + 2.53, z + oz * .10, .05, .13, .05, C('#d6d4cd'),
      { hard: true, gloss: .30 });
    const bx = x + ox * .19, bz = z + oz * .19, tilt = Math.PI / 2 + .34;
    A.cap(bx, Y + 2.42, bz, .052, .21, .052, C('#e2e0d8'),
      oz ? { gloss: .34, rx: oz * tilt } : { gloss: .34, rz: -ox * tilt });
    A.ball(bx + ox * .085, Y + 2.355, bz + oz * .085, .045, .045, .045, C('#15181a'),
      { gloss: .70 });
    A.ball(bx + ox * .098, Y + 2.345, bz + oz * .098, .016, .016, .016, C('#8ad2ff'),
      { mode: 1, glow: .05 });
  }
  cctv(-0.94, Z1 - .10, 0, -1);                   // over the lift approach, looking back at the room
  cctv(3.10, Z0 + .12, 0, 1);                     // and over the entrance, looking in
  // 消防应急灯 — the twin-head emergency light. White box, two heads on stubby necks, a green
  // charge lamp. It is the only fitting in the room that is meant to be looked at exactly once,
  // in the dark, and every stairwell and lobby in the country has the same one.
  function emLight(x, z, ox, oz) {
    const lx = Math.abs(oz), lz = Math.abs(ox);   // long across the way it faces, not along it
    A.box(x, Y + 2.44, z, .34 * lx + .09 * lz, .13, .09 * lx + .34 * lz, C('#eceae2'),
      { hard: true, gloss: .28 });
    for (const t of [-1, 1]) {
      const hx = x + oz * t * .105 + ox * .045, hz = z - ox * t * .105 + oz * .045;
      A.cyl(hx, Y + 2.375, hz, .046, .06, C('#e6e4dc'), { gloss: .30 });
      A.ball(hx, Y + 2.335, hz, .050, .046, .050, C('#fff6e0'), { mode: 1, glow: .05 });
    }
    A.box(x + ox * .050, Y + 2.492, z + oz * .050, .020, .016, .020, C('#4fd07a'),
      { hard: true, mode: 1, glow: .10 });
  }
  emLight(5.62, Z1 - .10, 0, -1);                 // beside the 安全出口, where it belongs
  emLight(X0 + .10, 5.58, 1, 0);                  // and the far corner, over the lockers

  // The red banner. Every compound in this city has one of these up, and the four-plus-four form
  // of it is as fixed as the colour.
  A.box(-3.80, Y + 2.36, -4.940, 3.20, .34, .03, red, { hard: true, gloss: .16 });
  A.glyph(-3.80, Y + 2.36, -4.912, 0, '平安社区 温馨家园',
    { size: .155, color: C('#f6e3b4'), mode: 1, gloss: .18 });
};
