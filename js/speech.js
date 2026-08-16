// 说话 — the neighbours, out loud.
//
// Every person in this game already has a description: how tall they are, how they wear their
// hair, whether they stoop, whether their hair has gone grey, and a word for what they are —
// 师傅, 大妈, 小孩, 收银员. That description was written to draw them with. It turns out to be
// most of a voice as well, so nobody here is given one by hand.
//
// What comes out of it:
//
//   the word for what they are  ->  an archetype, one of the voices in voice.js
//   the body they were drawn as ->  tract length, and how old the voice sounds
//   their seed                  ->  the last few per cent, so no two are the same person
//
// The seed is the one already used for their blink rate and their gaze, so a neighbour's voice is
// as fixed as their face: the same person sounds the same on every visit, and different from the
// person standing next to them.
//
// The sound itself is not made here. Every line anybody has been written to say is read once at
// build time by Kokoro, a local neural text-to-speech model, and kept as a small AAC file — 119 of
// them, 1.6 MB for the lot. This module decides who sounds like whom, fetches the right file, and
// puts it in the room at the right distance and on the right side of your head.
//
// There is no fallback. A procedural synthesiser used to stand behind this and cover any line that
// had not been baked, and it has been taken out on purpose: it did not sound like a person, and one
// robotic sentence in the middle of a conversation is worse than a silent one. So a line with no
// clip makes no sound and is reported instead — see `missed` in status(), which .speechcheck.js
// turns into a failure. Adding a line to an NPC now means running the bake:
//
//   node .dumplines.js && .venv-tts/bin/python .bake-voices.py
//
// js/voice.js, the procedural synthesiser, is still in the project and still drives voice.html —
// the voice studio. It is simply no longer in the game's audio path.
const Speech = (() => {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  let ctx = null, mix = null, hall = null, wetG = null, meter = null, roomNow = '';
  let scratch = null;
  // The player's volume, 0 to 1, applied at `master`. Held here as well as on the node so that a
  // setting restored from localStorage before anybody has spoken is not lost — `setup` runs on the
  // first line of dialogue, which is long after the settings panel has been read.
  let master = null, vol = 1;
  let on = true, token = 0, lastErr = '', lastSaid = '', lastWho = '', lastMode = 'none';
  let loadError = '';                   // why nobody can speak, if nobody can
  const built = new WeakMap();          // a voice is worked out once per person, then kept

  // ---------------------------------------------------------------- who sounds like what
  // The role word decides the voice wherever the role is the stronger signal — a 小孩 is a child
  // whatever else is true of them, and a 售票员 sounds like a ticket window. Where it is not, and
  // 同事 is the clear case because one of them is a woman and the other a man, the role is left
  // out of this table on purpose and the body is allowed to answer instead.
  const ROLE = {
    '小孩': '小孩', '学生': '学生', '同学': '学生',
    '大爷': '大爷', '棋友': '大爷',
    '大妈': '大妈', '阿姨': '大妈',
    '老师': '老师',
    '服务员': '服务员', '收银员': '服务员',
    '售票员': '售票员', '安检员': '售票员',
    '地勤': '地勤', '登机员': '地勤', '空乘': '空乘',
    '师傅': '大叔', '老板': '大叔', '厨师': '大叔', '摊主': '大叔', '扫地的': '大叔',
    '经理': '先生',
    '快递员': '小伙', '外卖员': '小伙',
  };
  // 棋友一, 大妈二, 乘客七 — the crowd is numbered so that each one can have its own word, and the
  // number is not part of who they are.
  const roleOf = hz => String(hz || '').replace(/[一二三四五六七八九十\d]+$/, '') || String(hz || '');

  // Grey hair, from the colour it is actually drawn in: bright and with almost no colour left in
  // it. `look` has been through makeLook by the time anyone asks, so this reads the linear RGB the
  // head is painted with rather than the hex it was written as.
  function greying(look) {
    const c = look && look.HAIR;
    if (!c) return 0;
    const hi = Math.max(c[0], c[1], c[2]), lo = Math.min(c[0], c[1], c[2]);
    const sat = hi > .001 ? (hi - lo) / hi : 0;
    return hi > .28 && sat < .22 ? Math.min(1, (hi - .28) * 2.2) : 0;
  }
  // Every style the rig draws that this game puts on a woman. It has to list all of them: when
  // the wardrobe gained ponytail, braid, perm and bob, the people who were moved onto them fell
  // out of this test and were quietly re-cast as men — an office colleague and a Shanghai
  // grandmother among them. A hairstyle added to figure.js and not added here is a voice change
  // nobody asked for, and .speechcheck.js is what catches it.
  const WOMANS_HAIR = ['bun', 'long', 'ponytail', 'braid', 'perm', 'bob'];
  // A beard settles it whatever the hair is doing, and it has to be checked here rather than left
  // to the hairstyle: the rig will put a moustache on a bob if it is asked to, and a woman's voice
  // coming out of that face is a worse mistake than either.
  const womanish = look => !!look && !look.beard && WOMANS_HAIR.includes(look.hairStyle);

  // No role in the table, so read the body. This is the path every unnamed face in the crowd
  // takes, and it is the reason a new neighbour added to the game arrives with a voice already.
  function archetypeOf(n) {
    const named = ROLE[roleOf(n.hz)];
    if (named) return named;
    const look = n.look || {};
    if ((look.tall || 1) < .86) return '小孩';
    const old = greying(look) > .3 || (look.stoop || 0) > .10;
    if (old) return womanish(look) ? '大妈' : '大爷';
    return womanish(look) ? '老师' : '大叔';
  }

  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

  // The archetype is the whole of the answer now, and it is answered once per person and kept. It
  // used to carry fifteen synthesiser dials with it — pitch, tract length, roughness, a per-person
  // jitter off the seed — and every one of them is gone: the sound of these people is a set of
  // files rendered by Kokoro at build time, and what the archetype decides is which of its voices
  // read their lines. .bake-voices.py is where that mapping lives.
  function voiceOf(n) {
    if (built.has(n)) return built.get(n);
    const made = { archetype: archetypeOf(n) };
    built.set(n, made);
    return made;
  }

  // ---------------------------------------------------------------- the room they are standing in
  // A voice with no room around it sounds like a voice in a file. These are small — a hutong is
  // four metres across and a shop is not much more — so what matters is the first reflection and
  // not the tail, which is the opposite of the station concourse next door in train-audio.js.
  function impulse(c, kind) {
    const sr = c.sampleRate;
    const seconds = kind === 'outdoor' ? .34 : .52;
    const rt = kind === 'outdoor' ? .18 : .40;
    const n = Math.round(sr * seconds);
    const buf = c.createBuffer(2, n, sr);
    const decay = Math.log(1e-3) / rt;
    let seed = 0x51ed270b;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2147483648 - 1;
    };
    // Where the walls are. Outdoors in an alley there is one wall opposite and the sky above, so
    // there is a single clear return and then nothing; indoors there are six surfaces close by.
    const taps = kind === 'outdoor'
      ? [[.0075, .52], [.024, .40], [.049, .17]]
      : [[.0055, .46], [.011, .38], [.017, .30], [.026, .26], [.037, .19], [.052, .14]];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (const [at, amp] of taps) {
        // Offset one ear from the other, or the room collapses into the middle of the head.
        const k = Math.round(sr * (at * (ch ? 1.07 : 1) + ch * .0004));
        for (let i = 0; i < 3 && k + i < n; i++) d[k + i] += amp * (i ? .4 / i : 1);
      }
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.exp(decay * t) * (kind === 'outdoor' ? .22 : .34);
        // The tail loses its top as it goes, because that is what air and soft furnishings do.
        lp += (rnd() * env - lp) * (.28 + .40 * Math.exp(-t * 6));
        d[i] += lp;
      }
      // Unit energy, so the wet gain below is the only thing deciding how much room there is.
      //
      // This divided by the root of the energy *per second* rather than the root of the energy,
      // which is a factor of the square root of the sample rate — about 220 times. With
      // `normalize = false` the convolver does the multiplication it is given, so every voice in the
      // game arrived under a reverb two hundred times louder than itself, the bus ran at three and a
      // half times full scale, and the limiter at the end flattened the lot into a wash with no
      // words in it. Nothing downstream can catch that, which is why there is a meter on the bus now.
      let e = 0;
      for (let i = 0; i < n; i++) e += d[i] * d[i];
      const k = 1 / Math.sqrt(Math.max(1e-9, e));
      for (let i = 0; i < n; i++) d[i] *= k;
    }
    return buf;
  }

  // The bus, built into whatever context it is handed. One copy of this lives on the real clock for
  // the game to talk through, and render() below builds another off the clock so a check can measure
  // exactly what the game plays instead of measuring a guess at it.
  function buildBus(c, dest, placeKey) {
    const bus = c.createGain();
    bus.gain.value = .70;
    // A limiter's worth of soft knee at the end, because two people can answer at once.
    const soft = c.createWaveShaper();
    soft.curve = softCurve();
    soft.oversample = '2x';
    bus.connect(soft);
    soft.connect(dest);
    const room = c.createConvolver();
    room.normalize = false;
    const kind = OUTDOOR[placeKey] ? 'outdoor' : 'indoor';
    room.buffer = impulse(c, kind);
    room.__kind = kind;
    const wet = c.createGain();
    wet.gain.value = WET[placeKey] === undefined ? 1.15 : WET[placeKey];
    room.connect(wet);
    wet.connect(bus);
    return { bus, room, wet };
  }

  function setup() {
    if (ctx || !AudioCtor) return ctx;
    ctx = new AudioCtor();
    // The player's own volume, and it sits AFTER the soft clipper inside `buildBus` rather than on
    // `bus` in front of it. Turning the game up by raising a level that then goes through a
    // limiter does not make it louder, it makes it flatter — the clipper simply takes back
    // whatever was added. Scaling the finished mix is the only place a volume control can honestly
    // live. The offline render at :445 deliberately does not get one: it is a measurement, and a
    // measurement that moves with a settings slider is not one.
    master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
    const built = buildBus(ctx, master, roomNow || 'street');
    mix = built.bus; hall = built.room; wetG = built.wet;
    // A meter on the bus everything passes through. "No sound is coming out" and "no sound is being
    // made" are different faults with different fixes, and without something here there is no way
    // to tell them apart from outside the graph — which is how a reverb two hundred times too loud
    // went unnoticed while it flattened every voice in the game against the limiter.
    meter = ctx.createAnalyser();
    meter.fftSize = 1024;
    mix.connect(meter);
    roomNow = roomNow || 'street';
    loadSheet();               // well before anybody opens their mouth
    return ctx;
  }
  let SOFT = null;
  function softCurve() {
    if (SOFT) return SOFT;
    const n = 2049, knee = .70;
    SOFT = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
      SOFT[i] = x < 0 ? -y : y;
    }
    return SOFT;
  }

  // Which rooms are rooms. The hutong, the platform and the park are outdoors — the platform is
  // a hard room but it has the station's own reverberation on the announcements already, and a
  // conversation on it is being had a foot away from you.
  const OUTDOOR = { street: 1, park: 1, zoo: 1, campus: 1, metro: 1 };
  // How much room each place gets. These are not decibels of anything — the impulse responses are
  // normalised to unit energy, so a number here is a scaling on an already-normalised convolution
  // and its useful range depends on how long the response is. What was measured to set them is the
  // level of the room in the tenth of a second after the words stop, against the words: about a
  // hundredth outdoors, where an alley gives you one slap off the opposite wall and then the sky,
  // and about a tenth in a hard indoor space like the ticket hall.
  //
  // They were an eighth of this until the impulse normalisation was fixed. Tuned against a reverb
  // that was two hundred times too loud, they had to be tiny; against a correct one they left every
  // room in the game sounding like an anechoic chamber.
  const WET = { street: 1.10, park: .85, zoo: .90, campus: 1.00, metro: 1.80,
                home: 1.05, shop: 1.35,
                diner: 1.35, office: 1.25, rail: 1.85, airport: 1.85, classroom: 1.45,
                // Glass, tile, rockwork and water give the greenhouse a long, humid indoor tail.
                zoo_tropical: 1.55,
                // The deadest room in the game, and by a long way. Every surface in an aircraft
                // cabin is upholstered, the nearest one is two metres off, and there is a wall of
                // engine noise over the top: a voice in here has essentially no tail at all.
                train: 1.15, cabin: .55 };
  function setRoom(placeKey) {
    roomNow = placeKey || 'street';
    if (!ctx) return;
    const kind = OUTDOOR[roomNow] ? 'outdoor' : 'indoor';
    if (hall.__kind !== kind) {
      hall.buffer = impulse(ctx, kind);
      hall.__kind = kind;
    }
    wetG.gain.value = WET[roomNow] === undefined ? 1.15 : WET[roomNow];
  }

  function unlock() {
    if (!setup()) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  }
  function pause(p) {
    if (!ctx) return;
    if (p && ctx.state === 'running') void ctx.suspend().catch(() => {});
    if (!p && ctx.state !== 'running') void ctx.resume().catch(() => {});
  }
  // Whether this context is actually able to make a sound right now. Every play path in this file
  // tests `state === 'suspended'` and calls `resume()` without waiting for it, which is right on a
  // desktop and is half the "sound doesn't work sometimes" on a phone: iOS reports an interrupted
  // context — one that lost the output to a phone call, a lock screen or another app — as
  // `interrupted`, not `suspended`, so the test misses it entirely and the line is scheduled into
  // a context that is not running. Nobody hears it and nothing reports an error.
  const awake = () => !!ctx && ctx.state === 'running';
  // The player's own level, 0 to 1. Applied immediately if there is a graph, remembered if not.
  // Not to be confused with `level()` below, which is the meter — this is the knob, that is the
  // needle.
  function setVolume(v) {
    const n = Number(v);
    vol = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
    if (master) master.gain.value = vol;
  }
  const volume = () => vol;
  function setEnabled(v) {
    on = !!v;
    if (!on) stop();
  }
  function stop() { token++; }
  const enabled = () => on;

  // ---------------------------------------------------------------- the baked lines
  // Every line anybody has been written to say is read by Kokoro at build time and kept as a small
  // AAC file — 119 of them, 1.6 MB for the lot. The lines are authored, so the set is finite, which
  // is the whole reason this is possible: nobody adds a line without editing the source anyway.
  //
  // The synthesiser below has not been replaced by it. It is what says anything that has not been
  // baked — a line written after the last bake, a station added to the line, a name composed at
  // run time — so the game is never silent for want of an asset, which is exactly what the twelve
  // pre-rendered station WAVs used to get wrong.
  const CLIPS = 'audio/voice/';
  let sheet = null;                     // key -> { f, d }, once the manifest has arrived
  let sheetDone = false;                // settled, either with a manifest or with the news of none
  let sheetPromise = null;
  const buffers = new Map();            // key -> AudioBuffer
  const coming = new Map();             // key -> Promise, so nothing is fetched twice
  const missed = new Set();             // anything asked for that nobody has baked
  const keyOf = (n, text) => `${n.hz}|${n.name || ''}|${text}`;

  // Started from setup(), which is to say from the click on ENTER, and not from the first line
  // anybody says. Loading it lazily meant the manifest was still in flight when the first line was
  // asked for, so the first thing every person said came out of the synthesiser and everything
  // after it came off a clip — which is a worse fault than either one on its own, because the
  // voice changed halfway through a conversation.
  function loadSheet() {
    if (sheetPromise) return sheetPromise;
    sheetPromise = fetch(CLIPS + 'manifest.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .catch(err => {
        // Every voice in the game is a file, so failing to load the list of them means nobody in the
        // game can speak. That used to be survivable because a synthesiser stood behind it; now it
        // is total silence, and total silence must never be something that happens quietly.
        //
        // Opened straight off the disk this always fails: browsers refuse fetch() on a file:// page,
        // so the manifest cannot be read however correct it is. The game has to be served.
        const how = location.protocol === 'file:'
          ? 'the page was opened from a file rather than served \u2014 browsers block fetch() on '
            + 'file:// URLs, so no voice can ever load. Serve the folder and open '
            + 'http://127.0.0.1:8000 instead'
          : `audio/voice/manifest.json would not load (${err && (err.message || err)}) \u2014 `
            + 'run node .dumplines.js && .venv-tts/bin/python .bake-voices.py';
        loadError = how;
        console.error('Speech: nobody will be able to speak \u2014 ' + how);
        return null;
      })
      .then(j => { sheet = j || null; sheetDone = true; return sheet; });
    return sheetPromise;
  }

  function clip(key, entry) {
    if (buffers.has(key)) return Promise.resolve(buffers.get(key));
    if (coming.has(key)) return coming.get(key);
    const p = fetch(CLIPS + entry.f)
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))
      .then(b => new Promise((res, rej) => {
        // The callback form, because Safari's decodeAudioData does not return a promise.
        const ok = buf => { buffers.set(key, buf); res(buf); };
        const bad = e => rej(e || new Error('decode failed'));
        const maybe = ctx.decodeAudioData(b, ok, bad);
        if (maybe && maybe.then) maybe.then(ok, bad);
      }))
      .finally(() => coming.delete(key));
    coming.set(key, p);
    return p;
  }

  // Talk to somebody once and the rest of what they have to say is fetched quietly behind it, so
  // the second and third things they say start the instant they are asked for.
  function warm(n) {
    if (!sheet || !n.lines) return;
    // Their barks and their side of any conversation. The conversation lines matter more, not
    // less: a bark that arrives late is a subtitle a moment early, where a question that arrives
    // late is a question you were not given the chance to hear before answering it.
    const texts = n.lines.map(l => l[0]);
    if (typeof Talk !== 'undefined' && Talk.linesOf) texts.push(...Talk.linesOf(n));
    for (const text of texts) {
      const k = keyOf(n, text);
      const e = sheet[k];
      if (e && !buffers.has(k) && !coming.has(k)) clip(k, e).catch(() => {});
    }
  }

  // ---------------------------------------------------------------- saying something
  // Where a voice sits: how loud for the distance, and which side of you it is on. Both the baked
  // clips and the synthesiser hang off this, so they are in the same room at the same level.
  function place(where, c, bus, room) {
    c = c || ctx; bus = bus || mix; room = room || hall;
    const d = where && where.dist !== undefined ? Math.max(0, where.dist) : 1;
    const head = c.createGain();
    head.gain.value = clamp(1.7 / (1.7 + d * d * .25), .18, 1);
    let tapped = head;
    if (c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.value = clamp((where && where.pan) || 0, -1, 1) * .68;
      head.connect(pan);
      tapped = pan;
    }
    tapped.connect(bus);
    tapped.connect(room);
    return head;
  }
  // A line that has been overtaken by a newer one. The nodes are already scheduled, so the one gain
  // everything passes through is faded instead of the nodes being chased.
  function hush(head) {
    try { head.gain.cancelScheduledValues(ctx.currentTime); } catch (_) {}
    try { head.gain.setTargetAtTime(0, ctx.currentTime, .04); } catch (_) {}
  }

  // Returns how long it will take to say, in seconds, so whoever asked can keep the mouth moving
  // and the hands going for exactly that long. Returns 0 if nothing was said.
  //
  // Baked or synthesised, the duration comes back straight away — the manifest records how long
  // each clip is, so a gesture can be timed before the audio has finished arriving.
  function npc(n, text, where) {
    if (!on || !n || !text) return 0;
    if (!setup()) return 0;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const mine = ++token;
    // Should not happen now that the manifest is fetched on the ENTER click, but if a line is asked
    // for while it is still on its way, wait for it rather than guess. Better a gesture that does
    // not get extended for one line than a person who changes voice mid-conversation.
    if (!sheetDone) {
      loadSheet().then(() => { if (mine === token) speak(n, text, where, mine); });
      return 0;
    }
    return speak(n, text, where, mine);
  }

  function speak(n, text, where, mine) {
    const key = keyOf(n, text);
    const entry = sheet && sheet[key];
    if (!entry) {
      // Nothing to play, and nothing to play it with. There used to be a procedural synthesiser
      // standing behind this to cover the gap; it is gone, because it did not sound like a person
      // and hearing it once was worse than hearing nothing. A line with no clip is a line somebody
      // wrote after the last bake, which is a build step that has not been run — so it is recorded
      // here and .speechcheck.js fails on it rather than the game quietly sounding wrong.
      missed.add(key);
      lastSaid = text;
      lastWho = `${n.name || n.hz} · ${voiceOf(n).archetype}`;
      lastMode = 'unbaked';
      lastErr = `no clip for "${text}" — re-run node .dumplines.js && .bake-voices.py`;
      return 0;
    }
    const head = place(where);
    lastSaid = text;
    lastWho = `${n.name || n.hz} · ${voiceOf(n).archetype}`;
    lastMode = 'baked';
    lastErr = '';
    clip(key, entry).then(buf => {
      if (mine !== token) return;              // somebody else started talking
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      src.start(ctx.currentTime + .01);
      warm(n);
    }).catch(err => {
      lastErr = `clip ${entry.f}: ${err && (err.message || err)}`;
      hush(head);
    });
    return entry.d;
  }

  // What the loudspeaker on the platform should say, if it has been baked. train-audio.js owns the
  // horn and the concourse; this only hands over the sound of the name.
  // One line, off the clock, through a fresh copy of the same bus and the same room. This is how a
  // level gets measured: polling the live meter over a debugging connection samples a twenty
  // millisecond window every few hundred milliseconds, and in headless Chrome, where a frame only
  // happens when something forces one, it barely samples at all.
  async function render(n, text, where, sampleRate) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off || !setup()) return null;
    await loadSheet();
    const key = keyOf(n, text);
    const entry = sheet && sheet[key];
    if (!entry) return null;
    const buf = await clip(key, entry);
    const sr = sampleRate || ctx.sampleRate;
    // A second and a half past the end, which is longer than either room's tail, so what is measured
    // after the words is the room and not the edge of the buffer.
    const total = buf.duration + 1.5;
    const c = new Off(2, Math.ceil(total * sr), sr);
    const built = buildBus(c, c.destination, roomNow);
    const head = place(where || { dist: 1.2, pan: 0 }, c, built.bus, built.room);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(head);
    src.start(.05);
    return { buffer: await c.startRendering(), dur: buf.duration, from: .05, room: roomNow };
  }

  function keyedClip(key) {
    if (!on || !key || !ctx) return null;
    const entry = sheet && sheet[key];
    if (!entry) return null;
    return { dur: entry.d, buffer: buffers.get(key) || null,
             load: () => clip(key, entry) };
  }
  function stationClip(hz) { return hz ? keyedClip(`station|${hz}`) : null; }
  // The rest of what the loudspeaker says: the countdown to the next train. Same announcer, same
  // bake, its own key space so a notice can never collide with a station called the same thing.
  function noticeClip(text) { return text ? keyedClip(`pa|${text}`) : null; }
  // The terminal's loudspeaker, which is a different person. `pa|` is the subway announcer's key
  // space and this is deliberately not in it: the two are baked as two speakers with two voices, and
  // sharing a namespace would have been the one thing that let a flight call come out in the
  // subway's voice.
  function airClip(text) { return text ? keyedClip(`apa|${text}`) : null; }
  // And the flight deck, which is a third announcer again. Three loudspeakers in this game now have
  // three different people behind them — the subway, the terminal and the aeroplane — and each has
  // its own key space so a line can never be looked up in the wrong voice.
  function captainClip(text) { return text ? keyedClip(`cpa|${text}`) : null; }

  // Read-only, for the harness: it can prove who was given which voice, and what was said, without
  // reaching into the graph.
  function status() {
    return { supported: !!AudioCtor, context: ctx ? ctx.state : 'new', on,
             room: roomNow, kind: hall ? hall.__kind : '', said: lastSaid, who: lastWho,
             mode: lastMode, baked: sheet ? Object.keys(sheet).length : 0,
             held: buffers.size, missed: [...missed], error: lastErr, loadError };
  }
  // Something the game can put on screen. Empty while all is well.
  const trouble = () => loadError;
  // For the checks: is there a baked reading of this, whoever ends up playing it.
  // What is coming out of the bus right now, as a peak. Zero while nobody is talking.
  function level() {
    if (!meter) return 0;
    if (!scratch) scratch = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(scratch);
    let peak = 0;
    for (let i = 0; i < scratch.length; i++) {
      const a = Math.abs(scratch[i]);
      if (a > peak) peak = a;
    }
    return +peak.toFixed(4);
  }

  const hasClip = (n, text) => !!(sheet && sheet[keyOf(n, text)]);
  const ready = () => { setup(); return loadSheet(); };
  // Fetch and decode one line without playing it, so a check can prove the file on disk is a file
  // the browser can actually turn into sound. A manifest entry pointing at a bad encode looks
  // perfectly healthy until somebody talks.
  function fetchClip(n, text) {
    if (!setup()) return Promise.resolve(null);
    const key = keyOf(n, text);
    const entry = sheet && sheet[key];
    return entry ? clip(key, entry) : Promise.resolve(null);
  }

  return { unlock, pause, setEnabled, enabled, setRoom, npc, voiceOf, archetypeOf, roleOf,
           stop, status, hasClip, fetchClip, ready, stationClip, noticeClip, airClip, captainClip,
           level, render, trouble, ROLE, awake, setVolume, volume };
})();
if (typeof module !== 'undefined') module.exports = Speech;
