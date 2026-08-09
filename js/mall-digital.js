// 电子产品 · 未来数码 · FUTURE DIGITAL — floor 1
//
// This tenant's fit-out. Registering a function here overrides the inline `fit` still sitting in
// js/mall.js (see MallFit at the top of that file), so the two can be compared and the old one
// stays as the fallback until this is better than it.
//
// The callback is handed `A`, the shop's own local frame and toolkit. Coordinates are (a, b):
// `a` is depth measured inward from the outside wall, 0 at the back and 4.8 at the shopfront;
// `b` runs along the frontage, 0 at the centre and +/- half the unit's length at the ends. `y`
// is height above this shop's own floor, so the same numbers work on any deck.
//
//   A.put(a,b,da,db,h,y,colour,opt)   a box: `da` is its size along the depth axis, `db` its
//                                     size along the frontage, `h` its height. (The shell calls
//                                     these two `w, dp`; the order is the shell's, but the names
//                                     are the wrong way round and that cost an afternoon here.)
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.rail(a,b,len,colours[,tag,y])  a hanging clothes rail
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.table(a,b[,seats,r])           a table with chairs, collider included
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.th(hz,a,b,zh,en,note,reach,y)  something to look at; the player is put 1.15 m outward
//   A.light(a,b,y,rgb,power,radius)  one of this shop's own lamps
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What this shop is, and why it is laid out the way it is.
//
// A Chinese phone shop is not a room with goods in it. It is a room made almost entirely of
// light: a wall of identical televisions all playing the same loop, a run of white benches with
// handsets standing on angled stands and every one of them switched on, glass cases of boxed
// stock lit from under every shelf, and a slatwall of blister packs. The hard cool white
// overhead is what everything else is judged against, and the only saturated colour in the room
// is the house blue on the backlit signage. Get those four things right and it reads as this
// trade from the doorway, at four metres, before a single character is legible.
//
// So the back wall is divided into three: boxed stock behind glass on the left, the video wall in
// the middle, the accessory slatwall on the right. Two demo benches run down the room with the
// walk-through between them lined up on the door, and a lit vitrine sits in that gap so there is
// something to walk towards. The left bench is computers and tablets, the right one handsets, so
// the room sells three things and not one. The service counter runs down the right-hand side with
// the accessory wall behind it, which is where these shops put it, and its number board hangs over
// it on rods.
//
// Circulation was rebuilt rather than decorated, twice, and the second time was about where a body
// can stand rather than where it can walk.
//
//   The shell gives every tenant a window platform 1.05 m deep and 34 cm high along both bays of
//   the frontage, with no collision on it. So the front of the unit is not 2.3 m of floor, it is
//   0.98 m of floor and then a plinth. Any counter parked in that 0.98 m band leaves nobody
//   anywhere to stand: the service desk used to sit at a = 3.10, its front face 10 cm off the
//   platform, and the till label that the shell hangs 2 m in front of a counter put the player out
//   in the concourse, paying through the glass. It also split the front of the shop in two, so the
//   only route to the accessory wall was a gap behind the benches that measured 55 cm — one
//   centimetre narrower than a body, which is to say sealed.
//
//   Both are fixed by the same move. The counter is a service run down the right-hand side at
//   a = 2.26, with 82 cm of staff space behind it and the slatwall as its back wall; the front band
//   is now one clear 0.98 m lobby the whole 10.3 m of the frontage; the benches moved out 9 cm so
//   the back cross-aisle is 65 cm; and every label in the room was re-aimed at a spot the player
//   actually fits on. The flagship podium moved out of the lobby to the front-left corner for the
//   same reason.
//
// What the shop sells is what MALL_GOODS says it sells, and all seven of them are in the room:
// 耳机 on the counter and the slatwall, 手机壳 on the phone bench and in blister packs, 充电宝 and
// 数据线 on both benches and in the cable bins, 键盘 and 鼠标 down the front edge of the computer
// bench and boxed on the left-wall bay, 平板 on both benches and in the case.
//
// Five things this file is careful about, all of them things that cost a rebuild to learn:
//
//  * Depth runs *outward*, so anything that faces the customer must sit at a LARGER `a` than the
//    thing it is mounted on. A screen 5 mm on the wrong side of its own bezel is invisible.
//  * `rz` turns a prop in the (a, y) plane on this wall, and a POSITIVE rz tips the top towards
//    the shopfront — a phone leaning the wrong way shows its screen to the floor. Every stand
//    here leans negative. A mark on a leaning face cannot be offset in `y` alone or it slides off
//    the plane it is supposed to be printed on; `onFace` below moves both axes.
//  * `nrmAmt` defaults to 1, which is the entire relief of a photograph applied to a primitive
//    that has none. On flat panels that is not texture, it is a grey cloud that reads as baked-in
//    dirt, and it was on every textured surface in this shop. Everything here caps it at .28.
//  * `metal` as a material multiplies what it is on by about 4.4x, which turns dark metalwork
//    white. This shop wears `steel` (CorrugatedSteel009 — ribs, not a smooth sheet) on the one
//    surface that actually wants ribs, the slatwall, and painted plaster at a low amount on the
//    rest of the joinery. Nothing emissive wears a material at all.
//  * Emissive spheres bloom far harder than emissive strips, because the glow pass is additive
//    and a ball concentrates what a strip spreads. There is not one emissive round thing in here.

