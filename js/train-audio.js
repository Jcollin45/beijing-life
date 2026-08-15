// Audio that belongs to the subway car and nowhere else. The voice clips are rendered ahead of
// time rather than delegated to speechSynthesis: that keeps the same clear Mandarin woman on
// every browser, and means an arrival never changes accent with the player's operating system.
const TrainAudio = (() => {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  let ctx = null, output = null, paIn = null, generation = 0;
  let meter = null, scratch = null;
  let activeVoice = null;
  let motionBed = null, motionSpeed = 0;
  let lastError = '', lastSaid = [];

  function setup() {
    if (ctx || !AudioCtor) return ctx;
    ctx = new AudioCtor();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = .006;
    compressor.release.value = .20;
    output = ctx.createGain();
    output.gain.value = .78;
    output.connect(compressor);
    compressor.connect(ctx.destination);
    // A meter on the bus, so that "is anything actually coming out of this" is a question with an
    // answer. Every check in this project until now has proved that an announcement was *scheduled*
    // without throwing, which is not the same claim at all — the harnesses run headless with
    // --mute-audio, so a graph that produces silence passes every one of them. `Speech` has had a
    // meter for exactly this reason since it was written; the public address never did.
    meter = ctx.createAnalyser();
    meter.fftSize = 2048;
    output.connect(meter);
    paIn = publicAddress(ctx, output);
    return ctx;
  }
  // Peak on the PA bus right now, 0 to 1. Zero while nothing is playing.
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

  // ---------------------------------------------------------------- 广播 the public address
  // What a station sounds like is not the voice. It is the room the voice is played into and the
  // loudspeaker it comes out of, and both of those are more of the effect than the speaker's
  // accent is.
  //
  // The loudspeaker is a horn on a pole: nothing under about 350 Hz, nothing over about 3.5 kHz, a
  // hard presence peak in the middle where the honk lives, and enough drive to grit up the loud
  // syllables. The room is the concourse: tiled, thirty metres to the far wall, so you hear the
  // announcement arrive twice and then hear it go round the corner and come back.
  //
  //   voice ─▶ hp ─▶ lp ─▶ peak ─▶ drive ─▶ throat ─┬──────▶ dry
  //                                                 ├─ pre ─▶ hall ─▶ wet
  //                                                 └─ slap ─▶ lp ─▶ ...  ─▶ echo
  //
  // The slap-back with feedback is the part people actually recognise. A convolution tail alone
  // reads as "large room"; discrete repeats read as "station".
  // Two rooms with loudspeakers in them, and they are not the same fact twice.
  //
  // A subway concourse is a tiled tube with horns on poles in it: narrow-band, honking, and the
  // thing you actually recognise is the discrete slap off the far wall a fifth of a second later.
  // A terminal is a 44 m glazed hall with a distributed ceiling system: dozens of small drivers,
  // each of them close to somebody, so the sound is wide-band and nearly clean, and what you hear
  // of the building is a long diffuse wash rather than two hard repeats. Playing airport
  // announcements through the subway's horn was the first version of this and it moved the player
  // back onto the platform every time the loudspeaker opened.
  //
  // `drive` is the honest difference. A horn hardens on its loud syllables and that grit is most of
  // why one sounds like a station; a ceiling array run at conversational level does not distort at
  // all, so the terminal gets the near-linear curve — the same one that backstops the bus.
  const PA_ROOMS = {
    concourse: { hp: 380, lp: 3500, peak: 2000, peakQ: 1.1, peakDb: 12, scoopDb: -6,
                 curve: 'horn', dry: .74, wet: .33, echo: .27, pre: .026, wetLp: 2200,
                 secs: 2.3, rt60: 1.9, slap: .187, fb: .26, slapLp: 1900, slapHp: 420 },
    terminal:  { hp: 180, lp: 5200, peak: 2600, peakQ: .80, peakDb: 5, scoopDb: -3,
                 curve: 'soft', dry: .78, wet: .42, echo: .16, pre: .038, wetLp: 2600,
                 secs: 3.4, rt60: 2.7, slap: .295, fb: .20, slapLp: 2100, slapHp: 300 },
    // A cabin intercom, which is the opposite problem from both of the others. The room is two
    // metres to the nearest surface and every one of those surfaces is upholstered, so there is
    // essentially no reverberation to have — what there is instead is a small, hard, band-limited
    // speaker in a plastic ceiling panel a foot above your head, and a cabin full of engine noise
    // that the announcement has to cut through. So: narrow, present, a little bit of grit, and
    // almost dry. An announcement with a two-second tail in here would sound like a cathedral.
    intercom:  { hp: 260, lp: 4200, peak: 2300, peakQ: 1.0, peakDb: 8, scoopDb: -4,
                 curve: 'horn', dry: .90, wet: .12, echo: .05, pre: .010, wetLp: 2000,
                 secs: .55, rt60: .34, slap: .031, fb: .10, slapLp: 1800, slapHp: 400 },
    // The shopping centre. Nearer the terminal than the platform, because both are large glazed
    // halls with distributed ceiling speakers rather than a horn on a pole — but a three-floor
    // atrium is a much smaller room than a 44 m departures hall, so a shorter tail and an earlier
    // slap off the balcony fronts. Wider at the top than either announcer, on purpose: mall PA is
    // voiced bright and friendly where a station's is voiced to survive a train.
    retail:    { hp: 200, lp: 5000, peak: 2400, peakQ: .85, peakDb: 6, scoopDb: -3,
                 curve: 'soft', dry: .80, wet: .36, echo: .19, pre: .031, wetLp: 2500,
                 secs: 2.6, rt60: 1.7, slap: .164, fb: .21, slapLp: 2100, slapHp: 330 },
  };
  function publicAddress(c, dest, kind = 'concourse') {
    const R = PA_ROOMS[kind] || PA_ROOMS.concourse;
    const inp = c.createGain();
    inp.gain.value = .55;              // headroom: the drive and the room both add level
    const hp = c.createBiquadFilter();       // the amplifier's protection filter
    hp.type = 'highpass'; hp.frequency.value = R.hp; hp.Q.value = .70;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = R.lp; lp.Q.value = .60;
    // Where the horn lives, and where it does not. Measured in octave bands, the announcement
    // came out with its loudest band at 500 Hz and 2 kHz twelve dB under it, which is a voice in a
    // box rather than a voice on a pole: a horn is roughly flat from its throat up to the top of
    // its passband, and the reason one cuts through a concourse at all is that everything it has
    // is sitting in the 1-3 kHz band the ear reads consonants with.
    const honk = c.createBiquadFilter();
    // Twelve dB is a lot of presence peak. A horn on a pole really is like that, and it is the
    // reason one can be understood across a concourse at all. It went up again when the voice
    // itself stopped being wrong: the old formant bank ran its third formant about 13 dB hotter
    // than a vocal tract does, so the announcement arrived with a brightness that was a defect
    // rather than a loudspeaker. With the voice correct, the lift belongs here, on the horn.
    honk.type = 'peaking'; honk.frequency.value = R.peak; honk.Q.value = R.peakQ;
    honk.gain.value = R.peakDb;
    const thin = c.createBiquadFilter();
    thin.type = 'peaking'; thin.frequency.value = 620; thin.Q.value = .9;
    thin.gain.value = R.scoopDb;
    const drive = c.createWaveShaper();
    drive.curve = R.curve === 'horn' ? hornCurve() : limitCurve();
    drive.oversample = '2x';
    // The horn's own cutoff, and it goes *after* the distortion rather than before it. That
    // ordering is the whole point: an asymmetric shaper regenerates the fundamental as a difference
    // tone between neighbouring harmonics, so a voice high-passed at 380 Hz came back out of the
    // drive with its 80-260 Hz band level with the midrange again. A horn cannot radiate that
    // whatever the amplifier hands it. Two sections, 24 dB an octave, because a horn below its
    // throat frequency does not roll off so much as stop.
    const throat = c.createBiquadFilter();
    throat.type = 'highpass'; throat.frequency.value = R.hp; throat.Q.value = .70;
    const throat2 = c.createBiquadFilter();
    throat2.type = 'highpass'; throat2.frequency.value = R.hp; throat2.Q.value = .70;
    inp.connect(hp); hp.connect(lp);
    lp.connect(honk); honk.connect(thin); thin.connect(drive);
    drive.connect(throat); throat.connect(throat2);
    const horn = throat2;                    // downstream taps the horn, not the driver

    // Everything meets here, and the limiter is the last thing before the room's output. Three
    // gains each connecting straight to the destination is three ways to clip and nothing watching
    // the total, which is exactly how this first came out eight times too loud.
    const mix = c.createGain(); mix.gain.value = 1;
    const limit = c.createWaveShaper();
    limit.curve = limitCurve();
    limit.oversample = '2x';
    mix.connect(limit); limit.connect(dest);

    // The balance between these three is not a taste decision, it is the intelligibility of the
    // announcement, and it has a number: C50, the energy in the first 50 ms against everything
    // after it. At dry .52 / wet .60 / echo .34 that came to -3.5 dB — the room arriving louder
    // than the words, which is the sound of a station you cannot understand. Standing near the
    // horn is what fixes it, and standing near the horn is also what is actually happening: the
    // reverberant field is much the same everywhere in a concourse, while the direct sound is only
    // loud if you are under the speaker, which anyone waiting on a platform is.
    const dry = c.createGain(); dry.gain.value = R.dry;
    horn.connect(dry); dry.connect(mix);

    // the room
    const pre = c.createDelay(.2); pre.delayTime.value = R.pre;
    const hall = c.createConvolver();
    hall.normalize = false;
    hall.buffer = concourseImpulse(c, R.secs, R.rt60);
    const wetLp = c.createBiquadFilter();
    // Darker than the horn itself. Tile keeps the bottom and the air takes the top, so a long
    // tail is always duller than the sound that made it -- and a dull tail sits under the 2-4 kHz
    // band the consonants live in instead of on top of it.
    wetLp.type = 'lowpass'; wetLp.frequency.value = R.wetLp; wetLp.Q.value = .5;
    const wet = c.createGain(); wet.gain.value = R.wet;
    horn.connect(pre); pre.connect(hall); hall.connect(wetLp);
    wetLp.connect(wet); wet.connect(mix);

    // the far wall, and the wall behind that
    const slap = c.createDelay(1.0); slap.delayTime.value = R.slap;
    const fb = c.createGain(); fb.gain.value = R.fb;
    const slapLp = c.createBiquadFilter();
    slapLp.type = 'lowpass'; slapLp.frequency.value = R.slapLp; slapLp.Q.value = .5;
    const slapHp = c.createBiquadFilter();
    slapHp.type = 'highpass'; slapHp.frequency.value = R.slapHp; slapHp.Q.value = .5;
    const echo = c.createGain(); echo.gain.value = R.echo;
    horn.connect(slap);
    slap.connect(slapLp); slapLp.connect(slapHp);
    slapHp.connect(fb); fb.connect(slap);          // each repeat comes back duller than the last
    slapHp.connect(echo); echo.connect(mix);
    return inp;
  }
  // Linear until it is nearly full scale, then it bends. This is a backstop, not an effect: with
  // the gains set as they are it should almost never be reached.
  let LIMIT = null;
  function limitCurve() {
    if (LIMIT) return LIMIT;
    const n = 2049, knee = .72;           // odd, so one entry lands exactly on zero
    LIMIT = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
      LIMIT[i] = x < 0 ? -y : y;
    }
    return LIMIT;
  }
  // A horn driver does not clip so much as harden. Asymmetric, because a real one is.
  let HORN = null;
  function hornCurve() {
    if (HORN) return HORN;
    // Odd length on purpose. With an even one there is no entry at x = 0, so the shaper
    // interpolates between the two straddling it, and because this curve is asymmetric those two
    // do not cancel: silence in gave a small constant out. A DC offset on the PA bus eats headroom
    // and never decays, which is part of how the room came to measure a nine-second tail.
    const n = 1025;
    HORN = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const k = x > 0 ? 2.1 : 2.8;
      HORN[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return HORN;
  }
  // The concourse, as an impulse response built rather than recorded: discrete early reflections
  // off the platform edge, the columns and the far wall, then a diffuse tail that loses its top
  // as it goes, because tile is bright and air is not. Two channels, offset, so it images wide.
  function concourseImpulse(c, seconds = 2.3, rt60 = 1.9) {
    const sr = c.sampleRate, n = Math.round(sr * seconds);
    const buf = c.createBuffer(2, n, sr);
    const decay = Math.log(1e-3) / rt60;
    let seed = 0x1f2e3d4c;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2147483648 - 1;
    };
    const TAPS = [
      [[.021, .46], [.033, .40], [.051, .34], [.072, .28], [.099, .24], [.134, .21],
       [.186, .30], [.257, .15], [.331, .10]],
      [[.018, .48], [.036, .38], [.048, .35], [.076, .26], [.104, .23], [.129, .22],
       [.191, .28], [.249, .16], [.338, .09]],
    ];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        // the tail's low-pass opens tight and closes tighter: a bright slap going dull
        const k = .30 + .42 * Math.exp(-t * 1.3);
        lp += (rnd() - lp) * k;
        d[i] = lp * Math.exp(decay * t) * .60;
      }
      for (const [dt, amp] of TAPS[ch]) {
        const at = Math.round(dt * sr);
        if (at >= n) continue;
        d[at] += amp;
        // a reflection off a tiled wall is not a click; it smears over a few milliseconds
        const smear = Math.round(sr * .006);
        for (let j = 1; j < smear && at + j < n; j++)
          d[at + j] += rnd() * amp * .16 * (1 - j / smear);
      }
    }
    // Unit energy, so convolving with this room holds the level instead of multiplying it. Left
    // un-normalised, reflections at half scale and two seconds of tail come to a gain of about
    // eight — and `normalize = false` on the convolver means nothing downstream would catch it.
    let sum = 0;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) sum += d[i] * d[i];
    }
    const k = 1 / Math.sqrt(sum / 2 + 1e-12);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] *= k;
    }
    return buf;
  }

  function unlock() {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    // Nothing to preload any more: the announcement is synthesised at the moment it is needed, so
    // there is no fetch to lose and no file: URL problem to work around. All this has to do now is
    // `setup` has already built the room, which is the one part slow enough to be worth having
    // ready before the first train arrives rather than at the moment it does.
  }

  function tone(c, dest, at, frequency, duration, level) {
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + .018);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    envelope.connect(dest);

    // The quiet octave supplies the metal in the bell while the sine fundamental keeps it soft.
    for (const [multiple, gain] of [[1, 1], [2, .18]]) {
      const osc = c.createOscillator(), partial = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * multiple, at);
      partial.gain.value = gain;
      osc.connect(partial); partial.connect(envelope);
      osc.start(at); osc.stop(at + duration + .03);
    }
  }

  // A descending two-note 叮咚, through the loudspeaker rather than straight out. It comes from the
  // same horn the voice does and rings round the same room, and it is the bell echoing that tells
  // you where you are standing before a single word has been said.
  function chime(c, dest, at) {
    tone(c, dest, at, 880, .52, .20);
    tone(c, dest, at + .34, 659.25, .64, .22);
  }

  // The terminal's tone, and it goes the other way on purpose. The subway's 叮咚 falls — two notes,
  // down, urgent, meaning "this is your station and the doors are about to shut". An airport is
  // never in a hurry with you: the call comes forty minutes before the aircraft leaves, and the
  // tone that fronts it rises and takes its time. Three notes rather than two, softer, spread over
  // most of a second, so that with your back turned you know which building you are standing in
  // before a word has been said.
  function airChime(c, dest, at) {
    tone(c, dest, at, 587.33, .46, .12);          // D5
    tone(c, dest, at + .26, 783.99, .50, .13);    // G5
    tone(c, dest, at + .52, 1046.50, .86, .11);   // C6, left to ring into the hall
  }

  // The moving car is synthesized instead of streamed. That makes it a seamless loop, keeps the
  // download small, and lets the rail rhythm follow the train's real acceleration and braking.
  // The seeded generator is deliberate: every ride should have the same well-balanced texture.
  function seededNoise(length) {
    const data = new Float32Array(length);
    let seed = 0x512d39a7;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1) * .72;
    }
    return data;
  }

  function filteredNoise(at, duration, frequency, q, level, type = 'bandpass', dest = null) {
    const frames = Math.max(1, Math.round(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    buffer.copyToChannel(seededNoise(frames), 0);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = buffer;
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + Math.min(.10, duration * .22));
    envelope.gain.setValueAtTime(level, at + Math.max(.11, duration - .14));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(dest || output);
    source.start(at); source.stop(at + duration + .03);
  }

  // Door sounds are event-driven, unlike the rolling bed. The warning sequence and the sliding
  // motor are timed to the 1.35-second visual movement in game.js; opening finishes with the
  // short pneumatic sigh heard when a metro door reaches its stop.
  function doors(direction) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const at = ctx.currentTime + .025;
    if (direction === 'close') {
      // Straight to the output, not through the PA: this beeper is in the doorway, an arm's
      // length away, and a door warning that echoed off the far wall would be a station
      // announcement rather than a warning.
      for (const offset of [0, .28, .56, .84]) tone(ctx, output, at + offset, 1120, .115, .060);
      filteredNoise(at + .10, 1.22, 380, .75, .033);
    } else if (direction === 'open') {
      filteredNoise(at, 1.12, 430, .70, .034);
      filteredNoise(at + .90, .40, 1250, .45, .043, 'highpass');
    }
  }

  // ---------------------------------------------------------------- 站台 standing on the platform
  // A tiled hall is never silent. What you hear standing on one is almost entirely low: the
  // ventilation, the hum of a lot of fluorescent ballast, and the smeared remains of other
  // people's conversations two hundred feet away with every consonant taken out of them by the
  // tile. None of it is identifiable and all of it is the difference between a room and a place.
  //
  // Built once and then glided in and out, like the rolling bed. Fourteen nodes, running for as
  // long as the game is open, which costs nothing measurable -- audio does not touch fill rate,
  // and that is why every idea in this pass that could be sound rather than geometry is sound.
  let platBed = null;
  function ensurePlatformBed() {
    if (platBed || !setup()) return platBed;
    const seconds = 3;
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(output);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    // The three bands the room actually has, from one noise source, because three noise sources
    // sum to the same thing and cost three times as much.
    const bands = [
      // the plant, which is most of it
      { f: 78, q: .7, type: 'lowpass', g: .052 },
      // air moving through a grille somewhere behind you
      { f: 620, q: .6, type: 'bandpass', g: .013 },
    ];
    for (const b of bands) {
      const f = ctx.createBiquadFilter();
      f.type = b.type; f.frequency.value = b.f; f.Q.value = b.q;
      const g = ctx.createGain(); g.gain.value = b.g;
      noise.connect(f); f.connect(g); g.connect(master);
    }
    // The murmur: a narrow band around where speech has most of its energy, swelling and fading
    // on its own slow clock. Steady it reads as a fan; moving, it reads as people.
    const murmur = ctx.createBiquadFilter();
    murmur.type = 'bandpass'; murmur.frequency.value = 480; murmur.Q.value = 1.3;
    const murmurG = ctx.createGain(); murmurG.gain.value = .011;
    noise.connect(murmur); murmur.connect(murmurG); murmurG.connect(master);
    const sway = ctx.createOscillator();
    sway.frequency.value = .07;
    const swayG = ctx.createGain(); swayG.gain.value = .008;
    sway.connect(swayG); swayG.connect(murmurG.gain);
    // Fluorescent ballast: twice the mains frequency, which in China is 50 Hz, so 100 -- and the
    // second harmonic, because a failing ballast is buzzier than a sine.
    for (const [hz, lvl] of [[100, .0045], [200, .0026]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = .5;
      const g = ctx.createGain(); g.gain.value = lvl;
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start();
    }
    noise.start();
    sway.start();
    platBed = { master, noise, sway };
    return platBed;
  }
  // On the platform, or not. Called from setPlace, so it follows the room rather than the clock.
  function platform(on) {
    if (!on) {
      if (platBed) glide(platBed.master.gain, 0, .5);
      music(false);
      return;
    }
    if (!ensurePlatformBed()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    glide(platBed.master.gain, 1, .8);
    // and whatever the ceiling is playing today, which is a different one of the three programmes
    // every time somebody comes down the steps.
    music(true);
  }

  // The terminal, which is the platform's big sister. The same idea — a floor of sound under the
  // PA so the loudspeaker is not the only thing in the room — but a 44 m glazed hall sounds nothing
  // like a tiled ticket hall. More low end, because the volume is ten times it; a softer and slower
  // murmur, because the people are further from you; and no ballast buzz, because nobody lights a
  // concourse with fluorescent tubes. Air handling is a steady hiss off the packs in the ceiling,
  // which a real departures hall never stops making.
  let termBed = null;
  function ensureTerminalBed() {
    if (termBed || !setup()) return termBed;
    const seconds = 4;
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(output);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    // The hall's bands, from one source. Deeper than the platform's — a big room gathers low
    // frequency — and with an added mid band for the air handlers, which the platform has none of.
    const bands = [
      // the volume of the hall itself: a deep, broad rumble
      { f: 56, q: .55, type: 'lowpass', g: .072 },
      // the air handlers in the ceiling, which run all day and never change
      { f: 340, q: .9, type: 'bandpass', g: .016 },
      // high air off the glazing, thinner and further away than a grille behind you
      { f: 1400, q: .5, type: 'bandpass', g: .006 },
    ];
    for (const b of bands) {
      const f = ctx.createBiquadFilter();
      f.type = b.type; f.frequency.value = b.f; f.Q.value = b.q;
      const g = ctx.createGain(); g.gain.value = b.g;
      noise.connect(f); f.connect(g); g.connect(master);
    }
    // The murmur: the same trick as the platform's, but slower and softer. The people are further
    // off in a hall this size, so the swell takes longer and sits lower under everything else.
    const murmur = ctx.createBiquadFilter();
    murmur.type = 'bandpass'; murmur.frequency.value = 440; murmur.Q.value = 1.1;
    const murmurG = ctx.createGain(); murmurG.gain.value = .008;
    noise.connect(murmur); murmur.connect(murmurG); murmurG.connect(master);
    const sway = ctx.createOscillator();
    sway.frequency.value = .045;
    const swayG = ctx.createGain(); swayG.gain.value = .005;
    sway.connect(swayG); swayG.connect(murmurG.gain);
    noise.start();
    sway.start();
    termBed = { master, noise, sway };
    return termBed;
  }
  // In the terminal, or not. Same contract as `platform`: called from setPlace, follows the room.
  function terminal(on) {
    if (!on) {
      if (termBed) glide(termBed.master.gain, 0, .8);
      return;
    }
    if (!ensureTerminalBed()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    glide(termBed.master.gain, 1, 1.2);
  }

  // ---------------------------------------------------------------- 面馆 a working noodle shop
  // Close, tiled and busy: extractor hood below everything, wok hiss from the open kitchen,
  // a soft band of conversation, and irregular bowls/chopsticks so the loop never announces itself.
  let dinerBed = null, dinerTimer = 0, dinerTurn = 0;
  function ensureDinerBed() {
    if (dinerBed || !setup()) return dinerBed;
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 3), ctx.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const master = ctx.createGain(); master.gain.value = 0; master.connect(output);
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const hood = ctx.createBiquadFilter(); hood.type = 'lowpass'; hood.frequency.value = 190;
    const hoodG = ctx.createGain(); hoodG.gain.value = .055;
    noise.connect(hood); hood.connect(hoodG); hoodG.connect(master);
    const wok = ctx.createBiquadFilter(); wok.type = 'highpass'; wok.frequency.value = 1750;
    const wokG = ctx.createGain(); wokG.gain.value = .010;
    noise.connect(wok); wok.connect(wokG); wokG.connect(master);
    const voices = ctx.createBiquadFilter(); voices.type = 'bandpass'; voices.frequency.value = 520; voices.Q.value = 1.0;
    const voicesG = ctx.createGain(); voicesG.gain.value = .010;
    noise.connect(voices); voices.connect(voicesG); voicesG.connect(master);
    const swell = ctx.createOscillator(); swell.frequency.value = .075;
    const swellG = ctx.createGain(); swellG.gain.value = .0045;
    swell.connect(swellG); swellG.connect(voicesG.gain);
    const fridge = ctx.createOscillator(); fridge.type = 'sine'; fridge.frequency.value = 58;
    const fridgeG = ctx.createGain(); fridgeG.gain.value = .003;
    fridge.connect(fridgeG); fridgeG.connect(master);
    noise.start(); swell.start(); fridge.start();
    dinerBed = { master, noise, swell, fridge };
    return dinerBed;
  }
  function dinerCue(kind) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const at = ctx.currentTime + .02;
    if (kind === 'door' || kind === 'doorExit') {
      // Two soft hanging chimes at the strip curtain, bright enough to hear over the extractor.
      const quiet = kind === 'doorExit' ? .72 : 1;
      tone(ctx, output, at, 1046, .24, .020 * quiet);
      tone(ctx, output, at + .11, 1568, .30, .016 * quiet);
    } else if (kind === 'bell') {
      tone(ctx, output, at, 1710, .24, .032);
      tone(ctx, output, at + .018, 2440, .18, .012);
    } else if (kind === 'tea') {
      filteredNoise(at, .72, 1150, .65, .055, 'lowpass');
      tone(ctx, output, at + .62, 2320, .10, .015);
    } else if (kind === 'radio') {
      // A tiny phrase from the battered radio above the pass, deliberately below conversation.
      [523, 659, 784, 659].forEach((f, i) => tone(ctx, output, at + i * .16, f, .22, .0065));
    } else if (kind === 'order') {
      tone(ctx, output, at, 1380, .10, .035);
      tone(ctx, output, at + .10, 1840, .12, .028);
    } else if (kind === 'serve' || kind === 'bowl') {
      tone(ctx, output, at, 1960, .10, .025);
      tone(ctx, output, at + .055, 2740, .16, .018);
    } else if (kind === 'chop') {
      filteredNoise(at, .10, 1250, 2.4, .12, 'highpass');
      filteredNoise(at + .13, .08, 980, 2.0, .10, 'highpass');
    } else {
      filteredNoise(at, .46, 2300, .55, .12, 'highpass');
      filteredNoise(at + .15, .12, 360, 1.1, .18, 'lowpass');
    }
  }
  function diner(on) {
    if (!on) {
      if (dinerBed) glide(dinerBed.master.gain, 0, .55);
      if (dinerTimer) { clearInterval(dinerTimer); dinerTimer = 0; }
      return;
    }
    if (!ensureDinerBed()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    glide(dinerBed.master.gain, 1, .8);
    if (!dinerTimer) dinerTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      dinerCue(['bowl','chop','wok','chop','bowl','radio'][dinerTurn++ % 6]);
    }, 2700);
  }

  // ---------------------------------------------------------------- 胡同 the alley, outdoors
  //
  // Every interior in this game has had a floor of sound under it for months — the platform, the
  // terminal, the noodle shop, the atrium — and the one place you spend most of your time had
  // none. Step out of the front door and the city stopped existing. A silent street is not a quiet
  // street: it is a rendering of one.
  //
  // Outdoors is a different problem from a room, and it is not reverb. A room is one space with a
  // texture; a street is a set of distances. So this is built as four layers that are mixed by
  // where the hour and the weather have got to, rather than as one loop that is either on or off:
  //
  //   road    the four-lane at the east end, two hundred metres away — the low continuous bed
  //           that tells you the alley is inside a city rather than in a field. Loudest in the
  //           rush hours, never quite gone, because that road never quite empties.
  //   air     the wash of everything else: distant construction, an extractor two courtyards
  //           over, the general hum. This is what makes it *this* city and not a suburb.
  //   trees   sparrows in the scholar trees, which is a daytime sound and stops at dusk.
  //   wet     rain on tile and asphalt, which only exists when the weather says so.
  //
  // The cues on top — a bell, a scooter, a shutter, a dog, somebody's television through an open
  // window — are what stop a bed from announcing itself as a loop, and they are chosen from a list
  // that changes with the hour, so five in the morning and eight in the evening are different
  // streets rather than the same street at two volumes.
  let hutongBed = null;

  function ensureHutongBed() {
    if (hutongBed || !setup()) return hutongBed;
    // Eleven seconds of noise rather than three: outdoors has no walls to hide a short loop
    // behind, and at three seconds the ear finds the seam in about a minute.
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 11), ctx.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const master = ctx.createGain(); master.gain.value = 0; master.connect(output);
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;

    // ---- the road at the end of the alley. Low, wide, and slowly breathing, because traffic
    // two hundred metres away arrives as a swell and not as individual cars.
    const road = ctx.createBiquadFilter(); road.type = 'lowpass'; road.frequency.value = 150;
    const roadG = ctx.createGain(); roadG.gain.value = .050;
    noise.connect(road); road.connect(roadG); roadG.connect(master);
    const swell = ctx.createOscillator(); swell.frequency.value = .043;
    const swellG = ctx.createGain(); swellG.gain.value = .014;
    swell.connect(swellG); swellG.connect(roadG.gain);

    // ---- the general air of the district, a band above the road and below the birds.
    const air = ctx.createBiquadFilter(); air.type = 'bandpass';
    air.frequency.value = 430; air.Q.value = .55;
    const airG = ctx.createGain(); airG.gain.value = .009;
    noise.connect(air); air.connect(airG); airG.connect(master);

    // ---- the trees. Bandpassed high and modulated fast, which is what a hedge full of sparrows
    // sounds like from across a courtyard without synthesising a single bird.
    // Lower and wider than it was. A narrow Q at 3.6k is a whistle; sparrows across a courtyard
    // arrive as a soft scatter with the top taken off it by the distance and the leaves.
    const trees = ctx.createBiquadFilter(); trees.type = 'bandpass';
    trees.frequency.value = 2650; trees.Q.value = 1.1;
    const treesG = ctx.createGain(); treesG.gain.value = 0;
    noise.connect(trees); trees.connect(treesG); treesG.connect(master);
    // Slow, and shallow. At 2.7 Hz this was a tremolo on a narrow band three and a half kilohertz
    // up, which is not what a hedge full of sparrows sounds like — it is what a broken speaker
    // sounds like. Birdsong in a tree is irregular and mostly quiet; the band should breathe.
    const flit = ctx.createOscillator(); flit.frequency.value = .42;
    const flitG = ctx.createGain(); flitG.gain.value = .0016;
    flit.connect(flitG); flitG.connect(treesG.gain);

    // ---- rain, when there is any. Two bands: the hiss on the asphalt and the harder rattle on
    // the tile roofs either side, which is the sound that makes a hutong in the rain a hutong.
    const wet = ctx.createBiquadFilter(); wet.type = 'highpass'; wet.frequency.value = 1400;
    const wetG = ctx.createGain(); wetG.gain.value = 0;
    noise.connect(wet); wet.connect(wetG); wetG.connect(master);
    const tile = ctx.createBiquadFilter(); tile.type = 'bandpass';
    tile.frequency.value = 5200; tile.Q.value = .8;
    const tileG = ctx.createGain(); tileG.gain.value = 0;
    noise.connect(tile); tile.connect(tileG); tileG.connect(master);

    // ---- wind through the wires and the trees, driven from the weather.
    const wind = ctx.createBiquadFilter(); wind.type = 'bandpass';
    wind.frequency.value = 720; wind.Q.value = .5;
    const windG = ctx.createGain(); windG.gain.value = 0;
    noise.connect(wind); wind.connect(windG); windG.connect(master);
    const gust = ctx.createOscillator(); gust.frequency.value = .11;
    const gustG = ctx.createGain(); gustG.gain.value = .006;
    gust.connect(gustG); gustG.connect(windG.gain);

    noise.start(); swell.start(); flit.start(); gust.start();
    hutongBed = { master, noise, roadG, airG, treesG, wetG, tileG, windG, swell, flit, gust };
    return hutongBed;
  }

  // The mix, from the hour, the weather and how hard it is blowing. Called every frame while you
  // are outdoors; every value here is a gain ramp, so it costs nothing and never steps.
  function hutongMix(hour, wind, wet) {
    if (!hutongBed) return;
    const h = ((hour % 24) + 24) % 24;
    // Traffic: up from five, two humps at the rush hours, down to a floor overnight that is never
    // zero — you can always hear the second ring road from here, even at four in the morning.
    const rush = Math.exp(-((h - 8.2) ** 2) / 4.5) + Math.exp(-((h - 18.4) ** 2) / 6.0);
    const dayness = h > 5.5 && h < 23 ? 1 : .34;
    const roadLv = (.020 + .048 * rush + .022 * dayness);
    // Birds: dawn chorus, present all day, gone by dusk. Nothing sings at two in the morning.
    const birds = h > 4.8 && h < 19.5
      ? Math.min(1, Math.exp(-((h - 6.4) ** 2) / 3.2) * 1.35 + .34) : 0;
    // Rain masks the birds and everything else lifts to be heard over it.
    const rainK = Math.max(0, Math.min(1, wet || 0));
    glide(hutongBed.roadG.gain, roadLv * (1 + rainK * .3), .9);
    glide(hutongBed.airG.gain, (.006 + .008 * dayness), .9);
    glide(hutongBed.treesG.gain, .011 * birds * (1 - rainK * .75), 1.4);
    // Rain is loud, but an alley in the rain is not louder than a subway platform — which is what
    // .030/.016 gave: 0.029 on the bus against the platform bed's 0.020 and the noodle shop's
    // 0.013. Levels here are set by ear against the rooms that already exist, not in the abstract.
    glide(hutongBed.wetG.gain, .0105 * rainK, 1.1);
    glide(hutongBed.tileG.gain, .0055 * rainK, 1.1);
    glide(hutongBed.windG.gain, .020 * Math.max(0, Math.min(1, wind || 0)), 1.2);
  }

  // There are no one-shot cues out here any more, and that is a deliberate subtraction rather than
  // a thing left undone. A bell, a scooter, a shutter, a dog and a television were all built, tuned
  // down, spaced out to one every forty seconds and picked at random — and a discrete event in an
  // otherwise steady field still reads as an interruption every single time, because that is what
  // discrete events are for. What a quiet alley actually sounds like is continuous: the road at the
  // end of it and the birds in the trees, both of which change with the hour without ever asking
  // for your attention. So that is all this is now.

  function hutong(on) {
    if (!on) {
      if (hutongBed) glide(hutongBed.master.gain, 0, .7);
      return;
    }
    if (!ensureHutongBed()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    glide(hutongBed.master.gain, 1, 1.1);
  }

  // ---------------------------------------------------------------- 商场 a tall retail atrium
  // The water and machinery are continuous; lift chimes, checkout scanners and arcade notes are
  // sparse one-shots. All are procedural so the mall stays self-contained and never repeats a
  // conspicuous recorded loop.
  let mallBed = null, mallTimer = 0, mallTurn = 0;
  // How loud the room is under the music. These were set when the mall's only music was a sparse
  // synthesised programme that left long gaps; a record playing continuously has to share the room
  // with them, and the balance that worked against silence does not work against a song. Trimmed as
  // one number so the bed keeps its own internal shape — the fountain against the machinery against
  // the crowd — and only its level against the music moves. Measured: see `.diag-mallsong.js`.
  // Cut again, and by ear rather than by the meter, because the meter was wrong about this. An
  // RMS ratio says how much energy each thing has; it does not say that the fountain is a band of
  // noise sitting at 1050 Hz directly on top of where a vocal lives, and that a song 6 dB above it
  // by energy is still a song you cannot make out. Masking is a question about frequency, not
  // about totals, and the water was the thing in the way.
  const BED_TRIM = .20;
  // Built against a context rather than against the live one, so the bed can be rendered offline
  // and measured. Everything else in this file that has a level worth arguing about can be; this
  // could not, which is exactly why its balance against the music had never been checked.
  function buildMallBed(c, dest, trim = BED_TRIM) {
    const buf = c.createBuffer(1, Math.round(c.sampleRate * 4), c.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const master = c.createGain(); master.gain.value = 0; master.connect(dest);
    const noise = c.createBufferSource(); noise.buffer = buf; noise.loop = true;
    // Fountain: broad, soft water with the harsh top rolled away.
    const water = c.createBiquadFilter(); water.type='bandpass'; water.frequency.value=1050; water.Q.value=.46;
    // And the water down on its own account, on top of the trim, since it is the one element whose
    // band overlaps the music. Quieter than the machinery now, which is the right way round: a
    // fountain you hear over the record is a fountain somebody has mixed wrong.
    const waterG = c.createGain(); waterG.gain.value=.010*trim;
    noise.connect(water); water.connect(waterG); waterG.connect(master);
    // Escalators and HVAC make the low mechanical floor of a large indoor public space.
    const mech = c.createBiquadFilter(); mech.type='lowpass'; mech.frequency.value=185;
    const mechG = c.createGain(); mechG.gain.value=.038*trim;
    noise.connect(mech); mech.connect(mechG); mechG.connect(master);
    const motor=c.createOscillator(); motor.type='sine'; motor.frequency.value=64;
    const motorG=c.createGain(); motorG.gain.value=.0028*trim; motor.connect(motorG); motorG.connect(master);
    // Distant speech, deliberately too blurred to become fake words.
    const crowd=c.createBiquadFilter(); crowd.type='bandpass'; crowd.frequency.value=620; crowd.Q.value=.75;
    const crowdG=c.createGain(); crowdG.gain.value=.011*trim;
    noise.connect(crowd); crowd.connect(crowdG); crowdG.connect(master);
    const breathe=c.createOscillator(); breathe.frequency.value=.061;
    const breatheG=c.createGain(); breatheG.gain.value=.004*trim;
    breathe.connect(breatheG); breatheG.connect(crowdG.gain);
    noise.start(); motor.start(); breathe.start();
    return {master,noise,motor,breathe};
  }
  function ensureMallBed() {
    if (mallBed || !setup()) return mallBed;
    mallBed = buildMallBed(ctx, output);
    return mallBed;
  }
  // Every one-shot in the mall through one gain. The lift chimes, tills, arcades and footsteps
  // were each levelled against the crowd bed and against nothing else, which was right when the
  // only other thing in the room was a synthesised programme that stopped for eight seconds at a
  // time. Against a record that never stops they are the things that keep stepping on it, and a
  // bus means their balance against the music is one number rather than fifteen.
  // Down a long way. These are transients, which is exactly what an RMS measurement is worst at
  // seeing and what an ear is best at: a till beep an instant long barely moves the meter and
  // still steps clean over the top of a song.
  const CUE_TRIM = .20;
  let mallCues = null;
  function cueBus() {
    if (!mallCues) { mallCues = ctx.createGain(); mallCues.gain.value = CUE_TRIM; mallCues.connect(output); }
    return mallCues;
  }
  function mallCue(kind) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(()=>{});
    const at=ctx.currentTime+.02, bus=cueBus();
    if (kind==='door') {
      tone(ctx,bus,at,880,.24,.020); tone(ctx,bus,at+.14,1320,.32,.017);
    } else if (kind==='elevator') {
      tone(ctx,bus,at,784,.35,.026); tone(ctx,bus,at+.22,1175,.42,.022);
    } else if (kind==='checkout') {
      tone(ctx,bus,at,1760,.085,.020); tone(ctx,bus,at+.22,1980,.075,.016);
    } else if (kind==='arcade') {
      [659,784,988,1318].forEach((f,i)=>tone(ctx,bus,at+i*.105,f,.14,.009));
    } else if (kind==='trolley') {
      // A cart wheel over two tile joints, then a tiny loose-metal rattle.
      filteredNoise(at,.055,420,1.8,.045,'bandpass',bus);
      filteredNoise(at+.19,.05,470,1.7,.038,'bandpass',bus);
      tone(ctx,bus,at+.24,2380,.10,.006);
    } else if (kind==='steps') {
      // Two distant rubber-soled steps. Kept dark so they merge with the crowd bed.
      filteredNoise(at,.075,260,1.1,.038,'lowpass',bus);
      filteredNoise(at+.36,.07,290,1.1,.032,'lowpass',bus);
    } else if (kind==='chime') {
      // A soft three-note retail PA ident; music ducks perceptibly but never disappears.
      retailDuck(.56,1.8);
      [659,831,988].forEach((f,i)=>tone(ctx,bus,at+i*.24,f,.42,.010));
    } else {
      // A small crockery/footstep transient that sits inside the crowd instead of above it.
      filteredNoise(at,.11,1350,1.4,.055,'highpass',bus);
    }
  }
  // ---------------------------------------------------------------- 电梯 the lift at home
  //
  // Its own bus, and it matters which. The mall's cues run through `CUE_TRIM` at 0.20 because they
  // are competing with a record that never stops — a till beep at full level walks straight over
  // the top of a song. A residential lift lobby has no record in it. Trimmed to the mall's bus the
  // 叮 was there on the meter and inaudible in the room, which is the wrong failure for the one
  // sound in this building that tells you a door has opened behind you.
  //
  // The chime is the 叮咚 a Chinese car actually makes: two notes, a fifth apart, the second held —
  // and it rings a little, because it is a bell in a tiled box. `close` is the flat double warning
  // that comes before the leaves move, low and unmusical so the two are never confused.
  let liftBus = null, liftRun = null;
  function liftCue(kind) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    if (!liftBus) { liftBus = ctx.createGain(); liftBus.gain.value = .62; liftBus.connect(output); }
    const at = ctx.currentTime + .02;
    if (kind === 'ding') {
      tone(ctx, liftBus, at, 784, .40, .050);
      tone(ctx, liftBus, at + .20, 1175, .78, .044);
    } else if (kind === 'press') {
      // The button. Two things happen when a thumb lands on one of these and they are not the same
      // sound: the switch bottoming out, which is a click and nothing else, and the little
      // acknowledge tone the panel makes a moment later. Doing only the tone gives you a
      // doorbell; doing only the click gives you a light switch.
      filteredNoise(at, .012, 2600, 1.2, .085, 'bandpass', liftBus);
      filteredNoise(at + .045, .010, 1700, 1.4, .045, 'bandpass', liftBus);
      tone(ctx, liftBus, at + .055, 1568, .11, .020);
    } else if (kind === 'close') {
      tone(ctx, liftBus, at, 523.25, .16, .026);
      tone(ctx, liftBus, at + .26, 523.25, .16, .026);
    } else if (kind === 'move') {
      // The car taking up: a short hydraulic sigh, not a motor loop. This is the one you hear from
      // inside, where the ride is four seconds of quiet and anything longer competes with it.
      filteredNoise(at, .9, 190, .9, .030, 'lowpass', liftBus);
    }
  }

  // The car coming to you — and this one is a loop rather than a cue, because it is the only sound
  // in the building with a *duration* you can hear: you press the button, and then you stand on the
  // landing listening to it arrive. What that actually is, through a shaft door, is not a motor. It
  // is the counterweight and the guide shoes running in the rails: a low rumble with a faint metallic
  // ring on top of it, coming through a steel door two metres away.
  //
  // It rises as the car nears you and falls away as it leaves, which is what `near` carries — 0 at
  // the far floor, 1 arriving. Without that it is a noise that switches on and off, and a lift you
  // cannot hear approaching is the thing this was added to fix.
  function liftTravel(on, near) {
    if (!on) {
      if (liftRun) { glide(liftRun.g.gain, 0, .45); const r = liftRun; liftRun = null;
        setTimeout(() => { try { r.src.stop(); } catch (_) {} }, 700); }
      return;
    }
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    if (!liftBus) { liftBus = ctx.createGain(); liftBus.gain.value = .62; liftBus.connect(output); }
    if (!liftRun) {
      // Brown-ish noise through a low shelf for the rumble, plus a narrow resonant band around
      // 380 Hz for the rail ring. Two filters on one source rather than two sources: they are the
      // same noise heard two ways, which is what they are in a shaft.
      const src = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + .022 * w) / 1.022;
        d[i] = last * 3.2;
      }
      src.buffer = buf; src.loop = true;
      const lo = ctx.createBiquadFilter(); lo.type = 'lowpass';
      lo.frequency.value = 240; lo.Q.value = .7;
      const ring = ctx.createBiquadFilter(); ring.type = 'bandpass';
      ring.frequency.value = 380; ring.Q.value = 6.5;
      const ringG = ctx.createGain(); ringG.gain.value = .30;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(lo); lo.connect(g);
      src.connect(ring); ring.connect(ringG); ringG.connect(g);
      g.connect(liftBus);
      src.start();
      liftRun = { src, g, ring };
    }
    const k = near === undefined ? .5 : (near < 0 ? 0 : near > 1 ? 1 : near);
    // Level and brightness both track how close it is. A car at the far end of the shaft is a
    // rumble under the floor; one about to arrive has the rails singing in it.
    glide(liftRun.g.gain, .035 + .085 * k, .18);
    liftRun.ring.frequency.setTargetAtTime(300 + 190 * k, ctx.currentTime, .12);
  }

  function mall(on) {
    if (!on) {
      if (mallBed) glide(mallBed.master.gain,0,.75);
      if (mallTimer) { clearInterval(mallTimer); mallTimer=0; }
      retailMusic(false);
      return;
    }
    if (!ensureMallBed()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(()=>{});
    glide(mallBed.master.gain,1,1.1);
    retailMusic(true);
    if (!mallTimer) mallTimer=setInterval(()=>{
      if (!ctx || ctx.state!=='running') return;
      mallCue(['steps','soft','checkout','trolley','soft','arcade','steps','chime','soft','elevator'][mallTurn++%10]);
    },3300);
  }

  // ---------------------------------------------------------------- 音乐 what the station plays
  // Three programmes, quietly, out of the ceiling: a jazz trio, a 民乐 group on a pentatonic
  // scale, and a slow string chorale. One at a time, a different one each time you come down the
  // steps, and all of them well under an announcement — station music you notice is station music
  // somebody has got wrong.
  //
  // Synthesised rather than streamed, for the same three reasons as everything else in this file:
  // nothing to download, no loop to hear coming round, and audio does not touch fill rate. What it
  // does touch is allocation, and that is why these pieces are sparse: about thirty small nodes a
  // second at the busiest, created and finished with, against three and a half thousand props on
  // screen in the hutong. Sparse is also what makes it background rather than a soundtrack, so the
  // cheap version and the good version are the same version.
  //
  // Every piece is a seeded function of its bar number, so it comes out the same way twice and the
  // harness can render it off the clock and measure what it played.
  const MUSIC_ORDER = ['folk', 'jazz', 'strings'];
  // How loud the ceiling is at all, once. Every piece has a trim against this rather than a level
  // of its own, so "turn the music down" is one number and not three.
  const MUSIC_GAIN = .50;
  const PIECE_SECS = 58, PIECE_GAP = 11;      // a piece, then quiet, then the next programme
  let musicRig = null, musicPiece = null, musicTurn = -1, musicTimer = 0, musicOn = false;

  // mulberry32, so a bar of music is reproducible from its number.
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  // The nearest note of a given pitch class to where a line already is, inside a register. This is
  // what keeps a tune in one place instead of following the chord up and down the keyboard, and it
  // is most of the difference between a melody and an arpeggio generator.
  function near(pc, prev, lo, hi) {
    let best = prev, d = 1e9;
    for (let n = lo; n <= hi; n++) {
      if (((n % 12) + 12) % 12 !== ((pc % 12) + 12) % 12) continue;
      const k = Math.abs(n - prev);
      if (k < d) { d = k; best = n; }
    }
    return best;
  }

  // ---- the ceiling speakers, and the room they are in.
  // Not the horn. A tannoy is a 380 Hz to 3.5 kHz box with a presence peak and some grit in it,
  // which is exactly right for one voice carrying across a concourse and exactly wrong for a
  // cello. These are flush ceiling drivers: thin at the bottom, honest in the middle, soft on top.
  //
  // They feed the same tiled hall, but through two cross-fed delays rather than the convolver. A
  // 2.3 second impulse response is the most expensive node in this file — .pacheck.js exists partly
  // to make sure only one of them is ever built — and a bed that plays for minutes at a time cannot
  // have one of its own. Music is continuous, so what reads is the wash and not the discrete slap
  // the announcement needs.
  function buildMusic(c, dest, gain) {
    const inp = c.createGain(); inp.gain.value = 1;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 125; hp.Q.value = .65;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 6200; lp.Q.value = .6;
    const box = c.createBiquadFilter();       // a small cabinet in a hard ceiling
    box.type = 'peaking'; box.frequency.value = 760; box.Q.value = 1.0; box.gain.value = -3;
    inp.connect(hp); hp.connect(lp); lp.connect(box);
    const mix = c.createGain(); mix.gain.value = 1;
    box.connect(mix);
    // the hall
    const pre = c.createDelay(.5); pre.delayTime.value = .029;
    const wet = c.createGain(); wet.gain.value = .34;
    box.connect(pre);
    const D = [], F = [];
    for (const [time, pan] of [[.0971, -.55], [.1433, .55]]) {
      const d = c.createDelay(1.0); d.delayTime.value = time;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = .5;
      const self = c.createGain(); self.gain.value = .30;
      pre.connect(d); d.connect(f); f.connect(self); self.connect(d);
      // Each side of the room to its own side of your head. Two mutually prime delay times panned
      // apart is a room; the same two summed to the middle is a flanger.
      if (c.createStereoPanner) {
        const p = c.createStereoPanner(); p.pan.value = pan;
        f.connect(p); p.connect(wet);
      } else f.connect(wet);
      D.push(d); F.push(f);
    }
    // and each side feeding the other, which is what turns two echoes into one room. Total loop
    // gain .56, so the wash dies away in about a second and a half and cannot run away.
    for (const [a, b] of [[0, 1], [1, 0]]) {
      const x = c.createGain(); x.gain.value = .26;
      F[a].connect(x); x.connect(D[b]);
    }
    wet.connect(mix);
    // Ducked, then trimmed. The duck is a separate stage from the trim so that turning the music
    // down and getting it out of the way of an announcement are two different controls.
    const duck = c.createGain(); duck.gain.value = 1;
    const master = c.createGain(); master.gain.value = 0;
    mix.connect(duck); duck.connect(master); master.connect(dest);
    // One second of noise, shared, for the brushes. A cymbal every beat is not worth a buffer
    // allocation every beat.
    const noise = c.createBuffer(1, Math.round(c.sampleRate), c.sampleRate);
    noise.copyToChannel(seededNoise(noise.length), 0);
    return { c, inp, duck, master, noise, gain };
  }

  // ---- the instruments. All of them take the context they are being built in, so the same piece
  // can be played live on the platform or rendered off the clock by the harness.

  // A plucked string with a soundboard behind it: no attack to speak of, a long ring, and the first
  // few partials slightly out of tune with each other, which is what a wound string does.
  function pluck(rig, at, hz, dur, level, bright = 1) {
    const c = rig.c;
    const env = c.createGain();
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + .005);
    env.gain.exponentialRampToValueAtTime(.0001, at + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900 + 2800 * bright; lp.Q.value = .7;
    env.connect(lp); lp.connect(rig.inp);
    for (const [mult, g] of [[1, 1], [2.003, .30], [3.01, .11]]) {
      const o = c.createOscillator(), a = c.createGain();
      o.type = 'sine'; o.frequency.value = hz * mult;
      a.gain.value = g;
      o.connect(a); a.connect(env);
      o.start(at); o.stop(at + dur + .02);
    }
  }
  // A bowed note. Rosin takes a moment to grip, so the start is slow; the vibrato arrives once the
  // note has settled rather than at the moment the bow lands, which is the tell for a played note
  // against a switched-on one.
  function bow(rig, at, hz, dur, level, o = {}) {
    const c = rig.c;
    const atk = o.attack || .09, rel = o.release || Math.min(.6, dur * .35);
    const env = c.createGain();
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + atk);
    env.gain.setValueAtTime(level, at + Math.max(atk + .02, dur - rel));
    env.gain.exponentialRampToValueAtTime(.0001, at + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = o.bright || 1500; lp.Q.value = .8;
    env.connect(lp); lp.connect(rig.inp);
    // The vibrato, in Hz at this pitch, shared by both strings of the pair.
    const cents = o.vib === undefined ? 9 : o.vib;
    let vib = null;
    if (cents > 0) {
      const lfo = c.createOscillator();
      lfo.frequency.value = o.rate || 5.2;
      vib = c.createGain();
      vib.gain.setValueAtTime(0, at);
      vib.gain.linearRampToValueAtTime(hz * (Math.pow(2, cents / 1200) - 1), at + Math.min(dur * .6, atk + .45));
      lfo.connect(vib);
      lfo.start(at); lfo.stop(at + dur + .05);
    }
    for (const [detune, g] of [[-4, 1], [4, .85]]) {
      const osc = c.createOscillator(), a = c.createGain();
      osc.type = 'sawtooth';
      const f = hz * Math.pow(2, detune / 1200);
      if (o.from) {
        osc.frequency.setValueAtTime(o.from * Math.pow(2, detune / 1200), at);
        osc.frequency.exponentialRampToValueAtTime(f, at + (o.slide || .15));
      } else osc.frequency.value = f;
      if (vib) vib.connect(osc.frequency);
      a.gain.value = g * .5;
      osc.connect(a); a.connect(env);
      osc.start(at); osc.stop(at + dur + .05);
    }
  }
  // A struck tine: sine, a quiet octave, and a decay long enough to be a chord rather than a stab.
  function keys(rig, at, hz, dur, level) {
    const c = rig.c;
    const env = c.createGain();
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + .010);
    env.gain.exponentialRampToValueAtTime(.0001, at + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = .6;
    env.connect(lp); lp.connect(rig.inp);
    for (const [mult, g] of [[1, 1], [2.004, .20]]) {
      const o = c.createOscillator(), a = c.createGain();
      o.type = 'sine'; o.frequency.value = hz * mult;
      a.gain.value = g;
      o.connect(a); a.connect(env);
      o.start(at); o.stop(at + dur + .02);
    }
  }
  // An upright bass: almost all fundamental, with the finger on the string at the front of it.
  function bassNote(rig, at, hz, dur, level) {
    const c = rig.c;
    const env = c.createGain();
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + .022);
    env.gain.exponentialRampToValueAtTime(.0001, at + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 1.0;
    env.connect(lp); lp.connect(rig.inp);
    for (const [type, mult, g] of [['sine', 1, 1], ['triangle', 2, .22]]) {
      const o = c.createOscillator(), a = c.createGain();
      o.type = type; o.frequency.value = hz * mult;
      a.gain.value = g;
      o.connect(a); a.connect(env);
      o.start(at); o.stop(at + dur + .02);
    }
  }
  // Brushes on a ride: one short window of the shared noise buffer, filtered. Wire brushes are
  // mostly air, so this is a wide band well above the voice with no pitch in it at all.
  function brush(rig, at, level, hz, dur = .16) {
    const c = rig.c;
    const src = c.createBufferSource();
    src.buffer = rig.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hz; f.Q.value = .5;
    const env = c.createGain();
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + .012);
    env.gain.exponentialRampToValueAtTime(.0001, at + dur);
    src.connect(f); f.connect(env); env.connect(rig.inp);
    // Somewhere different in the buffer every time, or every brush stroke is the same brush stroke.
    src.start(at, (at * 7.13) % .8, dur + .05);
  }

  // ---- 爵士 the trio. A turnaround in F, which is where a standard spends most of its time, with
  // a bar of the flat side for colour. `m` is what the tune is allowed to use over each chord: the
  // chord's own notes plus whatever is worth leaning on, which for a dominant is the flat ninth.
  const JAZZ_CHART = [
    { r: 41, t: [0, 4, 7, 11], m: [0, 2, 4, 7, 9, 11] },     // Fmaj7
    { r: 38, t: [0, 3, 7, 10], m: [0, 2, 3, 5, 7, 10] },     // Dm7
    { r: 43, t: [0, 3, 7, 10], m: [0, 2, 3, 5, 7, 10] },     // Gm7
    { r: 36, t: [0, 4, 7, 10], m: [0, 2, 4, 7, 9, 10] },     // C7
    { r: 34, t: [0, 4, 7, 11], m: [0, 2, 4, 7, 9, 11] },     // Bbmaj7
    { r: 33, t: [0, 4, 7, 10], m: [0, 1, 4, 7, 10] },        // A7, with the flat nine
    { r: 38, t: [0, 3, 7, 10], m: [0, 2, 3, 5, 7, 10] },     // Dm7
    { r: 36, t: [0, 4, 7, 10], m: [0, 2, 4, 7, 9, 10] },     // C7 — and round again
  ];
  // Four notes a bar: the root, two notes from inside the chord, and then a note a semitone off the
  // next chord's root. That last beat is the whole trick — a bass line is heard as going somewhere
  // almost entirely because of where it is on the fourth beat of the bar.
  function walk(ch, nx, r) {
    const line = [ch.r,
                  ch.r + ch.t[1 + Math.floor(r() * 2)],
                  ch.r + (r() < .5 ? ch.t[3] - 12 : ch.t[2]),
                  nx.r + (r() < .65 ? (r() < .5 ? -1 : 1) : -5)];
    return line.map(n => n < 33 ? n + 12 : n > 55 ? n - 12 : n);
  }
  // The left hand: two octaves up and without the root, because the bass has the root covered and
  // a pianist who doubles it in a trio is a pianist nobody asks back.
  function voicing(ch) {
    return ch.t.slice(1).map(t => ch.r + 24 + t).map(n => n > 79 ? n - 12 : n);
  }

  // ---- 民乐 the folk group. Pentatonic on D — 宫商角徵羽, the five notes — a 古筝 arpeggiating
  // underneath and an 二胡 over the top of it, sliding into about half its notes, which is what an
  // 二胡 does and is most of why it sounds like one.
  const PENT = [0, 2, 4, 7, 9];
  const pentAt = (root, deg) =>
    root + 12 * Math.floor(deg / 5) + PENT[((deg % 5) + 5) % 5];

  // ---- 弦乐 the chorale. Eight chords in G, and the four voices move to the nearest note of the
  // next one rather than to a fixed voicing. That is the whole reason a chorale sounds like one
  // instrument breathing instead of four instruments changing chord together.
  const STR_CHART = [
    { r: 43, t: [0, 4, 7] },        // G
    { r: 50, t: [0, 4, 7] },        // D
    { r: 40, t: [0, 3, 7] },        // Em
    { r: 36, t: [0, 4, 7] },        // C
    { r: 43, t: [0, 4, 7] },        // G
    { r: 45, t: [0, 3, 7, 10] },    // Am7
    { r: 50, t: [0, 4, 7] },        // D
    { r: 43, t: [0, 4, 7] },        // G
  ];
  function leadTo(st, ch) {
    const pcs = ch.t.map(t => (ch.r + t) % 12);
    const out = [ch.r];                        // the bass takes the root, in its own octave
    const taken = new Set();
    for (let v = 1; v < st.voices.length; v++) {
      let best = null, bestD = 1e9;
      for (const pc of pcs) for (let k = -1; k <= 1; k++) {
        const n = (Math.round((st.voices[v] - pc) / 12) + k) * 12 + pc;
        if (n < 55 || n > 84) continue;
        // A voice would rather move a tone than land on a note another voice has already taken.
        const d = Math.abs(n - st.voices[v]) + (taken.has(n) ? 7 : 0);
        if (d < bestD) { bestD = d; best = n; }
      }
      taken.add(best === null ? st.voices[v] : best);
      out.push(best === null ? st.voices[v] : best);
    }
    st.voices = out.slice();
    return out;
  }

  // ---- the three programmes. Each one is handed a bar number and the moment that bar starts, and
  // schedules everything in it. Bars rather than beats because a bar is the shortest thing that
  // makes musical sense on its own, and one bar of lookahead is well inside what the audio clock
  // will accept.
  const PIECES = {
    jazz: {
      tempo: 96, beats: 4, trim: 1.00,
      bar(st, i, at) {
        const rig = st.rig, r = st.r, B = st.beat, sw = B * .62;
        const ch = JAZZ_CHART[i % JAZZ_CHART.length];
        const nx = JAZZ_CHART[(i + 1) % JAZZ_CHART.length];
        for (const [k, n] of walk(ch, nx, r).entries())
          bassNote(rig, at + k * B, midi(n), B * .95, .175);
        // Brushes: a stroke on every beat, a little heavier on two and four, and that is all. A
        // full ride pattern under a room this reverberant is a wash rather than a rhythm.
        for (let k = 0; k < 4; k++)
          brush(rig, at + k * B, k % 2 ? .0135 : .0085, k % 2 ? 6200 : 4300, k % 2 ? .13 : .20);
        // The piano, off the beat, and not in every bar.
        if (r() < .78) for (const n of voicing(ch)) keys(rig, at + B + sw, midi(n), 1.15, .046);
        if (r() < .40) for (const n of voicing(nx)) keys(rig, at + 3 * B + sw, midi(n), .85, .034);
        // The tune, when it feels like it. Phrases with rests between them: the horn player is not
        // being paid by the note and the room needs the space.
        if (r() < .58) {
          // Laid out on the swung eighths of the bar rather than by adding durations up: the k-th
          // eighth is on the beat when k is even and two thirds of the way through it when k is
          // odd, and a long note spans a whole number of them. Adding .38 and .62 of a beat
          // together instead put every phrase that started off the beat permanently off it —
          // a tenth of a second out, which is audible and which the harness caught.
          const eighth = k => B * (k >> 1) + (k & 1 ? sw : 0);
          let k = r() < .5 ? 0 : 3;
          const n = 2 + Math.floor(r() * 4);
          for (let i = 0; i < n && k < 8; i++) {
            const pc = ch.r + ch.m[Math.floor(r() * ch.m.length)];
            st.tune = near(pc, st.tune, 67, 84);
            const span = i === n - 1 && r() < .6 ? 2 + Math.floor(r() * 3) : 1;
            const held = eighth(Math.min(8, k + span)) - eighth(k);
            keys(rig, at + eighth(k), midi(st.tune), Math.max(.30, held * 1.7),
                 span > 1 ? .050 : .042);
            k += span;
          }
        }
      },
    },
    folk: {
      tempo: 76, beats: 4, trim: .95,
      bar(st, i, at) {
        const rig = st.rig, r = st.r, B = st.beat;
        // The drone, renewed every four bars: the tonic and the fifth, dark and barely there. It is
        // what keeps a free-tempo pentatonic melody sounding like it is in a key.
        if (i % 4 === 0) {
          const dur = B * 16 + .5;
          bow(rig, at, midi(38), dur, .030, { attack: 1.2, release: 1.4, bright: 780, vib: 4 });
          bow(rig, at, midi(45), dur, .022, { attack: 1.6, release: 1.4, bright: 900, vib: 4 });
        }
        // 古筝. A rising figure off a degree of the scale, and every fourth bar a 刮奏 — the sweep
        // up the strings with the back of the nail that every guzheng piece has in it.
        if (i % 4 === 3) {
          const from = 2 + Math.floor(r() * 3);
          for (let k = 0; k < 9; k++)
            pluck(rig, at + k * B * .18, midi(pentAt(50, from + k)), 1.9, .034 - k * .002, .9);
        } else {
          const from = Math.floor(r() * 6);
          const n = 3 + Math.floor(r() * 3);
          for (let k = 0; k < n; k++)
            pluck(rig, at + k * B * .5, midi(pentAt(50, from + k * (r() < .3 ? 2 : 1))),
                  1.5 + r() * .8, .048, .75);
        }
        // 二胡, on alternate bars, sliding into some of its notes and leaning on the last one.
        if (i % 2 === 1) {
          let t = 0;
          const n = 2 + Math.floor(r() * 3);
          for (let k = 0; k < n && t < B * 3.4; k++) {
            const deg = st.deg + (r() < .5 ? 1 : -1) * (1 + Math.floor(r() * 2));
            st.deg = Math.max(0, Math.min(11, deg));
            const hz = midi(pentAt(62, st.deg));
            const dur = (k === n - 1 ? 1.6 + r() : .7 + r() * .6) * B;
            const slide = r() < .45;
            bow(rig, at + t, hz, dur, .055, {
              attack: .11, release: .34, bright: 2100, vib: 14, rate: 5.6,
              from: slide ? hz * Math.pow(2, (r() < .5 ? -3 : 2) / 12) : 0, slide: .18,
            });
            t += dur + (r() < .3 ? B * .5 : 0);
          }
        }
      },
    },
    strings: {
      tempo: 50, beats: 4, trim: .92,
      bar(st, i, at) {
        const rig = st.rig, B = st.beat;
        const ch = STR_CHART[i % STR_CHART.length];
        const notes = leadTo(st, ch);
        // Overlapped: the new chord starts before the old one has finished releasing, so the four
        // voices are never all silent at once and the change is a move rather than a cut.
        const dur = B * 4 + .9;
        const levels = [.052, .040, .036, .034];
        for (let v = 0; v < notes.length; v++)
          bow(rig, at - .35, midi(notes[v]), dur, levels[v],
              { attack: v === 0 ? 1.4 : .9 + v * .18, release: 1.1,
                bright: 1150 + v * 260, vib: 7, rate: 4.6 + v * .3 });
      },
    },
  };

  // ---- one piece, from the first bar to the fade.
  function startPiece(rig, kind, seed, from) {
    const p = PIECES[kind];
    const beat = 60 / p.tempo;
    return { rig, kind, piece: p, r: seeded(seed), beat, bar: 0,
             at: from, ends: from + PIECE_SECS,
             tune: 74, deg: 4, voices: [55, 62, 67, 71] };
  }
  // Everything up to `until`, one bar at a time. Live this is called four times a second with a
  // window a bar and a half wide; offline the harness calls it once with the whole piece.
  function fillPiece(st, until) {
    const barSecs = st.beat * st.piece.beats;
    while (st.at < until && st.at < st.ends) {
      st.piece.bar(st, st.bar++, st.at);
      st.at += barSecs;
    }
    return st.at >= st.ends;
  }
  // The pump. Nothing happens while the context is suspended — the clock is stopped, so `at` never
  // falls behind and the piece freezes and thaws with the rest of the game instead of dumping a
  // minute of catching-up notes the moment you unpause.
  function musicPump() {
    if (!musicOn || !musicRig || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (musicPiece) {
      if (fillPiece(musicPiece, now + 1.6) && musicPiece.at <= now + 1.6) {
        // Out on a fade rather than a stop, then quiet, then the next programme along.
        glide(musicRig.master.gain, 0, 1.2);
        const gapEnd = now + PIECE_GAP;
        musicPiece = null;
        musicRig.nextAt = gapEnd;
      }
      return;
    }
    if (now >= (musicRig.nextAt || 0)) nextProgramme(now + .6);
  }
  function nextProgramme(from) {
    musicTurn = (musicTurn + 1) % MUSIC_ORDER.length;
    const kind = MUSIC_ORDER[musicTurn];
    musicPiece = startPiece(musicRig, kind, 0x9e3779b9 ^ (musicTurn * 2654435761), from);
    musicRig.master.gain.cancelScheduledValues(ctx.currentTime);
    musicRig.master.gain.setValueAtTime(0, ctx.currentTime);
    glide(musicRig.master.gain, MUSIC_GAIN * musicPiece.piece.trim, .9);
    fillPiece(musicPiece, ctx.currentTime + 1.6);
  }
  // On the platform, or not. Called from `platform`, so the music follows the room the way the
  // ventilation does — and a new programme every time you come down the steps, which is the only
  // way a player who is on a platform for forty seconds at a time ever hears all three.
  function music(on) {
    if (!on) {
      musicOn = false;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; }
      if (musicRig) glide(musicRig.master.gain, 0, .35);
      musicPiece = null;
      return;
    }
    if (!setup()) return;
    if (!musicRig) musicRig = buildMusic(ctx, output, MUSIC_GAIN);
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    musicOn = true;
    musicPiece = null;
    musicRig.nextAt = 0;
    // Only if there is a clock to schedule against. Before the first gesture the context is
    // suspended and `currentTime` is standing still, and a piece scheduled into that comes out as
    // a pile of notes all at once the moment it resumes. The title screen's camera tour goes
    // through setPlace for every shot, so this is the usual case and not an edge one.
    if (ctx.state === 'running') nextProgramme(ctx.currentTime + .6);
    if (!musicTimer) musicTimer = setInterval(musicPump, 250);
  }

  // The mall plays a record, and the station does not. Everywhere else in this file the music is
  // synthesised a note at a time, because a platform programme has to be different every time you
  // come down the steps and never long enough to recognise. A shopping centre is the opposite kind
  // of place: it plays the same song on a loop all afternoon, loudly enough to hear over the
  // crowd, and hearing the same track again on your second visit is not a bug there — it is what
  // the room is like.
  //
  // 玻璃上的光影, streamed rather than decoded. Four megabytes decodes to about eighty of PCM held
  // for as long as the tab is open, which is a lot to spend on one room; a media element streams it
  // and throws the audio away as it goes.
  //
  // It still plays through `buildMusic`'s rig, which is the whole point of routing it there instead
  // of at the output: the song gets the same ceiling voicing as everything else in that hall — the
  // 125 Hz highpass and 6.2 kHz lowpass that make a small driver in a hard ceiling, the -3 dB dip
  // at 760, and the room behind it — and it inherits the duck, so an announcement still drops it.
  // Three records, and they do not arrive at the same loudness. Two are mastered near full scale
  // and one is not, and a playlist that hands the room straight to the file is a playlist where
  // one track disappears under the fountain and the next one shouts. So each carries its own gain,
  // and each of those gains is measured rather than chosen: `node .diag-mallsong.js` renders every
  // track through this same rig and prints the number that puts it level with the others.
  //
  // What `gain` means here is the master gain for that track — the level the record plays at in
  // the room. They are all aiming at the same target, which is about 6 dB over the crowd bed, so a
  // quiet master gets a bigger number and not a different treatment.
  const RETAIL_SONGS = [
    { file: 'audio/mall/guangying.mp3', title: '玻璃上的光影',  gain: .0271 },
    { file: 'audio/mall/cajian.mp3',    title: '擦肩而过的灿烂', gain: .0278 },
    // Mastered in the same class as the two above — peaks at 0 dBFS, crest 14.2, and a band-limited
    // RMS of -16.52 dB against cajian's -16.51. Two records that arrive a hundredth of a decibel
    // apart through the ceiling voicing get the same number; measuring it was still the point,
    // because "it sounds like the other loud ones" is exactly the assumption that put a 29.7 dB
    // gap in this list in the first place.
    { file: 'audio/mall/fukan.mp3',     title: '俯瞰万家灯火',  gain: .0280 },
    // -16.05 dB band RMS, a seventh of a decibel hotter than 玻璃上的光影, so it comes down a
    // hair to sit level with it. The three loud masters now land within 0.1 dB of each other
    // through the rig.
    { file: 'audio/mall/zhuizhu.mp3',   title: '追逐地平线',    gain: .0265 },
    // -16.89 dB, the quietest of the three new records and still within a decibel of the other
    // two, so it goes up by the same small amount they came down by. Nine tracks now, and the
    // spread across the four loud masters is under 0.1 dB through the rig.
    { file: 'audio/mall/guangxian.mp3', title: '光线亲吻',      gain: .0292 },
    // -16.53 dB, which is 擦肩而过的灿烂 to within two hundredths of a decibel, so it takes that
    // track's number. Five loud masters, one gain each, all measured; the four quiet ones below
    // still sit about 2 dB hotter in the room than these do, which is noted at the foot of this
    // list rather than fixed here.
    { file: 'audio/mall/liangdian.mp3', title: '两点钟的午后',  gain: .0280 },
    // -16.44 dB. Six loud masters now, spread 0.84 dB between the loudest and quietest of them,
    // each measured against the same room target rather than against the one above it.
    { file: 'audio/mall/shouru.mp3',    title: '收入口袋',      gain: .0277 },
    // -17.11 dB, the quietest of the loud group and the largest correction of the six new ones,
    // which is still only a decibel. Eleven tracks.
    { file: 'audio/mall/liuxing.mp3',   title: '最亮的流星',    gain: .0300 },
    // -16.56 dB. Twelve tracks; the seven added here span 1.06 dB of master level and land within
    // a tenth of a decibel of each other in the room, which is the point of measuring each one.
    { file: 'audio/mall/xintiao.mp3',   title: '心跳不回头',    gain: .0281 },
    // -16.55 dB, a hundredth of a decibel off the track above it and given the same number.
    // Thirteen tracks; eight of them added today, every gain measured through the same band.
    { file: 'audio/mall/zuobiao.mp3',   title: '不需要坐标',    gain: .0281 },
    // -16.34 dB. Fourteen tracks, nine of them added today.
    { file: 'audio/mall/hongdeng.mp3',  title: '红灯转绿之前',  gain: .0274 },
    // The last four, all of the same loud-mastered class as the rest of this group and all
    // measured the same way: band-limited RMS through the ceiling voicing, then the gain that
    // puts each one on the group's room level. -16.46, -16.38, -16.17 and -16.44 dB.
    { file: 'audio/mall/wuxu.mp3',      title: '无需地图的冒险', gain: .0278 },
    { file: 'audio/mall/velvet.mp3',    title: 'Velvet Afterglow', gain: .0275 },
    { file: 'audio/mall/juejiang.mp3',  title: '倔强的呼吸',    gain: .0268 },
    { file: 'audio/mall/diqi.mp3',      title: '第七街角的风',  gain: .0277 },
    // This one is not slightly quiet, it is 29.7 dB quiet — a master that peaks at -31 dBFS where
    // the other two peak just under 0. At a shared gain it is inaudible under the fountain, which
    // is what "it sounds a little quiet" turns into once the number is measured.
    //
    // A plain gain is the whole fix and it is the right one. The file has ~31 dB of unused
    // headroom, so nothing clips; its crest factor is 14.5 dB against the others' 16, so it is
    // evenly quiet rather than quiet in patches, which is what would have needed compression
    // instead; and mp3 codes its noise relative to the signal, so lifting it does not lift hiss
    // the way winding up a quiet tape does. Through the rig it now peaks within a hair of the
    // other two.
    { file: 'audio/mall/untitled.mp3',  title: '夜色收件人',     gain: .8323 },
    // Quiet in the same way the one above it is, though not by as much: 25.2 dB down rather than
    // 29.7, and with the same headroom to spend. Measured through the rig like the rest — the
    // one thing a gain here must never be is a number copied off a neighbouring track.
    { file: 'audio/mall/untitled2.mp3', title: '橱窗里的雨',     gain: .4917 },
    // 22.6 dB down — quiet like the two above it, and like them measured rather than assumed.
    { file: 'audio/mall/untitled5.mp3', title: '晚风经过中庭',   gain: .3743 },
    // 26.8 dB down. Four of the six masters are quiet and no two by the same amount, which is
    // the argument for a per-track number rather than one lift applied to the folder.
    { file: 'audio/mall/untitled6.mp3', title: '闭店前的星光',   gain: .6035 },
    // Known, measured, and left alone: the four quiet masters above land at -45.7 to -44.8 dB in
    // the room while the five loud ones land at -47.6. That is a 2.2 dB step you can hear at the
    // change of track, and it is not new — it arrived with the original three and every gain since
    // has been matched to its own mastering class rather than to the list as a whole. Closing it
    // means re-measuring all nine against one target through .diag-mallsong.js, which is a
    // deliberate pass and not a thing to do while adding a record.
  ];
  const RETAIL_MUSIC_GAIN=.24;
  let retailRig=null, retailOn=false, songEl=null, songSrc=null, songFailed='', songTurn=0;
  // What to do in the gap at the end of a record. Set by game.js, which owns what gets said
  // and what goes on screen; this file only knows that something might want the silence.
  let trackEndFn=null;
  function onTrackEnd(fn){ trackEndFn=fn; }
  // One media element and one source node for the life of the tab. `createMediaElementSource` can
  // only be called once per element, so the element is reused and only its `src` changes — which
  // is also what makes a playlist cheap: no node is built or thrown away between tracks.
  function ensureSong() {
    if(songSrc||songFailed) return songSrc;
    try {
      songEl=new Audio();
      songEl.preload='auto';
      songEl.addEventListener('error',()=>{
        const t=RETAIL_SONGS[songTurn%RETAIL_SONGS.length];
        songFailed=(t?t.file:'a mall track')+' did not load';
      });
      // On to the next record when one finishes — but the gap between two songs is where a shop
      // puts its advertising, so the end of a track is handed out rather than acted on. Whoever
      // takes it gets a `resume` to call when it has finished talking; nobody taking it means the
      // next song starts immediately, which is what happens everywhere except the mall.
      songEl.addEventListener('ended',trackEnded);
      songSrc=ctx.createMediaElementSource(songEl);
      songSrc.connect(retailRig.inp);
    } catch(e) { songFailed=String(e&&e.message||e); songSrc=null; }
    return songSrc;
  }
  // Cue the current track and set the room to that track's own level. The gain moves with the
  // song rather than being one number for the ceiling, which is the only way three masters of
  // three different loudnesses can share a room without one of them being wrong.
  function playTrack() {
    if(!songEl||!retailRig||!ctx) return;
    const t=RETAIL_SONGS[songTurn%RETAIL_SONGS.length];
    if(!t) return;
    if(songEl.getAttribute('src')!==t.file) { songEl.setAttribute('src',t.file); songEl.load(); }
    const p=songEl.play();
    if(p&&p.catch) p.catch(()=>{});
    if(!retailOn) return;
    retailRig.master.gain.cancelScheduledValues(ctx.currentTime);
    glide(retailRig.master.gain,t.gain,1.4);
  }
  // A record has run out. Advance, then offer the gap to whoever wants it before the next one
  // starts. Split out from the listener so a harness can run the same path without waiting two and
  // a half minutes for a song to finish, which is the only way the advert in the gap gets tested.
  function trackEnded() {
    songTurn++;
    if (trackEndFn) { try { trackEndFn(()=>playTrack()); return; } catch(e) { /* fall through */ } }
    playTrack();
  }
  // On to the next record now — and straight on, with no advert in between. Pressing skip is a
  // person saying they would rather hear the next song, and answering that with a commercial is
  // the behaviour that makes people stop pressing the button.
  function skipTrack() {
    if(!songEl||!retailOn) return null;
    songTurn++; playTrack();
    return RETAIL_SONGS[songTurn%RETAIL_SONGS.length].title;
  }
  function retailMusic(on) {
    if(!on) {
      retailOn=false;
      if(retailRig) glide(retailRig.master.gain,0,.45);
      // Paused, not stopped, and deliberately not rewound. Leaving the mall and coming back an
      // hour later drops you into the middle of whatever is playing, the way it does when you
      // leave a shop and go back in — the record was playing the whole time you were outside.
      if(songEl) setTimeout(()=>{ if(!retailOn&&songEl) songEl.pause(); },500);
      return;
    }
    if(!setup()) return;
    if(!retailRig) retailRig=buildMusic(ctx,output,RETAIL_MUSIC_GAIN);
    if(ctx.state==='suspended') void ctx.resume().catch(()=>{});
    retailOn=true;
    if(!ensureSong()) return;
    playTrack();
  }

  // An announcement in the shopping centre. The same voice as the platform — one loudspeaker
  // reader for the whole game, which is why these lines bake through the `pa|` key like the
  // station's — but its own room, and its own thing to get out of the way of. On a platform that
  // is the station's music programme; here it is the record, and `retailDuck` is already the
  // control for it.
  let mallIn = null, mallNoticeGen = 0, lastMallNotice = '';
  function mallNotice(text, then) {
    const done = () => { if (typeof then === 'function') { try { then(); } catch (_) {} } };
    if (!setup() || !text) { done(); return; }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const baked = typeof Speech !== 'undefined' && Speech.noticeClip
      ? Speech.noticeClip(text) : null;
    if (!baked) {
      lastError = `no clip for "${text}" — run node .dumplines.js && .bake-voices.py`;
      // Nothing to play is not a reason to leave the room silent for ever: whatever was waiting
      // on this announcement gets its turn back straight away.
      done();
      return;
    }
    if (!mallIn) mallIn = publicAddress(ctx, output, 'retail');
    const token = ++mallNoticeGen;
    // Under the announcement for its whole length and a second after. Deeper than the platform's
    // .32, because the thing being ducked here is a record with a vocal on it rather than an
    // instrumental bed, and two voices at once is the one thing the room must not do.
    retailDuck(.22, baked.dur + 1.1);
    const head = ctx.createGain();
    // Level with the record rather than over it. Nothing here is a boarding call: an announcement
    // you have to strain past the music to hear is wrong, and one that flattens the music is worse.
    head.gain.value = .82;
    head.connect(mallIn);
    baked.load().then(buf => {
      if (mallNoticeGen !== token) { try { head.disconnect(); } catch (_) {} return; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      src.start(ctx.currentTime + .02);
      lastMallNotice = text;
      // A beat after the voice, not on top of it — a record starting under the last syllable of an
      // advert is the thing that makes a playlist sound automated.
      src.onended = () => { try { head.disconnect(); } catch (_) {} setTimeout(done, 700); };
    }).catch(err => {
      lastError = 'mall notice clip: ' + (err && (err.message || err));
      try { head.disconnect(); } catch (_) {}
      done();
    });
  }

  function retailDuck(to,seconds) {
    if(!retailRig||!ctx) return;
    const g=retailRig.duck.gain,now=ctx.currentTime,hold=Math.max(.4,seconds);
    if(g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else {g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);}
    g.linearRampToValueAtTime(to,now+.22);
    g.setValueAtTime(to,now+hold);
    g.linearRampToValueAtTime(1,now+hold+1.25);
  }
  // Out of the way. An announcement is the one thing on a platform anybody needs to hear, so the
  // ceiling drops under it and comes back slowly afterwards — which is also the moment a player
  // notices there was music at all.
  function duckMusic(to, seconds) {
    if (!musicRig || !ctx) return;
    const g = musicRig.duck.gain, now = ctx.currentTime, hold = Math.max(.4, seconds);
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); }
    g.linearRampToValueAtTime(to, now + .25);
    g.setValueAtTime(to, now + hold);
    g.linearRampToValueAtTime(1, now + hold + 1.6);
  }

  // ---------------------------------------------------------------- a train in the far tunnel
  // The thing you notice standing on a platform is a train you cannot see. It arrives as a rumble
  // with no direction, swells until it is the only thing in the room, goes past, and leaves the
  // ventilation sounding louder than it did before.
  //
  // Built out of one noise source and a filter whose corner is swept: opening a low-pass from 60
  // to 340 Hz and closing it again is what "coming closer and going away" is, far more than level
  // is. The panner does the rest -- it crosses your head, which is the part that makes people look
  // up. Ten nodes, scheduled in one go, stopping themselves at the end.
  function passing(fromLeft = true) {
    if (!setup()) return 0;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const at = ctx.currentTime + .05, dur = 6.4, mid = at + dur * .52;
    // Not out of the way so much as drowned: a train going through the next tunnel is the loudest
    // thing in the room and the ceiling loses to it whatever this gain says.
    duckMusic(.55, dur * .8);
    const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 2), ctx.sampleRate);
    buf.copyToChannel(seededNoise(buf.length), 0);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass'; body.Q.value = .9;
    body.frequency.setValueAtTime(58, at);
    body.frequency.exponentialRampToValueAtTime(340, mid);
    body.frequency.exponentialRampToValueAtTime(64, at + dur);
    // The rails themselves: a narrow ring up where wheel noise lives, only while it is close.
    const ring = ctx.createBiquadFilter();
    ring.type = 'bandpass'; ring.frequency.value = 1180; ring.Q.value = 2.4;
    const ringG = ctx.createGain();
    ringG.gain.setValueAtTime(0, at);
    ringG.gain.linearRampToValueAtTime(.020, mid);
    ringG.gain.linearRampToValueAtTime(0, at + dur * .86);
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, at);
    level.gain.linearRampToValueAtTime(.16, mid);
    level.gain.linearRampToValueAtTime(0, at + dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      const a = fromLeft ? -.85 : .85;
      pan.pan.setValueAtTime(a, at);
      pan.pan.linearRampToValueAtTime(-a, at + dur);
    }
    src.connect(body); body.connect(level);
    src.connect(ring); ring.connect(ringG); ringG.connect(level);
    if (pan) { level.connect(pan); pan.connect(output); } else level.connect(output);
    src.start(at);
    src.stop(at + dur + .1);
    return dur;
  }

  // ---------------------------------------------------------------- 闸机 the gate line
  // Two sounds, and they are the signature of the room: the flat electronic acknowledgement when
  // the card is read, and the flaps themselves, which are a short pneumatic shove and a stop.
  function gate(kind) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const at = ctx.currentTime + .02;
    if (kind === 'tap') {
      // One clean beep and a softer one under it. A single sine reads as a microwave; the octave
      // below it is what makes it a machine that has just decided something.
      tone(ctx, output, at, 2093, .085, .055);
      tone(ctx, output, at + .01, 1046.5, .070, .030);
      return;
    }
    // The flaps: air, then the leaves running out and hitting their stops.
    filteredNoise(at, .16, 780, .8, .022);
    filteredNoise(at + .13, .05, 2600, 1.6, .012, 'highpass');
    tone(ctx, output, at + .17, 148, .045, .020);
  }

  function ensureMotionBed() {
    if (motionBed || !setup()) return motionBed;
    const seconds = 2, frames = Math.round(ctx.sampleRate * seconds);
    const railBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    railBuffer.copyToChannel(seededNoise(frames), 0);

    // Two close wheel impacts, then the same pair from the following bogie. Filtering this short
    // recorded-style impulse train gives a gentle ka-dunk without a metronomic electronic click.
    const jointBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const joints = jointBuffer.getChannelData(0), grit = seededNoise(frames);
    for (const hit of [.04, .13, 1.04, 1.13]) {
      const first = Math.floor(hit * ctx.sampleRate);
      const length = Math.floor(.105 * ctx.sampleRate);
      for (let j = 0; j < length && first + j < frames; j++) {
        const t = j / ctx.sampleRate, decay = Math.exp(-t * 42);
        joints[first + j] += decay *
          (.54 * Math.sin(2 * Math.PI * 118 * t) + .20 * grit[first + j]);
      }
    }

    const rail = ctx.createBufferSource(), jointsSource = ctx.createBufferSource();
    rail.buffer = railBuffer; rail.loop = true;
    jointsSource.buffer = jointBuffer; jointsSource.loop = true;

    const rumbleFilter = ctx.createBiquadFilter(), hissFilter = ctx.createBiquadFilter();
    const jointFilter = ctx.createBiquadFilter(), squealFilter = ctx.createBiquadFilter();
    const rumbleGain = ctx.createGain(), hissGain = ctx.createGain(), jointGain = ctx.createGain();
    const squealGain = ctx.createGain();
    rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 175; rumbleFilter.Q.value = .72;
    hissFilter.type = 'bandpass'; hissFilter.frequency.value = 920; hissFilter.Q.value = .48;
    jointFilter.type = 'bandpass'; jointFilter.frequency.value = 185; jointFilter.Q.value = .85;
    squealFilter.type = 'bandpass'; squealFilter.frequency.value = 1720; squealFilter.Q.value = 2.8;
    rumbleGain.gain.value = 0; hissGain.gain.value = 0; jointGain.gain.value = 0;
    squealGain.gain.value = 0;

    rail.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(output);
    rail.connect(hissFilter); hissFilter.connect(hissGain); hissGain.connect(output);
    rail.connect(squealFilter); squealFilter.connect(squealGain); squealGain.connect(output);
    jointsSource.connect(jointFilter); jointFilter.connect(jointGain); jointGain.connect(output);
    rail.start(); jointsSource.start();
    motionBed = { rail, jointsSource, rumbleGain, hissGain, jointGain, squealGain };
    return motionBed;
  }

  function glide(param, value, seconds) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, seconds);
  }

  // `speed` is the same 0..1 curve that drives the visual sway. At zero the bed eases completely
  // away, so the arrival chime and station name are clean and the platform dwell stays peaceful.
  function setMotion(speed) {
    const previous = motionSpeed;
    motionSpeed = Math.max(0, Math.min(1, Number(speed) || 0));
    if (!setup()) return;
    if (!motionBed && motionSpeed <= .001) return;
    const bed = ensureMotionBed(), fade = motionSpeed > 0 ? .12 : .18;
    const shaped = Math.pow(motionSpeed, .78);
    glide(bed.rumbleGain.gain, .115 * shaped, fade);
    glide(bed.hissGain.gain, .030 * motionSpeed, fade);
    glide(bed.jointGain.gain, .095 * shaped, fade);
    // A restrained flange note emerges only while the speed curve is falling. It disappears at
    // the platform, leaving the arrival bell and voice in a clean soundstage.
    const braking = previous > motionSpeed + .002 && motionSpeed > .035
      ? Math.sin(Math.PI * Math.min(.96, motionSpeed)) : 0;
    glide(bed.squealGain.gain, .018 * Math.max(0, braking), .08);
    glide(bed.rail.playbackRate, .82 + .20 * motionSpeed, .15);
    glide(bed.jointsSource.playbackRate, .68 + 1.02 * motionSpeed, .15);
  }

  // The announcement, said rather than played. It used to be one of twelve WAVs rendered ahead of
  // time, which meant a new station on the line needed two more files and could not be announced
  // at all until somebody made them. The name now goes through the synthesiser, so the line can
  // grow without anybody going near the audio folder.
  //
  // The name, and nothing else. It used to read two full sentences -- where the train was going
  // and which side to get off -- and both of those are already on screen, in Chinese and in
  // English, put there by the subtitle the game shows at the same moment. Saying them as well left
  // nineteen syllables of reverberant Mandarin over the top of the one thing worth listening for.
  // The station name on its own is also what a horn in a concourse is actually good at: two or
  // three syllables, said once, with the room left to ring afterwards.
  function lines(station) {
    return [String(station)];
  }
  function arrive(station) {
    if (!setup() || !station) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const token = ++generation;
    if (activeVoice) { try { activeVoice.stop(); } catch (_) {} activeVoice = null; }
    lastError = '';
    const at = ctx.currentTime + .035;
    chime(ctx, paIn, at);
    // The ceiling gets out of the way: bell, name, and the room ringing afterwards.
    duckMusic(.26, 3.4);
    // The name comes off a clip read by Kokoro at build time, played through this same horn and
    // this same concourse. The room stays here rather than being printed into the file, which is
    // what lets one recording sound like it is being played into whatever space it is played into.
    //
    // There is no second way of saying it. The procedural synthesiser used to cover a station with
    // no clip, and it has been taken out: a robotic announcement is worse than a quiet platform,
    // and a station with no clip means the bake has not been run since somebody extended the line.
    const baked = typeof Speech !== 'undefined' && Speech.stationClip
      ? Speech.stationClip(station) : null;
    if (!baked) {
      lastError = `no clip for ${station} — run node .dumplines.js && .bake-voices.py`;
      lastSaid = [];
      return;
    }
    lastSaid = [{ text: String(station), dur: baked.dur, at: .84 }];
    activeVoice = { stop() {}, token };
    const head = ctx.createGain();
    head.gain.value = 1;
    head.connect(paIn);
    baked.load().then(buf => {
      if (generation !== token) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      // The second bell has nearly settled at .84 s, and that pause is part of the platform's own
      // timing: the room is still ringing when the first syllable lands in the tail of it.
      src.start(Math.max(ctx.currentTime, at + .84));
    }).catch(err => {
      lastError = 'station clip: ' + (err && (err.message || err));
      try { head.disconnect(); } catch (_) {}
    });
    setTimeout(() => {
      if (activeVoice && activeVoice.token === token) activeVoice = null;
    }, Math.max(200, (baked.dur + 1.6) * 1000));
  }

  // ---------------------------------------------------------------- 广播 the rest of the PA
  // A line off the loudspeaker that is not a station name: the countdown to the next train. Same
  // horn, same concourse, and deliberately no bell. The two-note 叮咚 means "this is your station,
  // listen" — putting it in front of a countdown that comes round every eight seconds would make
  // the platform unbearable and would spend the one attention-getting sound the room has on the
  // one announcement that does not need it.
  //
  // Separate from `arrive` rather than folded into it: `arrive` owns `lastSaid`, which is what the
  // speech harnesses read to prove the arrival announcement happened, and a countdown running over
  // the top of it would keep overwriting the thing they are looking at.
  let lastNotice = '', noticeGen = 0;
  function notice(text) {
    if (!setup() || !text) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const baked = typeof Speech !== 'undefined' && Speech.noticeClip
      ? Speech.noticeClip(text) : null;
    if (!baked) {
      lastError = `no clip for "${text}" — run node .dumplines.js && .bake-voices.py`;
      return;
    }
    const token = ++noticeGen;
    duckMusic(.32, baked.dur + .9);
    const head = ctx.createGain();
    // Under a station name. A countdown is background information and the room is already carrying
    // an ambience bed, a chase along the platform edge and, half the time, a train going past.
    head.gain.value = .72;
    head.connect(paIn);
    baked.load().then(buf => {
      if (noticeGen !== token) { try { head.disconnect(); } catch (_) {} return; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      src.start(ctx.currentTime + .02);
      lastNotice = text;
      src.onended = () => { try { head.disconnect(); } catch (_) {} };
    }).catch(err => {
      lastError = 'notice clip: ' + (err && (err.message || err));
      try { head.disconnect(); } catch (_) {}
    });
  }

  // ---------------------------------------------------------------- 机场广播 the terminal
  // A flight call, out of the ceiling of the departures hall. Everything about this is the airport's
  // and not the platform's: its own room (see PA_ROOMS), its own rising tone, and its own voice —
  // a second announcer baked under the `apa|` key space, so the two buildings are never read by the
  // same person. Standing in one and hearing the other is the specific thing this avoids.
  //
  // The room is built the first time somebody is in the terminal when it speaks, and not before: a
  // 3.4-second stereo impulse response is a quarter of a megabyte of samples and most sessions
  // never go to the airport at all. Once built it is kept, so an announcement costs a handful of
  // nodes that stop by themselves — the property .pacheck.js counts.
  let airIn = null, airGen = 0, lastAir = '';
  // The room only has one loudspeaker, so the room can only say one thing at a time. The scheduler
  // works in game-minutes (one per real second at the default clock) and a flight call lasts eight
  // to ten real seconds, so without this lock a new call lands on top of the one before it while
  // that one is barely a third of the way through — the noise the terminal used to make.
  //
  // `airBusyPri` is the priority of whatever is sounding now: 'hi' for a flight call (the only thing
  // anybody here is listening for) and 'lo' for a hall filler. A held flight call sits in `airQueued`
  // because two flights can legitimately want the room inside the same minute, and the right answer
  // is "the second one waits", not "the second one talks over the first". A filler never queues: it
  // is the lowest thing in the room and losing it costs nothing.
  const AIR_VOICE_LEAD = 1.16, AIR_TAIL = 1.5;
  let airBusyUntil = -1, airBusyPri = null, airHead = null, airToken = 0;
  let airQueued = null;
  function airHush() {
    // The nodes are already scheduled on the AudioContext timeline, so they cannot be yanked — the
    // one gain everything passes through is faded instead, the same way speech.js `hush()` does it.
    if (!airHead) return;
    try { airHead.gain.cancelScheduledValues(ctx.currentTime); } catch (_) {}
    try { airHead.gain.setTargetAtTime(0, ctx.currentTime, .05); } catch (_) {}
    airHead = null;
  }
  function airNotice(text, pri) {
    if (!setup() || !text) return;
    const now = ctx.currentTime;
    const busy = now < airBusyUntil;
    // A filler that arrives while the room is still talking is dropped, not played. A boarding call
    // is the reason the loudspeaker exists; a reminder about luggage is not worth talking over it.
    if (busy && pri === 'lo') return;
    // A flight call always wins the room. If a filler is sounding it is hushed, and if another flight
    // call is still going it is cut — briefly overlapping two calls is worse than the design goal, but
    // deferring a final-boarding call by ten seconds while the check-in announcement finishes is worse
    // still, and the one thing the loudspeaker must never do is say "final boarding" late.
    if (busy && airHead) airHush();
    airQueued = null;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const baked = typeof Speech !== 'undefined' && Speech.airClip ? Speech.airClip(text) : null;
    if (!baked) {
      lastError = `no clip for "${text}" — run node .dumplines.js && .bake-voices.py`;
      return;
    }
    if (!airIn) airIn = publicAddress(ctx, output, 'terminal');
    const token = ++airGen;
    const at = ctx.currentTime + .035;
    airChime(ctx, airIn, at);
    // Nothing plays music in the terminal today, but the ceiling is a shared bus and a flight call
    // outranks anything that ever ends up on it.
    duckMusic(.30, baked.dur + 2.0);
    const head = ctx.createGain();
    // Level with a station name rather than under one. A boarding call is the only reason anybody
    // in this room is listening, where the platform's countdown is background to an arrival.
    head.gain.value = .95;
    head.connect(airIn);
    airHead = head; airToken = token; airBusyPri = pri || 'hi';
    // The room is busy for the whole of the voice plus its lead-in and the tail it rings out into.
    // Real seconds, read off the clip the way the scheduler cannot, so this stays right at any clock.
    airBusyUntil = at + AIR_VOICE_LEAD + baked.dur + AIR_TAIL;
    baked.load().then(buf => {
      if (airGen !== token) { try { head.disconnect(); } catch (_) {} return; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      // Behind the third note, which is still ringing. The metro waits .84 s behind two falling
      // notes; this tone is longer, so the words come in at 1.16 and land in the tail of it.
      src.start(Math.max(ctx.currentTime, at + AIR_VOICE_LEAD));
      lastAir = text;
      src.onended = () => {
        try { head.disconnect(); } catch (_) {}
        if (airToken === token) { airHead = null; airBusyUntil = -1; airBusyPri = null; }
        drainAir();
      };
    }).catch(err => {
      lastError = 'air clip: ' + (err && (err.message || err));
      try { head.disconnect(); } catch (_) {}
      if (airToken === token) { airHead = null; airBusyUntil = -1; airBusyPri = null; }
      drainAir();
    });
  }
  // The one call the room held back. Plays the moment the current one's tail has rung out, which is
  // the closest a single loudspeaker can get to saying two things back to back.
  function drainAir() {
    if (airQueued) { const q = airQueued; airQueued = null; airNotice(q.text, q.pri); }
  }

  // ---------------------------------------------------------------- 客舱 inside the aeroplane
  // Two things, and they are the whole soundtrack of a flight: the noise, and the captain.
  //
  // The noise is not an engine sound. What a cabin actually sounds like from row 23 is almost
  // entirely air — a broad hiss off the fuselage and the packs, with a low beating rumble under it —
  // and the turbines themselves are a narrow whine you only really hear on the ground and at full
  // thrust. So it is built as three things: pink-ish noise through a low-pass for the air, a second
  // narrower band for the rumble, and one swept oscillator pair for the spool. `level` runs 0 to 1
  // and the cabin hands it over every frame, so the sound follows the aeroplane rather than a timer.
  let cabinBed = null;
  function cabinNoise(on) {
    if (!on) {
      if (cabinBed) { glide(cabinBed.master.gain, 0, .8); }
      // Leaving the aeroplane ends the briefing: anything still queued behind the handset is
      // dropped rather than read out over the next room, and the queue's clock is cleared so the
      // next flight's first line is not held back by the last flight's last one.
      capGen++; capUntil = 0;
      return;
    }
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    if (!cabinBed) {
      const master = ctx.createGain(); master.gain.value = 0;
      master.connect(output);
      // Everything in the bed goes through this, and this is what gets out of the way when the
      // flight deck keys up. Without it the briefing was inaudible: the bed and the captain share
      // one AudioContext and one output compressor, the bed is loud and unbroken, so the compressor
      // sat permanently pulled down and the voice arrived underneath it. On a real aeroplane the PA
      // is simply louder than the cabin; here the cabin has to duck, the same way the platform
      // ceiling ducks under a station announcement.
      const duck = ctx.createGain(); duck.gain.value = 1;
      duck.connect(master);
      const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 3), ctx.sampleRate);
      buf.copyToChannel(seededNoise(buf.length), 0);
      // ---- the air: wide, soft, and the loudest thing in here
      const air = ctx.createBufferSource(); air.buffer = buf; air.loop = true;
      const airLp = ctx.createBiquadFilter();
      airLp.type = 'lowpass'; airLp.frequency.value = 900; airLp.Q.value = .6;
      const airG = ctx.createGain(); airG.gain.value = .16;
      air.connect(airLp); airLp.connect(airG); airG.connect(duck);
      // ---- the rumble: a narrow band down where the structure is working
      const low = ctx.createBufferSource(); low.buffer = buf; low.loop = true;
      const lowBp = ctx.createBiquadFilter();
      lowBp.type = 'lowpass'; lowBp.frequency.value = 130; lowBp.Q.value = 1.1;
      const lowG = ctx.createGain(); lowG.gain.value = .40;
      low.connect(lowBp); lowBp.connect(lowG); lowG.connect(duck);
      // ---- the spool: two detuned saws, filtered hard, that only come up under thrust. Detuned
      // rather than one, because a single oscillator is a test tone and two of them beat.
      const whine = ctx.createGain(); whine.gain.value = 0;
      const whineLp = ctx.createBiquadFilter();
      whineLp.type = 'lowpass'; whineLp.frequency.value = 2400; whineLp.Q.value = .7;
      whine.connect(whineLp); whineLp.connect(duck);
      const oscs = [];
      for (const d of [0, 6.5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 240 + d;
        const g = ctx.createGain(); g.gain.value = .015;
        o.connect(g); g.connect(whine);
        o.start();
        oscs.push(o);
      }
      air.start(); low.start();
      cabinBed = { master, duck, airLp, airG, lowG, whine, oscs };
    }
    glide(cabinBed.master.gain, 1, 1.2);
  }
  // How hard it is working, 0 to 1. Everything about the bed is a function of this one number.
  function cabinLevel(k) {
    if (!cabinBed || !ctx) return;
    const v = Math.max(0, Math.min(1, k || 0));
    const now = ctx.currentTime, T = .30;
    // On the ground it is nearly silent; at full thrust the air is four times louder and brighter.
    //
    // These are all about half what they were. A cabin at climb power is loud in life, and the first
    // set of numbers were faithful to that and wrong for a game: at a rumble gain of .56 the bed was
    // the loudest thing in the mix by a long way, it never stopped, and everything else in the
    // aeroplane — the captain, the crew, the belt chime — arrived underneath it. What a player needs
    // is enough noise to know the engines are working and not so much that the room is unusable.
    cabinBed.airG.gain.setTargetAtTime(.035 + v * .105, now, T);
    cabinBed.airLp.frequency.setTargetAtTime(500 + v * 1500, now, T);
    cabinBed.lowG.gain.setTargetAtTime(.06 + v * .24, now, T);
    // The whine is the part that says "these engines are at take-off power", so it is deliberately
    // not linear: nothing much until about half thrust, then it arrives.
    const w = Math.max(0, (v - .45) / .55);
    cabinBed.whine.gain.setTargetAtTime(w * w * .28, now, T);
    for (const o of cabinBed.oscs)
      o.frequency.setTargetAtTime(200 + v * 220, now, T * 2);
  }
  // ---- the things an aeroplane does that are not the engines and not a voice.
  //
  // Four mechanical noises, and between them they carry most of the story of a flight: the gear
  // coming up, the flaps running out, the wheels hitting the runway and the reversers opening. Each
  // one is a short shaped burst of filtered noise rather than a sample, for the same reasons
  // everything else in this file is synthesised — nothing to download and nothing to loop.
  function cabinCue(kind) {
    if (!setup()) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const at = ctx.currentTime + .02;
    // A note on the size of these numbers, because they look wrong and are not. `filteredNoise`
    // takes its level as the peak of an envelope applied *before* the filter, and a thump is a
    // narrow lowpass — 150 Hz on white noise keeps well under a hundredth of its power. So a level
    // of .22 arrives on the bus as about .010, which measured against an engine bed idling at .007
    // is a gear that technically makes a sound and audibly does not. These were raised once already
    // on the same reasoning and not far enough; the numbers below are the ones that measure right
    // rather than the ones that read right. `.diag-cabin.js` now checks each cue against the bed it
    // has to be heard over, which is the measurement that was missing.
    if (kind === 'gear') {
      // Two clunks and a whirr: the doors, the legs folding, the doors again.
      duckCabin(.62, 2.6);
      filteredNoise(at, .18, 150, 1.2, 3.10, 'lowpass');
      filteredNoise(at + .16, 1.30, 320, .8, 1.20);
      filteredNoise(at + 1.52, .22, 120, 1.3, 3.35, 'lowpass');
    } else if (kind === 'flap') {
      // A long, quiet electric run with a soft stop at the end of it. Quiet relative to the gear,
      // which is the point of it — but not quieter than the aeroplane.
      // Ten times the original, and no more. A 620 Hz bandpass turns out to pass rather more than
      // the gear's 150 Hz lowpass, not less: at 4.40 this measured 0.92 on the bus, loud enough to
      // pull the output compressor down and take the captain with it.
      filteredNoise(at, 2.10, 620, 1.6, .60);
      filteredNoise(at + 2.10, .16, 240, 1.1, .95, 'lowpass');
    } else if (kind === 'touchdown') {
      // The wheels, then the rumble of a runway under them, then the reversers.
      duckCabin(1, .1);
      // Louder than the gear, because the wheels hitting the runway is the biggest single mechanical
      // event of the flight and it read as the smaller of the two.
      filteredNoise(at, .13, 110, 1.4, 2.15, 'lowpass');
      filteredNoise(at + .10, .30, 260, .9, 1.15, 'lowpass');
      filteredNoise(at + .26, 3.60, 420, .5, .95);
      for (const o of [.34, .52]) filteredNoise(at + o, .10, 900, 2.0, .36);
    } else if (kind === 'pushback') {
      // Towbar tension and the low hydraulic judder through the nose gear.
      filteredNoise(at, 1.8, 92, .8, 1.35, 'lowpass');
      filteredNoise(at + .12, .24, 310, 1.2, .50);
    } else if (kind === 'spool') {
      // The sudden wall of air as take-off thrust stabilises.
      duckCabin(1, .1);
      filteredNoise(at, 3.2, 760, .55, .44);
      filteredNoise(at + .25, 2.8, 145, .7, 1.55, 'lowpass');
    } else if (kind === 'runway') {
      // Nose-wheel seams, accelerating into a continuous runway rumble.
      for (let i = 0; i < 9; i++)
        filteredNoise(at + i * (.28 - i * .014), .075, 120, 1.2, 1.05, 'lowpass');
    } else if (kind === 'reverse') {
      filteredNoise(at, 3.4, 520, .55, .90);
      filteredNoise(at, 2.6, 105, .8, 1.70, 'lowpass');
    } else if (kind === 'brake') {
      filteredNoise(at, .55, 1150, 2.1, .25);
      filteredNoise(at + .40, .18, 105, 1.2, 1.25, 'lowpass');
    } else if (kind === 'door') {
      filteredNoise(at, .45, 680, .9, .32);
      filteredNoise(at + .36, .18, 125, 1.2, 1.15, 'lowpass');
    } else if (kind === 'tray' || kind === 'bag') {
      filteredNoise(at, .12, kind === 'bag' ? 180 : 420, 1.1,
        kind === 'bag' ? 1.25 : .58, 'lowpass');
      filteredNoise(at + .10, .09, 1100, 1.7, .22);
    } else if (kind === 'reading' || kind === 'screen') {
      tone(ctx, output, at, kind === 'screen' ? 720 : 980, .12, .045);
    } else if (kind === 'charging') {
      tone(ctx, output, at, 760, .08, .035);
      tone(ctx, output, at + .10, 1040, .12, .030);
    } else if (kind === 'shade' || kind === 'recline') {
      filteredNoise(at, .48, kind === 'shade' ? 920 : 260, 1.2,
        kind === 'shade' ? .16 : .48, kind === 'shade' ? 'highpass' : 'lowpass');
      filteredNoise(at + .42, .08, 700, 1.8, .16);
    } else if (kind === 'air') {
      filteredNoise(at, .65, 1600, .7, .14, 'highpass');
    } else if (kind === 'ding') {
      cabinChime();
    }
  }

  // The engines, out of the way. Same shape as duckMusic: down quickly, held for as long as the line
  // lasts, and back up slowly afterwards — the slow return is what makes a player notice the noise
  // again once the announcement has finished, which is most of the effect.
  function duckCabin(to, seconds) {
    if (!cabinBed || !ctx) return;
    const g = cabinBed.duck.gain, now = ctx.currentTime, hold = Math.max(.4, seconds);
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); }
    g.linearRampToValueAtTime(to, now + .22);
    g.setValueAtTime(to, now + hold);
    g.linearRampToValueAtTime(1, now + hold + 1.5);
  }

  // The two-note cabin chime, for the seatbelt sign. Higher and softer than the platform's, and it
  // goes through the intercom because that is the speaker it comes out of.
  function cabinChime() {
    if (!setup()) return;
    if (!cabinIn) cabinIn = publicAddress(ctx, output, 'intercom');
    const at = ctx.currentTime + .02;
    // A short dip for the chime as well. It is two soft notes and it is the cue that the belt sign
    // has changed, so it has to be heard rather than merely present.
    duckCabin(.55, 1.1);
    tone(ctx, cabinIn, at, 1046.50, .38, .13);
    tone(ctx, cabinIn, at + .21, 1318.51, .52, .12);
  }
  // The captain, on the intercom. His own key space and his own voice — see .bake-voices.py.
  // `capUntil` is the context time the announcement currently in the air stops. A public-address
  // system is one loudspeaker and one man holding one handset: two announcements cannot physically
  // be in the air together, so a line arriving early waits behind the one still being read instead
  // of being mixed on top of it. The script is timed so that this almost never has to engage — but
  // "almost never" is not the same as "cannot", and being mixed on top of itself is precisely what
  // the captain sounded like before.
  //
  // `capGen` is a generation, bumped when the cabin is left and not once per line. It used to be
  // bumped per call, which meant a second line arriving while the first was still being fetched
  // silently threw the first away — the same bug wearing the opposite mask.
  let cabinIn = null, capGen = 0, lastCap = '', capUntil = 0;
  function captain(text) {
    if (!setup() || !text) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const baked = typeof Speech !== 'undefined' && Speech.captainClip
      ? Speech.captainClip(text) : null;
    if (!baked) {
      lastError = `no clip for "${text}" — run node .dumplines.js && .bake-voices.py`;
      return;
    }
    if (!cabinIn) cabinIn = publicAddress(ctx, output, 'intercom');
    const token = capGen;
    // Behind whatever is still being read, never on top of it. .45s of air between announcements,
    // which is about the pause a real one leaves before keying up again.
    const now = ctx.currentTime;
    const at = Math.max(now + .02, capUntil + .45);
    capUntil = at + .42 + baked.dur;
    // The engines drop for as long as he is talking, and for a moment either side of it — measured
    // from now rather than from the start of the clip, so a line that is queued does not un-duck
    // in the gap and then duck again.
    duckCabin(.34, (at - now) + baked.dur + 1.4);
    // One soft note in front of him, not the two-note chime: on a real aeroplane the PA keys up
    // with a click and a bing, and the belt sign owns the double chime.
    tone(ctx, cabinIn, at, 880, .30, .085);
    const head = ctx.createGain();
    // Over the engines, which is the point of an intercom.
    head.gain.value = 1.35;
    head.connect(cabinIn);
    baked.load().then(buf => {
      if (capGen !== token) { try { head.disconnect(); } catch (_) {} return; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(head);
      src.start(Math.max(ctx.currentTime, at + .42));
      lastCap = text;
      src.onended = () => { try { head.disconnect(); } catch (_) {} };
    }).catch(err => {
      lastError = 'captain clip: ' + (err && (err.message || err));
      try { head.disconnect(); } catch (_) {}
    });
  }

  function pause(on) {
    if (!ctx) return;
    if (on && ctx.state === 'running') void ctx.suspend().catch(() => {});
    if (!on && ctx.state === 'suspended') void ctx.resume().catch(() => {});
    // Suspending the context is the whole of it now. The announcement is scheduled oscillators, so
    // it freezes and thaws with the clock the same way the motion bed does, and there is no media
    // element left that needs pausing separately.
  }

  function stopMotion() {
    motionSpeed = 0;
    if (motionBed) {
      try { motionBed.rail.stop(); } catch (_) {}
      try { motionBed.jointsSource.stop(); } catch (_) {}
      motionBed = null;
    }
  }

  function stop() {
    generation++;
    if (activeVoice) { try { activeVoice.stop(); } catch (_) {} activeVoice = null; }
    // Clear the terminal's loudspeaker too: leaving the airport should not leave a phantom busy
    // lock or a queued call that plays into the next room the PA happens to share a bus with.
    airHush(); airQueued = null; airBusyUntil = -1; airBusyPri = null; airGen++;
    stopMotion();
  }

  // Kept read-only for the project's browser harness: it can prove the announcement was scheduled,
  // and what words it was going to say, without reaching into the audio graph or changing it.
  function status() {
    return { supported: !!AudioCtor, context: ctx ? ctx.state : 'new',
             pa: !!paIn, active: !!activeVoice, voiceMode: activeVoice ? 'synth' : 'none',
             said: lastSaid.map(s => s.text), dur: lastSaid.reduce((t, s) => t + s.dur, 0),
             motion: motionSpeed, motionActive: !!motionBed && motionSpeed > .001,
             notice: lastNotice, air: lastAir, airRoom: !!airIn,
             captain: lastCap, cabinRoom: !!cabinIn,
             cabinBed: !!cabinBed && +cabinBed.master.gain.value.toFixed(3),
             dinerBed: !!dinerBed && +dinerBed.master.gain.value.toFixed(3),
             // How far the engines are currently ducked. 1 is full noise, lower means somebody is
             // talking over the top of it — the one number that says whether the balance is working.
             cabinDuck: cabinBed ? +cabinBed.duck.gain.value.toFixed(3) : 1,
             music: musicPiece ? musicPiece.kind : (musicOn ? 'gap' : 'off'),
             musicBar: musicPiece ? musicPiece.bar : 0,
             musicGain: musicRig ? +musicRig.master.gain.value.toFixed(4) : 0,
             mallBed: !!mallBed && +mallBed.master.gain.value.toFixed(3),
             // The mall plays a record, so what there is to report is the transport rather than a
             // bar number: whether it is running, and how far into the song it has got.
             mallMusic: songFailed ? 'error' : (retailOn ? (songEl && !songEl.paused ? 'song' : 'starting') : 'off'),
             mallTrack: RETAIL_SONGS[songTurn % RETAIL_SONGS.length].title,
             mallTrackNo: songTurn % RETAIL_SONGS.length,
             mallMusicAt: songEl ? +songEl.currentTime.toFixed(1) : 0,
             mallMusicGain: retailRig ? +retailRig.master.gain.value.toFixed(4) : 0,
             mallMusicError: songFailed || '',
             mallNotice: lastMallNotice,
             mallDuck: retailRig ? +retailRig.duck.gain.value.toFixed(3) : 1,
             duck: musicRig ? +musicRig.duck.gain.value.toFixed(3) : 1,
             error: lastError };
  }

  // The same announcement, rendered off the clock. It exists so the harness can measure the room —
  // an echo is a claim about what happens after the words stop, and the only way to check it is to
  // look there — and it doubles as a way to bake an announcement to a file if anyone wants one.
  // `kind` picks which half of the loudspeaker's part is being rendered: a station name, which
  // arrives behind the two-note bell, or one of the countdown notices, which has no bell and sits
  // under the names. Both go through a fresh copy of the same horn and the same concourse, and the
  // graph here mirrors the live one gain for gain — a harness measuring a louder or drier version
  // of the announcement than the platform plays is measuring nothing.
  async function render(station, sampleRate = 32000, kind = 'station') {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off || typeof Speech === 'undefined') return null;
    const isAir = kind === 'air';
    const isNotice = kind === 'notice';
    // The announcement as it is actually played: the baked reading of the name, decoded here and
    // run through a fresh copy of the horn and the concourse. Measuring anything else would be
    // measuring something the platform never plays. `air` is the terminal's half of that — the
    // other announcer, the other tone and the other room — and it has to be renderable for the
    // same reason the platform's is: an echo is a claim about what happens after the words stop.
    const clip = isAir ? Speech.airClip(station)
      : isNotice ? Speech.noticeClip(station) : Speech.stationClip(station);
    if (!clip) return null;
    const name = await clip.load();
    const at = isAir ? 1.16 : isNotice ? .05 : .84;
    let ends = at + name.duration + .34;
    // Three seconds past the last word, which is longer than the tail, so whatever is measured in
    // there is the room and not the edge of the buffer.
    const total = ends + 3.0;
    const c = new Off(2, Math.ceil(total * sampleRate), sampleRate);
    const out = c.createGain();
    out.gain.value = .78;
    out.connect(c.destination);
    const pa = publicAddress(c, out, isAir ? 'terminal' : 'concourse');
    if (isAir) airChime(c, pa, .035);
    else if (!isNotice) chime(c, pa, .035);
    // Where the words are in the buffer. The clip is one utterance rather than a list of planned
    // syllables, so this is the whole name at once — enough for the checks that ask whether the
    // room is still sounding after the words have stopped, which is what it is here for.
    const src = c.createBufferSource();
    src.buffer = name;
    const g = c.createGain();
    g.gain.value = isAir ? .95 : isNotice ? .72 : 1;   // the same trim the live path uses
    src.connect(g);
    g.connect(pa);
    src.start(at);
    const spoken = [{ hz: String(station), py: '', tone: 0, say: 0,
                      from: at, to: at + name.duration }];
    const buffer = await c.startRendering();
    return { buffer, speechEnds: at + name.duration, total, spoken, room: isAir ? 'terminal' : 'concourse',
             said: isNotice || isAir ? [String(station)] : lines(station),
             durs: [+name.duration.toFixed(2)] };
  }

  // A piece off the clock, so what the ceiling plays can be measured — and so anybody can bounce
  // one to a file and listen to it, which is the only test for music that really counts. The same
  // rig, the same speakers, the same wash and the same trim: a harness measuring a louder or drier
  // version of the music than the platform plays is measuring nothing.
  //
  // One deliberate difference. Live, a programme fades in over a second or so; here the trim is set
  // flat, because what is being measured is the steady level of the piece and not the shape of its
  // entrance.
  async function renderMusic(kind, seconds = 24, sampleRate = 32000) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off || !PIECES[kind]) return null;
    const c = new Off(2, Math.ceil((seconds + 8) * sampleRate), sampleRate);
    const out = c.createGain();
    out.gain.value = .78;                          // the live output stage
    out.connect(c.destination);
    const rig = buildMusic(c, out, MUSIC_GAIN);
    const turn = Math.max(0, MUSIC_ORDER.indexOf(kind));
    // Half a second in, because the chorale starts its chords before the bar they belong to and an
    // oscillator cannot be started before the beginning of the buffer.
    const st = startPiece(rig, kind, 0x9e3779b9 ^ (turn * 2654435761), .5);
    const trim = MUSIC_GAIN * st.piece.trim;
    rig.master.gain.value = trim;
    st.ends = .5 + seconds;
    fillPiece(st, .5 + seconds);
    return { buffer: await c.startRendering(), kind, bars: st.bar, seconds,
             from: .5, gain: +trim.toFixed(4), tempo: st.piece.tempo,
             beat: +st.beat.toFixed(4), bar: +(st.beat * st.piece.beats).toFixed(3) };
  }

  // A track through the mall's rig, offline, so the three of them can be levelled against each
  // other and against the room instead of guessed at. Rendered at unity master, because level is linear in that gain
  // and one render then answers for every candidate value of `RETAIL_SONG_GAIN`.
  //
  // A window out of the middle rather than the top: the first seconds of a record are an intro and
  // quieter than the thing itself, and it is the loud middle that has to sit under the crowd.
  async function renderSong(seconds = 24, from = 60, sampleRate = 32000, file = null) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off) return null;
    const track = file ? RETAIL_SONGS.find(t => t.file === file) || { file, title: file, gain: 1 }
                       : RETAIL_SONGS[0];
    const bytes = await (await fetch(track.file)).arrayBuffer();
    const tmp = new Off(2, 32, sampleRate);
    const whole = await tmp.decodeAudioData(bytes);
    const start = Math.min(from, Math.max(0, whole.duration - seconds));
    const c = new Off(2, Math.ceil((seconds + 4) * sampleRate), sampleRate);
    const out = c.createGain();
    out.gain.value = .78;                          // the live output stage
    out.connect(c.destination);
    const rig = buildMusic(c, out, RETAIL_MUSIC_GAIN);
    rig.master.gain.value = 1;
    const src = c.createBufferSource();
    src.buffer = whole; src.connect(rig.inp); src.start(0, start, seconds);
    return { buffer: await c.startRendering(), seconds, from: start, file: track.file,
             title: track.title, setGain: track.gain,
             duration: +whole.duration.toFixed(1), gain: 1 };
  }

  // The crowd bed on its own, offline, so the record can be balanced against the room instead of
  // against a memory of the room. Rendered at whatever trim is asked for; pass 1 to hear what the
  // mall sounded like before the song arrived.
  async function renderMallBed(seconds = 20, trim = BED_TRIM, sampleRate = 32000) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off) return null;
    const c = new Off(2, Math.ceil((seconds + 2) * sampleRate), sampleRate);
    const out = c.createGain();
    out.gain.value = .78;                          // the live output stage
    out.connect(c.destination);
    const bed = buildMallBed(c, out, trim);
    bed.master.gain.value = 1;                     // the live bed sits at 1 once it has faded in
    return { buffer: await c.startRendering(), seconds, trim };
  }

  // The room on its own: one sample of click through the whole loudspeaker-and-concourse chain.
  // Asking what the reverberation is by measuring an announcement means reading the room through
  // whatever the voice happened to be doing; a click asks the room directly.
  async function impulse(sampleRate = 32000, seconds = 9) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Off) return null;
    const c = new Off(2, Math.ceil(seconds * sampleRate), sampleRate);
    const out = c.createGain();
    out.gain.value = .78;
    out.connect(c.destination);
    const pa = publicAddress(c, out);
    const buf = c.createBuffer(1, 1, sampleRate);
    buf.getChannelData(0)[0] = 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(pa);
    src.start(0);
    return c.startRendering();
  }

  return { unlock, arrive, notice, airNotice, doors, setMotion, stopMotion, pause, stop, status,
           hutong, hutongMix,
           platform, terminal, diner, dinerCue, mall, mallCue, liftCue, liftTravel, passing, gate, render, impulse, lines,
           music, duckMusic, renderMusic, renderSong, renderMallBed, mallNotice,
           MUSIC_ORDER, PA_ROOMS, RETAIL_SONGS, skipTrack, onTrackEnd, trackEnded,
           cabinNoise, cabinLevel, cabinChime, cabinCue, duckCabin, captain, level };
})();
