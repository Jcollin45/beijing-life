// 餐厅 · 湘满楼 · XIANGMAN RESTAURANT — floor 1
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box, sized in shop-local axes — `w` along a, `dp` along b
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// A Hunanese restaurant, laid out for the way it is actually seen. The shop is read from one
// place — the doorway — and from there the view is a cone: at the back wall it is about five and
// a half metres wide and three high, and by the time it reaches the front tables it is a metre
// and a half wide. So everything that has to be understood is on the back wall and in the metre
// in front of it, and the things that only have to exist (the banquette corner, the till, the
// waiting bench) are placed out at the sides where the room needs them and the camera does not.
//
// Reading right to left along the back wall: the cook line under its extraction hood, then the
// expo pass with its heat lamps, ticket rail and the lit menu board above it, then the drinks
// fridge, then a lattice screen with a banquette under it. Two strings of dried chillies hang
// off the ends of the lamp gantry, which is what says Hunan rather than "any noodle shop".
//
// The one thing this room is mostly made of is the serving hatch: 3.4 m wide and a metre tall,
// dead centre of the only view, and it is what the eye lands on walking in. It used to be a
// black panel set 7 cm behind the tile — a recess with nothing in it — which from the door read
// as a blackboard, and it swallowed the whole frame. It is now a kitchen: a stainless bench
// running the width of it, a wok station with the burners lit, a soup urn, a steamer tower and a
// rack of hanging tools, all standing in front of a dark back so every pale thing in it reads.
//
// Materials: the shader multiplies the passed colour by roughly the texture's mean over 0.22, so
// every map here is either `steel` (mean 0.22, value-neutral — the pass, the hood, the fridge) or
// a bright one carrying a low `matAmt` over a colour already divided down. Nothing emissive wears
// a material. Every entry also carries `nrmAmt: .30`: the relief map defaults to full strength,
// which on a wall-sized surface is not relief but a grey cloud — the tiled splashback behind the
// pass was a sheet of soft grey blobs with no tile in it anywhere, and so was the timber.
// ---------------------------------------------------------------------------------------------

