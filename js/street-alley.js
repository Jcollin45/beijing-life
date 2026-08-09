// 胡同 — the alley's own life, and the shape of its day.  StreetFit['alley'].
//
// js/street.js already builds this district's *fabric*: the courtyard wall and its gatehouses, the
// walk-up opposite, the trees, the parked bikes, one cat, two lines of washing, the festival
// lanterns, the pigeon loft, the wall junk, the 门墩 stones on every threshold. None of that is
// rebuilt here. What is missing from the hutong is the two things a photograph of one always has
// and this street never did:
//
//   1. the small domestic clutter a courtyard pushes out into the alley because there is no room
//      for it inside — the coal, the pickle crocks, the tap everybody shares, the meter box with
//      thirty years of wire on it, the bins under the slogan about bins, the chalk on the paving;
//   2. **the hour**.  PLAN.md:364 and STREET.md's S2 say it in the same words: no school run, no
//      广场舞, no shutters coming down one by one.  Before this file the alley at seven in the
//      morning and the alley at ten at night were the same set of matrices, and the breakfast cart
//      was the only object in the whole game that had ever read the clock.
//
// ---------------------------------------------------------------- how the day is driven
//
// `tick` is handed `(t, body, mins)` and `mins` is the game clock.  The pattern is street.js's own
// 早餐 toggle (street.js:3644) and it matters: these are several hundred matrices that move **twice
// a day**, so every group remembers whether it is currently up and writes only on the frame the
// answer changes.  A quilt hung out at eight costs one write at eight and nothing at all for the
// next eight hours.  Three things are exceptions and say so where they are: the washing swings
// every frame while it is out, a shutter writes for the twelve game-minutes it is travelling, and
// the lamps cross-fade over three quarters of an hour at either end of their window.
//
// ---------------------------------------------------------------- where things are allowed to go
//
// The alley zone is z -2.35..3.35 and `clampMove` inflates every collider by the 0.30 m body
// radius, so the body's centre can never leave z -2.05..3.05.  That leaves two strips that are
// *physically unreachable* however much is stood in them:
//
//     z  3.05 .. 3.74   against the courtyard wall      (0.69 m deep)
//     z -2.85 .. -2.05  against the block / south walls (0.80 m deep)
//
// Everything below is built into those two strips and this file calls `solid()` and `blocker()`
// **zero times**, which is a stronger claim than a measurement: `clampMove` reads only the walkable
// zones and the solid list, so the alley's clear run is bit-identical with this district and
// without it. Measured anyway, against the real `Street.clampMove` at r = 0.30 with all nine
// districts standing: the narrowest slice of the alley is 1.25 m, and the tightest thing in it is
// not here — see the report's note on the object sitting in mid-alley around x 6.7..8.9.
//
// The one thing that stands in the open is the 广场舞 crowd, and it is made of people rather than
// props: NPCs are drawn, never collided, so a line of women dancing in the middle of the alley is
// something you walk around because you want to, not because the street has been sealed. They are
// declared into `window.StreetCast` the way the eighteen mall tenants declare theirs into
// `MallCast`, and need the one matching line in js/game.js — see the note on `CAST` below.
(() => {
  'use strict';

  // ---- the alley's timetable, in hours. Gathered here because that is the point of the file:
  // this block is the day, and everything below is an implementation of it.
  const H = {
    school:  [ 6.80,  8.20],  // 上学 — satchels down the alley, and a grandmother walking one
    wash:    [ 7.40, 19.30],  // out after breakfast, taken in before dark
    quilt:   [ 8.00, 16.60],  // 晒被子 — bedding over the wall while the sun is on it
    cat:     [ 9.80, 16.80],  // the cat follows the sun onto the coping
    nap:     [11.30, 15.30],  // the 躺椅 comes out for the flat part of the afternoon
    speaker: [17.70, 20.60],  // the trolley is wheeled out first and taken away last
    dance:   [17.90, 20.40],  // 广场舞
    stools:  [18.50, 22.60],  // 马扎 out along the wall, cards, a thermos
    chess:   [18.70, 22.60],  // 象棋 under a bulb on a flex
    gate:    [18.40, 23.20],  // the second courtyard's gate lamp
    night:   [18.40, 30.00],  // your own gate's bulb — the one that is still on at five
    shop:    [16.00, 23.20],  // the kiosk's inside light
    lit:     [17.50, 23.20],  // and what it throws on the paving
    slit:    [21.10, 23.20],  // the line of light under a shutter that is down but not asleep
    phone:   [19.50, 22.60],
  };

  const SLIDE = 0.20;                     // hours a shutter takes to travel — 12 game-minutes

  // ---- state, filled by the builder and read by the tick.
  const SETS = [];        // { props, m0, h0, h1, on }   hour-windowed groups of geometry
  const LAMPS = [];       // { g, h0, h1, a }            floor pools that come up with the dark
  const EMIT = [];        // { p, h0, h1, k }            emissive faces that come up with them
  const SHUTTERS = [];    // { p, x, top, z, w, h, opens, shuts, u }
  const WASH = [];        // { props, m0, y, phase, set } swung from the line, like street.js's own
  // A word whose object is not out yet. game.js already has the idiom — `reach < 0` is how the
  // courier says he has not knocked and how a resident says she has gone in for the night
  // (game.js:8388) — and without it the quilts came in at half past four and 被子 went on hanging
  // in the air over an empty wall.
  const THINGS = [];      // { th, r0, h0, h1, on }
  let cast = false;       // whether the people have been offered to the roster yet
  let dusk = -1;          // last quantised hour the lamps were written at

  // ---- the district's people, declared the way the shopping centre's eighteen tenants declare
  // theirs (`MallCast`, js/mall.js:54): a shared array that game.js folds into `NPCS` before the
  // roster is initialised. It has to be this and not `addNPC`, because js/game.js is wrapped in an
  // IIFE — `addNPC`, `initNPC`, `makeLook` and `TEMPERAMENT` are all closure-private and the only
  // thing the file publishes is `window.__game`, which does not carry them. `NPCS` itself is
  // global (js/data.js) but pushing onto it after `NPCS.forEach(initNPC)` has run appends a
  // person nothing ever initialises, and the update loop reads `n.look.tall` on the next frame.
  //
  // On `window` rather than as a bare `const` on purpose: nine district files load into one
  // lexical scope, and a second `const StreetCast` would be a duplicate declaration — which is
  // not one broken district, it is the whole game failing to boot.
  //
  // **This needs one line in js/game.js to become people** — see the ticket in the report. Until
  // it lands, everything they use is built and standing and the alley is simply empty of them.
  const CAST = (window.StreetCast = window.StreetCast || []);

  // Parked forty metres under the floor at a millionth of its size. Copied from street.js:158
  // rather than shared, because the shell does not put it on `S` — see the ticket in the report.
  const HIDDEN = M.trs(0, -60, 0, 0, .001, .001, .001);

  // Inside a window that may run past midnight — the same test `npcAwake` uses in game.js, so a
  // prop and the person who uses it can never disagree about what time it is.
  const within = (h, a, b) => (b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b));

  // How far inside the window we are, eased over the last three quarters of an hour at each end.
  // A bulb that appears is a bug; a bulb that comes up is dusk.
  const fade = (h, a, b) => {
    if (!within(h, a, b)) return 0;
    const from = h >= a ? h - a : h + 24 - a;
    const to = b > 24 ? (h < b - 24 ? b - 24 - h : b - h) : b - h;
    const u = Math.max(0, Math.min(1, Math.min(from, to) / .75));
    return u * u * (3 - 2 * u);
  };

  // Stable per-position jitter in 0..1, hashed off where a thing is rather than drawn from a
  // random stream, so adding one of these never shifts a later decision.
  const jit = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                          return s - Math.floor(s); };

  StreetFit['alley'] = S => {
    const { box, cyl, ball, cap, flat, glyphs, glow, thing, col, C, G } = S;
    const P = S.props;

    // ---- the two wall lines this district hangs off, measured off street.js's own constants
    // (`CW = 2.55, CWZ = 3.95` at street.js:125, `brickRun` thickness .42 at street.js:187) and
    // repeated here because the district contract does not carry them. If the courtyard wall ever
    // moves, these three numbers move with it.
    const WALL = 3.95 - .21;              // 3.74 — the courtyard wall's face, down the alley
    const WTOP = 2.55;                    //        and the top of it
    const BLK = -2.85;                    // the block's plinth face on the south side

    // ---- the alley's own colours. Almost none of this is in the district palette, because almost
    // none of it is architecture: enamel, plastic, glazed stoneware, coal, cane, cloth.
    const COAL = C('#2b2a29'), COALD = C('#1c1b1b');
    const CROCK = C('#4e3a2c'), CROCKL = C('#6b5138'), CLOTH = C('#d8d2c0');
    const ENAMEL = C('#e8e6dd'), ENAMELR = C('#b8443a'), GALV = C('#9aa0a2');
    const BINB = C('#2f6f9c'), BING = C('#3d7a4a'), BINR = C('#a4392f'), BINK = C('#585d63');
    const CHALK = C('#cfc9b6'), WET = C('#4a4b48'), BAMBOO = C('#c2a76a'), BAMBOOD = C('#9b8450');
    const QUILT1 = C('#b8455a'), QUILT2 = C('#3f7f8c'), QUILT3 = C('#d8b23f');
    const FUR = C('#c98d4e'), FURW = C('#e6ded0'), FURD = C('#9a6a38');
    const WIRE = C('#232526'), BAKE = C('#8c7f6a'), LAMPW = C('#ffd9a0');

    // ---- collectors ---------------------------------------------------------------------------
    // Everything made between `open()` and `close(window)` belongs to one hour and is switched as
    // a unit. No nesting: a group is a scene, not a tree.
    let mark = -1;
    const open = () => { mark = P.length; };
    const close = w => {
      const props = P.slice(mark); mark = -1;
      const rec = { props, m0: props.map(p => p.m), h0: w[0], h1: w[1], on: true };
      if (props.length) SETS.push(rec);
      return rec;
    };
    const lamp = (m, c, a, w) => {
      const g = glow(m, c, 0); LAMPS.push({ g, h0: w[0], h1: w[1], a }); return g;
    };
    const emit = (p, k, w) => { p.glow = 0; EMIT.push({ p, h0: w[0], h1: w[1], k }); return p; };
    const timed = (th, w) => {
      THINGS.push({ th, r0: th.reach === undefined ? 1.5 : th.reach, h0: w[0], h1: w[1], on: true });
      return th;
    };

    // ============================================================================== the fabric
    // Always there, whatever the hour, and all of it in the two unreachable strips.

    // ---- 公用水龙头, the tap the whole courtyard shares, at the west end where the alley opens
    // out. A standpipe, a concrete kerb round the gully, and the permanent dark patch that a tap
    // used forty times a day leaves on paving which never gets an hour of sun.
    (() => {
      const x = -22.90, z = 3.40;
      flat(x, .013, z - .40, 1.50, 1.00, WET, { gloss: .74 });
      flat(x, .015, z - .30, .90, .62, C('#3d3f3e'), { gloss: .88 });
      box(x, .085, z, 1.05, .17, .52, col.stoneD, { hard: true, mode: 11, gloss: .18 });
      box(x, .175, z, .84, .04, .34, C('#3a3c3a'), { hard: true, gloss: .40 });
      cyl(x, .062, z - .02, .07, .03, col.charcoal, { gloss: .34 });          // the gully grating
      cap(x - .02, .62, z + .30, .022, 1.10, .022, GALV, { gloss: G.metal }); // the rising main
      for (const y of [.36, .96])                                             // saddle clips, into
        box(x - .02, y, z + .35, .07, .035, .05, col.steelD, { hard: true, gloss: .40 }); // the wall
      cap(x - .02, .88, z + .16, .019, .34, .019, C('#a8802f'), { rx: Math.PI / 2, gloss: .52 });
      cyl(x - .02, .78, z + .015, .016, .10, C('#a8802f'), { gloss: .52 });
      for (let i = 0; i < 4; i++)                                             // the cross handle
        cap(x - .02, .96, z + .04, .010, .09, .010, C('#8d6a26'),
          { ry: i * .785, rz: Math.PI / 2, gloss: .50 });
      ball(x + .58, .07, z - .12, .21, .07, .21, ENAMEL, { gloss: .34 });     // basins, upturned
      ball(x + .58, .13, z - .12, .17, .06, .17, ENAMELR, { gloss: .40 });
      cap(x - .60, .30, z + .06, .020, .58, .020, BAMBOOD, { rz: .22, gloss: G.wood });
      box(x - .665, .60, z + .06, .05, .16, .17, C('#b8b0a0'), { hard: true, gloss: .10 });
    })();

    // ---- 垃圾分类, four bins under the banner street.js already wired to this wall
    // (street.js:3354, 垃圾分类从我做起). The banner had nothing at all underneath it, which made
    // it a slogan about an absence. The real set is four and the colours are national: blue
    // 可回收物, green 厨余垃圾, red 有害垃圾, grey 其他垃圾, in that order.
    (() => {
      const BINS = [[BINB, '可回收物'], [BING, '厨余垃圾'], [BINR, '有害垃圾'], [BINK, '其他垃圾']];
      const z = 3.44, T = { tag: '垃圾' };
      BINS.forEach(([c, name], i) => {
        const x = -22.15 + i * .56;
        box(x, .43, z, .50, .78, .44, c, { hard: true, gloss: .30, ...T });
        box(x, .845, z + .015, .51, .06, .45, [c[0] * .78, c[1] * .78, c[2] * .78],
          { hard: true, gloss: .34, ...T });                    // the lid, sat slightly proud
        box(x, .885, z - .16, .30, .04, .10, [c[0] * .68, c[1] * .68, c[2] * .68],
          { hard: true, gloss: .34, ...T });                    // the foot-pedal linkage
        for (const s of [-1, 1])
          cyl(x + s * .19, .045, z - .16, .045, .05, col.charcoal,
            { rz: Math.PI / 2, gloss: .30, ...T });
        glyphs(x, .52, z - .225, Math.PI, name,
          { size: .085, gap: .022, color: col.white, mode: 1, lift: .006, tag: '垃圾' });
      });
      thing('垃圾', -21.00, 1.00, 3.02, '垃圾要分类，厨余的放绿色桶。',
        'Rubbish has to be sorted — food waste goes in the green bin.',
        '垃圾 lājī is rubbish. 分类 fēnlèi is to sort it into kinds.',
        { focus: [-21.00, 2.60], reach: 2.4 });
    })();

    // ---- 蜂窝煤. Honeycomb briquettes: coal dust and clay pressed into a cylinder with nineteen
    // holes through it, still what a courtyard stove burns in winter. Stacked against the wall
    // under a folded-back tarpaulin, with the tongs standing in the top of the pile.
    (() => {
      const x = -17.90, z = 3.44;
      for (let c = 0; c < 3; c++) {
        const cx = x - .38 + c * .38, n = [7, 6, 4][c];
        for (let i = 0; i < n; i++) {
          const k = jit(cx, i * 2.7), y = .055 + i * .105, cz = z + (k - .5) * .05;
          cyl(cx, y, cz, .165, .105, i % 2 ? COAL : COALD, { mode: 11, gloss: .06, ry: k * 1.2 });
          // The face of one of these is nothing but holes; at this size a ring of dark dots on
          // the top disc is the whole of the read.
          for (let hl = 0; hl < 6; hl++)
            cyl(cx + Math.cos(hl * 1.047) * .085, y + .054, cz + Math.sin(hl * 1.047) * .085,
              .020, .012, C('#0e0e0e'), { mode: 11, gloss: .02 });
        }
      }
      flat(x, .012, z - .42, 1.60, .80, C('#3a3733'), { gloss: .10 });   // dust never stays on it
      box(x + .10, .78, z + .10, 1.05, .05, .44, C('#2f5f7a'), { hard: true, gloss: .22, ry: .06 });
      cap(x + .52, .44, z - .16, .014, .86, .014, col.steelD, { rz: .30, gloss: G.metal });
      cap(x + .58, .44, z - .16, .014, .86, .014, col.steelD, { rz: .38, gloss: G.metal });
      box(x - .62, .10, z - .22, .34, .20, .26, C('#6a5f4e'), { gloss: .12, ry: -.18 });
    })();

    // ---- 咸菜坛子, the pickle crocks. Glazed brown stoneware with a water-seal rim, a cloth over
    // the top and a brick on the cloth, standing where they always stand: outside the door,
    // because the smell of them is not welcome inside and nobody has ever stolen one.
    (() => {
      const x = -10.20, z = 3.46;
      [[-.44, .30], [0, .36], [.42, .26]].forEach(([ox, r], i) => {
        const cx = x + ox, hg = r * 1.65, k = jit(cx, i);
        ball(cx, hg * .46, z, r, hg * .46, r, i === 1 ? CROCK : CROCKL, { gloss: .46 });
        cyl(cx, hg * .86, z, r * .58, hg * .30, i === 1 ? CROCK : CROCKL, { gloss: .46 });
        cyl(cx, hg * 1.00, z, r * .66, .035, CROCKL, { gloss: .50 });        // the water-seal rim
        box(cx, hg * 1.04, z, r * 1.10, .02, r * 1.10, CLOTH,
          { hard: true, mode: 7, gloss: G.fabric, ry: k * .6 });
        if (i !== 2)
          box(cx, hg * 1.08, z, .18, .07, .10, col.brickD,
            { hard: true, mode: 11, gloss: .08, ry: k * .9 });               // the brick on the cloth
      });
      cap(x + .78, .34, z + .04, .018, .66, .018, BAMBOOD, { rz: -.14, gloss: G.wood });
    })();

    // ---- 电表箱, the shared meter box. Every courtyard in this city has one on the wall by the
    // gate and every one of them looks like this: a grey steel cabinet with six meters in it and
    // thirty years of somebody else's cable stapled round it in a nest nobody will ever untangle.
    // It is one of the most photographed objects in a hutong and the alley did not have one.
    (() => {
      const x = 2.40, y = 1.62, z = WALL - .04, T = { tag: '电表' };
      box(x, y, z - .07, .92, .70, .16, col.steelD, { hard: true, gloss: .40, ...T });
      box(x, y, z - .15, .86, .64, .02, C('#8b9095'), { hard: true, gloss: .44, ...T });
      box(x, y + .38, z - .09, .98, .07, .20, col.steel, { hard: true, gloss: .38, ...T });
      for (let i = 0; i < 6; i++) {
        const mx = x - .28 + (i % 3) * .28, my = y + .14 - ((i / 3) | 0) * .30;
        box(mx, my, z - .17, .21, .24, .03, C('#d9d4c4'), { hard: true, gloss: .30, ...T });
        box(mx, my - .04, z - .19, .15, .06, .01, C('#2b2f33'), { hard: true, mode: 1, ...T });
        cyl(mx + .06, my + .07, z - .19, .022, .012, C('#b03a2e'),
          { rx: Math.PI / 2, gloss: .40, ...T });
      }
      glyphs(x, y + .38, z - .20, Math.PI, '电表箱',
        { size: .085, gap: .025, color: col.white, mode: 1, lift: .006, tag: '电表' });
      // The nest: sixteen droppers and loops in two greys, each hung off its own hash so the
      // bundle reads as a mess rather than as a comb.
      for (let i = 0; i < 16; i++) {
        const k = jit(x + i * .7, 3.1), k2 = jit(i * 1.9, x);
        const cx = x - .52 + k * 1.10, len = .50 + k2 * 1.50;
        cap(cx, y - .38 - len * .5, z - .04, .011, len, .011,
          k > .6 ? C('#3a3d40') : WIRE, { rz: (k2 - .5) * .5, gloss: .26 });
        if (k2 > .55)
          for (let a = 0; a < 8; a++)
            cap(cx + Math.cos(a * .785) * .13, y - .16 + Math.sin(a * .785) * .13, z - .02,
              .009, .075, .009, WIRE, { rz: a * .785, gloss: .26 });
      }
      for (let i = 0; i < 4; i++)                                    // the trunk along the wall
        cap(x + 1.20, y + .46 + i * .045, z - .02, .016, 8.40, .016, WIRE,
          { rz: Math.PI / 2 + (i - 1.5) * .004, gloss: .24 });
      thing('电表', x, 1.55, 3.02, '电表箱在门口，六户人家共用一个。',
        'The meter box is by the gate — six households share it.',
        '电 diàn is electricity, 表 biǎo a gauge. 电表 is the meter itself.',
        { focus: [x, 2.60], reach: 2.4 });
    })();

    // ---- 卫星天线. Two dishes on brackets behind the courtyard wall, which is where they go: not
    // on the tiles, where nobody would get a ladder to them, but on a length of scaffold pole
    // wired to the back of the wall and aimed south-east over it.
    for (const [dx, ang] of [[-5.00, -.34], [19.00, -.22]]) {
      cap(dx, 1.90, 4.34, .026, 2.60, .026, GALV, { gloss: G.metal });
      cap(dx + .16, 2.62, 4.34, .020, .46, .020, GALV, { rz: -.90, gloss: G.metal });
      ball(dx + .34, 2.86, 4.16, .30, .30, .11, C('#d0cdc4'), { rx: .50, ry: ang, gloss: .30 });
      ball(dx + .34, 2.86, 4.12, .25, .25, .06, C('#b9b5aa'), { rx: .50, ry: ang, gloss: .26 });
      cap(dx + .34, 2.70, 4.00, .016, .34, .016, col.charcoal, { rx: -.90, ry: ang, gloss: .34 });
      box(dx + .34, 2.60, 3.92, .07, .07, .09, col.charcoal, { hard: true, ry: ang, gloss: .34 });
      cap(dx + .30, 2.10, 4.28, .010, 1.10, .010, WIRE, { rz: .16, gloss: .24 });
    }

    // ---- 空调 drip. street.js hangs air-conditioners all over these facades and not one of them
    // has ever done the single thing an air-conditioner does on a Beijing afternoon, which is drip
    // on your head. A condensate pipe taped down the wall, the green stain where it has run for
    // years, and a cut-off bottle wired under it to catch what is left.
    (() => {
      const x = -8.40, z = BLK + .06;
      for (let i = 0; i < 5; i++)
        cap(x, 1.30 + i * .62, z, .014, .62, .014, C('#dcd8cf'),
          { rz: (jit(x, i) - .5) * .08, gloss: .28 });
      for (let i = 0; i < 4; i++)
        box(x, 1.62 + i * .62, z + .012, .07, .05, .02, C('#c9c4b8'), { hard: true, gloss: .20 });
      box(x + .012, 2.20, z - .022, .09, 3.60, .015, C('#5f6a52'),
        { hard: true, mode: 11, gloss: .06 });
      box(x + .012, .58, z - .024, .22, .90, .012, C('#57634c'),
        { hard: true, mode: 11, gloss: .08 });
      cyl(x, .13, z - .16, .075, .26, C('#cfe0d2'), { gloss: .55, alpha: .78 });
      cyl(x, .06, z - .16, .073, .12, C('#7c8e6f'), { gloss: .55 });   // what has collected in it
      flat(x, .014, z - .34, .70, .50, WET, { gloss: .80 });
      flat(x, .016, z - .30, .34, .26, C('#3c4340'), { gloss: .92 });
      flat(x + .90, .013, z - .26, 1.90, .22, C('#4d5747'), { gloss: .34 });   // the algae run
    })();

    // ---- 跳房子. Chalk on the paving outside your own front door, half rubbed out by feet. Drawn
    // as `flat`s, which carry no `ob` and therefore no collider and cannot be picked — chalk is
    // not an object, it is a mark on the ground.
    (() => {
      const x = 3.40, z0 = -1.90;
      const cell = (cx, cz, w, d) => {
        for (const [ox, oz, sw, sd] of [[0, d / 2, w, .035], [0, -d / 2, w, .035],
                                        [w / 2, 0, .035, d], [-w / 2, 0, .035, d]])
          flat(cx + ox, .014, cz + oz, sw, sd, CHALK, { gloss: .04 });
      };
      for (let i = 0; i < 4; i++) cell(x, z0 + .32 + i * .62, .56, .60);
      cell(x - .30, z0 + 2.80, .56, .60);
      cell(x + .30, z0 + 2.80, .56, .60);
      cell(x, z0 + 3.42, .56, .60);
      ball(x + .22, .022, z0 + 1.60, .065, .020, .050, col.stone, { gloss: .18, ry: .50 });
    })();

    // ---- the three lock-ups in the block's own ground floor: 小卖部, 修鞋配钥匙, 打印复印. All three
    // are the same object — a housing surface-mounted on the block's face, with a roller shutter
    // that travels — because that is what makes "one by one" legible: three of the same door in a
    // row, shutting three quarters of an hour apart, in one view.
    //
    // Surface-mounted rather than cut in: the wall is street.js's and this only ever adds to it.
    // `stock` is the corner shop — a shelf, a counter, and the light that stays on behind the
    // steel long after the door is down.
    const lockup = (x, name, sub, board, stock) => {
      const w = 1.46, y0 = .08, hgt = 1.92, z = BLK + .02, zf = z + .15;
      box(x, y0 + hgt / 2, z + .08, w + .20, hgt + .16, .17, col.renderD, { hard: true, gloss: .20 });
      // The dark of the inside, kept a clear 45 mm *behind* the housing's own front face. At the
      // same plane it flickered against it, which is the coplanar fault this project has paid for
      // three times.
      box(x, y0 + hgt * .50, z + .10, w, hgt * .90, .02, C('#1e2228'), { hard: true, gloss: .10 });
      box(x, y0 + .60, zf - .03, w - .10, .06, .26, BAKE, { hard: true, gloss: .24 });
      if (stock) {
        for (let i = 0; i < 8; i++) {                                  // the stock on the shelf
          const k = jit(x + i, 7.7);
          box(x - .54 + i * .155, y0 + 1.02 + (k > .5 ? .30 : 0), z + .12, .12, .19, .07,
            [C('#b8443a'), C('#3d7a4a'), C('#d8b23f'), C('#3f6f8c')][i % 4],
            { hard: true, gloss: .30 });
        }
        emit(box(x, y0 + 1.36, z + .11, w - .14, .06, .03, LAMPW, { hard: true, mode: 1 }),
          .55, H.shop);
        lamp(M.trs(x, .03, BLK + 1.10, 0, 3.40, 1, 2.20), C('#ffc98a'), .26, H.lit);
      }
      box(x, y0 + hgt + .20, z + .13, w + .08, .32, .05, board, { hard: true, gloss: .24 });
      // The sign: characters mode 1 and NOT emissive, the board behind them glowing. Five glyphs
      // each carrying a light mask of their own is the room-wide haze this project has paid for.
      glyphs(x, y0 + hgt + .20, z + .17, 0, name,
        { size: .21, gap: .07, color: col.cream, mode: 1, lift: .008 });
      glyphs(x, y0 + hgt - .12, z + .17, 0, sub,
        { size: .105, gap: .040, color: C('#c9c2ae'), mode: 1, lift: .008 });
      if (stock)
        emit(box(x, y0 + hgt + .20, z + .145, w + .04, .26, .02, board, { hard: true, mode: 1 }),
          .30, H.lit);
      return { x, w, top: y0 + hgt + .02, zf };
    };
    // The east end of the courtyard wall was where this wanted to be — a corner shop belongs on a
    // corner — but js/street-civic.js's metro mouth now occupies x 20.9..23.1 out to z 3.60, and a
    // hatch inside a subway entrance is worse than a hatch in the wrong place.
    // A terrace of three, west of the noodle shop, on a 1.86 m pitch — 20 cm of render between
    // housings, which is what a row of lock-ups actually is. The pitch is not a taste decision:
    // the block's ground floor is FULL, and this is the only run of face that holds three.
    //
    //   -16.50            NB.x0, the block's west corner
    //   -16.07 .. -15.00  street.js's wallJunk(-15.6): hose, tarpaulin, a bundle of cane
    //   -14.90 .. -9.52   these three
    //    -9.50 .. -4.50   老李面馆's frontage
    //
    // 小卖部 used to stand at -6.20 — 1.66 m of housing and a travelling shutter built straight
    // through the noodle shop's west window and its 牛肉面 glass, in the middle of the one view
    // every player walks out of their own door into. 打印复印 at -10.60 swallowed street.js's
    // gas riser at -10.9 the same way. Both risers have moved to where they can be seen; see
    // street.js's services block.
    //
    // Which shop goes where: the one with the light on is nearest the way home.
    const shoe = lockup(-14.07, '修鞋配钥匙', '换拉链 · 打鞋掌', C('#2f5f6a'));
    const print = lockup(-12.21, '打印复印', '照片 · 传真 · 塑封', C('#8a3c33'));
    const kiosk = lockup(-10.35, '杨柳小卖部', '烟酒 · 冷饮 · 话费充值', col.red, true);

    // Each shutter is one box carrying the corrugated-steel sample, whose y-scale and y-centre the
    // tick drives. The roll it comes off and the guides either side do not move. One prop apiece,
    // which is what makes "one by one" cost three matrix writes an evening.
    const shutter = (k, depth, opens, shuts) => {
      const hgt = k.top - .06;
      box(k.x, k.top + .10, k.zf + depth * .30, k.w + .16, .20, .18, col.steelD,
        { hard: true, gloss: .36 });
      // The guides stand a clear 50 mm proud of the shutter they hold, which is what a channel
      // does and, more to the point, is what keeps two parallel faces off the same plane.
      for (const s of [-1, 1])
        box(k.x + s * (k.w / 2 + .04), k.top / 2, k.zf + depth * 1.6, .06, k.top, .12,
          col.steelD, { hard: true, gloss: .34 });
      const p = box(k.x, k.top - hgt / 2, k.zf + depth, k.w, hgt, .05, col.steel,
        { hard: true, gloss: .40, mat: 'steel', matScale: .55, matAmt: .40 });
      SHUTTERS.push({ p, x: k.x, top: k.top, z: k.zf + depth, w: k.w, h: hgt, opens, shuts, u: -1 });
    };
    shutter(kiosk, .03, 6.50, 21.10);
    shutter(shoe, .03, 8.60, 18.70);
    shutter(print, .03, 8.90, 19.40);

    // The line of light that gets out under a shutter which is down but not asleep. This is most
    // of what a hutong looks like at eleven: not darkness, but the two or three places somebody
    // is still up behind a steel door.
    emit(box(kiosk.x, .07, kiosk.zf + .06, kiosk.w - .10, .045, .02, LAMPW,
      { hard: true, mode: 1 }), .70, H.slit);

    // ================================================================================= the day
    // Everything below belongs to an hour. `open()` / `close(window)` bracket each group and the
    // tick writes its matrices exactly twice a day.

    // ---- 08:00 晒被子. Quilts over the wall while the sun is on it. Nothing says more about a
    // Chinese street in the middle of the day, and nothing at all says it at five in the evening.
    open();
    (() => {
      // The coping is 42 cm thick (z 3.74..4.16), so a quilt folded over it caps the whole width
      // and falls down the alley face with a 10 mm gap — hung off `WALL - .30` it floated a
      // third of a metre clear of the wall it was supposed to be draped over.
      const zc = 3.95, zf = WALL - .06, T = { tag: '被子' };
      [[9.10, QUILT1, 1.30], [10.62, QUILT2, 1.12], [11.90, QUILT3, .74]].forEach(([x, c, w], i) => {
        const drop = 1.00 - i * .07;
        box(x, WTOP + .06, zc, w, .13, .52, c,
          { mode: 7, gloss: G.fabric, round: .06, ...T });        // folded over the coping
        box(x, WTOP - drop / 2, zf, w, drop, .10, c,
          { mode: 7, gloss: G.fabric, round: .03, rz: (jit(x, i) - .5) * .03, ...T });
        for (let s = 0; s < 3; s++)                               // the quilting, three lines of it
          box(x, WTOP - .18 - s * (drop / 3.4), zf - .065, w * .94, .015, .012,
            [c[0] * .82, c[1] * .82, c[2] * .82],
            { hard: true, mode: 7, gloss: G.fabric, ...T });
      });
      box(13.00, WTOP + .13, zc, .58, .20, .34, ENAMEL, { mode: 7, gloss: G.fabric, round: .09 });
      box(13.62, WTOP + .12, zc, .38, .18, .32, C('#c2b48c'),
        { mode: 7, gloss: G.fabric, round: .08 });
      timed(thing('被子', 10.60, 2.20, 3.02, '被子晒在墙头上，晚上收。',
        'The bedding is out on the wall. It comes in at night.',
        '被子 bèizi is a quilt. 晒 shài is to put something out in the sun.',
        { focus: [10.60, 2.80], reach: 2.6 }), H.quilt);
    })();
    close(H.quilt);

    // ---- 07:30 the third line of washing — the one that gets taken in. street.js hangs two lines
    // which are up at three in the morning; this one goes out after breakfast and is gone before
    // dark, which is the only thing that makes the other two read as washing rather than bunting.
    open();
    (() => {
      // At x -19.6, not 2.86. This line hung across the alley at y 2.4..3.0 directly in front of
      // 幸福超市's frontage and the 夜市 gateway — a metre and a half from the camera in the one
      // view where you read the shop's name, which since the fascia datum landed starts at 3.12
      // and was completely covered by it. street.js moved its two for the same reason; all three
      // are west of x -9.5 now, where the hutong has no shopfront on either side.
      const y = 3.02, z = 1.62, first = P.length;
      cap(-18.00, y + .06, z, .016, 4.60, .016, col.steel, { rz: Math.PI / 2 - .025, gloss: .30 });
      const kinds = [C('#e7e3d8'), C('#7f96a8'), C('#a8695c'), C('#6f8f8c'), C('#c9c2ae')];
      for (let i = 0; i < 5; i++) {
        const x = -19.60 + i * .80, c = kinds[i];
        const O = { mode: 7, gloss: G.fabric, round: .02, ry: ((i * 7) % 5 - 2) * .04, tag: '衣服' };
        if (i % 2) {
          box(x, y - .40, z, .44, .76, .05, c, O);                 // a towel or a sheet
        } else {
          box(x, y - .32, z, .34, .50, .05, c, O);                 // a shirt, sleeves hanging out
          for (const s of [-1, 1]) {
            box(x + s * .25, y - .24, z, .19, .15, .05, c, { ...O, rz: -s * .5 });
            box(x + s * .32, y - .44, z, .13, .30, .05, c, O);
          }
          box(x, y - .06, z, .26, .05, .05, c, O);
          cap(x, y + .01, z, .012, .14, .012, col.steel, { rz: -.90, gloss: .34 });
        }
        for (const s of [-1, 1])                                   // pegs, gripping the line
          box(x + s * .095, y + .075, z, .032, .065, .04,
            [col.plastic, col.paintY, col.blue][(i + (s > 0 ? 1 : 0)) % 3],
            { hard: true, gloss: .34 });
      }
      const props = P.slice(first);
      WASH.push({ props, m0: props.map(p => p.m), y: y + .06, phase: 1.1, set: null });
    })();
    WASH[WASH.length - 1].set = close(H.wash);

    // ---- 10:00 the cat. street.js has one on the wall at x 5.4, sitting up; this is the other
    // thing a cat does, which is find the exact stretch of coping the sun has been on longest and
    // become a circle on it. Gone by five, when the wall goes cold.
    open();
    (() => {
      const x = 16.40, y = WTOP + .13, z = WALL + .14, T = { tag: '猫' };
      ball(x, y, z, .27, .13, .21, FUR, { gloss: .16, ry: .35, ...T });
      ball(x + .19, y + .04, z - .12, .12, .10, .11, FURW, { gloss: .16, ...T });   // head, tucked in
      for (const s of [-1, 1])
        box(x + .22 + s * .05, y + .13, z - .14, .05, .06, .045, FURD,
          { hard: true, rz: s * .30, ...T });
      ball(x - .06, y + .05, z + .05, .16, .07, .12, FURW, { gloss: .16, ry: .50, ...T });
      for (let i = 0; i < 5; i++)                                  // the tail, round the front
        cap(x - .22 + Math.sin(i * .70) * .18, y - .02, z - .10 - Math.cos(i * .70) * .16,
          .038, .13, .038, i % 2 ? FUR : FURD,
          { rz: Math.PI / 2, ry: i * .70, gloss: .16, ...T });
      timed(thing('猫', x, y + .30, 3.02, '那只猫每天中午都睡在墙头上。',
        'That cat sleeps on top of the wall every lunchtime.',
        '一只猫 — 只 zhī is the measure word for most animals.',
        { focus: [x, 2.90], reach: 2.6 }), H.cat);
    })();
    close(H.cat);

    // ---- 11:30 the 躺椅. Somebody's father asleep in a bamboo recliner by the door with a hat
    // over his face, from after lunch until the shadow reaches him. The man is on the roster at
    // the bottom of this file; this is the chair, the hat, the tea and the fan. The back is on the
    // wall side so he faces out into the alley, which is the whole point of sitting there.
    open();
    (() => {
      // x -3.20, not -1.00. At -1.00 the recliner stood dead centre of the 单元门 — its canopy
      // runs -1.75 .. 1.75 — so the first thing the player saw on stepping out of their own front
      // door, every single time, was the back of a bamboo chair. -3.20 keeps it against a wall
      // (the noodle shop's east pier), keeps it facing out into the alley, and clears both the
      // canopy by 1.15 m and street-retail.js's drinks cabinet at -4.45 .. -3.79 by 0.29 m.
      const x = -3.20, z = BLK + .40;
      for (const s of [-1, 1]) {
        cap(x + s * .30, .30, z + .10, .022, .72, .022, BAMBOO, { rx: Math.PI / 2, gloss: G.wood });
        cap(x + s * .30, .50, z - .32, .022, .62, .022, BAMBOO, { rx: .90, gloss: G.wood });
        cap(x + s * .30, .16, z + .38, .020, .32, .020, BAMBOOD, { rz: s * .20, gloss: G.wood });
        cap(x + s * .30, .16, z - .16, .020, .32, .020, BAMBOOD, { rz: -s * .20, gloss: G.wood });
      }
      for (let i = 0; i < 7; i++)                                  // the woven seat
        cap(x, .30, z - .18 + i * .095, .012, .60, .012, i % 2 ? BAMBOO : BAMBOOD,
          { rz: Math.PI / 2, gloss: G.wood });
      // A thin load-bearing woven pan sits directly beneath the visible bamboo slats.  Besides
      // making the recliner physically credible, it gives the seating resolver a horizontal top
      // instead of asking it to infer support from seven rotated capsules.
      box(x, .30, z + .10, .58, .04, .58, BAMBOOD,
        { hard:true, mode:7, gloss:G.wood, tag:'躺椅' });
      for (let i = 0; i < 6; i++)                                  // and the reclined back
        cap(x, .34 + i * .105, z - .26 - i * .070, .012, .60, .012, i % 2 ? BAMBOO : BAMBOOD,
          { rz: Math.PI / 2, gloss: G.wood });
      ball(x + .42, .62, z + .06, .19, .07, .19, C('#d8c68e'), { gloss: .14, rz: .28 });
      cyl(x + .42, .68, z + .06, .09, .10, C('#c6b078'), { gloss: .14, rz: .28 });
      cyl(x - .54, .12, z + .16, .045, .24, C('#8a7a3c'), { gloss: .62, alpha: .85 });
      cyl(x - .54, .25, z + .16, .048, .02, C('#b8443a'), { gloss: .50 });
      box(x - .68, .015, z + .30, .20, .03, .24, C('#3d7a8c'), { hard: true, gloss: .30, ry: .50 });
    })();
    close(H.nap);

    // ---- 17:45 广场舞. The single most recognisable evening sight in urban China, and the game did
    // not have it. The women are people, on the roster below; what is built here is the reason
    // they are standing in the middle of an alley — a speaker the size of a suitcase on a folding
    // luggage trolley, on an extension lead run out of somebody's window, and the pile of handbags
    // and water bottles that always sits behind it.
    // MOVED to 杨柳西口, the square at the dead end (zone x -32.2..-25.0, z -3.10..6.40). Six
    // women cannot dance in a hutong 5.70 m wide whose narrowest clear slice is 1.25 m — they
    // were standing across the only line through it, which is also the line js/street-cycles.js
    // rides bicycles down. The square is 7.2 × 9.5 m and had a chess table in one corner and
    // nothing else in it. This is what a 广场 is for; the alley never was one.
    open();
    (() => {
      const x = -28.60, z = 4.60;
      for (const s of [-1, 1])                                     // the trolley
        cyl(x + s * .22, .075, z + .10, .075, .05, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
      box(x, .13, z + .08, .56, .04, .34, col.steelD, { hard: true, gloss: .40 });
      for (const s of [-1, 1])
        cap(x + s * .21, .58, z + .20, .016, .92, .016, GALV, { rz: s * .04, gloss: G.metal });
      cap(x, 1.03, z + .20, .016, .42, .016, GALV, { rz: Math.PI / 2, gloss: G.metal });
      box(x, .46, z, .52, .62, .38, C('#26292c'), { hard: true, gloss: .26, tag: '音箱' });
      box(x, .78, z, .46, .04, .34, C('#33383d'), { hard: true, gloss: .32, tag: '音箱' });
      cyl(x, .40, z - .20, .155, .04, C('#3d4348'),
        { rx: Math.PI / 2, gloss: .34, tag: '广场舞' });            // the big driver, facing out
      cyl(x, .40, z - .218, .125, .02, C('#15181a'),
        { rx: Math.PI / 2, mode: 11, gloss: .10, tag: '广场舞' });
      cyl(x, .66, z - .20, .075, .04, C('#3d4348'), { rx: Math.PI / 2, gloss: .34, tag: '音箱' });
      for (const s of [-1, 1])                                     // the radio mic clipped on top
        box(x + s * .16, .82, z + .04, .03, .05, .03, C('#b03a2e'),
          { hard: true, mode: 1, gloss: .40 });
      cap(x + .12, .84, z + .02, .012, .22, .012, col.charcoal, { rz: .50, gloss: .30 });
      // The lead runs WEST now, to the two-storey building that closes the dead end at x -33.4.
      // Run east it left the square at x -22.7 and lay in the courtyards behind the alley wall,
      // where there is no window for it to have come out of. Six segments, not nine: the wall is
      // 4.8 m away, not 6.7.
      for (let i = 0; i < 6; i++)
        cap(x - .30 - i * .70, .022, z + .18 + Math.sin(i * 1.3) * .06, .009, .70, .009,
          C('#e0dbcf'), { rz: Math.PI / 2 + (jit(i, x) - .5) * .10, gloss: .26 });
      box(x - 4.70, .05, z + .20, .16, .07, .10, C('#e6e1d4'), { hard: true, gloss: .30 });
      [[-.90, C('#6a3c4a'), .22], [-.62, C('#3d4a5c'), .18], [-1.16, C('#7a6a3c'), .16]]
        .forEach(([ox, c, r]) => {                                 // nobody dances holding her bag
          ball(x + ox, r * .80, z - .06, r, r * .80, r * .70, c, { mode: 7, gloss: .10 });
          cap(x + ox, r * 1.50, z - .06, .012, r * .90, .012,
            [c[0] * .70, c[1] * .70, c[2] * .70], { rz: Math.PI / 2, gloss: .12 });
        });
      for (let i = 0; i < 4; i++)
        cyl(x - 1.50 + i * .17, .105, z - .10 + (jit(i, 5) - .5) * .12, .033, .21,
          i % 2 ? C('#bcd6dc') : C('#d8dcc6'), { gloss: .62, alpha: .80 });
      // Both of these carried the old pitch's z and one of them its x as a literal, so they stayed
      // in the hutong when the speaker left it. Written off `x`/`z` now, which is the only way a
      // label and the thing it labels can never be in two places again.
      timed(thing('音箱', x, .70, z - .26, '音箱一响，大妈们就来了。',
        'The speaker starts up and the aunties arrive.',
        '音 sound + 箱 box. This is what 广场舞 runs on.',
        { focus: [x, z - .58], reach: 2.2 }), H.speaker);
      timed(thing('广场舞', x - 1.00, .90, z - .38, '她们每天晚上都在这儿跳广场舞。',
        'They dance out here every evening.',
        '广场舞 guǎngchǎngwǔ — square dancing. Every open space in China has one at seven.',
        { focus: [x + .70, z - 2.28], reach: 2.6 }), H.speaker);
    })();
    close(H.speaker);

    // ---- 18:30 the stools come out. 马扎, the folding canvas stool everybody in this city owns:
    // three of them and a crate for a table, with a thermos, a deck of cards and a phone lying
    // face up. The phone is the last light in the alley and it is on a window of its own.
    open();
    (() => {
      // In 杨柳西口 now, three metres east of street-west.js's chess table at (-30.75, -2.05),
      // which is what Blueprint 4.4 means by "round the same table": near enough to be the same
      // gathering, far enough that two sets of stools are not inside each other.
      const x = -27.60, z = -1.60;
      const mazha = (sx, sz, ry, canvas) => {
        for (const s of [-1, 1]) {
          cap(sx + Math.cos(ry) * s * .16, .16, sz + Math.sin(ry) * s * .16, .014, .38, .014,
            BAMBOOD, { rz: s * .30, ry, gloss: G.wood });
          cap(sx + Math.cos(ry) * s * .16, .16, sz + Math.sin(ry) * s * .16, .014, .38, .014,
            BAMBOOD, { rz: -s * .30, ry, gloss: G.wood });
        }
        box(sx, .32, sz, .30, .035, .22, canvas, { mode: 7, gloss: G.fabric, ry, round: .02 });
      };
      mazha(x - .52, z - .10, .30, C('#2f5f7a'));
      mazha(x + .10, z - .22, -.50, C('#7a3a3f'));
      mazha(x + .62, z - .04, .90, C('#5c6248'));
      box(x + .06, .17, z + .16, .48, .34, .38, C('#8a7a3c'), { hard: true, gloss: .22, ry: .10 });
      box(x + .06, .35, z + .16, .52, .02, .42, C('#a08d63'), { hard: true, gloss: .20, ry: .10 });
      cyl(x - .10, .48, z + .14, .045, .24, C('#b8443a'), { gloss: .34 });      // the thermos
      cyl(x - .10, .61, z + .14, .036, .03, col.steel, { gloss: .50 });
      for (let i = 0; i < 6; i++)                                               // the cards
        box(x + .18 + (jit(i, 3) - .5) * .10, .365 + i * .003,
          z + .22 + (jit(i, 9) - .5) * .08, .055, .003, .080, i % 3 ? ENAMEL : C('#c9443a'),
          { hard: true, gloss: .18, ry: (jit(i, 7) - .5) * 1.4 });
      for (const [tx, tz] of [[x - .34, z + .30], [x + .34, z + .26]]) {        // tea glasses
        cyl(tx, .42, tz, .034, .13, C('#8a7a3c'), { gloss: .60, alpha: .82 });
        cyl(tx, .49, tz, .036, .012, C('#3d5f3a'), { gloss: .40 });
      }
    })();
    close(H.stools);

    open();
    (() => {                                                       // the phone, face up on the crate
      emit(box(-4.10, .372, 3.34, .075, .005, .145, C('#cfe4f2'),
        { hard: true, mode: 1, ry: .34 }), .55, H.phone);
      lamp(M.trs(-4.10, .045, 3.30, 0, .90, 1, .80), C('#a8c8e8'), .10, H.phone);
    })();
    close(H.phone);

    // ---- 18:45 象棋. Two men, a board and a bulb on a flex hooked over a nail — which is what a
    // hutong looks like at nine at night, and the reason a street with the lights out is not the
    // same thing as a street with nobody in it. Against the wall west of the block, where the
    // 0.80 m strip means the game can be played without narrowing the alley by a centimetre.
    open();
    (() => {
      const x = -17.60, z = BLK + .33;
      box(x, .33, z, .74, .05, .58, BAKE, { hard: true, gloss: .22 });          // the table
      for (const [ox, oz] of [[-.30, -.22], [.30, -.22], [-.30, .22], [.30, .22]])
        cap(x + ox, .16, z + oz, .018, .32, .018, C('#6a5a44'), { gloss: G.wood });
      box(x, .362, z, .48, .012, .46, C('#c9a86a'), { hard: true, mode: 6, gloss: .18 });
      for (let i = 0; i < 5; i++)                                               // the grid
        box(x, .371, z - .19 + i * .095, .44, .002, .006, C('#6a4a2c'), { hard: true, gloss: .10 });
      for (let i = 0; i < 5; i++)
        box(x - .19 + i * .095, .371, z, .006, .002, .42, C('#6a4a2c'), { hard: true, gloss: .10 });
      box(x, .373, z, .46, .003, .085, C('#c9a86a'), { hard: true, gloss: .18 });   // 楚河汉界
      for (let i = 0; i < 22; i++) {                                            // the pieces
        const k = jit(i * 1.7, x), k2 = jit(i * 3.1, z);
        cyl(x - .20 + (i % 8) * .058 + (k - .5) * .02, .383,
          z - .20 + (((i / 8) | 0) * .13) + (k2 - .5) * .05,
          .026, .014, i % 2 ? C('#d8c49a') : C('#a8763f'), { gloss: .26 });
      }
      for (const s of [-1, 1]) {                                               // the two stools
        cyl(x + s * .70, .16, z - .04, .14, .32, C('#8a6a3c'), { gloss: G.wood });
        cyl(x + s * .70, .33, z - .04, .155, .03, C('#a08048'), { gloss: G.wood });
      }
      cyl(x, .42, z - .24, .045, .11, C('#3d6f5a'), { gloss: .36 });            // the tea tin
      // The bulb: a flex off a nail in the wall, a bakelite holder, a tin shade and a bare forty
      // watt. Emissive lamp *and* a pool, because one without the other is either a light that
      // lights nothing or a patch of bright ground with no reason to be bright.
      cap(x + .90, 2.30, z - .30, .008, 1.20, .008, WIRE, { rz: -1.28, gloss: .24 });
      cap(x + .06, 2.02, z - .30, .008, .60, .008, WIRE, { rz: .06, gloss: .24 });
      cyl(x + .06, 1.70, z - .30, .022, .07, BAKE, { gloss: .28 });
      emit(ball(x + .06, 1.62, z - .30, .045, .058, .045, LAMPW, { mode: 1 }), .90, H.chess);
      ball(x + .06, 1.745, z - .30, .105, .07, .105, C('#4a4f55'), { gloss: .42 });
      lamp(M.trs(x + .06, .03, z - .20, 0, 3.00, 1, 2.40), C('#ffc07a'), .34, H.chess);
    })();
    close(H.chess);

    // ---- 18:25 the gate lamps. Not street lights — a bulb in a wire cage over somebody's own
    // door, which is where most of the light in a hutong after dark comes from. The one over the
    // second courtyard goes off at eleven; the one over your own gate is the lamp that is still
    // burning at five in the morning, and after the shutters are down it is most of what is left.
    for (const [gx, win] of [[.20, H.night], [13.80, H.gate]]) {
      open();
      cap(gx, 2.74, WALL - .16, .014, .34, .014, col.steelD, { rx: 1.00, gloss: G.metal });
      cyl(gx, 2.60, WALL - .40, .055, .06, BAKE, { gloss: .28 });
      emit(ball(gx, 2.51, WALL - .40, .048, .060, .048, LAMPW, { mode: 1 }), .85, win);
      for (let i = 0; i < 6; i++)                                              // the wire cage
        cap(gx + Math.cos(i * 1.047) * .07, 2.50, WALL - .40 + Math.sin(i * 1.047) * .07,
          .006, .16, .006, col.steelD, { gloss: .34 });
      lamp(M.trs(gx, .03, WALL - 1.10, 0, 2.80, 1, 2.20), C('#ffcf96'), .28, win);
      close(win);
    }

    // Everything above is up as it is built, and the first tick puts the clock on it. That is
    // street.js's own contract for the breakfast cart (`stallUp = null`): a scene rendered without
    // ever being ticked shows the whole day at once, which is what an audit shot wants, and a
    // scene that is running is correct from the first frame the loop reaches it.
  };

  // ================================================================================= 动 the tick
  StreetFit['alley'].tick = (t, body, mins) => {
    if (mins !== undefined) {
      const h = (mins / 60) % 24;

      // ---- the hour-windowed groups. Written on the frame the answer changes and on no other:
      // some six hundred matrices across the file, each moving twice a day.
      for (const s of SETS) {
        const up = within(h, s.h0, s.h1);
        if (up === s.on) continue;
        s.on = up;
        for (let i = 0; i < s.props.length; i++) s.props[i].m = up ? s.m0[i] : HIDDEN;
      }
      // and the words that go with them. A label over a quilt that came in at half past four is
      // the same defect as the quilt still being there.
      for (const q of THINGS) {
        const up = within(h, q.h0, q.h1);
        if (up === q.on) continue;
        q.on = up;
        q.th.reach = up ? q.r0 : -1;
      }

      // ---- the lamps, cross-fading. Quantised to five game-minutes, so an evening costs about
      // twenty writes and the rest of the day costs none.
      const q = Math.round(h * 12);
      if (q !== dusk) {
        dusk = q;
        for (const l of LAMPS) l.g.a = l.a * fade(h, l.h0, l.h1);
        for (const e of EMIT) e.p.glow = e.k * fade(h, e.h0, e.h1);
      }

      // ---- 卷帘门, coming down one by one: 修鞋 at 18:42, 打印复印 at 19:24, the 小卖部 at 21:06.
      // Each takes twelve game-minutes to travel, so the alley shuts over two and a half hours the
      // way a real one does rather than the way a light switch does.
      for (const s of SHUTTERS) {
        const down = s.shuts > s.opens ? (h >= s.shuts || h < s.opens)
                                       : (h >= s.shuts && h < s.opens);
        const since = e => (h - e < 0 ? h - e + 24 : h - e);
        let u = down ? Math.min(1, since(s.shuts) / SLIDE)
                     : Math.max(0, 1 - since(s.opens) / SLIDE);
        u = Math.max(.05, Math.min(1, u));
        if (Math.abs(u - s.u) < .012) continue;
        s.u = u;
        const hh = s.h * u;
        s.p.m = M.trs(s.x, s.top - hh / 2, s.z, 0, s.w, hh, .05);
      }

      // ---- the people, if there is a door for them. `StreetCast` above is the way in and needs
      // its one line in game.js; this is the other one, taken the moment it exists — the metro's
      // commuters and the train's passengers already arrive through `addNPC` long after the
      // roster was walked, so a district's cast can too. `n.th` is what `initNPC` leaves behind,
      // so a cast that game.js has already folded in is never offered twice.
      if (!cast) {
        cast = true;
        const g = window.__game;
        if (g && typeof g.addNPC === 'function' && CAST.length && !CAST[0].th)
          for (const n of CAST) {
            try { g.addNPC(n); } catch (e) { console.error('alley cast: ' + (e && e.message)); }
          }
      }
    }

    // ---- 衣服, swung from the line rather than translated: a shirt pegged to a line pivots about
    // the pegs. The only thing in this file that writes every frame, and it writes nothing at all
    // once the line has been taken in.
    for (const w of WASH) {
      if (w.set && !w.set.on) continue;
      const a = Math.sin(t * 1.05 + w.phase) * .052 + Math.sin(t * 2.40 + w.phase * 2) * .015;
      // Pivot on each garment's own pegs, not on the world origin — see the same fix and the
      // same reason in street.js's `tick`. This line hangs at x 2.86..6.06, so the old pivot
      // threw it up to 0.41 m up and down as a block.
      const R = M.rotZ(a), ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < w.props.length; i++) {
        const m0 = w.m0[i], m = M.mul(R, m0), dy = m0[13] - w.y;
        m[12] = m0[12] - dy * sa;
        m[13] = w.y + dy * ca;
        w.props[i].m = m;
      }
    }
  };

  // ---------------------------------------------------------------- the alley's cast
  //
  // Facing convention: the body's forward is (sin yaw, cos yaw). Checked against 李师傅 at the
  // repair pitch (data.js, spot [-16.9, -1.15] face 0.4), who works against the south wall looking
  // into the alley — the only reading of the two that puts him the right way round.
  (function addPeople() {

    // ---- 广场舞. Six women, two rows of three with the one who knows the routine out in front,
    // all facing the speaker against the north wall. `act:'dance'` is the pose game.js:3038 already
    // carries — the park's dancers are the reason it exists — and a single `spots` window means
    // `npcAwake` has them off the street entirely outside it. Six bodies between six and eight in
    // the evening, and none at any other hour of the day.
    // The pitch is in 杨柳西口 now — see the speaker above. Every dancer is offset by the same
    // (-22.60, +1.32) the speaker moved by, so the formation, the spacing and the way each of them
    // faces the box are bit-identical to what was shipped; only the ground under it changed.
    const SPK = [-28.60, 4.60];
    const face = (x, z) => Math.atan2(SPK[0] - x, SPK[1] - z);
    const DANCERS = [
      // out in front, in the one bright thing she owns, because they always are
      [-27.90, 3.42, { skin:'#dcae86', hair:'#6b625a', hairStyle:'perm', top:'#c0485a',
                      pants:'#39414d', shoe:'#e8e2d6', sleeve:'short', collar:'polo',
                      tall:0.92, wide:1.10, headScale:0.99, stoop:0.04, age:0.62, faceSeed:307 }],
      [-29.05, 2.37, { skin:'#d3a179', hair:'#b0aba2', hairStyle:'perm', top:'#4f7a68',
                      pants:'#3a4148', shoe:'#dfd8ca', sleeve:'short', collar:'polo',
                      hat:'sun', hatColor:'#ded4b8',
                      tall:0.88, wide:1.13, headScale:0.98, stoop:0.13, age:0.81, faceSeed:311 }],
      [-27.90, 2.37, { skin:'#e0b48c', hair:'#443c38', hairStyle:'bob', top:'#a8874e',
                      pants:'#333a44', shoe:'#e4ded0', sleeve:'short', collar:'polo',
                      tall:0.96, wide:1.03, headScale:1.00, age:0.42, faceSeed:313 }],
      [-26.75, 2.37, { skin:'#cba078', hair:'#6f665d', hairStyle:'perm', top:'#8a4a7a',
                      pants:'#39414b', shoe:'#e8e2d6', sleeve:'short', collar:'polo',
                      vest:'#5c6248',
                      tall:0.91, wide:1.12, headScale:0.99, stoop:0.08, age:0.70, faceSeed:317 }],
      [-28.70, 1.12, { skin:'#dcae86', hair:'#7a716a', hairStyle:'bun', top:'#3f6f8c',
                       pants:'#3a4148', shoe:'#d8d2c0', sleeve:'short',
                       tall:0.94, wide:1.06, headScale:1.00, age:0.55, faceSeed:331 }],
      [-27.15, 1.12, { skin:'#c9915f', hair:'#524a42', hairStyle:'perm', top:'#d8b23f',
                       pants:'#2f3742', shoe:'#e4ded0', sleeve:'short', collar:'polo',
                       hat:'visor', hatColor:'#e4dcc4',
                       tall:0.90, wide:1.14, headScale:1.01, stoop:0.06, age:0.66, faceSeed:337 }],
    ];
    DANCERS.forEach(([x, z, look], i) => CAST.push({
      hz: '大妈', place: 'street', look,
      temper: ['genial', 'steady', 'brash', 'genial', 'steady', 'genial'][i],
      // Six women on one beat is a chorus line; six a quarter-second apart is a hutong. The
      // spread comes from the pace, which the pose reads as the tempo of the step.
      speed: 0.90 + (i % 3) * 0.04,
      spots: [{ h0: H.dance[0], h1: H.dance[1], at: [x, z], face: face(x, z), act: 'dance' }],
    }));

    // ---- 上学. Three children with satchels and the grandmother walking the smallest, down the
    // alley between ten to seven and twenty past eight and gone for the rest of the day.
    // `patrol` + `hours` is 豆豆's own pattern (data.js:135). The route is z ≈ -0.6, which is the
    // one line through this alley that is clear from x -27.0 to x 25.5.
    const KIDS = [
      [{ skin:'#eec39b', hair:'#241f1c', hairStyle:'tousled', top:'#d8443a', pants:'#39476a',
         shoe:'#e8e2d6', sleeve:'short', bag:'pack', bagColor:'#2f6f9c',
         tall:0.72, wide:0.82, youth:1, headScale:1.08, faceSeed:347 },
       1.32, [[-13.0, -0.60], [23.0, -0.52]]],
      [{ skin:'#e0b48c', hair:'#2b241f', hairStyle:'bob', top:'#e0a63a', pants:'#3a4a5c',
         shoe:'#d64f3f', sleeve:'short', bag:'pack', bagColor:'#b8443a',
         tall:0.76, wide:0.84, youth:1, headScale:1.07, faceSeed:349 },
       1.26, [[-9.4, -0.72], [22.0, -0.44]]],
      [{ skin:'#d3a179', hair:'#1f1b18', hairStyle:'short', top:'#3d7a6a', pants:'#2f3742',
         shoe:'#e4ded0', sleeve:'short', bag:'pack', bagColor:'#4f6f3a',
         tall:0.80, wide:0.86, youth:0.92, headScale:1.06, faceSeed:353 },
       1.20, [[-2.0, -0.66], [21.0, -0.58]]],
    ];
    KIDS.forEach(([look, speed, patrol]) => CAST.push({
      hz: '小孩', place: 'street', look, temper: 'eager', speed,
      hours: [H.school[0], H.school[1]], patrol,
    }));
    // The grandmother, on the same route at half the pace — which is what makes them a pair rather
    // than two people who happen to be going the same way.
    CAST.push({
      hz: '大妈', place: 'street', temper: 'steady', speed: 0.72,
      look: { skin:'#cba078', hair:'#b4afa6', hairStyle:'bun', top:'#8a8478', pants:'#3a4148',
              shoe:'#4a4f57', sleeve:'long', collar:'polo', vest:'#5a5f52',
              bag:'tote', bagColor:'#7a6a4a',
              tall:0.87, wide:1.08, headScale:0.99, stoop:0.16, age:0.84, faceSeed:359 },
      hours: [H.school[0], H.school[1]], patrol: [[-2.6, -0.50], [20.4, -0.62]],
    });

    // ---- 象棋. Two men over the board under the bulb, from a quarter to seven until the light
    // goes off. `seatY` puts them on the stools built above rather than on the paving.
    [[-18.30, '#c9915f', '#4b443d', 'buzz', '#9a958a'],
     [-16.90, '#d3a179', '#a8a29a', 'short', '#6a7480']].forEach(([x, skin, hair, style, top], i) => {
      CAST.push({
        hz: '大爷', place: 'street', temper: i ? 'steady' : 'brash', speed: 0.80,
        look: { skin, hair, hairStyle: style, top, pants:'#2f3742', shoe:'#3a3f45',
                sleeve: i ? 'short' : 'half', collar: 'shirt',
                beard: i ? 'stubble' : undefined, beardColor: '#8a857c',
                tall: 0.96 + i * .03, wide: 1.10, headScale: 1.02,
                stoop: 0.10 + i * .04, age: 0.74 + i * .06, faceSeed: 367 + i * 2 },
        seatY: 0.33,
        spots: [{ h0: H.chess[0], h1: H.chess[1] - .2, at: [x, -2.56],
                  face: i ? -Math.PI / 2 : Math.PI / 2, act: 'sit' }],
      });
    });

    // ---- and the man asleep in the bamboo chair after lunch, which is the whole of the midday
    // shift on this street: one person, not moving, in the shade, facing out.
    CAST.push({
      hz: '大爷', place: 'street', temper: 'steady', speed: 0.75,
      look: { skin:'#c08a5a', hair:'#9c968c', hairStyle:'short', top:'#d9d4c6',
              pants:'#4a5158', shoe:'#3a3f45', sleeve:'short', collar:'shirt',
              tall:0.99, wide:1.12, headScale:1.02, stoop:0.08, age:0.78, faceSeed:373 },
      seatY: 0.32,
      spots: [{ h0: H.nap[0] + .1, h1: H.nap[1] - .1, at: [-3.20, -2.40], face: 0, act: 'sit' }],
    });
  })();
})();
