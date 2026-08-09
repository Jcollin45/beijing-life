// Player, camera, interaction, HUD.
(() => {
const cv = document.getElementById('cv');
const gl = R.init(cv);
R.setRoom(World.RX, World.H, World.RZ);
R.setBulb(0, World.H - 0.34, -0.20, 1);
R.setWindow(World.WIN.x, World.WIN.y, World.WIN.z, World.WIN.hw, World.WIN.hh);
// Both places have finished asking for the characters they write on their signs, so the sheet
// can be laid out and handed over. It has to happen after R.init and after the scenes are
// built, which is exactly here.
Glyphs.upload();

// ---------------------------------------------------------------- frame rate
// Perf watches the frame time and picks a quality level; this is the one place that knows what
// a level actually means to the renderer. Everything else reads Perf.q where it needs to.
// document.querySelector directly, not the `$` helper: this runs at the top of the file, and
// `$` is a const declared further down — reaching for it here throws before the game exists.
const perfChip = document.getElementById('perf');
const perfVal = perfChip && perfChip.querySelector('b');
const perfName = perfChip && perfChip.querySelector('i');
Perf.init(q => {
  R.setRenderScale(q.scale);
  R.setShadowSize(q.shadow);
  R.setGlyphAssist(q.glyphAssist);
  // The glow around every lit thing in the game, and the vignette under it. Off on the bottom two
  // tiers, where the frames it costs are frames the machine did not have.
  R.setPost(q.bloom > 0, q.bloom, q.bloom > 0 ? 0.30 : 0);
  // And the contact darkening, which needs a buffer of its own and so has its own switch.
  R.setAO(q.ao > 0, q.ao);
});
let perfShown = 0;
function updatePerfChip() {
  if (!perfChip) return;
  // Repainted a few times a second, not sixty: writing to the DOM every frame to display the
  // frame rate is a fine way to lower the frame rate.
  if (t0 - perfShown < 220) return;
  perfShown = t0;
  const f = Perf.fps;
  perfVal.textContent = `${f.toFixed(0)} fps`;
  perfName.textContent = `${Perf.frameMs.toFixed(1)} ms · ${Perf.label}`;
  perfChip.classList.toggle('warn', f < 50 && f >= 34);
  perfChip.classList.toggle('bad', f < 34);
}

const FOV = 0.95;

// Two places to be: the apartment, and the hutong outside it. They are separate coordinate
// spaces with their own props, colliders and lighting rules, and the one you are standing in
// is the only one the loop touches.
// Five places to be: the apartment, the hutong outside it, and the three doors off the alley
// you can actually walk through — the corner shop, the noodle place, and the office you work
// in. Each is its own coordinate space with its own props, colliders and lighting rules, and
// the one you are standing in is the only one the loop touches, so the cost of having five is
// the cost of the largest one.
const PLACES = { home: World, street: Street, shop: Shop, pharmacy: Pharmacy, market: Market, diner: Diner,
                 bank: Bank,
                 hospital: Hospital, hospital2: Hospital2, hospital3: Hospital3, hospital4: Hospital4,
                 hotelB1:HotelB1,hotel:Hotel,hotel2:Hotel2,hotel3:Hotel3,hotel4:Hotel4,
                 hotel5:Hotel5,hotel6:Hotel6,hotel7:Hotel7,hotel8:Hotel8,hotel9:Hotel9,
                 hotel10:Hotel10,hotel11:Hotel11,hotel12:Hotel12,
                 hotelLift:HotelLift.scene,
                 mall: Mall,
                 // 京华大厦 A座. `office` deliberately remains the fourth-floor workplace key so
                 // saves from the original one-room office reopen at the same desk; the street
                 // enters through the new `office1` lobby and every other level has its own scene.
                 officeB1:OfficeB1, office1:Office1, office2:Office2, office3:Office3,
                 office:Office4, office5:Office5, office6:Office6, office7:Office7,
                 officeRoof:OfficeRoof,
                 officeLift:OfficeLift.scene,
                 metro: Metro, park: Park, zoo: Zoo, zoo_tropical: ZooTropical,
                 campus: Campus, classroom: Classroom,
                 library: Library, nightmarket: NightMarket,
                 rail: Rail, airport: Airport, train: Train,
                 // Inside the aeroplane. Reached only by boarding one, and left only by landing.
                 cabin: Cabin,
                 // The two that are not in Beijing, and the only two you cannot reach on foot
                 // or by subway: 外滩 and 宽窄巷子 are each on the far end of a flight.
                 bund: Shanghai, chengdu: Chengdu };
let scene = World, place = 'home';

// ---------------------------------------------------------------- state
// you have just come through the front door, looking into the apartment
// `jy` is how far off the floor the body is, in metres, and `jv` its vertical speed. Both are
// zero the entire time you are walking, which is most of the game.
const P = { x: 2.30, z: 2.05, yaw: Math.PI * 0.85, vx: 0, vz: 0, phase: 0, speed: 0, turn: 0,
            jy: 0, jv: 0 };
// A hop, not a platformer. 3.15 m/s against 11 m/s² peaks at 0.45 m and is over in 0.57 s, which
// is about what an adult does on the spot. Gravity is a little stronger than the real thing
// because a true 9.8 hangs at the top long enough to read as floaty at this camera distance.
//
// It clears nothing. Collision in this project is a 2D footprint — `solid(x0,x1,z0,z1)` has no
// height, and `clampMove` never sees `jy` — so you cannot jump onto or over anything, and adding
// height to the collider would change how every scene in the game is walked. This is the hop
// itself: something to do with the space bar, and a body that leaves the floor when you press it.
const JUMP_V = 3.15, JUMP_G = 11.0;
// The camera keeps a target and a damped current value, so drags, wheel steps and
// keyboard orbit all resolve into one smooth motion instead of snapping per event.
const CAM = {
  yaw: Math.PI * 0.85, pitch: 0.34, dist: 4.4,
  tYaw: Math.PI * 0.85, tPitch: 0.34, tDist: 4.4,
  fx: 2.30, fz: 2.05,      // smoothed look-at point, trails the player slightly
  lookY: 1.10,             // height the camera aims at, roughly the player's chest
  fov: FOV,                // eased per place: a room frames tighter than a boulevard
  spin: 0,                 // leftover rad/s after a flick, decays on its own
  assist: null,            // hospital room whose one-time doorway framing is currently armed
  slide: 0, rise: 0,       // obstruction recovery, applied to the eye without stealing orbit input
};
const eye = new Float32Array(3);
const keys = {};
// Kept separate from physical keys so lifting a thumb cannot cancel a key still held on a
// keyboard attached to a tablet. Both maps feed the same movement code below.
const touchKeys = {};
// camera basis, rebuilt every frame and reused for cursor picking
const cam = { fwd: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0], aspect: 1 };
const mouse = { x: -1, y: -1, inside: false };
let hoverLabel = null;        // a world label the cursor is directly over
let hoverThing = null;        // what the cursor is over
let reachThing = null;        // what the player is standing next to
let activeThing = null;       // what E / click will actually open
let useThing = null;          // what Q will operate: the nearest thing that does something
// 465. Everything usable within reach this frame, in the order the frame loop found it, so a
// player who cannot aim can step through them instead. Filled by the loop that already picks
// `useThing` rather than by a second pass, and its length is reset rather than the array
// reallocated — this runs sixty times a second.
const nearUsables = [];
let cycleIdx = -1, cyclePick = null;
let cardOpen = false, bookOpen = false;
// A conversation is a modal like the word card, and everything the card blocks it blocks too.
let talkOpen = false, talkAt = null;
let cardWord = null, quiz = null, revealTok = 0;
let act = null;               // what the body is physically doing, if anything
// Staying in a seat after the action that put you there has finished. Every other action in the game
// is a thing you do and then stop doing, which is why `act` is cleared when one completes — but
// sitting down on an aeroplane is not an activity, it is where you are for the next hour, and the
// 2.4 seconds the action takes is only the business of lowering yourself into the chair. Without this
// you stood up again as the engines spooled and rode the whole flight on your feet in the aisle,
// which nobody noticed while the cabin was empty and is impossible to miss now that twenty-two
// people are sitting down around you.
let sitting = null;
// A day's wage to start with, not a fortune. At ¥5,000 against ¥18 noodles the money chip was
// decoration: nothing you could buy in a week made a dent in it, so none of the prices meant
// anything. One shift in the pocket and a fridge with two meals left in it is a position — you
// can eat for a couple of days, and then you have to go to work.
let money = 260, day = 1, t0 = performance.now(), frameHold = false;
// 房租, off the top every morning. Without something pulling the other way a wallet only ever
// fills up and the prices stop being decisions: one shift covers the rent and a day's food with
// room to spare, so the pressure is gentle, but it is there.
const RENT = 60;
let minutes = 14 * 60;        // float: minutes since midnight, one per real second
let started = false;          // the clock and the needs wait for the title screen
// 403. The ceiling light, per room rather than per world. One boolean for the whole flat meant
// leaving the bathroom light on was not a thing that could happen, and the tower seen from the
// street had one bit to read for twelve storeys. Keyed `place:roomId`, and **absent means on**, so
// every room in every scene keeps the lit-by-default behaviour it had and only a room somebody has
// actually switched off carries an entry — a save from before this holds no keys and is correct.
const lightsOn = {};
const lightKey = (pl, r) => pl + ':' + ((r && r.id) || 'main');
// Named `roomLit` and not `lit`: the draw loop already declares a `const lit` of its own for the
// room's lamps, and a shadowing helper that means nearly the same thing is how that gets read as
// one variable. Arguments rather than closure reads, so a caller can ask about a room it is not in.
function roomLit(pl, r) { return lightsOn[lightKey(pl, r)] !== false; }
// The last day the body was in the flat during 物业 office hours. A repair visit lands on a day,
// not at a moment, so the only question that matters is whether you were in for it — which is the
// entire reason being at home on a Wednesday afternoon is worth anything. Set from the draw loop
// because that is the one place that knows `place`, the deck and the clock together.
let homeDayIn = -1;
// Everything that goes into the fridge goes through here. Eight call sites each passed the module
// clock by hand, which is eight places for a shop to bank food against the wrong day; it is also
// the one place a future 保质期 or a shopping-bag animation would have to hook. The pantry call it
// wraps is unchanged in signature — this is a door, not a wrapper with opinions.
const stow = (hz, units = 1) => Pantry.add(hz, units, day);
// 停电. The switch on the wall still toggles `lightsOn`; it just does not achieve anything while
// the power is out, which is what makes 停电 a thing you discover rather than a thing you are told.
// Guarded on the module, like js/world.js's own two hooks: harnesses load game.js without it.
const powered = () => place !== 'home' || typeof Disrupt === 'undefined' || !Disrupt.homePower
                      || !Disrupt.homePower(day, minutes);
// What is in the fridge is Pantry's, not a number here. `stock` used to live on this line as an
// integer count of meals and it is the variable this whole file has been unpicked from: a meal is
// now a thing with a name, a measure word and a day it was bought, and "how many are left" is a
// question you ask rather than a number you keep. This getter is what the HUD and the diary read,
// and it is deliberately read-only — anything that wants to change what is in the fridge has to
// say what it is putting in or taking out.
const stockOf = () => Pantry.meals(day);
// Seeded here rather than at the title screen, for the same reason `stock` was initialised here:
// this is the value the flat has before anybody presses PLAY. The acceptance harnesses drive the
// game straight off the title screen without ever calling `endTitle`, so a fridge filled in there
// is a fridge that is empty for every test in the suite — and, more to the point, the starting
// state of a flat is a fact about the flat and not about the menu in front of it.
Pantry.seed(day);
let showBody = true;              // off only from the screenshot harness
let drawnProps = 0;               // how many props survived culling, for profiling
// Scratch for the instanced path: the visible members of one batch, 26 floats each, refilled
// per batch per frame and grown when a batch outgrows it. One allocation that settles rather
// than a per-frame one.
let instScratch = new Float32Array(4096);
// Write the complete per-instance record. Mall batches retain these records across frames and
// call this only for the explicitly animated subset; every other scene keeps using it through the
// ordinary scratch path below. Keeping the exact layout in one place prevents the retained and
// live paths drifting apart when another instance field is added.
function packPropInstance(dst,o,p,glyph) {
  const m=p.m;
  for(let k=0;k<16;k++) dst[o+k]=m[k];
  const col=p.color;
  dst[o+16]=col[0]; dst[o+17]=col[1]; dst[o+18]=col[2];
  dst[o+19]=p.gloss===undefined?.12:p.gloss;
  dst[o+20]=p.alpha===undefined?1:p.alpha;
  dst[o+21]=p.glow||0;
  if(glyph) {
    const rc=Glyphs.rect(p.ch,p.glyphPrimary);
    if(rc) {
      dst[o+22]=rc[0]; dst[o+23]=rc[1]; dst[o+24]=rc[2]; dst[o+25]=rc[3];
    } else dst[o+24]=0;
  } else dst[o+24]=0;
}
let hudAcc = 0;                   // HUD refreshes a few times a second, not every frame

const $ = s => document.querySelector(s);
const labelHost = $('#labels');

function setSurfaceOpen(selector, open) {
  const el = $(selector);
  if (!el) return;
  el.setAttribute('aria-hidden', String(!open));
  el.inert = !open;
}

// The renderer and HUD are alive behind the title reel, but they are not yet a user interface.
// Keep that background machinery out of the accessibility tree until PLAY is pressed.
const GAMEPLAY_SURFACES = ['#hud','#flightStatus','#needs','#goals','#map','#labels',
  '#doing','#prompt','#toast','#keys','#touchControls'];
function setGameplayAccessible(open) {
  for (const selector of GAMEPLAY_SURFACES) setSurfaceOpen(selector, open);
}
setGameplayAccessible(false);

// `DOOR_AT` lives in js/data.js: the courier's spot in `NPCS` is written against it, so the
// constant has to be declared before that table is built.

// ---------------------------------------------------------------- who they are, in the body
// A person is recognisable across a courtyard long before their face is, and what you are
// recognising is not their clothes — it is how they hold themselves and what they keep doing
// with their hands. `activityPose` says what somebody is doing; this says who is doing it, and
// the two are deliberately separate, because the same 等 at a bus stop has to come out as a
// bored teenager and as a patient old man from the same three lines of pose code.
//
// Four dials and one mannerism, which turned out to be as far as this rig goes before the
// differences stop reading. `restless` is how much a body that is nominally still moves anyway.
// `open` is the strongest of them by a distance: shoulders back with the chin up against
// shoulders rolled forward with the head down changes the *silhouette*, so unlike the rest of
// this it survives to any distance and through any amount of fog. `curious` is how far the head
// and eyes go hunting for something to look at. `blink` scales the eyes. `pace` is not read by
// `traitPose` at all — it is folded into walking speed once, at load.
//
// It lives up here rather than beside `traitPose` because the roster below resolves its people
// against it as the file executes, and a `const` further down the file is in the temporal dead
// zone at that point — which throws before the first frame and takes the whole game with it.
const TEMPERAMENT = {
  brisk:    { restless: 1.30, open:  0.55, curious: 0.65, blink: 1.20, pace: 1.18, quirk: 'check' },
  bustling: { restless: 1.45, open:  0.30, curious: 1.10, blink: 1.25, pace: 1.24, quirk: 'check' },
  steady:   { restless: 0.85, open:  0.25, curious: 0.80, blink: 1.00, pace: 1.00, quirk: null },
  patient:  { restless: 0.55, open:  0.10, curious: 0.55, blink: 0.85, pace: 0.88, quirk: 'hands' },
  weary:    { restless: 0.60, open: -0.45, curious: 0.40, blink: 0.80, pace: 0.82, quirk: 'stretch' },
  watchful: { restless: 0.70, open:  0.35, curious: 1.45, blink: 1.10, pace: 0.95, quirk: 'peer' },
  genial:   { restless: 1.00, open:  0.70, curious: 1.20, blink: 1.05, pace: 0.95, quirk: 'nod' },
  shy:      { restless: 1.15, open: -0.55, curious: 0.75, blink: 1.30, pace: 1.05, quirk: 'scratch' },
  bored:    { restless: 1.55, open: -0.30, curious: 0.95, blink: 0.90, pace: 0.92, quirk: 'rock' },
  brash:    { restless: 1.10, open:  0.85, curious: 0.70, blink: 0.90, pace: 1.10, quirk: 'pocket' },
  frail:    { restless: 0.45, open: -0.60, curious: 0.50, blink: 0.75, pace: 0.70, quirk: 'fan' },
  eager:    { restless: 1.60, open:  0.75, curious: 1.60, blink: 1.35, pace: 1.30, quirk: 'bounce' },
};

// `NPCS` lives in js/data.js, with the other two data tables.
// ---------------------------------------------------------------- 乘客 the other passengers
// Forty seats and nobody in them. A carriage with no one else on it is the emptiest room in the
// game, and it is the one room the player sits in for a minute at a time watching the tunnel go by.
//
// Their seats are read out of the carriage rather than written down here. Train.SEATS is the same
// list the forty sitting actions are built from, so a passenger is always in a real seat facing the
// real way, and moving a seat in train.js moves whoever is in it. `care` marks the priority rows,
// which is where the older passengers go and where nobody else sits.
//
// None of them has lines. They are the crowd — the same as the ones in the hutong and the terminal —
// and their job is to be somebody else being carried in the same direction as you.
//
// Eleven of them for seven seats, because a carriage that carries the same seven faces from one end
// of the line to the other is a diorama. The four spare ride off the train, and at every station
// some of the seated ones walk out and some of the spare ones walk in — see `carriageStop` below.
const RIDERS = [];
Lazy.onBuild('Train', () => {
  const seats = (typeof Train !== 'undefined' && Train.SEATS) || [];
  if (!seats.length) return;
  // Picked by index rather than at random, so the same people are in the same seats on every
  // journey and every reload: a carriage that reshuffles itself when you look away is worse than
  // an empty one. `off` starts somebody on the platform instead of in a seat.
  const WHO = [
    { at: 3,  hz: '乘客', look: { skin:'#e0ae82', hair:'#1e1a18', hairStyle:'bun', top:'#755268',
        pants:'#2f343b', shoe:'#cfc9bb', collar:'vneck', sleeve:'short', bag:'shoulder',
        bagColor:'#756959', tall:0.96, wide:0.94, faceSeed:109 },
      act: 'phone', temper: 'bored' },
    { at: 9,  hz: '乘客二', look: { skin:'#b8845c', hair:'#332b28', hairStyle:'short',
        top:'#cfc8b8', pants:'#333a44', shoe:'#e4ded0', jacket:'#4f5740', collar:'polo',
        beard:'stubble', tall:1.02, wide:1.11, age:0.34 }, act: 'sit', temper: 'weary' },
    { at: 14, hz: '乘客三', look: { skin:'#a86e46', hair:'#1f1b19', hairStyle:'braid',
        top:'#8a6f3a', pants:'#2f343b', shoe:'#cfc9bb', sleeve:'short', tall:0.97, wide:0.90,
        pack:true, packColor:'#3d5a70' }, act: 'read', temper: 'watchful' },
    { at: 21, hz: '乘客四', look: { skin:'#d9ab80', hair:'#221d1b', hairStyle:'buzz',
        top:'#2f4f7a', pants:'#2b3340', shoe:'#33373c', collar:'turtle', beard:'goatee',
        tall:1.06, wide:0.97, cap:'#2b3a46' }, act: 'sit', temper: 'brash' },
    { at: 27, hz: '乘客五', look: { skin:'#e8bb96', hair:'#2b2522', hairStyle:'ponytail',
        top:'#b8443a', pants:'#333a44', shoe:'#3b4046', sleeve:'short', tall:0.95, wide:0.91,
        youth:0.30 }, act: 'phone', temper: 'shy' },
    // The two in the priority seats: grey, stooped, and sitting where they are meant to sit.
    // Old enough to be given the seat, which means the face has to carry it as well as the hair —
    // the stoop feeds `initNPC`'s age derivation, so raising one raises the other.
    { at: 0,  hz: '大爷', look: { skin:'#c08a5e', hair:'#c8c6c0', hairStyle:'short',
        top:'#e4e0d2', pants:'#39414c', shoe:'#43474d', sleeve:'none', hat:'flat',
        hatColor:'#6f7a52', beard:'full', beardColor:'#b8b4ac', tall:0.90, wide:1.06,
        stoop:0.18 }, act: 'sit', care: true, temper: 'frail' },
    { at: 1,  hz: '阿婆', look: { skin:'#d9ab80', hair:'#bdb9b1', hairStyle:'perm',
        top:'#c4b8bc', pants:'#343b45', shoe:'#cfc9bb', vest:'#7a4a5c', sleeve:'short',
        tall:0.87, wide:0.99, stoop:0.15 }, act: 'sit', care: true, temper: 'frail' },
    // The four waiting on platforms further down the line.
    { off: true, hz: '乘客六', look: { skin:'#dcae85', hair:'#241f1d', hairStyle:'tousled',
        top:'#46655f', pants:'#2e343d', shoe:'#e9e2d5', collar:'hood', tall:0.96, wide:0.87,
        youth:0.50, headScale:1.04, pack:true, packColor:'#8a4550' },
      act: 'phone', temper: 'bored' },
    { off: true, hz: '乘客七', look: { skin:'#c9926a', hair:'#9a958d', hairStyle:'bob',
        top:'#8d5f7a', pants:'#39414c', shoe:'#e4ded0', sleeve:'short', bag:'tote',
        bagColor:'#b0a68c', tall:0.92, wide:1.04, stoop:0.07 },
      act: 'read', temper: 'patient' },
    { off: true, hz: '乘客八', look: { skin:'#e6b892', hair:'#1d1917', hairStyle:'buzz',
        top:'#d8d2c2', pants:'#333a44', shoe:'#cfc9bb', jacket:'#b07a34', collar:'shirt',
        beard:'moustache', tall:1.04, wide:1.17, glasses: true, age:0.40 },
      act: 'sit', temper: 'steady' },
    { off: true, hz: '乘客九', look: { skin:'#d3a37c', hair:'#302925', hairStyle:'bun',
        top:'#5a6c9a', pants:'#2b3340', shoe:'#43474d', collar:'vneck', bag:'shoulder',
        bagColor:'#4a4048', tall:0.92, wide:0.89 }, act: 'phone', temper: 'brisk' },
  ];
  // Aisle seats only — slots 1 and 2 of the four across, at z ±0.68. Two reasons, and they agree.
  // The rows face forward, so leaving a window seat means crossing the aisle seat beside it, and
  // with 40 seats and 7 people that seat is nearly always empty: the walk went straight through
  // its cushion and its back shell in full view of the aisle. And it is what people do anyway —
  // somebody travelling alone in a 2+2 car takes the aisle.
  // And only the seats there is room to stand up out of — `walkOut` is null for the front row of
  // every wall span, where the row in front is close enough that the only way to the aisle is
  // through the armrest or through the seat back ahead. The two priority-seat passengers never get
  // up, so their pair is not held to it.
  const aisleSeat = s => (s.slot === 1 || s.slot === 2) && s.walkOut != null;
  const care = seats.filter(s => s.care && (s.slot === 1 || s.slot === 2));
  const plain = seats.filter(s => !s.care && aisleSeat(s));
  // `at` is a preference, not an index: scan on from it for the first seat nobody has taken. Two
  // people wanting the same seat used to be impossible only because the pool was bigger than the
  // spread of the numbers, which is a coincidence rather than a rule.
  const used = new Set();
  const pick = (pool, at) => {
    for (let i = 0; i < pool.length; i++) {
      const s = pool[(at + i) % pool.length];
      if (!used.has(s)) { used.add(s); return s; }
    }
    return null;
  };
  for (const w of WHO) {
    const pool = w.care ? care : plain;
    const st = w.off ? null : pick(pool, w.at);
    if (!w.off && !st) continue;
    // Somebody riding off the train waits out of sight beside the doors. The position only
    // matters for the frame they become visible on, and `carriageStop` sets it properly then.
    const at = st ? [st.x + .10, st.z] : [Train.DOORX[1] + 1.7, 1.95];
    const n = {
      hz: w.hz, place: 'train', look: w.look, temper: w.temper,
      // The seat's own yaw, so they face the way the seat faces — down the car, not across it —
      // and they keep it when the player walks past. See `faceLock` in updateNPCs.
      seatY: 0.49, faceLock: true, rider: true, gone: !!w.off,
      // Getting on and off happens inside a nine-second dwell, and at the old 0.86 a passenger
      // crossing the car was still on their feet when the doors shut and had to be snapped into
      // their seat by `settleRiders`. Still slower than the concourse: you shuffle in a carriage.
      seat: st || null, care: !!w.care, sitAct: w.act, speed: 1.08 + (RIDERS.length % 3) * .06,
      spots: [{ h0: 0, h1: 24, at, face: st ? st.yaw : Math.PI, act: st ? w.act : undefined }],
    };
    RIDERS.push(n);
    addNPC(n);
  }
});

// ---------------------------------------------------------------- 乘客 the other people on board
// Forty-two seats and, until now, one person in them — the crew member. Everything else about the
// cabin can be right and it will still not read as a flight while you are the only passenger on a
// widebody, so this is the largest single thing missing from the room.
//
// Built exactly the way the train carriage's riders are, and for the same reason: a passenger is
// aboard or not aboard, and the clock has nothing to do with it. `rider: true` is what tells
// `npcAwake` that — see the note there — and `faceLock: true` keeps them facing the way the seat
// faces instead of turning to watch you go past, which is the difference between a cabin of people
// and a cabin of meerkats.
//
// None of them has `lines`. That is deliberate on two counts: a passenger with no lines gets
// `reach: -1` and never enters the place's things or the word list, so twenty-two of them cost the
// dictionary nothing and cannot walk into the missing-headword crash that numbered crowd members
// caused before; and twenty-two strangers all wanting to talk to you is not a quiet flight. Somebody
// worth talking to in the next seat is a job for talk.js, separately.
const CABIN_ABOARD = [];
Lazy.onBuild('Cabin', () => {
  // Eight wardrobes. A cabin is the one room in this game with no uniform in it, so what tells one
  // passenger from another is simply what they happen to be wearing; everything not named here —
  // the face, the build, the age in the hair — `makeLook` derives from the seed, which is how the
  // terminal's waiting passengers are built and why no two of them read as the same person.
  // Eight wardrobes, and they are travelling clothes rather than street clothes: layers you can
  // sleep in, one strong colour each at most, nothing anybody would choose to sit in for nine
  // hours if they had a say. Four read as men and four as women — indices 0, 3, 5 and 7 against
  // 1, 2, 4 and 6 — and `man` below depends on that, because a beard has to agree with the hair
  // above it. Move a fit between the halves and move it in `man` too.
  const FITS = [
    // A business traveller, which is the one person on any Beijing flight wearing a jacket.
    { skin:'#d3a37c', hair:'#2b2523', hairStyle:'short', top:'#e6e0d0', pants:'#2b3038',
      shoe:'#2b2e33', collar:'shirt', jacket:'#2f3a4e' },
    { skin:'#e0ae82', hair:'#1f1b19', hairStyle:'bob', top:'#c9c3b4', pants:'#3a3630',
      shoe:'#e4ded0', collar:'shirt', glasses:true, vest:'#7a4a52' },
    { skin:'#cf9d74', hair:'#332b28', hairStyle:'braid', top:'#8a4a4a', pants:'#2f343b',
      shoe:'#cfc9bb', collar:'vneck', sleeve:'short' },
    { skin:'#b8845c', hair:'#241f1d', hairStyle:'short', top:'#4f5740', pants:'#333a44',
      shoe:'#3d4147', collar:'turtle', beard:'stubble' },
    // Grey and stooped. The cabin had nobody over fifty in it, and a scheduled flight out of
    // Beijing is half people going to see their families.
    { skin:'#e8bd93', hair:'#bdb9b1', hairStyle:'perm', top:'#d8d2c2', pants:'#454b57',
      shoe:'#8a8378', collar:'crew', vest:'#6a5f4a', stoop:0.12 },
    { skin:'#c99268', hair:'#1c1917', hairStyle:'buzz', top:'#2f3a4a', pants:'#22262c',
      shoe:'#2a2d31', collar:'hood', glasses:true },
    { skin:'#a86e46', hair:'#3a2e24', hairStyle:'bun', top:'#e2dac6', pants:'#3a4048',
      shoe:'#ded8ca', collar:'crew', jacket:'#a8613a' },
    { skin:'#d6a077', hair:'#2a2422', hairStyle:'tousled', top:'#6a6f78', pants:'#2b3138',
      shoe:'#43474d', collar:'polo', sleeve:'half' },
  ];
  // What the two or three people sharing a wardrobe do not share. Eight fits across twenty-two
  // seats means every jumper in this cabin is worn more than once, and identical twins in row 21
  // and row 25 is exactly the sort of thing a widebody is too small to hide. Seven entries read
  // by the seed, which is already unique per passenger, so the pairing never repeats within a fit.
  // The last entry greys whoever lands on it, beard and all. It is reached by exactly one of the
  // twenty-two seeds, which with the grandmother at `fit` 4 puts two people over sixty on this
  // aeroplane — the same proportion the priority seats on the train carry.
  const MVARY = [ {}, { beard:'stubble' }, { glasses:true },
                  { hat:'cap', hatColor:'#39424e' }, { beard:'goatee' }, {},
                  { hair:'#a8a49c', beard:'full', beardColor:'#b8b4ac', stoop:0.09 } ];
  const FVARY = [ {}, { glasses:true }, { scarf:'#7a3f45' }, {},
                  { scarf:'#4f5740' }, { hat:'beanie', hatColor:'#5b6045' }, {} ];
  // Seat, wardrobe, what they are doing, face seed, temperament. The scatter is the point: the back
  // row nearly empty, middles free more often than windows, and two pairs sitting together, because
  // a cabin filled evenly reads as an assignment rather than as a flight. Twenty-two of forty-two is
  // about a real load factor once you take out the seats nobody books.
  //
  // `sit`, `phone`, `read` and `play` all share the seated base pose, so all four are safe here —
  // they differ only in what the arms and the head are doing.
  const ABOARD = [
    ['21A', 0, 'read',  211, 'patient'], ['21B', 4, 'phone', 337, 'bored'],
    ['21D', 2, 'sit',   118, 'weary'],   ['21F', 5, 'phone', 902, 'eager'],
    ['21G', 1, 'read',  455, 'shy'],
    ['22B', 3, 'sit',   276, 'steady'],  ['22C', 6, 'phone', 641, 'brash'],
    ['22E', 7, 'read',  183, 'patient'], ['22G', 2, 'sit',   529, 'bored'],
    ['23A', 5, 'phone', 764, 'eager'],   ['23D', 1, 'sit',   392, 'weary'],
    // Two together, and the small one is playing rather than reading.
    ['23E', 4, 'play',  847, 'eager'],   ['23F', 0, 'read',  205, 'steady'],
    ['24B', 6, 'sit',   613, 'shy'],     ['24C', 3, 'read',  488, 'patient'],
    ['24G', 7, 'phone', 726, 'brash'],
    ['25A', 2, 'sit',   351, 'bored'],   ['25B', 5, 'read',  969, 'weary'],
    ['25E', 0, 'phone', 142, 'eager'],   ['25F', 6, 'sit',   580, 'steady'],
    ['26C', 1, 'read',  433, 'shy'],     ['26D', 3, 'phone', 857, 'bored'],
  ];
  for (const [id, fit, act, seed, temper] of ABOARD) {
    const st = Cabin.SEATS.find(s => s.id === id);
    // A seat id that is not in the aeroplane is a typo, not a passenger. Skipped rather than seated
    // at the origin, which is how you get somebody standing in the galley wall.
    if (!st) continue;
    // Which half of the wardrobe list this fit came from — see the note on FITS. It decides which
    // variation table applies, so nobody ends up in a bun with a full beard under it.
    const man = fit === 0 || fit === 3 || fit === 5 || fit === 7;
    const n = {
      hz: '乘客', place: 'cabin',
      look: { ...FITS[fit], ...(man ? MVARY : FVARY)[seed % 7], faceSeed: seed,
              // Twenty centimetres of height across the cabin rather than eleven, and a real
              // spread of builds underneath it. Two rows of people the same width is the thing
              // that reads as a repeated model however different their shirts are.
              wide: (man ? 1.00 : 0.90) + (seed % 11) * .020,
              // The one child aboard, at 23E next to the passenger at 23D. Overridden outright
              // rather than scaled down: a child in a grandmother's cardigan at 78% is not a
              // child, and `fit` 4 is exactly who that seat would otherwise have been dressed as.
              ...(act === 'play'
                ? { hair:'#241f1d', hairStyle:'tousled', beard:null, hat:null, hatColor:null,
                    cap:null, scarf:null, glasses:false, vest:null, jacket:null,
                    top:'#c9973f', pants:'#3f4a5c', shoe:'#c0553f', collar:'crew',
                    sleeve:'short', youth:1, headScale:1.10, wide:0.80, stoop:0 }
                : {}),
              tall: act === 'play' ? 0.78 : 0.90 + (seed % 13) * .017 },
      temper,
      // The same seat height the room gives the player — see `th.seat.seatY` in cabin.js. Taken from
      // there rather than measured off the cushion, because the number that matters is that your
      // hips and the hips of the person beside you are at the same height.
      seatY: 0.50, faceLock: true, rider: true, gone: false,
      seat: st, sitAct: act,
      // Facing -z, which is forward in this cabin: yaw 0 looks down +z, so the seats look down pi.
      spots: [{ h0: 0, h1: 24, at: [st.x, st.z], face: Math.PI, act }],
    };
    CABIN_ABOARD.push(n);
    addNPC(n);
  }
});

// Nobody may be sitting in the seat on your own boarding card. Which seat that is depends on the
// flight and on whether you asked for a window or an aisle, so it cannot be designed around at load
// time — every row in the cabin is reachable and so is every one of A, B and C. Instead, whoever is
// in it moves to a seat that is free, which with twenty-two aboard out of forty-two always exists.
function vacateSeat(id) {
  const sitter = CABIN_ABOARD.find(n => n.seat && n.seat.id === id);
  if (!sitter) return;
  const taken = new Set(CABIN_ABOARD.map(n => n.seat && n.seat.id));
  const free = Cabin.SEATS.find(s => s.id !== id && !taken.has(s.id));
  if (!free) { sitter.gone = true; return; }   // a full aeroplane: they simply are not aboard
  sitter.seat = free;
  sitter.spots[0].at = [free.x, free.z];
  sitter.x = free.x; sitter.z = free.z;
}

// ---------------------------------------------------------------- 乘客 the station's own traffic
// Six people in the subway station doing the thing the station is for, on a loop: down the steps,
// up to a ticket machine, buy a single, tap in at 进站, out onto the platform, wait at a door, and
// step aboard the train standing at it. Then the other half of the loop — back off the train, out
// through 出站 and away up the steps — so the concourse has traffic in both directions and nobody
// has to be created or destroyed to keep it going. A body appearing out of nothing in the middle of
// a room you are standing in is worse than an empty room.
//
// The route is a queue of waypoints, the same `errand` mechanism the waitress and the carriage
// riders use, because NPCs are integrated straight along their heading and never consult the
// collider: a straight line from the machines to the gate line goes through two turnstile
// cabinets, and one from the gates to a platform door goes through a column and then a bench.
// Every corner comes out of `Metro.WALK`, which is the station's own list of where a body may
// stand, so moving a machine or a screen door moves the people who use it.
//
// The gates are not faked. Tapping through calls the same `Metro.openGate` the player's own fare
// does, so the flaps really slide back, the arrow really goes green, and it makes the same two
// sounds — which means the gate line is doing something whether or not you are the one at it.
const COMMUTERS = [];
const STAGES = 7;
// Spacing, so the platform fills and empties by ones and twos rather than in batches on each train.
// Both are clock readings: when somebody last stepped off a train, and when somebody last set off to
// board one. Nobody may do either within a couple of minutes of the last person doing it.
let lastOffAt = -1e9, lastBoardAt = -1e9;

// ---- how full the station is, by the hour. A commuter line's day is not a single hump: it is
// busiest for about ninety minutes in the morning, busy again for rather longer in the evening,
// thin but steady between the two, and after eleven at night there is nobody on the platform but
// you. Written out as twenty-four numbers rather than fitted to a curve because the shape has
// features — the morning peak is sharper than the evening one and the afternoon has a small lift
// of its own — and none of that survives being turned into a sine.
const STATION_HOURS = [
  //   0     1     2     3     4     5     6     7     8     9    10    11
  0.00, 0.00, 0.00, 0.00, 0.00, 0.10, 0.40, 0.85, 1.00, 0.70, 0.42, 0.46,
  //  12    13    14    15    16    17    18    19    20    21    22    23
  0.54, 0.44, 0.36, 0.42, 0.64, 0.92, 1.00, 0.78, 0.52, 0.34, 0.18, 0.06,
];
// Interpolated, so the crowd does not step on the hour: walking in at 06:59 and again at 07:01
// should not be the difference between two people and five.
function stationBusy() {
  const h = minutes / 60, i = Math.floor(h) % 24;
  const a = STATION_HOURS[i], b = STATION_HOURS[(i + 1) % 24];
  return a + (b - a) * (h - Math.floor(h));
}
// How many of the pool belong in the room at this hour. At the overnight end this is zero, and an
// empty station at three in the morning is the point rather than a bug.
const stationCrowd = () => Math.round(stationBusy() * COMMUTERS.length);
// And how long the gaps are. Trains are minutes apart at the peaks and much further apart at night,
// so somebody who has just watched one go waits proportionally longer for the next.
const stationGap = () => 1 + (1 - stationBusy()) * 1.7;

// Nobody shares a machine, a lane, a doorway or a spot inside the car. There are three machines,
// two lanes each way, five doorways and four hidden spots for six people, and picking by index
// meant two of them stood inside each other at the same console, tapped the same gate at the same
// moment and queued on the same painted mark. Each place is now held by whoever is using it and
// let go when they walk away from it.
//
// `prefer` is where to start looking, for the cases where one place is the obvious one — the
// doorway nearest the part of the car you are standing in — so a claim degrades to the next
// nearest rather than to something at the far end of the platform.
//
// Returns null when everything is taken, and the caller has to have an answer for that. It used to
// double the last one up instead, on the grounds that two people close together was a smaller lie
// than somebody standing still for ever; it is not — three machines and six people meant two of
// them walked down the same line into the same console and stood inside each other for eight
// seconds, which is the whole of what this is here to stop.
function claimSpot(list, field, c, prefer) {
  const taken = new Set();
  for (const o of COMMUTERS) if (o !== c && o[field] != null) taken.add(o[field]);
  const from = prefer != null ? prefer : (c.seed + c.pick) % list.length;
  for (let i = 0; i < list.length; i++) {
    const k = (from + i) % list.length;
    if (!taken.has(k)) { c[field] = k; return list[k]; }
  }
  c[field] = null;
  return null;
}
const nearestIx = (list, x) => list.reduce(
  (best, p, i) => Math.abs(p.x - x) < Math.abs(list[best].x - x) ? i : best, 0);
// Everything let go at once: on arriving in the room, and on leaving it up the steps.
function dropSpots(c) { c.machIx = c.laneIx = c.doorIx = c.hideIx = c.outIx = null; }

// One leg of the loop. `c.stage` says which, and each returns a short list of waypoints that
// starts where the last one finished, so the whole circuit joins up.
function commuterLegs(c) {
  const W = Metro.WALK;
  const r = (a, b) => a + (c.seed % 97) / 97 * (b - a);   // their own steady share of a range
  const gate = W.gateZ;
  // Their own line up the stairwell, so two people on the flight at once are walking beside each
  // other rather than through each other. The well is 2.3 m wide and the panel that hides the top
  // of it is 2.2, so this much offset is still out of sight up there.
  const lane = ((c.seed % 3) - 1) * .42;
  // And their own line across the room. The concourse lane, the platform spine and the corridor
  // between them are shared by everybody, so on one exact line two people going opposite ways walk
  // straight through each other. Three tracks 28 cm apart put them shoulder to shoulder instead,
  // which is what a concourse looks like. The offsets are inside the clearances: the machines end
  // at z -4.44 and the cabinets start at -2.07, the columns end at z 1.25, and the widest track is
  // still 10 cm clear of them.
  const off = ((c.seed % 3) - 1) * .28;
  const hall = W.hall + off, spine = W.spine + off;
  // The two cross corridors get no offset. They are 2.2 m apart between the middle columns and an
  // offset track clips the granite base of one; they do not need it either, because the inbound
  // corridor is only ever walked inbound and the outbound one outbound, so there is no opposing
  // traffic on either to walk through.
  const cross = W.cross;
  switch (c.stage) {
    // ---- 进站. Down the flight from the street, then across to a machine to buy a ticket. They
    // come into the world at the head of the stairs, where the daylight panel hides them, and the
    // first thing seen of them is somebody coming down the steps.
    case 0: {
      const mach = claimSpot(W.mach, 'machIx', c);
      const legs = [
        { at: [W.stairTop.x + lane, W.stairTop.z], dwell: r(.3, 1.4), face: 0 },
        // Down the flight, and slower than the flat: stairs are where people are careful.
        { at: [W.stairFoot.x + lane, W.stairFoot.z], speed: 1.02 },
        // Out of the well into the concourse lane before turning for the machines. Going straight
        // from the foot of the steps to a machine is a diagonal, and that diagonal clips the front
        // corner of the machine bank on its way to the two further ones.
        { at: [W.stair.x, hall] },
      ];
      // All three machines busy, so this one is travelling on a 交通卡 and walks straight to the
      // gates — which is what most people in a real station do, and is the honest answer to there
      // being more passengers than consoles.
      if (mach) legs.push(
        { at: [mach.x, hall] },
        { at: [mach.x, mach.z], dwell: r(5.0, 9.5), face: Math.PI, act: 'buy' });
      return legs;
    }
    // ---- 进站. Out to the gate line, tap, and walk through the lane that opens.
    case 1: {
      const mach = c.machIx != null ? W.mach[c.machIx] : null;
      // A gate cannot be skipped the way a machine can, so when both inbound lanes are busy they
      // queue: one body-length back from the reader, taps from there, and walks through. That is a
      // queue at a turnstile, which is what a gate line looks like at eight in the morning.
      const free = claimSpot(W.inLane, 'laneIx', c);
      const inLane = free != null ? free : W.inLane[c.seed % W.inLane.length];
      const back = free != null ? 0 : .62;
      return [
        // Off the machine's line first, if they used one at all.
        ...(mach ? [{ at: [mach.x, hall] }] : []),
        // The machine is let go once they are clear of its column, not the moment they turn away
        // from the console: released a leg earlier, the next person claimed it and started down the
        // same line while this one was still walking up it, and the two went through each other.
        { at: [inLane, hall], done: () => { c.machIx = null; } },
        { at: [inLane, gate - W.tap - back], dwell: r(.7, 1.3), face: 0, act: 'wait',
          done: () => stationGate(true, inLane) },
        // Through the lane while it is open, which is the one place anybody hurries.
        { at: [inLane, gate + W.tap], speed: 1.46, done: () => { c.laneIx = null; } },
      ];
    }
    // ---- 候车. Onto the platform up the one corridor that misses the columns, the benches and the
    // litter bins, then along the far side of them to a door.
    case 2: {
      // Same again at the screen doors: five marks for six people, so the sixth stands behind
      // somebody rather than in them.
      const free = claimSpot(W.queue, 'doorIx', c);
      const door = free || W.queue[(c.seed + 1) % W.queue.length];
      const back = free ? 0 : .58;
      return [
        { at: [cross[0], gate + W.tap] },
        { at: [cross[0], spine] },
        { at: [door.x, spine] },
        // Arrive on the mark and settle, and no more than that. This used to hold them here for
        // six to fifteen minutes scaled by the hour — eleven to twenty-seven seconds of real time —
        // which was the right way to wait when there was no timetable to wait for. Now there is one,
        // and that dwell was the reason people stood at an open door doing nothing: while it ran
        // their errand was not empty, so they were not even a candidate to board, and whole trains
        // came and went in front of them. The waiting is the stage-3 hold's job now, and that one
        // knows whether there is a train.
        { at: [door.x, door.z - back], dwell: r(.4, 1.2), face: 0, act: 'wait' },
      ];
    }
    // ---- 上车. Through the screen door, over the gap, aboard, and then down the car and out of
    // the world. Standing in the doorway and stepping back out again is the one thing a passenger
    // never does; the point of boarding a train is that the train takes you away. So the last leg
    // walks them along the inside of the car to behind its flank, and `done` is where they leave.
    case 3: {
      const door = c.doorIx != null ? W.queue[c.doorIx]
                                    : W.queue[(c.seed + 1) % W.queue.length];
      const hide = claimSpot(W.hide, 'hideIx', c, nearestIx(W.hide, door.x))
                   || W.hide[nearestIx(W.hide, door.x)];
      return [
        { at: [door.x, W.board], speed: 1.50 },
        // Aboard, and the doorway is somebody else's to queue at again.
        { at: [door.x, W.carZ], dwell: r(.8, 1.8), face: Math.PI,
          done: () => { c.doorIx = null; } },
        // Down the car, at a shuffle. Nobody strides once they are aboard. The spot inside the car
        // stays held while they are away, so nobody else parks where they are standing.
        { at: [hide.x, W.carZ], speed: 1.00,
          done: () => { c.gone = true; c.byTrain = true; c.back = hide;
                        c.away = r(11.0, 24.0) * stationGap(); } },
      ];
    }
    // ---- 下车. Back in the world in the same hidden spot, on a later train, and off it through
    // the nearest doorway. What is seen of this is somebody stepping out of the car, which is what
    // a passenger arriving looks like.
    case 4: {
      const hide = c.hideIx != null ? W.hide[c.hideIx] : W.hide[c.seed % W.hide.length];
      // The doorway nearest the part of the car they are standing in, or the next nearest if
      // somebody is already queueing at it. Stepping off through a doorway somebody is waiting at
      // is fine — it is what the doorway is for — so this one may fall back to the nearest.
      const offDoor = claimSpot(W.queue, 'doorIx', c, nearestIx(W.queue, hide.x))
                      || W.queue[nearestIx(W.queue, hide.x)];
      return [
        { at: [hide.x, W.carZ], dwell: r(.5, 1.5), face: Math.PI },
        { at: [offDoor.x, W.carZ], speed: 1.00, done: () => { c.hideIx = null; } },
        { at: [offDoor.x, W.board], speed: 1.50 },
        { at: [offDoor.x, offDoor.z] },
        { at: [offDoor.x, spine], done: () => { c.doorIx = null; } },
      ];
    }
    // ---- 出站. Back down the same corridor and out through one of the outbound lanes.
    case 5: {
      const free = claimSpot(W.outLane, 'outIx', c);
      const outLane = free != null ? free : W.outLane[c.seed % W.outLane.length];
      const back = free != null ? 0 : .62;
      return [
        { at: [cross[1], spine] },
        { at: [cross[1], gate + W.tap + back] },
        { at: [outLane, gate + W.tap + back], dwell: r(.7, 1.3), face: Math.PI, act: 'wait',
          done: () => stationGate(false, outLane) },
        { at: [outLane, gate - W.tap], speed: 1.46 },
      ];
    }
    // ---- 出口. Across the concourse and away up the steps. Walking to the foot of the stairs and
    // then turning round and going back to buy another ticket is the same lie as boarding a train
    // and stepping off it again: the stairs are a way out of the room, so they go up them and out
    // of the world, and come back down as somebody else's journey.
    default: {
      const outLane = c.outIx != null ? W.outLane[c.outIx]
                                      : W.outLane[c.seed % W.outLane.length];
      // Their own line up the flight, and the spot at the top of it that they will come back down
      // from — the same one, so nobody reappears in the middle of somebody else.
      const top = { x: W.stairTop.x + lane, z: W.stairTop.z };
      return [
        { at: [outLane, hall], done: () => { c.outIx = null; } },
        { at: [W.stair.x, hall] },
        { at: [W.stairFoot.x + lane, W.stairFoot.z] },
        { at: [top.x, top.z], speed: .98,
          done: () => { c.gone = true; c.byTrain = false; c.back = top;
                        c.away = r(17.0, 38.0) * stationGap(); dropSpots(c); } },
      ];
    }
  }
}

// Hand out the next leg and move the counter on. A fresh machine and a fresh door every lap, so
// the same person does not wear a groove between one console and one doorway.
function commuterNext(c) {
  const legs = commuterLegs(c);
  c.stage = (c.stage + 1) % STAGES;
  if (c.stage === 0) c.pick++;
  return legs;
}

// Set the crowd to the hour, and spread whoever is staying around the loop. Called as the player
// walks in, because the clock can jump a long way between two visits — a shift at the office is
// eight hours — and without this you would come down the steps at two in the morning to find the
// four people who were here at eight still standing exactly where you left them, mid-stride.
// Nothing was on screen the frame before, so arriving is the one moment the room may rearrange.
function stationEnter() {
  if (!COMMUTERS.length || typeof Metro === 'undefined' || !Metro.WALK) return;
  const room = stationCrowd();
  // Stages 3 and 4 begin trackside — in a doorway and inside the car — so they are only available to
  // start on when there is a car there to be inside. Handing them out to somebody walking in at a
  // moment with no train berthed put them on the ballast, and the very next tick took them away on a
  // train that had already gone.
  const berthed = Metro.trainNow().phase === 'berthed';
  const startable = berthed ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 5, 6];
  COMMUTERS.forEach((c, i) => {
    if (i < room) {
      c.gone = false; c.riding = false;
      c.stage = startable[(i * 3 + 1) % startable.length];
      dropSpots(c);                        // nothing carried over from the last time you were here
      c.errand = commuterNext(c);
      const leg = c.errand[0];
      c.x = leg.at[0]; c.z = leg.at[1];
      c.yaw = leg.face || 0;
      c.lift = Metro.liftAt(c.x, c.z);
      return;
    }
    // The rest are out of the world, half of them up the steps and half aboard a train, so that
    // when the hour turns they come back from both directions rather than all out of the car.
    c.gone = true; c.riding = false;
    c.errand = null;
    dropSpots(c);
    c.byTrain = i % 2 === 0;
    c.back = c.byTrain ? Metro.WALK.hide[i % Metro.WALK.hide.length] : Metro.WALK.stairTop;
    c.away = 2 + Math.random() * 12;
  });
}

// Somebody else's fare, through the same gate the player's goes through.
function stationGate(inbound, lx) {
  if (place !== 'metro') return;
  TrainAudio.gate('tap');
  if (Metro.openGate(inbound, lx, performance.now() / 1000) !== null)
    TrainAudio.gate('flap');
}

Lazy.onBuild('Metro', () => {
  if (typeof Metro === 'undefined' || !Metro.WALK) return;
  // Started at different points around the loop, so the first second in the station already has
  // somebody at a machine, somebody at the gates, somebody waiting and somebody aboard, rather
  // than six people setting off from the stairs together.
  const WHO = [
    // Six people on a weekday concourse, and the point of them is that they are visibly six
    // different lives crossing the same room: an office, a shop, a building site, a lecture, a
    // errand, a shift that finished. Everybody is carrying something, because nobody on this
    // line is travelling empty-handed, and what they carry is as much of the read as the clothes.
    { hz: '乘客十', stage: 0, temper: 'brisk',
      look: { skin:'#dcae85', hair:'#241f1d', hairStyle:'short', top:'#ddd8c8', pants:'#2e343d',
              shoe:'#33373c', jacket:'#33415a', collar:'shirt', glasses:true, bag:'shoulder',
              bagColor:'#463b32', tall:1.02, wide:1.00, age:0.30 } },
    { hz: '乘客十一', stage: 1, temper: 'bustling',
      look: { skin:'#c9926a', hair:'#2a2320', hairStyle:'bun', top:'#e4dcc9', pants:'#39414c',
              shoe:'#e4ded0', sleeve:'short', collar:'vneck', vest:'#7d5567', bag:'tote',
              bagColor:'#8d6a44', tall:0.95, wide:0.92 } },
    // The one with the belly and the polo, who is on this train twice a day and has been for
    // twenty years. Nobody else in the station is this wide, and at concourse distance the
    // silhouette is the whole of what tells him apart.
    { hz: '乘客十二', stage: 2, temper: 'steady',
      look: { skin:'#bd8a5f', hair:'#1d1917', hairStyle:'buzz', top:'#5f6347', pants:'#333a44',
              shoe:'#cfc9bb', collar:'polo', sleeve:'half', beard:'stubble', bag:'shoulder',
              bagColor:'#3f4249', tall:1.03, wide:1.18, age:0.42 } },
    { hz: '乘客十三', stage: 3, temper: 'weary',
      look: { skin:'#d3a37c', hair:'#302925', hairStyle:'braid', top:'#4a6c5a', pants:'#2b3340',
              shoe:'#e9e2d5', collar:'hood', pack:true, packColor:'#3f6350',
              tall:0.94, wide:0.88, youth:0.45, headScale:1.03 } },
    // Off a site, on the last train of the shift. The hard hat is the whole costume and it is a
    // completely ordinary thing to see on this line at six in the evening.
    { hz: '乘客十四', stage: 4, temper: 'brash',
      look: { skin:'#a86e46', hair:'#1e1a18', hairStyle:'short', top:'#5d6470', pants:'#4a4638',
              shoe:'#4a4b46', collar:'crew', sleeve:'short', beard:'stubble',
              hat:'hard', hatColor:'#d8b23c', tall:1.07, wide:1.09, age:0.34 } },
    { hz: '乘客十五', stage: 5, temper: 'bored',
      look: { skin:'#cf9d74', hair:'#a8a49c', hairStyle:'short', top:'#dbd4c2', pants:'#333a44',
              shoe:'#3b4046', jacket:'#4e5340', collar:'shirt', beard:'moustache',
              beardColor:'#9c988f', hat:'flat', hatColor:'#3e4756', bag:'tote',
              bagColor:'#7d6a52', tall:0.95, wide:1.03, stoop:0.08 } },
  ];
  WHO.forEach((w, i) => {
    const n = {
      hz: w.hz, place: 'metro', look: w.look, temper: w.temper,
      // Strangers in a station do not turn round to look at you, and a body that yaws away from
      // the machine it is operating has its hands somewhere else. See `faceLock` in updateNPCs.
      faceLock: true, commuter: true,
      // A concourse pace. The player walks at 1.55 and these were at 0.88, which next to you read
      // as a crowd wading. Three speeds so a group crossing the room does not move as one object.
      stage: w.stage, pick: i, seed: 17 + i * 23, speed: 1.24 + (i % 3) * .07,
      // The fallback if the loop ever runs dry: stand at the foot of the steps. `spots[0].at` is
      // also what gives them their position at load, so it is overwritten below with the first
      // point of the leg they are starting on.
      spots: [{ h0: 0, h1: 24, at: [Metro.WALK.stair.x, Metro.WALK.stair.z], face: 0,
                act: 'wait' }],
    };
    n.errand = commuterNext(n);
    n.spots[0].at = n.errand[0].at.slice();
    COMMUTERS.push(n);
    addNPC(n);
  });
});

// The mall crowd has clear roles and routes. Staff stay anchored to their departments; shoppers
// circulate through the wide atrium so the room never feels like a showroom after closing.
NPCS.push(
  { hz:'导购员', name:'林晓雨', py:'Lín Xiǎoyǔ', place:'mall', rig:'mall-floor-guide-lin-xiaoyu', temper:'brisk',
    // Shop floor, not shopper: white shirt, house-maroon blazer, a dark skirt and a name badge,
    // and the silk neck-scarf every department store in this city puts on its 导购. She has one
    // spot for the whole trading day and never takes a stride, which is the only condition under
    // which anybody in this game may wear a skirt — see the diner guest in data.js for why.
    look:{skin:'#e4b38a',hair:'#211d1b',hairStyle:'bun',top:'#f2ece0',pants:'#2b3140',
      shoe:'#242a30',jacket:'#8e3b45',collar:'shirt',scarf:'#c8a24a',badge:'#efe9dc',
      skirt:'#2b3140',legs:'#3c4048',tall:.98,wide:.93,age:.12,faceSeed:7301},
    spots:[{h0:10,h1:22,at:[-14.35,-1.5],face:-Math.PI/2,act:'vend'}],
    lines:[['您好，需要帮您找尺码吗？','Hello — can I help you find a size?'],
           ['试衣间在里面，左手边。','The fitting rooms are inside, on the left.'],
           ['今天外套打八折。','Coats are twenty percent off today.']] },
  { hz:'保安', name:'赵师傅', py:'Zhào shīfu', place:'mall', rig:'mall-security-zhao-shifu', temper:'watchful',
    // 保安 is the one figure in the mall who has to be legible from the far end of the atrium:
    // near-black navy from cap to shoe, a pale shirt showing at the collar, a brass badge, and a
    // build to go with the job. Nothing else in the building is this dark, so he separates from
    // the shoppers at any distance the room can put between you.
    look:{skin:'#c08a5e',hair:'#25211f',hairStyle:'buzz',top:'#c9d6de',pants:'#212a36',
      shoe:'#1b2026',jacket:'#293a4e',collar:'shirt',badge:'#c9a94e',beard:'stubble',
      hat:'cap',hatColor:'#1e2b3a',tall:1.05,wide:1.15,age:.36,faceSeed:7302},
    mallAfterHours:'security',
    patrol:[[-12.5,-8.5],[-12.5,2.0],[-12.0,7.6],[-3.0,8.2],[4.0,8.2],[12.5,7.0],[12.5,-2.0],
            [12.0,-9.5],[4.0,-10.6],[-4.0,-10.6],[-12.5,-8.5]],speed:1.02,
    lines:[['请看好自己的东西。','Please keep an eye on your belongings.'],
           ['电影院在三楼，坐两次扶梯。','The cinema is on level three — two escalators up.'],
           ['商场晚上十点关门。','The mall closes at ten in the evening.']] },
  // The overnight cleaner reuses the hotel's existing housekeeping identity asset, and is never
  // simultaneous with that room. The busiest mall profile therefore gains no peak rig; at 02:00
  // she and the existing guard are the only public workers, on opposite loops with real tools.
  { hz:'保洁员', name:'王敏', py:'Wáng Mǐn', place:'mall',
    rig:'hotelb1-housekeeping-wang-min',temper:'brisk',mallAfterHours:'cleaner',held:'broom',
    look:{skin:'#d7a57d',hair:'#29221e',hairStyle:'bun',top:'#dbe2d9',pants:'#33423e',
      shoe:'#252b2a',apron:'#607b70',collar:'shirt',badge:'#e9e4d8',tall:.96,wide:.94,faceSeed:7318},
    hours:[0,7],patrol:[[-8.0,-5.2],[-3.0,-5.2],[3.0,-5.2],[8.0,-5.2],[8.0,2.2],
      [3.0,2.2],[-3.0,2.2],[-8.0,2.2],[-8.0,-5.2]],speed:.86 },
  { hz:'收银员', name:'周可欣', py:'Zhōu Kěxīn', place:'mall', rig:'mall-food-cashier-zhou-kexin', temper:'genial',
    // Food court, so the uniform is service rather than retail: polo, apron, visor, badge. The
    // teal is the one saturated colour on her and it is on three pieces at once, which is what
    // makes a uniform read as one — a shopper wearing teal wears it on exactly one garment.
    look:{skin:'#efc29c',hair:'#30231f',hairStyle:'ponytail',top:'#efe7d6',pants:'#3c4148',
      shoe:'#2f3338',collar:'polo',sleeve:'half',apron:'#356054',badge:'#efe9dc',
      hat:'visor',hatColor:'#2f5d54',tall:.96,wide:.92,age:.10,faceSeed:7303},
    mallFloor:3,
    spots:[{h0:10,h1:22,at:[14.55,-2.4],face:Math.PI/2,act:'vend'}],
    lines:[['请问堂食还是带走？','Eating here or taking it away?'],
           ['一共三十二块，请扫码。','Thirty-two kuai altogether; please scan to pay.'],
           ['靠栏杆那边还有空位。','There are still seats over by the railing.']] },
  // Three floors want a crowd on all three of them: the concourse ring, the gallery ring above it
  // and the food court above that. Each route is a lap of its own level, so wherever you stand in
  // the atrium there is somebody walking on a deck you have not been to yet.
  //
  // And they are cast as a public rather than as a set of colour swaps. Every one of these
  // shoppers used to be within nine centimetres of every other, all between twenty and forty, all
  // clean-shaven, all in short hair or a ponytail — the differences were entirely in the hex codes,
  // which is the one axis a moving figure at fifteen metres cannot show you. So the spread is in
  // the silhouette now: 1.11 down to 0.88 in `wide`, a teenager and a man in his seventies, two
  // heads of grey, three beards, a flat cap and a beanie, and a bag on most of them because this
  // is a shopping centre. The palette rule underneath all of it is one strong colour per person —
  // the rust tee, the maroon coat, the plum vest — over navy, olive, cream and grey.
  { hz:'顾客', place:'mall', temper:'bustling', look:{skin:'#e2b489',hair:'#191512',hairStyle:'ponytail',top:'#b8624a',pants:'#3f4a5c',shoe:'#ece6da',collar:'crew',sleeve:'short',bag:'tote',bagColor:'#cfa95c',tall:1.00,wide:.92,faceSeed:5101}, patrol:[[-13.0,-9.0],[-13.4,0],[-13.0,6.5],[-4.0,7.6],[3.5,7.4],[13.0,6.0],[13.4,-2.0],[13.0,-9.4],[3.0,-11.0],[-4.0,-11.0],[-13.0,-9.0]],speed:1.10 },
  { hz:'顾客', place:'mall', temper:'bored', look:{skin:'#bd8a5f',hair:'#2b2420',hairStyle:'short',top:'#5f6347',pants:'#333941',shoe:'#c6c0b4',collar:'polo',sleeve:'half',beard:'stubble',bag:'shoulder',bagColor:'#493f35',tall:1.03,wide:1.19,age:.38,faceSeed:5102}, patrol:[[6.5,-11.0],[13.0,-8.0],[13.0,0],[12.0,6.0],[6.0,7.6],[-2.0,7.2],[-2.0,0],[-6.5,-2.0],[-6.5,-9.5],[6.5,-11.0]],speed:.92 },
  { hz:'顾客', place:'mall', temper:'steady', look:{skin:'#c99269',hair:'#b5b1a8',hairStyle:'short',top:'#ddd6c4',pants:'#333e4a',shoe:'#3b4045',jacket:'#5b6045',collar:'shirt',beard:'moustache',beardColor:'#a8a49b',hat:'flat',hatColor:'#4e5340',tall:.99,wide:1.07,stoop:.13}, patrol:[[-13.2,4.0],[-13.2,-6.0],[-9.5,-9.6],[-1.0,-10.6],[4.0,-9.0],[4.0,-1.0],[2.0,6.0],[-6.0,7.0],[-13.2,4.0]],speed:.98 },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'brisk', look:{skin:'#e6b68c',hair:'#211b19',hairStyle:'bob',top:'#e2dac6',pants:'#3f4d60',shoe:'#2f3439',jacket:'#7c3f47',collar:'turtle',bag:'tote',bagColor:'#8d6a44',tall:.94,wide:.92,youth:.48,headScale:1.03,faceSeed:5104}, patrol:[[-11.5,-9.5],[-11.5,0],[-11.5,9.5],[-2.0,10.4],[8.0,10.2],[11.5,8.0],[11.5,0],[11.5,-9.0],[2.5,-10.2],[-11.5,-9.5]],speed:1.08 },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'patient', look:{skin:'#d09b72',hair:'#332b26',hairStyle:'short',top:'#dcd7c8',pants:'#2f3540',shoe:'#252a2e',jacket:'#33415a',collar:'shirt',glasses:true,bag:'shoulder',bagColor:'#4a3f36',tall:.98,wide:.96,youth:.42,headScale:1.02,faceSeed:5105}, patrol:[[-9.0,-1.0],[-2.0,-1.0],[2.0,-1.0],[9.0,-1.0],[11.0,-6.0],[11.0,4.0],[2.0,1.2],[-2.0,1.2],[-9.0,1.0],[-11.0,-4.0],[-9.0,-1.0]],speed:.88 },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bored', look:{skin:'#edbc94',hair:'#211b18',hairStyle:'tousled',top:'#4f6b7d',pants:'#41485a',shoe:'#eee6d9',collar:'hood',pack:true,packColor:'#8a4550',tall:.92,wide:.86,youth:.55,headScale:1.04,faceSeed:5106}, patrol:[[11.8,4.0],[9.0,10.0],[-2.0,10.0],[-11.8,9.0],[-11.8,-2.0],[-9.0,-10.0],[2.5,-10.2],[11.8,-6.0],[11.8,4.0]],speed:.96 },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'patient', look:{skin:'#cfa079',hair:'#9a958d',hairStyle:'perm',top:'#ded6c4',pants:'#40474f',shoe:'#2b3034',vest:'#7d5567',sleeve:'half',bag:'tote',bagColor:'#8c6a4a',tall:.93,wide:1.05,stoop:.06}, patrol:[[13.2,-8.0],[13.2,-3.0],[13.2,3.0],[13.2,7.5],[7.0,10.0],[-4.0,10.0],[-12.6,8.0],[-12.6,-2.0],[-12.6,-9.5],[-2.0,-9.0],[7.0,-9.5],[13.2,-8.0]],speed:.94 },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bustling', look:{skin:'#b0784f',hair:'#1c1815',hairStyle:'tousled',top:'#b5643f',pants:'#37404b',shoe:'#e6dfd2',collar:'crew',sleeve:'short',tall:1.11,wide:.88,faceSeed:5108}, patrol:[[-12.6,2.0],[-6.0,-1.0],[2.0,-1.0],[8.5,-2.5],[8.5,5.0],[2.0,1.4],[-6.0,1.4],[-12.6,2.0]],speed:1.05 },
  { hz:'小孩', place:'mall', temper:'eager', look:{skin:'#efc39a',hair:'#2a211d',hairStyle:'tousled',top:'#e2ad3c',pants:'#54739a',shoe:'#e55243',collar:'crew',sleeve:'short',pack:true,packColor:'#c0553f',tall:.68,wide:.80,youth:1,headScale:1.10,faceSeed:7307}, patrol:[[-11.8,9.9],[-8.2,6.6],[-4.8,9.9],[-8.2,12.6],[-11.8,9.9]],speed:1.30 },
  // Everybody above is walking, and a mall where nobody has stopped moving reads as an evacuation.
  // These are the ones sitting down. Every `at` is on a real bench pan — `bench()` builds a seat
  // 1.60 long and 0.62 deep centred on its x,z with the top of the pan at 0.59, so a sitter goes
  // 0.42 either side of centre along the bench's length and `seatY` is the pan top. .sitcheck.js is
  // what proves that rather than a screenshot from one angle.
  //
  // The facing follows the bench: `bench()` now takes a flip, and the rule both bench loops use is
  // "face the middle", so the ones with the flipped back look along +x or +z and the rest look back
  // along -x or -z. Getting this wrong seats somebody staring into a backrest.
  //
  // None of them is given a name or a line. An NPC that speaks needs its audio baked (.speechcheck),
  // and a bench of anonymous shoppers is what a mall actually has on it anyway.
  { hz:'顾客', place:'mall', temper:'patient', seatY:.59, look:{skin:'#d6a37b',hair:'#b5b1a8',hairStyle:'short',top:'#6b7350',pants:'#3b434d',shoe:'#2a2f33',collar:'polo',sleeve:'half',beard:'goatee',beardColor:'#aaa69d',bag:'tote',bagColor:'#b9884d',tall:.94,wide:1.09,age:.74,stoop:.09,faceSeed:5109}, spots:[{h0:10,h1:22,at:[-3.42,-12.6],face:0,act:'sit'}] },
  { hz:'顾客', place:'mall', temper:'bored', seatY:.59, look:{skin:'#e8ba90',hair:'#aaa69d',hairStyle:'bun',top:'#e6dfcd',pants:'#454b56',shoe:'#ebe4d7',collar:'crew',sleeve:'short',skirt:'#7a3f4c',legs:'#3d434c',tall:.91,wide:.94,age:.68,stoop:.06,faceSeed:5110}, spots:[{h0:10,h1:22,at:[-2.58,-12.6],face:0,act:'phone'}] },
  { hz:'顾客', place:'mall', temper:'steady', seatY:.59, look:{skin:'#c89468',hair:'#a8a49c',hairStyle:'short',top:'#dbd4c2',pants:'#333a42',shoe:'#3a3f45',jacket:'#4a5364',collar:'shirt',glasses:true,beard:'stubble',beardColor:'#9c988f',tall:1.01,wide:1.04,stoop:.09}, spots:[{h0:10,h1:22,at:[10.6,-2.42],face:-Math.PI*.5,act:'read'}] },
  // Watching the carousel from the bench nearest it, which is what the adult with the child does.
  { hz:'顾客', place:'mall', temper:'genial', seatY:.59, look:{skin:'#dfb187',hair:'#2b2320',hairStyle:'bun',top:'#c2996a',pants:'#3e4854',shoe:'#2c3135',collar:'turtle',bag:'shoulder',bagColor:'#5a4a3c',tall:.99,age:.28,faceSeed:5112}, spots:[{h0:10,h1:22,at:[-2.62,10.0],face:Math.PI,act:'sit'}] },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'frail', seatY:.59, look:{skin:'#cba079',hair:'#c4c0b8',hairStyle:'perm',top:'#ddd5c3',pants:'#3d444c',shoe:'#2b3034',jacket:'#4a5a63',collar:'turtle',tall:.88,wide:1.00,stoop:.17}, spots:[{h0:10,h1:22,at:[-9.2,-5.42],face:Math.PI*.5,act:'sit'}] },
  // Level three's benches face the west glazing rather than the void, so this one is looking out.
  { hz:'顾客', place:'mall', mallFloor:3, temper:'patient', seatY:.59, look:{skin:'#e3b58b',hair:'#2b2320',hairStyle:'ponytail',top:'#8f9d8a',pants:'#414954',shoe:'#e9e2d5',collar:'crew',sleeve:'short',glasses:true,pack:true,packColor:'#3f6350',tall:.96,wide:.89,youth:.35,faceSeed:5114}, spots:[{h0:10,h1:22,at:[-21.5,-5.22],face:-Math.PI*.5,act:'read'}] },
  // Three more on the move, filling the routes the existing laps leave thin: the west shopfronts on
  // the ground floor, the east gallery on two, and the run past the cinema on three.
  { hz:'顾客', place:'mall', temper:'brisk', look:{skin:'#a86e46',hair:'#1f1a17',hairStyle:'braid',top:'#e4dcc9',pants:'#3a4552',shoe:'#ded7c9',vest:'#7d5567',sleeve:'short',bag:'tote',bagColor:'#c4a05c',tall:.96,wide:.94,faceSeed:5115}, patrol:[[-18.0,-9.0],[-18.0,-2.0],[-18.0,6.0],[-13.0,10.0],[-6.0,11.0],[-13.0,8.0],[-18.0,2.0],[-18.0,-9.0]],speed:1.02 },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bustling', look:{skin:'#c4906a',hair:'#2f2723',hairStyle:'buzz',top:'#4d6470',pants:'#363d45',shoe:'#282d31',collar:'polo',sleeve:'half',beard:'stubble',bag:'shoulder',bagColor:'#3f4249',tall:1.10,wide:1.01,faceSeed:5116}, patrol:[[18.0,-8.0],[18.0,0],[18.0,8.0],[12.0,10.4],[4.0,10.4],[12.0,7.0],[18.0,-2.0],[18.0,-8.0]],speed:1.12 },
  { hz:'顾客', place:'mall', mallFloor:3, temper:'bored', look:{skin:'#eec097',hair:'#262019',hairStyle:'short',top:'#ddd6c4',pants:'#4a4b55',shoe:'#eae3d6',jacket:'#a8613a',collar:'hood',hat:'beanie',hatColor:'#3b4450',tall:.94,wide:.90,youth:.30,faceSeed:5117}, patrol:[[-12.0,6.0],[-6.0,7.6],[0,7.6],[6.0,6.0],[6.0,-2.0],[0,-3.0],[-6.0,-2.0],[-12.0,0],[-12.0,6.0]],speed:.90 },
  // A second child, on the level-three gallery, because one child in a whole shopping centre reads
  // as an oversight rather than as a quiet Tuesday.
  { hz:'小孩', place:'mall', mallFloor:3, temper:'eager', look:{skin:'#c99269',hair:'#302722',hairStyle:'short',top:'#4f7d8f',pants:'#3f4a5c',shoe:'#e8c14a',collar:'crew',sleeve:'short',hat:'cap',hatColor:'#c0553f',tall:.71,wide:.82,youth:1,headScale:1.09,faceSeed:4412}, patrol:[[-10.0,-6.0],[-4.0,-7.0],[2.0,-6.0],[-4.0,-4.6],[-10.0,-6.0]],speed:1.24 }
);

// ---- the food court, seated. Twenty-odd tables and eighty chairs, and until now not one person
// eating at any of them: the hall read as a showroom because a showroom is exactly what an empty
// dining room is. These are generated rather than written out, off the chair list the mall records
// as it builds the tables, so a diner is always on a chair that exists — rearranging the layout
// moves the diners with it and cannot strand anybody in mid-air.
//
// Not every chair, and not a straight run of them: about a third, picked by a stride that skips a
// varying number so the occupied tables come in ones and twos with empty tables between, which is
// what a food court looks like at any hour that is not exactly noon.
Lazy.onBuild('Mall', () => {
  // Stall chefs are authored while the lazy Mall module is being built, after the static roster
  // has already been folded. Register them at the same on-build boundary as the diners.
  for (const n of Mall.foodStaff || []) addNPC(n);
  if (!Mall.foodSeats || !Mall.foodSeats.length) return;
  // The wardrobe these are dealt from. Every list is a different length and every one of them is
  // read with a different stride, because the previous version indexed all four by `k` alone with
  // lengths 8, 12, 6 and 5 — and 8 and 12 share a factor of 4, so the skin and the top came back
  // round together every twenty-four people and diner 3 and diner 15 were the same person in the
  // same shirt two tables apart. Coprime lengths read with coprime strides means no pair of these
  // twenty-two shares more than one attribute.
  const SKINS = ['#dbaa83','#e0af84','#c99269','#e6b68c','#d09b72','#edbc94','#dcae86','#c99a70',
                 '#bd8a5f','#b0784f','#a86e46'];                                        // 11
  const TOPS  = ['#b8624a','#4f6b7d','#8b765f','#d8c7b0','#5f6347','#7189a0','#8a9fb0','#b5643f',
                 '#4f7d68','#7d5567','#33415a','#c2996a','#e4dcc9'];                    // 13
  // One grey at the end of the list, so about one diner in seven is old — and because `initNPC`
  // reads the age of a face off how much colour is left in the hair, that is all it takes.
  const HAIRS = ['#191512','#1e1a18','#302622','#211b19','#36312e','#3a2e24','#9a958d'];// 7
  // Two pools rather than one, so the hair and the beard agree about the same person. A ponytail
  // with a full beard under it is the one thing worse than twenty-two identical diners.
  const MSTYLE = ['short','buzz','tousled','short','short'];                            // 5
  const FSTYLE = ['ponytail','bob','bun','braid','perm','bob'];                         // 6
  const BEARDS = [null,'stubble',null,'goatee',null,null,'moustache',null,'full'];      // 9
  const COLL  = ['crew','shirt','polo','vneck','turtle','crew','hood'];                 // 7
  const SLV   = ['long','short','half','long','short'];                                 // 5
  // Mostly nothing: a food court at lunch is shirtsleeves. Three in eleven, so six of the
  // twenty-two kept a coat on, and those six read as having just come in from outside — which is
  // the whole point of them being there.
  const OUTER = [null,'#4a5364',null,null,'#5b6045',null,null,'#7c3f47',null,null,null];// 11
  // Only the food court's own chairs. `table()` is the shared round-table builder and the café, the
  // dessert shop and the restaurant all call it too, so the raw list spans three floors — seating
  // these diners off it unfiltered put eleven of them on ground-floor café chairs while standing on
  // level three, eight metres up, which is what .sitcheck.js reported as "no seat, nearest 2.99 m".
  const deck3 = Mall.deckY(3);
  const seats = Mall.foodSeats.filter(s => s.tag === '美食广场' && Math.abs(s.y0 - deck3) < .01);
  let k = 0;
  for (let i = 0; i < seats.length && k < 22; i += 2 + (i % 3)) {
    const s = seats[i];
    // Which of the two wardrobes this one is dealt from, and how old they are. Both are decided
    // here rather than inside the look because two or three fields have to agree about them: the
    // hair and the beard, the build and the stoop. Deterministic in `k`, so the same chair holds
    // the same diner on every reload.
    const man = (k * 3 + 1) % 5 < 3;
    const hair = HAIRS[(k * 3) % HAIRS.length];
    const old = hair === '#9a958d';
    // `eat` is a seated pose, so these are sitting down with something in front of them. The face
    // comes off the chair, which is already turned in towards its own table.
    addNPC({ hz:'顾客', place:'mall', mallFloor:3, seatY:.50,
      mallFoodDiner:k, mallFoodQueueSlot:k<5?k:undefined,
      temper: ['patient','genial','steady','bored'][k % 4],
      look: { skin:SKINS[(k * 5) % SKINS.length], hair,
              hairStyle: man ? MSTYLE[(k * 2) % MSTYLE.length] : FSTYLE[(k * 5) % FSTYLE.length],
              beard: man && !old ? BEARDS[(k * 4) % BEARDS.length] : null,
              top:TOPS[(k * 7) % TOPS.length],
              collar:COLL[(k * 5) % COLL.length], sleeve:SLV[(k * 3) % SLV.length],
              jacket:OUTER[(k * 4) % OUTER.length],
              glasses:(k * 5) % 7 === 2,
              pants:['#3a4149','#40474f','#333e4a','#454b56','#2f3540'][k % 5],
              shoe:['#2b3034','#e9e2d5','#262b2e','#3a3f45'][k % 4],
              // A metre and a half of spread across twenty-two people rather than fifteen
              // centimetres. `wide` is the one that carries it — a hall of people all the same
              // width reads as repeated however much their heights differ.
              tall: (man ? 1.00 : .93) + (k % 6) * .022,
              wide: man ? 1.00 + ((k * 7) % 9) * .026 : .88 + ((k * 5) % 8) * .022,
              stoop: old ? .10 : 0,
              faceSeed: 3100 + k * 37 },
      spots: [{ h0:10, h1:22, at:[+s.x.toFixed(3), +s.z.toFixed(3)], face:s.yaw, act:'eat' }] });
    k++;
  }
});

// Everything the player can be shown a word for, across every place that has been built.
//
// This used to be one loop over every room in the game, which is a loop that builds every room in
// the game. Now a place hands its things over at the moment it is constructed — see `adopt` — and
// until then it has nothing in here, because until then it does not exist. Everything that reads
// this list reads it per frame or per vocabulary change, and neither cares that it grows.
const allThings = [];

// a word can be attached to at most one object; used to show its sentence during review
const thingOf = {};

// People whose room has not been built yet. The roster is placed at load — everybody has to have
// a position before the first frame, wherever they are standing — but a person is also a thing you
// can walk up to and be taught a word by, and that half of them has to wait for the floor.
const pendingThings = {};
// Declared here rather than beside the labels because the roster runs first and asks.
let labelsReady = false;

// Rooms that have handed their things over. Not the same question as whether the room is *built*:
// a room's own crowd is generated during its build, from its own geometry, and asks to be filed
// while that build is still running. Answering "yes, it is standing, give it to me now" there put
// twenty-two aeroplane passengers into the things list ahead of the aeroplane's own seats and
// doors, and the walk-up prompt takes the first thing in reach — so at the gate the game offered
// a passenger where it used to offer the seat on your boarding card. Room first, then the people
// in it, which is the order it was in when everything was built at load.
const adopted = new Set();

// Realistic bodies are several megabytes each, so they arrive for the people who ask for them
// rather than joining the models that block the title screen. One promise per character asset
// also means two residents sharing an archetype never start two downloads. Until it finishes the
// ordinary procedural body remains visible, which makes a slow or offline connection a graceful
// visual downgrade instead of a missing person.
const rigLoads = new Map();
const rigRetryAt = new Map();
const rigQueue = [];
let activeRigLoads = 0;
const MAX_RIG_LOADS = 2;
let rigPlaceGeneration = 0;
let rigPinnedNames = new Set();
let rigFrame = 0, rigTrimAt = 0;

function refreshRigPins(placeName = place) {
  rigPinnedNames = new Set(NPCS.filter(n => n.rig && n.place === placeName).map(n => n.rig));
  if (typeof Assets !== 'undefined' && typeof Assets.pinRigs === 'function')
    Assets.pinRigs(rigPinnedNames);
  return rigPinnedNames;
}

// A place owns its cast. On a transition, queued work for the room behind the player is dropped
// immediately and active fetches are aborted/generation-guarded. The just-entered room is pinned
// before any trimming happens, so pressure can evict only identities that are genuinely offstage.
function syncRigResidency(placeName) {
  rigPlaceGeneration++;
  refreshRigPins(placeName);
  for (const [name, job] of rigLoads) {
    if (rigPinnedNames.has(name)) { job.generation=rigPlaceGeneration; continue; }
    job.cancelled = true;
    if (job.started && typeof Assets !== 'undefined' && typeof Assets.cancelRigLoad === 'function')
      Assets.cancelRigLoad(name);
    if (rigLoads.get(name) === job) rigLoads.delete(name);
  }
  // Ambient crowds deliberately share a compact location-owned palette.  Start those light LOD2
  // bodies at the doorway, before individual visibility asks for them, so a whole concourse does
  // not spend its first seconds as the old procedural cast.  The filter matters: catalog pools
  // describe what a room may use, while pins describe what its live population actually uses.
  if (typeof CastCatalog !== 'undefined' && typeof CastCatalog.ambientRigs === 'function') {
    const ambient = new Set(CastCatalog.ambientRigs(placeName).filter(name => rigPinnedNames.has(name)));
    [...ambient].forEach((name, index) => ensureRig(name, 2, 500 + index));
    // Named staff used to wait until the camera first found them. That made a procedural stranger
    // stand behind the counter for a beat and then change identity. Queue every other pinned body
    // at its light tier behind the ambient doorway set; visible/near requests still jump ahead by
    // lowering the existing job's priority, while the rest quietly become ready in the background.
    [...rigPinnedNames].filter(name => !ambient.has(name))
      .forEach((name, index) => ensureRig(name, 2, 800 + index));
  }
  if (typeof Assets !== 'undefined' && typeof Assets.trimRigs === 'function') Assets.trimRigs();
}

function pumpRigLoads() {
  rigQueue.sort((a, b) => a.priority - b.priority);
  while (activeRigLoads < MAX_RIG_LOADS && rigQueue.length) {
    const job = rigQueue.shift();
    if (!job || job.started || job.cancelled || job.generation !== rigPlaceGeneration ||
        !rigPinnedNames.has(job.name)) continue;
    job.started = true; activeRigLoads++;
    job.promise = Assets.loadRig(job.name).then(rig => {
      const stale = job.cancelled || job.generation !== rigPlaceGeneration ||
        !rigPinnedNames.has(job.name);
      if (stale) {
        // abort() can race the last decode microtask. If it did publish, reclaim it here; it was
        // never shown in this place and must not consume a resident slot.
        if (rig && typeof Assets.disposeRig === 'function') Assets.disposeRig(job.name);
        return null;
      }
      // Upload the tier that made this person enter the queue before revealing them.  A distant
      // crowd member therefore starts with the light mesh; walking closer uploads only the next
      // tier while every tier keeps the same skeleton and identity texture.
      if (rig && typeof R !== 'undefined' && R.skinning.ok) Assets.uploadRig(job.name, job.lod);
      if (!rig) rigRetryAt.set(job.name, performance.now() + 30000);
      return rig;
    }).finally(() => {
      activeRigLoads--;
      if (rigLoads.get(job.name) === job) rigLoads.delete(job.name);
      pumpRigLoads();
    });
  }
}
function ensureRig(name, lod = 2, priority = 999) {
  if (!name || typeof Assets === 'undefined' || Assets.rig(name) ||
      (rigRetryAt.get(name) || 0) > performance.now()) return;
  const existing = rigLoads.get(name);
  if (existing) {
    existing.lod = Math.min(existing.lod, lod);
    existing.priority = Math.min(existing.priority, priority);
    return;
  }
  const job = { name, lod, priority, generation:rigPlaceGeneration,
    started:false, cancelled:false, promise:null };
  rigLoads.set(name, job); rigQueue.push(job); pumpRigLoads();
}

// Before the labels exist — which is the whole of the roster's own setup — a person can only be
// filed. After a room has been adopted, it can take one straight away.
function queueThing(placeName, th) {
  const mod = PLACES[placeName];
  if (adopted.has(placeName)) { mod.things.push(th); adoptThing(placeName, th); }
  else (pendingThings[placeName] = pendingThings[placeName] || []).push(th);
}

// Give each one its body, its temperament, its starting position and a label of its own.
//
// A function rather than a loop body, because the roster stopped being a fixed list the moment the
// rooms stopped being built at load. The crowds that are generated off a room's own geometry — the
// commuters off the station's walk graph, the diners off the food court's chairs, the passengers
// off the seat map — cannot be placed until that room exists, and the room does not exist until
// somebody goes there. So they arrive late, one call each, through the same door the founding
// roster came through.
function npcStableSeed(value) {
  // FNV-1a gives a compact, repeatable animation/face seed from the same authored identity key
  // that casting uses. It is deliberately local rather than NPCS-index based: entering two lazy
  // rooms in the opposite order must not change somebody's face, mannerisms or walking phase.
  const s = String(value == null ? '' : value);
  let h = 0x811c9dc5;
  for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 0x01000193); }
  return 1 + (h >>> 0) % 99991;
}

// Three people already in the public mall roster carry the accessibility story.  They are not a
// second "special" crowd and they do not ask the cast catalog for another body: their ordinary
// identities, clothes, dialogue/social links and production rigs stay exactly the same.  Only the
// route and the piece of equipment travelling with them change.  The route begins on the broad
// entrance runner, follows the east concourse, and ends in the marked 1.2 m lift waiting field at
// (16.54, 14.20).  It then retraces itself, so the patrol wrap never cuts diagonally through the
// fountain, an escalator or a tenant.
//
// The three starts are rotated around the same closed route.  That matters at first load: putting
// all three at the entrance for one frame would be an accessibility scene that blocks its own
// doorway.  They deliberately share the surveyed centreline instead of inventing parallel offsets
// at the two fixture corners; normal crowd avoidance supplies separation when their laps meet.
const MALL_ACCESS_ROUTE=[
  [0,-15.55],[1.60,-11.95],[1.60,-11.55],[2.00,-11.55],[4.80,-9.15],
  [6.60,-5.90],[8.50,-2.50],[10.30,.80],[11.70,3.50],[13.20,6.45],
  [14.40,9.20],[15.50,11.80],[16.54,14.20],[15.50,11.80],[14.40,9.20],
  [13.20,6.45],[11.70,3.50],[10.30,.80],[8.50,-2.50],[6.60,-5.90],
  [4.80,-9.15],[2.00,-11.55],[1.60,-11.55],[1.60,-11.95],
];
const MALL_ACCESS_CAST={
  5101:{kind:'stroller', lane:0, start:0,  speed:.88, clearance:.45},
  5102:{kind:'wheelchair',lane:0, start:8,  speed:.76, clearance:.43},
  5112:{kind:'push-cart', lane:0, start:15, speed:.82, clearance:.45},
};
function configureMallAccessibleActor(n) {
  if(!n||n.place!=='mall'||(n.mallFloor||1)!==1||!n.look)return;
  const spec=MALL_ACCESS_CAST[n.look.faceSeed];
  if(!spec)return;
  // Keep the route builder lane-aware for a future wider corridor, but the surveyed mall path uses
  // the same zero-offset centreline at every equipment radius.
  const shifted=MALL_ACCESS_ROUTE.map((p,i)=>{
    const liftMix=Math.max(0,1-Math.abs(i-9)/3),lane=spec.lane*(1-liftMix*.72);
    return [+(p[0]+lane).toFixed(3),p[1]];
  });
  const k=spec.start%shifted.length;
  n.patrol=shifted.slice(k).concat(shifted.slice(0,k));
  n.hours=[10,22];
  n.speed*=spec.speed;
  n.mallAccessible={kind:spec.kind,route:'entrance-to-lift',reused:true,actorDelta:0,
    clearance:spec.clearance,start:spec.start,lane:spec.lane};
}
function mallAccessibleActive(n) {
  return !!(n&&n.mallAccessible&&!n.mallEventActive);
}
function mallClearanceRadius(n) {
  return n&&n.mallAccessible ? n.mallAccessible.clearance : .32;
}
let mallEventNext = 0;
function initNPC(n, i) {
  n.look = n.look || {};
  // Casting is location-owned, so resolve the location before asking the catalog. Everybody was
  // in the hutong until there were rooms to be in; that remains the fallback for old roster rows.
  n.place = n.place || 'street';
  // An animal has no face, no wardrobe and no age in its hair — everything `makeLook` derives is
  // about being a person, and none of it has an answer for a penguin. `makeAnimal` is the same
  // idea one table smaller: the species out of `ANIMALS`, plus whatever this individual overrides,
  // resolved once here rather than at sixty frames a second.
  if (n.animal) {
    // Animals need their identity seed before the species look is resolved. `makeAnimal` keeps
    // that seed on the finished measurements and `animalPose` uses it to offset breathing,
    // looking, tails and ear flicks. Resolving the look first used makeAnimal's fallback `7` for
    // every animal in the zoo; all sixteen bodies then twitched on the same frame, which read as
    // the whole enclosure shaking rather than as separate living animals.
    const animalKey = n.npcId || n.id || n.name || n.hz || i;
    const identity = `${n.place}|${n.animal}|${animalKey}`;
    if (n.seed === undefined) n.seed = npcStableSeed(identity);
    n.look = makeAnimal(n.animal, { ...(n.look || {}), seed:n.seed });
  }
  // A face of their own. Until the rig could hold more than one head, every person in this game
  // was drawn with the same skull, the same eyes and the same mouth in different clothes — sixty
  // commuters, the grandmother on her stool and the mechanic included — and at conversational
  // range that is the most artificial thing in the project. A roster entry that names its own
  // `faceSeed`, or a `face` table, keeps it; everybody else gets one from their authored local
  // identity. A global roster index is not stable once lazy rooms can be built in either order.
  // Deriving it before assignment also means the catalog sees the same person on every route.
  if (!n.animal && n.look.faceSeed === undefined && !n.look.face) {
    const identity = typeof CastCatalog !== 'undefined' && CastCatalog.key
      ? CastCatalog.key(n) : `${n.place}|${n.npcId || n.id || n.name || n.hz || ''}|${i}`;
    n.look.faceSeed = npcStableSeed(identity);
  }
  // And an age on the face, read off the two things the roster has always said about it: how much
  // colour is left in the hair, and how far the back has gone. Neither of those reached the face
  // until there was a face to put them on — a woman of eighty on her stool by the gate had the
  // skin of a student — and both are already written down, so nobody has to be aged by hand.
  if (!n.animal && n.look.age === undefined) {
    const hex = String(n.look.hair || '#000000');
    const ch = k => (parseInt(hex.slice(k, k + 2), 16) || 0) / 255;
    const r = ch(1), g = ch(3), b = ch(5);
    const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
    // Bright and with almost no colour left in it, which is what grey hair is. The same test
    // speech.js uses to decide whether somebody sounds old, kept in the same shape on purpose.
    const grey = hi > 0.45 && (hi - lo) / Math.max(1e-6, hi) < 0.22
      ? Math.min(1, (hi - 0.45) * 2.4) : 0;
    n.look.age = +Math.min(1, grey * 0.8 + (n.look.stoop || 0) * 2.6).toFixed(2);
  }
  // Every live human gets a production Chinese/East Asian body, including crowds created while a
  // lazy room is being built. Explicit authored identities are only noted; anonymous shoppers,
  // commuters, diners and passengers receive a stable cast key and reuse a compact local pool.
  // The key stays with the person while LOD changes only mesh density, never their identity.
  if (!n.animal && typeof CastCatalog !== 'undefined') {
    // A few later expansion rows named a future rig that was never built. Treating the string as
    // an authored identity leaves those people forever on the procedural fallback, because the
    // loader can never satisfy it. Preserve the requested name for diagnostics, then cast the row
    // from the real 82-rig production set just like any other ambient person.
    const explicit = n.rig && (!CastCatalog.has || CastCatalog.has(n.rig));
    if (n.rig && !explicit) { n.unavailableRig = n.rig; n.rig = null; }
    const cast = explicit ? CastCatalog.note(n) : CastCatalog.assign(n);
    if (cast) {
      n.rig = cast.rig;
      n.castKey = cast.castKey;
      n.rigShared = !!cast.tint;
      n.rigTint = !!cast.tint;
    }
  }
  if (!n.animal) n.look = makeLook({ ...n.look, name:n.name, hz:n.hz, job:n.job });
  // A roster entry names its temperament as a string; resolve it once here rather than looking
  // it up per frame. Anybody not given one gets 'steady', which is the neutral middle of the
  // table and reproduces roughly how the whole cast behaved before there were temperaments.
  n.temper = TEMPERAMENT[n.temper] || TEMPERAMENT.steady;
  // Pace belongs to the person, so it multiplies whatever the roster asked for. An entry that
  // sets its own speed for a *staging* reason — a courier who has to arrive before the food
  // goes cold, a concourse crowd tuned against the player's 1.55 — keeps that as its base.
  n.speed = (n.speed || 0.95) * n.temper.pace;
  // Some generated commuters and passengers already carry a deterministic local seed. Preserve
  // it; everyone else derives one from the cast key/face instead of whichever room built first.
  if (n.seed === undefined)
    n.seed = npcStableSeed(n.castKey || `face-${n.look.faceSeed}`);
  configureMallAccessibleActor(n);
  // Six existing ground-floor shoppers double as the atrium programme cast.  The assignment is
  // roster-stable and happens once, so an event changes where those bodies are going rather than
  // adding six more rigs to the mall's already-expensive peak crowd.  Tenant staff are excluded:
  // a shop does not lose its cashier because a fashion show started outside.
  if (!n.animal && n.place === 'mall' && (n.mallFloor || 1) === 1 &&
      (n.hz === '顾客' || n.hz === '小孩') && !n.lines &&
      (n.patrol||n.look.faceSeed===5112) && mallEventNext < 6)
    n.mallEventSlot = mallEventNext++;
  if (n.place === 'mall' && (n.hz === '顾客' || n.hz === '小孩')) {
    n.mallCrowdSlot = ((n.seed >>> 0) % 1009) / 1009;
    // The founding public roster owns the concourse routes; tenant casts are marked immediately
    // before they join NPCS.  This distinction lets purchases enrich the existing public crowd
    // without putting an extra carried object into every staffed unit and blowing the rig budget.
    n.mallPublicCustomer=!n.mallTenantCast;
  }
  n.avoidId = npcStableSeed(n.castKey || `${n.place}|face-${n.look.faceSeed}`);
  // A named resident's home key points at geometry authored by street.js. At load time, put
  // somebody who is off duty just through their own threshold; when their day begins they will
  // walk back out through it. Everyone else keeps the old schedule-only starting position.
  if (n.home) n.home = Street.homes[n.home];
  const routineStart = n.patrol ? n.patrol[0] : n.spots[0].at;
  const away = n.home ? homeTimeOut(n.home) : true;
  const start = n.home && !away ? n.home.inside : routineStart;
  n.x = start[0]; n.z = start[1]; n.yaw = n.spots ? (n.spots[0].face || 0) : 0;
  n.phase = n.seed * 1.7; n.ground = 0; n.turn = 0; n.wait = 0; n.leg = 0; n.met = 0;
  n.animGround = 0; n.animAccel = 0; n.animClimb = 0;
  n.animAct = null; n.animActMix = 0; n.animActSince = 0;
  n.pose = null;                     // built on the first frame, once POSE exists
  n.homeAway = away;
  n.homePhase = n.home ? (away ? 'out' : 'inside') : null;
  if (n.dinerGuest) {
    n.dinerActive = dinerGuestActive(n);
    n.dinerFlow = n.dinerActive ? 'seated' : 'gone';
    if (!n.dinerActive) {
      n.x = Diner.ENTRY_OUT[0]; n.z = Diner.ENTRY_OUT[1];
    }
  }
  n.homeDay = day;
  // Only the ones with something to say get a label and a place in the word list. The rest
  // still need a `th` because the update loop keeps their position in it, but with a negative
  // reach nothing will ever select them.
  n.th = {
    hz: n.hz, tag: n.hz, npc: n.lines ? n : null,
    pos: [n.x, n.animal ? n.look.tall * .90 : 1.62 * (n.look.tall || 1), n.z],
    focus: [n.x, n.z],
    reach: n.lines ? 1.9 : -1,
    sentence: n.lines ? n.lines[0][0] : '', tr: n.lines ? n.lines[0][1] : '',
    note: n.lines ? `${n.name} · ${n.py}. Stand near and press Q to talk.` : '',
    // A person standing on the mall's third floor is not someone you can talk to from the
    // concourse below, however close the two of you look from directly underneath.
    mallFloor: n.place === 'mall' ? (n.mallFloor || 1) : undefined,
  };
  if (n.lines) queueThing(n.place, n.th);
}

// The shops' own people, before the roster is initialised so they are indistinguishable from
// anyone written here. `MallCast` is declared in js/mall.js and filled by the eighteen tenant
// files, which all load before this one — see the comment there for why they do not simply push
// onto NPCS: eighteen authors editing one call in this file is how you break the whole game
// while improving one shop.
if (typeof MallCast !== 'undefined') for (const n of MallCast) {
  n.mallTenantCast=true;NPCS.push(n);
}
// The same fold for the street's nine districts, and it is the same reasoning generalised.
//
// `addNPC` and `initNPC` are private to this file's IIFE and are not on `window.__game`, so a
// district file physically cannot put a person on the street — it can build a breakfast stall
// with a griddle, a queue rail and a QR code, and not one customer. Rather than a second bespoke
// registry, a district hangs its people on `StreetFit['x'].cast` and this picks up all of them.
// Nothing changes for a district that has no cast.
if (typeof StreetFit !== 'undefined')
  for (const k in StreetFit) {
    const c = StreetFit[k] && StreetFit[k].cast;
    if (Array.isArray(c)) for (const n of c) NPCS.push(n);
  }
// And a plain `StreetCast`, because js/street-alley.js reached for the MallCast pattern by name
// before the per-district `.cast` hook existed. Both are honoured: a district may hang its people
// on either, and neither is worth breaking to make the other tidy.
if (typeof StreetCast !== 'undefined') for (const n of StreetCast) NPCS.push(n);
// And the third time, for the metro's fifteen zones — the same fold, for the same reason, and it
// is the only thing standing between the station and having any dialogue in it at all.
//
// A zone file can build the 服务中心 window, seat a 站务员 behind it and give her a face, and
// then find she cannot be spoken to: a conversation binds through `th.npc`, `initNPC` above only
// sets that from a roster row carrying `lines`, and `addNPC`/`initNPC` are private to this file's
// IIFE. So js/metro-service.js had a clerk with nowhere to register her. Both forms again — the
// per-zone `MetroFit[k].cast` and a plain `MetroCast` — because that is exactly the pair the
// street ended up needing and honouring both costs nothing.
if (typeof MetroFit !== 'undefined')
  for (const k in MetroFit) {
    const c = MetroFit[k] && MetroFit[k].cast;
    if (Array.isArray(c)) for (const n of c) NPCS.push(n);
  }
if (typeof MetroCast !== 'undefined') for (const n of MetroCast) NPCS.push(n);
// The hospital follows the same room-owned cast pattern as the mall and metro.  Its four floor
// files load before data.js/game.js and contribute a static roster without reaching into this
// file's private addNPC/initNPC functions.
if (typeof HospitalCast !== 'undefined') for (const n of HospitalCast) NPCS.push(n);
// The bank currently ships its hall before its recurring staff dialogue, but keeping the same
// room-owned roster hook makes teller/guard additions safe and costs nothing while it is empty.
if (typeof BankCast !== 'undefined') for (const n of BankCast) NPCS.push(n);
// Hotel floor modules own their staff and guests in the same way. The registry already exists
// before game.js starts, so later workplace and room fit-outs never have to edit this roster.
if (typeof HotelCast !== 'undefined') for (const n of HotelCast) NPCS.push(n);
// The office tower follows the same room-owned roster pattern. Floor modules can add accountants,
// lawyers, producers and facilities staff without reaching into this file's private NPC setup.
if (typeof OfficeCast !== 'undefined') for (const n of OfficeCast) NPCS.push(n);
// Airport zone modules used to build their living staff and passengers as static primitive
// sculptures outside NPCS. They now contribute ordinary rows here, so they receive the same cast,
// gait, distance identity and batching rules as every other person in the game.
if (typeof AirportAmbientCast !== 'undefined')
  for (const n of AirportAmbientCast) NPCS.push(n);

NPCS.forEach(initNPC);

// Four social stories, all cast from people who were already in the public roster.  Leaders keep
// their authored routes; followers borrow a small formation offset only during their group's
// natural time window.  The elderly pair already occupies two measured seats on one arrival
// bench, so it needs identity metadata but no movement override.
function wireMallSocialGroups() {
  const byFace=new Map(NPCS.filter(n=>n.place==='mall'&&n.look).map(n=>[n.look.faceSeed,n]));
  const add=(key,type,seeds,offsets=[])=>{
    const members=seeds.map(s=>byFace.get(s)).filter(Boolean),leader=members[0];
    members.forEach((n,i)=>{n.mallSocial={key,type,role:i?'member':'leader',leader,
      offset:offsets[i]||[0,0]};});
  };
  add('family-1','family',[5101,7307],[[0,0],[-.58,-.16]]);
  add('couple-1','couple',[5102,5115],[[0,0],[.56,-.06]]);
  add('teens-1','teens',[5104,5105,5106],[[0,0],[-.56,-.24],[.56,-.24]]);
  add('elders-1','elders',[5109,5110]);
}
wireMallSocialGroups();

// Somebody who was not on the roster when the game started: place them, and let the room they
// belong to know about them if it is already standing.
function addNPC(n) {
  NPCS.push(n);
  initNPC(n, NPCS.length - 1);
  if (n.rig && n.place === place) {
    refreshRigPins(place);
    // Late crowds arrive while their lazy destination is being constructed. Queue their shared
    // far mesh immediately instead of waiting for the first frame in which each body is visible.
    if (n.rigShared) ensureRig(n.rig, 2, 500);
  }
  return n;
}

// ---------------------------------------------------------------- settings
// Everything the pause menu can change about the game rather than about the world, in one
// object, written to storage whenever it moves and read back on the next visit. Two of them are
// about the hands — how hard the camera swings, how fast the day runs — and two are about
// learning: whether the labels keep helping after you have met a word, and how sharp a picture
// this machine can hold sixty times a second.
const SETKEY = 'bjlife.settings.v1';
const SET = { sens: 1, clock: 1, assist: false, fps: true, speech: true, ambience: true, quality: -1,
  // Flashing content. 'auto' follows the OS `prefers-reduced-motion` query; 'reduced' and 'full'
  // override it either way. Read by MotionSafety in the tenant modules, which gates the arcade
  // cabinets, the dance pad and the atrium light show — the dance pad was measured running at
  // 3.2 flashes per second on a lit floor in the darkest room in the mall, over the 3/s
  // photosensitivity line, and no setting existed to turn it down.
  motion: 'auto',
  // Walls down, the way a doll's house is played with. Only the flat's interior partitions carry
  // the `partition` flag, so the building's own envelope, the floor, the ceiling, the furniture
  // and the player all stay — you are still enclosed, you can just see in. It is a drawing
  // setting and nothing else: `hiddenProp` is consulted from the three paint loops only, and the
  // colliders come from `A.stop`, which this never touches. A wall you cannot see still stops you.
  wallsOff: false,
  // Not a setting about playing the game — a setting about testing it. It lives here rather than
  // in the save so that wiping the save does not silently switch it off mid-session, and so that
  // it survives the reload you do twenty times an hour while working on a scene.
  tester: false };
try { Object.assign(SET, JSON.parse(localStorage.getItem(SETKEY)) || {}); }
catch (e) { /* nothing saved yet, or storage is blocked */ }

// ---------------------------------------------------------------- the tester's wallet
// Unlimited money, so the half of the game that sits behind a price can be reached without first
// working four shifts: the ticket office, the metro card, the duty free, the till, the rider at
// the door, a return flight. Every one of those reads the same `money` and every one refuses
// politely when it is short, so this is not a cheat threaded through twenty call sites — it is one
// number held up. Topped up from the frame loop as well as from the HUD, because a purchase is a
// click and a frame always runs between two clicks: whatever a transaction takes off, the next
// frame puts back before anything can test the balance again.
const TESTER_PURSE = 1e9;
function topUpTester() {
  if (SET.tester && money < TESTER_PURSE) money = TESTER_PURSE;
}
// Toggling it does not just flip the flag: coming off the cheat, a wallet holding a billion yuan
// is not a game any more, so the purse goes back to a day's wage and the world is honest again.
function setTester(on) {
  SET.tester = !!on;
  money = SET.tester ? TESTER_PURSE : 260;
  saveSettings();
  updateHud();
  toast(SET.tester ? '测试模式 · tester: unlimited money'
                   : '测试模式关 · tester off — wallet back to ¥260');
}

function saveSettings() {
  try { localStorage.setItem(SETKEY, JSON.stringify(SET)); }
  catch (e) { /* storage full or blocked; the settings still hold for this sitting */ }
}

// Push the settings out into the things that actually read them once, rather than having every
// reader poll. Sensitivity and clock speed are read live where they are used.
// Turn the room beds on or off where you are standing, so the switch takes effect at the moment
// it is pressed rather than the next time you go through a door.
function applyAmbience() {
  const on = SET.ambience;
  TrainAudio.platform(on && place === 'metro');
  TrainAudio.terminal(on && place === 'airport');
  TrainAudio.diner(on && place === 'diner');
  TrainAudio.hutong(on && place === 'street');
  TrainAudio.mall(on && place === 'mall');
}

function applySettings() {
  if (perfChip) perfChip.style.display = SET.fps ? '' : 'none';
  if (SET.quality >= 0) Perf.setLevel(SET.quality); else Perf.setAuto(true);
  Speech.setEnabled(SET.speech);
  allThings.forEach(paintLabel);
}

// ---------------------------------------------------------------- labels
// One label per thing, made when its room is made. Eighteen rooms' worth of these used to be in
// the document before the first frame — every sign in a shopping centre nobody had walked into.
function makeLabel(th) {
  const d = document.createElement('div');
  d.className = 'lbl';
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = '<div class="hz"></div><div class="py"></div><div class="en"></div>';
  // the label is a button — but a press that travels is still a camera drag,
  // so it goes through exactly the same press pipeline as the canvas
  d.addEventListener('pointerdown', e => beginPress(e, th));
  d.addEventListener('pointerenter', () => { hoverLabel = th; });
  d.addEventListener('pointerleave', () => { if (hoverLabel === th) hoverLabel = null; });
  labelHost.appendChild(d);
  th.el = d;
}
// ---- what has already been written to a label's element, so it is not written again.
//
// The label loop runs over every thing in the room, every frame. In the shopping centre that is
// 234 elements and about seven hundred style assignments a frame, and the overwhelming majority
// of them write a value the element already has — a label that is off screen is told it is
// invisible sixty times a second for as long as you are not looking at it. Each write dirties the
// element and makes the browser's next layout that much more expensive, and the game reads layout
// four times a frame (see R.cssSize), so those writes are not free the way they would be in a
// page that never reads back.
//
// This is not caching a computation: the arithmetic still runs every frame, and the label still
// follows the object exactly as before. It is only the DOM write that is skipped when it would
// change nothing.
function labelState(th) {
  return th._lb || (th._lb = { op: -1, l: '', t: '', pe: '', ah: 'true', near: null });
}
function labelHide(th) {
  const s = labelState(th);
  if (s.op === 0 && s.pe === 'none' && s.ah === 'true') return;
  if (!th.el) return;
  if (s.op !== 0) th.el.style.opacity = s.op = 0;
  if (s.pe !== 'none') th.el.style.pointerEvents = s.pe = 'none';
  if (s.ah !== 'true') { th.el.setAttribute('aria-hidden', 'true'); s.ah = 'true'; }
}
function labelShow(th, left, top, op) {
  const s = labelState(th);
  if (!th.el) return;
  const st = th.el.style;
  if (s.l !== left) st.left = s.l = left;
  if (s.t !== top) st.top = s.t = top;
  if (s.op !== op) st.opacity = s.op = op;
  if (s.pe !== 'auto') st.pointerEvents = s.pe = 'auto';
  if (s.ah !== 'false') { th.el.setAttribute('aria-hidden', 'false'); s.ah = 'false'; }
}

function paintLabel(th) {
  // 拼音 in the settings holds every label at full assist, for anyone who would rather read
  // the pinyin than be tested by its absence.
  const st = SET.assist ? 0 : Vocab.stage(th.hz);
  // A scene object whose word has not been added to the dictionary yet still has to draw,
  // rather than taking the whole apartment down with it.
  const e = Vocab.get(th.hz) || { py: '', en: '' };
  // And a thing that has no label element yet still has to not take the game down.
  //
  // `th.el` is hung on by `adopt()`, which runs once over the scene's `things`. Anything that adds
  // a thing AFTER that — a district builder, a room built late, a prop that appears on a clock —
  // reaches here with `th.el` undefined and the next line throws on every frame, which is the boot
  // overlay and a dead game rather than one missing caption. Found by the traffic agent during the
  // street build, where nine district files are all adding things.
  if (!th.el) return;
  th.el.querySelector('.hz').textContent = th.hz;
  th.el.querySelector('.py').textContent = st < 2 ? e.py : '';
  th.el.querySelector('.en').textContent = st < 1 ? e.en : '';
  th.el.classList.toggle('mastered', st === 2);
}

// ---- a room, arriving. Everything above this point is the machinery a thing needs before it can
// be one — a label, a place name, a slot in the word list — and a room built during the roster's
// own setup would reach it before it existed. So the first few are queued and flushed here, and
// every room built after this moment is adopted on the spot.
const adoptQueue = [];
// How many characters were in the atlas the last time it went to the renderer.
let glyphsUploaded = 0;

function adoptThing(placeName, th) {
  th.place = placeName;
  allThings.push(th);
  if (!thingOf[th.hz]) thingOf[th.hz] = th;
  makeLabel(th);
  paintLabel(th);
}

function adopt(placeName) {
  if (!labelsReady) { adoptQueue.push(placeName); return; }
  // The characters that room just asked for, into the sheet the renderer is holding.
  //
  // `Glyphs.upload()` used to be called exactly once, at the top of this file, under a comment
  // saying "after every scene has registered its text" — which was true when every scene was built
  // at load. It stopped being true the moment rooms became lazy: a room now registers its signage
  // when you first walk into it, which is long after the atlas was built and handed over. The
  // airport alone asks for seventy-five characters nobody had seen at boot, and every one of them
  // was drawing as an empty cell — a departures board of blank rectangles in a game about reading.
  // Re-uploading per room build is eighteen texture uploads across a whole session.
  if (Glyphs.count !== glyphsUploaded) { Glyphs.upload(); glyphsUploaded = Glyphs.count; }
  const sc = PLACES[placeName];
  const waiting = pendingThings[placeName];
  if (waiting) { for (const th of waiting) sc.things.push(th); pendingThings[placeName] = null; }
  for (const th of sc.things) if (!th.el) adoptThing(placeName, th);
  adopted.add(placeName);
}

for (const k in PLACES) Lazy.onBuild(PLACES[k].__lazyName, () => adopt(k));

labelsReady = true;
while (adoptQueue.length) adopt(adoptQueue.shift());

// ---------------------------------------------------------------- pause
// The one panel that is not a thing in the world. While it is up the clock stops, the
// neighbours stop, and whatever you were in the middle of doing waits exactly where it was —
// which is the difference between a settings screen and a settings screen you dare open.
let paused = false;

function setPause(on) {
  if (paused === on) return;
  paused = on;
  $('#pause').classList.toggle('on', paused);
  setSurfaceOpen('#pause', paused);
  // The arrival announcement follows the same clock as the train. Suspending its AudioContext
  // here keeps a pause from letting the voice finish while the open-door timer stands still.
  TrainAudio.pause(paused);
  Speech.pause(paused);
  // Keys held at the moment you paused would otherwise still be held when you came back.
  if (paused) {
    for (const k in keys) keys[k] = false;
    resetTouchMove();
  }
  if (paused) syncSettings();
  else { resetConfirm(); newGameConfirm(); }
}

// ---- the controls. Built from the settings object so the panel can never disagree with it.
const qSeg = $('#setQ');
function syncSettings() {
  qSeg.innerHTML = [{ name:'自动', en:'auto' }].concat(Perf.levels)
    .map((l, i) => `<button data-q="${i - 1}" title="${l.en}">${l.name}</button>`).join('');
  qSeg.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', +b.dataset.q === SET.quality);
    b.onclick = () => {
      SET.quality = +b.dataset.q;
      applySettings(); saveSettings(); syncSettings();
    };
  });
  $('#setSens').value = Math.round(SET.sens * 100);
  $('#setSensV').textContent = SET.sens.toFixed(2).replace(/0$/, '') + '×';
  $('#setClock').value = Math.round(SET.clock * 100);
  $('#setClockV').textContent = SET.clock.toFixed(2).replace(/0$/, '') + '×';
  $('#setAssist').classList.toggle('on', SET.assist);
  $('#setSpeech').classList.toggle('on', SET.speech);
  $('#setAmbience').classList.toggle('on', SET.ambience);
  $('#setFps').classList.toggle('on', SET.fps);
  $('#setWalls').classList.toggle('on', SET.wallsOff);
}

function bindRange(id, key, after) {
  $(id).addEventListener('input', e => {
    SET[key] = +e.target.value / 100;
    saveSettings(); syncSettings();
    if (after) after();
  });
}
bindRange('#setSens', 'sens');
bindRange('#setClock', 'clock');

function bindToggle(id, key, after) {
  $(id).addEventListener('click', () => {
    SET[key] = !SET[key];
    applySettings(); saveSettings(); syncSettings();
    if (after) after();
  });
}
bindToggle('#setAssist', 'assist');
bindToggle('#setSpeech', 'speech');
// The room beds, off at the switch. Ambience is the most personal setting in the game — what reads
// as a street to one person is a noise to another — so it gets its own toggle rather than being
// tuned until nobody minds it.
bindToggle('#setAmbience', 'ambience', () => applyAmbience());
// Walls down. Nothing to apply to the renderer — the next frame reads SET.wallsOff through
// hiddenProp — but the camera is half the feature and it is set here rather than left to the
// player. Walls down with the eye still at chest height shows you one room through one partition;
// what makes it read as a doll's house is the view from above, so the toggle cranes up and back
// with it and hands back exactly the framing the player had when the walls come up again. Eased
// rather than cut: CAM.pitch and CAM.dist lerp toward these every frame, so it is a crane move.
//
// 1.18 rad is 68 degrees and 7.2 m is the whole 12.00 x 8.20 m plate at the flat's aspect. Not
// straight down: at 90 degrees the furniture is a set of lids and you cannot tell a bed from a
// table, which is the reason The Sims does not go there either.
//
// The saved framing is not clamped on the way back. It is whatever the player themselves had
// chosen a moment earlier under the walls-up limits, so it is legal by construction, and a place
// change overwrites both anyway (js/game.js:12275).
function toggleWalls() {
  SET.wallsOff = !SET.wallsOff;
  if (SET.wallsOff) {
    CAM.wallsWas = { pitch: CAM.tPitch, dist: CAM.tDist };
    if (dollHouse()) { CAM.tPitch = 1.18; CAM.tDist = 7.2; }
  } else if (CAM.wallsWas) {
    CAM.tPitch = CAM.wallsWas.pitch; CAM.tDist = CAM.wallsWas.dist; CAM.wallsWas = null;
  }
  saveSettings(); syncSettings();
  // The panel is over a frozen frame, so say what changed rather than leaving the player to
  // unpause and guess.
  toast(SET.wallsOff ? '墙壁隐藏 · walls down' : '墙壁显示 · walls up');
}
$('#setWalls').addEventListener('click', toggleWalls);
bindToggle('#setFps', 'fps');

// Throwing away every word you have met is the one thing in here you cannot undo, so it asks
// twice, and the button says so in between.
let resetArmed = false;
function resetConfirm() {
  resetArmed = false;
  $('#pReset').textContent = '重置词汇 · RESET WORDS';
  $('#pReset').classList.remove('on');
}
$('#pReset').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    newGameConfirm();                     // only one destructive button armed at a time
    $('#pReset').classList.add('on');
    $('#pReset').textContent = '确定？· TAP AGAIN TO ERASE';
    return;
  }
  Vocab.reset();
  allThings.forEach(paintLabel);
  refreshUI(); refreshDue(); updateHud();
  resetConfirm();
  toast('都忘了 · <span class="dim">every word forgotten — start again</span>');
});

// New Game — the whole slate, not just the words. RESET WORDS above forgets the vocabulary and
// leaves the life running; this is the other half of that, and it is the harder one to undo, so it
// asks twice exactly the same way.
//
// It works by clearing the save and reloading rather than by putting every variable back by hand.
// The life is scattered across a dozen module globals here and more in every scene file — the
// courier at your door, the train mid-run, where the crowd is standing — and resetting them one by
// one is how you miss one. Re-running the page is the only reset that cannot be incomplete: nothing
// in memory survives it, and with the save gone the game boots on its defaults. The words go too,
// so "new game" means what it says; keep them with RESET WORDS' opposite if you only want a fresh
// life, which is not a thing anybody has asked for.
let newArmed = false;
function newGameConfirm() {
  newArmed = false;
  const b = $('#pNew');
  if (b) { b.textContent = '新游戏 · NEW GAME'; b.classList.remove('on'); }
}
$('#pNew').addEventListener('click', () => {
  if (!newArmed) {
    newArmed = true;
    resetConfirm();                       // disarm the words button if it was mid-confirm
    $('#pNew').classList.add('on');
    $('#pNew').textContent = '从头开始？· TAP AGAIN TO RESTART';
    return;
  }
  wiping = true;                          // stop the reload's save-on-exit from writing it back
  campusLife.studentId = false;
  try { localStorage.removeItem(SAVEKEY); } catch (_) { /* private window, blocked — fine */ }
  // The diary is the life, not the vocabulary, and it lives in its own key — so it has to be named
  // here or a new game starts with somebody else's fortnight already written in it.
  try { localStorage.removeItem(DIARY_KEY); } catch (_) {}
  try { localStorage.removeItem('bjlife.flightpassport.v1'); } catch (_) {}
  try { Talk.reset(); } catch (_) {}
  Vocab.reset();                          // the words as well: a new game is a new student
  location.reload();
});
// The weather chip opens the word for whatever the sky is doing — and on a second click, the
// season. Two words, one chip, and both of them are the answer to a question the player is
// already asking, which is the only reliable moment to teach anything.
let skyPick = -1;
$('#sky').addEventListener('click', () => {
  const w = Weather.now;
  const pair = [w.hz, w.season.hz];
  skyPick = (skyPick + 1) % pair.length;
  const hz = pair[skyPick];
  if (Vocab.get(hz)) openWord(hz);
});
// The due count is an invitation, not just telemetry. Keyboard players still have R; pointer and
// touch players can enter the exact same review flow by pressing the count itself.
$('#revw').addEventListener('click', () => {
  if (started && !paused && !cardOpen && !talkOpen) review();
});
$('#pResume').addEventListener('click', () => setPause(false));
$('#pBook').addEventListener('click', () => { setPause(false); if (!bookOpen) toggleBook(); });
$('#pPhone').addEventListener('click', () => { setPause(false); openPhone(); });
$('#pause').addEventListener('pointerdown', e => { if (e.target.id === 'pause') setPause(false); });

// ---------------------------------------------------------------- input
addEventListener('keydown', e => {
  // Over the title screen the keyboard does one thing, and nothing at all reaches the game —
  // otherwise WASD walks the player around a flat nobody has agreed to enter yet.
  if (!started) {
    // A focused button already turns Enter and Space into a click of its own. Acting on the
    // key here as well would start the game *and* open the how-to over the top of it.
    if (e.target && e.target.tagName === 'BUTTON') return;
    const how = $('#howto');
    if (how.classList.contains('on')) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        if (window.setHowtoOpen) window.setHowtoOpen(false); else how.classList.remove('on');
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#start').click(); }
    return;
  }
  // Paused, the only key that does anything is the one that unpauses.
  if (paused) {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); setPause(false); }
    return;
  }
  // The order panel owns the keyboard while it is up, or W would both move the highlight and
  // walk you away from the person taking the order.
  if (Pick.isOpen) {
    const mk = e.key.toLowerCase();
    if (e.key === 'Escape') { Pick.close(); return; }
    if (mk === 'w' || e.key === 'ArrowUp') { e.preventDefault(); Pick.move(-1); return; }
    if (mk === 's' || e.key === 'ArrowDown') { e.preventDefault(); Pick.move(1); return; }
    if (mk === 'q' || e.key === 'Enter') { e.preventDefault(); Pick.confirm(); return; }
    return;
  }
  // Leave Tab to the browser: the HUD, dialogue choices and settings are real controls and must
  // remain keyboard reachable. B is the mnemonic notebook shortcut (book / 生词本).
  if (e.key === 'b' || e.key === 'B') { e.preventDefault(); toggleBook(); return; }
  // P steps through the quality levels by hand and back to automatic, for when you would rather
  // have the sharper picture than the smoother one, or the other way about.
  if (e.key === 'p' || e.key === 'P') {
    Perf.cycle();
    toast(`画质 · quality: ${Perf.auto ? '自动 auto' : Perf.q.en}`);
    return;
  }
  // V drops the flat's walls, the way a doll's house opens. Paired with the toggle in the pause
  // menu rather than replacing it — the menu is where a player finds it, the key is how they use
  // it once they know. V is free: nothing else in the game claims it.
  if (e.key === 'v' || e.key === 'V') {
    e.preventDefault();
    toggleWalls();
    return;
  }
  // Escape closes whatever is open, one thing at a time, and pauses the game once nothing is.
  if (e.key === 'Escape') {
    if (doing || cardOpen || bookOpen || talkOpen) {
      stopUse(false); closeCard(); closeTalk(); if (bookOpen) toggleBook();
    } else if (started) setPause(true);   // not over the title screen, which is its own pause
    return;
  }
  // Shift+4 — the ¥ key is on 4 on a Chinese layout and $ on this one, so whichever keyboard is
  // under your hands the money key is the money key. Deliberately a shifted key: nothing in the
  // game uses one, so a learner reaching for the quiz answers 1-4 cannot fall into tester mode,
  // and no browser has claimed it the way it has claimed most Ctrl combinations.
  if (e.key === '$' || e.key === '￥' || e.key === '¥') {
    e.preventDefault(); setTester(!SET.tester); return;
  }
  // M for 手机: the phone is in your pocket, so it opens wherever you are standing.
  if (e.key === 'm' || e.key === 'M') { e.preventDefault(); if (started) openPhone(); return; }
  if (talkOpen && e.key >= '1' && e.key <= '4') {
    e.preventDefault(); reply(+e.key - 1); return;
  }
  if (quiz && !quiz.answered && e.key >= '1' && e.key <= '4') {
    e.preventDefault(); answer(+e.key - 1); return;
  }
  const k = e.key.toLowerCase();
  // L plays their line again and T shows you the English. Both only while somebody is talking to
  // you, so neither steals a key from the rest of the game.
  if (talkOpen && k === 'l') { e.preventDefault(); againTalk(); return; }
  if (talkOpen && k === 't') { e.preventDefault(); translateTalk(); return; }
  if (k === 'e') { e.preventDefault(); talkOpen ? closeTalk() : cardOpen ? closeCard() : interact(); return; }
  if (k === 'q') { e.preventDefault(); startUse(useThing); return; }
  if (k === 'r') { e.preventDefault(); if (!cardOpen && !talkOpen) review(); return; }
  if (k === 'f') { e.preventDefault(); recenterCamera(); return; }
  // 465. Tab steps through everything usable within reach, so no fixture ever needs the camera
  // aimed at it — a tap, a switch, a lift button in a row of them. Only while the world has
  // focus: a card, a conversation or a quiz owns Tab for its own rows (item 468).
  if (k === 'tab' && started && !cardOpen && !talkOpen && !quiz) {
    e.preventDefault(); cycleNear(); return;
  }
  // 470. 楼层表 — the whole building on one screen, from anywhere in it.
  if (k === 'b') {
    e.preventDefault();
    if (started && place === 'home' && !cardOpen && !talkOpen) openBuildingMap();
    return;
  }
  // Space jumps. preventDefault unconditionally, even when `jump()` refuses: the page would
  // otherwise scroll, and if a touch button happens to hold focus the browser would fire its
  // click instead — pressing space to hop would open the notebook. Repeat events are ignored
  // because `jump()` already refuses while off the floor, so holding it does not bounce.
  if (k === ' ') { e.preventDefault(); jump(); return; }
  // G for 广播: the last thing the loudspeaker said, again. Only in the terminal, because that is
  // the only room with a loudspeaker worth rewinding, and because G is otherwise free everywhere.
  // G for 广播: the last thing the loudspeaker said, again. The terminal and the shopping centre
  // are the two rooms with one, and the mall's is the one most worth rewinding — nothing it says
  // is repeated on a screen or a boarding pass.
  if (k === 'g') { e.preventDefault(); if (place === 'airport' || place === 'mall') replayCall(); return; }
  // N for 下一首. Only in the mall, and only a courtesy: the playlist runs on its own and this is
  // for the moment you have heard this one three times and would rather hear the next.
  if (k === 'n') {
    e.preventDefault();
    if (place === 'mall') {
      const title = TrainAudio.skipTrack();
      toast(title ? `下一首 · <span class="dim">${title}</span>`
                  : `音乐 · <span class="dim">nothing is playing</span>`);
    }
    return;
  }
  // arrows orbit the camera, so keep the page from scrolling under them
  if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') e.preventDefault();
  keys[k] = true;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  resetTouchMove();
});

// ---------------------------------------------------------------- touch controls
// The canvas already has a good one-finger camera drag. These controls supply the half a phone
// cannot: movement and the three keyboard verbs. They write into their own key map instead of
// synthesising KeyboardEvents, so there is no browser-dependent trust or focus behaviour.
const touchMove = $('#touchMove'), touchThumb = touchMove && touchMove.querySelector('.thumb');
const touchLook = $('#touchLook'), touchUse = $('#touchUse'), touchReview = $('#touchReview');
let touchPointer = null;

function resetTouchMove() {
  touchPointer = null;
  for (const k in touchKeys) touchKeys[k] = false;
  if (touchMove) touchMove.classList.remove('active');
  if (touchThumb) touchThumb.style.transform = 'translate(0px,0px)';
}

function steerTouch(e) {
  if (!touchMove) return;
  const r = touchMove.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const radius = Math.max(24, r.width * 0.34), d = Math.hypot(dx, dy);
  if (d > radius) { dx *= radius / d; dy *= radius / d; }
  if (touchThumb) touchThumb.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
  const dead = radius * 0.20;
  touchKeys.a = dx < -dead; touchKeys.d = dx > dead;
  touchKeys.w = dy < -dead; touchKeys.s = dy > dead;
  // The outer ring is a natural run gesture and leaves the centre as a careful indoor walk.
  touchKeys.shift = d > radius * 0.82;
}

if (touchMove) {
  touchMove.addEventListener('pointerdown', e => {
    if (!started || paused || touchPointer !== null) return;
    e.preventDefault(); e.stopPropagation();
    touchPointer = e.pointerId;
    touchMove.classList.add('active');
    try { touchMove.setPointerCapture(e.pointerId); } catch (_) {}
    steerTouch(e);
  });
  touchMove.addEventListener('pointermove', e => {
    if (e.pointerId !== touchPointer) return;
    e.preventDefault(); e.stopPropagation(); steerTouch(e);
  });
  const endTouchMove = e => {
    if (e.pointerId !== touchPointer) return;
    e.preventDefault(); e.stopPropagation(); resetTouchMove();
  };
  touchMove.addEventListener('pointerup', endTouchMove);
  touchMove.addEventListener('pointercancel', endTouchMove);
  touchMove.addEventListener('lostpointercapture', e => {
    if (e.pointerId === touchPointer) resetTouchMove();
  });
}

// A hop off the floor. Refused rather than queued whenever the body is not simply standing in a
// room under your control: mid-air already, reading a card, being talked to, choosing from the
// order panel, paused, sitting, asleep, or in the middle of using something. Those are the same
// conditions that zero the walk input, so jumping cannot be the one gesture that reaches through
// a modal — and `startUse` puts hands on an object, which should not then float away from it.
function jump() {
  if (!started || paused || cardOpen || talkOpen || Pick.isOpen) return false;
  // `act` is what the body is physically doing — sitting, lying, holding something. `sleepKind`
  // would read better here and is NOT in scope: it is a const inside the draw, and referencing it
  // would throw at runtime while `node --check` passed the file. `act` is the module-level truth.
  if (doing || sitting || act) return false;
  if (P.jy > 0.001 || P.jv > 0) return false;      // already off the floor
  P.jv = JUMP_V;
  return true;
}

function touchAction(kind) {
  if (!started || paused) return;
  resetTouchMove();
  if (kind === 'jump') { jump(); return; }
  if (kind === 'look') { talkOpen ? closeTalk() : cardOpen ? closeCard() : interact(); return; }
  if (kind === 'use') { startUse(useThing); return; }
  if (kind === 'review') { if (!cardOpen && !talkOpen) review(); return; }
  if (kind === 'pause') setPause(true);
}
if (touchLook) touchLook.addEventListener('click', () => touchAction('look'));
if (touchUse) touchUse.addEventListener('click', () => touchAction('use'));
if (touchReview) touchReview.addEventListener('click', () => touchAction('review'));
const touchJump = $('#touchJump');
if (touchJump) touchJump.addEventListener('click', () => touchAction('jump'));
const touchPause = $('#touchPause');
if (touchPause) touchPause.addEventListener('click', () => touchAction('pause'));

let touchReadySig = '';
function paintTouchReady() {
  if (!touchLook || !touchUse) return;
  const sig = `${activeThing ? 1 : 0}${useThing ? 1 : 0}`;
  if (sig === touchReadySig) return;
  touchReadySig = sig;
  touchLook.classList.toggle('ready', !!activeThing);
  touchUse.classList.toggle('ready', !!useThing);
}

// A press is a drag if it travels; otherwise it is a click on whatever is under it.
let down = false, lx = 0, ly = 0, travel = 0, pressed = null;
let pressBtn = 0, dragT = 0;
const DRAG_SLOP = 6;   // px

// Look sensitivity is per-pixel, tuned so the same gesture feels the same at any
// window size, and finer as you zoom in, where small angles matter more.
function lookSens() {
  return 0.0042 * SET.sens * (760 / Math.max(360, cv.clientHeight)) * (0.55 + CAM.tDist / 9);
}
function orbit(dx, dy) {
  const s = lookSens();
  CAM.tYaw -= dx * s;
  // 512. 1.22 rad is 70 degrees, and the ceiling limiter answers that in a 2.60 m room with a
  // 1.55 m top-down of the player's own head. It is legible as a plan view and it was never
  // chosen as one — the wheel simply ran out of travel there. 1.05 rad is 60 degrees, which is
  // still a steep look-down over a table and still short of the pose the limiter has to rescue.
  // 1.45 rad is 83 degrees, and it is the walls-down bound only. A plan view of a flat needs to be
  // nearly overhead or the near rooms are read through the far ones; 60 degrees leaves the far half
  // of a 12 m plate behind the near half of it.
  CAM.tPitch = clamp(CAM.tPitch + dy * s * 0.72, 0.05, dollHouse() ? 1.45 : 1.05);
}
// Swing back behind the player, whichever way they are facing.
function recenterCamera() {
  CAM.tYaw += angleDelta(P.yaw, CAM.tYaw);
  CAM.tPitch = 0.36;
  CAM.spin = 0;
}

function trackMouse(e) {
  const r = cv.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= r.width && mouse.y <= r.height;
}

// `th` is set when the press landed on a world label rather than the canvas
function beginPress(e, th) {
  down = true; travel = 0; lx = e.clientX; ly = e.clientY; pressed = th || null;
  pressBtn = e.button; dragT = performance.now(); CAM.spin = 0;   // grab stops any glide
  trackMouse(e);
  // capture on the canvas even for label presses, so a drag keeps steering the camera
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older pointer impls */ }
}

cv.addEventListener('pointerdown', e => beginPress(e, null));
cv.addEventListener('pointerup', e => {
  if (down && travel < DRAG_SLOP) {
    CAM.spin = 0;
    if (pressBtn === 0) {                  // right-drag is look-only, never a click
      trackMouse(e);
      const th = Pick.isOpen ? null : (pressed || pickUnderCursor());
      if (th) openWord(th.hz);
      else if (cardOpen) closeCard();
    }
  }
  down = false; pressed = null;
});
cv.addEventListener('pointercancel', () => { down = false; pressed = null; CAM.spin = 0; });
cv.addEventListener('pointermove', e => {
  trackMouse(e);
  if (!down) return;
  const dx = e.clientX - lx, dy = e.clientY - ly;
  travel += Math.abs(dx) + Math.abs(dy);
  if (travel < DRAG_SLOP) return;          // hold still and it stays a click
  orbit(dx, dy);
  // Remember how fast the gesture was moving so a flick keeps gliding on release.
  const ms = performance.now(), gap = Math.max(8, ms - dragT);
  CAM.spin = lerp(CAM.spin, clamp(-dx * lookSens() / (gap / 1000), -4.5, 4.5), 0.45);
  dragT = ms;
  lx = e.clientX; ly = e.clientY;
});
cv.addEventListener('pointerleave', () => { mouse.inside = false; });
// Right-drag should orbit without the browser menu interrupting it.
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault();
  // Trackpads: a pinch arrives as ctrl+wheel, and a sideways two-finger scroll orbits.
  if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.6) {
    CAM.tYaw -= e.deltaX * 0.0032; CAM.spin = 0; return;
  }
  const step = (e.ctrlKey ? e.deltaY * 0.020 : e.deltaY * 0.0052);
  // Proportional zoom: the same gesture moves less when you are already close in.
  // The near limit keeps the whole body, head included, inside the frame.
  // A room may cap its own zoom-out, for the same reason it may set its own camera: 6.8m back in
  // an aeroplane cabin is most of the length of the aeroplane, and puts the eye over the bins.
  // The *room* may cap it too, and in a flat that is the cap that matters. No room in 202 can use
  // more than 2.97 m (`camNear`, js/home-walls.js), so 3.8 m of the wheel's travel did nothing but
  // wind `tDist` up to a number the orbit solve threw away again — the wheel turned and the
  // picture did not move, which is the plainest way a camera can feel broken.
  //
  // Capping it HERE and nowhere else is the whole point. `room.near` still never overwrites
  // `tDist` frame by frame — see the note beside `CAM.near` below, which is right that a limit
  // laid over the player's choice has to be released when they walk out. This only narrows what a
  // deliberate scroll can ask for, in the room they are scrolling in.
  // Walls down releases both caps, and it has to release the LITERAL as well as `room.near`: 6.8
  // is a chase-camera number and the flat is 12.00 x 8.20 m, so a wheel that stopped at 6.8 would
  // stop with a third of the plan still off the bottom of the frame. 10.5 m at 68 degrees frames
  // the whole of it with margin, and no further, because past that the figure stops being findable.
  const far = dollHouse() ? 10.5
            : Math.min((scene && scene.camera && scene.camera.maxDist) || 6.8,
                       (room && room.near) || 6.8);
  // 1.70 rather than 1.95, because the flat's tightest rooms cap the orbit at 1.90 and a floor
  // above the room's own ceiling leaves no travel at all: `clamp(v, 1.95, 1.90)` returns one bound
  // or the other and the wheel is dead. The old floor was protecting the framing, and 1.70 still
  // does — at the 0.90 rad indoor lens the head sits 0.82 m inside the top of the frame.
  CAM.tDist = clamp(CAM.tDist + step * (0.45 + CAM.tDist / 7), 1.70, far);
}, { passive: false });

// ---------------------------------------------------------------- picking
// Props stuck to a wall the camera has backed out through are hidden, so they
// must not be clickable either.
// Hiding is relative to the room the player is standing in, so the cutaway opens up the
// bathroom exactly the way it opens up the apartment.
let hideX = 0, hideZ = 0, room = World.zones[0];
// 509. The box the cutaway is measured against, which is not always the box the body may walk
// in. A zone may declare `cut` when its walkable plate contains something the player can never
// stand in — the corridor on deck 2 is a 12.00 x 3.00 m plate with two lift shafts owning
// 1.30 m of its depth. Derefed once a frame beside hideX/hideZ, never per prop.
let cutRoom = World.zones[0];
// The exact point lights submitted this frame. Empty outside diagnostic reads; populated from the
// already-ranked list, so exposing it adds no renderer walk and lets mall QA prove shop ownership.
let selectedLightDebug = [];
// BEGIN MALL_LIGHT_HYSTERESIS
// The mall owns far more local lamps than the shader's eight slots. Re-sorting them every frame
// made nearly tied lamps exchange slots as the camera eased across a shopfront, which reads as a
// lighting flicker even though neither lamp moved. Keep the exact nearest eight on entry and after
// a jump, then reconsider only after half a metre of camera travel. During an ordinary walking
// step a newcomer must be a useful 25 cm nearer than the incumbent and at most two slots may
// change. A teleport reseeds immediately, so stability never leaves the player with lobby lamps
// after they jump to the other side of the building.
const MALL_LIGHT_POLICY = Object.freeze({
  limit:8, step:0.50, teleport:1.25, hysteresis:0.25, maxStepSwaps:2,
});
function makeMallLightSelectionState() {
  return {
    active:false,scene:null,deck:-2,eligible:[],chosen:[],at:[0,0,0],
    evaluations:0,cacheHits:0,reseeds:0,candidateTransitions:0,
    movementTransitions:0,totalStepSwaps:0,maxStepSwaps:0,
    last:{reason:'idle',distance:0,swaps:0,exactMissing:0,qualityGap:0},
  };
}
function sameLightSequence(a,b) {
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
}
function rankedMallLights(on,score) {
  // The source index is an explicit tie-break, so equal-distance lamps remain deterministic even
  // in an engine whose Array#sort stability differs from the browser used for acceptance.
  return on.map((light,index)=>({light,index,score:score(light)}))
    .sort((a,b)=>a.score-b.score||a.index-b.index);
}
function stableExactSlots(previous,exact,limit) {
  const wanted=new Set(exact),used=new Set(),next=new Array(Math.min(limit,exact.length)).fill(null);
  for(let i=0;i<next.length&&i<previous.length;i++) {
    const light=previous[i];
    if(wanted.has(light)&&!used.has(light)){next[i]=light;used.add(light);}
  }
  const missing=exact.filter(light=>!used.has(light));
  for(let i=0,j=0;i<next.length;i++)if(!next[i])next[i]=missing[j++];
  return next;
}
function mallLightSlotChanges(before,after) {
  let swaps=0,n=Math.max(before.length,after.length);
  for(let i=0;i<n;i++)if(before[i]!==after[i])swaps++;
  return swaps;
}
function selectMallLights(state,on,eye,sceneKey,deck,score) {
  const P=MALL_LIGHT_POLICY,cold=!state.active;
  const contextChanged=!cold&&(state.scene!==sceneKey||state.deck!==deck);
  const candidatesChanged=!cold&&!contextChanged&&!sameLightSequence(state.eligible,on);
  const dx=cold?0:eye[0]-state.at[0],dy=cold?0:eye[1]-state.at[1],dz=cold?0:eye[2]-state.at[2];
  const distance=Math.hypot(dx,dy*1.5,dz);
  if(!cold&&!contextChanged&&!candidatesChanged&&distance<P.step-1e-6) {
    state.cacheHits++;
    return state.chosen;
  }

  const ranked=rankedMallLights(on,score),records=new Map(ranked.map(q=>[q.light,q]));
  const exact=ranked.slice(0,P.limit).map(q=>q.light),before=state.chosen;
  let next,reason,stepSwaps=0;
  if(cold||contextChanged||distance>P.teleport) {
    next=exact.slice();
    reason=cold?'cold':contextChanged?'context':'jump';
    state.reseeds++;
  } else if(candidatesChanged) {
    // An opening/closing transition must never leave an extinguished lamp submitted, but lamps
    // that remain in the exact nearest set keep their shader slots to minimise the visual handoff.
    next=stableExactSlots(before,exact,P.limit);
    reason='candidates';
    state.candidateTransitions++;
  } else {
    next=before.slice();
    const exactSet=new Set(exact),missing=exact.filter(light=>!next.includes(light));
    for(const candidate of missing) {
      if(stepSwaps>=P.maxStepSwaps)break;
      const evictable=next.map((light,slot)=>({light,slot,record:records.get(light)}))
        .filter(q=>!exactSet.has(q.light)&&q.record)
        .sort((a,b)=>b.record.score-a.record.score||b.slot-a.slot);
      if(!evictable.length)break;
      const incumbent=evictable[0],candidateScore=records.get(candidate).score;
      // Compare radial distance rather than squared score. The 25 cm band then means the same
      // thing beside a counter as it does across the atrium.
      if(Math.sqrt(candidateScore)+P.hysteresis>=Math.sqrt(incumbent.record.score))break;
      next[incumbent.slot]=candidate;
      stepSwaps++;
    }
    reason='movement';
    state.movementTransitions++;
    state.totalStepSwaps+=stepSwaps;
    state.maxStepSwaps=Math.max(state.maxStepSwaps,stepSwaps);
  }

  const exactSet=new Set(exact),chosenWorst=next.reduce((worst,light)=>
    Math.max(worst,Math.sqrt(records.get(light)?.score||0)),0);
  const exactCutoff=exact.length?Math.sqrt(records.get(exact[exact.length-1]).score):0;
  state.active=true;state.scene=sceneKey;state.deck=deck;state.eligible=on.slice();
  state.chosen=next;state.at=[eye[0],eye[1],eye[2]];state.evaluations++;
  state.last={reason,distance:+distance.toFixed(3),
    swaps:reason==='movement'?stepSwaps:mallLightSlotChanges(before,next),
    exactMissing:exact.reduce((n,light)=>n+(next.includes(light)?0:1),0),
    qualityGap:+Math.max(0,chosenWorst-exactCutoff).toFixed(3)};
  return next;
}
function resetMallLightSelection(state,reason) {
  if(!state.active)return;
  state.active=false;state.scene=null;state.deck=-2;state.eligible=[];state.chosen=[];
  state.last={reason:reason||'reset',distance:0,swaps:0,exactMissing:0,qualityGap:0};
}
function mallLightSelectionDebug(state) {
  const reads=state.evaluations+state.cacheHits;
  return {
    active:state.active,deck:state.deck,eligible:state.eligible.length,selected:state.chosen.length,
    policy:{...MALL_LIGHT_POLICY},evaluations:state.evaluations,cacheHits:state.cacheHits,
    cacheHitPct:reads?+(100*state.cacheHits/reads).toFixed(1):0,
    reseeds:state.reseeds,candidateTransitions:state.candidateTransitions,
    movementTransitions:state.movementTransitions,totalStepSwaps:state.totalStepSwaps,
    maxStepSwaps:state.maxStepSwaps,last:{...state.last},
  };
}
const mallLightSelectionState=makeMallLightSelectionState();
// END MALL_LIGHT_HYSTERESIS
// Which deck is being drawn this frame. Twelve floors share one footprint and the cutaway culls on
// x and z only, so without this every floor's geometry is drawn on every other floor — measured at
// 822 props for the deck you are on against 15,136 for the ones you are not. Set once a frame
// rather than read per prop, because it is read sixteen thousand times.
let drawDeck = -1;
// Batch cull centres are packed once when a scene is built.  Lift-car props are the exception: the
// matrices and `p.cx/cy/cz` move every frame, and using their lobby-era packed centres makes the
// complete car fail the upper-floor frustum test. Build the tiny travelling subset once, then keep
// only those packed centres current; fixed props retain the fast build-time path.
let movingCullScene = null, movingCulls = [];
function syncMovingCulls(s) {
  if (!s || !s.batches) return;
  if (movingCullScene !== s) {
    movingCullScene = s;
    movingCulls = [];
    for (const b of s.batches) for (let i = 0; i < b.props.length; i++) {
      const p = b.props[i];
      if (p.deck !== undefined && p.deck < 0) movingCulls.push({ p, cull:b.cull, i:i * 4 });
    }
  }
  for (const q of movingCulls) {
    q.cull[q.i] = q.p.cx;
    q.cull[q.i + 1] = q.p.cy;
    q.cull[q.i + 2] = q.p.cz;
  }
}
// 515. The band was 0.32 m and it was set when the eye spent part of each orbit INSIDE the room,
// so it only had to reach far enough to take the near wall. The flat now declares orbit limits
// of 1.90-2.97 m in rooms 1.20-4.00 m across, which puts the eye outside the room through almost
// every wall for almost every yaw — and the band is then the only thing deciding how much of the
// NEXT room survives. At 0.32 the first 0.32 m past a partition went, which is the partition and
// nothing standing against it; skirting, sockets and the near edge of anything pushed to the
// wall stayed, floating in front of a wall that had been taken. 0.42 takes the wall and the
// 10 cm of clutter attached to it. It is not free: 0.42 also takes 10 cm more of whatever the
// player is meant to see past that wall, which is why it is 0.42 and not the 0.60 that would
// clear a chair.
// ---- doll's house
//
// The one predicate the walls-down camera is built on. Every limit it releases below — the orbit
// cap, the room's own `near`, the ceiling stop, the shell's camera blockers and the cutaway itself
// — exists to keep a WALKING camera inside a room it can see out of, and not one of them is the
// right answer for a room that no longer has walls. They are released together or not at all: half
// of them released is an eye that rises to a ceiling it cannot pass, or backs out to a blocker
// 2.97 m away, which is the same stuck picture with more machinery behind it.
//
// Gated on `place` as well as the setting because only the tower's partitions carry the flag
// (js/home-walls.js) — the setting does nothing to the geometry of any other scene, so it must not
// move any other scene's camera either. Cheap: two reads, called a handful of times a frame, never
// per prop.
// Deck 2 and not the whole tower, and the lobby is why. Verified on the live site 2026-08-09:
// with the release gated on `place` alone, V in 一楼·大堂 craned the eye up into the underside of
// the street above and filled the frame with the top face of a slab, player included — the exact
// "staring at whatever surface is nearest" complaint, moved upward. The deck stamp is what saves
// this on deck 2 (an upper floor's slab is stamped and culled when drawDeck is 2), and the shell's
// own envelope is `undefined` and never culled, so deck 0's roof is opaque from on top of it and
// always will be. The partitions the setting hides are flat 202's anyway (js/home-walls.js), so
// this is the deck the feature is about; every other deck keeps the walking camera it had.
function dollHouse() {
  return SET.wallsOff && place === 'home' && !!scene.level && scene.level() === 2;
}
function hiddenAt(px, pz) {
  return (hideX > 0 && px > cutRoom.x1 - 0.42) || (hideX < 0 && px < cutRoom.x0 + 0.42) ||
         (hideZ > 0 && pz > cutRoom.z1 - 0.42) || (hideZ < 0 && pz < cutRoom.z0 + 0.42);
}
// Tagged parts hide as one object, so a fixture never loses half of itself to the cutaway.
function hiddenProp(p) {
  if (p.renderHidden) return true;
  // Another floor's geometry, in a building where every floor stands in the same (x, z). `-1` and
  // `undefined` are never culled: the first is anything riding the lift car, the second is the
  // shell — the building's own envelope belongs to every deck.
  if (p.deck !== undefined && p.deck >= 0 && drawDeck >= 0 && p.deck !== drawDeck) return true;
  // The building's own envelope opts out. Everything below represents a prop by a single point —
  // its own centre, or the centre of its tag group — and asks whether that point lies behind the
  // wall the eye has backed out through. Neither point means anything for geometry the size of
  // the building. A hotel floor's ceiling is one slab centred on (0, 0), and its four perimeter
  // walls share the tag 墙, whose group centre is also (0, 0) because four walls on four sides
  // average to the middle of the floor plate. So the moment a floor authored camera rooms, any
  // room not straddling the origin deleted the entire shell as soon as the eye stepped out of it
  // toward the centre of the floor: ceiling, far wall and side walls at once, leaving the clear
  // colour showing through. It reads as walls "rendering black", which is why it was reported as
  // a shading fault and why adding a light to the room changed nothing — there was no surface
  // there to light.
  //
  // Opting out rather than inventing a smarter point is what makes this safe. Under the old
  // floor-wide zone `hiddenAt(0, 0)` was already false in all four directions, so the shell was
  // never cut then either; and `blocker` keeps the eye inside the perimeter (js/hotel.js:181-184),
  // so cutting those walls away was never doing useful work. This restores what the shell had
  // before camera rooms existed. Nothing that does not set the flag can reach this line.
  if (p.nocut) return false;
  // Walls down. The flag is set where the partitions are built — js/home-walls.js, and the two
  // room files that stood their own wall before that module existed — so this is a set the room
  // authors named, not a shape this function guesses at. That matters because the alternative
  // (anything tall and thin) takes wardrobes and bookcases with it, and because a tag cannot be
  // used here at all: tags are scene-wide across twelve decks, so `墙` on deck 7 and `墙` on
  // deck 2 average their group centre into the middle of the shaft. A per-prop boolean has no
  // centre to average. Nothing outside the flat sets it, so no other place can be affected.
  if (SET.wallsOff && p.partition) return true;
  // A tag group only gets to speak for a prop when the whole group fits inside the room being
  // cut. `build.js:280` keys tagBox by tag alone and one Build.scene covers all twelve decks of
  // the tower, so a word reused per floor — 门, 窗户, 沙发, 电梯, 邻居 and eight more, 99 of 272
  // tags in this building — averages into a centre halfway up the shaft that no leaf occupies.
  // That point is behind almost any wall from almost any angle, so the props vanished and the
  // rooms behind them showed through: the floor-disappears report.
  //
  // Unlike inventing a smarter centre, this cannot make anything worse. The fallback is the
  // prop's own matrix translation — the same point every untagged prop is already judged by, and
  // the point the prop actually occupies. The group is used only where it is provably local, so
  // a genuine fixture still hides whole and nothing gains a vote it did not have before.
  const b = p.tag && scene.tagBox[p.tag];
  return b && b.x0 >= room.x0 && b.x1 <= room.x1 && b.z0 >= room.z0 && b.z1 <= room.z1
    ? hiddenAt(b.cx, b.cz) : hiddenAt(p.m[12], p.m[14]);
}

// How far an eye may travel from `origin` along `dir` before entering a camera-only building
// mass. Kept separate from the body colliders: a chair blocks feet but should not punch the camera
// into a close-up every time it passes under the lens, while a single-sided building absolutely
// must stop the eye or its far wall disappears. `top` lets a raised camera clear low roofs.
// `padOv` overrides every blocker's own pad. The camera never passes it — a building mass wants
// its 0.4 m of margin. The label occlusion test does: it is asking "is there a wall on this line",
// not "may the eye go here", and an inflated blocker seals doorways a label can legitimately be
// read through.
function cameraBlockLimit(origin, dir, maxDist, blockers, padOv) {
  let limit = maxDist;
  for (const b of blockers || []) {
    let t0 = 0, t1 = maxDist, hit = true;
    // How far outside its own footprint a blocker pushes the eye. 0.4 m is right for the thing
    // this list was written for — an outdoor building mass, where half a metre of margin costs
    // nothing because there is nothing on the other side to see. It is wrong for a 0.10 m interior
    // partition: inflated by 0.4 on each side, a 0.90 m internal doorway leaves the camera ray a
    // 0.10 m slot, so every doorway in the flat would read as sealed to the eye. A partition
    // asks for its own pad instead; everything already in the game omits the field and is
    // unchanged.
    const pad = padOv !== undefined ? padOv : b.pad === undefined ? 0.4 : b.pad;
    for (const [i, lo, hi] of [[0, b.x0 - pad, b.x1 + pad], [2, b.z0 - pad, b.z1 + pad]]) {
      if (Math.abs(dir[i]) < 1e-5) {
        if (origin[i] < lo || origin[i] > hi) { hit = false; break; }
        continue;
      }
      let ta = (lo - origin[i]) / dir[i], tb = (hi - origin[i]) / dir[i];
      if (ta > tb) { const q = ta; ta = tb; tb = q; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t1 < t0) { hit = false; break; }
    }
    // `bot` is what makes a blocker belong to one storey. 十八号楼's twelve decks share a single
    // (x, z) footprint — see APARTMENT-TENANT.md §3 — so a partition declared without a floor
    // would block the eye on all twelve. Every existing blocker omits it and spans everything,
    // which is what a building mass wants.
    const eyeY = origin[1] + dir[1] * t0;
    if (hit && t0 > 0.2 && eyeY < b.top && (b.bot === undefined || eyeY >= b.bot))
      limit = Math.min(limit, t0 - 0.05);
  }
  return limit;
}

// The flat's interior partitions, as occluders for the LABEL test only — never for the camera.
// They were built as camera blockers once and discarded on purpose: `camNear` asks 1.90 m of
// orbit and the 书房 is 1.20 m wide, so blocking the eye on them collapses the orbit to ~0.48 m
// and parks the camera inside the desk. A label is not the eye. Hiding one costs nothing, and
// being able to read the next room's contents through plaster is the reported bug.
//
// js/home-walls.js keeps each partition as a line — `ax` 0 is a wall at constant x spanning
// z lo..hi, `ax` 2 the transpose — with its door openings as ranges along that line. Split the
// line at the openings and each remaining stretch is a zero-thickness AABB, which is all the slab
// test above needs. Cached on the source array: the flat is built once.
let flatWallBlocks = null, flatWallSrc = null;
function flatLabelBlockers() {
  const W = (typeof HomeWalls !== 'undefined' && HomeWalls.WALLS) || null;
  if (!W || !W.length) return null;
  if (flatWallSrc === W) return flatWallBlocks;
  const out = [];
  for (const w of W) {
    const cuts = (w.doors || []).slice().sort((a, b) => a[0] - b[0]);
    let s = w.lo;
    for (const d of cuts) {
      if (d[0] > s) out.push([s, d[0], w.ax, w.at]);
      s = Math.max(s, d[1]);
    }
    if (w.hi > s) out.push([s, w.hi, w.ax, w.at]);
  }
  // `top` Infinity is safe only because the caller gates this on deck 2. Twelve decks share one
  // (x, z) footprint and these are flat 202's partitions, not deck 7's.
  flatWallBlocks = out.map(q => q[2] === 0
    ? { x0: q[3], x1: q[3], z0: q[0], z1: q[1], top: Infinity }
    : { x0: q[0], x1: q[1], z0: q[3], z1: q[3], top: Infinity });
  flatWallSrc = W;
  return flatWallBlocks;
}

// Ray from the eye through a point on the canvas, in world space.
function cursorRay(px, py) {
  // R's cached CSS size, not cv.clientWidth: this runs under the per-frame pick, and reading
  // layout after the label loop's DOM writes forces a full synchronous reflow. See R.cssSize.
  const w = R.cssW, h = R.cssH;
  if (!w || !h) return null;
  const nx = (px / w) * 2 - 1, ny = 1 - (py / h) * 2;
  const t = Math.tan(CAM.fov / 2);
  const d = [
    cam.fwd[0] + cam.right[0] * nx * t * cam.aspect + cam.up[0] * ny * t,
    cam.fwd[1] + cam.right[1] * nx * t * cam.aspect + cam.up[1] * ny * t,
    cam.fwd[2] + cam.right[2] * nx * t * cam.aspect + cam.up[2] * ny * t,
  ];
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
}

function pickUnderCursor() {
  if (!mouse.inside) return null;
  const d = cursorRay(mouse.x, mouse.y);
  if (!d) return null;
  return scene.pick(eye, d, hiddenProp);
}

const startButton = $('#start');
startButton.disabled = false;
startButton.textContent = '进入 · PLAY';
startButton.onclick = () => {
  // This click is the browser's permission to make sound later. Nothing plays on the title
  // screen; it only wakes the train audio and begins decoding the short station clips.
  TrainAudio.unlock();
  Speech.unlock();
  // Every voice in the game is a file fetched from audio/voice. If that list cannot be read then
  // nobody can speak, and the player needs telling why rather than being left in a silent city.
  Speech.ready().then(() => {
    const why = Speech.trouble();
    if (why) toast(`没有声音 · <span class="dim">no voices: ${why}</span>`);
  });
  // Back to the flat, at two in the afternoon, wherever the title had wandered off to.
  endTitle();
  $('#intro').classList.add('gone'); started = true;
  setSurfaceOpen('#intro', false);
  setGameplayAccessible(true);
  // Brings the HUD up. Everything in #ui is held at zero opacity until this lands, so that the
  // title screen is not sharing the frame with a clock and a line map.
  document.body.classList.add('playing');
};

// The long-form explanation, moved off the front of the title screen and behind a button.
$('#howtoOpen').onclick = () => window.setHowtoOpen ? window.setHowtoOpen(true)
  : $('#howto').classList.add('on');
$('#howtoClose').onclick = () => window.setHowtoOpen ? window.setHowtoOpen(false)
  : $('#howto').classList.remove('on');
$('#howto').onclick = e => {
  if (e.target.id === 'howto') window.setHowtoOpen ? window.setHowtoOpen(false)
    : $('#howto').classList.remove('on');
};

// ---------------------------------------------------------------- the title camera
// The renderer is already running while the title is up — `started` gates the clock, the needs
// and the HUD, never the frame — so the title screen is a live view of the game rather than a
// picture of one. Which means it can show the game, and one room is a poor advertisement for
// a city: the pillars beside it promise an alley, a noodle house and a flight south, so the
// camera goes and stands in them.
//
// Every place is already built at load — PLACES holds constructed scene objects, not factories —
// so a cut costs a pointer change and nothing else. `setPlace` is the same door the travel code
// and the screenshot harness go through.
//
// Each shot sets the clock as well as the camera, because the hour is half of what a place looks
// like and it also decides who is standing in it: the stall keeper works 5–14, the diner's
// customer takes her stool over lunch, and Pudong does not light up until the evening.
const TITLE_SHOTS = [
  // p is where the body stands, c is [yaw, pitch, distance] around it — the same shape the audit
  // harness uses, and these are lifted from shots in it that were already framed by eye.
  { place: 'home',   hour: 14.0, secs: 7.0, p: [2.30, 2.05, Math.PI * 0.85],
    look: 1.16, c: [Math.PI * 0.62, 0.30, 6.15] },
  { place: 'street', hour: 8.6,  secs: 8.0, p: [-4.0, 0.4, Math.PI * 0.5],
    look: 2.30, c: [Math.PI * 0.56, 0.26, 11.0] },
  { place: 'diner',  hour: 12.5, secs: 7.0, p: [1.6, -1.6, 0],
    look: 1.35, c: [Math.PI * 0.10, 0.24, 4.8] },
  // Blue hour rather than night. At half past seven the lamps and the Pearl are lit but the
  // towers behind them have gone to flat grey silhouettes, and under the title's own wash —
  // which is heaviest exactly where this shot is darkest — the left half of the frame went to
  // mud. An hour earlier there is still sky behind them to read them against.
  { place: 'bund',   hour: 18.7, secs: 8.0, p: [4, 0.8, Math.PI],
    look: 3.00, c: [Math.PI, 0.12, 8.4] },
  // The upgraded cabin earns a place on the title reel: a warm dusk departure viewed down both
  // aisles, with the new premium seats, screens and mood lighting all visible at once.
  // Where the body stands is given as a function here rather than three numbers, because the three
  // numbers are measured off the aeroplane — and reading them is what builds one. A title reel that
  // may never reach this shot should not cost a cabin at boot, so the measuring is put off until
  // the cut actually happens, by which time `setPlace` has built the room anyway.
  { place: 'cabin', hour: 19.2, secs: 7.0, p: () => [-Cabin.AISLE, Cabin.GALLEY - .62, Math.PI],
    look: 1.28, c: [Math.PI, .18, 3.15] },
];
const SHOT_CUT = 0.75;             // seconds of black either side of a cut
let shotNow = -1;                  // which shot is set up, so the cut happens once
let cutAt = -99;                   // when that switch happened, which is what the black fades from
// Screenshot harness only: hold one shot instead of cycling, so a picture of the third shot does
// not mean waiting twenty-six seconds for it to come round. -1 is the game's own behaviour.
let shotHold = -1;
const shotCut = $('#introCut');

// What the game must be returned to when PLAY is pressed, captured before the title has moved
// anything. Restoring by hand from the literals at the top of this file would work right up
// until somebody changed one of them and not this.
const BOOT = { place, x: P.x, z: P.z, yaw: P.yaw, minutes,
               camYaw: CAM.tYaw, camPitch: CAM.tPitch, camDist: CAM.tDist };

// Which shot the cycle opens on, chosen once per load. Thirty seconds of footage is longer than
// most people look at a title screen, so with a fixed running order almost every player would
// only ever have seen the apartment — and the apartment is the least interesting of the four.
// Starting somewhere different each time means the alley and the Bund get seen too.
const shotFrom = Math.random() * TITLE_SHOTS.reduce((a, s) => a + s.secs, 0);
const shotT0 = performance.now() / 1000;

function titleCamera(now) {
  const t = shotFrom + now / 1000;
  const loop = TITLE_SHOTS.reduce((a, s) => a + s.secs, 0);
  let u = t % loop, i = 0;
  while (u >= TITLE_SHOTS[i].secs) { u -= TITLE_SHOTS[i].secs; i++; }
  if (shotHold >= 0) { i = shotHold % TITLE_SHOTS.length; u = SHOT_CUT + 1; }
  const s = TITLE_SHOTS[i];
  if (i !== shotNow) {
    shotNow = i;
    cutAt = t;                      // latch: the black now ramps down from *here*
    setPlace(s.place);
    minutes = s.hour * 60;
    const p = typeof s.p === 'function' ? s.p() : s.p;
    P.x = p[0]; P.z = p[1]; P.yaw = p[2];
  }
  // Black across the join. A hard cut between two rooms at two hours of the day reads as a
  // glitch; three quarters of a second of black reads as an edit.
  //
  // The ramp *out* is measured from the switch rather than from the time boundary, and that is
  // not a detail. Computed from `u` alone, the blackness is a function of time while the switch
  // is a function of crossing a boundary, so on a machine dropping frames the room can change
  // on a frame where the screen is only half covered — measured at 0.55 opacity under software
  // rendering, which is a visible dissolve between two different cities. Latching guarantees the
  // cut itself is under full black whatever the frame rate.
  if (shotCut) {
    const out = 1 - (t - cutAt) / SHOT_CUT;                 // fading up from the cut
    const into = 1 - (s.secs - u) / SHOT_CUT;               // fading down toward the next one
    const open = 1 - (now / 1000 - shotT0) / 1.1;           // and the fade the title opens on
    shotCut.style.opacity = clamp(Math.max(out, into, open), 0, 1).toFixed(3);
  }
  // Then the move. Slow is the whole trick: much above 0.05 rad/s and the cutaway walls pop in
  // and out as the eye crosses them, which reads as a bug rather than as a camera.
  CAM.fx = P.x; CAM.fz = P.z;
  CAM.lookY = s.look;
  CAM.yaw = s.c[0] + u * 0.030;
  CAM.pitch = s.c[1] + Math.sin(t * 0.13) * 0.045;
  CAM.dist = s.c[2] * (1 + Math.sin(t * 0.088) * 0.055);
}

// Put back everything the title moved. Without this, pressing PLAY on the fourth shot starts
// the game on the Bund at half past seven in the evening with no flight and ¥260.
function endTitle() {
  // The rest of the model library, pulled down quietly from here. Boot only fetched what the
  // five rooms built at load needed; this is everything else, and it has the whole time somebody
  // spends walking around their flat to arrive before any of it is asked for.
  if (typeof Assets !== 'undefined') Assets.warm();
  setPlace(BOOT.place, { x: BOOT.x, z: BOOT.z, yaw: BOOT.yaw });
  minutes = BOOT.minutes;
  // And then, if there is one, the life that was already under way — over the top of the defaults,
  // so a build with no save behind it still opens exactly where it always did.
  // The fridge was filled at module load, where the flat's other starting facts are set. Fill it
  // again: the four title shots run the clock forward through several days of a life that is not
  // yours, and the bread you are about to move in on should not already be stale.
  Pantry.seed(day);
  const resumed = loadGame();
  if (resumed) {
    updateHud(); updateNeeds();
    toast(`回来了 · <span class="dim">day ${day}, picking up where you left off</span>`);
  } else {
    CAM.tYaw = CAM.yaw = BOOT.camYaw;
    CAM.tPitch = CAM.pitch = BOOT.camPitch;
    CAM.tDist = CAM.dist = BOOT.camDist;
    CAM.lookY = 1.10;
  }
  if (shotCut) shotCut.style.opacity = 0;
}

// ---------------------------------------------------------------- card
function closeCard() {
  cardOpen = false; cardWord = null; quiz = null; revealTok++;
  act = null;                     // let the body ease back up to standing
  $('#card').classList.remove('on', 'asking');
  setSurfaceOpen('#card', false);
}

function fmtIn(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return Math.max(1, s) + 's';
  const m = Math.round(s / 60);
  return m < 60 ? m + 'm' : Math.round(m / 60) + 'h';
}

function feedback(text, cls) {
  const el = $('#card .fb');
  el.innerHTML = text || '';
  el.className = 'fb' + (text ? ' on' : '') + (cls ? ' ' + cls : '');
}

// The full word card: everything you are still allowed to see about this word.
function showWord(hz) {
  const e = Vocab.get(hz), st = Vocab.stage(hz), th = thingOf[hz], c = $('#card');
  c.classList.remove('asking');
  c.querySelector('.hz').textContent = hz;
  c.querySelector('.py').textContent = st < 2 ? e.py : '';
  c.querySelector('.en').textContent = st < 2 ? e.en : '';
  if (th) {
    c.querySelector('.sent').innerHTML = Vocab.sentenceHTML(th.sentence);
    const unknown = Vocab.tokenize(th.sentence).some(x => x.e && !Vocab.mastered(x.t));
    c.querySelector('.tr').textContent = unknown ? th.tr : '';
    c.querySelector('.note').textContent = th.note;
  } else {
    c.querySelector('.sent').innerHTML = '';
    c.querySelector('.tr').textContent = '';
    c.querySelector('.note').textContent = '';
  }
  c.querySelector('.bar i').style.width = (Vocab.progress(hz) * 100).toFixed(0) + '%';
  c.querySelector('.stage').textContent =
    ['全部提示 · full help', '拼音 · pinyin only', '已掌握 · mastered'][st];
}

// The recall check: hanzi (or a gloss) and four choices, nothing else.
function ask(hz) {
  const q = Vocab.quiz(hz);
  if (!q || q.options.length < 2) { showWord(hz); return; }
  quiz = { hz, q, answered: false };
  const c = $('#card');
  c.classList.add('asking');
  c.querySelector('.hz').textContent = '？';
  c.querySelector('.py').textContent = '';
  c.querySelector('.en').textContent = '复习 · recall check';
  c.querySelector('.qh').textContent = q.hint;
  const qp = c.querySelector('.qp');
  qp.textContent = q.prompt;
  qp.className = 'qp' + (q.kind === 'produce' ? ' small' : '');
  const opts = c.querySelector('.opts');
  opts.style.pointerEvents = '';
  opts.innerHTML = q.options.map((o, i) =>
    `<button class="opt${q.kind === 'produce' ? ' hanzi' : ''}" data-i="${i}">` +
    `<span class="num">${i + 1}</span><span class="txt">${o.label}</span></button>`).join('');
  opts.querySelectorAll('.opt').forEach(b => { b.onclick = () => answer(+b.dataset.i); });
  feedback('');
}

function answer(i) {
  if (!quiz || quiz.answered) return;
  quiz.answered = true;
  const { hz, q } = quiz;
  const e = Vocab.get(hz);
  const correct = i === q.answer;

  const opts = $('#card .opts');
  opts.style.pointerEvents = 'none';
  const btns = opts.querySelectorAll('.opt');
  if (btns[q.answer]) btns[q.answer].classList.add('good');
  if (!correct && btns[i]) btns[i].classList.add('bad');

  const res = Vocab.grade(hz, correct);
  refreshUI();

  if (correct) {
    if (res.retired) toast(`记住了 · <span class="hz">${hz}</span> &nbsp;retired from review`);
    else if (res.promoted) toast(res.stage === 2
      ? `已掌握 · <span class="hz">${hz}</span> &nbsp;the game stops translating it`
      : `进步 · <span class="hz">${hz}</span> &nbsp;English hidden from now on`);
  } else if (res.demoted) {
    toast(`再看看 · <span class="hz">${hz}</span> &nbsp;help comes back for a while`);
  }

  // let the marked choices land, then open the word up again
  const tok = ++revealTok;
  setTimeout(() => {
    if (tok !== revealTok || !cardOpen || cardWord !== hz) return;
    quiz = null;
    showWord(hz);
    feedback(correct
      ? `对了 · correct. Next check in ${fmtIn(res.nextIn)}.`
      : `不对 · <b>${hz}</b> is ${e.py} — ${e.en}. It comes back in ${fmtIn(res.nextIn)}.`,
      correct ? 'win' : 'lose');
  }, correct ? 500 : 1100);
}

// Every route into the card goes through here.
function openWord(hz) {
  const e = Vocab.get(hz);
  if (!e || doing) return;      // an action owns the body until it ends
  revealTok++;
  quiz = null;
  cardWord = hz;
  cardOpen = true;
  $('#card').classList.add('on');
  setSurfaceOpen('#card', true);

  // only play a physical interaction when you are actually standing next to it
  // (clicking something across the room should not teleport you into it)
  act = actionFor(reachThing && reachThing.hz === hz ? reachThing : null);

  if (Vocab.exposure(hz) < 1) {
    Vocab.introduce(hz);
    showWord(hz);
    feedback('新词 · first meeting. It will come back for a recall check shortly.');
    toast(`新词 · new word &nbsp;<span class="hz">${hz}</span> &nbsp;${e.py} — ${e.en}`);
  } else if (Vocab.retired(hz)) {
    showWord(hz);
    feedback('记住了 · this one is yours. No more checks.', 'win');
  } else if (Vocab.isDue(hz)) {
    ask(hz);
  } else {
    showWord(hz);
    feedback(`下次复习 · next check in ${fmtIn(Vocab.dueIn(hz))}. Looking again is free; recalling is what counts.`);
  }
  refreshUI();
}

function interact() { if (activeThing) openWord(activeThing.hz); }

// Most dictionary glosses are bare nouns ("bed"), which read naturally after "the" in the
// walk-up prompt. Some deliberately carry their own article ("a drink", "the Bund"). Do not
// stack another one in front of those and produce lines such as "the a drink".
function promptGloss(en) {
  const head = String(en || '').split(',')[0].trim();
  return /^(?:a|an|the|some|this|that|these|those|my|your|his|her|our|their)\b/i.test(head)
    ? head : `the ${head}`;
}

function review() {
  const due = Vocab.dueList();
  if (!due.length) {
    const n = Vocab.count();
    toast(n ? '没有要复习的词 · nothing due yet' : '还没有生词 · meet a word first, press E');
    return;
  }
  openWord(due[0]);
}

// ---------------------------------------------------------------- 说话 a conversation
// Opened by talking to somebody who still has a question outstanding. Their line plays on the way
// in, in their own voice, from where they are standing — and the written help is whatever your
// vocabulary has earned: `sentenceHTML` puts pinyin over what you have not mastered and leaves the
// rest bare. The English sits behind a button, because a translation you needed and a translation
// you did not are two different pieces of evidence about the same sentence.
function conversationFrame(n) {
  const dx = n.x - P.x, dz = n.z - P.z, near = Math.max(0.5, Math.hypot(dx, dz));
  const yaw = near > 0.06 ? Math.atan2(dx, dz) : P.yaw;
  // Target to the speaker's screen-right, so their face lands in the clear left margin beside the
  // central dialogue card. On a narrow screen there is no useful margin, so the offset relaxes and
  // the camera simply becomes a calm over-the-shoulder view behind the panel.
  // 1.18 m puts the whole head-and-shoulders silhouette in the 300 px gutter at 1280 wide.
  // At 0.90 the eye line landed correctly but the dialogue card still covered half the face —
  // technically composed, visually no better than leaving the ordinary follow camera in place.
  const margin = (R.cssW || cv.clientWidth || 0) >= 980 ? 1.18 : 0.34;
  const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
  return {
    focus: [n.x + rightX * margin, n.z + rightZ * margin],
    yaw, pitch: 0.16, dist: clamp(3.08 + near * 0.18, 3.20, 3.58), lookY: 1.38,
  };
}
function openTalk(n) {
  const nx = Talk.next(n);
  if (!nx) return;
  const camera = { yaw: CAM.tYaw, pitch: CAM.tPitch, dist: CAM.tDist, lookY: CAM.lookY };
  talkAt = { n, at: nx.at, turn: nx.turn, script: nx.script, of: nx.script.turns.length,
             heard: 0, translated: false, answered: false, camera,
             frame: conversationFrame(n) };
  talkOpen = true;
  // This is a target rather than a cut. The ordinary camera damping moves into the shot while
  // the panel opens, and closeTalk restores the player's orbit target for the same smooth handoff.
  CAM.tYaw += angleDelta(talkAt.frame.yaw, CAM.tYaw);
  CAM.tPitch = talkAt.frame.pitch;
  CAM.tDist = talkAt.frame.dist;
  CAM.lookY = talkAt.frame.lookY;
  CAM.spin = 0;
  $('#talk').classList.add('on');
  setSurfaceOpen('#talk', true);
  renderTalk();
  sayTalk(nx.turn.ask[0]);
}
// Out loud, from where they are. `speakUntil` keeps the mouth and the hands going for as long as
// the line lasts, the same way a bark does.
function sayTalk(zh) {
  if (!talkAt) return;
  talkAt.heard++;
  const secs = Speech.npc(talkAt.n, zh, listenFrom(talkAt.n));
  if (secs > 0) talkAt.n.speakUntil = performance.now() + secs * 1000 + 120;
}
// The pinyin of a whole phrase, for the replies. They are glossed outright: choosing what to say
// is not what is being tested, and a reply you cannot read is a coin toss rather than an answer.
function pinyinOf(zh) {
  // Punctuation is a token like any other to the segmenter, so it has to be dropped here or the
  // gloss comes out as "dui , wo shi xin lai de ." with the commas spaced off on their own.
  return Vocab.tokenize(zh)
    .filter(({ t, e }) => e || !/^[\s，。！？、：；…—·"'()（）]+$/.test(t))
    .map(({ t, e }) => e ? e.py : t)
    .join(' ');
}
function renderTalk() {
  const t = talkAt;
  if (!t) return;
  const el = $('#talk'), n = t.n;
  el.querySelector('.nm').textContent = n.name || n.hz;
  el.querySelector('.rl').textContent = n.py || '';
  el.querySelector('.ct').textContent = `问题 ${t.at + 1}/${t.of}`;
  el.querySelector('.said').innerHTML = Vocab.sentenceHTML(t.turn.ask[0]);
  const tr = el.querySelector('.tr');
  tr.textContent = t.turn.ask[1];
  tr.classList.toggle('on', t.translated);
  el.querySelector('.show').classList.toggle('used', t.translated);
  el.querySelector('.again').classList.toggle('used', t.heard > 1);
  const opts = el.querySelector('.opts');
  opts.textContent = '';
  t.turn.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt hanzi';
    b.innerHTML = `<span class="num">${i + 1}</span><span class="txt">${o.zh}` +
      `<span class="gl">${pinyinOf(o.zh)} · ${o.en}</span></span>`;
    b.onclick = () => reply(i);
    opts.appendChild(b);
  });
  el.querySelector('.again').onclick = againTalk;
  el.querySelector('.show').onclick = translateTalk;
  const fb = el.querySelector('.fb');
  fb.className = 'fb'; fb.innerHTML = '';
}
function againTalk() {
  if (!talkAt || talkAt.answered) return;
  sayTalk(talkAt.turn.ask[0]);
  $('#talk .again').classList.add('used');
}
function translateTalk() {
  if (!talkAt) return;
  talkAt.translated = true;
  $('#talk .tr').classList.add('on');
  $('#talk .show').classList.add('used');
}
// Answering. What it costs to be wrong is the turn staying open — they will ask again next time —
// and what it buys is the English, because a question you did not understand is the one moment
// showing you the answer teaches something.
function reply(i) {
  const t = talkAt;
  if (!t || t.answered) return;
  const res = Talk.answer(t.n, t.at, i);
  if (!res) return;
  t.answered = true;
  // A selected line is the player's speaking beat even though only the NPC voice is synthesised.
  // The body acknowledges it for one second; no dialogue timing or audio is delayed.
  t.playerBeat = performance.now();
  const el = $('#talk');
  const btns = el.querySelectorAll('.opt');
  btns.forEach((b, k) => {
    b.disabled = true;
    if (k === i) b.classList.add(res.ok ? 'good' : 'bad');
    else if (!res.ok && t.turn.opts[k].ok) b.classList.add('good');
  });
  // Their answer, spoken, and it replaces the question on the panel — the exchange has moved on.
  el.querySelector('.said').innerHTML = Vocab.sentenceHTML(res.then[0]);
  const tr = el.querySelector('.tr');
  tr.textContent = res.then[1];
  if (t.translated || !res.ok) tr.classList.add('on');
  sayTalk(res.then[0]);
  if (!res.ok) { t.translated = true; }
  // What it did to your vocabulary, named word by word: this is the only place in the game where
  // understanding a spoken sentence is what moves a word, so it is worth showing the working.
  const moved = res.moved.map(m =>
    `<b>${m.hz}</b> ${m.correct ? '+' : '−'}${m.promoted ? '↑' : m.demoted ? '↓' : ''}`).join(' · ');
  const fb = el.querySelector('.fb');
  fb.className = 'fb on ' + (res.ok ? 'win' : 'lose');
  fb.innerHTML = res.ok
    ? `听懂了 · <b>understood</b>${moved ? ' — ' + moved : ''}` +
      `<br><span class="dim">${t.heard > 2 ? 'you listened ' + (t.heard - 1) + ' times. ' : ''}` +
      `E 关掉 · close</span>`
    : `没听懂 · <b>not what they asked</b>${moved ? ' — ' + moved : ''}` +
      `<br><span class="dim">他们会再问一次 · they will ask again — the English is above now</span>`;
  // ---- and what it does to you. Needs are the world's own currency, and a word handed over is
  // the other reward: it goes into the notebook at the bottom rung, met rather than mastered.
  if (res.gain) for (const k in res.gain) needs[k] = clamp(needs[k] + res.gain[k], 0, 100);
  if (res.learn && Vocab.introduce(res.learn)) {
    const e = Vocab.get(res.learn);
    toast(`新词 · <b>${res.learn}</b> <span class="dim">${e ? e.py + ' · ' + e.en : ''}</span>`);
  }
  // ---- and what it does to *them*. This is the only place a relationship moves, and it moves on
  // whether you understood, never on how often you turned up: a person you have followed eight
  // times knows you, and a person you have stood in front of eighty times without following once
  // does not. Mishearing costs nothing, because somebody trying to keep up and failing is not
  // being rude, and a penalty there would teach the player to avoid exactly the conversations
  // they most need to have.
  const felt = Story.heard(t.n, res.ok, day);
  if (felt && felt.rose)
    setTimeout(() => toast(`${t.n.name || t.n.hz} · <b>${Vocab.sentenceHTML(felt.level.hz)}</b> ` +
      `<span class="dim">${felt.level.en} — ${felt.ok} conversations you have followed</span>`), 900);
  storyBeat();
  refreshUI();
}

// A chapter can close on the back of almost anything — a conversation followed, a promotion, a
// district stood in for the first time — so the check is one call and every one of those places
// makes it. It costs a handful of counter reads and it fires once.
function storyBeat() {
  const done = Story.check(day);
  if (!done) return;
  const nextCh = Story.progress();
  setTimeout(() => toast(`${Vocab.sentenceHTML(done.say[0])} ` +
    `<span class="dim">${done.say[1]}</span>`), 1500);
  logDiary(done.say[0], `${done.en} — ${done.say[1]}`, 'story');
  if (nextCh)
    setTimeout(() => toast(`新的一章 · <b>${nextCh.ch.hz}</b> ` +
      `<span class="dim">${nextCh.ch.en} — ${nextCh.ch.blurb[1]}</span>`), 4200);
  saveGame();
}
function closeTalk() {
  if (!talkOpen) return;
  const camera = talkAt && talkAt.camera;
  talkOpen = false; talkAt = null;
  if (camera) {
    CAM.tYaw = camera.yaw;
    CAM.tPitch = camera.pitch;
    CAM.tDist = camera.dist;
    CAM.lookY = camera.lookY;
    CAM.spin = 0;
  }
  $('#talk').classList.remove('on');
  setSurfaceOpen('#talk', false);
}
let toastT = 0;
function toast(html) {
  const el = $('#toast');
  el.innerHTML = html; el.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.style.opacity = 0, 3200);
}

// ---------------------------------------------------------------- notebook
function toggleBook() {
  bookOpen = !bookOpen;
  $('#book').classList.toggle('on', bookOpen);
  setSurfaceOpen('#book', bookOpen);
  if (bookOpen) renderBook();
}
// The twelve topics the dictionary's fourth column already carries (`Vocab.TOPICS`), named. The
// notebook was one flat list sorted by how well you knew each word, which is the right order for
// nothing you would ever look up: a hotel stay teaches 押金, 房卡, 退房 and 前台 in one afternoon
// and they landed scattered between the vegetables and the subway. No hotel topic exists in
// vocab.js, and adding one there is a locked-file change — the stay's words distribute over 钱,
// 家里 and 交际, which is still a grouping the player can navigate.
const BOOK_TOPICS = {
  food:['吃的','food'], direction:['方向','getting around'], time:['时间','time'],
  clothing:['穿的','clothes'], medical:['看病','health'], number:['数字','numbers'],
  money:['钱','money'], work:['工作','work'], social:['交际','people'],
  transport:['交通','transport'], weather:['天气','weather'], home:['家里','indoors'],
};

function renderBook() {
  renderStoryPanel();
  const list = Vocab.everything();
  const host = $('#bookList');
  const rowHTML = w => `
    <div class="row${w.due ? ' due' : ''}${w.retired ? ' done' : ''}" data-hz="${w.hz}">
      <div class="h">${w.hz}</div>
      <div class="m">${w.st < 2 ? `<i>${w.py}</i>` : ''}${w.st < 2 ? w.en : '<span style="opacity:.4">— no help needed —</span>'}</div>
      ${w.due ? '<div class="tag">复习</div>' : ''}
      <div class="lv"><i style="width:${(Math.min(1, w.n / Vocab.MAX) * 100).toFixed(0)}%"></i></div>
    </div>`;
  // Due first, exactly as the flat list did — that is the one ordering the notebook was already
  // right about, and grouping must not bury the words the game is about to ask you for.
  const groups = [];
  const due = list.filter(w => w.due);
  if (due.length) groups.push(['复习', 'due for recall', due]);
  for (const t of Vocab.TOPICS) {
    const ws = list.filter(w => !w.due && w.topic === t);
    if (ws.length) groups.push([BOOK_TOPICS[t][0], BOOK_TOPICS[t][1], ws]);
  }
  // Most rows in the file carry no fourth column at all, so this bucket is large and must exist.
  const rest = list.filter(w => !w.due && !w.topic);
  if (rest.length) groups.push(['其他', 'everything else', rest]);
  const head = (hz, en, n) => `<h3 style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;`
    + `opacity:.34;font-weight:500;margin:16px 0 6px">${hz} · ${en} <b style="opacity:.7">${n}</b></h3>`;
  host.innerHTML = list.length
    ? groups.map(([hz, en, ws]) => head(hz, en, ws.length) + ws.map(rowHTML).join('')).join('')
    : '<div style="opacity:.4;font-size:12.5px;line-height:1.8">Nothing yet. Walk up to something and press E.</div>';
  host.querySelectorAll('.row.due').forEach(r => {
    r.onclick = () => openWord(r.dataset.hz);
  });
}

// The chapter, what it is still waiting for, and who in this city knows your face. The counters are
// shown as met/wanted rather than as ticks, because every one of them is a thing you are doing
// anyway — the panel is a description of how you have been living, not a list of errands.
function renderStoryPanel() {
  const host = $('#bookStory');
  if (!host) return;
  const p = Story.progress();
  const people = Story.people();
  const who = people.length
    ? people.slice(0, 8).map(x =>
        `<div class="prow"><span class="pn">${x.name}</span>` +
        `<span class="pl">${x.level.hz}<i>${x.level.en}</i></span>` +
        `<span class="pc">${x.ok}</span></div>`).join('')
    : '<div class="pnone">Nobody yet. Answer what somebody actually asked you.</div>';

  if (!p) {
    host.innerHTML = `<div class="chap done"><b>故事讲完了</b>` +
      `<span>Every chapter closed. The city is yours.</span></div>` +
      `<div class="people"><h3>认识的人 · people who know you</h3>${who}</div>`;
    return;
  }
  const f = p.facts;
  // Each want is paired with the number behind it, so "two people at 朋友" reads as 1/2 rather
  // than as a sentence you cannot check.
  const got = [
    ['words', f.words], ['mastered', f.mastered], ['rank', f.rank], ['jobs', f.jobs],
    ['understood', f.understood], ['friends', f.friends], ['close', f.close],
    ['places', f.places], ['bund', f.bund ? 1 : 0], ['clocked', f.clocked],
  ];
  host.innerHTML =
    `<div class="chap"><b>第${p.i + 1}章 · ${p.ch.hz}</b>` +
    `<span>${p.ch.en} — ${p.ch.blurb[1]}</span>` +
    `<div class="want">${p.want.map(w => `<span>${w}</span>`).join('')}</div>` +
    `<div class="nums">${got.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div></div>` +
    `<div class="people"><h3>认识的人 · people who know you</h3>${who}</div>`;
}

function refreshUI() {
  allThings.forEach(paintLabel);
  refreshDue();
  updateHud();
  if (bookOpen) renderBook();
}
function refreshDue() {
  for (const th of allThings) th.el.classList.toggle('due', Vocab.isDue(th.hz));
}

// ---------------------------------------------------------------- character
// What you are wearing. Changing at the wardrobe swaps these with a shirt off the rail and
// hangs the old one back up, so the clothes are real objects that move between two places.
let TOP = C('#47766f'), TOPL = C('#5c8980'), TOPD = C('#315b57');
function wearFromRail(i) {
  const slot = World.rail && World.rail[i];
  if (!slot) return null;
  const old = TOP;
  TOP = slot.color; TOPL = tint(TOP, 1.24); TOPD = tint(TOP, 0.76);
  slot.color = old;
  for (const p of slot.props) p.color = old;
  return slot;
}
// You: travel clothes and the daypack the intro hands you. TOP is kept in step with the
// wardrobe every frame, so changing your shirt changes the body that is drawn.
const PLAYER = makeLook({ skin:'#e4b08d', hair:'#3f3029', hairStyle:'tousled',
  top:'#ece6d9', jacket:'#47766f', pants:'#34465b', shoe:'#e8e2d6', collar:'shirt',
  sleeve:'half', pack:true, packColor:'#b3603b', faceSeed:41, faceVary:0.76 });
const face = {};                  // blink and gaze, kept out of the eased pose

// Physical poses share one skeleton. Objects not listed use the reaching pose;
// seating and bedding provide an exact body anchor instead of teleporting loosely.
const ACT = {
  '沙发': { type: 'sit', at: [-1.35, 2.14], yaw: Math.PI, seatY: 0.55, recline: 0.10 },
  '椅子': { type: 'sit', at: [1.12, -1.72], yaw: Math.PI, seatY: 0.50 },
  // `seatY` everywhere here is the height of the surface itself — the cushion, the seat, the
  // mattress. How far above it the hips end up is the body's business, not the furniture's.
  '床':   { type: 'lie', at: [-2.45, -1.42], yaw: 0, seatY: 0.60 },
  '枕头': { type: 'lie', at: [-2.45, -1.42], yaw: 0, seatY: 0.60 },
};
function actionFor(th) {
  if (!th) return null;
  const preset = ACT[th.hz];
  return preset ? { ...preset, hz: th.hz, target: th.pos }
                : { type: 'reach', hz: th.hz, target: th.pos };
}

// How far the hip joint rides above whatever you are sitting on, and how far the sole sits
// below the knee with the shin hanging straight down. Both are properties of the body, so
// they are shared by the player and by every neighbour who sits down anywhere.
const SEAT_LIFT = 0.085, SHIN_DROP = 0.474;

const pose = { ...POSE };       // retained, time-filtered base pose
const poseOut = { ...POSE };    // one allocation-free presentation layer reused every frame
const poseAct = { ...POSE };    // where the body is within the current action
let actMix = 0;                 // 0 = locomotion, 1 = fully into the action
let playerTalkMix = 0, playerTalkSubject = null;
// Anything that repeats faster than the settling filters — chewing, stirring, scrubbing,
// typing — is handed over separately and added after the easing, or a 0.26s time constant
// would swallow it whole and the body would just hold a stiff pose.
let actOsc = null;
// The kind outlives `act` for the fraction of a second in which the body is coming back out of an
// action. It is what lets a chair release the hips more slowly than a button releases a fingertip,
// and lets sleeping eyes open with the same blend that brings the body up off the mattress.
let poseBlendKind = null;
let wakeMotionAt = -1;
let characterMotionPreview = null;

// Two layers, because one rate cannot serve both jobs. The gait needs a short time constant
// or the stride smears, but sitting reuses those same leg channels and a short constant there
// would throw the legs 0.9 rad in a single frame. So changing what the body is doing eases
// slowly, and the fast per-channel damping on top only removes residual steps.
function computePose(now, dt) {
  // Animation telemetry, measured from what actually happened rather than what the keys asked for.
  // Acceleration gives starts and stops their weight; vertical speed tells the shared gait that the
  // room has raised or lowered the floor beneath it. Both are damped before the rig sees them, so a
  // flight of discrete treads reads as one climb instead of a pulse on every stair edge.
  const ground = P.ground || 0, floor = P.lift || 0;
  if (dt > 0) {
    const lastGround = P.animGround === undefined ? ground : P.animGround;
    const lastFloor = P.animFloor === undefined ? floor : P.animFloor;
    P.animAccel = lerp(P.animAccel || 0, (ground - lastGround) / dt,
      1 - Math.exp(-dt / 0.11));
    const rising = ground > 0.08 ? (floor - lastFloor) / dt : 0;
    P.animClimb = lerp(P.animClimb || 0, rising, 1 - Math.exp(-dt / 0.15));
    P.animGround = ground; P.animFloor = floor;
  }
  if (act) {
    if (act.startedAt === undefined) act.startedAt = now;
    if (!act.kind) act.kind = actionKind(act, doing && doing.def, doing && doing.th);
    poseBlendKind = act.kind;
  }
  const loco = locomotion(now);
  actOsc = null;
  const goal = act ? actionPose(now) : poseAct;     // leaving an action holds its last pose
  const osc = actOsc;
  if (act && actMix < 0.05) for (const k in poseAct) poseAct[k] = goal[k];
  const seatedKind = /^(sit|sleep|rest)$/.test(poseBlendKind || '');
  const slow = 1 - Math.exp(-dt / (seatedKind ? 0.34 : 0.26));
  for (const k in poseAct) poseAct[k] += (goal[k] - poseAct[k]) * slow;

  // Legs and root height need more time than a hand gesture in both directions. The gameplay
  // action still starts and finishes at exactly the same moments; this only changes the body's
  // visible settle into and out of it.
  const mixTau = act ? (seatedKind ? 0.34 : 0.24) : (seatedKind ? 0.44 : 0.27);
  actMix += ((act ? 1 : 0) - actMix) * (1 - Math.exp(-dt / mixTau));
  const e = actMix * actMix * (3 - 2 * actMix);     // zero slope at both ends
  for (const k in pose) {
    let want = loco[k] + (poseAct[k] - loco[k]) * e;
    if (osc && osc[k]) want += osc[k] * e;
    pose[k] += (want - pose[k]) * (1 - Math.exp(-dt / (TAU[k] || 0.15)));
  }
  if (!act && actMix < 0.004) poseBlendKind = null;

  // Fast gesture, carried-object and cabin-vibration layers must not be written back into the
  // retained filter. Doing so integrated the same offset once per rendered frame: an intended
  // .045-radian shoulder opening became .17 at 30 Hz, .32 at 60 Hz and .62 at 120 Hz. Reuse one
  // presentation object so this correction is both frame-rate invariant and allocation-free.
  for (const k in pose) poseOut[k] = pose[k];
  const out = poseOut;

  // The dialogue panel is an encounter after the opening "talk" verb has finished. Keep the
  // player's body in it: eyes and chest toward the other person, still while listening, a small
  // answering gesture on the beat where a reply is chosen. This layer is deliberately below held
  // objects, which continue to own whichever hand is carrying them.
  const talkSubject = talkOpen && talkAt && !act ? talkAt : null;
  if (talkSubject) playerTalkSubject = talkSubject;
  playerTalkMix += ((talkSubject ? 1 : 0) - playerTalkMix) *
    (1 - Math.exp(-dt / (talkSubject ? .18 : .14)));
  if (playerTalkSubject && playerTalkMix > .001)
    conversationPlayerPose(out, now, playerTalkSubject, smooth01(playerTalkMix));
  else if (!talkSubject) playerTalkSubject = null;

  // On waking, the eyes and the body share one exit rather than the sleeper popping upright on the
  // final tick. The stretch begins on the mattress and finishes as the action blend reaches stand.
  if (wakeMotionAt >= 0) {
    const u = clamp((now - wakeMotionAt) / 1450, 0, 1);
    const k = Math.sin(u * Math.PI);
    out.shL = lerp(out.shL, -1.66, k * 0.78);
    out.shR = lerp(out.shR, -1.62, k * 0.74);
    out.shLz -= k * 0.20; out.shRz += k * 0.20;
    out.elbL = lerp(out.elbL, -0.18, k); out.elbR = lerp(out.elbR, -0.22, k);
    out.torsoPitch -= k * 0.08; out.headPitch -= k * 0.13;
    if (u >= 1) wakeMotionAt = -1;
  }
  // A bag in your hand is in your hand whatever else you are doing. The left arm stops swinging
  // with the walk, hangs from a raised shoulder and closes at the elbow against the weight —
  // laid over the finished pose, and given back to whatever action wants that arm.
  // The arm hangs nearly straight: the shoulder only holds it far enough off the thigh for the
  // bag to clear the leg, because every degree of that lean is a degree the bag hangs off plumb.
  if (carrying) {
    const w = 1 - e * 0.7;
    out.shL = lerp(out.shL, -0.06, w);
    out.shLz = lerp(out.shLz, -0.085, w);
    out.elbL = lerp(out.elbL, -0.16, w);
    out.grip = Math.max(out.grip || 0, 0.85 * w);
    out.sway -= 0.014 * w;
    out.torsoRoll += 0.036 * w;                 // chest counters the load at the left hand
    out.shR *= 1 - 0.16 * w;                    // free arm still swings, but not like empty-handed
  }
  // 购物篮 the shop basket is not held in a hand, it is hooked over the forearm: elbow up, forearm
  // across the front of the body, and that arm out of the walk cycle until you put it down. Laid
  // on at nearly full strength even mid-action, because a shelf reach ends over the basket and the
  // basket has to be where the hand is going.
  if (basketHeld && place === 'shop') {
    const w = 1 - e * 0.10;
    out.shL = lerp(out.shL, -0.10, w);
    out.shLz = lerp(out.shLz, 0.20, w);      // elbow tucked in, forearm across the front
    out.elbL = lerp(out.elbL, -1.62, w);
    out.sway -= 0.010 * w; out.torsoRoll += 0.026 * w;
    // The hand curls round the handle — except while the other one is releasing a packet over
    // the basket, because `grip` is one channel for both hands and that release has to read.
    if (!act || act.type !== 'shelf') out.grip = Math.max(out.grip, 0.55 * w);
  }
  if (place === 'cabin') Cabin.motionPose(out, 0, now);
  return out;
}

// Put a hand on a point in the world. `armTo` wants the offset from the shoulder in the
// torso's own frame, so this undoes the body's yaw and the torso's pitch around it. The
// shoulder position is taken from the body's position and yaw rather than from the torso
// matrix, which has not been built yet this frame — the error in that is a centimetre or two
// of lean, and it is invisible next to a hand that lands on the right handle.
// Returns how far short of the target the arm came up, so a pose can lean in after it.
function reachFor(p, pt, side) {
  const T = PLAYER.tall, FRAME = PLAYER.shoulder || PLAYER.wide;
  const sx = (side === 'R' ? 0.225 : -0.225) * FRAME;
  const sy = 0.86 * T + 0.495 - (p.rootDrop || 0) + (p.bob || 0);
  const c = Math.cos(P.yaw), sn = Math.sin(P.yaw);
  const wx = pt[0] - P.x, wz = pt[2] - P.z;
  const bx = wx * c - wz * sn - sx, bz = wx * sn + wz * c, by = pt[1] - sy;
  const pitch = (p.torsoPitch || 0) + (p.recline || 0);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return armTo(p, side, bx, by * cp + bz * sp, -by * sp + bz * cp);
}

// Turn the head toward something, within the range a neck actually has.
function aim(p, pt, k) {
  const dx = pt[0] - P.x, dz = pt[2] - P.z;
  const dist = Math.max(0.3, Math.hypot(dx, dz));
  p.headYaw = clamp(angleDelta(Math.atan2(dx, dz), P.yaw), -0.85, 0.85) * k;
  p.headPitch = clamp(-Math.atan2(pt[1] - 1.52, dist) * 0.55, -0.42, 0.34) * k;
}


function locomotion(now) {
  const mp = characterMotionPreview;
  const sp = mp ? clamp(mp.speed, 0, 1.6) : clamp((P.ground || 0) / 1.55, 0, 1.6);
  const still = 1 - Math.min(1, sp);
  // The look goes in so the gait can read `age` and `stoop` off it. It also carries the face
  // seed, which is what desynchronises the standing idle across a crowd — for the player that
  // is seed 0, which is fine: there is only one of him.
  const p = gaitPose({ ...POSE }, sp, mp ? mp.phase : P.phase, mp ? mp.turn : P.turn, now, PLAYER,
    { accel: mp ? mp.accel : P.animAccel || 0, climb: mp ? mp.climb : P.animClimb || 0 });
  // Look where you are going, and at whatever you stop beside.
  // Standing beside something, you look at it; walking, the gait's own gaze stabilisation
  // holds the head level and pointed where you are going.
  if (!mp && reachThing && still > 0.55) aim(p, reachThing.pos, 0.9 * still);
  return p;
}

// The shoulder is a rotX joint on an arm that hangs down local -Y, so a *negative* angle
// swings it forward and a positive one swings it behind the back. Every pose below that
// puts a hand out in front therefore uses negative shoulders and negative elbows.
const wave = (t, k = 1) => Math.sin(t) * k;
const smoothstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

// The data names the skeleton pose needed to make an interaction possible; this names what the
// interaction means visually. A generic `stand` covers reading a departures board, holding a rail,
// looking in a mirror and waiting at a checkout, but those are four different bodies. Keeping the
// interpretation here lets the verbs become specific without duplicating animation data across
// every room table or changing any of their timings and effects.
function actionKind(a, def, th) {
  a = a || {}; def = def || {};
  const type = a.type || 'reach', hz = (th && th.hz) || a.hz || '';
  if (def.till || def.mallPay) return 'checkout';
  if (type === 'type') return 'work';
  if (type === 'scrub') return 'clean';
  if (type === 'stand' && a.high) return 'brace';
  if (a.hold === 'book') return 'read';
  if (type === 'walk') return def.hospitalRehab ? 'rehab' : 'stairs';
  if (type === 'lie') {
    const sleeping = def.hotel || /^(床|枕头|和平饭店|客栈|病床)$/.test(hz)
      || /睡|住一晚/.test(def.zh || '');
    return sleeping ? 'sleep' : 'rest';
  }
  if (type === 'stand') return 'observe';
  return type;
}

function conversationPlayerPose(p, now, state, mix = 1) {
  const n = state.n, t = now / 1000;
  const replyAge = state.playerBeat === undefined ? 99 : (now - state.playerBeat) / 1000;
  const reply = replyAge >= 0 && replyAge < 1
    ? Math.sin(clamp(replyAge, 0, 1) * Math.PI) : 0;
  const listening = (n.speakUntil || 0) > now;
  // Open at the shoulders, a little forward from the ankles. Listening gets a slow nod near the
  // end of each phrase; replying opens one palm and briefly turns the chest with it.
  const nod = listening ? Math.max(0, Math.sin(t * 2.05 + 0.7)) * 0.055 : 0;
  p.torsoPitch = lerp(p.torsoPitch, listening ? 0.035 : 0.015, 0.72 * mix);
  p.torsoYaw += reply * 0.055 * mix;
  p.shLz -= 0.045 * mix; p.shRz += 0.045 * mix;
  p.headPitch += (nod - 0.025) * mix;
  if (reply > 0.001) {
    p.shR = lerp(p.shR, -0.62, reply * mix);
    p.shRz = lerp(p.shRz, 0.34, reply * mix);
    p.elbR = lerp(p.elbR, -1.18, reply * mix);
    p.grip = lerp(p.grip || 0.22, 0.08, reply * mix); // an open answering palm
  } else {
    p.shL = lerp(p.shL, 0.08, 0.40 * mix); p.shR = lerp(p.shR, 0.06, 0.40 * mix);
    p.elbL = lerp(p.elbL, -0.34, 0.40 * mix); p.elbR = lerp(p.elbR, -0.30, 0.40 * mix);
  }
  aim(p, [n.x, 1.52 * (n.look.tall || 1) + (n.lift || 0), n.z], 0.92 * mix);
  return p;
}

function actionPose(now) {
  const br = Math.sin(now / 1400) * 0.5 + 0.5;
  // A new action begins at phase zero. Global wall time made a phone thumb, a bite or a scrub land
  // on an arbitrary part of its cycle as the key was pressed; local time gives each gesture an
  // authored preparation beat while the pose blend preserves continuity between actions.
  const t = doing && doing.preview ? doing.previewTime
    : act && act.startedAt !== undefined ? Math.max(0, (now - act.startedAt) / 1000)
                                        : now / 1000;
  const prog = doing ? doing.t : 0;          // 0..1 through the current action
  // Even a held pose breathes and drifts a little, so nothing looks frozen mid-action.
  const idle = { ...POSE, bob: br * 0.006, torsoRoll: Math.sin(now / 3100) * 0.012 };
  if (!act) return idle;
  const osc = actOsc = {};
  const kind = act.kind || actionKind(act, doing && doing.def, doing && doing.th);

  // A point given in the body's own frame — x to the side, z out in front — put back into the
  // world, so a pose can aim at a part of itself.
  const atBody = (bx, by, bz) => {
    const c = Math.cos(P.yaw), s = Math.sin(P.yaw);
    return [P.x + bx * c + bz * s, by, P.z - bx * s + bz * c];
  };

  // Sitting is the base for several desk-bound actions, so it is built once.
  //
  // `seatY` is the height of the thing you are sitting *on*. The hip joint has to end up
  // above it, not at it: the pelvis hangs 125 mm below that joint, so putting the joint on
  // the cushion buried the whole backside a hand's depth inside the sofa. SEAT_LIFT is a
  // little less than that 125 mm, and the difference is the cushion giving under the weight.
  const seated = () => {
    const seat = act.seatY || 0.46, hip = seat + SEAT_LIFT;
    // Thighs slope down by however much it takes to stand the feet on the floor: level off a
    // low stool, running downhill off a tall sofa, which is what a tall seat does to anyone's
    // legs. SHIN_DROP is knee to sole with the shin vertical, and the thigh is 0.397 long.
    const slope = Math.acos(clamp((hip - SHIN_DROP) / 0.397, -0.10, 0.90));
    // Lower through the first half of the authored action instead of arriving at the finished
    // chair pose as soon as the generic action blend catches up. With no active timer — a cabin
    // passenger who remains seated — the body is already all the way down.
    const lower = doing ? smoothstep(0.03, 0.48, prog) : 1;
    const hipNow = lerp(0.86, hip, lower), slopeNow = slope * lower;
    const p = {
      ...idle,
      rootDrop: (0.86 - hip) * lower,
      thighL: -slopeNow, thighR: -slopeNow + 0.07 * lower,
      kneeL: lerp(-0.035, -(slope + 0.02), lower),
      kneeR: lerp(-0.035, -(slope - 0.06), lower),
      ankleL: 0.04 * lower, ankleR: 0.02 * lower,
      // A hard chair sits you upright; a sofa lets you lean back into it.
      torsoPitch: (0.05 - (act.recline || 0)) * lower,
      headPitch: 0.06 * lower,
    };
    // Hands come to rest on the thighs, which is where a sitting person's hands go. Solved
    // against the thigh rather than guessed, so they land on it at any seat height instead
    // of hanging in the air beside the chair, and palm down rather than edge-on.
    const kz = 0.397 * Math.sin(slopeNow) * 0.55,
          ky = hipNow - 0.397 * Math.cos(slopeNow) * 0.55;
    reachFor(p, atBody(-0.108, ky + 0.085, kz), 'L');
    reachFor(p, atBody( 0.108, ky + 0.085, kz), 'R');
    return p;
  };

  if (kind === 'sit') {
    // Settling in: a slow shift of weight and the odd glance around the room.
    osc.torsoRoll = wave(t * 0.31, 0.020);
    osc.headYaw = wave(t * 0.24, 0.10);
    osc.bob = br * 0.004;
    return seated();
  }
  if (kind === 'sleep' || kind === 'rest') {
    osc.bob = Math.sin(now / 2300) * 0.010;      // breathing, slowed right down
    osc.torsoRoll = Math.sin(now / 5200) * 0.020;
    // Sleep settles after the body reaches the mattress. A clinical examination uses the same
    // support pose but stays alert and keeps one hand nearer the body.
    const asleep = kind === 'sleep' ? smoothstep(0.18, 0.52, prog) : 0;
    return {
      ...idle,
      // Lying, the body rides higher above the surface than sitting does: it is resting on
      // its back, and the back of a chest is a good way below the hip joint.
      rootDrop: 0.86 - ((act.seatY || 0.60) + 0.17),
      // Flat on your back. The torso lies down toward the pillow end of the bed and the legs
      // stretch out the other way — both a quarter turn and both in the same direction, or
      // the body folds in half. Negative takes the chest face-up; positive would be face-down.
      recline: -1.50,
      thighL: -1.50, thighR: -1.55, kneeL: -0.14, kneeR: -0.07,
      // Feet fall outward with the toes toward the ceiling. Left at zero they stand at right
      // angles to the legs, heels in the air, as though still walking.
      ankleL: -1.24, ankleR: -1.30,
      shL: 0.10 - asleep * 0.08, shLz: -0.32, elbL: -0.20 - asleep * 0.12,
      shR: 0.04 - asleep * 0.05, shRz:  0.36, elbR: -0.48,        // one arm loose across the middle
      headPitch: 0.14 + asleep * 0.035,            // chin down a little into the pillow
      mouth: kind === 'sleep' && prog < 0.28 ? Math.sin(prog / 0.28 * Math.PI) * 0.20 : 0,
    };
  }
  // Standing under the water: arms loose and open, head tipped back, a slow sway.
  if (act.type === 'wash') {
    osc.torsoRoll = wave(t * 1.1, 0.045);
    osc.shLz = -wave(t * 1.1, 0.06); osc.shRz = wave(t * 1.1, 0.06);
    return {
      ...idle,
      bob: br * 0.03,
      torsoPitch: -0.07,
      shL: -0.30 - br * 0.10, shLz: -0.44, elbL: -1.55,
      shR: -0.30 - br * 0.10, shRz:  0.44, elbR: -1.55,
      headPitch: -0.22,
    };
  }
  // Reading is a two-hand activity, not the generic "look at a thing" pose. The eyes travel down
  // the page, pause at the bottom, then jump back to the top; once per cycle the right hand frees
  // itself for a page turn. The book prop is already attached by `holdItem`.
  if (kind === 'read') {
    const line = ((t * 0.20) % 1 + 1) % 1;
    const page = bump(line, 0.92, 0.10);
    osc.shRz = page * 0.10; osc.elbR = page * 0.20;
    osc.headYaw = wave(t * 0.23, 0.025);
    const p = {
      ...idle,
      torsoPitch: 0.095,
      headPitch: 0.29 + line * 0.085,
      grip: 0.34,
    };
    // Solve the hands onto the lower outside corners. Guessed shoulder angles left a conspicuous
    // air gap around the book, which read as a placard floating against the chest rather than
    // something with weight in both palms.
    reachFor(p, atBody(-0.205, 1.04, 0.305), 'L');
    reachFor(p, atBody( 0.205, 1.04, 0.305), 'R');
    p.shR += page * 0.08; p.elbR += page * 0.14;
    return p;
  }
  // A handhold above shoulder height changes the whole balance of a standing passenger: one arm
  // takes the load, the opposite knee softens and the free hand counters the carriage sway.
  if (kind === 'brace') {
    const rock = wave(t * 1.15, 1);
    return {
      ...idle,
      rootDrop: Math.max(0, rock) * 0.010,
      sway: rock * 0.018,
      torsoRoll: -rock * 0.035,
      torsoPitch: 0.025,
      thighL: -0.025, thighR: -0.055 - Math.max(0, -rock) * 0.055,
      kneeL: -0.08, kneeR: -0.14 - Math.max(0, -rock) * 0.08,
      shL: 0.02, shLz: -0.11, elbL: -0.34,
      shR: -2.12, shRz: 0.18, elbR: -0.24,
      headPitch: -0.035,
      grip: 0.86,
    };
  }
  // Checkout is a short exchange with three readable beats: offer payment, wait with the hand
  // still, then draw it back as the other hand comes forward to receive the purchase or receipt.
  if (kind === 'checkout') {
    const offer = smoothstep(0.04, 0.28, prog) * (1 - smoothstep(0.72, 0.94, prog));
    const receive = smoothstep(0.60, 0.84, prog);
    const p = { ...idle, torsoPitch: 0.06 + offer * 0.05, headPitch: 0.16,
      shL: 0.08, shLz: -0.10, elbL: -0.36 };
    const payAt = act.target || atBody(0.16, 1.03, 0.50);
    reachFor(p, payAt, 'R');
    p.shR = lerp(-0.32, p.shR, offer);
    p.elbR = lerp(-0.72, p.elbR, offer);
    p.shL = lerp(p.shL, -0.68, receive);
    p.shLz = lerp(p.shLz, -0.25, receive);
    p.elbL = lerp(p.elbL, -1.12, receive);
    p.grip = 0.18 + offer * 0.42 + receive * 0.28;
    aim(p, payAt, 0.72);
    return p;
  }
  // Standing and attending to something held: reading, a mirror, waiting at the door.
  if (kind === 'observe') {
    osc.headYaw = wave(t * 0.9, 0.05);
    osc.elbL = wave(t * 0.7, 0.03); osc.elbR = -wave(t * 0.7, 0.03);
    const p = {
      ...idle,
      torsoPitch: 0.05,
      shL: -0.42, shLz: -0.18, elbL: -1.42,
      shR: -0.42, shRz:  0.18, elbR: -1.42,
      headPitch: 0.18,
    };
    // Looking at a board, map, mirror or display means looking at *that*, not holding a book
    // shape forever in front of the chest. The arms remain loose enough to cover headphones,
    // waiting and doorway actions while the gaze carries the specificity.
    if (act.target) aim(p, act.target, 0.78);
    return p;
  }
  // Hand to mouth, chew, hand down, repeat — with a bowl held up in the other hand.
  if (act.type === 'eat' || act.type === 'drink') {
    const drink = act.type === 'drink';
    const u = Math.pow(Math.sin(t * (drink ? 1.15 : 1.5)) * 0.5 + 0.5, 1.4);
    const chew = u > 0.55 ? wave(t * 9, 0.022) * (u - 0.55) * 2 : 0;
    osc.shR = -(drink ? 0.46 : 0.30) * u; osc.elbR = -(drink ? 0.78 : 0.62) * u;
    osc.headPitch = (drink ? -0.16 : 0.05) * u + chew;
    osc.torsoPitch = -0.03 * u;
    osc.mouth = drink ? u * 0.18 : Math.max(0, chew) * 5.0;
    // Eating at a table is eating sitting down. Where the action names a seat the legs come from
    // the seat and only the arms and the head are the meal; without one it is a standing snack,
    // which is what a baozi off a stall is. Built on `idle` for both, a bowl of noodles in a
    // restaurant was eaten standing bolt upright beside the stool it was served at.
    const base = act.seatY !== undefined ? seated() : idle;
    return {
      ...base,
      torsoPitch: (base.torsoPitch || 0) + 0.06,
      shL: drink ? 0.06 : -0.62, shLz: drink ? -0.08 : -0.22,
      elbL: drink ? -0.28 : -1.62,                 // bowl held at the chest; free hand for a drink
      shR: drink ? -1.12 : -0.98, shRz:  0.16, elbR: drink ? -1.55 : -1.42,
      headPitch: 0.14,
      grip: 0.78,
    };
  }
  // Stirring: the forearm draws a small circle over the pot and the shoulders follow it.
  if (act.type === 'cook') {
    const w = t * 3.1;
    osc.shR = wave(w, 0.10); osc.shRz = Math.cos(w) * 0.13;
    osc.elbR = wave(w + 1.1, 0.11); osc.torsoRoll = Math.cos(w) * 0.030;
    osc.torsoYaw = wave(w, 0.035);
    return {
      ...idle,
      torsoPitch: 0.16,
      shL: -0.30, shLz: -0.20, elbL: -0.70,        // steadying the pot handle
      shR: -1.02, shRz:  0.16, elbR: -1.00,
      headPitch: 0.30,
    };
  }
  // Hands working at speed: washing, brushing, drying. `high` puts them at the face.
  if (act.type === 'scrub') {
    const w = t * (act.high ? 8.4 : 6.2);
    osc.elbR = wave(w, act.high ? 0.16 : 0.10);
    osc.shRz = wave(w, 0.05);
    if (!act.high) { osc.elbL = wave(w + Math.PI, 0.10); osc.shLz = -wave(w, 0.05); }
    osc.torsoRoll = wave(w, 0.014);
    return act.high ? {
      ...idle,
      torsoPitch: 0.05,
      shL: 0.30, shLz: -0.10, elbL: -0.55,
      shR: -1.12, shRz: 0.30, elbR: -2.05,
      headPitch: 0.02,
    } : {
      ...idle,
      torsoPitch: 0.20,
      shL: -0.78, shLz: -0.16, elbL: -1.62,
      shR: -0.78, shRz:  0.16, elbR: -1.62,
      headPitch: 0.34,
    };
  }
  // Seated at the desk, forearms level, fingers going.
  if (act.type === 'type') {
    osc.elbL = wave(t * 7.3, 0.030); osc.elbR = wave(t * 8.1 + 1.7, 0.030);
    osc.headPitch = wave(t * 1.3, 0.012);
    osc.torsoYaw = wave(t * 0.5, 0.020);
    return {
      ...seated(),
      torsoPitch: 0.14,
      shL: -0.52, shLz: -0.14, elbL: -1.18,
      shR: -0.52, shRz:  0.14, elbR: -1.18,
      headPitch: 0.26,
    };
  }
  // Both hands up, head down, thumb moving. The universal posture of the age.
  if (act.type === 'phone') {
    osc.elbR = wave(t * 2.6, 0.028); osc.shR = wave(t * 1.3, 0.020);
    osc.headYaw = wave(t * 0.6, 0.035);
    return {
      ...idle,
      torsoPitch: 0.10,
      shL: -0.72, shLz: -0.20, elbL: -1.76,
      shR: -0.80, shRz:  0.20, elbR: -1.82,
      headPitch: 0.36,
    };
  }
  // Tipping a watering can: arm out and down, wrist rolling over slowly.
  if (act.type === 'pour') {
    osc.shR = wave(t * 0.9, 0.06); osc.elbR = wave(t * 0.9 + 0.8, 0.09);
    osc.torsoRoll = wave(t * 0.9, 0.020);
    return {
      ...idle,
      torsoPitch: 0.18,
      shL: 0.16, shLz: -0.10, elbL: -0.40,
      shR: -1.28, shRz: 0.20, elbR: -0.42,
      headPitch: 0.34,
    };
  }
  // A one-shot move rather than a loop: crouch, take hold, straighten up carrying it.
  if (act.type === 'lift') {
    const down = smoothstep(0.05, 0.30, prog) * (1 - smoothstep(0.42, 0.66, prog));
    const hold = smoothstep(0.50, 0.78, prog);
    return {
      ...idle,
      rootDrop: 0.30 * down,
      thighL: -0.92 * down, thighR: -0.88 * down,
      kneeL: -1.32 * down, kneeR: -1.28 * down,
      torsoPitch: 0.30 * down + 0.06,
      shL: -0.30 - 0.42 * down + 0.22 * hold, shLz: -0.14, elbL: -0.42 - 0.55 * hold,
      shR: -0.30 - 0.42 * down + 0.22 * hold, shRz:  0.14, elbR: -0.42 - 0.55 * hold,
      headPitch: 0.34 * down + 0.10,
    };
  }
  // 拿货 taking something off a shelf and putting it in the basket. Three beats: the hand goes
  // out to the shelf at the height the thing actually sits at, closes on it, then comes back down
  // and across to the basket on the other hip and opens again. The reach is solved rather than
  // posed, so it lands on the packet whether it is on the top deck or the bottom one.
  if (act.type === 'shelf') {
    const out = smoothstep(0.04, 0.34, prog);        // arm goes out
    const back = smoothstep(0.52, 0.86, prog);       // and comes back to the basket
    const p = { ...idle, shL: 0.12, shLz: -0.12, elbL: -0.38 };
    // Lean in a little while reaching, and look at what the hand is doing.
    p.torsoPitch = 0.05 + 0.10 * out * (1 - back);
    p.torsoYaw = -0.10 * out * (1 - back);
    const t0 = act.target || [P.x, 1.1, P.z];
    // Where the hand goes: to the packet, then across and down to just over the mouth of the
    // basket on the left forearm — the same spot `computePose` parks that arm at.
    const bk = atBody(-0.205, 1.115, 0.205);
    const to = [t0[0] + (bk[0] - t0[0]) * back, t0[1] + (bk[1] - t0[1]) * back,
                t0[2] + (bk[2] - t0[2]) * back];
    reachFor(p, to, 'R');
    // Closes on the packet as it arrives, and lets go over the basket.
    p.grip = 0.15 + 0.75 * out * (1 - smoothstep(0.88, 0.99, prog));
    p.headPitch = 0.12 + 0.26 * back;
    aim(p, t0, 0.55 * (1 - back));
    return p;
  }
  // Take hold of a handle and pull it open, then stand clear while it is open. The hand stays
  // on the handle the whole way: the handle is what moves, and the arm follows it back.
  if (act.type === 'open') {
    const pull = smoothstep(0.02, 0.28, prog);
    const p = { ...idle, shL: 0.14, shLz: -0.10, elbL: -0.36 };
    const dx = act.target[0] - P.x, dz = act.target[2] - P.z;
    const d = Math.max(0.2, Math.hypot(dx, dz));
    // The handle swings toward the body and out to the side as the door comes open.
    const k = (d - 0.34 * pull) / d, side = 0.24 * pull;
    p.torsoPitch = 0.04 - 0.05 * pull;
    p.torsoYaw = -0.16 * pull;
    reachFor(p, [P.x + dx * k - dz / d * side, act.target[1],
                 P.z + dz * k + dx / d * side], 'R');
    p.grip = 0.35 + 0.60 * smoothstep(0.01, 0.10, prog);
    osc.shR = wave(t * 0.8, 0.020);
    aim(p, act.target, 0.7);
    return p;
  }
  // A switch: the finger goes to the switch, presses, and stays there a beat. The press is a
  // real centimetre and a half into the wall rather than a wobble of the elbow.
  if (act.type === 'press') {
    const jab = Math.max(0, wave(t * 5.2, 1)) * (1 - smoothstep(0.35, 0.7, prog));
    const p = { ...idle, shL: 0.10, shLz: -0.08, elbL: -0.30, headPitch: -0.04 };
    const dx = act.target[0] - P.x, dz = act.target[2] - P.z;
    const d = Math.max(0.2, Math.hypot(dx, dz)), k = (d - 0.015 * jab) / d;
    reachFor(p, [P.x + dx * k, act.target[1], P.z + dz * k], 'R');
    p.grip = 0.55;                          // the rest of the hand curls, the finger does not
    aim(p, act.target, 0.8);
    return p;
  }
  // Talking to someone: weight on one hip, one hand moving with what you are saying.
  if (act.type === 'talk') {
    osc.headPitch = wave(t * 1.9, 0.030); osc.headYaw = wave(t * 0.85, 0.055);
    osc.shR = wave(t * 1.7, 0.09); osc.elbR = wave(t * 1.7 + 0.9, 0.14);
    osc.torsoRoll = wave(t * 0.6, 0.020); osc.torsoYaw = wave(t * 0.75, 0.030);
    return {
      ...idle,
      torsoPitch: 0.02,
      shL: 0.16, shLz: -0.10, elbL: -0.44,
      shR: -0.52, shRz: 0.24, elbR: -1.22,
      headPitch: 0.02,
    };
  }
  // Down on your heels, stroking something small.
  if (act.type === 'crouch') {
    osc.shR = wave(t * 1.7, 0.14); osc.elbR = wave(t * 1.7 + 0.7, 0.09);
    osc.torsoPitch = wave(t * 1.7, 0.020);
    return {
      ...idle,
      rootDrop: 0.42, thighL: -1.18, thighR: -1.05, kneeL: -1.62, kneeR: -1.50,
      torsoPitch: 0.26,
      shL: -0.20, shLz: -0.22, elbL: -0.85,
      shR: -1.15, shRz: 0.16, elbR: -0.62,
      headPitch: 0.40,
    };
  }
  // Medical checks are patient poses as often as they are operator poses. The object says which:
  // blood pressure presents a loose arm, temperature brings the chin up, and the general test pose
  // keeps both hands clear while the player follows what the clinician is doing.
  if (kind === 'check') {
    const hz = act.hz || '', pulse = Math.max(0, wave(t * 1.25, 1));
    if (/血压/.test(hz)) return {
      ...idle,
      torsoPitch: 0.035, torsoYaw: -0.055,
      shL: -1.10, shLz: -0.20, elbL: -0.18,
      shR: 0.10, shRz: 0.08, elbR: -0.34,
      headPitch: 0.11, headYaw: -0.10,
      grip: 0.10,
    };
    if (/体温/.test(hz)) return {
      ...idle,
      torsoPitch: -0.015,
      shL: 0.10, shLz: -0.08, elbL: -0.30,
      shR: -0.18, shRz: 0.13, elbR: -0.52,
      headPitch: -0.16 + pulse * 0.018,
      grip: 0.18,
    };
    return {
      ...idle,
      rootDrop: 0.025,
      torsoPitch: 0.055 + pulse * 0.012,
      shL: -0.30, shLz: -0.15, elbL: -0.72,
      shR: -0.22, shRz: 0.14, elbR: -0.58,
      headPitch: 0.16,
      grip: 0.16,
    };
  }
  // Taking a small object: reach, close, return it to the chest. This covers pharmacy packets and
  // receipts that used to inherit the endless default reach and remain pinned to the shelf.
  if (kind === 'take') {
    const out = smoothstep(0.03, 0.30, prog), back = smoothstep(0.52, 0.88, prog);
    const p = { ...idle, torsoPitch: 0.05 + out * (1 - back) * 0.08,
      shL: 0.08, shLz: -0.09, elbL: -0.34 };
    const from = act.target || atBody(0.16, 1.03, 0.48);
    const keep = atBody(0.12, 1.22, 0.18);
    const to = [lerp(from[0], keep[0], back), lerp(from[1], keep[1], back),
                lerp(from[2], keep[2], back)];
    reachFor(p, to, 'R');
    p.shR = lerp(-0.32, p.shR, out);
    p.elbR = lerp(-0.62, p.elbR, out);
    p.grip = 0.12 + 0.78 * smoothstep(0.20, 0.46, prog);
    aim(p, back < 0.6 ? from : keep, 0.72);
    return p;
  }
  // Actions that mean walking without translating the player — a signed stair choice, a careful
  // rehabilitation length, the final step through an aircraft door. The feet cycle locally, but
  // only while the authored action is active; ordinary locomotion remains distance-driven.
  if (kind === 'stairs' || kind === 'rehab') {
    const careful = kind === 'rehab', ph = t * (careful ? 3.2 : 4.8);
    const l = Math.sin(ph), r = -l;
    const liftL = Math.max(0, l), liftR = Math.max(0, r);
    return {
      ...idle,
      rootDrop: 0.045 + Math.abs(Math.sin(ph)) * 0.025,
      bob: Math.abs(Math.cos(ph)) * 0.018,
      torsoPitch: careful ? 0.11 : 0.14,
      torsoRoll: Math.sin(ph) * (careful ? 0.025 : 0.045),
      thighL: -l * (careful ? 0.18 : 0.28), thighR: -r * (careful ? 0.18 : 0.28),
      kneeL: -0.10 - liftL * (careful ? 0.30 : 0.42),
      kneeR: -0.10 - liftR * (careful ? 0.30 : 0.42),
      ankleL: -liftL * 0.08, ankleR: -liftR * 0.08,
      shL: careful ? -0.92 : r * 0.32, shLz: careful ? -0.22 : -0.06,
      elbL: careful ? -0.52 : -0.26,
      shR: careful ? -0.92 : l * 0.32, shRz: careful ? 0.22 : 0.06,
      elbR: careful ? -0.52 : -0.26,
      headPitch: careful ? 0.10 : 0.035,
      grip: careful ? 0.82 : 0.28,
    };
  }
  // Default: put a hand on the thing itself. Not near it, on it.
  const p = { ...idle, shL: 0.14, shLz: -0.10, elbL: -0.36 };
  // A first pass to find out whether the arm can get there at all, then lean and stoop into
  // whatever it could not cover, then solve again against the body that leaning produced.
  const short = reachFor(p, act.target, 'R');
  const low = clamp((1.24 - act.target[1]) * 0.55, 0, 0.34);
  p.torsoPitch = clamp(low + short * 1.1, 0, 0.40);
  p.torsoYaw = -0.10;                      // the shoulder comes round with the arm
  reachFor(p, act.target, 'R');
  // The hand opens on the way out and closes as it arrives.
  p.grip = 0.20 + 0.70 * smoothstep(0.02, 0.16, prog);
  osc.shR = wave(t * 1.4, 0.018);
  osc.elbR = wave(t * 1.4 + 0.9, 0.024);
  osc.torsoRoll = wave(t * 0.9, 0.012);
  aim(p, act.target, 1);      // reaching for something means looking at it
  return p;
}

// Deterministic animation stage for the console and screenshot harnesses. These hooks never alter
// needs, money, clocks, room state or interaction results: they only hold the body on a pose until
// `clearCharacterPreview()` is called. Normal play refuses to be replaced mid-action.
const CHARACTER_PREVIEW_POSES = {
  sit:      { type:'sit', seatY:.50 },
  sleep:    { type:'lie', seatY:.60 },
  rest:     { type:'lie', seatY:.58 },
  eat:      { type:'eat', seatY:.50, hold:'meal' },
  drink:    { type:'drink', seatY:.50, hold:'cup' },
  read:     { type:'stand', hold:'book' },
  phone:    { type:'phone', hold:'phone' },
  work:     { type:'type', seatY:.48 },
  checkout: { type:'stand' },
  clean:    { type:'scrub' },
  cook:     { type:'cook', hold:'ladle' },
  pour:     { type:'pour', hold:'can' },
  open:     { type:'open' },
  press:    { type:'press' },
  talk:     { type:'talk' },
  check:    { type:'check' },
  take:     { type:'take' },
  stairs:   { type:'walk' },
  rehab:    { type:'walk' },
  crouch:   { type:'crouch' },
  lift:     { type:'lift', hold:'parcel' },
  reach:    { type:'reach' },
  brace:    { type:'stand', high:true },
};
const CHARACTER_MOTION_PREVIEWS = {
  idle:        { speed:0,    accel:0,    turn:0,    climb:0,    phase:0.2 },
  start:       { speed:.34,  accel:3.8,  turn:0,    climb:0,    phase:-.8 },
  walk:        { speed:.78,  accel:0,    turn:0,    climb:0,    phase:-.5 },
  run:         { speed:1.36, accel:.45,  turn:0,    climb:0,    phase:-.2 },
  stop:        { speed:.30,  accel:-4.1, turn:0,    climb:0,    phase:1.1 },
  turn:        { speed:.58,  accel:0,    turn:2.25, climb:0,    phase:.8 },
  pivot:       { speed:0,    accel:0,    turn:2.65, climb:0,    phase:.1 },
  'stairs-up': { speed:.70,  accel:.15,  turn:0,    climb:.62,  phase:.9 },
  'stairs-down':{speed:.66,  accel:-.10, turn:0,    climb:-.58, phase:.15 },
};
const CHARACTER_POSE_KEYS = ['rootDrop','bob','sway','surge','recline','torsoPitch','torsoYaw',
  'torsoRoll','hipYaw','thighL','thighR','kneeL','kneeR','ankleL','ankleR','shL','shR',
  'shLz','shRz','elbL','elbR','headYaw','headPitch','mouth','grip'];

function characterPoseSnapshot() {
  const channels = {};
  for (const k of CHARACTER_POSE_KEYS) channels[k] = +((pose[k] || 0).toFixed(4));
  return {
    action: act && (act.kind || actionKind(act, doing && doing.def, doing && doing.th)),
    sourceType: act && act.type, mix:+actMix.toFixed(3), preview:!!(doing && doing.preview),
    motion: characterMotionPreview && characterMotionPreview.name,
    speed:+((P.ground || 0).toFixed(3)), accel:+((P.animAccel || 0).toFixed(3)),
    climb:+((P.animClimb || 0).toFixed(3)), turn:+((P.turn || 0).toFixed(3)),
    channels,
  };
}
function clearCharacterPreview() {
  if (doing && doing.preview) { doing = null; act = null; }
  characterMotionPreview = null;
  return characterPoseSnapshot();
}
function previewCharacterAction(kind, progress = .55, phase = .38) {
  if (doing && !doing.preview) return { ok:false, reason:'a gameplay action is active' };
  const src = CHARACTER_PREVIEW_POSES[kind];
  if (!src) return { ok:false, actions:Object.keys(CHARACTER_PREVIEW_POSES) };
  if (doing && doing.preview) { doing = null; act = null; }
  characterMotionPreview = null; wakeMotionAt = -1;
  const target = [P.x + Math.sin(P.yaw) * .62, 1.18, P.z + Math.cos(P.yaw) * .62];
  const th = { hz: kind === 'check' ? '血压计' : '动画预览', pos:target, focus:[P.x,P.z], reach:2 };
  const spec = { ...src };
  const def = { zh:'动画预览', py:'', en:'animation preview', secs:1e9, mins:0, gain:{}, pose:spec };
  doing = { def, th, t:clamp(progress, 0, 1), preview:true,
            previewTime:clamp(phase, 0, 1) * 6 };
  act = { ...spec, hz:th.hz, target, kind, startedAt:performance.now() };
  poseBlendKind = kind; actMix = 1; actOsc = null;
  const goal = actionPose(performance.now()), fast = actOsc;
  for (const k in pose) {
    poseAct[k] = goal[k];
    pose[k] = goal[k] + (fast && fast[k] ? fast[k] : 0);
  }
  return { ok:true, ...characterPoseSnapshot() };
}
function previewCharacterMotion(name) {
  if (doing && !doing.preview) return { ok:false, reason:'a gameplay action is active' };
  if (doing && doing.preview) { doing = null; act = null; }
  const src = CHARACTER_MOTION_PREVIEWS[name];
  if (!src) return { ok:false, motions:Object.keys(CHARACTER_MOTION_PREVIEWS) };
  characterMotionPreview = { ...src, name }; poseBlendKind = null; actMix = 0; wakeMotionAt = -1;
  const goal = locomotion(performance.now());
  for (const k in pose) pose[k] = poseAct[k] = goal[k];
  return { ok:true, ...characterPoseSnapshot() };
}

function characterAnimationState() {
  const activity = {};
  for (const n of NPCS) if (n.awake && !n.animal) {
    const a = n.act || (n.spot && n.spot.act) || 'idle';
    activity[a] = (activity[a] || 0) + 1;
  }
  return {
    player:characterPoseSnapshot(), npcActivity:activity,
    actionPreviews:Object.keys(CHARACTER_PREVIEW_POSES),
    motionPreviews:Object.keys(CHARACTER_MOTION_PREVIEWS),
  };
}

// Things the hands actually hold. Drawn on the wrist so they track the animation exactly:
// `lv` frames are level with the floor (bowls, cups, a phone), `wr` frames follow the
// forearm (chopsticks, a brush, a ladle). Nothing here is a separate world prop — it exists
// only while the action that needs it is running.
const PORC = C('#f3f1ea'), TEA = C('#9c6b33'), STEELY = C('#b9c0c6'),
      WOODY = C('#a8845a'), CARD = C('#b58a5c'), DARKP = C('#23262b'), WATERC = C('#cfe6ef'),
      PAPER = C('#eee9dc'), PAPERD = C('#b9b1a1'), CLIP = C('#667784'),
      BROOM = C('#b99662'), BRISTLE = C('#8b6a43');
// The 超市 basket, and what the things you put in it look like from above once they are in it.
// Hoisted out of the draw: C() builds a new array every call, and this is a per-frame path.
const BSK = C('#b8402c'), BSKD = C('#8a2e1f'), BSKH = C('#2a2d31');
const GOODC = {
  '方便面': [C('#d8462f'), C('#f2ede0')],      // pot noodle: red sleeve, paper lid
  '米':     [C('#e8e0cc'), C('#c9b78a')],      // rice sack
  '水果':   [C('#e0912c'), C('#7ea648')],      // oranges and something green
  '冰柜':   [C('#2f7fa8'), C('#cfe0e6')],      // a cold bottle
  '货架':   [C('#c9843a'), C('#f0e6cc')],      // whatever was to hand
};
const goodColour = hz => GOODC[hz] || GOODC['货架'];
// `shape` inside drawFigure takes a *material* as its last argument, not an options object, so a
// part that sits at an angle needs the rotation built into its parent matrix — and a material that
// is only a gloss has to be a shared constant rather than a fresh object every frame.
const part = (m, x, y, z, r) => M.mul(m, M.mul(M.trans(x, y, z), r));
const GL2 = { gloss: 0.22 }, GL3 = { gloss: 0.30 }, GLD = { gloss: 0.36 };
const MAPBLUE = C('#6d91a7'), MAPCREAM = C('#eee7d7'), PRODUCT = C('#b66a47'),
      PRODUCT2 = C('#5f8294'), LEAF = C('#597f4c'), PETAL = C('#c96767'),
      CIGPAPER = C('#e6dfcf'), EMBER = C('#ef6a32'), BELT = C('#38434d'),
      MASK = C('#e8e2d5');
// Six invented bag identities, deliberately abstract colour/stripe combinations rather than
// marks. They and the five purchase silhouettes below reuse shapes already drawn by holdItem.
const SHOP_BAG_COLORS=[
  [C('#b9473f'),C('#f0d9b0')],[C('#2f766b'),C('#e8d7a5')],
  [C('#456f9b'),C('#e9e2d3')],[C('#9a6744'),C('#f2c66f')],
  [C('#725486'),C('#e8cfd6')],[C('#d28a34'),C('#385f58')],
];
const MALL_GIFT=C('#9a4b58'),MALL_GIFT_RIBBON=C('#e0bd66'),MALL_BOOK=C('#496b83'),
      MALL_DRINK=C('#e9dfc8'),MALL_DRINK_BAND=C('#4f8078'),MALL_TOY=C('#df8b3a');
const ITEM_BRIDGE_FRAME=new Float32Array(16), ITEM_SHAFT_FRAME=new Float32Array(16);

// A rigid two-hand prop must be driven by both hands, not merely parked somewhere in front of the
// torso.  These frames use the wrist positions only; their source matrices may come either from
// the procedural arm solve or from the actual posed hand bones of an imported resident.
function itemBridge(a, b, torso) {
  const ax=a[12], ay=a[13], az=a[14], bx=b[12], by=b[13], bz=b[14];
  let xx=bx-ax, xy=by-ay, xz=bz-az, l=Math.hypot(xx,xy,xz)||1;
  xx/=l; xy/=l; xz/=l;
  // The torso's forward column supplies a stable page/label direction. Remove its component along
  // the hand-to-hand axis before rebuilding an orthonormal basis.
  let zx=torso[8], zy=torso[9], zz=torso[10];
  const xd=zx*xx+zy*xy+zz*xz;
  zx-=xx*xd; zy-=xy*xd; zz-=xz*xd; l=Math.hypot(zx,zy,zz)||1;
  zx/=l; zy/=l; zz/=l;
  let yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
  // Keep the page upright even if somebody crosses their hands during a blended transition.
  if (yy < 0) { yx=-yx; yy=-yy; yz=-yz; zx=-zx; zy=-zy; zz=-zz; }
  const out=ITEM_BRIDGE_FRAME;
  out[0]=xx; out[1]=xy; out[2]=xz;
  out[4]=yx; out[5]=yy; out[6]=yz;
  out[8]=zx; out[9]=zy; out[10]=zz;
  out[12]=(ax+bx)*.5; out[13]=(ay+by)*.5; out[14]=(az+bz)*.5; out[15]=1;
  return out;
}

function itemShaft(a, b, torso) {
  // Local +Y runs from the lower wrist through the upper wrist.  Extending -Y therefore takes a
  // broom to the floor while both animated hands remain on the same shaft.
  let lo=a, hi=b;
  if (lo[13] > hi[13]) { const q=lo; lo=hi; hi=q; }
  let yx=hi[12]-lo[12], yy=hi[13]-lo[13], yz=hi[14]-lo[14];
  let l=Math.hypot(yx,yy,yz)||1; yx/=l; yy/=l; yz/=l;
  // During the first few blend frames the hands can be almost level. Preserve their lateral line
  // but give it enough vertical component that the lower end still reaches the floor nearby.
  if (yy < .24) {
    yx*=.72; yz*=.72; yy=.42;
    l=Math.hypot(yx,yy,yz)||1; yx/=l; yy/=l; yz/=l;
  }
  let zx=torso[8], zy=torso[9], zz=torso[10];
  const yd=zx*yx+zy*yy+zz*yz;
  zx-=yx*yd; zy-=yy*yd; zz-=yz*yd; l=Math.hypot(zx,zy,zz)||1;
  zx/=l; zy/=l; zz/=l;
  let xx=yy*zz-yz*zy, xy=yz*zx-yx*zz, xz=yx*zy-yy*zx;
  l=Math.hypot(xx,xy,xz)||1; xx/=l; xy/=l; xz/=l;
  const out=ITEM_SHAFT_FRAME;
  out[0]=xx; out[1]=xy; out[2]=xz;
  out[4]=yx; out[5]=yy; out[6]=yz;
  out[8]=zx; out[9]=zy; out[10]=zz;
  out[12]=(lo[12]+hi[12])*.5; out[13]=(lo[13]+hi[13])*.5;
  out[14]=(lo[14]+hi[14])*.5; out[15]=1;
  return out;
}
function holdItem(name, shape, torso, wrL, wrR, lvL, lvR, prog) {
  if(typeof name==='string'&&name.startsWith('shopBag')) {
    const i=Math.max(0,Math.min(5,(name.charCodeAt(7)-48)||0)),c=SHOP_BAG_COLORS[i];
    // A compact paper carrier: body, invented colour band and one arched handle. Three familiar
    // primitives keep a crowd of bags much cheaper than logo textures or bespoke meshes.
    shape('softBox',lvL,0,-.205,.018,.205,.255,.105,c[0],{mode:7,gloss:.10,round:.012});
    shape('softBox',lvL,0,-.205,.075,.180,.055,.008,c[1],GL2);
    shape('capsule',lvL,0,-.070,.018,.024,.105,.024,c[1],GL2);
    return;
  }
  switch (name) {
    // 购物篮 the shop basket, hanging off the left forearm the way one does — levelled, so it does
    // not tip as the arm swings, with the handle standing up out of it.
    case 'basket': {
      // Four leaning walls, a base and a rim rather than a solid block: a shop basket is a thing
      // you can see into, and what you can see in it is your shopping. The walls lean out the way
      // they have to for the stack by the door to nest.
      //
      // Hung off the torso, not the wrist. The wrist frame carries the shoulder's splay and the
      // hand's twist, neither of which `level()` undoes, so a basket parented to it hangs over at
      // an angle — and a basket is one of the few things a body carries that is unmistakably
      // level. The arm holding it is a fixed pose (see `computePose`), so the torso is honest.
      const hx = 0.104, hz = 0.148, ht = 0.096;        // half width / length / height
      const cx = -0.210, cy = 0.072, cz = 0.200;       // beside the left hip, under the forearm
      const lean = 0.15;
      shape('softBox', torso, cx, cy - ht + 0.008, cz, hx * 1.80, 0.016, hz * 1.84, BSKD, GLD);
      for (const s of [-1, 1]) {
        shape('softBox', part(torso, cx + s * (hx + 0.012), cy, cz, M.rotZ(-s * lean)),
          0, 0, 0, 0.014, ht * 2, hz * 1.92, BSK, GL3);
        shape('softBox', part(torso, cx, cy, cz + s * (hz + 0.012), M.rotX(s * lean)),
          0, 0, 0, hx * 1.90, ht * 2, 0.014, BSK, GL3);
      }
      // The rim, in the darker plastic every one of these has, and the handle the forearm is
      // threaded through: two uprights and a bar running the length of it, under the arm.
      shape('softBox', torso, cx, cy + ht + 0.008, cz, hx * 2.26, 0.020, hz * 2.18, BSKD, GLD);
      for (const s of [-1, 1])
        shape('capsule', torso, cx, cy + ht + 0.056, cz + s * 0.074, 0.013, 0.080, 0.013,
          BSKH, GLD);
      shape('capsule', part(torso, cx, cy + ht + 0.096, cz, M.rotX(Math.PI / 2)),
        0, 0, 0, 0.013, 0.150, 0.013, BSKH, GLD);
      // And the shopping, standing up in it. Four at most: past that they are behind each other
      // and it is only the top of the basket you can see anyway.
      const n = Math.min(4, basket.length), floor = cy - ht + 0.008;
      for (let i = 0; i < n; i++) {
        const g = goodColour(basket[basket.length - n + i].hz);
        // Standing on the bottom of the basket and tall enough to show over the rim, at three
        // different heights so a full basket reads as a jumble rather than as a lid.
        const h = 0.22 + (i % 3) * 0.05;
        const x = cx + (i % 2 ? 0.028 : -0.028), z = cz - 0.082 + i * 0.055;
        const m = part(torso, x, floor + h / 2, z, M.rotY((i - 1.5) * 0.16));
        shape('softBox', m, 0, 0, 0, 0.100, h, 0.064, g[0], GL3);
        shape('softBox', m, 0, h / 2 - 0.006, 0, 0.082, 0.016, 0.050, g[1], GL2);
      }
      break;
    }
    // Whatever has just come off the shelf, on its way down to the basket — in the colours of
    // the thing you actually took, because the basket is about to be holding the same object.
    case 'goods': {
      const g = goodColour(doing ? doing.def.take : '货架');
      shape('softBox', lvR, 0, -0.086, 0.030, 0.100, 0.140, 0.082, g[0],
        { gloss: 0.26, round: 0.02 });
      shape('softBox', lvR, 0, -0.014, 0.030, 0.078, 0.016, 0.064, g[1], { gloss: 0.20 });
      break;
    }
    case 'mallGift':
      shape('softBox',lvR,0,-.100,.035,.155,.160,.120,MALL_GIFT,{gloss:.20,round:.015});
      shape('softBox',lvR,0,-.100,.100,.035,.165,.012,MALL_GIFT_RIBBON,GL2);
      shape('softBox',lvR,0,-.100,.102,.160,.030,.014,MALL_GIFT_RIBBON,GL2);
      break;
    case 'mallBookBuy':
      shape('softBox',lvR,0,-.110,.035,.135,.205,.035,MALL_BOOK,{gloss:.18,round:.010});
      shape('softBox',lvR,0,-.110,.055,.112,.174,.008,MAPCREAM,GL2);
      break;
    case 'mallBouquet':
      shape('taper',lvL,0,-.175,.020,.155,.265,.155,MAPCREAM,{mode:7,gloss:.06});
      for(const x of [-.075,0,.075])
        shape('ball',lvL,x,-.025,.020+Math.abs(x)*.20,.055,.050,.055,
          x===0?PETAL:x<0?MALL_GIFT:MALL_GIFT_RIBBON,{gloss:.10});
      break;
    case 'mallDrink':
      shape('cyl',lvR,0,-.095,.030,.082,.180,.082,MALL_DRINK,{gloss:.18});
      shape('softBox',lvR,0,-.105,.089,.078,.055,.008,MALL_DRINK_BAND,GL2);
      shape('capsule',lvR,.025,.010,.030,.010,.105,.010,PAPERD,{rz:.10});
      break;
    case 'mallToy':
      shape('softBox',lvR,0,-.105,.035,.145,.150,.100,MALL_TOY,{gloss:.18,round:.020});
      shape('ball',lvR,0,-.105,.092,.050,.050,.020,MAPBLUE,GL2);
      break;
    case 'torch':
      shape('capsule',wrR,0,-.145,.012,.030,.230,.030,DARKP,GLD);
      shape('cyl',wrR,0,-.275,.012,.055,.075,.055,STEELY,{gloss:.52});
      break;
    case 'meal':                                    // rice bowl and chopsticks
      shape('taper', lvL, 0, -0.042, 0.034, 0.175, 0.085, 0.175, PORC, { gloss: 0.34 });
      shape('cyl', lvL, 0, -0.082, 0.034, 0.070, 0.030, 0.070, PORC, { gloss: 0.34 });
      shape('ball', lvL, 0, -0.004, 0.034, 0.062, 0.026, 0.062, C('#f6f4ee'), { gloss: 0.20 });
      for (const s of [-1, 1])
        shape('capsule', wrR, s * 0.013, -0.145, 0.018, 0.011, 0.230, 0.011, WOODY, { rz: s * 0.03 });
      break;
    case 'cup':
      shape('cyl', lvR, 0, -0.036, 0.030, 0.096, 0.088, 0.096, PORC, { gloss: 0.38 });
      shape('cyl', lvR, 0, -0.004, 0.030, 0.080, 0.010, 0.080, TEA, { gloss: 0.50 });
      break;
    // A bowl on a tray, held out in both hands. Hung off the torso rather than a wrist: a tray
    // is carried level with two hands under it. Its bridge follows both actual hands, so neither
    // can slide away when a different imported skeleton has shorter forearms.
    case 'tray': {
      const q=itemBridge(wrL,wrR,torso);
      shape('softBox', q, 0, 0.035, 0.025, 0.340, 0.022, 0.250, C('#8a5a33'),
        { gloss: 0.30 });
      shape('taper', q, 0, 0.082, 0.025, 0.180, 0.085, 0.180, PORC, { gloss: 0.34 });
      shape('cyl', q, 0, 0.117, 0.025, 0.150, 0.016, 0.150, TEA, { mode: 1, gloss: 0.44 });
      break;
    }
    case 'ladle':
      shape('capsule', wrR, 0, -0.190, 0.010, 0.017, 0.300, 0.017, DARKP, { gloss: 0.42 });
      shape('taper', wrR, 0, -0.350, 0.012, 0.115, 0.055, 0.115, STEELY, { gloss: 0.55 });
      break;
    case 'brush':
      shape('capsule', wrR, 0, -0.125, 0.012, 0.019, 0.170, 0.019, C('#3f8f86'), { gloss: 0.30 });
      shape('softBox', wrR, 0, -0.215, 0.014, 0.030, 0.048, 0.022, PORC, { gloss: 0.24 });
      break;
    case 'towel':
      shape('softBox', wrR, 0, -0.150, 0.020, 0.210, 0.230, 0.070, C('#5f8f92'),
        { mode: 7, gloss: 0.04 });
      break;
    case 'linen': {                               // folded towels supported across both forearms
      const q=itemBridge(wrL,wrR,torso);
      // Three individually folded layers read as towels; one deep rounded box looked like a hotel
      // safe being carried through the changing room.
      shape('softBox', q, 0, -.040, .020, .340, .060, .145, C('#d9ded9'),
        { mode:7, gloss:.04, round:.012 });
      shape('softBox', q, 0,  .018, .020, .330, .058, .140, C('#eef0ea'),
        { mode:7, gloss:.04, round:.012 });
      shape('softBox', q, 0,  .074, .020, .320, .055, .135, C('#c8d7d2'),
        { mode:7, gloss:.04, round:.012 });
      break;
    }
    case 'phone':
      // Centred just inside the left palm so the supporting right thumb reaches the same screen.
      shape('softBox', lvL, 0.020, -0.030, 0.058, 0.078, 0.144, 0.013, DARKP, { gloss: 0.44 });
      shape('softBox', lvL, 0.020, -0.030, 0.066, 0.066, 0.128, 0.004, C('#8fd9c4'),
        { mode: 1, glow: 0.30 });
      break;
    case 'map': {
      // A folded directory held at the lower chest. Its pale face and two blue fold lines remain
      // legible at mall distance without becoming a billboard in front of the character. The page
      // frame is the two hands themselves, so lowering the page also lowers the prop.
      const map = itemBridge(wrL, wrR, torso);
      shape('softBox', map, 0, 0.020, 0.018, 0.300, 0.215, 0.018, MAPCREAM,
        { gloss: 0.08, round: 0.008 });
      for (const x of [-0.095, 0.095])
        shape('capsule', map, x, 0.020, 0.031, 0.008, 0.198, 0.006, MAPBLUE, GL2);
      shape('capsule', map, 0, 0.020, 0.033, 0.275, 0.008, 0.006, MAPBLUE, GL2);
      break;
    }
    case 'product':
      // A small boxed item being compared, kept close to one hand rather than floating at the
      // sternum. There is one in each hand because the activity explicitly alternates between two
      // choices; a right-only prop made the left-hand half of the comparison empty pantomime.
      shape('softBox', lvR, 0, -0.070, 0.045, 0.105, 0.145, 0.070, PRODUCT,
        { gloss: 0.22, round: 0.012 });
      shape('softBox', lvR, 0, -0.070, 0.082, 0.072, 0.034, 0.006, MAPCREAM, GL2);
      shape('softBox', lvL, 0, -0.070, 0.045, 0.100, 0.135, 0.068, PRODUCT2,
        { gloss: 0.22, round: 0.012 });
      shape('softBox', lvL, 0, -0.070, 0.080, 0.068, 0.031, 0.006, MAPCREAM, GL2);
      break;
    case 'productR':
      shape('softBox', lvR, 0, -0.070, 0.045, 0.105, 0.145, 0.070, PRODUCT,
        { gloss: 0.22, round: 0.012 });
      shape('softBox', lvR, 0, -0.070, 0.082, 0.072, 0.034, 0.006, MAPCREAM, GL2);
      break;
    case 'productL':
      shape('softBox', lvL, 0, -0.070, 0.045, 0.100, 0.135, 0.068, PRODUCT2,
        { gloss: 0.22, round: 0.012 });
      shape('softBox', lvL, 0, -0.070, 0.080, 0.068, 0.031, 0.006, MAPCREAM, GL2);
      break;
    case 'can': {                                   // watering can, tipped to pour
      const c = M.mul(lvR, M.rotX(0.62));
      shape('cyl', c, 0, -0.075, 0.014, 0.150, 0.140, 0.150, STEELY, { gloss: 0.52 });
      shape('cyl', c, 0, -0.005, 0.014, 0.160, 0.016, 0.160, C('#9aa3a9'), { gloss: 0.52 });
      shape('capsule', c, 0, -0.105, -0.136, 0.030, 0.190, 0.030, STEELY,
        { rx: 1.25, gloss: 0.52 });
      shape('capsule', c, 0, 0.040, 0.014, 0.024, 0.120, 0.024, DARKP, { rz: 1.5708 });
      break;
    }
    case 'feedBucket': {                            // keeper ration bucket at the left hip
      shape('taper', lvL, 0, -0.160, 0.020, 0.185, 0.225, 0.185, STEELY,
        { gloss: 0.48 });
      shape('cyl', lvL, 0, -0.045, 0.020, 0.190, 0.018, 0.190, C('#aab2b4'),
        { gloss: 0.50 });
      for (const x of [-.105, .0, .105])
        shape('ball', lvL, x, -0.030, 0.020 + Math.abs(x) * .12, .036, .026, .036,
          C('#8b6a36'), { gloss: 0.08 });
      for (const x of [-.165, .165])
        shape('capsule', lvL, x, .020, .020, .012, .125, .012, DARKP, GL2);
      shape('capsule', part(lvL, 0, .082, .020, M.rotZ(Math.PI / 2)),
        0, 0, 0, .012, .320, .012, DARKP, GL2);
      break;
    }
    case 'bag':                                     // only once it has been picked up
      if (prog < 0.42) break;
      shape('softBox', wrR, 0, -0.240, 0.010, 0.235, 0.300, 0.200, C('#3d4147'),
        { mode: 7, gloss: 0.10 });
      shape('capsule', wrR, 0, -0.095, 0.010, 0.030, 0.090, 0.030, C('#2c3035'));
      break;
    // The carrier bag a delivery arrives in, hanging plumb off the left hand so the right one
    // is still free to open a fridge with. Levelled rather than wrist-parented: a bag swings
    // from the handles whatever the arm is doing, it does not rotate with the forearm.
    case 'waimai':
      shape('softBox', lvL, 0, -0.225, 0.012, 0.195, 0.245, 0.135, C('#f2f0e9'), { gloss: 0.30 });
      shape('softBox', lvL, 0, -0.214, 0.012, 0.201, 0.066, 0.141, C('#a43c2c'), { gloss: 0.30 });
      shape('capsule', lvL, 0, -0.096, 0.012, 0.036, 0.070, 0.036, C('#f2f0e9'), { gloss: 0.28 });
      break;
    case 'parcel': {
      if (prog < 0.42) break;
      const q=itemBridge(wrL,wrR,torso);
      shape('softBox', q, 0, 0.040, 0.020, 0.300, 0.230, 0.230, CARD, { gloss: 0.10 });
      shape('softBox', q, 0, 0.040, 0.025, 0.060, 0.235, 0.235, C('#d9c9a8'), { gloss: 0.10 });
      break;
    }
    case 'book': {
      // A compact open volume, with two page blocks and a visible gutter. The old single white
      // rectangle was tablet-sized and read as a notice board in front of the torso.
      const q=itemBridge(wrL,wrR,torso);
      shape('softBox', q, 0, 0.055, 0.025, 0.220, 0.265, 0.036, C('#8d4a3a'), { gloss: 0.14 });
      shape('softBox', q, -0.108, 0.055, 0.046, 0.103, 0.242, 0.016, C('#f1ecdf'), { gloss: 0.10 });
      shape('softBox', q,  0.108, 0.055, 0.046, 0.103, 0.242, 0.016, C('#e8e1d2'), { gloss: 0.10 });
      shape('capsule', q, 0, 0.055, 0.064, 0.009, 0.240, 0.009, PAPERD, GL2);
      break;
    }
    case 'broom': {                                // long enough to meet the floor, held across both hands
      const b = itemShaft(wrR, wrL, torso);
      const down = Math.min(1.02, Math.max(.64, (b[13] - .08) / Math.max(.28, b[5])));
      const up = .34, length = down + up, centre = (up - down) * .5;
      shape('capsule', b, 0, centre, 0, 0.026, length, 0.026, BROOM, GL2);
      shape('softBox', b, 0, -down + .018, 0.010, 0.320, 0.050, 0.105, BROOM,
        { gloss: 0.10, round: 0.012 });
      shape('softBox', b, 0, -down - .030, 0.012, 0.350, 0.060, 0.135, BRISTLE,
        { gloss: 0.04, round: 0.010 });
      break;
    }
    case 'tool':                                   // small hand tool, enough to sell bench work
      shape('capsule', wrR, 0, -0.155, 0.010, 0.026, 0.250, 0.026, DARKP, GLD);
      shape('softBox', wrR, 0, -0.300, 0.010, 0.120, 0.048, 0.035, STEELY,
        { gloss: 0.54, round: 0.012 });
      break;
    case 'chart':                                  // clipboard held against the lower chest
      shape('softBox', torso, 0, 0.300, 0.286, 0.245, 0.315, 0.028, PAPER,
        { gloss: 0.10, round: 0.014 });
      shape('softBox', torso, 0, 0.442, 0.306, 0.085, 0.042, 0.020, CLIP,
        { gloss: 0.34, round: 0.010 });
      shape('capsule', torso, -0.045, 0.330, 0.309, 0.010, 0.135, 0.008, PAPERD, GL2);
      break;
    case 'card':                                   // fare card / payment card at the operating hand
      shape('softBox', lvR, 0, -0.050, 0.055, 0.082, 0.128, 0.009, C('#3f8f86'),
        { gloss: 0.34, round: 0.010 });
      shape('softBox', lvR, 0, -0.050, 0.061, 0.052, 0.022, 0.004, PAPER, GL2);
      break;
    case 'tile':                                   // a single mahjong tile between turns
      shape('softBox', lvR, 0, -0.052, 0.040, 0.060, 0.092, 0.034, PORC,
        { gloss: 0.32, round: 0.014 });
      shape('ball', lvR, 0, -0.052, 0.060, 0.018, 0.018, 0.006, C('#2f8066'), GL2);
      break;
    case 'chessPiece':
      shape('cyl', lvR, 0, -0.043, 0.034, 0.058, 0.050, 0.058, WOODY, { gloss: .24 });
      shape('cyl', lvR, 0, -0.014, 0.034, 0.045, 0.012, 0.045, C('#d6b77f'), GL2);
      break;
    case 'teapot': {                               // handle hand and supporting hand both drive it
      // Local X is the exact palm-to-palm line. The handle reaches one palm and the short spout
      // reaches the other, so the body cannot orbit one wrist or grow to cover the apron. This is
      // deliberately a compact gongfu pot: the former 34 cm sphere read as a kettle-sized balloon.
      const q = M.mul(itemBridge(wrL, wrR, torso), M.rotZ(-.25));
      // These use the same proven proportions as the display teapots in the home store. The three
      // short, deliberately overlapping handle strokes form one compact loop at the gripping hand;
      // a single straight stroke looked like a second spout.
      shape('ball', q, 0, 0, .030, .172, .140, .172, PORC, { gloss:.40 });
      shape('cyl', q, 0, .068, .030, .060, .028, .060, PORC, { gloss:.40 });
      shape('capsule', part(q, -.105, .012, .030, M.rotZ(1.02)),
        0, 0, 0, .012, .110, .012, PORC, { gloss:.38 });
      shape('capsule', q, .130, 0, .030, .014, .120, .014, PORC, { gloss:.38 });
      for (const y of [-.045, .045])
        shape('capsule', part(q, .096, y, .030, M.rotZ(Math.PI/2)),
          0, 0, 0, .014, .076, .014, PORC, { gloss:.38 });
      break;
    }
    case 'bouquet': {                              // stems and paper cradled between both forearms
      const q = itemBridge(wrL, wrR, torso);
      shape('taper', q, 0, -.105, .025, .105, .300, .070, MAPCREAM, { gloss:.05 });
      for (let i=0;i<5;i++) {
        const x=(i-2)*.040, y=.035+(i%2)*.035;
        shape('capsule', q, x, -.025, .028, .010, .260, .010, LEAF, GL2);
        shape('ball', q, x, y, .030, .050, .050, .050, i&1 ? PETAL : PRODUCT, { gloss:.10 });
      }
      break;
    }
    case 'receipt':
      shape('softBox', lvR, 0, -.070, .050, .085, .150, .006, PAPER, { gloss:.04 });
      shape('capsule', lvR, 0, -.070, .055, .055, .007, .005, PAPERD, GL2);
      break;
    case 'cigarette':
      shape('capsule', part(wrR, 0, -.095, .018, M.rotX(Math.PI/2)),
        0, 0, 0, .008, .105, .008, CIGPAPER, { gloss:.08 });
      shape('ball', wrR, 0, -.095, .073, .011, .011, .011, EMBER,
        { mode:1, glow:.85, gloss:.18 });
      break;
    case 'belt': {                                 // safety-demo buckle and two short webbing ends
      const q=itemBridge(wrL,wrR,torso);
      shape('capsule', part(q, -.105, 0, .012, M.rotZ(Math.PI/2)),
        0, 0, 0, .025, .210, .020, BELT, GL2);
      shape('capsule', part(q,  .105, 0, .012, M.rotZ(Math.PI/2)),
        0, 0, 0, .025, .210, .020, BELT, GL2);
      shape('softBox', q, 0, 0, .018, .075, .060, .025, STEELY, GLD);
      break;
    }
    case 'mask': {
      const q=lvR;
      shape('taper', q, 0, -.040, .040, .125, .100, .115, MASK, { gloss:.18 });
      shape('capsule', q, 0, -.115, .040, .020, .115, .020, C('#d5c879'), GL2);
      break;
    }
    case 'shirt': {                                 // the one you are about to put on
      if (prog < 0.52) break;
      const slot = World.rail && World.rail[flat.outfit % World.rail.length];
      const c = slot ? slot.color : TOP;
      shape('softBox', torso, 0, 0.250, 0.240, 0.260, 0.090, 0.200, tint(c, 1.18), { mode: 7 });
      shape('softBox', torso, 0, 0.250, 0.245, 0.230, 0.075, 0.180, c, { mode: 7 });
      break;
    }
    case 'glass':
      shape('cyl', lvR, 0, -0.038, 0.030, 0.084, 0.100, 0.084, C('#dbe7e9'),
        { alpha: 0.55, gloss: 0.70 });
      shape('cyl', lvR, 0, -0.055, 0.030, 0.072, 0.060, 0.072, WATERC, { gloss: 0.60 });
      break;
  }
}

// The player is an international visitor, communicated through practical travel
// clothes and the daypack the intro hands them, not stereotyped facial features.


// ---------------------------------------------------------------- neighbour behaviour
// Where a person should be right now. A spot is an hour window; a patrol is a loop they
// walk all day. Outside their hours they have gone home and are simply not drawn.
function dinerWindow(sp, h = minutes / 60) {
  return sp.h1 > 24 ? (h >= sp.h0 || h < sp.h1 - 24) : (h >= sp.h0 && h < sp.h1);
}
function dinerSpotNow(n) {
  return n.spots.find(sp => dinerWindow(sp)) || n.spots[0];
}
function dinerGuestActive(n) {
  return !!(n.spots && n.spots.some(sp => dinerWindow(sp)));
}
function dinerDoorMoment(kind) {
  if (place !== 'diner') return;
  Diner.doorPass();
  if (started) TrainAudio.dinerCue(kind || 'door');
}
// Scheduled customers do not pop into and out of their chairs. Each clock edge becomes a route
// through the front curtain, around the tea table and into a real seat or takeaway waiting spot.
// When the player is elsewhere we fast-forward the route so entering the room never reveals a
// crowd frozen outside waiting for a simulation tick it could not receive.
function updateDinerGuestRoutine(n) {
  if (!n.dinerGuest) return;
  const active = dinerGuestActive(n);
  if (place !== 'diner') {
    n.dinerActive = active;
    n.errand = null; n.wait = 0; n.ground = 0;
    n.dinerFlow = active ? 'seated' : 'gone';
    const at = active ? dinerSpotNow(n).at : Diner.ENTRY_OUT;
    n.x = at[0]; n.z = at[1];
    return;
  }
  if (active === n.dinerActive) return;
  n.dinerActive = active;
  n.wait = 0; n.ground = 0; n.faceLock = false;
  if (active) {
    const sp = dinerSpotNow(n);
    n.dinerFlow = 'entering';
    n.x = Diner.ENTRY_OUT[0]; n.z = Diner.ENTRY_OUT[1];
    n.errand = [
      { at:Diner.ENTRY_DOOR.slice(), speed:n.speed * 1.05, dwell:.12, act:'wait',
        done:() => dinerDoorMoment('door') },
      { at:Diner.ENTRY_AISLE.slice(), speed:n.speed, dwell:.12, act:'wait' },
      { at:sp.at.slice(), speed:n.speed * .88, dwell:.18, face:sp.face, act:sp.act,
        done:() => { n.dinerFlow = 'seated'; } },
    ];
  } else {
    n.dinerFlow = 'leaving';
    if (started) TrainAudio.dinerCue('bowl');
    n.errand = [
      { at:Diner.ENTRY_AISLE.slice(), speed:n.speed, dwell:.10, act:'wait',
        carry:!!n.takeaway, carryKind:n.takeaway ? 'waimai' : null },
      { at:Diner.ENTRY_DOOR.slice(), speed:n.speed * 1.08, dwell:.08, act:'wait',
        carry:!!n.takeaway, carryKind:n.takeaway ? 'waimai' : null,
        done:() => dinerDoorMoment('doorExit') },
      { at:Diner.ENTRY_OUT.slice(), speed:n.speed * 1.08, dwell:.08, act:'wait',
        carry:!!n.takeaway, carryKind:n.takeaway ? 'waimai' : null,
        done:() => { n.dinerFlow = 'gone'; n.th.reach = -1; } },
    ];
  }
}
let mallEventClock = NaN, mallEventCached = null, mallEventFlowCached = null;
function mallEventNow() {
  const m=Number(minutes)||0;
  if(m!==mallEventClock) {
    mallEventClock=m;
    mallEventCached=typeof Mall!=='undefined'&&Mall.eventAt
      ? Mall.eventAt(m) : {active:false,key:null,progress:0,mix:0};
    mallEventFlowCached=typeof Mall!=='undefined'&&Mall.eventFlowAt
      ? Mall.eventFlowAt(m) : {key:null,phase:'idle',attendance:0,progress:0};
  }
  return mallEventCached;
}
function mallEventFlowNow() { mallEventNow(); return mallEventFlowCached; }
function mallCrowdProfileAt(value=minutes) {
  const m=((Number(value)||0)%1440+1440)%1440,h=m/60;
  const event=value===minutes?mallEventNow()
    : typeof Mall!=='undefined'&&Mall.eventAt?Mall.eventAt(m):{active:false,key:null};
  if(h<7) return {key:'overnight',threshold:0,event:null};
  if(event.active) return {key:`event:${event.key}`,threshold:.96,event:event.key};
  if(h<11.5) return {key:'morning',threshold:.36,event:null};
  if(h<14) return {key:'lunch',threshold:.84,event:null};
  if(h<18.5) return {key:'afternoon',threshold:.60,event:null};
  if(h<22.5) return {key:'evening',threshold:.68,event:null};
  return {key:'late',threshold:.30,event:null};
}
// Five existing seated diners form the lunch line; no body or rig is added.  The count ramps up
// before noon, holds through the rush, and drains in twelve-minute steps after one.  Times outside
// the window return zero exactly, so a quiet breakfast/evening never inherits a stale queue.
function mallFoodQueueCountAt(value=minutes) {
  const m=((Number(value)||0)%1440+1440)%1440,start=11*60+20,noon=12*60,drain=13*60,end=14*60;
  if(m<start||m>=end)return 0;
  if(m<noon)return Math.min(5,Math.floor((m-start)/8)+1);
  if(m<drain)return 5;
  return Math.max(1,5-Math.floor((m-drain)/12));
}
function mallSocialActive(n,value=minutes) {
  if(!n||!n.mallSocial)return false;
  const h=(((Number(value)||0)%1440+1440)%1440)/60;
  switch(n.mallSocial.type) {
    case 'family': return h>=10&&h<15.5;
    case 'teens': return h>=15&&h<21.5;
    case 'couple': return h>=12&&h<21;
    case 'elders': return h>=10&&h<18;
    default:return false;
  }
}
function mallOwnerFor(n) {
  if(n._mallOwner!==undefined)return n._mallOwner;
  if(typeof Mall==='undefined'||!Mall.shopAt)return null;
  const q=Mall.shopAt(n.mallFloor||1,n.x,n.z);
  // Cache a real owner. Public actors remain unresolved because their route may legitimately pass
  // many shopfronts over a day; only somebody physically authored inside a unit needs its clock.
  if(q)n._mallOwner=q;
  return q||null;
}
function mallCrowdState() {
  const all=NPCS.filter(n=>n.place==='mall'),awake=all.filter(n=>n.awake);
  const customers=awake.filter(n=>n.hz==='顾客'||n.hz==='小孩');
  const shops={};
  for(const n of awake) {
    const q=mallOwnerFor(n);if(q)shops[q.kind]=(shops[q.kind]||0)+1;
  }
  return {profile:mallCrowdProfileAt(),total:all.length,awake:awake.length,
    customers:customers.length,staff:awake.length-customers.length,
    floors:[1,2,3].map(f=>awake.filter(n=>(n.mallFloor||1)===f).length),
    eventCast:awake.filter(n=>n.mallEventActive).length,
    afterHours:awake.filter(n=>n.mallAfterHours).map(n=>({role:n.mallAfterHours,
      held:npcHeldItem(n),x:+n.x.toFixed(2),z:+n.z.toFixed(2)})),shops};
}
function npcAwake(n) {
  // Item 334. Twelve floors share one footprint and one NPC list, so a resident authored for the
  // fourth floor was drawn on all twelve — the cast lane had to park sixteen of seventeen people
  // on the always-live decks to hide it. `deck` is only set by rows that belong to one storey;
  // everyone else is unaffected.
  if (n.place === 'home' && n.deck !== undefined && World.level() !== n.deck) return false;
  // Item 330. `days` is Date.getDay() order — 0 Sunday, 6 Saturday, matching .homecastcheck.js:121
  // — and `day` counts from 1 on a Monday, the same origin js/disrupt.js:158 reads weekends off.
  // Without this the weekday/weekend split in js/data.js is decoration.
  if (n.days && n.days.length && !n.days.includes((((day | 0) % 7) + 7) % 7)) return false;
  // The rider is not on the clock. He is at your door when there is something at your door.
  if (n.courier) return !!n.here && place === 'home' && World.level() === 2;
  // A passenger in the carriage is aboard or not aboard. The clock has nothing to do with it:
  // the train's own bookkeeping puts them on and takes them off at stations.
  if (n.rider) return !n.gone;
  // Same for somebody in the station: once they have boarded, the train they boarded has taken
  // them away, and they are out of the world until they arrive back on another one.
  if (n.commuter) return !n.gone;
  if (n.dinerGuest) return n.dinerFlow !== 'gone';
  // Residents remain visible while crossing a threshold, including the few seconds after
  // their normal spot hours have ended. Only the final `inside` state removes the body.
  if (n.home) return n.homePhase !== 'inside';
  const h = minutes / 60;
  if(n.place==='mall') {
    const owner=mallOwnerFor(n);
    // A scheduled closer may already have stepped through the doorway onto the public concourse.
    // Keep that public-side beat visible even if a large debug clock jump lands after a shutter's
    // final frame; nobody whose target remains inside receives the exception.
    const staffBeat=mallStaffBeatFor(n);
    if(owner&&Mall.shopTradingPhase&&Mall.shopTradingPhase(minutes,owner.hours).closed>=.98&&
       !(staffBeat&&staffBeat.public))
      return false;
    const eventCast=n.mallEventSlot!==undefined&&mallEventFlowNow().phase!=='idle';
    const socialCast=mallSocialActive(n);
    const foodQueueCast=n.mallFoodQueueSlot!==undefined&&
      n.mallFoodQueueSlot<mallFoodQueueCountAt();
    // These are public assignments that temporarily supersede an actor's ordinary rota.  The
    // closed-owner rejection above stays first and authoritative; once it has passed, an event
    // ingress/egress actor, an active social/food formation, or a staff beat explicitly authored
    // on the public side must be awake long enough for npcTarget() to place (or retire) that role.
    // Falling through to `n.hours` made five of six 10:00 event actors sleep through their own
    // 09:48–10:00 ingress and could hide a closer already moved outside the shutter.
    if(eventCast||socialCast||foodQueueCast||(staffBeat&&staffBeat.public))return true;
    if(!eventCast&&!socialCast&&!foodQueueCast&&(n.hz==='顾客'||n.hz==='小孩')&&
       (n.mallCrowdSlot===undefined?1:n.mallCrowdSlot)>=mallCrowdProfileAt().threshold)
      return false;
  }
  // A shift that ends after midnight is written past 24 — the night market's people are all
  // [19, 26], on at seven and gone by two — so the window wraps round the end of the day. Every
  // hour range in this file goes through here, and the two forms have to agree or a stall holder
  // is standing at his grill at four in the afternoon and gone by half past midnight.
  const within = (a, b) => b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b);
  if (n.hours) return within(n.hours[0], n.hours[1]);
  if (!n.spots) return true;
  return n.spots.some(sp => within(sp.h0, sp.h1));
}

function homeTimeOut(home) {
  const h = minutes / 60;
  return home.leave <= home.back
    ? h >= home.leave && h < home.back
    : h >= home.leave || h < home.back;
}

// Notice the two clock edges, not just the current hour. Crossing the morning edge starts a
// walk from inside to the paving; crossing the evening edge sends the resident to the paving
// first and only then through the door. A sleep action can skip midnight in one tick, so a new
// day always resets the unseen night at home before deciding whether it is time to leave again.
function updateHomeRoutine(n) {
  if (!n.home) return;
  if (n.homeDay !== day) {
    n.homeDay = day;
    n.homeAway = false;
    n.homePhase = 'inside';
    n.x = n.home.inside[0]; n.z = n.home.inside[1];
    n.ground = 0; n.wait = 0; n.leg = 0;
  }
  const away = homeTimeOut(n.home);
  if (away === n.homeAway) return;
  n.homeAway = away;
  n.wait = 0;
  if (away) {
    // Start behind the wall even when several hours were skipped while the player slept.
    n.x = n.home.inside[0]; n.z = n.home.inside[1];
    n.ground = 0; n.leg = 0;
    n.homePhase = 'leaving';
  } else {
    n.homePhase = 'returning';
  }
}

// A word such as `sit` is an animation request, not proof that there is furniture under the
// person.  Scheduled spots were historically authored separately from their chairs and the pose
// silently invented a 42 cm seat whenever a height was missing.  Resolve the spot against the
// finished room once instead: only a real, horizontal, furniture-sized surface may lower the
// body.  Optional activities (phone/read/eat/drink/play) can then remain perfectly ordinary
// standing actions when their spot is not a seat; explicit sit/desk spots are left standing and
// are reported by the seating audit rather than floating in mid-air.
const NPC_SEAT_REQUIRED = new Set(['sit', 'desk']);
const NPC_SEAT_OPTIONAL = new Set(['play', 'phone', 'read', 'eat', 'drink']);
const NPC_SEAT_ACTS = new Set([...NPC_SEAT_REQUIRED, ...NPC_SEAT_OPTIONAL]);
const npcSeatClaims = [];

function npcSeatFloor(n, sp, room) {
  if (n.place === 'mall' && typeof Mall !== 'undefined')
    return Mall.deckY(n.mallFloor || 1) || 0;
  // A berthed metro car is a second floor inside the station.  Its riders are moved with the car
  // and carry that floor explicitly; Metro.liftAt only describes the platform and stairs.
  if (n.place === 'metro' && Number.isFinite(n.lift)) return n.lift;
  if (room && typeof room.liftAt === 'function') {
    const y = room.liftAt(sp.at[0], sp.at[1]);
    if (Number.isFinite(y)) return y;
  }
  return 0;
}

function resolveNPCSeat(n, sp) {
  const act = n.act || (sp && sp.act);
  if (n.animal || !sp || !Array.isArray(sp.at) || !NPC_SEAT_ACTS.has(act)) return null;
  const room = PLACES[n.place];
  if (!room || !Array.isArray(room.props)) return null;
  const floor = npcSeatFloor(n, sp, room), x = sp.at[0], z = sp.at[1];
  const authoredHere = Number.isFinite(sp.seatY) ? sp.seatY : null;
  const authoredPerson = Number.isFinite(n.seatY) ? n.seatY : null;
  const old = sp._seatSupport;
  if (old && old.propsCount === room.props.length && old.x === x && old.z === z &&
      Math.abs(old.floor - floor) < 0.001) return old;

  let best = null, bestScore = Infinity;
  for (const p of room.props) {
    // Quads are floors, decals, glass and signs.  Imported models expose one transform for the
    // entire asset rather than a measured cushion, so neither can establish physical contact.
    if (!p || !p.m || p.mesh === 'quad' || p.fixed) continue;
    const m = p.m;
    const sx = Math.hypot(m[0], m[1], m[2]);
    const sy = Math.hypot(m[4], m[5], m[6]);
    const sz = Math.hypot(m[8], m[9], m[10]);
    // Three-seat sofas and hotel daybeds are valid supports too.  Reject tiny props (books,
    // phones, cups) by area, but do not reject a real cushion merely because it is longer than an
    // individual chair.
    if (!(sx > .075 && sz > .075 && sx <= 3.6 && sz <= 3.6 && sx * sz >= .04 &&
          sy > .008 && sy <= .38))
      continue;
    // The prop's local up axis must really point up.  This excludes backrests, rails and tilted
    // decoration whose bounding-box top happens to pass through chair height.
    if (Math.abs(m[5]) / sy < .92) continue;
    const panTop = m[13] + Math.abs(m[5]) * .5;
    const seatY = panTop - floor;
    if (!Number.isFinite(seatY)) continue;
    if (authoredHere !== null) {
      if (Math.abs(seatY - authoredHere) > .16) continue;
    } else if (authoredPerson !== null && authoredPerson > .64) {
      // Clinical beds and unusually high operator chairs are intentional, but only when the row
      // says so.  A normal chair range must not accidentally bind to a desk top.
      if (Math.abs(seatY - authoredPerson) > .18) continue;
    } else if (seatY < .28 || seatY > .64) continue;

    // Test the oriented footprint.  The former audit used an axis-aligned box, which passed a
    // sitter beside a chair whenever that chair was rotated.  Eight centimetres allows hips near
    // the rounded edge of a cushion while still requiring actual overlap.
    const dx = x - m[12], dz = z - m[14];
    const ux = m[0] / sx, uz = m[2] / sx;
    const vx = m[8] / sz, vz = m[10] / sz;
    const lx = Math.abs(dx * ux + dz * uz), lz = Math.abs(dx * vx + dz * vz);
    const edgeX = lx - sx * .5, edgeZ = lz - sz * .5;
    if (edgeX > .08 || edgeZ > .08) continue;

    // Sit on the top cushion, not a lower frame rail that happens to be closer to an old authored
    // seatY.  Height dominates the small edge tie-breakers by design: physical contact with the
    // topmost plausible surface is the contract.
    const score = -seatY * 100
      + Math.max(0, edgeX) * 4 + Math.max(0, edgeZ) * 4
      + Math.max(0, .16 - Math.min(sx, sz)) * .25;
    if (score >= bestScore) continue;
    bestScore = score;
    best = {
      supported: true, seatY, panTop, floor, tag: p.tag || null,
      x, z, propsCount: room.props.length,
    };
  }
  sp._seatSupport = best || {
    supported: false, seatY: null, panTop: null, floor, tag: null,
    x, z, propsCount: room.props.length,
  };
  return sp._seatSupport;
}

function claimNPCSeat(n, support) {
  for (const q of npcSeatClaims) {
    if (q.place !== n.place || Math.abs(q.floor - support.floor) > .12) continue;
    if (Math.hypot(q.x - support.x, q.z - support.z) < .44) return false;
  }
  npcSeatClaims.push({ place:n.place, floor:support.floor, x:support.x, z:support.z, n });
  return true;
}

// The atrium keeps one clear, shared event footprint.  These six stable destinations reuse the
// six bodies assigned by initNPC: fitness occupies the six authored mats, fashion splits two
// models from an announcer and side audience, and the light show faces five spectators toward a
// single operator at the real desk.  Each actor owns one reusable spot object so the programme
// does not allocate six arrays and records on every animation frame.
const MALL_EVENT_FITNESS=[
  [0,6.55],[-.80,5.75],[0,5.75],[.80,5.75],[-.40,4.85],[.40,4.85],
];
const MALL_EVENT_FASHION_AUDIENCE=[[-1.15,5.25],[1.15,5.25],[-1.15,4.55]];
const MALL_EVENT_LIGHTS=[[0,6.02],[-1.05,5.55],[1.05,5.55],[-1.05,4.72],[1.05,4.72],[0,4.34]];
// The five additional programme keys reuse those same six public actors and the same compact
// atrium footprint.  Roles/poses are data rather than extra branches full of bodies: a launch has
// a presenter and demonstrations, a signing has one writer and a real queue, cooking has two
// workers, craft has a teacher/table group, and esports has two players plus a commentator.
const MALL_EVENT_SPECIAL_POS=[[0,6.55],[-.72,5.78],[.72,5.78],[-1.05,4.88],[0,4.62],[1.05,4.88]];
const MALL_EVENT_SPECIAL={
  launch:{roles:['presenter','demonstrator','demonstrator','audience','audience','audience'],
    acts:['talk','compare','compare','stand','phoneStand','stand']},
  signing:{roles:['author','host','reader','reader','queue','queue'],
    acts:['write','hands','read','read','wait','wait']},
  cooking:{roles:['chef','assistant','taster','taster','audience','audience'],
    acts:['cook','pour','eat','eat','stand','phoneStand']},
  craft:{roles:['teacher','assistant','participant','participant','participant','observer'],
    acts:['work','shelve','work','work','work','phoneStand']},
  esports:{roles:['player','player','commentator','spectator','spectator','spectator'],
    acts:['play','play','talk','phoneStand','hands','hands']},
};
function mallEventSpot(n) {
  if(n.mallEventSlot===undefined)return null;
  const e=mallEventFlowNow();
  if(e.phase==='idle'||n.mallEventSlot>=e.attendance) { n.mallEventActive=false; return null; }
  const slot=n.mallEventSlot;
  const sp=n._mallEventSpot||(n._mallEventSpot={at:[0,0],act:'stand',role:'audience',event:null});
  if(sp.event!==e.key) {
    sp.event=e.key;
    n.mallPause=null;n.wait=0;n.mallBlocked=0;
  }
  let x=0,z=5.2,face=0,act='stand',role='audience';
  if(e.key==='fitness') {
    [x,z]=MALL_EVENT_FITNESS[slot];
    const poses=['stretch','taiji','hands'];
    act=poses[Math.min(2,Math.floor(e.progress*3))];
    role=slot===0?'coach':'participant';
  } else if(e.key==='fashion') {
    if(slot<2) {
      // Two models start on opposite halves of the runway loop, making start/middle/end views
      // genuinely different without teleporting or asking the crowd system for another actor.
      const lap=(e.progress*1.55+slot*.50)%1;
      x=slot?.18:-.18;z=4.28+lap*2.30;face=0;act='walk';role='model';
    } else if(slot===2) {
      x=1.18;z=6.42;face=-Math.PI*.5;act='hands';role='announcer';
    } else {
      [x,z]=MALL_EVENT_FASHION_AUDIENCE[slot-3];
      face=x<0?Math.PI*.5:-Math.PI*.5;act=slot===5?'phoneStand':'stand';role='spectator';
    }
  } else if(MALL_EVENT_SPECIAL[e.key]) {
    const q=MALL_EVENT_SPECIAL[e.key];
    [x,z]=MALL_EVENT_SPECIAL_POS[slot];act=q.acts[slot];role=q.roles[slot];
    // The working row looks south to the audience; the three public-side rows look north at it.
    face=slot<3?Math.PI:0;
  } else {
    [x,z]=MALL_EVENT_LIGHTS[slot];
    act=slot===0?'work':slot%2?'dance':'hands';
    role=slot===0?'operator':'spectator';
  }
  sp.at[0]=x;sp.at[1]=z;sp.face=face;sp.act=act;sp.role=role;
  n.mallEventActive=true;n.mallEventRole=role;n.face=face;n.spot=sp;
  return sp;
}

function mallEventCastState() {
  return NPCS.filter(n=>n.mallEventSlot!==undefined).map(n=>({
    slot:n.mallEventSlot,awake:!!n.awake,active:!!n.mallEventActive,
    event:n._mallEventSpot&&n._mallEventSpot.event||null,role:n.mallEventRole||null,
    act:n.spot&&n.spot.act||null,x:+n.x.toFixed(2),z:+n.z.toFixed(2),
    target:n.mallEventActive&&n.spot&&n.spot.at
      ? [+n.spot.at[0].toFixed(2),+n.spot.at[1].toFixed(2)] : null,
  }));
}

function mallSocialSpot(n) {
  const q=n.mallSocial,leader=q&&q.leader;
  if(!q||q.role==='leader'||q.type==='elders'||!mallSocialActive(n)||!leader||!leader.awake||
     n.mallEventActive||leader.mallEventActive) {n.mallFormationActive=false;return null;}
  const sp=n._mallSocialSpot||(n._mallSocialSpot={at:[0,0],act:'stand',role:q.type});
  const side=q.offset[0],forward=q.offset[1],yaw=leader.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
  sp.at[0]=leader.x+c*side+s*forward;
  sp.at[1]=leader.z-s*side+c*forward;
  sp.face=yaw;sp.act=(leader.ground||0)>.08?'walk':'chat';
  n.mallFormationActive=true;n.face=sp.face;n.spot=sp;
  return sp;
}

function mallSocialState() {
  const groups={};
  for(const n of NPCS) if(n.mallSocial) {
    const key=n.mallSocial.key,g=groups[key]||(groups[key]={type:n.mallSocial.type,active:mallSocialActive(n),members:[]});
    g.members.push({role:n.mallSocial.role,awake:!!n.awake,formation:!!n.mallFormationActive,
      face:n.look&&n.look.faceSeed,x:+n.x.toFixed(2),z:+n.z.toFixed(2)});
  }
  for(const g of Object.values(groups)) if(g.members.length>1) {
    const a=g.members[0];g.spacing=g.members.slice(1).map(n=>+Math.hypot(n.x-a.x,n.z-a.z).toFixed(2));
  }
  return groups;
}

// One line beside the first food-hall counter, parallel to its face.  x=18.05 keeps every body
// east of the authored 2.20 m gangway (x 14.40–16.60), leaving more than the required 1.2 m clear
// even after the crowd's personal radius; the 80 cm pitch prevents queued silhouettes merging.
const MALL_FOOD_QUEUE_POS=[
  [18.05,-14.25],[18.05,-13.45],[18.05,-12.65],[18.05,-11.85],[18.05,-11.05],
];
function mallFoodQueueSpot(n,value=minutes) {
  const slot=n&&n.mallFoodQueueSlot,count=mallFoodQueueCountAt(value);
  if(slot===undefined||slot>=count) {if(n)n.mallFoodQueued=false;return null;}
  const p=MALL_FOOD_QUEUE_POS[slot];
  const sp=n._mallFoodQueueSpot||(n._mallFoodQueueSpot={at:[p[0],p[1]],act:'wait',role:'lunch-queue'});
  sp.at[0]=p[0];sp.at[1]=p[1];sp.face=Math.PI/2;
  n.mallFoodQueued=true;n.face=sp.face;n.spot=sp;
  return sp;
}
function mallFoodQueueState(value=minutes) {
  const count=mallFoodQueueCountAt(value);
  const actors=NPCS.filter(n=>n.mallFoodQueueSlot!==undefined).map(n=>({
    slot:n.mallFoodQueueSlot,active:n.mallFoodQueueSlot<count,awake:!!n.awake,
    queued:!!n.mallFoodQueued,x:+n.x.toFixed(2),z:+n.z.toFixed(2),
    target:MALL_FOOD_QUEUE_POS[n.mallFoodQueueSlot].slice(),
  }));
  return {time:Number(value)||0,count,capacity:MALL_FOOD_QUEUE_POS.length,
    gangway:[14.40,16.60],queueX:18.05,clearance:1.45,actors};
}

// Existing tenant staff also carry the three clock tableaux.  A row is an assignment, not a new
// actor: `rig` or `faceSeed` resolves one person already folded from MallCast.  At 08:45 the early
// café and bakery are fully open; at noon the café pair hand the counter over; at 21:45 the same
// pair close from the PUBLIC side of the shopfront while its shutter begins to descend.  This is
// why the final two positions are z=-12.42 rather than their normal z=-16.83 counter positions.
// There can be several duties in one scene (opening + stocking), but never two rows for one actor.
const MALL_STAFF_BEATS=[
  {key:'opening-stock',center:8*60+45,half:10,actors:[
    {actor:'mall-cafe-owner-fang-qiming',role:'opening',owner:'咖啡店',hours:[7,22],
      at:[-16.65,-16.83],face:0,act:'check',held:'chart',public:false},
    {faceSeed:8831,role:'stocking',owner:'面包店',hours:[7,21],
      at:[16.30,-16.49],face:0,act:'shelve',held:null,public:false},
  ]},
  {key:'shift-change',center:12*60,half:8,actors:[
    {actor:'mall-cafe-owner-fang-qiming',role:'shift-out',owner:'咖啡店',hours:[7,22],
      at:[-16.65,-16.83],face:Math.PI/2,act:'chat',held:'chart',public:false},
    {actor:'mall-cafe-cashier-su-xiaoman',role:'shift-in',owner:'咖啡店',hours:[7,22],
      at:[-15.45,-16.83],face:-Math.PI/2,act:'chat',held:null,public:false},
  ]},
  {key:'closing',center:21*60+45,half:10,actors:[
    {actor:'mall-cafe-owner-fang-qiming',role:'closing-floor',owner:'咖啡店',hours:[7,22],
      at:[-14.90,-12.42],face:Math.PI,act:'sweep',held:'broom',public:true},
    {actor:'mall-cafe-cashier-su-xiaoman',role:'closing-check',owner:'咖啡店',hours:[7,22],
      at:[-14.10,-12.42],face:Math.PI,act:'check',held:'chart',public:true},
  ]},
];
const mallClockMinute=value=>((Number(value)||0)%1440+1440)%1440;
function mallStaffSceneAt(value=minutes) {
  const m=mallClockMinute(value);
  return MALL_STAFF_BEATS.find(q=>Math.abs(m-q.center)<q.half)||null;
}
function mallStaffActorMatches(n,q) {
  return !!(n&&n.mallTenantCast&&((q.actor&&n.rig===q.actor)||
    (q.faceSeed!==undefined&&n.look&&n.look.faceSeed===q.faceSeed)));
}
function mallStaffBeatFor(n,value=minutes) {
  const scene=mallStaffSceneAt(value);
  return scene&&scene.actors.find(q=>mallStaffActorMatches(n,q))||null;
}
function mallStaffBeatSpot(n,value=minutes) {
  const q=mallStaffBeatFor(n,value);
  if(!q){if(n)n.mallStaffBeatActive=false;return null;}
  const scene=mallStaffSceneAt(value);
  const sp=n._mallStaffBeatSpot||(n._mallStaffBeatSpot={at:[0,0],act:'stand',held:null,
    role:null,key:null,public:false});
  if(sp.key!==scene.key){n.wait=0;n.mallPause=null;n.mallBlocked=0;sp.key=scene.key;}
  sp.at[0]=q.at[0];sp.at[1]=q.at[1];sp.face=q.face;sp.act=q.act;sp.held=q.held;
  sp.role=q.role;sp.public=q.public;
  n.mallStaffBeatActive=true;n.mallStaffRole=q.role;n.face=q.face;n.spot=sp;
  return sp;
}
function mallStaffChoreographyState(value=minutes) {
  const scene=mallStaffSceneAt(value);
  if(!scene)return {time:mallClockMinute(value),key:'ordinary',actors:[],duplicates:0,behindShutter:0};
  const actors=scene.actors.map(q=>{
    const n=NPCS.find(a=>mallStaffActorMatches(a,q));
    const phase=typeof Mall!=='undefined'&&Mall.shopTradingPhase
      ? Mall.shopTradingPhase(value,q.hours):{key:'unknown',closed:0};
    return {role:q.role,owner:q.owner,actor:q.actor||`face-${q.faceSeed}`,
      found:!!n,awake:!!(n&&n.awake),act:q.act,held:q.held||null,public:q.public,
      phase:phase.key,closed:+phase.closed.toFixed(3),behindShutter:phase.closed>=.98&&!q.public,
      target:q.at.slice(),current:n?[+n.x.toFixed(2),+n.z.toFixed(2)]:null};
  });
  const ids=actors.map(q=>q.actor),duplicates=ids.length-new Set(ids).size;
  return {time:mallClockMinute(value),key:scene.key,actors,duplicates,
    behindShutter:actors.filter(q=>q.behindShutter).length};
}

function mallAccessibilityState() {
  const actors=NPCS.filter(n=>n.mallAccessible).map(n=>({
    kind:n.mallAccessible.kind,face:n.look&&n.look.faceSeed,rig:n.rig||null,
    reused:n.mallAccessible.reused,actorDelta:n.mallAccessible.actorDelta,
    floor:n.mallFloor||1,route:n.mallAccessible.route,points:n.patrol.length,
    entrance:n.patrol.some(p=>Math.abs(p[0])<1.5&&p[1]<-15),
    lift:n.patrol.some(p=>Math.abs(p[0]-16.54)<.5&&Math.abs(p[1]-14.2)<.05),
    clearance:n.mallAccessible.clearance,awake:!!n.awake,
    x:+n.x.toFixed(2),z:+n.z.toFixed(2),active:mallAccessibleActive(n),
  }));
  return {actors,actorDelta:actors.reduce((sum,q)=>sum+q.actorDelta,0),
    kinds:[...new Set(actors.map(q=>q.kind))].sort(),route:'entrance-to-lift'};
}

function campusStaticSpotNow(n) {
  const h = minutes / 60;
  return n.spots.find(q => q.h1 > 24 ? (h >= q.h0 || h < q.h1 - 24)
                                     : (h >= q.h0 && h < q.h1)) || n.spots[0];
}
function snapCampusStaticNPC(n, sp = campusStaticSpotNow(n)) {
  n.campusStaticSpot = sp;
  n.campusStaticPending = null;
  n.x = sp.at[0]; n.z = sp.at[1];
  n.face = sp.face; n.yaw = sp.face === undefined ? n.yaw : sp.face;
  n.spot = sp; n.errand = null; n.wait = 0; n.ground = 0; n.animGround = 0;
  if (n.th) {
    n.th.pos[0] = n.x; n.th.pos[2] = n.z;
    n.th.focus[0] = n.x; n.th.focus[1] = n.z;
  }
  return sp.at;
}
function syncCampusStaticNPCs() {
  for (const n of NPCS) if (n.place === 'campus' && n.campusStatic)
    snapCampusStaticNPC(n);
}
function campusStaticTarget(n) {
  const scheduled = campusStaticSpotNow(n);
  if (!n.campusStaticSpot) return snapCampusStaticNPC(n, scheduled);
  if (scheduled !== n.campusStaticSpot) {
    // A schedule edge while Campus is visible is queued instead of becoming a straight-line walk
    // through the new buildings. Leaving the scene applies the latest queued/current schedule;
    // entering it always snaps before the first Campus frame is rendered.
    if (place === 'campus') n.campusStaticPending = scheduled;
    else return snapCampusStaticNPC(n, scheduled);
  } else n.campusStaticPending = null;
  const held = n.campusStaticSpot;
  n.face = held.face; n.spot = held;
  return held.at;
}

function npcTarget(n) {
  n.seatCandidate = null;
  // The outside waypoint makes the approach square to the opening. Going directly from a work
  // spot to the inside point cuts diagonally through the courtyard wall beside the door.
  if (n.homePhase === 'leaving') {
    n.spot = { act:'wait' };
    return n.home.outside;
  }
  if (n.homePhase === 'returning') {
    n.spot = null;
    return n.home.outside;
  }
  if (n.homePhase === 'entering') {
    n.spot = null;
    return n.home.inside;
  }
  // An errand beats the day's routine. A waitress with a bowl in her hands is going to a table,
  // not standing at her counter, and she picks her own spot back up when it is delivered.
  if (n.errand && n.errand.length) {
    const leg = n.errand[0];
    n.face = leg.face; n.spot = leg;
    const support = resolveNPCSeat(n, leg);
    if (support && support.supported) n.seatCandidate = support;
    n.carrying = !!leg.carry;
    n.carryKind = leg.carryKind || null;
    return leg.at;
  }
  if (n.campusStatic) {
    n.carrying = false; n.carryKind = null;
    return campusStaticTarget(n);
  }
  const staffBeat=mallStaffBeatSpot(n);
  if(staffBeat) {
    n.carrying=false;n.carryKind=null;
    return staffBeat.at;
  }
  const eventSpot=mallEventSpot(n);
  if(eventSpot) {
    n.carrying=false;n.carryKind=null;
    return eventSpot.at;
  }
  const foodQueueSpot=mallFoodQueueSpot(n);
  if(foodQueueSpot) {
    n.carrying=false;n.carryKind=null;
    return foodQueueSpot.at;
  }
  const socialSpot=mallSocialSpot(n);
  if(socialSpot) {
    n.carrying=false;n.carryKind=null;
    return socialSpot.at;
  }
  n.carrying = false; n.carryKind = null;
  if (n.patrol) {
    // A mall itinerary pauses *at* the place that gave the walk a reason. Keep that arrived
    // activity and position until its dwell expires; otherwise selecting the next patrol point
    // here makes shoppers stand at one display while already acting at the next one.
    if (n.mallPause && n.wait > 0) {
      n.face = n.mallPause.face;
      n.spot = n.mallPause;
      return n.mallPause.at;
    }
    n.spot = null;
    return n.patrol[n.leg % n.patrol.length];
  }
  const h = minutes / 60;
  // Same wrapping rule as `awake` above: a spot that runs past midnight is written past 24.
  const sp = n.spots.find(q => q.h1 > 24 ? (h >= q.h0 || h < q.h1 - 24)
                                         : (h >= q.h0 && h < q.h1)) || n.spots[0];
  n.face = sp.face; n.spot = sp;
  const support = resolveNPCSeat(n, sp);
  if (support && support.supported) n.seatCandidate = support;
  return sp.at;
}

// Turn a mall route into an itinerary instead of an endless lap. Tenant routes already enter
// real shops and pass real displays; what was missing was the reason to stop when they arrived.
// Edge points are shopfronts and receive a longer browse/pay dwell. Concourse points get a short
// orientation or waiting beat, while security pauses to observe the floor. All choices are stable
// per person and visit, so the crowd varies without flickering or spending random numbers at 60 Hz.
function mallPatrolPause(n, leg) {
  const at = n.patrol[leg % n.patrol.length];
  const x = at[0], z = at[1], edge = Math.max(Math.abs(x), Math.abs(z)) > 15;
  const centre = Math.abs(x) < 8 && Math.abs(z) < 9;
  const visit = n.mallVisits = (n.mallVisits || 0) + 1;
  const who = `${n.hz || ''}|${n.job || ''}|${n.role || ''}`;
  const child = /小孩|儿童/.test(who), shopper = n.hz === '顾客' || child;
  const security = /保安|警卫|安保/.test(who), cleaner = /保洁|清洁/.test(who);
  const staff = security || cleaner || /店员|收银|导购|老板|服务员|员工/.test(who);

  // A route now belongs to a small goal-driven trip. Shoppers inspect something before comparing
  // it and only then pay; a new lap chooses another purpose. Staff patrols alternate real duties,
  // children orient and browse for shorter beats, and concourse pauses become map/phone checks.
  // Decisions happen only on arrival, so this is a few integer operations per stop rather than an
  // AI planner burning time every frame.
  const goals = ['clothes', 'food', 'electronics', 'gift', 'errand'];
  const lap = Math.floor(leg / Math.max(1, n.patrol.length));
  if (!n.mallGoal || n.mallGoalLap !== lap) {
    n.mallGoalLap = lap;
    n.mallGoal = goals[(n.seed + lap * 3) % goals.length];
    n.mallTripStage = 0;
  }
  let act = 'wait', intent = 'orient', dwell = 1.2;
  if (security) {
    act = visit % 3 === 0 ? 'check' : 'hands';
    intent = act === 'check' ? 'inspect-zone' : 'observe-floor';
    dwell = 4.5;
  } else if (cleaner) {
    act = visit % 3 === 0 ? 'sweep' : 'work';
    intent = act === 'sweep' ? 'clean-route' : 'check-fixture';
    dwell = 4.0;
  } else if (staff) {
    act = edge ? (visit % 3 === 0 ? 'shelve' : 'work') : 'hands';
    intent = edge ? (act === 'shelve' ? 'restock' : 'inspect-display') : 'watch-aisle';
    dwell = edge ? 4.0 : 2.5;
  } else if (shopper && edge) {
    const stage = n.mallTripStage || 0;
    if (child) {
      act = stage % 3 === 1 ? 'compare' : 'browse';
      intent = act === 'compare' ? 'inspect-choice' : 'browse-display';
      dwell = act === 'compare' ? 4.0 : 5.5;
    } else if (stage === 0) {
      act = 'browse'; intent = `browse-${n.mallGoal}`; dwell = 7.0;
    } else if (stage === 1) {
      act = 'compare'; intent = `compare-${n.mallGoal}`; dwell = 5.5;
    } else if (stage === 2) {
      act = 'buy'; intent = `pay-${n.mallGoal}`; dwell = 5.5;
    } else {
      act = 'browse'; intent = `check-another-${n.mallGoal}`; dwell = 4.5;
    }
    n.mallTripStage = Math.min(4, stage + 1);
  } else if (shopper && centre) {
    act = (visit + n.seed) % 3 === 0 ? 'phoneStand' : 'lookMap';
    intent = act === 'phoneStand' ? 'check-message' : 'find-next-shop';
    dwell = act === 'phoneStand' ? 3.8 : 4.8;
  } else if (shopper) {
    act = (visit + n.seed) % 4 === 0 ? 'phoneStand' : 'wait';
    intent = act === 'phoneStand' ? 'check-list' : 'yield-orient';
    dwell = act === 'phoneStand' ? 3.4 : 1.4;
  }
  let face;
  if (edge) face = Math.abs(x) > Math.abs(z)
    ? (x > 0 ? Math.PI / 2 : -Math.PI / 2)
    : (z > 0 ? 0 : Math.PI);
  else face = n.yaw;
  const beat = ((n.seed * 13 + leg * 17 + visit * 11) % 19) / 19;
  return {
    at:[x, z], face, act, intent, goal:n.mallGoal,
    dwell:dwell + beat * (act === 'browse' ? 4.0 : act === 'wait' ? 1.5 : 2.0),
  };
}

// Tenant fit-outs can be added after an older concourse route was authored. Validate moving route
// points against the finished collision map once, before the mall is revealed, so the first step
// does not discover that its starting point is inside a newly fitted shop and snap a metre to the
// far side of the display. Static staff/seats are intentionally not touched: their authored pose
// and counter/chair relationship is exact.
function sanitizeMallPatrols() {
  if (place !== 'mall' || typeof Mall === 'undefined') return;
  for (const n of NPCS) {
    if (n.place !== 'mall' || !n.patrol || n._mallRouteSanitized) continue;
    const radius=mallClearanceRadius(n);
    for (const at of n.patrol) {
      const safe = (n.mallFloor || 1) > 1
        ? Mall.clampUpper(at[0], at[1], at[0], at[1], radius, n.mallFloor)
        : Mall.clampMove(at[0], at[1], at[0], at[1], radius);
      at[0] = safe[0]; at[1] = safe[1];
    }
    const here = n.patrol[n.leg % n.patrol.length];
    const safeNow = (n.mallFloor || 1) > 1
      ? Mall.clampUpper(n.x, n.z, n.x, n.z, radius, n.mallFloor)
      : Mall.clampMove(n.x, n.z, n.x, n.z, radius);
    if (Math.hypot(safeNow[0] - n.x, safeNow[1] - n.z) > .04) {
      n.x = here[0]; n.z = here[1]; n.ground = 0;
    }
    n._mallRouteSanitized = true;
  }
}

// `still` is how much of this is allowed to apply: everything here belongs to a body that is
// standing, and laid over a walk at full strength it fights the gait's own arm swing and the
// stride comes out drunk. `free` is whether the arms are the trait's to use at all — behind a
// counter, under a tray or in the middle of 太极 they are not, and a wrist-check fired into
// the middle of a sweep is worse than no mannerism at all.
function traitPose(g, n, now, still, free) {
  const tr = n.temper;
  if (!tr || still < 0.02) return;
  const t = now / 1000 + n.seed;
  const r = tr.restless;
  // Three slow waves at rates that do not divide into each other, so the drift never visibly
  // repeats — which is what separates a person standing there from an idle animation looping.
  g.sway      += Math.sin(t * 0.31 * r) * 0.012 * r * still;
  g.torsoRoll += Math.sin(t * 0.27 * r + 1.1) * 0.014 * r * still;
  g.torsoYaw  += Math.sin(t * 0.19 * r + 2.3) * 0.020 * r * still;
  // Imported shoulders already carry the real garment/body silhouette. Adding the primitive
  // figure's temperament splay on top re-opened every relaxed arm into a small zombie pose.
  if (!n.rig) { g.shLz -= tr.open * 0.055 * still; g.shRz += tr.open * 0.055 * still; }
  g.torsoPitch -= tr.open * 0.030 * still;
  g.headPitch  -= tr.open * 0.045 * still;
  g.headYaw += (Math.sin(t * 0.17) * 0.15 + Math.sin(t * 0.41 + 1.7) * 0.05)
             * tr.curious * still;

  if (!free || !tr.quirk) return;
  // The periodic mannerisms come round about every eleven seconds and last a beat and a half.
  // Faster than this and the person reads as twitching; slower and you never see it happen.
  const k = bump((t / 11.5) % 1, 0.5, 0.15) * still;
  switch (tr.quirk) {
    case 'check':                       // a glance down at the wrist
      g.shR = lerp(g.shR, -1.16, k); g.shRz = lerp(g.shRz, 0.30, k);
      g.elbR = lerp(g.elbR, -1.62, k); g.headPitch += k * 0.26;
      break;
    case 'scratch':                     // a hand up to the back of the neck
      g.shL = lerp(g.shL, -0.26, k); g.shLz = lerp(g.shLz, -0.60, k);
      g.elbL = lerp(g.elbL, -2.05, k); g.headPitch += k * 0.10; g.torsoYaw -= k * 0.06;
      break;
    case 'stretch':                     // a shoulder roll and a look at the sky
      g.shLz -= k * 0.32; g.shRz += k * 0.32; g.shL -= k * 0.18; g.shR -= k * 0.18;
      g.headPitch -= k * 0.20; g.torsoPitch -= k * 0.05;
      break;
    case 'peer':                        // leaning in to see something better
      g.torsoPitch += k * 0.14; g.headPitch += k * 0.06; g.headYaw *= 1 - k * 0.7;
      break;
    case 'nod':                         // agreeing with themselves, continuously
      g.headPitch += Math.sin(t * 1.35) * 0.055 * still;
      break;
    case 'rock':                        // heel to toe, the way you wait when nothing is happening
      g.rootDrop += (Math.sin(t * 0.85) * 0.5 + 0.5) * 0.020 * still;
      g.torsoPitch += Math.sin(t * 0.85) * 0.035 * still;
      break;
    case 'hands':                       // clasped behind the back. Not periodic: a way of standing
      g.shL = lerp(g.shL, 0.42, still); g.shLz = lerp(g.shLz, -0.10, still);
      g.elbL = lerp(g.elbL, -1.05, still);
      g.shR = lerp(g.shR, 0.42, still); g.shRz = lerp(g.shRz, 0.10, still);
      g.elbR = lerp(g.elbR, -1.05, still);
      break;
    case 'pocket':                      // hands in pockets, elbows out
      g.shL = lerp(g.shL, -0.16, still); g.shLz = lerp(g.shLz, -0.26, still);
      g.elbL = lerp(g.elbL, -0.78, still);
      g.shR = lerp(g.shR, -0.16, still); g.shRz = lerp(g.shRz, 0.26, still);
      g.elbR = lerp(g.elbR, -0.78, still);
      break;
    case 'fan':                         // fanning at the face, fast, in summer
      g.shR = lerp(g.shR, -1.30, k); g.shRz = lerp(g.shRz, 0.34, k);
      g.elbR = lerp(g.elbR, -1.75 + Math.sin(t * 6.2) * 0.22, k);
      break;
    case 'bounce':
      g.rootDrop += Math.max(0, Math.sin(t * 1.9)) * 0.014 * still;
      break;
  }
}

// What somebody is doing once they have arrived somewhere. Laid on top of the gait rather
// than replacing it, so walking to and from the spot still reads, and every one of these is a
// small continuous movement: a person standing perfectly still is the one thing that gives a
// crowd away as scenery.
function activityPose(g, act, now, seed, seatY) {
  const t = now / 1000 + seed;
  const br = Math.sin(t * 0.72) * 0.5 + 0.5;
  const hasSeat = Number.isFinite(seatY);
  // The upper-body actions still make sense on foot; the bent legs do not.  Reuse the natural
  // intermittent standing phone/work loops and give the other prop actions standing variants.
  if (!hasSeat && act === 'phone') act = 'phoneStand';
  if (!hasSeat && act === 'desk') act = 'work';
  if (hasSeat && (act === 'sit' || act === 'play' || act === 'phone' || act === 'read' ||
      act === 'eat' || act === 'drink')) {
    const hip = seatY + SEAT_LIFT;
    // How *this* person sits. A carriage of people with their shins vertical, their knees at
    // the same angle and their hands in the same place is a row of one doll repeated, and it
    // is the thing the eye catches about a bench before it gets anywhere near a face.
    //
    // `bL`/`bR` are how far each shin is off vertical: negative tucks that foot back under the
    // seat, positive pushes it out in front. Stable per person and per side, so somebody sits
    // the way they sit every time you see them, and drifting slowly against each other, because
    // people on a seat swap which foot is forward every twenty seconds without noticing.
    // Deliberately lopsided: positive tucks a foot back under the seat and negative pushes it
    // out, and the range goes further back than forward because that is what people do on a
    // bench, and because a foot 130 mm further into a carriage aisle than the rig has ever put
    // one is a foot inside the shins of whoever is sitting opposite.
    const settle = Math.sin(t * 0.093);
    const bL = -0.08 + ((seed * 37) % 11) / 11 * 0.30 + settle * 0.060;
    const bR = -0.08 + ((seed * 53 + 4) % 11) / 11 * 0.30 - settle * 0.060;
    // The thigh is solved per leg rather than once, because a shin that is no longer vertical
    // does not reach as far down and the knee has to sit lower to make up for it. Without this
    // the fore-aft variation above puts one foot through the floor and hangs the other in the
    // air; with it the whole 18 cm of it stays inside five millimetres of the ground.
    const th = b => Math.acos(clamp(
      (hip - SHIN_DROP + 0.405 * (1 - Math.cos(b))) / 0.397, -0.10, 0.90));
    const sL = th(bL), sR = th(bR);
    g.rootDrop = 0.86 - hip;
    g.thighL = -sL; g.kneeL = -(sL + bL);
    g.thighR = -sR; g.kneeR = -(sR + bR);
    // The foot's absolute angle *is* `ankle` — the parent rotations are subtracted back out
    // inside `soleHeight` — so a flat foot is a small fixed number whatever the shin is doing.
    g.ankleL = 0.03; g.ankleR = 0.02;
    // Breathing, at about the rate a resting person does it, and the settle carried up through
    // the trunk: somebody shifting on a bench does not do it from the waist alone.
    const air = Math.sin(t * 1.55);
    g.torsoPitch = 0.06 + Math.sin(t * 0.31) * 0.02 - air * 0.010;
    g.torsoRoll = Math.sin(t * 0.27) * 0.020 + settle * 0.028;
    g.torsoYaw = settle * 0.042;
    g.sway = settle * 0.013;
    g.shL = -0.14 - settle * 0.030; g.shLz = -0.15 - air * 0.011; g.elbL = -0.60;
    g.shR = -0.14 + settle * 0.030; g.shRz = 0.15 + air * 0.011; g.elbR = -0.60;
    g.headYaw += Math.sin(t * 0.24) * 0.10 - settle * 0.055;
    g.headPitch += Math.sin(t * 0.17 + 1.4) * 0.030;
    g.bob = (air * 0.5 + 0.5) * 0.004;
    // 打麻将: one hand keeps going out to the middle of the table and back.
    if (act === 'play') {
      const reach = Math.max(0, Math.sin(t * 0.9));
      g.shR = -0.14 - reach * 0.86; g.elbR = -0.60 - reach * 0.30; g.shRz = 0.15 + reach * 0.12;
      g.torsoPitch += reach * 0.10;
      g.headPitch = 0.16;
    }
    // 看手机. Both hands up in front of the chest and the head down over them, with one thumb
    // going. What reads as this from the other end of a carriage is the angle of the head, not
    // the hands — so the head goes further down than feels right while you are typing it.
    if (act === 'phone') {
      // Both wrists meet around the handset. The old outward splay signs moved each hand another
      // twenty centimetres away from centre, leaving the second thumb typing in empty air.
      g.shL = -0.46; g.shLz = 0.40; g.elbL = -1.34;
      g.shR = -0.44; g.shRz = -0.40; g.elbR = -1.30 + Math.sin(t * 5.4) * 0.026;
      g.torsoPitch = 0.17 + Math.sin(t * 0.33) * 0.015;
      g.headPitch = 0.44 + Math.sin(t * 0.9) * 0.020;
      g.headYaw *= 0.30;
    }
    // 看书. The same two hands held wider and further out, and the head travelling down the page
    // and back up to the top of the next one instead of sitting still.
    if (act === 'read') {
      const page = Math.sin(t * 0.21);
      g.shL = -0.60; g.shLz = -0.26; g.elbL = -1.14;
      g.shR = -0.60; g.shRz = 0.26; g.elbR = -1.14;
      g.torsoPitch = 0.12;
      g.headPitch = 0.32 + page * 0.055;
      g.headYaw *= 0.30;
    }
    // 吃饭. Chopsticks travel from the bowl to the mouth, pause, then return while the other hand
    // steadies the bowl. Different seeds keep a table of diners from eating in lockstep.
    if (act === 'eat') {
      const bite = Math.max(0, Math.sin(t * 1.35));
      g.shL = -0.34; g.shLz = -0.20; g.elbL = -1.02;
      g.shR = -0.28 - bite * .78; g.shRz = .18; g.elbR = -1.08 - bite * .34;
      g.torsoPitch = .15 - bite * .035;
      g.headPitch = .28 - bite * .20;
      g.headYaw *= .25; g.grip = .72;
    }
    if (act === 'drink') {
      const sip = Math.pow(Math.max(0, Math.sin(t * 1.05)), 1.35);
      g.shL = 0.02; g.shLz = -0.08; g.elbL = -0.28;
      g.shR = -0.56 - sip * .62; g.shRz = .16; g.elbR = -1.10 - sip * .52;
      g.torsoPitch = .08 - sip * .035;
      g.headPitch = .20 - sip * .30;
      g.headYaw *= .20; g.grip = .80;
      g.mouth = sip * .15;
    }
  } else if (act === 'desk' && hasSeat) {
    // Sitting at a screen with both hands on a keyboard. The same seat as `sit`, and then the
    // forearms come up level and the fingers keep going, which is the whole of office work.
    const hip = seatY + SEAT_LIFT;
    // Same per-leg solve as `sit` above, and for the same reason: a room of people at desks
    // with identical shins is the one thing that gives an office away as a set. Narrower here,
    // because a chair pushed in leaves less room to put a foot anywhere.
    const settle = Math.sin(t * 0.077);
    const bL = -0.10 + ((seed * 37) % 9) / 9 * 0.24 + settle * 0.05;
    const bR = -0.10 + ((seed * 53 + 4) % 9) / 9 * 0.24 - settle * 0.05;
    const th = b => Math.acos(clamp(
      (hip - SHIN_DROP + 0.405 * (1 - Math.cos(b))) / 0.397, -0.10, 0.90));
    const sL = th(bL), sR = th(bR);
    g.rootDrop = 0.86 - hip;
    g.thighL = -sL; g.kneeL = -(sL + bL);
    g.thighR = -sR; g.kneeR = -(sR + bR);
    g.ankleL = 0.03; g.ankleR = 0.02;
    const air = Math.sin(t * 1.4);
    g.torsoPitch = 0.15 + Math.sin(t * 0.42) * 0.015 - air * 0.008;
    g.torsoRoll = settle * 0.024;
    g.shL = -0.52; g.shLz = -0.14 - air * 0.008; g.elbL = -1.18 + Math.sin(t * 7.1) * 0.030;
    g.shR = -0.52; g.shRz = 0.14 + air * 0.008; g.elbR = -1.18 + Math.sin(t * 8.3 + 1.4) * 0.030;
    g.headPitch = 0.26 + Math.sin(t * 1.2) * 0.014;
    g.headYaw += Math.sin(t * 0.31) * 0.06 - settle * 0.045;
    g.bob = (air * 0.5 + 0.5) * 0.003;
  } else if (!hasSeat && act === 'play') {
    // A cabinet, board or table can be used while standing. Most of the loop leaves the hands at
    // the sides; one hand reaches only while an actual interaction beat is happening.
    const cycle = ((t * .12) % 1 + 1) % 1;
    const reach = cycle < .30 ? Math.sin(cycle / .30 * Math.PI) : 0;
    g.shL = .04 - reach * .28; g.shLz = -.02 - reach * .10; g.elbL = -.22 - reach * .42;
    g.shR = .03 - reach * .64; g.shRz = .02 + reach * .13; g.elbR = -.22 - reach * .72;
    g.torsoPitch = .02 + reach * .10; g.headPitch = .035 + reach * .12;
    g.torsoYaw = reach * .035; g.grip = .20 + reach * .45;
  } else if (!hasSeat && act === 'read') {
    // Bring the book up, read briefly, then lower it. This works in a queue or gallery without
    // turning a standing reader into a seated body suspended over the floor.
    const cycle = ((t * .065) % 1 + 1) % 1;
    const study = cycle < .58 ? Math.sin(cycle / .58 * Math.PI) : 0;
    g.shL = .04 - study * .48; g.shLz = -.02 - study * .24; g.elbL = -.22 - study * .76;
    g.shR = .03 - study * .48; g.shRz = .02 + study * .24; g.elbR = -.22 - study * .76;
    g.torsoPitch = .02 + study * .07;
    g.headPitch = .035 + study * (.24 + Math.sin(t * .21) * .025);
    g.headYaw *= 1 - study * .65; g.grip = .22 + study * .38;
  } else if (!hasSeat && act === 'eat') {
    // Street food and quick snacks are often eaten on foot. One hand supports the food and the
    // other completes a real hand-to-mouth cycle, instead of both forearms freezing out front.
    const cycle = ((t * .17) % 1 + 1) % 1;
    const ready = cycle < .58 ? Math.sin(cycle / .58 * Math.PI) : 0;
    const bite = cycle < .25 ? Math.sin(cycle / .25 * Math.PI) : 0;
    g.shL = .04 - ready * .38; g.shLz = -.02 - ready * .17; g.elbL = -.22 - ready * .72;
    g.shR = .03 - bite * .86; g.shRz = .02 + bite * .16; g.elbR = -.22 - bite * 1.04;
    g.torsoPitch = .02 + ready * .055; g.headPitch = .035 + ready * .09 - bite * .13;
    g.grip = .22 + Math.max(ready, bite) * .54;
  } else if (!hasSeat && act === 'drink') {
    // The cup starts at the hip, meets the mouth for a short sip and returns all the way down.
    const cycle = ((t * .11) % 1 + 1) % 1;
    const sip = cycle < .34 ? Math.sin(cycle / .34 * Math.PI) : 0;
    g.shL = .04; g.shLz = -.02; g.elbL = -.22;
    g.shR = .03 - sip * .92; g.shRz = .02 + sip * .16; g.elbR = -.22 - sip * 1.18;
    g.headPitch = .035 - sip * .20; g.torsoPitch = .02 - sip * .025;
    g.grip = .22 + sip * .62; g.mouth = sip * .14;
  } else if (act === 'dance') {
    // 广场舞. Weight from foot to foot on the beat, both arms up and swinging across, and the
    // whole body turning a little with it. Fast, because the speaker is.
    const b = t * 2.35;
    g.rootDrop = 0.02 + Math.abs(Math.sin(b)) * 0.035;
    g.torsoRoll = Math.sin(b) * 0.10;
    g.torsoYaw = Math.sin(b * .5) * 0.22;
    g.shL = -1.32 + Math.sin(b) * 0.42; g.shLz = -0.44; g.elbL = -0.52;
    g.shR = -1.32 - Math.sin(b) * 0.42; g.shRz = 0.44; g.elbR = -0.52;
    g.thighL = Math.sin(b) * 0.16; g.thighR = -Math.sin(b) * 0.16;
    g.kneeL = -0.10 - Math.max(0, Math.sin(b)) * 0.22;
    g.kneeR = -0.10 - Math.max(0, -Math.sin(b)) * 0.22;
    g.headYaw = Math.sin(b * .5) * 0.12;
  } else if (act === 'taiji') {
    // 太极. Everything slow and wide: the arms describe a circle in front of the chest, the weight
    // sinks onto one leg and comes back, and nothing anywhere moves quickly.
    const b = t * 0.34;
    g.rootDrop = 0.10 + Math.sin(b) * 0.03;
    g.torsoYaw = Math.sin(b) * 0.30;
    g.torsoPitch = 0.04;
    g.shL = -0.92 + Math.sin(b) * 0.34; g.shLz = -0.52; g.elbL = -0.86 + Math.cos(b) * 0.24;
    g.shR = -0.62 - Math.sin(b) * 0.34; g.shRz = 0.52; g.elbR = -1.12 - Math.cos(b) * 0.24;
    g.thighL = -0.26 + Math.sin(b) * 0.14; g.thighR = -0.20 - Math.sin(b) * 0.14;
    g.kneeL = -0.34; g.kneeR = -0.30;
    g.headYaw = Math.sin(b) * 0.26;
  } else if (act === 'stretch') {
    // A warm-up does not have to mean holding both arms over the head forever. Most of this loop is
    // a side bend through the ribs and a softened knee, with the hands hanging low and only a small
    // shoulder roll travelling through them. Seeded handedness keeps a class from leaning as one.
    const cycle = ((t * .095) % 1 + 1) % 1;
    const bend = cycle < .55 ? Math.sin(cycle / .55 * Math.PI) : 0;
    const side = (seed & 1) ? 1 : -1;
    const loosen = Math.sin(t * 1.35) * bend;
    g.rootDrop = bend * .025;
    g.sway = side * bend * .018;
    g.torsoRoll = side * bend * .12;
    g.torsoPitch = .015 + bend * .025;
    g.torsoYaw = loosen * .025;
    g.thighL = side < 0 ? -.025 - bend * .055 : -.02;
    g.thighR = side > 0 ? -.025 - bend * .055 : -.02;
    g.kneeL = -.05 - (side < 0 ? bend * .13 : bend * .04);
    g.kneeR = -.05 - (side > 0 ? bend * .13 : bend * .04);
    g.shL = .04 + (side < 0 ? bend * .08 : 0);
    g.shR = .03 + (side > 0 ? bend * .08 : 0);
    g.shLz = -.02 - loosen * .018; g.shRz = .02 - loosen * .018;
    g.elbL = -.22 - (side < 0 ? bend * .16 : 0);
    g.elbR = -.22 - (side > 0 ? bend * .16 : 0);
    g.headYaw = -side * bend * .09 + Math.sin(t * .22) * .04;
    g.headPitch = -.015 + bend * .045;
    g.grip = .18;
  } else if (act === 'walk') {
    // `walk` normally disappears under the real distance-driven gait because activity mixing fades
    // out once a person is moving. Its remaining job is the authored stationary fallback (notably a
    // treadmill): reuse the shared gait at a restrained pace instead of inventing a marching pose.
    gaitPose(g, .38, t * 4.05, 0, now, null, null);
    g.torsoPitch *= .82;
    g.grip = .24;
  } else if (act === 'feed') {
    // A keeper works from a bucket at the left hip and scatters a measured handful with the
    // right. The long quiet reset makes this read as feeding instead of constant windmilling.
    const cycle = ((t * .14) % 1 + 1) % 1;
    const cast = cycle < .34 ? Math.sin(cycle / .34 * Math.PI) : 0;
    g.shL = -.26; g.shLz = -.18; g.elbL = -.52;
    g.shR = -.18 - cast * .92; g.shRz = .10 + cast * .28;
    g.elbR = -.42 - cast * .56; g.twR = -.18 + cast * .52;
    g.torsoPitch = .06 + cast * .08;
    g.torsoYaw = -.02 + cast * .16;
    g.headPitch = .08 + cast * .08;
    g.headYaw += Math.sin(t * .24) * .055;
    g.grip = .42 + cast * .34;
  } else if (act === 'work') {
    // Bent over something on a bench, both hands busy.
    g.torsoPitch = 0.42 + Math.sin(t * 1.6) * 0.03;
    g.headPitch = 0.26;
    g.shL = -0.72; g.elbL = -1.20 + Math.sin(t * 2.3) * 0.20; g.shLz = -0.14;
    g.shR = -0.66; g.elbR = -1.28 + Math.sin(t * 2.3 + 1.1) * 0.24; g.shRz = 0.16;
    g.thighL = 0.16; g.thighR = 0.10; g.kneeL = -0.22; g.kneeR = -0.18;
    g.grip = 0.72;
  } else if (act === 'cook') {
    // Work the wok for a few seconds, then let both hands drop. The loaded rigs cannot yet carry the
    // utensil, so the circle stays low and compact: readable as cooking beside a range, never as two
    // empty fists held in front of the chest for an entire shift.
    const cycle = ((t * .15) % 1 + 1) % 1;
    const stir = cycle < .48 ? Math.sin(cycle / .48 * Math.PI) : 0;
    const w = t * 4.1;
    g.shL = .04 - stir * .30; g.shLz = -.02 - stir * .13;
    g.elbL = -.22 - stir * .48;
    g.shR = .03 - stir * (.50 + Math.sin(w) * .055);
    g.shRz = .02 + stir * (.13 + Math.cos(w) * .045);
    g.elbR = -.22 - stir * (.66 + Math.cos(w) * .075);
    g.twR = -.70 + stir * Math.sin(w) * .12;
    g.torsoPitch = .025 + stir * .13;
    g.torsoYaw = stir * Math.sin(w) * .045;
    g.torsoRoll = stir * Math.cos(w) * .018;
    g.headPitch = .04 + stir * .22;
    g.grip = .22 + stir * .52;
  } else if (act === 'pour') {
    // Tea service is a short pour followed by a much longer reset. Both hands meet below the chest,
    // one on the handle and one supporting the spout/lid side, then the arms return to a normal
    // hang while the guest drinks. Raising only the operating wrist left the other hand at the
    // hip and made the pot look suspended from one open palm.
    const cycle = ((t * .10) % 1 + 1) % 1;
    const pour = cycle < .32 ? Math.sin(cycle / .32 * Math.PI) : 0;
    g.shL = .04 - pour * .63; g.shLz = -.02 + pour * .18;
    g.elbL = -.22 - pour * .88;
    g.shR = .03 - pour * .68; g.shRz = .02 - pour * .18;
    g.elbR = -.22 - pour * .86;
    g.twL = .12 + pour * .18; g.twR = -.52 - pour * .20;
    g.torsoPitch = .02 + pour * .075;
    g.torsoYaw = -.025 * pour;
    g.headPitch = .035 + pour * .16;
    g.headYaw += Math.sin(t * .23) * .035;
    g.grip = .22 + pour * .70;
  } else if (act === 'browse') {
    // Looking over a rail or display: most of the cycle is an ordinary relaxed stand. One hand
    // briefly checks an item, then returns fully to the hip; holding both forearms out forever was
    // the mall's most visible "zombie" pose. The head moves first and the hand follows only on an
    // occasional beat, so several shoppers at a storefront do not become a synchronized display.
    // Stable handedness and reach depth keep adjacent shoppers from repeating the exact silhouette.
    const cycle = ((t * .105) % 1 + 1) % 1;
    const reach = cycle < .24 ? Math.sin(cycle / .24 * Math.PI) : 0;
    const right = (seed & 1) === 0, depth = .64 + (seed % 4) * .045;
    g.shL = .04; g.shLz = -.015; g.elbL = -.18;
    g.shR = .03; g.shRz = .015; g.elbR = -.18;
    if (right) {
      g.shR -= reach * depth; g.shRz += reach * .12; g.elbR -= reach * .58;
    } else {
      g.shL -= reach * depth; g.shLz -= reach * .12; g.elbL -= reach * .58;
    }
    g.torsoPitch = .02 + reach * .075;
    g.torsoYaw = Math.sin(t * .19) * .04 + (right ? 1 : -1) * reach * .035;
    g.headYaw += Math.sin(t * .27 + 1.2) * (.12 + (seed % 3) * .018);
    g.headPitch = .05 + reach * .13;
    g.grip = .22 + reach * .24;
  } else if (act === 'phoneStand') {
    // A standing phone check comes and goes: one hand brings the screen only to the lower chest,
    // sometimes the other steadies it, then both return to the sides. That still reads without a
    // rendered handset and avoids the permanent two-fist pose of the seated phone animation.
    const cycle = ((t * .085) % 1 + 1) % 1;
    const check = cycle < .42 ? Math.sin(cycle / .42 * Math.PI) : 0;
    const two = seed % 3 === 0 ? .82 : .34;
    // The handset is in the left hand, so that is the arm which must make the full trip. The right
    // hand occasionally supports it or taps, rather than raising an empty fist higher than it.
    g.shL = .04 - check * .50; g.shLz = -.02 + check * .22;
    g.elbL = -.22 - check * .88;
    g.shR = .03 - check * .36 * two; g.shRz = .02 - check * .15 * two;
    g.elbR = -.22 - check * .72 * two;
    g.torsoPitch = .02 + check * .075;
    g.headPitch = .035 + check * .25;
    g.headYaw += Math.sin(t * .31) * .035;
    g.grip = .20 + check * .42;
  } else if (act === 'compare') {
    // Compare one item, lower it, then check the other. Only one hand leaves the hip on each beat;
    // the zeroes between beats matter while props are not attached to imported wrists.
    const cycle = ((t * .078) % 1 + 1) % 1;
    const left = cycle < .24 ? Math.sin(cycle / .24 * Math.PI) : 0;
    const right = cycle >= .46 && cycle < .70
      ? Math.sin((cycle - .46) / .24 * Math.PI) : 0;
    g.shL = .04 - left * .48; g.shLz = -.02 - left * .14;
    g.elbL = -.22 - left * .60;
    g.shR = .03 - right * .48; g.shRz = .02 + right * .14;
    g.elbR = -.22 - right * .60;
    g.torsoPitch = .02 + Math.max(left, right) * .055;
    g.torsoYaw = (right - left) * .055;
    g.headYaw = (right - left) * .15 + Math.sin(t * .20) * .025;
    g.headPitch = .04 + Math.max(left, right) * .13;
    g.grip = .20 + Math.max(left, right) * .34;
  } else if (act === 'chat' || act === 'talk') {
    // Ambient conversation is mainly attention and posture. A short low-palm gesture visits one
    // side of the body, while the other arm hangs and the head supplies the listening rhythm.
    const cycle = ((t * .11) % 1 + 1) % 1;
    const gesture = cycle < .22 ? Math.sin(cycle / .22 * Math.PI) : 0;
    const right = (seed & 1) === 0, nod = Math.max(0, Math.sin(t * .78)) * .035;
    g.shL = .04; g.shLz = -.02; g.elbL = -.22;
    g.shR = .03; g.shRz = .02; g.elbR = -.22;
    if (right) {
      g.shR -= gesture * .44; g.shRz += gesture * .15; g.elbR -= gesture * .66;
    } else {
      g.shL -= gesture * .44; g.shLz -= gesture * .15; g.elbL -= gesture * .66;
    }
    g.sway += (right ? 1 : -1) * .008;
    g.torsoRoll += (right ? -1 : 1) * .010;
    g.torsoYaw = Math.sin(t * .37) * .035;
    g.headYaw += Math.sin(t * .29 + 1.1) * .075;
    g.headPitch = .01 + nod;
    g.grip = .18 + gesture * .22;
  } else if (act === 'lookMap') {
    // A map is wider than a phone but it stays near the waist. The reader studies it briefly, lets
    // it fall, then looks back up to orient themselves instead of freezing behind an invisible page.
    const cycle = ((t * .075) % 1 + 1) % 1;
    const study = cycle < .46 ? Math.sin(cycle / .46 * Math.PI) : 0;
    g.shL = .04 - study * .40; g.shLz = -.02 - study * .20;
    g.elbL = -.22 - study * .68;
    g.shR = .03 - study * .40; g.shRz = .02 + study * .20;
    g.elbR = -.22 - study * .68;
    g.torsoPitch = .02 + study * .065;
    g.headPitch = .035 + study * .22;
    g.headYaw += study * Math.sin(t * .38) * .055
      + (1 - study) * Math.sin(t * .21 + 1.5) * .14;
    g.grip = .18 + study * .30;
  } else if (act === 'shelve') {
    // Retail staff straighten one item at a time, then let both arms rest. This is deliberately
    // asymmetric and intermittent; two permanently raised hands read as a mannequin regardless
    // of how good the body and face are.
    const cycle = ((t * .12) % 1 + 1) % 1;
    const placeItem = cycle < .30 ? Math.sin(cycle / .30 * Math.PI) : 0;
    g.shL = .04; g.shLz = -.02; g.elbL = -.20;
    g.shR = .03 - placeItem * .94; g.shRz = .02 + placeItem * .16;
    g.elbR = -.20 - placeItem * .48;
    g.torsoPitch = .025 + placeItem * .08;
    g.headPitch = .05 + placeItem * .12;
    g.grip = .24 + placeItem * .42;
  } else if (act === 'vend') {
    // Behind a counter: mostly standing naturally, with one brief hand-over gesture. The old
    // loop kept both elbows folded in front of the chest for the entire cycle; without a prop in
    // an imported hand that read as a zombie reaching forward. A real shopkeeper spends far more
    // time at ease than passing change, and only the passing arm needs to leave their side.
    const cycle = ((t * 0.18) % 1 + 1) % 1;
    const pass = cycle < 0.22 ? Math.sin(cycle / 0.22 * Math.PI) : 0;
    g.shL = 0.04; g.elbL = -0.23; g.shLz = -0.02;
    g.shR = 0.03 - pass * 0.92;
    g.elbR = -0.26 - pass * 0.54;
    g.shRz = 0.02 + pass * 0.13;
    g.torsoPitch = 0.025 + pass * 0.055;
    g.headPitch = 0.025 + pass * 0.06;
    g.torsoYaw = Math.sin(t * 0.21) * 0.035;
    g.grip = 0.34 + pass * 0.28;
  } else if (act === 'buy') {
    // At a ticket machine: square to it, head down at the screen, the near hand up at the console
    // working through the menu and the other down by the coin slot. The press is what sells it —
    // a hand that reaches, stops, and reaches again reads as a machine being operated, where a
    // hand held out reads as somebody leaning on a cupboard.
    const press = Math.max(0, Math.sin(t * 0.9));
    g.torsoPitch = 0.13 + press * 0.03;
    g.headPitch = 0.31;
    g.shR = -0.84 - press * 0.22; g.shRz = 0.15; g.elbR = -0.76 + press * 0.36;
    g.shL = -0.32; g.shLz = -0.16; g.elbL = -1.04;
    g.headYaw += Math.sin(t * 0.5) * 0.05;
    g.bob = br * 0.004;
    g.grip = 0.58;
  } else if (act === 'stand') {
    // An alert guard stands taller than somebody waiting, but still stands like a person: one knee
    // is soft, both arms hang below the waist and the gaze scans without dragging the whole torso.
    const side = (seed & 1) ? 1 : -1;
    g.shL = .035; g.shLz = -.018; g.elbL = -.22;
    g.shR = .025; g.shRz = .018; g.elbR = -.21;
    g.kneeL -= side < 0 ? .045 : .012;
    g.kneeR -= side > 0 ? .045 : .012;
    g.sway += side * .007;
    g.torsoPitch = -.012;
    g.torsoRoll += -side * .008;
    g.torsoYaw += Math.sin(t * .17) * .018;
    g.headYaw += Math.sin(t * .19 + seed * .07) * .19
      + Math.sin(t * .47 + 1.2) * .035;
    g.headPitch += Math.sin(t * .23) * .018 - .012;
    g.grip = .18;
  } else if (act === 'wait') {
    // Standing about, waiting for something. The weight change and the breath are not written
    // here any more: `idlePose` in the gait has already put them on every standing figure in
    // the game, and it does it better — it dwells on a foot for ten seconds and changes over,
    // where the sine that used to be here slid continuously between the two and read as a
    // person swaying. What is left is the part that belongs to waiting rather than to standing:
    // a longer look up the road than anybody gives an ordinary street, and loose arms.
    const side = (seed & 1) ? 1 : -1;
    const scan = .25 + (seed % 4) * .018;
    g.headYaw += Math.sin(t * 0.23) * scan + Math.sin(t * 0.61 + 2.2) * 0.06;
    g.headPitch += Math.sin(t * .16 + seed) * .012;
    g.shL = 0.04 + (side < 0 ? .018 : 0); g.elbL = -0.24 - (side < 0 ? .025 : 0);
    g.shR = 0.03 + (side > 0 ? .018 : 0); g.elbR = -0.22 - (side > 0 ? .025 : 0);
    g.kneeL -= side < 0 ? .030 : 0; g.kneeR -= side > 0 ? .030 : 0;
    g.sway += side * .005; g.torsoRoll -= side * .006;
  } else if (act === 'sweep') {
    const s = Math.sin(t * 1.15);
    g.torsoPitch = 0.30;
    g.torsoYaw = s * 0.20;
    g.headPitch = 0.30;
    g.shL = -0.52 + s * 0.20; g.elbL = -0.62; g.shLz = -0.20;
    g.shR = -0.86 - s * 0.24; g.elbR = -0.40; g.shRz = 0.10;
    // Opposed wrists are how two hands hold a shaft. With both twists at the gait default the
    // imported palms faced the camera on the same plane, so even fully curled fingers looked as
    // though they were merely hovering behind the broom.
    g.twL = .98; g.twR = -.98;
    g.rootDrop += (s * .5 + .5) * .018;
    g.kneeL -= Math.max(0, s) * .10; g.kneeR -= Math.max(0, -s) * .10;
    g.grip = 1.0;
  } else if (act === 'write') {
    // 毛笔 follows short horizontal strokes across the paper, lifts, then starts a new line. The
    // left hand stays low to steady the sheet while the right wrist supplies the visible motion.
    const line = Math.sin(t * 2.35), lift = Math.max(0, Math.sin(t * 1.175 + 1.1));
    g.torsoPitch = .26 + lift * .025; g.torsoYaw = line * .035;
    g.headPitch = .30; g.headYaw = line * .045;
    g.shL = -.58; g.shLz = -.18; g.elbL = -1.02;
    g.shR = -.64 + line * .18 - lift * .07;
    g.shRz = .15 + line * .09; g.elbR = -1.08 - line * .22;
    g.twR = -.52 + line * .18; g.grip = .76;
  } else if (act === 'smoke') {
    // A drag is a brief hand-to-mouth action followed by a much longer relaxed hold at the hip.
    // The cigarette and ember are wrist children, so they make the same trip instead of hovering
    // at a fixed point in the room while the smoker breathes and shifts weight underneath them.
    const cycle=((t*.075)%1+1)%1;
    const drag=cycle<.30 ? Math.sin(cycle/.30*Math.PI) : 0;
    g.shL=.04; g.shLz=-.02; g.elbL=-.22;
    g.shR=.03-drag*1.05; g.shRz=.02-drag*.08; g.elbR=-.22-drag*.78;
    g.torsoPitch=.015; g.headPitch=-drag*.06;
    g.headYaw+=Math.sin(t*.19)*.08; g.mouth=drag*.08; g.grip=.64;
  } else if (act === 'carry') {
    // A carried load is asymmetric even when the prop itself is part of the wardrobe. The loaded
    // hand hangs quiet, the opposite shoulder counters it and the pelvis moves under the weight.
    const swing = Math.sin(t * .82) * .015;
    g.shL = -0.04; g.shLz = -0.10; g.elbL = -0.18;
    g.shR = 0.08; g.shRz = 0.10; g.elbR = -0.26;
    g.sway -= .018 + swing; g.torsoRoll += .045; g.torsoPitch = 0.045;
    g.grip = .86;
  } else if (act === 'hands') {
    // Staff at ease now means exactly that: both upper arms hang beside the torso. Awareness comes
    // from weight, head and gaze rather than a permanent clasp or forearms hovering in front.
    const side = (seed & 1) ? 1 : -1;
    g.shL = .035; g.shLz = -.005; g.elbL = -.18;
    g.shR = .025; g.shRz = .005; g.elbR = -.18;
    g.sway += side * .006; g.torsoRoll -= side * .007;
    g.kneeL -= side < 0 ? .025 : 0; g.kneeR -= side > 0 ? .025 : 0;
    g.torsoPitch = -.012;
    g.torsoYaw = Math.sin(t * .18) * .022;
    g.headYaw += Math.sin(t * .24 + 1.1) * .12;
    g.headPitch = -.018 + Math.sin(t * .20) * .014;
    g.grip = .18;
  } else if (act === 'check') {
    // Clinical check / clipboard work: inspect, make a note, glance back to the patient. The two
    // rhythms do not divide evenly, so a ward round never becomes a row of synchronised nurses.
    const inspect = Math.max(0, Math.sin(t * .72));
    const note = Math.max(0, Math.sin(t * 2.15 + .8));
    g.torsoPitch = .14 + inspect * .08;
    g.torsoYaw = -.07 + inspect * .05;
    g.shL = -.52; g.shLz = -.24; g.elbL = -1.22;
    g.shR = -.66 - note * .12; g.shRz = .18; g.elbR = -1.34 + note * .18;
    g.headPitch = .25 - inspect * .08;
    g.headYaw = Math.sin(t * .31) * .09;
    g.grip = .68;
  } else if (act === 'safety') {
    // 安全演示. The demonstration, in the three parts everybody has watched without watching: the
    // belt, the mask, and where the doors are. Fourteen seconds a cycle, and it repeats, because two
    // members of crew standing at the front of a cabin doing this in unison is one of the two or
    // three things that say "aeroplane" harder than any prop in the room.
    //
    // Driven off a phase of its own rather than off the gait, and deliberately NOT off the person's
    // seed: the whole point is that the pair of them are in time with each other. Everything else an
    // NPC does in this game is desynchronised on purpose; this is the one thing that must not be.
    // `t` above carries the person's own seed, which is what desynchronises everybody else. The wall
    // clock on its own is what puts these two in step.
    const cycle = ((now / 1000) * 0.45) % 3;
    g.torsoPitch = 0.02;
    g.headPitch = 0.05;
    g.headYaw = 0;                       // facing the cabin, not glancing about
    if (cycle < 1) {
      // The belt: both hands meet low in front, then part. Two beats of it, because that is how it
      // is done — click, and pull.
      const beat = Math.max(0, Math.sin(cycle * Math.PI * 2));
      g.shL = -0.62 - beat * 0.10; g.shLz = -0.30 + beat * 0.16; g.elbL = -1.28;
      g.shR = -0.62 - beat * 0.10; g.shRz = 0.30 - beat * 0.16; g.elbR = -1.28;
      g.torsoPitch = 0.06 + beat * 0.03;
      g.headPitch = 0.20;               // looking down at her own hands, as you do
      g.grip = 0.85;
    } else if (cycle < 2) {
      // The mask: one hand cupped at the face, the other holding the strap out to the side. The head
      // comes up, because this is the part they want you looking at.
      const pull = Math.min(1, (cycle - 1) * 2.2);
      g.shR = -1.42; g.shRz = 0.10; g.elbR = -1.66;      // cup to the face
      g.shL = -0.70 - pull * 0.30; g.shLz = -0.62; g.elbL = -0.46;
      g.headPitch = -0.06;
      g.grip = 0.9;
    } else {
      // The exits: both arms straight out and level, one forward and one aft, the flat-handed point
      // that is the same in every language and is the reason nobody needs the announcement.
      const swing = Math.sin((cycle - 2) * Math.PI * 2) * 0.12;
      g.shL = -1.52; g.shLz = -0.94 + swing; g.elbL = -0.04;
      g.shR = -1.52; g.shRz = 0.94 + swing; g.elbR = -0.04;
      g.headYaw = swing * 1.6;           // she looks the way she is pointing
      g.grip = 0.1;                      // flat hand, not a fist
    }
    g.bob = br * 0.003;
  }
  return g;
}

// Where somebody is, from where you are hearing them: how far away, and which side. The camera is
// the ear rather than the body, because the camera is where you are looking from — turn around on
// the spot and the voice behind you should move across.
function listenFrom(n) {
  const dx = n.x - eye[0], dz = n.z - eye[2];
  const d = Math.hypot(dx, dz);
  return { dist: d, pan: d > 1e-3 ? (dx * cam.right[0] + dz * cam.right[2]) / d : 0 };
}

// Speech clips do not carry phoneme timing, but their duration does tell us when a person is
// speaking. Two incommensurate rhythms produce syllable-sized openings with short rests between
// phrases, which is enough to make the lips belong to the voice without pretending to be exact
// visemes. The channel is eased by TAU.mouth in figure.js, so the jaw never chatters frame to frame.
function speechMouth(now, seed) {
  const t = now / 1000;
  const syllable = 0.18 + 0.82 * Math.abs(Math.sin(t * 10.4 + seed * 1.73));
  const phrase = smooth01(clamp((Math.sin(t * 3.15 + seed * 0.61) + 0.72) / 0.58, 0, 1));
  return clamp(syllable * (0.20 + 0.80 * phrase), 0, 1);
}

// A tiny spatial hash for the mall's moving crowd. Pairwise avoidance over 144 people is the
// square-law behaviour that ruins a 60 Hz budget; nine neighbouring one-metre cells contain only
// the people who can actually collide. Buckets are recycled every frame, so this also avoids a
// stream of short-lived arrays for the garbage collector.
// At least the 1.28 m predictive horizon below. With smaller cells, two people inside the
// avoidance radius can land two indices apart and a 3x3 query silently misses them.
const MALL_SPACE_CELL = 1.32;
const mallSpaceGrid = new Map(), mallSpacePool = [];
let mallSpaceBuckets = 0;
function mallSpaceKey(floor, ix, iz) {
  return (floor || 1) * 1000000 + (ix + 128) * 256 + iz + 128;
}
function rebuildMallSpaceGrid() {
  mallSpaceGrid.clear(); mallSpaceBuckets = 0;
  if (place !== 'mall') return;
  for (const n of NPCS) {
    if (!n.awake || n.animal || n.place !== 'mall') continue;
    // Snapshot before anybody moves. Buckets keep NPC references to avoid allocating 144 records
    // per frame, while these scalar fields make every avoidance decision order-independent.
    n._mallSnapX = n.x; n._mallSnapZ = n.z;
    n._mallSnapYaw = n.yaw || 0; n._mallSnapGround = n.ground || 0;
    n._mallSnapClearance = mallClearanceRadius(n);
    const ix = Math.floor(n.x / MALL_SPACE_CELL), iz = Math.floor(n.z / MALL_SPACE_CELL);
    const key = mallSpaceKey(n.mallFloor || 1, ix, iz);
    let bucket = mallSpaceGrid.get(key);
    if (!bucket) {
      bucket = mallSpacePool[mallSpaceBuckets] || (mallSpacePool[mallSpaceBuckets] = []);
      mallSpaceBuckets++; bucket.length = 0; mallSpaceGrid.set(key, bucket);
    }
    bucket.push(n);
  }
}

// Return a small heading/pace correction, not a teleport. The ordinary target remains in charge,
// so somebody passes a neighbour and naturally recovers their route instead of being repelled
// across the atrium. Head-on walkers choose the same local passing side (opposite in world space);
// walkers travelling together split by stable seed so two coincident routes do not stay stacked.
function mallCrowdAvoidance(n, yaw, speed) {
  const floor = n.mallFloor || 1;
  const ix = Math.floor(n.x / MALL_SPACE_CELL), iz = Math.floor(n.z / MALL_SPACE_CELL);
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let turn = 0, pace = 1;
  const ownClearance=mallClearanceRadius(n);
  const consider = (x, z, avoidId, otherYaw, otherGround, fixed, otherClearance=.32) => {
    const dx = x - n.x, dz = z - n.z, d2 = dx * dx + dz * dz;
    if (d2 > 1.28 * 1.28) return;
    const d = Math.sqrt(Math.max(d2, 1e-6));
    // A fixed queue can be authored in a deliberately narrow public strip: the cinema walkers have
    // .49 m between their centre line and the people at the rope. Let a moving body pass those fixed
    // silhouettes at the same compact clearance used by waypoint occupancy, while the player and
    // every pair of moving people retain the ordinary .58 m personal circle.
    const personal=(fixed&&otherGround<.08?.52:.58)+
      Math.max(0,ownClearance-.32)+Math.max(0,otherClearance-.32);
    const ahead = (fx * dx + fz * dz) / d;
    const side = (rx * dx + rz * dz) / d;
    // Someone comfortably behind cannot be walked into by this step.
    if (ahead < -.28 && d > personal) return;
    // Predict closest approach over the next three quarters of a second. Steering only from the
    // current separation looks evasive but is too late once two one-metre-per-second walkers are
    // head-on; the body can overlap before the eased yaw has visibly changed.
    const ovx = Math.sin(otherYaw || 0) * otherGround;
    const ovz = Math.cos(otherYaw || 0) * otherGround;
    const rvx = ovx - fx * speed, rvz = ovz - fz * speed;
    const rv2 = rvx * rvx + rvz * rvz;
    const closing = dx * rvx + dz * rvz;
    const eta = rv2 > 1e-5 ? clamp(-closing / rv2, 0, .78) : 0;
    const mx = dx + rvx * eta, mz = dz + rvz * eta;
    const miss = Math.hypot(mx, mz);
    const predicted = closing < 0 && miss < .72;
    const strength = Math.max(clamp((1.05 - d) / .72, 0, 1),
      predicted ? clamp((.72 - miss) / .46, 0, 1) * clamp((1.30 - d) / .72, 0, 1) : 0);
    if (strength <= 0) return;
    let pass;
    if (Math.abs(side) > .08) pass = side > 0 ? -1 : 1; // steer away from their current side
    else {
      const ofx = Math.sin(otherYaw || 0), ofz = Math.cos(otherYaw || 0);
      const aligned = fx * ofx + fz * ofz > .35;
      pass = aligned ? (n.avoidId < avoidId ? -1 : 1)
        : ((n.avoidId + avoidId) & 1 ? 1 : -1);
    }
    turn += pass * strength * (.48 + .30 * Math.max(0, ahead));
    // One stable member of a moving pair yields; everybody yields to a stopped person. This is
    // what prevents two polite walkers from both taking half a step and meeting in the middle.
    const yields = otherGround < .08 || n.avoidId > avoidId;
    if (yields && (ahead > -.05 || d < .66)) {
      const clearance = clamp((d - (personal - .04)) / .48, 0, 1);
      pace = Math.min(pace, lerp(1, clearance, strength));
    }
  };
  for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
    const bucket = mallSpaceGrid.get(mallSpaceKey(floor, ix + ox, iz + oz));
    if (!bucket) continue;
    for (const other of bucket)
      if (other !== n) consider(other._mallSnapX, other._mallSnapZ, other.avoidId,
        other._mallSnapYaw, other._mallSnapGround, !other.patrol,other._mallSnapClearance);
  }
  // The player is not part of NPCS, but walking straight through them looks just as wrong. Only
  // people on the visible deck respond, and conversation already sets their requested speed to 0.
  if (Mall.level() === floor) consider(P.x, P.z, 104729, P.yaw, 0, false,.32);
  n._avoidTurn = clamp(turn, -.82, .82); n._avoidPace = pace;
}

function mallWaypointOccupied(n) {
  const floor = n.mallFloor || 1;
  const ix = Math.floor(n.x / MALL_SPACE_CELL), iz = Math.floor(n.z / MALL_SPACE_CELL);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const bucket = mallSpaceGrid.get(mallSpaceKey(floor, ix + dx, iz + dz));
    if (!bucket) continue;
    for (const other of bucket) {
      if (other === n) continue;
      const sep=.52+Math.max(0,mallClearanceRadius(n)-.32)+
        Math.max(0,(other._mallSnapClearance||.32)-.32);
      if (Math.hypot(n.x - other._mallSnapX, n.z - other._mallSnapZ) < sep) return true;
    }
  }
  return Mall.level() === floor && Math.hypot(n.x - P.x, n.z - P.z) < .60;
}

function mallResolveCrowdOverlap(n, dt) {
  if (!n.patrol || n.wait > 0 || (talkOpen && talkAt && talkAt.n === n) ||
      (doing && doing.th === n.th)) return 0;
  const floor = n.mallFloor || 1;
  const ix = Math.floor(n.x / MALL_SPACE_CELL), iz = Math.floor(n.z / MALL_SPACE_CELL);
  let pushX = 0, pushZ = 0, deepest = 0;
  const ownClearance=mallClearanceRadius(n);
  const consider = (x, z, avoidId, otherGround, alwaysYield, fixed, otherClearance=.32) => {
    let dx = n.x - x, dz = n.z - z, d = Math.hypot(dx, dz);
    const sep=(!alwaysYield&&fixed&&otherGround<.08?.52:.58)+
      Math.max(0,ownClearance-.32)+Math.max(0,otherClearance-.32);
    if (d >= sep) return;
    // Stable priority keeps ordinary encounters one-sided, but it cannot remain absolute once
    // bodies enter the inner circle. At a fixture corner the yielding person's radial correction
    // can be clamped almost entirely into the wall while the priority walker keeps closing. Let
    // both walkers spend this frame separating before the .48 m close-contact threshold; their
    // route step is already suppressed whenever this correction moves them.
    if (!alwaysYield && otherGround >= .08 && n.avoidId < avoidId && d >= .54) return;
    if (d < 1e-5) {
      const side = ((n.avoidId + avoidId) & 1) ? 1 : -1;
      dx = Math.cos(n.yaw || 0) * side; dz = -Math.sin(n.yaw || 0) * side; d = 1;
    }
    const depth = sep - Math.min(d, sep);
    pushX += dx / d * Math.max(.02, depth);
    pushZ += dz / d * Math.max(.02, depth);
    deepest = Math.max(deepest, depth || .02);
  };
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const bucket = mallSpaceGrid.get(mallSpaceKey(floor, ix + dx, iz + dz));
    if (!bucket) continue;
    for (const other of bucket) if (other !== n)
      consider(other._mallSnapX, other._mallSnapZ, other.avoidId, other._mallSnapGround,
        false, !other.patrol,other._mallSnapClearance);
  }
  if (Mall.level() === floor) consider(P.x, P.z, 104729, 0, true, false,.32);
  const len = Math.hypot(pushX, pushZ);
  if (!len || !deepest) return 0;
  // Separation is a velocity, not a per-frame teleport.  The old fixed .026 m correction moved
  // somebody twice as fast at 120 Hz as at 60 Hz and half as fast at 30 Hz; worse, a close-up
  // shopper visibly popped sideways by a complete foot-width in one rendered frame.  Keep the
  // old emergency cap for a long hitch, but spend ordinary overlap at a steady 0.90 m/s.
  const step = Math.min(.026, Math.max(0, dt || 0) * .90, deepest + .002), ox = n.x, oz = n.z;
  let nx = ox + pushX / len * step, nz = oz + pushZ / len * step;
  const radius=mallClearanceRadius(n);
  [nx,nz] = floor > 1 ? Mall.clampUpper(ox,oz,nx,nz,radius,floor)
                       : Mall.clampMove(ox,oz,nx,nz,radius);
  // A collider should never amplify personal-space correction into another metre-scale snap.
  // If a future fit-out makes the current point invalid, the route sanitizer/blocked recovery
  // owns relocation; this layer is capped to one ordinary walking step.
  const moved = Math.hypot(nx - ox, nz - oz);
  if (moved > .045) return 0;
  n.x = nx; n.z = nz;
  return moved;
}

// Last-centimetre safety for a yielding walker. Predictive steering makes the normal path; this
// clips only a step that would still enter another person's personal circle, and gently separates
// a bad authored overlap over several frames. Fixed staff, seats and queues never get displaced.
function mallClipCrowdMove(n, ox, oz, nx, nz, dt) {
  const floor = n.mallFloor || 1;
  const ix = Math.floor(ox / MALL_SPACE_CELL), iz = Math.floor(oz / MALL_SPACE_CELL);
  let outX = nx, outZ = nz;
  const ownClearance=mallClearanceRadius(n);
  const clip = (cx, cz, avoidId, otherYaw, otherGround, alwaysYield, fixed,otherClearance=.32) => {
    if (!alwaysYield && otherGround >= .08 && n.avoidId < avoidId) return;
    const sep=(!alwaysYield&&fixed&&otherGround<.08?.52:.58)+
      Math.max(0,ownClearance-.32)+Math.max(0,otherClearance-.32);
    cx += Math.sin(otherYaw || 0) * otherGround * dt;
    cz += Math.cos(otherYaw || 0) * otherGround * dt;
    let px = ox - cx, pz = oz - cz, start = Math.hypot(px, pz);
    if (start < sep) {
      let push;
      if (start < 1e-5) {
        const side = ((n.avoidId + avoidId) & 1) ? 1 : -1;
        px = Math.cos(n.yaw || 0) * side; pz = -Math.sin(n.yaw || 0) * side;
        start = 1; push = Math.min(.026, Math.max(0, dt || 0) * .90);
      } else push = Math.min(.026, Math.max(0, dt || 0) * .90, sep - start + .002);
      outX += px / start * push; outZ += pz / start * push;
      return;
    }
    const vx = outX - ox, vz = outZ - oz, a = vx * vx + vz * vz;
    if (a < 1e-9) return;
    const b = 2 * (px * vx + pz * vz), c = px * px + pz * pz - sep * sep;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return;
    const enter = (-b - Math.sqrt(disc)) / (2 * a);
    if (enter >= 0 && enter <= 1) {
      // Do not turn the safety circle into a dead end. Remove the inward radial component and
      // spend the step along its tangent; for an exactly head-on step the stable pair side chooses
      // which tangent. Steering then eases the body into the same direction over following frames.
      const ux = px / start, uz = pz / start, inward = vx * ux + vz * uz;
      let tx = vx - ux * Math.min(0, inward), tz = vz - uz * Math.min(0, inward);
      const step = Math.sqrt(a), tangent = Math.hypot(tx, tz);
      if (tangent < step * .16) {
        const side = ((n.avoidId + avoidId) & 1) ? 1 : -1;
        tx = uz * side; tz = -ux * side;
      } else { tx /= tangent; tz /= tangent; }
      const travel = Math.max(step * .58, Math.min(step, tangent));
      outX = ox + tx * travel; outZ = oz + tz * travel;
      n._crowdTangentYaw = Math.atan2(tx, tz);
    }
  };
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const bucket = mallSpaceGrid.get(mallSpaceKey(floor, ix + dx, iz + dz));
    if (!bucket) continue;
    for (const other of bucket) if (other !== n)
      clip(other._mallSnapX, other._mallSnapZ, other.avoidId,
        other._mallSnapYaw, other._mallSnapGround, false, !other.patrol,
        other._mallSnapClearance);
  }
  if (Mall.level() === floor) clip(P.x, P.z, 104729, P.yaw, 0, true, false,.32);
  return [outX, outZ];
}

// A legal patrol point does not prove that the straight segment leading to it misses every tenant
// fitting. When a real static clamp establishes a blocked segment, try the tangent that still makes
// progress toward the authored target, then its opposite. This runs once per continuous blockage,
// not once per frame: the ordinary movement clamp remains the safety net while the stored heading
// carries the walker far enough along the fixture to resume the authored route.
function mallStaticTangentClear(n, ox, oz, alongZ, side) {
  const probe = .18;
  const px = ox + (alongZ ? 0 : side * probe);
  const pz = oz + (alongZ ? side * probe : 0);
  const radius=mallClearanceRadius(n);
  const safe = (n.mallFloor || 1) > 1
    ? Mall.clampUpper(ox, oz, px, pz, radius, n.mallFloor)
    : Mall.clampMove(ox, oz, px, pz, radius);
  return Math.hypot(safe[0] - px, safe[1] - pz) < .025 &&
    Math.hypot(safe[0] - ox, safe[1] - oz) > probe * .82;
}

function mallBeginStaticDetour(n, ox, oz, tx, tz, correctionX, correctionZ) {
  // A correction on x means a vertical collider face, so its safe tangent is z (and vice versa).
  const alongZ = Math.abs(correctionX) >= Math.abs(correctionZ);
  const toward = alongZ ? tz - oz : tx - ox;
  const stable = ((n.avoidId || n.seed || 1) & 1) ? 1 : -1;
  const preferred = Math.abs(toward) > .04 ? (toward > 0 ? 1 : -1) : stable;
  n.mallDetourLeft = 0;
  let side = preferred;
  if (!mallStaticTangentClear(n, ox, oz, alongZ, side)) {
    side = -side;
    if (!mallStaticTangentClear(n, ox, oz, alongZ, side)) return false;
  }
  n.mallDetourYaw = alongZ ? (side > 0 ? 0 : Math.PI)
                               : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
  // One body diameter plus clearance gets past an ordinary display corner. Longer counters simply
  // create another bounded contact episode instead of paying for route-wide probes every frame.
  n.mallDetourLeft = .82;
  return true;
}

function mallClearStaticDetour(n) {
  n.mallDetourLeft = 0;
  n.mallDetourYaw = undefined;
  n.mallStaticContact = false;
}

function updateNPCs(dt, now) {
  rebuildMallSpaceGrid();
  // Claims live for one simulation frame. Rebuilding this compact list is cheaper and safer than
  // leaving ownership on schedule objects across room changes; only awake people in the current
  // room can reserve a physical slot.
  npcSeatClaims.length = 0;
  for (const n of NPCS) {
    n.activeSeat = null;
    n.seatOccupied = false;
    updateHomeRoutine(n);
    updateDinerGuestRoutine(n);
    // Awake means "in the place you are standing in, during their own hours". Tested against a
    // hard-coded 'street' it was impossible for anyone to be indoors.
    const wasAwake = !!n.awake;
    n.awake = place === n.place && npcAwake(n);
    // Off-camera campus schedule changes are true snaps. Keeping this before the awake early-out
    // means the next campus visit is already staged even if several clock windows passed elsewhere.
    if (n.campusStatic && place !== 'campus') campusStaticTarget(n);
    // A keeper's authored service route includes the exact staff gate used between jobs. When the
    // player enters the zoo halfway through a shift, begin her at the current care stop instead of
    // making her replay every unseen morning leg in one diagonal line through several habitats.
    // While the player remains in the room ordinary target walking stays in charge, so the visible
    // entry and exit through each gate are still real movement rather than a teleport.
    if (n.awake && !wasAwake && n.serviceRoute) {
      const serviceAt = npcTarget(n);
      n.x = serviceAt[0]; n.z = serviceAt[1];
      n.yaw = n.face === undefined ? n.yaw : n.face;
      n.ground = 0; n.animGround = 0; n.wait = 0;
    }
    // Paired family routes are a formation, not two independent patrol clocks. The child owns a
    // fully standable route translated 0.50 m from the parent, and follows that same translation
    // every visible frame so speed easing and independently seeded dwell times cannot pull them
    // apart. The leader was emitted immediately before the child, so its position is current.
    const formationLeader=n.pairedWith&&
      (n._formationLeader||(n._formationLeader=NPCS.find(q=>q.npcId===n.pairedWith)));
    let formationCovered=0;
    if(n.awake&&formationLeader&&formationLeader.awake){
      const ox=n.x,oz=n.z;
      n.x=formationLeader.x+.50;n.z=formationLeader.z;
      formationCovered=Math.hypot(n.x-ox,n.z-oz)/Math.max(dt,1e-4);
      n.leg=formationLeader.leg;n.wait=formationLeader.wait;
      n.yaw=formationLeader.yaw;n.ground=formationLeader.ground;
    }
    n._mallOverlapMoved = n.awake && n.place === 'mall' && n.patrol
      ? mallResolveCrowdOverlap(n, dt) : 0;
    n.th.pos[0] = n.x; n.th.pos[2] = n.z;
    n.th.focus[0] = n.x; n.th.focus[1] = n.z;
    // Out of hours the label goes with them.
    if (!n.awake) { n.th.reach = -1; continue; }
    if (n.lines) n.th.reach = 1.9;

    // Two different things, and conflating them stopped the waitress mid-floor with a bowl in her
    // hands. `engaged` is somebody standing in front of them talking to them, which is a reason to
    // stay put. `speaking` is their own voice still sounding, which is a reason to keep gesturing
    // and no reason at all to stand still — people talk and walk at the same time, and hers is the
    // one job in the game where the two happen together.
    const usingPerson = !!(doing && doing.th === n.th);
    // The action that opened a conversation has already completed, but the conversation itself
    // is still an encounter: they stay put, face you and keep their attention on you until the
    // panel closes. Without this a patrolling neighbour could walk away under their own question.
    const conversing = !!(talkOpen && talkAt && talkAt.n === n);
    const engaged = usingPerson || conversing;
    const speaking = (n.speakUntil || 0) > now;
    const talking = engaged || speaking;
    const [tx, tz] = formationLeader ? [n.x,n.z] : npcTarget(n);
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    let want = 0, faceYaw = n.yaw;

    const leg = n.errand && n.errand.length ? n.errand[0] : null;
    // Mall patrol points sit beside real counters, tables and display collision. Half a metre is a
    // convincing browse position and prevents a legal-but-razor-thin sanitized point from becoming
    // an orbit that can never satisfy the generic thirty-centimetre routine threshold.
    // A walking route may stop loosely beside a display; a seated body may not.  It walks to
    // within 5.5 cm of the authored hip point, then the final few centimetres are snapped so the
    // pose and the cushion cannot drift apart as the speed envelope settles.
    const arrival = n.seatCandidate||n.mallFoodQueued ? .055
      : !leg && n.place === 'mall' && n.patrol && !n.mallEventActive&&!n.mallFormationActive ? .50 : .30;
    if (formationLeader) {
      want=formationLeader.ground;faceYaw=formationLeader.yaw;
    } else if (engaged || (n.wait > 0)) {
      // A stop can become occupied after arrival (including on the very first mall frame, before
      // the grid had an awake snapshot). A patroller gives up the optional dwell immediately;
      // conversations and timed service errands remain authoritative and are never displaced.
      if (!engaged && !leg && n.place === 'mall' && n.mallPause && mallWaypointOccupied(n)) {
        n.wait = 0; n.mallPause = null;
        n.mallOccupiedSkips = (n.mallOccupiedSkips || 0) + 1;
      } else n.wait = Math.max(0, n.wait - dt);
      if (!engaged && n.wait <= 0) n.mallPause = null;
    } else if (d > arrival) {
      // Somebody with an order going cold moves faster than somebody minding a counter.
      want = (leg && leg.speed) || n.speed;
      faceYaw = Math.atan2(dx, dz);
      // An ordinary patrol arrives on a shortening step instead of travelling at full speed to
      // thirty centimetres and stopping translation in one frame. Timed errands keep their exact
      // service/boarding pace; only untimed routes buy this visual braking distance.
      if (!leg && n.patrol && !n.mallEventActive&&!n.mallFormationActive)
        want *= .18 + .82 * smooth01(clamp((d - arrival) / .62, 0, 1));
    } else if (n.homePhase === 'leaving') {
      n.homePhase = 'out';
      n.wait = .25;
    } else if (n.homePhase === 'returning') {
      n.homePhase = 'entering';
    } else if (n.homePhase === 'entering') {
      n.homePhase = 'inside';
      n.awake = false;
      n.th.reach = -1;
      n.ground = 0;
    } else if (leg) {
      // Arrived at a waypoint: stand there for as long as it takes to pick the food up or set it
      // down, then move on. `done` fires as the leg is retired, which is when the food lands.
      leg.hold = (leg.hold === undefined ? leg.dwell || 0 : leg.hold) - dt;
      if (leg.hold <= 0) {
        n.errand.shift();
        if (!n.errand.length) n.errand = null;
        if (leg.done) leg.done();
      }
    } else if (n.patrol && !n.mallEventActive&&!n.mallFormationActive) {
      const arrived = n.leg;
      n.leg++;
      if (n.place === 'mall') {
        mallClearStaticDetour(n);
        n.mallBlocked = 0;
        // Do not turn an occupied route point into a seven-second overlap. It can be safe geometry
        // and still be occupied by a queue or another shopper; skip the dwell and continue toward
        // the next purpose, where the ordinary avoidance path has room to separate them.
        if (mallWaypointOccupied(n)) {
          n.mallPause = null; n.wait = 0;
          n.mallOccupiedSkips = (n.mallOccupiedSkips || 0) + 1;
        } else {
          n.mallPause = mallPatrolPause(n, arrived);
          n.wait = n.mallPause.dwell;
        }
      } else {
        // Vary the stop by both person and leg. The old seed-only value made every lap repeat the
        // same cadence forever even though the route itself changed context at each waypoint.
        n.wait = 1.2 + ((n.seed * 7 + arrived * 11) % 17) / 17 * 3.6;
      }
    }
    if (n.seatCandidate && d <= arrival) {
      n.x = tx; n.z = tz;
      if (claimNPCSeat(n, n.seatCandidate)) n.activeSeat = n.seatCandidate;
      else n.seatOccupied = true;
    }
    if (n.place === 'mall' && want > 0) {
      if ((n.mallDetourLeft || 0) > 0) faceYaw = n.mallDetourYaw;
      mallCrowdAvoidance(n, faceYaw, want);
      faceYaw += n._avoidTurn;
      want *= n._avoidPace;
    }
    // Turning to face whoever is talking to them is most of what makes them feel present.
    const near = npcPlayerDistance(n);
    // `faceLock` is somebody holding a heading no matter who walks up. The screenshot harness
    // sets it because the camera target is the player, so without it every portrait subject
    // turns to stare down the lens. The seated passengers in the carriage carry it permanently,
    // for two reasons: a body that yaws away from its seat puts its legs through the bench, and
    // in a car this narrow the player is within 2.6 m of all seven of them at once, so without
    // it the whole carriage swivels to watch you the entire journey.
    // Turning to face somebody is for a CONVERSATION, not for proximity.
    //
    // This used to read `engaged || (want === 0 && near < 2.6)`, so every idle person within 2.6 m
    // swung their whole body round to face the player and held it. The note above already admits
    // what that does in a crowd — "the whole carriage swivels to watch you the entire journey" —
    // and `faceLock` was a per-scene patch for the train rather than a fix. Everywhere without one,
    // walking past a queue turns the queue.
    //
    // It is also unnecessary, because the gaze system further down already does this properly: a
    // glance on each person's own thirty-second clock, neck and eyes separately, fading in over the
    // last four metres, and less of it from somebody on their way somewhere. That is what noticing
    // you looks like. A body that rotates to track you is what a security camera looks like.
    // A conversation turns the neck, eyes and upper torso of a seated person, never the pelvis
    // out of its chair.  The ordinary gaze/speech layers below already provide that attention.
    if (n.activeSeat && n.face !== undefined) faceYaw = n.face;
    else if (!n.faceLock && engaged) faceYaw = Math.atan2(P.x - n.x, P.z - n.z);
    else if (want === 0 && n.face !== undefined) faceYaw = n.face;

    const yawWas = n.yaw;
    // 0.02, not 0.002 — about 0.45 s to come round rather than 0.17.
    //
    // Two things came out of the old rate. It looked like a snap, because nobody turns ninety
    // degrees in ten frames. And `n.turn` below is an angular VELOCITY that feeds `torsoRoll` in
    // js/figure.js — `clamp(-turn * 0.05, -0.16, 0.16)`, a bank into the turn — so whipping round
    // banked the torso to its 9-degree limit and held it there for the duration. A body leaning
    // hard sideways while it spins is the "weird leaning over" motion; slowing the turn takes the
    // spike out of the input rather than papering over the bank, which is real and wanted when
    // somebody actually leans into a corner at walking pace.
    n.yaw = angleLerp(n.yaw, faceYaw, 1 - Math.pow(0.02, dt));
    n.ground = lerp(n.ground, want, 1 - Math.pow(0.0015, dt));
    // Distance covered begins at zero. It used to begin at the smoothed requested speed, which
    // meant the gait phase kept advancing after an NPC had stopped moving while that speed eased
    // away. Freezing phase on release keeps whichever foot was planted on the floor and lets the
    // stride shrink into the idle instead of taking two sliding steps in place.
    let covered = formationLeader ? formationCovered : 0;
    if (formationLeader) {
      // Position was copied from the leader above; only gait telemetry continues below.
    } else if (n._mallOverlapMoved > 0) {
      // Personal-space correction already spent this frame's displacement budget. Do not add a
      // full route step on top of it; that was the only path left to a visible double-speed pop.
      covered = n._mallOverlapMoved / Math.max(dt, 1e-4);
    } else if (n.ground > 0.02 && want > 0) {
      const ox=n.x,oz=n.z;
      let nx=ox+Math.sin(n.yaw)*n.ground*dt,nz=oz+Math.cos(n.yaw)*n.ground*dt;
      let staticAttempt2=0,staticLoss2=0,staticCorrectionX=0,staticCorrectionZ=0;
      // Mall props are real obstacles for its crowd. Ground-floor shoppers share the same solids
      // as the player; upstairs they share the gallery and product-display collision map. Keeping
      // this scoped to the mall avoids changing the established routines in every other scene.
      if(n.place==='mall') {
        n._crowdTangentYaw = undefined;
        [nx,nz]=mallClipCrowdMove(n,ox,oz,nx,nz,dt);
        if (n._crowdTangentYaw !== undefined)
          // The safety circle may redirect the actual step along a tangent. Turn the body onto
          // that line with the same real-time response at every display rate; a fixed .22 blend
          // was a 30/60/120 Hz-dependent snap and left the torso out of sync with its feet.
          n.yaw = angleLerp(n.yaw, n._crowdTangentYaw, 1 - Math.exp(-dt / .10));
        const preClampX=nx,preClampZ=nz;
        const attemptX=preClampX-ox,attemptZ=preClampZ-oz;
        staticAttempt2=attemptX*attemptX+attemptZ*attemptZ;
        const radius=mallClearanceRadius(n);
        [nx,nz]=n.mallFloor>1
          ? Mall.clampUpper(ox,oz,nx,nz,radius,n.mallFloor) : Mall.clampMove(ox,oz,nx,nz,radius);
        staticCorrectionX=preClampX-nx; staticCorrectionZ=preClampZ-nz;
        staticLoss2=staticCorrectionX*staticCorrectionX+staticCorrectionZ*staticCorrectionZ;
      }
      n.x=nx;n.z=nz;
      covered=Math.hypot(nx-ox,nz-oz)/Math.max(dt,1e-4);
      // A bad future waypoint cannot make somebody march forever into a counter. After a short
      // blocked attempt a patrol advances to its next safe waypoint; the collision remains solid.
      const staticContact=n.place==='mall'&&staticAttempt2>1e-10&&
        staticLoss2>Math.max(2.5e-7,staticAttempt2*.0064);
      const hardStatic=staticContact&&staticLoss2>staticAttempt2*.36&&
        covered<n.ground*.24&&d>.45;
      if(hardStatic) {
        // Probe only on the first frame of this continuous hard-static blockage. A people-only clip has
        // no static loss and therefore can neither start a detour nor skip an authored route leg.
        if(!n.mallStaticContact)
          mallBeginStaticDetour(n,ox,oz,tx,tz,staticCorrectionX,staticCorrectionZ);
        n.mallBlocked=(n.mallBlocked||0)+dt;
        // One visible step is enough to establish that a display blocks this waypoint. Move on
        // quickly and pause to reorient; spending a full second animating into the counter was the
        // collision even though the position clamp itself was technically working.
        if(n.mallBlocked>.14&&n.patrol&&!n.mallFormationActive){
          n.leg++; n.wait=.45 + (n.seed % 5) * .09; n.mallPause=null; n.mallBlocked=0;
          mallClearStaticDetour(n);
          n.mallBlockedRecoveries=(n.mallBlockedRecoveries||0)+1;
          n.ground=0;
        } else n.mallStaticContact=true;
      } else {
        n.mallBlocked=0;
        n.mallStaticContact=false;
      }
      if((n.mallDetourLeft||0)>0&&covered>0) {
        n.mallDetourLeft=Math.max(0,n.mallDetourLeft-covered*dt);
        if(n.mallDetourLeft===0) n.mallDetourYaw=undefined;
      }
      if(covered<n.ground) n.ground=covered;
    }
    // Include the final collision-guided heading in the turn telemetry.  Previously `turn` was
    // sampled before the crowd tangent adjusted yaw, so the feet changed direction first and the
    // torso discovered the corner a frame later.
    n.turn = lerp(n.turn, angleDelta(n.yaw, yawWas) / Math.max(dt, 1e-3),
      1 - Math.pow(0.004, dt));

    // Phase advances per metre travelled, not per second — the rule the whole walk is built on, and
    // it is the same rule for four legs as for two. What changes is the stride length it is scaled
    // to, which for an animal is `step` out of the species table: without it an elephant takes a
    // macaque's steps and skates across its own pen.
    n.phase += covered * dt *
      (n.animal ? Math.PI / n.look.step : strideRate(covered / 1.55, n.look.age));

    // The same motion telemetry the player feeds the shared gait. `n.ground` is the visible speed
    // ramp, while lift is the room's actual floor under this person's feet. Computing lift here,
    // before posing, removes the old one-frame delay on every stair edge.
    const nextLift = n.place === 'mall' && n.mallFloor > 1 ? Mall.deckY(n.mallFloor)
      : scene.liftAt ? scene.liftAt(n.x, n.z,n.lift||0) : 0;
    if (dt > 0) {
      // `ground` is the collision controller's speed and is allowed to stop immediately when a
      // counter or another person consumes the step.  A body is not.  Drive the skeleton from a
      // short presentation-speed envelope so hips, arms and stride width settle over several
      // frames while phase remains planted to the exact distance above.  This removes the visible
      // walk/idle flicker at crowded pinch points without letting a foot skate across the floor.
      const lastGround = n.animGround === undefined ? covered : n.animGround;
      const speedTau = covered > lastGround ? .10 : .14;
      n.animGround = lerp(lastGround, covered, 1 - Math.exp(-dt / speedTau));
      const lastLift = n.lift === undefined ? nextLift : n.lift;
      n.animAccel = lerp(n.animAccel || 0, (n.animGround - lastGround) / dt,
        1 - Math.exp(-dt / 0.12));
      const rising = n.ground > 0.08 ? (nextLift - lastLift) / dt : 0;
      n.animClimb = lerp(n.animClimb || 0, rising, 1 - Math.exp(-dt / 0.16));
    }
    n.lift = nextLift;

    // Movement remains a 60 Hz simulation, so somebody behind the camera still gets to their next
    // waypoint at the same time. Skeleton synthesis is presentation work: do it every frame in the
    // foreground, at 30 Hz beyond fifteen metres, and at 10 Hz while wholly off-screen. Turning the
    // camera reveals the current gait phase immediately; accumulated easing time prevents a pop.
    const firstPose = !n.pose;
    if (firstPose) n.pose = { ...(n.animal ? APOSE : POSE) };
    const renderD = npcRenderRange(n, eye, Perf.q);
    const poseInterval = talking || near < 10 ? 0 : renderD < 0 ? 100 : renderD > 15 ? 32 : 0;
    const changedRoom = n._posePlace !== place;
    if (!firstPose && !changedRoom && poseInterval && now - (n._poseAt || 0) < poseInterval) {
      n._poseLag = (n._poseLag || 0) + dt;
      continue;
    }
    const poseDt = Math.min(0.14, dt + (n._poseLag || 0));
    n._poseLag = 0; n._poseAt = now; n._posePlace = place;

    if (n.animal) {
      // Everything the block below does for a person, in the four lines an animal needs. There is
      // no activity pose, no temperament fidget and no talking hand, because an animal is doing
      // exactly one thing — being an animal — and `animalPose` covers the walk and the idle both.
      //
      // `alert` is the single input that does not come from the walk: something standing at the
      // rail is worth lifting your head for. It is the whole of an animal noticing you, and it is
      // the reason the enclosures do not read as dioramas.
      const near2 = npcPlayerDistance(n);
      const visibleGround2 = n.animGround === undefined ? n.ground : n.animGround;
      const g2 = animalPose({ ...APOSE }, visibleGround2, n.phase, n.turn, now, n.look,
        visibleGround2 < 0.12 ? clamp((6.0 - near2) / 3.2, 0, 1) : 0);
      // And what it is doing while it is there. Exactly the same shape as the human path below —
      // the spot names an act, the act is laid over the gait, and it fades out as the animal gets
      // moving so a panda that decides to walk stops eating on the way rather than sliding across
      // its enclosure still sitting down.
      const doingHere2 = n.act || (n.spot && n.spot.act);
      if (doingHere2)
        animalAct(g2, doingHere2, now, n.seed, n.look,
          1 - clamp(visibleGround2 / 0.28, 0, 1));
      for (const k in n.pose)
        n.pose[k] = firstPose || changedRoom ? g2[k]
          : n.pose[k] + (g2[k] - n.pose[k]) * (1 - Math.exp(-poseDt / (ATAU[k] || 0.15)));
      n.pose.blink = blinkOf(now, n.seed, n.temper ? n.temper.blink : 1);
      saccade(now, n.seed, n.pose, n.temper ? n.temper.curious : 1);
      continue;
    }

    // Pose: the shared gait, then whatever they are doing here, plus a hand and a nod while
    // they are speaking.
    const visibleGround = n.animGround === undefined ? n.ground : n.animGround;
    const g = gaitPose({ ...POSE }, clamp(visibleGround / 1.55, 0, 1.6), n.phase, n.turn, now,
      n.look, { accel: n.animAccel || 0, climb: n.animClimb || 0 });
    // Keep the gait's arm result before an activity is blended on top.  Activity mixing eases out
    // over a few frames when somebody starts moving; without this snapshot a shopper could carry
    // the last browse/check pose into the first steps and appear to walk with both arms forward.
    const gaitShL = g.shL, gaitShR = g.shR, gaitElbL = g.elbL, gaitElbR = g.elbR,
          gaitTwL = g.twL, gaitTwR = g.twR, gaitGrip = g.grip;
    const doingHere = n.act || (n.spot && n.spot.act);
    if (n.animAct !== doingHere) {
      n.animAct = doingHere; n.animActMix = 0; n.animActSince = now;
    }
    const stillForAct = 1 - clamp(visibleGround / 0.34, 0, 1);
    n.animActMix = lerp(n.animActMix || 0, stillForAct,
      1 - Math.exp(-poseDt / (stillForAct > (n.animActMix || 0) ? 0.32 : 0.20)));
    if (doingHere && n.animActMix > 0.002) {
      const a = { ...g };
      // The cabin safety demonstration is deliberately a chorus: every crew member must stay on
      // the same beat, even if they entered the activity a frame apart. All ordinary activities
      // use local time so they ease in from their authored preparation instead of popping into an
      // arbitrary point in the loop.
      activityPose(a, doingHere, doingHere === 'safety' ? now
        : n.animActSince === undefined ? now : Math.max(0, now - n.animActSince),
        n.seed, n.activeSeat ? n.activeSeat.seatY : undefined);
      // `carry` is the locomotion/activity label; the authored prop says how the load is actually
      // supported. Trays, folded linen, parcels and bouquets need two forearms under/in front of
      // them. A wardrobe tote or generic one-hand bag keeps the asymmetric carry pose above.
      if (doingHere === 'carry') {
        const item = npcHeldItem(n);
        if (item === 'tray' || item === 'linen' || item === 'parcel' || item === 'bouquet') {
          a.shL = -.68; a.shLz = -.22; a.elbL = -1.00;
          a.shR = -.68; a.shRz = .22; a.elbR = -1.00;
          a.torsoPitch = Math.max(a.torsoPitch || 0, .055);
          a.grip = .84;
        }
      }
      const ak = smooth01(n.animActMix);
      for (const k in g) g[k] = lerp(g[k], a[k], ak);
    }
    const mobility=mallAccessibleActive(n)?n.mallAccessible.kind:null;
    if(mobility==='wheelchair') {
      // A wheelchair user is seated because the chair is their locomotion, not because the route
      // happened to find a bench.  Reuse the exact supported sitting solve (feet, knees, pelvis and
      // breathing), then put alternating hands onto the rims only while the chair is moving.  At a
      // stop both hands settle naturally instead of looping an exaggerated pushing mime.
      activityPose(g,'sit',now,n.seed,.49);
      const rolling=smooth01(clamp(visibleGround/.22,0,1));
      const left=Math.max(0,Math.sin(n.phase))*rolling,right=Math.max(0,-Math.sin(n.phase))*rolling;
      g.shL=-.30-left*.38;g.shLz=-.18;g.elbL=-.72-left*.42;
      g.shR=-.30-right*.38;g.shRz=.18;g.elbR=-.72-right*.42;
      g.torsoPitch=.07+(left+right)*.018;g.grip=.72;
    }
    // Then who is doing it. Fades out as they get moving, and keeps its hands to itself unless
    // the activity has left the arms free.
    traitPose(g, n, now, 1 - clamp(visibleGround / 0.55, 0, 1),
      // Pocket/clasp/fan quirks were authored around the primitive body's exact wrist path.
      // On an imported skeleton they leave unsupported hands hovering in front of the torso.
      // Keep the character-specific weight shift, posture and gaze, but leave a skinned body's
      // arms to its natural idle, activity, speech, carry or walking pose.
      !n.rig && !n.carrying && (!doingHere || doingHere === 'wait' ||
        (doingHere === 'sit' && !!n.activeSeat)));
    // Both hands out under a tray, walking or standing — over the top of the gait rather than
    // instead of it, so she still walks like somebody walking while she does it.
    // Pushing a cart is the same arms as carrying a tray and a little more weight through the
    // shoulders. It is a separate flag rather than the same one because `drawNPCs` puts a tray in the
    // hands of anyone `carrying`, and a member of crew with a tray in her hands and a cart in front
    // of her is holding two things at once.
    const mobilityPush=mobility==='stroller'||mobility==='push-cart';
    if (n.pushing || mobilityPush || (n.carrying && n.carryKind !== 'waimai')) {
      g.shL = -0.68; g.shLz = -0.22; g.elbL = -1.00;
      g.shR = -0.68; g.shRz = 0.22; g.elbR = -1.00;
      g.torsoPitch = Math.max(g.torsoPitch, n.pushing||mobilityPush ? 0.09 : 0.05);
      g.grip = .82;
    } else if (n.carrying) {
      // A takeaway bag hangs from one hand; posing both arms as a tray made the bag appear to be
      // suspended under an empty pair of palms. Let the free arm keep a shortened walk swing and
      // put a small counter-lean through the torso so the load has weight.
      g.shL = -0.05; g.shLz = -0.09; g.elbL = -0.17;
      g.shR *= .62; g.elbR = Math.min(g.elbR, -0.22);
      g.torsoRoll += .040; g.sway -= .016;
      g.grip = .88;
    }
    // The production skeleton's normal state is arms beside the body. Keep only front-to-back
    // gait swing while walking; at idle/wait/stand/duty, also keep elbows and shoulders low. Real
    // prop use, work gestures and speech retain their authored arm motion and return here when done.
    if (n.rig && !n.carrying && !n.pushing && !mobility && !speaking) {
      // Imported shoulders used to switch modes at exactly .035 m/s: one frame had nearly-straight
      // idle arms, the next threw those channels away and installed the full gait. Blend over the
      // first quarter-metre per second instead, so a start, stop or collision pause cannot produce
      // a one-frame hand/elbow jerk. Work/activity arms remain intact while stationary and merge
      // into the same natural gait continuously once their owner walks away.
      const walkArm = smooth01(clamp(visibleGround / .25, 0, 1));
      if (!doingHere || doingHere === 'wait' || doingHere === 'hands' || doingHere === 'stand') {
        // The shared idle pose is intentionally more expressive for the simple fallback figure.
        // On the measured production skeletons its 8-12 degree elbow bend and forward shoulder
        // offset read as a posed mannequin. Preserve a trace of the stable per-person asymmetry,
        // but let the forearms hang almost straight; the broad-shouldered rigs otherwise flare
        // both hands even when the upper arms are correctly vertical.
        const relax = 1 - walkArm;
        g.shL = lerp(g.shL, clamp(g.shL * .16, -.020, .025), relax);
        g.shR = lerp(g.shR, clamp(g.shR * .16, -.020, .025), relax);
        g.shLz = lerp(g.shLz, 0, relax); g.shRz = lerp(g.shRz, 0, relax);
        g.elbL = lerp(g.elbL, clamp(g.elbL * .14, -.040, -.010), relax);
        g.elbR = lerp(g.elbR, clamp(g.elbR * .14, -.040, -.010), relax);
        // A small anatomical turn hides the open palm from a frontal crowd view; exactly zero
        // still made the generated MPFB hands read like flat mannequin paddles.
        g.twL = lerp(g.twL, .12, relax); g.twR = lerp(g.twR, -.12, relax);
        g.grip = lerp(g.grip, Math.max(g.grip || 0, .42), relax);
      }
      g.shL = lerp(g.shL, gaitShL, walkArm); g.shR = lerp(g.shR, gaitShR, walkArm);
      g.elbL = lerp(g.elbL, gaitElbL, walkArm); g.elbR = lerp(g.elbR, gaitElbR, walkArm);
      g.shLz = lerp(g.shLz, 0, walkArm); g.shRz = lerp(g.shRz, 0, walkArm);
      g.twL = lerp(g.twL, gaitTwL, walkArm); g.twR = lerp(g.twR, gaitTwR, walkArm);
      g.grip = lerp(g.grip, gaitGrip, walkArm);
    }
    if (talking) {
      const t = now / 1000 + n.seed;
      g.headPitch += Math.sin(t * 1.7) * (speaking ? 0.05 : 0.025) - 0.02;
      g.headYaw += Math.sin(t * 0.8) * 0.05;
      // Hands gesture while words are actually sounding; while listening they settle, which
      // makes the answer/reply rhythm legible instead of holding one endless talking pose.
      if (speaking) {
        const cadence = Math.sin(t * 1.9), phraseClock = t * .42 + n.seed;
        const phraseWhole = Math.floor(phraseClock), phrase = phraseWhole % 3;
        // Let the hands return through their ordinary resting pose between ideas. Selecting a new
        // gesture on one `floor()` boundary made the target shoulders jump by up to .3 rad; the
        // downstream spring softened it but still produced a conspicuous conversational twitch.
        // A brief ease-out/ease-in reads as punctuation and keeps every target channel continuous.
        const phrasePart = phraseClock - phraseWhole;
        const phraseMix = smooth01(clamp(Math.min(phrasePart, 1 - phrasePart) / .14, 0, 1));
        if (phrase === 0) {                     // open palm, offering the point
          g.shR = lerp(g.shR, -0.34 + cadence * 0.11, phraseMix);
          g.shRz = lerp(g.shRz, 0.31, phraseMix);
          g.elbR = lerp(g.elbR, -1.48 + Math.sin(t * 1.9 + .7) * .18, phraseMix);
          g.grip = lerp(g.grip, .10, phraseMix);
        } else if (phrase === 1) {              // small two-hand explanation
          g.shR = lerp(g.shR, -0.48 + cadence * .08, phraseMix);
          g.shRz = lerp(g.shRz, .25, phraseMix); g.elbR = lerp(g.elbR, -1.32, phraseMix);
          g.shL = lerp(g.shL, -0.34 - cadence * .06, phraseMix);
          g.shLz = lerp(g.shLz, -.22, phraseMix); g.elbL = lerp(g.elbL, -1.12, phraseMix);
          g.grip = lerp(g.grip, .18, phraseMix);
        } else {                                // precise, close-to-body emphasis
          g.shR = lerp(g.shR, -0.62 + cadence * .07, phraseMix);
          g.shRz = lerp(g.shRz, .14, phraseMix);
          g.elbR = lerp(g.elbR, -1.72 + cadence * .12, phraseMix);
          g.grip = lerp(g.grip, .48, phraseMix);
        }
        g.torsoYaw += Math.sin(t * 0.9) * 0.035;
      } else if (conversing) {
        // Listening: hands settle, chest comes forward, and an occasional nod answers the phrase
        // without competing with the speaker's larger gesture.
        const nod = Math.max(0, Math.sin(t * 1.15 + .6));
        g.torsoPitch += .025;
        g.headPitch += nod * .045;
        g.shR = lerp(g.shR, .04, .28); g.elbR = lerp(g.elbR, -.30, .28);
      }
    }
    g.mouth = speaking ? speechMouth(now, n.seed) : 0;
    if (place === 'cabin' && n.place === 'cabin' && want === 0)
      Cabin.motionPose(g, n.seed, now);
    // And whether they have noticed you. Until now nobody in this game had ever looked at the
    // player: the eyes wandered on their own clock and the body turned to face whoever walked
    // up, which between them read as a person looking *past* you while pointed at you.
    //
    // Laid onto the filtered target while the saccade remains a small final overlay, so the wander
    // survives as the small jitter a fixed eye still has instead of being overwritten by the
    // fixation. `lookAt` gives
    // the neck only what the eyes cannot reach, which is why this works on the seated riders
    // too — they hold their heading, and their eyes still find you.
    //
    // A glance, not a stare. It comes round on each person's own thirty-second clock and is
    // only up for about a third of it, so a carriage does not turn into seven people watching
    // you for the whole journey; it fades in over the last four metres; `curious` is already
    // how much this person looks at things; and somebody on their way somewhere gives you
    // rather less of it, because people do look at you as they pass and they also keep an eye
    // on where they are going.
    //
    // Somebody in the middle of talking to you is the exception: the wave gets a floor under it,
    // because a conversation where the other person keeps looking away over your shoulder is
    // worse than one where they never looked at all.
    const eyeY = 1.52 * (n.look.tall || 1) + (n.lift || 0);
    const wave = smooth01(Math.sin(now * 0.00021 + n.seed * 1.9) * 1.5 + 0.55);
    // During a conversation the listener keeps contact but not a mechanical stare. The slower
    // beat lets their attention soften briefly between phrases; ordinary passers-by retain the
    // rarer glance governed by `wave`.
    const attention = conversing
      ? 0.62 + 0.38 * smooth01(Math.sin(now * 0.00074 + n.seed * 2.3) * 1.25 + 0.40)
      : speaking ? Math.max(0.78, wave) : wave;
    const gaze = clamp((6.5 - near) / 2.6, 0, 1)
      * (n.temper ? clamp(n.temper.curious, 0, 1.2) : 0.8)
      * (1 - 0.45 * clamp(n.ground / 0.8, 0, 1))
      * attention;
    const rel = angleDelta(Math.atan2(P.x - n.x, P.z - n.z), n.yaw);
    // Gaze is a pose target, not a post-filter correction. Applying it directly to `n.pose` made
    // the response depend on how often this NPC happened to be posed and could snap a newly opened
    // conversation toward the player. The ordinary per-channel neck/eye time constants now own
    // the whole turn, while the later saccade remains the tiny living movement over that fixation.
    if (gaze > 0.01 && Math.abs(rel) < 1.55)
      lookAt(g, rel, -Math.atan2(1.55 - eyeY, Math.max(0.5, near)), gaze);
    for (const k in n.pose)
      n.pose[k] = firstPose || changedRoom ? g[k]
        : n.pose[k] + (g[k] - n.pose[k]) * (1 - Math.exp(-poseDt / (TAU[k] || 0.15)));
    n.pose.blink = blinkOf(now, n.seed, n.temper ? n.temper.blink : 1);
    saccade(now, n.seed, n.pose, n.temper ? n.temper.curious : 1);
    n.pose.grip = clamp(n.pose.grip === undefined ? 0.35 : n.pose.grip, 0, 1);
    // How high the floor is under them. Every room in this game is a plane at zero except the
    // subway station, which has a flight of stairs going up to the street that people walk up.
  }
}

// Is this person worth drawing at all: awake, posed, not inside the lens, not past the crowd
// distance, and — the one that was missing — actually somewhere on the screen.
//
// The loop below tested distance only, so in a shopping centre with 222 people in it, everybody
// standing behind the camera was posed, dressed, and pushed through the collector in full, to be
// thrown away by the GPU after the vertex stage. Profiling the mall put 38% of the frame in
// figure work (collectPush, shape, drawFigure, arm, surf, oneLeg); a camera looking one way down
// a concourse can see perhaps half of that crowd. This is the same bounding-sphere test the props
// have always had, against a sphere big enough for the tallest thing on two or four legs.
//
// The geometric half is also used by animation LOD before a pose exists. Keeping that decision
// here means pose work and draw work agree on exactly who can enter the frame.
function npcPlayerDistance(n) {
  // Floors overlap in x/z around Mall's atrium. Planar distance made somebody eight metres above
  // the player count as conversation-close, forcing portrait LOD and 60 Hz pose work (or culling
  // them as if the camera were inside their body). Floor height preserves the old same-deck
  // behaviour while keeping stacked residents genuinely distant.
  return Math.hypot(n.x-P.x,n.z-P.z,(n.lift||0)-(P.lift||0));
}

function npcRenderRange(n, eye, q) {
  if (!n.awake) return -1;
  const d = Math.hypot(n.x-eye[0],n.z-eye[2],(n.lift||0)-(P.lift||0));
  // Nobody is drawn on top of the lens, and nobody past the crowd distance.
  if (d < 0.80 || d > q.npcFar) return -1;
  const vp = R.vp;
  if (!vp) return d;
  // Head height rather than the floor, so somebody close and to one side is not culled by their
  // own feet leaving the bottom of the frame.
  const r = (n.animal ? Math.max(n.look.tall, n.look.foot || 0) : n.look.tall || 1.75) * 0.62 + 0.35;
  const cy = (n.lift || 0) + r;
  const w = vp[3] * n.x + vp[7] * cy + vp[11] * n.z + vp[15];
  if (w + r < 0.05) return -1;
  if (w > r) {
    const fy = 1 / Math.tan(CAM.fov / 2), fx = fy / cam.aspect;
    const x = vp[0] * n.x + vp[4] * cy + vp[8] * n.z + vp[12];
    if (Math.abs(x) > w + r * fx) return -1;
    const y = vp[1] * n.x + vp[5] * cy + vp[9] * n.z + vp[13];
    if (Math.abs(y) > w + r * fy) return -1;
  }
  return d;
}

// Returns the distance, because the caller needs it for the LOD anyway, or -1 for "skip".
function npcRange(n, eye, q) {
  if (!n.pose) return -1;
  return npcRenderRange(n, eye, q);
}

// The realistic near figures cannot be put through the primitive collector: every vertex also
// carries bone indices and weights. Queue them while visibility is known, draw all collected
// primitives first, then draw these with the skinned shader immediately afterwards.
const skinnedNPCs = [];
const RIG_WHITE = [1, 1, 1];

const MALL_PURCHASE_KINDS=['mallGift','mallBookBuy','mallBouquet','mallDrink','mallToy'];
function mallCarryFor(n,value=minutes) {
  if(!n||!n.mallPublicCustomer||!n.patrol||n.mallEventActive||mallAccessibleActive(n))return null;
  const h=(((Number(value)||0)%1440+1440)%1440)/60;
  const period=h<11?0:h<16?1:h<20?2:3,floor=n.mallFloor||1;
  // A slow, deterministic half-crowd rotation: 55% at each period, in the requested 40–60%
  // band, with no random draw and therefore no per-frame popping. The kind uses a second hash so
  // carrier/not-carrier and object choice do not collapse into the same repeating sequence.
  const gate=((n.mallCrowdSlot||0)+period*.193+floor*.071)%1;
  if(gate>=.55)return null;
  const pick=((n.seed*14+floor*7+period*5)%11+11)%11;
  return pick<6?`shopBag${pick}`:MALL_PURCHASE_KINDS[pick-6];
}

function mallCarryState(value=minutes) {
  const eligible=NPCS.filter(n=>n.mallPublicCustomer&&n.patrol),floors={};
  for(let floor=1;floor<=3;floor++) {
    const rows=eligible.filter(n=>(n.mallFloor||1)===floor),carriers=rows.map(n=>mallCarryFor(n,value)).filter(Boolean);
    floors[floor]={eligible:rows.length,carriers:carriers.length,
      share:rows.length?+(carriers.length/rows.length).toFixed(2):0,
      categories:[...new Set(carriers.map(k=>k.startsWith('shopBag')?'bag':k))],
      kinds:carriers};
  }
  const kinds=eligible.map(n=>mallCarryFor(n,value)).filter(Boolean);
  return {time:Number(value)||0,eligible:eligible.length,carriers:kinds.length,
    share:eligible.length?+(kinds.length/eligible.length).toFixed(2):0,
    bagDesigns:[...new Set(kinds.filter(k=>k.startsWith('shopBag')))].sort(),floors};
}

function npcHeldItem(n) {
  const doingHere = n.act || (n.spot && n.spot.act);
  // A live errand owns the hands. Outside one, authored semantics beat broad activity names: the
  // same `work` label covers a bicycle repair bench, a keyboard and flower wrapping, and the same
  // `play` label covers mahjong, chess, arcade cabinets and a child's train.
  if (mallAccessibleActive(n)) return null;
  if (n.carrying) return n.carryKind || 'tray';
  if(n.mallAfterHours==='security'&&((minutes/60)<7||(minutes/60)>=23))return 'torch';
  const owns = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  let authored;
  if (owns(n, 'held')) authored=n.held;
  else if (owns(n.spot, 'held')) authored=n.spot.held;
  if (authored !== undefined || owns(n, 'held') || owns(n.spot, 'held')) {
    if (authored && n.pose) {
      // A counter/range is the resting place between working beats. Small utensils appear only
      // after the operating hand has begun to lift; otherwise they dangle beside the thigh for
      // most of a long intermittent loop and read as detached debris rather than an object put
      // down between uses.
      if ((authored === 'teapot' || authored === 'ladle' || authored === 'can') &&
          (n.pose.shR || 0) > -.10) return null;
    }
    return authored;
  }

  const inferred = doingHere === 'phone' || doingHere === 'phoneStand' ? 'phone'
    : doingHere === 'lookMap' ? 'map'
    : doingHere === 'compare' ? 'product'
    : doingHere === 'read' ? 'book'
    : doingHere === 'eat' ? 'meal'
    : doingHere === 'drink' ? 'cup'
    : doingHere === 'feed' ? 'feedBucket'
    : doingHere === 'sweep' ? 'broom'
    : doingHere === 'work' ? 'tool'
    : doingHere === 'check' ? 'chart'
    : doingHere === 'buy' ? 'card'
    : doingHere === 'play' ? 'tile'
    : doingHere === 'cook' ? 'ladle'
    : doingHere === 'pour' ? 'can'
    : doingHere === 'write' ? 'brush'
    : doingHere === 'carry' ? (n.look && (n.look.bag || n.look.pack) ? null : 'bag')
    : null;
  if (inferred) {
    if (n.pose && (doingHere === 'phoneStand') && (n.pose.shL || 0) > -.10) return null;
    if (n.pose && (doingHere === 'cook' || doingHere === 'pour') &&
        (n.pose.shR || 0) > -.10) return null;
    return inferred;
  }

  // Between purposeful stops, roughly half of the public concourse crowd carries the result of a
  // visit. Browse/read/phone/food activities above still own the hands while they are happening;
  // event performers never receive one. This keeps the visual distribution credible without
  // adding a single person or a second held object to any body.
  if(!doingHere||doingHere==='wait'||doingHere==='stand') {
    const mallCarry=mallCarryFor(n);
    if(mallCarry)return mallCarry;
  }

  // Intermittent gestures only show a prop while the operating hand has actually left its rest
  // pose. At the counter/display edge that is also when the object becomes visible, avoiding an
  // all-day receipt or boxed product glued to somebody's relaxed hand.
  const p=n.pose || {};
  switch (doingHere) {
    case 'browse':
      if ((p.shR || 0) < -.10) return 'productR';
      if ((p.shL || 0) < -.10) return 'productL';
      return null;
    case 'shelve': return (p.shR || 0) < -.12 ? 'productR' : null;
    case 'vend': return (p.shR || 0) < -.12 ? 'receipt' : null;
    case 'smoke': return 'cigarette';
    case 'safety':
      // Belt: both hands low and together. Mask: right hand at the face. Exit pointing needs no
      // equipment and therefore returns null for the final third of the demonstration.
      if ((p.shL || 0) > -1.05 && (p.shR || 0) > -1.05) return 'belt';
      if ((p.shR || 0) < -1.20 && (p.elbR || 0) < -1.20 && (p.shLz || 0) > -.80) return 'mask';
      return null;
    default: return null;
  }
}

// Imported bodies use the same pose channels as the procedural skeleton, so the lightweight
// activity props can use the exact same local arm arithmetic without replacing the body. This is
// intentionally only an attachment frame: the realistic mesh and its GPU skinning remain in
// Rig.drawMany, while a phone, book, bowl or tray stays in the hands instead of disappearing and
// leaving a person miming around empty air.
function drawRigHeldItem(n, held) {
  if (!held || !n.pose || !n.look) return;
  const p = n.pose, lk = n.look, T = lk.tall || 1, W = lk.wide || 1;
  const frame = lk.shoulder || W, body = 1 - .22 * (lk.youth || 0), hip = .91 * T;
  const root = M.mul(M.trans(n.x,
    ((p.bob || 0) - (p.rootDrop || 0)) * T + (n.lift || 0), n.z),
    M.mul(M.rotY((n.yaw || 0) + (p.hipYaw || 0)),
      M.trans(p.sway || 0, 0, p.surge || 0)));
  const torso = M.mul(root, M.mul(M.trans(0, hip, 0),
    M.mul(M.rotY(p.torsoYaw || 0), M.mul(M.rotZ(p.torsoRoll || 0),
      M.rotX((p.recline || 0) + (p.torsoPitch || 0) + (lk.stoop || 0))))));
  const wrist = (side, sh, splay, elbow, twist) => {
    const shoulder = M.mul(torso, M.mul(M.trans(side * .202 * frame, .495 * body, 0),
      M.mul(M.rotZ(splay || 0), M.rotX(sh || 0))));
    const el = M.mul(shoulder, M.mul(M.trans(0, -.31 * T + .018, 0), M.rotX(elbow || 0)));
    return M.mul(el, M.mul(M.trans(0, -.29 * T + .025, 0), M.rotY(twist || 0)));
  };
  const wrL = wrist(-1, p.shL, p.shLz, p.elbL, p.twL);
  const wrR = wrist( 1, p.shR, p.shRz, p.elbR, p.twR);
  // A real skeleton's upper/lower-arm lengths vary by resident. Retain the standardised prop axes
  // above, but replace their origins with the actual posed hand-bone positions so a handset, cup,
  // cigarette or broom handle cannot sit several centimetres away from the rendered fingers.
  if (n.rig && typeof Rig !== 'undefined' && typeof Rig.handFrames === 'function') {
    const real = Rig.handFrames(n.rig, n.x, n.lift || 0, n.z, n.yaw || 0, p,
      n._rigHandFrames, { animFar:!!n._heldAnimFar });
    if (real) {
      n._rigHandFrames = real;
      const left=real.palmLeft || real.left, right=real.palmRight || real.right;
      if (real.hasLeft) for (let i=12;i<15;i++)
        wrL[i] = held === 'broom' && real.palmLeftMeasured
          ? real.left[i] + (left[i] - real.left[i]) * 2.00 : left[i];
      if (real.hasRight) for (let i=12;i<15;i++)
        wrR[i] = held === 'broom' && real.palmRightMeasured
          ? real.right[i] + (right[i] - real.right[i]) * 2.00 : right[i];
    }
  }
  const level = (w, sh, elbow) => M.mul(w,
    M.rotX(-((sh || 0) + (elbow || 0) + (p.torsoPitch || 0) + (p.recline || 0)
      + (lk.stoop || 0))));
  const lvL = level(wrL, p.shL, p.elbL), lvR = level(wrR, p.shR, p.elbR);
  const shape = (name, parent, x, y, z, sx, sy, sz, color, mat = FABRIC) =>
    R.draw(name, M.mul(parent, M.mul(M.trans(x, y, z), M.scale(sx, sy, sz))), color, mat);
  holdItem(held, shape, torso, wrL, wrR, lvL, lvR, 1);
}

// Lightweight opaque mobility equipment, attached to the reused actor's world transform.  These
// are assembled from meshes already resident for the figures, so the three silhouettes add no
// texture, light, model load or draw signature.  Far/shadow passes keep only the pieces that change
// the outline; close colour passes add rims, hubs and handles.  Nothing is branded.
const MOBILITY_INK=C('#293038'),MOBILITY_FRAME=C('#68757d'),MOBILITY_RIM=C('#aeb9bc'),
      STROLLER_CLOTH=C('#587a72'),STROLLER_LIGHT=C('#a8c1b4'),
      CART_BLUE=C('#496f85'),CART_CARD=C('#aa845a'),MOBILITY_SKIN=C('#c99770');
function drawMallMobility(n,d,forShadow=false) {
  if(!mallAccessibleActive(n))return;
  const root=M.mul(M.trans(n.x,n.lift||0,n.z),M.rotY(n.yaw||0));
  const shape=(name,parent,x,y,z,sx,sy,sz,color,mat=GL2)=>
    R.draw(name,M.mul(parent,M.mul(M.trans(x,y,z),M.scale(sx,sy,sz))),color,mat);
  const wheel=(x,y,z,r,detail=true)=>{
    const q=part(root,x,y,z,M.rotZ(Math.PI/2));
    shape('cyl',q,0,0,0,r,.055,r,MOBILITY_INK,GL2);
    if(detail){shape('cyl',q,0,0,0,r*.78,.061,r*.78,MOBILITY_RIM,GLD);
      shape('cyl',q,0,0,0,.055,.068,.055,MOBILITY_INK,GL2);}
  };
  const trim=!forShadow&&d<18,kind=n.mallAccessible.kind;
  if(kind==='wheelchair') {
    for(const x of [-.34,.34])wheel(x,.43,0,.42,trim);
    shape('capsule',part(root,0,.44,0,M.rotZ(Math.PI/2)),0,0,0,.035,.68,.035,
      MOBILITY_FRAME,GLD);
    shape('softBox',root,0,.64,.02,.62,.12,.58,STROLLER_CLOTH,{mode:7,gloss:.04});
    shape('softBox',root,0,.98,.28,.62,.56,.10,STROLLER_LIGHT,{mode:7,gloss:.04});
    shape('capsule',part(root,0,.28,-.35,M.rotZ(Math.PI/2)),0,0,0,.032,.52,.032,
      MOBILITY_FRAME,GLD);
    shape('softBox',root,0,.19,-.44,.50,.065,.24,MOBILITY_RIM,GL2);
    if(trim)for(const x of [-.30,.30])
      shape('capsule',part(root,x,1.20,.31,M.rotX(Math.PI/2)),0,0,0,.025,.25,.025,
        MOBILITY_FRAME,GLD);
  } else if(kind==='stroller') {
    for(const x of [-.29,.29])for(const z of [.42,.94])wheel(x,.16,z,.145,trim);
    for(const x of [-.25,.25])
      shape('capsule',part(root,x,.53,.62,M.rotX(-.47)),0,0,0,.027,.78,.027,
        MOBILITY_FRAME,GLD);
    shape('softBox',root,0,.58,.70,.54,.34,.48,STROLLER_CLOTH,{mode:7,gloss:.05,round:.05});
    shape('softBox',part(root,0,.82,.91,M.rotX(-.26)),0,0,0,.54,.42,.08,
      STROLLER_LIGHT,{mode:7,gloss:.05,round:.04});
    shape('softBox',root,0,.43,.63,.42,.10,.34,C('#d9d0ba'),{mode:7,gloss:.03});
    shape('ball',root,0,.83,.68,.105,.115,.10,MOBILITY_SKIN,{gloss:.07});
    if(trim) {
      for(const x of [-.25,.25])shape('capsule',root,x,.98,.22,.026,.76,.026,
        MOBILITY_FRAME,GLD);
      shape('capsule',part(root,0,1.34,.22,M.rotZ(Math.PI/2)),0,0,0,.030,.52,.030,
        MOBILITY_INK,GL2);
    }
  } else if(kind==='push-cart') {
    for(const x of [-.29,.29])for(const z of [.40,.98])wheel(x,.11,z,.095,trim);
    shape('softBox',root,0,.20,.70,.64,.09,.92,MOBILITY_FRAME,GLD);
    for(const x of [-.27,.27])
      shape('capsule',part(root,x,.66,.31,M.rotX(-.12)),0,0,0,.025,.94,.025,
        MOBILITY_FRAME,GLD);
    shape('capsule',part(root,0,1.11,.25,M.rotZ(Math.PI/2)),0,0,0,.030,.58,.030,
      MOBILITY_INK,GL2);
    shape('softBox',root,0,.47,.73,.54,.43,.54,CART_BLUE,{gloss:.12,round:.025});
    shape('softBox',root,0,.76,.70,.48,.18,.48,CART_CARD,{gloss:.08,round:.015});
    if(trim) {
      shape('softBox',root,0,.76,.445,.34,.07,.012,C('#e7dfce'),GL2);
      shape('capsule',part(root,0,.47,1.02,M.rotZ(Math.PI/2)),0,0,0,.022,.54,.022,
        MOBILITY_RIM,GLD);
    }
  }
}

function drawProceduralNPC(n, d, q, held, forceLod) {
  const lod = forceLod === undefined ? (d < q.lod0 ? 0 : d < q.lod1 ? 1 : 2) : forceLod;
  drawFigure(n.pose, n.x, n.z, n.yaw, n.look, lod,
    held ? (shape, torso, wristL, wristR, po) => {
      // Trays live on the torso, but takeaway bags hang from a levelled wrist. Supplying the
      // complete set of frames here lets the same carrier prop used by the delivery rider hang
      // correctly from a walk-in customer's hand instead of inheriting the forearm's rotation.
      const level = (w, sh, elb) => M.mul(w,
        M.rotX(-(sh + elb + po.torsoPitch + (po.recline || 0) + (n.look.stoop || 0))));
      const lvL = level(wristL, po.shL, po.elbL), lvR = level(wristR, po.shR, po.elbR);
      holdItem(held, shape, torso, wristL, wristR, lvL, lvR, 1);
    } : undefined, n.lift || 0);
}

// Same person at every distance, with only mesh density changing.  The dead bands stop a walking
// NPC hovering on a threshold from switching tiers every other frame.  Player distance matters
// in third person because the camera itself can be five metres behind a conversation partner.
function npcRigLod(n, cameraD, playerD, q) {
  const d = Math.min(cameraD, playerD + 1);
  // LOD0 is the conversation portrait: at five metres a 900 px frame still gives a standing
  // person roughly 280 pixels of height. Beyond that, the 15k-triangle copy retains the exact
  // face, hair and clothes without spending the 36k close mesh on somebody across an aisle. LOD2
  // takes over around fifteen metres, where the validated 7k copy is still the same authored
  // resident and individual garment seams are below a pixel. The old 7 m / 22 m thresholds were
  // inherited from the procedural bodies and left most of a crowded floor at portrait density.
  // On the safety tier the same face, hair, clothes, skinning and animation remain visible; only
  // the mesh density changes sooner. The former unconditional 4.2/11 m floors silently defeated
  // Basic's LOD settings and kept most of a crowded street at portrait density after quality had
  // already fallen specifically to protect frame rate.
  const safety = q.en === 'basic', reduced = q.en === 'low';
  const closeFloor = safety ? 2.6 : reduced ? 3.4 : 4.2;
  const middleFloor = safety ? 6.0 : reduced ? 9.0 : 11;
  const close = Math.max(closeFloor, q.lod0 + (safety ? 0.25 : 0.5));
  const middle = Math.max(middleFloor, q.lod1 + (safety ? 1.5 : reduced ? 3.0 : 4.0));
  let lod = n._rigLod;
  if (lod === undefined) lod = d < close ? 0 : d < middle ? 1 : 2;
  else if (lod === 0 && d > close + 1.0) lod = 1;
  else if (lod === 1 && d < close - 0.7) lod = 0;
  else if (lod === 1 && d > middle + (safety ? 1.0 : 2.0)) lod = 2;
  else if (lod === 2 && d < middle - (safety ? 1.0 : 1.5)) lod = 1;
  return (n._rigLod = lod);
}

function drawNPCs(eye, forShadow) {
  const q = Perf.q;
  if (!forShadow) skinnedNPCs.length = 0;
  for (const n of NPCS) {
    // Nobody is drawn on top of the lens. The third-person camera sits a couple of metres behind
    // your shoulders, and in a room where people are seated at a 90 cm pitch — an aeroplane cabin,
    // a train carriage, a row of benches in the terminal — that puts it inside whoever is sitting
    // behind you. What you get is a thigh and a forearm across the bottom of the frame with no way
    // to read them as a person, and the seat they are in is hidden anyway. The same reasoning the
    // renderer already applies to a wall the camera has backed out through: whatever stands between
    // you and the room is not drawn. Off-screen is handled there too — see npcRange.
    const d = npcRange(n, eye, q);
    if (d < 0) continue;
    if (n.animal) {
      // The LOD distances are tuned against a person, so they are read against this animal's own
      // size: an elephant at twelve metres fills more of the screen than somebody standing next to
      // you, and dropping it to the far tier there throws away its ears and its eyes while it is
      // still the biggest thing in view.
      const k = d / Math.max(1, n.look.tall / 1.7);
      // Keep the chosen animal mesh inside a small distance dead-band. Without this, a swaying
      // head or a camera resting on an enclosure rail can cross an exact LOD threshold on
      // consecutive frames and make stripes, claws, ears and eyes flash in and out. The person
      // rigs above already use the same rule; animals need it even more because their sizes vary
      // from a penguin to an elephant.
      let lod = n._animalLod;
      if (lod === undefined) lod = k < q.lod0 ? 0 : k < q.lod1 ? 1 : 2;
      else if (lod === 0 && k > q.lod0 + .70) lod = 1;
      else if (lod === 1 && k < q.lod0 - .50) lod = 0;
      else if (lod === 1 && k > q.lod1 + 1.20) lod = 2;
      else if (lod === 2 && k < q.lod1 - .90) lod = 1;
      n._animalLod = lod;
      drawAnimal(n.pose, n.x, n.z, n.yaw, n.look, lod, n.lift || 0);
      continue;
    }
    // Hands only tell half an activity. At normal play distance the phone, open book, bowl,
    // broom or clipboard is often the first readable cue, so recurring NPC actions carry the
    // same lightweight props the player actions already use.
    const held = npcHeldItem(n);
    drawMallMobility(n,d,!!forShadow);
    // Camera distance still chooses the procedural LOD, but it cannot be the only gate for a
    // close-up body. The third-person eye sits 4.4–5.2 m behind the player; on the lower quality
    // tiers that used to leave somebody standing at conversation distance outside `lod1`, so the
    // realistic rig never appeared at precisely the distance it was made for. Warm before the
    // player reaches a named person and guarantee the authored body through the whole nine-metre
    // social/retail foreground on every tier; only a few mapped identities can occupy that band.
    const playerD = npcPlayerDistance(n);
    // A visible authored resident is always the same resident.  Load on first visibility and use
    // progressively lighter copies of their own skinned mesh; never substitute the generic
    // procedural stranger merely because the camera moved farther away.
    const wantedRigLod = n.rig ? npcRigLod(n, d, playerD, q) : 2;
    if (!forShadow && n.rig) ensureRig(n.rig, wantedRigLod, Math.min(d, playerD + 1));
    // The depth pass deliberately keeps the lightweight silhouette: skinned meshes have their
    // own vertex program and are not part of the shadow collector yet. In the colour pass, props
    // use pose-matched attachment frames and are collected here before the skinned body is drawn.
    if (!forShadow && n.rig &&
        typeof Assets !== 'undefined' && Assets.rig(n.rig) &&
        typeof Rig !== 'undefined' && R.skinning.ok) {
      // Mesh density never changes the action itself. Large props remain readable well into LOD2,
      // and even a tiny handset popping out at Basic's six-metre threshold makes the same resident
      // look like two different people. Distant skeleton cadence is shared with Rig.handFrames.
      if (held) { n._heldAnimFar = d > 15; drawRigHeldItem(n, held); }
      skinnedNPCs.push({ n, d, lod: wantedRigLod });
      continue;
    }
    // The 1,536 px sun map covers 48 metres, then its edge is filtered. Face, seam and accessory
    // geometry from the near body cannot survive that projection, but used to be built again in
    // full for this pass. The far procedural body keeps the same pose and readable silhouette at
    // a fraction of the shadow-only vertex and matrix work.
    drawProceduralNPC(n, d, q, held, forShadow ? 2 : undefined);
  }
}

// The player, drawn with whatever is currently in their hands.
function drawCharacter(pose, now, lod = 0) {
  // The wardrobe now changes the player's overshirt. The cream travel tee remains visible down
  // the opening, preserving the layered concept while every shirt on the rail still changes the
  // dominant colour of the character just as it did before.
  PLAYER.JACK = PLAYER.ARM = TOP;
  PLAYER.JACKL = PLAYER.ARML = TOPL;
  PLAYER.JACKD = PLAYER.ARMD = TOPD;
  const naturalBlink = blinkOf(now, 3);
  const sleepKind = (act && (act.kind || actionKind(act, doing && doing.def, doing && doing.th)))
    || poseBlendKind;
  const sleepClose = sleepKind === 'sleep'
    ? (act ? (doing ? smoothstep(0.18, 0.52, doing.t) : 1) : actMix) : 0;
  face.blink = Math.max(naturalBlink, sleepClose);
  saccade(now, 3, face);
  // Holding a bowl beats whatever the pose asked for; otherwise the pose's own grip stands,
  // so a hand can close on a handle as it arrives at one.
  if (act && act.hold) face.grip = 0.9; else delete face.grip;
  const p = Object.assign({}, pose, face);
  // The daypack is the player's travelling silhouette, not sleepwear. Leaving its rigid volume
  // under a horizontal torso propped the sleeper visibly off the mattress (and put an orange box
  // through the spine), so bedding/rest poses temporarily draw the same look without the pack.
  const bodyLook = sleepKind === 'sleep' || sleepKind === 'rest'
    ? { ...PLAYER, bag:null, pack:false } : PLAYER;
  drawFigure(p, P.x, P.z, P.yaw, bodyLook, lod, (shape, torso, wristL, wristR, po) => {
    // A bowl has to stay level however the arm is swinging, so it hangs off a copy of the
    // wrist with the arm's accumulated pitch undone.
    const level = (w, sh, elb) => M.mul(w, M.rotX(-(sh + elb + po.torsoPitch + po.recline)));
    const lvL = level(wristL, po.shL, po.elbL), lvR = level(wristR, po.shR, po.elbR);
    if (act && act.hold && actMix > 0.22)
      holdItem(act.hold, shape, torso, wristL, wristR, lvL, lvR, doing ? doing.t : 0);
    // The bag you were handed stays in your hand between actions — through every room, up and
    // down the stairs — and only lets go when both hands are needed for something else.
    else if (carrying)
      holdItem('waimai', shape, torso, wristL, wristR, lvL, lvR, 1);
    // The shop basket is carried on the other arm, so it is there whatever the right hand is up
    // to — including while that hand is reaching into a shelf.
    if (basketHeld && place === 'shop')
      holdItem('basket', shape, torso, wristL, wristR, lvL, lvR, 1);
    // And the packet itself, in the second half of a shelf reach: picked up, then let go over the
    // basket. Drawn here rather than through `hold` so the basket keeps its own arm.
    if (act && act.type === 'shelf' && doing && doing.t > 0.30 && doing.t < 0.94)
      holdItem('goods', shape, torso, wristL, wristR, lvL, lvR, doing.t);
    if (act && act.kind === 'checkout' && actMix > 0.18)
      holdItem('card', shape, torso, wristL, wristR, lvL, lvR, doing ? doing.t : 1);
  // `P.lift` is the height of the floor you are standing on — a mall deck, a tower deck, the seat
  // of a chair. `P.jy` is how far above that floor the hop has carried you. They add: hop on the
  // fourth floor of the shopping centre and you leave the fourth floor, not the ground. Everything
  // else that reads `P.lift` — reach distances, the gait's climb tracking — is deliberately left
  // alone, so a hop changes neither what you can touch nor whether the legs think they are
  // climbing stairs.
  }, (P.lift || 0) + P.jy);
}

// ---------------------------------------------------------------- daylight
// The clock drives the light. Keys are hours; everything between them is interpolated, so a
// day slides from dawn through a hard midday into a long orange evening and out to night.
// dir points toward the sun, and the window is on the -z wall, so daylight arrives from -z.
// `city` is the haze the skyline out of the window is painted in: it is emissive geometry,
// so nothing else would ever tint it, and cold blue towers under an orange sky look wrong.
const SKYKEYS = [
  { h:0.0,  dir:[-0.10,0.42,-1.0], col:[0.44,0.55,0.86], amt:0.13,
    sky:[0.070,0.092,0.150], gnd:[0.046,0.042,0.050], bg:[0.017,0.021,0.031],
    glass:'#2c3f5e', city:'#43567a', zen:'#070b14', hor:'#241f28' },
  { h:4.6,  dir:[-0.55,0.28,-1.0], col:[0.52,0.55,0.82], amt:0.18,
    sky:[0.090,0.108,0.165], gnd:[0.052,0.046,0.052], bg:[0.021,0.026,0.038],
    glass:'#3b4f6d', city:'#4d6083', zen:'#0f1626', hor:'#3a3444' },
  { h:6.4,  dir:[-0.70,0.20,-1.0], col:[1.00,0.68,0.48], amt:0.72,
    sky:[0.220,0.216,0.260], gnd:[0.130,0.098,0.082], bg:[0.052,0.048,0.058],
    glass:'#9c7f86', city:'#9a8391', zen:'#586b8e', hor:'#dda478' },
  { h:8.2,  dir:[-0.56,0.46,-1.0], col:[1.00,0.88,0.74], amt:1.42,
    sky:[0.310,0.348,0.430], gnd:[0.186,0.140,0.108], bg:[0.030,0.035,0.044],
    glass:'#bcd2e6', city:'#8fa2b6', zen:'#7ea3c7', hor:'#cfd5d0' },
  { h:13.0, dir:[-0.10,0.95,-1.0], col:[1.00,0.96,0.90], amt:1.72,
    sky:[0.350,0.392,0.482], gnd:[0.204,0.152,0.116], bg:[0.031,0.036,0.045],
    glass:'#c8dcee', city:'#93a7ba', zen:'#8db2d7', hor:'#dfe2da' },
  { h:16.6, dir:[ 0.36,0.55,-1.0], col:[1.00,0.90,0.74], amt:1.52,
    sky:[0.336,0.360,0.428], gnd:[0.212,0.156,0.112], bg:[0.033,0.036,0.043],
    glass:'#cbd6e0', city:'#9aa5ac', zen:'#92afcb', hor:'#e1dccb' },
  { h:18.6, dir:[ 0.50,0.30,-1.0], col:[1.00,0.62,0.34], amt:1.02,
    sky:[0.256,0.226,0.238], gnd:[0.196,0.130,0.086], bg:[0.046,0.038,0.040],
    glass:'#d08a54', city:'#b08a72', zen:'#7889ba', hor:'#e2a460' },
  { h:19.9, dir:[ 0.42,0.13,-1.0], col:[0.92,0.46,0.34], amt:0.38,
    sky:[0.150,0.140,0.180], gnd:[0.110,0.076,0.068], bg:[0.033,0.028,0.036],
    glass:'#7c4f5c', city:'#7b6070', zen:'#3a4770', hor:'#8b5b54' },
  { h:21.4, dir:[ 0.30,0.34,-1.0], col:[0.48,0.56,0.86], amt:0.16,
    sky:[0.082,0.100,0.158], gnd:[0.050,0.044,0.052], bg:[0.020,0.024,0.035],
    glass:'#33456a', city:'#4a5c80', zen:'#131b32', hor:'#37323d' },
  { h:24.0, dir:[-0.10,0.42,-1.0], col:[0.44,0.55,0.86], amt:0.13,
    sky:[0.070,0.092,0.150], gnd:[0.046,0.042,0.050], bg:[0.017,0.021,0.031],
    glass:'#2c3f5e', city:'#43567a', zen:'#070b14', hor:'#241f28' },
];
for (const k of SKYKEYS) {
  k.glassRGB = C(k.glass); k.cityRGB = C(k.city);
  k.zenRGB = C(k.zen); k.horRGB = C(k.hor);
}

const mixArr = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const light = { dir: SKYKEYS[4].dir, col: SKYKEYS[4].col, amt: 1.7,
                sky: SKYKEYS[4].sky, gnd: SKYKEYS[4].gnd, bg: SKYKEYS[4].bg,
                glass: SKYKEYS[4].glassRGB, city: SKYKEYS[4].cityRGB,
                skyA: SKYKEYS[4].zenRGB, skyB: SKYKEYS[4].horRGB, day: 1 };

function daylight(mins) {
  const h = (mins / 60) % 24;
  let i = 0;
  while (i < SKYKEYS.length - 2 && SKYKEYS[i + 1].h <= h) i++;
  const a = SKYKEYS[i], b = SKYKEYS[i + 1];
  const raw = (h - a.h) / Math.max(1e-6, b.h - a.h);
  const t = raw * raw * (3 - 2 * raw);          // ease so keyframes do not show as corners
  light.dir = mixArr(a.dir, b.dir, t);
  light.col = mixArr(a.col, b.col, t);
  light.sky = mixArr(a.sky, b.sky, t);
  light.gnd = mixArr(a.gnd, b.gnd, t);
  light.bg = mixArr(a.bg, b.bg, t);
  light.glass = mixArr(a.glassRGB, b.glassRGB, t);
  light.city = mixArr(a.cityRGB, b.cityRGB, t);
  light.skyA = mixArr(a.zenRGB, b.zenRGB, t);
  light.skyB = mixArr(a.horRGB, b.horRGB, t);
  light.amt = a.amt + (b.amt - a.amt) * t;
  light.day = clamp((light.amt - 0.14) / 1.3, 0, 1);   // how much daylight is in the room
  return light;
}

// ---------------------------------------------------------------- needs
// Five needs drain with the clock. Time runs at one in-game minute per real second, so
// these rates are per in-game hour: a day of neglect empties everything.
const NEEDS = [
  { k:'food',   hz:'吃饭', py:'chīfàn',    en:'food',   rate:6.0, warn:'我饿了。',       wtr:"I'm hungry." },
  { k:'toilet', hz:'厕所', py:'cèsuǒ',     en:'toilet', rate:8.0, warn:'我要上厕所。',   wtr:'I need the toilet.' },
  { k:'rest',   hz:'睡觉', py:'shuìjiào',  en:'rest',   rate:4.5, warn:'我很累，我想睡觉。', wtr:"I'm tired." },
  { k:'clean',  hz:'干净', py:'gānjìng',   en:'clean',  rate:3.5, warn:'我要洗澡。',     wtr:'I need a shower.' },
  { k:'mood',   hz:'心情', py:'xīnqíng',   en:'mood',   rate:3.0, warn:'我心情不好。',   wtr:"I'm in a bad mood." },
];
const needs = { food: 62, toilet: 58, rest: 71, clean: 76, mood: 68 };
// One hospital visit, carried across its four scenes.  This is deliberately a care-flow state,
// not a sixth survival meter: the rest of the game models feeling unwell through rest/mood, and a
// hospital should complete that loop rather than bolt a second needs system onto the HUD.
let hospitalVisit = { day:0, case:null, number:null, stage:0, tested:false,
                      treated:false, dispensed:false, emergency:false };
const warned = {};

// Build the panel from the table so the markup cannot drift out of step with the model.
const needHost = $('#needs');
for (const n of NEEDS) {
  const d = document.createElement('div');
  d.className = 'need'; d.dataset.k = n.k;
  d.innerHTML = `<span class="nz">${n.hz}</span><span class="tk"><i></i></span>`;
  d.title = `${n.hz} ${n.py} — ${n.en}`;
  needHost.appendChild(d);
  n.el = d; n.fill = d.querySelector('i');
}

function decay(mins) {
  const hours = mins / 60;
  // A bad night is not a one-off number off the `rest` meter in the morning, it is a bad afternoon.
  // `restedMul` is 1.0 after a full night and 1.6 after four hours, and it follows you until the
  // next time you sleep — which is the only thing that makes an alarm, or a late one, cost anything.
  const tired = HomeLife.restedMul();
  for (const n of NEEDS) {
    let r = n.rate;
    if (n.k === 'rest' && P.speed > 1.6) r *= 1.7;          // running tires you out
    if (n.k === 'mood' && (needs.clean < 20 || needs.food < 20)) r *= 2.0;
    if (n.k === 'rest' || n.k === 'mood') r *= tired;
    needs[n.k] = clamp(needs[n.k] - r * hours, 0, 100);
  }
  // And the state of the room you are standing in, not only the state of the person. `decay`
  // already doubled the mood rate on a filthy player; the flat's own mess was in that sum nowhere.
  if (place === 'home' && World.level && World.level() === 2)
    needs.mood = clamp(needs.mood + HomeLife.messMood(flat) * hours, 0, 100);
  // Ignore the toilet long enough and it resolves itself, expensively.
  if (needs.toilet <= 0 && !doing) {
    needs.toilet = 65;
    needs.clean = Math.min(needs.clean, 12);
    needs.mood = clamp(needs.mood - 14, 0, 100);
    say('太晚了……我需要洗澡。', 'Too late. I need a shower.');
  }
  for (const n of NEEDS) {
    if (needs[n.k] < 22 && !warned[n.k]) { warned[n.k] = 1; say(n.warn, n.wtr); }
    if (needs[n.k] > 45) warned[n.k] = 0;
  }
}

// One place advances time, so an action that burns three hours also burns three hours of needs.
function advanceTime(mins) {
  if (mins <= 0) return;
  const dayBefore = day;
  minutes += mins;
  while (minutes >= 1440) {
    const ended = day;
    minutes -= 1440; day++;
    // The day that just ended, on the record. A weekday you neither clocked in on nor asked off
    // is an absence, and until now not turning up to work cost precisely nothing — you could
    // sleep through a fortnight and the whiteboard would greet you exactly as warmly.
    const gone = Career.rollDay(ended);
    if (gone)
      logDiary(`昨天没去上班，第${gone.missed}次了。`,
               `Missed work yesterday — ${gone.missed} ${gone.missed === 1 ? 'time' : 'times'} now.`,
               'work');
    // Rent, every morning, whether you were awake for it or slept through it. Cash is used first
    // for backwards compatibility, then the bank account covers the shortfall. Otherwise moving
    // every note into the new account at 23:59 would make rent disappear without reducing wealth.
    const cashPaid = Math.min(money, RENT);
    money -= cashPaid;
    const accountPaid = bankPayRent(RENT-cashPaid);
    const paid = cashPaid+accountPaid;
    say(paid < RENT ? `房租${RENT}块，只交了${Math.round(paid)}块。` : `房租${RENT}块，交了。`, paid < RENT
      ? `Rent is ${RENT} kuai. You could only find ${Math.round(paid)}.`
      : `Rent, ${RENT} kuai. Paid.`);
    // The diary opens every day with the same two facts — what day it is and what the sky is
    // doing — because that is how a real one opens, and because it puts the season's word and the
    // weather's word in front of you once a day whether or not you went outside.
    const w = Weather.tick(0, minutes, day);
    logDiary(`今天是第${day}天，${w.season.hz}，${w.hz}。`,
             `Day ${day}. ${w.season.en}, ${w.en}.`, 'dawn');
    // And, on the mornings there is one, what the weather is doing to the trains. In the diary
    // rather than only on the map because the diary is the one place the player looks back at:
    // 延误 turning up there three times in a fortnight is how a word gets learned by having
    // mattered, which is the whole argument for not teaching it on a flashcard.
    const dis = Disrupt.metroNotice(day, 8 * 60);
    if (dis) logDiary(dis.hz, dis.en, 'metro');
    if (paid >= RENT) logDiary(`交了房租，${RENT}块。`, `Paid the rent, ${RENT} kuai.`, 'rent');
    // 坏了. The fish you bought on Monday and did not cook is not in the fridge on Thursday, and
    // being told is the difference between a simulation and a bug — a fridge that silently
    // deletes twenty kuai of shopping is theft as far as the player is concerned, however
    // correctly it is modelling a fridge. It is also the cheapest lesson in the game about buying
    // for tonight instead of for the week.
    // 报修 and the visit it books. Two separate things happen here and the split is the point:
    // `rollDay` is the landlord noticing a fault nobody reported, and `due` is whoever was coming
    // today turning up. A visit you were in for is a repair; one that came while you were out
    // slides a day, which is what `missed` does. Nothing here clears a fault on its own.
    for (const f of Faults.rollDay(ended))
      logDiary(`房东说${f.hz}该修了，明天来。`, `The landlord noticed ${f.en}; someone comes tomorrow.`,
               'home');
    for (const f of Faults.due(ended)) {
      if (homeDayIn === ended) {
        const done = Faults.fix(f.key);
        if (done) { say(done.fixed[0], done.fixed[1]); logDiary(done.fixed[0], done.fixed[1], 'home'); }
      } else {
        Faults.missed(f.key, ended);
        logDiary(`${f.hz}没修成，我不在家。`, `Nobody was in for ${f.en} — they will come again.`,
                 'home');
      }
    }
    const off = Pantry.spoil(day);
    if (off.length) {
      const what = off.map(o => `${o.n}${o.unit}${o.hz}`).join('、');
      say(`${off.map(o => o.hz).join('、')}坏了。`,
          `Gone off: ${off.map(o => dictOf(o.hz).en).join(', ')}.`);
      logDiary(`${what}坏了，扔了。`,
               `Threw out ${off.map(o => dictOf(o.hz).en).join(', ')} — gone off.`, 'shop');
    }
    // ---- the flat's own midnight. Rent is weather — it leaves every morning above and always has.
    // 物业费, 水费, 电费 and 燃气费 are decisions: they arrive together every ten days, they land in
    // the 信箱 rather than on the player, and they are due five days later. That window is the whole
    // point — an outgoing you cannot be late paying is not something a player can fall behind on.
    // The ring on the living-room wall calendar. js/home-living.js publishes `dateReg`; without a
    // caller the ring was correct once, at build time, and then stood still for the whole game.
    if (typeof FlatFit !== 'undefined' && FlatFit['living'] && FlatFit['living'].dateReg)
      FlatFit['living'].dateReg(day);
    // And the 已过期 stamps on F4's notice board, which were correct once, at build time.
    if (typeof HomeF4 !== 'undefined' && HomeF4.setDay) HomeF4.setDay(day);
    const home = HomeLife.rollDay(ended, flat);
    if (home.bills) {
      const owed = home.bills.reduce((t, b) => t + b.yuan, 0);
      logDiary(`这个月的水电费来了，一共${owed}块，${HomeLife.GRACE}天内交。`,
               `The utility bills came — ${owed} kuai altogether, due within ${HomeLife.GRACE} days.`,
               'rent');
    }
    for (const b of home.over)
      logDiary(`${b.hz}过期没交，欠着${b.yuan}块。`,
               `${b.en} went past its date — ${b.yuan} kuai in arrears.`, 'rent');
    if (home.over.length && !HomeLife.hotWater())
      say('欠费了，热水器不烧水了。', 'In arrears — the water heater has stopped heating.');
  }
  ensureDailyGoals();
  if (day !== dayBefore) renderDailyGoals(true);
  decay(mins);
  // The flat runs down on its own — the plant, the bin, the dust, the smell, the machine and the
  // rack. All of that used to be two hard-coded divisions right here, which is the clock doing the
  // flat's job and the reason nothing could be added to the flat without editing the one function
  // every scene in the game advances time through. The rules live in js/home-life.js now; this is
  // still the only place that calls them, so an hour of anything is still an hour of everything.
  HomeLife.tick(mins, flat, day, minutes);
}

function updateNeeds() {
  for (const n of NEEDS) {
    const v = needs[n.k];
    n.fill.style.width = v.toFixed(1) + '%';
    n.el.classList.toggle('low', v < 40 && v >= 18);
    n.el.classList.toggle('crit', v < 18);
  }
}

// ---------------------------------------------------------------- 今日目标 daily goals
// One small routine at home, one reason to cross the city, and one social or leisure beat. The
// combination is deterministic for each day, so reloading never rerolls a nearly finished plan.
const DAILY_REWARD = 35;
const DAILY_HOME = [
  { type:'use', key:'植物', zh:'给植物浇水', en:'water the plant' },
  { type:'use', key:'厨房', zh:'做一顿饭', en:'cook a meal at home' },
  { type:'use', key:'淋浴', zh:'洗个澡', en:'take a shower' },
  { type:'use', key:'书架', zh:'读一会儿书', en:'read for a while' },
  { type:'use', key:'垃圾桶', zh:'把垃圾倒了', en:'take out the rubbish' },
];
const DAILY_CITY = [
  { type:'visit', key:'shop', zh:'去一趟超市', en:'visit the supermarket' },
  { type:'visit', key:'park', zh:'去公园走走', en:'take a walk in the park' },
  { type:'visit', key:'diner', zh:'去餐馆看看', en:'stop by the noodle shop' },
  { type:'visit', key:'campus', zh:'看看大学城', en:'visit the university district' },
  { type:'visit', key:'zoo', zh:'去动物园', en:'visit the zoo' },
  { type:'visit', key:'rail', zh:'到火车站看看', en:'visit the railway station' },
  { type:'visit', key:'airport', zh:'去一趟机场', en:'visit the airport' },
];
// `topic` is one of the twelve closed topics in js/vocab.js, and it is what lets the review queue
// choose the day's third beat instead of the calendar choosing it. A row without one is never
// reachable by the queue and only ever comes up in the plain rotation.
const DAILY_EXTRA = [
  { type:'talk', key:'*', zh:'跟一个人说话', en:'have a conversation in Chinese', topic:'social' },
  { type:'travel', key:'*', zh:'坐一次地铁', en:'take one subway trip', topic:'transport' },
  { type:'use', key:'电脑', zh:'工作一次', en:'finish a work session', topic:'work' },
  { type:'use', key:'电视', zh:'看一会儿电视', en:'watch Chinese television', topic:'home' },
  { type:'use', key:'茶几', zh:'喝一杯茶', en:'have a cup of tea', topic:'food' },
];

// ---- 今天该出什么事. The second of the two systemic gaps this project has carried: what the day
// asks of you is decided partly by what you owe the review queue, so revision arrives as an errand
// rather than as a flashcard.
//
// Three questions, all of them reads, none of them an event that fires at anybody:
//   · `Disrupt.hotelBias(day)` — whether today produces a hotel-shaped errand, and which of the
//     three it is. 0.18 with nothing due, 0.62 with the hotel word list overdue.
//   · `Vocab.dueTopics()` — what the day could be *about*, heaviest topic first.
//   · `Disrupt.serviceDue()` — how much counter language is waiting, which is the one thing that
//     is better practised by talking to somebody than by doing anything on your own.
//
// **Rolled once, when the day turns, and stored.** js/disrupt.js:280 says outright that
// `hotelBias` is deliberately not memoised because the review queue is a fact about the player and
// not about the date — which is exactly why the answer has to be frozen here. Read live, an
// afternoon study session would rewrite the errand the morning already handed out, and a goal the
// player had already ticked would disappear off the list. Same trap js/stay.js's `pick` avoids by
// storing the room's problem at check-in, arriving from the other side.
//
// Every one of these is optional. With no js/disrupt.js, no js/vocab.js, or nothing due, this
// returns null and the plan below is exactly the rotation it has always been — a shift, never an
// override, which is the rule the rest of the codebase follows.
function stageDay(forDay) {
  const out = { errand:null, extra:null };
  let bias = null;
  try {
    if (typeof Disrupt !== 'undefined' && Disrupt.hotelBias) bias = Disrupt.hotelBias(forDay);
  } catch (_) { bias = null; }
  if (bias && bias.on && bias.event)
    out.errand = { key:bias.event.key, hz:bias.event.hz, en:bias.event.en,
                   due:+(bias.due || 0).toFixed(3) };
  // The third beat. Counter language first, because 结账/押金/退房 are said to a person and cannot
  // honestly be revised alone; otherwise the heaviest due topic picks the beat it belongs to.
  let service = 0, topics = [];
  try { if (typeof Disrupt !== 'undefined' && Disrupt.serviceDue) service = Disrupt.serviceDue(); }
  catch (_) { service = 0; }
  try { if (typeof Vocab !== 'undefined' && Vocab.dueTopics) topics = Vocab.dueTopics(); }
  catch (_) { topics = []; }
  // Stored as a TOPIC and never as a `key`: two DAILY_EXTRA rows share the key '*' (the
  // conversation and the subway trip), so a key is not an identity here and looking one up finds
  // whichever row happens to be first. A due transport queue picking the talk row is the bug that
  // is; the topic is unique per row and is what the queue actually chose.
  if (service >= .5) out.extra = { topic:'service' };
  else for (const t of topics) {
    if (DAILY_EXTRA.some(g => g.topic === t.topic)) { out.extra = { topic:t.topic }; break; }
  }
  return out;
}

function dailyPlan(forDay = day) {
  const n = Math.max(0, (forDay | 0) - 1);
  const staged = daily && daily.day === (forDay | 0) ? daily : null;
  // A staged hotel errand replaces the day's city goal rather than being added to it: three beats
  // is the shape of this list and a fourth would make a due word cost the player more of the day
  // than an undue one. The hotel is a real place on the travel list with a real cost in minutes,
  // so this is an errand across the city exactly like the row it stands in for.
  const city = staged && staged.errand
    ? { type:'visit', key:'hotel', zh:`去酒店：${staged.errand.hz}`,
        en:`the hotel — ${staged.errand.en}` }
    : DAILY_CITY[(n * 3 + 2) % DAILY_CITY.length];
  // 'service' is not one of the twelve topics — it is js/disrupt.js's four-topic measure of
  // counter language — so it names the conversation row directly. Everything else is a real topic
  // and finds its own row.
  const extra = (staged && staged.extra &&
                 (staged.extra.topic === 'service'
                   ? DAILY_EXTRA.find(g => g.type === 'talk')
                   : DAILY_EXTRA.find(g => g.topic === staged.extra.topic)))
    || DAILY_EXTRA[(n * 7) % DAILY_EXTRA.length];
  return [DAILY_HOME[(n + 1) % DAILY_HOME.length], city, extra]
    .map((g, i) => ({ ...g, id:`${i}:${g.type}:${g.key}` }));
}

function newDailyState(forDay = day) {
  const s = stageDay(forDay | 0);
  return { day:forDay | 0, done:{}, rewarded:false, errand:s.errand, extra:s.extra };
}

let daily = newDailyState(day), dailySig = '';

function ensureDailyGoals() {
  if (!daily || daily.day !== (day | 0)) {
    daily = newDailyState(day);
    dailySig = '';
  }
  return dailyPlan(day);
}

function renderDailyGoals(pop = false) {
  const host = $('#goals'), list = $('#goalList');
  if (!host || !list) return;
  const plan = ensureDailyGoals();
  const count = plan.reduce((n, g) => n + (daily.done[g.id] ? 1 : 0), 0);
  const sig = `${day}|${count}|${plan.map(g => daily.done[g.id] ? 1 : 0).join('')}`;
  if (sig !== dailySig) {
    dailySig = sig;
    list.innerHTML = plan.map(g => `<div class="goal${daily.done[g.id] ? ' done' : ''}">`
      + `<span class="mark">${daily.done[g.id] ? '✓' : ''}</span>`
      + `<span class="zh">${g.zh}</span><span class="en">${g.en}</span></div>`).join('');
    host.querySelector('.count').textContent = `${count} / ${plan.length}`;
    host.querySelector('.track i').style.width = `${count / plan.length * 100}%`;
    host.querySelector('.reward').textContent = daily.rewarded ? `已得 ¥${DAILY_REWARD}` : `奖励 ¥${DAILY_REWARD}`;
    host.classList.toggle('all', count === plan.length);
  }
  if (pop) {
    host.classList.remove('pop');
    void host.offsetWidth;
    host.classList.add('pop');
  }
}

function goalEvent(type, key) {
  if (!started) return false;
  const plan = ensureDailyGoals();
  let changed = false;
  for (const g of plan) {
    // 喝一杯茶 can happen at the tea table at home or from the free urn in the restaurant.
    // The goal predates the restaurant interaction and used 茶几 as a location instead of 茶 as
    // the act, which made a cup poured here inexplicably not count.
    const sameTea = type === 'use' && g.key === '茶几' && key === '茶';
    if (!daily.done[g.id] && g.type === type && (g.key === '*' || g.key === key || sameTea)) {
      daily.done[g.id] = true;
      changed = true;
    }
  }
  if (!changed) return false;
  const complete = plan.every(g => daily.done[g.id]);
  if (complete && !daily.rewarded) {
    daily.rewarded = true;
    money += DAILY_REWARD;
    needs.mood = clamp(needs.mood + 10, 0, 100);
    logDiary(`完成了今天的三个目标，奖励${DAILY_REWARD}块。`,
             `Completed all three daily goals. Reward: ${DAILY_REWARD} kuai.`, 'goals');
    setTimeout(() => toast(`今日目标完成 · <b>+¥${DAILY_REWARD}</b> ` +
      '<span class="dim">daily routine complete · 心情 +10</span>'), 180);
  }
  renderDailyGoals(true);
  saveGame();
  return true;
}

// A line of Chinese with pinyin over anything you have not mastered, plus the English.
function say(zh, tr) {
  toast(`${Vocab.sentenceHTML(zh)} <span class="dim">&nbsp;${tr}</span>`);
}

// ---------------------------------------------------------------- shopping and ordering
// Two small pieces of state are the difference between a shop and a vending machine.
//
// `basket` is what you have picked up in the 超市 and not paid for yet. Taking something off a
// shelf costs nothing; the money moves once, at the till, for the whole basket. That is how a
// shop works, it is the only way the price tickets on the shelves mean anything, and it gives
// the cashier something to do — she will not let you out of the door with an unpaid basket.
//
// `order` is what you have ordered in the 餐馆, and you pay for it when you order. So the bowl
// waiting on the table is already yours and eating it is free — which is why you cannot eat in
// there without ordering first, and why the waitress is now load-bearing rather than scenery.
//
// Both lists are read from the rooms themselves: Shop.GOODS is what the shelf tickets are
// printed from and Diner.MENU is what the board on the back wall says.
const basket = [];
// Whether you are actually carrying one of the red baskets from the stack by the door. The basket
// used to be a number in a variable: you could fill it from across the room with nothing in your
// hands. Now you fetch one, it hangs off your left arm wherever you go in the shop, and every
// packet you take is put into it where you can see it happen.
let basketHeld = false;
// What you have ordered and how far along it is. Three states, and `ready` is the only one in
// which there is anything on the table to eat:
//   cooking — the kitchen has it; `at` is the absolute minute it comes off the range
//   coming  — it is up on the pass and the waitress is carrying it across the room
//   ready   — she has put it down in front of you
let order = null;                 // { dish, state, at }
let chosen = '牛肉面';            // the dish you have settled on, by name

// Everything the 超市 sells, flattened: the three fixtures that are a product in themselves, plus
// everything on the two that are furniture rather than goods. The till, the two shelf panels and
// the errand runner all price off this one list, so a thing cannot cost one number on the shelf
// and another down the phone, or be buyable in the room and missing from the app.
//
// A function and not a const, because Shop is a Lazy promise and reading a property off one is
// what builds it. Evaluated at the top of this file it would build the supermarket during boot.
const shopItems = () => [
  ...Shop.GOODS.filter(g => !g.from),
  ...Object.keys(Shop.SHELF).reduce((a, k) => a.concat(Shop.SHELF[k]), []),
];
const goodsFor = hz => shopItems().find(g => g.hz === hz) || null;
const basketTotal = () => basket.reduce((s, g) => s + g.price, 0);
// 三 → 三份, and a bare count of things in the basket. Chinese counts everything with a
// measure word and 件 is the one for shop goods.
const basketSay = () => basket.map(g => g.hz).join('、');
const dishByHz = hz => Diner.DISHES.find(d => d.hz === hz) || Diner.DISHES[0];
const menuDish = () => dishByHz(chosen);
// One monotonic clock for the kitchen. `minutes` wraps at midnight, so an order placed at 23:58
// that takes six minutes would otherwise be waiting for a time that never comes round again.
const clockNow = () => day * 1440 + minutes;

// Order a dish: takes the money, tells the kitchen, and starts the clock on it. Returns a
// [zh, tr] reason it could not, or null if it went through.
function placeOrder(hz) {
  const d = dishByHz(hz);
  if (order)
    return [`${order.dish.hz}马上就来。`, `Your ${order.dish.en} is already on its way.`];
  if (money < d.price)
    return [`不够，我只有${Math.floor(money)}块。`,
            `Not enough — I only have ${Math.floor(money)} kuai.`];
  money -= d.price;
  chosen = hz;
  order = { dish: d, state: 'cooking', at: clockNow() + Math.max(1, d.cook) };
  TrainAudio.dinerCue('order');
  say(`${d.hz}一份，${d.price}块，稍等。`, `One ${d.en}, ${d.price} kuai. Won't be a moment.`);
  Vocab.sentenceHTML(d.hz);
  updateHud();
  return null;
}

// The kitchen and the floor. An order cooks against the clock; when it comes up the waitress
// leaves the counter, collects it from the pass, walks it round the end of the counter to your
// table and puts it down — and only once she has put it down is there anything to eat.
//
// If she has gone home for the night, or you have wandered off to the shop while it cooks, the
// food is simply waiting on the table when you get back. Better than an order that can never
// be delivered because the person who delivers it is not in the room.
function tickService() {
  if (!order) return;
  const w = NPCS.find(n => n.hz === '服务员');
  const canServe = place === 'diner' && w && w.awake;
  if (order.state === 'cooking' && clockNow() >= order.at) {
    if (canServe && !w.errand) {
      const R = Diner.SERVE_ROUTE, last = R.length - 1;
      // Out with it, and back the same way. Everything from the pickup onward is carried.
      w.errand = R.map((at, i) => ({
        at, carry: i > 0, speed: 1.35,
        face: i === last ? Diner.SERVE_FACE : undefined,
        act: i === 0 ? 'work' : 'vend',
        dwell: i === 0 ? 1.0 : i === last ? 1.3 : 0,
        done: i === last ? deliver : null,
      })).concat(R.slice(0, last).reverse().map(at => ({ at, speed: 1.2, dwell: 0 })));
      order.state = 'coming';
    } else if (!canServe) order.state = 'ready';
  } else if (order.state === 'coming' && !canServe) {
    if (w) w.errand = null;
    order.state = 'ready';
  }
}
function deliver() {
  if (!order) return;
  order.state = 'ready';
  TrainAudio.dinerCue('serve');
  say(`您的${order.dish.hz}，请慢用。`, `Your ${order.dish.en}. Enjoy your meal.`);
  updateHud();
}

// ---------------------------------------------------------------- 手机 the phone in your pocket
// The one thing in this game you can do without walking anywhere, and the way a great many
// people in this city actually eat. You order off the two lists the rooms are already built
// from — the restaurant's board and the shop's shelves — and you pay nothing at the time.
// Somebody rides it across the city, carries it up your stairs and knocks, and the money moves
// at the door, in cash. That is the whole reason he comes up rather than leaving it downstairs:
// answering your own door and paying a stranger is a short conversation in Chinese, and the
// conversations are the game. Everything else in here is bookkeeping around that one moment.
//
// One delivery at a time, through three states:
//   coming — on its way; `at` is the absolute minute he reaches your landing
//   knock  — he is outside your door, and the door's verb is 开门 until you answer it
//   door   — the door is open and he is standing in it, waiting to be paid
const WAIMAI_FEE = 4;             // 配送费 on a meal off the 餐馆's board
const PAOTUI_FEE = 7;             // an errand runner does your shopping as well, so he costs more
const RIDER_WAIT = 180;           // in-game minutes he will stand on your landing before leaving
let delivery = null;              // { kind, item, fee, total, at, gone, state }
const courier = NPCS.find(n => n.courier);

// What is in your hand, and where you have put it down. A delivery does not teleport into the
// fridge when you pay for it: he hands you a 袋子, and from then on it is an object in the flat
// like any other. You can walk around with it, set it on the desk or the coffee table or the
// kitchen counter and come back for it, carry it out to the hutong and back — and it only stops
// being a bag when you put it away in the fridge, where it turns into the meals you eat from.
let carrying = null;              // { kind, item } while the bag is in your hand
// The small flat things you keep on you rather than carry: the entry card for your own block, and
// whatever else a `need:` on a USE row asks for. A tenant has their own card from day one — gating
// a player's own front door on an item they have no way to obtain is a locked-out player, not a
// puzzle — so this exists to make losing one *possible*, not to make getting in a quest.
const POCKET = new Set(['门禁卡']);
const held = hz => POCKET.has(hz);
let placed = null;                // { kind, item, spot } once you have set it down somewhere
const bagOut = () => !!(carrying || placed);

// 跑腿 is a person doing your shopping for you, so what you can ask for has to be a product with
// a name. 货架 and 冰柜 are fixtures you take things off inside the shop, not things anybody could
// say down a phone — `shopItems` drops them, and what is left is exactly the list of things you
// could name to a stranger. He will fetch anything the shop sells, which is what makes him worth
// seven kuai on a morning you cannot spare the forty minutes.
const RUNNER = () => shopItems().map(g => g.hz);
const dictOf = hz => Vocab.get(hz) || { py:'', en:hz };
const enOf = it => it.en || dictOf(it.hz).en;
const deliveryEta = () => delivery ? Math.max(0, Math.ceil(delivery.at - clockNow())) : 0;

// Place an order. Nothing leaves your wallet now — 货到付款, you pay the rider — but you cannot
// order what you could not pay for when he gets here, which is the check the app makes too.
function orderIn(kind, hz) {
  if (delivery)
    return [`${delivery.item.hz}还在路上呢。`,
            `Your ${enOf(delivery.item)} is still on its way.`];
  // One bag at a time, because there is one pair of hands. Until the last one is in the fridge
  // the app has nowhere to put another.
  if (bagOut())
    return ['上一份还没收好呢。',
            'The last delivery is still in its bag. Put it away in the 冰箱 first.'];
  const food = kind === 'waimai';
  const item = food ? dishByHz(hz) : goodsFor(hz);
  if (!item) return ['这个订不了。', 'The app does not have that.'];
  const fee = food ? WAIMAI_FEE : PAOTUI_FEE;
  const total = item.price + fee;
  if (money < total)
    return [`不够，我只有${Math.floor(money)}块。`,
            `Not enough — you have ${Math.floor(money)} kuai and it is ${total} at the door.`];
  const mins = food ? 28 : 45;
  delivery = { kind, item, fee, total, at: clockNow() + mins, gone: 0, rap: 0, state:'coming' };
  say(`${item.hz}下单了，${mins}分钟送到。`,
      `Ordered: ${enOf(item)}. ¥${total} with the fee, about ${mins} minutes.`);
  updateHud();
  return null;
}

// The ride across the city, the knock, and the rider's patience — none of which needs you to be
// standing in the flat. Order from the office and it is waiting for you when you get home.
function tickDelivery() {
  if (!delivery) return;
  if (delivery.state === 'coming') {
    if (clockNow() < delivery.at) return;
    delivery.state = 'knock';
    delivery.gone = clockNow() + RIDER_WAIT;
    if (place === 'home' && World.level() === 2) knock();
    return;
  }
  // He will not stand out there all day. Nothing was paid, so nothing is lost except the food
  // you did not get — and if you are in the room, he says so on the way out.
  if (clockNow() >= delivery.gone) {
    // Missed him — but a rider does not take your dinner home. It goes into the 快递柜 in the lobby
    // with a 取件码, which is what happens in every block in the city and is the only thing that
    // makes the lockers downstairs anything other than furniture. `HomeLife` owns the parcel list,
    // so the cabinet, the corridor and the door are all reading one object.
    const p = HomeLife.addParcel(delivery.item.hz || delivery.item, delivery.item.en || '', day, 'locker');
    if (World.setLocker) World.setLocker(7, true);
    // Item 257. 货到付款 meant a missed rider cost nothing at all, so there was no reason to be
    // home — the parcel went in the locker and you collected it later, none the worse. A 外卖
    // order is hot food, and hot food in a metal box for three hours is 超时: you still get it,
    // it is still yours, and it is cold. That is the cost, and it is only the food's.
    const missedDelivery = delivery.kind === 'waimai' ? '超时' : null;
    if (missedDelivery) {
      needs.mood = clamp(needs.mood - 6, 0, 100);
      say('等不到人，放快递柜了，饭超时了，凉透了。',
          `No answer. It went into the parcel locker — 超时, and it will be stone cold.`);
      toast(`快递柜 · <span class="dim">取件码 ${p.code} — 超时, the food has gone cold</span>`);
    } else {
      say(`等不到人，放快递柜了，取件码${p.code}。`,
          `No answer. It went into the parcel locker downstairs — code ${p.code}.`);
      toast(`快递柜 · <span class="dim">取件码 ${p.code}</span>`);
    }
    delivery = null;
    courier.here = false;
    updateHud();
    return;
  }
  // Anywhere in the building, not only inside the flat. Gated to deck 2 the rider could not find
  // you standing in your own lobby waiting for him, which is the one place a person waiting for a
  // delivery actually stands. `place === 'home'` is the whole block, lobby and landings included.
  if (delivery.state === 'knock' && place === 'home' &&
      clockNow() >= delivery.rap) knock();
}

function knock() {
  delivery.rap = clockNow() + 25;
  say('咚咚咚——有人敲门。', 'A knock at the door. Someone is out on the landing.');
}

// Open the door to him. Called when the 开门 action finishes, and all it does is put him in the
// doorway; the fixture tick keeps the door itself open for as long as he is standing there.
function answerDoor() {
  if (!delivery || delivery.state !== 'knock' || place !== 'home' || World.level() !== 2) return;
  delivery.state = 'door';
  courier.here = true;
  courier.x = DOOR_AT[0]; courier.z = DOOR_AT[1];
  courier.yaw = Math.PI;
  courier.ground = 0;
}

// Paid for and handed over — into your hand, not into the cupboard. What you now have is a bag,
// and what is in it stays in it until you put it away.
function takeDelivery() {
  if (!delivery) return;
  carrying = { kind: delivery.kind, item: delivery.item };
  placed = null;
  World.setBag(-1);
  toast(`拿着袋子 · <span class="dim">${delivery.item.hz} in your hand — ` +
        `put it in the 冰箱, or set it down somewhere</span>`);
  // Three nights running and the third one tastes of the first two. The delivery loop worked end
  // to end and there was nothing in it that made cooking the better choice over a week, which is
  // the whole tension the fridge was rebuilt to have.
  if (delivery.kind === 'waimai') {
    const t = HomeLife.takeaway(day);
    needs.mood = clamp(needs.mood + t.mood, 0, 100);
    if (t.run >= 3) say('又是外卖……有点儿腻了。', 'Takeaway again. You are sick of it.');
  }
  delivery = null;
  courier.here = false;
}

// Set it down on a surface. The bag, its pick box and its label all move together, so what you
// come back to is the bag where you left it rather than a word hanging over an empty desk.
function putBag(i) {
  if (!carrying) return;
  placed = { ...carrying, spot: i };
  carrying = null;
  World.setBag(i);
}

function pickBag() {
  if (!placed || carrying) return;
  carrying = { kind: placed.kind, item: placed.item };
  placed = null;
  World.setBag(-1);
}

// Into the fridge, where a bag of food stops being a bag of food and becomes meals you can eat.
// Anything that would not keep does what it does to you on the way in, exactly as it would have
// had you carried it home from the shop yourself.
function stowBag() {
  const b = carrying;
  if (!b) return;
  const it = b.item;
  // A meal off the 餐馆's board is not an ingredient. Put a hot bowl of 牛肉面 in the fridge and
  // what is in there afterwards is 一份菜 — leftovers, still worth eating, worth nothing at all
  // in two days. Shopping the runner did for you is the product itself, one unit of it.
  const put = b.kind === 'waimai'
    ? stow('菜')
    : stow(it.hz);
  carrying = null;
  placed = null;
  World.setBag(-1);
  if (!put) { toast(`收好了 · <span class="dim">${it.hz} away</span>`); return; }
  toast(`收好了 · <span class="dim">${it.hz} away · ${stockOf()} 份 in the fridge</span>`);
}

// ---------------------------------------------------------------- 日记 the diary
//
// Everything that happens in this game happens once and then is gone: a line said at a doorway, a
// train that came in, the first morning it snowed. The notebook remembers the *words*, which is
// the point of the game, but nothing remembered the life they came out of — and a word you met at
// a ticket window three days ago is much easier to hold on to if you can find the ticket window
// again.
//
// So this is a log, and it is deliberately written in the language: each entry is a short Chinese
// sentence about something you did. Reading it goes through `Vocab.sentenceHTML`, which brushes
// every word in it on the way past — so opening the diary is revision that does not feel like
// revision, and the sentences are ones you have a reason to care about because they are yours.
//
// Capped, because this runs in localStorage next to the save and a life is long. The cap is by
// entry rather than by day: a busy day writes a lot and a quiet one writes almost nothing, and
// dropping the oldest is the only rule that behaves sensibly under both.
const DIARY_KEY = 'bjlife.diary.v1', DIARY_MAX = 160;
let diary = [];
try { diary = JSON.parse(localStorage.getItem(DIARY_KEY)) || []; } catch (_) { diary = []; }
if (!Array.isArray(diary)) diary = [];

// `tag` is what the entry is about, and it is what stops the diary filling up with the same line
// forty times: an entry with a tag replaces nothing but is refused if the same tag was already
// written today. Untagged entries always go in.
function logDiary(zh, en, tag) {
  if (!started) return;
  if (tag && diary.some(d => d.day === day && d.tag === tag)) return;
  diary.push({ day, min: Math.floor(minutes), zh, en, tag: tag || '' });
  if (diary.length > DIARY_MAX) diary.splice(0, diary.length - DIARY_MAX);
  try { localStorage.setItem(DIARY_KEY, JSON.stringify(diary)); } catch (_) { /* full — not fatal */ }
}

function openDiary() {
  if (!diary.length) {
    Pick.show({
      title: '日记', sub: 'Your diary — nothing in it yet',
      rows: [{ hz:'返回', py:'fǎnhuí', en:'back to the phone', back:true },
             { hz:'空的', py:'kōng de', en:'go and live a bit first', off:true }],
      onPick(r) { if (r.back) openPhone(); return false; },
    });
    return;
  }
  // Newest day first, because the day you want to reread is nearly always the one that just
  // happened — but within a day, oldest first, because a day is a story and a story read
  // backwards is a list. Getting this wrong put the rent above the sunrise on every page.
  const days = [];
  for (const d of diary) {
    if (!days.length || days[days.length - 1][0].day !== d.day) days.push([d]);
    else days[days.length - 1].push(d);
  }
  days.reverse();
  const rows = [{ hz:'返回', py:'fǎnhuí', en:'back to the phone', back:true }];
  for (const group of days) {
    rows.push({ sec:`第 ${group[0].day} 天`, en:`day ${group[0].day}` });
    for (const d of group) rows.push({
      // The sentence with its ruby, which is what does the brushing. Every word in every entry
      // gets a little exposure every time the diary is opened, which is exactly the right weight
      // for something you are rereading rather than being tested on.
      hz: Vocab.sentenceHTML(d.zh),
      py: '', en: d.en,
      right: `${String(Math.floor(d.min / 60)).padStart(2, '0')}:${String(d.min % 60).padStart(2, '0')}`,
      entry: d,
    });
  }
  Pick.show({
    title: '日记',
    sub: `${diary.length} entries — reading them brushes the words`,
    rows,
    onPick(r) {
      if (r.back) { openPhone(); return false; }
      // Picking a line opens the first word in it you have not mastered, which turns the diary
      // into a way *into* the notebook rather than a dead end.
      if (r.entry) {
        const t = Vocab.tokenize(r.entry.zh).find(x => x.e && !Vocab.mastered(x.t));
        if (t) { Pick.close(); openWord(t.t); return false; }
        say(r.entry.zh, r.entry.en);
      }
      return false;
    },
  });
}

// ---- the phone itself. Three apps and whatever you have got coming, in the same drawer the
// menu board and the line map use, because it is the same interaction: a list too long to hide
// behind one keypress. The difference is that this one is in your pocket in every room.
function openPhone() {
  if (cardOpen) closeCard();
  const care = hospitalGuide();
  const st = !delivery ? ['没有订单', 'nothing on order — pick an app']
    : delivery.state === 'coming'
      ? [`${delivery.item.hz}`, `on its way · about ${deliveryEta()} min · ¥${delivery.total} at the door`]
      : [`${delivery.item.hz}`, `he is at your door · ¥${delivery.total} to pay`];
  Pick.show({
    title: '手机',
    sub: `Your phone — ¥${Math.floor(money)} in your wallet`,
    rows: [
      { sec:'应用', en:'apps' },
      { hz:'外卖', py:'wàimài', en:'a meal from the 餐馆, brought up to you',
        right:`+¥${WAIMAI_FEE}`, app:'waimai' },
      { hz:'跑腿', py:'pǎotuǐ', en:'somebody does your 超市 shopping for you',
        right:`+¥${PAOTUI_FEE}`, app:'paotui' },
      { hz:'日记', py:'rìjì', en:'what you have been doing, in Chinese',
        right: diary.length ? `${diary.length} 条` : '', app:'diary' },
      ...(care.case ? [{ hz:'就诊单', py:'jiùzhěn dān',
        en:'your hospital registration slip and next step',
        right:care.complete?'已完成':care.number, app:'hospital' }] : []),
      { hz:'飞行护照', py:'fēixíng hùzhào', en:'destination stamps, flight distance and window photos',
        right: typeof flightPassport !== 'undefined' ? `${Object.keys(flightPassport.stamps).length}/7` : '', app:'passport' },
      { sec:'订单', en:'your order' },
      { hz: st[0], py:'', en: st[1], off:true },
    ],
    onPick(r) {
      if (r.app === 'diary') openDiary();
      else if (r.app === 'hospital') openHospitalSlip();
      else if (r.app === 'passport') openFlightPassportPhone();
      else if (r.app) phoneList(r.app);
      return false;                        // the phone stays in your hand either way
    },
  });
}

function openFlightPassportPhone() {
  const stamps = Object.entries(flightPassport.stamps);
  Pick.show({ title:'飞行护照', sub:`${flightPassport.miles.toLocaleString()} km · ${flightPassport.moments.length} saved moments`,
    rows:[{hz:'返回',py:'fǎnhuí',en:'back to the phone',back:true},
      {sec:'入境章',en:'destination stamps'},
      ...(stamps.length ? stamps.map(([hz,n]) => ({hz,py:(Vocab.get(hz)||{}).py || '',en:`destination stamp · visited ${n} time${n===1?'':'s'}`,right:'★'.repeat(Math.min(3,n)),off:true}))
        : [{hz:'还没有印章',py:'hái méiyǒu yìnzhāng',en:'complete a flight to earn your first stamp',off:true}])],
    onPick(r) { if (r.back) openPhone(); return false; } });
}

function phoneList(app) {
  const food = app === 'waimai';
  const fee = food ? WAIMAI_FEE : PAOTUI_FEE;
  const items = food
    ? Diner.MENU.map(r => r.sec ? { sec:r.sec, en:r.en }
        : { hz:r.hz, py:r.py, en:r.en, price:r.price })
    // 一斤猪肉 and 一盒鸡蛋 are different amounts of shopping, and the app is the one place you
    // order without the thing in your hand — so the measure word goes in the line, where it is
    // read, rather than being left for the fridge to reveal afterwards.
    : RUNNER().map(goodsFor).filter(Boolean).map(g => ({
        hz:g.hz, py:dictOf(g.hz).py, price:g.price,
        en:`一${Pantry.unit(g.hz)} · ${dictOf(g.hz).en}` }));
  Pick.show({
    skin: food ? 'restaurant' : '',
    title: food ? '老李面馆 · 外卖' : '跑腿',
    sub: (food ? 'Delivered from the noodle shop' : 'Someone else walks to the shop')
       + ` — 配送费 ¥${fee}, you have ¥${Math.floor(money)}`,
    rows: [{ hz:'返回', py:'fǎnhuí', en:'back to the phone', back:true }].concat(
      items.map(r => r.sec ? r
        : { ...r, right:`¥${r.price + fee}`, off: money < r.price + fee })),
    onPick(r) {
      if (r.back) { openPhone(); return false; }
      const no = orderIn(app, r.hz);
      if (no) { say(no[0], no[1]); return false; }
      return true;
    },
  });
}

// ---------------------------------------------------------------- 货架 the open shelves
//
// A gondola of dry goods and a chiller, each with one price ticket outside quoting its cheapest
// line, and this is what is behind the ticket. It is the same drawer as the menu board and the
// phone because it is the same interaction — a list too long to hide behind one keypress.
//
// What it is really for is the column of numbers. Everywhere else in the game a price arrives
// already attached to the one thing you were looking at; here there are ten of them at once, in
// Chinese, next to ten words, and choosing badly is possible. That is the surface a shopping
// mistake has to happen on before language can be made to matter at a till.
function openShelf(fixture) {
  const rows = (Shop.SHELF[fixture] || []).map(g => ({
    hz: g.hz, py: dictOf(g.hz).py,
    // 一斤 / 一盒 / 一棵. The measure word is half of what you are agreeing to and it belongs on
    // the line you are agreeing to, not in a tooltip.
    en: `一${Pantry.unit(g.hz)} · ${dictOf(g.hz).en}`,
    right: `¥${g.price}`,
    price: g.price,
  }));
  const inBasket = () =>
    `In your basket: ${basket.length ? `${basketSay()} · ¥${basketTotal()}` : 'nothing yet'}`
    + ` — ¥${Math.floor(money)} in your pocket`;
  // Held rather than passed straight in, because Pick stores the object it is given and re-reads
  // `sub` on every render. Mutating this one is what lets the running total at the top of the
  // panel actually run: built as a literal, the line would still say "nothing yet" after you had
  // put six things in the basket.
  const cfg = {
    title: fixture === '冰柜' ? '冰柜' : '货架',
    sub: inBasket(),
    rows,
    onPick(r) {
      // Nothing is paid for here. The basket is where it goes and the till is where it costs, in
      // exactly the way the shelves that are a single product already work.
      basket.push({ hz: r.hz, price: r.price });
      toast(`放进篮子 · <span class="dim">${r.hz} · ¥${r.price} · ¥${basketTotal()} total</span>`);
      cfg.sub = inBasket();
      // The panel stays open. You do not walk back to the shelf between two eggs and a cabbage,
      // and a shop that shut the shelf after every item would be unusable with a recipe in mind.
      return false;
    },
  };
  Pick.show(cfg);
}

// ---------------------------------------------------------------- 厨房 what you can make tonight
//
// The kitchen used to be one verb worth forty-five minutes and sixty-four food, available whenever
// the meal counter was above zero. Now it can only make what the fridge actually holds, and which
// of those you make is a real decision: 汤 is twenty-five minutes and barely feeds you, 饺子 is a
// full hour and is the best meal in the game. Neither is ever simply correct.
//
// Dishes you cannot make are shown rather than hidden, with what they are short of, because that
// list is the shopping list — and reading it in Chinese is the whole reason the words for 白菜 and
// 肉馅 are worth knowing.
let cooking = null;             // the dish chosen at the panel, until it is made or abandoned

function openKitchen(th) {
  const can = Pantry.cookable(day).map(r => r.hz);
  Pick.show({
    title: '做饭',
    sub: `What is in the 冰箱 · ${stockOf()} 份`,
    rows: Pantry.RECIPES.map(r => {
      const short = Pantry.missing(r.hz, day);
      return {
        hz: r.hz, py: r.py, recipe: r.hz,
        en: can.includes(r.hz)
          ? `${r.mins} 分钟 · ${r.en}`
          : `need ${short.map(m => `${m.need}${m.unit} ${m.hz}`).join('、')}`,
        right: can.includes(r.hz) ? `${r.mins}分` : '',
        off: !can.includes(r.hz),
      };
    }),
    onPick(r) {
      // `off` is advisory everywhere in this game — the phone greys out what you cannot afford
      // and `orderIn` still checks the money — so the refusal has to be here too. Pick.confirm
      // does not look at the flag.
      if (!can.includes(r.recipe)) {
        const short = Pantry.missing(r.recipe, day);
        say(`没有${short.map(m => m.hz).join('、')}。`,
            `No ${short.map(m => dictOf(m.hz).en).join(', ')}.`);
        return false;
      }
      // Chosen, not cooked. Going back through startUse is what puts the body at the stove with a
      // ladle in its hand for the length of the dish, rather than teleporting forty minutes
      // forward out of a menu.
      //
      // The panel has to be shut *first*: startUse refuses outright while a Pick is open, so
      // choosing a dish and returning true — letting Pick close itself afterwards — silently did
      // nothing at all. Closing twice is free; `close` returns early when it is already shut.
      cooking = r.recipe;
      Pick.close();
      if (th) startUse(th);
      return true;
    },
  });
}

// ---------------------------------------------------------------- 电梯 the lift at home
//
// The panel inside the car, and the second half of the ride. The first half is the button on the
// landing — 电梯, which runs `World.callLift()` and brings the car to you — and this is what you
// do once you are standing in it. It opens on its own: js/world.js hands back `lift-in` the frame
// you step aboard an open car, and the tick loop below calls this. 按钮 on the car wall opens it
// again if you dismissed it without choosing.
//
// Twelve rows, and it used to be two. The comment that stood here said the wall panel's other ten
// buttons "are floors the building has and the game does not", and that a picker listing rows you
// cannot choose "is not flavour, it is a menu that lies". TOWER.md's whole premise is inverting
// that sentence: the job is to make the wall panel tell the truth.
//
// So the list is now every floor, and it reads `World.deckLive(n)` to find out which ones somebody
// has actually built. A floor whose builder has not landed is shown greyed with its own reason
// rather than hidden — the building has twelve storeys either way, and a lift panel that quietly
// omits four of them is the same lie in the other direction.
const HOME_FLOORS = [
  { n:  1, deck:  0, hz: '一楼',  py: 'yī lóu',      en: '大堂 — the lobby, the letterboxes, the porter' },
  { n:  2, deck:  2, hz: '二楼',  py: 'èr lóu',      en: '走廊 — your corridor, and 202', home: true },
  { n:  3, deck:  3, hz: '三楼',  py: 'sān lóu',     en: '老李家 — the retired couple' },
  { n:  4, deck:  4, hz: '四楼',  py: 'sì lóu',      en: '物业 · 活动室 — the office and the community room' },
  { n:  5, deck:  5, hz: '五楼',  py: 'wǔ lóu',      en: '小王家 — a young family' },
  { n:  6, deck:  6, hz: '六楼',  py: 'liù lóu',     en: '学生合租 — a student flatshare' },
  { n:  7, deck:  7, hz: '七楼',  py: 'qī lóu',      en: '老师家 — a teacher' },
  { n:  8, deck:  8, hz: '八楼',  py: 'bā lóu',      en: '厨师家 — a chef' },
  { n:  9, deck:  9, hz: '九楼',  py: 'jiǔ lóu',     en: '新婚 — newlyweds, half moved in' },
  { n: 10, deck: 10, hz: '十楼',  py: 'shí lóu',     en: '装修中 — under renovation' },
  { n: 11, deck: 11, hz: '十一楼', py: 'shíyī lóu',  en: '邻居 — neighbours' },
  { n: 12, deck: 12, hz: '十二楼', py: 'shí\u2019èr lóu', en: '屋顶 — the roof, the laundry and the city' },
];
// 459. The landing indicator over every set of doors and the row in the car panel are two
// renderings of one fact, and TOWER-STATE.md records the wave where they disagreed on ten
// floors at once. js/world.js owns the numeral table; this asserts the panel against it at load
// rather than restating the rule, so the next edit to either one fails loudly here.
if (typeof floorLabel === 'function')
  for (const f of HOME_FLOORS)
    if (floorLabel(f.deck) !== f.hz.replace('楼', ''))
      console.error('HOME_FLOORS disagrees with the landing indicator on deck ' + f.deck +
                    ': panel ' + f.hz + ', landing ' + floorLabel(f.deck));
// 458. Which of the twelve is yours, in a form a non-reader can find: the same 你家 marker the
// landing indicator carries, on the row and on the arrival toast.
const homeIsYours = deck => { const f = homeFloorAt(deck); return !!(f && f.home); };
const HOME_LOBBY_ENTRY = { x: 0, z: -3.48, yaw: 0 };
// Outside the working shaft, derived from its current face so another shell adjustment cannot turn
// a supposedly safe save point back into car coordinates.
const homeLanding = () => ({ x: World.CAR ? World.CAR.x : 2.50,
  z: World.CAR ? World.CAR.front - .45 : 4.28, yaw: 0 });
const HOME_FLOOR_EN = ['', 'ground', 'second', 'third', 'fourth', 'fifth', 'sixth',
                       'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const homeFloorAt = deck => HOME_FLOORS.find(f => f.deck === deck) || null;
const homeDeckLive = deck => !!homeFloorAt(deck) &&
  (!World.deckLive || World.deckLive(deck));

// The whole block is one scene, so changing storeys does not pass through setPlace().  Keep the
// location chip tied to the actual deck instead of leaving it at the generic 家 label it got when
// the scene was entered.
function paintPlaceLabel() {
  if (place === 'home' && World.level) {
    const f = homeFloorAt(World.level()) || homeFloorAt(2);
    const area = f.en.split(' — ')[0];
    $('#where b').textContent = `${f.hz} · ${area}`;
    $('#where .k').textContent = `十八号楼 · ${f.en}`;
    return;
  }
  $('#where b').textContent = scene.label || (scene.indoor ? '家' : '胡同');
  $('#where .k').textContent = scene.labelK || (scene.indoor ? '家 · home' : '外面 · outside');
}

let homeFloorSeen = World.level ? World.level() : 2;
function syncHomeFloor(announce = false) {
  if (place !== 'home' || !World.level) return false;
  const deck = World.level(), changed = deck !== homeFloorSeen;
  homeFloorSeen = deck;
  paintPlaceLabel();
  if (!changed || !announce || !started) return changed;
  const f = homeFloorAt(deck);
  if (!f) return changed;
  toast(`${f.hz}到了 · <span class="dim">${HOME_FLOOR_EN[f.n]} floor · ${f.en}</span>`);
  // There is no place transition during a ride, so give visit goals the same event they receive
  // when setPlace() opens an ordinary room.  `home` is intentionally the stable key; a future
  // floor-specific goal can still inspect `World.level()` when this event lands.
  goalEvent('visit', 'home');
  saveGame();
  return true;
}

function openLiftPanel() {
  if (place !== 'home' || !World.liftState || cardOpen || talkOpen) return;
  const st = World.liftState();
  // The panel is a travelling prop whose x/z overlaps every landing.  Requiring the body to be in
  // the level car prevents a player outside shut doors from operating it through the shaft wall.
  if (st.moving || st.at !== st.on || !World.aboard || !World.aboard(P.x, P.z)) return;
  const live = f => f.deck === st.at || (World.deckLive ? World.deckLive(f.deck) : f.deck === 0 || f.deck === 2);
  // 460. Nothing in the game says that most of these twelve floors are somebody else's, so a
  // first-time player who rides to 十楼 finds a building site and no way to know it is not their
  // flat. One prompt, the first time the panel is ever opened, and never again — it is written
  // outside the save deliberately, because wiping the save to test something should not make the
  // game re-teach a building the player already knows.
  if (!firstRideSeen()) {
    markFirstRide();
    toast('你家在二楼 202 · <span class="dim">202 is yours, on 二楼. The other floors are neighbours — B opens 楼层表</span>');
    Vocab.sentenceHTML('我家在二楼。');
  }
  Pick.show({
    title: '电梯 · 选楼层',
    sub: '按一个楼层 · pick a floor — the doors will close and the car will go',
    rows: HOME_FLOORS.map(f => ({
      hz: f.hz, py: f.py,
      en: f.deck === st.at ? `${f.en} — you are on this floor`
        : live(f) ? f.en : `${f.en} · 还没盖好 — nothing built up there yet`,
      right: String(f.n), off: f.deck === st.at || !live(f), deck: f.deck,
    })),
    onPick(r) {
      TrainAudio.liftCue('press');
      if (World.deckLive && !World.deckLive(r.deck)) {
        toast(`那层还没盖好 · <span class="dim">that floor has not been built yet</span>`);
        return false;
      }
      const ok = World.goFloor(r.deck, day, minutes);
      if (ok !== true) {
        // 'liftOut' is not 'busy' and must not be worded as it: the car is not moving, it is not
        // running today. The note is re-asked rather than returned by `goFloor`, which keeps that
        // function's contract as the plain `true`-or-reason string every caller already switches on.
        const out = ok === 'liftOut' ? Disrupt.liftOut(day, minutes) : null;
        toast(out ? `${out.note[0]} · <span class="dim">${out.note[1]}</span>`
          : ok === 'here'
          ? `已经在这一层 · <span class="dim">you are on that floor already</span>`
          : `电梯正在运行 · <span class="dim">the car is already moving</span>`);
        if (out) Vocab.sentenceHTML(out.note[0]);
        return false;
      }
      const f = HOME_FLOORS.find(q => q.deck === r.deck);
      toast(`${f.hz} · <span class="dim">the doors are closing</span>`);
      Vocab.sentenceHTML(`我去${f.hz}。`);
      // Items 264 and 321. Who is in the car depends on the floors it passes and the hour, keyed
      // on `livesOn` in js/data.js — which until now was authored on thirteen rows and read by
      // nothing. It is a line rather than a body on purpose: every one of those rows is `deck: 0`
      // and drawing a second figure inside the car costs a rig for a fifteen-second ride.
      // `Story.knows` is what makes the third time you share it different from the first.
      const share = HomeLife.liftShare(day, minutes, st.at, r.deck, typeof NPCS === 'undefined' ? null : NPCS);
      if (share) {
        say(share.zh, share.en);
        if (share.mood) needs.mood = clamp(needs.mood + share.mood, 0, 100);
        // A ride together is one of the ways you get to know somebody in this building, so it
        // counts — quietly, and only when there was something said.
        if (share.knows >= 1 && typeof Story !== 'undefined' && Story.heard)
          Story.heard(share.n, true, day);
      }
      return true;
    },
  });
}

// 465. Step to the next usable thing within reach. Proximity picking is right almost always and
// wrong exactly when two things share a standing spot — the tap and the mirror over it, four
// hobs, a row of letterboxes. This does not change what is reachable, only which one Q means.
function cycleNear() {
  if (!nearUsables.length) { toast('这儿没有能用的东西 · <span class="dim">nothing within reach</span>'); return; }
  const from = cyclePick ? nearUsables.indexOf(cyclePick) : cycleIdx;
  cycleIdx = (from + 1) % nearUsables.length;
  cyclePick = nearUsables[cycleIdx];
  activeThing = useThing = cyclePick;
  toast(`${cyclePick.hz} · <span class="dim">${cycleIdx + 1}/${nearUsables.length} — Tab for the next, Q to use</span>`);
}

// 470. The building on one screen. Twelve storeys were legible only from inside the car, which
// is the one place you already know where you are going; the map on the HUD shows the city and
// stops at the front door. Read-only on purpose — this is a directory, not a second call panel,
// and the lift is still the only thing that moves you. UI rather than a modelled board, so it
// costs nothing per frame and is the same in the lobby, the corridor and the flat.
function openBuildingMap() {
  const st = World.liftState ? World.liftState() : null;
  const here = World.level ? World.level() : 2;
  Pick.show({
    title: '楼层表 · 十八号楼',
    sub: 'B — the whole building. 你家 is 202 on 二楼 · the lift is the only way up',
    rows: HOME_FLOORS.map(f => {
      const live = !World.deckLive || World.deckLive(f.deck);
      const marks = [];
      if (f.home) marks.push('你家');
      if (f.deck === here) marks.push('你在这儿');
      if (st && st.at === f.deck) marks.push('电梯');
      return { hz: f.hz, py: f.py, right: marks.length ? marks.join(' · ') : String(f.n),
        en: live ? f.en : `${f.en} · 还没盖好 — nothing built up there yet`, off: !live };
    }),
    onPick() { return false; },
  });
}

// The mall's three decks share one scene, so this selector changes the active collision/render
// layer and places the player on the public side of the same shaft. Unlike the old flavour-only
// call button, choosing a row now completes an actual vertical journey.
const FIRSTRIDE_KEY = 'bjlife.firstride.v1';
const firstRideSeen = () => { try { return !!localStorage.getItem(FIRSTRIDE_KEY); } catch (e) { return true; } };
const markFirstRide = () => { try { localStorage.setItem(FIRSTRIDE_KEY, '1'); } catch (e) { /* storage blocked */ } };

function openMallLiftPanel() {
  if (place !== 'mall' || cardOpen || talkOpen) return;
  const here = Mall.level();
  const floors = [
    {floor:1,hz:'一楼',py:'yī lóu',en:'services, fashion and digital'},
    {floor:2,hz:'二楼',py:'èr lóu',en:'books, beauty, sport and home'},
    {floor:3,hz:'三楼',py:'sān lóu',en:'food, cinema and arcade'},
  ];
  Pick.show({
    title:'商场电梯 · 选楼层',
    sub:'按一个楼层 · choose a destination',
    rows:floors.map(f=>({
      ...f, right:`${f.floor}F`, off:f.floor===here,
      en:f.floor===here?`${f.en} — you are on this floor`:f.en,
    })),
    onPick(r) {
      if (r.floor===Mall.level()) return false;
      TrainAudio.liftCue('press');
      Mall.setFloor(r.floor);
      P.x=17.70; P.z=14.20; P.lift=Mall.deckY(r.floor); P.yaw=-Math.PI/2;
      P.vx=P.vz=0; P.speed=0; P.ground=0;
      CAM.fx=P.x; CAM.fz=P.z; CAM.tYaw=P.yaw;
      toast(`${r.hz}到了 · <span class="dim">${r.floor}F — ${r.en}</span>`);
      Vocab.sentenceHTML(`我坐电梯去${r.hz}。`);
      saveGame();
      return true;
    },
  });
}

// ---------------------------------------------------------------- 地铁 the subway
// A ticket in your pocket, and which station you are standing in. The station is not geometry —
// one room serves the whole line — so it lives out here and Metro repaints itself to match.
// The fare is by distance, the way it is on a real line: three kuai for a stop or two, four for
// three or four, five for the length of the line. Two ways to pay it.
//
// 单程票 — a single. Bought at the machine for a named destination and priced for that journey.
// It gets you in anywhere; it gets you out at the station it was bought for, and anywhere else you
// 补票 the difference. There is no refund for getting off early.
//
// 交通卡 — a travel card. Twenty kuai, comes loaded with twenty, tops up at the machine, and takes
// a kuai off every fare. Nothing comes off it going in; the exact fare comes off going out, which
// is why the gate will not let you in on less than the dearest fare it might have to charge.
// Six legs exist on the line now that 动物园 sits between 公园 and 机场, and `fareFor` clamps to
// the length of this — so left at five entries the last stop would have quietly cost the same as
// the fourth and the 票价表 on the platform would have been wrong. The top band is 五六站 五元,
// which is what the board and the ticket machines both say.
const FARES = [3, 3, 4, 4, 5, 5];
// `MALL_GOODS` lives in js/data.js, with the other data tables.
// What is in your hands and not yet paid for: a list, because a shopping trip is more than one
// thing. Everything in it comes from one shop at a time — you cannot carry a coat from the 服装店
// to the till in the 花店 — but within a shop you can pick up as much as you can afford.
let mallBasket = [];              // [{ shop, item }] — chosen, in your hands, not yet paid for
const basketShop = () => mallBasket.length ? mallBasket[0].shop : null;
// 中文书籍买二送一 — the food court is not the only place the loudspeaker makes a promise. `ad:books`
// in js/mall.js announces this all day, so the till has to honour it or the building is lying.
//
// Every third book is free and it is the cheapest that goes, which is how a shop actually runs this:
// you are not handed the dearest one. **只有书籍** — the ad says 中文书籍, so a magazine, a map, a
// notebook and a postcard are not in it. That list lives here rather than as a flag in js/data.js
// for two reasons: what counts as a book is the terms of an offer, not a property of the product;
// and js/data.js is being edited by another session as this is written.
const BOOK_HZ = new Set(['书', '小说', '词典']);
const BOOK_PROMO_COPY = '中文书买二送一';
let mallBookOfferCache = null;
function bookPromoOff(basket) {
  const prices = basket.filter(b => b.shop === '书店' && BOOK_HZ.has(b.item.hz))
                       .map(b => b.item.price).sort((x, y) => x - y);
  let off = 0;
  for (let i = 0, free = Math.floor(prices.length / 3); i < free; i++) off += prices[i];
  return off;
}
// The physical card in 墨香书店 reads this rather than re-implementing the till rule in its
// fit-out.  `off` is the exact amount `mallTotal()` removes from the current basket, so the card's
// retained 已减 state cannot get ahead of the receipt.  Kept as a small snapshot instead of
// exposing the mutable basket itself as a second commerce API.
function mallBookOffer() {
  const eligible = mallBasket.filter(b => b.shop === '书店' && BOOK_HZ.has(b.item.hz)).length;
  const off = bookPromoOff(mallBasket);
  if (mallBookOfferCache && mallBookOfferCache.eligible === eligible && mallBookOfferCache.off === off)
    return mallBookOfferCache;
  mallBookOfferCache = Object.freeze({ id:'books-2-plus-1', tenant:'墨香书店', claim:BOOK_PROMO_COPY,
    ready:'可用', applied:'已减', eligible, off, active:true,
    phase:off > 0 ? 'applied' : 'ready', signature:`${eligible}:${off}` });
  return mallBookOfferCache;
}
// One definition, because five callers read this — the carry line, two affordability checks, the
// receipt and the diary — and a promotion honoured by four of them is a pricing bug.
const mallTotal = () => mallBasket.reduce((n, b) => n + b.item.price, 0) - bookPromoOff(mallBasket);
let mallBought = [];              // what you own, by name, in the order you bought it
// The campus issues one durable identity item. It is kept separately from `mallBought`, whose save
// intentionally retains only the latest 24 purchases, then mirrored into that list because the
// cinema's existing concession path asks whether the player is carrying 学生证 there.
let campusLife = { studentId:false };
function issueStudentId() {
  const fresh = !campusLife.studentId;
  campusLife.studentId = true;
  if (!mallBought.includes('学生证')) mallBought.push('学生证');
  if (fresh) saveGame();
  return fresh;
}

// The receipt, which is a different thing from the list of names above. `mallBought` answers "do I
// own a coat" — which is what the wardrobe and the carry line want — and it is capped and lossy on
// purpose. This answers "what did I buy, when, where, how many of it, and for how much", which is
// the question a returns desk, a warranty claim and a budget challenge all have to ask, and not one
// of them can be answered from a bare list of the last two dozen product names.
let mallReceipts = [];      // [{no, day, at, shop, items:[{hz,en,price,qty,line}], total, paid}]
let mallReceiptNo = 0;
const MALL_RECEIPTS_KEPT = 200;
// What you were holding, unpaid, when the page last went away. A basket is explicitly not a
// purchase: no money has moved and the shop has not let go of the goods, so it does not survive a
// reload and everything goes back on the shelf. That is the honest behaviour of the two available,
// but it is only fair if the game says so — which it does the next time you open a shop.
let mallBasketLeft = null;
// Saved state belonging to the lazy tenant systems, held here between a load and the moment the
// module that owns it actually exists. Loading a life and then walking into the arcade must find
// your card balance and your best scores, and the arcade module is not loaded until the building
// is built. Applied by `applyMallSysSave()` when the mall is first entered; re-saved verbatim
// until then, so a save/load cycle that never visits the mall does not quietly wipe it.
let mallSysSave = {};
function applyMallSysSave() {
  if (window.ArcadeSys && mallSysSave.arcade) {
    try { ArcadeSys.load(mallSysSave.arcade); } catch (e) {}
    mallSysSave.arcade = null;
  }
  if (window.CinemaSys && mallSysSave.cinemaSys) {
    try { CinemaSys.load(mallSysSave.cinemaSys); } catch (e) {}
    mallSysSave.cinemaSys = null;
  }
}

// Four reasons to use the whole building rather than one favourite shop. The passport is small on
// purpose: each stamp comes from a different kind of mall life, and every one is awarded once.
// Optional fields in the v1 save keep old lives readable.
const MALL_STAMPS = {
  event:    {hz:'中庭活动章',py:'zhōngtíng huódòng zhāng',en:'atrium event'},
  arcade:   {hz:'游戏挑战章',py:'yóuxì tiǎozhàn zhāng',en:'arcade challenge'},
  food:     {hz:'美食探索章',py:'měishí tànsuǒ zhāng',en:'food explorer'},
  shopping: {hz:'购物发现章',py:'gòuwù fāxiàn zhāng',en:'shopping discovery'},
};
const freshMallProgress = () => ({
  stamps:{}, rewardTier:0, tickets:0, arcadePlays:0, arcadeWins:0,
  prizes:[], foodOrders:0, lastOrder:null,
});
let mallProgress = freshMallProgress();
const mallStampCount = () => Object.keys(MALL_STAMPS).filter(k=>mallProgress.stamps[k]).length;

// Rewards are deliberately one-shot and mostly mall-local. The two ticket bundles let a passport
// player reach the first prize without grinding; the small cash reward buys one inexpensive dish.
function awardMallStamp(kind) {
  if (!MALL_STAMPS[kind] || mallProgress.stamps[kind]) return null;
  mallProgress.stamps[kind] = { day:day|0, at:Math.round(minutes) };
  const count=mallStampCount(), rewards=[];
  if (count===1) { mallProgress.tickets+=5; rewards.push('送5张游戏票'); }
  if (count===2) { money+=10; rewards.push('奖励10块'); }
  if (count===3) { mallProgress.tickets+=15; rewards.push('送15张游戏票'); }
  if (count===4) {
    if (!mallBought.includes('金色纪念章')) mallBought.push('金色纪念章');
    needs.mood=clamp(needs.mood+15,0,100); rewards.push('金色纪念章');
  }
  mallProgress.rewardTier=Math.max(mallProgress.rewardTier,count);
  logDiary(`集章册盖上了${MALL_STAMPS[kind].hz}，现在有${count}枚章。`,
    `Added the ${MALL_STAMPS[kind].en} stamp to the mall passport — ${count} of 4.`,
    `mallstamp-${kind}`);
  saveGame();
  return {kind,count,rewards,hz:MALL_STAMPS[kind].hz};
}
const mallStampSuffix = a => a
  ? ` · 新章：${a.hz} (${a.count}/4)${a.rewards.length?' · '+a.rewards.join('、'):''}` : '';

function openMallPassport() {
  const count=mallStampCount();
  Pick.show({
    title:`城市汇 · 集章册 ${count}/4`,
    sub:`${mallProgress.tickets} 张游戏票 · 集齐四枚可得金色纪念章`,
    rows:Object.entries(MALL_STAMPS).map(([key,s])=>({
      key,hz:s.hz,py:s.py,
      en:mallProgress.stamps[key]
        ? `${s.en} · day ${mallProgress.stamps[key].day}`
        : `${s.en} · not stamped yet`,
      right:mallProgress.stamps[key]?'✓':'○', off:true,
    })),
    onPick:()=>false,
  });
}

// ---------------------------------------------------------------- 北京银行 — account, queue and cash services
// The branch geometry already contains the whole customer journey.  This state makes that journey
// real without confusing the bank card with the existing subway `card`: the account is persistent,
// while a paper queue number and the form in your hand belong only to the current visit.
const BANK_SERVICES = {
  personal:{hz:'个人业务',py:'gèrén yèwù',en:'account and card services',prefix:'B',counter:'开户桌'},
  cash:{hz:'现金业务',py:'xiànjīn yèwù',en:'cash deposit or withdrawal',prefix:'A',counter:'现金柜台'},
};
const BANK_LEDGER_KINDS = new Set(['open','deposit','withdraw','transit','rent']);
const freshBankAccount = () => ({
  opened:false, balance:0, hasCard:false, accountNo:null, openedDay:0, ledger:[],
});
const freshBankVisit = () => ({ day:day|0, ticket:null, form:null, idShown:false, issued:0 });
let bankAccount=freshBankAccount();
let bankVisit=freshBankVisit();

const bankStaffOpen = () => {
  const h=minutes/60;
  return h>=9&&h<17;
};
const bankAmount = v => Number.isFinite(Number(v)) ? Math.max(0,Math.floor(Number(v))) : 0;
function syncBankVisit() {
  if(bankVisit.day!==(day|0)) bankVisit=freshBankVisit();
  // A paper number expires with the staffed day. In particular, beginning a four-minute wait at
  // 16:58 must not call the player to a counter that became unavailable during the action.
  if(bankVisit.ticket&&!bankStaffOpen()) bankVisit=freshBankVisit();
  return bankVisit;
}
function resetBankVisit() { bankVisit=freshBankVisit(); }
function bankTicketSnapshot() {
  syncBankVisit();
  return bankVisit.ticket&&{...bankVisit.ticket};
}
function issueBankTicket(kind) {
  syncBankVisit();
  if(!bankStaffOpen()||!BANK_SERVICES[kind]) return null;
  // One customer, one live number. Pressing the machine again prints nothing and preserves their
  // place in line; cancellation is an explicit row in the machine panel.
  if(bankVisit.ticket) return bankTicketSnapshot();
  const s=BANK_SERVICES[kind];
  bankVisit.issued++;
  const seq=40+((day*17+Math.floor(minutes)+bankVisit.issued*7)%50);
  bankVisit.ticket={kind,no:`${s.prefix}${String(seq).padStart(3,'0')}`,counter:s.counter,
    called:false,waitMins:4+((seq+day)%3),takenAt:Math.round(minutes)};
  return bankTicketSnapshot();
}
function cancelBankTicket() {
  syncBankVisit();
  if(!bankVisit.ticket) return false;
  bankVisit.ticket=null; bankVisit.form=null;
  return true;
}
function callBankTicket() {
  syncBankVisit();
  if(!bankVisit.ticket) return false;
  bankVisit.ticket.called=true;
  return true;
}
function consumeBankTicket(kind) {
  syncBankVisit();
  if(!bankVisit.ticket||bankVisit.ticket.kind!==kind) return false;
  bankVisit.ticket=null;
  if(kind==='cash') bankVisit.form=null;
  return true;
}
function bankShowId() {
  syncBankVisit(); bankVisit.idShown=true; return true;
}
function bankTicketStatus() {
  syncBankVisit();
  const t=bankVisit.ticket;
  if(!bankStaffOpen()&&!t) return ['柜台已经下班，自动取款机仍然开放。',
    'The counters are closed; the cash machines are still open.'];
  if(!t) return ['我还没有号码，先去取号机。','I do not have a number yet — use the ticket machine first.'];
  if(!t.called) return [`${t.no}号还没叫到，请坐下等候。`,`${t.no} has not been called yet. Take a seat and wait.`];
  return [`${t.no}号，请到${t.counter}。`,`${t.no}: please go to the ${BANK_SERVICES[t.kind].en}.`];
}

function bankRecord(kind,delta,zh,en) {
  if(!BANK_LEDGER_KINDS.has(kind)) return;
  const row={kind,delta:Math.trunc(delta)||0,day:day|0,at:Math.round(minutes),
    balance:Math.floor(bankAccount.balance)};
  bankAccount.ledger.push(row);
  if(bankAccount.ledger.length>16) bankAccount.ledger.splice(0,bankAccount.ledger.length-16);
  if(zh&&en) logDiary(zh,en,`bank-${kind}-${row.day}-${row.at}-${bankAccount.ledger.length}`);
  saveGame(); updateHud();
}
function bankPayRent(value) {
  const amount=Math.min(bankAmount(value),bankAccount.opened?bankAccount.balance:0);
  if(!amount) return 0;
  bankAccount.balance-=amount;
  bankRecord('rent',-amount);
  return amount;
}
function bankOpenAccount() {
  syncBankVisit();
  const t=bankVisit.ticket;
  if(bankAccount.opened||!bankStaffOpen()||!t||t.kind!=='personal'||!t.called||!bankVisit.idShown)
    return false;
  const last=String(1000+((day*137+Math.floor(minutes)*11)%9000));
  bankAccount={opened:true,balance:0,hasCard:true,
    accountNo:`6222 •••• •••• ${last}`,openedDay:day|0,ledger:[]};
  consumeBankTicket('personal');
  Vocab.introduce('账户'); Vocab.introduce('银行卡'); Vocab.introduce('密码');
  bankRecord('open',0,'在北京银行开了账户，拿到了银行卡。',
    'Opened an account at Beijing Bank and received a bank card.');
  return true;
}
function bankCashReady() {
  syncBankVisit();
  const t=bankVisit.ticket;
  return bankStaffOpen()&&!!(t&&t.kind==='cash'&&t.called);
}
function bankDeposit(value,via='atm') {
  const amount=bankAmount(value);
  if(!bankAccount.opened||!bankAccount.hasCard||!amount||money<amount) return false;
  if(via==='teller'&&!bankCashReady()) return false;
  money-=amount; bankAccount.balance+=amount;
  if(via==='teller') consumeBankTicket('cash');
  bankRecord('deposit',amount,`在银行存了${amount}块，账户余额${bankAccount.balance}块。`,
    `Deposited ¥${amount}; the account balance is ¥${bankAccount.balance}.`);
  return true;
}
function bankWithdraw(value,via='atm') {
  const amount=bankAmount(value);
  if(!bankAccount.opened||!bankAccount.hasCard||!amount||bankAccount.balance<amount) return false;
  if(via==='teller'&&!bankCashReady()) return false;
  bankAccount.balance-=amount; money+=amount;
  if(via==='teller') consumeBankTicket('cash');
  bankRecord('withdraw',-amount,`从账户取了${amount}块现金，余额${bankAccount.balance}块。`,
    `Withdrew ¥${amount} in cash; the account balance is ¥${bankAccount.balance}.`);
  return true;
}
function bankTopUpTransit(value) {
  const amount=bankAmount(value);
  if(!bankAccount.opened||!bankAccount.hasCard||!card||!amount||bankAccount.balance<amount) return false;
  bankAccount.balance-=amount; card.bal+=amount;
  bankRecord('transit',-amount,`从银行账户给交通卡充了${amount}块。`,
    `Moved ¥${amount} from the bank account to the travel card.`);
  return true;
}

function bankAmountRows(available) {
  const n=bankAmount(available), rows=[20,50,100,200].map(amount=>({
    hz:`${amount}块`,py:`${amount} kuài`,en:`¥${amount}`,right:`¥${amount}`,amount,off:n<amount,
  }));
  if(n>0&&!rows.some(r=>r.amount===n)) rows.push({
    hz:'全部',py:'quánbù',en:`the full available amount`,right:`¥${n}`,amount:n,
  });
  return rows;
}
function openBankAmount(kind,via) {
  const deposit=kind==='deposit', available=deposit?money:bankAccount.balance;
  Pick.show({
    title:`${via==='teller'?'柜台':'自动取款机'} · ${deposit?'存款':'取款'}`,
    sub:`现金 ¥${Math.floor(money)} · 账户 ¥${Math.floor(bankAccount.balance)} · 选择金额`,
    rows:bankAmountRows(available),
    onPick(row) {
      const ok=deposit?bankDeposit(row.amount,via):bankWithdraw(row.amount,via);
      if(!ok) {
        toast(`${deposit?'现金':'余额'}不够，交易取消 · <span class="dim">transaction not completed</span>`);
        return false;
      }
      toast(`${deposit?'存款':'取款'}成功 · <span class="dim">¥${row.amount} · 账户 ¥${bankAccount.balance} · 现金 ¥${Math.floor(money)}</span>`);
      Vocab.sentenceHTML(deposit?`我存了${row.amount}块。`:`我取了${row.amount}块。`);
      return true;
    },
  });
}
function openBankForms() {
  syncBankVisit();
  Pick.show({title:'银行单据 · 填写',sub:'柜台会按这张单子预选业务 · the form guides the teller',
    rows:[
      {hz:'存款单',py:'cúnkuǎndān',en:'deposit slip',right:bankVisit.form==='deposit'?'已填':'填写',form:'deposit'},
      {hz:'取款单',py:'qǔkuǎndān',en:'withdrawal slip',right:bankVisit.form==='withdraw'?'已填':'填写',form:'withdraw'},
    ],
    onPick(row){bankVisit.form=row.form;toast(`填好了${row.hz} · <span class="dim">form ready</span>`);return true;}});
}
function openBankTicket() {
  syncBankVisit();
  if(bankVisit.ticket) {
    const t=bankVisit.ticket;
    Pick.show({title:`取号机 · ${t.no}`,sub:bankTicketStatus()[1],rows:[
      {hz:`保留 ${t.no}`,py:'bǎoliú hàomǎ',en:'keep this queue number',right:t.called?'已叫号':'等候中',keep:true,off:true},
      {hz:'取消号码',py:'qǔxiāo hàomǎ',en:'cancel this queue number',right:'取消',cancel:true},
    ],onPick(row){if(!row.cancel)return false;cancelBankTicket();toast('号码已取消 · <span class="dim">queue ticket cancelled</span>');return true;}});
    return;
  }
  Pick.show({title:'取号机 · 请选择业务',sub:'柜台营业 09:00–17:00 · one live number at a time',
    rows:Object.entries(BANK_SERVICES).map(([kind,s])=>({kind,hz:s.hz,py:s.py,en:s.en,right:s.prefix+'号'})),
    onPick(row){const t=issueBankTicket(row.kind);if(!t){toast('柜台已经下班 · <span class="dim">staffed services reopen at 09:00</span>');return false;}
      toast(`取到${t.no}号 · <span class="dim">${t.counter} · 请等候</span>`);Vocab.sentenceHTML(`我取了${t.no}号。`);return true;}});
}
function openBankOverview() {
  const ledger=bankAccount.ledger.slice(-5).reverse();
  const names={open:'开户',deposit:'存款',withdraw:'取款',transit:'交通卡充值',rent:'房租'};
  Pick.show({title:'银行卡 · 账户',sub:bankAccount.opened
      ? `${bankAccount.accountNo} · 余额 ¥${bankAccount.balance} · 现金 ¥${Math.floor(money)}`
      : '还没有账户 · no bank account yet',
    rows:bankAccount.opened?[
      {hz:`余额 ${bankAccount.balance}块`,py:"yú'é",en:'available account balance',right:'账户',off:true},
      {hz:`现金 ${Math.floor(money)}块`,py:'xiànjīn',en:'cash in your wallet',right:'钱包',off:true},
      ...ledger.map((r,i)=>({hz:`${names[r.kind]||r.kind} ${r.delta>0?'+':''}${r.delta}块`,
        py:'huídān',en:`day ${r.day} · ${String(Math.floor(r.at/60)).padStart(2,'0')}:${String(r.at%60).padStart(2,'0')}`,
        right:`¥${r.balance}`,off:true,key:i})),
    ]:[{hz:'先开户',py:'xiān kāihù',en:'take a personal-service number during counter hours',right:'09–17',off:true}],
    onPick:()=>false});
}
function openBankAccountPanel() {
  if(bankAccount.opened){openBankOverview();return;}
  Pick.show({title:'开户 · 确认资料',sub:'身份证已核对 · 免费开户并领取银行卡',rows:[
    {hz:'确认开户',py:'quèrèn kāihù',en:'open the account and issue a bank card',right:'免费',open:true},
    {hz:'暂不办理',py:'zàn bù bànlǐ',en:'not now',right:'返回',cancel:true},
  ],onPick(row){if(row.cancel)return true;if(!bankOpenAccount()){toast('资料还不完整 · <span class="dim">ticket, call and ID are required</span>');return false;}
    toast(`开户成功 · <span class="dim">${bankAccount.accountNo} · 银行卡已发</span>`);return true;}});
}
function openBankCardService() {
  // Before account opening this is a second staffed route into the same verified ID workflow;
  // afterwards it is an account/card overview. Neither branch pretends the desk is an ATM.
  openBankAccountPanel();
}
function openBankTeller(kind) {
  syncBankVisit();
  if(!bankCashReady()) {const s=bankTicketStatus();say(s[0],s[1]);return;}
  openBankAmount(kind,'teller');
}
function openBankCounter() {
  Pick.show({title:'现金柜台 · 办理业务',sub:`${bankVisit.ticket?.no||'未取号'} · 账户 ¥${bankAccount.balance} · 现金 ¥${Math.floor(money)}`,
    start:bankVisit.form==='withdraw'?'取款':'存款',rows:[
      {hz:'存款',py:'cúnkuǎn',en:'put wallet cash into the account',right:bankVisit.form==='deposit'?'单子已填':'选择',kind:'deposit'},
      {hz:'取款',py:'qǔkuǎn',en:'take account money as cash',right:bankVisit.form==='withdraw'?'单子已填':'选择',kind:'withdraw'},
    ],onPick(row){openBankTeller(row.kind);return false;}});
}
function openBankATM() {
  if(!bankAccount.opened||!bankAccount.hasCard){say('我还没有银行卡，得在营业时间先开户。',
    'I do not have a bank card yet. Open an account during counter hours first.');return;}
  Pick.show({title:'自动取款机 · 请选择',sub:`账户 ¥${bankAccount.balance} · 现金 ¥${Math.floor(money)} · 24小时服务`,rows:[
    {hz:'查询余额',py:"cháxún yú'é",en:'check the account balance',right:`¥${bankAccount.balance}`,balance:true},
    {hz:'存款',py:'cúnkuǎn',en:'deposit wallet cash',right:'选择金额',kind:'deposit'},
    {hz:'取款',py:'qǔkuǎn',en:'withdraw account cash',right:'选择金额',kind:'withdraw'},
    {hz:'交通卡充值',py:'jiāotōngkǎ chōngzhí',en:card?'top up the travel card from this account':'buy a travel card at the subway first',
      right:card?`卡 ¥${card.bal}`:'没有卡',transit:true,off:!card||bankAccount.balance<20},
    {hz:'打印回单',py:'dǎyìn huídān',en:'print the latest transaction receipt',right:'回单',receipt:true},
  ],onPick(row){
    if(row.balance){toast(`账户余额 ${bankAccount.balance}块 · <span class="dim">available balance</span>`);return false;}
    if(row.kind){openBankAmount(row.kind,'atm');return false;}
    if(row.transit){if(!card||bankAccount.balance<20){toast('不能充值 · <span class="dim">a travel card and ¥20 balance are required</span>');return false;}
      Pick.show({title:'交通卡充值 · 选择金额',sub:`银行 ¥${bankAccount.balance} · 交通卡 ¥${card.bal}`,
        rows:bankAmountRows(bankAccount.balance),onPick(r){if(!bankTopUpTransit(r.amount)){toast('余额不够 · <span class="dim">top-up cancelled</span>');return false;}
          toast(`充值成功 · <span class="dim">交通卡 ¥${card.bal} · 银行 ¥${bankAccount.balance}</span>`);return true;}});return false;}
    const last=bankAccount.ledger[bankAccount.ledger.length-1];
    toast(last?`回单：${last.delta>0?'+':''}${last.delta}块 · <span class="dim">余额 ¥${last.balance}</span>`:'还没有交易 · <span class="dim">no transactions yet</span>');return false;
  }});
}
function openBankWealth() {
  Pick.show({title:'理财 · 先看风险',sub:`账户余额 ¥${bankAccount.balance} · information only`,rows:[
    {hz:'活期存款',py:'huóqī cúnkuǎn',en:'ordinary access account; money remains available',right:'低风险',off:true},
    {hz:'定期存款',py:'dìngqī cúnkuǎn',en:'fixed-term deposit; higher interest but locked',right:'看利率',off:true},
    {hz:'基金',py:'jījīn',en:'investment fund; value can rise or fall',right:'有风险',off:true},
  ],onPick:()=>false});
}
function openBankSafe() {
  Pick.show({title:'保管箱 · 服务说明',sub:'需要本人身份证和银行卡 · 柜台营业 09:00–17:00',rows:[
    {hz:'小号保管箱',py:'xiǎohào bǎoguǎnxiāng',en:'documents and small valuables',right:'咨询柜员',off:true},
    {hz:'双钥匙开启',py:'shuāng yàoshi kāiqǐ',en:'customer key plus bank key',right:'安全',off:true},
  ],onPick:()=>false});
}
function openBankVip() {
  Pick.show({title:'贵宾服务 · 资格说明',sub:`当前余额 ¥${bankAccount.balance} · information desk · threshold ¥1,000`,rows:[
    {hz:bankAccount.balance>=1000?'符合咨询条件':'还差一些',py:'guìbīn fúwù',
      en:bankAccount.balance>=1000?'eligible to discuss services with the adviser; information only':'keep saving; no fee and no product sold',
      right:bankAccount.balance>=1000?'可咨询':`差 ¥${1000-bankAccount.balance}`,off:true},
  ],onPick:()=>false});
}
function resetBankForTest() { bankAccount=freshBankAccount(); bankVisit=freshBankVisit(); updateHud(); }

// ---------------------------------------------------------------- mall food hall
// A stall order is two turns: choose what is on the physical board, then answer the server's own
// question. Confirming the answer pays once, applies the meal once and uses a chair that is really
// present on level three. Escape at either panel is a clean cancellation and costs nothing.
const mallFoodVendors = () => Object.keys(MALL_FOOD);
function openMallFood(vendor) {
  if (!vendor || vendor==='all') {
    Pick.show({
      title:'京味食集 · 选一家',
      sub:`先选档口 · ¥${Math.floor(money)} 在身上`,
      rows:mallFoodVendors().map(hz=>{
        const s=MALL_FOOD[hz], low=Math.min(...s.items.map(i=>i.price));
        return {hz,py:s.en,en:`choose the ${s.en} counter`,right:`¥${low}起`};
      }),
      onPick(r){ openMallFood(r.hz); return false; },
    });
    return;
  }
  const stall=MALL_FOOD[vendor];
  if (!stall) return;
  Pick.show({
    title:`${vendor} · 今天想吃什么？`,
    sub:`选一道 · choose a dish · 钱包 ¥${Math.floor(money)}`,
    rows:stall.items.map(item=>({
      hz:item.hz,py:item.py,en:item.en,right:`¥${item.price}`,off:money<item.price,item,
    })),
    onPick(r) {
      if (money<r.item.price) {
        toast(`钱不够 · <span class="dim">${r.item.hz} is ¥${r.item.price}; you have ¥${Math.floor(money)}</span>`);
        return false;
      }
      openMallFoodChoice(vendor,r.item);
      return false;
    },
  });
}

function openMallFoodChoice(vendor,item) {
  const stall=MALL_FOOD[vendor];
  Pick.show({
    title:`${vendor} · ${stall.ask}`,
    sub:`${item.hz} ¥${item.price} · ${stall.askEn}`,
    rows:stall.options.map(o=>({...o,right:'选择'})),
    onPick(option) {
      if (money<item.price) {
        toast(`钱不够 · <span class="dim">the order is ¥${item.price}</span>`);
        return false;
      }
      finishMallFood(vendor,item,option);
      return true;
    },
  });
}

function finishMallFood(vendor,item,option) {
  money-=item.price;
  advanceTime(22);
  for (const k in item.gain) needs[k]=clamp(needs[k]+item.gain[k],0,100);
  mallProgress.foodOrders++;
  mallProgress.lastOrder={vendor,item:item.hz,option:option.hz,price:item.price,day:day|0};

  // The chairs are exported from the authored food court. Pick a stable one that changes between
  // orders; a diner never materialises in the central gangway or on an imaginary chair.
  const y=Mall.deckY(3);
  const seats=Mall.foodSeats.filter(s=>Math.abs(s.y0-y)<.02);
  const npcSeatIndexes=new Set();
  for(let i=0,k=0;i<seats.length&&k<22;i+=2+(i%3),k++) npcSeatIndexes.add(i);
  const freeSeats=seats.filter((s,i)=>!npcSeatIndexes.has(i));
  const vi=Math.max(0,mallFoodVendors().indexOf(vendor));
  const seat=freeSeats.length?freeSeats[(day*7+vi*11+mallProgress.foodOrders*5)%freeSeats.length]:null;
  if (seat) {
    P.x=seat.x; P.z=seat.z; P.lift=y; P.yaw=seat.yaw;
    P.vx=P.vz=0; P.speed=0; P.ground=0;
    CAM.fx=P.x; CAM.fz=P.z; CAM.tYaw=P.yaw;
    const pose={type:'sit',at:[P.x,P.z],yaw:P.yaw,seatY:.50};
    sitting={hz:'美食广场',at:[P.x,P.z],yaw:P.yaw,aisle:P.x,mall:true,pose};
  }
  const stamp=awardMallStamp('food');
  toast(`您的${item.hz}，${option.hz} · <span class="dim">¥${item.price} · ¥${Math.floor(money)} left${mallStampSuffix(stamp)}</span>`);
  Vocab.sentenceHTML(`我要${item.hz}，${option.hz}。`);
  logDiary(`在${vendor}点了${item.hz}，${option.hz}，${item.price}块。`,
    `Ordered ${item.en} at ${vendor}, ${option.en}, for ¥${item.price}.`,'mallfood');
  TrainAudio.mallCue('checkout');
  saveGame(); updateHud();
}

// ---------------------------------------------------------------- playable arcade
const ARCADE_PRICE=6;
const ARCADE_GAMES={
  cabinet:{hz:'星球防线',py:'xīngqiú fángxiàn',en:'planet defence',win:14,rounds:[
    {prompt:'敌机从左边来了！',en:'The enemy is coming from the left.',correct:'左边',rows:[['左边','zuǒbian','left'],['中间','zhōngjiān','middle'],['右边','yòubian','right']]},
    {prompt:'护盾快没了，先做什么？',en:'The shield is almost gone. What first?',correct:'护盾',rows:[['开火','kāihuǒ','fire'],['护盾','hùdùn','shield'],['加速','jiāsù','boost']]},
    {prompt:'出口在上面。',en:'The exit is above.',correct:'上',rows:[['下','xià','down'],['上','shàng','up'],['暂停','zàntíng','pause']]},
  ]},
  race:{hz:'极速赛车',py:'jísù sàichē',en:'speed racing',win:16,rounds:[
    {prompt:'前面是左弯。',en:'There is a left bend ahead.',correct:'左转',rows:[['右转','yòuzhuǎn','turn right'],['直走','zhízǒu','go straight'],['左转','zuǒzhuǎn','turn left']]},
    {prompt:'进弯以前要……',en:'Before entering the bend…',correct:'慢一点',rows:[['加速','jiāsù','speed up'],['慢一点','màn yìdiǎn','slow down'],['倒车','dàochē','reverse']]},
    {prompt:'出了弯，直路到了。',en:'Out of the bend: a straight.',correct:'加速',rows:[['停车','tíngchē','stop'],['加速','jiāsù','accelerate'],['右转','yòuzhuǎn','turn right']]},
  ]},
  dance:{hz:'节拍挑战',py:'jiépāi tiǎozhàn',en:'rhythm challenge',win:18,rounds:[
    {prompt:'记住：左、右、上',en:'Remember: left, right, up.',correct:'左 右 上',rows:[['左 右 上','zuǒ yòu shàng','left · right · up'],['右 左 下','yòu zuǒ xià','right · left · down'],['上 上 左','shàng shàng zuǒ','up · up · left']]},
    {prompt:'记住：上、下、右',en:'Remember: up, down, right.',correct:'上 下 右',rows:[['下 上 左','xià shàng zuǒ','down · up · left'],['上 下 右','shàng xià yòu','up · down · right'],['右 右 上','yòu yòu shàng','right · right · up']]},
    {prompt:'最后：右、左、右',en:'Final: right, left, right.',correct:'右 左 右',rows:[['左 右 左','zuǒ yòu zuǒ','left · right · left'],['右 左 右','yòu zuǒ yòu','right · left · right'],['右 上 下','yòu shàng xià','right · up · down']]},
  ]},
  claw:{hz:'抓娃娃挑战',py:'zhuā wáwa tiǎozhàn',en:'claw challenge',win:17,rounds:[
    {prompt:'粉色兔子在左边。',en:'The pink rabbit is on the left.',correct:'左边',rows:[['右边','yòubian','right'],['中间','zhōngjiān','middle'],['左边','zuǒbian','left']]},
    {prompt:'爪子已经对准了。',en:'The claw is lined up.',correct:'现在下爪',rows:[['等一下','děng yíxià','wait'],['现在下爪','xiànzài xià zhuǎ','drop now'],['往右一点','wǎng yòu yìdiǎn','a little right']]},
    {prompt:'娃娃往右边滑了。',en:'The toy slipped to the right.',correct:'往右一点',rows:[['往左一点','wǎng zuǒ yìdiǎn','a little left'],['别动','bié dòng','hold still'],['往右一点','wǎng yòu yìdiǎn','a little right']]},
  ]},
};
const ARCADE_PRIZES=[
  {hz:'球',py:'qiú',en:'arcade ball',tickets:20},
  {hz:'拼图',py:'pīntú',en:'neon puzzle',tickets:45},
  {hz:'娃娃',py:'wáwa',en:'pink rabbit plush',tickets:80},
  {hz:'遥控车',py:'yáokòngchē',en:'remote-control racer',tickets:130},
];

// The three arcade entry points hand over to js/mall-arcade.js when it is loaded, and keep their
// own inline version for when it is not. `ArcadeSys` owns the real minigames, the card, the
// scoreboards and the broken-machine roll; these menus were always the stand-in.
function openArcadeLobby() {
  if (window.ArcadeSys) return ArcadeSys.openLobby();
  Pick.show({
    title:'霓虹游戏厅 · 选游戏',
    sub:`每局 ¥${ARCADE_PRICE} · ${mallProgress.tickets} 张票 · 钱包 ¥${Math.floor(money)}`,
    rows:[...Object.entries(ARCADE_GAMES).map(([kind,g])=>({
      kind,hz:g.hz,py:g.py,en:g.en,right:`¥${ARCADE_PRICE}`,off:money<ARCADE_PRICE,
    })),{prize:true,hz:'兑奖处',py:'duìjiǎng chù',en:'trade tickets for prizes',right:`${mallProgress.tickets}票`}],
    onPick(r){
      if (r.prize) { openArcadePrizes(); return false; }
      if (money<ARCADE_PRICE) { toast('钱不够 · <span class="dim">each game is ¥6</span>'); return false; }
      openArcadeGame(r.kind,false); return false;
    },
  });
}

function openArcadeGame(kind,paid=false) {
  // `playCab` resolves both spellings of every cabinet, so existing `arcadeGame` tags and the USE
  // row keep working with no re-tag and no save migration.
  if (window.ArcadeSys) return ArcadeSys.playCab(kind, { paid });
  const game=ARCADE_GAMES[kind];
  if (!game) return;
  if (!paid) {
    if (money<ARCADE_PRICE) { toast('钱不够 · <span class="dim">each game is ¥6</span>'); return; }
    money-=ARCADE_PRICE;
  }
  mallProgress.arcadePlays++;
  saveGame(); updateHud();
  let round=0, correct=0;
  function showRound() {
    const q=game.rounds[round];
    Pick.show({
      title:`${game.hz} · 第${round+1}/${game.rounds.length}关`,
      sub:`${q.prompt} · ${q.en}`,
      rows:q.rows.map(([hz,py,en])=>({hz,py,en,right:'选择'})),
      onPick(r) {
        if (r.hz===q.correct) correct++;
        round++;
        if (round<game.rounds.length) { showRound(); return false; }
        const perfect=correct===game.rounds.length;
        const won=4+correct*3+(perfect?game.win-13:0);
        mallProgress.tickets+=won;
        if (perfect) mallProgress.arcadeWins++;
        advanceTime(7);
        needs.mood=clamp(needs.mood+(perfect?15:7),0,100);
        needs.rest=clamp(needs.rest-3,0,100);
        const stamp=awardMallStamp('arcade');
        toast(`${perfect?'满分！':'游戏结束'} +${won}张票 · <span class="dim">${correct}/${game.rounds.length} correct · 共${mallProgress.tickets}张${mallStampSuffix(stamp)}</span>`);
        Vocab.sentenceHTML(perfect?'我赢了！':'再玩一次吧。');
        logDiary(`在游戏厅玩了${game.hz}，答对${correct}关，赢了${won}张票。`,
          `Played ${game.en} in the arcade: ${correct} right, ${won} tickets.`, 'mallarcade');
        TrainAudio.mallCue('arcade'); saveGame(); updateHud();
        return true;
      },
    });
  }
  showRound();
}

function openArcadePrizes() {
  if (window.ArcadeSys) return ArcadeSys.openPrizes();
  Pick.show({
    title:'兑奖处 · 换礼物',
    sub:`手里有 ${mallProgress.tickets} 张票 · choose one prize`,
    rows:ARCADE_PRIZES.map(p=>({
      ...p,right:`${p.tickets}票`,
      en:mallProgress.prizes.includes(p.hz)?`${p.en} · already claimed`:p.en,
      off:mallProgress.tickets<p.tickets||mallProgress.prizes.includes(p.hz),
    })),
    onPick(p) {
      if (mallProgress.prizes.includes(p.hz)) {
        toast(`已经换过了 · <span class="dim">you already claimed the ${p.en}</span>`); return false;
      }
      if (mallProgress.tickets<p.tickets) {
        toast(`彩票不够 · <span class="dim">${p.tickets} needed; you have ${mallProgress.tickets}</span>`); return false;
      }
      mallProgress.tickets-=p.tickets; mallProgress.prizes.push(p.hz);
      if (!mallBought.includes(p.hz)) mallBought.push(p.hz);
      needs.mood=clamp(needs.mood+10,0,100);
      toast(`换到了${p.hz} · <span class="dim">${p.tickets} tickets · ${mallProgress.tickets} left</span>`);
      Vocab.sentenceHTML(`我用彩票换了${p.hz}。`);
      logDiary(`在游戏厅用${p.tickets}张彩票换了${p.hz}。`,
        `Traded ${p.tickets} arcade tickets for the ${p.en}.`,'mallprize');
      saveGame(); updateHud(); return true;
    },
  });
}

function openMallEvents() {
  const now=Mall.eventAt(minutes);
  const today=Mall.eventsToday?Mall.eventsToday():Mall.EVENTS;
  Pick.show({
    title:'中庭活动 · 今日节目',
    sub:now.active?`${now.hz}正在进行 · happening now`:`下一场 ${now.clock} ${now.hz}`,
    rows:today.map(e=>({
      hz:`${e.clock} ${e.hz}`,py:e.py,en:e.en,
      right:now.active&&now.key===e.key?'进行中':now.key===e.key?'下一场':'今日',off:true,
    })),
    onPick:()=>false,
  });
}
// The cinema ticket in your pocket: { film, en, clock } for the screening it was sold for. The box
// office writes it, the seat in 一号厅 reads it and tears it up. Deliberately not saved — it is a
// ticket for the next showing, and a reload is a new afternoon.
let cinemaTicket = null;
const CINEMA_PRICE = 45;

// The box office. A cinema that only ever sells you the next showing is a turnstile; what makes it
// a box office is that the day's programme is in front of you and you pick one off it, which is the
// same shape as the shop catalogue and the metro ticket machine. Showings already gone are shown
// greyed rather than hidden, because 那场已经开始了 is a thing you get told at a real counter.
//
// The seat comes with the ticket and is not chosen — that is how a small cinema sells them, and it
// gives 电影票 something to say: the row and seat are then the only way into 一号厅.
function openCinema() {
  const now = minutes;
  Pick.show({
    title: '星光电影院 · 今日排片',
    sub: `¥${CINEMA_PRICE} 一张 · ¥${money} 在身上 · pick a screening`,
    rows: Mall.SHOWS.map(s => {
      const gone = s.at < now - 15;
      return { hz: `${String(Math.floor(s.at / 60)).padStart(2, '0')}:${String(s.at % 60).padStart(2, '0')} ${s.film}`,
               py: s.en, en: gone ? 'already started' : `${s.mins} minutes`,
               right: `¥${CINEMA_PRICE}`, off: gone || money < CINEMA_PRICE };
    }),
    onPick(r) {
      const s = Mall.SHOWS.find(q => r.hz.endsWith(q.film) && r.py === q.en);
      if (!s) return false;
      if (s.at < now - 15) {
        toast(`那场已经开始了 · <span class="dim">that one has started — pick a later showing</span>`);
        return false;
      }
      if (money < CINEMA_PRICE) {
        toast(`钱不够 · <span class="dim">a ticket is ¥${CINEMA_PRICE}; you have ¥${money}</span>`);
        return false;
      }
      money -= CINEMA_PRICE;
      // Six rows of ten. Deterministic off the showing so the same ticket is the same seat, and
      // away from the very front, which is where nobody wants to sit and every cinema knows it.
      const row = 2 + (s.at % 5), num = 1 + ((s.at * 7) % 10);
      const clock = `${String(Math.floor(s.at / 60)).padStart(2, '0')}:${String(s.at % 60).padStart(2, '0')}`;
      // `student` and `glasses` ride on the ticket because CinemaSys needs them at the door and
      // they are properties of the purchase, not of the person: a concession bought today does not
      // apply to tomorrow's film, and the glasses go back when you leave.
      cinemaTicket = { film: s.film, en: s.en, clock, mins: s.mins, seat: `${row}排${num}座`,
                       student: false, glasses: false };
      toast(`${clock}《${s.film}》· <span class="dim">${cinemaTicket.seat} · `
          + `¥${money} left · screen one is through the doors</span>`);
      Vocab.sentenceHTML(`我的座位是${cinemaTicket.seat}。`);
      logDiary(`买了${clock}《${s.film}》的电影票，${cinemaTicket.seat}，四十五块。`,
               `Bought a ticket for ${s.en} at ${clock} — ${cinemaTicket.seat}, ¥${CINEMA_PRICE}.`,
               'cinematicket');
      return true;
    },
  });
}

// The catalogue, as a picker. Prices you cannot meet are shown and refused rather than hidden:
// being told 太贵了 in a shop is worth more to a learner than a row that quietly disappears.
function openMallShop(shop) {
  const items = MALL_GOODS[shop];
  if (!items) return;
  // Say where the basket went, once, at the first moment it makes any sense to hear it. Told at
  // load instead it would arrive on the street outside, about a shop the player has forgotten.
  if (mallBasketLeft) {
    const b = mallBasketLeft; mallBasketLeft = null;
    toast(`上次拿的${b.n}件已经放回货架 · <span class="dim">the ${b.n} thing`
      + `${b.n === 1 ? '' : 's'} you were holding (¥${b.total}) went back on the shelf — `
      + 'nothing unpaid is kept</span>');
  }
  Pick.show({
    title: `${shop} · 挑一件`,
    sub: mallBasket.length
      ? `拿着 ${mallBasket.length} 件 ¥${mallTotal()} · ¥${money - mallTotal()} left · `
        + `Esc when you are done, then pay at 收银台`
      : `¥${money} 在身上 · take what you want, then pay at 收银台`,
    rows: items.map(it => ({ hz: it.hz, py: it.py, en: it.en,
                             right: `¥${it.price}`,
                             off: money < mallTotal() + it.price })),
    onPick(r) {
      const it = items.find(q => q.hz === r.hz);
      if (!it) return false;
      if (money < it.price) {
        toast(`太贵了 · <span class="dim">${it.hz} is ¥${it.price}; you have ¥${money}</span>`);
        return false;
      }
      // Everything in the basket has to come from the same shop, because that is where the till
      // is that can take money for it.
      if (basketShop() && basketShop() !== shop) {
        toast(`先去付钱 · <span class="dim">pay for the ${basketShop()} things first</span>`);
        return false;
      }
      // What you can afford is what you can afford *including* what is already in your hands.
      if (money < mallTotal() + it.price) {
        toast(`钱不够 · <span class="dim">${it.hz} is ¥${it.price}; `
            + `¥${money - mallTotal()} left after what you are carrying</span>`);
        return false;
      }
      mallBasket.push({ shop, item: it });
      const n = mallBasket.length;
      toast(`拿着${it.hz} · <span class="dim">${n} item${n > 1 ? 's' : ''}, `
          + `¥${mallTotal()} · take them to 收银台</span>`);
      Vocab.sentenceHTML(n > 1 ? `还要一个${it.hz}。` : `我要这个${it.hz}。`);
      // Deliberately left open. A shop you have to walk back into for the second thing is a shop
      // nobody buys two things in.
      return false;
    },
  });
}
// Paying, for everything in your hands at once. The money moves, the things become yours, and if
// one of them was a coat you are wearing it.
//
// The receipt is the part worth having. A shop where you hand over money and get a toast saying
// 买好了 teaches one word; a shop that reads back what you bought, what each one cost, what it came
// to and what you have left teaches the numbers, and the numbers are the hard part. It goes in the
// diary too, so it is still there when you have forgotten what 收银台 meant.
function mallPay(paid) {
  if (!mallBasket.length) return;
  const shop = basketShop();
  const items = mallBasket.map(b => b.item);
  const total = mallTotal();
  // Read before the basket is emptied below, and kept so the receipt can show the offer rather
  // than a total that silently disagrees with the prices printed above it.
  const bookOff = bookPromoOff(mallBasket);
  const before = money;
  if (!paid) money = Math.max(0, money - total);
  mallBasket = [];
  for (const item of items) {
    if (item.wear) {
      TOP = C(item.wear); TOPL = tint(TOP, 1.24); TOPD = tint(TOP, 0.76);
    }
    if (item.eat) for (const k in item.eat) needs[k] = clamp(needs[k] + item.eat[k], 0, 100);
    for (const k of ['mood', 'rest', 'clean']) if (item[k]) needs[k] = clamp(needs[k] + item[k], 0, 100);
    if (item.keep || item.wear) mallBought.push(item.hz);
    // `mallBought` is a list of names with no food semantics — it cannot tell a bag of rice from a
    // pair of shoes, so a supermarket trip in the shopping centre put nothing in the fridge and the
    // 超市 downstairs was the only place food came from. `Pantry.isFood` already answers this for
    // every grocery the centre plausibly sells.
    if (Pantry.isFood && Pantry.isFood(item.hz)) stow(item.hz);
  }
  // Grouped before it is recorded, because two of the same thing is a quantity on a receipt and
  // not two lines — and because "how many did I buy" is one of the questions this exists to answer.
  const lines = [];
  for (const it of items) {
    const e = lines.find(q => q.hz === it.hz);
    if (e) { e.qty++; e.line += it.price; }
    else lines.push({ hz:it.hz, en:it.en, price:it.price, qty:1, line:it.price });
  }
  mallReceipts.push({ no:++mallReceiptNo, day:day|0, at:Math.round(minutes), shop,
                      items:lines, total, paid:!!paid,
                      ...(bookOff ? { off:bookOff, offWhy:'买二送一' } : {}) });
  if (mallReceipts.length > MALL_RECEIPTS_KEPT)
    mallReceipts.splice(0, mallReceipts.length - MALL_RECEIPTS_KEPT);
  // 一共 is the word the till actually says, and it is the one worth having: every shop, every
  // market stall and every restaurant in the country ends the transaction with it.
  const line = items.map(it => `${it.hz} ¥${it.price}`).join(' · ');
  const stamp=awardMallStamp('shopping');
  toast(`一共${total}块 · <span class="dim">${line}`
    + (bookOff ? ` · 买二送一 −¥${bookOff}` : '')
    + ` · ¥${money} left${mallStampSuffix(stamp)}</span>`);
  Vocab.sentenceHTML(`一共${total}块。`);
  logDiary(`在${shop}买了${items.map(it => it.hz).join('、')}，一共${total}块。`,
           `Bought ${items.map(it => it.en).join(', ')} at the ${shop} for ¥${total}` +
           (paid ? '' : ` — ¥${before} down to ¥${money}`) + '.', 'mallbuy');
}

const CARD_PRICE = 20, CARD_OFF = 1, TOPUPS = [10, 20, 50];
// The machine writes its amounts the way a machine in China writes them.
const CN_NUM = { 10: '十', 20: '二十', 50: '五十' };
const fareFor = legs => FARES[clamp(legs, 1, FARES.length) - 1];
const stationIndex = hz => Math.max(0, Metro.STATIONS.findIndex(s => s.hz === hz));
const legsBetween = (a, b) => Math.abs(stationIndex(a) - stationIndex(b));

let ticket = null;                // { to, fare } — the single in your pocket, or nothing
let card = null;                  // { bal } — the travel card, once you have bought one
let tapIn = null;                 // the station you tapped in at, for working out the fare
let station = '杨柳胡同';
// Which side of the turnstiles you are standing on — read off where you are, not remembered.
// The gates open and you walk through them, so a flag would go stale the moment you did.
const pastGateNow = () => place === 'metro' && P.z > Metro.GATEZ;
// What the fare would be at the gate you are standing at, and on what. `null` means the gate has
// nothing to take and will not open.
function exitFare() {
  const legs = tapIn ? legsBetween(tapIn, station) : 1;
  if (ticket) {
    const owed = Math.max(0, fareFor(Math.max(1, legs)) - ticket.fare);
    return { kind: 'ticket', owed, right: ticket.to === station };
  }
  if (card) return { kind: 'card', owed: Math.max(2, fareFor(Math.max(1, legs)) - CARD_OFF) };
  return null;
}

// ---------------------------------------------------------------- 工作 the job you are on
// What the whiteboard has assigned you. The desk does whatever this is and pays for it; without
// one there is nothing to do at the desk, which is roughly true of an office.
let job = null;
let clockedDay = 0;               // the last day you clocked in, for the attendance bonus
// F4 retains the original workroom 1.35 m north of its old one-room coordinates so the shared
// east-west escape spine stays clear. The established seated career poses move with that room.
const OFFICE_SUITE_DZ = -1.35;
const officeSuiteAt = at => [at[0],at[1]+OFFICE_SUITE_DZ];

// ---------------------------------------------------------------- the chooser drawer
// Three places in this game hand you a list too long to fit behind one keypress: seventeen dishes
// on the restaurant's board, six jobs on the office whiteboard, six stations on the subway line.
// They are all the same interaction, so they are all the same panel.
//
// A row is either a heading — `{ sec, en }` — or something you can take: `{ hz, py, en, right }`
// plus `off` for a line that is there to be read but not chosen, which is how a dish you cannot
// afford and a station that has not opened both look. `onPick` gets the row back and returns true
// to close the drawer or false to leave it up, so a refusal can stay on screen.
const Pick = (() => {
  let open = false, cfg = null, rows = [], idx = 0;
  const el = () => $('#pick');

  function render() {
    $('#pickTitle').textContent = cfg.title;
    $('#pickSub').textContent = cfg.sub;
    let html = '', k = 0;
    for (const r of cfg.rows) {
      if (r.sec) { html += `<div class="sec">${r.sec}<span>${r.en || ''}</span></div>`; continue; }
      // A line you read rather than choose: the items on a hotel bill, a receipt, a total. It was
      // being drawn with `off:true`, which is `.mrow.no` — 30% opacity and a red price, i.e. the
      // house style for "you cannot have this". An itemised bill is the one list in the game that
      // exists to be read, and at 30% the amount you are owed was the least legible thing on the
      // panel. A `read` row keeps full contrast and the gold price, takes no keyboard cursor and
      // no click, and so cannot be mistaken for a refused choice.
      if (r.read) {
        html += `<div class="mrow" style="cursor:default;background:none;border-color:transparent">`
          + `<div class="h">${r.hz}</div>`
          + `<div class="m"><i>${r.py || ''}</i>${r.en || ''}</div>`
          + `<div class="p">${r.right || ''}</div></div>`;
        continue;
      }
      const i = k++;
      const dish = cfg.skin === 'restaurant' && r.dish;
      const icon = dish ? ({ noodle:'面', rice:'饭', soup:'汤', plate:'菜', bottle:'饮' }[dish.kind] || '味') : '';
      html += `<div class="mrow${i === idx ? ' on' : ''}${r.off ? ' no' : ''}${dish ? ' dishrow' : ''}" data-i="${i}"${dish ? ` data-kind="${dish.kind}"` : ''}>`
        + (dish ? `<div class="dishicon">${icon}</div>` : '')
        + `<div class="h">${r.hz}</div>`
        + `<div class="m"><i>${r.py || ''}</i>${r.en || ''}`
        + (dish ? `<small>现点现做 · ${dish.cook} 分钟${r.badge ? ` · <b>${r.badge}</b>` : ''}</small>` : '')
        + `</div>`
        + `<div class="p">${r.right || ''}</div></div>`;
    }
    const host = $('#pickList');
    host.innerHTML = html;
    host.querySelectorAll('.mrow').forEach(e => {
      e.onclick = () => { idx = +e.dataset.i; api.confirm(); };
    });
    const on = host.querySelector('.mrow.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  const api = {
    show(c) {
      cfg = c;
      rows = c.rows.filter(r => !r.sec && !r.read);
      idx = Math.max(0, rows.findIndex(r => r.hz === c.start));
      open = true;
      el().classList.toggle('restaurant', c.skin === 'restaurant');
      el().classList.add('on');
      setSurfaceOpen('#pick', true);
      render();
    },
    close() {
      if (!open) return;
      open = false;
      el().classList.remove('on');
      setSurfaceOpen('#pick', false);
    },
    move(step) {
      if (!rows.length) return;
      idx = (idx + step + rows.length) % rows.length;
      render();
    },
    confirm() {
      const r = rows[idx];
      if (!r) return;
      if (cfg.onPick(r) !== false) api.close();
      else render();                     // the refusal may have changed what is affordable
      updateHud();
    },
    get isOpen() { return open; },
    get at() { const r = rows[idx]; return r && r.hz; },
  };
  return api;
})();
const menuOpen = () => Pick.isOpen;      // read by the movement and key handlers

// Every overlay has an explicit exit for touch, switch-control and pointer users. Keyboard
// shortcuts remain conveniences, not the only way out of a surface.
$('#cardClose').addEventListener('click', closeCard);
$('#talkClose').addEventListener('click', closeTalk);
$('#bookClose').addEventListener('click', () => { if (bookOpen) toggleBook(); });
$('#pickClose').addEventListener('click', () => Pick.close());

// ---- the restaurant's menu. Opened at the board it only settles what you fancy; opened at the
// waitress it is the order, and the money moves when you confirm a line.
function openMenu(mode) {
  Pick.show({
    skin: 'restaurant',
    title: '老李面馆 · 菜单',
    sub: (mode === 'order' ? '点菜 · made to order' : '看看今天想吃什么 · browse today’s menu')
      + `　·　钱包 ¥${Math.floor(money)}`,
    start: chosen,
    rows: Diner.MENU.map(r => r.sec ? { sec: r.sec, en: r.en } : {
      hz: r.hz, py: r.py, en: r.en, right: '¥' + r.price,
      off: mode === 'order' && money < r.price, dish: r,
      badge: r.hz === chosen ? '今日想吃' : '',
    }),
    onPick(r) {
      if (mode === 'order') {
        const no = placeOrder(r.hz);
        if (no) { say(no[0], no[1]); return false; }
        return true;
      }
      chosen = r.hz;
      say(`我想吃${r.hz}。`, `I think I'll have the ${r.en}.`);
      Vocab.sentenceHTML(r.hz);
      return true;
    },
  });
}

// ---------------------------------------------------------------- 地图 the minimap
// The line as the wall map in the station draws it, with the doors you could walk into at
// whichever end of it you are standing at. Clicking a station is a ride and clicking a door is
// the walk across the pavement into it.
//
// Fast travel here is a shortcut through the walking, not through the economy: it pays the same
// distance fare the gate would have taken, off the same single or card, and it burns the same
// minutes the ride would have burnt. What it saves you is the four keypresses and the stairs.
//
// The buildings are listed against the station they are reachable from, because that is the
// question a map is for: you cannot get into the noodle shop from the airport, and the map ought
// to say so rather than teleporting you into it.
const officeFloorAt=key=>OFFICE_FLOORS.find(f=>f.key===key);
const isOfficePlace=key=>key==='officeLift'||!!officeFloorAt(key);
const sameDoorPlace=(a,b)=>a===b||(a==='office1'&&isOfficePlace(b));
const DOORS = [
  { hz: '家',   en: 'your building lobby', place: 'home', at: '杨柳胡同', mins: 2 },
  { hz: '超市', en: 'the shop',        place: 'shop',   at: '杨柳胡同', mins: 3 },
  { hz: '餐馆', en: 'the noodle shop', place: 'diner',  at: '杨柳胡同', mins: 3 },
  { hz: '街上', en: 'the hutong',      place: 'street', at: '杨柳胡同', mins: 2 },
  { hz: '公司', en: 'the office complex', place: 'office1', at: '商务区', mins: 3 },
  { hz: '购物中心', en: 'the shopping mall', place: 'mall', at: '商务区', mins: 4 },
  { hz: '医院', en: 'Beijing Renhe Hospital', place: 'hospital', at: '商务区', mins: 4 },
  { hz: '银行', en: 'Beijing Bank', place: 'bank', at: '商务区', mins: 3 },
  { hz: '京华大酒店', en: 'Jinghua Grand Hotel', place: 'hotel', at: '商务区', mins: 5 },
  { hz: '街上', en: 'the main road',   place: 'street', at: '商务区',   mins: 2 },
];
const RIDE_BOARD = 5, RIDE_LEG = 3;    // minutes: getting down there, then per stop
// Which station you are standing at. `station` only remembers the last one you rode to, so it is
// no use for this: where you are is a question about the room you are in, and on the street it is
// a question about which end of it you are on.
const DISTRICT = { officeB1:'商务区',office1:'商务区',office2:'商务区',office3:'商务区',
                   office:'商务区',office5:'商务区',office6:'商务区',office7:'商务区',officeRoof:'商务区',
                   officeLift:'商务区', mall: '商务区', bank: '商务区',
                   hospital:'商务区', hospital2:'商务区', hospital3:'商务区', hospital4:'商务区',
                   hotelB1:'商务区',hotel:'商务区',hotel2:'商务区',hotel3:'商务区',hotel4:'商务区',
                   hotel5:'商务区',hotel6:'商务区',hotel7:'商务区',hotel8:'商务区',hotel9:'商务区',
                   hotel10:'商务区',hotel11:'商务区',hotel12:'商务区',
                   hotelLift:'商务区',
                   campus: '大学城', classroom:'大学城', library:'大学城', rail: '火车站',
                   park: '公园', zoo: '动物园', zoo_tropical: '动物园', airport: '机场' };
function hereStation() {
  if (place === 'metro' || place === 'train') return station;
  if (DISTRICT[place]) return DISTRICT[place];
  if (place === 'street') return P.x > 29 ? '商务区' : '杨柳胡同';
  return '杨柳胡同';                   // the flat, the shop and the noodle place are all on it
}
// What the map would charge for a ride: nothing if you are holding a single made out to that
// station, the discounted fare off the card if you have one, otherwise cash.
function mapFare(hz) {
  const legs = legsBetween(hereStation(), hz);
  if (!legs) return { legs, cost: 0, how: 'here' };
  if (ticket && ticket.to === hz) return { legs, cost: 0, how: 'ticket' };
  const f = fareFor(legs);
  if (card && card.bal >= f - CARD_OFF) return { legs, cost: f - CARD_OFF, how: 'card' };
  return { legs, cost: f, how: 'cash' };
}
function travelBlocked() {
  if (paused || Pick.isOpen) return true;
  if (doing) { say('先把手里的事做完。', 'Finish what you are doing first.'); return true; }
  if (ride) { say('车还没到站呢。', 'You are on a moving train.'); return true; }
  if (place === 'hotelLift' && HotelLift.state().phase !== 'idle') {
    say('电梯还在运行，请等到开门。', 'The lift is moving. Wait for the doors to open.'); return true;
  }
  if (place === 'officeLift' && OfficeLift.state().phase !== 'idle') {
    say('公司客梯还在运行，请等到开门。', 'The office lift is moving. Wait for the doors to open.'); return true;
  }
  // 二号线 is a Beijing line. Out of town the only way anywhere is the coach at the far end,
  // and each city says so in its own words.
  const away = AWAY[place];
  if (away) { say(away.noRide[0], away.noRide[1]); return true; }
  return false;
}
function travelToStation(hz) {
  if (travelBlocked()) return;
  const s = Metro.STATIONS.find(q => q.hz === hz);
  if (!s || !s.out) return;
  const f = mapFare(hz);
  if (f.how === 'here') { say('已经在这儿了。', 'You are already here.'); return; }
  if (f.how === 'cash' && money < f.cost) {
    say(`不够，票价${f.cost}块。`, `Not enough — the fare is ¥${f.cost}.`); return;
  }
  if (f.how === 'ticket') ticket = null;
  else if (f.how === 'card') card.bal -= f.cost;
  else money -= f.cost;
  tapIn = null;
  station = hz; Metro.setStation(hz);
  setPlace(s.out.place, s.out.at);
  // The delay, if the line is having one, on top of the fare's own minutes. Read before the clock
  // moves: the journey costs what it cost at the moment you got on, not what it would cost at the
  // moment you got off, which after a twenty-minute ride can be a different rush window.
  const late = Disrupt.metroMinutes(day, minutes);
  advanceTime(RIDE_BOARD + f.legs * RIDE_LEG + late);
  goalEvent('travel', hz);
  const paid = f.how === 'ticket' ? '用了那张单程票'
    : f.how === 'card' ? `刷卡${f.cost}块` : `${f.cost}块`;
  say(`坐地铁到${hz}，${paid}。`, `Subway to ${s.en}. ${f.how === 'ticket'
    ? 'Your single was for it.' : `¥${f.cost}${f.how === 'card' ? ' off the card' : ''}.`}`);
  // Said afterwards, and only if it actually cost you something. The line map has been carrying
  // this warning since the morning; this is the moment it stops being a warning.
  if (late >= 3) {
    const n = Disrupt.metroNotice(day, minutes);
    toast(`晚了 ${late} 分 · <span class="dim">${n.en}</span>`);
    for (const w of n.words) Vocab.brush(w);
  }
  updateHud();
}
// A shut shop is shut from the map too. The hours live on the door's own USE entry, so the map
// reads them off there rather than keeping a second copy that could disagree with the shutter.
function doorShut(d) {
  const o = USE[d.hz] && USE[d.hz].open;
  if (!o) return false;
  const h = minutes / 60;
  return h < o[0] || h >= o[1];
}
function travelToDoor(d) {
  if (travelBlocked()) return;
  if (sameDoorPlace(d.place,place)) {
    say(isOfficePlace(place)?'已经在这栋楼里了。':'已经在这儿了。',
      isOfficePlace(place)?'You are already in this building.':'You are already there.');
    return;
  }
  if (d.at !== hereStation()) return;
  if (doorShut(d)) { say('关门了，明天再来吧。', 'Shut. Come back tomorrow.'); return; }
  // The street is one long road with a station at either end of it, so which end matters: its own
  // spawn is outside the flat, which is the wrong pavement entirely if you came from the office.
  const s = Metro.STATIONS.find(q => q.hz === d.at);
  setPlace(d.place, d.place === 'street' && s ? s.out.at : undefined);
  advanceTime(d.mins);
  say(`到${d.hz}了。`, `You walk into ${d.en}.`);
  updateHud();
}
// Rebuilt only when something on it would look different, because it is redrawn from the HUD
// tick four times a second and the marker follows you down the street.
let mapSig = '';
function updateMap() {
  // Out of town the map has nothing to offer: no line, no doors, and one thing to say.
  if (AWAY[place]) {
    if (mapSig === place) return;
    mapSig = place;
    $('#mapLine').innerHTML = '';
    $('#mapHere').innerHTML = `<span class="none">${AWAY[place].map}</span>`;
    return;
  }
  const here = hereStation();
  // The delay is in the signature because it changes on the hour the rush window opens and shuts,
  // and a banner that only refreshed when the fare changed would tell you the line was fine right
  // through the morning it was not.
  const late = Disrupt.metro(day, minutes);
  const sig = [here, place, Math.floor(money), card && card.bal, ticket && ticket.to,
               late && late.mins,
               Math.floor(minutes / 30)].join('|');   // the half hour, for shutters
  if (sig === mapSig) return;
  mapSig = sig;
  const line = $('#mapLine');
  line.innerHTML = Metro.STATIONS.map((s, i) => {
    const f = mapFare(s.hz);
    const on = s.hz === here;
    const shut = !s.out || (f.how === 'cash' && money < f.cost);
    const lab = on ? '这儿' : f.how === 'ticket' ? '有票' : `¥${f.cost}`;
    return `<button class="stop${on ? ' on' : ''}${shut && !on ? ' no' : ''}`
      + `${f.how === 'ticket' ? ' free' : ''}" data-hz="${s.hz}" `
      + `title="${s.hz} · ${s.en}${on ? '' : ` · ${f.legs} stop${f.legs === 1 ? '' : 's'}`}">`
      + `<span class="fx">${lab}</span><i></i>`
      + `<span class="nm">${s.hz}</span></button>`;
  }).join('');
  line.querySelectorAll('.stop').forEach(el => {
    el.onclick = () => { travelToStation(el.dataset.hz); updateMap(); };
  });
  const doors = DOORS.filter(d => d.at === here);
  const host = $('#mapHere');
  // 回家 in one press — offered exactly where the gap is, which is any station that is not the
  // one the building is on. At 杨柳胡同 the 家 door is already in the row and a second button saying
  // the same thing would be noise. See `fastHome`.
  const gap = place !== 'home' && !doors.some(d => d.place === 'home');
  const fare = gap ? mapFare('杨柳胡同') : null;
  host.innerHTML = (doors.length
    ? doors.map((d, i) => `<button class="door${sameDoorPlace(d.place,place) ? ' on' : ''}`
        + `${doorShut(d) ? ' shut' : ''}" data-i="${i}" `
        + `title="${d.hz} · ${d.en}${doorShut(d) ? ' · 关门了 shut' : ''}">${d.hz}</button>`)
        .join('')
    : `<span class="none">${here} · you are here</span>`)
    + (gap ? `<button class="door" data-home="1" title="回家 · straight back to your building, `
           + `${fare.legs} stop${fare.legs === 1 ? '' : 's'}`
           + `${fare.how === 'ticket' ? ' · 有票' : fare.cost ? ` · ¥${fare.cost}` : ''}`
           + `">回家</button>` : '');
  // Scoped to `[data-i]`: the 回家 button carries the same class and no index, and `doors[NaN]`
  // is undefined, which `travelToDoor` would read `.at` off and throw inside a click handler.
  host.querySelectorAll('.door[data-i]').forEach(el => {
    el.onclick = () => { travelToDoor(doors[+el.dataset.i]); updateMap(); };
  });
  const hb = host.querySelector('.door[data-home]');
  if (hb) hb.onclick = () => { fastHome(); updateMap(); };
  // ---- 服务信息. The one line on this panel that is worth reading rather than clicking.
  //
  // It is here, above the stations, because this is where the journey is chosen and a warning
  // that arrives after you have arrived is not a warning. Chinese first and the English under it,
  // in the order everything else in this game says things: the player who reads 延误 leaves ten
  // minutes earlier and gets to their desk by nine, and the player who does not is not stopped,
  // corrected or quizzed — they are just late, and their manager notices. That is the whole of
  // what "language is an advantage, not a gate" means, in one banner.
  const note = $('#mapNote');
  if (note) {
    const n = late && Disrupt.metroNotice(day, minutes);
    note.classList.toggle('on', !!n);
    note.innerHTML = n
      ? `<b>${n.hz}</b><span class="dim">${n.en}</span>`
      : '';
    // Seeing it is worth a little, the way every other Chinese the world puts in front of you is.
    // Never enough to master a word — that still takes answering something — but enough that 延误
    // is a word you have met by the time it costs you a morning.
    if (n) for (const w of n.words) Vocab.brush(w);
  }
}

// ---- 回家, in one press (UPGRADES.md:191). Getting back to the building from the airport, the
// mall or the zoo has always been two separate moves on the map — ride to 杨柳胡同, then take
// the 家 door — and there was no single thing anywhere that meant "go home".
//
// It does both legs by calling the same two functions the buttons call, rather than
// teleporting: the fare comes off the card or the wallet at the same rate, the single you are
// holding is still spent, and the clock advances by the ride plus the two-minute walk. A press
// that skipped any of that would be a cheat with a Chinese label on it.
//
// It deliberately cannot get you home from 外滩 or 宽窄巷子 — `travelBlocked` refuses out of
// town, and it should: the way back from a place you flew to is the 机场大巴 and the flight you
// already paid for, and being able to press 回家 in Chengdu would delete the trip.
function fastHome() {
  if (travelBlocked()) return;
  if (place === 'home') { say('已经到家了。', 'You are already home.'); return; }
  const door = DOORS.find(d => d.place === 'home');
  if (!door) return;
  if (hereStation() !== door.at) {
    const f = mapFare(door.at);
    if (f.how === 'cash' && money < f.cost) {
      say(`回家的票要${f.cost}块，不够。`,
          `The fare home is ¥${f.cost} and you do not have it. Walk, or earn some.`);
      return;
    }
    travelToStation(door.at);
    // It can still refuse — mid-ride, mid-action — and it has already said why.
    if (hereStation() !== door.at) return;
  }
  travelToDoor(door);
}

// ---- 自动售票机. Two things are sold here and they are sold differently, so the machine asks
// which before it asks anything else — the same two-level drawer the phone uses for its two apps.
function openTicket() {
  Pick.show({
    title: '自动售票机',
    sub: `Ticket machine — ¥${Math.floor(money)} in your wallet`
       + (card ? ` · 交通卡 ¥${card.bal}` : '')
       + (ticket ? ` · 单程票 到${ticket.to}` : ''),
    rows: [
      { sec:'买什么', en:'what would you like' },
      { hz:'单程票', py:'dānchéngpiào', en:'a single, priced by how far you are going',
        right:'¥3–5', pane:'single' },
      { hz:'交通卡', py:'jiāotōngkǎ', en: card
          ? `top up — ¥${card.bal} on it now, a kuai off every fare`
          : `a travel card — ¥${CARD_PRICE}, loaded, and a kuai off every fare`,
        right: card ? '充值' : `¥${CARD_PRICE}`, pane:'card' },
    ],
    onPick(r) { ticketPane(r.pane); return false; },
  });
}

function ticketPane(which) {
  const here = station;
  if (which === 'single') {
    Pick.show({
      title: '单程票',
      sub: `A single from ${Metro.stationAt().en} — ¥${Math.floor(money)} in your wallet`,
      rows: [{ hz:'返回', py:'fǎnhuí', en:'back', back:true },
             { sec:'到哪儿', en:'where to' }].concat(
        Metro.STATIONS.map(s => {
          const legs = legsBetween(here, s.hz), f = fareFor(Math.max(1, legs));
          return { hz: s.hz, py: s.py, st: s, fare: f,
            en: s.hz === here ? 'you are standing in it'
              : `${legs} stop${legs === 1 ? '' : 's'} · ${s.en}`,
            right: s.hz === here ? '在这儿' : `¥${f}`,
            off: s.hz === here || money < f || !!ticket };
        })),
      onPick(r) {
        if (r.back) { openTicket(); return false; }
        if (ticket) {
          say('我手里还有一张票。', 'You are already holding a single.'); return false;
        }
        if (r.hz === here) {
          say('这就是这一站。', 'This is the station you are standing in.'); return false;
        }
        if (money < r.fare) {
          say(`不够，票价${r.fare}块。`,
              `Not enough — the ticket is ¥${r.fare} and you have ¥${Math.floor(money)}.`);
          return false;
        }
        money -= r.fare;
        ticket = { to: r.hz, fare: r.fare };
        say(`一张到${r.hz}的票，${r.fare}块。`,
            `One single to ${r.st.en}. ¥${r.fare}.`);
        Vocab.sentenceHTML('单程票');
        return true;
      },
    });
    return;
  }
  Pick.show({
    title: '交通卡',
    sub: card ? `¥${card.bal} on the card — ¥${Math.floor(money)} in your wallet`
              : `No card yet — ¥${Math.floor(money)} in your wallet`,
    rows: [{ hz:'返回', py:'fǎnhuí', en:'back', back:true },
           { sec:'办卡', en:'the card itself' },
           { hz:'买卡', py:'mǎi kǎ', en:`a new card, ¥${CARD_PRICE} of credit on it`,
             right:`¥${CARD_PRICE}`, off: !!card || money < CARD_PRICE, buy:true },
           { sec:'充值', en:'top up' }].concat(
      TOPUPS.map(v => ({ hz: '充值' + CN_NUM[v] + '元', py:'chōngzhí', en: card
          ? `put ¥${v} on the card` : 'you need a card first',
        right:`¥${v}`, off: !card || money < v, top:v }))),
    onPick(r) {
      if (r.back) { openTicket(); return false; }
      if (r.buy) {
        if (card) { say('我已经有卡了。', 'You already have one.'); return false; }
        if (money < CARD_PRICE) {
          say(`不够，办卡要${CARD_PRICE}块。`,
              `Not enough — the card is ¥${CARD_PRICE} and you have ¥${Math.floor(money)}.`);
          return false;
        }
        money -= CARD_PRICE;
        card = { bal: CARD_PRICE };
        say(`一张交通卡，${CARD_PRICE}块。`, `One travel card. ¥${CARD_PRICE}.`);
        Vocab.sentenceHTML('交通卡');
        return true;
      }
      if (!card) { say('先买一张卡。', 'Buy a card first.'); return false; }
      if (money < r.top) {
        say(`不够，充值要${r.top}块。`,
            `Not enough — that top-up is ¥${r.top} and you have ¥${Math.floor(money)}.`);
        return false;
      }
      money -= r.top;
      card.bal += r.top;
      say(`充了${r.top}块，余额${card.bal}。`, `¥${r.top} on. ¥${card.bal} on the card now.`);
      Vocab.sentenceHTML('充值');
      return true;
    },
  });
}

// ---- 二号线. `ride` is whether you are actually standing at a train: read off the line map on
// the concourse wall the same list is a reference, and confirming a line only names the station.
function openTravel(ride) {
  const here = station;
  // ---- 末班车. `Disrupt.lastTrain` was defined and never read (H135). It is the other half of
  // arriving late: the desk is open all night and the last train is not, so the panel that offers
  // you a ride is where the closing time belongs — before you choose, not on the platform after.
  // Pure read, Chinese first, and it never refuses anything: it is a sentence, not a rule.
  const lt = (() => { try { return Disrupt.lastTrain(day, minutes); } catch (_) { return null; } })();
  const lastLine = !lt ? ''
    : lt.missed ? '末班车已经走了。 Last train has gone — the night bus or a taxi.'
    : lt.tight ? `末班车${(lt.last / 60) | 0}点，今天晚点，还有${lt.left}分钟。 Cutting it fine.`
    : `末班车${(lt.last / 60) | 0}点，还有${lt.left}分钟。 ${lt.left} min until the last train.`;
  Pick.show({
    title: '二号线',
    sub: lastLine || (ride ? 'Line 2 — where to?' : 'Line 2 — the whole line open'),
    start: here,
    rows: Metro.STATIONS.map(s => ({
      hz: s.hz, py: s.py, en: s.en,
      right: s.hz === here ? '在这儿' : s.out ? '通车' : '在建',
      off: s.hz === here || !s.out, st: s,
    })),
    onPick(r) {
      if (!ride) { say(`${r.hz}在二号线上。`, `${r.en} is on Line 2.`); return false; }
      if (r.hz === here) { say('这就是这一站。', 'This is the station you are standing in.'); return false; }
      // A station with no way out of it is dug and signed and not open. Saying so is the whole
      // point of listing it: the line is where the next district will arrive.
      if (!r.st.out) {
        say(`${r.hz}还没通车。`, `${r.en} has not opened yet — still being built.`);
        return false;
      }
      // Choosing a station no longer arrives at it. It is the stop you are going to sit on the
      // train and wait for, and confirming it puts you on the train.
      board(r.hz);
      return true;
    },
  });
}

// ---------------------------------------------------------------- 机票 flying
// One object carries the whole chain, and every refusal in the terminal is a question about
// which part of it is filled in yet: `f` the flight off the board, `checked` once a desk has
// given you a seat, `bag` once a case has gone down the belt, `cleared` once security has let
// you through. The money leaves your pocket at the ticket office and never comes back.
//
// The trip itself is not a place — there is no Shanghai in this game to fly to. What boarding
// buys you is two days off the calendar and the only large mood in the game, which is a fair
// account of what a holiday is.
let flight = null;
const trips = [];                 // where you have been, in the order you went
const FL = () => Airport.FLIGHTS;
const depOf = f => f.dep + f.late;
const hhmm = m => {
  const w = ((Math.round(m) % 1440) + 1440) % 1440;
  return String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
};
// Whether there is still time to be sold a seat on this one today. The schedule repeats every
// day and has no notion of a date, so rather than sell you tomorrow's flight — which the board
// and the desk would then both disagree with, one saying 起飞 and the other 太早了 — the office
// simply stops selling once check-in has shut, and tells you to come back in the morning.
const stillSellable = f => minutes < depOf(f) - Airport.SHUT_CK;
// The gate this flight is going from *now*. A flight can be moved between stands during the day —
// see Airport.gateOf — so nothing in here may cache it, and everything that shows one has to ask.
const gateNow = f => Airport.gateOf(f, minutes);
// Whether you know where you are going, and it is deliberately not a boolean. What you learned was
// a *number* — B12, off the loudspeaker or the board — and a flight that has since been moved to
// B14 leaves you holding a number that is now somebody else's gate.
//
// Storing which gate you learned rather than the fact that you learned one closes a hole that a
// boolean cannot: an announcement only plays in the terminal, so a gate that moves while you are
// in the park is never heard, and with a boolean you would walk back in still certain and be
// boarded at the wrong stand. Comparing what you know against what is true costs nothing and is
// right in every case, including that one.
const knowsGate = () => !!flight && flight.knewGate === gateNow(flight.f);

// ---- 售票处. Seven services, priced the way they are priced, and the cheapest of them is
// three shifts at the office — which is the point of putting it at the end of the line.
function openFlights() {
  Pick.show({
    title: '售票处',
    sub: `往返 return tickets — ¥${Math.floor(money)} in your wallet, ` +
         `and it is ${hhmm(minutes)}`,
    rows: [{ sec:'去哪儿', en:'where to — the price is there and back' }].concat(FL().map(f => {
      const open = stillSellable(f) && !f.cancelled;
      // The office window is the first place the day's disruption is visible, and it is worth
      // seeing before the money leaves your hand rather than after: a flight three hours late is
      // still worth buying, and one that is not going at all is not.
      const note = f.cancelled ? ' · 取消 cancelled'
        : f.late ? ` · 延误 ${f.late} min late — now ${hhmm(depOf(f))}` : '';
      return { hz: f.to, py: f.py, f,
        en: open ? `${f.no} · ${hhmm(f.dep)} · ${f.hoursEn} in the air${note}`
                 : f.cancelled ? `${f.no} · ${hhmm(f.dep)}${note}`
                 : `${f.no} · ${hhmm(depOf(f))} · gone for today — come back tomorrow`,
        right: f.cancelled ? '取消' : open ? '¥' + f.price : '明天',
        off: !open || money < f.price };
    })),
    onPick(r) {
      const f = r.f;
      if (f.cancelled) {
        say('这班取消了，今天不飞。', `${f.no} is cancelled today. Nothing is going to ${f.en}.`);
        return false;
      }
      if (!stillSellable(f)) {
        say(`今天这班卖完了，明天早点来。`,
            `${f.no} has closed for today. The first one goes at ${hhmm(f.dep)} tomorrow.`);
        return false;
      }
      if (money < f.price) {
        say(`不够，${f.to}要${f.price}块。`,
            `Not enough. ${f.en} is ¥${f.price} and you have ${Math.floor(money)}.`);
        return false;
      }
      money -= f.price;
      // Airport.setDay rewrites the seven timetable rows in place each midnight. A ticket is for
      // the service that was sold, not tomorrow's row with the same flight number, so keep an
      // immutable snapshot and the absolute departure instant that its missed-flight clock uses.
      const booked = { ...f };
      // `knewGate` is the whole of the listening mechanic in one field: the gate number you were
      // told, or null. The card the desk hands you does not print one — see `gotBoardingCard` — so
      // it stays null until you have heard the gate called, read it off the board, or asked at the
      // 问询处, and the gate agent will not board somebody who cannot say where they should be.
      flight = { f: booked, bookedDay: day, depAt: clockAt(day, depOf(booked)),
                 checked: false, bag: false, cleared: false, seat: null, knewGate: null };
      say(`一张去${booked.to}的往返机票，${booked.price}块。`,
          `One return to ${booked.en}. ¥${booked.price}.`);
      toast(`买到票了 · <span class="dim">${booked.no} to ${booked.en}, ${hhmm(depOf(booked))}, ` +
            `往返 return · check in from ${hhmm(depOf(booked) - Airport.OPEN_CK)}</span>`);
      Vocab.sentenceHTML('往返');
      return true;
    },
  });
}

// ---- 值机. The desk asks you which seat you want. The seat number is invented from the
// flight, so the same ticket always gets the same row and the number means something.
// Which row the card says, taken from the aeroplane rather than made up. Stable per flight, because
// it is a function of the departure time and nothing else, and guaranteed to be a row that is
// actually in the cabin — see Cabin.ROWNUMS.
const seatRow = f => Cabin.ROWNUMS[f.dep % Cabin.ROWNUMS.length];
function gotBoardingCard(f, seat) {
  flight.checked = true;
  flight.seat = seat;
  // The moment the seat is known is the moment to make sure it is empty.
  vacateSeat(seat);
  // The card does not print the gate, and that one omission is what turns the loudspeaker from
  // atmosphere into the thing you are in the building to use. 登机口以广播为准 — "the gate is
  // whatever the announcement says" — is printed on real cards for real reasons, and here it means
  // there are exactly three ways to find out where you are going: hear it called, read it off the
  // 航班信息 board, or ask a human at the 问询处. All three are Chinese, and one of them is the
  // only listening comprehension in this game with a consequence attached.
  toast(`拿到登机牌 · <span class="dim">boarding card · seat ${seat} · ` +
        `登机口以广播为准 — gate as announced · boarding ${hhmm(depOf(f) - Airport.CALL)}</span>`);
  Vocab.sentenceHTML('登机牌');
}

// ---------------------------------------------------------------- 听广播 the listening check
//
// Fired by the frame loop the moment the loudspeaker starts a call that concerns your own flight
// and you still do not know your gate. The clip is already playing behind the panel — that is the
// point, you are meant to be listening to it — and the four answers are real gates off the board,
// so guessing is a one-in-four and listening is a certainty.
//
// Getting it wrong costs nothing but the call: the panel closes, you can press G to hear it again,
// and it will ask again on the next one. Getting it right is the only thing in this game that
// unlocks a door by understanding a sentence rather than by standing next to it.
function askGate(f) {
  // Escape closes the picker without calling onPick. Do not let that abandoned panel leave the
  // listening exercise permanently latched shut when the player replays the announcement.
  if (gateAsk && !Pick.isOpen) gateAsk = false;
  if (!flight || knowsGate() || gateAsk) return;
  gateAsk = true;
  // Three wrong gates, taken from the other flights on the board so every option is a gate that
  // exists in this building. Shuffled off the flight number, so the right answer is not always in
  // the same place but is the same place every time for a given flight — which is what makes a
  // wrong answer feel like a mistake rather than a dice roll.
  const right = gateNow(f);
  const others = FL().filter(q => gateNow(q) !== right).map(q => gateNow(q));
  const seen = new Set(), pool = [];
  for (const g of others) if (!seen.has(g)) { seen.add(g); pool.push(g); }
  const opts = [right].concat(pool.slice(0, 3));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Airport.hashOf(f.dep * 31 + i) * (i + 1));
    const t = opts[i]; opts[i] = opts[j]; opts[j] = t;
  }
  Pick.show({
    title: '听广播',
    sub: `That call was for ${f.no} — which gate did it say?`,
    rows: [{ sec:'登机口', en:'the gate it named — listen again with G' }].concat(
      opts.map(g => ({ hz: g, py: '', en: '', gate: g }))),
    onPick(r) {
      gateAsk = false;
      // The flight can be cancelled or missed while this modal is open.
      if (!flight || flight.f !== f) return true;
      if (r.gate !== right) {
        say('没听清吧？再听一遍。', 'Did not catch it. Press G to hear that again.');
        return true;
      }
      flight.knewGate = right;
      // Brushed rather than introduced: 登机口 is a word you have almost certainly already met at
      // the gate itself, and what you have just done is hear it in a sentence at speed.
      Vocab.sentenceHTML('听懂了，登机口。');
      say(`${right}登机口，听懂了。`, `Gate ${right}. Understood.`);
      toast(`听懂了 · <span class="dim">gate ${right} — the board and the desk agree</span>`);
      updateHud();
      return true;
    },
  });
}
let gateAsk = false;

// ---------------------------------------------------------------- 误机 losing the flight
//
// Until now the ticket in your pocket could not go wrong. You could buy a seat on the 08:20, spend
// the day in the park, come back at midnight and the terminal would still be politely explaining
// that boarding had closed — forever, with your ¥480 still notionally buying you something. There
// was no way to lose, which meant there was no reason to hurry, which meant the clock on the wall
// of the best-built room in the game was decoration.
//
// Two things can now happen to a ticket without you touching it. The airline can cancel the flight,
// which is not your fault and gives the money back. Or the aeroplane can leave without you, which
// is entirely your fault and does not. Both are checked here, once a frame, from anywhere in the
// world — you can miss a flight while standing in your own kitchen, and people do.
// The terminal's timetable is set the moment the terminal first exists, and every frame after —
// so nothing reads a day-zero schedule, and nobody pays for a terminal they never entered.
Lazy.onBuild('Airport', () => { try { Airport.setDay(day, Weather.disruptFor(day)); } catch (_) {} });

function airportWatch() {
  // Once boarding has moved the player into the cabin, the flight is in progress. The airport
  // board will mark it departed long before the cabin sequence lands, but the ticket is still the
  // state that tells landing where to send the player and must survive until takeFlight().
  if (!flight || !started || cabinBoarded || place === 'cabin') return;
  const f = flight.f;
  if (f.cancelled) {
    const paid = f.price;
    flight = null;
    money += paid;
    say(`${f.to}的航班取消了，钱退给您。`,
        `The flight to ${f.en} is cancelled. Your money is refunded.`);
    toast(`航班取消 · <span class="dim">${f.no} — ¥${paid} back in your pocket. ` +
          `The weather has shut half the board.</span>`);
    logDiary(`去${f.to}的航班取消了。`, `The flight to ${f.en} was cancelled.`, 'cancel');
    updateHud();
    return;
  }
  // Twenty minutes after the wheels leave the ground the board stops carrying it, and so does this.
  // Not at the gate closing: there is a quarter of an hour in there where a real person sprints,
  // and taking the ticket away at 关闭 would remove the only genuinely tense fifteen minutes in
  // the game.
  const goneAt = Number.isFinite(flight.depAt)
    ? flight.depAt + 20 : clockAt(day, depOf(f)) + 20;
  if (clockNow() < goneAt) return;
  flight = null;
  needs.mood = clamp(needs.mood - 22, 0, 100);
  say('误机了。', 'You missed the flight.');
  toast(`误机 · <span class="dim">${f.no} to ${f.en} went at ${hhmm(depOf(f))} without you. ` +
        `¥${f.price} gone.</span>`);
  logDiary(`没赶上去${f.to}的飞机。`, `Missed the flight to ${f.en}.`, 'missed');
  updateHud();
}
// The last thing the loudspeaker said, so it can be said again. Everything about an announcement
// that is hard for a learner — the speed, the register, the fact that it happens once — is fixed
// by being able to press one key and have it happen again.
let lastCall = null;
let mallAdsHooked = false;
function replayCall() {
  if (!lastCall) { toast('广播 · <span class="dim">nothing has been announced yet</span>'); return; }
  // Replayed through the room it was said in. The same line through the terminal's horn and the
  // shopping centre's ceiling is two different sounds, and hearing it back in the wrong one is a
  // small lie about where you are standing.
  if (lastCall.room === 'mall') TrainAudio.mallNotice(lastCall.text);
  else TrainAudio.airNotice(lastCall.text, 'hi');
  toast(`再听一遍 · <span class="dim">${lastCall.text}</span>`);
  // If that call was yours and you got the gate wrong the first time, this is the retake. Without
  // it a single mishearing locked you out until the next call, which for a flight already boarding
  // may be the last one there is — and being unable to try again is not a difficulty, it is a
  // dead end.
  if (flight && flight.checked && !knowsGate() && lastCall.key &&
      lastCall.key.slice(lastCall.key.indexOf(':') + 1) === flight.f.no)
    setTimeout(() => askGate(flight.f), 900);
}
function openCheckin() {
  const f = flight.f, row = seatRow(f);
  Pick.show({
    title: '值机',
    sub: `${f.no} to ${f.en}, ${hhmm(depOf(f))}`
       + (f.late ? ` — 延误 ${f.late} min late` : ''),
    rows: [{ sec:'要什么座位', en:'which seat would you like' },
      { hz:'靠窗', py:'kào chuāng', en:'a window — you can watch the wing the whole way',
        right: row + 'A', seat: row + 'A', mood: 9 },
      { hz:'靠走廊', py:'kào zǒuláng', en:'an aisle — you can get up when you like',
        right: row + 'C', seat: row + 'C', mood: 5 },
    ],
    onPick(r) {
      // Time keeps moving behind the picker; a cancellation or missed-flight watcher may have
      // cleared this ticket before the player chooses a seat.
      if (!flight || flight.f !== f) return true;
      if (!Airport.checkinOpen(f, minutes)) {
        say('值机已经截止了。', 'Check-in has closed for this flight.');
        return true;
      }
      needs.mood = clamp(needs.mood + r.mood, 0, 100);
      gotBoardingCard(f, r.seat);
      // She does not tell you the gate, because she does not know it yet either. That is the line
      // a Chinese check-in agent actually says, and it is the sentence that sends you to listen.
      say(`${r.hz}的，${r.seat}。登机口请听广播。`,
          `${r.hz === '靠窗' ? 'Window' : 'Aisle'} — seat ${r.seat}. Listen for your gate.`);
      return true;
    },
  });
}

// ---- 免税店. Four things, all of them dear, and the only place in the game where spending
// money is straightforwardly the point of spending it.
function openDuty() {
  Pick.show({
    title: '免税店',
    sub: `Duty free — ¥${Math.floor(money)} in your wallet`,
    rows: [{ sec:'看看', en:'have a look' }].concat(Airport.DUTY.map(g => ({
      hz: g.hz, py: g.py, en: g.en, right: '¥' + g.price, g, off: money < g.price,
    }))),
    onPick(r) {
      if (money < r.g.price) {
        say(`太贵了，买不起。`, `Too dear. ¥${r.g.price} and you have ${Math.floor(money)}.`);
        return false;
      }
      money -= r.g.price;
      for (const k in r.g.gain) needs[k] = clamp(needs[k] + r.g.gain[k], 0, 100);
      say(`买了${r.hz}，${r.g.price}块。`, `One ${r.g.en.replace(/^an? /, '')}. ¥${r.g.price}.`);
      Vocab.sentenceHTML(r.hz);
      return true;
    },
  });
}

// ---- 登机. The end of the chain, and the start of the other one. 上海 and 成都 are real places:
// boarding puts you on the promenade at 外滩, or in 宽窄巷子, a few hours later, with the clock
// still running and every need still draining. What you have to do there is live for a day and
// turn up for the flight home.
//
// Anywhere else on the board is still an ellipsis — there is no 广州 to walk around in — so
// those flights do what they always did and hand you back two days later.
// Everything either side of the flight itself: taxi out, taxi in, the wait at the belt, the ride
// into town. Ninety minutes, which is what the old flat 3.5 hours to Shanghai worked out to once the
// two-hour flight is taken out of it — so the Shanghai trip still costs exactly what it did, and
// every other destination now costs what its own board says instead of the same 3.5 hours.
const GROUND_MINS = 90;
const COACH = 90;                  // 机场大巴, the far city to its airport
const HOTEL = 220;                 // 和平饭店, one night, tourist rate
const CHANGE = 260;                // what they charge you for missing the flight home
let trip = null;                   // { f, back } while you are away, in absolute clock minutes

// ---- Which flights actually go somewhere.
//
// This table is the whole of improvement 2. A destination in here lands in a room you walk out
// into; a destination not in here still time-skips, which is what all seven of them used to do
// bar 上海. Adding a third is a row plus a scene file plus its name in index.html's FILES —
// nothing in `takeFlight`, `comeHome`, `travelBlocked` or the map has to learn about it, because
// all four of them read this instead of naming 外滩.
//
// 成都 and not 西安, which is the other city AIRPORT.md offers: the schedule in `airport.js`
// already carries CZ3908 成都 13:05, with a board row, a gate, a baked PA announcement and an
// entry in `FX_CITY` for the view out of the cabin window. 西安 has none of those, and the
// schedule belongs to another file. Making a ticket that already exists arrive somewhere is the
// actual bug; inventing an eighth flight would have been a different one.
//
//   place  the room, and its key in PLACES
//   back   what time the flight home leaves, the next day, in minutes past midnight
//   hz/en  what the arrival toast calls the spot you are standing on
//   word   the headword the arrival puts on screen as a sentence
//   noRide what the map says when you try to take the Beijing subway from two thousand km away
const FLY_TO = {
  '上海': { place: 'bund', back: 18 * 60, word: '外滩',
            hz: '外滩', en: 'the Bund',
            map: '外滩 · Shanghai — the coach at the south end goes home',
            noRide: ['这儿是上海，没有二号线。', 'This is Shanghai. Line 2 does not come here.'] },
  '成都': { place: 'chengdu', back: 19 * 60 + 40, word: '宽窄巷子',
            hz: '宽窄巷子', en: 'Kuanzhai Alley',
            map: '宽窄巷子 · Chengdu — the coach outside the west gate goes home',
            noRide: ['这儿是成都，北京的地铁到不了。',
                     'This is Chengdu. The Beijing subway does not reach it.'] },
};
// The rooms that are out of town, by place key. Built once from the table above rather than
// recomputed: `updateMap` asks this four times a second.
const AWAY = {};
for (const to in FLY_TO) AWAY[FLY_TO[to].place] = FLY_TO[to];
const clockAt = (d, m) => d * 1440 + m;
const wakeAt = () => clockNow() < clockAt(day, 8 * 60) ? clockAt(day, 8 * 60)
                                                       : clockAt(day + 1, 8 * 60);

// ---- 上飞机. Down the airbridge and into the cabin, which is a room and not a cutscene.
//
// Nothing about the flight starts here. You come aboard at the rear galley with the belt sign off
// and the engines cold, and what happens next is your business: find the seat printed on your card,
// put your bag up, sit down. The sequence in cabin.js does not begin until you are actually in your
// own seat, because a safety briefing read at somebody standing in the aisle is a briefing about
// nobody.
let cabinBoarded = false;
// The cabin is a fixed dramatic sequence, while the settings slider is meant to change the pace of
// ordinary days. Letting 3× multiply both made a two-hour Shanghai flight consume six game hours
// before landing. Once pushback starts, one real second is one game minute for every player; the
// remaining authored block time is settled at touchdown.
const activeClockRate = () =>
  cabinBoarded && flight && flight.startedAt !== undefined ? 1 : SET.clock;
function boardCabin() {
  if (!flight || !flight.checked) return;
  const f = flight.f;
  cabinBoarded = true;
  Cabin.setPhase('gate');
  // How long this one is, so the bulkhead display counts down this flight and not the Shanghai one,
  // and where it is going, for the moving map on the seat in front of you.
  Cabin.setBlock(f.hrs * 60);
  Cabin.setDest(f.to);
  const mine = Cabin.setMySeat(flight.seat);
  // Straight to the seat, rather than in at the rear galley to hunt for it down forty-two identical
  // chairs. Walking the cabin was never the interesting part — the flight is — and the seat number
  // still matters because it is what puts you here and what the crew says to you when they come
  // past. You arrive standing in the aisle beside it, facing it, so the seat is the only thing in
  // front of you and 坐下 is the obvious next move.
  //
  // `atan2(dx, 0)` is ±π/2 depending on which side of the aisle the seat is, which covers all three
  // blocks: the port pair is reached looking outboard, the starboard pair likewise, and the centre
  // three from whichever aisle is nearer. A seat number the aeroplane does not have falls back to the
  // galley door, which is the old behaviour and the only sensible thing left to do.
  // Facing down the cabin, angled at the seat — not square onto it. Square on is what this did
  // first, and it is the one direction that does not work: the camera is over your shoulder, so
  // facing the seat puts your own back precisely between the lens and the thing you were brought
  // here to look at. Three quarters of a turn toward it keeps the seat in the near foreground and the
  // rest of the cabin down the frame, which is also how a person actually stands in an aisle.
  setPlace('cabin', mine
    ? { x: mine.aisle, z: mine.z, yaw: Math.atan2((mine.x - mine.aisle) * .75, -1) }
    : undefined);
  if (mine) {
    // The interior default is 4.4 m back, which in a cabin 6.6 m wide puts the camera outside the
    // fuselage looking in through the cutaway. Close and high instead, the way `board` sets its own
    // camera for the train carriage.
    //
    // Tried at 0.52 and 1.5 to see over the shoulder; that is nearly overhead and the backpack fills
    // the middle of the screen. A normal over-the-shoulder view down the aisle works, because the
    // yaw above already keeps the seat out from behind the body.
    CAM.tPitch = CAM.pitch = 0.24;
    CAM.tDist = CAM.dist = 2.4;
    CAM.lookY = 1.15;
  }
  // The bed itself is started by `setPlace`, which is where it belongs; this is only the level it
  // starts at, which is a cold aeroplane at a gate.
  TrainAudio.cabinLevel(0);
  say('我找到座位了。', 'You have found your seat.');
  toast(`登机了 · <span class="dim">${f.no} to ${f.en} · seat <b>${flight.seat}</b>` +
        (mine ? ' · 坐下 sit down' : ' · find it and sit down') + '</span>');
  Vocab.sentenceHTML('座位');
  updateHud();
}

// ---------------------------------------------------------------- the flight screen and flight-deck camera
// One polished interface serves both the seat-back screen and the cockpit visit. It reads the live
// cabin state, so altitude, route progress, weather and seatbelt status never disagree with the
// window or the overhead signs.
const FX_CITY = {
  '上海':['黄浦江和浦东天际线','the Huangpu River and Pudong skyline','B18'],
  '广州':['珠江和广州塔','the Pearl River and Canton Tower','A07'],
  '成都':['青城山和成都平原','green hills and the Chengdu plain','T2-23'],
  '海口':['南海、沙滩和椰子树','the South China Sea, beaches and palms','12'],
  '纽约':['曼哈顿天际线和哈德逊河','Manhattan and the Hudson River','4'],
  '东京':['富士山和东京湾','Mount Fuji and Tokyo Bay','106'],
  '曼谷':['湄南河和金色寺庙','the Chao Phraya River and golden temples','D6'],
};
const PASSPORT_KEY = 'bjlife.flightpassport.v1';
let flightPassport = { stamps:{}, miles:0, moments:[], badges:[] };
try { Object.assign(flightPassport, JSON.parse(localStorage.getItem(PASSPORT_KEY)) || {}); } catch (_) {}
if (!flightPassport.stamps) flightPassport.stamps = {};
if (!Array.isArray(flightPassport.moments)) flightPassport.moments = [];
if (!Array.isArray(flightPassport.badges)) flightPassport.badges = [];
function saveFlightPassport() {
  try { localStorage.setItem(PASSPORT_KEY, JSON.stringify(flightPassport)); } catch (_) {}
}
function collectFlightMoment(kind) {
  const to = flight ? flight.f.to : '上海', key = `${to}:${kind}`;
  if (!flightPassport.moments.includes(key)) flightPassport.moments.push(key);
  if (kind === 'window' && !flightPassport.badges.includes('云上摄影师'))
    flightPassport.badges.push('云上摄影师');
  saveFlightPassport();
}
function awardFlightStamp(f) {
  flightPassport.stamps[f.to] = (flightPassport.stamps[f.to] || 0) + 1;
  flightPassport.miles += Math.round(f.hrs * 760);
  if (!flightPassport.badges.includes('第一次飞行')) flightPassport.badges.push('第一次飞行');
  if (f.hrs >= 10 && !flightPassport.badges.includes('长途旅行家')) flightPassport.badges.push('长途旅行家');
  if (Object.keys(flightPassport.stamps).length >= 7 && !flightPassport.badges.includes('七城飞行家'))
    flightPassport.badges.push('七城飞行家');
  saveFlightPassport();
  logDiary(`飞行护照盖了${f.to}的章。`, `Stamped the flight passport in ${f.en}.`, `stamp-${f.to}`);
}
let fxPage = 'map';
function renderFlightExperience(page) {
  const root = $('#flightExperience'); if (!root || !root.classList.contains('on')) return;
  fxPage = page || fxPage;
  const v = Cabin.view(), to = flight ? flight.f.to : '上海';
  const city = FX_CITY[to] || FX_CITY['上海'];
  const pct = Math.round(v.flightU * 100), alt = Math.round(v.alt * 10600 / 100) * 100;
  const weather = Weather.now, night = Cabin.night() > .55;
  root.querySelectorAll('[data-fx]').forEach(b => b.classList.toggle('on', b.dataset.fx === fxPage));
  const title = $('#fxTitle'), host = $('#fxView');
  if (fxPage === 'map') {
    title.textContent = `飞往${to} · Flight to ${flight ? flight.f.en : 'Shanghai'}`;
    host.innerHTML = `<div class="fxgrid"><div class="fxcard"><small>飞行阶段 · PHASE</small><strong>${v.phaseZh}</strong></div>`+
      `<div class="fxcard"><small>高度 · ALTITUDE</small><strong>${alt.toLocaleString()} m</strong></div>`+
      `<div class="fxcard"><small>预计到达 · PROGRESS</small><strong>${pct}%</strong></div></div>`+
      `<div class="fxroute"><i style="width:${pct}%"></i><em style="left:${Math.max(3,pct)}%">✈</em></div>`+
      `<div class="fxcaption">北京 PEK <span style="float:right">${to} · ${city[2]}号登机口 / gate ${city[2]}</span></div>`;
  } else if (fxPage === 'outside') {
    title.textContent = '窗外摄像头 · Exterior camera';
    host.innerHTML = `<div class="fxoutside${night ? ' night' : ''}"></div><div class="fxcaption">`+
      `${v.phaseZh}中。接近${to}时可以看到${city[0]}。<br>`+
      `${v.phaseEn}. On approach, look for ${city[1]}. Weather: ${weather.en || weather.kind}.</div>`+
      `<div class="fxactions"><button class="fxaction" data-ent="photo">拍窗外照片<span>save this flight moment</span></button></div>`;
  } else if (fxPage === 'cockpit') {
    title.textContent = '驾驶舱 · Flight deck';
    host.innerHTML = `<div class="fxgrid"><div class="fxcard"><small>无线电高度 · RADIO ALT</small><strong>${alt} m</strong></div>`+
      `<div class="fxcard"><small>空速 · AIRSPEED</small><strong>${Math.round(v.speed * 890)} km/h</strong></div>`+
      `<div class="fxcard"><small>推力 · THRUST</small><strong>${Math.round(v.speed * 100)}%</strong></div>`+
      `<div class="fxcard"><small>自动驾驶 · AUTOPILOT</small><strong>${v.alt > .15 ? 'CMD A' : 'OFF'}</strong></div>`+
      `<div class="fxcard"><small>安全带 · SEAT BELTS</small><strong>${v.belt ? 'ON' : 'OFF'}</strong></div>`+
      `<div class="fxcard"><small>目的地跑道 · ARRIVAL</small><strong>${to}</strong></div></div>`+
      `<div class="fxcaption">机长正在监控天气、航路和燃油。仪表随真实飞行阶段更新。<br>`+
      `The pilots are monitoring weather, route and fuel. Instruments follow the live flight.</div>`;
  } else if (fxPage === 'entertainment') {
    title.textContent = '机上娱乐 · Entertainment';
    host.innerHTML = `<div class="fxactions"><button class="fxaction" data-ent="movie">电影 · 北京故事<span>feature film · 108 min</span></button>`+
      `<button class="fxaction" data-ent="music">音乐 · 夜间飞行<span>ambient cabin playlist</span></button>`+
      `<button class="fxaction" data-ent="game">游戏 · 航线挑战<span>route challenge</span></button>`+
      `<button class="fxaction" data-ent="camera">机尾摄像头<span>tail camera</span></button></div>`;
  } else if (fxPage === 'learn') {
    title.textContent = '机上中文 · Mandarin on board';
    host.innerHTML = `<div class="fxgrid"><div class="fxcard"><small>安全带</small><strong>ānquándài</strong></div>`+
      `<div class="fxcard"><small>机翼</small><strong>jīyì</strong></div><div class="fxcard"><small>驾驶舱</small><strong>jiàshǐcāng</strong></div>`+
      `<div class="fxcard"><small>小桌板</small><strong>xiǎozhuōbǎn</strong></div><div class="fxcard"><small>毛毯</small><strong>máotǎn</strong></div>`+
      `<div class="fxcard"><small>耳机</small><strong>ěrjī</strong></div></div>`;
  } else if (fxPage === 'passport') {
    title.textContent = '飞行护照 · Flight passport';
    const stamps = Object.entries(flightPassport.stamps);
    host.innerHTML = `<div class="fxgrid"><div class="fxcard"><small>飞行里程 · DISTANCE</small><strong>${flightPassport.miles.toLocaleString()} km</strong></div>`+
      `<div class="fxcard"><small>目的地 · DESTINATIONS</small><strong>${stamps.length} / 7</strong></div>`+
      `<div class="fxcard"><small>徽章 · BADGES</small><strong>${flightPassport.badges.length}</strong></div></div>`+
      `<div class="fxactions">${stamps.length ? stamps.map(([hz,n]) => `<div class="fxcard"><small>入境章 · STAMP</small><strong>${hz} × ${n}</strong></div>`).join('')
        : '<div class="fxcaption">完成第一次飞行后，这里会出现目的地印章。 Complete a flight to earn your first stamp.</div>'}</div>`+
      `<div class="fxcaption">${flightPassport.badges.length ? '徽章 · '+flightPassport.badges.join(' · ') : '徽章会记录第一次飞行、长途航班和窗外摄影。'}</div>`;
  } else {
    title.textContent = '客舱服务 · Cabin service';
    host.innerHTML = `<div class="fxactions"><button class="fxaction" data-service="water">水<span>请给我一杯水 · water</span></button>`+
      `<button class="fxaction" data-service="blanket">毛毯<span>请给我一条毛毯 · blanket</span></button>`+
      `<button class="fxaction" data-service="headphones">耳机<span>请给我一副耳机 · headphones</span></button>`+
      `<button class="fxaction" data-service="meal">餐饮<span>open the food and drinks menu</span></button>`+
      `<button class="fxaction" data-service="dutyfree">免税品<span>browse duty-free service</span></button>`+
      `<button class="fxaction" data-service="sleep">休息模式<span>shade down, screen and reading light off</span></button>`+
      `<button class="fxaction" data-service="focus">阅读模式<span>shade up, screen and reading light on</span></button>`+
      `<button class="fxaction" data-service="light">阅读灯<span>toggle reading light</span></button></div>`;
  }
}
function openFlightExperience(page) {
  fxPage = page || 'map'; $('#flightExperience').classList.add('on');
  setSurfaceOpen('#flightExperience', true);
  renderFlightExperience(fxPage);
}
function closeFlightExperience() {
  $('#flightExperience').classList.remove('on');
  setSurfaceOpen('#flightExperience', false);
}
function openFlightQuiz() {
  closeFlightExperience();
  Pick.show({ title:'航线挑战 · Route challenge', sub:'“Please fasten your seat belt” 是什么意思？',
    rows:[{hz:'请系好安全带',py:'qǐng jì hǎo ānquándài',en:'please fasten your seat belt',correct:true},
          {hz:'请打开舷窗',py:'qǐng dǎkāi xiánchuāng',en:'please open the window'},
          {hz:'请拿一杯咖啡',py:'qǐng ná yì bēi kāfēi',en:'please get a coffee'}],
    onPick(r) {
      if (!r.correct) { say('再想一想。安全带是 seat belt。','Try again — 安全带 means seat belt.'); return false; }
      collectFlightMoment('route-quiz'); needs.mood = clamp(needs.mood + 4, 0, 100);
      say('答对了！请系好安全带。','Correct! Please fasten your seat belt.');
      Vocab.sentenceHTML('安全带'); return true;
    } });
}
$('#fxClose').onclick = closeFlightExperience;
$('#fxTabs').onclick = e => { const b = e.target.closest('[data-fx]'); if (b) renderFlightExperience(b.dataset.fx); };
$('#fxView').onclick = e => {
  const ent = e.target.closest('[data-ent]');
  if (ent) {
    if (ent.dataset.ent === 'photo') {
      collectFlightMoment('window'); TrainAudio.cabinCue('screen');
      toast('拍好了 · <span class="dim">window photo added to your flight passport</span>');
      renderFlightExperience('outside'); return;
    }
    if (ent.dataset.ent === 'camera') { renderFlightExperience('outside'); return; }
    if (ent.dataset.ent === 'game') { openFlightQuiz(); return; }
    TrainAudio.cabinCue('screen');
    toast(`机上娱乐 · <span class="dim">${ent.textContent.trim()} selected</span>`);
    return;
  }
  const b = e.target.closest('[data-service]'); if (!b) return;
  const kind = b.dataset.service;
  if (kind === 'meal') { closeFlightExperience(); offerDrinks(); return; }
  if (kind === 'dutyfree') {
    toast('免税服务 · <span class="dim">tea, gifts and travel sets are available after the meal round</span>');
    return;
  }
  if (kind === 'sleep' || kind === 'focus') {
    const eq = Cabin.equipment(), wantOn = kind === 'focus';
    if (eq.reading !== wantOn) Cabin.toggleEquipment('reading');
    if (eq.screen !== wantOn) Cabin.toggleEquipment('screen');
    if (eq.shade !== !wantOn) Cabin.toggleEquipment('shade');
    TrainAudio.cabinCue('shade');
    say(kind === 'sleep' ? '休息模式打开了。' : '阅读模式打开了。',
        kind === 'sleep' ? 'Rest mode is ready.' : 'Reading mode is ready.');
    return;
  }
  if (kind === 'light') Cabin.toggleEquipment('reading');
  else { Cabin.setBell(true); TrainAudio.cabinCue('ding'); crewAnswerBell(); }
  const lines = kind === 'water' ? ['请给我一杯水。','Water requested.']
    : kind === 'blanket' ? ['请给我一条毛毯。','Blanket requested.']
    : kind === 'headphones' ? ['请给我一副耳机。','Headphones requested.']
    : ['阅读灯调好了。','Reading light adjusted.'];
  say(lines[0], lines[1]); Vocab.sentenceHTML(kind === 'blanket' ? '毛毯' : kind === 'headphones' ? '耳机' : '阅读灯');
};

// The cabin crew's two rounds. Both are errand queues — a list of waypoints with a dwell at each —
// which is the same mechanism that carries a bowl of noodles across the 餐馆 floor. Handed to her by
// the cabin's own sequence rather than by a routine, because they happen at a point in a flight and
// not at a time of day.
const crewNPC = () => NPCS.find(n => n.hz === '空乘');
const crewNPC2 = () => NPCS.find(n => n.hz === '空乘二');

// Getting from wherever she is standing to the head of a given aisle, without cutting the corner.
//
// NPCs have no collision, so a waypoint on the far side of the cabin is a walk straight through three
// blocks of seating. Every round used to open with a hard-coded hop to the starboard cross-over,
// which was correct only because every round began in the starboard galley — and the safety
// demonstration broke that by leaving her at the front of the *port* aisle, after which the belt check
// took her diagonally through the middle of the cabin. So the route is computed from where she
// actually is: down her own aisle to the clear strip aft of the last row, across there, and up.
function crewToAisle(n, side, speed) {
  const A = Cabin.AISLE, CROSS = Cabin.GALLEY - .65;
  const legs = [];
  // Which aisle she is standing in, if either. The galley spots are at ±1.52, so this covers those too.
  const here = n.x < -A / 2 ? -1 : n.x > A / 2 ? 1 : 0;
  if (here !== 0 && here !== side && Math.abs(n.z - CROSS) > .35)
    legs.push({ at: [here * A, CROSS], speed });
  legs.push({ at: [side * A, CROSS], speed });
  return legs;
}

// 安全演示. Both crew walk to the head of their own aisle, turn to face the cabin, and read the
// demonstration off their hands until the taxi is over — see the `safety` branch of activityPose for
// what their arms actually do. Standing still is what `act` is for: the errand puts them there and
// the act is what they do once they have arrived.
//
// This is the piece of the flight that was missing. The captain has been telling you to fasten your
// belt since the room was built and nobody was showing you how.
function crewSafetyDemo() {
  const A = Cabin.AISLE, front = Cabin.ROWZ[0] - .62;
  const run = (n, side) => {
    if (!n) return;
    n.errand = [
      // Out of the galley, across the clear strip and up the aisle to the bulkhead.
      ...crewToAisle(n, side, 1.35),
      { at: [side * A, front], speed: 1.40, dwell: 0,
        // Facing aft, down the cabin at the people she is demonstrating to — the errand walked her
        // forwards, so without this she performs the whole thing to the bulkhead.
        //
        // And `wait`, which is what actually keeps her there. An NPC with an empty errand goes back
        // to the spot in her routine, so without this the pair of them finished the walk and then
        // performed the entire demonstration while strolling back to the galley. `wait` is the one
        // thing in updateNPCs that stops a body moving; the act only decides what it does once it
        // has stopped. Long enough to cover the rest of the taxi and the start of the climb, and the
        // belt check clears it when that takes over.
        done: () => { n.act = 'safety'; n.faceLock = true; n.yaw = 0; n.wait = 16; } },
      // And back down her own aisle afterwards, rather than being left with an empty errand at the
      // front of the cabin — an NPC with nothing queued walks straight to the spot in her routine,
      // and from here that is a diagonal through the middle of the cabin. In practice the belt check
      // takes over long before the hold above runs out; this is what happens if it does not.
      { at: [side * A, Cabin.GALLEY - .65], speed: 1.20,
        done: () => { n.act = undefined; } },
    ];
    n.wait = 0;
    n.cart = undefined;
    n.pushing = false;
  };
  run(crewNPC(), -1);
  run(crewNPC2(), 1);
}
// Whatever they were holding a pose for, they are not any more. Called by every round that follows,
// because an act persists until something clears it and a member of crew who is still pointing at
// the exits while she checks your belt is worse than no demonstration at all.
function crewStopAct() {
  for (const n of [crewNPC(), crewNPC2()]) {
    if (!n) continue;
    n.act = undefined;
    n.faceLock = true;      // she keeps facing the way she walks; see the note on faceLock
  }
}

function crewBeltCheck() {
  crewStopAct();
  const n = crewNPC();
  if (!n) return;
  const A = Cabin.AISLE, rows = Cabin.ROWZ;
  // Round the back of the cabin first, and this matters: NPCs have no collision, so a waypoint on
  // the far side of the seats is a walk straight through them. She starts in the starboard galley
  // and the port aisle is five metres away across three blocks of seating — the first version of
  // this sent her diagonally and she waded through rows 24, 25 and 26 on the way. CROSS is the strip
  // aft of the last row where the cabin really is clear from side to side.
  const legs = [
    // Routed from where she is rather than from where she used to start — see crewToAisle.
    ...crewToAisle(n, -1, 1.20),
    { at: [-A, Cabin.BULK + .55], speed: 1.25 },
  ];
  // Then down the port aisle from the bulkhead to the rear, stopping at every row. She says
  // something at about half of them: at every one it would be six identical lines in twenty seconds.
  rows.forEach((z, i) => {
    legs.push({ at: [-A, z], speed: .80, dwell: .7,
      done: () => {
        const lines = ['先生，请系好安全带。', '小桌板收起来，谢谢。', '靠背请调直。',
                       '我帮您看一下安全带。'];
        if (i % 2 === 0) crewSay(lines[(i / 2) % lines.length]);
      } });
  });
  legs.push({ at: [-A, Cabin.GALLEY - .65], speed: 1.15, dwell: .4,
    done: () => crewSay('起飞以后我们会提供饮料。') });
  n.errand = legs;
  n.wait = 0;
}
// The service at cruise: both crew, a cart each, one to each aisle, working from the galley end
// forward. This is the round the cabin's two aisles exist for.
//
// 小美 always takes your own aisle. It matters because she is the one with a voice: the crew member
// who reaches your row is the one who asks you what you want, and if the pair of them were assigned
// by side rather than by where you are sitting then half the time the person serving you would be
// the silent one and the offer would come from across the cabin.
function crewSnackRound() {
  crewStopAct();
  const A = Cabin.AISLE, mine = Cabin.mySeat();
  const CROSS = Cabin.GALLEY - .65;          // the clear strip aft of the last row — see crewBeltCheck
  const yourSide = mine && mine.aisle > 0 ? 1 : -1;
  // `cart` is which of the cabin's two carts this one is pushing, and it is what `updateTrolleys`
  // reads to put the thing in front of her.
  const run = (n, side, cart, talks) => {
    if (!n) return;
    const legs = crewToAisle(n, side, 1.0);
    // Aft to fore, which is the direction a cart goes: out of the galley and up the cabin.
    for (const z of [...Cabin.ROWZ].reverse()) {
      const yours = talks && mine && Math.abs(mine.z - z) < .01;
      legs.push({ at: [side * A, z], speed: .42, dwell: yours ? 2.6 : .8,
        done: () => {
          if (!talks) return;
          if (yours) { crewSay('您需要喝点什么？有茶、咖啡和果汁。'); offerSnack(); }
          else if (Math.random() < .38) crewSay('请问您要牛肉饭还是鸡肉面？');
        } });
    }
    legs.push({ at: [side * A, CROSS], speed: 1.05, dwell: .3,
      done: () => { if (talks) crewSay('慢用。'); } });
    n.errand = legs;
    n.wait = 0;
    n.cart = cart;
    // Both hands out in front, on the handle. Not `carrying`, which would also draw a tray in them.
    n.pushing = true;
  };
  run(crewNPC(), yourSide, 0, true);
  run(crewNPC2(), -yourSide, 1, false);
  if (crewNPC()) crewSay('要不要来点儿小吃？');
}

// The cabin-secure round on the way down: no carts, both aisles, quickly, collecting what is still
// on the tray tables. The cabin has been emitting `crew:secure` on every descent since it was built
// and nothing was listening for it, which is why 小美 has a line about stowing your tray that has
// never once been said out loud.
function crewSecureRound() {
  crewStopAct();
  const A = Cabin.AISLE, mine = Cabin.mySeat();
  const CROSS = Cabin.GALLEY - .65;
  const yourSide = mine && mine.aisle > 0 ? 1 : -1;
  const run = (n, side, talks) => {
    if (!n) return;
    const legs = crewToAisle(n, side, 1.30);
    // Fore to aft, and brisk, and not at every row: a secure check is a walk through with eyes on
    // the tray tables, not a service. Three stops rather than six, because the whole thing has to be
    // over before the wheels touch — the descent is 17 seconds and stopping at all six put her still
    // walking at touchdown. Your own row is always one of the three if it can be.
    const stops = Cabin.ROWZ.filter((z, i) =>
      i % 2 === 0 || (mine && Math.abs(mine.z - z) < .01));
    for (const z of stops) {
      const yours = talks && mine && Math.abs(mine.z - z) < .01;
      legs.push({ at: [side * A, z], speed: 1.15, dwell: yours ? .9 : .3,
        done: () => { if (yours) crewSay('我们就要降落了，请把桌板收好。'); } });
    }
    legs.push({ at: [side * A, CROSS], speed: 1.35 });
    n.errand = legs;
    n.wait = 0;
    n.cart = undefined;      // hands free: this is the round with nothing to push
    n.pushing = false;
  };
  run(crewNPC(), yourSide, true);
  run(crewNPC2(), -yourSide, false);
}

// Somebody answering the bell. She walks from wherever she is to your row and asks what you want —
// and because she has to come up the aisle to reach you, ringing it costs you the wait, which is the
// only honest way to model a call button.
//
// 小美 always takes it: she is the one with a voice, and a silent crew member arriving to ask you
// nothing would be worse than nobody coming.
function crewAnswerBell() {
  const n = crewNPC(), mine = Cabin.mySeat();
  Cabin.setBell(true);
  if (!n || !mine) return;
  crewStopAct();
  const A = Cabin.AISLE, side = mine.aisle > 0 ? 1 : -1;
  n.errand = [
    // Round the back rather than diagonally through three blocks of seating — see crewToAisle.
    ...crewToAisle(n, side, 1.15),
    { at: [side * A, mine.z], speed: 1.05, dwell: 2.4,
      done: () => {
        crewSay('您需要喝点什么？有茶、咖啡和果汁。');
        Cabin.setBell(false);        // answered, so the light goes out
        offerDrinks();
      } },
    { at: [side * A, Cabin.GALLEY - .65], speed: 1.10 },
  ];
  n.wait = 0;
  n.cart = undefined;
  n.pushing = false;
}

// The carts, put where the two crew are pushing them, every frame. A cart is in front of its pusher
// in the direction she is walking, and it is only in the cabin at all while she is on a round —
// otherwise it lives in the galley, which in this model means nowhere.
function updateTrolleys() {
  const shown = [false, false];
  for (const n of [crewNPC(), crewNPC2()]) {
    if (!n || n.cart === undefined) continue;
    if (!(n.awake && n.errand && n.errand.length)) {
      // Round finished. Put the cart away and drop her hands.
      n.cart = undefined; n.pushing = false;
      continue;
    }
    // Forward for a body is [sin(yaw), cos(yaw)], and 0.62 m is arm's length plus half the cart.
    // The authored trolley faces local -Z and its handle is at local +Z. Rotate that body half a
    // turn relative to the pusher so the handle is the near end (about 24 cm in front of the
    // hands), not the far end a full metre beyond them.
    Cabin.trolley(n.cart, n.x + Math.sin(n.yaw) * .62, n.z + Math.cos(n.yaw) * .62,
      n.yaw + Math.PI, true);
    shown[n.cart] = true;
  }
  for (let i = 0; i < 2; i++) if (!shown[i]) Cabin.trolley(i, 0, 0, 0, false);
}
// Her voice, at whatever distance she actually is. Routed through the normal NPC path, so she is
// read by her own baked voice in the cabin's own (very dead) acoustic.
function crewSay(text) {
  const n = crewNPC();
  if (!n) return;
  const d = Math.hypot(n.x - P.x, n.z - P.z);
  const dur = Speech.npc(n, text, { dist: d, pan: clamp((n.x - P.x) / 3, -1, 1) });
  // Her voice comes out of a different AudioContext from the engines, so the compressor cannot
  // balance the two for us — the cabin has to be told to get out of her way as well.
  TrainAudio.duckCabin(.42, Math.max(1.2, dur + .8));
  n.speakUntil = performance.now() + Math.max(900, dur * 1000);
  say(text, (n.lines.find(l => l[0] === text) || [, ''])[1]);
}
// What she is actually offering. Free, because it is on the aeroplane and that is the joke.
// What is on the cart. Free, because it is on the aeroplane and that is the joke, so the interesting
// choice is not what you can afford — it is that somebody has asked you a question in Chinese and is
// standing there waiting for the answer.
const CABIN_DRINKS = [
  { hz:'茶',   py:'chá',    en:'tea, in a paper cup',            gain:{ food:8,  rest:4,  mood:7 } },
  { hz:'咖啡', py:'kāfēi',  en:'coffee — it is not good coffee', gain:{ food:6,  rest:12, mood:5 } },
  { hz:'果汁', py:'guǒzhī', en:'apple juice',                    gain:{ food:12, mood:8 } },
  { hz:'可乐', py:'kělè',   en:'a can of cola, with ice',        gain:{ food:14, mood:11 } },
  { hz:'水',   py:'shuǐ',   en:'just water, thank you',          gain:{ food:4,  clean:2, mood:3 } },
];
// The trolley reaching your row. She asks, you answer, and the meal comes with whatever you picked —
// which is the difference between being served and being given something.
function offerDrinks() {
  if (place !== 'cabin') return;
  Pick.show({
    title: '喝点什么',
    sub: '飞机上的饮料是免费的 — everything on the cart is free',
    rows: [{ sec:'喝点什么', en:'what would you like to drink' }].concat(
      CABIN_DRINKS.map(d => ({ hz:d.hz, py:d.py, en:d.en, right:'免费', d }))),
    onPick(r) {
      const d = r.d;
      for (const k in d.gain) needs[k] = clamp(needs[k] + d.gain[k], 0, 100);
      // A meal comes with it. This is the part that actually feeds you; the drink is the choice.
      needs.food = clamp(needs.food + 18, 0, 100);
      needs.mood = clamp(needs.mood + 6, 0, 100);
      crewSay('慢用。');
      toast(`要了一杯${d.hz} · <span class="dim">${d.en}, and the beef rice with it — `
          + 'the one thing on this aeroplane that costs nothing</span>');
      Vocab.sentenceHTML(d.hz);
      updateHud();
      return true;
    },
  });
}
// Kept under its old name because the trolley round calls it, and because a player who walks away
// from the panel should still get fed rather than nothing at all.
function offerSnack() { offerDrinks(); }

function takeFlight() {
  const f = flight.f;
  // The cabin sequence advances the game clock while it plays. Anchor the journey to pushback so
  // landing only charges whatever block time remains instead of adding the whole flight again.
  // A missing timestamp keeps old/debug-created tickets behaving as they did before this field.
  const startedAt = flight.startedAt === undefined ? clockNow() : flight.startedAt;
  awardFlightStamp(f);
  trips.push(f.to);
  const bag = flight.bag;
  flight = null;
  const dest = FLY_TO[f.to];
  if (dest) {
    const arrivesAt = startedAt + f.hrs * 60 + GROUND_MINS;
    advanceTime(Math.max(0, arrivesAt - clockNow()));
    // A flight is a few hours of sitting still: you land bored, stiff and hungry rather than
    // wrecked, and the two days that follow are yours to spend badly.
    needs.mood = clamp(needs.mood + 26, 0, 100);
    needs.rest = clamp(needs.rest - 10, 0, 100);
    needs.food = clamp(needs.food - 16, 0, 100);
    // The return is the next evening. You bought a 往返, so the seat is already yours; what is
    // left is one night, one day, and being on the coach in time.
    trip = { f, back: clockAt(day + 1, dest.back), confirmed: false, bag };
    setPlace(dest.place);
    say(`到${f.to}了。`, `You are in ${f.en}.`);
    logDiary(`坐飞机去${f.to}了。`, `Flew to ${f.en}.`);
    toast(`到${dest.hz}了 · <span class="dim">${dest.en}, ${hhmm(minutes)} on day ${day} · ` +
          `your flight home is ${f.no} at ${hhmm(dest.back)} tomorrow · ` +
          `¥${Math.floor(money)} left</span>`);
    Vocab.sentenceHTML(dest.word);
    refreshSigns();
    updateHud();
    return;
  }
  // Everywhere else: out on the day the flight went and back on the second morning after it.
  // `advanceTime` charges the rent for each night on the way past, which is exactly right —
  // the flat is still yours while you are away and the landlord does not care where you were.
  // Two nights away and back on the second morning — plus both legs, at the length the board gives
  // them. This is the one place distance is allowed to cost you something: Tokyo is three hours each
  // way and you are home for breakfast on the third day, New York is fourteen and you are not.
  const startDay = Math.floor(startedAt / 1440);
  const homeAt = (startDay + 2) * 1440 + 11 * 60 + 2 * f.hrs * 60;
  advanceTime(Math.max(0, homeAt - clockNow()));
  // Set rather than adjust. Two days of `decay` would leave you starving and filthy and in a
  // foul mood, which is not what a holiday does to anybody.
  needs.mood = Math.max(needs.mood, 92);
  needs.rest = 46; needs.food = 34; needs.toilet = 62; needs.clean = 24;
  setPlace('airport');
  say(`${f.to}回来了。`, `Back from ${f.en}.`);
  toast(`去了一趟${f.to} · <span class="dim">two days in ${f.en}` +
        (bag ? ', and the case came round in the end' : '') +
        ` · you are back at 首都国际机场, day ${day}</span>`);
  Vocab.sentenceHTML('登机');
  refreshSigns();
  updateHud();
}

// ---- 回北京. The coach, the flight and the walk out of arrivals, in one ellipsis, because
// the way home is not a second game — it is the price of having gone.
function comeHome() {
  if (!trip) return;
  const f = trip.f;
  const land = Math.max(clockNow() + COACH + 60, trip.back) + 165;
  advanceTime(land - clockNow());
  trip = null;
  needs.rest = clamp(needs.rest - 18, 0, 100);
  needs.food = clamp(needs.food - 14, 0, 100);
  needs.clean = clamp(needs.clean - 12, 0, 100);
  setPlace('airport');
  say('回北京了。', 'Back in Beijing.');
  logDiary(`从${f.to}回北京了。`, `Flew home from ${f.en}.`);
  toast(`回来了 · <span class="dim">${f.no} back from ${f.en} · 首都国际机场, ` +
        `day ${day}, ${hhmm(minutes)} · the subway is at the west end</span>`);
  refreshSigns();
  updateHud();
}

// Wheels down somewhere else. The cabin has finished its sequence, so the journey that `takeFlight`
// used to do all of in one go now only has the arithmetic left to do: the clock, the needs, the
// ticket and where you step out.
// A boarding call empties the airside seats toward the gate. The passengers it picks are the
// seated airside NPCs — those whose home spot is past security and not already mid-errand — and
// each gets a shoulder offset so they form a queue at the door instead of standing inside one
// another. They stay at the gate once they arrive: `walkToGate` rewrites their home spot.
function boardPassengers() {
  if (typeof Airport === 'undefined' || !Airport.walkToGate) return;
  let k = 0;
  for (const n of NPCS) {
    if (n.place !== 'airport') continue;
    if (n.errand && n.errand.length) continue;           // already walking
    const at = n.spots && n.spots[0] && n.spots[0].at;
    if (!at || at[0] <= Airport.SEC) continue;            // landside sitters stay put
    if (n.spots[0].act && n.spots[0].act !== 'sit' && n.spots[0].act !== 'wait') continue;
    if (Airport.walkToGate(n, k)) k++;
  }
}
function landFlight() {
  // Idempotent, and it has to be: `takeFlight` clears `flight` and then moves you out of the cabin,
  // so a second call reads `flight.f` off null and throws inside the frame loop — which is a crash
  // with no stack anybody would connect to an aeroplane landing. Guarding on `cabinBoarded` means
  // the landing happens exactly once however many times the cue arrives.
  if (!cabinBoarded) return;
  cabinBoarded = false;
  const n = crewNPC();
  if (n) { n.errand = null; n.wait = 0; }
  // The bed stops when `setPlace` takes you out of the cabin, below.
  // No ticket at all — which only happens if something put the player in the cabin without one, and
  // is still not a reason to strand them at 10,000 metres. Out into the terminal.
  if (!flight) { setPlace('airport'); refreshSigns(); updateHud(); return; }
  takeFlight();
}

// Parked at the destination. The seatbelt sign goes out, the crew take their positions at the
// door, and the nearest passengers feed into the aisles instead of the whole cabin vanishing on
// touchdown. The player leaves through the same door after collecting the carry-on.
function cabinArrival() {
  const to = flight ? flight.f.to : '目的地', city = FX_CITY[to] || ['', '', ''];
  toast(`已到达${to} · <span class="dim">gate ${city[2]} — wait for the aisle, collect your bag, then deplane</span>`);
  say(`欢迎来到${to}。飞机停靠${city[2]}号登机口，请带好随身物品。`,
      `Welcome to ${flight ? flight.f.en : 'your destination'}. We are at gate ${city[2]}. Take your belongings.`);
  const riders = NPCS.filter(n => n.place === 'cabin' && n.hz === '乘客');
  riders.slice().sort((a, b) => b.z - a.z).slice(0, 10).forEach((n, i) => {
    const aisle = n.x < 0 ? -Cabin.AISLE : Cabin.AISLE;
    n.act = null; n.faceLock = false; n.wait = i * .45;
    n.errand = [
      { x:aisle, z:n.z, dwell:.10, speed:.62 },
      { x:aisle, z:Cabin.GALLEY - .62 - (i % 3) * .16, dwell:2.2, speed:.56 },
    ];
  });
  const crew = NPCS.filter(n => n.place === 'cabin' && (n.hz === '空乘' || n.hz === '空乘二'));
  crew.forEach((n, i) => {
    n.errand = [{ x:i ? Cabin.AISLE : -Cabin.AISLE, z:Cabin.GALLEY - .55,
                  dwell:99, speed:.66 }];
    n.face = Math.PI; n.faceLock = true;
  });
  updateHud();
}

// A single variable event gives each flight a story without turning the cabin into constant chaos.
// Storms follow the actual weather; otherwise the destination chooses a calm passenger situation.
function cabinEvent() {
  const to = flight ? flight.f.to : '上海';
  const kind = Weather.now.kind === 'storm' ? 'storm'
    : (Array.from(to).reduce((n, ch) => n + ch.charCodeAt(0), 0) % 3 === 0 ? 'medical'
      : Array.from(to).length % 2 ? 'child' : 'connection');
  TrainAudio.cabinChime();
  if (Pick.isOpen) {
    toast('客舱广播 · <span class="dim">the crew are handling a cabin situation</span>');
    return;
  }
  const cfg = kind === 'storm' ? {
    title:'雷雨 · Storm ahead', sub:'The captain asks everyone to secure the cabin',
    rows:[{hz:'系好安全带',py:'jì hǎo ānquándài',en:'fasten the belt and secure the tray'},
          {hz:'帮助旁边的人',py:'bāngzhù pángbiān de rén',en:'help the passenger beside you'}],
  } : kind === 'medical' ? {
    title:'客舱需要帮助 · Medical call', sub:'A passenger has become unwell',
    rows:[{hz:'呼叫乘务员',py:'hūjiào chéngwùyuán',en:'call the cabin crew'},
          {hz:'拿急救包',py:'ná jíjiùbāo',en:'bring the first-aid kit'},
          {hz:'保持通道畅通',py:'bǎochí tōngdào chàngtōng',en:'keep the aisle clear'}],
  } : kind === 'child' ? {
    title:'小乘客睡不着 · A child is restless', sub:'A small kindness can settle the row',
    rows:[{hz:'送耳机',py:'sòng ěrjī',en:'offer headphones'},
          {hz:'打开动画片',py:'dǎkāi dònghuàpiàn',en:'put on a cartoon'}],
  } : {
    title:'转机信息 · Connection update', sub:`Arrival information for ${to}`,
    rows:[{hz:'查看转机口',py:'chákàn zhuǎnjīkǒu',en:'check the connecting gate'},
          {hz:'告诉邻座',py:'gàosu línzuò',en:'share the update with your neighbour'}],
  };
  Pick.show({ ...cfg, onPick(r) {
    Cabin.secureEquipment(); Cabin.setBell(true);
    needs.mood = clamp(needs.mood + 5, 0, 100);
    say(`我来${r.hz}。`, `You choose to ${r.en}. The crew thank you.`);
    if (r.hz.includes('急救包')) Vocab.sentenceHTML('急救包');
    return true;
  }});
}

// The room only knows what the clock knows if somebody tells it. Both boards and the gate
// screen are redrawn from the schedule and from whatever is in your pocket.
function refreshSigns() {
  if (place === 'airport') {
    Airport.setBoard(minutes, flight && flight.f.no);
    Airport.setGate(minutes, flight && flight.f);
  } else if (place === 'bund') {
    Shanghai.setClock(minutes);          // the customs house keeps the game's own time
  }
}

// ---------------------------------------------------------------- 坐地铁 riding it
// Choosing a station used to arrive at one. Now it puts you on the train, and the train goes
// round the ring one stop at a time whether you are watching it or not: doors shut, a minute of
// tunnel, doors open, an announcement, and it is your business to be at the right doors when
// the station you asked for is the one outside them.
//
// 二号线 is a loop, so there is no terminus to turn round at — the index wraps, and which way
// round is whichever is fewer stops. You may get off anywhere it stops, not only where you said
// you were going: the destination you picked is what the announcements measure you against, and
// changing your mind halfway is allowed. What you are charged is settled at the exit gate off
// how far you actually went, which needs no extra arithmetic here, because `station` is kept
// true stop by stop as the train moves.
const LEG_SECS = 7.0;             // tunnel between two stations, in real seconds
const DWELL_SECS = 9.0;           // chime, announcement, then a generous fully-open exit window
const DOOR_SECS = 1.35;           // how long the leaves take to open or close
let ride = null;                  // { to, at, dir, state:'dwell'|'closing'|'run', t }

const nStations = () => Metro.STATIONS.length;
const ringNext = (i, dir) => (i + dir + nStations()) % nStations();

function board(toHz) {
  const N = nStations();
  const at = stationIndex(station), to = stationIndex(toHz);
  const fwd = (to - at + N) % N;                 // stops going one way round, versus the other
  ride = { to, at, dir: fwd <= N - fwd ? 1 : -1, state: 'dwell', t: 0 };
  TrainAudio.stop();
  setPlace('train');
  // The premium carriage is meant to be read down its aisle. The generic indoor camera rises
  // above this low train roof, where luggage racks obscure the seats; an eye-level, closer view
  // gives the same ordered rows and long perspective as the real-carriage reference.
  CAM.tPitch = CAM.pitch = .16;
  CAM.tDist = CAM.dist = 3.25;
  CAM.lookY = 1.08;
  Train.setDestination(to);
  Train.setStops(at, ringNext(at, ride.dir));
  Train.setArrived(true);
  Train.setDoors(1);
  Train.setMotion(0);
  // You board into the middle of other people boarding, which is the only version of this that
  // does not look like the carriage was waiting for you personally.
  carriageStop();
  const s = Metro.STATIONS[to];
  say(`我坐到${s.hz}。`, `I'm riding as far as ${s.en}.`);
  Vocab.sentenceHTML(s.hz);
  updateHud();
}

// Left and right are relative to the way the train is going, which is the only way an
// announcement can mean anything: travelling in +x, the +z side of the car is your right.
function alightingSide() {
  const side = Train.SIDES[ride.at];
  return (side > 0) === (ride.dir > 0) ? '右' : '左';
}

// ---------------------------------------------------------------- 上下车 getting on and off
// At every station some of the seated passengers walk out and some new ones walk in, through the
// doors that are actually open. Each journey is a queue of waypoints — the same `errand` mechanism
// the waitress uses to carry a bowl to a table — because NPCs walk in straight lines and ignore
// collision, so the route has to be spelled out or they would swim through the seats: stand up into
// your own half of the aisle, walk along it, cross at the doorway where there is nothing to walk
// through, and step out.
//
// Nobody is created or destroyed, because a body appearing out of nothing is worse than an empty
// seat. There are eleven passengers and four of them are always off the train. Getting off means
// walking out of the door and on down the platform until the car's own wall is between you and the
// camera, and only then leaving the world — so the vanishing happens where it cannot be watched.
// z of each half of the aisle, so the two directions keep to their own. 0.20 rather than 0.30,
// because a body is about 0.18 across the shoulders and the armrest on the aisle side of every seat
// reaches in to z 0.4225: at 0.30 everyone walking the aisle went through every armrest they passed,
// and at 0.24 they cleared them by two and a half millimetres, which is not clearance.
const AISLE = .20;
// How far forward of the seat centre somebody stands to get in or out of it. This is worked out per
// seat in `Train.coachSeats` from the armrest in the way and the row in front, and is null for the
// seats there is no room to do it in — those are kept out of the rider pool entirely.
const seatOut = s => s.walkOut != null ? s.walkOut : .46;
const DOORIN = 1.14;      // z of the doorway, still inside the car
const DOOROUT = 1.95;     // z on the platform, one step outside it
const WING = 1.70;        // how far along the platform before the car wall hides them
const ABOARD = 7;         // how full the carriage tries to be

function riderDoor(x) {
  let best = Train.DOORX[0];
  for (const dx of Train.DOORX) if (Math.abs(dx - x) < Math.abs(best - x)) best = dx;
  return best;
}

// Out of the seat, along the aisle, through the doors and away down the platform.
function riderAlight(r, side, delay) {
  const seat = r.seat;
  if (!seat) return;
  const sx = seat.x + .10, half = seat.z < 0 ? -AISLE : AISLE, out = seat.x + seatOut(seat);
  const dx = riderDoor(sx), wing = dx + (dx < 0 ? -WING : WING);
  r.seat = null;                        // the seat is free from the moment they stand up
  r.fromSeat = seat;                    // but remember which one, in case the doors beat them to it
  r.errand = [
    // A beat in the seat first, so the whole carriage does not rise on the same frame.
    { at: [sx, seat.z], dwell: delay, face: seat.yaw, act: r.sitAct },
    // Stand up and step *forward* out of the seat before turning for the aisle. Going straight
    // sideways took them through the armrest: the rows face forward and every aisle seat has one on
    // its aisle side at z ±0.46, so a body sliding from the cushion to the gangway went through it.
    { at: [out, seat.z] },
    { at: [out, half] },
    { at: [dx, half] },
    { at: [dx, side * DOORIN] },
    { at: [dx, side * DOOROUT] },
    { at: [wing, side * DOOROUT], done: () => { r.gone = true; r.errand = null; } },
  ];
}

// Down the platform, in through the doors and along the aisle to a free seat.
function riderBoard(r, side, seat, delay) {
  const sx = seat.x + .10, half = seat.z < 0 ? -AISLE : AISLE, out = seat.x + seatOut(seat);
  const dx = riderDoor(sx), wing = dx + (dx < 0 ? -WING : WING);
  r.seat = seat;
  r.fromSeat = null;
  r.gone = false;
  r.x = wing; r.z = side * DOOROUT; r.yaw = dx < 0 ? Math.PI / 2 : -Math.PI / 2;
  r.errand = [
    { at: [wing, side * DOOROUT], dwell: delay },
    { at: [dx, side * DOOROUT] },
    { at: [dx, side * DOORIN] },
    { at: [dx, half] },
    // Along the aisle to in front of the seat, then in, then sit — the reverse of getting out, and
    // for the same reason: straight in from the gangway crosses the armrest.
    { at: [out, half] },
    { at: [out, seat.z] },
    // The last leg already wears the sitting pose, so nobody stands to attention for a frame
    // before sitting down. `done` moves their permanent spot to the new seat: without that the
    // errand would empty and they would set off back to the seat they had two stations ago.
    { at: [sx, seat.z], face: seat.yaw, act: r.sitAct, done: () => {
        r.spots[0].at = [sx, seat.z];
        r.spots[0].face = seat.yaw;
        r.spots[0].act = r.sitAct;
        r.errand = null;
      } },
  ];
}

// Called as the train comes to a stand. How many get off is weighted rather than random, so the
// carriage tends back toward seven aboard: enough to look occupied without the frame ever paying
// for eleven figures at once.
function carriageStop() {
  if (!ride || !RIDERS.length || typeof Train === 'undefined' || !Train.SEATS.length) return;
  const side = Train.SIDES[ride.at] || 1;
  const aboard = RIDERS.filter(r => !r.gone);
  const waiting = RIDERS.filter(r => r.gone && !r.errand);
  // The priority seats keep their occupants — those two are the reason the priority seats read as
  // priority seats — and nobody already on their feet is given a second errand.
  const canGo = aboard.filter(r => r.seat && !r.errand && !r.care);
  const leaving = Math.min(canGo.length, 1 + (Math.random() < .55 ? 1 : 0));
  let delay = .45;
  for (let i = 0; i < leaving; i++) {
    riderAlight(canGo[(ride.at * 2 + i) % canGo.length], side, delay);
    delay += .75;
  }
  const taken = new Set(RIDERS.map(r => r.seat).filter(Boolean));
  // Aisle seats only, for the same reason the starting seven get them: see the pool above.
  const room = Train.SEATS.filter(s =>
    !s.care && (s.slot === 1 || s.slot === 2) && s.walkOut != null && !taken.has(s));
  const after = aboard.length - leaving;
  const boarding = Math.max(0, Math.min(waiting.length, room.length,
    ABOARD - after + (Math.random() < .35 ? 1 : 0)));
  // Boarders start after the leavers, because on a real platform you wait for the doors to clear.
  delay = 1.9;
  for (let i = 0; i < boarding; i++) {
    riderBoard(waiting[i], side, room[(ride.at * 5 + i * 3) % room.length], delay);
    delay += .85;
  }
}

// The doors are closing, or the player has stepped off. Anybody still on their feet is put where
// they were going: a passenger halfway down the aisle when the train pulls out would keep walking
// straight through a shut door.
function settleRiders() {
  const taken = new Set(RIDERS.map(r => r.seat).filter(Boolean));
  for (const r of RIDERS) {
    if (!r.errand) continue;
    r.errand = null;
    if (!r.seat) {
      // They were leaving. If they had already reached the doorway, they made it out. If they were
      // still beside their own seat when the doors shut then they never left the carriage, and
      // deleting them there would be a body vanishing in the middle of the floor — so they sit back
      // down, provided nobody has taken the seat in the meantime.
      if (Math.abs(r.z) < DOORIN - .1 && r.fromSeat && !taken.has(r.fromSeat)) {
        r.seat = r.fromSeat; taken.add(r.seat);
      } else { r.gone = true; r.fromSeat = null; continue; }
    }
    r.fromSeat = null;
    r.x = r.seat.x + .10; r.z = r.seat.z; r.yaw = r.seat.yaw;
    r.gone = false;
    r.spots[0].at = [r.x, r.z];
    r.spots[0].face = r.seat.yaw;
    r.spots[0].act = r.sitAct;
  }
}

// Keep the station's own traffic going. A commuter who has run out of waypoints gets the next leg
// of the loop, and only while somebody is standing in the room to see it: NPCs are only integrated
// where the player is, so ticking this anywhere else would hand out legs nobody ever walks.
function tickStation(dt) {
  if (place !== 'metro') return;
  // The clock decides how many belong here. Nobody is ever pulled out of the room to meet it —
  // they finish the journey they are on and the crowd thins as they go, which is how a station
  // actually empties. This only governs who is let back in.
  const room = stationCrowd();
  let here = 0;
  for (const c of COMMUTERS) if (!c.gone) here++;
  // What the timetable is doing, which the crowd now has to agree with: you cannot board a train
  // that is not there, and you cannot step off one either.
  const berthed = Metro.trainNow().phase === 'berthed';
  // The doors have shut. Anybody still trackside of the platform edge is on that train — and rather
  // than blinking out of existence in a doorway somebody may be watching, they stay exactly where
  // they are standing and go with the car. What that looks like is a departing train with people
  // standing in it, and it moves their disappearance out to behind the tunnel mouth where nothing
  // can see it happen. It is also the only thing that stops a body being left on the ballast after
  // the car has pulled out from under it.
  const tr = Metro.trainNow();
  if (!berthed) for (const c of COMMUTERS) {
    if (c.gone || c.riding || c.z <= Metro.EDGEZ) continue;
    c.riding = true; c.rideX = c.x - tr.x; c.errand = null;
    // Whatever they were part-way through, the train has taken them, so they come back as somebody
    // arriving: stage 4 is stepping off. Without this they resumed wherever they had got to and
    // walked out of the car towards a turnstile on a diagonal through half the room.
    c.stage = 4;
    dropSpots(c);
  }
  for (const c of COMMUTERS) {
    if (!c.riding) continue;
    c.x = c.rideX + tr.x;
    c.ground = 0;
    // Standing still while the floor moves: their own position is handed back as their spot so the
    // update loop has nothing to walk them towards.
    c.spots[0].at = [c.x, c.z];
    c.spots[0].face = Math.PI;
    c.spots[0].act = 'wait';
    if (tr.phase !== 'away') continue;
    c.riding = false; c.gone = true; c.byTrain = true;
    c.back = Metro.WALK.hide.reduce((a, b) =>
      Math.abs(b.x - c.x) < Math.abs(a.x - c.x) ? b : a);
    c.away = 6 + Math.random() * 14;
    here--;
  }
  // ---- who steps aboard this frame. Everybody waiting gets on the train that comes; they follow
  // each other through the doors rather than all going at once. Two things were wrong before:
  //
  //  - the window was the first half of the dwell and the spacing was wide, so at most two people
  //    boarded each train and anybody else stood and watched it leave. A boarder only has to be over
  //    the threshold before the doors move — being shut in is not a failure, it is the point — so the
  //    window now runs almost to the end of the dwell.
  //  - and the list was scanned in order, so the same two boarded every time and whoever sat late in
  //    the array was starved. Longest wait goes first.
  // How long since the last one set off before the next may go. Wide early in the dwell so they
  // trickle through, and almost nothing at the end of it: with the doors about to close, somebody
  // still standing on the mark hurries aboard rather than watching it go, which is what a person
  // does and is the difference between a queue and a line of people ignoring a train.
  const gap = tr.openLeft < 2.6 ? .5 : 1.4;
  let boarder = null;
  // 0.9 is the true floor — that is how long crossing the threshold takes, and being shut inside is
  // a successful boarding. At 1.5 anybody who reached the mark late in the dwell was turned away.
  if (berthed && tr.openLeft >= .9 && minutes - lastBoardAt >= gap)
    for (const c of COMMUTERS) {
      if (c.gone || c.riding || c.stage !== 3) continue;
      if (c.errand && c.errand.length) continue;       // mid-walk, or mid stand-still
      const mine = c.waitSince === undefined ? 1e9 : c.waitSince;
      const best = !boarder || boarder.waitSince === undefined ? 1e9 : boarder.waitSince;
      if (!boarder || mine < best) boarder = c;
    }
  for (const c of COMMUTERS) {
    // Away on the train they boarded, or up the steps. `updateNPCs` skips anyone who is not awake,
    // so the wait is counted here, and here is also where they are put back: in the same spot that
    // hid them leaving, so that neither the going nor the coming back is ever seen happening.
    if (c.gone) {
      c.away -= dt;
      if (c.away > 0) continue;
      // Full for this hour, so they wait for the train after next rather than walk into a station
      // that is meant to be quiet.
      if (here >= room) { c.away = 4 + Math.random() * 7; continue; }
      // Somebody who left on a train has to arrive on one. Until there is a train standing at the
      // platform with its doors open there is nothing for them to step out of, so they stay away —
      // which is also what makes the crowd on the platform build between trains and empty when one
      // goes, without anybody having written that behaviour down.
      // Somebody who left on a train has to arrive on one, and has to have long enough left of the
      // dwell to walk out of it before the doors shut. One person per berth, too: with three of them
      // due back at once they all stepped out of the same train through the same doorway, which is
      // the "amount of them" problem — a platform fills by ones and twos between trains, not in a
      // batch on each.
      if (c.byTrain) {
        // 5.5 rather than the boarder's 3.8: getting off is the longer walk of the two. A boarder
        // only has to cross the threshold before the doors move — once they are inside, the doors
        // closing on them is not a failure, it is the point. Somebody getting off has to come the
        // width of the car and out, and if they do not make it the train takes them back.
        //
        // Spaced by time rather than capped at one a train. One was right at a fifteen-minute
        // headway and is far too thin at sixty: an hourly train that puts one person on the platform
        // is not an hourly train, and with six of them cycling through that bottleneck nobody ever
        // got round the circuit. Two and a half minutes apart is a handful over a fifteen-minute
        // dwell, arriving in ones and twos.
        if (!berthed || tr.openLeft < 5.5) continue;
        if (minutes - lastOffAt < 2.5) continue;
        lastOffAt = minutes;
      }
      here++;
      // The spot they were standing in when they left, recorded rather than recomputed: there are
      // two ways out of this room — a train and a staircase — and somebody who went up the steps
      // has to come back down them rather than materialise inside the car.
      const back = c.back || Metro.WALK.hide[0];
      c.x = back.x; c.z = back.z;
      c.yaw = back === Metro.WALK.stairTop ? 0 : Math.PI;
      c.gone = false;
      c.errand = null;
    }
    if (!c.errand || !c.errand.length) {
      // Stage 3 is stepping aboard, and only whoever was chosen above gets to. Everybody else stands
      // on their painted mark and is asked again in a moment: the leg queue has no way to say "wait
      // until", and a short stand-still re-issued is cheaper than teaching it one. `waitSince` is
      // when they started standing, which is what decides who goes next.
      if (c.stage === 3 && c !== boarder) {
        if (c.waitSince === undefined) c.waitSince = minutes;
        c.errand = [{ at: [c.x, c.z], dwell: .4, face: 0, act: 'wait' }];
        continue;
      }
      if (c.stage === 3) { lastBoardAt = minutes; c.waitSince = undefined; }
      c.errand = commuterNext(c);
    }
  }
}

function tickRide(dt) {
  if (!ride || place !== 'train') return;
  // Once 下车 has begun, keep the train at the platform until the action finishes. Starting a
  // perfectly valid two-second step off the car must never end with the train leaving underneath
  // the player because the dwell timer happened to expire halfway through it.
  if (!(doing && doing.def.alight)) ride.t += dt;
  if (ride.state === 'dwell') {
    Train.setMotion(0);
    TrainAudio.setMotion(0);
    Train.setDoors(Math.min(1, ride.t / DOOR_SECS));
    if (ride.t < DWELL_SECS) return;
    ride.state = 'closing'; ride.t = 0;
    settleRiders();
    Train.setArrived(false);
    TrainAudio.doors('close');
    const next = ringNext(ride.at, ride.dir);
    Train.setStops(ride.at, next);
    const s = Metro.STATIONS[next];
    say(`车门关闭，下一站，${s.hz}。`, `Doors closing. Next stop: ${s.en}.`);
    return;
  }
  // Close completely while the car is still standing at the platform. Apart from looking more
  // natural, this gives the closing movement its own readable beat instead of pulling away with
  // a metre of daylight still between the leaves.
  if (ride.state === 'closing') {
    Train.setMotion(0);
    TrainAudio.setMotion(0);
    Train.setDoors(Math.max(0, 1 - ride.t / DOOR_SECS));
    if (ride.t < DOOR_SECS) return;
    ride.state = 'run'; ride.t = 0;
    Train.setDoors(0);
    return;
  }
  // Pulling away and braking, so the tunnel does not snap from nothing to line speed and the
  // straps have something to swing about.
  const speed = Math.max(0, Math.min(1, ride.t / 1.8, (LEG_SECS - ride.t) / 1.8));
  Train.setMotion(speed);
  TrainAudio.setMotion(speed);
  Train.setDoors(0);
  if (ride.t < LEG_SECS) return;
  ride.at = ringNext(ride.at, ride.dir);
  ride.state = 'dwell'; ride.t = 0;
  carriageStop();
  TrainAudio.setMotion(0);
  station = Metro.STATIONS[ride.at].hz;
  Metro.setStation(station);
  Train.setStops(ride.at, ringNext(ride.at, ride.dir));
  Train.setArrived(true);
  advanceTime(3);
  const s = Metro.STATIONS[ride.at], word = alightingSide();
  const en = word === '右' ? 'right' : 'left';
  TrainAudio.doors('open');
  // The loudspeaker says the station name and nothing else. Which side the doors open is on screen
  // below, in both languages, which is a better place for it than nineteen syllables of echo.
  TrainAudio.arrive(s.hz);
  say(`${s.hz}站到了，请从${word}边下车。`,
      `${s.en}. Doors open on the ${en}.`);
  if (ride.at === ride.to)
    toast(`目的地到了 · <span class="dim">DESTINATION — get off at the ${en}-hand doors</span>`);
  updateHud();
}

// Off the train and onto the platform of wherever it has stopped.
function alight() {
  if (!ride) return;
  station = Metro.STATIONS[ride.at].hz;
  Metro.setStation(station);
  settleRiders();
  ride = null;
  // The station name belongs on the platform too. Stop only the rolling bed here, allowing the
  // arrival announcement to finish even when the player steps through the doors immediately.
  TrainAudio.stopMotion();
  Train.setMotion(0);
  Train.setArrived(false);
  Train.setDestination(-1);
  Train.setDoors(0);
  setPlace('metro');
  // On the platform, inside the gates, facing back at the train you just left.
  P.x = 0; P.z = Metro.EDGEZ - 1.70; P.yaw = Math.PI;
  CAM.fx = P.x; CAM.fz = P.z;
  goalEvent('travel', station);
  updateHud();
}

// ---- the jobs on the office whiteboard. Outside its own hours a job is still written up there
// and still greyed out, which is how you find out that 加班 only exists in the evening.
// ---- 药店 的柜台. 你哪儿不舒服？ — the one question this shop exists to ask, and the four answers
// a person actually gives. Each is a headword, each costs what that medicine costs, and each mends
// a different thing about you: a cold is mood, a fever is rest, a headache is mood and rest, a
// cough is the cheap one. Saying it is the whole interaction — there is no illness system behind
// this and it does not need one. The player who has stood here once knows how to say 我头疼.
const REMEDIES = [
  { hz:'感冒', py:'gǎnmào', en:'I have a cold', buy:'感冒药', cost:26,
    gain:{ mood:14, rest:6 },
    say:['我感冒了。', 'I have got a cold.'],
    back:['感冒药，一天三次，饭后吃。', 'Cold medicine. Three times a day, after meals.'] },
  { hz:'发烧', py:'fāshāo', en:'I have a fever', buy:'退烧药', cost:32,
    gain:{ mood:10, rest:16 },
    say:['我发烧了。', 'I have got a fever.'],
    back:['先量体温，退烧药在这儿。', 'Take your temperature first. Here is something for the fever.'] },
  { hz:'头疼', py:'tóuténg', en:'my head hurts', buy:'止疼药', cost:20,
    gain:{ mood:16, rest:4 },
    say:['我头疼。', 'My head hurts.'],
    back:['头疼药，别空腹吃。', 'For the headache. Not on an empty stomach.'] },
  { hz:'咳嗽', py:'késou', en:'I have a cough', buy:'咳嗽药水', cost:15,
    gain:{ mood:8, rest:5 },
    say:['我咳嗽。', 'I have got a cough.'],
    back:['糖浆，睡前喝一次。', 'Syrup. Once before bed.'] },
];

// ---- 医院.  A complete public-hospital visit: say what is wrong, receive a queue number and a
// department, get triaged, see the doctor, follow the ordered test and finish treatment.  The
// pharmacy remains the quick errand; this is the slower, more capable path with the harder words.
const HOSPITAL_CASES = [
  { hz:'发烧', py:'fāshāo', en:'I have a fever and cannot keep fluids down', dept:'内科', room:'201',
    test:'抽血', testEn:'a blood test', needsTest:true, consult:28, testCost:42, treat:48,
    care:'输液', careEn:'Have the prescribed IV infusion',
    gain:{rest:38,mood:22,clean:4},
    say:'我发烧了，也喝不下水。', advice:'检查显示有脱水，抽血后去输液室补液。',
    adviceEn:'You are dehydrated. Have the blood test, then receive IV fluids in the infusion room.' },
  { hz:'头疼', py:'tóuténg', en:'my head hurts', dept:'内科', room:'201',
    test:'CT机', testEn:'a CT scan', needsTest:true, consult:26, testCost:90, treat:35,
    gain:{rest:28,mood:24,clean:2},
    say:'我头疼。', advice:'先量血压，再去三楼做CT。',
    adviceEn:'Check your blood pressure, then have a CT scan on the third floor.' },
  { hz:'肚子疼', py:'dùziténg', en:'my stomach hurts', dept:'内科', room:'201',
    test:'超声', testEn:'an ultrasound', needsTest:true, consult:30, testCost:65, treat:55,
    gain:{rest:34,mood:24,clean:3},
    say:'我肚子疼。', advice:'去三楼做超声，然后回来。',
    adviceEn:'Go to the third floor for an ultrasound, then come back.' },
  { hz:'咳嗽', py:'késou', en:'I have a cough', dept:'呼吸内科', room:'205',
    test:'X光', testEn:'an X-ray', needsTest:true, consult:28, testCost:58, treat:42,
    gain:{rest:32,mood:20,clean:3},
    say:'我一直咳嗽。', advice:'去三楼拍一张X光片。',
    adviceEn:'Go to the third floor for an X-ray.' },
  { hz:'扭伤', py:'niǔshāng', en:'I twisted my ankle', dept:'外科', room:'202',
    test:'X光', testEn:'an X-ray', needsTest:true, consult:32, testCost:58, treat:70,
    gain:{rest:42,mood:25,clean:2},
    say:'我脚扭伤了。', advice:'先拍片，别用受伤的脚走路。',
    adviceEn:'Get an X-ray and keep weight off the injured foot.' },
  { hz:'牙疼', py:'yáténg', en:'my tooth hurts', dept:'口腔科', room:'204',
    test:'口腔检查', testEn:'a dental examination', needsTest:false, consult:35, testCost:0, treat:85,
    gain:{rest:18,mood:34,clean:6},
    say:'我牙疼。', advice:'去口腔科二零四诊室。',
    adviceEn:'Go to dental clinic, room 204.' },
];

const hospitalCase = () => HOSPITAL_CASES.find(r => r.hz === hospitalVisit.case) || null;
function hospitalFresh() {
  if (hospitalVisit.day === day) return;
  // A registration slip is a visit, not a calendar-day consumable. Long observations and IVs can
  // legitimately cross midnight; roll an unfinished visit onto the new day so the action that
  // just completed cannot erase its own progress. Completed visits still clear the following day.
  if (hospitalVisit.case && hospitalVisit.stage>0 && hospitalVisit.stage<6) {
    hospitalVisit.day=day;
    // Completion saved the clinical result before the HUD noticed the calendar rollover. Persist
    // the rolled slip too, otherwise reloading at this exact point would resurrect yesterday's
    // timestamp and make the continuity fix depend on another frame being rendered first.
    saveGame();
    return;
  }
  hospitalVisit = { day, case:null, number:null, stage:0, tested:false,
                    treated:false, dispensed:false, emergency:false };
}

// A hospital visit crosses four lazy scenes, while the instruction after each action is spoken
// only once. Keep one canonical route here so the on-screen slip, phone and tests can never
// disagree about the next floor or room. Optional tests are visibly skipped rather than presented
// as work the player somehow completed.
function hospitalGuide() {
  hospitalFresh();
  const r=hospitalCase();
  const steps=[
    {label:'挂号',zh:'一楼 · 挂号处',en:'Register at the desk or self-service kiosk'},
    {label:'分诊',zh:'一楼 · 分诊台',en:'Take the registration slip to triage'},
    {label:'就诊',zh:r?`二楼 · ${r.dept} ${r.room}诊室`:'二楼 · 对应诊室',
      en:r?`See the ${r.dept} doctor in room ${r.room}`:'See the assigned doctor'},
    {label:'检查',zh:r?`三楼 · ${r.test}`:'三楼 · 检查科',
      en:r?`Complete ${r.testEn}`:'Complete the ordered test'},
    {label:'治疗',zh:r?`三楼 · ${r.care||'治疗室'}`:'三楼 · 治疗室',
      en:r?(r.careEn||'Complete treatment in the treatment room'):'Complete the prescribed treatment'},
    {label:'取药',zh:'三楼 · 药房',en:'Collect the prescribed medicine'},
    {label:'出院',zh:'四楼 · 出院处',en:'Complete the discharge paperwork'},
  ];
  const states=!r
    ? steps.map(()=> 'wait')
    : [
        'done',
        hospitalVisit.stage>=2?'done':'wait',
        hospitalVisit.stage>=3?'done':'wait',
        r.needsTest?(hospitalVisit.tested?'done':'wait'):'skip',
        hospitalVisit.treated?'done':'wait',
        hospitalVisit.dispensed?'done':'wait',
        hospitalVisit.stage>=6?'done':'wait',
      ];
  let next=states.findIndex(s=>s==='wait');
  if(next<0&&!r) next=0;
  steps.forEach((s,i)=>s.status=i===next?'next':states[i]);
  return { case:r, number:hospitalVisit.number||'', steps, next,
    nextStep:next>=0?steps[next]:null, complete:!!r&&next<0 };
}

// The phone keeps the actual registration slip available outside the hospital as well. It is an
// informational panel: choosing a line repeats that instruction instead of teleporting the player
// or silently completing a clinical step.
function openHospitalSlip() {
  const guide=hospitalGuide();
  if(!guide.case){say('今天还没有挂号。','You have not registered for a hospital visit today.');return;}
  Pick.show({
    title:`就诊单 · ${guide.number}`,
    sub:`${guide.case.hz} · ${guide.case.dept} ${guide.case.room}诊室 · hospital care route`,
    start:guide.nextStep?guide.nextStep.label:'返回',
    rows:[
      {hz:'返回',py:'fǎnhuí',en:'back to the phone',back:true},
      {sec:'就诊流程',en:'your progress'},
      ...guide.steps.map(s=>({hz:s.label,py:'',
        en:s.status==='skip'?'No test was ordered for this visit':s.en,
        right:s.status==='done'?'✓':s.status==='skip'?'免检':s.status==='next'?'下一步':'',
        guide:s,off:s.status!=='next'})),
    ],
    onPick(row){
      if(row.back){openPhone();return false;}
      if(row.guide) say(row.guide.zh,row.guide.en);
      return false;
    },
  });
}

function updateHospitalStatus() {
  const el=$('#hospitalStatus');
  if(!el) return;
  const inHospital=['hospital','hospital2','hospital3','hospital4'].includes(place);
  el.classList.toggle('on',inHospital);
  if(!inHospital) return;
  const guide=hospitalGuide(), next=guide.nextStep;
  const phase=guide.complete?'就诊完成 · CARE COMPLETE':`下一步 · ${next.zh}`;
  const detail=guide.case
    ? `${guide.case.hz} · ${guide.case.dept} ${guide.case.room} · ${guide.complete?'Treatment, medicine and discharge complete':next.en}`
    : next.en;
  const sig=[guide.number,phase,detail,...guide.steps.map(s=>s.status)].join('|');
  if(el.dataset.sig===sig) return;
  el.dataset.sig=sig;
  el.querySelector('.ticket').textContent=guide.number||'未挂号';
  el.querySelector('.phase').textContent=phase;
  el.querySelector('.detail').textContent=detail;
  const nodes=el.querySelectorAll('.careStep');
  guide.steps.forEach((s,i)=>{ if(nodes[i]) nodes[i].className=`careStep ${s.status}`; });
}

function openHospitalRegistration(emergency=false) {
  hospitalFresh();
  const fee=emergency?25:15;
  Pick.show({
    title: emergency ? '急诊 · 哪里不舒服？' : '挂号 · 哪里不舒服？',
    sub: emergency
      ? `Emergency registration · ¥${fee} · the emergency nurse will triage you now`
      : `Choose the symptom to register · ¥${fee} · the slip gives you a department and room`,
    start:hospitalVisit.case,
    rows:HOSPITAL_CASES.map(r=>({
      hz:r.hz,py:r.py,en:r.en,right:`${r.dept} ${r.room} · ¥${fee}`,
      off:money<fee,hospitalCase:r,
    })),
    onPick(row) {
      const r=row.hospitalCase;
      if(money<fee){say('挂号费不够。',`Not enough for the ¥${fee} registration fee.`);return false;}
      money-=fee;
      const seq=10+((day*17+Math.floor(minutes))%80);
      hospitalVisit={day,case:r.hz,number:(emergency?'E':'A')+String(seq).padStart(3,'0'),
        stage:emergency?2:1,tested:false,treated:false,dispensed:false,emergency};
      Vocab.introduce(r.hz);
      Vocab.introduce(r.dept);
      const next=emergency?'急诊护士已经分诊。':`先去分诊台，再上二楼${r.room}诊室。`;
      say(`${r.say} 挂${r.dept}，${hospitalVisit.number}号。${next}`,
        `${r.en}. ${r.dept}, number ${hospitalVisit.number}. ${emergency
          ? 'Emergency triage is complete.' : `Triage first, then room ${r.room} on the second floor.`}`);
      logDiary(`在仁和医院挂号，说了“${r.say}”，挂${r.dept}${r.room}诊室。`,
        `Registered at Renhe Hospital for ${r.en} — ${r.dept}, room ${r.room}.`,'hospital-register');
      saveGame();
      return true;
    },
  });
}

function openHospitalFloors(kind) {
  const current={hospital:1,hospital2:2,hospital3:3,hospital4:4}[place]||1;
  const byStairs=kind==='stairs';
  Pick.show({
    title:byStairs?'安全楼梯 · 去几楼？':'电梯 · 去几楼？',
    sub:byStairs?'Take the fire stairs — slower, but always available':'Choose a floor · 1F–4F',
    start:['','一楼','二楼','三楼','四楼'][current],
    rows:HOSPITAL_FLOORS.map(f=>({hz:f.hz,py:['','yī lóu','èr lóu','sān lóu','sì lóu'][f.n],
      en:f.en,right:f.name,off:f.n===current,floor:f})),
    onPick(row) {
      const f=row.floor;
      if(f.n===current){say(`已经在${f.hz}了。`,`You are already on the ${f.en}.`);return false;}
      const d=Math.abs(f.n-current);
      // Arrive at the vertical core that was actually used. The two fixtures are at opposite
      // ends of the same corridor, so falling back to a scene spawn made the stairs open at the
      // lift (and sent either route to the front door on 1F).
      setPlace(f.place, byStairs
        ? { x:-15.0, z:-8.05, yaw: Math.PI/2 }
        : { x: 15.0, z:-8.05, yaw:-Math.PI/2 });
      advanceTime(d*(byStairs?3:1));
      if(byStairs) needs.rest=clamp(needs.rest-d*1.5,0,100);
      Vocab.sentenceHTML(f.hz);
      say(`${byStairs?'走楼梯':'坐电梯'}到${f.hz}。`,
        `${byStairs?'Stairs':'Lift'} to the ${f.en}.`);
      saveGame();
      return true;
    },
  });
}

// ---- 京华大酒店. Unlike the hospital's fast utility lift, this one keeps the player inside an
// authored car while it closes, travels and opens. Stairs expose only adjacent authored stops;
// the lift panel exposes B1 and all twelve numbered floors, and computes travel time from physical
// storey distance.
const hotelFloorAt=key=>HOTEL_FLOORS.find(f=>f.key===key);

// ---------------------------------------------------------------- 京华大酒店客房
// Everything in this section is game.js asking js/stay.js a question and then putting a body in a
// corridor. Not one rule lives here: what a night costs, what is on the bill, when the laundry
// comes back and whether the room has been serviced are all `Stay`'s, and it is the one module
// that may change them.
//
// H113 — the curtains, the bedside lights and the television persisting the night — has nothing
// here either, and still deliberately. What it needed was persistent state of its own, and new
// persistent state has to join the bjlife.save.v1 schema and its loader guard: that half is now
// landed as `room` / `HotelRoom.load` further down this file, against `HotelRoom` in js/hotel.js.
// The rules are that module's and the switch is the fit-out's; nothing about a guestroom fixture
// belongs in this section, which is only game.js putting a body in a corridor.
//
// 客房送餐 (H115). Ordered from the room, priced, and it arrives late — because in a hotel
// everything arrives later. The delay is js/stay.js's; the panel is the choice.
const ROOM_SERVICE=[
  {hz:'牛肉面',py:'niúròumiàn',en:'beef noodles, under a cloche',amt:68,mins:28,
   gain:{food:34,mood:8}},
  {hz:'饺子',py:'jiǎozi',en:'a plate of dumplings',amt:52,mins:26,gain:{food:30,mood:9}},
  {hz:'粥',py:'zhōu',en:'congee, which is what you want at this hour',amt:38,mins:22,
   gain:{food:22,mood:6}},
  {hz:'水果',py:'shuǐguǒ',en:'a fruit plate',amt:45,mins:20,gain:{food:16,mood:7}},
  {hz:'啤酒',py:'píjiǔ',en:'a cold beer',amt:32,mins:18,gain:{mood:12}},
];
function openRoomService(){
  if(typeof Stay==='undefined'||!Stay.checkedIn||!Stay.checkedIn()){
    say('客房服务只给住店客人。','Room service is for guests staying in the hotel.');return;
  }
  const already=Stay.service&&Stay.service();
  if(already){
    say(`${already.hz}已经在做了，一会儿送上来。`,
        `The ${already.en} is already on its way up.`);return;
  }
  Pick.show({
    title:'客房服务 · 送餐到房间',
    sub:'记在房账上，退房时一起结 · charged to the room, settled at check-out',
    rows:[{sec:'点什么',en:'what would you like sent up'}].concat(
      ROOM_SERVICE.map(r=>({hz:r.hz,py:r.py,en:`${r.en} · 大约${r.mins}分钟`,
                            right:`¥${r.amt}`,svc:r}))),
    onPick(row){
      const r=row.svc;
      const o=Stay.orderService(r.hz,r.en,r.amt,minutes,r.mins);
      if(!o){say('现在没法点。','That cannot be ordered right now.');return false;}
      serviceGain=r.gain;
      say(`${r.hz}，大约${r.mins}分钟送到。`,`${r.en} — about ${r.mins} minutes.`);
      Vocab.sentenceHTML(`我要一份${r.hz}。`);
      saveGame();
      return true;
    },
  });
}
// What the food does to you when it arrives, held beside the order rather than inside it: the
// order is js/stay.js's and js/stay.js has no opinion about needs. A reload between ordering and
// eating loses only the appetite figures, so a plate restored from a save still feeds you.
let serviceGain=null;
const SERVICE_GAIN_DEFAULT={food:26,mood:7};

// ---- somebody who walks it up. A tray that materialises in the room is a notification; a tray
// carried down the corridor by the floor attendant is a hotel. `errand` is the same mechanism the
// waitress and the cabin crew use, so the walk, the carry pose and the arrival are already solved.
//
// Used for both things that come to the door: the tray (H115) and the engineer up from B1 on the
// service lift (H121). They differ only in who walks and what they say.
function hotelWalkTo(who,at,carryKind,dwell,done){
  const n=NPCS.find(q=>q.place===place&&q.awake&&(!who||q.hz===who||q.name===who));
  if(!n){ done(); return false; }     // nobody rostered on this floor: the thing still arrives
  n.errand=[{at:[at[0],at[1]],speed:1.15,dwell:dwell||2.2,carry:!!carryKind,carryKind:carryKind||null,
             done},
            {at:[n.spots&&n.spots[0]?n.spots[0].at[0]:15.6,n.spots&&n.spots[0]?n.spots[0].at[1]:-3.7],
             speed:1.05}];
  n.wait=0;
  return true;
}
// One check a second at most, from the frame loop, and only while the player is on their own
// floor. An empty hotel costs the street nothing — the standing rule for this building — and a
// player who is out has nothing to be delivered to.
let hotelServiceAt=0;
function tickHotelRoom(now){
  if(typeof Stay==='undefined'||!Stay.checkedIn||!Stay.checkedIn()) return;
  if(now-hotelServiceAt<1000) return;
  hotelServiceAt=now;
  const b=Stay.booking(day,minutes);
  if(!b||b.floor!==place) return;
  if(Stay.serviceDue(minutes)){
    hotelWalkTo(null,[P.x,P.z+1.2],'tray',2.4,()=>{
      const o=Stay.serviceArrived(day);
      if(!o) return;
      const g=serviceGain||SERVICE_GAIN_DEFAULT; serviceGain=null;
      for(const k in g) needs[k]=clamp(needs[k]+g[k],0,100);
      say(`您的${o.hz}，记在房账上。`,`Your ${o.en} — ¥${o.amt}, charged to the room.`);
      toast(`客房送餐到了 · <span class="dim">${o.en} · ¥${o.amt} on the folio`
            +`${o.lot?' · and the rest of it goes in your bag':''}</span>`);
      logDiary(`叫了客房服务，送来${o.hz}。`,`Ordered room service — ${o.en}.`,'hotelservice');
      updateHud(); saveGame();
    });
  }
  // 工程部 (H121). A problem you reported and understood is fixed by somebody who walks up from
  // B1 on the service lift; the fix is already recorded in js/stay.js, and this is the person.
  const p=Stay.problem&&Stay.problem();
  // A signature rather than a flag: a second stay gets its own engineer. A boolean here would have
  // sent somebody up once in the life of the save and never again.
  const sig=p&&p.fixed?`${b.room}:${p.key}:${p.fixDay}`:'';
  if(sig&&p.fixDay===day&&hotelFixSeen!==sig){
    hotelFixSeen=sig;
    hotelWalkTo(null,[P.x+.8,P.z+1.0],'tools',3.0,()=>{
      say(`${p.dept}来了，${p.hz}修好了。`,`${p.dept} came up. ${p.en} — fixed.`);
      logDiary(`${p.dept}从地下一层上来把${p.hz}修好了。`,
               `${p.dept} came up from B1 and fixed it.`,'hotelfix');
    });
  }
}
// Not saved: it only stops one walk being staged twice inside one session, and a reload that
// re-stages a walk once is a person in the corridor, not a bug.
let hotelFixSeen='';
// ---- 客房部 (H116) and 洗衣房 (H128). Both are things that happen while you are somewhere else,
// so both are checked when you come back rather than on a timer: leave the floor, come back after
// the round has been through, and the bed is made and the bag is on it.
function hotelRoomArrive(name,cameFrom){
  if(typeof Stay==='undefined'||!Stay.checkedIn||!Stay.checkedIn()) return;
  if(name===cameFrom) return;
  const b=Stay.booking(day,minutes);
  if(!b||b.floor!==name) return;
  const h=((minutes%1440)+1440)%1440/60;
  // The round runs mid-morning to mid-afternoon, which is why coming back at six finds the room
  // exactly as you left it and coming back at two does not. `housekeep` returns true only when it
  // really changed something, so this cannot announce one service twice.
  if(h>=9&&h<15&&!Stay.roomClean()&&Stay.housekeep()){
    toast('客房打扫好了 · <span class="dim">serviced while you were out — '
         +'the bed is made and there are clean towels</span>');
    logDiary('回房间的时候，客房已经打扫好了。',
             'The room had been made up while I was out.','housekeeping');
  }
  if(Stay.laundryBack(day)){
    const l=Stay.collectLaundry();
    if(l){
      needs.clean=clamp(needs.clean+12,0,100);
      say('洗好的衣服送回来了。','Your laundry has come back.');
      toast(`洗衣送回来了 · <span class="dim">back from the B1 laundry · ¥${l.amt} on the folio`
           +'</span>');
      logDiary('洗的衣服从地下一层送回来了。','The laundry came back up from B1.','hotellaundry');
      updateHud();
    }
  }
  saveGame();
}

// ---- 房卡. H105: a guest floor is not a public floor, and the lift is where a real hotel says so.
//
// `Stay.canEnterFloor` is the rule and it lives in js/stay.js — six guest floors, your own card
// opens exactly one of them, everything else in the building is open to anybody. This is only the
// asking, and it is asked HERE rather than in the lift alone because the fire stair reaches the
// same floors: hotel4 and hotel5 are adjacent by `order`, so a keyless guest could have walked up
// to the guest storeys past a lift that had just refused them. One rule, both routes.
//
// Silent about anything that is not a guest floor, and silent when js/stay.js is absent, so the
// panel behaves exactly as it did for the seven floors this rule does not concern.
const hotelKeyFor=key=>{
  if(typeof Stay==='undefined'||!Stay.canEnterFloor) return null;
  let ok=true; try{ ok=Stay.canEnterFloor(key); }catch(_){ return null; }
  if(ok) return null;
  // Two different refusals, because they want two different things from the player: one sends you
  // to the desk to check in, the other says the card you are holding is for another floor.
  const b=Stay.checkedIn&&Stay.checkedIn();
  const k=b&&Stay.key&&Stay.key();
  return b&&k&&!k.lost
    ? {hz:'房卡只开您那层',en:'your card opens your own floor only',
       zh:'对不起，房卡只开您住的那一层。',
       tr:'Sorry — the card only opens the floor your room is on.'}
    : b
      ? {hz:'房卡消磁了',en:'the card in your pocket does not read',
         zh:'房卡刷不开，请到前台补办。',
         tr:'The card will not read. Reception can make you a new one.'}
      : {hz:'需要房卡',en:'guest floors need a key card',
         zh:'客房层要刷房卡，请先到前台办理入住。',
         tr:'Guest floors need a key card — check in at reception first.'};
};
function openHotelFloors(kind) {
  const current=hotelFloorAt(place)||hotelFloorAt(HotelLift.state().currentKey)||hotelFloorAt('hotel');
  const byStairs=kind==='stairs';
  Pick.show({
    title:byStairs?'安全楼梯 · 相邻楼层':'京华大酒店客梯 · 选择楼层',
    // Chinese first, then the gloss — the same order every other panel in the building uses, and
    // the stair line is word-for-word the sentence the prompt and the refusal both say.
    sub:byStairs
      ? '安全楼梯只通相邻开放层 · fire stair, one authored level at a time'
      : '客梯：关门、楼层灯前进、到站开门 · passenger lift',
    start:current.hz,
    rows:HOTEL_FLOORS.map(f=>{
      const adjacent=Math.abs(f.order-current.order)===1;
      const here=f.key===current.key, shut=byStairs&&!adjacent;
      // Standing on your own floor must never be refused by the card rule, whichever way you got
      // there — otherwise a save restored inside a guest corridor is a room you cannot leave.
      const locked=here?null:hotelKeyFor(f.key);
      // The same arithmetic `onPick` spends below, so the row promises what the ride costs
      // before it is chosen rather than after.
      const mins=byStairs?Math.max(2,Math.abs(f.level-current.level)*2)
                         :Math.max(1,Math.ceil(Math.abs(f.level-current.level)*.45));
      // A dimmed row is not a reason. All three unpickable states say in words which one they are,
      // so the 30% opacity `.mrow.no` carries emphasis and never the meaning.
      return {hz:f.hz,py:f.py,
        en:here?`${f.short} · 现在在这层 · you are here`
          :shut?`${f.short} · 楼梯不通，请坐客梯 · take the lift`
          :locked?`${f.short} · ${locked.hz} · ${locked.en}`
          :`${f.short} · ${f.en} · ${mins}分钟`,
        right:here?'现在':shut?'坐客梯':locked?'刷卡':f.display,
        off:here||shut||!!locked,hotelFloor:f};
    }),
    onPick(row) {
      const f=row.hotelFloor;
      if(!f||f.key===current.key){say(`已经在${current.hz}了。`,`You are already on ${current.display}.`);return false;}
      // Said out loud in Chinese, and said the same way whichever route was chosen. The panel
      // already dims the row; this is the sentence, which is the part that is the game.
      const locked=hotelKeyFor(f.key);
      if(locked){ say(locked.zh,locked.tr); Vocab.sentenceHTML(locked.zh); return false; }
      if(byStairs){
        if(Math.abs(f.order-current.order)!==1){
          // Same sentence as the prompt that opens this picker (stopUse, `def.hotelFloors`). One
          // rule gets one wording, or the refusal reads as a second, stricter rule.
          say('安全楼梯只通相邻开放层。','The fire stair reaches the adjacent authored floor.');return false;
        }
        setPlace(f.key,{x:-15.65,z:-7.10,yaw:Math.PI/2});
        advanceTime(Math.max(2,Math.abs(f.level-current.level)*2));
        needs.rest=clamp(needs.rest-Math.max(1,Math.abs(f.level-current.level)*1.4),0,100);
        Vocab.sentenceHTML(`走楼梯到${f.hz}。`);
        say(`走安全楼梯到${f.hz}。`,`Fire stairs to ${f.en}.`);
        saveGame();return true;
      }
      const ok=HotelLift.begin(current.key,f.key);
      if(ok!==true){
        // `nokey` cannot be reached from here — the card was asked about above — but the ride
        // refuses on its own account too, and a refusal that came back with the wrong sentence
        // would be worse than no sentence at all.
        say(ok==='nokey'?'客房层要刷房卡。':ok==='busy'?'电梯正在运行。':'已经在这一层。',
            ok==='nokey'?'Guest floors need a key card.'
              :ok==='busy'?'The lift is already moving.':'Already on this floor.');
        return false;
      }
      // Game time follows physical storeys while the visible ride remains measured in seconds.
      advanceTime(Math.max(1,Math.ceil(Math.abs(f.level-current.level)*.45)));
      TrainAudio.liftCue('close');
      setPlace('hotelLift',{x:0,z:.72,yaw:Math.PI});
      Vocab.sentenceHTML(`乘客梯到${f.hz}。`);
      toast(`${f.hz} · <span class="dim">doors closing · ${HotelLift.state().duration.toFixed(1)} s</span>`);
      return true;
    },
  });
}

// ---- 京华大厦 A座. Every authored workplace level shares the same measured landing. The two
// fire stairs only expose the adjacent authored level; the passenger lift puts the player inside
// a real car, closes its leaves, advances a live floor indicator and opens at the destination.
function openOfficeFloors(kind) {
  const current=officeFloorAt(place)||officeFloorAt(OfficeLift.state().currentKey)||officeFloorAt('office1');
  const byStairs=String(kind||'').startsWith('stairs');
  const stairB=kind==='stairs-b';
  Pick.show({
    title:byStairs?`安全楼梯${stairB?'B':'A'} · 相邻楼层`:'公司客梯 · 选择楼层',
    sub:byStairs
      ? 'Fire stair — one adjacent workplace level at a time'
      : 'Passenger lift — ride inside the car while the live indicator advances',
    start:current.hz,
    rows:OFFICE_FLOORS.map(f=>{
      const adjacent=Math.abs(f.order-current.order)===1;
      return {hz:f.hz,py:f.py,en:`${f.display} · ${f.en}`,right:f.short,
        off:f.key===current.key||(byStairs&&!adjacent),officeFloor:f};
    }),
    onPick(row) {
      const f=row.officeFloor;
      if(!f||f.key===current.key){
        say(`已经在${current.hz}了。`,`You are already on ${current.display}.`);return false;
      }
      if(byStairs){
        if(Math.abs(f.order-current.order)!==1){
          say('安全楼梯一次只通相邻开放层。','The fire stair reaches one adjacent workplace floor.');
          return false;
        }
        const x=stairB?10.5:-10.5;
        setPlace(f.key,{x,z:2.85,yaw:stairB?Math.PI:0});
        const storeys=Math.max(1,Math.abs(f.level-current.level));
        advanceTime(Math.max(2,storeys*2));
        needs.rest=clamp(needs.rest-Math.max(1,storeys*1.35),0,100);
        Vocab.sentenceHTML(`走楼梯到${f.hz}。`);
        say(`走安全楼梯到${f.hz}。`,`Fire stairs to ${f.en}.`);
        saveGame();return true;
      }
      const ok=OfficeLift.begin(current.key,f.key);
      if(ok!==true){
        say(ok==='busy'?'客梯正在运行。':'已经在这一层。',
          ok==='busy'?'The passenger lift is already moving.':'Already on this floor.');
        return false;
      }
      const storeys=Math.max(1,Math.abs(f.level-current.level));
      advanceTime(Math.max(1,Math.ceil(storeys*.45)));
      TrainAudio.liftCue('close');
      setPlace('officeLift',{x:0,z:.48,yaw:Math.PI});
      Vocab.sentenceHTML(`乘客梯到${f.hz}。`);
      toast(`${f.hz} · <span class="dim">doors closing · ${OfficeLift.state().duration.toFixed(1)} s</span>`);
      return true;
    },
  });
}

function openRemedy() {
  Pick.show({
    title: '你哪儿不舒服？',
    sub: 'What is the matter? — say which one, and she will find you something',
    rows: REMEDIES.map(r => ({
      hz: r.hz, py: r.py, en: r.en, right: '¥' + r.cost,
      off: money < r.cost, remedy: r,
    })),
    onPick(row) {
      const r = row.remedy;
      if (money < r.cost) {
        say('钱不够。', 'Not enough money.');
        return false;
      }
      money -= r.cost;
      for (const k in r.gain) needs[k] = clamp(needs[k] + r.gain[k], 0, 100);
      // The complaint and the medicine both go in the notebook: you said one and were handed the
      // other, which is the pair worth remembering.
      Vocab.introduce(r.hz);
      say(r.say[0], r.say[1]);
      setTimeout(() => toast(`${Vocab.sentenceHTML(r.back[0])} ` +
        `<span class="dim">${r.back[1]}</span>`), 1400);
      logDiary(`在药店说了${r.say[0]}买了药。`,
               `Said "${r.say[1]}" at the chemist and came out with something for it.`, 'care');
      saveGame();
      return true;
    },
  });
}

function openTasks() {
  const h = minutes / 60;
  const wd = Career.weekday(day);
  const workday = Career.isWorkday(day);
  const to = Career.toNext();
  // What the board says about you before it says anything about the work: which day it is, what you
  // are, and what the next rung still wants. The last of those is the only place in the game that
  // names words you have to *master* to get something, so it is worth the line it costs.
  const standing = to
    ? (to.ready ? `${Career.rankName()} · 可以升职了 — ask about 升职`
       : `${Career.rankName()} → ${to.rank.hz}: ` + [
           to.days ? `${to.days} more days` : null,
           to.jobs ? `${to.jobs} more jobs` : null,
           to.words.length ? `master ${to.words.join(' ')}` : null,
         ].filter(Boolean).join(' · '))
    : `${Career.rankName()} — the top of this ladder`;

  const rows = Office.TASKS.map(t => ({
    hz: t.hz, py: t.py, en: t.en, right: '¥' + Career.pay(t.pay),
    off: !workday || h < t.h0 || h >= t.h1, task: t,
  }));
  // 请假 and 升职 are not jobs, so they sit under the jobs — but they are the two things anybody
  // in an office actually needs to be able to say, so they are on the board rather than buried.
  rows.push({ hz:'请假', py:'qǐngjià', en:'ask for the day off', right:'—',
              off: !workday || Career.onLeave(day), leave: true });
  if (to) rows.push({ hz:'升职', py:'shēngzhí', en:'ask about promotion', right:'—',
                      off: false, promote: true });

  Pick.show({
    title: '本周计划',
    sub: `${wd.hz} · ${wd.en}${workday ? '' : ' · 周末'} — ${standing}`,
    start: job && job.hz,
    rows,
    onPick(r) {
      // ---- 请假. A signed-off day is not an absence, which is the entire point of the word.
      if (r.leave) {
        if (!workday) { say('周末不用请假。', 'It is the weekend. You do not need to ask.'); return false; }
        if (!Career.takeLeave(day)) { say('今天已经请过假了。', 'You have already taken today off.'); return false; }
        job = null;
        say('我今天请假。', 'I am taking today off.');
        logDiary('跟经理请了一天假。', 'Asked the manager for the day off.', 'work');
        return true;
      }
      // ---- 升职. The manager reads back exactly what is missing, in the words it is missing in.
      if (r.promote) {
        const t2 = Career.toNext();
        if (!t2) { say('已经到头了。', 'There is nowhere further up this ladder.'); return false; }
        if (!t2.ready) {
          const why = [
            t2.days ? `还要${t2.days}天` : null,
            t2.jobs ? `还要${t2.jobs}个活儿` : null,
            t2.words.length ? `这些词还没学会：${t2.words.join('、')}` : null,
          ].filter(Boolean).join('，');
          say(`还不行。${why}。`, `Not yet. ` + [
            t2.days ? `${t2.days} more days` : null,
            t2.jobs ? `${t2.jobs} more jobs` : null,
            t2.words.length ? `and you have not mastered ${t2.words.join(', ')}` : null,
          ].filter(Boolean).join(', ') + '.');
          return false;
        }
        const got = Career.promote();
        money += 200;
        needs.mood = clamp(needs.mood + 18, 0, 100);
        toast(`升职了 · <b>${got.hz}</b> <span class="dim">${got.en} — ` +
              `every job on this board now pays ×${got.pay.toFixed(2)}, and ¥200 to mark it</span>`);
        logDiary(`升职了，现在是${got.hz}。`, `Promoted. ${got.en} now.`, 'work');
        storyBeat();
        saveGame();
        return true;
      }
      const t = r.task;
      if (!workday) {
        say('今天周末，没人上班。', 'It is the weekend. Nobody is working.');
        return false;
      }
      if (h < t.h0 || h >= t.h1) {
        say(`${t.hz}不是现在的活儿。`, `${t.en} is not on the clock right now.`);
        return false;
      }
      job = t;
      say(`我领了${t.hz}。`, `I've taken on ${t.en}.`);
      Vocab.sentenceHTML(t.hz);
      return true;
    },
  });
}

// `USE` lives in js/data.js, with the other two data tables.

let doing = null;   // { def, th, t }

// ---------------------------------------------------------------- moving fixtures
// Which parts of the apartment an action drives, and over which slice of it. A door is
// open by the time the hand gets there and shut again before you walk away.
const FIXTURE = {
  '冰箱':   { on:['fridge'], span:[.03,.74] },
  '厨房':   { on:['burner','steamPot','potlid','cupboard'], span:[.04,1] },
  '衣柜':   { on:['wardrobeL','wardrobeR'], span:[.03,.84], latch:true },
  '垃圾桶': { on:['bin'], span:[.14,.88] },
  '电视':   { on:['tv'], span:[.02,1], latch:true },
  '电脑':   { on:['laptop','laptopLid'], span:[0,1] },
  '窗户':   { on:['window'], span:[.22,1], latch:true },
  '窗帘':   { on:['curtainL','curtainR'], span:[.20,1], latch:true },
  '桌子':   { on:['drawer'], span:[.05,.86] },
  // F2 no longer teleports through this door: leave the real leaf open so the player can walk
  // into the corridor, then a second 关门 action swings it shut again.
  '门':     { on:['frontdoor'], span:[.30,1], homeLatch:true },
  '马桶':   { on:['lid'], span:[.02,1] },
  '淋浴':   { on:['shower','steamShower'], span:[.06,1] },
  '水池':   { on:['tapK'], span:[.06,.92] },
  '洗手池': { on:['tapB'], span:[.06,.92] },
  '植物':   { on:['canWater'], span:[.20,.86] },
  '床':     { on:['duvet'], span:[.03,.97] },
};
// Everything the apartment can be doing right now, eased toward its target every frame.
const fixt = { fridge:0, wardrobeL:0, wardrobeR:0, window:0, bin:0, potlid:0, tv:0,
               laptop:0, laptopLid:0, burner:0, steamPot:0, cupboard:0, drawer:0,
               frontdoor:0, lid:0, shower:0, steamShower:0, tapK:0, tapB:0, canWater:0,
               duvet:0, curtainL:0, curtainR:0, plant:0, rubbish:0, dishes:0 };
// Fixtures that stay where you left them rather than springing shut.
const latched = { window:0, curtainL:0, curtainR:0, frontdoor:0, wardrobeL:0, wardrobeR:0, tv:0 };
// The state of the flat itself, which drifts on its own and is what your chores are for.
// Dirty bowls from the start: 「水池里有脏碗」 is the sink's own sentence, so they had
// better actually be in there, and washing up is the first chore the flat offers you.
// Nine, not four: dust rises on its own and only a mop clears it, a kitchen keeps a smell unless
// the extractor is on, and the laundry is three separate quantities — the pile waiting to be
// washed, how far through the machine is, and how dry what is on the rack has got. Everything in
// here is a 0..1 fraction except `outfit`, which is an index into the wardrobe rail; the rules that
// move them live in js/home-life.js and the ones that are not fractions live there too.
const flat = { dry:0.35, trash:0.30, dishes:1, outfit:0, dust:0.10, smell:0, laundry:0.30, wash:0, hung:0 };

let fixHold = null;             // dev override: pin every fixture, for screenshots

// ---------------------------------------------------------------- the save
// Everything that was true of this life when the tab was last closed.
//
// Nothing about it persisted before this: the vocabulary did, the settings did, and which
// conversations had been had did, but the life did not. However long you played, a reload put you
// back in the flat on day one at two in the afternoon with ¥260 in your pocket and two meals in the
// fridge. The only thing the game remembered about you was the words — which is a strange thing for
// a game that charges rent.
//
// What is deliberately *not* in here: an action half-finished, a train you are riding, an order
// standing at a counter, a flight you have booked, the basket you are carrying round the 超市. Every
// one of those is a live object holding references to props in a scene that has not been built yet
// at the moment a save is read, and a half-restored one of those is worse than none. So they come
// back reset, and what is saved is the state of your life rather than the state of your hands.
const SAVEKEY = 'bjlife.save.v1';
// Set true only by New Game, for the moment between wiping the save and the page reloading. The
// two save-on-exit handlers (visibilitychange, beforeunload) both fire during a reload, and either
// one would put the life straight back if this did not stop them.
let wiping = false;
let saveAcc = 0;
// The ceiling on one life, in bytes of JSON, and what the last write actually cost.
const SAVE_MAX = 400 * 1024;
let saveBytes = 0;
// A person, named the same way across two sessions. `rig` is unique where it exists; otherwise the
// place and the pair of names is, because two 阿姨 in one room would be one person to a player too.
const npcKey = n => n.rig || `${n.place || '-'}/${n.hz}/${n.name || ''}`;
function saveGame() {
  if (!started || wiping) return;        // nothing to save from behind the title screen —
                                         // and nothing to save while a New Game is wiping it,
                                         // or the reload's own save-on-exit writes the life
                                         // straight back over the blank slate.
  try {
    // A lift car between floors is not a stable spawn. Record the controller as an optional v1
    // extension, but write the nearest safe landing into the ordinary place/x/z fields so old
    // loaders and interrupted rides both resume on solid floor.
    const hotelSafe=place==='hotelLift'?HotelLift.safeLanding():null;
    const officeSafe=place==='officeLift'?OfficeLift.safeLanding():null;
    const homeState=place==='home'&&World.liftState?World.liftState():null;
    // `aboard` is intentionally checked even while the car is idle.  A reload reconstructs the
    // home lift in its default controller state, so coordinates saved inside a parked car can be
    // an empty shaft just as surely as coordinates saved halfway through a ride.
    const homeUnsafe=!!(homeState&&World.aboard&&
      (homeState.riding||World.aboard(P.x,P.z)));
    // The deck the *player* is standing on — which is not the deck the car is parked at.
    //
    // This read `homeState.on`, the lift controller's floor, so anyone who walked up the stairs, or
    // who rode up and then had the car called away by nothing more than the controller's default,
    // saved whichever floor the car happened to be sitting on and reopened there. `.towercheck.js`
    // caught it as "save does not record homeFloor 7": a body standing on the seventh with the car
    // on the second wrote 2, and every assertion after it in that harness failed as a consequence.
    //
    // Aboard is the one case where the car is the authority, because a ride is not saved as a ride:
    // `homeLanding()` above puts the body out on the floor the car is serving, so the deck written
    // has to be that floor and not the shaft the body's x/z were in.
    const playerDeck=homeUnsafe?homeState.on:(place==='home'&&World.level?World.level():2);
    const homeFloor=place==='home'&&homeDeckLive(playerDeck)?playerDeck:2;
    const safeLift=hotelSafe||officeSafe;
    const savePlace=safeLift?safeLift.key:place;
    const saveAt=safeLift?safeLift.at:homeUnsafe?homeLanding():{x:P.x,z:P.z,yaw:P.yaw};
    const blob = JSON.stringify({
      v: 1, at: Date.now(),
      minutes, day, money, lightsOn: { ...lightsOn },
      // The fridge, as lots. `stock` is still written beside it and is still a plain count of
      // meals — not for this build, which never reads it back, but so that a save written here
      // and opened by an older one lands in a flat with roughly the right amount of food in it
      // rather than an empty fridge and a rent bill.
      stock: Pantry.meals(day), pantry: Pantry.toSave(), faults: Faults.toSave(),
      place:savePlace,x:+saveAt.x.toFixed(3),z:+saveAt.z.toFixed(3),yaw:+saveAt.yaw.toFixed(3),
      homeFloor: place === 'home' ? homeFloor : undefined,
      mallFloor: place === 'mall' ? Mall.level() : 1,
      needs: { ...needs },
      fixt: { ...fixt },
      latched: { ...latched },
      flat: { ...flat },
      // A collected optician frame is part of the player's look, not a half-finished shop action.
      // Trial pairs are marked temporary by the tenant and deliberately do not survive a reload.
      playerLook: {
        glasses: !!PLAYER.glasses && !PLAYER.glassesTemporary,
        glassesShape: Number.isSafeInteger(PLAYER.glassesShape) ? PLAYER.glassesShape : 0,
        glassesColor: Array.isArray(PLAYER.glassesColor)
          ? PLAYER.glassesColor.slice(0, 3).map(v => clamp(Number(v) || 0, 0, 1)) : null,
      },
      job: job && job.hz, clockedDay, bought: mallBought.slice(-24),
      campusLife: { studentId:!!campusLife.studentId },
      // Scene-layout markers migrate coordinates without changing the v1 life format. A missing
      // CampusContract is possible only while loading a partial development build; JSON simply
      // omits that marker and the complete build will migrate on its next load.
      layouts: { campus:window.CampusContract?.layoutVersion },
      mall: {
        stamps:{...mallProgress.stamps}, rewardTier:mallProgress.rewardTier,
        tickets:mallProgress.tickets, arcadePlays:mallProgress.arcadePlays,
        arcadeWins:mallProgress.arcadeWins, prizes:mallProgress.prizes.slice(),
        foodOrders:mallProgress.foodOrders,
        lastOrder:mallProgress.lastOrder?{...mallProgress.lastOrder}:null,
        // A paid ticket is property. It has a film, a showing, a row and a seat on it, and losing
        // it to a refresh loses the forty-five yuan the player actually handed over.
        ticket: cinemaTicket ? {...cinemaTicket} : null,
        // The receipts, and the counter separately: the counter must not go backwards when the
        // oldest receipts are dropped, or two purchases end up sharing a number.
        receipts: mallReceipts.slice(-40), receiptNo: mallReceiptNo,
        // An unpaid basket is not saved, only noted — see `mallBasketLeft`.
        basketLeft: mallBasket.length
          ? { n:mallBasket.length, total:mallTotal(), shop:basketShop() } : null,
        // The tenant systems keep their own state and serialise it themselves. They are lazy —
        // `ArcadeSys` does not exist until the mall has been built once — so a save taken before
        // you ever visited carries the blob the last load stashed rather than dropping it.
        arcade: window.ArcadeSys ? ArcadeSys.toSave() : (mallSysSave.arcade || null),
        cinemaSys: window.CinemaSys ? CinemaSys.toSave() : (mallSysSave.cinemaSys || null),
      },
      // The account belongs to the life; a queue ticket belongs to one visit and is deliberately
      // absent.  Optional v1 fields keep saves made before the branch became operational readable.
      bank: {
        opened:!!bankAccount.opened, balance:Math.max(0,Math.floor(bankAccount.balance)),
        hasCard:!!bankAccount.hasCard, accountNo:bankAccount.accountNo,
        openedDay:bankAccount.openedDay|0,
        ledger:bankAccount.ledger.slice(-16).map(r=>({...r})),
      },
      card: card && card.bal, station,
      // The day's plan, and what the review queue made of it. `errand` and `extra` are what the
      // day was staged from, and they are saved for the same reason they are rolled once: without
      // them a reload restages off the queue as it stands at that moment, and a goal the player
      // had already ticked would change into a different goal underneath them.
      daily: { day:daily.day, done:{ ...daily.done }, rewarded:!!daily.rewarded,
               errand:daily.errand ? { ...daily.errand } : null,
               extra:daily.extra ? { ...daily.extra } : null },
      hospital: { ...hospitalVisit },
      hotelLift: HotelLift.toSave(),
      officeLift: OfficeLift.toSave(),
      career: Career.toSave(),
      story: Story.toSave(),
      // The hotel stay: the room, the card in your pocket, the thing that has gone wrong in it and
      // everything already on the bill. A booking is property in exactly the way a cinema ticket is
      // — it was paid for — so losing it to a refresh loses real money.
      stay: Stay.toSave(),
      // ---- and what the guest did to the room they are in. The curtains, the bedside lights and
      // the television follow the hour until somebody touches one, and after that they stay where
      // they were left (H113). Three tri-states and the booking they belong to; `HotelRoom` owns
      // the rules and js/hotel.js owns the object, this is only the half that has to be here —
      // the reason the item sat open is that nothing else may add a field to this blob.
      room: HotelRoom.toSave(),
      // ---- the flat, past the four fractions in `flat`. The alarm, what a night was worth, the
      // hot water, the wash and where it is hung, the bills and what is owed on them, the post,
      // the parcels, the cleaner and the guest. Its own validated loader, because none of it is a
      // 0..1 fraction and the block above clamps every key it owns to one.
      homeLife: HomeLife.toSave(),
      // ---- the rider on the stairs. `delivery` was written nowhere, and the money for a 外卖 is
      // spent the moment it is ordered — so a refresh between ordering and answering the door lost
      // real yuan the way losing a cinema ticket does. Plain data only; the courier is re-placed by
      // `tickDelivery` from the state, and a bag already in your hand is not restored (see above).
      // The item goes across as its headword, not as the object: what `dishByHz`/`goodsFor` hand
      // back is a row out of a menu or a goods table that a later build may have changed the price
      // of, and re-resolving the word against today's tables is the only version of this that
      // cannot restore a dish at last month's price.
      delivery: delivery ? { kind:delivery.kind, item:delivery.item.hz, fee:delivery.fee,
                             total:delivery.total, at:delivery.at, gone:delivery.gone,
                             state:delivery.state } : null,
      // ---- who you have met. This lived only in js/talk.js's own localStorage key, which meant a
      // corrupted or cleared save left people who greet you by name — or, far more often, reset
      // every acquaintance to a stranger while the diary still remembered them.
      met: Object.fromEntries(NPCS.filter(n => n.met > 0).slice(0, 240).map(n => [npcKey(n), n.met])),
    });
    // A ceiling, asserted rather than assumed. One key now carries pantry lots, 26 fixtures, 40
    // mall receipts, a 16-row bank ledger, career, story, the hotel stay, both lift controllers
    // and the flat — against a 5 MB localStorage budget shared with the settings, the diary and
    // js/talk.js. Over this and something is accumulating that should not be.
    saveBytes = blob.length;
    if (blob.length > SAVE_MAX)
      console.warn(`bjlife: save is ${(blob.length / 1024) | 0} KB, over the ` +
                   `${(SAVE_MAX / 1024) | 0} KB ceiling — something is accumulating`);
    localStorage.setItem(SAVEKEY, blob);
  } catch (_) { /* full, blocked, or a private window — a save is not worth an exception */ }
}
function loadGame() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVEKEY)); } catch (_) {}
  // A version check rather than a migration: this is the first format there has been, and reading a
  // future one written by a newer build would be worse than starting again.
  if (!s || s.v !== 1 ||
      !Number.isFinite(s.minutes) ||
      !Number.isSafeInteger(s.day) || s.day < 1 ||
      !Number.isFinite(s.money) ||
      !Number.isFinite(s.stock)) return false;
  minutes = clamp(s.minutes, 0, 1439.999);
  day = s.day;
  money = Math.max(0, s.money);
  // A save from before the day was staged off the review queue has no `errand`/`extra`, and must
  // not be handed one retroactively — the same rule career, story and stay all follow. A malformed
  // errand is worse than none, because the plan would print a goal that names nothing, so every
  // field is checked and one bad field drops the errand back to the plain rotation.
  daily = s.daily && s.daily.day === (day | 0)
    ? { day:day | 0, done:{ ...(s.daily.done || {}) }, rewarded:!!s.daily.rewarded,
        errand:(s.daily.errand && typeof s.daily.errand === 'object' &&
                typeof s.daily.errand.key === 'string' &&
                typeof s.daily.errand.hz === 'string' && typeof s.daily.errand.en === 'string')
          ? { key:s.daily.errand.key.slice(0, 24), hz:s.daily.errand.hz.slice(0, 24),
              en:s.daily.errand.en.slice(0, 80),
              due:Math.max(0, Math.min(1, Number(s.daily.errand.due) || 0)) }
          : null,
        extra:(s.daily.extra && typeof s.daily.extra === 'object' &&
               typeof s.daily.extra.topic === 'string' &&
               (s.daily.extra.topic === 'service' ||
                DAILY_EXTRA.some(g => g.topic === s.daily.extra.topic)))
          ? { topic:s.daily.extra.topic } : null }
    : newDailyState(day);
  dailySig = '';
  // 403. Saves written before the split carry a single boolean. There is no room list to spread
  // it across, so an old save comes back with every light on rather than with a guess.
  for (const k of Object.keys(lightsOn)) delete lightsOn[k];
  if (s.lightsOn && typeof s.lightsOn === 'object') Object.assign(lightsOn, s.lightsOn);
  // ---- the fridge.
  //
  // A save from before the pantry has no `pantry` key, only `stock`: an integer that meant "meals,
  // of no particular kind". There is no honest way to turn 4 into four named things, so it is
  // turned into the one thing it could always have been — pots of instant noodles, bought today so
  // nothing goes off in the player's face on the first morning back. Somebody who had a full
  // fridge still has a full fridge; what they no longer have is a fridge full of beef.
  // 灯坏了 is in the light's own sentence and has been since the flat was built, so a game that has
  // never heard of faults starts with exactly the one the text already claims. A save that HAS a
  // faults block is trusted, including an empty one — otherwise repairing the light would break it
  // again on the next load, which is the opposite of a fault being a fact.
  Faults.load(s.faults);
  if (!s.faults) Faults.break('light', day);
  if (Array.isArray(s.pantry)) Pantry.load(s.pantry);
  else {
    Pantry.reset();
    const meals = Math.max(0, Math.min(40, Math.floor(s.stock)));
    if (meals) stow('方便面', meals);
  }
  for (const k in needs)
    if (Number.isFinite(s.needs?.[k])) needs[k] = clamp(s.needs[k], 0, 100);
  for (const k in fixt)
    if (Number.isFinite(s.fixt?.[k])) fixt[k] = clamp(s.fixt[k], 0, 1);
  for (const k in latched)
    if (Number.isFinite(s.latched?.[k])) latched[k] = clamp(s.latched[k], 0, 1);
  // Not every field of the flat is a fraction, and the loader used to assume every one of them was:
  // one `clamp(…, 0, 1)` over every key in the block. `outfit` is an index into the wardrobe rail,
  // so a save with the fourth shirt on came back wearing the second, and any field added later that
  // was a wake time, a yuan amount or a timer would have been silently destroyed on reload. Each
  // key now carries its own range and the default is still the fraction the rest of them are.
  //
  // `typeof s.flat === 'object'` before any of it, because a half-written block must cost the state
  // and not the boot — the same shape check `stay`, `career`, `story` and `pantry` already do.
  const FLAT_RANGE = { outfit:[0, 64] }, FLAT_FRAC = [0, 1];
  if (s.flat && typeof s.flat === 'object')
    for (const k in flat)
      if (Number.isFinite(s.flat[k])) {
        const r = FLAT_RANGE[k] || FLAT_FRAC;
        flat[k] = clamp(s.flat[k], r[0], r[1]);
      }
  // Optional v1 appearance extension. Old saves keep the established no-glasses default; a bad
  // colour or silhouette drops only the accessory rather than poisoning the rest of the life.
  if (s.playerLook && typeof s.playerLook === 'object') {
    PLAYER.glasses = !!s.playerLook.glasses;
    PLAYER.glassesTemporary = false;
    PLAYER.glassesShape = Number.isSafeInteger(s.playerLook.glassesShape)
      ? clamp(s.playerLook.glassesShape, 0, 5) : 0;
    const gc = s.playerLook.glassesColor;
    PLAYER.glassesColor = Array.isArray(gc) && gc.length >= 3 &&
      gc.slice(0, 3).every(Number.isFinite)
      ? gc.slice(0, 3).map(v => clamp(v, 0, 1)) : null;
  }
  // The rest of the flat — the alarm, the bills, the wash, the parcels, the guest — is not a set of
  // fractions and never was, which is exactly why it is a module with its own validated loader.
  if (s.homeLife && typeof s.homeLife === 'object') HomeLife.load(s.homeLife);
  else HomeLife.reset();
  if (s.hospital && typeof s.hospital === 'object')
    hospitalVisit = { ...hospitalVisit, ...s.hospital };
  clockedDay = s.clockedDay || 0;
  mallBought = Array.isArray(s.bought) ? s.bought : [];
  campusLife = { studentId:!!s.campusLife?.studentId };
  if (campusLife.studentId && !mallBought.includes('学生证')) mallBought.push('学生证');
  mallProgress=freshMallProgress();
  // A basket belongs to one visit and is never restored; everything else mall-side starts clean so
  // that loading an older save cannot leave the previous life's ticket or receipts lying about.
  mallBasket=[]; mallReceipts=[]; mallReceiptNo=0; cinemaTicket=null; mallBasketLeft=null;
  if (s.mall && typeof s.mall==='object') {
    // None of these exist in a v1 save. Each is restored only when it is really there and really
    // the right shape: a malformed ticket is worse than no ticket, because it looks like one.
    if (s.mall.ticket && typeof s.mall.ticket==='object' && s.mall.ticket.film)
      cinemaTicket={...s.mall.ticket};
    if (Array.isArray(s.mall.receipts))
      mallReceipts=s.mall.receipts.filter(r=>r&&Array.isArray(r.items)).map(r=>({...r}));
    mallReceiptNo = Number.isSafeInteger(s.mall.receiptNo) ? s.mall.receiptNo
      : mallReceipts.length ? (mallReceipts[mallReceipts.length-1].no|0) : 0;
    if (s.mall.basketLeft && s.mall.basketLeft.n>0) mallBasketLeft={...s.mall.basketLeft};
    mallSysSave = { arcade: s.mall.arcade || null, cinemaSys: s.mall.cinemaSys || null };
    applyMallSysSave();          // a no-op unless the mall has already been built this session
    if (s.mall.stamps && typeof s.mall.stamps==='object') for (const k in MALL_STAMPS) {
      const q=s.mall.stamps[k];
      if (q && Number.isSafeInteger(q.day) && q.day>0 && Number.isFinite(q.at))
        mallProgress.stamps[k]={day:q.day,at:clamp(Math.round(q.at),0,1439)};
    }
    mallProgress.rewardTier=clamp(Number.isFinite(s.mall.rewardTier)?Math.floor(s.mall.rewardTier):0,0,4);
    mallProgress.tickets=Math.max(0,Math.floor(Number.isFinite(s.mall.tickets)?s.mall.tickets:0));
    mallProgress.arcadePlays=Math.max(0,Math.floor(Number.isFinite(s.mall.arcadePlays)?s.mall.arcadePlays:0));
    mallProgress.arcadeWins=Math.max(0,Math.floor(Number.isFinite(s.mall.arcadeWins)?s.mall.arcadeWins:0));
    mallProgress.prizes=Array.isArray(s.mall.prizes)
      ? s.mall.prizes.filter(hz=>ARCADE_PRIZES.some(p=>p.hz===hz)).slice(-12) : [];
    mallProgress.foodOrders=Math.max(0,Math.floor(Number.isFinite(s.mall.foodOrders)?s.mall.foodOrders:0));
    const lo=s.mall.lastOrder;
    if (lo && MALL_FOOD[lo.vendor] && typeof lo.item==='string' && typeof lo.option==='string')
      mallProgress.lastOrder={vendor:lo.vendor,item:lo.item,option:lo.option,
        price:Math.max(0,Number(lo.price)||0),day:Math.max(1,Math.floor(Number(lo.day)||day))};
  }
  bankAccount=freshBankAccount();
  if(s.bank&&typeof s.bank==='object') {
    bankAccount.opened=!!s.bank.opened;
    bankAccount.balance=bankAccount.opened?bankAmount(s.bank.balance):0;
    // The first save extension briefly omitted `hasCard`; an opened account from that build still
    // issued one, so only an explicit false represents no card.
    bankAccount.hasCard=bankAccount.opened&&s.bank.hasCard!==false;
    bankAccount.accountNo=bankAccount.opened&&typeof s.bank.accountNo==='string'
      ? s.bank.accountNo.slice(0,40) : bankAccount.opened?'6222 •••• •••• 0000':null;
    bankAccount.openedDay=bankAccount.opened&&Number.isSafeInteger(s.bank.openedDay)
      ? Math.max(1,s.bank.openedDay):0;
    if(Array.isArray(s.bank.ledger)) bankAccount.ledger=s.bank.ledger.slice(-16).flatMap(r=>{
      if(!r||!BANK_LEDGER_KINDS.has(r.kind)||!Number.isFinite(Number(r.delta))) return [];
      return [{kind:r.kind,delta:Math.trunc(Number(r.delta)),
        day:Number.isSafeInteger(r.day)&&r.day>0?r.day:day,
        at:clamp(Math.round(Number(r.at)||0),0,1439),
        balance:bankAmount(r.balance)}];
    });
  }
  // Paper numbers, filled slips and an ID left on the desk do not survive a reload.
  resetBankVisit();
  // A save written before there were ranks has no `career`, and `load` handles that by starting the
  // player at the bottom rather than inventing a history for them. The version number does not move
  // for this: an old save stays readable, which is the whole reason to make the field optional.
  Career.load(s.career);
  Story.load(s.story);
  // The same rule as career: a save written before the hotel had a stay in it has no `stay` field
  // and must not be handed a room retroactively. `Stay.load` starts from a blank slate every time
  // and copies across only the fields that are really there and really the right shape, so a
  // corrupt or half-written block costs the booking rather than the boot.
  Stay.load(s.stay);
  // The room's own fixtures, on the same rule as the booking above: a save written before this
  // existed has no `room` field and must come back with all three following the hour rather than
  // being handed a dark room retroactively. `HotelRoom.load` starts from a blank slate every time
  // and keeps only fields that are really 0 or 1, so one bad value costs that fixture and nothing
  // else — and a state whose `stay` no longer matches the live booking is inert by construction,
  // which is what makes checking out clear it without a second code path.
  HotelRoom.load(s.room);
  job = s.job ? (Office.TASKS.find(t => t.hz === s.job) || null) : null;
  card = Number.isFinite(s.card) ? { bal: Math.max(0, s.card) } : null;
  if (typeof s.station === 'string' && Metro.STATIONS.some(q => q.hz === s.station))
    station = s.station;
  // Optional and backwards compatible: saves from before the hotel simply initialise its car on
  // the lobby. A malformed or mid-ride record is normalised by HotelLift.restore to an idle landing.
  HotelLift.restore(s.hotelLift);
  // The workplace car follows the same stable-landing rule. Old saves have no officeLift field
  // and correctly initialise it in the first-floor lobby.
  OfficeLift.restore(s.officeLift);
  // The place last, because it moves the body and resets the camera, and because a place that no
  // longer exists in this build must not strand the player outside the world.
  let savedPlace = PLACES[s.place] ? s.place : 'home';
  let savedAt = Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.yaw)
    ? { x:s.x, z:s.z, yaw:s.yaw } : undefined;
  // The expanded campus reuses the place id but not its old footprint. Any campus save without
  // the matching scene marker predates those walls and is restored at the contract's canonical
  // metro-side spawn instead of trusting coordinates that may now be inside a building.
  const cc = window.CampusContract;
  if (savedPlace === 'campus' && cc && s.layouts?.campus !== cc.layoutVersion)
    savedAt = { ...cc.spawn };
  // Before the tower existed, `office` was the same F4 team room at z+1.35. The optional
  // officeLift record is the backward-compatible marker: a save without it predates the move, so
  // shift its body with the retained room instead of reopening in empty circulation space.
  if(savedPlace==='office'&&!s.officeLift&&savedAt)savedAt.z+=OFFICE_SUITE_DZ;
  if(savedPlace==='hotelLift'){
    const safe=HotelLift.safeLanding();savedPlace=safe.key;savedAt=safe.at;
  }
  if(savedPlace==='officeLift'){
    const safe=OfficeLift.safeLanding();savedPlace=safe.key;savedAt=safe.at;
  }
  // Home is one scene with twelve possible physical decks.  Old saves have no floor field and
  // correctly fall back to the player's flat; malformed or since-removed decks do the same.  Any
  // old coordinate inside the car footprint is normalised to the landing before the scene opens,
  // because the lift controller itself is deliberately not resumed mid-ride.
  const savedHomeFloor=savedPlace==='home'&&Number.isSafeInteger(s.homeFloor)&&homeDeckLive(s.homeFloor)
    ? s.homeFloor:2;
  if(savedPlace==='home'&&savedAt&&World.aboard&&World.aboard(savedAt.x,savedAt.z))
    savedAt=homeLanding();
  setPlace(savedPlace,savedAt);
  if(savedPlace==='home'){
    World.setFloor(savedHomeFloor);
    P.lift=World.deckY(savedHomeFloor);
    room=scene.roomAt(P.x,P.z,null)||scene.zones[0];
    homeFloorSeen=savedHomeFloor;
    paintPlaceLabel();
  }
  if (s.place === 'mall' && Number.isSafeInteger(s.mallFloor) && s.mallFloor > 1 && s.mallFloor <= 3) {
    Mall.setFloor(s.mallFloor); P.lift = Mall.deckY(s.mallFloor);
  }
  // ---- and then check the floor is actually there.
  //
  // A pre-tower save's x/z are flat coordinates from a build with no partitions in it at all, so a
  // point that was open then can be inside a wall now — `Number.isSafeInteger(s.homeFloor)` puts
  // that save on deck 2 correctly and then stands it in the bathroom wall. The scene's own collider
  // is the only thing that knows, so ask it rather than trusting the numbers.
  // Only a save from before the tower, which is the one this is for. A save that names its deck was
  // written by a build that already had `js/home-walls.js` in it, so its coordinates were legal at
  // the moment they were written and there is nothing to rescue — and second-guessing them moves
  // the body for no reason. `.towercheck.js` caught exactly that: an F7 save restored to the right
  // deck, the right height and the right HUD label, and 0.42,0.36 came back as something else,
  // because `clampMove` insets each zone by the body radius and a point standing legally near a
  // zone seam reads as unstandable to a single probe.
  //
  // The pre-tower case has no such defence: its x/z predate every partition in the flat, so the
  // point it names really can be inside a wall now, and the deck it lands on is 2 by the
  // `Number.isSafeInteger` fallback above.
  if (place === 'home' && !Number.isSafeInteger(s.homeFloor)) {
    const safe = spawnSafe(P.x, P.z);
    if (safe[0] !== P.x || safe[1] !== P.z) {
      P.x = safe[0]; P.z = safe[1];
      CAM.fx = P.x; CAM.fz = P.z;
      room = scene.roomAt(P.x, P.z, null) || scene.zones[0];
    }
  }
  // ---- the rider, and who you have met. Both are plain data; neither holds a scene reference.
  delivery = null;
  if (s.delivery && typeof s.delivery === 'object' && typeof s.delivery.item === 'string' &&
      Number.isFinite(s.delivery.at) && ['coming', 'knock', 'door'].includes(s.delivery.state)) {
    const kind = s.delivery.kind === 'paotui' ? 'paotui' : 'waimai';
    // Re-resolved against today's menu and goods tables. A word this build no longer sells is a
    // dropped delivery rather than a half-restored one holding a row that does not exist.
    const item = kind === 'waimai' ? dishByHz(s.delivery.item) : goodsFor(s.delivery.item);
    if (item) delivery = { kind, item, fee:Math.max(0, s.delivery.fee | 0),
                 total:Math.max(0, s.delivery.total | 0), at:s.delivery.at,
                 gone: Number.isFinite(s.delivery.gone) ? s.delivery.gone : clockNow() + RIDER_WAIT,
                 rap:0, state:s.delivery.state };
    // He was in the doorway when the tab closed; a rebuilt scene has no rider standing in it, so
    // he goes back to knocking rather than to a door that opens onto nobody.
    if (delivery && delivery.state === 'door') delivery.state = 'knock';
  }
  if (s.met && typeof s.met === 'object')
    for (const n of NPCS) {
      const v = s.met[npcKey(n)];
      if (Number.isFinite(v) && v > 0) n.met = Math.min(999, Math.floor(v));
    }
  return true;
}

// Somewhere it is legal to stand, starting from somewhere that may not be.
//
// `clampMove(x, z, x, z, r)` pushes a destination out of any solid it is inside and into the
// nearest zone, so it returns the point unchanged exactly when the point is standable. A point
// deep inside a thick partition can be pushed to another illegal point, which is why this walks a
// short spiral rather than trusting one probe — and why it returns the original when nothing in
// range is standable, since inventing a position is worse than keeping a wrong one.
function spawnSafe(x, z) {
  if (!scene || !scene.clampMove) return [x, z];
  const STEP = 0.35;
  for (let ring = 0; ring <= 8; ring++)
    for (let i = 0; i < (ring ? 12 : 1); i++) {
      const a = i * Math.PI / 6;
      const tx = x + Math.cos(a) * ring * STEP, tz = z + Math.sin(a) * ring * STEP;
      const c = scene.clampMove(tx, tz, tx, tz, 0.30);
      if (Math.abs(c[0] - tx) < 1e-6 && Math.abs(c[1] - tz) < 1e-6) return [tx, tz];
    }
  return [x, z];
}
// A save every few seconds is enough — the state it holds changes on the scale of minutes — plus
// one on the way out, which is the one that actually matters. `visibilitychange` fires on a phone
// being locked and on a tab being switched away from; `beforeunload` does not always.
addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
addEventListener('beforeunload', saveGame);

function tickFixtures(dt, now) {
  if (place !== 'home') return;
  const want = {};
  for (const k in fixt) want[k] = fixHold === null ? (latched[k] || 0) : fixHold;
  // Standing state: how thirsty the plant is, how full the bin, whether there is washing up.
  want.plant = flat.dry; want.rubbish = flat.trash; want.dishes = flat.dishes;
  // A rider standing in your doorway is standing in an open doorway. Doors here spring shut on
  // their own the moment the action that opened them ends, and this one must not while he is
  // in it — he would be sealed into the wall with your dinner.
  if (courier.here && World.level() === 2) want.frontdoor = 1;
  // These moving parts all belong to flat 202.  Other storeys may use the same everyday word
  // (especially 门), but must never animate a fixture three to thirty-four metres below them.
  if (doing && World.level() === 2) {
    const f = FIXTURE[doing.th.hz];
    if (f && doing.t >= f.span[0] && doing.t <= f.span[1]) for (const k of f.on) want[k] = 1;
  }
  for (const k in fixt) {
    // Doors and covers take their time; a screen, a tap or a gas ring is immediate.
    const tau = /^(tv|laptop|burner|tapK|tapB|shower|canWater|steam)/.test(k) ? 0.10 : 0.30;
    fixt[k] += (want[k] - fixt[k]) * (1 - Math.exp(-dt / tau));
  }
  for (const k of ['fridge','wardrobeL','wardrobeR','window','bin','cupboard','drawer',
                   'frontdoor','lid','duvet','curtainL','curtainR','laptopLid',
                   'plant','rubbish','dishes'])
    World.setPart(k === 'laptopLid' ? 'laptop' : k, fixt[k]);
  // The lid only rattles once the pot is actually boiling.
  World.setPart('potlid', fixt.potlid * Math.max(0, Math.sin(now / 130)));
  World.setEmit('tv', fixt.tv);
  World.setEmit('laptop', fixt.laptop);
  World.setEmit('burner', fixt.burner);
  for (const k of ['tapK','tapB','shower','canWater']) World.setFade(k, fixt[k]);
  World.setSteam('pot', fixt.steamPot, now / 1000);
  World.setSteam('shower', fixt.steamShower, now / 1400);
  if (World.tvGlow) World.tvGlow.a = 0.02 + 0.16 * fixt.tv;
  // ---- the three things the flat's own rooms publish and nothing drove.
  //
  // The extractor impeller (js/home-kitchen.js registers the `hoodFan` mover): it turns while the
  // fan is switched on, and while a dish is actually in the pan, because both are true reasons for
  // it to be running and neither of them is "always".
  if (World.level() === 2)
    World.setPart('hoodFan', HomeLife.fanOn || (doing && doing.def && doing.def.cookDo) ? 1 : 0);
  // The wash on the bathroom rack. `flat.hung` is 0 the moment it goes out and 1 when it is dry,
  // which is exactly the range the room's own `dryReg` wants. Guarded because js/home-bath.js has
  // not published it yet — this is live the day lane 6 lands item 177.
  const bath = typeof FlatFit !== 'undefined' && FlatFit['bath'];
  if (bath && bath.dryReg) {
    if (HomeLife.hungOn() === World.level()) bath.dryReg.wetten(1 - flat.hung);
    else if (bath.dryReg.dry) bath.dryReg.dry();
  }
  // ---- the three things the neighbour floors publish and nothing called.
  //
  // Once a second, not once a frame. All three are cheap — `noiseAt` allocates nothing and
  // `weatherTick` is a setter — but "cheap" times sixty times twelve storeys is how a room ends up
  // over budget for no visible gain, and none of them can change faster than the clock does.
  if (now - homeSlowAt > 1000) {
    homeSlowAt = now;
    // 装修 on F10 is audible from the flats above and below it. `noiseAt` returns 0 or 1.
    if (typeof HomeF10 !== 'undefined' && HomeF10.noiseAt) {
      const near = Math.abs(World.level() - 10) <= 1;
      const on = near && HomeF10.noiseAt(minutes, day);
      if (on && !renoHeard) say('楼上在装修，电钻声一阵一阵的。',
                                'Somebody upstairs is renovating — the drill comes and goes.');
      renoHeard = !!on;
    }
    // Washing on the roof comes in when it rains. js/home-roof.js owns the rule; this is the clock.
    if (typeof HomeRoof !== 'undefined' && HomeRoof.weatherTick && typeof Weather !== 'undefined')
      HomeRoof.weatherTick(Weather.now);
  }
}
let homeSlowAt = 0, renoHeard = false;

// Step between the apartment and the street. The two are separate coordinate spaces, so
// this resets the body and the camera into the new one rather than trying to walk across.
// `at` overrides where you arrive. The apartment and the street each have one spawn, but a
// street with four doors in it needs you to come out of the one you went in by, so a door can
// name its own arrival point.
let placeCutToken = 0;

// ---------------------------------------------------------------- the late-asset gate's key
//
// `Assets.ROOMS` (js/assets.js:156) is keyed by **Lazy module name** — 'World', 'Street', 'Diner',
// 'Shop', 'Office' — and `setPlace` is called with a **place id**: 'home', 'street', 'diner',
// 'shop'. Two of those spell differently in case and 'home'/'World' share no letters at all, so
// `Assets.roomReady('home')` read an absent key, `(undefined || []).every()` answered **true**, and
// the gate below has never once fired — for any place in the game, not only the flat. The same
// mistake sat in `Lazy.built(name)`: `Lazy` is keyed by module name too, so that half was
// permanently false and the "rooms already built are left alone" clause protected nothing either.
//
// It stayed invisible because `Assets.warm()` normally wins the race, and a room whose models turn
// up a frame late looks exactly like a room whose models turned up on time. At home it does not
// win: `endTitle()` builds the flat on the line after `warm()` starts.
//
// A place with no declared models maps to itself and `roomReady` is honestly vacuous for it — that
// is the same answer as before and it is the correct one. `.roomgate.js` asserts both halves: that
// every key in `Assets.ROOMS` is the image of a real place id, and that the gate actually defers a
// `setPlace` whose models are not in yet.
// `office` is the fourth-floor team room (`PLACES.office = Office4`) but the models declared for it
// are under the older `Office` module, which is still live — `Office.TASKS` is what the whiteboard
// reads. Mapping the place id at it is what stops `ROOMS.Office` being a declaration nothing can
// ever reach; `.roomgate.js` fails if any `Assets.ROOMS` key is orphaned like that again.
const ASSET_ROOM = { home:'World', street:'Street', shop:'Shop', diner:'Diner', office:'Office' };
const assetRoom = name => ASSET_ROOM[name] || name;

function setPlace(name, at) {
  // `at` is a spawn point — `{x, z, yaw}` — and nothing below checks it. A debug caller handing
  // a room name instead (`setPlace('home', 'flat')`) set P.x/P.z/P.yaw to undefined, which the
  // camera copied on the next line as NaN. A NaN view matrix rasterises nothing, so the frame is
  // the clear colour: a black screen with a healthy GL context, props still in the draw list and
  // not one console error. Two agents have now chased that as a deck-cull fault. Refuse it here.
  if (at && !(Number.isFinite(at.x) && Number.isFinite(at.z))) {
    console.warn('setPlace(' + name + ', …): `at` must be {x, z, yaw} — ignoring', at);
    at = null;
  }
  // A room is constructed the first time anything reads a property off it, and the very next
  // line does exactly that — so this is the last moment at which its models can still arrive in
  // time. Built without them, the room caches without them, permanently: `Lazy` keeps what it
  // made and there is no second chance.
  //
  // Almost always a no-op, because Assets.warm() has been pulling the whole library down behind
  // the title screen since the game started. It fires only on a connection slow enough that
  // somebody reached a door before 15 MB arrived, and then it costs one deferred frame rather
  // than a room full of missing furniture. Rooms already built are left alone: assets cannot
  // help them now, and re-entering one must never re-run this.
  // Not `room` — that name is already this function's later local for `scene.roomAt(...)`.
  const assetKey = assetRoom(name);
  if (typeof Assets !== 'undefined' && !Lazy.built(assetKey) && !Assets.roomReady(assetKey)) {
    Assets.loadRoom(assetKey).then(() => setPlace(name, at));
    return;
  }
  const cameFrom = place;
  // Campus schedules are static tableaux, not paths. Settle them while the old coordinate space
  // is still hidden: on departure this consumes any queued schedule edge, and on arrival it puts
  // every actor at the current authored spot before the first campus frame can expose a teleport.
  if ((cameFrom === 'campus' && name !== 'campus') ||
      (name === 'campus' && cameFrom !== 'campus')) syncCampusStaticNPCs();
  // Queue paper and the form in your hand belong to this physical visit. Leaving through the
  // branch door gives the number back; returning or loading begins at the machine, not mid-call.
  if(cameFrom==='bank'&&name!=='bank') resetBankVisit();
  if(name==='bank') syncBankVisit();
  // The mall's tenant systems exist only once the building has been built, which is the line
  // above this one on a first visit. Hand them whatever the last load stashed for them.
  if(name==='mall') applyMallSysSave();
  // Entering from the city means entering the building, not materialising inside flat 202.  Title
  // shots and the new-game boot run before `started`; save restore supplies an explicit position
  // and reinstates its deck below, so neither is mistaken for a trip through the street door.
  const homeLobbyArrival = name === 'home' && started && cameFrom !== 'home' && !at;
  // The change of coordinate space below is deliberately immediate; actions, saves and the
  // audit harness all expect setPlace() to have completed when it returns. Cover that camera
  // reset for one composed frame, then reveal the destination. Title-reel cuts have their own
  // black layer and run before `started`, so they do not pass through this one as well.
  // The hotel car already supplies a physical close/open transition. A black edit on either side
  // would hide the very ride the player is meant to inspect; every ordinary room change keeps the
  // one-frame cut veil.
  const liftSeam=name==='hotelLift'||cameFrom==='hotelLift'||
    name==='officeLift'||cameFrom==='officeLift';
  const placeCut = started && name !== cameFrom && !liftSeam ? document.getElementById('placeCut') : null;
  const thisCut = placeCut ? ++placeCutToken : 0;
  if (placeCut) {
    placeCut.classList.add('cover');
    // Commit the opaque state before the class is released on the next frame. No gameplay waits.
    void placeCut.offsetWidth;
    requestAnimationFrame(() => {
      if (thisCut === placeCutToken) placeCut.classList.remove('cover');
    });
  }
  place = name; scene = PLACES[name];
  syncRigResidency(name);
  if(name!=='hotelLift'&&hotelFloorAt(name))HotelLift.syncLanding(name);
  // Coming back to your own floor is when the things that happened while you were out land:
  // housekeeping has been through, and yesterday's laundry is on the bed (H116, H128). Guarded on
  // `started` so the title reel and the save restore do not service a room nobody has booked yet.
  if(started&&hotelFloorAt(name))hotelRoomArrive(name,cameFrom);
  if(name!=='officeLift'&&officeFloorAt(name))OfficeLift.syncLanding(name);
  // A room built before the renderer existed could not upload its textures then. It can now.
  if (scene.resolveMats) scene.resolveMats();
  if (name === 'mall') sanitizeMallPatrols();
  if (homeLobbyArrival) World.setFloor(0);
  // Somewhere you have now stood. Two chapters count districts, and this is the only door they all
  // come through — including the ones the title reel walks you through, which is why it is guarded
  // on `started` rather than counted from the first frame.
  if (started) Story.stoodIn(isOfficePlace(name)?'office':name);
  const sp = homeLobbyArrival ? HOME_LOBBY_ENTRY : at || scene.spawn;
  P.x = sp.x; P.z = sp.z; P.yaw = sp.yaw;
  P.lift = name === 'home' && World.deckY ? World.deckY(World.level()) : 0;
  // `Mall` is a Lazy proxy: reading ANY property off it builds the whole 35,802-prop shopping
  // centre. `typeof Mall !== 'undefined'` was written to be the safe test — and it is, for the
  // proxy — but `Mall.setFloor` on the next token is not, so every place change built the mall,
  // including the title reel's very first cut. That put a 162–346 ms mall construction into boot,
  // before the player had pressed start, for a building nobody had walked into. `Lazy.built` asks
  // the registry instead of the proxy, and a mall that has never been built has no floor to reset.
  if (Lazy.built('Mall')) Mall.setFloor(1);
  // `jy`/`jv` go with them: change place mid-hop — walk into a lift, board a train — and you
  // arrive standing on the new floor rather than falling onto it.
  P.vx = P.vz = 0; P.speed = 0; P.ground = 0; P.turn = 0; P.phase = 0; P.jy = 0; P.jv = 0;
  // Coordinate-space cuts also reset the animation sensors. Carrying the last room's smoothed
  // ground speed into a stationary spawn produced a ghost settling step and a false braking pulse.
  P.animGround = 0; P.animAccel = 0; P.animFloor = P.lift; P.animClimb = 0;
  sitting = null; act = null;     // you are not still in the last room's chair
  CAM.fx = P.x; CAM.fz = P.z; CAM.lookY = 1.10; CAM.spin = 0; CAM.assist = null;
  CAM.slide = CAM.rise = 0;
  CAM.tYaw = CAM.yaw = sp.yaw;
  // Indoors or out covers every room in the game except one. The aeroplane cabin is a tube 6.6m
  // across with luggage bins at head height down both sides, and the standard indoor camera — 4.4m
  // back, pitched up a third of a radian — puts the eye above those bins and above the ceiling
  // line, looking at the tops of things. A room that cannot take the default says so itself.
  const cd = scene.camera || {};
  CAM.tPitch = CAM.pitch = cd.pitch !== undefined ? cd.pitch : scene.indoor ? 0.34 : 0.22;
  CAM.tDist = CAM.dist = cd.dist !== undefined ? cd.dist : scene.indoor ? 4.4 : 5.2;
  if (cd.lookY !== undefined) CAM.lookY = cd.lookY;
  room = scene.zones[0];
  // A quality level that could not be held in the hutong may be easy in a room with four hundred
  // props in it instead of three and a half thousand, so let the ladder try again from here.
  Perf.forget();
  // Indoors and outdoors want different small-prop cutoffs, and js/perf.js:362 cannot tell which
  // room it is in on its own. Without this line the indoor minPx cap is inert.
  Perf.setPlace(name);
  // The platform has a floor of sound under it — ventilation, ballast hum, the smeared remains of
  // other people's conversations — and it is the difference between a tiled room and a station.
  // It follows the room rather than the clock, so it goes when you go up the steps.
  TrainAudio.platform(SET.ambience && name === 'metro');
  // The terminal has a floor of sound under its announcements for the same reason the platform does
  // — a hall that is silent between PA calls is a vacuum, not a concourse — and it follows the room
  // the same way, so it leaves when you take the subway back into town.
  TrainAudio.terminal(SET.ambience && name === 'airport');
  // The noodle shop has its own close tiled-room bed: extractor hood, wok, conversation and
  // crockery. It follows the room just like the station and terminal ambience.
  TrainAudio.diner(SET.ambience && name === 'diner');
  if (started && name === 'diner' && cameFrom !== 'diner') {
    Diner.doorPass();
    TrainAudio.dinerCue('door');
  }
  // And the hutong itself, which had nothing at all. Every interior in the game has had a floor of
  // sound under it for months and the one place you spend most of your time was silent, so stepping
  // out of the front door stopped the city existing. It follows the room like the others do.
  TrainAudio.hutong(SET.ambience && name === 'street');
  // The atrium has its own sound bed: fountain wash, escalator machinery, crowd and shop cues.
  TrainAudio.mall(SET.ambience && name === 'mall');
  // And an advert in the gap at the end of every record. Registered once and left alone: the
  // audio side hands over the silence and waits to be given the room back, so a commercial that
  // has no clip behind it costs the playlist nothing at all.
  if (!mallAdsHooked) {
    mallAdsHooked = true;
    TrainAudio.onTrackEnd(resume => {
      if (place !== 'mall') { resume(); return; }
      const ad = Mall.nextAd();
      if (!ad || !ad.zh) { resume(); return; }
      lastCall = { key: ad.key, text: ad.zh, room: 'mall' };
      toast(`广告 · ${ad.zh}` + (ad.en ? `<br><span class="dim">${ad.en}</span>` : ''));
      logDiary(ad.zh, ad.en || '', 'mall');
      TrainAudio.mallNotice(ad.zh, resume);
    });
  }
  if (started && name === 'mall' && cameFrom !== 'mall') TrainAudio.mallCue('door');
  // The aeroplane's own bed of noise, and it follows the room for exactly the same reason the
  // platform's does. It used to be started in `boardCabin` and stopped in `landFlight`, which is
  // wrong at both ends: arriving in the cabin any other way — a reload restoring a save made on
  // board, which does not go through `boardCabin` — left the aeroplane completely silent, and
  // leaving it any other way left the engines running in whatever room you walked into next.
  TrainAudio.cabinNoise(name === 'cabin');
  // Who is in the station, for the hour it is now.
  if (name === 'metro') stationEnter();
  // Voices carry the room they are spoken in. An alley has one wall opposite and the sky above;
  // a shop has six surfaces within a couple of metres of the person talking to you.
  Speech.setRoom(isOfficePlace(name)?'office':name);
  Speech.stop();                  // whoever was mid-sentence is not in here with you any more
  act = null; hoverLabel = null; hoverThing = null; reachThing = null;
  activeThing = null; useThing = null;
  if (name !== 'shop') basketHeld = false;   // the basket belongs to the 超市
  // Labels for the place you just left would otherwise hang frozen on screen.
  // The `near` class carries opacity:1 !important, so a label left selected in the place you
  // just walked out of would hang on screen over the new one.
  for (const th of allThings) if (th.place !== name) {
    th.el.classList.remove('near');
    // Through labelHide, not straight at the style, so the record of what has been written to
    // this element stays true. Writing round it would leave the cache claiming the label is
    // still at 0.62 opacity, and the next time you walked back into this room the label would
    // agree with the cache, decide there was nothing to write, and never reappear.
    labelState(th).near = false;
    labelHide(th);
  }
  // Each place says what it is called rather than the chip guessing from `indoor`, which only
  // ever had two answers in it. Home adds its live deck because every storey shares this scene.
  if (name === 'home') syncHomeFloor(false);
  else paintPlaceLabel();
  // The room shell and the window the sunlight comes through are both per place: the shader
  // shades a surface by how much of its room can see it, and projects daylight through one
  // named opening. Seeded once from the apartment, every other interior was lit as though it
  // were 3.5 m wide with a window in somebody else's wall.
  if (scene.RX) R.setRoom(scene.RX, scene.H, scene.RZ);
  if (scene.WIN) R.setWindow(scene.WIN.x, scene.WIN.y, scene.WIN.z, scene.WIN.hw, scene.WIN.hh);
  // The minimap redraws here rather than waiting for the HUD's quarter-second tick: arriving
  // somewhere and still being told you are at Willow Lane is the one thing a map must not do.
  updateMap();
  // Same for the departure boards: walking into a terminal whose screens still say what they
  // said an in-game day ago is the same class of mistake.
  refreshSigns();
  if (started) goalEvent('visit', isOfficePlace(name)?'office':name);
}

HotelLift.bind({
  cue(kind){TrainAudio.liftCue(kind);},
  arrive(key){
    const f=hotelFloorAt(key)||hotelFloorAt('hotel');
    setPlace(f.key,{x:15.55,z:-3.70,yaw:-Math.PI/2});
    TrainAudio.liftCue('ding');
    toast(`${f.hz} · <span class="dim">doors open · ${f.short}</span>`);
    saveGame();
  },
});

OfficeLift.bind({
  cue(kind){TrainAudio.liftCue(kind);},
  arrive(key){
    const f=officeFloorAt(key)||officeFloorAt('office1');
    setPlace(f.key,{...OFFICE_CORE.landing});
    TrainAudio.liftCue('ding');
    toast(`${f.hz} · <span class="dim">doors open · ${f.short}</span>`);
    saveGame();
  },
});

const thingOnCurrentDeck = th => {
  if (place !== 'home') return true;
  // Car vocabulary was authored while the lift sat on deck 0, but its y position travels with the
  // car. Treat it like the deck=-1 geometry while the car is present (or while the player rides),
  // and hide it behind a shut landing when the car is elsewhere.
  if (th.homeCar) {
    const st = World.liftState && World.liftState();
    return !!(st && (st.riding || (st.at === st.on &&
      (st.door !== 'shut' || (World.aboard && World.aboard(P.x, P.z))))));
  }
  return th.deck === undefined || th.deck < 0 || th.deck === World.level();
};
const inReach = th => Math.hypot(th.focus[0] - P.x, th.focus[1] - P.z) <= th.reach &&
  (place !== 'mall' || !th.mallFloor || th.mallFloor === Mall.level()) &&
  // And the same for the tower, for the same reason and with worse consequences: the shopping
  // centre has three decks, the block has twelve, all sharing one (x, z). Reach is measured in the
  // ground plane only, so standing on the roof the game offered 看看电表 — the electricity meter on
  // the corridor eleven floors below, directly under your feet. Every floor of this building
  // contests every other floor's words.
  //
  // `th.deck` is stamped by js/world.js as each room builds; `undefined` is the shell's and belongs
  // to every deck, and -1 rides the lift car.
  thingOnCurrentDeck(th);
// The tower is one scene with twelve homes stacked in one footprint.  A plain USE fallback there
// made every familiar object in somebody else's flat operate the player's own fixtures and needs:
// an eleventh-floor 床 used the second-floor bed coordinates, and any upper 门 teleported to the
// street. Resolve that scene by deck, while retaining the landing controls and safety equipment
// shared by the building.
const HOME_SHARED_USE = new Set(['电梯', '安全出口', '消防栓']);
function homeUseDef(hz) {
  const deck = World.level ? World.level() : 2;
  if (hz === '门')
    return deck === 0 ? HOME_DOOR_USE.lobby : deck === 2 ? HOME_DOOR_USE.flat
      : HOME_DOOR_USE.neighbour;
  if (hz === '按钮') {
    const st = World.liftState && World.liftState();
    return st && !st.moving && st.at === st.on && World.aboard && World.aboard(P.x, P.z)
      ? USE_AT.home[hz] : null;
  }
  if (HOME_SHARED_USE.has(hz)) return USE_AT.home[hz] || null;
  if (deck === 0)
    return USE_AT.home[hz] || (hz === '镜子' ? USE[hz] : null);
  // Deck 2 asks its own floor table first and then falls through, which the other eleven decks do
  // not: this is the player's flat, so a word that has to mean something different *here* than it
  // means in a bank or a hotel gets first refusal — the same rule USE_AT applies between places,
  // applied between storeys. Until this line existed HOME_USE_FLOOR had keys 3–12 and no 2, and
  // the one furnished floor in the building had nowhere to put a flat-only verb.
  if (deck === 2)
    return (HOME_USE_FLOOR[2] && HOME_USE_FLOOR[2][hz]) || USE_AT.home[hz] || USE[hz] || null;
  return (HOME_USE_FLOOR[deck] && HOME_USE_FLOOR[deck][hz]) || null;
}

// ---------------------------------------------------------------- the flat's own labels
//
// Every verb in the living loop that has to read state before it can say what it is. Kept out of
// `useLabel`, which already carries the shop, the restaurant, the train and the delivery rider —
// there are twenty of these and inlining them would have doubled that function.
//
// Returns a rewritten def, or null to leave the row exactly as `js/data.js` wrote it.
const ALARM_TIMES = [6.5, 7, 7.5, 8, 9, null];   // and round again to off
// `hhmm` above takes minutes of the day; everything in here is an hour, so it goes through this.
const hm = h => hhmm(h * 60);
const zhTime = h => `${Math.floor(h) % 24}点${Math.round((h % 1) * 60) ? Math.round((h % 1) * 60) + '分' : ''}`;

function flatLabel(d, hz) {
  const deck = place === 'home' && World.level ? World.level() : -1;
  const atFlat = deck === 2;

  // ---- a row that is only offered inside a window of the day. `hours:[from, to]` wraps midnight
  // when `from > to`, which is the only interesting case: 只有夜里才考研 means 22:00 to 03:00, and a
  // condition nothing enforces is a sentence about a rule rather than a rule.
  if (Array.isArray(d.hours)) {
    const h = minutes / 60, a = d.hours[0], b = d.hours[1];
    const open = a <= b ? (h >= a && h < b) : (h >= a || h < b);
    if (!open)
      return { ...d, zh:'看看', py:'kànkan', en:`only between ${a}:00 and ${b}:00`,
               block:`这会儿不行，${a}点以后吧。`, blockTr:`Not now — after ${a}:00.` };
  }

  // ---- 安全出口. A sign to read while the lift runs, and the way home when it does not.
  //
  // Items 250 and 251. The sign's joke — 十二层，还是坐电梯吧 — is only funny on a day there is a
  // lift, so on a 检修/停电 day it inverts and the fire stair becomes an action. The cost is per
  // storey and is applied by `HomeLife.stairCost`, not here: a flat charge made the eleventh floor
  // the same as the third and the tower pointless, which is the whole of item 251.
  if (d.stairs) {
    const out = typeof Disrupt !== 'undefined' ? Disrupt.liftOut(day, minutes) : null;
    const h = ((minutes % 1440) + 1440) % 1440 / 60;
    const night = h >= HOME_RUSH.夜深[0] && h < HOME_RUSH.夜深[1];
    // The stairwell light is on a sensor. That is true of the sign and of the climb, so it is
    // read once here and appended to whichever of the two you get.
    const lit = night && d.night ? `${d.night}` : '';
    const litTr = night && d.nightTr ? ` ${d.nightTr}` : '';
    if (!out)
      return { ...d, done: lit || d.done, doneTr: (lit ? d.nightTr : d.doneTr) };
    const here = World.level ? World.level() : 2;
    // The two trips a tenant actually makes on the day the lift stops: home to 202, or down and
    // out of the building. Any other pair is a floor picker, and a floor picker on a fire stair is
    // a menu nobody opens twice.
    const to = here === 2 ? 0 : 2;
    const c = HomeLife.stairCost(here, to, d.climb);
    if (!c.floors)
      return { ...d, done: d.outDone || d.done, doneTr: d.outDoneTr || d.doneTr };
    const cl = d.climb || {};
    return { ...d, zh: cl.zh || '爬楼梯', py: cl.py || 'pá lóutī',
             en: `${cl.en || 'climb the stairs'} — ${c.floors} ${c.floors === 1 ? 'storey' : 'storeys'} ` +
                 `${c.up ? 'up' : 'down'}, about ${c.mins} min`,
             secs: c.secs, mins: c.mins, pose: cl.pose || d.pose,
             gain: { rest: c.rest, mood: c.mood },
             stairTo: to, stairFloors: c.floors,
             done: (c.high ? (cl.high || cl.done) : (cl.done || d.done)) + (lit ? lit : ''),
             doneTr: (c.high ? (cl.highTr || cl.doneTr) : (cl.doneTr || d.doneTr)) + litTr };
  }

  // ---- 睡觉. The wake time, not a fixed block.
  if (d.sleep) {
    const p = HomeLife.sleepPlan(day, minutes);
    const wake = zhTime(p.wakeHour);
    // Item 263. A bad night has to be legible as a bad night, and it has to say whose fault it was
    // — otherwise the rest bar is just lower and the player learns nothing. `noise.why` is the
    // disruption's own record, so the reason is F10's drill or F9's wedding by name.
    const noise = p.noise || { loud:0, why:null };
    if (noise.loud >= 0.08) {
      const why = noise.why || {};
      return { ...d, mins:p.mins, secs: 3.0 + Math.min(3.8, p.hours * 0.5),
               zh: p.alarm ? '睡到闹钟响' : '睡觉',
               py: p.alarm ? 'shuì dào nàozhōng xiǎng' : 'shuìjiào',
               en: `sleep ${p.hours.toFixed(1)}h — up at ${hm(p.wakeHour)}, and it is noisy upstairs`,
               gain:{ rest:p.rest, mood:p.mood },
               done: `${why.hz || '楼上一直有声音'}，一晚上没睡踏实。`,
               doneTr: `${why.en || 'Noise from upstairs all night.'} You slept badly.` };
    }
    return { ...d, mins:p.mins, secs: 3.0 + Math.min(3.8, p.hours * 0.5),
             zh: p.alarm ? '睡到闹钟响' : '睡觉',
             py: p.alarm ? 'shuì dào nàozhōng xiǎng' : 'shuìjiào',
             en: `sleep ${p.hours.toFixed(1)}h — up at ${hm(p.wakeHour)}` +
                 (p.late ? ', past 上班时间' : ''),
             gain:{ rest:p.rest, mood:p.mood },
             done: p.late ? `${wake}才醒，上班要迟到了。`
                 : p.hours < 5 ? `才睡了${p.hours.toFixed(0)}个小时，头还是晕的。`
                 : `睡好了，${wake}起来。`,
             doneTr: p.late ? `Awake at ${hm(p.wakeHour)} — you will be late for work.`
                 : p.hours < 5 ? `Only ${p.hours.toFixed(0)} hours. Still fuzzy.`
                 : `Slept well. Up at ${hm(p.wakeHour)}.` };
  }
  // ---- 闹钟. One press moves it on to the next setting and round to off, so setting one is a
  // decision you can regret rather than a panel.
  if (d.alarmSet) {
    const to = ALARM_TIMES[(ALARM_TIMES.indexOf(HomeLife.alarm) + 1) % ALARM_TIMES.length];
    return { ...d, alarmTo: to === null ? 'off' : to,
             zh: to === null ? '关闹钟' : '定闹钟',
             en: to === null ? `turn the alarm off (now ${hm(HomeLife.alarm)})`
                             : `set the alarm for ${hm(to)}`,
             done: to === null ? '闹钟关了。' : `闹钟定在${zhTime(to)}。`,
             doneTr: to === null ? 'Alarm off.' : `Alarm set for ${hm(to)}.` };
  }
  // ---- 热水器 and 洗澡. A cold shower still works; it restores less and it costs you the mood.
  if (d.heater)
    return { ...d, heaterTo: !HomeLife.heaterOn,
             zh: HomeLife.heaterOn ? '关热水器' : '开热水器',
             en: HomeLife.heaterOn ? 'switch the water heater off' : 'switch the water heater on',
             done: HomeLife.arrears > 0 ? '欠费了，开了也不烧。'
                 : HomeLife.heaterOn ? '热水器关了。' : '热水器开了，等一会儿有热水。',
             doneTr: HomeLife.arrears > 0 ? 'In arrears — it will not fire.'
                 : HomeLife.heaterOn ? 'Heater off.' : 'Heater on. Hot water in a few minutes.' };
  if (d.shower) {
    // The clock goes in, so 停水 is discovered standing in the shower rather than read in a toast.
    const s = HomeLife.shower(day, minutes);
    // No water at all is its own row, and it is not "a cold shower" — you do not get clean and you
    // still have to go to work. `why` is the disruption's own [hz, en], so the reason is in Chinese.
    if (!s.water) return { ...d, zh:'停水了', py:'tíng shuǐ le', en:'the water is off — no shower',
             mins:2, secs:1.0, gain:{ clean:s.clean, mood:s.mood },
             done:s.why[0], doneTr:s.why[1] };
    if (s.hot) return null;
    return { ...d, zh:'洗冷水澡', py:'xǐ lěngshuǐ zǎo', en:'take a cold shower — there is no hot water',
             mins:12, secs:3.0, gain:{ clean:s.clean, mood:s.mood },
             done:'没热水，洗了个冷水澡。', doneTr:'No hot water. A cold shower, then.' };
  }
  // ---- 电视. Lane 6's deck-2 row is the switch — two minutes, and `FIXTURE['电视']` latches it on.
  // But the flat's largest single mood action was 看电视, forty-five minutes on the sofa, and a
  // room where the only thing you can do with a television is turn it on is a worse room. So: the
  // switch when it is off, the programme when it is on, which is also the order a person does them
  // in. `latched.tv` is what survives a reload, so a set left on is still on tomorrow.
  if (atFlat && hz === '电视' && latched.tv > 0.5)
    return { ...d, zh:'看电视', py:'kàn diànshì', en:'watch television', secs:4.4, mins:45,
             gain:{ mood:27, rest:6 },
             pose:{ type:'sit', seatY:0.55, recline:0.10 },
             done:'电视上都是中文。', doneTr:'It is all in Chinese.' };

  // ---- 刷牙, twice a day.
  if (d.teeth && !HomeLife.teethLeft(day))
    return { ...d, zh:'看看', py:'kànkan', en:'you have already brushed twice today',
             block:'今天已经刷过两次了。', blockTr:'You have brushed twice already today.' };

  // ---- the kitchen chain. 灶台 reports, 案板 chops, 炒锅 cooks, 电饭煲 runs in parallel.
  if (d.hob) {
    const left = HomeLife.riceLeft(day, minutes);
    const bits = [];
    if (left > 0) bits.push(`米饭还要${Math.ceil(left)}分钟`);
    else if (left === 0) bits.push('米饭好了');
    if (HomeLife.prep) bits.push(`${HomeLife.prep.hz}的菜切好了`);
    if (flat.smell > 0.5) bits.push('屋里一股油烟味');
    bits.push(HomeLife.fanOn ? '抽油烟机开着' : '抽油烟机没开');
    return { ...d, en:`${bits.length} things the hob has to say`,
             done:`${bits.join('，')}。`, doneTr:'You take stock of the hob.' };
  }
  if (d.board) {
    const can = Pantry.cookable(day);
    if (!can.length)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing you have the ingredients for',
               block:'没什么可切的。', blockTr:'There is nothing here to chop.' };
    const picked = cooking && can.find(r => r.hz === cooking);
    if (!picked)
      return { ...d, zh:'切菜', py:'qiē cài', cookPick:true, gain:{}, secs:1.2, mins:1,
               en:`${can.length} 个菜 you could start` };
    const m = HomeLife.prepMins(picked.mins);
    return { ...d, prepDo:picked.hz, mins:m, secs: 2.2 + m / 14,
             en:`chop for ${picked.en} — ${m} 分钟`,
             done:`${picked.hz}的菜切好了，下锅就行。`,
             doneTr:`Everything for ${picked.en} is chopped. It only needs the wok now.` };
  }
  if (d.wok) {
    const can = Pantry.cookable(day);
    if (!can.length)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing you have the ingredients for',
               block:'家里没什么可做的了。', blockTr:'There is nothing here to make.' };
    const picked = cooking && can.find(r => r.hz === cooking);
    if (!picked)
      return { ...d, zh:'做饭', py:'zuòfàn', cookPick:true, gain:{}, secs:1.2, mins:1,
               en:`${can.length} 个菜 you could make` };
    // Chopped earlier and it is three fifths of the time; straight into the wok and it is all of
    // it, which is the whole point of the board being a separate object.
    const ready = HomeLife.prepped(picked.hz, day);
    const m = ready ? HomeLife.cookMins(picked.mins) : picked.mins;
    return { ...d, cookDo:picked.hz, mins:m, secs: 3.0 + m / 24,
             zh:`做${picked.hz}`, py:`zuò ${picked.py}`,
             en:`cook ${picked.en} — ${m} 分钟${ready ? ', already chopped' : ''}`,
             gain:{ ...picked.gain, clean:-6 },
             done:`${picked.hz}做好了，端上桌吧。`,
             doneTr:`${picked.en} is done. Take it through to the table.` };
  }
  if (d.ricePot) {
    const left = HomeLife.riceLeft(day, minutes);
    if (left > 0)
      return { ...d, zh:'看看', py:'kànkan', en:`the rice needs ${Math.ceil(left)} more 分钟`,
               block:`饭还没好，还要${Math.ceil(left)}分钟。`,
               blockTr:`Not yet — ${Math.ceil(left)} minutes to go.` };
    if (left === 0)
      return { ...d, zh:'盛饭', py:'chéng fàn', en:'serve the rice', riceTake:true,
               mins:4, secs:2.0, gain:{ food:30, mood:5 },
               done:'米饭焖好了，香。', doneTr:'The rice is done, and it smells like it.' };
    if (!HomeLife.stockOf('米', day))
      return { ...d, zh:'看看', py:'kànkan', en:'no rice in the flat',
               block:'没有米了。', blockTr:'There is no rice.' };
    return { ...d, riceOn:true,
             en:`put the rice on — ready in ${HomeLife.RICE_MINS} 分钟`,
             done:`按下去了，${HomeLife.RICE_MINS}分钟以后能吃。`,
             doneTr:`Switched on. Ready in ${HomeLife.RICE_MINS} minutes.` };
  }
  if (d.fan)
    return { ...d, fanTo: !HomeLife.fanOn,
             zh: HomeLife.fanOn ? '关抽油烟机' : '开抽油烟机',
             en: HomeLife.fanOn ? 'switch the extractor off' : 'switch the extractor on',
             done: HomeLife.fanOn ? '抽油烟机关了。' : '抽油烟机开了，声音真大。',
             doneTr: HomeLife.fanOn ? 'Extractor off.' : 'Extractor on. It is loud.' };
  if (d.noodles) {
    if (!HomeLife.canNoodle(day))
      return { ...d, zh:'倒水', py:'dào shuǐ', en:'pour a cup of hot water', noodles:false,
               mins:2, secs:1.6, gain:{ food:3, mood:3 },
               done:'喝了杯热水。', doneTr:'A cup of hot water.' };
    return { ...d, en:`instant noodles — ${HomeLife.noodleMins} 分钟, against 25–60 at the hob` };
  }
  // ---- 洗碗, scaled by what you cooked rather than a flat one.
  if (hz === '水池' && flat.dishes > 0.02) {
    const w = HomeLife.washUp(flat);
    return { ...d, zh:'洗碗', py:'xǐ wǎn', en:`do the washing up — ${w.mins} 分钟`,
             secs: 2.0 + w.mins / 12, mins:w.mins, washUp:true,
             gain:{ clean:w.clean, mood:w.mood },
             done:'碗洗好了。', doneTr:'The bowls are clean.' };
  }

  // ---- 洗衣机 and 晾衣架.
  if (d.washer) {
    const left = HomeLife.washLeft(day, minutes);
    if (left > 0)
      return { ...d, zh:'看看', py:'kànkan', en:`${Math.ceil(left)} 分钟 left on the cycle`,
               block:`还在洗，还要${Math.ceil(left)}分钟。`,
               blockTr:`Still running — ${Math.ceil(left)} minutes to go.` };
    if (HomeLife.washWaiting())
      return { ...d, zh:'看看', py:'kànkan', en:'a finished load is still in the drum',
               block:'洗好了，得晾出去。', blockTr:'It has finished. It needs hanging out.' };
    if (!HomeLife.laundryReady(flat))
      return { ...d, zh:'看看', py:'kànkan', en:'nothing dirty enough to wash',
               block:'没多少脏衣服。', blockTr:'There is barely anything to wash.' };
    return { ...d, washOn:true, en:`put a wash on — ${HomeLife.WASH_MINS} 分钟` };
  }
  if (d.drying) {
    const st = HomeLife.hungState(flat);
    // The roof is the building's drying floor and the balcony is the flat's, so a load can be on a
    // different storey from the rack you are standing at. Say so rather than pretending it is here.
    if (st && HomeLife.hungOn() !== deck)
      return { ...d, zh:'看看', py:'kànkan',
               en:`your washing is up on ${HomeLife.hungOn() === 12 ? 'the roof' : `F${HomeLife.hungOn()}`}`,
               block:`衣服晾在${HomeLife.hungOn() === 12 ? '屋顶' : HomeLife.hungOn() + '楼'}呢。`,
               blockTr:`The washing is hanging on ${HomeLife.hungOn() === 12 ? 'the roof' : 'floor ' + HomeLife.hungOn()}.` };
    if (st && st.ruined)
      return { ...d, zh:'收衣服', py:'shōu yīfu', en:'the washing was rained on', bringIn:true,
               mins:8, secs:2.4, gain:{ mood:-12 },
               done:'下雨淋湿了，得重洗。', doneTr:'Rained on. It all has to go through again.' };
    if (st && st.dry >= 0.98)
      return { ...d, zh:'收衣服', py:'shōu yīfu', en:'bring the dry washing in', bringIn:true,
               mins:10, secs:2.6, gain:{ mood:10, clean:6 },
               done:'衣服干了，都收下来了。', doneTr:'Dry, and all folded away.' };
    if (st)
      return { ...d, zh:'看看', py:'kànkan', en:`${Math.round(st.dry * 100)}% dry`,
               block:`还没干，才${Math.round(st.dry * 100)}%。`,
               blockTr:`Not dry yet — ${Math.round(st.dry * 100)}%.` };
    if (!HomeLife.washWaiting())
      return { ...d, zh:'看看', py:'kànkan', en:'nothing washed to hang out',
               block:'没有洗好的衣服。', blockTr:'There is no finished wash to hang.' };
    const out = deck === 12 || deck === 2;
    return { ...d, hangOut:true, hangDeck:deck,
             en: out ? `hang it out — ${Math.round(HomeLife.dryMins(day, deck) / 60)}h, and the sky can ruin it`
                     : `hang it up indoors — ${Math.round(HomeLife.dryMins(day, deck) / 60)}h, safe from the rain`,
             done: out ? '晾出去了，希望别下雨。' : '晾在屋里了，干得慢点儿。',
             doneTr: out ? 'Hung out. Let us hope it stays dry.' : 'Hung up indoors. Slower, but safe.' };
  }
  // ---- 打扫, which is the only thing that clears the dust.
  if (d.sweep) {
    if (flat.dust < 0.06)
      return { ...d, zh:'看看', py:'kànkan', en:'the floors are already clean',
               block:'地上挺干净的。', blockTr:'The floors are fine.' };
    const s = HomeLife.sweepWorth(flat.dust);
    return { ...d, sweepDo:true, mins:s.mins, secs: 2.6 + flat.dust * 3.4,
             gain:{ mood:s.mood, clean:s.clean, rest:-6 },
             en:`sweep and mop — ${Math.round(flat.dust * 100)}% dusty` };
  }

  // ---- 餐厅. A dish carried through and eaten sitting down is worth more than one eaten standing
  // at the hob, which is the only reason the dining room is a room.
  if (d.eatAt && atFlat) {
    const p = HomeLife.plated;
    if (p)
      return { ...d, zh:`在桌子上吃${p.hz}`, py:'zuò xiàlai chī', en:`sit down to the ${p.en}`,
               mins:25, secs:3.2, eatPlate:true,
               gain:{ food:(p.gain.food || 30) + 6, mood:(p.gain.mood || 6) + 9 },
               pose:{ type:'eat', hold:'meal' },
               done:'坐下来好好吃了一顿。', doneTr:'Sat down and ate it properly.' };
    if (HomeLife.leftovers) {
      const l = HomeLife.leftovers, off = HomeLife.leftoverGone(day);
      return { ...d, zh:`吃${l.hz}`, py:'chī shèngcài', eatLeft:true,
               en: off ? `the leftover ${l.en} — it has gone off` : `last night's ${l.en}`,
               mins:18, secs:2.8, gain:{ food: off ? 6 : 40, mood: off ? -16 : 6 },
               pose:{ type:'eat', hold:'meal' },
               done: off ? '剩菜坏了，不该吃的。' : '昨天的剩菜，热一下也挺好。',
               doneTr: off ? 'The leftovers had turned. That was a mistake.'
                           : "Last night's, warmed through. Perfectly good." };
    }
    return null;                       // no meal to carry through: it is a drawer again
  }
  // ---- 倒茶, which is what you do when somebody is in the flat.
  if (d.tea) {
    const g = HomeLife.guestDue(day, minutes);
    if (g)
      return { ...d, zh:'给客人倒茶', py:'gěi kèrén dào chá', en:`pour tea for ${g.en}`,
               teaGuest:true, mins:12, secs:3.0, gain:{ mood:16, food:4 },
               done:'倒了两杯茶，坐下聊天。', doneTr:'Two cups poured, and you sit down to talk.' };
    return null;
  }

  // ---- 书桌. The one review station in the player's home.
  if (d.study && atFlat) {
    const w = HomeLife.studyWorth();
    if (!w.n)
      return { ...d, zh:'看看笔记', py:'kàn kàn bǐjì', en:'nothing is due for review',
               mins:20, secs:2.6, gain:{ mood:6 },
               done:'今天没有要复习的词。', doneTr:'Nothing due today.' };
    return { ...d, studyDo:true, mins:w.mins, secs: 2.4 + w.mins / 22,
             en:`${w.n} 个词 due — the real review queue`,
             gain:{ mood:w.mood, rest:-6, food:-6 },
             done:`复习了${w.n}个词。`, doneTr:`Reviewed ${w.n} words.` };
  }

  // ---- a door that can refuse. `need` names a thing you have to be carrying; the tenant starts
  // with their own 门禁卡, so this only ever fires once the card has actually been lost.
  if (d.need && !held(d.need))
    return { ...d, zh:'看看', py:'kànkan', en:`you need your ${d.need}`,
             block:d.noHave || `没带${d.need}。`, blockTr:d.noHaveTr || `You do not have your ${d.need}.` };

  // ---- the post, the locker and the parcel by the door. One backing store for all three, and on
  // the days there is no bill in it, `MAIL_DAY` keyed to the date rather than one fixed sentence.
  if (d.mailbox) {
    const n = HomeLife.postFor(day);
    if (!n)
      return { ...d, zh:'看信箱', py:'kàn xìnxiāng', en:'the letterbox is empty',
               block:'信箱是空的。', blockTr:'Nothing in the box.' };
    const m = MAIL_DAY[day % MAIL_DAY.length];
    return { ...d, mailTake:true, en:`${n} thing${n === 1 ? '' : 's'} in the letterbox`,
             done:m[1], doneTr:m[2] };
  }
  // ---- the porter, who knows the two things a 门卫 is for. Whichever is true right now.
  if (d.porter && Array.isArray(d.ask)) {
    const line = HomeLife.parcelsAt('locker').length ? d.ask.find(a => a[0] === '快递') : d.ask[0];
    if (line) return { ...d, en:`ask him about ${line[0]}`, done:line[1], doneTr:line[2] };
  }
  if (d.locker) {
    const code = HomeLife.lockerCode();
    if (!code)
      return { ...d, zh:'看看', py:'kànkan', en:'no parcel waiting for you',
               block:'柜子里没有我的件。', blockTr:'Nothing in there is yours.' };
    return { ...d, parcelTake:'locker', en:`取件码 ${code}`,
             done:`输入${code}，柜门弹开了。`, doneTr:`You key in ${code} and the door pops open.` };
  }
  if (d.parcel) {
    if (!HomeLife.parcelsAt('door').length)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing has been left here',
               block:'门口没有我的快递。', blockTr:'There is no parcel of yours here.' };
    return { ...d, parcelTake:'door' };
  }

  // ---- 缴费, and the two other things a phone is for at home.
  if (d.phone) {
    const owed = HomeLife.billsOwed();
    if (owed > 0)
      return { ...d, zh:'手机缴费', py:'shǒujī jiāofèi', en:`pay ¥${owed} of bills on the phone`,
               payBills:true, cost:owed, mins:10, secs:2.4, gain:{ mood:4 } };
    if (atFlat && HomeLife.tidiness(flat) < 0.55 && !HomeLife.ayi)
      return { ...d, zh:'叫阿姨', py:'jiào āyí', en:`book the cleaner — ¥${HomeLife.AYI_FEE}, she comes tomorrow`,
               bookAyi:true, cost:HomeLife.AYI_FEE, mins:8, secs:2.2, gain:{ mood:5 },
               done:'约好了，阿姨明天上午来。', doneTr:'Booked. She comes tomorrow morning.' };
    if (atFlat && !HomeLife.guest)
      return { ...d, zh:'约邻居来家里', py:'yuē línjū lái jiā lǐ', en:'invite a neighbour round tomorrow',
               inviteGuest:true, mins:12, secs:2.6, gain:{ mood:9 },
               done:'说好了，明天下午来坐坐。', doneTr:'Agreed — tomorrow afternoon.' };
    return null;
  }
  if (d.payBills) {
    const owed = HomeLife.billsOwed();
    if (!owed)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing outstanding',
               block:'这个月的都交了。', blockTr:"This month's are all paid." };
    return { ...d, cost:owed, en:`settle ¥${owed} at the desk` };
  }
  if (d.billBoard) {
    const owed = HomeLife.billsOwed();
    return { ...d, en: owed ? `the rates, and ¥${owed} of yours outstanding` : d.en };
  }
  return null;
}

function useDefAt(hz, th) {
  if (place === 'home') return homeUseDef(hz);
  if (place === 'bank' && th && th.bankUse && USE_AT.bank && USE_AT.bank[th.bankUse])
    return USE_AT.bank[th.bankUse];
  const officeId=th&&th.officeAction||hz;
  return (typeof OfficeUse !== 'undefined' && OfficeUse[place] && OfficeUse[place][officeId]) ||
         (typeof HotelUse !== 'undefined' && HotelUse[place] && HotelUse[place][hz]) ||
         (USE_AT[place] && USE_AT[place][hz]) || USE[hz] || null;
}

// A place-specific action is just as usable as a global one. Keeping this check in one helper is
// important for the mall: its shops and the two escalator landings deliberately share familiar
// labels, but what Q does depends on the floor and room they are in.
const canUse = th => !!(th && useDefAt(th.hz,th));

// `USE_AT` lives in js/data.js, with the other two data tables.
// Every tenant's own name is the same action — look through what they sell and choose one — and
// every tenant has a till. Generated from the catalogue so a new shop needs one entry, not three.
const MALL_DONE = {
  '服装店':['试了两件，这件合身。','Two tried on; this one fits.'],
  '咖啡店':['在窗边坐着喝完。','You drink it sitting by the window.'],
  '餐厅':['点了菜，靠窗的位子。','Ordered, at a table by the window.'],
  '书店':['翻了半天才挑好。','It took a while to choose.'],
  '花店':['让老板包起来。','You have them wrapped up.'],
  '甜品店':['站在柜台边就吃完了。','You finish it standing at the counter.'],
  '玩具店':['蹲下来挑了半天。','You crouch down and take your time choosing.'],
  '美妆店':['在手背上试了两个色号。','Two shades tried on the back of your hand.'],
  '运动店':['比了比大小才决定。','You hold it up for size before deciding.'],
  '家居店':['一样一样拿起来看。','You pick each one up in turn.'],
};
for (const shop in MALL_GOODS) {
  const d = MALL_DONE[shop] || ['看中一件，拿去收银台。','You pick one out and take it to the till.'];
  USE_AT.mall[shop] = { zh:'挑一件', py:'tiāo yí jiàn', en:`browse the ${shop}`, secs:2.4, mins:8,
    gain:{ mood:5 }, pose:{ type:'open' }, mallBrowse:true, done:d[0], doneTr:d[1] };
}
USE_AT.mall['收银台'] = { zh:'买单', py:'mǎidān', en:'pay at the till', secs:2.2, mins:5,
  gain:{ mood:6 }, pose:{ type:'reach' }, mallPay:true,
  done:'谢谢，欢迎再来。', doneTr:'Thank you — come again.' };
// The cash machine by the mall doors is the bank's, not a prop: same account, same balance, same
// panel as the one in the branch, because there is only one of each in a life. It was authored in
// mall.js as a `thing` and then never wired to anything, so it read as scenery — and a player who
// could not get money out in the building they were spending it in had to leave to do it.
USE_AT.mall['取款机'] = { zh:'插卡办理', py:'chā kǎ bànlǐ', en:'use the cash machine', secs:1.5,
  mins:2, gain:{}, pose:{ type:'press' }, bankATM:true };

function useLabel(hz, th) {
  // The room gets first refusal on what a word means in it — see USE_AT.
  let d = useDefAt(hz,th);
  if (!d) return null;
  // The rebuilt flat no longer occupies the legacy one-room coordinates still written into the
  // oldest USE poses. Anchor furniture actions to the authored object on deck 2 (or to the seat
  // that belongs with it) so sleeping, working, showering and watching television cannot teleport
  // the body into another room. Upper floors never reach this branch: their local actions carry no
  // fixed apartment pose in the first place.
  if (place === 'home' && World.level() === 2 && th && d.pose &&
      ['床','枕头','沙发','电视','椅子','电脑','马桶','淋浴'].includes(hz)) {
    let anchor = th;
    if (hz === '枕头' || hz === '电视') {
      const want = hz === '枕头' ? '床' : '沙发';
      anchor = scene.things.find(q => q.deck === 2 && q.hz === want) || th;
    } else if (hz === '电脑') {
      let best = null, bd = Infinity;
      for (const q of scene.things) if (q.deck === 2 && q.hz === '椅子') {
        const dd = (q.pos[0] - th.pos[0]) ** 2 + (q.pos[2] - th.pos[2]) ** 2;
        if (dd < bd) { bd = dd; best = q; }
      }
      anchor = best || th;
    }
    const nextPose = { ...d.pose, at:[anchor.pos[0], anchor.pos[2]] };
    // Fixed coordinates were not the only legacy assumption: their fixed facing belonged to the
    // old one-room plan too.  Aim seats at the object they serve, and sanitary fixtures toward the
    // clear approach authored for them.  This keeps the new sofa looking at the television (rather
    // than sitting backwards), the desk chair looking at its computer, and the toilet/shower body
    // orientation consistent with the side from which the fixture can actually be reached.
    let face = null;
    if (hz === '沙发' || hz === '电视')
      face = scene.things.find(q => q.deck === 2 && q.hz === '电视') || null;
    else if (hz === '电脑') face = th;
    if (face && face.pos)
      nextPose.yaw = Math.atan2(face.pos[0] - anchor.pos[0], face.pos[2] - anchor.pos[2]);
    else if ((hz === '马桶' || hz === '淋浴') && Array.isArray(th.focus))
      nextPose.yaw = Math.atan2(th.focus[0] - anchor.pos[0], th.focus[1] - anchor.pos[2]);
    d = { ...d, pose:nextPose };
  }
  // Hospital interaction labels often live at a doorway or a machine's control point, while the
  // patient's body belongs on a specific couch or chair. Each floor authors that physical point;
  // merge it into the verb pose here so the animation and the clinical furniture stay together.
  if (th && th.hospitalPose && d.pose)
    d = { ...d, pose:{ ...d.pose, ...th.hospitalPose } };
  // ---- 京华大酒店客房. Lying down in a room you have actually paid for is a night; lying down
  // anywhere else in the building is a nap, which is exactly what these rows already were
  // (H109, H111). The night uses `wakeAt()` — the same 08:00 rollover the flat and the Bund hotel
  // both use — rather than a hotel-local clock, so a night here and a night at home cost the same
  // hours and are charged the same rent in the morning.
  //
  // Recognised by the pose rather than by the word, because the six guest floors call their bed
  // six different things — 床, 大床, 套房床, 主卧, 七零二睡眠区, 七零三主卧 — and a rule spelled
  // per floor is a rule that is wrong on the seventh.
  //
  // `Stay.booking(day, minutes)` and not `Stay.booking()`: reading the booking is also what
  // settles an overstay (js/stay.js:255), and going to bed is precisely the moment that should be
  // charged rather than a moment that quietly is not.
  if (d.pose && d.pose.type === 'lie' && typeof Stay !== 'undefined' &&
      Stay.checkedIn && Stay.checkedIn()) {
    const b = Stay.booking(day, minutes);
    if (b && b.floor === place) {
      // How well it goes: the floor, the grade, and a neighbour or an air conditioner you have not
      // dealt with, which costs a third of the night. js/stay.js's `sleepFactor` owns all of it and
      // this only spends it. `rest` clamps at 100, so a quiet suite is simply a full night and the
      // thing the player actually feels is the problem they left unreported — which is the point.
      const q = Stay.sleepFactor(), quiet = q >= .95;
      return { ...d, zh:'睡觉', py:'shuìjiào', secs:6.4,
               mins:Math.max(1, wakeAt() - clockNow()), hotelSleep:true, sleepDay:day,
               gain:{ rest:Math.round(100 * q), mood:Math.round(12 * q) },
               en:`sleep in room ${b.room} — you would wake at 08:00`
                  + (quiet ? '' : ' · the room is not quiet, and you know why'),
               done: quiet ? `在${b.room}房睡了一夜。` : `${b.room}房太吵，没睡好。`,
               doneTr: quiet ? `A night in room ${b.room}.`
                             : `Room ${b.room} was not quiet. You did not sleep well.` };
    }
  }
  // ---- 北京银行.  The room-specific table prevents the counter from becoming a chemist; this
  // layer makes its prompt report the actual queue/account state.  Only people-dependent work is
  // clock-gated.  The ATM branch deliberately never reads the staffed-hours flag.
  if(place==='bank') {
    syncBankVisit();
    const staffed=!!(d.bankTicket||d.bankWait||d.bankOpenAccount||d.bankCardService||
      d.bankShowId||d.bankCounter||d.bankTeller||d.bankWealth||d.bankVip||d.bankSafe);
    if(staffed&&!bankStaffOpen()) return {...d,
      block:'柜台营业时间是上午九点到下午五点。自动取款机仍然开放。',
      blockTr:'Staffed counters are open 09:00–17:00. The cash machines are still available.'};
    const t=bankVisit.ticket;
    if(d.bankForms) d={...d,en:bankVisit.form
      ? `${bankVisit.form==='deposit'?'deposit':'withdrawal'} slip already filled; choose another if needed`
      : 'choose a deposit or withdrawal slip'};
    if(d.bankTicket) d={...d,en:t
      ? `current number ${t.no} · ${t.called?'called':'waiting'}`
      : 'choose personal or cash service and take one number'};
    if(d.bankWait) {
      if(!t) return {...d,block:'还没有号码，请先去取号机。',
        blockTr:'You do not have a queue number yet. Use the ticket machine first.'};
      if(t.called) return {...d,block:`${t.no}号已经叫到了，请去${t.counter}。`,
        blockTr:`${t.no} has been called. Go to the ${BANK_SERVICES[t.kind].en}.`};
      d={...d,mins:t.waitMins,en:`wait about ${t.waitMins} minutes for ${t.no}`,
        done:`${t.no}号，请到${t.counter}。`,doneTr:`${t.no} has been called. Go to the ${BANK_SERVICES[t.kind].en}.`};
    }
    if(d.bankCallBoard) {
      const status=bankTicketStatus();
      d={...d,en:status[1],done:status[0],doneTr:status[1]};
    }
    if(d.bankShowId) d=bankVisit.idShown
      ? {...d,zh:'身份证已核对',py:'shēnfènzhèng yǐ héduì',en:'your ID has already been checked',
          done:'身份证已经核对过了。',doneTr:'Your ID has already been checked.'}
      : {...d,en:'present ID for personal account service'};
    if(d.bankOpenAccount||d.bankCardService) {
      if(bankAccount.opened) d={...d,zh:d.bankCardService?'看银行卡':'看账户',
        py:d.bankCardService?'kàn yínhángkǎ':'kàn zhànghù',
        en:`account ${bankAccount.accountNo} · balance ¥${bankAccount.balance}`};
      else if(!t||t.kind!=='personal') return {...d,block:'开户要先取个人业务的号码。',
        blockTr:'Take a personal-service number before opening an account.'};
      else if(!t.called) return {...d,block:`${t.no}号还没叫到，请先等候。`,
        blockTr:`${t.no} has not been called yet. Wait for the display.`};
      else if(!bankVisit.idShown) return {...d,block:'请先出示身份证。',
        blockTr:'Present your ID card first.'};
    }
    if(d.bankCounter||d.bankTeller) {
      if(!bankAccount.opened) return {...d,block:'我还没有账户，先去开户。',
        blockTr:'You do not have an account yet. Open one at the personal-service desk.'};
      if(!t||t.kind!=='cash') return {...d,block:'请先取现金业务的号码。',
        blockTr:'Take a cash-service number first.'};
      if(!t.called) return {...d,block:`${t.no}号还没叫到，请坐下等候。`,
        blockTr:`${t.no} has not been called yet. Wait for it to be called.`};
      d={...d,en:d.bankTeller==='deposit'
        ? `deposit cash · wallet ¥${Math.floor(money)} · account ¥${bankAccount.balance}`
        : d.bankTeller==='withdraw'
        ? `withdraw cash · account ¥${bankAccount.balance}`
        : `choose deposit or withdrawal · ${t.no}`};
    }
    if(d.bankATM) {
      if(!bankAccount.opened||!bankAccount.hasCard) return {...d,
        block:'我还没有银行卡，得在营业时间先开户。',
        blockTr:'You need a bank card. Open an account during counter hours first.'};
      d={...d,en:`24-hour cash machine · balance ¥${bankAccount.balance}`};
    }
    if(d.bankWealth) d={...d,en:`compare savings, interest and risk · balance ¥${bankAccount.balance}`};
    if(d.bankVip) d={...d,en:bankAccount.balance>=1000
      ? 'you meet the ¥1,000 adviser threshold' : `VIP guide · ¥${1000-bankAccount.balance} below the threshold`};
    if(d.bankSafe) d={...d,en:'ask how the dual-key safe-deposit boxes work'};
  }
  // ---- the hospital care loop.  Prices and wording follow the symptom chosen at registration;
  // the room tables only name the physical action.  A refusal is still a usable prompt — it tells
  // the player which earlier hospital word they skipped instead of leaving a dead machine.
  if (d.hospitalRegister) {
    hospitalFresh();
    return hospitalVisit.case && hospitalVisit.stage<6
      ? { ...d, zh:'重新挂号', py:'chóngxīn guàhào', en:'start a new registration' }
      : d;
  }
  if (d.hospitalTriage) {
    hospitalFresh();
    if (!hospitalVisit.case)
      return { ...d, block:'请先挂号，再来分诊。', blockTr:'Register first, then come to triage.' };
    if (hospitalVisit.stage>=2)
      return { ...d, block:`已经分诊了，去二楼${hospitalCase()?.room||''}诊室。`,
        blockTr:`Triage is complete. Go to room ${hospitalCase()?.room||''} on the second floor.` };
  }
  if (d.hospitalConsult) {
    hospitalFresh();
    const r=hospitalCase();
    if(!r) return { ...d, block:'请先在一楼挂号。', blockTr:'Register on the ground floor first.' };
    if(hospitalVisit.stage<2)
      return { ...d, block:'还没有分诊，请先去一楼分诊台。', blockTr:'You still need triage on the ground floor.' };
    if(!th || th.hospitalRoom!==r.room)
      return { ...d, block:`挂号条写的是${r.room}诊室，请去对应诊室看医生。`,
        blockTr:`Your registration slip says room ${r.room}; see the doctor in that room.` };
    if(hospitalVisit.stage>=3)
      return { ...d, block:'医生已经看过了，请按医嘱去三楼。', blockTr:'The consultation is complete. Follow the order to the third floor.' };
    return { ...d, pay:-r.consult, en:`see the ${r.dept} doctor in room ${r.room} · ¥${r.consult}`,
      done:`医生看完了。${r.advice}`, doneTr:`Consultation complete. ${r.adviceEn}` };
  }
  if (d.hospitalTest) {
    hospitalFresh();
    const r=hospitalCase();
    if(!r||hospitalVisit.stage<3)
      return { ...d, block:'先去二楼看医生，拿到检查单。', blockTr:'See the doctor on the second floor and get a test order first.' };
    if(!r.needsTest)
      return { ...d, block:'医生没有开这项检查，直接去治疗室。', blockTr:'The doctor did not order this test. Go straight to treatment.' };
    if(hospitalVisit.tested)
      return { ...d, block:'检查已经做完了，结果在手机上。', blockTr:'The test is complete; the result is on your phone.' };
    if(hz!==r.test)
      return { ...d, block:`医嘱开的是${r.test}，请找对应的检查室。`,
        blockTr:`The order is for ${r.testEn}; find the matching examination room.` };
    return { ...d, zh:`做${r.test}`, py:d.py, en:`have ${r.testEn} · ¥${r.testCost}`,
      pay:-r.testCost, done:`${r.test}做完了，结果已经出来。`,
      doneTr:`${r.testEn.charAt(0).toUpperCase()+r.testEn.slice(1)} complete; the result is ready.` };
  }
  if (d.hospitalTreat || d.hospitalInfusion) {
    hospitalFresh();
    const r=hospitalCase();
    if(!r||hospitalVisit.stage<3)
      return { ...d, block:'先去二楼看医生。', blockTr:'See the doctor on the second floor first.' };
    if(r.needsTest&&!hospitalVisit.tested)
      return { ...d, block:`医嘱写着先做${r.test}。`, blockTr:`The order says to have ${r.testEn} first.` };
    if(hospitalVisit.treated)
      return { ...d, block:'今天的治疗已经完成了。', blockTr:"Today's treatment is already complete." };
    const care=r.care||'治疗室', infusion=care==='输液';
    if(infusion!==!!d.hospitalInfusion)
      return { ...d, block:`医嘱开的是${care}，请去对应区域。`,
        blockTr:`The order is for ${infusion?'an IV infusion':'the treatment room'}; go to the prescribed area.` };
    return { ...d, pay:-r.treat, gain:{...r.gain},
      zh:infusion?'按医嘱输液':'接受治疗',
      en:`${infusion?'have the prescribed IV infusion':'complete the prescribed treatment'} · ¥${r.treat}`,
      done:'治疗完成了，去药房取药。',doneTr:'Treatment complete. Collect the prescription from the dispensary.' };
  }
  if (d.hospitalDispense) {
    hospitalFresh();
    if(!hospitalVisit.treated)
      return { ...d, block:'还没有完成治疗，药房现在没有你的处方。',
        blockTr:'Complete treatment first; the dispensary has no prescription for you yet.' };
    if(hospitalVisit.dispensed)
      return { ...d, block:'药已经取过了。', blockTr:'You have already collected the medicine.' };
  }
  if (d.hospitalDischarge) {
    hospitalFresh();
    if(!hospitalVisit.treated)
      return { ...d, block:'医生还没有同意出院。', blockTr:'The doctor has not cleared you for discharge yet.' };
    if(!hospitalVisit.dispensed)
      return { ...d, block:'请先去三楼药房取药，再来办出院手续。',
        blockTr:'Collect your medicine from the third-floor dispensary before discharge.' };
    if(hospitalVisit.stage>=6)
      return { ...d, block:'出院手续已经办好了。', blockTr:'Discharge is already complete.' };
  }
  // Four escalators over three levels, so the prompt has to name the floor this one actually goes
  // to rather than assuming there is only ever an upstairs and a downstairs.
  if (place === 'mall' && hz === '扶梯' && th && th.mallDir) {
    const to = Mall.rideFloor(th.mallBank, th.mallDir, true);
    const zhFloor = ['', '一楼', '二楼', '三楼'][to];
    const enFloor = ['', 'level one', 'level two', 'level three'][to];
    d = { ...d, mallRide:th.mallDir, mallBank:th.mallBank || 'a',
      zh:th.mallDir === 'up' ? '坐扶梯上楼' : '坐扶梯下楼',
      py:th.mallDir === 'up' ? 'zuò fútī shànglóu' : 'zuò fútī xiàlóu',
      en:`ride ${th.mallDir === 'up' ? 'up' : 'down'} to ${enFloor}`,
      done:`到${zhFloor}了。`, doneTr:`${th.mallDir === 'up' ? 'Up' : 'Back down'} on ${enFloor}.` };
  }
  // ---- 电梯 at home. What the button does depends on where the car is, and so does what you say
  // when you press it. Three answers: it is already open in front of you and there is nothing to
  // press, it is moving and you wait, or it is on the other floor and you have just sent for it.
  // The stock line — 叮，门开了 — is only true in the first case, and this is what stops the game
  // saying the doors have opened while the car is still three metres below you.
  if (place === 'home' && d.liftCall && World.liftState) {
    const st = World.liftState();
    if (st.moving) {
      // 461. Which floor it is going to and how many seconds are left, because the old line said
      // only that it was busy — and a player told to wait with no idea how long presses again.
      // Both numbers come off `liftState`; neither is new information the game had to invent.
      const toF = homeFloorAt(st.to);
      const liftEta = Math.max(1, Math.ceil(st.eta || 0));
      return { ...d, zh:'等一下', py:'děng yíxià',
               en:`the car is going to ${toF ? toF.hz : 'another floor'} — about ${liftEta}s`,
               block:`电梯到${toF ? toF.hz : '别的楼层'}，还要${liftEta}秒。`,
               blockTr:`The car is on its way to ${toF ? toF.hz : 'another floor'} — about ${liftEta} seconds.` };
    }
    if (st.at === st.on && st.door !== 'shut')
      return { ...d, zh:'门开着', py:'mén kāi zhe', en:'the doors are open — step in',
               block:'门开着呢，进去吧。', blockTr:'The doors are already open. Step in.' };
    if (st.at !== st.on) {
      // The car is elsewhere, so pressing the button starts it moving and nothing else. The stock
      // line claims the doors have opened; they have not, and will not for another four seconds.
      // What you get told is that it is coming, and the 叮 when it actually arrives is a sound
      // rather than a sentence — which is how you find out on a real landing.
      const up = st.at < st.on;
      const carFloor = homeFloorAt(st.at);
      return { ...d, secs:2.2,
               en:`call the lift — it is on ${carFloor
                 ? `the ${HOME_FLOOR_EN[carFloor.n]} floor` : 'another floor'}`,
               done: up ? '电梯上来了，等一下。' : '电梯下来了，等一下。',
               doneTr: `The lift is on its way ${up ? 'up' : 'down'} — wait a moment.` };
    }
  }
  // ---- the till. What it says depends on what is in your hands, which is the whole point of
  // separating choosing from paying: 多少钱 has an answer only once you are holding something.
  if (place === 'mall' && d.mallPay) {
    if (!mallBasket.length)
      return { ...d, zh:'看看', py:'kànkan', en:'you have not chosen anything yet',
               block:'我先看看，谢谢。', blockTr:'Just looking for now, thanks.' };
    if (th && th.mallShop && basketShop() !== th.mallShop)
      return { ...d, zh:'不是这家', py:'bú shì zhè jiā', en:`that came from the ${basketShop()}`,
               block:`这是在${basketShop()}拿的。`,
               blockTr:`You picked that up in the ${basketShop()} — pay there.` };
    const total = mallTotal(), n = mallBasket.length;
    if (money < total)
      return { ...d, zh:'钱不够', py:'qián bú gòu', en:`¥${total}, and you have ¥${money}`,
               block:'钱不够，下次吧。', blockTr:'Not enough on you. Another time.' };
    // One thing is named; three things are counted. A till that reads out every item in a basket
    // of six is a till nobody can follow, and 一共 is the sentence a real one says anyway.
    const what = n === 1 ? mallBasket[0].item.en : `${n} things`;
    d = { ...d, pay:-total, en:`pay ¥${total} for ${what}`,
          done:`一共${total}块，谢谢。`, doneTr:`${total} kuai altogether. Thank you.` };
  }
  if (place === 'mall' && d.mallBrowse && th && th.mallShop)
    d = { ...d, en:`see what the ${th.mallShop} has` };
  // The detailed mall fixtures carry the identity that their shared Chinese headword cannot.
  // In particular 奶茶 also exists at a ground-floor kiosk; only the third-floor counter has a
  // foodVendor, so the old quick drink remains intact while the food hall gets the full order.
  if (place==='mall' && th && th.foodHall)
    d={...d,pay:0,gain:{},mallFoodHall:true,zh:'看看吃什么',py:'kànkan chī shénme',
      en:'choose a food-court counter'};
  if (place==='mall' && th && th.foodVendor)
    d={...d,pay:0,gain:{},secs:1.8,mins:2,pose:{type:'talk'},mallFood:true,foodVendor:th.foodVendor,
      zh:'点餐',py:'diǎn cān',en:`order at ${MALL_FOOD[th.foodVendor]?.en||th.foodVendor}`};
  if (place==='mall' && th && th.arcadeLobby)
    d={...d,pay:0,gain:{},mallArcadeLobby:true,en:`choose a game · ${mallProgress.tickets} tickets`};
  if (place==='mall' && th && th.arcadeGame)
    d={...d,pay:-ARCADE_PRICE,gain:{},secs:1.4,mins:1,
      pose:{type:th.arcadeGame==='dance'?'stand':'press'},mallArcadeGame:th.arcadeGame,
      en:`insert ¥${ARCADE_PRICE} and play ${ARCADE_GAMES[th.arcadeGame]?.en||'the game'}`};
  if (place==='mall' && th && th.arcadePrize)
    d={...d,pay:0,gain:{},mallPrize:true,en:`trade ${mallProgress.tickets} tickets for a prize`};
  if (place==='mall' && d.mallPassport)
    d={...d,en:`open the stamp passport · ${mallStampCount()} of 4`};
  if (place==='mall' && d.mallEvent) {
    const e=Mall.eventAt(minutes);
    d=e.active
      ? {...d,mallEventJoin:e.key,zh:`参加${e.hz}`,py:e.py,en:`join ${e.en}`,
          done:`参加了${e.hz}。`,doneTr:`You join ${e.en}.`}
      : {...d,mallEvent:false,mallEventSchedule:true,secs:1.2,mins:1,gain:{},
          zh:'看活动表',py:'kàn huódòngbiǎo',en:`next: ${e.clock} ${e.en}`,
          done:`下一场${e.clock}，${e.hz}。`,doneTr:`Next: ${e.en} at ${e.clock}.`};
  }
  // The foyer doors are the ticket check and the real route into the separately built auditorium.
  if (place === 'mall' && d.mallCinemaDoor) {
    if (!cinemaTicket)
      return { ...d, zh:'还没买票', py:'hái méi mǎi piào', en:'buy a ticket in the lobby first',
               block:'我还没买票，先去售票处买一张。',
               blockTr:'I have not bought a ticket — buy one at the box office first.' };
    d = { ...d, en:`enter screen one — ${cinemaTicket.clock}, ${cinemaTicket.seat}`,
          done:`检票了，${cinemaTicket.seat}。`,
          doneTr:`Ticket checked — ${cinemaTicket.seat}.` };
  }
  // The cinema runs to a timetable. Which film is on, and how long it takes out of your day, is
  // whatever the board in the lobby says is next — the board, the ticket and the seat all read the
  // same schedule, so the answer is the same wherever you ask.
  if (place === 'mall' && (d.mallTicket || d.mallFilm || d.mallShows)) {
    const n = Mall.nextShow(minutes);
    if (d.mallFilm) {
      // A seat you can take without a ticket is not a cinema. 检票 — having the ticket looked at on
      // the way in — is the one exchange every cinema in the country puts you through, so being
      // turned back here is worth a sentence of its own.
      if (!cinemaTicket)
        return { ...d, zh:'还没买票', py:'hái méi mǎi piào', en:'buy a ticket in the lobby first',
                 block:'我还没买票，去售票处买一张。',
                 blockTr:'I have not bought a ticket — the box office is in the lobby.' };
      // Sixty seats and exactly one of them is yours, which is what makes 电影票 worth reading —
      // the same exchange the boarding card puts you through on the aeroplane.
      if (th && th.mallSeat && th.mallSeat !== cinemaTicket.seat)
        return { ...d, zh:'不是这个', py:'bú shì zhège', en:`your seat is ${cinemaTicket.seat}`,
                 block:`这不是我的座位，我的是${cinemaTicket.seat}。`,
                 blockTr:`Not my seat — mine is ${cinemaTicket.seat}.` };
      d = { ...d, mins:cinemaTicket.mins,
            en:`watch ${cinemaTicket.en} — ${cinemaTicket.seat}`,
            done:`《${cinemaTicket.film}》开演了。`,
            doneTr:`${cinemaTicket.en}. The lights go down.` };
    }
    else if (d.mallTicket) {
      // One at a time. Two tickets is money gone for nothing, and the refusal names the showing you
      // are already holding one for and where you are meant to be sitting.
      if (cinemaTicket)
        return { ...d, zh:'票买好了', py:'piào mǎi hǎo le',
                 en:`you have one for ${cinemaTicket.clock} — ${cinemaTicket.seat}`,
                 block:`我买过票了，${cinemaTicket.clock}的，${cinemaTicket.seat}。`,
                 blockTr:`I already have a ticket — the ${cinemaTicket.clock} showing, ${cinemaTicket.seat}.` };
      if (money < CINEMA_PRICE)
        return { ...d, zh:'钱不够', py:'qián bú gòu', en:`¥${CINEMA_PRICE}, and you have ¥${money}`,
                 block:'钱不够，下次吧。', blockTr:'Not enough on me. Another time.' };
      d = { ...d, en:`buy a ticket — ${Mall.SHOWS.length} showings today`,
            done:'您看哪一场？', doneTr:'Which screening would you like?' };
    }
    else
      d = { ...d, en:`read the showtimes — next is ${n.clock}`,
            done:`下一场${n.clock}，《${n.film}》。`,
            doneTr:`Next screening ${n.clock}: ${n.en}.` };
  }
  // ---- on the aeroplane. Forty-two seats and exactly one of them is yours, which is what makes a
  // boarding card worth reading. Checked before the seat merge below, because that one returns.
  if (place === 'cabin' && th && th.cabinSeat) {
    const want = flight && flight.seat;
    if (want && th.cabinSeat !== want)
      return { ...d, zh: '不是这个', py: 'bú shì zhège', en: `your seat is ${want}`,
               block: `这不是我的座位，我的是${want}。`,
               blockTr: `Not my seat — mine is ${want}.` };
    if (Cabin.flying())
      return { ...d, zh: '坐好', py: 'zuò hǎo', en: 'you are already in it',
               block: '我已经坐好了。', blockTr: 'I am already sitting down.' };
  }
  // ---- and the lavatory, which is the one thing on board you are told you may not do. The sign owns
  // it on the ground, through the climb and all the way down; in the cruise somebody else may be in
  // there. Both refusals are worth having as separate sentences, because "not now" and "occupied" are
  // different things to be told and a learner meets them both on a real flight.
  if (place === 'cabin' && hz === '洗手间') {
    const st = Cabin.lavState();
    if (st === 'belted')
      return { ...d, zh: '不能去', py: 'bù néng qù', en: 'the seatbelt sign is on',
               block: '安全带指示灯亮着，现在不能去。',
               blockTr: 'The seatbelt sign is on — you cannot go yet.' };
    if (st === 'busy')
      return { ...d, zh: '有人', py: 'yǒu rén', en: 'occupied — wait for it',
               block: '里面有人，等一会儿。', blockTr: 'Somebody is in there. Wait a moment.' };
  }
  if (place === 'cabin' && th && th.cabinEquip) {
    const eq = Cabin.equipment();
    if (th.cabinEquip === 'bag' && Cabin.phase() !== 'arrived')
      return { ...d, block:'手提行李已经放好了，到达以后再取。',
               blockTr:'Your carry-on is stowed. Retrieve it after arrival.' };
    if ((th.cabinEquip === 'tray' || th.cabinEquip === 'recline') && eq.secure && !eq[th.cabinEquip])
      return { ...d, block:'起飞和降落时必须收起小桌板。',
               blockTr:'The tray table and seat back must stay secure for take-off and landing.' };
  }
  if (place === 'cabin' && th && th.exitPlane) {
    if (Cabin.phase() !== 'arrived')
      return { ...d, block:'舱门还没打开，请坐好。', blockTr:'The door is not open yet. Stay seated.' };
    if (Cabin.equipment().bag)
      return { ...d, block:'先从行李架上取手提行李。', blockTr:'Retrieve your carry-on first.' };
  }
  if (place === 'cabin' && th && th.cockpitView && !['gate','arrived'].includes(Cabin.phase()))
    return { ...d, zh:'看驾驶舱摄像头', py:'kàn jiàshǐcāng shèxiàngtóu', en:'open the flight-deck camera',
             block:null, cockpitView:true };
  // ---- on the train. A seat sits you in the seat you walked up to, and a door only opens if it
  // is on the side this station opens on — which is the whole reason the announcement says so.
  if (th && th.seat) return { ...d, pose: { ...d.pose, ...th.seat } };
  if (d.alight) {
    if (!ride) return { ...d, block:'你不在车上。', blockTr:'You are not on a train.' };
    if (ride.state !== 'dwell' || ride.t < DOOR_SECS)
      return { ...d, zh:'等一下', py:'děng yíxià', en:'the train is still moving',
               block:'车还没停呢，别扒门。',
               blockTr:'The train has not stopped. Do not force the doors.' };
    if (th && th.side !== undefined && th.side !== Train.SIDES[ride.at])
      return { ...d, zh:'这边不开', py:'zhè biān bù kāi', en:'these doors stay shut here',
               block:`这边不开门，请从${alightingSide()}边下车。`,
               blockTr:`These doors do not open at this station — cross to the other side.` };
    const s = Metro.STATIONS[ride.at];
    return { ...d, en:`get off at ${s.en}`,
             done:`${s.hz}，我到了。`, doneTr:`${s.en}. This is where I get off.` };
  }
  if (hz === '灯') return roomLit(place, room) ? { ...d, zh:'关灯', py:'guān dēng' } : d;
  if (hz === '窗户' && latched.window)
    return { ...d, zh:'关窗户', py:'guān chuānghu', en:'close the window' };
  if (hz === '窗帘' && latched.curtainL)
    return { ...d, zh:'拉开窗帘', py:'lākāi chuānglián', en:'open the curtains' };
  // Everything in the living loop that reads state before it can say what the verb is: the wake
  // time, the hot water, the wash, the rack, the dust, the bills, the post. A sink with washing up
  // in it is a different job from rinsing your hands, and it is one of twenty of them.
  const home = flatLabel(d, hz);
  if (home) return home;

  // ---- with a bag in your hand the flat changes what its furniture is for. The desk stops
  // being a drawer to rummage in and becomes somewhere to put the bag down; the fridge stops
  // being where dinner comes from and becomes where dinner goes.
  if (carrying) {
    if (hz === '冰箱')
      return { ...d, zh:'放进冰箱', py:'fàngjìn bīngxiāng',
               en:`put the ${enOf(carrying.item)} away`, secs:2.4, mins:4,
               stow:true, fridge:false, gain:{ mood:5 }, pose:{ type:'open' },
               done:'收好了，冰箱里有吃的了。',
               doneTr:'Put away. There is food in the fridge now.' };
    const i = World.BAG_SPOTS.findIndex(s => s.hz === hz);
    if (i >= 0) {
      const s = World.BAG_SPOTS[i];
      return { ...d, zh:`放在${hz}上`, py:`fàng zài ${s.py} shàng`,
               en:`set the bag down on ${s.en}`, secs:1.6, mins:1,
               put:i, gain:{}, pose:{ type:'crouch' },
               done:`袋子放在${hz}上了。`, doneTr:`The bag is on ${s.en}.` };
    }
  }
  // ---- 冰箱 and 厨房. One flag used to cover both of these — `food:1`, meaning "costs a meal" —
  // and now that the fridge holds named things instead of a number they are two different
  // questions with two different answers.
  //
  // The fridge is what you can eat *now*: bread, fruit, a pot of noodles, last night's 外卖 gone
  // cold. The kitchen is what you could make out of everything else, which is between twenty-five
  // minutes and an hour that you may well not have. Separating them is most of the point of the
  // pantry: a fridge with a chicken and a bag of rice in it is a full fridge and you still cannot
  // have dinner in five minutes. That is a position to be in at eleven at night, and it is one the
  // old integer could not represent — two meals were two meals whatever they were.
  if (d.fridge) {
    const got = Pantry.next(day);
    if (got)
      // Named, and dated. 快坏了 is the fridge doing you the courtesy a fridge does: the thing
      // nearest going off is the thing it offers you first, and it says so.
      return { ...d, zh:`吃${got.hz}`, py:`chī ${dictOf(got.hz).py}`,
               en:`eat the ${dictOf(got.hz).en}` +
                  (got.left !== null && got.left <= 1 ? ' — it is about to go off' : ''),
               eat:true, gain: got.gain,
               done: got.left !== null && got.left <= 1 ? '快坏了，赶紧吃了。' : '吃饱了。',
               doneTr: got.left !== null && got.left <= 1
                 ? 'Eaten, just in time.' : 'That hit the spot.' };
    // Nothing ready to eat. Whether that means "go shopping" or "go and cook" is the difference
    // the player most needs told, because they are two completely different evenings.
    const canCook = Pantry.cookable(day);
    if (canCook.length)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing in here you can just eat',
               block:'有菜，但是得做饭。', blockTr:'There is food, but it needs cooking.' };
    return { ...d, zh:'看看', py:'kànkan', en:'the fridge is empty',
             block:'冰箱空了，我得出门买东西。',
             blockTr:'The fridge is empty. I have to go out and buy food.' };
  }
  if (d.cook) {
    const can = Pantry.cookable(day);
    // A dish chosen at the panel a moment ago, re-checked rather than trusted: the clock runs
    // while a panel is open, and a cabbage can go off between choosing it and standing up. If it
    // did, this falls through to the list again, which is the honest thing to show.
    const picked = cooking && can.find(r => r.hz === cooking);
    if (picked)
      return { ...d, zh:`做${picked.hz}`, py:`zuò ${picked.py}`, en:`cook ${picked.en}`,
               cook:false, cookDo:picked.hz, mins:picked.mins,
               // An hour of 饺子 and twenty-five minutes of 汤 should not be the same five seconds
               // of standing at the stove, so the animation is scaled off the dish as well.
               secs: 3.6 + picked.mins / 22,
               gain: { ...picked.gain, clean:-6 },
               pose:{ type:'cook', hold:'ladle' },
               done:`${picked.hz}做好了，很好吃。`, doneTr:`${picked.en} — and it was good.` };
    if (!can.length)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing you have the ingredients for',
               block:'家里没什么可做的了。', blockTr:'There is nothing here to make.' };
    // The verb opens the list rather than cooking, because which of these you make is the actual
    // decision — 汤 is twenty-five minutes and 饺子 is an hour, and what you have is the time.
    return { ...d, zh:'做饭', py:'zuòfàn', cookPick:true, cook:false, gain:{}, secs:1.2, mins:1,
             en:`${can.length} 个菜 you could make`, pose:{ type:'stand' } };
  }
  // ---- the shop and the restaurant, where what the verb costs depends on the moment. `cost`
  // is what the prompt shows you before you commit; `block` is a reason you cannot, said in
  // the voice of whoever would say it to you.
  if (d.take) {
    // Both hands are already carrying you. Nothing comes off a shelf until there is a basket
    // on your arm to put it in, which is what the stack by the door is for.
    if (!basketHeld)
      return { ...d, zh:'先拿篮子', py:'xiān ná lánzi', en:'get a basket first', cost:0,
               block:'这么多东西拿不了，先去门口拿个篮子。',
               blockTr:'You cannot carry all that — take a basket from the door first.' };
    // 货架 and 冰柜 are furniture. What comes off them is whatever you reach for, so the verb
    // opens the shelf instead of deciding for you — and the panel it opens is ten Chinese words
    // with ten numbers beside them, which is the wall a price gets misread off.
    const onIt = Shop.SHELF[d.take];
    if (onIt)
      return { ...d, zh:'看看', py:'kànkan', take:null, shelfPick:d.take,
               en:`${onIt.length} things on it, from ¥${onIt[0].price}`,
               secs:1.6, mins:2, gain:{}, pose:{ type:'stand' } };
    const g = goodsFor(d.take);
    return { ...d, cost: g ? g.price : 0 };
  }
  if (d.till) {
    const n = basket.length, total = basketTotal();
    if (!n)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing to pay for yet',
               block:'您还没拿东西呢。', blockTr:'You have not picked anything up yet.' };
    return { ...d, pay: -total, en: `pay for ${n} ${n === 1 ? 'thing' : 'things'}`,
             done:`一共${total}块，谢谢。`, doneTr:`${total} kuai altogether. Thank you.` };
  }
  // The stack of baskets by the door is two verbs in one thing. Empty-handed it hands you a
  // basket; once one is on your arm the same basket is what you look into to see what you have.
  if (d.peek || (d.takeBasket && basketHeld)) {
    const look = { ...d, zh:'看篮子', py:'kàn lánzi', secs:1.4, mins:1,
                   takeBasket:false, pose:{ type:'stand' } };
    if (!basket.length)
      return { ...look, en:'your basket is empty',
               block:'篮子是空的。', blockTr:'The basket is empty.' };
    return { ...look, en:`${basket.length} in the basket, ¥${basketTotal()}`,
             done:`篮子里有${basketSay()}，一共${basketTotal()}块。`,
             doneTr:`In the basket: ${basket.map(g => g.hz).join(', ')}. ` +
                    `${basketTotal()} kuai altogether.` };
  }
  // The board and the waitress both open the same panel; which one you opened it from decides
  // whether confirming a line just settles what you fancy or actually orders it.
  if (d.menu) return { ...d, en:'read the board — 17 dishes' };
  if (d.orderUp) {
    if (order) {
      // Waiting for your food is the one moment in the diner when there is nothing to do, and the
      // waitress is standing right there — so if she has a question outstanding, this is where the
      // conversation happens. It could not happen anywhere before: her row carries `orderUp`, and
      // the talk branch in `stopUse` is gated on `!def.orderUp`, so every 说话 on the most
      // conversation-shaped person in the game routed into the ordering flow instead. Six barks,
      // five of them questions, in the room the player spends longest in, and none of it reachable.
      //
      // Dropping `orderUp` from the copy is the whole fix. `stopUse` then takes its ordinary talk
      // path and never reaches `if (def.orderUp) openMenu('order')`, so ordering is untouched:
      // with nothing on order the verb is still 点菜 and still hands you the board.
      if (th && th.npc && Talk.pending(th.npc))
        return { ...d, orderUp: false, talk: true, zh:'说话', py:'shuōhuà',
                 en:'talk to her while you wait', secs:2.8, mins:6, gain:{ mood:9 } };
      return { ...d, zh:'问一下', py:'wèn yíxià', en:'ask after your order',
               block: order.state === 'ready'
                 ? `您的${order.dish.hz}已经上桌了。` : `${order.dish.hz}马上就来。`,
               blockTr: order.state === 'ready'
                 ? `Your ${order.dish.en} is already on the table.`
                 : `Your ${order.dish.en} is on its way.` };
    }
    return { ...d, en:'order — she hands you the menu' };
  }
  // The table. Sitting down, waiting for the food and eating it are the same verb from the
  // player's side and the same seat from the body's — you stay on the stool through all three.
  if (d.eat) {
    const seat = { type:'sit', at: Diner.SEAT_AT, yaw: Diner.SEAT_FACE, seatY: Diner.SEAT_Y };
    if (!order)
      return { ...d, secs:2.6, mins:8, gain:{ rest:6, mood:5 }, pose: seat,
               en:'sit down at the table',
               done:'坐下了。看看菜单，然后去点菜。',
               doneTr:'Sat down. Read the board, then go and order.' };
    if (order.state !== 'ready')
      return { ...d, zh:'等一下', py:'děng yíxià', secs:2.2, mins:5,
               en: order.state === 'coming' ? `your ${order.dish.en} is coming over`
                                            : `wait for the ${order.dish.en}`,
               gain:{ rest:3, mood:2 }, pose: seat,
               done:'还没上呢，再等等。', doneTr:'Not out yet. A moment longer.' };
    const dish = order.dish, drink = dish.kind === 'bottle';
    return { ...d, zh:`${drink ? '喝' : '吃'}${dish.hz}`,
             py: (drink ? 'hē ' : 'chī ') + dish.py,
             en:`${drink ? 'drink' : 'eat'} the ${dish.en}`,
             secs: dish.secs, mins: dish.mins, gain: dish.gain,
             // Same seat, but now the arms are the meal rather than resting on the thighs.
             pose: { ...seat, type: drink ? 'drink' : 'eat', hold: drink ? 'cup' : 'meal' },
             done: dish.done, doneTr: dish.doneTr };
  }
  // Opening hours, for the doors that have them and for the desk nobody will pay you to sit at
  // at four in the morning.
  if (d.open) {
    const h = minutes / 60;
    // A closing hour past midnight is written past 24 — the night market is [19, 26], open at
    // seven and shut at two — so the window wraps. Written as a straight `h < a || h >= b` this
    // shut the market for the two hours it is at its busiest, because 00:30 is less than 19.
    const [a, b] = d.open;
    const shut = b > 24 ? (h >= b - 24 && h < a) : (h < a || h >= b);
    if (shut) return { ...d, block:'关门了，明天再来吧。', blockTr:'Shut. Come back tomorrow.' };
  }
  // The desk does whatever the board assigned you, and nothing at all if it assigned you nothing.
  if (d.shift) {
    const h = minutes / 60;
    if (!job)
      return { ...d, zh:'看看', py:'kànkan', en:'nothing assigned yet',
               block:'先去白板上领个活儿。',
               blockTr:'Take a job off the whiteboard first.' };
    if (h < job.h0 || h >= job.h1)
      return { ...d, block:`${job.hz}不是现在的活儿。`,
               blockTr:`${job.en} is not on the clock right now.` };
    // What the board offers is what an intern is paid for it. Everybody above that is paid a
    // multiple of it, which is the only way a promotion is felt rather than announced.
    return { ...d, zh: job.hz, py: job.py, en: job.en, pay: Career.pay(job.pay),
             secs: job.secs, mins: job.mins, gain: job.gain,
             // Seated at your own desk for it, not standing over the keyboard.
             pose: { type:'type', at: officeSuiteAt(Office.SEAT_AT), yaw: Office.SEAT_FACE,
                     seatY: Office.SEAT_Y },
             done: job.done, doneTr: job.doneTr };
  }
  if (d.meet) {
    const h = minutes / 60;
    if (h < 9 || h >= 19)
      return { ...d, block:'没人开会，都下班了。',
               blockTr:'Nobody to meet. They have all gone home.' };
    return { ...d, pose: { type:'talk', at: officeSuiteAt(Office.MEET_AT), yaw: Office.MEET_FACE,
                           seatY: Office.MEET_Y } };
  }
  // 打卡 once a day, and worth something only if you are on time. What it is worth now depends on
  // the rank and on the run of mornings behind it — see Career.clockIn — so the twentieth on-time
  // morning in a row pays better than the first, which is the whole argument for setting an alarm.
  if (d.punch) {
    if (clockedDay === day)
      return { ...d, zh:'看看', py:'kànkan', en:'already clocked in today',
               block:'今天打过卡了。', blockTr:"You've already clocked in today." };
    const early = minutes / 60 < Career.ON_TIME;
    const workday = Career.isWorkday(day);
    // The card punch on a Saturday is not attendance, it is you letting yourself in.
    if (!workday)
      return { ...d, pay: 0, en: 'clock in — the weekend',
               done: '周末打卡，没人给你算工资。',
               doneTr: 'Clocking in at the weekend. Nobody is paying you for this.' };
    return { ...d, pay: Career.punchWorth(!early),
             en: early ? 'clock in — on time' : 'clock in — late',
             done: early ? '按时打卡。' : '迟到了，没有全勤。',
             doneTr: early ? 'On time.' : 'Late. No attendance bonus today.' };
  }
  // ---- the subway. The gate reads which side of itself you are standing on: in needs a ticket,
  // out is free, and either way it is the gate that moves you across the line, not your legs.
  if (d.gate) {
    // ---- 出站, on the way out. A single is surrendered at the station it was bought for and
    // topped up anywhere else; the card is charged the exact fare here and nowhere else.
    if (pastGateNow()) {
      const f = exitFare();
      if (!f)
        return { ...d, zh:'出站', py:'chū zhàn', en:'nothing to tap out with',
                 block:'没票也没卡，出不去。',
                 blockTr:'No ticket and no card. The gate will not open.' };
      if (f.kind === 'card')
        return { ...d, zh:'刷卡出站', py:'shuā kǎ chū zhàn',
                 en:`tap out — ¥${f.owed} off the card, ¥${card.bal} on it`,
                 card:-f.owed, gate:'out',
                 done:`扣了${f.owed}块，余额${card.bal - f.owed}。`,
                 doneTr:`¥${f.owed} off. ¥${card.bal - f.owed} left on the card.` };
      if (f.owed <= 0)
        return { ...d, zh:'出站', py:'chū zhàn', en:'tap out — the gate keeps the ticket',
                 gate:'out', eatTicket:true,
                 done:'票被闸机收走了。', doneTr:'The gate swallows the ticket.' };
      if (money < f.owed)
        return { ...d, zh:'补票', py:'bǔ piào', en:`you owe ¥${f.owed} and cannot pay it`,
                 block:`票不够，得补${f.owed}块。坐回${ticket.to}也行。`,
                 blockTr:`Your ticket is short by ¥${f.owed}. Or ride back to ${ticket.to}.` };
      return { ...d, zh:'补票', py:'bǔ piào', en:`pay the ¥${f.owed} difference and go out`,
               pay:-f.owed, gate:'out', eatTicket:true,
               done:`补了${f.owed}块，出站。`, doneTr:`Paid the ¥${f.owed} difference. Out.` };
    }
    // ---- 进站, on the way in. Nothing is charged here: the single is already paid for and the
    // card is charged on the way out, so a tap that you then walk away from costs you nothing.
    if (ticket)
      return { ...d, zh:'刷票进站', py:'shuā piào jìn zhàn', gate:'in',
               en:`tap in on the single to ${ticket.to}`,
               done:'闸机开了，进站。', doneTr:'The flaps open. Through you go.' };
    if (card) {
      const need = fareFor(FARES.length) - CARD_OFF;
      if (card.bal < need)
        return { ...d, zh:'进站', py:'jìn zhàn', en:`card is short — ¥${card.bal} on it`,
                 block:`余额不足，先去充值。`,
                 blockTr:`Not enough on the card. Top it up at the machine.` };
      return { ...d, zh:'刷卡进站', py:'shuā kǎ jìn zhàn', gate:'in',
               en:`tap in — ¥${card.bal} on the card`,
               done:'滴——闸机开了。', doneTr:'Beep. The flaps open.' };
    }
    return { ...d, zh:'进站', py:'jìn zhàn', en:'you need a ticket or a card',
             block:'先去售票机买票。', blockTr:'Buy a ticket from the machine first.' };
  }
  // The window tells you where you are and what it would cost you to be somewhere else. It is the
  // only thing in the station that knows about your ticket and says so out loud.
  if (d.askDesk) {
    const own = ticket ? `我有一张到${ticket.to}的单程票。`
      : card ? `我有交通卡，余额${card.bal}块。` : '我还没买票。';
    const tr = ticket ? `You have a single to ${ticket.to}.`
      : card ? `You have a card with ¥${card.bal} on it.` : 'You have nothing to travel on.';
    return { ...d, done: `这是${station}站。${own}`,
             doneTr: `This is ${Metro.stationAt().en}. ${tr}` };
  }
  // ---- 上车. There is a timetable now, so there is not always a train: the board over the screen
  // doors says when the next one is due and this refuses until it is actually standing there. The
  // minutes come off the same `trainAt` that places the car, so the refusal can never disagree with
  // what you can see through the glass.
  if (d.ride) {
    const tr = Metro.trainNow();
    if (!Metro.trainHere()) {
      const mins = Math.max(1, Math.ceil(tr.toGo));
      return { ...d, zh:'等车', py:'děng chē', en:`no train yet — the next is in ${mins} min`,
               block: tr.toGo < 1 ? '列车进站了，等门开。' : `车还没到，还有${mins}分钟。`,
               blockTr: tr.toGo < 1 ? 'It is coming in. Wait for the doors.'
                                    : `No train yet. ${mins} minutes until the next one.` };
    }
    return { ...d, en:`take the subway — you are at ${Metro.stationAt().en}` };
  }
  // The two refusals out at the railway station. You can stand in it and read every word in
  // it and you cannot get on anything, because there is no train in this game to get on.
  if (d.sellout)
    return { ...d, block:'今天的票都卖完了，明天早点来。',
             blockTr:"Today's tickets are all sold. Come earlier tomorrow." };
  if (d.needTicket)
    return { ...d, block:'没有火车票，进不去。',
             blockTr:'No train ticket, no getting through.' };

  // ---- 机场. Six verbs in a chain, and every one of them is the same question asked twice:
  // what are you holding, and what does the clock say about it. The answers all come out of
  // the schedule the departure board is drawing from, so the sign above your head and the
  // person in front of you can never disagree.
  if (d.flights) {
    if (flight)
      return { ...d, zh:'看看机票', py:'kànkan jīpiào',
               en:`you are already holding ${flight.f.no} to ${flight.f.en}`,
               done:`我买好了，${flight.f.no}，${hhmm(depOf(flight.f))}的。`,
               doneTr:`${flight.f.no} to ${flight.f.en}, ${hhmm(depOf(flight.f))}. Bought.` };
    const cheap = FL().reduce((a, f) => f.price < a.price ? f : a);
    return { ...d, en:`buy a plane ticket — from ¥${cheap.price}` };
  }
  if (d.checkin) {
    if (!flight)
      return { ...d, block:'我还没买机票呢，得先去售票处。',
               blockTr:'No ticket yet. The ticket office is back down the hall.' };
    const f = flight.f, st = Airport.statusOf(f, minutes);
    // Looking at the card you are already holding. It has your seat on it and it does not have
    // your gate on it, and saying otherwise here would hand back for free the one piece of
    // information the whole listening mechanic is built on withholding.
    if (flight.checked)
      return { ...d, zh:'看看登机牌', py:'kànkan dēngjīpái',
               en: knowsGate()
                 ? `checked in already — seat ${flight.seat}, gate ${gateNow(f)}`
                 : `checked in already — seat ${flight.seat}, gate as announced`,
               done: knowsGate()
                 ? `办好了，${flight.seat}，${gateNow(f)}登机口。`
                 : `办好了，${flight.seat}。登机口以广播为准。`,
               doneTr: knowsGate()
                 ? `Seat ${flight.seat}, gate ${gateNow(f)}.`
                 : `Seat ${flight.seat}. The gate will be announced.` };
    if (st.code === 'gone' || st.code === 'off')
      return { ...d, block:`${f.no}已经飞走了。`,
               blockTr:`${f.no} has gone. That ticket is waste paper.` };
    if (minutes > depOf(f) - Airport.SHUT_CK)
      return { ...d, block:'值机已经截止了，办不了。',
               blockTr:'Check-in has closed for that flight.' };
    if (minutes < depOf(f) - Airport.OPEN_CK)
      return { ...d, block:`太早了，${hhmm(depOf(f) - Airport.OPEN_CK)}才开始办。`,
               blockTr:`Too early. This flight opens at ` +
                       `${hhmm(depOf(f) - Airport.OPEN_CK)}.` };
    // The machine is quicker and gives you whatever is left, which is always a middle seat.
    // The desk is slower and asks. That is the entire argument for queueing.
    if (d.kiosk)
      return { ...d, en:`print a card for ${f.no} — whatever seat is left, and no queue`,
               done:'机器给了个中间的座位。', doneTr:'The machine gives you a middle seat.' };
    const q = Airport.queueMins('checkin', minutes);
    return { ...d, mins: q,
             en:`check in for ${f.no} to ${f.en} — it will ask about the seat · 排队 ~${q} min` };
  }
  if (d.bagdrop) {
    if (!flight || !flight.checked)
      return { ...d, block:'先办登机手续，再托运。',
               blockTr:'Check in first, then the bag goes on the belt.' };
    if (flight.bag)
      return { ...d, zh:'看行李', py:'kàn xíngli', en:'your case has already gone through',
               done:'行李已经进去了，直挂' + flight.f.to + '。',
               doneTr:`Your case has gone. Checked through to ${flight.f.en}.` };
    return { ...d, en:`check the case through to ${flight.f.en}` };
  }
  if (d.security) {
    if (!flight)
      return { ...d, block:'我还没买机票呢。',
               blockTr:'I have not bought a plane ticket yet.' };
    if (!flight.checked)
      return { ...d, block:'没有登机牌，过不去。',
               blockTr:'No boarding card, no getting through.' };
    const f = flight.f, st = Airport.statusOf(f, minutes);
    if (st.code === 'gone' || st.code === 'off')
      return { ...d, block:`${f.no}已经起飞了。`, blockTr:`${f.no} has already gone.` };
    if (st.code === 'shut')
      return { ...d, block:'您这班已经停止登机了，过去也来不及。',
               blockTr:'Your gate has closed. There would be no point.' };
    // How long the channel is taking at this minute, which is the number that decides whether you
    // have time for a coffee. It is also the number that will make you miss the flight.
    const q = Airport.queueMins('security', minutes);
    return { ...d, mins: q,
             en: (knowsGate() ? `through to the gates — ${gateNow(f)}` : 'through to the gates')
               + ` · 排队 ~${q} min · boarding ${hhmm(depOf(f) - Airport.CALL)}` };
  }
  if (d.boardPlane) {
    if (!flight || !flight.checked)
      return { ...d, zh:'看看登机口', py:'kànkan dēngjīkǒu',
               en:'nothing of yours goes from here',
               block:'我没有登机牌。', blockTr:'You have no boarding card.' };
    const f = flight.f, st = Airport.statusOf(f, minutes);
    if (st.code === 'gone' || st.code === 'off')
      return { ...d, block:`${f.no}已经起飞了。`, blockTr:`${f.no} has gone without you.` };
    if (st.code === 'shut')
      return { ...d, block:'登机口关闭了，来晚了。',
               blockTr:'The gate is closed. You left it too late.' };
    if (st.code !== 'board')
      return { ...d, zh:'等登机', py:'děng dēngjī',
               en:`boarding at ${hhmm(depOf(f) - Airport.CALL)} — ${st.en}`,
               block:`还没开始登机，${hhmm(depOf(f) - Airport.CALL)}才叫。`,
               blockTr:`Not boarding yet. They call it at ` +
                       `${hhmm(depOf(f) - Airport.CALL)}.` };
    // The one refusal in this building that is about understanding rather than about paperwork.
    // The agent is not being difficult: your card says 登机口以广播为准 and she is asking you what
    // the broadcast said. Press G to hear it again, look at the board, or go and ask the desk.
    if (!knowsGate())
      return { ...d, zh:'哪个登机口？', py:'nǎge dēngjīkǒu',
               en:'she wants to know which gate — listen (G), read the board, or ask the desk',
               block:'您的登机口是哪个？登机牌上没写，请听广播。',
               blockTr:'Which gate are you? It is not on the card — it was announced.' };
    return { ...d, en:`board ${f.no} to ${f.en} — seat ${flight.seat}, gate ${gateNow(f)}` };
  }
  // The desk that knows what you are holding and says so out loud, which is the only thing in
  // the hall that will tell you what to do next.
  if (d.askAir) {
    const now = `现在${hhmm(minutes)}。`;
    if (!flight)
      return { ...d, done: now + '您得先去售票处买票。',
               doneTr: `It is ${hhmm(minutes)}. Buy a ticket at the 售票处 first.` };
    const f = flight.f, st = Airport.statusOf(f, minutes);
    if (!flight.checked)
      return { ...d, done: `${f.no}，${hhmm(depOf(f))}起飞，${st.zh}。请去值机柜台。`,
               doneTr: `${f.no} at ${hhmm(depOf(f))} — ${st.en}. Check in at the desks.` };
    // Saying it out loud is how you learn it, so the finishing of this action is what sets
    // what you know — see the `askAir` branch in `stopUse`. Slower than listening, and it costs
    // a walk to the far end of the hall, which is the trade the three routes are meant to be.
    return { ...d, done: `${f.no}，${gateNow(f)}登机口，${flight.seat}，${st.zh}。`,
             doneTr: `${f.no}, gate ${gateNow(f)}, seat ${flight.seat} — ${st.en}.` };
  }
  if (d.depBoard) {
    // With a ticket in your pocket the board is not scenery, it is the answer to the question you
    // are standing there with. It gives you the gate — slower than hearing it called and without
    // the satisfaction, but a board is what a board is for.
    if (flight && flight.checked && !knowsGate()) {
      const f = flight.f, st = Airport.statusOf(f, minutes);
      return { ...d, zh:'看航班信息', py:'kàn hángbān xìnxī',
               en:`find your flight on the board — ${f.no}`,
               done:`${f.no}，${f.to}，${gateNow(f)}登机口，${st.zh}。`,
               doneTr:`${f.no} to ${f.en} — gate ${gateNow(f)}, ${st.en}.` };
    }
    const next = Airport.nextFlight(minutes);
    const st = Airport.statusOf(next, minutes);
    const bad = FL().filter(f => f.cancelled || f.late).length;
    return { ...d, en:`read the departures — ${next.no} to ${next.en} is next, ${st.en}`
                     + (bad ? ` · ${bad} disrupted today` : ''),
             done: bad ? `今天不少航班${FL().some(f => f.cancelled) ? '取消' : '延误'}了。`
                       : `${next.to}${next.to === '纽约' ? '' : '、纽约'}、东京、曼谷。总有一天。`,
             doneTr: bad ? `A lot of flights are in trouble today.`
                         : `${next.en}, New York, Tokyo, Bangkok. One of these days.` };
  }
  if (d.duty) {
    const can = Airport.DUTY.filter(g => money >= g.price).length;
    return { ...d, en: can ? `look round duty free — ${can} of ${Airport.DUTY.length} ` +
                             `within reach` : 'look round duty free — nothing you can afford' };
  }
  // ---- 外滩. Three of these are the trip rather than the view: somewhere to sleep, the office
  // that confirms you are still on the flight home, and the coach that takes you to it.
  if (d.hotel) {
    // A room is what the room costs. 和平饭店 is a tourist rate on the Bund; a 客栈 off a
    // courtyard in 宽窄巷子 is not, and having the price and the room's own description live on
    // the USE row rather than here is what stops the second city being the first one relabelled.
    const price = d.price || HOTEL;
    if (money < price)
      return { ...d, en:`a room is ¥${price} and you have ¥${Math.floor(money)}`,
               block:`一晚上${price}，我住不起。`,
               blockTr:`¥${price} a night. You cannot afford it — it is a bench tonight.` };
    const till = wakeAt() - clockNow();
    return { ...d, pay:-price, mins: till,
             en:`¥${price} for the night — you would wake at 08:00`,
             done:`${price}块一晚，${d.bed || '房间在六楼，看得见江。'}`,
             doneTr:`¥${price}. ${d.bedTr || 'Sixth floor, and it looks out over the river.'}` };
  }
  if (d.reconfirm) {
    if (!trip)
      return { ...d, block:'我没有回程要确认。', blockTr:'You have no return to reconfirm.' };
    const when = `${trip.back >= (day + 1) * 1440 ? '明天' : '今天'}${hhmm(trip.back)}`;
    if (trip.confirmed)
      return { ...d, zh:'再问一遍', py:'zài wèn yí biàn', en:'already reconfirmed',
               done:`确认过了，${when}的${trip.f.no}。`,
               doneTr:`Already done. ${trip.f.no}, ${hhmm(trip.back)}.` };
    return { ...d, en:`reconfirm ${trip.f.no} home — ${hhmm(trip.back)}`,
             done:`确认好了，${when}的飞机，提前两小时到。`,
             doneTr:`Confirmed. ${hhmm(trip.back)}, and be there two hours before.` };
  }
  if (d.goHome) {
    if (!trip)
      return { ...d, block:'我没有回程票。', blockTr:'You have no ticket home.' };
    const left = trip.back - COACH - clockNow();
    if (left > 60)
      return { ...d, zh:'看班次', py:'kàn bāncì', en:`your flight is at ${hhmm(trip.back)}`,
               block:`回程是${trip.back >= (day + 1) * 1440 ? '明天' : '今天'}` +
                     `${hhmm(trip.back)}的，还早。`,
               blockTr:`Not yet — the flight home is at ${hhmm(trip.back)}. ` +
                       `The coach takes ninety minutes.` };
    if (left < -180)
      return { ...d, zh:'改签', py:'gǎiqiān', en:'you missed it — they put you on the next one',
               pay:-CHANGE, home:true, gain:{ mood:-24 },
               done:`赶不上了，改签了下一班，罚了${CHANGE}块。`,
               doneTr:`Missed it. They rebooked you on the next one and charged ¥${CHANGE}.` };
    return { ...d, home:true, en:`the coach to the airport — ${trip.f.no} at ` +
                                 `${hhmm(trip.back)}`,
             done:'上车了，一个半小时到机场。',
             doneTr:'On the coach. Ninety minutes to the airport.' };
  }
  if (d.bundClock)
    return { ...d, done:`海关钟楼，${hhmm(minutes)}。`,
             doneTr:`The customs clock says ${hhmm(minutes)}.` };
  // 洗手间 is a doorway at home, with a 马桶 of its own behind it to walk to, and a thing you simply
  // use where the room behind the door is not modelled. Written as the set of places that have the
  // second kind, because it was written as `place !== 'airport'` and the aeroplane then grew two
  // lavatories that could not be used: the state was right, the sign was right, both refusals were
  // right, and walking up to a free one produced no prompt at all.
  if (hz === '洗手间' && !['airport','cabin','mall','hospital','hospital2','hospital3','hospital4'].includes(place)) return null;
  // A coffee is a coffee; a coffee airside is thirty-eight kuai.
  if (hz === '咖啡' && place === 'airport')
    return { ...d, pay:-38, mins:16, en:'a coffee, at airport prices',
             gain:{ rest:10, mood:9 },
             done:'三十八块一杯，喝得很慢。',
             doneTr:'Thirty-eight kuai a cup. You drink it slowly.' };
  // The rider is only ever standing in your doorway because there is something in his hand to
  // pay for. What he is owed is the price plus the fee, and he says the dish's name as he goes.
  if (d.payRider) {
    if (!delivery || delivery.state !== 'door')
      return { ...d, zh:'说话', py:'shuōhuà', en:'nothing to settle up',
               block:'不用了，谢谢。', blockTr:'Nothing to pay for. He waves you off.' };
    const it = delivery.item;
    return { ...d, pay: -delivery.total,
             en: `pay ¥${delivery.total} and take the ${enOf(it)}`,
             done: `您的${it.hz}，谢谢！`, doneTr: `Your ${enOf(it)}. Thank you!` };
  }
  // Somebody is knocking. Opening your own front door and going out through it are the same
  // door and two different verbs, and while a rider is on the landing it is the first one.
  if (hz === '门' && place === 'home' && World.level() === 2 &&
      delivery && delivery.state === 'knock')
    return { ...d, zh:'开门', py:'kāimén', en:'answer the door', secs:1.8, mins:2,
             answer:true, go:null, gain:{ mood:3 },
             done:'来了来了！', doneTr:'Coming, coming!' };
  // This is now a physical passage rather than a travel shortcut. Once opened it stays open long
  // enough to walk through, so the same fixture must also offer the honest inverse action.
  if (hz === '门' && place === 'home' && World.level() === 2 && latched.frontdoor > .5)
    return { ...d, zh:'关门', py:'guān mén', en:'close your front door',
             done:'门关好了。', doneTr:'The door is shut.' };
  // Leaving a station is 出站, not 出门. Same door, different word, and the word is the point.
  if (hz === '门' && place === 'metro')
    return { ...d, zh:'出站', py:'chū zhàn', en:'up the steps and out',
             done:'出站，回到地面上。', doneTr:'Out of the station and back up top.' };
  // The cashier has been watching you the whole time.
  if (hz === '门' && place === 'shop' && basket.length)
    return { ...d, block:'您还没交钱呢！', blockTr:"You haven't paid yet!" };
  return d;
}

function startUse(th) {
  if (!th || cardOpen || talkOpen || Pick.isOpen) return;
  if (doing && doing.preview) clearCharacterPreview();
  const def = useLabel(th.hz, th);
  if (!def) return;
  if (!inReach(th)) { toast(`太远了 · <span class="dim">too far — walk over to it</span>`); return; }
  // A new order replaces the current one; asking for the same thing again is ignored.
  if (doing) {
    if (doing.th === th) return;
    stopUse(false);
  }
  // The fridge used to refuse here, on `stock <= 0`. It refuses in useLabel now, as a `block` like
  // every other refusal in the game — which means the walk-up prompt says so before you press the
  // key, instead of the key being the way you find out.
  //
  // Somebody's reason you cannot do this: the cashier at the door, the waitress when you sit
  // down without ordering, the shut office. Said rather than beeped.
  if (def.block) { say(def.block, def.blockTr); return; }
  if (def.pay < 0 && money < -def.pay) {
    say(`不够，我只有${Math.floor(money)}块。`,
        `Not enough — I only have ${Math.floor(money)} kuai.`);
    return;
  }
  doing = { def, th, t: 0 };
  act = { ...def.pose, hz: th.hz, target: th.pos,
          kind: actionKind(def.pose, def, th), startedAt: performance.now() };
  // Into the seat, not beside it. A seat's `at` and `yaw` have been carried on the thing all along —
  // see `th.seat` in cabin.js — and nothing has ever read them, so sitting down put you on the
  // carpet in the aisle in a sitting position with the chair next to you. Scoped to the aeroplane
  // because that is the room where it has been verified; the other seats in the game still sit you
  // where you stand, which is wrong too but is a separate change with its own scenes to check.
  if (def.cabinSit && act.at) {
    P.vx = P.vz = 0; P.speed = 0; P.ground = 0;
    const seatAt = [act.at[0], act.at[1]];
    const seatYaw = act.yaw === undefined ? P.yaw : act.yaw;
    // Set from the first frame of lowering yourself in, not from the end of it, so the camera swings
    // out to the aisle as you sit rather than jumping there 2.4 seconds later.
    const st = Cabin.seatOf(th.cabinSeat);
    sitting = { hz: th.hz, at: seatAt, yaw: seatYaw, aisle: st ? st.aisle : seatAt[0],
                // What the camera was doing before, so standing up gives it back rather than
                // leaving the room permanently on the seated framing.
                was: { pitch: CAM.tPitch, dist: CAM.tDist, lookY: CAM.lookY, yaw: CAM.tYaw } };
    // Closer and higher than the walking camera, and turned round to look back at you.
    //
    // Behind is not an option in here. A seated body's head reaches about 1.30 m, the seat backs top
    // out at 1.34 and the marked crown on your own seat stands proud of that, so a camera anywhere
    // behind a seated passenger is looking at the back of their chair — you cannot see a seated person
    // through their own seat, and a third-person view that never shows you is not one. Turned to the
    // front it looks back up the cabin at your face, which is also the shot you would choose.
    //
    // Safe in both directions only because the orbit centre is the aisle: 1.9 m forward of a seat is
    // the row in front, but 1.9 m forward along the aisle is clear floor.
    CAM.tPitch = .30; CAM.tDist = 1.9; CAM.lookY = 1.24;
    CAM.tYaw = seatYaw + Math.PI;
  }
  // Doing anything else gets you out of the chair, so the seated state and the pose cannot disagree:
  // `act` belongs to the new action from here on.
  if (sitting && !def.cabinSit) {
    if(sitting.stand){P.x=sitting.stand[0];P.z=sitting.stand[1];P.vx=P.vz=0;P.speed=0;P.ground=0;}
    sitting = null;
  }
  $('#doing .dz').textContent = def.zh;
  $('#doing .dp').textContent = def.py + ' · ' + def.en;
  $('#doing').classList.add('on');
  if (def.mallRide || def.mallLift) TrainAudio.mallCue('elevator');
  // The thumb landing on the button, at the moment it lands rather than when the verb finishes —
  // a click you hear two seconds after you pressed something is not a click, it is a reply.
  if (def.liftCall || def.liftPanel || def.mallLift || def.hotelFloors || def.officeFloors)
    TrainAudio.liftCue('press');
  Vocab.sentenceHTML(def.zh);        // using a thing is exposure to its verb
}

function stopUse(finished) {
  if (!doing) return;
  const { def, th } = doing;
  const endedKind = act ? (act.kind || actionKind(act, def, th)) : null;
  // Mall chairs carry their authored sitting point on the action pose. Keep only the geometry of
  // that pose once the timed action has finished: the tray has been eaten and the film action is
  // over, but the person is still in the chair until they press a movement key to stand up.
  // Captured before `act` is cleared (and before any action can change floors) so even a test that
  // completes the interaction in one tick lands on the exact physical seat.
  const mallSeat = finished && place === 'mall' && act && act.at &&
    ['sit', 'eat', 'drink'].includes(act.type)
    ? { at:[act.at[0], act.at[1]], yaw:act.yaw,
        seatY:act.seatY === undefined ? .50 : act.seatY }
    : null;
  const localSeat=finished&&(place==='zoo'||place==='zoo_tropical')&&th.seat&&act&&act.at&&
    act.type==='sit'?{at:[act.at[0],act.at[1]],yaw:act.yaw,
      seatY:act.seatY===undefined?.48:act.seatY,stand:(th.stand||th.focus).slice()}:null;
  const fix = FIXTURE[th.hz];
  let spoke = null;             // [zh, tr] if a person answered you, which replaces the message
  if (def.mallRide) {
    const q = Mall.escalatorPose(def.mallRide, finished ? 1 : 0, def.mallBank);
    P.x=q.x; P.z=q.z; P.lift=q.lift; P.yaw=q.yaw;
    Mall.setFloor(Mall.rideFloor(def.mallBank, def.mallRide, finished));
    CAM.fx=P.x; CAM.fz=P.z;
  }
  doing = null; act = null;
  if (mallSeat) {
    P.x = mallSeat.at[0]; P.z = mallSeat.at[1];
    P.vx = P.vz = 0; P.speed = 0; P.ground = 0;
    if (mallSeat.yaw !== undefined) P.yaw = mallSeat.yaw;
    const pose = { type:'sit', at:[P.x, P.z], yaw:P.yaw, seatY:mallSeat.seatY };
    sitting = { hz:th.hz, at:[P.x, P.z], yaw:P.yaw, aisle:P.x,
                mall:true, pose };
  }
  if(localSeat){
    P.x=localSeat.at[0];P.z=localSeat.at[1];P.vx=P.vz=0;P.speed=0;P.ground=0;
    if(localSeat.yaw!==undefined)P.yaw=localSeat.yaw;
    const pose={type:'sit',at:[P.x,P.z],yaw:P.yaw,seatY:localSeat.seatY};
    sitting={hz:th.hz,at:[P.x,P.z],yaw:P.yaw,aisle:P.x,local:true,
      stand:localSeat.stand,pose};
  }
  if (finished && endedKind === 'sleep') wakeMotionAt = performance.now();
  // Interrupted halfway into the chair — you never sat down, so you are not sitting.
  if (!finished && def.cabinSit) sitting = null;
  // A window or curtain you have moved stays where you put it. The one physical front door is
  // also a toggle now that walking through it replaces teleporting, but only flat 202 owns that
  // fixture: knocking on an upper-floor neighbour must not open this leaf several decks below.
  const latchHere = fix && (fix.latch ||
    (fix.homeLatch && place === 'home' && World.level() === 2));
  if (finished && latchHere) for (const k of fix.on) latched[k] = latched[k] ? 0 : 1;
  if (finished) {
    if (def.studentId) {
      const fresh = issueStudentId();
      spoke = fresh ? [def.done, def.doneTr] : [def.repeatDone, def.repeatDoneTr];
    }
    // ---- the lift. Pressing the landing button fetches the car and opens it; pressing 按钮 in
    // the car opens the floor panel again. Neither of them moves you: 走进去 does that, and
    // choosing the floor does the rest.
    if (def.liftCall) World.callLift();
    // ---- 爬楼梯 (items 250, 251). The stairs are the only way between decks that is not the car,
    // and they only exist as a way through on a day the car does not run. `stairTo` is set by
    // `useLabel`'s `d.stairs` branch, which has already charged the minutes and the rest per storey.
    if (def.stairTo !== undefined && World.setFloor) {
      World.setFloor(def.stairTo);
      // The body's height above the shell is not implied by the deck — the restore path at
      // js/game.js:12053-12054 sets both, and so must this, or you arrive on floor 2 standing at
      // the height of the lobby.
      P.lift = World.deckY(def.stairTo);
      toast(`${def.stairFloors}层 · <span class="dim">` +
            `${def.stairFloors} ${def.stairFloors === 1 ? 'storey' : 'storeys'} on foot</span>`);
    }
    if (def.liftPanel) openLiftPanel();
    if (def.mallLift) openMallLiftPanel();
    if (def.mallCinemaDoor) {
      Mall.setFloor(3);
      P.x=-17.10; P.z=7.80; P.lift=Mall.deckY(3); P.yaw=0;
      P.vx=P.vz=0; P.speed=0; P.ground=0;
      CAM.fx=P.x; CAM.fz=P.z; CAM.tYaw=P.yaw;
    }
    // Chores actually change the flat, and the flat is what makes them worth doing.
    // The sink and the smell come off `def.cookDo` further down, which is what actually made a
    // dish; this is only the packaging a cooking session generates either way.
    if (th.hz === '厨房') flat.trash = Math.min(1, flat.trash + 0.22);
    if (th.hz === '冰箱') flat.trash = Math.min(1, flat.trash + 0.10);
    // The sink empties by however much you actually did, not to zero from any starting point —
    // 饺子 for four and a bowl of soup no longer leave the same sink behind them.
    if (def.washUp) flat.dishes = 0;
    // Only the apartment bin empties the apartment's persistent rubbish meter. Public bins in
    // the zoo and Tropical House have their own local actions and must not clean the flat remotely.
    if (place === 'home' && th.hz === '垃圾桶') flat.trash = 0;
    if (th.hz === '植物') flat.dry = 0;
    // Take the next shirt off the rail and hang up the one you had on — and the one that came off
    // goes on the pile, which is where laundry comes from.
    if (def.wear) { wearFromRail(flat.outfit++ % (World.rail ? World.rail.length : 1)); HomeLife.wore(flat); }

    // ---- the living loop. Each of these is the other half of a `flatLabel` branch: the label
    // said what the verb was going to do and this is it doing it.
    if (def.alarmTo !== undefined) HomeLife.setAlarm(def.alarmTo === 'off' ? null : def.alarmTo);
    if (def.heaterTo !== undefined) HomeLife.toggleHeater();
    if (def.fanTo !== undefined) HomeLife.toggleFan();
    if (def.teeth) {
      const b = HomeLife.brush(day);
      if (b.ok && !b.left) toast('刷完了 · <span class="dim">that is twice today</span>');
    }
    // Rice goes on and you go and do something else, which is the only thing in the kitchen that
    // is not a forty-minute block of standing still.
    if (def.riceOn && HomeLife.drawOne('米', day)) HomeLife.riceOn(day, minutes);
    if (def.riceTake) HomeLife.riceTake(day, minutes);
    if (def.prepDo) { HomeLife.prepFor(def.prepDo, day); cooking = null; }
    if (def.noodles) HomeLife.noodle(day);
    // A dish that leaves with you. `stow` on a headword the shop does not sell returns having
    // added nothing, so an unknown product would be a silent no-op — 剩菜 is still lane 3's
    // `PRODUCTS` row (item 216). Until it lands, the portion is a HomeLife leftover, which is dated
    // and goes off in the same way. Never nothing.
    if (def.pantryAdd) {
      const p = def.pantryAdd;
      if (Pantry.product(p.hz)) stow(p.hz, p.qty || 1);
      else HomeLife.keepLeftovers(p.hz, p.en || 'the dish you were taught', day, 60);
    }
    // The wash, the rack, and the mop.
    if (def.washOn) HomeLife.washOn(day, minutes, flat);
    if (def.hangOut) HomeLife.hangOut(day, minutes, def.hangDeck, flat);
    if (def.bringIn) HomeLife.bringIn(flat);
    if (def.sweepDo) HomeLife.sweep(flat);
    // What was carried through to the table, and what was left in the fridge from last night.
    if (def.eatPlate) HomeLife.takePlate();
    if (def.eatLeft) HomeLife.eatLeftovers(day);
    // Somebody in the flat, and how the visit went — which is the state of the flat, and the whole
    // reason the mess is worth modelling.
    if (def.teaGuest) {
      const v = HomeLife.hostGuest(flat, day);
      if (v) {
        needs.mood = clamp(needs.mood + v.mood, 0, 100);
        spoke = [v.say, v.tr];
        logDiary(`${v.hz}来家里坐了坐。`, `${v.en} came round.`, 'talk');
      }
    }
    // The post, the locker and the parcel by the door, all off one list.
    if (def.mailTake) {
      const got = HomeLife.mailbox(day);
      if (got.length)
        spoke = [got.map(p => p.hz).join('、') + '。', got.map(p => p.en).join(', ') + '.'];
    }
    if (def.parcelTake) {
      const p = HomeLife.takeParcel(def.parcelTake);
      if (p) {
        stow(p.hz);
        toast(`收到快递 · <span class="dim">${p.en}, into the fridge</span>`);
      }
    }
    // Money out. `def.pay` is for a price known when the table was written; a bill is not one.
    if (def.payBills) {
      const r = HomeLife.payBills(money);
      money = Math.max(0, money - r.spent);
      if (r.spent) logDiary(`交了${r.spent}块的水电费。`, `Paid ${r.spent} kuai of utility bills.`, 'rent');
      spoke = r.owed ? [`交了${r.spent}块，还欠${r.owed}块。`, `Paid ${r.spent}. ${r.owed} still owing.`]
                     : [`一共${r.spent}块，交清了。`, `${r.spent} kuai. All settled.`];
    }
    if (def.bookAyi && money >= HomeLife.AYI_FEE) {
      money -= HomeLife.AYI_FEE;
      HomeLife.bookAyi(day);
    }
    if (def.inviteGuest) {
      const n = NPCS.find(q => q.hz === '邻居') || { hz:'邻居', py:'línjū', name:'邻居' };
      HomeLife.invite(n.hz, n.py || 'línjū', n.en || 'the neighbour', day + 1, 15);
    }
    // The desk opens the real review queue rather than paying you mood for pretending to.
    if (def.studyDo) setTimeout(() => { if (!paused && !cardOpen && !talkOpen) review(); }, 60);
    // A conversation: they say the next thing they have to say to you, and remember that
    // you came back. Their line becomes the sentence attached to their word.
    //
    // This used to return here, on the grounds that their line is the message and a generic one
    // on top of it would be noise. It cannot any more: talking to the waitress is also how you
    // order and pay, so the money has to move on the way past. `spoke` carries the "their line
    // was the message" part without also skipping everything the verb actually does.
    if (def.talk && th.npc) goalEvent('talk', th.npc.hz || th.hz);
    if (def.talk && th.npc && !def.orderUp && !def.payRider && Talk.pending(th.npc)) {
      // They have a question outstanding, so this is a conversation rather than a remark. Their
      // line is asked out loud in `openTalk`; nothing else in here applies, because talking to
      // somebody is the whole of the verb in that case.
      th.npc.met++;
      openTalk(th.npc);
      $('#doing').classList.remove('on');
      return;
    }
    if (def.talk && th.npc) {
      const n = th.npc, line = n.lines[n.met % n.lines.length];
      n.met++;
      th.sentence = line[0]; th.tr = line[1];
      spoke = [line[0], `${n.name || th.hz}: ${line[1]}`];
      // And out loud, in their own voice. `speakUntil` keeps the mouth and the hands going for
      // exactly as long as the sentence lasts: the talking animation used to stop the instant the
      // line appeared, which is the one moment it should still be running.
      const secs = Speech.npc(n, line[0], listenFrom(n));
      if (secs > 0) n.speakUntil = performance.now() + secs * 1000 + 120;
      if (n.met === 1 && n.name)
        toast(`认识了 · <span class="dim">you have met ${n.name} (${n.py})</span>`);
    }
  }
  // Half a bowl is still your bowl. Clearing the order whether or not you finished stops you
  // eating the same ¥18 of noodles four times by walking away at 90% and sitting back down.
  if (def.eat) {
    if (order) logDiary(`在餐馆吃了${order.dish.hz}。`, `Ate ${order.dish.en} at the noodle shop.`, 'eatout');
    order = null;
  }
  $('#doing').classList.remove('on');
  if (!finished) { toast('停下了 · <span class="dim">stopped</span>'); return; }

  // Out of the fridge. `Pantry.next` picked which lot this was when the prompt was written and
  // `Pantry.eat` picks the same one now, so what the prompt named is what actually leaves.
  if (def.eat) Pantry.eat(day);
  // The ingredients come out at the end, not the beginning: stop halfway through 饺子 and you have
  // not used the mince. `stopUse(false)` returns above this line, so an abandoned dish costs you
  // the minutes you stood there and nothing else, which is what abandoning a dish costs.
  //
  // One seam, stated rather than hidden: an hour at the stove can cross midnight, and something
  // the dish needed can go off in that moment — in which case you have eaten (the gain is applied
  // per frame by tickUse) and the fridge kept the cabbage. It is a free meal roughly never, and
  // the alternative — taking the ingredients up front — charges you for every dish you change
  // your mind about, which happens far more often than midnight does.
  if (def.cookDo) {
    const made = Pantry.cook(def.cookDo, day);
    cooking = null;
    HomeLife.prepClear();
    if (made) {
      logDiary(`在家做了${made.hz}。`, `Cooked ${made.en} at home.`, 'eatout');
      // Onto a plate rather than into your face: the dish can now be carried through to the 餐厅,
      // which is worth more than eating it at the hob. And what it made too much of keeps until
      // tomorrow, dated, so tonight's 饺子 is tomorrow's lunch and can also go off.
      HomeLife.plate(made.hz, made.en, day, made.gain || {});
      HomeLife.keepLeftovers(made.hz, made.en, day, def.mins);
      // The smell, and a sink that scales with what you actually cooked.
      HomeLife.cooked(flat, def.mins);
    }
  }
  // A stall that sells you something rather than feeding you on the spot — the 夜市 fruit lady,
  // who weighs out 一斤 and hands it over for you to carry home.
  if (def.buy) stow(def.buyHz || '水果', def.buy);
  if (def.pay) money = Math.max(0, money + def.pay);
  // 403. The switch belongs to the room the body is standing in, not to the building.
  if (def.light) { lightsOn[lightKey(place, room)] = !roomLit(place, room); }
  if (def.accessibleRoute && scene.expansion && scene.expansion.toggleAccessibleRoute)
    scene.expansion.toggleAccessibleRoute();

  // ---- shopping. Taking something off a shelf only moves it into the basket; the till is
  // where it turns into money and into food in the fridge at home.
  // One off the stack by the door, and from here on it hangs off your left forearm — the arm
  // draws it in `holdItem` for as long as you are in the shop with it.
  if (def.takeBasket) {
    basketHeld = true;
    toast('拿了个篮子 · <span class="dim">a basket, on your arm</span>');
  }
  if (def.take) {
    const g = goodsFor(def.take);
    if (g) {
      basket.push(g);
      toast(`放进篮子 · <span class="dim">into the basket · ¥${g.price} · ` +
            `¥${basketTotal()} total</span>`);
    }
  }
  if (def.till) {
    // Everything in the basket becomes a lot in the fridge, dated today. Nothing "lands on you
    // directly" any more — a basket of shopping is shopping, and the drink you bought is a drink
    // in the fridge rather than one you are somehow already holding at the till.
    const total = basketTotal(), n = basket.length;
    for (const g of basket) stow(g.hz);
    // Written before the basket is emptied, or the diary records a shopping trip for nothing.
    // Naming what you bought rather than counting it is the difference between a receipt and a
    // memory, and this is the diary — the words are why it exists.
    if (n)
      logDiary(`去超市买${basketSay()}了，一共${total}块。`,
               `Shopping at the supermarket — ${basket.map(g => dictOf(g.hz).en).join(', ')}. ` +
               `${total} kuai.`, 'shop');
    basket.length = 0;
    basketHeld = false;         // the basket stays at the till, as they do
    if (n) toast(`买好了 · <span class="dim">${n} item${n === 1 ? '' : 's'} away · ` +
                 `${stockOf()} 份 in the fridge</span>`);
  }
  // ---- the front door, and the rider standing on the other side of it. Opening the door only
  // puts him in the doorway; the money and the food move when you actually pay him.
  if (def.answer) answerDoor();
  if (def.payRider) takeDelivery();
  if (def.alight) alight();
  // ---- and the bag he handed you: down on a surface, back into your hand, or away for good.
  if (def.put !== undefined) putBag(def.put);
  if (def.takeBag) pickBag();
  if (def.stow) stowBag();
  // ---- the restaurant. Both of these open the menu panel; the money moves when you pick a line
  // out of it, not here, because until then nobody knows what you are having.
  if (def.orderUp) openMenu('order');
  // ---- the two fixtures in the 超市 that are furniture rather than goods, and the kitchen. All
  // three are the same interaction as the menu board: walk up, look, and then choose off a list
  // that is too long to hide behind one keypress.
  if (def.shelfPick) openShelf(def.shelfPick);
  if (def.cookPick) openKitchen(th);
  // ---- 北京银行.  Timed fixture use gets the player to the machine, chair or desk; the picker
  // owns every decision that can move money.  That separation makes Escape a clean cancellation
  // and prevents the generic wallet `pay` branch above from charging a bank transfer twice.
  if(def.bankForms) openBankForms();
  if(def.bankTicket) openBankTicket();
  if(def.bankWait) {
    callBankTicket();
    const status=bankTicketStatus();
    spoke=status;
  }
  if(def.bankShowId) {
    bankShowId();
    spoke=['身份证核对好了，请收好。','Your ID has been checked. Keep it safe.'];
  }
  if(def.bankOpenAccount) openBankAccountPanel();
  if(def.bankCardService) openBankCardService();
  if(def.bankCounter) openBankCounter();
  if(def.bankTeller) openBankTeller(def.bankTeller);
  if(def.bankATM) openBankATM();
  if(def.bankWealth) openBankWealth();
  if(def.bankSafe) openBankSafe();
  if(def.bankVip) openBankVip();
  // Shopping: the browse ends in the catalogue, and the till ends in owning the thing. `pay` on
  // the label has already moved the money by the time this runs, so mallPay must not move it again.
  if (def.mallBrowse && th && th.mallShop) openMallShop(th.mallShop);
  if (def.mallPay) mallPay(true);
  // The food counter, arcade and passport all end their short physical action in a chooser. The
  // chooser owns the decision; the machine action has already taken its coin, while food waits for
  // a definite dish and modifier before charging anything.
  if (def.mallFoodHall) openMallFood('all');
  if (def.mallFood) openMallFood(def.foodVendor||(th&&th.foodVendor));
  if (def.mallArcadeLobby) openArcadeLobby();
  if (def.mallArcadeGame) openArcadeGame(def.mallArcadeGame,true);
  if (def.mallPrize) openArcadePrizes();
  if (def.mallPassport) openMallPassport();
  if (def.mallEventSchedule) openMallEvents();
  if (def.mallEventJoin) {
    const events=Mall.eventsToday?Mall.eventsToday():Mall.EVENTS;
    const e=events.find(q=>q.key===def.mallEventJoin);
    const stamp=awardMallStamp('event');
    if (e) {
      needs.mood=clamp(needs.mood+6,0,100);
      logDiary(`在商场中庭参加了${e.hz}。`,`Joined ${e.en} in the mall atrium.`,'mallevent');
      spoke=[`参加了${e.hz}。${stamp?`集章册多了一枚${stamp.hz}。`:''}`,
        `You join ${e.en}.${stamp?' A new stamp goes in the mall passport.':''}`];
    }
    saveGame();
  }
  // The cinema, both halves of it. `pay` on the label has already taken the ¥45 by the time this
  // runs, so the box office only has to write down what the money bought; the seat tears the ticket
  // up. Both read Mall.nextShow, which is the same schedule the board in the lobby is printed from.
  // The money moves when a screening is picked out of the panel, not here, because until then
  // nobody knows which one you are having — the same reason the restaurant works this way.
  if (def.mallTicket) openCinema();
  // Distinct diary tags either side: logDiary drops a second entry with the same tag on the same
  // day, so sharing one between buying and watching would silently swallow the film.
  if (def.mallFilm && cinemaTicket) {
    logDiary(`在星光电影院看了《${cinemaTicket.film}》，${cinemaTicket.seat}。`,
             `Watched ${cinemaTicket.en} at the Starlight Cinema — ${cinemaTicket.seat}.`, 'cinema');
    cinemaTicket = null;
  }
  if (def.menu) openMenu('browse');
  if (place === 'diner' && th.hz === '茶') TrainAudio.dinerCue('tea');
  if (def.dinerBell) TrainAudio.dinerCue('bell');
  if (place === 'mall') {
    if (th.hz === '电梯' || th.hz === '扶梯') TrainAudio.mallCue('elevator');
    else if (def.mallArcadeGame || def.mallPrize || th.hz === '游戏厅' || th.hz === '电影院' || th.hz === '游戏机') TrainAudio.mallCue('arcade');
    else if (th.hz === '跑步机' || th.hz === '篮球') TrainAudio.mallCue('steps');
    else if (th.hz === '服装店' || th.hz === '美食广场' || th.hz === '咖啡') TrainAudio.mallCue('checkout');
  }
  // ---- 药店. The counter asks you what is wrong, and the answer is the lesson: four complaints,
  // each one a word, and the medicine she hands over is priced off which one you said.
  if (def.remedy) openRemedy();
  // ---- 医院.  Fixtures carry the verbs; this small state machine carries one visit across four
  // separately loaded floors.  Registration and the lift open drawers because both require a
  // choice.  Every other step advances only after its physical action finishes.
  if (def.hospitalRegister) {
    openHospitalRegistration(false);
    spoke=['选一个症状挂号。','Choose the symptom you are registering for.'];
  }
  if (def.hospitalEmergency) {
    openHospitalRegistration(true);
    spoke=['急诊护士问哪里不舒服。','The emergency nurse asks what is wrong.'];
  }
  if (def.hospitalFloors) {
    openHospitalFloors(def.hospitalFloors);
    spoke=[def.hospitalFloors==='stairs'?'看楼梯口的楼层牌。':'电梯门开了，选择楼层。',
      def.hospitalFloors==='stairs'?'Choose a floor from the stair directory.':'The lift is open; choose a floor.'];
  }
  // ---- 京华大酒店 前台. The row carries its own opener so the panel is dispatched here beside
  // every other opener, instead of hanging off the `done` getter that game.js reads once at the
  // bottom of this function. A USE row anywhere may use the same seam: put a function on the key.
  if (def.stayDesk) def.stayDesk();
  // ---- 京华大酒店客房, the completions. Every rule below belongs to js/stay.js; all that happens
  // here is that it is told the night happened, and that the room's own trace is written down.
  if (def.hotelSleep) {
    // `slept` is handed the day the player went to BED on, captured when the action started. The
    // clock has already rolled by the time this runs — tickUse advances time as the action plays —
    // and handed today's date `nightsSlept(day + 1)` would count the night twice.
    const nights = Stay.slept(def.sleepDay);
    const b = Stay.booking() || {};
    logDiary(`在京华大酒店${b.room || ''}房过夜，第${nights}晚。`,
             `A night at the Jinghua Grand, room ${b.room || ''} — night ${nights}.`, 'hotelnight');
    // H112. The ordinary save runs on a few-second timer; a night is the one action long enough
    // that a refresh straight after it is likely, and waking up in the lobby of a hotel you have
    // paid for reads as the room having been taken away. The place, the body and the booking all
    // go down together here.
    saveGame();
  }
  // H127 (迷你吧 on the bill) and the sending half of H128 (洗衣 down to B1) have no caller here
  // on purpose. `Stay.minibar` and `Stay.sendLaundry` are ready and tested, but neither fixture
  // exists on any guest floor — there is no minibar and no laundry bag in the building — and a
  // USE row hung off the linen store or the ice machine would be the wrong object saying the
  // wrong sentence. They need a prop before they need a call. The RETURN half of the laundry is
  // wired (`hotelRoomArrive`), so a bag sent by anything else does come back the next day via B1.
  if (def.stayService) openRoomService();
  if (def.hotelFloors) {
    openHotelFloors(def.hotelFloors);
    spoke=[def.hotelFloors==='stairs'?'安全楼梯只通相邻开放层。':'客梯门开着，请选择楼层。',
      def.hotelFloors==='stairs'?'The fire stair reaches the adjacent authored floor.':'The passenger car is open; choose a floor.'];
  }
  if (def.officeFloors) {
    openOfficeFloors(def.officeFloors);
    const stairs=String(def.officeFloors).startsWith('stairs');
    spoke=[stairs?'安全楼梯一次只通相邻开放层。':'公司客梯门开着，请选择楼层。',
      stairs?'The fire stair reaches one adjacent workplace floor.':'The passenger car is open; choose a floor.'];
  }
  if (def.hospitalTriage) {
    const r=hospitalCase();
    hospitalVisit.stage=Math.max(hospitalVisit.stage,2);
    spoke=[`分诊好了，${hospitalVisit.number}号，去二楼${r.room}诊室。`,
      `Triage complete. Number ${hospitalVisit.number}; room ${r.room} on the second floor.`];
    logDiary(`在医院分诊，护士让我去${r.dept}${r.room}诊室。`,
      `Triage sent me to ${r.dept}, room ${r.room}.`,'hospital-triage');
    saveGame();
  }
  if (def.hospitalConsult) {
    const r=hospitalCase();
    hospitalVisit.stage=Math.max(hospitalVisit.stage,3);
    spoke=[`医生说：“${r.advice}”`,r.adviceEn];
    Vocab.introduce(r.test);
    logDiary(`在${r.room}诊室看了${r.dept}医生。${r.advice}`,
      `Saw the ${r.dept} doctor in room ${r.room}. ${r.adviceEn}`,'hospital-consult');
    saveGame();
  }
  if (def.hospitalTest) {
    const r=hospitalCase();
    hospitalVisit.tested=true;
    hospitalVisit.stage=Math.max(hospitalVisit.stage,4);
    spoke=[`${r.test}做完了，结果出来了。`,`${r.testEn.charAt(0).toUpperCase()+r.testEn.slice(1)} complete; the result is ready.`];
    logDiary(`在医院三楼做了${r.test}。`,`Had ${r.testEn} on the hospital's third floor.`,'hospital-test');
    saveGame();
  }
  if (def.hospitalTreat || def.hospitalInfusion) {
    const r=hospitalCase();
    hospitalVisit.treated=true;
    hospitalVisit.stage=Math.max(hospitalVisit.stage,5);
    spoke=['治疗完成了，舒服多了。去药房取药。','Treatment complete. You feel much better; collect the medicine.'];
    logDiary(`在仁和医院完成了${r.hz}的治疗。`,
      `Completed hospital treatment for ${r.en}.`,'hospital-care');
    saveGame();
  }
  if (def.hospitalDispense) {
    hospitalVisit.dispensed=true;
    needs.mood=clamp(needs.mood+8,0,100);
    spoke=['药师核对了名字和药方，把药交给我。','The pharmacist checks the name and prescription, then hands over the medicine.'];
    Vocab.introduce('处方');
    saveGame();
  }
  if (def.hospitalDischarge) {
    hospitalVisit.stage=6;
    spoke=['出院手续办好了，按医嘱好好休息。','Discharge complete. Rest and follow the doctor’s instructions.'];
    logDiary('在仁和医院办了出院手续。','Completed discharge at Renhe Hospital.','hospital-discharge');
    saveGame();
  }
  // ---- the office, and the subway
  if (def.board) openTasks();
  if (def.ride) openTravel(true);
  if (def.lineMap) openTravel(false);
  if (def.punch) {
    clockedDay = day;
    // The card is the attendance record, so this is the one place the record is written. A run of
    // on-time mornings is worth saying out loud, because it is worth money and nothing else on
    // screen would tell you it was building.
    const punch = Career.clockIn(day, minutes / 60);
    if (punch.streak >= 3 && !punch.late)
      setTimeout(() => toast(`全勤${punch.streak}天 · <b>${Vocab.sentenceHTML('全勤')}</b> ` +
        `<span class="dim">${punch.streak} days on the trot — the bonus grows with it</span>`), 200);
    Story.clockedIn();
    logDiary(job ? `去上班了，做${job.hz}。` : '去上班，打卡了。',
             job ? `Went to work — ${job.en}.` : 'Clocked in at work.', 'work');
    storyBeat();
  }
  if (def.machine) openTicket();
  // The gate opens; your legs do the rest. All this does is take the fare, unlock the nearest lane
  // set the way you are going, and slide you into the middle of it so the 1.10 m aisle is a
  // straight walk rather than a thing to aim at. It does not move you across the line.
  if (def.gate === 'in' || def.gate === 'out') {
    if (def.card && card) card.bal = Math.max(0, card.bal + def.card);
    if (def.eatTicket) ticket = null;
    if (def.gate === 'in') tapIn = station;
    else { tapIn = null; }
    // The card being read, and then the flaps. Two of the sounds a station is made of, and the
    // gate line has been opening in silence since it was built.
    TrainAudio.gate('tap');
    const lx = Metro.openGate(def.gate === 'in', P.x, performance.now() / 1000);
    if (lx !== null) {
      TrainAudio.gate('flap');
      P.x = lx;
      P.yaw = def.gate === 'in' ? 0 : Math.PI;
      CAM.fx = P.x; CAM.fz = P.z;
    }
  }
  // ---- 机场. The chain, one link per verb. Only two of these move the body: security opens
  // the barrier and lines you up with the lane, the same way the subway gate does, and the
  // 出口 walks you back through the partition the one way it goes.
  if (def.flights) openFlights();
  // The two slow ways to find your gate. Both of them have just read it out to you — the desk out
  // loud, the board in print — so both of them are allowed to end the not-knowing. Listening to the
  // call is quicker and free; these cost a walk across a forty-four-metre hall, which is the whole
  // of the trade.
  if ((def.askAir || def.depBoard) && flight && flight.checked && !knowsGate()) {
    flight.knewGate = gateNow(flight.f);
    toast(`${gateNow(flight.f)} · <span class="dim">your gate — ${flight.f.no} to ${flight.f.en}</span>`);
    updateHud();
  }
  if (def.checkin && flight && !flight.checked) {
    if (def.kiosk) gotBoardingCard(flight.f, seatRow(flight.f) + 'B');
    else openCheckin();
  }
  if (def.bagdrop && flight && flight.checked && !flight.bag) {
    flight.bag = true;
    toast(`行李托运了 · <span class="dim">checked through to ${flight.f.en} — ` +
          `you have your hands free now</span>`);
  }
  if (def.duty) openDuty();
  if (def.security && flight && flight.checked) {
    flight.cleared = true;
    const lz = Airport.openSecurity(performance.now() / 1000);
    P.z = lz; P.x = Airport.SEC - 1.10; P.yaw = Math.PI / 2;
    CAM.fx = P.x; CAM.fz = P.z;
    say('过了。登机口在里面。', 'Through. The gates are inside.');
  }
  if (def.leaveAir) { P.x = Airport.SEC - 1.30; P.yaw = -Math.PI / 2; CAM.fx = P.x; }
  // Boarding used to be the flight: one action at the gate and you were in Shanghai. Now it puts
  // you on the aeroplane and the flight is something that happens to you in there — see boardCabin.
  if (def.boardPlane && flight && flight.checked) { boardCabin(); return; }
  // Down in your own seat, so the aeroplane can go. Everything after this — the engines spooling,
  // the captain's briefing, the belts being checked, the trolley — is the cabin's own sequence
  // running; see Cabin.startFlight and the `cap:`/`crew:` events it hands back.
  if (def.cabinSit && Cabin.startFlight()) {
    if (flight && flight.startedAt === undefined) flight.startedAt = clockNow();
    toast('系好安全带 · <span class="dim">belt on — the captain has something to say</span>');
    Vocab.sentenceHTML('安全带');
  }
  // And you stay in the chair. `stopUse` has already cleared `act` by this point, because finishing
  // an action is normally the end of it; this puts the seated pose back and leaves it there until you
  // walk out of it. The pose is rebuilt rather than kept so that it does not carry the action's
  // target arm — you are sitting, not still reaching for the armrest.
  if (def.cabinSit && place === 'cabin' && sitting) {
    act = { type: 'sit', kind: 'sit', startedAt: performance.now(),
            seatY: .50, hz: th.hz, target: th.pos };
  }
  // Mall seats persist for the same reason as the aeroplane seat above, but without changing the
  // player's camera: the open concourse already has room for the ordinary third-person framing.
  // The movement block clears both `sitting` and this pose before collision is evaluated, so one
  // step is all it takes to stand up and leave normally.
  if (place === 'mall' && sitting && sitting.mall) {
    act = { ...sitting.pose, kind:'sit', startedAt:performance.now(),
            hz:sitting.hz, target:th.pos };
  }
  if((place==='zoo'||place==='zoo_tropical')&&sitting&&sitting.local){
    act={...sitting.pose,kind:'sit',startedAt:performance.now(),hz:sitting.hz,target:th.pos};
  }
  // The call button. Somebody comes, which is the whole of what a call button is.
  if (def.ringBell) crewAnswerBell();
  if (def.cabinEquip) {
    const state = Cabin.toggleEquipment(def.cabinEquip);
    if (state === 'secure') {
      say('起飞和降落时请保持设备收好。', 'Keep the equipment stowed for take-off and landing.');
    } else TrainAudio.cabinCue(def.cabinEquip);
  }
  if (def.ife) openFlightExperience('map');
  if (def.cockpitView) openFlightExperience('cockpit');
  if (def.exitPlane) { landFlight(); return; }
  // ---- 外滩. The office stamps your return; the coach ends the trip.
  if (def.reconfirm && trip) trip.confirmed = true;
  if (def.home) { comeHome(); return; }
  // Every subway mouth on the street goes down into the same room, and each one says which
  // station that room is when you arrive through it.
  if (th.station) { station = th.station; Metro.setStation(station); }
  // A shift is over when it is over: the job comes off the board, and the record remembers that
  // you did it. Sixteen finished jobs is one of the three things 主管 asks for.
  if (def.shift) {
    if (job) Career.finishJob(job.hz);
    job = null;
  }
  // A meeting is work too, and it is the only place the word 会议 is a thing you did rather than a
  // thing you read. It counts toward the ladder for the same reason the desk does.
  if (def.meet) Career.finishJob('开会');
  // A door on the thing itself beats the verb's destination. Every interior tags its way out
  // 门, so they all share one USE entry — but each has to put you back on the pavement outside
  // its own shopfront, not outside whichever one was written into the table.
  if (th.exit) setPlace(th.exit.place, th.exit.at);
  // Out of the door you came in by. `def.at` is the arrival point the row names — only 门 carries
  // one — and it is `undefined` on every other `go:` row, which is exactly the argument `setPlace`
  // already treats as "use the scene's own spawn". Without it the building's front door dropped you
  // at the street's default spawn rather than on its own doorstep.
  else if (def.go) setPlace(def.go, def.at);
  // Opening a list is not doing the thing. 做一顿饭 is one of the daily goals and the kitchen's
  // first verb is now "see what you could make" — without this, walking up to the stove and
  // reading the panel would tick off a meal that nobody cooked.
  if (!def.cookPick && !def.shelfPick) goalEvent('use', th.hz);
  if (spoke) say(spoke[0], spoke[1]);
  else if (def.done) say(def.done, def.doneTr);
  else say(def.zh + '。', def.en.charAt(0).toUpperCase() + def.en.slice(1) + '.');
  updateHud();
}

function tickUse(dt) {
  if (!doing) return;
  if (doing.preview) return;
  const { def } = doing;
  const step = Math.min(dt / def.secs, 1 - doing.t);
  doing.t += step;
  if (def.mallRide) {
    const q=Mall.escalatorPose(def.mallRide,doing.t,def.mallBank);
    P.x=q.x; P.z=q.z; P.lift=q.lift; P.yaw=q.yaw;
    P.vx=P.vz=0; P.speed=0; P.ground=0;
    // The normal weighted camera follow below now tracks the moving body. Writing the target here
    // as well made it alternate between an instant snap and a damped follow on every frame.
    CAM.tYaw=angleLerp(CAM.tYaw,q.yaw,1-Math.pow(.12,dt));
  }
  advanceTime(def.mins * step);                      // costs time, and time costs needs
  for (const k in def.gain) needs[k] = clamp(needs[k] + def.gain[k] * step, 0, 100);
  $('#doing .tk i').style.width = (doing.t * 100).toFixed(1) + '%';
  if (doing.t >= 0.999) stopUse(true);
}

// ---------------------------------------------------------------- loop
function frame(now) {
  // Acceptance harnesses can freeze rendering after a room has been built, then step its real
  // controllers directly. Keep the rAF chain alive so releasing the hold resumes normally.
  if (frameHold) { t0 = now; requestAnimationFrame(frame); return; }
  rigFrame++;
  const rawMs = now - t0;
  const dt = Math.min(0.05, rawMs / 1000); t0 = now;
  Perf.tick(now, rawMs);
  updatePerfChip();

  // ---- movement
  let ix = 0, iz = 0;
  const moveYawWas = P.yaw;
  // W and S drive the highlight in the order panel, so they must not also walk you out of the
  // restaurant while you are reading it.
  if (!cardOpen && !talkOpen && !Pick.isOpen && !paused) {
    if (keys.w || touchKeys.w) iz += 1;
    if (keys.s || touchKeys.s) iz -= 1;
    if (keys.a || touchKeys.a) ix -= 1;
    if (keys.d || touchKeys.d) ix += 1;
  }
  // Walking away is how you stop doing something, exactly as you would expect.
  if (doing && (ix || iz)) stopUse(false);
  if (doing) { ix = 0; iz = 0; }
  // And getting out of your seat is the same gesture. No prompt for it and nothing to press: you
  // lean on W and you are standing in the aisle.
  if (sitting && (ix || iz)) {
    if (sitting.was) {
      CAM.tPitch = sitting.was.pitch; CAM.tDist = sitting.was.dist; CAM.lookY = sitting.was.lookY;
      // Behind you again, facing the way you are about to walk, rather than swinging round from the
      // front while you are already moving.
      CAM.tYaw = P.yaw;
    }
    if(sitting.stand){P.x=sitting.stand[0];P.z=sitting.stand[1];P.vx=P.vz=0;P.speed=0;P.ground=0;}
    sitting = null; act = null;
  }
  // Empty and exhausted both slow you down; it is the one hard consequence of neglect.
  const drag = (needs.rest < 15 ? 0.68 : 1) * (needs.food < 15 ? 0.82 : 1);
  const run = (keys.shift || touchKeys.shift ? 1.85 : 1) * drag;
  const len = Math.hypot(ix, iz);
  let tx = 0, tz = 0;
  let moveAlignment = 0;
  if (len > 0) {
    ix /= len; iz /= len;
    const cy = CAM.yaw;
    // camera-relative: forward is the direction the camera looks, flattened
    tx = (Math.sin(cy) * iz + Math.cos(cy) * ix);
    tz = (Math.cos(cy) * iz - Math.sin(cy) * ix);
    // Turn briskly but at a humanly bounded angular rate. Translation below follows the resolved
    // body heading, not this raw input vector, so a sharp camera-relative change cannot slide the
    // character sideways while the gait is still authored forward through their hips.
    const wantedYaw = Math.atan2(tx, tz);
    const yawError = angleDelta(wantedYaw, P.yaw);
    const yawStep = clamp(yawError * (1 - Math.exp(-9 * dt)), -7 * dt, 7 * dt);
    P.yaw += yawStep;
    moveAlignment = Math.max(0, Math.cos(angleDelta(wantedYaw, P.yaw)));
  }
  const target = 1.55 * run * (len > 0 ? 1 : 0);
  // Quick to start, quicker to stop: no drifting after the key is released.
  P.speed = lerp(P.speed, target, 1 - Math.pow(len > 0 ? 0.0007 : 0.00003, dt));
  const wasX = P.x, wasZ = P.z;
  if (P.speed > 0.01 && len > 0) {
    const upstairs = place === 'mall' && Mall.level() > 1;
    const travel = P.speed * moveAlignment * dt;
    const mx = Math.sin(P.yaw) * travel, mz = Math.cos(P.yaw) * travel;
    const [nx, nz] = upstairs
      ? Mall.clampUpper(P.x, P.z, P.x + mx, P.z + mz, 0.30, Mall.level())
      : scene.clampMove(P.x, P.z, P.x + mx, P.z + mz, 0.30);
    P.x = nx; P.z = nz;
  }
  // Zoo r2 has raised public surfaces at the lake pavilion and conservation bridge. Keep the
  // player's floor/camera on their ramps/lifts just as NPC liftAt does.
  if (place === 'zoo' && scene.liftAt) P.lift = scene.liftAt(P.x, P.z,P.lift||0);
  // ---- the hop.
  //
  // Integrated after the horizontal move and before the gait, because the gait needs to know
  // whether the feet are on the floor. Horizontal control is deliberately unchanged in the air:
  // you keep the speed you took off with and can still steer, which is what a person does over a
  // 0.57 s hop, and it means nothing about walking changes when you are not jumping.
  if (P.jv !== 0 || P.jy > 0) {
    P.jv -= JUMP_G * dt;
    P.jy += P.jv * dt;
    if (P.jy <= 0) { P.jy = 0; P.jv = 0; }        // landed
  }
  const airborne = P.jy > 0.001;

  // The gait runs off ground actually covered, not off the speed the keys ask for. Walking
  // into a wall or a wardrobe therefore settles the legs to a stand instead of striding on
  // the spot, and the stride stays locked to the floor at every speed.
  // In the air it reads zero however fast you are travelling, so the legs stop cycling at the
  // moment the feet leave the floor instead of running on nothing, and pick the stride back up
  // on landing. The phase is left where it was, so you come down on the foot you left on.
  const moved = airborne ? 0 : Math.hypot(P.x - wasX, P.z - wasZ) / Math.max(dt, 1e-4);
  P.ground = lerp(P.ground || 0, moved, 1 - Math.pow(0.0004, dt));
  // Phase advances with the ground covered, at the rate the current step length calls for, so
  // the stride stays locked to the floor whether you are strolling or running.
  // The same age the pose is drawn with, or the stride the legs describe and the ground the
  // phase says has been covered come apart and the feet skate. See `stepLength`.
  P.phase += moved * dt * strideRate(P.ground / 1.55, PLAYER.age);
  // Paused, the world holds still: nobody cooks, nobody walks, nobody climbs your stairs. It
  // still draws, because a settings panel over a frozen frame of the room is the point.
  topUpTester();                // no-op unless the tester's wallet is switched on
  if (!paused) {
    tickService();              // the kitchen and the waitress, whatever else is happening
    tickDelivery();             // and whatever is crossing the city on the back of an e-bike
    tickRide(dt);               // and the train, going round the ring a stop at a time
    tickStation(dt);            // and the queue at the ticket machines, before anybody is moved
  }
  updateNPCs(paused ? 0 : dt, now);   // the neighbours get on with their day either way
  // The carts go where the crew went, so this has to be after they have moved and before anything
  // draws. Costs nothing in the other twelve rooms: there is no crew in them to be pushing one.
  if (place === 'cabin') updateTrolleys();
  // The tray and the engineer, on the same after-the-people-have-moved beat as the carts and for
  // the same reason: the errand is handed to somebody who is already walking. `hotelFloorAt` is a
  // thirteen-entry lookup and `tickHotelRoom` rate-limits itself to once a second, so an empty
  // hotel — and every one of the other rooms in the game — costs a failed find and nothing else.
  if (hotelFloorAt(place)) tickHotelRoom(now);

  // ---- physical interaction: steer the body to the object it is using
  // Include the camera-relative steering turn above as well as the final interaction-facing turn
  // below. Capturing yaw here used to happen after steering, so ordinary corners always reported
  // zero angular speed to the rig and only object interactions could ever show a turn pose.
  const yawWas = moveYawWas;
  if (act) {
    // Seats and beds dictate a facing; everything else turns to face what it touches.
    const fy = act.yaw !== undefined
      ? act.yaw
      : Math.atan2(act.target[0] - P.x, act.target[2] - P.z);
    const faceError = angleDelta(fy, P.yaw);
    P.yaw += clamp(faceError * (1 - Math.exp(-5.5 * dt)), -5 * dt, 5 * dt);
    if (act.at) {                                              // walk onto the seat / bed
      P.x = lerp(P.x, act.at[0], 1 - Math.pow(0.004, dt));
      P.z = lerp(P.z, act.at[1], 1 - Math.pow(0.004, dt));
    }
  }
  // How fast the body is turning, smoothed. The torso banks into it.
  P.turn = lerp(P.turn, angleDelta(P.yaw, yawWas) / Math.max(dt, 1e-3),
    1 - Math.pow(0.0025, dt));

  // ---- camera: keyboard orbit, flick glide, then one damped settle per frame
  if (!cardOpen && !talkOpen) {
    let kx = 0, ky = 0;
    if (keys.arrowleft) kx -= 1;
    if (keys.arrowright) kx += 1;
    if (keys.arrowup) ky -= 1;
    if (keys.arrowdown) ky += 1;
    if (kx || ky) {
      // Orbiting from the keyboard leaves the mouse free while you walk.
      const rate = (keys.shift ? 2.8 : 1.6) * dt;
      CAM.tYaw += kx * rate;
      CAM.tPitch = clamp(CAM.tPitch + ky * rate * 0.52, 0.05, dollHouse() ? 1.45 : 1.05);   // 512, same clamp as the mouse
      CAM.spin = 0;
    }
  }
  if (!down && Math.abs(CAM.spin) > 0.001) {
    CAM.tYaw += CAM.spin * dt;
    CAM.spin *= Math.pow(0.0016, dt);      // glide settles in about a third of a second
  }

  // Hospital clinical rooms announce a useful point to face at their doorway.  Apply that angle
  // once when the body crosses the threshold, then stop helping: mouse/keyboard orbit remains
  // fully manual inside the room.  Returning to the corridor makes cameraAssistAt return null,
  // which re-arms the same room for the next visit without ever imposing a corridor direction.
  if (scene.cameraAssistAt) {
    const previous=CAM.assist&&CAM.assist.place===place?CAM.assist.id:null;
    const q=scene.cameraAssistAt(P.x,P.z,previous);
    const key=q?`${place}:${q.id}`:null;
    const old=CAM.assist?`${CAM.assist.place}:${CAM.assist.id}`:null;
    if(key!==old) {
      CAM.assist=q?{place,id:q.id}:null;
      if(q) {
        const want=Math.atan2(q.focus[0]-P.x,q.focus[1]-P.z);
        CAM.tYaw+=angleDelta(want,CAM.tYaw);
        CAM.spin=0;
      }
    }
  } else CAM.assist=null;
  const look = 1 - Math.pow(0.0000001, dt);
  CAM.yaw = lerp(CAM.yaw, CAM.tYaw, look);
  CAM.pitch = lerp(CAM.pitch, CAM.tPitch, look);
  CAM.dist = lerp(CAM.dist, CAM.tDist, 1 - Math.pow(0.00001, dt));
  // Interiors benefit from a slightly tighter, calmer lens; outside, the extra width preserves
  // peripheral awareness at crossings and in the hutong. A scene can author its own value beside
  // distance and pitch. Conversation framing closes in further, then eases back rather than
  // popping between two projection matrices.
  const authoredFov = scene.camera && scene.camera.fov !== undefined
    ? scene.camera.fov : scene.indoor ? 0.90 : 0.98;
  const wantedFov = talkOpen ? Math.min(authoredFov, 0.82) : authoredFov;
  CAM.fov = lerp(CAM.fov, wantedFov,
    1 - Math.pow(talkOpen ? 0.0007 : 0.012, dt));
  // The look-at point trails the player a little, which reads as weight rather than lag.
  const follow = 1 - Math.pow(0.0001, dt);
  // Sitting in an aeroplane seat, the camera orbits the aisle rather than your own chest. It has to:
  // the rows are 94 cm apart, so a camera any distance at all behind a seated passenger is inside the
  // seat behind them, and at 2.4 m it is inside three of them — the frame goes to a flat pale wall of
  // upholstery. Over the aisle it has a clear run down the cabin, and you are seen from where a
  // member of crew would see you, which is the right shot for the room anyway.
  //
  // The target is replaced, not lerped a second time. Two eases pulling at one value do not hand over
  // from one to the other, they find the point between them: written as a second lerp toward the
  // aisle this settled at x -1.91, halfway from the seat at -2.52 to the aisle at -1.48, which is
  // inside the armrest.
  const talkFrame = talkOpen && talkAt && talkAt.frame;
  const focusFollow = talkFrame ? 1 - Math.pow(0.000002, dt) : follow;
  CAM.fx = lerp(CAM.fx, talkFrame ? talkFrame.focus[0] : sitting ? sitting.aisle : P.x,
    focusFollow);
  CAM.fz = lerp(CAM.fz, talkFrame ? talkFrame.focus[1] : P.z, focusFollow);
  // Over the title the camera belongs to the title, not to the player. After the follow lerp,
  // so it overwrites it rather than fighting it.
  if (!started) titleCamera(now);

  // The room you are in decides the cutaway bounds and which lamp is overhead. Outside, that
  // lamp is the nearest street light, and it only comes on when the daylight goes.
  room = scene.roomAt(P.x, P.z, room.id);
  // Which deck and hour the body is in the flat for, for the repair visit at the day rollover.
  if (place === 'home' && World.level && World.level() === 2
      && minutes >= 9 * 60 && minutes < 17 * 60) homeDayIn = day;
  // `lampFlicker` returns a clean 1 unless js/faults.js says the fitting is broken, so this is the
  // whole of the flicker: the room's own brightness moves with the shade. Dimming the shade without
  // dimming the bulb was the trap the note beside that curve warns about — a fitting that flickers
  // over a room whose brightness never moves looks more broken than the bug.
  const bulbK = (roomLit(place, room) && powered()) ? (room.bulb === undefined ? 1 : room.bulb) : 0;
  const flick = place === 'home' && World.lampFlicker ? World.lampFlicker(now / 1000) : 1;
  if (place === 'home' && World.setLamp) World.setLamp(bulbK * flick);
  R.setBulb(room.light[0], room.light[1], room.light[2],
    scene.indoor ? bulbK * flick
      : 1 - daylight(minutes).day);
  // 399. The curtains close the daylight shaft. `R.setWinShade` (js/gl.js) was built for this and
  // had no caller in the repo, so drawing them across left the sun patch lying on the floor.
  // `fixt.curtainL/R` are the eased positions, 1 fully drawn, so the shaft fades with the fabric
  // rather than snapping off. Only flat 202 has curtains, and the shade is scene-wide, so it is
  // gated on standing on deck 2 — otherwise closing them here would darken the eleventh floor's
  // bedroom too. Restated every frame, never latched, so it cannot leak into the next place.
  // `scene.level()` and not `drawDeck`: drawDeck is written later in the same frame (15510), so
  // reading it here would shade a floor change one frame late.
  R.setWinShade(place === 'home' && scene.level && scene.level() === 2
    ? 1 - (fixt.curtainL + fixt.curtainR) / 2 : 1);

  // The room's own lamps, on top of the single overhead bulb above. Only eight reach the shader
  // and a room may declare more than that. Ordinary rooms retain their established per-frame
  // distance ranking; the much larger mall uses the transition-only cache above so nearly tied
  // shop lamps do not trade shader slots while the camera eases along the concourse.
  //
  // Indoors they follow the light switch; outdoors they are street lighting and follow the sun.
  if (scene.lights && scene.lights.length) {
    const lit = scene.indoor ? (roomLit(place, room) && powered()) : daylight(minutes).day < 0.5;
    if (!lit) {
      R.setLights(null); selectedLightDebug=[];
      if(place==='mall')resetMallLightSelection(mallLightSelectionState,'unlit');
    }
    else {
      const eye = [CAM.fx, CAM.lookY + (P.lift || 0), CAM.fz];
      // Ranked by distance in the ground plane, which is right in a one-storey room and wrong in a
      // twelve-storey block: a lamp in the flat on deck 2 was exactly as "near" as one four floors
      // directly above it, so the eight slots that reach the shader were being filled by lights on
      // decks you cannot see. Drop the other decks' lamps first — the y term alone would not do it,
      // because the eight nearest in 3-D on a crowded floor can still include the deck below.
      let on = scene.lights.filter(l => l.on !== false);
      const localLightDeck=place==='mall'&&Mall.level?Mall.level():drawDeck;
      if (place==='home'&&drawDeck >= 0 && scene.deckY) {
        const y0 = scene.deckY(drawDeck), h = (World.STOREY || 3.10);
        const mine = on.filter(l => l.y >= y0 - .40 && l.y < y0 + h);
        if (mine.length) on = mine;
      }
      const score=l=>((l.x-eye[0])**2+(l.z-eye[2])**2+
        (place==='mall'?(l.y-eye[1])**2*2.25:0));
      if (on.length > 8 && place!=='mall') {
        // Keep ordinary rooms' established ranking. Mall candidates instead pass through the
        // stable selector, using this same vertically weighted score around its visible atrium.
        on.sort((a,b)=>score(a)-score(b));
      }
      const chosen=place==='mall'
        ?selectMallLights(mallLightSelectionState,on,eye,scene,localLightDeck,score)
        :on.slice(0,8);
      if(place!=='mall')resetMallLightSelection(mallLightSelectionState,'left-mall');
      selectedLightDebug=chosen.map((l,i)=>({
        rank:i+1,id:l.mallShop?`${l.mallShop}@${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}`
          :`${l.mallPublic||'public'}@${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}`,
        owner:l.mallShop||l.mallPublic||'public',phase:l.mallPhase||'',score:+score(l).toFixed(3),
        power:+l.power.toFixed(3),radius:+l.radius.toFixed(2),x:+l.x.toFixed(2),
        y:+l.y.toFixed(2),z:+l.z.toFixed(2)}));
      R.setLights(chosen);
    }
  } else {
    R.setLights(null); selectedLightDebug=[];
    resetMallLightSelection(mallLightSelectionState,'no-lights');
  }

  const tgt = [CAM.fx, (Math.abs(CAM.lookY - 1.10) < 1e-6 && CAM.rlook !== undefined
                        ? CAM.rlook : CAM.lookY) + (P.lift || 0), CAM.fz];   // 513
  // `let`, not `const`: the lift writes its own framing below and `cam.up` further down reads
  // these back, so all three have to be recomputed together or the horizon tilts.
  let cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  const dir = [-Math.sin(CAM.yaw) * cp, sp, -Math.cos(CAM.yaw) * cp];
  // Every surface is single-sided, so the camera may simply back out through a
  // wall or the ceiling: whatever stands between you and the room disappears.
  // The band just inside each wall is the exception — parking there buries the eye
  // in a door or cabinet, so the camera pulls in rather than stopping inside one.
  let dist = CAM.dist;
  // Walls down, and the four limits below stand down together — see `dollHouse` above for why it
  // is all four or none. `blockers` is the shell's own camera cage (js/world.js, camBlockFlat):
  // with the partitions drawn it is what stops the eye ending up outside the building looking at
  // the unlit backs of its walls; with them gone it is the one thing between the player and the
  // view the setting exists to give. `cameraBlockLimit` already reads `blockers || []`.
  const doll = dollHouse();
  const blockers = doll ? null : scene.blockers;
  // A room may declare that the space behind you is tighter than its own orbit distance — walking
  // into a 4.8 m shop off a 46 m hall is the case this exists for.
  //
  // It limits `dist` and never touches CAM.tDist. That is the whole design of it: tDist is the
  // player's, set by their own zoom, and a room that quietly overwrote it would take the zoom away
  // and never give it back — Math.min against a target is not reversible, so stepping out of the
  // shop would leave the camera stuck in close. This is a limit laid over the top of whatever the
  // player chose, released the moment they walk out.
  //
  // Eased rather than applied raw, because the limit itself moves as you walk and a hard cut at
  // the shopfront line is exactly the jolt this is meant to remove. NOLIMIT is a plain number
  // rather than Infinity so the ease out of a shop takes a sensible time instead of most of a
  // second travelling through distances no camera will ever use.
  const NOLIMIT = 12;
  // How far back the eye sits when you are in a lift car, and it is a measured number rather than
  // a chosen one — swept in 0.45 m steps with a render at each:
  //
  //   0.98   pinned to the car's own front corner. A shoulder, filling the frame.
  //   1.75   inside the thickness of the car's rear wall and the shaft wall behind it. A flat
  //          grey field with four floating labels on it and no body at all.
  //   2.20   clear of both. The whole figure, the car's side wall and the 广告 frame beside it.
  //
  // 2.30 is 2.20 with a little margin, because the distance to a wall changes with the yaw the
  // player is orbiting at and the dead band above is 45 cm wide. Overridable from the console as
  // `__liftCam` for the next time this needs sweeping.
  const LIFT_CAM = (window.__liftCam || 2.30);
  const wantNear = room.near || NOLIMIT;
  // 0.08 and not the 0.004 this used to be. The rate only ever showed on a room BOUNDARY, where
  // the target changes in one step rather than sliding: 客厅 2.97 to 书房 1.90 is 1.07 m of dolly,
  // and at 0.004 the first frame of it was 0.085 m — 5.1 m/s, which is the camera overtaking a
  // body that runs at 2.87. Crossing a doorway lurched. At 0.08 the same crossing opens at
  // 0.044 m a frame, just under the run speed, so the eye is a camera settling rather than a cut,
  // and .camsweep.js asserts exactly that bound by walking every doorway in the flat at a run.
  //
  // Slower costs lag where the target slides instead of stepping — the shopping centre moves
  // `ROOM.near` continuously with how far into a shop you stand (js/mall.js:4440), and 0.40 m per
  // metre walked at a run trails 0.46 m behind now against 0.22 m before. That is inside the
  // 0.35 m the shopfront band was already tolerating and it is the right trade: a limit that lags
  // is invisible, a limit that snaps is the jolt this ease exists to remove.
  //
  // And it is eased only when the body WALKED here. A lift opening on another storey, a place
  // change, or a harness parking the body all move the room out from under the camera by several
  // metres between one frame and the next, and easing that is a dolly out of a wall that nobody
  // asked for and that no player action produced. Measured on the twelve-storey acceptance sweep:
  // `.audit.js` parks a shot and waits 900 ms, and at this rate deck 4's 6.0 m room was still
  // 0.58 m short of its own limit when the shutter fired — a shared camera quietly reframed by a
  // number that has nothing to do with it. `CAM.near` is never reset by `setPlace`, so it arrives
  // carrying the last room's limit.
  //
  // Magnitude alone cannot tell the two apart: walking through a shopfront legitimately moves the
  // limit from NOLIMIT to 3.8 m in one step (js/mall.js:4440), which is larger than any teleport
  // inside this building. So ask the body instead. Half a metre in a frame is 10 m/s at the dt
  // clamp, three and a half times a run — nothing walks that far.
  const walked = CAM.px !== undefined && Math.hypot(P.x - CAM.px, P.z - CAM.pz) < 0.5
                 && (P.lift || 0) === CAM.plift;
  CAM.px = P.x; CAM.pz = P.z; CAM.plift = P.lift || 0;
  CAM.near = (CAM.near === undefined || !walked) ? wantNear
                                    : lerp(CAM.near, wantNear, 1 - Math.pow(0.08, dt));
  // 513. A room may also say what height to aim at. 1.10 is chest height and it is right under
  // 3 m of ceiling; under 2.60 m an eye 2.2-2.9 m back aimed at 1.10 gives a third of the frame
  // to the slab overhead. Eased on the same curve and gated the same way as CAM.near, and only
  // consulted by `tgt` while nothing else owns lookY — sitting, talking and the aeroplane all
  // set it away from 1.10 and keep it, which is the test used rather than a second flag.
  const wantLook = room.lookY || 1.10;
  CAM.rlook = (CAM.rlook === undefined || !walked) ? wantLook
                                    : lerp(CAM.rlook, wantLook, 1 - Math.pow(0.08, dt));
  if (!doll) dist = Math.min(dist, CAM.near);
  const clearWall = (i, lo, hi) => {
    if (Math.abs(dir[i]) < 1e-4) return;
    const s = dir[i] > 0 ? 1 : -1;
    const limit = s > 0 ? hi : lo;                  // the wall this ray is heading for
    const inner = (limit - s * 0.52 - tgt[i]) / dir[i];
    const outer = (limit + s * 0.18 - tgt[i]) / dir[i];
    if (inner > 0 && dist > inner && dist < outer) dist = inner;
  };
  // ---- 电梯, and why it is the one room that opts out of `clearWall`.
  //
  // `clearWall` parks the eye 0.52 m inside whichever wall it is heading for, which is right for
  // every room in this game and catastrophic for a lift car. The car is 1.66 across and 1.13 deep:
  // its back wall less 0.52 lands 7 cm behind the body's own head, and its side walls 28 cm. What
  // that gives you is not a cramped shot of a lift, it is the inside of the passenger — you cannot
  // see yourself at all, which is the whole complaint.
  //
  // A third-person camera cannot fit in a box that size, so it does not try. Every surface in this
  // renderer is single-sided and the note above says what follows from that: an eye behind the
  // car's rear wall sees straight through it, because the face pointing away from you is culled.
  // So the car keeps the eye a fixed distance back, through its own wall, and you get an ordinary
  // over-the-shoulder shot of a figure standing in a lit steel box. The ceiling limit below still
  // applies — it is continuous and only bites at a steep pitch — so the eye cannot end up in the
  // slab overhead.
  // Two things were tried before this one, and both are worth recording because they are the two
  // obvious ideas. Backing the eye off to 2.45 m puts it behind the whole car and most of the
  // shaft: what you get is your own body standing in the lobby with no lift around it. Stopping it
  // at the car's own rear surface puts it 0.5 m behind your head, which frames the back of it.
  // Neither shows you a person in a lift, because no orbit camera fits inside one.
  //
  // So it is not an orbit in here. The eye is pinned to the front corner of the car and pointed at
  // the body — the shot the camera in the ceiling of a real lift gives, and the only place inside a
  // box this size that can see a whole person. Yaw and pitch are written rather than eased, the way
  // js/cabin.js does it for a seated passenger, so the framing cannot drift into a wall.
  // ---- and why a small room opts out of `clearWall` for the same reason the lift car does.
  //
  // `clearWall` above is a BAND test, not a limit: it pulls the eye to 0.52 m inside the wall it
  // is heading for only while the eye sits between that plane and 0.18 m past the wall. Past the
  // band it does nothing and the eye simply goes through, because every surface here is
  // single-sided and the cutaway takes the wall away. So the band's outer edge is a step. Half a
  // degree of pan either side of it and the eye teleports from deep inside the room to out
  // through the wall, and back again on the way round.
  //
  // The step is the size of the band divided by how square-on the ray is — 0.70 / |dir|, which is
  // small only in a room far bigger than the orbit. `.camsweep.js` replays this solve over the
  // flat's ten rooms and the corridor and measures the worst step per room: before this gate every
  // one of the eleven stepped, 1.61 m in the 玄关 and 2.34 m in the 次卧, in rooms 1.0 to 5.35 m
  // across. That is the "panning is not perfect" complaint, and it is not a smoothing bug — the
  // ease at `CAM.dist` is framerate-correct and had nothing to fix.
  //
  // The pull-in is worth having where the inside of the room is still a shot: 0.52 m inside a 46 m
  // mall hall is a camera, 0.52 m inside a 1.20 m 书房 is the back of the player's head. So a room
  // that has already declared an orbit limit under WALL_MIN has declared itself too small to hold
  // the eye, and gets what the car below gets: the eye stays where the room asked, the wall in
  // front of it is culled, and the pan is continuous because nothing left in the solve is a step.
  //
  // Deliberately keyed on the room's own `near` and not on its box. A room states its limit; the
  // box is the cutaway's, and in the shopping centre it is the whole floor plate. A room that
  // declares no limit at all reads as NOLIMIT here and keeps the old behaviour exactly, which is
  // every room in every scene that has never set `near` — the change reaches only the rooms that
  // had already said they were tight.
  const WALL_MIN = 3.00;
  const inLift = room.id === 'lift';
  if (inLift) dist = Math.min(dist, LIFT_CAM);
  else if (!doll && (room.near || NOLIMIT) >= WALL_MIN) {
    clearWall(0, room.x0, room.x1);
    clearWall(2, room.z0, room.z1);
  }
  // And the ceiling, for the rooms that have a real one.
  //
  // Everywhere else this is deliberately not done: surfaces are single-sided, so an eye that rises
  // through a ceiling deletes it and looks down into the room, which is the behaviour a low
  // interior wants and gets for nothing. It only fails where the thing overhead is solid and
  // occupied — a deck slab with a gallery on top of it and a lit trough slung underneath. There
  // the eye does not escape into open air, it ends up inside the floor above.
  //
  // A plain Math.min rather than clearWall's in-band test: this limit has to be continuous. The
  // wall version snaps the eye inward only while it sits in the band just inside a wall, which is
  // right for a doorway you might reverse out of and wrong for a ceiling you are sliding along.
  // The floor on it is not decoration. `tgt[1]` is CAM.lookY plus P.lift, so on an upper deck it
  // is already several metres up; if a room ever reports a ceiling at or below the player's chest
  // — a bad deck number, a floor change landing a frame early — the division goes negative and the
  // camera swings round in front of the player's face. Clamped, the worst case is a close shot.
  if (!doll && room.ceil !== undefined && dir[1] > 1e-4)
    dist = Math.min(dist, Math.max((room.ceil - tgt[1]) / dir[1], 0.85));
  // Outdoors there is nothing to back out through: buildings are solid masses, and sliding the
  // eye inside one would show its far faces from behind. A straight ray used to solve that only
  // by snapping the camera toward the player's shoulders. At a corner there is usually a better
  // answer: move sideways along the obstruction, or rise over a low roof, and keep the chosen
  // orbit distance. Candidate directions are tested against the same blocker list; if none clears
  // it, shortening remains the safe fallback.
  const direct = cameraBlockLimit(tgt, dir, dist, blockers);
  let wantSlide = 0, wantRise = 0, bestClear = direct;
  if (direct < dist - 0.08 && blockers && blockers.length) {
    const severity = clamp((dist - direct) / 1.8, 0, 1);
    const side = 0.42 + severity * 0.46, rise = 0.42 + severity * 0.62;
    const right = [-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw)];
    // Try the side already in use first. On an exact corner both sides can be equally clear; this
    // stable ordering prevents the camera swapping shoulders from one frame to the next.
    const first = CAM.slide < -0.04 ? -1 : 1;
    const candidates = [
      [first * side, 0], [-first * side, 0],
      [0, rise], [first * side * 0.78, rise * 0.68], [-first * side * 0.78, rise * 0.68],
    ];
    for (const [slide, up] of candidates) {
      const vx = dir[0] * dist + right[0] * slide;
      const vy = dir[1] * dist + up;
      const vz = dir[2] * dist + right[2] * slide;
      const vl = Math.hypot(vx, vy, vz) || 1;
      const q = [vx / vl, vy / vl, vz / vl];
      const clear = cameraBlockLimit(tgt, q, dist, blockers);
      // A few centimetres of extra clearance is not worth visible camera motion. Sideways motion
      // is preferred to height when they solve the same amount because it preserves the horizon.
      const score = clear - Math.abs(slide) * 0.025 - up * 0.055;
      if (score > bestClear + 0.10) { bestClear = score; wantSlide = slide; wantRise = up; }
    }
  }
  const recover = wantSlide || wantRise;
  const recoverEase = 1 - Math.pow(recover ? 0.0015 : 0.018, dt);
  CAM.slide = lerp(CAM.slide, wantSlide, recoverEase);
  CAM.rise = lerp(CAM.rise, wantRise, recoverEase);
  const baseRight = [-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw)];
  let vx = dir[0] * dist + baseRight[0] * CAM.slide;
  let vy = dir[1] * dist + CAM.rise;
  let vz = dir[2] * dist + baseRight[2] * CAM.slide;
  const vl = Math.hypot(vx, vy, vz) || 1;
  // Preserve orbit distance: slide and rise change where the eye is, not how far away it feels.
  const viewDir = [vx / vl, vy / vl, vz / vl];
  dist = cameraBlockLimit(tgt, viewDir, dist, blockers);
  eye[0] = tgt[0] + viewDir[0] * dist;
  eye[1] = tgt[1] + viewDir[1] * dist;
  eye[2] = tgt[2] + viewDir[2] * dist;

  cam.aspect = R.resize(cv);
  // Basis from the resolved eye rather than from the requested orbit. A sideways obstruction
  // slide changes the real sightline; picking and spatial audio have to agree with what is drawn.
  cam.fwd = [-viewDir[0], -viewDir[1], -viewDir[2]];
  const rl = Math.hypot(viewDir[0], viewDir[2]) || 1;
  cam.right = [viewDir[2] / rl, 0, -viewDir[0] / rl];
  cam.up = [-viewDir[1] * viewDir[0] / rl, rl, -viewDir[1] * viewDir[2] / rl];

  // ---- light for this moment of the day, and then what the weather is doing to it
  //
  // Order matters here and it is the one thing to get right: `daylight` describes a clear day at
  // this hour, and `Weather.grade` is the cloud, haze and season laid over the top. Doing it the
  // other way round — grading first, then interpolating the sky keys — would wash the grading out
  // again on the next frame, because daylight() rewrites every field of `light` from the table.
  const wthr = Weather.tick(dt, minutes, day);
  if (place === 'cabin') Cabin.setWeather(wthr.kind, wthr.wet, wthr.wind);
  // The washing in the hutong is the one thing out there that shows which way the wind is blowing,
  // and it hung dead still through every gale the weather system has ever produced.
  if (place === 'street') {
    Street.setWind(wthr.wind);
    // The street's sound is mixed from the hour and the sky rather than switched on and off: the
    // road at the end of the alley swells through the rush hours, the sparrows stop at dusk, and
    // rain brings its own two layers and quietens the birds.
    TrainAudio.hutongMix(minutes / 60, wthr.wind, wthr.wet);
  }
  // Today's departure board, rolled once and then left alone — the call early-outs on the same day.
  // It is here rather than in the terminal's own tick because the weather that causes the delays is
  // Beijing's weather, not the airport's, and it has to have been ticked first.
  // Title-screen camera shots freely move the display clock. Do not let one of those decorative
  // times roll the player's real schedule before PLAY establishes the day.
  // Same trap, second door. `Airport` is Lazy too, so this line built the terminal on the first
  // frame after start on every session — 78 ms for a player sitting on a train. The schedule only
  // has to exist once something can read it, and the only reader is a booked flight, which cannot
  // exist until the flights panel has already built the terminal. `Lazy.onBuild` below covers that
  // first build; this keeps it current from then on.
  if (started && Lazy.built('Airport')) Airport.setDay(day, Weather.disruptFor(day));
  airportWatch();
  // The one place the weather does not reach. An aeroplane at cruise is above the deck — that is
  // most of the point of the window seat — so the cabin keeps the clean daylight curve, and the
  // cloud it does fly through is Cabin's own and is drawn on the window rather than in the light.
  const dl = place === 'cabin' ? daylight(minutes) : Weather.grade(daylight(minutes));
  const night = 1 - dl.day;
  // Wet ground, lying snow and the wind in the trees, for every surface in the world. Indoors it
  // is all switched off: a shop floor does not get wet because it is raining outside, and the one
  // interior with an outdoor material in it (the terminal's forecourt) reads better dry than with
  // a puddle inside the doors.
  R.setWeather(scene.indoor ? 0 : wthr.wet, scene.indoor ? 0 : wthr.lay,
               scene.indoor ? 0 : wthr.wind);
  R.setLeaf(Weather.leaf());
  skyChip(wthr);
  // The moon has been drawn in the sky with a phase and a glow for a long time and lit nothing:
  // a clear night shaded exactly as dark as the inside of a cupboard. Handed to the renderer as
  // an ambient term now, so a night street has a sky over it.
  R.setDaylight(dl.dir, dl.col, dl.amt, dl.sky, dl.gnd, night);
  if (place === 'home') {
    for (const g of World.skyGlass) g.color = dl.glass;
    // The haze the painted skyline is in. The front layer of towers is the same haze knocked
    // back, so the view out of the window keeps its two-layer depth.
    World.setCity(dl.city, dl.city.map(v => v * 0.70), 0.05 + 0.30 * night);
    World.setClockHands(minutes);
  } else if (place === 'street') {
    Street.setNight(night, dl.glass);
    // 406. Your own window in 十八号楼, seen from the pavement. `powered()` cannot be used here —
    // it short-circuits true whenever `place` is not 'home', which is every frame this line runs —
    // so the blackout is read off js/faults.js directly, and a 停电 darkens the flat from outside
    // as well as in. Guarded on the module because harnesses load game.js without js/faults.js.
    if (Street.setHomeLit) {
      const flatPower = typeof Disrupt === 'undefined' || !Disrupt.homePower
                        || !Disrupt.homePower(day, minutes);
      Street.setHomeLit(roomLit('home', { id: 'main' }) && flatPower);
    }
  } else {
    // The three interiors off the alley. Each one lifts its own lamps as the daylight through
    // its shopfront goes, and each has something that has to keep moving — steam off a pot, a
    // flicker on a screen — because a room where nothing at all moves reads as a photograph.
    // The extra two are the real zenith and horizon colours for this minute of the day, off the same
    // curve the sky dome outdoors is painted from. Every other interior ignores them; the aeroplane
    // uses them for what is out of the window, so a dawn departure has a dawn out of it instead of a
    // blue day and a black night with nothing in between.
    if (scene.setNight) scene.setNight(night, dl.skyA, dl.skyB);
  }

  // ---- 电梯, heard rather than seen.
  //
  // Driven off state and not off an event, because it is the one sound in that building with a
  // duration: you press the button on the landing and then you stand there, facing a shut steel
  // door, while the car comes to you. `near` swells it as the car closes on your floor and lets it
  // fall away again as it leaves, so which direction it is going is audible without a single
  // number on a screen. Off in every other room, and calling it with `false` when nothing is
  // moving is free.
  {
    const ls = place === 'home' && World.liftState ? World.liftState() : null;
    TrainAudio.liftTravel(!!(ls && ls.moving), ls ? ls.near : 0);
  }

  // ---- what the room itself is doing this frame.
  //
  // Out at the top level, and that is a fix rather than a tidy-up. This block used to sit inside
  // the `else` above, which was right when the only rooms with a `tick` were the three interiors
  // off the alley — and it stayed there while two more grew one. The flat's building is what makes
  // it matter: `World.tick` is the lift, and from inside that `else` it was never called once, so
  // the doors could not open, the car could not move and the 叮 could not sound. The whole of the
  // machinery in js/world.js has been unreachable for as long as it has existed.
  //
  // It also starts calling `Street.tick`, which has exactly the same history — the pigeons in the
  // hutong have never flown and the breakfast stall has never been wheeled away at ten o'clock.
  // Every room without a `tick` is unaffected, because that is what the guard is.
  //
  // The body goes in too: the station's gate flaps will not shut on somebody standing in the
  // lane, and nothing else that ticks looks at it.
  //
  // A scene may hand back the name of something that has just started, because a room knows when
  // its own events happen and this file is where every sound in the game is triggered from. The
  // station uses it to say a train has begun its run through the far tunnel.
  // Pause freezes the room as well as the player's clock. In particular, Cabin.tick is driven by
  // wall time; letting it run here flew and landed the aircraft behind an open pause screen while
  // game time and audio were stopped.
  if (scene.tick && !paused) {
    // The clock goes in as well as the wall time: the subway runs to a timetable and the timetable
    // is in game minutes, where everything else a scene ticks is in seconds since the page loaded.
    // The engine bed follows the aeroplane's own idea of how hard it is working, every frame, so
    // the noise and the climb cannot get out of step.
    if (place === 'cabin') TrainAudio.cabinLevel(Cabin.speed());
    const evs = scene.tick(now / 1000, P, minutes);
    // A room can hand back one name or a list of them: a train berthing at a platform makes a
    // chime, a station name and a pair of doors all on the same frame. The single-string form is
    // kept because every other scene still uses it.
    for (const ev of Array.isArray(evs) ? evs : evs ? [evs] : []) {
      if (ev === 'passing') TrainAudio.passing(Math.random() < .5);
      else if (ev === 'arrive') TrainAudio.arrive(station);
      else if (ev === 'doors-open') TrainAudio.doors('open');
      else if (ev === 'doors-close') TrainAudio.doors('close');
      // ---- the lift at home. 叮 when the doors open, a flat double warning before they shut,
      // and the panel the moment you are actually standing in the car. The sound is the whole
      // point of the first of these: a lift you have called is behind you while you walk to it,
      // and the 叮 is how you know it arrived without turning round.
      else if (ev === 'lift-ding') TrainAudio.liftCue('ding');
      else if (ev === 'lift-close') TrainAudio.liftCue('close');
      // The car has started. If the floor panel is somehow still up — opened, then left open while
      // the doors timed out and shut — it is now a list of choices about a lift that has gone.
      else if (ev === 'lift-go') { TrainAudio.liftCue('move'); if (Pick.isOpen) Pick.close(); }
      else if (ev === 'lift-in') openLiftPanel();
      // The platform loudspeaker, counting the next train down. The station decides when to say
      // something and which of its own lines to say; this hands it to the horn.
      else if (ev.startsWith('say:')) TrainAudio.notice(Metro.NOTICES[ev.slice(4)]);
      // And the terminal's, calling flights. Same shape, different building: its own announcer,
      // its own tone and its own room, so the two are never confused for each other. The key is
      // everything after `air:` — `board:CA1502`, `hall:2` — and it is looked up in the scene
      // that composed it, exactly as the platform's is.
      // `hall:` is the filler — luggage reminders and the like — and is lower priority than any
      // flight call, so it is marked 'lo' and the terminal drops or defers it rather than talking
      // over a boarding call it landed on top of.
      // And the shopping centre's. Nothing it says is actionable — no gate, no platform, nothing
      // you can miss — so unlike the terminal it puts the line on screen with its English, and
      // unlike the platform it is worth reading rather than just hearing. That is the whole
      // difference between an announcement you have to obey and one you are only overhearing,
      // and overhearing is the kind there is most of in a real day.
      else if (ev.startsWith('mall:')) {
        const key = ev.slice(5);
        const text = Mall.NOTICES[key];
        if (text) {
          TrainAudio.mallNotice(text);
          lastCall = { key, text, room: 'mall' };
          const en = Mall.NOTICE_EN[key];
          toast(`广播 · ${text}` + (en ? `<br><span class="dim">${en}</span>` : ''));
          // Into the notebook as well, because a promotion heard once at speed is exactly the
          // thing the diary exists to let somebody come back to.
          logDiary(text, en || '', 'mall');
        }
      }
      else if (ev.startsWith('air:')) {
        const key = ev.slice(4);
        // Gate-bearing calls have a second baked reading for moved flights. Resolve through the
        // schedule instead of indexing NOTICES directly, or the audio can say the old gate while
        // the board and the listening answer have already switched to the new one.
        const text = Airport.noticeOf(key, minutes);
        TrainAudio.airNotice(text, key.startsWith('hall') ? 'lo' : 'hi');
        // Kept so it can be heard again. A learner's first problem with a public address is not
        // the vocabulary, it is that it happens once at full speed and then it is gone; G undoes
        // exactly that, and it is the difference between an announcement being atmosphere and
        // being something you can work on.
        lastCall = { key, text };
        // And if that call was about your own flight and you still do not know your gate, the
        // room asks you what it just said. The clip is playing underneath the panel — that is
        // the point of putting the panel up now rather than after — and getting it right is the
        // only thing in this game that opens a door because a sentence was understood.
        const mine = flight && flight.checked &&
                     key.slice(key.indexOf(':') + 1) === flight.f.no;
        // 登机口变更. The gate has moved, and the gate you learned an hour ago is now somebody
        // else's. Whatever you thought you knew is taken away here — that is the entire point of
        // the announcement, and a gate change that did not cost you your certainty would be a
        // sound effect. The check comes straight back up with the new number in it.
        if (mine && key.startsWith('change:')) {
          // Nothing is cleared here: `knowsGate` compares the number you were told against the
          // number that is true now, so the moment the gate moved you stopped knowing it. This
          // only says so out loud.
          toast('登机口变更 · <span class="dim">your gate has moved — listen</span>');
          logDiary(`${flight.f.to}那班换登机口了。`,
                   `They moved the gate on the ${flight.f.en} flight.`, 'gatechange');
        }
        if (mine && !knowsGate() && /^(change|board|final|class|rows):/.test(key))
          askGate(flight.f);
        // A boarding call is the one announcement that moves people. Each seated airside passenger
        // who is not already on an errand gets up and walks to the gate, so the loudspeaker causes
        // the same thing a real one does — the hall thins toward the door. Staggered shoulders so
        // they queue rather than stack, and only those not already mid-walk, so a second flight's
        // call does not yank somebody out of the first queue.
        if (key.startsWith('board:')) boardPassengers();
      }
      // ---- the aeroplane. The cabin runs its own sequence and says what it wants played; this
      // is where those become the captain's voice, the belt chime and the crew's two rounds.
      else if (ev.startsWith('cap:')) TrainAudio.captain(Cabin.BRIEF[+ev.slice(4)]);
      else if (ev === 'belt:on' || ev === 'belt:off') TrainAudio.cabinChime();
      // The gear, the flaps and the wheels on the runway.
      else if (ev.startsWith('cue:')) TrainAudio.cabinCue(ev.slice(4));
      // Rough air. The sign chimes, somebody tells you to sit down, and it is the one thing on this
      // aeroplane that happens because of the weather rather than because of the timetable.
      else if (ev === 'rough:on') {
        TrainAudio.cabinChime();
        toast('颠簸 · <span class="dim">turbulence — the belt sign is on</span>');
        crewSay('先生，请系好安全带。');
      }
      else if (ev === 'rough:off') TrainAudio.cabinChime();
      else if (ev === 'crew:demo') crewSafetyDemo();
      else if (ev === 'crew:check') crewBeltCheck();
      else if (ev === 'crew:snack') crewSnackRound();
      else if (ev === 'crew:secure') crewSecureRound();
      else if (ev === 'event:cabin') cabinEvent();
      else if (ev === 'arrive:gate') cabinArrival();
      else if (ev === 'land') landFlight(); // backward compatibility with old saves/tests
      else if (ev.startsWith('phase:')) {
        const v = Cabin.view();
        toast(`${v.phaseZh} · <span class="dim">${v.phaseEn}</span>`);
      }
    }
  }
  // World.setFloor happens inside the home lift's tick, not through setPlace(), so this is the
  // first frame on which the HUD, visit goal and autosave can learn that the doors opened on a new
  // storey. An empty car arriving to a call does not change World.level() and therefore stays quiet.
  if (place === 'home') syncHomeFloor(true);
  R.setTime(now);
  // Dawn and dusk are the hard cases outdoors: the sky is still bright while nothing on the
  // ground is lit yet, so the street silhouettes into a black trench. One stop back at the
  // twilight ends of the curve, and none at noon or in the middle of the night.
  const twilight = 1 - Math.abs(dl.day * 2 - 1);
  // Indoors, daylight is normally shaped by the one window the shader models: everything outside
  // that beam is knocked down, and everything far from that wall is knocked down again. That is
  // right for a flat and wrong for a glass-roofed atrium 36 metres deep, where the far corner came
  // out black. A place that is lit from above says so and gets even daylight instead.
  R.setEnv({ indoor: scene.indoor,
             winOn: scene.winOn !== undefined ? scene.winOn : scene.indoor,
             expose: scene.expose * (scene.indoor ? 1 : 1 + 0.35 * twilight),
             // Fog closes the haze in rather than replacing it. A scene that can see forty metres
             // in the clear sees a dozen in a winter fog and still sees further than one that was
             // authored short — the number is the place's, and the weather only ever scales it.
             fogNear: scene.fogNear * (scene.indoor ? 1 : Weather.fogScale()),
             fogD: scene.fogD * (scene.indoor ? 1 : Weather.fogScale()), fogCol: dl.skyB,
             // How wide a crease is, in metres. A place may say; a room is smaller than a street.
             aoRadius: scene.aoRadius,
             // Forwarded at last. js/world.js and js/mall.js have both been setting `aoAmt` for a
             // long time and it has never once reached the shader, because only `aoRadius` was
             // passed on — so the food court's haze fix and the lobby's were both no-ops.
             aoAmt: scene.aoAmt,
             // And how much of the frame this place expects to be emitter — see bloomScale.
             bloom: scene.bloom });

  const proj = M.persp(CAM.fov, cam.aspect, scene.near, scene.far);
  // The aeroplane, vibrating. Applied to the eye and the look-at point together, so the whole view
  // translates the way a cabin does rather than swivelling about a point the way a handheld camera
  // would. It is millimetres at cruise and a couple of centimetres in a bump, and it is the single
  // thing that stops the cabin reading as a still room with sound playing over it.
  if (place === 'cabin' && scene.shakeAt) {
    const k = scene.shakeAt(now / 1000);
    if (k) for (let i = 0; i < 3; i++) { eye[i] += k[i]; tgt[i] += k[i] * .8; }
  }
  const view = M.lookAt(eye, tgt);
  R.begin(proj, view, eye, scene.indoor ? dl.bg : dl.skyB);
  if (!scene.indoor) R.dome(eye, dl.skyA, dl.skyB);
  const vpNow = R.vp;

  // when the camera has backed out through a wall, hide the props stuck to that
  // wall as well, so the cutaway view stays clear
  // The deck being drawn, for the per-deck cull in `hiddenProp`. Only the tower has decks; every
  // other scene leaves this at -1 and is unaffected.
  drawDeck = (place === 'home' && scene.level) ? scene.level() : -1;
  if (drawDeck >= 0) syncMovingCulls(scene);
  // Build packs batch cull centres once for the overwhelmingly static world. Props explicitly
  // marked dynamic are the exception: traffic and similar movers rewrite `p.cx/cy/cz` with their
  // matrices, so refresh only their recorded slots before the shadow and colour visibility tests.
  if (scene.syncDynamicCulls) scene.syncDynamicCulls();
  // The cut box has to be a box the BODY is inside. `hiddenAt` hides a 0.42 m band inside
  // whichever face the eye backed out through, which only lands on the wall between the eye and
  // the player when the player is in that box. `room` comes from `roomAt` *with* hysteresis
  // (js/world.js:378) — every boundary in the flat keeps you in the room you came from for
  // another 0.16-0.18 m, deliberately, so a doorway swaps the lamp once instead of four times.
  // At the flat/corridor seam that leaves `room` = 走廊 while the body stands 0.10 m inside the
  // 玄关: the band is then measured off the corridor's far face at z 4.90 and the flat's north
  // wall at z 3.20 — the one filling the screen — is not in it. Reported as "the cutaway does
  // not fire in the 玄关"; the same fault sits at every interior doorway, and in the other
  // direction it *over*-cuts, deleting the wall you are standing behind in the corridor.
  //
  // Cheap because it only re-asks when the box is provably wrong, so every scene whose `roomAt`
  // has no hysteresis (all of them except this one) is bit-identical.
  cutRoom = room.cut || room;
  if (P.x < cutRoom.x0 || P.x > cutRoom.x1 || P.z < cutRoom.z0 || P.z > cutRoom.z1) {
    const ex = scene.roomAt && scene.roomAt(P.x, P.z, null, true);
    const eb = ex && (ex.cut || ex);
    if (eb && P.x >= eb.x0 && P.x <= eb.x1 && P.z >= eb.z0 && P.z <= eb.z1) cutRoom = eb;
  }
  // Walls down switches the cutaway off outright, and that is the trap this feature had to avoid
  // rather than survive. From above the flat the eye is outside every room's box on both axes, so
  // `hiddenAt` would be asking of every prop in the building whether it lies past a 0.42 m band —
  // and a prop is judged by one point, which is how a 12.00 x 8.20 m floor slab came to be deleted
  // from nine of ten rooms before `nocut` existed. `nocut` covers the shell; nothing covers the
  // furniture, and a doll's house that hides the furniture in the other nine rooms is not one.
  // There is also nothing left for it to do: the only surfaces between an overhead eye and the
  // rooms are the partitions, already gone, and the ceiling, which is single-sided and therefore
  // invisible from on top of it.
  const cut = scene.cutaway && !dollHouse();
  hideX = cut && eye[0] > cutRoom.x1 ? 1 : cut && eye[0] < cutRoom.x0 ? -1 : 0;
  hideZ = cut && eye[2] > cutRoom.z1 ? 1 : cut && eye[2] < cutRoom.z0 ? -1 : 0;

  // ---- what is selected: the cursor wins, otherwise whatever you are standing at
  reachThing = null; useThing = null;
  nearUsables.length = 0;
  let bestScore = Infinity, bestUse = Infinity;
  for (const th of scene.things) {
    if (!thingOnCurrentDeck(th)) continue;
    const d = Math.hypot(th.focus[0] - P.x, th.focus[1] - P.z);
    if (d > th.reach) continue;
    const score = d / th.reach;                 // closest relative to its own reach
    if (score < bestScore) { bestScore = score; reachThing = th; }
    // The nearest usable thing is tracked separately, or a desk would shadow the computer
    // standing on it and there would be no way to reach the thing you actually want.
    if (canUse(th) && inReach(th)) {
      nearUsables.push(th);
      if (score < bestUse) { bestUse = score; useThing = th; }
    }
  }
  // a label can be hidden while the cursor still sits on it; do not let hover stick
  if (hoverLabel && hoverLabel.el.style.pointerEvents === 'none') hoverLabel = null;
  hoverThing = hoverLabel || pickUnderCursor();
  activeThing = hoverThing || reachThing;
  // Pointing at something usable within arm's length aims Q at that instead.
  if (activeThing && canUse(activeThing) && inReach(activeThing)) useThing = activeThing;
  // 465. And a Tab choice outranks proximity until the player aims at something or walks away
  // from it. Aiming clears it, because a cursor is a stronger statement than a key pressed four
  // seconds ago; walking out of reach clears it because the list no longer holds it.
  if (hoverThing) cyclePick = null;
  if (cyclePick && nearUsables.indexOf(cyclePick) >= 0) { activeThing = cyclePick; useThing = cyclePick; }
  else cyclePick = null;
  // A man standing in your doorway holding your dinner outranks the doorway itself. The door's
  // focus point sits half a metre further into the room than he does, so on distance alone Q
  // would offer to step outside past him, which is nobody's idea of answering the door. Aiming
  // the cursor at something else still wins — this only decides what Q means by default.
  if (!hoverThing && courier.here && place === 'home' && World.level() === 2 &&
      inReach(courier.th)) useThing = courier.th;
  // On the aeroplane, your own seat wins — and it has to be settled here rather than by distance,
  // because distance cannot settle it at all.
  //
  // Every seat in a block is reached from the same standing spot in the aisle: A, B, C and D all
  // have their focus at x −1.52, and E, F and G all have theirs at +1.52. The loop above picks the
  // nearest focus and, on a tie, keeps the first one it saw — which is A on the port side and E on
  // the starboard, every time, from every position. So only seat A was ever sittable. The boarding
  // card issues A, B or C, which meant two cards in three put you in front of a seat labelled as
  // yours that Q flatly refused to let you into, because Q was being offered seat A and correctly
  // telling you it was somebody else's.
  //
  // Aiming the cursor at a different seat still wins; this only decides what Q means by default.
  if (place === 'cabin' && flight && flight.seat && !hoverThing) {
    const own = Cabin.seatOf(flight.seat);
    if (own && own.th && inReach(own.th)) {
      useThing = own.th;
      if (!Cabin.flying()) activeThing = reachThing = own.th;
    }
  }
  paintTouchReady();
  cv.style.cursor = hoverThing ? 'pointer' : 'default';
  const best = activeThing;
  const pulse = 0.20 + Math.sin(now / 260) * 0.08;

  // ---- world
  // Outside there are well over a thousand props and most of them are behind you or off the
  // side of the frame. Each one costs a draw call and a dozen uniform writes, so anything
  // that cannot possibly be on screen is dropped before it gets there. The margin is the
  // prop's own radius converted to clip space, which is why a whole tower block does not
  // pop out at the edge of the view.
  tickFixtures(dt, now);      // doors, screens and steam, before anything is drawn
  // The sun and colour passes share one instant. Computing the player's eased action pose twice
  // advanced its state twice per frame and did the same allocation/math twice; only the shadow's
  // mesh density needs to differ.
  const playerFramePose = showBody ? computePose(now, dt) : null;
  const fy = 1 / Math.tan(CAM.fov / 2), fx = fy / cam.aspect;
  drawnProps = 0;
  // Everything solid, painted once for the shadow map and once for the screen. The two passes
  // have to agree about what exists or objects cast shadows they are not standing in — but they
  // do not have to agree about what is *visible*, and they must not: the camera frustum is the
  // wrong test for the shadow pass, since a roof behind you still throws a shadow in front of
  // you. So the depth pass tests against the light's own box instead, which is both correct and
  // cheaper than projecting every prop.
  const paintScene = (forShadow) => {
  const lb = forShadow && R.lightBox, PQ = Perf.q;
  // ---- the batched props, in one call per material instead of one per prop.
  //
  // Main pass only. The shadow pass below still walks every prop individually, because it
  // culls against the light's box rather than the camera and would need its own batches; doing
  // one half first means a mistake here shows as wrong shading, not wrong shading and wrong
  // shadows at once.
  //
  // Survivors are written into one scratch array and uploaded once. The main-pass survivor
  // *indices* are also retained while the eye is inside a small conservative camera cell; the
  // mall otherwise repeats 34k identical frustum tests every frame. Only indices are cached —
  // matrices, colours, alpha and glow are copied live below on every draw, so escalators, jets,
  // event lighting and every other animated prop keep moving at the display rate.
  const batched = scene.batches && R.instancing.ok;
  // Shop portal visibility is a colour-pass optimisation. Interior shadow casters keep the exact
  // light-space behaviour they had before; only camera-visible instance survivors are reduced.
  // The controller exists on the mall alone and marks only tenant-module fit-outs, never the
  // landlord shell, window routes, glazing, fascia or door reveals.
  const portalFrame=!lb&&place==='mall'&&scene.portalCull?scene.portalCull.begin(eye):null;
  // Is anything being hidden at all this frame? `hiddenProp` can only answer yes if the camera
  // has backed out through a wall (hideX/hideZ) or if we are in the tower, where twelve floors
  // share one footprint and eleven of them must not draw. Outdoors neither is true, and asking
  // the question thirty thousand times to be told no thirty thousand times was most of a
  // millisecond a frame. `drawDeck` and `hideX/hideZ` are both set once a frame, above.
  const anyHidden = drawDeck >= 0 || hideX !== 0 || hideZ !== 0 ||
    !!(scene.expansion && scene.expansion.renderChunks);
  // ---- the depth pass, batched.
  //
  // A different visibility test from the one below — against the light's box, not the camera —
  // and a different set of exclusions, which is why it could not simply share the loop. Whole
  // batches drop out here rather than individual props: whether a thing casts at all is decided
  // by its mode, and mode is part of the batch key, so a batch either casts or it does not.
  //
  // Both loops read the prop's centre and radius out of `b.cull` — one Float32Array per batch,
  // packed at build time (with the lift subset refreshed above) — rather than off the prop objects. See the note in js/build.js: there
  // are two hundred distinct prop shapes in this game and `p.cx` is a megamorphic load. The
  // object itself is only touched once a prop has survived, which is where its matrix and colour
  // have to be read from anyway because those still change while the game runs.
  // How small a thing may be and still be drawn. See the note beside the ladder in js/perf.js:
  // `pxK` turns "under this many pixels high" into one comparison against the bounding radius,
  // and `shadowR` is the depth pass's equivalent, measured against the shadow map's texel size
  // rather than the screen's. `cv.height` is the drawing buffer, so both follow the render scale
  // the ladder is already applying without having to be told about it.
  const pxK = 2 * (PQ.minPx || 0) / (fy * (cv.height || 900));
  // Cars, bicycles and their riders are authored out of several small moving pieces. Applying
  // the fallback tier's aggressive *static-detail* cutoff to those pieces made a complete cycle
  // disappear one tube/wheel at a time in the distance. Dynamic batches keep a separate apparent-
  // size floor: tiny facial/vehicle fittings may drop, but wheels, frames and bodies stay intact.
  const dynamicPxK = 2 * (PQ.dynamicMinPx === undefined ? (PQ.minPx || 0) : PQ.dynamicMinPx) /
    (fy * (cv.height || 900));
  const shadowR = Math.max(PQ.smallR * 1.4, PQ.shadowMinR || 0);
  if (batched && lb) {
    const batchRun = R.beginBatches();
    const smallR = shadowR, lb0 = lb[0], lb1 = lb[1], lb2 = lb[2], lb3 = lb[3];
    try {
      for (const b of scene.batches) {
        const mo = b.opt.mode || 0;
        // Lit panels, the fake contact shadows and light pools, and the sky. None of them is a
        // solid object and a couplet casting its own text onto the gate behind it would be absurd
        // — which is exactly what `b.glyph` is here to prevent now that writing batches.
        if (b.glyph || mo === 1 || mo === 2 || mo === 5 || mo === 8 || mo === 12) continue;
        const props = b.props, cull = b.cull, cnt = props.length;
        let n = 0;
        for (let i = 0, j = 0; i < cnt; i++, j += 4) {
          const cy = cull[j + 1], r = cull[j + 3];
          if (cy - r > lb2) continue;
          if (Math.abs(cull[j] - lb0) - r > lb3) continue;
          if (Math.abs(cull[j + 2] - lb1) - r > lb3) continue;
          if (r < smallR) continue;
          const p = props[i];
          // The caster height cap, the same test R.draw makes on a single prop. lb[2] is castMax:
          // only street-level things cast, or the six-storey block puts the whole alley in shade.
          const m = p.m;
          if (m[13] > lb2) continue;
          if (anyHidden && hiddenProp(p)) continue;
          const o = n * 26;
          if (o + 26 > instScratch.length) {
            const bigger = new Float32Array(Math.max(2048, (o + 26) * 2));
            bigger.set(instScratch); instScratch = bigger;
          }
          // Only the matrix. The depth shader reads nothing else, and the six floats after it
          // keep whatever the visible pass left there.
          for (let k = 0; k < 16; k++) instScratch[o + k] = m[k];
          n++;
        }
        if (n) R.drawBatch(b.mesh, instScratch, n, b.opt);
      }
    } finally { if (batchRun) R.endBatches(); }
  }
  if (batched && !lb) {
    const batchRun = R.beginBatches();
    const far = scene.far, smallFar = PQ.smallFar, smallR = PQ.smallR;
    const v0 = vpNow[0], v4 = vpNow[4], v8 = vpNow[8], v12 = vpNow[12];
    const v1 = vpNow[1], v5 = vpNow[5], v9 = vpNow[9], v13 = vpNow[13];
    const v3 = vpNow[3], v7 = vpNow[7], v11 = vpNow[11], v15 = vpNow[15];
    const bestTag = best && best.tag;
    // A moving camera invalidates the whole scene together, rather than making every material
    // batch perform the same comparisons. Eight centimetres is about three walking frames;
    // 0.012 rad is under one degree. Test the resolved view direction, not CAM.yaw/pitch: camera
    // collision can slide or raise the eye and change the real sightline without changing either
    // requested orbit angle. The guard used by the cull below is wider than both, so an object is
    // already in the retained set before it reaches the visible edge.
    let visEpoch = -rigFrame;
    // The mall spends most views outside its cutaway bounds, so `anyHidden` is normally true.
    // Its frustum candidates are still safe to cache because cutaway hiding is evaluated live on
    // that much smaller candidate set below. The tower is kept out: its lift updates cull centres
    // every frame, while ordinary unhidden scenes have immutable batch cull data.
    const cacheable = !anyHidden || (place === 'mall' && drawDeck < 0);
    if (cacheable) {
      const c = scene._mainBatchVisibility || (scene._mainBatchVisibility = {
        epoch:0, x:Infinity, y:Infinity, z:Infinity, f0:0, f1:0, f2:0,
        q:null, fx:0, fy:0, far:0, pxK:0, rebuilds:0, reuses:0,
      });
      const dx = eye[0] - c.x, dy = eye[1] - c.y, dz = eye[2] - c.z;
      const dirDot = cam.fwd[0] * c.f0 + cam.fwd[1] * c.f1 + cam.fwd[2] * c.f2;
      if (dx * dx + dy * dy + dz * dz > 0.08 * 0.08 || dirDot < 0.999928 ||
          c.q !== PQ || Math.abs(c.fx - fx) > 0.001 || Math.abs(c.fy - fy) > 0.001 ||
          c.far !== far || Math.abs(c.pxK - pxK) > 1e-9) {
        c.x = eye[0]; c.y = eye[1]; c.z = eye[2];
        c.f0 = cam.fwd[0]; c.f1 = cam.fwd[1]; c.f2 = cam.fwd[2];
        c.q = PQ; c.fx = fx; c.fy = fy; c.far = far; c.pxK = pxK;
        c.epoch++; c.rebuilds++;
      } else c.reuses++;
      visEpoch = c.epoch;
    }
    try {
      for (const b of scene.batches) {
        const props = b.props, cull = b.cull, cnt = props.length;
        const batchSmallFar = b.dynamic ? Infinity : smallFar;
        const batchSmallR = b.dynamic ? 0 : smallR;
        const batchPxK = b.dynamic ? dynamicPxK : pxK;
        const dynamicCullEpoch = b.dynamicCullEpoch || 0;
        let visible = b._mainVisible;
        if (!visible || visible.epoch !== visEpoch ||
            visible.dynamicCullEpoch !== dynamicCullEpoch || visible.ids.length < cnt) {
          const ids = visible && visible.ids.length >= cnt ? visible.ids : new Uint32Array(cnt);
          let vn = 0;
          // Four per cent of depth plus the eight-centimetre camera cell expressed in clip-space
          // covers sideways motion across the camera cell. A half-metre depth band also covers a
          // far, sideways point changing view depth
          // while the direction remains inside 0.012 rad. These are guard bands, not extra view
          // distance: cached members meet the exact tests again when the eye crosses a cell edge.
          for (let i = 0, j = 0; i < cnt; i++, j += 4) {
            const cx = cull[j], cy = cull[j + 1], cz = cull[j + 2], r = cull[j + 3];
            const w = v3 * cx + v7 * cy + v11 * cz + v15;
            const edge = cacheable ? Math.abs(w) * 0.04 + 0.08 * Math.max(fx, fy) : 0;
            const depthEdge = cacheable ? 0.5 : 0;
            if (w + r < 0.05 - depthEdge || w - r > far + depthEdge) continue;
            if (w > r) {
              const x = v0 * cx + v4 * cy + v8 * cz + v12;
              if (Math.abs(x) > w + r * fx + edge) continue;
              const y = v1 * cx + v5 * cy + v9 * cz + v13;
              if (Math.abs(y) > w + r * fy + edge) continue;
            }
            if (w > batchSmallFar + (cacheable ? 0.5 : 0) && r < batchSmallR) continue;
            if (r < w * batchPxK * (cacheable ? 0.90 : 1)) continue;
            ids[vn++] = i;
          }
          if (visible) {
            visible.ids = ids; visible.n = vn; visible.epoch = visEpoch;
            visible.dynamicCullEpoch = dynamicCullEpoch;
          } else visible = b._mainVisible = {
            ids, n:vn, epoch:visEpoch, dynamicCullEpoch,
          };
        }
        // The Mall is mostly immutable joinery, merchandise and architecture. Re-reading 26
        // fields from twelve thousand heterogeneous prop objects and repacking them every frame
        // cost more CPU than the complete cast. Retain the packed survivors while the visibility
        // cell and cutaway state are unchanged; only props explicitly registered by Mall's motion
        // layer, and lamps when the time-of-day generation changes, are refreshed in place.
        const retain = place === 'mall' && scene.instanceState;
        if (retain) {
          let packed=b._mainPacked;
          const glyphVersion=b.glyph?Glyphs.version:0;
          const same=packed&&packed.epoch===visEpoch&&packed.hideX===hideX&&
            packed.hideZ===hideZ&&packed.drawDeck===drawDeck&&packed.room===room&&
            packed.bestTag===bestTag&&packed.glyphVersion===glyphVersion&&
            packed.dynamicCullEpoch===dynamicCullEpoch&&
            packed.portalVersion===(portalFrame?portalFrame.version:-1);
          let rebuilt=false,changed=false;
          if(!same) {
            const cap=Math.max(1,visible.n);
            const data=packed&&packed.data.length>=cap*26?packed.data:new Float32Array(cap*26);
            const ids=packed&&packed.ids.length>=cap?packed.ids:new Uint32Array(cap);
            const always=packed?packed.always:[],night=packed?packed.night:[],
              highlight=packed?packed.highlight:[];
            always.length=0;night.length=0;highlight.length=0;
            const portalStats=portalFrame?portalFrame.empty(packed&&packed.portalStats):null;
            let n=0;
            for(let vi=0;vi<visible.n;vi++) {
              const id=visible.ids[vi],p=props[id];
              if(anyHidden&&hiddenProp(p))continue;
              if(portalFrame&&portalFrame.test(p,portalStats))continue;
              ids[n]=id; packPropInstance(data,n*26,p,b.glyph);
              if(p._instDynamic)always.push(n);
              else if(p._instNight)night.push(n);
              if(bestTag&&p.tag===bestTag)highlight.push(n);
              n++;
            }
            if(!packed)packed=b._mainPacked={};
            packed.epoch=visEpoch;packed.hideX=hideX;packed.hideZ=hideZ;
            packed.drawDeck=drawDeck;packed.room=room;packed.bestTag=bestTag;
            packed.glyphVersion=glyphVersion;packed.dynamicCullEpoch=dynamicCullEpoch;
            packed.portalVersion=portalFrame?portalFrame.version:-1;
            packed.portalStats=portalStats;
            packed.data=data;packed.ids=ids;packed.n=n;
            packed.always=always;packed.night=night;packed.highlight=highlight;
            packed.nightVersion=scene.instanceState.night;
            rebuilt=true;changed=true;
          }
          if(!rebuilt) {
            if(packed.nightVersion!==scene.instanceState.night) {
              for(const slot of packed.night)
                packPropInstance(packed.data,slot*26,props[packed.ids[slot]],b.glyph);
              packed.nightVersion=scene.instanceState.night;
              changed=packed.night.length>0;
            }
            if(packed.always.length) {
              for(const slot of packed.always)
                packPropInstance(packed.data,slot*26,props[packed.ids[slot]],b.glyph);
              changed=true;
            }
          }
          // Selection pulse is the only display-rate change an otherwise static prop can acquire.
          // Store an absolute value, not an increment, so the retained record never accumulates it.
          for(const slot of packed.highlight) {
            const p=props[packed.ids[slot]];
            packed.data[slot*26+21]=(p.glow||0)+pulse;
          }
          if(packed.highlight.length)changed=true;
          if(portalFrame)portalFrame.merge(packed.portalStats);
          if(changed)b._instanceVersion=(b._instanceVersion||0)+1;
          if(packed.n) {
            // GPU residency is deliberately whole-batch only. Mixing one animated lamp into a
            // retained VBO would either freeze it or require splitting material order; those
            // batches keep the shared live upload path. Static opaque batches can reuse one VBO.
            const resident=!b.alpha&&!packed.always.length&&!packed.night.length&&
              !packed.highlight.length?b:null;
            R.drawBatch(b.mesh,packed.data,packed.n,b.opt,resident);
            drawnProps+=packed.n;
          }
        } else {
          let n=0;
          for(let vi=0;vi<visible.n;vi++) {
            const p=props[visible.ids[vi]];
            // Hidden walls and decks can change without moving the eye far enough to invalidate a
            // frustum cell. Keep this exact test live outside retained Mall batches.
            if(anyHidden&&hiddenProp(p))continue;
            if(portalFrame&&portalFrame.test(p))continue;
            const o=n*26;
            if(o+26>instScratch.length) {
              const bigger=new Float32Array(Math.max(2048,(o+26)*2));
              bigger.set(instScratch);instScratch=bigger;
            }
            packPropInstance(instScratch,o,p,b.glyph);
            if(bestTag&&p.tag===bestTag)instScratch[o+21]=(p.glow||0)+pulse;
            n++;
          }
          if(n) {R.drawBatch(b.mesh,instScratch,n,b.opt);drawnProps+=n;}
        }
      }
    } finally { if (batchRun) R.endBatches(); }
  }
  // Everything no batch took — glyphs, and anything see-through. `scene.loose` is that list,
  // built once; the loop used to walk all of `scene.props` and skip the nine in ten it had
  // already drawn as part of a batch.
  for (const p of (batched && scene.loose ? scene.loose : scene.props)) {
    // Already drawn above, as part of a batch.
    if (batched && p.batch) continue;
    if (lb) {
      if (p.cy - p.r > lb[2]) continue;                 // above the caster height
      if (Math.abs(p.cx - lb[0]) - p.r > lb[3]) continue;
      if (Math.abs(p.cz - lb[1]) - p.r > lb[3]) continue;
      // A shadow too small to notice is not worth a draw call either.
      if (p.r < shadowR) continue;
      if (anyHidden && hiddenProp(p)) continue;
      R.draw(p.mesh, p.m, p.color, {
        mode: p.mode || 0, alpha: p.alpha === undefined ? 1 : p.alpha,
        gloss: p.gloss, round: p.round,
        rect: p.ch ? Glyphs.rect(p.ch,p.glyphPrimary) : null,
      });
      continue;
    }
    // Projected in place rather than through M.project, which returns a fresh {x,y,w}: one
    // small object per prop per frame is thirty thousand of them a frame in the shopping
    // centre, and the scavenge that eventually collects them is what the 200 ms worst frames
    // in .fpscheck.js were made of.
    const cx = p.cx, cy = p.cy, cz = p.cz, pr = p.r;
    const qw = vpNow[3] * cx + vpNow[7] * cy + vpNow[11] * cz + vpNow[15];
    // The whole bounding sphere has to be outside the frustum, not just its centre. A
    // pavement forty metres across has its centre behind the eye long before it leaves the
    // frame, and testing the centre alone deleted the ground from under the player — leaving
    // the sky's clear colour, which outdoors is very nearly white.
    if (qw + pr < 0.05 || qw - pr > scene.far) continue;
    // Sideways only once the sphere is entirely in front of the eye. While it straddles the
    // eye plane the projection is meaningless and the test would throw away what fills the
    // screen.
    if (qw > pr) {
      const qx = vpNow[0] * cx + vpNow[4] * cy + vpNow[8] * cz + vpNow[12];
      if (Math.abs(qx) > qw + pr * fx) continue;
      const qy = vpNow[1] * cx + vpNow[5] * cy + vpNow[9] * cz + vpNow[13];
      if (Math.abs(qy) > qw + pr * fy) continue;
    }
    // Too small to see from here, at the quality level currently in force.
    const propPxK = p.dynamic ? dynamicPxK : pxK;
    if (!p.dynamic && qw > PQ.smallFar && pr < PQ.smallR) continue;
    if (pr < qw * propPxK) continue;
    if (anyHidden && hiddenProp(p)) continue;
    if (portalFrame && portalFrame.test(p)) continue;
    drawnProps++;
    const glow = (p.tag && best && p.tag === best.tag) ? (p.glow || 0) + pulse : (p.glow || 0);
    R.draw(p.mesh, p.m, p.color, {
      mode: p.mode || 0, alpha: p.alpha === undefined ? 1 : p.alpha,
      glow, gloss: p.gloss, round: p.round,
      // Characters written on a sign carry the atlas cell they came from.
      rect: p.ch ? Glyphs.rect(p.ch,p.glyphPrimary) : null,
      // A downloaded model carries its own albedo map; a surface built out of primitives can
      // name a tiling material instead. Only one of the two is ever set.
      tex: p.tex, mat: p.mat, matScale: p.matScale, matAmt: p.matAmt,
      nrm: p.nrm, nrmAmt: p.nrmAmt,
    });
  }
  // Seal the exact post-frustum accounting before characters begin. Retained batches merge their
  // cached candidate/hidden/visible counts even when no repack was needed; loose survivors record
  // directly, so diagnostics remain stable from the first frame through every cache reuse.
  if(portalFrame)portalFrame.finish();
  // Everybody in the room, gathered into one call per material instead of one per body part.
  // A figure is 50–113 draws depending on how close it is, so a busy carriage or terminal was
  // spending more of the frame on people than on the building they are standing in.
  R.beginCollect();
  if (showBody) drawCharacter(playerFramePose, now, forShadow ? 2 : 0);
  drawNPCs(eye, forShadow);
  R.endCollect();
  if (!forShadow && skinnedNPCs.length && typeof Rig !== 'undefined') {
    if (typeof Rig.drawMany === 'function') {
      // Same rig + same authored LOD becomes one GPU-skinned instance group. Per-instance model,
      // pose and ambient wardrobe tint still differ, while named identities keep their baked
      // photographed palette. A failed group falls through the renderer's exact direct path; only
      // a genuinely undrawable record reaches the procedural safety net below.
      const batch = Rig.drawMany(skinnedNPCs, RIG_WHITE, { frame:rigFrame, look:true });
      for (const item of batch.failedItems || []) {
        if (item && item.n) drawProceduralNPC(item.n, item.d, Perf.q, null);
      }
    } else {
      for (const item of skinnedNPCs) {
        const n = item.n, opt = { lod:item.lod, frame:rigFrame, animFar:item.d > 15 };
        if (n.rigTint) opt.look = n.look;
        if (!Rig.draw(n.rig, n.x, n.lift || 0, n.z, n.yaw, n.pose, RIG_WHITE, opt))
          drawProceduralNPC(n, item.d, Perf.q, null);
      }
    }
  }
  // A skinned character, while the new rig is being built. Outside the collect bracket on
  // purpose: skinned meshes are drawn by their own program with their own bone matrices, and
  // they are not batched the way the primitive figures above now are. Off unless something
  // sets it, so this costs a property read in the normal case.
  if (typeof window !== 'undefined' && window.__rig && typeof Rig !== 'undefined') {
    const r = window.__rig;
    Rig.draw(r.name, r.x || 0, r.y || 0, r.z || 0, r.yaw || 0, r.pose || null, r.colour, r.opt);
  }
  };

  // ---- the sun's own view of the street, into the depth map
  // Outdoors only. Indoors the room is a closed box lit through one window, and the beam test
  // in the shader already puts a correctly shaped patch of sun on the floor; a shadow map
  // fitted to a seven-metre room would only fight it.
  if (!scene.indoor && dl.day > 0.06 && Perf.q.shadow) {
    if (R.beginShadow(P.x, P.z, Perf.q.shadowHalf, 26)) {
      paintScene(true);
      R.endShadow(cv);
    }
  } else {
    R.noShadow();
  }
  paintScene(false);

  // ---- contact shadows, then additive light pools
  // The painted-on shadows are only needed where the sun does not cast a real one: indoors,
  // and outdoors at night or if the depth map could not be created. Drawing both put a dark
  // ellipse under every object *and* its real shadow beside it.
  const fakeShadows = scene.indoor || !R.shadowsCast;
  R.depthMask(false);
  // These are all the same quad and differ only in matrix/colour/alpha, which are instance
  // attributes. Busy interiors used to issue one call per contact patch here after the main
  // scene's batch had already closed — hundreds of calls in the mall for pixels that are often
  // only a soft smudge. The collector preserves every patch and its opacity in one mode-2 batch.
  R.beginCollect();
  if (fakeShadows) for (const s of scene.shadows)
    R.draw('quad', s.m, BLACK, { mode: 2, alpha: s.a * (0.62 + 0.38 * dl.day) });
  // The player's shadow leans away from the sun and stretches as the light gets lower.
  const lean = dl.day * (0.62 - Math.min(0.5, Math.abs(dl.dir[1]) * 0.45));
  const bodyShadow = (bx, bz, k, floorY = 0) =>
    R.draw('quad', M.trs(bx - dl.dir[0] * lean * 0.55, floorY + 0.024,
      bz - dl.dir[2] * lean * 0.55,
      0, (1.05 + lean * 0.55) * k, 1, (1.05 + lean * 0.75) * k), BLACK,
      { mode: 2, alpha: 0.30 + 0.16 * dl.day });
  if (fakeShadows) {
    // Only if there is a body to cast it. With the figure hidden for a screenshot its shadow
    // stayed behind as a dark smudge in the middle of an empty floor.
    if (showBody) bodyShadow(P.x, P.z, 1, P.lift || 0);
    // An animal's shadow is its footprint, not its height: a giraffe is five metres tall and
    // stands on about two, and scaling the disc off `tall` the way a person's is puts a pool of
    // shade across half the paddock.
    for (const n of NPCS)
      // Exactly the test drawNPCs makes, and for the same reason: a contact shadow with no body
      // over it is a stain on the carpet. It used to be distance-only and unbounded, so indoors —
      // where these painted shadows are the only ones there are — all 222 people in the game got
      // a quad and a draw call every frame, including everyone behind the camera and everyone in
      // a different building.
      if (npcRange(n, eye, Perf.q) >= 0)
        bodyShadow(n.x, n.z, n.animal ? n.look.foot : n.look.tall * 0.95, n.lift || 0);
  }
  R.endCollect();
  R.additive(true);
  // Light pools use the same per-instance fields too. Keep them in their additive state while the
  // collector flushes, then restore normal blending exactly where the old direct loop did.
  R.beginCollect();
  for (const g of scene.glows)
    R.draw('quad', g.m, g.color, { mode: g.mode || 5, alpha: g.a * (g.sun ? dl.day : 1) });
  R.endCollect();
  R.additive(false);
  // ---- 雨雪 the weather, falling. Between the light pools and the depth mask going back on: the
  // rain is in front of the street lamp's halo and behind nothing, and it writes no depth, so one
  // drop never punches a hole in the drop behind it.
  //
  // The particles are moved whether or not they are drawn, so stepping out of a shop into a
  // downpour does not begin with a wall of rain hanging still in the doorway.
  Weather.move(dt, eye);
  if (!scene.indoor) Weather.draw(R, eye, scene.ground || 0);
  R.depthMask(true);
  // ---- and the frame goes on screen. Everything above was painted into a texture; this is where
  // the lights bleed into the air around them and the corners of the picture get darkened. With
  // the chain off this does nothing, and the scene went straight at the screen to begin with.
  R.present();

  // ---- label projection: nearby discovery, active-object detail, and simple
  // screen-space collision avoidance. The room should read before the UI does.
  const vp = R.vp, W = R.cssW, Hh = R.cssH;
  const labelCandidates = [];
  for (const th of scene.things) {
    const el = th.el, on = th === best;
    if (!thingOnCurrentDeck(th)) {
      if (labelState(th).near) { th._lb.near = false; el.classList.remove('near'); }
      labelHide(th); continue;
    }
    if (labelState(th).near !== on) { th._lb.near = on; el.classList.toggle('near', on); }
    const playerD = Math.hypot(th.focus[0] - P.x, th.focus[1] - P.z);
    // Outside, things are further apart and much bigger, so discovery reaches further.
    const discoverable = playerD < (scene.indoor ? 2.85 : 5.0);
    // A negative reach is how somebody who is not here says so — the rider before he has
    // knocked, a resident who has gone in for the night. Their word goes with them, or the
    // rider's name hangs by your front door all day with nobody under it.
    // Reject definite non-candidates before dictionary lookup and matrix projection. The mall has
    // 244 authored interactions, but only the few around the player can produce labels; projecting
    // the other two hundred every frame was pure main-thread work.
    if (cardOpen || talkOpen || th.reach < 0 || hiddenAt(th.pos[0], th.pos[2]) ||
        (!on && !discoverable && playerD >= 5.2)) {
      labelHide(th); continue;
    }
    const due = Vocab.isDue(th.hz);
    if (!on && !discoverable && !due) { labelHide(th); continue; }
    const q = M.project(vp, th.pos[0], th.pos[1] + 0.12, th.pos[2]);
    if (q.w <= 0.05) { labelHide(th); continue; }
    const sx = (q.x / q.w * 0.5 + 0.5) * W;
    const sy = (-q.y / q.w * 0.5 + 0.5) * Hh;
    if (sx < -70 || sx > W + 70 || sy < -30 || sy > Hh + 40) {
      labelHide(th); continue;
    }
    // ---- occlusion. A label is a world object drawn as UI, so nothing in the DOM knows there is
    // a wall in front of it: standing in the 玄关 you could read 热水壶, 茶, 钥匙, 鞋柜 and 拖鞋
    // straight through solid plaster. That is the reported bug, and `hiddenAt` above is not the
    // test for it — it is the cutaway, which only removes the band the eye backed out through, so
    // anything in the NEXT room was never a candidate for it.
    //
    // Same ray-versus-AABB test the camera already runs against the same blockers, with two
    // changes. The pad drops to 0.02: 0.4 m is a building-mass margin and would seal every
    // doorway a label can legitimately be read through. And the hit must beat the thing by 0.35 m
    // before it counts, so a sign mounted flush on — or slightly recessed into — a blocker's own
    // face keeps its label instead of occluding itself.
    //
    // Cheap because it is last: everything ahead of it has already rejected the far, the culled
    // and the off-screen, so this runs on the handful of labels actually about to be drawn.
    // ponytail: only the flat's partitions are modelled as label occluders. Every other location
    // gets its shell blockers and nothing finer; a mall shop's own millwork will still show a
    // label through it.
    const ex = th.pos[0] - eye[0], ey = th.pos[1] - eye[1], ez = th.pos[2] - eye[2];
    const ed = Math.hypot(ex, ey, ez);
    if (ed > 0.45) {
      const ldir = [ex / ed, ey / ed, ez / ed], slack = ed - 0.35;
      const fw = drawDeck === 2 ? flatLabelBlockers() : null;
      if (cameraBlockLimit(eye, ldir, ed, scene.blockers, 0.02) < slack ||
          (fw && cameraBlockLimit(eye, ldir, ed, fw, 0.02) < slack)) {
        labelHide(th); continue;
      }
    }
    labelCandidates.push({ th, el, sx, sy, playerD, on, due });
  }
  labelCandidates.sort((a, b) => (b.on - a.on) || (b.due - a.due) || (a.playerD - b.playerD));
  const placedLabels = [];
  const placedGroups = new Set();
  for (const c of labelCandidates) {
    // A train bench exposes every cushion as a real sitting place, but forty-two identical labels
    // make the carriage look like a debug view. Keep only the nearest label in each declared
    // interaction group; clicking any individual cushion still targets its own seat anchor.
    if (c.th.labelGroup && placedGroups.has(c.th.labelGroup) && !c.on) {
      labelHide(c.th); continue;
    }
    if (c.th.labelGroup) placedGroups.add(c.th.labelGroup);
    const width = 46 + c.th.hz.length * 17 + (c.on ? 38 : 0);
    const height = c.on ? 70 : 28;
    let top = c.sy, rect, blocked = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      rect = { x0: c.sx - width / 2 - 5, x1: c.sx + width / 2 + 5,
               y0: top - height - 4, y1: top + 5 };
      blocked = placedLabels.some(r => rect.x0 < r.x1 && rect.x1 > r.x0 && rect.y0 < r.y1 && rect.y1 > r.y0);
      if (!blocked) break;
      top -= 32;
    }
    if (blocked && !c.on && !c.due) {
      labelHide(c.th); continue;
    }
    labelShow(c.th, c.sx.toFixed(1) + 'px', top.toFixed(1) + 'px',
      c.on ? 1 : c.due ? 0.82 : clamp(1.0 - c.playerD / 4.7, 0.30, 0.68));
    placedLabels.push(rect);
  }

  // ---- prompt: the word on the left, what the object actually does on the right
  const pr = $('#prompt');
  if (best && !cardOpen && !talkOpen && !doing) {
    pr.style.opacity = 1;
    const st = Vocab.stage(best.hz), e = Vocab.get(best.hz);
    // `e` can be missing, and it must not be fatal. A scene declares a thing; the dictionary row
    // for it is a separate edit in a separate file, and when the two got out of step this line
    // threw on the frame the player walked up to the object — which does not read as a missing
    // gloss, it drops the entire game to the "did not load" overlay. A word with no row now shows
    // the bare headword, which is what stage 2 already does, and .thingcheck.js catches the gap
    // properly instead of leaving it to be discovered by standing in the wrong place.
    const what = Vocab.isDue(best.hz)
      ? `复习 <b>${best.hz}</b> <span class="dim">· recall check</span>`
      : st === 2 || !e
        ? `看看 <b>${best.hz}</b>`
        : `看看 <b>${best.hz}</b> <span class="dim">· ${promptGloss(e.en)}</span>`;
    $('#promptText').innerHTML = what;
    const use = useThing && useLabel(useThing.hz, useThing);
    $('#promptUse').classList.toggle('off', !use);
    if (use) {
      // What it will cost you, before you commit to it: money out of the wallet, money into the
      // basket, meals left in the fridge, or the reason somebody is going to stop you.
      const extra = use.block ? ` <span class="dim">· ${use.blockTr}</span>`
        : use.eat ? ` <span class="dim">· ${stockOf()} 份 left</span>`
        // Forty minutes is the cost of a cooked meal and the number the decision turns on, so it
        // goes where every other price goes rather than being discovered at the stove.
        : use.cookDo ? ` <span class="dim">· ${use.mins} 分钟</span>`
        : use.cost ? ` <span class="dim">· ¥${use.cost} · into the basket</span>`
        : use.pay ? ` <span class="dim">· ${use.pay > 0 ? '+' : '−'}¥${Math.abs(use.pay)}</span>`
        // A card fare is money too, but it comes off the card and not out of the wallet, so it
        // gets its own chip rather than borrowing the one that means "out of your pocket".
        : use.card ? ` <span class="dim">· −¥${Math.abs(use.card)} 刷卡</span>`
        // How long it takes, when nothing more urgent needs the chip. The hotel is a building
        // where the answer to "how long" changes what you choose — a 10-minute check-in against
        // a 2-minute question at the same desk — so the walk-up prompt says it before Q.
        // ponytail: hotel only. The same chip everywhere is probably right, but it would change
        // the prompt in every room in the city and that is a separate review.
        : (use.mins > 0 && hotelFloorAt(place)) ? ` <span class="dim">· ${use.mins} 分钟</span>`
        : '';
      // Name the object when Q would act on something other than the word on the left.
      const on = useThing === best ? '' : ` <span class="dim">(${useThing.hz})</span>`;
      $('#promptUseText').innerHTML =
        `<b>${use.zh}</b>${on} <span class="dim">· ${use.en}</span>${extra}`;
    }
  } else pr.style.opacity = 0;

  // ---- clock, needs, and whatever the player is in the middle of doing
  if (started && !paused) {
    if (doing) tickUse(dt);
    else advanceTime(dt * activeClockRate());
    saveAcc += dt;
    if (saveAcc > 6) { saveAcc = 0; saveGame(); }
    hudAcc += dt;
    if (hudAcc > 0.25) {
      hudAcc = 0;
      updateHud(); updateNeeds();
      refreshDue();   // words falling due is a real-time event
    }
  }

  if (now >= rigTrimAt && typeof Assets !== 'undefined' &&
      typeof Assets.trimRigs === 'function') {
    rigTrimAt = now + 2000;
    refreshRigPins(place);                 // includes cast added by a lazily built destination
    Assets.trimRigs();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- the sky, as a piece of UI
//
// Two jobs. One is the chip, which is cheap and runs every frame behind a string compare, because
// the weather changes on its own clock and there is no event to hang it off.
//
// The other is the part that matters: the weather is the only teacher in this game that comes to
// you. Everything else has to be walked up to and looked at, so a player who never goes into the
// park never learns 树. But it starts raining on you wherever you are standing, and at that moment
// 下雨 is the single most obviously useful word in the language — so that is the moment it is
// taught, once, with the sky behind it doing the explaining.
let skyWas = '', skyToldDay = -1;
function skyChip(w) {
  const el = $('#sky');
  if (!el) return;
  const line = `${w.season.hz}|${w.hz}`;
  if (line !== skyWas) {
    skyWas = line;
    el.querySelector('.k').textContent = `${w.season.hz} · ${w.season.en}`;
    el.querySelector('b').textContent = w.hz;
    // Cool for anything falling, cold for the fog and the snow, warm for a good day. Colour
    // carries this faster than the characters do, and it is the whole point of the chip.
    const K = Weather.KINDS[w.kind];
    el.classList.toggle('wet', !!K.wet);
    el.classList.toggle('cold', !!K.snow || w.kind === 'fog');
    el.classList.toggle('warm', w.kind === 'clear');
  }
  // The weather turning up is worth saying out loud, but only once a day and only for the kinds
  // that are actually an event — nobody remarks on it having clouded over a bit.
  if (started && !scene.indoor && w.amt > 0.25 && skyToldDay !== day &&
      (w.kind === 'rain' || w.kind === 'storm' || w.kind === 'snow' || w.kind === 'fog' ||
       w.kind === 'wind')) {
    skyToldDay = day;
    // The word first, through the same door every other new word comes through, so it lands in
    // the notebook and joins the review schedule like anything you walked up to and looked at.
    for (const hz of Weather.words()) if (Vocab.get(hz) && Vocab.exposure(hz) < 1) Vocab.introduce(hz);
    refreshUI();
    const b = Weather.bark();
    if (b) say(b[0], b[1]);
    const note = Weather.KINDS[w.kind].note;
    if (note) logDiary(note[0], note[1], 'sky:' + w.kind);
  }
}

function updateHud() {
  topUpTester();
  paintPlaceLabel();
  const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60);
  $('#clock b').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  $('#clock .k').textContent = `第 ${day} 天 · day`;
  // A billion yuan is not a number anybody wants to read off a chip, and seeing it there is also
  // the only warning that the wallet is not the game's any more. So the chip says so plainly.
  $('#money .k').textContent = SET.tester ? '钱 · tester' : '钱 · money';
  $('#money b').textContent = SET.tester ? '∞' : '¥' + Math.floor(money).toLocaleString();
  // The carry chip answers whichever question the room you are in raises. In the shop that is
  // what is in the basket and what it will cost; in the restaurant, what you ordered; anywhere
  // else, how many meals are left at home, which is the thing that sends you to the shop.
  // Only what has actually been carried out is on the table. While it is cooking, or on its way
  // across the room in the waitress's hands, the table in front of you is still empty.
  Diner.setServed(order && order.state === 'ready' ? order.dish.hz : null);
  updateMap();                          // early-outs unless something on it has changed
  refreshSigns();                     // the same, for the boards in the terminal
  const carryK = $('#carry .k'), carryB = $('#carry b');
  const flightStatus = $('#flightStatus');
  if (flightStatus) {
    flightStatus.classList.toggle('on', place === 'cabin');
    if (place === 'cabin') {
      const v = Cabin.view();
      const alt = Math.round(v.alt * 10600 / 100) * 100;
      flightStatus.querySelector('.phase').textContent = `${v.phaseZh} · ${v.phaseEn.toUpperCase()}`;
      flightStatus.querySelector('.detail').innerHTML =
        `高度 ${alt.toLocaleString()} 米 · ${Math.round(v.flightU * 100)}% · ` +
        `<span class="belt">安全带 ${v.belt ? 'ON' : 'OFF'}</span>`;
    }
  }
  updateHospitalStatus();
  if ($('#flightExperience') && $('#flightExperience').classList.contains('on'))
    renderFlightExperience(fxPage);
  if (place === 'cabin' && flight) {
    // On board the chip is the seat number and nothing else, because the seat number is the only
    // thing you need on this aeroplane and you need it constantly. It used to be gated to the
    // terminal, so it disappeared at the exact moment boarding put you in a cabin with forty-two
    // identical chairs in it and the number written on a toast that had already faded.
    // Seated counts whether you are still lowering yourself in or have been sitting for ten minutes,
    // so the chip stops telling you to sit down the moment you have.
    const inSeat = !!sitting || (doing && doing.def && doing.def.cabinSit);
    carryK.textContent = '座位 · your seat';
    carryB.textContent = `${flight.seat} · ${flight.f.to}`
      + (inSeat ? '' : ' · 坐下 sit down');
  } else if (place === 'airport' && flight) {
    // The carry chip is the boarding card in your pocket: where you are going and what the
    // schedule has to say about it, so the state of the whole chain is one glance away.
    // The carry chip is the boarding card in your pocket — and, from here on, the clock you are
    // running against. There is always exactly one deadline that matters: before you have checked
    // in it is the desk closing, after that it is the gate. Showing both would be a timetable;
    // showing the next one is what a person in an airport is actually holding in their head.
    //
    // The gate is only on it once you know it. Until then the chip says where to find out, which
    // is the one piece of UI in the game whose job is to send you to listen to something.
    const f = flight.f, st = Airport.statusOf(f, minutes);
    const ckShut = depOf(f) - Airport.SHUT_CK, gateShut = depOf(f) - Airport.SHUT_GATE;
    const left = Math.round((flight.checked ? gateShut : ckShut) - minutes);
    const what = flight.checked ? '登机口关闭' : '值机截止';
    carryK.textContent = flight.checked ? '登机牌 · boarding card' : '机票 · ticket';
    carryB.textContent = `${f.to} ${hhmm(depOf(f))} · `
      + (flight.checked ? (knowsGate() ? `${gateNow(f)} ` : '听广播 ') + flight.seat + ' · ' : '')
      + (left > 0 && left < 240 ? `${what} ${left}′` : st.zh);
    // Amber inside half an hour, red inside ten minutes. This is the only chip in the game that
    // ever goes red, and it should be: it is the only thing you can permanently lose by ignoring.
    const chip = $('#carry');
    chip.classList.toggle('warn', left > 10 && left <= 30);
    chip.classList.toggle('bad', left > 0 && left <= 10);
  } else if (place === 'shop') {
    carryK.textContent = '篮子 · basket';
    carryB.textContent = basket.length ? `¥${basketTotal()} · ${basket.length} 件` : '空的';
  } else if (place === 'metro') {
    // What you are travelling on, if anything, and otherwise where you are. The ticket wins over
    // the card because it is the one that expires.
    carryK.textContent = ticket ? '单程票 · single' : card ? '交通卡 · card' : '车站 · station';
    carryB.textContent = ticket ? `到${ticket.to}`
      : card ? `¥${card.bal}` : Metro.stationAt().hz;
  } else if (isOfficePlace(place)) {
    carryK.textContent = job ? '活儿 · job' : '活儿 · no job';
    const floor=officeFloorAt(place)||officeFloorAt(OfficeLift.state().currentKey);
    carryB.textContent = (job ? job.hz : '空的') + (floor ? ` · ${floor.display}F` : '');
  } else if (place === 'diner') {
    carryK.textContent = !order ? '想吃 · you fancy'
      : order.state === 'ready' ? '上桌了 · served'
      : order.state === 'coming' ? '来了 · on its way' : '在做 · in the kitchen';
    carryB.textContent = order ? order.dish.hz : menuDish().hz;
  } else if(place==='bank') {
    syncBankVisit();
    const t=bankVisit.ticket;
    carryK.textContent=bankAccount.opened?'账户 · bank account':'银行 · bank';
    carryB.textContent=bankAccount.opened
      ? `¥${bankAccount.balance} · 现金 ¥${Math.floor(money)}`+(t?` · ${t.no}${t.called?' 已叫号':' 等候'}`:'')
      : t?`${t.no} · ${t.called?'已叫号 called':'等候 waiting'}`:'先取号 · open an account';
  } else if (place === 'mall') {
    carryK.textContent = mallBasket.length
      ? `没付钱 · ${mallBasket.length} unpaid · ¥${mallTotal()}`
      : mallBought.length ? '买到手 · bought' : '商场 · mall';
    if (mallBasket.length) {
      // The last few, and a count for the rest, so a full basket does not run off the panel.
      const names = mallBasket.map(b => b.item.hz);
      carryB.textContent = names.length <= 3 ? names.join(' · ')
        : `${names.slice(-2).join(' · ')} +${names.length - 2}`;
    } else if (mallBought.length) {
      carryB.textContent = mallBought.slice(-3).join(' · ');
    } else {
      carryB.textContent = Mall.level() === 3
        ? '三楼 · food court · cinema · arcade'
        : Mall.level() === 2
        ? '二楼 · beauty · sport · home · books'
        : '一楼 · fashion · digital · flowers';
    }
  } else if (place === 'train' && ride) {
    // On the train the only question worth answering in the corner of the screen is which stop
    // is next, and whether it is yours.
    const next = Metro.STATIONS[ringNext(ride.at, ride.dir)];
    const here = Metro.STATIONS[ride.at];
    const stopped = ride.state !== 'run';
    carryK.textContent = ride.state === 'closing' ? '关门 · doors closing'
      : stopped ? (ride.at === ride.to ? '到站 · your stop' : '到站 · arrived')
                : '下一站 · next stop';
    carryB.textContent = stopped ? here.hz : next.hz;
  } else if (carrying) {
    // What is in your hand beats everything else the chip could say, in any room.
    carryK.textContent = '手里 · in your hand';
    carryB.textContent = `袋子 · ${carrying.item.hz}`;
  } else if (delivery) {
    // Something is crossing the city with your name on it, which is the most interesting thing
    // your hands are doing no matter which room you are standing in.
    const atDoor = delivery.state !== 'coming';
    carryK.textContent = atDoor ? '外卖 · at your door' : '外卖 · on its way';
    carryB.textContent = atDoor ? `${delivery.item.hz} · ¥${delivery.total}`
                                : `${delivery.item.hz} · ${deliveryEta()} 分`;
  } else {
    // Two numbers, because they stopped being the same number. 份 is everything in there; the
    // second half is how much of it you could actually eat without standing at a stove for
    // three quarters of an hour, and a fridge where those two disagree is the whole reason to
    // walk past the 餐馆 tonight.
    const all = stockOf(), now = Pantry.ready(day);
    carryK.textContent = '冰箱 · fridge';
    carryB.textContent = all === now ? `${all} 份` : `${all} 份 · ${now} 现成`;
  }
  // Whatever branch ran, the departure clock's colours belong to the airport branch alone. Left
  // on, a red chip followed you into your own kitchen and stayed there.
  if (!(place === 'airport' && flight)) {
    const chip = $('#carry');
    chip.classList.remove('warn'); chip.classList.remove('bad');
  }
  $('#carry').classList.toggle('zero',
    place !== 'shop' && place !== 'diner' && place !== 'bank' && !delivery && !carrying && stockOf() <= 0);
  $('#words b').textContent = Vocab.count();
  const due = Vocab.dueCount();
  $('#revw b').textContent = due;
  $('#revw').classList.toggle('zero', due === 0);
  renderDailyGoals();
}

// Shortest signed distance from angle a to angle b.
function angleDelta(b, a) {
  return ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

// Debug-only retained-instance audit. Let Mall motion run, then call this from a harness: any
// unregistered mutation appears as a packed/current mismatch instead of silently freezing on
// screen. Marked motion/night props and the deliberate selection pulse are refreshed separately.
function auditRetainedInstances() {
  const out={checked:0,totalMismatches:0,mismatches:[]},tmp=new Float32Array(26);
  if(!scene||!scene.batches)return out;
  for(const b of scene.batches) {
    const packed=b._mainPacked;if(!packed)continue;
    for(let slot=0;slot<packed.n;slot++) {
      const p=b.props[packed.ids[slot]];
      if(p._instDynamic||p._instNight||(packed.bestTag&&p.tag===packed.bestTag))continue;
      tmp.fill(0);packPropInstance(tmp,0,p,b.glyph);out.checked++;
      const o=slot*26;
      for(let k=0;k<26;k++) {
        if(tmp[24]===0&&(k===22||k===23||k===25))continue;
        if(Math.abs(tmp[k]-packed.data[o+k])<=1e-6)continue;
        out.totalMismatches++;
        if(out.mismatches.length<32)out.mismatches.push({mesh:b.mesh,tag:p.tag||null,slot,field:k,
          packed:packed.data[o+k],live:tmp[k]});
        break;
      }
    }
  }
  return out;
}

applySettings();     // whatever this browser was left set to last time
updateHud();
updateNeeds();
refreshDue();
requestAnimationFrame(frame);
// debug handle
window.__game = {
  // `jump` joins startUse/stopUse here for the same reason they are here: this file is an IIFE,
  // so a harness driving the page over devtools cannot reach anything that is not on `__game`,
  // and there is no pressing the space bar over a debugging connection. It refuses in exactly the
  // conditions the key path refuses in, so calling it directly is a fair test of the real thing.
  P, CAM, keys, eye, Vocab, openWord, needs, NEEDS, USE, startUse, stopUse, jump, pose, light,
  auditRetainedInstances,
  // The conversations, for .talkcheck.js. There is no clicking a reply over a debugging
  // connection, so the three things the panel does are reachable by name.
  NPCS, Talk, openTalk, reply, closeTalk, againTalk, translateTalk,
  talking: () => talkAt && { who: talkAt.n.name, at: talkAt.at, heard: talkAt.heard,
                             translated: talkAt.translated, answered: talkAt.answered },
  setClock(m) { minutes = m; updateHud(); },
  // The weather, for the console and for every harness that needs a wet street. `force` pins a
  // kind until it is cleared with null; `setDay` moves the calendar, which is what changes the
  // season and rerolls what today is capable of.
  Weather,
  weather: () => ({ kind: Weather.now.kind, season: Weather.now.season.key,
                    amt: +Weather.now.amt.toFixed(3), wet: +Weather.now.wet.toFixed(3),
                    lay: +Weather.now.lay.toFixed(3), wind: +Weather.now.wind.toFixed(3),
                    plan: Weather.planFor(day) }),
  setDay(d) { day = d; updateHud(); },
  // Time, moved the way the game moves it — rent, needs, the flat drying out and all. `setClock`
  // only slides the hands; this is what sleeping through a night actually does.
  advanceTime,
  // The diary, for the harnesses and for reading it without the phone in the way.
  diary: () => diary.slice(),
  logDiary, openDiary,
  goals: () => ({ ...daily, done:{ ...daily.done }, plan:dailyPlan(day) }),
  goalEvent,
  setMoney(v) { money = v; updateHud(); },
  // Whether the body is in a chair, for the harnesses: true through the whole flight, not just for
  // the couple of seconds the sitting-down action lasts.
  seated: () => !!sitting || !!(act && act.type === 'sit'),
  // The tester's wallet, for the harnesses and for the console: __game.tester(true).
  tester(on) { setTester(on === undefined ? !SET.tester : on); return SET.tester; },
  // The terminal: the ticket in your pocket, the schedule it came off, and the two panels that
  // draw themselves from the clock. A test can walk the whole chain without a mouse.
  flight: () => flight && { no: flight.f.no, to: flight.f.to, dep: depOf(flight.f),
                            bookedDay: flight.bookedDay, depAt: flight.depAt,
                            checked: flight.checked, bag: flight.bag,
                            cleared: flight.cleared, seat: flight.seat, gate: flight.f.gate,
                            gateNow: gateNow(flight.f), moved: !!flight.f.moved,
                            knewGate: flight.knewGate, gateKnown: knowsGate(),
                            late: flight.f.late,
                            cancelled: !!flight.f.cancelled },
  trips: () => trips.slice(),
  trip: () => trip && { to: trip.f.to, no: trip.f.no, back: trip.back,
                        confirmed: trip.confirmed, dueIn: trip.back - clockNow() },
  openFlights, openCheckin, openDuty, takeFlight, comeHome,
  openMallLiftPanel, openCinema, cinema: () => cinemaTicket && { ...cinemaTicket },
  openMallFood, openArcadeLobby, openArcadeGame, openArcadePrizes,
  // The shop and the till, for the same reason every other opener is here: a harness proving a
  // purchase survives a reload has to make the purchase through the path a player uses, not by
  // writing the receipt array itself, which would prove only that arrays can be assigned to.
  openMallShop, mallPay, mallBookOffer,
  openMallPassport, openMallEvents, awardMallStamp,
  openBankTicket, openBankForms, openBankAccountPanel, openBankCardService, openBankATM, openBankOverview,
  openBankCounter, openBankTeller, openBankWealth, openBankSafe, openBankVip,
  issueBankTicket, callBankTicket, bankShowId, bankOpenAccount,
  bankDeposit, bankWithdraw, bankTopUpTransit, resetBankForTest,
  bank:()=>({...bankAccount,ledger:bankAccount.ledger.map(r=>({...r}))}),
  bankVisit:()=>({ ...syncBankVisit(), ticket:bankVisit.ticket&&{...bankVisit.ticket} }),
  // The cabin service, for the harness: kicking a round off and stepping the carts by hand.
  crewSnackRound, crewSecureRound, crewBeltCheck, crewSafetyDemo, updateTrolleys,
  offerDrinks, CABIN_DRINKS,
  MALL_GOODS, MALL_FOOD, MALL_STAMPS, ARCADE_GAMES, ARCADE_PRIZES,
  mallProgress:()=>({ ...mallProgress, stamps:{...mallProgress.stamps},
    prizes:mallProgress.prizes.slice(), lastOrder:mallProgress.lastOrder&&{...mallProgress.lastOrder} }),
  setMallTickets(v){ mallProgress.tickets=Math.max(0,Math.floor(Number(v)||0)); updateHud(); },
  state: () => ({ minutes, day, money, lightsOn: { ...lightsOn }, place,
                  // Harnesses ask for `stock` and should keep getting a meal count; `pantry` is
                  // the whole fridge, for anything that wants to assert on what is actually in it.
                  stock: stockOf(), ready: Pantry.ready(day), pantry: Pantry.list(day),
                  metroLate: Disrupt.metroMinutes(day, minutes),
                  // `mallHold` stays in the shape the mall harness reads: truthy while
                  // something is unpaid for. `mallBasket` is the whole of it.
                  mallHold: mallBasket.length ? mallBasket[0] : null,
                  mallBasket: mallBasket.slice(), mallTotal: mallTotal(),
                  bought: mallBought.slice(),
                  campusLife:{ ...campusLife },
                  // The full record, beside the names. A harness proving a purchase survived a
                  // reload has to be able to see what the purchase actually was.
                  receipts: mallReceipts.map(r => ({ ...r, items: r.items.map(i => ({ ...i })) })),
                  basketLeft: mallBasketLeft && { ...mallBasketLeft },
                  mallProgress:{...mallProgress,stamps:{...mallProgress.stamps},
                    prizes:mallProgress.prizes.slice(),
                    lastOrder:mallProgress.lastOrder&&{...mallProgress.lastOrder}},
                  bankAccount:{...bankAccount,ledger:bankAccount.ledger.map(r=>({...r}))},
                  bankVisit:{...syncBankVisit(),ticket:bankVisit.ticket&&{...bankVisit.ticket}},
                  ticket: ticket && ticket.to, ticketFare: ticket && ticket.fare,
                  card: card && card.bal, tapIn, gatesOpen: Metro.gateOpen(),
                  station, pastGate: pastGateNow(), job: job && job.hz, clockedDay,
                  officeFloor: isOfficePlace(place)
                    ? (officeFloorAt(place)||officeFloorAt(OfficeLift.state().currentKey))?.display||null
                    : null,
                  basket: basket.map(g => g.hz), basketTotal: basketTotal(), basketHeld,
                  order: order && order.dish.hz,
                  orderState: order && order.state, chosen: menuDish().hz,
                  doing: doing && doing.def.zh, t: doing && doing.t,
                  needs: { ...needs }, active: activeThing && activeThing.hz,
                  residents: NPCS.filter(n => n.home).map(n => ({
                    hz:n.hz, home:n.home.name, phase:n.homePhase, awake:n.awake,
                    x:+n.x.toFixed(2), z:+n.z.toFixed(2) })),
                  use: useThing && useThing.hz }),
  pickAt(x, y) { mouse.x = x; mouse.y = y; mouse.inside = true; return pickUnderCursor(); },
  // For the economy test: the things in the room, the price the prompt would show, and the real
  // frame-loop tick. Headless Chrome only renders when something forces it, so a four-second
  // action cannot be waited out — but running the game's own `tickUse` by hand means the test
  // exercises the same arithmetic the player does rather than a copy of it.
  things: () => scene.things,
  scene: () => scene,
  // Street-motion state for deterministic traffic/cycle acceptance checks. The registry itself is a
  // global lexical binding (not a window property), so browser tooling cannot portably reach it.
  streetTraffic: () => typeof StreetFit !== 'undefined' ? StreetFit['traffic'] : null,
  streetCycles: () => typeof StreetFit !== 'undefined' ? StreetFit['cycles'] : null,
  streetRoad: () => typeof StreetFit !== 'undefined' ? StreetFit['road'] : null,
  fareFor, legsBetween, hereStation, mapFare, travelToStation, travelToDoor, DOORS,
  HotelLift, HOTEL_FLOORS, HOTEL_DEPARTMENTS, HOTEL_ROUTES, openHotelFloors,
  OfficeLift, OFFICE_FLOORS, OFFICE_FLOOR_META, OFFICE_ROUTES, OfficeCore, openOfficeFloors,
  hospitalGuide, openHospitalSlip,
  // 回家 in one press, the map that draws the button, and the table that says which flights
  // land somewhere real rather than time-skipping.
  fastHome, updateMap, FLY_TO,
  // Touchdown. The cabin's own sequence calls this; a harness needs it to end a flight without
  // sitting out four phases at the one to three frames a second headless Chrome manages.
  landFlight,
  useLabel, tickUse, tickService, placeOrder, openTravel, openTasks, openTicket,
  // The phone, the rider on the stairs, and the settings behind Escape.
  openPhone, phoneList, orderIn, tickDelivery, answerDoor, courier,
  // The ride: its state, and the tick that moves it, so a test can sit out a journey in a
  // handful of calls instead of two real minutes.
  board, alight, tickRide,
  // The station's own traffic, steppable by hand for the same reason the ride is: a commuter's
  // circuit is a couple of minutes of walking and dwelling, and a headless frame only happens when
  // something forces one, so waiting it out in real time is the slowest possible way to check it.
  tickStation: (dt) => tickStation(dt || 1 / 60),
  stationBusy, stationCrowd,
  // Who is in the carriage, who is on their feet and where. Boarding and alighting take five or
  // six seconds of walking, which is invisible in a single screenshot, so the only way to check
  // the choreography is to read it out as it happens.
  riders: () => RIDERS.map(r => ({
    hz: r.hz, gone: !!r.gone, walking: !!r.errand, legs: r.errand ? r.errand.length : 0,
    seated: !!(r.seat && !r.errand), care: !!r.care,
    x: +r.x.toFixed(2), z: +r.z.toFixed(2),
    seat: r.seat ? [+r.seat.x.toFixed(2), +r.seat.z.toFixed(2)] : null,
  })),
  ride: () => ride && { ...ride, atHz: Metro.STATIONS[ride.at].hz,
                        toHz: Metro.STATIONS[ride.to].hz, side: alightingSide() },
  putBag, pickBag, stowBag,
  bag: () => ({ carrying: carrying && carrying.item.hz,
                placed: placed && { hz: placed.item.hz, spot: placed.spot,
                                    on: World.BAG_SPOTS[placed.spot].hz } }),
  delivery: () => delivery && { ...delivery, item: delivery.item.hz, eta: deliveryEta() },
  SET, setPause, applySettings, get paused() { return paused; },
  clockRate: activeClockRate,
  tickNPCs: (dt) => updateNPCs(dt || 1 / 60, performance.now()),
  // Character-animation stage: read the current channels or hold a deterministic action/motion
  // pose for screenshots without spending time, moving needs, or firing an interaction.
  characterAnimationState, previewCharacterAction, previewCharacterMotion, clearCharacterPreview,
  Pick, menu: { open: openMenu, close: () => Pick.close(), move: d => Pick.move(d),
          confirm: () => Pick.confirm(),
          get isOpen() { return Pick.isOpen; }, get pick() { return Pick.at; } },
  showBody(on) { showBody = on; },
  holdFixtures(v) { fixHold = v; },        // null to hand control back to the game
  flat, latched, NPCS, PLAYER,
  // Frame rate, for the screenshot harness and for anyone poking at the console. `perfHold`
  // freezes the quality level so a run of shots is comparable with the last one.
  perf: () => ({ fps: Perf.fps, ms: Perf.frameMs, level: Perf.level,
                 auto: Perf.auto, stalls: Perf.stalls, q: Perf.q }),
  selectedLights: () => selectedLightDebug.map(l => ({...l})),
  mallLightSelection: () => mallLightSelectionDebug(mallLightSelectionState),
  mallPortalCull: () => Lazy.built('Mall')&&Mall.portalCull?Mall.portalCull.report():null,
  setMallPortalCull: on => Lazy.built('Mall')&&Mall.portalCull
    ? Mall.portalCull.setEnabled(on) : false,
  mallCrowdProfile: mallCrowdProfileAt,
  mallCrowd: mallCrowdState,
  mallCarry: mallCarryState,
  mallSocial: mallSocialState,
  mallFoodQueue: mallFoodQueueState,
  mallAccessibility: mallAccessibilityState,
  mallStaffChoreography: mallStaffChoreographyState,
  mallEventFlow: mallEventFlowNow,
  mallEventCast: mallEventCastState,
  rigMemory: () => typeof Assets !== 'undefined' && Assets.rigMemoryReport
    ? Assets.rigMemoryReport() : null,
  perfHold: v => Perf.setHold(v),
  perfLevel: i => Perf.setLevel(i),
  holdFrame: v => { frameHold = !!v; },
  setPlace, where: () => place,
  // The late-asset gate, for .roomgate.js: the place-id -> Lazy-module-name map it keys on, and
  // the table of places, so a check can prove every declared asset room is reachable by a real id.
  assetRoom, ASSET_ROOM, PLACE_IDS: () => Object.keys(PLACES),
  // The living loop, for .homelifecheck.js and .savecheck.js. This file is an IIFE, so a harness
  // cannot reach the module that runs the flat any other way. (`flat` itself is already exported
  // further down, beside `latched`.)
  HomeLife, flatLabel,
  // Seating/property audits need the actual scene mapping so touching each value deliberately
  // forces every lazy room to finish before its NPC spots are checked.
  places: () => PLACES,
  resolveNPCSeat,
  drawn: () => drawnProps,
  // The save, by hand. The autosave runs every few seconds and on the way out of the tab, neither
  // of which a test can wait for, and a save is only worth having if something checks that a life
  // survives a reload.
  saveNow: saveGame, loadNow: loadGame,
  saved: () => { try { return JSON.parse(localStorage.getItem(SAVEKEY)); } catch (_) { return null; } },
  // Hold the title screen on one shot of its cycle, or -1 to let it run. game.js does not share
  // a scope with the harness the way gl.js and figure.js do, so this has to be handed over.
  titleShot(i) { shotHold = i === undefined ? -1 : i; shotNow = -1; },
  titleShots: () => TITLE_SHOTS.map(s => s.place),
};
})();
