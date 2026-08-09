// 延误 — the day going wrong somewhere else.
//
// The city had exactly one piece of real propagation in it: bad weather thinned the departure
// board at the airport. One cause, one consequence, in one room, and every other location carried
// on as though the sky were somebody else's problem. Everywhere else, what happened in one place
// stayed there — you could not be made late for work by anything except your own clock.
//
// This is that one wire, generalised. A day is rolled once, from the same operational severity the
// flight board already reads (`Weather.disruptFor`), and every location that can be affected by it
// asks the same question. Fog does not delay the subway *and* separately delay the flights; there
// is one fog, and both of them ask it what it is doing today.
//
// ---- the rule that cannot break
//
// Everything here is a PURE FUNCTION OF THE DAY. `Weather.disruptFor(day)` is a deterministic roll
// off the calendar, and the variation on top of it is a hash of the day number — no counters, no
// Math.random, no wall clock. This is not tidiness. `MetroSchedule.trainAt` is documented as a
// pure function of the clock and the whole station is built on that; a delay that rolled itself
// when asked would give a different answer to the board, the map and the ride, and the player
// would watch three parts of one station disagree about the same train. It also has to survive a
// reload: a save reopened at 08:00 has to find the same morning it left.
//
// ---- what this is for
//
// The point is not the minutes. It is that the delay is announced in Chinese, before you commit to
// the journey, in a place you are already looking at — so reading it is worth something and not
// reading it costs you the thing it would have saved. You are not blocked, you are not quizzed,
// and nothing says WRONG at you. You just get to work at 09:40 and your manager notices, which is
// a story rather than a score.
const Disrupt = (() => {

  // ---- how bad it has to be before anything happens.
  //
  // `Weather.disruptFor` runs 0 (clear) to .92 (fog), and the flight board starts cancelling well
  // up that range. The subway is not an airport: it runs in a tunnel and it runs in fog. What
  // stops it is what stops the city above it — snow on the approaches, a gale, water on the
  // track — so the floor is set above rain and the scale is gentler than aviation's.
  const FLOOR = 0.30;

  // Rush hour, and the only reason these two windows exist. A delay at eleven in the morning is a
  // fact; a delay at ten past eight is a decision, because it is the one hour when the difference
  // between leaving now and leaving in ten minutes is 迟到 on your record. Outside them the line
  // still runs slow — a bad day is a bad day — but it is not what the day is about.
  const RUSH = [[7.0, 10.0], [17.0, 19.5]];
  const OFF_PEAK = 0.45;                 // how much of the delay survives outside the windows

  // A small deterministic scatter so that two foggy Tuesdays are not the same Tuesday. Integer
  // hash of the day, nothing else in it.
  function jitter(day, salt) {
    let h = (day | 0) * 2654435761 + salt * 40503;
    h ^= h >>> 15; h = Math.imul(h, 2246822519);
    h ^= h >>> 13; h = Math.imul(h, 3266489917);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;      // 0..1
  }

  // ---- 酒店 · what kind of day the hotel is having.
  //
  // The hotel is the one building in the city that moves in the *opposite* direction to everybody
  // else. The fog that empties the departure board fills the lobby, because a cancelled flight is
  // two hundred people who now need a bed tonight and cannot get one anywhere near the airport.
  // The clear Tuesday that makes everyone else's day easy is the day the house is half empty and
  // the rack rate comes down.
  //
  // The rule from the top of this file is what makes that safe to build on. The hotel does not roll
  // weather, does not roll demand, and is not told about either by an event: it asks, and it gets
  // the same answer the flight board got, off the same day number, before and after a reload. There
  // is one fog. What the desk, the lobby board and the room rate are looking at is one occupancy
  // figure, so they cannot disagree about how full the building is — which is exactly the failure
  // the metro notice was written to avoid three parts of one station falling into.
  const HOTEL_CANCEL = 0.52;     // js/airport.js:2944 cancels exactly one flight above this
  const HOTEL_HOLD = 18;         // 保留到十八点 — an unguaranteed booking is released at six
  const HOTEL_LAST = 23;         // after this the desk is selling what nobody else wanted
  const HOTEL_BASE = [44, 72];   // midweek, weekend: js/stay.js:121's own two numbers, unchanged
  const SOLD_OUT = 96;           // at this occupancy the small grades genuinely have nothing left

  // 三楼宴会厅. What is on in the ballroom, which is the only thing that puts people who are not
  // guests in the lobby. Weekends are weddings — that is what a Chinese hotel ballroom is for — and
  // midweek is corporate, or nothing at all, because a ballroom booked every single day is a
  // ballroom nobody notices.
  const BALLROOM = [
    { key:'wedding', hz:'婚宴', py:'hūnyàn', en:'a wedding banquet', from:11, to:15, draw:120,
      note:['三楼办婚宴，大堂里都是接亲的客人。', 'A wedding on 3F — the lobby is full of guests.'] },
    { key:'banquet', hz:'晚宴', py:'wǎnyàn', en:'an evening banquet', from:18, to:21, draw:90,
      note:['三楼晚上有宴会。', 'There is a banquet on 3F this evening.'] },
    { key:'meeting', hz:'年会', py:'niánhuì', en:'a company conference', from:9, to:17, draw:80,
      note:['三楼在开年会，会议室都占了。', 'A company conference on 3F — the meeting rooms are taken.'] },
    { key:'fair', hz:'招聘会', py:'zhāopìnhuì', en:'a recruitment fair', from:9, to:16, draw:60,
      note:['三楼有招聘会，来的人不少。', 'A recruitment fair on 3F, and a lot of people came.'] },
  ];

  // Everything below is a pure function of (day, severity), so it goes in the memo beside the metro
  // rather than being recomputed by every wall the lobby hangs a number on.
  function hotelFor(day, sev, w) {
    const weekend = (((day | 0) - 1) % 7) >= 5;
    const base = HOTEL_BASE[weekend ? 1 : 0];
    // A cancellation is not "bad weather", it is an aeroplane that did not go, and it is the same
    // threshold the board itself uses. Above it there are stranded travellers; below it there is
    // only a slow day.
    const cancelled = sev > HOTEL_CANCEL;
    const press = sev < FLOOR ? 0 : (sev - FLOOR) / (1 - FLOOR);
    const quiet = sev < FLOOR ? (FLOOR - sev) / FLOOR : 0;
    const fill = Math.max(18, Math.min(100, Math.round(
      base - quiet * 8 + press * 34 + (cancelled ? 12 : 0) + jitter(day, 5) * 8)));
    const stranded = cancelled ? Math.round(40 + jitter(day, 6) * 90)
                   : sev >= FLOOR ? Math.round(jitter(day, 6) * 16) : 0;
    // 旺季价. A rack rate that never moves is a price list; one that moves with the house is a
    // reason to book on Tuesday. Flat below 62% occupancy so an ordinary midweek night costs
    // exactly what js/stay.js says it costs, and capped at half as much again.
    const surge = +Math.max(1, Math.min(1.5, 1 + (fill - 62) / 100 * 1.35)).toFixed(2);
    const e = jitter(day, 11);
    const event = weekend ? (e < .72 ? BALLROOM[0] : BALLROOM[1])
                          : (e < .34 ? BALLROOM[2] : e < .48 ? BALLROOM[3] : null);
    const why = press > 0 && w ? { hz:w.hz, py:w.py, en:w.en } : null;
    const soldOut = fill >= SOLD_OUT;
    // One line for the lobby board, chosen by what is actually true about tonight. Sold out beats
    // everything, because it is the only one of these that changes what the player has to do next.
    const note = soldOut
      ? [`今天满房了，只能去别的地方了。`,
         'Full tonight — you will have to sleep somewhere else.']
      : cancelled
      ? [`机场有航班取消，今天住店的人特别多。`,
         'A flight was cancelled — the house is very full tonight.']
      : fill >= 80 ? ['今天房间紧张。', 'Rooms are tight tonight.']
      : event ? event.note
      : fill <= 40 ? ['今天房间很空。', 'The house is quiet tonight.']
      : ['今天房间还有。', 'There are rooms tonight.'];
    return { sev, fill, surge, stranded, cancelled, soldOut, weekend, event, why,
             note:{ hz:note[0], en:note[1] } };
  }

  // ---- 高层公寓 · what is wrong with the building today.
  //
  // The tower is the one place the player comes back to hundreds of times, and until this block
  // nothing that happened to the city happened to it. The lobby notice board already promised
  // 周三上午停水 (js/data.js:2050) with nothing behind it, which is the worst version of the
  // problem this file exists for: a sentence in Chinese that is worth reading, that a player works
  // out, and that then turns out not to have been true.
  //
  // Same rule as everything above. One roll, off the day, asked by the tap, the lift, the light
  // switch and the notice board — so the board cannot promise a cut the shower does not have, in
  // the way the metro notice was written to stop three parts of one station disagreeing.
  //
  // And one cause reaches several consequences, which is the shape the tower is for. A 停电 is not
  // a separate event from the lift being out: it is *why* the lift is out, why the flat is dark and
  // why the 空调 does nothing on the one afternoon it was needed. Twelve storeys is what makes that
  // land — a dead lift on deck 2 is an inconvenience and on deck 11 it is your evening.
  const WATER_DAY = 2;             // 周三, Monday as 0 — the weekday the notice board already names
  const WATER_P = 0.42;            // ...and not every 周三, or it is a timetable rather than news
  const WATER_HRS = [8, 12];       // 上午
  const POWER_SEV = 0.62;          // what it takes to bring the line down: a gale, snow, a storm
  const POWER_P = 0.55;            // and even then it does not always
  const LIFT_P = 0.11;             // 电梯检修 on its own, with the power perfectly fine
  const HEAT_WARM = 0.9;           // season warmth at which the flat is its own weather
  const HEAT_P = 0.38;

  // What is on in the building, and why. Weekday index is the same expression `hotelFor` uses.
  function homeFor(day, sev, w, season) {
    const wd = (((day | 0) - 1) % 7 + 7) % 7;
    const weekend = wd >= 5;

    // 停水. Scheduled maintenance on the mains riser, which is a 上午 job on a 周三 because that
    // is what the board downstairs has been saying all along.
    // The salt is tuned rather than arbitrary. `jitter` is a good hash over consecutive integers
    // and a mediocre one over an arithmetic progression, and Wednesdays are a stride of seven:
    // salt 31 and salt 131 both produce a long-run 0.39–0.41 and then **no 停水 at all in the
    // first six weeks**, which is a notice board promising something a whole playthrough never
    // sees. Salt 331 measures 0.438 long-run and lands on days 3, 17, 24 and 31. Re-measure over
    // the first 42 days, not just over seven thousand, if this number is ever changed.
    const water = (wd === WATER_DAY && jitter(day, 331) < WATER_P)
      ? { on:true, from:WATER_HRS[0], to:WATER_HRS[1], hz:'停水', py:'tíngshuǐ', en:'the water is off',
          note:['今天上午停水，检修管道。', 'The water is off this morning — they are working on the pipes.'] }
      : null;

    // 停电. Not scheduled: the weather takes the line down, and the same weather the flight board
    // and the subway are reading. The window is the middle of the day out from the worst of it.
    const powerOn = sev >= POWER_SEV && jitter(day, 32) < POWER_P;
    const span = powerOn ? (sev - POWER_SEV) / (1 - POWER_SEV) : 0;
    const from = Math.round(9 + jitter(day, 33) * 8);
    const power = powerOn
      ? { on:true, from, to: from + Math.max(1, Math.round(1 + span * 4)),
          hz:'停电', py:'tíngdiàn', en:'the power is out',
          why: w ? { hz:w.hz, py:w.py, en:w.en } : null,
          note:['小区停电了，电梯也停了。', 'The power is out — the lift with it.'] }
      : null;

    // 电梯. Out because the power is out, or out on its own for 检修. One state, two causes, and
    // the refusal downstairs reads the state rather than either cause.
    const liftSched = !power && !weekend && jitter(day, 34) < LIFT_P;
    const lift = power
      ? { on:true, from:power.from, to:power.to, hz:'电梯', py:'diàntī', en:'the lift',
          why:{ hz:'停电', py:'tíngdiàn', en:'the power is out' },
          note:['停电，电梯用不了，走楼梯吧。', 'No power, so no lift — the stairs it is.'] }
      : liftSched
      ? { on:true, from:9, to:16, hz:'电梯', py:'diàntī', en:'the lift',
          why:{ hz:'电梯检修', py:'diàntī jiǎnxiū', en:'lift maintenance' },
          note:['电梯检修，今天走楼梯。', 'The lift is being serviced — stairs today.'] }
      : null;

    // 热浪. Not a disruption at all — the opposite, a clear summer day — which is why it is keyed
    // off the season rather than off `sev`. It is what makes the 空调 a reason instead of a prop.
    const warm = season && typeof season.warm === 'number' ? season.warm : 0;
    const heat = (warm >= HEAT_WARM && sev < FLOOR && jitter(day, 35) < HEAT_P)
      ? { on:true, from:11, to:19, hz:'热', py:'rè', en:'a heatwave',
          note:['今天太热了，屋里开空调吧。', 'Far too hot today — put the air conditioning on.'] }
      : null;

    return { water, power, lift, heat, neighbour: floorLifeFor(day, wd, weekend) };
  }

  // ---- 邻居 · what the other eleven storeys are doing today.
  //
  // Derived from the day and nothing else, for the reason at the top of this file: the lift, the
  // corridor and the floor itself have to agree about what F10 is doing this Tuesday, and a counter
  // that ticks when somebody happens to walk past cannot make them.
  const F10_P = 0.62;              // 装修 is most weekdays, because that is what a gutted flat is
  const F9_P = 0.16;               // 新婚 is a weekend, and rare, because it is one wedding
  // Behind the four doors on your own corridor. One per day per door, so 敲门 gets an answer that
  // is about today rather than the same 没有人应 forever.
  // Item 263. Two of these four are things you *hear* rather than things you find when you knock,
  // and the flat that hears them is 202 — the same landing, one wall away. That matters because
  // `noiseAt` below is the only source of neighbour noise a deck-2 sleeper can have: 装修 on ten
  // and a wedding on nine carry one deck either side and no further, which is physically right and
  // leaves the player's own bed hearing nothing at all. So the rows that are audible carry a deck,
  // an hour window and how much of the racket gets through the wall; 做饭 is a smell in the
  // corridor and 搬东西 is a daytime nuisance, and neither of them costs anybody a night.
  const DOORS = [
    { flat:'201', hz:'电视', py:'diànshì', en:'a television, loud',
      deck:2, from:20, to:24, noise:0.55,
      note:['门里电视开得很大声。', 'A television is on loud behind the door.'] },
    { flat:'203', hz:'吵架', py:'chǎojià', en:'a row',
      deck:2, from:21, to:23.5, noise:0.7,
      note:['里面两个人在吵架，你敲了也没人来。', 'Two people are arguing inside; nobody comes.'] },
    { flat:'204', hz:'做饭', py:'zuò fàn', en:'somebody cooking',
      note:['走廊里一股炒菜的味道，是204。', 'The corridor smells of frying — that is 204.'] },
    { flat:'205', hz:'搬东西', py:'bān dōngxi', en:'moving things about',
      deck:2, from:9, to:18, noise:0.5,
      note:['205在搬东西，箱子堆到门口了。', '205 are shifting boxes; they are stacked to the door.'] },
  ];

  function floorLifeFor(day, wd, weekend) {
    // F10 装修. 水电改造 is cut into that storey's walls and it is audible one deck either side.
    const f10 = (!weekend && jitter(day, 36) < F10_P)
      ? { deck:10, key:'renovation', hz:'装修', py:'zhuāngxiū', en:'building work', from:8, to:18,
          note:['十楼在装修，电钻声一直响。', 'The tenth floor is being gutted — a drill all day.'] }
      : null;
    // F9 新婚. A dated event, not a permanent label: the day it happens the lobby and the lift are
    // full of people who do not live here.
    const f9 = (weekend && jitter(day, 37) < F9_P)
      ? { deck:9, key:'wedding', hz:'新婚', py:'xīnhūn', en:'a wedding', from:9, to:14,
          note:['九楼今天办喜事，楼下都是接亲的人。', 'A wedding on the ninth today — the lobby is full of it.'] }
      : null;
    // One of the four doors, or none. Same shift-not-override shape as the ballroom above.
    const r = jitter(day, 38);
    const door = r < 0.56 ? DOORS[Math.min(DOORS.length - 1, Math.floor(jitter(day, 39) * DOORS.length))] : null;
    return { f10, f9, door };
  }

  // ---- the day's plan. Memoised on the day alone, and rebuilt only when the day changes, so the
  // map can ask this every time it redraws without doing the work every time.
  let planDay = -1, planSev = -1, plan = null;

  function planFor(day) {
    // Keyed on the severity as well as the day, exactly as Weather's own plan is keyed on its
    // `forced` override. `Weather.force` can change what today's weather is without the date
    // moving — the debug key does it, and every harness that wants a wet street does it — and a
    // memo on the day alone answers with the weather from before the override for the rest of the
    // day. Asking for the severity is what the memo was avoiding, but Weather memoises that too,
    // so this costs a comparison rather than a roll.
    const sev = (typeof Weather !== 'undefined' && Weather.disruptFor)
      ? Weather.disruptFor(day) : 0;
    if (day === planDay && sev === planSev && plan) return plan;
    planDay = day; planSev = sev;
    // The day's weather kind, off the same deterministic plan `disruptFor` reads — not the live
    // interpolated `Weather.now`, which is halfway between two things at any given minute and
    // would have the notice change its mind about why the trains are slow while you read it.
    const wplan = (typeof Weather !== 'undefined' && Weather.planFor) ? Weather.planFor(day) : null;
    const w = wplan ? Weather.KINDS[wplan.kind] : null;
    // The hotel is answered on every day, including the clear ones — a quiet house is as much an
    // answer as a full one, and the desk has to be able to ask on a Tuesday in May. The tower is
    // the same, and more so: a heatwave is a clear day, and 停水 is a 周三 with nothing wrong with
    // the sky at all, so the home block must not sit behind the severity floor.
    const hotel = hotelFor(day, sev, w);
    const home = homeFor(day, sev, w, wplan ? wplan.season : null);
    if (sev < FLOOR) { plan = { sev, metro: null, hotel, home }; return plan; }
    // Above the floor, the severity maps to minutes. At .30 that is four minutes and nobody
    // notices; at .92 it is a little over twenty and you are not getting to your desk by nine
    // unless you left before eight. Neither number is punishing on its own — what makes them
    // matter is that they land on top of a journey you had already budgeted exactly.
    const span = (sev - FLOOR) / (1 - FLOOR);
    const mins = Math.round(4 + span * 18 + jitter(day, 1) * 5);
    plan = {
      sev, hotel, home,
      metro: {
        mins,
        // The cause is the weather's own word, not one invented here. It is already in the
        // dictionary, the weather chip already teaches it, and a player who has clicked that chip
        // once knows why the trains are slow before reading the rest of the sentence.
        why: w ? { hz: w.hz, py: w.py, en: w.en } : { hz: '天气', py: 'tiānqì', en: 'the weather' },
      },
    };
    return plan;
  }

  const inRush = h => RUSH.some(([a, b]) => h >= a && h < b);

  return {
    FLOOR, RUSH,

    // Everything about today, for the diary and for anything that wants to know before it asks a
    // more specific question.
    today: day => planFor(day),

    // ---- the subway.
    //
    // `mins` is what it costs a journey started at this hour: the full delay through the two rush
    // windows, and a fraction of it the rest of the day. Handed the clock rather than reading one,
    // because the caller is the only thing that knows which minute the journey actually starts.
    metro(day, minutes) {
      const m = planFor(day).metro;
      if (!m) return null;
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      const mins = Math.max(1, Math.round(m.mins * (inRush(h) ? 1 : OFF_PEAK)));
      return { mins, why: m.why, rush: inRush(h) };
    },

    // Just the number, for the one place that adds it to a clock.
    metroMinutes(day, minutes) {
      const d = this.metro(day, minutes);
      return d ? d.mins : 0;
    },

    // ---- what it says.
    //
    // Chinese first and the English behind it, in the order the rest of the game says everything:
    // the line you could have read is the line that saves you the ten minutes, and the gloss is
    // there so that not reading it is a cost rather than a wall. When comprehension starts
    // changing what the world tells you, this is the one function that has to know about it.
    metroNotice(day, minutes) {
      const d = this.metro(day, minutes);
      if (!d) return null;
      return {
        hz: `二号线${d.rush ? '延误' : '晚点'}，大约晚${d.mins}分钟。`,
        en: `Line 2 is running about ${d.mins} minute${d.mins === 1 ? '' : 's'} late`
          + ` — ${d.why.en}.`,
        // The two words the notice turns on, for anything that wants to teach them off the back of
        // having just cost the player ten minutes. 延误 during the rush, 晚点 the rest of the day:
        // both mean late, and a player who has met one is owed the other.
        words: [d.rush ? '延误' : '晚点', d.why.hz],
        mins: d.mins,
      };
    },

    // ---- 酒店. Eight questions about today's hotel, and not one thing that fires at anybody.
    //
    // Every one of these is a read. Nothing here is subscribed to, nothing is pushed, and a caller
    // that stops asking costs nothing — which is the whole reason an empty hotel is free to the
    // street (H155). `hotel(day)` is the memoised plan object itself; do not mutate it.
    HOTEL_CANCEL, HOTEL_HOLD, HOTEL_LAST, SOLD_OUT,
    hotel: day => planFor(day).hotel,

    // The one number js/stay.js's own `fill` is asking for, on exactly its scale: percent of rooms
    // taken, 0..100, against a `hash(room, day) % 100`. A clear midweek day is quieter than the 44
    // that is hard-coded there today, a stormy weekend is fuller, and above 96 the small grades run
    // out for real.
    hotelFill: day => planFor(day).hotel.fill,
    // 旺季价. What a room actually costs tonight, given what it costs on a quiet Tuesday.
    hotelRate: (day, base) => Math.round((base || 0) * planFor(day).hotel.surge),
    hotelEvent: day => planFor(day).hotel.event,
    // What the lobby board says, in the order everything else in the game says it.
    hotelNote: day => planFor(day).hotel.note,

    // ---- 公寓. Everything wrong with the building today, and the four questions worth asking on
    // their own. Read-only, like the hotel's: these hand back the memoised plan's own objects and
    // a caller that mutates one gets a different building until the date changes.
    //
    // Every one of them takes the clock as well as the day, because a cut with a window is only a
    // cut while you are inside it — a player who showers at seven never meets the 停水 that starts
    // at eight, and that is the point rather than a hole in it. `on(x, h)` is the one test.
    home: day => planFor(day).home,
    WATER_HRS, POWER_SEV, LIFT_P,

    // Is a windowed event running at this minute. Handed the clock, never reading one.
    within(e, minutes) {
      if (!e || !e.on) return false;
      if (e.from === undefined) return true;
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      return h >= e.from && h < e.to;
    },

    // 停水 — the tap, the shower and the 热水器. Null when the water is on.
    homeWater(day, minutes) {
      const e = planFor(day).home.water;
      return minutes === undefined ? e : (this.within(e, minutes) ? e : null);
    },
    // 停电 — the lights, the 空调 and the lift, together, off one cause.
    homePower(day, minutes) {
      const e = planFor(day).home.power;
      return minutes === undefined ? e : (this.within(e, minutes) ? e : null);
    },
    // 电梯检修 or 停电: either way `World.goFloor` refuses and the 安全出口 is the answer.
    liftOut(day, minutes) {
      const e = planFor(day).home.lift;
      return minutes === undefined ? e : (this.within(e, minutes) ? e : null);
    },
    // 热浪 — the one that makes the 空调 worth switching on rather than a thing on a wall.
    homeHeat(day, minutes) {
      const e = planFor(day).home.heat;
      return minutes === undefined ? e : (this.within(e, minutes) ? e : null);
    },
    // 邻居 — F10's 装修, F9's 新婚, and whichever of the four corridor doors has something behind
    // it today. `floorLife` is the whole answer; `noiseAt` is what one deck can hear of it.
    neighbour: day => planFor(day).home.neighbour,
    floorLife: day => planFor(day).home.neighbour,
    // How loud it is on `deck`, 0..1, from whatever is going on elsewhere in the building. Falls
    // off by one deck either side, which is as far as a drill through a concrete floor gets.
    noiseAt(day, deck, minutes) {
      const n = planFor(day).home.neighbour;
      let loud = 0, why = null;
      // Deliberately not via `within`, which wants an `on` flag these two do not carry — and
      // building one with a spread would allocate two objects per call. This is asked from
      // game.js's fixture tick, so it allocates only when something is actually audible.
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      // `n.door` joins the two upstairs events because 201's television and 203's row are on the
      // player's own landing and are the only neighbour noise deck 2 can hear at all. The
      // `Number.isFinite(e.deck)` guard is what keeps the silent two out: a row with no deck has
      // no hour window either, and `h < undefined` is false, so an unguarded loop would count
      // 做饭 as a drill running twenty-four hours a day.
      for (const e of [n.f10, n.f9, n.door]) {
        if (!e || !Number.isFinite(e.deck) || h < e.from || h >= e.to) continue;
        const d = Math.abs((deck | 0) - e.deck);
        const v = (d === 0 ? 1 : d === 1 ? 0.45 : 0) * (Number.isFinite(e.noise) ? e.noise : 1);
        if (v > loud) { loud = v; why = e; }
      }
      return loud > 0 ? { loud:+loud.toFixed(2), why } : null;
    },

    // ---- 入住时间. Reception is 24 hours and always will be (H145) — what is not 24 hours is the
    // room. An unguaranteed booking is held until six and released after it, and once the house is
    // nearly full a walk-in after eleven at night is buying whatever nobody else wanted. This is
    // what makes a late landing cost something: the aeroplane is late, the desk is open, and the
    // room is gone.
    hotelCheckin(day, minutes) {
      const h = ((minutes % 1440) + 1440) % 1440 / 60;
      const H = planFor(day).hotel;
      const held = h < HOTEL_HOLD;
      const walkIn = H.fill < SOLD_OUT && (h < HOTEL_LAST || H.fill < 80);
      return {
        hour:+h.toFixed(2), desk24:true, held, walkIn, fill:H.fill,
        hold:HOTEL_HOLD, last:HOTEL_LAST,
        hz: !walkIn ? '这个点儿没房了，前台开着，房间没了。'
          : !held ? '过了十八点，没保证的预订放掉了，现在只能按当天的价开。'
          : '前台二十四小时，现在办入住没问题。',
        en: !walkIn ? 'The desk is open all night; the rooms are not.'
          : !held ? 'Past six — unguaranteed bookings have been released, so it is tonight\'s rate.'
          : 'Reception is open around the clock; checking in now is fine.',
      };
    },

    // ---- 末班车. The other half of arriving late. The metro's own signs claim 05:00–23:00 and
    // MetroSchedule.SERVICE is the same span; the delay this file already computes is what turns
    // "I have twenty minutes" into "I had twenty minutes". Handed the clock, like `metro`.
    lastTrain(day, minutes) {
      const s = (typeof MetroSchedule !== 'undefined' && MetroSchedule.SERVICE)
        ? MetroSchedule.SERVICE : { first: 5 * 60, last: 23 * 60 };
      const now = ((minutes % 1440) + 1440) % 1440;
      const late = this.metroMinutes(day, minutes);
      const left = s.last - now;
      return { first:s.first, last:s.last, left, late,
               running: now >= s.first && now <= s.last,
               missed: now > s.last,
               // Late enough that today's delay is the difference between catching it and not.
               tight: left >= 0 && left <= late + 12 };
    },

    // ---- 复习偏向. Deliberately NOT part of the day plan and deliberately not memoised: the
    // review queue is a fact about the player, not about the date, and folding it into `planFor`
    // would make the same Tuesday answer differently after a study session — which is the one
    // property this whole file exists to keep. A caller rolling a day's events may weight a
    // hotel-shaped one by this; it may not cache it.
    //
    // Topics are the twelve closed ones in js/vocab.js. Hotel language is service language: what
    // you say at a counter, what a room costs, what a bill says. H151 landed in js/vocab.js — the
    // hotel block carries topics now (客房服务/房卡/热水/毛巾 are home, 押金/入住/退房/结账 are
    // money, 工程部/水疗中心/行政酒廊 are work) — so these four topics really do cover the language
    // of this building, and `hotelWords` below is the sharper question underneath them.
    SERVICE_TOPICS: ['work', 'money', 'home', 'social'],
    serviceDue() {
      if (typeof Vocab === 'undefined' || !Vocab.dueByTopic) return 0;
      let n = 0;
      for (const t of this.SERVICE_TOPICS) n += Vocab.dueByTopic(t).length;
      return Math.min(1, n / 12);
    },

    // ---- 酒店词 · the words this building is actually made of.
    //
    // `serviceDue` measures four whole topics, which is most of the dictionary and therefore a
    // blunt instrument: 天气 is `weather` and 医院 is `medical`, but 上班 and 手机 are `work` and
    // 家 is `home`, so a queue full of office words reads as "hotel language is due". These are the
    // rows a hotel evening is made of, and every one of them is a real row — `.hotelweek.js`
    // checks the list against js/vocab.js so a renamed word cannot quietly stop biasing anything.
    HOTEL_WORDS: ['入住', '退房', '押金', '房卡', '标准间', '含早餐', '几晚', '身份证',
                  '热水', '空调', '毛巾', '吵', '坏了', '修', '换房间', '房型',
                  '客房服务', '叫醒服务', '送餐', '洗衣', '打扫', '结账', '发票', '收据',
                  '寄存行李', '延迟退房'],
    // How much of the hotel's own vocabulary is waiting, 0..1. Deliberately outside `planFor` and
    // deliberately not memoised, for the reason written at the top of this section: the review
    // queue is a fact about the player and folding it into the day plan would make the same Tuesday
    // answer differently after a study session.
    hotelDue() {
      if (typeof Vocab === 'undefined' || !Vocab.isDue) return 0;
      let n = 0;
      for (const w of this.HOTEL_WORDS) if (Vocab.isDue(w)) n++;
      return +(n / this.HOTEL_WORDS.length).toFixed(3);
    },

    // ---- 家里的词 · the words the tower is made of (241-269, item 269).
    //
    // Same instrument as `HOTEL_WORDS` and for the same reason: `serviceDue` measures four whole
    // topics, which is most of the dictionary, and 家 being due does not mean the language of a
    // 报修 call is. These are the rows a bad evening at home is made of — the bills, the fault, the
    // lift, the delivery — and every one of them is a real row today. `.homeweek.js` checks the
    // list against js/vocab.js on every run so a renamed word cannot quietly stop biasing anything,
    // which is the failure this list exists to be caught by rather than to cause.
    //
    // 停水, 停电 and 检修 landed in js/vocab.js while this was being written and are in the list.
    // 新婚, 水费, 电费 and 燃气费 are still queued and are deliberately NOT here: a word in this
    // list that the dictionary has never heard of is a silent zero rather than an error, which is
    // exactly the failure mode item 269 asks this list to be immune to. Add them when they land.
    HOME_WORDS: ['停水', '停电', '检修',
                 '房租', '物业', '报修', '电梯', '楼梯', '安全出口', '停', '修', '坏了',
                 '快递', '快递柜', '信箱', '外卖', '钥匙', '门', '窗户', '邻居', '装修',
                 '冰箱', '洗衣机', '空调', '热水器', '垃圾'],
    homeDue() {
      if (typeof Vocab === 'undefined' || !Vocab.isDue) return 0;
      let n = 0;
      for (const w of this.HOME_WORDS) if (Vocab.isDue(w)) n++;
      return +(n / this.HOME_WORDS.length).toFixed(3);
    },

    // ---- 今天家里出什么事. The home-shaped errand, on exactly `hotelBias`'s shape (269): the day
    // decides which, the review queue decides how likely. Not an event that fires — a question a
    // caller staging the day's errands asks, and two callers on the same day with the same queue
    // get the same answer.
    //
    // These are errands rather than disruptions. What is *wrong* with the building is `home(day)`
    // above and is not about you at all; this is what you might choose to do about the building,
    // and it is allowed to be about you.
    HOME_EVENTS: [
      { key:'repair', hz:'家里坏了东西', en:'something in the flat has broken', words:['坏了', '修', '报修'] },
      { key:'parcel', hz:'有快递', en:'a parcel to collect', words:['快递', '快递柜', '信箱'] },
      { key:'bill', hz:'该交费了', en:'a bill to settle', words:['房租', '物业', '门'] },
      { key:'chores', hz:'家里该收拾了', en:'the flat needs doing', words:['垃圾', '洗衣机', '冰箱'] },
    ],
    homeBias(day) {
      const due = this.homeDue();
      const roll = jitter(day, 43);
      // Slightly likelier than the hotel's, because this is the building you live in and something
      // is always mildly wrong with a flat — and still never certain, for the same reason.
      const p = 0.22 + due * 0.44;
      const on = roll < p;
      const E = this.HOME_EVENTS;
      const base = Math.min(E.length - 1, Math.floor(jitter(day, 44) * E.length));
      let best = 0, at = base;
      if (typeof Vocab !== 'undefined' && Vocab.isDue)
        for (let i = 0; i < E.length; i++) {
          const j = (base + i) % E.length;
          let n = 0;
          for (const w of E[j].words) if (Vocab.isDue(w)) n++;
          if (n > best) { best = n; at = j; }
        }
      return { on, due, p:+p.toFixed(3), roll:+roll.toFixed(3), event:on ? E[at] : null };
    },

    // ---- 今天该出什么事. Whether today produces a hotel-shaped event, and which (H150).
    //
    // The day decides the *shape* and the review queue decides how likely it is to happen at all:
    // an ordinary day carries a small standing chance, and a player with the whole booking
    // vocabulary overdue gets one most days. Not an event that fires — a question a caller staging
    // the day's errands asks, in the same read-only shape as everything else in this file.
    //
    // `roll` is the deterministic part and `due` is the part that is about you, kept separate on
    // purpose so a caller can log why it happened. Two callers on the same day with the same queue
    // get the same answer, which is what makes it safe to ask from more than one place.
    HOTEL_EVENTS: [
      { key:'booking', hz:'订房出了问题', en:'a booking that went wrong', words:['入住', '房型', '押金'] },
      { key:'delivery', hz:'有人送东西上来', en:'something being delivered to a room', words:['送餐', '客房服务', '洗衣'] },
      { key:'lostkey', hz:'房卡丢了', en:'a lost key card', words:['房卡', '身份证', '刷'] },
    ],
    hotelBias(day) {
      const due = this.hotelDue();
      const roll = jitter(day, 23);
      // 0.18 with nothing due, 0.62 with the whole list waiting. A hotel day is never guaranteed
      // and never impossible, because a world that stages an errand every single day stops being a
      // world and starts being a queue with scenery on it.
      const p = 0.18 + due * 0.44;
      const on = roll < p;
      const E = this.HOTEL_EVENTS;
      // Which one: the day picks a starting point, the queue moves it. Same shift-not-override rule
      // js/stay.js's `pick` uses, so with nothing due this is purely the day's own choice.
      const base = Math.min(E.length - 1, Math.floor(jitter(day, 24) * E.length));
      let best = 0, at = base;
      if (typeof Vocab !== 'undefined' && Vocab.isDue)
        for (let i = 0; i < E.length; i++) {
          const j = (base + i) % E.length;
          let n = 0;
          for (const w of E[j].words) if (Vocab.isDue(w)) n++;
          if (n > best) { best = n; at = j; }
        }
      return { on, due, p:+p.toFixed(3), roll:+roll.toFixed(3), event:on ? E[at] : null };
    },

    // ---- the flights, which already worked, expressed here so there is one place to ask.
    // Airport.setDay is still handed `Weather.disruptFor` directly by game.js; this is the same
    // number by the same route, so a later pass can move that call over without changing what the
    // board does today.
    flights: day => planFor(day).sev,
  };
})();
