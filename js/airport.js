// 机场 — the terminal, the far end of the line.
//
// A departures hall: a floor you could land on, a curtain wall down the whole
// south side with the aircraft parked behind it, a bank of check-in desks under numbered signs,
// a security channel across the middle of the room, and a gate lounge on the other side of it.
//
// This room used to be the one place in the game you could not use. You had no 机票, so 值机 and
// 安检 both turned you away, and the words it taught were the ones you would need if you had a
// ticket. That was a fine joke once. What it is now is the longest chain of things to do in the
// game, and every link of it is a word: buy a 机票 at the 售票处, take it to the 值机柜台 for a
// 登机牌 and a seat, put your bag on the belt, walk through 安检 — the barrier actually opens,
// the way the subway gate does — kill an hour airside on coffee and duty free, and get on the
// aeroplane when the 登机口 calls your flight.
//
// The hall is 44 m long and split in two by the security partition: landside at -x, airside at
// +x. Both halves face the same curtain wall on -z, and the same aeroplane is behind it — you
// see its tail from the check-in queue and its wing from the gate.
//
// The daylight opening is that curtain wall, per the convention every interior here follows.
// 机场 — AirFit, the zone registry. See AIRPORT.md.
//
// The fourth of these (FlatFit, StreetFit, MallCast, and now this), and written to the same
// shape, because the shape is what lets fifteen agents build one terminal without fifteen of them
// editing this file:
//
//     AirFit['security'] = A => { ... };                      // the builder, run once at build
//     AirFit['security'].tick = (t, body, mins) => { ... };    // optional, for anything that moves
//
// `A` is the toolkit, handed over below `build()` — read the note there before moving the call,
// because the street lost nine agents' work for a day to exactly that mistake.
const AirFit = {};

// Living background figures belong to the same NPC renderer as every other person in the game.
// Keep this registry outside the lazy room: game.js folds it into NPCS before the first room is
// entered, while Airport itself may not be built until much later.  Zone modules loaded after this
// file use registerAirportAmbient as well, so no air-* fitting has to rebuild a human from boxes.
const AirportAmbientCast = globalThis.AirportAmbientCast || [];
globalThis.AirportAmbientCast = AirportAmbientCast;
const _airportAmbientIds = new Set(AirportAmbientCast.map(n => n && (n.npcId || n.id)));

function registerAirportAmbient(id, x, z, yaw, o = {}) {
  const npcId = `airport-ambient-${id}`;
  if (_airportAmbientIds.has(npcId))
    return AirportAmbientCast.find(n => n && (n.npcId === npcId || n.id === npcId));

  // These colours remain useful while a rig is warming and are also the tint request for shared
  // ambient identities.  Faces stay Chinese and deterministic; a reload or a different room visit
  // order must never turn a person at a particular seat into somebody else.
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const skins = ['#e2b189', '#d9ab80', '#cf9d74', '#c99366', '#b98259'];
  const hairs = ['#1e1a18', '#241f1d', '#2b2523', '#332b28'];
  const tops = ['#3f5169', '#5a6070', '#6d5a4a', '#41566b', '#7a5347', '#3f6b6b'];
  const styles = ['short', 'bob', 'bun', 'tousled', 'ponytail'];
  const look = {
    skin: skins[h % skins.length], hair: hairs[(h >>> 3) % hairs.length],
    hairStyle: styles[(h >>> 6) % styles.length], top: o.top || tops[(h >>> 9) % tops.length],
    pants: o.pants || '#2f3742', shoe: o.shoe || '#33383e',
    tall: o.tall || (.94 + ((h >>> 13) % 13) / 100),
    wide: o.wide || (.91 + ((h >>> 17) % 18) / 100),
    age: o.age === undefined ? ((h >>> 21) % 48) / 100 : o.age,
    faceSeed: 20000 + (h % 70000), ...(o.look || {}),
  };
  const act = o.act || 'wait';
  const n = {
    id: npcId, npcId, castKey: `airport:ambient:${id}`,
    hz: o.hz || '乘客', role: o.role || o.roleClass || o.hz || '乘客',
    roleClass: o.roleClass || 'civilian',
    place: 'airport', ambient: true, source: o.source || 'airport-shell',
    // Shared identities are intentional for the crowd, but the resolver must retain this castKey.
    // `tint` asks the renderer to colour a shared archetype from this row's look where supported.
    sharedIdentity: true, tint: true,
    gender: o.gender, ageBand: o.ageBand || 'adult', look,
    temper: o.temper || 'steady', faceLock: o.faceLock !== false,
    pos: [x, 0, z],
    spots: [{ h0: 0, h1: 24, at: [x, z], face: yaw, act }],
  };
  if (o.seatY !== undefined) n.seatY = o.seatY;
  if (o.held) n.held = o.held;
  if (Array.isArray(o.patrol) && o.patrol.length > 1) {
    n.patrol = o.patrol.map(p => p.slice());
    n.speed = o.speed || .85;
    n.faceLock = false;
  }
  _airportAmbientIds.add(npcId);
  AirportAmbientCast.push(n);
  return n;
}
globalThis.registerAirportAmbient = registerAirportAmbient;

// The shell's 23 former primitive people.  These rows are declared here rather than from inside
// Airport's lazy builder so they exist when game.js initialises the roster. Named characters that
// already occupy a desk (小许, 刘警官, 小赵 and 陈姐) are deliberately not duplicated.
[
  ['shell-tug-driver-east', 18.70, -15.90, Math.PI / 2 + .10,
    { hz:'地勤', roleClass:'apron', top:'#e8622a', look:{hat:'cap',hatColor:'#e8e4d8'} }],
  ['shell-tug-driver-west', 4.70, -15.10, Math.PI / 2 - .06,
    { hz:'地勤', roleClass:'apron', top:'#e8622a', look:{hat:'cap',hatColor:'#e8e4d8'} }],
  ['shell-information-greeter', -15.45, 1.70, 0,
    { hz:'问询员', roleClass:'airport-service', act:'vend', top:'#294c71', gender:'female' }],
  ['shell-checkin-desk-1', -11.94, 6.94, Math.PI,
    { hz:'值机员', roleClass:'airport-service', act:'vend', top:'#506f91', gender:'female' }],
  ['shell-checkin-desk-3', -6.34, 6.94, Math.PI,
    { hz:'值机员', roleClass:'airport-service', act:'vend', top:'#506f91', gender:'female' }],
  ['shell-checkin-desk-4', -3.54, 6.94, Math.PI,
    { hz:'值机员', roleClass:'airport-service', act:'vend', top:'#506f91', gender:'female' }],
  ['shell-convenience-clerk', -20.95, -6.65, Math.PI / 2,
    { hz:'店员', roleClass:'retail', act:'vend', top:'#3d5a6a', gender:'female' }],
  ['shell-security-lane-officer', 1.70, 2.30, -Math.PI / 2,
    { hz:'安检员', roleClass:'security', top:'#5d7794', look:{hat:'cap',hatColor:'#2b3648'} }],
  ['shell-xray-operator', 1.10, -2.20, -Math.PI / 2,
    { hz:'安检员', roleClass:'security', act:'desk', seatY:.695, top:'#5d7794', gender:'female' }],
  ['shell-smoking-room', 6.38, 7.54, Math.PI / 2,
    { hz:'旅客', roleClass:'civilian', top:'#2f343c', act:'smoke', held:'cigarette' }],
  ['shell-dutyfree-clerk', 12.30, 7.55, Math.PI,
    { hz:'免税店员', roleClass:'retail', act:'vend', top:'#5c2b33', gender:'female' }],
  ['shell-cafe-barista', 17.50, 7.65, Math.PI,
    { hz:'咖啡师', roleClass:'hospitality', act:'vend', top:'#3d4a3f', gender:'female' }],
  ['shell-cafe-queue', 16.05, 6.40, 0,
    { hz:'乘客', roleClass:'civilian', temper:'bored', top:'#8d5c48' }],
  ['shell-gate-queue-1', 16.30, -6.00, Math.PI / 2 - .12,
    { hz:'乘客', roleClass:'civilian', temper:'patient', top:'#8d5c48' }],
  ['shell-gate-queue-2', 15.35, -6.00, Math.PI / 2,
    { hz:'乘客', roleClass:'civilian', temper:'bored', top:'#41566b' }],
  ['shell-gate-queue-3', 14.40, -6.00, Math.PI / 2 + .12,
    { hz:'乘客', roleClass:'civilian', temper:'weary', top:'#5a6070' }],
  ['shell-airside-seat-1', 8.78, -3.40, 0,
    { hz:'乘客', act:'sit', seatY:.45, temper:'patient', top:'#7a5347' }],
  ['shell-airside-seat-2', 9.40, -3.40, 0,
    { hz:'乘客', act:'phone', seatY:.45, temper:'bored', top:'#3f5169' }],
  ['shell-airside-seat-3', 12.58, -4.70, Math.PI,
    { hz:'乘客', act:'read', seatY:.45, temper:'steady', top:'#5c6472' }],
  ['shell-airside-seat-4', 4.36, -6.60, 0,
    { hz:'乘客', act:'sit', seatY:.45, temper:'weary', top:'#6b5a72' }],
  ['shell-landside-seat-1', -12.10, -3.60, 0,
    { hz:'乘客', act:'sit', seatY:.45, temper:'patient', top:'#6d5a4a' }],
  ['shell-landside-seat-2', -6.98, -4.90, Math.PI,
    { hz:'乘客', act:'phone', seatY:.45, temper:'bored', top:'#3f5169' }],
  ['shell-landside-seat-3', -7.60, -4.90, Math.PI,
    { hz:'乘客', act:'sit', seatY:.45, temper:'steady', top:'#5c6472' }],
].forEach(([id, x, z, yaw, o]) => registerAirportAmbient(id, x, z, yaw, o));

