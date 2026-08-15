// 工作 — the job, as something that goes somewhere.
//
// The office had five errands on a whiteboard and a card punch worth twenty kuai. You could do the
// same four hours on day one and on day ninety and nothing about the room, the pay or the people
// would know the difference. That is a chore list, not a job: there was no reason to turn up on a
// particular morning, no cost to not turning up at all, and nothing you were working towards.
//
// So: a week with weekdays in it, an attendance record that remembers, and four ranks you climb.
// What gates the climb is the part that matters here — days served and jobs finished get you to the
// door, but the last condition is vocabulary. 主管 is not handed to somebody who cannot read 请假,
// 报销 or 会议, because those are the words the job is actually made of. It is the one promotion
// requirement in the game that cannot be ground out by pressing Q at a desk: you have to have
// learned the words, in the same review queue as everything else, and the manager tells you which
// ones you are still missing.
//
// Everything here is state and rules. It draws nothing and it knows about no room; game.js asks it
// questions at the punch, at the whiteboard and at midnight.
const Career = (() => {

  // ---- the week. `day` in game.js is a bare counter that starts at 1, so day 1 is a Monday and
  // the arithmetic is the whole calendar. Saturday and Sunday are not workdays, which is what makes
  // 周末 a word with a meaning rather than a row in the dictionary.
  const WEEK = [
    ['星期一', 'xīngqīyī', 'Monday'],    ['星期二', "xīngqī'èr", 'Tuesday'],
    ['星期三', 'xīngqīsān', 'Wednesday'], ['星期四', 'xīngqīsì', 'Thursday'],
    ['星期五', 'xīngqīwǔ', 'Friday'],    ['星期六', 'xīngqīliù', 'Saturday'],
    ['星期天', 'xīngqītiān', 'Sunday'],
  ];

  // ---- the ladder. `pay` multiplies everything the whiteboard pays, so a promotion is felt in the
  // wallet on the very next job rather than announced and forgotten. `words` is the part you cannot
  // shortcut: every one of them has to be mastered — not met, not seen in a sentence, mastered —
  // before the rank is offered, and they are the words that rank actually uses.
  const RANKS = [
    { hz:'实习生', py:'shíxíshēng', en:'intern', pay:1.00, days:0, jobs:0, words:[] },
    { hz:'职员', py:'zhíyuán', en:'clerk', pay:1.25, days:4, jobs:6,
      words:['打卡', '上班', '下班', '工资'] },
    { hz:'主管', py:'zhǔguǎn', en:'supervisor', pay:1.60, days:10, jobs:16,
      words:['会议', '请假', '报销', '加班', '邮件'] },
    { hz:'经理', py:'jīnglǐ', en:'manager', pay:2.10, days:20, jobs:30,
      words:['升职', '全勤', '职员', '主管', '办公室', '迟到'] },
  ];

  // Clock in after this and it is 迟到, whatever else you do that day.
  const ON_TIME = 9.5;
  const SHIFT = [9, 18];

  // ---- 酒店的班. The seam, and deliberately not the chapter (H149).
  //
  // 京华大酒店 has nine departments, eleven named interaction tags and thirteen authored floors, and
  // none of it could be worked because "a job" meant "a row on the office whiteboard" everywhere in
  // this file. That is a one-word assumption, not an architecture, and the way to find out whether
  // it is the only one is to attach exactly one task to the hotel and see what breaks. Nothing did:
  // the shift below is shaped like a whiteboard job, so `pay()` marks it up by rank and
  // `finishJob()` counts it towards the next rung with no special case anywhere.
  //
  // Every string in it is checked against something real. `dept` is a key from HOTEL_DEPARTMENTS
  // (js/hotel.js:10) and housekeeping's floor list contains hotelB1; `tag` is one of the eleven
  // names in HOTEL_CORE.tags, which the tenant brief pins precisely because this is what they are
  // for; `place` is the floor the tag is actually on (js/hotel-service.js:1543). If a later pass
  // renames any of the three this stops matching, which is the point of writing it down here.
  //
  // A hotel does not close on Saturday, so unlike the office this is not gated on `isWorkday` —
  // that is the second assumption the seam found, and it is why 全勤 and the streak stay the
  // office's own idea rather than becoming everybody's.
  const HOTEL_SHIFT = {
    key:'linen', hz:'送布草', py:'sòng bùcǎo', en:'take clean linen up to the guest floors',
    dept:'housekeeping', tag:'布草间', place:'hotelB1',
    h0:14, h1:20, secs:2.4, mins:40, pay:24, gain:{ rest:-7, mood:2 },
  };

  const fresh = () => ({
    rank: 0,        // index into RANKS
    days: 0,        // days clocked in at all
    onTime: 0,      // ...of which, on time
    late: 0,
    missed: 0,      // workdays that went by with no card punched and no leave
    streak: 0,      // consecutive workdays on time
    best: 0,
    jobs: 0,        // whiteboard jobs finished
    done: Object.create(null),  // and which, by word; saved keys never inherit object members
    leave: Object.create(null), // day -> true, days the manager signed off
    warned: 0,      // the last day the manager mentioned the absences
  });

  let S = fresh();

  // What an unbroken run of mornings adds to the twenty. Zero on the first one, capped at five
  // days, so it is worth building and not worth farming.
  const runBonus = streak => Math.max(0, Math.min(streak, 6) - 1) * 5;

  const rank = () => RANKS[Math.min(S.rank, RANKS.length - 1)];
  const next = () => (S.rank + 1 < RANKS.length ? RANKS[S.rank + 1] : null);
  const weekdayI = day => ((day | 0) - 1) % 7;
  const mastered = hz => (typeof Vocab !== 'undefined' && Vocab.mastered ? Vocab.mastered(hz) : false);

  return {
    WEEK, RANKS, SHIFT, ON_TIME, HOTEL_SHIFT,

    // Is the hotel shift on the clock, and what is it worth at your rank? Two questions, the same
    // two the whiteboard answers, asked of a building instead of a floor. Finishing it is plain
    // `Career.finishJob(Career.HOTEL_SHIFT.hz)` — no second counter, so a hotel afternoon moves
    // you towards 主管 exactly as an office one does.
    hotelShift(hour) {
      const h = +hour || 0;
      return { ...HOTEL_SHIFT, open: h >= HOTEL_SHIFT.h0 && h < HOTEL_SHIFT.h1,
               pay: this.pay(HOTEL_SHIFT.pay) };
    },
    // Has this person ever actually worked a shift in the building? Read off `S.done`, which
    // `finishJob` was already keeping by word, so this is a question about existing state rather
    // than a second counter — the same rule the shift itself was written under.
    //
    // js/stay.js's `staffAccess` is the only caller: a house key opens your own room and nothing
    // else, and the B1 staff doors open for somebody who has carried linen up them (H108). Turning
    // up once is the whole of the test, deliberately — this is the seam the work chapter attaches
    // to, not the chapter.
    hotelShifts: () => S.done[HOTEL_SHIFT.hz] || 0,
    hotelStaff() { return this.hotelShifts() > 0; },

    // ---- the calendar
    weekday(day) {
      const w = WEEK[weekdayI(day)];
      return { i: weekdayI(day), hz: w[0], py: w[1], en: w[2] };
    },
    isWorkday: day => weekdayI(day) < 5,
    onLeave: day => !!S.leave[day],

    // ---- where you are on the ladder
    rank, next,
    rankName: () => rank().hz,
    // Everything the whiteboard pays runs through here, so a rank is worth something the same
    // afternoon it is given.
    pay: base => Math.round(base * rank().pay),

    // What is still between you and the next rung. Returned rather than printed, because the
    // whiteboard, the review and the diary all want to say it differently.
    toNext() {
      const n = next();
      if (!n) return null;
      const words = n.words.filter(w => !mastered(w));
      return {
        rank: n,
        days: Math.max(0, n.days - S.days), jobs: Math.max(0, n.jobs - S.jobs),
        words,
        ready: S.days >= n.days && S.jobs >= n.jobs && !words.length,
      };
    },

    promote() {
      const t = this.toNext();
      if (!t || !t.ready) return null;
      S.rank++;
      return rank();
    },

    // The other direction, which the job needed the moment absences started to cost something.
    // `js/survive.js` decides *when* — it holds the absence rule — and this only carries it out, so
    // that a rank still moves in exactly one place.
    //
    // `days` and `jobs` are deliberately left alone. They are a record of what you actually did and
    // rewriting them would be a lie; the rank is what you are trusted with, and that is what a
    // stretch of not turning up takes away. The streak goes because it is a run of mornings and the
    // run is what was broken. Returns null at the bottom rung, so the caller can tell the difference
    // between "you have been dropped a rank" and "there was nowhere left to drop you" — which is
    // what dismissal is, and it is `Survive`'s to announce, not this file's.
    demote() {
      if (S.rank <= 0) return null;
      S.rank--;
      S.streak = 0;
      return rank();
    },

    // A dismissal starts the next spell of employment at the bottom, but it does not erase the
    // days worked or jobs actually finished. Survive owns the dismissal rule and game.js calls
    // this once when that rule fires; rehire must not reset the same career a second time.
    dismiss() {
      S.rank = 0;
      S.streak = 0;
      return rank();
    },

    // ---- the card punch. A workday's attendance, and what it is worth: the bonus grows with the
    // rank and with an unbroken run, so turning up on time every morning of a week is worth
    // noticeably more than turning up on four of them.
    clockIn(day, hour) {
      if (S.lastDay === day) return { already: true };
      S.lastDay = day;
      const workday = this.isWorkday(day);
      const late = hour >= ON_TIME;
      // Letting yourself into an empty office on a Saturday is not a day's work: it pays nothing,
      // it counts towards no rank, and it neither builds nor breaks the run of weekday mornings.
      if (!workday) return { already: false, late, workday: false, bonus: 0, streak: S.streak,
                             weekend: true };
      S.days++;
      if (late) { S.late++; S.streak = 0; S.lateDay = day; }
      else { S.onTime++; S.streak++; S.best = Math.max(S.best, S.streak); }
      // Twenty for turning up on time, which is what 全勤 has always meant and what the office says
      // out loud. The run is worth something *on top* of that, from the second morning onward — so
      // a single punctual Monday still pays exactly the twenty the game has always promised.
      const bonus = late ? 0 : Math.round((20 + runBonus(S.streak)) * rank().pay);
      return { already: false, late, workday, bonus, streak: S.streak, weekend: false };
    },

    // ---- a job off the board, finished
    finishJob(hz) {
      S.jobs++;
      S.done[hz] = (S.done[hz] || 0) + 1;
    },

    // ---- 请假. A day the manager has signed off is not a day you failed to turn up, which is the
    // only difference between a holiday and an absence.
    takeLeave(day) {
      if (S.leave[day]) return false;
      S.leave[day] = true;
      return true;
    },

    // ---- midnight. Called with the day that has just ended, so a workday nobody punched a card on
    // — and nobody asked for off — goes on the record. This is the consequence that was missing:
    // not turning up used to cost exactly nothing.
    rollDay(endedDay) {
      if (!this.isWorkday(endedDay)) return null;
      if (S.leave[endedDay]) return null;
      if (S.lastDay === endedDay) return null;
      S.missed++;
      S.streak = 0;
      return { missed: S.missed };
    },

    // Whether the manager should say something about it, and only once per day.
    owedWarning(day) {
      if (S.missed < 2 || S.warned === day) return false;
      S.warned = day;
      return true;
    },

    // What the punch will be worth if you use it now, so the walk-up label and the payment cannot
    // disagree about the number. The streak has not been incremented yet at that point.
    punchWorth: late => (late ? 0 : Math.round((20 + runBonus(S.streak + 1)) * rank().pay)),

    stats: () => ({ ...S, rank: rank(), nextRank: next() }),
    missed: () => S.missed,
    jobsDone: () => S.jobs,
    daysWorked: () => S.days,
    streak: () => S.streak,

    // ---- the save. Old saves have no career at all and must not be given one retroactively —
    // somebody who has been playing for a fortnight has not been an intern for a fortnight, they
    // have been in a game where the rank did not exist. They start at the bottom, which is honest,
    // and their days are counted from here.
    toSave: () => ({ ...S }),
    load(o) {
      S = fresh();
      if (!o || typeof o !== 'object' || Array.isArray(o)) return;
      // These are counters and day markers, not arbitrary numbers. JSON.parse accepts an exponent
      // such as `1e309` as Infinity, and an imported/half-written save can also contain negatives
      // or fractions. Letting any of those through made promotion requirements, attendance and the
      // hotel-shift count impossible. One bad field now falls back to zero without discarding the
      // rest of the career, while every legitimate non-negative safe integer survives unchanged.
      const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
      S.rank = Math.min(RANKS.length - 1, count(o.rank));
      for (const k of ['days', 'onTime', 'late', 'missed', 'streak', 'best', 'jobs',
                       'warned', 'lastDay', 'lateDay'])
        S[k] = count(o[k]);
      // Both maps are written by this module with narrow value domains. Rebuild them entry by
      // entry instead of copying attacker-controlled object structure or inherited property names.
      if (o.done && typeof o.done === 'object' && !Array.isArray(o.done))
        for (const [hz, n] of Object.entries(o.done))
          if (typeof hz === 'string' && hz && Number.isSafeInteger(n) && n >= 0)
            S.done[hz] = n;
      if (o.leave && typeof o.leave === 'object' && !Array.isArray(o.leave))
        for (const [savedDay, approved] of Object.entries(o.leave)) {
          const leaveDay = Number(savedDay);
          if (approved === true && Number.isSafeInteger(leaveDay) && leaveDay > 0)
            S.leave[leaveDay] = true;
        }
    },
    reset() { S = fresh(); },
  };
})();
