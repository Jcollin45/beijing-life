// 宠物店 · 宠爱宠物 · CHONGAI PETS — floor 1
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
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------- seven things this unit knows
//
// 1. `A.put` is sized (w, dp) = (along a, along b) — it runs through the shop's `dim()` so the
//    same numbers work on any of the four walls. `A.cyl/ball/cap/taper` do NOT: they hand their
//    sizes straight to the world axes. This unit is on the south wall, where world x is the b
//    axis and world z is the a axis, so for every rounded shape below the first size is along b,
//    the second is height, the third is along a. `ball` takes radii; `put`, `cap` and `taper`
//    take whole dimensions. Everything here is written for that.
//
// 2. `A.glyph` writes on a plane facing the concourse and there is no way to turn it: the yaw
//    comes from which wall the shop is on. So a sign on a *side* wall cannot be written on the
//    side wall — it has to be a blade hung off it, facing front, which is what a real shop does
//    with an aisle sign anyway. Both side signs below are built that way.
//
// 3. The shell has already built things in this room, and three of them are no-go volumes. The
//    timber feature panel runs a .32–.40 across b ±1.81, so nothing may put its back behind
//    a = .40 or the fins show straight through it. The shop's own name is written at a .43,
//    y 1.82–2.08, across b ±0.66 — which is why the two back-wall runs stop at b ±0.70 and the
//    middle is left as a bay. And each side partition carries a lightbox at a 1.63–2.97,
//    y 1.40–2.70, b ±(4.10–4.22), so the side runs *in that depth band only* stay under 1.35.
//    Fore and aft of it they go full height, which is where this room gets its walls back.
//
// 4. A fixture you can see into cannot be a hollow frame with a panel behind it. The first pass
//    of this file built each tank as a 5 cm slab of blue with the plants and fish floating in
//    front of it, and from two metres you saw straight between the tanks to the wall. A tank is a
//    *volume*: 40 cm of water filling the whole box, then the gravel, planting and fish in the
//    22 cm in front of it, then the glass. Same for a pen — the cell's back, sides and glass are
//    sized to the cell, not to something smaller sitting inside it. And an upper display unit is
//    a back, two cheeks and shelves, never a solid box, or the goods are inside the joinery.
//
// 5. An animal is not a coloured ball. What separates a puppy from a plush toy at two metres is a
//    muzzle that projects, two dark eyes on the front of the face, ears that break the outline,
//    four legs under it and a tail. The first pass had a head sphere with two ear discs and a
//    nose, and every one of them read as a bear. They are placed head-outward, towards the glass,
//    because a puppy in a shop is always looking at whoever is looking at it.
//
// 6. Materials multiply the colour they are given — `base *= mix(1, texel/0.22, matAmt)` — and no
//    map here averages 0.22, so a textured surface comes out brighter than the colour it was
//    painted. That is a shader-side problem being fixed centrally; nothing here tries to cancel
//    it with a private correction table. What this file does do is keep `nrmAmt` at .30 rather
//    than the default 1, because at 1 the relief reads as a grey cloud sitting on the surface
//    instead of as grain, and use the house `matAmt` of ~.30 throughout.
//
// 7. Draw calls. Props batch on mesh, mode, round, bevel and material — *not* on colour or gloss,
//    so the animals may all be different colours and still cost one call between them. Tagged
//    mode-1 alpha pieces and glyphs now batch too; unmatched translucency remains the expensive
//    exception. Glass stays sparse, signage short, and the shelves may be as full as they like.

