// 游戏厅 · 电玩城 · NEON ARCADE — floor 3
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
//   A.put(a,b,dp,w,h,y,colour,opt)   a box: `dp` is its size along a, `w` its size along b
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.th(hz,a,b,zh,en,note,reach,y)  a label to talk to; the player stands 1.15 m out at +a
//   A.light(a,b,y,rgb,power,radius)  one of this shop's own lamps
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What is being built here, and why it is built this way.
//
// An arcade is the one room in a shopping centre that makes its own light, and that is the whole
// design problem. Get it wrong in one direction and you have the inline fit this replaces: twelve
// upright cabinets all turned to face the *back* wall — the lit face of a cabinet is at a larger
// `a` than its body, and they were built at a smaller one — so from the door the shop was four
// rounded slabs of flat colour with no screen, no marquee and no coin slot in the frame at all.
//
// Get it wrong in the other direction, which is what the first draft of this file did, and every
// large surface in the room is emitting: a five-metre magenta panel behind the prize shelves, a
// third of a square metre of cyan across the front of the counter, a 1.9 m² dance pad of solid
// amber. Rendered, that is not an arcade, it is a lightbox — a flat pink wall with some furniture
// silhouetted on it. Bloom is additive and area does not care how pretty the colour was.
//
// So the room is planned around what the eye actually does when you stand in the doorway:
//
//   * a straight aisle down the middle, ~2.9 m clear, with a bank of three cabinets turned
//     side-on to it on either hand. Side-on is deliberate: a row of marquees seen at forty-five
//     degrees receding into the room is the picture everybody has of an arcade, and a cabinet
//     square-on to the camera is a rectangle. Each one wears a vertical light strip down both
//     front corners, so what recedes is a rhythm of upright neon rather than a row of boxes.
//   * the 兑奖处 — the prize counter — closing the end of that aisle, backed by a *dark* wall of
//     shelved plush toys with a lit nosing under each shelf. The toys are the bright thing; the
//     wall behind them is a ground for them to be seen against, at glow .045, and that one number
//     is the difference between a prize wall and a pink billboard.
//   * the two wings behind the cabinet banks holding the big machines — two racing seats in
//     profile, an air-hockey table, a dance machine with a lit floor pad, four claw machines.
//     Both wings are entered from the metre-wide lane along the shopfront, not from the aisle,
//     which is how an arcade of this shape actually circulates.
//   * a black ceiling raft under the shell's own lit ceiling, with neon tubes below it. The
//     shell hangs a bright plane, a warm cove and a grid of downlights over every tenant, which
//     is right for fifteen of them and wrong for this one. The raft covers the middle of it and
//     stops short of the perimeter, so the cove still rings the room and reads as a halo round a
//     dark ceiling rather than as a lid.
//   * a dark lining over both party walls. The shell's partitions are 3.5 m of pale plaster with
//     a lit graphic on them, which is correct for a bakery and is the brightest thing in an
//     arcade by a wide margin. Lining them is a shopfit, not a cheat: this is what a tenant
//     that trades in the dark actually does to a landlord's white box.
//
// Rules the renderer imposes, all learned the hard way and all worth restating:
//
//   Glow is area-dependent, because mode 1 hands the bloom pass `colour * min(1.6, glow*2.6)`
//   and multiplies the surface itself by (1 + glow*3) before the tonemap. On a 6 cm tube glow
//   .24 is neon. On a 70 cm marquee it is a white shape where the colour used to be, and on a
//   5 m panel it is a lightbox. So: thin runs .18–.24, faces you could read a word off .08–.16,
//   anything over about a square metre .02–.05 and it is a *ground*, not a light.
//
//   Contrast is what makes a sign legible, not brightness. 兑奖处 was cream at glow .26 on a
//   violet band at glow .26 and could not be read from three metres. The band is a dark ground
//   now and only the letters are lit.
//
//   `metal` multiplies what it is put on by about 4.4 and `tile`, `fabric`, `plaster` and
//   `concrete` by 2.2–2.8, because the shader does `base *= mix(1, texel/0.22, matAmt)` and
//   almost nothing averages 0.22. In a room of black cabinets that turns the cabinets white.
//   `steel` is the one value-neutral map (×1.03), so every dark machine body in here wears
//   steel and nothing else wears anything — but at a metre-plus repeat, because at the 38 cm
//   it was first given the corrugation reads as ribs and the machines look like garden sheds.
//
//   Nothing emissive wears a material at all. A marquee, a screen and a floor strip are flat
//   colour and bloom, and a texture on them only makes them grubby.
//
//   Batching keys on mesh, mode, corner radius and the material triple — not on colour, gloss,
//   alpha or glow, which travel per instance. So every rounded body in the room shares one
//   radius and one material, every flat unlit plate is `hard`, and every emissive face is one
//   `hard` mode-1 box. Twelve cabinets, four claw machines and a dance machine come out of the
//   instanced path in a handful of calls rather than a few hundred.

