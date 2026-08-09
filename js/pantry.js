// 冰箱 — what is actually in the flat, and what you can make out of it.
//
// The 超市 has five fixtures you can take things off, a printed price ticket on every one of them,
// a stack of red baskets by the door and a cashier who will not let you leave with an unpaid
// basket. It is a real shop. And then the entire trip collapsed, at the door of the fridge, into
// `stock += 2` — one integer called "meals". Nothing you bought survived being bought.
//
// That one collapse was load-bearing for more than it looked. With no item in the fridge there is
// no recipe, because there is nothing to cook *with*. There is no going off, because two meals on
// day one and two meals on day nine are the same two meals. There is no wrong quantity, which is
// the mistake a person actually makes in a foreign language at a till — you cannot buy 十斤 of
// something by mishearing 三 when the purchase is an increment. There is no gift, no leftovers,
// and no reason for a sale on eggs to be worth reading the sign for. A shopping trip could not
// be a bad shopping trip.
//
// So: lots, each with the day it came home stamped on it. That stamp is the whole difference. It
// is what makes the fish you bought on Monday a different object from the fish you bought on
// Thursday, and it is what lets the flat quietly get worse while you are not looking at it.
//
// The other half is that a full fridge is no longer the same thing as a meal. Raw 猪肉 and a bag
// of 米 feed nobody at eleven at night: you have to have forty minutes, and forty minutes is
// exactly what you do not have on a working morning. That is the tension the whole home ↔
// supermarket loop was supposed to have and never did — the shop is cheap and slow, the phone is
// fast and dear, and the fridge is where you find out which one you chose last time.
//
// Like career.js and story.js this is state and rules only. It draws nothing, it knows about no
// room, and it never touches `needs` or the HUD: it answers questions and reports what happened,
// and game.js is what turns that into a toast, a diary line or a number going down.
const Pantry = (() => {

  // ---- 商品 the things that can be in a flat.
  //
  // Every `hz` here has a row in the dictionary already. That is not a convenience, it is the
  // rule: Vocab.get has no fallback and a product the dictionary has never heard of is a crash on
  // the frame the fridge panel opens, in exactly the way .thingcheck.js exists to prevent for
  // walk-up things. Nothing goes in this table that is not already a word.
  //
  //   unit   the measure word, because 一袋米 and 一个鸡蛋 are not interchangeable and this is a
  //          game about the difference. It is also what a quantity mistake will be counted in.
  //   keeps  days before it goes off. 0 means dry goods — rice and salt do not spoil in a flat.
  //   n      how many servings one unit is worth, as an ingredient or eaten as it comes.
  //   raw    can be eaten with no cooking and no forty minutes. This is the field that decides
  //          whether a full fridge is any use to you at midnight.
  //   gain   what eating one serving of it raw does to you. Only meaningful when `raw`.
  const PRODUCTS = {
    // things you can just eat
    '方便面': { unit:'桶', keeps:0,  n:1, raw:true, gain:{ food:26, mood:-2 } },
    '面包':   { unit:'袋', keeps:3,  n:3, raw:true, gain:{ food:22, mood:3 } },
    '水果':   { unit:'袋', keeps:5,  n:3, raw:true, gain:{ food:16, mood:9 } },
    '牛奶':   { unit:'盒', keeps:5,  n:2, raw:true, gain:{ food:14, mood:4 } },
    '酸奶':   { unit:'盒', keeps:6,  n:2, raw:true, gain:{ food:12, mood:7 } },
    '饮料':   { unit:'瓶', keeps:0,  n:1, raw:true, gain:{ food:5,  mood:11 } },
    // 剩菜. The only product no shop sells, because the only way to get one is to have cooked or
    // ordered too much. A real meal rather than a snack, worth eating, and worth nothing at all by
    // Wednesday — which is the whole reason it is a dated lot and not a boolean on the flat.
    //
    // `菜` beside it is the older stand-in, kept because js/game.js:6723 still stows an
    // uneaten 外卖 under that headword and this file does not get to edit game.js. Once that call
    // site moves to 剩菜 the row below it goes.
    '剩菜':   { unit:'份', keeps:2,  n:1, raw:true, gain:{ food:38, mood:8 } },
    '菜':     { unit:'份', keeps:2,  n:1, raw:true, gain:{ food:38, mood:8 } },
    // things you cook with
    '米':     { unit:'袋', keeps:0,  n:6 },
    '面条':   { unit:'把', keeps:0,  n:4 },
    '鸡蛋':   { unit:'盒', keeps:14, n:6 },
    '西红柿': { unit:'个', keeps:4,  n:1 },
    '土豆':   { unit:'个', keeps:8,  n:1 },
    '白菜':   { unit:'棵', keeps:5,  n:3 },
    '蔬菜':   { unit:'袋', keeps:3,  n:3 },
    '猪肉':   { unit:'斤', keeps:2,  n:3 },
    '牛肉':   { unit:'斤', keeps:2,  n:3 },
    '鸡肉':   { unit:'斤', keeps:2,  n:3 },
    '鱼':     { unit:'条', keeps:1,  n:2 },
    '肉馅':   { unit:'斤', keeps:2,  n:3 },
    // the cupboard. A bottle of oil is twenty meals, so these are never the thing you are out of
    // on your first week — and then one morning they are, which is the point of counting them.
    '油':     { unit:'瓶', keeps:0,  n:20 },
    '酱油':   { unit:'瓶', keeps:0,  n:24 },
    '盐':     { unit:'袋', keeps:0,  n:40 },
  };

  // ---- 菜 what you can make.
  //
  // Ordered cheap-and-quick to slow-and-good, and that ordering is the design: 汤 is twenty-five
  // minutes and barely feeds you, 饺子 is an hour and is the best meal in the game. Neither is
  // ever the right answer — which one is depends on what time it is and what is in the fridge,
  // and that is a decision the player makes rather than a menu they read.
  //
  // Every dish name is a dictionary row too, for the same reason as above. `use` is in servings,
  // not units: two eggs out of a box of six.
  //
  // `feeds` is how many servings the pan actually produces, and it is what makes the slow dishes
  // worth their forty minutes on a day you have forty minutes: an hour spent on 饺子 on Sunday is
  // Monday's lunch as well, sitting in the fridge as a 剩菜 lot with Sunday's date on it. Absent
  // means one — a bowl of rice is a bowl of rice.
  const RECIPES = [
    { hz:'汤', py:'tāng', en:'soup',
      use:{ '白菜':1, '鸡蛋':1 }, mins:25, gain:{ food:28, mood:8 }, feeds:2 },
    { hz:'米饭', py:'mǐfàn', en:'a bowl of rice',
      use:{ '米':1 }, mins:30, gain:{ food:34, mood:2 } },
    { hz:'土豆丝', py:'tǔdòusī', en:'shredded potato',
      use:{ '土豆':2, '油':1, '盐':1 }, mins:30, gain:{ food:44, mood:7 } },
    { hz:'西红柿鸡蛋面', py:'xīhóngshì jīdàn miàn', en:'tomato and egg noodles',
      use:{ '面条':1, '西红柿':1, '鸡蛋':2, '油':1 }, mins:40, gain:{ food:66, mood:13 } },
    { hz:'牛肉面', py:'niúròumiàn', en:'beef noodle soup',
      use:{ '面条':1, '牛肉':1, '蔬菜':1, '酱油':1 }, mins:45, gain:{ food:70, mood:15 }, feeds:2 },
    { hz:'饺子', py:'jiǎozi', en:'dumplings',
      use:{ '肉馅':1, '白菜':1, '面条':1, '酱油':1 }, mins:60, gain:{ food:74, mood:22 }, feeds:3 },
  ];

  // ---- 库存 the lots.
  //
  // A lot is a quantity of one product that came home on one day, and the reason it is a list
  // rather than a count per product is that a fresh purchase must not rescue an old one. Buy fish
  // on Monday, forget it, buy fish on Thursday, and on Friday you should have one good fish and
  // one bad one — not two of whatever the average is.
  //
  // `n` is in servings, not units, because everything downstream of here counts servings and a
  // half-used box of eggs has to be representable.
  let LOTS = [];        // [{ hz, n, day }] — oldest first, by construction

  const fresh = () => [];

  const product = hz => PRODUCTS[hz] || null;

  // When a lot bought on `day` stops being food. Dry goods never do.
  const spoilsOn = lot => {
    const p = product(lot.hz);
    return p && p.keeps ? lot.day + p.keeps : Infinity;
  };
  const gone = (lot, day) => day >= spoilsOn(lot);

  // How many days of life a lot has left, for a panel that wants to warn you before it is too
  // late rather than after. null for dry goods, which have no answer.
  const life = (lot, day) => {
    const s = spoilsOn(lot);
    return s === Infinity ? null : Math.max(0, s - day);
  };

  // Servings of one product that are still good. Everything that asks "have I got any" asks this.
  const have = (hz, day) =>
    LOTS.reduce((s, l) => s + (l.hz === hz && !gone(l, day) ? l.n : 0), 0);

  // Take `n` servings of a product, oldest good lot first — which is both how a person uses a
  // fridge and the only order that stops the oldest thing in it from living forever. Assumes the
  // caller has already checked there is enough; `cook` and `eat` both do.
  function draw(hz, n, day) {
    for (const l of LOTS) {
      if (n <= 0) break;
      if (l.hz !== hz || gone(l, day)) continue;
      const take = Math.min(l.n, n);
      l.n -= take; n -= take;
    }
    LOTS = LOTS.filter(l => l.n > 0);
    return n <= 0;
  }

  // Put servings in without touching the guard below. `seed` uses this; nothing else may.
  function put(hz, units, day) {
    const p = product(hz);
    if (!p || !(units > 0)) return null;
    const n = Math.round(p.n * units);
    const same = LOTS.find(l => l.hz === hz && l.day === day);
    if (same) same.n += n; else LOTS.push({ hz, n, day });
    return { hz, units, n, unit: p.unit };
  }

  // ---- 已经有东西了 (245).
  //
  // `seed` is called twice at boot — once at module load (js/game.js:156, so the acceptance
  // harnesses that never press PLAY still find a fridge) and once when the title screen hands over
  // (js/game.js:2234, to re-date the bread after the title shots have run the clock forward). Both
  // of those are the *starting* fridge and both are fine.
  //
  // What must never happen is a seed landing on a fridge that has a life in it. A restored save
  // carries real lots and a shop trip put real lots there; refilling either is free food, and the
  // save already has the shape to prove it. The guard is here rather than at the two call sites
  // because a third caller is exactly the thing that would get it wrong.
  let seeded = false;              // something in here came from a save or a shop, not from `seed`

  return {
    PRODUCTS, RECIPES,
    product,
    unit: hz => (product(hz) || {}).unit || '份',
    isFood: hz => !!product(hz),

    // ---- putting things away.
    //
    // `units` is what a person would say — 两袋米, 一盒鸡蛋 — and the servings are worked out from
    // the product. So a quantity misunderstood at a till is expressible here as exactly the thing
    // that went wrong: the wrong number of the right unit.
    // A second bag of rice on the same day is the same lot. Different days never merge — that is
    // the whole point of the stamp. Anything that comes in this way is a life rather than a
    // starting state, so it closes the door on a later `seed`.
    add(hz, units, day) {
      const got = put(hz, units, day);
      if (got) seeded = true;
      return got;
    },

    // ---- 听错了 (244). The quantity mistake a person actually makes in a foreign language.
    //
    // 三斤 and 十斤 are one tone and one initial apart across a counter with a fan running, and the
    // difference is nine kuai of pork you now have to eat by Thursday. This is the mistake the lot
    // model was built to be able to represent at all: with a fridge that counts "meals" there is no
    // way to buy the wrong amount of anything.
    //
    // Deterministic, and deliberately so — the roll is the caller's, off the day or off the till's
    // own hash, so the same trip replayed after a reload goes wrong in the same place. This file
    // does not roll anything.
    MISHEARD: { '一':'七', '七':'一', '三':'十', '十':'四', '四':'十', '六':'九', '九':'六' },
    NUM: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
    // `roll` 0..1. Returns null when nothing went wrong, or { said, heard, units, got } — `got` is
    // the number of units that actually come home, which is what the caller passes to `add`.
    wrongQty(units, roll, p = 0.18) {
      const u = units | 0;
      const said = this.NUM[u];
      const heard = said ? this.MISHEARD[said] : null;
      if (!heard || !(roll < p)) return null;
      const got = this.NUM.indexOf(heard);
      return { said, heard, units: u, got };
    },

    // ---- what is in there.
    //
    // Two different questions, and the game asks both. `ready` is what you could eat standing at
    // the open fridge door with no time and no pan. `meals` counts the cooking too, and is the
    // one the HUD chip shows, because "the fridge is empty" should not be said about a fridge
    // with a chicken in it.
    ready(day) {
      return LOTS.reduce((s, l) => {
        const p = product(l.hz);
        return s + (p && p.raw && !gone(l, day) ? l.n : 0);
      }, 0);
    },
    // An upper bound and openly so: two dishes that both want the last egg are both counted, and
    // making either takes the other off the list. Exact would mean packing ingredients into meals,
    // which is a solver, for a chip on a HUD. What it is actually asked is whether the number is
    // zero, and about that it is never wrong.
    meals(day) {
      return this.ready(day) + this.cookable(day).length;
    },

    // Everything still good, newest lots last, for the fridge panel and the shopping decision.
    // `left` is days of life remaining — null where the question does not apply.
    list(day) {
      const out = [];
      for (const l of LOTS) {
        if (gone(l, day)) continue;
        const p = product(l.hz);
        const row = out.find(r => r.hz === l.hz);
        const left = life(l, day);
        if (row) {
          row.n += l.n;
          // A product held across two lots is as urgent as its worst lot.
          if (left !== null) row.left = row.left === null ? left : Math.min(row.left, left);
        } else {
          out.push({ hz: l.hz, n: l.n, unit: p.unit, raw: !!p.raw, left });
        }
      }
      return out;
    },

    // ---- 快坏了 (243). What goes off at the *next* rollover, which is the only day the
    // information is worth anything. `spoil` tells you what you lost; this tells you what you are
    // about to, in time to eat it or cook it. Same row shape as `list`, so a panel that can draw
    // one can draw the other.
    //
    // `within` is in days: 1 is tonight's problem, 2 is a shopping decision.
    spoilSoon(day, within = 1) {
      return this.list(day).filter(r => r.left !== null && r.left <= within);
    },
    // The one number a HUD chip or a notice wants. Servings, not products, because two servings of
    // pork going off is worse news than one yoghurt.
    expiring(day, within = 1) {
      return this.spoilSoon(day, within).reduce((s, r) => s + r.n, 0);
    },

    // ---- eating what is already food. Oldest first, so the thing about to go off is the thing
    // you eat, which is both sensible and quietly teaches you to shop for less.
    //
    // `next` is the same choice without making it, because the walk-up prompt has to be able to
    // say 吃面包 before you press the key. A prompt that says "eat something" and then hands you
    // yoghurt is the fridge keeping a secret it has no reason to keep.
    next(day) {
      let best = null;
      for (const l of LOTS) {
        const p = product(l.hz);
        if (!p || !p.raw || gone(l, day)) continue;
        if (!best || spoilsOn(l) < spoilsOn(best)) best = l;
      }
      if (!best) return null;
      const p = product(best.hz);
      return { hz: best.hz, unit: p.unit, left: life(best, day), gain: { ...p.gain } };
    },
    eat(day) {
      const got = this.next(day);
      if (got) draw(got.hz, 1, day);
      return got;
    },

    // ---- cooking. `cookable` is the honest list — every dish you have all the ingredients for
    // right now — and it is what the kitchen offers rather than a fixed menu, so an empty fridge
    // produces an empty list and not a dish you cannot make.
    cookable(day) {
      return RECIPES.filter(r =>
        Object.keys(r.use).every(hz => have(hz, day) >= r.use[hz]));
    },

    // What one dish is short of, so the kitchen can say why rather than just refusing. Returns
    // [] when you can make it.
    missing(hz, day) {
      const r = RECIPES.find(x => x.hz === hz);
      if (!r) return [];
      return Object.keys(r.use)
        .map(k => ({ hz: k, need: r.use[k] - have(k, day), unit: PRODUCTS[k].unit }))
        .filter(m => m.need > 0);
    },

    // Cooking takes the ingredients and, for a dish that fills the pan, puts the rest back in as a
    // 剩菜 lot stamped with today (216). That lot is an ordinary product from here on: it can be
    // eaten by `next`/`eat` like anything else raw, and it goes off in two days like anything else
    // perishable. Returns the recipe with `left` — how many servings went in the fridge — so the
    // kitchen can say 还剩两份 rather than the player finding out at the fridge door.
    cook(hz, day) {
      const r = RECIPES.find(x => x.hz === hz);
      if (!r || this.missing(hz, day).length) return null;
      for (const k in r.use) draw(k, r.use[k], day);
      const left = Math.max(0, (r.feeds || 1) - 1);
      if (left) this.add('剩菜', left, day);
      return { ...r, left };
    },

    // ---- 坏了. Run at the day rollover. Returns what was lost so the morning can mention it —
    // a fridge that silently deletes the fish you paid twenty kuai for is a bug as far as the
    // player is concerned, however correct the simulation is.
    spoil(day) {
      const lost = [];
      LOTS = LOTS.filter(l => {
        if (!gone(l, day)) return true;
        const row = lost.find(x => x.hz === l.hz);
        if (row) row.n += l.n; else lost.push({ hz: l.hz, n: l.n, unit: PRODUCTS[l.hz].unit });
        return false;
      });
      return lost;
    },

    // ---- a new life. Enough to eat tonight and enough to cook one thing, so the first morning
    // is a choice rather than a forced trip to the shop — and so the kitchen has something to
    // demonstrate itself with before the player has ever seen a shelf.
    //
    // Refuses, and says so, once anything real is in here — see the note on `seeded` above. Two
    // seeds at boot both land; a third after a save is restored or a basket is paid for does not.
    seed(day) {
      if (seeded) return false;
      LOTS = fresh();
      put('方便面', 2, day);
      put('鸡蛋', 1, day);
      put('西红柿', 2, day);
      put('面条', 1, day);
      put('油', 1, day);
      put('盐', 1, day);
      return true;
    },

    // ---- the save. Lots are plain data and go across whole. Old saves have no pantry, only a
    // `stock` integer; migrating that is the loader's job in game.js and not this file's, because
    // only game.js knows what a v1 save looked like.
    toSave: () => LOTS.map(l => ({ h: l.hz, n: l.n, d: l.day })),
    load(a) {
      LOTS = fresh();
      if (!Array.isArray(a)) { seeded = false; return; }
      for (const o of a) {
        if (!o || !PRODUCTS[o.h]) continue;         // a product this build no longer sells
        const n = Math.round(+o.n), d = Math.round(+o.d);
        if (!(n > 0) || !Number.isFinite(d)) continue;
        LOTS.push({ hz: o.h, n, day: d });
      }
      // A restored fridge is a life. An empty one is not — a save whose every lot went off is
      // still allowed the starting stock, exactly as a v1 save with no `pantry` at all is.
      seeded = LOTS.length > 0;
    },
    reset() { LOTS = fresh(); seeded = false; },
  };
})();