// =============================================================================================
// PetSys — 宠爱宠物, and the one decision in this file that is not about geometry
// =============================================================================================
// The fit-out below builds the shop: eight species, six tanks, a koi vat, a grooming bay, a feed
// pallet, a wall of leads and an adoption corner with a desk and a form on it. All of it is
// scenery. This is what any of it does.
//
// It lives in this file for the same reason the fit-out and the cast do: one owner per file.
// Nothing here edits or patches js/game.js and nothing here throws if game.js is not wired yet.
// Nothing here runs from a frame either — every function below is called on a click.
//
// ---------------------------------------------------------------- the judgement call, made
// The brief was to build the pet shop and to decide how animals leave it. The decision is that
// **an animal is never a line item**, and it is enforced structurally rather than stated:
//
//   * `SUPPLIES` — food, litter, leads, collars, toys, tanks, filters, flake — is a till list and
//     goes through the basket like anything else in this building.
//   * `ANIMALS` has no price on it at all. There is no field to put one in. The only way an animal
//     leaves this shop is `adopt()`, which is a conversation, a form, a home visit on a later day
//     and a **refundable deposit** — 押金, which comes back, and which the panel says out loud is
//     not a purchase price.
//   * the flow can end in 不行. Being turned down is a real outcome with a stated reason and an
//     invitation to come back, and it is not a failure the player can retry by clicking again.
//
// The pacing is the point. Buying a bag of cat food is two clicks. Adopting the cat is four
// separate visits across three or four game days, and the shop is doing the deciding for at least
// one of them. If those two things take the same number of clicks then the shop has told the
// player they are the same kind of act, which is the thing this module exists not to do.
//
// ---------------------------------------------------------------- 报告，不改
// `MALL_GOODS['宠物店']` in js/data.js currently sells **{ hz:'金鱼', en:'a goldfish', price:20,
// keep:1, mood:14 }** — a live animal on the till list between a lead and a bag of dog food, which
// is precisely the arrangement above exists to refuse. js/data.js belongs to the lead, so it is
// reported rather than edited. See the report at the end of this file; nothing in `SUPPLIES` below
// duplicates or competes with that row, and `adopt()` covers fish along with everything else.
//
// ---------------------------------------------------------------- retained-state frame cost
// No animal in this shop is a rig. Every one of the eight species below is drawn by the fit-out
// out of ellipsoids and capsules at mode 7 — see notes 5 and 7 at the top of this file — and they
// batch. Adoption adds one three-quad status stamp and no new animal; grooming retains three foam
// puffs and one dryer lamp and reuses the towel that was already here. The tank shimmer, hamster
// wheel and birds remain the only three `A.motion` entries: the last one also performs the cheap
// retained-state sync, so there is no fourth callback. Feeding, grooming and water changes remain
// state on stamps rather than private clocks.
window.PetSys = (function () {

  const NAME = '宠爱宠物', NAME_PY = 'Chǒng’ài Chǒngwù', NAME_EN = 'Chongai Pets';
  const PERSIST_KEY = 'bjlife.mall.pets.v1';
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

  // ---------------------------------------------------------------- the animals
  // Eight, and every one is a thing the fit-out below actually builds a model of, at the `at`
  // given. No `price` field, deliberately and permanently: see the note above.
  //
  // `weight` is how heavy the adoption is — 'full' takes a home visit on a later day, 'light' is
  // decided at the desk. That split is not squeamishness about small animals; it is what a shelter
  // actually does, because the thing a home visit is checking for is a dog that is alone eleven
  // hours a day and a cat that can get out of an unscreened window.
  // `needs` is the sentence 韩露 says about what it costs you afterwards, in hours rather than kuai.
  const ANIMALS = [
    { key:'dog',     hz:'小狗',  py:'xiǎo gǒu',  en:'a puppy',    at:[2.62, 1.35], weight:'full',
      // `alone` is 6, not 4. At 4 the mildest answer on the form — 四五个小时, which scores 5 —
      // already failed, so a puppy could not be adopted by anybody at all: the branch was dead and
      // the refusal message read as a bug report. What a shelter actually objects to is a full
      // working day, which is the 八九个小时 answer.
      years:'十二到十五年', yearsEn:'twelve to fifteen years', alone:6, monthly:400,
      needs:'一天遛两次，早晚各一次', needsEn:'walked twice a day, morning and night',
      note:'小 small + 狗 dog' },
    { key:'cat',     hz:'小猫',  py:'xiǎo māo',  en:'a cat',      at:[2.58, 3.06], weight:'full',
      years:'十五年以上', yearsEn:'fifteen years or more', alone:9, monthly:300,
      needs:'必须封窗，猫会从窗户掉下去', needsEn:'the windows must be screened — cats fall out of them',
      screen:true, note:'猫 cat. 封窗 fēng chuāng, screening the windows, is not optional' },
    { key:'rabbit',  hz:'兔子',  py:'tùzi',      en:'a rabbit',   at:[1.30, -2.30], weight:'full',
      years:'八到十年', yearsEn:'eight to ten years', alone:8, monthly:250,
      needs:'干草管够，笼子太小不行', needsEn:'unlimited hay, and a cage that is not a shoebox',
      note:'兔 hare + 子, the noun suffix' },
    { key:'hamster', hz:'仓鼠',  py:'cāngshǔ',   en:'a hamster',  at:[1.30, -3.20], weight:'light',
      years:'两到三年', yearsEn:'two to three years', alone:12, monthly:80,
      needs:'一只一个笼子，两只会打架', needsEn:'one per cage — two of them will fight',
      note:'仓 storehouse + 鼠 rodent' },
    { key:'budgie',  hz:'鹦鹉',  py:'yīngwǔ',    en:'a budgerigar', at:[2.20, -1.10], weight:'light',
      years:'七到十年', yearsEn:'seven to ten years', alone:8, monthly:120,
      needs:'鸟要有伴，一只会闷', needsEn:'birds need company — one on its own goes flat',
      note:'鹦鹉 parrot, and the character pair is used for a budgie too' },
    { key:'turtle',  hz:'乌龟',  py:'wūguī',     en:'a terrapin', at:[1.30, -1.05], weight:'light',
      years:'三四十年', yearsEn:'thirty or forty years', alone:24, monthly:60,
      needs:'能活三四十年，比养狗长', needsEn:'it will outlive most of the plans you have',
      note:'乌 black + 龟 tortoise. The reptile a Chinese pet shop actually sells' },
    { key:'lizard',  hz:'蜥蜴',  py:'xīyì',      en:'a lizard',   at:[1.30, .95], weight:'light',
      years:'八到十二年', yearsEn:'eight to twelve years', alone:24, monthly:150,
      needs:'要加热灯和紫外灯，电费不便宜', needsEn:'a heat lamp and a UV lamp, and they run all day',
      note:'蜥蜴 lizard, two characters that only ever appear together' },
    { key:'fish',    hz:'金鱼',  py:'jīnyú',     en:'goldfish',   at:[1.56, 0], weight:'light',
      years:'十年以上', yearsEn:'over ten years, if the water is right', alone:48, monthly:40,
      needs:'缸要大，小圆缸养不活', needsEn:'a proper tank — a little round bowl kills them',
      note:'金 gold + 鱼 fish. They are not a decoration and they are not disposable' },
  ];
  const animalOf = k => ANIMALS.find(a => a.key === k) || null;

  // ---------------------------------------------------------------- the till list
  // Everything here is a thing, and this is the whole of what the basket is for in this shop.
  const SUPPLIES = [
    { hz:'猫粮',   py:'māoliáng',    en:'a bag of cat food',        price:88, for:['cat'] },
    { hz:'狗粮',   py:'gǒuliáng',    en:'a bag of dog food',        price:95, for:['dog'] },
    { hz:'兔粮',   py:'tùliáng',     en:'rabbit pellets and hay',   price:52, for:['rabbit'] },
    { hz:'鱼食',   py:'yúshí',       en:'a tub of flake',           price:18, for:['fish'] },
    // These two are here because selfCheck() below asserts that every animal in the shop has
    // something on the shelf for it, and the two reptiles had nothing at all — which is the sort
    // of hole a list like this always develops and never announces.
    { hz:'龟粮',   py:'guīliáng',    en:'terrapin pellets',         price:26, for:['turtle'] },
    { hz:'加热灯', py:'jiārè dēng',  en:'a heat lamp and a UV tube', price:210, for:['lizard', 'turtle'] },
    { hz:'猫砂',   py:'māoshā',      en:'a sack of cat litter',     price:45, for:['cat'] },
    { hz:'牵引绳', py:'qiānyǐnshéng',en:'a lead',                   price:45, for:['dog'] },
    { hz:'项圈',   py:'xiàngquān',   en:'a collar with a tag on it', price:28, for:['dog', 'cat'] },
    { hz:'玩具',   py:'wánjù',       en:'a toy',                    price:25, for:['dog', 'cat', 'rabbit'] },
    { hz:'笼子',   py:'lóngzi',      en:'a cage',                   price:160, for:['hamster', 'budgie', 'rabbit'] },
    { hz:'鱼缸',   py:'yúgāng',      en:'a tank, with a filter in it', price:280, for:['fish'] },
    { hz:'水草',   py:'shuǐcǎo',     en:'live plants for the tank', price:22, for:['fish'] },
    { hz:'航空箱', py:'hángkōngxiāng', en:'a carrier',              price:120, for:['dog', 'cat', 'rabbit'],
      carrier:true },
    { hz:'纱窗',   py:'shāchuāng',   en:'window screening, cut to size', price:180, for:['cat'],
      screen:true },
  ];
  const supplyOf = hz => SUPPLIES.find(s => s.hz === hz) || null;

  // ---------------------------------------------------------------- the seam
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
    refund(n) {
      if (host && host.refund) return host.refund(n);
      const g = G(); if (!g || !g.setMoney) return;
      g.setMoney(H.money() + n);
    },
    minutes() {
      if (host && host.minutes) return host.minutes();
      const g = G(); try { return g ? g.state().minutes | 0 : 14 * 60; } catch (e) { return 14 * 60; }
    },
    day() {
      if (host && host.day) return host.day();
      const g = G(); try { return g ? g.state().day | 0 : 1; } catch (e) { return 1; }
    },
    // The host hook is not decoration: without it a stub cannot move the clock, and the
    // waitlist — which is the one part of this that only exists in the difference between
    // two times — cannot be driven end to end outside a browser.
    advance(m) {
      if (host && host.advance) return host.advance(m);
      const g = G(); if (g && g.advanceTime) { try { g.advanceTime(m); } catch (e) {} }
    },
    need(k, n) {
      const g = G(); if (!g || !g.needs || typeof g.needs[k] !== 'number') return;
      g.needs[k] = Math.max(0, Math.min(100, g.needs[k] + n));
    },
    bought() {
      if (host && host.bought) return host.bought();
      const g = G(); try { return g ? (g.state().bought || []) : []; } catch (e) { return []; }
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
      // PetSys predates the mall tenant-save registry. Keep its small owner-authored record beside
      // the newer optical/digital records so an adoption survives a page reload without requiring
      // a cross-owner edit in game.js. The game save still runs as well for money, time and needs.
      try {
        if (typeof localStorage !== 'undefined')
          localStorage.setItem(PERSIST_KEY, JSON.stringify(toSave()));
      } catch (e) { /* private browsing or a full store: the in-memory visit still works */ }
      if (host && host.save) return host.save();
      const g = G(); if (g && g.saveNow) { try { g.saveNow(); } catch (e) {} }
    },
  };

  // ---------------------------------------------------------------- state
  // `app` is the adoption application; `pet` and the last completed grooming are the physical state
  // the fit-out mirrors. `care` is a bag of timestamps: when each animal in the shop was last fed,
  // groomed or played with, and when each tank was last changed. None of these tick per frame.
  const DEPOSIT = 300;             // 押金, refundable, and the panel says so every time it is shown
  const VISIT_LEAD = 2;            // 家访 is booked two days out. It is not negotiable and not skippable
  const fresh0 = () => ({ app:null, care:{}, tank:{}, basket:[], pet:null, groom:null,
                           spend:0, fed:0 });
  const state = fresh0();
  const toSave = () => ({ ...state, app: state.app && { ...state.app, answers:{ ...state.app.answers } },
    care:{ ...state.care }, tank:{ ...state.tank }, basket: state.basket.map(r => ({ ...r })),
    pet: state.pet && { ...state.pet }, groom: state.groom && { ...state.groom } });
  const savedCount = (value, max = 1e6) => Number.isSafeInteger(value) && value >= 0
    ? Math.min(max, value) : 0;
  const savedStamp = value => Number.isFinite(value) && value >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)) : 0;
  const savedText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  function cleanAnswers(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const question of QUESTIONS) {
      if (question.answers.some(answer => answer.hz === raw[question.key]))
        out[question.key] = raw[question.key];
    }
    return out;
  }
  function cleanTimedGroups(raw, owners, fields) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const owner of owners) {
      const saved = raw[owner.key];
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) continue;
      const row = {};
      for (const field of fields) {
        const value = savedStamp(saved[field]);
        if (value) row[field] = value;
      }
      if (Object.keys(row).length) out[owner.key] = row;
    }
    return out;
  }
  function cleanApp(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !animalOf(raw.key)) return null;
    const answers = cleanAnswers(raw.answers);
    const answered = Object.keys(answers).length;
    const acceptable = QUESTIONS.every(question => {
      const answer = question.answers.find(row => row.hz === answers[question.key]);
      return answer && answer.ok !== false;
    });
    const allowed = new Set(['asked','form','booked','blocked','ready']);
    let stage = allowed.has(raw.stage) ? raw.stage : 'asked';
    if ((stage === 'form' || stage === 'booked' || stage === 'ready') &&
        (answered !== QUESTIONS.length || !acceptable)) stage = 'asked';
    const visitDay = savedCount(raw.visitDay, 1e7);
    if (stage === 'booked' && !visitDay) stage = 'form';
    const conditions = Array.isArray(raw.conditions) ? raw.conditions.slice(0, SUPPLIES.length)
      .flatMap(row => {
        const supply = row && typeof row === 'object' ? supplyOf(row.hz) : null;
        return supply ? [supply] : [];
      }) : null;
    return { key:raw.key, stage, answers, startedAt:savedStamp(raw.startedAt),
      visitDay, visitOk:raw.visitOk === true,
      why:savedText(raw.why, 160), whyEn:savedText(raw.whyEn, 320), conditions };
  }
  function load(s) {
    const clean = fresh0();
    if (!s || typeof s !== 'object' || Array.isArray(s)) { Object.assign(state, clean); return; }
    clean.app = cleanApp(s.app);
    clean.care = cleanTimedGroups(s.care, ANIMALS, CARE.map(row => row.key));
    clean.tank = cleanTimedGroups(s.tank, TANKS, ['changed','fed','filter']);
    const basket = new Map();
    if (Array.isArray(s.basket)) for (const row of s.basket.slice(0, 60)) {
      if (!row || typeof row !== 'object' || !supplyOf(row.hz) ||
          !Number.isSafeInteger(row.n) || row.n < 1) continue;
      basket.set(row.hz, Math.min(99, (basket.get(row.hz) || 0) + row.n));
    }
    clean.basket = [...basket].map(([hz, n]) => ({ hz, n }));
    if (s.pet && typeof s.pet === 'object' && !Array.isArray(s.pet) && animalOf(s.pet.key)) {
      const since = savedStamp(s.pet.since);
      clean.pet = { key:s.pet.key, since, deposit:s.pet.deposit === DEPOSIT ? DEPOSIT : 0,
        fedAt:savedStamp(s.pet.fedAt) || since, playedAt:savedStamp(s.pet.playedAt) || since };
    }
    if (s.groom && typeof s.groom === 'object' && !Array.isArray(s.groom) &&
        animalOf(s.groom.key) && Number.isFinite(s.groom.doneAt) && s.groom.doneAt >= 0)
      clean.groom = { key:s.groom.key, doneAt:savedStamp(s.groom.doneAt) };
    clean.spend = savedCount(s.spend, Number.MAX_SAFE_INTEGER);
    clean.fed = savedCount(s.fed);
    Object.assign(state, clean);
  }
  const stamp = (day, minutes) => day * 1440 + minutes;
  function restore() {
    try {
      if (typeof localStorage === 'undefined') return;
      const s = JSON.parse(localStorage.getItem(PERSIST_KEY));
      if (s && typeof s === 'object') load(s);
    } catch (e) { /* malformed or unavailable storage starts clean */ }
  }
  function finishGroom(key = 'dog') {
    const a = animalOf(key) || animalOf('dog');
    state.groom = { key:a.key, doneAt:stamp(H.day(), H.minutes()) };
    H.save();
    return { ...state.groom };
  }
  // ---------------------------------------------------------------- the four questions
  // Asked out loud, by a person, at a desk, before any form comes out. This is the conversation the
  // brief asked for and it is deliberately not a checkbox list: each answer is a sentence you say,
  // and two of the four have a wrong answer that gets you turned down.
  const QUESTIONS = [
    { key:'landlord', hz:'房东同意养吗？', py:'fángdōng tóngyì yǎng ma?',
      en:'does your landlord allow animals? — the first question every shelter in China asks',
      answers:[
        { hz:'同意',       py:'tóngyì',        en:'yes, it is in the contract',       ok:true },
        { hz:'没问过',     py:'méi wèn guo',   en:'I have not asked',                  ok:false,
          why:'先问房东，被赶出去的是猫不是你', whyEn:'ask first. When a tenancy goes wrong it is the animal that loses the home' },
        { hz:'不让养',     py:'bú ràng yǎng',  en:'no',                                ok:false,
          why:'那就先不行', whyEn:'then not yet, and we would rather say so now' }] },
    { key:'alone', hz:'白天家里几个小时没人？', py:'báitiān jiā lǐ jǐ ge xiǎoshí méi rén?',
      en:'how many hours a day is the flat empty?',
      answers:[
        { hz:'四五个小时',  py:'sì wǔ ge xiǎoshí', en:'four or five', hours:5 },
        { hz:'八九个小时',  py:'bā jiǔ ge xiǎoshí', en:'eight or nine — a normal working day', hours:9 },
        { hz:'十二个小时以上', py:'shí’èr ge xiǎoshí yǐshàng', en:'twelve or more', hours:13 }] },
    { key:'others', hz:'家里还有别人吗？还有别的动物吗？', py:'jiā lǐ hái yǒu biéren ma?',
      en:'anybody else at home? any other animals?',
      answers:[
        { hz:'就我一个',   py:'jiù wǒ yí ge',   en:'just me',                          ok:true },
        { hz:'有家人',     py:'yǒu jiārén',     en:'family',                            ok:true },
        { hz:'已经有一只', py:'yǐjīng yǒu yì zhī', en:'there is already one animal',    ok:true }] },
    { key:'years', hz:'能养十几年，你想过吗？', py:'néng yǎng shí jǐ nián, nǐ xiǎng guo ma?',
      en:'this is a decade or more. Have you thought about that?',
      answers:[
        { hz:'想过了',     py:'xiǎng guo le',   en:'yes',                               ok:true },
        { hz:'还没想那么远', py:'hái méi xiǎng nàme yuǎn', en:'not that far ahead',      ok:false,
          why:'那你先回去想想，我们不着急', whyEn:'go and think about it. We are not in a hurry and neither is the animal' }] },
  ];
  const questionOf = k => QUESTIONS.find(q => q.key === k) || null;

  // The verdict. Pure, so the panel, the diary line and the self-check all read the same rules.
  // Nothing here is a dice roll: every refusal names the answer that caused it.
  function verdict(key, answers, has) {
    const a = animalOf(key); if (!a) return { ok:false, why:'没有这只', whyEn:'no such animal' };
    const held = has || [];
    for (const q of QUESTIONS) {
      const chosen = (q.answers || []).find(x => x.hz === answers[q.key]);
      if (!chosen) return { ok:false, pending:true, why:'表还没填完', whyEn:'the form is not finished' };
      if (chosen.ok === false) return { ok:false, why:chosen.why, whyEn:chosen.whyEn, at:q.key };
    }
    const hours = (QUESTIONS.find(q => q.key === 'alone').answers
      .find(x => x.hz === answers.alone) || {}).hours || 0;
    if (hours > a.alone) return { ok:false, at:'alone',
      why:`${a.hz}一天不能自己待${hours}个小时`,
      whyEn:`${hours} hours alone is too long for ${a.en} — ${a.needsEn}` };
    // Conditions rather than refusals. A shelter does not say no to a screenless window, it says
    // 封了窗再来 — and that is a shopping list, which this shop happens to sell.
    const want = [];
    if (a.screen && !held.includes('纱窗')) want.push(supplyOf('纱窗'));
    if (a.weight === 'full' && !held.includes('航空箱')) want.push(supplyOf('航空箱'));
    if (want.length) return { ok:false, conditions:want, at:'kit',
      why:'先把东西准备好', whyEn:`bring ${want.map(w => w.en).join(' and ')} and the visit can go ahead` };
    return { ok:true };
  }

  // ---------------------------------------------------------------- 1. the adoption corner
  // The panel 家 and 表格 in the fit-out below point at, and the only route an animal takes out of
  // this shop. It is a state machine with five stops and it will not let you skip one.
  function openAdoption() {
    const P = H.Pick(); if (!P) return;
    const day = H.day();
    const app = state.app;
    if (state.pet) { openPet(); return; }
    if (!app) { openChoose(); return; }
    const a = animalOf(app.key);
    const rows = [{ sec:`${a.hz} · ${a.py}`, en:`${a.en} — ${a.yearsEn}. ${a.needsEn}` }];
    if (app.stage === 'asked') {
      rows.push({ off:true, hz:'先聊聊', py:'xiān liáoliao', en:'韩露 asks four things before any form comes out' });
      rows.push({ ask:true, hz:'回答问题', py:'huídá wèntí',
        en:`${Object.keys(app.answers).length} of ${QUESTIONS.length} answered`, right:'聊' });
    }
    if (app.stage === 'form') {
      rows.push({ form:true, hz:'填领养表', py:'tián lǐngyǎng biǎo',
        en:'name, address, who else lives there, and the landlord — ten minutes at the desk', right:'表格' });
    }
    if (app.stage === 'booked') {
      const left = app.visitDay - day;
      rows.push({ off:true, hz:'等家访', py:'děng jiāfǎng',
        en: left > 0 ? `the home visit is on day ${app.visitDay} — ${left} day${left > 1 ? 's' : ''} away`
                     : 'the home visit is today',
        right: left > 0 ? `${left}天` : '今天' });
      if (left <= 0) rows.push({ visit:true, hz:'家访', py:'jiāfǎng', en:'she comes and looks at the flat', right:'今天' });
    }
    if (app.stage === 'blocked') {
      rows.push({ off:true, hz:app.why, py:'', en:app.whyEn, right:'不行' });
      if (app.conditions) for (const c of app.conditions)
        rows.push({ off:true, hz:c.hz, py:c.py, en:`${c.en} — ¥${c.price}, and it is on the shelf here`, right:`¥${c.price}` });
      rows.push({ again:true, hz:'再试一次', py:'zài shì yí cì',
        en:'come back when that is sorted — the answers are kept', right:'重来' });
      rows.push({ drop:true, hz:'算了', py:'suàn le', en:'give up on this one' });
    }
    if (app.stage === 'ready') {
      rows.push({ off:true, hz:'家访通过了', py:'jiāfǎng tōngguò le', en:'the home visit passed', right:'通过' });
      rows.push({ off:true, hz:'押金三百，不是买它', py:'yājīn sānbǎi',
        en:`¥${DEPOSIT} deposit. It is refundable — you get it back when we see the animal has ` +
           'settled in. It is not a price and this shop does not put a price on an animal',
        right:`¥${DEPOSIT}` });
      rows.push({ take:true, hz:'接回家', py:'jiē huí jiā', en:'take them home', right:`¥${DEPOSIT}`,
        off: H.money() < DEPOSIT });
    }
    rows.push({ shop:true, hz:'看用品', py:'kàn yòngpǐn', en:'food, litter, leads, cages, tanks', right:'买东西' });
    P.show({ title:`${NAME} · 领养`, sub:`${a.hz} · ${a.yearsEn} · ¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.shop)  { openSupplies(); return false; }
        if (r.ask)   { openQuestions(); return false; }
        if (r.form)  { fillForm(); return false; }
        if (r.visit) { doVisit(); return false; }
        if (r.again) { state.app.stage = 'form'; state.app.why = null; state.app.conditions = null;
          openAdoption(); return false; }
        if (r.drop)  { state.app = null; H.say('先不领养了 · <span class="dim">no harm done — come back</span>');
          H.save(); return true; }
        if (r.take)  { return takeHome(); }
        return false;
      } });
  }

  function openChoose() {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:'想给它找个家吗？', py:'xiǎng gěi tā zhǎo ge jiā ma?',
      en:'这些不卖，是领养的 — the animals on this side are not for sale. There is no price card ' +
         'in this corner, and there is not going to be one' }];
    for (const a of ANIMALS)
      rows.push({ pick:a.key, hz:a.hz, py:a.py,
        en:`${a.en} — ${a.yearsEn}. ${a.needsEn}`,
        right: a.weight === 'full' ? '要家访' : '当场谈' });
    rows.push({ shop:true, hz:'我只是来买东西的', py:'wǒ zhǐshì lái mǎi dōngxi de',
      en:'food and supplies — that is what the basket is for', right:'用品' });
    P.show({ title:`${NAME} · 领养角`, sub:'领养 lǐngyǎng — to adopt. 买 does not appear on this desk', rows,
      onPick(r) {
        if (r.shop) { openSupplies(); return false; }
        if (!r.pick) return false;
        state.app = { key:r.pick, stage:'asked', answers:{}, startedAt:H.day() };
        const a = animalOf(r.pick);
        H.say(`${a.hz} · <span class="dim">${a.yearsEn}. 韩露 has four things to ask you first</span>`);
        H.sentence('想给它找个家。');
        openQuestions(); return false;
      } });
  }

  // ---------------------------------------------------------------- 2. the conversation
  // Four questions, asked one at a time, with the wrong answers left in. Answering honestly and
  // being told 那就先不行 is a better outcome than a form that always says yes.
  function openQuestions() {
    const P = H.Pick(); if (!P || !state.app) return;
    const app = state.app, a = animalOf(app.key);
    const next = QUESTIONS.find(q => !app.answers[q.key]);
    if (!next) {
      app.stage = 'form';
      H.say('聊完了 · <span class="dim">that is the conversation — now the form</span>');
      openAdoption(); return;
    }
    const rows = [{ sec:next.hz, py:next.py, en:next.en }];
    for (const x of next.answers)
      rows.push({ answer:x.hz, hz:x.hz, py:x.py, en:x.en });
    rows.push({ off:true, hz:`养${a.hz}`, py:'', en:`${a.needsEn} · about ¥${a.monthly} a month, ` +
      `for ${a.yearsEn}`, right:'先说清楚' });
    P.show({ title:`${NAME} · ${a.hz}`, sub:`韩露 · ${Object.keys(app.answers).length + 1}/${QUESTIONS.length}`, rows,
      onPick(r) {
        if (!r.answer) return false;
        app.answers[next.key] = r.answer;
        const chosen = next.answers.find(x => x.hz === r.answer);
        if (chosen && chosen.ok === false) {
          app.stage = 'blocked'; app.why = chosen.why; app.whyEn = chosen.whyEn; app.conditions = null;
          H.say(`${chosen.why} · <span class="dim">${chosen.whyEn}</span>`);
          H.save(); openAdoption(); return false;
        }
        H.save(); openQuestions(); return false;
      } });
  }

  function fillForm() {
    const app = state.app; if (!app) return;
    const v = verdict(app.key, app.answers, H.bought());
    H.advance(10);
    // A half-answered form used to fall straight through to `booked` and book a home visit off
    // questions nobody had asked. `pending` goes back to the conversation rather than to the
    // blocked screen, because an unfinished form is not a refusal.
    if (v.pending) { app.stage = 'asked'; openQuestions(); return; }
    if (!v.ok) {
      app.stage = 'blocked'; app.why = v.why; app.whyEn = v.whyEn; app.conditions = v.conditions || null;
      H.say(`${v.why} · <span class="dim">${v.whyEn}</span>`);
      H.save(); openAdoption(); return;
    }
    const a = animalOf(app.key);
    // The weight split, which the notes at the top of this module describe and the first version
    // did not actually implement — every animal was booked in for a home visit, so a hamster took
    // the same three days as a cat and the whole point of the distinction was lost. A 'light'
    // adoption is decided at the desk, now, and a 'full' one is a return visit two days later.
    // That difference in *pacing* is the thing doing the work here.
    if (a.weight !== 'full') {
      app.stage = 'ready';
      H.say(`表填好了 · <span class="dim">${a.en} — 当场就能定, decided here at the desk. ` +
        `The deposit is ¥${DEPOSIT} and it comes back</span>`);
      H.sentence('先填一张表格。');
      H.diary(`在${NAME}填了${a.hz}的领养表，当场就定了。`,
        `Filled in an adoption form for ${a.en} at ${NAME_EN} — settled at the desk.`, 'adopt-form');
      H.save(); openAdoption(); return;
    }
    app.stage = 'booked';
    app.visitDay = H.day() + VISIT_LEAD;
    H.say(`表填好了 · <span class="dim">家访 jiāfǎng — she will come and see the flat on day ${app.visitDay}. ` +
      'The visit happens before the animal does</span>');
    H.sentence('先填一张表格。');
    H.diary(`在${NAME}填了${a.hz}的领养表，${app.visitDay}号家访。`,
      `Filled in an adoption form for ${a.en} at ${NAME_EN}. Home visit on day ${app.visitDay}.`,
      'adopt-form');
    H.save(); openAdoption();
  }

  function doVisit() {
    const app = state.app; if (!app || H.day() < app.visitDay) return;
    const v = verdict(app.key, app.answers, H.bought());
    H.advance(40);
    if (!v.ok) {
      app.stage = 'blocked'; app.why = v.why; app.whyEn = v.whyEn; app.conditions = v.conditions || null;
      H.say(`${v.why} · <span class="dim">${v.whyEn}</span>`);
      H.save(); openAdoption(); return;
    }
    app.stage = 'ready'; app.visitOk = true;
    H.say('家访通过了 · <span class="dim">the visit passed. The deposit is ¥' + DEPOSIT +
      ' and you get it back</span>');
    H.save(); openAdoption();
  }

  function takeHome() {
    const app = state.app; if (!app || app.stage !== 'ready') return false;
    if (H.money() < DEPOSIT) {
      H.say(`钱不够 · <span class="dim">¥${DEPOSIT} deposit needed; you have ¥${H.money()}</span>`); return false;
    }
    H.spend(DEPOSIT); state.spend += DEPOSIT;
    const a = animalOf(app.key);
    state.pet = { key:a.key, since:stamp(H.day(), H.minutes()), deposit:DEPOSIT,
      fedAt:stamp(H.day(), H.minutes()), playedAt:stamp(H.day(), H.minutes()) };
    state.app = null;
    H.need('mood', 26);
    H.advance(20);
    H.say(`${a.hz}跟你回家了 · <span class="dim">${a.en} — 押金 ¥${DEPOSIT}, refundable. ` +
      `${a.needsEn}</span>`);
    H.sentence('它跟我回家了。');
    H.diary(`从${NAME}领养了一只${a.hz}，押了三百块押金。`,
      `Adopted ${a.en} from ${NAME_EN}. ¥${DEPOSIT} refundable deposit.`, 'adopt');
    H.save(); return true;
  }

  // ---------------------------------------------------------------- 3. the animals in the shop
  // 喂, 摸, 梳毛 and 玩, on the models the fit-out already builds. Each one is a small action with a
  // sentence of care advice on it, and each is rate-limited by a timestamp rather than a cooldown
  // timer — an animal fed twice in ten minutes is the lesson, not a locked button.
  const CARE = [
    { key:'feed',  hz:'喂',   py:'wèi',      en:'feed it', mins:4, gap:6 * 60,
      note:'喂 is the verb for feeding an animal, never a person',
      already:'刚喂过，别喂多了', alreadyEn:'it has just been fed. Overfeeding is the commonest thing people get wrong here' },
    { key:'pet',   hz:'摸一摸', py:'mō yi mō', en:'stroke it', mins:2, gap:0,
      note:'摸 to touch. Ask before you put your hand in — 可以摸吗？' },
    { key:'groom', hz:'梳毛',  py:'shū máo',  en:'brush it', mins:8, gap:24 * 60,
      note:'梳 comb + 毛 fur. 换毛季 is spring and autumn, and it is when this matters',
      already:'今天梳过了', alreadyEn:'already done today' },
    { key:'play',  hz:'玩',   py:'wán',      en:'play with it', mins:10, gap:2 * 60,
      note:'玩 to play. A shop animal that nobody plays with is the reason 领养 is hard' },
  ];
  const careOf = k => CARE.find(c => c.key === k) || null;
  function openAnimal(key) {
    const P = H.Pick(); if (!P) return;
    const a = animalOf(key); if (!a) return;
    const now = stamp(H.day(), H.minutes());
    const rows = [{ sec:`${a.hz} · ${a.py}`, en:`${a.en} — ${a.note}` }];
    for (const c of CARE) {
      const last = (state.care[key] || {})[c.key] || 0;
      const soon = c.gap && now - last < c.gap;
      rows.push({ care:c.key, hz:c.hz, py:c.py,
        en: soon ? `${c.alreadyEn || 'not yet'}` : `${c.en} — ${c.note}`,
        right: soon ? '刚做过' : `${c.mins}分钟`, off: !!soon });
    }
    rows.push({ off:true, hz:'领养不是买', py:'lǐngyǎng bú shì mǎi',
      en:`${a.yearsEn}. ${a.needsEn}. About ¥${a.monthly} a month`, right:'领养' });
    rows.push({ adopt:true, hz:'想领养它', py:'xiǎng lǐngyǎng tā', en:'ask about giving it a home',
      right: a.weight === 'full' ? '要家访' : '当场谈' });
    P.show({ title:`${NAME} · ${a.hz}`, sub:a.py, rows,
      onPick(r) {
        if (r.adopt) {
          if (!state.app) state.app = { key, stage:'asked', answers:{}, startedAt:H.day() };
          openAdoption(); return false;
        }
        if (!r.care) return false;
        const c = careOf(r.care), last = (state.care[key] || {})[r.care] || 0;
        if (c.gap && now - last < c.gap) { H.say(`${c.already} · <span class="dim">${c.alreadyEn}</span>`); return false; }
        state.care[key] = state.care[key] || {};
        state.care[key][r.care] = now;
        if (r.care === 'feed') state.fed++;
        H.need('mood', r.care === 'play' ? 8 : r.care === 'pet' ? 5 : 3);
        H.advance(c.mins);
        H.say(`${c.hz}${a.hz} · <span class="dim">${c.note}</span>`);
        H.sentence(r.care === 'feed' ? `一天喂一次就够了。` : `可以摸吗？`);
        H.save(); openAnimal(key); return false;
      } });
  }

  // ---------------------------------------------------------------- 4. the tanks
  // Six cells on the wall and the koi vat in the middle bay. Two verbs and both of them have a
  // wrong way to do them, which is why they are worth having: a water change is a *third* of the
  // tank and not all of it, and a pinch of flake is a pinch.
  const TANKS = [
    { key:'wall', hz:'鱼缸', py:'yúgāng', en:'the tank wall — four of the six cells hold water' },
    { key:'koi',  hz:'锦鲤池', py:'jǐnlǐ chí', en:'the koi vat in the middle of the floor' },
  ];
  const CHANGE_GAP = 7 * 24 * 60;      // a week between changes, which is what a shop tank wants
  const FEED_GAP   = 20 * 60;          // once a day, and the tub has a scoop in it for a reason
  function openTank(key) {
    const P = H.Pick(); if (!P) return;
    const t = TANKS.find(q => q.key === key) || TANKS[0];
    const now = stamp(H.day(), H.minutes());
    const st = state.tank[t.key] || {};
    const sinceWater = st.changed ? now - st.changed : CHANGE_GAP;
    const sinceFeed = st.fed ? now - st.fed : FEED_GAP;
    const clean = Math.max(0, Math.min(1, 1 - sinceWater / (CHANGE_GAP * 2)));
    const rows = [
      { sec:`${t.hz} · ${t.py}`, en:t.en },
      { off:true, hz: clean > .6 ? '很干净' : clean > .25 ? '有点浑' : '该换水了',
        py: clean > .6 ? 'hěn gānjìng' : clean > .25 ? 'yǒudiǎn hún' : 'gāi huàn shuǐ le',
        en: clean > .6 ? 'clear, and the plants have been trimmed'
          : clean > .25 ? 'going cloudy' : 'this needs changing',
        right:`${Math.round(clean * 100)}%` },
      { water:true, hz:'换水', py:'huàn shuǐ',
        en:'change a third of it — never all of it. A full change strips the bacteria the filter ' +
           'lives on and kills more fish than dirty water ever does',
        right: sinceWater >= CHANGE_GAP ? '该换了' : '还行' },
      { feed:true, hz:'喂鱼', py:'wèi yú',
        en: sinceFeed < FEED_GAP
          ? '刚喂过 — they have been fed. Flake that is not eaten in two minutes rots and fouls the water'
          : 'a pinch, with the little scoop. Not a handful out of the tub',
        right: sinceFeed < FEED_GAP ? '刚喂过' : '一天一次', off: sinceFeed < FEED_GAP },
      { filter:true, hz:'洗滤棉', py:'xǐ lǜmián',
        en:'rinse the filter wool — in tank water, not under the tap. Chlorine kills the filter',
        right:'两周一次' },
    ];
    P.show({ title:`${NAME} · ${t.hz}`, sub:`${t.py} · 水族 shuǐzú, the aquarium side`, rows,
      onPick(r) {
        state.tank[t.key] = state.tank[t.key] || {};
        if (r.water) {
          state.tank[t.key].changed = now; H.advance(15); H.need('mood', 3);
          H.say('换了三分之一 · <span class="dim">a third out, a third back in. 换水不能全换</span>');
          H.sentence('这个鱼缸多久换一次水？');
          H.save(); openTank(key); return false;
        }
        if (r.feed) {
          if (sinceFeed < FEED_GAP) { H.say('刚喂过 · <span class="dim">once a day is enough</span>'); return false; }
          state.tank[t.key].fed = now; state.fed++; H.advance(2);
          H.say('喂了一小勺 · <span class="dim">one scoop. 喂多了水会坏 — overfeeding is what fouls a tank</span>');
          H.sentence('一天喂一次就够了。');
          H.save(); openTank(key); return false;
        }
        if (r.filter) {
          state.tank[t.key].filter = now; H.advance(10);
          H.say('滤棉用缸里的水洗的 · <span class="dim">rinsed in tank water — never under the tap</span>');
          H.save(); openTank(key); return false;
        }
        return false;
      } });
  }

  // ---------------------------------------------------------------- 5. the till list
  // Things, not animals. This is the whole of what the basket does in this shop.
  function openSupplies(filter) {
    const P = H.Pick(); if (!P) return;
    const list = SUPPLIES.filter(s => !filter || s.for.includes(filter));
    const total = state.basket.reduce((n, r) => n + supplyOf(r.hz).price * r.n, 0);
    const rows = [{ sec:'宠物用品', py:'chǒngwù yòngpǐn',
      en:'食品、猫砂、牵引绳、笼子、鱼缸 — everything here is a thing, and every one of them is on ' +
         'a shelf you can point at' }];
    for (const s of list) {
      const have = state.basket.find(r => r.hz === s.hz);
      rows.push({ add:s.hz, hz:s.hz, py:s.py, en:`${s.en} — for ${s.for.map(k => (animalOf(k) || {}).en).join(', ')}`,
        right: have ? `×${have.n} ¥${s.price}` : `¥${s.price}`, off: H.money() < s.price });
    }
    if (state.basket.length) {
      rows.push({ sec:'篮子里', py:'lánzi lǐ', en:'in the basket' });
      for (const r of state.basket) {
        const s = supplyOf(r.hz);
        rows.push({ drop:r.hz, hz:`${s.hz} ×${r.n}`, py:s.py, en:'pick to take one out', right:`¥${s.price * r.n}` });
      }
      rows.push({ pay:true, hz:'买单', py:'mǎi dān', en:'pay at the till', right:`¥${total}`,
        off: H.money() < total });
    }
    P.show({ title:`${NAME} · 用品`, sub:`¥${total} · ¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.add)  { const b = state.basket.find(q => q.hz === r.add);
          if (b) b.n++; else state.basket.push({ hz:r.add, n:1 }); openSupplies(filter); return false; }
        if (r.drop) { const b = state.basket.find(q => q.hz === r.drop);
          if (b && --b.n <= 0) state.basket.splice(state.basket.indexOf(b), 1); openSupplies(filter); return false; }
        if (r.pay) {
          if (H.money() < total) { H.say('钱不够 · <span class="dim">not enough</span>'); return false; }
          H.spend(total); state.spend += total;
          const names = state.basket.map(r2 => `${r2.hz}${r2.n > 1 ? '×' + r2.n : ''}`).join('、');
          H.say(`${esc(names)} · <span class="dim">¥${total}</span>`);
          H.sentence('猫粮狗粮都在那边。');
          H.diary(`在${NAME}买了${names}，${total}块。`, `Bought ${names} at ${NAME_EN}. ¥${total}.`, 'petshop');
          state.basket = []; H.save(); return true;
        }
        return false;
      } });
  }

  // ---------------------------------------------------------------- 6. the one you took home
  function openPet() {
    const P = H.Pick(); if (!P || !state.pet) return;
    const a = animalOf(state.pet.key);
    const now = stamp(H.day(), H.minutes());
    const hungry = now - state.pet.fedAt > 20 * 60;
    const dull = now - state.pet.playedAt > 2 * 24 * 60;
    const rows = [
      { sec:`${a.hz} · ${a.py}`, en:`${a.en} — home since day ${Math.floor(state.pet.since / 1440)}` },
      { off:true, hz: hungry ? '它饿了' : dull ? '它闷了' : '它挺好',
        py: hungry ? 'tā è le' : dull ? 'tā mèn le' : 'tā tǐng hǎo',
        en: hungry ? 'it is hungry' : dull ? 'it has not been played with for two days' : 'settled and fine' },
      { feed:true, hz:'喂它', py:'wèi tā', en:`${a.needsEn}`, right:'喂' },
      { play:true, hz:'跟它玩', py:'gēn tā wán', en:'play with it', right:'玩' },
    ];
    if (state.pet.deposit) rows.push({ back:true, hz:'退押金', py:'tuì yājīn',
      en:`the shop returns the ¥${state.pet.deposit} deposit now they have seen it settled — ` +
         'this is the part that proves it was never a purchase', right:`+¥${state.pet.deposit}`,
      off: now - state.pet.since < 7 * 24 * 60 });
    P.show({ title:`${NAME_EN} · ${a.hz}`, sub:a.needsEn, rows,
      onPick(r) {
        if (r.feed) { state.pet.fedAt = now; H.advance(6); H.need('mood', 5);
          H.say(`喂了 · <span class="dim">${a.needsEn}</span>`); H.save(); openPet(); return false; }
        if (r.play) { state.pet.playedAt = now; H.advance(20); H.need('mood', 12);
          H.say('玩了一会儿 · <span class="dim">it is a different animal afterwards</span>'); H.save(); openPet(); return false; }
        if (r.back) { H.refund(state.pet.deposit);
          H.say(`押金退了 · <span class="dim">¥${state.pet.deposit} back. 押金 yājīn — a deposit, ` +
            'and this is the moment the word means what it says</span>');
          H.diary(`${NAME}把三百块押金退给我了。`, `${NAME_EN} returned the ¥300 deposit.`, 'adopt-deposit');
          state.pet.deposit = 0; H.save(); openPet(); return false; }
        return false;
      } });
  }

  // ---------------------------------------------------------------- one runnable check
  function selfCheck() {
    const A = (c, m) => { if (!c) throw new Error('PetSys.selfCheck: ' + m); };
    // the structural promise: no animal has a price and nothing on the till list is alive
    A(ANIMALS.every(a => a.price === undefined), 'no animal may carry a price');
    A(SUPPLIES.every(s => !ANIMALS.some(a => a.hz === s.hz)), 'no animal may appear on the till list');
    A(!SUPPLIES.some(s => /鱼$|狗$|猫$|鼠$|龟$|鹦鹉$/.test(s.hz)), 'nothing alive on the till list');
    const good = { landlord:'同意', alone:'四五个小时', others:'就我一个', years:'想过了' };
    // a landlord who has not been asked stops it, and says why
    A(!verdict('cat', { ...good, landlord:'没问过' }).ok, 'an unasked landlord must stop the adoption');
    A(verdict('cat', { ...good, landlord:'没问过' }).at === 'landlord', 'and it must name which answer did it');
    // nine hours is fine for a cat and too long for a puppy
    A(verdict('cat', { ...good, alone:'八九个小时' }, ['纱窗', '航空箱']).ok, 'nine hours is within a cat');
    A(!verdict('dog', { ...good, alone:'八九个小时' }, ['航空箱']).ok, 'nine hours alone is too long for a puppy');
    A(verdict('dog', { ...good, alone:'八九个小时' }, ['航空箱']).at === 'alone', 'and it must say so about the hours');
    // a cat needs the windows screened, and that is a condition rather than a refusal
    const v = verdict('cat', good, []);
    A(!v.ok && v.at === 'kit', 'a cat with no screening must be held up');
    A(v.conditions.some(c => c.hz === '纱窗'), 'and the thing to fix must be named');
    A(verdict('cat', good, ['纱窗', '航空箱']).ok, 'screening and a carrier and the cat can go');
    // a hamster needs no carrier and no visit
    A(verdict('hamster', good, []).ok, 'a light adoption should not demand a carrier');
    A(animalOf('hamster').weight === 'light' && animalOf('dog').weight === 'full',
      'the weight split must survive edits');
    // an incomplete form is pending, not a refusal
    A(verdict('cat', { landlord:'同意' }).pending === true, 'a half-filled form is pending');
    // every supply points at an animal that exists
    A(SUPPLIES.every(s => s.for.every(k => animalOf(k))), 'a supply names an animal that is not in the shop');
    // and every animal has something to buy for it
    A(ANIMALS.every(a => SUPPLIES.some(s => s.for.includes(a.key))), 'an animal with nothing to buy for it');
    // Every animal must be adoptable by somebody. This is the assertion the puppy wanted: its
    // `alone` was 4, the gentlest answer on the form scores 5, and the branch was dead — the shop
    // would refuse a dog to a person who is out four or five hours a day, which is nobody's idea
    // of a bad home. Checked against the kit each species can require.
    const kit = SUPPLIES.filter(s => s.carrier || s.screen).map(s => s.hz);
    for (const a of ANIMALS) {
      const v = verdict(a.key, good, kit);
      A(v.ok, `nobody can adopt ${a.hz}: ${v.whyEn || v.why}`);
    }
    // and the gentlest honest answer to every question must be an answer that passes
    A(QUESTIONS.every(q => q.answers.some(x => x.ok !== false)), 'a question with no acceptable answer');
    return 'PetSys.selfCheck: ok';
  }

  // Restore only after the question/care/tank catalogues above have initialized. The schema
  // validator resolves saved keys against those catalogues; running it at the old early call site
  // hit their temporal dead zone and the storage try/catch quietly turned every reload into blank.
  restore();

  return {
    NAME, NAME_PY, NAME_EN,
    ANIMALS, SUPPLIES, QUESTIONS, CARE, TANKS, DEPOSIT, VISIT_LEAD,
    animalOf, supplyOf, questionOf, careOf, verdict, stamp,
    openAdoption, openChoose, openQuestions, openAnimal, openTank, openSupplies, openPet,
    pet: () => state.pet && { ...state.pet },
    groom: () => state.groom && { ...state.groom },
    app: () => state.app && { ...state.app, answers:{ ...state.app.answers } },
    state, toSave, load, restore, finishGroom,
    reset() {
      Object.assign(state, fresh0());
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSIST_KEY); } catch (e) {}
    },
    bind(h) { host = h || null; },
    selfCheck,
  };
})();

