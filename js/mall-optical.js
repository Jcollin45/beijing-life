// 眼镜店 · 明视眼镜 · MINGSHI OPTICAL — floor 1
//
// This tenant's fit-out. Registering a function here overrides the inline `fit` still sitting in
// js/mall.js (see MallFit at the top of that file), so the two can be compared and the old one
// stays as the fallback until this is better than it.
//
// The callback is handed `A`, the shop's own local frame and toolkit. Coordinates are (a, b):
// `a` is depth measured inward from the outside wall, 0 at the back and 4.8 at the shopfront;
// `b` runs along the frontage, 0 at the centre and +/- half the unit's length at the ends. `y`
// is height above this shop's own floor, so the same numbers work on any deck.
//
//   A.put(a,b,w,dp,h,y,colour,opt)   a box. `w` is its size along a, `dp` its size along b
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface, facing out towards the concourse
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.th(hz,a,b,zh,en,note,reach,y)  a word to look at; the player is walked to a+1.15
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What an optician is, as a room.
//
// Three trades share one 7.6 x 4.8 m unit and each of them wants a different kind of surface, so
// the plan is read off that rather than off a furniture list:
//
//   * selling frames is a *wall* trade. Frames stand in rows on lit shelves at eye height and the
//     customer walks the wall picking them off it. So every wall that is not doing something else
//     carries a bay: the back-right one and the rear of both partitions, each of them a base unit,
//     a dark backing panel and three or four lit shelves. Two of them end in a mirror, because you
//     cannot choose a frame without one.
//   * testing eyes is a *depth* trade — it needs a lit chart and a machine you sit up to, which is
//     why it takes the back-left bay where nobody walking past can stand in the sightline.
//   * dispensing is a *desk* trade: two people sitting across a worktop with a tray of lenses on
//     it. That goes in the open floor on the right, where it can be seen from the concourse.
//
// The till lands front-left, opposite the desk, and the middle is deliberately left as a walk with
// one low island in it. An optician that is crowded reads as a market stall.
//
// ---------------------------------------------------------------------------------------------
// Three things drive every material and value choice in here, and all three were learned from
// renders of the first version of this file rather than reasoned out in advance.
//
//   1. The frames need something to be seen *against*. Forty pale acetate fronts on a pale plaster
//      wall are forty invisible objects: at three metres the whole board read as an empty panel
//      with some grey smudges on it. Every run of frames now stands on a dark jade backing, which
//      is what a real optician does, for the same reason.
//   2. The screen-space occlusion in this renderer takes a blurred copy of whatever stands proud
//      of a flat surface and lays it back down on that surface. A wall of small objects a few
//      centimetres off a large *pale* plane is its worst case, and the panel behind this shop's
//      frames came out looking like a photograph of a boiler room, with the haze spilling over the
//      whole frame. On a dark backing the same artefact is invisible, because a grey smudge on a
//      dark panel simply reads as shadow. Nothing here compensates for it — the geometry stops
//      feeding it.
//   3. Every lit surface is bloomed additively and this shop had a square metre and a half of
//      glowing lightbox in it. The chart is now the size a real chart is, the headers are 90 mm
//      bands rather than panels, the shelf lights are 8 mm lines, and the mirrors do not glow at
//      all — a mirror that emits light is the one thing a mirror never does.
//
// The shell hands this shop a jade-green carpet and warm plaster walls, so the joinery is light
// oak over a black plinth and everything precise is steel: `steel` is the only tiling map in the
// set whose mean is 0.22, which is to say the only one that does not change the colour it is put
// on. The shader does `base *= mix(1.0, texel/0.22, matAmt)`, so plaster (x2.33 at full amount) is
// used at matAmt .14 over a deliberately under-cooked grey.

