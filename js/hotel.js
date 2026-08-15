// 京华大酒店 · JINGHUA GRAND HOTEL
//
// Shared architecture for the hotel's complete B1 + twelve-storey programme. Floor-specific authors register
// their rooms in HotelFit; this file owns the measured shell, arrival seam, vertical core and the
// metadata a future workplace chapter will attach to.  It deliberately does not know about a
// particular restaurant, guestroom or spa fixture.

// The street-side arrival stands in the middle of the clear forecourt, not in the hotel taxi
// envelope. It faces along the pavement so the third-person orbit opens over the pedestrian spine
// instead of in a moving lane. Keep this one coordinate authoritative for both exterior seams.
const HOTEL_OUT = { x: 39.18, z: 28.40, yaw: 0 };

const HOTEL_DEPARTMENTS = Object.freeze([
  { key:'front-office', hz:'前厅部', en:'front office', floors:['hotel'] },
  { key:'concierge', hz:'礼宾部', en:'concierge and bell', floors:['hotel'] },
  { key:'housekeeping', hz:'客房部', en:'housekeeping', floors:['hotelB1','hotel5','hotel6','hotel7','hotel8','hotel9','hotel11'] },
  { key:'food-beverage', hz:'餐饮部', en:'food and beverage', floors:['hotel2','hotel9','hotel10','hotel12'] },
  { key:'banqueting', hz:'宴会部', en:'banqueting', floors:['hotel3'] },
  { key:'spa', hz:'水疗中心', en:'spa and recreation', floors:['hotel4'] },
  { key:'security', hz:'保安部', en:'security', floors:['hotelB1','hotel'] },
  { key:'engineering', hz:'工程部', en:'engineering', floors:['hotelB1','hotel12'] },
  { key:'laundry', hz:'洗衣房', en:'laundry', floors:['hotelB1'] },
]);

// `level` is the physical number shown by the car. `order` is the authored stop order. Keeping
// both makes travel duration and stair adjacency explicit and leaves B1 correctly below 1F.
const HOTEL_FLOORS = Object.freeze([
  { key:'hotelB1', lazy:'HotelB1', display:'B1', level:-1, order:0,
    hz:'地下一层', py:'dìxià yì céng', en:'basement operations',
    programme:'后勤 · 洗衣 · 员工区 · 工程与保安', short:'后勤服务层',
    accent:'#5f817b', wall:'#d7d3c8', floor:'#707873', dark:'#35423f' },
  { key:'hotel', lazy:'Hotel', display:'1', level:1, order:1,
    hz:'一楼', py:'yī lóu', en:'grand lobby and arrival',
    programme:'大堂 · 前台 · 礼宾 · 茶廊', short:'大堂',
    accent:'#9a3028', wall:'#e5dcc9', floor:'#b8a88c', dark:'#332c29' },
  { key:'hotel2', lazy:'Hotel2', display:'2', level:2, order:2,
    hz:'二楼', py:'èr lóu', en:'restaurants and private dining',
    programme:'中餐厅 · 全日餐厅 · 私宴 · 明档厨房', short:'餐饮',
    accent:'#5c806f', wall:'#ddd8c8', floor:'#806f5b', dark:'#2d3833' },
  { key:'hotel3', lazy:'Hotel3', display:'3', level:3, order:3,
    hz:'三楼', py:'sān lóu', en:'ballroom and meetings',
    programme:'宴会厅 · 婚礼沙龙 · 会议 · 商务中心', short:'宴会会议',
    accent:'#8c573f', wall:'#e0d5c5', floor:'#74524e', dark:'#342c31' },
  { key:'hotel4', lazy:'Hotel4', display:'4', level:4, order:4,
    hz:'四楼', py:'sì lóu', en:'spa, pool and fitness',
    programme:'水疗 · 泳池 · 健身 · 更衣', short:'康体水疗',
    accent:'#3f7880', wall:'#d2d6cf', floor:'#465a5b', dark:'#26383a' },
  { key:'hotel5', lazy:'Hotel5', display:'5', level:5, order:5,
    hz:'五楼', py:'wǔ lóu', en:'standard and accessible rooms',
    programme:'标准客房 · 无障碍客房 · 客房部工作间', short:'客房',
    accent:'#7d6854', wall:'#ded8cc', floor:'#675e57', dark:'#302d2b' },
  { key:'hotel6', lazy:'Hotel6', display:'6', level:6, order:6,
    hz:'六楼', py:'liù lóu', en:'family and connecting rooms',
    programme:'家庭客房 · 连通房 · 儿童阅读游戏廊 · 客用茶水间', short:'家庭客房',
    accent:'#9a6658', wall:'#e1d8ca', floor:'#6b5d58', dark:'#342d2c' },
  { key:'hotel7', lazy:'Hotel7', display:'7', level:7, order:7,
    hz:'七楼', py:'qī lóu', en:'long-stay serviced residences',
    programme:'酒店式公寓 · 共享办公 · 早餐厨房 · 自助洗衣 · 静心阅读', short:'长住公寓',
    accent:'#57786d', wall:'#d9d8cc', floor:'#5c625c', dark:'#2a3431' },
  { key:'hotel8', lazy:'Hotel8', display:'8', level:8, order:8,
    hz:'八楼', py:'bā lóu', en:'deluxe and corner rooms',
    programme:'豪华客房 · 转角景观房', short:'豪华客房',
    accent:'#76624c', wall:'#ddd5c6', floor:'#5b504a', dark:'#292725' },
  { key:'hotel9', lazy:'Hotel9', display:'9', level:9, order:9,
    hz:'九楼', py:'jiǔ lóu', en:'cultural club and junior suites',
    programme:'精选套房 · 茶艺沙龙 · 棋牌室 · 书法雅集 · 服务茶水间', short:'文化会所',
    accent:'#85683e', wall:'#ddd4c3', floor:'#574e45', dark:'#2d2925' },
  { key:'hotel10', lazy:'Hotel10', display:'10', level:10, order:10,
    hz:'十楼', py:'shí lóu', en:'executive lounge and library',
    programme:'行政酒廊 · 早餐 · 图书室 · 商务桌', short:'行政楼层',
    accent:'#785a36', wall:'#d9d0bf', floor:'#51463e', dark:'#272522' },
  { key:'hotel11', lazy:'Hotel11', display:'11', level:11, order:11,
    hz:'十一楼', py:'shíyī lóu', en:'signature suites',
    programme:'套房 · 起居 · 餐厅 · 石材浴室', short:'京华套房',
    accent:'#8f463c', wall:'#dfd5c5', floor:'#594943', dark:'#2e2727' },
  { key:'hotel12', lazy:'Hotel12', display:'12', level:12, order:12,
    hz:'十二楼', py:'shí’èr lóu', en:'rooftop dining and terrace',
    programme:'中餐厅 · 云端酒廊 · 露台', short:'云端餐厅',
    accent:'#a66d32', wall:'#d7d0bf', floor:'#4c4840', dark:'#252728' },
]);

// Every line the building can say, keyed by what caused it — the seam `Metro.NOTICES`,
// `Airport.NOTICES` and `Mall.NOTICES` already occupy. `.dumplines.js` enumerates the values and
// bakes each under `pa|<text>`; `Speech.noticeClip(text)` then returns the clip at play time.
//
// **Read it as `HOTEL_NOTICES` or `HotelCore.NOTICES`, never as `Hotel.NOTICES`.** The three
// precedents are all Lazy scene proxies whose module and whose place are the same object. This
// building's are not: `Hotel` is floor 1's *scene* (see the bottom of this file), so `Hotel.NOTICES`
// would build a 2,300-prop lobby in order to look up a dictionary of strings, and then return
// undefined because the scene does not carry one. A plain top-level object costs nothing to read.
//
// The lift keys below are filled here because the shell is what causes them and `HOTEL_FLOORS` is
// what knows the wording — `hz` is already the spoken form (一楼, 地下一层). Lobby, paging and
// service announcements are the language lane's to write; add them here under their own prefix.
// Nothing draws these strings, so they need no `Glyphs.need`.
const HOTEL_NOTICES = {};
for (const f of HOTEL_FLOORS) {
  // `lift:<key>` is the arrival announcement HOTEL-TODO H083 asks for. `hz` carries the spoken
  // floor name, so B1 says 地下一层 rather than a letter and a digit.
  HOTEL_NOTICES[`lift:${f.key}`] = `${f.hz}到了。`;
  HOTEL_NOTICES[`floor:${f.key}`] = `${f.hz}，${f.short}。`;
}
HOTEL_NOTICES['lift:up'] = '电梯上行。';
HOTEL_NOTICES['lift:down'] = '电梯下行。';
HOTEL_NOTICES['lift:door'] = '电梯门就要关了，请注意。';

// ---- the lobby, written by the language lane against the seam above (HOTEL-TODO H183).
//
// Every line is 您 and 请, without exception, because a public-address system in a hotel of this
// class is the most formal register in the building — and the 您/你 contrast between staff and the
// street is the one teaching point this hotel exists to make. They are built out of words the
// dictionary already knows, so the subtitle comes out fully glossed.
//
// Kept deliberately short. These bake through the same single announcer voice as the platform and
// the shopping centre (`pa|<text>` — see Speech.noticeClip), and a loudspeaker that says eleven
// different things is a loudspeaker nobody listens to.
HOTEL_NOTICES['lobby:welcome'] = '欢迎光临京华大酒店，祝您入住愉快。';
HOTEL_NOTICES['lobby:checkin'] = '办理入住和退房请到大堂前台。';
HOTEL_NOTICES['lobby:breakfast'] = '早餐在二楼全日餐厅，供应到十点半。';
HOTEL_NOTICES['lobby:luggage'] = '寄存行李请到礼宾部，凭牌领取。';
HOTEL_NOTICES['lobby:quiet'] = '大堂请您保持安静，谢谢配合。';
HOTEL_NOTICES['lobby:night'] = '夜间进入客梯请出示房卡。';
// Paging. A real system names the guest; this one cannot, because a baked clip is a fixed string
// and a name is not — so both lines send the person to the desk, where the name is on a screen.
HOTEL_NOTICES['page:guest'] = '请这位客人到大堂前台，前台有您的留言。';
HOTEL_NOTICES['page:staff'] = '请客房部的同事到前台接待处。';

const HotelCast = [];

