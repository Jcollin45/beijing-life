// ---------------------------------------------------------------- the data tables
// Three tables lifted out of game.js, which was 9,523 lines and is the file every other piece of
// work has to queue behind. Nothing here is logic: no function is defined, no game state is read.
// They are read by game.js and by nothing else, and they are declared with `const` at the top level
// of a classic script, which puts them in the same global lexical scope game.js sees — so moving
// them changed no name and no call site.
//
// Load order is the one dependency. `ZOO_PENS` and `Shop.GOODS` are read while these literals are
// built, so this file goes after every scene file and immediately before game.js in the loader.
//
//   NPCS    the neighbours
//   USE     what each object does when you use it
//   USE_AT  the same word meaning a different thing in a different room

// Where a delivery rider stands: outside your own front door, facing into the flat. Read by the
// courier's entry in `NPCS` below and by the delivery code in game.js.
//
// Moved when the flat became a high-rise apartment. It used to be [2.55, 2.42] — the threshold of
// the old one-room flat, half a step inside a door in that room's +z wall. That doorway no longer
// exists: the front door is now the opening the shell cuts at x 3.40..4.40 in the z = 3.20 wall,
// off the shared corridor. The old spot is about three metres *inside* the flat, in the middle of
// the 走道, so the courier was materialising in your hallway rather than knocking at the door.
//
// 3.65 puts him in the corridor, clear of the leaf's swing arc (the door is hinged on the west
// jamb and opens inward, tip landing at 3.81, 2.295). `answerDoor` already faces him with
// yaw = Math.PI, which is into the flat from here.
const DOOR_AT = [3.90, 3.65];

