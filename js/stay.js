// 住店 — the stay, as something that happens to you rather than a pose at a desk.
//
// The hotel was fourteen floors of geometry that did nothing. Checking in was one USE row that
// gave you mood:4 and a check pose; you could not book a room, hold a key, sleep in it, be
// charged for it, or leave with anything about your life changed. This is the loop that was
// missing: a dated room, a card with a number on it, a night that costs money, a thing that goes
// wrong in Chinese, and a bill at the end that you have to read.
//
// Everything here is state and rules. It draws nothing, it opens no panel and it knows about no
// room — js/hotel-public.js asks it questions at the front desk and the guest floors ask it
// whether the door in front of you is yours. Same shape as career.js and story.js.
//
// Two things are deliberately *derived* rather than stored, because stored counters drift:
//   · room nights are `min(today, checkout) - checkin`, so a night is charged once per night no
//     matter how many times you lie down (H110);
//   · other guests' rooms come out of a hash of (room, day), so occupancy is finite, dated and
//     identical after a reload without a single byte in the save (H098, H315).
const Stay = (() => {

  // ---- the grades, priced off the floor they are on. The rates sit above 沪岚饭店's ¥220 tourist
  // room in Shanghai and well above the ¥150 courtyard 客栈 in Chengdu, which is what a five-star
  // in 商务区 should feel like next to ¥60 a day of rent.
  // `rooms` is a door count, not a capacity estimate. `roomNo` below issues level*100 + i + 1, so
  // a grade with rooms:n hands out keys for n consecutive door numbers and the floor has to carry
  // every one of them. standard was 12 against seven authored doors on hotel5 (501/502/503 real,
  // 504-507 sealed, js/hotel-f5.js:387,493-495), so the desk could issue 508-512 — five keys to
  // doors that are not on the plate. 7 is the count the building actually has.
  //
  // Measured, not assumed, before changing it: over 180 days with the weekday/weekend fallback
  // fill, standard at rooms:7 gives meanFree 3.32 and 5 sold-out days for a one-night stay,
  // against 5.62 / 1 at rooms:12. That lands it among its siblings (family 3.77/5,
  // residence 3.94/1, deluxe 3.73/2, junior 2.92/6, suite 2.01/21) instead of making the entry
  // grade the only double-digit house in the hotel. Three-night stays go 37% -> 50% sold out,
  // which is the intended pressure toward a dearer grade, not a dead end: `cheapest()` still has
  // five grades above it to offer.
  const GRADES = [
    { key:'standard',  floor:'hotel5',  level:5,  rooms:7,  rate:240, sleep:1.00, breakfast:false,
      hz:'标准间',   py:'biāozhǔnjiān',      en:'standard room' },
    { key:'family',    floor:'hotel6',  level:6,  rooms:8,  rate:320, sleep:1.02, breakfast:false,
      hz:'家庭房',   py:'jiātíngfáng',       en:'family room' },
    { key:'residence', floor:'hotel7',  level:7,  rooms:8,  rate:380, sleep:1.05, breakfast:true,
      hz:'公寓式客房', py:'gōngyùshì kèfáng', en:'serviced residence' },
    { key:'deluxe',    floor:'hotel8',  level:8,  rooms:8,  rate:460, sleep:1.09, breakfast:true,
      hz:'豪华间',   py:'háohuájiān',        en:'deluxe room' },
    { key:'junior',    floor:'hotel9',  level:9,  rooms:6,  rate:680, sleep:1.13, breakfast:true,
      hz:'行政套房', py:'xíngzhèng tàofáng',  en:'junior suite' },
    { key:'suite',     floor:'hotel11', level:11, rooms:4,  rate:980, sleep:1.18, breakfast:true,
      hz:'京华套房', py:'jīnghuá tàofáng',    en:'signature suite' },
  ];

  const DEPOSIT = 200;            // 押金. One number, said out loud at every check-in in China.
  const CHECKOUT_HOUR = 12;       // 中午十二点退房
  const LATE_HOUR = 18;           // as far as 延迟退房 can be pushed
  const KEY_REISSUE_MINS = 22;    // what losing the card costs you, in minutes at the desk
  const BREAKFAST = [6.5, 10];    // 早餐 window, on 2F and 10F

  // ---- what goes wrong. One per stay, and every one of them is a sentence somebody has to say to
  // you at a counter. `wrong` is what turns up when you nod at a reply you did not follow: not a
  // failure screen, a different object and a lost evening (H119).
  // `words` is the row's own vocabulary — the words the conversation at the desk is actually made
  // of, every one of them a real row in js/vocab.js. It is not decoration: `pick` below seeds the
  // stay's problem towards whichever of these six the player currently owes revision on, so a
  // fortnight of 空调 and 坏了 sitting unanswered in the queue is what makes the air conditioning
  // the thing that breaks (H150). Due vocabulary decides which evening you get.
  const PROBLEMS = [
    { key:'hotwater', hz:'没热水', py:'méi rèshuǐ', en:'no hot water', dept:'工程部', severe:true,
      words:['热水', '修', '师傅'],
      reply:'工程部的师傅二十分钟以后上来，您先别用热水。',
      replyTr:'An engineer will come up in twenty minutes; do not run the hot tap until then.',
      wrong:{ hz:'一壶开水', en:'a thermos of boiled water, which is not a shower' },
      act:{ hz:'在房间等师傅', en:'wait in the room for the engineer' },
      slip:{ hz:'先去洗个澡', en:'go and have a shower now' } },
    { key:'aircon', hz:'空调坏了', py:'kōngtiáo huài le', en:'the air conditioning is broken',
      dept:'工程部', severe:true,
      words:['空调', '坏了', '修'],
      reply:'我们先送一台电扇上去，师傅今晚来修。',
      replyTr:'We will send up a fan now and an engineer will fix it tonight.',
      wrong:{ hz:'一床厚被子', en:'a thicker quilt, in a room that is already too warm' },
      act:{ hz:'先用电扇，晚上等师傅', en:'take the fan and wait for the engineer tonight' },
      slip:{ hz:'那我明天再说', en:'leave it until tomorrow, then' } },
    { key:'noise', hz:'隔壁太吵', py:'gébì tài chǎo', en:'the neighbours are too loud',
      dept:'前厅部', severe:false,
      words:['吵', '换房间'],
      reply:'我打电话提醒隔壁，也可以给您换到走廊另一头。',
      replyTr:'I will ring the room next door, or move you to the other end of the corridor.',
      wrong:{ hz:'一副耳塞', en:'a pair of earplugs, and the noise still there in the morning' },
      act:{ hz:'麻烦您换一间', en:'move me to the other end of the corridor' },
      slip:{ hz:'好的，谢谢', en:'fine, thanks — and change nothing' } },
    { key:'wrongroom', hz:'房型不对', py:'fángxíng bú duì', en:'the room type is wrong',
      dept:'前厅部', severe:true,
      words:['房型', '换房间', '房卡'],
      reply:'对不起，登记错了，我给您换一间，房卡要重新做。',
      replyTr:'Sorry — it was registered wrongly. We will move you and remake the card.',
      wrong:{ hz:'一张加床', en:'an extra bed wheeled into the wrong room' },
      act:{ hz:'那我等新房卡', en:'wait here while the new card is made' },
      slip:{ hz:'不用换了', en:'no need to move me' } },
    { key:'towels', hz:'没有毛巾', py:'méiyǒu máojīn', en:'there are no towels',
      dept:'客房部', severe:false,
      words:['毛巾', '打扫'],
      reply:'客房部马上送毛巾和浴巾上来。',
      replyTr:'Housekeeping will bring towels and a bath sheet straight up.',
      wrong:{ hz:'两瓶洗发水', en:'two bottles of shampoo and still nothing to dry with' },
      act:{ hz:'好，我在房间等', en:'good — I will wait in the room' },
      slip:{ hz:'我自己去拿', en:'I will fetch them myself' } },
    { key:'card', hz:'房卡消磁了', py:'fángkǎ xiāocí le', en:'the key card has been demagnetised',
      dept:'前厅部', severe:false,
      words:['房卡', '身份证'],
      reply:'房卡消磁了，请拿身份证到前台重做一张。',
      replyTr:'The card is demagnetised. Bring your ID to reception and we will make a new one.',
      wrong:{ hz:'一张房间平面图', en:'a floor plan of a room you still cannot get into' },
      act:{ hz:'我拿证件来重做', en:'bring the document and have a new card made' },
      slip:{ hz:'我再刷一次试试', en:'try tapping the same card again' } },
  ];

  const DOCS = [
    { key:'id', hz:'身份证', py:'shēnfènzhèng', en:'resident ID card' },
    { key:'passport', hz:'护照', py:'hùzhào', en:'passport' },
  ];

  const fresh = () => ({
    b: null,          // the booking, or null: {grade,floor,level,room,rate,nights,from,to,deposit,paid}
    doc: null,        // which document is on file for this stay — a state, not a formality (H103)
    key: null,        // the card in your pocket: {floor,room,lost}
    charges: [],      // incidentals only. Room nights are derived, never posted.
    problem: null,    // {key, reported, fixed, fixDay, told}
    service: null,    // room service in transit: {hz,en,amt,dueAt:absolute game minute}
    laundry: null,    // {sentDay, backDay, amt}
    luggage: null,    // {day, tag}
    clean: 1,         // 0 slept in, 1 serviced
    waived: 0,        // 减免 taken on this stay — one query, one correction (see `waive`)
    lateTo: 0,        // hour check-out has been pushed to, 0 for the standard noon
    nights: 0,        // nights actually slept, for the diary and for sleep quality
    settled: '',      // the (day, half-day) the overstay check last ran for
    history: 0,       // completed stays, so the desk can recognise a returning guest
    lastBill: null,   // the bill of the stay that just ended, so check-out can be re-read
  });

  let S = fresh();

  const grade = k => GRADES.find(g => g.key === k) || null;
  const gradeOf = b => b && grade(b.grade);
  // Deterministic other guests. Nothing about this is stored, so a reload rebuilds the same hotel.
  const hash = (a, b) => { let h = ((a * 73856093) ^ (b * 19349663)) >>> 0;
                           h ^= h >>> 13; h = (h * 1274126177) >>> 0; return (h >>> 8) % 100; };
  // How full the house is tonight: percent of rooms taken, 0..100, on the same scale as the
  // `hash(room, day) % 100` above. The real answer is js/disrupt.js's — one weather roll reaching
  // the airport, the metro and here, so a storm strands travellers in the lobby and fills the place
  // while a clear Tuesday empties it (H131, H132, H133). The 周末 line behind it is the fallback for
  // a harness that loads this module on its own; `day` starts at 1 and day 1 is a Monday, same
  // arithmetic as career.js.
  const fill = d => (typeof Disrupt !== 'undefined' && Disrupt.hotelFill)
    ? Disrupt.hotelFill(d) : ((((d | 0) - 1) % 7) >= 5 ? 72 : 44);
  // 旺季价. The one place a rate is decided, so the desk cannot charge a surged night while the
  // folio bills the rack rate — `book` stores what `quote` said and `bill` reads it back, which
  // also locks tonight's price against a storm that arrives after you checked in.
  const rateOn = (day, base) => (typeof Disrupt !== 'undefined' && Disrupt.hotelRate)
    ? Disrupt.hotelRate(day, base) : base;
  const roomNo = (g, i) => g.level * 100 + i + 1;
  const takenBy = (g, i, d) => hash(roomNo(g, i), d) < fill(d);
  const mine = (g, i, d) => !!(S.b && S.b.grade === g.key && S.b.room === roomNo(g, i) &&
                               d >= S.b.from && d < S.b.to);

  // A room is bookable for [from, from+nights) only if it is free on every one of those nights.
  function freeRoom(g, from, nights) {
    for (let i = 0; i < g.rooms; i++) {
      let ok = true;
      for (let d = from; d < from + nights && ok; d++) if (takenBy(g, i, d) || mine(g, i, d)) ok = false;
      if (ok) return roomNo(g, i);
    }
    return 0;
  }
  function freeCount(g, from, nights) {
    let n = 0;
    for (let i = 0; i < g.rooms; i++) {
      let ok = true;
      for (let d = from; d < from + nights && ok; d++) if (takenBy(g, i, d) || mine(g, i, d)) ok = false;
      if (ok) n++;
    }
    return n;
  }

  // ---- which of the six goes wrong tonight, and why that one (H150).
  //
  // The base is the hash of (room, check-in day) it has always been: deterministic, so a reload
  // finds the same broken room, and different on the next visit. On top of it, a problem whose own
  // `words` are sitting in the review queue is weighted up — a fortnight of leaving 空调 and 坏了
  // unanswered is what makes the air conditioning the thing that breaks, so due vocabulary decides
  // which evening you get rather than only which flashcard you see.
  //
  // Rolled ONCE, at check-in, and stored in S.problem. The queue is a fact about the player and not
  // about the date, so reading it live would let a study session change what is already wrong with
  // the room you are standing in — the same trap js/disrupt.js's header warns about, arriving from
  // the other side. Storing the answer is what keeps it stable across a reload.
  //
  // The bias is a shift and never an override: with nothing due, or with no js/vocab.js at all —
  // a harness evaluating this module on its own — this is exactly the hash it was.
  function pick(room, from) {
    const base = hash(room, from + 7) % PROBLEMS.length;
    if (typeof Vocab === 'undefined' || !Vocab.isDue) return PROBLEMS[base].key;
    let best = 0, at = base;
    for (let i = 0; i < PROBLEMS.length; i++) {
      const j = (base + i) % PROBLEMS.length;          // ties break towards the hash's own choice
      let n = 0;
      for (const w of PROBLEMS[j].words) if (Vocab.isDue(w)) n++;
      if (n > best) { best = n; at = j; }
    }
    return PROBLEMS[at].key;
  }

  // ---- 免费升级. Offered, never negotiated: js/story.js decides whether the desk owes you one, and
  // the only thing that earns it is having reported a broken room in Chinese and understood the
  // reply (`favours.upgrade` is stays >= 2 and solved >= 1). A week later that one sentence is worth
  // a better room.
  //
  // The rate does not move, and that is the design rather than a rounding decision. Every ¥ the
  // guest reads at the desk is printed from the quote's own `rate`/`total` and from the `DEPOSIT`
  // constant (js/hotel-public.js:1596, :1602, :1624, :1765), so an upgrade that also changed the
  // price would have the clerk say one number while the folio billed another. A better room for the
  // money you were already spending is the favour a front desk can actually do, and it agrees with
  // every figure already on the screen by construction, because none of them changes.
  //
  // The grade you asked for has to be free first. So this cannot conjure a room on a night that is
  // sold out — H133 stays exactly as true as it was — and it is one rung up, never two.
  function upgradeOf(g, from, nights) {
    if (typeof Story === 'undefined' || !Story.reception) return null;
    let f; try { f = Story.reception().favours; } catch (_) { return null; }
    if (!f || !f.upgrade) return null;
    const up = GRADES[GRADES.indexOf(g) + 1];
    if (!up) return null;
    const room = freeRoom(up, from, nights);
    return room ? { g:up, room } : null;
  }

  const nightsSlept = day => S.b ? Math.max(0, Math.min(day, S.b.to) - S.b.from) : 0;
  const chargesTotal = () => S.charges.reduce((a, c) => a + c.amt, 0);
  const owedNow = day => S.b ? Math.max(1, nightsSlept(day)) * S.b.rate + chargesTotal() : 0;
  const dueHour = () => S.lateTo || CHECKOUT_HOUR;
  const post = (hz, en, amt, day) => { S.charges.push({ hz, en, amt: Math.round(amt), day }); };

  // ---- 迷你吧 and 客房送餐 as real food (H153). Anything you are charged for in the room that
  // js/pantry.js recognises as a product becomes a DATED LOT there, exactly like a bag from the
  // supermarket — so the peanuts you did not open go home in your bag, sit in the flat with a date
  // on them, and go off on pantry.js's own schedule. One line of stock, never a scalar, and it is
  // also the whole of "a stay leaves a trace in the flat" that this module can honestly own (H152):
  // the trace is the food, and it is in the fridge tomorrow morning.
  //
  // Written as a query of the day the charge was posted, not of a wall clock. Silent and harmless
  // when js/pantry.js is absent, which is every harness that loads this module on its own, and
  // silent for anything the pantry does not sell — a bathrobe is not a lot.
  const larder = (hz, day) => {
    if (typeof Pantry === 'undefined' || !Pantry.isFood || !Pantry.isFood(hz)) return null;
    try { Pantry.add(hz, 1, day | 0); return hz; } catch (_) { return null; }
  };

  // ---- overstaying. Called lazily from anything that reads the booking, at most twice a day, so
  // there is no per-frame work and no midnight callback to wire. Walking out of the building
  // without checking out is not silently allowed (H126): the room stays yours and it stays billed,
  // and once a whole extra day has gone by the deposit is gone with it.
  function settle(day, minutes) {
    if (!S.b) return;
    const half = minutes >= dueHour() * 60 ? 1 : 0, sig = day + ':' + half;
    if (S.settled === sig) return;
    S.settled = sig;
    if (day < S.b.to || (day === S.b.to && !half)) return;
    const over = day - S.b.to;
    if (over === 0 && half) {
      if (!S.charges.some(c => c.kind === 'late'))
        S.charges.push({ kind:'late', hz:'超时未退房', en:'stayed past check-out', amt:Math.round(S.b.rate * .5), day });
    } else if (over > 0) {
      S.b.to = day + 1;                        // the room is still yours, so it is still a night
      if (S.b.deposit) { post('押金不退', 'deposit forfeited — you never checked out', S.b.deposit, day);
                         S.b.deposit = 0; }
    }
  }

  return {
    GRADES, PROBLEMS, DOCS, DEPOSIT, CHECKOUT_HOUR, LATE_HOUR, BREAKFAST, KEY_REISSUE_MINS,

    // ---- what is on offer tonight, priced and counted. `money` only decides `afford`; a grade
    // that is full is off for a different reason and has to say so differently.
    offers(day, nights, money) {
      const n = Math.max(1, nights | 0);
      return GRADES.map(g => {
        const rate = rateOn(day, g.rate), total = rate * n + DEPOSIT;
        const u = upgradeOf(g, day, n);
        return { grade:g, hz:g.hz, py:g.py, en:g.en, floor:g.floor, level:g.level, rate,
                 rooms:freeCount(g, day, n), total, afford:Math.floor(money) >= total,
                 // What the room actually becomes if this row is picked. The price on the row is
                 // still the price, which is the whole point of the favour.
                 up:u ? { hz:u.g.hz, en:u.g.en, level:u.g.level } : null };
      });
    },
    // The dead end this replaces: "you cannot afford it" and nothing else. The desk offers the
    // best room you *can* have instead (H101).
    cheapest(day, nights, money) {
      return this.offers(day, nights, money).filter(o => o.rooms > 0 && o.afford).pop() || null;
    },
    quote(key, day, nights) {
      const g = grade(key); if (!g) return null;
      const n = Math.max(1, Math.min(14, nights | 0));
      const room = freeRoom(g, day, n);
      if (!room) return null;
      const rate = rateOn(day, g.rate);
      const q = { grade:g.key, floor:g.floor, level:g.level, room, rate, nights:n,
                  from:day, to:day + n, deposit:DEPOSIT, total:rate * n + DEPOSIT, up:null };
      // The room moves up a floor; `rate`, `total` and `deposit` are untouched on purpose.
      const u = upgradeOf(g, day, n);
      if (u) {
        q.grade = u.g.key; q.floor = u.g.floor; q.level = u.g.level; q.room = u.room;
        q.up = { fromHz:g.hz, fromEn:g.en, hz:u.g.hz, en:u.g.en };
      }
      return q;
    },

    // ---- 身份证 / 护照. Asked for before anything else, and remembered for the whole stay.
    needsDoc: () => !S.doc,
    doc: () => S.doc,
    showDoc(key) {
      const d = DOCS.find(q => q.key === key); if (!d) return null;
      S.doc = d.key; return d;
    },

    // ---- 办理入住. The caller has already taken the money; this is the hotel's side of it.
    book(q, day) {
      if (!q || S.b || !S.doc) return null;
      S.b = { grade:q.grade, floor:q.floor, level:q.level, room:q.room, rate:q.rate,
              nights:q.nights, from:q.from, to:q.to, deposit:q.deposit, paid:q.total, day };
      S.key = { floor:q.floor, room:q.room, lost:false };
      S.charges = []; S.clean = 1; S.lateTo = 0; S.nights = 0; S.settled = ''; S.waived = 0;
      // One thing goes wrong per stay, chosen from the room, the day and what the player owes the
      // review queue, so it is the same after a reload and different on the next visit.
      S.problem = { key:pick(q.room, q.from), reported:0, fixed:false, fixDay:0, told:false };
      return S.b;
    },
    booking(day, minutes) { if (day !== undefined) settle(day, minutes || 0); return S.b && { ...S.b }; },
    checkedIn: () => !!S.b,
    // One number that changes whenever anything the desk's walk-up prompt says could change.
    // The prompt is rebuilt on a per-frame path, so it compares this rather than allocating a
    // copy of the booking sixty times a second.
    sig: () => !S.b ? 0
      : S.b.room * 10000 + (S.b.to % 400) * 8 + (S.key && !S.key.lost ? 4 : 0) +
        (S.problem && S.problem.fixed ? 2 : 0) + (S.lateTo ? 1 : 0),
    stays: () => S.history,

    // ---- 房卡. A card with a floor and a room number on it, which is the whole of what a key is.
    key: () => S.key && { ...S.key },
    hasKey: () => !!(S.key && !S.key.lost),
    // The lift and every guestroom door ask these two, and both refuse with a reason (H105, H106).
    canEnterFloor(floorKey) {
      if (!/^hotel(5|6|7|8|9|11)$/.test(String(floorKey || ''))) return true;
      if (!this.hasKey()) return false;
      return S.key.floor === floorKey;
    },
    opensDoor: (floorKey, room) =>
      !!(S.key && !S.key.lost && S.key.floor === floorKey && S.key.room === (room | 0)),
    // 房卡, the staff side (H108). A guest's card opens a guest floor and nothing else; the B1
    // staff route opens for somebody who has actually carried linen up it, which is
    // `Career.hotelShifts()` — the count `finishJob` was already keeping by word, so this reads
    // existing state and adds no second counter. js/hotel-service.js:1126 already talks about the
    // card; this is the answer it can ask for.
    //
    // Deliberately not "are you on shift right now": a member of staff who has been given the door
    // code does not lose it at eight in the evening. Being on the clock is `Career.hotelShift(h)`
    // and it is a different question.
    staffAccess: () => !!(typeof Career !== 'undefined' && Career.hotelStaff && Career.hotelStaff()),
    loseKey() { if (S.key) S.key.lost = true; },
    // Recoverable, at the desk, for the minutes it really takes (H107). Never a lost stay.
    reissueKey() {
      if (!S.b) return null;
      S.key = { floor:S.b.floor, room:S.b.room, lost:false };
      return { mins:KEY_REISSUE_MINS, room:S.b.room,
               zh:`补办好了，${S.b.room}房，请收好。`,
               en:`Reissued — room ${S.b.room}. The desk kept you ${KEY_REISSUE_MINS} minutes.` };
    },

    // ---- the night. The bed's own USE row does the sleeping (it carries `hotel:true`, so game.js
    // already works out the hours); this only says how well it goes. A high floor is quieter, a
    // better grade has a better bed, and a neighbour you have not dealt with costs you a third of
    // the night (H111).
    sleepFactor() {
      const g = gradeOf(S.b); if (!g) return 1;
      const noisy = S.problem && !S.problem.fixed &&
                    (S.problem.key === 'noise' || S.problem.key === 'aircon');
      return +(g.sleep * (1 + (g.level - 5) * .012) * (noisy ? .68 : 1)).toFixed(3);
    },
    slept(day) { if (!S.b) return 0; S.clean = 0; S.nights = nightsSlept(day + 1); return S.nights; },

    // 早餐 — included at the better grades, and served in a window you can miss (H114). Missing it
    // is an outcome, not a locked door: the caller still lets you in, it just costs full price.
    breakfast(hour) {
      const g = gradeOf(S.b);
      return { included:!!(g && g.breakfast), open:hour >= BREAKFAST[0] && hour < BREAKFAST[1],
               from:BREAKFAST[0], to:BREAKFAST[1], floors:['hotel2', 'hotel10'] };
    },

    // ---- things that arrive later, because in a hotel everything arrives later.
    orderService(hz, en, amt, now, delay) {
      if (!S.b || S.service) return null;
      S.service = { hz, en, amt, dueAt:now + (delay || 28) };
      return { ...S.service };
    },
    serviceDue: now => !!(S.service && now >= S.service.dueAt),
    // Called when the staff member has actually walked it up; the money lands on the bill, not the
    // wallet, which is the point of a room number.
    serviceArrived(day) {
      if (!S.service) return null;
      const o = S.service; S.service = null;
      post(o.hz, o.en, o.amt, day);
      o.lot = larder(o.hz, day);
      return { ...o };
    },
    service: () => S.service && { ...S.service },
    sendLaundry(day, amt) {
      if (!S.b || S.laundry) return null;
      S.laundry = { sentDay:day, backDay:day + 1, amt:amt || 45 };
      post('洗衣', 'laundry', S.laundry.amt, day);
      return { ...S.laundry };
    },
    laundryBack: day => !!(S.laundry && day >= S.laundry.backDay),
    collectLaundry() { const l = S.laundry; S.laundry = null; return l && { ...l }; },
    minibar(hz, en, amt, day) {
      if (!S.b) return null;
      post(hz, en, amt, day);
      return { hz, en, amt, lot:larder(hz, day) };
    },
    // A line taken off after you queried it at the desk. Asked for by js/talk.js, which was
    // otherwise posting a negative minibar charge to get the same effect; a queried charge should
    // read as 减免 on the bill, not as a cola that cost minus eighteen kuai.
    // The cap is the whole of this function. A 减免 is a correction to a charge that was actually
    // made, so it can never take off more than the folio is carrying at that moment, and a second
    // waiver on the same stay can only take off what the first one left — `chargesTotal()` is the
    // live folio and it is already net of every waiver posted before this one, so repeats settle to
    // at most what was charged rather than stacking. This is a trust boundary and not a
    // hypothetical one: js/talk.js:1507 reaches it from a dialogue script with a fixed ¥45 that can
    // be replayed, and uncapped that minted ¥30,170 against a ¥440 stay.
    //
    // Room nights are deliberately outside the cap. They are derived, never posted, so a waiver
    // cannot reach them: the one thing that discounts the room is `report`'s goodwill line, which
    // is ¥60 and can only land once per stay. That is what keeps `bill.settle` under `paid`.
    // ONE waiver per stay, on top of the folio cap. The folio cap alone stops money being minted
    // and that is all it was ever asked to do — but it does not stop the loop being *run*, and once
    // an incidental hands over a real object (`minibar` and `serviceArrived` now put food in the
    // pantry, H153) "charge me and take it off again" mints the object instead of the money. Post
    // ¥18 of cola, waive ¥18, repeat: the folio is never negative and the fridge fills up for free.
    //
    // A 减免 is one correction to one queried charge, which is what a front desk does and what
    // js/talk.js's script is written as; a guest does not query the folio thirty times. So the
    // allowance is spent on the first accepted waiver of the stay, and `book` is the only thing that
    // gives it back. Everything the money checks already assert stays true — the first waiver is
    // still capped at what the folio is carrying, and every one after it still finds nothing.
    waive(hz, en, amt, day) {
      if (!S.b || S.waived) return null;
      const n = Math.min(Math.abs(Math.round(amt) || 0), Math.max(0, chargesTotal()));
      if (!n) return null;      // nothing on the bill to take off, so no line is written
      S.waived = n;
      post('减免 ' + hz, en || 'charge removed after you queried it', -n, day);
      return { hz, amt:-n };
    },
    // 客房服务 comes in while you are out. The caller checks you are elsewhere; this is the state.
    housekeep() { if (!S.b) return false; const was = S.clean; S.clean = 1; return !was; },
    roomClean: () => S.clean === 1,

    // ---- 报修. The problem, the reply somebody says to you, and what your understanding of it
    // is worth. This is the whole of N8's language content: comprehension changes the minutes, the
    // night and the money, and not understanding is a worse evening rather than a wrong answer.
    problem() {
      if (!S.problem) return null;
      const p = PROBLEMS.find(q => q.key === S.problem.key);
      return { ...p, reported:S.problem.reported, fixed:S.problem.fixed, fixDay:S.problem.fixDay };
    },
    reply(key) { const p = PROBLEMS.find(q => q.key === key); return p ? [p.reply, p.replyTr] : null; },
    report(key, heard, day) {
      if (!S.problem || S.problem.fixed) return null;
      const p = PROBLEMS.find(q => q.key === S.problem.key);
      if (key !== S.problem.key)
        // Reporting the wrong thing is still a report: somebody comes, and it is not what you need.
        return { fixed:false, mins:18, wrong:p.wrong, discount:0, tonight:false,
                 zh:`师傅来看了，可是${p.hz}还是没解决。`,
                 en:`Somebody comes, but ${p.en} is still the problem.` };
      S.problem.reported++;
      S.problem.told = true;
      if (heard) {
        S.problem.fixed = true; S.problem.fixDay = day;
        const discount = p.severe && S.problem.reported > 1 ? 60 : 0;
        if (discount) post('房费减免', 'goodwill discount on the room', -discount, day);
        return { fixed:true, mins:10, wrong:null, discount, tonight:true,
                 zh:`${p.dept}处理好了，${p.hz}解决了。`,
                 en:`${p.en} — sorted tonight.`, };
      }
      // You nodded. Something arrives, it is the wrong thing, and the evening is gone — but the
      // desk is still there tomorrow and the second attempt is worth a discount.
      return { fixed:false, mins:45, wrong:p.wrong, discount:0, tonight:false,
               zh:`送来的是${p.wrong.hz}，${p.hz}要明天早上才修。`,
               en:`What arrives is ${p.wrong.en}. The real fix is tomorrow morning.` };
    },

    // ---- 延迟退房. Negotiable, and it costs money (H124). Half a night to 18:00, nothing to 14:00.
    // The desk's memory changes what is *offered* rather than what has to be argued for (H139): a
    // guest who has stayed here before and never overran gets the hour without being charged for
    // it. js/story.js owns that judgement and this only reads it; with story.js absent — a harness
    // evaluating this module on its own — it is simply the price.
    lateQuote(toHour) {
      if (!S.b) return null;
      const h = Math.max(CHECKOUT_HOUR, Math.min(LATE_HOUR, toHour | 0));
      if (h <= CHECKOUT_HOUR) return null;
      const favour = !!(typeof Story !== 'undefined' && Story.reception &&
                        Story.reception().favours.lateCheckout);
      return { toHour:h, favour,
               amt:(favour || h <= 14) ? 0 : Math.round(S.b.rate * (h >= 18 ? .5 : .3)) };
    },
    // 延迟退房 is charged on the folio and *only* on the folio: every other line in the room lands
    // there and the bill is the thing the player actually reads. js/hotel-public.js:1682 also takes
    // the same fee out of the wallet, which is the double charge — that call is the one to drop,
    // not this post.
    //
    // Asking a second time re-prices the line already written instead of adding another, so three
    // goes at the picker cost the hour that was agreed rather than three of them.
    lateCheckout(toHour, day) {
      const q = this.lateQuote(toHour); if (!q) return null;
      S.lateTo = q.toHour; S.settled = '';
      const at = S.charges.findIndex(c => c.kind === 'lateout');
      if (at >= 0) {
        if (q.amt) { S.charges[at].amt = Math.round(q.amt); S.charges[at].day = day; }
        else S.charges.splice(at, 1);
      } else if (q.amt) {
        S.charges.push({ kind:'lateout', hz:'延迟退房', en:'late check-out',
                         amt:Math.round(q.amt), day });
      }
      return q;
    },
    dueHour,

    // ---- 行李寄存 at the bell desk, retrievable the same day (H125).
    storeLuggage(day) {
      if (S.luggage) return null;
      S.luggage = { day, tag:100 + hash(day, 31) };
      return { ...S.luggage };
    },
    luggage: () => S.luggage && { ...S.luggage },
    collectLuggage(day) {
      if (!S.luggage) return null;
      const l = S.luggage;
      S.luggage = null;
      return { ...l, stale:day > l.day };
    },

    // ---- 账单. Itemised, because a receipt is the most honest reading exercise the game has
    // (H123). Rows are data; the panel decides how to draw them.
    bill(day, minutes) {
      settle(day, minutes || 0);
      if (!S.b) return null;
      const nights = Math.max(1, nightsSlept(day));
      const rows = [{ hz:'房费', py:'fángfèi', en:`room · ${nights} night${nights === 1 ? '' : 's'} × ¥${S.b.rate}`,
                      amt:nights * S.b.rate }];
      for (const c of S.charges) rows.push({ hz:c.hz, py:'', en:c.en, amt:c.amt });
      const total = rows.reduce((a, r) => a + r.amt, 0);
      return { room:S.b.room, nights, rows, total, deposit:S.b.deposit, paid:S.b.paid,
               // What actually moves at the desk. Positive is money back to you, negative is money
               // still owed. The deposit is already inside `paid`, and a forfeited one is inside
               // `total` as a 押金不退 line, so this one subtraction covers both cases.
               settle:S.b.paid - total };
    },
    // Positive: money back to you. Negative: money you still owe.
    checkOut(day, minutes) {
      const b = this.bill(day, minutes); if (!b) return null;
      S.lastBill = b;
      S.history++;
      S.b = null; S.key = null; S.problem = null; S.service = null; S.charges = [];
      S.doc = null; S.lateTo = 0; S.settled = ''; S.waived = 0;
      return b;
    },
    lastBill: () => S.lastBill && { ...S.lastBill, rows:S.lastBill.rows.map(r => ({ ...r })) },

    // ---- the save. Optional and backwards compatible, like career and story: a life that predates
    // the stay system has no booking, and must not be given a phantom one (H316, H324).
    toSave: () => ({ b:S.b && { ...S.b }, doc:S.doc, key:S.key && { ...S.key },
                     charges:S.charges.slice(-24).map(c => ({ ...c })),
                     problem:S.problem && { ...S.problem },
                     service:S.service && { ...S.service }, laundry:S.laundry && { ...S.laundry },
                     luggage:S.luggage && { ...S.luggage },
                     clean:S.clean, waived:S.waived, lateTo:S.lateTo, nights:S.nights,
                     history:S.history }),
    load(o) {
      S = fresh();
      if (!o || typeof o !== 'object') return;
      // A malformed booking is worse than no booking, because it looks like one and the lift would
      // let you upstairs on it. Every field is checked, and one bad field drops the whole room.
      const b = o.b;
      if (b && typeof b === 'object' && grade(b.grade) &&
          Number.isSafeInteger(b.room) && Number.isSafeInteger(b.from) && b.from >= 1 &&
          Number.isSafeInteger(b.to) && b.to > b.from && Number.isFinite(b.rate) && b.rate > 0) {
        const g = grade(b.grade);
        S.b = { grade:g.key, floor:g.floor, level:g.level, room:b.room | 0,
                rate:Math.max(0, Math.round(b.rate)),
                nights:Math.max(1, (b.to | 0) - (b.from | 0)), from:b.from | 0, to:b.to | 0,
                deposit:Math.max(0, Math.round(Number(b.deposit) || 0)),
                paid:Math.max(0, Math.round(Number(b.paid) || 0)), day:b.day | 0 };
      }
      if (DOCS.some(d => d.key === o.doc)) S.doc = o.doc;
      if (S.b && o.key && typeof o.key === 'object' && o.key.floor === S.b.floor)
        S.key = { floor:S.b.floor, room:S.b.room, lost:!!o.key.lost };
      else if (S.b) S.key = { floor:S.b.floor, room:S.b.room, lost:false };
      if (S.b && Array.isArray(o.charges))
        S.charges = o.charges.filter(c => c && typeof c.hz === 'string' && Number.isFinite(c.amt))
          .slice(-24).map(c => ({ kind:typeof c.kind === 'string' ? c.kind : undefined,
                                  hz:c.hz.slice(0, 24), en:String(c.en || '').slice(0, 80),
                                  amt:Math.round(c.amt), day:c.day | 0 }));
      if (S.b && o.problem && PROBLEMS.some(p => p.key === o.problem.key))
        S.problem = { key:o.problem.key, reported:Math.max(0, o.problem.reported | 0),
                      fixed:!!o.problem.fixed, fixDay:o.problem.fixDay | 0, told:!!o.problem.told };
      if (S.b && o.service && typeof o.service === 'object' && Number.isFinite(o.service.dueAt))
        S.service = { hz:String(o.service.hz || '客房送餐').slice(0, 24),
                      en:String(o.service.en || 'room service').slice(0, 80),
                      amt:Math.max(0, Math.round(Number(o.service.amt) || 0)),
                      dueAt:Math.round(o.service.dueAt) };
      if (o.laundry && Number.isSafeInteger(o.laundry.backDay))
        S.laundry = { sentDay:o.laundry.sentDay | 0, backDay:o.laundry.backDay | 0,
                      amt:Math.max(0, Math.round(Number(o.laundry.amt) || 0)) };
      if (o.luggage && Number.isSafeInteger(o.luggage.day))
        S.luggage = { day:o.luggage.day | 0, tag:o.luggage.tag | 0 };
      S.clean = o.clean === 0 ? 0 : 1;
      // A saved stay keeps its spent 减免. Dropping it would hand a reload a fresh allowance, which
      // is a save/load loop around the one-per-stay rule and therefore the same hole by another door.
      S.waived = Math.max(0, Math.round(Number(o.waived) || 0));
      S.lateTo = Math.max(0, Math.min(LATE_HOUR, o.lateTo | 0));
      S.nights = Math.max(0, o.nights | 0);
      S.history = Math.max(0, o.history | 0);
    },
    reset() { S = fresh(); },
    // For the harnesses, which have no way to sit out a night at the desk.
    debug: () => ({ ...S }),
  };
})();
