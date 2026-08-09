// 花店 · 四季花坊 · SIJI FLOWERS — floor 1
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box: `w` is its size along a, `dp` its size along b
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)   cyl takes a radius, taper a width
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.th(word,a,b,zh,en,note,reach,y)  something to look at and be taught by
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// The shopfront window is dressed through a *different* api, `winApi`, which shop() builds and
// hands to `o.win` before the fit runs — it has put/cyl/ball/cap/taper and nothing else. So the
// window dresser is hung on this same registered function as `.win`, and js/mall.js picks it up
// with one property on the tenant's own shop() call. Without it the shell falls back to its
// generic goods, and its guess for a florist is a row of *bottles* on two stone plinths.
//
// ---------------------------------------------------------------------------------------------
// What a florist is, and why the old fit-out was not one.
//
// The inline version stood twelve identical cream cones in a four-by-three grid, each with seven
// balls floating above it, and put a collider across the whole floor so you could not walk in. A
// grid of one object at one height is a warehouse. What makes a flower shop legible from the
// doorway is the opposite of a grid: things at every height between the floor and the ceiling,
// packed tight enough to touch, in a dozen saturated colours that nothing else in a shopping
// centre is allowed to be.
//
// So this is built in four bands of height, all of them visible at once from the door:
//
//   0.0–0.9   floor: potted plants, the bouquet tub, an offcut bin, the feet of everything else
//   0.3–1.7   the stepped bank across the back wall and the two tiered stands down the sides —
//             three risers each, so a bucket's flowers sit above the bucket behind it
//   0.9–2.1   the chiller with the expensive stems in it, and the wrapping bench with its rolls,
//             ribbon spools and shelf of pots opposite
//   1.9–2.6   hanging baskets over the aisle
//
// and the aisle down the middle, 2 m wide, is left open all the way to the back so you can stand
// in the middle of it.
//
// Three notes on how the flowers themselves are drawn, all of which cost a render to find out:
//
//   * a head is a rosette of same-hue balls, never a pale ball with a darker ball parked on top
//     of it. The darker second tone reads as a *hole* — a bite taken out of the flower — and at
//     arm's length a bucket of roses came out as a bucket of bitten cherries. The second tone is
//     now only ever a small centre, or the far side of a spike, where a shadow belongs.
//   * a leaf is 10 cm long. The first pass drew them as ellipsoids of .15 radius, which is a
//     30 cm dinner plate, and five of those on a stem is not a plant — it is a stack of lily
//     pads. They are small and there are many, which is also what a leaf is.
//   * mode 15 is foliage — world-space noise, per-cluster tint and a slow sway. It is exactly
//     right for leaves and exactly wrong for petals, because its tint pulls blue down by a fifth
//     and a rose is not meant to turn olive. Greens get 15, petals get 7 (quiet weave noise).
//
// And one on batching, because this shop has more props in it than any other room in the
// building. js/build.js keys a batch on (mesh, mode, corner radius, bevel, textures, matScale,
// matAmt, nrmAmt) — colour, gloss, alpha and the matrix all travel per instance. So every petal
// in the shop is a `ball` at mode 7 with no material and they are one draw call between them;
// every leaf is a `ball` at mode 15 and they are a second; every stem is a `cap` and they are a
// third. Gloss is varied freely because it is free. Nothing here introduces a new (mesh, mode,
// material) combination without earning it.

