// 电影院 · 星光电影院 · STARLIGHT CINEMA — floor 3
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box, sized in shop-local axes
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)  one of the eight the shader will look at
//   A.th(word,a,b,zh,en,note,reach,y)  something you can walk up to and do
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------- reading the argument list
// `put`'s third argument is the box's extent along **a** and its fourth is the extent along
// **b**, which is the opposite way round from what "w, dp" reads like and is worth stating once
// because every wrong prop in this room was a transposed pair. The shell's own back wall is
// `put(.16, 0, .10, len-.34, ...)` — ten centimetres of depth, seventeen metres of frontage.
//
// This unit is on the south side, so a larger `a` is *nearer* the concourse and nearer the eye:
// anything built at a bigger depth stands in front of what is behind it, and layers on a wall
// stack outward. Along the frontage, +b is west (towards 一号厅 and, on screen, to the left).
// A glyph's default facing is already the right way round here — it points towards growing `a`,
// which is out of the wall and into the room, and also out of the window and into the concourse.
//
// ---------------------------------------------------------------- what this room is
// A cinema foyer, not the auditorium — that is 一号厅, built by mall.js behind the west end.
// Four things make a foyer read as one rather than as another shop with posters in it:
//
//   * it is dark, and the light comes from the fittings. The shell hands every tenant a bright
//     ceiling plane, a perimeter cove, eighteen downlights and eight spots, which is right for a
//     bakery and wrong for this: a dropped soffit is hung under the lot so the room goes dark,
//     and the poster cases, the programme board, the popcorn warmer and the lit counter edges
//     are then the only things in it making light.
//   * the shell's finishes have to go with it. A cinema is not a white box with a slatted timber
//     feature wall in the middle of it — that wall is the brightest surface in this unit and it
//     reads as a sauna. The back wall and both party walls are lined out dark, edge to edge, and
//     the lining is then the elevation everything else is set out on.
//   * the two counters are the room. A box office with four glazed positions and the day's
//     programme lit above them, and a concession bar with a warmer, a fountain and a chiller.
//   * the floor is patterned. A cinema carpet is the loudest thing in the building and it is
//     what tells you, standing in the doorway, which kind of room you have walked into.
//
// ---------------------------------------------------------------- materials, and what they cost
// The shader does `base *= mix(1.0, texel/0.22, matAmt)` and almost no texture averages 0.22, so
// a material is a brightener before it is a grain: `metal` turns black trim white, and `plaster`
// and `fabric` lift a colour by well over two. Rather than pick every colour a shade darker to
// cancel that — a correction that has to be unwound the day the shader is fixed — this room
// simply does not use the loud ones. `steel` measures about 1.03 and leaves a colour where it
// was put, so it is what all the joinery, the lining and the soffit wear. The two places a
// different weave is genuinely needed (the carpet and the velvet) are the only ones that are not
// steel, and they hold the only two colours in the file chosen against a material rather than
// for themselves.
//
// `nrmAmt` is .30 wherever a normal map applies. Its default of 1 is the whole relief of a
// photograph applied to a primitive that has none, and on a large flat panel that is not texture,
// it is a grey cloud. Nothing emissive (`mode:1`) is ever materialled at all: a lit sheet is
// meant to be flat and even, and a grain on it reads as dirt.

// ====================================================================================
// MotionSafety — one gate for every flashing thing in the building
// ====================================================================================
// The arcade and the atrium light show are both flashing-light content and both of them need the
// same answer, so there is one answer and not two.
//
// **This is deliberately not a new setting.** The game already has exactly one settings object —
// `SET` in js/game.js, persisted under `bjlife.settings.v1` and published on `window.__game.SET` —
// and index.html already honours the OS `prefers-reduced-motion` for its CSS. Inventing a second
// store would give a player two switches that disagree. So this reads, in order:
//
//   1. `__game.SET.motion` — the key the pause panel should own. It does not exist yet; UPGRADES.md
//      lists "High-contrast / reduced-motion mode" as outstanding and this is the hook for it. The
//      moment the lead adds `motion:'reduced'|'full'` to SET and a row in the settings panel, every
//      flashing surface in the mall follows it with no further work. See the report.
//   2. the same localStorage key, read directly, for the window before game.js has published SET.
//   3. the OS media query, which is what the game already trusts in CSS.
//
// The second half of this is the one that matters even with reduced motion *off*: `CAP` is a hard
// ceiling of 2.4 flashes per second on anything that blinks. The photosensitivity guidance is three
// per second, and the arcade's dance pad was running its chase at `Math.floor(t*3.2)` — 3.2 Hz,
// over the line, in the darkest room in the building. Everything that steps or strobes now goes
// through `step`/`pulse` and physically cannot exceed the cap.
window.MotionSafety = window.MotionSafety || (function () {
  const KEY = 'bjlife.settings.v1';
  const mq = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const CAP = 2.4;                       // flashes per second, hard ceiling
  let cacheAt = -1e9, cached = false;

  // `null` means "follow the operating system". In particular, `auto` is not the same thing as
  // `full`: the old truthiness test returned false for both and silently ignored an OS reduced-
  // motion preference whenever game.js had published its default setting.
  const choice = v => v === true || v === 'reduced' || v === 'reduce' || v === 'on' ? true
    : v === false || v === 'full' || v === 'off' ? false : null;
  function read() {
    const g = window.__game;
    if (g && g.SET && g.SET.motion !== undefined) {
      const selected = choice(g.SET.motion);
      return selected === null ? !!(mq && mq.matches) : selected;
    }
    try {
      const s = JSON.parse(localStorage.getItem(KEY)) || {};
      if (s.motion !== undefined) {
        const selected = choice(s.motion);
        return selected === null ? !!(mq && mq.matches) : selected;
      }
    } catch (e) { /* storage blocked; the media query still answers */ }
    return !!(mq && mq.matches);
  }
  // Polled rather than pushed, because the settings object is a plain object with no change event
  // and a motion callback asks this question sixty times a second. 400 ms is faster than anybody
  // can flip a switch and read the room, and costs one JSON parse every few hundred frames at worst.
  function reduced() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - cacheAt > 400) { cached = read(); cacheAt = now; }
    return cached;
  }
  function invalidate() { cacheAt = -1e9; }
  if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', invalidate);
  const rate = h => reduced() ? 0 : Math.min(Math.abs(h) || 0, CAP);
  return {
    reduced, invalidate, cap: CAP, rate,
    // A value that oscillates only when it is allowed to. Returns `lo` flat under reduced motion,
    // which is why every caller passes the *resting* value as `lo` rather than the average.
    pulse(t, hz, lo, hi) {
      const r = rate(hz);
      return r ? lo + (hi - lo) * (.5 + .5 * Math.sin(t * r * Math.PI * 2)) : lo;
    },
    // A stepped chase over `n` positions. -1 means "hold still", so a caller can light a resting
    // frame rather than freezing on whichever step it happened to be on.
    step(t, hz, n) {
      const r = rate(hz);
      return r ? Math.floor(t * r) % Math.max(1, n) : -1;
    },
    // A travelling head in 0..1, for chases that sweep rather than blink. Sweeps are not flashes,
    // so they are not capped — but they still stop dead under reduced motion.
    sweep(t, hz) { return reduced() ? -1 : (t * hz) % 1; },
  };
})();