// ===============================================================================================
// 未来数码 · what the shop actually does for you
//
// Everything from here to `MallFit['电子产品']` is the shop as a *business* rather than as a room:
// two handsets you can hold side by side and argue about, a demo phone that takes a real
// photograph of whatever you are looking at, a listening post that plays three genuinely different
// pieces of music through three genuinely different pairs of headphones, a console demo you can be
// good or bad at, a warranty desk that sells an extended plan, a repair booking that gives you a
// numbered ticket and makes you come back for it, and a data-transfer service that moves the
// photographs you actually took.
//
// It is one closure, hung on `window.MallDigital` so a harness can drive every part of it without
// a mouse. Three things about the wiring are worth knowing before changing any of it.
//
//  * **The verbs are rows in `USE_AT.mall`, installed as getters.** game.js resolves what Q means
//    by `USE_AT[place][hz]`, and it resolves it again every frame it draws the walk-up prompt. A
//    getter is therefore a definition that can answer differently depending on what has already
//    happened, which is the whole of how 取件 refuses until the repair is actually finished and how
//    the warranty desk turns from 问保修 into 买延保 once you own something. They are called at
//    display rate, so each one builds a small object literal and touches nothing else — no clock
//    reads, no allocation beyond the literal, no work that is not a string.
//
//  * **Completion is detected from the game's own `#doing` panel, and that is a shim.** A tenant
//    file cannot add a branch to the post-action dispatcher in game.js, and that dispatcher is the
//    only place the engine says "this action finished". So the shop's motion tick watches the
//    panel game.js puts the current verb into: `.on` appearing with one of this shop's verbs in it
//    is the press, and `.on` going away again after at least 85% of that action's own duration is
//    the completion. Escape lands far under that and is correctly ignored. The console demo is
//    judged on the *press* rather than the completion, because that is what a reaction game is.
//    See REQUESTS at the foot of this file for the two lines in game.js that retire the shim.
//
//  * **The photograph is a real frame.** js/gl.js:2913 builds the WebGL2 context with
//    `preserveDrawingBuffer:true`, in its own words "what a screenshot needs" — the drawing buffer
//    survives the swap, so `#cv` can be read back after it has been presented. The demo phone reads
//    it with `toDataURL`. Nothing here paints a fake picture. Nothing here writes one to
//    localStorage either: a JPEG of a 1280-wide canvas is well over 100 kB and the save lives in
//    the same 5 MB bucket, so the roll is held in memory and only its count is persisted.
//
// No real brand names anywhere: 白鹭 and 长风 are invented, and so is every model number, price and
// specification printed beside them.
const MallDigital = (() => {
  // ---------------------------------------------------------------- the two handsets
  // A comparison is only worth making if the two things genuinely disagree, and disagree in both
  // directions — a phone that wins every row is not a comparison, it is an advertisement. So the
  // light one is cheaper, sharper-eyed and easier to carry, and the big one has the screen, the
  // battery and the storage. Which you would buy is a real question, which is the point.
  const AA = { hz:'白鹭7', py:'Báilù qī', en:'Egret 7' };
  const BB = { hz:'长风9', py:'Chángfēng jiǔ', en:'Longwind 9' };
  // `win` is which of the two the row favours: -1 the 白鹭, +1 the 长风. `note` is the gloss the
  // game shows under the sentence, in the same shape every other word in this project uses.
  const SPECS = [
    { hz:'屏幕', py:'píngmù', en:'screen', a:'6.1寸', b:'6.7寸', win:1,
      note:'屏 screen + 幕 curtain. 寸 cùn is the inch a screen is measured in.',
      zh:'白鹭7的屏幕六点一寸，长风9六点七寸，长风大一些。',
      tr:'The Egret 7 has a 6.1-inch screen and the Longwind 9 a 6.7-inch — the Longwind is bigger.' },
    { hz:'电池', py:'diànchí', en:'battery', a:'4300毫安', b:'5200毫安', win:1,
      note:'电 electric + 池 pool. 毫安 háo’ān is the milliamp a battery is rated in.',
      zh:'长风9的电池五千二百毫安，比白鹭7耐用。',
      tr:'The Longwind 9 has a 5200 mAh battery — it lasts longer than the Egret 7.' },
    { hz:'像素', py:'xiàngsù', en:'megapixels', a:'5000万', b:'4800万', win:-1,
      note:'像 image + 素 element. 万 wàn is ten thousand, so 5000万 is fifty million.',
      zh:'白鹭7的相机五千万像素，比长风9清楚一点。',
      tr:'The Egret 7 camera is 50 megapixels — a little sharper than the Longwind 9.' },
    { hz:'重量', py:'zhòngliàng', en:'weight', a:'172克', b:'206克', win:-1,
      note:'重 heavy + 量 quantity. 克 kè is a gram.',
      zh:'白鹭7只有一百七十二克，长风9两百零六克，白鹭轻得多。',
      tr:'The Egret 7 is only 172 grams against the Longwind 9’s 206 — much lighter.' },
    { hz:'内存', py:'nèicún', en:'storage', a:'256G', b:'512G', win:1,
      note:'内 inner + 存 to store — the memory inside the machine.',
      zh:'长风9的内存五百一十二G，是白鹭7的两倍。',
      tr:'The Longwind 9 has 512 GB of storage, twice the Egret 7.' },
    { hz:'价格', py:'jiàgé', en:'price', a:'3299元', b:'4599元', win:-1,
      note:'价 price + 格 standard. 元 yuán is the written form of 块.',
      zh:'白鹭7三千二百九十九，长风9四千五百九十九，差一千三。',
      tr:'The Egret 7 is 3299 and the Longwind 9 is 4599 — thirteen hundred between them.' },
  ];

  // ---------------------------------------------------------------- the listening post
  // Three pieces of music that are not the same music, played through three pairs of headphones
  // that are not the same headphones. Both halves matter: a demo where the track changes but the
  // sound does not is a playlist, and a demo where the EQ changes but the track does not is a
  // tone control. Each pad is a genre and the pair it is wired to, because that is how a shop
  // actually sets one of these up — the bass pair is on the rock pad, and never the other way.
  const SAMPLES = [
    { hz:'古筝', py:'gǔzhēng', en:'a solo zheng piece', can:'均衡', canPy:'jūnhéng',
      canEn:'the balanced pair', note:'古 ancient + 筝 zheng, the long plucked zither.',
      zh:'这副声音很均衡，古筝的高音很干净。',
      tr:'This pair is balanced — the high notes of the zheng stay clean.' },
    { hz:'摇滚', py:'yáogǔn', en:'a rock track', can:'重低音', canPy:'zhòngdīyīn',
      canEn:'the bass-heavy pair', note:'摇 to shake + 滚 to roll — rock and roll, translated.',
      zh:'这副低音很重，摇滚听着很带劲。',
      tr:'This pair is heavy on the bass — rock sounds punchy on it.' },
    { hz:'播客', py:'bōkè', en:'a talk podcast', can:'降噪', canPy:'jiàngzào',
      canEn:'the noise-cancelling pair', note:'播 to broadcast + 客 guest. 降噪 is noise reduction.',
      zh:'按一下降噪，商场的声音一下子就小了。',
      tr:'Switch the noise cancelling on and the mall drops away all at once.' },
  ];

  // ---------------------------------------------------------------- state
  // Everything the shop remembers about you. `photos` is the only field that is not persisted —
  // see the note in the header — so a reload keeps the count and loses the pictures, which is the
  // right trade for a 5 MB bucket shared with the actual save.
  const KEY = 'bjlife.mall.digital.v1';
  const blank = () => ({
    day: 0, cmp: 0, sample: 0, plays: 0, shots: 0, transfers: 0, collected: 0,
    demo: { round: 0, hits: 0, best: -1 },
    warranty: null,       // { until }        the free twelve-month cover, on anything bought here
    plan: null,           // { until }        the paid extended plan
    repair: null,         // { no, day, at }  the open repair, and when it can be collected
  });
  let S = blank();
  const photos = [];      // { url, w, h, when } — memory only
  let day = 0, mins = 12 * 60;

  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') S = { ...blank(), ...raw, demo: { ...blank().demo, ...(raw.demo || {}) } };
    } catch (_) { /* private window, or somebody's half-written JSON. Start clean. */ }
  }
  function persist() {
    S.day = day;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* full — not fatal */ }
  }
  // A new game rewinds the calendar, and a repair ticket for day 14 sitting in a save that is on
  // day 1 is a ticket that can never be collected. Anything from a later day than the one we are
  // standing in belongs to a life that no longer exists.
  function reconcile(d) {
    if (!Number.isFinite(d)) return;
    if (d < day) { /* clock moved back within a session; harmless */ }
    day = d;
    if (S.day > d + 1) { S = blank(); S.day = d; persist(); }
  }
  const clockDay = () => day;
  const clockMin = () => mins;
  // Whether an appointment written as { day, at } has come round yet.
  const due = q => !!q && (day > q.day || (day === q.day && mins >= q.at));
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m) % 60).padStart(2, '0')}`;

  // ---------------------------------------------------------------- the photograph
  // The engine's frame-capture path, used rather than imitated. Everything else in this function
  // is failure handling: a browser that refuses `toDataURL` on a tainted canvas, a canvas that is
  // not there yet, and a roll that is not allowed to grow without limit.
  const ROLL = 8;
  function capture() {
    const cv = document.getElementById('cv');
    if (!cv || !cv.width || !cv.height) return null;
    let url = null;
    try { url = cv.toDataURL('image/jpeg', 0.82); } catch (_) { return null; }
    if (!url || url.length < 512) return null;      // a blank buffer encodes to almost nothing
    const shot = { url, w: cv.width, h: cv.height, when: mins };
    photos.unshift(shot);
    while (photos.length > ROLL) photos.pop();
    S.shots++; persist();
    return shot;
  }
  // Where a phone would show it: bottom left, small, briefly, and unable to take a click off
  // anything underneath it. This is the tenant's own element and its own inline styling —
  // index.html's stylesheet belongs to somebody else, and so does every id in it.
  //
  // The same element carries the shop's short spoken-aside messages, because the one fixed `done`
  // sentence a USE row can hold cannot say a ticket number, a score or which pair you just heard.
  let shotEl = null, shotTimer = 0;
  function panel() {
    if (typeof document === 'undefined') return null;
    if (!shotEl) {
      shotEl = document.createElement('div');
      shotEl.id = 'mdShot';
      shotEl.style.cssText = 'position:fixed;left:18px;bottom:104px;width:212px;z-index:30;' +
        'pointer-events:none;border-radius:8px;overflow:hidden;background:#11151a;' +
        'box-shadow:0 6px 22px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.16);' +
        'font:12px/1.45 system-ui,sans-serif;color:#eef3f8;opacity:0;transition:opacity .35s';
      document.body.appendChild(shotEl);
    }
    return shotEl;
  }
  function hold(el) {
    el.style.opacity = '1';
    clearTimeout(shotTimer);
    shotTimer = setTimeout(() => { if (shotEl) shotEl.style.opacity = '0'; }, 5200);
  }
  function review(shot, caption) {
    const el = shot && panel();
    if (!el) return;
    el.innerHTML = `<img src="${shot.url}" style="display:block;width:100%;height:auto">` +
      `<div style="padding:6px 8px 7px">${caption}</div>`;
    hold(el);
  }
  function card(zh, en) {
    const el = panel();
    if (!el) return;
    el.innerHTML = `<div style="padding:9px 10px 10px"><b style="font-size:15px">${zh}</b>` +
      `<div style="opacity:.72;margin-top:3px">${en}</div></div>`;
    hold(el);
  }

  // ---------------------------------------------------------------- the sound
  // Three clips built rather than loaded: this project ships no audio files for a shop, and three
  // downloads would be three more things that can fail on boot. What matters is that they are
  // audibly different from one another in *kind* and not only in pitch — a plucked pentatonic
  // phrase, a distorted power chord with a drum under it, and speech-band noise with a room tone
  // that drops away when the noise cancelling comes on. Each one is also shaped by the pair it is
  // wired to, so the bass pair really does move the low end.
  let AC = null;
  function ctx() {
    if (AC === null) {
      const K = window.AudioContext || window.webkitAudioContext;
      AC = K ? new K() : false;
    }
    if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (_) {} }
    return AC || null;
  }
  // Loudness discipline: everything below runs through one gain node at a level the mall's own
  // announcements sit under, because a shop demo that is louder than the building is a bug.
  function bus(ac, level) {
    const g = ac.createGain();
    g.gain.value = level;
    g.connect(ac.destination);
    return g;
  }
  function pluck(ac, out, t, freq, len, level) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.02);
  }
  // One buffer, built the first time the podcast pad is pressed and then kept. Three seconds of
  // Math.random() at 48 kHz is a 144,000-iteration loop and a 576 kB allocation, and the podcast
  // wants two of them; run per press, on the main thread, in a building that has to hold 60 fps,
  // that is a visible hitch every time somebody touches the listening post. An AudioBuffer is
  // immutable once written and any number of BufferSources can read the same one, so the room
  // tone and the speech band share it — different filters, different envelopes, one buffer.
  // Nothing is built until the first press, so a player who never uses the pads never pays.
  let NOISE = null;
  function noiseBuf(ac, secs) {
    if (NOISE && NOISE.sampleRate === ac.sampleRate && NOISE.duration >= secs - .001) return NOISE;
    const n = Math.max(1, Math.floor(ac.sampleRate * secs));
    const b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    NOISE = b;
    return b;
  }
  function curve() {
    const n = 512, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(x * 4.2); }
    return c;
  }
  // 古筝, on the balanced pair: a five-note pentatonic run and its echo, no EQ shaping at all,
  // which is what "balanced" has to mean if the other two are to sound like anything.
  function playZheng(ac) {
    const out = bus(ac, 0.16), t0 = ac.currentTime + 0.03;
    const D = [587.33, 659.25, 783.99, 880.00, 1046.50, 880.00, 783.99, 659.25];
    D.forEach((f, i) => {
      pluck(ac, out, t0 + i * 0.19, f, 0.62, 0.55);
      if (i % 2 === 0) pluck(ac, out, t0 + i * 0.19 + 0.095, f * 2, 0.30, 0.16);
    });
    return t0 + D.length * 0.19 + 0.6;
  }
  // 摇滚, on the bass-heavy pair: root and fifth through a soft clipper, a low shelf lifted the way
  // a bass pair lifts it, and a kick on every beat so the low end has something to demonstrate.
  function playRock(ac) {
    const out = bus(ac, 0.11), t0 = ac.currentTime + 0.03;
    const shelf = ac.createBiquadFilter();
    shelf.type = 'lowshelf'; shelf.frequency.value = 140; shelf.gain.value = 11;
    const sh = ac.createWaveShaper(); sh.curve = curve(); sh.oversample = '2x';
    sh.connect(shelf); shelf.connect(out);
    for (const f of [98.00, 146.83, 196.00]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.30, t0 + 0.04);
      g.gain.setValueAtTime(0.30, t0 + 2.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.45);
      o.connect(g); g.connect(sh); o.start(t0); o.stop(t0 + 2.5);
    }
    for (let i = 0; i < 5; i++) {                       // the kick
      const t = t0 + i * 0.48, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(128, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.24);
    }
    return t0 + 2.6;
  }
  // 播客, on the noise-cancelling pair. Speech is band-limited noise with a syllable envelope on
  // it, which at this length is a better imitation of somebody talking than any tone is. Under it
  // runs a room tone — and 1.1 seconds in, the room tone is taken away. That drop is the demo.
  function playPodcast(ac) {
    const out = bus(ac, 0.15), t0 = ac.currentTime + 0.03;
    const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, 3.0);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 1.1;
    const vg = ac.createGain(); vg.gain.setValueAtTime(0.0001, t0);
    // Eleven syllables of uneven length, which is what stops it sounding like a siren.
    let t = t0 + 0.10;
    for (let i = 0; i < 11; i++) {
      const len = 0.10 + (i % 3) * 0.045;
      vg.gain.exponentialRampToValueAtTime(0.36 + (i % 2) * 0.10, t + 0.02);
      vg.gain.exponentialRampToValueAtTime(0.02, t + len);
      t += len + 0.055 + (i === 5 ? 0.17 : 0);         // and a breath in the middle of the sentence
    }
    vg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(bp); bp.connect(vg); vg.connect(out);
    src.start(t0); src.stop(t0 + 3.0);
    const room = ac.createBufferSource(); room.buffer = noiseBuf(ac, 3.0); room.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.55, t0);
    rg.gain.setValueAtTime(0.55, t0 + 1.10);
    rg.gain.exponentialRampToValueAtTime(0.012, t0 + 1.55);   // 降噪 switched on
    room.connect(lp); lp.connect(rg); rg.connect(out);
    room.start(t0); room.stop(t0 + 3.0);
    return t0 + 3.1;
  }
  const PLAYERS = [playZheng, playRock, playPodcast];
  function playSample(i) {
    const ac = ctx();
    if (!ac) return false;
    try { PLAYERS[((i % 3) + 3) % 3](ac); } catch (_) { return false; }
    S.plays++; persist();
    return true;
  }

  // ---------------------------------------------------------------- the console demo
  // A light runs along five cells and you press when it is on the middle one. That is the whole
  // game, and it is a game rather than a button because the runner speeds up every round and the
  // judgement is made on the press rather than on the completion — pressing Q here is a shot, and
  // waiting the 1.1 seconds out is only watching your own shot land.
  //
  // The runner's position is a pure function of the clock, so the lamps on the cabinet and the
  // scoring agree by construction; there is no accumulator that can drift between them.
  const ROUNDS = 5;
  const demo = { t: 0, live: false, cell: 2, verdict: null };
  const demoRate = () => 3.0 + S.demo.round * 0.85;                 // cells per second, and rising
  function demoCellAt(t) {
    const span = 8;                              // 0..4 and back down again, so it bounces
    const k = Math.floor(t * demoRate()) % span;
    return k < 5 ? k : span - k;
  }
  function demoShoot() {
    const c = demoCellAt(demo.t);
    const hit = c === 2;
    if (hit) S.demo.hits++;
    S.demo.round++;
    demo.verdict = hit;
    if (S.demo.round >= ROUNDS) {
      if (S.demo.hits > S.demo.best) S.demo.best = S.demo.hits;
    }
    persist();
    return hit;
  }
  function demoDone() { return S.demo.round >= ROUNDS; }
  function demoReset() { S.demo.round = 0; S.demo.hits = 0; persist(); }

  // ---------------------------------------------------------------- warranty, repair, transfer
  const PLAN_PRICE = 199, REPAIR_PRICE = 160, TRANSFER_PRICE = 30;
  // Owning something from this shop is what the warranty desk is about, and the shop already knows:
  // game.js keeps everything you have paid for in `mallBought`, which is on `__game.state()`.
  // Read rarely — this is a clock-and-inventory read, so it happens on completion, never in a
  // getter.
  const OURS = ['耳机', '手机壳', '充电宝', '数据线', '键盘', '鼠标', '平板'];
  function boughtHere() {
    const g = window.__game;
    if (!g || typeof g.state !== 'function') return false;
    let st = null;
    try { st = g.state(); } catch (_) { return false; }
    const b = (st && st.bought) || [];
    return b.some(q => OURS.includes(q && (q.hz || q.item && q.item.hz || q)));
  }
  function registerWarranty() {
    if (!S.warranty) { S.warranty = { until: day + 365 }; persist(); }
    return S.warranty;
  }
  function buyPlan() { S.plan = { until: day + 730 }; persist(); return S.plan; }
  // A repair ticket is a number you are given and a time you are told, and both have to survive
  // walking out of the building. W-1000 upward, so no two visits collide inside one save.
  function bookRepair(what) {
    if (S.repair) return S.repair;
    const no = 'W-' + (1043 + (S.collected + S.transfers + S.shots) % 900 + (day % 40) * 3);
    S.repair = { no, what: what || '换屏幕', day: day + 1, at: 15 * 60 };
    persist();
    return S.repair;
  }
  function collectRepair() {
    if (!S.repair || !due(S.repair)) return null;
    const r = S.repair;
    S.repair = null; S.collected++;
    registerWarranty();
    persist();
    return r;
  }
  function transfer() { S.transfers++; persist(); return { photos: photos.length, shots: S.shots }; }

  return {
    AA, BB, SPECS, SAMPLES, PLAN_PRICE, REPAIR_PRICE, TRANSFER_PRICE, ROUNDS,
    restore, persist, reconcile, photos, card, review,
    // `live` hands back the state object itself rather than a copy, because the USE getters read
    // three fields off it at display rate and a copy per frame per fixture is garbage for nothing.
    live: () => S,
    state: () => ({ ...S, demo: { ...S.demo }, photos: photos.length, day, mins }),
    setClock(d, m) { reconcile(d); if (Number.isFinite(m)) mins = m; },
    clockDay, clockMin, due, hhmm,
    capture, review, playSample, boughtHere, registerWarranty, buyPlan,
    bookRepair, collectRepair, transfer,
    demo, demoCellAt, demoShoot, demoDone, demoReset, demoRate,
    reset() { S = blank(); photos.length = 0; persist(); },
  };
})();
if (typeof window !== 'undefined') window.MallDigital = MallDigital;

MallFit['电子产品'] = (A) => {
  // ---------------------------------------------------------------- palette
  // Deliberately narrow: four greys, one blue, one amber. The blue is the only chroma above about
  // 20% in the room and it is reserved for signage, so the signage is what the eye goes to.
  const K = {
    panel:  C('#22272d'), panelD: C('#13171c'), bezel: C('#090b0e'), trim: C('#2c3035'),
    white:  C('#f4f2ec'), lacq:   C('#e6e4de'), card:  C('#e9e4d6'), carton: C('#ddd7c8'),
    steel:  C('#98a1a8'), steelD: C('#5e686f'), glass: C('#9fc2d3'),
    // Hexes here are linear values, not what a browser would show: the shader tonemaps and then
    // converts to sRGB, which lifts everything by a lot. A sign authored at the blue you actually
    // want comes out of the frame as swimming-pool cyan, so the signage blue is two stops down.
    blue:   C('#154572'), cool:   C('#d8e8f4'), ink:   C('#f2f8ff'), gold: C('#f3d47b'),
    // The picture on every screen in the shop, and the whole reason the room used to look like a
    // wall of backlit posters. It was two solid slabs — 48% of each panel in #3f96c4, which comes
    // out of the frame as pale swimming-pool cyan — and twelve of those side by side read as
    // painted board however hard they glow. What says *video* is a dark panel with a lit picture
    // letterboxed inside it, a value gradient down the sky, exactly one thin bright line at the
    // horizon and a genuinely dark foreground. Four values do that; two slabs never will, however
    // they are coloured. `horiz` is the old cyan, kept, but as a 4 cm band rather than half a
    // television, which is the one place in the room a colour that hot belongs.
    scrK:   C('#05070a'), skyD:   C('#0b2c4c'), sky:   C('#12456e'), horiz: C('#3f96c4'),
    sea:    C('#04121f'), sun:    C('#c4712e'), amber: C('#e0a23c'),
    caseA:  C('#3f6f8e'), caseB:  C('#8a5064'), caseC: C('#4a7a5e'), caseD: C('#8a6a3a'),
  };
  // Two materials, no more. Every distinct combination of (mesh, mode, radius, textures, scale,
  // amounts) is one more instanced batch, and a shop that names six materials pays for six.
  const SL = { mat:'steel',   matScale:.30, matAmt:.20, nrmAmt:.28 };   // ribbed slatwall
  const PJ = { mat:'plaster', matScale:.80, matAmt:.14, nrm:null };     // sprayed MDF joinery
  // Where a mark printed on a leaning face actually goes. `out` is towards the customer along the
  // face's own normal, `u` is up the face; both of them move `a` as well as `y` once the face is
  // tilted, and offsetting in `y` alone is what makes a highlight float off the front of a phone.
  const onFace = (a, y, lean, out, u) => [
    a + Math.cos(lean) * out + Math.sin(lean) * u,
    y - Math.sin(lean) * out + Math.cos(lean) * u];

  // ---------------------------------------------------------------- parts
  // The loop every screen in the shop is playing, in three frames. A television wall does run one
  // feed, but twelve copies of one still image is wallpaper, so the wall is dressed as though the
  // panels are a beat apart: same composition, same palette, different band heights and a sun in
  // a different place. Read across, it looks like something moving.
  //   sky  how much of the picture is above the horizon      hz  the height of the bright line
  //   sb   where the warm mark sits across the frame          sr  how big it is
  //   sy   how far down the sky it sits
  const LOOP = [
    { sky:.54, hz:.055, sb:-.27, sr:.055, sy:.42 },
    { sky:.62, hz:.040, sb: .31, sr:.040, sy:.30 },
    { sky:.46, hz:.075, sb: .09, sr:.070, sy:.55 },
  ];
  const screenFx=[], poweredScreens=[];
  const powered=p=>{for(const q of [p].flat(Infinity))if(q)poweredScreens.push(q);return p;};
  // One picture. Eight flat boxes, each standing a clear 4 mm in front of the one behind it — two
  // emissive quads sharing a plane fight for the depth buffer and flicker between frames.
  function screen(a, b, w, h, y, v) {
    const F = LOOP[((v % LOOP.length) + LOOP.length) % LOOP.length];
    const pw = w - .026;                 // the picture, inside the panel's own black margin
    const ph = (h - .022) * .84;         // letterboxed, because that is what a demo reel is
    const top = y + ph / 2;
    const sky = ph * F.sky, hz = ph * F.hz, sea = ph - sky - hz;
    powered(A.put(a,b,.010,w,h,y,K.scrK,{hard:true,mode:1,glow:.02}));
    // The sky in two values, darker at the top. One flat sky and one flat sea is a flag; the
    // gradient is the whole difference between a picture and a painted panel.
    powered(A.put(a+.007,b,.005,pw,sky*.46,top-sky*.23,K.skyD,{hard:true,mode:1,glow:.05}));
    powered(A.put(a+.007,b,.005,pw,sky*.54,top-sky*.73,K.sky,{hard:true,mode:1,glow:.08}));
    const horizon=powered(A.put(a+.012,b,.004,pw,hz,top-sky-hz/2,
      K.horiz,{hard:true,mode:1,glow:.20}));
    powered(A.put(a+.007,b,.005,pw,sea,top-sky-hz-sea/2,K.sea,{hard:true,mode:1,glow:.03}));
    const sunB=b+pw*F.sb, sunY=top-sky*F.sy;
    const sun=powered(A.put(a+.017,sunB,.004,pw*F.sr,ph*F.sr*1.5,sunY,
      K.sun,{hard:true,mode:1,glow:.22}));
    powered(A.put(a+.017,b-pw*.26,.004,pw*.30,ph*.046,top-ph*.86,
      K.cool,{hard:true,mode:1,glow:.11}));               // caption bar
    const bug=powered(A.put(a+.017,b+pw*.42,.004,pw*.050,ph*.070,top-ph*.09,
      K.amber,{hard:true,mode:1,glow:.16}));              // channel bug
    A.dynamic(sun,a+.017,sunB,sunY,Math.max(w,h)*.62);
    A.dynamicVisual(horizon,bug);
    screenFx.push({horizon,sun,bug,a:a+.017,b:sunB,phase:v*1.9+screenFx.length*.31});
  }
  // One television: a black body, a machined chin under it and a face standing proud of both. The
  // body is bigger than the picture on every side, which is the whole of what makes it a set
  // rather than a rectangle.
  function tv(a, b, w, h, y, v) {
    A.put(a, b, .062, w + .05, h + .05, y, K.bezel, {hard:true, gloss:.40});
    A.put(a + .022, b, .020, w * .22, .014, y - h / 2 - .032, K.steelD, {hard:true, gloss:.55});
    screen(a + .043, b, w, h, y, v);
  }
  // A shelf-edge price card: white, a band of house colour across the head of it, a rule under
  // that. A wall of televisions with no tickets on it is a showroom; a shop prices everything.
  function ticket(a, b, y, w = .24, h = .13) {
    A.put(a,        b, .010, w,       h,       y,           K.white,  {hard:true, gloss:.16});
    A.put(a + .008, b, .004, w - .04, h * .30, y + h * .29, K.blue,   {hard:true, mode:1, glow:.13});
    A.put(a + .008, b, .004, w - .07, h * .09, y - h * .16, K.steelD, {hard:true, gloss:.20});
  }
  // A handset on a demo stand, tethered. The two pieces that matter are the tether — no shop lets
  // you pick one up loose — and the lean, which has to face the screen up at a standing customer
  // rather than out at their knees.
  function handset(a, b, y, c, lean = -.30) {
    const cy = y + .118, o = {hard:true, rz:lean};
    const f = (out, u) => onFace(a, cy, lean, out, u);
    A.put(a + .050, b, .14, .15, .013, y + .007, K.trim,   {hard:true, gloss:.44});
    A.put(a + .028, b, .05, .07, .075, y + .046, K.steelD, {...o, gloss:.50});
    A.put(a,        b, .013, .084, .164, cy, c,            {...o, gloss:.44});
    const s0 = f(.009, 0), s1 = f(.014, .052), s2 = f(.014, -.024);
    // A portrait home screen: dark field, one square app tile and a low dock. These deliberately
    // replace the generic landscape bands used here before, so a handset still reads as a handset
    // when every glyph in the room is hidden.
    powered(A.put(s0[0],b,.005,.072,.150,s0[1],K.scrK,
      {...o,mode:1,glow:.04,mallDigitalPreview:'phone',mallDigitalPreviewRole:'home'}));
    powered(A.put(s1[0],b-.018,.004,.025,.025,s1[1],K.horiz,
      {...o,mode:1,glow:.24,mallDigitalPreview:'phone',mallDigitalPreviewRole:'app'}));
    powered(A.put(s2[0],b,.004,.058,.014,s2[1],K.sky,
      {...o,mode:1,glow:.11,mallDigitalPreview:'phone',mallDigitalPreviewRole:'dock'}));
    A.cap(a - .055, b, y + .055, .009, .105, .009, K.trim, {gloss:.30});   // tether to the bench
    A.put(a + .155, b, .095, .115, .004, y + .026, K.card, {hard:true, gloss:.10, rz:-.42});
    A.put(a + .140, b, .060, .095, .004, y + .036, K.blue, {hard:true, mode:1, glow:.10, rz:-.42});
  }
  // The same again, bigger and laid flatter, because that is how a tablet is actually propped.
  function tablet(a, b, y, c) {
    const cy = y + .132, lean = -.52, o = {hard:true, rz:lean};
    const f = (out, u) => onFace(a, cy, lean, out, u);
    A.put(a + .075, b, .19, .24, .014, y + .007, K.trim,   {hard:true, gloss:.44});
    A.put(a + .042, b, .07, .10, .085, y + .050, K.steelD, {...o, gloss:.50});
    A.put(a,        b, .015, .180, .248, cy, c,            {...o, gloss:.42});
    const s0 = f(.011, 0), s1 = f(.017, .082), s2 = f(.017, -.030);
    // A tablet is a media canvas: broad picture above a hairline transport bar, with none of the
    // phone's icon/dock rhythm and none of the laptop's page/sidebar split.
    powered(A.put(s0[0],b,.005,.164,.230,s0[1],K.scrK,
      {...o,mode:1,glow:.04,mallDigitalPreview:'tablet',mallDigitalPreviewRole:'canvas'}));
    powered(A.put(s1[0],b,.004,.142,.092,s1[1],K.sky,
      {...o,mode:1,glow:.16,mallDigitalPreview:'tablet',mallDigitalPreviewRole:'picture'}));
    powered(A.put(s2[0],b,.004,.132,.012,s2[1],K.horiz,
      {...o,mode:1,glow:.23,mallDigitalPreview:'tablet',mallDigitalPreviewRole:'timeline'}));
    A.cap(a - .070, b, y + .058, .009, .112, .009, K.trim, {gloss:.30});
  }
  // An open laptop: base, a dark keyboard field, a trackpad, and the lid hinged at the back edge
  // and tipped away from the customer. The hinge is the piece to get right — a lid whose bottom
  // edge floats above its own base is a screen leaning on nothing, so the lid is placed by walking
  // half its height out along its own axis from the hinge line rather than guessed at.
  function laptop(a, b, y, c) {
    const lean = -.36, o = {hard:true, rz:lean};
    const hA = a - .132, hy = y + .020;                 // the hinge line, at the back of the base
    const ca = hA + Math.sin(lean) * .126, cy = hy + Math.cos(lean) * .126;
    const f = (out, u) => onFace(ca, cy, lean, out, u);
    A.put(a,        b, .27, .38, .018, y + .009, c,       {hard:true, gloss:.44});
    A.put(a - .012, b, .17, .32, .005, y + .020, K.bezel, {hard:true, gloss:.24});
    A.put(a + .078, b, .07, .11, .005, y + .020, K.steel, {hard:true, gloss:.34});
    A.put(ca, b, .014, .35, .252, cy, c, {...o, gloss:.42});
    const s0 = f(.011, 0), s1 = f(.016, .082), s2 = f(.016, -.030);
    // Desktop composition: a pale document beside a blue tool rail. Its open keyboard already
    // supplies the silhouette; this asymmetric screen makes it unambiguous in a UI-free close-up.
    powered(A.put(s0[0],b,.005,.322,.228,s0[1],K.scrK,
      {...o,mode:1,glow:.04,mallDigitalPreview:'laptop',mallDigitalPreviewRole:'desktop'}));
    powered(A.put(s1[0],b+.045,.004,.188,.164,s1[1],K.cool,
      {...o,mode:1,glow:.12,mallDigitalPreview:'laptop',mallDigitalPreviewRole:'page'}));
    powered(A.put(s2[0],b-.112,.004,.044,.164,s2[1],K.blue,
      {...o,mode:1,glow:.15,mallDigitalPreview:'laptop',mallDigitalPreviewRole:'sidebar'}));
    A.put(a + .150, b, .095, .115, .004, y + .026, K.card, {hard:true, gloss:.10, rz:-.42});
    A.put(a + .135, b, .060, .095, .004, y + .036, K.blue, {hard:true, mode:1, glow:.10, rz:-.42});
  }
  // Headphones on a stand. This was an ellipsoid on a stick and read as a black mushroom; what
  // makes a pair legible at two metres is the squared arch of the band with daylight under it and
  // two cups hanging off the ends, not a smooth blob. Eight pieces, none of them round on top.
  function cans(a, b, y, c) {
    const t = y + .40;
    A.put(a + .028, b, .16, .18, .014, y + .007, K.trim, {hard:true, gloss:.44});
    A.cyl(a, b, y + .19, .015, .36, K.steelD, {gloss:.50});
    A.put(a, b, .05, .17, .022, y + .378, K.steelD, {hard:true, gloss:.50});
    A.put(a, b, .028, .20, .026, t, c, {hard:true, gloss:.30, round:.012});
    for (const s of [-1, 1]) {
      A.put(a, b + s * .088, .028, .026, .100, t - .055, c, {hard:true, gloss:.30});
      A.cyl(a, b + s * .088, t - .128, .050, .038, c, {rx:Math.PI / 2, gloss:.26});
      A.cyl(a, b + s * .110, t - .128, .036, .014, K.panelD, {rx:Math.PI / 2, gloss:.14});
    }
  }
  // A boxed handset. A shelf of plain white cubes is a shelf of nothing; the band of house colour
  // across the face is what says stock at three metres.
  function carton(a, b, y, h, c) {
    A.put(a,        b, .20, .17, h, y + h / 2, K.carton, {hard:true, gloss:.14});
    A.put(a + .106, b, .012, .152, h * .28, y + h * .63, c, {hard:true, gloss:.22});
  }
  // A handset standing on a shelf inside a locked case: no stand, no tether, no ticket — just the
  // thing itself on a small riser, which is how the top shelf of one of these is dressed.
  function shelfPhone(a, b, y, c) {
    const lean = -.16, o = {hard:true, rz:lean}, cy = y + .087;
    const f = (out, u) => onFace(a, cy, lean, out, u);
    A.put(a + .030, b, .07, .09, .012, y + .006, K.steelD, {hard:true, gloss:.44});
    A.put(a, b, .012, .078, .152, cy, c, {...o, gloss:.44});
    // A bezel all the way round, and the picture inside it rather than instead of it. Filled to
    // the edge these read as four blue lozenges standing on a shelf, not as four telephones.
    const s0 = f(.009, 0), s1 = f(.013, .040), s2 = f(.013, -.030);
    powered(A.put(s0[0],b,.004,.056,.116,s0[1],K.sea,{...o,mode:1,glow:.06}));
    powered(A.put(s1[0],b,.003,.050,.030,s1[1],K.sky,{...o,mode:1,glow:.14}));
    powered(A.put(s2[0],b,.003,.040,.008,s2[1],K.horiz,{...o,mode:1,glow:.22}));
  }
  // A blister pack on a peg: printed card, the thing itself moulded onto the front of it, and a
  // strip of house colour along the header where the price would be.
  function pack(a, b, y, c) {
    A.put(a,        b, .012, .26, .32, y, K.card, {hard:true, gloss:.12});
    A.put(a + .020, b, .028, .15, .15, y - .035, c, {gloss:.30, round:.03});
    A.put(a + .010, b, .004, .225, .05, y + .118, K.blue, {hard:true, mode:1, glow:.16});
    A.put(a - .030, b, .09, .010, .010, y + .175, K.steelD, {hard:true, gloss:.50});  // the peg
  }
  // A backlit sign plate: the panel, and the characters standing off it. Used seven times, which
  // is what stops the signage in here reading as seven different people's work.
  function sign(a, b, w, h, y, zh, size) {
    A.put(a, b, .022, w, h, y, K.blue, {hard:true, mode:1, glow:.16});
    A.glyph(a + .014, b, y, zh, {size, gap:size * .36, color:K.ink, glow:.26});
  }

  // ---------------------------------------------------------------- the small goods
  // Everything MALL_GOODS says this shop sells, at the size it actually is. These live along the
  // front edge of the demo benches, in the 17 cm strip between the devices and the bench's own
  // front lip — the one piece of horizontal surface in the room that was doing nothing, and the
  // place a real shop puts the impulse buy.
  //
  // A mouse. Three centimetres tall, so what makes it a mouse rather than a pebble is the split
  // down the middle of the shell for the two buttons and a scroll strip between them.
  function mouse(a, b, y, c) {
    A.put(a, b, .102, .062, .026, y + .013, c, {hard:true, gloss:.34});
    A.put(a - .016, b, .058, .002, .006, y + .027, K.panelD, {hard:true, gloss:.14});
    A.put(a - .022, b, .026, .011, .005, y + .029, K.panelD, {hard:true, gloss:.16});
  }
  // A keyboard: a shallow tray, a darker key field sunk into it and a lit strip along the front.
  // The key field is what does the work — a plain slab this size reads as a book.
  function keyboard(a, b, y, c) {
    A.put(a, b, .128, .336, .015, y + .008, c, {hard:true, gloss:.30});
    A.put(a, b, .104, .308, .006, y + .018, K.panelD, {hard:true, gloss:.14});
    A.put(a + .054, b, .008, .296, .004, y + .019, K.horiz, {hard:true, mode:1, glow:.13});
  }
  // 手机壳. Four cases stood on edge in a countertop rack, leaning back the way they do, each with
  // its printed card behind it. A flat tile lying down reads as a beer mat.
  function caseRack(a, b, y, cs) {
    A.put(a, b, .118, .300, .012, y + .006, K.trim, {hard:true, gloss:.34});
    A.put(a - .050, b, .010, .284, .036, y + .030, K.steelD, {hard:true, gloss:.46});
    cs.forEach((c, i) => {
      const bb = b - .105 + i * .070;
      A.put(a, bb, .013, .054, .108, y + .062, c, {hard:true, gloss:.30, rz:-.20});
      A.put(a + .009, bb, .004, .032, .046, y + .084, K.card, {hard:true, gloss:.10, rz:-.20});
    });
  }
  // 充电宝, stood on end so it is a shape and not a bar of soap, with its charge lamps on the face
  // that looks at the customer. Depth runs outward, so that face is the one at the larger `a`.
  function bank(a, b, y, c) {
    A.put(a, b, .050, .088, .146, y + .073, c, {hard:true, gloss:.34});
    A.put(a + .014, b, .024, .062, .006, y + .020, K.panelD, {hard:true, gloss:.18});
    for (let i = 0; i < 4; i++)
      A.put(a + .027, b - .027 + i * .018, .004, .008, .008, y + .124, K.horiz,
        {hard:true, mode:1, glow:.19});
  }
  // 数据线, coiled. A ring is two discs — the cable, and a smaller one of whatever it is lying on
  // set a few millimetres higher to punch the hole through the middle of it.
  function coil(a, b, y, c, hole) {
    A.cyl(a, b, y + .019, .060, .038, c, {gloss:.28});
    A.cyl(a, b, y + .027, .023, .044, hole, {gloss:.18});
  }
  // A boxed peripheral for the wall bay on the left partition. Same idea as `carton` above, but
  // that one wears its printed band on the face that looks down the room, and this bay is read
  // from the side, so the band is turned through ninety degrees onto the face that faces the aisle.
  function boxSide(a, b, y, d, h, c) {
    A.put(a, b, d, .165, h, y + h / 2, K.carton, {hard:true, gloss:.14});
    A.put(a, b + .086, d - .04, .010, h * .30, y + h * .62, c, {hard:true, gloss:.22});
  }

  // ================================================================ the back wall
  // Three bays, because a ten-metre wall of one idea is a corridor. The middle bay is dark so the
  // televisions on it have something to be bright against; the two outer bays are lighter joinery,
  // so the room does not close in.
  const TW = 2.36;                                  // half-width of the video wall
  const cols = [-1.74, -.58, .58, 1.74], rows = [1.22, 2.00, 2.78];

  // ---- middle bay: the video wall, floor to soffit.
  A.put(.51, 0, .10, TW * 2, 2.72, 2.14, K.panel, {hard:true, gloss:.22, ...PJ});
  // A media console under it, which is where the wall gets its base. Without one the panel floats
  // and you can see the shop floor running under two and a half metres of charcoal.
  A.put(.66, 0, .52, TW * 2 - .10, .72, .36, K.panelD, {hard:true, gloss:.24, ...PJ});
  A.put(.66, 0, .58, TW * 2, .05, .745, K.trim, {hard:true, gloss:.40});
  A.put(.575, 0, .02, TW * 2 - .16, .07, .81, K.cool, {hard:true, mode:1, glow:.22});
  // and what stands on it: a soundbar, a console, a router, a pair of speakers.
  A.put(.66, -1.52, .14, 1.06, .085, .830, K.trim, {hard:true, gloss:.30});
  A.put(.72, -1.52, .015, .96, .045, .832, K.steelD, {hard:true, gloss:.22});
  A.put(.66, 0, .22, .34, .10, .838, K.panel, {hard:true, gloss:.34});
  A.put(.78, 0, .012, .30, .014, .845, K.horiz, {hard:true, mode:1, glow:.26});
  A.put(.66, .78, .16, .20, .07, .823, K.panelD, {hard:true, gloss:.30});
  for (const s of [-1, 1]) A.put(.66, 1.62 + s * .22, .17, .17, .30, .938, K.panelD, {hard:true, gloss:.26});
  A.stop(.40, .95, -TW, TW);

  // Twelve sets, and a price rail under every row of them. The frame index runs across and down so
  // no two neighbours are showing the same instant of the loop.
  rows.forEach((ry, r) => {
    cols.forEach((cb, i) => tv(.60, cb, 1.06, .60, ry, i + r));
    A.put(.595, 0, .07, TW * 2 - .10, .035, ry - .425, K.trim, {hard:true, gloss:.34});
    for (const cb of cols) ticket(.638, cb, ry - .345, .24, .12);
  });
  // The house name, over the wall rather than buried behind it. The shell writes it in gold on the
  // timber feature panel; that panel is now behind two and a half metres of charcoal, so it is
  // rebuilt here as the backlit band a shop of this trade would actually have. The English that
  // used to sit under it is on the fascia outside, where it is read from — thirteen letters is
  // thirteen unbatchable draw calls, and a subtitle is not worth that twice.
  sign(.575, 0, TW * 2 - .14, .30, 3.30, '未来数码', .175);

  // ---- left bay: boxed stock behind glass.
  // The carcass is dark on purpose. Built in white it was a two-and-a-half-metre blank pillar at
  // the edge of every view into the shop, and the stock inside it had nothing to be pale against.
  const LB = -3.73, LW = 2.54;
  A.put(.46, LB, .06, LW, 2.90, 1.60, K.panelD, {hard:true, gloss:.20, ...PJ});
  for (const s of [-1, 1])
    A.put(.72, LB + s * (LW / 2), .54, .06, 2.90, 1.60, K.panel, {hard:true, gloss:.26, ...PJ});
  A.put(.72, LB, .56, LW + .12, .07, 3.09, K.panel, {hard:true, gloss:.26, ...PJ});
  A.put(.72, LB, .54, LW, .30, .15, K.trim, {hard:true, gloss:.30});
  const cCols = [-.92, -.46, 0, .46, .92], bandC = [K.blue, K.caseA, K.trim, K.blue, K.caseD];
  [.44, .95, 1.46, 1.99, 2.52].forEach((sy, i) => {
    A.put(.70, LB, .48, LW - .06, .035, sy, K.steel, {hard:true, gloss:.42});
    // Every shelf lit from under its own front edge — in front of the edge, not behind it, or all
    // you get is a dark soffit. This is the most recognisable thing about a locked case of phones
    // and it costs one prop a shelf.
    A.put(.955, LB, .018, LW - .12, .030, sy - .034, K.cool, {hard:true, mode:1, glow:.32});
    // The top shelf is the one people press their nose against, so it holds the goods themselves
    // rather than their boxes.
    if (i === 4)
      cCols.forEach((cb, k) =>
        shelfPhone(.70, LB + cb, sy + .018, [K.trim, K.steelD, K.panelD, K.caseA, K.trim][k]));
    else {
      const h = .24 + (i % 2) * .05;
      cCols.forEach((cb, k) => carton(.72, LB + cb, sy + .018, h, bandC[(i + k) % bandC.length]));
    }
  });
  // The glazing. A case reads as glazed because of its frame, not its glass — the sheet itself is
  // barely there, and at the .20 alpha it used to carry it fogged the stock behind it into a haze.
  A.put(1.01, LB, .04, .05, 2.66, 1.67, K.steelD, {hard:true, gloss:.55});          // centre mullion
  for (const yy of [.335, 3.005])
    A.put(1.01, LB, .05, LW - .02, .05, yy, K.steelD, {hard:true, gloss:.55});      // kerb and head
  A.put(1.00, LB, .02, LW - .02, 2.62, 1.67, K.glass, {hard:true, mode:1, alpha:.11, gloss:.92});
  sign(1.02, LB, LW - .04, .26, 3.24, '手机 平板', .145);
  A.stop(.43, 1.03, LB - LW / 2 - .05, LB + LW / 2 + .05);

  // ---- right bay: the accessory slatwall, over a bin unit.
  // This is the one surface in the shop that wants the corrugated map: ribs at 30 cm read as the
  // slotted board these packs actually hang on, and at any other scale it is agricultural cladding.
  const RB = 3.73, RW = 2.54;
  A.put(.44, RB, .04, RW + .10, 2.17, 1.92, K.trim, {hard:true, gloss:.30});
  A.put(.49, RB, .06, RW, 2.05, 1.92, K.steel, {hard:true, gloss:.18, ...SL});
  const pc = [K.caseA, K.caseB, K.caseC, K.caseD, K.trim];
  [2.50, 1.95, 1.40].forEach((y, r) => {
    for (let i = 0; i < 5; i++) pack(.565, RB - .96 + i * .48, y, pc[(i + r * 2) % pc.length]);
  });
  A.put(.70, RB, .54, RW, .78, .39, K.lacq, {hard:true, gloss:.24, ...PJ});
  A.put(.70, RB, .60, RW + .06, .05, .805, K.white, {hard:true, gloss:.42});
  // Open bins of coiled cable. A coil is a ring, so it is two discs: the cable's own colour, and a
  // smaller one of the bin's standing a few millimetres higher to punch the hole through it.
  for (let i = 0; i < 2; i++) {
    const bb = RB - .92 + i * .62;
    A.put(.72, bb, .40, .56, .17, .915, K.panel, {hard:true, gloss:.28});
    for (const o of [-.13, .13]) {
      A.cyl(.72, bb + o, .958, .102, .074, [K.caseA, K.caseD][i], {gloss:.30});
      A.cyl(.72, bb + o, .968, .038, .078, K.panelD, {gloss:.18});
    }
  }
  // and the headphone bar, under the half of the sign that says so. Three of them, in the room's
  // own greys: a pair in the accent blue read as toys, because at this size a saturated cup is
  // all you see of the object.
  for (let i = 0; i < 3; i++) cans(.70, RB + .29 + i * .40, .83, [K.trim, K.panelD, K.steelD][i]);
  sign(.56, RB, RW, .26, 3.14, '配件 耳机', .145);
  A.stop(.40, 1.02, RB - RW / 2 - .05, RB + RW / 2 + .05);

  // ================================================================ the demo benches
  // Long, low and white, with the walk-through between them lined up on the door. Two details do
  // most of the work: the light line under the top, which separates the top from the body and puts
  // a horizon across the middle of the room at bench height; and the upstand along the back edge,
  // which is where a bench like this keeps its spec cards and without which the top is a white
  // slab with six small objects marooned on it. The ends are lit rather than blade-signed — a
  // free-standing blade needs 40 cm of bench nobody has, and glowing the end panel says the same
  // thing for one prop and no glyphs.
  // BA moved out 9 cm from where it was. The gap between the back-wall fixtures and the benches
  // measured 55 cm, and a body is 56: everything on the accessory wall was visible, labelled, and
  // behind a wall you could see through. At 65 cm it is a route, and the shop is one loop.
  const BA = 2.14, BD = .82;
  // The two benches are no longer the same length. The right-hand one lost 70 cm to the service
  // counter that now runs down that side; the symmetry it used to have was worth less than a
  // counter with somewhere to stand at it.
  const BENCH = [{s:-1, bc:-2.62, len:2.56, n:6, step:.42},
                 {s: 1, bc: 2.30, len:1.86, n:5, step:.40}];
  function bench(bc, len, s) {
    A.put(BA, bc, BD - .14, len - .16, .16, .08, K.trim, {hard:true, gloss:.30});
    A.put(BA, bc, BD, len, .60, .46, K.lacq, {hard:true, gloss:.30, ...PJ});
    A.put(BA, bc, BD + .08, len + .06, .05, .785, K.white, {hard:true, gloss:.44});
    for (const t of [-1, 1])
      A.put(BA + t * (BD / 2 + .015), bc, .02, len - .16, .045, .735, K.cool,
        {hard:true, mode:1, glow:.18});
    A.put(BA - BD / 2 + .10, bc, .07, len - .12, .22, .915, K.white, {hard:true, gloss:.40});
    A.put(BA - BD / 2 + .155, bc, .014, len - .26, .055, .970, K.blue,
      {hard:true, mode:1, glow:.16});
    A.put(BA, bc + s * (len / 2 + .014), BD - .10, .024, .50, .49, K.blue,
      {hard:true, mode:1, glow:.14});
    A.stop(BA - BD / 2 - .06, BA + BD / 2 + .06, bc - len / 2, bc + len / 2);
  }
  const DEV = [K.trim, K.steelD, K.panelD, K.caseA, K.trim, K.steelD];
  const ACC = [K.caseA, K.caseB, K.caseC, K.caseD];
  for (const {s, bc, len, n, step} of BENCH) {
    bench(bc, len, s);
    // Laid out from the inner end outward on both benches, so the pair reads as one run rather
    // than two tables that happen to face each other. The left bench is computers and tablets,
    // the right one handsets: a shop of this trade sells three things, not one.
    const first = -(n - 1) / 2 * step;
    for (let i = 0; i < n; i++) {
      const b = bc + s * (first + i * step), c = DEV[(i + (s > 0 ? 3 : 0)) % DEV.length];
      if (s < 0) (i % 3 === 1) ? tablet(2.11, b, .81, c) : laptop(2.19, b, .81, c);
      else       (i === 2)     ? tablet(2.11, b, .81, c) : handset(2.19, b, .81, c);
    }
    // and the accessories, in the 17 cm of bench between the devices and the front lip. They sit
    // in the gaps between the devices rather than in line with them, so nothing shares a footprint
    // with anything, and they are what makes the two benches sell seven things instead of three.
    for (let i = 0; i < n - 1; i++) {
      const b = bc + s * (first + (i + .5) * step);
      if (s < 0) {
        if (i % 2 === 0) keyboard(2.462, b, .810, K.lacq);
        else { mouse(2.436, b - .075, .810, K.lacq); bank(2.470, b + .080, .810, ACC[i % 4]); }
      } else {
        if (i % 2 === 0) caseRack(2.462, b, .810, [ACC[i % 4], K.trim, ACC[(i + 2) % 4], K.steelD]);
        else { bank(2.470, b - .080, .810, ACC[(i + 1) % 4]); coil(2.436, b + .070, .810,
          [K.caseA, K.caseD][i % 2], K.white); }
      }
    }
    // Two shelf-edge tickets a bench, on the upstand, because the accessories are the things in
    // here somebody actually prices up before they buy.
    for (const t of [-.62, .62]) ticket(1.905, bc + t, .862, .22, .11);
  }

  // ================================================================ the vitrine in the gap
  // Something to walk towards, standing in the run of the door. It used to be a black plinth under
  // a black lid on four posts, which from the aisle read as a bus shelter: the lid overhung the
  // posts, the glass was invisible, and there was nothing to say the thing was a case at all. A
  // case is legible because of its metalwork — a kerb the goods stand on, four uprights and a lid
  // frame, all the same steel — so that is what it is built out of now, and the plinth is the same
  // white joinery as the benches so it belongs to them.
  const VA = 1.55;
  A.put(VA, 0, .52, 1.06, .16, .08, K.trim, {hard:true, gloss:.30});
  A.put(VA, 0, .60, 1.14, .62, .47, K.lacq, {hard:true, gloss:.30, ...PJ});
  A.put(VA, 0, .66, 1.20, .05, .805, K.white, {hard:true, gloss:.46});
  for (const s of [-1, 1])
    A.put(VA + s * .315, 0, .02, 1.06, .045, .755, K.cool, {hard:true, mode:1, glow:.18});
  A.put(VA, 0, .50, 1.04, .024, .843, K.steelD, {hard:true, gloss:.55});           // kerb
  for (const da of [-.226, .226]) for (const db of [-.496, .496])
    A.put(VA + da, db, .026, .026, .30, 1.005, K.steelD, {hard:true, gloss:.55});  // uprights
  A.put(VA, 0, .50, 1.04, .030, 1.170, K.steelD, {hard:true, gloss:.55});          // lid frame
  A.put(VA, 0, .55, 1.09, .034, 1.200, K.trim, {hard:true, gloss:.36});            // lid
  A.put(VA + .262, 0, .014, 1.00, .020, 1.152, K.cool, {hard:true, mode:1, glow:.26});
  A.put(VA, 0, .46, 1.00, .288, 1.005, K.glass, {hard:true, mode:1, alpha:.11, gloss:.92});
  // A lit card standing at the back of the case, so the goods have something to be seen against
  // and the inside of the box is not the charcoal wall four metres behind it.
  A.put(VA - .195, 0, .014, .92, .19, 1.055, K.blue, {hard:true, mode:1, glow:.15});
  A.put(VA - .187, 0, .006, .30, .045, 1.055, K.gold, {hard:true, mode:1, glow:.20});
  [K.trim, K.panelD, K.steelD, K.caseA].forEach((c, i) => shelfPhone(VA - .04, -.375 + i * .25, .853, c));
  A.glyph(1.865, 0, .60, '新品上市', {size:.090, gap:.034, color:K.gold, glow:.18});
  A.stop(1.21, 1.89, -.62, .62);

  // ================================================================ the service counter
  // Where a purchase is finished and a repair is booked in: one counter doing both is what these
  // shops actually run, and it is the reason the accessory wall is behind it rather than in front.
  //
  // Its position is the one thing in this file worth arguing about, so: the shell's window platform
  // eats a ∈ [3.655, 4.705] of the frontage, and the counter used to stand at a = 3.10 with its
  // front face 10 cm short of that. Nobody could stand at it — not the customer, who ended up on
  // the plinth or out in the concourse, and not the staff, who had 11 cm between the counter and
  // the demo bench. Down the side at a = 2.26 there is 82 cm behind it for the two people who work
  // here, 98 cm in front of it for the queue, and the slatwall becomes the stock wall it is
  // standing against, which is where it belongs.
  const CA = 2.26, CB = 4.20, CW = 1.80, CD = .84;
  const CF = CA + CD / 2, CK = CA - CD / 2;            // its front face, and its back
  // `till:false`. The shell's own till label is hung 2 m in front of whatever counter asks for one,
  // which lands out in the concourse from here; this one is placed by hand at the bottom of the
  // file, and the point-of-sale it needs is built below. Everything else the shell's counter
  // draws — body, plinth, stone top, plinth light — is exactly right.
  A.counter(CA, CB, CW, CD, C('#2b3138'), false);
  sign(CF + .015, CB - .48, .84, .24, .70, '收银台',  .150);
  sign(CF + .015, CB + .48, .84, .24, .70, '维修服务', .105);
  // The point of sale, on the staff side: a screen turned away from the customer, a keyboard under
  // it and the drawer front under that. A counter with a card reader and no till on it is a desk.
  A.put(CK + .16, CB - .05, .07, .34, .26, 1.120, K.trim,  {hard:true, gloss:.36});
  powered(A.put(CK+.115,CB-.05,.012,.30,.21,1.125,K.sky,{hard:true,mode:1,glow:.15}));
  A.put(CK + .20, CB - .05, .11, .30, .014, .994, K.panelD,{hard:true, gloss:.20});
  // and the drawers under it, on the back face. Six fronts and six handles is what tells you which
  // side of this thing the staff stand on, from anywhere in the room. Both rows clear the warm
  // plinth strip the shell runs along that face at y .575–.625; a drawer built through it reads as
  // a lamp with a cupboard door in the middle of it.
  for (let i = 0; i < 3; i++) for (const yy of [.78, .46]) {
    A.put(CK - .014, CB - .56 + i * .56, .012, .50, .16, yy, K.panelD, {hard:true, gloss:.28});
    A.put(CK - .030, CB - .56 + i * .56, .012, .22, .014, yy + .052, K.steelD, {hard:true, gloss:.50});
  }
  // What is on the customer's half of the top, which is the difference between a service counter
  // and a lump of joinery: a ticket dispenser at the near end, a card reader on a stalk, a stack of
  // leaflets, and two headphone stands so the thing this shop is best known for is within reach.
  A.put(CF - .18, CB - .78, .17, .19, .21, 1.085, K.trim, {hard:true, gloss:.34});
  powered(A.put(CF-.093,CB-.78,.012,.15,.09,1.135,K.sky,{hard:true,mode:1,glow:.16}));
  A.cyl(CF - .10, CB + .75, 1.035, .020, .11, K.steelD, {gloss:.50});
  A.put(CF - .10, CB + .75, .07, .10, .13, 1.145, K.trim, {hard:true, gloss:.36, rz:.22});
  powered(A.put(CF-.07,CB+.75,.012,.085,.085,1.155,K.sky,
    {hard:true,mode:1,glow:.14,rz:.22}));
  A.put(CF - .18, CB, .16, .22, .035, .997, K.card, {hard:true, gloss:.10});
  A.put(CF - .18, CB, .13, .19, .006, 1.018, K.blue, {hard:true, mode:1, glow:.10});
  cans(CA - .06, CB - .68, .980, K.trim);
  cans(CA - .06, CB - .36, .980, K.panelD);
  // The repair end: a work mat with parts trays on it, and a handset lying open on it in bits.
  A.put(CA - .02, CB + .48, .40, .46, .015, .990, K.trim, {hard:true, gloss:.12});
  for (let i = 0; i < 3; i++)
    A.put(CA - .02, CB + .32 + i * .16, .15, .15, .055, 1.026, [K.steelD, K.caseA, K.steelD][i],
      {hard:true, gloss:.34});
  A.put(CA + .11, CB + .48, .075, .130, .009, 1.002, K.steelD, {hard:true, gloss:.44});
  // The number board, hung on rods off the soffit over the counter. It is the first thing in the
  // shop you can read from the door, and now that the counter is down the side it is also the thing
  // that says which end of the room to walk to.
  for (const da of [-.52, .52]) A.cyl(CA + da, CB, 3.06, .010, .86, K.steelD, {gloss:.50});
  A.put(CA, CB, .06, 1.34, .48, 2.40, K.bezel, {hard:true, gloss:.36});
  powered(A.put(CA+.037,CB,.015,1.24,.40,2.40,C('#170e04'),{hard:true,mode:1,glow:.05}));
  powered(A.glyph(CA+.050,CB,2.51,'叫号',{size:.080,gap:.030,color:K.amber,glow:.22}));
  powered(A.glyph(CA+.050,CB,2.30,'A 0 3 7',
    {size:.130,gap:.036,color:C('#ffb648'),glow:.38}));
  // The one-metre line on the carpet, which every counter in China has painted in front of it.
  // 7 mm above the shell's own carpet plane: two quads at the same height flicker.
  A.put(CF + .62, CB - .40, .045, .80, .006, .032, K.blue, {hard:true, mode:1, glow:.12});

  // ================================================================ waiting, for the repair queue
  // Two seats at the dead end of the lobby, under the number board and facing back down it. A
  // repair counter with nobody sat waiting at it is a counter nobody uses. No collider: the figures
  // sitting on it are placed by their own coordinates and a solid here would shove them off.
  const WA = 3.39, WB = 4.67;
  A.put(WA, WB, .40, 1.18, .06, .120, K.trim, {hard:true, gloss:.30});
  for (const da of [-.17, .17]) for (const db of [-.52, .52])
    A.put(WA + da, WB + db, .05, .05, .26, .250, K.steelD, {hard:true, gloss:.50});
  A.put(WA, WB, .44, 1.22, .06, .410, K.lacq, {hard:true, gloss:.30, ...PJ});
  A.put(WA + .195, WB, .04, 1.22, .40, .640, K.lacq, {hard:true, gloss:.30, ...PJ});
  A.put(WA + .167, WB, .012, 1.16, .030, .800, K.blue, {hard:true, mode:1, glow:.12});

  // ================================================================ the side walls
  // A backlit poster on each partition, with a low plinth of boxed stock under the left one. What
  // was here was a pair of free-standing gondolas sitting in a 29 cm slot between the benches and
  // the walls — fixtures nobody could ever stand in front of. Flat against the wall they cost no
  // floor; the right wall keeps only the poster, because the aisle past the service desk is the
  // one route to the accessory wall and it is not wide enough to give any of it away.
  for (const s of [-1, 1]) {
    const bw = s * 5.14;
    A.put(1.10, bw, .96, .12, 1.50, 1.92, K.trim, {hard:true, gloss:.26});
    powered(A.put(1.10,bw-s*.055,.86,.05,1.36,1.92,K.blue,{hard:true,mode:1,glow:.17}));
    // What is printed on it. A blue field with two white rectangles on it is a blank poster; a
    // handset shown face-on with a lit screen, a headline over it and a price under it is an ad,
    // and it is the same five props either way.
    powered(A.put(1.02,bw-s*.075,.21,.03,.76,1.86,K.ink,{hard:true,mode:1,glow:.11}));
    powered(A.put(1.02,bw-s*.085,.16,.03,.66,1.86,K.sky,{hard:true,mode:1,glow:.13}));
    powered(A.put(1.02,bw-s*.095,.12,.03,.05,2.03,K.horiz,{hard:true,mode:1,glow:.22}));
    powered(A.put(1.32,bw-s*.075,.36,.03,.17,2.36,K.cool,{hard:true,mode:1,glow:.22}));
    powered(A.put(1.32,bw-s*.075,.21,.03,.11,1.42,K.gold,{hard:true,mode:1,glow:.18}));
    if (s > 0) continue;
    A.put(1.10, bw - s * .19, .96, .30, .50, .25, K.lacq, {hard:true, gloss:.26, ...PJ});
    A.put(1.10, bw - s * .19, 1.02, .34, .05, .525, K.white, {hard:true, gloss:.42});
    for (let i = 0; i < 3; i++)
      carton(.74 + i * .34, bw - s * .20, .55, .22, [K.blue, K.caseC, K.caseD][i]);
    A.stop(.58, 1.62, bw, bw - s * .42);
  }

  // ================================================================ the flagship podium
  // One phone, alone, on a lit column. Everything else in here is a run of identical things; a shop
  // needs one place where a single object is the whole display. Round, because it is the only round
  // thing in a room of boxes.
  //
  // It used to stand at b = −3.15, in the middle of the front band — which is the only continuous
  // route across the shop, and a 68 cm column in a 98 cm aisle is a wall with a gap either side too
  // narrow to walk through. In the corner it is the first thing seen through the left window from
  // the concourse, it is in nobody's way, and the lobby is one clear run end to end.
  const PB = -4.88;
  A.cyl(3.15, PB, .05, .27, .10, K.trim, {gloss:.30});
  A.cyl(3.15, PB, .49, .23, .78, K.lacq, {gloss:.28, ...PJ});
  A.cyl(3.15, PB, .62, .236, .10, K.blue, {mode:1, glow:.12});
  A.cyl(3.15, PB, .885, .26, .05, K.white, {gloss:.46});
  shelfPhone(3.09, PB, .905, K.caseA);
  A.stop(2.87, 3.43, PB - .28, PB + .28);

  // ================================================================ the peripherals bay
  // Boxed keyboards, mice and power banks on the left partition, above the plinth of stock that is
  // already there. Three lit shelves, and the printed face of every box turned along the frontage
  // rather than down the room, because this bay is read from the aisle beside it and a band of
  // colour on the wrong face of a carton is a carton with nothing on it.
  //
  // It stops at 1.30 m. The shell hangs its own lightbox on this partition from 1.40 to 2.70, and
  // anything taller grows straight through it.
  const UB = -5.01;
  A.put(2.20, UB - .08, 1.04, .16, 1.30, .650, K.panelD, {hard:true, gloss:.20, ...PJ});
  for (const da of [-.49, .49])
    A.put(2.20 + da, UB, .06, .32, 1.30, .650, K.panel, {hard:true, gloss:.26, ...PJ});
  A.put(2.20, UB, 1.08, .32, .06, 1.330, K.panel, {hard:true, gloss:.26, ...PJ});
  A.put(2.20, UB, 1.04, .32, .16, .080, K.trim, {hard:true, gloss:.30});
  [.34, .72, 1.10].forEach((sy, r) => {
    A.put(2.20, UB, .96, .30, .035, sy, K.steel, {hard:true, gloss:.42});
    A.put(2.20, UB + .152, .92, .018, .028, sy - .034, K.cool, {hard:true, mode:1, glow:.30});
    for (let i = 0; i < 4; i++)
      boxSide(1.85 + i * .230, UB, sy + .018, .21, .22 + (r % 2) * .04,
        [K.blue, K.caseA, K.caseC, K.caseD][(i + r) % 4]);
  });
  A.stop(1.66, 2.74, -5.17, -4.83);

  // ================================================================ light, and things that hang
  // A track over the benches, because the shell's own downlights are on a grid that knows nothing
  // about where the goods ended up, and the goods here are all low and horizontal.
  A.put(1.94, 0, .07, 6.60, .07, 3.32, K.trim, {hard:true, gloss:.36});
  for (let i = 0; i < 5; i++) {
    const b = -2.6 + i * 1.3;
    A.cyl(1.94, b, 3.19, .055, .20, K.trim, {gloss:.40});
    A.put(1.94, b, .11, .11, .03, 3.075, K.cool, {hard:true, mode:1, glow:.34});
  }
  // Category blades on drop rods to the soffit, hung over the benches rather than over the aisle.
  // Down the middle they sat two metres from the eye, came out half the width of the view, and ran
  // into the sign band on the back wall — one continuous blue banner across the top of the room.
  for (const {bc, s} of BENCH) {
    A.cyl(1.55, bc, 3.12, .012, .84, K.steelD, {gloss:.50});
    sign(1.55, bc, .82, .30, 2.55, s < 0 ? '电脑' : '手机', .185);
  }
  // Backlit totems in the two window bays, between the shell's own display plinths, so the shop
  // reads as this trade from out in the concourse as well as from inside the door.
  for (const s of [-1, 1]) {
    const b = s * 3.375;
    A.put(4.15, b, .22, .46, 1.30, .99, K.panelD, {hard:true, gloss:.28, ...PJ});
    powered(A.put(4.27,b,.02,.38,1.12,1.00,K.blue,{hard:true,mode:1,glow:.22}));
    powered(A.glyph(4.285,b,1.30,'新机',{size:.155,gap:.055,color:K.ink,glow:.28}));
    powered(A.glyph(4.285,b,.78,'上市',{size:.155,gap:.055,color:K.ink,glow:.28}));
  }
  // Five cool lamps: one over each bench, one washing off the video wall, one on the counter and
  // one over the left-hand end of the lobby, which the counter's lamp cannot reach. Eight lights
  // reach the shader and the nearest to the camera win, so from inside this shop these five and the
  // shell's own fascia lamp are the room.
  A.light(2.05, -2.62, 3.02, [0.86, 0.92, 1.00], .38, 3.6);
  A.light(2.05,  2.30, 3.02, [0.86, 0.92, 1.00], .38, 3.6);
  A.light(1.20, 0, 2.20, [0.62, 0.78, 1.00], .30, 3.2);
  A.light(2.30, CB, 2.90, [0.94, 0.95, 1.00], .32, 3.0);
  A.light(3.00, -4.40, 2.80, [0.92, 0.94, 1.00], .26, 2.8);

  // The television wall runs one shared demo reel with panels a beat apart.  Only picture content
  // moves: the warm mark drifts a few centimetres and the horizon/channel bug exchange emphasis;
  // the category signs and price cards stay steady and readable.
  const displayPower=A.powerDisplay
    ?A.powerDisplay(poweredScreens,{id:'screens-and-ads'}):{active:true};
  A.motion('demo-reel',(t,state)=>{
    if(!displayPower.active){state.power='off';return;}
    state.power='on';
    screenFx.forEach(s=>{
      const wave=.5+.5*Math.sin(t*1.18+s.phase), w=A.at(s.a,s.b+Math.sin(t*.34+s.phase)*.045);
      s.sun.m[12]=w[0]; s.sun.m[14]=w[1];
      s.sun.glow=.15+wave*.10;
      s.horizon.glow=.14+(1-wave)*.09;
      s.bug.glow=.10+(wave>.66?.09:0);
    });
    state.panels=screenFx.length;
    state.reelFrame=Math.floor(t*1.18)%3;
  },{far:27});

  // ================================================================ the services
  // Seven things you can actually do in here, and the fittings they are done at. Every one of them
  // is a small object on a surface that already exists — nothing below takes a square centimetre
  // of floor, because the file's own header spent an afternoon establishing that this unit has
  // exactly one clear lobby and no spare floor at all.
  //
  // Focus points: the five counter services all resolve to a 3.55, which is the spot the file
  // already measured for 收银台 — clear of the counter, clear of the waiting seats, and 10 cm short
  // of the shell's window platform. `reach` on them is deliberately short (0.85 m) so that standing
  // in front of one of them offers that one rather than the till, whose own reach is 1.8; the
  // cursor still overrides, which is how you pick between two that are close together.
  const MD = MallDigital;
  MD.restore();
  const svc = {};                                   // the props the tick animates

  // ---- 参数对比. A spec board standing on the phone bench's upstand, between the handsets it is
  // comparing. Bars rather than numbers alone: the row that is being read is lit, and the two bars
  // in it are drawn to length, so which phone wins a row is legible before a character is.
  const CMPA = 1.845, CMPB = 2.30;
  A.put(CMPA, CMPB, .05, .76, .42, 1.26, K.panelD, {hard:true, gloss:.24, ...PJ});
  A.put(CMPA + .033, CMPB, .012, .72, .38, 1.26, K.bezel, {hard:true, mode:1, glow:.02});
  A.put(CMPA + .041, CMPB, .006, .68, .050, 1.425, K.blue, {hard:true, mode:1, glow:.16});
  A.glyph(CMPA + .048, CMPB, 1.425, '参数对比',
    {size:.030, gap:.011, color:K.ink, glow:.24});
  for (const [s, name] of [[-1, MD.AA.hz], [1, MD.BB.hz]]) {
    A.put(CMPA + .041, CMPB + s * .17, .006, .28, .042, 1.362, K.trim, {hard:true, gloss:.30});
    A.glyph(CMPA + .048, CMPB + s * .17, 1.362, name,
      {size:.026, gap:.010, color:K.cool, glow:.14});
  }
  svc.cmpRows = MD.SPECS.map((r, i) => {
    const yy = 1.300 - i * .046;
    const row = A.put(CMPA + .039, CMPB, .004, .68, .040, yy, K.blue,
      {hard:true, mode:1, glow:.03});
    for (const s of [-1, 1]) {
      const wins = (r.win < 0) === (s < 0);
      A.put(CMPA + .045, CMPB + s * .17 - s * (wins ? 0 : .036), .004,
        .26 * (wins ? 1 : .72), .020, yy, wins ? K.horiz : K.steelD,
        {hard:true, mode:1, glow:wins ? .17 : .05});
    }
    return row;
  });
  A.dynamicVisual(svc.cmpRows);

  // ---- 摄像头. The demo handset on the vitrine lid, on a short stand, camera side out. It is on
  // the case in the middle of the walk-through on purpose: this is the one thing in the shop that
  // takes a picture of the room, so it stands where the room is.
  const CMA = 1.70;
  A.cyl(CMA, 0, 1.255, .036, .020, K.steelD, {gloss:.50});
  A.cyl(CMA, 0, 1.325, .010, .140, K.steelD, {gloss:.50});
  A.put(CMA, 0, .014, .082, .158, 1.470, K.trim, {hard:true, gloss:.44, rz:-.16});
  A.put(CMA + .011, 0, .005, .070, .142, 1.472, K.sky,
    {hard:true, mode:1, glow:.15, rz:-.16,
      mallDigitalPreview:'camera', mallDigitalPreviewRole:'viewfinder'});
  A.put(CMA + .014, 0, .004, .058, .010, 1.472, K.horiz,
    {hard:true, mode:1, glow:.24, rz:-.16,
      mallDigitalPreview:'camera', mallDigitalPreviewRole:'reticle-horizontal'});
  A.put(CMA + .015, 0, .004, .010, .100, 1.472, K.horiz,
    {hard:true, mode:1, glow:.24, rz:-.16, mallDigitalPreviewAdded:true,
      mallDigitalPreview:'camera', mallDigitalPreviewRole:'reticle-vertical'});
  // The camera island on the back of it, which is the face the customer is looking at from the
  // aisle — depth runs outward, so the back of a phone that faces the shop is at the smaller `a`.
  A.put(CMA - .014, 0, .010, .052, .052, 1.505, K.panelD, {hard:true, gloss:.36, rz:-.16});
  for (const o of [-.012, .012])
    A.cyl(CMA - .022, o, 1.505, .011, .008, K.bezel, {rx:Math.PI / 2, gloss:.60});
  svc.shutter = A.put(CMA - .020, .030, .006, .012, .012, 1.470, K.amber,
    {hard:true, mode:1, glow:.10});
  A.put(CMA + .010, -.30, .006, .22, .075, 1.330, K.blue, {hard:true, mode:1, glow:.14});
  A.glyph(CMA + .017, -.30, 1.330, '拍照体验', {size:.026, gap:.010, color:K.ink, glow:.20});
  A.dynamicVisual(svc.shutter);

  // The other side of the label is a three-frame contact strip. Its dark housing and lower
  // letterbox band remain as an empty film strip before the first shot; each successful capture
  // reveals one retained sky tile behind that band, so one shot reads as one thumbnail and three
  // as a full strip. Five physical pieces total, with only the three same-mesh tiles dynamic.
  svc.photoStrip = A.put(CMA + .010, .30, .006, .26, .105, 1.330, K.bezel,
    {hard:true, gloss:.30});
  svc.photoStrip.mallDigitalPhotoHistory = 'strip';
  svc.photoHistory = [];
  const photoCols = [K.sky, K.caseA, K.sun];
  for (let i = 0; i < 3; i++) {
    const tile = A.put(CMA + .017, .30 + (i - 1) * .078, .004, .066, .078, 1.337,
      photoCols[i], {hard:true, mode:1, glow:0, alpha:.001});
    tile.mallDigitalPhotoHistory = i;
    svc.photoHistory.push(tile);
  }
  svc.photoBand = A.put(CMA + .022, .30, .003, .244, .022, 1.310, K.panelD,
    {hard:true, gloss:.18});
  svc.photoBand.mallDigitalPhotoHistory = 'foreground';
  A.dynamicVisual(svc.photoHistory);

  // ---- 试听台. Three pads on the customer half of the counter, each one a genre wired to a pair.
  // The pads are lit rings rather than buttons: a ring is legible from standing height, and the
  // lit one is the pair the demo is currently playing through.
  svc.pads = [];
  for (let i = 0; i < 3; i++) {
    const bb = CB - .74 + i * .17;
    A.cyl(CF - .18, bb, .997, .062, .016, K.trim, {gloss:.34});
    svc.pads.push(A.cyl(CF - .18, bb, 1.007, .046, .006, K.horiz,
      {mode:1, glow:.08, mallDigitalPreview:'music', mallDigitalPreviewRole:'play-pad'}));
  }
  A.put(CF - .30, CB - .57, .010, .30, .11, 1.100, K.blue, {hard:true, mode:1, glow:.14});
  A.glyph(CF - .293, CB - .57, 1.100, '试听', {size:.045, gap:.016, color:K.ink, glow:.22});
  // Three unequal bars are a readable equalizer even when the label above them is suppressed.
  for (let i = 0; i < 3; i++)
    A.put(CF - .293, CB - .668 + i * .018, .004, .012, [.030, .060, .044][i], 1.100,
      K.horiz, {hard:true, mode:1, glow:.20, mallDigitalPreviewAdded:true,
        mallDigitalPreview:'music', mallDigitalPreviewRole:'equalizer'});
  A.dynamicVisual(svc.pads);

  // ---- 数据转移. Two cradles and a link bar between them, which is the whole of what this service
  // looks like on a counter: the old phone on the left, the new one on the right, and something
  // lit crawling from one to the other while you wait.
  const TRB = CB - .12;
  A.put(CF - .26, TRB, .16, .40, .022, 1.001, K.trim, {hard:true, gloss:.34});
  for (const s of [-1, 1]) {
    A.put(CF - .26, TRB + s * .135, .05, .075, .012, 1.018, K.steelD, {hard:true, gloss:.50});
    A.put(CF - .275, TRB + s * .135, .012, .062, .105, 1.070, K.panelD,
      {hard:true, gloss:.40, rz:-.30});
  }
  svc.link = [];
  for (let i = 0; i < 5; i++)
    svc.link.push(A.put(CF - .247, TRB - .08 + i * .04, .004, .026, .008, 1.014, K.horiz,
      {hard:true, mode:1, glow:.06}));
  A.put(CF - .30, TRB, .010, .28, .10, 1.098, K.blue, {hard:true, mode:1, glow:.14});
  A.glyph(CF - .293, TRB, 1.098, '数据转移', {size:.030, gap:.011, color:K.ink, glow:.20});
  A.dynamicVisual(svc.link);

  // ---- 保修 / 延保. A card stand, because that is what a warranty is in a shop: a printed card
  // somebody turns round to face you. Two panels, one over the other, so the free cover and the
  // plan you can buy are one object rather than two labels fighting for the same 30 cm.
  const WRB = CB + .24;
  A.put(CF - .24, WRB, .09, .26, .020, 1.000, K.trim, {hard:true, gloss:.34});
  A.put(CF - .26, WRB, .014, .25, .27, 1.140, K.white,
    {hard:true, gloss:.16, rz:-.22,
      mallDigitalPreview:'document', mallDigitalPreviewRole:'sheet'});
  A.put(CF - .247, WRB, .005, .225, .058, 1.243, K.blue,
    {hard:true, mode:1, glow:.16, rz:-.22,
      mallDigitalPreview:'document', mallDigitalPreviewRole:'header'});
  A.glyph(CF - .240, WRB, 1.243, '保修', {size:.040, gap:.014, color:K.ink, glow:.22});
  for (let i = 0; i < 2; i++)
    A.put(CF - .247, WRB, .004, .155 - i * .035, .010, 1.174 - i * .032, K.steelD,
      {hard:true, mode:1, glow:.05, rz:-.22, mallDigitalPreviewAdded:true,
        mallDigitalPreview:'document', mallDigitalPreviewRole:'copy-line'});
  svc.plan = A.put(CF - .252, WRB, .005, .215, .040, 1.078, K.steelD,
    {hard:true, mode:1, glow:.04, rz:-.22,
      mallDigitalPreview:'document', mallDigitalPreviewRole:'footer'});
  A.dynamicVisual(svc.plan);

  // ---- 维修. A booking pad on the counter beside the work mat that is already there, with the
  // repair number's own lamp on it. This is the end of the counter the sign over it already calls
  // 维修服务, so nothing here has to explain itself twice.
  const RPB = CB + .58;
  A.put(CF - .24, RPB, .19, .25, .016, .999, K.trim, {hard:true, gloss:.30});
  A.put(CF - .245, RPB, .012, .21, .150, 1.065, K.panelD, {hard:true, gloss:.36, rz:-.34});
  svc.book = A.put(CF - .232, RPB, .005, .185, .120, 1.070, K.sky,
    {hard:true, mode:1, glow:.10, rz:-.34});
  A.dynamicVisual(svc.book);

  // ---- 取件. Four numbered pigeonholes at the far end, with a lamp under each. A repair you are
  // told to come back for needs somewhere to have come back *to*, and a locker with a lit cell is
  // the one object that says "yours is in" from the other end of the room.
  const LKB = CB + .88;
  A.put(CA + .06, LKB, .30, .46, .040, 1.010, K.trim, {hard:true, gloss:.32});
  A.put(CA + .06, LKB, .28, .44, .34, 1.200, K.lacq, {hard:true, gloss:.26, ...PJ});
  svc.lockers = [];
  for (let i = 0; i < 4; i++) {
    const bb = LKB - .165 + (i % 2) * .22, yy = 1.115 + ((i / 2) | 0) * .17;
    A.put(CA + .20, bb, .012, .195, .145, yy, K.panelD, {hard:true, gloss:.30});
    svc.lockers.push(A.put(CA + .208, bb, .004, .160, .012, yy - .052, K.steelD,
      {hard:true, mode:1, glow:.04}));
  }
  A.put(CA + .06, LKB, .30, .46, .026, 1.383, K.white, {hard:true, gloss:.42});
  A.put(CA + .19, LKB, .008, .40, .052, 1.402, K.blue, {hard:true, mode:1, glow:.14});
  A.glyph(CA + .196, LKB, 1.402, '取件柜', {size:.034, gap:.012, color:K.ink, glow:.20});
  A.dynamicVisual(svc.lockers);

  // ---- 游戏机. The demo pod, standing on the media console in front of the video wall. Five cells
  // and a bracket round the middle one: the light runs along them and the game is to press while it
  // is inside the bracket. It has to be an object in the room rather than a panel in a menu,
  // because what you are being asked to do is *look at the shop*.
  const GB = .78;
  A.put(.78, GB, .05, .46, .26, .980, K.bezel, {hard:true, gloss:.36});
  A.put(.806, GB, .012, .42, .22, .980, C('#0a1017'),
    {hard:true, mode:1, glow:.03,
      mallDigitalPreview:'game', mallDigitalPreviewRole:'arena'});
  svc.cells = [];
  for (let i = 0; i < 5; i++)
    svc.cells.push(A.put(.815, GB - .16 + i * .08, .005, .055, .070, .992, K.horiz,
      {hard:true, mode:1, glow:.05,
        mallDigitalPreview:'game', mallDigitalPreviewRole:'cell'}));
  for (const s of [-1, 1])
    A.put(.817, GB + s * .045, .004, .008, .096, .992, K.amber,
      {hard:true, mode:1, glow:.15,
        mallDigitalPreview:'game', mallDigitalPreviewRole:'bracket'});
  svc.gscore = A.put(.815, GB, .004, .30, .020, .900, K.amber, {hard:true, mode:1, glow:.06});
  svc.gscore.mallDigitalPreview = 'game';
  svc.gscore.mallDigitalPreviewRole = 'score';
  A.put(.70, GB + .42, .11, .17, .034, .805, K.trim, {hard:true, gloss:.34});
  A.put(.70, GB + .42, .05, .05, .012, .824, K.panelD, {hard:true, gloss:.18});
  A.dynamicVisual(svc.cells, svc.gscore);

  // ================================================================ the verbs
  // Rows in `USE_AT.mall`, installed as getters — see the header. `USE_AT` is declared in
  // js/data.js, which loads long before anybody walks into this building, so it is certainly here
  // by the time a fit-out runs; the guard is for a harness that loads the tenant files alone.
  const P0 = {type:'stand'}, PP = {type:'press'}, PO = {type:'open'}, PT = {type:'talk'};
  function verb(hz, get) {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, {configurable:true, enumerable:true, get});
  }
  verb('参数对比', () => {
    const S = MD.live(), r = MD.SPECS[S.cmp % MD.SPECS.length];
    return {zh:'比参数', py:'bǐ cānshù', secs:2.0, mins:3, gain:{mood:3}, pose:P0,
      en:`compare the ${r.en} — ${MD.AA.en} ${r.a}, ${MD.BB.en} ${r.b}`,
      done:r.zh, doneTr:r.tr};
  });
  verb('摄像头', () => {
    const S = MD.live();
    return {zh:'拍一张', py:'pāi yì zhāng', secs:2.4, mins:5, gain:{mood:7},
      pose:{type:'phone', hold:'phone'},
      en:`take a photograph on the ${MD.AA.en} demo · ${S.shots} taken`,
      done:'拍好了，照片存在手机里。', doneTr:'Got it — the picture is saved on the phone.'};
  });
  verb('试听台', () => {
    const S = MD.live(), s = MD.SAMPLES[S.sample % MD.SAMPLES.length];
    return {zh:'试听', py:'shìtīng', secs:3.2, mins:6, gain:{mood:10, rest:2}, pose:P0,
      en:`hear ${s.en} on ${s.canEn}`, done:s.zh, doneTr:s.tr};
  });
  verb('游戏机', () => {
    const S = MD.live(), d = S.demo, done = d.round >= MD.ROUNDS;
    if (done)
      return {zh:'再来一局', py:'zài lái yì jú', secs:1.1, mins:1, gain:{mood:6}, pose:PP,
        en:`play again — last round ${d.hits}/${MD.ROUNDS}, best ${Math.max(0, d.best)}`,
        done:'再来一局。', doneTr:'Another go.'};
    return {zh:'试玩', py:'shìwán', secs:1.1, mins:1, gain:{mood:5}, pose:PP,
      en:`console demo — press inside the bracket · shot ${d.round + 1} of ${MD.ROUNDS}, ` +
         `${d.hits} on target`,
      done:'手感不错。', doneTr:'It feels good in the hand.'};
  });
  verb('保修', () => {
    const S = MD.live();
    if (S.plan)
      return {zh:'看延保', py:'kàn yánbǎo', secs:1.8, mins:2, gain:{}, pose:PT,
        en:'your extended plan runs for two years',
        done:'延保两年，单子在手机里。', doneTr:'Two years of cover; the paperwork is on your phone.'};
    if (S.warranty)
      return {zh:'买延保', py:'mǎi yánbǎo', secs:2.6, mins:6, pay:-MD.PLAN_PRICE, gain:{mood:4},
        pose:PT, en:`buy the two-year extended plan — ¥${MD.PLAN_PRICE}`,
        done:`延保买好了，两年，${MD.PLAN_PRICE}块。`,
        doneTr:`Extended plan bought — two years, ${MD.PLAN_PRICE} kuai.`};
    return {zh:'问保修', py:'wèn bǎoxiū', secs:2.2, mins:4, gain:{}, pose:PT,
      en:'ask what the warranty covers',
      done:'整机保修一年，电池半年。', doneTr:'Twelve months on the phone, six on the battery.'};
  });
  verb('维修', () => {
    const S = MD.live();
    if (S.repair)
      return {zh:'问进度', py:'wèn jìndù', secs:1.8, mins:2, gain:{}, pose:PT,
        en:`repair ${S.repair.no} is already booked in`,
        block:`${S.repair.no}还在修，明天下午三点以后来取。`,
        blockTr:`${S.repair.no} is still being worked on — collect after three tomorrow afternoon.`};
    return {zh:'送修', py:'sòng xiū', secs:2.8, mins:8, pay:-MD.REPAIR_PRICE, gain:{},
      pose:PO, en:`book a screen repair — ¥${MD.REPAIR_PRICE}, ready tomorrow afternoon`,
      done:'屏幕换一块，给您开个单子。', doneTr:'A new screen. Here is your ticket.'};
  });
  verb('取件', () => {
    const S = MD.live();
    if (!S.repair)
      return {zh:'看柜子', py:'kàn guìzi', secs:1.4, mins:1, gain:{}, pose:P0,
        en:'nothing of yours is in the lockers',
        block:'柜子里没有我的东西。', blockTr:'Nothing in the lockers is mine.'};
    if (!MD.due(S.repair))
      return {zh:'问取件', py:'wèn qǔjiàn', secs:1.6, mins:2, gain:{}, pose:PT,
        en:`${S.repair.no} is not ready until 15:00 tomorrow`,
        block:`${S.repair.no}还没好，明天下午三点以后来取。`,
        blockTr:`${S.repair.no} is not ready yet — after three tomorrow afternoon.`};
    return {zh:'取机', py:'qǔ jī', secs:2.4, mins:5, gain:{mood:12}, pose:{type:'reach'},
      en:`collect ${S.repair.no} — ${S.repair.what}`,
      done:'修好了，屏幕跟新的一样。', doneTr:'Repaired — the screen is as good as new.'};
  });
  verb('数据转移', () => {
    const S = MD.live();
    return {zh:'转数据', py:'zhuǎn shùjù', secs:3.0, mins:9, pay:-MD.TRANSFER_PRICE, gain:{mood:5},
      pose:PO, en:`move photos and contacts to the new phone — ¥${MD.TRANSFER_PRICE}` +
        (S.shots ? ` · ${S.shots} of your own photos` : ''),
      done:'照片和通讯录都转过去了。', doneTr:'Photographs and contacts have all been moved across.'};
  });

  // ================================================================ the tick
  // One motion for the whole service side: the demo pod's runner, the spec board's lit row, the
  // locker lamps, the listening pads and the transfer bar — plus the completion watcher described
  // in the header. Culled at 20 m like everything else a tenant declares, so none of it costs
  // anything from another deck or the far end of the concourse.
  const VERBS = {
    '拍一张': 'photo', '比参数': 'compare', '试听': 'listen',
    '试玩': 'play', '再来一局': 'play',
    '买延保': 'plan', '问保修': 'warranty', '看延保': 'planned',
    '送修': 'book', '取机': 'collect', '转数据': 'transfer',
  };
  // How long each of those takes, so a cancellation can be told from a completion. Kept here
  // rather than read back off the def, because by the time the panel closes the def is gone.
  const SECS = {photo:2.4, compare:2.0, listen:3.2, play:1.1, plan:2.6, warranty:2.2,
                planned:1.8, book:2.8, collect:2.4, transfer:3.0};
  let watchKey = '', watchAt = 0, padLit = -1, padUntil = 0, linkUntil = 0, clockAt = 0;
  let dz = null, doingEl = null;
  A.motion('service', (t, state, P, minutes) => {
    if (Number.isFinite(minutes)) MD.setClock(MD.clockDay(), minutes);
    // The calendar, twice a second at most: `__game.state()` copies the pantry and the bank ledger,
    // which is nothing at 0.5 Hz and would be silly at 60.
    if (t - clockAt > 2) {
      clockAt = t;
      const g = window.__game;
      if (g && typeof g.state === 'function') { try { MD.reconcile(g.state().day); } catch (_) {} }
    }
    const S = MD.live();

    // ---- the demo pod
    MD.demo.t = t;
    const cell = MD.demoCellAt(t);
    for (let i = 0; i < 5; i++) svc.cells[i].glow = i === cell ? .38 : .045;
    svc.gscore.glow = .05 + (S.demo.round >= MD.ROUNDS ? .16 : S.demo.hits * .035);

    // ---- the spec board
    const cur = S.cmp % svc.cmpRows.length, pulse = .5 + .5 * Math.sin(t * 2.1);
    for (let i = 0; i < svc.cmpRows.length; i++)
      svc.cmpRows[i].glow = i === cur ? .16 + pulse * .09 : .03;

    // ---- the lockers. Amber while the repair is in the back, steady white when it is in the box.
    const ready = S.repair && MD.due(S.repair);
    for (let i = 0; i < svc.lockers.length; i++)
      svc.lockers[i].glow = !S.repair ? .04
        : ready ? (i === 1 ? .30 : .05)
        : (i === 1 ? .06 + .10 * (.5 + .5 * Math.sin(t * 1.7)) : .04);
    svc.plan.glow = S.plan ? .18 : .04;
    svc.book.glow = S.repair ? .05 : .09 + .04 * (.5 + .5 * Math.sin(t * .9));
    svc.shutter.glow = .07 + .07 * (.5 + .5 * Math.sin(t * 1.35));
    const history = Math.min(svc.photoHistory.length, Math.max(0, S.shots | 0));
    for (let i = 0; i < svc.photoHistory.length; i++) {
      const on = i < history;
      svc.photoHistory[i].alpha = on ? 1 : .001;
      svc.photoHistory[i].glow = on ? .10 + i * .025 : 0;
    }

    // ---- the listening pads, and the transfer bar crawling while a transfer runs
    for (let i = 0; i < 3; i++)
      svc.pads[i].glow = i === (S.sample % 3) ? (t < padUntil && i === padLit ? .34 : .20) : .06;
    for (let i = 0; i < svc.link.length; i++)
      svc.link[i].glow = t < linkUntil
        ? (Math.floor((linkUntil - t) * 6) % svc.link.length === i ? .30 : .05) : .05;

    // ---- the completion watcher. Two DOM reads a frame, cached elements, only while the player is
    // inside this shop. `.on` with one of this shop's verbs in it is a press; `.on` going away
    // again after 85% of the action's own length is a completion, and anything shorter is Escape.
    if (!doingEl) { doingEl = document.getElementById('doing'); dz = doingEl && doingEl.querySelector('.dz'); }
    const on = !!doingEl && doingEl.classList.contains('on');
    const key = on && dz ? (VERBS[dz.textContent] || '') : '';
    if (key && key !== watchKey) { watchKey = key; watchAt = t; began(key); }
    else if (!key && watchKey) {
      if (t - watchAt >= (SECS[watchKey] || 2) * .85) ended(watchKey);
      watchKey = ''; watchAt = 0;
    }
    state.shots = S.shots; state.photoHistory = history;
    state.round = S.demo.round; state.hits = S.demo.hits;
    state.repair = S.repair ? S.repair.no : '';
  }, {far:20});

  // What happens the instant the key goes down. Only the console demo cares: a reaction game has
  // to be judged on the press, and 1.1 seconds later is not a reaction.
  function began(key) {
    if (key !== 'play') return;
    if (MD.demoDone()) MD.demoReset();
    const hit = MD.demoShoot(), S = MD.live();
    card(hit ? '打中了！' : '差一点。',
      hit ? `On target — ${S.demo.hits} of ${S.demo.round}.`
          : `Just off — ${S.demo.hits} of ${S.demo.round}.`);
    if (MD.demoDone())
      setTimeout(() => card(`${MD.ROUNDS}枪中了${S.demo.hits}枪。`,
        `${S.demo.hits} of ${MD.ROUNDS} on target. Best so far: ${Math.max(0, S.demo.best)}.`), 1400);
  }
  // And what happens when the action finishes. Everything that changes the shop's mind about you
  // is here, because everything here is something you had to stand still for.
  function ended(key) {
    const S = MD.live();
    if (key === 'compare') { S.cmp = (S.cmp + 1) % MD.SPECS.length; MD.persist(); return; }
    if (key === 'listen') {
      const s = MD.SAMPLES[S.sample % MD.SAMPLES.length];
      padLit = S.sample % 3; padUntil = MD.demo.t + 3.4;
      if (!MD.playSample(S.sample)) card('声音没开。', 'This browser will not let the demo play sound.');
      else card(`${s.hz} · ${s.can}`, `${s.en} on ${s.canEn} · ${s.py} · ${s.canPy}`);
      S.sample = (S.sample + 1) % MD.SAMPLES.length; MD.persist();
      return;
    }
    if (key === 'photo') {
      const shot = MD.capture();
      if (shot) MD.review(shot, `照片 ${MD.state().shots} · zhàopiàn · your photograph`);
      else card('拍不了。', 'The camera could not read the frame.');
      return;
    }
    if (key === 'warranty') { MD.registerWarranty(); card('保修一年。', 'Twelve months of cover, from today.'); return; }
    if (key === 'plan') {
      MD.buyPlan();
      card('延保两年。', `Extended plan — two years. ¥${MD.PLAN_PRICE}.`);
      return;
    }
    if (key === 'book') {
      const r = MD.bookRepair('换屏幕');
      card(`维修单 ${r.no}`, `Repair ticket ${r.no} · ${r.what} · collect after 15:00 tomorrow`);
      return;
    }
    if (key === 'collect') {
      const r = MD.collectRepair();
      if (r) card(`${r.no} 取好了。`, `${r.no} collected — and a year of cover starts today.`);
      return;
    }
    if (key === 'transfer') {
      const q = MD.transfer();
      card('数据转移好了。', q.photos
        ? `Transferred — including the ${q.photos} photograph${q.photos === 1 ? '' : 's'} you took here.`
        : 'Transferred — photographs, contacts and messages.');
    }
  }
  // The shop's own way of saying something the game's one fixed `done` line cannot: a ticket
  // number, a score, which pair you are listening through. It shares the photo review's element.
  const card = (zh, en) => MD.card(zh, en);

  // ================================================================ what there is to say
  // Every one of these is placed so that the spot the player is walked to — 1.15 m outward of the
  // label — is somewhere a body actually fits, and that is the only thing that decided where the
  // labels went. The three that mattered: 电子产品 is the shop's own browse action and stands you
  // in the doorway; 收银台 is the till, and the shell's version of it stood you out in the
  // concourse on the far side of the glass, so it is written here instead, aimed at the floor in
  // front of the counter; 耳机 used to stand you inside the right-hand demo bench.
  A.th('电子产品', 5.15, 0, '这台手机有新的摄像头。', 'This phone has a new camera.',
    '电子 electronic + 产品 product.', 2.2, 2.5);
  // The till. Its marker floats just over the counter top at the 收银台 end; its focus is 1.15 m
  // out, on the lobby floor at a = 3.55, which is clear of the counter, clear of the waiting seats
  // and 10 cm short of the shell's window platform.
  A.th('收银台', CF - .28, CB - .15, '这个多少钱？', 'How much is this one?',
    '收银 to take payment + 台 counter.', 1.8, 1.12);
  A.th('耳机', CF - .38, CB - .65, '戴上耳机听一首歌。', 'Put on the headphones and hear a song.',
    '耳 ear + 机 machine.', 1.8, 1.20);
  A.th('手机', 2.19, 1.50, '可以试试手机的相机。', 'You can test the phone camera.',
    '手机 literally means hand machine.', 1.7, 1.05);
  A.th('电脑', 2.19, -1.57, '这台电脑很轻，带去上班也方便。',
    'This computer is light — easy to take to work.', '电 electric + 脑 brain.', 1.7, 1.05);
  A.th('平板', 2.11, -1.99, '平板比电脑轻，看电影也够大。',
    'A tablet is lighter than a laptop and still big enough for a film.',
    '平 flat + 板 board.', 1.7, 1.05);
  A.th('电视', .95, -.85, '这面墙的电视都在放同一段片子。',
    'Every television on this wall is playing the same clip.',
    '电 electric + 视 vision.', 1.8, 1.60);
  // Moved off the axis of the door and onto the demo pod it now belongs to, at b .78. Its focus at
  // a 2.10 is still in the walk-through between the two benches, which begins at b −1.34 and ends
  // at b 1.37 — so the spot is clear, and the pod's five cells are 1.4 m away and directly in view.
  A.th('游戏机', .95, GB, '这台游戏机可以免费试玩，按一下试试。',
    'The console demo is free — press once and try it.',
    '游戏 game + 机 machine. 试玩 shìwán is to try a game out.', 1.6, 1.05);

  // ---- and the seven services. Every focus point below is a 3.55 except the two on the benches,
  // and a 3.55 is the spot this file already measured for the till: clear of the counter, clear of
  // the waiting seats and 10 cm short of the shell's window platform. The short reach is what
  // stops five counter labels shouting over one another and over 收银台.
  A.th('参数对比', CMPA, CMPB, '两台手机，您比一比参数。',
    'Two phones — compare their specifications.',
    '参数 cānshù is a specification; 对比 duìbǐ is to set two things side by side.', 1.3, 1.26);
  A.th('摄像头', 1.89, 0, '这个摄像头拍一张试试。', 'Try taking a picture with this camera.',
    '摄 to take in + 像 image + 头 head — the camera unit on a phone.', 1.4, 1.42);
  A.th('试听台', CF - .30, CB - .57, '耳机可以试听，三副声音都不一样。',
    'You can listen to the headphones — all three pairs sound different.',
    '试 to try + 听 to listen.', .85, 1.14);
  A.th('数据转移', CF - .30, TRB, '旧手机的照片能转到新手机上。',
    'The photographs on the old phone can be moved to the new one.',
    '数据 data + 转移 to move across.', .85, 1.12);
  A.th('保修', CF - .26, WRB, '这台整机保修一年，可以再买延保。',
    'Twelve months of cover, and you can buy an extended plan on top.',
    '保 to guarantee + 修 to repair. 延保 yánbǎo extends it.', .85, 1.20);
  A.th('维修', CF - .24, RPB, '手机坏了可以送修，先开个单子。',
    'A broken phone can be booked in for repair — they write you a ticket.',
    '维 to maintain + 修 to repair. 送修 sòng xiū is to hand something in for repair.', .85, 1.12);
  A.th('取件', CA + .19, LKB, '单子上的号码对上了就能取件。',
    'When the number on your ticket comes up, you collect it here.',
    '取 to collect + 件 item. A 取件柜 is a pickup locker.', .85, 1.36);
};

// ===============================================================================================
// The two shopfront windows. The shell calls this before the room fit-out, with a deliberately
// small API and once for each side of the doorway. Keep it static: the live demo screens inside
// already own this tenant's animation budget, while a strong silhouette and restrained emissive
// bands read from across the atrium without adding another motion callback.
//
// Budget: 20 primitives in the mobile-work bay and 22 in the play-and-listen bay, 42 for the
// tenant. That replaces the shell's twelve generic
// phone props with two composed displays and stays below the 60-prop storefront allowance.
MallFit['电子产品:glass'] = { alpha: .18, gloss: .96 };
MallFit['电子产品:win'] = (W, bc, side) => {
  const ink = C('#151c23'), edge = C('#293541'), blue = C('#4ea9d2');
  const cyan = C('#a6e8f3'), white = C('#edf3f1'), dim = C('#30546b');
  const deck = C('#dbe2e2'), metal = C('#667581');

  // One continuous graphite-edged deck makes the small devices legible against the landlord's
  // timber platform. It is deliberately material-free: at this scale texture would only create a
  // new batch and the silhouette is doing the work.
  W.put(4.18, bc, .96, 3.12, .050, .365, ink, { hard:true, gloss:.34 });

  if (side < 0) {
    // Mobile-work bay: a large campaign screen, one hero phone and one open notebook. Their three
    // different heights make a composition rather than another row of demo stock.
    W.put(3.78, bc, .09, 2.70, .98, 1.54, edge, { hard:true, gloss:.32 });
    W.put(3.832, bc, .018, 2.54, .82, 1.54, dim, { hard:true, mode:1, glow:.075 });
    W.put(3.846, bc - .46, .010, 1.34, .18, 1.68, cyan, { hard:true, mode:1, glow:.12 });
    W.put(3.846, bc + .58, .010, .36, .42, 1.42, blue, { hard:true, mode:1, glow:.08 });
    W.put(3.846, bc - .34, .010, 1.54, .070, 1.32, white, { hard:true, mode:1, glow:.055 });

    const pb = bc + .86;
    W.put(4.18, pb, .34, .42, .52, .625, edge, { hard:true, gloss:.32 });
    W.put(4.18, pb, .37, .45, .025, .897, blue, { hard:true, gloss:.48 });
    W.put(4.24, pb, .10, .16, .055, .965, metal, { hard:true, gloss:.52 });
    W.put(4.22, pb, .060, .105, .22, 1.090, ink, { hard:true, gloss:.42, rz:-.10 });
    W.put(4.256, pb, .012, .087, .185, 1.090, cyan,
      { hard:true, mode:1, glow:.13, rz:-.10 });
    W.ball(4.266, pb - .030, 1.155, .010, .010, .010, white, { mode:1, glow:.07 });
    W.ball(4.266, pb + .030, 1.155, .010, .010, .010, blue, { mode:1, glow:.07 });

    const lb = bc - .72;
    W.put(4.14, lb, .42, .62, .25, .500, deck, { hard:true, gloss:.30 });
    W.put(4.14, lb, .45, .65, .022, .636, metal, { hard:true, gloss:.46 });
    W.put(4.24, lb, .34, .56, .045, .680, edge, { hard:true, gloss:.34, rz:-.08 });
    W.put(4.05, lb, .045, .57, .40, .865, ink, { hard:true, gloss:.34, rz:-.08 });
    W.put(4.077, lb, .012, .51, .34, .865, blue, { hard:true, mode:1, glow:.10, rz:-.08 });
    W.put(4.086, lb - .10, .008, .25, .055, .925, cyan,
      { hard:true, mode:1, glow:.07, rz:-.08 });
    W.put(4.086, lb + .12, .008, .14, .055, .805, white,
      { hard:true, mode:1, glow:.05, rz:-.08 });
  } else {
    // Play-and-listen bay: a widescreen backdrop, a compact console tower and an over-ear headset.
    // It reads differently from the phone bay even in silhouette, without a real-world logo.
    W.put(3.78, bc, .09, 2.70, 1.00, 1.55, edge, { hard:true, gloss:.32 });
    W.put(3.832, bc, .018, 2.54, .84, 1.55, C('#183347'),
      { hard:true, mode:1, glow:.075 });
    W.put(3.846, bc - .42, .010, 1.52, .20, 1.70, blue,
      { hard:true, mode:1, glow:.10 });
    W.put(3.846, bc + .63, .010, .36, .46, 1.47, cyan,
      { hard:true, mode:1, glow:.105 });
    W.put(3.846, bc - .48, .010, 1.34, .060, 1.30, white,
      { hard:true, mode:1, glow:.05 });

    const cb = bc - .70;
    W.put(4.18, cb, .38, .50, .25, .500, deck, { hard:true, gloss:.30 });
    W.put(4.18, cb, .41, .53, .022, .636, blue, { hard:true, gloss:.46 });
    W.put(4.12, cb, .18, .30, .62, .958, ink, { hard:true, gloss:.38, round:.035 });
    W.put(4.215, cb, .012, .030, .47, .975, cyan, { hard:true, mode:1, glow:.12 });
    W.put(4.218, cb + .090, .010, .090, .018, .795, metal, { hard:true, gloss:.50 });
    W.put(4.29, cb, .15, .38, .045, .685, edge, { hard:true, gloss:.38, round:.04 });
    W.ball(4.35, cb - .10, .710, .038, .020, .030, white, { gloss:.32 });
    W.ball(4.35, cb + .10, .710, .038, .020, .030, white, { gloss:.32 });

    const hb = bc + .74;
    W.put(4.18, hb, .30, .38, .22, .485, deck, { hard:true, gloss:.30 });
    W.put(4.18, hb, .33, .41, .022, .606, metal, { hard:true, gloss:.46 });
    W.put(4.12, hb, .055, .055, .55, .895, edge, { hard:true, gloss:.42 });
    W.put(4.12, hb, .060, .42, .050, 1.145, edge, { hard:true, gloss:.42, round:.025 });
    W.put(4.12, hb - .19, .060, .050, .30, 1.010, edge, { hard:true, gloss:.42 });
    W.put(4.12, hb + .19, .060, .050, .30, 1.010, edge, { hard:true, gloss:.42 });
    W.put(4.20, hb - .19, .10, .11, .14, .875, blue, { hard:true, gloss:.34, round:.035 });
    W.put(4.20, hb + .19, .10, .11, .14, .875, blue, { hard:true, gloss:.34, round:.035 });
  }
};

// ===============================================================================================
// The people. Staff and shoppers are pushed onto MallCast — see the comment at the top of
// js/mall.js — and game.js folds them into the roster before the world is built, so a tenant's own
// cast lives in the tenant's own file rather than in one argument list eighteen authors share.
//
// Everything here is in the MALL's world coordinates, not this shop's (a, b): x = 23 − a and
// z = −11 + b, because the unit is `shop('E', -11.0, 10.5)` on the east wall. Every one of these
// spots was checked against the colliders above rather than eyeballed — a figure inside a fixture
// is worse than no figure, and the two behind the counter have exactly 82 cm of floor, so they
// stand at a = 1.43 and nowhere else.
//
//   staff        a 1.43, b 4.05 / 4.85   behind the counter, 30 cm clear of the slatwall and of
//                                        the counter's own back face
//   demo         a 2.98, b 2.10          in front of the phone bench, which stops at a 2.61
//   demo         a 2.96, b −2.85         same, at the computer bench
//   waiting      a 3.39, b 4.46 / 4.88   on the seats, whose top is at y .44
//   walking      the lobby, a 3.10–3.20, which is clear from b −4.60 to b 3.30
MallCast.push(
  // 收银员 and 店员 in one: she takes the money and she sells the phone, which is how a shop this
  // size is actually staffed. Her lines are the three things somebody hears at this counter.
  { hz:'店员', name:'王雪', py:'Wáng Xuě', place:'mall', mallFloor:1,
    rig:'mall-wang-xue', temper:'brisk',
    look:{ skin:'#e6b78e', hair:'#241d1b', hairStyle:'ponytail', top:'#eae3d6', pants:'#333b46',
      shoe:'#262c33', vest:'#1f4e78', collar:'shirt', tall:.97, faceSeed:5521 },
    spots:[{ h0:9, h1:22, at:[21.57, -6.95], face:-Math.PI / 2, act:'vend' }],
    lines:[['这款有八个颜色，您想看哪个？', 'This model comes in eight colours — which would you like to see?'],
           ['充电宝和数据线在柜台这边。', 'Power banks and cables are here at the counter.'],
           ['买手机送一个手机壳。', 'Buy the phone and the case comes free.']] },
  // The repair side of the same counter. `work` is the bent-over-a-bench pose, which is the whole
  // of what says 维修 from the other end of the room.
  { hz:'维修师傅', name:'陈师傅', py:'Chén shīfu', storyName:'陈师傅 · 数码店',
    place:'mall', mallFloor:1,
    rig:'mall-digital-repair-chen-shifu', temper:'steady',
    look:{ skin:'#d5a077', hair:'#2b2522', hairStyle:'buzz', top:'#586a76', pants:'#2f363d',
      shoe:'#23282d', tall:1.04, wide:1.03, faceSeed:5522 },
    spots:[{ h0:9, h1:22, at:[21.57, -6.15], face:-Math.PI / 2,
      act:'work', held:'tool' }],
    lines:[['屏幕换一块，明天下午来拿。', 'A new screen — come back tomorrow afternoon for it.'],
           ['先取个号，前面还有两位。', 'Take a ticket; there are two people ahead of you.'],
           ['电池老了，充不满是正常的。', 'The battery is old — not charging fully is normal.']] },
  // On the floor rather than behind anything, facing the door, which is where the person who says
  // 欢迎光临 stands in every one of these shops.
  { hz:'导购员', name:'李思远', py:'Lǐ Sīyuǎn', place:'mall', mallFloor:1,
    rig:'mall-digital-guide-li-siyuan', temper:'genial',
    look:{ skin:'#dfae83', hair:'#221c1a', hairStyle:'short', top:'#f0eade', pants:'#3a4350',
      shoe:'#2a3035', vest:'#1f4e78', collar:'shirt', tall:1.02, faceSeed:5523 },
    spots:[{ h0:10, h1:22, at:[19.95, -11.85], face:-Math.PI / 2, act:'vend' }],
    lines:[['欢迎光临，随便看看。', 'Welcome — please have a look round.'],
           ['新机在门口那个台子上。', 'The new model is on the stand by the door.'],
           ['电脑在左边，手机在右边。', 'Computers on the left, phones on the right.']] },
  // Two people with their heads down over a demo unit. `buy` is the pose for working a machine
  // with one hand while looking at its screen, which is exactly what somebody does to a phone
  // tethered to a bench.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
    look:{ skin:'#c99a70', hair:'#2f2723', hairStyle:'short', top:'#7a8b7c', pants:'#3b424b',
      shoe:'#272c31', bag:'shoulder', bagColor:'#54463a', tall:1.05, faceSeed:5531 },
    spots:[{ h0:10, h1:22, at:[20.02, -8.90], face:Math.PI / 2, act:'buy' }],
    lines:[['这个拍照怎么样？', 'What is the camera like on this one?']] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored',
    look:{ skin:'#eec097', hair:'#2a2320', hairStyle:'bob', top:'#a4586a', pants:'#414954',
      shoe:'#e9e2d5', tall:.96, faceSeed:5532 },
    spots:[{ h0:10, h1:22, at:[20.04, -13.85], face:Math.PI / 2, act:'buy' }] },
  // The repair queue, on the two seats at the end of the lobby. `seatY` is the top of that bench.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'frail', seatY:.44,
    look:{ skin:'#cfa079', hair:'#8f8880', hairStyle:'short', top:'#6d7b86', pants:'#3d444c',
      shoe:'#2b3034', jacket:'#4a5a63', tall:.96, faceSeed:5533 },
    spots:[{ h0:10, h1:22, at:[19.61, -6.63], face:Math.PI / 2, act:'sit' }],
    lines:[['我的手机进水了。', 'My phone got wet.']] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored', seatY:.44,
    look:{ skin:'#e3b58b', hair:'#262019', hairStyle:'tousled', top:'#5c7f8c', pants:'#39404a',
      shoe:'#eae3d6', pack:true, packColor:'#8a5f3e', tall:1.01, faceSeed:5534 },
    spots:[{ h0:10, h1:22, at:[19.61, -6.03], face:Math.PI / 2, act:'phone' }] },
  // The demo side of the floor, which is a real job in a shop this size and is now a real job in
  // this one: the pod, the camera and the spec board all stand within two metres of her. She is in
  // the back cross-aisle (a 1.03 to 1.67, so a 1.35 is its middle) at b 1.10, which is clear of the
  // media console's collider by 40 cm, of the vitrine by 48 cm along b and of the right-hand bench
  // by 32 cm along a. Facing −π/2 is facing out of the unit, the way every other member of staff
  // here is turned.
  { hz:'体验师', name:'郑一帆', py:'Zhèng Yīfān', place:'mall', mallFloor:1,
    rig:'mall-digital-demo-zheng-yifan', temper:'eager',
    look:{ skin:'#d2a074', hair:'#231d1a', hairStyle:'tousled', top:'#eee7d9', pants:'#38414d',
      shoe:'#282e34', vest:'#1f4e78', collar:'polo', tall:1.00, faceSeed:5524 },
    spots:[{ h0:10, h1:22, at:[21.65, -9.90], face:-Math.PI / 2, act:'vend' }],
    lines:[['这台游戏机可以试玩，五次机会。', 'The console demo is free — five goes at it.'],
           ['两台手机的参数都在那块牌子上。', 'Both phones’ specifications are on that board.'],
           ['想试拍照片就用台子上那台。', 'Use the one on the case if you want to try the camera.']] },
  // and somebody walking the length of the lobby, so the room is not four people who have been
  // standing in the same place all day. The route is the front band, a 3.10–3.20, which is clear
  // from the podium at b −4.60 to the counter's near end at b 3.30.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
    look:{ skin:'#d9a878', hair:'#241f1c', hairStyle:'bun', top:'#c8a06c', pants:'#3e4854',
      shoe:'#2c3135', bag:'tote', bagColor:'#8c6a4a', tall:.99, faceSeed:5535 },
    patrol:[[19.90, -9.10], [19.90, -10.80], [19.80, -12.90], [19.85, -14.30],
            [19.80, -12.90], [19.90, -10.80], [19.90, -9.10]], speed:.92,
    lines:[['我先看看，谢谢。', 'Just looking, thanks.']] },
);

// ===============================================================================================
// REQUESTS — what this shop needs from files it does not own. Both are worked around above and
// both are smaller in the file that owns them than the workaround is here.
//
// 1. js/game.js — the completion hook the header calls "the two lines". `stopUse`
//    (js/game.js:11777) is the only place in the engine that knows an action has finished, and a
//    tenant file cannot add a branch to it, so this shop watches the `#doing` panel instead and
//    infers completion from how long `.on` stayed up against a table of durations it has to keep
//    itself. It is measured and it is correct, and it is still a shop reading the HUD.
//
//      js/mall.js, beside `const MallFitTick = []` at line 48:
//        const MallFitDone = [];
//      js/game.js, in stopUse just after `doing = null; act = null;` (line 11797):
//        if (place === 'mall' && typeof MallFitDone !== 'undefined')
//          for (const fn of MallFitDone) { try { fn(th.hz, def.zh, !!finished); } catch (_) {} }
//
//    With that, `began`/`ended` become one registered function and VERBS, SECS, the 85% rule and
//    the two DOM reads a frame all go away — here and in js/mall-optical.js, which carries a
//    verbatim copy of the same shim for the same reason.
//
// 2. The lead owns the save. This shop keeps its own record under `bjlife.mall.digital.v1`: the
//    open repair ticket and when it can be collected, the warranty and the extended plan, the
//    console demo's best round and how many photographs you have taken. It is in localStorage
//    because a repair booked today and collectable tomorrow afternoon is not a feature if a reload
//    cancels it. The photographs themselves are *not* saved — a JPEG of a 1280-wide canvas is well
//    over 100 kB and the save shares a 5 MB bucket — so a reload keeps the count and loses the
//    roll. If the save should own this, the shape it wants is exactly `MallDigital.state()`.