// ---------------------------------------------------------------- 客房 fixture state (H113)
// The curtains, the bedside lights and the television in a guestroom. Three fields, and the third
// value each one carries is the whole reason this exists: `null` means "nobody has touched it,
// follow the hour", which is what every one of these fixtures did before and what a room the guest
// has never walked into has to keep doing. A boolean would switch every bedside lamp on six floors
// off the first time somebody pulled one cord.
//
// Tied to one booking, because a fixture left off is a fact about a guest and not about a room.
// `stay` is floor/room/arrival-day, so the next stay opens the curtains again instead of inheriting
// the last guest's night, and checking out clears it by the same mechanism — the tag stops matching
// and every field reads as "follow the hour" again without anything having to remember to reset it.
//
// It lives here rather than in js/stay.js because js/stay.js owns what a night costs, not what the
// room looks like, and a fit-out tick has to be able to ask this question sixty times a second
// without a booking in its hand.
//
// **Saved in `bjlife.save.v1` as `room`, with its own validated loader in js/game.js.** That is the
// half that blocked this item: an earlier lane wrote the switches, found it needed schema, and
// deleted its own state object rather than ship a room that forgets itself on refresh. The schema
// is landed first here so that cannot happen again.
const HotelRoom = (() => {
  const KEYS = Object.freeze(['curtain','lamp','tv']);
  const fresh = () => ({stay:'', curtain:null, lamp:null, tv:null});
  let s = fresh();
  const tri = v => (v === 0 || v === 1 ? v : null);
  // Read live off js/stay.js rather than stored twice: it is the only thing that knows whether the
  // guest is still in that room, and two copies of that fact is one copy too many.
  const tag = () => {
    try {
      const b = typeof Stay !== 'undefined' && Stay.booking && Stay.booking();
      return b ? `${b.floor}/${b.room}/${b.from}` : '';
    } catch (_) { return ''; }
  };
  const mine = () => !!s.stay && s.stay === tag();
  return {
    KEYS,
    // What a fixture tick asks — `A.room.on('curtain', h >= 22.4 || h < 6.6)`. The guest's choice
    // wins while it is still the guest's room; otherwise the clock does, exactly as before.
    on(k, byClock) { const v = mine() ? s[k] : null; return v === null ? !!byClock : !!v; },
    // 1, 0 or null, for a card that wants to say whether the guest has taken it off the clock.
    held(k) { return mine() ? tri(s[k]) : null; },
    // `null` hands the fixture back to the hour. Refused when nobody is checked in: there is no
    // stay for it to belong to, and a fixture state with no owner is the bug this replaces.
    set(k, v) {
      if (!KEYS.includes(k)) return null;
      const t = tag();
      if (!t) return null;
      if (s.stay !== t) { s = fresh(); s.stay = t; }
      s[k] = v === null || v === undefined ? null : (v ? 1 : 0);
      return s[k];
    },
    reset() { s = fresh(); },
    toSave() { return {v:1, stay:s.stay, curtain:s.curtain, lamp:s.lamp, tv:s.tv}; },
    // One bad field costs the fixture, never the boot — the rule `stay`, `career` and `pantry`
    // already follow. A save written before this existed has no `room` key at all and correctly
    // comes back with all three on the clock.
    load(q) {
      s = fresh();
      if (!q || typeof q !== 'object' || q.v !== 1) return;
      s.stay = typeof q.stay === 'string' ? q.stay.slice(0, 48) : '';
      if (!s.stay) return;
      for (const k of KEYS) s[k] = tri(q[k]);
    },
    // The one runnable check, for the same reason js/hotel-service.js carries `spaCheck()`: this
    // is a save-schema contract, and a schema nobody exercises is a schema that silently rots.
    //   HotelRoom.check()   -> { ok:true, checks:[…] }   from any page or harness
    // It restores whatever state it started with, so it is safe to run mid-game.
    check() {
      const checks = [], put = (name, ok, detail) => checks.push({name, ok:!!ok, detail});
      const before = this.toSave(), t = tag();
      try {
        this.reset();
        put('with nothing set, a fixture follows the clock',
            this.on('curtain', true) === true && this.on('curtain', false) === false, '');
        if (t) {
          put('a fixture can be set while a guest is in the room', this.set('curtain', 0) === 0, t);
          put('a guest override beats the clock', this.on('curtain', true) === false, '');
          put('and only for the fixture that was set', this.on('lamp', true) === true, '');
          const blob = JSON.parse(JSON.stringify(this.toSave()));
          this.reset(); this.load(blob);
          put('it survives a save/load round trip', this.on('curtain', true) === false, '');
          this.set('curtain', null);
          put('and null hands it back to the clock', this.on('curtain', true) === true, '');
        } else {
          put('with nobody checked in, nothing can be set', this.set('curtain', 1) === null, '');
        }
        this.reset(); this.load({v:1, stay:'nobody/000/0', curtain:0});
        put('a stay that is not the live one is inert', this.on('curtain', true) === true, '');
        this.reset(); this.load({v:2, stay:'x/1/1', curtain:0});
        put('a future version is refused, not half-read', this.on('curtain', true) === true, '');
        this.reset(); this.load({v:1, stay:'x/1/1', curtain:'yes', lamp:7});
        put('a malformed field costs the fixture, not the boot',
            this.held('curtain') === null && this.held('lamp') === null, '');
      } finally { this.load(before); }
      return {ok:checks.every(c => c.ok), checks};
    },
  };
})();

// Floor-owned interaction definitions. A fit module may add
//   HotelUse.hotel2['茶桌'] = { zh:'喝茶', ... }
// without editing data.js. game.js gives this registry first refusal only while the matching
// hotel floor is active, so ordinary words elsewhere keep their existing actions.
const HotelUse = Object.fromEntries(HOTEL_FLOORS.map(f=>[f.key,{}]));
HotelUse.hotelLift={};

// A fit-out may use either `HotelFit.register('hotel2', fn)` or the established project idiom
// `HotelFit.hotel2 = fn`. Multiple registrations are composed in registration order.
const HotelFit = {};
Object.defineProperties(HotelFit, {
  register: { enumerable:false, value(key, fn) {
    if (!HOTEL_FLOORS.some(f => f.key === key)) throw new Error('HotelFit: unknown floor '+key);
    if (typeof fn !== 'function') throw new Error('HotelFit: '+key+' builder is not a function');
    const old = HotelFit[key];
    HotelFit[key] = !old ? fn : Array.isArray(old) ? old.concat(fn) : [old, fn];
    return fn;
  } },
  builders: { enumerable:false, value(key) {
    const f=HotelFit[key]; return !f ? [] : Array.isArray(f) ? f.slice() : [f];
  } },
});

const HOTEL_CORE = Object.freeze({
  RX:22, RZ:15, H:4.35,
  lift:{ x:18.15, cars:[-7.20,-3.70,-.20], active:-3.70, service:5.10,
         landing:[16.15,-3.70], carSpawn:[0,1.55] },
  stairs:{ x:-18.0, z:-7.1, landing:[-16.0,-7.1] },
  // `inside` is the point a guest stands on after coming through the street door. It used to read
  // [0,-12.55] and nothing read it back: floor 1's own `spawn` and the street door's `exit.at`
  // both hardcoded z -12.25, so the published constant was 0.30 m of fiction. Both live sites now
  // read this field (js/hotel.js:680, js/street-hotel.js:283), so it cannot drift again.
  entrance:{ x:0, z:-14.92, inside:[0,-12.25], vestibule:[0,-13.85] },
  tags:Object.freeze(['前台','礼宾部','行李车','客房','布草间','洗衣房','宴会厅','厨房',
                      '客房服务','工程部','员工入口']),
});

// Most plates share the same broad guest route. The lobby water court and F4 heated pool are
// deliberate room-sized features, so those floors carry measured detours instead of publishing
// waypoints through water. These remain floor contracts for future staff/task navigation.
const GUEST_SPINE_DEFAULT   = [[14,-3.70],[5,-3.70],[0,0],[-8,4]];
const SERVICE_SPINE_DEFAULT = [[16,5.1],[9,5.1],[9,10]];

// ---- per-floor detours, measured, not assumed.
//
// One generic polyline for thirteen plates predates every authored floor plan, and by 2026-08-08
// it was walking through architecture. Sampled at 0.05 m with the scene's own `clampMove` at the
// real 0.30 m body radius, the published `serviceSpine` was blocked on SIX floors, not the five
// previously reported — hotel3 (30 samples), hotel5 (65), hotel6 (52), hotel7 (15), hotel8 (93),
// hotel10 (27). Both endpoints, [16,5.1] and [9,10], are clear on every one of them; it is the
// middle that is inside a wall.
//
// There is no single replacement. The blocking partition is at a different z on every floor —
// hotel-guests.js:1020 puts floor 5's at 5.10 (`solid(-13.90, 11.40, 5.00, 5.20)`, exactly the
// spine's middle leg), hotel-f6.js:996 puts f6's at 5.22, hotel-f7.js:738 puts f7's at 5.72 —
// and x = 16 is itself walled north of z 6.5 on hotel6. So the data becomes per-floor.
//
// Every list below keeps the published endpoints [16,5.1] and [9,10] EXACTLY — both are clear on
// every floor, so no consumer's idea of where the route starts and ends moves. Only the middle
// is re-cut. Each was found by breadth-first search over that floor's own standable cells on a
// grid inflated to r = 0.45, i.e. 0.15 m of clearance beyond the body, then simplified to the
// fewest legs and proved leg by leg by sampling `clampMove` at 0.05 m at the real r = 0.30.
// Zero blocked samples on all six. They are not drawn by eye and not a guess at where a corridor
// ought to be: hotel5's detour goes through the 1.20 m staff door E1 already has at z 6.39..7.59
// (js/hotel-f5.js header), because that is the opening the building actually provides.
//
// A floor absent from this table uses the default above, and its default is measured clear.
// If you move a partition, re-measure the spine for that floor in the same pass.
const SERVICE_SPINES = {
  hotel3:  [[16,5.1],[12.35,7.4],[10,8.15],[10,9.2],[9,10]],
  hotel5:  [[16,5.1],[11.95,6.85],[9,7.65],[9,10]],
  hotel6:  [[16,5.1],[9,10]],
  hotel7:  [[16,5.1],[9.15,10],[9,10]],
  hotel8:  [[16,5.1],[12.65,9],[12.65,9.8],[9,10]],
  hotel10: [[16,5.1],[7.55,5.35],[7.55,7.1],[8.8,10],[9,10]],
};

