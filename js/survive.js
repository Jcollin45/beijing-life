// 活下去 — the floor under the life.
//
// Five needs drained, and one of them — 厕所 — quietly reset itself when it hit zero. Everything
// else bottomed out at nothing and stayed there, costing nothing. You could sleep through a
// fortnight, never eat, never wash, never turn up to work, never pay a landlord who did not exist,
// and the game would greet you on day fifteen exactly as it had on day one. A life sim in which
// you cannot lose is a screensaver with a dictionary attached: nothing pushes you into the shop
// you are avoiding, or the bank, or the conversation you would rather not have in Chinese.
//
// So: rent that is a real number on a real weekday, hunger with a floor under it that costs
// health, illness you catch from a dirty flat, a cold morning or a lot of pork that went off on
// Thursday, and a job that can be lost because the attendance record in js/career.js has been
// remembering absences all along with nothing reading them.
//
// Two rules shape every one of them.
//
// **Losing is recoverable.** Eviction moves you to a cheap room — it is not a game over screen.
// A collapse is a hospital bill you can afford and a lost afternoon. Being sacked is a couple of
// days out and a start again from the bottom, not the end of employment — the door reopens on
// `rehireWait`. Every state in this file has a named way out, and .survivecheck.js exists
// to fail the moment somebody adds one that does not.
//
// **Losing is legible, in the language.** Every rule the player is being held to can be said back
// to them in Chinese — see `rules()`. A survival system you cannot read is a difficulty setting,
// not a lesson.
//
// Like career.js, pantry.js and story.js this is state and rules only. It draws nothing, it knows
// about no room, it never touches `needs` or the HUD, and it never rolls a die that is not a pure
// function of the day. It answers questions and reports what happened; game.js turns that into a
// toast, a diary line or a number going down.
const Survive = (() => {

  // ---------------------------------------------------------------- 难度 the one table
  //
  // Every number that decides how hard this is lives here and nowhere else. `mode` is the owner's
  // call, not this file's: 'real' is what ships (see `mode` below), and 'gentle' is the same rules with
  // the padding left in — cheaper rent, hunger that takes a day to hurt, illness you mostly dodge,
  // and a manager who forgets an absence or two.
  const TUNING = {
    gentle: {
      // 房租. Due at the rollover into this weekday — 0 is 星期一, matching Career.weekday().
      rentDay: 0,
      rent: { flat: 300, cheap: 110 },
      rentGrace: 3,          // misses standing against you before the landlord evicts
      deposit: 600,          // 押金 — what it costs to move back out of the cheap room

      // 饿. Health only moves once food is actually at the floor, so an ordinary hungry afternoon
      // is still just an afternoon.
      starveAt: 0,           // needs.food at or below this costs health
      starveRate: 2.5,       // health per in-game hour at zero food
      illRate: 1.0,          // health per in-game hour while ill
      healRate: 1.6,         // health per in-game hour when fed and rested
      healNeeds: 40,         // food and rest must both be over this to heal
      collapseTo: 45,        // health you wake with after a collapse
      hospitalFee: 120,

      // 生病. Risk is rolled once a day off a hash of the day, so a run replays identically.
      dirtyBelow: 25,        // needs.clean under this is a dirty flat and a dirty person
      chillPerHour: 1.0,     // chill gained per cold hour outdoors without warm clothes
      risk: { base: 0.010, dirty: 0.10, chill: 0.010, spoiled: 0.55 },
      illDays: 3,            // how long it runs untreated
      medicineDays: 1,       // days left after 药
      illDrain: 1.35,        // what being ill does to rest and mood drain

      // 工作. Read straight off Career.missed(), which has been counting since the day the
      // attendance record landed.
      missWarn: 3, missDemote: 5, missFire: 8,
      rehireWait: 2,         // days after a dismissal before they will have you back
    },
    real: {
      rentDay: 0,
      rent: { flat: 450, cheap: 180 },
      rentGrace: 2,
      deposit: 900,
      starveAt: 5,
      starveRate: 6.0,
      illRate: 2.0,
      healRate: 1.0,
      healNeeds: 55,
      collapseTo: 30,
      hospitalFee: 260,
      dirtyBelow: 35,
      chillPerHour: 1.6,
      risk: { base: 0.025, dirty: 0.22, chill: 0.020, spoiled: 0.80 },
      illDays: 5,
      medicineDays: 2,
      illDrain: 1.6,
      missWarn: 2, missDemote: 3, missFire: 5,
      rehireWait: 4,
    },
  };

  // The default is the owner's call and it is 'real': this game's framing is a city you have to
  // survive in, and the numbers that carry that are the absence thresholds rather than the rent —
  // 2/3/5 is what makes 请假, 迟到 and 加班 words with a cost attached instead of dictionary rows.
  // 'gentle' stays fully supported and is a settings toggle away; see .reports/D-survive.md for
  // both tables side by side and the measured income they were set against.
  let mode = 'real';
  const T = () => TUNING[mode];

  // ---------------------------------------------------------------- 病 what you can catch
  //
  // Three, and they are told apart by where they came from, because that is the part the player
  // can act on. 药 shortens all of them; a hospital visit ends any of them.
  const ILLS = {
    '感冒':   { py:'gǎnmào',   en:'a cold',        from:'chill',
                say:['我感冒了。', "You've caught a cold."] },
    '发烧':   { py:'fāshāo',   en:'a fever',       from:'dirty',
                say:['我发烧了。', "You're running a fever."] },
    '闹肚子': { py:'nào dùzi', en:'a bad stomach', from:'spoiled',
                say:['我闹肚子了。', 'Your stomach is in a bad way.'] },
  };

  const HOMES = {
    flat:  { hz:'公寓', py:'gōngyù', en:'the flat' },
    cheap: { hz:'小屋', py:'xiǎowū', en:'the cheap room' },
  };

  // A deterministic 0..1 off two integers. The same day rolls the same way on every machine and
  // after every reload, exactly as Weather.hash does for the sky — nothing in this file is allowed
  // to depend on Math.random, or a save could not be trusted and the check could not be written.
  function hash(a, b) {
    let h = ((a | 0) * 73856093) ^ ((b | 0) * 19349663) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

  const fresh = () => ({
    health: 100,
    ill: null,            // { hz, day, until, from }
    chill: 0,             // cold hours banked since the last daily roll
    hungryHours: 0,       // in-game hours spent at the floor, for the diary
    home: 'flat',
    rentMissed: 0,        // unpaid rent periods standing against you
    rentOwed: 0,          // 元 owed, so paying late is a real number and not a flag
    lastRentDay: -1,      // the day the last demand was raised, so it cannot be raised twice
    lastCollapse: -1,     // one collapse a day, no more
    collapses: 0,
    employed: true,
    firedDay: -1,
    missBase: 0,          // Career.missed() at the last rehire — absences are counted from there
    lastMissed: 0,        // the last count seen, so a rehire knows where to start counting again
    seenMiss: 0,          // highest absence count already acted on, relative to missBase
    demotions: 0,
    evictions: 0,
    illnesses: 0,
    hour: 0,              // fractional in-game hours carried between ticks
  });
  let S = fresh();

  const ev = (type, hz, en, extra) => Object.assign({ type, hz, en }, extra || {});

  // ---------------------------------------------------------------- the clock
  //
  // Called on the same clock that already advances needs, with the minutes that just passed. Health
  // is the only thing that moves here and it moves slowly, so this does per-hour arithmetic on an
  // accumulator rather than anything per frame.
  //
  // ctx: { day, needs, cold, outdoors, warm }
  //   needs     the live needs object, read only — this file never writes to it.
  //   cold      is it cold enough outside to matter today (game.js reads Weather)
  //   outdoors  is the player actually out in it
  //   warm      are they dressed for it
  function tick(mins, ctx) {
    const out = [];
    if (!(mins > 0)) return out;
    const t = T();
    const n = (ctx && ctx.needs) || {};
    S.hour += mins / 60;
    const hours = S.hour;
    if (hours < 0.05) return out;      // sub-three-minute steps just accumulate
    S.hour = 0;

    if (ctx && ctx.cold && ctx.outdoors && !ctx.warm) S.chill += t.chillPerHour * hours;

    const day = (ctx && ctx.day) | 0;
    const before = S.health;
    const starving = (n.food != null) && n.food <= t.starveAt;
    if (starving) { S.health -= t.starveRate * hours; S.hungryHours += hours; }
    if (S.ill) S.health -= t.illRate * hours;
    if (!starving && !S.ill && n.food > t.healNeeds && n.rest > t.healNeeds)
      S.health += t.healRate * hours;
    // The rest of the day you collapsed on is spent being looked after, so health stops at 1
    // rather than sitting flat on zero with nothing happening until midnight.
    S.health = clamp(S.health, S.lastCollapse === day ? 1 : 0, 100);

    // The one line a player must not be able to miss. Said once on the way down, not every hour.
    if (before > 30 && S.health <= 30 && S.health > 0)
      out.push(ev('health', '我身体很不舒服，得去医院。', "You're in a bad way — you need a hospital."));

    // Once a day, at most. Without the guard a starving player in 'real' collapses every five
    // hours, which is neither a consequence nor readable — it is a stuck loop with a toast on it.
    if (S.health <= 0 && S.lastCollapse !== day) { S.lastCollapse = day; out.push(collapse(ctx)); }
    return out;
  }

  // 晕倒. Not a death and not a reload: an afternoon gone, a bill, and you wake up in the hospital
  // with enough health to walk home on.
  //
  // The bill is only what you can actually pay. 急诊 does not turn away somebody with an empty
  // wallet, and — measured, in .survivecheck.js — a bill that goes on the slate instead is what
  // turns starvation from a setback into a run you cannot come back from: thirty days of neglect
  // produced 142 collapses and ¥37,000 of debt against an income of ¥200 a day. The cost of a
  // collapse is the day and the health, and that is enough.
  function collapse(ctx) {
    const t = T();
    S.collapses++;
    S.health = t.collapseTo;
    S.ill = null;
    S.chill = 0;
    const pay = Math.min((ctx && ctx.money) | 0, t.hospitalFee);
    return ev('collapse', '你晕倒了，醒来在医院。', 'You collapsed and woke up in hospital.',
              { charge: pay, fee: t.hospitalFee, health: S.health });
  }

  // ---------------------------------------------------------------- midnight
  //
  // Everything that happens once a day: the rent, the illness roll, the manager's patience. Called
  // with the day that has just ended, next to Career.rollDay.
  //
  // ctx: { money, needs, missed }  — `missed` is Career.missed(), passed in rather than read, so
  // this module keeps depending on nothing.
  function rollDay(endedDay, ctx) {
    const out = [];
    const t = T();
    const day = (endedDay | 0) + 1;      // the day that is starting
    const money = (ctx && ctx.money) | 0;
    const n = (ctx && ctx.needs) || {};

    // 房租. One demand per rent day, whatever else happened.
    if (weekdayOf(day) === t.rentDay && S.lastRentDay !== day) {
      S.lastRentDay = day;
      const amount = t.rent[S.home];
      if (money >= amount + S.rentOwed) {
        out.push(ev('rent-paid', `房租${amount}元，交了。`, `Rent paid — ¥${amount}.`,
                    { charge: amount + S.rentOwed, amount }));
        S.rentOwed = 0;
        S.rentMissed = 0;
      } else {
        S.rentMissed++;
        S.rentOwed += amount;
        if (S.rentMissed >= t.rentGrace && S.home === 'flat') {
          out.push(evict(amount));
        } else {
          out.push(ev('rent-missed',
                      `房东：你还没交房租，${S.rentOwed}元。`,
                      `The landlord: you still owe ¥${S.rentOwed} in rent.`,
                      { owed: S.rentOwed, missed: S.rentMissed,
                        left: Math.max(0, t.rentGrace - S.rentMissed), talk: 'landlord' }));
        }
      }
    }

    // 生病. One roll, off the day, against whatever you have been doing to yourself.
    if (!S.ill) {
      let p = t.risk.base + S.chill * t.risk.chill;
      let from = S.chill > 0 ? 'chill' : null;
      if (n.clean != null && n.clean < t.dirtyBelow) { p += t.risk.dirty; from = from || 'dirty'; }
      if (hash(day, 7717) < p) out.push(fallIll(from || 'dirty', day));
    } else if (day >= S.ill.until) {
      out.push(recover());
    }
    S.chill = 0;

    // 旷工. The record has been kept since the attendance system landed; this is the first thing
    // that reads it. One step per threshold, and never the same step twice. `canDemote` is a
    // capability supplied by game.js, not Career state: at the bottom rung the same threshold is a
    // final warning, because claiming to demote an intern would disagree with the career record.
    const missed = Math.max(0, ((ctx && ctx.missed) | 0) - S.missBase);
    S.lastMissed = (ctx && ctx.missed) | 0;
    if (S.employed && missed > S.seenMiss) {
      const seen = S.seenMiss;
      S.seenMiss = missed;
      if (seen < t.missFire && missed >= t.missFire) {
        S.employed = false;
        S.firedDay = day;
        out.push(ev('fired', '你被开除了。回去重新申请吧。',
                    'You have been sacked. You can apply again.',
                    { missed, rehireOn: day + t.rehireWait }));
      } else if (seen < t.missDemote && missed >= t.missDemote) {
        if (!ctx || ctx.canDemote !== false) {
          S.demotions++;
          out.push(ev('demote', `你旷工${missed}天，被降职了。`,
                      `${missed} days absent — you have been demoted.`, { missed }));
        } else {
          out.push(ev('work-warning', `你已经是实习生了，再旷工就会被开除。`,
                      'You are already an intern. More absence will cost you the job.',
                      { missed, final: true, talk: 'boss' }));
        }
      } else if (seen < t.missWarn && missed >= t.missWarn) {
        out.push(ev('work-warning', `主管：你旷工${missed}天了，再这样就不行了。`,
                    `The supervisor: ${missed} days absent. This cannot go on.`,
                    { missed, talk: 'boss' }));
      }
    }
    return out;
  }

  function evict(amount) {
    S.evictions++;
    S.home = 'cheap';
    S.rentMissed = 0;
    return ev('evicted', '房东把你赶出去了。你搬到了小屋。',
              'The landlord has evicted you. You have moved to the cheap room.',
              { owed: S.rentOwed, amount, home: S.home, deposit: T().deposit });
  }

  function fallIll(from, day) {
    const hz = from === 'chill' ? '感冒' : from === 'spoiled' ? '闹肚子' : '发烧';
    S.ill = { hz, from, day, until: day + T().illDays };
    S.illnesses++;
    return ev('ill', ILLS[hz].say[0], ILLS[hz].say[1], { ill: hz, from, until: S.ill.until });
  }

  function recover() {
    const hz = S.ill.hz;
    S.ill = null;
    return ev('well', '我好了。', "You're better.", { was: hz });
  }

  // Weekday index, the same arithmetic Career uses: day 1 is a Monday.
  const weekdayOf = day => ((((day | 0) - 1) % 7) + 7) % 7;

  return {
    TUNING, ILLS, HOMES,
    get mode() { return mode; },
    set mode(m) { if (TUNING[m]) mode = m; },

    tick, rollDay,

    // ---- what the player is
    health: () => Math.round(S.health),
    ill: () => (S.ill ? { ...S.ill, ...ILLS[S.ill.hz], hz: S.ill.hz } : null),
    home: () => ({ key: S.home, ...HOMES[S.home] }),
    employed: () => S.employed,
    owed: () => S.rentOwed,
    // What being ill does to the meters. game.js multiplies its own decay by this; this file still
    // never touches `needs` itself.
    drainMul(k) {
      if (!S.ill) return 1;
      return (k === 'rest' || k === 'mood') ? T().illDrain : 1;
    },

    // ---- the ways out. Every one of them is a thing the player does somewhere real.
    //
    // 交房租 — pay what is owed, at the door or at the bank. Returns what to actually charge.
    payRent(money) {
      const owe = S.rentOwed;
      if (!owe) return { paid: 0, owed: 0, done: true };
      const pay = Math.min(money | 0, owe);
      S.rentOwed -= pay;
      if (!S.rentOwed) S.rentMissed = 0;
      return { paid: pay, owed: S.rentOwed, done: !S.rentOwed };
    },
    rentDue() { return { amount: T().rent[S.home], owed: S.rentOwed, day: T().rentDay }; },

    // 搬回去 — the deposit on a better room, once the arrears are clear. This is the whole escape
    // from an eviction and it is deliberately a money problem, not a quest.
    moveBack(money) {
      if (S.home !== 'cheap') return { ok: false, why: 'already' };
      if (S.rentOwed) return { ok: false, why: 'owed', owed: S.rentOwed };
      const dep = T().deposit;
      if ((money | 0) < dep) return { ok: false, why: 'money', need: dep };
      S.home = 'flat';
      return { ok: true, charge: dep, hz: '你搬回公寓了。', en: 'You have moved back to the flat.' };
    },

    // 吃药 — from the pharmacy. Shortens whatever you have; it does not prevent anything.
    takeMedicine(day) {
      if (!S.ill) return null;
      S.ill.until = Math.min(S.ill.until, (day | 0) + T().medicineDays);
      return { hz: '吃了药，好一点了。', en: 'The medicine helps a little.', until: S.ill.until };
    },
    // 看病 — the hospital ends it outright, which is what a hospital is for.
    treated(day) {
      if (!S.ill) return null;
      const was = S.ill.hz;
      S.ill = null;
      S.health = Math.max(S.health, T().collapseTo);
      return { hz: '医生说你没事了。', en: 'The doctor says you are fine.', was };
    },
    // What eating a lot that had gone off does. pantry.js knows a lot is off; this decides what it
    // costs, and it is the one illness source that is not a daily roll — you feel that one tonight.
    ateSpoiled(day) {
      if (S.ill) return null;
      if (hash(day | 0, 3313) >= T().risk.spoiled) return null;
      return fallIll('spoiled', day | 0);
    },
    // 找工作 — back to the whiteboard at the bottom. game.js decides what rank means; this decides
    // whether the door is open.
    canRehire: day => !S.employed && (day | 0) - S.firedDay >= T().rehireWait,
    rehire(day) {
      if (S.employed) return { ok: false, why: 'already' };
      if (!((day | 0) - S.firedDay >= T().rehireWait))
        return { ok: false, why: 'wait', on: S.firedDay + T().rehireWait };
      S.employed = true;
      // The old absences are not held against you twice — but the counting starts again from here,
      // so a second run of not turning up costs the job a second time.
      S.missBase = S.lastMissed;
      S.seenMiss = 0;
      return { ok: true, hz: '你重新上班了，从实习生开始。',
               en: 'You are back at work, starting again as an intern.' };
    },

    // ---- 规矩. Every rule the player is being held to, in the language they are learning it in.
    // The panel prints this; nothing in here is a number the player cannot also see happening.
    rules() {
      const t = T();
      return [
        { hz: `房租每星期一交，${t.rent[S.home]}元。`,
          en: `Rent is due every Monday: ¥${t.rent[S.home]}.` },
        { hz: `欠${t.rentGrace}次房租，房东就赶人。`,
          en: `Miss rent ${t.rentGrace} times and the landlord evicts you.` },
        { hz: '被赶出去就住小屋，交了押金才能搬回来。',
          en: 'Eviction means the cheap room; a deposit moves you back.' },
        { hz: '太饿了身体会越来越差，身体到零就晕倒。',
          en: 'At zero food your health falls; at zero health you collapse.' },
        { hz: '不洗澡、着凉、吃坏东西都会生病。',
          en: 'Not washing, catching cold and bad food all make you ill.' },
        { hz: '生病了可以吃药，也可以去医院。',
          en: 'Medicine helps; the hospital cures it.' },
        { hz: `旷工${t.missWarn}天主管会说你，${t.missFire}天就开除。`,
          en: `${t.missWarn} days absent and the supervisor speaks to you; ${t.missFire} and you are sacked.` },
        { hz: '被开除了还能重新申请，从实习生开始。',
          en: 'You can apply again after a dismissal, starting as an intern.' },
      ];
    },

    stats: () => ({ ...S, health: Math.round(S.health), mode }),

    // ---- the save. Old saves have none of this and get a clean, healthy start: somebody who has
    // been playing for a fortnight has not been dodging a landlord for a fortnight, they have been
    // in a game where the landlord did not exist.
    toSave: () => ({ ...S, mode }),
    load(o) {
      S = fresh();
      if (!o || typeof o !== 'object' || Array.isArray(o)) return;
      if (TUNING[o.mode]) mode = o.mode;
      // Counters and day markers, not arbitrary numbers — JSON.parse will hand back Infinity for
      // `1e309`, and a half-written save can carry negatives. career.js learned this the hard way.
      const count = v => Number.isSafeInteger(v) && v >= 0 ? v : 0;
      for (const k of ['chill', 'hungryHours', 'rentMissed', 'rentOwed', 'collapses',
                       'demotions', 'evictions', 'illnesses', 'seenMiss', 'missBase', 'lastMissed'])
        S[k] = count(Math.round(+o[k]));
      S.health = Number.isFinite(+o.health) ? clamp(+o.health, 0, 100) : 100;
      S.home = HOMES[o.home] ? o.home : 'flat';
      S.employed = o.employed !== false;
      S.lastRentDay = Number.isSafeInteger(o.lastRentDay) ? o.lastRentDay : -1;
      S.firedDay = Number.isSafeInteger(o.firedDay) ? o.firedDay : -1;
      S.lastCollapse = Number.isSafeInteger(o.lastCollapse) ? o.lastCollapse : -1;
      if (o.ill && ILLS[o.ill.hz] && Number.isSafeInteger(o.ill.until))
        S.ill = { hz: o.ill.hz, from: String(o.ill.from || ''),
                  day: count(o.ill.day), until: o.ill.until };
    },
    reset() { S = fresh(); },
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Survive;
