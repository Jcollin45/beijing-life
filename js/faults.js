// 报修 — the things in the flat that are broken, and getting them fixed.
//
// `js/world.js:2472` has the pendant light saying 灯坏了 and the 房东 promising 明天, and
// `js/world.js:2755` gives it a real flicker curve. What it does not have is a fault: nothing can
// ask whether the light is broken, nothing can report it, nobody ever comes, and 明天 never
// arrives. It is a sentence, and the flicker is a decoration on a sentence.
//
// That is the shape this file gives it. A fault is reported in Chinese at the 物业 desk on F4 —
// whose fee board and 报修 number are drawn and inert — or over the phone, somebody comes on a day
// you have to be in for, and the light stops flickering because the fault cleared rather than
// because a timer ran out.
//
// ---- why this is not in js/disrupt.js
//
// It looks like a disruption and it is the opposite of one. Everything in js/disrupt.js is a pure
// function of the day: one roll off the calendar that several locations ask the same question of,
// and no state at all. A fault is the other kind entirely — it is *yours*, it starts when something
// breaks in front of you, it persists until you do something about it, and it has to survive a
// reload as a fact rather than as a re-derivation. Putting mutable player state in that file would
// break the one property it exists to keep, and the header there says so at length.
//
// Like career.js, story.js and pantry.js this is state and rules only. It draws nothing, it knows
// about no room, and it never touches `needs` or the HUD.
const Faults = (() => {

  // ---- 会坏的东西. What can break, and what it costs while it is broken.
  //
  // Deliberately a table rather than a switch, so a room that wants a breakable object registers a
  // row instead of this file learning about a room. `where` is the deck it is on, so the 物业 desk
  // can say which flat; `mins` is how long the visit takes out of the day you waited in for it.
  //
  // Every `hz` is an existing dictionary row. Same rule as js/pantry.js's products, for the same
  // reason: a headword nothing can gloss is a blank pinyin on the card that reports it.
  const KNOWN = {
    // 吊灯. The one that already exists in the world and could not be asked about.
    light: { hz:'灯', py:'dēng', en:'the ceiling light', deck:2, mins:20,
             broke:['灯坏了，一闪一闪的。', 'The light has gone — it keeps flickering.'],
             fixed:['灯修好了。', 'The light is fixed.'] },
    // The rest of what a flat does to you. None of these are wired to a room yet; they are here so
    // the second one costs a row rather than a design.
    tap:   { hz:'水龙头', py:'shuǐlóngtóu', en:'the tap', deck:2, mins:30,
             broke:['水龙头一直滴水。', 'The tap will not stop dripping.'],
             fixed:['水龙头不滴了。', 'The tap has stopped dripping.'] },
    heater:{ hz:'热水器', py:'rèshuǐqì', en:'the water heater', deck:2, mins:45,
             broke:['热水器不热了，只有凉水。', 'No hot water — the heater has packed up.'],
             fixed:['热水器修好了，有热水了。', 'The heater is fixed; there is hot water.'] },
    door:  { hz:'门锁', py:'ménsuǒ', en:'the door lock', deck:2, mins:25,
             broke:['门锁卡住了，钥匙转不动。', 'The lock has jammed — the key will not turn.'],
             fixed:['门锁修好了。', 'The lock turns again.'] },
  };

  // 明天. What the 房东 promises at js/world.js:2472, and therefore what this file has to mean by
  // it: a visit booked for the next day, not an unbounded wait and not an instant repair. The 物业
  // desk on F4 is faster than the landlord because that is what a management office is for.
  const LANDLORD_WAIT = 1;
  const OFFICE_WAIT = 1;
  const OFFICE_HRS = [9, 17];      // when somebody is actually at the F4 desk to take a 报修
  // Unreported, a fault does not fix itself and does not get worse forever either. This is the day
  // count after which the landlord notices on his own — a flat nobody complains about still has a
  // landlord in it.
  const SELF_NOTICE = 14;

  // key -> { since, reported, visit, by }
  //   since     the day it broke
  //   reported  the day you told somebody, or 0
  //   visit     the day somebody is coming, or 0
  //   by        '房东' or '物业', for the line that says who
  let S = {};

  const known = key => KNOWN[key] || null;

  return {
    KNOWN, LANDLORD_WAIT, OFFICE_WAIT, OFFICE_HRS, SELF_NOTICE,

    // ---- the question js/world.js could not ask. True while the thing is broken, whatever stage
    // of being fixed it is at — a light with a plumber booked for Thursday is still a dark room on
    // Wednesday, and the flicker curve at js/world.js:2755 should run off exactly this.
    broken: key => !!S[key],
    // Everything currently wrong, oldest first, for the 报修 card and the diary.
    list(day) {
      return Object.keys(S)
        .map(k => ({ key:k, ...KNOWN[k], ...S[k], days: Math.max(0, day - S[k].since) }))
        .sort((a, b) => a.since - b.since);
    },
    count: () => Object.keys(S).length,

    // ---- 坏了. Something goes. Idempotent: a light that is already broken does not break again
    // and does not reset the clock on the visit you have already booked, which is what a caller
    // driving this off a room tick would otherwise do sixty times a second.
    break(key, day) {
      if (!known(key) || S[key]) return null;
      S[key] = { since: day | 0, reported: 0, visit: 0, by: '' };
      return { key, ...KNOWN[key], ...S[key] };
    },

    // ---- 报修. Telling somebody. `by` is '物业' from the F4 desk and '房东' over the phone; the
    // office is only open in office hours, which is the reason to walk down rather than call.
    //
    // Returns null when there is nothing to report or it is already reported — so a caller can use
    // the null to keep the verb off the card rather than offering a 报修 that does nothing.
    report(key, day, by = '房东') {
      const f = S[key];
      if (!f || f.reported) return null;
      f.reported = day | 0;
      f.by = by;
      f.visit = (day | 0) + (by === '物业' ? OFFICE_WAIT : LANDLORD_WAIT);
      return { key, ...KNOWN[key], ...f };
    },
    reported: key => !!(S[key] && S[key].reported),
    // Can the F4 desk take it right now. The phone always can; the desk keeps hours.
    officeOpen(minutes) {
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      return h >= OFFICE_HRS[0] && h < OFFICE_HRS[1];
    },

    // ---- somebody comes. Called at the day rollover with the day that has started.
    //
    // A visit that lands while you are out is a visit missed, in exactly the way the courier is:
    // this returns what is *due* today and clears nothing on its own. `fix` is what clearing looks
    // like and the caller does it when the player is actually in. That split is the whole reason
    // being at home on a Wednesday afternoon is worth anything.
    due(day) {
      return Object.keys(S).filter(k => S[k].visit && day >= S[k].visit)
                           .map(k => ({ key:k, ...KNOWN[k], ...S[k] }));
    },
    fix(key) {
      const f = S[key];
      if (!f) return null;
      delete S[key];
      return { key, ...KNOWN[key], ...f };
    },
    // Missed him. The visit slides a day rather than being cancelled — a management office that
    // gives up after one attempt is a management office nobody would report anything to.
    missed(key, day) {
      const f = S[key];
      if (!f || !f.visit) return null;
      f.visit = (day | 0) + 1;
      return { key, ...KNOWN[key], ...f };
    },

    // ---- the rollover. Faults nobody reported eventually get noticed, so a player who never
    // works out the word for 坏了 is inconvenienced rather than stuck. Returns what changed.
    rollDay(day) {
      const out = [];
      for (const k in S) {
        const f = S[k];
        if (f.reported || day - f.since < SELF_NOTICE) continue;
        f.reported = day | 0;
        f.by = '房东';
        f.visit = (day | 0) + LANDLORD_WAIT;
        out.push({ key:k, ...KNOWN[k], ...f, self:true });
      }
      return out;
    },

    // ---- the save. Plain data, and validated on the way back in the way js/pantry.js's lots are:
    // a build that no longer has a fault by that name must not restore one nothing can clear.
    toSave: () => JSON.parse(JSON.stringify(S)),
    load(o) {
      S = {};
      if (!o || typeof o !== 'object') return;
      for (const k in o) {
        if (!KNOWN[k]) continue;
        const f = o[k];
        if (!f || !Number.isFinite(+f.since)) continue;
        S[k] = { since:+f.since | 0, reported:+f.reported | 0, visit:+f.visit | 0,
                 by: f.by === '物业' ? '物业' : f.by === '房东' ? '房东' : '' };
      }
    },
    reset() { S = {}; },
  };
})();
