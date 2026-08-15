// 🚪 Gate + lounge — 登机口 — the podium, the lounge seating, the airbridge door at BRX = 18
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x 15.0 .. 22.0  (airside)
//   camera  D7-gate + DC-lounge
//
// 登机口 — the podium, the lounge seating, the airbridge door at BRX = 18.20 that boards into
// cabin.js. IMPROVEMENT 1 ALSO LANDS HERE: the gate screen that calls your flight must become
// real glyphs. Owns walkToGate. TWO SHOTS: the gate and the lounge.
//
// ---------------------------------------------------------------------------------------------
// WHAT "THE SCREENS LIE" ACTUALLY MEANT HERE, MEASURED
//
// `UPGRADES.md:433` lists the gate display with the kiosks and the X-ray as a bar-UI coloured
// rectangle, citing `airport.js:1112` — a line number from before the split. That item is STALE
// for this zone. The shell's screen over the airbridge door already writes real characters
// through `slots()`, which is `glyphs()` with a rewritable `p.ch`.
//
// But there is a real, live hazard underneath it, and it is worth writing down because it is the
// mechanism by which any screen in this game turns back into a coloured rectangle:
//
//   `slots()` lays its run down with the placeholder '正' and then assigns `p.ch = txt[i]` at
//   runtime. Only the placeholder was ever passed through `Glyphs.need`. A character that reaches
//   a slot without having been registered has no atlas cell, `Glyphs.rect` returns null, and
//   game.js:8415 sets the instance's cell width to zero — "no cell for this character: draw it
//   plain". Plain is a SOLID COLOURED QUAD. The screen does not fail loudly; it prints a bar.
//
// So the gate screen is one un-registered character away from the bug it is accused of, forever.
// Everything this file writes to a slot is registered up front in CHARSET below, including the
// statuses that only appear in bad weather (延误, 取消) and never get drawn on a clear day. That
// was measured, not assumed: a probe walked every flight through all 1440 minutes, forced the
// cancelled and delayed branches, collected every string the gate can display, and asked
// `Glyphs.rect` for each of the 44 distinct characters. Today none are missing. Registering them
// here is what keeps that true when somebody adds an eighth flight to the table.
//
// ---------------------------------------------------------------------------------------------
// THE PA ↔ SCREEN AGREEMENT (AIRPORT.md, "what must not break")
//
// This screen never caches. `paint()` calls `A.statusOf` and `A.gateOf` on every refresh and
// throws the answer away again, so a gate change the loudspeaker announces is on the glass in the
// same minute by construction — there is no copy of the schedule in this file to go stale.
//
// It picks its flight by exactly the rule the shell's own `setGate` uses for a player with no
// ticket — the next departure that has not gone yet — so the two screens name the same flight.
// The shell's screen personalises to your 登机牌 when you have one and this one cannot, because
// the ticket lives in a `game.js` module-level variable that is not on `A`. See the ticket in the
// report: the fix is one line of shell state, not a copy of the schedule over here.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. The seat rows below are
//     built to the shell's `seatRun` numbers and materials on purpose: same mesh, same mat,
//     same matScale, so twelve more seats join the batch the hall's existing forty-five are
//     already in rather than starting a forty-sixth. Upholstery colour varies per instance,
//     which is free.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH. This zone adds none.
//   * Glyphs batch (the atlas cell is a per-instance attribute), so the screen is affordable.
//
// ---------------------------------------------------------------------------------------------

registerAirportAmbient('gate-lounge-dozing-passenger', 16.40, -1.90, Math.PI / 2,
  { hz:'乘客', roleClass:'civilian', act:'sit', seatY:.48, temper:'weary',
    top:'#4b5a72', source:'air-gate' });
registerAirportAmbient('gate-lounge-seat-far', 17.33, -4.30, Math.PI,
  { hz:'乘客', roleClass:'civilian', act:'read', seatY:.48, temper:'patient',
    top:'#7a5347', source:'air-gate' });
registerAirportAmbient('gate-lounge-seat-middle', 15.47, -3.10, 0,
  { hz:'乘客', roleClass:'civilian', act:'phone', seatY:.48, temper:'bored',
    top:'#3f6b6b', source:'air-gate' });