// ---------------------------------------------------------------- the neighbours
// People who live here rather than props that talk. Each one has somewhere to be at each
// hour, a walk of their own, a temperament out of the table above, and things to say that
// unlock as you keep turning up.
// ------------------------------------------------------------ 高层公寓 the tower's own people
//
// Measured before this block was written: `grep -rn "place: 'home'" js/` found two rows in a
// twelve-storey building — the 外卖员 at your door and the 保安 in the booth. Ten authored
// families were furniture with nobody in them.
//
// Three conventions hold for every row below, and they are the contract:
//
//   `deck`     — which deck the row's `spots` are on, and nothing else. It is the cull key: an
//                NPC whose spots are on deck 4 has no business being drawn on deck 7. The engine
//                does not read it yet (npcAwake in game.js does not consult World.level() for
//                anybody but the courier), so all but one row below is deliberately parked on
//                deck 0 or deck 2 — the two decks that are always live — and 周姐 on deck 4 is
//                the single row that will look wrong until that gate lands.
//   `livesOn`  — which floor the person actually lives on. It is not where they stand. You meet
//                your neighbours in the lobby and the lift, not standing in their own hallways,
//                and this is the field a lift encounter keys on.
//   no `rig`   — every row here is a `look` over the generic body, exactly like the 保安 and the
//                street's 快递员. No new manifest id means no new roster row and no new bundle to
//                resolve, so .rostercheck.js and .castassetcheck.js stay where they were.
//
// And no `lines`. Dialogue is baked, and fifteen new speakers would be fifteen silent characters
// the moment they shipped. The one exception is 李阿姨, whose tree is already written and parked
// in `SOON` at js/talk.js:1527 — talk.js folds it into SCRIPTS the instant a row exists with her
// name, which is what her row below is for.
//
// The building's population curve. Every `hours` window in this block is written against it, so
// the tower is busy when a tower is busy and empty at three in the morning.
const HOME_RUSH = { 早高峰: [7, 9], 晚高峰: [17, 20], 夜深: [0, 6] };
// The stated ceiling on how many of these people may be awake at once. It is a contract, not an
// accident of who happens to be on shift: the windows above are staggered so the real peak is
// five (six with the 外卖员 at your door), and .homecastcheck.js walks all 24 hours of both a
// weekday and a weekend and fails if any hour exceeds this. Figures are the most expensive thing
// in any room and the tower is already GPU-bound, so this number goes up only with a measurement
// behind it. CAP.
const homeCastCAP = 7;
// What that cap costs, budgeted against the *measured* figure rather than the assumed one.
// js/figure.js:1669 records the measurement and why it is not the number people quote: a plain
// procedural figure is 132 draws at lod 0 and 51 at lod 2, but lod 2 is the tier a hall full of
// people is drawn at and a plain figure is not what a hall is full of — the worst roster preset
// measures 70 there and a sample of strangers averages 57. Budgeting the tower against 51 would
// understate a full lobby by about 40%.
//
// So: 57 draws per body at distance, and the cap is what the tower may spend.
//   worst case  7 × 57 = 399 draws
//   real peak   5 × 57 = 285 (6 × 57 = 342 with the 外卖员 at your door)
// The tower is already GPU-bound at p95 27.7 ms over 23,729 props, so this is a ceiling to stay
// under, not an allowance to fill. .homecastcheck.js re-reads the 57 out of js/figure.js's own
// comment and fails if the two drift, so a re-measurement there cannot leave this stale.
const homeCastDRAWS = 57;
const homeCastDRAWBUDGET = homeCastCAP * homeCastDRAWS;   // 399
// The same ceiling, for the rest of the city. Once a resident's day can name another building
// (CITY-LIFE.md 3.2) the tower's cap stops being the only one that can be broken: an itinerary
// that sends nine people to the park at noon costs the park nine bodies, and nothing in js/data.js
// would have said so. `.citycast.js` walks all 24 hours of a weekday and a weekend for every place
// and fails on the first hour a room is over its number.
//
// Each figure is the same 57 draws budgeted above, so a cap is a draw budget written as people:
// the default 10 is 570 draws. `.homecastcheck.js` still owns 'home', so that entry is the same
// number rather than a second copy of it.
//
// **These numbers are NOT derived from a frame measurement, and should not be read as if they
// were.** They are the founding roster's own measured peak per room plus headroom, and the
// headroom is uneven because the peaks are: mall and zoo sit at 22 of 24 (+9%), street 15 of 18
// (+20%), airport 11 of 14 (+27%), diner 9 of 12 (+33%), park 5 of 8 (+60%), and every room on the
// default has a peak of 3 or less. So a cap here says "no more than a little above what this room
// already holds", which is a real bound on a wave-2 itinerary lane and is not a statement about
// what 16.7 ms can afford.
//
// Deriving them properly needs the marginal frame cost of one more body, per room, on the hardware
// path — and that measurement could not be taken: `.fpscheck.js` refused to certify its own run
// with `NOT QUIET — 1-minute load average 23.65 on 8 cores`. Until it is taken, raising one of
// these is a judgement call, not an arithmetic one, and 'home' is the only entry with an owner's
// number behind it.
const cityCastCAP = {
  '*': 10,
  home: homeCastCAP,
  street: 18,        // the hutong: nine districts of stalls, chess players and passers-by
  // The mall counts *authored* presence, which is a ceiling rather than a live crowd: 22 of these
  // rows are ordinary shoppers and js/game.js's own `mallCrowdProfileAt` threshold culls most of
  // them at 03:00 and thins them all day. This number therefore governs what may be written into
  // the building, not what is standing in it — the live crowd is the mall's own budget.
  mall: 24,
  zoo: 24,           // sixteen animals are figures too — the animal rig is skinned like the human
  airport: 14,
  diner: 12,
  park: 8,
  nightmarket: 8,
  bund: 8,
  chengdu: 8,
  campus: 8,
};
const NPCS = [
  // ---- 门卫室, the night half. 刘师傅 below has the day; this is who is behind the glass at 03:00.
  { hz: '保安', name: '老陈', py: 'Lǎo Chén', place: 'home', deck: 0, uniform: '保安',
    hours: [19, 31], temper: 'steady',
    look: { skin:'#b98653', hair:'#3a322c', hairStyle:'crop', top:'#3d4657', pants:'#2b3140',
            shoe:'#23262c', hat:'cap', hatColor:'#2b3140', badge:'#c9a24a',
            tall:0.98, wide:1.09, headScale:1.0, stoop:0.08, youth:-0.55, faceSeed:201 },
    spots: [ { h0:19, h1:31, at:[4.86, -2.15], face:-Math.PI / 2, act:'sit' } ] },

  // ---- the parcel courier. The street already had one (below, at his own kerb); this is the one
  // who comes into the building, and he is here because 社区快递柜 at js/home-lobby.js:910 is a
  // wall of lockers that nothing was ever putting anything into. He works the bank, not the door.
  { hz: '快递员', name: '小郑', py: 'Xiǎo Zhèng', place: 'home', deck: 0,
    hours: [8, 10], temper: 'brisk',
    look: { skin:'#c68a5c', hair:'#211d1b', hairStyle:'buzz', top:'#8f948f', pants:'#2f353d',
            shoe:'#33373c', collar:'polo', sleeve:'long', vest:'#c25a33',
            hat:'hard', hatColor:'#c25a33', badge:'#e4dcc6', bag:'pack', packColor:'#5f3a2e',
            tall:1.00, wide:0.96, headScale:0.99, youth:0.22, faceSeed:202 },
    spots: [ { h0:8, h1:10, at:[-3.40, 5.10], face:0, act:'work' } ],
    lines: [
      ["您好，快递放柜子里了。", "Hello — your parcel is in the locker."],
      ["取件码发您手机上了。", "The collection code has gone to your phone."],
      ["麻烦让一下，我这车挡道了。", "Excuse me — my trolley is in the way."],
      ["二号梯又满了，我等下一趟。", "Number two is full again. I will wait for the next one."],
      ["今天单子多，我先走了。", "Plenty of drops today — I am off."],
    ] },

  // ---- 保洁阿姨. The mop at js/home-lobby.js:1359 says she exists; nobody was holding it. Early,
  // because the stairwell gets done before the building is up.
  { hz: '保洁', name: '王姐', py: 'Wáng jiě', place: 'home', deck: 0,
    hours: [6, 8], temper: 'brisk',
    look: { skin:'#d8ac86', hair:'#4a4038', hairStyle:'bun', top:'#7fa4a0', pants:'#41474f',
            shoe:'#4d5157', sleeve:'short', collar:'polo', bag:'tote', bagColor:'#5a6250',
            tall:0.94, wide:1.05, headScale:0.99, stoop:0.06, youth:-0.30, faceSeed:203 },
    spots: [ { h0:6, h1:8, at:[-5.10, 4.28], face:-Math.PI / 2, act:'work' } ],
    lines: [
      ["地刚拖过，您慢点儿走。", "The floor has just been mopped — mind your step."],
      ["楼道里别堆纸箱子啊。", "Please do not pile cardboard up in the corridor."],
      ["垃圾得分类，厨余单放。", "Rubbish has to be sorted — food waste goes separately."],
      ["我六点就上来了。", "I have been up here since six."],
      ["电梯我一天擦两遍。", "I wipe the lift down twice a day."],
    ] },

  // ---- the benches by the letterboxes. An always-occupied bench and an always-empty one carry
  // the same amount of information, so these two are on the clock: he takes the morning, she
  // takes the afternoon, and between eleven and two the bench is genuinely empty. 长椅 at
  // js/home-lobby.js:1266 is the seat both of them are sitting on.
  //
  // The eleven-to-two gap is now where they *went* rather than a hole in the day: he walks over to
  // the park bench, she joins the 广场舞 in the square, and 李大妈 — who owns both of those park
  // positions the rest of the day — is on 王阿姨's stool in the hutong at the same hour. Three
  // people, one chain of vacated seats, every coordinate an already-authored spot rather than a
  // new guess at a standable one. `place` on a spot is CITY-LIFE.md 3.2; omitted it still means
  // `n.place`, which is why every other row in this file is untouched.
  { hz: '大爷', name: '张大爷', py: 'Zhāng dàye', place: 'home', deck: 0, livesOn: 11,
    hours: [9, 14], temper: 'frail',
    look: { skin:'#c8a184', hair:'#cfccc4', hairStyle:'short', top:'#e6e2d4', pants:'#39414c',
            shoe:'#43474d', sleeve:'short', beard:'goatee', beardColor:'#d6d3cb',
            tall:0.90, wide:0.98, headScale:0.98, stoop:0.19, age:0.92, faceSeed:204 },
    seatY: 0.36,
    spots: [ { h0:9,  h1:11, at:[-3.15, 3.50], face:0, act:'sit' },
             // 李大妈's own 11–17 bench, which she vacates for the hutong at exactly eleven and
             // takes back at two. Her seat, her facing (js/data.js:711) — a proven sit position.
             { h0:11, h1:14, place:'park', at:[-1.20, -6.42], face:0, act:'sit' } ],
    lines: [
      ["吃了吗？这么早出门。", "Have you eaten? Out early today."],
      ["我在这楼住了三十年喽。", "I have lived in this block thirty years."],
      ["坐会儿，晒晒太阳。", "Sit a while. Get some sun."],
      ["十一层，就我一个人在家。", "Eleventh floor. I am the only one home."],
      ["电梯慢，我不着急。", "The lift is slow. I am in no hurry."],
    ] },
  { hz: '大妈', name: '刘大妈', py: 'Liú dàmā', place: 'home', deck: 0, livesOn: 10,
    hours: [11, 17], temper: 'steady',
    look: { skin:'#dcb08b', hair:'#7a7269', hairStyle:'perm', top:'#c8b6a4', pants:'#3b4250',
            shoe:'#4a4f57', sleeve:'short', collar:'polo', vest:'#8a4a4e',
            tall:0.92, wide:1.12, headScale:0.99, stoop:0.13, age:0.80, faceSeed:205 },
    seatY: 0.36,
    spots: [ // 晚上七点楼下跳舞，来啊 is already one of her lines; this is her doing it at noon in
             // the park instead, on 李大妈's own dance mark while 李大妈 is out of the park.
             { h0:11, h1:14, place:'park', at:[-4.6, -3.0], face:Math.PI * 1.02, act:'dance' },
             { h0:14, h1:17, at:[-2.05, 3.50], face:0, act:'sit' } ],
    lines: [
      ["回来啦？今天这么早。", "Back already? Early today."],
      ["我孙子今年上小学了。", "My grandson started primary school this year."],
      ["楼上装修，吵得慌。", "They are doing the place up upstairs. Such a racket."],
      ["菜市场今天黄瓜便宜。", "Cucumbers were cheap at the market today."],
      ["晚上七点楼下跳舞，来啊。", "Dancing downstairs at seven — do come."],
    ] },

  // ---- 广场舞. js/data.js's own USE table maps 音箱 to 跳广场舞, so the player could join a
  // square dance that nobody else was dancing. Two dancers is a square dance at this distance;
  // a real one is forty, and forty figures is the whole frame budget.
  { hz: '舞者', name: '陈阿姨', py: 'Chén āyí', place: 'home', deck: 0, dancer: true, livesOn: 4,
    hours: [19, 21], temper: 'bustling',
    look: { skin:'#dcb08b', hair:'#4d443c', hairStyle:'bob', top:'#c9556a', pants:'#2f3640',
            shoe:'#d8d2c6', sleeve:'short', collar:'polo',
            tall:0.95, wide:1.06, headScale:0.99, age:0.62, faceSeed:206 },
    spots: [ { h0:19, h1:21, at:[-2.20, 4.60], face:Math.PI, act:'work' } ],
    lines: [
      ["来跳一段？不难，跟着走就行。", "Come and dance? It is not hard — just follow along."],
      ["音箱我们调小了，不扰民。", "We have turned the speaker down. No disturbing the neighbours."],
      ["九点准时收，一分不多。", "We stop at nine sharp, not a minute over."],
      ["这支曲子我们跳了半年了。", "We have been dancing this one for half a year."],
      ["我住四层，天天下来。", "I am on the fourth floor. I come down every day."],
    ] },
  { hz: '舞者', name: '周姨', py: 'Zhōu yí', place: 'home', deck: 0, dancer: true, livesOn: 10,
    hours: [19, 21], temper: 'bustling',
    look: { skin:'#d3a57e', hair:'#5a5049', hairStyle:'perm', top:'#c9556a', pants:'#333a44',
            shoe:'#d8d2c6', sleeve:'short', collar:'polo',
            tall:0.93, wide:1.10, headScale:0.98, stoop:0.07, age:0.70, faceSeed:207 },
    spots: [ { h0:19, h1:21, at:[-1.30, 4.60], face:Math.PI, act:'work' } ],
    lines: [
      ["站我旁边，我带你。", "Stand next to me. I will lead you."],
      ["腿抬高一点儿，对了。", "Lift your leg a little higher — that is it."],
      ["天一冷人就少了。", "As soon as it turns cold, fewer people come."],
      ["我十层的，坐电梯下来。", "I am on the tenth. I come down in the lift."],
      ["跳完一身汗，舒服。", "A good sweat afterwards. Wonderful."],
    ] },

  // ---- a child on the ground floor. After school and before dinner, which is the only two hours
  // a child is ever in a lobby.
  { hz: '小孩', name: '壮壮', py: 'Zhuàngzhuang', place: 'home', deck: 0, child: true, livesOn: 5,
    hours: [16, 18], temper: 'bustling',
    look: { skin:'#e3bb96', hair:'#241f1c', hairStyle:'crop', top:'#e8c05a', pants:'#3d5a86',
            shoe:'#c85a4a', sleeve:'short',
            tall:0.62, wide:0.90, headScale:1.16, youth:0.95, faceSeed:208 },
    spots: [ { h0:16, h1:18, at:[-1.20, 3.20], face:Math.PI, act:'wait' } ],
    lines: [
      ["你好！你住几层？", "Hello! Which floor do you live on?"],
      ["作业写完了才能出来玩。", "I can only come out to play once my homework is done."],
      ["我妈说六点前得回家。", "My mum says I have to be home before six."],
      ["电梯按钮我够得着了！", "I can reach the lift buttons now!"],
      ["你会拍球吗？", "Can you bounce a ball?"],
    ] },

  // ---- 维修师傅. The whole point of him is the gap between reporting a fault and somebody
  // turning up, and js/world.js:2472 has been promising 明天 since the flat was built. `repair`
  // is the flag a fault gate reads; until npcAwake consults it he is simply a morning caller,
  // which is at least not a man permanently standing in your corridor.
  { hz: '维修师傅', name: '老赵', py: 'Lǎo Zhào', place: 'home', deck: 2, repair: true,
    hours: [9, 11], temper: 'steady',
    look: { skin:'#b8814f', hair:'#2e2823', hairStyle:'crop', top:'#4a6d8c', pants:'#39404a',
            shoe:'#2f3339', sleeve:'long', collar:'polo', vest:'#31506b',
            bag:'pack', packColor:'#4a4038',
            tall:1.02, wide:1.07, headScale:1.0, youth:-0.25, faceSeed:209 },
    spots: [ { h0:9, h1:11, at:[3.90, 4.10], face:Math.PI, act:'work' } ],
    lines: [
      ["报修的是这家吧？", "This is the flat that reported the fault, yes?"],
      ["水阀我先关了啊。", "I am shutting the water valve off first."],
      ["这管子老了，得换一截。", "This pipe is old. A length of it has to come out."],
      ["配件我车上有，十分钟。", "I have the part in the van. Ten minutes."],
      ["修好了，您试试水。", "That is it fixed. Try the water."],
    ] },

  // ---- 物业. js/home-f4.js:1494 asked for exactly this row and named the shape of it. The two
  // clerks already behind the hatch there are geometry — they do not move, turn or speak — so she
  // stands at the back counter rather than on top of either of them, and the room lane should
  // drop one `clerk()` call at js/home-f4.js:805 when it next opens that file.
  //
  // She is the one row on a deck of her own, and the reason the deck gate above matters.
  { hz: '物业', name: '周姐', py: 'Zhōu jiě', place: 'home', deck: 4,
    hours: [9, 17], days: [1, 2, 3, 4, 5], temper: 'steady',
    look: { skin:'#d9ad87', hair:'#332b26', hairStyle:'ponytail', top:'#d5d8dc', pants:'#39414c',
            shoe:'#3d4148', collar:'shirt', sleeve:'long', vest:'#2f3f5c', badge:'#cbd2da',
            tall:0.96, wide:0.99, headScale:0.99, faceSeed:210 },
    spots: [ { h0:9, h1:17, at:[-2.60, 2.45], face:Math.PI, act:'work' } ],
    lines: [
      ["您好，报修请先登记。", "Hello. To report a fault, please sign the book first."],
      ["门禁卡在这儿补办。", "Replacement door cards are issued here."],
      ["物业费按季度交。", "The service charge is paid quarterly."],
      ["电梯年检下周三，停半天。", "The lift inspection is next Wednesday. Out of service half a day."],
      ["楼上漏水我们已经派人了。", "We have already sent someone about the leak upstairs."],
    ] },

  // ---- one named resident per authored floor. They are met where you would actually meet them —
  // crossing the lobby by the 门禁 — and `livesOn` records the floor their flat is on, which is
  // what a lift encounter has to key off. The hours are the whole trick: F5's young family leaves
  // in the 早高峰, F7's teacher comes back in the 晚高峰, F8's chef is asleep at noon and out of
  // the door mid-afternoon, and F6's student is only ever seen coming in at night, at the weekend.
  { hz: '邻居', name: '老李', py: 'Lǎo Lǐ', place: 'home', deck: 0, livesOn: 3,
    hours: [7, 9], temper: 'frail',
    look: { skin:'#c49b76', hair:'#c4c0b6', hairStyle:'short', top:'#5f6b6e', pants:'#3a4048',
            shoe:'#43474d', sleeve:'long', collar:'polo', bag:'tote', bagColor:'#6b6252',
            tall:0.92, wide:1.02, headScale:0.98, stoop:0.15, age:0.85, faceSeed:211 },
    spots: [ { h0:7, h1:9, at:[1.20, -3.30], face:Math.PI, act:'wait' } ],
    lines: [
      ["早啊，上班去？", "Morning. Off to work?"],
      ["我去买菜，早市便宜。", "I am off for vegetables. The morning market is cheaper."],
      ["三层老李，有事儿吱声。", "Old Li, third floor. Give me a shout if you need anything."],
      ["你李阿姨在家，上来喝茶。", "Auntie Li is in. Come up for tea."],
      ["这电梯早上最挤。", "This lift is at its worst in the morning."],
    ] },
  // 李阿姨 is the other half of 老李's household, and the only row in this block with a voice:
  // js/talk.js:1527 has her whole tree parked in SOON waiting for a row with her name on it.
  { hz: '邻居', name: '李阿姨', py: 'Lǐ āyí', place: 'home', deck: 0, livesOn: 3,
    hours: [17, 19], temper: 'steady',
    look: { skin:'#dcb08b', hair:'#6e665c', hairStyle:'perm', top:'#d9d1bd', pants:'#3b3f4a',
            shoe:'#4a4f57', sleeve:'short', collar:'polo', vest:'#7c6a52',
            bag:'tote', bagColor:'#57604f',
            tall:0.93, wide:1.09, headScale:0.99, stoop:0.10, age:0.78, faceSeed:212 },
    spots: [ { h0:17, h1:19, at:[4.30, 5.30], face:0, act:'wait' } ] },
  { hz: '邻居', name: '小王', py: 'Xiǎo Wáng', place: 'home', deck: 0, livesOn: 5,
    hours: HOME_RUSH.早高峰, days: [1, 2, 3, 4, 5], temper: 'brisk',
    look: { skin:'#cb9a6d', hair:'#221e1c', hairStyle:'short', top:'#8fa2b4', pants:'#333a44',
            shoe:'#2f3339', collar:'shirt', sleeve:'long', bag:'pack', packColor:'#3b424c',
            tall:1.01, wide:0.97, headScale:1.0, youth:0.35, faceSeed:213 },
    spots: [ { h0:7, h1:9, at:[2.00, -3.30], face:Math.PI, act:'wait' } ],
    lines: [
      ["早，赶地铁吗？", "Morning. Running for the metro?"],
      ["我这趟车八点二十的。", "My train is the eight twenty."],
      ["一号梯快，二号老停。", "Number one is quicker. Number two keeps stopping."],
      ["五层，我们两口子。", "Fifth floor. Just the two of us."],
      ["晚上要是吵着你了，说一声。", "If we are noisy at night, do say."],
    ] },
  { hz: '学生', name: '小聂', py: 'Xiǎo Niè', place: 'home', deck: 0, livesOn: 6,
    hours: [22, 24], days: [0, 6], temper: 'brisk',
    look: { skin:'#d5a87f', hair:'#1f1b19', hairStyle:'long', top:'#4f5f7a', pants:'#2f3640',
            shoe:'#d8d2c6', sleeve:'long', bag:'pack', packColor:'#6a4a5c',
            tall:0.97, wide:0.93, headScale:1.01, youth:0.75, faceSeed:214 },
    spots: [ { h0:22, h1:24, at:[1.60, -3.10], face:0, act:'wait' } ],
    lines: [
      ["这么晚还没睡啊？", "Still up this late?"],
      ["我刚下自习回来。", "I have just got back from the study room."],
      ["六层，我考研呢。", "Sixth floor. I am revising for the postgraduate exam."],
      ["晚上按电梯轻点儿，声大。", "Press the lift button gently at night. It is loud."],
      ["明天还得早起，我先上去了。", "Early start tomorrow. I will head up."],
    ] },
  { hz: '老师', name: '陈老师', py: 'Chén lǎoshī', place: 'home', deck: 0, livesOn: 7,
    hours: HOME_RUSH.晚高峰, days: [1, 2, 3, 4, 5], temper: 'steady',
    look: { skin:'#dbb08c', hair:'#3a322c', hairStyle:'bob', top:'#cfc4b2', pants:'#3b4250',
            shoe:'#43474d', collar:'shirt', sleeve:'long', bag:'tote', bagColor:'#54606b',
            tall:0.95, wide:0.98, headScale:0.99, age:0.35, faceSeed:215 },
    spots: [ { h0:17, h1:20, at:[0.40, -3.30], face:0, act:'wait' } ],
    lines: [
      ["回来了？今天下班晚。", "You are back? A late finish today."],
      ["我教三年级，一天六节课。", "I teach the third year. Six lessons a day."],
      ["作业本一摞，回家还得批。", "A stack of exercise books, still to mark at home."],
      ["七层，有事儿敲门。", "Seventh floor. Knock if you need anything."],
      ["你普通话说得不错。", "Your Mandarin is not bad at all."],
    ] },
  { hz: '厨师', name: '老孙', py: 'Lǎo Sūn', place: 'home', deck: 0, livesOn: 8,
    hours: [15, 16], temper: 'bustling',
    look: { skin:'#c08a58', hair:'#2a2320', hairStyle:'buzz', top:'#e2ded2', pants:'#39414c',
            shoe:'#2f3339', sleeve:'short', collar:'polo',
            tall:1.00, wide:1.11, headScale:1.0, youth:-0.20, faceSeed:216 },
    spots: [ { h0:15, h1:16, at:[-0.60, -3.30], face:Math.PI, act:'wait' } ],
    lines: [
      ["我去上晚班，后厨五点开火。", "Off to the evening shift. The kitchen fires up at five."],
      ["八层的老孙，做鲁菜的。", "Old Sun, eighth floor. I cook Shandong food."],
      ["中午我睡觉，别按门铃啊。", "I sleep at midday. Please do not ring the bell."],
      ["哪天上来，我给你炒两个菜。", "Come up some day and I will cook you a couple of dishes."],
      ["电梯里那股油烟味儿，是我。", "That smell of cooking in the lift — that is me."],
    ] },
  { hz: '邻居', name: '小穆', py: 'Xiǎo Mù', place: 'home', deck: 0, livesOn: 9,
    hours: [20, 21], days: [0, 5, 6], temper: 'brisk',
    look: { skin:'#e0b791', hair:'#2c2522', hairStyle:'ponytail', top:'#cf8a92', pants:'#39404a',
            shoe:'#d8d2c6', sleeve:'short', collar:'polo',
            tall:0.94, wide:0.96, headScale:1.0, youth:0.55, faceSeed:217 },
    spots: [ { h0:20, h1:21, at:[-1.40, -3.30], face:0, act:'wait' } ],
    lines: [
      ["晚上好，刚跑完步回来。", "Good evening. Just back from a run."],
      ["九层，我周末才在家。", "Ninth floor. I am only home at weekends."],
      ["楼下那家又吵到半夜。", "The flat below was noisy until midnight again."],
      ["你也常坐这趟电梯吧？", "You take this lift a lot too, do you not?"],
      ["垃圾站十点关，赶紧扔。", "The bin store shuts at ten. Go and throw it out."],
    ] },

  {
    hz: '阿姨', name: '王阿姨', py: 'Wáng āyí',
    home: 'wang',
    rig: 'wang_ayi',
    // The knitted gilet over a short-sleeved blouse is the uniform of every woman her age on this
    // street, and it does more to say who she is than her face does at the distance you first see
    // her from — on a stool by the gate, twenty metres up the alley. So the gilet keeps the maroon
    // and the blouse under it goes to oatmeal: terracotta over maroon was two strong warm colours
    // on one small woman, and only one of them can be the thing you recognise. The rest is sixty-
    // five — a home perm grown out to warm grey at the root, and a real bend in the back.
    look: { skin:'#e2b48f', hair:'#736a60', hairStyle:'perm', top:'#d9d1bd', pants:'#3b3f4a',
            shoe:'#4a4f57', sleeve:'short', collar:'polo', vest:'#8a4a4e',
            bag:'tote', bagColor:'#57604f', tall:0.93, wide:1.11, stoop:0.11,
            headScale:0.99, age:0.70, faceSeed:11 },
    temper: 'genial',
    // Out on her stool by the gate most of the day; indoors when it is dark.
    seatY: 0.42,
    spots: [ { h0:6, h1:11, at:[1.9, 1.55], face:-2.2, act:'sit' },
             { h0:11, h1:14, at:[6.2, 1.30], face:-1.6, act:'wait' },
             { h0:14, h1:21, at:[1.9, 1.55], face:-2.2, act:'sit' } ],
    lines: [
      ['你好！你是新来的吧？', "Hello! You're new here, aren't you?"],
      ['你叫什么名字？', "What's your name?"],
      ['吃了吗？', 'Have you eaten?'],
      ['你的中文说得不错。', 'Your Chinese is not bad.'],
      ['今天天气很好，出去走走。', 'Nice weather today — go for a walk.'],
    ],
  },
  {
    hz: '师傅', name: '李师傅', py: 'Lǐ shīfu', rig: 'li_shifu',
    home: 'li',
    // Sleeves turned back to the elbow and a canvas apron: a man who has had his hands inside a
    // bicycle for thirty years and says so. The blue is a jacket now rather than the shirt —
    // 蓝布工作服 over a grey undershirt is the uniform of every man who mends things on a Beijing
    // pavement, and `sleeve:'half'` stops its cuff at the elbow, which is where he keeps it.
    // Thirty years of it puts him at fifty-odd: heavier, a greying buzz, and browner than the
    // men who work indoors.
    look: { skin:'#c9915f', hair:'#4b443d', hairStyle:'buzz', top:'#9a958a', pants:'#2f3742',
            shoe:'#2e3238', sleeve:'half', collar:'shirt', jacket:'#3a5776', apron:'#6a6152',
            beard:'stubble', beardColor:'#5a534a', tall:1.01, wide:1.14, headScale:1.03,
            cap:'#2b3a46', stoop:0.04, age:0.52, faceSeed:23 },
    temper: 'brash',
    spots: [ { h0:7, h1:19, at:[-16.9, -1.15], face:0.4, act:'work', held:'tool' } ],
    lines: [
      ['自行车坏了吗？', 'Is your bike broken?'],
      ['这个不难，五分钟就好。', "That's not hard — five minutes."],
      ['我修车修了三十年了。', "I've been fixing bikes for thirty years."],
      ['外国人也骑自行车吗？', 'Do foreigners ride bikes too?'],
    ],
  },
  {
    hz: '老板', name: '超市老板', py: 'chāoshì lǎobǎn', rig: 'supermarket_owner',
    home: 'shop',
    // A shopkeeper is a man who stands all day and eats behind his own counter: short, broad
    // through the middle, glasses down the nose and a moustache he has had since he opened.
    // The teal tabard is the only colour on him, which is how a small shop dresses its owner.
    look: { skin:'#deb086', hair:'#332e2a', hairStyle:'short', top:'#ddd7c8', pants:'#39414d',
            shoe:'#3a3f46', sleeve:'half', collar:'polo', beard:'moustache', beardColor:'#3a342f',
            tall:0.99, wide:1.15, headScale:1.02, apron:'#4a6f7c', glasses:true,
            age:0.34, faceSeed:5 },
    // He leans in over the counter to see what you have picked up.
    temper: 'watchful',
    spots: [ { h0:7, h1:22, at:[7.0, 0.55], face:-1.9, act:'vend' } ],
    lines: [
      ['你要买什么？', 'What would you like?'],
      ['要袋子吗？', 'Do you want a bag?'],
      ['一共十二块。', "That's twelve kuai altogether."],
      ['明天有新的白菜。', 'Fresh cabbage tomorrow.'],
    ],
  },
  {
    hz: '邻居', name: '小陈', py: 'Xiǎo Chén',
    home: 'chen',
    rig: 'xiaochen',
    // Office clothes on a man who has already been at it all day: a jacket, a collar, and the
    // satchel rather than the student's daypack.
    // Tall and narrow and slightly folded at the shoulders — the shape a man takes after five
    // years at a desk. The cream shoes read as trainers under a suit jacket, so they are dark
    // now, and the jacket has gone from bright navy to the grey-blue that survives a commute.
    look: { skin:'#dda87c', hair:'#1f1b19', hairStyle:'short', top:'#cfccc0', pants:'#39434f',
            shoe:'#43423f', jacket:'#33404f', collar:'shirt', bag:'shoulder',
            bagColor:'#463c33', tall:1.03, wide:0.92, headScale:0.98, stoop:0.06,
            age:0.14, faceSeed:17 },
    temper: 'weary',
    // Walks the length of the alley: out in the morning, home again at night.
    patrol: [[-8.5, 0.9], [4.5, -0.7], [12.5, 1.1], [4.5, -0.7]],
    speed: 1.15,
    lines: [
      ['你也住这个楼？', 'You live in this building too?'],
      ['我去上班，有点儿累。', "I'm off to work — a bit tired."],
      ['晚上一起吃饭吗？', 'Shall we eat together tonight?'],
      ['这个胡同很老，我从小住这儿。', "This hutong is old — I've lived here since I was small."],
    ],
  },
  {
    hz: '小孩', name: '豆豆', py: 'Dòudou',
    home: 'dou',
    rig: 'doudou',
    // Child anatomy, not an adult reduced uniformly: a larger round head, narrower shoulders,
    // smaller hands and shoes, bright clothes and a restless silhouette.
    look: { skin:'#eec39b', hair:'#241f1c', hairStyle:'tousled', top:'#d8a13a', pants:'#54627a',
            shoe:'#d64f3f', sleeve:'short', tall:0.70, wide:0.82, youth:1,
            headScale:1.08, faceSeed:37 },
    temper: 'eager',
    patrol: [[-3.2, -1.3], [-1.0, 1.6], [2.6, -1.5], [-1.0, 1.6]],
    speed: 1.5, hours: [8, 20],
    lines: [
      ['你是外国人吗？', 'Are you a foreigner?'],
      ['你会说中文吗？', 'Can you speak Chinese?'],
      ['你好！再见！', 'Hi! Bye!'],
      ['我们家有一只猫。', 'We have a cat at home.'],
    ],
  },

  // ---- and the rest of the hutong. These have no lines and no label: they are the crowd,
  // and their job is to be busy in the background. They were built out of primitives in
  // street.js until now — stiff, faceless, arms like sausages — and next to a figure off the
  // real rig they were the worst thing on the street.
  { hz: '摊主',
    // Sleeve protectors. There is no `sleeveGuard` field, but `yoke` colours the arms and nothing
    // else — `arm = jacket || yoke || top` — so a grey yoke over a cream shirt with `sleeve:'long'`
    // is a pair of 袖套 pulled to the elbow, which is what everybody behind a vegetable stall in
    // this city is wearing. The gold apron went with it: canvas takes the dirt, gold does not.
    look: { skin:'#c78f5e', hair:'#3c342f', hairStyle:'short', top:'#ded6c4', yoke:'#6b7078',
            pants:'#3d434c', shoe:'#3a3f45', apron:'#7d6a4a', sleeve:'long',
            hat:'sun', hatColor:'#cfc2a4', beard:'stubble', beardColor:'#4a423b',
            tall:0.97, wide:1.09, headScale:1.02, age:0.44, faceSeed:3 },
    hours: [5, 14], temper: 'bustling',
    spots: [ { h0:5, h1:14, at:[-8.9, 3.16], face:Math.PI, act:'vend' } ] },
  { hz: '客人',
    // The woman who does the vegetable run before seven, which is who the morning stall is
    // actually for. Small, wide, a grown-out perm and the string bag she has had for years.
    look: { skin:'#d7ab84', hair:'#7c746a', hairStyle:'perm', top:'#7f8a86', pants:'#333a44',
            shoe:'#4a4e54', sleeve:'short', collar:'polo', bag:'tote', bagColor:'#8e7f60',
            tall:0.91, wide:1.07, headScale:0.99, stoop:0.07, age:0.62, faceSeed:29 },
    // 05:00–10:30, not 05:00–14:00. She waits at the breakfast cart, and the cart trades
    // 05:00–10:30 (STALL_OPEN/STALL_SHUT, js/street.js) — so for three and a half hours she was
    // queueing at a pitch that had been wheeled away.
    hours: [5, 10.5], temper: 'patient',
    spots: [ { h0:5, h1:10.5, at:[-7.7, 1.72], face:0.15, act:'wait' } ] },
  { hz: '大爷',
    // The white singlet and the flat cap. There is no more specific way to say "old man on a
    // stool in a Beijing alley in July" than those two things together — and the third thing is
    // that he is thin. The weight goes in that decade, so he is narrower than the men twenty
    // years younger up the alley, not wider, which is the opposite of what a `wide` above 1
    // was saying about him. The white goatee is the rest of it.
    look: { skin:'#c8a184', hair:'#cfccc4', hairStyle:'short', top:'#e6e2d4', pants:'#39414c',
            shoe:'#43474d', sleeve:'none', hat:'flat', hatColor:'#6b6252',
            beard:'goatee', beardColor:'#d6d3cb',
            tall:0.91, wide:0.97, headScale:0.98, stoop:0.17, age:0.90, faceSeed:53 },
    seatY: 0.36, temper: 'frail',
    spots: [ { h0:6, h1:20, at:[4.6, 2.68], face:Math.PI * 0.92, act:'sit' } ] },
  { hz: '快递员',
    // Twenty-two, lean, and burnt brown from the saddle — the parcel run is eleven hours outdoors.
    // The hi-vis gilet is the one colour on him and the helmet matches it, because the company
    // issues both; everything under it is the grey he owned already.
    //
    // No `jacket` with it, and that is not a style choice. `lk.JACK` draws the torso body mesh
    // after `lk.VEST` does, at the same station, so a jacket buries a gilet completely and all
    // that survives of it is the 12 mm zip capsule — an orange thread down a slate chest. If
    // both are wanted the rig needs the jacket to become a *sleeve* layer when a vest is present;
    // until then, on this figure, the gilet is the garment that matters and the jacket goes.
    look: { skin:'#c68a5c', hair:'#211d1b', hairStyle:'buzz', top:'#8f948f', pants:'#2f353d',
            shoe:'#33373c', collar:'polo', sleeve:'long', vest:'#c25a33',
            hat:'hard', hatColor:'#c25a33', badge:'#e4dcc6', bag:'pack', packColor:'#5f3a2e',
            tall:1.00, wide:0.95, headScale:0.99, faceSeed:13 },
    hours: [8, 19], temper: 'brisk',
    spots: [ { h0:8, h1:19, at:[8.5, 2.30], face:Math.PI * 0.5,
               act:'work', held:null } ] },
  { hz: '棋友一',
    // The two chess players are the same age and not the same old man. This one is the thin,
    // folded, bespectacled one who leans over the board; see 棋友二 for the other kind.
    look: { skin:'#cfa07d', hair:'#bcb8b0', hairStyle:'short', top:'#5c6f68', pants:'#3a4048',
            shoe:'#42464c', sleeve:'short', collar:'polo', glasses:true,
            tall:0.94, wide:0.93, headScale:0.98, stoop:0.15, age:0.78, faceSeed:61 },
    seatY: 0.42, temper: 'patient',
    spots: [ { h0:7, h1:20, at:[-30.05, 0.60], face:Math.PI * 0.5,
               act:'play', held:'chessPiece' } ] },
  { hz: '棋友二',
    // Heavy, upright, bald and moustached — an old man who has kept his weight and sits square
    // to the board rather than over it. Ten years younger than 棋友一 and it shows in the back
    // before it shows in the face. `bald` was the one hairstyle in the rig nobody in the cast
    // was using; `hair` still colours the eyebrows, so it stays set.
    look: { skin:'#c08e60', hair:'#5c554e', hairStyle:'bald', top:'#8a5049', pants:'#333941',
            shoe:'#3d4147', sleeve:'none', beard:'moustache', beardColor:'#6b645c',
            tall:0.98, wide:1.13, headScale:1.03, stoop:0.05, age:0.66, faceSeed:271 },
    seatY: 0.42, temper: 'brash',
    spots: [ { h0:7, h1:20, at:[-27.95, 0.60], face:-Math.PI * 0.5,
               act:'play', held:'chessPiece' } ] },
  { hz: '乘客',
    look: { skin:'#e0ae82', hair:'#1e1a18', hairStyle:'bun', top:'#4a4f6b', pants:'#2f343b',
            shoe:'#cfc9bb', collar:'vneck', bag:'shoulder', bagColor:'#5c4a52',
            tall:0.90, wide:0.94, headScale:1.01, faceSeed:47 },
    hours: [6, 22], temper: 'bored',
    spots: [ { h0:6, h1:22, at:[25.35, -10.4], face:Math.PI * 0.5, act:'wait' } ] },
  { hz: '扫地的',
    // 环卫 is a job people do into their seventies, out in it from six. The wide brim and the
    // sleeve protectors are what a street sweeper wears against the sun rather than against the
    // dirt, and the hi-vis is issued, so it is the one saturated thing in the alley.
    look: { skin:'#b8804f', hair:'#96918a', hairStyle:'short', top:'#5d6a52', yoke:'#4b5348',
            pants:'#3a4048', shoe:'#3f4349', sleeve:'long', vest:'#c9a94e',
            hat:'sun', hatColor:'#cbbf9c',
            tall:0.90, wide:0.96, headScale:0.98, stoop:0.19, age:0.76, faceSeed:109 },
    hours: [6, 18], temper: 'weary',
    // A ROUTE, not a spot. This was `{h0:6, h1:18, at:[13.6, 2.95], act:'sweep'}` — twelve hours
    // sweeping one square metre, which is the single figure on this street nobody could explain.
    // The line is z -0.6, the one run js/street-alley.js measured as clear from x -27.0 to 25.5,
    // and the pace is a sweeper's rather than a pedestrian's.
    hours: [6, 18], speed: 0.52,
    patrol: [[-13.0, -0.58], [21.0, -0.62]] },
  { hz: '行人一',
    look: { skin:'#dfa87c', hair:'#3a332d', hairStyle:'short', top:'#cfc7b4', pants:'#39414d',
            shoe:'#4a4842', jacket:'#4e5647', collar:'shirt',
            tall:1.05, wide:1.06, headScale:1.01, age:0.28, faceSeed:113 },
    // The rebuilt frontage now leaves one continuous south-half line at z=-.85. The old zigzag
    // still grazed three radius-expanded corners at the .55 m adversarial comfort envelope, even
    // though the .45 m release route passed. A straight retraced patrol is both more natural and
    // keeps the complete large-body envelope off every shop and threshold collider.
    patrol: [[-6.0,-.85],[19.50,-.85]], speed: 1.05,
    temper: 'brisk' },
  { hz: '行人二',
    look: { skin:'#eabf95', hair:'#2c2624', hairStyle:'long', top:'#8a6f4e', pants:'#4a5364',
            shoe:'#cfc9bb', sleeve:'short', bag:'tote', bagColor:'#9c8a6a',
            tall:0.92, wide:0.98, headScale:1.0, age:0.20, faceSeed:127 },
    // A clear north-half route, with one natural centreward dog-leg past the supermarket owner.
    // It also starts beyond the metro shell and the breakfast-stall footprint instead of spawning
    // inside either. Mirroring the waypoints makes the loop retrace rather than cut a bad chord.
    patrol: [[-10.55,.70],[5.90,.70],[6.25,-.35],[7.75,-.35],[8.10,.90],[21.30,.90],
             [8.10,.90],[7.75,-.35],[6.25,-.35],[5.90,.70]], speed: 0.88,
    act: 'carry', held: null,              // the tote is already part of her wardrobe rig
    temper: 'steady' },

  // ---- indoors. `place` is what lets anybody stand anywhere other than the hutong; until
  // there were rooms to be in, every neighbour was hard-wired to the street.
  {
    hz: '服务员', name: '小雨', py: 'Xiǎo Yǔ', place: 'diner', rig: 'xiaoyu',
    look: { skin:'#e8bb96', hair:'#2b2522', hairStyle:'ponytail', top:'#b8443a', pants:'#333a44',
            shoe:'#3b4046', apron:'#d9d0bb', sleeve:'short', collar:'polo',
            // Nineteen and off a bus from somewhere else, which is who works a noodle shop pass.
            tall:0.89, wide:0.90, headScale:1.02, youth:0.30, faceSeed:43 },
    temper: 'bustling',
    // Behind the order station at the end of the pass all day, taking orders and calling them
    // through to the kitchen.
    spots: [ { h0:6, h1:22, at:[2.92, 2.48], face:Math.PI * 1.03, act:'vend' } ],
    hours: [6, 22],
    lines: [
      ['几位？', 'How many of you?'],
      ['吃点儿什么？', 'What are you having?'],
      ['牛肉面还是炸酱面？', 'Beef noodles or zhajiang noodles?'],
      ['要不要加个鸡蛋？', 'Do you want an egg with that?'],
      ['一共十八块，扫这儿。', "That's eighteen altogether — scan here."],
      ['马上就好，您先坐。', "It'll be right up. Have a seat."],
    ],
  },
  {
    hz: '厨师', place: 'diner',
    // A white jacket and a white cap in front of a white tiled splashback came out as one
    // blob with a face on it. The jacket has gone cool and the apron is slate, so the three
    // planes of him read apart from the wall and from each other.
    look: { skin:'#cf9668', hair:'#3f3832', hairStyle:'buzz', top:'#dee4e7', pants:'#3a4048',
            shoe:'#33373c', hat:'beanie', hatColor:'#eceadf', apron:'#7f8c95',
            collar:'turtle', beard:'stubble', beardColor:'#4a423b',
            tall:1.00, wide:1.13, headScale:1.03, age:0.46, faceSeed:137 },
    hours: [6, 22], temper: 'brisk', speed:.48, act:'work', held:null,
    patrol:[[.62,2.48],[1.34,2.54],[1.72,2.42],[.90,2.50]] },
  {
    // Somebody eating. A restaurant with staff in it and nobody at the tables reads as one that
    // has just opened; she takes the far stool of the second table over lunch and again in the
    // evening, and her bowl is laid at that place in diner.js. Mute, like the neighbours who
    // are there to make the street look inhabited rather than to be talked to.
    hz: '顾客', place: 'diner',
    dinerGuest:true,
    // She is at a table for the whole of both sittings, which is what makes her the one person
    // in the hutong who can wear a skirt: at a full stride the thigh swings out through the
    // front of it, and she never takes one.
    look: { skin:'#e3b48d', hair:'#2a2320', hairStyle:'bob', top:'#5c7f8c', pants:'#3b4250',
            shoe:'#42474e', sleeve:'short', collar:'vneck', skirt:'#3b4250',
            tall:0.90, wide:0.93, headScale:1.0, faceSeed:149 },
    seatY: 0.47, temper: 'shy',
    spots: [ { h0:11, h1:14, at:[-2.16, 1.32], face:-2.65, act:'eat' },
             { h0:17, h1:20, at:[-2.16, 1.32], face:-2.65, act:'eat' } ] },
  { hz:'顾客二', place:'diner',
    dinerGuest:true,
    look:{ skin:'#d7a47b',hair:'#4a423b',hairStyle:'short',top:'#8c6244',pants:'#343b46',
           shoe:'#4a4741',collar:'shirt',sleeve:'half',glasses:true,
           tall:1.00,wide:1.10,headScale:1.02,age:0.44,faceSeed:151 },
    seatY:.47, temper:'genial', hours:[7,22],
    spots:[{h0:7,h1:10,at:[-2.18,-1.13],face:-2.67,act:'eat'},
           {h0:12,h1:15,at:[-2.18,-1.13],face:-2.67,act:'eat'},
           {h0:18,h1:22,at:[-2.18,-1.13],face:-2.67,act:'eat'}] },
  { hz:'顾客三', place:'diner',
    dinerGuest:true,
    look:{ skin:'#e2b189',hair:'#211d1b',hairStyle:'ponytail',top:'#8a6f7a',pants:'#3f4652',
           shoe:'#ece5d8',sleeve:'short',bag:'tote',bagColor:'#9a8767',
           tall:.89,wide:.91,headScale:1.02,youth:.35,faceSeed:157 },
    seatY:.47, temper:'eager', hours:[10,21],
    spots:[{h0:10,h1:14,at:[-1.68,-2.15],face:-1.24,act:'phone'},
           {h0:17,h1:21,at:[-1.68,-2.15],face:-1.24,act:'eat'}] },
  { hz:'顾客四', place:'diner',
    dinerGuest:true,
    look:{ skin:'#c8a184',hair:'#a8a29a',hairStyle:'short',top:'#5c6f66',pants:'#333a43',
           shoe:'#41464c',collar:'polo',sleeve:'half',glasses:true,
           tall:.93,wide:1.02,headScale:.99,stoop:.09,age:.70,faceSeed:163 },
    seatY:.47, temper:'patient', hours:[6,20],
    // There is no stool anywhere along x=-2.92 at this end of the room — the nearest surface was
    // 65 cm away — so this guest ate three meals a day sitting on air. The free stool at their own
    // table (-2.55, 2.2), turned to face it, the same way 顾客 is turned to face theirs.
    spots:[{h0:6,h1:9,at:[-2.18,2.92],face:-2.67,act:'read'},
           {h0:11,h1:14,at:[-2.18,2.92],face:-2.67,act:'eat'},
           {h0:17,h1:20,at:[-2.18,2.92],face:-2.67,act:'eat'}] },
  { hz:'师傅', name:'王师傅', py:'Wáng shīfu', place:'diner', rig:'diner-shifu-wang-shifu',
    dinerGuest:true,
    look:{ skin:'#c8925f',hair:'#6b635c',hairStyle:'short',top:'#6f6757',pants:'#333943',
           shoe:'#3d4247',collar:'polo',sleeve:'half',beard:'stubble',beardColor:'#7a726a',
           tall:1.00,wide:1.12,headScale:1.02,stoop:.07,age:.64,faceSeed:91 },
    seatY:.47, temper:'genial', hours:[6,21],
    spots:[{h0:6,h1:11,at:[-2.92,-.12],face:.48,act:'eat'},
           {h0:11,h1:14,at:[-2.92,-.12],face:.48,act:'eat'},
           {h0:17,h1:21,at:[-2.92,-.12],face:.48,act:'eat'}],
    lines:[
      ['这家面馆我吃了十几年了。','I have eaten at this noodle shop for more than ten years.'],
      ['老板的牛肉汤每天早上熬。','The owner starts the beef broth every morning.'],
      ['中午十二点以后就没空桌了。','After noon there is not an empty table.'],
      ['辣椒油是他们自己做的。','They make the chilli oil themselves.'],
    ] },
  // Short takeaway visits keep the doorway working between the three meal rushes. These people
  // enter, wait beside the pickup end of the counter, collect a bag and leave again; they are not
  // table scenery and their narrow windows deliberately interleave.
  { hz:'客人', place:'diner', dinerGuest:true, takeaway:true,
    // `bag:'crossbody'` was not a bag: the only kinds figure.js draws are shoulder, tote, delivery
    // and pack, so this one has been walking in and out of the noodle shop empty-handed. It is a
    // shoulder satchel, which is what the name was reaching for.
    look:{ skin:'#ddb086',hair:'#292320',hairStyle:'short',top:'#4f7184',pants:'#343b45',
           shoe:'#3b4148',collar:'shirt',sleeve:'half',bag:'shoulder',bagColor:'#8a6547',
           tall:1.04,wide:.94,headScale:.99,age:.16,faceSeed:167 },
    temper:'brisk', speed:1.08,
    spots:[{h0:7.4,h1:8.1,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:10.3,h1:10.9,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:12.2,h1:12.7,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:13.4,h1:14.1,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:17.2,h1:17.8,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:18.4,h1:19.0,at:[2.78,-.62],face:.25,act:'wait'},
           {h0:20.0,h1:20.6,at:[2.78,-.62],face:.25,act:'wait'}] },
  { hz:'客人', place:'diner', dinerGuest:true, takeaway:true,
    look:{ skin:'#d6a079',hair:'#382d28',hairStyle:'bob',top:'#8e4d45',pants:'#3b414b',
           shoe:'#e4ddd0',sleeve:'short',bag:'tote',bagColor:'#aa8f68',
           tall:.92,wide:1.0,headScale:1.0,age:.24,faceSeed:173 },
    temper:'eager', speed:1.00,
    spots:[{h0:8.6,h1:9.2,at:[1.78,-1.55],face:1.15,act:'wait'},
           {h0:11.2,h1:11.8,at:[1.78,-1.55],face:1.15,act:'wait'},
           {h0:12.8,h1:13.3,at:[1.78,-1.55],face:1.15,act:'wait'},
           {h0:18.0,h1:18.5,at:[1.78,-1.55],face:1.15,act:'wait'},
           {h0:19.2,h1:19.8,at:[1.78,-1.55],face:1.15,act:'wait'}] },
  { hz:'帮厨', place:'diner',
    look:{ skin:'#d9a77e',hair:'#29221f',hairStyle:'bun',top:'#e4e1d7',pants:'#39414b',
           shoe:'#33383d',apron:'#687987',sleeve:'short',hat:'visor',hatColor:'#d9d4c8',
           tall:.88,wide:.96,headScale:1.01,youth:.40,faceSeed:179 },
    hours:[8,21], temper:'bustling', speed:1.05, act:'work', held:null,
    patrol:[[2.05,2.28],[3.35,1.45],[3.35,-.20],[1.55,-1.32],[3.35,-.20],[3.35,1.45]] },
  // ================================================================ out at the ends of the line
  // Each of the four new districts gets one person worth talking to and two or three who are
  // simply there, which is the same ratio the hutong uses. The park's dancers are the reason the
  // 广场舞 pose exists.
  {
    hz: '大妈', name: '李大妈', py: 'Lǐ dàmā', place: 'park', rig: 'li_dama',
    // The 广场舞 women really do wear the one bright thing they own to dance in, so the rose top
    // stays: she is the only person in the park allowed a saturated colour, and it is how you pick
    // her out of a line of six. The perm has gone iron-grey, which is the other half of sixty-five.
    look: { skin:'#dcae86', hair:'#6f665d', hairStyle:'perm', top:'#c0485a', pants:'#39414d',
            shoe:'#e8e2d6', sleeve:'short', collar:'polo', hat:'visor', hatColor:'#e4dcc4',
            tall:0.92, wide:1.11, headScale:0.99, stoop:0.04, age:0.66, faceSeed:79 },
    hours: [6, 21], temper: 'genial',
    spots: [ { h0:6,  h1:11, at:[-4.6, -3.0], face:Math.PI * 1.02, act:'dance' },
             // Eleven to two she is not in the park at all. 王阿姨 leaves her stool by the gate
             // for her own 11–14 errand up the alley (js/data.js:356), so this is that stool, its
             // facing and its measured seat — not a new coordinate anybody has to trust.
             { h0:11, h1:14, place:'street', at:[1.9, 1.55], face:-2.2, act:'sit' },
             { h0:14, h1:17, at:[-1.20, -6.42], face:0, act:'sit' },
             { h0:17, h1:21, at:[-4.6, -3.0], face:Math.PI * 1.02, act:'dance' } ],
    seatY: 0.48,
    lines: [
      ['一起跳啊，不难。', 'Come and dance. It is not hard.'],
      ['我们每天六点就来了。', "We're here at six every morning."],
      ['音箱是我们自己买的。', 'We bought the speaker ourselves.'],
      ['你是刚搬来的吧？', 'You have just moved here, haven\'t you?'],
      ['锻炼身体最重要。', 'Keeping fit matters more than anything.'],
      ['明天还来，别忘了。', 'Come again tomorrow. Do not forget.'],
    ] },
  { hz: '大妈二', place: 'park',
    // The oldest of the three and the one who has stopped dyeing it. White perm, real stoop,
    // and the ochre has come down to a mustard that does not fight 李大妈's rose.
    look: { skin:'#cba078', hair:'#b4afa6', hairStyle:'perm', top:'#a8874e', pants:'#3a4148',
            shoe:'#dfd8ca', sleeve:'short', collar:'polo', hat:'sun', hatColor:'#ded4b8',
            tall:0.89, wide:1.12, headScale:0.98, stoop:0.11, age:0.80, faceSeed:181 },
    hours: [6, 21], temper: 'steady',
    spots: [ { h0:6, h1:11, at:[-5.9, -3.4], face:Math.PI * 1.02, act:'dance' },
             { h0:17, h1:21, at:[-5.9, -3.4], face:Math.PI * 1.02, act:'dance' } ] },
  { hz: '大妈三', place: 'park',
    // The youngest — barely fifty, still black-haired, still in a bob rather than a perm, and
    // the only one of the three who does not need a hat. Age is a spread here, not a category.
    look: { skin:'#e0b48c', hair:'#443c38', hairStyle:'bob', top:'#4f7a68', pants:'#333a44',
            shoe:'#e4ded0', sleeve:'short', collar:'polo',
            tall:0.95, wide:1.04, headScale:1.0, age:0.40, faceSeed:191 },
    hours: [6, 21], temper: 'brash',
    spots: [ { h0:6, h1:11, at:[-3.3, -3.4], face:Math.PI * 1.02, act:'dance' },
             { h0:17, h1:21, at:[-3.3, -3.4], face:Math.PI * 1.02, act:'dance' } ] },
  { hz: '大爷', place: 'park',
    // The other way of being eighty. The 大爷 in the hutong is folded over a stool; this one has
    // done 太极 at six every morning for thirty years and stands nearly straight, so his stoop is
    // a third of the other's at a greater age. The white beard and the loose grey jacket are the
    // rest of the read.
    // No open jacket: `collar:'shirt'` under one puts a bright placket straight down the chest,
    // and next to a white beard the two of them read as a towel round his neck. A single loose
    // grey jacket-as-top, and the beard is then the only white on him.
    look: { skin:'#c9a582', hair:'#d2cec6', hairStyle:'short', top:'#9a948a', pants:'#3b424a',
            shoe:'#42464c', collar:'crew', beard:'full', beardColor:'#d6d3cb',
            tall:0.93, wide:0.94, headScale:0.98, stoop:0.05, age:0.86, faceSeed:193 },
    hours: [5, 12], temper: 'patient',
    spots: [ { h0:5, h1:12, at:[-11.0, 8.0], face:Math.PI * 1.05, act:'taiji' } ] },
  // ================================================================ 夜市 the night market
  // Six stalls and four people, and the ratio is deliberate: half the carts have nobody behind
  // them, because they do not all open at once and a lane where every single stall is manned reads
  // as a stage set. The hours are the whole cast's — everyone here arrives at seven and is gone by
  // two, and before seven the lane is genuinely empty, which is what makes walking in at eight feel
  // like arriving somewhere.
  //
  // 老马 is the one worth talking to. He is behind the grill, he has been in this lane for eleven
  // years, and his six lines are the register the rest of the game cannot teach: short, loud, and
  // entirely about what you are going to eat.
  {
    hz: '摊主', name: '老马', py: 'Lǎo Mǎ', place: 'nightmarket', rig: 'lao_ma_grill',
    // Eleven years over a charcoal grill: dark from it, heavy through the middle, forearms bare
    // to the elbow because that is the only way to work skewers. The dark red apron is his one
    // colour and the flat cap is what he has worn since he got here.
    look: { skin:'#b98550', hair:'#3a332e', hairStyle:'short', top:'#e8e2d2', pants:'#3a4048',
            shoe:'#33383d', sleeve:'short', collar:'shirt', apron:'#8a3428',
            hat:'flat', hatColor:'#3b4048', beard:'stubble', beardColor:'#4a423b',
            tall:1.00, wide:1.13, headScale:1.03, stoop:0.03, age:0.54, faceSeed:41 },
    hours: [19, 26], temper: 'brash',
    // Behind the grill all evening, turning skewers. He does not wander: a man at a grill never
    // leaves it, and the one thing that would break the lane is the cook walking off.
    spots: [ { h0:19, h1:26, at:[-2.10, -8.2], face:0, act:'vend' } ],
    lines: [
      ['来几串？羊肉三块一串。', 'How many? Lamb, three kuai a skewer.'],
      ['辣不辣？', 'Spicy or not?'],
      ['孜然多放点儿，好吃。', 'Plenty of cumin. It is better.'],
      ['我在这条街上十一年了。', "I have been on this lane eleven years."],
      ['七点开，两点收。', 'Open at seven, packed up by two.'],
      ['慢走啊，下次再来。', 'Mind how you go. Come again.'],
    ] },
  { hz: '摊主二', place: 'nightmarket',
    // The 煎饼 woman at the griddle, sleeve protectors and all — batter goes everywhere.
    look: { skin:'#d5a67e', hair:'#4a423c', hairStyle:'bun', top:'#ded6c4', yoke:'#5e6a74',
            pants:'#39414d', shoe:'#e0dacc', sleeve:'long', apron:'#2f4a5c',
            tall:0.90, wide:1.06, headScale:1.0, age:0.50, faceSeed:197 },
    hours: [19, 26], temper: 'steady',
    // The griddle, which needs somebody standing at it for the same reason.
    spots: [ { h0:19, h1:26, at:[-2.10, -2.4], face:0, act:'vend' } ] },
  { hz: '顾客', place: 'nightmarket',
    look: { skin:'#d8ab80', hair:'#2e2825', hairStyle:'short', top:'#4d5a68', pants:'#2f3540',
            shoe:'#33383d', sleeve:'none', beard:'stubble', beardColor:'#3a332e',
            tall:1.04, wide:1.09, headScale:1.02, age:0.30, faceSeed:199 },
    hours: [19, 26], temper: 'genial',
    // Sitting at one of the middle tables with a beer, then up and along to the wok, then back.
    // Two spots is enough to make somebody look like they are having an evening rather than
    // standing on a mark.
    spots: [ { h0:19, h1:22, at:[-0.90, -5.10], face:0, act:'sit' },
             { h0:22, h1:26, at:[1.10, -3.40], face:Math.PI * 1.5, act:'wait' } ],
    seatY: 0.44 },
  { hz: '顾客二', place: 'nightmarket',
    look: { skin:'#d1a67e', hair:'#443b36', hairStyle:'bob', top:'#8f5a68', pants:'#3b424a',
            shoe:'#e6e0d2', sleeve:'short', collar:'vneck',
            tall:0.90, wide:0.92, headScale:1.01, youth:0.30, faceSeed:211 },
    hours: [19, 26], temper: 'shy',
    // (1.10, 9.60) is the middle of the table, so she sat in the food rather than at it. The table
    // has four stools round it; this is one of them, turned to face the table she is eating off.
    spots: [ { h0:19, h1:21, at:[1.00, 0.30], face:Math.PI, act:'wait' },
             { h0:21, h1:26, at:[0.98, 8.81], face:0.15, act:'sit' } ],
    seatY: 0.44 },
  // ================================================================ 动物园 the zoo
  // Seven species, and they are in this list rather than in zoo.js for one reason: everything that
  // makes a neighbour feel present — keeping hours, wandering between two places and standing about
  // in between, turning to look at whoever walks up, fading out at the far LOD — is written once,
  // here, and none of it is about being human. An animal is a neighbour with a different skeleton.
  //
  // `animal` names the species in the `ANIMALS` table and switches both the pose and the draw.
  // `spots` work exactly as they do for people: somewhere to be between two hours. What differs is
  // that the coordinates come out of `ZOO_PENS` instead of being written down, so an animal cannot
  // end up standing in its own enclosure wall when a pen moves.
  ...(() => {
    const P2 = ZOO_PENS;
    // A point inside a pen, given as a fraction of the way across it. Kept well off the walls: an
    // elephant is three metres wide and a spot on the boundary puts half of it through the brick.
    const inPen = (p, u, v) => [p.x0 + (p.x1 - p.x0) * u, p.z0 + (p.z1 - p.z0) * v];
    // A day, as a list of `[startHour, u, v, facing, act]`. This is the whole difference between a
    // zoo and a set of models on a lawn: seven species standing still in seven boxes is a diorama,
    // and the same seven eating, drinking, sleeping, grooming and displaying is somewhere you stop
    // and watch. Every act named here is one `animalAct` knows how to pose.
    //
    // The coordinates are fractions of the pen so they follow it if it moves, and they are chosen
    // against what is actually built in that pen — the wallow, the pool, the browse rack, the rock
    // — so an animal that is drinking is at the water and not in the middle of the grass.
    const day = (p, rows, h1) => rows.map((r, i) => ({
      h0: r[0], h1: i + 1 < rows.length ? rows[i + 1][0] : h1,
      at: inPen(p, r[1], r[2]), face: r[3], act: r[4],
    }));
    return [
      // 熊猫. A panda's day is famously almost all eating — twelve to fourteen hours of it — and
      // the rest is asleep. Both are in the bamboo at the back of the yard, which is where the
      // bamboo actually is.
      { hz: '熊猫', place: 'zoo', animal: 'panda', temper: 'frail', speed: .34, hours: [7, 20],
        spots: day(P2.panda, [
          [7,  .23, .11,  1.20, 'eat'],      // beside the south bamboo, clear of the retreat wall
          [10, .53, .40,  1.90, 'graze'],    // framed in the open east doorway
          [12, .89, .69,  2.40, 'sit'],      // north-east viewing clearing
          [14, .24, .50,  0.90, 'lie'],      // asleep inside the hollow retreat
          [17, .23, .10,  1.20, 'eat'],
        ], 20) },
      { hz: '熊猫二', place: 'zoo', animal: 'panda', temper: 'bored', speed: .30,
        look: { scale: .78 }, hours: [7, 20],
        spots: day(P2.panda, [
          [7,  .78, .62, -1.90, 'graze'],    // beside the east low-bamboo clearing
          [9,  .83, .38,  1.10, 'climb'],    // faces the south frame without standing in its log
          [11, .24, .90,  1.40, 'eat'],
          [15, .34, .62, -2.20, 'lie'],      // a separate sleeping bay inside the retreat
          [18, .78, .62,  1.20, 'eat'],
        ], 20) },
      // 老虎. Big cats sleep sixteen hours a day and do it in the open, which is exactly why the
      // 老虎 action says you saw its back: most of the time that is all there is to see.
      { hz: '老虎', place: 'zoo', animal: 'tiger', temper: 'patient', speed: .52, hours: [6, 22],
        spots: day(P2.tiger, [
          [6,  .30, .32, -2.60, 'graze'],    // nosing about the grass first thing
          [8,  .70, .62,  1.10, 'lie'],
          [13, .26, .70,  2.40, 'lie'],      // moves once, into the shade of the rock
          [17, .60, .28,  0.40, 'sit'],
          [19, .34, .40, -1.60, 'lie'],
        ], 22) },
      // 大象. The wallow is at the east end of the yard and the shelter beside it, so the day runs
      // between the two: drinking, throwing dust about, and standing in the shade.
      { hz: '大象', place: 'zoo', animal: 'elephant', temper: 'steady', speed: .48, hours: [6, 21],
        spots: day(P2.elephant, [
          [6,  .30, .54, -1.40, 'graze'],    // open sand between rubbing outcrop and scrub post
          [9,  .72, .80,  1.30, 'drink'],    // north-east wallow, outside the dry shelter
          [11, .72, .83,  1.90, 'dust'],
          [14, .76, .32,  0.30, 'graze'],    // square under the roof, clear of piers and hanging toy
          [17, .41, .77, -0.80, 'drink'],    // east side of the separate west trough
          [19, .64, .75,  1.10, 'dust'],
        ], 21) },
      { hz: '大象二', place: 'zoo', animal: 'elephant', temper: 'eager', speed: .55,
        look: { scale: .60 }, hours: [6, 21],
        spots: day(P2.elephant, [
          // Follow the adult through the same functional zones with enough lateral separation
          // that the smaller body never merges into a shelter post or the adult barrel.
          [6,  .10, .54, -0.90, 'graze'],
          [9,  .56, .83,  1.60, 'drink'],
          [11, .56, .88,  2.10, 'dust'],
          [14, .48, .42, -1.30, 'graze'],    // west of the shelter, separated from the adult
          [17, .22, .59,  0.00, 'drink'],    // south side of the trough, away from the camera boom
          [19, .32, .58, -0.60, 'graze'],
        ], 21) },
      // 长颈鹿. The browse rack on the feeding deck is at the back of the paddock, and 'browse' is
      // the pose the whole animal exists for — head up, neck vertical, jaw working sideways.
      { hz: '长颈鹿', place: 'zoo', animal: 'giraffe', temper: 'patient', speed: .46, hours: [6, 21],
        // The browse spots are on the *near* side of the feeding deck, at v ≈ .38, not on it. The
        // rack is built on the deck's -z face and the deck itself is a 4 m structure: standing an
        // animal at the deck's own centre puts it inside the posts with the platform through its
        // shoulders, which is what v ≈ .72 did.
        spots: day(P2.giraffe, [
          [6,  .64, .38,  0.10, 'browse'],   // head up at the rack on the deck
          [9,  .28, .44, -1.20, 'graze'],
          [11, .68, .40,  0.20, 'browse'],
          [14, .34, .30, -0.60, 'drink'],    // forelegs splayed, which is the shot to catch
          [16, .60, .36,  0.10, 'browse'],
          [19, .28, .48, -1.60, 'graze'],
        ], 21) },
      { hz: '长颈鹿二', place: 'zoo', animal: 'giraffe', temper: 'shy', speed: .42,
        look: { scale: .82 }, hours: [6, 21],
        spots: day(P2.giraffe, [
          [6,  .30, .34, -1.10, 'graze'],
          [8,  .64, .40,  0.30, 'browse'],   // centred between the two front deck piers
          [12, .177778, .381818, 0.00, 'graze'], // open west bay, clear of acacia, trough and deck
          [15, .72, .36,  0.10, 'browse'],
          [18, .36, .30, -0.80, 'drink'],
        ], 21) },
      // 猴子. The one enclosure where something is always happening. Their spots are on the rock
      // rather than around it, which only works because zoo.js gives the room a `liftAt`: on flat
      // ground these four stand *inside* the pile instead of on top of it.
      { hz: '猴子', place: 'zoo', animal: 'monkey', temper: 'eager', speed: .74, hours: [6, 21],
        spots: day(P2.monkey, [
          [6,  .32, .44, -1.00, 'groom'],
          [8,  .62, .52,  2.00, 'sit'],
          [10, .48, .60,  0.60, 'climb'],
          [12, .36, .50, -1.80, 'groom'],
          [15, .64, .44,  1.50, 'sit'],
          [18, .44, .56, -0.40, 'groom'],
        ], 21) },
      { hz: '猴子二', place: 'zoo', animal: 'monkey', temper: 'brash', speed: .80, hours: [6, 21],
        spots: day(P2.monkey, [
          [6,  .64, .48,  1.40, 'sit'],
          [9,  .38, .60, -2.40, 'climb'],
          [11, .58, .38,  0.80, 'groom'],
          [14, .42, .52, -1.20, 'sit'],
          [17, .66, .58,  2.20, 'climb'],
        ], 21) },
      { hz: '猴子三', place: 'zoo', animal: 'monkey', temper: 'shy', speed: .68,
        look: { scale: .72 }, hours: [7, 20],
        spots: day(P2.monkey, [
          [7,  .48, .72,  0.40, 'groom'],
          [10, .70, .40,  2.60, 'sit'],
          [13, .40, .64, -0.90, 'climb'],
          [16, .56, .46,  1.10, 'groom'],
        ], 20) },
      { hz: '猴子四', place: 'zoo', animal: 'monkey', temper: 'bored', speed: .70,
        look: { scale: .76 }, hours: [7, 20],
        spots: day(P2.monkey, [
          [7,  .40, .62, -2.00, 'sit'],
          [9,  .56, .36,  0.70, 'groom'],
          [12, .68, .56,  1.80, 'climb'],
          [15, .34, .48, -1.40, 'sit'],
          [18, .50, .66,  0.20, 'groom'],
        ], 20) },
      // 企鹅. Half the day in the water and half on the rock, which is the only honest way to
      // build a penguin pool: three of them all standing on the tiles is a shop display.
      { hz: '企鹅', place: 'zoo', animal: 'penguin', temper: 'eager', speed: .30, hours: [6, 22],
        spots: day(P2.penguin, [
          [6,  .30, .36, -1.10, 'preen'],
          [9,  .58, .62,  1.70, 'swim'],     // the pool is the middle and back of the pen
          [12, .78, .24,  2.20, 'preen'],    // first dry tread, not the overlap between steps
          [15, .52, .58,  1.30, 'swim'],
          [18, .32, .30, -0.80, 'preen'],
        ], 22) },
      { hz: '企鹅二', place: 'zoo', animal: 'penguin', temper: 'brash', speed: .32, hours: [6, 22],
        spots: day(P2.penguin, [
          [6,  .62, .58,  1.90, 'swim'],
          [10, .34, .30, -2.30, 'preen'],
          [13, .66, .64,  1.40, 'swim'],
          [16, .76, .32,  2.60, 'preen'],
          [19, .56, .60,  1.10, 'swim'],
        ], 22) },
      { hz: '企鹅三', place: 'zoo', animal: 'penguin', temper: 'shy', speed: .26,
        look: { scale: .84 }, hours: [6, 22],
        spots: day(P2.penguin, [
          [6,  .48, .62,  0.20, 'swim'],
          [11, .52, .30,  2.80, 'preen'],
          [14, .44, .60,  0.60, 'swim'],
          [17, .72, .36,  2.10, 'preen'],    // third tread, spaced from the other two birds
        ], 22) },
      // 孔雀. 开屏 is on its own slow clock in `animalPose` as well, so the bird displays now and
      // then whatever it is doing; these spots are when it does nothing else but.
      { hz: '孔雀', place: 'zoo', animal: 'peacock', temper: 'brash', speed: .38, hours: [6, 21],
        spots: day(P2.aviary, [
          [6,  .32, .36, -1.30, 'graze'],    // pecking about the floor of the cage
          [9,  .60, .58,  1.50, 'display'],
          [12, .40, .64, -0.50, 'preen'],
          [15, .66, .40,  2.10, 'display'],
          [18, .36, .44, -1.70, 'graze'],
        ], 21) },
      { hz: '孔雀二', place: 'zoo', animal: 'peacock', temper: 'shy', speed: .34,
        look: { scale: .88, coat: '#4a6f4c', bib: '#6f9a5e' }, hours: [6, 21],
        spots: day(P2.aviary, [
          [6,  .66, .34,  1.80, 'preen'],
          [10, .36, .60, -2.10, 'graze'],
          [13, .62, .62,  1.20, 'preen'],
          [16, .34, .38, -1.40, 'graze'],
        ], 21) },
    ];
  })(),
  // 饲养员 the keepers. Their schedules are authored as complete service routes: each pen visit
  // approaches a non-public wall square-on, crosses its marked staff gate, performs several
  // different jobs well away from the animal's own timed spots, then comes back out the same way.
  // Human NPCs follow these targets continuously, so the short gate stops matter — without them a
  // keeper would take the diagonal shortcut through a concrete corner and spoil the whole story.
  {
    hz: '饲养员', name: '陈师傅', py: 'Chén shīfu', storyKey: 'zoo:陈师傅',
    storyName: '陈师傅 · 动物园',
    place: 'zoo', rig: 'chen_zookeeper',
    look: { skin:'#c9955f', hair:'#332c28', hairStyle:'bun', top:'#4f6b46', pants:'#3d4a3a',
            shoe:'#4a4038', sleeve:'long', collar:'shirt', cap:'#3f5a3a', hat:'cap',
            // Outdoors all day in a work shirt, and she carries the feed bucket bag from pen to
            // pen — the one thing that separates a keeper from a visitor in green.
            bag:'tote', bagColor:'#6b6252',
            tall:0.93, wide:1.04, headScale:1.0, age:0.36, badge:'#d8c98e', faceSeed:83 },
    hours: [7, 19], temper: 'genial', serviceRoute:true,
    spots: [
      // Panda morning round, through the west service gate at z .70.
      { h0:7.00, h1:7.35, at:[-17.35, .70], face: Math.PI * .5, act:'wait' },
      { h0:7.35, h1:8.45, at:[-14.60, .70], face: Math.PI * .5, act:'feed' },
      { h0:8.45, h1:9.25, at:[-12.50, 2.65], face:-Math.PI * .5, act:'sweep' },
      { h0:9.25, h1:9.75, at:[-14.00, 1.80], face: Math.PI * .5, act:'check' },
      { h0:9.75, h1:10.25,at:[-17.35, .70], face:-Math.PI * .5, act:'wait' },
      // The west and north staff walks lead to the monkey house without crossing another pen.
      { h0:10.25,h1:11.00,at:[-19.00, 8.00], face:0, act:'wait' },
      { h0:11.00,h1:12.25,at:[-12.00,14.40], face:Math.PI, act:'wait' },
      { h0:12.25,h1:13.50,at:[-12.00,12.20], face:Math.PI, act:'feed' },
      { h0:13.50,h1:14.25,at:[-12.00, 8.20], face:0, act:'sweep' },
      { h0:14.25,h1:15.00,at:[-11.90, 9.00], face:Math.PI * .5, act:'check' },
      { h0:15.00,h1:15.50,at:[-12.00,14.40], face:0, act:'wait' },
      { h0:15.50,h1:16.50,at:[-19.00, 8.00], face:Math.PI, act:'wait' },
      { h0:16.50,h1:19.00,at:[-17.35, .70], face:Math.PI * .5, act:'work' },
    ],
    lines: [
      ['熊猫一天要吃十几个小时。', 'A panda eats for a dozen hours a day.'],
      ['别喂它们，喂了会生病。', 'Do not feed them. It makes them ill.'],
      ['老虎下午三点才醒。', 'The tiger does not wake up until three.'],
      ['猴子会抢东西，包拿好。', 'The monkeys grab things. Hold on to your bag.'],
      ['大象认得人，真的。', 'The elephants recognise people. They really do.'],
      ['孔雀开屏是想让你看它。', 'A peacock fans its tail because it wants you to look.'],
    ] },
  // The east-side keeper is deliberately ambient rather than a second conversation target. One
  // named keeper is enough for dialogue; this one is here to make the animal care visible, with a
  // different uniform silhouette and an elephant-to-tiger service round.
  //
  // The name is gone on purpose, and it is a bug fix rather than a trim. `Talk.scriptKeyFor`
  // resolves in the order [scriptKey, place:name, place:hz, name, hz] (js/talk.js:1779), so
  // `name:'李师傅'` matched SCRIPTS['李师傅'] — the bicycle mender on the street, whose row is at
  // the top of this file. This keeper was answering the elephant enclosure with 自行车坏了吗？
  // and 外国人也骑自行车吗？, and a bake run had already recorded him saying both: six clips under
  // 饲养员|李师傅| in audio/voice/manifest.json are the mender's script in the keeper's voice.
  // He also shared the mender's progress record, so mending a bike retired the keeper's questions.
  // Ambient was always the intent for this row, and an unnamed row cannot collide: with no `name`
  // the key search falls through zoo:饲养员 and 饲养员, neither of which is a script, and he goes
  // quiet. The six clips are now orphaned, which is the right state for six wrong readings.
  //
  // `storyKey` is the same escape hatch on the relationship side (js/story.js:95) and 陈师傅 above
  // already uses it. Without it the story ledger would key him on 饲养员 and merge him with the
  // other four keepers, which is the collision again one layer down.
  {
    hz:'饲养员', storyKey:'zoo:李师傅', storyName:'饲养员 · 动物园',
    npcId:'zoo-keeper-li', place:'zoo',
    look:{ skin:'#b98258',hair:'#24201d',hairStyle:'short',top:'#516a4c',pants:'#313e34',
           shoe:'#353a32',sleeve:'long',collar:'polo',vest:'#7b8756',badge:'#e1d29b',
           hat:'cap',hatColor:'#344b38',tall:1.04,wide:1.08,age:.28,faceSeed:451 },
    hours:[8,18], temper:'steady', speed:.76, serviceRoute:true,
    spots:[
      // Elephant care through the east service gate at z 2.60.
      { h0:8.00,h1:8.40, at:[17.35,2.60], face:-Math.PI * .5, act:'wait' },
      { h0:8.40,h1:9.50, at:[14.80,2.60], face:-Math.PI * .5, act:'feed' },
      { h0:9.50,h1:10.50,at:[ 8.00,3.00], face: Math.PI * .5, act:'sweep' },
      { h0:10.50,h1:11.00,at:[14.80,2.60], face:-Math.PI * .5, act:'check' },
      { h0:11.00,h1:11.50,at:[17.35,2.60], face: Math.PI * .5, act:'wait' },
      // Follow the east and north staff walks, then enter the tiger yard at x 8.30.
      { h0:11.50,h1:12.50,at:[19.00,8.00], face:0, act:'wait' },
      { h0:12.50,h1:13.35,at:[ 8.30,14.40],face:Math.PI, act:'wait' },
      { h0:13.35,h1:14.50,at:[ 8.30,12.20],face:Math.PI, act:'feed' },
      { h0:14.50,h1:15.50,at:[ 8.10,10.00],face:Math.PI, act:'sweep' },
      { h0:15.50,h1:16.00,at:[ 8.30,12.20],face:-Math.PI * .5, act:'check' },
      { h0:16.00,h1:16.40,at:[ 8.30,14.40],face:0, act:'wait' },
      { h0:16.40,h1:17.20,at:[19.00,8.00], face:Math.PI, act:'wait' },
      { h0:17.20,h1:18.00,at:[17.35,2.60],face:-Math.PI * .5, act:'work' },
    ],
  },
  // Four visitors are enough to make the zoo inhabited without turning its most expensive room
  // into a crowd scene: only the family walks, while the older visitor and photographer reuse
  // fixed exhibit furniture/bays. Every coordinate below is on the paved network in zoo.js. The
  // paired routes are the same rectangle translated by [.50, .45], wholly inside the two cross
  // paths and their x = -6.5 / x = 4.0 connectors, so neither straight leg can cut through a pen.
  // Their seeds differ by 17: the ordinary patrol dwell uses seed modulo 17, which keeps parent
  // and child leaving each stop together without synchronising their gait, gaze or gestures.
  { hz:'游客', place:'zoo', hours:[9,18], temper:'eager', speed:.66, seed:4201, act:'chat',
    look:{ skin:'#dcae86',hair:'#2b2320',hairStyle:'bun',top:'#b8684f',pants:'#3c4652',
           shoe:'#e8e1d4',sleeve:'short',collar:'vneck',bag:'shoulder',bagColor:'#665446',
           tall:.95,wide:.94,headScale:1.00,age:.25,faceSeed:421 },
    patrol:[[-6.85,-4.35],[3.55,-4.35],[3.55,5.15],[-6.85,5.15]] },
  { hz:'小孩', place:'zoo', hours:[9,18], temper:'eager', speed:.66, seed:4218, act:'browse',
    look:{ skin:'#edbd94',hair:'#29211d',hairStyle:'tousled',top:'#d7a43b',pants:'#4d6d91',
           shoe:'#d95343',sleeve:'short',collar:'crew',hat:'cap',hatColor:'#47745f',
           tall:.69,wide:.80,headScale:1.10,youth:1,faceSeed:439 },
    patrol:[[-6.35,-3.90],[4.05,-3.90],[4.05,5.60],[-6.35,5.60]] },
  // Already seated on the west-path bench rather than standing in its remaining lane. The seat
  // top in zoo.js is .45 m high and this point is one place along the bench, not its centre seam.
  { hz:'游客', place:'zoo', hours:[9,17], temper:'patient', seatY:.45,
    look:{ skin:'#c89b75',hair:'#b9b5ad',hairStyle:'short',top:'#d8d1bf',pants:'#39414b',
           shoe:'#353a40',sleeve:'short',collar:'polo',vest:'#63705d',glasses:true,
           hat:'sun',hatColor:'#cfc4a8',tall:.92,wide:1.02,stoop:.10,age:.72,faceSeed:443 },
    spots:[{h0:9,h1:17,at:[-20.35,2.62],face:Math.PI/2,act:'sit'}] },
  // The tiger rail has a broad viewing bay here: the interpretation board is two metres west and
  // the route remains open behind him. `phoneStand` supplies the intermittent handset and raised-
  // camera pose without adding a bespoke prop or a permanent high-detail animation.
  { hz:'照相的', name:'小杨', py:'Xiǎo Yáng', place:'zoo', hours:[10,17], temper:'watchful',
    look:{ skin:'#bd8559',hair:'#29231f',hairStyle:'short',top:'#d4cebf',pants:'#353d47',
           shoe:'#30353a',sleeve:'short',collar:'polo',vest:'#53624f',hat:'cap',
           hatColor:'#3d454b',bag:'shoulder',bagColor:'#342f2a',tall:1.01,wide:.98,
           headScale:1.01,age:.22,faceSeed:449 },
    spots:[{h0:10,h1:17,at:[7.30,5.85],face:0,act:'phoneStand'}],
    lines:[
      ['别动，老虎抬头了。', 'Hold still — the tiger looked up.'],
      ['光正好，再来一张。', 'The light is good — one more.'],
      ['站到栏杆旁边。', 'Stand by the rail.'],
    ] },
  // Revision-2 expansion animals, three keeper rounds and visitor loops are compiled from the
  // same normalized coordinates as their habitats.  Keeping the generator here avoids a second
  // rectangle table in data.js and makes geometry revisions move the schedules with the scene.
  ...ZooExpansion.npcRows(ZOO_BLUEPRINT),
  {
    hz: '学生', name: '小周', py: 'Xiǎo Zhōu', place: 'campus', rig: 'xiaozhou_student',
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'ponytail', top:'#4a6f9c', pants:'#39414d',
            shoe:'#e8e2d6', collar:'hood', pack:true, packColor:'#344b67',
            tall:0.90, wide:0.90, headScale:1.02, youth:0.35, faceSeed:73 },
    temper: 'eager',
    hours: [7, 22],
    campusStatic: true,
    spots: [ { h0:7, h1:11, at:[-5.0, -7.5], face:Math.PI, act:'wait' },
             { h0:11, h1:13, at:[-24.0, 2.5], face:-Math.PI / 2, act:'wait' },
             { h0:13, h1:17, at:[27.0, 50.0], face:Math.PI / 2, act:'wait' },
             { h0:17, h1:22, at:[3.0, 29.0], face:Math.PI, act:'wait' } ],
    lines: [
      ['你也是来上课的吗？', 'Are you here for a class too?'],
      ['食堂十一点就排队了。', 'The canteen has a queue by eleven.'],
      ['图书馆北边的阅览室最安静。', 'The north reading room in the library is the quietest.'],
      ['我的自行车又找不到了。', 'I have lost my bicycle again.'],
      ['晚上有人在篮球场打球。', 'People play basketball in the evening.'],
      ['回杨柳胡同坐两站，商务区只隔一站。',
        'Willow Lane is two stops back; Business District is only one stop away.'],
      ['下学期我想去上海。', 'Next term I want to go to Shanghai.'],
    ] },
  {
    hz: '老师', name: '陈老师', py: 'Chén lǎoshī', place: 'campus',
    rig: 'campus-teacher-chen-laoshi',
    // Fifty-five, greying, glasses, and the knitted waistcoat over a shirt that is the uniform of
    // a Chinese language teacher whether or not anybody issued it.
    look: { skin:'#d6a87f', hair:'#4e4640', hairStyle:'short', top:'#e2ded2', pants:'#2f3641',
            shoe:'#33373c', collar:'shirt', vest:'#6b6257', glasses:true,
            bag:'shoulder', bagColor:'#4a3f36',
            tall:1.00, wide:0.99, headScale:1.01, stoop:0.06, age:0.50, faceSeed:223 },
    hours: [8, 18], temper: 'patient', campusStatic: true,
    spots: [ { h0:8, h1:12, at:[-3.0, 47.0], face:Math.PI, act:'wait' },
             { h0:12, h1:14, at:[-26.0, 30.0], face:-Math.PI / 2, act:'wait' },
             { h0:14, h1:18, at:[-8.0, 45.0], face:0, act:'wait' } ],
    lines: [
      ['上课不要迟到。', 'Do not be late for class.'],
      ['汉字要天天写。', 'You have to write characters every day.'],
      ['听不懂就问，别客气。', "Ask if you don't understand. Don't be shy."],
      ['这个字念 shū，书。', 'This character is read shū — 书, a book.'],
      ['下课以后来我办公室。', 'Come to my office after class.'],
      ['你的发音进步了。', 'Your pronunciation has come on.'],
    ] },
  {
    // A second student, on a different schedule, so the forecourt has somebody walking through
    // it at most hours rather than one body parked in one spot. Shares the 学生 talk-label and
    // USE with 小周 — same word, different person, the way the neighbours on the street share 街坊.
    hz: '学生', name: '小李', py: 'Xiǎo Lǐ', place: 'campus',
    rig: 'campus-student-xiao-li',
    // The school tracksuit, which is what a student who is here to play basketball is wearing:
    // a red jersey top over the navy trousers half the campus owns. Nineteen, long and narrow.
    look: { skin:'#c99668', hair:'#1d1816', hairStyle:'buzz', top:'#b5503e', pants:'#2b323c',
            shoe:'#e8e2d6', sleeve:'short', yoke:'#2b323c', pack:true, packColor:'#2f3f52',
            tall:1.05, wide:0.91, headScale:0.99, youth:0.40, faceSeed:227 },
    hours: [8, 22], temper: 'brisk', campusStatic: true,
    spots: [ { h0:8,  h1:11, at:[-10.5, 13.2], face:Math.PI,        act:'wait' },
             { h0:11, h1:12, at:[-24.0, 1.0],  face:-Math.PI / 2,   act:'wait' },
             // 'play' is 打麻将 — a seated pose that reaches for the middle of a table. On the
             // sports ground, where there is no table and no stool, it sat him in mid-air for six
             // hours a day. He is here to play basketball, which he does standing up.
             { h0:12, h1:14, at:[36.0, 11.0], face:Math.PI * .15,  act:'wait' },
             { h0:14, h1:18, at:[6.0, 31.0],  face:0,              act:'wait' },
             { h0:18, h1:22, at:[36.0, 13.0], face:Math.PI * .15,  act:'wait' } ],
    lines: [
      ['我赶时间，下节课在二楼。', 'I am in a hurry. Next class is on the second floor.'],
      ['食堂的队太长了，我去买煎饼。', 'The canteen queue is too long. I will get a jianbing.'],
      ['一起打球吗？', 'Want to play basketball?'],
      ['复印一份资料，两毛。', 'A photocopy is twenty fen.'],
    ] },
  {
    hz: '售票员', name: '王师傅', py: 'Wáng shīfu', place: 'rail', rig: 'wang_rail_clerk',
    look: { skin:'#d9ab80', hair:'#5c554e', hairStyle:'bob', top:'#ebe8df', pants:'#2f3641',
            shoe:'#33373c', collar:'shirt', jacket:'#39536e', scarf:'#8b3f4c', glasses:true,
            badge:true, age:0.58, faceSeed:97, tall:0.92, wide:1.06, headScale:0.99,
            stoop:0.05 },
    hours: [6, 22], temper: 'brisk',
    // In front of the windows, not behind them — a 0.6 m wall has no back. So she stands about
    // rather than handing anything over: 'vend' reached into open air and read as a broken arm.
    spots: [ { h0:6, h1:22, at:[-7.60, -.60], face:Math.PI * .5, act:'wait' } ],
    lines: [
      ['去哪儿？身份证。', 'Where to? ID card.'],
      ['今天的票卖完了。', "Today's tickets are sold out."],
      ['明天早上还有两张。', 'There are two left for tomorrow morning.'],
      // 硬座/硬卧 went with the green trains. The Beijing–Shanghai run is high speed and sells
      // 二等座 and 一等座, and the counter's real job now is the people who would rather not
      // buy it on the app.
      ['二等座还是一等座？', 'Second class or first?'],
      ['手机上也能买，不用排队。', 'You can buy it on your phone — no need to queue.'],
      ['下一位。', 'Next.'],
      ['检票口在那边，看屏幕。',
        'The gates are over there. Watch the screen.'],
    ] },
  {
    // A uniformed attendant out on the concourse, complementing the clerk visible behind the
    // service-centre glass. Mute like the moving commuters: the role is carried by silhouette,
    // badge and uniform, while the service window remains the station's single interaction point.
    hz: '站务员', place: 'metro', faceLock: true,
    look: { skin:'#d8a87f', hair:'#27221f', hairStyle:'bun', top:'#e8edf0', pants:'#27364b',
            shoe:'#30343a', collar:'shirt', jacket:'#293e5b', scarf:'#8b3547', badge:true,
            hat:'cap', hatColor:'#243349',
            tall:0.91, wide:0.93, headScale:1.0, age:0.16, faceSeed:101 },
    hours: [5, 23], temper: 'patient',
    spots: [ { h0:5, h1:23, at:[5.08, -2.72], face:Math.PI * .5, act:'wait' } ],
  },
  { hz: '乘客', place: 'rail',
    look: { skin:'#c69265', hair:'#3f382f', hairStyle:'short', top:'#6b6f5a', pants:'#343b45',
            shoe:'#3d4147', sleeve:'short', collar:'polo', beard:'stubble', beardColor:'#4a4238',
            // A satchel and not a daypack: he is on `act:'sit'` all day, and the pack is drawn
            // 20 cm behind the spine, which is where a bench back is.
            bag:'shoulder', bagColor:'#5e4a3a',
            tall:1.01, wide:1.10, headScale:1.02, age:0.42, faceSeed:229 },
    hours: [6, 23], temper: 'bored',
    spots: [ { h0:6, h1:23, at:[-2.88, -3.00], face:0, act:'sit' } ],
    seatY: 0.48 },
  { hz: '乘客二', place: 'rail',
    look: { skin:'#e0ae82', hair:'#1e1a18', hairStyle:'braid', top:'#7f5566', pants:'#2f343b',
            shoe:'#cfc9bb', collar:'turtle', bag:'tote', bagColor:'#8a7c62',
            tall:0.89, wide:0.95, headScale:1.01, age:0.22, faceSeed:233 },
    hours: [6, 23], temper: 'patient',
    spots: [ { h0:6, h1:23, at:[2.88, -.70], face:0, act:'sit' } ],
    seatY: 0.48 },
  {
    hz: '地勤', name: '小许', py: 'Xiǎo Xǔ', place: 'airport', rig: 'xiao_xu',
    // Airline ground staff are the one group here who genuinely wear a uniform, and the rig now
    // has the three pieces that say so: a collar, a waistcoat and the neckerchief. The four of
    // them share it, in the same navy and the same red, so they read as colleagues.
    //
    // The shirt is a cool white and not the cream it was, which is the difference between a
    // uniform and a mannequin. `arm` in figure.js is `jacket || yoke || top`, so with no jacket
    // the sleeves are the shirt — and a warm cream sleeve against warm tan skin has almost no
    // separation in either hue or value. Every one of these people came out with what looked
    // like bare plastic arms hanging out of a waistcoat. Nothing was wrong with the rig; the
    // shirt was the wrong white.
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'bun', top:'#eaf1f5', pants:'#506f91',
            shoe:'#33373c', collar:'shirt', jacket:'#6d91b5', scarf:'#294c71', badge:true,
            tall:0.92, wide:0.92, headScale:1.01, youth:0.25,
            // And a face of her own. `faceOf` hands back the one shared default table when no
            // seed is given, so all eleven people in this terminal were the same face — which is
            // most of why a hall full of staff read as a hall full of dummies.
            faceSeed: 31 },
    hours: [5, 23], temper: 'genial',
    spots: [ { h0:5, h1:23, at:[-9.20, 6.98], face:Math.PI, act:'vend' } ],
    lines: [
      // The ticket is a record against your ID now, not a thing you hand over.
      ['先生，身份证就行。', 'Sir — just your ID card.'],
      ['行李有几件？要托运吗？', 'How many bags? Anything for the hold?'],
      ['靠窗还是靠走廊？', 'Window or aisle?'],
      ['这是您的登机牌，请拿好。', "Here is your boarding card. Don't lose it."],
      ['登机口在安检那边，往里走。', 'Your gate is through security — keep going in.'],
      ['还有四十分钟登机。', 'Boarding in forty minutes.'],
      ['祝您旅途愉快。', 'Have a pleasant journey.'],
    ] },
  {
    // At the mouth of the security channel, on the hall side of it, where the boarding card
    // is looked at. She is the reason the barrier is a barrier and not a doorway.
    hz: '安检员', name: '刘警官', py: 'Liú jǐngguān', place: 'airport', rig: 'liu_security_officer',
    // Security wear their own blue, not the airline's navy-and-red, because they do not work for
    // the airline. A clear pale blue rather than the near-white grey it was: same reasoning as the
    // ground staff's shirt, and worse here, because the grey was within a few percent of the skin.
    look: { skin:'#d3a37c', hair:'#1e1a18', hairStyle:'bun', top:'#9fb4cb', pants:'#2b3138',
            shoe:'#2f3338', collar:'shirt', vest:'#3a4a5c', hat:'cap', hatColor:'#2b3138',
            badge:'#c8b46a',
            // Squared up rather than slight: she stands at a barrier for eighteen hours a day.
            tall:0.95, wide:1.03, headScale:0.99, age:0.26, faceSeed: 74 },
    hours: [5, 23], temper: 'watchful',
    spots: [ { h0:5, h1:23, at:[.70, 2.55], face:-Math.PI * .5, act:'wait' } ],
    lines: [
      ['身份证，看一下镜头。', 'ID card. Look at the camera, please.'],
      ['包放传送带上。', 'Bag on the belt.'],
      ['水不能带，喝了或者倒了。', 'No liquids. Drink it or pour it away.'],
      ['充电宝拿出来。', 'Take the power bank out.'],
      ['手抬起来。', 'Arms up, please.'],
      ['好了，往里走。', 'All right. Straight on in.'],
    ] },
  {
    // At the podium by the airbridge door. Half the day there is nothing for her to do and
    // she stands there anyway, which is what a gate is like.
    hz: '登机员', name: '小赵', py: 'Xiǎo Zhào', place: 'airport',
    rig: 'airport-gate-agent-xiao-zhao',
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'bun', top:'#e9eff6', pants:'#2b3340',
            shoe:'#33373c', collar:'shirt', vest:'#2f4f7a', scarf:'#a83a4a', badge:true,
            tall:0.90, wide:0.96, headScale:1.0, age:0.20, faceSeed: 58 },
    hours: [5, 23], temper: 'patient',
    spots: [ { h0:5, h1:23, at:[18.10, -7.34], face:0, act:'vend' } ],
    lines: [
      ['开始登机了，请排队。', 'We are boarding. Please queue up.'],
      ['先请老人和带小孩的。', 'The elderly and passengers with children first.'],
      ['登机牌给我看一下。', 'Boarding card, please.'],
      ['您的座位在后舱，往里走。', 'Your seat is towards the back — keep going down.'],
      ['最后一次登机广播。', 'This is the final boarding call.'],
      ['慢走，一路平安。', 'Off you go. Safe journey.'],
    ] },
  {
    // The one standing beside the self-service machines, for the passengers whose booking will
    // not scan and the ones who would still rather ask a person.
    hz: '地勤二', place: 'airport',
    look: { skin:'#cf9d74', hair:'#2b2523', hairStyle:'bob', top:'#e9eff6', pants:'#2b3340',
            shoe:'#33373c', collar:'shirt', vest:'#2f4f7a', scarf:'#a8323e', badge:true,
            glasses:true, tall:0.93, wide:1.01, headScale:1.0, age:0.30, faceSeed: 102 },
    hours: [6, 22], temper: 'eager',
    spots: [ { h0:6, h1:22, at:[-9.40, 1.90], face:Math.PI, act:'wait' } ] },
  // The six people waiting. Every one of them has a face of their own now — the whole terminal
  // shared the default one, which is what turns a row of seats into a row of shop dummies — and
  // enough spread of age, hair and eyewear that no two read as the same person twice.
  { hz: '乘客三', place: 'airport',
    look: { skin:'#c99366', hair:'#332b28', hairStyle:'short', top:'#c4c0b2', pants:'#333a44',
            shoe:'#4a4741', jacket:'#4a5f4a', collar:'polo', tall:1.05, wide:1.08,
            headScale:1.02, beard:'stubble', age:0.38, faceSeed: 7 },
    hours: [5, 23], temper: 'weary',
    spots: [ { h0:5, h1:23, at:[-3.10, -3.60], face:0, act:'sit' } ],
    seatY: 0.48 },
  { hz: '乘客四', place: 'airport',
    look: { skin:'#cf9d74', hair:'#1f1b19', hairStyle:'braid', top:'#8a6f3a', pants:'#2f343b',
            shoe:'#cfc9bb', sleeve:'short', collar:'vneck', pack:true,
            tall:0.88, wide:0.91, headScale:1.02, youth:0.30, faceSeed: 44 },
    hours: [5, 23], temper: 'bored',
    // Seat 3 of the run. The middle seat and the one at -6.98 both already have one of the scene's
    // own seated props in them, and this NPC was standing inside the middle one.
    spots: [ { h0:5, h1:23, at:[-8.22, -4.90], face:Math.PI, act:'sit' } ],
    seatY: 0.48 },
  { hz: '乘客五', place: 'airport',
    look: { skin:'#e0ae82', hair:'#3a332d', hairStyle:'short', top:'#5a5f6a', pants:'#2f343b',
            shoe:'#3d4147', collar:'turtle', bag:'shoulder', bagColor:'#3a3630',
            glasses:true, tall:1.02, wide:0.94, headScale:0.99, stoop:0.05,
            age:0.44, faceSeed: 91 },
    hours: [5, 23], temper: 'brash',
    // One seat along, for the same reason as 乘客四 above.
    spots: [ { h0:5, h1:23, at:[-11.48, -3.60], face:0, act:'sit' } ],
    seatY: 0.48 },
  // and three of them airside, who are all four hours early and have run out of things to do
  { hz: '乘客六', place: 'airport',
    look: { skin:'#cba57f', hair:'#cdc8bf', hairStyle:'perm', top:'#7a4a5c', pants:'#343b45',
            shoe:'#cfc9bb', sleeve:'short', collar:'polo', vest:'#5c5a54',
            tall:0.88, wide:1.08, headScale:0.98, stoop:0.13, age:0.80, faceSeed: 63 },
    hours: [5, 23], temper: 'bored',
    spots: [ { h0:5, h1:23, at:[9.40, -4.70], face:Math.PI, act:'sit' } ],
    seatY: 0.48 },
  { hz: '乘客七', place: 'airport',
    look: { skin:'#cf9d74', hair:'#332b28', hairStyle:'tousled', top:'#c8c2b0', pants:'#2f3641',
            shoe:'#33373c', jacket:'#3f5f4a', collar:'hood', pack:true, beard:'goatee',
            tall:1.06, wide:1.03, headScale:1.0, age:0.24, faceSeed: 128 },
    hours: [5, 23], temper: 'weary',
    // He was sitting on nothing. The airside rows are centred on x 5.60, 9.40 and 13.20 with a
    // 0.62 pitch over five seats, so the last seat in the hall is at 14.44 and this spot was
    // 15.76 — 1.3 m past the end of the upholstery, out in the aisle, in a sitting pose. Found by
    // .sitcheck.js, which asks the room what is under each sitter instead of trusting the number.
    spots: [ { h0:5, h1:23, at:[13.82, -3.40], face:0, act:'sit' } ],
    seatY: 0.48 },
  // ---- 外滩. Nobody on this pavement is going anywhere: they are all facing the same way,
  // looking at the same thing, which is what the Bund is.
  {
    hz: '照相的', name: '老周', py: 'Lǎo Zhōu', place: 'bund',
    rig: 'bund-photographer-lao-zhou',
    // Twenty years on one paving slab facing the river: burnt dark down one register, a photo
    // vest with the pockets, and the gear bag that never comes off his shoulder.
    look: { skin:'#b17c4a', hair:'#3a332d', hairStyle:'short', top:'#c9c3b2', pants:'#3a4048',
            shoe:'#33373c', sleeve:'short', collar:'polo', vest:'#4a5a48',
            hat:'visor', hatColor:'#3a4048', beard:'stubble', beardColor:'#4a423a',
            bag:'shoulder', bagColor:'#2f2b26',
            tall:0.99, wide:1.07, headScale:1.02, stoop:0.06, age:0.58, faceSeed:239 },
    hours: [7, 21], temper: 'brash',
    spots: [ { h0:7, h1:21, at:[.90, -1.10], face:Math.PI * .5, act:'wait' } ],
    lines: [
      ['照相吗？把东方明珠照进去。', 'Photograph? I can get the Pearl in behind you.'],
      ['二十块一张，手机发给你。', "Twenty kuai a shot — I'll send it to your phone."],
      ['往左边一点，别挡着江。', "A bit to your left — don't block the river."],
      ['笑一个。', 'Give me a smile.'],
      ['晚上灯亮了更好看。', 'It photographs better once the lights come on.'],
      ['我在这儿站了二十年了。', "I've stood on this spot for twenty years."],
    ] },
  {
    hz: '阿婆', name: '陆阿婆', py: 'Lù āpó', place: 'bund', rig: 'lu_apo',
    // The oldest person in the game and she had no `age` at all — white hair and a bend in the
    // back were doing the whole job. An 阿婆 on the Bund is eighty-five, a metre fifty-five, and
    // folded; the lilac gilet over the grey blouse is a Shanghai grandmother's colour, not a
    // Beijing one, which is the point of putting her on this pavement.
    look: { skin:'#c6a486', hair:'#d6d3cd', hairStyle:'perm', top:'#c4bcc8', pants:'#3a3f47',
            shoe:'#4a4f55', sleeve:'short', collar:'polo', vest:'#7a6a86',
            bag:'tote', bagColor:'#6b6470',
            tall:0.87, wide:0.99, headScale:0.97, stoop:0.19, age:0.92, faceSeed:241 },
    hours: [6, 20], temper: 'frail',
    spots: [ { h0:6, h1:20, at:[-16.0, 2.20], face:0, act:'sit' } ],
    seatY: 0.46,
    lines: [
      ['侬好。', 'Nong hao — hello, in Shanghainese.'],
      ['我天天来，看看江。', 'I come every day, just to look at the river.'],
      ['对面以前都是田。', 'It was all fields over there once.'],
      ['小笼包要趁热吃。', 'Eat the xiaolongbao while they are hot.'],
      ['北京来的？远哦。', 'From Beijing? That is a long way.'],
    ] },
  { hz: '游客', place: 'bund',
    look: { skin:'#d9ab80', hair:'#241f1d', hairStyle:'short', top:'#b5533f', pants:'#39404a',
            shoe:'#e4ded0', sleeve:'short', hat:'sun', hatColor:'#e0d8c0', pack:true,
            tall:1.04, wide:0.96, headScale:1.0, youth:0.25, faceSeed:251 },
    hours: [6, 23], temper: 'eager',
    spots: [ { h0:6, h1:23, at:[-5.20, -2.10], face:Math.PI, act:'wait' } ] },
  { hz: '游客二', place: 'bund',
    look: { skin:'#e0ae82', hair:'#1e1a18', hairStyle:'bob', top:'#5c6f80', pants:'#2f343b',
            shoe:'#cfc9bb', sleeve:'short', collar:'vneck', bag:'tote', bagColor:'#c4b89c',
            tall:0.90, wide:0.97, headScale:1.0, age:0.24, faceSeed:257 },
    hours: [6, 23], temper: 'watchful',
    spots: [ { h0:6, h1:23, at:[7.40, -2.10], face:Math.PI, act:'wait' } ] },
  { hz: '游客三', place: 'bund',
    look: { skin:'#cf9d74', hair:'#938c82', hairStyle:'perm', top:'#8a7a58', pants:'#343b45',
            shoe:'#3d4147', sleeve:'short', collar:'polo', hat:'sun', hatColor:'#d8ceb4',
            tall:0.91, wide:1.08, headScale:0.99, stoop:0.08, age:0.68, faceSeed:263 },
    hours: [6, 23], temper: 'patient',
    spots: [ { h0:6, h1:23, at:[19.0, 2.20], face:0, act:'sit' } ],
    seatY: 0.46 },
  // ---- 成都, 宽窄巷子. The opposite of the Bund in every way that matters: nobody on the
  // promenade in Shanghai is sitting down and nobody in this courtyard is standing up. Four
  // people, and three of them are in a chair.
  {
    hz: '茶博士', name: '老邱', py: 'Lǎo Qiū', place: 'chengdu', rig: 'lao_qiu_tea_server',
    // The man with the metre-long copper kettle, who tops your 盖碗 up from two paces away
    // without spilling any. Thirty years of it: a white towel over the shoulder, an apron, and
    // forearms. Not a waiter — 茶博士 is a title and he would tell you so.
    look: { skin:'#b98a56', hair:'#40382f', hairStyle:'short', top:'#dcd6c4', pants:'#3b4048',
            shoe:'#3a3e44', sleeve:'roll', collar:'polo', apron:'#4a5a5e',
            towel:'#e8e2d2', beard:'stubble', beardColor:'#4a423a',
            tall:1.01, wide:1.06, headScale:1.01, stoop:0.05, age:0.55, faceSeed:271 },
    hours: [8, 22], temper: 'brash',
    spots: [ { h0:8, h1:22, at:[8.20, 8.80], face:Math.PI, act:'wait' } ],
    lines: [
      ['喝茶不？三花十五，竹叶青二十五。',
       'Tea? Sanhua is fifteen, Zhuyeqing twenty-five.'],
      ['坐嘛，坐哈儿。', 'Sit down. Sit a while — that is the Sichuan way of saying it.'],
      ['水来咯——', 'Water coming through!'],
      ['盖子刮一下，茶叶就下去了。',
       'Skim the lid across the top and the leaves go under.'],
      ['一碗茶可以坐一下午，没人赶你。',
       'One bowl buys you the whole afternoon. Nobody will move you on.'],
      ['你是北京来的嗦？慢点儿喝。',
       'From Beijing, are you? Slow down. Nobody drinks it like that here.'],
    ] },
  {
    hz: '采耳师傅', name: '刘师傅', py: 'Liú shīfu', place: 'chengdu',
    rig: 'chengdu-ear-cleaner-liu-shifu',
    // 掏耳朵 out in the open, at a stool, with a head torch and a roll of picks. A calm,
    // exact, slightly alarming trade, and one of the few things you cannot get anywhere else.
    look: { skin:'#c39763', hair:'#2e2a25', hairStyle:'short', top:'#5c6f6a', pants:'#33383f',
            shoe:'#3d4147', sleeve:'short', collar:'polo', vest:'#8a7d5e',
            hat:'visor', hatColor:'#4a4f55', glasses:'#2f3338',
            tall:0.97, wide:0.98, headScale:1.0, stoop:0.11, age:0.62, faceSeed:277 },
    hours: [9, 21], temper: 'patient',
    spots: [ { h0:9, h1:21, at:[11.60, 9.80], face:Math.PI * .92, act:'wait' } ],
    lines: [
      ['掏个耳朵嘛，四十块。', 'Have your ears done. Forty kuai.'],
      ['头靠过来一点，别动。', 'Head this way a little. And do not move.'],
      ['听到没得？这是音叉。', 'Hear that? That is the tuning fork.'],
      ['轻轻的，不痛。', 'Gently. It does not hurt.'],
      ['掏完了睡得香。', 'You will sleep well tonight.'],
    ] },
  { hz: '茶客', place: 'chengdu',
    look: { skin:'#cfa377', hair:'#8d8681', hairStyle:'short', top:'#7d8a6e', pants:'#3a3f47',
            shoe:'#4a4f55', sleeve:'short', collar:'polo',
            tall:0.94, wide:1.09, headScale:0.99, stoop:0.12, age:0.74, faceSeed:281 },
    hours: [8, 22], temper: 'patient',
    spots: [ { h0:8, h1:22, at:[4.95, 6.73], face:3.54, act:'sit' } ],
    seatY: 0.42 },
  { hz: '茶客二', place: 'chengdu',
    look: { skin:'#e0b184', hair:'#221d1b', hairStyle:'bob', top:'#a8556a', pants:'#2f343b',
            shoe:'#d8d2c4', sleeve:'short', collar:'vneck', bag:'tote', bagColor:'#bfae8e',
            tall:0.91, wide:0.97, headScale:1.0, age:0.28, faceSeed:283 },
    hours: [9, 23], temper: 'eager',
    spots: [ { h0:9, h1:23, at:[10.34, 5.48], face:5.64, act:'sit' } ],
    seatY: 0.42 },
  { hz: '游客', place: 'chengdu',
    look: { skin:'#d5a67c', hair:'#241f1d', hairStyle:'short', top:'#4d6f88', pants:'#39404a',
            shoe:'#e4ded0', sleeve:'short', hat:'sun', hatColor:'#e0d8c0', pack:true,
            tall:1.03, wide:0.96, headScale:1.0, youth:0.22, faceSeed:293 },
    hours: [8, 22], temper: 'eager',
    spots: [ { h0:8, h1:22, at:[-16.90, -1.55], face:Math.PI * 1.38, act:'wait' } ] },

  // ---- 客舱. One member of cabin crew, who does everything that happens on board: she checks the
  // belts down the aisle while the captain reads the briefing, and she brings the trolley round at
  // cruise. Her walk is not a routine — it is an errand queue handed to her by the flight sequence,
  // the same mechanism the waitress uses to carry a bowl to a table.
  {
    hz: '空乘', name: '小美', py: 'Xiǎo Měi', place: 'cabin', rig: 'xiaomei_flight_attendant',
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'bun', top:'#e9eff6', pants:'#2b3340',
            shoe:'#33373c', collar:'shirt', vest:'#7a2f3c', scarf:'#c8a24a', badge:true,
            tall:0.92, wide:0.93, headScale:1.0, youth:0.20, faceSeed: 205 },
    hours: [0, 24], temper: 'genial',
    // Parked in the rear galley when she has nothing to do, which is where crew actually stand.
    spots: [ { h0:0, h1:24, at:[1.52, 2.10], face:Math.PI, act:'wait' } ],
    lines: [
      ['先生，请系好安全带。', 'Sir, please fasten your seat belt.'],
      ['小桌板收起来，谢谢。', 'Tray table up, please. Thank you.'],
      ['靠背请调直。', 'Please put your seat back upright.'],
      ['我帮您看一下安全带。', 'Let me just check your belt.'],
      ['起飞以后我们会提供饮料。', 'We will come round with drinks after take-off.'],
      ['您需要喝点什么？有茶、咖啡和果汁。', 'What would you like to drink? Tea, coffee or juice.'],
      ['要不要来点儿小吃？', 'Would you like a snack?'],
      ['请问您要牛肉饭还是鸡肉面？', 'Would you like the beef rice or the chicken noodles?'],
      ['慢用。', 'Enjoy your meal.'],
      ['我们就要降落了，请把桌板收好。', 'We are about to land — please stow your tray.'],
    ] },
  // The second of the pair. A twin-aisle cabin is served by two, one cart to each aisle, and it is
  // the reason this cabin has two aisles at all — one crew member serving forty-two seats from one
  // side is not a service, it is a person walking past you.
  //
  // She has no `lines`, and that is on purpose rather than for want of writing them. A clip is keyed
  // on `hz|name|text` — see `keyOf` in speech.js — so giving her anything to say means a bake run for
  // a second voice, and until that is done a speaking crew member is a silent one with a label on her.
  // Without lines she gets `reach: -1`, no label and no dictionary row, and 小美 does the talking: the
  // one working your own aisle is the one who speaks to you, which is how it goes anyway.
  //
  // She used to be called 小林 as well, and that collided with the shop cashier at :1283. `keyFor`
  // (js/talk.js:1403) resolves a person to a talk key by NAME before `hz`, so the two collapsed onto
  // the single key 小林 — and anything that then found "the 小林 in NPCS" with a plain `find` got
  // whichever was declared first, which is this one. The cashier's ten baked clips are keyed
  // `收银员|小林|…` and were being looked for under `空乘二|小林|…`, so they read as missing.
  // The cashier keeps the name: she has the close-up rig (`xiaolin_cashier`, js/assets.js:189), the
  // conversation script (js/talk.js:259), the vocabulary rows and ten baked clips. This one has no
  // lines, no clips, no rig and no label, so her name is the free one to move.
  {
    hz: '空乘二', name: '小婷', py: 'Xiǎo Tíng', place: 'cabin',
    look: { skin:'#d3a37c', hair:'#2b2523', hairStyle:'bob', top:'#e9eff6', pants:'#2b3340',
            shoe:'#33373c', collar:'shirt', vest:'#7a2f3c', scarf:'#c8a24a', badge:true,
            // Taller and squarer than 小美, so a glance down the aisle tells you which of the two
            // is coming — the whole reason there are two of them.
            tall:0.97, wide:1.00, headScale:0.99, age:0.22, faceSeed: 318 },
    hours: [0, 24], temper: 'steady',
    // The other side of the galley from 小美, so the pair of them read as a crew standing together
    // rather than as one person and a duplicate.
    spots: [ { h0:0, h1:24, at:[-1.52, 2.10], face:Math.PI, act:'wait' } ] },
  { hz: '乘客八', place: 'airport',
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'bob', top:'#8a6f3a', pants:'#333a44',
            shoe:'#e4ded0', sleeve:'short', collar:'vneck', skirt:'#333a44',
            tall:0.91, wide:0.93, headScale:1.01, youth:0.25, faceSeed: 155 },
    hours: [5, 23], temper: 'bored',
    // On the stool at the café table, not on the table, which is where she was.
    spots: [ { h0:5, h1:23, at:[12.96, 5.60], face:Math.PI * .5, act:'sit' } ],
    seatY: 0.50 },
  {
    // Behind the glass at the ticket office, which is where the 机票 actually comes from.
    hz: '售票员', name: '陈姐', py: 'Chén jiě', place: 'airport',
    rig: 'airport-ticket-clerk-chen-jie',
    look: { skin:'#d9ab80', hair:'#4e463f', hairStyle:'bun', top:'#e9eff6', pants:'#2b3340',
            shoe:'#33373c', collar:'shirt', vest:'#2f4f7a', scarf:'#a8323e', badge:true,
            // The one who has been behind this glass longest, and looks it — which the old
            // `age:0.35` and undyed black hair did not say. Reading glasses and twenty years.
            glasses:true, tall:0.90, wide:1.05, headScale:0.99, stoop:0.06,
            age:0.60, faceSeed: 19 },
    hours: [6, 22], temper: 'steady',
    spots: [ { h0:6, h1:22, at:[-14.20, 7.86], face:Math.PI, act:'vend' } ],
    lines: [
      ['您去哪儿？', 'Where are you going?'],
      ['单程还是往返？', 'Single or return?'],
      ['上海最早的一班八点二十。', 'The first one to Shanghai is twenty past eight.'],
      ['身份证给我看一下。', 'Identity card, please.'],
      ['这个价钱是最便宜的了。', 'That is the cheapest there is.'],
      ['提前两个小时到机场。', 'Be at the airport two hours before.'],
    ] },
  {
    // ---- 公司. An office with nobody in it is an empty office, and the room was furnished as
    // though the staff had all stepped out. They have stepped back in.
    hz: '经理', name: '王经理', py: 'Wáng jīnglǐ', place: 'office', rig: 'wang_manager',
    look: { skin:'#d9ab80', hair:'#453d37', hairStyle:'short', top:'#e8e6dd', pants:'#2f3641',
            shoe:'#33373c', collar:'shirt', jacket:'#3a3f4a', glasses:true,
            beard:'moustache', beardColor:'#4e463f',
            tall:1.00, wide:1.12, headScale:1.02, stoop:0.04, age:0.52, faceSeed:67 },
    seatY: 0.50,
    hours: [8, 19], temper: 'brash',
    spots: [ { h0:8, h1:19, at:[-2.55, .80], face:Math.PI, act:'desk' } ],
    lines: [
      ['早上好，打卡了吗？', 'Morning. Have you clocked in?'],
      ['报告什么时候能交？', 'When can the report be in?'],
      ['白板上的活儿自己领。', 'Take a job off the whiteboard yourself.'],
      ['这个星期得加班了。', "We'll have to work late this week."],
      ['做得不错，继续。', 'Good work. Keep at it.'],
      ['下班之前跟我说一声。', 'Tell me before you knock off.'],
    ] },
  {
    hz: '同事', name: '小赵', py: 'Xiǎo Zhào', place: 'office', rig: 'xiaozhao_coworker',
    look: { skin:'#e2b189', hair:'#241f1d', hairStyle:'ponytail', top:'#5c7f8c', pants:'#39414d',
            shoe:'#cfc9bc', sleeve:'short', collar:'polo',
            tall:0.90, wide:0.92, headScale:1.01, youth:0.30, faceSeed:71 },
    seatY: 0.50,
    hours: [8, 19], temper: 'genial',
    spots: [ { h0:8, h1:19, at:[-.85, .80], face:Math.PI, act:'desk' } ],
    lines: [
      ['打印机又坏了，别用。', 'The printer is broken again. Do not use it.'],
      ['中午一起去吃面？', 'Noodles together at lunch?'],
      ['经理今天心情不好。', 'The manager is in a bad mood today.'],
      ['空调坏了，热死了。', 'The AC is broken. It is unbearable.'],
      ['我先走了，明天见。', "I'm off. See you tomorrow."],
      ['这个表格我做过，我教你。', "I've done this spreadsheet before. I'll show you."],
    ] },
  {
    // A third one, mute, standing over the printer where somebody always is.
    hz: '同事二', place: 'office',
    look: { skin:'#cf9d74', hair:'#403a35', hairStyle:'short', top:'#dcd8cc', pants:'#343b45',
            shoe:'#3d4147', collar:'shirt', sleeve:'half', vest:'#5a6470', glasses:true,
            tall:1.03, wide:1.08, headScale:1.02, stoop:0.05, age:0.40, faceSeed:269 },
    hours: [9, 18], temper: 'weary',
    spots: [ { h0:9, h1:18, at:[3.05, -1.45], face:Math.PI * .5,
               act:'work', held:null } ] },
  {
    // 药剂师 behind the glass. Deliberately without `lines`: every spoken line in this game is a
    // baked clip in that person's own voice, so inventing a new speaking part means a bake run in a
    // voice nobody has recorded yet. She stands, she is a person in the room, and the counter she
    // stands behind does the asking. (This used to cite "ten of 小林's clips are missing" as the
    // debt. They were never missing — see the note at :1187. The bake cost is the real reason.)
    hz: '药剂师', place: 'pharmacy',
    // The white coat is the whole costume, so everything under it is quiet and the glasses do the
    // rest: 药剂师 is a job you can read from a doorway or not at all.
    look: { skin:'#e0b189', hair:'#241f1d', hairStyle:'bun', top:'#f2f4ee', pants:'#3a424c',
            shoe:'#e9e2d5', collar:'shirt', sleeve:'half', glasses:true, badge:true,
            tall:0.91, wide:0.95, headScale:1.0, age:0.26, faceSeed:83 },
    hours: [8, 22], temper: 'patient',
    spots: [ { h0:8, h1:22, at:[-1.30, 3.05], face:Math.PI, act:'vend' } ] },
  {
    hz: '收银员', name: '小林', py: 'Xiǎo Lín', place: 'shop', rig: 'xiaolin_cashier',
    // A shirt with the shop's blue tabard over it, rather than a blue top under a white
    // pinafore — which read as a sheet of A4 taped to her chest.
    look: { skin:'#dcae83', hair:'#1f1b19', hairStyle:'ponytail', top:'#e2e0d6', pants:'#39414d',
            shoe:'#cfc9bc', apron:'#3f6f8c', sleeve:'short', collar:'polo', badge:true,
            tall:0.89, wide:0.91, headScale:1.02, youth:0.35, faceSeed:59 },
    spots: [ { h0:7, h1:22, at:[1.10, 1.95], face:Math.PI * 1.02, act:'vend' } ],
    hours: [7, 22], temper: 'shy',
    lines: [
      ['您好，要袋子吗？', 'Hello — do you want a bag?'],
      ['一共多少？我算一下。', 'How much altogether? Let me add it up.'],
      ['扫码还是现金？', 'Scan the code, or cash?'],
      ['袋子两毛。', 'The bag is two mao.'],
      ['明天早上有新鲜的。', "There'll be fresh ones tomorrow morning."],
    ],
  },
  // The delivery rider. Everyone else in this list keeps hours; he keeps none, because he is
  // only ever anywhere for one reason — something you ordered on your phone is in the box on
  // the back of his e-bike and he has carried it up your stairs. `here` is set by the delivery
  // tick, and `courier` is what tells npcAwake to read it instead of the clock.
  {
    hz: '外卖员', name: '小周', py: 'Xiǎo Zhōu', place: 'home', deck: 2, courier: true,
    rig: 'xiaozhou_courier', speed: 1.15,
    // Delivery green, a company helmet, and the insulated box on his back. The gilet over the
    // shirt is the same thing every rider in the city is wearing, and it is what makes him
    // readable as a rider through a door you have only opened a crack.
    look: { skin:'#c9915f', hair:'#221e1c', hairStyle:'buzz', top:'#cfd6cc', pants:'#333840',
            shoe:'#2f3339', vest:'#3f8f66', hat:'hard', hatColor:'#2c7a56',
            tall:0.98, wide:0.96, headScale:1.0, bag:'delivery', bagColor:'#31845d',
            // Sixty-odd runs a day at twenty-three: lean, and browner than anyone else at the door.
            badge:'#e9d76d', youth:0.20, faceSeed:89 },
    temper: 'bustling',
    spots: [ { h0:0, h1:24, at: DOOR_AT, face: Math.PI, act:'wait' } ],
    lines: [
      ['您好，您的外卖到了。', 'Hello — your delivery is here.'],
      ['麻烦您了，一共这么多。', "Sorry to bother you — that's the total."],
      ['下雨了，路上有点儿慢。', "It's raining. The roads were slow."],
      ['我一天送六十多单。', 'I deliver sixty-odd orders a day.'],
      ['谢谢，给个好评！', 'Thanks — leave me a good rating!'],
    ],
  },
  // ---- 门卫室. `grep -rn "place: 'home'" js/` found exactly one person in the whole twelve-storey
  // building and it was the courier above, who only exists when you have ordered something. The
  // lobby offered 跟保安打招呼 against an empty booth.
  //
  // He sits, because the chair in js/home-lobby.js is square to the desk with his jacket over the
  // back of it — x 4.86, z −2.15, facing the counter at x 3.60. 保安 is already a uniform class in
  // js/fig-uniform.js:157, so this is a roster row and not a rig; the authored rig is lane 8's.
  {
    // The day shift, 07:00 to 19:00. 老陈 at the head of this array has the other twelve hours —
    // the booth was manned round the clock by one man, in one chair, which is not a shift pattern
    // and meant the same face at 03:00 as at 15:00.
    hz: '保安', name: '刘师傅', py: 'Liú shīfu', place: 'home', deck: 0, hours: [7, 19],
    uniform: '保安',
    look: { skin:'#c08a58', hair:'#2a2320', hairStyle:'crop', top:'#3d4657', pants:'#2b3140',
            shoe:'#23262c', hat:'cap', hatColor:'#2b3140', badge:'#c9a24a',
            tall:1.01, wide:1.04, headScale:1.0, youth:-0.35, faceSeed:41 },
    temper: 'steady',
    spots: [ { h0:0, h1:24, at:[4.86, -2.15], face:-Math.PI / 2, act:'sit' } ],
    lines: [
      ['回来啦？外面冷不冷？', 'Back home? Cold out there?'],
      ['二号梯停用，坐一号梯吧。', 'Number two is out of service — take number one.'],
      ['你的快递我签收了，在柜子里。', 'I signed for your parcel; it is in the locker.'],
      ['晚上十一点以后门禁刷卡。', 'After eleven at night the door needs your card.'],
      ['这楼里住着好几百口人呢。', 'There are several hundred people living in this block.'],
    ],
  },
];
// ---------------------------------------------------------------- using things
// What each object does when you use it. `secs` is how long it takes in real time,
// `mins` how much of the day it costs. Gains land gradually, so stopping early still counts.
//
// Money moves through two fields. `pay` is a signed change to your wallet applied when the
// action finishes — negative to spend, positive for a wage. `cost` is only for display: what a
// A basket first. Reaching a packet down with nowhere to put it is the one thing a shop does not
// let you do, and it is also how the player finds out the baskets by the door are not scenery.
// shelf will add to your basket, which you do not pay for until you reach the till. Anything
// whose price depends on the moment (the till, an order off the menu) leaves `pay` out of the
// table and has `useLabel` work it out instead.
const USE = {
  // Both of these are rewritten in useLabel from what is actually in the flat: the fridge names
  // the thing it is about to hand you and carries that thing's own gain, and the kitchen turns
  // into a list of the dishes you have the ingredients for. What is written here is the shape of
  // the action — how long it takes, what the body does — and a gain that only survives if
  // something has gone wrong upstream.
  '冰箱':   { zh:'吃东西', py:'chī dōngxi', en:'eat something', secs:3.4, mins:20, fridge:true,
              gain:{ food:42, mood:4 }, pose:{ type:'eat', hold:'meal' }, done:'吃饱了。', doneTr:'That hit the spot.' },
  '厨房':   { zh:'做饭', py:'zuòfàn', en:'cook a meal', secs:5.2, mins:45, cook:true,
              gain:{ food:64, mood:9, clean:-6 }, pose:{ type:'cook', hold:'ladle' },
              done:'我做了饭，很好吃。', doneTr:'I cooked, and it was good.' },
  '水池':   { zh:'洗手', py:'xǐshǒu', en:'wash your hands', secs:1.9, mins:5,
              gain:{ clean:9 }, pose:{ type:'scrub' } },
  '洗手池': { zh:'洗手', py:'xǐshǒu', en:'wash your hands', secs:1.9, mins:5,
              gain:{ clean:11 }, pose:{ type:'scrub' } },
  // Twice a day, not ten times: a verb you can spam for a full meter is not a habit, and the flat
  // has three brushes in it. `teeth:true` lets `useLabel` say so in Chinese on the third go.
  '牙刷':   { zh:'刷牙', py:'shuāyá', en:'brush your teeth', secs:2.6, mins:8, teeth:true,
              gain:{ clean:13, mood:4 }, pose:{ type:'scrub', high:true, hold:'brush' } },
  '淋浴':   { zh:'洗澡', py:'xǐzǎo', en:'take a shower', secs:4.6, mins:25, shower:true,
              gain:{ clean:100, mood:11 }, pose:{ type:'wash', at:[5.28,1.22], yaw:Math.PI/2 },
              done:'洗完澡，干净了。', doneTr:'Clean again.' },
  '马桶':   { zh:'上厕所', py:'shàng cèsuǒ', en:'use the toilet', secs:2.8, mins:10,
              gain:{ toilet:100 }, pose:{ type:'sit', at:[5.12,2.26], yaw:-Math.PI/2, seatY:0.40 } },
  '毛巾':   { zh:'擦干', py:'cā gān', en:'dry off', secs:1.6, mins:4, gain:{ clean:5 },
              pose:{ type:'scrub', high:true, hold:'towel' } },
  '镜子':   { zh:'看镜子', py:'kàn jìngzi', en:'check the mirror', secs:1.8, mins:5,
              gain:{ mood:5 }, pose:{ type:'stand' } },
  // The bed is the only action in the game that should care what time it is and it was the one that
  // did not: a flat 420 minutes meant a nap at 03:00 ended at 10:00 and an early night at 21:00
  // ended at 04:00, and four hours restored exactly as much as nine. `sleep:true` hands the row to
  // `HomeLife.sleepPlan`, which works out the wake time from the clock and the 闹钟, and scales
  // what the night is worth off the hours you actually got. The numbers below are the full-night
  // case and only survive if something upstream has gone wrong.
  '床':     { zh:'睡觉', py:'shuìjiào', en:'sleep', secs:6.4, mins:480, sleep:true,
              gain:{ rest:100, mood:12 }, pose:{ type:'lie', at:[-2.45,-1.42], yaw:0, seatY:0.60 },
              done:'睡好了，第二天。', doneTr:'Slept well. A new day.' },
  '枕头':   { zh:'睡觉', py:'shuìjiào', en:'sleep', secs:6.4, mins:480, sleep:true,
              gain:{ rest:100, mood:12 }, pose:{ type:'lie', at:[-2.45,-1.42], yaw:0, seatY:0.60 },
              done:'睡好了，第二天。', doneTr:'Slept well. A new day.' },
  '沙发':   { zh:'休息', py:'xiūxi', en:'rest a while', secs:3.6, mins:30,
              gain:{ rest:20, mood:9 }, pose:{ type:'sit', at:[-1.35,2.14], yaw:Math.PI, seatY:0.55, recline:0.10 } },
  '电视':   { zh:'看电视', py:'kàn diànshì', en:'watch TV', secs:4.4, mins:45,
              gain:{ mood:27, rest:6 }, pose:{ type:'sit', at:[-1.35,2.14], yaw:Math.PI, seatY:0.55, recline:0.10 },
              done:'电视上都是中文。', doneTr:'It is all in Chinese.' },
  '椅子':   { zh:'休息', py:'xiūxi', en:'sit down', secs:2.8, mins:15,
              gain:{ rest:10 }, pose:{ type:'sit', at:[1.12,-1.72], yaw:Math.PI, seatY:0.50 } },
  '电脑':   { zh:'工作', py:'gōngzuò', en:'work online', secs:6.0, mins:180, pay:180,
              gain:{ mood:-12, rest:-14, food:-8 },
              pose:{ type:'type', at:[1.12,-1.72], yaw:Math.PI, seatY:0.47 },
              done:'我工作了三个小时。', doneTr:'Three hours of work.' },
  // The phone is also where a bill gets paid, which is how most of them are paid — see `phone:true`
  // in `useLabel`, where the row turns into 缴费 whenever 物业费, 水费, 电费 or 燃气费 is outstanding.
  '手机':   { zh:'看手机', py:'kàn shǒujī', en:'look at your phone', secs:2.6, mins:20, phone:true,
              gain:{ mood:11 }, pose:{ type:'phone', hold:'phone' } },
  '茶几':   { zh:'喝茶', py:'hē chá', en:'drink tea', secs:2.4, mins:10,
              gain:{ mood:9, food:7 }, pose:{ type:'drink', hold:'cup' } },
  '书架':   { zh:'看书', py:'kàn shū', en:'read a book', secs:5.0, mins:60,
              gain:{ mood:16, rest:5 }, pose:{ type:'stand', hold:'book' },
              done:'看不懂，可是我在学。', doneTr:'I cannot read it yet, but I am learning.' },
  '植物':   { zh:'浇水', py:'jiāoshuǐ', en:'water the plant', secs:2.2, mins:5,
              gain:{ mood:7 }, pose:{ type:'pour', hold:'can' } },
  '窗户':   { zh:'开窗户', py:'kāi chuānghu', en:'open the window', secs:2.0, mins:5,
              gain:{ mood:7 }, pose:{ type:'open' } },
  '空调':   { zh:'开空调', py:'kāi kōngtiáo', en:'switch on the AC', secs:2.0, mins:5,
              gain:{ mood:9 }, pose:{ type:'press' } },
  '垃圾桶': { zh:'扔垃圾', py:'rēng lājī', en:'take the rubbish out', secs:2.4, mins:10,
              gain:{ mood:6, clean:3 }, pose:{ type:'lift', hold:'bag' } },
  '衣柜':   { zh:'换衣服', py:'huàn yīfu', en:'change clothes', secs:2.8, mins:10,
              gain:{ clean:12, mood:7 }, pose:{ type:'open', hold:'shirt' }, wear:true,
              done:'我换了一件衣服。', doneTr:'Changed my shirt — the old one is back on the rail.' },
  '灯':     { zh:'开灯', py:'kāi dēng', en:'the light', secs:1.4, mins:2,
              gain:{}, pose:{ type:'press' }, light:true },
  // Two things in one word. Everywhere else in the game a 桌子 is a desk with a drawer in it; in
  // flat 202 the 桌子 is the dining table, and the 餐厅 is a whole authored room with no reason to
  // walk into it. `eatAt:true` is honoured only at home on deck 2, where `useLabel` turns this into
  // carrying what you cooked through and eating it sitting down — which is worth more mood than
  // eating it standing at the hob, because it is.
  '桌子':   { zh:'找东西', py:'zhǎo dōngxi', en:'go through the drawer', secs:2.4, mins:8, eatAt:true,
              gain:{ mood:4 }, pose:{ type:'open' },
              done:'护照、钥匙、几张纸。', doneTr:'Passport, keys, a few sheets of paper.' },
  '茶':     { zh:'倒茶', py:'dào chá', en:'pour a cup of tea', secs:2.6, mins:8, tea:true,
              gain:{ mood:8, food:4 }, pose:{ type:'pour', hold:'cup' },
              done:'倒了一杯热茶。', doneTr:'A cup of hot tea, poured.' },
  '窗帘':   { zh:'拉窗帘', py:'lā chuānglián', en:'draw the curtains', secs:1.8, mins:3,
              gain:{ mood:5 }, pose:{ type:'open' } },
  // Out of the door you came in by. Without `at`, `setPlace('street')` fell through to the street
  // scene's default spawn and the building's own front door put you somewhere else on the map.
  // The literal is `Street.HOME_OUT` (js/street.js:169) copied rather than read, because `Street`
  // is a Lazy proxy and reading a property off it here would build the whole district at load —
  // which is the one thing js/lazy.js exists to stop. `.roomgate.js` asserts the two still agree.
  '门':     { zh:'出门', py:'chūmén', en:'step outside', secs:2.4, mins:5,
              gain:{ mood:5 }, pose:{ type:'stand' }, go:'street',
              at: { x: 0.1, z: -0.2, yaw: Math.PI * 0.5 },
              done:'外面是胡同。', doneTr:'Outside is the hutong.' },
  // Blueprint-driven campus floors use ordinary stair/lift landing things with explicit `.exit`
  // destinations.  The words supply the action; the picked landing supplies the actual floor.
  '上楼':   { zh:'上楼', py:'shàng lóu', en:'go up one floor', secs:2.0, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'到了上一层。', doneTr:'You arrive one floor higher.' },
  '下楼':   { zh:'下楼', py:'xià lóu', en:'go down one floor', secs:2.0, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'到了下一层。', doneTr:'You arrive one floor lower.' },
  '对讲':   { zh:'按对讲', py:'àn duìjiǎng', en:'buzz the intercom', secs:2.2, mins:3,
              gain:{ mood:4 }, pose:{ type:'press' },
              done:'按房号，楼上有人接对讲。',
              doneTr:'Press the flat number; somebody upstairs answers.' },
  '寻猫':   { zh:'看寻猫启事', py:'kàn xúnmāo qǐshì', en:'read the lost-cat notice', secs:2.4, mins:4,
              gain:{ mood:4 }, pose:{ type:'stand' },
              done:'寻猫启事：黄白花，三岁。',
              doneTr:'Lost cat notice: ginger and white, three years old.' },
  '门禁卡': { zh:'看门禁卡', py:'kàn ménjìnkǎ', en:'check your entry card', secs:1.6, mins:2,
              gain:{}, pose:{ type:'reach' },
              done:'门禁卡在钱包里，开三号楼一单元。',
              doneTr:'The entry card is in your wallet. It opens 3号楼 1单元.' },

  // ---- 卫生间 and 阳台. The bathroom is built around a water heater with its own glyph, its own
  // dictionary row and — until now — no verb; the washing machine had a sentence saying it was
  // ready for the next load, forever. Every row below is rewritten in `useLabel` from what
  // `HomeLife` actually knows: whether there is hot water, whether the drum is still turning,
  // whether what is on the rack is dry or was rained on.
  '热水器': { zh:'开热水器', py:'kāi rèshuǐqì', en:'switch the water heater on', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'press' }, heater:true },
  '洗衣机': { zh:'洗衣服', py:'xǐ yīfu', en:'put a wash on', secs:3.0, mins:6, washer:true,
              gain:{ mood:4 }, pose:{ type:'crouch' },
              done:'洗衣机开始转了。', doneTr:'The machine has started turning.' },
  '晾衣架': { zh:'晾衣服', py:'liàng yīfu', en:'hang the washing out', secs:3.4, mins:12,
              gain:{ mood:5 }, pose:{ type:'reach' }, drying:true },
  '拖把':   { zh:'打扫', py:'dǎsǎo', en:'clean the flat through', secs:5.2, mins:35, sweep:true,
              gain:{ rest:-6 }, pose:{ type:'scrub' },
              done:'扫完了，地上干净了。', doneTr:'Swept through. The floors are clean.' },

  // ---- 厨房. Four authored objects — the hob, the wok, the board and the rice cooker — used to
  // collapse into one 厨房 tag meaning "cook a meal", which is why a dish pinned you to the stove
  // for its whole forty minutes. Chopping is now its own step, the rice cooks while you are doing
  // something else, and the extractor is the difference between a flat that smells and one that
  // does not.
  '灶台':   { zh:'看看灶台', py:'kànkan zàotái', en:'look over the hob', secs:2.0, mins:3,
              gain:{}, pose:{ type:'stand' }, hob:true },
  '炒锅':   { zh:'炒菜', py:'chǎo cài', en:'cook at the wok', secs:4.4, mins:20, wok:true,
              gain:{ food:20, mood:6, clean:-4 }, pose:{ type:'cook', hold:'ladle' } },
  '案板':   { zh:'切菜', py:'qiē cài', en:'chop at the board', secs:3.6, mins:14, board:true,
              gain:{ mood:4 }, pose:{ type:'reach' },
              done:'菜都切好了。', doneTr:'Everything is chopped and ready.' },
  '电饭煲': { zh:'焖饭', py:'mèn fàn', en:'put the rice on', secs:2.4, mins:5, ricePot:true,
              gain:{ mood:3 }, pose:{ type:'crouch' } },
  '抽油烟机': { zh:'开抽油烟机', py:'kāi chōuyóuyānjī', en:'switch the extractor on', secs:1.8, mins:2,
              gain:{}, pose:{ type:'press' }, fan:true },
  // 泡面 is the lazy option only if it is visibly faster than the twenty-five to sixty minutes the
  // hob costs, so it gets its own three minutes at the kettle rather than the generic raw-eat.
  '热水壶': { zh:'泡面', py:'pào miàn', en:'make instant noodles', secs:2.6, mins:3, noodles:true,
              gain:{ food:26, mood:3 }, pose:{ type:'pour', hold:'cup' },
              done:'三分钟，泡面好了。', doneTr:'Three minutes, and the noodles are ready.' },

  // ---- 主卧. Setting an alarm has to be able to *cost* you sleep or it is a decoration, so both
  // of these open the same picker and the bed reads what it chose.
  '闹钟':   { zh:'定闹钟', py:'dìng nàozhōng', en:'set the alarm', secs:1.8, mins:2,
              gain:{}, pose:{ type:'reach' }, alarmSet:true },
  '床头柜': { zh:'定闹钟', py:'dìng nàozhōng', en:'set the alarm clock', secs:1.8, mins:2,
              gain:{}, pose:{ type:'reach' }, alarmSet:true },

  // ---- out in the hutong
  '楼':     { zh:'回家', py:'huí jiā', en:'go back up', secs:2.4, mins:5,
              gain:{ rest:2 }, pose:{ type:'stand' }, go:'home',
              done:'进楼了。', doneTr:'Back inside the building.' },
  // The three doors off the alley. Buying, eating and working used to happen on the pavement
  // outside; now each of them is a room you walk into and the action lives in there.
  // Both keep hours. A locked door at four in the morning is a better answer than an empty
  // room with a working till in it — and it is the one the shutter actually gives you.
  '超市':   { zh:'进超市', py:'jìn chāoshì', en:'go into the shop', secs:2.2, mins:4,
              open:[7, 22], gain:{ mood:3 }, pose:{ type:'stand' }, go:'shop',
              done:'里面开着空调，凉快。', doneTr:'Air conditioning on inside. Cool.' },
  '餐馆':   { zh:'进餐馆', py:'jìn cānguǎn', en:'go into the noodle shop', secs:2.2, mins:4,
              open:[6, 22], gain:{ mood:5 }, pose:{ type:'stand' }, go:'diner',
              done:'一进门就闻到牛肉面。', doneTr:'You smell the beef noodles from the door.' },
  '公司':   { zh:'上班', py:'shàngbān', en:'go in to work', secs:2.6, mins:8,
              gain:{ mood:-3 }, pose:{ type:'stand' }, go:'office1',
              done:'进了公司大堂，先看楼层索引。', doneTr:'Inside the office lobby — check the directory first.' },
  '购物中心': { zh:'逛商场', py:'guàng shāngchǎng', en:'go into the shopping mall', secs:2.5, mins:5,
              open:[10,22], gain:{ mood:8 }, pose:{ type:'stand' }, go:'mall',
              done:'商场里面很大，也很热闹。', doneTr:'The mall is huge and busy inside.' },
  '医院':   { zh:'进医院', py:'jìn yīyuàn', en:'go into the hospital', secs:2.4, mins:4,
              gain:{ mood:2 }, pose:{ type:'stand' }, go:'hospital',
              done:'进门先看楼层索引。', doneTr:'Inside — check the floor directory first.' },
  '消防站': { zh:'进消防站', py:'jìn xiāofángzhàn', en:'go into the fire station', secs:2.4, mins:4,
              gain:{ mood:4 }, pose:{ type:'stand' }, go:'firestation',
              done:'车库和值班室都有人。', doneTr:'The appliance hall and watch room are both staffed.' },
  '消防车': { zh:'看看消防车', py:'kànkan xiāofángchē', en:'inspect the fire engine', secs:2.0, mins:3,
              gain:{ mood:4 }, pose:{ type:'stand' },
              done:'车身两侧的器材舱、水带卷盘和云梯都看得清楚。',
              doneTr:'Equipment lockers, hose reels, and the roof ladder are visible from here.' },
  '消火栓': { zh:'看消火栓', py:'kàn xiāohuǒshuān', en:'inspect the hydrant', secs:1.5, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'接口前没有堆东西。', doneTr:'Nothing blocks the connection.' },
  '消防宣传栏': { zh:'看消防宣传', py:'kàn xiāofáng xuānchuán', en:'read the fire-safety notices', secs:2.2, mins:4,
              gain:{ mood:2 }, pose:{ type:'stand' },
              done:'先断电、再灭火；楼道里不能堆杂物。',
              doneTr:'Cut the power before firefighting, and keep corridors free of stored items.' },
  // The staffed counters keep ordinary branch hours, but the authored hall also contains the
  // signed 24-hour self-service bank.  The door therefore stays available; `USE_AT.bank` gates
  // only the people-dependent services while the ATMs remain honest after five o'clock.
  '银行':   { zh:'进银行', py:'jìn yínháng', en:'go into the bank and 24-hour ATM lobby', secs:2.6, mins:5,
              gain:{ mood:1 }, pose:{ type:'stand' }, go:'bank',
              done:'自助银行二十四小时开放，柜台九点营业。',
              doneTr:'The self-service bank is open 24 hours; the counters open at nine.' },
  // The night market, and the only door in the game whose hours are the point rather than an
  // inconvenience. Seven in the evening to two in the morning: there is genuinely nothing down
  // there before seven, and being turned away at five is how the player learns that.
  '夜市':   { zh:'逛夜市', py:'guàng yèshì', en:'go into the night market', secs:2.4, mins:5,
              open:[19, 26], gain:{ mood:12 }, pose:{ type:'stand' }, go:'nightmarket',
              done:'一进去全是烤肉的味儿。', doneTr:'The smell of grilled meat hits you at the gate.' },
  // The stall trades 05:00–10:30 and is wheeled away after it — see the note by `stall` in
  // street.js. These three had no hours at all, so with the cart gone from the pavement the alley
  // still sold you breakfast off it at midnight.
  '早餐':   { zh:'吃早餐', py:'chī zǎocān', en:'have breakfast', secs:3.2, mins:20,
              open:[5, 10.5],
              pay:-8, gain:{ food:46, mood:10 }, pose:{ type:'eat', hold:'meal' },
              done:'包子和豆浆，六块钱。', doneTr:'Baozi and soy milk, six kuai.' },
  '包子':   { zh:'吃包子', py:'chī bāozi', en:'eat a baozi', secs:2.4, mins:10,
              open:[5, 10.5],
              pay:-3, gain:{ food:22, mood:6 }, pose:{ type:'eat', hold:'meal' } },
  // ---- 夜市. Six stalls, six verbs, and every one of them is money out of your hand for
  // something you eat standing up. They are cheap on purpose: the whole appeal of a night market
  // is that a full evening of it costs less than one bowl in the 餐馆, and the prices here say so.
  //
  // None of them keeps. Nothing bought down here goes in the fridge — you eat it in the lane,
  // which is what `gain` without `buy` means, and it is why this is an evening out rather than a
  // shopping trip.
  '烧烤':   { zh:'买串儿', py:'mǎi chuànr', en:'buy skewers off the grill', secs:3.4, mins:12,
              pay:-15, gain:{ food:34, mood:18 }, pose:{ type:'eat', hold:'meal' },
              done:'五串羊肉，孜然放得足。', doneTr:'Five lamb skewers, heavy on the cumin.' },
  '羊肉串': { zh:'吃串儿', py:'chī chuànr', en:'eat a skewer', secs:2.6, mins:6,
              pay:-3, gain:{ food:12, mood:9 }, pose:{ type:'eat', hold:'meal' },
              done:'烫，但是好吃。', doneTr:'Scalding, but good.' },
  '煎饼':   { zh:'买煎饼', py:'mǎi jiānbing', en:'buy a jianbing', secs:3.2, mins:10,
              pay:-8, gain:{ food:38, mood:12 }, pose:{ type:'eat', hold:'meal' },
              done:'加了个鸡蛋，两块脆饼。', doneTr:'With an egg and two sheets of cracker in it.' },
  '炒面':   { zh:'买炒面', py:'mǎi chǎomiàn', en:'buy fried noodles', secs:3.6, mins:14,
              pay:-10, gain:{ food:44, mood:11 }, pose:{ type:'eat', hold:'meal' },
              done:'一大份，辣椒放多了。', doneTr:'A big portion. Too much chilli.' },
  '糖葫芦': { zh:'买糖葫芦', py:'mǎi tánghúlu', en:'buy a stick of tanghulu', secs:2.8, mins:6,
              pay:-5, gain:{ food:8, mood:22 }, pose:{ type:'eat', hold:'meal' },
              done:'外面的糖脆，里面酸。', doneTr:'The sugar shell cracks; the fruit inside is sour.' },
  '水果':   { zh:'买水果', py:'mǎi shuǐguǒ', en:'buy some fruit', secs:3.0, mins:8,
              pay:-10, buy:1, buyHz:'水果', gain:{ mood:7 },
              pose:{ type:'lift', hold:'goods' },
              done:'一斤，称给你看。', doneTr:'A jin — she shows you the scale.' },
  '饮料':   { zh:'买瓶啤酒', py:'mǎi píng píjiǔ', en:'buy a cold beer', secs:2.8, mins:8,
              pay:-5, gain:{ mood:16, rest:-4 }, pose:{ type:'drink', hold:'cup' },
              done:'冰的，从冰柜底下拿的。', doneTr:'Cold — out from under the ice.' },
  '门口':   { zh:'出去', py:'chūqu', en:'back out to the hutong', secs:2.2, mins:4,
              gain:{}, pose:{ type:'stand' }, go:'street',
              done:'外面安静多了。', doneTr:'It is a great deal quieter out here.' },
  '摊主':   { zh:'说话', py:'shuōhuà', en:'talk to the stall holder', secs:2.6, mins:8,
              gain:{ mood:12 }, pose:{ type:'talk' }, talk:true },
  '猫':     { zh:'摸猫', py:'mō māo', en:'pet the cat', secs:2.4, mins:5,
              gain:{ mood:16 }, pose:{ type:'crouch' },
              done:'猫不理我。', doneTr:'The cat ignores me.' },
  '自行车': { zh:'骑车', py:'qí chē', en:'ride around the block', secs:5.6, mins:45,
              gain:{ mood:20, rest:-12, food:-6 }, pose:{ type:'stand' },
              done:'骑车比走路快。', doneTr:'Cycling beats walking.' },
  '公交车站': { zh:'等车', py:'děng chē', en:'wait for a bus', secs:3.4, mins:25,
              gain:{ mood:-3, rest:4 }, pose:{ type:'stand' },
              done:'车太挤了，我不上。', doneTr:'Too crowded. I am not getting on.' },
  // One word, one backing store. The corridor parcel, the parcel inside the front door and the
  // lobby's 快递柜 used to be three separate props that each handed you a parcel out of nothing;
  // `parcel:true` makes all three read the same list in `HomeLife`, so one delivery is one object.
  '快递':   { zh:'拿快递', py:'ná kuàidì', en:'collect a parcel', secs:2.6, mins:8, parcel:true,
              gain:{ mood:9 }, pose:{ type:'lift', hold:'parcel' } },
  // ---- the neighbours. Talking is the same verb for everyone; who they are decides
  // what you get back, and each conversation moves you further down their lines.
  '阿姨':   { zh:'说话', py:'shuōhuà', en:'talk to her', secs:2.8, mins:10,
              gain:{ mood:14 }, pose:{ type:'talk' }, talk:true },
  '师傅':   { zh:'说话', py:'shuōhuà', en:'talk to him', secs:2.8, mins:10,
              gain:{ mood:11 }, pose:{ type:'talk' }, talk:true },
  '老板':   { zh:'说话', py:'shuōhuà', en:'talk to the shopkeeper', secs:2.8, mins:10,
              gain:{ mood:10 }, pose:{ type:'talk' }, talk:true },
  '邻居':   { zh:'说话', py:'shuōhuà', en:'talk to your neighbour', secs:2.8, mins:10,
              gain:{ mood:13 }, pose:{ type:'talk' }, talk:true },
  '小孩':   { zh:'说话', py:'shuōhuà', en:'talk to the kid', secs:2.4, mins:8,
              gain:{ mood:16 }, pose:{ type:'talk' }, talk:true },
  // These three were the gap. 李大妈 in the park, 陈老师 on the campus and the two students have
  // twenty-two written lines between them, and there was no row here for 大妈, 老师 or 学生 — so no
  // verb in the world reached any of them and not one of those lines could ever fire. Four people
  // standing in two places, with nothing the player could do but walk past.
  //
  // 学生 covers both 小周 and 小李 on purpose: one row, two people, and which of them you are
  // talking to is decided by the thing you walked up to.
  '大妈':   { zh:'说话', py:'shuōhuà', en:'talk to the auntie', secs:2.8, mins:10,
              gain:{ mood:15 }, pose:{ type:'talk' }, talk:true },
  '老师':   { zh:'说话', py:'shuōhuà', en:'talk to the teacher', secs:2.8, mins:10,
              gain:{ mood:12 }, pose:{ type:'talk' }, talk:true },
  '学生':   { zh:'说话', py:'shuōhuà', en:'talk to the student', secs:2.6, mins:8,
              gain:{ mood:14 }, pose:{ type:'talk' }, talk:true },
  // The waitress is not a talking ornament: ordering goes through her, and she is where the
  // money leaves your hand. What you get is whatever line of the menu board you settled on.
  '服务员': { zh:'点菜', py:'diǎn cài', en:'order', secs:3.0, mins:8,
              orderUp:true, talk:true, gain:{ mood:7 }, pose:{ type:'talk' } },
  '收银员': { zh:'说话', py:'shuōhuà', en:'talk to the cashier', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, talk:true },
  '导购员': { zh:'问一问', py:'wèn yi wèn', en:'ask the sales assistant', secs:2.6, mins:6,
              gain:{ mood:7 }, pose:{ type:'talk' }, talk:true },
  // Named mall roles keep their exact headword: those names also key their authored speech clips,
  // so replacing them with a broad alias such as 店员 would make the people learnable but silent.
  '体验师': { zh:'问一问', py:'wèn yi wèn', en:'ask the product demonstrator', secs:2.6, mins:6,
              gain:{ mood:7 }, pose:{ type:'talk' }, talk:true },
  '送货员': { zh:'说话', py:'shuōhuà', en:'talk to the delivery worker', secs:2.6, mins:8,
              gain:{ mood:7 }, pose:{ type:'talk' }, talk:true },
  '面包师': { zh:'说话', py:'shuōhuà', en:'talk to the baker', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, talk:true },
  '领养专员': { zh:'问一问', py:'wèn yi wèn', en:'ask the adoption specialist', secs:2.8, mins:10,
              gain:{ mood:10 }, pose:{ type:'talk' }, talk:true },
  '美容师': { zh:'问一问', py:'wèn yi wèn', en:'ask the groomer', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, talk:true },
  '领班':   { zh:'说话', py:'shuōhuà', en:'talk to the host', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, talk:true },
  '作者':   { zh:'说话', py:'shuōhuà', en:'talk to the author', secs:2.8, mins:10,
              gain:{ mood:10 }, pose:{ type:'talk' }, talk:true },
  '保安':   { zh:'问路', py:'wèn lù', en:'ask the security guard', secs:2.5, mins:5,
              gain:{ mood:4 }, pose:{ type:'talk' }, talk:true },
  // 高师傅 at the arcade's racing bank, and whoever fixes anything anywhere else. Without this row
  // he resolved to null and stood there as scenery — `useDefAt` returns null for an unknown 词
  // rather than throwing, so a figure with no verb is silently un-interactable.
  '维修工': { zh:'问问', py:'wèn wen', en:'ask the repair technician', secs:2.5, mins:5,
              gain:{ mood:4 }, pose:{ type:'talk' }, talk:true },
  // The rider in your doorway. The same shape as the till — money out of your hand, goods into
  // it — and like the till, what it costs depends on the order, so useLabel works it out.
  '外卖员': { zh:'付钱', py:'fùqián', en:'pay him and take it', secs:2.6, mins:3,
              payRider:true, gain:{ mood:6 }, pose:{ type:'lift', hold:'parcel' } },
  // The bag itself, once it is sitting on something. Picking it back up is the only thing you
  // can do to it here — what is inside it is the fridge's business.
  '袋子':   { zh:'拿起来', py:'ná qǐlai', en:'pick the bag up', secs:1.6, mins:1,
              takeBag:true, pose:{ type:'crouch' } },

  '树':     { zh:'休息', py:'xiūxi', en:'sit in the shade', secs:3.4, mins:30,
              gain:{ rest:14, mood:8 }, pose:{ type:'stand' } },

  // ---- inside the 超市. Every shelf hands its goods to the basket and charges nothing; `take`
  // names the line of Shop.GOODS it hands over, and the till settles the lot.
  '货架':   { zh:'拿东西', py:'ná dōngxi', en:'take some off the shelf', secs:2.4, mins:5,
              take:'货架', pose:{ type:'shelf' } },
  '方便面': { zh:'拿方便面', py:'ná fāngbiànmiàn', en:'take a pot of noodles', secs:2.2, mins:4,
              take:'方便面', pose:{ type:'shelf' } },
  '水果':   { zh:'挑水果', py:'tiāo shuǐguǒ', en:'pick out some fruit', secs:2.8, mins:8,
              take:'水果', pose:{ type:'shelf' } },
  '米':     { zh:'拿一袋米', py:'ná yí dài mǐ', en:'take a bag of rice', secs:2.8, mins:6,
              take:'米', pose:{ type:'shelf' } },
  '冰柜':   { zh:'拿饮料', py:'ná yǐnliào', en:'take a cold drink', secs:2.2, mins:4,
              take:'冰柜', pose:{ type:'shelf' } },
  // The stack of baskets by the door. Fetching one is its own small action — a crouch to the
  // stack, and from then on it is on your arm — and once you have it the same verb looks inside.
  '购物篮': { zh:'拿篮子', py:'ná lánzi', en:'take a basket', secs:1.8, mins:1,
              takeBasket:true, pose:{ type:'lift' } },
  '收银台': { zh:'交钱', py:'jiāo qián', en:'pay at the till', secs:3.4, mins:8,
              till:true, gain:{ mood:4 }, pose:{ type:'stand' } },

  // ---- inside the 餐馆. Read the board, sit down, order at the counter, wait for it to come
  // out, eat it. Five things to do rather than one, and the money moves in the middle of them.
  '菜单':   { zh:'看菜单', py:'kàn càidān', en:'read the board', secs:2.4, mins:4,
              menu:true, gain:{ mood:3 }, pose:{ type:'stand' } },
  // One verb on the table, and it is a different verb depending on whether you have ordered and
  // whether the food has arrived — sit down, wait, or eat. All three of them sitting down.
  '餐桌':   { zh:'坐下', py:'zuòxia', en:'sit down', eat:true },
  '茶':     { zh:'倒茶', py:'dào chá', en:'pour yourself tea', secs:2.2, mins:5,
              gain:{ food:5, mood:8 }, pose:{ type:'pour', hold:'cup' } },

  // ---- inside the 公司. The desk does whatever the whiteboard has assigned you, seated at it,
  // and the board is where the pay for each job is written.
  '办公桌': { zh:'工作', py:'gōngzuò', en:'get on with it', shift:true, pose:{ type:'type' } },
  '会议桌': { zh:'开会', py:'kāihuì', en:'sit in on a meeting', secs:4.6, mins:90, pay:80,
              meet:true, gain:{ mood:-16, rest:-6, food:-6 },
              done:'开了一个半小时，没有结论。',
              doneTr:'An hour and a half, and no conclusion.' },
  '打卡机': { zh:'打卡', py:'dǎkǎ', en:'clock in', secs:1.8, mins:2, punch:true,
              pose:{ type:'press' } },
  '经理':   { zh:'说话', py:'shuōhuà', en:'talk to your manager', secs:2.8, mins:10,
              gain:{ mood:-4 }, pose:{ type:'talk' }, talk:true },
  // ---- the people who work at the two termini. They all had lines written for them and no
  // verb to reach them by, so nobody had ever heard a word of it.
  '售票员': { zh:'说话', py:'shuōhuà', en:'ask at the ticket window', secs:2.8, mins:8,
              gain:{ mood:6 }, pose:{ type:'talk' }, talk:true },
  '照相的': { zh:'说话', py:'shuōhuà', en:'talk to the photographer', secs:2.8, mins:8,
              gain:{ mood:12 }, pose:{ type:'talk' }, talk:true },
  '阿婆':   { zh:'说话', py:'shuōhuà', en:'talk to the old lady', secs:3.0, mins:10,
              gain:{ mood:18 }, pose:{ type:'talk' }, talk:true },
  '地勤':   { zh:'说话', py:'shuōhuà', en:'ask the ground staff', secs:2.8, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, talk:true },
  '安检员': { zh:'说话', py:'shuōhuà', en:'the officer has something to say to you', secs:2.6,
              mins:6, gain:{ mood:-3 }, pose:{ type:'talk' }, talk:true },
  '登机员': { zh:'说话', py:'shuōhuà', en:'ask at the gate', secs:2.6, mins:6,
              gain:{ mood:7 }, pose:{ type:'talk' }, talk:true },
  '同事':   { zh:'说话', py:'shuōhuà', en:'talk to your colleague', secs:2.8, mins:10,
              gain:{ mood:12 }, pose:{ type:'talk' }, talk:true },

  // ---- 公园 the park. Everything here costs time and gives you something back, which is the
  // whole economics of a park: it is the one place in the game you spend nothing in.
  '公园':   { zh:'逛公园', py:'guàng gōngyuán', en:'have a wander round', secs:4.4, mins:40,
              gain:{ mood:22, rest:-6 }, pose:{ type:'stand' },
              done:'走了一圈，出了点汗。', doneTr:'Once round the whole park. Broke a sweat.' },
  '湖':     { zh:'看湖', py:'kàn hú', en:'look out over the water', secs:3.0, mins:12,
              gain:{ mood:14, rest:4 }, pose:{ type:'stand' },
              done:'水面很静，风一吹就皱了。',
              doneTr:'The water is still until the wind creases it.' },
  '鸭子':   { zh:'喂鸭子', py:'wèi yāzi', en:'feed the duck', secs:2.8, mins:8,
              gain:{ mood:10 }, pose:{ type:'crouch' },
              done:'撒了一点吃的，鸭子朝岸边游过来了。',
              doneTr:'You scatter a little feed, and the duck paddles towards the bank.' },
  '桥':     { zh:'过桥', py:'guò qiáo', en:'cross the bridge', secs:2.8, mins:8,
              gain:{ mood:10 }, pose:{ type:'stand' },
              done:'桥中间是看湖最好的地方。',
              doneTr:'The middle of the bridge is the best place to see the lake from.' },
  '亭子':   { zh:'坐一会儿', py:'zuò yíhuìr', en:'sit in the pavilion', secs:3.4, mins:25,
              gain:{ rest:20, mood:12 }, pose:{ type:'sit', seatY:.79 },
              done:'亭子里有风，很凉快。',
              doneTr:'There is a breeze through the pavilion. Cool.' },
  '长椅':   { zh:'坐下', py:'zuòxia', en:'sit on the bench', secs:2.6, mins:15,
              gain:{ rest:14, mood:8 }, pose:{ type:'sit', seatY:.48 } },
  '健身器材': { zh:'锻炼', py:'duànliàn', en:'take some exercise', secs:5.0, mins:35,
              gain:{ mood:20, rest:-18, food:-12 }, pose:{ type:'stand' },
              done:'锻炼完了，浑身舒服。',
              doneTr:'Done. The whole body feels better for it.' },
  '花':     { zh:'看花', py:'kàn huā', en:'look at the flowers', secs:2.4, mins:6,
              gain:{ mood:9 }, pose:{ type:'crouch' } },
  '音箱':   { zh:'跳广场舞', py:'tiào guǎngchǎngwǔ', en:'join the square dancing',
              secs:5.4, mins:45, gain:{ mood:34, rest:-20, food:-10 }, pose:{ type:'stand' },
              done:'大妈们不嫌我，跳了半个小时。',
              doneTr:'The aunties did not mind me. Half an hour of it.' },
  '石桌':   { zh:'下棋', py:'xià qí', en:'play a game of chess', secs:5.0, mins:60,
              gain:{ mood:18, rest:6 }, pose:{ type:'sit', seatY:.46 },
              done:'输了两盘，赢了一盘。', doneTr:'Lost two, won one.' },

  // ---- 动物园 the zoo. Every enclosure is the same transaction — you stand at a rail and you
  // watch something — so what has to differ between them is how long you stand there and what it
  // does to you. The panda and the penguins are the long ones because they are the ones people
  // genuinely lose half an hour to; the tiger is short because it is asleep.
  //
  // Nothing here costs money except the way in, which is the one economic fact about a zoo: 门票 is
  // fifteen yuan and everything after it is free, so the decision is at the gate and nowhere else.
  '动物园': { zh:'逛动物园', py:'guàng dòngwùyuán', en:'walk the whole zoo', secs:4.6, mins:75,
              gain:{ mood:26, rest:-12, food:-10 }, pose:{ type:'stand' },
              done:'走了一大圈，腿都酸了。',
              doneTr:'All the way round. My legs have had enough.' },
  '熊猫':   { zh:'看熊猫', py:'kàn xióngmāo', en:'watch the pandas', secs:4.2, mins:35,
              gain:{ mood:30, rest:4 }, pose:{ type:'stand' },
              done:'它吃了半个小时竹子，一动没动。',
              doneTr:'Half an hour of bamboo. It did not move once.' },
  '老虎':   { zh:'看老虎', py:'kàn lǎohǔ', en:'look for the tiger', secs:3.0, mins:12,
              gain:{ mood:14 }, pose:{ type:'stand' },
              done:'睡了一下午，只看见一个背影。',
              doneTr:'Asleep all afternoon. All I saw was its back.' },
  '大象':   { zh:'看大象', py:'kàn dàxiàng', en:'watch the elephants', secs:3.6, mins:22,
              gain:{ mood:22, rest:2 }, pose:{ type:'stand' },
              done:'小象一直跟着大象走。',
              doneTr:'The calf followed the big one the whole time.' },
  '长颈鹿': { zh:'看长颈鹿', py:'kàn chángjǐnglù', en:'watch the giraffes', secs:3.4, mins:18,
              gain:{ mood:20 }, pose:{ type:'stand' },
              done:'它低头吃树叶，脖子弯成一个弓。',
              doneTr:'It bent for the leaves and its neck made a bow.' },
  '猴子':   { zh:'看猴子', py:'kàn hóuzi', en:'watch the monkey hill', secs:4.0, mins:28,
              gain:{ mood:28, rest:-4 }, pose:{ type:'stand' },
              done:'一只小的抢了另一只的东西，被追了半座山。',
              doneTr:'A small one stole from another and got chased round the whole hill.' },
  '企鹅':   { zh:'看企鹅', py:'kàn qǐ\'é', en:'watch the penguins', secs:4.0, mins:30,
              gain:{ mood:26, rest:8 }, pose:{ type:'stand' },
              done:'看它们走路看了半天，怎么看都好笑。',
              doneTr:'Watched them walk for ages. It is funny every single time.' },
  '孔雀':   { zh:'等它开屏', py:'děng tā kāipíng', en:'wait for the tail', secs:4.4, mins:25,
              gain:{ mood:24, rest:6 }, pose:{ type:'stand' },
              done:'等了二十分钟，真开了。',
              doneTr:'Twenty minutes of waiting, and it actually opened.' },
  '导游图': { zh:'看导游图', py:'kàn dǎoyóutú', en:'read the map', secs:2.4, mins:5,
              gain:{ mood:5 }, pose:{ type:'stand' },
              done:'熊猫在西边，猴山在北边。',
              doneTr:'Pandas to the west, monkey hill to the north.' },
  '饲养员': { zh:'说话', py:'shuōhuà', en:'talk to the keeper', secs:2.8, mins:8,
              gain:{ mood:12 }, pose:{ type:'talk' }, talk:true },

  // ---- 大学城 the campus. The canteen is the cheapest meal in the game and the reason to come.
  '教学楼': { zh:'上课', py:'shàngkè', en:'sit in on a class', secs:5.6, mins:110,
              gain:{ mood:14, rest:-14, food:-10 }, pose:{ type:'stand' },
              done:'听懂了一半，记了半页笔记。',
              doneTr:'Understood about half of it. Half a page of notes.' },
  '校园地图': { zh:'看校园地图', py:'kàn xiàoyuán dìtú', en:'read the campus map',
              secs:2.4, mins:4, gain:{ mood:2 }, pose:{ type:'stand' },
              done:'教学楼在北边，食堂在西边，图书馆在东北边。',
              doneTr:'Teaching is north, the canteen west, and the library northeast.' },
  '门卫': { zh:'进门卫室', py:'jìn ménwèishì', en:'enter the security room', secs:1.8, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'先登记，再领访客证。', doneTr:'Register first, then collect a visitor badge.' },
  // This is the single authoritative source of 学生证. `studentId` is completed in game.js so
  // cancelling the interaction cannot issue a card and repeat visits can answer differently.
  '学生服务中心': {
              zh:'办学生证', py:'bàn xuéshēngzhèng', en:'get a student card',
              secs:3, mins:6, gain:{ mood:4 }, pose:{ type:'talk' }, studentId:true,
              done:'学生证办好了，请收好。', doneTr:'Your student card is ready. Keep it safe.',
              repeatDone:'学生证已经办过了。',
              repeatDoneTr:'Your student card has already been issued.' },
  '行政楼': { zh:'问问行政楼', py:'wèn wen xíngzhènglóu', en:'ask at administration',
              secs:2.4, mins:5, gain:{ mood:1 }, pose:{ type:'talk' },
              done:'办事窗口在一楼，国际学生中心在东边。',
              doneTr:'The service windows are on the ground floor; international students go east.' },
  '实验楼': { zh:'看看实验楼', py:'kàn kan shíyànlóu', en:'look into the science building',
              secs:2.2, mins:4, gain:{ mood:2 }, pose:{ type:'stand' },
              done:'门口贴着今天的实验室安全安排。',
              doneTr:'Today’s laboratory safety schedule is posted by the entrance.' },
  '活动中心': { zh:'看看活动', py:'kàn kan huódòng', en:'see what is on at the student centre',
              secs:2.6, mins:6, gain:{ mood:5 }, pose:{ type:'stand' },
              done:'今晚有社团活动，门口正在报名。',
              doneTr:'Clubs meet tonight, and sign-ups are open by the door.' },
  '校医院': { zh:'去校医院', py:'qù xiàoyīyuàn', en:'ask at the campus clinic',
              secs:3, mins:10, gain:{ rest:4 }, pose:{ type:'talk' },
              done:'护士说先休息，多喝水，不舒服再来。',
              doneTr:'The nurse says to rest, drink water, and come back if you still feel unwell.' },
  // Deliberately not the apartment 快递柜: this row never reads or clears HomeLife parcels.
  '校园快递柜': { zh:'看校园快递柜', py:'kàn xiàoyuán kuàidìguì',
              en:'check the campus parcel locker', secs:1.8, mins:2,
              gain:{ mood:1 }, pose:{ type:'press' },
              done:'没有取件码，柜门没有打开。',
              doneTr:'There is no collection code, so the locker stays shut.' },
  '跑道':   { zh:'跑步', py:'pǎobù', en:'run a lap', secs:3.2, mins:12,
              gain:{ rest:-12, food:-5, mood:8 }, pose:{ type:'walk' },
              done:'跑完一圈，呼吸快了，脑子也清醒了。',
              doneTr:'One lap done—breathing hard, and much more awake.' },
  // ---- 药店 the chemist's. The sign on the parade has taught this word since the street got its
  // signs; now the same thing you learned it from is the way in.
  '药店': { zh:'进药店', py:'jìn yàodiàn', en:'go into the pharmacy', secs:2.6, mins:5,
            pose:{ type:'stand' },
            done:'推门进了药店。', doneTr:'You push the door and go into the chemist.' },
  // ---- 大超市 the hypermarket at the east end. Open long hours, the way they are.
  '大超市': { zh:'进大超市', py:'jìn dà chāoshì', en:'go into the hypermarket', secs:3.0, mins:8,
            open:[7, 23], pose:{ type:'stand' },
            done:'门自己开了，里面很亮。',
            doneTr:'The doors open by themselves. It is very bright inside.' },
  '柜台': { zh:'说不舒服', py:'shuō bù shūfu', en:'say what is wrong', secs:3.6, mins:8,
            remedy:true, gain:{ mood:4 }, pose:{ type:'stand' } },
  '药':   { zh:'看药', py:'kàn yào', en:'read the boxes', secs:2.6, mins:4,
            gain:{ mood:1 }, pose:{ type:'stand' },
            done:'一整面墙的药，看不太懂。',
            doneTr:'A whole wall of medicine, and you can only read some of it.' },
  '创可贴': { zh:'买创可贴', py:'mǎi chuāngkětiē', en:'buy plasters', secs:2.2, mins:3,
            pay:-4, gain:{ mood:2 }, pose:{ type:'take' },
            done:'买了一盒创可贴。', doneTr:'A box of plasters.' },
  '口罩': { zh:'买口罩', py:'mǎi kǒuzhào', en:'buy a box of masks', secs:2.2, mins:3,
            pay:-10, gain:{ mood:2 }, pose:{ type:'take' },
            done:'买了一盒口罩。', doneTr:'A box of masks.' },
  '体温计': { zh:'买体温计', py:'mǎi tǐwēnjì', en:'buy a thermometer', secs:2.4, mins:4,
            pay:-18, gain:{ mood:2 }, pose:{ type:'take' },
            done:'买了一个体温计。', doneTr:'One thermometer.' },
  '药方': { zh:'看药方', py:'kàn yàofāng', en:'read the prescription hatch', secs:2.4, mins:3,
            pose:{ type:'stand' },
            done:'没有药方，买不了处方药。',
            doneTr:'No prescription, so nothing behind that window is for you.' },

  '图书馆': { zh:'去图书馆', py:'qù túshū guǎn', en:'go into the library', secs:2.8, mins:6,
              gain:{ mood:6 }, pose:{ type:'stand' },
              go: 'library',
              done:'推门进了图书馆。',
              doneTr:'You step through the library door.' },
  '食堂':   { zh:'吃饭', py:'chīfàn', en:'eat in the canteen', secs:4.0, mins:30, pay:-8,
              gain:{ food:66, mood:12 }, pose:{ type:'eat', hold:'meal' },
              done:'两个菜一碗饭，八块。',
              doneTr:'Two dishes and a bowl of rice. Eight kuai.' },
  '布告板': { zh:'看布告', py:'kàn bùgào', en:'read the notices', secs:2.8, mins:8,
              gain:{ mood:6 }, pose:{ type:'stand' },
              done:'一半是招人的，一半是过期的。',
              doneTr:'Half of them are recruiting, half are out of date.' },
  '篮球场': { zh:'打球', py:'dǎ qiú', en:'play basketball', secs:5.6, mins:60,
              gain:{ mood:30, rest:-26, food:-18 }, pose:{ type:'stand' },
              done:'打了一身汗，赢了。', doneTr:'Drenched, and we won.' },
  // 教室 — through the teaching-block entrance into the classroom. Sits beside the 教学楼 上课
  // anchor on the forecourt: walking up to the doors themselves favours this one, standing out
  // on the forecourt favours that one.
  '教室':   { zh:'进教室', py:'jìn jiàoshì', en:'go into the classroom', secs:2.2, mins:4,
              gain:{ mood:3 }, pose:{ type:'stand' }, go:'classroom',
              done:'一进教室就安静了。', doneTr:'It goes quiet the moment you step inside.' },
  // 学生桌 — take a class from a desk inside the room. Same shape as the forecourt 上课, but the
  // body sits at the desk.
  '学生桌': { zh:'上课', py:'shàngkè', en:'sit in on a class', secs:5.6, mins:110,
              gain:{ mood:14, rest:-14, food:-10 }, pose:{ type:'sit', seatY:.46 },
              done:'听懂了一半，记了半页笔记。',
              doneTr:'Understood about half of it. Half a page of notes.' },
  // the new usable things on the forecourt. A study table, a drinking fountain and a vending
  // machine — small reasons to spend a few minutes between classes. (长椅 benches share the
  // park's USE entry further up, since a bench is a bench wherever you sit on it.)
  // This row was written for the forecourt, where 复习 means "a while with your notes" and there is
  // nothing behind it. At the desk in the player's own 书房 it is the one review station in the
  // flat, so `study:true` hands it to `HomeLife.studyWorth`, which asks `Vocab.dueList()` what is
  // actually waiting — a game about learning Chinese should not pay 14 mood for pretending to.
  '书桌':   { zh:'复习', py:'fùxí', en:'review your notes', secs:4.6, mins:50, study:true,
              gain:{ mood:14, rest:-6, food:-6 }, pose:{ type:'sit', seatY:.46 },
              done:'翻了一遍笔记，记得清楚多了。',
              doneTr:'Went through the notes once. They stick better now.' },
  '饮水机': { zh:'喝水', py:'hē shuǐ', en:'drink from the fountain', secs:1.6, mins:3,
              gain:{ food:6, clean:4 }, pose:{ type:'drink' },
              done:'凉水，免费。', doneTr:'Cold water, and free.' },
  '售货机': { zh:'买饮料', py:'mǎi yǐnliào', en:'buy a drink', secs:2.4, mins:5, pay:-5,
              gain:{ food:20, mood:8 }, pose:{ type:'press' },
              done:'一罐冷饮，五块。', doneTr:'A cold drink. Five kuai.' },
  '煎饼':   { zh:'买煎饼', py:'mǎi jiānbing', en:'buy a jianbing', secs:2.6, mins:6, pay:-4,
              gain:{ food:38, mood:8 }, pose:{ type:'stand' },
              done:'一个煎饼果子，加蛋加脆。', doneTr:'A jianbing with egg and the crisp cracker.' },
  '打印':   { zh:'复印', py:'fùyìn', en:'print a copy', secs:2.2, mins:8, pay:-1,
              gain:{ mood:6 }, pose:{ type:'press' },
              done:'印好了，两毛。', doneTr:'Done. Twenty fen.' },

  // ---- 火车站 the waiting hall. You are not going anywhere today, and the room tells you so.
  '电子屏': { zh:'看电子屏', py:'kàn diànzǐpíng', en:'read the departure board', secs:3.0,
              mins:8, gain:{ mood:8 }, pose:{ type:'stand' },
              done:'上海、南京、西安、成都。',
              doneTr:'Shanghai, Nanjing, Xian, Chengdu.' },
  '售票窗口': { zh:'买火车票', py:'mǎi huǒchēpiào', en:'buy a train ticket', secs:3.0, mins:12,
              sellout:true, pose:{ type:'stand' } },
  '检票口': { zh:'检票', py:'jiǎnpiào', en:'go through the gate', secs:2.4, mins:4,
              needTicket:true, pose:{ type:'stand' } },
  '小卖部': { zh:'买方便面', py:'mǎi fāngbiànmiàn', en:'buy a pot of noodles', secs:2.8, mins:8,
              pay:-5, gain:{ food:32, mood:6 }, pose:{ type:'stand' },
              done:'五块钱，还给了叉子。',
              doneTr:'Five kuai, and they threw in a fork.' },

  // ---- 机场 the terminal. The longest chain of things to do in the game, and every link of
  // it is a word: buy the 机票, take it to 值机 for a 登机牌, drop a bag, walk through 安检,
  // kill an hour airside, and get on the aeroplane when the 登机口 calls you. Most of these
  // carry a flag rather than an outcome, because what they do depends on what you are holding
  // and what the clock says — `useLabel` settles both.
  '航班信息': { zh:'看航班', py:'kàn hángbān', en:'read the departures', secs:3.0, mins:8,
              gain:{ mood:12 }, depBoard:true, pose:{ type:'stand' } },
  '飞机':   { zh:'看飞机', py:'kàn fēijī', en:'watch the aircraft', secs:3.4, mins:12,
              gain:{ mood:20 }, pose:{ type:'stand' },
              done:'看了一架起飞，声音隔着玻璃都在响。',
              doneTr:'Watched one take off. You feel it through the glass.' },
  '座椅':   { zh:'候机', py:'hòujī', en:'wait for a flight', secs:3.4, mins:30,
              gain:{ rest:16, mood:2 }, pose:{ type:'sit', seatY:.48 } },
  '售票处': { zh:'买机票', py:'mǎi jīpiào', en:'buy a plane ticket', secs:3.0, mins:20,
              flights:true, pose:{ type:'stand' } },
  '值机柜台': { zh:'值机', py:'zhíjī', en:'check in', secs:3.0, mins:14,
              checkin:true, pose:{ type:'stand' } },
  '自助值机': { zh:'自助值机', py:'zìzhù zhíjī', en:'check in at the machine', secs:2.4, mins:6,
              checkin:true, kiosk:true, pose:{ type:'press' } },
  '行李托运': { zh:'托运行李', py:'tuōyùn xíngli', en:'put the case on the belt', secs:2.8,
              mins:8, bagdrop:true, pose:{ type:'crouch' } },
  '安检':   { zh:'过安检', py:'guò ānjiǎn', en:'go through security', secs:3.2, mins:12,
              security:true, gain:{ mood:-4 }, pose:{ type:'stand' } },
  '出口':   { zh:'出去', py:'chūqu', en:'back out into the hall', secs:2.0, mins:3,
              leaveAir:true, pose:{ type:'stand' },
              done:'从出口出来了，回到大厅。', doneTr:'Out through the exit, back in the hall.' },
  '登机口': { zh:'登机', py:'dēngjī', en:'board the aircraft', secs:3.4, mins:20,
              boardPlane:true, pose:{ type:'stand' } },
  '问询处': { zh:'问一下', py:'wèn yíxià', en:'ask at the desk', secs:2.6, mins:5,
              askAir:true, gain:{ mood:2 }, pose:{ type:'stand' } },
  '便利店': { zh:'买东西', py:'mǎi dōngxi', en:'water and a pot of noodles', secs:2.8, mins:8,
              pay:-14, gain:{ food:34, mood:6 }, pose:{ type:'stand' },
              done:'一瓶水一桶面，十四块。',
              doneTr:'A bottle of water and a pot of noodles. Fourteen kuai.' },
  '免税店': { zh:'逛免税店', py:'guàng miǎnshuìdiàn', en:'look round duty free', secs:3.0,
              mins:20, duty:true, gain:{ mood:6 }, pose:{ type:'stand' } },
  '吸烟室': { zh:'抽根烟', py:'chōu gēn yān', en:'stand in the smoking room', secs:2.8, mins:12,
              gain:{ mood:12, rest:4, clean:-9 }, pose:{ type:'stand' },
              done:'里面全是烟，出来一身味儿。',
              doneTr:'A fog in there. You come out smelling of it.' },
  '充电站': { zh:'充电', py:'chōngdiàn', en:'charge the phone a while', secs:3.0, mins:25,
              gain:{ rest:8, mood:7 }, pose:{ type:'sit', seatY:.48 },
              done:'充到六十了，够用了。', doneTr:'Sixty percent. That will do.' },
  '洗手间': { zh:'上厕所', py:'shàng cèsuǒ', en:'use the toilets', secs:2.8, mins:9,
              gain:{ toilet:100, clean:6 }, pose:{ type:'stand' },
              done:'舒服了。', doneTr:'Much better.' },
  '公共厕所': { zh:'上厕所', py:'shàng cèsuǒ', en:'join the queue for the toilets', secs:3.0,
              mins:14, gain:{ toilet:100, clean:2 }, pose:{ type:'stand' },
              done:'排了十分钟，值了。',
              doneTr:'Ten minutes in the queue. Worth it.' },
  '行李车': { zh:'推行李车', py:'tuī xínglǐchē', en:'pull a trolley out of the rack', secs:2.2,
              mins:3, gain:{ mood:4, rest:-2 }, pose:{ type:'stand' },
              done:'抽了半天才抽出来一辆。',
              doneTr:'Took some pulling to get one out of the stack.' },
  // The urn in the 便利店. Free, which is the whole sentence it teaches — every station, airport
  // and train in the country has one and nobody ever pays for hot water.
  '开水': { zh:'接杯开水', py:'jiē bēi kāishuǐ', en:'fill a cup at the urn — free, as it always is',
              secs:2.0, mins:3, gain:{ food:6, mood:5, rest:3 }, pose:{ type:'reach' },
              done:'免费的，烫得拿不住。',
              doneTr:'Free, and too hot to hold.' },

  // ---- 外滩 Shanghai. Two days away from home, and the promenade has to do everything the
  // flat does: feed you, wash you, put you to bed. Prices are what a tourist pays.
  '外滩':   { zh:'看风景', py:'kàn fēngjǐng', en:'stand and look at it', secs:4.2, mins:25,
              gain:{ mood:30, rest:4 }, pose:{ type:'stand' },
              done:'从这儿看过去，整个浦东都在水里。',
              doneTr:'From here the whole of Pudong is standing in the water.' },
  '情侣墙': { zh:'靠在墙上', py:'kào zài qiáng shang', en:'lean on the wall a while', secs:3.6,
              mins:20, gain:{ mood:20, rest:12 }, pose:{ type:'stand' },
              done:'靠了一会儿，江风挺凉。',
              doneTr:'A while on the wall. The wind off the river is cold.' },
  '黄浦江': { zh:'看江', py:'kàn jiāng', en:'watch the river traffic', secs:3.2, mins:14,
              gain:{ mood:16, rest:5 }, pose:{ type:'stand' },
              done:'一条驳船拖着四条，慢慢过去了。',
              doneTr:'A tug with four barges behind it, going by very slowly.' },
  '东方明珠': { zh:'看东方明珠', py:'kàn Dōngfāng Míngzhū', en:'look at the Pearl', secs:3.0,
              mins:10, gain:{ mood:18 }, pose:{ type:'stand' },
              done:'比照片上大多了。', doneTr:'Much bigger than it looks in photographs.' },
  '金茂大厦': { zh:'数层数', py:'shǔ céngshù', en:'try to count the floors', secs:3.0, mins:10,
              gain:{ mood:12 }, pose:{ type:'stand' },
              done:'数到四十几就乱了。', doneTr:'You lose count somewhere in the forties.' },
  '钟楼':   { zh:'看钟', py:'kàn zhōng', en:'read the customs clock', secs:2.2, mins:4,
              bundClock:true, gain:{ mood:6 }, pose:{ type:'stand' } },
  '万国建筑': { zh:'看建筑', py:'kàn jiànzhù', en:'look up at the row', secs:3.0, mins:12,
              gain:{ mood:14 }, pose:{ type:'stand' },
              done:'每一栋都不一样，每一栋都是银行。',
              doneTr:'Every one of them different, and every one of them a bank.' },
  '轮渡':   { zh:'看轮渡', py:'kàn lúndù', en:'watch the ferry come in', secs:2.8, mins:10,
              gain:{ mood:10 }, pose:{ type:'stand' },
              done:'两块钱过江，比隧道便宜。',
              doneTr:'Two kuai across. Cheaper than the tunnel.' },
  '小吃摊': { zh:'吃小笼包', py:'chī xiǎolóngbāo', en:'two baskets and a bowl of soup', secs:4.0,
              mins:25, pay:-16, gain:{ food:62, mood:18 }, pose:{ type:'eat', hold:'meal' },
              done:'小心烫，里面有汤。',
              doneTr:'Careful — they are full of soup and they are scalding.' },
  '照相':   { zh:'照相', py:'zhàoxiàng', en:'have your picture taken', secs:3.0, mins:10,
              pay:-20, gain:{ mood:22 }, pose:{ type:'stand' },
              done:'二十块，扫了码，照片发到手机上了。',
              doneTr:'Twenty kuai, scanned his code, and the photo arrives on your phone.' },
  // A night in a hotel is the bed at home with a bill attached: the restoring is `gain`, and
  // how long you are asleep for is worked out from the clock in `useLabel`.
  '沪岚饭店': { zh:'住一晚', py:'zhù yì wǎn', en:'take a room for the night', secs:5.6, mins:0,
              hotel:true, gain:{ rest:115, clean:70, mood:20 },
              pose:{ type:'lie', seatY:.60 } },
  '民航售票处': { zh:'确认回程', py:'quèrèn huíchéng', en:'reconfirm the return', secs:2.8,
              mins:10, reconfirm:true, gain:{ mood:4 }, pose:{ type:'stand' } },
  // `mins: 0` because the journey is not this action — `comeHome` moves the clock itself.
  // Without it `tickUse` multiplies undefined by the step and the whole clock goes NaN.
  // Shared with 成都: the stop outside the west gate of 宽窄巷子 is the same verb, the same
  // ellipsis and the same `trip.back`, because the way home from anywhere you flew to is the
  // coach and the seat you already paid for.
  '机场大巴': { zh:'回北京', py:'huí Běijīng', en:'take the coach to the airport', secs:3.4,
              mins:0, goHome:true, pose:{ type:'stand' } },

  // ---- 成都 宽窄巷子. The second flight that lands, and the same job as the Bund's block: two
  // days away from home, and the lane has to feed you, bed you and give you something to do with
  // an afternoon. It does all three by sitting down, so these verbs are slower and cheaper than
  // Shanghai's — a bowl of tea is twenty-five kuai and two hours, and that is the city.
  //
  // 熊猫 and 火锅 are not here: both already mean something else somewhere else (the zoo, the
  // mall) and the room gets first refusal on a word, so they live in USE_AT.chengdu instead.
  '成都':   { zh:'在巷子里走走', py:'zài xiàngzi li zǒuzou', en:'walk the lane and look at it',
              secs:4.0, mins:22, gain:{ mood:26, rest:2 }, pose:{ type:'stand' },
              done:'这条巷子走得很慢，谁都不着急。',
              doneTr:'Everybody walks this lane slowly. Nobody here is in a hurry.' },
  '宽窄巷子': { zh:'看门楼', py:'kàn ménlóu', en:'read the name cut into the gate', secs:2.6,
              mins:6, gain:{ mood:12 }, pose:{ type:'stand' },
              done:'宽巷子、窄巷子，一边一条。',
              doneTr:'Kuan on one side, Zhai on the other. Two lanes, and the pair is the name.' },
  '茶馆':   { zh:'喝盖碗茶', py:'hē gàiwǎnchá', en:'a bowl of tea, and the rest of the afternoon',
              secs:5.0, mins:120, pay:-25, gain:{ rest:34, mood:34, food:8 },
              pose:{ type:'sit', seatY:.42 },
              done:'一碗茶续了四回水，一下午就过去了。',
              doneTr:'One bowl, topped up four times, and the afternoon has gone.' },
  '盖碗茶': { zh:'看盖碗', py:'kàn gàiwǎn', en:'work out how the lid is meant to go', secs:2.6,
              mins:6, gain:{ mood:10 }, pose:{ type:'crouch' },
              done:'盖子刮一下，茶叶就下去了。',
              doneTr:'Skim the lid across the top and the leaves go under.' },
  '竹椅':   { zh:'坐一会儿', py:'zuò yíhuìr', en:'sit in one of the bamboo chairs', secs:2.6,
              mins:18, gain:{ rest:20, mood:12 }, pose:{ type:'sit', seatY:.42 },
              done:'竹椅有点响，坐着倒是舒服。',
              doneTr:'The bamboo creaks under you. It is better than it sounds.' },
  '掏耳朵': { zh:'掏耳朵', py:'tāo ěrduo', en:'have your ears done, which you will not forget',
              secs:4.4, mins:25, pay:-40, gain:{ mood:32, rest:14, clean:8 },
              pose:{ type:'sit', seatY:.42 },
              done:'音叉一响，从耳朵麻到后脑勺。',
              doneTr:'He rings the fork and it goes from your ear to the back of your skull.' },
  '川剧':   { zh:'看变脸', py:'kàn biànliǎn', en:'watch the face-changing', secs:3.4, mins:30,
              pay:-60, gain:{ mood:30 }, pose:{ type:'stand' },
              done:'一甩头就换了张脸，看了四回也没看明白。',
              doneTr:'A flick of the head and it is a different face. Four times, and you still ' +
                     'cannot see how it is done.' },
  // The same mechanism as 沪岚饭店 — `hotel:true`, and game.js works out how long you sleep from
  // the clock — but its own price and its own room, which is the difference between a second
  // city and the first one relabelled.
  '客栈':   { zh:'住一晚', py:'zhù yì wǎn', en:'take a room for the night', secs:5.6, mins:0,
              hotel:true, price:150,
              bed:'房间在后院，晚上安静得很。',
              bedTr:'The room is off the back courtyard. Very quiet at night.',
              gain:{ rest:112, clean:66, mood:18 }, pose:{ type:'lie', seatY:.55 } },

  // ---- 地铁 the subway. Down the steps, buy a ticket, through the gate, pick a station.
  '地铁站': { zh:'下去', py:'xiàqu', en:'down into the station', secs:2.4, mins:4,
              gain:{ mood:2 }, pose:{ type:'stand' }, go:'metro',
              done:'下了台阶，里面凉快多了。',
              doneTr:'Down the steps. A good deal cooler in there.' },
  '售票机': { zh:'买票', py:'mǎi piào', en:'buy a ticket', secs:2.4, mins:3,
              machine:true, pose:{ type:'press' } },
  '闸机':   { zh:'刷卡', py:'shuā kǎ', en:'tap and go through', secs:1.6, mins:2,
              gate:true, pose:{ type:'press' } },
  '服务中心': { zh:'问路', py:'wèn lù', en:'ask at the window', secs:2.6, mins:4,
              askDesk:true, gain:{ mood:2 }, pose:{ type:'stand' } },
  '线路图': { zh:'看线路图', py:'kàn xiànlùtú', en:'read the line map', secs:2.4, mins:3,
              lineMap:true, gain:{ mood:2 }, pose:{ type:'stand' } },
  '地铁':   { zh:'上车', py:'shàng chē', en:'get on the train', secs:2.4, mins:2,
              ride:true, gain:{ mood:2 }, pose:{ type:'stand' } },

  // ---- 车厢 inside the train. Everything in here is something to do with the waiting: sit
  // down, hold on to something, read the map, and get off when your station is the one outside.
  '车门':   { zh:'下车', py:'xià chē', en:'get off', secs:2.2, mins:1,
              alight:true, pose:{ type:'stand' } },
  '座位':   { zh:'坐下', py:'zuòxia', en:'sit down for the ride', secs:3.6, mins:2,
              gain:{ rest:11, mood:6 }, pose:{ type:'sit' },
              done:'找到座位了，真好。', doneTr:'Got a seat. Small mercies.' },
  '爱心专座': { zh:'坐下', py:'zuòxia', en:'the priority seat — better left free', secs:3.4, mins:2,
              gain:{ rest:9, mood:-2 }, pose:{ type:'sit' },
              done:'这是爱心专座，我还是站着吧。',
              doneTr:'This is a priority seat. Better to stand.' },
  '扶手':   { zh:'抓扶手', py:'zhuā fúshǒu', en:'hold the rail', secs:2.2, mins:1,
              gain:{ rest:3 }, pose:{ type:'stand', high:true },
              done:'车晃，得抓好。', doneTr:'It sways. Hold on.' },
  '吊环':   { zh:'抓吊环', py:'zhuā diàohuán', en:'hold a strap', secs:2.2, mins:1,
              gain:{ rest:3 }, pose:{ type:'stand', high:true },
              done:'抓着吊环，站得稳了。', doneTr:'Holding a strap. Steadier now.' },
  '打印机': { zh:'打印', py:'dǎyìn', en:'print something', secs:2.4, mins:6,
              gain:{ mood:-4 }, pose:{ type:'press' },
              done:'又卡纸了。', doneTr:'Jammed again.' },
  '咖啡':   { zh:'喝咖啡', py:'hē kāfēi', en:'get a coffee', secs:2.6, mins:10,
              gain:{ rest:9, mood:11 }, pose:{ type:'drink', hold:'cup' } },
  '白板':   { zh:'看白板', py:'kàn báibǎn', en:'take a job off the board', secs:2.6, mins:6,
              board:true, gain:{ mood:-2 }, pose:{ type:'stand' } },
};
// `th` is optional and only matters where two objects share a word and differ in where they are:
// forty seats all called 座位, eight doors all called 车门. Everything else can be answered from
// the word alone, which is why most callers still pass nothing.
// Two rooms in this game have a 座位 in them and they do not mean the same thing by it. A seat on a
// moving train is somewhere to sit down for two minutes; a seat in a waiting hall is where you spend
// half an hour waiting for the train in the first place. Both verbs were written — and both were
// written into `USE` under the same key, in the same object literal, seventy lines apart. The later
// one won at parse time, so 候车 has never once been offered to anybody, and sitting down in the
// station has always given you the two-minute version.
//
// A word can mean a different thing in a different room. This is where that gets said.
const USE_AT = {
  // These labels also exist at the railway station and airport. Keeping the zoo versions local
  // prevents the later global definitions from turning admission into a plane-ticket purchase and
  // the drinks kiosk into a pot-noodle stall.
  zoo: {
    ...ZooExpansion.useRows(ZOO_BLUEPRINT, 'zoo'),
    ...ZooContents.useRows(ZOO_CONTENTS_BLUEPRINT, 'zoo', ZOO_BLUEPRINT),
    '售票处': { zh:'买门票', py:'mǎi ménpiào', en:'buy a ticket in', secs:3.0, mins:8, pay:-15,
                gain:{ mood:6 }, pose:{ type:'stand' },
                done:'十五块，票收好。', doneTr:'Fifteen yuan. Keep hold of the ticket.' },
    '小卖部': { zh:'买瓶水', py:'mǎi píng shuǐ', en:'buy a bottle of water', secs:2.6, mins:6,
                pay:-4, gain:{ food:10, mood:6, rest:4 }, pose:{ type:'stand' },
                done:'四块钱一瓶，园里就这个价。',
                doneTr:'Four yuan a bottle. That is the price inside the gate.' },
  },
  zoo_tropical: {
    ...ZooExpansion.useRows(ZOO_BLUEPRINT, 'zoo_tropical'),
    ...ZooContents.useRows(ZOO_CONTENTS_BLUEPRINT, 'zoo_tropical', ZOO_BLUEPRINT),
  },
  // Campus building labels are doors while the player is outdoors.  Several of those same words
  // deliberately mean something else inside — 食堂 buys a meal, 教室 starts class, 图书馆 opens
  // the legacy reading scene — so the campus must take first refusal here.  Each exterior thing
  // supplies its exact `.exit`; these rows only provide the free, usable entrance action.
  campus: {
    '教室': { zh:'进教学楼', py:'jìn jiàoxuélóu', en:'enter the teaching building', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进教学楼了。', doneTr:'Inside the teaching building.' },
    '图书馆': { zh:'进图书馆', py:'jìn túshūguǎn', en:'enter the library', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进图书馆了。', doneTr:'Inside the library.' },
    '食堂': { zh:'进食堂', py:'jìn shítáng', en:'enter the canteen', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进食堂了。', doneTr:'Inside the canteen.' },
    '宿舍': { zh:'进宿舍', py:'jìn sùshè', en:'enter the residence', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进宿舍了。', doneTr:'Inside the residence.' },
    '行政楼': { zh:'进行政楼', py:'jìn xíngzhènglóu', en:'enter the administration building', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进行政楼了。', doneTr:'Inside the administration building.' },
    '实验楼': { zh:'进实验楼', py:'jìn shíyànlóu', en:'enter the science building', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进实验楼了。', doneTr:'Inside the science building.' },
    '活动中心': { zh:'进活动中心', py:'jìn huódòng zhōngxīn', en:'enter the student centre', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进活动中心了。', doneTr:'Inside the student centre.' },
    '校医院': { zh:'进校医院', py:'jìn xiàoyīyuàn', en:'enter the campus clinic', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进校医院了。', doneTr:'Inside the campus clinic.' },
    '门卫': { zh:'进门卫室', py:'jìn ménwèishì', en:'enter the security room', secs:1.8, mins:2,
              gain:{}, pose:{type:'stand'}, done:'进门卫室了。', doneTr:'Inside the security room.' },
  },
  // The circulation desk already teaches both 借书 and 还书. Keep the transaction as flavour:
  // it costs a few minutes and changes mood, but creates no loan inventory or save-state obligation.
  library: {
    '借书处': { zh:'借书', py:'jiè shū', en:'borrow and return books at the circulation desk', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'reach' },
              done:'登记了，两本，两个星期。上次的还回去了，日期正好。',
              doneTr:'Signed for: two books, two weeks. The last pair went back, and just in time.' },
  },
  // The concourse cash machine belongs to the same account as the branch and mall machines.
  // Keep this local: the metro's 售票机 still follows the ordinary ticket-machine action, while
  // 取款机 opens the live balance/withdrawal panel instead of becoming a vocabulary-only prop.
  metro: {
    '取款机': { zh:'插卡办理', py:'chā kǎ bànlǐ', en:'use the cash machine', secs:1.5, mins:2,
                gain:{}, pose:{ type:'press' }, bankATM:true },
  },
  // ---- 大堂 the lobby of the block, three metres under the flat. These words only exist down
  // here, so they go in the room rather than in USE: 门 and 镜子 already mean the right thing
  // everywhere and are deliberately left alone, because the lobby's front door is the same verb
  // as the flat's front door — 出门, and out into the hutong.
  //
  // The lift button is the ride now, not flavour. `liftCall` runs `World.callLift()` when the
  // press finishes: the car comes if it is on the other floor, and the doors open. Picking the
  // floor is a separate thing you do inside the car — `liftPanel`, below — because on a real one
  // it is, and because the sentence you say at the button is not the sentence you say at the
  // panel. See the note over `callLift` in js/world.js for the whole sequence.
  home: {
    '电梯': { zh:'按电梯', py:'àn diàntī', en:'call the lift', secs:1.6, mins:2,
              gain:{}, liftCall:true, pose:{ type:'press' },
              done:'叮——电梯门开了，进去吧。', doneTr:'Ding — the doors open. Step in.' },
    // Inside the car. Standing in it opens the floor panel on its own; this is how you get it back
    // after dismissing it, and it is the verb that names 操作盘 for anybody reading the wall.
    '按钮': { zh:'按楼层', py:'àn lóucéng', en:'choose a floor', secs:1.2, mins:1,
              gain:{}, liftPanel:true, pose:{ type:'press' },
              done:'按了楼层，门要关了。', doneTr:'Floor pressed — the doors are closing.' },
    // `need` names a thing you have to be carrying. A tenant has their own 门禁卡 from day one —
    // gating your own front door on an item with no way to obtain it would lock the player out of
    // the building — so this refuses only after the card has been lost, which is the one state the
    // sentence is for.
    '门禁': { zh:'刷卡', py:'shuā kǎ', en:'swipe the entry card', secs:1.4, mins:1,
              gain:{}, pose:{ type:'press' },
              need:'门禁卡', noHave:'没带门禁卡，进不去。', noHaveTr:'No entry card — you cannot get in.',
              done:'滴。门开了。', doneTr:'Beep. The door unlocks.' },
    // The lobby resolver deliberately does not fall through to global USE. Keep this local so the
    // tethered dog is usable without making every decorative 狗 in the game inherit a pet action.
    '狗': { zh:'摸狗', py:'mō gǒu', en:'pet the dog', secs:2.4, mins:5,
              gain:{ mood:14 }, pose:{ type:'crouch' },
              done:'狗摇了摇尾巴。', doneTr:'The dog wags its tail.' },
    // A porter is not a greeting. He knows the two things a 门卫 is actually for: which lift is
    // out, and what was delivered while you were at work. `ask` is read by `useLabel`, which picks
    // whichever line is true right now rather than cycling them.
    '门卫室': { zh:'跟保安打招呼', py:'gēn bǎo\'ān dǎ zhāohu', en:'say hello to the porter',
              secs:2.2, mins:3, gain:{ mood:6 }, pose:{ type:'talk' }, talk:true, porter:true,
              ask: [
                ['电梯', '二号梯停用，坐一号梯吧。', 'Number two is out of service — take number one.'],
                ['快递', '你的快递我签收了，在柜子里，取件码发你手机上了。',
                         'I signed for your parcel; it is in the locker and the code is on your phone.'],
              ],
              // ---- recognition (item 313). Challenge, then a nod, then a greeting — and the
              // numbers are not invented for the porter. `at` is `Story.knows` read against the
              // *same* ladder the notebook prints from, js/story.js:32–37: 0 陌生, 1 面熟, 2 朋友.
              // So the moment he stops asking who you are is the same moment the notebook stops
              // calling him a stranger, which is what makes it read as being recognised rather
              // than as a counter passing a number. Ascending; take the last `at` <= knows.
              know: [
                { at:0, zh:'“找谁？”他从玻璃后面抬起头。',
                        en:'"Who are you here for?" He looks up from behind the glass.', mood:0 },
                { at:1, zh:'他认出你了，点了点头，没说话。',
                        en:'He knows the face. A nod, and nothing said.', mood:3 },
                { at:2, zh:'“回来啦？外面冷不冷？”',
                        en:'"Back home? Cold out there?"', mood:6 },
              ],
              // ---- 03:00 is not 15:00 with fewer people (item 329). The booth is manned round
              // the clock — 老陈 has 19:00–07:00 — but manned is not the same as awake, and the
              // window that decides it is HOME_RUSH.夜深 [0, 6], not a second number written here.
              night:'值班室的灯还亮着，保安趴在桌上打盹，没叫醒他。',
              nightTr:'The booth light is still on. The guard is asleep across the desk; you leave him.',
              nightMood:2,
              done:'“回来啦？外面冷不冷？”', doneTr:'"Back home? Cold out there?"' },
    // Both of these used to be a convincing sentence about a system that did not exist: the
    // letterbox always held 一张水费单，一张广告 and the locker always had a parcel in it. They
    // read `HomeLife` now — the water bill in there is the one you have to pay, and the 取件码 is
    // the code of a parcel that was actually sent.
    '信箱': { zh:'看信箱', py:'kàn xìnxiāng', en:'check the letterbox', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'reach' }, mailbox:true,
              done:'一张水费单，一张广告。', doneTr:'A water bill and a flyer.' },
    '快递柜': { zh:'取快递', py:'qǔ kuàidì', en:'collect a parcel', secs:2.6, mins:4,
              gain:{ mood:8 }, pose:{ type:'press' }, locker:true,
              done:'输入取件码，柜门弹开了。', doneTr:'You key in the code and the door pops open.' },
    '包裹': { zh:'看包裹', py:'kàn bāoguǒ', en:'look at the parcels', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'都不是我的。', doneTr:'None of them are mine.' },
    '通知栏': { zh:'看通知', py:'kàn tōngzhī', en:'read the notices', secs:2.8, mins:5,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'周三上午停水，记住了。', doneTr:'Water off Wednesday morning. Noted.' },
    '发财树': { zh:'看发财树', py:'kàn fācáishù', en:'look at the money tree', secs:2.0, mins:3,
              gain:{ mood:4 }, pose:{ type:'stand' },
              done:'叶子擦得干干净净。', doneTr:'Somebody keeps the leaves clean.' },
    // 十二层，还是坐电梯吧 is only funny while the lift works, which is exactly the day it does
    // not (item 250).  `stairs` marks this as the fire stair rather than a sign to read, and
    // `climb` is the action it becomes once `Disrupt.liftOut(day, minutes)` is answering.  The
    // costs are **per storey climbed**, not flat: at A.STOREY 3.10 m a flat charge makes floor 11
    // the same as floor 3 and the tower pointless (item 251).  So `useLabel` multiplies each
    // `*PerFloor` by |deck − target| and rounds; the numbers below are one flight, carrying
    // something, not an athlete's.  Eleven storeys is then ~13 分钟 and −35 rest, which is a
    // real reason to wait for the lift and a survivable answer when there is no lift to wait for.
    '安全出口': { zh:'看楼梯', py:'kàn lóutī', en:'look at the stairs', secs:1.8, mins:2,
              gain:{}, pose:{ type:'stand' }, stairs:true,
              climb: { zh:'爬楼梯', py:'pá lóutī', en:'climb the stairs', secs:2.4,
                       pose:{ type:'walk' },
                       minsPerFloor:1.2, restPerFloor:-3.2, moodPerFloor:-1.1, secsPerFloor:0.24,
                       // Said on arrival. The second pair is for a long climb — `highFrom` is how
                       // many storeys makes it long, so the wording is not the same for one flight
                       // as for eleven.
                       done:'一层一层爬上来的。', doneTr:'Up it, one floor at a time.',
                       highFrom:6,
                       high:'爬到楼上，腿有点软，喘了半天。',
                       highTr:'You get there with your legs shaking and stand a while getting your breath back.' },
              // What the sign says when the lift is out — the joke inverts rather than repeats.
              outDone:'电梯停了，只能爬。', outDoneTr:'The lift is out. It is the stairs or nothing.',
              // Night. The stairwell is on a sensor, so the light arrives a beat after you do.
              night:'楼道灯是声控的，走两步才亮。',
              nightTr:'The stairwell light is sound-triggered — it comes on a step after you do.',
              done:'十二层，还是坐电梯吧。', doneTr:'Twelve floors. The lift, then.' },
    '消防栓': { zh:'看消防栓', py:'kàn xiāofángshuān', en:'look at the fire hydrant', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'玻璃后面是水带和阀门。', doneTr:'Behind the glass, a hose and a valve.' },
  },
  firestation: {
    '消防车': { zh:'看看消防车', py:'kànkan xiāofángchē', en:'inspect the fire engine', secs:2.2, mins:4,
              gain:{ mood:5 }, pose:{ type:'stand' },
              done:'水泵、水带、云梯和救援工具都在车上。',
              doneTr:'Pump, hose, ladder and rescue tools are all carried on the appliance.' },
    '车库': { zh:'看看车库', py:'kànkan chēkù', en:'look through the appliance hall', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'三条出车线一直通到门外。', doneTr:'All three turnout lanes run straight to the doors.' },
    '车库门': { zh:'看车库门', py:'kàn chēkùmén', en:'inspect the appliance-bay door', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'分节门沿着两侧轨道升到梁下。', doneTr:'The sectional door rises on tracks beneath the lintel.' },
    '装备架': { zh:'看装备', py:'kàn zhuāngbèi', en:'inspect the turnout rack', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'防护服、头盔和靴子按车组排好了。',
              doneTr:'Protective clothing, helmets and boots are arranged by crew.' },
    '空气呼吸器': { zh:'看呼吸器', py:'kàn hūxīqì', en:'inspect the breathing apparatus', secs:2.0, mins:3,
              gain:{}, pose:{ type:'stand' },
              done:'气瓶已经充满，面罩也检查过了。',
              doneTr:'The cylinders are charged and the masks have been checked.' },
    '水带': { zh:'看水带', py:'kàn shuǐdài', en:'inspect the fire hose', secs:1.8, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'洗过的水带卷好以后才能重新上车。',
              doneTr:'Washed hose is rolled before it goes back on the appliance.' },
    '值班室': { zh:'问值班员', py:'wèn zhíbānyuán', en:'ask the watch room', secs:2.2, mins:4,
              gain:{ mood:4 }, pose:{ type:'talk' },
              done:'接警台二十四小时有人值班。', doneTr:'The watch desk is staffed around the clock.' },
    '训练室': { zh:'看训练安排', py:'kàn xùnliàn ānpái', en:'read the training board', secs:2.0, mins:4,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'上午练器材，下午练救援。', doneTr:'Equipment drill in the morning, rescue drill in the afternoon.' },
    '洗消间': { zh:'看洗消间', py:'kàn xǐxiāojiān', en:'inspect the decontamination room', secs:1.8, mins:3,
              gain:{}, pose:{ type:'stand' },
              done:'脏装备从这里清洗，不带进生活区。',
              doneTr:'Dirty equipment is cleaned here and never carried into the living area.' },
    '消防栓': { zh:'看消防栓', py:'kàn xiāofángshuān', en:'inspect the hydrant connection', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'接口、水带和阀门都没有被挡住。',
              doneTr:'Connection, hose and valve are all unobstructed.' },
    '灭火器': { zh:'看压力表', py:'kàn yālìbiǎo', en:'check the extinguisher gauge', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'指针在绿色区域，铅封也完好。', doneTr:'The needle is in the green and the seal is intact.' },
    '工作台': { zh:'看检修工具', py:'kàn jiǎnxiū gōngjù', en:'inspect the maintenance tools', secs:1.8, mins:3,
              gain:{ mood:2 }, pose:{ type:'stand' },
              done:'台钳、扳手和量具都回到了标记位置。',
              doneTr:'Vice, spanners, and gauges are back in their marked positions.' },
    '清洗消毒': { zh:'看洗消设备', py:'kàn xǐxiāo shèbèi', en:'inspect the decontamination sink', secs:1.8, mins:3,
              gain:{}, pose:{ type:'stand' },
              done:'冲淋、洗眼器和地漏都保持畅通。',
              doneTr:'Shower, eyewash, and floor drain are all kept clear.' },
    '调度值班室': { zh:'看出勤状态', py:'kàn chūqín zhuàngtài', en:'check response status', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'两辆车待命，无线电频道正常。',
              doneTr:'Two appliances are ready and the radio channel is clear.' },
    '报警器': { zh:'检查报警器', py:'jiǎnchá bàojǐngqì', en:'inspect the alarm point', secs:1.5, mins:2,
              gain:{}, pose:{ type:'stand' },
              done:'测试灯正常，非紧急情况不要按。',
              doneTr:'The test lamp is normal; do not press except in an emergency.' },
    '访客登记': { zh:'登记', py:'dēngjì', en:'sign the visitor register', secs:2.2, mins:3,
              gain:{ mood:2 }, pose:{ type:'write' },
              done:'姓名和来访时间写好了。', doneTr:'Name and arrival time recorded.' },
  },
  mall: {
    '喷泉': { zh:'看喷泉', py:'kàn pēnquán', en:'watch the fountain', secs:2.8, mins:8,
              gain:{ mood:12, rest:4 }, pose:{ type:'stand' },
              done:'水声让人安静下来。', doneTr:'The sound of the water settles everything down.' },
    '服务台': { zh:'问路', py:'wèn lù', en:'ask for directions', secs:2.5, mins:5,
              gain:{ mood:4 }, pose:{ type:'talk' },
              done:'美食广场在三楼，电影院也在三楼。', doneTr:'The food court is on level three, and so is the cinema.' },
    '商场地图': { zh:'看地图', py:'kàn dìtú', en:'read the mall directory', secs:2.2, mins:4,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'一楼服装数码，二楼美妆书店，三楼美食电影。',
              doneTr:'Fashion and digital on one, beauty and books on two, food and film on three.' },
    '扶梯': { zh:'坐扶梯', py:'zuò fútī', en:'ride the escalator', secs:5.4, mins:6,
              mallRide:true, gain:{ mood:5 }, pose:{ type:'stand' },
              done:'上来了。', doneTr:'Up you go.' },
    '电梯': { zh:'乘电梯', py:'chéng diàntī', en:'choose a floor', secs:1.6, mins:3,
              gain:{}, mallLift:true, pose:{ type:'press' },
              done:'请选择楼层。', doneTr:'Choose a floor.' },
    '服装店': { zh:'试衣服', py:'shì yīfu', en:'try on an outfit', secs:3.2, mins:18, pay:-68,
              gain:{ clean:5, mood:17 }, pose:{ type:'open', hold:'shirt' }, wear:true,
              done:'很合身，就买这件。', doneTr:'It fits well — I’ll take it.' },
    '电子产品': { zh:'试用手机', py:'shìyòng shǒujī', en:'try the new phone', secs:2.5, mins:10,
              gain:{ mood:10 }, pose:{ type:'phone', hold:'phone' },
              done:'摄像头很清楚，但是太贵了。', doneTr:'The camera is sharp, but it is too expensive.' },
    // Food-court meals are chosen in two conversational steps: what to eat, then the choice the
    // server actually asks (spice, noodle width, soup base, sauce or sweetness). Money and needs
    // move only after that conversation has a definite order; game.js owns the picker and table.
    '美食广场': { zh:'看看吃什么', py:'kànkan chī shénme', en:'choose a food-court stall', secs:1.6, mins:2,
              gain:{}, pose:{ type:'talk' }, mallFoodHall:true,
              done:'先选一家，再点菜。', doneTr:'Choose a stall, then order a dish.' },
    '川味小馆': { zh:'点菜', py:'diǎn cài', en:'order Sichuan food', secs:1.8, mins:2,
              gain:{}, pose:{ type:'talk' }, mallFood:true,
              done:'今天想吃点什么？', doneTr:'What would you like today?' },
    '面馆': { zh:'点一碗面', py:'diǎn yì wǎn miàn', en:'order a bowl of noodles', secs:1.8, mins:2,
              gain:{}, pose:{ type:'talk' }, mallFood:true,
              done:'面要多宽？', doneTr:'How wide would you like the noodles?' },
    '火锅': { zh:'点火锅', py:'diǎn huǒguō', en:'order hot pot', secs:1.8, mins:2,
              gain:{}, pose:{ type:'talk' }, mallFood:true,
              done:'锅底要什么口味？', doneTr:'Which soup base would you like?' },
    '烧腊': { zh:'点烧腊', py:'diǎn shāolà', en:'order Cantonese roast meat', secs:1.8, mins:2,
              gain:{}, pose:{ type:'talk' }, mallFood:true,
              done:'要不要加汁？', doneTr:'Would you like sauce on it?' },
    // The box office sells you the ticket; watching it happens in 一号厅, in a seat.
    // No fixed price here any more: the box office opens the day's programme and the money moves
    // when you pick a screening out of it, which is also where the seat number is issued.
    '电影院': { zh:'买电影票', py:'mǎi diànyǐngpiào', en:'buy a ticket', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'talk' }, mallTicket:true,
              done:'票买好了，一号厅。', doneTr:'Ticket bought — screen one.' },
    '一号厅': { zh:'进场', py:'jìnchǎng', en:'enter screen one', secs:1.8, mins:2,
              gain:{}, pose:{ type:'stand' }, mallCinemaDoor:true,
              done:'检票了，进去找座位。', doneTr:'Ticket checked — go in and find your seat.' },
    '游戏厅': { zh:'看看游戏', py:'kànkan yóuxì', en:'choose an arcade game', secs:1.6, mins:2,
              gain:{}, pose:{ type:'stand' }, mallArcadeLobby:true,
              done:'选一台机器吧。', doneTr:'Choose a machine.' },
    '投币': { zh:'投币开始', py:'tóubì kāishǐ', en:'start the cabinet game', secs:1.4, mins:1,
              gain:{}, pose:{ type:'press' }, mallArcade:true,
              done:'准备开始。', doneTr:'Get ready.' },
    '兑奖': { zh:'用彩票兑奖', py:'yòng cǎipiào duìjiǎng', en:'trade tickets for a prize', secs:1.6, mins:2,
              gain:{}, pose:{ type:'reach' }, mallPrize:true,
              done:'看看能换什么。', doneTr:'See which prizes you can afford.' },
    '娃娃机': { zh:'夹娃娃', py:'jiā wáwa', en:'play the claw machine', secs:1.4, mins:1,
              gain:{}, pose:{ type:'press' }, mallArcade:true,
              done:'看准了再下爪。', doneTr:'Line it up before dropping the claw.' },
    '赛车': { zh:'玩赛车', py:'wán sàichē', en:'play the racing game', secs:1.4, mins:1,
              gain:{}, pose:{ type:'press' }, mallArcade:true,
              done:'三、二、一，出发！', doneTr:'Three, two, one — go!' },
    '跳舞机': { zh:'玩跳舞机', py:'wán tiàowǔjī', en:'play the dance machine', secs:1.4, mins:1,
              gain:{}, pose:{ type:'stand' }, mallArcade:true,
              done:'跟着箭头踩。', doneTr:'Follow the arrows.' },
    '中庭活动': { zh:'参加活动', py:'cānjiā huódòng', en:'join the atrium event', secs:2.4, mins:8,
              gain:{ mood:8 }, pose:{ type:'stand' }, mallEvent:true,
              done:'活动开始了。', doneTr:'The event is starting.' },
    '集章册': { zh:'打开集章册', py:'dǎkāi jízhāngcè', en:'open the mall stamp passport', secs:1.2, mins:1,
              gain:{}, pose:{ type:'open', hold:'book' }, mallPassport:true,
              done:'看看还差哪一枚章。', doneTr:'See which stamp is still missing.' },
    '儿童乐园': { zh:'看看', py:'kànkan', en:'watch the children play', secs:2.4, mins:8,
              gain:{ mood:10 }, pose:{ type:'stand' },
              done:'小朋友玩得很开心。', doneTr:'The children are having a wonderful time.' },
    '休息区': { zh:'坐下休息', py:'zuòxia xiūxi', en:'rest on the lounge seat', secs:3.2, mins:25,
              gain:{ rest:18, mood:8 }, pose:{ type:'sit', seatY:.55 },
              done:'坐了一会儿，腿不酸了。', doneTr:'After a short rest, my legs feel better.' },
    '美妆店': { zh:'试用口红', py:'shìyòng kǒuhóng', en:'try the cosmetics', secs:2.8, mins:12, pay:-28,
              gain:{ mood:15, clean:4 }, pose:{ type:'open' },
              done:'颜色很好看，买了一支。', doneTr:'The colour looks good, so I bought one.' },
    '运动店': { zh:'试运动鞋', py:'shì yùndòngxié', en:'try the trainers', secs:3.0, mins:15,
              gain:{ mood:11 }, pose:{ type:'stand' },
              done:'走起来很轻。', doneTr:'They feel light to walk in.' },
    '家居店': { zh:'看看家具', py:'kànkan jiājù', en:'browse the furniture', secs:3.0, mins:18,
              gain:{ mood:10, rest:5 }, pose:{ type:'stand' },
              done:'那张沙发比家里的舒服。', doneTr:'That sofa is more comfortable than mine.' },
    '书店': { zh:'看书', py:'kàn shū', en:'browse the bookshop', secs:3.8, mins:35, pay:-26,
              gain:{ mood:18, rest:7 }, pose:{ type:'stand', hold:'book' },
              done:'买了一本有拼音的小说。', doneTr:'I bought a novel with pinyin.' },
    // Individual shop fixtures. The big storefront label remains a quick "browse/buy" action;
    // these are free or inexpensive demonstrations, so a player with only a few kuai can still
    // spend time in the mall and learn the objects instead of being turned away by every price.
    '衣服': { zh:'挑衣服', py:'tiāo yīfu', en:'browse the clothes rail', secs:2.6, mins:10,
              gain:{ mood:7 }, pose:{ type:'open', hold:'shirt' },
              done:'颜色很多，我先挑了两件。', doneTr:'Lots of colours — I picked two to try.' },
    '试衣间': { zh:'试穿衣服', py:'shìchuān yīfu', en:'use the fitting room', secs:3.3, mins:14,
              gain:{ mood:10, clean:2 }, pose:{ type:'open', hold:'shirt' },
              done:'尺码合适，活动也方便。', doneTr:'The size fits and it is easy to move in.' },
    '镜子': { zh:'照镜子', py:'zhào jìngzi', en:'check the outfit in the mirror', secs:2.0, mins:4,
              gain:{ mood:6 }, pose:{ type:'stand' },
              done:'灯光很好，颜色看得很清楚。', doneTr:'Good lighting — the colour is easy to see.' },
    '手机': { zh:'试拍照片', py:'shì pāi zhàopiàn', en:'test the phone camera', secs:2.5, mins:7,
              gain:{ mood:8 }, pose:{ type:'phone', hold:'phone' },
              done:'夜景模式拍得很清楚。', doneTr:'The night mode takes a very clear picture.' },
    '耳机': { zh:'试听音乐', py:'shìtīng yīnyuè', en:'listen to the headphones', secs:3.2, mins:12,
              gain:{ mood:14, rest:3 }, pose:{ type:'stand' },
              done:'低音很好，外面的声音小了。', doneTr:'Strong bass, and the mall sounds fade away.' },
    '游戏机': { zh:'试玩游戏', py:'shìwán yóuxì', en:'play the console demo', secs:3.4, mins:15,
              gain:{ mood:18 }, pose:{ type:'press' },
              done:'试玩关卡过了，分数还不错。', doneTr:'Demo level cleared — not a bad score.' },
    '口红': { zh:'试口红', py:'shì kǒuhóng', en:'try a lipstick sample', secs:2.2, mins:8,
              gain:{ mood:10, clean:2 }, pose:{ type:'open' },
              done:'这个颜色很自然。', doneTr:'This colour looks very natural.' },
    '香水': { zh:'试香水', py:'shì xiāngshuǐ', en:'sample the perfume', secs:2.0, mins:5,
              gain:{ mood:9 }, pose:{ type:'open' },
              done:'先是柑橘味，过一会儿变得很柔和。', doneTr:'Citrus first, then it softens after a moment.' },
    '运动鞋': { zh:'试穿运动鞋', py:'shìchuān yùndòngxié', en:'try the trainers', secs:3.0, mins:12,
              gain:{ mood:8 }, pose:{ type:'stand' },
              done:'鞋底很轻，走起来不响。', doneTr:'Light soles, and quiet to walk in.' },
    '篮球': { zh:'试拍篮球', py:'shì pāi lánqiú', en:'test-bounce the basketball', secs:2.8, mins:8,
              gain:{ mood:12, rest:-2 }, pose:{ type:'press' },
              done:'弹性不错，大小也正好。', doneTr:'Good bounce and the size feels right.' },
    '跑步机': { zh:'试跑一下', py:'shìpǎo yíxià', en:'test the treadmill', secs:4.0, mins:18,
              gain:{ mood:10, rest:-7, clean:-3 }, pose:{ type:'stand' },
              done:'跑了十分钟，机器很稳。', doneTr:'Ten minutes running; the machine feels solid.' },
    '沙发': { zh:'试坐沙发', py:'shìzuò shāfā', en:'try the showroom sofa', secs:3.2, mins:12,
              gain:{ rest:13, mood:7 }, pose:{ type:'sit', seatY:.55 },
              done:'坐垫很软，靠背也刚好。', doneTr:'Soft cushion and the back is just right.' },
    '台灯': { zh:'试调亮度', py:'shìtiáo liàngdù', en:'try the lamp settings', secs:1.8, mins:3,
              gain:{ mood:4 }, pose:{ type:'press' },
              done:'暖光、白光和阅读光，三种都试了。', doneTr:'Warm, white and reading light — all three tested.' },
    '家具': { zh:'比较材料', py:'bǐjiào cáiliào', en:'compare furniture samples', secs:2.7, mins:9,
              gain:{ mood:6 }, pose:{ type:'stand' },
              done:'还是原木摸起来最舒服。', doneTr:'The natural wood feels best.' },
    '书': { zh:'读几页书', py:'dú jǐ yè shū', en:'read a few pages', secs:3.5, mins:25,
              gain:{ mood:13, rest:6 }, pose:{ type:'stand', hold:'book' },
              done:'故事不难，生词也不多。', doneTr:'The story is not difficult and has few new words.' },
    '杂志': { zh:'翻翻杂志', py:'fānfān zázhì', en:'browse a magazine', secs:2.8, mins:15,
              gain:{ mood:9, rest:3 }, pose:{ type:'stand', hold:'book' },
              done:'看了城市版和旅行版。', doneTr:'I read the city and travel sections.' },
    '咖啡': { zh:'买杯咖啡', py:'mǎi bēi kāfēi', en:'buy a coffee', secs:2.7, mins:12, pay:-16,
              gain:{ mood:11, rest:8, food:5 }, pose:{ type:'eat' },
              done:'一边看书一边喝咖啡。', doneTr:'Coffee while reading a book.' },
    // ---- everything the building grew when it grew to three floors. Most of these are free or
    // cheap: a player with forty kuai should still be able to spend an afternoon in here.
    '珠宝店': { zh:'看珠宝', py:'kàn zhūbǎo', en:'look at the jewellery', secs:2.6, mins:10,
              gain:{ mood:8 }, pose:{ type:'stand' },
              done:'看看就好，这个价钱买不起。', doneTr:'Just looking — not at that price.' },
    '项链': { zh:'试戴项链', py:'shìdài xiàngliàn', en:'try the necklace on', secs:2.4, mins:8,
              gain:{ mood:11 }, pose:{ type:'reach' },
              done:'银的比金的更配这件衣服。', doneTr:'The silver one suits this outfit better.' },
    '鞋店': { zh:'逛鞋店', py:'guàng xiédiàn', en:'browse the shoe shop', secs:2.8, mins:14,
              gain:{ mood:9 }, pose:{ type:'stand' },
              done:'鞋子太多了，挑不出来。', doneTr:'Too many shoes to choose from.' },
    '鞋': { zh:'试鞋', py:'shì xié', en:'try the shoes on', secs:2.9, mins:12,
              gain:{ mood:9 }, pose:{ type:'stand' },
              done:'四十二码正好。', doneTr:'A forty-two fits perfectly.' },
    '眼镜店': { zh:'问眼镜', py:'wèn yǎnjìng', en:'ask about glasses', secs:2.6, mins:12,
              gain:{ mood:6 }, pose:{ type:'talk' },
              done:'验光是免费的，配镜要一个小时。',
              doneTr:'The eye test is free; the lenses take an hour.' },
    '眼镜': { zh:'试戴眼镜', py:'shìdài yǎnjìng', en:'try a pair of frames', secs:2.2, mins:7,
              gain:{ mood:8 }, pose:{ type:'reach' },
              done:'这副圆的显得脸小一点。', doneTr:'The round ones make your face look smaller.' },
    '花店': { zh:'买花', py:'mǎi huā', en:'buy a bunch of flowers', secs:2.6, mins:10, pay:-35,
              gain:{ mood:20 }, pose:{ type:'reach', hold:'bag' },
              done:'包好了，带回家插在窗台上。',
              doneTr:'Wrapped up — they can go on the windowsill at home.' },
    '花': { zh:'闻一闻', py:'wén yi wén', en:'smell the flowers', secs:1.8, mins:4,
              gain:{ mood:9 }, pose:{ type:'stand' },
              done:'百合的味道最重。', doneTr:'The lilies are the strongest.' },
    '咖啡店': { zh:'点咖啡', py:'diǎn kāfēi', en:'order at the café', secs:2.8, mins:15, pay:-22,
              gain:{ mood:13, rest:10, food:6 }, pose:{ type:'eat' },
              done:'坐下来喝完，看着人来人往。',
              doneTr:'You sit and finish it, watching everyone go by.' },
    '奶茶': { zh:'买奶茶', py:'mǎi nǎichá', en:'buy a bubble tea', secs:2.5, mins:12, pay:-18,
              gain:{ mood:16, food:12 }, pose:{ type:'eat' },
              done:'珍珠很有嚼劲。', doneTr:'The pearls are properly chewy.' },
    '取款机': { zh:'取钱', py:'qǔ qián', en:'check the cash machine', secs:2.0, mins:5,
              gain:{}, pose:{ type:'press' },
              done:'余额还够，这个月省着点。',
              doneTr:'Enough in there — but go carefully this month.' },
    '自动售货机': { zh:'买饮料', py:'mǎi yǐnliào', en:'buy a drink', secs:1.8, mins:4, pay:-5,
              gain:{ food:8, mood:5 }, pose:{ type:'press' },
              done:'咣当一声，冰的。', doneTr:'It clunks out, ice cold.' },
    '旋转木马': { zh:'看旋转木马', py:'kàn xuánzhuǎn mùmǎ', en:'watch the carousel', secs:2.6, mins:8,
              gain:{ mood:14 }, pose:{ type:'stand' },
              done:'转了一圈又一圈，小孩都不肯下来。',
              doneTr:'Round and round; none of the children will get off.' },
    '玩具店': { zh:'逛玩具店', py:'guàng wánjùdiàn', en:'browse the toy shop', secs:2.8, mins:14,
              gain:{ mood:12 }, pose:{ type:'stand' },
              done:'给小侄子挑了一个。', doneTr:'You pick one out for your nephew.' },
    '玩具': { zh:'玩一下', py:'wán yíxià', en:'play with the display toy', secs:2.2, mins:6,
              gain:{ mood:10 }, pose:{ type:'press' },
              done:'按一下就唱歌，停不下来。',
              doneTr:'One press and it sings, and does not stop.' },
    '宠物店': { zh:'看宠物', py:'kàn chǒngwù', en:'look in the pet shop', secs:2.6, mins:9,
              gain:{ mood:15 }, pose:{ type:'stand' },
              done:'看了很久，最后还是走了。',
              doneTr:'You look for a long time, and then you leave.' },
    '小狗': { zh:'看小狗', py:'kàn xiǎogǒu', en:'watch the puppies', secs:2.4, mins:7,
              gain:{ mood:18 }, pose:{ type:'stand' },
              done:'那只白的一直用爪子扒玻璃。',
              doneTr:'The white one keeps pawing at the glass.' },
    '天桥': { zh:'看中庭', py:'kàn zhōngtíng', en:'look down over the atrium', secs:2.6, mins:7,
              gain:{ mood:12, rest:4 }, pose:{ type:'stand' },
              done:'从上面看，喷泉小了一圈。',
              doneTr:'From up here the fountain looks half the size.' },
    '二楼': { zh:'逛二楼', py:'guàng èrlóu', en:'take in level two', secs:2.4, mins:10,
              gain:{ mood:8 }, pose:{ type:'stand' },
              done:'一圈走下来，记住了四家店。',
              doneTr:'One lap round, and you remember four of the shops.' },
    '三楼': { zh:'逛三楼', py:'guàng sānlóu', en:'take in level three', secs:2.4, mins:10,
              gain:{ mood:8 }, pose:{ type:'stand' },
              done:'整层楼都是吃的味道。', doneTr:'The whole floor smells of food.' },
    '爆米花': { zh:'买爆米花', py:'mǎi bàomǐhuā', en:'buy popcorn', secs:2.0, mins:6, pay:-20,
              gain:{ food:16, mood:10 }, pose:{ type:'reach', hold:'bag' },
              done:'一大桶，甜的。', doneTr:'A big tub of it, the sweet kind.' },
    '餐厅': { zh:'吃饭', py:'chīfàn', en:'have a meal', secs:4.0, mins:45, pay:-58,
              gain:{ food:78, mood:18, rest:6 }, pose:{ type:'eat', hold:'meal' },
              done:'麻婆豆腐配米饭，吃得很饱。',
              doneTr:'Mapo tofu with rice, and you are properly full.' },
    '菜单': { zh:'看菜单', py:'kàn càidān', en:'read the menu', secs:2.2, mins:5,
              gain:{ mood:4 }, pose:{ type:'stand' },
              done:'看懂了三个菜名。', doneTr:'You worked out three of the dish names.' },
    '甜品店': { zh:'吃甜品', py:'chī tiánpǐn', en:'stop for a dessert', secs:2.8, mins:20, pay:-30,
              gain:{ food:22, mood:20 }, pose:{ type:'eat' },
              done:'芒果班戟，甜得刚好。', doneTr:'Mango pancake — exactly sweet enough.' },
    '甜品': { zh:'挑一个', py:'tiāo yí ge', en:'pick one out of the case', secs:1.8, mins:5,
              gain:{ mood:8 }, pose:{ type:'stand' },
              done:'看了半天，还是要芒果的。',
              doneTr:'After all that looking, the mango one again.' },
    '面包店': { zh:'买面包', py:'mǎi miànbāo', en:'buy something from the bakery', secs:2.4, mins:12,
              pay:-16, gain:{ food:26, mood:10 }, pose:{ type:'reach', hold:'bag' },
              done:'还是热的。', doneTr:'Still warm.' },
    '面包': { zh:'挑面包', py:'tiāo miànbāo', en:'choose a loaf', secs:2.0, mins:6,
              gain:{ mood:6 }, pose:{ type:'reach' },
              done:'夹了两个牛角包。', doneTr:'You put two croissants on the tray.' },
    '排片表': { zh:'看排片表', py:'kàn páipiànbiǎo', en:'read the showtimes', secs:2.2, mins:4,
              gain:{ mood:4 }, pose:{ type:'stand' }, mallShows:true,
              done:'今天的场次都写在上面。', doneTr:'The whole day is up there.' },
    '银幕': { zh:'看银幕', py:'kàn yínmù', en:'look at the screen', secs:1.8, mins:3,
              gain:{ mood:6 }, pose:{ type:'stand' },
              done:'广告还在放，正片还没开始。',
              doneTr:'Still the adverts; the film has not started.' },
    // Sitting down in 一号厅 is how you actually watch it, and what is showing depends on the hour.
    // No price on the seat. The box office above already charges ¥45 for the ticket, and this
    // charged ¥45 again to sit down in the room the ticket is for — ¥90 for one screening, with the
    // ticket itself never looked at, so you could also walk past the box office and watch for ¥45.
    // The seat now costs nothing and asks to see the ticket instead, which is what a seat does.
    '座位': { zh:'看电影', py:'kàn diànyǐng', en:'watch the film', secs:5.0, mins:120,
              gain:{ mood:38, rest:13 }, pose:{ type:'sit', seatY:.48 }, mallFilm:true,
              done:'灯暗下来了。', doneTr:'The lights go down.' },
    // The cart and basket corral by the door. A cart is something you wheel, not carry, so it is a
    // short flavour action rather than a held item; the basket mirrors the shop's take-basket verb.
    '购物车': { zh:'推购物车', py:'tuī gòuwùchē', en:'wheel a shopping cart', secs:2.2, mins:4,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'推着车逛，轻松多了。', doneTr:'Shopping is easier with a cart.' },
    '购物篮': { zh:'拿购物篮', py:'ná gòuwùlán', en:'pick up a hand basket', secs:1.6, mins:1,
              gain:{}, pose:{ type:'lift' },
              done:'拎着篮子，方便拿东西。', doneTr:'A basket makes it easier to carry things.' },
  },
  // The same trolley is useful in the actual hypermarket, not only in the shopping centre. Keep
  // this room-local so another future 购物车 fixture does not silently inherit supermarket behaviour.
  market: {
    '购物车': { zh:'推购物车', py:'tuī gòuwùchē', en:'wheel a shopping cart', secs:2.2, mins:4,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'推着车逛，轻松多了。', doneTr:'Shopping is easier with a cart.' },
  },
  // ---- 青禾银行.  Every fixture in the authored branch resolves here before the global table,
  // which is especially important for 柜台: globally that word belongs to the chemist and opens
  // the symptom picker.  These rows only describe the physical action.  game.js supplies the
  // live queue/account status and commits money only after the player confirms an amount.
  bank: {
    '单子': { zh:'填单子', py:'tián dānzi', en:'choose and fill in a banking slip', secs:2.0, mins:3,
              gain:{}, pose:{ type:'write', hold:'book' }, bankForms:true },
    '排队': { zh:'排队等候', py:'páiduì děnghòu', en:'wait for your queue number', secs:2.8, mins:6,
              gain:{ rest:2 }, pose:{ type:'stand' }, bankWait:true },
    '取号机': { zh:'取号', py:'qǔ hào', en:'take a queue number', secs:1.5, mins:1,
              gain:{}, pose:{ type:'press' }, bankTicket:true },
    '叫号': { zh:'看叫号', py:'kàn jiàohào', en:'check the queue display', secs:1.2, mins:1,
              gain:{}, pose:{ type:'stand' }, bankCallBoard:true },
    '等候': { zh:'坐下等候', py:'zuòxia děnghòu', en:'sit down and wait to be called', secs:3.0, mins:6,
              gain:{ rest:3 }, pose:{ type:'sit', at:[-4.1,-1.7], yaw:0, seatY:.47 }, bankWait:true },
    '开户': { zh:'办理开户', py:'bànlǐ kāihù', en:'open a bank account', secs:2.6, mins:8,
              gain:{ mood:3 }, pose:{ type:'talk' }, bankOpenAccount:true },
    '身份证': { zh:'出示身份证', py:'chūshì shēnfènzhèng', en:'present your ID card', secs:1.5, mins:1,
              gain:{}, pose:{ type:'reach', hold:'card' }, bankShowId:true },
    '柜台': { zh:'办理业务', py:'bànlǐ yèwù', en:'choose a teller transaction', secs:2.2, mins:3,
              gain:{}, pose:{ type:'talk' }, bankCounter:true },
    '存款': { zh:'办理存款', py:'bànlǐ cúnkuǎn', en:'deposit cash at the teller', secs:2.4, mins:4,
              gain:{}, pose:{ type:'reach', hold:'card' }, bankTeller:'deposit' },
    '取款': { zh:'办理取款', py:'bànlǐ qǔkuǎn', en:'withdraw cash at the teller', secs:2.4, mins:4,
              gain:{}, pose:{ type:'reach', hold:'card' }, bankTeller:'withdraw' },
    '取款机': { zh:'插卡办理', py:'chā kǎ bànlǐ', en:'use the cash machine', secs:1.5, mins:2,
              gain:{}, pose:{ type:'press' }, bankATM:true },
    '卡': { zh:'插银行卡', py:'chā yínhángkǎ', en:'insert your bank card', secs:1.4, mins:1,
              gain:{}, pose:{ type:'press', hold:'card' }, bankATM:true },
    // The account desk also authors a thing labelled 卡.  Its `bankUse` marker selects this row
    // before the ordinary place/word lookup, so a staffed card desk never masquerades as an ATM.
    cardDesk: { zh:'办理银行卡', py:'bànlǐ yínhángkǎ', en:'handle bank-card services at the desk',
              secs:2.2, mins:5, gain:{ mood:1 }, pose:{ type:'talk' }, bankCardService:true },
    '理财': { zh:'了解理财', py:'liǎojiě lǐcái', en:'read the savings and risk guide', secs:2.0, mins:5,
              gain:{ mood:2 }, pose:{ type:'talk' }, bankWealth:true },
    '贵宾': { zh:'问贵宾服务', py:'wèn guìbīn fúwù', en:'ask about VIP banking', secs:1.8, mins:3,
              gain:{}, pose:{ type:'talk' }, bankVip:true },
    '保险箱': { zh:'问保管箱', py:'wèn bǎoguǎnxiāng', en:'ask about safe-deposit boxes', secs:2.0, mins:4,
              gain:{}, pose:{ type:'talk' }, bankSafe:true },
    '内部': { zh:'不能进去', py:'bù néng jìnqu', en:'staff only', secs:1.0, mins:1,
              gain:{}, pose:{ type:'stand' },
              block:'内部办公区，闲人免进。', blockTr:'Staff area — no admittance.' },
  },
  // ---- 成都. Two words in this lane already mean something else somewhere else, and the room
  // gets first refusal on a word — which is the whole reason USE_AT exists. 熊猫 in the 动物园
  // is a live animal you stand and watch for half an hour; in 宽窄巷子 it is a stone one on a
  // plinth that everybody photographs and nobody looks at for more than a minute. 火锅 in the
  // shopping centre is a chain restaurant with a queue ticket; here it is the thing the city is
  // known for, and it costs more and takes longer and you will smell of it tomorrow.
  chengdu: {
    '熊猫': { zh:'拍张照', py:'pāi zhāng zhào', en:'photograph it, like everybody else does',
              secs:2.6, mins:6, gain:{ mood:16 }, pose:{ type:'stand' },
              done:'排在三个人后面，拍了一张。',
              doneTr:'Third in the queue for it, and you got your photograph.' },
    '火锅': { zh:'吃火锅', py:'chī huǒguō', en:'a split pot, and two hours of it', secs:4.6,
              mins:70, pay:-92, gain:{ food:86, mood:26, clean:-10 },
              pose:{ type:'eat', hold:'meal' },
              done:'辣得说不出话，衣服上明天还有味儿。',
              doneTr:'Too hot to speak, and your clothes will smell of it tomorrow.' },
  },
  diner: {
    // The hot bowl on the pass is the shortest physical route into the same ordering flow as the
    // waitress. `orderUp` deliberately leaves the menu, price, kitchen timer, service and table
    // state with game.js; this fixture only opens that existing decision instead of inventing a
    // second instant-meal path beside it.
    '牛肉面': { zh:'点一碗', py:'diǎn yì wǎn', en:'order a bowl of beef noodles', secs:1.2, mins:1,
              orderUp:true, gain:{}, pose:{ type:'reach' } },
    '鱼缸': { zh:'看鱼', py:'kàn yú', en:'watch the fish', secs:2.6, mins:5,
              gain:{ mood:10, rest:3 }, pose:{ type:'stand' },
              done:'看了一会儿，安静多了。', doneTr:'A minute watching them, and everything feels quieter.' },
    '服务铃': { zh:'按铃', py:'àn líng', en:'ring the counter bell', secs:.8, mins:1,
              dinerBell:true, gain:{}, pose:{ type:'reach' },
              done:'叮！服务员听见了。', doneTr:'Ding! The waitress heard it.' },
  },
  // On board. 座位 in here is not the train's two-minute sit — it is the thing that starts the
  // flight, and it only starts it in the seat on your card.
  cabin: {
    '座位': { zh:'坐下', py:'zuò xià', en:'take your seat', secs:2.4, mins:2,
              cabinSit:true, pose:{ type:'sit', seatY:.50 },
              done:'坐好了。', doneTr:'Settled in.' },
    // Quicker than the terminal's, because there is a queue of one behind you and you know it.
    '洗手间': { zh:'上厕所', py:'shàng cèsuǒ', en:'use the lavatory', secs:2.6, mins:6,
              gain:{ toilet:100, clean:4 }, pose:{ type:'stand' },
              done:'好多了。', doneTr:'Much better.' },
    // Pressing it is instant; what takes the time is her walking the length of the cabin to you.
    '服务铃': { zh:'按服务铃', py:'àn fúwùlíng', en:'ring for the crew', secs:1.2, mins:1,
              ringBell:true, pose:{ type:'reach' },
              done:'乘务员马上就来。', doneTr:'Somebody is on their way.' },
    '小桌板': { zh:'打开桌板', py:'dǎkāi zhuōbǎn', en:'toggle the tray table', secs:1.0, mins:1,
              cabinEquip:'tray', pose:{ type:'reach' }, done:'小桌板好了。', doneTr:'Tray table set.' },
    '阅读灯': { zh:'开阅读灯', py:'kāi yuèdúdēng', en:'toggle the reading light', secs:.7, mins:1,
              cabinEquip:'reading', pose:{ type:'reach' }, done:'阅读灯打开了。', doneTr:'Reading light set.' },
    '出风口': { zh:'调出风口', py:'tiáo chūfēngkǒu', en:'adjust the air vent', secs:.8, mins:1,
              cabinEquip:'air', pose:{ type:'reach' }, done:'风正好。', doneTr:'The airflow feels right.' },
    '屏幕': { zh:'使用屏幕', py:'shǐyòng píngmù', en:'open the in-flight screen', secs:.7, mins:1,
              cabinEquip:'screen', ife:true, pose:{ type:'reach' }, done:'屏幕显示飞行路线。', doneTr:'The route is on screen.' },
    '手提行李': { zh:'取行李', py:'qǔ xíngli', en:'retrieve your carry-on', secs:1.6, mins:2,
              cabinEquip:'bag', pose:{ type:'reach' }, done:'拿好手提行李了。', doneTr:'Carry-on retrieved.' },
    '遮光板': { zh:'调遮光板', py:'tiáo zhēguāngbǎn', en:'adjust the window shade', secs:.8, mins:1,
              cabinEquip:'shade', pose:{ type:'reach' }, done:'光线舒服多了。', doneTr:'The light is more comfortable.' },
    '靠背': { zh:'调靠背', py:'tiáo kàobèi', en:'recline or raise the seat back', secs:.9, mins:1,
              cabinEquip:'recline', pose:{ type:'reach' }, done:'靠背调好了。', doneTr:'Seat back adjusted.' },
    '充电口': { zh:'给手机充电', py:'gěi shǒujī chōngdiàn', en:'toggle phone charging', secs:.7, mins:1,
              cabinEquip:'charging', pose:{ type:'reach' }, done:'手机开始充电了。', doneTr:'The phone is charging.' },
    '舱门': { zh:'下飞机', py:'xià fēijī', en:'deplane', secs:1.6, mins:3,
              exitPlane:true, pose:{ type:'walk' }, done:'到了。', doneTr:'Arrived.' },
    '驾驶舱': { zh:'参观驾驶舱', py:'cānguān jiàshǐcāng', en:'visit the flight deck', secs:1.0, mins:2,
              cockpitView:true, pose:{ type:'reach' }, done:'驾驶舱仪表都亮着。', doneTr:'The flight-deck instruments are alive.' },
  },
  // ---- 北京市澄安医院.  The four floors are separate scenes for performance, but the actions
  // form one care loop: 挂号 → 分诊 → 医生 → 检查 → 治疗/输液 → 出院.  game.js supplies the
  // case-specific price, department and state; these rows supply the verbs and physical poses.
  hospital: {
    '挂号处': { zh:'挂号', py:'guàhào', en:'register to see a doctor', secs:2.4, mins:8,
              gain:{ mood:2 }, hospitalRegister:true, pose:{ type:'reach' } },
    '自助挂号机': { zh:'自助挂号', py:'zìzhù guàhào', en:'register at the machine', secs:2.0, mins:6,
              gain:{ mood:1 }, hospitalRegister:true, pose:{ type:'press' } },
    '分诊台': { zh:'去分诊', py:'qù fēnzhěn', en:'speak to triage', secs:2.3, mins:7,
              gain:{ mood:4 }, hospitalTriage:true, pose:{ type:'talk' } },
    '体温计': { zh:'量体温', py:'liáng tǐwēn', en:'take your temperature', secs:2.0, mins:4,
              gain:{ mood:2 }, hospitalVitals:'temperature', pose:{ type:'check' },
              done:'体温量好了。', doneTr:'Temperature checked.' },
    '血压计': { zh:'量血压', py:'liáng xuèyā', en:'check your blood pressure', secs:2.4, mins:5,
              gain:{ mood:2 }, hospitalVitals:'pressure', pose:{ type:'check' },
              done:'血压量好了。', doneTr:'Blood pressure checked.' },
    '急诊': { zh:'挂急诊', py:'guà jízhěn', en:'register with emergency', secs:2.6, mins:10,
              gain:{ mood:5, rest:4 }, hospitalEmergency:true, pose:{ type:'talk' } },
    '观察床': { zh:'留院观察', py:'liúyuàn guānchá', en:'stay for observation', secs:4.4, mins:90,
              pay:-45, gain:{ rest:32, mood:10 }, pose:{ type:'lie', seatY:.58 },
              done:'观察了一会儿，情况稳定。', doneTr:'Observed for a while. Everything is stable.' },
    '开水': { zh:'接杯开水', py:'jiē bēi kāishuǐ', en:'get a cup of boiled water', secs:1.8, mins:4,
              gain:{ food:5, mood:3 }, pose:{ type:'drink', hold:'cup' },
              done:'水有点烫。', doneTr:'Still a little hot.' },
  },
  hospital2: {
    '医生': { zh:'看医生', py:'kàn yīshēng', en:'see the doctor', secs:3.6, mins:20,
              gain:{ mood:8, rest:4 }, hospitalConsult:true, pose:{ type:'talk' } },
    '导诊台': { zh:'问护士', py:'wèn hùshi', en:'ask the nurse', secs:2.2, mins:4,
              gain:{ mood:4 }, hospitalNurse:true, pose:{ type:'talk' },
              done:'护士指了指候诊区。', doneTr:'The nurse points you toward the waiting area.' },
    '检查床': { zh:'做检查', py:'zuò jiǎnchá', en:'have a physical examination', secs:3.4, mins:12,
              gain:{ mood:5 }, pose:{ type:'lie', seatY:.58 },
              done:'医生检查完了。', doneTr:'The physical examination is finished.' },
    '候诊椅': { zh:'等叫号', py:'děng jiàohào', en:'wait for your number', secs:3.2, mins:20,
              gain:{ rest:10, mood:-2 }, pose:{ type:'sit', seatY:.50 },
              done:'屏幕上的号码往前走了。', doneTr:'The numbers on the screen have moved on.' },
  },
  hospital3: {
    '检查室': { zh:'去做检查', py:'qù zuò jiǎnchá', en:'have the ordered test', secs:4.2, mins:35,
              gain:{ mood:4 }, hospitalTest:true, pose:{ type:'check' } },
    '治疗室': { zh:'接受治疗', py:'jiēshòu zhìliáo', en:'receive treatment', secs:5.0, mins:55,
              gain:{ rest:34, mood:20, clean:5 }, hospitalTreat:true, pose:{ type:'lie', seatY:.58 } },
    '输液': { zh:'输液', py:'shūyè', en:'have an IV infusion', secs:6.2, mins:120,
              gain:{ rest:46, mood:16 }, hospitalInfusion:true, pose:{ type:'sit', seatY:.50 } },
    '药房': { zh:'取药', py:'qǔ yào', en:'collect prescribed medicine', secs:2.6, mins:12,
              gain:{ mood:10 }, hospitalDispense:true, pose:{ type:'reach' } },
    '抽血': { zh:'抽血', py:'chōuxuè', en:'have blood drawn', secs:3.0, mins:15,
              gain:{ mood:-2 }, hospitalTest:true, pose:{ type:'reach' } },
    'CT机': { zh:'做CT', py:'zuò CT', en:'have a CT scan', secs:4.6, mins:28,
              gain:{ mood:2 }, hospitalTest:true, pose:{ type:'lie', seatY:.58 } },
    'X光': { zh:'拍X光片', py:'pāi X guāng piàn', en:'have an X-ray', secs:4.2, mins:24,
              gain:{ mood:2 }, hospitalTest:true, pose:{ type:'stand' } },
    '超声': { zh:'做超声', py:'zuò chāoshēng', en:'have an ultrasound', secs:4.0, mins:22,
              gain:{ mood:3 }, hospitalTest:true, pose:{ type:'lie', seatY:.58 } },
  },
  hospital4: {
    '病床': { zh:'住院休息', py:'zhùyuàn xiūxi', en:'rest in a hospital bed', secs:5.2, mins:180,
              pay:-80, gain:{ rest:68, mood:18, clean:6 }, hospitalBed:true,
              pose:{ type:'lie', seatY:.58 },
              done:'在病床上好好休息了。', doneTr:'A long, proper rest in the ward.' },
    '护士站': { zh:'按铃找护士', py:'àn líng zhǎo hùshi', en:'call the ward nurse', secs:1.8, mins:3,
              gain:{ mood:6 }, hospitalNurse:true, pose:{ type:'press' },
              done:'护士过来问需要什么。', doneTr:'A nurse comes over to ask what you need.' },
    '康复训练': { zh:'做康复训练', py:'zuò kāngfù xùnliàn', en:'do rehabilitation exercises', secs:5.0, mins:45,
              gain:{ rest:-8, mood:22 }, hospitalRehab:true, pose:{ type:'walk' },
              done:'扶着平行杠走完了两趟。', doneTr:'Two careful lengths between the parallel bars.' },
    '训练台阶': { zh:'练习上下台阶', py:'liànxí shàngxià táijiē', en:'practise on the training steps', secs:3.2, mins:16,
              gain:{ rest:-3, mood:7 }, hospitalRehab:true, pose:{ type:'walk' },
              done:'慢慢上下了几趟，脚步比刚才稳。', doneTr:'A few careful trips; the steps feel steadier now.' },
    '康复自行车': { zh:'骑康复自行车', py:'qí kāngfù zìxíngchē', en:'ride the rehabilitation bicycle', secs:3.6, mins:20,
              gain:{ rest:-4, mood:9 }, pose:{ type:'stand' },
              done:'低阻力蹬了一会儿，腿没有那么紧了。', doneTr:'A short low-resistance ride loosens your legs.' },
    '出院处': { zh:'办理出院', py:'bànlǐ chūyuàn', en:'complete discharge', secs:2.8, mins:15,
              gain:{ mood:18 }, hospitalDischarge:true, pose:{ type:'reach' } },
    '刷手池': { zh:'外科刷手', py:'wàikē shuāshǒu', en:'do a surgical scrub', secs:3.0, mins:8,
              gain:{ clean:22 }, pose:{ type:'scrub' },
              done:'按外科要求把手刷干净了。', doneTr:'Hands scrubbed to surgical standard.' },
  },
  rail: {
    '座位': { zh:'候车', py:'hòuchē', en:'wait for a train', secs:3.4, mins:30,
              gain:{ rest:16, mood:-4 }, pose:{ type:'sit', seatY:.48 },
              done:'等车最难的是不知道等多久。',
              doneTr:'The hard part of waiting is not knowing how long.' },
  },
};

// ---------------------------------------------------------------- 杨柳社区 · floor-local apartment actions
//
// All twelve storeys share one `home` scene and therefore one x/z footprint.  The action router in
// game.js uses this table only on the named deck; that is what keeps a neighbour's 冰箱, 床 or 电脑
// from operating the player's own flat merely because the familiar word also exists in `USE`.
// These signature actions deliberately avoid fixed pose coordinates: each floor owns a different
// plan, so the thing's own focus point is the only safe target.
// What is in the 信箱, on the days there is no bill in it.
//
// 看信箱 returned 一张水费单，一张广告 every time it was ever used, which is a convincing sentence
// about a system that did not exist. The real bills come from `HomeLife` and are keyed to a date;
// this is the everything-else, keyed to the day the way js/mall.js keys its announcements to the
// weekday, so an empty box is still a different empty box on Thursday.
const MAIL_DAY = [
  ['物业费', '物业费单子来了，这个月该交了。', 'The service-charge bill has come; it is due this month.'],
  ['水费',   '一张水费单，一张广告。',         'A water bill and a flyer.'],
  ['燃气费', '燃气费单子和一张超市传单。',     'The gas bill, and a supermarket leaflet.'],
  ['贺卡',   '一张贺年卡，还没到春节呢。',     'A New Year card, and it is not 春节 yet.'],
];

const HOME_USE_FLOOR = {
  // Deck 2 is the player's own flat, and it was the one furnished floor in the building with no
  // entry here at all: the resolver went straight to `USE_AT.home` and then to the global `USE`,
  // so anything that had to mean something different in *this* flat than it means in a bank, a
  // hotel or a neighbour's kitchen had nowhere to live. That is why 灶台, 电饭煲, 洗衣机, 晾衣架 and
  // 热水壶 had no verb anywhere in the game. This table is now consulted first on deck 2, which
  // makes it the place to put a flat-only action — a word the rest of the game already owns.
  // Rows marked with an item number came from lane 6, which owns the room modules and cannot edit
  // this file; the headword is the `th`/`TH` name exactly as the room registers it. Where a row
  // names something the living loop already runs — the hob, the board, the washing machine, the
  // shower, the bed, the desk — lane 6's sentence is kept and the behaviour flag is added, so the
  // verb reads the way the room wrote it and still moves the pantry, the wash or the alarm.
  2: {
    // 玄关 — js/home-entry.js
    '鞋柜': { zh:'换鞋', py:'huàn xié', en:'change into indoor shoes', secs:2.4, mins:2,
              gain:{ rest:3, mood:4 }, pose:{ type:'reach' },
              done:'鞋换好了，进门先脱鞋是这儿的规矩。',
              doneTr:'Shoes changed. Taking them off at the door is the rule here.' },
    // 客厅 — js/home-living.js
    '电视': { zh:'开电视', py:'kāi diànshì', en:'switch the television on or off', secs:1.4, mins:2,
              gain:{ mood:6 }, pose:{ type:'stand' },
              done:'电视开着，新闻联播刚开始。',
              doneTr:'The set is on; the evening news has just started.' },
    '遥控器': { zh:'换台', py:'huàn tái', en:'change the channel', secs:1.6, mins:3,
              gain:{ mood:5 }, pose:{ type:'reach' },
              done:'换了一圈，还是新闻最清楚。',
              doneTr:'A lap of the channels; the news is still the clearest.' },
    '沙发': { zh:'坐一会儿', py:'zuò yíhuìr', en:'sit down for a while', secs:3.6, mins:20,
              gain:{ rest:12, mood:8 }, pose:{ type:'sit' },
              done:'坐下来才发现今天走了不少路。',
              doneTr:'Only sitting down do you notice how far you walked.' },
    '照片': { zh:'看照片', py:'kàn zhàopiàn', en:'look at the family photograph', secs:2.8, mins:6,
              gain:{ mood:13 }, pose:{ type:'stand' },
              done:'看了一会儿，有点儿想家。', doneTr:'You look at it a while. A little homesick.' },
    // 餐厅 — js/home-dining.js
    '饮水机': { zh:'接杯水', py:'jiē bēi shuǐ', en:'draw a cup of hot water', secs:2.2, mins:3,
              gain:{ food:4, rest:3 }, pose:{ type:'reach' },
              done:'热水接好了，先放一放。',
              doneTr:'A cup of hot water, left to cool a moment.' },
    '水壶': { zh:'烧水', py:'shāo shuǐ', en:'boil the kettle', secs:4.2, mins:10,
              gain:{ mood:4 }, pose:{ type:'reach' }, noodles:true,
              done:'水开了，壶盖响了一阵。',
              doneTr:'The water boils and the lid rattles for a while.' },
    // 厨房 — js/home-kitchen.js. `wok`, `board`, `ricePot` and `fan` are the living loop: the hob
    // opens the dish list the fridge can actually supply and the board takes two fifths of it off
    // the wok, rather than every dish being one uninterruptible block at a fixed 35 minutes.
    '灶台': { zh:'炒个菜', py:'chǎo ge cài', en:'cook a dish at the hob', secs:5.6, mins:35,
              gain:{ food:14, mood:10, rest:-4 }, pose:{ type:'cook', hold:'ladle' }, wok:true,
              done:'火大油热，一锅菜出来了。',
              doneTr:'High flame, hot oil, and the dish is out of the pan.' },
    // There is deliberately no deck-2 '冰箱' row. One was added here and it was pure loss: every
    // word it carried was dead, and the one thing that survived was wrong.
    //
    // `useLabel`'s `d.fridge` branch (js/game.js:13246) rewrites zh/py/en/done/doneTr on all three
    // of its paths — the lot it is handing you, cookable-but-not-ready, and empty — so a deck-2
    // row's own sentence is never once displayed. Its gain, pose and `fridge:true` were byte-copies
    // of the global row. The only field that reached the player was the duration, and it read
    // secs:2.0 / mins:3 against the global row's 3.4 / 20: eating dinner in three minutes.
    //
    // Deck 2 therefore falls through to `USE['冰箱']` (js/data.js:1682) — the real eat action, with
    // the pantry chain hanging off `fridge:true`. Same reasoning is why there is no deck-2 '厨房':
    // `USE['厨房']` carries `cook:true`, and shadowing it would break the dish picker.
    // A flat-only fridge verb would have to be added *inside* that branch in game.js, not here.
    '案板': { zh:'切菜', py:'qiē cài', en:'prepare the vegetables', secs:4.6, mins:25,
              gain:{ food:5, mood:7, rest:-3 }, pose:{ type:'reach' }, board:true,
              done:'菜切好了，粗细都差不多。',
              doneTr:'The vegetables are cut to an even size.' },
    // 主卧 — js/home-bedroom.js
    '床': { zh:'睡觉', py:'shuìjiào', en:'sleep', secs:6.0, mins:480, sleep:true,
              gain:{ rest:70, mood:10 }, pose:{ type:'lie', seatY:0.60 },
              done:'一觉睡到天亮。', doneTr:'You sleep straight through to morning.' },
    '衣柜': { zh:'换衣服', py:'huàn yīfu', en:'change your clothes', secs:3.0, mins:8,
              gain:{ mood:6 }, pose:{ type:'stand' }, wear:true,
              done:'换好了，镜子就在两米外。',
              doneTr:'Changed. The mirror is two metres away.' },
    '空调': { zh:'开空调', py:'kāi kōngtiáo', en:'switch the air-conditioner on or off', secs:1.6, mins:2,
              gain:{ rest:6, mood:5 }, pose:{ type:'reach' },
              done:'空调响了两声，凉风下来了。',
              doneTr:'Two beeps, and the cool air comes down.' },
    // 次卧 + 书房 — js/home-second.js
    '行李箱': { zh:'打开行李箱', py:'dǎkāi xínglixiāng', en:'open the suitcase', secs:2.6, mins:5,
              gain:{ mood:4 }, pose:{ type:'reach' },
              done:'里面还是上次回来没收的东西。',
              doneTr:'Still holding what you never unpacked last time.' },
    '书桌': { zh:'学中文', py:'xué Zhōngwén', en:'study Chinese at the desk', secs:5.4, mins:60,
              gain:{ mood:6, rest:-8 }, pose:{ type:'stand', hold:'book' }, study:true,
              done:'写完两页生词，手有点儿酸。',
              doneTr:'Two pages of new words, and your hand aches a little.' },
    // Lane 6 asked for 上网 here. It cannot replace the work action: the desk in flat 202 is the
    // one place in the game you earn money without leaving the building, and `.towercheck.js`
    // requires the player flat's 电脑 to keep `pay > 0`. So it is the shift, with lane 6's line
    // about the job listings as what you actually did for three hours — which is the same evening.
    '电脑': { zh:'上网找工作', py:'shàngwǎng zhǎo gōngzuò', en:'work online at the desk', secs:6.0, mins:180,
              pay:180, gain:{ mood:-12, rest:-14, food:-8 }, pose:{ type:'type', seatY:0.47 },
              done:'看了两条招聘，一条是在望京。',
              doneTr:'Two job listings, one of them out in Wangjing.' },
    // 卫生间 + 阳台 — js/home-bath.js
    '淋浴': { zh:'洗澡', py:'xǐzǎo', en:'take a shower', secs:4.6, mins:20,
              gain:{ rest:16, mood:12, clean:100 }, pose:{ type:'stand' }, shower:true,
              done:'热水器争气，洗得很舒服。',
              doneTr:'The heater does its job; that was a good wash.' },
    '洗手池': { zh:'洗手', py:'xǐ shǒu', en:'wash your hands', secs:1.8, mins:2,
              gain:{ clean:11, mood:3 }, pose:{ type:'reach' },
              done:'手洗干净了。', doneTr:'Hands washed.' },
    '洗衣机': { zh:'洗衣服', py:'xǐ yīfu', en:'put a wash on', secs:3.2, mins:6,
              gain:{ mood:6 }, pose:{ type:'reach' }, washer:true,
              done:'洗衣机开始转了，晾衣架空着。',
              doneTr:'The drum starts turning; the drying rack is empty.' },
    '阳台': { zh:'去阳台', py:'qù yángtái', en:'step out onto the balcony', secs:2.6, mins:8,
              gain:{ mood:11, rest:3 }, pose:{ type:'stand' },
              done:'风吹进来，楼下有人在说话。', doneTr:'The wind comes in; somebody is talking downstairs.' },
  },
  3: {
    '象棋': { zh:'下一盘棋', py:'xià yì pán qí', en:'play a game of Chinese chess', secs:5.8, mins:35,
              gain:{ mood:16, rest:4 }, pose:{ type:'reach' },
              done:'下完一盘，老李又赢了。', doneTr:'One game later, Old Li wins again.' },
    '收音机': { zh:'听收音机', py:'tīng shōuyīnjī', en:'listen to the old radio', secs:3.8, mins:20,
              gain:{ mood:10, rest:5 }, pose:{ type:'stand' },
              done:'新闻说完，京剧又开始了。', doneTr:'The news ends and the opera comes back on.' },
    // Lane 7 asked for this on 棋谱. Nothing in js/home-f3.js registers 棋谱 — a HOME_USE_FLOOR row
    // keyed on a word no floor tags is dead: `homeUseDef` looks the table up by the thing's own
    // headword, so it would tick the checkbox and never appear in the game. 邻居 is 老李 himself,
    // and he is registered, so the errand hangs off the man who is asking for it.
    '邻居': { zh:'替老李跑一趟', py:'tì Lǎo Lǐ pǎo yí tàng', en:'run an errand for 老李', secs:2.6, mins:8,
              gain:{ mood:10, rest:-4 }, pose:{ type:'talk' },
              done:'老李托你下楼买包烟，钱塞你手里了。',
              doneTr:'老李 asks you to fetch him a packet of cigarettes downstairs, and presses the money into your hand.' },
  },
  4: {
    // 缴费 is already taught as a word at the hospital cashier; the building the player lives in
    // never used it. The rates on the board behind this desk are the real ones and now the bills
    // that arrive in the 信箱 are charged at them, so this is where you come to settle them.
    '物业': { zh:'缴费', py:'jiāofèi', en:'pay the utility bills at the desk', secs:3.0, mins:12,
              gain:{ mood:6 }, pose:{ type:'reach' }, payBills:true,
              done:'物业费、水费、电费、燃气费，都交清了。',
              doneTr:'Management fee, water, electricity, gas — all settled.' },
    '收费标准': { zh:'看收费标准', py:'kàn shōufèi biāozhǔn', en:'read the fee schedule', secs:2.6, mins:5,
              gain:{ mood:3 }, pose:{ type:'stand' }, billBoard:true,
              done:'物业费两块一一平米，水费电费另算。',
              doneTr:'2.10 a square metre for management; water and electricity are separate.' },
    '乒乓球台': { zh:'打乒乓球', py:'dǎ pīngpāngqiú', en:'play table tennis', secs:6.0, mins:30,
              gain:{ mood:14, rest:-6 }, pose:{ type:'walk' },
              done:'打了几局，身上暖和了。', doneTr:'A few games, and you are properly warmed up.' },
    // Sitting in, not watching. Lane 7 asked for this on a new 麻将桌 headword; F4 registers 麻将
    // and nothing registers 麻将桌, so it goes on the table that exists rather than one that does not.
    '麻将': { zh:'打麻将', py:'dǎ májiàng', en:'sit in for a hand of mahjong', secs:5.6, mins:75,
              gain:{ mood:22, rest:-10 }, pose:{ type:'sit', seatY:.50 },
              done:'三缺一，你顶上了。四圈下来天都黑了。',
              doneTr:'They were three short of four; you sat in. Four rounds later it is dark.' },
    // 报修 at the estate office. The number on the window plate (js/home-f4.js:601) is the real one.
    '办公室': { zh:'报修', py:'bàoxiū', en:'report a fault to the estate office', secs:2.8, mins:6,
              gain:{ mood:4 }, pose:{ type:'talk' },
              done:'登记好了，师傅明天上门。', doneTr:'It is logged; somebody will come tomorrow.' },
    // One desk serves both directions, so one verb does — there is no 还书 fixture to hang a
    // second row on and a row with no fixture never resolves.
    '借书': { zh:'借书', py:'jiè shū', en:'borrow a book from the reading corner', secs:2.6, mins:8,
              gain:{ mood:8 }, pose:{ type:'reach' },
              done:'登记了，两本，两个星期。上次的还回去了，日期正好。',
              doneTr:'Signed for: two books, two weeks. The last pair went back, and just in time.' },
  },
  5: {
    '拼图': { zh:'拼一会儿', py:'pīn yíhuìr', en:'work on the jigsaw', secs:4.8, mins:25,
              gain:{ mood:14, rest:3 }, pose:{ type:'reach' },
              done:'又拼上了几块。', doneTr:'A few more pieces fit.' },
    '积木': { zh:'搭积木', py:'dā jīmù', en:'build with the blocks', secs:4.2, mins:20,
              gain:{ mood:12, rest:2 }, pose:{ type:'reach' },
              done:'搭了一座歪歪的小楼。', doneTr:'A cheerful, crooked little tower.' },
    // Lane 7 asked for this on 小王, who is a person and not a registered fixture. 小孩 is the child
    // itself and F5 does register it, which is also the better object to be standing in front of
    // when you agree to this.
    '小孩': { zh:'答应帮着看孩子', py:'dāying bāngzhe kān háizi', en:'agree to watch their child for an hour',
              secs:3.0, mins:60, gain:{ mood:14, rest:-8 }, pose:{ type:'talk' },
              done:'小王两口子赶着出门，说回来给你带菜。',
              doneTr:'The 小王s rush out; they say they will bring you back some vegetables.' },
  },
  6: {
    '白板': { zh:'看水电费', py:'kàn shuǐdiànfèi', en:'check the shared utilities board', secs:2.8, mins:8,
              gain:{ mood:3 }, pose:{ type:'stand' },
              done:'这个月的水电费已经分好了。', doneTr:"This month's utilities have been divided up." },
    // 只有夜里才考研. `hours:[22,3]` is enforced in `flatLabel` — a window that wraps midnight —
    // rather than being a sentence about one, because a condition nothing checks is a decoration.
    '考研': { zh:'复习考研', py:'fùxí kǎoyán', en:'study for the postgraduate exam', secs:5.4, mins:60,
              gain:{ mood:7, rest:-8 }, pose:{ type:'stand', hold:'book' }, hours:[22, 3],
              done:'夜里十二点，楼里全睡了，就这屋的灯还亮着。',
              doneTr:'Midnight; the whole block is asleep and this is the one window still lit.' },
  },
  7: {
    '作业本': { zh:'帮忙改作业', py:'bāngmáng gǎi zuòyè', en:'help mark the exercise books', secs:5.4, mins:45,
              gain:{ mood:8, rest:-6 }, pose:{ type:'reach' },
              done:'改完一小摞，红笔快没水了。', doneTr:'One small pile marked; the red pen is nearly dry.' },
    '毛笔': { zh:'练毛笔字', py:'liàn máobǐzì', en:'practise brush calligraphy', secs:5.0, mins:35,
              gain:{ mood:14, rest:2 }, pose:{ type:'reach' },
              done:'写了一张，老师点了点头。', doneTr:'One sheet finished; the teacher nods.' },
    // Reciprocal: you mark her books, she teaches you. Lane 7 asked for 课本, which nothing on F7
    // registers; 教案 is her lesson plans and it is a real fixture on that desk.
    '教案': { zh:'请老师讲一课', py:'qǐng lǎoshī jiǎng yí kè', en:'ask the teacher for a lesson', secs:4.6, mins:45,
              gain:{ mood:16, rest:-6 }, pose:{ type:'sit', seatY:.50 },
              done:'她拿红笔给你圈了几个字，说这几个先记住。',
              doneTr:'She rings a few characters in red pen and says to learn these first.' },
  },
  8: {
    // The dish leaves with you. An inline `food:10` is a meter that moves and nothing you own;
    // js/pantry.js models food as dated lots, so `pantryAdd` puts a real portion in the fridge that
    // can be eaten tomorrow or left to go off. Applied in `stopUse`.
    '炒锅': { zh:'学炒一道菜', py:'xué chǎo yí dào cài', en:'learn a dish at the wok', secs:5.6, mins:35,
              gain:{ mood:14, rest:-3 }, pose:{ type:'cook', hold:'ladle' },
              pantryAdd:{ hz:'剩菜', qty:1 },
              done:'一道菜学会了，师傅让你端一份回去。',
              doneTr:'You have the dish; he makes you take a portion home.' },
    '案板': { zh:'帮忙切菜', py:'bāngmáng qiē cài', en:'help prepare the vegetables', secs:4.6, mins:25,
              gain:{ food:5, mood:9, rest:-3 }, pose:{ type:'reach' },
              done:'菜切好了，粗细都差不多。', doneTr:'The vegetables are cut to an even size.' },
  },
  9: {
    '喜糖': { zh:'吃一块喜糖', py:'chī yí kuài xǐtáng', en:'have a wedding sweet', secs:1.8, mins:3,
              gain:{ food:8, mood:9 }, pose:{ type:'eat', hold:'meal' },
              done:'沾一点儿喜气。', doneTr:'A little of the happy couple\'s good luck.' },
    '说明书': { zh:'看说明书', py:'kàn shuōmíngshū', en:'read the furniture instructions', secs:3.2, mins:12,
              gain:{ mood:4 }, pose:{ type:'stand', hold:'book' },
              done:'原来还少装了两个螺丝。', doneTr:'It turns out two screws are still missing.' },
  },
  10: {
    '安全帽': { zh:'戴安全帽', py:'dài ānquánmào', en:'try on the hard hat', secs:2.0, mins:3,
              gain:{ mood:3 }, pose:{ type:'reach' },
              done:'大小正好，装修现场还是要小心。', doneTr:'It fits. A renovation site still needs care.' },
    '工具': { zh:'整理工具', py:'zhěnglǐ gōngjù', en:'sort the renovation tools', secs:3.8, mins:15,
              gain:{ mood:7, rest:-2 }, pose:{ type:'reach' },
              done:'扳手、卷尺、螺丝刀都放好了。', doneTr:'Spanner, tape and screwdrivers, all in order.' },
  },
  11: {
    '水果': { zh:'吃点儿水果', py:'chī diǎnr shuǐguǒ', en:'have some fruit with the neighbours', secs:2.4, mins:8,
              gain:{ food:13, mood:8 }, pose:{ type:'eat', hold:'meal' },
              done:'坐下吃了一个苹果。', doneTr:'You sit with them and eat an apple.' },
    // Not the roof — the fixture is on deck 11 (高区水泵检修) and the roof carries 水箱 and 太阳能
    // and no pump at all.
    '水泵': { zh:'检查水泵', py:'jiǎnchá shuǐbèng', en:'check the high-zone booster pump', secs:3.0, mins:8,
              gain:{ mood:4 }, pose:{ type:'stand' },
              done:'水泵运转正常，没有漏水。', doneTr:'The pump is running normally and nothing leaks.' },
  },
  12: {
    '菜': { zh:'给菜浇水', py:'gěi cài jiāoshuǐ', en:'water the rooftop vegetables', secs:3.2, mins:10,
              gain:{ mood:12 }, pose:{ type:'pour', hold:'can' },
              done:'土都浇透了。', doneTr:'The soil is watered through.' },
    '北京': { zh:'看看北京', py:'kànkan Běijīng', en:'look out over Beijing', secs:4.2, mins:20,
              gain:{ mood:18, rest:6 }, pose:{ type:'stand' },
              done:'风很大，城一直铺到天边。', doneTr:'The wind is strong; the city runs to the horizon.' },
    // No fixed `at` on the pose, deliberately: the seat comes from the chair's own focus point.
    // `useLabel`'s legacy-coordinate re-anchoring only fires on deck 2, so a 椅子 row up here would
    // teleport the body to the old one-room flat if it carried the coordinates USE['椅子'] does.
    '椅子': { zh:'坐着看城市', py:'zuòzhe kàn chéngshì', en:'sit and watch the city', secs:4.6, mins:40,
              gain:{ mood:24, rest:14 }, pose:{ type:'sit', seatY:.46 },
              done:'风小下来了，楼下的灯一盏一盏亮起来。',
              doneTr:'The wind drops; the lights in the blocks below come on one at a time.' },
  },
};

// 门 means three materially different things inside the shared tower scene.  Only the building's
// ground-floor entrance crosses into the street coordinate space.  Your own door opens onto the
// second-floor corridor, while another household's door is somebody else's boundary, not a fast
// travel shortcut out of the building.
const HOME_DOOR_USE = {
  lobby: { zh:'出门', py:'chūmén', en:'step out into the hutong', secs:2.4, mins:5,
           gain:{ mood:5 }, pose:{ type:'stand' }, go:'street',
           done:'外面是胡同。', doneTr:'Outside is the hutong.' },
  flat: { zh:'开门', py:'kāi mén', en:'open your door onto the second-floor corridor', secs:2.2, mins:2,
          gain:{}, pose:{ type:'stand' },
          done:'门外是二楼走廊。', doneTr:'Your door opens onto the second-floor corridor.' },
  // 敲门 answered 敲了敲门，里面没有人应 every time, on every one of the four doors, forever
  // (item 261).  `js/disrupt.js` already decides what is behind one of 201 / 203 / 204 / 205 today
  // — `Disrupt.floorLife(day).door`, derived from the date so the corridor, the lift and the floor
  // agree about it — and it carries a `note` for what you *smell and hear from the corridor*.
  // What it does not have, and cannot, is what happens when you actually knock.  That is this.
  //
  // `heard` is keyed on that door's `hz`, so the key set here and the `DOORS` array at
  // js/disrupt.js:218 are one contract in two files: .homecastcheck.js reads both and fails if a
  // door state is added there with no answer here.  `null` — no door state today — keeps the old
  // sentence, which is correct on those days rather than wrong on all of them.
  neighbour: { zh:'敲门', py:'qiāo mén', en:"knock on the neighbour's door", secs:1.8, mins:2,
          gain:{}, pose:{ type:'reach' }, knock:true,
          // Resolving the day to an answer is one lookup and it lives here, beside the table, so a
          // caller never has to know that the key is a DOORS row's hz.  Returns null on a day with
          // no door state, which is the caller's cue to fall back to the `done` line below.
          knockReply: day => {
            const d = (typeof Disrupt !== 'undefined' && Disrupt.floorLife)
              ? Disrupt.floorLife(day).door : null;
            return (d && HOME_DOOR_USE.neighbour.heard[d.hz]) || null;
          },
          heard: {
            '电视': { zh:'敲了两下，电视声音小了一点，门没开。',
                      en:'Two knocks. The television drops a little. The door does not open.',
                      mood:-2 },
            '吵架': { zh:'里面正吵着，你敲了三下，没人理你。',
                      en:'The row goes on. You knock three times; nobody comes.',
                      mood:-5 },
            '做饭': { zh:'门开了一条缝，一股炒菜味，“找谁？”',
                      en:'The door opens a crack on a smell of frying. "Who are you after?"',
                      mood:4, open:true },
            '搬东西': { zh:'门开着，箱子堆到门口，“借过借过。”',
                        en:'The door is already open, boxes to the threshold. "Coming through, coming through."',
                        mood:2, open:true },
          },
          done:'敲了敲门，里面没有人应。', doneTr:'You knock; nobody answers.' },
};

// The vertical core and hygiene point are physically identical on every floor.  Keeping one action
// object for each means the wording cannot drift between four otherwise independent scene files.
const HOSPITAL_COMMON_USE = {
  '电梯': { zh:'选择楼层', py:'xuǎnzé lóucéng', en:'choose a hospital floor', secs:1.2, mins:1,
            gain:{}, hospitalFloors:'lift', pose:{ type:'press' } },
  '楼梯': { zh:'走楼梯', py:'zǒu lóutī', en:'take the stairs', secs:1.4, mins:2,
            gain:{ rest:-1 }, hospitalFloors:'stairs', pose:{ type:'walk' } },
  '洗手液': { zh:'消毒双手', py:'xiāodú shuāngshǒu', en:'sanitise your hands', secs:1.5, mins:2,
            gain:{ clean:8 }, pose:{ type:'scrub' },
            done:'手消毒好了。', doneTr:'Hands sanitised.' },
  '洗手间': { zh:'上洗手间', py:'shàng xǐshǒujiān', en:'use the hospital washroom', secs:2.8, mins:10,
            gain:{ toilet:100, clean:5 }, pose:{ type:'stand' },
            done:'洗手间很干净。', doneTr:'The washroom is clean.' },
};
for (const p of ['hospital','hospital2','hospital3','hospital4'])
  Object.assign(USE_AT[p], HOSPITAL_COMMON_USE);

// ---------------------------------------------------------------- 京华大酒店 shared vertical core
// HotelCore gives every authored floor the same two real routes. The passenger lift is a timed
// ride in its own car scene; the fire stair deliberately permits only the adjacent authored stop.
// Keeping the wording here means thirteen floor modules cannot silently disagree about either verb.
const HOTEL_COMMON_USE = {
  '电梯': { zh:'乘客梯', py:'chéng kètī', en:'take the Jinghua passenger lift', secs:1.15, mins:1,
            gain:{}, hotelFloors:'lift', pose:{type:'press'} },
  '楼梯': { zh:'走安全楼梯', py:'zǒu ānquán lóutī', en:'take the fire stairs', secs:1.45, mins:2,
            gain:{rest:-1}, hotelFloors:'stairs', pose:{type:'walk'} },
};
for (const f of (typeof HOTEL_FLOORS!=='undefined'?HOTEL_FLOORS:[])) {
  USE_AT[f.key]=USE_AT[f.key]||{};
  Object.assign(USE_AT[f.key],HOTEL_COMMON_USE);
}
USE_AT.hotelLift={
  '操作盘': { zh:'看运行状态', py:'kàn yùnxíng zhuàngtài', en:'check the live floor display',
              secs:1.0, mins:0, gain:{}, pose:{type:'check'},
              done:'楼层和方向都显示在屏幕上。',doneTr:'The live floor and direction are on the display.' },
};
USE['京华大酒店']={zh:'走进酒店',py:'zǒu jìn jiǔdiàn',en:'enter Jinghua Grand Hotel',secs:1.6,mins:2,
                    gain:{mood:3},pose:{type:'walk'},done:'自动门开了。',doneTr:'The automatic doors open.'};

// ---------------------------------------------------------------- 营业时间 · when the hotel is open
//
// A building where every counter answers at four in the morning is a diorama, and the hotel was one:
// out of roughly a hundred and thirty interactions across fourteen levels, not one carried an hour.
// You could take a massage at 03:00, eat the breakfast buffet at midnight, and sit down to work in
// the executive lounge at any minute of any day.
//
// `useLabel` has honoured a `d.open` window since the shop and the diner were built (js/game.js
// :11376) and almost nothing outside those two has ever used it, so this needs no new mechanism —
// it is a table. Hours are decimal, and a closing hour past midnight is written past 24: the sky bar
// is [17, 26], which `useLabel` reads as open from five in the afternoon until two in the morning.
//
// Three rules decide what is in this table and what is not:
//
//   1. 前台 is twenty-four hours, and so are 礼宾部, 行李车, the lift, the fire stair, your own room
//      and 客房服务. A five-star front desk never shuts and neither does the phone beside the bed;
//      putting an hour on any of them would lock a guest out of the building they have paid for.
//      They are absent from this table on purpose, not by omission.
//   2. Everything that is an *outlet* — somewhere with a counter, a kitchen, a pool or a host —
//      gets one: the restaurants, the buffet, the spa, the pool, the gym, the business centre, the
//      banquet rooms, the executive lounge, the roof.
//   3. Back-of-house is left alone unless it is genuinely a service with hours (the staff canteen,
//      the laundry). A linen cupboard is not an outlet.
//
// 早餐自助 and 早餐台 are [6.5, 10] because js/stay.js's own BREAKFAST window is [6.5, 10], and a
// buffet that is open when the stay system says breakfast is over is the same building disagreeing
// with itself. That pair is checked, not remembered.
//
// Rows are patched onto the definitions the floor modules already registered rather than replacing
// them, so a floor keeps ownership of what its own action says and does. A tag that is not there is
// skipped and reported through `Data.HOTEL_HOURS_MISS`, because a silently-missed window looks
// exactly like a shop that never closes.
//
// The trap that costs the hour, and it is not obvious: **most floors register their HotelUse rows at
// module scope, but two do it inside the builder** (js/hotel-f3.js:690 and js/hotel-f8.js:1281),
// which does not run until that floor is first walked into. This file loads long before any hotel
// scene is built, so a window aimed at one of those rows lands on nothing at all and the outlet
// stays open forever. 京华雅集 on 3 was exactly that and is why this note exists. If a window has to
// go on a row registered inside a builder, the patch has to move with it.
const HOTEL_HOURS = {
  hotel:   { '茶桌':[10,24] },
  hotel2:  { '餐厅接待':[6.5,22], '餐桌':[6.5,22], '早餐自助':[6.5,10], '包间':[11,21.5],
             '明档厨房':[6.5,22], '传菜口':[6,23] },
  hotel3:  { '签到处':[8,20], '宴会厅':[8,22], '婚礼沙龙':[10,18], '会议室':[8,20],
             '商务中心':[8,20] },
  hotel4:  { '水疗接待':[10,22], '迎宾茶台':[10,22], '理疗室':[10,21.5], '更衣室':[6,22.5],
             '储物柜':[6,22.5], '泳池':[6,22], '毛巾站':[6,22.5], '健身房':[6,23],
             '健身器械':[6,23], '自由重量':[6,23], '放松茶廊':[10,22], '茶台':[10,22] },
  hotel6:  { '家庭影院':[9,21], '儿童阅读角':[8,20], '玩具桌':[8,20], '绘画台':[8,20] },
  hotel7:  { '共享办公桌':[7,23], '电话间':[7,23], '打印台':[7,23], '瑜伽垫':[6,22],
             '阅读角':[7,23], '早餐吧台':[6.5,10], '共享厨房':[6,23], '洗衣机':[7,22],
             '叠衣台':[7,22] },
  hotel9:  { '会所前台':[10,22], '功夫茶席':[10,22], '茶席':[10,22], '麻将桌':[13,23],
             '围棋桌':[10,22], '书法台':[10,20], '文房四宝':[10,20], '藏书架':[10,22] },
  hotel10: { '行政酒廊':[6.5,22], '早餐':[6.5,10], '早餐台':[6.5,10], '图书室':[6.5,22],
             '商务桌':[6.5,22], '茶台':[6.5,22], '接待台':[6.5,22], '会议室':[8,20],
             '洽谈室':[8,20], '阅览室':[6.5,22], '长桌':[6.5,22], '会员水吧':[6.5,22] },
  hotel12: { '云端中餐厅':[17,22.5], '观景露台':[10,23], '天际酒廊':[17,26] },
  hotelB1: { '员工食堂':[6,21], '洗衣房':[6,22], '装卸区':[5,22] },
};
// 行政酒廊 on 10 is not gated by a flag and must not become one: the two grades whose `level` is 9
// or higher — 行政套房 and 京华套房 in js/stay.js's GRADES — are the ones whose room key opens it,
// so the rule is a property of the room you bought (H146). Written here beside the hours because
// the hours and the gate are the two halves of "can I go in", and checked against GRADES by the
// harness so a new grade cannot quietly acquire lounge access.
const HOTEL_LOUNGE = { floor:'hotel10', minLevel:9 };
const HOTEL_HOURS_MISS = [];
for (const key of Object.keys(HOTEL_HOURS)) {
  const t = (typeof HotelUse !== 'undefined' && HotelUse[key]) || USE_AT[key];
  if (!t) { HOTEL_HOURS_MISS.push(key + '/*'); continue; }
  for (const hz of Object.keys(HOTEL_HOURS[key])) {
    if (t[hz]) t[hz].open = HOTEL_HOURS[key][hz];
    else HOTEL_HOURS_MISS.push(key + '/' + hz);
  }
}

// ---------------------------------------------------------------- 京华大厦 A座 shared workplace core
// Floor fixtures carry stable `officeAction` ids because familiar labels repeat on every level.
// game.js resolves those ids before the ordinary word table, letting all nine levels share one
// honest lift/stair/restroom contract while their department modules own the actual work stations.
const OFFICE_COMMON_USE = {
  'lift': {zh:'乘客梯',py:'chéng kètī',en:'take the office passenger lift',secs:1.15,mins:1,
    gain:{},officeFloors:'lift',pose:{type:'press'}},
  'stairs-a': {zh:'走安全楼梯',py:'zǒu ānquán lóutī',en:'take fire stair A',secs:1.35,mins:2,
    gain:{rest:-1},officeFloors:'stairs-a',pose:{type:'walk'}},
  'stairs-b': {zh:'走安全楼梯',py:'zǒu ānquán lóutī',en:'take fire stair B',secs:1.35,mins:2,
    gain:{rest:-1},officeFloors:'stairs-b',pose:{type:'walk'}},
  'directory': {zh:'看楼层索引',py:'kàn lóucéng suǒyǐn',en:'read the office directory',secs:1.25,mins:1,
    gain:{},pose:{type:'check'},done:'每一层的部门和用途都写在索引上。',doneTr:'Every floor and department is listed on the directory.'},
  'restroom': {zh:'上卫生间',py:'shàng wèishēngjiān',en:'use the workplace washroom',secs:2.6,mins:8,
    gain:{toilet:100,clean:5},pose:{type:'stand'},done:'洗手间收拾得很干净。',doneTr:'The washroom is clean and well kept.'},
  'exit': {zh:'走出大楼',py:'zǒu chū dàlóu',en:'leave through the automatic doors',secs:1.5,mins:2,
    gain:{},pose:{type:'walk'},done:'自动门开了。',doneTr:'The automatic doors open.'},
};
for(const f of (typeof OFFICE_FLOORS!=='undefined'?OFFICE_FLOORS:[]))
  Object.assign(OfficeUse[f.key],OFFICE_COMMON_USE);
Object.assign(OfficeUse.officeLift,{
  'lift-panel': {zh:'看运行状态',py:'kàn yùnxíng zhuàngtài',en:'check the live lift display',secs:.8,mins:0,
    gain:{},pose:{type:'check'},done:'楼层、方向和开门状态都在屏幕上。',doneTr:'Floor, direction, and door state are live on the display.'},
});


// ---------------------------------------------------------------- 逛街 · shopping the mall
// The catalogue, one entry per tenant the building actually has. That last part had drifted: the
// mall was fitted out with 咖啡店, 面包店, 宠物店 and 餐厅 that sold nothing at all, while the
// catalogue still carried a 玩具店 and a 甜品店 that no longer existed anywhere in the building.
// Four shops you could walk into and not buy from, and two you could buy from and never find.
//
// What an entry means:
//   wear   the colour it dyes your top — clothes you buy are clothes you are wearing
//   eat    what it does to 饿 and 心情 when it is food, applied on paying rather than on eating,
//          because the eating happens on the way out and the game has nowhere to put a half-eaten
//          bun
//   keep   it goes in the bag and stays yours
//   mood / rest / clean   a one-off nudge to a need
//
// Prices are the point as much as the words are. They run from 5 kuai for a bowl of rice to 2,200
// for a tablet, which is the range a learner needs to hear numbers across — 块, 十, 百, 千 — and
// they are the prices these things cost, so the number attaches to something real.
// The food hall is a conversation rather than a single fixed "eat lunch" button. Each counter
// first offers the dishes printed on its physical menu in mall.js, then asks one short follow-up
// question. Keeping this beside the other economy tables gives the board, wallet and interaction
// one source of truth for names and prices.
const MALL_FOOD = {
  '川味小馆': {
    en:'Sichuan Kitchen', ask:'辣度怎么选？', askEn:'How spicy would you like it?',
    options:[
      {hz:'不辣',py:'bú là',en:'not spicy'}, {hz:'微辣',py:'wēi là',en:'mild'},
      {hz:'中辣',py:'zhōng là',en:'medium'}, {hz:'特辣',py:'tè là',en:'extra spicy'},
    ],
    items:[
      {hz:'麻婆豆腐',py:'mápó dòufu',en:'mapo tofu',price:28,gain:{food:48,mood:13,rest:3}},
      {hz:'回锅肉',py:'huíguōròu',en:'twice-cooked pork',price:32,gain:{food:58,mood:14,rest:3}},
      {hz:'水煮鱼',py:'shuǐzhǔyú',en:'poached fish in chilli oil',price:45,gain:{food:64,mood:17,rest:4}},
    ],
  },
  '面馆': {
    en:'Lanzhou Noodles', ask:'面要多宽？', askEn:'How wide would you like the noodles?',
    options:[
      {hz:'细面',py:'xì miàn',en:'thin'}, {hz:'二细',py:'èr xì',en:'medium-thin'},
      {hz:'韭叶',py:'jiǔyè',en:'chive-leaf wide'}, {hz:'宽面',py:'kuān miàn',en:'wide'},
    ],
    items:[
      {hz:'牛肉面',py:'niúròu miàn',en:'beef noodles',price:22,gain:{food:58,mood:12,rest:4}},
      {hz:'小碗面',py:'xiǎo wǎn miàn',en:'small bowl of noodles',price:18,gain:{food:43,mood:10,rest:3}},
      {hz:'加肉牛肉面',py:'jiā ròu niúròu miàn',en:'beef noodles with extra meat',price:30,gain:{food:70,mood:15,rest:4}},
    ],
  },
  '火锅': {
    en:'Chongqing Hot Pot', ask:'锅底要什么口味？', askEn:'Which soup base would you like?',
    options:[
      {hz:'清汤',py:'qīngtāng',en:'clear broth'}, {hz:'微辣',py:'wēi là',en:'mild'},
      {hz:'鸳鸯',py:'yuānyāng',en:'half spicy, half clear'}, {hz:'麻辣',py:'málà',en:'mala spicy'},
    ],
    items:[
      {hz:'鸳鸯锅',py:'yuānyāng guō',en:'split hot pot set',price:58,gain:{food:76,mood:20,rest:6}},
      {hz:'毛肚套餐',py:'máodǔ tàocān',en:'tripe hot-pot set',price:42,gain:{food:65,mood:17,rest:5}},
      {hz:'鸭肠套餐',py:'yācháng tàocān',en:'duck-intestine hot-pot set',price:40,gain:{food:62,mood:16,rest:5}},
    ],
  },
  '烧腊': {
    en:'Cantonese Roast Meats', ask:'要不要加汁？', askEn:'Would you like sauce on the rice?',
    options:[
      {hz:'原味',py:'yuánwèi',en:'as it comes'}, {hz:'少汁',py:'shǎo zhī',en:'a little sauce'},
      {hz:'加汁',py:'jiā zhī',en:'extra sauce'}, {hz:'加辣',py:'jiā là',en:'add chilli'},
    ],
    items:[
      {hz:'叉烧饭',py:'chāshāo fàn',en:'char siu rice',price:30,gain:{food:60,mood:14,rest:4}},
      {hz:'烧鸭饭',py:'shāoyā fàn',en:'roast duck rice',price:34,gain:{food:64,mood:15,rest:4}},
      {hz:'双拼饭',py:'shuāngpīn fàn',en:'two-meat rice plate',price:42,gain:{food:72,mood:18,rest:5}},
    ],
  },
  '奶茶': {
    en:'Shoupin Tea', ask:'甜度怎么选？', askEn:'How sweet would you like it?',
    options:[
      {hz:'无糖',py:'wú táng',en:'no sugar'}, {hz:'三分糖',py:'sān fēn táng',en:'thirty per cent sugar'},
      {hz:'半糖',py:'bàn táng',en:'half sugar'}, {hz:'正常糖',py:'zhèngcháng táng',en:'regular sugar'},
    ],
    items:[
      {hz:'珍珠奶茶',py:'zhēnzhū nǎichá',en:'pearl milk tea',price:16,gain:{food:14,mood:17,rest:5}},
      {hz:'芋圆奶茶',py:'yùyuán nǎichá',en:'taro-ball milk tea',price:18,gain:{food:18,mood:18,rest:5}},
      {hz:'柠檬茶',py:'níngméng chá',en:'lemon tea',price:14,gain:{food:9,mood:14,rest:7}},
    ],
  },
};

// `ship:true` — the shop sends this one home instead of handing it over the counter, which is what
// item 255 needs before a mall purchase can produce a delivery.  Keyed on **bulk, not price**: a
// carton nobody carries onto the subway.  A price threshold was refused deliberately — it would be
// an invented constant standing in for data, and it would sweep in 手表 890 and 香水 480, which any
// shop hands you in a bag.
//
// The flag is set only on `keep` rows, and that exclusion is load-bearing:
//   - never on `wear` — the wardrobe takes ownership of a coat at the till, so deferring the
//     purchase to a doorstep leaves it thinking you already own something not in the flat;
//   - never on `eat` — it is consumed at the counter and there is nothing left to deliver.
// The other half is game.js's: `mallPay` decides whether a paid basket is carried or shipped, and
// only a `ship` row may be shipped.  Until that lands this flag reads as inert data, not a bug.
const MALL_GOODS = {
  '服装店': [
    { hz:'外套',   py:'wàitào',    en:'a lined jacket',   price:189, wear:'#8d4a45' },
    { hz:'衬衫',   py:'chènshān',  en:'a plain shirt',    price:98,  wear:'#dfe3e6' },
    { hz:'毛衣',   py:'máoyī',     en:'a wool jumper',    price:145, wear:'#6c7f6a' },
    { hz:'裙子',   py:'qúnzi',     en:'a skirt',          price:120, wear:'#3f5670' },
    { hz:'裤子',   py:'kùzi',      en:'a pair of trousers', price:130, keep:1 },
    { hz:'大衣',   py:'dàyī',      en:'a long overcoat',  price:420, wear:'#2f3a44' },
    { hz:'围巾',   py:'wéijīn',    en:'a wool scarf',     price:68,  keep:1, mood:8 },
  ],
  '鞋店': [
    { hz:'皮鞋',   py:'píxié',     en:'leather shoes',    price:260, keep:1 },
    { hz:'布鞋',   py:'bùxié',     en:'cloth shoes',      price:65,  keep:1 },
    { hz:'拖鞋',   py:'tuōxié',    en:'slippers',         price:29,  keep:1 },
    { hz:'运动鞋', py:'yùndòngxié',en:'a pair of trainers', price:320, keep:1, mood:9 },
    { hz:'靴子',   py:'xuēzi',     en:'boots',            price:380, keep:1 },
    { hz:'袜子',   py:'wàzi',      en:'a pack of socks',  price:15,  keep:1 },
  ],
  '珠宝店': [
    { hz:'项链',   py:'xiàngliàn', en:'a silver necklace', price:420, keep:1, mood:16 },
    { hz:'耳环',   py:'ěrhuán',    en:'earrings',         price:180, keep:1, mood:10 },
    { hz:'手镯',   py:'shǒuzhuó',  en:'a jade bangle',    price:680, keep:1, mood:20 },
    { hz:'戒指',   py:'jièzhi',    en:'a ring',           price:350, keep:1, mood:14 },
    { hz:'手表',   py:'shǒubiǎo',  en:'a wristwatch',     price:890, keep:1, mood:18 },
  ],
  '电子产品': [
    { hz:'耳机',   py:'ěrjī',      en:'headphones',       price:299, keep:1, mood:14 },
    { hz:'充电宝', py:'chōngdiànbǎo', en:'a power bank',  price:99,  keep:1 },
    { hz:'手机壳', py:'shǒujīké',  en:'a phone case',     price:39,  keep:1 },
    { hz:'键盘',   py:'jiànpán',   en:'a keyboard',       price:199, keep:1 },
    { hz:'鼠标',   py:'shǔbiāo',   en:'a mouse',          price:79,  keep:1 },
    { hz:'平板',   py:'píngbǎn',   en:'a tablet',         price:2200, keep:1, mood:22 },
    { hz:'数据线', py:'shùjùxiàn', en:'a charging cable', price:25,  keep:1 },
  ],
  '眼镜店': [
    { hz:'眼镜',   py:'yǎnjìng',   en:'a new pair of glasses', price:380, keep:1 },
    { hz:'墨镜',   py:'mòjìng',    en:'sunglasses',       price:150, keep:1, mood:8 },
    { hz:'隐形眼镜', py:'yǐnxíng yǎnjìng', en:'contact lenses', price:180, keep:1 },
    { hz:'眼镜盒', py:'yǎnjìnghé', en:'a glasses case',   price:35,  keep:1 },
  ],
  '花店': [
    { hz:'花',     py:'huā',       en:'a bunch of lilies', price:45, keep:1, mood:18 },
    { hz:'玫瑰',   py:'méigui',    en:'a single rose',    price:15,  keep:1, mood:10 },
    { hz:'盆栽',   py:'pénzāi',    en:'a small pot plant', price:60, keep:1, mood:12 },
    { hz:'百合',   py:'bǎihé',     en:'lilies',           price:55,  keep:1, mood:15 },
    { hz:'向日葵', py:'xiàngrìkuí',en:'sunflowers',       price:30,  keep:1, mood:13 },
  ],
  // The four that had a shopfront and nothing to sell out of it.
  '咖啡店': [
    { hz:'咖啡',   py:'kāfēi',     en:'a coffee',         price:28, eat:{ mood:16, rest:8 } },
    { hz:'拿铁',   py:'nátiě',     en:'a latte',          price:32, eat:{ mood:18, rest:8 } },
    { hz:'美式',   py:'měishì',    en:'an americano',     price:26, eat:{ mood:14, rest:10 } },
    { hz:'蛋糕',   py:'dàngāo',    en:'a slice of cake',  price:35, eat:{ food:26, mood:18 } },
    { hz:'三明治', py:'sānmíngzhì',en:'a sandwich',       price:30, eat:{ food:34, mood:8 } },
  ],
  '面包店': [
    { hz:'面包',   py:'miànbāo',   en:'a loaf of bread',  price:12, eat:{ food:28 } },
    { hz:'蛋挞',   py:'dàntà',     en:'an egg tart',      price:8,  eat:{ food:14, mood:12 } },
    { hz:'牛角包', py:'niújiǎobāo',en:'a croissant',      price:14, eat:{ food:20, mood:9 } },
    { hz:'吐司',   py:'tǔsī',      en:'a loaf of toast',  price:16, eat:{ food:24 } },
    { hz:'月饼',   py:'yuèbǐng',   en:'a mooncake',       price:25, eat:{ food:22, mood:16 } },
  ],
  '宠物店': [
    { hz:'猫粮',   py:'māoliáng',  en:'a bag of cat food', price:88, keep:1 },
    { hz:'狗粮',   py:'gǒuliáng',  en:'a bag of dog food', price:95, keep:1 },
    { hz:'猫玩具', py:'māo wánjù', en:'a toy for a cat',  price:25,  keep:1, mood:10 },
    { hz:'牵引绳', py:'qiānyǐnshéng', en:'a lead',        price:45,  keep:1 },
    { hz:'金鱼',   py:'jīnyú',     en:'a goldfish',       price:20,  keep:1, mood:14 },
  ],
  '餐厅': [
    { hz:'宫保鸡丁', py:'gōngbǎo jīdīng', en:'kung pao chicken', price:48, eat:{ food:52, mood:16 } },
    { hz:'麻婆豆腐', py:'mápó dòufu',     en:'mapo tofu',        price:38, eat:{ food:46, mood:14 } },
    { hz:'米饭',   py:'mǐfàn',     en:'a bowl of rice',   price:5,  eat:{ food:22 } },
    { hz:'汤',     py:'tāng',      en:'a bowl of soup',   price:22, eat:{ food:26, mood:8 } },
    { hz:'啤酒',   py:'píjiǔ',     en:'a beer',           price:12, eat:{ mood:18, rest:-4 } },
  ],
  // The six that were walk-in rooms with a till and nothing on the till's list. Every tenant in
  // mall.js tags its fixtures with its own kind and `counter()` gives the first one a 收银台, so a
  // shop becomes shoppable the moment its kind appears as a key here — browse, basket, pay, receipt
  // and diary line all come off the generic path in game.js. These six had the whole building and
  // none of the catalogue: you could walk in, stand among the stock, and there was nothing to take.
  '书店': [
    { hz:'书',     py:'shū',       en:'a book',           price:45,  keep:1, mood:12 },
    { hz:'小说',   py:'xiǎoshuō',  en:'a novel',          price:58,  keep:1, mood:14 },
    { hz:'词典',   py:'cídiǎn',    en:'a Chinese dictionary', price:88, keep:1 },
    { hz:'杂志',   py:'zázhì',     en:'a magazine',       price:20,  keep:1, mood:8 },
    { hz:'地图',   py:'dìtú',      en:'a map of Beijing', price:25,  keep:1 },
    { hz:'笔记本', py:'bǐjìběn',   en:'a notebook',       price:18,  keep:1 },
    { hz:'明信片', py:'míngxìnpiàn', en:'a postcard',     price:5,   keep:1, mood:6 },
  ],
  '家居店': [
    { hz:'杯子',   py:'bēizi',     en:'a mug',            price:35,  keep:1 },
    { hz:'盘子',   py:'pánzi',     en:'a plate',          price:28,  keep:1 },
    { hz:'毛巾',   py:'máojīn',    en:'a bath towel',     price:42,  keep:1, clean:10 },
    { hz:'枕头',   py:'zhěntou',   en:'a pillow',         price:89,  keep:1, rest:12 },
    { hz:'被子',   py:'bèizi',     en:'a quilt',          price:320, keep:1, rest:18, ship:true },
    { hz:'台灯',   py:'táidēng',   en:'a desk lamp',      price:168, keep:1, mood:12, ship:true },
    { hz:'拖把',   py:'tuōbǎ',     en:'a mop',            price:45,  keep:1, clean:8 },
  ],
  '玩具店': [
    { hz:'玩具',   py:'wánjù',     en:'a toy',            price:55,  keep:1, mood:14 },
    { hz:'积木',   py:'jīmù',      en:'a set of building blocks', price:128, keep:1, mood:16, ship:true },
    { hz:'娃娃',   py:'wáwa',      en:'a doll',           price:79,  keep:1, mood:15 },
    { hz:'球',     py:'qiú',       en:'a ball',           price:25,  keep:1, mood:10 },
    { hz:'拼图',   py:'pīntú',     en:'a jigsaw',         price:45,  keep:1, mood:12 },
    { hz:'遥控车', py:'yáokòngchē',en:'a remote-control car', price:199, keep:1, mood:18 },
  ],
  '甜品店': [
    { hz:'冰淇淋', py:'bīngqílín', en:'an ice cream',     price:18, eat:{ food:12, mood:20 } },
    { hz:'奶茶',   py:'nǎichá',    en:'a bubble tea',     price:22, eat:{ food:14, mood:18 } },
    { hz:'布丁',   py:'bùdīng',    en:'a pudding',        price:16, eat:{ food:12, mood:14 } },
    { hz:'豆花',   py:'dòuhuā',    en:'a bowl of tofu pudding', price:12, eat:{ food:16, mood:12 } },
    { hz:'蛋糕卷', py:'dàngāojuǎn',en:'a slice of swiss roll', price:26, eat:{ food:20, mood:15 } },
  ],
  '美妆店': [
    { hz:'口红',   py:'kǒuhóng',   en:'a lipstick',       price:220, keep:1, mood:16 },
    { hz:'香水',   py:'xiāngshuǐ', en:'a bottle of perfume', price:480, keep:1, mood:20 },
    { hz:'面霜',   py:'miànshuāng',en:'a jar of face cream', price:260, keep:1, mood:12 },
    { hz:'面膜',   py:'miànmó',    en:'a pack of face masks', price:68, keep:1, clean:12 },
    { hz:'洗发水', py:'xǐfàshuǐ',  en:'a bottle of shampoo', price:58, keep:1, clean:14 },
  ],
  '运动店': [
    { hz:'篮球',   py:'lánqiú',    en:'a basketball',     price:158, keep:1, mood:14 },
    { hz:'跑鞋',   py:'pǎoxié',    en:'running shoes',    price:420, keep:1, mood:16 },
    { hz:'球拍',   py:'qiúpāi',    en:'a racket',         price:240, keep:1, mood:12 },
    { hz:'瑜伽垫', py:'yújiādiàn', en:'a yoga mat',       price:98,  keep:1, mood:10, ship:true },
    { hz:'水壶',   py:'shuǐhú',    en:'a water bottle',   price:45,  keep:1 },
    { hz:'运动服', py:'yùndòngfú', en:'a tracksuit',      price:268, wear:'#3a4a5c' },
  ],
};

// The loader's stale-build check reads a named object per file (index.html `NEEDS`). A half-stale
// data.js is exactly the failure that check exists for: game.js would run against yesterday's
// tables and the world would come out subtly wrong rather than broken. This is what it looks at.
const Data = { NPCS, USE, USE_AT, MALL_FOOD, MALL_GOODS,
               HOTEL_HOURS, HOTEL_HOURS_MISS, HOTEL_LOUNGE };