// NOT FIXED, AND DELIBERATELY. `guestSpine` has the same fault and is worse — the same sweep found
// it blocked on NINE plates, always on the `[5,-3.70] -> [0,0] -> [-8,4]` diagonal that cuts the
// centre of the plate where every floor puts furniture: hotelB1 137 samples, hotel4 139,
// hotel12 95, hotel11 53, hotel 32, hotel2 29, hotel3 29, hotel10 24, hotel8 13. Measured
// replacements exist and are clear at r = 0.30, but two of them would overwrite the water-court
// and pool detours the comment above says were authored on purpose, and a solver that only reads
// `solid()` cannot see water. Left for a lane that owns that intent rather than guessed at here.
//
// The measurement is written down rather than thrown away, because re-taking it costs a browser
// slot per plate. Each list below was solved exactly like the service spines — BFS over that
// floor's own standable cells at r = 0.45, simplified, published endpoints pinned, then sampled
// at 0.05 m at the real r = 0.30 with ZERO blocked samples. They are proven walkable and are NOT
// published; the two marked `intent` are the ones that would overwrite an authored detour.
//
//   hotelB1 [[14,-3.7],[4.2,-0.75],[-3.35,0.55],[-3.35,1.1],[-8,1.6],[-7.98,3.74]]
//                                        ^ ends at [-7.98,3.74]: [-8,4] is NOT standable on B1
//   hotel   [[14,-3.7],[-8,-2.25],[-8,4]]                                    <- intent: water court
//   hotel2  [[14,-3.7],[-8,-0.4],[-8,4]]
//   hotel3  [[14,-3.7],[-8,-0.25],[-8,4]]
//   hotel4  [[14,-3.7],[2.65,-3.8],[2.65,-4.25],[-2.4,-5.8],[-8,-5.8],[-8,1.1]]  <- intent: pool
//   hotel8  [[14,-3.7],[-8,-2.65],[-8,4]]
//   hotel10 [[14,-3.7],[-8.05,-2],[-8.05,4],[-8,4]]
//   hotel11 [[14,-3.7],[5.05,-3.7],[5.05,-3],[-9.2,-2],[-9.2,2.4],[-8,4]]
//   hotel12 [[14,-3.7],[-6.8,0.45],[-6.8,2.15],[-8,4]]
//
// Publishing the seven without an authored detour is a data-only change and needs no re-measure.
const GUEST_SPINES = {
  hotel:  [[14,-3.70],[5,-3.70],[0,0],[-7.35,1.45],[-7.35,4.0],[-8,4]],
  hotel4: [[14,-3.70],[5,-3.70],[0,0],[-8,1.10]],
};

const HOTEL_ROUTES = Object.freeze(Object.fromEntries(HOTEL_FLOORS.map(f => [f.key,
  Object.freeze({
    passenger:[16.0,-3.7],service:[16.0,5.1],stair:[-16.0,-7.1],
    guestSpine:   GUEST_SPINES[f.key]   || GUEST_SPINE_DEFAULT,
    serviceSpine: SERVICE_SPINES[f.key] || SERVICE_SPINE_DEFAULT,
  })])));

try {
  Glyphs.need('京华大酒店大堂后勤服务层餐饮宴会会议康体水疗客房豪华行政楼层京华套房云端餐厅' +
    '楼层索引客梯服务梯安全出口礼宾前台电梯运行中到达地下层中餐厅全日宴会厅水疗泳池健身' +
    '标准无障碍豪华转角行政酒廊图书室套房露台员工入口工程部洗衣房布草间' +
    // The lobby's street context. This shell writes 街景商店 and 出租 through the vestibule and
    // used to declare none of 街景商租: they rendered because hotel-guests.js and street-hotel.js
    // happened to declare them for their own signs. A module must declare what it writes, or a
    // sign in one room goes blank when an unrelated file changes.
    '街景商租');
} catch (_) {}