// =============================================================================================
// FloristSys — what 四季花坊 knows about who the flowers are for
// =============================================================================================
// The fit-out below builds the shop. This builds the florist: a bouquet you assemble by colour,
// by budget and by occasion rather than a 花 you take off a shelf; the four occasions a Chinese
// florist is actually asked for and the rules that make them different; a card the shop writes to
// your dictation; delivery, with a cut-off; and flowers that die if you leave them on the table.
//
// It lives in this file for the same reason the fit-out and the cast do: one owner per file.
// Nothing here edits or patches js/game.js and nothing here throws if game.js is not wired yet.
//
// ---------------------------------------------------------------- why the occasions are the point
// 花 is already a shop kind and buying one was already possible: MALL_GOODS['花店'] sells 花, 玫瑰,
// 向日葵 and 盆栽 off the shelf like a bag of rice. What that could not carry is the only genuinely
// hard thing about buying flowers in China, which is that the *wrong* flowers are a real insult
// and that the rules are not the ones a European learner arrives with:
//
//   * white chrysanthemums are funeral flowers. Take them to a hospital ward and you have told
//     somebody you expect them to die. This is the single most useful fact in this file.
//   * a pot plant is a bad hospital gift for a reason nobody guesses: it puts down roots, 扎根,
//     and that is the wrong wish for a stay in hospital.
//   * four of anything is 四, which sounds like 死. Odd numbers, and never four.
//   * red is for celebration and courtship. It is the wrong colour for an apology.
//   * a wedding wants lilies, because 百合 is one character off 百年好合 — a hundred years of
//     harmony — and the pun is the reason, not the flower.
//
// All five are in 何梅's dialogue in the cast at the bottom of this file. This module is what makes
// them consequences rather than sentences: the bouquet you build is graded against the occasion you
// named, and it will let you buy the wrong one and then tell you what you did.
//
// ---------------------------------------------------------------- wilting is not a tick
// A cut flower dies on a clock measured in hours, and this module models it as one pure function of
// (when it was bought, when the water was last changed, what time it is now). There is no per-frame
// simulation, no interval and nothing in MallFitTick: `freshness()` is evaluated when something
// asks, which is when a panel opens or the bouquet is handed over. The mall's frame loop never sees
// this file.
window.FloristSys = (function () {

  const NAME = '四季花坊', NAME_PY = 'Sìjì Huāfáng', NAME_EN = 'Siji Flowers';
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

  // ---------------------------------------------------------------- the buckets, priced per stem
  // Twelve, and each one is a bucket that is actually standing on the stepped bank or in the
  // chiller in the fit-out below — a florist whose list is longer than its buckets is a catalogue.
  // `hue` is the colour word a customer uses, not the render colour: what the occasion rules read.
  // `taboo` is why a flower is refused, and it is per occasion rather than absolute, because
  // nothing in this list is unlucky in itself — 白菊 is the correct flower for a funeral.
  const STEMS = [
    { hz:'红玫瑰',  py:'hóng méiguī',  en:'red rose',            price:15, hue:'红', kind:'玫瑰',
      note:'玫瑰 rose. Red is courtship and celebration, and it is the wrong colour to apologise in' },
    { hz:'粉玫瑰',  py:'fěn méiguī',   en:'pink rose',           price:14, hue:'粉', kind:'玫瑰',
      note:'粉 pink — softer than red, and it can be given to anybody' },
    { hz:'白玫瑰',  py:'bái méiguī',   en:'white rose',          price:14, hue:'白', kind:'玫瑰',
      note:'白 white. A white rose apologises; a white chrysanthemum mourns. The flower matters' },
    { hz:'百合',    py:'bǎihé',        en:'lily',                price:55, hue:'白', kind:'百合',
      bunch:true, note:'百合 lily — one character off 百年好合, a hundred years of harmony. ' +
      'Sold by the bunch, not the stem' },
    { hz:'向日葵',  py:'xiàngrìkuí',   en:'sunflower',           price:18, hue:'黄', kind:'向日葵',
      note:'向日 towards the sun + 葵 mallow' },
    { hz:'黄郁金香', py:'huáng yùjīnxiāng', en:'yellow tulip',    price:12, hue:'黄', kind:'郁金香',
      note:'郁金香 tulip. Yellow is the apology colour here, not the jealousy colour' },
    { hz:'康乃馨',  py:'kāngnǎixīn',   en:'carnation',           price:8,  hue:'粉', kind:'康乃馨',
      note:'康乃馨 is a transliteration. The mother\'s-day flower, and the ward flower' },
    { hz:'满天星',  py:'mǎntiānxīng',  en:'gypsophila',          price:10, hue:'白', kind:'满天星',
      filler:true, note:'满天 a whole sky of + 星 stars. Filler — it is what makes six stems look like twelve' },
    { hz:'尤加利',  py:'yóujiālì',     en:'eucalyptus',          price:9,  hue:'绿', kind:'尤加利',
      filler:true, note:'尤加利 eucalyptus, another transliteration. Greenery, and it smells clean' },
    { hz:'白菊花',  py:'bái júhuā',    en:'white chrysanthemum', price:6,  hue:'白', kind:'菊花',
      funeral:true, note:'白 white + 菊花 chrysanthemum. The funeral flower. It is not an insult in ' +
      'itself — it is the correct flower for a grave, and that is exactly why it cannot go anywhere else' },
    { hz:'绣球',    py:'xiùqiú',       en:'hydrangea',           price:26, hue:'蓝', kind:'绣球',
      note:'绣 embroidered + 球 ball' },
    { hz:'洋桔梗',  py:'yáng jiégěng', en:'lisianthus',          price:13, hue:'紫', kind:'桔梗',
      note:'洋 foreign + 桔梗 balloon flower. Long-lasting, which is why a florist likes it' },
  ];
  const stemOf = hz => STEMS.find(s => s.hz === hz) || null;
  const HUES = [
    { hz:'红', py:'hóng', en:'red — celebration, courtship, the new year' },
    { hz:'粉', py:'fěn',  en:'pink — soft, safe, and what most bouquets are actually made of' },
    { hz:'白', py:'bái',  en:'white — mourning on a chrysanthemum, purity on a rose' },
    { hz:'黄', py:'huáng',en:'yellow — apology and friendship' },
    { hz:'紫', py:'zǐ',   en:'purple' },
    { hz:'蓝', py:'lán',  en:'blue' },
    { hz:'绿', py:'lǜ',   en:'green — the leaves, and everything that is not a flower' },
  ];

  // ---------------------------------------------------------------- the four occasions
  // `want` are the flowers that belong, `avoid` the ones that do not, and `why` is the sentence the
  // shop says when you get it wrong. `odd` is the counting rule, `colours` the palette. These are
  // the four boards colour-coded over the wrapping bench in the fit-out below.
  const OCCASIONS = [
    { key:'birthday', hz:'生日', py:'shēngrì', en:'a birthday',
      card:'生日快乐', cardPy:'shēngrì kuàilè', cardEn:'happy birthday',
      colours:['红', '粉', '黄'], want:['向日葵', '玫瑰', '郁金香', '桔梗'], avoid:['菊花'],
      odd:true, potOk:true,
      rule:'Bright colours and an odd number of stems. Sunflowers are the safe answer for anybody.' },
    { key:'sorry', hz:'道歉', py:'dàoqiàn', en:'an apology',
      card:'对不起', cardPy:'duìbuqǐ', cardEn:'I am sorry',
      colours:['黄', '白'], want:['郁金香', '玫瑰', '满天星'], avoid:['菊花'], avoidHue:['红'],
      odd:true, potOk:false,
      rule:'Yellow tulips or white roses. Not red — red is courtship, and an apology in red reads ' +
           'as an advance rather than an apology.' },
    { key:'wedding', hz:'结婚', py:'jiéhūn', en:'a wedding',
      card:'百年好合', cardPy:'bǎi nián hǎo hé', cardEn:'a hundred years of harmony',
      colours:['红', '粉', '白'], want:['百合', '玫瑰'], avoid:['菊花'], must:['百合'],
      odd:false, potOk:false,
      rule:'It has to have lilies in it. 百合 is one character off 百年好合 and everybody at the ' +
           'wedding will hear the pun.' },
    { key:'hospital', hz:'探病', py:'tànbìng', en:'visiting somebody in hospital',
      card:'早日康复', cardPy:'zǎo rì kāng fù', cardEn:'get well soon',
      colours:['粉', '黄', '白'], want:['康乃馨', '桔梗', '满天星'], avoid:['菊花'],
      odd:true, potOk:false, noScent:true,
      rule:'Warm colours, nothing strongly scented, and cut rather than potted — a 盆栽 puts down ' +
           'roots and that is the wrong thing to wish on a hospital stay. Never white chrysanthemums.' },
  ];
  const occOf = k => OCCASIONS.find(o => o.key === k) || null;

  // ---------------------------------------------------------------- what the shop charges
  const WRAP = { plain:{ hz:'不用包', py:'bú yòng bāo', en:'no wrapping', yuan:0 },
    kraft:{ hz:'牛皮纸', py:'niúpí zhǐ', en:'kraft paper and twine', yuan:8 },
    full:{ hz:'包起来', py:'bāo qǐlai', en:'proper wrapping, ribbon and a bow', yuan:18 } };
  const CARD_FEE = 5;         // 贺卡, written by hand at the counter
  const DELIVERY = 10;        // 送货, and it is ten kuai anywhere in town
  // 城东下午三点前，城西五点 — the courier's own line in the cast below. One cut-off per side of
  // town, and it is the only reason booking a delivery is a decision with a clock on it.
  const CUTOFF = { east:15 * 60, west:17 * 60 };
  const AREAS = [
    { key:'east', hz:'城东', py:'chéng dōng', en:'east of town — the rider goes before three' },
    { key:'west', hz:'城西', py:'chéng xī',  en:'west of town — before five' },
  ];

  // ---------------------------------------------------------------- grading a bouquet
  // The teaching core. `bunch` counts a bunch of lilies as one item for money and as five stems for
  // the counting rule, which is what they actually are.
  function stems(bq) { return bq.reduce((n, r) => n + r.n * (stemOf(r.hz).bunch ? 5 : 1), 0); }
  function priceOf(bq, opt = {}) {
    let f = 0;
    for (const r of bq) f += stemOf(r.hz).price * r.n;
    const wrap = (WRAP[opt.wrap] || WRAP.plain).yuan;
    const card = opt.card ? CARD_FEE : 0;
    const deliv = opt.deliver ? DELIVERY : 0;
    return { flowers:f, wrap, card, delivery:deliv, total:f + wrap + card + deliv };
  }
  // Faults, in the order a florist would mention them. Nothing here refuses a sale: 何梅 will sell
  // you four white chrysanthemums for a wedding and tell you afterwards, because being told after
  // you have done it is how anybody learns this.
  function judge(bq, key) {
    const occ = occOf(key), out = [];
    if (!occ) return out;
    const n = stems(bq);
    if (!n) return [{ key:'empty', hz:'还没选花', py:'hái méi xuǎn huā', en:'nothing picked yet', bad:true }];
    for (const r of bq) {
      const s = stemOf(r.hz);
      if (occ.avoid.includes(s.kind))
        out.push({ key:'taboo', hz:`${occ.hz}不能送${s.hz}`, py:`${occ.py} bù néng sòng ${s.py}`,
          en: s.funeral ? `${s.en}s are funeral flowers — for ${occ.en} this is the one mistake you cannot undo`
                        : `${s.en} does not belong at ${occ.en}`, bad:true });
      else if (occ.avoidHue && occ.avoidHue.includes(s.hue))
        out.push({ key:'hue', hz:`道歉别送红的`, py:'dàoqiàn bié sòng hóng de',
          en:`${s.en} is 红 — red is courtship. Yellow tulips or white roses instead`, bad:true });
    }
    if (occ.must) for (const m of occ.must)
      if (!bq.some(r => stemOf(r.hz).kind === m))
        out.push({ key:'must', hz:`结婚一定要百合`, py:'jiéhūn yídìng yào bǎihé',
          en:'a wedding bouquet has to have lilies in it — 百合 / 百年好合', bad:true });
    // 四. Checked before the odd-number rule, because it is a harder taboo than a soft convention.
    if (n === 4 || n === 14 || n === 24)
      out.push({ key:'four', hz:'四支不送', py:'sì zhī bú sòng',
        en:`${n} stems — 四 sounds like 死. Add one or take one away`, bad:true });
    else if (occ.odd && n % 2 === 0)
      out.push({ key:'even', hz:'送花要单数', py:'sòng huā yào dānshù',
        en:`${n} stems — an even number. Gift bunches are counted in odd numbers here` });
    const hues = new Set(bq.map(r => stemOf(r.hz).hue).filter(h => h !== '绿'));
    if (hues.size && ![...hues].some(h => occ.colours.includes(h)))
      out.push({ key:'palette', hz:`${occ.hz}要${occ.colours.join('、')}的`,
        py:`${occ.py} yào ${occ.colours.map(c => (HUES.find(q => q.hz === c) || {}).py).join(', ')} de`,
        en:`nothing in this bunch is ${occ.colours.join('/')}, which is the palette for ${occ.en}` });
    if (bq.every(r => stemOf(r.hz).filler))
      out.push({ key:'filler', hz:'光有配花不行', py:'guāng yǒu pèihuā bù xíng',
        en:'all filler and no flowers — 满天星 and 尤加利 go round something, not on their own' });
    return out;
  }
  const ok = (bq, key) => !judge(bq, key).some(f => f.bad);

  // ---------------------------------------------------------------- wilting
  // Absolute minutes since day 1, so a bouquet bought at eleven at night and looked at at nine the
  // next morning is ten hours old and not minus fourteen. Everything below is arithmetic on that
  // one number: no state advances on its own and nothing here is called from a frame.
  const stamp = (day, minutes) => day * 1440 + minutes;
  // Out of water a wrapped bunch is fine for about eight hours and finished at a day and a half —
  // which is a real number for cut flowers carried around a city in the warm. In water it is a
  // week, and that week is the florist's own promise (何梅: 每天换水，能开一个星期). Water more
  // than a day stale costs three times as fast, which is what makes 换水 a verb worth having.
  const DRY_LIFE = 36 * 60, WET_LIFE = 7 * 24 * 60, STALE = 24 * 60;
  function freshness(bq, day, minutes) {
    if (!bq) return 0;
    const now = stamp(day, minutes);
    let wear = bq.wear || 0, from = bq.since === undefined ? bq.boughtAt : bq.since;
    const dt = Math.max(0, now - from);
    if (!bq.inWater) wear += dt / DRY_LIFE;
    else {
      const stale = Math.max(0, (now - (bq.watered || bq.boughtAt)) - STALE);
      wear += (dt - Math.min(dt, stale)) / WET_LIFE + Math.min(dt, stale) * 3 / WET_LIFE;
    }
    return Math.max(0, Math.min(1, 1 - wear));
  }
  const STAGES = [
    { at:.78, hz:'新鲜',  py:'xīnxiān',  en:'fresh — they came in this morning' },
    { at:.50, hz:'还行',  py:'hái xíng', en:'holding up' },
    { at:.22, hz:'蔫了',  py:'niān le',  en:'drooping — they want water' },
    { at:.00, hz:'谢了',  py:'xiè le',   en:'gone over. These are for the bin' },
  ];
  const stage = f => STAGES.find(s => f >= s.at) || STAGES[STAGES.length - 1];
  // Moving a bouquet into or out of water banks the wear so far and restarts the clock from now.
  // One function for both, because getting them out of step is how a bouquet ends up immortal.
  function reclock(bq, day, minutes, into) {
    if (!bq) return bq;
    const f = freshness(bq, day, minutes);
    bq.wear = 1 - f; bq.since = stamp(day, minutes); bq.inWater = !!into;
    if (into) bq.watered = bq.since;
    return bq;
  }

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
    minutes() {
      if (host && host.minutes) return host.minutes();
      const g = G(); try { return g ? g.state().minutes | 0 : 11 * 60; } catch (e) { return 11 * 60; }
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
  };

  // ---------------------------------------------------------------- state
  // `build` is the bunch being assembled at the counter and is thrown away when you leave. `held`
  // is the bouquet in your hands and outlives the shop, the day and the save, because a bouquet
  // going brown on the kitchen table is the whole point of the wilting above.
  const fresh0 = () => ({
    build:[], occasion:null, wrap:'kraft', card:null, deliver:null,
    held:null, bought:0, spend:0, orderRev:0, lastOrder:null,
  });
  const state = fresh0();
  const toSave = () => ({ ...state, build: state.build.map(r => ({ ...r })),
    card: state.card && { ...state.card }, deliver: state.deliver && { ...state.deliver },
    held: state.held && { ...state.held, stems: state.held.stems.map(r => ({ ...r })) },
    lastOrder: state.lastOrder && { ...state.lastOrder } });
  function load(s) {
    if (!s || typeof s !== 'object') return;
    Object.assign(state, fresh0(), s);
    state.build = Array.isArray(s.build) ? s.build.filter(r => stemOf(r.hz)).map(r => ({ hz:r.hz, n:Math.max(1, r.n | 0) })) : [];
    if (state.held && !Array.isArray(state.held.stems)) state.held = null;
  }

  // ---------------------------------------------------------------- 1. what is it for
  // The first question, and the one the whole shop turns on. It is asked before a single flower is
  // picked because that is the order 何梅 asks it in: 要送人还是自己放家里？
  function openCounter() {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:'送人还是自己放？', py:'sòng rén háishi zìjǐ fàng?',
      en:'a gift, or for your own home? — everything else follows from this' }];
    for (const o of OCCASIONS)
      rows.push({ occ:o.key, hz:o.hz, py:o.py, en:`${o.en} — ${o.rule}`,
        right: state.occasion === o.key ? '✓' : '' });
    rows.push({ occ:'self', hz:'自己放家里', py:'zìjǐ fàng jiā lǐ', en:'for your own table — no rules, ' +
      'and it is the only one where a 白菊花 is simply a white flower', right: state.occasion === 'self' ? '✓' : '' });
    if (state.held) {
      const f = freshness(state.held, H.day(), H.minutes()), st = stage(f);
      rows.push({ sec:'手里的花', py:'shǒu lǐ de huā', en:'the bunch you are already carrying' });
      rows.push({ off:true, hz:st.hz, py:st.py, en:`${st.en} — ${Math.round(f * 100)}%`,
        right: state.held.inWater ? '在水里' : '没水' });
    }
    P.show({ title:`${NAME} · 包花`, sub:`${NAME_PY} · ¥${H.money()} 在身上`, rows,
      onPick(r) { if (!r.occ) return false; state.occasion = r.occ; openBuild(); return false; } });
  }

  // ---------------------------------------------------------------- 2. the bouquet builder
  // Three ways in, because three is how people actually shop for flowers: by the occasion (which
  // filters the buckets to the ones that belong), by colour, or by what they can spend.
  function openBuild() {
    const P = H.Pick(); if (!P) return;
    const occ = occOf(state.occasion);
    const p = priceOf(state.build, state), n = stems(state.build);
    const faults = occ ? judge(state.build, state.occasion) : [];
    const rows = [{ sec: occ ? `${occ.hz} · ${occ.py}` : '自己放家里',
      en: occ ? occ.rule : 'no occasion, no rules' }];
    rows.push({ pick:'occ', hz:'按场合选', py:'àn chǎnghé xuǎn',
      en: occ ? `only the flowers that belong at ${occ.en}` : 'the whole shop', right:'推荐' });
    rows.push({ pick:'hue', hz:'按颜色选', py:'àn yánsè xuǎn', en:'by colour', right:`${HUES.length}色` });
    rows.push({ pick:'price', hz:'按价钱选', py:'àn jiàqian xuǎn', en:'by what you can spend',
      right:`¥${H.money()}` });
    rows.push({ sec:`已经选了 ${n} 支`, py:`${n} zhī`, en:'什么都还没选' });
    for (const r of state.build) {
      const s = stemOf(r.hz);
      rows.push({ drop:r.hz, hz:`${s.hz} ×${r.n}${s.bunch ? '束' : '支'}`, py:s.py,
        en:`${s.en} — pick to take one off`, right:`¥${s.price * r.n}` });
    }
    for (const f of faults)
      rows.push({ off:true, hz:f.hz, py:f.py, en:f.en, right: f.bad ? '不行' : '注意' });
    rows.push({ sec:'包装和卡片', py:'bāozhuāng hé kǎpiàn', en:'wrapping and the card' });
    rows.push({ wrap:true, hz:WRAP[state.wrap].hz, py:WRAP[state.wrap].py,
      en:WRAP[state.wrap].en, right: WRAP[state.wrap].yuan ? `¥${WRAP[state.wrap].yuan}` : '免费' });
    rows.push({ card:true, hz:'贺卡', py:'hèkǎ',
      en: state.card ? `「${esc(state.card.text)}」— ${esc(state.card.to || '没写名字')}`
                     : `a handwritten card — the florist writes it to your dictation, ¥${CARD_FEE}`,
      right: state.card ? `¥${CARD_FEE}` : '加一张' });
    rows.push({ deliv:true, hz:'送货', py:'sòng huò',
      en: state.deliver ? `${state.deliver.hz} — ${esc(state.deliver.addr)}`
                        : `have them delivered — ¥${DELIVERY} anywhere in town`,
      right: state.deliver ? `¥${DELIVERY}` : '还是自己拿' });
    if (n) rows.push({ buy:true, hz:'就这些', py:'jiù zhèxiē', en:'that is the bunch',
      right:`¥${p.total}`, off: H.money() < p.total });
    P.show({ title:`${NAME} · ${occ ? occ.hz : '花束'}`,
      sub:`${n}支 · ¥${p.total}${p.total !== p.flowers ? `（花 ¥${p.flowers}）` : ''} · ¥${H.money()} 在身上`,
      rows,
      onPick(r) {
        if (r.pick === 'occ')   { openStems(occ ? s => belongs(s, occ) : null, occ ? `${occ.hz}适合的` : '全部'); return false; }
        if (r.pick === 'hue')   { openHues(); return false; }
        if (r.pick === 'price') { openByPrice(); return false; }
        if (r.drop) { add(r.drop, -1); openBuild(); return false; }
        if (r.wrap) { state.wrap = state.wrap === 'plain' ? 'kraft' : state.wrap === 'kraft' ? 'full' : 'plain';
          openBuild(); return false; }
        if (r.card)  { openCard(); return false; }
        if (r.deliv) { openDelivery(); return false; }
        if (r.buy)   { return buy(); }
        return false;
      } });
  }
  const belongs = (s, occ) =>
    !occ.avoid.includes(s.kind) && !(occ.avoidHue || []).includes(s.hue) &&
    (occ.want.includes(s.kind) || s.filler || occ.colours.includes(s.hue));

  function openStems(filter, title) {
    const P = H.Pick(); if (!P) return;
    const occ = occOf(state.occasion);
    const list = STEMS.filter(s => !filter || filter(s));
    const rows = [{ sec:title, en:`${list.length} of the ${STEMS.length} buckets in the shop` }];
    for (const s of list) {
      const have = state.build.find(r => r.hz === s.hz);
      let en = s.en + (s.bunch ? ' — sold by the bunch, about five stems' : '');
      if (occ && occ.avoid.includes(s.kind)) en += ` · ${occ.hz}忌`;
      rows.push({ add:s.hz, hz:s.hz, py:s.py, en,
        right: have ? `×${have.n} ¥${s.price}` : `¥${s.price}`,
        off: H.money() < s.price });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back to the bunch' });
    P.show({ title:`${NAME} · ${title}`, sub:'pick a bucket to add one', rows,
      onPick(r) {
        if (r.back) { openBuild(); return false; }
        if (!r.add) return false;
        add(r.add, 1);
        const s = stemOf(r.add);
        if (occ && occ.avoid.includes(s.kind))
          H.say(`${occ.hz}不能送${s.hz} · <span class="dim">${s.funeral ? 'those are funeral flowers' : 'wrong flower for this'}</span>`);
        openStems(filter, title); return false;
      } });
  }
  function openHues() {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:'颜色', py:'yánsè', en:'by colour' }];
    for (const h of HUES) {
      const n = STEMS.filter(s => s.hue === h.hz).length;
      if (!n) continue;
      rows.push({ hue:h.hz, hz:h.hz, py:h.py, en:h.en, right:`${n}种` });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back' });
    P.show({ title:`${NAME} · 颜色`, sub:'红粉白黄紫蓝绿', rows,
      onPick(r) {
        if (r.back) { openBuild(); return false; }
        if (!r.hue) return false;
        openStems(s => s.hue === r.hue, `${r.hue}色的`); return false;
      } });
  }
  // By budget. Not a filter but a made-up bunch: the shop puts one together *to* the number, which
  // is what actually happens when you walk in and say 一百块的.
  function openByPrice() {
    const P = H.Pick(); if (!P) return;
    const occ = occOf(state.occasion);
    const rows = [{ sec:'多少钱的？', py:'duōshao qián de?', en:'"a hundred kuai\'s worth" — the shop makes it up to the money' }];
    for (const yuan of [50, 88, 128, 188, 288]) {
      const bq = toBudget(yuan, occ);
      rows.push({ budget:yuan, hz:`${yuan}块的`, py:`${yuan} kuài de`,
        en: bq.length ? bq.map(r => `${stemOf(r.hz).hz}×${r.n}`).join('、') : 'not enough for a bunch',
        right:`¥${priceOf(bq).flowers}`, off: H.money() < yuan || !bq.length });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back' });
    P.show({ title:`${NAME} · 按价钱`, sub:`¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.back) { openBuild(); return false; }
        if (!r.budget) return false;
        state.build = toBudget(r.budget, occ); openBuild(); return false;
      } });
  }
  // Greedy, on the flowers that belong, biggest first, then filler to use up the change, then one
  // stem taken off if the count came out at four or even. It is a shop assistant's arithmetic, not
  // an optimiser, and it is deterministic so the same 128 always makes the same bunch.
  function toBudget(yuan, occ) {
    const pool = STEMS.filter(s => (!occ || belongs(s, occ)) && !s.funeral);
    const mains = pool.filter(s => !s.filler).sort((a, b) => b.price - a.price);
    const fills = pool.filter(s => s.filler).sort((a, b) => a.price - b.price);
    const out = []; let left = yuan;
    const push = (s, k) => { const r = out.find(q => q.hz === s.hz); if (r) r.n += k; else out.push({ hz:s.hz, n:k }); };
    // Lead flower first: the most expensive thing a third of the budget will buy three of.
    const lead = mains.find(s => s.price * 3 <= yuan * .7) || mains[mains.length - 1];
    if (!lead || lead.price > yuan) return [];
    while (left >= lead.price && stems(out) < 15) { push(lead, 1); left -= lead.price; }
    for (const f of fills) while (left >= f.price && stems(out) < 21) { push(f, 1); left -= f.price; }
    let n = stems(out);
    while ((n === 4 || n % 2 === 0) && out.length) {
      const last = out[out.length - 1];
      last.n--; if (last.n <= 0) out.pop();
      n = stems(out);
      if (!n) break;
    }
    return out;
  }
  function add(hz, k) {
    const s = stemOf(hz); if (!s) return;
    const r = state.build.find(q => q.hz === hz);
    if (!r) { if (k > 0) state.build.push({ hz, n:1 }); return; }
    r.n += k;
    if (r.n <= 0) state.build.splice(state.build.indexOf(r), 1);
  }

  // ---------------------------------------------------------------- 3. 贺卡
  // The card is handwritten, by the florist, to dictation, because the person sending the flowers
  // is usually not the person delivering them. That little transaction is why a florist's counter
  // has a pen on it, and it is where 生日快乐 and 早日康复 actually get used.
  function openCard() {
    const P = H.Pick(); if (!P) return;
    const occ = occOf(state.occasion);
    const texts = [];
    if (occ && occ.card) texts.push({ hz:occ.card, py:occ.cardPy, en:occ.cardEn });
    for (const o of OCCASIONS) if (!occ || o.key !== occ.key) texts.push({ hz:o.card, py:o.cardPy, en:o.cardEn });
    texts.push({ hz:'一切顺利', py:'yíqiè shùnlì', en:'may everything go smoothly — the safe one' });
    const rows = [{ sec:'卡片上写什么？', py:'kǎpiàn shàng xiě shénme?',
      en:'what should it say? 苏晴 writes it out for you at the counter' }];
    for (const t of texts) rows.push({ text:t.hz, hz:t.hz, py:t.py, en:t.en,
      right: state.card && state.card.text === t.hz ? '✓' : `¥${CARD_FEE}` });
    if (state.card) {
      rows.push({ sec:'署名', py:'shǔmíng', en:'whose name goes on it — 收花的还是送花的？' });
      rows.push({ to:'them', hz:'写收花人的名字', py:'xiě shōu huā rén de míngzi',
        en:'the name of the person receiving them', right: state.card.to === 'them' ? '✓' : '' });
      rows.push({ to:'me', hz:'写我的名字', py:'xiě wǒ de míngzi',
        en:'your own name, so they know who they are from', right: state.card.to === 'me' ? '✓' : '' });
      rows.push({ to:'none', hz:'不署名', py:'bù shǔmíng', en:'leave it unsigned',
        right: state.card.to === 'none' ? '✓' : '' });
      rows.push({ drop:true, hz:'不要卡片了', py:'bú yào kǎpiàn le', en:'no card after all' });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back' });
    P.show({ title:`${NAME} · 贺卡`, sub: state.card ? `「${esc(state.card.text)}」` : `¥${CARD_FEE}`, rows,
      onPick(r) {
        if (r.back) { openBuild(); return false; }
        if (r.drop) { state.card = null; openCard(); return false; }
        if (r.text) { state.card = { text:r.text, to: state.card ? state.card.to : 'me' }; openCard(); return false; }
        if (r.to && state.card) { state.card.to = r.to; openCard(); return false; }
        return false;
      } });
  }

  // ---------------------------------------------------------------- 4. 送货
  // Ten kuai and a cut-off. The cut-off is the whole reason this is a decision: after three in the
  // afternoon the east of the city is tomorrow, and the panel says so rather than silently failing.
  function openDelivery() {
    const P = H.Pick(); if (!P) return;
    const now = H.minutes();
    const rows = [{ sec:'送到哪儿？', py:'sòng dào nǎr?', en:`¥${DELIVERY}, and the rider needs an address and a number` }];
    for (const a of AREAS) {
      const late = now >= CUTOFF[a.key];
      rows.push({ area:a.key, hz:a.hz, py:a.py,
        en: late ? `${a.en} — past the cut-off, so it goes out tomorrow morning` : a.en,
        right: late ? '明天' : '今天' });
    }
    if (state.deliver) rows.push({ drop:true, hz:'不用送了', py:'bú yòng sòng le', en:'you will carry them yourself' });
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back' });
    P.show({ title:`${NAME} · 送货`, sub:`城东下午三点前，城西五点 · now ${clockOf(now)}`, rows,
      onPick(r) {
        if (r.back) { openBuild(); return false; }
        if (r.drop) { state.deliver = null; openBuild(); return false; }
        if (!r.area) return false;
        const a = AREAS.find(q => q.key === r.area), late = now >= CUTOFF[r.area];
        state.deliver = { key:r.area, hz:a.hz, addr:a.hz + '一个地址', today:!late };
        openBuild(); return false;
      } });
  }
  const clockOf = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // ---------------------------------------------------------------- 5. paying, and being told
  function buy() {
    const p = priceOf(state.build, state), n = stems(state.build);
    if (!n) return false;
    if (H.money() < p.total) {
      H.say(`钱不够 · <span class="dim">¥${p.total} needed; you have ¥${H.money()}</span>`); return false;
    }
    H.spend(p.total);
    state.bought++; state.spend += p.total;
    const occ = occOf(state.occasion);
    const faults = occ ? judge(state.build, state.occasion) : [];
    const names = state.build.map(r => `${stemOf(r.hz).hz}${r.n > 1 ? '×' + r.n : ''}`).join('、');
    const at = stamp(H.day(), H.minutes());
    // Keep only the identity needed by the retained dispatch rack. The builder itself is still
    // cleared below, so this cannot resurrect bought stems or change the held/delivery flow.
    state.orderRev = (state.orderRev | 0) + 1;
    state.lastOrder = { occasion:occ ? occ.key : 'self', at, delivery:!!state.deliver };
    if (state.deliver) {
      // Delivered flowers never wilt in your hands, because they are never in your hands. That is
      // half of why anybody pays the ten kuai.
      H.say(`送出去了 · <span class="dim">${esc(names)} · ${state.deliver.hz}, ` +
        `${state.deliver.today ? 'today before the cut-off' : 'first thing tomorrow'} · ¥${p.total}</span>`);
      H.sentence('麻烦送到这个地址。');
      H.diary(`在${NAME}订了一束花，${state.deliver.hz}，${p.total}块。`,
        `Ordered flowers at ${NAME_EN} for delivery ${state.deliver.hz}. ¥${p.total}.`, 'florist');
    } else {
      state.held = { stems: state.build.map(r => ({ ...r })), occasion:state.occasion,
        wrap:state.wrap, card: state.card && { ...state.card },
        boughtAt:at, since:at, wear:0, inWater:false, watered:0, paid:p.total };
      H.say(`包好了 · <span class="dim">${esc(names)} · ${WRAP[state.wrap].en}` +
        `${state.card ? ` · 「${esc(state.card.text)}」` : ''} · ¥${p.total}. ` +
        `Out of water they have about a day and a half</span>`);
      H.sentence('帮我包一下。');
      H.diary(`在${NAME}买了${names}，${p.total}块。`,
        `Bought ${names} at ${NAME_EN}. ¥${p.total}.`, 'florist');
    }
    // Said last and said plainly. The sale went through either way, which is what a shop does.
    for (const f of faults) if (f.bad)
      H.say(`${f.hz} · <span class="dim">${f.en}</span>`);
    H.need('mood', faults.some(f => f.bad) ? 4 : 12);
    H.advance(8);
    state.build = []; state.card = null; state.deliver = null;
    H.save(); return true;
  }

  // ---------------------------------------------------------------- 6. the bunch in your hands
  // What the flat's vase, the office desk and the hospital ward all end up calling. Everything here
  // is arithmetic on the timestamps above, evaluated on the click.
  function openHeld() {
    const P = H.Pick(); if (!P || !state.held) return;
    const day = H.day(), now = H.minutes();
    const f = freshness(state.held, day, now), st = stage(f);
    const names = state.held.stems.map(r => `${stemOf(r.hz).hz}×${r.n}`).join('、');
    const staleFor = state.held.inWater ? Math.max(0, (stamp(day, now) - (state.held.watered || 0)) - STALE) : 0;
    const rows = [
      { sec:esc(names), en: state.held.occasion ? `for ${(occOf(state.held.occasion) || {}).en || 'the house'}` : 'for the house' },
      { off:true, hz:st.hz, py:st.py, en:st.en, right:`${Math.round(f * 100)}%` },
    ];
    if (state.held.card) rows.push({ off:true, hz:`「${esc(state.held.card.text)}」`, py:'', en:'the card is still tucked in', right:'贺卡' });
    if (!state.held.inWater) rows.push({ water:true, hz:'插水里', py:'chā shuǐ lǐ',
      en:'stand them in water — out of water they have about a day and a half, in it about a week',
      right:'插花' });
    else {
      rows.push({ water:true, hz:'换水', py:'huàn shuǐ',
        en: staleFor > 0 ? 'the water has been in there over a day and they are going three times as fast — change it'
                         : 'change the water. Every day, and they will last the week',
        right: staleFor > 0 ? '该换了' : '还行' });
      rows.push({ out:true, hz:'拿出来', py:'ná chūlai', en:'take them out of the water to carry them', right:'拿走' });
    }
    if (f <= 0) rows.push({ bin:true, hz:'扔了', py:'rēng le', en:'throw them out' });
    P.show({ title:`${NAME_EN} · 手里的花`, sub:`${st.hz} ${st.py} · ${Math.round(f * 100)}%`, rows,
      onPick(r) {
        if (r.water) {
          reclock(state.held, day, now, true);
          H.say(state.held.inWater ? '换了水 · <span class="dim">fresh water — that buys them another day</span>'
                                   : '插好了 · <span class="dim">standing in water now</span>');
          H.sentence('花要天天换水。');
          H.need('mood', 3); H.save(); openHeld(); return false;
        }
        if (r.out) { reclock(state.held, day, now, false); H.save(); openHeld(); return false; }
        if (r.bin) { state.held = null; H.say('谢了，扔了 · <span class="dim">they had gone over</span>'); H.save(); return true; }
        return false;
      } });
  }

  // ---------------------------------------------------------------- one runnable check
  // The arithmetic in this file that would be wrong silently: the taboos, the counting rule, the
  // budget bunch and the two wilting clocks. RestaurantSys.selfCheck()'s opposite number, and it
  // needs no game behind it either.
  function selfCheck() {
    const A = (c, m) => { if (!c) throw new Error('FloristSys.selfCheck: ' + m); };
    const B = list => list.map(hz => ({ hz, n:1 }));
    // the one mistake you cannot undo
    A(judge(B(['白菊花', '康乃馨', '满天星']), 'hospital').some(f => f.key === 'taboo' && f.bad),
      'white chrysanthemums must be refused for a hospital visit');
    A(judge(B(['白菊花', '康乃馨', '满天星']), 'nonesuch').length === 0, 'an unknown occasion grades nothing');
    // red is the wrong apology
    A(judge(B(['红玫瑰', '满天星', '尤加利']), 'sorry').some(f => f.key === 'hue' && f.bad),
      'red must be flagged as an apology');
    A(ok([{ hz:'黄郁金香', n:5 }], 'sorry'), 'five yellow tulips is a correct apology');
    // a wedding has to have lilies
    A(judge([{ hz:'红玫瑰', n:9 }], 'wedding').some(f => f.key === 'must'), 'a wedding needs lilies');
    A(ok([{ hz:'百合', n:1 }, { hz:'粉玫瑰', n:6 }], 'wedding'), 'lilies plus roses is a wedding bunch');
    // 四 beats the even-number rule, and a bunch counts a lily bunch as five
    A(judge([{ hz:'向日葵', n:4 }], 'birthday').some(f => f.key === 'four'), 'four stems must be refused');
    A(!judge([{ hz:'向日葵', n:4 }], 'birthday').some(f => f.key === 'even'), 'four is a taboo, not an evenness note');
    A(stems([{ hz:'百合', n:1 }]) === 5, 'a bunch of lilies counts as five stems');
    A(judge([{ hz:'向日葵', n:6 }], 'birthday').some(f => f.key === 'even'), 'six stems is even and should be noted');
    // the budget bunch: to the money, never four, never even, and deterministic
    for (const y of [50, 88, 128, 188, 288]) {
      const bq = toBudget(y, occOf('birthday'));
      A(bq.length > 0, `a ${y} kuai bunch should exist`);
      A(priceOf(bq).flowers <= y, `a ${y} kuai bunch must not cost more than ${y}`);
      A(stems(bq) % 2 === 1, `a ${y} kuai gift bunch should come out odd, got ${stems(bq)}`);
      A(JSON.stringify(bq) === JSON.stringify(toBudget(y, occOf('birthday'))), 'the same money must make the same bunch');
      A(!bq.some(r => stemOf(r.hz).funeral), 'a budget bunch must never reach for the funeral flowers');
    }
    // wilting. Dry: alive at eight hours, dead at two days. Wet: alive at six days if watered.
    const at = stamp(3, 10 * 60);
    const dry = { boughtAt:at, since:at, wear:0, inWater:false };
    A(freshness(dry, 3, 18 * 60) > .7, 'eight hours out of water should still look fine');
    A(freshness(dry, 5, 10 * 60) === 0, 'two days out of water and they are finished');
    // A week is the florist's own promise and the promise has 每天换水 in it. This assertion was
    // written first as "six days in water is still alive" and failed, correctly: the model had
    // nobody changing the water, and six days of standing water is exactly what kills a bunch.
    // The two cases are separated here because the difference between them is the whole verb.
    let kept = reclock({ boughtAt:at, since:at, wear:0, inWater:false }, 3, 10 * 60, true);
    for (let d = 4; d <= 9; d++) reclock(kept, d, 10 * 60, true);   // changed every morning
    A(freshness(kept, 9, 10 * 60) > .1, 'six days with the water changed daily should still be alive');
    const neglected = reclock({ boughtAt:at, since:at, wear:0, inWater:false }, 3, 10 * 60, true);
    A(freshness(neglected, 9, 10 * 60) < freshness(kept, 9, 10 * 60),
      'water left standing must cost more than water changed');
    A(freshness(neglected, 9, 10 * 60) === 0, 'six days in water nobody changed and they are gone');
    // reclocking must not resurrect anything
    const half = { boughtAt:at, since:at, wear:0, inWater:false };
    const before = freshness(half, 4, 10 * 60);
    reclock(half, 4, 10 * 60, true);
    A(Math.abs(freshness(half, 4, 10 * 60) - before) < 1e-9, 'moving a bunch into water must not change how old it is');
    return 'FloristSys.selfCheck: ok';
  }

  return {
    NAME, NAME_PY, NAME_EN,
    STEMS, HUES, OCCASIONS, WRAP, CARD_FEE, DELIVERY, CUTOFF, AREAS, STAGES,
    stemOf, occOf, stems, priceOf, judge, ok, belongs, toBudget,
    freshness, stage, reclock, stamp, clockOf,
    openCounter, openBuild, openStems, openHues, openByPrice, openCard, openDelivery, openHeld,
    held: () => state.held && { ...state.held, stems: state.held.stems.map(r => ({ ...r })) },
    state, toSave, load, reset() { Object.assign(state, fresh0()); },
    bind(h) { host = h || null; },
    selfCheck,
  };
})();

(() => {
  const PI = Math.PI, TAU = 6.283185;
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------------------------------------------------------------- palette
  const TIMB   = C('#55402f'), TIMBT = C('#8a6a4a'), TIMBD = C('#42332a');
  const TRIM   = C('#2c2f33'), SAGE  = C('#42574a'), SLATE = C('#23282c');
  const ZINC   = C('#79828a'), ZINCR = C('#9aa3aa'), WATER = C('#2b3739');
  const STEEL  = C('#98a1a8'), STEELD= C('#67717a'), CARC  = C('#464d54');
  const GLASSC = C('#9fc2d3'), COLDW = C('#dfeef8'), WARMC = C('#ffeccd');
  const GOLDL  = C('#f3d47b'), CREAM = C('#ece1c8'), KRAFT = C('#b0854f');
  const CHALK  = C('#e6e2d6'), TWINE = C('#c8b48b');
  const TERRA  = C('#8b5136'), TERRB = C('#9d6244'), SOIL  = C('#3a2e26'), BARK = C('#5f4b38');
  const STEM   = C('#4c7040'), LEAF1 = C('#3d6a3b'), LEAF2 = C('#55834a'), LEAF3 = C('#2e5136');

  // Material specs. These deliberately match the shell's own MAT table where the shell has an
  // equivalent, so a riser in here and the slatted panel behind it are the same timber and share
  // a batch. `steel` is the one metal map whose relief reads as galvanising at arm's length,
  // which is what a florist's bucket is; `metal` is far too bright for a room with forty-five of
  // them in it. Nothing below is a brightness correction — see the note at the end of this file.
  const WOODM  = { mat:'wood',     matScale:.90, matAmt:.30 };  // == MAT.timber in js/mall.js
  const STEELM = { mat:'steel',    matScale:.55, matAmt:.30 };
  const POTM   = { mat:'concrete', matScale:.70, matAmt:.16 };
  const TAG    = { tag:'花' };
  const PETAL  = { mode:7,  gloss:.10, tag:'花' };   // one batch for every petal in the shop
  const GREEN  = { mode:15, gloss:.06, tag:'花' };   // one batch for every leaf

  // ---------------------------------------------------------------- the stock list
  // Eighteen things a Beijing florist actually has buckets of, each with a head shape as well as
  // a colour. Shape is what stops nine pink buckets reading as one pink bucket nine times: a
  // gerbera is a disc of petals on a bare stem, a delphinium is a spike, gypsophila is a cloud.
  //   k head style · c petal · c2 centre or shaded side · R head radius · h stem length · n stems
  const FL = [
    { k:'bloom',  c:C('#b8323a'), c2:C('#8f2029'), R:.052, h:.34, n:8 },  // 玫瑰 red rose
    { k:'bloom',  c:C('#d9628f'), c2:C('#b34d76'), R:.050, h:.32, n:8 },  // pink rose
    { k:'bloom',  c:C('#efb3c4'), c2:C('#d993a8'), R:.054, h:.28, n:7 },  // blush peony
    { k:'daisy',  c:C('#e0703a'), c2:C('#4b331f'), R:.052, h:.36, n:6 },  // orange gerbera
    { k:'daisy',  c:C('#e8bd36'), c2:C('#4b3520'), R:.060, h:.46, n:6 },  // 向日葵 sunflower
    { k:'tulip',  c:C('#f5efe1'), c2:C('#e3c04a'), R:.054, h:.42, n:7 },  // 百合 white lily
    { k:'tulip',  c:C('#c9384a'), c2:C('#a52c3c'), R:.046, h:.30, n:9 },  // red tulip
    { k:'tulip',  c:C('#e3bf3c'), c2:C('#c2a02e'), R:.046, h:.30, n:9 },  // yellow tulip
    { k:'spike',  c:C('#9a80c4'), c2:C('#806aa8'), R:.034, h:.44, n:7 },  // lilac stock
    { k:'spike',  c:C('#6b4d9c'), c2:C('#5a4084'), R:.032, h:.42, n:7 },  // delphinium
    { k:'spray',  c:C('#f7f4ec'), c2:C('#e6e0d0'), R:.024, h:.34, n:6 },  // 满天星 gypsophila
    { k:'bloom',  c:C('#6d8ecb'), c2:C('#5b79b0'), R:.050, h:.30, n:8 },  // hydrangea
    { k:'bloom',  c:C('#9dba5c'), c2:C('#87a24c'), R:.048, h:.30, n:8 },  // green chrysanth
    { k:'bloom',  c:C('#c34a8f'), c2:C('#a53c78'), R:.048, h:.32, n:8 },  // magenta carnation
    { k:'bloom',  c:C('#dd7420'), c2:C('#bd5f18'), R:.042, h:.28, n:9 },  // marigold
    { k:'bloom',  c:C('#f3ece0'), c2:C('#ddd4c2'), R:.050, h:.30, n:8 },  // white chrysanth
    { k:'foliage',c:C('#6d8f6a'), c2:C('#597a58'), R:.044, h:.38, n:7 },  // 尤加利 eucalyptus
    { k:'bloom',  c:C('#8d2033'), c2:C('#701829'), R:.046, h:.34, n:8 },  // burgundy
  ];

  // ---------------------------------------------------------------- one stem
  // The lean is the whole trick. A vertical rod with a ball on top is a lollipop; stems that
  // splay out over the rim, no two the same length, are a bunch. `rz` tips the top toward +a and
  // `rx` toward +b (both are world rotations and this shop is always on the east wall, so the two
  // stay fixed), and the run over the length of the capsule is what sets each angle.
  //
  // 8.5 mm, not 13. A stem is a wire, and at 26 mm across the first pass drew a bucket of green
  // curtain rods with flowers wedged onto the ends of them.
  function stem(K, a, b, y, oa, ob, len) {
    const L = Math.hypot(len, oa, ob);
    K.cap(a + oa / 2, b + ob / 2, y + len / 2 - .02, .0085, L + .03, .0085, STEM,
      { rz: oa / L, rx: ob / L, gloss:.14, ...TAG });
  }

  // ---------------------------------------------------------------- one head
  // Every branch here is balls only, so the whole shop's petals are a single instanced call.
  // `seed` decides which way a head is turned, which is the difference between a row of buckets
  // and a row of the same bucket.
  function head(K, a, b, y, f, seed) {
    const R = f.R, t = rnd(seed);
    if (f.k === 'bloom') {
      // A rosette: a small centre one step darker, and five petals round it in the flower's own
      // hue, alternately riding a little higher so the outline is not a circle.
      K.ball(a, b, y + R * .12, R * .50, R * .42, R * .50, f.c2, PETAL);
      for (let j = 0; j < 5; j++) {
        const g = j * 1.2566 + t * 2.2;
        K.ball(a + Math.cos(g) * R * .54, b + Math.sin(g) * R * .54,
          y + (j & 1 ? R * .13 : R * .02), R * .44, R * .36, R * .44, f.c, PETAL);
      }
    } else if (f.k === 'daisy') {
      // A ring of petals round a dark eye, with the whole face lifted on its +a side so it looks
      // out of the shop — which is the way a gerbera on a stand is always turned.
      for (let j = 0; j < 7; j++) {
        const g = j * .8976 + t * 2.2, oa = Math.cos(g) * R * .95, ob = Math.sin(g) * R * .95;
        K.ball(a + oa, b + ob, y + oa * .42, R * .40, R * .13, R * .34, f.c, PETAL);
      }
      K.ball(a, b, y + R * .04, R * .34, R * .17, R * .34, f.c2, PETAL);
    } else if (f.k === 'tulip') {
      // A closed cup with three petal tips just parting at the top. No dark ball on the crown:
      // that is what turned every lily in the first pass into a poppy with a hole in it.
      K.ball(a, b, y + R * .60, R * .60, R * .84, R * .60, f.c, PETAL);
      for (let j = 0; j < 3; j++) {
        const g = j * 2.094 + t * 3;
        K.ball(a + Math.cos(g) * R * .32, b + Math.sin(g) * R * .32, y + R * 1.14,
          R * .28, R * .40, R * .28, j ? f.c : f.c2, PETAL);
      }
    } else if (f.k === 'spike') {
      // Five florets up a vertical, tapering as they go, the shaded ones on alternate sides.
      for (let j = 0; j < 5; j++) {
        const k = 1 - j * .14;
        K.ball(a + (rnd(seed + j) - .5) * .020, b + (rnd(seed + j * 3) - .5) * .020,
          y + j * R * 1.06, R * .74 * k, R * .62 * k, R * .74 * k, j & 1 ? f.c2 : f.c, PETAL);
      }
    } else if (f.k === 'spray') {
      // Gypsophila: a cloud of small dots on no visible structure at all, which is what it is.
      for (let j = 0; j < 6; j++) {
        const g = rnd(seed + j * 2.3) * TAU, rr = R * (1.1 + rnd(seed + j * 5.1) * 1.2);
        K.ball(a + Math.cos(g) * rr, b + Math.sin(g) * rr, y + (j - 2.5) * R * .95,
          R * .46, R * .46, R * .46, j & 1 ? f.c2 : f.c, PETAL);
      }
    } else {
      // Eucalyptus: a sprig of round leaves alternating up the stem, in the foliage mode.
      for (let j = 0; j < 5; j++) {
        const g = j * 2.399 + t * 2;
        K.ball(a + Math.cos(g) * R * .50, b + Math.sin(g) * R * .50, y + (j - 2) * R * .82,
          R * .58, R * .16, R * .44, j & 1 ? f.c2 : f.c,
          { ...GREEN, ry: g, rz: (rnd(seed + j) - .5) * .6 });
      }
    }
  }

  // ---------------------------------------------------------------- a bucket of one thing
  // Galvanised, water in it, a collar of leaves over the rim and a bunch standing in the water.
  //
  // The vessel is a taper turned through 180 degrees: the mesh is wide at its base and narrow at
  // its top, which is a lampshade, and a florist's bucket is the other way up. The leaf collar is
  // not decoration — without it the stems come out of the water like wires out of a plug.
  function bucket(K, a, b, y, dia, fi, seed) {
    const f = FL[fi % FL.length], r = dia / 2, h = dia * 1.16;
    K.taper(a, b, y + h / 2, dia, h, dia, ZINC, { rx: PI, gloss:.40, ...STEELM, ...TAG });
    K.cyl(a, b, y + h - .014, r * 1.06, .028, ZINCR, { gloss:.52, ...TAG });
    K.cyl(a, b, y + h - .055, r * .86, .020, WATER, { gloss:.55, ...TAG });
    const top = y + h;
    for (let i = 0; i < 4; i++) {
      const g = i * 1.571 + rnd(seed) * 3;
      K.ball(a + Math.cos(g) * r * .84, b + Math.sin(g) * r * .84, top + .025,
        .054, .013, .030, i & 1 ? LEAF1 : LEAF2,
        { ...GREEN, ry: g, rz: (rnd(seed + i) - .5) * 1.0 });
    }
    for (let i = 0; i < f.n; i++) {
      const t = rnd(seed + i * 3.7), u = rnd(seed * 1.7 + i * 5.1);
      const ang = (i / f.n) * TAU + t * 1.2, sp = r * (.24 + u * .68);
      const oa = Math.cos(ang) * sp, ob = Math.sin(ang) * sp, len = f.h * (.78 + t * .44);
      stem(K, a, b, top - .04, oa, ob, len);
      head(K, a + oa, b + ob, top - .04 + len, f, seed + i * 7);
    }
  }

  // ---------------------------------------------------------------- a glass vase of one thing
  // What the chiller and the window hold: a clear vessel, water you can see the stems in, and a
  // taller, looser bunch than a bucket gets, because these are the ones sold by the stem.
  function vase(K, a, b, y, r, hgt, fi, n, seed) {
    const f = FL[fi % FL.length];
    K.cyl(a, b, y + hgt / 2, r, hgt, GLASSC, { mode:1, alpha:.34, gloss:.85, ...TAG });
    K.cyl(a, b, y + hgt * .34, r * .84, hgt * .62, C('#7f9fae'), { gloss:.55, ...TAG });
    for (let i = 0; i < n; i++) {
      const t = rnd(seed + i * 2.1), ang = (i / n) * TAU + t * 1.4;
      const oa = Math.cos(ang) * r * .62, ob = Math.sin(ang) * r * .62;
      const len = f.h * (.86 + t * .55);
      stem(K, a, b, y + hgt * .92, oa, ob, len);
      head(K, a + oa, b + ob, y + hgt * .92 + len, f, seed + i * 5);
    }
  }

  // ---------------------------------------------------------------- a pot plant
  // Terracotta, soil, a stem, and sprays of small leaves up it. `tall` is the ficus by the wall;
  // without it this is the herb-sized thing that stands on a shelf.
  // `y0` is the surface it stands on, and it is not optional decoration: without it every pot in
  // the shop was drawn at floor level whatever it was called for. The five herb pots meant for the
  // shelf over the wrapping bench were being built at a .44, y 0 — that is *inside* the bench
  // carcass, under a metre of joinery, where nothing has ever seen them.
  function pot(K, a, b, s, seed, tall, y0 = 0) {
    const d = .36 * s, h = y0 + .30 * s;
    K.taper(a, b, (y0 + h) / 2, d, h - y0, d, TERRA, { rx: PI, gloss:.16, ...POTM, ...TAG });
    K.cyl(a, b, h - .012, d * .55, .034, TERRB, { gloss:.18, ...TAG });
    K.cyl(a, b, h - .048, d * .44, .030, SOIL, { gloss:.04, ...TAG });
    const H = (tall ? 1.30 : .58) * s;
    K.cap(a, b, h + H * .34, .026 * s, H * .68, .026 * s, BARK, { gloss:.10, ...TAG });
    if (tall) {
      // A canopy of small masses on the golden angle, which is how the concourse's own planters
      // and trees are built, so a shop plant and a mall plant are the same kind of object. Flat
      // leaves were tried here first and are wrong at this size: a 20 cm ellipsoid lying nearly
      // level is a dish, and six whorls of dishes on a bare pole is a hat stand, not a ficus.
      for (let i = 0; i < 15; i++) {
        const g = i * 2.3999, rr = (.10 + ((i * 7) % 4) * .050) * s;
        K.ball(a + Math.cos(g) * rr, b + Math.sin(g) * rr, h + H * (.44 + ((i * 5) % 6) * .098),
          .104 * s, .082 * s, .104 * s, [LEAF1, LEAF2, LEAF3][i % 3], GREEN);
      }
      // and single leaves round the edge of it, so the outline is not a circle.
      for (let i = 0; i < 9; i++) {
        const g = i * .698 + 1.2, rr = (.21 + ((i * 3) % 3) * .045) * s;
        K.ball(a + Math.cos(g) * rr, b + Math.sin(g) * rr, h + H * (.48 + (i % 5) * .115),
          .078 * s, .012 * s, .034 * s, i & 1 ? LEAF1 : LEAF3,
          { ...GREEN, ry: g, rz: (rnd(seed + i) - .5) * .8 });
      }
    } else {
      // The shelf-sized one is a herb, and at 20 cm across a leaf really is a leaf: three tight
      // whorls with every leaf's inner end overlapping the stem.
      for (let k = 0; k < 3; k++) {
        const f = k / 2, ky = h + H * (.30 + f * .70), LL = (.086 - f * .028) * s;
        for (let i = 0; i < 8; i++) {
          const out = i & 1, kr = LL * (out ? 2.3 : .85);
          const g = k * .93 + i * (TAU / 8) + rnd(seed + k) * .8;
          K.ball(a + Math.cos(g) * kr, b + Math.sin(g) * kr, ky - (out ? .040 * s : 0),
            LL, .011 * s, LL * .38, [LEAF1, LEAF2, LEAF3][(i + k) % 3],
            { ...GREEN, ry: g, rz: (rnd(seed + i + k * 3) - .5) * .6 });
        }
      }
    }
  }

  // ---------------------------------------------------------------- a wrapped bouquet
  // A cone of kraft with the point down and the heads out of the mouth of it — the thing a
  // florist has a tubful of by the till, already made up, for somebody in a hurry.
  function wrap(K, a, b, y, fi, seed, lean, side) {
    const f = FL[fi % FL.length], rz = lean * side;
    K.taper(a, b, y + .21, .19, .44, .19, KRAFT, { rx: PI, rz, mode:7, gloss:.10, ...TAG });
    K.cyl(a - rz * .10, b, y + .12, .072, .030, TWINE, { rz, gloss:.16, ...TAG });
    // Greenery over the mouth first, then the heads above it, spread wider than the paper is —
    // a bouquet whose flowers all sit inside the cone is a cone.
    for (let i = 0; i < 3; i++) {
      const g = i * 2.094 + rnd(seed) * 2;
      K.ball(a + Math.cos(g) * .085 + rz * .28, b + Math.sin(g) * .085, y + .44,
        .056, .012, .028, i & 1 ? LEAF1 : LEAF3, { ...GREEN, ry: g });
    }
    for (let i = 0; i < 6; i++) {
      const t = rnd(seed + i * 1.7), g = (i / 6) * TAU + t;
      const oa = Math.cos(g) * .086, ob = Math.sin(g) * .086;
      head(K, a + oa + rz * .32, b + ob, y + .50 + t * .07, f, seed + i * 4);
    }
  }

  // ---------------------------------------------------------------- a chalked price board
  // Slate, a timber batten along the top, and the name of what is under it. Depth runs outward,
  // so the writing has to sit at a *larger* a than the board or it is drawn inside it.
  function chalk(A, a, b, y, w, txt) {
    A.put(a, b, .022, w, .21, y, SLATE, { hard:true, gloss:.10 });
    A.put(a + .006, b, .012, w + .02, .022, y + .118, TIMBT, { hard:true, gloss:.24, ...WOODM });
    A.glyph(a + .022, b, y - .015, txt, { size:.078, gap:.026, color: CHALK, glow:.02 });
  }

  // =============================================================================================
  MallFit['花店'] = A => {

    // -------------------------------------------------------------- the back wall
    // A three-riser bank of buckets, 3.4 m of it, stepping up towards the wall so every row of
    // flowers stands clear of the row in front. Kept under 1.7 m at the back so the shop's own
    // name, which the shell writes in gold at 1.95, still reads over the top of it.
    const BW = 3.40, BB = 0;
    const RISER = [                              // [front a, depth, top y, bucket a]
      [1.66, 1.14, .34, 1.46],
      [1.30, 0.78, .60, 1.12],
      [0.98, 0.46, .86, 0.76],
    ];
    for (const [fa, dp, ty] of RISER) {
      A.put(fa - dp / 2, BB, dp, BW, ty, ty / 2, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
      A.put(fa - .02, BB, .05, BW + .04, .055, ty - .028, TRIM, { hard:true, gloss:.30 });
    }
    // Twenty buckets on it, offset row to row, no two neighbours the same flower, and the
    // diameters walked up and down so the row of rims is not a ruled line.
    const ROWSPEC = [
      [7, [0, 4, 8, 1, 13, 7, 11], [.30, .26, .28, .31, .27, .29, .26]],
      [6, [10, 3, 15, 9, 2, 5],    [.27, .30, .26, .29, .27, .30]],
      [7, [16, 6, 12, 14, 0, 17, 4], [.26, .29, .27, .30, .26, .28, .27]],
    ];
    RISER.forEach((rs, r) => {
      const [n, kinds, dias] = ROWSPEC[r], pitch = (BW - .34) / n;
      for (let i = 0; i < n; i++)
        bucket(A, rs[3] + (rnd(r * 13 + i) - .5) * .04, BB - (n - 1) * pitch / 2 + i * pitch,
          rs[2], dias[i], kinds[i], r * 31 + i * 5);
    });
    chalk(A, 1.68, -1.12, .20, .58, '今日鲜花');
    chalk(A, 1.68,  1.12, .20, .58, '一支八元');
    A.stop(.50, 1.70, -1.76, 1.76);

    // -------------------------------------------------------------- 鲜花 the chiller
    // Right of the bank: back, two ends, a top and a kick, so the inside is a real cavity with
    // three lit decks in it rather than a solid block with bottles buried inside the volume. The
    // stock in here is the expensive kind — long-stem roses and lilies standing in glass.
    const CA = .73, CB = 2.84, CD = .86, CW = 1.96;
    A.put(CA, CB, CD, CW, .16, .08, TRIM, { hard:true, gloss:.30 });
    A.put(.37, CB, .14, CW, 1.90, 1.11, CARC, { hard:true, gloss:.32, ...STEELM });
    for (const s of [-1, 1])
      A.put(CA, CB + s * .95, CD, .06, 1.90, 1.11, CARC, { hard:true, gloss:.32, ...STEELM });
    A.put(CA, CB, CD, CW, .13, 2.00, CARC, { hard:true, gloss:.32, ...STEELM });
    A.put(.46, CB, .03, CW - .16, 1.72, 1.11, COLDW, { hard:true, mode:1, alpha:.9, glow:.12 });
    for (let d = 0; d < 3; d++) {
      const sy = .48 + d * .54;
      A.put(.76, CB, .68, CW - .14, .028, sy, STEEL, { hard:true, gloss:.55, ...STEELM });
      for (let i = 0; i < 3; i++)
        vase(A, .76, CB - .60 + i * .60, sy + .015, .062, .17,
          [0, 5, 13, 1, 9, 5, 0, 11, 5][d * 3 + i], 5, 200 + d * 9 + i);
    }
    A.put(1.00, CB, .10, CW - .26, .05, 1.86, WARMC, { hard:true, mode:1, glow:.28 });
    A.put(1.13, CB, .04, CW - .04, 1.86, 1.10, GLASSC, { hard:true, mode:1, alpha:.22, gloss:.92 });
    for (const ob of [-.98, 0, .98])
      A.put(1.15, CB + ob, .07, .07, 1.88, 1.10, STEELD, { hard:true, gloss:.55 });
    A.cap(1.20, CB + .18, 1.12, .024, .66, .024, STEELD, { gloss:.55 });
    // The circulation fan is tucked high on the cold back panel, visible through the glazing but
    // clear of the flower heads.  This unit is fixed to the east wall, so its face lies in world
    // z/y and the three bars rotate around world x.
    const fanA=.50, fanY=1.64, fanW=A.at(fanA,CB), fanBlades=[];
    A.cyl(.475,CB,fanY,.235,.022,SLATE,{rz:PI/2,gloss:.28,...STEELM});
    for(let i=0;i<3;i++) {
      const p=A.put(fanA,CB,.025,.34,.045,fanY,STEELD,{hard:true,gloss:.46,rx:i*PI/3});
      A.dynamic(p,fanA,CB,fanY,.32); fanBlades.push({p,phase:i*PI/3});
    }
    A.ball(.525,CB,fanY,.035,.035,.035,STEEL,{gloss:.58});
    A.glyph(1.18, CB, 1.965, '鲜花', { size:.145, gap:.05, color: GOLDL, glow:.14 });
    A.stop(.26, 1.24, 1.80, 3.92);

    // -------------------------------------------------------------- 送货, the orders going out
    //
    // Most of what a Beijing florist sells never leaves in the customer's hands: it is ordered by
    // phone or by scan and taken across the city by somebody on a scooter, and the shop's real
    // second counter is wherever the made-up orders stand waiting for him. Here that is the top of
    // the chiller — 2.06 m up, 86 cm deep, empty, and directly over the flowers the orders are
    // made from, which is where a florist would stack them anyway.
    //
    // Four occasion-coded bouquets, each with an address slip taped to its lid, and a slate over
    // them with the day's run and its time on it. This costs the room no floor at all, which matters: this
    // shop's only clear circulation is the 2.4 m of landing corridor between the chiller and the
    // till, and it is not spendable.
    const DVB = 2.62, DVY = 2.065;
    const ORDER_GONE = M.trs(0, -99, 0, 0, 0, 0, 0), dispatchOrders = [];
    const ORDER_OCCASIONS = ['birthday', 'sorry', 'wedding', 'hospital'];
    const ORDER_FLOWERS = [4, 7, 5, 13]; // sunflower, yellow tulip, white lily, carnation
    const showOrder = (q, show) => q.parts.forEach((p, i) => { p.m = show ? q.rest[i] : ORDER_GONE; });
    A.put(.42, DVB, .04, 1.62, .56, 2.64, SLATE, { hard:true, gloss:.10 });
    A.put(.428, DVB, .022, 1.66, .04, 2.935, TIMBT, { hard:true, gloss:.24, ...WOODM });
    A.glyph(.452, DVB, 2.77, '今日送货', { size:.070, gap:.024, color: CHALK, glow:.02 });
    A.glyph(.452, DVB, 2.57, '下午三点', { size:.062, gap:.022, color: GOLDL, glow:.03 });
    for (let i = 0; i < ORDER_OCCASIONS.length; i++) {
      const bb = DVB - .60 + i * .40, f = FL[ORDER_FLOWERS[i]], parts = [];
      const keep = p => { parts.push(p); return p; };
      const heads = { ball(...args) { return keep(A.ball(...args)); } };
      keep(A.put(.74, bb, .42, .30, .26, DVY + .13, KRAFT,
        { hard:true, mode:7, gloss:.08, ...TAG }));
      keep(A.put(.74, bb, .44, .32, .026, DVY + .273, C('#c9a877'),
        { hard:true, mode:7, gloss:.10, ...TAG }));
      const slip = keep(A.put(.955, bb, .014, .13, .11, DVY + .16, CHALK,
        { hard:true, mode:7, gloss:.14, ...TAG }));
      keep(A.put(.74, bb, .40, .012, .008, DVY + .276, TWINE,
        { hard:true, mode:7, gloss:.14, ...TAG }));
      // heads standing out of the open top of the box, which is how a wrapped order travels
      for (let k = 0; k < 3; k++) {
        const t = rnd(2600 + i * 7 + k), g = (k / 3) * TAU + t;
        head(heads, .74 + Math.cos(g) * .075, bb + Math.sin(g) * .075, DVY + .30 + t * .05, f,
          2600 + i * 7 + k);
      }
      A.dynamicVisual(parts);
      dispatchOrders.push({ occasion:ORDER_OCCASIONS[i], parts, rest:parts.map(p => p.m), slip });
    }

    // -------------------------------------------------------------- the wrapping bench
    // Everything a bunch is made into a bouquet with, opposite the chiller: the bench, kraft
    // rolls standing on it, a rod of ribbon spools over it, shears, twine, a watering can, a
    // shelf of small pots above, and a bin of cut stem ends on the floor at the end.
    const WA = .73, WB = -2.84;
    A.put(WA, WB, .80, CW - .10, .16, .08, TRIM, { hard:true, gloss:.30 });
    A.put(WA, WB, CD, CW, .74, .53, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
    A.put(WA + .01, WB, CD + .08, CW + .08, .055, .928, TIMBT,
      { hard:true, mode:6, gloss:.26, ...WOODM });
    A.put(.34, WB, .04, CW - .10, .40, .74, TIMBD, { hard:true, mode:6, gloss:.16, ...WOODM });
    const BT = .956;                                             // the working top
    // Five rolls of wrapping paper standing at the far end, tipped against the wall.
    const ROLLC = [KRAFT, C('#c8798f'), C('#e6dcc4'), C('#6f8a6b'), C('#a5654b')];
    for (let i = 0; i < 5; i++)
      A.cyl(.50, -3.62 + i * .19, BT + .44, .078, .88, ROLLC[i],
        { rz: .04 + i * .012, gloss:.16, ...TAG });
    // A rod of ribbon, with a tail off each spool.
    A.cap(.44, WB + .04, 1.34, .018, 1.62, .018, STEELD, { rx: PI / 2, gloss:.55 });
    for (const s of [-1, 1]) A.put(.44, WB + s * .84, .10, .04, .26, 1.23, STEELD,
      { hard:true, gloss:.5 });
    const RIBC = [C('#b8323a'), C('#d9628f'), C('#e3bf3c'), C('#6d8ecb'), C('#93ad57'),
                  C('#ece1c8'), C('#9a80c4')];
    for (let i = 0; i < 7; i++) {
      const rb = WB - .66 + i * .22;
      A.cyl(.44, rb, 1.34, .072, .10, RIBC[i], { rx: PI / 2, gloss:.28, ...TAG });
      A.cyl(.44, rb, 1.34, .026, .105, TIMBD, { rx: PI / 2, gloss:.2 });
      A.put(.50, rb, .012, .075, .20 + (i % 3) * .05, 1.24 - (i % 3) * .025, RIBC[i],
        { hard:true, mode:7, gloss:.22, ...TAG });
    }
    // A shelf of small pots above the ribbon, and an apron on a peg at the end of it.
    A.put(.42, WB, .28, CW - .06, .045, 1.74, TIMBT, { hard:true, mode:6, gloss:.24, ...WOODM });
    for (const s of [-1, 1]) A.put(.44, WB + s * .90, .26, .05, .30, 1.60, TIMBD,
      { hard:true, mode:6, gloss:.2, ...WOODM });
    for (let i = 0; i < 5; i++) pot(A, .44, WB - .70 + i * .34, .36, 400 + i * 6, false, 1.7625);
    A.glyph(.40, WB + .74, 1.92, '花艺', { size:.115, gap:.04, color: GOLDL, glow:.10 });
    // The apron, on a peg on the partition beside the bench. Flat to the wall, so it is thin
    // along b and wide along a — and at b -3.89 it is inside the partition's face at -3.92, and
    // below the shell's lightbox, which starts at a 1.63.
    A.cyl(1.15, -3.87, 1.60, .018, .05, STEELD, { rz: PI / 2, gloss:.5 });
    A.put(1.15, -3.89, .34, .022, .50, 1.30, SAGE, { hard:true, mode:7, gloss:.08, ...TAG });
    A.put(1.15, -3.89, .19, .022, .17, 1.545, SAGE, { hard:true, mode:7, gloss:.08, ...TAG });
    A.cap(1.15, -3.88, 1.56, .009, .30, .009, TWINE, { rx: PI / 2, gloss:.14 });
    // What is on the bench: sheets, shears, twine, a watering can and a bouquet half wrapped.
    A.put(.62, WB - .78, .46, .56, .028, BT + .014, CREAM, { hard:true, mode:7, gloss:.10, ...TAG });
    A.put(.60, WB - .74, .44, .54, .026, BT + .042, KRAFT, { hard:true, mode:7, gloss:.10, ...TAG });
    for (const t of [.22, -.22]) {
      A.put(.92, WB - .18, .21, .028, .010, BT + .012, STEEL, { hard:true, gloss:.62, ry: t });
      A.put(.82, WB - .18, .10, .030, .015, BT + .012, TRIM, { hard:true, gloss:.35, ry: t });
    }
    A.ball(.88, WB + .16, BT + .052, .052, .052, .052, TWINE, { mode:7, gloss:.12, ...TAG });
    A.cyl(.94, WB + .52, BT + .10, .082, .20, STEEL, { gloss:.48, ...STEELM });
    A.cyl(.94, WB + .52, BT + .205, .086, .020, STEELD, { gloss:.55 });
    A.cap(1.10, WB + .52, BT + .16, .026, .28, .026, STEEL, { rz: -1.0, gloss:.48 });
    A.cyl(1.22, WB + .52, BT + .225, .042, .030, STEELD, { rz: -1.0, gloss:.5 });
    A.cap(.94, WB + .52, BT + .27, .016, .15, .016, STEELD, { rx: PI / 2, gloss:.5 });
    // A bouquet lying finished on the end of the bench.
    A.taper(.72, WB + .82, BT + .07, .19, .34, .19, KRAFT, { rz: 1.25, mode:7, gloss:.10, ...TAG });
    for (let i = 0; i < 5; i++) {
      const t = rnd(700 + i);
      head(A, .90 + (t - .5) * .07, WB + .78 + (i - 2) * .045, BT + .10 + (t - .5) * .05,
        FL[[1, 5, 13, 10, 2][i]], 700 + i);
    }
    // Restrained work traces, not a second display. Five loose petals sit by the finished bunch and
    // four freshly cut leaves stop beside the shears. All nine are the shop's existing mode-7 ball
    // batch, kept 16 mm above the timber so even their thinnest edge cannot z-fight the bench top.
    const workTraces = [], trace = (a, b, y, ra, ry, rb, c, rz) => {
      const p = A.ball(a, b, y, ra, ry, rb, c,
        { mode:7, gloss:.07, ry:rz, tag:'花艺痕迹' });
      workTraces.push(p); return p;
    };
    const PETAL_C = [C('#d9628f'), C('#f5efe1'), C('#e0703a'), C('#e3bf3c'), C('#b8323a')];
    for (let i = 0; i < 5; i++)
      trace(.70 + (i % 3) * .085, -2.22 - Math.floor(i / 3) * .12 + (i % 2) * .035,
        BT + .024, .025 + (i % 2) * .005, .004, .012, PETAL_C[i], -.65 + i * .31);
    for (let i = 0; i < 4; i++)
      trace(.66 + (i % 2) * .12, -2.90 - Math.floor(i / 2) * .15 + (i % 2) * .025,
        BT + .025, .038, .005, .014, [LEAF1, LEAF2, LEAF3, LEAF1][i], -.78 + i * .48);
    // The offcut bin, at the far end of the bench, with stem ends sticking out of it.
    A.taper(1.46, -3.64, .27, .40, .54, .40, TRIM, { rx: PI, gloss:.22 });
    for (let i = 0; i < 7; i++) {
      const t = rnd(800 + i);
      A.cap(1.46 + (t - .5) * .22, -3.64 + (rnd(820 + i) - .5) * .20, .58 + t * .10,
        .011, .22 + t * .12, .011, i & 1 ? STEM : LEAF3,
        { rz: (t - .5) * 1.4, rx: (rnd(840 + i) - .5) * 1.4, gloss:.12 });
    }
    A.stop(.26, 1.24, -3.92, -1.80);
    A.stop(1.26, 1.70, -3.86, -3.42);

    // -------------------------------------------------------------- 养护, water and what happens
    // -------------------------------------------------------------- without it
    //
    // The one thing a florist does all day and no shop in this building had any evidence of:
    // conditioning. A cut stem drinks about its own weight of water in the first hour and a bunch
    // left on a bench is limp by the end of the afternoon — which is why a florist's bench has a
    // trough on it and why the answer to 花能放几天 is always 每天换水.
    //
    // So the bench carries the argument in two objects standing 40 cm apart: three bunches
    // standing in water in a zinc trough, and one bunch lying on the dry timber beside them with
    // every head dropped 40 degrees and the leaves curled. Nothing here is a mechanic — this file
    // cannot own player state — but it is the picture the sentence attaches to, and the shop's
    // staff say the rest of it. The tap over the trough is what makes the trough a trough.
    //
    // Placed at a .90–1.14, the only clear run of bench top: the paper sheets reach a .85 and the
    // rolls stand at a .42–.58, so this is the 24 cm strip along the customer edge of it.
    const TRB = -3.45;                                          // the trough, along b
    A.put(1.02, TRB, .22, .70, .026, BT + .013, ZINCR, { hard:true, gloss:.46, ...STEELM });
    for (const s of [-1, 1])                                                 // the trough's ends
      A.put(1.02, TRB + s * .35, .22, .022, .13, BT + .078, ZINC,
        { hard:true, gloss:.40, ...STEELM });
    for (const q of [-1, 1])                                                 // and its two sides
      A.put(1.02 + q * .11, TRB, .022, .70, .13, BT + .078, ZINC,
        { hard:true, gloss:.40, ...STEELM });
    A.put(1.02, TRB, .19, .66, .010, BT + .112, WATER, { hard:true, gloss:.58, ...TAG });
    // Three bunches standing in it, cut short the way a bucket of conditioning stems is.
    for (let i = 0; i < 3; i++) {
      const cb = TRB - .22 + i * .22, f = FL[[3, 1, 12][i]];
      for (let k = 0; k < 5; k++) {
        const t = rnd(2200 + i * 9 + k), g = (k / 5) * TAU + t * 1.5;
        const oa = Math.cos(g) * .045, ob = Math.sin(g) * .045, len = .22 + t * .10;
        stem(A, 1.02, cb, BT + .10, oa, ob, len);
        head(A, 1.02 + oa, cb + ob, BT + .10 + len, f, 2200 + i * 9 + k);
      }
    }
    // The tap: a riser off the bench behind the trough, a swan neck and a spout over the water.
    A.cyl(.88, TRB, BT + .17, .016, .34, STEEL, { gloss:.55 });
    A.cap(.95, TRB, BT + .335, .016, .17, .016, STEEL, { rz: -1.15, gloss:.55 });
    A.cyl(1.02, TRB, BT + .30, .014, .045, STEELD, { gloss:.55 });
    A.cap(.86, TRB + .07, BT + .335, .012, .10, .012, STEELD, { rx: PI / 2, gloss:.5 });
    // The drop, and the only moving thing on this side of the shop. One prop, one number written
    // per frame, culled at 12 m — a dripping tap is heard and glimpsed, it is not a feature.
    const dripP = A.ball(1.02, TRB, BT + .272, .010, .014, .010, COLDW,
      { mode:1, alpha:.55, glow:.06 });
    A.dynamic(dripP, 1.02, TRB, BT + .19, .24);
    const dripY0 = dripP.m[13];
    // A narrow rubber mat catches the staff-side drips. Its a=1.27..1.59 and b=-3.36..-2.90
    // footprint clears the bench and offcut-bin stops by 3 cm and 6 cm respectively. At y=.031..043
    // it is physically above the floor, opaque, and too thin to need or deserve a collider.
    const wetMat = A.dynamicVisual(A.put(1.43, -3.13, .32, .46, .012, .037, C('#3c5a58'),
      { hard:true, mode:1, gloss:.62, glow:.01, tag:'花艺痕迹' }));
    workTraces.push(wetMat);
    // Dry, on the timber, 40 cm along the bench: the same flowers as the middle bucket, laid on
    // their side with every head tipped over. `rz` on a head is not available — a head is built
    // upright from its own centre — so the droop is drawn instead: each head sits below the end
    // of its own stem rather than on top of it, which is exactly what a wilted stem looks like.
    const WLT = -3.02, WF = FL[1];
    A.put(1.02, WLT, .13, .17, .010, BT + .012, KRAFT, { hard:true, mode:7, gloss:.08, ...TAG });
    for (let i = 0; i < 5; i++) {
      const t = rnd(2400 + i), ob = (i - 2) * .030;
      A.cap(1.02 + (t - .5) * .06, WLT + ob, BT + .028, .0085, .30, .0085, C('#6d7a4a'),
        { rx: PI / 2, rz: (t - .5) * .3, gloss:.10, ...TAG });
      // the head, hanging off the end of its stem and 3 cm *below* it
      head(A, 1.02 + (t - .5) * .06, WLT + ob + .155, BT + .012, WF, 2400 + i * 3);
    }

    // -------------------------------------------------------------- 送花看场合, the occasion guide
    //
    // The part of this trade that does not travel. Which flower goes with which occasion is not
    // taste in China, it is closer to grammar, and a learner who takes the wrong bunch to a ward
    // has said something they did not mean to say. Four colour-coded cards over the bench, each
    // naming one occasion, and a line under them carrying the two rules that are actually rules:
    //
    //   生日  bright and warm — sunflowers, gerberas — and an odd number of stems
    //   道歉  quiet and pale. Yellow tulips and white roses apologise; red does not, it declares
    //   结婚  red, and 百合 above all, because 百年好合 is the phrase every wedding says
    //   探病  warm, scentless, cut rather than potted. 盆栽 puts down roots, and a root is the
    //         last thing you wish on an illness
    //   四支不送  four of anything is 四, which is 死. Nobody sends four stems, ever
    //   白菊不进病房  the white chrysanthemum is the funeral flower. It never goes to a bedside
    //
    // Only the occasion names are written: a character is a draw call, and this shop already
    // spends forty of them on signage. The rest of it is what 何梅 says when you talk to her,
    // which costs nothing and is the better place for it anyway.
    const OCC = [['生日', C('#e8bd36')], ['道歉', C('#dfd6c0')],
                 ['结婚', C('#b8323a')], ['探病', C('#e0703a')]];
    const OA = .44, OB = -2.85, OY = 2.50;
    A.put(OA - .02, OB, .05, 1.98, .74, OY, TRIM, { hard:true, gloss:.20 });
    A.put(OA - .01, OB, .03, 2.02, .05, OY + .385, TIMBT,
      { hard:true, gloss:.24, ...WOODM });
    OCC.forEach(([occ, band], i) => {
      const ob = OB - .765 + i * .51;
      A.put(OA, ob, .022, .44, .52, OY - .015, CHALK, { hard:true, mode:1, glow:.09 });
      A.put(OA + .010, ob, .016, .44, .11, OY + .195, band, { hard:true, mode:1, glow:.13 });
      A.glyph(OA + .030, ob, OY + .194, occ, { size:.078, gap:.028, color: SLATE, glow:.02 });
    });
    A.glyph(OA + .030, OB, OY - .295, '送花看场合',
      { size:.062, gap:.022, color: GOLDL, glow:.04 });

    // -------------------------------------------------------------- the two tiered stands
    // Down each side of the aisle, three risers stepping up away from the walkway, so from the
    // door you look along a bank of flowers that climbs as it goes out to the wall.
    function stand(a0, a1, b0, dir, cols, kinds) {
      const w = .44, dp = a1 - a0, ac = (a0 + a1) / 2;
      for (let t = 0; t < 3; t++) {
        const bc = b0 + dir * (w * (t + .5)), ty = .32 + t * .26;
        A.put(ac, bc, dp, w, ty, ty / 2, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
        A.put(ac, bc - dir * (w / 2 - .025), dp + .04, .05, .055, ty - .028, TRIM,
          { hard:true, gloss:.30 });
        for (let i = 0; i < cols.length; i++)
          bucket(A, cols[i], bc, ty, .26 + ((t + i) % 3) * .018,
            kinds[(t * 5 + i * 3) % kinds.length], t * 17 + i * 11 + dir * 3);
      }
    }
    // Both stands stop at 3.45 and not at the shopfront. The body has a 30 cm radius and the
    // shell's window glass is a collider from 4.45 outward, so a stand running to 4.05 leaves a
    // 35 cm slot between the two — less than one body — and seals the whole side of the shop off
    // behind it. Stopping short leaves a cross-aisle along the front that you can actually walk,
    // which is the only way round to the chiller, the bench and the bouquet tub.
    stand(2.05, 3.45, -1.10, -1, [2.30, 2.72, 3.14], [3, 8, 14, 6, 11, 0, 15, 9, 4, 12, 1, 17]);
    // The old positive-b stand sat squarely on the line from the shop door to the lift focus
    // behind this unit.  Keep the same seasonal stock, but compress it into a shallow bank beside
    // the shopfront.  Its deepest edge is now a full metre off the lift centreline (a 2.40), so
    // both the player and the camera get a continuous aisle through to the landing.
    stand(3.72, 4.16, 1.32, 1, [3.80, 3.94, 4.08], [7, 13, 2, 16, 5, 10, 4, 1, 8]);
    chalk(A, 3.48, -1.32, .20, .40, '玫瑰');
    chalk(A, 4.19,  1.54, .20, .40, '百合');
    chalk(A, 4.19,  2.40, .20, .46, '向日葵');
    chalk(A, 3.48, -2.16, .20, .46, '一支八元');
    A.stop(2.00, 3.50, -2.48, -1.04);
    A.stop(3.68, 4.20, 1.28, 2.68);

    // -------------------------------------------------------------- the floor
    // Two tall plants flank the bank, where they break the join between the back wall and the
    // stands. Everything else on this side of the floor is pushed hard against the partition at
    // -3.92 rather than stood out in the middle of the strip: with a 30 cm body and 1.44 m
    // between the stand and the wall, one 60 cm tub parked centrally in that strip is a door
    // nobody can get through, and the back of the shop becomes a diorama.
    pot(A, 1.86, -1.42, 1.12, 11, true);
    // This plant used to pinch the new lift aisle at a 1.86. It now anchors the chiller-side wall.
    pot(A, .92, 1.34, 1.06, 29, true);
    pot(A, 2.55, -3.60, 1.16, 47, true);
    A.stop(1.62, 2.10, -1.66, -1.18);
    A.stop(.68, 1.16, 1.10, 1.58);
    A.stop(2.34, 2.76, -3.82, -3.38);
    // The bouquet tub: a galvanised tub of made-up bunches, leaning out of it every which way,
    // where the walk round the front of the stand brings you past it.
    A.taper(3.34, -3.58, .27, .52, .54, .52, ZINC, { rx: PI, gloss:.38, ...STEELM, ...TAG });
    A.cyl(3.34, -3.58, .545, .282, .034, ZINCR, { gloss:.52, ...TAG });
    for (let i = 0; i < 5; i++) {
      const g = i * 1.2566 + .4;
      wrap(A, 3.34 + Math.cos(g) * .14, -3.58 + Math.sin(g) * .14, .36,
        [1, 5, 13, 2, 15][i], 500 + i * 9, .18, Math.cos(g));
    }
    // and a board on a stake in it, because a board hung on nothing reads as a board hung on
    // nothing however well it is lettered.
    A.cap(3.58, -3.58, .56, .014, .44, .014, TIMBD, { rz:.10, gloss:.20 });
    chalk(A, 3.62, -3.58, .78, .44, '花束');
    A.stop(3.08, 3.60, -3.84, -3.32);
    // A bucket of loose greenery, which is the thing a florist buys by the armful and nobody
    // ever draws: no flowers in it at all, just stems.
    bucket(A, 1.95, -3.62, 0, .32, 16, 611);
    A.stop(1.79, 2.11, -3.78, -3.46);

    // -------------------------------------------------------------- hanging baskets
    // Hung over the aisle, clear of the shell's downlight grid at a 1.35 and 3.05, with the
    // bottom of the trailing foliage at 1.95 so you walk under them rather than into them.
    function basket(a, b, seed) {
      A.cap(a, b, 3.00, .008, 1.00, .008, STEELD, { gloss:.5 });
      A.taper(a, b, 2.40, .36, .20, .36, C('#8b6a45'), { rx: PI, mode:7, gloss:.10, ...TAG });
      A.cyl(a, b, 2.494, .19, .028, C('#a17f56'), { gloss:.14, ...TAG });
      // Trailing foliage in strands, not tiers. Eight of them hang off the rim, each three to
      // five leaves stacked close enough to touch and each a different length, which is what
      // gives the basket an outline. Leaves scattered on rings at one height read as confetti
      // thrown round the pot — they never join up into a plant.
      for (let i = 0; i < 8; i++) {
        const g = i * .7854 + rnd(seed + i) * .5;
        const kr = .172 + (rnd(seed + i * 3) - .5) * .034, nl = 3 + (i % 3);
        for (let k = 0; k < nl; k++)
          A.ball(a + Math.cos(g) * (kr - k * .014), b + Math.sin(g) * (kr - k * .014),
            2.43 - k * .052, .056, .012, .028, [LEAF1, LEAF2, LEAF3][(i + k) % 3],
            { ...GREEN, ry: g, rz: (rnd(seed + i + k * 5) - .5) * .8 });
      }
      const f = FL[[2, 13, 1, 14][seed % 4]];
      for (let i = 0; i < 5; i++) {
        const t = rnd(seed * 3 + i), g = i * 1.257 + t;
        head(A, a + Math.cos(g) * (.06 + t * .10), b + Math.sin(g) * (.06 + t * .10),
          2.56 + t * .06, f, seed * 3 + i * 6);
      }
    }
    basket(2.15, -1.06, 2); basket(2.15, 1.06, 5);
    basket(3.48, -1.06, 7); basket(3.48, 1.06, 4);
    basket(4.18, -1.06, 9); basket(4.18, 1.06, 3);

    // -------------------------------------------------------------- the drying rail
    // Bunches hung upside down over the aisle to dry. This is the one fixture in a florist that
    // lives at head height, and it is the reason the ceiling of one is never empty: without it the
    // room is a bank of flowers under three metres of nothing. Hung at a 2.80, between the shell's
    // two downlight rows at 1.35 and 3.05, with the lowest head at 2.10 so you walk under it.
    A.cap(2.80, 0, 2.62, .016, 2.16, .016, STEELD, { rx: PI / 2, gloss:.55 });
    for (const s of [-1, 1]) A.cap(2.80, s * 1.06, 3.08, .014, .95, .014, STEELD, { gloss:.50 });
    for (let i = 0; i < 7; i++) {
      const bb = -.90 + i * .30, sd = 1700 + i * 11, f = FL[[17, 8, 10, 16, 9, 15, 2][i]];
      A.cap(2.80, bb, 2.44, .010, .38, .010, TWINE, { gloss:.14 });
      for (let k = 0; k < 5; k++) {
        const t = rnd(sd + k), g = (k / 5) * TAU + t;
        const oa = Math.cos(g) * .055, ob = Math.sin(g) * .055;
        A.cap(2.80 + oa * .5, bb + ob * .5, 2.36, .008, .34, .008, STEM,
          { rz: oa / .34, rx: ob / .34, gloss:.12 });
        head(A, 2.80 + oa, bb + ob, 2.14 - t * .05, f, sd + k * 3);
      }
    }

    // -------------------------------------------------------------- the till
    // Painted joinery rather than timber, so the one piece of furniture you transact at is a
    // different colour from the fifty pieces of furniture you do not. The shell's `counter` puts
    // the till, the screen, the card reader and the 收银台 label on it, and hangs the 收银台
    // interactable 0.85 m out in front of the counter face with a 1.7 m reach.
    //
    // Its depth is what makes the shop payable, and it was wrong. At a 3.05 the label's focus
    // landed at a 4.75 — inside the shopfront glazing, which is a collider from 4.45 to 4.95 on
    // this side of the door — and the only floor within 1.7 m of it was the window platform. Set
    // back to 2.35 the counter face is at 2.80 and the whole strip from a 2.9 to 3.6 at this b is
    // clear floor, every point of it inside the reach: you walk up to the counter and 买单 is
    // there. Behind it, 1.24 (the chiller's front) to 1.95 (the counter's back) is 71 cm of clear
    // floor, which is where the cashier in MallCast below actually stands.
    // The till used to be centred at a 2.35, b 3.14: exactly the lift focus in the world frame.
    // It was therefore impossible to stand at the point the lift interaction advertised.  The
    // compact replacement hugs the shopfront-side end of the partition, leaving a 1.9 m clear
    // landing corridor between it and the chiller.  It keeps a real screen, reader and reachable
    // payment interaction rather than treating circulation as a reason to remove the service.
    const TA = 3.92, TB = 3.18, TW = 1.02, TD = .54;
    A.counter(TA, TB, TW, TD, SAGE, false);
    A.hasTill = true;
    A.put(3.78, TB + .22, .24, .34, .24, 1.11, TRIM, { hard:true, gloss:.35 });
    const tillScreen=A.put(3.765, TB + .22, .035, .28, .18, 1.23, COLDW,
      { hard:true, mode:1, glow:.14, gloss:.62 });
    A.put(3.82, TB - .28, .18, .24, .09, 1.03, STEEL, { hard:true, gloss:.54 });
    if(A.powerDisplay)A.powerDisplay(tillScreen,{id:'till'});
    A.glyph(3.625, TB, .64, '收银台', { size:.105, gap:.035, color:GOLDL, glow:.08 });
    const pay=A.th('收银台', TA, TB, '这个多少钱？', 'How much is this one?',
      '收银 to take payment + 台 counter.', 1.8, 1.2);
    // `th()` normally puts a fixture's focus 1.15 m toward the shopfront. Here that would land in
    // the florist's pavement display, so keep the payment point on the clear inner corner instead.
    pay.focus=A.at(3.14,2.88);
    // Greetings cards and a small vase preserve the florist detail at the relocated counter.
    for (let r = 0; r < 3; r++)
      A.put(4.01 - r * .08, TB + .34, .025, .16, .17, 1.07 + r * .055,
        [CREAM, C('#d9628f'), C('#e3bf3c')][r],
        { hard:true, mode:7, gloss:.12, rz:.24, ...TAG });
    vase(A, 3.88, TB - .30, .98, .048, .18, 2, 4, 900);

    // -------------------------------------------------------------- 贺卡, the card you write here
    //
    // A bunch of flowers in China arrives with a card and the card is handwritten — by the florist,
    // to dictation, in front of you, because the person sending them is usually not the person
    // delivering them. That little transaction is the reason a florist's counter has a pen on it
    // and a shop assistant who asks 写什么, and it is worth a learner's attention: the card is
    // where 生日快乐 and 早日康复 actually get used.
    //
    // Everything here is on the customer edge of the counter and faces the landing corridor at
    // a 3.14, which is where the payment point already puts you: `back:true` on the glyph, because
    // A.glyph faces the concourse by default and this counter is served from its inner face.
    const CDB = TB - .06;                                          // b 3.12, between vase and cards
    A.put(3.97, CDB, .18, .38, .014, .987, TIMBT, { hard:true, gloss:.24, ...WOODM });
    A.put(4.05, CDB, .020, .38, .19, 1.075, TIMBD, { hard:true, gloss:.18, rz:.34, ...WOODM });
    for (let i = 0; i < 6; i++)                                    // blanks, standing in the rack
      A.put(4.00 - (i % 2) * .022, CDB - .155 + i * .062, .012, .054, .155, 1.068,
        [CREAM, C('#d9628f'), C('#e3bf3c'), CHALK, C('#9a80c4'), C('#a5654b')][i],
        { hard:true, mode:7, gloss:.12, rz:.30, ...TAG });
    // Two already written, lying flat where they were blotted, and the brush pen beside them.
    for (let i = 0; i < 2; i++) {
      const wb = CDB - .30 - i * .16;
      A.put(3.86 + i * .05, wb, .13, .095, .006, .995, CHALK,
        { hard:true, mode:7, gloss:.10, ry: (i - .5) * .30 });
      for (let k = 0; k < 3; k++)                                  // the strokes of the writing
        A.put(3.86 + i * .05, wb - .026 + k * .026, .072, .007, .003, 1.000, SLATE,
          { hard:true, mode:7, ry: (i - .5) * .30, ...TAG });
    }
    A.cyl(4.12, CDB - .30, 1.035, .028, .097, TIMBD, { gloss:.20 });
    for (let i = 0; i < 3; i++)
      A.cap(4.12 + (i - 1) * .012, CDB - .30, 1.115, .006, .17, .006, [SLATE, TIMBD, TRIM][i],
        { rz: (i - 1) * .12, gloss:.30 });
    A.put(4.16, CDB + .30, .05, .06, .05, 1.005, C('#8f2029'), { hard:true, gloss:.30 });
    // The sign, on the inner face, so it is read from the same square metre the till is used from.
    A.put(4.20, CDB + .17, .022, .30, .17, 1.09, SLATE, { hard:true, gloss:.10 });
    A.put(4.196, CDB + .17, .012, .32, .020, 1.185, TIMBT, { hard:true, gloss:.24, ...WOODM });
    A.glyph(4.186, CDB + .17, 1.075, '贺卡',
      { size:.070, gap:.024, color: CHALK, glow:.02, back:true });

    // The wreath moves to the chiller-side pier, outside the 2.56 m lift portal.  It remains the
    // high focal point of the florist without masquerading as decoration on the lift doors.
    const WRA = .72;
    for (let i = 0; i < 16; i++) {
      const g = i * (TAU / 16);
      A.ball(WRA + Math.cos(g) * .27, 3.79, 2.43 + Math.sin(g) * .27, .078, .072, .026,
        [LEAF1, LEAF2, LEAF3][i % 3], { ...GREEN, rz: g });
    }
    for (let i = 0; i < 5; i++) {
      const g = i * 1.2566 + .5;
      head(A, WRA + Math.cos(g) * .27, 3.76, 2.43 + Math.sin(g) * .27,
        FL[[0, 2, 15, 13, 10][i]], 1900 + i * 6);
    }

    // -------------------------------------------------------------- 盆栽 wall herbs
    // The former floor ladder occupied the left edge of the lift portal.  Three wall-hung herb
    // ledges do the same merchandising job above the relocated till, with no floor collider and
    // no foliage in the landing sightline.
    const LA = 4.02, LB = 3.79;
    for (let t = 0; t < 3; t++) {
      const sy = 1.34 + t * .46;
      A.put(LA, LB, .72, .18, .042, sy, TIMBT, { hard:true, mode:6, gloss:.24, ...WOODM });
      A.put(LA, LB - .07, .74, .035, .055, sy - .026, TRIM, { hard:true, gloss:.30 });
      for (let i = 0; i < 2; i++)
        pot(A, LA - .18 + i * .36, LB - .05, .34, 1600 + t * 7 + i, false, sy + .021);
    }
    chalk(A, 4.20, LB - .10, 2.62, .40, '盆栽');

    // -------------------------------------------------------------- the A-board
    // The one thing every florist in the world puts on the pavement. Just inside the threshold,
    // off the centreline so the walk-in gap is still wide, and angled to be read from the aisle.
    // The board itself stands square. It was leaning on an `rz` at first, and lettering has no
    // lean of its own — `glyph` writes a quad on the shop's yaw and nothing else — so the two
    // planes crossed and half of every character was inside the slate.
    const FA = 4.28, FB = 1.26;
    A.put(FA, FB, .045, .50, .70, .43, SLATE, { hard:true, gloss:.10 });
    A.put(FA + .004, FB, .06, .54, .045, .745, TIMBT, { hard:true, gloss:.24, ...WOODM });
    for (const s of [-1, 1])
      A.cap(FA + .10, FB + s * .22, .22, .018, .46, .018, TIMBD, { rz:-.36, gloss:.20 });
    A.glyph(FA + .03, FB, .58, '今日鲜花', { size:.078, gap:.028, color: CHALK, glow:.02 });
    A.glyph(FA + .03, FB, .40, '玫瑰 百合', { size:.068, gap:.024, color: GOLDL, glow:.03 });
    A.stop(4.14, 4.44, 1.04, 1.48);
    // and a tub of made-up bunches on the other side of the walk-in, so the threshold has weight
    // on both sides of it and the first thing inside the shop is the thing most people came for.
    //
    // Its depth and its b are both load-bearing, and the first placement — a 4.26, b -1.26 — shut
    // the shop in half. The only way from the aisle to the bench, the offcut bin and the bouquet
    // tub is the cross-aisle along the front, and that is 95 cm wide: the stands' colliders end at
    // a 3.50 and the glazing begins at 4.45. A 50 cm tub anywhere in that band leaves 45 cm, and a
    // body is 60 across, so the whole -b half of the room became scenery. Out at 4.50 the tub is
    // in the *threshold*, past the glass line, where the door's 3 m gap means there is no glazing
    // collider to be trapped against — 75 cm still clear in front of it — and at b -1.00 it is
    // clear of the shell's security pedestal, which stands at b -1.33 to -1.49.
    // Made up to the four occasions on the guide board at the back of the shop, in that order and
    // in the flowers that board colour-codes: a sunflower bunch for a birthday, yellow tulips for
    // an apology, red roses for a wedding — twice, because weddings are ordered in pairs — and
    // orange gerberas for a hospital visit. Five, not four: 四 is 死 and no florist here would
    // stand four of anything in a tub by the door.
    A.taper(4.50, -1.00, .27, .50, .54, .50, ZINC, { rx: PI, gloss:.38, ...STEELM, ...TAG });
    A.cyl(4.50, -1.00, .545, .272, .034, ZINCR, { gloss:.52, ...TAG });
    for (let i = 0; i < 5; i++) {
      const g = i * 1.2566 + 1.1;
      wrap(A, 4.50 + Math.cos(g) * .13, -1.00 + Math.sin(g) * .13, .36,
        [4, 7, 0, 0, 3][i], 1500 + i * 9, .18, Math.cos(g));
    }
    A.cap(4.28, -1.00, .58, .014, .46, .014, TIMBD, { rz:-.10, gloss:.20 });
    chalk(A, 4.30, -1.00, .80, .46, '今日花束');
    A.stop(4.25, 4.75, -1.25, -.75);

    // -------------------------------------------------------------- the pavement
    // The half-metre of concourse every florist in the world annexes, and the thing this shop most
    // obviously lacked: walking the deck you saw a sheet of glass, and a florist is a shop you
    // notice sideways and step into by accident. Depth runs outward, so all of this is at a
    // *larger* a than the shopfront line at 4.8. The glazing is a collider from 4.45 to 4.95 on
    // both sides of the door, so nothing starts before 4.96; the door's own 3 m gap is b -1.5 to
    // 1.5 and the nearest thing to it stands at 1.8, which leaves a body's width either side of a
    // three-metre opening. Everything stops at 5.80 — 1 m of walkway — because the deck's own
    // crowd routes run at x 13 and the shopfront is at 18.2, so this takes concourse nobody walks.
    //
    // Two risers each side, stepping *down* away from the glass, so the bank climbs towards the
    // window rather than standing in front of it. Nothing here is over 1.2 m to the top of a stem.
    function marketStep(bc, bw, seed, kinds) {
      for (let t = 0; t < 2; t++) {
        const fa = 5.78 - t * .40, ty = .24 + t * .22, ac = fa - .20;
        A.put(ac, bc, .40, bw, ty, ty / 2, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
        A.put(fa - .015, bc, .05, bw + .03, .05, ty - .026, TRIM, { hard:true, gloss:.30 });
        const n = 4, pitch = (bw - .32) / n;
        for (let i = 0; i < n; i++)
          bucket(A, ac + (rnd(seed + t * 5 + i) - .5) * .05,
            bc - (n - 1) * pitch / 2 + i * pitch, ty,
            .26 + ((t + i) % 3) * .017, kinds[(t * 3 + i) % kinds.length], seed + t * 9 + i * 4);
      }
      // A price card on the front riser, which is where a market stall's prices live — flat on the
      // timber and inside its 24 cm, so it is a card on a stand and not a board floating in air.
      chalk(A, 5.795, bc, .12, .50, '一支八元');
    }
    marketStep( 3.00, 1.50, 1200, [4, 0, 7, 11, 5, 14]);
    marketStep(-3.00, 1.50, 1300, [1, 5, 12, 3, 8, 15]);
    A.stop(4.96, 5.80,  2.22,  3.78);
    A.stop(4.96, 5.80, -3.78, -2.22);
    // A ficus one side of the door and a galvanised urn of long stems the other. These are what
    // read from thirty metres down the deck, where the buckets are still one green smudge.
    pot(A, 5.32, -2.00, 1.10, 81, true);
    A.stop(5.06, 5.58, -2.26, -1.74);
    A.taper(5.30, 2.00, .31, .40, .62, .40, ZINC, { rx: PI, gloss:.38, ...STEELM, ...TAG });
    A.cyl(5.30, 2.00, .606, .216, .032, ZINCR, { gloss:.52, ...TAG });
    for (let i = 0; i < 4; i++) {
      const g = i * 1.571 + 1.4;
      A.ball(5.30 + Math.cos(g) * .18, 2.00 + Math.sin(g) * .18, .636,
        .056, .013, .030, i & 1 ? LEAF1 : LEAF2, { ...GREEN, ry: g });
    }
    for (let i = 0; i < 10; i++) {
      const t = rnd(1400 + i), g = (i / 10) * TAU + t * 1.3;
      const oa = Math.cos(g) * .12, ob = Math.sin(g) * .12, len = .40 + t * .26;
      stem(A, 5.30, 2.00, .58, oa, ob, len);
      head(A, 5.30 + oa, 2.00 + ob, .58 + len, FL[[4, 9, 5, 17][i % 4]], 1400 + i * 3);
    }
    A.stop(5.10, 5.50, 1.80, 2.20);

    // -------------------------------------------------------------- light
    // Flowers want cool light and plenty of it, so the two over the room are close to white and
    // brighter than a clothes shop would take. The chiller gets a cold one of its own, which is
    // what makes a glass case read as refrigerated from the doorway.
    A.light(1.15, -.10, 2.55, [1.00, 0.98, 0.94], .42, 3.6);
    A.light(2.95, 0, 2.50, [1.00, 0.97, 0.92], .30, 3.0);
    A.light(.95, CB, 1.45, [0.72, 0.86, 1.00], .32, 2.2);

    A.motion('chiller-fan',(t,state,P,minutes)=>{
      const angle=t*4.1;
      fanBlades.forEach(b=>{
        b.p.m=M.mul(M.trans(fanW[0],A.y0+fanY,fanW[1]),
          M.mul(M.rotX(angle+b.phase),M.scale(.025,.045,.34)));
      });
      // Prepared orders leave in deterministic waves: four in the morning, two after the 15:00
      // dispatch, one in the evening. A completed order either fills its absent occasion slot or
      // highlights the matching retained bouquet; no new callback, allocation or transparent pass.
      const dayMinute = ((Number.isFinite(minutes) ? minutes : 9 * 60) % 1440 + 1440) % 1440;
      const scheduled = dayMinute < 15 * 60 ? 4 : dayMinute < 18 * 60 ? 2 : 1;
      const orderState = window.FloristSys && window.FloristSys.state;
      const rev = orderState ? orderState.orderRev | 0 : 0;
      const occasion = orderState && orderState.lastOrder ? orderState.lastOrder.occasion : null;
      let selected = -1;
      for (let i = 0; i < dispatchOrders.length; i++)
        if (dispatchOrders[i].occasion === occasion) { selected = i; break; }
      if (scheduled !== state.scheduled || selected !== state.occasion || rev !== state.orderRev) {
        let prepared = 0;
        for (let i = 0; i < dispatchOrders.length; i++) {
          const q = dispatchOrders[i], visible = i >= dispatchOrders.length - scheduled || i === selected;
          showOrder(q, visible); if (visible) prepared++;
          q.slip.color = i === selected ? GOLDL : CHALK;
          q.slip.glow = i === selected ? .18 : 0;
        }
        state.prepared = prepared;
        state.scheduled = scheduled;
        state.occasion = selected < 0 ? -1 : selected;
        state.orderRev = rev;
      }
      state.angle=angle%TAU;
      state.rpm=39;
    },{far:15});

    // The tap over the conditioning trough, dripping. One prop and one number written per frame,
    // culled at 12 m: this is the sound of a florist, not a feature, and it is what makes the
    // trough read as full of water rather than as a zinc tray with stems standing in it.
    A.motion('tap-drip', (t, state) => {
      const u = (t * .62) % 1, fall = u * u;                 // accelerating, one drop per 1.6 s
      dripP.m[13] = dripY0 - fall * .215;
      wetMat.gloss = .58 + (1 - u) * .12;                    // one restrained travelling sheen
      state.fall = fall;
      state.wetMat = +wetMat.gloss.toFixed(3);
      if (state.workTraces === undefined) state.workTraces = workTraces.length;
    }, { far:12 });

    // -------------------------------------------------------------- language, and buying things
    // game.js generates one browse action per MALL_GOODS key and one till action for 收银台, so a
    // shop is operational the moment it has an interactable tagged with its own kind and a till —
    // and reachable means `inReach`, which is "the player's feet within `reach` metres of the
    // thing's *focus*", and a focus is the point 1.15 m out at +a from the thing. So each of these
    // is placed by where its focus lands, not by where the label looks best:
    //
    //   花店 at 5.15 → focus 4.00, b 0: the middle of the walk-in gap, where the M-flowers camera
    //     stands. That is the browse you get from the concourse, before you have come in.
    //   花店 at 2.30 → focus 3.45, b 0: the middle of the aisle, between the two tiered stands and
    //     clear of both their colliders (they stop at b ±1.04). Standing among the buckets and
    //     being unable to buy any of them was the whole failure this second one exists to fix.
    //   收银台 (from `counter` above) at 3.60, b 3.14 → focus 4.75. The floor from a 2.9 to 3.6 at
    //     that b is clear — counter face at 2.80, window platform from 3.655, plant ladder from
    //     b 3.52 — and every point of it is inside the 1.7 m reach.
    //
    // The four teaching words are the four things in MALL_GOODS you can actually point at in the
    // room: a bucket of stems, the roses on the stand, the sunflowers, and the pots on the ladder.
    A.th('花店', 4.8 + .35, 0, '买一束花送给朋友。', 'Buy a bunch of flowers for a friend.',
      '花 flower + 店 shop.', 2.2, 2.5);
    A.th('花店', 2.30, 0, '这束花包起来多少钱？', 'How much to have this bunch wrapped?',
      '花 flower + 店 shop.', 1.9, 1.30);
    A.th('花', 3.30, -1.10, '这些花今天早上刚到。', 'These flowers arrived this morning.',
      '花 means flower.', 1.7, 1.05);
    A.th('玫瑰', 2.90, -1.60, '一枝玫瑰，帮我包一下。', 'One rose, and please wrap it for me.',
      '玫瑰 is the rose — the flower you buy one of.', 1.8, 1.15);
    A.th('向日葵', 2.90, 2.16, '向日葵一束多少钱？', 'How much for a bunch of sunflowers?',
      '向日 towards the sun + 葵 mallow.', 1.8, 1.15);
    A.th('盆栽', 3.20, 3.42, '这盆盆栽好养吗？', 'Is this pot plant easy to keep alive?',
      '盆 basin + 栽 to plant.', 1.8, 1.30);
    // ---- and the six the new fixtures needed. Every headword below is already in js/vocab.js —
    // 花束, 贺卡, 康乃馨, 生日 and 探病 are not, so they are written on slate and said out loud by
    // the staff instead of being hung on a label that would teach nothing. See the report.
    //
    // Focus is 1.15 m out at +a from each, and each was placed by where that lands:
    //   医院  .44 → 1.59, b -2.85: the service strip between the bench (ends 1.24) and the -b
    //         stand (starts 2.00, and only from b -2.48). 76 cm of floor, all of it in reach.
    //   浇水 1.05 → 2.20, b -3.45: clear of the greenery bucket (1.79–2.11 at b -3.78..-3.46) and
    //         of the tall plant (2.34–2.76 at b -3.82..-3.38), with the whole strip behind it.
    //   快递 1.30 → 2.45, b 2.62: the middle of the landing corridor, which is 2.4 m of open floor.
    //   新鲜 1.20 → 2.35, b 2.84: the same corridor, a stride further along it.
    //   高兴 4.50 → 5.65, b -1.00: the pavement outside the walk-in gap, clear of both market
    //         steps (they run b ±2.22..3.78) and of the ficus at b -2.00.
    //   名字  the gift-card rack sits on the counter and its focus would land in the pavement
    //         display, so like the till's it is aimed by hand at the inner corner instead.
    A.th('医院', .44, -2.85, '去医院看人，别送白菊花。',
      'Visiting someone in hospital — never take white chrysanthemums.',
      '白菊 is the funeral flower. Warm colours, no scent, and cut rather than potted: a 盆栽 '
      + 'puts down roots, and nobody wishes that on an illness.', 1.6, 2.50);
    A.th('浇水', 1.05, -3.45, '花要天天换水。', 'Flowers need fresh water every day.',
      '浇 to pour + 水 water. The bunch lying on the dry bench beside the trough is the same '
      + 'flowers as the one standing in it, four hours later.', 1.7, 1.10);
    A.th('新鲜', 1.20, 2.84, '这些百合最新鲜，在冷柜里。',
      'These lilies are the freshest — they are in the chiller.',
      '新 new + 鲜 fresh. What the cold cabinet is for.', 1.7, 1.45);
    A.th('快递', 1.30, 2.62, '可以送到家吗？', 'Can you deliver it to my home?',
      '快 fast + 递 to hand over. The boxed orders on top of the chiller go out at three.',
      1.8, 2.20);
    A.th('高兴', 4.50, -1.00, '收到花的人都会很高兴。',
      'Anyone who is given flowers is pleased.',
      '高 high + 兴 spirits. The five bunches in this tub are made up to the four occasions on '
      + 'the board at the back of the shop.', 1.9, .95);
    const card = A.th('名字', 3.97, TB - .06, '卡片上写什么名字？', 'What name goes on the card?',
      '名 name + 字 character. The florist writes it for you, to dictation, before it goes out.',
      1.7, 1.05);
    card.focus = A.at(3.20, 2.94);
  };

  // ---------------------------------------------------------------- the shopfront window
  // Called by shop() with `winApi` — put/cyl/ball/cap/taper only, no glyph, no collider, because
  // everything in here is behind glass. `bb` is the middle of this bay and `s` which side of the
  // door it is on. The shell has already built the platform (top at y .34) and the stall riser.
  //
  // This is the only part of the shop most people in the concourse will ever look at, so it gets
  // the two things a florist's window has: height, and one thing at eye level worth stopping for.
  MallFit['花店:win'] = (W, bb, s) => {
    const seed = s > 0 ? 40 : 90;
    // A crate at the back of the platform, so the display is on two levels rather than a row.
    W.put(3.86, bb, .48, 1.34, .32, .50, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
    W.put(3.86, bb, .52, 1.38, .045, .683, TIMBT, { hard:true, mode:6, gloss:.24, ...WOODM });
    // Two buckets up on the crate and one down on the deck, all different flowers.
    bucket(W, 3.86, bb - .44, .705, .28, s > 0 ? 0 : 6, seed + 1);
    bucket(W, 3.86, bb + .40, .705, .26, s > 0 ? 7 : 2, seed + 2);
    bucket(W, 4.36, bb - .74, .34, .28, s > 0 ? 13 : 15, seed + 3);
    // The tall thing: a glass vase of long stems, which is what gives a window its height.
    vase(W, 4.34, bb + .06, .34, .105, .54, s > 0 ? 5 : 0, 9, seed + 4);
    // A pot plant, and two made-up bouquets leaning against the crate the way they are sold.
    // The plant is the tall one: the window is 2.7 m of glass and a herb on a deck does not
    // reach into it.
    pot(W, 4.30, bb + .80, .82, seed + 5, true);
    for (let i = 0; i < 2; i++)
      wrap(W, 4.18 + i * .10, bb - .12 + i * .30, .34, s > 0 ? 2 : 14, seed + 10 + i, .22, i ? 1 : -1);
    // ---- and the rest of the bay. Seven objects over 2.5 m of frontage left half of each window
    // as bare timber deck, which from the concourse reads as a shop that has sold out by four in
    // the afternoon. What follows fills the two ends and the second level, all of it out of the
    // same four builders the shop is made of, so it adds no batch it does not already own.
    //
    // A second crate at the outer end, stepped one riser higher than the first, with its own pair.
    W.put(3.86, bb + 1.02, .48, .72, .46, .57, TIMB, { hard:true, mode:6, gloss:.20, ...WOODM });
    W.put(3.86, bb + 1.02, .52, .76, .045, .823, TIMBT, { hard:true, mode:6, gloss:.24, ...WOODM });
    bucket(W, 3.86, bb + 1.02, .845, .27, s > 0 ? 11 : 8, seed + 20);
    // A tier of terracotta down the inner end, big to small, which is the other half of what a
    // florist sells and the only warm colour in a window otherwise made of stems.
    for (let i = 0; i < 3; i++)
      pot(W, 4.24 - i * .05, bb - 1.06 + i * .015, .92 - i * .20, seed + 30 + i, false,
        i ? .34 : .683);
    // Two more buckets down on the deck at the outer end, and one glass vase short of the first,
    // so the run of vessels along the front of the window is not one height repeated.
    bucket(W, 4.38, bb + .52, .34, .27, s > 0 ? 3 : 12, seed + 40);
    bucket(W, 4.40, bb + 1.16, .34, .29, s > 0 ? 16 : 4, seed + 41);
    vase(W, 4.30, bb - .48, .34, .078, .34, s > 0 ? 1 : 13, 7, seed + 42);
    // A watering can on the crate, in the metal the buckets are, because a window with only stock
    // in it is a display case and a window with a tool in it is a shop somebody works in.
    W.cyl(3.82, bb + .44, .795, .072, .18, STEEL, { gloss:.48, ...STEELM });
    W.cyl(3.82, bb + .44, .888, .076, .020, STEELD, { gloss:.55 });
    W.cap(3.96, bb + .44, .855, .024, .26, .024, STEEL, { rz: -1.0, gloss:.48 });
    W.cyl(4.07, bb + .44, .915, .038, .028, STEELD, { rz: -1.0, gloss:.50 });
    W.cap(3.82, bb + .44, .955, .014, .13, .014, STEELD, { rx: PI / 2, gloss:.50 });
  };

  // ---------------------------------------------------------------- who works and shops here
  // Pushed onto MallCast (declared at the top of js/mall.js), which game.js folds into NPCS before
  // the roster is initialised. Ordinary NPC rows: nothing here is special-cased for this shop.
  //
  // Every coordinate below is in the MALL's world frame, not the shop's. This unit is
  // shop('E', 8.6, 8.0), and side E maps (a, b) to [RX - a, u + b] with RX 23 — so
  //
  //     x = 23 - a          z = 8.6 + b
  //
  // and a yaw is atan2(dx, dz), which makes -PI/2 "looking out towards the concourse" (that is
  // -x, which is +a), +PI/2 "looking at the back wall", 0 "+b" and PI "-b". Getting that backwards
  // is how you get a shop assistant serving the plasterboard.
  //
  // Every standing position was checked against this file's own colliders rather than eyeballed,
  // because a florist standing inside her own wrapping bench is worse than an empty shop:
  //
  //   florist  a 1.70, b -2.84 — the service strip between the bench (a stops at 1.24) and the
  //            -b tiered stand (starts at a 2.00, and only for b -2.48 to -1.04). Clear either
  //            side of a 0.30 m body, and she is turned to face the bench she is working at.
  //   cashier  a 1.65, b -2.18 — helping at the wrapping bench while the compact till is quiet.
  //            Keeping both fixed staff in this real service strip leaves the lift threshold for
  //            circulation instead of using people as bollards in front of its doors.
  //   browsing a 3.75, b -.55 — at the negative-b flower bank, away from the lift landing. This
  //            customer used to stand at a 3.25, b 2.80 and fill the right lift leaf in the view.
  //   at-bank  a 2.10, b -0.55 — the aisle, past the bank's collider (ends a 1.70) and inboard of
  //            both stands (they start at |b| 1.04).
  //   at-tub   a 3.30, b -2.90 — between the -b stand and the bouquet tub, facing the tub.
  //
  // The walkers' routes are in the same frame: they come down the deck, through the 3 m walk-in
  // gap at b -1.5 to 1.5, up the 2 m aisle, and back out. Two more never come in at all and just
  // work the pavement display outside, which is what most of a florist's traffic actually does.
  const CX = a => 23 - a, CZ = b => 8.6 + b;
  MallCast.push(
    { hz:'导购员', name:'何梅', py:'Hé Méi', place:'mall', mallFloor:1,
      rig:'mall-flower-guide-he-mei', temper:'genial',
      look:{ skin:'#e8bb92', hair:'#241d1a', hairStyle:'bun', top:'#f0e8da', pants:'#414b56',
        shoe:'#2d3237', vest:'#42574a', tall:.96, faceSeed:6411 },
      spots:[{ h0:9, h1:22, at:[CX(1.70), CZ(-2.84)], face: Math.PI / 2,
        act:'work', held:null }],
      // 何梅 is where the occasion knowledge lives. The board over the bench colour-codes the four
      // and has room for eight characters; she has room for as much as it takes, costs no draw
      // calls, and is the person a customer would actually ask. Four of these are the rules a
      // learner gets wrong first, and all four are said the way a shop assistant says them.
      lines:[['您好，要送人还是自己放家里？', 'Hello — is it a gift, or for your own home?'],
             ['玫瑰一支十五块，百合一束五十五。', 'Roses are fifteen kuai a stem, lilies fifty-five a bunch.'],
             ['我帮您包起来，会好看很多。', 'Let me wrap it up for you — it looks much better.'],
             ['向日葵今天早上刚到，很新鲜。', 'The sunflowers came in this morning; very fresh.'],
             ['送生日就要亮的颜色，单数支。',
              'For a birthday you want bright colours, and an odd number of stems.'],
             ['道歉别送红的，黄郁金香或者白玫瑰。',
              "Don't send red as an apology — yellow tulips or white roses."],
             ['结婚一定要百合，百年好合嘛。',
              'A wedding has to have lilies — 百年好合, a hundred years of harmony.'],
             ['去病房不能送白菊花，那是丧事用的。',
              'You cannot take white chrysanthemums to a hospital ward — those are for funerals.'],
             ['探病送盆栽也不好，扎根的意思不吉利。',
              'A pot plant is a bad hospital gift too: it puts down roots, and that is the wrong wish.'],
             ['四支不送，四跟死一个音。',
              'Never four stems — 四 sounds like 死.'],
             ['买回去每天换水，能开一个星期。',
              'Change the water every day at home and they will last a week.']] },
    { hz:'收银员', name:'苏晴', py:'Sū Qíng', place:'mall', mallFloor:1,
      rig:'mall-flower-cashier-su-qing', temper:'brisk',
      look:{ skin:'#dcae86', hair:'#2b2320', hairStyle:'ponytail', top:'#e7dcc9', pants:'#4a4048',
        shoe:'#332e31', vest:'#d2748d', tall:.99, faceSeed:6412 },
      spots:[{ h0:9, h1:22, at:[CX(1.65), CZ(-2.18)], face: Math.PI / 2,
        act:'work', held:null }],
      // The till end of the shop is where the card gets written and the delivery gets booked, so
      // 苏晴 carries both. 早日康复 and 生日快乐 are the two things anybody ever asks for on a card.
      lines:[['一共九十块，扫码还是现金？', 'Ninety kuai altogether — scan the code, or cash?'],
             ['要不要再加一张卡片？', 'Would you like a card with it as well?'],
             ['花瓶在旁边那个架子上。', 'The vases are on the shelf just there.'],
             ['卡片上写什么？我帮您写。', 'What should the card say? I will write it for you.'],
             ['生日就写生日快乐，探病写早日康复。',
              'For a birthday, 生日快乐; for a hospital visit, 早日康复 — get well soon.'],
             ['写谁的名字？收花的还是送花的？',
              'Whose name goes on it — the person receiving them, or the person sending them?'],
             ['送货十块，城里下午三点前都能到。',
              'Delivery is ten kuai; anywhere in town before three in the afternoon.'],
             ['留个地址和电话，师傅到了会打给他。',
              'Leave an address and a number — the rider will ring when he arrives.']] },
    // The three who have stopped moving. A shop where every customer is walking reads as a
    // corridor with stock in it; somebody standing still in front of a fixture is what says the
    // fixture is worth stopping at.
    { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
      look:{ skin:'#d5a37c', hair:'#332a25', hairStyle:'bob', top:'#8d6f86', pants:'#3c444f',
        shoe:'#e7e0d3', bag:'tote', bagColor:'#c1a25e', tall:1.0 },
      spots:[{ h0:9, h1:22, at:[CX(3.75), CZ(-.55)], face: -1.37, act:'wait' }] },
    { hz:'顾客', place:'mall', mallFloor:1, temper:'steady',
      look:{ skin:'#c9986e', hair:'#2c2521', hairStyle:'short', top:'#5f7688', pants:'#343b43',
        shoe:'#272c30', collar:'shirt', tall:1.07 },
      // Off the centreline on purpose. At a 2.10, b -0.55 he stood 1.9 m dead in front of the
      // shop's own camera, which looks up the aisle from the walk-in gap, and a 1.07-tall body at
      // 1.9 m is the whole frame: the bank, the name and both stands were behind him. Pushed to
      // b +0.85 and turned to the +b stand he is in profile against the bank instead of in front
      // of it — still in the aisle, where a customer belongs, and no longer the room.
      spots:[{ h0:9, h1:22, at:[CX(1.95), CZ(.85)], face: 0, act:'wait' }] },
    { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
      look:{ skin:'#eec19a', hair:'#211c19', hairStyle:'tousled', top:'#b5643f', pants:'#464e5a',
        shoe:'#eae3d6', tall:.95 },
      spots:[{ h0:9, h1:22, at:[CX(3.30), CZ(-2.90)], face: -3.08,
        act:'carry', held:'bouquet' }] },
    // ---- 送货员 张培远, the third member of staff and the one who is not in the shop. Most of what
    // this florist sells leaves on the back of a scooter, so the man who takes it is a person and
    // not an implication. He stands out on the pavement at the -b market step, facing the shop,
    // loading the boxes that are stacked on top of the chiller.
    //
    // On the pavement rather than in the room on purpose: this unit's only clear circulation is
    // the 2.4 m landing corridor between the chiller and the till, and a body parked in it is a
    // bollard in front of a lift. Out here he is on concourse the deck's own crowd routes do not
    // use — they run x 16–17 — and he faces +x, which on the east wall is into the shop.
    { hz:'送货员', name:'张培远', py:'Zhāng Péiyuǎn', place:'mall', mallFloor:1,
      rig:'mall-flower-courier-zhang-peiyuan', temper:'brisk',
      look:{ skin:'#c9925f', hair:'#211b18', hairStyle:'buzz', top:'#3f5f52', pants:'#37404a',
        shoe:'#2b3035', vest:'#c46a2c', tall:1.03, faceSeed:6414 },
      spots:[{ h0:9, h1:20, at:[17.05, 6.00], face: Math.PI / 2, act:'carry', held:'box' }],
      lines:[['这三束是送去医院的，我先走了。',
              'These three are going to the hospital — I am off.'],
             ['地址写清楚一点，胡同不好找。',
              'Write the address out properly; the hutongs are hard to find.'],
             ['城东下午三点前，城西五点。',
              'East of town before three, west of town by five.'],
             ['花放在车里不能压，要立着。',
              'They cannot be laid flat in the box — flowers travel standing up.']] },
    // and the ones on the move. Two come inside; two work the pavement.
    { hz:'顾客', place:'mall', mallFloor:1, temper:'brisk',
      look:{ skin:'#e0af84', hair:'#1f1a17', hairStyle:'ponytail', top:'#6d8a7c', pants:'#3a4552',
        shoe:'#ded7c9', bag:'shoulder', bagColor:'#4c4038', tall:.98 },
      patrol:[[17.35, 7.20], [18.45, 8.30], [20.85, 8.25], [20.85, 9.10], [18.45, 8.90],
              [17.35, 10.20], [17.35, 7.20]], speed:.92 },
    { hz:'顾客', place:'mall', mallFloor:1, temper:'bored',
      look:{ skin:'#cfa079', hair:'#37312e', hairStyle:'short', top:'#7189a0', pants:'#3f4650',
        shoe:'#282d31', jacket:'#4a5a63', tall:1.05 },
      patrol:[[16.90, 12.00], [18.55, 9.30], [19.40, 9.40], [19.45, 11.30], [19.40, 9.40],
              [18.55, 8.75], [16.90, 12.00]], speed:.88 },
    { hz:'顾客', place:'mall', mallFloor:1, temper:'genial',
      look:{ skin:'#dbaa83', hair:'#292019', hairStyle:'bun', top:'#c06b58', pants:'#46566a',
        shoe:'#ece6da', bag:'tote', bagColor:'#d4ad55', tall:1.01 },
      patrol:[[16.80, 5.40], [16.80, 8.60], [16.80, 11.90], [16.10, 11.90], [16.10, 5.40],
              [16.80, 5.40]], speed:1.00 },
    { hz:'小孩', place:'mall', mallFloor:1, temper:'eager',
      look:{ skin:'#efc39a', hair:'#2a211d', hairStyle:'tousled', top:'#e2ad3c', pants:'#54739a',
        shoe:'#e55243', tall:.70, wide:.81, youth:1, headScale:1.10, faceSeed:6413 },
      patrol:[[16.55, 6.40], [16.55, 10.60], [15.95, 10.60], [15.95, 6.40], [16.55, 6.40]],
      speed:1.20 },
  );

  // ---------------------------------------------------------------- reported, not corrected
  // The toilet block that used to be built through the middle of this shop has been moved, and it
  // is the one edit this tenant has ever made outside its own file. It was not cosmetic:
  // buildToilets() in js/mall.js stood a 2.60 x 4.20 x 3.35 m tiled box at x 20.1–22.7, z 6.3–10.5
  // on all three decks — inside this unit on deck one and inside the home store on deck two — and
  // sealed x 20.05–23 by z 6.2–10.6 with a collider, so the bank, both stands, the shop's name and
  // the whole aisle were behind a wall you could neither see past nor walk into. The M-flowers
  // camera, standing in the doorway, rendered one flat field of wall tile. The block is now at the
  // south end of the *west* wall, the only 4.2 m run free on all three decks, mirrored so its
  // doors and sign face into the room. Two things it left behind, reported rather than patched:
  //
  //   * the toilets' own label still says 洗手间在电梯旁边 ("next to the lift") and the deck-two
  //     wayfinding pylon at x 9.9, z 12.0 still reads 洗手间 · 电梯. The lift did not move; the
  //     toilets did, and both strings are now pointing at the wrong corner of the building. Left
  //     alone deliberately — they are shared copy, one of them may be in the speech bake, and a
  //     tenant file guessing at the building's wayfinding is how the next clash starts.
  //   * the shader normalises a material by a fixed 0.22 rather than that material's own mean,
  //     so a named material is partly a brightener. Nothing in this file compensates for it: the
  //     materials above are the ones that look right, chosen and left at the house values.
  //
  // And one this shop's own people need: the four lines each member of staff says are new, so
  // they have no entry in .audio-bake/lines.json and will not speak until that is re-baked.
})();