AirFit['gate'] = A => {
  const { box, cyl, ball, cap, taper, wall, flat, glyphs, solid, blocker, glow, thing } = A;
  const { C, G, col } = A;
  const { M_STONE, M_METAL } = A;
  const BRX = A.BRX, RZ = A.RZ, CALL = A.CALL;

  // ---------------------------------------------------------------- where everything stands
  //
  // Measured against the shell's own colliders rather than chosen. `clampMove` inflates every
  // solid by the 0.30 m body radius, and the gate is the one place in the game where a sealed
  // route is not a blemish but an uncompletable game: 售票处 → 值机 → 安检 → 登机口 →
  // boardCabin() ends at the 登机口 thing, whose focus is (18.20, −5.00).
  //
  // What is already in the way, inflated, and what it leaves:
  //
  //   the podium            x 16.95 .. 19.35   z −7.35 .. −5.85
  //   the three queuers     x 13.87 .. 16.90   z −6.52 .. −5.48
  //   the split bin         x 18.61 .. 20.19   z −3.53 .. −2.47
  //   the east planter      x 19.37 .. 21.43   z −3.80 ..  1.00
  //   the east palm         x 19.82 .. 21.38   z −7.18 .. −5.62
  //   the west seat runs    x 11.25 .. 15.15   (three bands, z −4.06 .. −2.74 and so on)
  //
  // The bin and the planter overlap in x, so there is no way east of the bin at all: the ONLY
  // north–south route from the concourse to the podium is the slot between the seating and the
  // bin's west face at 18.61. That slot is why the rows below stop where they do — 18.04
  // inflated, which leaves 0.57 m of standing room, the same width as the aisles between the
  // hall's existing rows. Widen the rows to five seats and the slot closes to 0.37 m and the
  // game can no longer be finished. This was flood-filled, not eyeballed; see the report.
  const SEAT_X = 16.40;                      // centre of the lounge rows
  const ROWZ = [-4.30, -3.10, -1.90];        // three rows, back to back in pairs
  const SCX = 16.00, SCZ = -2.60, SCY = 3.30;   // the hanging gate screen

  // ---------------------------------------------------------------- rewritable text, registered
  //
  // The shell's `slots()` with the one thing it is missing: the characters are put through
  // `Glyphs.need` before anybody writes them, so a slot can never resolve to a null cell and be
  // drawn as a plain quad. `Glyphs` and `M` are globals from js/glyphs.js and js/math.js, both
  // loaded well before this file — see the FILES list in index.html.
  //
  // Everything this screen can ever show. The flight fields come out of the shell's own table so
  // an eighth flight registers itself; the statuses are asked of `A.statusOf` rather than copied,
  // including the two branches a clear day never reaches.
  const CHARSET = (() => {
    let s = '登机口航班目的地状态时间起飞正在优先经济舱前往请旅客到号';
    s += 'GATEFLIGHTOBSDCPRYNMU:-0123456789 ';
    s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const f of A.FLIGHTS) {
      s += f.no + f.to + f.gate + (f.gate2 || '');
      // Every status this flight reaches over its own day, asked rather than assumed.
      for (let m = 0; m < 1440; m += 5) s += A.statusOf(f, m).zh;
    }
    // The two the weather owns: a delay and a cancellation, forced so they are registered on the
    // clear days when nothing in the hall would otherwise draw them.
    s += A.statusOf({ dep: 600, late: 65 }, 300).zh;
    s += A.statusOf({ cancelled: true, dep: 600, late: 0 }, 600).zh;
    return s;
  })();
  Glyphs.need(CHARSET);

  // A run of n rewritable character cells, centred on (x, y, z). Returns the setter, with the
  // props it owns hung off it as `.ps` — the per-frame pulse below needs to touch `glow` on the
  // live fields without going anywhere near the matrix maths, which is the expensive half.
  function slotRun(x, y, z, yaw, n, o = {}) {
    const size = o.size || .16, gap = o.gap === undefined ? .04 : o.gap;
    const step = size + gap, lift = o.lift === undefined ? .012 : o.lift;
    const ax = Math.cos(yaw), az = -Math.sin(yaw);
    // Alpha is fixed when Build.finish chooses batches. Hiding a spare cell with alpha=0 here
    // strands that cell in the loose path forever, even after a later status makes it visible.
    // Keep every slot opaque and collapse blank cells instead. Their cull sphere is fixed around
    // the complete run so a cell first built blank can still appear at either end without having
    // been frozen as a zero-radius point at the origin.
    const ps = [], nowhere = M.scale(0, 0, 0);
    const cullR = Math.hypot(((n - 1) * step + size) / 2, size / 2, lift);
    for (let i = 0; i < n; i++) {
      const p = glyphs(x, y, z, yaw, '正', { ...o, size, gap: 0 })[0];
      p.fixed = true; p.cx = x; p.cy = y; p.cz = z; p.r = cullR; p.m = nowhere;
      ps.push(p);
    }
    // `last` is the string on the glass. A repaint that would write the same characters in the
    // same places does nothing at all: `M.mul` allocates, and rebuilding forty matrices sixty
    // times a second is the allocation churn that js/game.js:8441 blames the 200 ms frames on.
    let last = null;
    const set = function (str, color) {
      const txt = String(str === undefined || str === null ? '' : str).slice(0, n);
      if (txt === last) {
        if (color) for (let i = 0; i < txt.length; i++) ps[i].color = color;
        return;
      }
      last = txt;
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (i >= txt.length) { p.m = nowhere; p.glow = 0; continue; }
        p.ch = txt[i];
        if (color) p.color = color;
        const t = (i - (txt.length - 1) / 2) * step;
        p.m = M.mul(M.trans(x + ax * t, y, z + az * t), M.mul(M.rotY(yaw),
          M.mul(M.trans(0, 0, lift), M.mul(M.rotX(Math.PI / 2), M.scale(size, 1, size)))));
      }
    };
    set.ps = ps;
    return set;
  }

  // ================================================================ 1. the gate screen
  //
  // A double-sided information hanger over the lounge, on the axis a passenger walks in on. The
  // shell's screen is 5 m up and over the door, which is where you look once you already know
  // where you are going; this is the one you read on the way in, at 3.3 m and four metres from
  // the seats, and it is the screen that has to say 登机中 loudly enough to get somebody out of
  // a chair.
  //
  // Placed at x 16.00 rather than on the door's axis for a reason that only a camera can see.
  // D7's row is p [17.0, −4.0], y 2.00, c [P·1.10, 0.04, 6.0]; the engine puts the eye at
  // tgt + dir·dist with dir = [−sin(yaw)cos(pitch), sin(pitch), −cos(yaw)cos(pitch)]
  // (game.js:8051), which works out at (18.85, 2.24, 1.70) looking down −z. The sight-line from
  // there to the shell's screen over the door crosses this screen's plane at x 18.57, and this
  // face spans 14.70 .. 17.30 — so it passes cleanly east of it and D7 reads both screens. A
  // hanger centred on the door would stand exactly in that line and hide the older one.
  const SCW = 2.60, SCH = 1.30;
  // the housing, and the two rods up to the soffit
  box(SCX, SCY, SCZ, SCW + .16, SCH + .16, .22, col.charcoal,
    { tag: '登机口', hard: true, gloss: .30, ...M_METAL, matScale: 1.10 });
  box(SCX, SCY + SCH / 2 + .11, SCZ, SCW + .22, .07, .28, col.steelD,
    { tag: '登机口', hard: true, gloss: G.metal, ...M_METAL, matScale: .90 });
  for (const s of [-1, 1])
    cap(SCX + s * 1.10, (SCY + SCH / 2 + 7.05) / 2, SCZ, .022,
      7.05 - SCY - SCH / 2, .022, col.steelD, { gloss: G.metal });
  // The two glass faces. Emissive (mode 1) and opaque: a screen that took the room's light would
  // go the colour of the room after dark, and an alpha under .999 would cost a draw call each.
  for (const s of [-1, 1])
    box(SCX, SCY, SCZ + s * .115, SCW, SCH, .012, col.board,
      { tag: '登机口', hard: true, mode: 1, glow: .07 });

  // ---- the face, laid out in two columns: who you are, and what is happening
  //
  // Every field below is a slot run, which means every field is rewritten from the schedule by
  // `paint()` and none of it is painted on. The static labels beside them are plain glyphs — a
  // label is the one thing on a departure screen that genuinely never changes.
  const FZ = SCZ + .122;                     // the front face, +z, read from the concourse
  const BZ = SCZ - .122;                     // the back face, −z, read from the queue
  const DIM = C('#8fa2b4');
  const S = {};

  // left column — the gate itself, which is the answer to the only question anybody has
  glyphs(SCX - .92, SCY + .44, FZ, 0, '登机口', { size: .085, gap: .02, color: DIM, mode: 1 });
  glyphs(SCX - .40, SCY + .44, FZ, 0, 'GATE', { size: .062, gap: .012, color: DIM, mode: 1 });
  S.gate = slotRun(SCX - .78, SCY + .10, FZ, 0, 3,
    { size: .30, gap: .03, color: col.lime, mode: 1 });
  glyphs(SCX - 1.02, SCY - .32, FZ, 0, '航班', { size: .078, gap: .018, color: DIM, mode: 1 });
  S.no = slotRun(SCX - .58, SCY - .32, FZ, 0, 6,
    { size: .115, gap: -.028, color: col.boardOn, mode: 1 });

  // right column — the flight and what it is doing
  S.to = slotRun(SCX + .72, SCY + .42, FZ, 0, 3,
    { size: .175, gap: .035, color: col.white, mode: 1 });
  S.st = slotRun(SCX + .70, SCY + .06, FZ, 0, 3,
    { size: .205, gap: .035, color: col.lime, mode: 1 });
  S.en = slotRun(SCX + .72, SCY - .18, FZ, 0, 11,
    { size: .072, gap: .006, color: col.lime, mode: 1 });
  glyphs(SCX + .30, SCY - .44, FZ, 0, '起飞', { size: .078, gap: .018, color: DIM, mode: 1 });
  S.at = slotRun(SCX + .82, SCY - .44, FZ, 0, 5,
    { size: .108, gap: -.012, color: col.boardOn, mode: 1 });

  // ---- 登机顺序, the boarding order, which is the one thing no screen in this terminal shows
  //
  // Two chips. Both sit dark until the flight is called; then 优先登机 lights for the first ten
  // minutes of the call window and the cabin joins it after. It is the difference between a sign
  // that says boarding and a gate that is boarding somebody in particular.
  S.chip = [];
  // The chip plate stands at FZ + .006 and the lettering at FZ + .012, so the plate clears the
  // screen face at −2.479 and the glyphs clear the plate. Six millimetres each way: put the plate
  // behind the face and the two fight for the same pixels at every camera distance.
  [['优先登机', -.62], ['经济舱', .34]].forEach(([txt, dx]) => {
    box(SCX + dx, SCY - .56, FZ + .006, txt.length * .096 + .10, .10, .008, C('#20262c'),
      { tag: '登机口', hard: true, mode: 1, glow: .04 });
    S.chip.push(glyphs(SCX + dx, SCY - .56, FZ, 0, txt,
      { size: .072, gap: .022, color: DIM, mode: 1 }));
  });

  // ---- the back, read by whoever is already standing in the queue with their back to the hall.
  // Two fields only: a queue does not need the timetable, it needs to know it is the right queue.
  glyphs(SCX + .92, SCY + .40, BZ, Math.PI, '登机口',
    { size: .085, gap: .02, color: DIM, mode: 1 });
  S.gateB = slotRun(SCX + .78, SCY + .04, BZ, Math.PI, 3,
    { size: .30, gap: .03, color: col.lime, mode: 1 });
  S.stB = slotRun(SCX - .62, SCY + .06, BZ, Math.PI, 3,
    { size: .195, gap: .035, color: col.lime, mode: 1 });
  S.noB = slotRun(SCX - .62, SCY - .34, BZ, Math.PI, 6,
    { size: .105, gap: -.026, color: col.boardOn, mode: 1 });

  // ================================================================ 2. 优先登机, the second lane
  //
  // A real boarding gate is two lanes, not one: the shell's rail is the cabin queue and this is
  // the one beside it. Stanchion-and-tape, the same 1.00 m post the hall repeats forty times, and
  // deliberately WITHOUT colliders — the shell's own `queueLine` lays none either, and a rope
  // barrier that stops the body is how the last 0.6 m of the approach to the podium disappears.
  //
  // It runs at z −4.90, between the seat rows (inflated to −4.96) and the cabin queue at −5.70,
  // and stops at 17.10 so it never crosses the walk-up lane at x 18.
  function railRun(x0, z0, x1, z1, n) {
    for (let i = 0; i <= n; i++) {
      const k = i / n, px = x0 + (x1 - x0) * k, pz = z0 + (z1 - z0) * k;
      cyl(px, .50, pz, .07, 1.00, col.steelD,
        { gloss: G.metal, ...M_METAL, matScale: 1.20 });
      cyl(px, .04, pz, .18, .07, col.charcoal, { gloss: .26 });
      if (i === n) break;
      const nx = x0 + (x1 - x0) * ((i + 1) / n), nz = z0 + (z1 - z0) * ((i + 1) / n);
      const len = Math.hypot(nx - px, nz - pz);
      cap((px + nx) / 2, .96, (pz + nz) / 2, .014, len, .014, C('#7c1f28'),
        { ry: Math.atan2(nx - px, nz - pz), rx: Math.PI / 2, gloss: .24 });
    }
  }
  railRun(17.10, -4.90, 14.60, -4.90, 3);
  // The lane's own sign, on a post at the mouth of it. Red tape and a red blade: in a Chinese
  // terminal the priority lane is the one marked in red, and the cabin queue's tape is black.
  cyl(17.30, .48, -4.90, .045, .96, col.steelD, { gloss: G.metal });
  box(17.30, 1.16, -4.90, .68, .34, .05, C('#8f2732'),
    { tag: '登机口', hard: true, gloss: .26, ...M_METAL, matScale: 1.10 });
  for (const s of [-1, 1]) {
    glyphs(17.30, 1.22, -4.90 + s * .032, s > 0 ? 0 : Math.PI, '优先登机',
      { size: .088, gap: .016, color: col.white, mode: 1 });
    glyphs(17.30, 1.10, -4.90 + s * .032, s > 0 ? 0 : Math.PI, 'PRIORITY',
      { size: .050, gap: .008, color: C('#e8c9c2'), mode: 1 });
  }

  // ================================================================ 3. the lounge seating
  //
  // The shell's airside rows stop at x 14.75. Everything from there to the +x wall — the whole
  // gate bay, the part of the hall the gate is actually in — was bare carpet, which is why
  // DC-lounge came back as a picture of the concourse opposite. These are the gate's own rows.
  //
  // Built to `seatRun`'s numbers exactly (0.62 pitch, 0.54 × 0.50 pan at 0.45, back at 0.70 with
  // rx −0.14, arms between) and with its materials, so they land in the batch the hall's existing
  // seats are already in instead of starting a new one. ry is 0 or π only: `seatRun` lays an
  // axis-aligned collider that ignores ry, so a row rotated to any other angle gets a collider
  // across the wrong axis — a sofa sealing a room from three metres away, invisible in a render.
  //
  // `arms` is the one departure from `seatRun`, and it is there to make the sleeper honest. A
  // seat pan tops out at 0.48 and an armrest occupies 0.495 .. 0.625, so a body lying across the
  // row at its natural 0.60 centre is threaded straight through two of them. Real airport rows
  // come both ways — dividers and plain benches — and the bench is precisely the one people
  // sleep on. The middle row is a bench; that is why somebody is asleep on it and not on the
  // other two.
  function seatRow(cx, cz, ry, n, c, arms = true) {
    const T = { ry, tag: '座椅' };
    const w = n * .62;
    for (const s of [-1, 1])
      box(cx + Math.cos(ry) * s * (w / 2 - .26), .20, cz - Math.sin(ry) * s * (w / 2 - .26),
        .12, .40, .50, col.steelD, { ...T, hard: true, gloss: G.metal, ...M_METAL });
    box(cx, .38, cz, w, .09, .18, col.steelD,
      { ...T, hard: true, gloss: G.metal, ...M_METAL });
    for (let i = 0; i < n; i++) {
      const o = -w / 2 + .31 + i * .62;
      const sx = cx + Math.cos(ry) * o, sz = cz - Math.sin(ry) * o;
      box(sx, .45, sz, .54, .06, .50, c,
        { ...T, hard: true, gloss: .34, mat: 'fabric', matScale: .34, matAmt: .22 });
      box(sx, .70, sz - Math.cos(ry) * .24, .54, .48, .06, c,
        { ...T, hard: true, rx: -.14, gloss: .34, mat: 'fabric', matScale: .34, matAmt: .22 });
      if (arms && i < n - 1)
        box(sx + Math.cos(ry) * .31, .56, sz - Math.sin(ry) * .31, .05, .13, .44,
          col.chrome, { ...T, hard: true, gloss: G.metal });
    }
    solid(cx - w / 2 - .1, cx + w / 2 + .1, cz - .36, cz + .36);
    A.shade(cx, cz, w + .4, 1.1, .22);
  }
  // Four to a row, not five. See the note on the 18.61 slot at the top of this file.
  // The middle row faces the concourse; the outer two face the aircraft, which is what a gate
  // bay does — you sit looking at the thing you are waiting for.
  //
  // WHICH WAY EACH ROW FACES IS A CAMERA DECISION, and it was got wrong once. A `ry` of 0 puts the
  // backrest at sz − 0.24, on the −z side; π puts it at sz + 0.24, on the +z side. Both of this
  // zone's cameras stand at +z and look −z, so a row at π presents its backrest to the lens and
  // everything seated on it is hidden below the shoulders — and, worse, so is everything on the
  // row behind it. The first cut had the sleeper on the middle row with a π row in front, and all
  // that survived was the coat and one ear: a brown plank floating over blue upholstery.
  //
  // So the near row is ry 0 and it is the bench, and the sleeper is on it. Row 0 keeps π because
  // it is the far row and a gate lounge does face the aeroplane; nothing sits behind it to hide.
  const ROWRY = [Math.PI, 0, 0];
  seatRow(SEAT_X, ROWZ[0], ROWRY[0], 4, col.seat);
  seatRow(SEAT_X, ROWZ[1], ROWRY[1], 4, col.seatD);
  seatRow(SEAT_X, ROWZ[2], ROWRY[2], 4, col.seat, false);   // the bench — see the sleeper below
  // Seat centres, for putting people and bags on real seats rather than between them.
  const seatAt = (row, k) => [SEAT_X + Math.cos(ROWRY[row]) * (-1.24 + .31 + k * .62), ROWZ[row]];

  // ================================================================ 4. who is in them
  //
  // `agent` and `passenger` live in js/airport.js and are not on `A`, so the figures here are
  // built from the shell's own seated proportions — shoulder 1.03, hips 0.50 over a 0.45 pan.
  const SKIN = C('#dfab7e'), HAIR = C('#241f1c');
  function sitter(px, pz, yaw, o) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const gx = Math.cos(yaw), gz = -Math.sin(yaw);
    const sh = 1.03, base = .50, hh = .74, reach = .22;
    const T = { tag: '座椅', ry: yaw };
    const F = { ...T, mode: 7, gloss: .06 };
    const St = { ...T, gloss: .16 };
    for (const s of [-1, 1]) {
      const lx = px + gx * s * .105, lz = pz + gz * s * .105;
      cap(lx + fx * .21, .545, lz + fz * .21, .078, .42, .078, o.legs, { ...F, rx: Math.PI / 2 });
      cap(lx + fx * .42, .28, lz + fz * .42, .070, .44, .070, o.legs, F);
      box(lx + fx * .46, .035, lz + fz * .46, .11, .07, .25, o.shoe, { ...T, gloss: .22 });
    }
    box(px, (base + sh - .07) / 2, pz, .40, sh - .07 - base, .25, o.uni, F);
    cap(px, sh, pz, .100, .40, .100, o.uni, { ...F, rz: Math.PI / 2 });
    cap(px + fx * .012, sh + .085, pz + fz * .012, .046, .13, .046, SKIN, St);
    const hy = sh + .20;
    ball(px + fx * .018, hy, pz + fz * .018, .092, .112, .098, SKIN, St);
    ball(px + fx * .004, hy + .030, pz + fz * .004, .096, .098, .102, o.hair || HAIR,
      { ...T, gloss: .18 });
    for (const s of [-1, 1]) {
      const ax = px + gx * s * .185, az = pz + gz * s * .185;
      const ez = .11, dy = sh - .05 - hh;
      cap(ax + fx * ez / 2, (sh - .05 + hh) / 2, az + fz * ez / 2, .062,
        Math.hypot(dy, ez), .062, o.uni, { ...F, rx: -Math.atan2(ez, dy) });
      cap(ax + fx * (ez + reach / 2), hh, az + fz * (ez + reach / 2), .056, reach, .056,
        o.uni, { ...F, rx: Math.PI / 2 });
      ball(ax + fx * (ez + reach + .045), hh, az + fz * (ez + reach + .045), .050, .042, .050,
        SKIN, St);
    }
    // A face, because both of this zone's cameras come at the rows from the front and a blank
    // head reads as a head that failed to load.
    const hcX = px + fx * .018, hcZ = pz + fz * .018;
    const dark = C('#2a2422'), eyew = C('#f1eee7');
    for (const s of [-1, 1]) {
      const ex = hcX + gx * s * .036 + fx * .088, ez2 = hcZ + gz * s * .036 + fz * .088;
      ball(ex, hy + .020, ez2, .017, .013, .010, eyew, { ...T, gloss: .28 });
      ball(ex + fx * .009, hy + .020, ez2 + fz * .009, .008, .008, .006, dark,
        { ...T, gloss: .34 });
    }
    ball(hcX + fx * .101, hy - .008, hcZ + fz * .101, .014, .025, .014, SKIN, St);
    A.shade(px + fx * .22, pz + fz * .22, .9, .9, .20);
  }

  // The one everybody has seen: somebody stretched out across three seats with the armrests up,
  // a bag for a pillow and a coat over them. Laid along the row's own axis so the body is on the
  // pans and not floating between them — the pan top is 0.48, so the torso rides at 0.60.
  //
  // Eyes closed, which on a figure this size is a line rather than a ball, and the reason the
  // head is turned into the seat backs: asleep is a posture, not a texture.
  function sleeper(cx, cz, dirX, o) {
    const T = { tag: '座椅' };
    const F = { ...T, mode: 7, gloss: .06 };
    const St = { ...T, gloss: .16 };
    const hx = cx + dirX * .58;                       // where the head is
    // torso and hips, lying along x
    cap(cx + dirX * .12, .60, cz, .125, .52, .125, o.uni, { ...F, rz: Math.PI / 2 });
    box(cx - dirX * .22, .57, cz, .30, .20, .30, o.uni, F);
    // legs, knees drawn up a little so 1.7 m of person fits across 1.86 m of seating
    for (const s of [-1, 1]) {
      cap(cx - dirX * .52, .58, cz + s * .085, .066, .40, .066, o.legs,
        { ...F, rz: Math.PI / 2 });
      cap(cx - dirX * .86, .52, cz + s * .095, .060, .32, .060, o.legs,
        { ...F, rz: Math.PI / 2 - .22 });
      box(cx - dirX * 1.02, .49, cz + s * .095, .22, .10, .11, o.shoe, { ...T, gloss: .22 });
    }
    // the arm folded in front, and the head on the bag
    cap(cx + dirX * .10, .70, cz + .16, .054, .34, .054, o.uni, { ...F, rz: Math.PI / 2 });
    // Face into the backrest, which on this row is at −z, so the back of the head is what both
    // cameras see and the hair has to be offset toward +z to be the side that shows. Offset it the
    // other way — as this did at first — and the lens gets a bare skin-coloured sphere with a dark
    // crescent behind it, which reads as a face with no features rather than as the back of a head.
    ball(hx, .68, cz, .098, .100, .094, SKIN, St);
    ball(hx + dirX * .010, .695, cz + .024, .102, .096, .100, o.hair || HAIR,
      { ...T, gloss: .18 });
    for (const s of [-1, 1])
      cap(hx + dirX * .080, .69, cz + s * .034, .005, .030, .005, C('#2a2422'),
        { ...T, rx: Math.PI / 2, gloss: .10 });
    // The bag under the head, and the coat over them — over the hips only, and 0.62 long rather
    // than the 0.96 it started at. A coat the length of the whole body is not a coat, it is a
    // plank: it covered the torso, both arms and the head's near side, and the sleeper read as a
    // brown board with an ear. Draped across the middle it leaves the shoulders and the drawn-up
    // knees showing, which is what says "person" rather than "luggage".
    box(hx + dirX * .18, .58, cz, .26, .20, .30, o.bag, { ...T, gloss: .26 });
    // The coat is two pieces, and the second one is what stops it reading as a plank. The hips box
    // tops out at 0.67 and the torso capsule at 0.725, so a single slab laid across them bridges
    // the two and hangs in the air over the gap between — which is exactly what the first cut
    // looked like at four times magnification. The main panel now sits ON the hips at 0.672, and a
    // shallow fold drops down the front edge to meet the seat pan, so the cloth has somewhere to
    // go instead of ending in mid-air.
    box(cx - dirX * .24, .672, cz + .01, .54, .042, .30, o.coat, { ...T, mode: 7, gloss: .06 });
    box(cx - dirX * .24, .585, cz + .155, .50, .14, .035, o.coat, { ...T, mode: 7, gloss: .06 });
    A.shade(cx, cz, 2.0, 1.0, .18);
  }

  // Three in the rows and one asleep. Scattered, never a full row: five identical seated props
  // in a line is worse than an empty row.
  //
  // The sleeper is on the middle row, which faces the concourse — so both cameras get the front
  // of them, and the coat reads against the darker seatD upholstery under it.
  // The former sleeper's bag and folded coat are fixtures, not body parts; retain them as
  // abandoned-seat detail while the living person is rendered by AirportAmbientCast.
  box(17.16, .58, -1.90, .26, .20, .30, C('#6d4a3c'), { tag:'座椅', gloss:.26 });
  box(16.16, .672, -1.89, .54, .042, .30, C('#7a4f42'),
    { tag:'座椅', mode:7, gloss:.06 });
  box(16.16, .585, -1.745, .50, .14, .035, C('#7a4f42'),
    { tag:'座椅', mode:7, gloss:.06 });

  // ---- what people put on the floor. `suitcase` is the shell's and not on `A`; these are the
  // same shape at the same 0.46 × 0.24 footprint, and deliberately without colliders — a bag
  // under a seat that stops the body would push the player out into the aisle to walk past it.
  function bag(cx, cz, ry, c, tall) {
    const T = { ry };
    box(cx, tall / 2 + .04, cz, .46, tall, .24, c, { ...T, gloss: .30 });
    box(cx, tall / 2 + .04, cz - .13, .34, tall - .16, .03, C('#2a2e33'), { ...T, gloss: .26 });
    cap(cx, tall + .18, cz, .022, .30, .022, col.charcoal, { ...T, gloss: .30 });
    for (const s of [-1, 1])
      cyl(cx + s * .17, .05, cz, .05, .04, C('#1d1c19'), { ...T, rz: Math.PI / 2, gloss: .24 });
    A.shade(cx, cz, .8, .6, .26);
  }
  // A case stands on the floor, not on the upholstery, so these go at the feet of the row rather
  // than "under" it: the pan reaches sz ± 0.25 and 0.48 clear of the row centre puts the case a
  // hand's width in front of somebody's shins, which is where a case at a gate actually is. Both
  // are in front of rows the cameras look at squarely — a bag behind a backrest is a bag nobody
  // ever sees.
  bag(seatAt(2, 3)[0], ROWZ[2] + .48, .18, C('#37506a'), .62);
  bag(seatAt(1, 1)[0], ROWZ[1] + .46, -.12, C('#4a4f58'), .70);
  // A cabin bag stood on its end at the priority rail, where somebody has left it while they
  // check their pocket for the 登机牌 they are still holding.
  bag(16.86, -5.18, .42, C('#6d4a3c'), .56);
  // Somebody's coat over a seat back, which is the other half of "occupied" — a row can be taken
  // without anybody in it. It straddles the backrest rather than hanging in front of the pan: the
  // rest on a ry-0 row stands at sz − 0.24 and its top edge is y 0.94, so 0.88 drapes it over the
  // top with a fold showing each side. On row 1, at the far end from the person sitting on it.
  box(seatAt(1, 3)[0], .88, ROWZ[1] - .24, .46, .28, .15, C('#41566b'),
    { tag: '座椅', mode: 7, gloss: .06 });

  // ================================================================ 5. the floor
  //
  // Flat quads, no colliders, no cost worth counting. The lane marking is the one piece of
  // wayfinding a gate has that a sign cannot do: it tells you which side of the podium to be on
  // before you are close enough to read anything.
  flat(16.60, .006, -5.30, 5.60, .14, C('#8f2732'), { mode: 9, gloss: .30 });
  flat(15.90, .006, -6.30, 7.00, .14, C('#5b6672'), { mode: 9, gloss: .30 });

  // ================================================================ 6. paint, and the tick
  //
  // NOTHING IS CACHED. `paint` asks the shell for the answer every time it runs and keeps none of
  // it, which is the whole of the PA ↔ screen agreement: there is no copy here to go stale.
  const EN = { ok: 'ON TIME', board: 'BOARDING', shut: 'GATE CLOSED', off: 'DEPARTED',
               gone: 'DEPARTED', late: 'DELAYED', cancel: 'CANCELLED' };
  const hhmm = m => {
    const w = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
  };
  // Which fields are alive while the gate is boarding, so the pulse below can find them without
  // touching the text. Filled by `paint`.
  let livePs = [], liveOn = false;
  function paint(mins) {
    // The same rule the shell's `setGate` uses with no boarding card in your pocket: the next
    // departure off this gate, so the two screens name the same flight.
    const f = A.nextFlight(mins);
    const s = A.statusOf(f, mins);
    const g = A.gateOf(f, mins);
    const boarding = s.code === 'board';
    S.gate(g, boarding ? col.lime : col.white);
    S.no(f.no, col.boardOn);
    S.to(f.to, col.white);
    S.st(s.zh, s.col);
    S.en(EN[s.code] || '', s.col);
    S.at(hhmm(f.dep + f.late), f.late ? col.rose : col.boardOn);
    S.gateB(g, boarding ? col.lime : col.white);
    S.stB(s.zh, s.col);
    S.noB(f.no, col.boardOn);
    // 登机顺序. `CALL` is the width of the whole call window; priority has the first ten minutes
    // of it and the cabin joins after, which is the order a gate actually boards in.
    const d = f.dep + f.late - mins;
    const on = [boarding, boarding && d <= CALL - 10];
    S.chip.forEach((gs, i) => { for (const p of gs) {
      p.color = on[i] ? col.lime : DIM; p.glow = on[i] ? .16 : 0;
    } });
    liveOn = boarding;
    livePs = boarding
      ? [...S.gate.ps, ...S.st.ps, ...S.gateB.ps, ...S.stB.ps,
         ...S.chip[0], ...(on[1] ? S.chip[1] : [])]
      : [];
    if (!boarding) for (const p of [...S.gate.ps, ...S.st.ps, ...S.gateB.ps, ...S.stB.ps])
      p.glow = .03;
  }

  // Registered on the builder, so the shell's dispatch finds it.
  //
  // The text is rewritten only when the game minute changes — `slotRun` short-circuits a repaint
  // that would write the same characters anyway, so this is cheap even when it does run. What
  // happens every frame is a single `glow` write per live glyph, which is a per-instance
  // attribute: it does not break the batch and it allocates nothing.
  let lastMin = null;
  AirFit['gate'].tick = (t, body, clock) => {
    if (typeof clock !== 'number') return;
    const m = Math.floor(clock);
    if (m !== lastMin) { lastMin = m; paint(m); }
    if (!liveOn) return;
    const k = .16 + .10 * (0.5 + 0.5 * Math.sin(t * 2.4));
    for (let i = 0; i < livePs.length; i++) livePs[i].glow = k;
  };
  // Painted once at build so the screen is never blank for the first frame — a shot taken before
  // the first tick would otherwise catch an empty board and report the fix as not landed.
  paint(10 * 60);
};
