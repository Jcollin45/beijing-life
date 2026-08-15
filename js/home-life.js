// 家 — what living in a flat is actually made of.
//
// The flat had four numbers in it: how dry the plant was, how full the bin was, whether there were
// bowls in the sink, and which shirt was on. Everything else it appeared to have was a sentence.
// The water heater had its own glyph and its own dictionary row and no verb. The washing machine
// said it was ready for the next load, forever. The rice cooker, the chopping board, the wok and
// the extractor fan were four separate authored objects that collapsed into one 厨房 tag meaning
// "cook a meal", and the bed slept exactly seven hours whether you lay down at nine at night or at
// three in the morning.
//
// So this is the part of the flat that is not furniture. Like js/pantry.js, js/career.js and
// js/story.js it is state and rules only: it draws nothing, it knows about no room, it never
// touches `needs` or the HUD. It answers questions — how long would I sleep if I lay down now, is
// there hot water, is the rice ready, did it rain while the washing was out — and js/game.js turns
// the answers into a verb, a toast or a diary line.
//
// Two conventions worth stating, because both have already cost this repo an afternoon:
//
//   * Time in here is an ABSOLUTE minute — `day * 1440 + minutes` — not a time of day. A wash
//     started at 23:40 finishes at 00:25 the next day, and a clock that wraps at midnight cannot
//     express that.
//   * Nothing in here is a 0..1 fraction unless it says so. The flat's own fractions (dry, trash,
//     dust, smell, laundry, wash, hung) stay in `flat` in game.js, where the save clamps them.
//     A wake hour, a yuan amount and a day number live here and go through this module's own
//     toSave/load, which is the whole reason the module exists rather than four more `flat` keys.
const HomeLife = (() => {

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---- the bills.
  //
  // Rent already leaves every morning (js/game.js, at the rollover) and always has. What a flat has
  // never had is an outgoing you can be *late* paying, which is a completely different thing: rent
  // is weather, a bill is a decision. These four are the real ones, at the rates the 物业 notice
  // board on F4 already prints — they are issued together on a cycle and due five days later.
  const BILLS = [
    { hz:'物业费', py:'wùyèfèi',  en:'property management fee', yuan:88 },
    { hz:'水费',   py:'shuǐfèi',  en:'water charge',            yuan:26 },
    { hz:'电费',   py:'diànfèi',  en:'electricity charge',      yuan:54 },
    { hz:'燃气费', py:'ránqìfèi', en:'gas charge',              yuan:19 },
  ];
  const CYCLE = 10;          // days between one set of bills and the next
  const GRACE = 5;           // days you have to pay one before it is 欠费

  const WASH_MINS   = 45;    // one cycle of the 洗衣机
  const RICE_MINS   = 50;    // 电饭煲, lid down to lid up
  const NOODLE_MINS = 3;     // 泡面 at the kettle — the whole point of it
  const SLEEP_FULL  = 7.5;   // hours that count as a whole night
  const AYI_FEE     = 80;    // what the 阿姨 charges for a morning
  // One storey, in metres. The same 3.10 as `js/world.js:185`, which is where the building is
  // actually laid out; repeated rather than imported because that constant is module-local to the
  // scene builder and this file is state, not geometry. If one moves, both move.
  const STOREY      = 3.10;
  const SLEEP_DECK  = 2;     // the bed is in 202 and only in 202

  const fresh = () => ({
    // sleep
    alarm: null,          // hour of day the 闹钟 is set for, or null
    alarmRang: false,     // the last waking was the alarm rather than nature
    slept: SLEEP_FULL,    // hours of the last night
    rested: 1,            // 0..1, carried into the whole of the next day
    wakeAbs: 0,           // absolute minute you last got up
    lateDay: 0,           // the day oversleeping put you past 上班时间
    // hygiene
    heater: true,         // 热水器 switched on at the wall
    teeth: 0, teethDay: 0,
    // kitchen
    fan: false,           // 抽油烟机 running
    rice: null,           // { at } absolute minute the rice is ready
    prep: null,           // { hz, day } a dish already chopped at the 案板
    leftovers: null,      // { hz, en, n, day } last night's dish, in the fridge
    waimai: [],           // the days a delivery was dinner, newest last
    // laundry
    wash: null,           // { at } absolute minute the machine finishes
    hung: null,           // { from, deck, ruined } the load on the rack
    washDone: false,      // a finished load still sitting wet in the drum
    laundryDay: 0,        // the day the dirty pile was last counted up
    // money
    billDay: 0,           // the day the current set of bills was issued
    bills: [],            // [{ hz, py, en, yuan, due, paid }]
    arrears: 0,           // yuan carried past a due date
    // post
    post: [],             // [{ hz, en, day, bill }] — what is in the 信箱
    parcels: [],          // [{ hz, en, code, day, where }] — one object per delivery
    // people
    ayi: null,            // { day, done } the cleaner, booked for a day
    guest: null,          // { hz, py, en, day, hour, done, mood }
  });
  let S = fresh();

  const abs = (day, minutes) => day * 1440 + minutes;
  const hourOf = a => (a % 1440) / 60;
  const dayOf = a => Math.floor(a / 1440);

  // ---------------------------------------------------------------- the drift
  //
  // The flat runs down on its own. This used to be two hard-coded divisions inside `advanceTime`,
  // which is the clock doing the flat's job — and the reason nothing could be added to the flat
  // without editing the one function every scene in the game depends on.
  //
  // `flat` is passed in rather than owned: game.js writes it to the save and reads it for the
  // cutaway, and one object with one writer is cheaper than a second copy that can disagree.
  function tick(mins, flat, day, minutes) {
    if (!(mins > 0) || !flat) return;
    const a = abs(day, minutes);
    flat.dry   = Math.min(1, flat.dry   + mins / 2600);   // the plant, about two days
    flat.trash = Math.min(1, flat.trash + mins / 9000);
    // Dust is the slow one: a week of not sweeping is a visibly grey flat, and unlike the bin it
    // never fills up on its own — it is only ever cleared by somebody with a mop.
    flat.dust  = Math.min(1, flat.dust  + mins / 14000);
    // A kitchen smell hangs about for a couple of hours unless the extractor is on, in which case
    // it goes in twenty minutes. That is the entire argument for the 抽油烟机 having a verb.
    if (flat.smell > 0) flat.smell = Math.max(0, flat.smell - mins / (S.fan ? 20 : 220));
    // The 阿姨 works through the day she is booked for, whether or not you are in.
    if (S.ayi && !S.ayi.done && day >= S.ayi.day) {
      const w = mins / 240;
      flat.trash = Math.max(0, flat.trash - w);
      flat.dust  = Math.max(0, flat.dust  - w);
      flat.dishes = Math.max(0, flat.dishes - w);
      if (flat.trash <= 0 && flat.dust <= 0 && flat.dishes <= 0) S.ayi.done = true;
    }
    // The machine, then the rack. Neither is an event: you must be able to put a wash on, go to
    // work, and come home to a drum full of wet clothes.
    if (S.wash) {
      flat.wash = clamp(1 - (S.wash.at - a) / WASH_MINS, 0, 1);
      if (a >= S.wash.at) { S.wash = null; S.washDone = true; flat.wash = 1; }
    }
    if (S.hung && !S.hung.ruined) {
      flat.hung = clamp(flat.hung + mins / dryMins(day, S.hung.deck), 0, 1);
      if (rainedOn(S.hung, a)) { S.hung.ruined = true; flat.hung = 0; }
    }
  }

  // How many minutes a full load takes to dry where it is hanging. Outdoors on the roof is the
  // fastest thing in the building and the only one the sky can ruin; a rack in the bathroom with
  // the window shut is the slowest. Winter and fog roughly double it either way.
  function dryMins(day, deck) {
    const out = deck === 12 || deck === 2;
    let m = out ? 300 : 620;
    const w = (typeof Weather !== 'undefined' && Weather.planFor) ? Weather.planFor(day) : null;
    if (w) {
      if (w.season && w.season.key === 'winter') m *= 1.9;
      else if (w.season && w.season.key === 'autumn') m *= 1.15;
      if (w.kind === 'fog' || w.kind === 'overcast') m *= 1.5;
      if (w.kind === 'wind' && out) m *= 0.65;
      if (w.kind === 'clear' && out) m *= 0.8;
    }
    return m;
  }

  // Did it rain on it while it was out? `Weather.planFor(day)` is a pure function of the day
  // number carrying the kind and a from/to window in hours, so this is a question the flat can ask
  // about a stretch of the past without inventing a roll of its own or keeping a rain counter.
  function rainedOn(hung, a) {
    if (!hung || (hung.deck !== 12 && hung.deck !== 2)) return false;
    if (typeof Weather === 'undefined' || !Weather.planFor) return false;
    for (let d = dayOf(hung.from); d <= dayOf(a); d++) {
      const w = Weather.planFor(d);
      if (!w || (w.kind !== 'rain' && w.kind !== 'storm')) continue;
      const w0 = d * 1440 + w.from * 60, w1 = d * 1440 + w.to * 60;
      if (w1 > hung.from && w0 < a) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- midnight
  // Called with the day that has just ended, the way Career.rollDay is.
  function rollDay(ended, flat) {
    const out = { bills:null, over:[], laundry:0 };
    S.teeth = 0; S.teethDay = ended + 1;
    S.fan = false;
    // The shirts that came off yesterday. `flat.outfit` counts rail changes; this is where they go.
    if (flat) {
      flat.laundry = Math.min(1, flat.laundry + 0.14);
      out.laundry = flat.laundry;
    }
    // Anything past its due date stops being a bill and becomes 欠费, which the meter in the lobby
    // is the natural place to read.
    // Past its date it stops being a bill and becomes 欠费, which the meter in the lobby is the
    // natural place to read. It leaves `S.bills` in the same breath as it joins `S.arrears`, or
    // `billsOwed()` counts the same yuan twice and the player is asked for double.
    for (const b of S.bills.slice())
      if (!b.paid && ended >= b.due) {
        b.late = true; S.arrears += b.yuan; out.over.push(b);
        S.bills.splice(S.bills.indexOf(b), 1);
      }
    // Mail is durable property rather than something the read method synthesises. A flyer arrives
    // every third morning and remains for that three-day cycle; bills stay for a month because the
    // debt they announce has its own due-date state. Both use the existing save row shape.
    const arriving = ended + 1;
    S.post = S.post.filter(q => !Number.isFinite(+q.day) ||
      arriving - q.day < (q.bill ? 30 : 3));
    if (arriving % 3 === 0 &&
        !S.post.some(q => !q.bill && q.day === arriving && q.hz === '广告'))
      S.post.push({ hz:'广告', en:'a handful of flyers', day:arriving, bill:false });
    if (arriving >= S.billDay + CYCLE) {
      S.billDay = arriving;
      S.bills = S.bills.filter(b => !b.paid);
      for (const b of BILLS)
        S.bills.push({ hz:b.hz, py:b.py, en:b.en, yuan:b.yuan, due:S.billDay + GRACE, paid:false, late:false });
      S.post.push({ hz:'账单', en:'the utility bills', day:S.billDay, bill:true });
      out.bills = S.bills.slice();
    }
    // The loader already applies the same cap. Keep both a flyer and a bill when they arrive on
    // day 30; only trim after all of that morning's post has been materialised.
    if (S.post.length > 12) S.post = S.post.slice(-12);
    return out;
  }

  // ---------------------------------------------------------------- sleep
  //
  // The bed is the only action in the game that should care what time it is and was the one that
  // did not: 床 and 枕头 both charged a flat 420 minutes, so a nap at three in the morning ended at
  // ten and an early night at nine ended at four. What a night is worth is now the hours you
  // actually got, and an alarm is a thing that can *cost* you some.
  // ---- item 263. What the neighbours take off a night.
  //
  // `Disrupt.noiseAt` already answers how loud deck N is at one instant, and nothing read it into
  // sleep. This is the flat's half of the rule `HOTEL-TODO.md` H111 states for the hotel, and it is
  // deliberately the *same* rule reached through the *same* function rather than a second one.
  //
  // Sampled hour by hour across the night rather than at the moment your head hits the pillow:
  // F10's drill starts at eight, so it does not spoil a night that ended at seven, and it does
  // spoil a lie-in that ran to ten. At most 24 iterations, once per 睡觉, never per frame.
  function noiseNight(day, minutes, mins, deck) {
    const out = { loud: 0, worst: 0, hours: 0, why: null };
    if (typeof Disrupt === 'undefined' || !Disrupt.noiseAt) return out;
    const start = abs(day, minutes);
    const n = Math.max(1, Math.min(24, Math.ceil(mins / 60)));
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const a = start + i * 60;
      const nz = Disrupt.noiseAt(dayOf(a), deck, a % 1440);
      if (!nz) continue;
      sum += nz.loud;
      out.hours++;
      if (nz.loud > out.worst) { out.worst = nz.loud; out.why = nz.why; }
    }
    out.loud = +(sum / n).toFixed(2);
    return out;
  }

  // Price one actual stretch of sleep from its accepted start. `sleepPlan` chooses how long a
  // normal night lasts; an interrupted bed action reaches this same arithmetic with the shorter
  // time it really consumed, so waking early cannot keep yesterday's rested state.
  function sleepValue(day, minutes, mins, alarm) {
    const now = abs(day, minutes), hours = mins / 60, wake = now + mins;
    const noise = noiseNight(day, minutes, mins, SLEEP_DECK);
    const spoil = clamp(noise.loud * 0.55, 0, 0.45);
    return {
      mins, hours, alarm:!!alarm, noise, spoil:+spoil.toFixed(2), wakeHour:hourOf(wake),
      rest:Math.round(100 * Math.min(1, hours / SLEEP_FULL) * (1 - spoil)),
      mood:Math.round(clamp((hours - 4) * 5, -14, 14) - noise.loud * 9),
      rested:clamp((hours - 4) / (SLEEP_FULL - 4), 0, 1) * (1 - spoil),
      late:(typeof Career !== 'undefined' && Career.isWorkday && Career.isWorkday(dayOf(wake)) &&
            !Career.onLeave(dayOf(wake)) && hourOf(wake) >= Career.ON_TIME),
    };
  }

  function sleepPlan(day, minutes) {
    const now = abs(day, minutes);
    let mins = 480, alarm = false;         // eight hours if nothing wakes you
    if (S.alarm !== null) {
      const target = Math.round(S.alarm * 60);
      let to = day * 1440 + target;
      while (to <= now) to += 1440;        // the next time that hour comes round
      if (to - now < mins) { mins = to - now; alarm = true; }
    }
    // Nobody stays in bed past the middle of the morning on their own.
    const nat = day * 1440 + 10 * 60 + (minutes >= 10 * 60 ? 1440 : 0);
    if (!alarm && now + mins > nat) mins = Math.max(60, nat - now);
    // Item 263. A night with the drill going is not a shorter night, it is a worse one, so this
    // multiplies the quality and never the length — you still lose the hours to the bed.
    // A whole night at full volume takes 45% off; the cap is there because you do eventually
    // sleep through it, and a night that scores zero would make the flat unusable rather than
    // annoying.
    // Four hours and nine hours must not produce the same morning. Rest fills to the fraction of a
    // full night; `rested` is the harsher curve that follows the player through the next day.
    return sleepValue(day, minutes, mins, alarm);
  }

  // Actually get up. `accepted` is the exact plan the bed displayed when the action began; its
  // alarm and wake time win even if the stored alarm changes while the action is running. Passing
  // no elapsed/accepted values retains the original two-argument owner contract.
  function sleep(day, minutes, elapsed, accepted) {
    const quoted = accepted && Number.isFinite(accepted.mins) && accepted.mins > 0
      ? accepted : sleepPlan(day, minutes);
    const spent = elapsed === undefined ? quoted.mins
      : clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, quoted.mins);
    if (!(spent > 0)) return null;
    const full = spent >= quoted.mins - 1e-6;
    const p = full ? quoted : sleepValue(day, minutes, spent, false);
    S.slept = p.hours;
    S.rested = p.rested;
    S.alarmRang = p.alarm;
    S.wakeAbs = abs(day, minutes) + p.mins;
    if (p.late) S.lateDay = dayOf(S.wakeAbs);
    return p;
  }

  // ---------------------------------------------------------------- hot water
  //
  // Defaulting on, because it is: a flat with no hot water is an event, not a baseline. It goes off
  // when the heater is switched off at the wall and when the gas or the electricity is in arrears,
  // which is the point of modelling arrears at all.
  const hotWater = () => S.heater && S.arrears <= 0;

  // ---------------------------------------------------------------- the day's totals
  //
  // How presentable the flat is, as one number. Dishes and rubbish weigh most because they are what
  // a visitor sees from the door; dust is slow and forgiving, and washing on the rack in the middle
  // of the living room is embarrassing rather than dirty.
  function tidiness(flat) {
    if (!flat) return 1;
    const mess = flat.dishes * 0.30 + flat.trash * 0.30 + flat.dust * 0.22 +
                 flat.smell * 0.10 + (S.hung && S.hung.deck === 2 ? 0.08 : 0);
    return clamp(1 - mess, 0, 1);
  }
  // What living in it does to you per hour. `decay` already doubles the mood rate on a filthy
  // person; this is the same argument about the room they are standing in.
  const messMood = flat => -(1 - tidiness(flat)) * 2.2;

  // The whole of what a bad night does to the rest of the day, as a multiplier on the decay rate.
  const restedMul = () => 1.6 - 0.6 * S.rested;

  return {
    BILLS, WASH_MINS, RICE_MINS, NOODLE_MINS, AYI_FEE, CYCLE, GRACE,
    tick, rollDay, sleepPlan, sleep, tidiness, messMood, restedMul, hotWater, dryMins,

    get rested() { return S.rested; },
    get slept() { return S.slept; },
    get arrears() { return S.arrears; },
    get alarm() { return S.alarm; },
    get alarmRang() { return S.alarmRang; },
    get heaterOn() { return S.heater; },
    get fanOn() { return S.fan; },
    get leftovers() { return S.leftovers; },
    get bills() { return S.bills; },
    get post() { return S.post; },
    get parcels() { return S.parcels; },
    get ayi() { return S.ayi; },
    get guest() { return S.guest; },
    get prep() { return S.prep; },
    get hung() { return S.hung; },

    // ---- the alarm. Setting one has to be able to cost you sleep or it is a decoration.
    setAlarm(hour) { S.alarm = hour === null ? null : clamp(+hour || 0, 0, 23.75); return S.alarm; },
    clearAlarm() { S.alarm = null; },
    alarmSay() {
      if (S.alarm === null) return '闹钟没设。';
      const h = Math.floor(S.alarm), m = Math.round((S.alarm - h) * 60);
      return `闹钟设在${h}点${m ? m + '分' : ''}。`;
    },

    // ---- 热水器 and 洗澡.
    toggleHeater() { S.heater = !S.heater; return S.heater; },
    // What a shower is worth right now. A cold one still works — a blocked door is the wrong answer
    // by the project's standing rule — it just restores less and costs you the mood.
    // 停水 is found out here, standing in the shower, and not in a toast on the way past. Optional
    // clock: handed one it asks js/disrupt.js whether the water is off this hour, and no water is
    // worse than cold water — you do not get clean at all and you have to go to work anyway. The
    // 42 degree readout js/home-bath.js:200 already draws is reading `hot`, so it goes cold with it.
    shower(day, minutes) {
      const dry = day !== undefined && typeof Disrupt !== 'undefined' && Disrupt.homeWater
                  && Disrupt.homeWater(day, minutes);
      if (dry) return { hot:false, water:false, clean:0, mood:-14,
                        why:dry.note || ['停水了，一滴水都没有。', 'The water is off — not a drop.'] };
      return hotWater()
        ? { hot:true,  water:true, clean:100, mood:11 }
        : { hot:false, water:true, clean:52,  mood:-9 };
    },

    // ---- 刷牙, twice a day. A verb you can spam ten times for a full meter is not a habit.
    teethLeft(day) { if (S.teethDay !== day) { S.teeth = 0; S.teethDay = day; } return Math.max(0, 2 - S.teeth); },
    brush(day) {
      const left = this.teethLeft(day);
      if (!left) return { ok:false };
      S.teeth++;
      return { ok:true, left: left - 1, clean:13, mood: S.teeth === 2 ? 6 : 3 };
    },

    // ---- 电饭煲. Rice goes on, you do something else, it is ready later. Every dish in the pantry
    // otherwise pins you to the stove for its whole `mins`, which is not how anyone has cooked.
    riceOn(day, minutes) {
      if (S.rice) return null;
      S.rice = { at: abs(day, minutes) + RICE_MINS };
      return S.rice;
    },
    riceLeft(day, minutes) { return S.rice ? Math.max(0, S.rice.at - abs(day, minutes)) : -1; },
    riceReady(day, minutes) { return !!S.rice && abs(day, minutes) >= S.rice.at; },
    riceTake(day, minutes) {
      if (!this.riceReady(day, minutes)) return null;
      S.rice = null;
      return { hz:'米饭', en:'steamed rice', food:30, mood:5 };
    },

    // ---- 案板 then 炒锅. The forty minutes pantry.js charges for 打卤面 is now a sequence you can
    // be interrupted in: two fifths of it is chopping, and what you chopped keeps until midnight.
    prepMins: m => Math.max(4, Math.round(m * 0.4)),
    cookMins: m => Math.max(4, Math.round(m * 0.6)),
    prepFor(hz, day) { S.prep = { hz, day }; return S.prep; },
    prepped(hz, day) { return !!(S.prep && S.prep.hz === hz && S.prep.day === day); },
    prepClear() { S.prep = null; },

    // ---- 抽油烟机, and the smell it is the reason a Chinese kitchen has a door for.
    toggleFan() { S.fan = !S.fan; return S.fan; },
    cooked(flat, mins) {
      if (!flat) return;
      flat.smell = clamp(flat.smell + (S.fan ? 0.05 : 0.45), 0, 1);
      // Washing up now scales with what you cooked: 饺子 for four and a bowl of soup no longer
      // leave the same sink.
      flat.dishes = clamp(flat.dishes + clamp(mins / 60, 0.25, 1), 0, 1);
    },
    // How long the washing up in the sink is worth, in minutes and in the meter.
    washUp(flat) {
      const n = flat ? flat.dishes : 0;
      return { mins: Math.round(6 + 18 * n), clean: Math.round(6 + 12 * n), mood: Math.round(2 + 5 * n) };
    },

    // ---- 方便面 at the 热水壶. 泡面 is the lazy option only if it is visibly faster than the
    // twenty-five to sixty minutes the hob costs, so it gets its own path and its own three
    // minutes rather than the generic raw-eat in Pantry.next.
    noodleMins: NOODLE_MINS,
    // 泡面 — the verb, not the packet. Whether the kettle can offer it at all, so game.js does not
    // have to know that 方便面 is the product and 泡面 is what you do to it.
    canNoodle(day) { return this.stockOf('方便面', day) > 0; },
    noodle(day) {
      if (!this.drawOne('方便面', day)) return null;
      return { hz: '泡面', en: 'instant noodles', mins: NOODLE_MINS, food: 26, mood: 3 };
    },
    // How many of one named product are in the fridge, and taking exactly one of them out.
    //
    // ponytail: js/pantry.js has no "take this product" call — `draw` is private and the file
    // belongs to another lane — so one unit is removed by rewriting the lot list through the
    // public toSave/load pair. It round-trips exactly and it is O(lots), which is under forty.
    // Upgrade path: delete both of these the day Pantry exports `draw`.
    stockOf(hz, day) {
      if (typeof Pantry === 'undefined') return 0;
      const row = Pantry.list(day).find(r => r.hz === hz);
      return row ? row.n : 0;
    },
    drawOne(hz, day) {
      if (typeof Pantry === 'undefined') return false;
      const lots = Pantry.toSave();
      // Oldest first, the same rule the fridge itself eats by.
      let best = -1;
      for (let i = 0; i < lots.length; i++)
        if (lots[i].h === hz && lots[i].n > 0 && (best < 0 || lots[i].d < lots[best].d)) best = i;
      if (best < 0) return false;
      if (--lots[best].n <= 0) lots.splice(best, 1);
      Pantry.load(lots);
      return true;
    },

    // ---- what is on a plate rather than in a pan. Cooking at the wok plates the dish up; carrying
    // it through to the 餐厅 and sitting down to it is worth more than eating it standing at the
    // hob, which is the only reason the dining room is a room.
    //
    // Deliberately NOT in the save, by the same rule as the basket and the half-finished action:
    // a plate is something in your hands, and what the save keeps is the state of your life.
    plated: null,
    plate(hz, en, day, gain) { this.plated = { hz, en, day, gain:{ ...gain } }; return this.plated; },
    takePlate() { const p = this.plated; this.plated = null; return p; },

    // ---- leftovers. A dish that feeds more than one leaves a portion in the fridge, dated, and it
    // goes off like everything else does.
    //
    // ponytail: this is a HomeLife field rather than a 剩菜 lot in js/pantry.js, because pantry.js
    // belongs to another lane. Upgrade path: one PRODUCTS row and this becomes Pantry.add('剩菜').
    keepLeftovers(hz, en, day, mins) {
      if (mins < 35) return null;                 // a bowl of soup is one bowl of soup
      S.leftovers = { hz, en, n:1, day };
      return S.leftovers;
    },
    leftoverGone(day) { return !!S.leftovers && day > S.leftovers.day + 1; },
    eatLeftovers(day) {
      if (!S.leftovers) return null;
      const l = S.leftovers, off = this.leftoverGone(day);
      S.leftovers = null;
      return { ...l, off, food: off ? 6 : 40, mood: off ? -16 : 6 };
    },

    // ---- 外卖. The delivery loop already works end to end; what it never had was a reason to cook
    // instead. Three nights running and the third one tastes of the first two.
    takeaway(day) {
      S.waimai = S.waimai.filter(d => d >= day - 3);
      S.waimai.push(day);
      const run = new Set(S.waimai).size;
      return { run, mood: run >= 3 ? -14 : run === 2 ? -4 : 3 };
    },
    takeawayRun(day) { return new Set(S.waimai.filter(d => d >= day - 2)).size; },

    // ---- 洗衣机 and 晾衣架. A machine that finishes into a void is the same as no machine, so a
    // load has to come out of the drum and go onto a rack before there is anything to wear.
    laundryReady(flat) { return !!flat && flat.laundry >= 0.15; },
    washOn(day, minutes, flat) {
      if (S.wash || S.washDone || !this.laundryReady(flat)) return null;
      S.wash = { at: abs(day, minutes) + WASH_MINS };
      flat.wash = 0;
      return S.wash;
    },
    washLeft(day, minutes) { return S.wash ? Math.max(0, S.wash.at - abs(day, minutes)) : -1; },
    washWaiting() { return S.washDone; },
    // Onto the rack, on whichever deck the rack is. The roof and the balcony are outdoors and the
    // sky can ruin them; a rack in the bathroom cannot be rained on and takes twice as long.
    hangOut(day, minutes, deck, flat) {
      if (!S.washDone) return null;
      S.washDone = false;
      S.hung = { from: abs(day, minutes), deck, ruined:false };
      if (flat) { flat.hung = 0; flat.laundry = 0; flat.wash = 0; }
      return S.hung;
    },
    hungOn() { return S.hung ? S.hung.deck : -1; },
    hungState(flat) {
      if (!S.hung) return null;
      return { deck:S.hung.deck, ruined:S.hung.ruined, dry: flat ? flat.hung : 0 };
    },
    // Bringing it in. Wet or ruined and it goes back in the pile, which is the honest outcome.
    bringIn(flat) {
      if (!S.hung) return null;
      const dry = flat ? flat.hung : 0, ruined = S.hung.ruined;
      if (ruined || dry < 0.98) {
        S.hung = null;
        if (flat) { flat.laundry = Math.max(flat.laundry, ruined ? 0.55 : 0.35); flat.hung = 0; }
        return { ok:false, ruined, dry };
      }
      S.hung = null;
      if (flat) { flat.hung = 0; flat.laundry = 0; }
      return { ok:true, ruined:false, dry:1 };
    },
    // Wearing something adds to the pile. This is where the shirt that came off goes.
    wore(flat) { if (flat) flat.laundry = Math.min(1, flat.laundry + 0.12); },

    // ---- 打扫. The only chore the flat had was 扔垃圾, which reset everything at once.
    // What it is worth, and doing it. Two calls rather than one, because the label has to be able
    // to price the job before the player commits to it without the pricing clearing the floor.
    sweepWorth: dust => ({ dust, mins: Math.round(12 + 34 * dust),
                           mood: Math.round(4 + 10 * dust), clean: Math.round(3 + 9 * dust) }),
    sweep(flat) {
      if (!flat) return this.sweepWorth(0);
      const was = flat.dust;
      flat.dust = 0;
      flat.smell = Math.max(0, flat.smell - 0.4);
      return this.sweepWorth(was);
    },

    // ---- the 阿姨. Already a talk row and a recognised role, so this is a booking and a cost
    // rather than a new character — and she arrives on a day and works through it rather than
    // resolving on payment, because a service that completes instantly is a shop.
    bookAyi(day) {
      if (S.ayi && !S.ayi.done && S.ayi.day >= day) return null;
      S.ayi = { day: day + 1, done:false };
      return { ...S.ayi, fee: AYI_FEE };
    },
    ayiDue(day) { return !!(S.ayi && !S.ayi.done && S.ayi.day <= day); },

    // ---- 缴费. Paying is somewhere you go: the 物业 desk on F4, or the phone.
    billsDue(day) { return S.bills.filter(b => !b.paid && b.due >= day); },
    billsOwed() { return S.bills.filter(b => !b.paid).reduce((t, b) => t + b.yuan, 0) + S.arrears; },
    payBills(cash) {
      let left = Math.max(0, cash), spent = 0;
      const paid = [];
      if (S.arrears > 0) { const t = Math.min(left, S.arrears); S.arrears -= t; left -= t; spent += t; }
      for (const b of S.bills) {
        if (b.paid || left < b.yuan) continue;
        b.paid = true; left -= b.yuan; spent += b.yuan; paid.push(b);
      }
      S.bills = S.bills.filter(b => !b.paid);
      return { spent, paid, owed: this.billsOwed() };
    },

    // ---- the 信箱 and the 快递柜. Both return only objects already held by their backing store, so
    // a completed handoff can verify exact identity rather than minting property on read.
    mailbox(day) {
      const got = S.post.slice();
      S.post = [];
      return got;
    },
    postFor(day) { return S.post.length; },
    addParcel(hz, en, day, where) {
      const code = `${1 + (day * 7 + S.parcels.length * 13) % 9}${(day * 31) % 10}${(day * 17 + 3) % 10}${(day * 5 + 7) % 10}`;
      S.parcels.push({ hz, en, code, day, where: where || 'locker' });
      return S.parcels[S.parcels.length - 1];
    },
    parcelsAt(where) { return S.parcels.filter(p => p.where === where); },
    lockerCode() { const p = this.parcelsAt('locker')[0]; return p ? p.code : null; },
    takeParcel(where) {
      const i = S.parcels.findIndex(p => p.where === (where || 'locker'));
      if (i < 0) return null;
      return S.parcels.splice(i, 1)[0];
    },

    // ---- hosting. A visit is a plan that can be missed, using the appointment machinery the hotel
    // already has, rather than an event that fires.
    invite(hz, py, en, day, hour) {
      S.guest = { hz, py, en, day, hour, done:false, mood:0 };
      if (typeof Story !== 'undefined' && Story.plan) Story.plan('homeVisit', day, hour);
      return S.guest;
    },
    guestDue(day, minutes) {
      const g = S.guest;
      if (!g || g.done) return null;
      const h = minutes / 60;
      return (g.day === day && h >= g.hour && h < g.hour + 2) ? g : null;
    },
    guestMissed(day) { return !!(S.guest && !S.guest.done && S.guest.day < day); },
    // How the visit goes is the state of the flat. This is the payoff for modelling the mess.
    hostGuest(flat, day) {
      const g = S.guest;
      if (!g) return null;
      g.done = true;
      const t = tidiness(flat);
      g.mood = Math.round(-14 + 34 * t);
      return { ...g, tidiness: t, mood: g.mood,
               tea: !!flat && flat.dishes < 0.6,
               say: t > 0.8 ? '你家收拾得真干净。' : t > 0.5 ? '你家挺舒服的。' : '你家……有点乱啊。',
               tr: t > 0.8 ? 'Your place is really tidy.'
                 : t > 0.5 ? 'Your place is comfortable.' : 'Your place is a bit of a mess.' };
    },

    // ---- the desk. The one review station in the player's home was a mood tick in a game about
    // learning Chinese: its 复习 row was written for the campus forecourt and touched Vocab nowhere.
    dueWords(n) {
      if (typeof Vocab === 'undefined' || !Vocab.dueList) return [];
      return Vocab.dueList().slice(0, n || 8);
    },
    dueTopic(topic) {
      if (typeof Vocab === 'undefined' || !Vocab.dueByTopic) return [];
      return Vocab.dueByTopic(topic);
    },
    studyWorth() {
      const n = this.dueWords(40).length;
      return { n, mins: Math.max(10, Math.min(60, n * 3)), mood: n ? 10 : 4 };
    },

    // ---- the save. Plain data, and every field validated on the way back in — a half-written
    // block must cost the state and not the boot.
    toSave: () => JSON.parse(JSON.stringify(S)),
    load(o) {
      S = fresh();
      if (!o || typeof o !== 'object') return;
      const num = (k, lo, hi) => { if (Number.isFinite(o[k])) S[k] = clamp(o[k], lo, hi); };
      const bool = k => { if (typeof o[k] === 'boolean') S[k] = o[k]; };
      if (o.alarm === null || Number.isFinite(o.alarm)) S.alarm = o.alarm === null ? null : clamp(o.alarm, 0, 23.75);
      num('slept', 0, 24); num('rested', 0, 1); num('wakeAbs', 0, 1e9);
      num('lateDay', 0, 1e6); num('teeth', 0, 9); num('teethDay', 0, 1e6);
      num('laundryDay', 0, 1e6); num('billDay', 0, 1e6); num('arrears', 0, 1e6);
      bool('alarmRang'); bool('heater'); bool('fan'); bool('washDone');
      if (o.rice && Number.isFinite(o.rice.at)) S.rice = { at:o.rice.at };
      if (o.prep && typeof o.prep.hz === 'string') S.prep = { hz:o.prep.hz, day:o.prep.day | 0 };
      if (o.wash && Number.isFinite(o.wash.at)) S.wash = { at:o.wash.at };
      if (o.hung && Number.isFinite(o.hung.from))
        S.hung = { from:o.hung.from, deck:o.hung.deck | 0, ruined:!!o.hung.ruined };
      if (o.leftovers && typeof o.leftovers.hz === 'string')
        S.leftovers = { hz:o.leftovers.hz, en:String(o.leftovers.en || ''), n:o.leftovers.n | 0 || 1, day:o.leftovers.day | 0 };
      if (Array.isArray(o.waimai)) S.waimai = o.waimai.filter(Number.isFinite).slice(-8);
      if (Array.isArray(o.bills))
        S.bills = o.bills.filter(b => b && typeof b.hz === 'string' && Number.isFinite(b.yuan))
                         .slice(0, 12)
                         .map(b => ({ hz:b.hz, py:String(b.py || ''), en:String(b.en || ''),
                                      yuan:Math.max(0, b.yuan | 0), due:b.due | 0,
                                      paid:!!b.paid, late:!!b.late }));
      if (Array.isArray(o.post))
        S.post = o.post.filter(p => p && typeof p.hz === 'string').slice(0, 12)
                       .map(p => ({ hz:p.hz, en:String(p.en || ''), day:p.day | 0, bill:!!p.bill }));
      if (Array.isArray(o.parcels))
        S.parcels = o.parcels.filter(p => p && typeof p.hz === 'string').slice(0, 8)
                             .map(p => ({ hz:p.hz, en:String(p.en || ''), code:String(p.code || ''),
                                          day:p.day | 0, where:p.where === 'door' ? 'door' : 'locker' }));
      if (o.ayi && Number.isFinite(o.ayi.day)) S.ayi = { day:o.ayi.day | 0, done:!!o.ayi.done };
      if (o.guest && typeof o.guest.hz === 'string')
        S.guest = { hz:o.guest.hz, py:String(o.guest.py || ''), en:String(o.guest.en || ''),
                    day:o.guest.day | 0, hour:+o.guest.hour || 0, done:!!o.guest.done,
                    mood:+o.guest.mood || 0 };
    },
    // ------------------------------------------------------------------ 楼梯 (item 251)
    //
    // The costs on `USE_AT.home['安全出口'].climb` are **per storey**, and applying them lived at
    // the one call site that used them, which is how floor 11 and floor 3 came to cost the same.
    // They are applied here instead so the lobby, the landing and any harness charge one climb
    // the same way. `climb` is passed in rather than imported: this file does not read js/data.js.
    stairFlights(from, to) { return Math.abs((to | 0) - (from | 0)); },
    stairMetres(from, to) { return +(this.stairFlights(from, to) * STOREY).toFixed(2); },
    stairCost(from, to, climb) {
      const c = climb || {};
      const n = this.stairFlights(from, to);
      const per = (v, d) => (Number.isFinite(+v) ? +v : d);
      return {
        floors: n,
        metres: this.stairMetres(from, to),
        // Never zero minutes even for a half-flight: something that costs nothing is not a climb.
        mins: n ? Math.max(1, Math.round(n * per(c.minsPerFloor, 1.2))) : 0,
        rest: Math.round(n * per(c.restPerFloor, -3.2)),
        mood: Math.round(n * per(c.moodPerFloor, -1.1)),
        secs: +(per(c.secs, 2.4) + n * per(c.secsPerFloor, 0.24)).toFixed(2),
        // Eleven storeys and one flight must not be described in the same sentence.
        high: n >= per(c.highFrom, 6),
        up: (to | 0) > (from | 0),
      };
    },

    // ------------------------------------------------------------------ 楼上 (item 263)
    // A named accessor over `Disrupt.noiseAt`, so the sleep rule above and anything that wants to
    // say *why* it was loud both go through one place rather than two copies of the deck default.
    noiseNow(day, minutes, deck) {
      if (typeof Disrupt === 'undefined' || !Disrupt.noiseAt) return null;
      return Disrupt.noiseAt(day, deck === undefined ? SLEEP_DECK : deck, minutes);
    },
    noiseNight(day, minutes, mins, deck) {
      return noiseNight(day, minutes, mins, deck === undefined ? SLEEP_DECK : deck);
    },

    // --------------------------------------------------------- 邻居 in the car (items 264, 321)
    //
    // `livesOn` is authored on thirteen home rows in js/data.js and was read by nothing. It is the
    // floor a person's flat is on, which is deliberately **not** where their body stands — every
    // one of those rows is `deck: 0`, down in the lobby, because that is where the game can draw
    // them. So this is the encounter as a *fact about the ride* rather than a second body: who is
    // in the car depends on the floors the car passed and the hour, and it is the same person for
    // the same hour of the same day, like everything else the calendar decides.
    //
    // Item 264 is the other half and is why `Story.knows` is here: the third time you share a lift
    // with 老李 he says something, and the first time he does not. Depth over count — one resident
    // who becomes familiar beats nine who never do.
    liftShare(day, minutes, from, to, cast) {
      const rows = cast || (typeof NPCS === 'undefined' ? null : NPCS);
      if (!rows) return null;
      const lo = Math.min(from | 0, to | 0), hi = Math.max(from | 0, to | 0);
      if (lo === hi) return null;
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      const wd = (((day | 0) % 7) + 7) % 7;
      // A trip that touches the ground floor is somebody going out or coming in, so anyone in the
      // building can be aboard. A trip between two upper floors is only the people it passes.
      const reaches = n => lo === 0 || (n.livesOn >= lo && n.livesOn <= hi);
      const pool = rows.filter(n =>
        n && n.place === 'home' && Number.isFinite(+n.livesOn) && reaches(n) &&
        (!n.days || !n.days.length || n.days.includes(wd)) &&
        (!n.hours || (h >= n.hours[0] && h < n.hours[1])));
      if (!pool.length) return null;
      // Two rides in three you have the car to yourself, which is what makes the third one worth
      // noticing. Deterministic on the day and the hour, never Math.random — the same reason
      // js/disrupt.js:14 gives for the metro.
      const k = ((day | 0) * 31 + Math.floor(h) * 7 + lo * 3 + hi * 5) % (pool.length * 3);
      if (k >= pool.length) return null;
      const n = pool[k];
      const ok = (typeof Story !== 'undefined' && Story.knows) ? Story.knows(n) | 0 : 0;
      const who = n.name || n.hz;
      return {
        n, hz: n.hz, name: n.name, py: n.py, livesOn: n.livesOn, knows: ok,
        zh: ok >= 2 ? `${who}也在电梯里，聊了一路。`
          : ok >= 1 ? `${who}也在电梯里，点了点头。`
          : `电梯里还有个人，按了${n.livesOn}楼。`,
        en: ok >= 2 ? `${who} is in the car — you talk the whole way.`
          : ok >= 1 ? `${who} is in the car. A nod, no more.`
          : `Somebody else in the car. They press ${n.livesOn}.`,
        mood: ok >= 2 ? 3 : ok >= 1 ? 1 : 0,
      };
    },

    reset() { S = fresh(); },
    // For harnesses only: the whole block, read-only.
    peek: () => S,
  };
})();
