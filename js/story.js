// 故事 — the arc, and the people in it.
//
// Two things were missing and they are really one thing. The city had no memory of you: you could
// understand every word 王阿姨 said for a fortnight and she would greet you on day fifteen exactly
// as she had on day one, because nothing anywhere wrote down that the two of you had ever spoken.
// And the game had nowhere to go: three daily goals rerolled forever, which is a reason to play
// today and never a reason to play until Thursday.
//
// So there is a record of who you have got through to, and there are chapters.
//
// What moves a relationship here is deliberately narrow. Not talking to somebody — *understanding*
// them. Affinity goes up when you answer what was actually asked, which is the same evidence the
// vocabulary system trusts, and it barely moves when you guess wrong. You cannot grind it by
// pressing Q at a person sixty times; you can only get better at listening to them. That is the
// whole design, and it is why this file reads Talk's `ok` and nothing else.
//
// Chapters gate on what the rest of the game already knows — words mastered, rank reached, places
// stood in, people understood — so none of them is a quest marker to walk to. You finish a chapter
// by living in a way that happens to satisfy it, and then you are told what it was.
const Story = (() => {

  // ---- how well somebody knows you, counted in conversations of theirs you have actually
  // followed.
  //
  // These numbers look small and they are pinned to something: a script in talk.js is two or three
  // turns long, `Talk.next` retires a turn for good once you get it right, and the longest script
  // anybody has is three. Twenty-six understood conversations exist in the whole game. So 老朋友
  // means "you followed everything this person ever asked you", which is a real and reachable
  // thing, and thresholds of 3/8/16 — which is what these were first written as — made two of the
  // five chapters literally impossible to finish. Do not raise these without lengthening the
  // scripts first; the two numbers are the same number.
  const LEVELS = [
    { at: 0, hz: '陌生', py: 'mòshēng', en: 'a stranger' },
    { at: 1, hz: '面熟', py: 'miànshú', en: 'a familiar face' },
    { at: 2, hz: '朋友', py: 'péngyou', en: 'a friend' },
    { at: 3, hz: '老朋友', py: 'lǎopéngyou', en: 'an old friend' },
  ];

  // ---- the arc. `want` is read by the chapter panel and by the diary, so it is written as
  // something a person would say rather than as a list of counters. `done` is the counter.
  //
  // Every gate below is a number the game was already keeping. That is the point: a chapter is a
  // description of how you have been living, handed back to you, not an errand.
  const CHAPTERS = [
    { hz: '落脚', py: 'luòjiǎo', en: 'Getting a foothold',
      blurb: ['先把这条胡同认下来。', 'Learn your way around the alley first.'],
      want: ['40 words met', 'clock in once', 'understand 3 conversations'],
      done: c => c.words >= 40 && c.clocked >= 1 && c.understood >= 3,
      say: ['这条胡同你认得了。', 'You know this alley now.'] },

    { hz: '上班', py: 'shàngbān', en: 'Going to work',
      blurb: ['有个活儿，有份工资。', 'A job, and wages for it.'],
      want: ['reach 职员', '10 jobs finished', 'understand 8 conversations'],
      done: c => c.rank >= 1 && c.jobs >= 10 && c.understood >= 8,
      say: ['你在这儿有工作了。', 'You have work here now.'] },

    { hz: '熟人', py: 'shúrén', en: 'Knowing people',
      blurb: ['有人记得你了。', 'People remember you now.'],
      want: ['two people at 朋友', 'stand in 8 different places', '120 words met'],
      done: c => c.friends >= 2 && c.places >= 8 && c.words >= 120,
      say: ['这城里有人认识你了。', 'There are people in this city who know you.'] },

    { hz: '远行', py: 'yuǎnxíng', en: 'Going further',
      blurb: ['北京之外还有地方。', 'There is somewhere beyond Beijing.'],
      want: ['fly to 外滩', 'reach 主管', '60 words mastered'],
      done: c => c.bund && c.rank >= 2 && c.mastered >= 60,
      say: ['你自己走出去了一趟。', 'You made the trip out on your own.'] },

    { hz: '落地', py: 'luòdì', en: 'Putting down roots',
      blurb: ['不再是新来的了。', 'Not the new arrival any more.'],
      want: ['reach 经理', 'one 老朋友', '200 words mastered'],
      done: c => c.rank >= 3 && c.close >= 1 && c.mastered >= 200,
      say: ['你不是新来的了。', 'You are not new here any more.'] },
  ];

  const fresh = () => ({
    ch: 0,            // which chapter you are on
    chDay: {},        // chapter index -> the day it closed
    who: {},          // name -> { ok, miss, day } — understood, misheard, last spoken to
    places: {},       // place key -> true, everywhere you have stood
    bund: false,      // the one trip that is not a bus ride
    clocked: 0,
    // 住店. Six counters and two marks, and that is the whole of what a front desk remembers about
    // a guest. Fixed width: nothing in here is a list, so it cannot grow with the number of stays.
    hotel: { stays:0, nights:0, spent:0, late:0, problems:0, solved:0, mark:0, markOk:false },
    // Plans made earlier in the day. One entry per plan key, day-scoped, so this is bounded by the
    // number of things in the city you can book rather than by how long you have played.
    plans: {},
  });

  let S = fresh();

  // Names are normally the relationship key. `storyKey` is the narrow escape hatch for two
  // genuinely different people who share both a surname and workplace title.
  const keyOf = n => (n && (n.storyKey || n.name || n.hz)) || '';
  const rec = k => (S.who[k] = S.who[k] || { ok: 0, miss: 0, day: 0 });
  const levelOf = ok => {
    let lv = LEVELS[0];
    for (const l of LEVELS) if (ok >= l.at) lv = l;
    return lv;
  };
  const countAt = min => Object.values(S.who).filter(r => r.ok >= min).length;

  // ---- 住店. What the front desk remembers, which is not the same as what the guest remembers.
  //
  // Nothing in js/stay.js calls this. Story calls it, on arrival, and *reads* the stay — the same
  // shape disrupt.js is built on and for the same reason: the hotel answers questions, it never
  // fires an event at a listener, so a player who never goes near the building costs this file one
  // string comparison a scene and nothing else.
  //
  // The two things worth remembering have to be read at two different moments, because check-out
  // wipes the folio. The problem is read while the stay is still open — `reported` is "you said
  // something at the desk" and `fixed` is "and you understood the answer", which is the only thing
  // in this building that comprehension changes. Everything else is read afterwards off the bill
  // check-out left behind, which is exactly what a real front desk has in front of it.
  function foldStay() {
    const St = typeof Stay !== 'undefined' ? Stay : null;
    if (!St || !St.stays) return;
    const h = S.hotel;
    const done = St.stays() | 0;
    if (done !== h.stays) {
      if (done > h.stays) {
        const bill = St.lastBill && St.lastBill();
        if (bill) {
          h.nights += bill.nights | 0;
          h.spent += Math.max(0, bill.total | 0);
          // 超时未退房 and 押金不退 are the two lines js/stay.js posts for overrunning. Either one
          // is the desk's answer to "can I have a late check-out" next time.
          if (bill.rows.some(r => r.hz === '超时未退房' || r.hz === '押金不退')) h.late++;
        }
      }
      h.stays = done;                       // a reset counts down as honestly as it counts up
      h.mark = 0; h.markOk = false;
    }
    // `booking()` with no day is a pure read — passing one would run js/stay.js's overstay settle,
    // and walking into a lobby is not the moment to decide somebody has overstayed.
    const b = St.booking && St.booking();
    const p = b && St.problem && St.problem();
    if (!b || !p || !p.reported) return;
    const id = b.room * 10000 + b.from;     // one fold per stay, not one per arrival
    if (h.mark !== id) { h.mark = id; h.markOk = !!p.fixed; h.problems++; if (p.fixed) h.solved++; }
    else if (p.fixed && !h.markOk) { h.markOk = true; h.solved++; }
  }

  return {
    LEVELS, CHAPTERS,

    // ---- the people
    //
    // Understanding somebody is worth a point. Mishearing them is worth nothing — not a penalty,
    // because a person who tries to follow you and fails is not being rude, and punishing that
    // would teach the player to avoid the conversations they most need.
    heard(n, ok, day) {
      const k = keyOf(n);
      if (!k) return null;
      const r = rec(k);
      if (n.storyName) r.name = n.storyName;
      else if (!r.name) r.name = n.name || n.hz || k;
      const before = levelOf(r.ok);
      if (ok) r.ok++; else r.miss++;
      r.day = day | 0;
      const after = levelOf(r.ok);
      return { key: k, ok: r.ok, level: after, rose: after.at > before.at };
    },

    level(n) { const k = keyOf(n); return levelOf(S.who[k] ? S.who[k].ok : 0); },
    knows(n) { const k = keyOf(n); return S.who[k] ? S.who[k].ok : 0; },
    // Everybody who has got past the first rung, most-known first — the notebook's list of people.
    people() {
      return Object.entries(S.who)
        .map(([k, r]) => ({ name: r.name || k, ok: r.ok, miss: r.miss,
                            day: r.day, level: levelOf(r.ok) }))
        .filter(p => p.ok > 0)
        .sort((a, b) => b.ok - a.ok);
    },

    // ---- where you have been. Called on every arrival; cheap, and idempotent.
    //
    // Idempotent in what it *records* — the return value is still "this is the first time" and the
    // chapter gates still count distinct places. The hotel fold happens before that early return,
    // because arriving in the lobby for the ninth time is exactly when the desk looks you up.
    stoodIn(place) {
      if (!place) return false;
      if (place.charCodeAt(0) === 104 && place.slice(0, 5) === 'hotel') foldStay();
      if (S.places[place]) return false;
      S.places[place] = true;
      if (place === 'bund') S.bund = true;
      return true;
    },
    placeCount: () => Object.keys(S.places).length,
    clockedIn() { S.clocked++; },

    // ---- 前台. What the desk knows about you before you have said anything, and what it is
    // therefore willing to do without an argument (H138, H139).
    //
    // `known` is ordinary affinity and nothing special: the front desk are people in js/data.js
    // like anybody else, so understanding 林若 counts here the way understanding 王阿姨 counts
    // everywhere. The favours are the part that is the hotel's own. A guest who has stayed before
    // and never overrun gets the late check-out without being charged for the argument. A guest who
    // once reported a broken room in Chinese and understood the answer gets offered the better
    // room next time — which makes following that one reply worth something a week later.
    RECEPTION: ['林若', '高迎'],
    reception() {
      const h = S.hotel;
      let known = 0;
      for (const n of this.RECEPTION) if (S.who[n] && S.who[n].ok > known) known = S.who[n].ok;
      const lv = levelOf(known);
      return {
        stays:h.stays, nights:h.nights, spent:h.spent, late:h.late,
        problems:h.problems, solved:h.solved, known, level:lv,
        greeting: !h.stays ? { hz:'欢迎光临。', en:'Welcome.' }
          // 习惯性晚退房: overran on half your stays or more. Once out of four is bad luck and the
          // desk does not mention it; twice out of three is a habit and it does.
          : h.late * 2 >= h.stays ? { hz:'又见面了。这次记得中午十二点退房。',
                                      en:'Good to see you again — check-out is twelve, this time.' }
          : lv.at >= 2 ? { hz:'您又来了，还是老房型吗？', en:'You are back — the usual room?' }
          : { hz:'欢迎再次光临。', en:'Welcome back.' },
        // Offered rather than negotiated. Read these; do not write them.
        favours: {
          lateCheckout: h.stays >= 1 && h.late === 0,
          upgrade: h.stays >= 2 && h.solved >= 1,
          waiveDeposit: h.stays >= 3 && h.late === 0 && lv.at >= 2,
        },
      };
    },

    // ---- 约好的事. A plan made earlier in the day, which is the only kind of plan you can miss.
    // The roof restaurant wants a table booked before it opens (H142) and the spa wants an
    // appointment (H143); both are the same shape, so both live here rather than in two modules.
    // Day-scoped: one entry per plan key, and `planned` answers null for any day but the one it
    // was made for. It cannot grow with play time because it is keyed by PLAN KEY, not by day —
    // `plan()` overwrites `S.plans[key]` wholesale, so the map is bounded by the number of plan
    // keys in the game (two: rooftop, spa).
    plan(key, day, hour) {
      if (!key) return null;
      S.plans[key] = { day: day | 0, hour: +hour || 0 };
      return { key, day: S.plans[key].day, hour: S.plans[key].hour };
    },
    // A QUERY, and it does not mutate. It used to `delete S.plans[key]` whenever the day asked
    // about was not the plan's day, justified as garbage collection — but the map is bounded by
    // key (see above), so the delete collected nothing and destroyed live data instead: asking
    // "is anything booked tomorrow?" threw away today's appointment. Two floors depend on this
    // for H142/H143, and `js/hotel-service.js:1802` had already had to reorder its own checks to
    // ask this one LAST to work around the mutation. That workaround can now go.
    planned(key, day) {
      const p = S.plans[key];
      if (!p || p.day !== (day | 0)) return null;
      return { key, day: p.day, hour: p.hour };
    },
    cancelPlan(key) { const had = !!S.plans[key]; delete S.plans[key]; return had; },

    // ---- the arc
    chapter: () => CHAPTERS[Math.min(S.ch, CHAPTERS.length - 1)],
    chapterI: () => S.ch,
    finished: () => S.ch >= CHAPTERS.length,

    // Everything a chapter gate can ask about, gathered in one place so the gates stay readable
    // and so nothing here has to know where any of it comes from.
    facts() {
      return {
        words: typeof Vocab !== 'undefined' ? Vocab.count() : 0,
        mastered: typeof Vocab !== 'undefined'
          ? Object.keys(Vocab.DICT).filter(h => Vocab.mastered(h)).length : 0,
        rank: typeof Career !== 'undefined' ? Career.RANKS.indexOf(Career.rank()) : 0,
        jobs: typeof Career !== 'undefined' ? Career.jobsDone() : 0,
        clocked: S.clocked,
        understood: Object.values(S.who).reduce((n, r) => n + r.ok, 0),
        friends: countAt(LEVELS[2].at),
        close: countAt(LEVELS[3].at),
        places: Object.keys(S.places).length,
        bund: S.bund,
      };
    },

    // Has the chapter closed? Asked after anything that could have closed one — a conversation, a
    // promotion, an arrival — and it returns the chapter that just ended, once.
    check(day) {
      if (this.finished()) return null;
      const ch = CHAPTERS[S.ch];
      if (!ch.done(this.facts())) return null;
      S.chDay[S.ch] = day | 0;
      S.ch++;
      return ch;
    },

    // What is still outstanding, for the notebook.
    progress() {
      if (this.finished()) return null;
      const ch = CHAPTERS[S.ch];
      return { ch, i: S.ch, of: CHAPTERS.length, facts: this.facts(), want: ch.want };
    },

    // ---- the save. Same rule as the career: a save from before any of this existed does not get
    // a history invented for it. It starts at chapter one with nobody known, which is true — the
    // game was not remembering those conversations when they happened.
    toSave: () => ({ ch: S.ch, chDay: { ...S.chDay }, who: { ...S.who },
                     places: { ...S.places }, bund: S.bund, clocked: S.clocked,
                     hotel: { ...S.hotel }, plans: { ...S.plans } }),
    load(o) {
      S = fresh();
      if (!o || typeof o !== 'object') return;
      // Six numbers and two marks, each clamped on its own, so one corrupt field cannot make the
      // desk think you have stayed minus four times.
      if (o.hotel && typeof o.hotel === 'object')
        for (const k of ['stays', 'nights', 'spent', 'late', 'problems', 'solved', 'mark'])
          if (Number.isFinite(o.hotel[k])) S.hotel[k] = Math.max(0, o.hotel[k] | 0);
      if (o.hotel) S.hotel.markOk = !!o.hotel.markOk;
      // Plans are day-scoped and there are a handful of them; a saved map with anything else in it
      // is dropped rather than trusted, and the cap is what stops a hand-edited save growing this.
      if (o.plans && typeof o.plans === 'object')
        for (const [k, p] of Object.entries(o.plans).slice(0, 16))
          if (p && typeof p === 'object' && Number.isSafeInteger(p.day) && p.day >= 0)
            S.plans[String(k).slice(0, 24)] = { day: p.day | 0, hour: Math.max(0, +p.hour || 0) };
      if (typeof o.ch === 'number') S.ch = Math.max(0, Math.min(CHAPTERS.length, o.ch | 0));
      if (typeof o.clocked === 'number') S.clocked = o.clocked;
      S.bund = !!o.bund;
      if (o.who && typeof o.who === 'object')
        for (const [k, r] of Object.entries(o.who))
          if (r && typeof r === 'object')
            S.who[k] = { ok: r.ok | 0, miss: r.miss | 0, day: r.day | 0,
                         name: typeof r.name === 'string' ? r.name.slice(0, 40) : undefined };
      if (o.places && typeof o.places === 'object') S.places = { ...o.places };
      if (o.chDay && typeof o.chDay === 'object') S.chDay = { ...o.chDay };
    },
    reset() { S = fresh(); },
  };
})();