// ====================================================================================
// ArcadeSys — the machines, and what happens when you put a coin in one
// ====================================================================================
// The arcade used to be a menu. Six cabinets, and every one of them opened the same three-question
// multiple choice: "the enemy is coming from the left — 左边 / 中间 / 右边". That is a flashcard
// with a marquee over it, and it is the one room in the building where the thing on the screen is
// supposed to be the game.
//
// So this file now carries a small real-time engine. Six cabinets, each with its own loop, its own
// input and its own failure: a basketball machine you have to time, a rhythm machine you have to
// hit, a claw with grip and slip in it, a racer you steer, an upright you aim, and an air-hockey
// table you can play against the machine or against somebody sitting next to you. The Chinese is
// still the point — every prompt, every call and every result is a sentence you read at speed —
// but you lose because you were late, not because you did not know the word.
//
// ---------------------------------------------------------------- why an overlay and not `Pick`
// `Pick` is the right surface for a counter and the wrong one for a cabinet: it is a list, it
// re-renders on confirm, and there is nowhere in it for a frame. So the cabinets get their own
// surface — one dialog, one canvas, one input handler, built once and reused by all six.
//
// The one thing that has to be got right about a second surface is the keyboard. game.js binds its
// own keydown on window and drives the body off a `keys` map; a cabinet that let those through
// would walk the player out of the arcade while they were playing. This captures on window at the
// capture phase and calls stopImmediatePropagation, so while a cabinet is up the game literally
// never sees a key, and every key already held is cleared through `__game.keys` on the way in.
//
// ---------------------------------------------------------------- flashing lights
// This is the room the accessibility rule is about, and it is answered by `MotionSafety`, declared
// in js/mall-cinema.js, which loads immediately before this file. It is one gate for the arcade and
// for the atrium light show, reading the game's own settings object rather than inventing a second
// switch. Everything that blinks in here — the dance pad, the attract screens, the cabinet
// backgrounds, the score flashes — goes through it and is capped at 2.4 Hz whatever the setting,
// and stops entirely when reduced motion is on. The pad was running at 3.2 Hz before this.
window.ArcadeSys = (function () {

  // The gate. Declared in js/mall-cinema.js, which is the file immediately before this one in
  // index.html's load list — but a module that throws because a sibling moved is a bad module, so
  // this degrades to "reduced motion off, nothing capped beyond the ceiling" rather than dying.
  const MS = window.MotionSafety || {
    reduced: () => false, cap: 2.4, rate: h => Math.min(h, 2.4),
    pulse: (t, hz, lo, hi) => lo + (hi - lo) * (.5 + .5 * Math.sin(t * Math.min(hz, 2.4) * Math.PI * 2)),
    step: (t, hz, n) => Math.floor(t * Math.min(hz, 2.4)) % Math.max(1, n),
    sweep: (t, hz) => (t * hz) % 1,
  };

  // ---------------------------------------------------------------- money, cards and coins
  // ¥6 a play in cash, which is what game.js's ARCADE_PRICE already charges, so nothing gets
  // cheaper or dearer by moving here. On a card it is 6 币 — and the card is where the building's
  // other unkept promise lives: 充值一百送二十, top up a hundred and get twenty free, which the
  // loudspeaker has been saying since the adverts were written (js/mall.js, 'ad:arcade').
  const PLAY = 6;
  const CARD_FEE = 10;              // 工本费 — waived on a first top-up of ¥50 or more
  const TOPUPS = [
    { yuan: 20,  bonus: 0  },
    { yuan: 50,  bonus: 5  },
    { yuan: 100, bonus: 20 },       // the one on the loudspeaker
    { yuan: 200, bonus: 50 },
  ];
  // One public offer, resolved from the same row `topUp()` credits.  The fit-out asks for this
  // snapshot when its retained counter card changes state; it never carries a second copy of the
  // amounts or assembles text in a render callback.
  const TOPUP_100 = TOPUPS.find(q => q.yuan === 100);
  const PROMOTION = Object.freeze({
    id:'topup-100', tenant:'星跃游戏厅', yuan:TOPUP_100.yuan, bonus:TOPUP_100.bonus,
    claim:`充${TOPUP_100.yuan}送${TOPUP_100.bonus}`, ready:'可充', applied:'已享', active:true,
  });
  const PROMOTION_STATES = Object.freeze({
    ready:Object.freeze({...PROMOTION, phase:'ready', claims:0,
      signature:`${TOPUP_100.yuan}:${TOPUP_100.bonus}:0`}),
    applied:Object.freeze({...PROMOTION, phase:'applied', claims:1,
      signature:`${TOPUP_100.yuan}:${TOPUP_100.bonus}:1`}),
  });
  function promotion() {
    return state.card.promo100 > 0 ? PROMOTION_STATES.applied : PROMOTION_STATES.ready;
  }

  // ---------------------------------------------------------------- the machines
  // `kind` is what the cabinet asks of you and is what the lobby sorts on: a player who wants to
  // stand still and time something and a player who wants to move are after different machines.
  const CABS = [
    { key:'hoops',  hz:'投篮机', py:'tóulánjī',  en:'basketball cabinet',
      note:'投篮 to shoot a basket + 机 machine', kind:'时间', kindEn:'timing',   cost:PLAY },
    { key:'rhythm', hz:'节拍机', py:'jiépāijī',  en:'music-rhythm cabinet',
      note:'节拍 beat + 机 machine',              kind:'动作', kindEn:'movement', cost:PLAY },
    { key:'claw',   hz:'娃娃机', py:'wáwajī',    en:'claw machine',
      note:'娃娃 doll + 机 machine',              kind:'动作', kindEn:'movement', cost:PLAY },
    { key:'race',   hz:'赛车',   py:'sàichē',    en:'racing cabinet',
      note:'赛 to race + 车 car',                 kind:'动作', kindEn:'movement', cost:PLAY },
    { key:'shoot',  hz:'星球防线', py:'xīngqiú fángxiàn', en:'planet defence, an upright',
      note:'星球 planet + 防线 defence line',     kind:'时间', kindEn:'timing',   cost:PLAY },
    { key:'hockey', hz:'气垫球', py:'qìdiànqiú', en:'air hockey',
      note:'气垫 air cushion + 球 ball',          kind:'对战', kindEn:'versus',   cost:PLAY },
  ];
  // game.js's own ARCADE_GAMES table — the four multiple-choice quizzes these six cabinets replace
  // — keys the upright as `cabinet` and the dance machine as `dance`. Those two words are already
  // baked into this file's `arcadeGame` hotspot tags and into the lead's USE row at game.js:11013,
  // so accepting them here is what makes the wiring a one-line change in `openArcadeGame` rather
  // than a re-tag of the fit-out and a save migration. See the report.
  const ALIAS = { cabinet:'shoot', dance:'rhythm' };
  const cabOf = k => CABS.find(c => c.key === (ALIAS[k] || k)) || null;

  // ---------------------------------------------------------------- what is broken today
  // An arcade always has one machine with a sheet of A4 taped to it. Deterministic on the day, so
  // it survives a reload and so the same machine is out all day rather than flickering in and out
  // every time the room is rebuilt. Never more than two at once, and never the claw and the prize
  // counter on the same day, because that would shut the whole ticket economy for a day.
  function hash(...n) {
    let h = 0x811c9dc5 >>> 0;
    for (const v of n) {
      h = (h ^ ((v | 0) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
      h = (h ^ (((v | 0) >> 16) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  const frac = (...n) => hash(...n) / 4294967296;
  function brokenToday(day) {
    const out = [];
    const n = frac(day, 3) < .34 ? 2 : frac(day, 3) < .82 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const c = CABS[Math.floor(frac(day, 11 + i * 7) * CABS.length) % CABS.length];
      if (c && !out.includes(c.key)) out.push(c.key);
    }
    return out;
  }
  const FAULTS = [
    { hz:'故障', py:'gùzhàng', en:'out of order' },
    { hz:'维修中', py:'wéixiū zhōng', en:'under maintenance' },
    { hz:'暂停使用', py:'zàntíng shǐyòng', en:'temporarily out of use' },
  ];
  const faultOf = (day, key) => FAULTS[hash(day, key.length, key.charCodeAt(0)) % FAULTS.length];

  // ---------------------------------------------------------------- the prizes, and today's stock
  // Nine prizes, five on the shelf on any given day, each with a stock count that goes down as they
  // are taken. Rotating stock is what makes a ticket balance a decision: the 遥控车 being on the
  // shelf today and gone tomorrow is the difference between saving and spending.
  //
  // The first four are game.js's own ARCADE_PRIZES, hz for hz, so a life that already claimed the
  // 娃娃 out of the old flat list still reads as having claimed it.
  const PRIZES = [
    { hz:'球',     py:'qiú',        en:'arcade ball',            tickets: 20 },
    { hz:'拼图',   py:'pīntú',      en:'neon puzzle',            tickets: 45 },
    { hz:'娃娃',   py:'wáwa',       en:'pink rabbit plush',      tickets: 80 },
    { hz:'遥控车', py:'yáokòngchē', en:'remote-control racer',   tickets:130 },
    { hz:'钥匙扣', py:'yàoshi kòu', en:'keyring',                tickets: 12 },
    { hz:'扇子',   py:'shànzi',     en:'paper fan',              tickets: 30 },
    { hz:'水杯',   py:'shuǐbēi',    en:'sports bottle',          tickets: 60 },
    { hz:'耳机',   py:'ěrjī',       en:'headphones',             tickets:150 },
    { hz:'台灯',   py:'táidēng',    en:'desk lamp',              tickets:110 },
  ];
  // Five of the nine, chosen off the day, with a count each. The two dearest are deliberately
  // scarcer: one 耳机 on the shelf is a thing you come back for.
  function stockToday(day) {
    const order = PRIZES.map((p, i) => ({ p, k: frac(day, 101 + i * 13) }))
      .sort((a, b) => a.k - b.k).slice(0, 5).map(o => o.p);
    return order.map(p => ({ ...p,
      stock: p.tickets >= 110 ? 1 : p.tickets >= 60 ? 2 : 4 }));
  }

  // ---------------------------------------------------------------- state that outlives the visit
  function fresh() {
    return {
      card: { has:false, no:'', balance:0, bonus:0, topups:0, promo100:0 },
      tickets: 0,                       // this module's own count; see the report on merging
      best: {},                         // key -> best score ever
      today: { day:0, scores:{}, plays:0, taken:{}, board:'' }, // per-day scores, stock and last board
      prizes: [],                       // hz of everything ever claimed
      challenge: { won:0, lost:0 },
      plays: 0, spend: 0,
    };
  }
  const state = fresh();
  // Roll the per-day part over without touching anything that belongs to the life.
  function sameDay(day) {
    if (state.today.day !== day) state.today = { day, scores:{}, plays:0, taken:{}, board:'' };
    return state.today;
  }

  // ---------------------------------------------------------------- the seam to the game
  // Same shape and same reasoning as CinemaSys's: a host the lead may bind, `window.__game` as the
  // fallback, and safe answers if neither is there.
  let host = null;
  const G = () => window.__game || null;
  const H = {
    money() {
      if (host && host.money) return host.money();
      const g = G(); if (!g) return 0;
      try { return Math.floor(g.state().money) || 0; } catch (e) { return 0; }
    },
    spend(n) {
      if (host && host.spend) return host.spend(n);
      const g = G(); if (!g || !g.setMoney) return;
      g.setMoney(Math.max(0, H.money() - n));
    },
    day() {
      if (host && host.day) return host.day();
      const g = G(); try { return g ? Math.max(1, g.state().day | 0) : 1; } catch (e) { return 1; }
    },
    minutes() {
      if (host && host.minutes) return host.minutes();
      const g = G(); try { return g ? g.state().minutes | 0 : 14 * 60; } catch (e) { return 14 * 60; }
    },
    // The ticket purse. game.js keeps one in `mallProgress.tickets` and publishes a setter for it,
    // so the two are kept in step rather than competing: this module reads and writes the game's
    // count when it can, and falls back to its own only when it cannot.
    tickets() {
      const g = G();
      if (g && g.mallProgress) { try { return g.mallProgress().tickets | 0; } catch (e) {} }
      return state.tickets | 0;
    },
    addTickets(n) {
      const g = G();
      if (g && g.setMallTickets) { try { g.setMallTickets(H.tickets() + n); state.tickets = H.tickets(); return; } catch (e) {} }
      state.tickets = Math.max(0, state.tickets + n);
    },
    Pick() { return (host && host.Pick) || (G() && G().Pick) || null; },
    say(html) {
      if (host && host.toast) return host.toast(html);
      const el = document.getElementById('toast');
      if (!el) return;
      el.innerHTML = html; el.style.opacity = 1;
      clearTimeout(H._t); H._t = setTimeout(() => { el.style.opacity = 0; }, 3600);
    },
    diary(zh, en, tag) {
      if (host && host.logDiary) return host.logDiary(zh, en, tag);
      const g = G(); if (g && g.logDiary) g.logDiary(zh, en, tag);
    },
    sentence(zh) {
      const g = G();
      if (g && g.Vocab && g.Vocab.sentenceHTML) { try { g.Vocab.sentenceHTML(zh); } catch (e) {} }
    },
    save() {
      if (host && host.save) return host.save();
      const g = G(); if (g && g.saveNow) { try { g.saveNow(); } catch (e) {} }
    },
    time(mins) {
      const g = G(); if (g && g.advanceTime) { try { g.advanceTime(mins); } catch (e) {} }
    },
    need(k, n) {
      const g = G(); if (!g || !g.needs) return;
      g.needs[k] = Math.max(0, Math.min(100, g.needs[k] + n));
    },
    // Every key the game is holding, released, so walking into a cabinet does not leave the body
    // running west for the length of a game.
    dropKeys() {
      const g = G(); if (g && g.keys) for (const k in g.keys) g.keys[k] = false;
    },
    cue(k) {
      const g = G();
      if (typeof TrainAudio !== 'undefined' && TrainAudio.mallCue) { try { TrainAudio.mallCue(k); } catch (e) {} }
      else if (g && g.TrainAudio) { /* nothing else to try */ }
    },
  };

  // ---------------------------------------------------------------- paying for a go
  // Card first, cash second, and it says which it took. `free` is for the NPC challenge's second
  // leg and for a machine that ate your money — a real arcade gives you the go back.
  function pay(cab, free) {
    if (free) return { ok:true, how:'free' };
    if (state.card.has && state.card.balance >= cab.cost) {
      state.card.balance -= cab.cost;
      return { ok:true, how:'card', left:state.card.balance };
    }
    if (H.money() >= cab.cost) { H.spend(cab.cost); state.spend += cab.cost; return { ok:true, how:'cash' }; }
    return { ok:false };
  }

  // ====================================================================================
  // the cabinet surface
  // ====================================================================================
  // One dialog, one canvas, one set of handlers, built the first time somebody puts a coin in
  // anything and reused by all six machines afterwards. Nothing here is in index.html: a tenant
  // file that needed markup added to the document before it could work would be a tenant file that
  // could not be dropped in.
  //
  // The canvas is 480 x 300 logical pixels and is drawn at up to 2x for the backing store. It is
  // small on purpose. The WebGL canvas behind it is still rendering the arcade at sixty frames a
  // second while a cabinet is up — a panel over a live room is this game's house style — so the
  // second surface has to cost almost nothing. A few dozen fills at 480 x 300 is well under a
  // millisecond and does not touch the 3D frame at all.
  const W = 480, HGT = 300;
  let ui = null;              // { root, cv, ctx, title, py, en, hud, pad, btns }
  let live = null;            // the running game, or null

  const CSS = `
#arcadeCab{position:absolute;inset:0;display:none;place-items:center;z-index:60;
  pointer-events:auto;
  background:rgba(3,4,7,.72);backdrop-filter:blur(3px);font:13px/1.45 var(--ui,system-ui,sans-serif)}
#arcadeCab.on{display:grid}
#arcadeCab .ac-sheet{width:min(520px,calc(100vw - 24px));background:#0b0e14;color:#e9edf5;
  border:1px solid rgba(255,255,255,.16);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6)}
#arcadeCab .ac-head{display:flex;align-items:baseline;gap:8px;padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.10);background:#11151d}
#arcadeCab .ac-head b{font-size:16px;letter-spacing:.05em;color:#ffd98a}
#arcadeCab .ac-head i{font-style:normal;opacity:.72;font-size:12px}
#arcadeCab .ac-head span{opacity:.55;font-size:11.5px}
#arcadeCab .ac-head button{margin-left:auto;background:none;border:1px solid rgba(255,255,255,.22);
  color:#e9edf5;border-radius:8px;width:26px;height:26px;line-height:1;cursor:pointer;font-size:15px}
#arcadeCab canvas{display:block;width:100%;height:auto;background:#05070c}
#arcadeCab .ac-hud{padding:9px 12px;min-height:44px;border-top:1px solid rgba(255,255,255,.10)}
#arcadeCab .ac-hud b{color:#ffd98a;font-size:15px;letter-spacing:.04em}
#arcadeCab .ac-hud i{font-style:normal;opacity:.72;margin-left:7px;font-size:12px}
#arcadeCab .ac-hud small{display:block;opacity:.62;font-size:11.5px;margin-top:2px}
#arcadeCab .ac-btns{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 12px}
#arcadeCab .ac-btns button{flex:1 1 auto;min-width:56px;padding:9px 6px;border-radius:9px;
  border:1px solid rgba(255,255,255,.20);background:#151b25;color:#e9edf5;cursor:pointer;
  font-size:14px;letter-spacing:.04em}
#arcadeCab .ac-btns button small{display:block;opacity:.55;font-size:10px;letter-spacing:0}
#arcadeCab .ac-btns button:active{background:#243046}
@media (prefers-reduced-motion:reduce){#arcadeCab{backdrop-filter:none}}
`;

  function build() {
    if (ui) return ui;
    const st = document.createElement('style');
    st.id = 'arcadeCabCss'; st.textContent = CSS;
    document.head.appendChild(st);
    const root = document.createElement('div');
    root.id = 'arcadeCab';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '游戏机 arcade cabinet');
    root.innerHTML =
      '<div class="ac-sheet">' +
        '<div class="ac-head"><b></b><i></i><span></span>' +
          '<button type="button" aria-label="关掉 close">×</button></div>' +
        `<canvas width="${W}" height="${HGT}" aria-hidden="true"></canvas>` +
        '<div class="ac-hud" aria-live="polite"></div>' +
        '<div class="ac-btns"></div>' +
      '</div>';
    (document.getElementById('ui') || document.body).appendChild(root);
    ui = { root, cv:root.querySelector('canvas'), ctx:root.querySelector('canvas').getContext('2d'),
           title:root.querySelector('.ac-head b'), py:root.querySelector('.ac-head i'),
           en:root.querySelector('.ac-head span'), hud:root.querySelector('.ac-hud'),
           btns:root.querySelector('.ac-btns') };
    root.querySelector('.ac-head button').addEventListener('click', () => close(true));
    // A click on the dark surround leaves, the same way every other overlay in this game behaves.
    root.addEventListener('pointerdown', e => { if (e.target === root) close(true); });
    return ui;
  }

  // ---- input. Captured, and stopped dead: while a cabinet is up the game never sees a key.
  // A and D are their own logical keys rather than aliases of the arrows, because one cabinet needs
  // to tell two people apart at one keyboard. Everywhere else `alias` folds them straight back into
  // left/right, so on five machines out of six both hands work and nobody has to know.
  const KEYMAP = {
    ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
    a:'left2', d:'right2', A:'left2', D:'right2',
    w:'up', s:'down', W:'up', S:'down',
    ' ':'go', Enter:'go', j:'go', J:'go',
    Escape:'quit', q:'quit', Q:'quit',
  };
  const alias = k => (live && live.opts && live.opts.twoPlayer) ? k
    : k === 'left2' ? 'left' : k === 'right2' ? 'right' : k;
  const held = {};
  function onKey(e) {
    if (!live) return;
    if (e.key === 'Tab') return;                       // leave the browser its focus ring
    const raw = KEYMAP[e.key];
    if (raw === undefined) { e.stopImmediatePropagation(); return; }
    e.preventDefault(); e.stopImmediatePropagation();
    const k = alias(raw);
    if (e.type === 'keyup') { held[k] = false; if (live.game.release) live.game.release(live, k); return; }
    if (e.repeat) { held[k] = true; return; }
    held[k] = true;
    if (k === 'quit') { close(true); return; }
    if (live.game.press) live.game.press(live, k, e.key);
  }
  function bindKeys(on) {
    if (on) {
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('keyup', onKey, true);
    } else {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    }
    for (const k in held) held[k] = false;
  }

  // ---- the buttons under the canvas. Every cabinet is playable with a pointer as well as a
  // keyboard: this is a game about reading Chinese, and locking half of it behind a keyboard the
  // player may not have is not a difficulty setting.
  function setButtons(list) {
    const u = build();
    u.btns.innerHTML = '';
    for (const b of list) {
      const el = document.createElement('button');
      el.type = 'button';
      el.innerHTML = `${b.hz}<small>${b.py || ''}</small>`;
      el.setAttribute('aria-label', `${b.hz} ${b.py || ''} — ${b.en || ''}`);
      const fire = e => { e.preventDefault();
        if (!live) return;
        if (b.k === 'quit') { close(true); return; }
        held[b.k] = true;
        if (live.game.press) live.game.press(live, b.k, b.k);
        // A tap is a press and a release; a hold on a touch screen is handled by pointerup below.
        setTimeout(() => { held[b.k] = false;
          if (live && live.game.release) live.game.release(live, b.k); }, 90);
      };
      el.addEventListener('pointerdown', fire);
      u.btns.appendChild(el);
    }
  }
  function setHud(hz, py, en) {
    const u = build();
    u.hud.innerHTML = `<b>${hz || ''}</b><i>${py || ''}</i><small>${en || ''}</small>`;
  }

  // ---- the loop
  // One rAF, started in `open` and cancelled in `close`, and it is the only one in either of this
  // task's two files — the cinema's foyer crowd rides the shop's existing A.motion callback, which
  // mall.js only calls when the player is on that deck and within 30 m of the unit.
  //
  // The guard on the second line is the leak that guard is for. Every ordinary exit routes through
  // `close()`, which cancels the frame — but a scripted `setPlace` while a cabinet is up does not,
  // and neither does anything else that hides the overlay from the outside. That would leave a 2D
  // canvas redrawing itself over a room it no longer belongs to, once per frame, forever: exactly
  // the kind of thing that shows up as a frame-rate regression nobody can find. `.on` is set in
  // `open` and removed in `close` and nowhere else, so "the overlay is not showing" is a complete
  // test for "this loop should not be running", and `isConnected` is a flag read, not a reflow.
  let raf = 0, last = 0;
  function frame(now) {
    if (!live) return;
    if (!ui || !ui.root.isConnected || !ui.root.classList.contains('on')) { close(true); return; }
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    live.t += dt;
    live.left = Math.max(0, live.left - dt);
    if (!live.over) {
      live.game.step(live, dt);
      if (live.left <= 0 && live.game.timed !== false) finish();
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  function draw() {
    const u = build(), c = u.ctx;
    c.clearRect(0, 0, W, HGT);
    c.fillStyle = '#05070c'; c.fillRect(0, 0, W, HGT);
    live.game.draw(live, c);
    // The clock and the score, in the same place on every cabinet.
    c.font = '600 15px ui-monospace,Menlo,monospace';
    c.fillStyle = '#ffd98a'; c.textAlign = 'left';
    c.fillText(`${live.score}`, 10, 22);
    if (live.game.timed !== false) {
      c.textAlign = 'right'; c.fillStyle = live.left < 6 ? '#ff6a6a' : '#9fb3cc';
      c.fillText(`${Math.ceil(live.left)}s`, W - 10, 22);
    }
  }

  // ---- opening and closing
  function open(cab, game, opts) {
    const u = build();
    live = { cab, game, t:0, left:opts.secs || 45, score:0, over:false,
             opts, log:[], best:state.best[cab.key] || 0, paidHow:opts.how || 'cash' };
    u.title.textContent = cab.hz;
    u.py.textContent = cab.py;
    u.en.textContent = cab.en;
    u.root.classList.add('on');
    u.root.setAttribute('aria-hidden', 'false');
    H.dropKeys();
    bindKeys(true);
    game.init(live);
    setHud(game.hud ? game.hud(live).hz : '', game.hud ? game.hud(live).py : '',
           game.hud ? game.hud(live).en : '');
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  // `quit` is the player walking away; a finished game closes through `finish` instead and pays out.
  function close(quit) {
    if (!live) return;
    const l = live;
    cancelAnimationFrame(raf); raf = 0;
    bindKeys(false);
    live = null;
    if (ui) { ui.root.classList.remove('on'); ui.root.setAttribute('aria-hidden', 'true'); }
    if (quit && !l.over) H.say('走了 · <span class="dim">zǒu le — you walked away mid-game</span>');
  }
  // The end of a go: what it scored, what that is worth in tickets, whether it beat anything.
  function finish() {
    if (!live || live.over) return;
    const l = live; l.over = true;
    const day = H.day(), td = sameDay(day), cab = l.cab;
    const score = Math.max(0, Math.round(l.score));
    // 彩票. Every cabinet pays on the same curve so no machine is the only one worth playing:
    // four for turning up, then one per point, capped so a long lucky run cannot print money.
    const won = Math.min(60, 4 + Math.round(score * (cab.key === 'claw' ? 6 : 1)));
    H.addTickets(won);
    state.plays++; td.plays++;
    // The retained board in the room follows the cabinet just played. Keeping the cabinet key in
    // the daily state makes the physical result deterministic across a rebuild/reload, while the
    // existing machines callback notices `plays` and refreshes the three visible rows once.
    td.board = cab.key;
    const wasBest = score > (state.best[cab.key] || 0);
    if (wasBest) state.best[cab.key] = score;
    if (score > (td.scores[cab.key] || 0)) td.scores[cab.key] = score;
    if (l.opts.challenge) {
      if (l.won) state.challenge.won++; else state.challenge.lost++;
    }
    H.time(6);
    H.need('mood', wasBest ? 15 : 8);
    H.need('rest', -3);
    const line = l.game.result ? l.game.result(l) : { hz:'游戏结束', py:'yóuxì jiéshù', en:'game over' };
    H.say(`${line.hz} · <span class="dim">${line.en} · ${score}分 → +${won}张票` +
          `${wasBest ? ' · 新纪录 new record' : ''} · 共${H.tickets()}张</span>`);
    H.sentence(wasBest ? '我破纪录了！' : '再玩一次吧。');
    H.diary(`在游戏厅玩了${cab.hz}，得了${score}分，赢了${won}张彩票。`,
      `Played ${cab.en} in the arcade: ${score} points, ${won} tickets.`, 'mallarcade');
    H.cue('arcade');
    H.save();
    // The result stays on screen for a moment so it can be read, then the cabinet lets go.
    setHud(`${line.hz}　${score}分`, line.py, `${line.en} · +${won} 彩票 tickets` +
      (wasBest ? ' · 新纪录 a new record' : ` · best ${state.best[cab.key]}`));
    setButtons([{ k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
    live = l;                       // kept alive so the final frame stays drawn
    setTimeout(() => { if (live === l) close(false); }, 2600);
  }

  // ====================================================================================
  // the six machines
  // ====================================================================================
  // Every one of them is the same object: init, step, draw, press, and a `hud` that says in Chinese
  // what to do next. They share `L` (the live game) and nothing else.
  const rnd = () => Math.random();
  const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
  // A background that pulses is a background that flashes, so every one of them asks first.
  const bg = (c, t, a, b) => {
    const k = MS.pulse(t, 1.6, 0, 1);
    c.fillStyle = k > .5 ? b : a; c.fillRect(0, 0, W, HGT);
  };
  const bar = (c, x, y, w, h, k, col) => {
    c.fillStyle = '#131a26'; c.fillRect(x, y, w, h);
    c.fillStyle = col; c.fillRect(x, y, w * clampN(k, 0, 1), h);
  };
  const cjk = (c, s, x, y, size, col, align) => {
    c.font = `600 ${size}px system-ui,"PingFang SC","Hiragino Sans GB",sans-serif`;
    c.fillStyle = col; c.textAlign = align || 'center'; c.fillText(s, x, y);
  };

  const GAMES = {};

  // ---------------------------------------------------------------- 投篮机 · timing
  // A power head sweeps across a meter; the band in the middle is a basket and the gold sliver in
  // the middle of that is a three. Ten balls. The head speeds up every time you sink one, which is
  // what a real 投篮机 does with its clock and is the whole difficulty curve.
  GAMES.hoops = {
    init(L) {
      L.balls = 10; L.head = 0; L.dir = 1; L.speed = .95; L.flight = null; L.msg = null;
      L.hit = 0; L.three = 0;
      setButtons([{ k:'go', hz:'投篮', py:'tóulán', en:'shoot' },
                  { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
    },
    step(L, dt) {
      // Reduced motion slows the sweep rather than stopping it: a timing game with a still needle
      // is not a timing game, and a sweep is not a flash. Slower is the accommodation that keeps
      // the cabinet playable.
      const sp = L.speed * (MS.reduced() ? .68 : 1);
      L.head += L.dir * sp * dt;
      if (L.head > 1) { L.head = 1; L.dir = -1; }
      if (L.head < 0) { L.head = 0; L.dir = 1; }
      if (L.flight) { L.flight.u += dt * 2.2; if (L.flight.u >= 1) L.flight = null; }
      if (L.msg) L.msg.t -= dt;
      if (L.balls <= 0 && !L.flight) finish();
    },
    press(L, k) {
      if (k !== 'go' || L.balls <= 0 || L.flight) return;
      L.balls--;
      const d = Math.abs(L.head - .5);
      const three = d < .045, in2 = d < .13;
      L.flight = { u:0, in:in2 };
      if (three) { L.score += 3; L.three++; L.hit++; L.speed = Math.min(2.3, L.speed + .16);
        L.msg = { t:1.1, hz:'三分！', py:'sān fēn', en:'a three' }; }
      else if (in2) { L.score += 2; L.hit++; L.speed = Math.min(2.3, L.speed + .10);
        L.msg = { t:1.1, hz:'进了！', py:'jìn le', en:'in' }; }
      else L.msg = { t:1.1, hz:'没进', py:'méi jìn', en:'missed' };
      setHud(L.msg.hz, L.msg.py, `${L.msg.en} · 还有 ${L.balls} 个球 — ${L.balls} balls left`);
    },
    draw(L, c) {
      c.fillStyle = '#08101c'; c.fillRect(0, 0, W, HGT);
      // the hoop
      c.strokeStyle = '#3a4a63'; c.lineWidth = 3;
      c.strokeRect(W / 2 - 62, 44, 124, 78);
      c.strokeStyle = '#ff5a3c'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(W / 2, 128, 40, 11, 0, 0, Math.PI * 2); c.stroke();
      // the ball in flight
      if (L.flight) {
        const u = L.flight.u, x = 60 + (W / 2 - 60) * u;
        const y = 250 - Math.sin(u * Math.PI) * (L.flight.in ? 168 : 128) - u * 20;
        c.fillStyle = '#ffb43a'; c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
      }
      // the meter
      const y0 = 214;
      bar(c, 40, y0, W - 80, 22, 1, '#1b2434');
      c.fillStyle = '#2f7d55'; c.fillRect(40 + (W - 80) * .37, y0, (W - 80) * .26, 22);
      c.fillStyle = '#c9a227'; c.fillRect(40 + (W - 80) * .455, y0, (W - 80) * .09, 22);
      const hx = 40 + (W - 80) * L.head;
      c.fillStyle = '#ffffff'; c.fillRect(hx - 2, y0 - 7, 4, 36);
      cjk(c, `${L.hit}/${10 - L.balls} 中`, W / 2, 268, 15, '#9fb3cc');
      if (L.msg && L.msg.t > 0) cjk(c, L.msg.hz, W / 2, 180, 30, '#ffd98a');
    },
    hud: () => ({ hz:'投篮', py:'tóulán', en:'press 投篮 when the head is in the green — gold is a three' }),
    result(L) {
      return L.three >= 3 ? { hz:'手感很好！', py:'shǒugǎn hěn hǎo', en:'a hot hand' }
           : L.hit >= 5 ? { hz:'打得不错', py:'dǎ de búcuò', en:'a decent round' }
           : { hz:'再练练', py:'zài liànlian', en:'more practice needed' };
    },
  };

  // ---------------------------------------------------------------- 节拍机 · movement
  // Four lanes, four words: 左 上 下 右. Notes fall, you press the matching direction as one
  // crosses the line. This is the music-rhythm cabinet, and it is also the most direct piece of
  // Chinese in the arcade — by the end of a round the four directions are muscle rather than
  // vocabulary.
  const LANES = [
    { k:'left',  hz:'左', py:'zuǒ',   en:'left',  col:'#2fd6ff' },
    { k:'up',    hz:'上', py:'shàng', en:'up',    col:'#6cff5a' },
    { k:'down',  hz:'下', py:'xià',   en:'down',  col:'#ff2f7e' },
    { k:'right', hz:'右', py:'yòu',   en:'right', col:'#ffb43a' },
  ];
  GAMES.rhythm = {
    init(L) {
      L.notes = []; L.next = .8; L.combo = 0; L.bestCombo = 0; L.hits = 0; L.miss = 0;
      L.fall = MS.reduced() ? 118 : 172;          // px a second
      L.flash = 0;
      setButtons(LANES.map(n => ({ k:n.k, hz:n.hz, py:n.py, en:n.en }))
        .concat([{ k:'quit', hz:'离开', py:'líkāi', en:'leave' }]));
    },
    step(L, dt) {
      L.next -= dt;
      if (L.next <= 0) {
        L.next = .42 + rnd() * .34 - Math.min(.18, L.t * .004);
        L.notes.push({ lane:Math.floor(rnd() * 4), y:-16 });
      }
      for (const n of L.notes) n.y += L.fall * dt;
      const gone = L.notes.filter(n => n.y > 252);
      if (gone.length) { L.miss += gone.length; L.combo = 0; L.notes = L.notes.filter(n => n.y <= 252); }
      if (L.flash > 0) L.flash -= dt;
    },
    press(L, k) {
      const lane = LANES.findIndex(n => n.k === k);
      if (lane < 0) return;
      // 236 is the strike line; a note is on it within 26 px, which at 172 px/s is a 150 ms window.
      let best = -1, bd = 1e9;
      L.notes.forEach((n, i) => {
        if (n.lane !== lane) return;
        const d = Math.abs(n.y - 236);
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0 || bd > 26) { L.combo = 0; L.miss++; setHud('没打中', 'méi dǎ zhòng', 'missed'); return; }
      L.notes.splice(best, 1);
      L.hits++; L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo);
      L.score += bd < 10 ? 3 : 2;
      L.flash = MS.reduced() ? 0 : .12;
      const n = LANES[lane];
      setHud(bd < 10 ? `${n.hz}　完美` : `${n.hz}　好`, n.py,
        `${n.en} · ${L.combo} 连击 combo`);
    },
    draw(L, c) {
      c.fillStyle = L.flash > 0 ? '#101a2c' : '#070b13'; c.fillRect(0, 0, W, HGT);
      const lw = W / 4;
      LANES.forEach((n, i) => {
        c.fillStyle = i % 2 ? '#0b111c' : '#0d1421'; c.fillRect(i * lw, 34, lw, HGT - 34);
        c.globalAlpha = .5; c.fillStyle = n.col;
        c.fillRect(i * lw + 4, 232, lw - 8, 4); c.globalAlpha = 1;
        cjk(c, n.hz, i * lw + lw / 2, 276, 26, n.col);
      });
      for (const n of L.notes) {
        const x = n.lane * lw + 8;
        c.fillStyle = LANES[n.lane].col;
        c.fillRect(x, n.y, lw - 16, 13);
      }
      cjk(c, L.combo > 1 ? `${L.combo} 连击` : '', W / 2, 120, 30, '#ffd98a');
    },
    hud: () => ({ hz:'跟着节拍', py:'gēnzhe jiépāi',
      en:'press 左 上 下 右 as each block crosses the line' }),
    result(L) {
      return L.bestCombo >= 12 ? { hz:'节奏感真好', py:'jiézòugǎn zhēn hǎo', en:'great rhythm' }
           : L.hits > L.miss ? { hz:'跟上了', py:'gēn shàng le', en:'you kept up' }
           : { hz:'有点跟不上', py:'yǒudiǎn gēn bu shàng', en:'a bit behind the beat' };
    },
  };

  // ---------------------------------------------------------------- 娃娃机 · the claw, physically
  // The old claw was three multiple-choice questions about where a rabbit was. This one has the
  // three things a real crane has and a quiz cannot:
  //
  //   * two axes, aimed one at a time — across with 左/右, then in with 前/后, which is exactly
  //     the two-button rig on the front of one of these machines;
  //   * grip, which comes off how well centred you were on a toy and off a per-machine strength
  //     that is deliberately below one, because the claw is meant to be weak;
  //   * slip, rolled the whole way up. Most losses in a real claw machine happen on the lift, not
  //     on the grab, and this is the part that makes 差一点 the most useful sentence in the room.
  //
  // Three goes for one credit, and the toys shift in the heap when the claw pushes them, so a go
  // that fails is not a go that changed nothing.
  GAMES.claw = {
    timed:false,
    init(L) {
      L.phase = 'x'; L.cx = .5; L.cz = .5; L.dir = 1; L.goes = 3; L.drop = 0; L.got = [];
      L.toys = [];
      for (let i = 0; i < 7; i++) L.toys.push({
        x:.16 + rnd() * .68, z:.18 + rnd() * .64, r:.055 + rnd() * .022,
        w:.8 + rnd() * .5,                                   // weight — heavier slips more
        c:['#ff8fb0','#4fd8c0','#ffd447','#9b8cf0','#ff9040','#62b9f5','#ef5566'][i] });
      L.grip = .52 + rnd() * .18;                            // this machine's claw, today
      L.msg = null;
      setButtons([{ k:'left', hz:'左', py:'zuǒ', en:'left' }, { k:'right', hz:'右', py:'yòu', en:'right' },
                  { k:'go', hz:'下爪', py:'xià zhuǎ', en:'drop the claw' },
                  { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
    },
    step(L, dt) {
      const sp = MS.reduced() ? .30 : .44;
      if (L.phase === 'x' || L.phase === 'z') {
        const v = L.phase === 'x' ? 'cx' : 'cz';
        // Held keys drive it; nobody has to tap forty times across a cabinet.
        if (held.left)  L[v] = clampN(L[v] - sp * dt, .08, .92);
        if (held.right) L[v] = clampN(L[v] + sp * dt, .08, .92);
        if (held.up)    L.cz = clampN(L.cz - sp * dt, .08, .92);
        if (held.down)  L.cz = clampN(L.cz + sp * dt, .08, .92);
      } else if (L.phase === 'drop') {
        L.drop += dt * 1.5;
        if (L.drop >= 1) { L.drop = 1; this.grab(L); }
      } else if (L.phase === 'lift') {
        L.drop -= dt * .85;
        if (L.carry) {
          L.carry.x = L.cx; L.carry.z = L.cz;
          // The lift is where it goes wrong. One roll a second against the grip, and the heavier
          // the toy the worse it is.
          if (rnd() < dt * 1.9 * (1 - L.grip) * L.carry.w) {
            L.toys.push({ ...L.carry, x:clampN(L.cx + (rnd() - .5) * .12, .1, .9) });
            L.carry = null;
            L.msg = { t:1.6, hz:'滑了！', py:'huá le', en:'it slipped' };
            setHud('滑了！', 'huá le', 'it slipped out of the claw on the way up');
          }
        }
        if (L.drop <= 0) { L.drop = 0; this.settle(L); }
      }
      if (L.msg) L.msg.t -= dt;
    },
    grab(L) {
      // The nearest toy, and how centred the claw was on it. Anything past its own radius is a
      // clean miss; inside it, the grab strength falls off from the middle.
      let best = null, bd = 1e9, bi = -1;
      L.toys.forEach((q, i) => {
        const d = Math.hypot(q.x - L.cx, q.z - L.cz);
        if (d < bd) { bd = d; best = q; bi = i; }
      });
      L.phase = 'lift'; L.carry = null;
      if (!best || bd > best.r + .035) {
        L.msg = { t:1.6, hz:'没夹到', py:'méi jiā dào', en:'the claw closed on nothing' };
        setHud('没夹到', 'méi jiā dào', 'closed on nothing — line it up better');
        // It still pushed the heap about, which is the point of a failed go.
        L.toys.forEach(q => {
          const d = Math.hypot(q.x - L.cx, q.z - L.cz);
          if (d < .12) { q.x = clampN(q.x + (q.x - L.cx) * .5, .08, .92);
                         q.z = clampN(q.z + (q.z - L.cz) * .5, .08, .92); }
        });
        return;
      }
      const centred = 1 - clampN(bd / (best.r + .035), 0, 1);
      if (rnd() < L.grip * (.45 + centred * .75)) {
        L.carry = best; L.toys.splice(bi, 1);
        L.msg = { t:1.6, hz:'夹住了！', py:'jiā zhù le', en:'got it' };
        setHud('夹住了！', 'jiā zhù le', 'the claw has it — now it has to hold on');
      } else {
        L.msg = { t:1.6, hz:'差一点', py:'chà yìdiǎn', en:'so close' };
        setHud('差一点', 'chà yìdiǎn', 'the claw touched it and let go');
        best.x = clampN(best.x + (rnd() - .5) * .1, .08, .92);
      }
    },
    settle(L) {
      if (L.carry) { L.got.push(L.carry); L.score += 1; L.carry = null; }
      L.goes--;
      L.phase = L.goes > 0 ? 'x' : 'done';
      L.cx = .5; L.cz = .5;
      if (L.goes > 0) setHud('再来一次', 'zài lái yí cì',
        `${L.goes} goes left — 左/右 to line up, then 下爪`);
      else finish();
    },
    press(L, k) {
      if (k !== 'go') return;
      if (L.phase === 'x') {
        L.phase = 'z';
        setButtons([{ k:'up', hz:'前', py:'qián', en:'forward' }, { k:'down', hz:'后', py:'hòu', en:'back' },
                    { k:'go', hz:'下爪', py:'xià zhuǎ', en:'drop the claw' },
                    { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
        setHud('往前往后', 'wǎng qián wǎng hòu', 'now line it up front to back, then 下爪');
      } else if (L.phase === 'z') {
        L.phase = 'drop'; L.drop = 0;
        setHud('下爪了', 'xià zhuǎ le', 'the claw is going down');
      }
    },
    draw(L, c) {
      c.fillStyle = '#0a0d15'; c.fillRect(0, 0, W, HGT);
      // The case, seen from above and slightly in front — a plan with the claw's shadow on it is
      // the only view of a crane in which aiming makes sense.
      const X = 66, Y = 46, WW = W - 132, HH = 196;
      c.fillStyle = '#111826'; c.fillRect(X, Y, WW, HH);
      c.strokeStyle = '#3a4a63'; c.lineWidth = 2; c.strokeRect(X, Y, WW, HH);
      for (const q of L.toys) {
        c.fillStyle = q.c; c.beginPath();
        c.arc(X + q.x * WW, Y + q.z * HH, q.r * WW, 0, Math.PI * 2); c.fill();
      }
      const px = X + L.cx * WW, pz = Y + L.cz * HH;
      // The rails, so the two aiming phases are legible as two axes.
      c.strokeStyle = L.phase === 'x' ? '#ffd98a' : '#2a3547'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px, Y); c.lineTo(px, Y + HH); c.stroke();
      c.strokeStyle = L.phase === 'z' ? '#ffd98a' : '#2a3547';
      c.beginPath(); c.moveTo(X, pz); c.lineTo(X + WW, pz); c.stroke();
      // The claw itself, opening as it goes down.
      const open = L.phase === 'drop' || L.phase === 'lift' ? 6 + (1 - L.drop) * 10 : 14;
      c.strokeStyle = '#cfd8e6'; c.lineWidth = 3;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(px, pz - 14); c.lineTo(px + s * open, pz + 10); c.stroke();
      }
      if (L.carry) { c.fillStyle = L.carry.c; c.beginPath();
        c.arc(px, pz + 4, L.carry.r * WW, 0, Math.PI * 2); c.fill(); }
      cjk(c, `${L.goes} 次`, W - 12, 268, 15, '#9fb3cc', 'right');
      cjk(c, `抓到 ${L.got.length}`, 12, 268, 15, '#9fb3cc', 'left');
      if (L.msg && L.msg.t > 0) cjk(c, L.msg.hz, W / 2, 168, 30, '#ffd98a');
    },
    hud: () => ({ hz:'先左右，再前后', py:'xiān zuǒyòu, zài qiánhòu',
      en:'line the claw up across, then front to back, then 下爪' }),
    result(L) {
      return L.got.length >= 2 ? { hz:'手气真好！', py:'shǒuqì zhēn hǎo', en:'a lucky day' }
           : L.got.length ? { hz:'抓到一个', py:'zhuā dào yí gè', en:'got one' }
           : { hz:'一个都没抓到', py:'yí gè dōu méi zhuā dào', en:'came away with nothing' };
    },
  };

  // ---------------------------------------------------------------- 赛车 · movement
  // A road that comes at you with barriers in it and 左转 / 右转 across the bottom of the screen.
  // Sixty seconds, distance is the score, and hitting anything costs speed rather than ending the
  // run, because a racing cabinet you can fail off in four seconds is a racing cabinet nobody puts
  // a second coin in.
  GAMES.race = {
    init(L) {
      L.x = .5; L.v = .52; L.walls = []; L.next = .9; L.dist = 0; L.bump = 0;
      setButtons([{ k:'left', hz:'左转', py:'zuǒ zhuǎn', en:'turn left' },
                  { k:'right', hz:'右转', py:'yòu zhuǎn', en:'turn right' },
                  { k:'go', hz:'加速', py:'jiāsù', en:'accelerate' },
                  { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
    },
    step(L, dt) {
      const steer = MS.reduced() ? .58 : .82;
      if (held.left)  L.x = clampN(L.x - steer * dt, .08, .92);
      if (held.right) L.x = clampN(L.x + steer * dt, .08, .92);
      L.v = clampN(L.v + (held.go ? .35 : -.12) * dt, .30, 1);
      const scroll = (MS.reduced() ? .68 : 1) * (150 + L.v * 260);
      L.dist += L.v * dt * 22;
      L.score = Math.round(L.dist);
      L.next -= dt * (.6 + L.v);
      if (L.next <= 0) { L.next = .5 + rnd() * .35;
        L.walls.push({ y:-30, x:.10 + rnd() * .62, w:.16 + rnd() * .12 }); }
      for (const w of L.walls) w.y += scroll * dt;
      L.walls = L.walls.filter(w => {
        if (w.y > 236 && w.y < 268 && L.x > w.x - .04 && L.x < w.x + w.w + .04 && !w.hit) {
          w.hit = true; L.v = .30; L.bump = .5;
          setHud('撞到了', 'zhuàng dào le', 'you clipped the barrier — slow down for the bend');
        }
        return w.y < HGT + 40;
      });
      if (L.bump > 0) L.bump -= dt;
    },
    draw(L, c) {
      c.fillStyle = '#060a12'; c.fillRect(0, 0, W, HGT);
      c.fillStyle = '#111826'; c.fillRect(40, 34, W - 80, HGT - 34);
      // lane marks, scrolling
      c.fillStyle = '#2a3547';
      for (let i = 0; i < 8; i++) {
        const y = ((L.dist * 6 + i * 40) % 300) + 30;
        c.fillRect(W / 2 - 3, y, 6, 20);
      }
      for (const w of L.walls) {
        c.fillStyle = w.hit ? '#5c2a2a' : '#ff4433';
        c.fillRect(40 + w.x * (W - 80), w.y, w.w * (W - 80), 14);
      }
      const cx = 40 + L.x * (W - 80);
      c.fillStyle = L.bump > 0 ? '#ff9a6a' : '#2fd6ff';
      c.fillRect(cx - 13, 240, 26, 34);
      c.fillStyle = '#0a1420'; c.fillRect(cx - 9, 246, 18, 12);
      bar(c, 40, HGT - 14, W - 80, 8, L.v, '#6cff5a');
      cjk(c, `${Math.round(L.v * 180)} km/h`, W - 12, HGT - 20, 13, '#9fb3cc', 'right');
    },
    hud: () => ({ hz:'左转 · 右转 · 加速', py:'zuǒ zhuǎn · yòu zhuǎn · jiāsù',
      en:'steer between the barriers; hold 加速 on the straights' }),
    result(L) {
      return L.score > 400 ? { hz:'开得真快', py:'kāi de zhēn kuài', en:'a quick run' }
           : L.score > 200 ? { hz:'跑完了', py:'pǎo wán le', en:'you finished the run' }
           : { hz:'慢了一点', py:'màn le yìdiǎn', en:'a slow lap' };
    },
  };

  // ---------------------------------------------------------------- 星球防线 · timing
  // The upright. Three lanes, a ship in each, and a crosshair band across the middle: press the
  // lane's own word while something is inside the band. The words are 左边 / 中间 / 右边, which is
  // the one vocabulary set the old quiz had right — the difference is that here you have 400 ms.
  const SHOOT_LANES = [
    { k:'left',  hz:'左边', py:'zuǒbian',  en:'left' },
    { k:'up',    hz:'中间', py:'zhōngjiān', en:'middle' },
    { k:'right', hz:'右边', py:'yòubian',  en:'right' },
  ];
  GAMES.shoot = {
    init(L) {
      L.ships = []; L.next = .7; L.shield = 3; L.zap = 0; L.hits = 0;
      setButtons(SHOOT_LANES.map(n => ({ k:n.k, hz:n.hz, py:n.py, en:n.en }))
        .concat([{ k:'quit', hz:'离开', py:'líkāi', en:'leave' }]));
    },
    step(L, dt) {
      L.next -= dt;
      if (L.next <= 0) { L.next = .46 + rnd() * .40 - Math.min(.2, L.t * .005);
        L.ships.push({ lane:Math.floor(rnd() * 3), y:-14, v:64 + rnd() * 46 + L.t * 1.6 }); }
      for (const s of L.ships) s.y += s.v * (MS.reduced() ? .72 : 1) * dt;
      const past = L.ships.filter(s => s.y > 262);
      if (past.length) {
        L.shield -= past.length; L.ships = L.ships.filter(s => s.y <= 262);
        setHud('护盾！', 'hùdùn', `shield down — ${Math.max(0, L.shield)} left`);
        if (L.shield <= 0) finish();
      }
      if (L.zap > 0) L.zap -= dt;
    },
    press(L, k) {
      const lane = SHOOT_LANES.findIndex(n => n.k === k);
      if (lane < 0) return;
      // The crosshair band is 176–224; anything of yours inside it dies.
      const i = L.ships.findIndex(s => s.lane === lane && s.y > 168 && s.y < 232);
      if (i < 0) { setHud('打空了', 'dǎ kōng le', 'nothing in the sights on that side'); return; }
      L.ships.splice(i, 1); L.score += 2; L.hits++;
      L.zap = MS.reduced() ? 0 : .1;
      const n = SHOOT_LANES[lane];
      setHud(`打中了 · ${n.hz}`, n.py, `${n.en} — ${L.hits} down, shield ${L.shield}`);
    },
    draw(L, c) {
      c.fillStyle = L.zap > 0 ? '#13202f' : '#060a12'; c.fillRect(0, 0, W, HGT);
      const lw = W / 3;
      for (let i = 0; i < 3; i++) {
        c.fillStyle = i === 1 ? '#0c1420' : '#0a101a'; c.fillRect(i * lw, 34, lw, HGT - 34);
        cjk(c, SHOOT_LANES[i].hz, i * lw + lw / 2, 282, 20, '#5f7690');
      }
      c.fillStyle = 'rgba(108,255,90,.10)'; c.fillRect(0, 168, W, 64);
      c.strokeStyle = 'rgba(108,255,90,.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, 168); c.lineTo(W, 168); c.moveTo(0, 232); c.lineTo(W, 232); c.stroke();
      for (const s of L.ships) {
        c.fillStyle = '#ff5fd0';
        const x = s.lane * lw + lw / 2;
        c.beginPath(); c.moveTo(x, s.y + 13); c.lineTo(x - 11, s.y - 8); c.lineTo(x + 11, s.y - 8);
        c.closePath(); c.fill();
      }
      for (let i = 0; i < 3; i++) {
        c.fillStyle = i < L.shield ? '#2fd6ff' : '#26303e';
        c.fillRect(W / 2 - 30 + i * 21, HGT - 14, 16, 7);
      }
    },
    hud: () => ({ hz:'左边 · 中间 · 右边', py:'zuǒbian · zhōngjiān · yòubian',
      en:'call the side a ship is on while it is inside the sights' }),
    result(L) {
      return L.hits >= 18 ? { hz:'防线守住了', py:'fángxiàn shǒu zhù le', en:'the line held' }
           : L.hits >= 9 ? { hz:'打得还行', py:'dǎ de hái xíng', en:'not bad' }
           : { hz:'防线破了', py:'fángxiàn pò le', en:'the line broke' };
    },
  };

  // ---------------------------------------------------------------- 气垫球 · versus
  // The two-player and NPC machine. In 单人 the far paddle is driven by the house at a difficulty
  // that comes off which regular is standing at the other end; in 双人 the far paddle is the arrow
  // keys and the near one is A and D, so two people can play it on one keyboard, which is the only
  // honest way a game like this does local two-player.
  //
  // First to five. `opts.foe` is the challenger; `L.won` is what the challenge ledger reads.
  GAMES.hockey = {
    timed:false,
    init(L) {
      L.me = .5; L.you = .5; L.px = .5; L.pz = .45;
      L.vx = (rnd() - .5) * .5; L.vz = .62;
      L.mine = 0; L.theirs = 0;
      L.two = !!L.opts.twoPlayer;
      L.skill = L.opts.foe ? L.opts.foe.skill : .62;
      setButtons(L.two
        ? [{ k:'left2', hz:'左 (A)', py:'wánjiā yī', en:'player one, left' },
           { k:'right2', hz:'右 (D)', py:'wánjiā yī', en:'player one, right' },
           { k:'left', hz:'左 (←)', py:'wánjiā èr', en:'player two, left' },
           { k:'right', hz:'右 (→)', py:'wánjiā èr', en:'player two, right' },
           { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]
        : [{ k:'left', hz:'左', py:'zuǒ', en:'left' }, { k:'right', hz:'右', py:'yòu', en:'right' },
           { k:'quit', hz:'离开', py:'líkāi', en:'leave' }]);
    },
    step(L, dt) {
      const sp = MS.reduced() ? .74 : 1.05;
      if (held.left)  L.me = clampN(L.me - sp * dt, .10, .90);
      if (held.right) L.me = clampN(L.me + sp * dt, .10, .90);
      if (L.two) {
        // Player one has A and D — their own logical keys, so a hand on each set of controls
        // never cancels the other one out.
        if (held.left2)  L.you = clampN(L.you - sp * dt, .10, .90);
        if (held.right2) L.you = clampN(L.you + sp * dt, .10, .90);
      } else {
        // The house. It tracks the puck with a lag and a deadband, which is what makes a beatable
        // opponent rather than a wall: the better the regular, the smaller both are.
        const want = L.px + (rnd() - .5) * (1 - L.skill) * .3;
        const d = want - L.you;
        if (Math.abs(d) > (1 - L.skill) * .12) L.you = clampN(L.you + Math.sign(d) * sp * L.skill * dt, .10, .90);
      }
      L.px += L.vx * dt; L.pz += L.vz * dt;
      if (L.px < .04) { L.px = .04; L.vx = Math.abs(L.vx); }
      if (L.px > .96) { L.px = .96; L.vx = -Math.abs(L.vx); }
      // near end (yours) at z 1, far end (theirs) at z 0
      if (L.pz > .93 && L.vz > 0) {
        if (Math.abs(L.px - L.me) < .13) { L.vz = -Math.abs(L.vz) * 1.045;
          L.vx += (L.px - L.me) * 1.5; L.pz = .93; }
        else if (L.pz > 1) { L.theirs++; this.serve(L, -1); }
      }
      if (L.pz < .07 && L.vz < 0) {
        if (Math.abs(L.px - L.you) < .13) { L.vz = Math.abs(L.vz) * 1.045;
          L.vx += (L.px - L.you) * 1.5; L.pz = .07; }
        else if (L.pz < 0) { L.mine++; L.score += 1; this.serve(L, 1); }
      }
      L.vx = clampN(L.vx, -1.3, 1.3); L.vz = clampN(L.vz, -1.6, 1.6);
      if (L.mine >= 5 || L.theirs >= 5) {
        L.won = L.mine >= 5;
        L.score = L.mine * 4 + (L.won ? 8 : 0);
        finish();
      }
    },
    serve(L, dir) {
      L.px = .5; L.pz = .5; L.vx = (rnd() - .5) * .5; L.vz = .58 * dir;
      setHud(L.mine > L.theirs ? '你领先' : L.mine < L.theirs ? '你落后' : '平了',
        L.mine > L.theirs ? 'nǐ lǐngxiān' : L.mine < L.theirs ? 'nǐ luòhòu' : 'píng le',
        `${L.mine} : ${L.theirs} — first to five`);
    },
    press(L, k, raw) {
      // The physical A/D keys are player one on the two-player table. KEYMAP folds them into
      // left/right for every other cabinet, so the raw key is what distinguishes them here.
      if (!L.two) return;
      if (raw === 'a' || raw === 'A') { held.a2 = true; held.left = false; }
      if (raw === 'd' || raw === 'D') { held.d2 = true; held.right = false; }
    },
    release(L, k) { if (k === 'left') held.a2 = false; if (k === 'right') held.d2 = false; },
    draw(L, c) {
      c.fillStyle = '#070c14'; c.fillRect(0, 0, W, HGT);
      const X = 96, Y = 34, WW = W - 192, HH = HGT - 44;
      c.fillStyle = '#dfe9f2'; c.globalAlpha = .10; c.fillRect(X, Y, WW, HH); c.globalAlpha = 1;
      c.strokeStyle = '#3a4a63'; c.lineWidth = 2; c.strokeRect(X, Y, WW, HH);
      c.strokeStyle = '#2fd6ff'; c.beginPath();
      c.moveTo(X, Y + HH / 2); c.lineTo(X + WW, Y + HH / 2); c.stroke();
      c.fillStyle = '#ff4433'; c.fillRect(X + L.you * WW - 26, Y + 4, 52, 9);
      c.fillStyle = '#3f6bff'; c.fillRect(X + L.me * WW - 26, Y + HH - 13, 52, 9);
      c.fillStyle = '#ffb43a'; c.beginPath();
      c.arc(X + L.px * WW, Y + L.pz * HH, 8, 0, Math.PI * 2); c.fill();
      cjk(c, `${L.theirs}`, 44, Y + 40, 26, '#ff8f80', 'center');
      cjk(c, `${L.mine}`, 44, Y + HH - 14, 26, '#9fc4ff', 'center');
      cjk(c, L.two ? '双人' : (L.opts.foe ? L.opts.foe.hz : '电脑'), W - 46, Y + 24, 16, '#9fb3cc');
    },
    hud: L => ({ hz: L.two ? '双人对战' : '挑战', py: L.two ? 'shuāngrén duìzhàn' : 'tiǎozhàn',
      en: L.two ? 'player one uses A and D, player two the arrows — first to five'
                : 'first to five; the arrows move your mallet' }),
    result(L) {
      return L.won ? { hz:'我赢了！', py:'wǒ yíng le', en:'you won' }
                   : { hz:'你输了', py:'nǐ shū le', en:'you lost' };
    },
  };

  // ---------------------------------------------------------------- who you can play against
  // Arcade regulars. Invented names, no real people and no real brands, and each one is a
  // difficulty: 小唐 is the kid who is always here and 快手王 is the man nobody beats.
  const FOES = [
    { hz:'小唐',   py:'Xiǎo Táng',  en:'a schoolkid who is always here', skill:.42, stake: 6 },
    { hz:'阿力',   py:'Ā Lì',       en:'a regular from the food court',  skill:.58, stake:10 },
    { hz:'米粒',   py:'Mǐlì',       en:'a quiet girl with a full card',  skill:.70, stake:14 },
    { hz:'快手王', py:'Kuàishǒu Wáng', en:'the man nobody beats',        skill:.84, stake:20 },
  ];

  // ====================================================================================
  // the counters
  // ====================================================================================
  function playCab(key, opts) {
    opts = opts || {};
    const cab = cabOf(key), day = H.day();
    if (!cab) return;
    // Everything past this point uses `cab.key`, never the caller's `key`: an alias arriving from
    // game.js must land on the same broken-today roll, the same best score and the same board as
    // the canonical name, or a machine would be out of order under one word and working under the
    // other.
    const game = GAMES[cab.key];
    if (!game) { H.say('这台机器还没装好 · <span class="dim">that cabinet is not fitted yet</span>'); return; }
    if (brokenToday(day).includes(cab.key)) {
      const f = faultOf(day, cab.key);
      H.say(`${f.hz} · <span class="dim">${f.py} — ${cab.en} is ${f.en} today. 高师傅 is on it</span>`);
      return;
    }
    const p = pay(cab, opts.free);
    if (!p.ok) {
      H.say(`钱不够 · <span class="dim">a go is ¥${cab.cost}, or ${cab.cost} 币 off a 游戏卡</span>`);
      return;
    }
    if (p.how === 'card')
      H.say(`刷卡 · <span class="dim">shuākǎ — ${cab.cost} off the card, ${p.left} 币 left</span>`);
    sameDay(day);
    const P = H.Pick();
    if (P && P.isOpen) P.close();
    open(cab, game, { secs: opts.secs || (cab.key === 'race' ? 60 : cab.key === 'hockey' ? 999 : 45),
                      how:p.how, foe:opts.foe, twoPlayer:opts.twoPlayer, challenge:opts.challenge });
  }

  // ---------------------------------------------------------------- 游戏厅 · the lobby
  function openLobby() {
    const P = H.Pick(); if (!P) return;
    const day = H.day(), broken = brokenToday(day), td = sameDay(day);
    const rows = [{ sec:'机器 · jīqì', en:'the machines — ¥6 a go, or 6 币 off a card' }];
    for (const c of CABS) {
      const out = broken.includes(c.key);
      const f = out ? faultOf(day, c.key) : null;
      const best = state.best[c.key] || 0;
      rows.push({ cab:c.key, hz:c.hz, py:c.py, off:out,
        en: out ? `${f.hz} ${f.py} — ${f.en}`
                : `${c.en} · ${c.kind} ${c.kindEn}${best ? ` · 最高 ${best}` : ''}`,
        right: out ? f.hz : `¥${c.cost}` });
    }
    rows.push({ sec:'柜台 · guìtái', en:'the change desk — 苏晓萌' });
    rows.push({ card:true, hz:'游戏卡', py:'yóuxì kǎ',
      en: state.card.has ? `${state.card.balance} 币 on the card` : '充值一百送二十 — top up and play from a card',
      right: state.card.has ? `${state.card.balance}币` : '办卡' });
    rows.push({ board:true, hz:'排行榜', py:'páiháng bǎng', en:'today’s scores and the all-time best',
      right:'看看' });
    rows.push({ foe:true, hz:'挑战', py:'tiǎozhàn', en:'play somebody — air hockey, first to five',
      right: `${state.challenge.won}胜` });
    rows.push({ prize:true, hz:'兑奖处', py:'duìjiǎng chù', en:'trade tickets for a prize',
      right: `${H.tickets()}票` });
    P.show({
      title:'霓虹游戏厅 · 电玩城',
      sub:`¥${H.money()} 在身上 · ${H.tickets()} 张彩票 · ${td.plays} plays today`,
      rows,
      onPick(r) {
        if (r.cab) { playCab(r.cab); return false; }
        if (r.card) { openCard(); return false; }
        if (r.board) { openBoard(); return false; }
        if (r.foe) { openChallenge(); return false; }
        if (r.prize) { openPrizes(); return false; }
        return false;
      },
    });
  }

  // ---------------------------------------------------------------- 充值机 · the card
  // The one the loudspeaker has been promising. 充值一百送二十 is the third row and it is the only
  // one where the bonus is worth having, which is exactly how these are priced in life.
  function openCard() {
    const P = H.Pick(); if (!P) return;
    const rows = [];
    if (!state.card.has) {
      rows.push({ sec:'办卡 · bàn kǎ', en:`a card is ¥${CARD_FEE}, and free with a top-up of ¥50 or more` });
      rows.push({ make:true, hz:'办一张卡', py:'bàn yì zhāng kǎ', en:`take out a card — ¥${CARD_FEE}`,
        right:`¥${CARD_FEE}`, off:H.money() < CARD_FEE });
    } else {
      rows.push({ sec:'我的卡 · wǒ de kǎ', en:`card ${state.card.no}` });
      rows.push({ off:true, hz:'余额', py:'yú’é', en:'balance — a go costs 6 币',
        right:`${state.card.balance}币` });
      if (state.card.bonus) rows.push({ off:true, hz:'赠送', py:'zèngsòng',
        en:'free credit you have been given so far', right:`${state.card.bonus}币` });
    }
    rows.push({ sec:'充值 · chōngzhí', en:'top up — 充值一百送二十' });
    for (const t of TOPUPS) rows.push({ top:t.yuan, hz:`充值 ${t.yuan}`, py:`chōngzhí ${t.yuan}`,
      en: t.bonus ? `¥${t.yuan} buys ${t.yuan + t.bonus} 币 — ${t.bonus} of them free`
                  : `¥${t.yuan} buys ${t.yuan} 币`,
      right: t.bonus ? `送${t.bonus}` : `${t.yuan}币`, off:H.money() < t.yuan });
    P.show({
      title:'换币台 · 游戏卡',
      sub:`苏晓萌 · ¥${H.money()} 在身上 · ${state.card.has ? `${state.card.balance} 币在卡上` : '还没有卡'}`,
      rows,
      onPick(r) {
        if (r.make) return makeCard(0);
        if (r.top) return topUp(r.top);
        return false;
      },
    });
  }
  function makeCard(waiveWith) {
    if (state.card.has) return false;
    if (!waiveWith) {
      if (H.money() < CARD_FEE) { H.say(`钱不够 · <span class="dim">the card is ¥${CARD_FEE}</span>`); return false; }
      H.spend(CARD_FEE); state.spend += CARD_FEE;
    }
    state.card.has = true;
    // A card number that is stable for this life and looks like one.
    state.card.no = 'NX' + String(1000 + (hash(H.day(), 7, state.plays) % 9000));
    H.say(`办好了 · <span class="dim">游戏卡 ${state.card.no} — top it up and the machines take it</span>`);
    H.sentence('我办了一张游戏卡。');
    H.save();
    return false;
  }
  function topUp(yuan) {
    const t = TOPUPS.find(q => q.yuan === yuan); if (!t) return false;
    if (H.money() < yuan) { H.say(`钱不够 · <span class="dim">¥${yuan} needed</span>`); return false; }
    // A top-up of fifty or more brings the card with it, which is what the desk actually does
    // rather than charging somebody ten yuan for a piece of plastic they are about to load.
    if (!state.card.has) makeCard(yuan >= 50 ? yuan : 0);
    if (!state.card.has) return false;
    H.spend(yuan); state.spend += yuan;
    state.card.balance += yuan + t.bonus;
    state.card.bonus += t.bonus;
    state.card.topups++;
    if (yuan === 100) state.card.promo100++;
    H.say(t.bonus
      ? `充值 ${yuan} 送 ${t.bonus} · <span class="dim">${yuan + t.bonus} 币 on the card, ${state.card.balance} in total</span>`
      : `充值 ${yuan} · <span class="dim">${state.card.balance} 币 on the card</span>`);
    H.sentence(`我充了${yuan}块。`);
    H.diary(`在游戏厅充值${yuan}块${t.bonus ? `，送了${t.bonus}币` : ''}。`,
      `Topped the arcade card up by ¥${yuan}${t.bonus ? ` — ${t.bonus} free` : ''}.`, 'arcadecard');
    H.save();
    return false;
  }

  // ---------------------------------------------------------------- 排行榜 · the boards
  // A daily board and an all-time one. The daily board is the house's regulars with scores seeded
  // off the day, and your own score for today dropped into it in the right place — which is the
  // only leaderboard mechanic worth having, because it changes overnight whatever you did.
  function dailyRows(key, day) {
    const cab = cabOf(key);
    const rows = FOES.map((f, i) => ({
      hz:f.hz, py:f.py, en:f.en,
      score: Math.round(20 + f.skill * 46 + frac(day, key.length * 13 + i) * 26),
    }));
    const mine = (sameDay(day).scores[key] || 0);
    if (mine) rows.push({ hz:'我', py:'wǒ', en:'you, today', score:mine, me:true });
    rows.sort((a, b) => b.score - a.score);
    return { cab, rows:rows.slice(0, 6) };
  }
  // The physical board always has a useful, deterministic subject before the first game of the
  // day, then follows the most recently played cabinet. It deliberately returns only three rows:
  // those are the three plates that physically exist on the prize-wall fascia.
  function physicalBoard(day) {
    const td = sameDay(day);
    const fallback = CABS[hash(day, 211) % CABS.length];
    const cab = cabOf(td.board) || fallback;
    const d = dailyRows(cab.key, day);
    return { cab:d.cab, rows:d.rows.slice(0, 3) };
  }
  function openBoard(key) {
    const P = H.Pick(); if (!P) return;
    const day = H.day();
    if (!key) {
      const rows = [{ sec:'排行榜 · páiháng bǎng', en:'pick a machine to see its board' }];
      for (const c of CABS) rows.push({ cab:c.key, hz:c.hz, py:c.py,
        en:`${c.en} · 今日 ${sameDay(day).scores[c.key] || 0} · 最高 ${state.best[c.key] || 0}`,
        right:`${state.best[c.key] || 0}` });
      P.show({ title:'排行榜 · 今日成绩', sub:'páiháng bǎng — today’s scores and your all-time best',
        rows, onPick(r) { if (r.cab) openBoard(r.cab); return false; } });
      return;
    }
    const d = dailyRows(key, day);
    const rows = d.rows.map((r, i) => ({ off:true,
      hz:`${i + 1}.　${r.hz}`, py:r.py, en:r.en, right:`${r.score}` }));
    rows.unshift({ sec:`${d.cab.hz} · 今日榜`, en:`${d.cab.en} — today only; it resets overnight` });
    rows.push({ sec:'历史最高 · lìshǐ zuìgāo', en:'your all-time best on this machine' });
    rows.push({ off:true, hz:'我的最高分', py:'wǒ de zuìgāo fēn', en:'your record',
      right:`${state.best[key] || 0}` });
    P.show({ title:`排行榜 · ${d.cab.hz}`, sub:`${d.cab.py} · ${d.cab.en}`, rows,
      onPick:()=>false });
  }

  // ---------------------------------------------------------------- 挑战 · playing somebody
  function openChallenge() {
    const P = H.Pick(); if (!P) return;
    const day = H.day();
    if (brokenToday(day).includes('hockey')) {
      const f = faultOf(day, 'hockey');
      H.say(`${f.hz} · <span class="dim">the air-hockey table is ${f.en} today</span>`); return;
    }
    const rows = [{ sec:'挑战 · tiǎozhàn', en:'air hockey, first to five — the stake is in tickets' }];
    for (const f of FOES) rows.push({ foe:f.hz, hz:f.hz, py:f.py, en:`${f.en} · 押 ${f.stake} 张彩票`,
      right:`${f.stake}票`, off:H.tickets() < f.stake });
    rows.push({ sec:'双人 · shuāngrén', en:'two of you, one keyboard' });
    rows.push({ two:true, hz:'双人对战', py:'shuāngrén duìzhàn',
      en:'player one uses A and D, player two the arrows', right:`¥${PLAY}` });
    P.show({
      title:'气垫球 · 挑战', sub:`${H.tickets()} 张彩票 · ${state.challenge.won} 胜 ${state.challenge.lost} 负`,
      rows,
      onPick(r) {
        if (r.two) { playCab('hockey', { twoPlayer:true }); return false; }
        const f = FOES.find(q => q.hz === r.foe); if (!f) return false;
        if (H.tickets() < f.stake) {
          H.say(`彩票不够 · <span class="dim">${f.stake} tickets to play ${f.hz}</span>`); return false;
        }
        H.addTickets(-f.stake);
        playCab('hockey', { foe:f, challenge:true });
        return false;
      },
    });
  }

  // ---------------------------------------------------------------- 兑奖处 · the prize counter
  function openPrizes() {
    const P = H.Pick(); if (!P) return;
    const day = H.day(), td = sameDay(day), stock = stockToday(day);
    const rows = [{ sec:'今日有货 · jīnrì yǒu huò', en:'on the shelf today — the stock rotates' }];
    for (const p of stock) {
      const left = Math.max(0, p.stock - (td.taken[p.hz] || 0));
      rows.push({ prize:p.hz, hz:p.hz, py:p.py,
        en: left ? `${p.en} · 还有 ${left} 个 left` : `${p.en} · today’s stock has gone`,
        right:`${p.tickets}票`, off: !left || H.tickets() < p.tickets });
    }
    const off = PRIZES.filter(p => !stock.some(q => q.hz === p.hz));
    if (off.length) {
      rows.push({ sec:'今天没有 · jīntiān méiyǒu', en:'not on the shelf today — come back' });
      for (const p of off) rows.push({ off:true, hz:p.hz, py:p.py, en:p.en, right:`${p.tickets}票` });
    }
    P.show({
      title:'兑奖处 · 换礼物',
      sub:`${H.tickets()} 张彩票 · duìjiǎng chù — the shelf changes every day`,
      rows,
      onPick(r) {
        if (!r.prize) return false;
        const p = stock.find(q => q.hz === r.prize); if (!p) return false;
        const left = Math.max(0, p.stock - (td.taken[p.hz] || 0));
        if (!left) { H.say('今天换完了 · <span class="dim">that one has gone for today</span>'); return false; }
        if (H.tickets() < p.tickets) {
          H.say(`彩票不够 · <span class="dim">${p.tickets} needed; you have ${H.tickets()}</span>`); return false;
        }
        H.addTickets(-p.tickets);
        td.taken[p.hz] = (td.taken[p.hz] || 0) + 1;
        state.prizes.push(p.hz);
        H.need('mood', 10);
        H.say(`换到了${p.hz} · <span class="dim">${p.py} · ${p.tickets} tickets · ${H.tickets()} left</span>`);
        H.sentence(`我用彩票换了${p.hz}。`);
        H.diary(`在游戏厅用${p.tickets}张彩票换了${p.hz}。`,
          `Traded ${p.tickets} arcade tickets for the ${p.en}.`, 'mallprize');
        H.save();
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- the save
  function toSave() {
    return {
      card:{ has:!!state.card.has, no:String(state.card.no || '').slice(0, 12),
             balance:state.card.balance | 0, bonus:state.card.bonus | 0,
             topups:state.card.topups | 0, promo100:state.card.promo100 | 0 },
      tickets:state.tickets | 0,
      best:Object.fromEntries(CABS.map(c => [c.key, state.best[c.key] | 0]).filter(e => e[1])),
      today:{ day:state.today.day | 0, plays:state.today.plays | 0,
              scores:{ ...state.today.scores }, taken:{ ...state.today.taken },
              board:cabOf(state.today.board) ? cabOf(state.today.board).key : '' },
      prizes:state.prizes.slice(-24),
      challenge:{ won:state.challenge.won | 0, lost:state.challenge.lost | 0 },
      plays:state.plays | 0, spend:state.spend | 0,
    };
  }
  function load(o) {
    Object.assign(state, fresh());
    if (!o || typeof o !== 'object') return;
    const c = o.card;
    if (c && typeof c === 'object') {
      state.card.has = !!c.has;
      state.card.no = typeof c.no === 'string' ? c.no.slice(0, 12) : '';
      state.card.balance = state.card.has ? Math.max(0, Math.min(99999, Math.floor(Number(c.balance) || 0))) : 0;
      state.card.bonus = Math.max(0, Math.floor(Number(c.bonus) || 0));
      state.card.topups = Math.max(0, Math.floor(Number(c.topups) || 0));
      state.card.promo100 = Math.max(0, Math.floor(Number(c.promo100) || 0));
    }
    state.tickets = Math.max(0, Math.floor(Number(o.tickets) || 0));
    if (o.best && typeof o.best === 'object') for (const cab of CABS) {
      const v = Math.floor(Number(o.best[cab.key]) || 0);
      if (v > 0) state.best[cab.key] = Math.min(99999, v);
    }
    if (o.today && typeof o.today === 'object') {
      const boardCab = cabOf(o.today.board);
      state.today = { day:Math.max(0, Math.floor(Number(o.today.day) || 0)),
        plays:Math.max(0, Math.floor(Number(o.today.plays) || 0)), scores:{}, taken:{},
        board:boardCab ? boardCab.key : '' };
      for (const cab of CABS) {
        const v = Math.floor(Number(o.today.scores && o.today.scores[cab.key]) || 0);
        if (v > 0) state.today.scores[cab.key] = Math.min(99999, v);
      }
      for (const p of PRIZES) {
        const v = Math.floor(Number(o.today.taken && o.today.taken[p.hz]) || 0);
        if (v > 0) state.today.taken[p.hz] = Math.min(9, v);
      }
    }
    state.prizes = Array.isArray(o.prizes)
      ? o.prizes.filter(hz => PRIZES.some(p => p.hz === hz)).slice(-24) : [];
    if (o.challenge && typeof o.challenge === 'object') {
      state.challenge.won = Math.max(0, Math.floor(Number(o.challenge.won) || 0));
      state.challenge.lost = Math.max(0, Math.floor(Number(o.challenge.lost) || 0));
    }
    state.plays = Math.max(0, Math.floor(Number(o.plays) || 0));
    state.spend = Math.max(0, Math.floor(Number(o.spend) || 0));
  }

  return {
    // data
    CABS, PRIZES, TOPUPS, FOES, GAMES, PLAY, CARD_FEE,
    cabOf, brokenToday, faultOf, stockToday, dailyRows, physicalBoard, promotion, hash, frac,
    // The already-resolved motion gate, so the fit-out below drives the room's lights through the
    // same object the cabinets do rather than re-deriving the fallback. `MallFit['游戏厅']` is a
    // separate closure and cannot see `MS` by name.
    MS,
    // panels
    openLobby, openCard, openBoard, openChallenge, openPrizes, playCab, topUp, makeCard,
    // the cabinet surface, for a harness that wants to drive one without a mouse
    close, finish, isPlaying: () => !!live && !live.over,
    live: () => live && { cab:live.cab.key, t:+live.t.toFixed(2), left:+live.left.toFixed(2),
                          score:live.score, over:!!live.over },
    key(k) { if (!live) return false; held[k] = true;
             if (live.game.press) live.game.press(live, k, k);
             setTimeout(() => { held[k] = false; }, 60); return true; },
    hold(k, on) { if (!live) return false; held[k] = !!on; return true; },
    tick(dt) { if (!live || live.over) return false;
               live.t += dt; live.left = Math.max(0, live.left - dt);
               live.game.step(live, dt);
               if (live.left <= 0 && live.game.timed !== false) finish();
               return true; },
    // state
    state, sameDay, pay, toSave, load, reset(){ Object.assign(state, fresh()); },
    day: () => H.day(),
    tickets: () => H.tickets(),
    bind(h) { host = h || null; },
  };
})();

MallFit['游戏厅'] = A => {
  const D = 4.8;                      // shop depth: 0 is the back wall, 4.8 the shopfront glass
  // The unit is 15 m long, so b runs -7.5 to 7.5 and the party walls stand on those two numbers.

  // ---- palette. `col` lives inside mall.js's closure, so the tenant mixes its own. Everything
  // emissive is fully saturated: mode 1 multiplies the colour by (1 + glow*3) before the tonemap,
  // and a pale tint pushed through that comes out white, which is how neon stops being neon.
  //
  // The `g*` entries are the other half of that: the near-black grounds a lit shape is seen
  // against. A sign is a dark plate with bright letters on it; a screen is a dark picture with
  // two bright things in it. Neither is a slab of colour.
  const K = {
    case:  C('#1b202a'), caseD: C('#141922'), black: C('#0a0c11'), trim: C('#39424f'),
    steel: C('#7d8792'), rail:  C('#9aa4ae'), cream: C('#fff6e2'), pad:  C('#1e232d'),
    mag:   C('#ff2f7e'), cyan:  C('#2fd6ff'), lime:  C('#6cff5a'), amber: C('#ffb43a'),
    viol:  C('#9d5cff'), blue:  C('#3f6bff'), red:   C('#ff4433'), warm:  C('#ffd9a0'),
    ice:   C('#dfe9f2'),
    gMag:  C('#2b0a1b'), gViol: C('#170b28'), gBlue: C('#07182b'), gInk:  C('#0c0f16'),
    // plush and prize colours — these are cloth (mode 7), not lights
    p1: C('#ff8fb0'), p2: C('#4fd8c0'), p3: C('#ffd447'), p4: C('#9b8cf0'),
    p5: C('#ff9040'), p6: C('#62b9f5'), p7: C('#f2e7cf'), p8: C('#ef5566'),
  };
  // Screen faces: a dark saturated ground with two or three brighter shapes on it. A single flat
  // rectangle is what the old fit had, and twelve of them read as twelve blue stickers.
  const SCR = [
    [C('#0e2f74'), C('#5fe0ff'), C('#ffd24a')],
    [C('#2c1060'), C('#ff5fd0'), C('#8affc0')],
    [C('#0d3a2b'), C('#7dff8a'), C('#ffe24a')],
    [C('#4d1220'), C('#ff8a5a'), C('#ffd24a')],
    [C('#0a2848'), C('#48c9ff'), C('#ff6fae')],
    [C('#3a2a06'), C('#ffd24a'), C('#7fe8ff')],
  ];
  // What is *in* each of those pictures, in the screen face's own normalised coordinates:
  // x and y from -.5 to .5, then width, height, which of the two bright colours, and the glow.
  // Six layouts, so a bank of cabinets is six different games and not one game printed twelve
  // times — which, at the size a screen is seen from the aisle, is all the variety that reads.
  const ART = [
    [[0, .34, .90, .13, 1, .17], [-.20, -.06, .28, .34, 2, .13], [.24, -.16, .22, .20, 1, .12]],
    [[0, -.36, .92, .11, 2, .17], [-.12, .12, .42, .30, 1, .12], [.28, .20, .18, .18, 2, .15]],
    [[-.30, 0, .20, .70, 1, .13], [.12, .24, .48, .13, 2, .16], [.16, -.16, .34, .24, 1, .12]],
    [[0, .10, .54, .38, 1, .11], [-.32, -.30, .20, .11, 2, .18], [.32, -.30, .20, .11, 2, .18]],
    [[0, .30, .78, .11, 2, .17], [0, -.10, .32, .32, 1, .13], [-.32, -.32, .22, .11, 1, .16]],
    [[.18, .14, .46, .34, 1, .12], [-.26, .28, .24, .15, 2, .16], [-.18, -.28, .38, .11, 2, .15]],
  ];
  // Six liveries, each a bright and the near-black of the same hue. A cabinet flank painted in
  // the bright alone is a slab of saturated plastic a metre wide, which is what six of them
  // looked like from the concourse; painted as bands of the bright on the dark it reads as
  // printed side art, which is what it is.
  const ACC = [K.mag, K.cyan, K.amber, K.viol, K.lime, K.blue];
  const ACD = [C('#460c22'), C('#093749'), C('#463010'), C('#291848'), C('#154612'), C('#111d48')];
  // The only material in the room, and the only one it wants. One repeat per 1.05 m so a 0.8 m
  // cabinet gets a soft tonal drift down its side rather than a run of corrugated ribs, and
  // nrmAmt well below the default 1 so the relief is a sheen and not an AO-coloured grey cloud.
  const SHELL = { mat: 'steel', matScale: 1.05, matAmt: .15, nrmAmt: .26 };
  const RND = .06;                    // one corner radius for every soft body in the shop
  const screenFx = [], clawRigs = [], puckRigs = [], danceFx = [], faultFx = [], leaderFx = [],
        promoFx = [];
  const screenProp=(p,glow)=>{
    A.dynamicVisual(p); screenFx.push({p,glow,phase:screenFx.length*.73}); return p;
  };

  // ---- rotation. `ry` spins a prop about its own centre, but A.put/A.ball place by shop-local
  // (a, b), so anything hung off a turned machine has to be turned with it. `P` maps an offset in
  // the machine's own frame — dz along the way it faces, dx across its width — into (a, b).
  // At ry 0 a machine faces +a, which is out towards the concourse. This shop is on the north
  // side, where local +z is +a and local +x is +b; that is the frame put() builds boxes in.
  const turn = ry => { const s = Math.sin(ry), c = Math.cos(ry); return (a, b) =>
    (dz, dx) => [a - dx * s + dz * c, b + dx * c + dz * s]; };

  // A lit face and a thin lit run, written once so the two glow bands stay honest. `E` is for
  // anything you could read a word off; `N` is for neon, which is only ever a few centimetres
  // across in one direction and is the only thing in here allowed to be bright.
  const E = g => ({ hard: true, mode: 1, glow: g });
  const N = g => ({ hard: true, mode: 1, glow: g });

  // A physical out-of-order card: an amber plate with a red centre, held invisible until its exact
  // logical cabinet is in brokenToday(). There is one pair for each of the six games (twelve plates
  // total), all registered as retained visuals and updated by the existing machines callback. The
  // two depths keep the colours clean without a light or a z-fight.
  function faultMark(P, key, R, dz, y) {
    const plate = A.put(...P(dz, 0), .024, .30, .32, y, K.amber,
      {hard:true, mode:1, glow:0, alpha:.001, gloss:.24, ...R});
    const core = A.put(...P(dz + .015, 0), .014, .18, .12, y, K.red,
      {hard:true, mode:1, glow:0, alpha:.001, gloss:.22, ...R});
    plate.mallArcadeFaultKey = core.mallArcadeFaultKey = key;
    plate.mallArcadeFaultPart = 'plate'; core.mallArcadeFaultPart = 'core';
    A.dynamicVisual(plate, core);
    faultFx.push({key, parts:[{p:plate, glow:.10}, {p:core, glow:.16}]});
  }

  // ------------------------------------------------------------------ upright cabinet 街机
  // 1.60 m of dark box, a coloured side livery, a lit marquee with artwork on it over a lit
  // screen with a picture in it, a sloped control deck with a stick and three buttons, a coin
  // plate, a kick strip and a light down each front corner. Twelve of these are most of the room
  // and most of its light.
  // `k` picks the livery (ACC/ACD) and `sk` the screen palette (SCR). They are two indices and
  // not one because the back rows deliberately run a screen three steps off their own livery, so
  // a cabinet seen from the aisle is not the same two colours twice. Both are indices into those
  // tables — passing an already-resolved colour in here is what made SCR[k] undefined and took
  // the whole mall build down with it, and through it the title screen.
  function cabinet(a, b, ry, k, sk, art, faultKey = '') {
    const P = turn(ry)(a, b), R = { ry }, acc = ACC[k], scr = SCR[sk];
    A.put(...P(0, 0), .80, .72, 1.58, .79, K.case, { round: RND, gloss: .28, ...SHELL, ...R });
    // The livery is proud of the body, so it shows as painted panelling down both flanks — which
    // is the side of the cabinet you actually see from an aisle you are walking along — and 4 cm
    // shy of the front, so the flank has an edge instead of a butt joint. Dark ground, two
    // bright bands, one dark rail across the top.
    A.put(...P(-.06, 0), .56, .75, 1.02, 1.00, ACD[k], { round: RND, gloss: .30, ...SHELL, ...R });
    A.put(...P(-.02, 0), .30, .77, .30, 1.30, acc, { round: RND, gloss: .30, ...SHELL, ...R });
    A.put(...P(-.14, 0), .20, .77, .15, .82, acc, { round: RND, gloss: .30, ...SHELL, ...R });
    A.put(...P(-.06, 0), .18, .78, .07, 1.44, K.caseD, { round: RND, gloss: .26, ...SHELL, ...R });
    // screen: bezel, a dark picture, and what is happening in it
    A.put(...P(.30, 0), .10, .66, .62, 1.33, K.black, { hard: true, gloss: .18, ...R });
    screenProp(A.put(...P(.356, 0), .02, .56, .50, 1.33, scr[0], { ...E(.09), ...R }),.09);
    for (const [dx, dy, w, h, ci, g] of art)
      screenProp(A.put(...P(.369, dx * .56), .014, w * .56, h * .50, 1.33 + dy * .50, scr[ci],
        { ...E(g), ...R }),g);
    // marquee: housing, a lit ground, and a graphic cut out of it — a dark block off centre with
    // a bright bar beside it, which at the size a marquee is read from an aisle is as much of a
    // logo as anything more elaborate would resolve into.
    A.put(...P(.22, 0), .28, .78, .34, 1.85, K.black, { hard: true, gloss: .18, ...R });
    A.put(...P(.366, 0), .02, .70, .22, 1.85, acc, { ...E(.12), ...R });
    A.put(...P(.378, -.15), .012, .30, .15, 1.85, ACD[k], { ...E(.02), ...R });
    A.put(...P(.378, .17), .012, .16, .06, 1.885, K.cream, { ...E(.13), ...R });
    A.put(...P(.378, .13), .012, .08, .05, 1.815, K.cream, { ...E(.13), ...R });
    A.put(...P(.374, 0), .012, .68, .03, 1.735, K.cream, { ...N(.20), ...R });
    // control deck, stick and buttons
    A.put(...P(.30, 0), .34, .70, .085, .99, K.trim, { hard: true, gloss: .36, rx: .30, ...R });
    A.cyl(...P(.25, -.17), 1.015, .022, .09, K.steel, { gloss: .55 });
    A.ball(...P(.25, -.17), 1.085, .036, .036, .036, K.red, { gloss: .55 });
    for (let i = 0; i < 3; i++)
      A.cyl(...P(.30 - i * .045, .02 + i * .10), 1.012, .030, .016,
        [K.amber, K.cyan, K.lime][i], { gloss: .60 });
    A.put(...P(.338, .20), .022, .16, .05, .60, K.amber, { ...N(.17), ...R });     // coin plate
    A.put(...P(.338, 0), .022, .62, .04, .085, acc, { ...N(.22), ...R });          // kick strip
    // The two lights down the front corners. Seen down a row this is what a bank of cabinets
    // reads as: a rhythm of upright neon receding, rather than eight dark boxes in a line.
    for (const s of [-1, 1])
      A.put(...P(.372, s * .345), .026, .035, 1.22, .84, acc, { ...N(.20), ...R });
    if (faultKey) faultMark(P, faultKey, R, .406, .50);
  }

  // ------------------------------------------------------------------ claw machine 娃娃机
  // The first version of this was a lit glass box with toys in the bottom, and the glass — one
  // pane at alpha .26 — was invisible in every render. What came out was a black crate with
  // balls balanced on the lid. A glass case reads through its *frame*: four corner posts, a rail
  // top and bottom, and only then the pane. So the posts are solid steel and the glass is what
  // fills between them.
  function claw(a, b, ry, acc, faultKey = '') {
    const P = turn(ry)(a, b), R = { ry };
    A.put(...P(0, 0), .84, .92, .64, .34, K.case, { round: RND, gloss: .28, ...SHELL, ...R });
    A.put(...P(0, 0), .70, .78, .06, .03, K.black, { hard: true, gloss: .16, ...R });   // toe
    A.put(...P(.42, 0), .026, .84, .05, .50, acc, { ...N(.21), ...R });
    A.put(...P(0, 0), .88, .96, .05, .685, K.trim, { hard: true, gloss: .40, ...R });   // sill
    // case: posts, top rail, glass
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      A.put(...P(sz * .40, sx * .44), .055, .055, .84, 1.13, K.steel,
        { hard: true, gloss: .55, ...R });
    A.put(...P(0, 0), .88, .96, .06, 1.58, K.trim, { hard: true, gloss: .40, ...R });
    A.put(...P(0, 0), .78, .86, .80, 1.13, K.ice,
      { hard: true, mode: 1, alpha: .17, gloss: .90, ...R });
    // The toys sit on the floor of the case, which is what makes it a claw machine and not a
    // vitrine: a heap you can see the top of through the glass, not a display.
    const heap = [[-.24, -.18], [.02, -.26], [.22, -.06], [-.10, .10], [.18, .20], [-.26, .24]];
    heap.forEach(([dx, dz], i) => A.ball(...P(dz * .72, dx), .84,
      .105, .095, .105, [K.p1, K.p3, K.p2, K.p8, K.p6, K.p4][i], { mode: 7 }));
    // gantry and claw
    A.put(...P(-.02, 0), .06, .86, .05, 1.48, K.rail, { hard: true, gloss: .55, ...R });
    const carriage=A.put(...P(-.02, .12), .12, .12, .09, 1.42, K.trim,
      { hard: true, gloss: .45, ...R });
    const head=A.taper(...P(-.02, .12), 1.30, .13, .16, .13, K.steel, { gloss: .55 });
    A.dynamic(carriage,a,b,1.38,.72); A.dynamic(head,a,b,1.30,.72);
    clawRigs.push({P,parts:[carriage,head].map(p=>({p,x:p.m[12],z:p.m[14]})),
      base:P(-.02,.12),phase:clawRigs.length*1.7});
    // marquee
    A.put(...P(0, 0), .84, .96, .28, 1.75, K.black, { hard: true, gloss: .18, ...R });
    A.put(...P(.43, 0), .02, .86, .18, 1.75, acc, { ...E(.13), ...R });
    A.put(...P(.442, 0), .012, .22, .11, 1.75, K.gInk, { ...E(.02), ...R });
    A.put(...P(.40, 0), .026, .26, .05, 1.01, K.amber, { ...N(.17), ...R });      // coin slot
    if (faultKey) faultMark(P, faultKey, R, .445, .48);
  }

  // ------------------------------------------------------------------ racing cabinet 赛车游戏
  // Seen in profile, because that is the only view of a racing cabinet with anything in it: hood,
  // screen, wheel, seat, all in a line. Built along `a` with the screen at the back and the seat
  // towards the shopfront, so a driver sits facing the back wall and the aisle sees the whole
  // machine side-on.
  function racer(a, b, acc, scr, art, title='京城竞速', faultKey = '') {
    A.put(a, b, 1.88, .92, .22, .12, K.caseD, { hard: true, gloss: .24, ...SHELL });
    A.put(a, b, 1.92, .26, .05, .245, acc, { ...N(.20) });                        // sill neon
    // screen end
    A.put(a - .78, b, .34, .90, 1.22, .84, K.case, { round: RND, gloss: .28, ...SHELL });
    A.put(a - .60, b, .06, .80, .58, 1.24, K.black, { hard: true, gloss: .18 });
    screenProp(A.put(a - .566, b, .02, .70, .50, 1.24, scr[0], E(.06)),.06);
    for (const [dx, dy, w, h, ci, g] of art)
      screenProp(A.put(a - .553, b + dx * .70, .014, w * .70, h * .50,
        1.24 + dy * .50, scr[ci], E(g)),g);
    A.put(a - .78, b, .40, .96, .26, 1.68, K.black, { hard: true, gloss: .18 });
    A.put(a - .585, b, .02, .88, .17, 1.68, acc, E(.13));
    A.put(a - .597, b, .012, .28, .10, 1.68, K.gInk, E(.02));
    A.glyph(a - .605, b, 1.68, title, {size:.077, gap:.020, color:K.cream, mode:1, glow:.16});
    // dash, wheel and lever
    A.put(a - .34, b, .30, .78, .16, .84, K.trim, { hard: true, gloss: .36, rx: .22 });
    A.cyl(a - .30, b, .96, .135, .045, K.trim, { rx: Math.PI / 2, gloss: .45 });
    A.cyl(a - .30, b, .96, .045, .07, K.steel, { rx: Math.PI / 2, gloss: .6 });
    A.put(a - .12, b + .30, .06, .06, .18, .86, K.steel, { hard: true, gloss: .55 });
    A.put(a - .46, b, .05, .34, .035, 1.00, acc, N(.19));                          // dash strip
    // seat
    A.put(a + .34, b, .52, .60, .16, .55, K.trim, { round: RND, gloss: .18 });
    A.put(a + .62, b, .16, .58, .60, .89, acc, { round: RND, gloss: .20 });
    A.put(a + .62, b, .12, .30, .16, 1.24, K.caseD, { round: RND, gloss: .20 });    // headrest
    A.put(a + .34, b, .18, .18, .40, .33, K.steel, { hard: true, gloss: .5 });      // pedestal
    if (faultKey) faultMark(turn(Math.PI / 2)(a, b), faultKey, {ry:Math.PI / 2}, .475, .50);
  }

  // ------------------------------------------------------------------ dance machine 跳舞机
  // Screen cabinet with speaker towers, a lit floor pad and the grab bar along the back of it.
  // The pad is the point: a metre and a half of light lying on the carpet is the only fitting in
  // the room that puts colour under a player's feet. It is a *dark* pad with four lit arrows on
  // it, not a lit pad — 1.9 m² of amber at glow .22 is a sheet of blown yellow with some faint
  // triangles printed on it, which is exactly what the first version rendered as.
  function dance(a, b, acc, faultKey = '') {
    A.put(a - .80, b, .55, 1.72, 1.98, 1.00, K.case, { round: RND, gloss: .26, ...SHELL });
    A.put(a - .52, b, .05, 1.14, .80, 1.40, K.black, { hard: true, gloss: .18 });
    screenProp(A.put(a - .496, b, .02, 1.04, .70, 1.40, SCR[1][0], E(.06)),.06);
    for (const [dx, dy, w, h, ci, g] of ART[1])
      screenProp(A.put(a - .483, b + dx * 1.04, .014, w * 1.04, h * .70,
        1.40 + dy * .70, SCR[1][ci], E(g)),g);
    A.put(a - .80, b, .58, 1.76, .26, 2.12, K.black, { hard: true, gloss: .18 });
    A.put(a - .515, b, .02, 1.58, .17, 2.12, acc, E(.12));
    A.put(a - .527, b, .012, .46, .10, 2.12, K.gInk, E(.02));
    A.glyph(a - .535, b, 2.12, '京韵节拍', {size:.105, gap:.030, color:K.cream, mode:1, glow:.17});
    for (const s of [-1, 1]) {
      A.put(a - .66, b + s * .72, .30, .30, 1.26, .64, K.caseD,
        { round: RND, gloss: .26, ...SHELL });
      A.put(a - .50, b + s * .72, .03, .18, .58, .74, K.gViol, E(.05));
      A.put(a - .512, b + s * .72, .022, .09, .035, .74, K.viol, N(.20));
    }
    // the pad: a dark deck, a thin lit kerb round it, four lit arrows and five dark panels
    A.put(a + .42, b, 1.20, 1.54, .13, .065, K.pad, { hard: true, gloss: .28, ...SHELL });
    for (const s of [-1, 1]) {
      A.put(a + .42 + s * .615, b, .035, 1.56, .035, .148, acc, N(.19));
      A.put(a + .42, b + s * .795, 1.26, .035, .035, .148, acc, N(.19));
    }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const arrow = (i + j) % 2 === 1;             // the four edge-centre panels, not the corners
      const c = arrow ? [K.cyan, K.mag, K.lime, K.amber][(i + j * 2) % 4] : K.caseD;
      const p=A.put(a + .06 + i * .36, b - .38 + j * .38, .31, .31, .022, .154, c,
        arrow ? E(.18) : { hard: true, gloss: .30 });
      if(arrow) { A.dynamicVisual(p); danceFx.push({p,phase:danceFx.length*.9}); }
    }
    A.put(a + .92, b, .07, 1.26, .07, 1.02, K.rail, { hard: true, gloss: .55 });   // grab bar
    for (const s of [-1, 1]) A.put(a + .92, b + s * .60, .07, .07, .96, .54, K.rail,
      { hard: true, gloss: .55 });
    if (faultKey) faultMark(turn(0)(a - .80, b), faultKey, {ry:0}, .338, .82);
  }

  // ------------------------------------------------------------------ air hockey 气垫球
  // The playfield is white plastic lit by the room, not a light. It was 1.8 m² of emissive ice
  // at glow .13, which came out as a blank white slab with a puck on it — the one surface in the
  // arcade that should read as an ordinary lit object, because that is what makes the lit ones
  // look lit.
  function hockey(a, b, faultKey = '') {
    A.put(a, b, 1.94, 1.10, .56, .34, K.caseD, { hard: true, gloss: .24, ...SHELL });
    A.put(a, b, 1.68, .86, .16, .08, K.black, { hard: true, gloss: .18 });          // plinth
    A.put(a, b, 1.82, .98, .03, .625, K.ice, { hard: true, gloss: .52 });           // playfield
    A.put(a, b, 1.98, 1.14, .09, .665, K.trim, { hard: true, gloss: .42 });         // rail
    A.put(a, b, .025, .94, .012, .646, K.cyan, N(.18));                             // centre line
    for (const s of [-1, 1]) {
      A.put(a + s * .62, b, .012, .94, .012, .646, K.mag, N(.14));
      A.put(a + s * .905, b, .05, .34, .02, .646, K.black, { hard: true, gloss: .1 });
      A.cyl(a + s * .38, b - s * .14, .655, .075, .035, s > 0 ? K.blue : K.red, { gloss: .5 });
    }
    const puck=A.cyl(a + .02, b + .30, .652, .048, .014, K.amber, { gloss: .5 });   // the puck
    A.dynamic(puck,a,b,.652,1.15);
    puckRigs.push({p:puck,a,b,phase:puckRigs.length*2.1});
    // scoreboard on a post at the far end, which is where one lives and where it is seen from
    A.put(a - .92, b, .10, .10, .74, 1.02, K.steel, { hard: true, gloss: .5 });
    A.put(a - .92, b, .18, .46, .26, 1.46, K.black, { hard: true, gloss: .22 });
    A.put(a - .80, b, .025, .38, .16, 1.46, K.gInk, E(.03));
    for (const s of [-1, 1]) A.put(a - .812, b + s * .10, .022, .12, .10, 1.46, K.amber, E(.16));
    if (faultKey) faultMark(turn(Math.PI / 2)(a, b), faultKey, {ry:Math.PI / 2}, .575, .38);
  }

  // ------------------------------------------------------------------ 投篮机 basketball
  // The one machine in a Chinese arcade taller than anybody standing at it, which is why it earns
  // the floor it takes: 2.5 m of lit cage over a 1.9 m ramp. Built along `a` with the backboard at
  // the back and the ball trough at the front, so a player stands in the lane and shoots away from
  // the concourse and the machine is read in profile, which is the only view of one with depth in
  // it. The cage is five thin uprights a side rather than a mesh plane: at four metres a bright bar
  // every 40 cm reads as netting, and a transparent sheet reads as nothing at all — the same lesson
  // the claw machine's glass taught, in the same room.
  function hoops(a, b, acc) {
    A.put(a + .10, b, 1.84, 1.00, .46, .29, K.case, { round: RND, gloss: .28, ...SHELL });
    A.put(a + .10, b, 1.68, .86, .10, .045, K.black, { hard: true, gloss: .16 });     // toe
    A.put(a + .99, b, .05, .96, .05, .56, acc, N(.20));                              // sill neon
    // the return ramp and the trough the balls sit in, which is the half of the machine at eye
    // level from the aisle and the half that says what it is
    A.put(a + .16, b, 1.42, .84, .05, .61, K.pad, { hard: true, gloss: .30, rx: -.17, ...SHELL });
    A.put(a + .90, b, .28, .92, .17, .60, K.trim, { hard: true, gloss: .36 });
    for (let i = 0; i < 3; i++)
      A.ball(a + .90, b - .27 + i * .27, .755, .105, .105, .105, K.amber,
        { mode: 7, gloss: .40 });
    for (const s of [-1, 1]) {
      A.put(a + .10, b + s * .50, 1.84, .08, 2.06, 1.55, K.caseD,
        { round: RND, gloss: .26, ...SHELL });
      A.put(a + .10, b + s * .455, 1.78, .022, .04, 2.34, acc, N(.19));
      for (let i = 0; i < 5; i++)
        A.put(a - .60 + i * .40, b + s * .47, .03, .03, 1.56, 1.44, K.rail,
          { hard: true, gloss: .50 });
    }
    A.put(a + .10, b, 1.88, 1.06, .08, 2.62, K.black, { hard: true, gloss: .20 });    // top rail
    // backboard, ring and skirt
    A.put(a - .68, b, .08, .76, .54, 1.88, K.ice, { hard: true, gloss: .55 });
    A.put(a - .635, b, .02, .32, .24, 1.80, acc, E(.10));
    A.cyl(a - .49, b, 1.66, .215, .035, K.red, { rx: Math.PI / 2, gloss: .55 });
    A.taper(a - .49, b, 1.52, .40, .26, .40, K.cream, { mode: 7 });
    // header and the two-digit score box under it
    A.put(a + .10, b, .30, 1.08, .36, 2.90, K.black, { hard: true, gloss: .20 });
    A.put(a + .955, b, .02, .96, .25, 2.90, acc, E(.12));
    A.put(a + .967, b, .012, .30, .15, 2.90, ACD[2], E(.02));
    A.put(a + .82, b, .18, .64, .28, 2.24, K.black, { hard: true, gloss: .20 });
    A.put(a + .915, b, .02, .54, .17, 2.24, K.gBlue, E(.05));
    for (const s of [-1, 1]) A.put(a + .927, b + s * .13, .018, .17, .12, 2.24, K.amber, E(.16));
  }

  // ------------------------------------------------------------------ 自动售货机 the drinks machine
  // Every arcade in the country keeps one of these by the door, and in here it is the one fixture a
  // player can buy something out of that is not a game. The light comes off the *shelves* and not
  // off the whole front: a 0.5 m² pane at glow .13 is a fridge-shaped lamp, four lit shelf lips
  // with bottles standing on them is a vending machine.
  function vender(a, b, acc) {
    A.put(a, b, .70, .80, 1.84, .92, K.case, { round: RND, gloss: .28, ...SHELL });
    A.put(a, b, .60, .68, .10, .05, K.black, { hard: true, gloss: .16 });
    A.put(a + .345, b - .10, .03, .54, 1.32, 1.10, K.gBlue, E(.05));                 // the lit well
    for (let i = 0; i < 4; i++) {
      A.put(a + .358, b - .10, .02, .52, .026, .53 + i * .36, acc, N(.17));
      for (let j = 0; j < 5; j++)
        A.cyl(a + .352, b - .30 + j * .10, .59 + i * .36, .033, .16,
          [K.p3, K.p6, K.p8, K.p2, K.p5][(i + j) % 5], { mode: 7, gloss: .45 });
    }
    A.put(a + .35, b + .27, .03, .17, 1.32, 1.10, K.caseD, { hard: true, gloss: .30 });
    for (let i = 0; i < 4; i++) A.put(a + .368, b + .27, .012, .11, .05, 1.46 - i * .17,
      [K.cyan, K.lime, K.amber, K.mag][i], N(.16));
    A.put(a + .33, b + .27, .05, .14, .19, .62, K.gInk, E(.03));                     // scan panel
    A.put(a + .358, b + .27, .014, .09, .05, .66, K.cyan, N(.18));
    A.put(a + .33, b - .06, .05, .46, .17, .37, K.black, { hard: true, gloss: .18 }); // the flap
    A.put(a, b, .74, .84, .11, 1.90, K.black, { hard: true, gloss: .20 });            // header
    A.put(a + .372, b, .02, .72, .17, 1.83, acc, E(.12));
    A.put(a + .384, b - .17, .012, .24, .10, 1.83, K.gInk, E(.02));
  }

  // ------------------------------------------------------------------ a plush toy, three parts
  // `k` scales the whole animal about its feet, so the same three primitives make the handful on a
  // shelf and the metre-high one standing on a plinth in the window. A window's job is to show what
  // the shop sells at the size the street can see it.
  function plush(a, b, y, c, k = 1) {
    A.ball(a, b, y + .115 * k, .115 * k, .105 * k, .10 * k, c, { mode: 7 });
    A.ball(a, b, y + .265 * k, .085 * k, .085 * k, .08 * k, c, { mode: 7 });
    A.cap(a, b, y + .335 * k, .15 * k, .05 * k, .05 * k, c, { mode: 7 });      // the ears, as one bar
  }

  // ================================================================== the room
  //
  // ---- the party walls. The shell gives every tenant 3.5 m of pale plaster on each side with a
  // lit graphic panel let into it. In here that is the brightest object in the room by a factor
  // of several, and it is 15 m² of it. Lined out in near-black with two neon runs, hung 3 cm
  // clear of the shell's own panel face so nothing z-fights.
  // Two pieces each side rather than one: the shell stands a 34 cm timber window platform along
  // the last metre of both walls, so the lining stops short of it and picks up again above it.
  for (const s of [-1, 1]) {
    A.put(1.94, s * 7.26, 3.36, .06, 3.34, 1.77, K.caseD, { hard: true, gloss: .16, ...SHELL });
    A.put(4.11, s * 7.26, .98, .06, 3.04, 1.92, K.caseD, { hard: true, gloss: .16, ...SHELL });
    A.put(1.94, s * 7.20, 3.40, .05, .07, .14, K.trim, { hard: true, gloss: .30 });
    A.put(2.30, s * 7.19, 4.00, .04, .05, 2.36, s > 0 ? K.cyan : K.mag, N(.22));
    A.put(2.30, s * 7.19, 4.00, .04, .05, 2.72, K.viol, N(.20));
  }
  // ---- and the back wall, which is the shell's own and is 3.4 m of pale plaster with a warm
  // slatted timber panel in the middle of it. The prize wall hides the timber; this hides the
  // rest, because from either wing the top half of that wall is most of what is behind the
  // machines and it was the brightest thing in every shot taken from one.
  A.put(.43, 0, .06, 14.10, 3.34, 1.77, K.caseD, { hard: true, gloss: .16, ...SHELL });

  // ---- ceiling. A raft of black over the middle of the shell's lit plane, stopping short of the
  // perimeter so the shell's cove still rings it, with four neon tubes slung underneath and a lit
  // reveal along both long edges so the raft reads as floating rather than as a lid.
  A.put(2.55, 0, 3.50, 14.16, .10, 3.08, K.black, { hard: true, gloss: .14, ...SHELL });
  A.put(2.55, 0, 3.56, 14.22, .04, 3.00, K.trim, { hard: true, gloss: .30 });
  for (const s of [-1, 1]) A.put(2.55 + s * 1.76, 0, .035, 14.10, .035, 2.945, K.viol, N(.20));
  for (let i = 0; i < 4; i++) A.put(1.15 + i * .80, 0, .07, 13.30, .05, 2.940,
    [K.mag, K.cyan, K.viol, K.cyan][i], N(.24));

  // ---- the back wall above the machines, either side of the prize wall: two runs of neon and a
  // vertical tube in each corner. This is the only thing lighting the top of the back wall once
  // the raft is over it.
  for (const s of [-1, 1]) {
    A.put(.50, s * 4.86, .05, 4.20, .06, 2.42, K.mag, N(.24));
    A.put(.50, s * 4.86, .05, 4.20, .06, 2.80, K.cyan, N(.22));
    A.put(.50, s * 7.02, .05, .06, 2.60, 1.62, K.viol, N(.20));
  }

  // ---- prize wall 兑奖处. Carcass, a near-black ground behind the shelves, three shelves with a
  // neon nosing under each, and a lit header. It stands in front of the shell's timber feature
  // panel, which is the warmest and largest surface in the unit and had no business being the
  // back of an arcade.
  //
  // The shelves start at 1.10 because the counter in front of them has a 0.93 top with things
  // standing on it: anything lower than this is furniture seen from the door, not prizes.
  A.put(.58, 0, .22, 5.36, 2.58, 1.29, K.caseD, { hard: true, gloss: .16, ...SHELL });
  A.put(.71, 0, .03, 5.06, 2.32, 1.30, K.gMag, E(.045));
  for (const s of [-1, 1]) {
    A.put(.90, s * 2.62, .60, .16, 2.58, 1.29, K.trim, { hard: true, gloss: .26 });
    A.put(1.21, s * 2.62, .03, .07, 2.28, 1.30, K.viol, N(.21));
    A.put(.90, s * 1.76, .58, .09, 2.44, 1.24, K.caseD, { hard: true, gloss: .20 });
  }
  const SHELF = [1.10, 1.58, 2.06];
  for (const y of SHELF) {
    A.put(.96, 0, .48, 5.14, .05, y, K.trim, { hard: true, gloss: .30 });
    A.put(1.205, 0, .03, 5.08, .035, y - .046, K.cyan, N(.16));
  }
  for (let i = 0; i < 7; i++)                          // plush along the bottom shelf
    plush(1.00, -2.28 + i * .76, SHELF[0] + .025, [K.p1, K.p3, K.p2, K.p8, K.p6, K.p4, K.p7][i]);
  for (let i = 0; i < 7; i++) {                        // boxed prizes on the middle one
    const b = -2.28 + i * .76, h = .24 + (i % 3) * .05;
    A.put(1.00, b, .24, .28, h, SHELF[1] + .025 + h / 2,
      [K.p6, K.p3, K.p8, K.p2, K.p5, K.p4, K.p1][i], { hard: true, mode: 7 });
    A.put(1.135, b, .05, .29, h * .28, SHELF[1] + .025 + h * .64, K.cream,
      { hard: true, mode: 7 });
  }
  for (let i = 0; i < 9; i++)                          // prize capsules along the top
    A.ball(1.00, -2.32 + i * .58, SHELF[2] + .135, .11, .11, .11,
      [K.p3, K.p2, K.p8, K.p6, K.p5, K.p1, K.p4, K.p7, K.p2][i], { mode: 7, gloss: .30 });
  // header. The band is a ground and only the letters are lit: cream at .34 on violet at .06 is
  // a sign, cream at .26 on violet at .26 is a pale rectangle with a smudge in it. The lit part
  // is 3.2 m of the fascia's 5.4, so the three characters fill their own plate instead of
  // floating in the middle of a five-metre light.
  A.put(.86, 0, .48, 5.44, .44, 2.80, K.black, { hard: true, gloss: .20 });
  A.put(1.11, 0, .03, 3.20, .32, 2.80, K.gViol, E(.06));
  for (const s of [-1, 1]) A.put(1.11, s * 2.16, .03, 1.00, .09, 2.80,
    s > 0 ? K.cyan : K.mag, N(.18));
  A.put(1.115, 0, .03, 5.06, .025, 2.615, K.mag, N(.18));
  A.put(1.115, 0, .03, 5.06, .025, 2.985, K.cyan, N(.18));
  A.glyph(1.14, 0, 2.80, '兑奖处', { size: .27, gap: .12, color: K.cream, mode: 1, glow: .34 });

  // 排行榜 — a real three-row board on the left end of the existing fascia, not another panel in
  // the redemption sightline. Its 96 cm plate exactly occupies the old side-accent bay and stays
  // 5 cm clear of the central 兑奖处 face. Rank numerals and score-length bars make all three rows
  // readable from the aisle; the bars are the only dynamic pieces and share one retained draw.
  // 14 props total: back + header + three title glyphs + three rows + three ranks + three bars.
  const LB_A = 1.15, LB_B = -2.16, LB_LEFT = -2.40, LB_MAX = .62;
  A.put(LB_A, LB_B, .025, .96, .42, 2.80, K.black,
    {hard:true, gloss:.20, tag:'排行榜'});
  A.put(1.168, LB_B, .014, .88, .085, 2.94, K.gViol,
    {hard:true, gloss:.18, tag:'排行榜'});
  A.glyph(1.184, LB_B, 2.94, '排行榜',
    {size:.065, gap:.018, color:K.cream, mode:1, glow:.24, tag:'排行榜'});
  [2.84, 2.75, 2.66].forEach((y, i) => {
    A.put(1.168, LB_B, .014, .88, .064, y, K.gInk,
      {hard:true, gloss:.12, tag:'排行榜'});
    A.glyph(1.184, -2.49, y, String(i + 1),
      {size:.050, gap:.010, color:K.cream, mode:1, glow:.18, tag:'排行榜'});
    const p = A.put(1.184, LB_LEFT + LB_MAX / 2, .012, LB_MAX, .036, y, K.cyan,
      {hard:true, mode:1, glow:.10, gloss:.20, tag:'排行榜'});
    p.mallArcadeLeaderRow = i;
    A.dynamicVisual(p);
    leaderFx.push({p, y});
  });
  A.stop(.45, 1.26, -2.74, 2.74);

  // ---- token counter 换币台, closing the aisle in front of the prize wall. Everything on it is
  // an object rather than a lit face: a change machine, a ticket counter, a screen, a bowl of
  // tokens and a stack of boxed prizes, all of which sit in the lower third of the frame from the
  // door and are the reason that third is not a glowing cyan slab any more.
  A.put(1.92, 0, .70, 2.70, .74, .53, K.case, { round: RND, gloss: .26, ...SHELL });
  A.put(1.92, 0, .58, 2.50, .16, .08, K.black, { hard: true, gloss: .16 });        // recessed toe
  A.put(2.255, 0, .03, 2.56, .03, .175, K.mag, N(.20));
  // The top is dark. It was `steel` at #7d8792, which from the door is 2.8 m² of pale grey lying
  // across the bottom third of the frame — the brightest thing in a room whose whole point is
  // that it is dark. A counter top can be a dark worked surface with a lit edge instead.
  A.put(1.92, 0, .78, 2.82, .06, .93, C('#3f4752'), { hard: true, gloss: .52, ...SHELL });
  A.put(2.31, 0, .02, 2.78, .022, .905, K.cyan, N(.17));
  for (const s of [-1, 1]) {
    A.put(2.28, s * .84, .025, .82, .20, .62, K.gBlue, E(.06));
    A.put(2.292, s * .84, .018, .74, .028, .50, K.cyan, N(.19));
  }
  A.glyph(2.31, -.84, .64, '换币', { size: .145, gap: .05, color: K.cream, mode: 1, glow: .30 });
  A.glyph(2.31, .84, .64, '兑奖', { size: .145, gap: .05, color: K.cream, mode: 1, glow: .30 });
  // MV-047 · the counter's offer card is the physical face of ArcadeSys.promotion().  Its seven
  // claim glyphs are built once from the real TOPUPS row; the existing machines callback only
  // trades the two retained status pairs after a successful ¥100 top-up.  Nothing here blinks,
  // emits, blocks the counter, or rebuilds text at frame rate (12 props, one dynamic glyph draw).
  const promo = ArcadeSys.promotion();
  if (promo) {
    A.put(2.326, 0, .014, .70, .30, .72, K.gMag,
      {hard:true, mode:7, gloss:.16, tag:'充值优惠'});
    A.glyph(2.342, 0, .775, promo.claim,
      {size:.050, gap:.012, color:K.amber, mode:0, glow:0, tag:'充值优惠'});
    const ready = [].concat(A.glyph(2.342, 0, .665, promo.ready,
      {size:.060, gap:.018, color:K.cream, mode:1, glow:0, tag:'充值优惠'}) || []);
    const applied = [].concat(A.glyph(2.342, 0, .665, promo.applied,
      {size:.060, gap:.018, color:K.cream, mode:1, glow:0, alpha:.001, tag:'充值优惠'}) || []);
    A.dynamicVisual(ready, applied);
    promoFx.push({ready, applied});
  }
  // change machine
  A.put(1.86, -1.00, .38, .46, .54, 1.23, K.trim, { hard: true, gloss: .36 });
  A.put(2.04, -1.00, .025, .34, .22, 1.34, K.gBlue, E(.05));
  A.put(2.052, -1.00, .018, .26, .05, 1.40, K.cyan, N(.19));
  A.put(2.052, -1.00, .018, .20, .045, 1.08, K.lime, N(.17));
  // ticket counter and a small screen, angled to the aisle
  A.put(1.82, 1.02, .28, .36, .26, 1.09, K.black, { hard: true, gloss: .30, rx: .18 });
  A.put(1.95, 1.02, .025, .28, .17, 1.11, SCR[4][0], E(.06));
  A.put(1.962, 1.02, .018, .20, .04, 1.15, SCR[4][1], N(.18));
  A.put(1.86, .48, .22, .30, .30, 1.11, K.trim, { hard: true, gloss: .34 });
  A.put(1.972, .48, .025, .22, .06, 1.14, K.amber, N(.18));
  // a bowl of tokens, and prize boxes stacked on the end
  A.cyl(1.90, .04, 1.00, .17, .10, K.trim, { gloss: .40 });
  for (let i = 0; i < 5; i++) A.cyl(1.90 + Math.cos(i * 1.9) * .07, .04 + Math.sin(i * 1.9) * .07,
    1.055, .035, .012, K.amber, { gloss: .70 });
  for (let i = 0; i < 2; i++) A.put(1.92 - (i % 2) * .04, -1.28 + (i % 2) * .03, .21, .23,
    .15, 1.045 + i * .16, [K.p3, K.p8][i], { hard: true, mode: 7 });
  A.stop(1.55, 2.30, -1.40, 1.40);

  // ---- the two aisle banks. Turned ninety degrees to the aisle so their marquees recede into
  // the room instead of facing the doorway flat-on. Three deep on each side, which fills the
  // aisle to the door and still leaves 2.9 m clear between them — the doorway is 3.0.
  for (const s of [-1, 1]) {
    const ry = -s * Math.PI / 2;               // the bank at +b faces -b, and the other way about
    for (let i = 0; i < 3; i++) {
      const k = (i * 2 + (s > 0 ? 0 : 3)) % 6;
      const faultKey = i === 0 ? (s > 0 ? 'hoops' : 'shoot') : '';
      cabinet(1.25 + i * .90, s * 1.86, ry, k, k, ART[(k + i) % 6], faultKey);
    }
    A.stop(.83, 3.47, s > 0 ? 1.42 : -2.30, s > 0 ? 2.30 : -1.42);
  }

  // ---- the back rows, four a side facing out into the room, and a claw machine in each corner.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const b = s * (3.15 + i * .84), k = (i + (s > 0 ? 1 : 4)) % 6;
      cabinet(.95, b, 0, k, (k + 3) % 6, ART[(k + 2) % 6]);
    }
    A.put(.86, s * 2.74, .34, .07, 2.30, 1.20, s > 0 ? K.cyan : K.mag, N(.20));   // divider fin
    claw(.95, s * 6.66, 0, s > 0 ? K.mag : K.lime, s > 0 ? 'claw' : '');
    A.stop(.52, 1.40, s > 0 ? 2.76 : -6.06, s > 0 ? 6.06 : -2.76);
    A.stop(.50, 1.42, s > 0 ? 6.18 : -7.14, s > 0 ? 7.14 : -6.18);
  }

  // ---- west wing: two racing seats along the flank wall and the air-hockey table beside them.
  // Both are entered off the lane along the shopfront, which is why nothing here reaches past
  // a 3.40: the concourse's own column lands inside this unit at (3.00, -4.50) and the lane has
  // to get past it.
  racer(2.40, -6.55, K.mag, SCR[4], ART[4], '胡同飞车', 'race');
  racer(2.40, -5.55, K.cyan, SCR[0], ART[0], '长城竞速');
  A.stop(1.40, 3.14, -7.05, -5.05);
  hockey(2.40, -3.30, 'hockey');
  A.stop(1.40, 3.42, -3.90, -2.70);
  // The column is the landlord's, and it is 0.46 m of white plaster standing in the middle of a
  // black room. Clad on the two faces anyone sees — the one towards the shopfront and the one
  // towards the aisle — from just above its stone base to the underside of the raft, with a
  // light down the corner between them. Its own base and capital stay as built: the base is
  // ankle height and the capital is above the raft, so neither is ever in frame.
  A.put(3.27, -4.50, .05, .50, 2.82, 1.63, K.caseD, { hard: true, gloss: .18, ...SHELL });
  A.put(3.00, -4.235, .52, .05, 2.82, 1.63, K.caseD, { hard: true, gloss: .18, ...SHELL });
  A.put(3.29, -4.24, .05, .05, 2.62, 1.63, K.viol, N(.20));

  // ---- east wing: the dance machine, and two more claw machines down the flank wall.
  dance(2.55, 4.40, K.amber, 'rhythm');
  A.stop(1.44, 3.62, 3.48, 5.32);
  claw(2.10, 6.60, -Math.PI / 2, K.cyan);
  claw(3.05, 6.60, -Math.PI / 2, K.amber);
  A.stop(1.60, 3.55, 6.14, 7.06);

  // ---- the floor. A dark carpet inlay over the shell's, then two lit lines down the aisle with
  // cross ticks, a neon threshold just inside the doorway, and a run down each wing.
  //
  // The inlay is here because the shell's own carpet is #4c5a68 laid with the `fabric` map, and
  // that map's mean is well under the 0.22 the shader normalises every material by, so the
  // surface comes out two to three times the colour that was asked for: a mid grey, and by some
  // way the brightest large area in this room. That is a renderer-wide matter and is being fixed
  // centrally — no local correction is applied to it here. What this does instead is what a real
  // arcade fit-out does, which is lay its own dark carpet over the landlord's, and it stops short
  // of the entrance mat so the shell's threshold detail is left alone.
  A.put(2.02, 0, 3.06, 14.20, .016, .030, C('#12161f'), { hard: true, mode: 7, gloss: .05 });
  for (const s of [-1, 1]) {
    A.put(2.55, s * 1.32, 3.66, .06, .016, .050, K.cyan, N(.18));
    for (let i = 0; i < 4; i++) A.put(1.30 + i * .90, s * 1.10, .06, .36, .016, .050,
      K.mag, N(.14));
    A.put(3.20, s * 4.20, .05, 4.90, .016, .050, s > 0 ? K.viol : K.cyan, N(.15));
  }
  A.put(4.10, 0, .07, 2.86, .018, .052, K.mag, N(.22));
  // ---- and a dark deck over the two timber window platforms, which are the shell's and are the
  // one warm surface left in the unit once the feature wall is covered.
  for (const s of [-1, 1])
    A.put(4.18, s * 4.5, 1.03, 5.62, .05, .372, K.caseD, { hard: true, gloss: .18, ...SHELL });

  // ---- two directional blades hung off the raft over the cabinet banks, pointing at the wings.
  // Off the centreline on purpose: anything hung at b 0 in this room sits exactly in front of the
  // 兑奖处 header from both the door and the concourse and turns the end of the aisle to mush.
  for (const s of [-1, 1]) {
    for (const d of [-1, 1]) A.put(3.30, s * 1.90 + d * .30, .05, .05, .56, 2.82, K.steel,
      { hard: true, gloss: .5 });
    A.put(3.30, s * 1.90, .10, .96, .40, 2.34, K.black, { hard: true, gloss: .20 });
    A.put(3.36, s * 1.90, .025, .84, .28, 2.34, s > 0 ? K.gViol : K.gMag, E(.06));
    A.glyph(3.39, s * 1.90, 2.34, s > 0 ? '娃娃机' : '赛车区',
      { size: .155, gap: .05, color: K.cream, mode: 1, glow: .32 });
  }

  // ---- the windows. The shell stands two lit plinths in each bay at b ±1.32 of its centre and
  // hangs the glass in front of them. What the tenant adds is the lightbox over the bay, a lit
  // nosing along the front of the platform, and a prize case standing in the gap between the two
  // plinths — a window shows what the shop sells, and this shop sells one more go at the crane.
  //
  // The case is deliberately shallow and pushed hard up against the glass. Everything in this
  // bay is standing in the metre-wide lane that both wings are reached along, and a 0.9 m deep
  // machine here — which is what a claw machine in the window would be — is a wall across it.
  for (const s of [-1, 1]) {
    const b = s * 4.5;
    A.put(4.34, b, .16, 5.30, .44, 2.48, K.black, { hard: true, gloss: .20 });
    A.put(4.43, b, .03, 4.96, .30, 2.48, s > 0 ? K.gBlue : K.gMag, E(.06));
    A.glyph(4.47, b, 2.48, s > 0 ? '电玩城' : '游戏厅',
      { size: .22, gap: .09, color: K.cream, mode: 1, glow: .32 });
    // A grounded local subtitle beneath the neon header: visible from the atrium, deliberately
    // dimmer than the tenant name so it reads as identity rather than another competing marquee.
    A.put(4.45, b, .025, 2.04, .18, 2.17, K.black, { hard: true, gloss: .18 });
    A.glyph(4.47, b, 2.17, '北京 · 欢乐三楼',
      { size: .085, gap: .025, color: K.amber, mode: 1, glow: .12 });
    A.put(4.10, b, .05, 4.96, .035, .40, K.viol, N(.20));
    // Prize case: back carcass, a dark lit ground in front of it, two shelves in front of that,
    // and the goods in front of those. Depth runs outward here — the concourse is at a larger
    // `a` — so a case built the other way round is a black slab with its own contents inside it,
    // which is the single commonest way a display in this game comes out empty.
    A.put(4.34, b, .08, 1.06, 1.46, 1.075, K.caseD, { hard: true, gloss: .20, ...SHELL });
    A.put(4.40, b, .025, .92, 1.28, 1.075, s > 0 ? K.gViol : K.gBlue, E(.05));
    for (const sx of [-1, 1])
      A.put(4.49, b + sx * .50, .22, .06, 1.46, 1.075, K.caseD,
        { hard: true, gloss: .20, ...SHELL });
    for (let i = 0; i < 2; i++) {
      const y = .76 + i * .50;
      A.put(4.50, b, .20, .96, .04, y, K.trim, { hard: true, gloss: .32 });
      A.put(4.605, b, .02, .94, .03, y - .042, s > 0 ? K.cyan : K.mag, N(.18));
      for (let j = 0; j < 3; j++) {
        const bb = b - .30 + j * .30;
        if (i) plush(4.50, bb, y + .02, [K.p1, K.p3, K.p6][j]);
        else A.ball(4.50, bb, y + .135, .11, .11, .11, [K.p4, K.p8, K.p2][j],
          { mode: 7, gloss: .30 });
      }
    }
    A.put(4.48, b, .28, 1.10, .16, 1.88, K.black, { hard: true, gloss: .20 });
    A.put(4.625, b, .02, .94, .09, 1.88, s > 0 ? K.amber : K.lime, N(.17));
    A.stop(4.28, 4.64, b - .58, b + .58);
  }

  // ---- light. Five, low and coloured, because the interesting thing in an arcade is not that it
  // is lit but that the light comes off the machines at knee and chest height and lands on the
  // floor and on whoever is standing at them. White would be the one colour a room like this must
  // not be, so no two of these are the same and none of them is neutral.
  A.light(1.70, 0, 1.80, [1.00, 0.42, 0.66], .42, 3.4);
  A.light(2.30, -1.95, 1.20, [0.24, 0.72, 1.00], .34, 3.2);
  A.light(2.30, 1.95, 1.20, [0.62, 0.34, 1.00], .34, 3.2);
  A.light(2.60, 4.40, 1.55, [1.00, 0.62, 0.26], .30, 3.0);
  A.light(2.60, -5.60, 1.45, [1.00, 0.30, 0.56], .30, 3.0);

  // Machine motion stays on the machines: screen layers trade emphasis like attract-mode frames,
  // dance arrows chase around the pad, the claw carriages traverse their rails, and the puck
  // circles the air-hockey field.  Nothing on the shopfront or wayfinding pulses.
  //
  // ---- and every flashing one of them goes through the gate
  // This room is the reason the accessibility rule exists, and until now this callback was the one
  // place in the building that did not honour it. Two things were wrong and both are fixed here:
  //
  //   * the dance pad chased at `Math.floor(t*3.2)` — 3.2 flashes a second, over the three-per-
  //     second photosensitivity line, on a lit floor pad in the darkest room in the mall. It now
  //     goes through `MS.step`, which clamps every blinking thing to 2.4 Hz whatever is asked for.
  //   * neither the pad nor the attract screens stopped under reduced motion. Both do now.
  //
  // `MS.step` and `MS.pulse` both answer with a *resting* value rather than a frozen frame when
  // motion is reduced: -1 from `step` means "hold still", so the pad settles at its dim ground
  // rather than stopping on whichever arrow happened to be lit, and `pulse` returns its `lo`, which
  // is why the screens pass 1 as `lo` and .72 as `hi` — reduced motion leaves them lit and steady,
  // not dimmed.
  //
  // The claw carriages and the puck are deliberately *not* gated. They are slow traverses, not
  // flashes — .72 rad/s and .92 rad/s — and js/mall-cinema.js already set the house rule for this
  // with its let-out crowd: a body or a carriage moving across a room at walking pace is not what
  // this switch is for, and freezing them leaves a claw hanging in mid-rail.
  const MS = ArcadeSys.MS;
  const machinePower=A.powerDisplay
    ?A.powerDisplay(screenFx.map(s=>s.p),{id:'cabinet-attract'}):{active:true};
  let faultDay = NaN, faultKeys = [], faultSet = new Set();
  let leaderDay = NaN, leaderPlays = -1, leaderCab = '';
  let promoAt = -1e9, promoSig = '';
  A.motion('machines',(t,state)=>{
    // Commerce changes only through a panel action. Poll four times a second and write only on a
    // signature edge; the offer strings and glyph geometry were both resolved at build time.
    if (t - promoAt >= .25) {
      promoAt = t;
      const offer = ArcadeSys.promotion();
      if (offer && offer.signature !== promoSig) {
        promoSig = offer.signature;
        const on = offer.phase === 'applied';
        promoFx.forEach(r => {
          r.ready.forEach(p => { p.alpha = on ? .001 : 1; });
          r.applied.forEach(p => { p.alpha = on ? 1 : .001; });
        });
        state.promotion = on ? 1 : 0;
        state.promotionClaims = offer.claims;
        state.promotionContract = `${offer.yuan}+${offer.bonus}`;
      }
    }
    if(!machinePower.active){state.power='off';return;}
    state.power='on';
    // Phase is folded into `t` rather than into the sine: MS.pulse owns the frequency so it can cap
    // it, and a caller that reached inside to add a phase term would be reaching around the cap.
    screenFx.forEach(s=>{
      s.p.glow=s.glow*MS.pulse(t+s.phase,1.45,1,.72);
    });
    const beatIx=MS.step(t,3.2,danceFx.length||1);
    danceFx.forEach((d,i)=>{
      const beat=beatIx>=0&&((beatIx+i)%danceFx.length)===0?1:0;
      d.p.glow=.09+beat*.16;
    });
    clawRigs.forEach(r=>{
      const off=Math.sin(t*.72+r.phase)*.19, now=r.P(-.02,.12+off);
      const w=A.at(now[0],now[1]), b=A.at(r.base[0],r.base[1]);
      r.parts.forEach(q=>{q.p.m[12]=q.x+w[0]-b[0]; q.p.m[14]=q.z+w[1]-b[1];});
    });
    puckRigs.forEach(r=>{
      const u=t*.92+r.phase, w=A.at(r.a+Math.sin(u)*.42,r.b+Math.cos(u)*.24);
      r.p.m[12]=w[0]; r.p.m[14]=w[1];
    });
    const day = ArcadeSys.day();
    if (day !== faultDay) {
      faultDay = day;
      faultKeys = ArcadeSys.brokenToday(day);
      faultSet = new Set(faultKeys);
    }
    let visibleFaults = 0;
    faultFx.forEach(r=>{
      const on = faultSet.has(r.key);
      if (on) visibleFaults++;
      r.parts.forEach(q=>{ q.p.alpha = on ? 1 : .001; q.p.glow = on ? q.glow : 0; });
    });
    // No extra callback and no per-frame row allocation: a day roll or a completed game is the
    // only event that can change this physical board. The original maximum-width cull bounds stay
    // conservative while the visible bars shorten within them.
    const today = ArcadeSys.sameDay(day);
    if (day !== leaderDay || today.plays !== leaderPlays || today.board !== leaderCab) {
      const d = ArcadeSys.physicalBoard(day), cabIx = ArcadeSys.CABS.indexOf(d.cab);
      leaderDay = day; leaderPlays = today.plays; leaderCab = today.board;
      leaderFx.forEach((q, i) => {
        const row = d.rows[i], score = row ? row.score : 0;
        const len = .16 + Math.min(1, score / 100) * (LB_MAX - .16);
        const w = A.at(1.184, LB_LEFT + len / 2);
        q.p.m = M.trs(w[0], A.y0 + q.y, w[1], A.yaw, len, .036, .012);
        q.p.color = row && row.me ? K.amber : ACC[(cabIx + i + ACC.length) % ACC.length];
        q.p.glow = .08 + (3 - i) * .025;
        q.p.mallArcadeLeaderName = row ? row.hz : '';
        q.p.mallArcadeLeaderScore = score;
        q.p.mallArcadeLeaderMe = row && row.me ? 1 : 0;
      });
      state.leaderCab = d.cab.key;
      state.leaderRows = d.rows.map(r=>({hz:r.hz, score:r.score, me:!!r.me}));
      state.leaderProps = 14;
    }
    state.screenLayers=screenFx.length;
    state.attractFrame=Math.floor(t*1.45)%6;
    state.claws=clawRigs.length;
    state.pucks=puckRigs.length;
    state.faultDay=faultDay;
    state.faultKeys=faultKeys;
    state.faultMarkers=visibleFaults;
    // Published so a harness can prove the cap rather than trust the comment: `padHz` is what the
    // pad is actually stepping at after the clamp, and `reduced` is which way the gate is set.
    state.padStep=beatIx;
    state.padHz=MS.reduced()?0:Math.min(3.2,MS.cap);
    state.reduced=MS.reduced()?1:0;
  },{far:30});

  // ---- what there is to say in here. Every focus point is 1.15 m out at +a from the thing, so
  // each of these has to have a metre of walkable lane in front of it — which in this layout
  // means the wing machines are labelled on their shopfront ends, not their aisle ends.
  const lobby=A.th('游戏厅', D + .35, 0, '游戏厅里全是灯和声音。', 'The arcade is all lights and sound.',
    '游戏 game + 厅 hall.', 2.4, 2.6);
  lobby.arcadeLobby=true;
  const cabinetThing=A.th('投币', 3.05, -1.50, '投币才能开始。', 'Put a coin in to start.',
    '投 to put in + 币 coin.', 1.5, 1.1);
  cabinetThing.arcadeGame='cabinet';
  const prizeThing=A.th('兑奖', 2.30, .30, '我想用彩票兑奖。', 'I would like to trade my tickets for a prize.',
    '兑 to exchange + 奖 prize.', 1.7, 1.2);
  prizeThing.arcadePrize=true;
  const clawThing=A.th('娃娃机', 3.05, 6.20, '再试一次就能夹到。', 'One more go and you will get it.',
    '娃娃 doll + 机 machine.', 1.8, 1.4);
  clawThing.arcadeGame='claw';
  const raceThing=A.th('赛车', 3.05, -6.55, '这台赛车我最拿手。', 'This racing one is my best.',
    '赛 to race + 车 car.', 1.7, 1.1);
  raceThing.arcadeGame='race';
  const danceThing=A.th('跳舞机', 3.00, 4.40, '跳舞机很难，也很好玩。', 'The dance machine is hard, and great fun.',
    '跳舞 to dance + 机 machine.', 1.8, 1.4);
  danceThing.arcadeGame='dance';
};

// ===============================================================================================
// The shopfront windows. The live arcade inside already has capped attract-mode animation, so the
// glazing gets a static miniature cabinet lineup: enough neon to identify the trade from across the
// atrium, no extra update callback, and no borrowed cabinet art or real-world brand marks.
//
// Budget: four shared pieces plus three six-piece cabinets per bay, 22 each and 44 total. The whole
// display stays within bc +/- 2.33, preserving at least .67 m beside both the doorway and end wall.
MallFit['游戏厅:glass'] = { alpha: .29, gloss: .87 };
MallFit['游戏厅:win'] = (W, bc, side) => {
  const black = C('#10131a'), shell = C('#222532'), edge = C('#383447');
  const cyan = C('#36d7e5'), magenta = C('#e44a9b'), lime = C('#a9dc4b');
  const amber = C('#f2ae42'), white = C('#e8f2ef');
  const neon = side < 0 ? [cyan, magenta, lime] : [magenta, amber, cyan];

  // The dark deck and backboard deliberately sit behind the brighter cabinets. Two edge strips
  // frame the bay but stop well short of the doorway, and every luminous face is depth-offset.
  W.put(4.18, bc, .96, 4.65, .045, .363, black, { hard:true, gloss:.28 });
  W.put(3.76, bc, .070, 4.65, 1.44, 1.34, shell, { hard:true, gloss:.18 });
  for (const k of [-1, 1])
    W.put(3.805, bc + k * 2.18, .014, .055, 1.24, 1.38, neon[k < 0 ? 0 : 1],
      { hard:true, mode:1, glow:.080 });

  for (let i = 0; i < 3; i++) {
    const b = bc + (i - 1) * 1.45, color = neon[i];
    W.put(4.04, b, .42, .72, .96, .870, i === 1 ? edge : shell,
      { hard:true, gloss:.28, round:.045 });
    W.put(4.262, b, .018, .54, .40, 1.080, color,
      { hard:true, mode:1, glow:.105, round:.025 });
    W.put(4.264, b, .018, .62, .18, 1.360, color,
      { hard:true, mode:1, glow:.125, round:.022 });
    W.put(4.290, b, .20, .59, .085, .785, black,
      { hard:true, gloss:.34, rz:(i - 1) * .025 });
    W.cyl(4.345, b, .875, .024, .12, white, { gloss:.46 });
    W.ball(4.345, b, .955, .052, .052, .052, color,
      { mode:1, glow:.075, gloss:.36 });
  }
};

// A working arcade is never an empty showroom. These patrons are static roster entries (this
// tenant file loads before game.js folds MallCast), placed in measured clear pockets at machines.
// Local shop coordinates unroll to x=b-4, z=-18+a for shop('N',-4,15).
//
// ---------------------------------------------------------------- which way round the frame is
// This unit is on the *north* side, which is the mirror of the cinema's south one, and the sign
// that catches people out is the depth term: here z = -18 + a, so a *larger* a is a *larger* z.
// Staff stand at small a and look out at the customers, which is towards larger a, which is +z —
// and since a yaw's direction is (sin, cos), that is `face: 0`. Customers looking back at the
// counter face Math.PI. That is the opposite pair of numbers from js/mall-cinema.js and both are
// right; copying either file's yaws into the other turns everybody around.
if (typeof MallCast !== 'undefined') MallCast.push(

  // ---------------------------------------------------------------- who works here
  // 苏晓萌 at the 换币台. She is named because ArcadeSys already names her: the card panel's
  // subtitle and the lobby's counter heading both say 苏晓萌, and a counter whose panel is signed
  // by somebody who is not standing at it is the kind of small lie this game is built not to tell.
  // She stands at a 1.55, which is the 2 cm of staff side between the back wall's lining and the
  // counter carcass at a 1.57 — there is nowhere else along that run she could be.
  { hz:'收银员', name:'苏晓萌', py:'Sū Xiǎoméng', place:'mall', mallFloor:3,
    rig:'mall-arcade-cashier-su-xiaomeng', temper:'genial',
    look:{skin:'#d8a77d',hair:'#27211d',hairStyle:'short',top:'#374d6b',pants:'#2f3540',
      shoe:'#e7dfd0',collar:'hood',vest:'#7a1f4e',tall:1.02,faceSeed:8311},
    spots:[{h0:10,h1:23,at:[-4.0,-16.45],face:0,act:'vend'}],
    lines:[['一块钱一个币，充值一百送二十。','A yuan a token — top up a hundred and you get twenty free.'],
           ['彩票在这边换奖品，今天的货就这些。','Trade your tickets here; this is all we have in today.'],
           ['卡里还有多少币，我帮您查一下。','I can check how many tokens are left on your card.']] },

  // 高师傅, who is the reason a machine can be 故障 and somebody still be doing something about it.
  // He stands in the 1.15 m of open floor between the air-hockey table (which stops at b -3.90)
  // and the racing bank (which starts at b -5.05), a metre back from the landlord's column, facing
  // the racers with a toolbox — `act:'work'` is the roster's own kneeling-at-something pose and
  // game.js:5760 already puts a tool in that hand.
  //
  // Deliberately no `lines`. There is no 维修工 row in js/data.js's verb table, and that file is
  // the lead's; game.js:10708 resolves an unknown `hz` to `null` rather than throwing, so he is a
  // body you can see and not one you can talk to. The moment a 维修工 verb exists he becomes
  // interactive with no change here — the one-line request is in the report. Lines without a verb
  // would also be lines without an audio bake, which is what .speechcheck fails on.
  { hz:'维修工', name:'高师傅', py:'Gāo shīfu', place:'mall', mallFloor:3,
    rig:'mall-arcade-tech-gao-shifu', temper:'patient',
    look:{skin:'#c08a60',hair:'#241d19',hairStyle:'buzz',top:'#2f4a3c',pants:'#33383f',
      shoe:'#23282c',collar:'shirt',tall:1.04,wide:1.03,faceSeed:8316},
    spots:[{h0:10,h1:23,at:[-8.75,-16.00],face:-Math.PI/2,act:'work'}] },

  { hz:'顾客', place:'mall', mallFloor:3, temper:'eager',
    look:{skin:'#e1b18a',hair:'#2b2320',hairStyle:'ponytail',top:'#8a3f66',pants:'#414954',
      shoe:'#262b2e',collar:'crew',sleeve:'short',tall:.94,faceSeed:8312},
    spots:[{h0:10,h1:23,at:[-9.55,-14.75],face:Math.PI,act:'play',held:null}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'eager',
    look:{skin:'#c88f66',hair:'#1f1a18',hairStyle:'tousled',top:'#4b7c70',pants:'#383f49',
      shoe:'#ece4d6',collar:'polo',sleeve:'half',tall:.98,faceSeed:8313},
    spots:[{h0:10,h1:23,at:[-.90,-14.15],face:Math.PI,act:'play',held:null}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'patient',
    look:{skin:'#edbd96',hair:'#3a302a',hairStyle:'bob',top:'#d5bd75',pants:'#4a4852',
      shoe:'#2b3034',collar:'vneck',sleeve:'short',tall:.91,faceSeed:8314},
    spots:[{h0:10,h1:23,at:[1.65,-15.90],face:Math.PI/2,act:'play',held:null}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bored',
    look:{skin:'#b97f57',hair:'#211b18',hairStyle:'buzz',top:'#a85d45',pants:'#303845',
      shoe:'#20262b',collar:'crew',tall:1.06,wide:1.05,faceSeed:8315},
    spots:[{h0:10,h1:23,at:[-5.10,-14.70],face:Math.PI,act:'play',held:null}] }
);