// ====================================================================================
// CinemaSys — everything the box office knows
// ====================================================================================
// The fit-out below builds the foyer. This builds the cinema: three auditoriums, a day's programme
// across all three, who is already sitting in each seat, what a ticket costs you in particular,
// and what happens if you turn up eleven minutes late.
//
// It lives in this file rather than in js/game.js for the same reason the fit-out and the cast do:
// one owner per file. game.js keeps `openCinema` and `cinemaTicket`; this module is what they
// should call. The wiring is four lines and it is written out in the report — nothing here edits,
// patches or monkeys with game.js, and nothing here throws if game.js has not been wired yet.
//
// ---------------------------------------------------------------- the money is not ours
// `money`, `toast`, `logDiary`, `advanceTime`, `needs` and `Pick` are all `const` inside game.js's
// IIFE and are unreachable by name from here. Everything this module needs from the game therefore
// goes through one seam, `H`, which prefers a host object the lead may hand us (`CinemaSys.bind`)
// and otherwise falls back to `window.__game`, which publishes enough to run the whole flow. If
// neither is there — a harness that loaded the file alone, say — every accessor answers safely and
// the pure logic below is still testable.
window.CinemaSys = (function () {

  // ---------------------------------------------------------------- prices, in one place
  // 45 full, and the PA has been promising 学生凭证件半价 — students half price with ID — since the
  // adverts were written (js/mall.js, 'ad:cinema'). Half of 45 is 22.5, and no box office in the
  // country prints a half-jiao ticket, so it rounds to 23 the way a real one does.
  const FULL = 45;
  const PRICE = {
    full:    { hz:'全票',   py:'quánpiào',      en:'full price',           yuan: FULL },
    student: { hz:'学生票', py:'xuéshēng piào', en:'student, half price',  yuan: Math.ceil(FULL / 2) },
    member:  { hz:'会员票', py:'huìyuán piào',  en:'member price',         yuan: 36 },
  };
  // One immutable commerce contract owns the physical card as well as the tier picker.  The
  // headline is a conditional promise (学生), while the changing second line says whether the
  // required ID is actually on file.  Stable state objects matter here: the foyer can poll the
  // getter without allocating strings or rebuilding glyphs at display rate.
  const STUDENT_OFFER = Object.freeze({
    id:'student-half-price', tenant:'星光电影院', tier:'student', fullTier:'full',
    fullYuan:FULL, offerYuan:PRICE.student.yuan, requires:'学生证',
    card:Object.freeze({
      headline:`学生半价¥${PRICE.student.yuan}`,
      required:'需学生证',
      eligible:'证件已登记',
    }),
  });
  const STUDENT_OFFER_STATES = Object.freeze({
    required:Object.freeze({
      id:STUDENT_OFFER.id, key:'id-required', available:false,
      fullYuan:STUDENT_OFFER.fullYuan, offerYuan:STUDENT_OFFER.offerYuan,
      headline:STUDENT_OFFER.card.headline, detail:STUDENT_OFFER.card.required,
    }),
    eligible:Object.freeze({
      id:STUDENT_OFFER.id, key:'eligible', available:true,
      fullYuan:STUDENT_OFFER.fullYuan, offerYuan:STUDENT_OFFER.offerYuan,
      headline:STUDENT_OFFER.card.headline, detail:STUDENT_OFFER.card.eligible,
    }),
  });
  const MEMBER_FEE = 60;     // 办会员卡 — what the card costs to take out
  const GLASSES    = 10;     // 3D 眼镜, bought once and kept
  const POINTS_FREE = 200;   // 积分 needed for a free ticket

  // ---------------------------------------------------------------- before the film
  // A screening's clock time is when the lights go down, not when the film starts. Five minutes of
  // adverts and four of trailers is what a Beijing multiplex actually runs, and it is the whole
  // reason 迟到 is survivable: turn up eight minutes late and you have missed nothing at all.
  const ADVERTS = 5, TRAILERS = 4, PRE = ADVERTS + TRAILERS;
  // The usher will still show you in this long after the *feature* has started, with a torch.
  const LATE_ENTRY = 20;

  // ---------------------------------------------------------------- what is on
  // Six invented films. Nothing in this building is a real title, a real studio or a real brand,
  // and these six are the same six the fit-out's poster cases and mall.js's own FILMS table use —
  // one programme, three places it is written down.
  const FILMS = [
    { id:0, hz:'海上明月', py:'Hǎishàng Míngyuè', en:'Moon Over the Sea',
      note:'海上 on the sea + 明月 bright moon', mins:112, cert:'全年龄', kind:'文艺片' },
    { id:1, hz:'星海列车', py:'Xīnghǎi Lièchē',   en:'The Star-Sea Train',
      note:'星海 sea of stars + 列车 train',      mins:126, cert:'全年龄', kind:'科幻片' },
    { id:2, hz:'雪山信使', py:'Xuěshān Xìnshǐ',   en:'The Snow-Mountain Courier',
      note:'雪山 snow mountain + 信使 messenger',  mins: 98, cert:'全年龄', kind:'剧情片' },
    { id:3, hz:'北门胡同', py:'Běimén Hútòng',    en:'North Gate Lane',
      note:'北门 north gate + 胡同 lane',         mins:104, cert:'全年龄', kind:'喜剧片' },
    { id:4, hz:'长夜灯火', py:'Chángyè Dēnghuǒ',  en:'Lights Through the Long Night',
      note:'长夜 long night + 灯火 lamplight',    mins:131, cert:'建议家长陪同', kind:'悬疑片' },
    { id:5, hz:'风筝与海', py:'Fēngzheng Yǔ Hǎi', en:'The Kite and the Sea',
      note:'风筝 kite + 与 and + 海 sea',         mins: 94, cert:'全年龄', kind:'动画片' },
  ];
  const filmOf = i => FILMS[((i % FILMS.length) + FILMS.length) % FILMS.length];

  // ---------------------------------------------------------------- the three houses
  // `aisle` is the seat number the gangway runs *after*, which is what makes the map read as a
  // room rather than as a grid: a block, a gap, a block. `back` is how many rows from the screen
  // are counted as 后排 — the ones people actually ask for.
  //
  // 一号厅 is the one the fit-out builds doors to and the one mall.js already seats you in, so its
  // shape is the shape that file assumes: rows numbered from the screen, seats from the west.
  const HALLS = [
    { id:1, hz:'一号厅', py:'yī hào tīng',  en:'screen one',   rows:8, seats:12, aisle:6, d3:false,
      note:'一 one + 号 number + 厅 hall' },
    { id:2, hz:'二号厅', py:'èr hào tīng',  en:'screen two',   rows:6, seats:10, aisle:5, d3:false,
      note:'二 two + 号 number + 厅 hall' },
    { id:3, hz:'三号厅', py:'sān hào tīng', en:'screen three · 3D', rows:5, seats:9, aisle:5, d3:true,
      note:'三 three + 号 number + 厅 hall — 这个厅只放 3D' },
  ];
  const hallOf = id => HALLS.find(h => h.id === id) || HALLS[0];

  // The day's start times, per house. 一号厅's eight are mall.js's own SHOWS to the minute, so the
  // board on the foyer wall, the picker and the lamp that follows the clock cannot disagree; the
  // other two are interleaved between them, which is how a three-screen cinema staggers its lets.
  const TIMES = {
    1: [10*60+15, 11*60+50, 13*60+30, 15*60+10, 16*60+50, 18*60+30, 20*60+10, 21*60+50],
    2: [10*60+40, 12*60+35, 14*60+30, 16*60+25, 18*60+20, 20*60+15, 22*60+10],
    3: [11*60+20, 14*60+ 0, 16*60+40, 19*60+20, 22*60+ 0],
  };

  // ---------------------------------------------------------------- who is already sitting there
  // A 32-bit integer hash, so the same day gives the same house every time it is asked and a reload
  // does not re-sell the seat you are sitting in. Nothing random is stored: the whole seating plan
  // for a fortnight is four multiplications.
  function hash(...n) {
    let h = 0x811c9dc5 >>> 0;
    for (const v of n) {
      h = (h ^ ((v | 0) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
      h = (h ^ (((v | 0) >> 16) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  const frac = (...n) => hash(...n) / 4294967296;

  // How full a screening is. Evenings fill, mornings do not, the weekend fills harder, and roughly
  // one screening in eleven is 满座 — sold out — which is the thing that makes a programme a choice
  // rather than a list. Deterministic on (day, hall, time).
  function occupancy(day, hall, at) {
    const f = frac(day, hall, at, 17);
    const evening = at >= 18 * 60 ? .26 : at >= 15 * 60 ? .12 : 0;
    const weekend = (day % 7 === 6 || day % 7 === 0) ? .16 : 0;
    if (frac(day, hall, at, 91) < .09) return 1;          // 满座
    return Math.min(.97, .16 + f * .46 + evening + weekend);
  }
  // Which seats those are. Middle-of-the-room seats go first, exactly as they do in life, so a
  // half-full house leaves you the front row and the two ends and the map shows you that.
  function taken(day, hall, at) {
    const H = hallOf(hall), occ = occupancy(day, hall, at), set = new Set();
    if (occ >= 1) { for (let r = 1; r <= H.rows; r++) for (let c = 1; c <= H.seats; c++) set.add(r * 100 + c); return set; }
    const midR = (H.rows + 1) / 2, midC = (H.seats + 1) / 2;
    for (let r = 1; r <= H.rows; r++) for (let c = 1; c <= H.seats; c++) {
      // 0 at the dead centre, 1 at the worst corner. Front rows are worse than back rows, so the
      // row term is signed rather than absolute.
      const dr = Math.abs(r - midR) / midR, dc = Math.abs(c - midC) / midC;
      const front = r < midR ? .28 : 0;
      const want = 1 - Math.min(1, dr * .55 + dc * .55 + front);
      if (frac(day, hall, at, r * 31 + c) < occ * (.45 + want * .95)) set.add(r * 100 + c);
    }
    return set;
  }
  const seatHz = (r, c) => `${r}排${c}座`;
  const seatPy = (r, c) => `${r} pái ${c} zuò`;

  // ---------------------------------------------------------------- a screening
  // `id` is stable across a day and is what a ticket remembers, so a save can name a screening
  // without storing the whole row.
  function showing(day, hall, at, i) {
    const H = hallOf(hall);
    // Every house runs the same six films on a rotation offset per screen, so all three are showing
    // something different at any hour and the whole programme is six films rather than eighteen.
    const f = filmOf(i + (hall - 1) * 2);
    const tk = taken(day, hall, at);
    const free = H.rows * H.seats - tk.size;
    return {
      id: `${hall}:${at}`, day, hall, at, hallHz: H.hz, hallPy: H.py, hallEn: H.en,
      film: f, d3: H.d3, mins: f.mins,
      clock: `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`,
      taken: tk, free, sold: free <= 0,
      // Every one of these is a *minute of the day*, so a caller never has to redo the arithmetic.
      featureAt: at + PRE, endsAt: at + PRE + f.mins, lastEntry: at + PRE + LATE_ENTRY,
    };
  }
  function programme(day) {
    const out = [];
    for (const H of HALLS) TIMES[H.id].forEach((at, i) => out.push(showing(day, H.id, at, i)));
    return out.sort((a, b) => a.at - b.at || a.hall - b.hall);
  }
  const showById = (day, id) => programme(day).find(s => s.id === id) || null;

  // ---------------------------------------------------------------- what the clock says about it
  // One function, six answers, and every panel and the door all read it rather than each doing the
  // subtraction its own way. This is the piece that was worth writing down: "already started" is
  // three different facts — the adverts are on, the film is on and you may still creep in, the film
  // is on and you may not — and a cinema treats them as three different sentences.
  function phase(show, minutes) {
    if (minutes < show.at - 25)        return 'soon';
    if (minutes < show.at)             return 'seating';   // doors open, come in
    if (minutes < show.at + ADVERTS)   return 'adverts';   // 广告
    if (minutes < show.featureAt)      return 'trailers';  // 预告片
    if (minutes < show.lastEntry)      return 'late';      // the feature is on; the usher has a torch
    if (minutes < show.endsAt)         return 'running';
    return 'ended';
  }
  const PHASE = {
    soon:     { hz:'未开场',   py:'wèi kāichǎng',  en:'not open yet' },
    seating:  { hz:'可入场',   py:'kě rùchǎng',    en:'seating now' },
    adverts:  { hz:'广告中',   py:'guǎnggào zhōng',en:'adverts are running' },
    trailers: { hz:'预告片',   py:'yùgàopiàn',     en:'trailers are running' },
    late:     { hz:'已开演',   py:'yǐ kāiyǎn',     en:'the film has started' },
    running:  { hz:'放映中',   py:'fàngyìng zhōng',en:'showing — no late entry' },
    ended:    { hz:'已散场',   py:'yǐ sànchǎng',   en:'finished' },
  };
  // Sellable while the trailers are still on: a real box office will take your money right up to
  // the feature and tell you to hurry. After that the row greys out and says why.
  const sellable = (show, minutes) => !show.sold &&
    ['soon', 'seating', 'adverts', 'trailers'].includes(phase(show, minutes));

  // ---------------------------------------------------------------- state that outlives the visit
  // Everything here belongs in the save. The exact shape and where it should hang is in the report;
  // `toSave`/`load` are what the lead calls, and they are strict about what they will read back so a
  // hand-edited or half-written save cannot put the box office into a state it has no panel for.
  function fresh() {
    return {
      member:false, memberDay:0, points:0,     // 会员卡 and its 积分
      student:false,                           // a 学生证 has been shown and is on file
      glasses:false,                           // owns a pair of 3D 眼镜 rather than renting each time
      freeNext:false,                          // 积分 cashed in for one free ticket
      ticket:null,                             // the one in your pocket, below
      seen:[],                                 // film ids watched, for 「这部我看过了」
      spend:0, visits:0,
    };
  }
  const state = fresh();

  // The ticket. Deliberately fuller than game.js's `cinemaTicket`, and deliberately carrying `day`:
  // a ticket for yesterday's 20:10 is not a ticket, and the door has to be able to say so.
  //  { day, id, hall, at, clock, filmId, seat:[row,num], seatHz, tier, paid, d3, glasses, torn }

  // ---------------------------------------------------------------- the seam to the game
  let host = null;
  const G = () => window.__game || null;
  const H = {
    money() {
      if (host && host.money) return host.money();
      const g = G(); if (!g) return 0;
      // `state()` builds a large object; this is only ever called on a click, never per frame.
      try { return Math.floor(g.state().money) || 0; } catch (e) { return 0; }
    },
    spend(n) {
      if (host && host.spend) return host.spend(n);
      const g = G(); if (!g || !g.setMoney) return;
      g.setMoney(Math.max(0, H.money() - n));
    },
    minutes() {
      if (host && host.minutes) return host.minutes();
      const g = G(); try { return g ? g.state().minutes | 0 : 14 * 60; } catch (e) { return 14 * 60; }
    },
    day() {
      if (host && host.day) return host.day();
      const g = G(); try { return g ? g.state().day | 0 : 1; } catch (e) { return 1; }
    },
    bought() {
      if (host && host.bought) return host.bought();
      const g = G(); try { return g ? (g.state().bought || []) : []; } catch (e) { return []; }
    },
    tester() { const g = G(); return !!(g && g.SET && g.SET.tester); },
    Pick() { return (host && host.Pick) || (G() && G().Pick) || null; },
    // game.js's `toast` is not on `__game`. It is four lines and one element, so rather than ask for
    // an export this writes the same element the same way. If the lead does export it, `bind` takes
    // it and this is never reached.
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
    mood(n) {
      const g = G(); if (!g || !g.needs) return;
      g.needs.mood = Math.max(0, Math.min(100, g.needs.mood + n));
    },
  };

  // ---------------------------------------------------------------- who you are at this window
  // 学生凭证件半价 is a promise the building has been making over the loudspeaker and never keeping.
  // Keeping it needs one fact the game does not currently record anywhere: whether you are carrying
  // a 学生证. So the rule is written here, in full, against the only three places that fact could
  // come from, and the box office says out loud which one is missing — see the report, where the
  // 学生证 item at the campus is the one piece of this that is not in my two files.
  function hasStudentId() {
    if (state.student) return true;                       // shown once, kept on file
    if (H.bought().includes('学生证')) return true;        // carrying one
    return H.tester();                                    // and the tester's wallet carries everything
  }
  function offerContract(id = STUDENT_OFFER.id) {
    return id === STUDENT_OFFER.id ? STUDENT_OFFER : null;
  }
  function offerState(id = STUDENT_OFFER.id) {
    if (id !== STUDENT_OFFER.id) return null;
    return hasStudentId() ? STUDENT_OFFER_STATES.eligible : STUDENT_OFFER_STATES.required;
  }
  function tiers(show) {
    const studentOffer = offerState();
    const list = [{ ...PRICE.full, key:'full', ok:true }];
    list.push({ ...PRICE.student, key:'student', ok: studentOffer.available,
      why: studentOffer.available ? '' : '要出示学生证 · you need a student card' });
    list.push({ ...PRICE.member, key:'member', ok: state.member,
      why: state.member ? '' : '要先办会员卡 · members only' });
    return list;
  }
  // The whole bill, in one place, so the picker, the confirm and the diary line cannot disagree
  // about what a 3D ticket with a pair of glasses on it came to.
  function bill(show, tierKey) {
    const t = PRICE[tierKey] || PRICE.full;
    const free = state.freeNext;
    const seat = free ? 0 : t.yuan;
    const glass = show.d3 && !state.glasses ? GLASSES : 0;
    return { tier:tierKey, seat, glass, total: seat + glass, free,
             // 积分: one point per yuan actually paid, and a free ticket earns none.
             points: seat };
  }

  // ====================================================================================
  // the panels
  // ====================================================================================
  // Everything below draws through the game's own chooser (`Pick`), for three reasons: it is
  // already keyboard-navigable and already announced, a second overlay would have to re-solve the
  // focus trap, and every other counter in this game looks like this. `Pick` writes `r.hz` into the
  // row as HTML, which is what makes a seat map possible without a new surface.
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  // A row of seats, drawn. Monospaced and letter-spaced so the columns line up under each other
  // down the whole map, with the gangway as a real gap.
  //   □ free   ■ taken   ◆ the one being offered
  const MAP_STYLE = 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.10em;font-size:15px';
  function drawRow(hall, tk, r, pick) {
    let s = '';
    for (let c = 1; c <= hall.seats; c++) {
      if (c === hall.aisle + 1) s += ' ';                 // the gangway
      s += pick === c ? '◆' : tk.has(r * 100 + c) ? '■' : '□';
    }
    return `<span style="${MAP_STYLE}">${s}</span>`;
  }

  // ---------------------------------------------------------------- 1. the box office
  function openBoxOffice() {
    const P = H.Pick(); if (!P) return;
    const day = H.day(), now = H.minutes(), shows = programme(day);
    const t = state.ticket;
    const rows = [];
    rows.push({ sec:'今日排片 · jīnrì páipiàn', en:'today’s programme — three screens' });
    let lastHall = null;
    for (const s of shows) {
      const ph = phase(s, now), can = sellable(s, now);
      const st = PHASE[ph];
      const right = s.sold ? '满座'
        : can ? `¥${bill(s, cheapestTier(s)).total}`
        : st.hz;
      rows.push({
        show: s.id,
        hz: `${s.clock}　${esc(s.film.hz)}${s.d3 ? '　<span style="opacity:.8">3D</span>' : ''}`,
        py: `${s.film.py} · ${s.hallHz}`,
        en: s.sold ? `${s.film.en} — sold out · 满座`
          : can ? `${s.film.en} · ${s.hallEn} · ${s.free} seats free`
          : `${s.film.en} · ${st.en}`,
        right, off: !can,
      });
      lastHall = s.hall;
    }
    rows.push({ sec:'柜台 · guìtái', en:'at the counter' });
    rows.push({ member:true, hz:'会员卡', py:'huìyuán kǎ', en: state.member
      ? `member · ${state.points} 积分${state.freeNext ? ' · one free ticket waiting' : ''}`
      : `join — ¥${MEMBER_FEE}, then ¥${PRICE.member.yuan} a ticket`,
      right: state.member ? `${state.points}分` : `¥${MEMBER_FEE}` });
    rows.push({ glasses:true, hz:'3D眼镜', py:'sān-D yǎnjìng', en: state.glasses
      ? 'you have your own pair — 3D shows cost no extra'
      : `buy a pair and keep them — saves ¥${GLASSES} on every 3D show`,
      right: state.glasses ? '有' : `¥${GLASSES}` });
    if (t) rows.push({ mine:true, hz:'我的票', py:'wǒ de piào', en: ticketLine(t),
      right: t.day === day ? '今天' : '过期' });

    P.show({
      title:'星光电影院 · 售票处',
      sub:`¥${H.money()} 在身上 · ${state.member ? '会员' : '非会员'}` +
          `${hasStudentId() ? ' · 学生证已登记' : ''} · pick a screening`,
      rows,
      onPick(r) {
        if (r.member)  { openMembership(); return false; }
        if (r.glasses) { buyGlasses(); return false; }
        if (r.mine)    { showTicket(); return false; }
        const s = shows.find(q => q.id === r.show);
        if (!s) return false;
        if (s.sold) { H.say('这场满座了 · <span class="dim">满座 mǎnzuò — that one is sold out</span>'); return false; }
        if (!sellable(s, now)) {
          H.say(`那场已经开演了 · <span class="dim">${PHASE[phase(s, now)].en} — pick a later showing</span>`);
          return false;
        }
        openTierPick(s); return false;
      },
    });
  }
  // The cheapest tier you are actually entitled to, which is what the programme row quotes. Quoting
  // the full price to a member with a card in their pocket is how a menu lies.
  function cheapestTier(show) {
    if (state.member) return 'member';
    if (hasStudentId()) return 'student';
    return 'full';
  }

  // ---------------------------------------------------------------- 2. which ticket
  function openTierPick(show) {
    const P = H.Pick(); if (!P) return;
    const glass = show.d3 && !state.glasses;
    const rows = tiers(show).map(t => {
      const b = bill(show, t.key);
      return { tier:t.key, hz:t.hz, py:t.py,
        en: t.ok ? (b.free ? `${t.en} — 积分换票, free` : t.en) + (glass ? ` + 眼镜 ¥${GLASSES}` : '')
                 : t.why,
        right: t.ok ? `¥${b.total}` : '不可',
        off: !t.ok || H.money() < b.total };
    });
    rows.unshift({ sec:`${show.clock}　${esc(show.film.hz)}　${show.hallHz}`,
      en:`${show.film.en} · ${show.film.py} · ${show.film.mins} min · ${show.film.cert}` });
    rows.push({ sec:'开场以前 · kāichǎng yǐqián', en:'before the film' });
    rows.push({ off:true, hz:'广告 · 预告片', py:'guǎnggào · yùgàopiàn',
      en:`${ADVERTS} min of adverts then ${TRAILERS} of trailers — the film itself starts at ` +
         `${clockOf(show.featureAt)}`, right:`${PRE}分钟` });
    P.show({
      title:`${show.hallHz} · ${show.film.hz}${show.d3 ? ' · 3D' : ''}`,
      sub:`${show.clock} 开场 · ${show.free} 个空位 · ¥${H.money()} 在身上`,
      rows,
      onPick(r) { if (!r.tier) return false; openSeatMap(show, r.tier); return false; },
    });
  }

  // ---------------------------------------------------------------- 3. the seat map
  // The thing this cinema did not have. Eight rows of twelve drawn as characters, the taken seats
  // filled in, the gangway as a gap and the screen written across the top of it — pick a row, then
  // pick a seat in it, and the second panel redraws the row with your seat picked out so you can
  // see where you are sitting before you pay for it.
  function openSeatMap(show, tier) {
    const P = H.Pick(); if (!P) return;
    const hall = hallOf(show.hall), tk = show.taken;
    const rows = [{ sec:`<span style="${MAP_STYLE}">${'━'.repeat(Math.max(6, hall.seats))}</span>　银幕`,
                    en:'yínmù — the screen is this way' }];
    for (let r = 1; r <= hall.rows; r++) {
      let free = 0;
      for (let c = 1; c <= hall.seats; c++) if (!tk.has(r * 100 + c)) free++;
      rows.push({ row:r,
        hz:`${drawRow(hall, tk, r, 0)}`,
        py:`${r}排 · ${r} pái`,
        en: free ? `row ${r} — ${free} free` : `row ${r} — 满 full`,
        right: free ? `${free}个` : '满', off: !free });
    }
    rows.push({ sec:'□ 空位　■ 已售', en:'kòngwèi free · yǐshòu taken — pick a row' });
    P.show({
      title:`${show.hallHz} · 选座位`,
      sub:`${show.clock} ${show.film.hz} · xuǎn zuòwèi — choose a seat`,
      rows,
      onPick(r) { if (!r.row) return false; openSeatInRow(show, tier, r.row); return false; },
    });
  }
  function openSeatInRow(show, tier, r) {
    const P = H.Pick(); if (!P) return;
    const hall = hallOf(show.hall), tk = show.taken, b = bill(show, tier);
    const rows = [];
    for (let c = 1; c <= hall.seats; c++) {
      const busy = tk.has(r * 100 + c);
      rows.push({ seat:c, off:busy,
        hz: drawRow(hall, tk, r, busy ? 0 : c),
        py: seatPy(r, c),
        en: busy ? `${seatHz(r, c)} — 已售 taken`
          : `${seatHz(r, c)}${c <= hall.aisle ? ' · 靠西边 west block' : ' · 靠东边 east block'}`,
        right: busy ? '已售' : `¥${b.total}` });
    }
    rows.unshift({ sec:`第 ${r} 排 · dì ${r} pái`, en:`row ${r} — ◆ is the seat you are taking` });
    P.show({
      title:`${show.hallHz} · ${r}排`,
      sub:`${show.clock} ${show.film.hz} · ¥${b.total}${b.glass ? `（含眼镜 ¥${b.glass}）` : ''}`,
      rows,
      onPick(row) { if (!row.seat) return false; return buy(show, tier, r, row.seat); },
    });
  }

  // ---------------------------------------------------------------- 4. the money
  function buy(show, tier, r, c) {
    const now = H.minutes(), day = H.day();
    if (!sellable(show, now)) {
      H.say(`那场已经开演了 · <span class="dim">${PHASE[phase(show, now)].en}</span>`); return false;
    }
    if (show.taken.has(r * 100 + c)) {
      H.say('这个座位卖掉了 · <span class="dim">that one has gone — pick another</span>'); return false;
    }
    const b = bill(show, tier);
    if (H.money() < b.total) {
      H.say(`钱不够 · <span class="dim">¥${b.total} needed; you have ¥${H.money()}</span>`); return false;
    }
    if (b.total) H.spend(b.total);
    if (b.free) state.freeNext = false;
    if (b.glass) state.glasses = true;                 // a bought pair is kept, not rented
    if (state.member) state.points += b.points;
    state.spend += b.total; state.visits++;
    if (state.member && state.points >= POINTS_FREE && !state.freeNext) {
      state.points -= POINTS_FREE; state.freeNext = true;
      H.say(`积分够了 · <span class="dim">${POINTS_FREE} points — your next ticket is free</span>`);
    }
    state.ticket = { day, id:show.id, hall:show.hall, at:show.at, clock:show.clock,
      filmId:show.film.id, seat:[r, c], seatHz:seatHz(r, c), tier, paid:b.total,
      d3:show.d3, glasses:state.glasses, torn:false };
    const tn = PRICE[tier];
    H.say(`${show.clock}《${esc(show.film.hz)}》· <span class="dim">${show.hallHz} ${seatHz(r, c)} · ` +
          `${tn.hz} ¥${b.total} · 正片 ${clockOf(show.featureAt)}</span>`);
    H.sentence(`我的座位是${seatHz(r, c)}。`);
    H.diary(`买了${show.clock}《${show.film.hz}》的票，${show.hallHz}${seatHz(r, c)}，${b.total}块。`,
      `Bought a ticket for ${show.film.en} at ${show.clock} — ${show.hallHz}, ${seatHz(r, c)}, ¥${b.total}.`,
      'cinematicket');
    H.save();
    return true;
  }

  // ---------------------------------------------------------------- 5. membership
  function openMembership() {
    const P = H.Pick(); if (!P) return;
    const rows = [];
    if (!state.member) {
      rows.push({ join:true, hz:'办会员卡', py:'bàn huìyuán kǎ', en:`take out a membership — ¥${MEMBER_FEE}`,
        right:`¥${MEMBER_FEE}`, off:H.money() < MEMBER_FEE });
      rows.push({ off:true, hz:'会员票价', py:'huìyuán piàojià',
        en:`members pay ¥${PRICE.member.yuan} instead of ¥${FULL}, and earn 积分`, right:`¥${PRICE.member.yuan}` });
    } else {
      rows.push({ off:true, hz:'积分', py:'jīfēn', en:`${state.points} points — ${POINTS_FREE} buys a free ticket`,
        right:`${state.points}分` });
      rows.push({ off:true, hz:'会员票价', py:'huìyuán piàojià', en:'what you pay per ticket',
        right:`¥${PRICE.member.yuan}` });
      if (state.freeNext) rows.push({ off:true, hz:'免费票', py:'miǎnfèi piào',
        en:'one free ticket is waiting — it comes off your next booking', right:'待用' });
    }
    rows.push({ sec:'学生 · xuésheng', en:'the half-price concession the loudspeaker keeps promising' });
    rows.push({ off:true, hz:'学生票', py:'xuéshēng piào',
      en: hasStudentId()
        ? `on file — you pay ¥${PRICE.student.yuan}, half of ¥${FULL}`
        : '学生凭证件半价 — half price on production of a student card',
      right: hasStudentId() ? '已登记' : `¥${PRICE.student.yuan}` });
    if (!hasStudentId()) rows.push({ show:true, hz:'出示学生证', py:'chūshì xuéshēng zhèng',
      en:'show your student card — 何雅琴 will put it on file', right:'出示' });
    P.show({
      title:'售票处 · 会员与优惠',
      sub:`何雅琴 · ¥${H.money()} 在身上 · membership and concessions`,
      rows,
      onPick(r) {
        if (r.join) {
          if (H.money() < MEMBER_FEE) { H.say(`钱不够 · <span class="dim">the card is ¥${MEMBER_FEE}</span>`); return false; }
          H.spend(MEMBER_FEE); state.member = true; state.memberDay = H.day();
          H.say(`办好了 · <span class="dim">member — tickets are ¥${PRICE.member.yuan} from now on</span>`);
          H.sentence('我办了一张会员卡。');
          H.diary('在星光电影院办了会员卡，以后票价便宜。',
            'Took out a membership at the Starlight — cheaper tickets from now on.', 'cinemamember');
          H.save(); return true;
        }
        if (r.show) {
          if (!hasStudentId()) {
            H.say('没带学生证 · <span class="dim">méi dài — student rate needs a card. ' +
                  'There is nowhere to get one yet</span>');
            return false;
          }
          state.student = true;
          H.say(`登记好了 · <span class="dim">student rate on file — ¥${PRICE.student.yuan} a ticket</span>`);
          H.save(); return true;
        }
        return false;
      },
    });
  }
  function buyGlasses() {
    if (state.glasses) { H.say('你已经有一副了 · <span class="dim">you have your own pair</span>'); return; }
    if (H.money() < GLASSES) { H.say(`钱不够 · <span class="dim">the glasses are ¥${GLASSES}</span>`); return; }
    H.spend(GLASSES); state.glasses = true;
    H.say('买了一副 3D 眼镜 · <span class="dim">yǎnjìng — keep them; 3D shows cost no extra now</span>');
    H.sentence('我买了一副 3D 眼镜。');
    H.save();
  }

  // ---------------------------------------------------------------- 6. the ticket in your pocket
  const clockOf = m => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  function ticketLine(t) {
    const f = filmOf(t.filmId), hall = hallOf(t.hall);
    return `${t.clock} ${f.en} · ${hall.en} · ${t.seatHz}${t.d3 ? ' · 3D' : ''}`;
  }
  function showTicket() {
    const P = H.Pick(); if (!P) return;
    const t = state.ticket;
    if (!t) { H.say('你没有票 · <span class="dim">no ticket — buy one at 售票处</span>'); return; }
    const day = H.day(), now = H.minutes(), s = showById(t.day, t.id) || showById(day, t.id);
    const ph = s ? phase(s, now) : 'ended', st = PHASE[ph];
    const stale = t.day !== day;
    P.show({
      title:'电影票 · diànyǐng piào',
      sub: stale ? '这张是昨天的 · this one is out of date' : `${st.hz} · ${st.en}`,
      rows:[
        { off:true, hz:filmOf(t.filmId).hz, py:filmOf(t.filmId).py, en:filmOf(t.filmId).en, right:t.clock },
        { off:true, hz:hallOf(t.hall).hz, py:hallOf(t.hall).py, en:hallOf(t.hall).en,
          right:t.d3 ? '3D' : '2D' },
        { off:true, hz:t.seatHz, py:seatPy(t.seat[0], t.seat[1]), en:'your seat', right:'座位' },
        { off:true, hz:PRICE[t.tier].hz, py:PRICE[t.tier].py, en:PRICE[t.tier].en, right:`¥${t.paid}` },
        { sec:'进场 · jìnchǎng', en:'getting in' },
        { off:true, hz:'正片开始', py:'zhèngpiàn kāishǐ',
          en: s ? `the film itself starts at ${clockOf(s.featureAt)} — ${PRE} min of adverts and trailers first`
                : 'that showing has gone', right: s ? clockOf(s.featureAt) : '—' },
        { off:true, hz:'最晚入场', py:'zuì wǎn rùchǎng',
          en: s ? `the usher will still seat you until ${clockOf(s.lastEntry)}` : '—',
          right: s ? clockOf(s.lastEntry) : '—' },
      ],
      onPick:()=>false,
    });
  }

  // ---------------------------------------------------------------- 7. the door
  // 郑师傅 at the podium. This is where late entry, 3D glasses and a ticket for the wrong house all
  // get answered, and it returns a decision rather than doing anything, so the same call can be made
  // by the door's USE row, by a harness, or by a panel.
  function doorCheck() {
    const t = state.ticket, day = H.day(), now = H.minutes();
    if (!t) return { ok:false, hz:'没有票', py:'méiyǒu piào', en:'you need a ticket first',
      say:'我还没买票。', sayTr:'I have not bought a ticket yet.' };
    if (t.day !== day) return { ok:false, hz:'过期了', py:'guòqī le', en:'that ticket was for another day',
      say:'这张票过期了。', sayTr:'This ticket is out of date.' };
    const s = showById(day, t.id);
    if (!s) return { ok:false, hz:'查无此场', py:'chá wú cǐ chǎng', en:'no such showing today',
      say:'今天没有这一场。', sayTr:'There is no such showing today.' };
    const ph = phase(s, now);
    if (ph === 'soon') return { ok:false, hz:'还没开场', py:'hái méi kāichǎng', show:s,
      en:`${s.hallHz} opens at ${clockOf(s.at - 25)} — ${Math.max(0, s.at - 25 - now)} min to wait`,
      say:'还没开场，我等一下。', sayTr:'Not open yet — I will wait.' };
    if (ph === 'running') return { ok:false, hz:'不能进场', py:'bù néng jìnchǎng', show:s,
      en:'more than twenty minutes in — the usher will not seat you now',
      say:'已经开演太久了，进不去了。', sayTr:'It started too long ago; I cannot go in.' };
    if (ph === 'ended') return { ok:false, hz:'散场了', py:'sànchǎng le', show:s,
      en:'that one has finished', say:'那场已经散场了。', sayTr:'That showing has finished.' };
    if (s.d3 && !state.glasses && !t.glasses) return { ok:false, hz:'要 3D 眼镜', py:'yào sān-D yǎnjìng',
      show:s, en:`this is a 3D screening — glasses are ¥${GLASSES} at the counter`,
      say:'我还没有 3D 眼镜。', sayTr:'I have not got 3D glasses yet.' };
    const late = ph === 'late';
    return { ok:true, late, show:s, hall:hallOf(t.hall), seat:t.seatHz,
      hz: late ? '迟到入场' : '检票', py: late ? 'chídào rùchǎng' : 'jiǎnpiào',
      en: late
        ? `${Math.round(now - s.featureAt)} min late — 郑师傅 shows you in with a torch, ${t.seatHz}`
        : `${PHASE[ph].en} — ${t.seatHz}, ${s.hallHz}`,
      // How long sitting through it actually takes from here: what is left of the adverts and
      // trailers plus the whole feature, or just what is left of the feature if you are late.
      mins: Math.max(5, Math.round(s.endsAt - Math.max(now, s.at))) };
  }
  // Tearing the ticket. Called when the player actually goes in.
  function tear() {
    const d = doorCheck();
    if (!d.ok) return d;
    state.ticket.torn = true;
    return d;
  }
  // And what happens when the film is over: the ticket is spent, the film is remembered.
  function watched() {
    const t = state.ticket; if (!t) return null;
    const f = filmOf(t.filmId);
    if (!state.seen.includes(f.id)) state.seen.push(f.id);
    state.ticket = null;
    H.mood(6);
    H.save();
    return f;
  }

  // ---------------------------------------------------------------- 8. what the foyer is doing
  // The one thing the fit-out needs from all of the above: how much of the building is walking out
  // right now. Every house lets out at its own minute, the crowd takes about four minutes to clear,
  // and the return is 0..1 so the fit can drive lights and bodies off one number.
  //   { k, hall, film }   k is 0 when nothing is letting out.
  const LETOUT = 4;
  function letOut(day, minutes) {
    let best = { k:0, hall:0, film:null };
    for (const s of programme(day)) {
      const dt = minutes - s.endsAt;
      if (dt < 0 || dt > LETOUT) continue;
      // In hard, out soft: a house empties fast then trickles.
      const k = dt < .6 ? dt / .6 : 1 - (dt - .6) / (LETOUT - .6);
      if (k > best.k) best = { k:Math.max(0, Math.min(1, k)), hall:s.hall, film:s.film };
    }
    return best;
  }
  // Which screening the board should be lighting, so the fit-out and the board agree.
  function nextShow(day, minutes) {
    let best = null, wait = 1e9;
    for (const s of programme(day)) {
      const w = s.at - minutes;
      if (w >= -15 && w < wait) { wait = w; best = s; }
    }
    return best || programme(day)[0];
  }

  // ---------------------------------------------------------------- the save
  // What the lead needs to write. Small, flat and all of it belongs to the life rather than to the
  // visit — except `ticket`, which is deliberately *in* here: a ticket for the 20:10 is a thing you
  // are carrying, and the current game throws it away on reload, which is why buying at 19:55 and
  // refreshing loses forty-five yuan. Full shape and placement are in the report.
  function toSave() {
    const t = state.ticket;
    return {
      member:!!state.member, memberDay:state.memberDay | 0, points:state.points | 0,
      student:!!state.student, glasses:!!state.glasses, freeNext:!!state.freeNext,
      seen:state.seen.slice(0, 12), spend:state.spend | 0, visits:state.visits | 0,
      ticket: t ? { day:t.day | 0, id:t.id, hall:t.hall | 0, at:t.at | 0, clock:t.clock,
        filmId:t.filmId | 0, seat:[t.seat[0] | 0, t.seat[1] | 0], seatHz:t.seatHz,
        tier:t.tier, paid:t.paid | 0, d3:!!t.d3, glasses:!!t.glasses, torn:!!t.torn } : null,
    };
  }
  function load(o) {
    Object.assign(state, fresh());
    if (!o || typeof o !== 'object') return;
    state.member = !!o.member;
    state.memberDay = Math.max(0, Math.floor(Number(o.memberDay) || 0));
    state.points = Math.max(0, Math.min(99999, Math.floor(Number(o.points) || 0)));
    state.student = !!o.student;
    state.glasses = !!o.glasses;
    state.freeNext = !!o.freeNext;
    state.spend = Math.max(0, Math.floor(Number(o.spend) || 0));
    state.visits = Math.max(0, Math.floor(Number(o.visits) || 0));
    state.seen = Array.isArray(o.seen)
      ? o.seen.map(n => Math.floor(Number(n))).filter(n => n >= 0 && n < FILMS.length).slice(0, 12) : [];
    const t = o.ticket;
    // A ticket is only read back if it names a screening that exists on the day it claims. Anything
    // else — a hand-edited save, a build where the times moved — is dropped rather than half-read,
    // because a ticket the door cannot resolve is a locked auditorium.
    if (t && typeof t === 'object' && Array.isArray(t.seat)) {
      const day = Math.max(1, Math.floor(Number(t.day) || 0));
      const s = showById(day, String(t.id));
      const r = Math.floor(Number(t.seat[0])), c = Math.floor(Number(t.seat[1]));
      const hall = s && hallOf(s.hall);
      if (s && hall && r >= 1 && r <= hall.rows && c >= 1 && c <= hall.seats && PRICE[t.tier])
        state.ticket = { day, id:s.id, hall:s.hall, at:s.at, clock:s.clock, filmId:s.film.id,
          seat:[r, c], seatHz:seatHz(r, c), tier:t.tier,
          paid:Math.max(0, Math.floor(Number(t.paid) || 0)), d3:!!s.d3,
          glasses:!!t.glasses, torn:!!t.torn };
    }
  }

  return {
    // data, for the fit-out, the board and the harnesses
    FILMS, HALLS, TIMES, PRICE, PHASE, MEMBER_FEE, GLASSES, POINTS_FREE,
    ADVERTS, TRAILERS, PRE, LATE_ENTRY, LETOUT,
    // the programme
    programme, showById, showing, occupancy, taken, phase, sellable, bill, tiers, cheapestTier,
    nextShow, letOut, filmOf, hallOf, clockOf, seatHz, hasStudentId, offerContract, offerState,
    // the panels
    openBoxOffice, openTierPick, openSeatMap, openSeatInRow, openMembership, buyGlasses, showTicket,
    // the door
    doorCheck, tear, watched,
    // state
    state, toSave, load, reset(){ Object.assign(state, fresh()); },
    setStudent(v){ state.student = !!v; },
    ticket: () => state.ticket && { ...state.ticket, seat:state.ticket.seat.slice() },
    bind(h) { host = h || null; },
  };
})();

MallFit['电影院'] = A => {

  // ---------------------------------------------------------------- palette
  // Everything here is dark on purpose. `C` is the global hex helper; the shop's own `col` table
  // lives inside mall.js's closure and is not reachable from a tenant file, so the few shell
  // colours worth matching (its trim black, its warm white) are restated rather than imported.
  const K = {
    black:  C('#0a0c0f'),   // the back of a lit case, the ticket slot
    ink:    C('#15181d'),   // lining, soffit, poster surrounds, door frames — the room's black
    char:   C('#1e2228'),   // backdrops and counter carcasses
    charL:  C('#2a2f36'),   // machines
    slate:  C('#191c21'),   // counter tops
    wine:   C('#2c141c'),   // carpet field, before fabric lifts it
    wineB:  C('#3a1a20'),   // carpet border
    ochre:  C('#5a3a1e'),   // carpet figure
    figG:   C('#6a5326'),   // the small lozenge between the diamonds
    rope:   C('#5b1621'),   // the velvet on the queue line and on the bench
    redD:   C('#48151a'),   // door leaves, fascia grounds
    red:    C('#7d2626'),
    brass:  C('#7a5a2c'),
    steelD: C('#59606a'),
    glass:  C('#8fb0c0'),
    screen: C('#101f33'),
    board:  C('#0c1420'),   // the programme and menu panels
    cream:  C('#e8dcc2'),
    stone:  C('#b6ad99'),
    goldL:  C('#eccf82'),
    warm:   C('#f0d9b4'),   // a short warm strip, at mode 1
    warmD:  C('#8f6a3c'),   // the same light where the strip is long enough to shout
    pop:    C('#f2dea8'),
    lamp:   C('#e05c3a'),
    lampG:  C('#5fbe7a'),   // the light over a position that is open
    lampD:  C('#3a1417'),   // and over one that is not
  };
  // Four material sets and no more. Batching is keyed on the material and every one of its
  // numbers, so each extra combination is another draw call for the whole room; four covers it.
  const MS = { mat:'steel',  matScale:.70,  matAmt:.20, nrmAmt:.30 };      // joinery, machines
  const MB = { mat:'steel',  matScale:1.90, matAmt:.15, nrm:null };        // big flat panels
  const MC = { mat:'fabric', matScale:.58,  matAmt:.18, nrm:null };        // carpet and velvet
  const MT = { mat:'paving', matScale:.62,  matAmt:.20, nrmAmt:.30 };      // terrazzo tops

  const D45 = Math.PI / 4, QT = Math.PI / 2;

  // ---------------------------------------------------------------- the lining
  // The shell's back elevation is a slatted timber panel with the shop's name burnt into it and a
  // framed graphic either side; its party walls are pale plaster with a lit box on each. All of
  // it is right for a bakery and none of it is right for this, so the whole envelope is lined out
  // before anything else is built.
  //
  // The back lining sits at a .40–.50. The slats stop at .395 and the shell's name glyph is at
  // .42, so both are behind it or inside it and neither can show; the nearest parallel face is
  // 5 mm away and it faces the other direction, which is the one case coincident geometry is
  // safe. Everything else in the room is then built at a >= .52 and stands on it.
  A.put(.45, 0, .10, 16.60, 3.32, 1.66, K.ink, {hard:true, gloss:.10, ...MB});
  A.put(.55, 0, .06, 16.60, .15, .075, K.black, {hard:true, gloss:.22});         // skirting
  // The party walls, the same way. The shell's lightbox on each is at |b| 8.30–8.41 and its
  // skirting and valance at 8.375–8.425, so a lining whose room-facing face is at 8.23 covers the
  // lot. Stopped short of the window bay so the shopfront glazing is left alone.
  // Run out to a 4.74 rather than to 4.35. The shell's party wall is cream plaster and its own
  // footprint is the full depth of the unit, so a lining that stopped short of the shopfront left
  // a 45 cm slab of the brightest surface in the building standing at each end of each window bay
  // — two pale columns, floor to valance, in a black room, and the first thing the eye went to
  // from the concession. 4.74 is a centimetre and a half behind the glazing at 4.7575, which is
  // the nearest parallel face and faces the other way.
  for (const s of [-1, 1]) {
    A.put(2.395, s * 8.30, 4.69, .14, 3.40, 1.70, K.ink, {hard:true, gloss:.10, ...MB});
    A.put(2.375, s * 8.20, 4.55, .06, .16, .08, K.black, {hard:true, gloss:.22});
    // and a graze of light down the top of it, which is what stops a dark wall being a hole.
    A.put(2.30, s * 8.19, 4.10, .05, .05, 3.18, K.warm, {hard:true, mode:1, glow:.08});
  }

  // ---------------------------------------------------------------- the floor
  // Laid as a slab rather than a plane so it sits clearly above the shell's own carpet quad at
  // y .02 without fighting it for pixels, and so its edge shows where the border is. The base
  // colour is under the burgundy it should read as, because `fabric` is the one material in this
  // room that multiplies rather than textures, and a woven mode with no weave in it is a flat
  // colour with a name.
  A.put(2.46, 0, 3.86, 16.30, .022, .036, K.wine, {hard:true, mode:7, gloss:.05, ...MC});
  // The border: two long bands and two short ones, inset from the edge, in a second red. A
  // patterned carpet is a field, a border and a figure — leave any one of the three out and it
  // reads as lino.
  for (const s of [-1, 1]) {
    A.put(2.46 + s * 1.76, 0, .26, 15.80, .006, .050, K.wineB, {hard:true, mode:7, gloss:.05, ...MC});
    A.put(2.46, s * 7.88, 3.34, .26, .006, .050, K.wineB, {hard:true, mode:7, gloss:.05, ...MC});
  }
  // The figure: a lozenge grid turned forty-five degrees, with a smaller dot in each gap. `ry`
  // is a world rotation and the room is axis-aligned to the world, so a square with ry = pi/4
  // is a diamond on the floor and costs nothing extra to draw — every one of these shares its
  // mesh, mode and material with all the others, so the whole pattern is one instanced batch.
  for (let i = 0; i < 13; i++) for (let j = 0; j < 3; j++) {
    const bb = -7.20 + i * 1.20, aa = 1.16 + j * 1.30;
    A.put(aa, bb, .40, .40, .005, .048, K.ochre, {hard:true, mode:7, gloss:.06, ry:D45, ...MC});
    A.put(aa, bb, .13, .13, .006, .050, K.wineB, {hard:true, mode:7, gloss:.06, ry:D45, ...MC});
    if (i < 12 && j < 2) A.put(aa + .65, bb + .60, .16, .16, .005, .048, K.figG,
      {hard:true, mode:7, gloss:.06, ry:D45, ...MC});
  }

  // ---------------------------------------------------------------- the dark
  // The one move that makes this a cinema. A soffit hung at 3.30–3.42 across everything but the
  // back half-metre, which puts the shell's ceiling plane, its two side coves and its eighteen
  // ceiling downlights above it and out of sight — geometry behind an opaque panel emits nothing
  // into the glow pass, so the room loses their bloom as well as their surface. The back strip is
  // left open so the shell's cove at a .34 still washes the top of the lining.
  A.put(2.48, 0, 3.84, 16.60, .12, 3.36, K.ink, {hard:true, gloss:.06, ...MB});
  // A margin dropped round the edge of it. A single black plane seventeen metres long is a void;
  // the same plane with a band round its perimeter is a ceiling.
  for (const aa of [.62, 4.34]) A.put(aa, 0, .12, 16.72, .10, 3.26, K.char, {hard:true, gloss:.14, ...MS});
  for (const s of [-1, 1]) A.put(2.48, s * 8.30, 3.84, .12, .10, 3.26, K.char, {hard:true, gloss:.14, ...MS});
  //
  // The shell's own spots are the trap up here. Each is a dark housing at 3.24–3.36 with a warm
  // lens *underneath* it at 3.18–3.24, so a soffit at this height hides the housing and leaves a
  // 16 cm white cube hanging in the black — eight of them, and looking up they were the brightest
  // things in the room. Each gets a can dropped over it: the can swallows the lens whole and
  // wears a lens of its own on its underside, which is what a recessed downlight looks like. The
  // b positions are the shell's own arithmetic for a seventeen-metre unit, restated.
  //
  // The lenses and the two counter slots are collected as `houseLamps` because they are the house
  // lights: they sit low while a film is on and come up when a house lets out, which is the single
  // most recognisable thing a cinema foyer does. `rest` and `rise` travel with each one so the
  // motion callback has no table of its own to keep in step with this loop.
  const houseLamps = [], starPlates = [];
  const house = (p, rest, rise) => { A.dynamicVisual(p); p.rest = rest; p.rise = rise;
                                     houseLamps.push(p); return p; };
  for (let i = 0; i < 8; i++) {
    const bb = -7.30 + i * (14.60 / 7);
    A.put(.95, bb, .26, .26, .20, 3.26, K.ink, {hard:true, gloss:.10, ...MS});
    house(A.put(.95, bb, .20, .20, .05, 3.14, K.warm, {hard:true, mode:1, glow:.13}), .13, .17);
  }
  // Two long slots over the counters, which is the only ceiling light a foyer really has.
  for (const [bb, ln] of [[4.55, 5.00], [-3.30, 3.80]]) {
    A.put(1.70, bb, .46, ln, .06, 3.29, K.black, {hard:true, gloss:.2});
    house(A.put(1.70, bb, .34, ln - .16, .04, 3.265, K.warm, {hard:true, mode:1, glow:.15}), .15, .11);
  }
  // 星光 — starlight, which is what the place is called. Pinpricks scattered across the soffit,
  // stepped on the golden angle so no two rows of them read as a grid. Flat plates rather than
  // beads: the glow pass is additive and a sphere concentrates where a plate spreads, and a
  // ceiling full of bright beads is exactly how the front of this shop became the brightest view
  // in the building the last time somebody tried it.
  // They dim as the house lights come up, which is how a real foyer's decorative lighting behaves
  // and is also what stops the ceiling competing with a crowd walking under it.
  for (let i = 0; i < 26; i++) {
    const t = i * 2.39996;
    starPlates.push(A.dynamicVisual(A.put(1.10 + ((i * 7) % 11) * .26,
      -7.60 + ((i * 5) % 26) * .60 + Math.sin(t) * .22,
      .07, .07, .06, 3.28, K.warm, {hard:true, mode:1, glow:.09})));
  }

  // ---------------------------------------------------------------- what is on this week
  // Invented titles. Nothing in this building carries a real film, a real brand or a real logo,
  // and the same six sit in mall.js's own FILMS table, so the board on the wall, the picker the
  // box office opens and the line the diary writes are all the same programme.
  const FILM = [
    { sky: C('#20456f'), gnd: C('#0c1a2b'), fig: C('#081019'), zh: '海上明月' },
    { sky: C('#6a2833'), gnd: C('#280d13'), fig: C('#170709'), zh: '星海列车' },
    { sky: C('#2f5b4e'), gnd: C('#10211d'), fig: C('#081211'), zh: '雪山信使' },
    { sky: C('#513264'), gnd: C('#1d1128'), fig: C('#110a17'), zh: '北门胡同' },
    { sky: C('#684b23'), gnd: C('#271c0b'), fig: C('#150f06'), zh: '长夜灯火' },
    { sky: C('#224c5b'), gnd: C('#0c1c22'), fig: C('#061013'), zh: '风筝与海' },
  ];
  // Exact retained faces owned by powered cinema equipment. This is deliberately populated at
  // construction sites rather than inferred from glow, so egress lamps and ticket-check feedback
  // cannot be caught by an after-hours heuristic.
  const displayParts = [];
  const displayPart = p => {
    for (const q of [p].flat(Infinity)) if (q) displayParts.push(q);
    return p;
  };

  // ---------------------------------------------------------------- a backlit poster case
  // Dark surround, a rebate, a lit sheet, a darker band across the bottom of it, a skyline of
  // blocks standing against the light, a moon, a title plate, three credit lines and a wash lamp
  // along the top edge. A film poster is a dark picture in a bright frame with something
  // happening in it, not a rectangle of saturated colour: the inline fit built one emissive panel
  // per film and they read as paint swatches, and the first pass at this file only stacked a
  // second, flatter rectangle on top of the first.
  //
  // `sideDir` is 0 for a case on the back wall or in the window, where the layers stack towards
  // the concourse, and +/-1 for one on a party wall, where they stack towards the middle of the
  // room. `P` takes the offset out of the wall and the offset along the poster's own width, and
  // works out which of a and b each of those is — which is the whole reason eleven cases in four
  // orientations are one piece of code and not four.
  function posterCase(a, b, W, H, y, f, sideDir = 0, title = false) {
    // (out of the wall, across the poster, thickness, width, height, y, colour, options)
    const P = (k, off, t, w, h, yy, c, o) => sideDir
      ? A.put(a + off, b + sideDir * k, w, t, h, yy, c, o)
      : A.put(a + k, b + off, t, w, h, yy, c, o);
    // A world rotation of a square makes a diamond, but only in the plane the poster is in: a
    // back-wall case lies in x–y and a party-wall case in y–z, so the moon turns about a
    // different axis on each. Turned about the wrong one it is a square seen edge-on, which is
    // to say nothing at all.
    const turn = sideDir ? {rx:D45} : {rz:D45};
    P(.000, 0, .16, W + .17, H + .19, y, K.ink, {hard:true, gloss:.26, ...MS});     // surround
    P(.085, 0, .04, W + .05, H + .07, y, K.black, {hard:true, gloss:.14});          // rebate
    displayPart(P(.115, 0, .03, W, H, y, f.sky,
      {hard:true, mode:1, glow:.06}));                                               // the lit sheet
    displayPart(P(.130, 0, .02, W, H * .40, y - H * .30, f.gnd,
      {hard:true, mode:1, glow:.02}));                                               // the ground
    displayPart(P(.140, W * .22, .012, W * .17, W * .17, y + H * .26, K.warm,
      {hard:true, mode:1, glow:.05, ...turn}));                                      // the moon
    // A skyline against the light. Five blocks of uneven height, spread across the sheet, is
    // enough to stop it reading as one colour, and every one of them shares a mesh, a mode and a
    // material with the rest of the room's flat emissive work.
    for (let k = 0; k < 5; k++)
      displayPart(P(.145, (k - 2) * W * .19, .012, W * .14, H * (.12 + ((k * 5) % 4) * .07),
        y - H * .10 + H * (.06 + ((k * 5) % 4) * .035), f.fig,
        {hard:true, mode:1, glow:.01}));
    P(.150, 0, .015, W - .26, .13, y - H * .33, K.black, {hard:true, mode:1});      // title plate
    for (let k = 0; k < 3; k++)                                                     // credits
      P(.150, 0, .012, (W - .44) * (1 - k * .19), .026, y - H * .40 - k * .052, K.stone,
        {hard:true, mode:1});
    displayPart(P(.150, 0, .045, W - .06, .045, y + H / 2 + .105, K.warm,
      {hard:true, mode:1, glow:.14}));                                               // the wash
    // The name in the plate, and only on the cases somebody stands in front of: a glyph is one
    // quad with its own atlas cell, which means it can never join a batch, so four characters is
    // four draw calls whatever else is on screen.
    if (title && !sideDir)
      displayPart(A.glyph(a + .19, b, y - H * .33, f.zh,
        {size:.082, gap:.026, color:K.cream, glow:.05}));
  }

  // A cutout on a folded foot, leaning very slightly back the way they always do. The one poster
  // that stands in the room rather than on a wall, so it wants a figure on it: a body block and a
  // head disc read as a person from across the foyer, where a plain coloured slab reads as a door.
  function standee(sa, sb, f) {
    A.put(sa, sb, .05, .92, 1.94, .99, K.ink, {hard:true, gloss:.22, ...MS});
    A.put(sa + .035, sb, .02, .84, 1.86, .99, f.sky, {hard:true, mode:1, glow:.05});
    A.put(sa + .045, sb, .02, .84, .70, .48, f.gnd, {hard:true, mode:1, glow:.02});
    A.put(sa + .055, sb, .02, .30, .74, 1.24, f.fig, {hard:true, mode:1, glow:.01});
    A.cyl(sa + .060, sb, 1.71, .115, .04, f.fig, {rx:QT, mode:1, glow:.01});
    A.put(sa + .065, sb, .02, .60, .11, .40, K.cream, {hard:true, mode:1});
    A.put(sa - .17, sb, .34, .74, .04, .03, K.ink, {hard:true, gloss:.20});
    A.stop(sa - .32, sa + .12, sb - .48, sb + .48);
  }

  // ---------------------------------------------------------------- the box office (west)
  // Counter, four glazed positions, the day's programme above them and a marquee over that. The
  // shell's own `counter` supplies the bones — carcass, recessed plinth, top, collider — and
  // everything that makes it a box office rather than a till is added on top of it.
  //
  // The glazing is the piece that has to be got right, and the first build of this room got it
  // wrong: at 2.45 it stood a metre and a half in front of the board and put half the programme
  // behind glass from anywhere you could stand. Its top is now at 1.87, which is a metre of glass
  // over a counter, and the sight line from standing height to the bottom row of the board clears
  // it by four centimetres.
  const TA = 1.85, TDP = 1.05, TB = 4.55, TW = 5.00;
  const T0 = TB - TW / 2;                              // its east end, at b 2.05

  // A backdrop behind the positions, a shade off the lining, so the box office reads as a bay set
  // into the wall rather than as fittings stuck on it.
  A.put(.60, TB, .12, TW + .30, 2.55, 1.72, K.char, {hard:true, gloss:.14, ...MB});

  // The programme board. Two columns of four, because eight rows down one column at a legible
  // size is a board three metres tall. A row reads lamp, time, film: +b is west, and text on this
  // wall runs from high b to low b, so higher b comes first in the line.
  // Everything the board is made of wears `排片表` rather than the shop's own kind. A tenant file
  // gets `tag` for free on every prop it builds, which means every prop in this unit answers to
  // 电影院 — and `pickUnderCursor` reads the tag off whatever the ray hit and then picks the
  // *thing* wearing it, so pointing at the board, or at the popcorn machine, offered to sell you
  // a ticket. Three words in this room and only one of them was reachable with the cursor.
  displayPart(A.put(.68, TB, .10, TW + .04, .84, 2.575, K.board,
    {hard:true, mode:1, glow:.035, tag:'排片表'}));
  // The day's programme, restated. mall.js owns the real one (its FILMS and SHOWS tables, and the
  // clock drives a lamp on it), but a tenant file is evaluated before the Mall module is built
  // and asking a Lazy module for itself while it is building throws — so the text is a copy and
  // only the lamps are wired back to the live schedule, at the bottom of this file.
  const SHOWS = [
    ['10:15', 0], ['11:50', 1], ['13:30', 2], ['15:10', 3],
    ['16:50', 4], ['18:30', 5], ['20:10', 0], ['21:50', 1],
  ];
  const lamps = [];
  SHOWS.forEach(([when, fi], i) => {
    const cb = TB + (i < 4 ? 1.22 : -1.22), y = 2.79 - (i % 4) * .17;
    displayPart(A.glyph(.74, cb + .37, y, when,
      {size:.094, gap:.025, color:K.goldL, glow:.09, tag:'排片表'}));
    displayPart(A.glyph(.74, cb - .39, y, FILM[fi].zh,
      {size:.094, gap:.028, color:K.cream, glow:.06, tag:'排片表'}));
    lamps.push(A.dynamicVisual(displayPart(A.put(.75, cb + .80, .035, .070, .070, y, K.lamp,
      {hard:true, mode:1, glow:.04, tag:'排片表'}))));
  });
  displayPart(A.glyph(.74, TB, 2.92, '今日排片',
    {size:.115, gap:.040, color:K.goldL, glow:.13, tag:'排片表'}));

  // ---------------------------------------------------------------- three houses, not one
  // The board above lists 一号厅 and only 一号厅, because those eight times are mall.js's own SHOWS
  // and the lamp wiring at the bottom of this file is index-for-index with them. CinemaSys runs
  // three auditoriums, so the other two are named on a ribbon along the bottom of the backdrop, in
  // the 19 cm between the board's lower edge at 2.155 and the position number plates at 1.885.
  //
  // A lamp per house rather than a time per house: the times are in the picker, and what somebody
  // standing at the glass needs off a wall is which of the three doors is about to go in. The lamps
  // step, so they go through MotionSafety — a board blinking at four hertz in a dark foyer is
  // exactly what that gate exists to prevent.
  displayPart(A.put(.68, TB, .10, TW - .20, .17, 2.030, K.board,
    {hard:true, mode:1, glow:.03, tag:'排片表'}));
  const hallLamps = [];
  CinemaSys.HALLS.forEach((h, i) => {
    const cb = TB + 1.62 - i * 1.62;
    displayPart(A.glyph(.74, cb - .16, 2.030, h.hz,
      {size:.072, gap:.022, color:K.cream, glow:.06, tag:'排片表'}));
    hallLamps.push(A.dynamicVisual(displayPart(A.put(.75, cb + .30, .035, .055, .055, 2.030, K.lampD,
      {hard:true, mode:1, glow:.02, tag:'排片表'}))));
  });
  // 三号厅 is the 3D house and the only one, which is worth two more characters on the wall: this is
  // where a player learns a ticket for it needs 眼镜, rather than at the door without any.
  displayPart(A.glyph(.74, TB - 2.02, 2.030, '3D',
    {size:.062, gap:.020, color:K.goldL, glow:.09, tag:'排片表'}));

  // The marquee over it. This is the big lit thing you see from the doorway: it sits just under
  // the soffit, which is the top of the frame from anywhere in the room, and it is the reason the
  // ceiling above it is allowed to be black. The bulbs are the one place a sphere is right, so
  // their glow is held right down — a sphere concentrates the additive pass where a plate spreads
  // it, and a marquee is the single worst case for that in the building.
  A.put(.80, TB, .16, TW + .34, .26, 3.15, K.redD, {hard:true, gloss:.22, ...MS});
  A.put(.91, TB, .06, TW + .26, .20, 3.15, K.red, {hard:true, mode:1, glow:.07});
  A.glyph(.96, TB, 3.15, '售票处', {size:.145, gap:.050, color:K.goldL, glow:.16});
  const marqueeBulbs=[];
  for (let i = 0; i < 13; i++)
    marqueeBulbs.push(A.dynamicVisual(A.ball(.86, T0 - .14 + i * ((TW + .28) / 12), 3.005,
      .040, .040, .040, K.goldL,{mode:1, glow:.13})));

  // The counter itself. `till:false` — this is a box office, and the shell's till hangs a 收银台
  // on the shop, which is the mall's basket checkout; the cinema has no catalogue in MALL_GOODS
  // and nothing to put in a basket. 电影院 further down is what sells the ticket, and game.js
  // opens the day's programme off it.
  A.counter(TA, TB, TW, TDP, K.char, false);
  // A dark terrazzo top laid over the shell's cream one, wider and deeper on every side so the
  // pale stone is completely inside it. In a room this dark a cream slab five metres long is the
  // brightest thing in the frame and it reads as a bakery counter.
  A.put(TA, TB, TDP + .16, TW + .18, .12, .94, K.slate, {hard:true, gloss:.50, ...MT});
  A.put(TA + TDP / 2 + .095, TB, .02, TW + .18, .022, 1.008, K.brass, {hard:true, gloss:.60});
  // and the lit edge, which is what a cinema counter actually is: a hairline of warm light in the
  // shadow gap under the top and another at the toe, with the front dark between them. The first
  // pass at this was a 30 cm emissive band the length of both counters and it came out as a taxi
  // stripe — the shell puts a 5 cm strip on every counter in the building, and the shell is right.
  A.put(TA + TDP / 2 + .012, TB, .035, TW - .12, .05, .845, K.warm, {hard:true, mode:1, glow:.11});
  A.put(TA + TDP / 2 + .012, TB, .035, TW - .12, .04, .215, K.warmD, {hard:true, mode:1, glow:.05});

  // Four glazed positions: a post between each, glass above the counter, a speak-hole and a
  // ticket slot in it, a numbered plate on the glass and a lit monitor on the staff side. There
  // is no header rail across the top of them, and that is deliberate — one at any sensible height
  // sits exactly on the line of sight from standing height to the bottom row of the board.
  const POS = 4, PITCH = TW / POS;
  for (let i = 0; i <= POS; i++)
    A.put(1.76, T0 + i * PITCH, .07, .07, .90, 1.45, K.ink, {hard:true, gloss:.35, ...MS});
  for (let i = 0; i < POS; i++) {
    const pb = T0 + (i + .5) * PITCH;
    A.put(1.76, pb, .03, PITCH - .11, .86, 1.44, K.glass,
      {hard:true, mode:1, alpha:.14, gloss:.90});
    A.put(1.79, pb, .025, .28, .05, 1.22, K.steelD, {hard:true, gloss:.5});      // speak-hole
    A.put(1.81, pb, .02, .24, .035, 1.07, K.black, {hard:true, gloss:.3});       // ticket slot
    A.put(1.79, pb, .02, .26, .13, 1.79, K.black, {hard:true, mode:1});          // number plate
    A.glyph(1.80, pb, 1.79, ['一', '二', '三', '四'][i], {size:.100, color:K.goldL, glow:.16});
    displayPart(A.put(1.50, pb, .06, .34, .24, 1.30, K.screen,
      {hard:true, mode:1, glow:.10}));
    // Two of the four are staffed at two in the afternoon and two are not, which is what a
    // Tuesday looks like at a four-position box office. A bar of light over the plate says which:
    // green over the ones with somebody behind them, a dead red over the ones without. No glyph —
    // a character is a quad with its own atlas cell and can never join a batch, and the colour
    // says it. The two lit ones are 二 and 三, which is where the clerk and the queue are.
    const open = i === 1 || i === 2;
    A.put(1.80, pb, .02, .22, .028, 1.885, open ? K.lampG : K.lampD,
      {hard:true, mode:1, glow: open ? .12 : .02});
  }

  // 学生优惠. A small standing card on the counter top at position 一, on the customer's side of
  // the glass where a real one is.  Its price and both status rows come from CinemaSys's immutable
  // offer contract.  The immutable headline stays static; the existing foyer callback reveals one
  // of two prebuilt status rows only when hasStudentId() changes, so there is no per-frame text
  // construction and only nine glyphs enter the dynamic upload path.
  // The counter top runs a 1.245–2.455 and the glazing stands at 1.76, so 2.28 is on the public
  // half of it and clear.
  const studentCardBack = A.put(2.28, T0 + .5 * PITCH, .03, .34, .26, 1.135, K.redD,
    {hard:true, gloss:.26, ...MS});
  const studentCardFace = A.put(2.295, T0 + .5 * PITCH, .01, .30, .22, 1.135, K.board,
    {hard:true, mode:1, glow:.05});
  const studentContract = CinemaSys.offerContract();
  studentCardBack.mallOfferId = studentContract.id;
  studentCardFace.mallOfferId = studentContract.id;
  const studentHeadline = A.glyph(2.305, T0 + .5 * PITCH, 1.185, studentContract.card.headline,
    {size:.034, gap:.010, color:K.goldL, glow:.10});
  const studentRequired = A.glyph(2.305, T0 + .5 * PITCH, 1.100, studentContract.card.required,
    {size:.041, gap:.011, color:K.cream, glow:.06, alpha:.001});
  const studentEligible = A.glyph(2.305, T0 + .5 * PITCH, 1.100, studentContract.card.eligible,
    {size:.036, gap:.009, color:K.cream, glow:.06, alpha:.001});
  A.dynamicVisual(studentRequired, studentEligible);
  for (const p of studentHeadline) {
    p.mallOfferId = studentContract.id; p.mallOfferState = 'all';
  }
  for (const p of studentRequired) {
    p.mallOfferId = studentContract.id; p.mallOfferState = 'id-required';
  }
  for (const p of studentEligible) {
    p.mallOfferId = studentContract.id; p.mallOfferState = 'eligible';
  }
  const studentCard = {
    boards:[studentCardBack, studentCardFace],
    headline:studentHeadline, required:studentRequired, eligible:studentEligible,
  };

  // The queue. One rope line standing off the counter, four posts and three spans, each span
  // built as two halves tilted towards each other so the velvet hangs instead of floating. `rz`
  // is a world rotation and this run happens to lie along world x, so it tilts the way it looks.
  const QB = [2.10, 3.35, 4.60, 5.85];
  for (const qb of QB) {
    A.cyl(3.10, qb, .03, .17, .06, K.ink, {gloss:.3});
    A.cyl(3.10, qb, .52, .026, .98, K.brass, {gloss:.55, ...MS});
    A.ball(3.10, qb, 1.05, .050, .060, .050, K.brass, {gloss:.6});
  }
  for (let i = 0; i < QB.length - 1; i++) {
    const m = (QB[i] + QB[i + 1]) / 2, hlf = (QB[i + 1] - QB[i]) / 2;
    A.put(3.10, m + hlf / 2, .050, hlf - .04, .050, .845, K.rope, {mode:7, rz:.10, ...MC});
    A.put(3.10, m - hlf / 2, .050, hlf - .04, .050, .845, K.rope, {mode:7, rz:-.10, ...MC});
  }

  // ---------------------------------------------------------------- the concession (east)
  const CA = 1.85, CDP = .95, CB = -3.30, CW = 3.80;   // it runs from b -5.20 to b -1.40

  // Back bar: a low carcass with a worktop, and the menu board above it. The board is hung at
  // 1.90 rather than at counter height because the fountain stands on that worktop and is 78 cm
  // tall — built any lower, the board goes straight through the machine.
  A.put(.66, -4.35, .48, 1.90, 1.00, .50, K.char, {hard:true, gloss:.18, ...MS});
  A.put(.68, -4.35, .54, 2.00, .06, 1.03, K.slate, {hard:true, gloss:.45, ...MT});
  displayPart(A.put(.62, -4.35, .10, 2.00, 1.10, 2.45, K.board,
    {hard:true, mode:1, glow:.045}));
  displayPart(A.put(.68, -4.35, .03, 1.88, .04, 3.04, K.warm,
    {hard:true, mode:1, glow:.12}));
  for (const [i, item, price] of [[0, '爆米花', '¥20'], [1, '可乐', '¥12'], [2, '热狗', '¥18']]) {
    const y = 2.82 - i * .36;
    displayPart(A.glyph(.68, -3.92, y, item,
      {size:.130, gap:.040, color:K.cream, glow:.08}));
    displayPart(A.glyph(.68, -4.86, y, price,
      {size:.120, gap:.032, color:K.goldL, glow:.10}));
  }
  // The drinks fountain, standing on the worktop at the far end of the bar.
  A.put(.78, -5.05, .34, .74, .78, 1.45, K.charL, {hard:true, gloss:.34, ...MS});
  displayPart(A.put(.95, -5.05, .02, .66, .30, 1.66, K.red,
    {hard:true, mode:1, glow:.10}));
  A.put(.92, -5.05, .24, .62, .04, 1.09, K.steelD, {hard:true, gloss:.55});
  for (let i = 0; i < 3; i++) {
    A.cyl(1.00, -5.29 + i * .24, 1.20, .024, .15, K.steelD, {gloss:.6});    // the taps hang proud
    A.put(.97, -5.29 + i * .24, .03, .09, .05, 1.37, K.black, {hard:true, gloss:.3});
  }

  // 3D 眼镜. 三号厅 is the 3D house and the glasses come off the concession counter, not the box
  // office, which is where they come from in life — you buy the ticket at one end of the foyer and
  // are sent to the other end for the specs. A shallow lit case standing on the back bar's worktop
  // in the 1.2 m of it left between the fountain and the chiller, with the folded pairs stacked in
  // it edge-on: a stack of dark bars against a lit ground is what a box of glasses looks like, and
  // it is four instanced boxes rather than sixteen little pairs nobody can resolve from the queue.
  const GB = -3.95;
  A.put(.72, GB, .30, .64, .04, 1.075, K.ink, {hard:true, gloss:.24, ...MS});        // base
  A.put(.60, GB, .06, .64, .38, 1.285, K.ink, {hard:true, gloss:.20, ...MS});        // back
  A.put(.63, GB, .02, .56, .30, 1.275, C('#3a5f78'), {hard:true, mode:1, glow:.07}); // lit ground
  for (const s of [-1, 1])
    A.put(.72, GB + s * .31, .30, .04, .38, 1.285, K.ink, {hard:true, gloss:.26, ...MS});
  A.put(.72, GB, .30, .64, .04, 1.475, K.ink, {hard:true, gloss:.26, ...MS});        // top
  for (let i = 0; i < 6; i++)                                                        // the pairs
    A.put(.70, GB - .22 + i * .088, .22, .048, .16, 1.185, K.black, {hard:true, gloss:.34});
  A.glyph(.88, GB, 1.535, '3D眼镜', {size:.070, gap:.022, color:K.goldL, glow:.11});

  // The chiller, built as a carcass — back, two sides, top and plinth — and *not* as a solid box
  // with the shelves inside it, which is the mistake that cost this room a render twice: a case
  // whose front face is a wall shows you the wall, and a lit panel laid behind that face simply
  // never appears. Everything a chiller is made of is what you can see through the open front.
  const CH = -2.87;
  A.put(.60, CH, .10, .96, 1.98, .99, K.ink, {hard:true, gloss:.20, ...MS});           // back
  for (const s of [-1, 1])
    A.put(.84, CH + s * .44, .50, .08, 1.98, .99, K.ink, {hard:true, gloss:.28, ...MS}); // sides
  A.put(.84, CH, .50, .96, .12, 1.92, K.ink, {hard:true, gloss:.28, ...MS});            // top
  A.put(.84, CH, .50, .96, .18, .09, K.ink, {hard:true, gloss:.24, ...MS});             // plinth
  A.put(.67, CH, .03, .80, 1.62, 1.05, C('#a8c4cd'), {hard:true, mode:1, glow:.09});    // lit back
  for (let r = 0; r < 4; r++) {
    const y = .34 + r * .40;
    A.put(.86, CH, .38, .80, .022, y, K.steelD, {hard:true, gloss:.5});
    for (let k = 0; k < 5; k++) {
      const bb = CH - .30 + k * .15;
      A.cyl(.86, bb, y + .13, .042, .24,
        [C('#7c2226'), C('#8a6a24'), C('#265640'), C('#22415f')][(r + k) % 4], {gloss:.5});
      A.cyl(.86, bb, y + .27, .022, .045, K.cream, {gloss:.4});
    }
  }
  A.put(1.07, CH, .025, .86, 1.74, 1.02, K.glass, {hard:true, mode:1, alpha:.12, gloss:.92});
  A.put(1.10, CH, .02, .05, 1.56, 1.02, K.steelD, {hard:true, gloss:.6});
  A.stop(.55, 1.14, CH - .52, CH + .52);

  // The bar itself, and the same edge-lit treatment as the box office so the two read as one
  // shopfit rather than as two.
  A.counter(CA, CB, CW, CDP, K.char, false);
  A.put(CA, CB, CDP + .16, CW + .18, .12, .94, K.slate, {hard:true, gloss:.50, ...MT});
  A.put(CA + CDP / 2 + .095, CB, .02, CW + .18, .022, 1.008, K.brass, {hard:true, gloss:.60});
  A.put(CA + CDP / 2 + .012, CB, .035, CW - .12, .05, .845, K.warm, {hard:true, mode:1, glow:.11});
  A.put(CA + CDP / 2 + .012, CB, .035, CW - .12, .04, .215, K.warmD, {hard:true, mode:1, glow:.05});

  // The popcorn warmer, at the end of the bar nearest the middle so it is the first thing in the
  // room you can put a name to. Same carcass rule as the chiller, and it was broken here the same
  // way: the first build was a solid 60 cm box with the lit interior six centimetres inside its
  // own front face, and what rendered was a black cube on a black counter. A hot cabinet is a lit
  // box you can see into — a base, a back, two uprights, a top, a warm panel behind, the kettle
  // hanging in the roof of it and the corn heaped in the bottom.
  //
  // All of it wears `爆米花` rather than the shop's kind, for the reason given at the programme
  // board: every prop a tenant file builds inherits the shop's tag, so the cursor could not tell
  // the popcorn machine from the box office and pointing at either offered a ticket.
  const PB = -1.95, PY = 1.00, TP = {tag:'爆米花'};
  A.put(CA, PB, .58, .86, .06, PY + .03, K.charL, {hard:true, gloss:.36, ...MS, ...TP});  // base
  A.put(CA - .27, PB, .04, .86, .82, PY + .47, K.ink, {hard:true, gloss:.24, ...MS, ...TP}); // back
  // .11, not .17. Three-quarters of a metre by seven-tenths is over half a square metre of lit
  // sheet, and at .17 it was the brightest thing in every frame taken from the middle of the room
  // — brighter than the marquee, which is meant to be what you look at. Contrast is what makes it
  // read as a hot cabinet: it is a warm panel in a black carcass, and the black is doing the work.
  A.put(CA - .21, PB, .02, .78, .70, PY + .44, C('#c48a3c'),
    {hard:true, mode:1, glow:.11, ...TP});
  for (const s of [-1, 1])
    A.put(CA, PB + s * .41, .58, .04, .82, PY + .47, K.ink,
      {hard:true, gloss:.30, ...MS, ...TP});
  A.put(CA, PB, .58, .86, .06, PY + .91, K.ink, {hard:true, gloss:.30, ...MS, ...TP});    // top
  A.put(CA - .04, PB, .16, .30, .17, PY + .78, K.charL, {hard:true, gloss:.4, ...TP});    // kettle
  A.cyl(CA - .04, PB, PY + .68, .035, .10, K.steelD, {gloss:.6, ...TP});
  for (let i = 0; i < 20; i++) {
    const t = i * 2.39996;
    A.ball(CA + Math.sin(t) * .16, PB + Math.cos(t * 1.31) * .28, PY + .13 + (i % 3) * .05,
      .046, .040, .046, K.pop, {mode:7, ...TP});
  }
  A.put(CA + .28, PB, .025, .78, .74, PY + .45, K.glass,
    {hard:true, mode:1, alpha:.13, gloss:.92, ...TP});
  A.put(CA, PB, .60, .90, .09, PY + .99, K.redD, {hard:true, gloss:.24, ...MS, ...TP});   // hood
  A.glyph(CA + .31, PB, PY + .99, '爆米花', {size:.095, gap:.030, color:K.goldL, glow:.14, ...TP});
  // Cups and cartons stacked along the bar, which is what the rest of a concession counter is.
  for (let i = 0; i < 4; i++)
    A.taper(CA - .20, -3.55 - i * .24, 1.13, .17, .28, .17, K.red, {mode:7});
  for (let i = 0; i < 3; i++)
    A.put(CA + .16, -4.55 - i * .22, .18, .18, .25, 1.125, K.cream, {round:.02, mode:7});
  // A bin at the end of the bar. Every foyer has one, and nothing says "a room people stand about
  // in" faster than somewhere to put the cup.
  //
  // At a 2.95 it cut the building in half, and this is the sort of thing only the collision map
  // shows. The public floor here is the strip between the front of the counters at a 2.40 and the
  // window platform at 3.62 — 1.2 m, of which a body 0.6 m across can use the middle 0.6. A 50 cm
  // collider standing in the middle of that grows to 1.1 m once the player's own radius is added
  // and leaves nothing either side of it, so there was no way to walk from the box office to the
  // concession at all: the foyer was three rooms that happened to share a ceiling. Tucked into the
  // corner between the end of the bar and the middle bay it is out of the walking line entirely,
  // which is also where the bin in a real foyer is.
  A.taper(1.85, -.85, .34, .46, .68, .46, K.char, {gloss:.24, ...MS});
  A.put(1.85, -.85, .46, .46, .05, .70, K.charL, {hard:true, gloss:.4});
  A.put(1.85, -.85, .18, .26, .03, .735, K.black, {hard:true, gloss:.2});
  A.stop(1.60, 2.10, -1.10, -0.60);

  // ---------------------------------------------------------------- the middle of the room
  // What you are looking at from the doorway. The shell put its slatted timber feature panel here
  // with the shop's name burnt into it, which is the single brightest surface in the unit; the
  // lining covers it and this stands in its place — the name in gold on a red band, two lit cases
  // under it, and a bench in front, because a foyer is a room you wait in and nothing in here
  // said so.
  const FB = -0.25;                                    // the bay runs from b -2.30 to b 1.80
  A.put(.60, FB, .12, 4.10, 2.80, 1.75, K.char, {hard:true, gloss:.14, ...MB});
  A.put(.72, FB, .16, 4.14, .26, 2.99, K.redD, {hard:true, gloss:.22, ...MS});
  A.put(.83, FB, .06, 4.06, .20, 2.99, K.red, {hard:true, mode:1, glow:.07});
  A.glyph(.88, FB, 2.99, '星光电影院', {size:.150, gap:.052, color:K.goldL, glow:.15});
  A.put(.74, FB, .04, 4.06, .04, 2.82, K.warm, {hard:true, mode:1, glow:.11});
  posterCase(.66, FB - .96, 1.30, 1.62, 1.92, FILM[0], 0, true);
  posterCase(.66, FB + .96, 1.30, 1.62, 1.92, FILM[1], 0, true);
  // A small Beijing seal in the deliberate gap between the poster cases. It gives the foyer a
  // local identity without competing with the film art or adding another object to the walking lane.
  A.cyl(.84, FB, 2.49, .18, .040, K.red, {rx:QT, gloss:.32});
  A.cyl(.865, FB, 2.49, .135, .018, K.redD, {rx:QT, gloss:.24});
  A.glyph(.89, FB, 2.49, '京', {size:.105, gap:.02, color:K.goldL, glow:.08});
  // The bench, built as a bench rather than as a slab. Two cushions with a gap between them and a
  // piped front edge, two backs, a capping rail, an arm at each end and a brass toe rail: a single
  // 2.4 m block of one colour is a plinth with velvet on it, and it read as one. The seat top stays
  // at .47 — that is the number the people sitting on it are placed against, and moving it puts
  // them through their own cushion.
  A.put(1.22, FB, .46, 2.40, .34, .19, K.ink, {hard:true, gloss:.18, ...MS});          // plinth
  A.put(1.47, FB, .03, 2.36, .025, .10, K.brass, {hard:true, gloss:.55});              // toe rail
  for (const s of [-1, 1]) {
    A.put(1.22, FB + s * .615, .54, 1.18, .10, .42, K.rope, {hard:true, mode:7, gloss:.10, ...MC});
    A.put(1.505, FB + s * .615, .02, 1.16, .03, .455, K.brass, {hard:true, gloss:.50});  // piping
    A.put(1.00, FB + s * .615, .10, 1.18, .46, .72, K.rope, {hard:true, mode:7, gloss:.10, ...MC});
    A.put(1.20, FB + s * 1.24, .50, .10, .30, .60, K.ink, {hard:true, gloss:.26, ...MS}); // arm
  }
  A.put(1.00, FB, .13, 2.48, .05, .965, K.ink, {hard:true, gloss:.30, ...MS});         // capping
  A.stop(.94, 1.50, FB - 1.30, FB + 1.30);

  // ---------------------------------------------------------------- the doors into 一号厅
  // Decorative: the auditorium is a separate room reached off the west gallery, and these are
  // what a foyer has at its west end. Two leaves with portholes, a lit number over them, and a
  // ticket-tear podium either side — the 检票 the seat in there asks you about.
  const DB = -6.95;
  A.put(.64, DB, .16, 2.96, 2.72, 1.42, K.ink, {hard:true, gloss:.22, ...MS});
  for (const s of [-1, 1]) {
    const lb = DB + s * .68;
    A.put(.77, lb, .08, 1.26, 2.30, 1.17, K.redD, {hard:true, gloss:.26, ...MS});
    // A porthole is a disc and it has to be built as one. Modelled as a sphere flattened to
    // 35 mm it came out as a drawn ring, because that is what a sphere squashed past its own
    // silhouette does; a `cyl` laid on its side is a real round window and reads as one. At
    // 43 cm across and 5 cm thick it is nowhere near the ratio at which a disc's normals skew.
    A.cyl(.82, lb, 1.86, .215, .05, K.steelD, {rx:QT, gloss:.55});
    A.cyl(.85, lb, 1.86, .175, .04, K.screen, {rx:QT, gloss:.75});
    A.put(.83, lb, .05, 1.02, .06, 1.02, K.steelD, {hard:true, gloss:.6});      // push bar
  }
  A.put(.72, DB, .12, 1.96, .34, 2.88, K.redD, {hard:true, mode:1, glow:.08});
  A.glyph(.80, DB, 2.88, '一号厅', {size:.165, gap:.055, color:K.goldL, glow:.16});
  A.put(.74, DB, .06, 2.60, .04, 3.08, K.warm, {hard:true, mode:1, glow:.10});
  const ticketCheckLamps = [];
  for (const pb of [-5.55, -8.00]) {
    A.put(1.70, pb, .44, .44, .98, .49, K.char, {gloss:.24, ...MS});
    A.put(1.70, pb, .52, .52, .05, 1.015, K.slate, {hard:true, gloss:.5, ...MT});
    // Retained rather than baked: both podiums show the same decision the usher makes. Dark red
    // means no ticket, bright red means this ticket cannot use 一号厅, and green means it can. The
    // two identical plates remain one dynamic instance group and add no extra fitting to the floor.
    ticketCheckLamps.push(A.dynamicVisual(A.put(1.70, pb, .28, .28, .02, 1.05, K.lampD,
      {hard:true, mode:1, glow:.05})));
    A.put(1.93, pb, .02, .30, .10, .84, K.brass, {hard:true, gloss:.55});
    A.stop(1.46, 1.96, pb - .28, pb + .28);
  }
  // This is the real route into the separately built auditorium. The visible leaves used to be
  // decorative while the only physical entrance was around the back on the west gallery.
  const screenDoor = A.th('一号厅', 1.02, DB,
    '请出示电影票，从这里进一号厅。', 'Show your ticket and enter screen one here.',
    '一号厅 means screen one.', 2.1, 1.45);
  screenDoor.mallCinemaDoor = true;
  // The flag CinemaSys.doorCheck() hangs off. game.js reads `mallCinemaDoor` today and gets the
  // old yes/no; reading this instead gets late entry, the wrong day, the wrong house and 3D
  // glasses, all in one answer. Setting it costs nothing while it is unread — see the report.
  screenDoor.cinemaDoor = true;

  // ---------------------------------------------------------------- the corridor to 二号厅 and 三号厅
  // CinemaSys sells three real houses, so the foyer must give all three a physical destination.
  // 一号厅 opens off the back wall above; the other two turn down the west side corridor, replacing
  // the two poster cases that used to occupy this wall. They are deliberately wall treatments, not
  // freestanding doors: the usable route to 一号厅 runs beside them and nothing below adds a stop.
  //
  // Each portal is twelve retained props: leaf, two jambs, lintel, porthole, push bar, projecting
  // blade and five segments for its number. Twenty-four total. All opaque pieces share one box key
  // and all number segments another, so this is two static instance groups and no point lights.
  // The projecting blades sit above 2.5 m and face the walk in from the shopfront; the complete
  // 二号厅 / 三号厅 names remain on the live house ribbon at the box office, while the large 2 and 3
  // make the corresponding physical doors unambiguous from the centre aisle.
  const PORTAL_BOX = {hard:true, gloss:.26, ...MS};
  const PORTAL_DIGIT = {hard:true, mode:1, glow:.12};
  function sideHallPortal(pa, hall) {
    const wallB = -8.135, faceB = -8.065, bladeB = -7.82;
    A.put(pa, wallB, 1.00, .055, 2.18, 1.12, K.redD, PORTAL_BOX);                 // leaf
    for (const s of [-1, 1])
      A.put(pa + s * .535, faceB, .07, .055, 2.34, 1.17, K.steelD, PORTAL_BOX); // jambs
    A.put(pa, faceB, 1.14, .055, .10, 2.29, K.steelD, PORTAL_BOX);              // lintel
    A.put(pa, faceB + .006, .34, .025, .28, 1.63, K.screen, PORTAL_BOX);         // porthole
    A.put(pa, faceB + .035, .70, .035, .055, 1.03, K.steelD, PORTAL_BOX);        // push bar
    A.put(pa, bladeB, .06, .72, .28, 2.66, hall === 3 ? K.redD : K.board,
      PORTAL_BOX);                                                               // blade

    // Five-segment numerals: unlike glyph quads these share one retained instance group. The
    // side-wall doors are read at a grazing angle, so a bright, broad digit survives where three
    // small characters would become six unbatchable draws and disappear edge-on.
    const seg = (b, y, w, h) => A.put(pa + .04, b, .012, w, h, y, K.goldL, PORTAL_DIGIT);
    seg(bladeB, 2.755, .19, .025);                                                // top
    seg(bladeB + .082, 2.710, .025, .10);                                        // upper right
    seg(bladeB, 2.665, .19, .025);                                                // middle
    seg(bladeB + (hall === 2 ? -.082 : .082), 2.620, .025, .10);                 // lower side
    seg(bladeB, 2.575, .19, .025);                                                // bottom
  }
  sideHallPortal(1.48, 2);
  sideHallPortal(2.88, 3);

  // ---------------------------------------------------------------- posters everywhere else
  // The last stretch of back wall past the box office, two on the east party wall where the shell's
  // lightbox used to be, and two standees standing on the carpet. The west cases have become the
  // physical routes to 二号厅 and 三号厅 above.
  posterCase(.68, 7.62, 1.00, 1.46, 1.86, FILM[2], 0, true);
  posterCase(.95, 8.23, 1.06, 1.56, 1.78, FILM[3], -1);
  posterCase(3.62, 8.23, 1.06, 1.56, 1.78, FILM[4], -1);
  // Both are pulled back out of the walking line for the same reason the bin was — see there. A
  // standee is a metre of cardboard on a foot and its collider is half a metre deep; at a 3.05 the
  // west one closed the only route to the auditorium doors, and this is invisible in a screenshot
  // and obvious in the collision map.
  standee(2.10, 7.55, FILM[5]);
  standee(2.20, -6.35, FILM[3]);

  // ---------------------------------------------------------------- the window
  // The shopfront is the only part of a shop most people ever see, and the shell fills an
  // undressed one with two stone plinths of cardboard cartons per bay — which is what this cinema
  // had in its window. `o.win` is set in mall.js's `shop()` call and a tenant file cannot reach
  // it, so the bays are dressed from in here instead: a solid dark dado laid over the shell's
  // timber platform, deep enough and tall enough to swallow the plinths and the cartons whole,
  // and two lit cases standing on it. Which is also simply what a cinema frontage is.
  //
  // The dado is deliberately 2 cm shy of the platform's own footprint on every side rather than
  // flush with it: built to the same 1.05 x 6.70 the two would have had four pairs of exactly
  // coincident vertical faces, which is the other way this renderer produces speckle. Its front
  // stops at 4.70, a centimetre behind the stall riser, and the cases stand at a 4.44–4.69,
  // clear of the glass at 4.757.
  for (const s of [-1, 1]) {
    A.put(4.19, s * 5.00, 1.02, 6.60, 1.06, .53, K.ink, {hard:true, gloss:.14, ...MB});
    A.put(4.19, s * 5.00, 1.06, 6.68, .06, 1.08, K.char, {hard:true, gloss:.30, ...MS});
    A.put(4.715, s * 5.00, .02, 6.50, .04, 1.00, K.warmD, {hard:true, mode:1, glow:.06});
    for (const [k, f] of [[3.46, FILM[1]], [6.54, FILM[4]]])
      posterCase(4.52, s * k, 1.42, 1.72, 2.06, f, 0, true);
    A.stop(3.62, 4.72, s * 1.55, s * 8.45);
  }

  // ---------------------------------------------------------------- hanging signs
  // Two panels on drop rods under the soffit, one over each half of the room, saying which end of
  // a seventeen-metre foyer is which. This is the piece that was missing from the walk in: the box
  // office is five metres off-centre and the auditorium doors are seven the other way, and from
  // the doorway both are edge-on. Hung at 2.55–2.85 they are above every head and below the soffit,
  // and single-sided on purpose — you read them walking in, which is the only direction they are
  // any use in, and a second face is three more glyph quads that can never join a batch.
  for (const [sb, word] of [[2.60, '售票处'], [-4.30, '一号厅']]) {
    A.put(2.60, sb, .06, .92, .30, 2.70, K.board, {hard:true, mode:1, glow:.05});
    A.put(2.63, sb, .02, .88, .022, 2.565, K.warm, {hard:true, mode:1, glow:.09});
    A.glyph(2.645, sb, 2.71, word, {size:.125, gap:.042, color:K.goldL, glow:.13});
    for (const s of [-1, 1]) A.cyl(2.60, sb + s * .37, 3.07, .012, .44, K.steelD, {gloss:.5});
  }

  // ---------------------------------------------------------------- collision
  // The shell already blocks a < .45 across the back of the shop on every deck above the first,
  // so these are only for what stands proud of it; the two counters block themselves inside
  // `A.counter`, and the chiller, the bench, the bin, the podiums, the standees and the window
  // dados each carry their own above.
  A.stop(.45, 1.15, -5.45, -3.25);     // the back bar and the fountain
  A.stop(.45, .90, -8.45, -5.45);      // the doors
  A.stop(.45, .92, -2.35, 1.85);       // the middle bay
  A.stop(.45, 1.00, 1.88, 8.25);       // the box office backdrop, its board and the case past it

  // ---------------------------------------------------------------- light
  // Four, and every one of them is pointed at a fitting rather than at the room. Eight lights
  // reach the shader and the nearest to the camera win, so standing at the box office these are
  // the near ones and the concourse's are not.
  A.light(2.10, TB, 2.20, [1.00, 0.85, 0.62], .40, 3.6);      // over the box office
  A.light(1.95, CB, 2.10, [1.00, 0.80, 0.54], .36, 3.3);      // over the concession
  A.light(1.55, DB, 2.10, [0.98, 0.58, 0.46], .26, 2.9);      // the doors end, in the house red
  A.light(1.50, FB, 2.20, [1.00, 0.86, 0.66], .30, 3.0);      // the middle bay

  // ---------------------------------------------------------------- 散场 · the house letting out
  // Six people walking out of 一号厅 four minutes after the film in it finishes, and the foyer
  // lights coming up while they do. This is the piece that turns a programme into a building: the
  // times on the board stop being decoration the first time you are standing at the concession and
  // a screening you did not go to empties past you.
  //
  // They are silhouettes, and deliberately so. A cinema foyer at let-out is people crossing between
  // you and the marquee, which is the one place in this game where three dark primitives read
  // better than a figure rig would — and they cost three instanced draws each rather than a
  // skinned mesh apiece.
  //
  // Parked at a .20 when nothing is letting out: the shell blocks a < .45 and the lining's front
  // face is at .50, so anything at .20 is behind an opaque single-sided wall and depth-culled. That
  // is cheaper and more honest than fading them, because alpha on a mode-7 body is not a thing this
  // renderer does the way alpha on a lit panel is.
  const COATS = [C('#2a2f3a'), C('#3a2a2c'), C('#26313a'), C('#332c26'), C('#2c2a36'), C('#38312a')];
  const SKINS = [C('#c8a583'), C('#b8926e'), C('#d3b18c'), C('#a9825f'), C('#c49c78'), C('#bb8f68')];
  // The route out: behind the doors, through them, down the public strip at a 3.25 — the 40 cm of
  // floor outside the queue rope and inside the window platform that the two walking shoppers
  // already use — and out through the only gap in the glazing, which is b -1.5 to 1.5.
  const WALK = [[.20, DB], [.95, DB], [1.85, DB + .30], [3.05, DB + .95],
                [3.25, -5.10], [3.25, -2.40], [3.25, -.30], [4.10, .10], [5.30, .30]];
  const crowd = [];
  for (let i = 0; i < 6; i++) {
    const bb = DB + (i % 3 - 1) * .34, aa = .20;
    const coat = COATS[i], skin = SKINS[i], tall = .94 + (i % 4) * .045;
    const legs = A.cyl(aa, bb, .34 * tall, .105, .68 * tall, C('#1b1e24'), {gloss:.12});
    const body = A.cap(aa, bb, 1.06 * tall, .40, .62 * tall, .25, coat, {mode:7, gloss:.10});
    const head = A.ball(aa, bb, 1.50 * tall, .092, .108, .092, skin, {mode:7, gloss:.14});
    // One cull sphere per part, centred on the middle of the route and wide enough to hold all of
    // it: these translate right across the unit, and a sphere packed round where they were built
    // would cull them the moment they set off.
    for (const p of [legs, body, head]) A.dynamic(p, 2.70, -3.30, 1.00, 4.90);
    crowd.push({ parts:[legs, body, head].map(p => ({ p, x:p.m[12], y:p.m[13], z:p.m[14] })),
                 base:A.at(aa, bb), lane:(i % 3 - 1) * .34, phase:i * .085, tall });
  }
  // Where somebody is at u along the route, in (a, b). Piecewise so the corner out of the doors is
  // a corner rather than a diagonal across the queue rope.
  function walkAt(u) {
    const n = WALK.length - 1, f = Math.max(0, Math.min(.999999, u)) * n;
    const i = Math.floor(f), k = f - i, p0 = WALK[i], p1 = WALK[i + 1];
    return [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k];
  }

  const foyerPower = A.powerDisplay
    ? A.powerDisplay(displayParts, {
        id:'foyer-displays',
        // mall.js continues advancing the schedule while this board is dark. Apply its cached
        // target exactly once on the opening edge so an overnight clock jump cannot revive the
        // lamp for yesterday's row.
        restore:()=>lamps.forEach(p=>{ if(p.glow0!==undefined)p.glow=p.glow0; }),
      })
    : {active:true};

  // ---------------------------------------------------------------- motion
  // Four things move in this foyer and every one of them is gated.
  //
  //  * the marquee sweeps. A travelling head is not a flash and is not capped, but it stops dead
  //    under reduced motion — MotionSafety.sweep returns -1 and the bulbs settle at their resting
  //    glow rather than freezing wherever the head happened to be.
  //  * the three house lamps on the ribbon *step*, which is a flash, so they go through
  //    MotionSafety.step and physically cannot exceed 2.4 Hz.
  //  * the house lights ramp over four minutes of game time. Not a flash, not capped, and not
  //    stopped under reduced motion: it is the room changing state, the same way night falling is.
  //  * the crowd walks. Also not stopped under reduced motion, for the same reason the mall's own
  //    NPCs are not — a person walking across a room at 1 m/s is not the hazard this gate is for,
  //    and freezing them would leave six bodies standing in the doorway.
  // `minutes` arrives with the frame; the calendar day does not, and `__game.state()` builds a
  // large object every time it is asked, so it is read at most once a second and cached. Which day
  // it is only changes the seating plan and which screening is next, neither of which can move
  // inside a second.
  let dayAt = -1e9, dayNo = 1;
  let ticketAt = -1e9;
  const ticketGate = { has:false, hall:0, ok:false, reason:'没有票' };
  A.motion('foyer',(t,state,P,minutes)=>{
    const MS = window.MotionSafety;
    if (t - dayAt > 1) {
      dayAt = t;
      try { const g = window.__game; if (g && g.state) dayNo = Math.max(1, g.state().day | 0); }
      catch (e) { /* before the game is up, day 1 is as good an answer as any */ }
    }
    // ---- the marquee
    const head = MS.sweep(t, .34);
    marqueeBulbs.forEach((p,i)=>{
      if (head < 0) { p.glow = .13; return; }
      const u=i/marqueeBulbs.length, d=Math.min(Math.abs(u-head),1-Math.abs(u-head));
      p.glow=.08+Math.max(0,1-d*7.5)*.16;
    });
    state.chase = head;
    state.bulbs = marqueeBulbs.length;

    // ---- which house is next in, off the same programme the picker sells from
    const mins = typeof minutes === 'number' ? minutes : 14 * 60;
    let nextHall = 0;
    try { const s = CinemaSys.nextShow(dayNo, mins); nextHall = s ? s.hall : 0; }
    catch (e) { nextHall = 0; }
    // step() returns -1 when it is not allowed to blink, which is the resting frame: the lamp for
    // the next house sits lit rather than pulsing, and the other two stay dark.
    const blink = MS.step(t, 1.2, 2);
    if(foyerPower.active) hallLamps.forEach((p,i)=>{
      const mine = CinemaSys.HALLS[i].id === nextHall;
      p.glow = mine ? (blink < 0 ? .16 : blink ? .22 : .07) : .02;
    });
    state.displayPower=foyerPower.active?'on':'off';
    state.nextHall = nextHall;

    // ---- the ticket-tear podiums. CinemaSys.doorCheck() answers time/day/3D validity; the
    // current ticket supplies the destination, because this pair of podiums guards 一号厅 rather
    // than every auditorium in the programme. Read four times a second, not every render frame:
    // a ticket decision changes only after an action or a game-minute boundary.
    if (t - ticketAt > .25) {
      ticketAt = t;
      try {
        const ticket = CinemaSys.ticket(), decision = CinemaSys.doorCheck();
        ticketGate.has = !!ticket;
        ticketGate.hall = ticket ? ticket.hall | 0 : 0;
        ticketGate.ok = !!(decision && decision.ok && ticketGate.hall === 1);
        ticketGate.reason = ticketGate.hall && ticketGate.hall !== 1
          ? '走错厅' : decision && decision.hz ? decision.hz : '没有票';
      } catch (e) {
        ticketGate.has = false; ticketGate.hall = 0; ticketGate.ok = false;
        ticketGate.reason = '没有票';
      }
      // Reuse the ticket gate's four-hertz poll: student eligibility changes on an action, not on
      // a render frame.  Only the transition writes retained alpha, and all three rows already
      // exist in the glyph atlas and instance batches.
      try {
        const offer = CinemaSys.offerState();
        if (offer && offer.key !== state.studentOfferKey) {
          const eligible = offer.key === 'eligible';
          for (const p of studentCard.required) p.alpha = eligible ? .001 : 1;
          for (const p of studentCard.eligible) p.alpha = eligible ? 1 : .001;
          state.studentOfferKey = offer.key;
          state.studentOfferAvailable = offer.available ? 1 : 0;
          state.studentOfferYuan = offer.offerYuan;
        }
      } catch (e) { /* a blank retained card is safer than an invented offer */ }
    }
    const gateColor = ticketGate.ok ? K.lampG : ticketGate.has ? K.lamp : K.lampD;
    const gateGlow = ticketGate.ok ? .28 : ticketGate.has ? .17 : .055;
    ticketCheckLamps.forEach(p => { p.color = gateColor; p.glow = gateGlow; });
    state.ticketCheck = ticketGate.ok ? 1 : 0;
    state.ticketHall = ticketGate.hall;
    state.ticketReason = ticketGate.reason;

    // ---- 散场. One number out of CinemaSys, driving the bodies and the lights together.
    let out = { k:0, hall:0 };
    try { out = CinemaSys.letOut(dayNo, mins); } catch (e) { out = { k:0, hall:0 }; }
    const k = out.k;
    crowd.forEach((c,i)=>{
      // Parked at u 0 (behind the lining) whenever nothing is letting out, so the whole rig costs
      // one matrix write per part and nothing is ever visible that should not be.
      const u = k <= 0 ? 0 : Math.max(0, Math.min(1, k * 1.35 - c.phase));
      const w = walkAt(u);
      const p = A.at(w[0], w[1] + (u > .12 ? c.lane : 0));
      const bob = u > .02 && u < .99 ? Math.sin(t * 5.2 + i * 1.7) * .018 : 0;
      c.parts.forEach(q=>{ q.p.m[12] = q.x + p[0] - c.base[0];
                           q.p.m[13] = q.y + bob;
                           q.p.m[14] = q.z + p[1] - c.base[1]; });
    });
    // The lights come up with them. `glow0` is what mall.js's own night mix multiplies against on
    // the props it owns; these are the tenant's own, so the value is written straight.
    houseLamps.forEach(p => { p.glow = p.rest + k * p.rise; });
    starPlates.forEach(p => { p.glow = .09 * (1 - k * .72); });
    state.letOut = +k.toFixed(3);
    state.letOutHall = out.hall;
    state.crowd = crowd.length;
    state.reduced = MS.reduced() ? 1 : 0;
  },{far:30});

  // ---------------------------------------------------------------- what you can do in here
  // 电影院 opens the day's programme and sells a seat (game.js's `openCinema`, off `mallTicket`);
  // 排片表 reads the board; 爆米花 buys a bag. The cinema has no MALL_GOODS catalogue and nothing
  // that goes in a basket — the money moves and the seat number is issued when you pick a showing
  // out of the picker, which is why the box office counter is built with `till:false`.
  //
  // Two coordinates matter and they are not the same one. The *label* wants to be on the object,
  // and the *focus* is where the game expects you to be standing when you use it: `inReach` is
  // the distance from the player to the focus, so a focus point in the middle of a counter is a
  // word you can never say. `th` derives the focus as a + 1.15 and every one of the three was
  // taking that default, which put two of them inside the window platform — the public floor in
  // this unit is the 1.2 m strip between the front of the counters at a 2.40 and the platform at
  // 3.62, and a + 1.15 walks straight out of it. So each one names its own, measured against the
  // collision map rather than guessed: `A.at` turns the shop's frame into the world coordinates
  // `focus` is kept in, which is the only reason this can be written in (a, b) at all.
  const reach = (t, a, b) => { const p = A.at(a, b); t.focus[0] = p[0]; t.focus[1] = p[1]; return t; };
  // On the glass of position 二, which is the window with a clerk behind it and the queue at it.
  const boxOffice = reach(A.th('电影院', 1.80, T0 + 1.5 * PITCH, '我买一张票。', 'One ticket, please.',
    '电影 film + 院 venue — 买电影票 is what you do at 售票处.', 2.2, 1.62),
    2.90, T0 + 1.5 * PITCH);
  // What CinemaSys.openBoxOffice() should be opened off. The word, the reach and the existing
  // `mallTicket` USE row are all unchanged, so this is inert until game.js reads it.
  boxOffice.cinemaBox = true;
  // On the board itself, over the middle of the box office; you stand out in front of the counter
  // and read it, which is 50 cm clear of the counter's own collider.
  const boardThing = reach(A.th('排片表', .80, TB, '今天有什么电影？', 'What films are on today?',
    '排片 the programme + 表 table.', 2.6, 2.62), 2.90, TB);
  boardThing.cinemaBoard = true;
  // Just above the popcorn warmer's hood — inside it at any lower height, which is where a label
  // put at counter level ends up on a machine you can see into.
  reach(A.th('爆米花', 2.10, PB, '来一份爆米花。', 'A bag of popcorn, please.',
    '爆 to burst + 米 rice + 花 flower.', 2.0, 2.22), 2.95, PB);

  // ---------------------------------------------------------------- the board keeps the clock
  // mall.js's `setClock` walks its own SHOWS and lights the lamp beside whichever screening is
  // next, if that row has one — the inline fit set `lamp` while it built the board. A tenant file
  // cannot: `Mall` is a Lazy module and this callback runs *during* its build, so reaching for
  // Mall.SHOWS from here throws "asked for itself while it was still being built".
  //
  // `Lazy.onBuild` is the door that is open at that moment: registered during the build, it is
  // called with the finished module at the end of it, before whoever forced the build gets their
  // property back. So the lamps are attached before the first `setClock` can run, and a board
  // that follows the hour costs one glow per row and no rebuilding. Guarded at every step,
  // because a wired-up extra is not worth a room that fails to build.
  if (typeof Lazy !== 'undefined' && typeof Lazy.onBuild === 'function')
    Lazy.onBuild('Mall', M => {
      if (!M || !Array.isArray(M.SHOWS)) return;
      M.SHOWS.forEach((s, i) => { if (lamps[i]) s.lamp = lamps[i]; });
    });
};

// ===============================================================================================
// The two shopfront windows. The auditorium already supplies motion and the lobby already carries
// readable showtimes, so the frontage is a static poster gallery: three invented abstract films in
// each bay, framed as one installation. Smoked glass makes this tenant feel darker than retail
// downstairs without hiding the restrained poster lightboxes behind it.
//
// Budget: four shared pieces plus three seven-piece posters per bay, exactly 25 each and 50 total.
// The 5.55 m backboard leaves more than .7 m clear at both the doorway and the outer shop corner.
MallFit['电影院:glass'] = { alpha: .31, gloss: .87 };
MallFit['电影院:win'] = (W, bc, side) => {
  const black = C('#111417'), ink = C('#232329'), oxblood = C('#542326');
  const brass = C('#c69a50'), cream = C('#eee2c9'), blue = C('#315f86');
  const violet = C('#684b78'), jade = C('#3f7167'), amber = C('#c57935');
  const red = C('#8b3438'), moon = C('#f0d8a0');

  // A black deck and oxblood wall turn the unusually wide window into a miniature poster foyer.
  // Backboard, frames, faces and artwork advance toward the glass in separate depth planes.
  W.put(4.18, bc, .96, 5.55, .045, .363, black, { hard:true, gloss:.28 });
  W.put(3.76, bc, .070, 5.55, 1.52, 1.39, oxblood, { hard:true, gloss:.20 });
  W.put(3.805, bc, .014, 5.18, .035, 2.115, brass,
    { hard:true, mode:1, glow:.055 });
  W.put(3.805, bc, .014, 5.18, .026, .675, brass,
    { hard:true, mode:1, glow:.035 });

  const colors = side < 0 ? [blue, amber, red] : [violet, jade, amber];
  const offsets = [-1.75, 0, 1.75];
  for (let i = 0; i < 3; i++) {
    const b = bc + offsets[i], color = colors[i];
    W.put(3.840, b, .080, 1.30, 1.18, 1.410, black,
      { hard:true, gloss:.34 });
    W.put(3.890, b, .018, 1.18, 1.06, 1.410, color,
      { hard:true, mode:1, glow:.060 });

    // Celestial disc, horizon, title block and two credit rules: recognisable cinema language,
    // but no borrowed title, character or studio mark.
    W.ball(3.914, b - .25 + i * .05, 1.690 - i * .055,
      .115, .115, .115, i === 1 ? cream : moon, { mode:1, glow:.060 });
    W.put(3.908, b + .10 - i * .08, .010, .68, .18, 1.425, black,
      { hard:true, gloss:.18 });
    W.put(3.914, b, .010, .82, .105, 1.125, cream,
      { hard:true, mode:1, glow:.045 });
    W.put(3.916, b, .008, .62, .032, 1.010, brass,
      { hard:true, mode:1, glow:.030 });
    W.put(3.918, b, .006, .42, .024, .945, cream,
      { hard:true, mode:1, glow:.020 });
  }
};

// ==================================================================== the people in it
// Three who work here and ten who came to see a film, pushed onto `MallCast` (declared in
// js/mall.js) so game.js folds them into the roster before the world is built. Nothing about them
// belongs in game.js: eighteen tenants editing one argument list is how the whole game goes down
// while one shop improves.
//
// ---------------------------------------------------------------- the frame these are written in
// `at` and `patrol` are the MALL's world coordinates and this file thinks in (a, b), so every
// number below has been through
//
//        x = b - 2.00        z = 18.00 - a
//
// which is `shop('S', -2.0, 17.0)` unrolled: the south wall's base is z = +RZ = 18, its inward
// normal is -z, and its tangent is +x offset by the unit's own centre at x = -2. The two things
// that fall out of that and are worth stating, because getting either backwards puts somebody
// inside a counter:
//
//   * a *larger* a is a *smaller* z. Depth runs towards the concourse, z runs away from it.
//   * `face` is a yaw whose direction is (sin, cos) in (x, z) — the same convention the glyphs
//     use. So staff, who stand at small a and look out at the customers, face +pi; customers,
//     who stand at large a and look at the counter, face 0. Half a turn out and a clerk serves
//     the back wall.
//
// `mallFloor: 3` on every one of them. Without it they stand on the ground floor's concourse,
// which on this deck means nine metres under the carpet they think they are on.
//
// ---------------------------------------------------------------- where a body actually fits
// The staff aisles here are narrow and they were measured rather than guessed. Behind the box
// office the free depth is the 0.6 m between the backdrop at a 0.66 and the counter carcass at
// 1.325, so the clerk stands at a 1.06; behind the concession it is the 0.42 m between the back
// bar's worktop at 0.95 and the bar at 1.375, so she stands at 1.165 and there is nowhere else
// along that run she could. The customers are all in the public strip between the counters at
// a 2.40 and the window platform at 3.62, and the ones at the box office are inside the rope at
// a 3.10 because that is what being served means.
//
// Standing people are never moved by the collision map — `updateNPCs` only clamps a body that is
// actually walking — so a spot inside a counter's own collider is stable, and it is also wrong:
// what stops somebody standing in the joinery is the geometry, not the clamp. Every one of these
// was checked against the props, not against the blocks.
if (typeof MallCast !== 'undefined') MallCast.push(

  // ---------------------------------------------------------------- who works here
  // The box office, at position 二 — the second of the four windows, and the one the 电影院
  // hotspot is on, so the person you are buying from is behind the glass you are standing at.
  { hz:'售票员', name:'何雅琴', py:'Hé Yǎqín', place:'mall', mallFloor:3,
    rig:'mall-cinema-ticket-he-yaqin', temper:'brisk',
    look:{skin:'#e9c19b',hair:'#221c19',hairStyle:'bob',top:'#f0e8dc',pants:'#39323a',
      shoe:'#2a252a',vest:'#7d2626',tall:.97,faceSeed:7421},
    spots:[{h0:10,h1:23,at:[1.925,16.94],face:Math.PI,act:'vend'}],
    lines:[['一张四十五，您看哪一场？','Forty-five a ticket — which screening would you like?'],
           ['座位号印在票上，一号厅在西边。','The seat number is on the ticket; screen one is at the west end.'],
           ['下一场快开始了，请先检票。','The next one starts soon — have your ticket checked first.']] },

  // The concession, in the 0.42 m between the back bar and the counter. `收银员` rather than
  // `服务员`: the waitress's verb in js/data.js is 点菜 and carries `orderUp`, which is the
  // diner's ordering flow and has no business running in a cinema foyer.
  { hz:'收银员', name:'陆佳颖', py:'Lù Jiāyǐng', place:'mall', mallFloor:3,
    rig:'mall-cinema-cashier-lu-jiaying', temper:'genial',
    look:{skin:'#d8a87e',hair:'#2c2420',hairStyle:'ponytail',top:'#efe3cf',pants:'#3c3a44',
      shoe:'#2b3034',vest:'#48151a',cap:'#48151a',tall:.95,faceSeed:7422},
    spots:[{h0:10,h1:23,at:[-6.40,16.835],face:Math.PI,act:'vend'}],
    lines:[['爆米花二十，可乐十二。','Popcorn is twenty, cola is twelve.'],
           ['大桶的够两个人吃。','The big tub is enough for two.'],
           ['开场前十分钟就可以进场。','You can go in ten minutes before it starts.']] },

  // At the west podium, by the doors into 一号厅, where the tickets are torn. `保安` because there
  // is no 检票员 in js/data.js and that file is not this file's to edit — and 问路 is exactly the
  // verb: what he is for is telling you which end of seventeen metres your screen is at.
  { hz:'保安', name:'郑师傅', py:'Zhèng shīfu', place:'mall', mallFloor:3,
    rig:'mall-cinema-security-zheng-shifu', temper:'watchful',
    look:{skin:'#cf9a70',hair:'#26211e',hairStyle:'buzz',top:'#dfe4e8',pants:'#28303c',
      shoe:'#20262b',jacket:'#3a2026',collar:'shirt',tall:1.05,wide:1.04,faceSeed:7423},
    spots:[{h0:10,h1:23,at:[-9.45,16.25],face:2.45,act:'wait'}],
    lines:[['一号厅在这边，请出示电影票。','Screen one is this way — please show your ticket.'],
           ['售票处在那头，走到底就是。','The box office is at the far end, right down there.'],
           ['开演以后手机请调成静音。','Once it starts, please put your phone on silent.'],
           // The two rules he actually enforces, said out loud before you find them out at the
           // door. Late entry and the 3D house are both CinemaSys.doorCheck() decisions, and a
           // learner should meet the sentence before they meet the refusal.
           ['开演二十分钟以内还能进，我给您照个亮。',
            'You can still go in up to twenty minutes in — I will light your way.'],
           ['三号厅是 3D 的，没有眼镜进不去。',
            'Screen three is 3D — you cannot go in without glasses.'],
           ['前面九分钟是广告和预告片，不用急。',
            'The first nine minutes are adverts and trailers, so there is no rush.']] },

  // ---------------------------------------------------------------- and who is queueing
  // Nobody below has a name or a line. That is the mall's own convention for a crowd and it is
  // also a build step: a line with no clip in audio/voice is silent and .speechcheck fails on it,
  // so anonymous shoppers cost nothing and three named staff cost one bake.
  //
  // At the window, mid-transaction. `buy` is the box-office pose — square to the counter, head
  // down, near hand up — which is what the machine version of this looks like in the metro.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'steady',
    look:{skin:'#dcae86',hair:'#241e1b',hairStyle:'short',top:'#5f7688',pants:'#3a4149',
      shoe:'#262b2e',bag:'shoulder',bagColor:'#4a4038',tall:1.03},
    spots:[{h0:10,h1:23,at:[1.925,15.28],face:0,act:'buy'}] },
  // Two more behind her, inside the rope, turned a little towards the head of the line rather
  // than square to the counter — a queue is people looking at the back of the person in front.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'patient',
    look:{skin:'#e6b68c',hair:'#2b2320',hairStyle:'bun',top:'#a85f6d',pants:'#454b56',
      shoe:'#ebe4d7',bag:'tote',bagColor:'#c4a05c',tall:.98},
    spots:[{h0:10,h1:23,at:[2.85,15.24],face:-0.32,act:'wait'}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bored',
    look:{skin:'#c99269',hair:'#302622',hairStyle:'tousled',top:'#7c8a6f',pants:'#333e4a',
      shoe:'#2a2f33',jacket:'#405b68',tall:1.06},
    spots:[{h0:10,h1:23,at:[3.55,15.24],face:-0.28,act:'wait'}] },
  // and a child at the back of it, half a metre off her father's elbow.
  { hz:'小孩', place:'mall', mallFloor:3, temper:'eager',
    look:{skin:'#efc39a',hair:'#2a211d',hairStyle:'short',top:'#e2ad3c',pants:'#4f6f9a',
      shoe:'#e55243',tall:.70,wide:.82,youth:1,headScale:1.10,faceSeed:7424},
    spots:[{h0:10,h1:23,at:[3.85,15.42],face:-0.20,act:'wait'}] },

  // At the concession, opposite the person serving it, and one waiting behind.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'genial',
    look:{skin:'#d09b72',hair:'#36312e',hairStyle:'short',top:'#667d72',pants:'#3a4149',
      shoe:'#252a2e',collar:'shirt',tall:1.04},
    spots:[{h0:10,h1:23,at:[-6.40,15.28],face:0,act:'buy'}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bored',
    look:{skin:'#edbc94',hair:'#2a211e',hairStyle:'ponytail',top:'#7189a0',pants:'#4d4554',
      shoe:'#eee6d9',pack:true,packColor:'#8a5f3e',tall:.96},
    spots:[{h0:10,h1:23,at:[-5.45,15.20],face:0.22,act:'wait'}] },

  // On the bench in the middle bay, waiting for the doors. `seatY` is the top of the cushion and
  // the bench is built to put it at .47 — take it off, or move the bench, and they sit in the air
  // or through their own seat. The two `at` are the centres of the two cushions.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'patient', seatY:.47,
    look:{skin:'#d6a37b',hair:'#332b26',hairStyle:'bob',top:'#8f9d8a',pants:'#3b434d',
      shoe:'#2a2f33',tall:1.00},
    spots:[{h0:10,h1:23,at:[-2.865,16.72],face:Math.PI,act:'sit'}] },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bored', seatY:.47,
    look:{skin:'#e8ba90',hair:'#231d1a',hairStyle:'short',top:'#b5643f',pants:'#414954',
      shoe:'#e6dfd2',tall:1.02},
    spots:[{h0:10,h1:23,at:[-1.635,16.72],face:Math.PI,act:'phone'}] },

  // ---------------------------------------------------------------- and two who are walking
  // Both laps run down the public strip at a 3.25, which is the 40 cm of floor outside the queue
  // rope and inside the window platform. The first goes out through the shopfront opening — the
  // gap in the glass is b -1.5 to 1.5 and nowhere else — and back, so the room has somebody
  // arriving in it rather than a fixed tableau.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bustling',
    look:{skin:'#dbaa83',hair:'#29211d',hairStyle:'ponytail',top:'#c06b58',pants:'#46566a',
      shoe:'#ece6da',bag:'tote',bagColor:'#d4ad55',tall:1.00},
    patrol:[[3.80,14.75],[-0.40,14.75],[-1.50,13.60],[-2.30,12.20],[-1.70,13.60],
            [-2.60,14.75],[-6.40,14.75],[-8.80,14.75],[3.80,14.75]], speed:1.02 },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'steady',
    look:{skin:'#c4906a',hair:'#2f2723',hairStyle:'short',top:'#5c6f7d',pants:'#363d45',
      shoe:'#282d31',tall:1.07},
    patrol:[[5.60,14.75],[0.60,14.75],[-1.60,15.60],[-1.60,14.75],[5.60,14.75]], speed:.94 },
);