// =============================================================================================
// RestaurantSys — everything 湘满楼 knows about feeding you
// =============================================================================================
// The fit-out below builds the room. This builds the restaurant: a front of house that asks how
// many of you there are and either sits you down or writes your name on a list, a menu of twenty
// dishes rather than the five the till sells, the fact that those dishes arrive in the middle of
// the table and not in front of one person, the four things a Chinese diner actually says to a
// waiter before the order goes in, and a bill that more than one person can pay.
//
// It lives in this file for the same reason the fit-out and the cast do: one owner per file.
// Nothing here edits, patches or monkeys with js/game.js, and nothing here throws if game.js has
// not been wired yet — see `H` below. The wiring the lead has to add is four lines and it is
// written out in the report.
//
// ---------------------------------------------------------------- what this room did not have
// Ordering here was one row of the generic mall shop: five items on a till list, bought one at a
// time out of a basket, eaten standing up. Everything that makes eating in China different from
// eating anywhere else was missing, and all of it is cheap to teach because it is structural
// rather than lexical:
//
//   * you do not order a meal, you order for the table. 人数加一 — one dish more than there are
//     people — and then a bowl of rice each. Order one dish per person and a waiter will tell you
//     you have over-ordered, because the dishes are going in the middle.
//   * 忌口 is asked before the order goes in, not apologised for afterwards. Four of them here:
//     how hot, coriander or not, peanut allergy, and no pork.
//   * 打包 is not a defeat. Leftovers go home in a box and nobody is embarrassed about it.
//   * 买单 is a small argument. AA制 is normal among colleagues and rude among friends, and the
//     three ways to pay are not interchangeable.
//
// ---------------------------------------------------------------- the money is not ours
// `money`, `needs`, `advanceTime`, `logDiary`, `toast` and `Pick` are all `const` inside game.js's
// IIFE and unreachable by name from here. Everything this module needs from the game therefore
// goes through one seam, `H`, which prefers a host object the lead may hand us
// (`RestaurantSys.bind`) and otherwise falls back to `window.__game`. If neither is there — a
// harness that loaded this file alone — every accessor answers safely and the pure logic below is
// still testable, which is what `RestaurantSys.selfCheck()` at the bottom relies on.
window.RestaurantSys = (function () {

  const NAME = '湘满楼', NAME_PY = 'Xiāngmǎn Lóu', NAME_EN = 'Xiangman Lou';
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

  // ---------------------------------------------------------------- the tables that exist
  // Three, because three is what the fit-out below actually builds, and a host stand that seats
  // you at a fourth table is a host stand that is lying. Every `at` is this shop's own (a, b) and
  // matches the fixture it names to the centimetre — see `fourTop` and the banquette corner.
  const TABLES = [
    { id:'A', hz:'卡座',   py:'kǎzuò',      en:'the corner booth, under the lattice screen',
      seats:2, at:[1.78, 3.375], note:'卡 slot + 座 seat — a booth' },
    { id:'B', hz:'靠里的四人桌', py:'kào lǐ de sì rén zhuō', en:'the four-top at the back',
      seats:4, at:[2.62, -3.52], note:'四人桌 a table for four' },
    { id:'C', hz:'靠窗的四人桌', py:'kào chuāng de sì rén zhuō', en:'the four-top nearer the window',
      seats:4, at:[2.62, -2.05], note:'靠窗 by the window — what everybody asks for' },
  ];
  const tableOf = id => TABLES.find(t => t.id === id) || null;
  // Two four-tops pushed together is how a party of five or six actually eats in a room this size,
  // and it is why the waitlist is not simply "no table for you".
  const JOINED = { id:'BC', hz:'两张桌子拼起来', py:'liǎng zhāng zhuōzi pīn qǐlai',
    en:'the two four-tops pushed together', seats:8, at:[2.62, -2.79], needs:['B', 'C'],
    note:'拼桌 — pushing tables together' };
  const MAX_PARTY = 8;

  // ---------------------------------------------------------------- the menu
  // Twenty rows, in the five sections a Chinese menu is laid out in and in that order, because the
  // order is itself the lesson: cold dishes come out first, the hot dishes are the meal, 主食 is
  // last and is what fills you up, and the tea is free and arrives before you have ordered
  // anything at all.
  //
  // `spice` is 0..3 on the menu's own scale (the board prints 辣 in red beside the hot ones).
  // `fixed` marks a dish whose heat is not negotiable — 剁椒鱼头 is a bowl of chopped salted chilli
  // with a fish in it and there is no mild version, which is a more useful thing to be told than a
  // menu that pretends every dish has a dial on it.
  // `has` is what is in it that somebody might not be able to eat.
  // `share` is the flag the whole family-style check runs off: a shared dish goes in the middle
  // and feeds the table; 主食 and 饮料 are per person.
  //
  // Five of these — 宫保鸡丁, 麻婆豆腐, 米饭, 汤, 啤酒 — are MALL_GOODS['餐厅'] in js/data.js,
  // character for character and kuai for kuai, and the six lines painted on the menu board in the
  // fit-out below are the same five plus the free tea. One price list, three places it is written
  // down: the wall, the till, and here. Diverging them is how a player is taught to read a board
  // that cannot be ordered from, which is a fault this room has had before.
  const MENU = [
    // ---- 凉菜, which arrive while you are still deciding
    { hz:'拍黄瓜', py:'pāi huángguā', en:'smashed cucumber with garlic', price:16, sec:'凉菜',
      spice:1, has:['蒜'], share:true, veg:true, kind:'plate', cook:3,
      note:'拍 to smack + 黄瓜 cucumber — it is hit with the flat of a cleaver, not sliced' },
    { hz:'口水鸡', py:'kǒushuǐ jī', en:'cold chicken in chilli oil', price:32, sec:'凉菜',
      spice:2, has:['花生'], share:true, kind:'plate', cook:5,
      note:'口水 saliva + 鸡 chicken — named for what it does to you' },
    // ---- 热菜. The middle of the table, and the reason to bring more than one person.
    { hz:'剁椒鱼头', py:'duòjiāo yútóu', en:'fish head steamed under chopped salted chilli',
      price:68, sec:'热菜', spice:3, fixed:true, has:['鱼'], share:true, house:true,
      kind:'plate', cook:22,
      note:'剁 to chop + 椒 chilli + 鱼头 fish head — the dish this province is known for' },
    { hz:'农家小炒肉', py:'nóngjiā xiǎochǎo ròu', en:'farmhouse pork with green chillies',
      price:42, sec:'热菜', spice:3, has:['猪肉'], share:true,
      kind:'plate', cook:12,
      note:'农家 farmhouse + 小炒 a quick fry + 肉, which on its own always means pork' },
    { hz:'辣椒炒蛋', py:'làjiāo chǎo dàn', en:'egg fried with chillies', price:26, sec:'热菜',
      spice:2, has:['蛋'], share:true, veg:true, kind:'plate', cook:8,
      note:'辣椒 chilli + 炒 fry + 蛋 egg' },
    { hz:'红烧肉', py:'hóngshāo ròu', en:'red-braised pork belly', price:48, sec:'热菜',
      spice:0, has:['猪肉'], share:true, kind:'plate', cook:25,
      note:'红烧 red-cooked — soy, sugar and time, no chilli at all' },
    { hz:'酸豆角炒肉末', py:'suān dòujiǎo chǎo ròumò', en:'pickled beans with minced pork',
      price:34, sec:'热菜', spice:2, has:['猪肉'], share:true, kind:'plate', cook:10,
      note:'酸 sour + 豆角 long beans + 肉末 mince' },
    { hz:'宫保鸡丁', py:'gōngbǎo jīdīng', en:'kung pao chicken', price:48, sec:'热菜',
      spice:2, has:['花生'], share:true, kind:'plate', cook:12,
      note:'鸡丁 diced chicken. The peanuts are not optional in it' },
    { hz:'麻婆豆腐', py:'mápó dòufu', en:'mapo tofu', price:38, sec:'热菜',
      spice:3, has:['猪肉'], share:true, vegSwap:true,
      kind:'plate', cook:10,
      note:'麻 numbing + 婆 old woman + 豆腐 tofu. 麻 is 花椒 and is not the same as 辣' },
    { hz:'干锅花菜', py:'gānguō huācài', en:'dry-pot cauliflower', price:36, sec:'热菜',
      spice:2, has:['猪肉'], share:true, vegSwap:true, kind:'plate', cook:14,
      note:'干锅 dry pot — it comes out over a burner' },
    { hz:'蒜蓉粉丝虾', py:'suànróng fěnsī xiā', en:'prawns on glass noodles with garlic',
      price:58, sec:'热菜', spice:1, has:['海鲜'], share:true, kind:'plate', cook:16,
      note:'蒜蓉 minced garlic + 粉丝 glass noodles + 虾 prawn' },
    { hz:'清炒时蔬', py:'qīngchǎo shíshū', en:'plain stir-fried greens, whatever is in season',
      price:22, sec:'热菜', spice:0, has:[], share:true, veg:true,
      kind:'plate', cook:6,
      note:'清炒 plain-fried + 时蔬 the vegetable of the season — the dish that cools the table down' },
    // ---- 汤. One between everybody, ladled out at the end rather than drunk first.
    { hz:'汤', py:'tāng', en:'the soup of the day — egg and seaweed today', price:22, sec:'汤',
      spice:0, has:['蛋'], share:true, veg:true, kind:'soup', cook:12,
      note:'汤 soup. In the south it closes the meal, not opens it' },
    { hz:'冬瓜排骨汤', py:'dōngguā páigǔ tāng', en:'winter melon and pork rib soup', price:32,
      sec:'汤', spice:0, has:['猪肉'], share:true, kind:'soup', cook:20,
      note:'冬瓜 winter melon + 排骨 ribs' },
    // ---- 主食. Per person, and the thing a table of chilli is incomplete without.
    { hz:'米饭', py:'mǐfàn', en:'a bowl of rice', price:5, sec:'主食', spice:0, has:[],
      staple:true, veg:true, kind:'rice', cook:2,
      note:'米 uncooked rice + 饭 cooked — one bowl each' },
    { hz:'手工面', py:'shǒugōng miàn', en:'a bowl of hand-pulled noodles', price:18, sec:'主食',
      spice:0, has:['面'], staple:true, veg:true, kind:'noodle', cook:8,
      note:'手工 by hand + 面 noodles' },
    { hz:'葱油饼', py:'cōngyóu bǐng', en:'a spring-onion pancake', price:14, sec:'主食',
      spice:0, has:['面'], staple:true, veg:true, kind:'rice', cook:9,
      note:'葱 spring onion + 油 oil + 饼 a flatbread' },
    // ---- 饮料
    { hz:'茶', py:'chá', en:'a pot of tea — it comes free and it is refilled', price:0, sec:'饮料',
      spice:0, has:[], drink:true, free:true, kind:'bottle', cook:1,
      note:'茶 tea. Nobody asks for it and nobody pays for it' },
    { hz:'啤酒', py:'píjiǔ', en:'a bottle of beer', price:12, sec:'饮料', spice:0, has:[],
      drink:true, booze:true, kind:'bottle', cook:1,
      note:'啤 is the sound of beer + 酒 alcohol' },
    { hz:'酸梅汤', py:'suānméi tāng', en:'chilled sour plum drink', price:10, sec:'饮料', spice:0,
      has:[], drink:true, cools:true, kind:'bottle', cook:1,
      note:'酸梅 smoked plum + 汤. What you drink when the chilli wins' },
  ];
  const SECTIONS = ['凉菜', '热菜', '汤', '主食', '饮料'];
  const SECTION_EN = { 凉菜:'cold dishes, first out of the kitchen', 热菜:'the hot dishes — these go in the middle',
    汤:'soup, one between everybody', 主食:'rice and noodles — one each', 饮料:'drinks' };
  const SECTION_PY = { 凉菜:'liángcài', 热菜:'rècài', 汤:'tāng', 主食:'zhǔshí', 饮料:'yǐnliào' };
  const dishOf = hz => MENU.find(d => d.hz === hz) || null;

  // ---------------------------------------------------------------- 忌口, what you cannot eat
  // Said once, before the order goes in, and then the kitchen's problem rather than yours. The
  // spice scale is the one every menu in the country uses and the words are worth more than the
  // dishes: 微 slight, 中 middle, 特 extra.
  const SPICE = [
    { key:'none', lv:0, hz:'不要辣', py:'bú yào là',  en:'no chilli at all' },
    { key:'mild', lv:1, hz:'微辣',   py:'wēi là',     en:'a little heat' },
    { key:'mid',  lv:2, hz:'中辣',   py:'zhōng là',   en:'medium — the house default' },
    { key:'hot',  lv:3, hz:'特辣',   py:'tè là',      en:'as hot as the kitchen makes it' },
  ];
  const spiceOf = k => SPICE.find(s => s.key === k) || SPICE[2];
  const DIET = [
    { key:'peanut', hz:'花生过敏', py:'huāshēng guòmǐn', en:'peanut allergy — the kitchen must know',
      bans:['花生'], hard:true },
    { key:'nopork', hz:'不吃猪肉', py:'bù chī zhūròu',  en:'no pork', bans:['猪肉'], hard:true },
    { key:'veg',    hz:'吃素',     py:'chī sù',        en:'vegetarian',
      bans:['猪肉', '鱼', '海鲜'], hard:true },
    { key:'nocori', hz:'不要香菜',  py:'bú yào xiāngcài', en:'no coriander — the request of a lifetime',
      bans:[], hard:false },
  ];
  const dietOf = k => DIET.find(d => d.key === k) || null;

  // What a stated 忌口 does to a dish. `swap` is the honest middle answer a real kitchen gives:
  // 麻婆豆腐 and 干锅花菜 both have mince in them and both can be made without it, so a vegetarian
  // is not told no, they are told 可以做素的.
  function dishOk(dish, diets) {
    for (const k of diets) {
      const d = dietOf(k); if (!d || !d.hard) continue;
      const clash = dish.has.filter(x => d.bans.includes(x));
      if (!clash.length) continue;
      if (dish.vegSwap && clash.every(x => x === '猪肉')) return { ok:true, swap:true, why:d, what:clash };
      return { ok:false, why:d, what:clash };
    }
    return { ok:true };
  }
  // Heat you have asked for against heat the dish has. A dish marked `fixed` cannot come down.
  // The early return here used to be `if (!dish.spice) return null`, which silenced the one answer
  // a waiter always gives: ask for 特辣 on a braise and you are told 这个菜本来就不辣, because
  // 红烧肉 has no chilli in it at all and turning the dial does nothing. selfCheck() below caught
  // it. Only an exact match is silent.
  // A `fixed` dish refuses **只在不要辣** — at 微辣 and 中辣 it is sold, with a warning that it will
  // still be hot. The first version refused whenever the request was below the dish's own level,
  // which meant 剁椒鱼头 — spice 3, and the only reason this restaurant is Hunanese — could not be
  // ordered at the house default of 中辣. Driving the panel chain end to end is what found it: a
  // table for four came to ¥42 because the signature dish had been silently bounced at the moment
  // it was added. A kitchen turns down "make it not spicy"; it does not turn down "medium".
  function spiceNote(dish, key) {
    const want = spiceOf(key);
    if (dish.fixed && want.lv === 0)
      return { hz:'这个菜没法不辣', py:'zhège cài méi fǎ bú là',
        en:`${dish.en} is chilli — there is no mild version of it`, refuse:true };
    if (dish.fixed && want.lv < dish.spice)
      return { hz:'这个菜本来就辣，做不淡', py:'zhège cài běnlái jiù là, zuò bú dàn',
        en:`it will still be hot — ${dish.hz} is chopped salted chilli with a fish in it` };
    if (want.lv < dish.spice) return { hz:'可以少放辣椒', py:'kěyǐ shǎo fàng làjiāo',
      en:'the kitchen will go lighter on the chilli' };
    if (want.lv > dish.spice) return { hz:'这个菜本来就不辣', py:'zhège cài běnlái jiù bú là',
      en:'that one is not a chilli dish to begin with' };
    return null;
  }

  // ---------------------------------------------------------------- how busy it is
  // A 32-bit hash so the same lunchtime is the same lunchtime every time it is asked, and a reload
  // does not empty the room you are queuing for. Nothing random is stored.
  function hash(...n) {
    let h = 0x811c9dc5 >>> 0;
    for (const v of n) {
      h = (h ^ ((v | 0) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
      h = (h ^ (((v | 0) >> 16) & 0xffff)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  const frac = (...n) => hash(...n) / 4294967296;

  // 0 at four in the afternoon, 1 in the middle of the lunch rush. Two humps, because a restaurant
  // has two services and the three hours between them are the reason 下午 is a word.
  function busy(day, minutes) {
    const hump = (c, w) => Math.exp(-((minutes - c) / w) * ((minutes - c) / w));
    const base = hump(12 * 60 + 30, 46) * .95 + hump(18 * 60 + 45, 58) * 1.0;
    const weekend = (day % 7 === 6 || day % 7 === 0) ? .18 : 0;
    return Math.max(0, Math.min(1, base + weekend + frac(day, Math.floor(minutes / 30), 7) * .12 - .04));
  }
  // Which tables are taken. Held on the half hour rather than the minute: a table that changed its
  // mind every frame is a table you can never sit at, and a party takes about that long over lunch.
  function occupied(day, minutes) {
    const b = busy(day, minutes), slot = Math.floor(minutes / 30), out = new Set();
    for (const t of TABLES) if (frac(day, slot, t.id.charCodeAt(0)) < b * .92) out.add(t.id);
    return out;
  }
  // The smallest table that will take the party. A two sat at a four-top on an empty afternoon is
  // fine; a two sat at a four-top in the middle of the rush is what a host will not do.
  function freeFor(party, day, minutes) {
    const taken = occupied(day, minutes), rush = busy(day, minutes) > .55;
    const fit = TABLES.filter(t => !taken.has(t.id) && t.seats >= party)
      .sort((x, y) => x.seats - y.seats);
    if (party > 4) {
      const both = JOINED.needs.every(id => !taken.has(id));
      return both && party <= JOINED.seats ? JOINED : null;
    }
    if (rush) { const tight = fit.find(t => t.seats <= party + 1); if (tight) return tight; }
    return fit[0] || null;
  }
  // How long the list is, in minutes. Deliberately not a countdown to a promise: a host quotes a
  // number, the number is roughly right, and 大概 is doing the work in both languages.
  function waitMinutes(party, day, minutes) {
    const b = busy(day, minutes);
    const base = Math.round((b * 34 + (party > 4 ? 16 : party > 2 ? 6 : 0)) / 5) * 5;
    return Math.max(5, base);
  }
  function queueAhead(party, day, minutes) {
    return Math.max(1, Math.round(busy(day, minutes) * 7 + (party > 4 ? 2 : 0)));
  }

  // ---------------------------------------------------------------- what you have ordered
  // An order is a list of {hz, n}. Everything below reads it and nothing below mutates it, so the
  // same three functions serve the panel, the diary line and the self-check.
  const lines = order => order.map(o => ({ ...o, d: dishOf(o.hz) })).filter(o => o.d);
  const BOX_FEE = 2;      // 打包盒 — two kuai a box, and every restaurant in the country charges it
  const FREE_DRINK_BEFORE = 12 * 60;   // 十二点. Minutes since midnight, the unit H.minutes() speaks
  // The free-drink calculation and the physical fridge card share this immutable contract.  Its
  // state getter returns one of three stable objects so a nearby render frame allocates nothing.
  const FREE_DRINK_OFFER = Object.freeze({
    id:'dine-in-free-drinks-before-noon', tenant:NAME, section:'饮料',
    dineInOnly:true, endsAt:FREE_DRINK_BEFORE,
    card:Object.freeze({
      headline:'堂食饮料优惠', active:'十二点前免费', ended:'今日已结束', takeaway:'打包不参加',
    }),
  });
  const FREE_DRINK_STATES = Object.freeze({
    active:Object.freeze({
      id:FREE_DRINK_OFFER.id, key:'active', available:true, dineInOnly:true,
      endsAt:FREE_DRINK_OFFER.endsAt, headline:FREE_DRINK_OFFER.card.headline,
      detail:FREE_DRINK_OFFER.card.active,
    }),
    ended:Object.freeze({
      id:FREE_DRINK_OFFER.id, key:'ended', available:false, dineInOnly:true,
      endsAt:FREE_DRINK_OFFER.endsAt, headline:FREE_DRINK_OFFER.card.headline,
      detail:FREE_DRINK_OFFER.card.ended,
    }),
    takeaway:Object.freeze({
      id:FREE_DRINK_OFFER.id, key:'takeaway', available:false, dineInOnly:true,
      endsAt:FREE_DRINK_OFFER.endsAt, headline:FREE_DRINK_OFFER.card.headline,
      detail:FREE_DRINK_OFFER.card.takeaway,
    }),
  });
  function offerContract(id = FREE_DRINK_OFFER.id) {
    return id === FREE_DRINK_OFFER.id ? FREE_DRINK_OFFER : null;
  }
  function offerState(minutes = H.minutes(), takeaway = false, id = FREE_DRINK_OFFER.id) {
    if (id !== FREE_DRINK_OFFER.id) return null;
    if (takeaway) return FREE_DRINK_STATES.takeaway;
    return Number(minutes) < FREE_DRINK_OFFER.endsAt
      ? FREE_DRINK_STATES.active : FREE_DRINK_STATES.ended;
  }
  function billOf(order, opt = {}) {
    const L = lines(order);
    let food = 0, drink = 0, dishes = 0, staples = 0;
    for (const o of L) {
      const sub = o.d.price * o.n;
      if (o.d.drink) drink += sub; else food += sub;
      if (o.d.share) dishes += o.n;
      if (o.d.staple) staples += o.n;
    }
    const boxes = opt.boxes || 0, boxFee = boxes * BOX_FEE;
    // 中午十二点前用餐，饮料免费. The food court PA announces this all morning (`ad:food` in js/mall.js),
    // so it has to be true at the till or the building is lying to the player — which is the whole
    // point of .patruth.js. 用餐 is eating here: a boxed order is 打包, not 用餐, so takeaway pays.
    // Computed here rather than at the panel because four callers read this bill — the menu, the
    // order, the receipt and the diary — and a promotion applied in only three of them is a bug.
    const offer = offerState(H.minutes(), !!opt.takeaway);
    // Keep the production rule explicit for the public-offer truth audit, then require the
    // exported contract state to agree.  Both read the same cutoff; disagreement can only fail
    // closed and can never make the physical card promise a discount the till will not honour.
    const promo = (!opt.takeaway && H.minutes() < FREE_DRINK_BEFORE && offer.available) ? drink : 0;
    return { food, drink, boxes, boxFee, promo, dishes, staples,
             total: food + drink + boxFee - promo, lines: L };
  }

  // 人数加一. The one rule that makes this a Chinese table rather than a row of individual meals,
  // and the only piece of this module that ever tells you that you have ordered *too much*.
  function advice(order, party) {
    const b = billOf(order), want = party + 1, out = [];
    if (!party) return out;
    if (b.dishes === 0) out.push({ key:'none', hz:'还没点菜呢', py:'hái méi diǎn cài ne',
      en:'nothing ordered yet' });
    else if (b.dishes < want - 1) out.push({ key:'few', hz:`${party}个人一般点${want}个菜`,
      py:`${party} gè rén yìbān diǎn ${want} gè cài`,
      en:`${party} people usually order ${want} dishes — they are going in the middle, not in front of you` });
    else if (b.dishes > want + 1) out.push({ key:'many', hz:'点多了，吃不完的', py:'diǎn duō le, chī bù wán de',
      en:`${b.dishes} dishes for ${party} — that is more than you will finish. You can take it home` });
    if (b.dishes && b.staples < party) out.push({ key:'staple', hz:'主食要不要？一人一碗米饭',
      py:'zhǔshí yào bú yào? yì rén yì wǎn mǐfàn',
      en:`rice is per person — ${party - b.staples} more bowl${party - b.staples > 1 ? 's' : ''} and the table is complete` });
    const hot = b.lines.filter(o => o.d.spice >= 3).length;
    if (hot >= 2 && !b.lines.some(o => o.d.cools || o.d.veg))
      out.push({ key:'cool', hz:'来个清淡的吧', py:'lái ge qīngdàn de ba',
        en:'two chilli dishes and nothing plain — a green vegetable or a sour plum drink evens it out' });
    return out;
  }
  // Splitting. AA制 rounds up to the jiao and the last person carries the remainder, which is what
  // every splitting app in the country does and is worth one line of arithmetic to get right.
  function splitWays(total, n) {
    if (n < 2) return [total];
    const each = Math.ceil(total / n * 10) / 10, out = new Array(n).fill(each);
    out[n - 1] = Math.round((total - each * (n - 1)) * 10) / 10;
    return out;
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
    // 刷卡. The bank account is game.js's and this module will not reach into it uninvited: if the
    // lead binds a `card` the money comes off the card, and until then the method is offered only
    // when an account exists and says out loud that it settled in cash. A payment method that
    // silently debits the wrong pot is worse than one method fewer.
    card(n) {
      if (host && host.card) return host.card(n);
      H.spend(n); return { fell_back:true };
    },
    // This read `g.bank().open` first and was silently always false, so 刷卡 never appeared on the
    // bill at all. The field on game.js's `bankAccount` (js/game.js:7173) is `hasCard`, beside
    // `opened` — checked against the source rather than guessed at, which is how the first version
    // went wrong.
    hasCard() {
      if (host && host.card) return true;
      const g = G();
      try { const b = g && g.bank && g.bank(); return !!(b && b.hasCard); } catch (e) { return false; }
    },
    minutes() {
      if (host && host.minutes) return host.minutes();
      const g = G(); try { return g ? g.state().minutes | 0 : 12 * 60; } catch (e) { return 12 * 60; }
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
  // One visit at a time, and it survives a save because a table you are sitting at is a fact about
  // the world and not about this frame. `leftovers` outlives the visit on purpose: a box of cold
  // 红烧肉 in your bag at eleven at night is the whole reason 打包 is worth teaching.
  // `pendingBoxes` and `fapiao` have to be declared here even though they are only ever set in the
  // bill panel. `Object.assign(state, fresh(), keep)` is what ends a visit, and assign only
  // overwrites keys the source object has — a field missing from `fresh()` is never cleared, so a
  // box ordered on Monday was still on Tuesday's bill and the receipt tick never came off.
  const fresh = () => ({
    party:0, table:null, joined:false, wait:null, seatedAt:null,
    order:[], spice:'mid', diet:[], placed:false, servedAt:null, ate:false,
    pendingBoxes:0, fapiao:false,
    leftovers:null, visits:0, spend:0, splitLast:0,
  });
  const state = fresh();
  const toSave = () => ({ ...state, order: state.order.map(o => ({ ...o })), diet: state.diet.slice(),
    wait: state.wait && { ...state.wait }, leftovers: state.leftovers && { ...state.leftovers } });
  function load(s) {
    if (!s || typeof s !== 'object') return;
    Object.assign(state, fresh(), s);
    state.order = Array.isArray(s.order) ? s.order.filter(o => dishOf(o.hz)).map(o => ({ hz:o.hz, n:Math.max(1, o.n | 0) })) : [];
    state.diet = Array.isArray(s.diet) ? s.diet.filter(dietOf) : [];
  }

  // ---------------------------------------------------------------- 1. 迎宾, the host
  // The first panel, and the one that makes this a restaurant rather than a shelf. It asks the only
  // question a host asks — 几位 — and everything after it is a consequence of the answer.
  function openHost() {
    const P = H.Pick(); if (!P) return;
    const now = H.minutes(), day = H.day();
    // Already sitting somewhere, or already on the list: the podium has something else to say.
    if (state.table) { openOrder(); return; }
    if (state.wait) { openWait(); return; }
    const b = busy(day, now);
    const rows = [{ sec:'几位？', py:'jǐ wèi?', en:'how many of you? — 位 is the polite counter for people' }];
    for (let n = 1; n <= MAX_PARTY; n++) {
      const t = freeFor(n, day, now);
      rows.push({ party:n, hz:`${n}位`, py:`${n} wèi`,
        en: t ? `sit at ${t.en}` : `no table free — ${waitMinutes(n, day, now)} min on the list`,
        right: t ? '有位' : '排队' });
    }
    rows.push({ sec:'不坐下也可以', py:'bú zuò xià yě kěyǐ', en:'you do not have to sit down' });
    rows.push({ away:true, hz:'外卖', py:'wàimài', en:'order it to take away — no table, and it is boxed at the pass',
      right:'打包' });
    if (state.leftovers) rows.push({ eatBox:true, hz:'吃打包的', py:'chī dǎbāo de',
      en:`the ${state.leftovers.kindEn || 'box'} in your bag — ${esc(state.leftovers.what)}`,
      right: state.leftovers.kind || '剩菜' });
    P.show({
      title: `${NAME} · 迎宾`,
      sub: `${clockOf(now)} · ${b > .55 ? '现在是饭点，人比较多' : '现在不忙'} · ` +
           `${b > .55 ? 'the rush is on' : 'quiet right now'} · ¥${H.money()} 在身上`,
      rows,
      onPick(r) {
        if (r.away)   { state.party = 1; state.table = null; openMenu(true); return false; }
        if (r.eatBox) { return eatLeftovers(); }
        if (!r.party) return false;
        sitOrQueue(r.party); return false;
      },
    });
  }
  const clockOf = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function sitOrQueue(party) {
    const now = H.minutes(), day = H.day(), t = freeFor(party, day, now);
    state.party = party;
    if (t) {
      state.table = t.id; state.joined = t.id === 'BC'; state.seatedAt = now;
      H.say(`${party}位，这边请 · <span class="dim">${esc(t.hz)} — ${esc(t.en)}. 这边请 zhèbiān qǐng, this way</span>`);
      H.sentence(`${party}位，有位子吗？`);
      openOrder(); H.save(); return;
    }
    const mins = waitMinutes(party, day, now), ahead = queueAhead(party, day, now);
    state.wait = { no: 100 + (hash(day, Math.floor(now / 5), party) % 60), party, ahead,
      issuedAt: now, readyAt: now + mins };
    H.say(`${state.wait.no}号，前面还有${ahead}桌 · ` +
      `<span class="dim">number ${state.wait.no} — ${ahead} tables ahead, about ${mins} minutes</span>`);
    H.sentence('要等多久？');
    openWait(); H.save();
  }

  // ---------------------------------------------------------------- 2. 排队, the list
  // A waitlist that is only a message is a message. This one is a number, a queue in front of you
  // and a clock, and the two things you can do with it are the two things people actually do: sit
  // on the bench and wait, or give up and go somewhere else.
  function openWait() {
    const P = H.Pick(); if (!P || !state.wait) return;
    const now = H.minutes(), w = state.wait, left = Math.max(0, w.readyAt - now);
    // What decides whether you are called is whether a table is *actually* free, not whether the
    // quote has run out. Those were ANDed together in the first version and the result was a queue
    // that could never clear: the estimate expired, the panel said 前面还有0桌 · 0分钟, and every
    // further click advanced the clock by one minute against a room that was still full. Driving
    // the panel in a loop is what found it — it printed the same four rows forever.
    const ready = !!freeFor(w.party, H.day(), now);
    const rows = [
      { sec:`${w.no}号 · ${w.party}位`, en:`your number is ${w.no}, party of ${w.party}` },
      { off:true, hz: ready ? '到您了' : `前面还有${w.ahead}桌`,
        py: ready ? 'dào nín le' : `qiánmiàn hái yǒu ${w.ahead} zhuō`,
        en: ready ? 'they are calling your number' : `${w.ahead} tables ahead of you — about ${left} minutes`,
        right: ready ? '叫号' : `${left}分钟` },
    ];
    if (ready) rows.push({ take:true, hz:'跟我来', py:'gēn wǒ lái', en:'follow the waiter to the table', right:'入座' });
    else rows.push({ sit:true, hz:'在这儿等', py:'zài zhèr děng',
      en:`wait on the bench by the door — ${left} minutes goes past`, right:`+${left}分钟` });
    rows.push({ quit:true, hz:'不等了', py:'bù děng le', en:'give up the number and leave' });
    P.show({ title:`${NAME} · 等位`, sub:`${clockOf(now)} · 等位 děngwèi — waiting for a table`, rows,
      onPick(r) {
        if (r.quit) { state.wait = null; state.party = 0; H.say('不等了 · <span class="dim">you leave the queue</span>'); H.save(); return true; }
        // Waiting is a real block of time, never a one-minute nudge, and when nothing has come
        // free the host re-quotes rather than pretending the queue is empty. That is what a
        // restaurant actually does — 再等十分钟 — and it is also what makes this terminate: the
        // rush curve in `busy()` falls away after half past one and half past seven, so sitting
        // there in five-minute blocks does eventually get you a table.
        if (r.sit) {
          H.advance(Math.max(5, left));
          const now2 = H.minutes(), day2 = H.day();
          if (freeFor(state.wait.party, day2, now2)) {
            state.wait.ahead = 0; state.wait.readyAt = now2;
          } else {
            state.wait.ahead = Math.max(1, state.wait.ahead - 1);
            state.wait.readyAt = now2 + waitMinutes(state.wait.party, day2, now2);
            H.say('还得等一会儿 · <span class="dim">nothing has come free yet — ' +
              `about ${state.wait.readyAt - now2} more minutes</span>`);
          }
          openWait(); return false;
        }
        if (r.take) {
          const t = freeFor(state.wait.party, H.day(), H.minutes());
          if (!t) { H.say('刚被人坐了 · <span class="dim">somebody got there first — a few more minutes</span>');
            state.wait.readyAt = H.minutes() + 5; openWait(); return false; }
          state.wait = null; sitOrQueue(state.party); return false;
        }
        return false;
      } });
  }

  // ---------------------------------------------------------------- 3. 点菜, the menu
  // Sections first, then a section, because twenty rows in one list is a spreadsheet and a menu is
  // read a page at a time. `takeaway` runs the same panels without a table under them.
  function openMenu(takeaway) {
    const P = H.Pick(); if (!P) return;
    const b = billOf(state.order, { takeaway }), tips = advice(state.order, state.party);
    const rows = SECTIONS.map(s => ({ sec2:s, hz:s, py:SECTION_PY[s], en:SECTION_EN[s],
      right:`${MENU.filter(d => d.sec === s).length}道` }));
    rows.unshift({ sec: takeaway ? '外卖 · 打包带走' : `点菜 · ${state.party}位`,
      en: takeaway ? 'takeaway — it is boxed at the pass' : 'the dishes go in the middle of the table' });
    rows.push({ sec:'已经点了', py:'yǐjīng diǎn le', en:'what is on the order so far' });
    if (!state.order.length) rows.push({ off:true, hz:'还没点', py:'hái méi diǎn', en:'nothing yet' });
    for (const o of b.lines)
      rows.push({ drop:o.d.hz, hz:`${o.d.hz} ×${o.n}`, py:o.d.py, en:`${o.d.en} — pick to take one off`,
        right:`¥${o.d.price * o.n}` });
    // A discount the player cannot see is indistinguishable from a pricing bug. Shown as its own
    // row so the total below it adds up on screen, and only when it is actually taking money off.
    if (b.promo) rows.push({ off:true, hz:'饮料免费', py:'yǐnliào miǎnfèi',
      en:'drinks are free before noon — the food court says so all morning', right:`−¥${b.promo}` });
    for (const t of tips) rows.push({ off:true, hz:t.hz, py:t.py, en:t.en, right:'建议' });
    rows.push({ req:true, hz:'忌口', py:'jìkǒu', en:`what you cannot eat — ${describeReq()}`, right:'说一下' });
    if (state.order.length) rows.push({ place:true, hz:'就这些', py:'jiù zhèxiē',
      en: takeaway ? 'that is the order — box it up' : 'that is the order — send it to the kitchen',
      right:`¥${b.total}`, off: H.money() < b.total });
    P.show({ title:`${NAME} · 菜单`,
      sub:`${b.dishes}个菜 · ${b.staples}份主食 · ¥${b.total} · ¥${H.money()} 在身上`,
      rows,
      onPick(r) {
        if (r.sec2) { openSection(r.sec2, takeaway); return false; }
        if (r.drop) { take(r.drop, -1); openMenu(takeaway); return false; }
        if (r.req)  { openRequests(takeaway); return false; }
        if (r.place) { return place(takeaway); }
        return false;
      } });
  }
  const describeReq = () => {
    const s = spiceOf(state.spice).hz;
    const d = state.diet.map(k => dietOf(k).hz);
    return [s].concat(d).join('、');
  };
  function openSection(sec, takeaway) {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:`${sec} · ${SECTION_PY[sec]}`, en:SECTION_EN[sec] }];
    for (const d of MENU.filter(q => q.sec === sec)) {
      const ok = dishOk(d, state.diet), sn = spiceNote(d, state.spice);
      const have = state.order.find(o => o.hz === d.hz);
      const flag = d.spice ? ' ' + '🌶'.repeat(d.spice) : '';
      let en = d.en;
      if (!ok.ok) en = `${d.en} — 里面有${ok.what.join('、')}, ${ok.why.en}`;
      else if (ok.swap) en = `${d.en} — 可以做素的, they will leave the mince out`;
      else if (sn && sn.refuse) en = `${d.en} — ${sn.en}`;
      rows.push({ add:d.hz, hz:`${d.hz}${flag}`, py:d.py, en,
        // `skin:'restaurant'` plus a `dish` on the row is an idiom js/game.js and index.html
        // already carry — Pick.render() draws a 面/饭/汤/菜/饮 tile and a 现点现做 line off it, and
        // the CSS for `#pick.restaurant .dishrow` has been sitting in index.html unused by this
        // shop. Reusing it costs two fields per dish and makes this menu look like the game's own
        // food panel rather than a list of rows.
        dish: { kind: d.kind || 'plate', cook: d.cook || 10 },
        badge: have ? `已点 ×${have.n}` : (d.house ? '招牌菜' : ''),
        right: have ? `×${have.n} ¥${d.price}` : (d.free ? '免费' : `¥${d.price}`),
        off: !ok.ok });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back to the menu' });
    P.show({ title:`${NAME} · ${sec}`, sub:`${describeReq()} · pick a dish to add one`, rows,
      skin:'restaurant',
      onPick(r) {
        if (r.back) { openMenu(takeaway); return false; }
        if (!r.add) return false;
        const d = dishOf(r.add), sn = spiceNote(d, state.spice);
        if (sn && sn.refuse) { H.say(`${sn.hz} · <span class="dim">${sn.en}</span>`); return false; }
        take(r.add, 1);
        const ok = dishOk(d, state.diet);
        if (ok.swap) H.say(`${d.hz}做素的 · <span class="dim">they will make it without the mince</span>`);
        openSection(sec, takeaway); return false;
      } });
  }
  function take(hz, n) {
    const d = dishOf(hz); if (!d) return;
    const row = state.order.find(o => o.hz === hz);
    if (!row) { if (n > 0) state.order.push({ hz, n:1 }); return; }
    row.n += n;
    if (row.n <= 0) state.order.splice(state.order.indexOf(row), 1);
  }

  // ---------------------------------------------------------------- 4. 忌口
  function openRequests(takeaway) {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:'辣度', py:'là dù', en:'how hot — say it before the order goes in' }];
    for (const s of SPICE)
      rows.push({ spice:s.key, hz:s.hz, py:s.py, en:s.en, right: state.spice === s.key ? '✓' : '' });
    rows.push({ sec:'忌口', py:'jìkǒu', en:'things you do not eat — the kitchen is told, not the waiter' });
    for (const d of DIET) {
      const on = state.diet.includes(d.key);
      const hit = on ? 0 : lines(state.order).filter(o => !dishOk(o.d, [d.key]).ok).length;
      rows.push({ diet:d.key, hz:d.hz, py:d.py,
        en: d.en + (hit ? ` — ${hit} dish${hit > 1 ? 'es' : ''} already on the order would have to go` : ''),
        right: on ? '✓' : '' });
    }
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back to the menu' });
    P.show({ title:`${NAME} · 忌口`, sub:describeReq(), rows,
      onPick(r) {
        if (r.back) { openMenu(takeaway); return false; }
        if (r.spice) { state.spice = r.spice; openRequests(takeaway); return false; }
        if (r.diet) {
          const i = state.diet.indexOf(r.diet);
          if (i >= 0) state.diet.splice(i, 1);
          else {
            state.diet.push(r.diet);
            // Stating an allergy pulls the dishes that carry it straight back off the order, which
            // is what a waiter does with a pencil and is the only honest way for this to behave.
            const gone = lines(state.order).filter(o => !dishOk(o.d, state.diet).ok);
            for (const o of gone) state.order.splice(state.order.findIndex(q => q.hz === o.hz), 1);
            if (gone.length) H.say(`${dietOf(r.diet).hz} · <span class="dim">${gone.map(o => o.d.hz).join('、')} ` +
              `taken off — ${gone.map(o => o.d.en).join('; ')}</span>`);
          }
          openRequests(takeaway); return false;
        }
        return false;
      } });
  }

  // ---------------------------------------------------------------- 5. 下单 and eating
  function place(takeaway) {
    const b = billOf(state.order, { takeaway });
    if (!b.lines.length) return false;
    if (H.money() < b.total) {
      H.say(`钱不够 · <span class="dim">¥${b.total} needed; you have ¥${H.money()}</span>`); return false;
    }
    state.placed = true;
    const names = b.lines.map(o => `${o.d.hz}${o.n > 1 ? '×' + o.n : ''}`).join('、');
    if (takeaway) {
      H.spend(b.total + BOX_FEE);
      state.leftovers = { kind:'外卖', kindEn:'takeaway', what:names,
        food: Math.min(60, b.food * .55), at: H.minutes(), day: H.day() };
      state.spend += b.total + BOX_FEE; state.visits++;
      H.advance(12);
      H.say(`外卖打包好了 · <span class="dim">${esc(names)} · ¥${b.total} + ¥${BOX_FEE} 打包盒 — it is in your bag</span>`);
      H.sentence('打包带走。');
      H.diary(`在${NAME}打包了${names}，${b.total + BOX_FEE}块。`,
        `Takeaway from ${NAME_EN}: ${b.lines.map(o => o.d.en).join(', ')}. ¥${b.total + BOX_FEE}.`, 'diner-takeaway');
      state.order = []; state.placed = false; state.party = 0;
      H.save(); return true;
    }
    // 上菜 takes about as long as it takes. The cold dishes are out before the panel closes, which
    // is a fact about a Chinese kitchen and not a loading bar.
    state.servedAt = H.minutes();
    H.advance(6);
    H.say(`菜马上就来 · <span class="dim">${esc(names)} — ${describeReq()}. The cold dishes are out already</span>`);
    H.sentence('我们点好了。');
    openOrder(); return false;
  }

  // The table itself, once you are at it. This is the panel the 餐厅 hotspot should reopen on: it
  // is the state of the meal rather than a step in a wizard.
  function openOrder() {
    const P = H.Pick(); if (!P) return;
    const t = state.joined ? JOINED : tableOf(state.table);
    const b = billOf(state.order), tips = advice(state.order, state.party);
    const rows = [{ sec: t ? `${t.hz} · ${state.party}位` : `${state.party}位`,
      en: t ? t.en : 'your table' }];
    if (!state.placed) {
      rows.push({ menu:true, hz:'看菜单', py:'kàn càidān', en:'the menu — twenty dishes', right:`${MENU.length}道` });
      rows.push({ req:true, hz:'忌口', py:'jìkǒu', en:describeReq(), right:'说一下' });
      if (b.lines.length) rows.push({ place:true, hz:'点好了', py:'diǎn hǎo le',
        en:'send it to the kitchen', right:`¥${b.total}`, off:H.money() < b.total });
    } else {
      for (const o of b.lines) rows.push({ off:true, hz:`${o.d.hz} ×${o.n}`, py:o.d.py, en:o.d.en,
        right:`¥${o.d.price * o.n}` });
      for (const tip of tips) rows.push({ off:true, hz:tip.hz, py:tip.py, en:tip.en, right:'建议' });
      if (!state.ate) rows.push({ eat:true, hz:'吃饭', py:'chī fàn',
        en:'eat — the dishes are shared, so everybody reaches', right:'开动' });
      rows.push({ bill:true, hz:'买单', py:'mǎi dān', en:'ask for the bill', right:`¥${b.total}` });
    }
    rows.push({ leave:true, hz:'走了', py:'zǒu le', en:'get up and leave the table' });
    P.show({ title:`${NAME} · ${t ? t.hz : '餐桌'}`,
      sub:`${clockOf(H.minutes())} · ${describeReq()} · ¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.menu)  { openMenu(false); return false; }
        if (r.req)   { openRequests(false); return false; }
        if (r.place) { return place(false); }
        if (r.eat)   { eat(); return false; }
        if (r.bill)  { openBill(); return false; }
        if (r.leave) {
          if (state.placed && !state.ate) { H.say('还没吃呢 · <span class="dim">the food is on the table</span>'); return false; }
          if (state.placed && state.ate) { H.say('还没买单 · <span class="dim">the bill has not been settled</span>'); return false; }
          Object.assign(state, fresh(), { visits:state.visits, spend:state.spend, leftovers:state.leftovers });
          H.save(); return true;
        }
        return false;
      } });
  }

  function eat() {
    const b = billOf(state.order);
    if (!b.lines.length) return;
    // What a shared table actually does to you. Food comes off the dishes and not off the drinks,
    // 主食 is where most of it is, and chilli you asked for and could not take costs mood rather
    // than paying it — which is the only way 特辣 is ever a decision.
    const bulk = b.lines.reduce((s, o) => s + o.n * (o.d.staple ? 26 : o.d.drink ? 2 : o.d.share ? 17 : 8), 0);
    const perHead = state.party > 1 ? bulk / state.party * 1.35 : bulk;
    H.need('food', Math.min(70, perHead));
    const hot = b.lines.filter(o => o.d.spice >= 3).length;
    const cools = b.lines.some(o => o.d.cools || o.d.veg);
    let mood = 14 + (state.party > 1 ? 6 : 0) + (b.lines.some(o => o.d.house) ? 5 : 0);
    if (spiceOf(state.spice).lv >= 3 && hot >= 2 && !cools) mood -= 8;
    H.need('mood', mood);
    if (b.lines.some(o => o.d.booze)) H.need('rest', -4);
    state.ate = true;
    H.advance(state.party > 2 ? 45 : 32);
    H.sentence('太好吃了。');
    H.say(`吃完了 · <span class="dim">${b.dishes} shared dish${b.dishes > 1 ? 'es' : ''}, ` +
      `${b.staples} bowl${b.staples === 1 ? '' : 's'} of 主食 — everyone reached into the middle</span>`);
    openOrder(); H.save();
  }

  // ---------------------------------------------------------------- 6. 买单
  // The last panel, and the only one with an argument in it. 打包 first, because in China the box
  // is packed while the bill is being worked out and not after everybody has stood up.
  function openBill() {
    const P = H.Pick(); if (!P) return;
    const leftoverN = state.ate ? Math.max(0, billOf(state.order).dishes - state.party) : 0;
    const b = billOf(state.order, { boxes: state.pendingBoxes || 0 });
    const rows = [{ sec:'账单', py:'zhàngdān', en:'the bill' }];
    for (const o of b.lines) rows.push({ off:true, hz:`${o.d.hz} ×${o.n}`, py:'', en:'', right:`¥${o.d.price * o.n}` });
    if (b.boxFee) rows.push({ off:true, hz:`打包盒 ×${b.boxes}`, py:'dǎbāo hé', en:'takeaway boxes',
      right:`¥${b.boxFee}` });
    rows.push({ off:true, hz:'一共', py:'yígòng', en:'altogether', right:`¥${b.total}` });
    if (leftoverN > 0 && !state.pendingBoxes)
      rows.push({ box:leftoverN, hz:'打包', py:'dǎ bāo', en:`box up what is left — ${leftoverN} box${leftoverN > 1 ? 'es' : ''}, ` +
        `¥${BOX_FEE} each. Nobody here thinks less of you for it`, right:`¥${leftoverN * BOX_FEE}` });
    rows.push({ sec:'怎么付', py:'zěnme fù', en:'how it gets paid' });
    if (state.party > 1) rows.push({ split:true, hz:'AA制', py:'AA zhì',
      en:`split it ${state.party} ways — ¥${splitWays(b.total, state.party)[0]} each. Normal among colleagues, ` +
         'a small insult among close friends', right:'分开付' });
    rows.push({ pay:'scan', hz:'扫码', py:'sǎo mǎ', en:'scan the code on the table — how almost everybody pays',
      right:`¥${b.total}`, off:H.money() < b.total });
    rows.push({ pay:'cash', hz:'现金', py:'xiànjīn', en:'cash — they will have to find change',
      right:`¥${b.total}`, off:H.money() < b.total });
    if (H.hasCard()) rows.push({ pay:'card', hz:'刷卡', py:'shuā kǎ', en:'card — the terminal is on the till',
      right:`¥${b.total}` });
    rows.push({ fapiao:true, hz:'开发票', py:'kāi fāpiào',
      en:'ask for a receipt you can claim back — the thing every business meal in China ends with',
      right: state.fapiao ? '✓' : '' });
    P.show({ title:`${NAME} · 买单`, sub:`¥${b.total} · ¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.box) { state.pendingBoxes = r.box; openBill(); return false; }
        if (r.fapiao) { state.fapiao = !state.fapiao; openBill(); return false; }
        if (r.split) { openSplit(b.total); return false; }
        if (r.pay) { return settle(r.pay, b, 1); }
        return false;
      } });
  }
  function openSplit(total) {
    const P = H.Pick(); if (!P) return;
    const rows = [{ sec:`AA制 · ${state.party}位`, en:'who is paying, and how many ways' }];
    for (let n = 2; n <= Math.max(2, state.party); n++) {
      const parts = splitWays(total, n);
      rows.push({ ways:n, hz:`分${n}份`, py:`fēn ${n} fèn`,
        en:`¥${parts[0]} each${parts[n - 1] !== parts[0] ? `, ¥${parts[n - 1]} for the last one` : ''} — you pay one share`,
        right:`¥${parts[0]}` });
    }
    rows.push({ ways:1, hz:'我请客', py:'wǒ qǐng kè',
      en:'you are paying for everybody — 请客 is an offer, and refusing it twice before accepting is the form',
      right:`¥${total}` });
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back to the bill' });
    P.show({ title:`${NAME} · AA制`, sub:`¥${total} · ¥${H.money()} 在身上`, rows,
      onPick(r) {
        if (r.back) { openBill(); return false; }
        if (!r.ways) return false;
        state.splitLast = r.ways;
        const b = billOf(state.order, { boxes: state.pendingBoxes || 0 });
        openPayFor(b, r.ways); return false;
      } });
  }
  function openPayFor(b, ways) {
    const P = H.Pick(); if (!P) return;
    const mine = splitWays(b.total, ways)[0];
    const rows = [{ sec: ways > 1 ? `您这份 ¥${mine}` : `一共 ¥${b.total}`,
      en: ways > 1 ? `your share of ${ways}` : 'the whole bill' }];
    rows.push({ pay:'scan', hz:'扫码', py:'sǎo mǎ', en:'scan the code', right:`¥${mine}`, off:H.money() < mine });
    rows.push({ pay:'cash', hz:'现金', py:'xiànjīn', en:'cash', right:`¥${mine}`, off:H.money() < mine });
    if (H.hasCard()) rows.push({ pay:'card', hz:'刷卡', py:'shuā kǎ', en:'card', right:`¥${mine}` });
    rows.push({ back:true, hz:'返回', py:'fǎnhuí', en:'back' });
    P.show({ title:`${NAME} · 付钱`, sub:`¥${mine} · ¥${H.money()} 在身上`, rows,
      onPick(r) { if (r.back) { openBill(); return false; } return r.pay ? settle(r.pay, b, ways) : false; } });
  }

  const METHOD = { scan:{ hz:'扫码', en:'scanned the code' }, cash:{ hz:'现金', en:'paid cash' },
    card:{ hz:'刷卡', en:'paid by card' } };
  function settle(method, b, ways) {
    const mine = ways > 1 ? splitWays(b.total, ways)[0] : b.total;
    if (method !== 'card' && H.money() < mine) {
      H.say(`钱不够 · <span class="dim">¥${mine} needed; you have ¥${H.money()}</span>`); return false;
    }
    let note = '';
    if (method === 'card') { const r = H.card(mine); if (r && r.fell_back) note = '（走的现金）'; }
    else H.spend(mine);
    state.spend += mine; state.visits++;
    if (state.pendingBoxes) {
      const names = b.lines.filter(o => o.d.share).map(o => o.d.hz).slice(0, 3).join('、');
      state.leftovers = { kind:'剩菜', kindEn:'leftovers', what:names,
        food: Math.min(50, b.food * .35), at:H.minutes(), day:H.day() };
    }
    const zh = `在${NAME}吃饭，${ways > 1 ? `AA制分${ways}份，` : ''}${METHOD[method].hz}付了${mine}块` +
      `${state.pendingBoxes ? '，剩菜打包了' : ''}${state.fapiao ? '，开了发票' : ''}。`;
    H.say(`${METHOD[method].hz} ¥${mine}${note} · <span class="dim">${METHOD[method].en}` +
      `${ways > 1 ? `, one share of ${ways}` : ''}${state.pendingBoxes ? ' · leftovers boxed' : ''}</span>`);
    H.sentence(ways > 1 ? 'AA制吧。' : '买单。');
    H.diary(zh, `Ate at ${NAME_EN}. ${METHOD[method].en} ¥${mine}` +
      `${ways > 1 ? ` — split ${ways} ways` : ''}${state.pendingBoxes ? ', leftovers boxed' : ''}.`, 'diner');
    const keep = { visits:state.visits, spend:state.spend, leftovers:state.leftovers };
    Object.assign(state, fresh(), keep);
    H.save(); return true;
  }

  // 剩菜. The box is cold and it is not as good, which is the point: it is food you already paid
  // for and it stops you being hungry, and that is the whole of what leftovers are.
  function eatLeftovers() {
    if (!state.leftovers) return false;
    const L = state.leftovers;
    H.need('food', L.food); H.need('mood', 4);
    H.advance(10);
    H.say(`把打包的吃了 · <span class="dim">${esc(L.what)} — ${L.kindEn || 'the box'}, cold, ` +
      `and still dinner</span>`);
    H.sentence('剩菜热一下就行。');
    state.leftovers = null; H.save(); return true;
  }

  // ---------------------------------------------------------------- one runnable check
  // Not a framework and not a suite: the five bits of arithmetic in this file that would be wrong
  // silently. Runs in the console as RestaurantSys.selfCheck() and needs no game behind it.
  function selfCheck() {
    const A = (c, m) => { if (!c) throw new Error('RestaurantSys.selfCheck: ' + m); };
    A(MENU.every(d => SECTIONS.includes(d.sec)), 'a dish is in no section');
    A(MENU.filter(d => d.hz === '宫保鸡丁')[0].price === 48, 'the till and the menu disagree on 宫保鸡丁');
    // family style: four people, four dishes is too few by the 人数加一 rule; five is right
    const four = [{ hz:'红烧肉', n:1 }, { hz:'辣椒炒蛋', n:1 }, { hz:'清炒时蔬', n:1 }, { hz:'汤', n:1 },
                  { hz:'米饭', n:4 }];
    A(!advice(four, 4).some(t => t.key === 'few' || t.key === 'staple'), 'four dishes + four rice for four should pass');
    A(advice([{ hz:'红烧肉', n:1 }, { hz:'米饭', n:4 }], 4).some(t => t.key === 'few'), 'one dish for four should be flagged');
    A(advice(four, 1).some(t => t.key === 'many'), 'four dishes for one should be flagged as too much');
    // allergy and the swap
    A(!dishOk(dishOf('宫保鸡丁'), ['peanut']).ok, 'kung pao must be refused to a peanut allergy');
    A(dishOk(dishOf('麻婆豆腐'), ['veg']).swap === true, 'mapo tofu should be offered as a vegetarian swap');
    A(!dishOk(dishOf('剁椒鱼头'), ['veg']).ok, 'a fish head is not vegetarian');
    // the heat that cannot come down
    A(spiceNote(dishOf('剁椒鱼头'), 'none').refuse === true, '剁椒鱼头 has no 不要辣 version');
    A(!spiceNote(dishOf('剁椒鱼头'), 'mid').refuse, '剁椒鱼头 must be orderable at the house default 中辣');
    A(!spiceNote(dishOf('剁椒鱼头'), 'mild').refuse, '微辣 buys you a warning, not a refusal');
    A(spiceNote(dishOf('剁椒鱼头'), 'mild') !== null, 'and it must still say it will be hot');
    A(spiceNote(dishOf('红烧肉'), 'hot') !== null, 'asking for 特辣 on a braise should say something');
    // splitting, to the jiao, with the remainder on the last person
    const s3 = splitWays(100, 3);
    A(s3.length === 3 && Math.abs(s3.reduce((a, b2) => a + b2, 0) - 100) < 1e-9, 'a split must add back up');
    A(s3[0] >= 100 / 3, 'a split rounds up, not down');
    A(splitWays(48, 1)[0] === 48, 'one way is the whole bill');
    // tables: a six needs both four-tops, and there is no table for nine
    A(freeFor(9, 1, 15 * 60) === null, 'nine people cannot be seated');
    A(TABLES.every(t => t.seats <= 4), 'the room only builds a two and two fours');
    // the room fills up and empties again over a day
    const load = [];
    for (let m = 10 * 60; m <= 22 * 60; m += 30) load.push(occupied(1, m).size);
    A(Math.max(...load) === 3 && Math.min(...load) < 3, 'the room should fill at the rush and empty after it');
    // The waitlist must terminate. This is the assertion the bug wanted: arriving in the middle of
    // either rush on any day of the week, waiting in five-minute blocks has to reach a free table.
    // Before the fix, `ready` also required the quote to have expired, so a party could sit at
    // "0 tables ahead, 0 minutes" indefinitely against a full room.
    for (let d = 1; d <= 7; d++) for (const start of [12 * 60 + 30, 18 * 60 + 45]) {
      let m = start, steps = 0;
      while (!freeFor(4, d, m) && steps < 60) { m += 5; steps++; }
      A(steps < 60, `a four waiting from ${clockOf(start)} on day ${d} never got a table`);
    }
    return 'RestaurantSys.selfCheck: ok';
  }

  return {
    NAME, NAME_PY, NAME_EN,
    TABLES, JOINED, MENU, SECTIONS, SPICE, DIET, BOX_FEE, FREE_DRINK_BEFORE, MAX_PARTY,
    tableOf, dishOf, dishOk, spiceNote, spiceOf, dietOf,
    busy, occupied, freeFor, waitMinutes, queueAhead,
    billOf, advice, splitWays, clockOf, offerContract, offerState,
    openHost, openWait, openMenu, openSection, openRequests, openOrder, openBill, openSplit,
    eat, eatLeftovers,
    state, toSave, load, reset() { Object.assign(state, fresh()); },
    leftovers: () => state.leftovers && { ...state.leftovers },
    bind(h) { host = h || null; },
    selfCheck,
  };
})();

MallFit['餐厅'] = (A) => {

  // ---- palette. Authored values, not rendered ones: see the note above about matAmt.
  const K = {
    trim:    C('#2b2e31'),
    steel:   C('#98a1a7'), steelD: C('#59626a'), chrome: C('#b4bdc3'),
    // The pass top used to be #9aa3a8 and came out as a five-and-a-half-metre sheet of white
    // across the middle of the frame — the brightest thing in the shop by a distance, brighter
    // than the menu board that is actually lit. A working stainless top under warm light is a
    // mid grey.
    tops:    C('#78828a'),
    lacq:    C('#71271f'), lacqL: C('#9c3327'), lacqD: C('#511a15'),  // counter front and shades
    gold:    C('#c1932f'), goldL: C('#f0cf7d'),
    china:   C('#f2ece0'), cream: C('#e5d9bd'), paper: C('#efe7d4'),
    chilli:  C('#b8301f'), chilliD: C('#82200f'), oil: C('#a83022'),
    lantern: C('#cf3f34'),
    lamp:    C('#ffd7a0'), warm: C('#ffe9c6'), flame: C('#ff8a30'),
    menu:    C('#f5e7c6'), ink: C('#33291f'),
    tileC:   C('#8f8a7d'),   // + tile  x1.28 -> a warm off-white glazed brick
    plasU:   C('#867f73'),   // + plaster x1.27 -> the band above the tile
    dark:    C('#1b2125'),   // the kitchen seen through the hatch
    woodDk:  C('#3d2f23'),   // + wood  x1.20 -> the timber wall on the banquette side
    woodM:   C('#5c4229'),
    uphol:   C('#5e2a25'),   // + fabric x1.30 -> oxblood banquette and chair pads
    upholL:  C('#6d3b2c'),
    fridge:  C('#4b545a'), fridgeIn: C('#cfe2e8'),
    // The lattice was #8a6432 and, standing a metre from a warm 0.32 lamp, came back a saturated
    // cartoon gold — the loudest object in the room and a screen, which should be a background.
    latt:    C('#54401f'),
  };
  const MT = {
    // matScale is the size of the real thing in the photograph, not a taste setting: the tile map
    // holds about six tiles per repeat, so 0.42 is a 7 cm mosaic — which is what a kitchen wall
    // behind a wok range is, and small enough that the map's own softness reads as glaze rather
    // than as blur.
    tile:  { mat:'tile',     matScale:.42,  matAmt:.20, nrmAmt:.30 },
    steel: { mat:'steel',    matScale:.55,  matAmt:.26, nrmAmt:.30 },
    wood:  { mat:'wood',     matScale:.90,  matAmt:.28, nrmAmt:.30 },
    cloth: { mat:'fabric',   matScale:.50,  matAmt:.20, nrmAmt:.30 },
    plas:  { mat:'plaster',  matScale:1.80, matAmt:.20, nrm:null },
  };

  // ---- small pieces used more than once.

  // A paper lantern: cord, brass caps top and bottom, a lit paper body and a tassel. Lit rather
  // than shaded, because an unlit red ball in a dim corner is a dark red ball. The glow is held
  // at .15: the bloom pass is additive and a sphere concentrates it where a strip spreads it, so
  // the same number that looks like a lit tube on the gantry looks like a flare on a ball.
  const lantern = (a, b, y, r = .17) => {
    A.cyl(a, b, y + r * .86 + .30, .006, .60, K.trim, { gloss:.2 });
    A.cyl(a, b, y + r * .84, .052, .055, K.gold, { gloss:.45 });
    A.ball(a, b, y, r, r * .84, r, K.lantern, { mode:1, glow:.15 });
    A.cyl(a, b, y - r * .84, .046, .045, K.gold, { gloss:.45 });
    A.cap(a, b, y - r * .84 - .12, .016, .19, .016, K.lantern, { mode:1, glow:.12 });
  };

  // A string of dried chillies. The first version hung seven pods at 8 cm centres on a 5 mm cord,
  // and at 8 cm a 11 cm pod does not touch its neighbours: from across the room it read as a
  // column of separate orange sausages floating beside a pole, which is the single worst-looking
  // thing that was in this shop. Real ones are threaded through the stalks and packed solid, so
  // these sit at 4.4 cm — every pod overlapping the two either side — and are kicked around the
  // cord in b as well as in a so the outline is a braid rather than a stripe.
  const chillies = (a, b, yTop, n = 19) => {
    A.cyl(a, b, yTop - .30, .011, .62, C('#5e4f34'), { gloss:.16 });
    A.cap(a, b, yTop + .04, .020, .07, .020, C('#7d6a44'), { gloss:.18 });   // the knot it hangs by
    // 3.2 cm of drop per pod against a pod 11 cm long standing close to upright: every one of
    // these overlaps the three below it, which is the whole trick. At 8 cm and half over on its
    // side — where this started — no pod touches the next and the string reads from the room as
    // a zigzag of separate orange dashes, a fault worth more than every other on the wall.
    for (let i = 0; i < n; i++) {
      const s = i % 3;
      A.cap(a + (s - 1) * .019, b + (i % 2 ? .021 : -.020), yTop - .07 - i * .032,
        .016, .112, .016, s === 0 ? K.chilliD : s === 1 ? K.chilli : C('#9c2a1a'),
        { rz: (i % 2 ? .30 : -.27), gloss:.24 });
    }
  };

  // The caddy that stands in the middle of every laid table: soy and chilli oil, a pot of
  // chopsticks, a napkin box. `t` is the height of the table top.
  const caddy = (a, b, t) => {
    A.put(a, b, .15, .17, .045, t + .0175, K.trim, { hard:true, gloss:.30 });
    A.cyl(a - .035, b - .045, t + .115, .026, .15, C('#4a2f1c'), { gloss:.52 });   // soy
    A.cyl(a - .035, b + .045, t + .115, .026, .15, K.oil, { gloss:.52 });          // chilli oil
    A.cyl(a + .055, b - .002, t + .095, .033, .11, K.lacqL, { gloss:.30 });        // chopstick pot
    for (const o of [-.014, 0, .014])
      A.cap(a + .055, b + o, t + .175, .007, .15, .007, K.cream, { gloss:.28, rz: o * 4 });
    A.put(a - .105, b, .11, .15, .055, t + .028, K.china, { hard:true, gloss:.22 });
  };

  // A bowl. It was a straight-sided cylinder with a disc on top, which is a paint pot: eight of
  // them stood along the pass and the row read as a decorator's shelf. The taper mesh is wide at
  // its base and narrow at its top, so turned over it is exactly a bowl, and it costs the same
  // one draw as the cylinder did.
  const bowl = (a, b, y, big = false, fill = K.oil) => {
    const r = big ? .108 : .086;
    A.cyl(a, b, y + .013, r * .54, .026, K.china, { gloss:.26 });                       // foot
    A.taper(a, b, y + .068, r * 2, .085, r * 2, K.china, { rz: Math.PI, gloss:.30 });   // the bowl
    A.cyl(a, b, y + .106, r * .86, .014, fill, { gloss:.26 });                          // and in it
  };

  // Bamboo steamers, stacked, lid on.
  // Bamboo steamers, stacked, lid on. Authored dark: the wood map runs bright and a basket set
  // down at #b58a54 came back the yellow of a tub of margarine, which next to a red lacquer pass
  // is the loudest thing in the shop and the least like bamboo.
  const steamer = (a, b, y, n = 3) => {
    for (let i = 0; i < n; i++)
      A.cyl(a, b, y + .042 + i * .080, .112, .080, i % 2 ? C('#7c5c31') : C('#8a683a'),
        { gloss:.10, ...MT.wood });
    A.cyl(a, b, y + .042 + n * .080 + .022, .116, .044, C('#96754a'), { gloss:.12, ...MT.wood });
  };

  // A wok, which is a shallow bowl and not a dome: this was a squashed sphere 45 cm across and it
  // read from the dining room as a black flying saucer parked on the range. The taper mesh turned
  // over is exactly the section of one, and the food sits just under the rim where it can be seen.
  // `hdir` is which way the long handle points along b, or 0 for the two-eared kind. A stick
  // handle needs 40 cm of clear bench beside the pan and the range here has 10, so the pair on
  // the wok range wear ears and only the cook line's, which has the end of the run to itself,
  // gets a handle.
  const wok = (a, b, y, r, food, hdir = 0) => {
    A.taper(a, b, y + .066, r * 2, .132, r * 2, C('#2f2f31'), { rz: Math.PI, gloss:.42 });
    A.cyl(a, b, y + .126, r + .012, .015, C('#4e5052'), { gloss:.52 });          // rolled rim
    if (food) A.cyl(a, b, y + .108, r * .80, .028, food, { gloss:.26 });
    if (hdir) A.cap(a, b + hdir * (r + .16), y + .105, .019, .30, .019, C('#2f2a24'),
      { rz: Math.PI / 2, gloss:.30 });
    else for (const s of [-1, 1])
      A.cyl(a, b + s * (r + .022), y + .120, .030, .024, C('#2f2a24'), { gloss:.34 });
  };

  // A dining chair: dark timber frame, oxblood vinyl pad and back. `da, db` is the way the sitter
  // faces, one step in shop axes, so the back goes on the other side of the seat from the table.
  // Authored in shop axes rather than with `ry`, because `ry` turns a box in *world* space and
  // this shop's a-axis is the world's -z: a chair rotated by the wrong ninety degrees is a chair
  // whose back is where its side should be, and it is not visible in the numbers.
  const chair = (a, b, da, db) => {
    const wa = db ? .44 : .42, wb = db ? .42 : .44;             // extent along a, along b
    A.put(a, b, wa - .06, wb - .06, .045, .420, K.woodM, { hard:true, gloss:.24, ...MT.wood });
    A.put(a, b, wa, wb, .055, .470, K.uphol, { mode:7, round:.05, gloss:.09, ...MT.cloth });
    A.put(a - da * .195, b - db * .195, db ? .40 : .055, db ? .055 : .40, .50, .705,
      K.woodM, { hard:true, gloss:.24, ...MT.wood });                           // back frame
    A.put(a - da * .162, b - db * .162, db ? .33 : .05, db ? .05 : .33, .34, .745,
      K.uphol, { mode:7, round:.05, gloss:.09, ...MT.cloth });                  // its pad
    for (const [oa, ob] of [[-.165, -.165], [.165, -.165], [-.165, .165], [.165, .165]])
      A.cyl(a + oa, b + ob, .195, .019, .39, K.woodM, { gloss:.26, ...MT.wood });
  };

  // A laid four-top: timber top on a black steel underframe, four chairs, a caddy, and place
  // settings — a bowl, a small plate, a cup and chopsticks at each seat. Every piece of this is
  // the same mesh, mode and material at every table, which is what lets eight identical place
  // settings come out of the renderer as a handful of instanced calls instead of ninety.
  const fourTop = (a, b) => {
    A.put(a, b, .80, 1.26, .055, .755, K.woodM, { hard:true, gloss:.26, ...MT.wood });
    A.put(a, b, .74, 1.20, .035, .715, K.trim, { hard:true, gloss:.30 });          // apron
    for (const [oa, ob] of [[-.31, -.52], [.31, -.52], [-.31, .52], [.31, .52]])
      A.cyl(a + oa, b + ob, .345, .023, .69, K.trim, { gloss:.42, ...MT.steel });  // legs
    A.put(a, b, .06, 1.06, .035, .120, K.trim, { hard:true, gloss:.36 });          // foot rail
    for (const da of [1, -1])
      for (const s of [-1, 1]) chair(a + da * .64, b + s * .315, -da, 0);
    caddy(a, b, .7825);
    for (const da of [1, -1])
      for (const s of [-1, 1]) setting(a + da * .245, b + s * .315, da, .7825);
  };

  // One place setting, laid the way a Chinese table is: bowl on a plate, cup beside it, and the
  // chopsticks lying across in front rather than standing up in the rice. `t` is the height of
  // the table top; every layer above it is stacked off that with at least four millimetres
  // between faces, because two faces at the same height in this renderer flicker against each
  // other and a table of eight settings is eight places for it to show.
  // `cs` is which side of the bowl the cup goes, because on a round table for two the two settings
  // face each other and a cup always offset the same way puts one of them over the edge.
  const setting = (a, b, da, t, cs = -1) => {
    A.cyl(a, b, t + .0125, .105, .017, K.china, { gloss:.30 });                 // plate
    A.cyl(a, b, t + .0325, .049, .022, K.china, { gloss:.28 });                 // bowl foot
    A.taper(a, b, t + .0725, .150, .058, .150, K.china, { rz: Math.PI, gloss:.30 });
    A.cyl(a, b + cs * .175, t + .0455, .034, .070, K.china, { gloss:.32 });     // cup
    for (const o of [0, .017])
      A.cap(a + da * (.115 + o), b, t + .012, .0065, .215, .0065, C('#d9cbaa'),
        { rz: Math.PI / 2, gloss:.30 });
  };

  // A hanging kitchen tool — ladle, skimmer, cleaver — off the rack over the wok station. Three
  // pieces each and they are what makes the back of a kitchen read as a kitchen rather than as
  // a shelf: the silhouette of a row of them against a dark wall is unmistakable.
  const utensil = (a, b, yTop, kind) => {
    A.cyl(a, b, yTop - .015, .011, .030, K.chrome, { gloss:.50 });                    // hook
    A.cap(a, b, yTop - .17, .012, .30, .012, K.trim, { gloss:.34 });                  // handle
    if (kind === 0) A.ball(a, b, yTop - .345, .062, .036, .062, K.chrome, { gloss:.52 });
    else if (kind === 1) A.cyl(a, b, yTop - .345, .068, .022, K.chrome, { gloss:.48 });
    else A.put(a, b, .012, .085, .155, yTop - .375, K.chrome, { hard:true, gloss:.55 });
  };

  // =============================================================== the back wall, in three bands
  // The shell's own back wall (slatted panel, framed graphics, the shop name in gold) is lined
  // over: a restaurant's back wall is a kitchen, and the name is already on the fascia outside
  // and on the counter front below. The lining stands at a = 0.44–0.60, clear of the shell's
  // fins at 0.40 so nothing z-fights.
  // Tiled to 2.05, a stainless band over that, plaster to the ceiling — and a hole punched in the
  // tile over the expo section, because a flat pale wall five metres wide is the one thing the
  // view from the door is mostly made of, and the mall's own sun casts the concourse's shadows
  // across it. What stands in the hole is the kitchen, built further down this file.
  const KB = -1.375, KW = 5.55;                    // kitchen wall: b -4.15 .. +1.40
  const HB = -.275, HW = 3.41;                     // the hatch:    b -1.98 .. +1.43
  A.put(.52, -3.065, .16, 2.17, 2.05, 1.025, K.tileC, { hard:true, gloss:.10, ...MT.tile });
  A.put(.52, HB, .16, HW, 1.05, .525, K.tileC, { hard:true, gloss:.10, ...MT.tile });
  A.put(.52, KB, .16, KW, .55, 2.325, C('#868e93'), { hard:true, gloss:.16, ...MT.steel });
  A.put(.52, KB, .16, KW, .90, 3.050, K.plasU,      { hard:true, gloss:.10, ...MT.plas });
  // and the dining side of the back wall, in dark timber. What goes on it has to go where the
  // wall can actually be seen, which is the band above the cooler and the band above the lattice
  // screen: a raised panel at b = 1.90 sat squarely behind a two-metre fridge and was a prop
  // nobody could ever have looked at.
  A.put(.52, 2.775, .16, 2.75, 3.50, 1.75, K.woodDk, { hard:true, gloss:.16, ...MT.wood });
  A.put(.605, 2.05, .03, 1.00, 1.06, 2.70, C('#4a3928'), { hard:true, gloss:.20, ...MT.wood });
  A.put(.605, 3.375, .04, 1.12, .62, 3.09, K.trim, { hard:true, gloss:.22 });
  A.put(.635, 3.375, .02, .98, .48, 3.09, K.lacq, { hard:true, mode:1, glow:.07 });
  A.put(.650, 3.375, .02, .84, .012, 3.20, K.gold, { hard:true, gloss:.44 });

  // ---- the hatch surround: the dark box the kitchen stands in, its reveals, and a steel frame.
  // The back is at a = 0.45 rather than 0.48 so the shell's own gold shop name, which sits at
  // 0.432 on the feature panel behind all this, ends up *inside* the solid instead of glowing
  // through the middle of the kitchen.
  A.put(.45, HB, .08, HW, 1.14, 1.55, K.dark, { hard:true, gloss:.06 });
  // The head reveal has to reach further back than the steel rail in front of it, or it is a
  // 5 cm box built entirely inside another one: it is the strip of dark you see under the top of
  // the opening that says the kitchen has depth.
  A.put(.51, HB, .14, HW, .06, 2.020, C('#2c3237'), { hard:true, gloss:.12 });   // head reveal
  for (const rb of [-1.955, 1.405])
    A.put(.555, rb, .13, .05, 1.00, 1.550, C('#2c3237'), { hard:true, gloss:.12 }); // jamb reveals
  // A warm strip tucked under the head, washing down the back of the kitchen. Without it the
  // recess is lit only by what spills over the pass and the deepest 30 cm of it goes to black.
  A.put(.50, HB, .05, HW - .16, .04, 1.985, C('#ffc98a'), { hard:true, mode:1, glow:.19 });
  A.put(.60, HB, .12, HW + .16, .07, 1.045, K.steelD, { hard:true, gloss:.34, ...MT.steel });
  A.put(.60, HB, .12, HW + .16, .07, 2.025, K.steelD, { hard:true, gloss:.34, ...MT.steel });
  for (const jb of [-2.02, 1.47])
    A.put(.60, jb, .12, .08, 1.05, 1.535, K.steelD, { hard:true, gloss:.34, ...MT.steel });

  // =============================================================== the kitchen, seen through it
  // Everything here lives between a = 0.55 and a = 1.15, which is the strip of floor between the
  // wall lining and the back of the pass, and between y = 1.00 and y = 2.05, which is what the
  // opening shows from a standing eye at the door. Below 1.00 the pass counter cuts it off and
  // above 2.05 the tile does, so nothing is built there.
  //
  // A stainless bench runs the whole width. Its top is at 1.06, seven centimetres above the pass
  // top at 0.99, which is enough to read as a second plane rather than as the same one.
  //
  // It is built in three pieces rather than one, and the middle piece is half depth. That is the
  // only reason there is a cook in this shop. The bench used to run the full 0.50 from a 0.60 to
  // 1.10 for its whole width, and the pass in front of it starts at 1.18: eight centimetres of
  // floor between them, which is a kitchen nobody can stand in. Everything anyone ever built here
  // was food with no one cooking it. The prep section at b -1.30..-0.60 is now 0.28 deep, which
  // leaves a 0.30 m alcove at a 0.88..1.18 — a body is about 0.25 through the chest — and the chef
  // in MallCast at the bottom of this file stands in it. Seen from the door he is cut off at the
  // waist by the pass top and framed by the hatch, which is exactly how you see a cook at a hatch.
  A.put(.85, .3875, .50, 1.975, .78, .67, C('#6e777d'), { hard:true, gloss:.24, ...MT.steel });
  A.put(.85, .40, .54, 2.00, .05, 1.035, C('#727c83'), { hard:true, gloss:.40, ...MT.steel });
  A.put(1.09, .39, .03, 1.98, .10, 1.010, K.steelD, { hard:true, gloss:.44 });      // its front lip
  A.put(.85, -1.61, .50, .62, .78, .67, C('#6e777d'), { hard:true, gloss:.24, ...MT.steel });
  A.put(.85, -1.615, .54, .65, .05, 1.035, C('#727c83'), { hard:true, gloss:.40, ...MT.steel });
  A.put(1.09, -1.615, .03, .63, .10, 1.010, K.steelD, { hard:true, gloss:.44 });
  // and the prep ledge he works at, half as deep as the rest.
  A.put(.74, -.95, .28, .70, .78, .67, C('#6e777d'), { hard:true, gloss:.24, ...MT.steel });
  A.put(.74, -.95, .30, .73, .05, 1.035, C('#727c83'), { hard:true, gloss:.40, ...MT.steel });

  // ---- the wok range, dead centre of the opening and therefore of the whole shop.
  // Two burner wells cut into the bench, both lit. The flame ring is a flat disc rather than a
  // ball: a sphere at this glow blooms into a headlight, and what a burner actually looks like
  // from the far side of a counter is a ring of light under a black pan.
  //
  // The b positions along this bench are not free. Every one of these has a radius, and the first
  // pass laid a 40 cm chopping board across a 35 cm burner and stood the rice warmer inside the
  // rim of the near wok: from the room those read as one lump of steel with a board growing out
  // of it. The run below is spaced on the widths, from the urn at +1.16 to the small steamer at
  // -1.80, with no two footprints touching.
  //
  // The two rings, the three heat lamps over the pass and the nine paper checks on the rail are
  // collected as they are built and animated together at the bottom of this file. A wok burner is
  // the one light in a restaurant that is never steady — it surges every time the pan is tossed —
  // and it is the difference between a kitchen and a photograph of one. `dynamicVisual` rather than
  // `dynamic`: nothing here moves, only glow changes, so the cull sphere does not need widening.
  const LIVE = { rings:[], lamps:[], checks:[], docket:null, lip:null,
    tables:Object.create(null), orders:Object.create(null) };
  for (const wb of [.26, -.26]) {
    A.cyl(.86, wb, 1.075, .172, .04, K.trim, { gloss:.40 });
    LIVE.rings.push(A.dynamicVisual(A.cyl(.86, wb, 1.092, .112, .035, K.flame, { mode:1, glow:.20 })));
  }
  wok(.86, .26, 1.108, .215, C('#c0623a'));
  A.ball(.86, .26, 1.40, .19, .13, .19, C('#f0ece4'), { mode:1, alpha:.13, glow:.04 });
  // The far ring carries the stock pot, which is what the second burner of a two-hole range is
  // doing all day. A lidded cylinder reads instantly from the room; a wok shovel laid across the
  // ring, which was here first, read as a scratch on the picture.
  A.cyl(.86, -.26, 1.265, .155, .33, C('#8d959b'), { gloss:.40, ...MT.steel });
  A.cyl(.86, -.26, 1.445, .162, .034, K.steelD, { gloss:.48 });
  A.cyl(.86, -.26, 1.478, .026, .036, K.trim, { gloss:.40 });
  A.ball(.86, -.26, 1.62, .17, .12, .17, C('#f0ece4'), { mode:1, alpha:.11, glow:.04 });
  // A ladle and a pair of long chopsticks stood in a pot at the end of the range.
  A.cyl(.74, -.66, 1.135, .058, .16, K.steelD, { gloss:.42 });
  for (const o of [-.020, 0, .022])
    A.cap(.74, -.66 + o, 1.290, .010, .26, .010, C('#c9b48d'), { rz: o * 5, gloss:.28 });

  // ---- the soup urn and the rice warmer, at the +b end (which renders left of the woks).
  A.cyl(.84, 1.16, 1.245, .155, .38, C('#8d959b'), { gloss:.40, ...MT.steel });
  A.cyl(.84, 1.16, 1.445, .162, .035, K.steelD, { gloss:.46 });
  A.cyl(.84, 1.16, 1.478, .028, .04, K.trim, { gloss:.40 });                     // its knob
  A.cyl(.84, 1.16, 1.075, .048, .05, K.trim, { gloss:.40 });                     // and its tap
  A.cap(1.00, 1.16, 1.075, .016, .13, .016, K.trim, { rz: Math.PI / 2, gloss:.40 });
  A.cyl(.84, .74, 1.185, .132, .26, C('#dfd7c6'), { gloss:.34 });                // rice warmer
  A.cyl(.84, .74, 1.325, .138, .028, K.steelD, { gloss:.44 });
  A.put(1.00, .74, .02, .11, .045, 1.215, C('#3fa06a'), { hard:true, mode:1, glow:.10 });

  // ---- prep end: a chopping block, a bin of chopped chilli, and a tub of greens.
  A.put(.84, -1.06, .46, .40, .06, 1.090, C('#8f6b3f'), { hard:true, gloss:.16, ...MT.wood });
  A.cyl(.80, -1.17, 1.170, .082, .10, K.chilli, { gloss:.34 });                   // 剁椒, chopped
  A.put(.95, -.95, .11, .18, .010, 1.131, K.chrome, { hard:true, gloss:.55 });    // a cleaver, down
  A.cap(.95, -.80, 1.136, .014, .12, .014, C('#2f2a24'), { rz: Math.PI / 2, gloss:.32 });
  A.cyl(.80, -.51, 1.095, .065, .07, C('#4d8a3f'), { gloss:.30 });                // chopped greens

  // ---- the steamer tower, at the far end of the bench. Six baskets is a lunch service.
  steamer(.84, -1.52, 1.06, 5);
  A.ball(.84, -1.52, 1.70, .18, .13, .18, C('#f0ece4'), { mode:1, alpha:.12, glow:.04 });
  steamer(.84, -1.80, 1.06, 2);

  // ---- the wall behind it: a shelf of tins and bowls, a rack of hanging tools under it, and the
  // chef's tickets. A row of hanging steel against a dark wall is the whole silhouette of a
  // kitchen, and it costs three small props apiece.
  A.put(.62, HB, .24, HW - .30, .04, 1.740, K.steelD, { hard:true, gloss:.38, ...MT.steel });
  A.put(.62, HB, .24, HW - .30, .03, 1.575, K.steelD, { hard:true, gloss:.38 });   // the tool rail
  for (let i = 0; i < 8; i++) {
    const sb = -1.60 + i * .42;
    if (i % 2) {
      A.cyl(.62, sb, 1.835, .072, .15, i % 4 === 1 ? C('#b8a887') : C('#9d8f72'), { gloss:.26 });
      A.cyl(.62, sb, 1.918, .076, .026, K.lacqL, { gloss:.32 });
    } else {
      for (let j = 0; j < 3; j++)
        A.cyl(.62, sb, 1.788 + j * .034, .088, .034, K.china, { gloss:.28 });
    }
  }
  for (let i = 0; i < 7; i++) utensil(.66, -1.32 + i * .44, 1.560, i % 3);
  // A folded white towel over the rail, which is the one soft thing in a room of steel.
  A.put(.70, -1.72, .07, .17, .21, 1.505, C('#e9e5da'), { mode:7, round:.03, gloss:.06 });

  // =============================================================== the cook line, b -4.15..-2.05
  // Off to the side of the opening, seen over the counter through the gap between the top of the
  // pass and the bottom of the hood when you walk in and look right.
  A.put(.95, -3.10, .60, 2.00, .88, .44, K.steel, { hard:true, gloss:.30, ...MT.steel });
  A.put(1.25, -3.10, .04, 2.00, .10, .84, K.steelD, { hard:true, gloss:.40 });     // front lip
  // Two wok burners. The far one is empty and glowing; the near one has a wok on it.
  A.cyl(.95, -3.72, .905, .21, .05, K.steelD, { gloss:.40 });
  A.cyl(.95, -3.72, .925, .155, .05, K.flame, { mode:1, glow:.26 });
  A.cyl(.95, -2.78, .905, .21, .05, K.steelD, { gloss:.40 });
  wok(.95, -2.78, .930, .235, C('#b8552e'), -1);
  // A stock pot at the end of the range, and a steamer stack beside it.
  A.cyl(.95, -4.02, 1.08, .175, .34, C('#8d959b'), { gloss:.40, ...MT.steel });
  A.cyl(.95, -4.02, 1.265, .185, .04, K.steelD, { gloss:.48 });
  steamer(.95, -2.30, .88, 3);
  A.ball(.95, -2.30, 1.44, .19, .15, .19, C('#eae6de'), { mode:1, alpha:.13, glow:.04 });
  // A shelf of bowls and jars over the range.
  A.put(.72, -3.10, .30, 2.10, .045, 1.60, K.steelD, { hard:true, gloss:.38 });
  for (let i = 0; i < 5; i++) {
    const bb = -3.90 + i * .40;
    if (i % 2) { A.cyl(.74, bb, 1.685, .072, .13, C('#b0a68c'), { gloss:.30 });
                 A.cyl(.74, bb, 1.755, .075, .03, K.lacqL, { gloss:.35 }); }
    else       { for (let j = 0; j < 3; j++)
                   A.cyl(.74, bb, 1.655 + j * .035, .085, .035, K.china, { gloss:.30 }); }
  }
  // The extraction hood. It stops at b = -2.00 so it never stands in front of the menu board.
  A.put(1.00, -3.10, .72, 2.20, .52, 2.36, K.steel, { hard:true, gloss:.26, ...MT.steel });
  A.put(1.35, -3.10, .06, 2.20, .11, 2.055, K.steelD, { hard:true, gloss:.38 });
  A.put(1.14, -3.10, .30, 1.96, .03, 2.045, K.lamp, { hard:true, mode:1, glow:.20 });
  for (const fb of [-3.90, -3.10, -2.30])                             // its filter cassettes
    A.put(1.31, fb, .05, .70, .30, 2.235, C('#6c757b'), { hard:true, gloss:.42, ...MT.steel });

  // =============================================================== the pass, b -4.15..+1.40
  // Dark red lacquer front, stainless top. The front is the largest single surface the eye lands
  // on walking in, so it carries the room's colour rather than being another grey slab — and it
  // is panelled, because five and a half metres of unbroken red is a painted wall, not joinery.
  A.put(1.34, KB, .34, KW - .10, .16, .08, K.trim,  { hard:true, gloss:.24 });          // kick
  A.put(1.38, KB, .40, KW, .74, .53, K.lacq, { hard:true, gloss:.26 });                 // body
  for (let i = 0; i < 6; i++) {
    const pb = KB - KW / 2 + .49 + i * .905;
    A.put(1.585, pb, .012, .78, .52, .545, K.lacqD, { hard:true, gloss:.32 });          // panel
    A.put(1.588, pb, .008, .78, .012, .815, K.gold, { hard:true, gloss:.44 });          // its bead
  }
  A.put(1.38, KB, .40, KW - .06, .05, .885, K.gold, { hard:true, gloss:.42 });          // top bead
  A.put(1.36, KB, .48, KW + .08, .09, .945, K.tops, { hard:true, gloss:.30, ...MT.steel });
  LIVE.lip = A.dynamicVisual(
    A.put(1.605, KB, .02, KW - .30, .04, .845, K.lamp, { hard:true, mode:1, glow:.14 })); // under-lip
  // +b renders to the left of the frame from the doorway. The name used to sit at +0.95, which
  // from the audit camera is behind the goals card in the corner of the screen; centred on the
  // hatch it is under the part of the pass that is always in shot.
  A.glyph(1.598, -.275, .620, '湘 满 楼', { size:.135, gap:.05, color:K.goldL, glow:.10 });
  A.glyph(1.598, -.275, .420, '正 宗 湘 菜', { size:.082, gap:.036, color:K.gold, glow:.05 });

  // ---- gantry: uprights, top bar, three heat lamps, the ticket rail and its checks.
  // The whole assembly tops out at 1.89 on purpose. The sightline from the doorway to the bottom
  // of the menu board passes a = 1.30 at y = 1.94; anything taller here and the board's first
  // line of dishes is hidden behind a steel bar from the only place the shop is ever seen from.
  for (const ub of [-1.85, 1.30])
    A.cyl(1.30, ub, 1.44, .022, .92, K.steelD, { gloss:.45, ...MT.steel });
  A.cap(1.30, -.275, 1.86, .027, 3.20, .027, K.steelD, { rz: Math.PI / 2, gloss:.45 });
  for (const lb of [-1.45, -.30, .85]) {
    A.put(1.30, lb, .21, .80, .09, 1.795, K.steelD, { hard:true, gloss:.34, ...MT.steel });
    LIVE.lamps.push(A.dynamicVisual(
      A.cap(1.30, lb, 1.720, .034, .70, .034, C('#ffb457'), { mode:1, glow:.30, rz: Math.PI / 2 })));
  }
  A.cap(1.22, -.275, 1.60, .013, 3.14, .013, K.chrome, { rz: Math.PI / 2, gloss:.50 });
  for (let i = 0; i < 9; i++) {
    const tb = -1.60 + i * .38;
    LIVE.checks.push(A.dynamicVisual(A.put(1.215, tb, .006, .085, .125, 1.532, K.paper,
      { hard:true, mode:1, glow:.05, rz: ((i * 7) % 3 - 1) * .10 })));
  }
  chillies(1.30, -1.85, 1.80);
  chillies(1.30, 1.30, 1.80);

  // ---- what is standing on the pass, waiting to go out.
  for (const [db, big, fl] of [[-1.62, true, K.oil], [-1.24, false, C('#c48a3e')],
                               [-.86, true, K.oil], [-.42, false, C('#d8c79a')],
                               [.02, false, C('#c48a3e')], [.42, true, K.oil]])
    bowl(1.35, db, 1.00, big, fl);
  A.cyl(1.33, -1.05, 1.015, .135, .032, K.china, { gloss:.30 });
  A.cyl(1.33, -1.05, 1.055, .095, .05, C('#8f3b1f'), { gloss:.22 });
  steamer(1.34, .80, 1.00, 2);
  // 剁椒 — jars of chopped salted chilli, the thing this kitchen is actually about.
  for (const jb of [1.02, 1.20]) {
    A.cyl(1.36, jb, 1.10, .072, .21, K.chilli, { gloss:.52 });
    A.cyl(1.36, jb, 1.225, .076, .045, K.goldL, { gloss:.55 });
  }
  // The docket printer and the call bell at the end of the pass, which is where a pass ends.
  A.put(1.34, -2.05, .22, .17, .14, 1.060, K.trim, { hard:true, gloss:.34 });
  LIVE.docket = A.dynamicVisual(
    A.put(1.34, -2.05, .18, .13, .012, 1.136, K.paper, { hard:true, mode:1, glow:.06 }));
  A.ball(1.34, -2.32, 1.045, .045, .038, .045, K.chrome, { gloss:.60 });
  A.cyl(1.34, -2.32, 1.005, .050, .020, K.trim, { gloss:.40 });

  // =============================================================== menu board, flat on the wall
  // On the wall rather than hung out over the pass. Hung forward it is nearer the eye, so the top
  // of it climbs out of the frame and the board reads as a beam across the ceiling; flat at
  // a = 0.70 the whole of it sits inside the view cone from the door and can be read.
  //
  // What is written on it is the till's own list. It used to carry six Hunan dishes at six prices
  // and the counter sold five different ones at five other prices, so the board a player was
  // being taught to read was a board that could not be ordered from — 剁椒鱼头 68 was on the wall
  // and nowhere in the shop. These are MALL_GOODS['餐厅'] in js/data.js, character for character
  // and kuai for kuai, so reading the wall and paying at the till are the same transaction.
  A.put(.70, -.25, .08, 3.30, .97, 2.535, K.trim, { hard:true, gloss:.22 });
  A.put(.76, -.25, .04, 3.12, .81, 2.525, K.menu, { hard:true, mode:1, glow:.15 });
  A.put(.775, -.25, .02, 3.12, .19, 2.835, K.lacq, { hard:true, mode:1, glow:.09 });
  A.glyph(.795, -.25, 2.833, '今 日 菜 单   M E N U',
    { size:.100, gap:.030, color:K.goldL, glow:.13 });
  // Left-hand column at +b, right-hand column at -b: the frame is mirrored about the shop's own
  // axis, so a menu authored in b-order reads back to front unless it is written this way round.
  [['宫保鸡丁 48', .58, 2.62, 1], ['汤 22', -1.06, 2.62, 0],
   ['麻婆豆腐 38', .58, 2.40, 1], ['米饭 5', -1.06, 2.40, 0],
   ['啤酒 12', .58, 2.18, 0], ['茶 免费', -1.06, 2.18, 0]]
    .forEach(([t, mb, my, hot]) =>
      A.glyph(.795, mb, my, t,
        { size:.135, gap:.038, color: hot ? C('#96291f') : K.ink, glow:.02 }));

  // =============================================================== drinks fridge, b +1.55..+2.50
  // It was one solid box 70 cm deep with the lit interior, four shelves and twenty-four cans
  // built *inside* it: fifty props behind a face nobody could see through, and from the room a
  // grey locker. A cooler is a carcass — back, two sides, top and bottom — with glass across the
  // front, so it is built as five thin panels and the stock is what you see.
  A.put(.68, 2.025, .06, .95, 2.00, 1.00, C('#41494e'), { hard:true, gloss:.24, ...MT.steel });
  for (const sb of [1.575, 2.475])
    A.put(.98, sb, .62, .05, 2.00, 1.00, K.fridge, { hard:true, gloss:.28, ...MT.steel });
  A.put(.98, 2.025, .62, .95, .10, .05, K.fridge, { hard:true, gloss:.28, ...MT.steel });
  A.put(.98, 2.025, .62, .95, .14, 1.93, K.fridge, { hard:true, gloss:.28, ...MT.steel });
  A.put(.72, 2.025, .03, .84, 1.72, 1.02, K.fridgeIn, { hard:true, mode:1, glow:.15 });
  const DRINK = [C('#3f7f4e'), C('#b8352c'), C('#d9962f'), C('#356f9c'), C('#c9c2ae'), C('#7a4f9c')];
  for (let s = 0; s < 4; s++) {
    const sy = .28 + s * .40;
    A.put(.98, 2.025, .58, .86, .026, sy, K.chrome, { hard:true, gloss:.44 });
    for (let i = 0; i < 6; i++) {
      const db = 1.635 + i * .155, c = DRINK[(i + s) % 6];
      A.cyl(1.02, db, sy + .105, .036, .18, c, { gloss:.46 });
      A.cyl(1.02, db, sy + .208, .022, .04, K.chrome, { gloss:.50 });
      A.cyl(.86, db, sy + .105, .036, .18, DRINK[(i + s + 3) % 6], { gloss:.46 });
    }
  }
  A.put(1.285, 2.025, .03, .86, 1.78, 1.02, C('#cfe4ee'), { hard:true, mode:1, alpha:.11, gloss:.55 });
  for (const fb of [1.575, 2.475]) A.put(1.30, fb, .05, .07, 1.84, 1.02, K.steelD, { hard:true, gloss:.42 });
  for (const fy of [.13, 1.95]) A.put(1.30, 2.025, .05, .95, .07, fy, K.steelD, { hard:true, gloss:.42 });
  A.cap(1.33, 2.44, 1.02, .022, 1.30, .022, K.chrome, { gloss:.55 });               // door handle
  A.put(1.28, 2.025, .06, .95, .24, 2.11, K.lacq, { hard:true, mode:1, glow:.12 });
  A.glyph(1.315, 2.025, 2.108, '饮 料', { size:.145, gap:.055, color:K.goldL, glow:.14 });

  // The drinks offer is posted on the drinks fridge.  One paper face and seventeen prebuilt glyph
  // quads are the entire card; the common headline stays static and the existing kitchen callback
  // reveals either of two prebuilt status rows only when the commerce state crosses noon.  The
  // common line is deliberately “优惠”, not “免费”: after noon it remains truthful beside
  // 今日已结束, and only eleven glyphs enter the dynamic upload path.
  const drinkContract = RestaurantSys.offerContract();
  const drinkCardFace = A.put(1.315, 2.025, .018, .72, .34, 1.53, K.paper,
    {hard:true, mode:1, glow:.025});
  drinkCardFace.mallOfferId = drinkContract.id;
  const drinkHeadline = A.glyph(1.330, 2.025, 1.590, drinkContract.card.headline,
    {size:.062, gap:.018, color:K.chilliD, glow:.025});
  const drinkActive = A.glyph(1.330, 2.025, 1.475, drinkContract.card.active,
    {size:.060, gap:.017, color:K.ink, glow:.015, alpha:.001});
  const drinkEnded = A.glyph(1.330, 2.025, 1.475, drinkContract.card.ended,
    {size:.060, gap:.017, color:K.ink, glow:.015, alpha:.001});
  A.dynamicVisual(drinkActive, drinkEnded);
  for (const p of drinkHeadline) {
    p.mallOfferId = drinkContract.id; p.mallOfferState = 'all';
  }
  for (const p of drinkActive) {
    p.mallOfferId = drinkContract.id; p.mallOfferState = 'active';
  }
  for (const p of drinkEnded) {
    p.mallOfferId = drinkContract.id; p.mallOfferState = 'ended';
  }
  const drinkCard = { headline:drinkHeadline, active:drinkActive, ended:drinkEnded };

  // =============================================================== banquette corner, b +2.60..
  // A lattice screen on the timber wall, a lantern in front of it, and an oxblood banquette under.
  for (let i = 0; i < 9; i++)
    A.put(.68, 2.62 + i * .195, .045, .038, 1.62, 2.06, K.latt, { hard:true, gloss:.20 });
  for (let j = 0; j < 6; j++)
    A.put(.68, 3.395, .045, 1.60, .038, 1.29 + j * .308, K.latt, { hard:true, gloss:.20 });
  A.put(1.00, 3.375, .68, 1.55, .38, .19, K.woodDk, { hard:true, gloss:.20, ...MT.wood });
  A.put(1.00, 3.375, .68, 1.55, .12, .44, K.uphol, { mode:7, round:.04, gloss:.10, ...MT.cloth });
  A.put(.78, 3.375, .20, 1.55, .66, .83, K.uphol, { mode:7, round:.05, gloss:.10, ...MT.cloth });
  A.put(.78, 3.375, .24, 1.59, .06, 1.19, K.woodDk, { hard:true, gloss:.26, ...MT.wood });
  for (const cb of [2.95, 3.80])
    A.put(.88, cb, .16, .36, .30, .70, K.upholL, { mode:7, round:.07, gloss:.08, ...MT.cloth });
  lantern(1.05, 3.375, 2.28);
  // The banquette's own table, laid for two: one place on the bench and one on a chair opposite,
  // which is what makes the corner a table rather than a sofa with a stand beside it. The two
  // settings sit across the table from each other rather than side by side — laid side by side,
  // the outer one's cup landed 3 cm past the edge of a 42 cm top and hung in the air.
  A.cyl(1.78, 3.375, .40, .065, .76, K.trim, { gloss:.46, ...MT.steel });
  A.cyl(1.78, 3.375, .245, .21, .05, K.trim, { gloss:.42, ...MT.steel });
  A.cyl(1.78, 3.375, .805, .42, .07, K.woodM, { gloss:.24, ...MT.wood });
  caddy(1.78, 3.375, .840);
  setting(1.58, 3.375, -1, .840, -1);
  setting(1.98, 3.375, 1, .840, 1);
  chair(2.46, 3.375, -1, 0);
  A.cyl(1.78, 3.115, .900, .062, .05, K.china, { gloss:.32 });
  A.cyl(1.78, 3.115, .990, .048, .13, K.china, { gloss:.34 });     // a pot of tea
  A.cap(1.83, 3.045, .980, .012, .09, .012, K.china, { rz:1.1, gloss:.34 });

  // =============================================================== dining floor
  // Two four-tops down the right-hand half, which is the only part of the floor deep enough for a
  // chair on both sides of a table: the pass front is at a = 1.58 and the window platform starts
  // at 3.66, so a table on the centre line of that gap has 64 cm each way for a seat, and that is
  // exactly one row. The left half is the fridge, the banquette and the till, and the middle is
  // the way in — the three tables that used to be scattered across all of it put a chair in the
  // doorway and stood another one on the window plinth.
  fourTop(2.62, -2.05);
  fourTop(2.62, -3.52);

  // A clean table is already laid above. Occupancy adds the small, untidy second layer a diner
  // leaves behind: a used side plate, a little food remnant, a tea glass and the red reservation
  // marker the host removes when the party sits. These twelve retained pieces are matrix-hidden
  // while their table is free, so RestaurantSys.occupied() now describes the physical room as
  // well as the host panel. They remain in the opaque instance path and add no transparency.
  const occupiedSet = (id, a, b, top, side = 1) => {
    const specs = [
      [A.cyl(a + .15, b - side * .15, top + .022, .090, .022, K.china,
        { gloss:.27 }), a + .15, b - side * .15, top + .022],
      [A.ball(a + .17, b - side * .13, top + .049, .027, .014, .024, K.chilliD,
        { mode:7, gloss:.18 }), a + .17, b - side * .13, top + .049],
      [A.cyl(a - .16, b + side * .17, top + .060, .029, .100, C('#9f6842'),
        { mode:1, alpha:.82, gloss:.42 }), a - .16, b + side * .17, top + .060],
      [A.put(a - .02, b + side * .27, .13, .055, .055, top + .036, K.lacq,
        { hard:true, gloss:.30 }), a - .02, b + side * .27, top + .036],
    ];
    LIVE.tables[id] = specs.map(([p, pa, pb, py]) => {
      A.dynamic(p, pa, pb, py, .24);
      const shown = p.m.slice ? p.m.slice() : p.m;
      const hidden = M.trs(shown[12], shown[13], shown[14], 0, 0, 0, 0);
      p.m = hidden;
      return { p, shown, hidden, on:false };
    });
  };
  occupiedSet('A', 1.78, 3.375, .840, -1);
  occupiedSet('B', 2.62, -3.52, .7825, 1);
  occupiedSet('C', 2.62, -2.05, .7825, -1);

  // The player's order needs to land on whichever of the three real tables the host assigned.
  // Three two-prop dishes per table are the smallest honest pool: distinct silhouettes and colours,
  // but still one retained plate and one retained food mass per slot. After eating the food mass
  // shrinks to a remnant; settlement resets RestaurantSys.state and the next tick clears the table.
  const servedSet = (id, points, top) => {
    LIVE.orders[id] = points.map(([a, b], i) => {
      const plate = A.cyl(a, b, top + .019, .112, .026, K.china, { gloss:.30 });
      const food = i === 0
        ? A.ball(a, b, top + .075, .075, .040, .065, K.chilli, { mode:7, gloss:.20 })
        : i === 1
          ? A.ball(a, b, top + .067, .052, .070, .052, C('#4f7b45'), { mode:7, gloss:.22 })
          : A.ball(a, b, top + .065, .085, .032, .070, C('#a96c32'), { mode:7, gloss:.20 });
      const retain = (p, py) => {
        A.dynamic(p, a, b, py, .20);
        const shown = p.m.slice ? p.m.slice() : p.m;
        const hidden = M.trs(shown[12], shown[13], shown[14], 0, 0, 0, 0);
        p.m = hidden;
        return { p, shown, hidden, state:0 };
      };
      const foodRef = retain(food, top + .075);
      foodRef.used = foodRef.shown.slice ? foodRef.shown.slice() : foodRef.shown;
      for (let j = 0; j < 12; j++) foodRef.used[j] *= .28;
      return { plate:retain(plate, top + .019), food:foodRef };
    });
  };
  servedSet('A', [[1.61, 3.27], [1.82, 3.57], [1.98, 3.30]], .840);
  servedSet('B', [[2.43, -3.78], [2.62, -3.27], [2.81, -3.72]], .7825);
  servedSet('C', [[2.43, -2.31], [2.62, -1.80], [2.81, -2.25]], .7825);
  for (const tb of [-2.05, -3.52]) {
    // A pendant over each. Hung at 2.28 rather than 2.60: from the doorway the top of the view
    // cone is at 2.30 over the middle tables, and a lamp entirely above the frame is a lamp that
    // lights nothing you can see.
    A.cyl(2.62, tb, 2.93, .009, 1.16, K.trim, { gloss:.2 });
    A.cyl(2.62, tb, 2.285, .165, .20, K.lacq, { gloss:.30 });
    A.cyl(2.62, tb, 2.178, .150, .026, C('#ffbe72'), { mode:1, glow:.18 });
    A.cyl(2.62, tb, 2.392, .080, .03, K.gold, { gloss:.44 });
  }
  lantern(2.25, -1.35, 2.24, .155);
  lantern(2.25, 1.35, 2.24, .155);

  // =============================================================== front of house
  // The till doubles as the host stand, which is what 收银台 is in a place this size. It sits at
  // a = 2.50 so the spot the player is walked to for it (a + dp/2 + 0.85) lands on the floor and
  // not on the window platform behind it.
  A.counter(2.50, 3.65, .85, .55, K.woodDk);
  // Its top is already carrying a terminal, a card reader and the POS, so the dressing goes on
  // the floor beside it rather than fighting them for the same 30 centimetres.
  A.cyl(2.98, 4.00, .18, .175, .36, K.lacq, { gloss:.24 });                        // a planter
  A.ball(2.98, 4.00, .52, .21, .19, .21, C('#39714a'), { mode:7, gloss:.08 });
  A.ball(2.98, 3.92, .70, .13, .14, .13, C('#43824f'), { mode:7, gloss:.08 });

  // The waiting bench, just inside the door on the right, facing into the room.
  A.put(3.30, 1.05, .48, 1.20, .30, .17, K.woodDk, { hard:true, gloss:.22, ...MT.wood });
  A.put(3.30, 1.05, .50, 1.24, .10, .37, K.uphol, { mode:7, round:.04, gloss:.10, ...MT.cloth });
  A.put(3.50, 1.05, .12, 1.24, .44, .64, K.uphol, { mode:7, round:.05, gloss:.10, ...MT.cloth });
  A.put(3.51, 1.05, .16, 1.28, .05, .885, K.woodDk, { hard:true, gloss:.26, ...MT.wood });
  for (const bb2 of [.70, 1.40])
    A.put(3.42, bb2, .14, .30, .26, .55, K.upholL, { mode:7, round:.06, gloss:.08, ...MT.cloth });

  // The host podium beside it, with the menu standing on a slope and a little lamp over it.
  A.put(3.35, 1.95, .46, .48, 1.02, .51, K.woodDk, { hard:true, gloss:.24, ...MT.wood });
  A.put(3.35, 1.95, .52, .54, .05, 1.045, K.chrome, { hard:true, gloss:.40, ...MT.steel });
  A.put(3.30, 1.95, .05, .34, .30, 1.22, K.lacq, { hard:true, gloss:.28 });
  A.glyph(3.335, 1.95, 1.22, '菜 单', { size:.11, gap:.04, color:K.goldL, glow:.12 });
  A.put(3.30, 1.95, .11, .13, .03, 1.50, K.lamp, { hard:true, mode:1, glow:.18 });
  A.cyl(3.30, 1.95, 1.44, .010, .22, K.steelD, { gloss:.40 });

  // A lantern in each window, so the shopfront says restaurant from out on the concourse.
  lantern(4.20, -2.90, 1.92, .155);
  lantern(4.20, 2.90, 1.92, .155);

  // The static haze above each hot vessel gives the kitchen depth in a still frame; these three
  // short, differently phased plumes supply the actual upward travel.  They share the mall's puff
  // pool and update only near this ground-floor unit.
  A.steam(.86, .26, 1.28, {n:4,height:.44,spread:.17,alpha:.38,speed:.18,duty:.78,phase:.04});
  A.steam(.84,-1.52,1.64, {n:5,height:.48,spread:.20,alpha:.42,speed:.15,duty:.86,phase:.31});
  A.steam(.95,-2.30,1.38, {n:4,height:.42,spread:.16,alpha:.36,speed:.17,duty:.70,phase:.62});

  // =============================================================== the kitchen working
  // The one motion this shop needs and the only one it gets. Everything in it is a glow, so it is
  // fourteen numbers written per frame and no matrices at all, and it is culled at 18 m — from the
  // far side of the concourse this room costs nothing.
  //
  // Three things happen and they are all the same fact seen from different ends of the pass:
  //
  //   the rings surge. A wok is tossed roughly twice a second and the flame comes up round the
  //     side of the pan each time it goes over. Two rings, offset in phase, because a two-hole
  //     range with both burners flaring in step is a special effect and not a kitchen.
  //   the checks come up the rail one at a time. The docket the pass is on is the lit one; the
  //     printer's paper flashes when the next one lands. That is the whole visual grammar of an
  //     expo and it is nine props already built.
  //   how hard all of it works is RestaurantSys.busy(), which is the same number the host stand
  //     quotes a waiting time off. At half past six the range is flaring and eight checks are up;
  //     at four in the afternoon one ring idles and the rail is nearly dark. The room and the
  //     front of house agree because there is one function, not two.
  //
  // `minutes` and the day come in from the tick; `RestaurantSys` is a global by the time any frame
  // runs, but it is read defensively anyway — a fit-out that throws once a frame is a black room.
  A.motion('kitchen', (t, st, P, minutes) => {
    let heat = .35, dayNo = 1, taken = new Set();
    try {
      const g = window.__game;
      if (g && g.state) dayNo = Math.max(1, g.state().day | 0);
      heat = window.RestaurantSys.busy(dayNo, minutes | 0);
      taken = window.RestaurantSys.occupied(dayNo, minutes | 0);
    } catch (e) {}
    // The free-drink state changes at one commerce boundary, not at frame rate.  No glyph or
    // string is built here; a transition only changes alpha on the retained rows above.
    try {
      const offer = window.RestaurantSys.offerState(minutes, false);
      if (offer && offer.key !== st.drinkOfferKey) {
        const active = offer.key === 'active';
        for (const p of drinkCard.active) p.alpha = active ? 1 : .001;
        for (const p of drinkCard.ended) p.alpha = active ? .001 : 1;
        st.drinkOfferKey = offer.key;
        st.drinkOfferAvailable = offer.available ? 1 : 0;
        st.drinkOfferEndsAt = offer.endsAt;
      }
    } catch (e) { /* a blank retained card is safer than an invented offer */ }
    const occupiedIds = ['A', 'B', 'C'].filter(id => taken.has(id));
    const occupiedKey = occupiedIds.join('') || '-';
    if (occupiedKey !== st.occupiedIds) {
      for (const id of ['A', 'B', 'C']) {
        const on = taken.has(id);
        for (const q of LIVE.tables[id] || []) if (q.on !== on) {
          q.on = on;
          q.p.m = on ? (q.shown.slice ? q.shown.slice() : q.shown) : q.hidden;
        }
      }
      st.occupiedIds = occupiedKey;
      st.occupiedCount = occupiedIds.length;
      st.occupiedMask = (taken.has('A') ? 1 : 0) | (taken.has('B') ? 2 : 0) |
        (taken.has('C') ? 4 : 0);
    }
    let meal = null;
    try { meal = window.RestaurantSys.state; } catch (e) {}
    const mealTable = meal && meal.placed ? String(meal.table || '') : '';
    const mealLines = mealTable && Array.isArray(meal.order) ? meal.order.slice(0, 3) : [];
    const targets = mealTable === 'BC' ? ['B', 'C'] : (LIVE.orders[mealTable] ? [mealTable] : []);
    const dishKey = `${targets.join('')}:${mealLines.map(o => o.hz).join(',')}:${meal && meal.ate ? 2 : 1}`;
    if (dishKey !== st.playerDishKey) {
      const active = [];
      for (let i = 0; i < mealLines.length; i++) {
        const tableId = targets[Math.min(targets.length - 1, mealTable === 'BC' && i > 1 ? 1 : 0)];
        const slot = LIVE.orders[tableId] && LIVE.orders[tableId][mealTable === 'BC' && i > 1 ? i - 2 : i];
        if (slot) active.push(slot);
      }
      const activeSet = new Set(active);
      for (const tableId of ['A', 'B', 'C']) for (const slot of LIVE.orders[tableId] || []) {
        const show = activeSet.has(slot), eaten = show && !!(meal && meal.ate);
        const plateState = show ? 1 : 0;
        if (slot.plate.state !== plateState) {
          slot.plate.state = plateState;
          slot.plate.p.m = show ? (slot.plate.shown.slice ? slot.plate.shown.slice() : slot.plate.shown)
            : slot.plate.hidden;
        }
        const foodState = show ? (eaten ? 2 : 1) : 0;
        if (slot.food.state !== foodState) {
          slot.food.state = foodState;
          slot.food.p.m = foodState === 1
            ? (slot.food.shown.slice ? slot.food.shown.slice() : slot.food.shown)
            : foodState === 2 ? (slot.food.used.slice ? slot.food.used.slice() : slot.food.used)
              : slot.food.hidden;
        }
      }
      st.playerDishKey = dishKey;
      st.playerDishCount = active.length;
      st.playerMealState = active.length ? (meal && meal.ate ? 2 : 1) : 0;
    }
    const load = .22 + heat * .78;                          // never fully off: a pilot light stays lit
    // Two tosses a second at the rush, a slow simmer when it is quiet.
    const toss = 1.1 + heat * 1.1;
    LIVE.rings.forEach((p, i) => {
      const s = .5 + .5 * Math.sin(t * toss * 6.283 + i * 2.1);
      p.glow = .11 + load * (.10 + s * .17);
    });
    // The heat lamps hold steady and only lift when there is food under them.
    LIVE.lamps.forEach((p, i) => { p.glow = .18 + load * .16 + .012 * Math.sin(t * .7 + i); });
    LIVE.lip.glow = .10 + load * .07;
    // How many checks are up, and which one the pass is calling. `step` walks the live ones only,
    // so at a quiet hour it is not marching a highlight across eight blank tickets.
    const up = Math.max(1, Math.round(load * LIVE.checks.length));
    const at = Math.floor(t * (.35 + heat * .55)) % up;
    LIVE.checks.forEach((p, i) => { p.glow = i >= up ? .012 : (i === at ? .21 : .06); });
    if (LIVE.docket) LIVE.docket.glow = .04 + (((t * (.2 + heat * .5)) % 1) < .12 ? .16 : 0);
    st.heat = +heat.toFixed(3); st.checksUp = up; st.calling = at;
  }, { far:18 });

  // =============================================================== light
  // Three, which is what a tenant can safely declare: eight reach the shader and the nearest to
  // the camera win, so standing in this shop these are the near ones. Warm and low over the
  // tables, brighter and a shade cooler over the pass, warm again in the banquette corner — that
  // last one used to stand a metre off the lattice screen at 0.32 and turned it into gold foil.
  A.light(2.62, -2.70, 2.35, [1.00, 0.84, 0.62], .42, 3.6);
  A.light(1.55, -0.40, 2.05, [1.00, 0.93, 0.80], .46, 3.2);
  A.light(2.30, 2.95, 2.20, [1.00, 0.82, 0.60], .26, 2.8);

  // =============================================================== collision
  A.stop(.40, 1.62, -4.20, 1.45);      // kitchen and pass
  A.stop(.55, 1.35, 1.50, 2.55);       // fridge
  A.stop(.60, 1.42, 2.55, 4.20);       // banquette
  A.stop(1.34, 2.22, 2.92, 3.83);      // its table
  A.stop(1.75, 3.50, -2.72, -1.38);    // the near four-top, chairs included
  A.stop(1.75, 3.50, -4.19, -2.85);    // and the far one
  A.stop(3.02, 3.58, .40, 1.70);       // waiting bench
  A.stop(3.08, 3.62, 1.68, 2.24);      // host podium

  // =============================================================== the words on the wall
  A.th('餐厅', 5.15, 0, '两位，靠窗可以吗？', 'Table for two — by the window?',
    '餐 meal + 厅 hall.', 2.2, 2.5);
  // Standing in front of the pass, reading the board over it. The sentence is one off the board:
  // 宫保鸡丁 is the top line of the menu and the first thing on the till's list, so this is a
  // thing you can say and then go and do.
  A.th('菜单', .80, -.25, '我要一个宫保鸡丁。', "I'll have the kung pao chicken.",
    '菜 dish + 单 list.', 2.6, 2.45);
  // The cooler, and the lantern hanging in the window. Both are placed so that the spot the
  // player is walked to lands on open floor: `th` puts that spot 1.15 m out from the thing, which
  // for anything at a table or against the waiting bench is inside a collider, and a word you can
  // see but never be walked to is a word that never comes up.
  A.th('饮料', .95, 2.025, '有冰的饮料吗？', 'Have you got anything cold to drink?',
    '饮 to drink + 料 stuff.', 1.9, 1.7);
  A.th('灯笼', 4.20, 2.90, '灯笼是红的。', 'The lanterns are red.',
    '灯 lamp + 笼 cage — a lamp in a cage of paper.', 2.0, 1.95);

  // ---- one more, and the three that were deleted again.
  //
  // 等位, 忌口 and 打包 were all built here as `A.th` cards and all three were taken out again,
  // because `openWord` in js/game.js opens with `const e = Vocab.get(hz); if (!e) return;` — a
  // headword that is not a row in js/vocab.js is not a quiet card, it is a hotspot that does
  // nothing at all when you press it. None of those three is in vocab.js. This file's neighbour
  // js/mall-flowers.js had already written the rule down ("a label pointing at a verb that does
  // not exist is a dead prop") and this is what breaking it looks like.
  //
  // So the front-of-house vocabulary stays where it already was and where it works: in 苗雪's and
  // 彭燕's lines in the cast at the bottom of this file, said out loud, and in RestaurantSys's own
  // panels, which carry pinyin and a gloss on every row and do not go through Vocab at all. The
  // report lists 等位, 忌口, 打包, 发票 and 领班 as a request against js/vocab.js.
  //
  // 买单 survives because 买单 *is* a row in js/vocab.js. Its focus is aimed by hand for the usual
  // reason: `th()` puts the walk-to point 1.15 m out at +a, which from the till lands in the
  // shopfront glazing. (2.90, 2.70) puts the body at 2.60–3.20 by 2.40–3.00 at the real 0.30 m
  // radius — the counter starts at b 3.225 and the podium's collider ends at b 2.24, so it is the
  // gap between them with 22 cm to spare each side. Checked against the collider list twenty lines
  // above by arithmetic, not by eye; it has not been flood-filled, which is stated in the report.
  const bill = A.th('买单', 2.50, 3.35, '买单，我们AA。', "The bill — we're splitting it.",
    '买 to buy + 单 the docket. AA制 is normal among colleagues and a small insult among close '
    + 'friends; 我请客 wǒ qǐng kè is the other half of the same argument.', 1.8, 1.20);
  bill.focus = A.at(2.90, 2.70);
};

// ---------------------------------------------------------------------------------------------
// The two window bays, which are the only part of this shop most people ever see. The shell
// dresses an undressed window with plinths of generic goods — for a restaurant that came out as
// six white tubs with black lids standing on black boxes, which reads as a paint shop — so this
// is the 食品模型 display every Chinese restaurant of this kind has in its glass: dishes in wax
// on stepped risers, a steamer tower, a lantern over them, and the prices on cards.
//
// It is reached through `MallFit['餐厅:win']`, which shop() resolves with the tenant's other
// colon-keyed storefront registrations and calls with
// the window toolkit, the centre of the bay in `b`, and which side of the door it is. That
// toolkit is a smaller one than the fit's: put/cyl/ball/cap/taper and nothing else, and no
// glyphs, so everything here is shape.
//
// `a` runs outward toward the concourse. The platform is 3.66–4.71 with its top at y 0.34, the
// stall riser in front of it comes up to 0.42, and the glass is at 4.78 — so anything shorter
// than about 0.10 above the platform is hidden behind the riser from the aisle.
MallFit['餐厅:win'] = (W, mid, side) => {
  const woodR = C('#4a3524'), cloth = C('#7d2a22'), china = C('#f2ece0'), gold = C('#c1932f');
  const sauce = [C('#a8321f'), C('#c07a2a'), C('#8d4a22'), C('#6d8a3a')];
  // A cloth-covered plinth and two steps behind it, so the dishes are on three levels rather
  // than in a line. Depth outward: the tallest step goes furthest back.
  W.put(4.02, mid, .96, 2.30, .10, .39, cloth, { mode:7, round:.03, gloss:.08,
    mat:'fabric', matScale:.5, matAmt:.20, nrmAmt:.30 });
  W.put(3.86, mid, .34, 2.20, .16, .52, woodR, { hard:true, gloss:.22,
    mat:'wood', matScale:.9, matAmt:.28, nrmAmt:.30 });
  W.put(4.12, mid, .34, 2.20, .08, .48, woodR, { hard:true, gloss:.22,
    mat:'wood', matScale:.9, matAmt:.28, nrmAmt:.30 });
  // Nine wax dishes across the three levels. A dish is a plate, a mound of something and a
  // sauce disc — three pieces, all of them the same three meshes at every station, so the whole
  // display batches down to a handful of calls.
  const dish = (a, b, y, r, c) => {
    W.cyl(a, b, y + .010, r, .020, china, { gloss:.34 });
    W.taper(a, b, y + .050, r * 1.42, .062, r * 1.42, china, { rz: Math.PI, gloss:.32 });
    W.ball(a, b, y + .086, r * .62, .030, r * .62, c, { gloss:.24 });
  };
  for (let i = 0; i < 4; i++) dish(3.86, mid - .82 + i * .55, .60, .085, sauce[i % 4]);
  for (let i = 0; i < 3; i++) dish(4.12, mid - .56 + i * .56, .52, .092, sauce[(i + 2) % 4]);
  for (let i = 0; i < 2; i++) dish(4.36, mid - .30 + i * .60, .44, .098, sauce[(i + 1) % 4]);
  // Price cards, leaning. Blank card stock at this size — a glyph in a window seen from six
  // metres is four pixels of grey and one draw call each.
  for (let i = 0; i < 4; i++)
    W.put(3.98, mid - .82 + i * .55, .012, .085, .055, .555, C('#efe7d4'),
      { hard:true, mode:1, glow:.05, rz: ((i * 5) % 3 - 1) * .12 });
  // A steamer tower at the back of the bay, on the side nearer the door, and a chilli jar
  // opposite it — the two silhouettes that say what kind of restaurant this is.
  for (let i = 0; i < 4; i++)
    W.cyl(3.82, mid + side * .92, .60 + i * .082, .112, .082,
      i % 2 ? C('#a87f4c') : C('#b58a54'), { gloss:.12, mat:'wood', matScale:.9, matAmt:.28, nrmAmt:.30 });
  W.cyl(3.82, mid + side * .92, .952, .116, .044, C('#c7a469'),
    { gloss:.14, mat:'wood', matScale:.9, matAmt:.28, nrmAmt:.30 });
  W.cyl(3.82, mid - side * .92, .70, .105, .30, C('#b8301f'), { gloss:.50 });
  W.cyl(3.82, mid - side * .92, .868, .110, .050, C('#f0cf7d'), { gloss:.55 });
  // And a lantern over the display, hung off the soffit the shell already lights from.
  W.cyl(4.05, mid, 2.34, .006, 1.30, C('#2b2e31'), { gloss:.2 });
  W.cyl(4.05, mid, 1.72, .048, .050, gold, { gloss:.45 });
  W.ball(4.05, mid, 1.53, .165, .140, .165, C('#cf3f34'), { mode:1, glow:.15 });
  W.cyl(4.05, mid, 1.34, .042, .042, gold, { gloss:.45 });
  W.cap(4.05, mid, 1.22, .015, .18, .015, C('#cf3f34'), { mode:1, glow:.12 });
};

// ---------------------------------------------------------------------------------------------
// 湘满楼's own people
// ---------------------------------------------------------------------------------------------
// This shop had none. The kitchen alcove at the back of the pass was built — and commented at the
// top of this file — as the place "the chef in MallCast at the bottom of this file stands in", and
// there was no MallCast at the bottom of this file: the note described a person who did not exist,
// and the hatch has been framing an empty kitchen ever since. That is corrected here.
//
// Pushed onto MallCast (declared at the top of js/mall.js), which game.js folds into NPCS before
// the roster is initialised. Ordinary NPC rows: nothing here is special-cased for this shop.
//
// Every coordinate below is in the MALL's world frame, not the shop's. This unit is
// shop('S', 10.8, 8.6), and side S maps (a, b) to [u + b, RZ - a] with u 10.8 and RZ 18 — so
//
//     x = 10.8 + b        z = 18 - a
//
// and a yaw is atan2(dx, dz), which on this wall makes PI "looking out at the concourse" (that is
// -z, which is +a), 0 "looking at the back wall", +PI/2 "+b" and -PI/2 "-b". Getting that backwards
// is how you get a waiter serving the fridge.
//
// Every standing position below was checked against this file's own colliders — listed under
// "collision" in the fit above — at the real 0.30 m body radius, not eyeballed:
//
//   谭建国  a 1.02, b -0.95. The prep alcove: the bench behind him stops at a 0.88 because the
//           middle section of it is half depth, and the pass in front starts at 1.18. That 0.30 m
//           gap is the only floor in this kitchen a body fits in, and it is the whole reason the
//           bench was built in three pieces. Facing +a, so he is seen through the hatch.
//   苗雪    a 2.72, b 1.95. In front of the host podium (collider starts a 3.08) and clear of the
//           waiting bench (which ends at b 1.70). Facing the door, which is what a 领班 does.
//   彭燕    a 2.62, b -1.00. Beside the near four-top, outside its collider (ends b -1.38) and
//           well past the pass (ends a 1.62). Turned to the tables she is working.
//
// Six, and every one of them is load-bearing. A 外卖员 waiting at the pass and a customer walking
// the aisle were both built and both cut again on the frame budget: takeaway is a row in the panel
// and does not need a body to stand next to, and the concourse's own crowd routes already run
// past this door. What is left is the three the front of house cannot work without — somebody in
// the kitchen, somebody at the podium and somebody carrying a tray — plus two people actually
// sharing a table, because a family-style room with one diner in it is not showing you anything,
// plus one number-holder on the bench, who is the only visible evidence the waitlist exists.
// That is +6 figures and +0 props in this unit; see the report for the measured cost.
//
// The three who are sitting down are on real seats: both diners are on chairs the `fourTop` helper
// actually built at (2.62 ± .64, -3.52 ± .315) with a pad top at y 0.4975, and the man on the
// waiting bench is on the cushion at b 0.85 with its top at 0.42. seatY is measured off those, not
// guessed — a body floating four centimetres over a chair is the single most visible NPC fault
// in this building.
if (typeof MallCast !== 'undefined') {
  const RX2 = b => 10.8 + b, RZ2 = a => 18 - a;
  MallCast.push(
    // ---- 厨师 谭建国. The man in the hatch. Everything he says is the kitchen's half of the four
    // things RestaurantSys asks you at the front of house: how hot, what is in it, what cannot be
    // changed, and what happens to the bit you do not finish.
    { hz:'厨师', name:'谭建国', py:'Tán Jiànguó', place:'mall', mallFloor:1,
      rig:'mall-diner-chef-tan-jianguo', temper:'busy',
      look:{ skin:'#c9925f', hair:'#1e1a17', hairStyle:'buzz', top:'#f2ece0', pants:'#3b4249',
        shoe:'#2b3035', hat:'cap', hatColor:'#f2ece0', tall:1.04, faceSeed:6451 },
      spots:[{ h0:10, h1:22, at:[RX2(-.95), RZ2(1.02)], face: Math.PI, act:'cook' }],
      lines:[['锅气得够，火不能小。', 'It needs wok heat — you cannot cook this on a low flame.'],
             ['剁椒鱼头没法做不辣的，那就不是这个菜了。',
              'There is no mild 剁椒鱼头. Take the chilli out and it stops being the dish.'],
             ['红烧肉一点辣椒都没有，是甜的。',
              '红烧肉 has no chilli in it at all — it is sweet.'],
             ['麻和辣不一样，麻是花椒。',
              '麻 and 辣 are not the same thing. 麻 is the numbness, and that is 花椒, Sichuan pepper.'],
             ['花生过敏一定要说，宫保鸡丁里全是花生。',
              'You must tell us about a peanut allergy — 宫保鸡丁 is full of them.'],
             ['豆腐可以做素的，肉末不放就行。',
              'The tofu can be done without meat — we just leave the mince out.'],
             ['菜都是一起端上去的，不分谁的。',
              'The dishes all go out together. None of them belongs to anybody in particular.']] },
    // ---- 领班 苗雪. The host stand, and the person the whole front of house hangs off: she is the
    // one who asks 几位 and the one who writes your number on the list.
    { hz:'领班', name:'苗雪', py:'Miáo Xuě', place:'mall', mallFloor:1,
      rig:'mall-diner-host-miao-xue', temper:'genial',
      look:{ skin:'#e7bb92', hair:'#241d1a', hairStyle:'bun', top:'#7d2a22', pants:'#2f353b',
        shoe:'#2b3035', vest:'#511a15', tall:.97, faceSeed:6452 },
      spots:[{ h0:10, h1:22, at:[RX2(1.95), RZ2(2.72)], face: Math.PI, act:'check' }],
      lines:[['几位？里边儿请。', 'How many of you? Come on in.'],
             ['现在满了，给您拿个号，前面还有三桌。',
              'We are full at the moment. Here is your number — three tables ahead of you.'],
             ['靠窗的那张要等一会儿，里边这张现在就能坐。',
              'The window table will be a few minutes; the one at the back you can have now.'],
             ['六个人的话，我把两张桌子拼起来。',
              'For six I will push two tables together.'],
             ['坐这儿等吧，叫到号我喊您。',
              'Have a seat and wait — I will call your number.'],
             ['不吃辣提前说，我在单子上写。',
              'If you do not eat chilli, say so now and I will write it on the docket.']] },
    // ---- 服务员 彭燕. The order, the 忌口 and the argument about the bill.
    { hz:'服务员', name:'彭燕', py:'Péng Yàn', place:'mall', mallFloor:1,
      rig:'mall-diner-waiter-peng-yan', temper:'brisk',
      look:{ skin:'#dcae86', hair:'#2b2320', hairStyle:'ponytail', top:'#e5d9bd', pants:'#3b434f',
        shoe:'#332e31', vest:'#71271f', tall:.99, faceSeed:6453 },
      spots:[{ h0:10, h1:22, at:[RX2(-1.00), RZ2(2.62)], face: -Math.PI / 2, act:'carry', held:'tray' }],
      lines:[['茶先给您倒上，茶是免费的。',
              'Let me pour the tea first — the tea is free.'],
             ['四个人点五个菜就够了，菜是放中间一起吃的。',
              'Five dishes is plenty for four. They go in the middle and everybody eats off them.'],
             ['主食是一人一份，米饭要几碗？',
              'Rice is per person — how many bowls?'],
             ['辣度要微辣、中辣还是特辣？',
              'How hot — 微辣, 中辣 or 特辣?'],
             ['香菜要不要？不要我跟厨房说。',
              'Coriander or not? I will tell the kitchen.'],
             ['吃不完打包吧，一个盒子两块。',
              'Take what is left home — the boxes are two kuai each.'],
             ['买单是一起还是AA？', 'One bill, or are you splitting it?'],
             ['扫码、现金、刷卡都行，发票要不要开？',
              'Scan the code, cash or card — and do you need a receipt?']] },
    // ---- two eating at the far four-top. On the chairs the fixture built, facing each other
    // across the dishes, which is the whole shape of a shared table.
    { hz:'顾客', place:'mall', mallFloor:1, temper:'genial', seatY:.50,
      look:{ skin:'#d5a37c', hair:'#332a25', hairStyle:'bob', top:'#8d6f86', pants:'#3c444f',
        shoe:'#e7e0d3', tall:1.00, faceSeed:6455 },
      spots:[{ h0:11, h1:22, at:[RX2(-3.205), RZ2(1.98)], face: Math.PI, act:'eat' }] },
    { hz:'顾客', place:'mall', mallFloor:1, temper:'steady', seatY:.50,
      look:{ skin:'#c9986e', hair:'#2c2521', hairStyle:'short', top:'#5f7688', pants:'#343b43',
        shoe:'#272c30', collar:'shirt', tall:1.06, faceSeed:6456 },
      spots:[{ h0:11, h1:22, at:[RX2(-3.205), RZ2(3.26)], face: 0, act:'eat' }] },
    // ---- and one on the waiting bench with a number in his hand, which is the only thing that
    // makes a waitlist visible from inside the room.
    { hz:'顾客', place:'mall', mallFloor:1, temper:'bored', seatY:.42,
      look:{ skin:'#eec19a', hair:'#211c19', hairStyle:'tousled', top:'#b5643f', pants:'#464e5a',
        shoe:'#eae3d6', tall:.98, faceSeed:6457 },
      spots:[{ h0:11, h1:14, at:[RX2(.85), RZ2(3.30)], face: 0, act:'phone' },
             { h0:18, h1:20, at:[RX2(.85), RZ2(3.30)], face: 0, act:'phone' }] },
  );
}
