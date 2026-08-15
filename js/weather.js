// 天气 · the weather, and the season it happens in.
//
// Everything in here answers one question: what is it like outside today? The clock already moved
// the sun round the sky and nothing else ever changed — every day in this game was the same clear
// day, four hundred times over, and the one thing a life sim cannot afford is for a Tuesday in
// February to look exactly like a Thursday in June.
//
// Three layers, and they are deliberately separate:
//
//   season   Slow. A function of the day number and nothing else, so it cannot drift, cannot be
//            saved wrong, and is the same on every machine. It sets what colour the leaves are and
//            which weather is even possible — it does not snow in July.
//   plan     One roll per day, seeded by the day number, giving *when* today's weather happens as
//            well as what it is. Rain that is simply on all day is a filter over the screen; rain
//            that starts at ten past nine and has stopped by two is an event you were out in.
//   now      Fast. Where the clock is inside the plan, plus the state that lags behind it — the
//            ground stays wet for an hour after the rain stops, and snow lies until it thaws.
//
// Nothing here is saved. The plan is a pure function of the day, and the lagging state is small
// enough that recomputing it from the current minute on load is indistinguishable from having
// stored it. A save file that survives a change to this table is worth more than a puddle that
// survives a page reload.
const Weather = (() => {

  // ---------------------------------------------------------------- 季节 the seasons
  // Ten days each, so a year is forty. That is about four hours of play per season at the default
  // clock, which is the right order of magnitude: long enough that a season is a stretch of your
  // life rather than a costume change, short enough that somebody who plays for an evening sees
  // more than one.
  //
  // `leaf` multiplies every canopy in the game (gl.js, uMode 15). It is a tint and not a colour,
  // so a tree that was authored a dusty roadside green and one that was authored a deep park green
  // stay different from each other in October.
  const DAYS_PER_SEASON = 10;
  const SEASONS = [
    { key:'spring', hz:'春天', py:'chūntiān', en:'spring',
      leaf:[1.02, 1.14, 0.78], warm:0.55,
      // What the sky is doing before any weather is put on top of it. Spring in Beijing is dust:
      // the sky is pale and slightly yellow even on a day nobody would call bad.
      haze:[1.03, 1.00, 0.90], hazeAmt:0.22 },
    { key:'summer', hz:'夏天', py:'xiàtiān', en:'summer',
      leaf:[0.92, 1.06, 0.80], warm:1.00,
      haze:[1.00, 1.00, 1.00], hazeAmt:0.10 },
    { key:'autumn', hz:'秋天', py:'qiūtiān', en:'autumn',
      leaf:[1.22, 0.92, 0.52], warm:0.50,
      haze:[1.04, 0.99, 0.92], hazeAmt:0.14 },
    { key:'winter', hz:'冬天', py:'dōngtiān', en:'winter',
      leaf:[0.86, 0.78, 0.66], warm:0.00,
      // A winter sky here is not blue, it is a very pale, very cold grey-white, and it is that
      // colour at noon.
      haze:[0.96, 0.99, 1.06], hazeAmt:0.26 },
  ];

  // ---------------------------------------------------------------- what the weather can be
  //
  // `cloud` is the single number the light is graded by: how much of the sun is behind something.
  // `wet`, `snow`, `wind` and `fog` are how much of each this kind produces at full strength.
  //
  // Note that 'clear' is not the absence of weather. It has a cloud value of zero and a light wind,
  // and it is a kind like any other so that the notebook can teach 晴天 as a word you saw.
  // `note` is the diary's line for the kind. It has to be written out per kind rather than built
  // from the headword: 下雨了 and 下雪了 are natural, and 雾了 is not a sentence at all.
  const KINDS = {
    clear:    { hz:'晴天', py:'qíngtiān', en:'clear',        cloud:0.00, wind:0.14,
                note:['天晴了。', 'It cleared up.'] },
    cloud:    { hz:'多云', py:'duōyún',   en:'cloudy',       cloud:0.34, wind:0.22,
                note:['今天多云。', 'Cloudy today.'] },
    overcast: { hz:'阴天', py:'yīntiān',  en:'overcast',     cloud:0.74, wind:0.20, fog:0.15,
                note:['天阴了。', 'It clouded over.'] },
    rain:     { hz:'下雨', py:'xiàyǔ',    en:'rain',         cloud:0.84, wind:0.34, wet:1.00, fog:0.35,
                note:['下雨了。', 'It started raining.'] },
    storm:    { hz:'雷雨', py:'léiyǔ',    en:'thunderstorm', cloud:0.96, wind:0.72, wet:1.00, fog:0.30,
                note:['下雷雨了，还打雷。', 'A thunderstorm, with thunder.'] },
    snow:     { hz:'下雪', py:'xiàxuě',   en:'snow',         cloud:0.80, wind:0.30, snow:1.00, fog:0.45,
                note:['下雪了。', 'It started snowing.'] },
    fog:      { hz:'雾',   py:'wù',       en:'fog',          cloud:0.52, wind:0.06, fog:1.00,
                note:['起雾了，看不清路。', 'Fog came down — you can\'t see the road.'] },
    wind:     { hz:'刮风', py:'guāfēng',  en:'windy',        cloud:0.26, wind:1.00, fog:0.20, dust:1.00,
                note:['今天刮大风。', 'A gale all day.'] },
    // 沙尘暴. The spring wind here arrives off the Gobi carrying it, and the thing that makes a day
    // a sandstorm rather than a windy one is not the amount of grit in the air — it is the colour.
    // The sky goes a flat ochre, the sun becomes a disc you can look straight at, and everything
    // more than a street away is the same brown as everything else. So this is the one kind that
    // carries its own `haze`, because cloud grades toward grey and grey is precisely what a
    // sandstorm is not; `fog` is high for the same reason, since what it really costs you is the
    // far distance. `dust` at 1.00 with a wind over 1 keeps the particles at the ceiling the gale
    // already reached rather than adding more of them, which the apartment cannot afford.
    sand:     { hz:'沙尘暴', py:'shāchénbào', en:'sandstorm', cloud:0.58, wind:1.05, fog:0.62, dust:1.00,
                haze:[1.26, 1.00, 0.60], hazeAmt:0.66,
                note:['刮沙尘暴了，别出门。', 'A sandstorm blew in — stay indoors.'] },
  };

  // Which kinds each season draws from, and how often. These are weights, not percentages — they
  // are normalised at the point of rolling, so a kind can be added to one season without every
  // other number in the row having to be retyped to keep a total of one.
  //
  // Spring gets the wind and the dust, summer the thunderstorms, autumn is the good season and
  // is weighted like it, winter has the snow and the morning fog. Nowhere is rain the most likely
  // thing, because a game in which it usually rains is a game people stop going outside in.
  const TABLE = {
    // Sand is spring's and spring's only: seven parts in a hundred and ten is a little under one
    // day in a ten-day season, which is about how often Beijing actually gets one and rare enough
    // that it is an event rather than a texture.
    spring: { clear:32, cloud:22, wind:18, rain:14, overcast:10, sand:7, fog:4 },
    summer: { clear:30, cloud:20, storm:16, rain:16, overcast:12, wind:6 },
    autumn: { clear:38, cloud:22, overcast:12, fog:14, rain:10, wind:4 },
    winter: { clear:26, cloud:18, snow:22, overcast:16, fog:12, wind:6 },
  };

  // ---------------------------------------------------------------- the roll
  // A hash rather than Math.random, because the weather on day 12 has to be the same weather on
  // day 12 after a reload, after a save, and on the machine of anybody comparing notes. Three
  // rounds of integer mixing is more than enough for eight buckets and two time-of-day numbers,
  // and it costs nothing because it runs once a day.
  function hash(n) {
    let h = (n | 0) * 0x9e3779b1;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function seasonOf(day) {
    const d = Math.max(0, (day | 0) - 1);
    return SEASONS[Math.floor(d / DAYS_PER_SEASON) % SEASONS.length];
  }
  // How far through the season we are, 0 at the first morning and 1 at the last night. Used to
  // cross-fade the leaf tint, so autumn arrives over ten days instead of overnight.
  function seasonPhase(day) {
    const d = Math.max(0, (day | 0) - 1);
    return (d % DAYS_PER_SEASON) / DAYS_PER_SEASON;
  }

  // Today's plan: the kind, and the window of the day it occupies.
  //
  // Weather that lasts exactly one day, starting at midnight, is the tell that a game has a
  // weather variable rather than weather. So each kind gets a window, and the shape of that window
  // is part of what the kind *is*: fog belongs to the early morning and burns off, a thunderstorm
  // is two hours of a summer afternoon, snow settles in and stays, and wind blows all day.
  const SHAPE = {
    fog:      { from:[3.5, 6.0],  len:[3.0, 5.0] },
    storm:    { from:[13.0, 18.5], len:[1.2, 2.6] },
    rain:     { from:[6.0, 19.0], len:[2.5, 7.0] },
    snow:     { from:[4.0, 17.0], len:[5.0, 11.0] },
    wind:     { from:[6.0, 10.0], len:[8.0, 13.0] },
    // Shorter than a gale and later in the morning: a sandstorm gets up with the day's heat and is
    // usually through by evening, which is what makes it a thing that happened to you rather than
    // the weather you woke up in.
    sand:     { from:[8.5, 12.0], len:[4.0, 7.0] },
    overcast: { from:[0.0, 8.0],  len:[8.0, 16.0] },
    cloud:    { from:[0.0, 9.0],  len:[7.0, 16.0] },
    clear:    { from:[0.0, 0.0],  len:[24.0, 24.0] },
  };

  let planDay = -1, plan = null;
  // Set from outside to pin the weather — the debug key, and the harnesses, which need a rainy
  // street on demand and cannot wait for one to come round.
  let forced = null;

  function planFor(day) {
    if (planDay === day && plan && plan.forced === forced) return plan;
    const season = seasonOf(day);
    let kind = forced;
    if (!kind || !KINDS[kind]) {
      const w = TABLE[season.key];
      let total = 0;
      for (const k in w) total += w[k];
      let r = hash(day * 7 + 11) * total;
      kind = 'clear';
      for (const k in w) { r -= w[k]; if (r <= 0) { kind = k; break; } }
    }
    const sh = SHAPE[kind] || SHAPE.clear;
    const a = hash(day * 13 + 3), b = hash(day * 29 + 5);
    const from = sh.from[0] + (sh.from[1] - sh.from[0]) * a;
    const len = sh.len[0] + (sh.len[1] - sh.len[0]) * b;
    // What the sky is when today's weather is not happening. Never 'clear' after rain — the hours
    // either side of a downpour are cloudy, and stepping out of a rainstorm into a blue sky is the
    // most obviously wrong thing weather in a game can do.
    // 沙尘暴 is in the first group for the same reason rain is: the hours either side of one are
    // not a blue sky, they are the dust still coming down out of it.
    const quiet = kind === 'clear' ? 'clear'
      : (kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'overcast' || kind === 'sand')
        ? 'cloud' : hash(day * 41 + 17) < 0.45 ? 'cloud' : 'clear';
    plan = { day, forced, season, kind, quiet,
             from, to: from + len,
             // A private wind direction for the day, so consecutive rainy days do not have the
             // rain coming from the same compass point every time.
             dir: hash(day * 53 + 7) * Math.PI * 2 };
    planDay = day;
    return plan;
  }

  // ---------------------------------------------------------------- now
  // The live state. `amt` is how far into today's weather we are; everything else is derived from
  // it, except the two that lag.
  const cur = {
    kind: 'clear', hz:'晴天', py:'qíngtiān', en:'clear',
    amt: 0, cloud: 0, wind: 0.14, fog: 0,
    dust: 0,                      // airborne grit, 0 on every kind but 刮风 and 沙尘暴
    haze: null, hazeAmt: 0,       // the kind's own cast over the sky, on top of the season's
    wet: 0, lay: 0,               // ground wetness and lying snow, both slow
    dir: 0, gust: 0, flash: 0,
    season: SEASONS[0], seasonPhase: 0,
    day: 1,
  };

  // How much of today's weather is happening at this minute. Ramped in over twenty minutes and out
  // over forty, because rain arrives faster than it leaves.
  function envelope(p, mins) {
    const h = (mins / 60) % 24;
    if (p.kind === 'clear') return 0;
    if (h < p.from || h > p.to) return 0;
    const inK = Math.min(1, (h - p.from) / 0.34);
    const outK = Math.min(1, (p.to - h) / 0.66);
    const k = Math.min(inK, outK);
    return k * k * (3 - 2 * k);
  }

  // Called every frame. `dt` is real seconds; `mins` is the game clock.
  function tick(dt, mins, day) {
    const p = planFor(day);
    const amt = envelope(p, mins);
    const A = KINDS[p.kind], Q = KINDS[p.quiet];
    cur.day = day;
    cur.season = p.season;
    cur.seasonPhase = seasonPhase(day);
    // The word the HUD shows is the kind that is actually happening. Below a tenth it is not
    // raining yet, it is about to, and the chip should still say what the sky looks like.
    const on = amt > 0.10;
    const K = on ? A : Q;
    cur.kind = on ? p.kind : p.quiet;
    cur.hz = K.hz; cur.py = K.py; cur.en = K.en;
    cur.amt = amt;
    cur.cloud = (Q.cloud || 0) + ((A.cloud || 0) - (Q.cloud || 0)) * amt;
    cur.fog = ((Q.fog || 0) + ((A.fog || 0) - (Q.fog || 0)) * amt);
    // What is in the air rather than falling out of it. Was a hard test on `kind === 'wind'` in two
    // places, which is why a sandstorm could not have any: it is a per-kind amount now, like `wet`
    // and `snow`, and 刮风 keeps 1.00 so a windy day is exactly as dusty as it has always been.
    cur.dust = (Q.dust || 0) + ((A.dust || 0) - (Q.dust || 0)) * amt;
    // Only 沙尘暴 has a cast of its own, so there is never anything to cross-fade *between* — the
    // colour is whichever kind has one and the strength ramps with `amt`, or the ochre would snap
    // on at full depth in the first minute of it.
    cur.hazeAmt = (Q.hazeAmt || 0) + ((A.hazeAmt || 0) - (Q.hazeAmt || 0)) * amt;
    cur.haze = A.haze || Q.haze || null;
    cur.dir = p.dir;
    // Wind is never steady. A base level from the kind, plus two slow sine terms beating against
    // each other so gusts arrive at irregular intervals rather than on a metronome.
    const base = (Q.wind || 0) + ((A.wind || 0) - (Q.wind || 0)) * amt;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    cur.gust = 0.5 + 0.5 * (Math.sin(t * 0.23 + p.dir) * 0.6 + Math.sin(t * 0.61 + p.dir * 2.1) * 0.4);
    cur.wind = base * (0.62 + 0.55 * cur.gust);

    // A storm without lightning reads as heavy rain. Give each eight-and-a-half-second slot a
    // deterministic chance of one short double flash, so a reload does not turn the sky into a
    // strobe and two players on the same day still see the same character of storm. The light
    // grade below carries this into the sky, the world and the apartment windows together.
    cur.flash = 0;
    if (p.kind === 'storm' && amt > 0.08) {
      const slotLen = 8.5, slot = Math.floor(t / slotLen), sec = t - slot * slotLen;
      if (hash(day * 977 + slot * 37 + 19) > 0.58 && sec < 0.78) {
        const first = Math.exp(-sec * 10.5);
        const second = 0.62 * Math.exp(-Math.pow((sec - 0.19) / 0.055, 2));
        cur.flash = Math.min(1, Math.max(first, second) * amt);
      }
    }

    // ---- the two that lag.
    //
    // Wetting is fast and drying is slow, which is the whole reason these are not just `amt`. Two
    // minutes of rain leaves a street shining; it takes the best part of an hour of sun to take it
    // off again, and if it is cold or already foggy it takes longer. Walking home after the rain
    // has stopped, on a road that is still wet, is a thing this buys and nothing else does.
    const wetTarget = (A.wet || 0) * amt;
    const dryRate = 0.014 * (0.35 + 0.65 * (1 - cur.cloud)) * (0.4 + 0.6 * p.season.warm);
    cur.wet = wetTarget > cur.wet
      ? Math.min(1, cur.wet + dt * 0.28)
      : Math.max(0, cur.wet - dt * dryRate);
    // Snow lies. It accumulates while it falls and thaws far more slowly than water dries, so a
    // winter morning after a night of snow is white before anything else has happened.
    const snowTarget = (A.snow || 0) * amt;
    cur.lay = snowTarget > 0
      ? Math.min(1, cur.lay + dt * 0.05 * snowTarget)
      : Math.max(0, cur.lay - dt * 0.0035 * (0.3 + 0.7 * p.season.warm));
    // Snow on the ground is also water on the ground. Without this, a thaw left a bone-dry street
    // the instant the last of the white went.
    if (cur.lay > 0.02) cur.wet = Math.max(cur.wet, cur.lay * 0.35);
    // Indoor glazing. Here rather than in `draw`, because `draw` is the one entry point game.js
    // gates on being outdoors and the glass is the half of this that is only ever seen from in.
    paintGlass();
    return cur;
  }

  // ---------------------------------------------------------------- grading the light
  //
  // The sky keys in game.js describe a clear day. This is what happens to them when there is
  // something between the ground and the sun.
  //
  // The mistake to avoid is simply multiplying everything down: an overcast sky is not a dark sky,
  // it is a *flat* one. The sun goes, so the directional term collapses and shadows with it; the
  // ambient rises, because the whole sky is now a lamp; and everything desaturates toward the grey
  // the cloud deck is. A correctly graded overcast noon is very nearly as bright as a clear one
  // and has no shadows in it at all, which is exactly what it looks like out of a window.
  const CLOUD_SUN = [0.86, 0.88, 0.93];
  const deckHi = [0, 0, 0], deckLo = [0, 0, 0];
  const FLASH_COL = [0.72, 0.82, 1.00];
  const FLASH_SKY = [0.18, 0.23, 0.34], FLASH_GND = [0.055, 0.070, 0.11];
  const FLASH_SKY_A = [0.20, 0.25, 0.38], FLASH_SKY_B = [0.12, 0.16, 0.28];
  const FLASH_BG = [0.035, 0.045, 0.075], FLASH_GLASS = [0.12, 0.17, 0.29];
  const mixTo = (arr, to, k) => {
    for (let i = 0; i < 3; i++) arr[i] += (to[i] - arr[i]) * k;
  };
  function grade(light) {
    const c = cur.cloud, s = cur.season;
    if (c < 0.002 && s.hazeAmt < 0.002 && cur.hazeAmt < 0.002) return light;
    // The season's own cast over the sky, before any weather. This is what makes a clear February
    // afternoon read as February.
    if (s.hazeAmt > 0.002) {
      for (let i = 0; i < 3; i++) {
        light.skyA[i] *= 1 + (s.haze[i] - 1) * s.hazeAmt;
        light.skyB[i] *= 1 + (s.haze[i] - 1) * s.hazeAmt;
        light.col[i] *= 1 + (s.haze[i] - 1) * s.hazeAmt * 0.6;
      }
    }
    if (c > 0.002) {
      // The sun, most of the way out at full overcast but never all the way: even under a thick
      // deck there is a brighter patch where it is, and killing the directional term entirely
      // flattens faces into cutouts.
      light.amt *= 1 - 0.66 * c;
      // and what is left of it loses its colour, because it is no longer coming from a disc.
      mixTo(light.col, CLOUD_SUN, c * 0.75);
      // The sky as a lamp, which goes the other way: the ambient rises under cloud.
      const lift = 1 + 0.55 * c;
      for (let i = 0; i < 3; i++) { light.sky[i] *= lift; light.gnd[i] *= 1 + 0.30 * c; }
      // The dome. Toward a flat pale grey by day and a dirty low-lit orange after dark, because a
      // cloudy city night is not black — it is the streetlights on the underside of the cloud, and
      // it is brighter than a clear one.
      const day = Math.max(0, Math.min(1, (light.amt - 0.10) / 1.2));
      deckHi[0] = 0.62 * day + 0.10; deckHi[1] = 0.63 * day + 0.10;
      deckHi[2] = 0.66 * day + 0.12;
      deckLo[0] = 0.55 * day + 0.13; deckLo[1] = 0.54 * day + 0.11;
      deckLo[2] = 0.56 * day + 0.11;
      mixTo(light.skyA, deckHi, c * 0.80);
      mixTo(light.skyB, deckLo, c * 0.78);
      // Interiors get the same treatment through their own background colour, or a rainy afternoon
      // in the flat is as bright as a clear one and the window is the only thing that knows.
      for (let i = 0; i < 3; i++) {
        light.bg[i] *= 1 - 0.22 * c;
        light.glass[i] += (deckLo[i] * 0.8 - light.glass[i]) * c * 0.6;
        light.city[i] *= 1 - 0.30 * c;
      }
    }
    // The kind's own cast, and it goes *after* the cloud grading rather than with the season's,
    // which is the whole reason 沙尘暴 works. The cloud block mixes the dome toward a flat grey by
    // `c * 0.80`, so an ochre laid down before it comes out at barely half strength and reads as a
    // grey day with a filter on it. Laid down after, the cloud has taken the sun and the shadows
    // out — which a sandstorm does — and the colour is still the sky's.
    if (cur.hazeAmt > 0.002 && cur.haze) {
      const h = cur.haze, k = cur.hazeAmt;
      for (let i = 0; i < 3; i++) {
        const m = 1 + (h[i] - 1) * k;
        light.skyA[i] *= m; light.skyB[i] *= m; light.bg[i] *= m;
        // The sun keeps more of its own colour than the dome does: the disc is still there in a
        // sandstorm, it is just brown, and pushing the directional term the whole way turns every
        // lit face into the same orange.
        light.col[i] *= 1 + (h[i] - 1) * k * 0.65;
        light.sky[i] *= m;
        light.glass[i] *= m;
        light.city[i] *= 1 - 0.34 * k;   // the far city is the first thing it takes
      }
    }
    // 雷电 lightning is a cool, nearly shadowless flash. It lifts the dome and ambient more than
    // the sun term, which keeps it from looking like somebody briefly turned noon back on.
    if (cur.flash > 0.001) {
      const f = cur.flash;
      mixTo(light.col, FLASH_COL, f * 0.78);
      light.amt += f * 0.72;
      for (let i = 0; i < 3; i++) {
        light.sky[i] += FLASH_SKY[i] * f;
        light.gnd[i] += FLASH_GND[i] * f;
        light.skyA[i] += FLASH_SKY_A[i] * f;
        light.skyB[i] += FLASH_SKY_B[i] * f;
        light.bg[i] += FLASH_BG[i] * f;
        light.glass[i] += FLASH_GLASS[i] * f;
      }
    }
    // Recomputed, because half the game asks `day` how bright it is and the amount has changed
    // under it. Same expression as game.js's own.
    light.day = Math.max(0, Math.min(1, (light.amt - 0.14) / 1.3));
    return light;
  }

  // How much of a problem today's weather is to somebody trying to leave the ground, 0 to 1.
  //
  // This is the airport's number and nothing else reads it. The weights are the real ones: fog is
  // what actually stops aeroplanes and it stops them completely, snow is nearly as bad, wind is a
  // nuisance that delays rather than cancels, and rain on its own barely counts. Scaled by how far
  // into the weather we are, so a shower that has not started yet has not delayed anything.
  function disruptionOf(K, amt) {
    const raw = (K.fog || 0) * 0.85 + (K.snow || 0) * 0.70
              + (K.wind || 0) * 0.30 + (K.wet || 0) * 0.20;
    return Math.max(0, Math.min(1, raw * (0.30 + 0.70 * amt)));
  }
  function disrupt() { return disruptionOf(KINDS[cur.kind], cur.amt); }

  // A departure board is rolled once for the whole day and has to survive reloads unchanged.
  // Basing that roll on the live envelope made the same calendar day get a different schedule at
  // 06:00 and 18:00. These are operational severities for the deterministic daily plan, kept apart
  // from the visual fields above: rain haze is not aviation fog, and ordinary rain must not cross
  // the cancellation threshold reserved for storms, snow and real fog.
  const DAY_DISRUPT = { clear:0, cloud:.05, overcast:.12, rain:.24, wind:.42,
                        storm:.68, snow:.76, fog:.92 };
  function disruptFor(day) { return DAY_DISRUPT[planFor(day).kind] || 0; }

  // How much further the haze should reach today. Multiplies the scene's own fog distance, so a
  // place that is meant to see forty metres in the clear sees nine in fog and still sees further
  // than a corridor does.
  function fogScale() { return 1 - 0.72 * cur.fog * (0.35 + 0.65 * cur.amt); }

  // The season's leaf tint, cross-faded into the next season over the last third of this one, so a
  // canopy turns rather than switches.
  const leafTint = [1, 1, 1];
  function leaf() {
    const a = cur.season;
    const b = SEASONS[(SEASONS.indexOf(a) + 1) % SEASONS.length];
    const k = Math.max(0, (cur.seasonPhase - 0.66) / 0.34);
    for (let i = 0; i < 3; i++) leafTint[i] = a.leaf[i] + (b.leaf[i] - a.leaf[i]) * k;
    // Snow in the canopy is handled in the shader; this is the bare-branch look that comes before
    // it, and it is why a winter street is grey rather than a green street in the cold.
    return leafTint;
  }

  // ---------------------------------------------------------------- 雨 and 雪, the falling part
  //
  // A ring buffer of particles in a box that travels with the camera. Nothing is spawned and
  // nothing dies: a drop that leaves the bottom of the box is put back at the top, which for rain
  // is indistinguishable from a new drop and costs no allocation at all. The box is deliberately
  // small — fourteen metres — because rain is only legible near the camera, and a box big enough
  // to fill a street would spend nine tenths of its drops on pixels smaller than one.
  const RAIN_N = 220, SNOW_N = 190, DUST_N = 72, LEAF_N = 56;
  const BOX = 15, BOX_Y = 11;
  const rain = [], snow = [], splash = [], dust = [], leaves = [];
  // Persistent draw state. During active weather this path submits hundreds of particles per
  // frame; allocating a typed matrix and an options literal for each one turns a steady shower
  // into periodic garbage-collector hitches. Particle records already own their matrices, and the
  // renderer consumes options synchronously, so these buffers/records are safe to refill in place.
  const RAIN_COL = [0.72, 0.78, 0.86], SNOW_COL = [0.94, 0.96, 1.00];
  const DUST_COL = [0.62, 0.50, 0.34];
  const LEAF_COLS = [[0.54,0.22,0.07], [0.72,0.38,0.08],
                     [0.86,0.57,0.12], [0.42,0.30,0.08]];
  const rainOpt = { mode:1, alpha:0, gloss:0 };
  const splashOpt = { mode:1, alpha:0, gloss:0 };
  const snowOpt = { mode:1, alpha:0, gloss:0 };
  const dustOpt = { mode:1, alpha:0, glow:0, gloss:0 };
  const leafOpt = { mode:15, alpha:0, gloss:.05, round:.006 };
  const rainYaw = new Float32Array(16), rainTilt = new Float32Array(16);
  const rainBasis = new Float32Array(16);
  const splashFlat = new Float32Array(16), splashScale = new Float32Array(16);
  const splashLocal = new Float32Array(16), splashTrans = new Float32Array(16);
  let pooled = false, splashFlatReady = false;
  function pool() {
    if (pooled) return;
    pooled = true;
    for (let i = 0; i < RAIN_N; i++)
      rain.push({ x:(Math.random() - 0.5) * BOX * 2, y:Math.random() * BOX_Y,
                  z:(Math.random() - 0.5) * BOX * 2,
                  // Drops are not all the same size or all the same speed, and the near ones
                  // being fatter and faster than the far ones is most of the sense of depth.
                  k:0.55 + Math.random() * 0.9, m:new Float32Array(16) });
    for (let i = 0; i < SNOW_N; i++)
      snow.push({ x:(Math.random() - 0.5) * BOX * 2, y:Math.random() * BOX_Y,
                  z:(Math.random() - 0.5) * BOX * 2,
                  k:0.5 + Math.random() * 0.9, ph:Math.random() * 6.28,
                  m:new Float32Array(16) });
    for (let i = 0; i < DUST_N; i++)
      dust.push({ x:(Math.random() - 0.5) * BOX * 2, y:Math.random() * 5.2,
                  z:(Math.random() - 0.5) * BOX * 2,
                  k:0.45 + Math.random() * 0.9, ph:Math.random() * 6.28,
                  m:new Float32Array(16) });
    for (let i = 0; i < LEAF_N; i++)
      leaves.push({ x:(Math.random() - 0.5) * BOX * 2, y:Math.random() * 7.5,
                    z:(Math.random() - 0.5) * BOX * 2,
                    k:0.55 + Math.random() * 0.8, ph:Math.random() * 6.28,
                    tone:Math.random(), m:new Float32Array(16) });
    // Splashes: a flat ring that opens and fades where a drop lands. Only a handful, only near the
    // feet, because that is the only place you would ever see one.
    for (let i = 0; i < 26; i++)
      splash.push({ x:0, z:0, t:Math.random(), m:new Float32Array(16) });
  }

  // Advance the particles. Kept apart from the drawing so a frame that decides not to draw them —
  // indoors, or on a machine that cannot afford them — does not leave a wall of stationary rain
  // hanging in the air for the moment you step back outside.
  function fallParticle(p, fall, step, wx, wz, eye) {
    p.y -= fall * step;
    p.x += wx * step; p.z += wz * step;
    // Wrapped against the camera rather than against the world, so the box follows you and a
    // drop never has to be told where the ground is.
    if (p.y < eye[1] - 3.2) {
      p.y += BOX_Y;
      p.x = eye[0] + (Math.random() - 0.5) * BOX * 2;
      p.z = eye[2] + (Math.random() - 0.5) * BOX * 2;
    }
    if (p.x - eye[0] > BOX) p.x -= BOX * 2; else if (p.x - eye[0] < -BOX) p.x += BOX * 2;
    if (p.z - eye[2] > BOX) p.z -= BOX * 2; else if (p.z - eye[2] < -BOX) p.z += BOX * 2;
  }
  function move(dt, eye) {
    pool();
    const rainOn = cur.wet > 0.001 && (KINDS[cur.kind].wet || 0) > 0 && cur.amt > 0.02;
    const snowOn = (KINDS[cur.kind].snow || 0) > 0 && cur.amt > 0.02;
    const dustOn = cur.dust > 0.02 && cur.amt > 0.06;
    const leafOn = cur.season.key === 'autumn' && cur.wind > 0.12;
    if (!rainOn && !snowOn && !dustOn && !leafOn) return;
    const wx = Math.sin(cur.dir) * cur.wind * 9, wz = Math.cos(cur.dir) * cur.wind * 9;
    const step = Math.min(dt, 0.1);          // a tab returning from the background must not teleport
    if (rainOn) for (const p of rain) fallParticle(p, 15 * p.k, step, wx, wz, eye);
    if (snowOn) for (const p of snow) fallParticle(p, 0.85 * p.k, step, wx, wz, eye);
    if (dustOn) for (const p of dust) {
      p.x += wx * step * (0.38 + p.k * 0.34);
      p.z += wz * step * (0.38 + p.k * 0.34);
      p.y += Math.sin((p.ph += step * (1.4 + p.k)) * 1.7) * step * 0.12;
      if (p.x - eye[0] > BOX || p.x - eye[0] < -BOX ||
          p.z - eye[2] > BOX || p.z - eye[2] < -BOX) {
        p.x = eye[0] - Math.sign(wx || 1) * BOX;
        p.z = eye[2] + (Math.random() - 0.5) * BOX * 2;
        p.y = eye[1] - 1.8 + Math.random() * 4.8;
      }
    }
    if (leafOn) for (const p of leaves) {
      p.y -= step * (0.48 + p.k * 0.36);
      p.x += wx * step * 0.20 + Math.sin(p.ph) * step * 0.28;
      p.z += wz * step * 0.20 + Math.cos(p.ph * 1.3) * step * 0.22;
      p.ph += step * (1.6 + p.k * 1.8);
      if (p.y < eye[1] - 3.1) {
        p.y += BOX_Y;
        p.x = eye[0] + (Math.random() - 0.5) * BOX * 2;
        p.z = eye[2] + (Math.random() - 0.5) * BOX * 2;
      }
      if (p.x - eye[0] > BOX) p.x -= BOX * 2; else if (p.x - eye[0] < -BOX) p.x += BOX * 2;
      if (p.z - eye[2] > BOX) p.z -= BOX * 2; else if (p.z - eye[2] < -BOX) p.z += BOX * 2;
    }
    if (rainOn) for (const s of splash) {
      s.t += step * 3.4;
      if (s.t >= 1) { s.t -= 1;
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 5.5;
        s.x = eye[0] + Math.cos(a) * r; s.z = eye[2] + Math.sin(a) * r; }
    }
  }

  // Draw, into whatever the renderer is currently pointed at. Called after the world and before
  // the post chain, with depth writes already off — a drop must not occlude the drop behind it.
  //
  // `ground` is the height the splashes sit at; every outdoor scene in this game is flat and at
  // zero, and a scene that is not can say so.
  function draw(R, eye, ground) {
    pool();
    const K = KINDS[cur.kind];
    const wet = (K.wet || 0) * cur.amt, lay = (K.snow || 0) * cur.amt;
    // `cur.dust` is 1.00 × amt on 刮风, so this is the same number the hard kind test produced.
    const dustAmt = cur.dust * Math.min(1, cur.wind);
    const leafAmt = cur.season.key === 'autumn' ? Math.min(1, cur.wind * 1.7) : 0;
    if (wet < 0.02 && lay < 0.02 && dustAmt < 0.03 && leafAmt < 0.03) return;
    const quality = typeof Perf !== 'undefined' && Perf.q && Perf.q.rain !== undefined ? Perf.q.rain : 1;
    const collect = typeof R.beginCollect === 'function' && typeof R.endCollect === 'function';
    if (collect) R.beginCollect();
    try {
      if (wet >= 0.02) {
      // One orientation for the whole shower, built once and stamped into every drop: the streak
      // lies along the drop's own velocity, so as the wind gets up the rain leans with it.
      const yaw = Math.atan2(Math.sin(cur.dir), Math.cos(cur.dir));
      const tilt = Math.atan2(cur.wind * 9, 15);
      M.rotY(yaw, rainYaw); M.rotX(-tilt, rainTilt);
      M.mul(rainYaw, rainTilt, rainBasis);
      // Rain is not white and it is not blue. It is a lens: what you see is the sky, smeared. So it
      // takes the horizon colour, which makes it orange at sunset and nearly invisible at noon
      // against a bright sky, both of which are correct.
      const n = Math.round(RAIN_N * quality);
      for (let i = 0; i < n; i++) {
        const p = rain[i], m = p.m;
        // A drop is a millimetre across and this is thirty times that, which is not a mistake: what
        // the eye sees is not a drop, it is the streak a drop leaves in the time an eye integrates
        // over, and at a centimetre wide the streak is thinner than a pixel at six metres and
        // antialiases away to nothing. The first version of this was physically honest and drew two
        // hundred and twenty invisible objects a frame.
        const len = 0.70 + 0.95 * p.k, w = 0.020 + 0.016 * p.k;
        for (let c = 0; c < 3; c++) {
          m[c * 4]     = rainBasis[c * 4]     * (c === 1 ? len : w);
          m[c * 4 + 1] = rainBasis[c * 4 + 1] * (c === 1 ? len : w);
          m[c * 4 + 2] = rainBasis[c * 4 + 2] * (c === 1 ? len : w);
          m[c * 4 + 3] = 0;
        }
        m[12] = p.x; m[13] = p.y; m[14] = p.z; m[15] = 1;
        rainOpt.alpha = 0.44 * wet * p.k;
        R.draw('box', m, RAIN_COL, rainOpt);
      }
      // and where they land. The ring mesh stands up in the XY plane, so it is laid flat before it
      // is sized — a splash is a circle on the ground, not a hoop standing in the road.
      if (!splashFlatReady) {
        M.rotX(Math.PI / 2, splashFlat);
        splashFlatReady = true;
      }
      for (const s of splash) {
        const d = 0.10 + s.t * 0.40;
        M.scale(d, d, d * 0.5, splashScale);
        M.mul(splashFlat, splashScale, splashLocal);
        M.trans(s.x, ground + 0.014, s.z, splashTrans);
        M.mul(splashTrans, splashLocal, s.m);
        splashOpt.alpha = 0.26 * wet * (1 - s.t) * (1 - s.t);
        R.draw('ring', s.m, RAIN_COL, splashOpt);
      }
      }
      if (lay >= 0.02) {
      // Snow is the opposite problem to rain: it is legible, it is slow, and there is no streak to
      // it. What sells it is that no two flakes are on the same path — hence the per-flake phase on
      // a wide, slow drift, which is a flake turning over as it comes down.
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      const n = Math.round(SNOW_N * quality);
      snowOpt.alpha = 0.86 * lay;
      for (let i = 0; i < n; i++) {
        const p = snow[i];
        const s = 0.020 + 0.026 * p.k;
        M.trs(p.x + Math.sin(t * 0.8 + p.ph) * 0.45,
              p.y,
              p.z + Math.cos(t * 0.65 + p.ph * 1.3) * 0.45,
              t * 0.9 + p.ph, s, s, s, p.m);
        R.draw('box', p.m, SNOW_COL, snowOpt);
      }
      }
      if (dustAmt >= 0.03) {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      const yaw = cur.dir + Math.PI / 2;
      const n = Math.round(DUST_N * quality);
      for (let i = 0; i < n; i++) {
        const p = dust[i], len = 0.055 + p.k * 0.10;
        M.trs(p.x, p.y + Math.sin(t * 1.3 + p.ph) * .05, p.z,
              yaw, len, .006 + p.k * .004, .012, p.m);
        dustOpt.alpha = (0.07 + p.k * 0.045) * dustAmt;
        R.draw('box', p.m, DUST_COL, dustOpt);
      }
      }
      if (leafAmt >= 0.03) {
      const n = Math.round(LEAF_N * quality);
      leafOpt.alpha = 0.72 * leafAmt;
      for (let i = 0; i < n; i++) {
        const p = leaves[i], s = 0.035 + p.k * 0.020;
        M.trs(p.x, p.y, p.z, p.ph, s * 1.8, s * 0.12, s, p.m);
        R.draw('softBox', p.m,
          LEAF_COLS[Math.min(LEAF_COLS.length - 1, Math.floor(p.tone * LEAF_COLS.length))],
          leafOpt);
      }
      }
    } finally {
      if (collect) R.endCollect();
    }
  }

  // ---------------------------------------------------------------- what people say about it
  //
  // Weather is the safest small talk there is in any language, and it is the reason to have it in a
  // game about learning one: these are sentences a learner will hear on a real Beijing street the
  // first week they are there, and they arrive attached to a sky that justifies them.
  const BARKS = {
    clear:    [['今天天气真好。', "The weather's lovely today."],
               ['太阳出来了。', 'The sun has come out.']],
    cloud:    [['今天多云。', "It's cloudy today."],
               ['天有点儿阴。', "It's a bit grey."]],
    overcast: [['天阴了，可能要下雨。', "It's clouded over — it might rain."],
               ['今天不太好。', "It's not very nice today."]],
    rain:     [['下雨了，你带伞了吗？', 'It\'s raining — did you bring an umbrella?'],
               ['雨下得真大。', "It's really pouring."],
               ['小心路滑。', 'Careful, the road is slippery.']],
    storm:    [['打雷了，快回家吧。', "That's thunder — get home."],
               ['雨太大了！', 'The rain is too heavy!']],
    snow:     [['下雪了！', "It's snowing!"],
               ['今天很冷，多穿点儿。', "It's cold today — wrap up."],
               ['雪好大啊。', "That's heavy snow."]],
    fog:      [['雾很大，看不清。', "The fog's thick — you can't see."],
               ['开车小心。', 'Drive carefully.']],
    wind:     [['风好大。', "It's really blowing."],
               ['今天刮大风。', "There's a gale today."]],
    sand:     [['沙尘暴太厉害了。', 'This sandstorm is really bad.'],
               ['戴口罩吧，外面全是沙子。', 'Put a mask on — it\'s all sand out there.'],
               ['今天空气特别差。', 'The air is terrible today.']],
  };
  // ---------------------------------------------------------------- the weather seen from indoors
  //
  // game.js draws the particles only outdoors (`!scene.indoor`, game.js:14527) and it is right to:
  // nobody wants a wall of rain standing in their living room. But that left every interior in the
  // game weatherproof — you could sit out a thunderstorm in the flat and the only thing that knew
  // was the light grade — and not one of the twenty-one `js/home-*.js` modules mentions this file.
  //
  // The cheap half of the fix is the glass, because a pane the room has already built is the one
  // surface where the weather is legible from inside. Nothing new is drawn: the registered prop is
  // re-tinted, exactly the way `World.setCity` already re-tints the panes on `A.sky`. Wet glass
  // goes darker and greyer, lying snow puts a pale film across the bottom of the view, and a
  // sandstorm turns it the colour of what is behind it.
  //
  // A room registers once, at build time, and does nothing else ever again:
  //
  //   Weather.glass(pane)                        // the prop, as returned by box()/A.sky()
  //   Weather.glass(pane, [r, g, b])             // …with the clean colour stated, if the prop's
  //                                              //   own is a shared palette entry
  //
  // `tick` repaints them, so there is no per-scene call to forget and no per-frame cost: the walk
  // is rate-limited to four times a second and returns on the first line when nothing is
  // registered, which is every scene in the game today.
  const panes = [];
  function glass(p, base) {
    if (!p) return p;
    // `out` is this pane's own array and the prop is pointed at it. Writing through `p.color` in
    // place would be the bug: colours in this codebase are shared palette entries — `col.sky` is
    // handed to several props at once — and mutating one would rain on all of them.
    const clean = (base || p.color || [1, 1, 1]).slice();
    panes.push({ p, clean, out: clean.slice(), glow0: p.glow });
    return p;
  }
  let paintT = -1e9;
  // ponytail: repaints every registered pane, not only the ones in the live scene. Panes are a
  // handful per room and this runs at 4 Hz, so the walk is nothing; if a hundred rooms ever
  // register, bucket them by scene.
  function paintGlass() {
    if (!panes.length) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    if (t - paintT < 0.25) return;
    paintT = t;
    const K = KINDS[cur.kind];
    // Rain *on* the pane is the rain that is falling, not the wet the street is holding: a road
    // still shining an hour later has nothing on the window. The lag term is small and only there
    // so the glass does not go clean the instant the shower stops.
    const wetK = Math.min(1, (K.wet || 0) * cur.amt + cur.wet * 0.22);
    const snowK = Math.min(1, cur.lay);
    const dustK = Math.min(1, cur.dust);
    if (wetK < 0.01 && snowK < 0.01 && dustK < 0.01) {
      for (const g of panes) { g.p.color = g.clean; if (g.glow0 !== undefined) g.p.glow = g.glow0; }
      return;
    }
    for (const g of panes) {
      const c = g.out;
      for (let i = 0; i < 3; i++) {
        let v = g.clean[i];
        v *= 1 - 0.28 * wetK;                                   // wet glass is darker
        v += (0.84 - v) * 0.42 * snowK;                          // snow on it is a pale film
        if (dustK > 0.01) v *= 1 + ([1.26, 1.00, 0.60][i] - 1) * 0.58 * dustK;
        c[i] = v;
      }
      g.p.color = c;
      // Whatever is behind the glass is harder to see through it. The same term the colour uses,
      // so a pane that was never given a glow is left alone rather than given one.
      if (g.glow0 !== undefined) g.p.glow = g.glow0 * (1 - 0.5 * Math.max(wetK, dustK));
    }
  }

  // One line for the sky as it is now, or null if this kind has nothing to say. The caller decides
  // how often anybody says anything; this only decides what.
  function bark() {
    const list = BARKS[cur.kind];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  // The words this system teaches, so the notebook can be handed them the first time you see the
  // sky do it. Season and weather both, because 冬天 is learned by living through one.
  function words() {
    return [cur.hz, cur.season.hz];
  }

  return {
    SEASONS, KINDS, TABLE, DAYS_PER_SEASON,
    seasonOf, seasonPhase, planFor, hash,
    tick, grade, fogScale, leaf, move, draw, bark, words, disrupt, disruptFor,
    // Indoor glazing — see the note over `glass`. Registration is once, at build time; `tick`
    // drives the repaint, so no scene has a per-frame call to make or to forget.
    glass, paintGlass,
    get now() { return cur; },
    // Pin the weather, or hand back null to let the calendar decide again. Used by the debug key
    // and by every harness that needs a wet street without waiting a week for one.
    force(kind) { forced = kind && KINDS[kind] ? kind : null; planDay = -1; },
    get forced() { return forced; },
  };
})();
