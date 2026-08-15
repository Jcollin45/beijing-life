// 青禾银行 — the fictional bank frontage on the WEST footway, facing east.
//
// Mirrors js/street-hospital.js: a StreetFit district that skins a civic block as a real bank
// branch and gives a long pavement a second destination. The branch is one storey of
// banking hall under a small office mezzanine — wide, low, signed in the deep red and gold every
// Chinese municipal bank uses. Access is from the west-side pavement only; it does not extend the
// carriageway or the opposite pavement, so this building cannot become a way around the crossing.
//
// The street-side return point BANK_OUT (in js/bank.js) is the other half of the threshold the
// door inside the hall hands control back to.

(() => {
  'use strict';

  // The atlas is assembled after scripts load but before the lazy street scene is first built.
  try { Glyphs.need('青禾银行营业厅小时自助取款机自动柜员机存取款业务入口出口营业时间'); } catch (_) {}

  const lit = [], lamps = [], pools = [], entranceLeaves = [];
  let lastLight = -1;
  let lastTick = 0, doorOpen = 0;
  const remember = (p, day = .02, night = .34) => {
    p.glow = day; lit.push({ p, day, night }); return p;
  };

  StreetFit['bank'] = S => {
    const p0 = S.props.length;
    const { box, flat, glyphs, cap, glow, thing, light, C, G } = S;

    // ---------------------------------------------------------------- site and palette
    // The branch is a fitted address on the corner block's east elevation, facing the west
    // footway. Its north return stops at -7.75. The pharmacy begins at -6.25, leaving a measured
    // 1.50 m service/fire reveal between two complete end walls instead of a token 20 cm seam.
    // The road zone is unchanged: player centres stay x>=24.30 and the kerb remains x=27.50.
    const FACE = 23.42;
    const Z0 = -11.40, Z1 = -7.75, MID = (Z0 + Z1) / 2, EDZ = -9.30;
    const TAG = { tag: '银行' };

    const STONE = C('#dcd6c8'), STONE2 = C('#c4bdad'), STONED = C('#8a8378');
    const WHITE = C('#f2ecde');
    const REDD = C('#6e1c17'), REDL = C('#c4493f');
    const GOLD = C('#c4982f'), GOLDL = C('#e0b850');
    const GLASS = C('#9bb8c4'), GLASSD = C('#203744'), LOBBY = C('#dfeaf0');
    const STEEL = C('#6c7378'), WARM = C('#ffe3b4'), SHADOW = C('#18272e');
    const PLASTER = { mat: 'plaster', matScale: 2.8, matAmt: .13 };

    const faceText = (y, z, text, size, color, o = {}) =>
      glyphs(o.x ?? FACE + .405, y, z, Math.PI / 2, text,
        { size, gap: o.gap ?? size * .20, color, mode: 1, lift: .012,
          glow: o.glow ?? .035, gloss: .16, tag: o.tag || '银行' });

    // ---------------------------------------------------------------- returned shopfront
    // The corner block already supplies the deep wall. This fit supplies the pieces a real
    // frontage needs: two end returns, a load-bearing head, a plinth and intermediate mullions.
    // The glazing is 18 cm behind the returned face, enough to hold a stable shadow line without
    // pretending a second building has been pasted over the first.
    const FW = Z1 - Z0;
    box(FACE + .02, .30, MID, .48, .60, FW, STONED,
      { hard: true, mode: 9, gloss: .20, ...TAG });
    for (const z of [Z0 + .18, Z1 - .18])
      box(FACE + .02, 2.08, z, .56, 4.16, .36, STONE,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    box(FACE + .02, 3.72, MID, .56, .88, FW, STONE,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    for (const z of [EDZ - .69, EDZ + .69])
      box(FACE + .08, 1.58, z, .46, 2.98, .14, STONE2,
        { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });

    // Two recessed hall windows. One looks onto the staffed hall; the smaller northern bay is a
    // genuine ATM vestibule rather than another anonymous blue rectangle.
    const hallZ = (Z0 + EDZ - .78) / 2, hallW = EDZ - .78 - Z0 - .38;
    box(FACE + .035, 1.64, hallZ, .08, 2.74, hallW, SHADOW,
      { hard: true, mode: 1, gloss: .18, ...TAG });
    const hallPane = box(FACE + .105, 1.64, hallZ, .035, 2.66, hallW - .12, GLASS,
      { hard: true, mode: 1, alpha: .42, gloss: G.glass, ...TAG });
    remember(hallPane, .025, .22);
    for (const y of [.54, 1.18])
      box(FACE + .055, y, hallZ, .10, .055, hallW - .22, GOLD,
        { hard: true, gloss: G.paint, ...TAG });

    const ATMZ = (EDZ + .78 + Z1) / 2, ATMW = Z1 - (EDZ + .78) - .34;
    box(FACE + .035, 1.48, ATMZ, .08, 2.42, ATMW, SHADOW,
      { hard: true, mode: 1, gloss: .18, tag: '取款机' });
    const atmPane = box(FACE + .105, 1.48, ATMZ, .035, 2.34, ATMW - .10, GLASS,
      { hard: true, mode: 1, alpha: .38, gloss: G.glass, tag: '取款机' });
    remember(atmPane, .025, .19);
    box(FACE + .125, 1.28, ATMZ, .08, 1.34, Math.max(.28, ATMW - .22), STEEL,
      { hard: true, gloss: G.metal, tag: '取款机' });
    remember(box(FACE + .175, 1.50, ATMZ, .025, .32, Math.max(.20, ATMW - .34), C('#78b7bb'),
      { hard: true, mode: 1, glow: .08, tag: '取款机' }), .05, .34);

    // ---------------------------------------------------------------- recessed automatic entrance
    const lobbyBack = box(FACE + .028, 1.48, EDZ, .06, 2.72, 1.22, LOBBY,
      { hard: true, mode: 1, glow: .035, tag: '门' });
    remember(lobbyBack, .035, .25);
    flat(FACE + .31, .020, EDZ, .62, 1.28, STONE2, { gloss: .20, tag: '门' });
    box(FACE + .115, 2.82, EDZ, .42, .18, 1.38, STONED,
      { hard: true, gloss: .24, tag: '门' });
    for (const s of [-1, 1]) {
      const p = box(FACE + .115, 1.48, EDZ + s * .31, .04, 2.66, .58, GLASS,
        { hard: true, mode: 1, alpha: .42, gloss: G.glass, tag: '门' });
      p.ob = null; p.fixed = true; p.cx = FACE + .115; p.cy = 1.48; p.cz = EDZ + s * .31;
      p.r = 1.70;
      entranceLeaves.push({ p, s, m0: p.m });
      cap(FACE + .155, 1.30, EDZ + s * .16, .018, .52, .018, STEEL,
        { rx: Math.PI / 2, gloss: G.metal, tag: '门' });
    }
    box(FACE + .17, 1.48, EDZ, .08, 2.76, .065, STEEL,
      { hard: true, gloss: G.metal, tag: '门' });

    // A shallow glass rain hood protects only the threshold. It leaves the stone headwall and
    // both addresses visible from BANK_OUT instead of turning the whole bay into one red slab.
    const hood = box(FACE + .43, 2.98, EDZ, .66, .055, 1.48, GLASS,
      { hard: true, mode: 1, alpha: .36, gloss: G.glass, tag: '门' });
    remember(hood, .012, .12);
    for (const z of [EDZ - .60, EDZ + .60])
      cap(FACE + .20, 2.82, z, .025, .52, .025, STEEL,
        { rz: -Math.PI / 5, gloss: G.metal, tag: '门' });

    // Restrained identity: a narrow corporate band fixed to the real headwall, with secondary
    // information on the glazing instead of a second luminous billboard.
    remember(box(FACE + .30, 3.69, MID, .12, .48, FW - .42, REDD,
      { hard: true, mode: 1, glow: .018, gloss: .24, ...TAG }), .018, .20);
    // Stand the identity proud of the fascia face. At FACE+.345 the glyph planes were 15 mm
    // inside the red band and disappeared entirely through depth testing in the real camera.
    faceText(3.74, MID - .18, '青禾银行', .295, WHITE,
      { tag: '银行', gap: .060, glow: .055 });
    faceText(3.43, MID - .18, '营业厅', .105, GOLDL, { tag: '银行' });
    // Secondary copy is vinyl on the ATM glass, not part of the proud stone identity band. The
    // shared fascia datum formerly held it about 30 cm off the pane in empty air.
    faceText(2.22, ATMZ, '24小时', .075, WHITE, { tag: '取款机', x: FACE + .121 });
    faceText(2.04, ATMZ, '自助银行', .060, GOLDL, { tag: '取款机', x: FACE + .121 });
    box(FACE + .285, 3.69, Z0 + .46, .14, .31, .31, REDL,
      { hard: true, mode: 1, gloss: .25, ...TAG });

    // A pair of separately framed office windows ties the branch into the mixed-use block above.
    // Render remains visible between them; there is no second full-height skin or pasted-on box.
    box(FACE + .03, 4.34, MID, .30, .20, FW - .22, STONE2,
      { hard: true, gloss: G.paint, ...PLASTER, ...TAG });
    for (const z of [MID - .90, MID + .90]) {
      box(FACE + .035, 5.52, z, .08, 1.72, 1.18, GLASSD,
        { hard: true, gloss: .24, ...TAG });
      const upper = box(FACE + .095, 5.52, z, .035, 1.56, 1.02, GLASS,
        { hard: true, mode: 1, alpha: .40, gloss: G.glass, ...TAG });
      remember(upper, .012, z < MID ? .15 : .07);
      for (const dz of [-.57, .57])
        box(FACE + .14, 5.52, z + dz, .22, 1.84, .12, STONE2,
          { hard: true, gloss: G.paint, ...PLASTER, ...TAG });
      for (const y of [4.62, 6.42])
        box(FACE + .14, y, z, .22, .12, 1.26, STONE2,
          { hard: true, gloss: G.paint, ...PLASTER, ...TAG });
    }

    // ---------------------------------------------------------------- lighting (per-clock)
    // Warm downlights in the returned head and a compact pool on the pavement, lit after dark.
    if (typeof light === 'function') {
      for (const z of [hallZ, EDZ, ATMZ]) {
        const lm = light(FACE + .58, 2.92, z, [.9, .72, .42], .38, 3.8);
        lm.on = false; lamps.push(lm);
      }
    }
    pools.push({ g: glow(M.trs(FACE + .92, .032, EDZ, 0, 2.0, 1, 3.1), WARM, 0), a: .16 });

    // ---------------------------------------------------------------- the door thing
    // The street-side half of the threshold. Inside, js/bank.js's 门 sets .exit back to BANK_OUT.
    thing('银行', FACE + 1.0, 2.0, EDZ, '我进去办点事。',
      'I am going in to do some business.',
      '银行 bank. 办事 to handle business.',
      { tag: '银行', focus: [24.74, -8.08], reach: 2.35 }).exit =
        { place: 'bank', at: { x: 0, z: -10, yaw: 0 } };

    // record the OUT point on the street for the hall to read back
    S.BANK_OUT = BANK_OUT;

    // ---------------------------------------------------------------- the per-clock pass
    // Lit once per lighting change, not per frame. Sets the remembered panes to their night glow
    // and switches the lamps on after dark. The street shell calls this.
    const applyLight = (k) => {
      const night = k > .5;
      for (const q of lit) q.p.glow = night ? q.night : q.day;
      for (const lm of lamps) lm.on = night;
      for (const q of pools) q.g.a = night ? q.a : 0;
    };
    S.bankLit = applyLight;
    StreetFit['bank']._applyLight = applyLight;

    StreetFit['bank'].propCount = S.props.length - p0;
  };

  StreetFit['bank'].tick = (t, body, mins) => {
    const dt = lastTick ? Math.min(.20, Math.max(0, t - lastTick)) : 0;
    lastTick = t;
    const px = body && Number.isFinite(body.x) ? body.x : 99;
    const pz = body && Number.isFinite(body.z) ? body.z : 99;
    const near = Math.abs(px - BANK_OUT.x) < 3.0 && Math.abs(pz - BANK_OUT.z) < 2.7;
    const target = near ? 1 : 0;
    doorOpen += (target - doorOpen) * (1 - Math.exp(-dt * (target ? 7.0 : 4.2)));
    if (Math.abs(target - doorOpen) < .001) doorOpen = target;
    for (const q of entranceLeaves)
      q.p.m = M.mul(M.trans(0, 0, q.s * .52 * doorOpen), q.m0);

    // District lighting follows the game clock, but only rewrites the façade when day/night
    // actually crosses a boundary.
    if (mins !== undefined) {
      const h = (mins / 60) % 24;
      const night = h < 6.25 || h >= 18.5 ? 1 : 0;
      if (night !== lastLight) {
        lastLight = night;
        const fn = StreetFit['bank'] && StreetFit['bank']._applyLight;
        if (fn) fn(night);
      }
    }
  };
})();