const Airport = Lazy('Airport', () => {
  // The palette is graded warm on purpose. This renderer has one directional light and no bounce,
  // so a hall this size takes its entire mood from the albedo of four very large surfaces — floor,
  // wall, ceiling and desk fronts. Painted in the neutral greys a spec sheet would give you, a
  // terminal comes out as a fluorescent-lit hospital corridor 44 m long. Every one of those four is
  // now a warm stone rather than a cool one, at the same *value* it had before so the room does not
  // go dark, and the cool notes are kept where they earn their contrast: the glass, the navy signs,
  // the blue seating and the inlay band in the floor. That contrast is the whole grade — warm
  // ambient over cool daylight — and it is what the low sun through the curtain wall lands on.
  const col = {
    floor: C('#d9d0be'), grout: C('#b8ac97'), band: C('#9c9081'), inlay: C('#8695a4'),
    carpet: C('#3f5566'), carpetD: C('#334553'),
    wall: C('#e2dac9'), wallD: C('#cabfab'), ceil: C('#ece1cd'), slab: C('#bfb4a0'),
    steel: C('#b0b0aa'), steelD: C('#82817a'), chrome: C('#cdc9c0'),
    white: C('#f4f1e6'), cream: C('#eadfcb'), charcoal: C('#33342f'), black: C('#1d1c19'),
    red: C('#ab372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    jade: C('#3d7361'), jadeL: C('#5b9a83'), blue: C('#2f6392'), blueSign: C('#1d4c8c'),
    navy: C('#23304a'), yellow: C('#dbb02f'), orange: C('#d47c28'),
    seat: C('#3a5876'), seatD: C('#2b435c'),
    glass: C('#c2d2dc'), tube: C('#fdf2d9'), board: C('#12161a'), boardOn: C('#7fd8c4'),
    amber: C('#e6a747'), lime: C('#7fe0a4'), rose: C('#e07a4a'),
    desk: C('#d5c9b1'), deskD: C('#95886f'), oak: C('#8d6a41'),
    plane: C('#ebe6da'), planeD: C('#cec6b7'), apron: C('#62594c'), tarmac: C('#4f473d'),
    sky: C('#bfc7cd'), leaf: C('#456c33'), leafL: C('#5c8442'), soil: C('#3b3226'),
    // The sunset itself, kept out of the surface table because these are light, not paint:
    // `sun` is what the low sun puts on the floor, `warm` the tungsten in the ceiling battens,
    // `dusk` and `haze` the two bands of sky stacked over the horizon behind the aircraft.
    sun: C('#ffdca8'), warm: C('#ffe3b4'), dusk: C('#e8c48d'), haze: C('#d6c3ab'),
  };
  const G = { matte: .06, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .05 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, wall, flat, glyphs,
          solid, blocker, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 22.0, RZ = 8.5, H = 7.20;
  // The curtain wall: a real hole in the -z wall, not glazing painted on a solid one, because
  // the aircraft is parked behind it and glass with a wall behind it is just a wall.
  const GX0 = -17.60, GX1 = 19.20, MUL = 1.60;   // glazed run, and the mullion pitch
  const WSILL = 1.16, WTOP = 5.85;
  const WIN = { x: (GX0 + GX1) / 2, y: (WSILL + WTOP) / 2, z: -RZ + .10,
                hw: (GX1 - GX0) / 2 - .10, hh: (WTOP - WSILL) / 2 - .02 };
  const SEC = 2.40;                       // the security partition, across the hall
  const LANE = { z0: .55, z1: 2.05 };     // the one lane through it you can walk
  const EXITZ = 5.60;                     // 出口 — the door back out of airside
  const CKZ = RZ - 2.30;                  // the check-in counter
  const DX = -20.20;                      // the subway, in the +z wall at the west end
  const BRX = 18.20;                      // the airbridge, and the door it leaves through
  const OUT = { x: 0, z: 0, yaw: 0 };     // unused; the metro decides where you arrive

  // ---------------------------------------------------------------- the schedule
  // Seven services a day, the same seven every day, which is what a board like this is. `dep`
  // is minutes past midnight; `late` is the delay this flight always runs, because one row of
  // 延误 is what makes the other six mean anything. Prices are the reason to keep working: the
  // cheapest of them is three shifts at the office and the dearest is a year of them.
  const FLIGHTS = [
    // `gate` is the gate this flight is scheduled off, and `gate2` is the one it moves to on the
    // days it moves. There is exactly one alternate per flight and it never changes, because every
    // gate a flight can be called to needs its own baked announcement, and a table of seven
    // alternates is fourteen clips where "any gate to any gate" would be ninety-eight.
    { no:'CA1502', to:'上海', py:'Shànghǎi',  en:'Shanghai',  dep: 8 * 60 + 20, late: 0,
      price: 480,  gate:'B12', gate2:'B14', hours:'两小时',   hoursEn:'two hours', hrs: 2 },
    { no:'MU5138', to:'广州', py:'Guǎngzhōu', en:'Guangzhou', dep:10 * 60 + 35, late: 0,
      price: 690,  gate:'B14', gate2:'B12', hours:'三小时',   hoursEn:'three hours' , hrs: 3 },
    { no:'CZ3908', to:'成都', py:'Chéngdū',   en:'Chengdu',   dep:13 * 60 +  5, late: 0,
      price: 820,  gate:'B12', gate2:'B15', hours:'三小时',   hoursEn:'three hours' , hrs: 3 },
    { no:'HU7802', to:'海口', py:'Hǎikǒu',    en:'Haikou',    dep:15 * 60 + 40, late:65,
      price:1100,  gate:'B15', gate2:'B14', hours:'四小时',   hoursEn:'four hours' , hrs: 4 },
    { no:'CA981',  to:'纽约', py:'Niǔyuē',    en:'New York',  dep:17 * 60 + 55, late: 0,
      price:5800,  gate:'B01', gate2:'B03', hours:'十四小时', hoursEn:'fourteen hours' , hrs: 14 },
    { no:'MU219',  to:'东京', py:'Dōngjīng',  en:'Tokyo',     dep:19 * 60 + 30, late: 0,
      price:2200,  gate:'B03', gate2:'B01', hours:'三小时',   hoursEn:'three hours' , hrs: 3 },
    { no:'CZ345',  to:'曼谷', py:'Màngǔ',     en:'Bangkok',   dep:21 * 60 + 15, late: 0,
      price:1900,  gate:'B05', gate2:'B12', hours:'五小时',   hoursEn:'five hours' , hrs: 5 },
  ];
  // The windows either side of a departure, in minutes. Check-in opens three hours out and
  // shuts three quarters of an hour before; boarding is called forty minutes out and the gate
  // closes fifteen. Everything the hall refuses you, it refuses you against these.
  const OPEN_CK = 180, SHUT_CK = 45, CALL = 40, SHUT_GATE = 15;
  // Needed by gateOf during zone construction: air-gate paints once as it builds, before the
  // schedule helpers later in this file are reached. Keeping this beside CALL avoids a hidden TDZ
  // that only surfaced when an initially moved row made the short-circuit evaluate its right side.
  const CHANGE_FROM = CALL + 26, CHANGE_TO = SHUT_GATE;

  // ---------------------------------------------------------------- 广播 what the terminal says
  // The hall had a working departure board and total silence, which is the one thing an airport
  // never is. Everything below is read off the same seven rows the board is written from, so the
  // screen and the loudspeaker cannot disagree: an announcement is made because `statusOf` changed
  // its mind about a flight, not because a timer went off.
  //
  // The lines are composed here rather than at play time for one hard reason. Every voice in this
  // game is a file baked by Kokoro at build time, keyed by the exact string spoken, so the set of
  // things anybody can say has to be finite and knowable before the game runs. Seven flights and
  // four things worth saying about each is finite; "read the board aloud" would not be.
  //
  // Two things about writing for a synthesiser that reads Mandarin.
  //
  // Flight numbers and gates carry Latin letters, and the bake strips every Latin letter before
  // reading — `speakable()` in .bake-voices.py, because a Mandarin phonemiser has no dependable
  // rule for them. So CA1502 cannot be said as CA1502. It is said the way a Chinese terminal
  // actually says it: the airline by its two-character short name, 国航, and the digits one at a
  // time. That is not a workaround, it is the more idiomatic reading of the two — and it teaches
  // four real words (国航 东航 南航 海航) that the board's Latin codes never could.
  //
  // The digits are spelled as characters rather than left as 1502 for the same class of reason: a
  // bare numeral is ambiguous between 一千五百零二 and 一五零二, and a flight number is always the
  // second. Gate B12 loses its letter and becomes 十二号登机口, which is what is said out loud in
  // any case; the letter lives on the board, where it can be read.
  const AIRLINE = { CA:'国航', MU:'东航', CZ:'南航', HU:'海航' };
  const CN = '零一二三四五六七八九';
  // 0-99 in characters. Enough for a gate number and for the hour and minute of a departure.
  function cnNum(n) {
    n = Math.round(n);
    if (n < 0) return '';
    if (n < 10) return CN[n];
    if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
    return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  }
  const cnDigits = s => String(s).replace(/\D/g, '').split('').map(d => CN[+d]).join('');
  const cnTime = m => {
    const w = ((Math.round(m) % 1440) + 1440) % 1440;
    return cnNum(Math.floor(w / 60)) + '点' + cnNum(w % 60) + '分';
  };
  // How a flight is named out loud: 前往上海的国航一五零二次航班.
  const spoken = f => `前往${f.to}的${AIRLINE[f.no.replace(/\d/g, '')] || ''}`
    + `${cnDigits(f.no)}次航班`;
  // Read off whichever gate it is given, so the same composer serves the scheduled gate and the
  // one a flight is moved to.
  const gateName = g => cnNum(parseInt(String(g).replace(/\D/g, ''), 10)) + '号登机口';
  const gateSpoken = (f, gate = f.gate) => gateName(gate);

  // The four calls that name a gate all happen after the gate-change window. A moved flight needs
  // a second baked reading of each one: changing the board while the loudspeaker keeps saying the
  // old stand turns the listening exercise into a trick question. The alternate readings live in
  // NOTICES as voice-only `alt:` entries so .dumplines.js finds and bakes them, but announce() never
  // emits those internal keys. noticeOf() below chooses the reading that agrees with gateOf().
  const GATE_NOTICE_KINDS = new Set(['class', 'rows', 'board', 'final']);
  function gateNotice(kind, f, gate) {
    const at = gateSpoken(f, gate);
    if (kind === 'class')
      return `${spoken(f)}头等舱与公务舱旅客请优先到${at}登机。`;
    if (kind === 'rows')
      return `${spoken(f)}现在按座位号登机，请后排旅客优先到${at}登机。`;
    if (kind === 'board')
      return `${spoken(f)}现在开始登机，请旅客到${at}登机。`;
    return `${spoken(f)}即将停止登机，请尚未登机的旅客尽快到${at}。`;
  }

  // Every line the terminal can say, keyed by what caused it. `NOTICES` is what the bake reads and
  // what game.js looks an event up in, exactly as `Metro.NOTICES` is for the platform.
  const NOTICES = {};
  for (const f of FLIGHTS) {
    NOTICES[`ck:${f.no}`] = `${spoken(f)}现在开始办理乘机手续，请旅客到值机柜台办理。`;
    NOTICES[`board:${f.no}`] = gateNotice('board', f, f.gate);
    NOTICES[`final:${f.no}`] = gateNotice('final', f, f.gate);
    // Two calls that lead into a boarding call the way they do at a real gate: first the cabins at
    // the front of the plane, then the rows at the back, and only then the whole flight. They reuse
    // the same spoken-name and gate composition as everything above, so the bake reads them the same.
    NOTICES[`class:${f.no}`] = gateNotice('class', f, f.gate);
    NOTICES[`rows:${f.no}`] = gateNotice('rows', f, f.gate);
    // Only the flight that is actually late gets a delay line. Baking an apology for six flights
    // that always leave on time would be six clips nobody can ever hear.
    if (f.late)
      NOTICES[`late:${f.no}`] = `很抱歉地通知您，${spoken(f)}延误，`
        + `预计起飞时间${cnTime(f.dep + f.late)}，请您注意广播通知。`;

    // ---- everything below is new, and all of it exists because the hall had exactly five things
    // to say about a flight and a real one has a dozen. What a terminal mostly does is narrate a
    // schedule going slightly wrong, and until now this one could only narrate it going right.

    // The inbound. An aeroplane has to arrive before it can leave, and saying so an hour and a
    // half out is both true and the only explanation the player ever gets for why the aircraft
    // behind the glass changed while they were buying a coffee.
    NOTICES[`in:${f.no}`] = `执行${spoken(f)}的飞机已经到达，预计准点起飞。`;
    // Check-in closing. This is the one that costs you the flight if you are not listening, and
    // it is deliberately the same fifteen-minute warning the countdown chip gives you.
    NOTICES[`ckend:${f.no}`] = `${spoken(f)}即将停止办理乘机手续，`
      + `请尚未办理的旅客尽快到值机柜台。`;
    // A delay with no time attached. Every flight can run late now — the board rolls it daily off
    // the weather — and no clip can name a departure time that is different every day. What a real
    // terminal says when it does not yet know is 起飞时间待定, and that is what this says.
    NOTICES[`delay:${f.no}`] = `很抱歉地通知您，${spoken(f)}延误，`
      + `起飞时间待定，请您注意广播通知。`;
    // Cancelled, and where to go about it. Until now a cancellation happened in total silence.
    NOTICES[`cancel:${f.no}`] = `很抱歉地通知您，${spoken(f)}取消，`
      + `请旅客到售票处办理退票手续。`;
    // 登机口变更 — the gate has moved. The single most useful sentence in this building for
    // somebody learning the language, because it is the one that costs you the aeroplane if you
    // do not understand it, and because the number it names is the whole content of the sentence.
    NOTICES[`change:${f.no}`] = `${spoken(f)}登机口变更，`
      + `请旅客改到${gateName(f.gate2)}登机，请注意广播通知。`;
    // The doors are shut. Said after the fact, which is what makes it worth hearing: if this one
    // is about your flight, you are still in the building and it is not.
    NOTICES[`closed:${f.no}`] = `${spoken(f)}已经停止登机，登机口已关闭。`;
  }
  // And the things a terminal says that are about nobody in particular. These are what fill the
  // long gaps: the hall runs from twenty past eight in the morning to a quarter past nine at night
  // on seven departures, so there are stretches of two hours with no flight to talk about, and an
  // airport that only speaks four times a day is a library. Twelve lines is enough that the same
  // one does not come back inside the quarter of a day most people spend in the building.
  const HALL = [
    '请各位旅客看管好自己的行李物品，不要交给陌生人保管。',
    '航站楼内禁止吸烟，需要吸烟的旅客请到吸烟室。',
    '请前往登机口的旅客提前准备好登机牌和身份证件。',
    '欢迎您乘坐今天的航班，祝您旅途愉快。',
    '请不要离开自己的行李，无人看管的行李将被作为可疑物品处理。',
    '需要乘坐地铁、出租车或机场大巴的旅客，请按指示牌前往地面交通中心。',
    '需要办理退税的旅客，请到海关柜台办理相关手续。',
    '转机旅客请留意中转航班信息，前往中转柜台办理手续。',
    '请带小孩的旅客照顾好您的孩子，不要在候机厅内奔跑打闹。',
    '航站楼内严禁携带易燃易爆物品，请配合安全检查。',
    '行李提取处位于一层，请到行李转盘提取托运行李。',
    '受天气影响，部分航班可能延误，请留意航班信息显示。',
    // ---- the second dozen. The hall ran from twenty past eight to a quarter past nine on twelve
    // filler lines, which at one every eighteen minutes means every one of them is heard four
    // times a day and the loop is audible. These are the ones a Chinese terminal actually loops,
    // and between them they carry most of the practical vocabulary of the building: what you may
    // not take through, what you have to show, where to stand, who to ask.
    '请旅客配合安全检查，将液体、充电宝和电脑单独放入筐内。',
    '充电宝不能托运，请随身携带，超过两万毫安的不能带上飞机。',
    '请提前两小时到达机场办理乘机手续，以免耽误您的行程。',
    '国内航班起飞前四十五分钟停止办理乘机手续，请您留意时间。',
    '登机口信息以广播和航班信息显示屏为准，请注意收听。',
    '请旅客不要在自动扶梯上停留，注意脚下安全。',
    '需要轮椅服务的旅客，请到问询处或值机柜台联系工作人员。',
    '走失儿童和失物招领请到一层问询处。',
    '机场内提供免费无线网络，请连接机场网络使用。',
    '登机时请出示登机牌和身份证件，谢谢配合。',
    '飞机上禁止使用打火机和火柴，请勿携带。',
    '祝您旅途顺利，感谢您选择首都国际机场。'];
  HALL.forEach((t, i) => { NOTICES[`hall:${i}`] = t; });
  // Voice-only variants for a moved flight. Appended after every existing line on purpose: the
  // voice bake derives a tiny tempo variation from array order, so inserting these inside the
  // flight loop would re-voice the original 102 calls for no audible reason. Keeping them in
  // NOTICES still makes the normal voice dump and missing-clip checks cover them.
  for (const f of FLIGHTS) for (const kind of GATE_NOTICE_KINDS)
    NOTICES[`alt:${kind}:${f.no}`] = gateNotice(kind, f, f.gate2);

  // What is on sale airside, at airside prices, which is the joke the shop is there to tell.
  const DUTY = [
    { hz:'巧克力', py:'qiǎokèlì', en:'a box of chocolates', price: 88,
      gain:{ food:22, mood:14 } },
    { hz:'香烟',   py:'xiāngyān', en:'a carton of cigarettes', price:260,
      gain:{ mood:10, clean:-6 } },
    { hz:'香水',   py:'xiāngshuǐ', en:'a bottle of scent — for somebody, presumably', price:520,
      gain:{ mood:24, clean:6 } },
    { hz:'白酒',   py:'báijiǔ',   en:'a bottle of baijiu, boxed and ribboned', price:380,
      gain:{ mood:18 } },
  ];

  // Everything a rewritable slot on a board might ever have to show. The glyph atlas is built
  // once at startup out of whatever the scenes asked for, so a character that only appears when
  // a flight goes late has to be registered now or the slot draws nothing at all.
  Glyphs.need('正常延误登机中关闭起飞取消候机准点末班已到达登机口值机安检出口' +
              // 计划 and 预计 head the two time columns on the board, and 目的地 航班 状态 时间
              // are the rest of its headings. A character a board can show has to be registered
              // here or its slot draws nothing at all.
              '航班目的地计划预时间状态' +
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:—');

  const litProps = [], panes = [], pools = [];
  // The figures behind the desks and at the gate, kept so the tick can breathe them. Each entry is
  // the props that make one bust, the point to lean about (the hip, where a standing person
  // shifts from), and the yaw so the lean is around their facing axis and reads from any angle.
  // Seated passengers opt out — leaning a seated figure looks like the chair is tilting.
  const agentBusts = [];
  // The aircraft that is not parked. Its pieces are built once, at rest at x 0 on the runway
  // centreline, and flown by rewriting their matrices — the same arrangement the subway car uses,
  // for the same reason: a moving thing has to be one set of props that gets moved, not a set that
  // gets rebuilt. `flierC` is the point it rotates about, which has to be its own centre and not
  // the world origin or raising the nose would swing the whole aeroplane through the sky.
  const flierProps = [], flierGear = [];
  let flierC = null, flierLamps = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  // Pools of light on the floor, kept so the clock can turn them up. A 44 m hall has one point
  // lamp in the shader and it reaches about four metres: after dark everything else in here is
  // lit by these, and if they do not come up the terminal closes for the night.
  function pool(m, c, a) { const g = glow(m, c, a); g.a0 = a; pools.push(g); return g; }
  let skyProp = null;
  // The rooflight glazing. Kept, because a skylight is only ever the colour of the sky above it
  // and the sky above this one goes dark at ten o'clock at night like everybody else's. Warm now,
  // because the sky this hall stands under is a low one.
  const skyPanes = [], ROOFSKY = C('#e0dbc8');
  // The two horizon bands stacked in front of the backdrop. Same night treatment as the backdrop
  // itself — a gold sunset burning away behind an unlit terminal at eleven at night was the exact
  // bug `skyProp` was fixed for, and a second sky needs the same fix or it reintroduces it.
  const skyBands = [];

  let seed = 0x71a0e3;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // ---------------------------------------------------------------- rewritable text
  // A run of n character slots that can be rewritten while the game runs, which is what turns
  // a painted departure board into a working one. Each slot keeps its own matrix and the setter
  // rebuilds them, so a two-character status still sits centred in a three-character column.
  function slots(x, y, z, yaw, n, o = {}) {
    const size = o.size || .16, gap = o.gap === undefined ? .04 : o.gap;
    const step = size + gap, lift = o.lift === undefined ? .012 : o.lift;
    const ax = Math.cos(yaw), az = -Math.sin(yaw);
    // ---- why these are NOT built at alpha 0, and why they carry their own cull sphere.
    //
    // They used to be `p.alpha = 0` here. That is invisible, which was the intent, and it also
    // permanently excluded every one of them from batching: js/build.js keys batches at build time
    // and drops anything with `alpha < 0.999`, because batching reorders drawing and transparency
    // is the one thing in this renderer that depends on order. The departure board alone is 173
    // characters, so that was 173 draw calls a frame spent on a sign — measured and reported by
    // the board agent, not guessed.
    //
    // A slot that is *fully* invisible has no ordering problem at all, and the instanced path
    // carries alpha per instance. So alpha is left to `set()` below, which already writes 0 for an
    // unused slot: the character batches, and an empty one costs an instance rather than a call.
    //
    // The catch, and it is the reason for `fixed`. `set()` slides each glyph along the run to
    // centre the string, so its position changes after the scene is built — and the draw loop now
    // reads every batched prop's centre and radius out of a Float32Array packed once at build
    // time (see the note in js/build.js). A prop that moves after that would be culled against
    // where it used to be. So each slot is given, once, a conservative sphere covering the WHOLE
    // run it can ever occupy, and `fixed` stops `finish()` recomputing a tight one from the
    // matrix it happens to hold. Slightly generous culling on a sign is free; culling a character
    // against a position it left is a character that vanishes at the edge of the frame.
    // A slot that `set()` has not written yet is hidden by PARKING ITS MATRIX, not by alpha.
    //
    // The first attempt at this used alpha and regressed the departure board within minutes: a
    // column `set()` never writes — the whole 预计 column on an on-time row, the third cell of a
    // two-character 状态 — kept the placeholder and the board read 正 seven times down. `set()`
    // does hide unused slots with alpha 0, but only for slots it is called on at all; the ones it
    // never touches keep whatever the build left, and the build used to leave alpha 0.
    //
    // Parking is the right primitive because it is orthogonal to batching, which is the whole
    // point of the change: the glyph joins the batch, and an unwritten one is simply a degenerate
    // instance sixty metres under the floor. js/metro.js already hides its own board slots this
    // way, for the same reason.
    const half = (n * step) / 2 + size;
    const PARK = M.trs(0, -60, 0, 0, .001, .001, .001);
    const ps = [];
    for (let i = 0; i < n; i++) {
      const p = glyphs(x, y, z, yaw, '正', { ...o, size, gap: 0 })[0];
      p.fixed = true;
      p.cx = x; p.cy = y; p.cz = z; p.r = half;
      p.m = PARK;
      ps.push(p);
    }
    return function set(str, color) {
      const txt = String(str === undefined || str === null ? '' : str).slice(0, n);
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (i >= txt.length) { p.alpha = 0; p.m = PARK; continue; }
        // A character with no cell in the glyph atlas draws as a SOLID COLOURED QUAD and says
        // nothing about it: Glyphs.rect returns null, the draw loop writes a zero-width cell, and
        // the fragment shader takes the not-a-glyph path. That is the real mechanism behind "the
        // screens lie" — found by the gate agent, which proved every character the gate can
        // currently show is registered, and then pointed out that the next new flight or status
        // string is one edit away from putting a solid block on the board, the gate and the
        // kiosks at once. `slots()` only ever registered its own '正' placeholder.
        //
        // Registering here is too late — the atlas sheet is built once at boot — so an unknown
        // character is parked instead. A missing glyph now shows nothing, which is a gap somebody
        // notices, rather than a coloured rectangle, which reads as a design.
        if (!Glyphs.rect(txt[i])) { p.alpha = 0; p.m = PARK; continue; }
        p.alpha = o.alpha === undefined ? 1 : o.alpha;
        p.ch = txt[i];
        if (color) p.color = color;
        const t = (i - (txt.length - 1) / 2) * step;
        p.m = M.mul(M.trans(x + ax * t, y, z + az * t), M.mul(M.rotY(yaw),
          M.mul(M.trans(0, 0, lift), M.mul(M.rotX(Math.PI / 2), M.scale(size, 1, size)))));
        // The centre and radius are deliberately NOT updated: they are the run-wide sphere set
        // above, which already contains every position this glyph can slide to. Writing a tight
        // one here would be ignored by the batched path anyway and wrong for the plain one.
      }
    };
  }
  const hhmm = m => {
    const w = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
  };

  // ---------------------------------------------------------------- parts
  // A run of airport seating: a beam on two feet with the pans and backs hung off it, arms
  // between the seats and a leather look to them. The same family as the railway station's.
  // `c` is the upholstery. Landside and airside were the same blue bench in a hall that changes
  // its floor from stone to carpet at the partition, and a terminal does not furnish the two
  // halves alike: outside security the seating is hard-wearing grey because it is used by people
  // who have not been screened, and inside it is upholstered because the airline is paying.
  function seatRun(cx, cz, ry, n, c = col.seat) {
    const T = { ry, tag: '座椅' };
    const w = n * .62;
    for (const s of [-1, 1])
      box(cx + Math.cos(ry) * s * (w / 2 - .26), .20, cz - Math.sin(ry) * s * (w / 2 - .26),
        .12, .40, .50, col.steelD, { ...T, hard: true, gloss: G.metal, ...M_METAL });
    box(cx, .38, cz, w, .09, .18, col.steelD,
      { ...T, hard: true, gloss: G.metal, ...M_METAL });
    for (let i = 0; i < n; i++) {
      const o = -w / 2 + .31 + i * .62;
      const sx = cx + Math.cos(ry) * o, sz = cz - Math.sin(ry) * o;
      // The pans and backs are the leather-look ones the comment above describes, so they take
      // the fabric weave rather than the metal — at .34, one repeat per seat, because a seat is
      // the one piece of furniture here the player is close enough to read the grain of.
      box(sx, .45, sz, .54, .06, .50, c,
        { ...T, hard: true, gloss: .34, mat: 'fabric', matScale: .34, matAmt: .22 });
      box(sx, .70, sz - Math.cos(ry) * .24, .54, .48, .06, c,
        { ...T, hard: true, rx: -.14, gloss: .34,
          mat: 'fabric', matScale: .34, matAmt: .22 });
      if (i < n - 1)
        box(sx + Math.cos(ry) * .31, .56, sz - Math.sin(ry) * .31, .05, .13, .44,
          col.chrome, { ...T, hard: true, gloss: G.metal });
    }
    solid(cx - w / 2 - .1, cx + w / 2 + .1, cz - .36, cz + .36);
    shade(cx, cz, w + .4, 1.1, .22);
  }

  // 行李车 a baggage trolley, of the kind that is always stacked forty deep and never where
  // you are. `load` puts somebody's suitcases on it.
  function trolley(cx, cz, ry, load = 0) {
    const T = { ry, tag: '行李车' };
    box(cx, .16, cz, .62, .06, .92, col.steelD, { ...T, hard: true, gloss: G.metal });
    for (const [ox, oz] of [[-.26, -.40], [.26, -.40], [-.26, .40], [.26, .40]])
      cyl(cx + ox, .06, cz + oz, .06, .05, col.black, { ...T, rz: Math.PI / 2, gloss: .26 });
    for (const s of [-1, 1])
      cyl(cx + s * .28, .58, cz + .42, .025, .90, col.steelD, { ...T, gloss: G.metal });
    capsule(cx, 1.02, cz + .42, .028, .60, .028, col.charcoal,
      { ...T, rz: Math.PI / 2, gloss: .28 });
    box(cx, .78, cz + .44, .50, .34, .04, col.chrome, { ...T, hard: true, gloss: G.metal });
    for (let i = 0; i < load; i++)
      box(cx, .30 + i * .30, cz - .06 + i * .04, .52, .26, .74,
        [C('#4a4f58'), C('#6d4a3c'), C('#37506a')][i % 3],
        { ...T, gloss: .30 });
  }

  // 行李箱 one suitcase, standing on its wheels, for the floor beside somebody's feet.
  function suitcase(cx, cz, ry, c, tall = .74) {
    const T = { ry };
    box(cx, tall / 2 + .04, cz, .46, tall, .24, c, { ...T, gloss: .30 });
    box(cx, tall / 2 + .04, cz - .13, .34, tall - .16, .03, C('#2a2e33'), { ...T, gloss: .26 });
    capsule(cx, tall + .18, cz, .022, .30, .022, col.charcoal, { ...T, gloss: .30 });
    for (const s of [-1, 1])
      cyl(cx + s * .17, .05, cz, .05, .04, col.black, { ...T, rz: Math.PI / 2, gloss: .24 });
    shade(cx, cz, .8, .6, .26);
  }

  // A stanchion-and-tape queue line: posts along a run with the tape strung between them.
  function queueLine(x0, z0, x1, z1, n) {
    for (let i = 0; i <= n; i++) {
      const k = i / n, px = x0 + (x1 - x0) * k, pz = z0 + (z1 - z0) * k;
      // The one barrier in the room you are ever within arm's length of, and forty of them in
      // shot at once — whatever goes on a stanchion is the thing this hall repeats most. A
      // 1.20 m repeat puts the whole 1 m post inside a single tile, so what it picks up is one
      // slow tonal drift down its length and no pattern at all.
      cyl(px, .50, pz, .07, 1.00, col.steelD,
        { gloss: G.metal, ...M_METAL, matScale: 1.20 });
      cyl(px, .04, pz, .18, .07, col.charcoal, { gloss: .26 });
      if (i === n) break;
      const nx = x0 + (x1 - x0) * ((i + 1) / n), nz = z0 + (z1 - z0) * ((i + 1) / n);
      const len = Math.hypot(nx - px, nz - pz);
      capsule((px + nx) / 2, .96, (pz + nz) / 2, .014, len, .014, col.charcoal,
        { ry: Math.atan2(nx - px, nz - pz), rx: Math.PI / 2, gloss: .24 });
    }
  }

  // Somebody working behind a counter.
  //
  // Every desk in this terminal was built for a person and then left empty, and that is the one
  // thing a set can be wrong about that no amount of detail elsewhere fixes: five screens, five
  // printers, five stools and nobody on any of them reads as a building being handed over
  // rather than an airport working.
  //
  // These used to be waist-up busts. From the front the counter hid that shortcut, but from the
  // side and across the open terminal it produced floating heads and shoulders. They now have a
  // complete body even where the desk naturally occludes it, so no camera angle exposes a missing
  // torso or legs. `bust:true` remains for a genuinely enclosed booth.
  //
  // Those two are in alpha, because both are seen against their own lit booth. These are in
  // colour: this hall is lit from both sides of every counter in it, and a charcoal bust at 85%
  // in daylight is not a silhouette, it is a smudge — the same mistake `metro.js` records
  // making and undoing.
  //
  // The hair is a second ellipsoid a few millimetres outside the skull, pushed back off the
  // face, so the two surfaces cross in a hairline instead of the hair sitting on the head like
  // a cap. Bigger than the head everywhere except the front, or there is no face.
  //
  // `yaw` is the way they are facing, in the same convention as `glyphs` — 0 faces +z. `base`
  // is where the body stops being drawn, so set it below the counter top and nothing is ever
  // seen to float. `tag` must be the tag of the fixture they are standing at: an untagged prop
  // in front of a tagged one swallows the ray and the desk stops being pickable.
  function agent(x, z, yaw, o = {}) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);        // the way they face
    const gx = Math.cos(yaw), gz = -Math.sin(yaw);       // across their shoulders
    const sh = o.sh === undefined ? 1.40 : o.sh;         // shoulder height
    const base = o.base === undefined ? sh - .62 : o.base;
    const uni = o.uni || col.navy;
    const skin = o.skin || C('#dfab7e'), hair = o.hair || C('#241f1c');
    const T = { tag: o.tag, ry: yaw };
    const F = { ...T, mode: 7, gloss: .06 };             // cloth, the way figure.js does it
    const S = { ...T, gloss: .16 };
    // Capture the props so the tick can lean them, the way the flier captures its pieces. A standing
    // bust behind a counter registers here; a seated passenger passes `_noSway` so the chair does
    // not appear to tilt. The pivot is the hip, which is where a standing person actually shifts.
    const props = [];
    const B_ = fn => (...a) => { const p = fn(...a); props.push(p); return p; };
    const _box = B_(box), _cyl = B_(cyl), _ball = B_(ball), _cap = B_(capsule);
    _box(x, (base + sh - .07) / 2, z, .40, sh - .07 - base, .25, uni, F);
    _cap(x, sh, z, .100, .40, .100, uni, { ...F, rz: Math.PI / 2 });
    if (o.scarf) {
      _cap(x + fx * .055, sh - .035, z + fz * .055, .042, .30, .042, o.scarf,
        { ...F, rz: Math.PI / 2 });
      _box(x + fx * .10, sh - .11, z + fz * .10, .07, .11, .05, o.scarf, F);
    }
    _cap(x + fx * .012, sh + .085, z + fz * .012, .046, .13, .046, skin, S);
    const hy = sh + .20;
    _ball(x + fx * .018, hy, z + fz * .018, .092, .112, .098, skin, S);
    if (o.cap) {
      // A peaked cap instead of hair, which is the whole uniform on a security officer: at this
      // size the shirt colour says nothing and the hat says everything.
      _cyl(x + fx * .012, hy + .085, z + fz * .012, .098, .075, o.cap, { ...T, gloss: .18 });
      _cyl(x + fx * .012, hy + .122, z + fz * .012, .100, .02, o.cap, { ...T, gloss: .18 });
      _box(x + fx * .105, hy + .052, z + fz * .105, .19, .022, .11, o.cap,
        { ...T, hard: true, gloss: .20 });
    } else {
      _ball(x + fx * .004, hy + .030, z + fz * .004, .096, .098, .102, hair,
        { ...T, gloss: .18 });
    }
    // A complete lower body. Most of it is naturally hidden by the desk from the passenger side,
    // but it must still exist for the long side views across this hall.
    if (!o.bust) {
      const floor = o.floor === undefined ? .009 : o.floor;
      const legs = o.legs || C('#333b46');
      for (const s of [-1, 1]) {
        const lx = x + gx * s * .105, lz = z + gz * s * .105;
        _cap(lx, floor + (base - floor) / 2 + .03, lz, .085, base - floor, .085,
          legs, F);
        _box(lx, floor + .035, lz + fz * .03, .12, .07, .26, o.shoe || C('#2b2f34'),
          { ...T, gloss: .22 });
      }
      shade(x, z, 1.0, 1.0, .22);
    }
    // The arms. Two ways, because a person at a desk and a person in a queue do opposite things
    // with them: the desk one puts the forearms out flat on the counter, and hanging arms behind
    // a counter made the agents look like they were queuing at their own desks. The queuing one
    // hangs them, and a forearm reaching horizontally into thin air looked like a sleepwalker.
    if (o.arms === 'down') {
      for (const s of [-1, 1]) {
        const ax = x + gx * s * .195, az = z + gz * s * .195;
        _cap(ax + fx * .02, sh - .16, az + fz * .02, .062, .32, .062, uni, F);
        _cap(ax + fx * .06, sh - .45, az + fz * .06, .056, .28, .056, uni, F);
        _ball(ax + fx * .08, sh - .62, az + fz * .08, .046, .056, .046, skin, S);
      }
    } else {
      const hh = o.hands === undefined ? base + .46 : o.hands;
      const reach = o.reach === undefined ? .30 : o.reach;
      for (const s of [-1, 1]) {
        const ax = x + gx * s * .185, az = z + gz * s * .185;
        const ez = .11, dy = sh - .05 - hh;
        _cap(ax + fx * ez / 2, (sh - .05 + hh) / 2, az + fz * ez / 2, .062,
          Math.hypot(dy, ez), .062, uni, { ...F, rx: -Math.atan2(ez, dy) });
        _cap(ax + fx * (ez + reach / 2), hh, az + fz * (ez + reach / 2), .056, reach, .056,
          uni, { ...F, rx: Math.PI / 2 });
        _ball(ax + fx * (ez + reach + .045), hh, az + fz * (ez + reach + .045), .050, .042, .050,
          skin, S);
      }
    }
    // A readable face. The old agents stopped at a skin-coloured ball under a hair ball; beside
    // the fully rigged staff in game.js that looked like a head failing to load. Eyes, brows, nose,
    // mouth, collar and name badge make these background workers belong to the same visual world.
    const hcX = x + fx * .018, hcZ = z + fz * .018;
    const dark = C('#2a2422'), white = C('#f1eee7'), lip = C('#a86662');
    for (const s of [-1, 1]) {
      const ex = hcX + gx * s * .036 + fx * .088;
      const ez = hcZ + gz * s * .036 + fz * .088;
      _ball(ex, hy + .020, ez, .017, .013, .010, white, { ...T, gloss: .28 });
      _ball(ex + fx * .009, hy + .020, ez + fz * .009, .008, .008, .006, dark,
        { ...T, gloss: .34 });
      _cap(hcX + gx * s * .036 + fx * .096, hy + .054,
        hcZ + gz * s * .036 + fz * .096, .006, .040, .006, dark,
        { ...T, rz: Math.PI / 2, gloss: .10 });
    }
    _ball(hcX + fx * .101, hy - .008, hcZ + fz * .101, .014, .025, .014,
      skin, S);
    _cap(hcX + fx * .098, hy - .050, hcZ + fz * .098, .006, .047, .006, lip,
      { ...T, rz: Math.PI / 2, gloss: .18 });
    _cap(x + fx * .018, sh + .025, z + fz * .018, .112, .038, .112,
      o.collar || C('#edf0ed'), { ...F, rz: Math.PI / 2 });
    _box(x + gx * .125 + fx * .126, sh - .15, z + gz * .125 + fz * .126,
      .085, .045, .018, o.badge || C('#eee9dc'), { ...T, mode: 1, hard: true, gloss: .24 });
    if (!o._noSway) agentBusts.push({ props, pivot: [x, base, z], fx, fz });
  }

  // Somebody sitting in one of the chairs, waiting. The upper body is the same prop as the one
  // behind the counters; what a chair adds is the half of a person a counter hides, so the legs
  // are here and nowhere else.
  //
  // Shoulder height is 1.03 rather than 1.40, which is not a guess: a seat pan 0.45 off the
  // floor plus the 0.58 m from pan to shoulder that a seated adult has. At standing height the
  // first attempt sat with its chin above the seat back and its knees through the pan in front.
  function passenger(px, pz, yaw, o = {}) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const gx = Math.cos(yaw), gz = -Math.sin(yaw);
    const T = { tag: o.tag, ry: yaw };
    const F = { ...T, mode: 7, gloss: .06 };
    const legs = o.legs || C('#333b46'), shoe = o.shoe || C('#2b2f34');
    for (const s of [-1, 1]) {
      const lx = px + gx * s * .105, lz = pz + gz * s * .105;
      capsule(lx + fx * .21, .545, lz + fz * .21, .078, .42, .078, legs,
        { ...F, rx: Math.PI / 2 });
      capsule(lx + fx * .42, .28, lz + fz * .42, .070, .44, .070, legs, F);
      box(lx + fx * .46, .035, lz + fz * .46, .11, .07, .25, shoe, { ...T, gloss: .22 });
    }
    agent(px, pz, yaw, { ...o, sh: 1.03, base: .50, hands: .70, reach: .22, _noSway: true });
    shade(px + fx * .22, pz + fz * .22, .9, .9, .20);
  }

  // A lit batten in the ceiling, and the pool of light it throws on the floor.
  function batten(cx, cz, len) {
    box(cx, H - .12, cz, len, .14, .30, col.steel, { hard: true, gloss: G.metal });
    litten(box(cx, H - .22, cz, len - .16, .05, .22, col.tube,
      { hard: true, mode: 1, glow: .44 }), .7);
    // The pool under it is warm, not the blue-white it used to be. A batten pool is the tungsten
    // half of the grade: the floor reads as polished stone precisely because the ceiling puts a
    // warm sheen on it that the cool daylight from the glazing then cuts across.
    pool(M.trs(cx, .02, cz, 0, len + 2.6, 1, 4.0), col.warm, .13);
  }

  // 垃圾桶 a bin, in the shape every airport bin is.
  function bin(ox, oz) {
    cyl(ox, .38, oz, .20, .76, col.steelD, { gloss: .30 });
    cyl(ox, .78, oz, .21, .06, col.charcoal, { gloss: .26 });
    solid(ox - .23, ox + .23, oz - .23, oz + .23);
  }

  // 分类垃圾桶 the two-bin split, which Beijing has mandated since 2020: 可回收 on the left in
  // jade, 其他 on the right in grey. A single-stream bin in a Chinese terminal is a bin from
  // before the rules changed, and the pair is also a free vocabulary lesson standing in the aisle.
  // The lettering faces −z, because everything in the gate lounge is read from −z.
  function binSplit(ox, oz) {
    for (const [k, lab, c] of [[-1, '可回收', C('#33564a')], [1, '其他', col.steelD]]) {
      const bx = ox + k * .26;
      cyl(bx, .38, oz, .20, .76, c, { gloss: .30 });
      cyl(bx, .78, oz, .21, .06, col.charcoal, { gloss: .26 });
      for (const g of glyphs(bx, .58, oz - .21, Math.PI, lab,
        { size: .052, gap: .010, color: C('#dfe6ea'), mode: 1 })) litten(g, .3);
    }
    solid(ox - .49, ox + .49, oz - .23, oz + .23);
  }

  // A potted palm, which is the only planting a terminal ever gets.
  //
  // Every frond is a chain: four segments laid nose to tail, each one starting where the last
  // one ended and pitched a little further over than it, so the blade leaves the crown going
  // up, flattens, and hangs down at the tip. The old ones placed three loose planks at fixed
  // radii from the trunk and arrived at a green starfish, which is what happens when the
  // segments of a curve do not know about each other.
  //
  // A box's long axis is its local z, and the transform is rotY then rotX, so a segment
  // pitched by `t` and turned by `a` points along (sin a·cos t, −sin t, cos a·cos t): negative
  // t is up, positive is down, and the same two numbers place it and aim it.
  function palm(px, pz, scale = 1) {
    const s = scale;
    taper(px, .30 * s, pz, .82 * s, .60 * s, .82 * s, col.deskD, { gloss: .22 });
    box(px, .60 * s, pz, .88 * s, .07 * s, .88 * s, col.band, { hard: true, gloss: .24 });
    cyl(px, .62 * s, pz, .33 * s, .05 * s, col.soil, { gloss: .10 });
    // the trunk, in four stacked drums so it narrows the way a trunk does
    const CROWN = 1.94 * s;
    for (let i = 0; i < 4; i++)
      cyl(px, (.74 + i * .32) * s, pz, (.112 - i * .013) * s, .34 * s, C('#5c4b36'),
        { gloss: .16 });
    ball(px, CROWN - .10 * s, pz, .17 * s, .16 * s, .17 * s, C('#4a5c38'), { gloss: .14 });
    for (let i = 0; i < 12; i++) {
      const a = i * 2.3999 + .4;                     // golden angle, so no two sit on top
      const cg = i % 2 ? col.leaf : col.leafL;
      const droop = .40 + (i % 3) * .07;             // how hard this one arches over
      let hx = px, hy = CROWN + (i % 4) * .045 * s, hz = pz, t = -.46 - (i % 2) * .08;
      for (let k = 0; k < 4; k++) {
        const L = (.56 - k * .055) * s, w = (.17 - k * .028) * s;
        const dx = Math.sin(a) * Math.cos(t), dy = -Math.sin(t), dz = Math.cos(a) * Math.cos(t);
        box(hx + dx * L / 2, hy + dy * L / 2, hz + dz * L / 2, w, .055 * s, L, cg,
          { gloss: .14, mode: 15, ry: a, rx: t });
        hx += dx * L; hy += dy * L; hz += dz * L;
        t += droop;
      }
    }
    solid(px - .48 * s, px + .48 * s, pz - .48 * s, pz + .48 * s);
    shade(px, pz, 2.4 * s, 2.4 * s, .22);
  }

  // A low planter run: a stone trough with clipped box in it, for splitting a floor up without
  // walling it off. Terminals are full of them.
  //
  // The planting is a grid of small overlapping domes, not one ellipsoid stretched down the
  // length of the trough — a single ball scaled to the whole run is a green sausage lying in a
  // box, which is exactly what it looked like.
  function planter(cx, cz, w, d) {
    box(cx, .28, cz, w, .56, d, col.deskD, { gloss: .22, ...M_STONE });
    box(cx, .56, cz, w + .06, .08, d + .06, col.band, { hard: true, gloss: .26, ...M_METAL });
    box(cx, .60, cz, w - .16, .06, d - .16, col.soil, { hard: true, gloss: .08 });
    const nx = Math.max(1, Math.round(w / .34)), nz = Math.max(1, Math.round(d / .34));
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const bx = cx - w / 2 + (i + .5) * (w / nx), bz = cz - d / 2 + (k + .5) * (d / nz);
      const r = .19 + ((i + k) % 3) * .022, h = .17 + ((i * 3 + k) % 4) * .025;
      ball(bx, .60 + h * .70, bz, r, h, r, (i + k) % 2 ? col.leaf : col.leafL,
        { gloss: .12, mode: 15 });
    }
    solid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
    shade(cx, cz, w + .5, d + .5, .22);
  }

  // A hanging directional sign: the blue blade every terminal navigates by. Lettered both
  // sides, because a gantry sign readable from one end of a hall is half a sign.
  //
  // A row is either a string or a [Chinese, English] pair. Every gantry in a Chinese airport is
  // bilingual — it is required, it is the thing that makes terminal signage read as an airport's
  // rather than a shopping centre's, and for a player learning these characters the small English
  // line under 值机 is the only gloss they get without stopping to click on something.
  //
  // Latin takes a negative gap. Every glyph is drawn in a square cell and the ink in a Latin one
  // fills about half of it, so at the Chinese line's spacing 'Check-in' comes out as C h e c k - i n.
  // The subtitle sits .21 below its own row and both stay inside the row's .40 band.
  function gantry(cx, cz, w, rows, o = {}) {
    const y = o.y || 4.45, h = .34 + rows.length * .40;
    box(cx, y, cz, w, h, .10, col.blueSign, { hard: true, gloss: .24 });
    for (const s of [-1, 1])
      capsule(cx + s * (w / 2 - .40), (y + h / 2 + H) / 2, cz, .015, H - y - h / 2, .015,
        col.steelD, { gloss: G.metal });
    rows.forEach((r, i) => {
      const [zh, en] = Array.isArray(r) ? r : [r, null];
      const ry = y + h / 2 - .34 - i * .40;
      for (const [oz, yaw] of [[-.07, Math.PI], [.07, 0]]) {
        for (const g of glyphs(cx, ry + (en ? .05 : 0), cz + oz, yaw, zh,
          { size: .24, gap: .07, color: col.white, mode: 1 })) litten(g, .9);
        if (en)
          for (const g of glyphs(cx, ry - .16, cz + oz, yaw, en,
            { size: .115, gap: -.032, color: C('#bcd0e4'), mode: 1 })) litten(g, .7);
      }
    });
  }

  // ---------------------------------------------------------------- runtime handles
  // Everything the game reaches back into after the room is built: the board rows, the two
  // gate screens, the barrier at security and the lamps that say whether it is open.
  const boardRow = [];             // per flight: { st, gate } setters
  const beltBags = [];             // the cases riding the oversize belt: { p, ph, m0 }
  let boardHead = null;
  const gateSet = {};              // the screen over the airbridge door
  let secBar = null, secLamp = [], secArrow = null, secOpenT = -1;
  let deskLamp = [];               // per position: { p: the lamp, fl: which flights it works }
  const GATE_HOLD = 9.0;           // seconds a cleared lane stays open

  // ---------------------------------------------------------------- surfaces
  // The large surfaces this hall takes its mood from now carry a real tiling texture, read
  // triplanar in world space, on top of the shading mode they already had. `matScale` is one
  // repeat in metres and is set to what the thing actually is: 1.25 m floor slabs, because that
  // is the pitch of the grout grid already drawn over them and a stone texture that disagrees
  // with its own joints is worse than none; 2.6 m plaster, a wall finish with no module at all
  // that only wants to stop being a flat sheet of paint; 2.0 m concrete on the soffits.
  //
  // `matAmt` is how far the texture may move the colour, and every number below is lower than
  // it looks like it should be. The reason is worth writing down, because it is not obvious
  // from the parameter name and it is the whole difference between this reading as a terminal
  // and reading as an overexposed one.
  //
  // The shader does `base *= mix(1.0, tex / 0.22, matAmt)` — it divides the texture by mid grey
  // and multiplies, so that a material adds its variation without replacing the chosen colour.
  // That is neutral only for a texture whose average *is* mid grey, and almost none of these
  // are. Measured, as tex/0.22 at the average pixel:
  //
  //     steel 1.00 · paving 1.43/1.27/0.72 · concrete 2.18 · plaster 2.34
  //     fabric 2.68 · wood 2.77/1.51/0.72 · tile 2.96/2.71/2.48 · metal 4.42
  //     asphalt 0.36 · rooftile 0.14
  //
  // So `metal` at the 0.34 this file first used did not add grain to the stanchions and the
  // kerbs — it multiplied them by 2.16 and turned every piece of steel in the hall white. The
  // palette at the top of this file is graded warm against one directional light with no
  // bounce, and its *values* are the grade; a material that moves them has repainted the room
  // whatever it did to the texture.
  //
  // So the metalwork does *not* use `metal`. At any amount large enough to see, a near-white
  // photograph is not grain on a grey post, it is a grey post turned white — 0.34 of it doubled
  // every stanchion and kerb in the hall, which is what the first pass here shipped.
  //
  // Nor does it use `steel`, which is the one material that measures 1.00 and would therefore
  // cost no value at all. It is a *corrugated* sheet, at roughly twenty ribs to the tile: on a
  // 1 m stanchion at any scale that keeps the ribs subtle the post comes out looking threaded,
  // and the second pass here shipped that. Value-neutral and unusable are not exclusive.
  //
  // What both jobs actually want is `concrete` — a smooth grey blotch with no direction and no
  // module — held down to 0.18–0.24, where it lifts 12% to 25% rather than the 36% it does at
  // the 0.30 that looks reasonable in the parameter list. Grain, not repaint. The same reasoning
  // puts it on the counters: `paving` is a warm stone and tempting for col.desk's cream, but it
  // is a *cobbled* photograph, and on a 3 m information drum at a 1.1 m repeat the cobbles read
  // individually and the enquiry desk comes out as a garden wall.
  //
  // `paving` is still right for the one surface it was made for. A floor is seen at a grazing
  // angle across 44 m with mode 9's own slab shading over the top of it, and at a 1.25 m repeat
  // — the pitch of the grout grid already drawn on it — none of the cobbles resolve. It reads
  // as what it is: big pale stone with a warm cast, lifting red 10% and dropping blue.
  const M_FLOOR = { mat: 'paving',   matScale: 1.25, matAmt: .34 };
  // The inlay band and the security channel are a different floor finish from the hall — that
  // is the entire reason they are a different colour — and they have to be a different material
  // too, for a reason that only shows up once it is on the floor. `paving`'s cobbles stay
  // invisible on col.floor's near-white because there is very little room left above it for the
  // texture to move, and on col.inlay's mid blue-grey there is: the same 0.34 that reads as
  // stone grain on the hall floor resolved into individual cobbles the moment it crossed onto
  // the darker band, and the route through the middle of the terminal came out cobbled.
  // `concrete` is smooth and has nothing in it that can resolve.
  // .15 and not the .20 the other concrete surfaces take. This band is the darkest large area of
  // floor in the building, so it is the one the bloom in the post chain notices: at .20 the 24%
  // lift on col.inlay was enough to start the security channel glowing and to put a haze back on
  // the partition behind it that looked exactly like the AO artifact but was mine.
  const M_INLAY = { mat: 'concrete', matScale: 2.20, matAmt: .15 };
  const M_WALL  = { mat: 'plaster',  matScale: 2.60, matAmt: .24 };
  const M_SOFF  = { mat: 'concrete', matScale: 2.00, matAmt: .24 };
  const M_STONE = { mat: 'concrete', matScale: 1.60, matAmt: .20 };  // counters and piers
  const M_METAL = { mat: 'concrete', matScale: .50,  matAmt: .18 };  // fascias, barriers, plant
  const M_TILE  = { mat: 'tile',     matScale: .30,  matAmt: .24 };  // the toilets
  const M_CARPET= { mat: 'fabric',   matScale: .90,  matAmt: .14 };  // airside
  const M_ASPH  = { mat: 'asphalt',  matScale: 3.40, matAmt: .30 };  // the apron and the runway
  const M_WOOD  = { mat: 'wood',     matScale: .90,  matAmt: .30 };

  function build() {
    // ================================================================ shell
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor, { mode: 9, gloss: .38, ...M_FLOOR });
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // Three sides solid; the fourth is a pier at each end and a header over the opening, with
    // the stone kerb further down plugging the sill. Everything between is sky.
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2],
      [(-RX + GX0) / 2, H / 2, -RZ, GX0 + RX, H, 0],
      [(RX + GX1) / 2, H / 2, -RZ, RX - GX1, H, 0],
      [(GX0 + GX1) / 2, (WTOP + H) / 2, -RZ, GX1 - GX0, H - WTOP, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall, { mode: 4, ...M_WALL });
    for (const [x, z, sx, sz] of [[0, RZ - .07, RX * 2, .13], [-RX + .07, 0, .13, RZ * 2],
                                  [RX - .07, 0, .13, RZ * 2]])
      box(x, .17, z, sx, .34, sz, col.band, { hard: true, gloss: .28, ...M_METAL });
    // the floor: big pale slabs, with a dark inlay band running the length of the hall as the
    // route from the subway to the gates, which is the one thing the floor has to say
    for (let i = -17; i <= 17; i++) flat(i * 1.25, .004, 0, .05, RZ * 2, col.grout, { gloss: .12 });
    for (let i = -6; i <= 6; i++) flat(0, .004, i * 1.25, RX * 2, .05, col.grout, { gloss: .12 });
    flat(0, .006, 1.30, RX * 2, .80, col.inlay, { mode: 9, gloss: .30, ...M_INLAY });
    // And what the band is for, written on it. A dark stripe running the length of a hall is a
    // stripe; a stripe with chevrons on it pointing the way you are meant to go is a route, and
    // this one is the route from the subway at the west end to the gates at the east.
    //
    // The chevrons are geometry, not the '→' glyph, and that is not fussiness. Floor text lies in
    // the xz plane, and the quad's own up-axis is −z: a reader walking +x has screen-right at +z,
    // so a flat glyph run has to be turned −π/2 and its characters spread across the band rather
    // than along it. An arrow glyph in that layout points across the floor at the seating, which
    // is the exact opposite of the one thing an arrow has to get right. Two rotated slabs meeting
    // at a point have no such ambiguity.
    for (let i = -8; i <= 8; i++) {
      const ax = i * 2.60 + .40;
      for (const [oz, ry] of [[-.14, Math.PI / 4], [.14, 3 * Math.PI / 4]])
        flat(ax - .14, .009, 1.30 + oz, .075, .40, C('#cfdde6'), { ry, mode: 1 });
    }
    // 登机口, twice along the band, laid across it and read while walking east. `glyphs` stands
    // its quads up, so the matrix is rebuilt without the stand-up rotation — and rebuilt rather
    // than patched, because the `lift` that holds a glyph clear of its board runs along the
    // board's normal, and once the quad is flat that normal is +y rather than out of a wall.
    for (const gx of [-9.40, 8.60])
      for (const g of glyphs(gx, .010, 1.30, -Math.PI / 2, '登机口',
        { size: .24, gap: .03, color: C('#cfdde6'), mode: 1 }))
        g.m = M.mul(M.trans(gx, .010, g.m[14]),
          M.mul(M.rotY(-Math.PI / 2), M.scale(.24, 1, .24)));
    // the ceiling: barrel coffers on steel trusses with rooflights let into them, which is what
    // a terminal roof is. The rooflights are why the middle of the hall is bright.
    for (let k = -6; k <= 6; k++) {
      const cz = k * 1.42;
      if (Math.abs(cz) > 6.4) continue;
      box(0, H - .06, cz, RX * 2 - 1.0, .10, 1.00, col.slab,
        { hard: true, gloss: .18, ...M_SOFF });
    }
    for (const cz of [-4.6, -1.6, 1.6, 4.6]) {
      for (const s of [-1, 1])
        box(0, H - .38, cz + s * 1.08, RX * 2 - 1.0, .70, .16, col.slab,
          { hard: true, gloss: .18, ...M_SOFF });
    }
    for (let i = -7; i <= 7; i++)
      box(i * 3.0, H - .82, 0, .22, .22, RZ * 2 - .6, col.steelD,
        { hard: true, gloss: G.metal, ...M_METAL });
    // rooflights: a run of them down the crown of the roof. Sky through a frame, not a lit
    // panel.
    //
    // These were #f6f8f4 at glow .30, which is near-white matte at a third of full emission,
    // and that is not a skylight — it is a row of blown-out white rectangles set into the
    // ceiling. A skylight is a hole with weather on the other side of it, so they are the
    // colour of the sky the apron backdrop is painted in, at a third of that glow, with a steel
    // surround and two glazing bars across each aperture so the eye has something to read the
    // depth of the opening against. The light on the floor was never coming from the brightness
    // of these anyway — that is the sun patch and the pool below, which are untouched.
    for (let i = -6; i <= 6; i++) {
      const lx = i * 3.0 + 1.5;
      skyPanes.push(litten(box(lx, H - .17, 0, 2.20, .05, 1.60, [...ROOFSKY],
        { hard: true, mode: 1, glow: .18 }), -.30));
      box(lx, H - .21, 0, 2.34, .07, .10, col.steel, { hard: true, gloss: G.metal });
      for (const oz of [-.80, .80])
        box(lx, H - .21, oz, 2.34, .07, .10, col.steel, { hard: true, gloss: G.metal });
      for (const ox of [-1.13, 1.13])
        box(lx + ox, H - .21, 0, .09, .07, 1.70, col.steel, { hard: true, gloss: G.metal });
      glow(M.trs(lx, .015, 0, 0, 5.2, 1, 4.4), C('#ffeccb'), .10, true);
      pool(M.trs(lx, .014, 0, 0, 4.6, 1, 3.8), C('#f7e8cd'), .06);
    }

    // ================================================================ 飞机 the apron
    // Built before the glass, because a translucent prop still writes depth and a curtain wall
    // hung in front of an aeroplane deletes the aeroplane. Everything out here is beyond the
    // room, so it is only ever seen through the glazing.
    const AZ = -RZ - 13.0;
    flat(2.0, -.06, AZ + 4.0, 96, 26, col.apron, { mode: 9, gloss: .16, ...M_ASPH });
    // ---- depth. The apron used to stop 9 m behind the parked aircraft with the sky painted on a
    // wall right there, which is fine for a still view and hopeless the moment anything has to move
    // out there: a runway needs to be visibly *further away* than the aeroplane at the stand, and
    // there were four metres to put it in. The first attempt did exactly that and the runway was
    // invisible from every seat in the lounge — 22 m of aircraft entirely behind 26 m of parked one.
    //
    // So the ground now runs out to AZ − 29 and the backdrop stands at AZ − 34, which is 21 m
    // beyond the stand. Two consequences worth stating: the backdrop has to grow in proportion or
    // it stops covering the opening (same angle, three times the distance), and the grass between
    // the concrete and the runway is what actually sells the distance — an unbroken sheet of apron
    // reads as one flat plane however far back it goes.
    flat(2.0, -.058, AZ - 19.0, 300, 20, C('#6e7a52'), { mode: 9, gloss: .10 });
    // A backdrop only as big as the opening can show: tall enough that looking up through the
    // head of the glazing still finds sky, and standing well beyond the far edge of the field.
    skyProp = box(2.0, 24.0, AZ - 34.0, 300, 62, .2, [...col.sky],
      { hard: true, mode: 1, glow: .06 });
    // ---- the sunset, in three bands rather than one flat colour.
    //
    // A single emissive quad is one colour from the ground to the top of the opening, and one
    // colour is never a sky: the eye reads a wall. What it wants is a value ramp, brightest and
    // warmest where the sun is going down and cooling as it climbs. So the backdrop keeps the cool
    // upper sky and two shorter bands stand a few centimetres in front of it — gold at the horizon,
    // a dusty mid-tone above — each one glowing a little harder than the one over it.
    //
    // They stand in *front* of the backdrop and *behind* the hangars, which is the only ordering
    // that works: in front of the hangars they would fog out the one silhouette that gives the
    // field its depth, and behind the backdrop they would not be drawn at all.
    for (const [y, h, c, g] of [[13.0, 20.0, col.haze, .07], [3.4, 12.0, col.dusk, .11]])
      skyBands.push(box(2.0, y, AZ - 33.7, 300, h, .2, [...c], { hard: true, mode: 1, glow: g }));
    // The far side of the field: a line of hangars and a treeline, low and hazy, breaking the join
    // between ground and sky. Without something on that line the horizon is a hard seam and the
    // whole apron reads as a painted flat, however deep it actually is.
    for (let i = -7; i <= 7; i++) {
      const hx = 2.0 + i * 34.0, hw = 22.0 + ((i * 7) % 5) * 3.0;
      box(hx, 2.60, AZ - 30.5, hw, 5.20, .30, C('#8d99a4'), { hard: true, mode: 1, glow: .03 });
      box(hx, 5.35, AZ - 30.6, hw + 1.2, .40, .26, C('#7c8792'), { hard: true, mode: 1, glow: .03 });
    }
    // The treeline. Small, flat-topped and close in colour to the haze — at 3.4 × 4.2 these were
    // nine bright green spheres sitting on the horizon like topiary, which drew the eye to exactly
    // the part of the view that is supposed to recede.
    for (let i = -18; i <= 18; i++)
      ball(2.0 + i * 13.0 + ((i * 11) % 9), 1.30, AZ - 28.0, 2.10, 2.30, 1.40,
        C('#69725a'), { mode: 1, glow: .02 });
    for (const oz of [-1.0, 2.4]) {
      box(2.0, .02, AZ + oz, 84, .04, .22, col.yellow, { hard: true, mode: 1 });
      for (let i = -9; i <= 9; i++)
        box(2.0 + i * 4.2, .03, AZ + oz + (oz < 0 ? -.6 : .6), 1.8, .04, .16, col.white,
          { hard: true, mode: 1 });
    }
    // the stand markings the aircraft is parked on: a lead-in line and the stand number
    box(11.0, .03, AZ + 1.2, .30, .04, 20.0, col.yellow, { hard: true, mode: 1 });
    // the stand number, painted on the tarmac. `glyphs` stands its quads up; these lie down,
    // so the rotation comes back off and the matrix is rebuilt flat.
    for (const g of glyphs(11.0, .05, AZ + 9.6, 0, 'B12',
      { size: 1.30, gap: .30, color: col.yellow, mode: 1 }))
      g.m = M.mul(M.trans(g.m[12], .05, AZ + 9.6), M.scale(1.30, 1, 1.30));
    // The stands either side of this one, and the equipment limit line in front of all three.
    //
    // One lead-in line and one number made the apron read as a car park with a single bay marked
    // out on it. What says apron is that the paint carries on past this aeroplane to somewhere
    // else. B11 is off the west end of the glazing and B13 off the east, so from inside the hall
    // you never see either aircraft — only that their lines are there and that the taxi lane
    // behind serves all three.
    //
    // The red line is the equipment clearance limit, which is the one piece of apron paint that
    // runs parallel to the terminal rather than toward it: nothing on wheels stands inside it
    // while an aircraft is moving. The cone row already sat on that line without anything
    // saying so, and a line under them turns sixteen cones from scatter into a boundary.
    //
    // In AZ, not in PZ: PZ is declared with the aeroplane thirty lines below this and reading it
    // here is a dead-zone ReferenceError that `node --check` cannot see.
    box(2.0, .03, AZ + 10.4, 88, .04, .22, col.redD, { hard: true, mode: 1 });
    for (const [sx, no] of [[-4.0, 'B11'], [25.0, 'B13']]) {
      box(sx, .03, AZ + 1.2, .30, .04, 20.0, col.yellow, { hard: true, mode: 1 });
      for (const g of glyphs(sx, .05, AZ + 9.6, 0, no,
        { size: 1.20, gap: .28, color: col.yellow, mode: 1 }))
        g.m = M.mul(M.trans(g.m[12], .05, AZ + 9.6), M.scale(1.20, 1, 1.20));
    }

    // ---- 跑道 the runway, and the aircraft using it.
    //
    // The apron had one aeroplane on it and that aeroplane never moved, which makes the window a
    // painting. What an airport actually looks like out of a window is something rolling: the one
    // parked at the stand is the static half of the view and this is the other half.
    //
    // Twenty metres beyond the stand, across the grass, which is where a runway belongs relative to
    // a terminal building and — more to the point here — far enough behind the parked aircraft to be
    // seen past it rather than through it. Eleven metres wide, because at this distance it can
    // afford to be: it is the one piece of pavement in the scene that has to read as pavement.
    const RUNZ = AZ - 22.0;
    flat(2.0, -.050, RUNZ, 240, 11.0, col.tarmac,
      { mode: 9, gloss: .20, ...M_ASPH, matScale: 4.20 });
    // The centreline, dashed, and the piano keys at both ends. Dashes rather than a solid line
    // because a solid one reads as a road.
    for (let i = -22; i <= 22; i++)
      box(2.0 + i * 5.4, .015, RUNZ, 3.0, .03, .34, col.white, { hard: true, mode: 1 });
    for (const sx of [-96.0, 100.0])
      for (let k = -3; k <= 3; k++)
        box(sx, .015, RUNZ + k * 1.30, 7.0, .03, .60, col.white, { hard: true, mode: 1 });
    // Edge lights. Off by day, and after dark they are the only thing that says there is a runway
    // out there at all — see setNight, which brings them up with the rest of the terminal.
    // Spaced at 11 m rather than 5.6, which halves eighty-two props to forty-two. Each one is a
    // draw call and none of them is visible before dusk; at this distance the eye reads the line
    // they make and not the count, so the close spacing was forty draw calls spent on nothing.
    for (let i = -10; i <= 10; i++)
      for (const s of [-1, 1])
        litten(box(2.0 + i * 11.2, .10, RUNZ + s * 5.30, .34, .20, .34, C('#e8a94a'),
          { hard: true, mode: 1, glow: .04 }), 1.6);

    // The aeroplane that uses it. Built at rest at x 0 and flown from there, so every matrix here
    // is relative to that. Smaller than the one at the stand — a narrowbody against a widebody —
    // which also keeps it from dwarfing the aircraft the player is actually going to board.
    {
      // Thirty-two metres of it, against the twenty-two the first version had. Not a guess: this is
      // seen from roughly 35 m further away than the aircraft at the stand, and at 22 m long it read
      // as a model of an aeroplane rather than an aeroplane. Scaled to a narrowbody airliner, it
      // subtends about what the parked widebody does, which is what the eye expects of the two.
      const FY = 2.80, FL = { tag: null };
      flierC = [0, FY, RUNZ];
      const put = p => { flierProps.push(p); return p; };
      const gear = p => { flierProps.push(p); flierGear.push(p); return p; };
      // fuselage, nose and radome
      put(capsule(0, FY, RUNZ, 3.05, 30.0, 3.05, col.plane, { ...FL, rz: Math.PI / 2, gloss: .34 }));
      put(taper(16.6, FY, RUNZ, 3.00, 3.60, 3.00, col.planeD, { ...FL, rz: Math.PI / 2, gloss: .34 }));
      put(ball(18.5, FY, RUNZ, .70, 1.26, 1.26, col.charcoal, { ...FL, gloss: .40 }));
      // The flight deck, which the first version of this did not have: an airliner with no windscreen
      // reads as a tube with a cone on it, and the windscreen is the one thing that tells you which
      // end is the front from half a kilometre away.
      put(box(15.1, FY + 1.02, RUNZ + 1.16, 2.10, .54, .70, col.navy,
        { ...FL, hard: true, mode: 1, alpha: .9, gloss: .5 }));
      // the cheatline and the cabin windows, on the +z skin — the side the terminal sees
      put(box(0, FY + .10, RUNZ + 1.60, 27.0, .42, .22, col.blue, { ...FL, hard: true, mode: 1 }));
      put(box(0, FY + .72, RUNZ + 1.46, 25.0, .32, .20, col.glass,
        { ...FL, hard: true, mode: 1, alpha: .6, gloss: .5 }));
      // wings: a swept pair on a root fairing, with the engines hung off pylons under them
      put(box(-1.4, FY - .95, RUNZ, 9.0, 1.30, 6.4, col.plane,
        { ...FL, hard: true, gloss: .30 }));
      for (const s of [-1, 1]) {
        put(box(-2.0, FY - .66, RUNZ + s * 8.4, 6.6, .40, 14.0, col.plane,
          { ...FL, hard: true, ry: s * .22, gloss: .32 }));
        // The winglet. Raked up off the tip, and the single cheapest thing that says "airliner
        // built this century" — a wing that ends in a flat edge reads as a paper dart.
        put(box(-4.3, FY + .55, RUNZ + s * 15.0, 2.60, 2.60, .34, col.plane,
          { ...FL, hard: true, rx: s * .28, gloss: .32 }));
        // pylon, nacelle, and the fan face at the front of it
        put(box(-2.6, FY - 1.12, RUNZ + s * 5.4, 1.20, .90, .70, col.planeD,
          { ...FL, hard: true, gloss: .30 }));
        put(capsule(-3.4, FY - 1.62, RUNZ + s * 5.4, 1.90, 4.40, 1.90, col.planeD,
          { ...FL, rz: Math.PI / 2, gloss: .36 }));
        put(cyl(-1.28, FY - 1.62, RUNZ + s * 5.4, .90, .22, col.charcoal,
          { ...FL, rz: Math.PI / 2, gloss: .30 }));
        put(ball(-1.14, FY - 1.62, RUNZ + s * 5.4, .26, .26, .26, col.chrome,
          { ...FL, gloss: .52 }));
      }
      // fin, tailplane, and the carrier's name up the fin the way the parked one wears it
      put(box(-13.4, FY + 3.05, RUNZ, 4.20, 5.40, .30, col.blue,
        { ...FL, hard: true, rz: -.30, gloss: .32 }));
      for (const g of glyphs(-13.9, FY + 3.90, RUNZ + .18, 0, '中国',
        { size: .78, gap: .16, color: col.goldL, mode: 1, vertical: true })) put(g);
      for (const s of [-1, 1])
        put(box(-13.9, FY + .45, RUNZ + s * 3.2, 3.30, .30, 5.80, col.plane,
          { ...FL, hard: true, ry: s * .18, gloss: .32 }));
      // The tail cone, so the fuselage ends in a point rather than in a flat disc.
      put(taper(-15.9, FY + .30, RUNZ, 2.40, 2.60, 2.40, col.planeD,
        { ...FL, rz: Math.PI / 2, gloss: .32 }));

      // ---- the undercarriage, which comes up. Everything below is registered as `gear` as well as
      // a prop, so `placeFlier` can take it away once the aeroplane is high enough that a real one
      // would have retracted it — which is also the moment it stops being visible from the terminal
      // and starts being three pairs of wheels hanging in the sky.
      gear(box(15.0, FY - 1.90, RUNZ, .34, 1.70, .34, col.steelD,
        { ...FL, hard: true, gloss: G.metal }));
      for (const s of [-1, 1])
        gear(cyl(15.0, FY - 2.72, RUNZ + s * .34, .44, .28, col.black,
          { ...FL, rz: Math.PI / 2, gloss: .22 }));
      for (const s of [-1, 1]) {
        gear(box(-2.2, FY - 2.05, RUNZ + s * 3.3, .40, 2.00, .40, col.steelD,
          { ...FL, hard: true, gloss: G.metal }));
        for (const o of [-.5, .5])
          for (const w of [-.62, .62])
            gear(cyl(-2.2 + o * 1.5, FY - 3.00, RUNZ + s * 3.3 + w, .56, .32, col.black,
              { ...FL, rz: Math.PI / 2, gloss: .22 }));
      }
      // The lights: two wingtips and a landing light in the nose. Kept separately so `flierTick`
      // can bring them up — a red and a green at the tips is the one detail that reads as an
      // aircraft under power rather than a model of one.
      flierLamps = [
        put(ball(-1.4, FY - .58, RUNZ + 15.2, .34, .34, .34, C('#f04a3c'),
          { ...FL, mode: 1, glow: 0 })),
        put(ball(-1.4, FY - .58, RUNZ - 15.2, .34, .34, .34, C('#4ae07a'),
          { ...FL, mode: 1, glow: 0 })),
        put(ball(17.8, FY - .86, RUNZ, .40, .40, .40, C('#fff6e0'),
          { ...FL, mode: 1, glow: 0 })),
      ];
    }

    // ---- the aeroplane at stand B12. Nose to +x, so the check-in hall looks at its tail and
    // the gate lounge looks at its wing — the two halves of the room get different halves of
    // the same aircraft, which is worth more than one view of all of it.
    // Read from thirty metres through glass, so the silhouette is the whole job.
    const PX = 11.0, PZ = AZ - 2.0, PY = 3.10, T = { tag: '飞机' };
    capsule(PX, PY, PZ, 3.10, 26.0, 3.10, col.plane, { ...T, rz: Math.PI / 2, gloss: .34 });
    // nose: a cone and a radome at the +x end, with the flight deck glass on the terminal side
    taper(PX + 14.6, PY, PZ, 3.05, 3.60, 3.05, col.planeD, { ...T, rz: Math.PI / 2, gloss: .34 });
    ball(PX + 16.3, PY, PZ, .70, 1.30, 1.30, col.charcoal, { ...T, gloss: .40 });
    box(PX + 13.4, PY + 1.10, PZ + 1.30, 1.90, .52, .70, col.navy,
      { ...T, hard: true, mode: 1, alpha: .85, gloss: .5 });
    // The cheatline and the cabin windows, laid on the +z skin. That is the side the terminal
    // sees: the window is in the -z wall, so you look out along -z and everything out there
    // shows you its +z face. On -z they were painted on the far side and the fuselage was blank.
    box(PX, PY + .10, PZ + 1.62, 24.0, .44, .24, col.blue, { ...T, hard: true, mode: 1 });
    box(PX, PY + .74, PZ + 1.46, 22.0, .34, .22, col.glass,
      { ...T, hard: true, mode: 1, alpha: .6, gloss: .5 });
    for (let i = 0; i < 22; i++)
      box(PX - 10.5 + i * 1.0, PY + .74, PZ + 1.60, .42, .24, .06, col.navy,
        { ...T, hard: true, mode: 1 });
    // The titles and the registration. An airliner with 中国 on the fin and nothing on the
    // fuselage is an aircraft nobody operates: what a passenger reads across an apron is the
    // carrier's name along the side and the tail number, and the tail number is the one thing
    // that makes it *this* aeroplane rather than the idea of one.
    //
    // Both decals are placed at the z the skin actually reaches at their own height, and they are
    // therefore at different depths. The fuselage radius is 1.55 m, so 1.28 m above the axis the
    // skin has already curved in to 0.87 from centre: paint the titles at the cheatline's z of
    // 1.62 and they float three quarters of a metre off the side of the aircraft, which at this
    // range shears them sideways off the fuselage as the camera moves.
    for (const g of glyphs(PX + 6.40, PY + 1.28, PZ + .92, 0, '中国国际航空',
      { size: .60, gap: .16, color: col.blue, mode: 1, tag: '飞机' })) litten(g, .4);
    for (const g of glyphs(PX - 9.40, PY - .88, PZ + 1.30, 0, 'B-2589',
      { size: .32, gap: -.10, color: col.charcoal, mode: 1, tag: '飞机' })) litten(g, .2);
    // the door the airbridge is nosed up to, which is the one part of the aeroplane you are
    // meant to be able to find
    box(BRX, PY + .70, PZ + 1.58, .90, 1.86, .10, col.planeD, { ...T, hard: true, gloss: .34 });
    box(BRX, PY + .70, PZ + 1.63, .78, 1.74, .04, C('#dcdfe0'), { ...T, hard: true, gloss: .30 });
    // L1, open, with the bridge sealed onto it — and no visible door leaf, which is the point.
    //
    // The gate opposite is calling this flight, so a closed door on the stand is a contradiction.
    // But an open forward door swings out and *forward*, and forward here is +x: at BRX + 1.3 the
    // leaf lands past x 19.20, which is where the glazing stops and the east pier starts, so it
    // would be built and never once seen. And on a real stand you cannot see the leaf anyway,
    // because the canopy that seals the bridge to the skin encloses the doorway and the open leaf
    // together. So the open door is expressed the way it is actually observed from inside a
    // terminal: the canopy pressed against the fuselage, its bellows ribs compressed, its
    // service light on, and cabin light escaping along the top of the joint.
    //
    // The canopy's aircraft-side face is 0.32 m outside the skin, which reads as sealed at thirty
    // metres, and it is deliberately in front of the two door decals above, so it hides them. The
    // closed door is still built: it is the doorway the canopy seals against, and if the canopy
    // ever moves there has to be a door behind it rather than a hole in the fuselage.
    //
    // The lamp goes on the −x side of the canopy, not the +x side. The glazing stops at x 19.20
    // and the pier starts there, so nothing on the +x flank of anything out here is ever in
    // frame; the gate lounge looks at this from x 17 and sees its west cheek.
    const CNZ = PZ + 1.70, CNW = -RZ - 12.4;                 // skin end, bridge end
    box(BRX - .10, PY + .40, (CNZ + CNW) / 2, 2.10, 2.24, CNW - CNZ, C('#3a3d43'),
      { hard: true, gloss: .16 });
    for (let i = 0; i < 3; i++)
      box(BRX - .10, PY + .40, CNZ + .22 + i * .30, 2.22, 2.34, .09, C('#2c2f34'),
        { hard: true, gloss: .14 });
    litten(box(BRX - 1.21, PY + 1.00, CNZ + .42, .14, .14, .14, C('#f0e2b8'),
      { hard: true, mode: 1, glow: .28 }), .9);
    // wing and winglet, off the +z side, which is the only side the terminal can see
    box(PX - 1.0, PY - .70, PZ + 5.4, 9.60, .34, 9.40, col.planeD,
      { ...T, hard: true, gloss: .30, ry: -.14 });
    box(PX - 3.2, PY + .60, PZ + 9.6, .34, 2.40, 2.20, col.planeD,
      { ...T, hard: true, gloss: .30 });
    // tail: the fuselage lifts to the fin, the fin rakes back, the stabiliser sits below it
    taper(PX - 14.2, PY + .70, PZ, 2.10, 3.00, 2.30, col.plane,
      { ...T, rz: -Math.PI / 2, gloss: .34 });
    box(PX - 12.4, PY + 3.40, PZ, .38, 6.20, 4.40, col.red,
      { ...T, hard: true, gloss: .30, rx: .28 });
    box(PX - 13.4, PY + 1.30, PZ, 6.60, .28, 3.00, col.planeD,
      { ...T, hard: true, gloss: .30 });
    // On the side of the fin the terminal can see, which is +z: the fin is 4.40 deep and raked,
    // so its near face at this height is about 1.9 out, and the lettering sits just clear of it.
    for (const g of glyphs(PX - 12.4, PY + 4.40, PZ + 2.26, 0, '中国',
      { size: 1.10, gap: .30, color: col.goldL, mode: 1, tag: '飞机' })) litten(g, .5);
    // engines, slung under the wing on their pylons
    for (const ox of [-2.6, .8]) {
      box(PX + ox, PY - .90, PZ + 3.0, 1.40, .90, 2.20, col.planeD,
        { ...T, hard: true, gloss: .30 });
      capsule(PX + ox, PY - 1.70, PZ + 3.4, 1.90, 4.20, 1.90, col.white,
        { ...T, rz: Math.PI / 2, gloss: .38 });
      cyl(PX + ox + 2.10, PY - 1.70, PZ + 3.4, .92, .22, col.charcoal,
        { ...T, rz: Math.PI / 2, gloss: .30 });
    }
    // undercarriage
    for (const [ox, oz, r] of [[PX + 12.0, PZ, .5], [PX - 1.0, PZ + 2.2, .62],
                               [PX - 1.0, PZ - 2.2, .62]])
      cyl(ox, .62, oz, r, .40, col.charcoal, { ...T, rz: Math.PI / 2, gloss: .26 });
    // Two of them, one each side of the partition: the tail is what the check-in hall can see
    // and the wing is what the gate lounge can see, and standing at either window is the same
    // verb. `pick` hands back whichever of a shared tag is nearest, so they do not fight.
    thing('飞机', PX, 2.60, -RZ - .40, '那架飞机快起飞了。',
      'That aircraft is about to go.',
      '飞 to fly + 机 machine. 起飞 to take off, 降落 to land, 停机坪 the apron.',
      { focus: [11.0, -1.60], reach: 5.4 });
    thing('飞机', PX - 13.0, 2.60, -RZ - .40, '看得见尾翼上的字。',
      'You can read the writing on the tail from here.',
      '飞 to fly + 机 machine. 起飞 to take off, 降落 to land, 停机坪 the apron.',
      { focus: [-9.85, -7.30], reach: 3.4 });

    // ---- the apron around it: a tug and its train of carts, a catering lift, and cones. An
    // empty apron is a car park; what makes it an airport is the vehicles fussing round the
    // aeroplane while it sits there.
    // Each tug now has somebody in it. The cab was a solid smoked box, which is what a cab looks
    // like on a coach and not what one looks like on a baggage tug: a tug has a canopy on four
    // posts and you can see straight through it. Opening it up is what makes room for the driver,
    // and the driver is the reason to open it — a train of four carts loaded with somebody's
    // suitcases, parked, with nobody aboard, is the apron equivalent of the empty check-in bank.
    //
    // The vest is hi-vis orange and the hat is white because at thirty-five metres through 20%
    // glass a face is four pixels and a colour is a colour. On the tug's own yellow the vest
    // would have vanished, which is why it is not yellow.
    for (const [tx, tz, ry] of [[PX + 8.0, PZ + 7.6, .1], [PX - 6.0, PZ + 8.4, -.06]]) {
      box(tx, .55, tz, 2.30, .70, 1.40, C('#c8b23a'), { ry, gloss: .34 });
      for (const [ox, oz] of [[-.86, -.58], [-.86, .58], [.30, -.58], [.30, .58]])
        capsule(tx + ox, 1.48, tz + oz, .055, 1.20, .055, col.steelD, { ry, gloss: G.metal });
      box(tx - .28, 2.12, tz, 1.50, .10, 1.44, C('#3b4048'), { ry, hard: true, gloss: .34 });
      litten(cyl(tx - .28, 2.24, tz, .10, .14, col.amber,
        { ry, mode: 1, glow: .30 }), .8);
      box(tx + .34, 1.28, tz, .10, .06, .34, col.charcoal, { ry, hard: true, gloss: .30 });
      for (const s of [-1, 1]) cyl(tx + s * .80, .28, tz, .28, .30, col.black,
        { ry, rz: Math.PI / 2, gloss: .22 });
      for (let i = 1; i <= 3; i++) {
        box(tx - 1.4 - i * 2.4, .60, tz, 2.00, .70, 1.50, C('#8d9298'), { ry, gloss: .28 });
        box(tx - 1.4 - i * 2.4, 1.10, tz, 1.90, .40, 1.40,
          [C('#5a4a3c'), C('#4a5560'), C('#6a4a44')][i % 3], { ry, gloss: .24 });
      }
    }
    box(PX + 10.0, 1.60, PZ + 6.0, 2.60, 3.20, 2.40, col.white, { gloss: .30, ry: -.2 });
    box(PX + 10.0, 3.60, PZ + 4.6, 2.40, .90, 1.60, C('#d8dcd8'), { hard: true, gloss: .28 });
    // The ground power unit and the water bowser, parked outboard of the wing.
    //
    // Both are in the band 0 < x < 18, and that is the whole reason they are where they are. The
    // glazing runs from −17.60 to 19.20 and the piers are solid either side of it, so an aircraft
    // that is 30 m long only shows the hall the 22 m of itself between those numbers: the nose,
    // the nose gear and everything parked at them sit behind the east pier and cannot be seen
    // from any position in this room. A pushback tractor at the nose would be a prop nobody will
    // ever look at, so there isn't one.
    for (const [gx, gz, body, top, tall] of [
      [13.20, PZ + 8.20, C('#b8bcbe'), col.yellow, 1.05],       // 电源车 the GPU
      [6.60, PZ + 9.10, C('#dce0e2'), C('#2f6392'), 1.30]]) {   // 水车 the water service
      box(gx, tall / 2 + .18, gz, 2.60, tall, 1.60, body, { gloss: .30, ry: .06 });
      box(gx, tall + .22, gz, 2.30, .12, 1.40, top, { hard: true, gloss: .28, ry: .06 });
      box(gx - 1.02, tall * .62, gz - .06, .40, .34, .34, col.charcoal,
        { hard: true, gloss: .26, ry: .06 });
      cyl(gx + .84, tall + .48, gz + .40, .09, .60, col.steelD, { gloss: G.metal });
      for (const [ox, oz] of [[-.86, -.72], [.86, -.72], [-.86, .72], [.86, .72]])
        cyl(gx + ox, .22, gz + oz, .24, .22, col.black, { rz: Math.PI / 2, gloss: .22 });
      // the reel of cable or hose on the deck, which is what tells the two of them apart at range
      cyl(gx + .10, tall + .44, gz - .30, .34, .26, col.charcoal,
        { rx: Math.PI / 2, gloss: .24 });
    }
    for (let i = 0; i < 16; i++)
      taper(PX - 14 + i * 2.0, .22, PZ + 11.0 + (i % 2) * .4, .34, .44, .34, col.orange,
        { gloss: .18 });
    // a second aeroplane, far out and small with it, so the apron has depth rather than a wall
    // of sky behind one aircraft
    const QX = -16.0, QZ = AZ - 15.0;
    capsule(QX, 2.60, QZ, 2.40, 20.0, 2.40, col.plane, { rz: Math.PI / 2, gloss: .32 });
    taper(QX + 11.2, 2.60, QZ, 2.36, 2.80, 2.36, col.planeD, { rz: Math.PI / 2, gloss: .32 });
    box(QX, 2.66, QZ + 1.28, 18.0, .32, .20, col.jade, { hard: true, mode: 1 });
    box(QX - 9.6, 5.10, QZ, .30, 4.60, 3.40, col.jade, { hard: true, gloss: .28, rx: .28 });
    box(QX - .6, 2.10, QZ + 4.4, 7.60, .28, 7.20, col.planeD, { hard: true, gloss: .28, ry: -.12 });

    // ---- the curtain wall itself, after the aircraft: a stone kerb, mullions floor to
    // ceiling, and the glass between them.
    box(0, WSILL / 2, -RZ + .22, RX * 2, WSILL, .44, col.wallD,
      { hard: true, gloss: G.paint, ...M_STONE, matScale: 1.60 });
    box(0, WSILL + .04, -RZ + .30, RX * 2, .10, .58, col.band,
      { hard: true, gloss: .26, ...M_METAL });
    const WMY = (WSILL + WTOP) / 2, NMUL = Math.round((GX1 - GX0) / MUL);
    // The mullions and transoms take a coarser 1.4 m repeat, not the .50 the fascias use: a
    // 16 cm section is a fraction of one tile either way, so what shows on it is a slice of the
    // sheet rather than a pattern — which is what an extruded aluminium mullion is. Twenty-four
    // of these stand across the one wall the whole room is about, so any pattern that did
    // resolve would resolve twenty-four times.
    for (let i = 0; i <= NMUL; i++)
      box(GX0 + i * MUL, WMY, -RZ + .16, .16, WTOP - WSILL, .30, col.steel,
        { hard: true, gloss: G.metal, ...M_METAL, matScale: 1.40 });
    for (const y of [WSILL + .06, 2.72, 4.28, WTOP - .06])
      box((GX0 + GX1) / 2, y, -RZ + .16, GX1 - GX0, .12, .26, col.steel,
        { hard: true, gloss: G.metal, ...M_METAL, matScale: 1.40 });
    for (let i = 0; i < NMUL; i++) {
      const cx = GX0 + i * MUL + MUL / 2;
      // the bay the airbridge leaves through is a door, not glass
      if (Math.abs(cx - BRX) < MUL * .6) continue;
      for (const [y, hh] of [[1.97, 1.38], [3.50, 1.44], [5.04, 1.39]])
        panes.push(box(cx, y, -RZ + .10, MUL - .16, hh, .04, col.glass,
          { hard: true, mode: 1, alpha: .20, gloss: G.glass }));
    }
    // ---- and what comes *through* it. This is the one thing the hall was missing and the reason
    // it read as a windowless white box with a picture of an aeroplane on one side: 36 m of glazing
    // that put no light on the floor. A curtain wall you can see the sun through and cannot see the
    // sun *from* is a poster.
    //
    // Mode 8 is the sun-patch decal — a defined patch with a soft edge and a darker line down its
    // spine where a glazing bar crosses it — so each patch is laid two bays wide and centred on a
    // mullion. That puts its spine exactly where a mullion's shadow belongs, and because the patches
    // butt up at the mullions between them, the dark line falls on every mullion rather than in the
    // middle of every bay. Centring one per bay instead would have painted a shadow down the centre
    // of each pane, which is the one place a curtain wall has nothing to cast one.
    //
    // The run stops short of the airbridge bay, which is a solid door and passes no light.
    for (let i = 1; i < NMUL; i += 2) {
      const cx = GX0 + i * MUL;
      if (Math.abs(cx - BRX) < MUL * 1.4) continue;
      glow(M.trs(cx, .018, -4.55, 0, MUL * 2, 1, 8.10), col.sun, .30, true, 8);
    }
    // Under all of it, one broad soft wash the whole length of the glazing, holding the separate
    // bars together and keeping the mullion shadows from reading as gaps in the floor. Warm and
    // very weak — this is the light the room is sitting in, not a light on anything.
    glow(M.trs((GX0 + GX1) / 2, .016, -5.30, 0, GX1 - GX0, 1, 6.60), col.dusk, .11, true);
    // The sill catches it hardest. A kerb 1.16 m tall standing in a low sun has a bright strip of
    // floor at its foot, and that strip is what tells you the light is coming in low rather than
    // straight down out of the ceiling.
    glow(M.trs((GX0 + GX1) / 2, .020, -7.10, 0, GX1 - GX0, 1, 2.00), col.sun, .16, true);

    // ================================================================ 地铁站 the way in
    // In the +z corner at the west end: in a terminal the subway comes up into the hall and you
    // never go outside to change. It is also where you arrive, so nothing stands near it.
    const dz = RZ - .18;
    box(DX, 1.45, dz - .10, 3.40, 2.90, .34, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    box(DX, 1.34, dz, 2.70, 2.68, .10, col.charcoal, { tag: '地铁站', hard: true, gloss: .24 });
    litten(box(DX, 1.34, dz - .04, 2.40, 2.36, .04, C('#8b9aa5'),
      { tag: '地铁站', hard: true, mode: 1, glow: .10 }), .3);
    for (let i = 0; i < 5; i++)
      box(DX, .13 + i * .18, dz + .10 + i * .27, 2.30, .18, .29, col.slab,
        { tag: '地铁站', hard: true, gloss: .20 });
    box(DX, 3.06, dz - .06, 3.00, .42, .12, col.blueSign,
      { tag: '地铁站', hard: true, gloss: .26 });
    // The +z wall, read from the hall, so the lettering goes on the -z face and faces -z.
    for (const g of glyphs(DX + .40, 3.06, dz - .13, Math.PI, '地铁站',
      { size: .22, gap: .06, color: col.white, mode: 1, tag: '地铁站' })) litten(g, .9);
    // rx, not rz: about z the disc stands on edge and the roundel reads as a white bar.
    cyl(DX - 1.06, 3.06, dz - .13, .16, .03, col.white,
      { tag: '地铁站', rx: Math.PI / 2, mode: 1, gloss: .20 });
    for (const g of glyphs(DX - 1.06, 3.06, dz - .16, Math.PI, '地',
      { size: .18, gap: 0, color: col.blueSign, mode: 1, tag: '地铁站' })) litten(g, .5);
    solid(DX - 1.70, DX + 1.70, dz - .34, RZ);
    thing('地铁站', DX, 3.48, dz - .70, '坐地铁回市里。', 'Take the subway back into town.',
      '地铁 subway + 站 stop. The last stop on the line is the one you came in at.',
      { focus: [DX, dz - 2.10], reach: 2.4 }).station = '机场';

    // ================================================================ 问询处 information
    // A round island where you come up the steps, because the first thing anybody wants in an
    // airport is somebody to tell them where to stand. This one knows about your flight.
    const IX = -17.4, IZ = 1.60;
    cyl(IX, .52, IZ, 1.50, 1.04, col.desk, { tag: '问询处', gloss: .26, ...M_STONE });
    cyl(IX, 1.08, IZ, 1.62, .09, col.deskD, { tag: '问询处', gloss: .24, ...M_STONE });
    cyl(IX, .30, IZ, 1.40, .60, col.blueSign, { tag: '问询处', gloss: .22 });
    box(IX, 1.44, IZ + .40, .52, .34, .05, col.charcoal,
      { tag: '问询处', hard: true, gloss: .34 });
    litten(box(IX, 1.44, IZ + .37, .46, .28, .02, C('#8fbcd4'),
      { tag: '问询处', hard: true, mode: 1, glow: .22 }), .4);
    box(IX - .70, 1.18, IZ - .30, .34, .12, .26, col.white,
      { tag: '问询处', hard: true, gloss: .26 });
    // the drum sign over it, lettered all the way round so it reads from anywhere
    cyl(IX, 3.05, IZ, .90, .70, col.blueSign, { tag: '问询处', hard: true, gloss: .24 });
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
      for (const g of glyphs(IX + Math.sin(yaw) * .93, 3.05, IZ + Math.cos(yaw) * .93, yaw,
        '问询处', { size: .21, gap: .05, color: col.white, mode: 1, tag: '问询处' }))
        litten(g, .9);
    capsule(IX, (3.40 + H) / 2, IZ, .018, H - 3.40, .018, col.steelD, { gloss: G.metal });
    // The greeter stands beside the island instead of being swallowed by its solid drum. From the
    // subway entrance the old placement showed a head above a monitor and no visible body at all,
    // which looked like failed rendering. Here the complete uniformed silhouette is immediately
    // readable, while the counter still remains the interaction target.
    solid(IX - 1.6, IX + 1.6, IZ - 1.6, IZ + 1.6);
    solid(IX + 1.72, IX + 2.18, IZ - .13, IZ + .33);
    shade(IX, IZ, 3.6, 3.6, .24);
    // The warm-lit island, and it is the strongest lamp in the building on purpose. This is the
    // first thing anybody sees coming up out of the subway, it is the one counter in the hall
    // with nothing else near it to borrow light from, and 问询处 is where a lost passenger is
    // supposed to be drawn to — a desk you have to hunt for in a 44 m room is not an enquiry
    // desk. The blue drum below the counter and the greeter beside it both come up with it.
    B.light(IX, 2.30, IZ, [1.00, 0.84, 0.60], .62, 3.0);
    thing('问询处', IX, 1.90, IZ - 1.70, '请问，我的航班在哪个登机口？',
      'Excuse me — which gate is my flight?',
      '问 to ask + 询 to enquire + 处 an office. 请问 is how every question here starts.',
      { focus: [IX, IZ - 2.60], reach: 2.2 });

    // ================================================================ 售票处 the ticket office
    // Where you buy the 机票 itself. Almost nobody buys a seat at a counter any more, which is
    // exactly why the game does: the queue, the glass and the woman behind it are what make the
    // transaction slow enough to have a conversation in, and a conversation is the point.
    // The counter stands 0.9 m off the back wall rather than against it, because somebody has
    // to be able to stand behind it: a ticket window with nobody in it is a shelf.
    const TX = -14.20, TZ = RZ - .30, TC = TZ - .94;
    box(TX, 1.60, TZ + .18, 4.20, 3.20, .30, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    for (let i = 0; i < 3; i++)
      box(TX, 1.10 + i * .60, TZ + .10, 3.40, .06, .34, col.slab,
        { hard: true, gloss: .20 });
    box(TX, .55, TC, 4.00, 1.10, .46, col.desk, { tag: '售票处', gloss: .26, ...M_STONE });
    box(TX, 1.12, TC, 4.10, .08, .56, col.deskD,
      { tag: '售票处', hard: true, gloss: .24, ...M_STONE });
    // The screen glazes the top half only, leaving the counter open the way a ticket window is:
    // full-height glass in front of the clerk turned her into a pale smudge, which is what
    // 26% alpha over a lit wall does to a figure standing behind it.
    for (const [ox, w] of [[-1.55, .90], [0, 1.10], [1.55, .90]])
      box(TX + ox, 2.44, TC + .04, w, .78, .05, col.glass,
        { tag: '售票处', hard: true, mode: 1, alpha: .16, gloss: G.glass });
    for (const ox of [-.80, .80])
      box(TX + ox, 2.10, TC + .04, .22, 1.76, .07, col.steel,
        { tag: '售票处', hard: true, gloss: G.metal });
    box(TX, 2.02, TC + .04, 4.10, .10, .09, col.steel,
      { tag: '售票处', hard: true, gloss: G.metal });
    // The speak-hole and the document dish, which is the pair of details that turn a glazed
    // counter into a ticket window. Without them the screen is a pane of glass you would have to
    // shout through, and the whole conversation the room is built around happens across it.
    //
    // rx, not rz. About z the disc stands on edge and the grille reads as a vertical bar — the
    // same trap the subway roundel at the west end of this hall records falling into.
    cyl(TX, 2.22, TC + .015, .105, .05, col.steelD,
      { tag: '售票处', rx: Math.PI / 2, gloss: G.metal });
    cyl(TX, 2.22, TC - .015, .078, .04, C('#1c1f23'),
      { tag: '售票处', rx: Math.PI / 2, gloss: .30 });
    box(TX, 1.15, TC - .12, .44, .05, .28, col.chrome,
      { tag: '售票处', hard: true, gloss: G.metal });
    // And her, behind it. A ticket window with nobody in it is a shelf — the comment above this
    // fitting has said so since it was built, and the counter has stood 0.9 m off the back wall
    // all along to leave room for exactly this.
    //
    // Shoulders at 1.28, which is a seated clerk on a raised stool and not a guess: the counter
    // top is 1.16, so at a normal seated 1.24 she was a scalp moving behind the stone. She is in
    // the middle bay on purpose, framed by the two mullions, because the pane she is behind is
    // the one the queue rails point at.
    // 陈姐 is the fully rigged, animated clerk at this window (game.js). A second primitive agent
    // in the same coordinates made their two torsos depth-fight and appear only partly rendered.
    for (const ox of [-1.55, 1.55])
      box(TX + ox, 1.30, TC, .70, .16, .40, col.charcoal,
        { tag: '售票处', hard: true, gloss: .30 });
    box(TX - .60, 1.42, TC + .32, .48, .32, .05, col.charcoal,
      { tag: '售票处', hard: true, gloss: .34 });
    litten(box(TX - .60, 1.42, TC + .29, .42, .26, .02, C('#8fbcd4'),
      { tag: '售票处', hard: true, mode: 1, glow: .22 }), .4);
    box(TX, 3.30, TC + .14, 4.30, .70, .14, col.blueSign,
      { tag: '售票处', hard: true, gloss: .26 });
    for (const g of glyphs(TX - .55, 3.30, TC + .06, Math.PI, '售票处',
      { size: .26, gap: .07, color: col.white, mode: 1, tag: '售票处' })) litten(g, .9);
    for (const g of glyphs(TX + 1.30, 3.30, TC + .06, Math.PI, '买机票',
      { size: .17, gap: .05, color: C('#a8c4e0'), mode: 1, tag: '售票处' })) litten(g, .6);
    solid(TX - 2.2, TX + 2.2, TC - .28, RZ);
    // Over the glazed screen, so the clerk behind it is lit from her own side of the glass. A
    // ticket window lit only by the hall is a dark hole with a silhouette in it, which is the
    // thing 16% alpha over an unlit figure was always going to produce.
    B.light(TX, 2.30, TC - .20, [1.00, 0.88, 0.68], .48, 2.8);
    queueLine(TX - 2.10, TC - .90, TX - 2.10, TC - 3.80, 3);
    queueLine(TX + 2.10, TC - .90, TX + 2.10, TC - 3.80, 3);
    thing('售票处', TX, 1.90, TC - .40, '我买一张去上海的机票。',
      "I'd like a ticket to Shanghai.",
      '售 to sell + 票 ticket + 处 office. 单程 one way, 往返 return.',
      { focus: [TX, TC - 1.50], reach: 2.4 });

    // ================================================================ 值机柜台 the check-in row
    // Five positions in a bank: a continuous stone counter, a belt scale let into it at each
    // position, a screen on the far side and the numbered sign hanging over the lot.
    const CKX = -6.45, CKW = 14.10;
    box(CKX, .52, CKZ, CKW, 1.04, 1.30, col.desk,
      { tag: '值机柜台', gloss: .26, ...M_STONE });
    box(CKX, 1.08, CKZ, CKW + .2, .09, 1.44, col.deskD,
      { tag: '值机柜台', hard: true, gloss: .24, ...M_STONE });
    // The fascia is the brushed metal panel a check-in bank is faced in, and it is 14 m long:
    // this is the single largest run of metal in the building and the one the queue stands
    // nose to.
    box(CKX, .40, CKZ - .70, CKW, .80, .05, col.band,
      { tag: '值机柜台', hard: true, gloss: .22, ...M_METAL });
    // the back wall of the bank: cupboards, a tag rail and the staff door at the end
    box(CKX, 1.30, RZ - .30, CKW + .4, 2.60, .40, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    for (let i = 0; i < 5; i++) {
      const dx = -12.0 + i * 2.80;
      // Position 5 is the oversize-baggage position. Its conveyor occupies the footprint where a
      // conventional scale, stool and agent would stand, so only positions 1–4 get desk hardware.
      // Building a fifth desk inside that opaque machine made the worker and scale intersect it.
      if (i < 4) {
      // the belt scale, let into the counter on the passenger side and standing proud of it,
      // rather than a black box abandoned on the floor a metre away from the desk
      box(dx, .30, CKZ - .95, 1.24, .60, .78, col.slab,
        { tag: '值机柜台', hard: true, gloss: .24, ...M_METAL, matScale: .70 });
      box(dx, .62, CKZ - .95, 1.20, .10, .74, col.charcoal,
        { tag: '值机柜台', hard: true, gloss: .28 });
      box(dx, .68, CKZ - .95, 1.10, .04, .64, col.black,
        { tag: '值机柜台', hard: true, gloss: .34 });
      for (let k = 0; k < 5; k++)
        box(dx - .44 + k * .22, .705, CKZ - .95, .04, .01, .62, col.steelD,
          { tag: '值机柜台', hard: true, gloss: .30 });
      // the little weight readout on the end of the scale, which is the bit everybody watches
      box(dx + .74, .84, CKZ - .95, .22, .16, .30, col.charcoal,
        { tag: '值机柜台', hard: true, gloss: .30 });
      litten(box(dx + .74, .84, CKZ - 1.11, .18, .11, .02, C('#7fe0a4'),
        { tag: '值机柜台', hard: true, mode: 1, glow: .24 }), .5);
      // A bag on the scale at the first three positions. There were suitcases standing on their
      // wheels a metre to the side of every scale and nothing on any of the scales themselves,
      // which is a bank of five weighing machines being used as shelves: a case on its wheels is
      // a case nobody has checked in yet, and the whole verb here is putting it down.
      //
      // Lying flat, long axis along x, because that is the way the belt runs — the roller strips
      // are thin in x and 0.62 long in z, so their axes are the z ones and travel is in x.
      if (i < 3) {
        const bc = [C('#37506a'), C('#6d4a3c'), C('#4a4f58')][i];
        box(dx, .84, CKZ - .95, .74, .26, .48, bc,
          { tag: '值机柜台', gloss: .30, ry: .05 + i * .04 });
        box(dx, .84, CKZ - 1.20, .52, .17, .03, C('#262a2f'),
          { tag: '值机柜台', hard: true, gloss: .26 });
        capsule(dx, .99, CKZ - .95, .022, .26, .022, col.charcoal,
          { tag: '值机柜台', rz: Math.PI / 2, gloss: .28 });
        // the tag, looped through the handle — the one piece of paper that says the bag is done
        box(dx + .22, .93, CKZ - .95, .05, .17, .09, col.white,
          { tag: '值机柜台', hard: true, gloss: .18 });
      }
      // The agent's screen, the tag printer, the stool and the boarding-card stack.
      //
      // The screen has moved 0.58 to the left of the position centre, and that is not styling: it
      // was dead centre at 1.25–1.59 m, an agent's head sits at 1.36–1.59, and the two are on the
      // same axis — put somebody on the stool and the monitor deleted her face. Agents sit beside
      // their monitor anyway. The card stack moved with it to keep the pair together.
      box(dx - .58, 1.42, CKZ + .30, .52, .34, .05, col.charcoal,
        { tag: '值机柜台', hard: true, gloss: .34 });
      litten(box(dx - .58, 1.42, CKZ + .27, .46, .28, .02, C('#8fbcd4'),
        { tag: '值机柜台', hard: true, mode: 1, glow: .22 }), .4);
      // the tag printer: a body, the slot in its face, a ready lamp, and the printed tag curling
      // out of it. A white box on a counter is a white box; the strip of paper is the machine.
      box(dx + .50, 1.20, CKZ + .26, .26, .18, .30, col.white,
        { tag: '值机柜台', hard: true, gloss: .28 });
      box(dx + .50, 1.22, CKZ + .10, .19, .03, .03, C('#2a2e33'),
        { tag: '值机柜台', hard: true, gloss: .30 });
      litten(box(dx + .60, 1.28, CKZ + .11, .03, .03, .02, col.lime,
        { tag: '值机柜台', hard: true, mode: 1, glow: .30 }), .4);
      box(dx + .50, 1.19, CKZ + .02, .07, .02, .22, C('#f0ece0'),
        { tag: '值机柜台', hard: true, gloss: .16, rx: .5 });
      // the boarding cards: a stack, and the two off the top of it with a stripe printed down
      // them, which is all it takes for a pale block to stop being a pale block
      box(dx - 1.05, 1.14, CKZ + .26, .30, .06, .22, C('#e8e4d6'),
        { tag: '值机柜台', hard: true, gloss: .18 });
      box(dx - 1.05, 1.175, CKZ + .26, .29, .01, .21, col.white,
        { tag: '值机柜台', hard: true, gloss: .20 });
      box(dx - 1.13, 1.18, CKZ + .26, .05, .012, .20, col.blueSign,
        { tag: '值机柜台', hard: true, mode: 1 });
      box(dx - 1.02, 1.145, CKZ + .04, .28, .012, .20, col.white,
        { tag: '值机柜台', hard: true, gloss: .20, ry: .18 });
      cyl(dx, .30, CKZ + .74, .17, .06, col.charcoal, { gloss: .26 });
      cyl(dx, .48, CKZ + .74, .04, .34, col.steelD, { gloss: G.metal });
      cyl(dx, .66, CKZ + .74, .19, .07, col.seatD, { gloss: .30 });
      }
      // And somebody on every usable stool. Staffing stays independent of the narrow check-in windows;
      // the live underlight says which flights are accepting bags without making the whole bank
      // look abandoned between departures.
      //
      // Shoulders at 1.275, which is the 0.695 stool cushion plus the 0.58 m a seated adult has
      // from pan to shoulder. The counter top is 1.125, so what shows above the stone is the top
      // of the shoulders and the whole head, which is what you see of a check-in agent.
      // Position 2 is occupied by the animated 小许 from game.js. Drawing a primitive worker in
      // the same place caused intersecting torsos and the apparent missing-body bug.
      // and the sign over the position: a number, the verb, and who it is open for
      box(dx, 3.10, CKZ - .30, 2.50, .78, .10, col.blueSign,
        { tag: '值机柜台', hard: true, gloss: .26 });
      for (const g of glyphs(dx - .84, 3.20, CKZ - .36, Math.PI, String(i + 1),
        { size: .34, gap: 0, color: col.white, mode: 1, tag: '值机柜台' })) litten(g, .9);
      const oversize = i === 4;
      for (const g of glyphs(dx + .34, oversize ? 3.20 : 3.30, CKZ - .36, Math.PI,
        oversize ? '超大行李' : '值机',
        { size: oversize ? .13 : .17, gap: oversize ? .03 : .05,
          color: col.white, mode: 1, tag: '值机柜台' })) litten(g, .9);
      // Which flights each position is working, from the schedule rather than from a list of
      // place names that agreed with the board by hand and stopped agreeing the moment it moved.
      //
      // Four check-in desks cover the seven flights without mixing domestic and international
      // destinations: position 3 shares 成都/海口 and position 4 handles all three international
      // services. Position 5 is the adjacent oversize-baggage machine, not a check-in desk.
      const mine = [[0], [1], [2, 3], [4, 5, 6], []][i];
      const strip = litten(box(dx + .34, 2.96, CKZ - .36, 1.34, .24, .02,
        oversize ? col.goldL : col.lime,
        { tag: '值机柜台', hard: true, mode: 1, glow: oversize ? .16 : .26 }), .6);
      if (!oversize) deskLamp.push({ p: strip, fl: mine });
      for (const g of glyphs(dx + .34, 2.96, CKZ - .38, Math.PI,
        oversize ? '托运' : mine.map(k => FLIGHTS[k].to).join(' '),
        { size: oversize ? .14 : mine.length > 2 ? .105 : mine.length > 1 ? .13 : .15,
          gap: oversize ? .05 : mine.length > 2 ? .025 : mine.length > 1 ? .045 : .07,
          color: col.navy, mode: 1, tag: '值机柜台' })) litten(g, .5);
      for (const s of [-1, 1])
        capsule(dx + s * 1.02, 3.66, CKZ - .30, .014, .34, .014, col.steelD, { gloss: G.metal });
      // somebody's bags, stacked where the queue would leave them
      if (i < 4 && i % 2 === 0) suitcase(dx - 1.10, CKZ - 1.80, .3 + i, [C('#4a4f58'), C('#6d4a3c'),
        C('#37506a')][i % 3], .70 + (i % 3) * .06);
    }
    solid(CKX - CKW / 2 - .2, CKX + CKW / 2 + .2, CKZ - 1.40, RZ);
    // Three lamps down a fourteen-metre bank, and not five. The positions are 2.80 apart and
    // the throw here is 3.2, so one per position would have every desk sitting in three
    // overlapping pools and the bank would come out as one flat lit strip — which is the same
    // bank of undifferentiated white it was before. At 5.6 apart the light falls off between
    // desks, and a run of counters that alternates lit and less lit is what tells you there
    // are five of them.
    //
    // z CKZ − 1.15, which is 0.38 clear of the fascia and not behind it. This is the one number
    // here that was wrong first time and it was wrong invisibly: the counter box spans CKZ ±
    // 0.65 and the fascia stands at CKZ − 0.70, so a lamp at CKZ − 0.55 is *inside the counter*,
    // on the far side of the one panel it exists to light. Every face in this renderer is
    // single-sided and lit by dot(n, dir), so the fascia's −z face — the whole 14 m of it the
    // queue stands looking at — was getting a dot product of exactly −1 and no light at all.
    // In front of the panel it washes the fascia, the floor the queue stands on and the
    // underside of the counter lip, which is what a lit check-in bank actually looks like.
    for (const lx of [-12.0, -6.4, -0.8])
      B.light(lx, 1.95, CKZ - 1.15, [1.00, 0.86, 0.64], .50, 3.2);
    thing('值机柜台', CKX, 1.80, CKZ - 1.60, '在值机柜台办登机手续。',
      'You check in at the desk.',
      '值机 check-in + 柜台 counter. 靠窗 window seat, 靠走廊 aisle, 托运 to check a bag.',
      { focus: [CKX, 4.40], reach: 3.2 });
    // the queue rails in front of the first two positions, which is where the queue always is
    for (const qx of [-12.0, -9.2]) {
      queueLine(qx - 1.35, CKZ - 2.1, qx - 1.35, CKZ - 6.0, 4);
      queueLine(qx + 1.35, CKZ - 2.1, qx + 1.35, CKZ - 6.0, 4);
    }
    // 行李托运 the oversize belt at the east end of the bank, which is where a bag that will
    // not fit on a scale goes, and a thing you can watch swallow somebody's suitcase.
    const OX = -.60;
    box(OX, .50, CKZ - .40, 1.90, 1.00, 2.20, col.slab,
      { tag: '行李托运', gloss: .24, ...M_METAL, matScale: .70 });
    box(OX, 1.02, CKZ - .40, 1.70, .10, 2.00, col.charcoal,
      { tag: '行李托运', hard: true, gloss: .28 });
    for (let i = 0; i < 9; i++)
      box(OX, 1.08, CKZ - 1.32 + i * .23, 1.58, .02, .10, col.steelD,
        { tag: '行李托运', hard: true, gloss: .30 });
    box(OX, 1.90, CKZ + .70, 2.10, 1.80, .60, col.wallD,
      { tag: '行李托运', hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    box(OX, 1.20, CKZ + .42, 1.60, .90, .10, col.black,
      { tag: '行李托运', hard: true, mode: 1, alpha: .85 });
    for (const g of glyphs(OX, 2.52, CKZ + .38, Math.PI, '行李托运',
      { size: .17, gap: .05, color: col.white, mode: 1, tag: '行李托运' })) litten(g, .8);
    // The belt runs. Two cases on it, half a cycle apart, walking up the slats and swallowed by
    // the hood at the far end.
    //
    // This is the only moving thing on this side of security and it is the reason the fitting
    // exists: 行李托运 means the bag goes away, and a conveyor that never moves is a table with
    // rollers on it.
    //
    // The case is 0.56 deep and not the 0.74 it was, and that is load-bearing: the hood is only
    // 0.60 deep, so at 0.74 there is no point in the cycle at which the bag is entirely inside it
    // and the moment it vanishes is always on screen. At 0.56 it can be centred in the hood, fully
    // occluded, and collapsed there where nobody can see it happen. It also sits at y 1.26 rather
    // than 1.34, so its underside is on the slats at 1.09 instead of floating 9 cm over them.
    for (const ph of [0, .5])
      beltBags.push({ p: box(OX, 1.26, CKZ - .80, .52, .34, .56, C('#6d4a3c'),
        { tag: '行李托运', gloss: .28 }), ph });
    beltBags[1].p.color = C('#37506a');
    for (const b of beltBags) b.p.m0 = b.p.m;
    solid(OX - 1.1, OX + 1.1, CKZ - 1.6, RZ);
    thing('行李托运', OX, 1.60, CKZ - 1.70, '这个箱子太重了，得托运。',
      'This case is too heavy — it will have to go in the hold.',
      '托运 to check baggage + 超重 overweight. 手提行李 is what you carry on.',
      { focus: [OX, CKZ - 2.60], reach: 2.0 });

    // ================================================================ 自助值机 the kiosks
    // A row of self-service machines in the middle of the floor. These are how most people
    // check in now, and there is still somebody standing beside them — not to demonstrate them
    // any more, but for the passengers whose booking will not scan.
    const KZ = 3.10;
    box(-9.4, .06, KZ, 6.60, .12, 1.40, col.slab, { hard: true, gloss: .24 });
    for (let i = 0; i < 4; i++) {
      const kx = -11.8 + i * 1.60;
      box(kx, .70, KZ, 1.10, 1.30, .70, col.white, { tag: '自助值机', gloss: .26 });
      box(kx, 1.44, KZ - .10, 1.06, .26, .60, col.white,
        { tag: '自助值机', hard: true, gloss: .26 });
      box(kx, 1.16, KZ - .30, .86, .62, .08, col.charcoal,
        { tag: '自助值机', hard: true, rx: -.34, gloss: .34 });
      litten(box(kx, 1.16, KZ - .34, .78, .55, .02, C('#3f6f92'),
        { tag: '自助值机', hard: true, mode: 1, rx: -.34, glow: .18 }), .5);
      // Something on the screen. Four flat blue rectangles is what an unplugged kiosk looks like,
      // and these are supposed to be the machines most people check in on.
      //
      // The screen is raked back by .34 rad, so everything laid on it has to carry the same rake
      // and be offset along the raked normal rather than straight out in −z: the panel's own face
      // runs (0, −sin .34, −cos .34) from its centre, which is where the sin/cos below come from.
      // Laid on flat in z, the header sank through the top of the screen and the button floated
      // clear of the bottom of it.
      //
      // Deliberately not text. The panel is 0.78 × 0.55, so a legible line would be about six
      // characters at .07, and six characters is not a user interface — it is a caption. Bars are
      // what a UI looks like from two metres away, which is the only distance this is ever seen
      // from, and they cost four props instead of forty.
      // Standing off the glow panel by 14 mm along that same raked normal, not by 1 mm in z. The
      // panel's visible face is already at (1.157, KZ − .349) once the rake is accounted for, and
      // a bar placed a millimetre in front of it in z alone is coplanar with it in practice —
      // which is a z-fight, and a z-fight on a screen flickers.
      const KR = .34, kdy = Math.sin(KR), kdz = Math.cos(KR);
      for (const [oy, hh, w, c, gl] of [[.205, .075, .70, C('#0d2436'), .06],
                                        [.055, .050, .62, C('#9fd0e6'), .24],
                                        [-.045, .050, .62, C('#9fd0e6'), .24],
                                        [-.145, .050, .44, C('#9fd0e6'), .24],
                                        [-.240, .070, .26, col.lime, .30]])
        litten(box(kx, 1.152 + oy * kdz, KZ - .363 - oy * kdy, w, hh, .012, c,
          { tag: '自助值机', hard: true, mode: 1, rx: -KR, glow: gl }), .5);
      // Glyph text on the screen — small labels on the bar UI to sell it as working
      for (const [oy, txt] of [[.205, '值机'], [.055, '登机牌'], [-.045, '打印']]) {
        const gy = 1.152 + oy * kdz - .003 * kdy, gz = KZ - .363 - oy * kdy + .003 * kdz;
        for (const g of glyphs(kx, gy, gz, 0, txt,
          { size: .04, gap: .006, color: col.white, mode: 1, tag: '自助值机' })) {
          const cx = g.m[12], cy = g.m[13], cz = g.m[14];
          g.m = M.mul(M.trans(cx, cy, cz),
            M.mul(M.rotX(-(Math.PI - KR)),
              M.mul(M.trans(-cx, -cy, -cz), g.m)));
        }
      }
      box(kx, .80, KZ - .36, .40, .10, .06, col.steelD,
        { tag: '自助值机', hard: true, gloss: G.metal });
      for (const g of glyphs(kx, 1.72, KZ - .12, Math.PI, '自助值机',
        { size: .12, gap: .03, color: col.blueSign, mode: 1, tag: '自助值机' })) litten(g, .5);
      solid(kx - .60, kx + .60, KZ - .40, KZ + .40);
    }
    shade(-9.4, KZ, 7.4, 2.4, .22);
    thing('自助值机', -9.4, 1.90, KZ - .95, '自助值机也能办登机牌。',
      'The machines will print a boarding card too.',
      '自助 self-service. 打印 to print, 登机牌 boarding card.',
      { focus: [-9.4, KZ - 1.40], reach: 2.0 });

    // ================================================================ 航班信息 the board
    // Two panels on the -x wall, green on black, and the largest thing to read in the game.
    // Its status column is live: every row is worked out from the clock, so a flight boards,
    // closes and goes while you are standing in front of it.
    const FX = -RX + .20, FZ = -.05;
    // Screen and lettering both on the +x face, which is the one the hall is on. Hung on the far
    // side at yaw -π/2 the whole board faced into the wall it was bolted to.
    box(FX + .10, 3.60, FZ, .28, 3.20, 7.40, col.charcoal,
      { tag: '航班信息', hard: true, gloss: .28 });
    litten(box(FX + .26, 3.60, FZ, .04, 2.90, 7.05, col.board,
      { tag: '航班信息', hard: true, mode: 1, glow: .05 }), .3);
    // One flight per row, six columns across. The board faces +x, so you read it looking -x,
    // and looking -x puts +z on your left: the columns run from the largest z down.
    //
    // Six and not five, because the fifth used to be a single 时间 column and a single time cannot
    // say what a delay is. `setBoard` wrote the delayed time into it, so the schedule the flight
    // was sold against simply vanished — the 15:40 to 海口 read 16:45 all day and the only trace of
    // an hour lost was the word 延误 two columns over. Every real board in the world carries both:
    // 计划 is what the timetable says and never moves, 预计 is what is actually going to happen and
    // is blank while those are the same thing. The delay is then not a label, it is the gap between
    // two numbers you can read off the wall — which is also the only version of this that teaches
    // the words, because 计划 and 预计 mean nothing next to one time.
    const FCZ = [2.95, 1.62, .42, -.78, -1.94, -3.02];
    FLIGHTS.forEach((f, i) => {
      const y = 4.06 - i * .28;
      glyphs(FX + .30, y, FCZ[0], Math.PI / 2, f.no,
        { size: .15, gap: -.055, color: col.boardOn, mode: 1, tag: '航班信息' });
      glyphs(FX + .30, y, FCZ[1], Math.PI / 2, f.to,
        { size: .16, gap: .04, color: col.white, mode: 1, tag: '航班信息' });
      const sch = slots(FX + .30, y, FCZ[2], Math.PI / 2, 5,
        { size: .15, gap: -.048, color: col.boardOn, mode: 1, tag: '航班信息' });
      const est = slots(FX + .30, y, FCZ[3], Math.PI / 2, 5,
        { size: .15, gap: -.048, color: col.rose, mode: 1, tag: '航班信息' });
      const gt = slots(FX + .30, y, FCZ[4], Math.PI / 2, 3,
        { size: .15, gap: -.040, color: C('#c8d4de'), mode: 1, tag: '航班信息' });
      const st = slots(FX + .30, y, FCZ[5], Math.PI / 2, 3,
        { size: .14, gap: .03, color: col.boardOn, mode: 1, tag: '航班信息' });
      sch(hhmm(f.dep)); gt(f.gate);
      boardRow.push({ sch, est, gt, st });
    });
    ['航班', '目的地', '计划', '预计', '登机口', '状态'].forEach((h, i) =>
      glyphs(FX + .30, 4.42, FCZ[i], Math.PI / 2, h,
        { size: .12, gap: .03, color: C('#8fa2b4'), mode: 1, tag: '航班信息' }));
    glyphs(FX + .30, 4.80, FZ, Math.PI / 2, '航班信息',
      { size: .21, gap: .08, color: C('#c8d4de'), mode: 1, tag: '航班信息' });
    boardHead = slots(FX + .30, 4.80, 3.02, Math.PI / 2, 5,
      { size: .17, gap: -.05, color: col.lime, mode: 1, tag: '航班信息' });
    // What a seven-metre screen of green-on-black actually does to the wall it is bolted to.
    // Weak and tinted to the board's own 正常 green rather than to white — this is spill off a
    // display, not a lamp, and the only correct amount of it is "you can tell the board is on
    // with your back to it". Deliberately in front of the glass at FX + 1.10 and not inside the
    // case: a light behind an emissive panel lights the wall it is hung on and nothing else.
    //
    // It must not touch the board's own face. Mode 1 is emissive and takes no light at all, so
    // the rows stay exactly the colours `setBoard` writes into them and the glyphs stay legible
    // whatever this lamp does.
    B.light(FX + 1.10, 3.60, FZ, [0.52, 0.92, 0.86], .38, 3.0);
    thing('航班信息', FX + .80, 2.30, FZ, '航班信息在大屏幕上。',
      'The flight information is on the big screen.',
      '航班 flight + 信息 information. 正常 on time, 延误 delayed, 登机中 boarding, 起飞 gone.',
      { focus: [FX + 3.40, -1.30], reach: 3.4 });

    // ================================================================ 便利店 the shop
    // On the -x wall past the end of the board, facing down the hall. Water, a pot of noodles
    // and a hot-water urn to fill it from, which is still the whole landside catering offer.
    //
    // It was on the diagonal at first and every part of it was wrong: `ry` spins a box about
    // its own centre, so setting it on each piece of a fitting laid out on a square grid turns
    // each piece where it stands instead of turning the fitting. Square to the wall it is.
    const SHX = -RX, SHZ = -6.30;
    box(SHX + .25, 1.50, SHZ, .50, 3.00, 4.20, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    box(SHX + 1.10, .52, SHZ, 1.00, 1.04, 3.60, col.desk,
      { tag: '便利店', gloss: .26, ...M_STONE });
    box(SHX + 1.10, 1.08, SHZ, 1.12, .09, 3.72, col.deskD,
      { tag: '便利店', hard: true, gloss: .24, ...M_STONE });
    // the chiller at one end, and the shelf of instant noodles behind the counter
    box(SHX + .70, 1.05, SHZ - 1.40, .80, 2.10, 1.30, col.white,
      { tag: '便利店', hard: true, gloss: .28 });
    litten(box(SHX + 1.12, 1.20, SHZ - 1.40, .06, 1.60, 1.06, C('#9fd8e4'),
      { tag: '便利店', hard: true, mode: 1, alpha: .5, glow: .22 }), .5);
    // The noodle shelf. Three tub shapes instead of one, and a lid band on each in a contrasting
    // colour: eighteen identical cylinders in three paints read as a paint chart, and what tells
    // you a 桶面 is a 桶面 is that it is a squat tub with a paper lid taped over the top of it.
    for (let i = 0; i < 3; i++) {
      box(SHX + .58, 1.30 + i * .48, SHZ + .80, .46, .06, 2.20, col.slab,
        { tag: '便利店', hard: true, gloss: .22 });
      const y0 = 1.33 + i * .48;                      // the top of this shelf's plate
      for (let k = 0; k < 6; k++) {
        const c = [C('#c04a34'), C('#d9a63a'), C('#3f7a54')][(i + k) % 3];
        const kind = (i * 2 + k) % 3;
        const h = kind === 0 ? .26 : kind === 1 ? .21 : .30;
        const r = kind === 0 ? .13 : kind === 1 ? .145 : .115;
        const cz2 = SHZ - .10 + k * .34;
        // `taper` narrows upward and a 桶面 is wider at the top, so the squat one comes over:
        // left the way it comes it reads as a bucket with the mouth pinched shut, which is the
        // same trap the diner's woks carry a comment about.
        if (kind === 1)
          taper(SHX + .58, y0 + h / 2, cz2, r * 2, h, r * 2, c,
            { tag: '便利店', rx: Math.PI, gloss: .22 });
        else
          cyl(SHX + .58, y0 + h / 2, cz2, r, h, c, { tag: '便利店', gloss: .22 });
        // the paper lid taped over the top, which is the one detail that says instant noodles
        cyl(SHX + .58, y0 + h, cz2, r * .96, .02, col.cream,
          { tag: '便利店', hard: true, gloss: .14 });
      }
    }
    // the till, and the hot-water urn that every one of these has on the end of the counter
    box(SHX + 1.10, 1.28, SHZ + 1.30, .34, .30, .40, col.charcoal,
      { tag: '便利店', hard: true, gloss: .32 });
    cyl(SHX + 1.10, 1.42, SHZ - 1.40, .18, .58, col.chrome, { tag: '便利店', gloss: G.metal });
    // Stock on the counter itself, by the till, where the impulse buys go: two boxes, a rack of
    // lighters and a tray of eggs. The counter was 3.6 m of bare stone with a till at one end.
    //
    // All of it in the +z half. The counter has a full-height chiller standing on it at SHZ − 1.40
    // and the till at SHZ + 1.30, and the 店员 has to be somewhere as well — she gets the metre
    // between the chiller and the stock, so the stock stays clear of it.
    box(SHX + 1.10, 1.17, SHZ + .95, .26, .10, .20, C('#3f7a54'),
      { tag: '便利店', hard: true, gloss: .20 });
    box(SHX + 1.10, 1.17, SHZ + .70, .22, .10, .16, C('#c04a34'),
      { tag: '便利店', hard: true, gloss: .20 });
    for (let i = 0; i < 4; i++)
      box(SHX + 1.02 + (i % 2) * .16, 1.19, SHZ + .50 - ((i / 2) | 0) * .11, .05, .14, .04,
        [col.amber, C('#3d7361'), C('#a8372a'), col.blueSign][i], { tag: '便利店', gloss: .30 });
    box(SHX + 1.10, 1.15, SHZ + .15, .30, .06, .30, C('#c8b795'),
      { tag: '便利店', hard: true, gloss: .14 });
    for (let i = 0; i < 6; i++)
      ball(SHX + 1.02 + (i % 2) * .16, 1.20, SHZ + .04 + ((i / 2) | 0) * .11, .026, .032, .026,
        col.cream, { tag: '便利店', gloss: .18 });
    // 店员, in that gap. Inside the counter's own footprint and drawn from below its top, which is
    // the only way to put somebody behind a 1.0 m counter with a 0.8 m chiller on one side of it
    // and a 0.46 m shelf run behind. Facing +x into the hall, because the whole fitting is square
    // to the −x wall and the customer stands out at SHX + 2.70.
    box(SHX + .58, 3.20, SHZ, .16, .60, 3.80, col.jade,
      { tag: '便利店', hard: true, gloss: .24 });
    for (const g of glyphs(SHX + .67, 3.20, SHZ, Math.PI / 2, '便利店',
      { size: .26, gap: .08, color: col.white, mode: 1, tag: '便利店' })) litten(g, .9);
    solid(SHX, SHX + 1.75, SHZ - 2.1, SHZ + 2.1);
    // A convenience shop is the brightest three square metres in any terminal, and this one is
    // in the darkest corner of the hall — the −x wall, past the end of the board, with no
    // glazing anywhere near it. The chiller and the jade fascia are what it looks like; this is
    // what puts the noodle shelf and the woman behind the counter into the picture at all.
    B.light(SHX + 1.60, 2.20, SHZ, [1.00, 0.90, 0.72], .46, 2.8);
    thing('便利店', SHX + 1.70, 1.80, SHZ, '来一瓶水，一桶面。',
      'A bottle of water and a pot of noodles.',
      '便利 convenient + 店 shop. 瓶 is the measure for bottles, 桶 for a tub of noodles.',
      { focus: [SHX + 2.70, SHZ], reach: 2.2 });

    // ================================================================ 洗手间 landside
    // On the -x wall past the board. Every other room in this game has one and this one, being
    // the room you spend the longest in, did not.
    function toilets(tx, tz, yaw, tag) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      // Tile, at a 30 cm module, and the one place in the terminal that gets it: a washroom
      // frontage is the only wall in a building like this that is tiled rather than plastered,
      // and the change of module from the 2.6 m plaster either side of it is what says so.
      box(tx, 1.55, tz, 4.60, 3.10, .50, col.wallD,
        { hard: true, ry: yaw, gloss: G.paint, ...M_TILE });
      for (const ox of [-1.10, 1.10])
        box(tx + c * ox, 1.10, tz - s * ox, 1.30, 2.20, .60, col.charcoal,
          { tag, hard: true, ry: yaw, gloss: .26 });
      for (const ox of [-1.10, 1.10])
        box(tx + c * ox - s * .30, 1.10, tz - s * ox - c * .30, 1.16, 2.06, .06, C('#1a1d21'),
          { tag, hard: true, ry: yaw, mode: 1, alpha: .9 });
      box(tx - s * .30, 3.30, tz - c * .30, 4.20, .50, .12, col.blueSign,
        { tag, hard: true, ry: yaw, gloss: .26 });
      for (const g of glyphs(tx - s * .38, 3.30, tz - c * .38, yaw + Math.PI, '洗手间',
        { size: .22, gap: .06, color: col.white, mode: 1, tag })) litten(g, .9);
      for (const ox of [-1.10, 1.10])
        for (const g of glyphs(tx + c * ox - s * .34, 2.42, tz - s * ox - c * .34, yaw + Math.PI,
          ox < 0 ? '男' : '女',
          { size: .24, gap: 0, color: ox < 0 ? C('#7fb8e0') : C('#e08fa8'), mode: 1, tag }))
          litten(g, .8);
      // Axis-aligned from the half extents, not from signed offsets: at yaw −π/2 the signed
      // form hands back x0 > x1 and the collider silently stops colliding.
      const hx = Math.abs(c) * 2.30 + Math.abs(s) * .40;
      const hz = Math.abs(s) * 2.30 + Math.abs(c) * .40;
      solid(tx - hx, tx + hx, tz - hz, tz + hz);
      return thing(tag, tx - s * .6, 1.70, tz - c * .6, '我去一趟洗手间。',
        "I'll just nip to the loo.",
        '洗手 to wash hands + 间 room. 男 men, 女 women.',
        { focus: [tx - s * 1.5, tz - c * 1.5], reach: 2.0 });
    }
    // −π/2, not +π/2: the front of the fitting is its −z face, so on the −x wall it has to be
    // turned the other way round or the doors open into the brickwork.
    toilets(-RX + .30, 5.20, -Math.PI / 2, '洗手间');

    // ================================================================ 安检 the security channel
    // A partition right across the hall, with one lane you can walk through and a bag scanner
    // beside it. Landside is at -x, airside at +x, and the only way over is the arch — which
    // actually opens, once somebody has looked at your 登机牌.
    const SW = .60;                     // how thick the partition is
    const XSL = [-1.90, -.30];          // the slot the X-ray belt runs through
    // The partition is a real wall with exactly three holes in it: the walk lane, the belt slot
    // and the exit door. Anything not one of those has to be built, or the gate lounge is
    // visible from the check-in queue through a gap with a conveyor lying in it — which is
    // precisely what the first version of this looked like.
    const solidZ = [[-RZ, XSL[0]], [XSL[1], LANE.z0], [LANE.z1, EXITZ - .95],
                    [EXITZ + .95, RZ]];
    for (const [z0, z1] of solidZ) {
      box(SEC, H / 2, (z0 + z1) / 2, SW, H, z1 - z0, col.wall,
        { hard: true, mode: 4, ...M_WALL });
      box(SEC, .17, (z0 + z1) / 2, SW + .06, .34, z1 - z0, col.band,
        { hard: true, gloss: .28, ...M_METAL });
      solid(SEC - SW / 2, SEC + SW / 2, z0, z1);
    }
    // the heads over the three openings, so it reads as one wall rather than four piers
    box(SEC, (2.60 + H) / 2, (LANE.z0 + LANE.z1) / 2, SW, H - 2.60, LANE.z1 - LANE.z0,
      col.wall, { hard: true, mode: 4, ...M_WALL });
    box(SEC, (2.40 + H) / 2, EXITZ, SW, H - 2.40, 1.90, col.wall,
      { hard: true, mode: 4, ...M_WALL });
    box(SEC, (1.94 + H) / 2, (XSL[0] + XSL[1]) / 2, SW, H - 1.94, XSL[1] - XSL[0],
      col.wall, { hard: true, mode: 4, ...M_WALL });
    box(SEC, .15, (XSL[0] + XSL[1]) / 2, SW, .30, XSL[1] - XSL[0], col.wall,
      { hard: true, mode: 4, ...M_WALL });
    // the belt slot is a hole a bag fits through and a body does not
    solid(SEC - SW / 2, SEC + SW / 2, XSL[0], XSL[1]);
    blocker(SEC - SW, SEC + SW, -RZ, RZ, H);

    // the floor of the whole channel, landside apron and airside re-pack alike
    flat(SEC - .20, .006, -.40, 7.60, 6.40, col.inlay, { mode: 9, gloss: .30, ...M_INLAY });

    // 安检门 the walk-through arch. It stands in the opening rather than beside it: at the
    // lane's outer edge plus a margin the uprights were buried inside the partition and the
    // whole arch vanished, leaving a plain doorway with a lamp floating over it.
    // It also stands clear of the wall on the hall side, so you see an archway to walk through
    // rather than a lamp bolted inside a doorway.
    const AMZ = (LANE.z0 + LANE.z1) / 2, AMH = (LANE.z1 - LANE.z0) / 2 - .15, AMX = SEC - .70;
    for (const s of [-1, 1])
      box(AMX, 1.10, AMZ + s * AMH, .50, 2.20, .28, col.white,
        { tag: '安检', hard: true, gloss: .28 });
    box(AMX, 2.28, AMZ, .50, .26, LANE.z1 - LANE.z0 - .02, col.white,
      { tag: '安检', hard: true, gloss: .28 });
    secLamp.push(litten(box(AMX, 2.14, AMZ, .12, .06, AMH * 2 - .30, col.rose,
      { tag: '安检', hard: true, mode: 1, glow: .30 }), .6));
    for (const s of [-1, 1])
      secLamp.push(litten(box(AMX + s * .26, 1.30, AMZ + AMH, .04, 1.40, .06, col.rose,
        { tag: '安检', hard: true, mode: 1, glow: .28 }), .5));
    // the barrier itself: a pair of glass flaps in the arch, and the collider they carry
    secBar = solid(SEC - .35, SEC + .35, LANE.z0, LANE.z1);
    const flaps = [];
    for (const s of [-1, 1])
      flaps.push(box(SEC + .34 * s, .62, AMZ + s * (AMH / 2), .06, 1.20, AMH,
        col.glass, { tag: '安检', hard: true, mode: 1, alpha: .34, gloss: G.glass }));
    for (const p of flaps) p.m0 = p.m;
    secArrow = { flaps };
    // the officer's stand at the mouth of it, where the 登机牌 is looked at
    box(SEC - 1.20, .52, LANE.z1 + .10, .70, 1.04, 1.10, col.desk,
      { tag: '安检', gloss: .26, ...M_STONE });
    box(SEC - 1.20, 1.08, LANE.z1 + .10, .78, .08, 1.20, col.deskD,
      { tag: '安检', hard: true, gloss: .24, ...M_STONE });
    box(SEC - 1.20, 1.36, LANE.z1 + .10, .40, .48, .06, col.charcoal,
      { tag: '安检', hard: true, ry: Math.PI / 2, gloss: .34 });
    litten(box(SEC - 1.24, 1.36, LANE.z1 + .10, .02, .40, .34, C('#8fbcd4'),
      { tag: '安检', hard: true, mode: 1, glow: .22 }), .4);
    // And the officer at it. The stand exists to have a boarding card held up at it — the barrier
    // in the arch behind him only opens once the game has looked at yours — and an empty stand in
    // front of an arch that opens by itself turns the one piece of working machinery in this half
    // of the room into a ghost turnstile.
    //
    // He faces −x, which is where the queue arrives from: the rail runs along z 3.35 and feeds
    // toward +x. The cap is the uniform; at three metres a 安检员 is a peaked cap and a blue
    // shirt and nothing else about him registers at all.
    solid(SEC - 1.6, SEC - .8, LANE.z1 - .5, LANE.z1 + .7);
    // He gets his own collider, and it is north of the lane rather than across its mouth: the
    // walk from the queue rail at z 3.35 to the arch at z 1.30 has to stay open or security
    // becomes impassable, which is a worse bug than being able to walk through a man.
    solid(SEC - .88, SEC - .52, LANE.z1 + .07, LANE.z1 + .43);
    // The one cool lamp landside. Everything else in this half of the hall is tungsten, and the
    // channel is supposed to read as the harder-lit place it is — the lane you are looked at in.
    //
    // At 2.05, which is *under* the arch head and not over it. The head is a box centred at 2.28
    // and 0.26 deep, so anything above 2.41 is a lamp sitting on the roof of the arch lighting
    // the ceiling: the lane floor, the officer and the glass flaps are all below it and all face
    // away. Inside the opening it lights the thing the fitting is for.
    //
    // The rose/lime lamps on the arch itself are untouched: those are the state of the barrier,
    // they are emissive, and this must not be able to tint them.
    B.light(AMX, 2.05, AMZ, [0.88, 0.94, 1.00], .50, 3.0);

    // 安检机 the X-ray, on the -z side of the lane, its belt running through the wall
    const XZ = LANE.z0 - 1.60;
    box(SEC, .42, XZ, 5.20, .18, 1.10, col.steelD,
      { tag: '安检', hard: true, gloss: G.metal, ...M_METAL });
    box(SEC, .52, XZ, 5.10, .03, .96, col.black, { tag: '安检', hard: true, gloss: .34 });
    for (let i = 0; i < 18; i++)
      box(SEC - 2.38 + i * .28, .545, XZ, .05, .01, .92, col.steelD,
        { tag: '安检', hard: true, gloss: .30 });
    box(SEC, 1.10, XZ, 1.70, 1.50, 1.50, col.slab,
      { tag: '安检', hard: true, gloss: .26, ...M_METAL, matScale: .80 });
    for (const s of [-1, 1])
      box(SEC + s * .88, 1.00, XZ, .06, .80, 1.10, col.charcoal,
        { tag: '安检', hard: true, mode: 1, alpha: .8 });
    // A bag halfway through the lead curtain, which is the difference between a scanner and a
    // conveyor. The curtains are at SEC ± .88, so a case at SEC − .82 straddles the landside one:
    // its near half is out in the room and its far half has gone.
    box(SEC - .82, .71, XZ, .54, .32, .42, C('#3d4c60'), { tag: '安检', gloss: .30 });
    box(SEC - .82, .71, XZ - .22, .40, .22, .03, C('#252a31'),
      { tag: '安检', hard: true, gloss: .26 });
    // Trays, stacked at the landside end and scattered at the airside one.
    //
    // They were solid charcoal blocks — a tray is a shallow dish and a block is a block, and five
    // blocks in a pile read as a stack of paving slabs. Each one now has a paler floor let into
    // it, which is the only thing that says there is an inside, and the airport's blue-grey rather
    // than charcoal, because trays are the one item in a terminal that is always branded.
    const TRAY = C('#3c4653');
    for (let i = 0; i < 5; i++) {
      box(SEC - 2.20, .58 + i * .055, XZ, .52, .05, .84, TRAY,
        { tag: '安检', hard: true, gloss: .28 });
      box(SEC - 2.20, .603 + i * .055, XZ, .42, .012, .72, C('#586576'),
        { tag: '安检', hard: true, gloss: .30 });
    }
    for (const g of glyphs(SEC - 2.20, .834, XZ - .30, Math.PI, '请放入物品',
      { size: .075, gap: .012, color: C('#c8d2dc'), mode: 1, tag: '安检' })) litten(g, .3);
    box(SEC + 1.90, .58, XZ, .52, .05, .84, TRAY, { tag: '安检', hard: true, gloss: .28 });
    box(SEC + 1.90, .603, XZ, .42, .012, .72, C('#586576'),
      { tag: '安检', hard: true, gloss: .30 });
    box(SEC + 1.90, .66, XZ, .40, .18, .60, C('#4a4f58'), { tag: '安检', gloss: .28 });
    solid(SEC - 2.7, SEC + 2.7, XZ - .60, XZ + .60);

    // The operator, and what she is looking at. A scanner with nobody reading the picture is a
    // washing machine, and the picture is worth building for its own sake: it is the one screen
    // in the terminal whose content the player can actually check against the room.
    //
    // Both screens face −x rather than facing the operator, which is deliberate and is the same
    // decision every other screen in this hall has already taken: the check-in monitors face the
    // passengers too. A monitor angled correctly at the person using it shows the room its back,
    // and a black rectangle teaches nobody anything. She sits behind them looking through.
    //
    // Landside of the partition, because there is nowhere else. The wall at x 2.10–2.70 is solid
    // from z −8.5 up to the belt slot at −1.90, so anything put at the airside end of this machine
    // is in the other half of the building and cannot be seen from the queue at all.
    // 1.15 clear of the belt, and the queue rail below has moved 0.80 further out to make the
    // room: the console is 0.80 deep, the belt ends at z −1.60 and the rail stood at −2.35, which
    // left a 0.75 m slot with a stanchion base plate already in it.
    const OPZ = XZ - 1.15;
    box(SEC - 1.85, .50, OPZ, 1.50, 1.00, .80, col.slab, { tag: '安检', hard: true, gloss: .24 });
    box(SEC - 1.85, 1.02, OPZ, 1.58, .07, .88, col.steelD,
      { tag: '安检', hard: true, gloss: G.metal });
    for (const [oy, hh] of [[1.32, .40], [1.76, .40]]) {
      box(SEC - 2.42, oy, OPZ, .06, hh, .60, col.charcoal,
        { tag: '安检', hard: true, gloss: .34 });
      litten(box(SEC - 2.46, oy, OPZ, .02, hh - .05, .55, C('#0d1116'),
        { tag: '安检', hard: true, mode: 1, glow: .04 }), .3);
    }
    // the scan itself: the orange of organics and the blue-green of metal, which is what an X-ray
    // picture is made of, laid over the dark of the lower screen
    for (const [oz, w, hh, c] of [[-.14, .30, .17, C('#d98b34')], [.10, .17, .12, C('#3f9e8c')],
                                  [.20, .09, .07, C('#2f5f8f')]])
      litten(box(SEC - 2.485, 1.30, OPZ + oz, .02, hh, w, c,
        { tag: '安检', hard: true, mode: 1, glow: .22 }), .4);
    for (const g of glyphs(SEC - 2.48, 1.90, OPZ, -Math.PI / 2, '安检机',
      { size: .075, gap: .02, color: col.lime, mode: 1, tag: '安检' })) litten(g, .5);
    cyl(SEC - 1.30, .30, OPZ, .17, .06, col.charcoal, { gloss: .26 });
    cyl(SEC - 1.30, .48, OPZ, .04, .34, col.steelD, { gloss: G.metal });
    cyl(SEC - 1.30, .66, OPZ, .19, .07, col.seatD, { gloss: .30 });
    solid(SEC - 2.62, SEC - 1.08, OPZ - .46, OPZ + .46);
    // The wash off two monitors onto the operator sitting behind them. Small, cool and short —
    // the screens face −x and she is at +x of them, which is the one arrangement where the
    // person is lit by the back of the display and not the front of it, and it is why she was
    // a dark shape in a dark corner.
    B.light(SEC - 2.10, 1.95, OPZ, [0.78, 0.90, 1.00], .34, 2.4);

    // the gantry sign across the mouth of the channel, lettered both sides because you can
    // reach it from the hall at -x and from airside at +x
    box(SEC - 1.90, 3.30, .20, .14, .50, 4.20, col.jade, { tag: '安检', hard: true, gloss: .24 });
    for (const [gx, gyaw] of [[SEC - 1.98, -Math.PI / 2], [SEC - 1.82, Math.PI / 2]])
      for (const g of glyphs(gx, 3.30, .20, gyaw, '安全检查',
        { size: .22, gap: .06, color: col.white, mode: 1, tag: '安检' })) litten(g, .9);
    for (const s of [-1, 1])
      capsule(SEC - 1.90, (3.55 + H) / 2, .20 + s * 1.80, .016, H - 3.55, .016, col.steelD,
        { gloss: G.metal });
    // the notice nobody reads, on the wall beside the lane
    for (const g of glyphs(SEC - .34, 2.10, LANE.z1 + 1.10, -Math.PI / 2, '液体请取出',
      { size: .13, gap: .04, color: col.redD, mode: 1 })) litten(g, .3);
    queueLine(SEC - 2.60, LANE.z1 + 1.30, SEC - 6.20, LANE.z1 + 1.30, 4);
    queueLine(SEC - 2.60, LANE.z0 - 3.70, SEC - 6.20, LANE.z0 - 3.70, 4);
    thing('安检', SEC - 1.20, 1.80, LANE.z0 - .10, '过了安检就是登机口。',
      'Past security are the gates.',
      '安全 safety + 检查 inspection. You need a 登机牌 to go through, and the gate shuts ' +
      'fifteen minutes before the flight.',
      { focus: [SEC - 2.10, AMZ], reach: 2.4 });

    // 出口 — the way back out of airside, further along the same partition. One way, which is
    // why it is a door in a wall and not a second lane.
    box(SEC, 1.20, EXITZ, SW + .10, 2.40, 1.90, col.wallD, { hard: true, gloss: G.paint });
    box(SEC - .32, 1.10, EXITZ, .10, 2.10, 1.60, col.charcoal,
      { tag: '出口', hard: true, mode: 1, alpha: .55 });
    box(SEC + .32, 1.10, EXITZ, .10, 2.10, 1.60, col.charcoal,
      { tag: '出口', hard: true, mode: 1, alpha: .55 });
    for (const [gx, gyaw] of [[SEC - .40, -Math.PI / 2], [SEC + .40, Math.PI / 2]]) {
      box(gx, 2.62, EXITZ, .06, .40, 1.60, col.jade, { tag: '出口', hard: true, gloss: .24 });
      for (const g of glyphs(gx + (gyaw > 0 ? .05 : -.05), 2.62, EXITZ, gyaw, '出口',
        { size: .20, gap: .06, color: col.white, mode: 1, tag: '出口' })) litten(g, .9);
    }
    solid(SEC - SW / 2, SEC + SW / 2, EXITZ - .95, EXITZ + .95);
    // Reached from airside, because that is the only side it is any use from: it is the way
    // back out of the gate lounge, not a second way in.
    thing('出口', SEC + .40, 1.80, EXITZ, '从这儿出去就回到大厅了。',
      'This way puts you back out in the hall.',
      '出 to go out + 口 mouth, opening. 入口 is the way in.',
      { focus: [SEC + 1.70, EXITZ], reach: 2.4 });

    // ================================================================ airside
    // Everything past the partition. The carpet starts here, which is how you know.
    // Carpet at .90 m and not the .30 a broadloom pattern would repeat at: the fabric texture is
    // a weave, and a weave the size of its own thread is noise at any distance this floor is
    // ever seen from. What it has to do here is stop 18 m of one flat blue reading as paper.
    flat(12.60, .005, -1.60, 18.20, 12.60, col.carpet,
      { mode: 7, gloss: G.fabric, ...M_CARPET });
    flat(12.60, .007, -1.60, 17.60, 12.00, col.carpetD,
      { mode: 7, gloss: G.fabric, ...M_CARPET });

    // ---- 吸烟室 the smoking room, which every Chinese airport has and which is always full
    const SMX = 6.20;
    box(SMX, 1.45, RZ - 1.60, 3.60, 2.90, .12, col.glass,
      { tag: '吸烟室', hard: true, mode: 1, alpha: .28, gloss: G.glass });
    for (const s of [-1, 1])
      box(SMX + s * 1.80, 1.45, RZ - .80, .12, 2.90, 1.60, col.glass,
        { tag: '吸烟室', hard: true, mode: 1, alpha: .28, gloss: G.glass });
    box(SMX, 2.94, RZ - .80, 3.72, .10, 1.70, col.slab, { tag: '吸烟室', hard: true, gloss: .22 });
    box(SMX - 1.10, .45, RZ - .70, 1.20, .90, .50, col.steelD,
      { tag: '吸烟室', hard: true, gloss: .28 });
    cyl(SMX + 1.00, .50, RZ - 1.00, .22, 1.00, col.steelD, { tag: '吸烟室', gloss: G.metal });
    // The 吸烟室's own line says it is a fog, and it was a lit empty vitrine.
    //
    // Haze, as two large very low-alpha volumes rather than a cloud of small ones: what makes
    // smoke read is that the far side of the room is milkier than the near side, and one big soft
    // block behind the glass does that in one prop where twenty puffs would do it in twenty. It is
    // denser at the top because smoke is, and the extract grille above is the reason it is not
    // denser still.
    // Both haze volumes stop .07 short of the glazing rather than sharing a face with it. Two
    // transparent props at the same depth sort against each other by centre, and whichever wins
    // that coin toss the other one blends wrongly — smoke drawn in front of the window it is
    // supposed to be behind.
    box(SMX, 1.95, RZ - .75, 3.30, 1.70, 1.44, C('#cfd3ce'),
      { tag: '吸烟室', hard: true, mode: 1, alpha: .11 });
    box(SMX, 2.58, RZ - .75, 3.30, .60, 1.44, C('#d8dbd4'),
      { tag: '吸烟室', hard: true, mode: 1, alpha: .13 });
    box(SMX, 2.86, RZ - .60, 1.10, .05, .70, col.charcoal,
      { tag: '吸烟室', hard: true, gloss: .26 });
    for (let i = 0; i < 5; i++)
      box(SMX, 2.83, RZ - .84 + i * .12, 1.02, .02, .05, col.steelD,
        { tag: '吸烟室', hard: true, gloss: .30 });
    // The ash bin's tray and two stubs standing in it, and somebody using it.
    //
    // He is in a dark coat on purpose. The glazing is 28% alpha and the metro service window
    // records what that does to a figure standing behind it — a pale bust goes to a smudge — so
    // the one person in this room is the darkest silhouette in it, and being slightly indistinct
    // through smoked glass in a smoke-filled room is the correct amount of indistinct.
    cyl(SMX + 1.00, 1.02, RZ - 1.00, .20, .05, C('#4a4a46'), { tag: '吸烟室', gloss: .24 });
    for (const [ox, oz] of [[.06, -.05], [-.07, .04]])
      capsule(SMX + 1.00 + ox, 1.07, RZ - 1.00 + oz, .012, .07, .012, col.cream,
        { tag: '吸烟室', gloss: .10, rx: 1.1 });
    // The smoker's cigarette and ember belong to the animated wrist attachment. A world-space
    // ember here would be left behind whenever the current character pose moved his hand.
    box(SMX, 3.20, RZ - 1.68, 2.20, .40, .10, col.charcoal,
      { tag: '吸烟室', hard: true, gloss: .26 });
    for (const g of glyphs(SMX, 3.20, RZ - 1.75, Math.PI, '吸烟室',
      { size: .18, gap: .05, color: col.amber, mode: 1, tag: '吸烟室' })) litten(g, .8);
    solid(SMX - 1.9, SMX + 1.9, RZ - 1.70, RZ);
    // Inside the box, so what it lights is the haze. Two very low-alpha volumes are only visible
    // at all if something is behind them putting light through — an unlit fog is a grey pane,
    // and the whole claim of this fitting is that you can see the room is full of smoke.
    B.light(SMX, 2.40, RZ - 1.00, [0.94, 0.92, 0.84], .36, 2.4);
    thing('吸烟室', SMX, 1.80, RZ - 2.00, '吸烟室里烟雾缭绕。',
      'The smoking room is a fog.',
      '吸烟 to smoke + 室 room. 禁止吸烟 no smoking, which is everywhere else.',
      { focus: [SMX, RZ - 2.80], reach: 2.0 });

    // ---- 免税店 duty free. A counter, a wall of bottles behind it and a gold sign, which is
    // the international language of paying too much at an airport.
    const DFX = 11.20, DFZ = RZ - .60;
    box(DFX, 1.55, DFZ + .30, 5.60, 3.10, .40, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    box(DFX, .52, DFZ - .50, 5.20, 1.04, .90, col.desk,
      { tag: '免税店', gloss: .26, ...M_STONE });
    box(DFX, 1.08, DFZ - .50, 5.30, .09, 1.02, col.deskD,
      { tag: '免税店', hard: true, gloss: .24, ...M_STONE });
    for (let r = 0; r < 4; r++) {
      box(DFX, .70 + r * .62, DFZ + .04, 5.00, .07, .40, col.oak,
        { tag: '免税店', hard: true, mode: 6, gloss: .26 });
      litten(box(DFX, .96 + r * .62, DFZ + .18, 4.90, .04, .10, C('#f4e9c8'),
        { tag: '免税店', hard: true, mode: 1, glow: .30 }), .5);
      // Three shapes on the shelf, not one in four colours.
      //
      // Fifty-six identical squat cylinders read as a rack of test tubes; what a duty-free wall
      // actually is, is a jumble — a ribboned carton of 白酒 next to a tall thin scent bottle next
      // to a spirits bottle — and the DUTY list this shop sells from says so in as many words:
      // "boxed and ribboned", "a box of chocolates". The pattern is deterministic off i and r so
      // the wall is the same wall every time the room is built.
      for (let i = 0; i < 14; i++) {
        const bx = DFX - 2.34 + i * .36;
        const c = [C('#8a5a2a'), C('#2f4a60'), C('#b0a48c'), C('#7a2a30')][(i + r) % 4];
        const kind = (i * 3 + r * 5) % 7;
        if (kind === 0 || kind === 4) {
          box(bx, .895 + r * .62, DFZ + .02, .26, .32, .26, c, { tag: '免税店', gloss: .30 });
          box(bx, .895 + r * .62, DFZ - .13, .27, .09, .02, col.goldL,
            { tag: '免税店', hard: true, mode: 1 });
        } else if (kind === 2) {
          cyl(bx, .905 + r * .62, DFZ + .02, .058, .34, c, { tag: '免税店', gloss: .40 });
          cyl(bx, 1.12 + r * .62, DFZ + .02, .022, .10, c, { tag: '免税店', gloss: .40 });
        } else {
          cyl(bx, .84 + r * .62, DFZ + .02, .075, .22, c, { tag: '免税店', gloss: .40 });
          cyl(bx, .99 + r * .62, DFZ + .02, .028, .10, c, { tag: '免税店', gloss: .40 });
        }
      }
      // The price on the shelf edge, taken from the DUTY list rather than invented, so the ticket
      // and the till agree. A duty-free wall with no prices on it is the one shop in the world
      // that would be doing you a favour, and the joke this fitting exists to tell is the price.
      const d = DUTY[r];
      for (const g of glyphs(DFX - 1.90, .70 + r * .62, DFZ - .18, Math.PI,
        d.hz + ' ' + d.price, { size: .085, gap: .018, color: C('#2b2f36'), mode: 1,
          tag: '免税店' })) litten(g, .3);
    }
    // the glass case on the counter, with the small expensive things in it
    box(DFX - 1.60, 1.36, DFZ - .50, 1.60, .48, .70, col.glass,
      { tag: '免税店', hard: true, mode: 1, alpha: .24, gloss: G.glass });
    for (let i = 0; i < 5; i++)
      box(DFX - 2.20 + i * .30, 1.24, DFZ - .50, .14, .22, .14,
        i % 2 ? C('#c8a24a') : C('#d8dce0'), { tag: '免税店', gloss: .44 });
    box(DFX + 1.90, 1.28, DFZ - .50, .40, .30, .34, col.charcoal,
      { tag: '免税店', hard: true, gloss: .32 });
    // The clerk, standing in the gap between the counter back and the bottle wall — which is
    // 0.09 m, so she is placed at z DFZ − .35 instead: inside the counter's own footprint, drawn
    // from below its top, and therefore reading as standing behind it. Any further back and her
    // shoulders are inside the shelving.
    box(DFX, 3.35, DFZ - .18, 5.40, .70, .12, C('#2b2f36'),
      { tag: '免税店', hard: true, gloss: .30 });
    for (const g of glyphs(DFX, 3.35, DFZ - .26, Math.PI, '免税店',
      { size: .30, gap: .12, color: col.goldL, mode: 1, tag: '免税店' })) litten(g, .9);
    solid(DFX - 2.8, DFX + 2.8, DFZ - 1.05, RZ);
    // Gold, and the warmest lamp airside. The four lit shelf strips behind the counter are what
    // this fitting looks like and they are 4 cm tall — they were never going to put anything on
    // the fifty-six bottles standing in front of them. This is the light a duty-free wall throws
    // back into the lounge, and it is tinted to the shop's own gold rather than to white because
    // that colour is the entire argument the fitting is making.
    B.light(DFX, 2.45, DFZ - .30, [1.00, 0.84, 0.55], .58, 3.2);
    thing('免税店', DFX, 1.90, DFZ - 1.20, '免税店的东西也不便宜。',
      'Duty free is not cheap either.',
      '免 to exempt + 税 tax + 店 shop. 打折 a discount, 贵 dear.',
      { focus: [DFX, DFZ - 2.10], reach: 2.6 });

    // ---- 咖啡 the café. A counter, a machine, a board with three prices on it and a queue of
    // people who have discovered what a coffee costs on this side of security.
    const CFX = 16.60, CFZ = RZ - .70;
    box(CFX, 1.55, CFZ + .40, 4.20, 3.10, .40, col.wallD,
      { hard: true, gloss: G.paint, ...M_WALL, matScale: 2.20 });
    box(CFX, .52, CFZ - .40, 3.80, 1.04, .90, col.oak,
      { tag: '咖啡', mode: 6, gloss: .28, ...M_WOOD });
    box(CFX, 1.08, CFZ - .40, 3.90, .09, 1.02, C('#3a2f26'),
      { tag: '咖啡', hard: true, gloss: .30 });
    box(CFX - 1.10, 1.42, CFZ - .30, .90, .60, .60, col.chrome,
      { tag: '咖啡', hard: true, gloss: G.metal });
    box(CFX - 1.10, 1.18, CFZ - .56, .70, .14, .10, col.charcoal,
      { tag: '咖啡', hard: true, gloss: .34 });
    for (let i = 0; i < 8; i++)
      cyl(CFX + .10 + (i % 4) * .17, 1.20, CFZ - .30 - ((i / 4) | 0) * .20, .055, .16,
        col.white, { tag: '咖啡', gloss: .22 });
    box(CFX + 1.50, 1.28, CFZ - .40, .40, .30, .34, col.charcoal,
      { tag: '咖啡', hard: true, gloss: .32 });
    box(CFX, 2.70, CFZ + .18, 3.20, 1.10, .10, C('#2b2f36'),
      { tag: '咖啡', hard: true, gloss: .28 });
    // Five rows, not three. Three drinks and nothing to eat is a coffee stand, and this is the
    // only catering airside — the reason to walk over here at eight in the morning is a sandwich.
    // The row pitch tightened from .32 to .22 to fit them: at .32 the fourth row fell off the
    // bottom edge of the board and the fifth hung in the air below it.
    ['咖啡 38', '拿铁 42', '茶 25', '三明治 32', '蛋糕 28'].forEach((r, i) => {
      for (const g of glyphs(CFX, 3.10 - i * .22, CFZ + .12, Math.PI, r,
        { size: .15, gap: .04, color: C('#e8dcc0'), mode: 1, tag: '咖啡' })) litten(g, .6);
    });
    // 咖啡师, at x CFX + .90. Not at the machine, where she belongs: the eight takeaway cups
    // stand on the counter from x 16.70 to 17.27 at exactly chest height, and anywhere left of
    // here she has a paper cup embedded in her ribs. The gap between the cups and the till is the
    // only clear metre of this counter.
    solid(CFX - 2.1, CFX + 2.1, CFZ - .95, RZ);
    B.light(CFX, 2.40, CFZ - .40, [1.00, 0.86, 0.62], .50, 3.0);
    // One customer waiting to be served, seen from behind by every camera that looks at this
    // counter, which is the kindest angle a person built out of capsules ever gets.
    solid(CFX - .78, CFX - .32, CFZ - 1.62, CFZ - 1.18);
    // Two little round tables in front of it, and something on both of them.
    //
    // A wiped table is a table nobody has sat at, and a café whose tables have never been sat at
    // is a café that has never sold anything — which undercuts the one joke this fitting exists
    // to tell, that the coffee costs thirty-eight kuai and people pay it anyway. So: a cup on a
    // saucer and a phone face-down on the west table, and on the east one a finished cup, a paper
    // bag with the top folded over, and somebody drinking from it.
    // One table on the duty-free side. The former east table occupied the only sensible approach
    // to the airside washrooms and made the café read as furniture parked in a toilet doorway.
    for (const tx of [CFX - 2.90]) {
      cyl(tx, .36, CFZ - 2.20, .38, .72, col.oak, { mode: 6, gloss: .26 });
      cyl(tx, .73, CFZ - 2.20, .46, .06, C('#3a2f26'), { hard: true, gloss: .30 });
      cyl(tx, .04, CFZ - 2.20, .34, .06, col.steelD, { gloss: .28 });
      for (const s of [-1, 1]) {
        cyl(tx + s * .74, .23, CFZ - 2.20, .17, .46, col.steelD, { gloss: G.metal });
        box(tx + s * .74, .48, CFZ - 2.20, .38, .05, .38, col.seat, { hard: true, gloss: .30 });
      }
      // the cup and its saucer, on the far side of the table from the seat that is taken
      cyl(tx - .12, .775, CFZ - 2.32, .085, .015, col.white, { hard: true, gloss: .28 });
      taper(tx - .12, .825, CFZ - 2.32, .12, .10, .12, col.white, { rx: Math.PI, gloss: .26 });
      cyl(tx - .12, .872, CFZ - 2.32, .052, .012, C('#4a2f1e'), { mode: 1, gloss: .50 });
      solid(tx - .5, tx + .5, CFZ - 2.7, CFZ - 1.7);
      shade(tx, CFZ - 2.20, 1.6, 1.6, .22);
    }
    // the phone on the west table
    box(CFX - 3.08, .765, CFZ - 2.05, .075, .012, .145, col.charcoal,
      { hard: true, gloss: .40, ry: .5 });
    thing('咖啡', CFX, 1.80, CFZ - 1.10, '一杯咖啡三十八，机场价。',
      'Thirty-eight kuai for a coffee. Airport prices.',
      '咖啡 coffee + 一杯 a cup of. 贵死了 is what you say about the price.',
      { focus: [CFX, CFZ - 2.00], reach: 2.2 });

    // AirFit owns the airside washrooms and charging island. The old copies here overlapped the
    // café wall, duplicated the sockets, and closed the gap between the two facilities.

    // ---- 登机口 the gate. A podium with a card reader on it, the door out to the airbridge,
    // and the screen over the door that says whether this is your flight.
    const GTZ = -RZ + .60;
    // The door leaf, in the bay the glazing skipped. It gets a frame, a threshold and its own
    // lettering: an unframed panel in a run of glazing reads as one more bay of glass, and the
    // one bay in forty that you are actually meant to walk through has to look like a door.
    box(BRX, 2.20, -RZ + .12, MUL - .12, 4.40, .16, col.wallD,
      { tag: '登机口', hard: true, gloss: G.paint });
    box(BRX, 2.20, -RZ + .04, MUL - .40, 3.90, .06, col.glass,
      { tag: '登机口', hard: true, mode: 1, alpha: .30, gloss: G.glass });
    // A dark recess on the hall face. Without it the opaque door slab read as one more blank wall
    // bay, so the queue appeared to end at a desk with nowhere for passengers to go. The warm
    // light is limited to jambs and a lintel: a full luminous rectangle reads as another closed
    // panel, whereas a dark centre reads as the passage beyond it.
    box(BRX, 1.92, -RZ + .225, 1.62, 3.34, .035, col.charcoal,
      { tag: '登机口', hard: true, mode: 1, glow: .03 });
    box(BRX, 2.00, -RZ + .245, 1.38, 3.02, .018, C('#151b20'),
      { tag: '登机口', hard: true, mode: 1, glow: .015 });
    for (const s of [-1, 1])
      litten(box(BRX + s * .64, 2.00, -RZ + .265, .10, 3.02, .025, C('#e7d8b8'),
        { tag: '登机口', hard: true, mode: 1, glow: .14 }), .38);
    litten(box(BRX, 3.46, -RZ + .265, 1.38, .10, .025, C('#e7d8b8'),
      { tag: '登机口', hard: true, mode: 1, glow: .14 }), .38);
    box(BRX, 2.86, -RZ + .265, 1.30, .34, .025, col.blueSign,
      { tag: '登机口', hard: true, gloss: .24 });
    for (const g of glyphs(BRX, 2.88, -RZ + .285, 0, '登机通道',
      { size: .13, gap: .035, color: col.white, mode: 1, glow: .16, tag: '登机口' })) litten(g, .5);
    for (const s of [-1, 1])
      box(BRX + s * (MUL / 2 - .02), 2.20, -RZ + .04, .16, 4.50, .26, col.steelD,
        { tag: '登机口', hard: true, gloss: G.metal });
    box(BRX, 4.45, -RZ + .04, MUL + .24, .16, .26, col.steelD,
      { tag: '登机口', hard: true, gloss: G.metal });
    box(BRX, .04, -RZ + .40, MUL + .24, .08, .90, col.band,
      { tag: '登机口', hard: true, gloss: .30 });
    box(BRX + .48, 1.06, -RZ + .02, .06, .34, .06, col.chrome,
      { tag: '登机口', hard: true, gloss: G.metal });
    for (const g of glyphs(BRX, 3.10, -RZ + .015, 0, '登机口',
      { size: .17, gap: .05, color: col.blueSign, mode: 1, tag: '登机口' })) litten(g, .5);
    box(BRX, 4.90, -RZ + .20, 3.40, 1.30, .16, col.charcoal,
      { tag: '登机口', hard: true, gloss: .28 });
    litten(box(BRX, 4.90, -RZ + .30, 3.20, 1.10, .04, col.board,
      { tag: '登机口', hard: true, mode: 1, glow: .06 }), .3);
    gateSet.no = slots(BRX - 1.06, 5.24, -RZ + .33, 0, 6,
      { size: .16, gap: -.05, color: col.boardOn, mode: 1, tag: '登机口' });
    gateSet.to = slots(BRX + .90, 5.24, -RZ + .33, 0, 3,
      { size: .18, gap: .04, color: col.white, mode: 1, tag: '登机口' });
    gateSet.st = slots(BRX, 4.86, -RZ + .33, 0, 5,
      { size: .17, gap: .04, color: col.lime, mode: 1, tag: '登机口' });
    gateSet.at = slots(BRX, 4.52, -RZ + .33, 0, 9,
      { size: .12, gap: -.02, color: C('#8fa2b4'), mode: 1, tag: '登机口' });
    // The gate number, on a blade off the wall so it reads down the length of the lounge. It is
    // a slot rather than paint: with a boarding card in your pocket this is your gate, whatever
    // number the board gave it, because one modelled gate serving seven flights is a kinder
    // fiction than six of them sending you to a door that does not exist.
    box(BRX - 1.90, 4.90, -RZ + .40, .12, .90, 1.30, col.blueSign,
      { tag: '登机口', hard: true, gloss: .24 });
    gateSet.blade = [];
    for (const s of [-1, 1])
      gateSet.blade.push(slots(BRX - 1.90 + s * .08, 4.90, -RZ + .40, s * Math.PI / 2, 3,
        { size: .34, gap: .04, color: col.white, mode: 1, tag: '登机口' }));
    // the podium
    box(BRX - .10, .55, GTZ + 1.30, 1.60, 1.10, .80, col.desk,
      { tag: '登机口', gloss: .26, ...M_STONE });
    box(BRX - .10, 1.12, GTZ + 1.30, 1.70, .08, .90, col.deskD,
      { tag: '登机口', hard: true, gloss: .24, ...M_STONE });
    box(BRX - .50, 1.42, GTZ + 1.30, .46, .52, .06, col.charcoal,
      { tag: '登机口', hard: true, gloss: .34 });
    litten(box(BRX - .50, 1.42, GTZ + 1.24, .40, .44, .02, C('#8fbcd4'),
      { tag: '登机口', hard: true, mode: 1, glow: .22 }), .4);
    box(BRX + .42, 1.22, GTZ + 1.24, .34, .12, .26, col.white,
      { tag: '登机口', hard: true, gloss: .26 });
    litten(box(BRX + .42, 1.30, GTZ + 1.24, .16, .05, .16, col.lime,
      { tag: '登机口', hard: true, mode: 1, glow: .30 }), .5);
    // The gate agent, behind the podium, facing the lounge. She has the metre between the podium's
    // back face at z −7.00 and the door threshold at −8.10 to stand in, which is precisely the
    // amount of room a gate agent has. Without her the card reader on the podium is a lit green
    // lamp that opens a door by itself, and the whole point of this fitting is that somebody looks
    // at your 登机牌 before it does.
    // 小赵 is the fully rigged gate agent here. Keeping the old primitive worker underneath her
    // produced two coincident bodies that flickered and lost limbs as the camera moved.
    solid(BRX - .95, BRX + .85, GTZ + .85, GTZ + 1.75);
    // The two ends of the gate. The podium lamp is the fascia light every boarding desk has,
    // and it is what puts the queue standing at the rail into the picture. The second is the
    // 3.4 × 1.3 m screen over the airbridge door, hung at 4.90 — the brightest surface in the
    // lounge and, until now, one that lit nothing whatever. Cool, because that is the colour of
    // the screen it comes off, and it lands on the door frame, the mullions either side of the
    // bay and the heads of whoever is boarding.
    //
    // Neither reaches the slots on the screen face: those are mode 1 and take no light, so the
    // flight number, the destination and the status stay exactly as `setGate` writes them.
    B.light(BRX - .10, 2.30, GTZ + 1.30, [1.00, 0.88, 0.68], .44, 3.0);
    B.light(BRX, 4.30, -RZ + .90, [0.66, 0.90, 0.94], .42, 3.2);
    queueLine(BRX - 1.30, GTZ + 2.20, BRX - 5.00, GTZ + 2.20, 4);
    // Three people in the line the rail was built for. They stand between the rail at z −5.70 and
    // the podium, facing along it, and they have their luggage with them because a boarding queue
    // is the one queue in the world where everybody is holding something.
    //
    // z −6.00 and not −6.10: the seat run at (13.20, −6.60) carries a collider out to −6.24, and
    // at −6.10 the back of the third one in the line was inside a chair.
    [[16.30, C('#8d5c48'), 0], [15.35, C('#41566b'), 1], [14.40, C('#5a6070'), 0]]
      .forEach(([qx, c, bag], i) => {
        solid(qx - .23, qx + .23, GTZ + 1.68, GTZ + 2.12);
        // Beside her, not in front: the stanchion base plates are 0.36 across and sit every 0.925
        // along the rail, so a case set toward the rope lands inside one of them.
        if (bag) suitcase(qx - .48, GTZ + 1.90, .4, C('#37506a'), .70);
      });
    thing('登机口', BRX, 2.10, GTZ + 2.00, '登机口开始登机了。',
      'The gate has started boarding.',
      '登 to mount, to board + 机 aircraft + 口 mouth, gate. 登机牌 is the boarding card.',
      { focus: [BRX, GTZ + 2.90], reach: 2.6 });

    // the airbridge, from the door out to the side of the fuselage and no further
    const JZ = (PZ + 2.9 + (-RZ - .5)) / 2, JL = (-RZ - .5) - (PZ + 2.9);
    box(BRX, 3.20, JZ, 3.10, 2.80, JL, col.slab,
      { hard: true, gloss: G.paint, ...M_METAL, matScale: 1.10 });
    box(BRX, 4.70, JZ, 3.30, .30, JL + .2, col.steelD,
      { hard: true, gloss: G.metal, ...M_METAL, matScale: .90 });
    // Six windows, each with the light of the tunnel behind it. Dark glazing on a bridge that the
    // gate opposite is boarding through said the bridge was shut, and a lit one says people are
    // walking down it right now — which is the single cheapest way to make the gate look live.
    //
    // The lit panel sits at x 16.64, one centimetre outside the bridge skin at 16.65 and inside
    // the span of the glass at 16.59–16.65. Opaque, so it draws in the opaque pass and the 30%
    // glazing blends over it afterwards; put it inside the skin instead and the bridge, being a
    // solid box, simply eats it. The subway service window in `metro.js` is built in this order
    // for the same reason.
    for (let i = 0; i < 6; i++) {
      const wz = JZ - JL / 2 + 1.4 + i * 2.6;
      litten(box(BRX - 1.64, 3.40, wz, .02, .70, 1.16, C('#f2e9d4'),
        { hard: true, mode: 1, glow: .20 }), .9);
      box(BRX - 1.58, 3.40, wz, .06, .80, 1.30, col.glass,
        { hard: true, mode: 1, alpha: .3, gloss: G.glass });
    }
    for (const s of [-1, 1])
      cyl(BRX + s * 1.10, 1.00, JZ + JL / 2 - 2.0, .22, 2.00, col.steelD, { gloss: G.metal });

    // ---- the lounge itself: seats facing the aeroplane, planters, bins and a wall screen
    // Three rows, stopping short of the gate: a fourth run at the east end put upholstery
    // across the only way up to the podium.
    for (const [sz, ry] of [[-3.40, 0], [-4.70, Math.PI], [-6.60, 0]])
      for (const sx of [5.60, 9.40, 13.20]) seatRun(sx, sz, ry, 5);
    thing('座椅', 9.40, .95, -2.50, '在登机口等着登机。', 'Waiting at the gate to board.',
      '座椅 seat. 候机 is to wait for a flight, 排队 is to queue.',
      { focus: [9.40, -2.30], reach: 2.2 });
    // The two troughs, at 1.45 × 4.20 rather than 1.00 × 3.40. A terminal's greenery is a statement
    // — it is there to be seen down the length of a hall — and at a metre wide these read as
    // window boxes that had been left on the floor.
    //
    // The depth stops at 4.20 for a reason: `planter` lays a collider the full size of the trough,
    // and the mouth of the security lane comes out at x 3.0, z 1.30. At 5.20 deep the west trough's
    // collider reached z 1.20 and the only way from security into the gate lounge was a 10 cm gap.
    planter(4.20, -1.40, 1.45, 4.20);
    planter(20.40, -1.40, 1.45, 4.20);
    palm(20.60, -6.40, 1.0);
    palm(4.00, -6.60, .92);
    // Bins line up with the seat runs, not with the gaps between them: put one in an aisle
    // mouth and the aisle stops being an aisle — 1.2 m less a bin is not a way through. Split
    // pairs airside, single bins landside, which is also the split a real terminal has.
    binSplit(6.50, -2.30); binSplit(19.40, -4.00);
    trolley(21.00, 1.20, .2); trolley(21.00, 2.20, .1);
    for (const [sx, sz, sc] of [[10.10, -3.90, C('#37506a')], [14.00, -5.10, C('#6d4a3c')],
                                [6.20, -6.10, C('#4a4f58')]]) suitcase(sx, sz, .6, sc, .72);
    // Four people in the forty-five chairs, and a coat over the back of a fifth.
    //
    // Forty-five seats with nobody in them is the loudest empty set in the game — it is the thing
    // the room is *for*, and the wide shots of the lounge are mostly upholstery. Four is enough:
    // scattered, not filling a row, because a row of five identical seated props is worse than an
    // empty row. Each seat pan is 0.45 off the floor and `passenger` is built to that number.
    //
    // The seat pitch is 0.62 and a run of five is centred on its own x, so seat k of the run at
    // (sx, sz) is at sx − 1.55 + .31 + k · .62. These are on real seats, not between them.
    for (const [sx, sz, ry, k, c] of [[9.40, -3.40, 0, 1, C('#7a5347')],
                                      [9.40, -3.40, 0, 2, C('#3f5169')],
                                      [13.20, -4.70, Math.PI, 3, C('#5c6472')],
                                      [5.60, -6.60, 0, 0, C('#6b5a72')]]) {
      const px = sx + Math.cos(ry) * (-1.55 + .31 + k * .62);
    }
    // somebody's coat left over a seat back at the west run, which is the other half of "occupied"
    box(6.22, .78, -6.85, .50, .40, .10, C('#4a4038'), { tag: '座椅', mode: 7, gloss: .06 });
    // the airside repeat of the departure board, on the +x wall
    box(RX - .20, 3.40, -3.60, .24, 2.30, 5.20, col.charcoal, { hard: true, gloss: .28 });
    litten(box(RX - .34, 3.40, -3.60, .04, 2.05, 4.90, col.board,
      { hard: true, mode: 1, glow: .05 }), .3);
    // The airside repeat, and it had no time column at all: a gate-lounge board that tells you a
    // flight is boarding but not when it leaves. One column added, showing the time the aircraft
    // will actually go — the schedule is landside business, done with by the time you are through
    // security, and what matters on this side is the number you are working to. Red when that is
    // not the time on the ticket.
    // Column order, and it is the opposite way round from the landside board on purpose.
    //
    // This one hangs on the +x wall and is read looking +x, which puts +z on the viewer's right;
    // the big board is on the -x wall and read looking -x, where screen-right is -z. So the same
    // list of columns has to be laid out along opposite z directions to come out in the same order
    // on screen. It was not: this board had 航班 nearest z 0 and 状态 furthest, which is the order
    // the big board uses, and read from left to right it therefore announced the status of a flight
    // before saying which flight it was.
    const ACZ = [-5.45, -4.30, -3.35, -2.40, -1.45];
    FLIGHTS.forEach((f, i) => {
      const y = 4.14 - i * .28;
      glyphs(RX - .38, y, ACZ[0], -Math.PI / 2, f.no,
        { size: .13, gap: -.048, color: col.boardOn, mode: 1 });
      glyphs(RX - .38, y, ACZ[1], -Math.PI / 2, f.to,
        { size: .14, gap: .03, color: col.white, mode: 1 });
      const at2 = slots(RX - .38, y, ACZ[2], -Math.PI / 2, 5,
        { size: .13, gap: -.042, color: col.boardOn, mode: 1 });
      glyphs(RX - .38, y, ACZ[3], -Math.PI / 2, f.gate,
        { size: .13, gap: -.04, color: C('#c8d4de'), mode: 1 });
      const st = slots(RX - .38, y, ACZ[4], -Math.PI / 2, 3,
        { size: .13, gap: .02, color: col.boardOn, mode: 1 });
      boardRow[i].st2 = st;
      boardRow[i].at2 = at2;
    });
    // A header on this one too. Without it the airside board was five unlabelled columns, which is
    // the difference between a display and a pattern.
    ['航班', '目的地', '时间', '登机口', '状态'].forEach((h, i) =>
      glyphs(RX - .38, 4.42, ACZ[i], -Math.PI / 2, h,
        { size: .10, gap: .02, color: C('#8fa2b4'), mode: 1 }));
    // The airside board's own spill, the same weak green as the landside one. Same reasoning,
    // and the same guarantee: it is in front of the glass, and the rows it lights up to are
    // emissive and unaffected by it.
    B.light(RX - 1.10, 3.40, -3.60, [0.52, 0.92, 0.86], .38, 3.0);

    // ================================================================ the landside hall
    // Grey seating, not the airside blue. See the note on `seatRun`.
    const LSEAT = C('#59616b');
    for (const [sz, ry] of [[-3.60, 0], [-4.90, Math.PI], [-6.60, 0]])
      for (const sx of [-16.60, -12.10, -7.60, -3.10]) seatRun(sx, sz, ry, 5, LSEAT);
    // Three of the sixty landside seats taken, and one of them with a case at her feet, because
    // the people in this half of the hall are the ones who have not checked their bags yet.
    for (const [sx, sz, ry, k, c] of [[-12.10, -3.60, 0, 2, C('#6d5a4a')],
                                      [-7.60, -4.90, Math.PI, 1, C('#3f5169')],
                                      [-7.60, -4.90, Math.PI, 2, C('#5c6472')]])
    suitcase(-11.10, -3.10, .5, C('#4a4f58'), .68);
    thing('座椅', -7.60, .95, -2.60, '在座椅上等着办手续。',
      'Sitting out the wait before check-in.',
      '座椅 seat. 候机 is to wait for a flight, 排队 is to queue.',
      { focus: [-7.60, -2.40], reach: 2.2 });
    for (let i = 0; i < 6; i++) trolley(-20.60, -1.20 + i * .34, 0);
    trolley(-16.20, -.60, .3, 2); trolley(-5.20, -1.40, -.24, 1);
    trolley(-1.90, 3.60, .30);
    thing('行李车', -20.60, 1.20, -2.10, '行李车都在那边。', 'The trolleys are all over there.',
      '行李 luggage + 车 cart. 推 is to push one.',
      { focus: [-19.30, -1.90], reach: 2.4 });
    for (const [ox, oz] of [[-15.70, -2.30], [-11.20, -2.30], [-6.70, -2.30], [-2.20, -2.30],
                            [-18.90, -3.60], [-1.20, -5.20]]) bin(ox, oz);
    planter(-15.00, -1.40, 1.00, 3.20);
    planter(-6.20, -1.40, 1.00, 3.20);
    // Keep the arrival corner clear. A palm here used to grow straight through the self-check-in
    // crowns and hide the lower half of the departures board behind its fronds.
    palm(-2.40, -6.80, .95);
    palm(-11.00, -7.20, .9);
    for (const [sx, sz, sc] of [[-13.20, -4.20, C('#6d4a3c')], [-17.90, -5.40, C('#37506a')],
                                [-4.10, -6.00, C('#4a4f58')]]) suitcase(sx, sz, .2, sc, .74);

    // 机场 the terminal's own name, over the check-in bank
    box(CKX, 5.30, RZ - .12, 9.00, .90, .12, col.blueSign, { hard: true, gloss: .24 });
    for (const g of glyphs(CKX, 5.30, RZ - .19, Math.PI, '首都国际机场',
      { size: .42, gap: .16, color: col.white, mode: 1 })) litten(g, .9);
    thing('机场', CKX, 4.40, RZ - 1.20, '机场很大，人很多。',
      'The airport is huge and full of people.',
      '机 machine + 场 field. 国际 international, 国内 domestic, 航站楼 the terminal.',
      { focus: [CKX, RZ - 4.0], reach: 3.6 });

    // The signs you navigate by, hung down the middle of the hall, now bilingual.
    //
    // The one at −11.50 is the 国际/国内 split, which every departures hall in China signs and
    // this one did not: it is the first decision a passenger makes and the hall had nothing to
    // say about it. Both rows point +x at the same bank of desks, which is the truth in a
    // terminal with one bank — a small airport signs the split as guidance, not as two buildings.
    // Over the subway-arrival approach, where it is read head-on. At z -.20 this blade sat on the
    // only straight sightline to the departures board and hid its title and headers edge-on.
    gantry(-17.00, 4.80, 4.40, [['值机 →', 'Check-in'], ['洗手间 ←', 'Toilets']]);
    gantry(-11.50, -.20, 3.60, [['国内出发 →', 'Domestic Departures'],
                                ['国际出发 →', 'International Departures']]);
    gantry(-8.00, -.20, 4.40, [['安检 →', 'Security Check']]);
    gantry(-1.00, -.20, 3.80, [['安检 →', 'Security'], ['登机口 →', 'Gates']]);
    gantry(6.80, -.20, 4.60, [['登机口 B01—B15 →', 'Gates B01—B15']]);
    gantry(14.20, -.20, 4.20, [['B12 →', 'Gate B12'],
                               ['免税店 ← · 咖啡 →', '← Duty Free · Cafe →']]);
    for (const g of glyphs(SEC - .34, 2.60, -6.20, -Math.PI / 2, '禁止吸烟',
      { size: .14, gap: .04, color: col.redD, mode: 1 })) litten(g, .3);

    // ================================================================ the lighting
    for (const cz of [-6.0, -3.4, -.6, 2.6, 5.4])
      for (let i = -3; i <= 3; i++) batten(i * 6.2, cz, 5.6);
    // And what those thirty-five battens actually do, as opposed to what they look like.
    //
    // Two numbers decide this. The ceiling is 7.20 and the shader's falloff is inverse-square
    // with a soft cutoff at 2.4 × radius, so a lamp at batten height is 6.98 m from the floor:
    // at radius 4 that arrives as about four per cent, and at any radius large enough to fix
    // that the same lamp is also washing the far end of a 44 m hall. So the light a batten
    // casts is hung at 4.80 — in the middle of its own throw rather than at the fitting, above
    // every head and every gantry in the room and low enough that the floor is inside it. The
    // emissive tube at H − .22 and the warm pool `batten` paints under it are untouched; those
    // are still what the fitting looks like, and this is the only part of it that does anything.
    //
    // Six, and not one per batten. Only the eight nearest the camera reach the shader — game.js
    // ranks them every frame — so a lamp under all thirty-five would mean the eight nearest are
    // always eight ceiling lamps and the information desk, the check-in fascias, the duty-free
    // wall and the gate would never once get a slot. Six on a long diagonal covers the hall
    // end to end while leaving five or six places free at any camera for the fittings that
    // earned them.
    //
    // Power .34, which is lower than a ceiling lamp wants to be and is set by the daytime shots
    // rather than the night ones. These are on around the clock — `lightsOn` is the indoor
    // switch and the hall never throws it — so whatever they add at ten in the morning is added
    // on top of a curtain wall 36 m long already putting the floor near the top of the exposure.
    // At .40 the middle of the hall went to flat white; the lamps have to be worth having after
    // dark without being what clips the floor before it.
    for (const [lx, lz] of [[-18.00, 1.20], [-12.40, -3.40], [-6.20, 2.60],
                            [0.60, -3.40], [8.60, 1.20], [16.00, -3.40]])
      B.light(lx, 4.80, lz, [1.00, 0.87, 0.68], .34, 4.2);
  }

  build();

  // ---------------------------------------------------------------- A, the zone toolkit
  //
  // The terminal's mirror of the flat's `A` and the street's `S`. Everything a zone needs to build
  // with, the coordinate contract so no zone measures off a neighbour, and the shell's shared
  // state — the schedule, the board, the loudspeaker — so a zone reads `A.statusOf(no)` instead of
  // reaching across files for it.
  //
  // DECLARED HERE, BELOW `build()`, AND `buildZones()` IS CALLED BELOW THIS. That ordering is not
  // stylistic. `const A` is in the temporal dead zone until this statement runs, so dispatching the
  // registry from inside `build()` — which is the obvious-looking place, since that is where the
  // shell's own geometry goes — makes every zone builder throw `Cannot access 'A' before
  // initialization` on its first line. The catch below swallows it, and `.bootcheck.js` reports the
  // game perfectly clean. That is not hypothetical: it is what happened to js/street.js, and nine
  // agents spent a day building into a street that was never calling them. Props pushed from here
  // still land before `B.finish()`, which is the only ordering that actually matters.
  //
  // The functions are wrapped rather than passed by reference so they resolve at call time: some of
  // what a zone may want (`walkToGate`, `gatePoint`) is declared further down this file, and a zone
  // that ticks will be calling them long after this object was made.
  const A = {
    // ---- the builders, straight off the shell's own scene
    box, cyl, ball, cap: capsule, taper, wall, flat, glyphs,
    solid, blocker, glow, thing, light: B.light,
    // `shade` wrapped rather than passed straight through: build.js's pushes its quad and returns
    // nothing, so a zone with a MOVING prop has no handle on its contact shadow. Same fix, and the
    // same reason, as the street's.
    shade: (...a) => { const n = B.shadows.length; shade(...a);
                       return B.shadows.length > n ? B.shadows[B.shadows.length - 1] : null; },
    // Register an emissive prop for the night boost. Asked for by the 便利店 agent, and the ask was
    // right: without it a zone's own signs, soffits and chiller strips stay at daytime brightness
    // after dark while the shell's identical fixtures three metres away come up — which reads as a
    // shop that forgot to turn its lights on rather than as a missing API. `k` is the strength the
    // shell's own `setNight` uses, 0.3 for small lettering up to about 1.0 for a fascia.
    litten: (p, k) => litten(p, k),
    get props() { return B.props; }, get things() { return B.things; },
    C, G, col,
    // ---- the materials, so two zones do not invent two different concretes
    M_FLOOR, M_WALL, M_STONE, M_METAL, M_TILE, M_CARPET, M_ASPH, M_WOOD,
    // ---- the coordinate contract (AIRPORT.md, "the zone + camera contract")
    //   the hall is 44 x 17 x 7.2;  SEC = 2.40 is the spine: landside is x < SEC, airside x > SEC
    //   the curtain wall and WIN belong to the SHELL — the apron and runway build behind it
    RX, RZ, H, SEC, LANE, WIN, OUT, GX0, GX1, MUL, WSILL, WTOP, DX, BRX,
    // The apron and the runway are laid out inside build()'s own scope, so their two datums are
    // restated here rather than exported — same numbers, one place to read them.
    AZ: -RZ - 13.0,
    RUNZ: -RZ - 13.0 - 22.0,
    // ---- the shell's shared state. A zone READS these; only the shell writes them.
    FLIGHTS, NOTICES, DUTY, CALL,
    statusOf: (f, mins) => statusOf(f, mins),
    gateOf: (f, mins) => gateOf(f, mins),
    nextFlight: (mins) => nextFlight(mins),
    checkinOpen: (f, mins) => checkinOpen(f, mins),
    announce: (mins, out) => announce(mins, out),
    setBoard: (...a) => setBoard(...a),
    setGate: (...a) => setGate(...a),
    openSecurity: (...a) => openSecurity(...a),
    securityIsOpen: () => securityIsOpen(),
    gatePoint: (k) => gatePoint(k),
    walkToGate: (n, k) => walkToGate(n, k),
  };

  // Declared here, above the call, for the same reason `A` is: a `const` used by a function that
  // runs before the declaration is a temporal-dead-zone throw, and this file's own catch would
  // have swallowed it into a silent empty terminal. It did, once, on the first run of this code.
  const zoneLog = [];
  buildZones();

  // Every zone that has registered itself, each in its own js/air-<zone>.js.
  //
  // `zonesBuilt` is the answer to the question js/street.js could not answer: did the registry
  // actually run, and did each zone put anything in the room. A zone that registered, was called,
  // threw on its first line and was swallowed by the catch looks — from every other angle,
  // including a clean .bootcheck.js — exactly like a zone nobody has written yet. Recording the
  // prop count either side of each call costs nothing and makes that failure impossible to miss:
  // `Airport.zonesBuilt()` in the console, or in a harness.
  function buildZones() {
    for (const k in AirFit) {
      const f = AirFit[k];
      if (typeof f !== 'function') continue;
      const before = B.props.length, thBefore = B.things.length;
      try {
        f(A);
        zoneLog.push({ zone: k, props: B.props.length - before,
                       things: B.things.length - thBefore, ok: true });
      } catch (e) {
        zoneLog.push({ zone: k, props: 0, things: 0, ok: false, error: String(e && e.message) });
        console.error('AirFit ' + k + ': ' + (e && e.message));
      }
    }
  }

  // ---------------------------------------------------------------- the live board
  // Where a flight is in its own day, and what the board says about it. Everything the hall
  // refuses you is decided here, so the sign in front of you and the answer you get from the
  // desk are the same fact.
  // ---------------------------------------------------------------- 延误 · 取消 today's board
  //
  // Until now exactly one flight was ever late — HU7802, every day, by the same sixty-five minutes,
  // because `late` was a constant in the table above. A departure board that says the same thing
  // every morning is a poster, and the hall's whole claim on the player's attention is that it is
  // telling them something they do not already know.
  //
  // Two things decide today's board. The first is a hash of the day number, so the disruption is
  // the same after a reload, the same on anybody's machine, and knowable in advance by nothing.
  // The second is the weather, which is the honest reason a real board looks like that: fog is what
  // actually stops aeroplanes, snow nearly as much, wind delays rather than stops, and rain on its
  // own hardly counts. `disrupt` comes from weather.js and runs 0 on a clear day to 1 in a
  // blizzard; it moves both how many flights are hit and how hard.
  //
  // At most one cancellation, and only in genuinely bad weather. A 取消 takes the fare back out of
  // the airline's pocket and sends the player to the back of the whole chain, which is a real
  // setback and not something to hand out on a merely cloudy afternoon.
  function hash(n) {
    let h = (n | 0) * 0x9e3779b1;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  let dayRolled = -1;
  function setDay(day, disrupt) {
    if (dayRolled === day) return;
    dayRolled = day;
    // A traveller can leave the terminal late one day and return at a later clock time on the
    // next. In that case announce() never sees the minute hand move backwards, so reset the PA
    // here where the actual day boundary is known. Otherwise yesterday's calls suppress today's.
    saidToday.clear();
    lastAir = lastHall = -1e9;
    wasClock = -1;
    const d = Math.max(0, Math.min(1, disrupt || 0));
    FLIGHTS.forEach((f, i) => {
      f.cancelled = false;
      const late = hash(day * 131 + i * 17) < 0.13 + 0.60 * d;
      // Rounded to five minutes, because a board never says forty-three.
      f.late = late ? Math.round((15 + hash(day * 7 + i * 29) * (30 + 130 * d)) / 5) * 5 : 0;
      // 海航七八零二 is the one flight with a delay announcement baked for it, and that clip says
      // 预计起飞时间十六点四十五分 out loud — which is only true at exactly sixty-five minutes.
      // So when this one is picked it is always picked for that, and the loudspeaker keeps its
      // one apology. Everything else that runs late says so on the board and nowhere else, which
      // is also true to life: most delays are never announced at all.
      if (f.no === 'HU7802' && f.late) f.late = 65;
      // And whether it moves gate. About one flight in six on a normal day, more when the board is
      // already in trouble, because a gate change is nearly always somebody else's delay arriving
      // in the stand yours was supposed to use.
      f.moved = hash(day * 313 + i * 41) < 0.16 + 0.30 * d;
    });
    if (d > 0.52) {
      const i = Math.floor(hash(day * 991 + 3) * FLIGHTS.length) % FLIGHTS.length;
      FLIGHTS[i].cancelled = true;
      FLIGHTS[i].late = 0;
    }
  }

  // ---------------------------------------------------------------- 排队 how long the queue is
  //
  // A desk that takes fourteen minutes at four in the morning and fourteen minutes twenty minutes
  // before a wide-body leaves is not a desk, it is a vending machine. What makes an airport an
  // airport is that everything takes longer exactly when you have least time.
  //
  // Load is how many flights are inside their own check-in window right now — three at once is the
  // morning bank, none at all is the middle of the afternoon — and the queue grows with it. The
  // security channel serves the whole hall, so it feels the same bank an hour later.
  function queueLoad(kind, mins) {
    let n = 0;
    for (const f of FLIGHTS) {
      if (f.cancelled) continue;
      const d = f.dep + f.late - mins;
      if (kind === 'security') { if (d <= OPEN_CK - 25 && d > SHUT_GATE) n++; }
      else if (d <= OPEN_CK && d > SHUT_CK) n++;
    }
    return n;
  }
  function queueMins(kind, mins) {
    const n = queueLoad(kind, mins);
    return kind === 'security' ? Math.min(34, 5 + n * 8) : Math.min(38, 6 + n * 9);
  }

  // Which gate this flight is going from, at this minute. Before the change it is the one printed
  // on the board all morning; after it, the other one. Everything that shows a gate — the board,
  // the screen over the airbridge, the prompt, the countdown chip, the listening check — goes
  // through here, so there is exactly one answer in the building at any moment and it is the one
  // the loudspeaker just gave.
  function gateOf(f, mins) {
    return f.moved && mins >= f.dep + f.late - CHANGE_FROM ? f.gate2 : f.gate;
  }

  // Resolve an emitted event key to the words the terminal should say *at this minute*. Most
  // notices are fixed. The four that name a gate have two baked readings, and a moved flight must
  // use the one naming the same gate as the boards and the boarding-card prompt. `mins` is explicit
  // so a replay or a harness never depends on whichever clock value announce() happened to see last.
  function noticeOf(key, mins) {
    const bits = String(key || '').split(':');
    const kind = bits[0], no = bits[1];
    if (!GATE_NOTICE_KINDS.has(kind)) return NOTICES[key];
    const f = FLIGHTS.find(q => q.no === no);
    if (!f) return NOTICES[key];
    const clock = typeof mins === 'number' ? mins : f.dep + f.late;
    const alt = gateOf(f, clock) === f.gate2;
    return NOTICES[(alt ? 'alt:' : '') + key] || NOTICES[key];
  }

  // The timetable rows are fixed in scheduled order, but delays can reverse their effective
  // departure order. Any screen that says "next" must compare the times the aircraft will really
  // leave, and must not advertise a cancelled service.
  function nextFlight(mins) {
    let next = null, nextAt = Infinity;
    let first = null, firstAt = Infinity;
    for (const f of FLIGHTS) {
      if (f.cancelled) continue;
      const at = f.dep + f.late;
      if (at < firstAt) { first = f; firstAt = at; }
      if (at > mins && at < nextAt) { next = f; nextAt = at; }
    }
    return next || first || FLIGHTS[0];
  }

  function statusOf(f, mins) {
    // A cancelled flight is cancelled all day, whatever the clock says about it.
    if (f.cancelled) return { code:'cancel', zh:'取消', en:'cancelled', col: col.rose };
    const dep = f.dep + f.late;
    const d = dep - mins;                        // minutes until it goes
    if (d <= -20) return { code:'gone', zh:'起飞', en:'departed', col:C('#6a7480') };
    if (d <= 0) return { code:'off', zh:'起飞', en:'taking off', col:C('#8fa2b4') };
    if (d <= SHUT_GATE) return { code:'shut', zh:'关闭', en:'gate closed', col: col.rose };
    if (d <= CALL) return { code:'board', zh:'登机中', en:'boarding', col: col.lime };
    if (f.late) return { code:'late', zh:'延误', en:`delayed ${f.late} min`, col: col.rose };
    return { code:'ok', zh:'正常', en:'on time', col: col.boardOn };
  }
  // Whether the desk will take you, which is a narrower window than the board's.
  const checkinOpen = (f, mins) =>
    !f.cancelled && mins >= f.dep + f.late - OPEN_CK && mins <= f.dep + f.late - SHUT_CK;

  function setBoard(mins, mine) {
    FLIGHTS.forEach((f, i) => {
      const s = statusOf(f, mins), r = boardRow[i];
      const dep = f.dep + f.late;
      // 计划: the timetable, which never changes. It goes grey once it is no longer going to
      // happen, the way a board greys a time it has superseded rather than deleting it — the
      // passenger needs to see the time they were sold as well as the time they are getting.
      // Greyed for a cancellation as well as for a delay: the time it was going to go is still
      // worth showing, and it is no longer a time anything happens at.
      r.sch(hhmm(f.dep), f.late || f.cancelled ? C('#6a7480') : col.boardOn);
      // 预计: blank while the two agree, which is most rows most of the day. A column of numbers
      // repeated from the one beside it reads as a fault in the board.
      r.est(f.late ? hhmm(dep) : '', col.rose);
      r.gt(gateOf(f, mins), mine === f.no ? col.lime : C('#c8d4de'));
      r.st(s.zh, s.col);
      if (r.st2) r.st2(s.zh, s.col);
      // Airside: one time, the one that is actually going to happen.
      if (r.at2) r.at2(hhmm(dep), f.late ? col.rose : col.boardOn);
    });
    if (boardHead) boardHead(hhmm(mins), col.lime);
    // The check-in position lamps: green while any flight that desk is working is checking in,
    // amber otherwise. Desks 3 and 4 each cover several flights, so they stay open whenever any
    // one of their assigned services is inside its check-in window.
    for (const d of deskLamp)
      d.p.color = d.fl.some(k => checkinOpen(FLIGHTS[k], mins)) ? col.lime : col.amber;
  }

  // The screen over the airbridge door. With no ticket it shows the next departure off this
  // gate; with one it shows yours, which is the difference between a prop and a sign.
  function setGate(mins, flight) {
    if (!gateSet.no) return;
    // With no ticket the gate shows whatever is next off it today, so the screen is never blank.
    const f = flight || nextFlight(mins);
    const s = statusOf(f, mins);
    gateSet.no(f.no, flight ? col.lime : col.boardOn);
    gateSet.to(f.to);
    gateSet.st(s.zh, s.col);
    gateSet.at(hhmm(f.dep + f.late) + (f.late ? ' 延误' : ''), s.col);
    for (const set of gateSet.blade) set(gateOf(f, mins), flight ? col.lime : col.white);
  }

  // ---------------------------------------------------------------- 安检 the barrier
  // Cleared by the game when it has looked at your boarding card. The flaps swing, the lamps
  // go green, and the lane shuts itself behind you — but never on somebody standing in it.
  function openSecurity(t) {
    secBar.open = true;
    secOpenT = t + GATE_HOLD;
    return (LANE.z0 + LANE.z1) / 2;
  }
  const securityIsOpen = () => !!(secBar && secBar.open);

  // The oversize belt. A case every seven seconds, 1.90 m from the near end of the slats to the
  // middle of the hood, then hidden for the last 14% of the cycle.
  //
  // Collapsed with M.scale(0,0,0) rather than faded to alpha 0. A prop at zero alpha still writes
  // depth, so a hidden bag parked a centimetre in front of the black mouth under the hood would go
  // on punching a bag-shaped hole in it for the rest of the day.
  //
  // Honest about the one seam: the bag reappears at the near end of the belt rather than being
  // carried there, because the belt only exists between two ends and something has to put a case
  // on it. The reappearance is at CKZ − 1.20, which is behind the queue rail and inside the
  // machine's own housing footprint, and it is the least visible 1.9 m of the fitting.
  const BELT_T = 7.0, BELT_RUN = .86, BELT_D = 1.90;
  function beltTick(t) {
    for (const b of beltBags) {
      const k = (t / BELT_T + b.ph) % 1;
      // cy out of the world as well, so a collapsed bag is culled instead of drawn as nothing
      if (k > BELT_RUN) { b.p.m = M.scale(0, 0, 0); b.p.cy = -99; continue; }
      b.p.m = M.mul(M.trans(0, 0, -.40 + (k / BELT_RUN) * BELT_D), b.p.m0);
      b.p.cx = b.p.m[12]; b.p.cy = b.p.m[13]; b.p.cz = b.p.m[14];
    }
  }

  // ---------------------------------------------------------------- when the terminal speaks
  // The board's own state machine decides this, not a timer. `statusOf` already knows a flight is
  // boarding at CALL minutes out and shut at SHUT_GATE, so an announcement is nothing more than
  // noticing that one of those thresholds has just been crossed.
  //
  // Crossings are tested as an interval and not as a moment, for the reason the platform records:
  // the clock is a pure function of the game's minutes and a frame advances it by a sixtieth of
  // one, so `d === 40` is a frame nobody is guaranteed to be standing on. WINDOW is about sixty
  // frames wide — wide enough that it cannot be stepped over, narrow enough that the words are
  // true to the minute. A clock that jumps across it (a shift at the office, a night's sleep)
  // skips the call, which is correct: it was made while you were somewhere else.
  // Each call has a window it is true in, not a moment it happens at: `from` minutes before
  // departure it becomes due, and at `until` it has stopped being worth saying.
  //
  // That is the second design here and the first one was wrong in a way worth recording. It tested
  // for the threshold being *crossed* inside a one-minute window, which is how the platform's
  // countdown works — and it meant a call that lost a collision was lost for the day. MU219's
  // check-in opened at 16:30, the same minute HU7802's gate closed, the gap rule quite correctly
  // let the more urgent one go first, and the check-in call for a Tokyo flight then never happened
  // at all. A window instead of a moment fixes it without a queue: the call stays due until it is
  // either said or no longer true, so a collision delays it by three minutes rather than deleting
  // it. It also behaves properly when the clock jumps — a shift at the office, a night's sleep —
  // because what decides whether a call still goes out is whether it is still true, not whether
  // anybody was watching the moment it became due.
  //
  //             from            until
  //   ck        3 h out         when the desk shuts
  //   late      2 h out         when boarding starts, after which it is the board's business
  //   class     52 min out      when general boarding starts, leading it with the front cabins
  //   rows      46 min out      when general boarding starts, leading it with the back rows
  //   board     40 min out      when the gate shuts
  //   final     15 min out      when it goes
  // `class` and `rows` sit after the gate calls in the walk because they are lower urgency — a
  // gate about to close is said before a polite "back rows first" — but their windows end where
  // boarding begins, so each flight gets its cabin call, its row call, then the general call, in
  // that order, in the minutes before the forty-minute mark.
  const CLASS_FROM = 52, ROWS_FROM = 46;
  // When each kind of call is due, as a window of minutes before departure, in order of urgency.
  // The first match walking this list outermost is what the room says, so a gate about to close
  // outranks a desk that has just opened — and a gate that has *moved* outranks everything, which
  // is the whole reason it is at the top.
  //
  // `CHANGE_AT` is a window rather than an instant so the call still goes out if the room happened
  // to be busy at the moment the gate moved; `changedGate` below is what actually decides whether
  // there is anything to say.
  const CALLS = [
    ['change', CHANGE_FROM, CHANGE_TO],
    ['final', SHUT_GATE, 0],
    ['closed', 0, -14],
    ['board', CALL, SHUT_GATE],
    ['late', 120, CALL],
    ['delay', 150, CALL],
    ['cancel', 300, 20],
    ['rows', ROWS_FROM, CALL],
    ['class', CLASS_FROM, ROWS_FROM],
    ['ckend', SHUT_CK + 18, SHUT_CK],
    ['ck', OPEN_CK, SHUT_CK],
    ['in', OPEN_CK - 6, OPEN_CK - 34],
  ];
  // Nothing within three minutes of the last thing said, and no filler within eight. Two flights
  // can legitimately want the room at once — 上海 shuts its gate at 08:05 and 广州 opens check-in
  // at 07:35 — and a loudspeaker that talks over itself is one nobody listens to.
  const AIR_GAP = 3, HALL_GAP = 8, HALL_EVERY = 18;
  const saidToday = new Set();
  let lastAir = -1e9, lastHall = -1e9, hallTurn = 0, wasClock = -1;

  function announce(mins, out) {
    // A new day: the same seven flights come round again and everything said yesterday is spent.
    // Detected by the clock going backwards, which is the only signal a scene gets.
    if (mins < wasClock - 1) { saidToday.clear(); lastAir = lastHall = -1e9; }
    wasClock = mins;
    if (mins - lastAir >= AIR_GAP) {
      // Everything that is due and still true. CALLS is in order of urgency, so the first match
      // found by walking it outermost is the one the room should be saying: a gate about to close
      // outranks a desk that has just opened.
      for (const [kind, from, until] of CALLS) {
        let pick = null, pickD = Infinity;
        for (const f of FLIGHTS) {
          // A cancelled flight has exactly one thing said about it, and everything else the hall
          // might have said — boarding, final call, the desk opening — is now a lie.
          if (f.cancelled !== (kind === 'cancel')) continue;
          // Two ways of saying a flight is late, and which one is right depends on whether the
          // terminal knows the new time yet. 海航七八零二 is the only flight with a clip that names
          // one — 预计起飞时间十六点四十五分 — so it gets that when it is exactly that late, and
          // every other delayed flight gets 起飞时间待定, which is what a real terminal says when
          // the answer is genuinely not known.
          if (kind === 'late' && !(f.late && NOTICES[`late:${f.no}`])) continue;
          // A flight with a specific timed-delay reading uses that one exclusively. Waiting until
          // it has actually been said lets the earlier generic window announce the same delay too.
          if (kind === 'delay' && (!f.late || NOTICES[`late:${f.no}`])) continue;
          // The inbound clip promises an on-time departure. Once today's board has delayed this
          // row, silence is more truthful than playing a baked promise the board already disproves.
          if (kind === 'in' && f.late) continue;
          // The gate only moves on the days it moves.
          if (kind === 'change' && !f.moved) continue;
          const key = `${kind}:${f.no}`;
          if (!NOTICES[key] || saidToday.has(key)) continue;
          const d = f.dep + f.late - mins;
          if (d > from || d <= until) continue;
          // Two flights of the same kind due at once: the nearer departure first.
          if (d < pickD) { pickD = d; pick = key; }
        }
        if (pick) {
          saidToday.add(pick); lastAir = mins;
          out.push('air:' + pick);
          return;               // one thing at a time; the rest stay due until they are said
        }
      }
    }
    // The filler, only in the quiet. It is the lowest-priority thing in the room and must never
    // land on top of a boarding call the player is waiting for.
    if (mins - lastAir >= HALL_GAP && mins - lastHall >= HALL_EVERY) {
      lastHall = mins;
      out.push('air:hall:' + (hallTurn++ % HALL.length));
    }
  }

  // ---------------------------------------------------------------- 起飞 · 降落 the movements
  // One aeroplane, two things it can be doing, and both run the same way down the runway. That is
  // not a shortcut: an airport uses one direction at a time because it uses the wind, so departures
  // rolling +x and arrivals touching down +x is what a real hour out of a window looks like. Sending
  // them opposite ways was the first version and it read as two aircraft about to meet.
  //
  // `u` is 0 to 1 through the movement. Everything below is a curve on u rather than a speed being
  // integrated, so the movement cannot drift, cannot accumulate error, and lands on exactly the
  // same path every time however the frame rate wanders.
  const FLY_FROM = -86, FLY_TO = 96, FLY_RUN = FLY_TO - FLY_FROM;
  const FLY_SECS = 17, FLY_GAP = 15;        // a movement, then an empty runway, then the next one
  let flier = null, flierNext = 0, flierTurn = 0;

  function flyFlier(kind, u) {
    let x, y, pitch;
    if (kind === 'depart') {
      // Accelerating: ground speed rises the whole way, so distance goes as better than u².
      x = FLY_FROM + FLY_RUN * Math.pow(u, 1.75);
      // Rotate at 45% of the roll, hold the attitude through the climb.
      //
      // Positive is nose-up. M.rotZ puts y' = x·sin(a) and the nose is the +x end, so a positive
      // angle lifts it — these were all negative to begin with and the aeroplane climbed out nose
      // down, which is a thing an aeroplane cannot do and looked exactly as wrong as it sounds.
      const rot = Math.min(1, Math.max(0, (u - .45) / .17));
      pitch = .17 * rot * rot * (3 - 2 * rot);
      // Wheels stay on the ground until the nose is up, then it climbs away. The coefficient is set
      // so that it leaves the frame around 32 m up: high enough to be unmistakably flying, and well
      // inside the 62 m sky backdrop, above which there is nothing painted to fly against.
      y = 130.0 * Math.pow(Math.max(0, u - .52), 1.9);
    } else {
      // Approach: fast over the threshold, decelerating down the rollout.
      x = FLY_FROM + FLY_RUN * (1 - Math.pow(1 - u, 1.55));
      const k = Math.min(1, u / .55);
      // Descending at a constant angle, then a flare that takes the last of it off.
      y = 42.0 * Math.pow(1 - k, 1.55);
      // Nose-up on the approach, a touch more in the flare, then the nosewheel comes down.
      pitch = u < .5 ? .085 : u < .58 ? .125 : .125 * Math.max(0, 1 - (u - .58) / .16);
    }
    return { kind, x, y, pitch };
  }

  function placeFlier(st) {
    if (!flierC) return;
    const [cx, cy, cz] = flierC;
    if (!st) {
      // Off the board entirely. Collapsed rather than faded: a prop at alpha 0 still writes depth,
      // so a hidden aeroplane parked on the runway would go on punching a hole in the backdrop.
      for (const p of flierProps) { p.m = M.scale(0, 0, 0); p.cy = -99; }
      return;
    }
    // Move the aeroplane to its own centre, pitch it about that, then put it where it has got to.
    const T = M.mul(M.trans(st.x, st.y, 0),
      M.mul(M.trans(cx, cy, cz), M.mul(M.rotZ(st.pitch), M.trans(-cx, -cy, -cz))));
    for (const p of flierProps) {
      p.m = M.mul(T, p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    // Gear up only on departure. An arrival carries its gear throughout the visible approach;
    // hiding it until six metres made the landing aircraft skim toward the runway clean-bellied.
    // Collapsing the props is still preferable to alpha zero, which continues to write depth.
    if (st.kind === 'depart' && st.y > 6.0)
      for (const p of flierGear) { p.m = M.scale(0, 0, 0); p.cy = -99; }
  }

  // Park the aeroplane at one exact point of one movement and stop the schedule touching it. For
  // the render checks: a fifteen-second climb seen in a single screenshot is a matter of luck, and
  // the whole point of an audit shot is that it is the same picture every time.
  let flierHold = null;
  function holdFlier(kind, u) {
    flierHold = kind ? { kind, u } : null;
    placeFlier(flierHold ? flyFlier(kind, u) : null);
  }

  function flierTick(t) {
    if (!flierC || flierHold) return;
    if (!flier) {
      if (!flierNext) flierNext = t + 4;
      if (t < flierNext) { placeFlier(null); return; }
      // Alternating, so the runway is never busy with the same thing twice running.
      flier = { kind: flierTurn++ % 2 ? 'land' : 'depart', t0: t };
    }
    const u = (t - flier.t0) / FLY_SECS;
    if (u >= 1) { flier = null; flierNext = t + FLY_GAP; placeFlier(null); return; }
    const st = flyFlier(flier.kind, u);
    placeFlier(st);
    // Wingtip lights on throughout, landing light only when it is near the ground and pointing
    // down the runway — which is when a real one is switched on.
    const low = st.y < 12 ? 1 : 0;
    if (flierLamps.length === 3) {
      const blink = .55 + .45 * Math.sin(t * 7.0);
      flierLamps[0].glow = .55 * blink;
      flierLamps[1].glow = .55 * blink;
      flierLamps[2].glow = low * .85;
    }
  }

  // The figures behind the desks breathe, the way the metro clerk does. A standing person shifts
  // on a slow, incommensurate clock — never settling into a rhythm — and leans about the hip,
  // which is where a body actually pivots. The lean is about the agent's facing axis rather than a
  // fixed world axis, so it reads as a sway from every angle the hall is seen from and not as a tilt
  // for some and nothing for others. Two degrees, no more: a bigger movement reads as seasick.
  function setAgents(t) {
    for (const b of agentBusts) {
      const [px, py, pz] = b.pivot;
      // rotY(yaw) · rotX(a) · rotY(-yaw) is a lean about the facing axis [fx,0,fz].
      const yaw = Math.atan2(b.fx, b.fz);
      const a = Math.sin(t * .273 + px * .9) * .020 + Math.sin(t * .71 + pz * 1.3) * .006;
      const R = M.mul(M.rotY(yaw), M.mul(M.rotX(a), M.rotY(-yaw)));
      const T = M.mul(M.trans(px, py, pz), M.mul(R, M.trans(-px, -py, -pz)));
      for (const p of b.props) {
        p.m = M.mul(T, p.m0);
        p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      }
    }
  }

  let flapK = 0;
  function tick(t, body, clock) {
    // What the room wants played this frame. An array, the way the platform's is, because the
    // dispatcher in game.js takes either and a list costs nothing to hand back.
    const out = [];
    // ---- the zones that move, each in its own file. Dispatched before the shell's own so a zone
    // can read the clock the shell is about to act on. A zone whose tick throws is dropped for the
    // rest of the run rather than taking the terminal's animation down with it.
    for (const k in AirFit) {
      const f = AirFit[k];
      if (!f || typeof f.tick !== 'function') continue;
      try { f.tick(t, body, clock); }
      catch (e) { console.error('AirFit ' + k + '.tick: ' + (e && e.message)); f.tick = null; }
    }
    beltTick(t);
    flierTick(t);
    setAgents(t);
    if (secBar.open && t > secOpenT) {
      const inLane = body && Math.abs(body.x - SEC) < .95
        && body.z > LANE.z0 - .3 && body.z < LANE.z1 + .3;
      if (!inLane) secBar.open = false;
    }
    for (const p of secLamp) p.color = secBar.open ? col.lime : col.rose;
    const want = secBar.open ? 1 : 0;
    if (flapK !== want) {
      flapK += Math.sign(want - flapK) * Math.min(Math.abs(want - flapK), .10);
      secArrow.flaps.forEach((p, i) => {
        const s = i ? 1 : -1;
        p.m = M.mul(M.trans(0, 0, s * flapK * ((LANE.z1 - LANE.z0) / 2 - .15)), p.m0);
        p.cx = p.m[12]; p.cz = p.m[14];
      });
    }
    if (typeof clock === 'number') announce(clock, out);
    return out.length ? out : null;
  }

  const NIGHTSKY = C('#1a2338');
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .26;
    // The backdrop is emissive, so nothing else is going to darken it: an unlit quad painted
    // day-sky blue is still day-sky blue at eleven at night, and it was — a bright grey wall
    // behind a terminal with its lights off.
    if (skyProp) for (let i = 0; i < 3; i++)
      skyProp.color[i] = col.sky[i] + (NIGHTSKY[i] - col.sky[i]) * soft;
    // The rooflights are the same fact seen through the roof rather than through the wall, and
    // they have to travel with it: glazing that stays daylight blue while the apron behind the
    // curtain wall goes navy is thirteen bright holes in a dark ceiling.
    for (const p of skyPanes) for (let i = 0; i < 3; i++)
      p.color[i] = ROOFSKY[i] + (NIGHTSKY[i] - ROOFSKY[i]) * soft;
    // The sunset bands travel with the backdrop they stand in front of, and further: a horizon
    // goes out before the zenith does, so they are taken most of the way to black rather than to
    // night blue, which leaves the runway lights the brightest thing on the field after dark.
    for (const p of skyBands) {
      if (!p.color0) p.color0 = [...p.color];
      if (p.glow0b === undefined) p.glow0b = p.glow;
      for (let i = 0; i < 3; i++)
        p.color[i] = p.color0[i] + (NIGHTSKY[i] * .72 - p.color0[i]) * soft;
      p.glow = p.glow0b * (1 - soft * .72);
    }
    // And the floor comes up as the daylight goes, because the shader has one point lamp for
    // a room 44 m long and after dark the far half of it is simply unlit.
    for (const g of pools) g.a = g.a0 * (1 + soft * 2.6);
  }

  // ------------------------------------------------------------------ the gate, on foot
  // The airside seat rows sit at x 5.60, 9.40 and 13.20, the gate is the airbridge door at BRX, and
  // the aisle a passenger walks to get there runs along the +z edge of the hall clear of the rows.
  // A straight line from a seat to the gate clips through every row in between, and the engine has
  // no collision, so a route is two legs: out to the aisle, then down the aisle to the gate mouth.
  // `k` is a shoulder offset so two passengers heading to the same gate do not stand in each other.
  const AISLE_Z = RZ - 1.40;                       // the walkway behind the seat rows
  function gatePoint(k = 0) { return [BRX - 1.80, 0.30 + k * 0.42]; }
  function walkToGate(n, k = 0) {
    if (!n || !n.spots || !n.spots.length) return;
    const sx = n.spots[0].at[0], sz = n.spots[0].at[1];
    const [gx, gz] = gatePoint(k);
    const legs = [
      // Stand out of the seat first, then step into the aisle.
      { at: [sx, sz], dwell: 0.4 + Math.random() * 0.5, act: 'wait', face: 0 },
      { at: [sx, AISLE_Z], speed: 0.92, act: 'wait' },
      // Down the aisle to the gate, queuing a little short of the door.
      { at: [gx, gz], speed: 1.05, act: 'wait', face: 0,
        done: () => { if (n.spots && n.spots[0]) { n.spots[0].at = [gx, gz]; n.spots[0].face = 0; } } },
    ];
    n.errand = legs;
    n.wait = 0;
    return true;
  }

  const api = B.finish({
    setNight, tick, setBoard, setGate, openSecurity, securityIsOpen, statusOf, checkinOpen,
    noticeOf, nextFlight,
    FLIGHTS, DUTY, CALL, SHUT_GATE, OPEN_CK, SHUT_CK,
    // Today's disruption, rolled once a day off the day number and the weather, and how long the
    // two queues are at this minute. Both are read by game.js; nothing in here consults them.
    setDay, queueMins, queueLoad, gateOf,
    // The same deterministic hash the day roll uses, so anything else that wants a stable shuffle
    // out of a flight number gets one that is stable in the same way.
    hashOf: hash,
    // What the loudspeaker can say, read out of the scene the way Metro.NOTICES is: the bake
    // enumerates it, and game.js looks an `air:` event up in it.
    NOTICES,
    // Read-only, for the harness: which calls have gone out today.
    saidToday: () => [...saidToday],
    // What each registered zone contributed, and whether it threw on the way. See buildZones.
    zonesBuilt: () => zoneLog.map(z => ({ ...z })),
    // The terminal's own departure gate, for a passenger to walk to when their flight is called.
    gatePoint,
    // Hand a seated passenger a route from their seat to the gate queue and stand them in it. The
    // legs go around the seat rows and the airside aisle rather than through them, the way the cabin
    // crew's legs go around the seats, because the engine walks in straight lines and has no notion
    // of collision. The last leg rewrites the passenger's home spot to the gate, so when the errand
    // empties they stay at the gate instead of walking back to the seat they left.
    walkToGate,
    // And what is on the runway, so the movement can be measured rather than watched. An animation
    // nobody can check is an animation that quietly stops working.
    flier: () => flier && { kind: flier.kind, ...flyFlier(flier.kind, 0) },
    flyFlier, holdFlier, flierAt: () => {
      if (!flierProps.length) return null;
      const p = flierProps[0];
      return { x: +p.m[12].toFixed(2), y: +p.m[13].toFixed(2), hidden: p.cy === -99 };
    },
    RX, RZ, H, WIN, OUT, SEC, LANE,
    label: '机场', labelK: '机场 · airport',
    indoor: true, cutaway: true, near: .05, far: 190, expose: 1,
    // Out of the subway lobby at the west end, looking down the hall toward the desks.
    spawn: { x: DX + .60, z: RZ - 2.90, yaw: Math.PI * .86 },
    zones: [
      { id: 'land', x0: -RX, x1: SEC + .40, z0: -RZ, z1: RZ, light: [-9.0, H - .70, 0] },
      { id: 'air', x0: SEC - .40, x1: RX, z0: -RZ, z1: RZ, light: [12.0, H - .70, 0] },
    ],
    roomAt(x) { return x > SEC ? this.zones[1] : this.zones[0]; },
  });
  // The runway aircraft keeps the matrix it was built with, so `placeFlier` has something to fly
  // from. Captured after `finish`, which is where each prop's cull data is worked out from the
  // matrix it finds — the same order metro.js captures its train in, and for the same reason.
  for (const p of flierProps) p.m0 = p.m;
  // The desk and gate agents keep theirs too, so `setAgents` has a rest to lean from. Same reason,
  // same place: the home matrix has to be snapshotted after `finish` reads it.
  for (const b of agentBusts) for (const p of b.props) p.m0 = p.m;
  // And it starts off the board rather than sitting on the centreline: the first frame of the
  // terminal should not have an aeroplane parked across the runway waiting for its cue.
  placeFlier(null);
  return api;
});
