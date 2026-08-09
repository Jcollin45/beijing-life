// 北京银行 — the bank frontage on the far side of the business-district road.
//
// Mirrors js/street-hospital.js: a StreetFit district that skins the west-side civic block as a
// real bank branch and gives the long pavement a second destination. The branch is one storey of
// banking hall under a small office mezzanine — wide, low, signed in the deep red and gold every
// Chinese municipal bank uses. Access is from the west-side pavement only; it does not extend the
// carriageway or the opposite pavement, so this building cannot become a way around the crossing.
//
// The street-side return point BANK_OUT (in js/bank.js) is the other half of the threshold the
// door inside the hall hands control back to.

(() => {
  'use strict';

  // The atlas is assembled after scripts load but before the lazy street scene is first built.
  try { Glyphs.need('北京银行营业厅小时自助取款机自动柜员机存取款业务入口出口营业时间'); } catch (_) {}

  const lit = [], lamps = [], pools = [], entranceLeaves = [];
  let lastLight = -1;
  let lastTick = 0, doorOpen = 0;
  const remember = (p, day = .02, night = .34) => {
    p.glow = day; lit.push({ p, day, night }); return p;
  };

  StreetFit['bank'] = S => {
    const p0 = S.props.length;
    const { box, cyl, flat, glyphs, cap, blocker, shade, glow,
            thing, light, C, G, col } = S;

    // ---------------------------------------------------------------- site and palette
    // The procedural parade stands at x=41.6 and faces west.  A 4.3 m bay between the mall and
    // office entrances was the one unnamed shopfront left on this pavement, so the branch skins
    // that bay instead of inventing a second, unreachable street outside the scene bounds.
    const FACE = 40.55;
    const Z0 = -4.35, Z1 = -.05, MID = -2.20;
    const TAG = { tag: '银行' };

    const STONE = C('#dcd6c8'), STONE2 = C('#c4bdad'), STONED = C('#8a8378');
    const WHITE = C('#f2ecde'), INK = C('#22272b');
    const RED = C('#9c2a22'), REDD = C('#6e1c17'), REDL = C('#c4493f');
    const GOLD = C('#c4982f'), GOLDL = C('#e0b850');
    const GLASS = C('#9bb8c4'), GLASSD = C('#203744'), LOBBY = C('#dfeaf0');
    const STEEL = C('#6c7378'), WARM = C('#ffe3b4');
    const PLASTER = { mat: 'plaster', matScale: 2.8, matAmt: .13 };

    const faceText = (y, z, text, size, color, o = {}) =>
      glyphs(FACE - .105, y, z, -Math.PI / 2, text,
        { size, gap: size * .20, color, mode: 1, lift: .009, tag: o.tag || '银行' });

    // ---------------------------------------------------------------- the opaque skin
    // One stone skin over the whole block, so the bank reads as one building, not a skin over the
    // anonymous civic windows. Mode 14 is the painted-render flank the hospital uses.
    box(FACE + .14, 6.80, MID, .28, 6.40, Z1 - Z0, STONE,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });
    for(const z of [Z0+.38,Z1-.38])
      box(FACE+.14,1.80,z,.28,3.60,.76,STONE,
        {hard:true,mode:14,gloss:G.paint,...PLASTER,...TAG});
    box(FACE - .015, .46, MID, .16, .92, Z1 - Z0 + .20, STONED,
      { hard: true, mode: 9, gloss: .20, ...TAG });
    // a short office mezzanine above the hall
    box(FACE + .10, 8.60, MID, .20, 3.20, Z1 - Z0, STONE2,
      { hard: true, mode: 14, gloss: G.paint, ...PLASTER, ...TAG });

    // ---------------------------------------------------------------- the banking-hall glazing
    // A Chinese bank branch is mostly glass at street level — the hall is a lit display of itself.
    // Wide bays of dark glass with lit panes, a gold spandrel band carrying the floor rhythm.
    const bayZ = [-3.55, -0.85];
    for (const z of bayZ) {
      box(FACE - .035, 2.40, z, .10, 3.60, .78, GLASSD, { hard: true, gloss: .24, ...TAG });
      const pane = box(FACE - .095, 2.40, z, .035, 3.40, .62, GLASS,
        { hard: true, mode: 1, gloss: G.glass, ...TAG });
      remember(pane, .025, .16 + ((z * 7) % 3) * .04);
      // the gold spandrel band under each bay
      box(FACE - .12, .60, z, .20, .10, .82, GOLD, { hard: true, gloss: G.paint, ...TAG });
    }
    // the mezzanine windows — smaller, staggered warmth at night
    const upperZ = [-3.35, -1.05];
    for (const z of upperZ) {
      box(FACE - .025, 8.30, z, .09, 1.60, 2.60, GLASSD, { hard: true, gloss: .24, ...TAG });
      const p = box(FACE - .082, 8.30, z, .028, 1.40, 2.40,
        (z * 3) % 2 ? LOBBY : GLASS, { hard: true, mode: 1, gloss: G.glass, ...TAG });
      remember(p, .012, ((z * 5) % 4) ? .18 : .05);
    }
    // a continuous gold cornice between hall and mezzanine
    box(FACE - .04, 6.40, MID, .18, .30, Z1 - Z0, GOLD, { hard: true, gloss: G.paint, ...TAG });

    // ---------------------------------------------------------------- the entrance
    // A recessed doorway in the centre of the hall glazing: two automatic leaves, a canopy, the
    // red municipal-bank name over it. The thing hands control to the bank scene.
    const EDZ = MID;
    // A metre-deep vestibule survives behind the moving glass.  The old procedural shopfront is
    // still farther back at x=41.6; the floor, cool-lit rear wall and queue posts here hide it and
    // make an opened doorway read as somewhere the player can enter, not stone behind glass.
    flat(FACE+.50,.020,EDZ,1.25,2.46,STONE2,{gloss:.20,tag:'门'});
    const lobbyBack=box(FACE+1.02,1.48,EDZ,.06,2.82,2.50,LOBBY,
      {hard:true,mode:1,glow:.06,tag:'门'});
    remember(lobbyBack,.035,.28);
    for(const z of [EDZ-.72,EDZ+.72]) {
      cyl(FACE+.66,.47,z,.030,.94,STEEL,{gloss:G.metal,tag:'门'});
      box(FACE+.66,.91,z,.08,.05,.62,RED,{hard:true,mode:1,tag:'门'});
    }
    for (const s of [-1, 1]) {
      const p = box(FACE - .12, 1.50, EDZ + s * .62, .04, 2.80, 1.16, GLASS,
        { hard: true, mode: 1, alpha: .38, gloss: G.glass, tag: '门' });
      p.ob = null; p.fixed = true; p.cx = FACE - .12; p.cy = 1.50; p.cz = EDZ + s * .62;
      p.r = 2.15;
      entranceLeaves.push({ p, s, m0: p.m });
    }
    // canopy
    box(FACE - .30, 3.10, EDZ, 1.00, .12, 4.20, REDD,
      { hard: true, gloss: G.paint, tag: '门' });
    remember(box(FACE - .36, 3.04, EDZ, .90, .04, 4.00, REDL,
      { hard: true, mode: 1, glow: .30, tag: '门' }), .04, .50);
    // the name, large, gold on red — the sign every Chinese bank has
    faceText(2.70, EDZ, '北京银行', .34, GOLDL, { tag: '门' });
    faceText(2.18, EDZ, '营业厅', .16, WHITE, { tag: '门' });
    // the 24小时 ATM sign to one side of the door
    faceText(1.80, EDZ + 1.55, '24 小时自助银行', .13, REDL, { tag: '取款机' });

    // two stone lions flanking the door — every Chinese bank has them
    for (const s of [-1, 1]) {
      const lx = FACE - .50, lz = EDZ + s * 1.70;
      box(lx, .40, lz, .50, .50, .80, STONE, { hard: true, mode: 9, gloss: .14, tag: '石狮子' });
      box(lx, .78, lz, .34, .30, .50, STONE2, { hard: true, mode: 9, gloss: .14, tag: '石狮子' });
      cyl(lx, .92, lz, .12, .20, STONE2, { mode: 9, gloss: .14, tag: '石狮子' });
    }

    // ---------------------------------------------------------------- lighting (per-clock)
    // Warm downlights under the canopy and a pool on the pavement, lit only after dark.
    if (typeof light === 'function') {
      for (const z of [EDZ - 1.45, EDZ, EDZ + 1.45]) {
        const lm = light(FACE - .70, 3.0, z, [.9, .72, .42], .50, 4.8);
        lm.on = false; lamps.push(lm);
      }
    }
    pools.push({ g: glow(M.trs(FACE - 1.05, .032, EDZ, 0, 2.8, 1, 4.8), WARM, 0), a: .20 });

    // ---------------------------------------------------------------- the door thing
    // The street-side half of the threshold. Inside, js/bank.js's 门 sets .exit back to BANK_OUT.
    thing('银行', FACE - 1.0, 2.0, EDZ, '我进去办点事。',
      'I am going in to do some business.',
      '银行 bank. 办事 to handle business.',
      { tag: '银行', focus: [BANK_OUT.x, BANK_OUT.z], reach: 2.6 }).exit =
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
      q.p.m = M.mul(M.trans(0, 0, q.s * .72 * doorOpen), q.m0);

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