MallFit['宠物店'] = A => {
  const acc = A.acc;                                      // 玉 jade-green, the tenant's colour
  const MW = { mat:'wood',   matScale:.85, matAmt:.30, nrmAmt:.30 };  // joinery
  const MS = { mat:'steel',  matScale:.45, matAmt:.26, nrmAmt:.30 };  // cage, frame, trolley
  const MT = { mat:'tile',   matScale:.60, matAmt:.28, nrmAmt:.30 };  // the grooming splashback
  // Nothing soft here carries the `fabric` map. That map is the brightest in the library and it
  // lifts whatever it is put on by about two and a half times, which turned a slate-blue cat box
  // into the whitest object in the room and every vet bed into a block of lit foam. Mode 7 already
  // has a woven term of its own in the shader, so the cloth reads without the map and reads at the
  // colour it was painted. See the note in the summary: this is not a private correction table,
  // it is not using the one material whose lift cannot be worked around.

  // Shade and tint, for the fur and the fish. Colour is a plain [r,g,b] and travels per instance,
  // so a darker ear costs nothing but the arithmetic.
  const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const lt = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];

  const P = {
    joinD : C('#4a3729'), joinM : C('#6b5136'), joinL : C('#8b6b46'),
    trim  : C('#25282c'), card  : C('#f1e9d7'), gold  : C('#f0cf78'),
    steelL: C('#9aa4ab'), steelD: C('#59626a'), pan   : C('#8d9498'),
    glass : C('#9dc0d2'), frost : C('#c4d2d1'), tile  : C('#d3dad4'), cellB : C('#b9c1ba'),
    bedA  : C('#a89070'), bedB : C('#54677a'), bedC : C('#7d654c'),
    // The water column, top to bottom. Four bands rather than one, because the tube is above the
    // tank and a lit aquarium is brightest at the surface and nearly black in the corners. They
    // are close together on purpose: three widely spaced bands read as a poster of stripes, which
    // is exactly what the first pass of this run looked like.
    w1 : C('#2f7a8c'), w2 : C('#266f83'), w3 : C('#1c6076'), w4 : C('#114e62'),
    tube  : C('#dcecf6'), surf  : C('#7fbcd2'),
    gravel: C('#4f4841'), sand  : C('#635a4d'), bog   : C('#3a2c20'),
    plantA: C('#2c6b3a'), plantB: C('#478034'), plantC: C('#7a3b47'), plantD: C('#2f705b'),
    sisal : C('#a08a63'), rug   : C('#4a6259'),
  };
  const FUR  = [C('#e7dcc7'), C('#c0793d'), C('#f3efe6'), C('#4d4239'),
                C('#a9a49b'), C('#8a6a4e'), C('#d8c49c')];
  const FISH = [C('#dd6f22'), C('#e6bd39'), C('#6fadd4'), C('#c44338'),
                C('#2b3742'), C('#84bd42'), C('#d8d2c4')];
  // Feed and litter packaging: printed card, so muted rather than saturated. The first pass used
  // pure magenta and lime and the pallet read as a stack of children's building blocks.
  const PACK = [C('#7a4a2c'), C('#2b5f6a'), C('#6b3c50'), C('#4f5c30'), C('#7d452c'),
                C('#3f4a5c'), C('#6d5a2c')];

  // One authored animal and one authored profile card for every PetSys key. `retainAnimal` wraps
  // the synchronous primitive calls only for the one exact model passed to it, then restores the
  // toolkit immediately. This avoids turning every decorative litter-mate into adoption state and
  // leaves the other habitats byte-for-byte where the fit-out put them.
  const adoptionVisuals = { animals:Object.create(null), cards:Object.create(null), status:[] };
  const retainAnimal = (key, draw) => {
    const names = ['put', 'cyl', 'ball', 'cap', 'taper'], old = {}, parts = [];
    for (const name of names) {
      old[name] = A[name];
      A[name] = (...args) => {
        const p = old[name](...args);
        if (p) parts.push(p);
        return p;
      };
    }
    let result;
    try { result = draw(); }
    finally { for (const name of names) A[name] = old[name]; }
    adoptionVisuals.animals[key] = {
      parts:parts.map(p => {
        A.dynamicVisual(p);
        p.petAdoptionAnimal = key;
        return { p, y:p.m[13], hidden:false };
      }),
    };
    return result;
  };

  // ================================================================ the small living things
  // ---- 小狗, sitting. Sixteen masses, all ellipsoids and capsules, all mode 7, so however many
  // of them there are and whatever colour each one is they cost one draw call between them.
  const pup = (a, b, y, c, s = 1, o = {}) => {
    const d = sh(c, .70), m = lt(c, 1.14);
    A.ball(a - .048 * s, b, y + .118 * s, .104 * s, .114 * s, .108 * s, c, { mode:7, gloss:.09 });
    A.ball(a + .068 * s, b, y + .132 * s, .096 * s, .104 * s, .104 * s, c, { mode:7, gloss:.09 });
    for (const q of [-1, 1]) {                                        // forelegs, front and hind paws
      A.cap(a + .112 * s, b + q * .056 * s, y + .058 * s, .046 * s, .118 * s, .046 * s, c, { mode:7 });
      A.ball(a + .138 * s, b + q * .056 * s, y + .022 * s, .030 * s, .021 * s, .040 * s, m, { mode:7 });
      A.ball(a - .026 * s, b + q * .080 * s, y + .028 * s, .032 * s, .027 * s, .050 * s, c, { mode:7 });
    }
    A.ball(a + .106 * s, b, y + .248 * s, .080 * s, .078 * s, .078 * s, c, { mode:7, gloss:.10 });
    A.ball(a + .166 * s, b, y + .224 * s, .045 * s, .039 * s, .052 * s, m, { mode:7, gloss:.14 });
    A.ball(a + .206 * s, b, y + .236 * s, .017 * s, .014 * s, .014 * s, C('#221e1a'),
           { mode:7, gloss:.45 });
    for (const q of [-1, 1])
      A.ball(a + .154 * s, b + q * .038 * s, y + .274 * s, .013 * s, .014 * s, .011 * s,
             C('#16120e'), { mode:7, gloss:.55 });
    for (const q of [-1, 1])                                          // drop ears, off the skull
      A.ball(a + .082 * s, b + q * .076 * s, y + .242 * s, .026 * s, .058 * s, .031 * s, d,
             { mode:7, rz:q * .22 });
    A.cap(a - .108 * s, b + (o.tail === undefined ? .054 : o.tail) * s, y + .120 * s,
          .036 * s, .108 * s, .036 * s, m, { mode:7, rz:-.55 });
  };
  // The same animal asleep: nose tucked to the flank, one ear flat, a back leg out. Eight masses.
  const nap = (a, b, y, c, s = 1) => {
    const d = sh(c, .70), m = lt(c, 1.14);
    A.ball(a, b, y + .086 * s, .150 * s, .086 * s, .120 * s, c, { mode:7, gloss:.09 });
    A.ball(a + .092 * s, b + .052 * s, y + .090 * s, .072 * s, .066 * s, .070 * s, c,
           { mode:7, gloss:.10 });
    A.ball(a + .142 * s, b + .062 * s, y + .070 * s, .040 * s, .034 * s, .044 * s, m, { mode:7 });
    A.ball(a + .172 * s, b + .066 * s, y + .076 * s, .015 * s, .012 * s, .012 * s, C('#221e1a'),
           { mode:7, gloss:.40 });
    A.ball(a + .080 * s, b + .114 * s, y + .094 * s, .024 * s, .046 * s, .028 * s, d,
           { mode:7, rz:.5 });
    A.ball(a + .050 * s, b - .096 * s, y + .054 * s, .050 * s, .034 * s, .060 * s, m, { mode:7 });
    A.cap(a - .112 * s, b - .050 * s, y + .054 * s, .140 * s, .034 * s, .034 * s, m,
          { mode:7, rz:.18 });
    A.ball(a - .062 * s, b + .104 * s, y + .050 * s, .048 * s, .034 * s, .054 * s, c, { mode:7 });
  };
  // ---- 小猫. Sits taller than a puppy on a narrower base, with the tail brought round the front
  // paws. Pointed ears and green eyes carry the whole read.
  const cat = (a, b, y, c, s = 1) => {
    const d = sh(c, .70), m = lt(c, 1.12);
    A.ball(a - .030 * s, b, y + .120 * s, .094 * s, .122 * s, .098 * s, c, { mode:7, gloss:.12 });
    A.ball(a + .046 * s, b, y + .210 * s, .076 * s, .112 * s, .080 * s, c, { mode:7, gloss:.12 });
    for (const q of [-1, 1]) {
      A.cap(a + .080 * s, b + q * .046 * s, y + .076 * s, .034 * s, .152 * s, .034 * s, c, { mode:7 });
      A.ball(a + .104 * s, b + q * .046 * s, y + .020 * s, .026 * s, .020 * s, .036 * s, m, { mode:7 });
    }
    A.ball(a + .058 * s, b, y + .322 * s, .066 * s, .064 * s, .064 * s, c, { mode:7, gloss:.14 });
    A.ball(a + .100 * s, b, y + .304 * s, .033 * s, .027 * s, .034 * s, m, { mode:7 });
    A.ball(a + .126 * s, b, y + .314 * s, .011 * s, .009 * s, .010 * s, C('#d4948d'),
           { mode:7, gloss:.40 });
    for (const q of [-1, 1])
      A.ball(a + .102 * s, b + q * .030 * s, y + .344 * s, .012 * s, .013 * s, .010 * s,
             C('#9ab452'), { mode:7, gloss:.60 });
    for (const q of [-1, 1])
      A.taper(a + .046 * s, b + q * .044 * s, y + .382 * s, .046 * s, .058 * s, .034 * s, d,
              { mode:7, rz:q * .22 });
    A.cap(a + .058 * s, b + .096 * s, y + .036 * s, .150 * s, .034 * s, .034 * s, d,
          { mode:7, rz:.12 });
  };
  // ---- 鱼. Body, peduncle, caudal fin, dorsal and an eye. Three ellipsoids was the least that
  // reads as a fish and it read as a slug; the eye is what turns it round.
  const fishRigs=[];
  const fish = (a, b, y, c, s = 1, tilt = 0) => {
    const d = sh(c, .76), o = { mode:7, gloss:.42, rz:tilt };
    const parts=[
      A.ball(a, b, y, .052 * s, .031 * s, .020 * s, c, o),
      A.ball(a, b - .050 * s, y, .016 * s, .020 * s, .008 * s, d, o),
      A.ball(a, b - .076 * s, y, .022 * s, .036 * s, .006 * s, d, o),
      A.ball(a, b + .006 * s, y + .026 * s, .026 * s, .014 * s, .006 * s, d, o),
      A.ball(a + .014 * s, b + .034 * s, y + .006 * s, .0065 * s, .0065 * s, .0065 * s,
        C('#131110'), { mode:7, gloss:.55 }),
    ];
    parts.forEach(p=>A.dynamic(p,a,b,y,.24));
    fishRigs.push({a,b,phase:fishRigs.length*1.37,
      parts:parts.map(p=>({p,x:p.m[12],y:p.m[13],z:p.m[14]}))});
  };

  // ---- 兔子. Sitting, front paws down, head over them. The whole read is the ears: two of them,
  // a fifth of the animal's height each, leaning apart and back. A rabbit drawn with short ears is
  // a guinea pig, and one drawn with the ears vertical is a cartoon — a real one carries them
  // canted, and the inner ear is a paler capsule set a few millimetres in front of the outer.
  //
  // Sizes are real: a Dutch rabbit is about 32 cm nose to tail sitting and 22 cm to the top of the
  // skull, which at s = 1 is what these numbers add up to. That convention comes from the animal
  // rig in js/figure.js — every dimension there is metres rather than a fraction of a reference
  // animal, because animals do not scale off one another — and it is worth keeping even though
  // none of these can use that rig: it has three body plans (quad, ape, upright) and no small
  // mammal, so a pet-shop rabbit is primitives, exactly like the puppy above it.
  const rabbit = (a, b, y, c, s = 1) => {
    const d = sh(c, .72), m = lt(c, 1.15), pk = C('#c98d8a');
    A.ball(a - .055 * s, b, y + .085 * s, .085 * s, .085 * s, .095 * s, c, { mode:7, gloss:.09 });
    A.ball(a + .020 * s, b, y + .100 * s, .072 * s, .080 * s, .085 * s, c, { mode:7, gloss:.09 });
    A.ball(a + .085 * s, b, y + .045 * s, .050 * s, .040 * s, .060 * s, m, { mode:7 });
    for (const q of [-1, 1])                                                   // hind feet, forward
      A.ball(a + .050 * s, b + q * .058 * s, y + .020 * s, .028 * s, .020 * s, .062 * s, m,
             { mode:7 });
    A.ball(a + .100 * s, b, y + .165 * s, .054 * s, .052 * s, .058 * s, c, { mode:7, gloss:.10 });
    A.ball(a + .136 * s, b, y + .150 * s, .032 * s, .027 * s, .034 * s, m, { mode:7 });
    A.ball(a + .158 * s, b, y + .152 * s, .009 * s, .008 * s, .008 * s, pk, { mode:7, gloss:.30 });
    for (const q of [-1, 1])
      A.ball(a + .118 * s, b + q * .034 * s, y + .186 * s, .010 * s, .011 * s, .009 * s,
             C('#16120e'), { mode:7, gloss:.55 });
    for (const q of [-1, 1]) {                                                 // the ears
      A.cap(a + .066 * s, b + q * .030 * s, y + .258 * s, .021 * s, .132 * s, .026 * s, d,
            { mode:7, rz:q * .19, rx:-.20 });
      A.cap(a + .076 * s, b + q * .030 * s, y + .254 * s, .011 * s, .102 * s, .014 * s, pk,
            { mode:7, rz:q * .19, rx:-.20 });
    }
    A.ball(a - .118 * s, b, y + .108 * s, .034 * s, .034 * s, .028 * s, lt(c, 1.24), { mode:7 });
  };
  // ---- 仓鼠. Ten centimetres of animal, so it is drawn as a shape and not as a portrait: a fat
  // ellipsoid with a smaller one for a head, two round ears standing off the skull and a nose that
  // clears the cheeks. At this size the ears and the black eye do all the work.
  const hamster = (a, b, y, c, s = 1) => {
    const d = sh(c, .74), m = lt(c, 1.16);
    A.ball(a, b, y + .038 * s, .046 * s, .038 * s, .056 * s, c, { mode:7, gloss:.10 });
    A.ball(a + .048 * s, b, y + .042 * s, .032 * s, .030 * s, .032 * s, c, { mode:7, gloss:.10 });
    A.ball(a + .071 * s, b, y + .032 * s, .019 * s, .016 * s, .020 * s, m, { mode:7 });
    A.ball(a + .085 * s, b, y + .034 * s, .006 * s, .005 * s, .005 * s, C('#221c18'),
           { mode:7, gloss:.40 });
    for (const q of [-1, 1]) {
      A.ball(a + .062 * s, b + q * .019 * s, y + .053 * s, .007 * s, .008 * s, .006 * s,
             C('#16120e'), { mode:7, gloss:.55 });
      A.ball(a + .034 * s, b + q * .026 * s, y + .066 * s, .015 * s, .015 * s, .007 * s, d,
             { mode:7 });
      A.ball(a + .028 * s, b + q * .040 * s, y + .010 * s, .014 * s, .010 * s, .024 * s, m,
             { mode:7 });
    }
    A.ball(a - .048 * s, b, y + .036 * s, .012 * s, .011 * s, .010 * s, m, { mode:7 });
  };
  // ---- 鹦鹉. A perched budgerigar: a body leaning forward off two short legs, a round skull with
  // a cere and a hooked beak on the front of it, folded wings that break the body's outline, and a
  // long tail hanging behind and below. The tail is what makes it a parakeet rather than a finch.
  // Returns its own parts so the cage can hop it about without rebuilding anything.
  const budgie = (a, b, y, c, s = 1) => {
    const d = sh(c, .72), m = lt(c, 1.16), parts = [];
    parts.push(
      A.ball(a, b, y + .052 * s, .036 * s, .052 * s, .040 * s, c, { mode:7, gloss:.16 }),
      A.ball(a + .024 * s, b, y + .046 * s, .031 * s, .040 * s, .031 * s, m,
             { mode:7, gloss:.16 }),
      A.ball(a + .030 * s, b, y + .108 * s, .028 * s, .030 * s, .028 * s, c,
             { mode:7, gloss:.18 }),
      A.ball(a + .052 * s, b, y + .100 * s, .012 * s, .011 * s, .016 * s, C('#d8a63a'),
             { mode:7, gloss:.30 }),
      A.cap(a - .068 * s, b, y + .026 * s, .015 * s, .092 * s, .011 * s, d,
            { mode:7, rx:1.22, gloss:.14 }));
    for (const q of [-1, 1]) parts.push(
      A.ball(a + .040 * s, b + q * .019 * s, y + .117 * s, .006 * s, .006 * s, .005 * s,
             C('#12100e'), { mode:7, gloss:.60 }),
      A.ball(a - .004 * s, b + q * .032 * s, y + .056 * s, .010 * s, .038 * s, .046 * s, d,
             { mode:7, rz:q * .10, gloss:.14 }),
      A.cap(a + .012 * s, b + q * .016 * s, y + .008 * s, .006 * s, .028 * s, .006 * s,
            C('#8a8378'), { mode:7 }));
    return parts;
  };
  // ---- 乌龟. The reptile a Chinese pet shop actually sells, by a distance: a shallow dome with a
  // rim under it, four flippers splayed out from beneath and a neck that comes out of the front of
  // the shell rather than off the top of it. Scutes are five flat discs on the dome — without them
  // it is a stone.
  const turtle = (a, b, y, c, s = 1) => {
    const d = sh(c, .66), m = lt(c, 1.20);
    A.ball(a, b, y + .028 * s, .070 * s, .036 * s, .086 * s, c, { mode:7, gloss:.28 });
    A.cyl(a, b, y + .011 * s, .072 * s, .020 * s, d, { gloss:.22 });
    for (let i = 0; i < 5; i++)
      A.ball(a + [-.040, .000, .040, .000, .000][i] * s, b + [0, -.034, 0, .034, 0][i] * s,
             y + .054 * s, .022 * s, .008 * s, .024 * s, d, { mode:7, gloss:.26 });
    A.ball(a + .092 * s, b, y + .024 * s, .020 * s, .018 * s, .026 * s, m, { mode:7, gloss:.24 });
    for (const q of [-1, 1]) {
      A.ball(a + .108 * s, b + q * .009 * s, y + .032 * s, .005 * s, .005 * s, .005 * s,
             C('#16120e'), { mode:7, gloss:.55 });
      A.ball(a + .048 * s, b + q * .060 * s, y + .014 * s, .030 * s, .009 * s, .036 * s, m,
             { mode:7, rz:q * .22 });
      A.ball(a - .050 * s, b + q * .054 * s, y + .012 * s, .024 * s, .008 * s, .030 * s, m,
             { mode:7, rz:q * .18 });
    }
  };
  // ---- 蜥蜴. Lying along a branch, head at +a, and every mass of it low: a lizard whose body
  // stands clear of what it is on is a dinosaur toy. The four legs splay sideways rather than
  // hanging down, which is the single thing that separates a reptile's stance from a mammal's,
  // and the tail is longer than the rest of the animal put together.
  const lizard = (a, b, y, c, s = 1) => {
    const d = sh(c, .70), m = lt(c, 1.18);
    A.ball(a, b, y + .022 * s, .038 * s, .028 * s, .082 * s, c, { mode:7, gloss:.22 });
    A.ball(a + .098 * s, b, y + .024 * s, .032 * s, .026 * s, .042 * s, c, { mode:7, gloss:.24 });
    A.ball(a + .136 * s, b, y + .020 * s, .022 * s, .018 * s, .026 * s, m, { mode:7, gloss:.24 });
    A.cap(a - .156 * s, b, y + .018 * s, .013 * s, .180 * s, .013 * s, d,
          { mode:7, rx:Math.PI / 2, gloss:.20 });
    for (let i = 0; i < 5; i++)                                                    // dorsal spines
      A.ball(a + (i - 2) * .030 * s, b, y + .046 * s, .008 * s, .012 * s, .010 * s, d,
             { mode:7, gloss:.18 });
    for (const q of [-1, 1]) {
      A.ball(a + .114 * s, b + q * .024 * s, y + .036 * s, .008 * s, .008 * s, .007 * s,
             C('#12100e'), { mode:7, gloss:.55 });
      for (const p of [-1, 1]) {
        A.cap(a + p * .058 * s, b + q * .048 * s, y + .012 * s, .046 * s, .013 * s, .013 * s,
              m, { mode:7, rz:q * .30 });
        A.ball(a + p * .062 * s, b + q * .074 * s, y + .008 * s, .014 * s, .006 * s, .016 * s,
               m, { mode:7 });
      }
    }
  };

  // ================================================================ shelf goods
  // A sack of feed. The printed face covers most of it, because a feed sack is print with a bit
  // of sack showing round the edge and not the other way about, and there is a second band over
  // the top: in a shop this size you look down onto a stack as often as at it.
  const sack = (a, b, y, c, wb = .40, da = .30, h = .24) => {
    A.put(a, b, da, wb, h, y + h / 2, c, { mode:7, round:.07, gloss:.09 });
    A.put(a + da / 2 - .008, b, .018, wb * .58, h * .46, y + h * .58, P.card,
          { hard:true, mode:7, gloss:.06 });
    A.put(a + da / 2 - .012, b, .022, wb * .30, h * .22, y + h * .64, sh(c, .70),
          { hard:true, mode:7, gloss:.06 });
    A.put(a + da / 2 - .012, b, .022, wb * .56, h * .10, y + h * .30, C('#8d3630'),
          { hard:true, mode:7, gloss:.06 });
    A.put(a - da * .10, b, da * .52, wb * .70, .012, y + h - .005, lt(c, 1.16),
          { hard:true, mode:7, gloss:.06 });
  };
  // A carton of something — treats, litter, a starter kit. Reads at a glance because of the band.
  const carton = (a, b, y, c, wb = .16, da = .13, h = .22) => {
    A.put(a, b, da, wb, h, y + h / 2, c, { hard:true, mode:7, gloss:.12 });
    A.put(a + da / 2 - .004, b, .010, wb * .74, h * .40, y + h * .60, P.card,
          { hard:true, mode:7, gloss:.08 });
    A.put(a + da / 2 - .006, b, .012, wb * .52, h * .09, y + h * .28, lt(c, 1.5),
          { hard:true, mode:7, gloss:.08 });
  };
  // A tin. Six in a row is instantly a pet shop shelf and costs almost nothing.
  const tin = (a, b, y, c, r = .038, h = .052) => {
    A.cyl(a, b, y + h / 2, r, h, c, { gloss:.34 });
    A.cyl(a, b, y + h - .004, r * .97, .010, P.steelL, { gloss:.55 });
  };
  // A bowl: a tapered wall the right way up, with a darker well inside so it is not a lump.
  const bowl = (a, b, y, c, r = .085) => {
    A.taper(a, b, y + .028, r * 2, .056, r * 2, c, { gloss:.34 });
    A.cyl(a, b, y + .048, r * .70, .014, sh(c, .55), { gloss:.20 });
  };
  // A lit fascia with the run's name on it, used over both back-wall units and both side signs.
  const fascia = (a, b, w, dp, y, text, size) => {
    A.put(a, b, w, dp, .26, y, P.joinD, { hard:true, gloss:.22, ...MW });
    A.put(a + w / 2 - .012, b, .022, dp - .12, .16, y - .005, acc,
          { hard:true, mode:1, alpha:.50, glow:.08 });
    A.glyph(a + w / 2 + .006, b, y - .005, text, { size, gap:size * .42, color:P.gold, glow:.14 });
  };

  // ---------------------------------------------------------------- the two back-wall runs
  // Both are built to the same section, because that repetition is most of what makes a shopfit
  // look designed: plinth, cabinet, worktop, two 60 cm display tiers with a deck between them,
  // a lit header, an open upper unit and a cornice.
  // Moving parts collected as they are built, and driven by the motions at the end of the file:
  // the four spokes of the hamster wheel, and the two caged birds. Both are gathered here rather
  // than looked up later because a prop's matrix is the only handle there is on it.
  const wheelSpokes = [], birdRigs = [];
  const Y_WORK = .650, Y_T1 = .98, Y_T2 = 1.64, Y_DECK = 1.310, Y_TOP = 1.970;
  const Y_FAS = 2.130, Y_UPPER = 2.640, Y_CORN = 3.080, CELL = .60;

  // ================================================================ 鱼缸 the tank run
  // The left half of the back wall as you look at it, and the only cold light in the shop. Six
  // tanks in two tiers, a cabinet of dry goods under them, an open shelf of aquarium kit over,
  // and a 6500 K tube under every deck. The tanks are what people stand at, so they get the
  // width, the glow and a light of their own.
  const TC = -2.18, TW = 2.88;
  const TB = [TC - .96, TC, TC + .96], TY = [Y_T1, Y_T2], TKW = .90;

  A.put(.74, TC, .56, TW - .06, .13, .065, P.trim,  { hard:true, gloss:.26 });        // plinth
  A.put(.76, TC, .62, TW, .49, .375, P.joinD, { hard:true, gloss:.18, ...MW });        // cabinet
  for (let i = 0; i < 4; i++) {                                                        // its doors
    const db = TC - 1.08 + i * .72;
    A.put(1.077, db, .014, .66, .40, .375, P.joinM, { hard:true, gloss:.24, ...MW });
    A.put(1.087, db, .012, .13, .022, .545, P.steelL, { hard:true, gloss:.55 });
  }
  A.put(.75, TC, .66, TW + .06, .06, Y_WORK, P.joinL, { hard:true, gloss:.30, ...MW });

  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
    const tb = TB[k], ty = TY[r], n = r * 3 + k, y0 = ty - CELL / 2;
    // Two of the six are not aquariums, and that is what a Chinese pet shop's glass wall is really
    // like: the same carcass, the same lighting, different animals in it. The bottom cell at the
    // -b end is the small-mammal tank — hamsters live at a metre, which is where the children who
    // want one can see in — and the top cell at the +b end is the reptile vivarium, dry and lit
    // from above rather than through the water. Everything structural below (the deck, the
    // mullions, the glass, the silicone) is shared, so this costs no new batch and no new call.
    if (n === 0) {
      // ---- 仓鼠. Deep paper bedding, a wooden house, a tube, a wheel and a food bowl. The bedding
      // has to be deep: a hamster tank with a floor rather than a drift in it reads as a vitrine.
      A.put(.90, tb, .30, TKW, .14, y0 + .070, C('#c9b78e'), { hard:true, mode:7, gloss:.06 });
      for (let i = 0; i < 6; i++)                                       // the drift, not a slab
        A.ball(.86 + (i % 2) * .09, tb - .34 + i * .135, y0 + .142, .080, .028, .046,
               i % 2 ? C('#d5c49c') : C('#bfae86'), { mode:7, gloss:.05 });
      A.put(.94, tb - .30, .20, .22, .17, y0 + .225, C('#8a6a44'),                  // the house
            { hard:true, gloss:.16, ...MW });
      A.put(1.045, tb - .30, .012, .085, .105, y0 + .195, C('#4a3729'), { hard:true, gloss:.14 });
      A.cyl(.90, tb + .30, y0 + .195, .052, .21, C('#c2952e'),                      // the tube
            { rz:Math.PI / 2, gloss:.30 });
      // The wheel: a static rim and hub, and four spokes that turn. Built as boxes on purpose —
      // `put` sizes map straight onto M.scale in the tick below, which a cylinder's do not.
      const WA = .90, WB = tb + .04, WY = y0 + .265, ww = A.at(WA, WB);
      A.cyl(WA, WB, WY, .118, .014, C('#4f8a3e'), { rz:Math.PI / 2, gloss:.28 });
      A.cyl(WA, WB, WY, .026, .050, P.steelL, { rz:Math.PI / 2, gloss:.50 });
      for (let i = 0; i < 4; i++) {
        const sp = A.put(WA, WB, .022, .012, .215, WY, C('#6ba354'),
                         { hard:true, gloss:.26, rx:i * Math.PI / 4 });
        A.dynamic(sp, WA, WB, WY, .20);
        wheelSpokes.push({ p:sp, phase:i * Math.PI / 4, x:ww[0], y:A.y0 + WY, z:ww[1] });
      }
      bowl(1.02, tb + .06, y0 + .146, C('#3f7f96'), .046);
      retainAnimal('hamster', () => hamster(.98, tb - .10, y0 + .150, C('#d8c49c'), 1.0));
      hamster(.90, tb + .21, y0 + .148, C('#a9764a'), .92);
    } else if (n === 5) {
      // ---- 爬虫. Sand, a slate slab, a cork branch, a shallow water dish and a heat lamp in the
      // roof of the cell. The lamp is the whole tell: an aquarium is lit through blue water and a
      // vivarium is lit by a hot orange spot standing over a dry floor.
      A.put(.90, tb, .30, TKW, .09, y0 + .045, C('#a8926a'), { hard:true, mode:7, gloss:.08 });
      for (let i = 0; i < 5; i++)
        A.ball(.88 + (i % 2) * .10, tb - .32 + i * .16, y0 + .098, .070, .020, .048,
               i % 2 ? C('#b39c72') : C('#9c8760'), { mode:7, gloss:.08 });
      A.put(.96, tb - .28, .17, .26, .028, y0 + .105, C('#6b6a64'), { hard:true, gloss:.24 });
      A.cap(.94, tb + .10, y0 + .150, .034, .40, .034, C('#5c4530'),                 // cork branch
            { rz:Math.PI / 2, rx:.16, gloss:.12 });
      for (const q of [-1, 1])
        A.cyl(.94, tb + .10 + q * .17, y0 + .118, .020, .066, C('#4e3a28'), { gloss:.12 });
      A.taper(1.02, tb + .34, y0 + .108, .13, .034, .13, C('#7f8a86'),               // water dish
              { rz:Math.PI, gloss:.30 });
      A.cyl(1.02, tb + .34, y0 + .118, .052, .010, C('#7fbcd2'), { mode:1, glow:.05 });
      A.put(.84, tb - .12, .13, .13, .058, y0 + CELL - .055, P.steelD,               // the lamp
            { hard:true, gloss:.44, ...MS });
      A.cyl(.84, tb - .12, y0 + CELL - .098, .048, .034, C('#ffb058'), { mode:1, glow:.20 });
      retainAnimal('lizard', () => lizard(.92, tb + .10, y0 + .176, C('#8a7a3e'), 1.02));
      retainAnimal('turtle', () => turtle(1.00, tb - .26, y0 + .120, C('#4a5c3a'), .96));
    } else {
    // The water, as a volume 40 cm deep filling the whole box. Four bands, so the column is
    // brightest under the tube and nearly black on the gravel.
    A.put(.66, tb, .40, TKW, .16, ty + .22, P.w1, { hard:true, mode:1, glow:.095 });
    A.put(.66, tb, .40, TKW, .16, ty + .06, P.w2, { hard:true, mode:1, glow:.075 });
    A.put(.66, tb, .40, TKW, .16, ty - .10, P.w3, { hard:true, mode:1, glow:.055 });
    A.put(.66, tb, .40, TKW, .18, ty - .27, P.w4, { hard:true, mode:1, glow:.035 });
    // The bed, and the 22 cm of tank in front of the water where everything else lives. Thin and
    // dark: a 10 cm pale slab across the bottom of a tank is a shelf, not a gravel bed.
    A.put(.965, tb, .21, TKW, .050, y0 + .025, P.gravel, { hard:true, gloss:.14 });
    A.put(.965, tb, .20, TKW, .016, y0 + .058, P.sand,   { hard:true, gloss:.16 });
    for (let s = 0; s < 3; s++)
      A.ball(1.055, tb - .30 + s * .30 + (n % 2) * .07, y0 + .050, .055, .022, .026,
             s % 2 ? P.gravel : P.sand, { gloss:.16 });
    A.ball(.93, tb - .27 + (n % 3) * .09, y0 + .078, .062, .038, .048, C('#7a7263'), { gloss:.22 });
    A.ball(1.00, tb + .24 - (n % 2) * .08, y0 + .072, .046, .032, .040, C('#6b6456'), { gloss:.22 });
    A.cap(.95, tb + .04, y0 + .110, .015, .30, .015, P.bog, { rz:1.28, gloss:.14 });   // driftwood
    A.cap(1.00, tb - .10, y0 + .092, .014, .19, .014, P.bog, { rz:1.05, gloss:.14 });
    // Planting: clumped at the two ends, tall enough to break the waterline, off plumb.
    for (let p = 0; p < 6; p++) {
      const pb = tb + [-.40, -.33, -.26, .26, .34, .41][p];
      const ph = [.30, .42, .24, .38, .26, .34][(p + n) % 6];
      A.cap(.91 + ((p + n) % 3) * .045, pb, y0 + .058 + ph / 2, .028, ph, .022,
            [P.plantA, P.plantB, P.plantC, P.plantD][(p + n) % 4],
            { rz:(((p * 7 + n) % 5) - 2) * .09, gloss:.18 });
    }
    for (let f = 0; f < 3; f++)
      fish(.94 + ((f * 3 + n) % 3) * .045, tb - .24 + f * .24, y0 + .26 + ((f + n) % 3) * .07,
           FISH[(f + n * 2) % FISH.length], .86 + ((f + n) % 3) * .16,
           (((f + n) % 3) - 1) * .26);
    // The airline: five bubbles climbing one back corner. Small and dim — a sphere concentrates a
    // glow where a strip spreads it, and a lit tank is exactly where that goes wrong.
    for (let g = 0; g < 5; g++)
      A.ball(.91, tb + .40, y0 + .13 + g * .075, .012 - g * .0009, .014, .012, P.surf,
             { mode:1, glow:.07 });
    // The surface, seen from slightly above; opaque, because at this size the tint does all the
    // work and a see-through one would cost six draw calls for a difference nobody can see. Dim:
    // at glow .09 in a pale blue it came out as a white slab across the middle of every tank.
    A.put(.975, tb, .21, TKW - .01, .012, y0 + .500, P.surf, { hard:true, mode:1, glow:.035 });
    // The tube, tucked right under the deck above so what you see is the light it throws on the
    // water rather than the lamp. It used to sit at .32 and blew out the top of every tank.
    A.put(.82, tb, .46, TKW - .14, .018, y0 + CELL - .020, P.tube,
          { hard:true, mode:1, glow:.15 });
    }
    // The glass, and the black silicone corners that make it a tank rather than an opening. Gloss
    // is deliberately under .6: at .6 and over the shader adds a sky reflection to a mode-1 pane,
    // which on a cabinet inside a shop is a milky wash over everything behind it.
    A.put(1.10, tb, .020, TKW + .02, CELL, ty, P.glass, { hard:true, mode:1, alpha:.15, gloss:.55 });
    for (const q of [-1, 1])
      A.put(1.06, tb + q * (TKW / 2 + .010), .08, .022, CELL, ty, P.trim, { hard:true, gloss:.30 });
  }
  // Decks, cheeks and the frame the six of them sit in.
  for (const dy of [Y_DECK, Y_TOP])
    A.put(.76, TC, .66, TW, .06, dy, P.joinL, { hard:true, gloss:.26, ...MW });
  for (const cb of [TC - 1.47, TC - .49, TC + .49, TC + 1.47])
    A.put(.76, cb, .66, .06, 1.32, 1.310, P.joinD, { hard:true, gloss:.18, ...MW });
  for (const mb of [TC - 1.47, TC - .49, TC + .49, TC + 1.47])
    A.put(1.10, mb, .06, .05, 1.32, 1.310, P.steelD, { hard:true, gloss:.46, ...MS });
  for (const my of [Y_WORK, Y_DECK, Y_TOP])
    A.put(1.10, TC, .06, TW + .10, .05, my, P.steelD, { hard:true, gloss:.46, ...MS });
  fascia(.66, TC, .48, TW + .12, Y_FAS, '金鱼 · 仓鼠 · 乌龟', .100);
  // The open upper unit: back, cheeks, two shelves and a top. Only 42 cm deep, so it clears the
  // shell's ceiling spots, which hang at a .89–1.02.
  A.put(.45, TC, .06, TW + .12, .76, Y_UPPER, P.joinD, { hard:true, gloss:.18, ...MW });
  for (const q of [-1, 1])
    A.put(.66, TC + q * (TW / 2 + .045), .48, .05, .76, Y_UPPER, P.joinM,
          { hard:true, gloss:.22, ...MW });
  for (const sy of [2.520, 2.790]) {
    A.put(.66, TC, .46, TW + .06, .035, sy, P.joinL, { hard:true, gloss:.26, ...MW });
    A.put(.885, TC, .012, TW + .06, .046, sy + .030, P.trim, { hard:true, gloss:.30 });
  }
  for (let i = 0; i < 9; i++) {                                    // boxes of kit on those shelves
    const ib = TC - 1.28 + i * .32;
    carton(.66, ib, 2.278, PACK[i % PACK.length], .21, .18, .21);
    carton(.66, ib, 2.538, PACK[(i + 3) % PACK.length], .21, .18, .21);
    if (i % 2) for (let j = 0; j < 2; j++)
      tin(.60 + j * .12, ib, 2.808, PACK[(i + j) % PACK.length], .042, .075);
    else bowl(.66, ib, 2.808, [P.steelL, acc, C('#b8563f')][i % 3], .068);
  }
  A.put(.64, TC, .42, TW + .18, .12, Y_CORN, P.joinM, { hard:true, gloss:.24, ...MW });
  A.stop(.21, 1.16, TC - TW / 2 - .10, TC + TW / 2 + .10);

  // ================================================================ 小狗 the pen wall
  // The right half, on the same section. Six glass-fronted cubbies: resin tray, vet bedding, a
  // blanket somebody has been sleeping under, a drinking bottle clipped to the mullion and a card
  // with the price on it. One is left empty and made up — a wall where every pen is occupied
  // reads as a diagram rather than as a shop that has sold two of them this morning.
  const PC = 1.72, PW = 2.04;
  const CB = [PC - .68, PC, PC + .68], CY = [Y_T1, Y_T2], CW = .62;

  A.put(.74, PC, .58, PW - .06, .13, .065, P.trim, { hard:true, gloss:.26 });
  A.put(.77, PC, .64, PW, .49, .375, P.joinD, { hard:true, gloss:.18, ...MW });
  for (let i = 0; i < 3; i++) {
    A.put(1.087, PC - .68 + i * .68, .014, .62, .40, .375, P.joinM,
          { hard:true, gloss:.24, ...MW });
    A.put(1.097, PC - .68 + i * .68, .012, .13, .022, .545, P.steelL, { hard:true, gloss:.55 });
  }
  A.put(.76, PC, .68, PW + .06, .06, Y_WORK, P.joinL, { hard:true, gloss:.30, ...MW });
  for (const dy of [Y_DECK, Y_TOP])
    A.put(.77, PC, .68, PW, .06, dy, P.joinL, { hard:true, gloss:.26, ...MW });
  for (const cb of [PC - 1.02, PC - .34, PC + .34, PC + 1.02])
    A.put(.77, cb, .68, .06, 1.32, 1.310, P.joinD, { hard:true, gloss:.18, ...MW });

  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
    const cb = CB[k], cy = CY[r], n = r * 3 + k;
    // The cell back. Lit rather than mode 1: an unlit pale panel at the back of a cubby renders
    // flat white and the whole wall reads as six lightboxes with dogs in front of them. Lit, it
    // falls off into the corners and the cell has a depth to it.
    A.put(.47, cb, .05, CW + .06, CELL, cy, P.cellB, { hard:true, gloss:.10 });
    A.put(.80, cb, .58, CW, .035, cy - .283, P.pan, { hard:true, gloss:.28, ...MS });   // resin tray
    A.put(.82, cb, .46, CW - .14, .050, cy - .240, P.bedA, { mode:7, round:.05 });      // vet bed
    A.put(.82, cb, .40, CW - .22, .020, cy - .205, lt(P.bedA, 1.12), { mode:7 });
    A.ball(.65, cb - .17, cy - .188, .088, .044, .092, P.bedB, { mode:7 });             // blanket
    // Who is in which pen. `n % 3 === 2` has to be tested after the named cells or it swallows
    // them: the cat lives at n = 5, and the first version of this line never drew her at all.
    if (n === 4) {                                                          // the one made up empty
      A.ball(.73, cb + .15, cy - .192, .058, .042, .064, P.bedC, { mode:7 });
      bowl(1.00, cb - .19, cy - .265, P.steelL, .044);
    } else if (n === 3) {
      // 兔子, in the pen a puppy used to have. A rabbit run is bedded on hay rather than on a vet
      // bed and there is always a handful of greens in the corner, so the cell is dressed for the
      // animal in it: the pale mat above is left, the hay goes on top of it, and the water bottle
      // on the mullion is the one fitting a rabbit and a puppy genuinely share.
      for (let i = 0; i < 5; i++)
        A.cap(.78 + (i % 2) * .10, cb - .22 + i * .11, cy - .222, .012, .13, .012,
              i % 2 ? C('#c9b078') : C('#b09a63'), { mode:7, rz:1.35 + (i % 3) * .18 });
      retainAnimal('rabbit', () => rabbit(.84, cb - .13, cy - .214, FUR[2], .84));
      rabbit(.80, cb + .17, cy - .214, FUR[5], .78);
      bowl(1.02, cb + .22, cy - .262, C('#4f8a3e'), .042);
    } else if (n === 5) {
      cat(.83, cb + .03, cy - .198, FUR[4], .92);
    } else if (n === 2) {
      nap(.85, cb + .02, cy - .198, FUR[2], .88);
    } else {
      pup(.82, cb + .03, cy - .198, FUR[n % FUR.length], n === 3 ? .86 : .96);
    }
    if (n === 1) nap(.68, cb - .17, cy - .198, FUR[5], .78);
    // Drinking bottle: the body, the collar, the steel spout and the bracket on the mullion.
    A.cyl(.86, cb + CW / 2 - .05, cy - .090, .028, .18, C('#b9d8e4'),
          { mode:1, alpha:.72, gloss:.40 });
    A.cyl(.86, cb + CW / 2 - .05, cy + .006, .028, .022, acc, { gloss:.40 });
    A.cap(.86, cb + CW / 2 - .05, cy - .198, .009, .075, .009, P.steelL, { gloss:.60 });
    A.put(.90, cb + CW / 2 - .025, .05, .055, .024, cy - .045, P.steelD, { hard:true, gloss:.50 });
    // The price card, on the bottom rail where a shop puts it.
    A.put(1.113, cb, .012, .30, .085, cy - .335, P.card, { hard:true, mode:1, gloss:.18 });
    A.put(1.118, cb, .010, .30, .020, cy - .370, acc, { hard:true, mode:1, gloss:.20 });
  }
  // The six panes, built after the cells. Full cell size, or the pen shows a strip of open air
  // down each side and reads as a shelf.
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++)
    A.put(1.103, CB[k], .018, CW + .04, CELL, CY[r], P.glass,
          { hard:true, mode:1, alpha:.16, gloss:.55 });
  for (const mb of [PC - 1.02, PC - .34, PC + .34, PC + 1.02])
    A.put(1.12, mb, .06, .05, 1.32, 1.310, P.steelD, { hard:true, gloss:.46, ...MS });
  for (const my of [Y_WORK, Y_DECK, Y_TOP])
    A.put(1.12, PC, .06, PW + .10, .05, my, P.steelD, { hard:true, gloss:.46, ...MS });
  fascia(.68, PC, .48, PW + .12, Y_FAS, '小狗 · 小猫 · 兔子', .100);
  // Upper unit: bedding, carriers and bowls, which is what is over the pens in a real shop
  // because it is the bulky, light stock nobody minds reaching over a dog for.
  A.put(.45, PC, .06, PW + .12, .76, Y_UPPER, P.joinD, { hard:true, gloss:.18, ...MW });
  for (const q of [-1, 1])
    A.put(.66, PC + q * (PW / 2 + .045), .48, .05, .76, Y_UPPER, P.joinM,
          { hard:true, gloss:.22, ...MW });
  for (const sy of [2.520, 2.790]) {
    A.put(.66, PC, .46, PW + .06, .035, sy, P.joinL, { hard:true, gloss:.26, ...MW });
    A.put(.885, PC, .012, PW + .06, .046, sy + .030, P.trim, { hard:true, gloss:.30 });
  }
  for (let i = 0; i < 6; i++) {
    const bb = PC - .86 + i * .345;
    if (i % 3 === 0) A.cyl(.66, bb, 2.388, .105, .30, [P.bedB, P.bedC][(i / 3) % 2],
                           { mode:7, gloss:.10, rz:Math.PI / 2 });
    else if (i % 3 === 1) {
      A.put(.66, bb, .30, .30, .21, 2.383, P.card, { hard:true, mode:7, gloss:.14 });  // a carrier
      A.put(.808, bb, .014, .17, .13, 2.388, P.trim, { hard:true, gloss:.30 });
      A.put(.66, bb, .28, .09, .026, 2.501, P.steelD, { hard:true, gloss:.45 });
    } else carton(.66, bb, 2.278, PACK[(i + 2) % PACK.length], .24, .19, .19);
    if (i % 2) bowl(.66, bb, 2.538, [P.steelL, acc, C('#b8563f')][i % 3], .066);
    else carton(.66, bb, 2.538, PACK[(i + 5) % PACK.length], .22, .18, .21);
    bowl(.66, bb, 2.808, [acc, P.steelL, C('#b8563f')][i % 3], .068);
  }
  A.put(.64, PC, .42, PW + .18, .12, Y_CORN, P.joinM, { hard:true, gloss:.24, ...MW });
  A.stop(.21, 1.16, PC - PW / 2 - .10, PC + PW / 2 + .10);

  // ================================================================ 锦鲤 the middle bay
  // The bay between the two runs is where the shell writes the shop's own name, so it is left
  // open above 1.3 and given a koi vat below it — a black tub of orange fish standing on the
  // floor at the end of the aisle, which is what is in the middle of a Chinese pet shop.
  // The strip of shell wall under the feature panel — it starts at y .45 — shows between the two
  // runs as a bright white band at floor level. A dark base board across the bay closes it.
  A.put(.44, 0, .06, 1.50, .46, .230, P.joinD, { hard:true, gloss:.16, ...MW });
  A.cyl(1.02, 0, .215, .485, .43, P.trim, { gloss:.28, ...MS });
  A.cyl(1.02, 0, .230, .455, .36, P.w2, { mode:1, glow:.085 });                // water, to y .41
  A.cyl(1.02, 0, .436, .505, .052, P.steelD, { gloss:.45 });                   // the rolled rim
  for (let i = 0; i < 5; i++) {
    const draw = () => fish(.88 + (i % 3) * .13, -.30 + i * .15, .404,
      [FISH[0], FISH[6], FISH[1], FISH[3], FISH[0]][i], 1.15, ((i % 3) - 1) * .28);
    if (i === 0) retainAnimal('fish', draw); else draw();
  }
  A.put(1.02, .43, .10, .13, .10, .500, P.steelD, { hard:true, gloss:.45, ...MS });  // the pump
  A.cap(1.02, .34, .466, .018, .12, .018, P.steelD, { gloss:.40, rz:1.2 });
  A.stop(.40, 1.56, -.76, .76);

  // ================================================================ 宠物美容 grooming
  // The far corner, screened at half height on purpose: you are meant to see that a dog is being
  // done, and nothing else. Tiled splashback, a stainless table on a pedestal, the arm and the
  // loop over it, a trolley of clippers and a dryer on the floor.
  A.put(1.12, 2.90, 1.68, .045, .95, .535, P.frost, { hard:true, mode:1, alpha:.46, gloss:.30 });
  A.put(1.12, 2.90, 1.74, .075, .055, 1.038, P.steelD, { hard:true, gloss:.50, ...MS });
  A.put(1.12, 2.90, 1.74, .075, .050, .045, P.steelD, { hard:true, gloss:.50, ...MS });
  for (const q of [.30, 1.94])
    A.put(q, 2.90, .075, .075, 1.06, .530, P.steelD, { hard:true, gloss:.50, ...MS });
  A.put(.30, 3.58, .07, 1.24, 1.40, .900, P.tile, { hard:true, gloss:.30, ...MT });   // splashback
  A.put(.345, 3.58, .02, 1.24, .035, 1.618, P.steelL, { hard:true, gloss:.55 });
  A.put(.40, 3.58, .16, 1.06, .035, 1.320, P.steelL, { hard:true, gloss:.50, ...MS }); // a shelf
  for (let i = 0; i < 5; i++)
    A.cyl(.40, 3.16 + i * .21, 1.428, .034, .19, [acc, C('#b8563f'), C('#c2952e'),
          C('#2f6f66'), C('#5d6c8a')][i], { gloss:.42 });

  A.put(1.16, 3.58, .60, .58, .05, .030, P.steelD, { hard:true, gloss:.40, ...MS });  // table foot
  A.cyl(1.16, 3.58, .420, .070, .78, P.steelD, { gloss:.50 });                        // pedestal
  A.put(1.16, 3.58, .70, .96, .050, .805, P.steelD, { hard:true, gloss:.45, ...MS });
  A.put(1.16, 3.58, .74, 1.00, .055, .858, P.steelL, { hard:true, gloss:.55, ...MS }); // the top
  A.put(1.16, 3.58, .66, .92, .016, .894, C('#3a4850'), { mode:7 });            // rubber mat
  // The arm: a post off the back corner of the table, a slim boom and a nylon loop hanging from
  // its end. The first pass gave it a 62 x 34 cm plate, which read as a shelf floating in the air.
  A.cyl(.82, 4.02, 1.365, .020, 1.06, P.steelL, { gloss:.60 });
  A.put(1.10, 4.02, .58, .045, .035, 1.880, P.steelL, { hard:true, gloss:.60, ...MS });
  A.cap(1.32, 4.02, 1.740, .012, .245, .012, C('#3d4850'), { gloss:.28 });
  A.ball(1.32, 4.02, 1.606, .052, .022, .014, C('#3d4850'), { gloss:.28 });
  pup(1.00, 3.56, .902, C('#efe9dc'), 1.08);
  const groomTowel = A.put(.72, 3.58, .34, .40, .014, .906, C('#d8d2c2'),
    { mode:7 });                                                               // a towel
  const groomTowelM = groomTowel.m.slice(), groomTowelAt = A.at(.72, 3.58);
  groomTowel.petGroom = 'towel';
  // Three retained suds are enough to read at aisle distance. They are hidden in the untouched
  // and completed states instead of being created at action time, so the renderer never rebuilds.
  const groomFoam = [
    A.ball(.98, 3.49, 1.104, .050, .024, .050, C('#edf5f1'),
      { mode:1, alpha:.001, glow:.035 }),
    A.ball(1.07, 3.58, 1.150, .058, .026, .052, C('#f3f7f3'),
      { mode:1, alpha:.001, glow:.035 }),
    A.ball(.91, 3.65, 1.075, .044, .022, .046, C('#dfeee9'),
      { mode:1, alpha:.001, glow:.030 }),
  ];
  groomFoam.forEach(p => { p.petGroom = 'foam'; });

  A.put(.60, 2.40, .42, .40, .60, .300, P.trim, { hard:true, gloss:.28 });             // trolley
  A.put(.60, 2.40, .46, .44, .035, .618, P.steelL, { hard:true, gloss:.50, ...MS });
  A.put(.60, 2.40, .40, .38, .030, .330, P.steelL, { hard:true, gloss:.45, ...MS });
  for (const q of [-1, 1]) for (const p of [-1, 1])
    A.cyl(.60 + p * .16, 2.40 + q * .16, .022, .020, .044, P.steelD, { gloss:.45 });
  for (let i = 0; i < 3; i++)                                                 // clippers and combs
    A.cap(.60, 2.28 + i * .12, .690, .024, .13, .024,
          [P.steelL, C('#2f6f66'), C('#8d3630')][i], { rz:.16, gloss:.45 });
  A.cyl(.48, 2.52, .700, .034, .13, C('#cfe0dc'), { gloss:.55 });                      // spray
  A.cyl(.48, 2.52, .782, .014, .045, P.steelD, { gloss:.50 });
  A.put(.60, 2.40, .30, .32, .085, .390, C('#d8d2c2'), { mode:7 });             // folded
  A.put(.60, 2.40, .28, .30, .075, .470, C('#c8cfc6'), { mode:7 });             // towels

  A.cyl(1.72, 4.06, .300, .105, .32, C('#a8493b'), { gloss:.34 });                     // the dryer
  A.cyl(1.72, 4.06, .486, .080, .055, P.trim, { gloss:.40 });
  const groomLamp = A.cyl(1.72, 4.06, .520, .026, .012, C('#3e4749'),
    { mode:1, glow:.01 });
  groomLamp.petGroom = 'dryer-lamp';
  A.cap(1.56, 3.92, .380, .28, .046, .046, C('#383d42'), { rz:.5, gloss:.25 });
  A.dynamicVisual(groomTowel, groomFoam, groomLamp);
  A.stop(.21, 2.06, 2.84, 4.22);

  A.put(.30, 3.55, .06, 1.16, .36, 2.30, P.trim, { hard:true, gloss:.22 });            // lit sign
  A.put(.345, 3.55, .025, 1.04, .27, 2.30, acc, { hard:true, mode:1, alpha:.55, glow:.09 });
  A.glyph(.375, 3.55, 2.30, '宠物美容', { size:.145, gap:.052, color:C('#f6efe0'), glow:.15 });

  // ================================================================ 猫爬架 the cat tower
  // The one prop that says pet shop from the door before you have read a word of the signage. It
  // stands mid-floor on the grooming side, so the room has something in it between the aisle and
  // the back wall instead of two metres of empty green carpet.
  const XA = 2.58, XB = 3.06;
  A.put(XA, XB, .74, .74, .085, .043, P.joinM, { hard:true, gloss:.22, ...MW });
  A.put(XA, XB, .68, .68, .016, .094, P.rug, { mode:7 });
  A.cyl(XA - .17, XB - .17, .460, .056, .72, P.sisal, { gloss:.10, ...MS });
  A.cyl(XA + .16, XB + .16, .350, .056, .50, P.sisal, { gloss:.10, ...MS });
  A.put(XA + .16, XB + .16, .46, .46, .045, .622, P.joinM, { hard:true, gloss:.22, ...MW });
  A.put(XA + .16, XB + .16, .42, .42, .016, .652, P.rug, { mode:7 });
  A.put(XA - .17, XB - .17, .52, .52, .045, .842, P.joinM, { hard:true, gloss:.22, ...MW });
  A.put(XA - .17, XB - .17, .50, .50, .40, 1.065, P.bedB, { mode:7, round:.09 });  // the box
  A.ball(XA + .085, XB - .17, 1.055, .105, .105, .050, P.trim, { mode:1, gloss:.15 });
  A.put(XA - .17, XB - .17, .52, .52, .022, 1.276, P.joinM, { hard:true, gloss:.24, ...MW });
  A.cyl(XA - .17, XB - .17, 1.300, .038, .06, P.sisal, { gloss:.10 });
  A.put(XA - .17, XB - .17, .46, .46, .045, 1.352, P.joinM, { hard:true, gloss:.22, ...MW });
  A.put(XA - .17, XB - .17, .42, .42, .016, 1.382, P.rug, { mode:7 });
  retainAnimal('cat', () => cat(XA - .24, XB - .17, 1.390, FUR[3], .92));
  A.cap(XA + .16, XB + .16, .565, .010, .17, .010, P.steelD, { gloss:.40 });            // dangler
  A.ball(XA + .16, XB + .16, .466, .038, .038, .038, C('#c8523f'), { mode:7 });
  A.stop(XA - .40, XA + .40, XB - .40, XB + .40);

  // ================================================================ the middle of the floor
  // A glass playpen and a pallet of feed either side of the aisle, both low enough that the back
  // wall stays visible over them. The point of this room is what is at the end of the aisle, and
  // anything mid-floor tall enough to hide it is furniture in the way of the shop.
  const pen = (ca, cb, w, dp) => {
    A.put(ca, cb, w, dp, .30, .150, P.joinD, { hard:true, gloss:.20, ...MW });
    A.put(ca, cb, w + .05, dp + .05, .045, .322, P.joinL, { hard:true, gloss:.28, ...MW });
    A.put(ca, cb, w - .12, dp - .12, .040, .365, P.bedA, { mode:7 });
    for (const g of [[ca + w / 2, cb, .022, dp], [ca - w / 2, cb, .022, dp],
                     [ca, cb + dp / 2, w, .022], [ca, cb - dp / 2, w, .022]]) {
      A.put(g[0], g[1], g[2], g[3], .38, .535, P.glass, { hard:true, mode:1, alpha:.20, gloss:.90 });
      A.put(g[0], g[1], g[2] + .024, g[3] + .024, .028, .739, P.joinM,
            { hard:true, gloss:.28, ...MW });
    }
  };
  // 70 cm deep rather than 1.06, and its front face left exactly where it was. The 36 cm that
  // comes off the back is not a saving, it is the adoption corner below: at 1.06 the strip between
  // the pen wall and this pen was 89 cm, and 89 cm holds a body or a piece of furniture and not
  // both. Nothing moves at the front, so the pinch between this pen and the window display — which
  // is a metre from here at b 1.75 and was already too narrow to walk — is not made any worse.
  pen(2.82, 1.35, .70, 1.62);
  retainAnimal('dog', () => pup(2.62, 1.02, .385, FUR[1], .96));
  nap(2.96, 1.76, .385, FUR[2], .98);
  pup(3.00, 1.00, .385, FUR[6], .82, { tail:-.05 });
  bowl(2.58, 1.92, .385, C('#3f7f76'), .075);
  A.ball(3.04, 1.24, .420, .045, .045, .045, C('#d2543f'), { mode:7 });
  A.cap(2.70, 1.62, .400, .10, .034, .034, C('#e2b83e'), { mode:7, rz:.2 });
  A.put(3.18, 1.35, .016, .44, .13, .880, P.card, { hard:true, mode:1, gloss:.18 });
  A.put(3.19, 1.35, .012, .44, .030, .818, acc, { hard:true, mode:1, gloss:.20 });
  A.stop(2.42, 3.20, .46, 2.24);

  // ================================================================ 领养角 the adoption corner
  //
  // The judgement this shop is built around. Everything else in here is stock — a sack of feed, a
  // lead, a filter, a bag of flake — and all of it belongs in a basket and goes through the till
  // at the door. A living animal does not, and the way to say so in a room rather than in a rule
  // is to give it a different place, a different piece of furniture and a different pace: you
  // leave the aisle, you come round the back of the puppy pen into a quiet corner beside the
  // cages, and there is a desk with a form on it and somebody whose job is to ask you questions.
  //
  // So there is deliberately no price card in this corner, nothing here is tagged as goods, and
  // the shop's basket is left to the food, the leads and the aquarium kit where it belongs. The
  // 金鱼 row still in MALL_GOODS['宠物店'] is the one thing this file cannot fix from inside
  // itself — see the report at the end.
  //
  // The corner is the 1.26 m between the pen wall's glass (a 1.12) and the pen above (a 2.42),
  // across b 0.46–2.24, entered from the +b end where the aisle already runs. The desk takes 34 cm
  // of that and leaves 83 cm of floor, which is a body and a half.
  const AD = 1.42, ADB = 1.30;
  A.put(AD, ADB, .34, 1.28, .10, .075, P.trim, { hard:true, gloss:.26 });            // plinth
  A.put(AD, ADB, .34, 1.24, .58, .430, P.joinD, { hard:true, gloss:.18, ...MW });    // carcass
  A.put(AD, ADB, .38, 1.32, .045, .742, P.joinL, { hard:true, gloss:.30, ...MW });   // the top
  A.put(AD + .175, ADB, .010, 1.18, .40, .500, P.joinM, { hard:true, gloss:.24, ...MW });
  A.put(AD + .182, ADB - .34, .010, .13, .020, .640, P.steelL, { hard:true, gloss:.55 });
  A.put(AD + .182, ADB + .34, .010, .13, .020, .640, P.steelL, { hard:true, gloss:.55 });
  // The profile cards, standing in a rack. There is one per PetSys animal, in PetSys order, rather
  // than six anonymous cards for eight adoption choices. Keeping the returned body/photo is
  // what lets the selected animal's *own* card change without touching any neighbour.
  A.put(AD - .06, ADB + .30, .16, .52, .012, .766, P.joinM, { hard:true, gloss:.26, ...MW });
  A.put(AD - .13, ADB + .30, .012, .52, .17, .845, P.joinD, { hard:true, gloss:.20, rx:.30, ...MW });
  for (let i = 0; i < PetSys.ANIMALS.length; i++) {
    const animal = PetSys.ANIMALS[i], pb = ADB + .30 - .20 + i * .057;
    const body = A.put(AD - .085 - (i % 2) * .014, pb, .010, .070, .145, .840, P.card,
          { hard:true, mode:7, gloss:.14, rx:.28 });
    const photo = A.put(AD - .078 - (i % 2) * .014, pb, .008, .062, .062, .875,
          FUR[i % FUR.length],
          { hard:true, mode:7, gloss:.10, rx:.28 });
    photo.petAdoptionCard = animal.key;
    A.dynamicVisual(photo);
    adoptionVisuals.cards[animal.key] = {
      body, photo, photoM:photo.m.slice(), photoColor:photo.color,
    };
  }
  // A single three-character stamp moves to the selected card. The toolkit's public glyph helper
  // intentionally returns no handles, so these are equivalent retained quad glyphs built through
  // A.put; `mesh:'quad'` and `ch` use the same atlas/batch path as Build.glyphs. Three quads form one
  // tagged alpha batch — the whole MV-128 overlay is three props and one dynamic draw.
  if (typeof Glyphs !== 'undefined') Glyphs.need('已领养');
  adoptionVisuals.status = [...'已领养'].map(ch => {
    const p = A.put(AD - .05, ADB + .30, .034, .034, .002, .840, C('#f7ead1'),
      { hard:true, mesh:'quad', ch, mode:1, alpha:.001, glow:.055 });
    p.petAdoptionStatus = ch;
    A.dynamic(p, AD - .09, ADB + .30, .840, .42);
    return p;
  });
  const unitAxis = (m, i) => {
    const n = Math.hypot(m[i], m[i + 1], m[i + 2]) || 1;
    return [m[i] / n, m[i + 1] / n, m[i + 2] / n];
  };
  const cardFrame = card => {
    const m = card.body.m, right = unitAxis(m, 0), up = unitAxis(m, 4), back = unitAxis(m, 8);
    return { m, right, up, back, out:back.map(v => -v) };
  };
  const photoCover = card => {
    const {m, right:r, up:u, back:b, out:n} = cardFrame(card);
    return [
      r[0] * .062, r[1] * .062, r[2] * .062, 0,
      u[0] * .120, u[1] * .120, u[2] * .120, 0,
      b[0] * .008, b[1] * .008, b[2] * .008, 0,
      m[12] + n[0] * .007, m[13] + n[1] * .007, m[14] + n[2] * .007, 1,
    ];
  };
  const statusMatrix = (card, dy) => {
    const {m, right:r, up:u, out:n} = cardFrame(card), s = .034;
    return [
      -r[0] * s, -r[1] * s, -r[2] * s, 0,
       n[0],      n[1],      n[2],     0,
      -u[0] * s, -u[1] * s, -u[2] * s, 0,
      m[12] + n[0] * .013 + u[0] * dy,
      m[13] + n[1] * .013 + u[1] * dy,
      m[14] + n[2] * .013 + u[2] * dy, 1,
    ];
  };
  let shownAdoptionCard = '';
  const showAdoptionCard = key => {
    if (key === shownAdoptionCard) return;
    shownAdoptionCard = key;
    for (const k in adoptionVisuals.cards) {
      const c = adoptionVisuals.cards[k];
      c.photo.m = c.photoM.slice();
      c.photo.color = c.photoColor;
    }
    const card = adoptionVisuals.cards[key];
    if (card) {
      card.photo.m = photoCover(card);
      card.photo.color = C('#873c35');
    }
    adoptionVisuals.status.forEach((p, i) => {
      p.alpha = card ? 1 : .001;
      if (card) p.m = statusMatrix(card, .041 - i * .041);
    });
  };
  // The form, on a clipboard, with a pen across it. 领养表 is a real document: name, address, who
  // else lives there, whether the landlord allows it, and a home visit before the animal goes.
  A.put(AD + .02, ADB - .34, .21, .16, .010, .769, P.trim, { hard:true, gloss:.30, ry:.22 });
  A.put(AD + .02, ADB - .34, .19, .14, .004, .776, P.card, { hard:true, mode:7, gloss:.10, ry:.22 });
  for (let i = 0; i < 5; i++)                                     // the ruled lines on the form
    A.put(AD + .02, ADB - .385 + i * .022, .13, .006, .002, .779, C('#7d7469'),
          { hard:true, mode:7, ry:.22 });
  A.cap(AD + .06, ADB - .30, .782, .008, .12, .008, C('#2f4f6a'), { rz:1.35, gloss:.40 });
  A.put(AD - .04, ADB - .30, .09, .10, .055, .792, P.card, { hard:true, mode:7, gloss:.10 });
  A.cyl(AD + .10, ADB + .04, .800, .034, .070, C('#8d3630'), { gloss:.30 });         // treat jar
  A.cyl(AD + .10, ADB + .04, .838, .036, .012, P.steelL, { gloss:.55 });
  // The sign, hung over the corner off two rods, facing the door like every other blade in here.
  for (const q of [-1, 1]) A.cyl(1.90, ADB + q * .26, 2.66, .009, .58, P.steelD, { gloss:.45 });
  A.put(1.90, ADB, .05, .62, .26, 2.300, P.trim, { hard:true, gloss:.24 });
  A.put(1.928, ADB, .022, .52, .19, 2.300, acc, { hard:true, mode:1, alpha:.55, glow:.09 });
  A.glyph(1.948, ADB, 2.300, '领养', { size:.125, gap:.048, color:C('#f6efe0'), glow:.13 });
  A.stop(1.25, 1.59, .64, 1.96);
  A.light(1.80, ADB, 2.02, [1.00, 0.88, 0.70], .24, 2.4);

  // ================================================================ 换水 the maintenance trolley
  //
  // Six tanks and a koi vat is about 900 litres, and every litre of it is somebody's Tuesday: a
  // quarter of the water out with a siphon, the gravel turned over, the glass scraped, the
  // temperature read and the flake measured rather than poured. None of that was anywhere in the
  // shop, which left the aquarium wall looking like an installation instead of like livestock.
  //
  // It stands at the end of the aisle beside the koi vat, which is where you would actually park
  // it, and it is the only fixture in the room a customer is not meant to touch.
  const MTA = 1.78, MTB = .20;
  A.put(MTA, MTB, .40, .36, .56, .300, P.trim, { hard:true, gloss:.28 });
  A.put(MTA, MTB, .44, .40, .035, .598, P.steelL, { hard:true, gloss:.50, ...MS });
  A.put(MTA, MTB, .38, .34, .030, .330, P.steelL, { hard:true, gloss:.45, ...MS });
  for (const q of [-1, 1]) for (const p of [-1, 1])
    A.cyl(MTA + p * .15, MTB + q * .13, .022, .020, .044, P.steelD, { gloss:.45 });
  A.taper(MTA - .09, MTB - .09, .698, .24, .20, .24, C('#3f6f8a'), { rz:Math.PI, gloss:.28 });
  A.cyl(MTA - .09, MTB - .09, .794, .124, .014, C('#35607a'), { gloss:.30 });         // a bucket
  for (let i = 0; i < 5; i++)                                                          // the siphon
    A.cap(MTA + .04 + (i % 2) * .05, MTB + .04 + i * .022, .640 + (i % 3) * .012,
          .019, .17, .019, C('#cfe0dc'), { rz:1.25 + (i % 3) * .30, gloss:.36 });
  A.cyl(MTA + .12, MTB - .11, .655, .036, .080, C('#4f5c30'), { gloss:.30 });         // flake tub
  A.cyl(MTA + .12, MTB - .11, .700, .038, .012, P.steelL, { gloss:.50 });
  A.cap(MTA + .12, MTB - .02, .630, .012, .09, .012, P.steelL, { rz:1.1, gloss:.55 }); // the scoop
  A.ball(MTA + .12, MTB + .03, .626, .022, .012, .026, P.steelL, { gloss:.50 });
  for (let i = 0; i < 3; i++)                                                          // test vials
    A.cyl(MTA - .13, MTB + .10 + i * .035, .652, .012, .075,
          [C('#c8523f'), C('#d8ad34'), C('#3f7f96')][i], { mode:1, alpha:.75, gloss:.45 });
  A.cap(MTA + .17, MTB + .14, .690, .014, .18, .014, C('#2f6f66'), { rz:.9, gloss:.32 });
  A.ball(MTA + .17, MTB + .06, .624, .050, .010, .034, C('#2f6f66'), { mode:7 });      // the net
  A.put(MTA - .17, MTB + .10, .04, .16, .12, .700, P.card, { hard:true, mode:1, gloss:.16 });
  A.stop(1.58, 1.98, .02, .38);

  // ================================================================ 鹦鹉 the two hanging cages
  //
  // Birds hang. A cage on the floor of a shop this tight is a collider in the walk-in, and a cage
  // over the aisle is what every 花鸟鱼虫市场 in Beijing looks like — so these are hung off the
  // soffit at the front of the unit, one either side of the door line, with the bottom of the
  // tray at 1.98 so a body walks under them and the camera sees them against the fascia light.
  const cage = (ca, cb) => {
    A.cyl(ca, cb, 2.780, .006, .44, P.steelD, { gloss:.45 });
    A.ball(ca, cb, 2.548, .045, .038, .045, P.steelL, { gloss:.55 });
    A.cyl(ca, cb, 2.516, .088, .030, P.steelD, { gloss:.50 });
    for (let i = 0; i < 10; i++) {                                     // the bars, on a circle
      const g = i * (Math.PI / 5);
      A.cap(ca + Math.cos(g) * .155, cb + Math.sin(g) * .155, 2.245, .008, .53, .008,
            P.steelL, { gloss:.55 });
    }
    A.cyl(ca, cb, 2.492, .162, .016, P.steelL, { gloss:.55 });         // top and bottom hoops
    A.cyl(ca, cb, 2.020, .166, .020, P.steelL, { gloss:.55 });
    A.cyl(ca, cb, 1.988, .172, .046, P.joinM, { gloss:.24, ...MW });   // the seed tray
    A.cyl(ca, cb, 2.010, .150, .012, C('#c9b78e'), { gloss:.08 });
    A.cap(ca, cb, 2.190, .012, .30, .012, C('#8a6a44'), { rz:Math.PI / 2, gloss:.16 }); // the perch
    A.cyl(ca + .10, cb + .09, 2.078, .030, .056, C('#3f7f96'), { gloss:.34 });  // feeder and water
    A.cyl(ca - .10, cb + .09, 2.078, .030, .056, C('#b8563f'), { gloss:.34 });
    A.ball(ca - .02, cb - .13, 2.150, .026, .026, .008, P.steelL, { mode:1, gloss:.30 }); // a mirror
    return ca;
  };
  for (const [ca, cb, bc] of [[3.40, 2.30, C('#4f8a3e')], [3.40, -2.10, C('#3f7f96')]]) {
    cage(ca, cb);
    const parts = birdRigs.length
      ? budgie(ca - .04, cb, 2.204, bc, 1.0)
      : retainAnimal('budgie', () => budgie(ca - .04, cb, 2.204, bc, 1.0));
    parts.forEach(p => A.dynamic(p, ca - .04, cb, 2.24, .26));
    birdRigs.push({ a:ca - .04, b:cb, phase:birdRigs.length * 2.1,
      parts:parts.map(p => ({ p, x:p.m[12], y:p.m[13], z:p.m[14] })) });
  }

  // 狗粮 on a pallet, the way it is actually sold: broken open, stacked three deep, no shelf.
  A.put(2.52, -1.38, 1.05, 1.66, .22, .110, P.trim, { hard:true, gloss:.26 });
  A.put(2.52, -1.38, 1.09, 1.70, .045, .242, P.joinM, { hard:true, gloss:.28, ...MW });
  for (let i = 0; i < 4; i++)
    sack(2.34, -2.00 + i * .42, .265, PACK[i % PACK.length], .38, .30, .25);
  for (let i = 0; i < 3; i++)
    sack(2.68, -1.79 + i * .42, .265, PACK[(i + 2) % PACK.length], .38, .28, .22);
  for (let i = 0; i < 3; i++)
    sack(2.51, -1.79 + i * .42, .490, PACK[(i + 4) % PACK.length], .36, .26, .20);
  A.cyl(3.06, -1.38, .500, .012, .44, P.steelD, { gloss:.50 });
  A.put(3.08, -1.38, .025, .42, .24, .730, C('#8d3630'), { hard:true, mode:1, gloss:.18 });
  A.glyph(3.10, -1.38, .762, '狗粮', { size:.110, gap:.05, color:P.card, glow:.06 });
  A.put(3.09, -1.38, .018, .36, .034, .652, P.gold, { hard:true, mode:1, gloss:.20 });
  A.stop(1.96, 3.12, -2.26, -.50);

  // ================================================================ 水族用品 the aquarium bay
  // Side wall, behind the shell's lightbox band, so this one may go full height. Boxed filters,
  // tubs of flake and a row of empty bowls waiting for a goldfish. Its sign is a blade hung off
  // the front of it, facing the door, because a glyph cannot be turned to face sideways.
  A.put(.78, -4.10, 1.00, .10, 2.28, 1.150, P.joinD, { hard:true, gloss:.18, ...MW });
  for (const q of [-1, 1])
    A.put(.78 + q * .48, -3.88, .045, .46, 2.28, 1.150, P.joinM, { hard:true, gloss:.22, ...MW });
  for (let r = 0; r < 5; r++) {
    const sy = .34 + r * .44;
    A.put(.78, -3.88, .96, .46, .040, sy, P.joinL, { hard:true, gloss:.26, ...MW });
    A.put(.78, -3.66, .96, .020, .046, sy + .043, P.trim, { hard:true, gloss:.30 });
    for (let i = 0; i < 3; i++) {
      const ia = .42 + i * .36;
      if (r % 2 === 0) carton(ia, -3.88, sy + .020, PACK[(i + r) % PACK.length], .26, .22, .24);
      else if (i === 1) for (let j = 0; j < 3; j++)
        tin(ia - .10 + j * .10, -3.88, sy + .020, PACK[(j + r) % PACK.length], .044, .085);
      else bowl(ia, -3.88, sy + .020, [P.steelL, P.glass, acc][(i + r) % 3], .080);
    }
  }
  A.put(1.30, -3.86, .05, .84, .24, 2.470, P.trim, { hard:true, gloss:.24 });
  A.put(1.328, -3.86, .022, .74, .17, 2.470, acc, { hard:true, mode:1, alpha:.55, glow:.09 });
  A.glyph(1.348, -3.86, 2.470, '水族用品', { size:.105, gap:.042, color:C('#f6efe0'), glow:.13 });
  A.stop(.25, 1.32, -4.22, -3.62);

  // ================================================================ 猫粮 the feed bay, side wall
  // Kept under 1.35 so the shell's lightbox goes on glowing above it. Sacks live low anyway —
  // nobody lifts twenty kilos off a shelf at head height.
  A.put(2.12, -4.10, 1.52, .10, 1.30, .650, P.joinD, { hard:true, gloss:.18, ...MW });
  for (let r = 0; r < 3; r++) {
    const sy = .215 + r * .425;
    A.put(2.12, -3.84, 1.48, .48, .045, sy, P.joinL, { hard:true, gloss:.24, ...MW });
    A.put(2.12, -3.61, 1.48, .024, .056, sy + .050, P.trim, { hard:true, gloss:.30 });
    for (let i = 0; i < 3; i++)
      sack(1.58 + i * .54, -3.84, sy + .022, PACK[(i + r * 2) % PACK.length], .42, .34, .30);
  }
  A.put(2.12, -3.60, 1.44, .018, .045, 1.330, acc, { hard:true, mode:1, glow:.10 });
  A.stop(1.34, 2.90, -4.22, -3.56);

  // ================================================================ 收银台 the till
  // Beside the door on the way out, with an impulse rack of treats on the customer side of it, a
  // back bar of stock behind and a sack of feed somebody has left by the end of the counter.
  // Pre-darkened: counter() hands anything that is not one of the shell's own two timbers the
  // plaster map.
  A.counter(3.25, -3.20, 1.80, .80, C('#433326'));
  A.put(2.90, -2.42, .26, .34, .05, .980, P.steelD, { hard:true, gloss:.45, ...MS });
  for (let t = 0; t < 3; t++) {
    A.put(2.90, -2.42, .24, .32, .018, 1.045 + t * .175, P.steelL, { hard:true, gloss:.50, ...MS });
    A.put(2.90, -2.42, .22, .30, .014, 1.195 + t * .175, P.steelL, { hard:true, gloss:.50, ...MS });
    for (let k = 0; k < 3; k++)
      carton(2.90, -2.53 + k * .105, 1.055 + t * .175,
             [C('#b8563f'), C('#c2952e'), C('#4f8a3e'), C('#3f7f96'), C('#98506a')][(k + t) % 5],
             .085, .06, .125);
  }
  A.put(3.62, -4.10, 1.20, .10, 2.14, 1.090, P.joinD, { hard:true, gloss:.18, ...MW });
  for (let r = 0; r < 4; r++) {
    const sy = .38 + r * .48;
    A.put(3.62, -3.90, 1.16, .40, .040, sy, P.joinL, { hard:true, gloss:.26, ...MW });
    A.put(3.62, -3.71, 1.16, .020, .046, sy + .043, P.trim, { hard:true, gloss:.30 });
    for (let i = 0; i < 4; i++) {
      const ia = 3.16 + i * .32;
      if (r % 2 === 0) carton(ia, -3.90, sy + .020, PACK[(i + r) % PACK.length], .22, .18, .22);
      else for (let j = 0; j < 2; j++)
        tin(ia - .06 + j * .12, -3.90, sy + .020, PACK[(i + j) % PACK.length], .046, .088);
    }
  }
  A.put(3.62, -4.00, 1.10, .022, .17, 2.280, acc, { hard:true, mode:1, alpha:.55, glow:.08 });
  sack(3.34, -3.86, .00, PACK[3], .34, .30, .26);
  A.stop(3.00, 4.24, -4.22, -3.78);

  // ================================================================ 牵引绳 leads, collars, toys
  // The front of the near side wall, forward of the lightbox band, where there is height to hang
  // from. A lead has to read as a long thin thing hanging slightly off plumb with a loop at the
  // bottom and a clip on it, or it is a stripe painted on a board.
  A.put(3.62, 4.10, 1.22, .07, 1.70, 1.350, P.joinD, { hard:true, gloss:.20, ...MW });
  for (let r = 0; r < 5; r++)
    A.put(3.62, 4.056, 1.18, .014, .028, .640 + r * .34, P.trim, { hard:true, gloss:.30 });
  const LEAD = [C('#8d3630'), C('#2f5f8a'), C('#3d4850'), C('#7a5a2f'), C('#2f6f66'), C('#7a4560')];
  for (let i = 0; i < 6; i++) {
    const la = 3.10 + i * .21, lc = LEAD[i % LEAD.length], ll = .40 + (i % 3) * .08;
    A.put(la, 4.034, .04, .04, .034, 2.010, P.steelL, { hard:true, gloss:.55 });
    A.cap(la, 4.005, 1.985 - ll / 2, .026, ll, .017, lc, { gloss:.26, rz:((i % 3) - 1) * .06 });
    A.cap(la, 4.005, 1.985 - ll - .066, .120, .022, .017, lc, { gloss:.26 });
    for (const q of [-1, 1])
      A.cap(la + q * .056, 4.005, 1.985 - ll - .033, .020, .070, .017, lc, { gloss:.26 });
    A.cyl(la, 4.005, 1.985 - ll - .112, .014, .058, P.steelL, { gloss:.60 });
  }
  for (let i = 0; i < 6; i++) {                                                // collars, on cards
    const la = 3.14 + i * .20;
    A.put(la, 4.030, .13, .012, .17, 1.320, P.card, { hard:true, mode:1, gloss:.16 });
    A.cap(la, 4.013, 1.300, .100, .020, .013, LEAD[(i + 3) % LEAD.length], { gloss:.32 });
    A.put(la + .048, 4.013, .016, .016, .020, 1.352, P.steelL, { hard:true, gloss:.55 });
  }
  A.put(3.02, 4.04, .05, .74, .24, 2.350, P.trim, { hard:true, gloss:.24 });      // the blade sign
  A.put(3.048, 4.04, .022, .64, .17, 2.350, acc, { hard:true, mode:1, alpha:.55, glow:.09 });
  A.glyph(3.068, 4.04, 2.350, '牵引绳', { size:.115, gap:.046, color:C('#f6efe0'), glow:.13 });
  A.stop(3.00, 4.24, 3.96, 4.22);

  // 猫玩具, under the lightbox band, so nothing here is over 1.32.
  A.put(2.46, 4.10, .90, .10, 1.24, .620, P.joinD, { hard:true, gloss:.18, ...MW });
  for (let r = 0; r < 3; r++) {
    const sy = .22 + r * .40;
    A.put(2.46, 3.88, .86, .42, .040, sy, P.joinL, { hard:true, gloss:.24, ...MW });
    A.put(2.46, 3.68, .86, .020, .046, sy + .043, P.trim, { hard:true, gloss:.30 });
  }
  for (let i = 0; i < 3; i++) {                                  // open bins of toys on the top
    const bb = 2.14 + i * .32;
    A.put(bb, 3.88, .28, .28, .16, .900, P.joinM, { hard:true, gloss:.24, ...MW });
    A.put(bb, 3.88, .24, .24, .020, .972, P.trim, { hard:true, gloss:.30 });
    for (let k = 0; k < 4; k++)
      A.ball(bb - .07 + (k % 2) * .14, 3.82 + ((k / 2) | 0) * .12, .992, .046, .044, .046,
             [C('#c8523f'), C('#d8ad34'), C('#4f8a3e'), C('#3f7f96'), C('#98506a')][(k + i) % 5],
             { mode:7 });
  }
  for (let i = 0; i < 4; i++) {                                  // and boxed toys on the shelves
    carton(2.14 + i * .24, 3.88, .262, PACK[(i + 1) % PACK.length], .20, .17, .19);
    carton(2.14 + i * .24, 3.88, .662, PACK[(i + 4) % PACK.length], .20, .17, .17);
  }
  A.stop(1.98, 2.94, 3.62, 4.22);

  // ================================================================ light
  // Three, which is what a tenant may safely declare: eight reach the shader and the nearest to
  // the camera win, so inside this shop these are the near ones. Cold over the tanks and warm
  // over everything with fur on it — that difference is most of why the tank run reads as lit
  // from inside rather than as a blue-painted cupboard. All three stand well off the back wall:
  // hung close to it, a lamp lights three square metres of joinery and nothing a customer sees.
  A.light(1.60, TC, 1.62, [0.58, 0.84, 1.00], .44, 3.2);       // 6500 K, the tank run
  A.light(1.65, PC, 1.86, [1.00, 0.86, 0.66], .42, 3.1);       // 3000 K, the pen wall
  A.light(1.75, 3.30, 2.05, [1.00, 0.90, 0.74], .32, 2.9);     // 3000 K, grooming

  // The physical grooming bay is a real mall action, installed the same way as the service verbs
  // in the digital and optical tenants. The existing birds callback below watches its normal
  // #doing lifecycle, so Escape cannot be mistaken for completion and no fourth motion is added.
  const GROOM_SECS = 3.4;
  if (typeof USE_AT !== 'undefined' && USE_AT.mall)
    Object.defineProperty(USE_AT.mall, '洗澡', { configurable:true, enumerable:true, get() {
      const prior = PetSys.groom();
      return { zh:'洗澡吹干', py:'xǐzǎo chuīgān', en:prior
        ? 'wash and blow-dry the next dog at the grooming bay · ¥80'
        : 'wash and blow-dry the dog at the grooming bay · ¥80',
        secs:GROOM_SECS, mins:20, pay:-80, gain:{mood:5}, pose:{type:'scrub'},
        done:'洗好了，吹干了。', doneTr:'Washed and blow-dried.' };
    } });

  const syncAdoption = state => {
    const pet = PetSys.pet(), key = pet ? pet.key : '';
    showAdoptionCard(key);
    for (const k in adoptionVisuals.animals) {
      const hide = k === key;
      for (const q of adoptionVisuals.animals[k].parts) {
        if (hide) {
          q.p.m[13] = q.y - 20;
          q.hidden = true;
        } else if (q.hidden) {
          // Static animals need an explicit restore. A fish or bird will be overwritten by its own
          // loop on the next frame, so this one-frame neutral pose is also a safe reset path.
          q.p.m[13] = q.y;
          q.hidden = false;
        }
      }
    }
    state.adopted = key;
    state.adoptionAnimals = Object.keys(adoptionVisuals.animals).length;
    state.adoptionCards = Object.keys(adoptionVisuals.cards).length;
  };

  const GROOM_C = {
    towel0:C('#d8d2c2'), towelBusy:C('#78a99c'), towelDone:C('#4f8a72'),
    off:C('#3e4749'), busy:C('#d49a38'), done:C('#4f9a70'),
  };
  const reducedMotion = () => {
    try {
      if (typeof window !== 'undefined' && window.MotionSafety && window.MotionSafety.reduced)
        return !!window.MotionSafety.reduced();
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };
  const setGroomVisual = phase => {
    const at = phase === 'progress' ? A.at(.90, 3.58)
      : phase === 'complete' ? A.at(.62, 3.58) : groomTowelAt;
    groomTowel.m = groomTowelM.slice();
    groomTowel.m[12] += at[0] - groomTowelAt[0];
    groomTowel.m[14] += at[1] - groomTowelAt[1];
    groomTowel.color = phase === 'progress' ? GROOM_C.towelBusy
      : phase === 'complete' ? GROOM_C.towelDone : GROOM_C.towel0;
    for (const p of groomFoam) p.alpha = phase === 'progress' ? .68 : .001;
    groomLamp.color = phase === 'progress' ? GROOM_C.busy
      : phase === 'complete' ? GROOM_C.done : GROOM_C.off;
    groomLamp.glow = phase === 'progress' ? .26 : phase === 'complete' ? .18 : .01;
  };
  let grooming = false, groomAt = 0, doingEl = null, doingZh = null;

  // Tank fish and koi use small, asynchronous swim loops contained well inside their glass.  The
  // whole five-part animal moves as one, preserving its authored tilt and silhouette; the unit's
  // distance gate keeps the hundred tiny matrix updates off the frame elsewhere in the mall.
  A.motion('aquariums',(t,state)=>{
    fishRigs.forEach((r,i)=>{
      const u=t*(.42+(i%4)*.035)+r.phase, da=Math.sin(u*.73)*.024, db=Math.cos(u)*.042;
      const p=A.at(r.a+da,r.b+db), b=A.at(r.a,r.b), dy=Math.sin(u*1.31)*.012;
      r.parts.forEach(q=>{
        q.p.m[12]=q.x+p[0]-b[0]; q.p.m[13]=q.y+dy; q.p.m[14]=q.z+p[1]-b[1];
      });
    });
    state.swimmers=fishRigs.length;
    state.current=(t*.42)%(Math.PI*2);
  },{far:16});

  // The hamster wheel. Four spokes rebuilt from the same three numbers `put` was given — dp along
  // world x, height, then w along world z, because this unit is on the south wall and a's axis is
  // the world's z. The rim and the hub do not move, so the whole thing is four matrix writes.
  A.motion('hamster-wheel', (t, state) => {
    const ang = t * 2.35;
    wheelSpokes.forEach(s => {
      s.p.m = M.mul(M.trans(s.x, s.y, s.z),
        M.mul(M.rotX(ang + s.phase), M.scale(.012, .215, .022)));
    });
    state.angle = ang % 6.2832;
    state.rpm = 22;
  }, { far:14 });

  // The two budgerigars, hopping along their perches. Translation only, like the fish: the whole
  // eleven-part bird moves as one so its folded wings and hooked beak survive the move, and a
  // cubed sine gives the hop a hang at the top and a hard landing, which is what a bird does. A
  // caged bird that never moves is a model of a bird, and it is the first thing a child looks at.
  A.motion('birds', (t, state) => {
    birdRigs.forEach(r => {
      const u = t * 1.05 + r.phase, s = Math.sin(u);
      const hop = s > 0 ? s * s * s * .042 : 0, sway = Math.sin(u * .57) * .052;
      const p = A.at(r.a, r.b + sway), o = A.at(r.a, r.b);
      r.parts.forEach(q => {
        q.p.m[12] = q.x + p[0] - o[0]; q.p.m[13] = q.y + hop; q.p.m[14] = q.z + p[1] - o[1];
      });
    });
    // Run after the aquarium and bird transforms so the adopted animal remains hidden even when
    // its authored habitat has motion of its own. Only that one retained model is moved; litter-
    // mates, water, bedding, perches and every other habitat prop are untouched.
    syncAdoption(state);

    // The grooming action's ordinary DOM lifecycle supplies untouched / in-progress / complete.
    // The action must run for 85% of its authored duration to complete; Escape returns to the prior
    // state. Reduced motion holds the same amber foam/lamp composition steady instead of pulsing.
    if (!doingEl && typeof document !== 'undefined') {
      doingEl = document.getElementById('doing');
      doingZh = doingEl && doingEl.querySelector('.dz');
    }
    const on = !!doingEl && doingEl.classList.contains('on');
    const active = !!on && !!doingZh && doingZh.textContent === '洗澡吹干';
    if (active && !grooming) { grooming = true; groomAt = t; }
    else if (!active && grooming) {
      if (t - groomAt >= GROOM_SECS * .85) PetSys.finishGroom('dog');
      grooming = false;
    }
    const phase = grooming ? 'progress' : PetSys.groom() ? 'complete' : 'untouched';
    if (phase !== state.groomPhase) {
      state.groomPhase = phase;
      setGroomVisual(phase);
    }
    if (phase === 'progress') {
      const reduced = reducedMotion(), pulse = reduced ? 1 : .82 + .18 * Math.sin(t * 2.2);
      for (const p of groomFoam) p.alpha = .58 + .10 * pulse;
      groomLamp.glow = reduced ? .24 : .19 + .08 * pulse;
      state.reduced = reduced ? 1 : 0;
    }
    state.birds = birdRigs.length;
  }, { far:16 });

  // ================================================================ what there is to say
  // Only the words the game has actions for: USE_AT.mall carries 宠物店 and 小狗, the till adds
  // 收银台 at run time, and the global table carries 猫. A label pointing at a verb that does not
  // exist is a dead prop, so the fish, the leads and the feed are built and not labelled. Each
  // one's focus — 1.15 m out along a — has to land somewhere a body can actually stand.
  // Three of the goods below are against a wall or on a pallet, where "1.15 m out along a" is not
  // where a body can stand — a lead board hard against b 4.10 would put the circle in the wall. So
  // the same helper the jewellers and the clothes shop use: the thing is returned, so its approach
  // circle is simply set rather than derived. `fb` defaults to the label's own b.
  const lab = (hz, a, b, zh, en, note, reach, y, fa, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(fa, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };

  A.th('宠物店', 5.15, 0, '橱窗里有五只小狗。', 'There are five puppies in the window.',
       '宠物 pet + 店 shop.', 2.2, 2.5);
  A.th('小狗', 2.62, 1.35, '那只小狗一直看着你。', 'That puppy keeps looking at you.',
       '小 small + 狗 dog.', 1.9, 1.05);
  A.th('小狗', 1.30, .20, '第三个笼子空着，早上卖掉了。', 'The third pen is empty — sold this morning.',
       '小 small + 狗 dog.', 1.8, 1.30);
  A.th('猫', 2.58, 3.06, '猫在架子最上面睡觉。', 'The cat is asleep on the top platform.',
       '猫 cat.', 1.7, 1.45);
  // ---- and the six the new fixtures earned. Same rule as the four above: every headword here is
  // already in js/vocab.js. 兔子, 仓鼠, 乌龟, 鹦鹉, 领养 and 宠物 are not, so they are written on
  // the fascias and said by the staff rather than hung on a label that would teach nothing — see
  // the report at the end of this file.
  //
  // Focus is the point 1.15 m out at +a, and each of these was placed by where that lands. The
  // two that cannot help it are aimed by their reach instead, because most of the floor in front
  // of this shop's back wall belongs to the feed pallet and the puppy pen:
  //
  //   鱼缸 1.30 → 2.45, b -0.60. Clear: the feed pallet stops at b -0.50 and the koi vat at
  //        a 1.56, so this is the open end of the aisle. 1.9 m of reach covers the whole of it.
  //   喂   1.78 → 2.93, b 0.20. In front of the trolley and clear of the pen, which starts b 0.46.
  //   洗澡 1.16 → 2.31, b 3.58. Past the grooming screen's collider (a 2.06) and inboard of the
  //        window display (a 3.69), which is 1.6 m of standing room.
  //   家   1.42 → 2.57, b 1.30 lands inside the puppy pen, so the reach does the work: the
  //        adoption corner's own floor runs a 1.59–2.42 and the nearest metre of it is at 0.5.
  //   表格 the same, half a metre along the desk.
  //   干净 1.30 → 2.45, b -1.60 lands in the feed pallet; the aisle in front of it at a 3.2 is
  //        1.0 m away and inside the 1.9 m reach.
  A.th('鱼缸', 1.30, -.60, '这个鱼缸多久换一次水？', 'How often does this tank get a water change?',
       '鱼 fish + 缸 vat. Six cells on this wall, and only four of them hold water now — the '
       + 'bottom one at the far end is hamsters and the top one at this end is a vivarium.',
       1.9, 1.15);
  A.th('喂', 1.78, .20, '一天喂一次就够了。', 'Feeding them once a day is enough.',
       '喂 is the verb for feeding an animal, not a person. The tub on the trolley is measured '
       + 'with the little scoop beside it: flake poured out of the tub fouls the water in a day.',
       1.8, .95);
  A.th('洗澡', 1.16, 3.58, '给狗洗澡多少钱？', 'How much to have the dog washed?',
       '洗 to wash + 澡 a bath. 宠物美容 on the sign is the whole service — wash, dry, clip, nails.',
       1.9, 1.35);
  A.th('家', 1.42, 1.30, '想给它找个家吗？', 'Are you looking to give one of them a home?',
       '家 is home and family in the same character, which is the whole of what this desk asks. '
       + 'Animals here are adopted, not bought: there is no price card in this corner.', 1.9, 1.05);
  A.th('表格', 1.42, 1.72, '先填一张表格，我们会去家访。',
       'Fill in a form first, and we will come and see the home.',
       '表 chart + 格 squares. Name, address, who else lives there, and whether the landlord '
       + 'allows animals. The visit happens before the animal does.', 1.9, 1.05);
  A.th('干净', 1.30, -1.60, '缸里很干净，水草也修过。',
       'The tank is clean, and the plants have been trimmed.',
       '干 dry + 净 clean.', 1.9, 1.15);
  // ---- and one the koi vat had earned and never had. The note at the top of this block is the
  // rule: a headword that is not a row in js/vocab.js opens nothing at all, because `openWord` in
  // js/game.js bails on `if (!e) return`. 鱼 is a row; 猫粮, 狗粮, 牵引绳, 领养, 押金, 兔子, 仓鼠,
  // 乌龟, 鹦鹉 and 宠物 are not, so the feed pallet, the wall of leads and the adoption desk are
  // still deliberately unlabelled and their words are carried by 韩露, 白桐 and 骆青 instead. All
  // ten are listed in the report as a request against js/vocab.js, which is the lead's file.
  //
  // The vat is a 0.97 m tub at a 1.02, b 0 with a collider at a 0.40–1.56, b ±0.76. A focus 1.15 m
  // out at +a lands at 2.17, b 0 — the far end of the middle aisle, past the collider by 61 cm and
  // inboard of the feed pallet (b -0.50) and the puppy pen (b +0.46) in the other axis. Standing
  // room, checked against this file's own colliders by arithmetic rather than by eye.
  A.th('鱼', 1.02, 0, '这些锦鲤一天喂一次。', 'The koi get fed once a day.',
       '鱼 fish. 锦鲤 jǐnlǐ are the big orange ones in the tub — 喂多了水会坏, overfeeding is what '
       + 'fouls the water, which is why the tub has a little scoop beside it and not the whole tin.',
       1.8, .55);

  // ---- the three the shop sells and never named ----------------------------------------------
  // 狗粮, 猫粮 and 牵引绳 are all in MALL_GOODS['宠物店'] (js/mall-pets.js:168-178) and all three are
  // built here — the pallet at js/mall-pets.js:1574, the feed bay at :1612, the lead board at :1661
  // — and none could be walked up to, because none had a row in js/vocab.js and .thingcheck.js:131
  // fails a label whose headword has no reading. The rows landed 2026-08-08. MALL-TODO item 20.
  //
  // All three are against something, so all three set their circle rather than deriving it, and the
  // distance is measured label-to-focus rather than assumed:
  //   狗粮 (2.52,-1.38) → (3.30,-0.60) = 1.10   the aisle in front of the pallet, not on it
  //   猫粮 (2.12,-3.61) → (2.60,-2.90) = 0.86   out of the side bay, into the floor
  //   牵引绳 (3.62, 4.05) → (3.40, 3.20) = 0.88  off the wall the board hangs on
  lab('狗粮', 2.52, -1.38, '这袋狗粮多少钱？', 'How much is this bag of dog food?',
      '狗 dog + 粮 grain, feed. A sack is 一袋 — the same measure word as a bag of rice.',
      1.3, .55, 3.30, -0.60);
  lab('猫粮', 2.12, -3.61, '猫粮在哪儿？', 'Where is the cat food?',
      '猫 cat + 粮 feed, built the same way as 狗粮. The shop says 猫粮狗粮都在那边 — both are '
      + 'over there — and this is the bay it means.',
      1.0, .85, 2.60, -2.90);
  lab('牵引绳', 3.62, 4.05, '有没有小狗用的牵引绳？', 'Do you have a lead for a puppy?',
      '牵 to lead by the hand + 引 to pull + 绳 rope. 绳 on its own is just rope, which is why the '
      + 'whole compound is one word: a lead is not a length of string.',
      1.0, 1.35, 3.40, 3.20);
};

// ---------------------------------------------------------------- 橱窗 the window
//
// The shopfront display is built by the shell before the fit-out runs, because the glass in front
// of it is built there too, so it cannot be reached from the fit above. js/mall.js hands it to
// this instead, once per side: `b` is the middle of that half of the frontage and `s` is which
// half. The api here is the shell's window api — `put`, `cyl`, `ball`, `cap`, `taper`, in the
// same (a, b) frame — with the platform top at y .34 and the stall riser in front of it at .42.
//
// A pet shop's window is puppies. It is the only window in the building anybody stops at, and it
// is what this shop's own label out on the concourse says is in it.
MallFit['宠物店:win'] = (W, b, s) => {
  const wood = C('#5c452f'), lite = C('#8b6b46'), trim = C('#25282c'), card = C('#f1e9d7');
  const FURW = [C('#e7dcc7'), C('#c0793d'), C('#f3efe6'), C('#8a6a4e'), C('#d8c49c')];
  const MWW = { mat:'wood', matScale:.85, matAmt:.30, nrmAmt:.30 };
    const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const lt = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
  // The same animal as inside, rebuilt against the window api, which has the same five calls.
  const wpup = (a, bb, y, c, k = 1) => {
    const d = sh(c, .70), m = lt(c, 1.14);
    W.ball(a - .048 * k, bb, y + .118 * k, .104 * k, .114 * k, .108 * k, c, { mode:7, gloss:.09 });
    W.ball(a + .068 * k, bb, y + .132 * k, .096 * k, .104 * k, .104 * k, c, { mode:7, gloss:.09 });
    for (const q of [-1, 1]) {
      W.cap(a + .112 * k, bb + q * .056 * k, y + .058 * k, .046 * k, .118 * k, .046 * k, c,
            { mode:7 });
      W.ball(a + .138 * k, bb + q * .056 * k, y + .022 * k, .030 * k, .021 * k, .040 * k, m,
             { mode:7 });
    }
    W.ball(a + .106 * k, bb, y + .248 * k, .080 * k, .078 * k, .078 * k, c, { mode:7, gloss:.10 });
    W.ball(a + .166 * k, bb, y + .224 * k, .045 * k, .039 * k, .052 * k, m, { mode:7, gloss:.14 });
    W.ball(a + .206 * k, bb, y + .236 * k, .017 * k, .014 * k, .014 * k, C('#221e1a'),
           { mode:7, gloss:.45 });
    for (const q of [-1, 1])
      W.ball(a + .154 * k, bb + q * .038 * k, y + .274 * k, .013 * k, .014 * k, .011 * k,
             C('#16120e'), { mode:7, gloss:.55 });
    for (const q of [-1, 1])
      W.ball(a + .082 * k, bb + q * .076 * k, y + .242 * k, .026 * k, .058 * k, .031 * k, d,
             { mode:7, rz:q * .22 });
    W.cap(a - .108 * k, bb + .054 * k, y + .120 * k, .036 * k, .108 * k, .036 * k, m,
          { mode:7, rz:-.55 });
  };
  // A whelping pen across the window: timber cheeks, a vet-bed floor and a glass front low enough
  // to look over. It stands on the shell's platform, whose top is at .34.
  const ca = 4.80 - .60;
  W.put(ca, b, 1.02, 2.30, .30, .490, wood, { hard:true, gloss:.22, ...MWW });
  W.put(ca, b, 1.07, 2.35, .045, .662, lite, { hard:true, gloss:.28, ...MWW });
  W.put(ca, b, .90, 2.18, .045, .706, C('#b59a72'), { mode:7 });
  W.put(ca + .52, b, .020, 2.30, .30, .855, C('#9dc0d2'), { hard:true, mode:1, alpha:.20, gloss:.90 });
  W.put(ca + .53, b, .028, 2.34, .030, 1.018, trim, { hard:true, gloss:.35 });
  W.put(ca - .50, b, .022, 2.20, .05, .885, C('#e6f2ee'), { hard:true, mode:1, glow:.16 });
  // Five of them, which is what this shop's label out on the concourse says are in here.
  wpup(ca - .16, b - .74, .728, FURW[0], 1.02);
  wpup(ca + .06, b - .30, .728, FURW[1], .92);
  wpup(ca - .12, b + .18, .728, FURW[2], 1.00);
  wpup(ca + .10, b + .62, .728, FURW[3], .86);
  wpup(ca - .18, b + .98, .728, FURW[4], .94);
  W.cyl(ca + .18, b - .98, .756, .085, .055, C('#3f7f76'), { gloss:.34 });
  W.ball(ca + .22, b + .40, .756, .045, .045, .045, C('#c8523f'), { mode:7 });
  W.put(ca + .54, b - s * .78, .012, .26, .10, .560, card, { hard:true, mode:1, gloss:.18 });
  W.put(ca + .545, b - s * .78, .010, .26, .024, .524, W.acc, { hard:true, mode:1, gloss:.20 });
};

// ---------------------------------------------------------------- who works and shops here
//
// This shop had nobody in it at all: eleven fixtures, twenty-odd animals and not one person, which
// for a pet shop is the wrong kind of quiet — a room full of living things and no one responsible
// for them. Pushed onto MallCast (declared at the top of js/mall.js), which game.js folds into the
// roster before the world is built. Ordinary NPC rows; nothing here is special-cased.
//
// Every coordinate is in the MALL's world frame, not the shop's. This unit is shop('S', 1.6, 8.6):
// the south wall, so `at(a, b)` is [u + b, RZ - a] and the conversion is
//
//     x = 1.6 + b        z = 18 - a
//
// A `face` is a world yaw where 0 looks along +z. On the south wall +z is *into* the shop, so
// 0 faces the back wall, PI faces the door, PI/2 faces +b and -PI/2 faces -b. Getting that
// backwards puts the groomer's back to the dog she is drying.
//
// A standing NPC is a 0.28 m radius and Mall.clampMove shoves it out of every collider in the
// room, so each position below was measured against this file's own `stop` calls rather than
// eyeballed. The margins, smallest first:
//
//   韩露    a 1.90, b 1.30 — 0.31 from the adoption desk, 0.52 from the puppy pen
//   白桐    a 1.60, b 2.55 — 0.29 from the grooming screen, 0.44 from the pen wall
//   骆青    a 2.55, b -3.20 — 0.30 from the counter, 0.36 from the cat-food bay. Behind the till,
//           which is the one part of this room's floor a customer cannot walk to and the only
//           place a cashier belongs
//   顾客    a 2.00, b 2.05 — 0.42 from the desk and 0.42 from the pen
//   小孩    a 3.55, b 1.55 — 0.35 from the puppy pen, at the window where the puppies are
const PX = b => 1.6 + b, PZ = a => 18 - a;
if (typeof MallCast !== 'undefined') MallCast.push(
  // ---- 领养专员. The reason the corner exists, and the only member of staff in this building
  // whose job is to talk somebody *out* of something. Everything she says is a real condition of
  // adopting an animal in a Chinese city: the landlord's permission, the home visit, the deposit
  // that comes back after it, the seven-day return, sterilisation, and the fifteen years.
  { hz:'领养专员', name:'韩露', py:'Hán Lù', place:'mall', mallFloor:1,
    rig:'mall-pets-adoption-han-lu', temper:'patient',
    look:{ skin:'#e2b489', hair:'#2b2320', hairStyle:'bun', top:'#e9e2d2', pants:'#3f4750',
      shoe:'#2a2f34', vest:'#3f7f76', tall:.97, faceSeed:6431 },
    spots:[{ h0:10, h1:21, at:[PX(1.30), PZ(1.90)], face:0, act:'talk' }],
    lines:[['这边的动物不卖，是领养的。',
            'The animals on this side are not for sale — they are for adoption.'],
           ['先填表，我们会去您家里看一次。',
            'Fill in the form first; we will come and look at your home once.'],
           ['您住的地方，房东同意养宠物吗？',
            'Where you live — does your landlord allow animals?'],
           ['家里还有别人吗？有小孩吗？',
            'Is there anyone else at home? Any children?'],
           ['押金五百，家访之后退给您。',
            'The deposit is five hundred, and you get it back after the home visit.'],
           ['七天之内不合适可以送回来，不问为什么。',
            'If it is not right within seven days you can bring it back, and we will not ask why.'],
           ['小猫小狗都会做绝育，这个不能商量。',
            'Every cat and dog is neutered — that part is not negotiable.'],
           ['一只猫能活十五年，您想清楚了吗？',
            'A cat lives fifteen years. Have you really thought about it?'],
           ['不着急，今天先看看也行。',
            'There is no hurry. Just looking today is fine too.'],
           ['兔子和仓鼠也能领养，很多人不知道。',
            'Rabbits and hamsters can be adopted too — most people do not realise.']] },
  // ---- 宠物美容师, at the grooming bay with a dog on the table. Placed just outside the screen's
  // collider rather than inside it, because the bay's `stop` covers the floor she would stand on.
  { hz:'美容师', name:'白桐', py:'Bái Tóng', place:'mall', mallFloor:1,
    rig:'mall-pets-groomer-bai-tong', temper:'brisk',
    look:{ skin:'#d3a077', hair:'#241e1b', hairStyle:'ponytail', top:'#dfe6e2', pants:'#44505a',
      shoe:'#e8e2d6', apron:'#2f6f66', tall:1.00, faceSeed:6432 },
    spots:[{ h0:10, h1:21, at:[PX(2.55), PZ(1.60)], face:Math.PI / 2, act:'work' }],
    lines:[['洗澡加吹干八十，剪毛一百二。',
            'Wash and blow-dry is eighty; a clip is a hundred and twenty.'],
           ['这只怕吹风机，我慢慢来。', 'This one is frightened of the dryer, so I go slowly.'],
           ['指甲也帮您剪一下，不另外收钱。',
            'I will do the nails as well — no extra charge.'],
           ['夏天别剃太短，会晒伤的。',
            "Don't have them clipped too short in summer; they get sunburnt."],
           ['一个半小时，您可以先去逛逛。',
            'An hour and a half. You can go and walk around in the meantime.']] },
  // ---- 收银员, behind the till. She sells food, leads, tanks and flake; she does not sell
  // animals, and the second line is her saying so.
  { hz:'收银员', name:'骆青', py:'Luò Qīng', place:'mall', mallFloor:1,
    rig:'mall-pets-cashier-luo-qing', temper:'genial',
    look:{ skin:'#c9976d', hair:'#302722', hairStyle:'bob', top:'#f0e9d9', pants:'#4a4249',
      shoe:'#2f3438', vest:'#4f8a3e', tall:.95, faceSeed:6433 },
    spots:[{ h0:10, h1:21, at:[PX(-3.20), PZ(2.55)], face:Math.PI, act:'vend' }],
    lines:[['猫粮狗粮都在那边，散装也有。',
            'Cat and dog food are over there — we sell it loose as well.'],
           ['动物在里面那个角落谈，我这儿只收东西的钱。',
            'The animals are dealt with in the corner back there; I only take money for things.'],
           ['牵引绳买长的还是短的？', 'Do you want a long lead or a short one?'],
           ['鱼缸自己搬得动吗？要不要送？',
            'Can you carry the tank yourself, or shall we deliver it?'],
           ['一共一百六十八，扫码还是现金？',
            'A hundred and sixty-eight altogether — scan the code, or cash?']] },
  // ---- and the two who are not staff. One at the adoption desk in the middle of being asked
  // the questions, and a child with her nose on the window pen, which is the only reason most
  // people ever stop outside a pet shop.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'steady',
    look:{ skin:'#e7bb92', hair:'#211b18', hairStyle:'long', top:'#8d6f86', pants:'#3b434e',
      shoe:'#e6dfd2', bag:'tote', bagColor:'#7a5f42', tall:.99, faceSeed:6434 },
    spots:[{ h0:10, h1:21, at:[PX(2.05), PZ(2.00)], face:0, act:'wait' }] },
  { hz:'小孩', place:'mall', mallFloor:1, temper:'eager',
    look:{ skin:'#f0c59d', hair:'#2a211d', hairStyle:'tousled', top:'#e2a83c', pants:'#4a6f9a',
      shoe:'#e0524a', tall:.71, wide:.82, youth:1, headScale:1.10, faceSeed:6435 },
    spots:[{ h0:10, h1:21, at:[PX(1.55), PZ(3.55)], face:Math.PI / 2, act:'wait' }] },
  // ---- and one on the move, in through the walk-in gap, down the aisle to the koi vat and out.
  // Every leg is measured off this file's own colliders: the aisle at a 3.2–4.4 runs the width of
  // the unit, the turn at b -0.3 is the open end past the feed pallet, and the koi vat is the
  // terminus, which is where somebody in a pet shop actually stops.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
    look:{ skin:'#cf9e72', hair:'#2d2521', hairStyle:'short', top:'#5f7a88', pants:'#363d46',
      shoe:'#272c31', collar:'shirt', tall:1.05, faceSeed:6436 },
    patrol:[[1.60, 13.20], [1.60, 14.60], [1.30, 16.10], [1.60, 14.60], [3.90, 14.40],
            [1.60, 14.60], [1.60, 13.20]], speed:.94 },
);