const HotelCore = (() => {
  const { RX,RZ,H }=HOTEL_CORE;
  const floorByKey=key=>HOTEL_FLOORS.find(f=>f.key===key);

  function makeFloor(lazyName, key) {
    const meta=floorByKey(key);
    if (!meta) throw new Error('HotelCore: unknown floor '+key);
    return Lazy(lazyName, () => {
      const Cc=hex=>C(hex);
      const col={
        wall:Cc(meta.wall), wallD:Cc('#b8b0a2'), ceiling:Cc('#eee8dc'),
        stone:Cc(meta.floor), stoneL:Cc('#d8cdbb'), dark:Cc(meta.dark), accent:Cc(meta.accent),
        bronze:Cc('#9b7441'), bronzeD:Cc('#5d452d'), bronzeL:Cc('#c6a468'),
        walnut:Cc('#4a352a'), walnutL:Cc('#765746'), lacquer:Cc('#8e2d27'),
        celadon:Cc('#8ca99b'), jade:Cc('#456f62'), ink:Cc('#252829'),
        glass:Cc('#95afba'), glassD:Cc('#26363e'), warm:Cc('#ffe4af'),
        white:Cc('#f5f0e5'), steel:Cc('#85898a'), red:Cc('#a92f27'),
        green:Cc('#52725d'), water:Cc('#4f8992'), carpet:Cc('#65514c'),
      };
      const B=Build.scene({wood:new Set([col.walnut,col.walnutL]),fabricGloss:.035});
      const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,thing}=B;
      const ticks=[], lit=[], lights=[];
      const onTick=fn=>{ticks.push(fn);return fn;};
      const luminous=(p,day=.025,night=.28)=>{p.glow=day;lit.push({p,day,night});return p;};
      const light=(...a)=>{const q=B.light(...a);lights.push(q);return q;};

      // ---------------------------------------------------------------- measured shared shell
      // `nocut` for the same reason the walls and ceiling below carry it. These are untagged, so
      // the cutaway falls back to the prop's own matrix translation — and the floor plate and the
      // two long inlays are centred on (0, 0), the one point that is inside the hidden band for
      // any camera room that does not straddle the middle of the floor. They are being culled in
      // exactly the views that lost the walls; it has gone unseen only because every fit so far
      // happens to lay its own floor over the rooms it authors a camera volume for, which is luck
      // rather than design. Nothing below the floor can be revealed by removing it.
      flat(0,.006,0,RX*2,RZ*2,col.stone,{mode:7,gloss:.16,mat:'tile',matScale:.72,matAmt:.22,nocut:true});
      // Dark stone edge and bronze inlay make every landing recognisably the same building while
      // the field colour changes floor by floor.
      flat(0,.010,-RZ+.36,RX*2-.40,.55,col.dark,{mode:7,gloss:.18,nocut:true});
      for(const x of [-13.8,13.8]) flat(x,.014,0,.045,RZ*2-.7,col.bronze,{gloss:.66,nocut:true});
      for(const z of [-10.4,10.4]) flat(0,.014,z,RX*2-.7,.045,col.bronze,{gloss:.66,nocut:true});

      // Exterior walls. The lobby threshold is a genuine opening with a high head and side
      // returns; every other level is sealed along this edge.
      // `nocut` keeps the envelope out of the camera cutaway (js/game.js, hiddenProp). These five
      // pieces are not fixtures standing in a room, they are the room's container, and each is
      // larger than any camera room on the floor: the cutaway judges a prop by one point, and for
      // a floor-sized slab — or for the 墙 group, whose four walls average to the middle of the
      // floor plate — that point is meaningless. Without this, every authored camera room that
      // does not straddle the origin removed the whole shell the moment the eye backed out of it
      // toward the centre of the floor, and the clear colour showing through read as black walls.
      // The blockers below already stop the eye crossing the perimeter, so nothing is lost.
      box(0,H-.13,0,RX*2,.26,RZ*2,col.ceiling,{hard:true,gloss:.12,tag:'天花',nocut:true});
      box(-RX+.11,H/2,0,.22,H,RZ*2,col.wall,{hard:true,mode:14,gloss:.12,tag:'墙',nocut:true});
      box(RX-.11,H/2,0,.22,H,RZ*2,col.wall,{hard:true,mode:14,gloss:.12,tag:'墙',nocut:true});
      box(0,H/2,RZ-.11,RX*2,H,.22,col.wall,{hard:true,mode:14,gloss:.12,tag:'墙',nocut:true});
      if(key==='hotel') {
        // Deliberately NOT `nocut`. The lobby is the one floor whose -z edge is a real opening:
        // these three pieces are the jambs and head around the entrance, line 184 omits the south
        // blocker for them, and the eye can legitimately end up outside the envelope at the front
        // door. A wall that refused to cut here would put an opaque slab between the lens and the
        // player on the threshold, which is exactly what the cutaway exists to prevent.
        for(const s of [-1,1]) box(s*(RX/2+2.0),H/2,-RZ+.11,RX-4.0,H,.22,col.wall,
          {hard:true,mode:14,gloss:.12,tag:'门'});
        box(0,H-.56,-RZ+.11,4.25,1.12,.22,col.wall,{hard:true,mode:14,gloss:.12,tag:'门'});
      } else box(0,H/2,-RZ+.11,RX*2,H,.22,col.wall,
        {hard:true,mode:14,gloss:.12,tag:'墙',nocut:true});
      blocker(-RX-.2,RX+.2,RZ-.35,RZ+.35,H+.5);
      blocker(-RX-.35,-RX+.35,-RZ,RZ,H+.5);
      blocker(RX-.35,RX+.35,-RZ,RZ,H+.5);
      if(key!=='hotel') blocker(-RX,RX,-RZ-.35,-RZ+.35,H+.5);

      // A quiet perimeter cove and four local pools: a luxury hotel is warm, not uniformly bright.
      for(const z of [-10,0,10]) {
        luminous(box(0,H-.31,z,RX*2-2.0,.035,.055,col.warm,{hard:true,mode:1}),.035,.18);
        const l=light(0,H-.55,z,[1,.82,.58],.40,8.5); l.on=true;
        glow(M.trs(0,.022,z,0,18,1,5.8),col.warm,.045);
      }

      // ---------------------------------------------------------------- vertical core
      const LX=HOTEL_CORE.lift.x, activeZ=HOTEL_CORE.lift.active;
      const landingLeaves=[];
      const floorPlate=(x,y,z,text,size=.14)=>glyphs(x,y,z,-Math.PI/2,text,
        {size,gap:size*.18,color:col.white,mode:1,glow:.035,lift:.010,tag:'电梯'});

      // A limestone/bronze portal contains three passenger cars. The centre car is authored;
      // the other two make a convincing bank and can be activated by later crowd logic.
      //
      // ---- the landing's own character, per floor (H269/H292).
      //
      // Thirteen landings that differed only by a 0.29 m accent disc and the number on the plate
      // are thirteen photographs of one room, and this is the first thing a guest sees on arriving
      // at every level. The bank centreline, the three car centres and the door clearances belong
      // to the lift contract and do not move. Everything a guest actually reads on stepping out —
      // how much of the floor is soft, what the arrival point is made of, how deep the reveal is,
      // how tall the head sits and whether the light is warm or working — is free, and all of it
      // is already implied by what HOTEL_FLOORS says about the floor.
      //
      // So it is derived, not authored thirteen times (H286). `level` gives the band: a working
      // basement, an arrival floor, the public rooms, the sleeping floors, the club end. The floor's
      // first department gives it a material, which is what separates 2 (餐饮) from 3 (宴会) from
      // 4 (水疗) inside one band. `order % 3` gives the landing plane its plan, so two floors in
      // the same band with the same department are not the same photograph either.
      const band = meta.level<0 ? 'work' : meta.level===1 ? 'arrival'
                 : meta.level<=4 ? 'public' : meta.level<=8 ? 'guest' : 'club';
      const dept = (HOTEL_DEPARTMENTS.find(d=>d.floors.includes(key))||{key:''}).key;
      //        w/d   the landing plane          soft 0 none · .5 bound border · 1 all textile
      //        bord  width of the binding       pier/rev  portal proportion
      //        head  depth of the car head      cof  coffer depth, 0 = a batten instead
      const LD = {
        work:   {w:3.72,d:10.60,soft:0, bord:.30,pier:.27,rev:.16,head:.14,cof:0  },
        arrival:{w:3.30,d:12.20,soft:.5,bord:.42,pier:.23,rev:.30,head:.34,cof:.10},
        public: {w:3.18,d:11.40,soft:.5,bord:.26,pier:.19,rev:.24,head:.26,cof:.07},
        guest:  {w:3.48,d:12.70,soft:1, bord:.24,pier:.16,rev:.17,head:.17,cof:.04},
        club:   {w:3.06,d:11.90,soft:.5,bord:.38,pier:.22,rev:.28,head:.40,cof:.12},
      }[band];
      // The floor's secondary material. Shared colours only — `col.accent` is the floor's own and
      // is used as a line, never as a field, so a landing is not "the same room in a new colour".
      const trim = band==='work' ? col.steel
                 : dept==='banqueting' ? col.lacquer
                 : dept==='spa' ? col.celadon
                 : dept==='food-beverage' ? col.walnutL
                 : dept==='front-office' ? col.bronze
                 : col.walnut;
      const LC=LX-2.05;

      // 1 · the plane. The largest thing in the frame, and the one the old landing never varied.
      if(LD.soft===0) {
        // A worked floor is sealed, not laid. Painted safety datums, no textile anywhere.
        flat(LC,.017,-3.70,LD.w,LD.d,col.dark,{mode:7,gloss:.13,tag:'电梯'});
        flat(LC,.021,-3.70,LD.w-LD.bord*2,LD.d-LD.bord*2,col.stone,{mode:7,gloss:.17,tag:'电梯'});
        for(const s of [-1,1]) flat(LC+s*(LD.w/2-LD.bord*.5),.025,-3.70,.09,LD.d-.40,col.accent,
          {gloss:.20,tag:'电梯'});
      } else if(LD.soft===1) {
        // Where people sleep, the whole landing is carpet with a bound edge; only the step off
        // the car is hard, so arriving at your own floor sounds different from arriving anywhere else.
        flat(LC,.017,-3.70,LD.w,LD.d,col.carpet,{mode:7,gloss:.045,tag:'电梯'});
        flat(LC,.021,-3.70,LD.w-LD.bord*2,LD.d-LD.bord*2,col.accent,{mode:7,gloss:.05,tag:'电梯'});
        flat(LC,.024,-3.70,LD.w-LD.bord*2-.13,LD.d-LD.bord*2-.13,col.carpet,
          {mode:7,gloss:.045,tag:'电梯'});
        flat(LX-.73,.028,activeZ,.86,2.90,col.stoneL,{mode:7,gloss:.15,tag:'电梯'});
      } else {
        flat(LC,.017,-3.70,LD.w,LD.d,col.carpet,{mode:7,gloss:.045,tag:'电梯'});
        flat(LC,.021,-3.70,LD.w-LD.bord,LD.d-LD.bord,col.stoneL,{mode:7,gloss:.13,tag:'电梯'});
      }
      // 2 · the rhythm across it, from `order`. Four plans: a band at each end, a datum at every
      // car, a pair of cross bands, or two rails running the length of the landing. Four rather
      // than three because three left 5 and 8 sharing a drawing, and their palettes are two warm
      // browns a metre apart — `.landingtable.js`-style arithmetic, not a guess at what reads.
      {
        const rw=LD.w-(LD.soft===1?LD.bord*2+.13:LD.soft===0?LD.bord*2+.10:LD.bord+.14);
        const plan=meta.order%4;
        if(plan===1) for(const z of HOTEL_CORE.lift.cars)
          flat(LC,.027,z,rw,.065,trim,{gloss:.50,tag:'电梯'});
        else if(plan===2) for(const z of [-9.42,2.02])
          flat(LC,.027,z,rw,.055,col.bronze,{gloss:.62,tag:'电梯'});
        else if(plan===3) for(const s of [-1,1])
          flat(LC+s*(rw/2-.16),.027,-3.70,.06,LD.d-1.10,trim,{gloss:.50,tag:'电梯'});
        else for(const s of [-1,1])
          flat(LC,.027,-3.70+s*(LD.d/2-.58),rw,.075,trim,{gloss:.50,tag:'电梯'});
      }
      // 3 · the arrival point. Not a disc in a different colour on every floor — a different piece
      // of floor: a painted bay where the building works, a stone roundel where it receives, a
      // squared panel in the public rooms, a soft patch where people sleep, bronze at the top.
      if(band==='work') {
        flat(LC,.030,activeZ,2.10,1.34,col.stoneL,{mode:7,gloss:.15,tag:'电梯'});
        for(const s of [-1,1]) flat(LC,.034,activeZ+s*.67,2.10,.07,col.accent,
          {gloss:.22,tag:'电梯'});
      } else if(band==='public') {
        flat(LC,.030,activeZ,1.76,1.76,col.stone,{mode:7,gloss:.20,tag:'电梯'});
        flat(LC,.034,activeZ,1.46,1.46,trim,{mode:7,gloss:.34,tag:'电梯'});
        flat(LC,.038,activeZ,1.14,1.14,col.stoneL,{mode:7,gloss:.22,tag:'电梯'});
        flat(LC,.042,activeZ,.30,.30,col.accent,{gloss:.34,tag:'电梯'});
      } else if(band==='guest') {
        cyl(LC,.030,activeZ,.86,.010,col.accent,{hard:true,mode:7,gloss:.06,tag:'电梯'});
        cyl(LC,.036,activeZ,.76,.010,col.carpet,{hard:true,mode:7,gloss:.05,tag:'电梯'});
      } else {
        const r=band==='club'?1.18:1.02;
        cyl(LC,.030,activeZ,r,.012,col.bronzeD,{hard:true,mode:7,gloss:.58,tag:'电梯'});
        cyl(LC,.037,activeZ,r-.19,.012,band==='club'?col.dark:col.stone,
          {hard:true,mode:7,gloss:.19,tag:'电梯'});
        cyl(LC,.044,activeZ,r*.29,.012,col.accent,{hard:true,mode:7,gloss:.34,tag:'电梯'});
        if(band==='club') cyl(LC,.051,activeZ,r*.15,.012,col.bronzeL,
          {hard:true,mode:7,gloss:.66,tag:'电梯'});
      }
      // 4 · overhead. Coffer depth is the floor's; the working level gets a continuous batten and
      // a cool tube instead, because a plant room is lit rather than composed.
      if(LD.cof) HOTEL_CORE.lift.cars.forEach(z=>{
        for(const s of [-1,1]) {
          box(LC,H-.30-LD.cof*.5,z+s*.92,2.48,.07+LD.cof,.055,col.bronzeD,
            {hard:true,gloss:.58,tag:'电梯'});
          box(LC+s*1.22,H-.30-LD.cof*.5,z,.055,.07+LD.cof,1.78,col.bronzeD,
            {hard:true,gloss:.58,tag:'电梯'});
        }
        luminous(box(LC,H-.31-LD.cof*.4,z,1.54,.025,.42+LD.cof*1.8,col.warm,
          {hard:true,mode:1,tag:'电梯'}),.045,.22);
      });
      else {
        box(LC,H-.23,-3.70,.46,.10,LD.d-.30,col.steel,{hard:true,gloss:.42,tag:'电梯'});
        luminous(box(LC,H-.30,-3.70,.30,.035,LD.d-.60,col.white,
          {hard:true,mode:1,tag:'电梯'}),.075,.34);
      }
      box(LX+.22,1.64,-3.70,.55,3.28,12.4,col.dark,{hard:true,gloss:.22,tag:'电梯'});
      box(LX-.09,3.43,-3.70,.12,.26,12.65,col.bronzeD,{hard:true,gloss:.58,tag:'电梯'});
      // 5 · the piers between the cars, in the floor's own material. These four spans are the
      // "same piers on every floor" the side-by-side sheet caught, and they are the only part of
      // the bank wide enough to carry a material without touching a door clearance.
      for(const [z0,z1] of [[-10.00,-8.48],[-5.92,-4.98],[-2.42,-1.48],[1.08,2.62]]) {
        const zc=(z0+z1)/2, zd=z1-z0-.16;
        box(LX-.13,1.52,zc,.13,3.04,zd,trim,
          {hard:true,mode:trim===col.walnut||trim===col.walnutL?6:trim===col.steel?0:7,
           gloss:band==='work'?.44:.30,tag:'电梯'});
        box(LX-.20,.28+LD.head*.4,zc,.055,.10,zd-.12,col.bronzeD,{hard:true,gloss:.58,tag:'电梯'});
        box(LX-.20,3.04-LD.head*.5,zc,.055,.09,zd-.12,col.bronzeD,{hard:true,gloss:.58,tag:'电梯'});
      }
      HOTEL_CORE.lift.cars.forEach((z,i)=>{
        for(const s of [-1,1]) {
          box(LX-.18,1.57,z+s*1.28,LD.pier,3.14,LD.pier,
            band==='work'?col.steel:band==='club'?col.bronzeD:col.stoneL,
            {hard:true,gloss:band==='club'?.56:.18,tag:'电梯'});
          box(LX-.29,.16,z+s*1.28,.28,.32,.34,col.bronzeD,{hard:true,gloss:.58,tag:'电梯'});
        }
        // The head over each car, at the floor's own depth: 0.14 in the basement and 0.40 at the
        // top is the difference between a doorway and a portal, and it sits behind the number
        // plate at LX-.285 so the plate still reads.
        box(LX-.12,3.24-LD.head*.5,z,.17,LD.head,2.86,band==='work'?col.steel:col.bronzeD,
          {hard:true,gloss:band==='work'?.44:.60,tag:'电梯'});
        box(LX-.10,1.56,z,.10,3.02,2.50,col.bronzeD,{hard:true,gloss:.60,tag:'电梯'});
        box(LX-.17,1.50-LD.rev*.15,z,.055,2.84,2.30+LD.rev*.55,col.glassD,
          {hard:true,gloss:.30,tag:'电梯'});
        for(const s of [-1,1]) {
          const p=box(LX-.22,1.50,z+s*.56,.050,2.76,1.05,col.steel,
            {hard:true,gloss:.72,tag:'电梯'});
          if(i===1) {
            p.ob=null;p.fixed=true;p.cx=LX-.22;p.cy=1.50;p.cz=z+s*.56;p.r=1.80;
            landingLeaves.push({p,s,m0:p.m});
          }
        }
        luminous(box(LX-.25,3.12,z,.04,.25,.74,col.ink,{hard:true,mode:1,tag:'电梯'}),.02,.10);
        floorPlate(LX-.285,3.12,z,meta.display,Math.min(.18,.36/meta.display.length));
        // Direction lanterns, one amber and one celadon, make the inactive cars look operable.
        taper(LX-.29,3.13,z-.36,.06,.11,.06,i===1?col.bronzeL:col.bronzeD,
          {rx:Math.PI/2,mode:1,glow:i===1?.16:.02,tag:'电梯'});
        taper(LX-.29,3.13,z+.36,.06,.11,.06,col.jade,
          {rx:-Math.PI/2,mode:1,glow:.025,tag:'电梯'});
      });
      // The rendered bank is single-sided and `hard:true` does not imply collision.  Seal the
      // two inactive cars, give the centre landing a barrier that follows its real door state,
      // and keep the chase eye out of the complete backing wall during horizontal orbits.
      const bankX0=LX-.45,bankX1=LX+.66;
      solid(bankX0,bankX1,-10.00,activeZ-1.29);
      const landingBarrier=solid(bankX0,bankX1,activeZ-1.29,activeZ+1.29);
      solid(bankX0,bankX1,activeZ+1.29,2.62);
      blocker(bankX0-.08,bankX1+.08,-10.06,2.68,3.62);
      // Wall-mounted lights occupy the two end bays. A backplate, short arm and shade make their
      // support unambiguous while keeping the route and door clearances untouched — and the light
      // itself is the floor's, because a basement corridor and a rooftop landing are not lit by
      // the same fitting. Mounting height rides on `head`, so the whole bank scales together.
      {
        const ly=1.94+LD.head*.72;
        for(const z of [-9.25,1.85]) {
          // Every backplate sits at LX-.22, flush on the front face of the pier panel above, so no
          // fitting on any floor floats off the bank the way the old walnut plate did.
          if(band==='work') {
            // A caged work light on a steel plate: cool, plain, unmistakably back-of-house.
            box(LX-.22,ly,z,.05,.42,.30,col.steel,{hard:true,gloss:.44,tag:'电梯'});
            cyl(LX-.33,ly,z,.10,.13,col.steel,{rz:Math.PI/2,gloss:.50,tag:'电梯'});
            luminous(cyl(LX-.41,ly,z,.085,.035,col.white,
              {rz:Math.PI/2,mode:1,tag:'电梯'}),.10,.36);
          } else if(band==='guest') {
            // Low, soft and close to the wall: nobody wants a floodlit corridor at two in the
            // morning, and this is the only bay the guest passes on the way to bed.
            box(LX-.22,ly,z,.05,.46,.30,col.walnut,{hard:true,mode:6,gloss:.28,tag:'电梯'});
            cyl(LX-.32,ly,z,.030,.18,col.bronzeD,{rz:Math.PI/2,gloss:.58,tag:'电梯'});
            luminous(taper(LX-.42,ly,z,.17,.24,.17,col.warm,
              {rz:Math.PI/2,mode:1,gloss:.20,tag:'电梯'}),.11,.26);
          } else {
            // Public and club: a taller bracket, a deeper shade and a bronze that the head depth
            // above is already setting the scale for.
            const t=.20+LD.head*.22;
            box(LX-.22,ly,z,.055,.50+LD.head*.5,.34,trim,
              {hard:true,mode:trim===col.walnut||trim===col.walnutL?6:0,gloss:.30,tag:'电梯'});
            cyl(LX-.34,ly,z,.035,.24,col.bronzeD,{rz:Math.PI/2,gloss:.60,tag:'电梯'});
            luminous(taper(LX-.48,ly,z,t,.30+LD.head*.30,t,col.warm,
              {rz:Math.PI/2,mode:1,gloss:.24,tag:'电梯'}),.16,.30);
            if(band==='club') box(LX-.48,ly-.34-LD.head*.2,z,.055,.30,.055,col.bronzeL,
              {hard:true,gloss:.66,tag:'电梯'});
          }
        }
      }
      // Visible service car, deliberately plainer and separated from the guest bank.  The old
      // pair of silver leaves read as a loose panel when seen from the public landing.  Give the
      // car a complete limestone portal, a recessed dark reveal and its own bordered landing so
      // every edge has an architectural reason to exist.
      const SZ=HOTEL_CORE.lift.service;
      flat(LX-1.72,.019,SZ,2.70,3.70,col.stoneL,{mode:7,gloss:.13,tag:'服务梯'});
      flat(LX-1.72,.023,SZ,2.34,3.32,col.dark,{mode:7,gloss:.10,tag:'服务梯'});
      // Narrow brass/ink threshold bars visually separate the working lift from the guest bank.
      // They are painted into the floor and deliberately do not create collision geometry.
      for(let i=-3;i<=3;i++) flat(LX-2.54,.027,SZ+i*.28,.34,.12,
        i%2?col.ink:col.bronze,{ry:-.34,gloss:i%2?.18:.56,tag:'服务梯'});
      for(const s of [-1,1]) {
        box(LX-.04,1.62,SZ+s*1.37,.30,3.24,.30,col.stoneL,
          {hard:true,gloss:.18,tag:'服务梯'});
        box(LX-.22,.18,SZ+s*1.37,.18,.36,.42,col.bronzeD,
          {hard:true,gloss:.58,tag:'服务梯'});
      }
      box(LX-.04,3.24,SZ,.30,.30,3.04,col.stoneL,{hard:true,gloss:.18,tag:'服务梯'});
      // Reveal sits behind the silver leaves; placing it on the public side would turn the whole
      // opening back into the dark slab this portal is meant to eliminate.
      box(LX-.025,1.55,SZ,.055,2.94,2.55,col.dark,{hard:true,gloss:.22,tag:'服务梯'});
      box(LX+.16,1.58,SZ,.45,3.16,2.75,col.wallD,{hard:true,gloss:.16,tag:'服务梯'});
      for(const s of [-1,1]) box(LX-.10,1.48,SZ+s*.59,.08,2.78,1.10,col.steel,
        {hard:true,gloss:.55,tag:'服务梯'});
      glyphs(LX-.17,3.22,SZ,-Math.PI/2,'服务梯',{size:.13,gap:.025,color:col.dark,mode:1,lift:.01,tag:'服务梯'});
      // Render shapes do not implicitly collide in Build.scene.  Seal only the portal plane so
      // the 3.3 m-deep landing remains fully walkable and a future service-car interaction can
      // still approach it square-on.
      solid(LX-.28,LX+.40,SZ-1.55,SZ+1.55);
      blocker(LX-.34,LX+.46,SZ-1.62,SZ+1.62,3.48);

      const call=thing('电梯',LX-.28,1.42,activeZ,
        '京华大酒店的客梯通往地下一层和十二个开放楼层。',
        'The Jinghua Grand passenger lifts serve B1 and all twelve above-ground floors.',
        '客梯 is a passenger lift; 服务梯 is the staff and goods lift.',
        {tag:'电梯',focus:[LX-2.05,activeZ],reach:2.4});
      call.hotelFloor=key;
      box(LX-.30,1.34,activeZ-1.48,.08,.58,.28,col.bronzeD,{hard:true,gloss:.62,tag:'电梯'});
      luminous(cyl(LX-.355,1.46,activeZ-1.48,.055,.025,col.bronzeL,
        {rz:Math.PI/2,mode:1,tag:'电梯'}),.08,.25);

      let landingOpen=0,lastTick=0;
      onTick((t,body,clock,dt)=>{
        const bx=body&&Number.isFinite(body.x)?body.x:99;
        const bz=body&&Number.isFinite(body.z)?body.z:99;
        const near=Math.hypot(bx-(LX-2.0),bz-activeZ)<3.0;
        let target=near?1:0;
        if(typeof HotelLift!=='undefined'&&HotelLift.landingOpen)
          target=HotelLift.landingOpen(key,near);
        landingOpen+=(target-landingOpen)*(1-Math.exp(-dt*(target?6.8:4.4)));
        if(Math.abs(target-landingOpen)<.001) landingOpen=target;
        landingBarrier.open=landingOpen>.62;
        for(const q of landingLeaves)
          q.p.m=M.mul(M.trans(0,0,-q.s*.82*landingOpen),q.m0);
      });

      // Enclosed fire stair at the opposite end. It is a real second route, restricted by game.js
      // to the adjacent authored stop so it cannot masquerade as a teleporting floor directory.
      // Its enclosure runs back to the perimeter wall; from an oblique approach the red leaf is
      // therefore seen inside a vestibule instead of as a freestanding board.
      const ST=HOTEL_CORE.stairs;
      for(const s of [-1,1])
        box(-19.90,1.66,ST.z+s*1.64,3.82,3.32,.20,col.wall,
          {hard:true,mode:14,gloss:.12,tag:'楼梯'});
      box(-19.90,3.34,ST.z,3.82,.20,3.48,col.ceiling,
        {hard:true,gloss:.12,tag:'楼梯'});
      flat(-19.90,.020,ST.z,3.82,3.28,col.dark,{mode:7,gloss:.09,tag:'楼梯'});
      for(const s of [-1,1]) {
        box(ST.x,1.60,ST.z+s*1.29,.30,3.20,.52,col.stoneL,
          {hard:true,gloss:.16,tag:'楼梯'});
        box(ST.x+.18,.16,ST.z+s*1.29,.18,.32,.62,col.bronzeD,
          {hard:true,gloss:.58,tag:'楼梯'});
      }
      box(ST.x,3.18,ST.z,.30,.32,3.10,col.stoneL,{hard:true,gloss:.16,tag:'楼梯'});
      box(ST.x-.10,1.56,ST.z,.16,3.12,2.20,col.dark,{hard:true,tag:'楼梯'});
      box(ST.x+.03,1.52,ST.z,.08,2.90,2.02,col.red,{hard:true,gloss:.24,tag:'楼梯'});
      // The whole vestibule is a closed architectural volume.  The stair interaction is focused
      // at x=-16, safely in front of this footprint, so collision prevents clipping without
      // stealing the usable approach.
      solid(-21.94,ST.x+.16,ST.z-1.76,ST.z+1.76);
      blocker(-21.98,ST.x+.20,ST.z-1.80,ST.z+1.80,3.55);
      glyphs(ST.x+.19,1.82,ST.z,Math.PI/2,'安全楼梯',{size:.16,gap:.035,color:col.white,mode:1,lift:.01,tag:'楼梯'});
      glyphs(ST.x+.19,1.37,ST.z,Math.PI/2,'安全出口',{size:.105,gap:.022,color:col.white,mode:1,lift:.01,tag:'楼梯'});
      const stair=thing('楼梯',ST.x+.20,1.50,ST.z,'安全楼梯连接相邻的开放楼层。',
        'The fire stair connects adjacent authored floors.',
        '楼梯 stairs. 安全出口 is an emergency exit.',{tag:'楼梯',focus:ST.landing,reach:2.2});
      stair.hotelFloor=key;

      // Bilingual floor directory and stable workplace route map.  A five-metre-wide loose slab
      // used to dominate the chase camera and its number rows projected into space.  This compact
      // three-column totem has a stone plinth, framed luminous face, finished back and cap; it is
      // narrow enough to orbit while still presenting all thirteen stops at normal player height.
      const DX=13.55,DZ=10.55;
      flat(DX-.02,.020,DZ,1.08,2.34,col.stoneL,{mode:7,gloss:.14,tag:'楼层索引'});
      box(DX,1.47,DZ,.42,2.70,1.92,col.walnut,{hard:true,gloss:.30,tag:'楼层索引'});
      box(DX-.23,1.47,DZ,.055,2.46,1.66,col.warm,
        {hard:true,mode:1,gloss:.10,tag:'楼层索引'});
      luminous(box(DX-.265,1.47,DZ,.030,2.40,1.60,col.warm,
        {hard:true,mode:1,tag:'楼层索引'}),.025,.13);
      box(DX+.23,1.47,DZ,.055,2.46,1.66,col.walnutL,
        {hard:true,mode:6,gloss:.24,tag:'楼层索引'});
      box(DX,2.91,DZ,.70,.18,2.18,col.bronzeD,{hard:true,gloss:.62,tag:'楼层索引'});
      box(DX,.15,DZ,.78,.30,2.12,col.stoneL,{hard:true,gloss:.18,tag:'楼层索引'});
      for(const s of [-1,1]) box(DX,.24,DZ+s*.82,.60,.20,.18,col.bronzeD,
        {hard:true,gloss:.58,tag:'楼层索引'});
      solid(DX-.40,DX+.40,DZ-1.08,DZ+1.08);
      blocker(DX-.44,DX+.44,DZ-1.12,DZ+1.12,3.10);
      glyphs(DX-.30,2.61,DZ,-Math.PI/2,'楼层索引',
        {size:.13,gap:.035,color:col.ink,mode:1,lift:.008,tag:'楼层索引'});
      HOTEL_FLOORS.forEach((f,i)=>{
        // Three columns keep B1 + twelve numbered floors legible without growing the totem into
        // the circulation route. Each column holds at most five rows.
        const row=i%5, column=Math.floor(i/5), z=DZ+(column-1)*.52, y=2.17-row*.34;
        const on=f.key===key;
        box(DX-.30,y,z,.028,.25,.44,on?col.accent:col.stoneL,
          {hard:true,mode:1,tag:'楼层索引'});
        glyphs(DX-.335,y,z,-Math.PI/2,f.display,
          {size:f.display.length>1?.080:.100,gap:.006,color:on?col.white:col.ink,mode:1,lift:.006,tag:'楼层索引'});
      });
      thing('楼层索引',DX-.34,1.47,DZ,`${meta.hz}是${meta.short}，${meta.programme}。`,
        `${meta.display} is ${meta.en}: ${meta.programme}.`,
        '楼层 floor + 索引 index.',{tag:'楼层索引',focus:[12.0,DZ],reach:2.0});

      // ---------------------------------------------------------------- floor 1's identity board
      // A lit walnut sign panel. Only the lobby uses it now; see the note below the definition for
      // why the shell no longer puts one on every level.
      const screen=(x,z,w,h,text,c=col.accent)=>{
        box(x,h/2+.38,z,w,h,.14,col.walnut,{hard:true,gloss:.30,tag:text});
        luminous(box(x,h/2+.40,z-.08,w-.24,h-.24,.035,c,{hard:true,mode:1,tag:text}),.025,.10);
        glyphs(x,h/2+.40,z-.11,0,text,{size:Math.min(.28,(w-.7)/Math.max(1,[...text].length)),gap:.04,
          color:col.white,mode:1,lift:.008,tag:text});
      };
      // The lobby only, and this is a retreat from a position the shell can no longer hold.
      //
      // A 13.2 m lit identity board across the north wall was right while every floor was one
      // open plate: you stepped out of the lift and the room told you where you were. Now that
      // all thirteen levels have an authored plan, that wall is not a back wall any more — it is
      // the far side of somebody's bedroom. Three floor agents reported it independently, none of
      // them talking to each other:
      //
      //   floor 8   it stands inside guest room 808, 0.15 m in front of the curtains, blocking
      //             ~13 m of the room's north window
      //   floor 10  it stands in front of the skyline glazing, so the lounge's centre bay can
      //             never see sky
      //   floor 1   integrated it deliberately — a 1.50 m wainscot whose bronze datum meets its
      //             underside, and three piers cutting it to length at both collision points
      //
      // and unreported but measured: B1 puts engineering and the changing rooms on that wall,
      // floor 2 puts two 包间 there. The shell cannot know where a floor-identity board belongs
      // once the floor has rooms; that is a per-floor decision, and every floor agent has already
      // made it — the guest floors carry their own arrival signs at the lift bank
      // (js/hotel-guests.js:1385, :1503), and the 楼层索引 totem above highlights the current
      // floor on every level, which is the wayfinding that actually works.
      //
      // So it stays where it is confirmed to be architecture rather than an obstruction, and goes
      // everywhere else. Floor 1's wainscot and piers are the reason it survives at all.
      if(key==='hotel') {
        screen(0,RZ-.52,13.2,2.55,meta.short);
        glyphs(0,3.25,RZ-.66,0,`${meta.display}F · ${meta.programme}`,
          {size:.13,gap:.035,color:col.bronzeL,mode:1,lift:.01,tag:'楼层索引'});
      }

      // There used to be a `starter()` here: ~50 lines of blockout furniture per floor, called
      // only by `if(!HotelFit.builders(key).length) starter();`. Every one of the thirteen keys
      // now has at least one registered fit (hotel-public 3, hotel-guests 5, hotel-service 2, and
      // hotel-f6/f7/f9 their own), and each hotel-f*.js registers its architecture as a fit too,
      // so the guard was false on every floor and none of it had run since the last floor landed.
      // Removed rather than left as a fallback: a fallback that cannot fire is not insurance, it
      // is a second, worse plan for every room that nobody is reading. The `screen()` helper above
      // survives because floor 1's identity board still uses it.

      // ---------------------------------------------------------------- lobby portal, both directions
      if(key==='hotel') {
        // Bronze-framed two-stage vestibule. The outer context is geometry: forecourt paving,
        // moving-lane markings, taxi, trees and the office block opposite, never clear colour.
        flat(0,.013,-17.4,9.5,5.3,col.stoneL,{mode:7,gloss:.18,tag:'门'});
        flat(0,.008,-23.2,18.0,6.6,col.dark,{mode:7,gloss:.12,tag:'门'});
        for(const x of [-6,-2,2,6]) flat(x,.016,-23.2,.10,5.8,col.white,{gloss:.25,tag:'门'});
        // The opposite block is close enough to read through the automatic doors, so it is built
        // as architecture rather than a dark slab dotted with luminous squares: recessed bays,
        // stone piers and sills, a cornice, shopfronts and awnings all survive the vestibule view.
        box(0,4.0,-29.0,25.0,8.0,.55,col.wallD,{hard:true,mode:14,gloss:.13,tag:'门'});
        box(0,.42,-28.66,25.2,.84,.16,col.dark,{hard:true,gloss:.22,tag:'门'});
        box(0,7.82,-28.66,25.5,.34,.72,col.bronzeD,{hard:true,gloss:.52,tag:'门'});
        for(let i=-4;i<=4;i++) {
          const x=i*2.5, lit=(i%3===0);
          box(x,3.75,-28.62,2.02,2.22,.12,col.glassD,{hard:true,gloss:.32,tag:'门'});
          box(x,3.78,-28.54,1.72,1.88,.035,lit?col.stoneL:col.glass,
            {hard:true,mode:lit?0:1,alpha:lit?1:.76,gloss:.72,tag:'门'});
          box(x,3.78,-28.48,.055,1.88,.040,col.bronzeD,{hard:true,gloss:.50,tag:'门'});
          box(x,3.78,-28.47,1.72,.055,.040,col.bronzeD,{hard:true,gloss:.50,tag:'门'});
          if(lit) {
            box(x-.48,3.31,-28.43,.42,.32,.030,col.warm,{hard:true,gloss:.18,tag:'门'});
            box(x+.45,3.48,-28.43,.54,.44,.030,col.walnutL,{hard:true,gloss:.18,tag:'门'});
          }
          box(x,2.66,-28.48,2.12,.12,.38,col.stoneL,{hard:true,gloss:.22,tag:'门'});
          box(x-1.16,4.02,-28.47,.12,2.65,.30,col.bronzeD,{hard:true,gloss:.54,tag:'门'});
        }
        // Ground-floor shopfronts and bracketed fabric awnings make the outside legible as a
        // street destination rather than a backdrop.  The central bay remains a real doorway.
        for(const x of [-7.1,-3.6,3.6,7.1]) {
          box(x,1.48,-28.48,2.75,2.46,.12,col.glassD,{hard:true,gloss:.36,tag:'门'});
          box(x,1.52,-28.40,2.46,2.13,.035,col.glass,
            {hard:true,mode:1,alpha:.70,gloss:.78,tag:'门'});
          box(x,1.52,-28.34,.055,2.12,.040,col.bronzeD,{hard:true,gloss:.52,tag:'门'});
          for(const s of [-1,1]) box(x+s*.70,.60,-28.33,.72,.80,.035,
            s<0?col.walnutL:col.celadon,{hard:true,gloss:.24,tag:'门'});
        }
        // The awning colour is assigned separately so the construction above never relies on a
        // magic material value; this also keeps every canopy tied into its bronze brackets.
        for(const x of [-7.1,-3.6,3.6,7.1]) {
          box(x,2.76,-28.25,2.92,.17,.88,col.lacquer,{hard:true,gloss:.28,tag:'门'});
          for(const s of [-1,0,1]) box(x+s*.82,2.765,-27.79,.44,.16,.045,
            s===0?col.white:col.lacquer,{hard:true,gloss:.24,tag:'门'});
          for(const sx of [-1,1]) capsule(x+sx*1.22,2.55,-28.18,.035,.55,.035,col.bronze,
            {rx:Math.PI/2,gloss:.62,tag:'门'});
        }
        box(0,1.44,-28.47,2.15,2.60,.12,col.walnut,{hard:true,gloss:.30,tag:'门'});
        for(const s of [-1,1]) box(s*.52,1.42,-28.38,.92,2.38,.035,col.glass,
          {hard:true,mode:1,alpha:.58,gloss:.70,tag:'门'});
        glyphs(0,3.12,-28.34,0,'街景商店',{size:.18,gap:.04,color:col.bronzeL,mode:1,lift:.008,tag:'门'});

        // Taxi profile across the drop lane.  Overlapping sculpted shoulders, framed windows,
        // pillars, lamps, handles, bumpers, rims and a roof light keep it from reading as two boxes
        // on four discs while preserving the same clear threshold and footprint.
        box(5.2,.40,-22.2,3.86,.34,1.54,col.dark,{gloss:.18,tag:'出租车'});
        box(5.2,.68,-22.2,3.70,.64,1.58,col.lacquer,{gloss:.42,tag:'出租车'});
        ball(6.42,.89,-22.2,.76,.29,.76,col.lacquer,{gloss:.44,tag:'出租车'});
        ball(3.98,.87,-22.2,.62,.25,.74,col.lacquer,{gloss:.44,tag:'出租车'});
        // A rounded glasshouse and painted roof cap establish one continuous sedan silhouette;
        // raked pillars below carve it into front/rear panes rather than a dark roof-box.
        ball(5.03,1.22,-22.2,1.02,.48,.70,col.glassD,{mode:7,gloss:.72,tag:'出租车'});
        box(5.04,1.49,-22.2,1.74,.14,1.31,col.lacquer,{gloss:.48,tag:'出租车'});
        for(const x of [4.62,5.42])
          box(x,1.16,-21.49,.66,.46,.035,col.glass,{hard:true,gloss:.82,tag:'出租车'});
        box(5.03,1.16,-21.47,.10,.58,.045,col.dark,{hard:true,gloss:.20,tag:'出租车'});
        box(5.86,1.15,-21.47,.08,.58,.045,col.dark,{hard:true,rz:-.42,gloss:.24,tag:'出租车'});
        box(4.15,1.15,-21.47,.08,.55,.045,col.dark,{hard:true,rz:.42,gloss:.24,tag:'出租车'});
        box(5.03,1.43,-21.46,1.62,.055,.040,col.dark,{hard:true,gloss:.24,tag:'出租车'});
        box(5.03,.91,-21.455,1.72,.045,.035,col.steel,{hard:true,gloss:.52,tag:'出租车'});
        for(const x of [4.16,5.03,5.88])
          box(x,.82,-21.44,.035,.38,.028,col.dark,{hard:true,gloss:.22,tag:'出租车'});
        for(const x of [4.58,5.47]) box(x,.91,-21.44,.30,.035,.025,col.bronzeL,
          {hard:true,gloss:.62,tag:'出租车'});
        // Pale Beijing taxi belt, inset door badge and stalked mirror are unmistakable at the
        // vestibule distance and all bite into the painted flank.
        box(5.00,.76,-21.435,2.66,.085,.030,col.stoneL,{hard:true,gloss:.35,tag:'出租车'});
        box(5.00,.76,-21.405,.54,.30,.018,col.warm,{hard:true,mode:1,glow:.025,tag:'出租车'});
        glyphs(5.00,.76,-21.38,0,'出租',{size:.075,gap:.014,color:col.dark,mode:1,lift:.004,tag:'出租车'});
        capsule(5.92,1.18,-21.48,.035,.24,.035,col.dark,{rz:Math.PI/2,gloss:.28,tag:'出租车'});
        ball(6.06,1.20,-21.47,.15,.09,.07,col.dark,{mode:7,gloss:.52,tag:'出租车'});
        box(5.05,1.61,-22.2,.52,.18,.28,col.warm,{mode:1,glow:.22,tag:'出租车'});
        for(const x of [3.98,6.42]) for(const z of [-21.43,-22.97]) {
          // Dark wheel house sits behind a tyre/rim/hub stack rather than a grey disc on paint.
          ball(x,.47,z,.40,.34,.08,col.dark,{mode:7,gloss:.12,tag:'出租车'});
          cyl(x,.32,z,.32,.17,col.dark,{rx:Math.PI/2,gloss:.16,tag:'出租车'});
          cyl(x,.32,z+(z>-22?.09:-.09),.19,.025,col.steel,{rx:Math.PI/2,gloss:.48,tag:'出租车'});
          cyl(x,.32,z+(z>-22?.105:-.105),.075,.018,col.bronzeD,{rx:Math.PI/2,gloss:.56,tag:'出租车'});
        }
        box(7.08,.60,-22.2,.13,.28,1.38,col.dark,{hard:true,gloss:.34,tag:'出租车'});
        box(3.32,.60,-22.2,.13,.28,1.38,col.dark,{hard:true,gloss:.34,tag:'出租车'});
        for(const z of [-21.50,-22.90]) {
          luminous(box(7.10,.77,z,.035,.15,.36,col.warm,{hard:true,mode:1,tag:'出租车'}),.04,.30);
          luminous(box(3.30,.77,z,.035,.15,.34,col.red,{hard:true,mode:1,tag:'出租车'}),.04,.26);
        }
        shade(5.2,-22.2,3.95,1.55,.32,.018);

        // Footed planters, branching trunks and a layered crown.  Every mass grows from visible
        // structure; no unsupported ball is left hovering beside the doors.
        for(const s of [-1,1]) {
          const x=s*7.0,z=-18.0;
          box(x,.08,z,.72,.16,.72,col.bronzeD,{hard:true,gloss:.44,tag:'绿化'});
          taper(x,.38,z,.88,.68,.88,col.stone,{gloss:.18,tag:'绿化'});
          box(x,.72,z,.72,.10,.72,col.bronze,{hard:true,gloss:.50,tag:'绿化'});
          capsule(x,1.25,z,.12,1.30,.12,col.bronzeD,{gloss:.32,tag:'绿化'});
          for(const q of [-1,1]) capsule(x+q*.20,1.75,z,.075,.72,.075,col.bronzeD,
            {rz:q*.55,gloss:.30,tag:'绿化'});
          for(const [dx,dy,dz,rx,ry] of [[-.40,1.92,0,.42,.31],[.38,1.98,.05,.45,.34],
            [0,2.22,-.08,.48,.36],[-.10,1.78,.34,.34,.28]])
            ball(x+dx,dy,z+dz,rx,ry,rx*.82,col.green,{mode:15,gloss:.10,tag:'绿化'});
        }

        const leaves=[];
        for(const s of [-1,1]) {
          const p=box(s*.98,1.46,-RZ+.04,1.86,2.78,.045,col.glass,
            {hard:true,mode:1,alpha:.38,gloss:.72,tag:'门'});
          p.ob=null;p.fixed=true;p.cx=s*1.50;p.cy=1.46;p.cz=-RZ+.04;p.r=1.90;
          leaves.push({p,s,m0:p.m});
          box(s*2.05,1.50,-RZ+.02,.10,3.0,.12,col.bronze,{hard:true,gloss:.68,tag:'门'});
        }
        // The structural header remains substantial, but an inset walnut transom and repeated
        // bronze lattice make its inside face intentional instead of a blank white block.
        box(0,3.73,-RZ+.245,3.86,.72,.035,col.walnut,{hard:true,mode:6,gloss:.31,tag:'门'});
        for(const x of [-1.55,-.78,0,.78,1.55])
          box(x,3.73,-RZ+.265,.055,.58,.030,col.bronze,{hard:true,gloss:.64,tag:'门'});
        box(0,3.73,-RZ+.275,3.62,.055,.030,col.bronzeL,{hard:true,gloss:.66,tag:'门'});
        glyphs(0,3.73,-RZ+.30,0,'京华大酒店',{size:.17,gap:.045,color:col.warm,mode:1,glow:.06,lift:.006,tag:'门'});
        box(0,3.04,-RZ+.01,4.32,.14,.18,col.bronzeD,{hard:true,gloss:.62,tag:'门'});
        box(0,.08,-RZ+.01,4.20,.08,.16,col.bronzeD,{hard:true,gloss:.56,tag:'门'});
        box(0,3.19,-RZ-.02,.54,.18,.20,col.dark,{hard:true,gloss:.28,tag:'门'});
        luminous(ball(0,3.18,-RZ-.14,.055,.055,.035,col.celadon,
          {mode:1,tag:'门'}),.08,.24);
        flat(0,.025,-13.70,4.8,2.0,col.dark,{mode:7,gloss:.08,tag:'门'});
        glyphs(0,3.55,-RZ+.005,0,'京华大酒店',{size:.23,gap:.06,color:col.bronzeL,mode:1,glow:.08,lift:.01,tag:'门'});
        const exit=thing('门',0,1.48,-RZ+.05,'自动门外是酒店落客庭院。',
          'The automatic doors open onto the hotel arrival court.',
          '落客 means passenger drop-off. 门斗 is the vestibule.',
          {tag:'门',focus:[0,-12.85],reach:2.25});
        exit.exit={place:'street',at:HOTEL_OUT};
        let open=1;
        onTick((t,body,clock,dt)=>{
          const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
          const near=Math.abs(bx)<3.2&&Math.abs(bz+RZ)<3.6;
          const target=near?1:0;
          open+=(target-open)*(1-Math.exp(-dt*(target?7.0:4.3)));
          // `m0` is the closed, centre-seamed position.  Opening must slide each leaf toward
          // its own jamb; the former expression moved the leaves inward (and even crossed them)
          // as the sensor released, so an "open" doorway was still a wall of glass in the
          // outward camera.  Keep the full travel tied to `open` so the clear opening is real.
          for(const q of leaves) q.p.m=M.mul(M.trans(q.s*1.42*open,0,0),q.m0);
          hotelState.entrance.open=+open.toFixed(3);hotelState.entrance.near=near;
        });
      }

      // Floor agents receive these exact primitives and helpers. `route` never changes across
      // redesigns, which is why later staff task logic can be written before a fit-out is final.
      const hotelState={floor:key,landing:{open:0},entrance:{open:key==='hotel'?1:0,near:false}};
      // A floor fit may register honest camera rooms while it lays out partitions. They affect
      // only chase-camera clipping, never walking or collision — but that holds because every
      // rectangle is clipped to the plate below before it joins `zones`, not because the list is
      // separate from the walkable one. It is not. See the note above `clip`.
      // Nested rooms should be registered before their containing room so the smallest authored
      // volume wins.
      const authoredCameraRooms=[];
      const cameraRoom=(id,x0,x1,z0,z1,near=3.2)=>{
        const q={id,x0,x1,z0,z1,near,ceil:H-.08,light:[(x0+x1)/2,H-.55,(z0+z1)/2]};
        authoredCameraRooms.push(q);return q;
      };
      const A={B,box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,light,thing,
        RX,RZ,H,C:Cc,col,meta,floor:key,levels:HOTEL_FLOORS,departments:HOTEL_DEPARTMENTS,
        route:HOTEL_ROUTES[key],core:HOTEL_CORE,onTick,luminous,state:hotelState,
        // H113. The guestroom fixtures a guest can leave as they found them. A fit-out tick reads
        // it in one line and keeps its own clock rule as the default:
        //   const closed = A.room.on('curtain', h >= 22.4 || h < 6.6);
        //   const on     = A.room.on('lamp',    h >= 18.5 || h < 7.2);
        //   const on     = A.room.on('tv',      (h >= 7 && h < 10) || (h >= 18 && h < 24));
        // Nothing else changes: with no booking, or on a floor the guest is not staying on, `on`
        // returns the clock's own answer and the fixture behaves exactly as it always has.
        room:HotelRoom,
        cameraRoom,cameraRooms:authoredCameraRooms};
      for(const fit of HotelFit.builders(key)) fit(A);

      let last=0,nightK=0;
      function setNight(k){nightK=k*k*(3-2*k);for(const q of lit)q.p.glow=q.day+(q.night-q.day)*nightK;}
      function tick(t,body,clock){const dt=last?Math.min(.20,Math.max(0,t-last)):0;last=t;
        for(const fn of ticks)fn(t,body,clock,dt);
        hotelState.landing={open:+landingOpen.toFixed(3),floor:key};
      }
      const spawn=key==='hotel'
        ? {x:HOTEL_CORE.entrance.inside[0],z:HOTEL_CORE.entrance.inside[1],yaw:0}
        : {x:15.6,z:-3.70,yaw:-Math.PI/2};

      // Guest bedrooms and their wet rooms are much smaller than the public-floor shell.  One
      // floor-sized camera zone made clearWall reason about the perimeter only, so the ordinary
      // 5.5 m chase camera could sit inside a bathroom partition or linen shelf for several
      // seconds during normal play.  Define actual 5F camera rooms, with the smallest nested zone
      // (503's accessible bath) tested first.  These do not alter walking/collision zones; they
      // only provide honest orbit limits and wall bounds to the existing camera solver.
      const baseZone={id:`${key}-floor`,x0:-RX+.30,x1:RX-.30,z0:-RZ+.30,z1:RZ-.30,
        light:[0,H-.55,0]};
      // Camera rooms travel in `zones`, and `zones` is the walkable-region union `clampMove`
      // filters and clamps the body into (js/build.js:471) — so the promise at the top of
      // `cameraRoom` that they never affect walking is a promise about their *extents*, not about
      // the list they live in. Nested inside `baseZone` a camera room is genuinely inert: the
      // clamp takes the nearest of the zones the body already occupies, and the base plate wins
      // for any point inside it. A rectangle straddling ±21.70 / ±14.70 would not be. Standing in
      // the overlap, `here` holds both, the outside one clamps a target beyond the wall to
      // distance zero, and the player walks out of the building through architecture that has no
      // `solid()` behind it.
      //
      // So every authored rectangle is clipped to the plate on the way in. Nobody has shipped one
      // that needed clipping — this closes a latent trap rather than fixing a live bug — and it is
      // done here rather than by keeping camera rooms out of `zones` entirely because `zones` is
      // also how .hotelcheck.js enumerates a floor's rooms (:268, :362). Moving them out silently
      // emptied that list and turned three of its per-room checks into vacuous passes.
      const clip=q=>(q.x0=Math.max(q.x0,baseZone.x0),q.x1=Math.min(q.x1,baseZone.x1),
                     q.z0=Math.max(q.z0,baseZone.z0),q.z1=Math.min(q.z1,baseZone.z1),q);
      const zones=[baseZone,...authoredCameraRooms.map(clip)];
      if(key==='hotel5') {
        const camRoom=(id,x0,x1,z0,z1,near)=>({id,x0,x1,z0,z1,near,ceil:H-.08,
          light:[(x0+x1)/2,H-.55,(z0+z1)/2]});
        // Order matters: a nested bath must win over its surrounding guestroom.
        zones.push(
          camRoom('hotel5-bath503',1.62,5.88,-9.13,-5.35,2.55),
          camRoom('hotel5-room501',-13.82,-6.68,-14.55,-5.05,3.25),
          camRoom('hotel5-room502',-6.22,1.02,-14.55,-5.05,3.25),
          camRoom('hotel5-room503',1.48,10.52,-14.55,-5.05,3.25),
          camRoom('hotel5-linen',-8.35,-.45,8.95,14.55,2.85),
          camRoom('hotel5-service',-13.85,11.55,5.02,14.58,3.35),
          camRoom('hotel5-guest-corridor',-14.10,11.65,-5.18,5.08,4.05),
          camRoom('hotel5-lift-landing',11.45,17.85,-7.05,2.05,3.65)
        );
      }
      const roomAt=(x,z,prev)=>{
        const authored=zones.slice(1);
        // A small hysteresis band prevents a camera pulse while the body is half-way through a
        // doorway.  Nested rooms still win as soon as the player is properly inside them.
        const old=authored.find(q=>q.id===prev);
        const exact=authored.find(q=>x>=q.x0&&x<=q.x1&&z>=q.z0&&z<=q.z1);
        // Fits register a wet room before the guestroom that contains it.  Do not let the
        // containing room's hysteresis mask that more precise camera volume forever.
        const nested=old&&exact&&exact.id!==old.id&&
          exact.x0>=old.x0&&exact.x1<=old.x1&&exact.z0>=old.z0&&exact.z1<=old.z1;
        if(nested)return exact;
        if(old&&x>=old.x0-.10&&x<=old.x1+.10&&z>=old.z0-.10&&z<=old.z1+.10)return old;
        return exact||baseZone;
      };
      const camera=key==='hotel5'
        ? {pitch:.25,dist:3.60,maxDist:4.20,lookY:1.16}
        : key==='hotelB1'
          // The service floor is dense by design.  A 5.5 m public-room orbit crossed multiple
          // workstations in a single turn; this still frames a whole worker while keeping the eye
          // inside the circulation bay whose machinery blockers resolve below.
          ? {pitch:.27,dist:4.25,maxDist:4.60,lookY:1.16}
          : {pitch:.30,dist:5.5,lookY:1.16};
      return B.finish({
        setNight,tick,OUT:HOTEL_OUT,floor:key,meta,hotelState,route:HOTEL_ROUTES[key],
        label:'京华大酒店',labelK:`京华大酒店 · ${meta.display}F ${meta.short}`,
        indoor:true,cutaway:true,winOn:false,near:.06,far:90,expose:1.12,
        aoRadius:.30,aoAmt:.07,bloom:.72,camera,spawn,
        RX,RZ,H,WIN:{x:0,y:2,z:-RZ+.05,hw:2.0,hh:1.45},
        zones,roomAt,
      });
    });
  }

  return {makeFloor,RX,RZ,H,OUT:HOTEL_OUT,FLOORS:HOTEL_FLOORS,DEPARTMENTS:HOTEL_DEPARTMENTS,
          ROUTES:HOTEL_ROUTES,CONTRACT:HOTEL_CORE,NOTICES:HOTEL_NOTICES,
          Fit:HotelFit,Use:HotelUse,Cast:HotelCast,Room:HotelRoom};
})();

const HotelB1 = HotelCore.makeFloor('HotelB1','hotelB1');
const Hotel   = HotelCore.makeFloor('Hotel','hotel');
const Hotel2  = HotelCore.makeFloor('Hotel2','hotel2');
const Hotel3  = HotelCore.makeFloor('Hotel3','hotel3');
const Hotel4  = HotelCore.makeFloor('Hotel4','hotel4');
const Hotel5  = HotelCore.makeFloor('Hotel5','hotel5');
const Hotel6  = HotelCore.makeFloor('Hotel6','hotel6');
const Hotel7  = HotelCore.makeFloor('Hotel7','hotel7');
const Hotel8  = HotelCore.makeFloor('Hotel8','hotel8');
const Hotel9  = HotelCore.makeFloor('Hotel9','hotel9');
const Hotel10 = HotelCore.makeFloor('Hotel10','hotel10');
const Hotel11 = HotelCore.makeFloor('Hotel11','hotel11');
const Hotel12 = HotelCore.makeFloor('Hotel12','hotel12');