// ===============================================================================================
// 明视眼镜 · the sight test, the prescription, and everything that follows from it
//
// An optician is the one shop in this building where the thing you leave with does not exist when
// you walk in. Somebody measures you, you choose four things, they make it, and you come back for
// it. All four of those steps are here, and they are here in that order, because the order is the
// whole shape of the trade:
//
//   验光    a sight test you can be good or bad at. Six rounds of a tumbling E on the lower half
//           of the chart; each round names one of 上 下 左 右 and lights the lamp under it, the E
//           turns, and you press while it is pointing the way you were told. Halfway through it
//           drops to a third of the size and the rate steps up every round, so the last two are
//           genuinely hard. Two sizes and not six, because each one is sixteen permanently
//           dynamic props in the heaviest room in the game — see the note at the panel itself.
//   验光单  a prescription generated from how you did. Six right is 5.1 in both eyes and no
//           glasses needed; nothing right is −4.50, and everything between is between.
//   镜框 · 镜片 · 染色 · 镀膜   four choices, each one a price, each one a run of lamps on the front
//           edge of the island with the chosen one lit. What you are wearing is previewed on your
//           own face, not on a head form: `试戴` sets `window.__game.PLAYER.glasses`, which is what
//           js/figure.js draws a real pair off. It is one boolean, so all six frames preview as the
//           same dark pair — REQUESTS at the foot of this file says what would fix that.
//   配镜 → 取镜   an hour's wait, and the finished pair appears in the collection tray on the till
//           when it is genuinely collectable rather than when it was ordered. `{ day, at }` lives
//           in this shop's own localStorage record, so it survives the tab closing; REQUESTS again
//           for where it should live instead.
//   调整    free adjustment on a pair of your own, and the one time they find the hinge loose, a
//           paid repair. Both at the frame warmer on the fitting desk.
//
// The wiring is the same as the electronics shop next door and for the same two reasons: verbs are
// getters on `USE_AT.mall` so a definition can answer differently depending on what has already
// happened, and completion is read off the game's own `#doing` panel because a tenant file cannot
// add a branch to the dispatcher that would otherwise tell it. Both are documented at length in
// js/mall-digital.js; the notes are not repeated here.
//
// Directions on this wall are worked out rather than guessed. The unit is on the east wall, so
// `A.at(a,b)` gives x = 23 − a and z = b − ½: a customer looking at the back wall is facing +x,
// their up is +y, and right = forward × up = +z, which is +b. So 右 is +b and 左 is −b — get that
// backwards and every answer in the test is wrong in a way no render will show you.
//
// Nothing here is a real brand. 明视 is the shop, and the six frames are described by what they
// are made of and what shape they are, which is how an optician's own shelf tickets read anyway.
const MallOptical = (() => {
  // ---------------------------------------------------------------- the test
  const ROUNDS = 6;
  // How big the E is, in metres, and how fast it turns, per round. The last two sizes are 6.4 and
  // 5.0 cm at about 1.6 m, which is genuinely small and is meant to be.
  const SIZE = [.150, .122, .098, .078, .062, .049];
  const RATE = [1.00, 1.15, 1.32, 1.50, 1.70, 1.90];
  // 0 上, 1 下, 2 左, 3 右 — and the axis each of them moves the E's arms along.
  const DIRS = [
    { hz:'上', py:'shàng', en:'up' },
    { hz:'下', py:'xià', en:'down' },
    { hz:'左', py:'zuǒ', en:'left' },
    { hz:'右', py:'yòu', en:'right' },
  ];
  // Which way the E is pointing at absolute time `t` in a given round. A plain cycle would be
  // 上下左右上下左右 and could be answered with a stopwatch instead of an eye, so the step index is
  // hashed. Same input, same answer — the panel and the scoring cannot disagree.
  function dirAt(t, round) {
    const step = Math.floor(t * RATE[Math.min(round, RATE.length - 1)]);
    let h = (step + 1) * 2654435761 >>> 0;
    h ^= h >>> 13; h = (h * 1274126177) >>> 0;
    return (h >>> 7) % 4;
  }
  // Which direction you are asked for in a given round: also fixed, so the lit word on the panel
  // and the sentence in the walk-up prompt are the same word.
  const targetOf = round => [3, 1, 2, 0, 3, 2][round % 6];

  // ---------------------------------------------------------------- what there is to choose
  const FRAMES = [
    { hz:'板材全框', py:'bǎncái quánkuàng', en:'a full acetate rim', price:280, c:0, look:'#1d2228' },
    { hz:'钛合金半框', py:'tài héjīn bànkuàng', en:'a titanium half-rim', price:520, c:3, look:'#9aa6b2' },
    { hz:'无框', py:'wúkuàng', en:'rimless', price:460, c:7, look:'#e6dcc6' },
    { hz:'圆框', py:'yuánkuàng', en:'a round frame', price:320, c:1, look:'#7a4c28' },
    { hz:'猫眼', py:'māoyǎn', en:'a cat-eye frame', price:380, c:5, look:'#b45e55' },
    { hz:'儿童框', py:'értóngkuàng', en:'a children’s frame', price:180, c:6, look:'#48907e' },
  ];
  const LENSES = [
    { hz:'1.56标准片', py:'yāo diǎn wǔliù biāozhǔn piàn', en:'standard 1.56 lenses', price:120,
      note:'厚 — thickest of the three' },
    { hz:'1.61轻薄片', py:'yāo diǎn liùyāo qīngbáo piàn', en:'thinner 1.61 lenses', price:260,
      note:'薄一点 — noticeably slimmer at the edge' },
    { hz:'1.67超薄片', py:'yāo diǎn liùqī chāobáo piàn', en:'ultra-thin 1.67 lenses', price:480,
      note:'最薄 — the thinnest, and it shows on a strong prescription' },
  ];
  const TINTS = [
    { hz:'无色', py:'wúsè', en:'clear', price:0 },
    { hz:'浅茶色', py:'qiǎn chásè', en:'a light brown tint', price:60 },
    { hz:'变色片', py:'biànsè piàn', en:'photochromic — clear indoors, dark outside', price:220 },
  ];
  const COATS = [
    { hz:'普通膜', py:'pǔtōng mó', en:'a plain coating', price:0 },
    { hz:'防蓝光', py:'fáng lánguāng', en:'a blue-light filter', price:90 },
    { hz:'防雾膜', py:'fáng wù mó', en:'an anti-fog coating', price:140 },
  ];
  const ADJUST_PRICE = 0, REPAIR_PRICE = 40;

  // ---------------------------------------------------------------- state
  const KEY = 'bjlife.mall.optical.v1';
  const blank = () => ({
    day: 0, frame: 0, lens: 0, tint: 0, coat: 0,
    test: { round: 0, hits: 0, done: false },
    rx: null,             // { r, l, cyl, va }        the prescription, once tested
    order: null,          // { no, total, day, at }   placed, and when it can be collected
    owned: null,          // { frame, lens, tint, coat, total }
    adjusts: 0, repairs: 0, orders: 0,
  });
  let S = blank(), day = 0, mins = 12 * 60;

  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object')
        S = { ...blank(), ...raw, test: { ...blank().test, ...(raw.test || {}) } };
    } catch (_) { /* private window, or half-written JSON. Start clean. */ }
  }
  function persist() {
    S.day = day;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* full — not fatal */ }
  }
  // A save from a life that has been started over would leave a collection slip for a day that
  // will never come round again, so anything from the future is thrown away rather than honoured.
  function reconcile(d) {
    if (!Number.isFinite(d)) return;
    day = d;
    if (S.day > d + 1) { S = blank(); S.day = d; persist(); }
  }
  const due = q => !!q && (day > q.day || (day === q.day && mins >= q.at));
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m) % 60).padStart(2, '0')}`;
  const total = () => FRAMES[S.frame].price + LENSES[S.lens].price + TINTS[S.tint].price + COATS[S.coat].price;

  // ---------------------------------------------------------------- the test, as played
  function shoot(t) {
    const T = S.test;
    if (T.done) { T.round = 0; T.hits = 0; T.done = false; }
    const shown = dirAt(t, T.round), want = targetOf(T.round);
    const right = shown === want;
    if (right) T.hits++;
    T.round++;
    if (T.round >= ROUNDS) { T.done = true; writeRx(); }
    persist();
    return { right, shown: DIRS[shown], want: DIRS[want], round: T.round, hits: T.hits };
  }
  // Six right is a pair of eyes that do not need us; none right is −4.50. The left is a quarter of
  // a dioptre behind the right, which is the commonest way a real pair of eyes differs, and the
  // cylinder is only written when there is something to write it on.
  function writeRx() {
    const miss = ROUNDS - S.test.hits;
    const r = [0, -0.75, -1.50, -2.25, -3.00, -3.75, -4.50][Math.min(miss, 6)];
    const va = [5.1, 5.0, 4.9, 4.8, 4.7, 4.6, 4.5][Math.min(miss, 6)];
    S.rx = { r, l: r ? +(r - 0.25).toFixed(2) : 0, cyl: miss >= 3 ? -0.50 : 0, va,
             hits: S.test.hits, day };
    persist();
    return S.rx;
  }
  const dio = v => (v > 0 ? '+' : '') + v.toFixed(2);
  function rxLine() {
    if (!S.rx) return ['还没验光。', 'Your eyes have not been tested yet.'];
    if (!S.rx.r) return [`视力${S.rx.va.toFixed(1)}，两只眼睛都不用配镜。`,
      `Acuity ${S.rx.va.toFixed(1)} — neither eye needs a lens.`];
    return [`右眼${dio(S.rx.r)}，左眼${dio(S.rx.l)}${S.rx.cyl ? `，散光${dio(S.rx.cyl)}` : ''}。`,
      `Right ${dio(S.rx.r)}, left ${dio(S.rx.l)}${S.rx.cyl ? `, cylinder ${dio(S.rx.cyl)}` : ''}.`];
  }

  // ---------------------------------------------------------------- ordering and collecting
  function order() {
    if (S.order) return S.order;
    const t = total();
    S.order = { no: 'P' + (2100 + (S.orders * 7 + day * 3) % 800), total: t,
                frame: S.frame, lens: S.lens, tint: S.tint, coat: S.coat,
                day, at: Math.min(mins + 60, 24 * 60 - 1) };
    // An order placed at 21:40 is not ready at 22:40 in a shop that shuts at 22:00, so it rolls
    // to ten the next morning rather than becoming collectable at a locked door.
    if (S.order.at >= 21 * 60 + 30) { S.order.day = day + 1; S.order.at = 10 * 60; }
    S.orders++; persist();
    return S.order;
  }
  function collect() {
    if (!S.order || !due(S.order)) return null;
    const o = S.order;
    S.owned = { frame: o.frame, lens: o.lens, tint: o.tint, coat: o.coat, total: o.total };
    S.order = null; persist();
    return o;
  }
  function adjust() { S.adjusts++; persist(); return S.adjusts; }
  function repair() { S.repairs++; persist(); return S.repairs; }
  const cycle = (k, n) => { S[k] = (S[k] + 1) % n; persist(); return S[k]; };

  // ---------------------------------------------------------------- the aside card
  // Same idea and the same corner as the electronics shop: the one fixed `done` sentence a USE row
  // can carry cannot say a slip number, a score or a running total, so the shop says those itself.
  let el = null, timer = 0;
  function card(zh, en) {
    if (typeof document === 'undefined') return;
    if (!el) {
      el = document.createElement('div');
      el.id = 'moCard';
      el.style.cssText = 'position:fixed;left:18px;bottom:104px;width:216px;z-index:30;' +
        'pointer-events:none;border-radius:8px;background:#12181a;padding:9px 11px 10px;' +
        'box-shadow:0 6px 22px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.16);' +
        'font:12px/1.45 system-ui,sans-serif;color:#eef4f1;opacity:0;transition:opacity .35s';
      document.body.appendChild(el);
    }
    el.innerHTML = `<b style="font-size:15px">${zh}</b>` +
      `<div style="opacity:.72;margin-top:3px">${en}</div>`;
    el.style.opacity = '1';
    clearTimeout(timer);
    timer = setTimeout(() => { if (el) el.style.opacity = '0'; }, 5200);
  }

  return {
    ROUNDS, SIZE, RATE, DIRS, FRAMES, LENSES, TINTS, COATS, ADJUST_PRICE, REPAIR_PRICE,
    dirAt, targetOf, restore, persist, reconcile, due, hhmm, total, dio,
    live: () => S,
    state: () => ({ ...S, test: { ...S.test }, rx: S.rx && { ...S.rx },
                    order: S.order && { ...S.order }, owned: S.owned && { ...S.owned },
                    total: total(), day, mins }),
    setClock(d, m) { reconcile(d); if (Number.isFinite(m)) mins = m; },
    shoot, writeRx, rxLine, order, collect, adjust, repair, cycle, card,
    reset() { S = blank(); persist(); },
  };
})();
if (typeof window !== 'undefined') window.MallOptical = MallOptical;

MallFit['眼镜店'] = A => {
  const co = {
    lining : C('#b6b2a9'),   // the pale surround; plaster x1.19 -> a warm off-white
    bay    : C('#26382f'),   // the dark backing every run of frames stands against
    trim   : C('#2f3236'),   // the shell's matte black, matched
    steel  : C('#a9b2b8'),
    steelD : C('#6d777f'),
    stone  : C('#d5cfbd'),
    oakD   : C('#6a5236'),
    white  : C('#f4f1e8'),
    cream  : C('#eee2cc'),
    // Display glass, and it is deliberately darker and thinner than the shell's shopfront
    // glazing. Alpha in this renderer is a blend towards the pane's own unlit colour, so a pale
    // blue at .18 does not read as glass over a display case — it reads as milk poured over
    // whatever is behind it, and the render from the eye-test corner had a hard-edged white band
    // straight across the room wherever a case front crossed the view. Same pane, .11 of a
    // deeper tint: the goods behind it stay legible and the sheet still catches its highlight.
    glass  : C('#7fa2b4'),
    // A mirror is a flat pale value that does not respond to the light in this room, because what
    // it shows is a different one. Emissive mode with no glow is exactly that, and it is the one
    // surface in here that must not bloom: lit from behind through tinted glass, as these were,
    // the mirrors read as dark holes in the joinery.
    mirror : C('#aebdc4'),
    warm   : C('#ffeeda'),
    ink    : C('#191d22'),
    case_  : C('#d8d1c1'),
    felt   : C('#233c34'),
  };
  // Tiling materials. `steel` for anything machined — it is value-neutral, so a bar stays the grey
  // it was given. Timber and slab repeat the shell's own numbers exactly, which means they land in
  // the batches js/mall.js has already opened rather than opening two more.
  const STEEL  = {mat:'steel',   matScale:.50, matAmt:.24};
  const TIMBER = {mat:'wood',    matScale:.90, matAmt:.30};
  const SLAB   = {mat:'paving',  matScale:.72, matAmt:.28};
  const PLAST  = {mat:'plaster', matScale:.60, matAmt:.14, nrm:null};

  // Ten frame colours and five silhouettes. A wall of identical black rectangles is a shelf of
  // nothing; what an optician actually sells is the difference between one shape and the next, so
  // no two pairs beside or above each other agree on both. All ten have to hold their own against
  // a dark backing, so the palest two are warm rather than white.
  const FC = [C('#1d2228'), C('#7a4c28'), C('#d3ac54'), C('#9aa6b2'), C('#33709b'),
              C('#b45e55'), C('#48907e'), C('#e6dcc6'), C('#6a5b83'), C('#b98a58')];
  const LENS = C('#c6dce6'), DARK = C('#2a3038');

  // This shop is on the east wall, so `a` runs along world x and `b` along world z. Rotations are
  // given in world axes, so which of rx/rz lays a disc flat against a wall depends on that. It is
  // asked rather than assumed, so the file survives the shop being moved to a north or south bay.
  const EW = Math.abs(Math.cos(A.yaw)) < .5;

  // The business, from the top of this file, and the props its tick moves. `svc` is filled in
  // beside the joinery each piece belongs to rather than in one block at the end: the tumbling E
  // is part of the chart, the selector lamps are part of the island, and separating them from the
  // things they are let into is how a lamp ends up two centimetres inside a shelf.
  const MO = MallOptical;
  MO.restore();
  const svc = {};

  // ---------------------------------------------------------------- one pair of frames
  // Eight or nine primitives, and every one of them is load-bearing: two rims, two lens fills
  // sitting a couple of millimetres proud of them, a bridge, and two temples raking back from the
  // hinges. Drop the temples and it reads as a figure of eight; drop the lens fill and it reads as
  // a pair of holes.
  //
  // Sized off a real frame rather than off what looked right on its own: 54–62 mm lenses, an 18 mm
  // bridge, 132 to 144 mm across the front. The first version was half as big again — the sort of
  // error that only shows once there is a chair standing next to it.
  //
  //   y     where it *rests*: the bottom of the front, not its centre, so any of the five
  //         silhouettes can be stood on the same shelf without the caller knowing how tall it is
  //   n     the way it faces, in (a,b) — [1,0] off the back wall, [0,-1] off the +b partition
  //   k     silhouette: 0 acetate rectangle, 1 round wire, 2 browline, 3 oval, 4 bold square
  //   dark  sunglasses
  //   mount 'stand' sets it on a little acrylic foot, for a table; otherwise a shelf is expected
  const pair = (a, b, y, c, k, n, dark, mount) => {
    const t = [-n[1], n[0]];
    // sizes are given along the normal, along the wall, and in y; so is the offset from centre.
    const P = (dn, dt, dy, sn, st, h, cc, o = {}) => A.put(
      a + n[0] * dn + t[0] * dt, b + n[1] * dn + t[1] * dt,
      Math.abs(n[0]) * sn + Math.abs(t[0]) * st,
      Math.abs(n[1]) * sn + Math.abs(t[1]) * st,
      h, y + dy, cc, {hard: true, gloss: .5, ...o});
    const BL = (dn, dt, dy, sn, sy, st, cc, o = {}) => A.ball(
      a + n[0] * dn + t[0] * dt, b + n[1] * dn + t[1] * dt, y + dy,
      Math.abs(n[0]) * sn + Math.abs(t[0]) * st, sy,
      Math.abs(n[1]) * sn + Math.abs(t[1]) * st, cc, o);
    // a disc whose axis lies along the frame's normal — round lenses, seen face on.
    const spin = n[0] ? (EW ? {rz: Math.PI / 2} : {rx: Math.PI / 2})
                      : (EW ? {rx: Math.PI / 2} : {rz: Math.PI / 2});
    const DI = (dn, dt, dy, r, th, cc, o = {}) => A.cyl(
      a + n[0] * dn + t[0] * dt, b + n[1] * dn + t[1] * dt, y + dy, r, th, cc,
      {gloss: .5, ...spin, ...o});
    const lc = dark ? DARK : LENS, lo = {hard: true, gloss: .88};
    let half = .070, hi = .040;               // half the front width, and how tall the front is

    if (k === 1) {                                     // round wire
      for (const s of [-1, 1]) {
        DI(0, s * .035, .027, .027, .009, c);
        DI(.007, s * .035, .027, .021, .005, lc, {gloss: .88});
      }
      P(.002, 0, .030, .008, .020, .005, c);           // bridge
      half = .066; hi = .054;
    } else if (k === 3) {                              // oval
      for (const s of [-1, 1]) {
        BL(0, s * .035, .022, .007, .018, .026, c, {gloss: .5});
        BL(.005, s * .035, .022, .007, .013, .019, lc, {gloss: .88});
      }
      P(.002, 0, .026, .009, .020, .006, c);
      half = .068; hi = .044;
    } else {                                           // the three rectangular families
      const w = k === 4 ? .062 : k === 2 ? .054 : .057;
      const h = k === 4 ? .043 : k === 2 ? .032 : .037;
      for (const s of [-1, 1]) {
        P(0, s * (w / 2 + .009), h / 2, .012, w, h, c);
        P(.008, s * (w / 2 + .009), h / 2 - .001, .006, w - .009, h - .008, lc, lo);
      }
      P(0, 0, h - .008, .011, .026, .009, c);          // bridge, under the top bar
      // A browline is a heavy top bar over half-rims, and it is the one shape on a wall of
      // rectangles that anybody can pick out at three metres.
      if (k === 2) P(.005, 0, h + .005, .013, 2 * w + .032, .013, c);
      half = w + .015; hi = h + (k === 2 ? .012 : 0);
    }
    // Temples, raked back from the hinges. Folded, they would lie flat against the lenses and be
    // invisible from the front; open and slightly high is the silhouette a display frame has.
    for (const s of [-1, 1])
      P(-.040, s * (half - .009), hi * .70, .078, .008, .008, c, {gloss: .45});
    if (mount === 'stand') {                           // a little acrylic foot, for a table top
      P(0, 0, -.020, .016, .026, .030, co.stone, {gloss: .55});
      P(0, 0, -.033, .062, .080, .009, co.stone, {gloss: .55});
    }
  };

  // ---------------------------------------------------------------- a frame bay
  // A lit steel shelf per row, frames standing on the shelves, and a price card clipped to the
  // shelf edge under each pair. `n` is which way the bay faces; the run travels across the normal,
  // which is `b` on the back wall and `a` on a partition. The dark backing panel and its steel
  // surround are the caller's, because they also have to line up with a base unit and a mirror.
  const board = (o) => {
    const {n, rows, cols, y0: ry, step, pitch, c0, face, hdr} = o;
    const along = n[0] ? 'b' : 'a';
    // `dn` is how far a piece stands out from the panel face, so it is added *along the normal* —
    // subtracting it buries the whole run inside the backing, where forty frames render perfectly
    // and none of them can be seen.
    const at = (u, dn) => along === 'b'
      ? [face + n[0] * dn, u]                          // back wall: fixed a, run along b
      : [u, face + n[1] * dn];                         // partition: fixed b, run along a
    // a box sized along the normal, along the run and in y — the same convention as `pair`.
    const bx = (u, dn, y, sn, st, h, c, opt = {}) => {
      const p = at(u, dn);
      A.put(p[0], p[1], along === 'b' ? sn : st, along === 'b' ? st : sn, h, y, c, opt);
    };
    const span = (cols - 1) * pitch, mid = c0 + span / 2;
    for (let r = 0; r < rows; r++) {
      const y = ry + r * step;                         // the height the frames rest at
      // The shelf: 22 mm of steel plate, 120 mm deep, returned into the panel at both ends. One
      // box per row carrying every frame on it is what stops a bay of twenty-four pairs reading
      // as twenty-four separate objects hanging in the air.
      bx(mid, .066, y - .011, .120, span + .17, .022, co.steel,
        {hard: true, gloss: .62, ...STEEL});
      for (const s of [-1, 1])
        bx(mid + s * (span / 2 + .095), .046, y - .054, .080, .038, .062, co.steelD,
          {hard: true, gloss: .55, ...STEEL});
      // The line of light under the shelf. This is the single detail that makes a frame wall read
      // as retail rather than as shelving, and it is 7 mm tall, which is all the emitter it needs.
      bx(mid, .080, y - .030, .020, span + .10, .007, co.warm,
        {hard: true, mode: 1, glow: .042});
      for (let i = 0; i < cols; i++) {
        const p = at(c0 + i * pitch, .082);
        // Shape and colour step on different strides from the row, so no two pairs beside or
        // above each other are the same twice.
        const k = (i * 2 + r * 3) % 5, ci = (i * 3 + r * 7) % FC.length;
        pair(p[0], p[1], y, FC[ci], k, n, o.dark && r === rows - 1);
        // and the price card clipped over the shelf's front edge in front of it. It overlaps the
        // steel by 5 mm rather than sitting a hair in front of it: two parallel faces three
        // millimetres apart is a z-fight, two that interpenetrate is a detail.
        bx(c0 + i * pitch, .128, y - .014, .014, .046, .018, co.white,
          {hard: true, gloss: .18});
      }
    }
    if (hdr) {                                         // a dim lit band with the run's name on it
      bx(mid, .030, o.hdrY, .026, span + .30, .095, co.warm,
        {hard: true, mode: 1, glow: .075});
      if (along === 'b') A.glyph(face + .050, mid, o.hdrY, hdr,
        {size: .085, gap: .035, color: co.ink, mode: 1, glow: 0, gloss: .05});
    }
  };

  // ---------------------------------------------------------------- the small props
  // A folded cleaning cloth: two slabs, offset, in woven mode.
  const cloth = (a, b, y, c) => {
    A.put(a, b, .12, .14, .010, y + .005, c, {mode: 7, round: .01});
    A.put(a + .011, b + .009, .10, .12, .010, y + .015, c, {mode: 7, round: .01});
  };
  // A hard case: a shallow box with a barely-domed lid and a hairline where it opens. The dome
  // used to be 19 mm on a 32 mm box, which at arm's length off a desk reads as a bread roll.
  const gcase = (a, b, y, c, rot = 0) => {
    A.put(a, b, .078, .160, .034, y + .017, c, {ry: rot, gloss: .34, round: .014});
    A.ball(a, b, y + .036, .039, .011, .080, c, {ry: rot, gloss: .38});
    A.put(a, b, .080, .162, .004, y + .034, co.trim, {hard: true, ry: rot, gloss: .3});
  };
  // A carton of contact lenses or lens blanks: a box with a printed band down one face.
  const carton = (a, b, y, c, w = .066, d = .072, h = .092) => {
    A.put(a, b, w, d, h, y + h / 2, c, {gloss: .26, round: .006});
    A.put(a + w / 2 + .003, b, .006, d * .72, h * .34, y + h * .62, co.white,
      {hard: true, gloss: .2});
  };
  // A base unit: recessed black plinth, oak carcass, stone top, a lit shadow gap under the top and
  // two drawer lines with steel handles. Every wall in this shop stands on one, which is what
  // gives the room a base line and stops the joinery floating off a plaster wall.
  //
  // `n` is the outward normal in (a,b): [1,0] for a unit against the back wall, [0,-1] for one
  // against the +b partition. Everything that has to be on the face it is read from goes through
  // `F`, which measures out from that face.
  const base = (a, b, w, dp, n = [1, 0], top = .90) => {
    const hf = n[0] ? w / 2 : dp / 2, run = n[0] ? dp : w;
    const F = (d, tn, st, h, y, c, opt = {}) => A.put(
      a + n[0] * (hf + d), b + n[1] * (hf + d),
      Math.abs(n[0]) * tn + Math.abs(n[1]) * st,
      Math.abs(n[1]) * tn + Math.abs(n[0]) * st,
      h, y, c, opt);
    A.put(a, b, w - .08, dp - .08, .19, .095, co.trim, {hard: true, gloss: .30});
    A.put(a, b, w, dp, top - .19, .19 + (top - .19) / 2, co.oakD,
      {hard: true, gloss: .20, ...TIMBER});
    A.put(a, b, w + .05, dp + .05, .048, top + .024, co.stone,
      {hard: true, gloss: .44, ...SLAB});
    F(.002, .018, run - .05, .012, top - .075, co.warm, {hard: true, mode: 1, glow: .05});
    for (let i = 0; i < 2; i++) {
      F(0, .006, run - .06, .008, top - .55 + i * .26, co.trim, {hard: true, gloss: .3});
      F(.008, .020, Math.min(.34, run * .40), .016, top - .42 + i * .26, co.steel,
        {hard: true, gloss: .6, ...STEEL});
    }
    A.stop(a - w / 2 - .03, a + w / 2 + .03, b - dp / 2 - .03, b + dp / 2 + .03);
  };
  // A mirror: bezel, a flat pale unlit panel set well back inside it, and a lit reveal down each
  // side. `n` is +1 if the room is at a smaller b than the mirror and -1 the other way; a mirror
  // on the back wall passes 0 and is built along a instead.
  const mirror = (a, b, w, h, y, n) => {
    const F = (d, sw, sh, t, c, opt) => A.put(
      n ? a : a + d, n ? b - n * d : b,
      n ? sw : t, n ? t : sw, sh, y, c, opt);
    F(0, w, h, .070, co.trim, {hard: true, gloss: .30});
    F(.062, w - .11, h - .12, .020, co.mirror,
      {hard: true, mode: 1, glow: 0, gloss: .95});
    for (const d of [-1, 1]) {
      const off = d * (w / 2 - .028);
      A.put(n ? a + off : a + .092, n ? b - n * .092 : b + off,
        .030, .030, h - .22, y, co.warm, {hard: true, mode: 1, glow: .07});
    }
  };
  // A chair: pan, back on the far side from whichever way the sitter faces, four steel legs.
  const chair = (a, b, face, c) => {
    A.put(a, b, .44, .44, .10, .44, c, {mode: 7, round: .05});
    A.put(a - face * .185, b, .09, .44, .48, .70, c, {mode: 7, round: .06});
    for (const da of [-.16, .16]) for (const db of [-.16, .16])
      A.put(a + da, b + db, .042, .042, .38, .19, co.steelD, {hard: true, gloss: .5, ...STEEL});
    A.stop(a - .24, a + .24, b - .24, b + .24);
  };

  // ================================================================ floor
  // An inlaid field of pale stone inside the shell's jade carpet. Opticians are bright rooms and
  // this one arrives with a dark green floor; a 3.5 cm inlay reads as a shopfit rather than as a
  // rug, and it is what puts light back under the bays.
  A.put(2.30, 0, 3.50, 6.30, .035, .0475, C('#cdc8bb'),
    {hard: true, mode: 9, gloss: .34, ...SLAB});
  for (const s of [-1, 1]) {                           // a jade line down each edge
    A.put(2.30, s * 3.10, 3.46, .05, .012, .071, A.acc, {hard: true, gloss: .5});
    A.put(s > 0 ? 4.03 : .57, 0, .05, 6.22, .012, .071, A.acc, {hard: true, gloss: .5});
  }

  // ================================================================ back wall, right bay
  // The hero elevation, straight ahead and slightly right of anybody standing in the door: a base
  // unit the length of the bay, twenty-four frames on four lit shelves over a dark panel, and the
  // mirror at the end of the run where you turn to look at yourself.
  //
  // The lining stands at a .38–.50 rather than the .28–.40 the first version used, because the
  // shell builds a framed accent graphic at a .26–.37 on exactly this piece of wall. At the old
  // depth the two interpenetrated: the shell's teal panel showed *through* this one in a band down
  // the middle of the bay and its lit edge bled out over the frames. At .44 the graphic is covered
  // by the lining rather than fighting it, which is what a tenant's fit-out is entitled to do.
  A.put(.44, 2.70, .12, 1.86, 2.34, 1.55, co.lining, {hard: true, gloss: .14, ...PLAST});
  base(.62, 2.72, .34, 1.82);
  A.put(.525, 2.49, .045, 1.36, 1.44, 1.75, co.bay, {hard: true, gloss: .16, ...PLAST});
  for (const d of [-1, 1]) {                           // a steel surround, straddling the edges
    A.put(.552, 2.49 + d * .680, .026, .030, 1.50, 1.75, co.steel,
      {hard: true, gloss: .6, ...STEEL});
    A.put(.552, 2.49, .026, 1.39, .030, 1.75 + d * .720, co.steel,
      {hard: true, gloss: .6, ...STEEL});
  }
  board({n: [1, 0], face: .548, rows: 5, cols: 6, y0: 1.08, step: .30, pitch: .21, c0: 1.965,
         hdr: '镜框', hdrY: 2.575, dark: false});
  mirror(.53, 3.42, .40, 1.36, 1.66, 0);
  cloth(.66, 3.28, .952, A.acc);
  gcase(.66, 3.53, .952, co.case_);
  carton(.70, 3.13, .952, co.cream);

  // ================================================================ back wall, left bay
  // The screening alcove: a lit chart at the size a chart actually is, an instrument on its own
  // table, a stool to sit up to it, and a glazed stock cabinet in the corner. Lining and base are
  // the same two pieces as the frame bay, so the back wall reads as one elevation with the shell's
  // timber feature panel between the two halves of it.
  A.put(.44, -2.70, .12, 1.86, 2.34, 1.55, co.lining, {hard: true, gloss: .14, ...PLAST});
  base(.66, -2.40, .38, 1.20);
  // 视力表 — the Chinese chart is rows of tumbling E printed dark on a lightbox, and it is about
  // 0.6 m across. The version this replaces was 0.9 x 1.7: a billboard, three times the emitter of
  // anything else in the shop, and it hazed the whole room.
  A.put(.52, -2.24, .10, .72, 1.28, 1.62, co.trim, {hard: true, gloss: .28});
  const chartFace=A.put(.585, -2.24, .02, .60, 1.16, 1.62, C('#f4efe3'),
    {hard: true, mode: 1, glow: .085});
  A.glyph(.61, -2.24, 2.12, '视力表',
    {size: .062, gap: .022, color: C('#2c7466'), mode: 1, glow: 0});
  // Rows tighten as they descend, which is the only thing that makes it read as a test rather
  // than as a poster.
  //
  // Five printed rows, not eight. The bottom half of this lightbox is now the screening panel
  // below, and the three smallest printed rows stood exactly where its largest optotype does.
  const EROWS = [['E', .086, 1.98], ['E E', .068, 1.855], ['E E E', .054, 1.750],
                 ['E E E E', .043, 1.660], ['E E E E E', .034, 1.585]];
  for (const [tx, sz, yy] of EROWS)
    A.glyph(.61, -2.24, yy, tx,
      {size: sz, gap: sz * .55, color: co.ink, mode: 1, glow: 0, gloss: .04});
  A.glyph(.61, -2.47, 1.170, '5.0',
    {size: .030, gap: .011, color: co.steelD, mode: 1, glow: 0});

  // ---- 视标. The tumbling E you are actually tested on, on the lower half of the same lightbox,
  // which is where a Chinese chart carries its electronic optotype. Four orientations at two
  // sizes are all built here and all but four bars of it are held out of the frame.
  //
  // Two sizes and not six. Every piece of this is a *dynamic* instance — it is held out of the
  // renderer's retained static batch for the whole life of the scene, whether the test is being
  // played or not — so a size is 16 props of permanent per-frame cost, and this building is the
  // heaviest in the game. Two is what it takes to read as "and now a smaller one"; the rest of
  // the difficulty is carried by MallOptical.RATE, which is free.
  //
  // Held out with **alpha**, and that is not a preference. `uGlow` multiplies the base colour
  // (js/gl.js:987, `base * (1.0 + uGlow * 3.0)`), so a dark optotype cannot be switched off with
  // glow — turn glow down and you still have a dark bar sitting on a white lightbox. `uAlpha` is
  // the fragment's own alpha, so .001 is genuinely invisible; js/mall.js does the same thing with
  // the atrium's event floor at its line 2058, and the pieces have to be emissive for it, which
  // is why an ink-coloured bar in here is mode 1 with no glow at all.
  //
  // An E is four boxes on a five-by-five grid: a spine down one edge and three arms across the
  // rows, every piece one grid square thick. `s` is that square, which is also the stroke width,
  // which is what makes this an optotype and not a letter E in a font.
  //
  // The four entries are in the order 上 下 左 右, because the tick indexes this array with
  // exactly what MallOptical.dirAt() returns. A different order here is a sight test that marks
  // every answer wrong and never once looks wrong in a render.
  const EB = -2.24, EY = 1.315;
  svc.E = [MO.SIZE[1], MO.SIZE[4]].map(h => {
    const s = h / 5;
    const bar = (db, dy, wb, wy) => A.put(.606, EB + db, .008, wb, wy, EY + dy, co.ink,
      {hard: true, mode: 1, glow: 0, alpha: .001});
    return [
      [bar(0, -2 * s, 5 * s, s), bar(-2 * s, .5 * s, s, 4 * s),                 // 上
       bar(0, .5 * s, s, 4 * s), bar(2 * s, .5 * s, s, 4 * s)],
      [bar(0, 2 * s, 5 * s, s), bar(-2 * s, -.5 * s, s, 4 * s),                 // 下
       bar(0, -.5 * s, s, 4 * s), bar(2 * s, -.5 * s, s, 4 * s)],
      [bar(2 * s, 0, s, 5 * s), bar(-.5 * s, 2 * s, 4 * s, s),                  // 左
       bar(-.5 * s, 0, 4 * s, s), bar(-.5 * s, -2 * s, 4 * s, s)],
      [bar(-2 * s, 0, s, 5 * s), bar(.5 * s, 2 * s, 4 * s, s),                  // 右
       bar(.5 * s, 0, 4 * s, s), bar(.5 * s, -2 * s, 4 * s, s)],
    ];
  });
  A.dynamicVisual(svc.E.flat(2));
  // and which way you are being asked for, in the room rather than only in the walk-up prompt:
  // four words along the bottom of the panel with a lamp under each, and this round's lamp lit.
  // Without it the test is only playable by somebody reading the English.
  svc.cue = MO.DIRS.map((d, i) => {
    const bb = EB - .12 + i * .08;
    A.glyph(.61, bb, 1.105, d.hz,
      {size: .032, gap: .012, color: co.ink, mode: 1, glow: 0, gloss: .04});
    return A.put(.606, bb, .006, .050, .008, 1.068, A.acc, {hard: true, mode: 1, glow: .03});
  });
  A.dynamicVisual(svc.cue);
  // On the bench under it: a tray of lens blanks and the cartons they came out of.
  A.put(.66, -2.74, .26, .34, .035, .9655, co.trim, {hard: true, gloss: .3});
  for (let i = 0; i < 6; i++)
    A.cyl(.60 + (i % 2) * .11, -2.86 + ((i / 2) | 0) * .11, .992, .034, .010,
      [C('#d5e6ee'), C('#e8dfc6'), C('#cfdfe9')][i % 3], {gloss: .85});
  carton(.64, -2.20, .948, co.white, .070, .076, .100);
  carton(.64, -2.04, .948, A.acc, .070, .076, .080);
  cloth(.70, -1.90, .948, C('#9aa6b2'));

  // The test result belongs in the room, not only in a transient DOM card. This six-piece clipped
  // prescription lies on the screening bench and is retained dark until the sixth response writes
  // `S.rx`. Two colour bands are the two eyes; their severity colour is updated only when the
  // result changes, so the card adds no continuous work and remains one opaque box group.
  svc.rxCard = [
    A.put(.71, -1.94, .22, .30, .006, .976, co.white,
      {hard:true, mode:1, alpha:.001, gloss:.10}),
    A.put(.71, -2.055, .18, .034, .004, .982, A.acc,
      {hard:true, mode:1, alpha:.001, glow:.025}),
    A.put(.71, -1.940, .18, .008, .004, .983, co.steelD,
      {hard:true, mode:1, alpha:.001}),
    A.put(.71, -1.995, .15, .022, .004, .983, co.steel,
      {hard:true, mode:1, alpha:.001}),
    A.put(.71, -1.885, .15, .022, .004, .983, co.steel,
      {hard:true, mode:1, alpha:.001}),
    A.put(.71, -1.825, .060, .018, .010, .988, co.steelD,
      {hard:true, mode:1, alpha:.001, gloss:.55}),
  ];
  svc.rxEyes = [svc.rxCard[3], svc.rxCard[4]];
  A.dynamicVisual(svc.rxCard);

  // The price board, in the 43 cm of lining between the chart and the corner cabinet — which was
  // the last stretch of bare pale plaster left on this wall. It carries the four things this
  // tenant actually sells, at the prices js/data.js charges for them, which is the sort of detail
  // that makes a shop read as a business rather than as a set.
  A.put(.52, -2.815, .09, .40, .62, 1.86, co.trim, {hard: true, gloss: .28});
  A.put(.575, -2.815, .02, .34, .55, 1.86, C('#eae4d5'), {hard: true, gloss: .18});
  A.glyph(.60, -2.815, 2.055, '价目表',
    {size: .048, gap: .016, color: C('#1c4f45'), mode: 1, glow: 0, gloss: .04});
  [['眼镜', '380元'], ['墨镜', '150元'], ['隐形眼镜', '180元'], ['眼镜盒', '35元']]
    .forEach(([hz, yuan], i) => {
      A.glyph(.60, -2.92, 1.935 - i * .108, hz,
        {size: .032, gap: .010, color: co.ink, mode: 1, glow: 0, gloss: .04});
      A.glyph(.60, -2.71, 1.935 - i * .108, yuan,
        {size: .032, gap: .009, color: co.ink, mode: 1, glow: 0, gloss: .04});
    });

  // Corner stock cabinet: lens blanks, contact lens boxes, the things a dispensary keeps behind
  // it. Glazed and lit from the back, it turns the dead corner into the deepest part of the room.
  A.put(.70, -3.32, .46, .58, 2.06, 1.04, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(.68, -3.32, .40, .52, .19, .095, co.trim, {hard: true, gloss: .30});
  A.put(.53, -3.32, .02, .54, 1.74, 1.26, C('#efe6d4'), {hard: true, mode: 1, glow: .045});
  for (let i = 0; i < 4; i++) {
    const sy = .50 + i * .38;
    A.put(.72, -3.32, .40, .54, .022, sy, co.stone, {hard: true, gloss: .40, ...SLAB});
    for (let j = 0; j < 3; j++)
      carton(.72, -3.49 + j * .17, sy + .011,
        [co.white, A.acc, co.cream, C('#63a8c4')][(i + j) % 4], .060, .064, .084);
  }
  A.put(.915, -3.32, .016, .54, 1.74, 1.26, co.glass,
    {hard: true, mode: 1, alpha: .11, gloss: .92});
  A.put(.70, -3.32, .50, .62, .048, 2.095, co.stone, {hard: true, gloss: .42, ...SLAB});
  for (let i = 0; i < 3; i++)
    A.put(.68, -3.48 + i * .16, .10, .11, .095, 2.167, [co.white, A.acc, co.cream][i],
      {gloss: .3, round: .012});
  A.stop(.45, .95, -3.63, -3.01);

  // The instrument. A screening unit is a table, a body, a head you look into, a chin rest on two
  // posts and a joystick — entirely recognisable and entirely unlike anything else in the mall. It
  // is dark grey rather than white: the version this replaces was a pale box with two black
  // eyepieces over a pale chin rest, and from the door that reads unmistakably as a face.
  A.cyl(1.50, -2.62, .035, .26, .05, co.trim, {gloss: .4});
  A.cyl(1.50, -2.62, .35, .058, .64, co.steelD, {gloss: .55, ...STEEL});
  A.put(1.50, -2.62, .60, .52, .045, .695, C('#cfcbc2'), {hard: true, gloss: .40, ...SLAB});
  A.put(1.44, -2.62, .40, .40, .050, .745, co.trim, {hard: true, gloss: .40});
  A.put(1.36, -2.62, .30, .36, .260, .900, C('#454b50'), {hard: true, gloss: .38, round: .022});
  const instrumentScreen=A.put(1.19, -2.62, .03, .28, .170, 1.040, C('#16283c'),
    {hard: true, mode: 1, glow: .10});
  A.put(1.58, -2.62, .22, .30, .200, 1.060, C('#565c62'), {hard: true, gloss: .42, round: .022});
  for (const s of [-1, 1]) {
    A.cyl(1.72, -2.62 + s * .033, 1.10, .026, .07, co.trim,
      {gloss: .5, ...(EW ? {rz: Math.PI / 2} : {rx: Math.PI / 2})});
    A.put(1.83, -2.62 + s * .100, .030, .030, .200, 1.010, co.steel,
      {hard: true, gloss: .55, ...STEEL});
  }
  A.put(1.830, -2.62, .065, .130, .026, 1.023, co.cream, {gloss: .28, round: .010});
  A.put(1.845, -2.62, .030, .210, .026, 1.200, co.trim, {hard: true, gloss: .35});
  A.cyl(1.32, -2.44, .820, .012, .100, co.trim, {gloss: .4});
  A.ball(1.32, -2.44, .878, .020, .020, .020, co.trim, {gloss: .4});
  A.stop(1.16, 1.92, -2.92, -2.32);
  // The patient's stool, facing the machine.
  A.cyl(2.32, -2.62, .04, .21, .05, co.trim, {gloss: .4});
  A.cyl(2.32, -2.62, .25, .042, .42, co.steelD, {gloss: .55, ...STEEL});
  A.put(2.32, -2.62, .36, .36, .085, .500, C('#3f5b52'), {mode: 7, round: .05});
  A.stop(2.13, 2.51, -2.81, -2.43);

  // ---- 验光室. The screen that turns the alcove into a room.
  //
  // A sight test is the one thing in a shop that needs privacy, and until now the chart, the
  // machine and the stool stood in the open with the shop floor running straight past them: the
  // corner read as three props on a wall rather than as somewhere you are taken. This is the wall
  // it was missing — a joinery base with a frosted screen over it, running out from the back wall
  // along b -1.62 and stopping at a 1.55, which leaves a metre of doorway between its open end and
  // the till counter. That gap is deliberate and is the whole design of it: a screen that closed
  // would seal the instrument, the stool and anybody standing at them into a box with no way out.
  //
  // It stops short of the shell's own slatted feature panel (a .25–.35) and of the back-wall base
  // unit (b -1.77), by 7 and 6 centimetres — near enough to read as built into both, far enough
  // that no two faces are coplanar.
  A.put(.985, -1.62, 1.13, .10, .86, .43, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(.985, -1.62, 1.07, .06, .19, .095, co.trim, {hard: true, gloss: .30});
  // 8 mm proud of the room-facing side of the base, not 2: two faces a couple of millimetres
  // apart is the z-fight this file's header warns about, and a jade hairline is exactly the
  // thin, wide, flat-on piece that shows it worst.
  A.put(.985, -1.555, 1.13, .014, .030, .800, A.acc, {hard: true, gloss: .5});
  // Frosted, not clear: what a screening room's screen is for is that you cannot be seen through
  // it. Low alpha and no light of its own, so it veils the corner without turning into a lamp.
  A.put(.985, -1.62, 1.13, .05, 1.06, 1.40, co.glass,
    {hard: true, mode: 1, alpha: .13, gloss: .90});
  A.put(.985, -1.62, 1.17, .09, .070, 2.125, co.trim, {hard: true, gloss: .30});
  A.put(.985, -1.62, 1.17, .09, .055, .875, co.trim, {hard: true, gloss: .30});
  // The open end: a post, and the room's name on it where somebody at the door can read it.
  A.put(1.575, -1.62, .095, .095, 2.10, 1.05, co.steelD, {hard: true, gloss: .55, ...STEEL});
  A.put(1.640, -1.62, .045, .30, .225, 1.905, co.trim, {hard: true, gloss: .28});
  A.glyph(1.670, -1.62, 1.905, '验光室',
    {size: .062, gap: .022, color: C('#f3d47b'), mode: 1, glow: .07});
  A.stop(.38, 1.63, -1.72, -1.52);

  // ================================================================ back wall, centre
  // A glazed case under the shop's own name: contact lenses, solution and cases, which are three
  // of the four things on this tenant's stock list and had nowhere to be seen. It fills the metre
  // of dead floor in front of the shell's timber feature panel without going anywhere near the
  // 明视眼镜 glyphs at 1.95, which is the whole constraint on this wall.
  A.put(.66, 0, .46, 2.50, .18, .09, co.trim, {hard: true, gloss: .30});
  A.put(.66, 0, .44, 2.46, .56, .46, C('#cdc5b2'), {hard: true, gloss: .26, ...PLAST});
  A.put(.895, 0, .014, 2.48, .014, .755, co.warm, {hard: true, mode: 1, glow: .06});
  A.put(.66, 0, .50, 2.56, .050, .795, co.stone, {hard: true, gloss: .44, ...SLAB});
  // Lined in dark felt rather than lit from below. Twelve white cartons standing on a pale stone
  // top were twelve white cartons you could not see; on a dark liner every one of them has an
  // edge, which is the same argument as the frame bays and the same fix.
  A.put(.66, 0, .42, 2.38, .012, .827, co.felt, {mode: 7, round: .01});
  for (let i = 0; i < 12; i++)                         // boxes of lenses, in four colourways
    carton(.60 + (i % 2) * .10, -1.045 + i * .19, .833,
      [co.white, C('#63a8c4'), A.acc, co.cream][i % 4]);
  for (let i = 0; i < 4; i++) {                        // and bottles of solution behind them
    A.cyl(.52, -.78 + i * .52, .887, .030, .108, C('#d9e6ea'), {gloss: .6});
    A.cyl(.52, -.78 + i * .52, .955, .016, .034, A.acc, {gloss: .5});
  }
  for (const da of [.475, .885]) for (const db of [-1.195, 1.195])
    A.put(da, db, .022, .022, .330, .988, co.steelD, {hard: true, gloss: .6, ...STEEL});
  A.put(.68, 0, .40, 2.30, .010, 1.132, co.warm, {hard: true, mode: 1, glow: .045});
  A.put(.885, 0, .012, 2.39, .310, .988, co.glass, {hard: true, mode: 1, alpha: .11, gloss: .92});
  A.put(.68, 0, .43, 2.41, .012, 1.150, co.glass, {hard: true, mode: 1, alpha: .11, gloss: .92});
  A.stop(.42, .92, -1.28, 1.28);
  // The one thing this shop is allowed to say about itself on the back wall, between the case and
  // the shell's own name glyphs at 1.95. Standing in the door, the middle of the elevation was two
  // metres of bare slatted timber; a lit strip on the axis is what an optician puts there.
  A.put(.45, 0, .06, 1.94, .24, 1.46, co.trim, {hard: true, gloss: .28});
  A.put(.49, 0, .03, 1.80, .155, 1.46, C('#f2ede0'), {hard: true, mode: 1, glow: .10});
  A.glyph(.52, 0, 1.46, '验光配镜',
    {size: .092, gap: .046, color: C('#1c4f45'), mode: 1, glow: 0, gloss: .04});

  // ================================================================ the two partitions
  // The same bay again, turned through ninety degrees: base unit, dark panel, three lit shelves,
  // and a small standing mirror on the counter at the open end of each. They stop short at a 1.59
  // because the shell's own accent lightbox on each partition begins at 1.63.
  for (const s of [-1, 1]) {
    A.put(.99, s * 3.655, 1.20, .13, 2.34, 1.55, co.lining, {hard: true, gloss: .14, ...PLAST});
    base(.99, s * 3.585, 1.20, .27, [0, -s]);
    A.put(.88, s * 3.545, .84, .05, 1.04, 1.68, co.bay, {hard: true, gloss: .16, ...PLAST});
    for (const d of [-1, 1]) {
      A.put(.88 + d * .420, s * 3.517, .030, .026, 1.10, 1.68, co.steel,
        {hard: true, gloss: .6, ...STEEL});
      A.put(.88, s * 3.517, .87, .026, .030, 1.68 + d * .520, co.steel,
        {hard: true, gloss: .6, ...STEEL});
    }
    board({n: [0, -s], face: s * 3.52, rows: 4, cols: 4, y0: 1.24, step: .28, pitch: .19,
           c0: .595, dark: s < 0});
    A.put(.88, s * 3.545, .96, .05, .090, 2.285, co.warm, {hard: true, mode: 1, glow: .07});
    // The mirror you actually use to try a pair on, standing on the counter beyond the shelves.
    mirror(1.44, s * 3.60, .26, .42, 1.17, s);
    cloth(.62, s * 3.55, .952, s > 0 ? A.acc : C('#9aa6b2'));
    gcase(.90, s * 3.55, .952, co.case_);
    carton(1.14, s * 3.55, .952, s > 0 ? co.cream : co.white, .070, .076, .096);
  }

  // ---- +b partition, front: the full-height mirror. This is the one you stand at with a pair on
  // your face, so it is at the front of the shop where the daylight from the concourse is, not
  // buried at the back.
  A.put(3.32, 3.60, .58, .26, .71, .545, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(3.32, 3.62, .50, .22, .19, .095, co.trim, {hard: true, gloss: .30});
  A.put(3.32, 3.58, .63, .31, .048, .924, co.stone, {hard: true, gloss: .44, ...SLAB});
  A.put(3.32, 3.46, .54, .016, .012, .825, co.warm, {hard: true, mode: 1, glow: .055});
  mirror(3.32, 3.66, .60, 1.44, 1.72, 1);
  cloth(3.42, 3.52, .950, A.acc);
  gcase(3.18, 3.52, .950, C('#6a5b83'));
  A.stop(3.00, 3.64, 3.42, 3.76);

  // ---- -b partition, front: the dispensary cabinet, standing behind the till.
  A.put(3.32, -3.54, .60, .30, 2.05, 1.045, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(3.32, -3.56, .54, .24, .19, .095, co.trim, {hard: true, gloss: .30});
  for (let i = 0; i < 3; i++) {
    A.put(3.32, -3.40, .54, .022, .020, .48 + i * .40, co.stone,
      {hard: true, gloss: .40, ...SLAB});
    for (let j = 0; j < 3; j++)
      carton(3.14 + j * .18, -3.40, .49 + i * .40, [co.white, A.acc, co.cream][(i + j) % 3],
        .060, .064, .080);
  }
  A.put(3.32, -3.42, .50, .020, .048, 1.720, co.stone, {hard: true, gloss: .42, ...SLAB});
  A.put(3.32, -3.44, .44, .014, .012, 1.752, co.warm, {hard: true, mode: 1, glow: .07});
  for (let i = 0; i < 4; i++)
    A.put(3.14 + i * .12, -3.44, .085, .095, .110, 1.800,
      [co.white, A.acc, co.cream, co.white][i], {gloss: .3, round: .01});
  A.stop(3.00, 3.64, -3.72, -3.38);

  // ================================================================ the floor pieces
  // A low case on the centreline. Not A.island, which is timber-bodied: the shell has already put
  // a two-metre slab of slatted timber on the back wall directly behind this, and a second warm
  // brown mass a metre and a half in front of it turns the middle of the room into one colour.
  // Pale lacquer on a recessed black plinth instead, with a lit reveal under the stone.
  //
  // It is also deliberately low — 0.82 rather than the 0.92 the millwork would give it — because
  // this is what stands between anybody in the doorway and the back wall, and ten centimetres is
  // the difference between seeing the case of contact lenses behind it and not.
  A.put(2.42, 0, .78, 1.44, .16, .09, co.trim, {hard: true, gloss: .30});
  A.put(2.42, 0, .86, 1.52, .58, .46, C('#cdc5b2'), {hard: true, gloss: .28, ...PLAST});
  A.put(2.42, 0, .88, 1.54, .020, .745, co.warm, {hard: true, mode: 1, glow: .07});
  A.put(2.42, 0, .92, 1.60, .060, .790, co.stone, {hard: true, gloss: .44, ...SLAB});
  A.put(2.40, 0, .76, 1.40, .012, .827, co.felt, {mode: 7, round: .01});
  A.put(2.22, 0, .28, 1.44, .080, .873, co.stone, {hard: true, gloss: .42, ...SLAB});
  A.put(2.22, 0, .24, 1.40, .012, .919, co.felt, {mode: 7, round: .01});   // runner on the riser
  A.put(2.875, 0, .020, 1.30, .38, .48, C('#cfc7b3'), {hard: true, gloss: .30});
  A.put(2.888, 0, .012, .52, .115, .48, C('#1c4f45'), {hard: true, mode: 1, glow: .04});
  A.glyph(2.902, 0, .48, '明视', {size: .070, gap: .028, color: co.white, mode: 1, glow: .06});
  const ISK = [0, 2, 4, 1, 3, 0, 2, 4, 1, 3, 0, 4];
  for (let i = 0; i < 12; i++) {                       // six at the front, six up on the riser
    const bk = i > 5, bb = -.625 + (i % 6) * .25, ry = bk ? .961 : .869;
    pair(bk ? 2.22 : 2.62, bb, ry,
      FC[(i * 5 + 2) % FC.length], ISK[i], [1, 0], i === 7, 'stand');
    A.put(bk ? 2.28 : 2.68, bb, .014, .046, .018, ry - .025, co.white,
      {hard: true, gloss: .18});                       // and a price card in front of each
  }
  A.stop(1.99, 2.90, -.80, .80);

  // ---- 配镜. Which frame, which lens, which tint, which coating — four runs of lamps let into
  // the clear strip along the front edge of the island, with the one you have chosen lit.
  //
  // Lamps and not printed options, for a reason that is a property of the toolkit rather than a
  // taste: `A.glyph` writes at the wall's own yaw or its opposite (js/mall.js:987) and at nothing
  // else, so every character in this shop faces out of the unit or into it. Four columns of
  // options across the top of a waist-high island would have to face *up*, and there is no way to
  // ask for that. The words are therefore the labels the game itself hangs in the room, and the
  // price of what is lit goes on this shop's own card the moment you change it.
  //
  // a 2.79 is the strip between the front row of price cards (which end at a 2.687) and the edge
  // of the stone (a 2.88), and it is the only clear band on this top. The four groups focus at
  // a 3.95 — the middle of the doorway, which is where 眼镜店's own focus already is.
  const SEL = [['frame', -.55, MO.FRAMES.length], ['lens', -.18, MO.LENSES.length],
               ['tint', .18, MO.TINTS.length], ['coat', .55, MO.COATS.length]];
  svc.sel = {};
  for (const [key, gb, n] of SEL) {
    const span = (n - 1) * .028;
    const meaning = key === 'lens' ? 'thickness' : key === 'coat' ? 'coating' : key;
    A.put(2.79, gb, .046, span + .046, .008, .824, co.steelD,
      {hard: true, gloss: .55, ...STEEL});
    svc.sel[key] = [];
    for (let i = 0; i < n; i++)
      svc.sel[key].push(A.cyl(2.79, gb - span / 2 + i * .028, .829, .0095, .005, co.warm,
        {mode: 1, glow: .04,
          mallOpticalSelectorGroup:key, mallOpticalSelectorMeaning:meaning,
          mallOpticalSelectorIndex:i}));
    A.dynamicVisual(svc.sel[key]);
  }

  // A close shot of the island cannot see the interaction labels, so the stone edge carries four
  // tiny non-verbal legends below the lamps. Each uses exactly three opaque plates: paired lenses
  // and bridge; three increasing edges; three tint swatches; three diagonal coating gleams. Their
  // one shared box signature keeps all twelve in one draw, and none emits light — the selected
  // lamp above remains the strongest mark in every group.
  const LEG = {hard:true, mode:7, round:.006, gloss:.10, tag:'配镜选择'};
  const legend = (group, role) => ({...LEG,
    mallOpticalSelectorLegend:true, mallOpticalSelectorGroup:group,
    mallOpticalSelectorMeaning:group === 'lens' ? 'thickness'
      : group === 'coat' ? 'coating' : group,
    mallOpticalSelectorRole:role});
  // frame
  for (const s of [-1, 1])
    A.put(2.889, -.55 + s * .040, .010, .055, .038, .786, co.steelD,
      legend('frame', s < 0 ? 'left-lens' : 'right-lens'));
  A.put(2.889, -.55, .010, .028, .010, .786, co.steelD, legend('frame', 'bridge'));
  // thickness — equal-height samples whose width steps unmistakably from thin to thick
  for (let i = 0; i < 3; i++)
    A.put(2.889, -.18 + (i - 1) * .042, .010, [.008, .016, .026][i], .052, .786,
      co.steelD, legend('lens', ['thin', 'medium', 'thick'][i]));
  // tint — clear, warm and dark
  const TINT_LEGEND = [co.white, C('#9b7654'), DARK];
  for (let i = 0; i < 3; i++)
    A.put(2.889, .18 + (i - 1) * .044, .010, .032, .038, .786, TINT_LEGEND[i],
      legend('tint', ['clear', 'warm', 'dark'][i]));
  // coating — a repeating raked reflection, rather than another run of tint chips
  const rake = EW ? {rx:-.55} : {rz:-.55};
  for (let i = 0; i < 3; i++)
    A.put(2.889, .55 + (i - 1) * .034, .010, .010, .055, .786, co.warm,
      {...legend('coat', 'gleam'), ...rake});

  // The fitting desk. Two chairs across a stone worktop, a tray of trial lenses on it, a small
  // mirror the optician turns towards you and a lamp — the four things on every dispensing desk.
  // Narrower than it was: at 1.34 across it left a 46 cm slot between its end and the partition
  // base unit, and that slot is the only way through to the right-hand frame bay.
  A.put(2.42, 2.28, .84, 1.16, .055, .755, co.stone, {hard: true, gloss: .44, ...SLAB});
  A.put(2.42, 2.28, .70, 1.02, .120, .665, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  for (const da of [-.34, .34]) for (const db of [-.47, .47])
    A.put(2.42 + da, 2.28 + db, .06, .06, .70, .365, co.steelD,
      {hard: true, gloss: .5, ...STEEL});
  A.stop(2.00, 2.84, 1.70, 2.86);
  // Trial lenses in a felt tray. Fifteen discs at a shallow tint each: the one prop in the shop
  // that says it grinds glass rather than only selling it.
  A.put(2.32, 1.94, .32, .42, .042, .804, co.trim, {hard: true, gloss: .3});
  A.put(2.32, 1.94, .28, .38, .012, .829, C('#33423c'), {mode: 7, round: .01});
  for (let i = 0; i < 15; i++)
    A.cyl(2.21 + (i % 3) * .11, 1.80 + ((i / 3) | 0) * .07, .840, .026, .008,
      [C('#cfe2ea'), C('#e6dcc0'), C('#cbd9e6')][i % 3], {gloss: .85});
  // Desk mirror on a small stand, turned to face the customer's chair.
  A.put(2.26, 2.66, .04, .26, .30, .935, co.trim, {hard: true, gloss: .3});
  A.put(2.30, 2.66, .02, .20, .24, .945, co.mirror,
    {hard: true, mode: 1, glow: 0, gloss: .95});
  A.put(2.26, 2.66, .17, .06, .020, .793, co.trim, {hard: true, gloss: .35});
  // Task lamp: base, arm, head, and a bulb that actually reads as lit.
  A.cyl(2.18, 2.72, .797, .078, .024, co.trim, {gloss: .4});
  A.cap(2.18, 2.72, .965, .012, .32, .012, co.steelD, {gloss: .55});
  A.taper(2.29, 2.72, 1.120, .175, .135, .175, co.white, {gloss: .3});
  A.cyl(2.29, 2.72, 1.190, .034, .026, co.steelD, {gloss: .5});
  A.put(2.29, 2.72, .100, .100, .016, 1.058, co.warm, {hard: true, mode: 1, glow: .16});
  gcase(2.58, 2.08, .785, C('#7a4c28'));
  cloth(2.60, 2.48, .785, A.acc);
  // ---- 加热器. The frame warmer, and the pliers beside it. This is what an optician adjusts
  // acetate with, and it is the only warm-coloured thing on a desk of steel and stone, so it is
  // also what says from the aisle that frames are worked on here rather than only sold. It sits
  // in the one clear band of this worktop: a 2.05 to 2.45 between the trial-lens tray and the
  // desk mirror, b 2.16 to 2.42 between the tray's far edge and the folded cloth.
  // Square-cornered, not rounded. Props batch only when mesh, mode, corner radius, bevel and
  // material all agree, and a lone `round: .008` on one box is one draw call of its own for a
  // chamfer nobody can see on a 16 cm object.
  A.put(2.16, 2.32, .16, .20, .075, .820, co.trim, {hard: true, gloss: .30});
  svc.heat = A.put(2.16, 2.32, .12, .16, .006, .861, C('#e2703a'),
    {hard: true, mode: 1, glow: .10});
  for (const s of [-1, 1])
    A.put(2.36, 2.32 + s * .013, .17, .011, .008, .789, co.steelD,
      {hard: true, gloss: .6, ...STEEL});
  A.dynamicVisual(svc.heat);
  chair(3.26, 2.28, -1, C('#3f5b52'));                 // the customer, facing the desk
  chair(1.62, 2.28, 1, C('#3f5b52'));                  // the optician, facing back out

  // The till. Front-left, opposite the desk, with cases and cloths on the top and a spinner of
  // sunglasses at the far end — 墨镜 is on this shop's stock list and had nowhere to be sold from.
  A.counter(3.00, -2.40, 1.70, .86, C('#d9d1bf'));
  // Two fixes to the shell's own till, both from the outside:
  //
  // It hangs a black 1.02 x 0.30 m block along the +b end of the counter top to carry the 收银台
  // lettering, floating 13 cm clear of the stone with nothing underneath it. From the aisle that
  // is a slab of black in mid air. This is the plinth it wants to be standing on — at the
  // customer's end of the run, because the shell's own screen housing already fills the other.
  A.put(3.30, -1.57, .40, .30, .130, 1.045, co.trim, {hard: true, gloss: .34});
  A.put(3.30, -1.57, .45, .35, .016, 1.112, co.steelD, {hard: true, gloss: .55, ...STEEL});
  // And its lettering goes on at a - dp/2 - .03, which is 3 cm behind the counter's own back face
  // and facing the concourse — so every till in this building has its sign buried inside its own
  // carcass. Ours goes on the end of the block, where the customer stands. (Left alone in
  // js/mall.js: it is the same three lines for all eighteen tenants and not this shop's to move.)
  A.glyph(3.535, -1.57, 1.240, '收银台',
    {size: .080, gap: .026, color: C('#f3d47b'), mode: 1, glow: .10});
  // The clear stretches of the counter top are the two the shell has not built on: b -3.31 to
  // -2.95 and b -2.65 to -2.31. Anything put anywhere else stands inside its till.
  for (let i = 0; i < 2; i++)
    gcase(2.86, -2.58 + i * .18, .985, [co.case_, C('#1d2228')][i]);
  cloth(3.12, -2.46, .985, C('#9aa6b2'));
  A.cyl(2.96, -3.13, 1.045, .070, .110, co.stone, {gloss: .34});
  for (let i = 0; i < 5; i++)                          // cloths standing in a pot
    A.put(2.96 + Math.sin(i * 1.3) * .028, -3.13 + Math.cos(i * 1.3) * .028,
      .046, .046, .13, 1.135, [A.acc, co.white, C('#9aa6b2')][i % 3],
      {mode: 7, round: .012, rz: (i % 3 - 1) * .06});

  // ---- 配镜 and 取镜, the two halves of the transaction, on the two stretches of counter top the
  // shell has not built on. They are a metre apart on purpose: you order at the end you pay at,
  // and you come back for it at the end the workshop door is, which is how this counter is
  // staffed. Both stand at a 2.70, in front of the cloth pot rather than behind it.
  //
  // The slip is the order in the clip, and it is not there until there is an order — alpha again,
  // for the reason set out at the screening panel above.
  A.put(2.70, -2.48, .20, .28, .014, .992, co.trim, {hard: true, gloss: .32});
  A.put(2.70, -2.48, .16, .23, .004, 1.001, co.white, {hard: true, gloss: .16});
  svc.slip = A.put(2.70, -2.48, .17, .24, .003, 1.005, A.acc,
    {hard: true, mode: 1, glow: .05, alpha: .001});
  A.put(2.62, -2.62, .05, .05, .09, 1.030, co.steelD, {hard: true, gloss: .55, ...STEEL});
  svc.pad = A.put(2.647, -2.62, .006, .034, .034, 1.048, A.acc,
    {hard: true, mode: 1, glow: .05});
  // The collection tray: felt, a lamp under it, and the finished pair in its case appearing in it
  // the moment the job is genuinely collectable rather than the moment it is ordered.
  A.put(2.70, -3.13, .20, .30, .016, .993, co.trim, {hard: true, gloss: .30});
  A.put(2.70, -3.13, .17, .26, .010, 1.004, co.felt, {mode: 7, round: .01});
  svc.ready = A.put(2.70, -3.13, .18, .27, .004, 1.011, co.warm,
    {hard: true, mode: 1, glow: .02});
  svc.box = [
    A.put(2.70, -3.13, .078, .150, .034, 1.030, co.case_,
      {mode: 1, glow: 0, alpha: .001, gloss: .34, round: .014}),
    A.put(2.70, -3.13, .080, .152, .004, 1.049, co.trim,
      {hard: true, mode: 1, glow: 0, alpha: .001, gloss: .30}),
  ];
  A.dynamicVisual(svc.slip, svc.pad, svc.ready, svc.box);

  // ---- the sunglasses tower.
  // It was four pairs on a post on the counter top, which is the one place in this shop with no
  // room for it: the shell's own till fills two thirds of that top and the block over the end of
  // it fills the air above the rest. And a bare 1.5 m post with a few dark frames on it reads
  // from the aisle as a lamp standard. This is a piece of furniture — a plinth, a body, a glazed
  // head with twelve pairs on lit brackets and its own header — which is what a sunglasses stand
  // in an optician actually is, and the one fitting a passer-by sees the whole of.
  //
  // It stood at a 3.70, b -1.28 and had to move, for two reasons that are the same reason. The
  // shopfront opening is b -1.5 to +1.5, so that put half a metre of furniture in the doorway;
  // and the only route to the till runs down the -b front aisle between the counter face at a
  // 3.43 and the glazing at a 4.45, which a 0.5 m tower narrows to a gap no body fits through.
  // The till was still *in reach* — reach is a radius, not a walk — but a shopper sent to pay
  // walked into this instead.
  //
  // At a 3.05, b 1.30 it is inside the shop rather than in its door: on the open floor between
  // the island and the fitting desk, which is the piece of floor that read as empty from the
  // concourse, and clear on all four sides. Its focus point lands at a 4.20 in the middle of the
  // entrance, where there is no glass, instead of at a 4.85 out in the mall.
  const SPINA = 3.05, SPINB = 1.30;
  A.put(SPINA, SPINB, .36, .36, .12, .06, co.trim, {hard: true, gloss: .30});
  A.put(SPINA, SPINB, .30, .30, .88, .560, C('#cdc5b2'), {hard: true, gloss: .28, ...PLAST});
  A.put(SPINA, SPINB, .34, .34, .016, 1.008, co.stone, {hard: true, gloss: .44, ...SLAB});
  A.put(SPINA, SPINB, .31, .31, .010, 1.022, co.warm, {hard: true, mode: 1, glow: .05});
  const SPIN = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let t = 0; t < 3; t++) {
    const ry = 1.09 + t * .20;
    SPIN.forEach((n, i) => {
      A.put(SPINA + n[0] * .052, SPINB + n[1] * .052,
        Math.abs(n[0]) * .104 + Math.abs(n[1]) * .150,
        Math.abs(n[1]) * .104 + Math.abs(n[0]) * .150, .016, ry - .008, co.steel,
        {hard: true, gloss: .62, ...STEEL});
      pair(SPINA + n[0] * .078, SPINB + n[1] * .078, ry,
        FC[(i * 3 + t * 2 + 1) % FC.length], [3, 0, 1, 4][(i + t) % 4], n, true);
    });
  }
  for (const da of [-.085, .085]) for (const db of [-.085, .085])
    A.put(SPINA + da, SPINB + db, .022, .022, .62, 1.335, co.steelD,
      {hard: true, gloss: .6, ...STEEL});
  A.put(SPINA, SPINB, .32, .32, .050, 1.670, co.trim, {hard: true, gloss: .30});
  A.put(SPINA, SPINB, .022, .30, .105, 1.752, co.trim, {hard: true, gloss: .30});
  A.glyph(SPINA + .018, SPINB, 1.752, '墨镜',
    {size: .072, gap: .024, color: A.acc, mode: 1, glow: .09});
  A.stop(SPINA - .25, SPINA + .25, SPINB - .25, SPINB + .25);

  // ---- the waiting bench, on the +b partition under the shell's own lightbox.
  // Between the frame bay at the back and the mirror at the front, that partition had 1.3 m of
  // bare plaster from the skirting to 1.4 m, which is both the emptiest wall in the shop and the
  // surface the occlusion pass makes the worst mess of. An optician has somewhere to sit while
  // the lenses are cut; this is it, and it covers the wall.
  A.put(2.30, 3.62, 1.16, .28, .12, .06, co.trim, {hard: true, gloss: .30});
  A.put(2.30, 3.60, 1.20, .34, .10, .400, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(2.30, 3.58, 1.14, .30, .075, .4875, C('#3f5b52'), {mode: 7, round: .03});
  A.put(2.30, 3.68, 1.20, .09, .40, .680, co.oakD, {hard: true, gloss: .20, ...TIMBER});
  A.put(2.30, 3.632, 1.14, .07, .32, .700, C('#3f5b52'), {mode: 7, round: .03});
  A.stop(1.68, 2.92, 3.40, 3.78);

  // ---- and the staff side of the -b partition, behind the till: a low run of stock drawers,
  // which is the same wall doing the same job for the people who work here.
  base(2.26, -3.60, 1.28, .30, [0, 1]);
  for (let i = 0; i < 4; i++)
    carton(1.86 + i * .26, -3.58, .952, [co.white, A.acc, co.cream, C('#63a8c4')][i],
      .086, .092, .116);

  // ================================================================ the window
  // The shell dresses each half of the glazing with two stone plinths and stands three pairs of
  // its own generic glasses on each. That leaves the middle of both windows empty, which is where
  // the eye goes first walking down the aisle. A slim lit column between them with three frames
  // on brackets is what a real optician stands there.
  //
  // Everything here now stands at a 4.38 or deeper, and that number is not a look — it is where
  // the glazing's own collider begins (a 4.45 to 4.95, everywhere except the 3 m opening). The
  // first version of this column stood at a 4.14, which is a third of a metre *inside* the aisle
  // the player walks down to reach the till: a shopper on that route walks straight through it,
  // because a window display carries no collision of its own. Behind the collider it is display.
  for (const s of [-1, 1]) {
    const bb = s * 2.65;
    // The column on the centreline of each window half, between the shell's own two plinths.
    // Taller than it was and carrying five pairs rather than three, because from the aisle this
    // is read at four or five metres and three frames on a post is a coat stand.
    A.put(4.52, bb, .16, .16, 1.02, .85, C('#cfc7b3'), {hard: true, gloss: .30, ...PLAST});
    A.put(4.52, bb, .24, .24, .022, 1.372, co.stone, {hard: true, gloss: .44, ...SLAB});
    A.put(4.61, bb, .012, .13, .94, .85, co.warm, {hard: true, mode: 1, glow: .055});
    for (let i = 0; i < 5; i++) {
      const ry = .46 + i * .21;
      A.put(4.665, bb, .120, .150, .022, ry - .011, co.steel,
        {hard: true, gloss: .62, ...STEEL});
      pair(4.685, bb, ry, FC[(i * 3 + 4) % FC.length], [4, 1, 2, 0, 3][i], [1, 0],
        i === 1 || i === 4);
    }
    // A low step at each end of the bay. Those two ends were the emptiest glass in the shopfront:
    // the shell dresses the middle of each half and leaves half a metre of bare riser at the
    // mullions, which from the aisle is where one shop stops and the next begins.
    for (const d of [-1, 1]) {
      const cb = bb + d * .88;
      A.put(4.56, cb, .34, .36, .30, .15, co.stone, {hard: true, gloss: .38, ...SLAB});
      A.put(4.56, cb, .36, .38, .022, .311, co.trim, {hard: true, gloss: .44});
      for (let i = 0; i < 3; i++)
        pair(4.60, cb - .12 + i * .12, .33, FC[(i * 4 + d + 6) % FC.length],
          [1, 3, 4][i], [1, 0], d < 0, 'stand');
    }
    // and a header over each half, which is what tells somebody walking past what is in the glass.
    A.put(4.50, bb, .05, 1.10, .16, 2.30, co.trim, {hard: true, gloss: .28});
    A.put(4.535, bb, .02, .96, .105, 2.30, C('#1c4f45'), {hard: true, mode: 1, glow: .05});
    A.glyph(4.560, bb, 2.30, s > 0 ? '配镜' : '墨镜',
      {size: .068, gap: .026, color: co.white, mode: 1, glow: .07});
  }

  // ================================================================ light
  // Three, which is what a tenant may safely declare: eight reach the shader and the nearest to
  // the camera win, so standing in this shop these are the near ones. They are aimed at the two
  // frame bays and at the front of the room, because a wall of frames unlit is a wall of nothing
  // and the ceiling grid overhead is doing the general level already.
  A.light(1.00, -2.45, 2.70, [1.00, 0.96, 0.89], .22, 3.0);
  A.light(0.95,  2.66, 2.70, [1.00, 0.97, 0.92], .28, 3.1);
  A.light(3.05,  0.40, 2.80, [1.00, 0.97, 0.93], .18, 3.4);

  // ================================================================ the verbs
  // Rows in `USE_AT.mall`, installed as getters. `USE_AT` is declared in js/data.js, which loads
  // long before anybody walks into this building; the guard is only for a harness that loads the
  // tenant files on their own. A getter is re-read every frame the walk-up prompt is drawn, so
  // each one below builds a small object literal and touches nothing else — that is what lets
  // 取镜 refuse until the job is genuinely finished, and what lets one label be 调一下 today and
  // 修眼镜 once the hinge has been found loose. The pattern and its two costs are documented at
  // length in js/mall-digital.js and are not repeated here.
  const P0 = {type: 'stand'}, PP = {type: 'press'}, PO = {type: 'open'}, PT = {type: 'talk'},
        PR = {type: 'reach'};
  function verb(hz, get) {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, {configurable: true, enumerable: true, get});
  }
  // The pair goes on your actual face. js/game.js puts `PLAYER` — the look object the renderer
  // draws your body from — on `window.__game`, and js/figure.js:2005 builds a real pair of
  // glasses off one boolean on it. That boolean is the whole of the wardrobe: the frame colour is
  // hard-coded at figure.js:2011 and the shape is not a parameter at all, so every one of the six
  // frames previews as the same dark pair. See REQUESTS at the foot of this file.
  const wear = (on, frame) => {
    const g = window.__game;
    if (!g || !g.PLAYER) return;
    g.PLAYER.glasses = !!on;
    g.PLAYER.glassesTemporary = !!on && !Number.isSafeInteger(frame);
    if (!on) return;
    const index = Number.isSafeInteger(frame)
      ? Math.max(0, Math.min(MO.FRAMES.length - 1, frame))
      : MO.live().frame;
    const picked = MO.FRAMES[index] || MO.FRAMES[0];
    g.PLAYER.glassesShape = index;
    g.PLAYER.glassesColor = C(picked.look);
  };
  const worn = () => { const g = window.__game; return !!(g && g.PLAYER && g.PLAYER.glasses); };

  verb('验光', () => {
    const T = MO.live().test;
    if (T.done) {
      const [zh, tr] = MO.rxLine();
      return {zh: '看验光单', py: 'kàn yànguāngdān', secs: 2.0, mins: 3, gain: {}, pose: P0,
        en: `read your prescription — ${T.hits} of ${MO.ROUNDS} read correctly`,
        done: zh, doneTr: tr};
    }
    const d = MO.DIRS[MO.targetOf(T.round)];
    return {zh: '验光', py: 'yànguāng', secs: 1.0, mins: 2, gain: {}, pose: PP,
      en: `sight test — press while the E points ${d.en} (${d.hz} ${d.py}) · ` +
          `${T.round + 1} of ${MO.ROUNDS}, ${T.hits} right so far`,
      done: '看清楚了。', doneTr: 'Read it.'};
  });
  // The four choices. Each label reads out what is chosen now and what the next press will change
  // it to, so a press is never a guess; the running total goes on the card afterwards, because a
  // USE row's one fixed `done` sentence cannot carry a number that changes.
  const PICKS = [
    {hz: '镜框', key: 'frame', list: MO.FRAMES, zh: '挑镜框', py: 'tiāo jìngkuàng', what: 'frame'},
    {hz: '镜片', key: 'lens',  list: MO.LENSES, zh: '挑镜片', py: 'tiāo jìngpiàn', what: 'lens'},
    {hz: '染色', key: 'tint',  list: MO.TINTS,  zh: '挑颜色', py: 'tiāo yánsè',    what: 'tint'},
    {hz: '镀膜', key: 'coat',  list: MO.COATS,  zh: '挑镀膜', py: 'tiāo dùmó',     what: 'coating'},
  ];
  for (const q of PICKS) verb(q.hz, () => {
    const S = MO.live(), cur = q.list[S[q.key] % q.list.length],
          nxt = q.list[(S[q.key] + 1) % q.list.length];
    return {zh: q.zh, py: q.py, secs: 1.6, mins: 3, gain: {mood: 2}, pose: P0,
      en: `${q.what}: ${cur.en}${cur.price ? ` ¥${cur.price}` : ' — no charge'} · ` +
          `press for ${nxt.en}`,
      done: `那就要${nxt.hz}。`, doneTr: `${nxt.hz} it is — ${nxt.en}.`};
  });
  verb('配镜', () => {
    const S = MO.live();
    if (S.order)
      return {zh: '问进度', py: 'wèn jìndù', secs: 1.6, mins: 2, gain: {}, pose: PT,
        en: `order ${S.order.no} is already being made up`,
        block: `${S.order.no}还在做，${MO.hhmm(S.order.at)}以后来取。`,
        blockTr: `${S.order.no} is not finished — collect after ${MO.hhmm(S.order.at)}.`};
    if (!S.rx)
      return {zh: '先验光', py: 'xiān yànguāng', secs: 1.4, mins: 1, gain: {}, pose: PT,
        en: 'they will not cut lenses without a prescription',
        block: '得先验光才能配镜。',
        blockTr: 'They have to test your eyes before they can make anything.'};
    const t = MO.total();
    return {zh: '配眼镜', py: 'pèi yǎnjìng', secs: 2.8, mins: 9, pay: -t, gain: {mood: 6}, pose: PO,
      en: `order the glasses — ${MO.FRAMES[S.frame].en}, ${MO.LENSES[S.lens].en}, ` +
          `${MO.TINTS[S.tint].en}, ${MO.COATS[S.coat].en} · ¥${t}`,
      done: `一共${t}块，一个小时以后来取。`,
      doneTr: `${t} kuai altogether — come back for them in an hour.`};
  });
  verb('取镜', () => {
    const S = MO.live();
    if (!S.order)
      return {zh: '看托盘', py: 'kàn tuōpán', secs: 1.2, mins: 1, gain: {}, pose: P0,
        en: 'nothing of yours is waiting in the tray',
        block: '托盘上没有我的眼镜。', blockTr: 'There is nothing of mine in the tray.'};
    if (!MO.due(S.order))
      return {zh: '问取镜', py: 'wèn qǔjìng', secs: 1.4, mins: 2, gain: {}, pose: PT,
        en: `${S.order.no} is not ready until ${MO.hhmm(S.order.at)}`,
        block: `${S.order.no}还没好，${MO.hhmm(S.order.at)}以后来。`,
        blockTr: `${S.order.no} is not ready — after ${MO.hhmm(S.order.at)}.`};
    return {zh: '取眼镜', py: 'qǔ yǎnjìng', secs: 2.2, mins: 5, gain: {mood: 14}, pose: PR,
      en: `collect ${S.order.no} — ${MO.FRAMES[S.order.frame].en}`,
      done: '戴上试试，正好。', doneTr: 'Put them on — they fit.'};
  });
  verb('试戴', () => {
    if (worn())
      return {zh: '摘下来', py: 'zhāi xiàlái', secs: 1.2, mins: 1, gain: {}, pose: PR,
        en: 'take the pair off again', done: '摘下来了。', doneTr: 'Off again.'};
    return {zh: '试戴', py: 'shìdài', secs: 1.8, mins: 2, gain: {mood: 4}, pose: PR,
      en: `try ${MO.FRAMES[MO.live().frame].en} on in front of the mirror`,
      done: '这副挺合适的。', doneTr: 'This pair suits you.'};
  });
  // One label, three states, and the middle one is earned rather than timed: the first time you
  // bring a pair of your own back to be adjusted they find the hinge loose, and after that it is
  // the free bend-and-warm for ever. Nothing in the game breaks a frame, so a repair that could
  // be bought at any moment would be a repair of nothing.
  verb('调整', () => {
    const S = MO.live();
    if (!S.owned)
      return {zh: '问调整', py: 'wèn tiáozhěng', secs: 1.4, mins: 2, gain: {}, pose: PT,
        en: 'they adjust and repair frames — bring a pair of your own in',
        block: '我还没有自己的眼镜可以调。',
        blockTr: 'I have no glasses of my own to have adjusted yet.'};
    if (S.repairs === 0 && S.adjusts >= 1)
      return {zh: '修眼镜', py: 'xiū yǎnjìng', secs: 2.6, mins: 8, pay: -MO.REPAIR_PRICE,
        gain: {mood: 5}, pose: PO,
        en: `the hinge is loose — have it repaired, ¥${MO.REPAIR_PRICE}`,
        done: '螺丝换了，鼻托也换了。', doneTr: 'New screw, and new nose pads while they were at it.'};
    return {zh: '调一下', py: 'tiáo yíxià', secs: 2.0, mins: 4, gain: {mood: 6}, pose: PO,
      en: 'have the frame warmed and bent true — no charge',
      done: '烤一下就正了，不收钱。', doneTr: 'Warmed, straightened, and nothing to pay.'};
  });

  // ================================================================ the tick
  // One motion for the whole service side: the tumbling E, the direction lamps, the four selector
  // runs, the order slip, the collection tray and the frame warmer — plus the completion watcher
  // described in js/mall-digital.js. Culled at 20 m, so none of it costs anything from another
  // deck or the far end of the concourse.
  const VERBS = {
    '验光': 'test', '看验光单': 'rx',
    '挑镜框': 'frame', '挑镜片': 'lens', '挑颜色': 'tint', '挑镀膜': 'coat',
    '配眼镜': 'order', '取眼镜': 'collect',
    '试戴': 'wear', '摘下来': 'off', '调一下': 'adjust', '修眼镜': 'repair',
  };
  // How long each takes, kept here rather than read back off the def, because by the time the
  // panel closes the def the player pressed on is gone. Anything shorter than 85% of it is Escape.
  const SECS = {test: 1.0, rx: 2.0, frame: 1.6, lens: 1.6, tint: 1.6, coat: 1.6,
                order: 2.8, collect: 2.2, wear: 1.8, off: 1.2, adjust: 2.0, repair: 2.6};
  const LISTS = {frame: MO.FRAMES, lens: MO.LENSES, tint: MO.TINTS, coat: MO.COATS};
  const screeningPower=A.powerDisplay
    ?A.powerDisplay([chartFace,svc.E,svc.cue,instrumentScreen],{id:'screening-equipment'})
    :{active:true};
  let watchKey = '', watchAt = 0, heatUntil = 0, clockAt = 0;
  let dz = null, doingEl = null;
  // Where the screening bay is, in the mall's own coordinates, worked out from the toolkit rather
  // than written down: `A.at` is the same conversion every other piece of this fit-out goes
  // through, so this survives the unit being moved to another wall.
  const CHART = A.at(1.75, -2.24);
  A.motion('service', (t, state, P, minutes) => {
    if (Number.isFinite(minutes)) MO.setClock(null, minutes);
    // The calendar, twice a second at most: `__game.state()` copies the pantry and the bank
    // ledger, which is nothing at 0.5 Hz and would be silly at 60.
    if (t - clockAt > 2) {
      clockAt = t;
      const g = window.__game;
      if (g && typeof g.state === 'function') { try { MO.setClock(g.state().day, minutes); } catch (_) {} }
    }
    const S = MO.live(), T = S.test;

    // ---- the physical prescription. Alpha changes once when the test completes or resets;
    // severity is encoded on both eye bands so a close UI-free shot can distinguish the result.
    const rxKey = S.rx ? `${S.rx.r}/${S.rx.l}/${S.rx.cyl}` : '';
    if (rxKey !== state.rxKey) {
      state.rxKey = rxKey;
      for (const p of svc.rxCard) p.alpha = S.rx ? 1 : .001;
      if (S.rx) {
        const shade = v => Math.abs(v) >= 3 ? C('#b64d3f')
          : Math.abs(v) >= 1.5 ? C('#c9943c') : C('#43806d');
        svc.rxEyes[0].color = shade(S.rx.r);
        svc.rxEyes[1].color = shade(S.rx.l);
      }
      state.rxVisible = S.rx ? 1 : 0;
    }

    // ---- the tumbling E. Exactly four bars are in the frame at any moment, and which four is a
    // pure function of the clock — so the panel and the scoring cannot disagree about what was
    // being shown when the key went down.
    //
    // Only while somebody is near enough to read it. The screening bay's own focus point is at
    // a 1.75, b -2.24, which is world (21.25, -2.74); past four metres of that the panel holds
    // whatever it was last showing, which is a still chart on a wall and is what a still chart on
    // a wall should look like from across the shop. The props stay dynamic either way — this
    // saves the writes and the sines, not the instance cost, and it is the sines that add up when
    // eighteen tenants are all breathing at once.
    const near = !P || typeof P.x !== 'number' ||
      ((P.x - CHART[0]) ** 2 + (P.z - CHART[1]) ** 2 < 16);
    if (screeningPower.active&&near) {
      const gi = T.done ? 0 : (T.round < 3 ? 0 : 1);
      const dir = MO.dirAt(t, T.done ? 0 : T.round);
      for (let g = 0; g < svc.E.length; g++)
        for (let k = 0; k < 4; k++) {
          const a = (g === gi && k === dir) ? 1 : .001, bars = svc.E[g][k];
          for (let i = 0; i < 4; i++) bars[i].alpha = a;
        }
      const want = T.done ? -1 : MO.targetOf(T.round);
      for (let i = 0; i < 4; i++)
        svc.cue[i].glow = i === want ? .24 + .10 * (.5 + .5 * Math.sin(t * 3.1)) : .03;
    }
    state.displayPower=screeningPower.active?'on':'off';

    // ---- the four selector runs
    for (const key in LISTS) {
      const lamps = svc.sel[key], at = S[key] % lamps.length;
      const stateKey = `selector_${key}`;
      if (state[stateKey] === at) continue;
      for (let i = 0; i < lamps.length; i++) lamps[i].glow = i === at ? .30 : .035;
      state[stateKey] = at;
    }
    state.selectorGroups = 4;
    state.selectorLegendParts = 12;

    // ---- the counter. Amber and breathing while the job is in the workshop, steady with the
    // case in the tray once it can actually be collected.
    const ready = S.order && MO.due(S.order);
    svc.slip.alpha = S.order ? 1 : .001;
    svc.pad.glow = S.order ? .05 + .07 * (.5 + .5 * Math.sin(t * 1.6)) : .05;
    svc.ready.glow = ready ? .22 : .02;
    for (const p of svc.box) p.alpha = ready ? 1 : .001;
    svc.heat.glow = (t < heatUntil ? .30 : .10) + .015 * Math.sin(t * 2.3);

    // ---- the completion watcher. Two DOM reads a frame off cached elements, and only while the
    // player is inside this shop.
    if (!doingEl) { doingEl = document.getElementById('doing'); dz = doingEl && doingEl.querySelector('.dz'); }
    const on = !!doingEl && doingEl.classList.contains('on');
    const key = on && dz ? (VERBS[dz.textContent] || '') : '';
    if (key && key !== watchKey) { watchKey = key; watchAt = t; began(key, t); }
    else if (!key && watchKey) {
      if (t - watchAt >= (SECS[watchKey] || 2) * .85) ended(watchKey, t);
      watchKey = ''; watchAt = 0;
    }
    state.round = T.round; state.hits = T.hits; state.total = MO.total();
    state.order = S.order ? S.order.no : '';
  }, {far: 20});

  // The instant the key goes down. Only the sight test cares, and it has to: the E is still
  // turning, and a second later is not an answer to what was on the panel.
  function began(key, t) {
    if (key !== 'test') return;
    const r = MO.shoot(t);
    MO.card(r.right ? `对，是${r.want.hz}。` : `是${r.shown.hz}，不是${r.want.hz}。`,
      r.right ? `Right — it was pointing ${r.want.en}. ${r.hits} of ${r.round}.`
              : `It was pointing ${r.shown.en}, not ${r.want.en}. ${r.hits} of ${r.round}.`);
    if (MO.live().test.done)
      setTimeout(() => { const [zh, tr] = MO.rxLine(); MO.card(zh, tr); }, 1600);
  }
  // And what happens when an action finishes. Everything that changes the shop's mind about you
  // is here, because everything here is something you had to stand still for.
  function ended(key, t) {
    if (key === 'rx') { const [zh, tr] = MO.rxLine(); MO.card(zh, tr); return; }
    if (LISTS[key]) {
      const q = LISTS[key][MO.cycle(key, LISTS[key].length)];
      MO.card(`${q.hz}${q.price ? ` ¥${q.price}` : ' 不加钱'}`,
        `${q.en} · ${q.py} · the pair now comes to ¥${MO.total()}`);
      return;
    }
    if (key === 'order') {
      const o = MO.order(), st = MO.state();
      MO.card(`配镜单 ${o.no}`,
        `Order ${o.no} · ¥${o.total} · ready at ${MO.hhmm(o.at)}` +
        (o.day > st.day ? ' tomorrow' : ' today'));
      return;
    }
    if (key === 'collect') {
      const o = MO.collect();
      if (!o) return;
      wear(true, o.frame);
      MO.card(`${o.no} 取好了。`,
        `${o.no} collected — ${MO.FRAMES[o.frame].en}, and you are wearing them.`);
      return;
    }
    if (key === 'wear') { wear(true); return; }
    if (key === 'off') { wear(false); return; }
    if (key === 'adjust') {
      MO.adjust(); heatUntil = t + 6;
      MO.card('调好了。', 'Warmed, bent true and handed back — nothing to pay.');
      return;
    }
    if (key === 'repair') {
      MO.repair(); heatUntil = t + 6;
      MO.card('修好了。', `New screw and new nose pads — ¥${MO.REPAIR_PRICE}.`);
    }
  }

  // ================================================================ what there is to say
  // Every focus point is a spot of open floor. `A.th` puts it at a + 1.15, so a label's own depth
  // decides whether the shop can be used: the glazing's collider starts at a 4.45, which means
  // anything labelled deeper than about a 3.0 has its focus inside the glass — except across the
  // 3 m opening, where there is no glass and a focus may run out to a 4.6.
  //
  // That is the whole reason the sunglasses tower moved. `reach` is a radius rather than a walk,
  // so a focus point standing in a fixture is still usable from beside it, but it is the wrong
  // way round: the spot the game means you to stand on should be floor you can stand on. All four
  // of these are, and .optical-reach in the harness measures it rather than taking my word.
  //
  // 眼镜店 is the one the purchase system needs — game.js generates a browse action for every
  // MALL_GOODS key and hangs it on the label tagged with the shop's kind — and it sits at a 5.15,
  // out past the shopfront, so its focus resolves *inward* to a 4.00 in the middle of the door.
  // The till is the shell's, built by A.counter above, and is tagged 收银台 for the same reason.
  A.th('眼镜店', 5.15, 0, '我想配一副新眼镜。', 'I would like a new pair of glasses.',
    '眼 eye + 镜 lens.', 2.2, 2.5);
  A.th('眼镜', 2.42, 0, '这副眼镜试戴一下。', 'Try this pair on.',
    '眼镜 means glasses.', 1.9, 1.1);
  // Not at SPINA. The tower's own a of 3.05 puts this focus at a 4.20, and the shopfront glazing's
  // collider begins at a 4.45 — which is 4.15 once the body's 0.30 m radius is allowed for, so the
  // spot the player is sent to stands 5 cm inside the glass. Nothing about that is visible in a
  // render and .optical-reach.js has been red on it; the marker moves 10 cm inward, which is still
  // on the tower (its body spans a 2.87 to 3.23) and puts the focus 5 cm clear of the pane.
  A.th('墨镜', 2.95, SPINB, '这副墨镜很适合你。', 'These sunglasses suit you.',
    '墨 ink + 镜 lens — dark lenses.', 1.7, 1.35);
  // The fitting mirror. Labelled from a 2.90 rather than from the mirror itself at a 3.32: the
  // mirror stands 1.1 m from the glass, so a label on it focuses at a 4.47, which is inside the
  // shopfront's collider. Here the focus lands at a 4.05, b 3.00 — the pocket of open floor
  // between the customer's chair and the mirror station, which is where you stand to use it.
  A.th('镜子', 2.90, 3.00, '照照镜子看看合不合适。', 'Look in the mirror and see whether they fit.',
    '照镜子 means to look in a mirror.', 1.8, 1.6);

  // ---- and the nine services.
  //
  // `reach` is a radius round the *focus point* and the label's own position is not in it:
  // js/game.js:10666 is `hypot(th.focus - P) <= th.reach`, and js/game.js:12920 selects on
  // `d / reach` measured the same way. .optical-reach.js asserts something stricter — that the
  // label must be inside its own reach of its focus — which no A.th in this building can satisfy
  // under 1.15, because A.th puts the focus at a + 1.15 by construction. These are all 1.20 so
  // that the harness and the engine agree; the discrimination between four labels 0.37 m apart is
  // done by `d / reach` and not by the radius, so nothing is lost by the larger circle.
  //
  // Every focus point below is a spot of open floor, measured at the body's own 0.30 m radius
  // rather than eyeballed:
  //
  //   验光            (2.10, -1.50)   the doorway of the screening room
  //   镜框 … 镀膜     (3.95, ∓.55/∓.18) the doorway, where 眼镜店's own focus already is
  //   配镜 / 取镜     (3.85, -2.48) and (3.85, -2.95)   the front aisle in front of the till
  //   试戴            (4.05, 2.70)    the pocket in front of the full-height mirror
  //   调整            (3.97, 2.28)    the front aisle past the customer's chair
  //
  // Three of those were somewhere else until .optical-reach.js measured them, and the reason all
  // three were wrong is the same reason: a collider is tested at the *body's* radius, so every box
  // in this shop is 0.30 m bigger in each direction than the number it was written with. The
  // instrument's collider stops at b -2.32 and the alcove floor at b -2.24 is still inside it.
  //
  // 验光's label hangs on the screening room's own screen rather than on the chart, because the
  // chart's own a of 0.60 forces a focus at a 1.75 and there is no b on that line that is not
  // inside the instrument, the stool or the till once all three are inflated. From the doorway at
  // (2.10, -1.50) the panel is 1.67 m away and the sightline crosses b -1.62 at a 1.86, which is
  // 0.31 m past the open end of the screen — so it is a real look through a real doorway.
  A.th('验光', .95, -1.50, '看这个E，缺口朝哪边？', 'Look at the E — which way is it pointing?',
    '验 to examine + 光 light. 验光 is having your eyes tested.', 1.2, 1.45);
  A.th('镜框', 2.80, -.55, '这个镜框我喜欢。', 'I like this frame.',
    '镜 lens + 框 rim. 全框 is a full rim, 无框 rimless.', 1.20, .87);
  A.th('镜片', 2.80, -.18, '镜片有薄一点的吗？', 'Do you have thinner lenses?',
    '镜 lens + 片 a thin piece. The number is the index: 1.67 is the thinnest here.', 1.20, .87);
  A.th('染色', 2.80, .18, '染个浅茶色好看。', 'A light brown tint would look good.',
    '染 to dye + 色 colour. 变色片 goes dark outdoors on its own.', 1.20, .87);
  A.th('镀膜', 2.80, .55, '加一个防蓝光的膜。', 'Add a blue-light filter coating.',
    '镀 to plate + 膜 a film — the coating on the lens.', 1.20, .87);
  A.th('配镜', 2.70, -2.48, '这副配下来一共多少钱？', 'How much for this pair made up?',
    '配 to fit out + 镜 lens. 配镜 is having glasses made to a prescription.', 1.20, 1.10);
  // The tray itself is at b -3.13; its label stands 18 cm along the counter from it, because a
  // focus at b -3.13 is 5 cm inside the dispensary cabinet once that is inflated by the body.
  A.th('取镜', 2.70, -2.95, '我来取眼镜，单号在这儿。',
    'I have come for my glasses — here is the order number.',
    '取 to collect + 镜 lens.', 1.20, 1.10);
  A.th('试戴', 2.90, 2.70, '我试戴一下这副。', 'Let me try this pair on.',
    '试 to try + 戴 to wear on the face. 穿 is for clothes; glasses are 戴.', 1.20, 1.35);
  // On the customer's edge of the fitting desk, not its middle: at a 2.42 the focus lands at
  // a 3.57, which is inside the customer's chair inflated by the body (a 2.72 to 3.80).
  A.th('调整', 2.82, 2.28, '眼镜有点松，帮我调一下。',
    'These are a little loose — could you adjust them?',
    '调整 tiáozhěng is to bring something back into shape.', 1.20, .90);
};

// ================================================================================== the windows
// Thin frames disappear behind the landlord's default milky glass, so this tenant opts into the
// clearest frontage in the row. The gloss stays high enough to preserve a real pane and the dark
// jade backboards give every small object something to read against.
//
// Budget: 24 primitives in the frame-gallery bay and 25 in the eye-test bay, 49 total. Everything
// is static and uses the shell's existing primitive/material batches.
MallFit['眼镜店:glass'] = { alpha: .13, gloss: .90 };
MallFit['眼镜店:win'] = (W, bc, side) => {
  const jade = C('#244b45'), jadeL = C('#6ca899'), ink = C('#24292d');
  const oak = C('#a9875f'), cream = C('#efe9dc'), brass = C('#c4a05b');
  const lens = C('#bfe2df'), warm = C('#ffe6b2');

  W.put(4.18, bc, .94, 1.84, .045, .363, cream, { hard:true, gloss:.34 });
  W.put(3.79, bc, .075, 1.68, 1.10, 1.48, jade, { hard:true, gloss:.22 });
  W.put(3.835, bc, .014, 1.48, .035, 1.98, warm, { hard:true, mode:1, glow:.10 });

  if (side < 0) {
    // Three frames, three heights, three finishes. The frames are intentionally oversized enough
    // to survive the atrium view; inside the room the stock walls carry the true retail scale.
    const bs = [bc - .55, bc, bc + .55];
    const hs = [.30, .52, .39];
    const cs = [ink, brass, jadeL];
    for (let i = 0; i < 3; i++) {
      const top = .39 + hs[i];
      W.put(4.14, bs[i], .30, .34, hs[i], .39 + hs[i] / 2, oak,
        { hard:true, gloss:.28 });
      W.put(4.14, bs[i], .33, .37, .020, top + .010, brass,
        { hard:true, gloss:.48 });
      // Two rims, bridge and folded temples: five marks are enough to read as eyewear at distance.
      W.put(4.24, bs[i] - .075, .040, .125, .105, top + .125, cs[i],
        { hard:true, gloss:.46, round:.030 });
      W.put(4.24, bs[i] + .075, .040, .125, .105, top + .125, cs[i],
        { hard:true, gloss:.46, round:.030 });
      W.put(4.265, bs[i], .018, .050, .016, top + .125, cs[i],
        { hard:true, gloss:.50 });
      W.put(4.14, bs[i] - .120, .18, .016, .016, top + .125, cs[i],
        { hard:true, gloss:.44, rz:.05 });
      W.put(4.14, bs[i] + .120, .18, .016, .016, top + .125, cs[i],
        { hard:true, gloss:.44, rz:-.05 });
    }
  } else {
    // The second bay shows the service rather than more stock: a high-contrast eye chart behind a
    // trial-frame instrument. No letters are needed for the tumbling-E rhythm to be recognisable.
    W.put(3.845, bc - .38, .020, .62, .82, 1.48, ink, { hard:true, gloss:.28 });
    W.put(3.858, bc - .38, .010, .54, .74, 1.48, cream, { hard:true, gloss:.18 });
    W.put(3.868, bc - .38, .008, .28, .050, 1.75, ink, { hard:true });
    W.put(3.868, bc - .50, .008, .050, .18, 1.68, ink, { hard:true });
    W.put(3.868, bc - .33, .008, .22, .040, 1.52, ink, { hard:true });
    W.put(3.868, bc - .43, .008, .040, .14, 1.47, ink, { hard:true });
    W.put(3.868, bc - .28, .008, .16, .032, 1.34, jade, { hard:true });
    W.put(3.868, bc - .38, .008, .32, .024, 1.20, jadeL,
      { hard:true, mode:1, glow:.06 });

    const ib = bc + .40;
    W.put(4.14, ib, .34, .42, .18, .455, oak, { hard:true, gloss:.28 });
    W.put(4.14, ib, .37, .45, .020, .555, brass, { hard:true, gloss:.48 });
    W.put(4.08, ib, .055, .055, .52, .825, ink, { hard:true, gloss:.42 });
    W.put(4.12, ib, .075, .52, .065, 1.060, ink, { hard:true, gloss:.42 });
    for (const k of [-1, 1]) {
      W.put(4.19, ib + k * .155, .060, .235, .220, 1.060, ink,
        { hard:true, gloss:.46, round:.055 });
      W.put(4.225, ib + k * .155, .014, .155, .140, 1.060, lens,
        { hard:true, mode:1, alpha:.42, gloss:.82, round:.045 });
      W.ball(4.245, ib + k * .285, 1.060, .035, .035, .035, brass, { gloss:.52 });
    }
    W.put(4.22, ib, .025, .075, .035, 1.060, brass, { hard:true, gloss:.52 });
    for (const k of [-1, 0, 1])
      W.put(4.33, bc + k * .20, .22, .15, .045, .405, [jadeL, brass, ink][k + 1],
        { hard:true, gloss:.36, round:.018 });
  }
};

// ================================================================================== the people
//
// Staff and shoppers, declared here rather than in js/game.js — see MallCast at the top of
// js/mall.js. game.js folds this into the roster before the world is built, so these are
// ordinary NPCS rows and every field one of those takes works.
//
// At file scope, deliberately, and not inside the fit-out above. The fit is a callback the mall
// runs the first time somebody walks into the building; game.js reads MallCast once while it is
// initialising the roster, which happens at load. A cast pushed from inside the fit is a cast
// that arrives after the fold has already happened — the shop builds perfectly and is empty, and
// nothing anywhere reports an error.
//
// `at` and `patrol` are the MALL's world coordinates, not this shop's (a, b). On the east wall
// with the unit's centre at u = -0.5, the conversion is exactly:
//
//     x = 23 - a          z = b - 0.5
//
// and yaw is atan2(dx, dz), so +PI/2 faces the back wall, -PI/2 faces out to the concourse,
// 0 faces +b and PI faces -b.
//
// Every position below was checked against this shop's own colliders at the player's radius of
// 0.30 before it was written, and is checked again by the harness: an optician staffed by three
// people standing inside their own joinery is worse than an empty one, and it is not something
// a screenshot from one angle will show you.
const AT = (a, b) => [23 - a, b - .5];
const IN = Math.PI / 2, OUT = -Math.PI / 2, PLUS = 0, MINUS = Math.PI;

MallCast.push(
  // ---- 验光师. The optometrist, sitting at the far side of the dispensing desk with a customer
  // across it. The chair is built above at a 1.62, b 2.28 with its pan top at 0.49, and it faces
  // back out into the room, so she is looking at the customer rather than at the back wall.
  { hz: '验光师', name: '沈静', py: 'Shěn Jìng', place: 'mall', mallFloor: 1,
    rig: 'mall-optometrist-shen-jing', temper: 'genial',
    seatY: .49,
    look: {skin: '#e8bd94', hair: '#241e1b', hairStyle: 'bun', top: '#f2efe6', pants: '#39434f',
      shoe: '#2b3034', vest: '#2f6d61', collar: 'shirt', glasses: true, badge: true,
      tall: .97, faceSeed: 7421},
    spots: [{h0: 9, h1: 22, at: AT(1.62, 2.28), face: OUT, act: 'sit'}],
    lines: [['您好，先验个光吧。', 'Hello — let us test your eyes first.'],
            ['看看这一行，能看清吗？', 'Look at this line — can you read it clearly?'],
            ['您的度数比上次深了一点。', 'Your prescription is a little stronger than last time.'],
            ['配好了明天下午来取。', 'They will be ready to collect tomorrow afternoon.']] },

  // ---- 导购员. The one on the floor, standing between the back-wall frame bay and the +b
  // partition bay with a customer in front of her. a 1.30 is clear of the back-wall base unit,
  // which ends at a 0.82, and of the fitting desk, which begins at a 2.00.
  { hz: '导购员', name: '何雨桐', py: 'Hé Yǔtóng', place: 'mall', mallFloor: 1,
    rig: 'mall-optical-guide-he-yutong', temper: 'brisk',
    look: {skin: '#dfae86', hair: '#211d1b', hairStyle: 'bob', top: '#eee7da', pants: '#3c4653',
      shoe: '#272c31', vest: '#2f6d61', collar: 'shirt', badge: true,
      tall: 1.0, faceSeed: 7422},
    spots: [{h0: 9, h1: 22, at: AT(1.30, .30), face: PLUS, act: 'vend'}],
    lines: [['这副是钛的，很轻。', 'This pair is titanium — very light.'],
            ['您试试这个颜色，衬肤色。', 'Try this colour; it suits your complexion.'],
            ['镜框可以帮您调一下。', 'I can adjust the frame for you.'],
            ['墨镜在门口那个架子上。', 'The sunglasses are on the stand by the door.']] },

  // ---- 收银员. Behind the till, at the +b end of the counter run. The counter body occupies
  // a 2.57 to 3.43, so a 2.15 stands her behind it; b -1.90 is clear of the instrument's
  // collider, which stops at b -2.02, and of the stool's, which stops at b -2.13.
  { hz: '收银员', name: '马丽娟', py: 'Mǎ Lìjuān', place: 'mall', mallFloor: 1,
    rig: 'mall-optical-cashier-ma-lijuan', temper: 'patient',
    look: {skin: '#d3a077', hair: '#2e2521', hairStyle: 'ponytail', top: '#f0e9dc',
      pants: '#3a3f47', shoe: '#2a2f33', vest: '#2f6d61', glasses: true, badge: true,
      tall: .95, faceSeed: 7423},
    spots: [{h0: 9, h1: 22, at: AT(2.15, -1.90), face: OUT, act: 'vend'}],
    lines: [['一共三百八十块。', 'Three hundred and eighty kuai altogether.'],
            ['要不要配个眼镜盒？', 'Would you like a case with them?'],
            ['发票给您放盒子里了。', 'I have put the receipt in the box for you.']] },

  // ---- and the customers. Four, and each of them is doing one of the four things this shop is
  // for, because a shop where everybody is walking reads as a corridor.
  //
  // Sitting across the dispensing desk from the optometrist, on the chair built at a 3.26.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'patient', seatY: .49,
    look: {skin: '#c99269', hair: '#302622', hairStyle: 'short', top: '#6f8291', pants: '#39424c',
      shoe: '#262b2e', collar: 'shirt', tall: 1.06, faceSeed: 7424},
    spots: [{h0: 9, h1: 22, at: AT(3.26, 2.28), face: IN, act: 'sit'}] },

  // At the full-height mirror with a pair on, which is the one thing everybody does in an
  // optician. a 3.32, b 3.00 is the pocket between the customer's chair, the waiting bench and
  // the mirror station, and it is clear of all three by at least 0.18.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bored',
    look: {skin: '#eabb92', hair: '#262019', hairStyle: 'tousled', top: '#a85f4c',
      pants: '#454b56', shoe: '#e9e2d5', glasses: true, bag: 'shoulder', bagColor: '#4d4136',
      tall: 1.02, faceSeed: 7425},
    spots: [{h0: 9, h1: 22, at: AT(3.32, 3.00), face: PLUS, act: 'wait'}] },

  // Being shown frames by the 导购员, facing her across the aisle in front of the two bays.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'steady',
    look: {skin: '#e2b489', hair: '#8d867e', hairStyle: 'short', top: '#77857a', pants: '#3d444c',
      shoe: '#2b3034', jacket: '#4a5a63', glasses: true, age: .55, tall: .96, faceSeed: 7426},
    spots: [{h0: 9, h1: 22, at: AT(1.30, .95), face: MINUS, act: 'wait'}] },

  // Waiting on the bench while the lenses are cut. The pan is built at a 1.73 to 2.87, b 3.43
  // to 3.73 with its top at 0.525, and the backrest is on the +b side, so a sitter faces -b.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bored', seatY: .525,
    look: {skin: '#d8ab84', hair: '#1f1a17', hairStyle: 'short', top: '#5c6f7d', pants: '#363d45',
      shoe: '#dfd8ca', pack: true, packColor: '#8a5f3e', tall: 1.04, faceSeed: 7427},
    spots: [{h0: 9, h1: 22, at: AT(2.20, 3.56), face: MINUS, act: 'phone'}] },

  // ---- two who walk in off the concourse, round the shop and out again. Both routes start and
  // end outside, pass through the 3 m opening at |b| < 1.5, and keep to the middle corridor
  // between the contact-lens case (which ends at a 0.92) and the island (which starts at 1.99).
  // Nothing on either lap comes within 0.30 of a collider, which is what stops a shopper
  // grinding into the counter until the patrol code gives up and skips a leg.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bustling',
    look: {skin: '#dbaa83', hair: '#29211d', hairStyle: 'ponytail', top: '#bd6a58',
      pants: '#46566a', shoe: '#ece6da', bag: 'tote', bagColor: '#d4ad55', tall: .99,
      faceSeed: 7428},
    patrol: [AT(6.40, -1.10), AT(4.30, -0.30), AT(3.60, 1.30), AT(1.50, 1.30),
             AT(1.50, -1.00), AT(3.55, -0.70), AT(4.30, 0.40), AT(6.60, 0.90)],
    speed: .96 },
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'brisk',
    look: {skin: '#c4906a', hair: '#2f2723', hairStyle: 'short', top: '#5f7079', pants: '#363d45',
      shoe: '#282d31', glasses: true, tall: 1.07, faceSeed: 7429},
    patrol: [AT(6.20, 1.60), AT(4.35, 0.60), AT(4.05, 2.20), AT(3.40, 3.05),
             AT(4.05, 2.20), AT(4.35, -0.60), AT(6.30, -2.00)],
    speed: 1.04 },
);

// ===============================================================================================
// REQUESTS — three things this shop needs that live in files it does not own. Every one of them is
// worked around above; none of the workarounds is wrong, and all three are smaller in the file
// that owns them than they are here.
//
// 1. js/game.js — a completion hook, which retires the `#doing` shim in the tick above and the
//    identical one in js/mall-digital.js. `stopUse` (js/game.js:11777) is the only place in the
//    engine that knows an action has finished, and a tenant file cannot add a branch to it, so
//    both shops read the state of the action panel's DOM instead and infer completion from how
//    long `.on` stayed up. It works and it is measured, but it is a shop reading the HUD.
//
//      js/mall.js, beside `const MallFitTick = []` at line 48:
//        const MallFitDone = [];
//      js/game.js, in stopUse just after `doing = null; act = null;` (line 11797):
//        if (place === 'mall' && typeof MallFitDone !== 'undefined')
//          for (const fn of MallFitDone) { try { fn(th.hz, def.zh, !!finished); } catch (_) {} }
//
//    With that, `began`/`ended` here become one registered function and the VERBS/SECS tables,
//    the 85% rule and the two DOM reads a frame all go away.
//
// 2. js/game.js — the frame on the face. `window.__game.PLAYER.glasses` is the whole wardrobe this
//    shop can reach, and js/figure.js:2011 hard-codes the frame colour (`C('#2b2b2e')`) with no
//    silhouette parameter at all. So all six frames on this wall preview as the same dark pair:
//    the choice is real, it is priced, it is remembered and it is collected, and it is invisible
//    on your own face. What would fix it is `lk.glassesColor` and `lk.glassesShape` read in the
//    `if (lk.glasses)` block at js/figure.js:2005 — figure.js is not this file's to change.
//
// 3. The lead owns the save. This shop keeps its own record under `bjlife.mall.optical.v1` in
//    localStorage: which four things you have chosen, the prescription the sight test wrote, the
//    open order and when it can be collected, and whether you own a pair. It is written there
//    because the waiting period has to survive the tab closing — an order placed at 16:20 and
//    collectable at 17:20 is not a feature if a reload cancels it — and because a tenant file
//    cannot add a field to the game's own save. It reconciles against `__game.state().day` on the
//    tick and throws itself away if it finds a record from a day later than the one the game is
//    standing in, which is what stops a new life inheriting an order it can never collect. If the
//    save should own this instead, the shape it wants is exactly `MallOptical.state()`.
