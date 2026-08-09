// 商铺 — the parade's shops. StreetFit['retail'], see STREET.md.
//
// The shopfronts themselves are street.js's and stay there: the 超市 at x 7.6 with its awning and
// its crates, 老李面馆 at -7.0, the 五金电器 frontage at 17.8, the 夜市 gateway at 4.6, and 北京新
// 天地 across the road at z -9.2. This file is the difference between a wall with names on it and
// a row of shops that are open for business.
//
// What that difference actually is, in the order it reads from thirty metres:
//
//  1. **Signage in depth.** Every sign in the district before this one lay flat on its own wall,
//     so walking *along* the parade you saw a row of edges and could not read one of them. A
//     Chinese street is legible down its length because half its signs are 侧招 — box signs
//     cantilevered out at right angles — and that is what most of the sign work here is. The
//     panel is the lit part; the characters on it are `mode: 1` with **no glow**, because a
//     glowing glyph is a light-mask quad and three dozen of them lay a half-transparent copy of
//     the scene over the top of it. That is a mistake this project has already paid for once.
//  2. **Goods on the pavement.** A Chinese shop's stock starts outside its door. street.js has
//     `wallJunk` — crates, a gas bottle, a bucket and mop, a hose, bundled cardboard — piled at
//     seven measured points along the walls, and that is the *neighbourhood's* clutter. What was
//     missing is the *shop's*: a drinks fridge with the door propped open, mops and basins
//     outside the hardware shop, a trike being unloaded outside the 超市, a rail of dry-cleaning
//     across the road.
//  3. **Not every unit is trading.** One dead unit with 旺铺出租 and a phone number across the
//     shutter, one shutter half down over a shop that is closing up, and — after dark — a row
//     where the noodle place goes off at half nine, the 超市 at half ten, and the bulb behind the
//     dead unit's shutter burns all night. A parade where every front is lit at every hour is a
//     stage set.
//
// ---------------------------------------------------------------------------------------------
// The measurements everything here is built off, because nothing on this street may be placed by
// eye. Each was taken by driving the real `Street.clampMove` at r = 0.30, not by looking at it.
//
//   * The alley's walkable band is z -2.35 .. 3.35 and `clampMove` spends 0.30 m of it on the
//     body, so **the body can never get north of z = -2.05**, and the block's wall face is at
//     z = -2.95. The 90 cm strip along the shopfronts is therefore already unreachable, and
//     everything standing in it needs no collider at all. Goods that come further out than -2.10
//     do need one, and there are exactly three of those — the trike outside the 超市, the fridge
//     door outside the noodle shop and the mop bin outside the 五金 — because three chicanes in
//     fifty metres is a street and eight is an assault course. All three are measured below and
//     none leaves less than 3.35 m of clear run.
//   * The block's brick plinth stands 21 cm proud of the render: its face is z = -2.74 up to
//     y 1.40, and the render behind it is at -2.95. A poster stuck on "the wall" at -2.90 is a
//     poster inside the brickwork.
//   * The corner block at the east end is different again — its face is -3.05, its plinth -2.92
//     and the 五金电器 glass -2.855 — so the hardware shop measures off `HWG` and nothing else.
//   * The far pavement is 37.5 .. 41.5 but the road zone stops the body at x = 39.5, so the
//     parade's own frontage is permanently two metres out of reach. Everything added over there
//     sits at x >= 39.9, where it costs no walkable width and needs no collider — and that is
//     also why the far side gets signage and silhouettes rather than detail nobody can approach.
//     It stays west of x 40.78 as well, because that is where the parade's own door planters are
//     and their z positions come out of a seeded shuffle this file cannot see.
//
// Nothing here rebuilds anything street.js already draws. Where the shell already had what the
// brief asked for — the noodle shop's strip curtain, the courier's trike, the wall junk, the
// pole-to-pole cable run over the alley, the far parade's full-height shutters and its planters —
// it is left alone.
(() => {
  'use strict';

  // ---- what comes on after dark, and when.
  //
  // The shell's `setNight` walks its own `litProps` list, which is closed over inside street.js
  // and cannot be added to from out here. So this district drives its own lighting off the game
  // clock in its `tick`, which is better for the purpose anyway: `setNight` knows what the *sun*
  // is doing, and a shop sign goes off when the shop shuts, not when it gets dark.
  //
  // Written only when the state changes — four or five times a day, about forty property writes
  // each — never per frame.
  const lit = [];        // { p, g, key }  emissive panels
  const lamps = [];      // { l, key }     real point lights
  const pools = [];      // { g, a, key }  pools on the ground
  const led = { props: [], from: 0, span: 0, step: 0 };
  let phase = -1;

  // Trading hours, in decimal hours. These agree with what the street already says about itself
  // out loud: the shell's own 超市 line is 七点开门 and the breakfast stall's is 05:00–10:30.
  //
  // Rounded to the nearest half hour when the 营业时间 plates went up (STOREFRONT-UPGRADES A3).
  // Not cosmetic: a plate is generated from this table by `hm` below rather than written out, so
  // the plate and the lights can never disagree — and 06:48 is not a time any shop in China has
  // ever put on a door. The fiction the street already speaks out loud is unchanged and in two
  // places is now exactly true rather than nearly: the shell's 超市 line is 七点开门, and this
  // file's own header says the noodle place goes off at half nine and the 超市 at half ten.
  const HOURS = {
    shop:   [7.0, 22.5],    // 幸福超市 — first open, last but one shut
    noodle: [10.5, 21.5],   // 老李面馆 — lunch through supper
    hardw:  [7.5, 18.5],    // 五金电器 — a trade counter keeps trade hours
    mall:   [9.5, 22.0],    // 北京新天地
    parade: [8.5, 22.0],    // the small units on the far side
    dead:   [0, 24],        // the bulb behind the dead unit's shutter. Nobody turns it off.
  };
  // Decimal hours to what a door plate says. The only formatter, so the plates cannot drift.
  const hm = v => { const H = v | 0, M = Math.round((v - H) * 60);
                    return (H < 10 ? '0' : '') + H + ':' + (M < 10 ? '0' : '') + M; };
  // Dark enough for a sign to be worth switching on. Deliberately not the curve the sun is on:
  // shops put their signs up before it is properly dark and leave them on well after dawn.
  const isDark = h => h >= 18.1 || h < 6.5;
  const trading = (k, h) => { const r = HOURS[k]; return h >= r[0] && h < r[1]; };

  // A stable 0..1 hash off a position. The shell has its own copy and the reason is the same: a
  // call to the build's `rnd()` from out here would re-deal every later decision in the street,
  // down to which of the forty far units have their shutters down.
  const jit = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                          return h - Math.floor(h); };

  StreetFit['retail'] = S => {
    const { box, cyl, ball, taper, glyphs, solid, shade, glow, thing,
            cap, light, C, G, col, BLADE, BLADEH } = S;

    // ---- the coordinate contract, read off S and never re-measured.
    const EZ = S.NB.z1;              // -2.95  the block's shopfront plane
    const PLINTH = EZ + .21;         // -2.74  face of its brick plinth, y 0 .. 1.40
    const SHOP = S.SHOPX;            //  7.60  幸福超市
    const RSTE = -4.12;              //        the drinks cabinet, east of 老李面馆's door
    const HWG = -2.855;              //        五金电器's shopfront glass, front face
    const HWW = -3.05;               //        and the corner block's wall above it
    const MK = 4.60, MZ = 3.95;      //        the 夜市 gateway, in the courtyard wall line
    const FX = 41.6;                 //        the far building line
    const MLZ = -9.20;               //        北京新天地

    // A palette of its own, warmer and dirtier than the shell's architectural one: shop plastic,
    // enamel, galvanised steel and printed card are not the colours brick and render are.
    const RED = C('#a8342a'), REDD = C('#7c2419'), GOLD = C('#e2ba54'),
          CREAM = C('#e9dfc6'), PAPER = C('#d8d2c0'), INK = C('#2a2723'),
          WARM = C('#ffd79a'), COOL = C('#dfe9ee'), GREEN = C('#2f7a4f'),
          ORANGE = C('#d9762c'), PINK = C('#cf5f7a'), SKYB = C('#3f7fa8'),
          GALV = C('#a9aeb0'), TARP = C('#2f6a8c'), CARD = C('#a8926e'),
          BOTTLE = C('#8fb4b8'), BRASS = C('#b8a83f'),
          // The 门牌 enamel, taken off street-entry.js:90 and not re-picked. A house number
          // plate that is a different blue from the one on the 单元门 forty metres away is a
          // different council, which is the sort of thing nobody names and everybody reads.
          ENAM = C('#1f4f8f'), ENAMW = C('#eef2f5');
    const dim = (c, v) => [c[0] * v, c[1] * v, c[2] * v];

    // =========================================================================================
    // helpers
    // =========================================================================================

    // 侧招 — a projecting box sign, cantilevered off a wall at right angles so it can be read
    // down the length of the street rather than only from straight in front. Two variants,
    // because the two shop rows face different ways:
    //
    //   axis 'z'  the alley's north side. The wall faces +z, the sign projects along +z, and it
    //             is read on its ±x faces with the characters running down.
    //   axis 'x'  the far parade. The wall faces -x, the sign projects along -x, and it is read
    //             on its ±z faces with the characters running across.
    //
    // `z`/`x` is the wall face itself, so the sign always starts *at* the wall — a box sign that
    // begins ten centimetres out is a box sign floating in mid-air, which is what the first pass
    // at this looked like from the side. The panel is what glows; the characters carry no glow of
    // their own.
    //
    // The characters run ALONG the projection, not down it. On a face whose yaw is ±π/2 the
    // glyph helper's own +x maps to world ∓z — which is exactly the reading direction for
    // somebody standing on that side — so the two faces come out mirrored, which is what a
    // double-sided sign is. `vertical` would stack them in y instead, and on a panel 60 cm tall
    // that puts a two-character name half a metre above and below its own light box.
    function blade(axis, x, y, z, out, h, base, ink, text, key) {
      const T = .075, size = Math.min(h * .68, (out - .20) / text.length * .88);
      // CASE is the half-width of the red carcass and T the half-width of the lit panel, and
      // **CASE must be the smaller of the two**. It was not. The case was `T*2 + .05` = 0.200
      // wide over a 0.150 panel, so its own faces stood 12.5 mm outside the panel's and 12 mm
      // outside the glyphs' — and since every surface in this renderer is single-sided and the
      // case is opaque REDD, all three alley box signs shipped as blank red boxes with their
      // names sealed inside them. Reported off the west footway, where street-civic.js had
      // copied the same proportions, and re-derived here.
      //
      // Read out from the middle now: case ±.065, panel ±.075, glyphs ±.087. The case is still
      // 6 cm taller and 9 cm deeper than the panel, so what shows round the lit face is a red
      // returned edge — which is what a 侧招 looks like — rather than a red lid over it.
      const CASE = .065;
      let panel;
      if (axis === 'z') {
        // 10 cm wall plate, then a 10 mm gap, then the case: two faces on one plane is the
        // failure mode this district has to avoid more than any other.
        const cz = z + .11 + out / 2;
        box(x, y, z + .05, .22, h * .86, .10, col.steelD, { hard: true, gloss: .34 });
        box(x, y, cz, CASE * 2, h + .06, out, REDD, { hard: true, gloss: .26 });
        panel = box(x, y, cz, T * 2, h - .05, out - .09, base, { hard: true, mode: 1, gloss: .20 });
        for (const s of [-1, 1])
          glyphs(x + s * (T + .012), y, cz, s * Math.PI / 2, text,
            { size, gap: size * .20, color: ink, mode: 1, lift: .008 });
        for (const sy of [-1, 1])                      // stays, above and below the case
          cap(x, y + sy * (h / 2 + .07), cz - .01, .014, out * .98, .014,
            col.steelD, { rx: Math.PI / 2, gloss: G.metal });
      } else {
        const cx = x - .11 - out / 2;
        box(x - .05, y, z, .10, h * .86, .22, col.steelD, { hard: true, gloss: .34 });
        box(cx, y, z, out, h + .06, CASE * 2, REDD, { hard: true, gloss: .26 });
        panel = box(cx, y, z, out - .09, h - .05, T * 2, base, { hard: true, mode: 1, gloss: .20 });
        for (const s of [-1, 1])
          glyphs(cx, y, z + s * (T + .012), s > 0 ? 0 : Math.PI, text,
            { size, gap: size * .20, color: ink, mode: 1, lift: .008 });
        for (const sy of [-1, 1])
          cap(cx + .01, y + sy * (h / 2 + .07), z, .014, out * .98, .014,
            col.steelD, { rz: Math.PI / 2, gloss: G.metal });
      }
      lit.push({ p: panel, g: .34, key });
      return panel;
    }

    // A roller shutter in the district's own language: the corrugated-steel material inside the
    // slat battens laid over it, exactly as the far parade's full-height ones are done — the
    // material is the small ribs and the battens the large ones, and a shutter needs both.
    // `y0` is where the bottom rail stops, so the same helper draws one right down on the paving
    // and one halted at chest height over a shop that has not finished closing.
    function shutter(x, w, face, y0, yTop) {
      const h = yTop - y0, cy = (y0 + yTop) / 2;
      box(x, cy, face - .045, w, h, .09, col.steel,
        { hard: true, gloss: .40, mat: 'steel', matScale: .55, matAmt: .40 });
      const n = Math.max(5, Math.round(h / .195));
      for (let k = 0; k < n; k++)
        box(x, y0 + (k + .5) * (h / n), face + .012, w - .05, .05, .02, col.steelD,
          { hard: true, gloss: .34 });
      // The housing the curtain rolls into and the guides it runs in. Without the guides a
      // shutter is a sheet of steel hung in front of a window with daylight down both edges.
      box(x, yTop + .12, face - .055, w + .18, .19, .23, col.steelD, { hard: true, gloss: .36 });
      for (const s of [-1, 1])
        box(x + s * (w / 2 + .04), cy, face - .05, .07, h + .16, .13, col.steelD,
          { hard: true, gloss: .34 });
    }

    // 塑料门帘 — the clear plastic slat curtain in a working doorway, each strip hung at a
    // slightly different angle because a curtain walked through all day is never flat. Nine
    // strips: these are almost the only see-through quads the district adds, and see-through is
    // what costs on a fill-rate-bound street.
    function stripCurtain(x, y, z, w, h, n = 9) {
      const step = w / n;
      for (let i = 0; i < n; i++) {
        const k = jit(x + i, z * 3.1);
        box(x - w / 2 + (i + .5) * step, y, z, step * 1.16, h, .015, col.frame,
          { hard: true, mode: 1, alpha: .30, gloss: .5, ry: (k - .5) * .09 });
      }
    }

    // A stack of the perforated plastic crates every shop in China gets its stock in, with
    // something in the top one. Deliberately not `wallJunk`'s stack: those are empty and put away
    // against a wall, these are full and in the middle of being moved.
    function crateStack(x, y, z, n, c, fill, tag) {
      const T = tag ? { tag } : {};
      for (let i = 0; i < n; i++) {
        const k = jit(x + i * 2.3, z);
        const o = { hard: true, gloss: .28, ry: (k - .5) * .16, ...T };
        box(x, y + .095 + i * .19, z + (k - .5) * .06, .58, .19, .42, c, o);
        box(x, y + .186 + i * .19, z + (k - .5) * .06, .50, .014, .34, dim(c, .74), o);
      }
      if (!fill) return;
      const ty = y + n * .19;
      for (let i = 0; i < 6; i++)
        ball(x - .18 + (i % 3) * .18, ty + .06, z - .10 + ((i / 3) | 0) * .20,
          .082, .072, .082, fill, { gloss: .26, ...T });
    }

    // 空调外机 — a split-unit condenser on its bracket, the condensate pipe that runs down the
    // wall off it, and the stain the pipe has made. The stain is the half everybody leaves out
    // and it is the half that says the unit has been there ten years. `wallY` is where the render
    // starts, so the pipe and the wash stop before they disappear into a brick plinth.
    function condenser(x, y, z, wallY, tag) {
      const T = tag ? { tag } : {};
      box(x, y, z + .28, .84, .58, .40, col.white, { hard: true, gloss: .26, ...T });
      for (let i = -2; i <= 2; i++)
        box(x + i * .13, y, z + .49, .05, .44, .03, col.steelD, { hard: true, gloss: .3, ...T });
      for (const s of [-1, 1])
        box(x + s * .34, y - .34, z + .26, .06, .10, .34, col.steelD,
          { hard: true, gloss: .3, ...T });
      const drop = Math.max(.4, y - .34 - wallY);
      cap(x + .42, y - .34 - drop / 2, z + .11, .024, drop, .024, col.white, { gloss: .2, ...T });
      // The wash down the render under the drip. One quad, mode 1 with no glow — which in this
      // renderer is simply an unlit painted patch, so it is a stain and not a light.
      box(x + .46, y - .34 - drop / 2, z + .012, .17, drop, .006, C('#6f6a5f'),
        { hard: true, mode: 1, alpha: .55, gloss: .04 });
    }

    // -----------------------------------------------------------------------------------------
    // 门脸 — the small kit every Chinese shopfront carries and none of these had. Six helpers,
    // used from the shop sections below and from the block at the foot of this file.
    //
    // Every glyph in this kit is `mode: 1` with **no glow**, without exception. That is not
    // caution, it is the finding at the head of this file: a glowing glyph is a light-mask quad,
    // this district is fill-rate bound (`.audit.js:327`), and the kit lays down roughly two
    // hundred small quads. Two hundred *lit* ones would be a second half-transparent copy of the
    // alley. Nothing here is emissive and nothing here is added to `lit`.
    //
    // Nothing in the kit carries a collider either. Everything it places on the alley's north
    // side sits at z ≤ -2.34, and `clampMove` at r = 0.30 stops the body at z = -2.05, so the
    // whole kit stands in the 90 cm strip that was already unreachable. The walk is unchanged to
    // the millimetre — see the measurements against each placement below.

    // A facing direction, so one helper serves both the alley (yaw 0, faces +z) and the far
    // parade (yaw -π/2, faces -x). A quad at yaw ψ faces (sin ψ, 0, cos ψ).
    const fwd = ry => [Math.sin(ry), Math.cos(ry)];

    // 营业时间 — the hours plate beside a door. The times are FORMATTED OFF `HOURS` and never
    // written out, so a plate cannot drift from the hours the shop's own lights keep. Change the
    // table and every plate in the district changes with it.
    // The two times are STACKED and not run together with a dash, and that is a width
    // measurement rather than a style: the plate is 30 cm and `07:00-22:30` at a size anybody
    // could read off it is 70 cm of glyph run. Every text block in this kit was sized the same
    // way — n·size + (n-1)·gap against the panel it sits on — because a glyph run does not clip,
    // it simply walks off the end of its own board and onto the brickwork.
    function hoursPlate(x, y, z, key, ry = 0) {
      const r = HOURS[key], [sn, cs] = fwd(ry), o = ry ? { ry } : {};
      box(x, y, z, .30, .44, .014, C('#f1ece0'), { hard: true, gloss: .18, ...o });
      box(x + sn * .009, y + .155, z + cs * .009, .30, .12, .008, REDD,
        { hard: true, gloss: .20, ...o });
      glyphs(x + sn * .016, y + .155, z + cs * .016, ry, '营业时间',   // .272 of .30
        { size: .062, gap: .008, color: CREAM, mode: 1, gloss: .10, lift: .004 });
      [r[0], r[1]].forEach((v, i) =>                                   // .280 of .30
        glyphs(x + sn * .011, y + .020 - i * .120, z + cs * .011, ry, hm(v),
          { size: .052, gap: .005, color: INK, mode: 1, gloss: .08, lift: .004 }));
    }

    // 支付 — the payment stickers on the glass, which are the single most characteristic thing on
    // a Chinese shopfront and the thing the district had none of. Stacked rather than side by
    // side: the clear slots left on these three doors are 20 cm wide and none of them takes a
    // pair across. 16 cm each, under the 18 cm the brief allows.
    //
    // GENERIC, and that is not a style choice. The brief (STOREFRONT-UPGRADES.md A4) named two
    // real companies' marks; this lane implemented the brief correctly and the brief was wrong.
    // Nothing in this game carries a real brand — 可乐 on the billboard, an invented operator's
    // colour on the shared bikes, 文化传媒 on the office plate. 扫码支付 and 可刷卡 say exactly
    // what the sticker says without being anybody's trademark, and 扫码 is already a word the
    // street teaches.
    function payDecals(x, y, z, ry = 0) {
      const [sn, cs] = fwd(ry), o = ry ? { ry } : {};
      for (const [oy, c, t] of [[.10, C('#2f9c4f'), '扫码支付'], [-.10, C('#2f7fc4'), '可刷卡']]) {
        box(x, y + oy, z, .16, .16, .008, c, { hard: true, mode: 1, gloss: .12, ...o });
        box(x + sn * .006, y + oy + .022, z + cs * .006, .075, .054, .005, C('#f4f7f4'),
          { hard: true, mode: 1, gloss: .10, ...o });
        glyphs(x + sn * .008, y + oy - .046, z + cs * .008, ry, t,
          { size: .030, gap: .003, color: C('#f4f7f4'), mode: 1, gloss: .08, lift: .003 });
      }
    }

    // 营业执照 / 健康证 — the pair of framed certificates every shop hangs where the street can
    // see them. Behind the pane, so no collider and no tag: this is something you read through
    // glass, not something you walk up to and use.
    function certPair(x, y, z) {
      for (const [ox, band, t] of [[-.155, C('#2f6f4f'), '营业执照'],
                                   [.155, C('#8a2f2f'), '健康证']]) {
        box(x + ox, y, z, .26, .34, .010, C('#3a3630'), { hard: true, gloss: .22 });
        box(x + ox, y, z + .006, .22, .30, .005, C('#f2eee2'), { hard: true, mode: 1, gloss: .10 });
        box(x + ox, y + .108, z + .010, .21, .050, .004, band, { hard: true, mode: 1, gloss: .10 });
        glyphs(x + ox, y + .108, z + .014, 0, t,
          { size: .040, gap: .005, color: C('#f4f2ea'), mode: 1, gloss: .08, lift: .003 });
        for (let i = 0; i < 3; i++)
          box(x + ox, y + .020 - i * .050, z + .010, .15, .008, .004, C('#9a948a'),
            { hard: true, mode: 1, gloss: .06 });
      }
    }

    // 立牌 — the folding A-board with today's price on it. Built as the standing kind this file
    // already uses at the mall door rather than as two leaning leaves: the lean would want an
    // `rx` on the face and a matching one on the writing, and glyph runs do not take one, so the
    // characters would have floated off a tilted board. The back leg is what says it folds.
    //
    // The three on the alley are placed by measurement, not by eye — see each call. All of them
    // stand with their front face no further out than z = -2.34, which is 29 cm short of where
    // `clampMove` lets a body stand, so none of them has a collider and none of them takes a
    // millimetre off a street the header already calls 5.70 m at its worst. Three chicanes in
    // fifty metres is what this alley has and it is staying at three.
    function aBoard(x, z, head, lines, headCol) {
      // 70 cm frame, 62 cm face. The face width is what sets every size below: a four-character
      // head at .13 with a .022 gap is .586 and a six-character line at .085 with a .012 gap is
      // .570, both inside .62. A glyph run does not clip — an oversized one walks off its own
      // board onto the wall behind it — so the arithmetic is the constraint, not the taste.
      box(x, .58, z, .70, 1.08, .045, C('#2b2f33'), { hard: true, gloss: .22 });
      box(x, .58, z + .030, .62, .98, .018, CREAM, { hard: true, mode: 1, gloss: .12 });
      glyphs(x, .92, z + .044, 0, head,
        { size: .130, gap: .022, color: headCol, mode: 1, gloss: .10, lift: .004 });
      lines.forEach((t, i) => glyphs(x, .60 - i * .20, z + .044, 0, t,
        { size: .085, gap: .012, color: i ? C('#6f6a5f') : INK, mode: 1, gloss: .08, lift: .004 }));
      // The back leg. `cyl` and not `capsule`: a capsule's caps are a quarter of its height each
      // and scale with sy, so a 1.0 m "rod" comes out as a limb (gl.js:1466).
      cyl(x, .50, z - .13, .016, .90, col.steelD, { rx: .26, gloss: G.metal });
      for (const s of [-1, 1])
        box(x + s * .27, .020, z - .02, .12, .04, .28, col.steelD, { hard: true, gloss: .28 });
      shade(x, z - .06, .9, .7, .22);
    }

    // 门牌号 — the little blue enamel number plate. Deliberately the same object as the one on
    // the 单元门 (street-entry.js:383): same enamel, same white, same 7.2 cm vertical characters.
    function numPlate(x, y, z, text, ry = 0) {
      const [sn, cs] = fwd(ry), o = ry ? { ry } : {};
      box(x, y, z, .17, .34, .020, ENAM, { hard: true, gloss: .34, ...o });
      glyphs(x + sn * .011, y, z + cs * .011, ry, text,
        { size: .072, gap: .012, vertical: true, color: ENAMW, mode: 1, gloss: .16, lift: .008 });
    }

    // 春联 — the alley's own couplet geometry (street-entry.js:364) at shop scale: gold on red,
    // `mode` left at the default so neither the paper nor the writing emits. Four characters a
    // side rather than the household's seven, which is what fits a shop door's jambs and is what
    // shops actually put up. Left on the door all year and gone pink at the folds, because that
    // is what every one of these looks like by August.
    function couplet(x, y, z, half, up, down, top) {
      const paper = C('#a8443a'), gold = C('#f2d98c');
      for (const [s, line] of [[-1, up], [1, down]]) {
        box(x + s * half, y, z, .17, .86, .008, paper, { hard: true, gloss: .10 });
        glyphs(x + s * half, y, z + .006, 0, line,
          { size: .150, gap: .025, vertical: true, color: gold, gloss: .10, lift: .008 });
      }
      box(x, y + .61, z, .66, .175, .008, paper, { hard: true, gloss: .10 });
      glyphs(x, y + .61, z + .006, 0, top,
        { size: .110, gap: .016, color: gold, gloss: .10, lift: .008 });
    }

    // The bilingual under-plate: pinyin over an English gloss, in the order and the register the
    // HUD uses. Three of them, on the three names a learner most needs off this alley.
    function subPlate(x, y, z, py, en) {
      box(x, y, z, .86, .17, .012, C('#efe9db'), { hard: true, gloss: .16 });
      glyphs(x, y + .036, z + .008, 0, py,
        { size: .058, gap: .009, color: REDD, mode: 1, gloss: .08, lift: .004 });
      glyphs(x, y - .046, z + .008, 0, en,
        { size: .044, gap: .006, color: C('#5b564c'), mode: 1, gloss: .08, lift: .004 });
    }

    // 竖幅 — the hanging vertical banner. street.js already has two of these (at x 4.10 and
    // 11.10) and its own comment calls them "the vertical kind on every Chinese shopfront", so
    // this matches their cloth, their width and their drop exactly. What it does not match is
    // their `glow: .18`: two more lit ones is two more light-mask columns on a fill-rate-bound
    // street, and unlit red cloth with gold on it reads the same at every hour anybody is in
    // the alley to see it.
    function hangBanner(x, z, wallZ, c, text) {
      cyl(x, 3.05, (wallZ + z) / 2, .016, z - wallZ, col.steelD,
        { rx: Math.PI / 2, gloss: G.metal });
      box(x, 2.30, z, .34, 1.44, .04, c, { hard: true, mode: 7, gloss: G.fabric });
      glyphs(x, 2.30, z + .022, 0, text,
        { size: .26, gap: .08, vertical: true, color: CREAM, mode: 1, gloss: .12, lift: .006 });
    }

    // =========================================================================================
    // 幸福超市 — x 4.50 .. 10.70, the corner shop in the ground floor of your own block
    // =========================================================================================
    // Already here and not touched: the fascia, three display windows with stock in them, the
    // red-and-white awning, the double glass door with its bulb and its mat, three crates of
    // vegetables, the tray of bottled water, and the blue service door to the flat above. What
    // that frontage had none of is anything readable from up the alley, anything that moves, and
    // any sign that the stock arrives here rather than materialising on the shelves.

    // The box sign, on the pier west of the awning where it can be read the length of the hutong.
    // Clear of the flat 幸福超市 board, which starts at x 5.10: a projecting sign belongs on the
    // end of a frontage, not in the middle of one. The scholar tree outside this pier fills
    // y 2.6 .. 5.0 across x 3.4 .. 5.8 and one of the block's cast downpipes comes down at x 4.00,
    // so the panel of wall west of both is what is left, and the sign goes under the string course
    // rather than through it — which is where these are usually mounted anyway, because a 侧招 is
    // meant to be read from under it.
    //
    // The HEIGHT is no longer this file's to pick. It is BLADE/BLADEH off the shell, shared with
    // 面馆 and 五金 so all three box signs on the alley hang on one line. The numbers this file
    // used to measure against were taken when the block's storey height was 2.86 and were 24 cm
    // stale in every one of them: the string course is at 2.89 .. 3.11, not 2.65 .. 2.87.
    blade('z', 3.05, BLADE, EZ + .02, 1.18, BLADEH, RED, GOLD, '超市', 'shop');

    // 走字屏 — the LED ribbon along the front edge of the awning valance, running an offer. This
    // is the one piece of *moving text* on the street, which is most of what a Chinese shopping
    // street does after dark, and the district had none. Six characters, six quads, and the whole
    // animation is six numbers written into the translation column of six matrices.
    {
      const LZ = EZ + 1.34 + .085;                   // 25 mm proud of the valance's front face
      lit.push({ p: box(SHOP, 2.60, LZ, 5.00, .13, .03, C('#3a0f0c'),
        { hard: true, mode: 1, gloss: .18 }), g: .30, key: 'shop' });
      led.step = .62; led.from = SHOP - 2.50; led.span = 5.00;
      led.props = glyphs(SHOP, 2.60, LZ + .022, 0, '今日特价鸡蛋',
        { size: .115, gap: led.step - .115, color: C('#ff5a3c'), mode: 1, lift: .004 });
    }

    // 三轮车 — a flatbed trike parked across the pavement outside the shop, half unloaded. This
    // is the district's main deliberate obstacle: you cannot walk through it and have to go round
    // on the alley side. Measured, not judged — 3.35 m of clear run left at this x against
    // 4.35 m with nothing there.
    //
    // Not another courier's trike: street.js parks one of those at (9.6, 2.65) on the courtyard
    // side, and two identical white boxes four metres apart read as a bug rather than as a
    // street. This is the open-bed kind that brings the fruit, crates stacked on it and the
    // tarpaulin folded back off them.
    {
      // Where it stands was found rather than chosen. Another district parks a row of bicycles
      // along z -1.58 from x 5.4 to 7.6, so the pavement was swept at quarter-metre steps for a
      // 1.85 x 1.32 rectangle with nothing already standing in it, and this is the first clear one
      // east of the shop's own crates: the nearest wheel reaches z -1.245 and the trike's bed
      // starts at -1.18, which is 6 cm and measured rather than hoped for.
      const TX = 7.75, TZ = -0.55, RY = .21;
      const sn = Math.sin(RY), cs = Math.cos(RY);
      // Local frame: `fw` runs along the trike, `sd` across it. Every primitive keeps its own
      // signature — `cyl` takes a radius and a height where the others take three extents, and
      // routing all four through one variadic helper is how a wheel becomes a colour.
      const wx = (fw, sd) => TX + sn * fw + cs * sd;
      const wz = (fw, sd) => TZ + cs * fw - sn * sd;
      const T = { tag: '水果' };
      box(wx(-.10, 0), .44, wz(-.10, 0), 1.62, .10, .94, col.steelD,
        { hard: true, ry: RY, gloss: .34, ...T });
      box(wx(-.10, 0), .52, wz(-.10, 0), 1.58, .06, .90, CARD,
        { hard: true, ry: RY, gloss: .16, ...T });
      for (const sd of [-.47, .47])
        box(wx(-.10, sd), .63, wz(-.10, sd), 1.58, .28, .05, TARP,
          { hard: true, ry: RY, gloss: .26, ...T });
      box(wx(-.90, 0), .63, wz(-.90, 0), .05, .28, .92, TARP,
        { hard: true, ry: RY, gloss: .26, ...T });
      for (const [fw, sd] of [[.86, 0], [-.62, -.42], [-.62, .42]]) {
        cyl(wx(fw, sd), .27, wz(fw, sd), .27, .09, col.black,
          { rx: Math.PI / 2, ry: RY, gloss: .24 });
        cyl(wx(fw, sd), .27, wz(fw, sd), .13, .11, GALV,
          { rx: Math.PI / 2, ry: RY, gloss: G.metal });
      }
      cap(wx(.40, 0), .58, wz(.40, 0), .030, 1.10, .030, RED,
        { rz: Math.PI / 2 - .34, ry: RY, gloss: .34 });
      cap(wx(.84, 0), .74, wz(.84, 0), .028, .96, .028, RED, { rz: .22, ry: RY, gloss: .34 });
      box(wx(.28, 0), .86, wz(.28, 0), .28, .09, .20, col.black, { ry: RY, gloss: .26 });
      cap(wx(.90, 0), 1.14, wz(.90, 0), .022, .54, .022, col.charcoal,
        { rz: Math.PI / 2, ry: RY, gloss: .34 });
      cap(wx(.90, 0), 1.02, wz(.90, 0), .019, .30, .019, col.steelD, { ry: RY, gloss: G.metal });
      // the load, and the tarpaulin folded back off the end of it
      crateStack(wx(-.30, -.22), .55, wz(-.30, -.22), 3, SKYB, ORANGE, '水果');
      crateStack(wx(-.30, .24), .55, wz(-.30, .24), 2, GREEN, C('#c8ce62'), '水果');
      box(wx(-.78, 0), .78, wz(-.78, 0), .34, .22, .78, TARP,
        { hard: true, ry: RY + .1, gloss: .24 });
      crateStack(TX + 1.04, .00, TZ + .32, 1, SKYB, ORANGE, '水果');
      shade(TX, TZ, 2.6, 1.5, .30);
      // Nothing can be trapped behind it: the shop's own collider reaches z -1.60 along this whole
      // stretch, so the body's northern limit there is -1.30 and its southern limit for anything
      // behind the trike is -1.54. There is no gap at all, which is the point — a 24 cm slot you
      // can see into and cannot enter is a street; a 70 cm one you can walk into and not out of is
      // the bug this project keeps finding with a flood fill.
      //
      // 1.21 m is the narrowest run this district leaves anywhere, and it is narrow because of
      // what a neighbour has put on the courtyard side rather than because of the trike: the walk
      // already stopped at z 1.65 here before this was placed. Twice what `clampMove` needs, and
      // it is the one point on the parade where you have to look where you are going.
      solid(TX - 1.05, TX + 1.15, -1.24, 0.14);   // 1.21 m of clear run south of it
      thing('水果', TX, 1.35, TZ, '三轮车上装的是水果，刚送到。',
        'The trike is loaded with fruit — it has just been delivered.',
        '水 water + 果 fruit. A case of it is 一箱水果; 箱 is the measure word for a box.',
        { focus: [TX, 0.62], reach: 2.4 });
    }

    // 废品 — flattened cardboard tied with string and a nylon sack of bottles, stood against the
    // pier at the west end of the shop for the 收废品 man. At z -2.47 this is inside the strip
    // the body can never reach, so it costs nothing in walkable width.
    {
      const WX = 4.40, WZ = -2.47;
      for (let i = 0; i < 6; i++)
        box(WX, .27 + i * .045, WZ + (jit(i, WX) - .5) * .05, .70, .045, .46, CARD,
          { hard: true, gloss: .12, rz: .13, ry: .06 + i * .04 });
      cap(WX + .02, .40, WZ, .010, .58, .010, C('#c9c2ae'), { rz: 1.44, gloss: .10 });
      ball(WX + .54, .30, WZ + .06, .23, .30, .21, C('#cfd4d0'), { gloss: .22 });
      ball(WX + .54, .56, WZ + .06, .15, .12, .14, C('#cfd4d0'), { gloss: .22 });
      for (const [ox, oz] of [[-.06, .04], [.05, -.03], [.01, .08]])
        cyl(WX + .54 + ox, .64, WZ + .06 + oz, .028, .10, BOTTLE, { gloss: .5 });
      shade(WX + .25, WZ, 1.4, .8, .26);
    }

    // 小广告 — the illegal small ads pasted on the plinth between the stairwell and the shop, half
    // scraped off. Every blank stretch of wall at eye height in this city carries these, and the
    // only writing the district had at that height was its own shop signs. Two of them: one still
    // readable, one somebody has been at with a scraper.
    {
      const AX = 3.30, AY = 1.02, AZ = PLINTH + .016;
      box(AX, AY, AZ, .34, .46, .010, PAPER, { hard: true, mode: 1, gloss: .06, ry: -.05,
        tag: '广告' });
      glyphs(AX, AY + .15, AZ + .008, -.05, '开锁',
        { size: .105, gap: .018, color: REDD, gloss: .06, lift: .004, tag: '广告' });
      glyphs(AX, AY - .02, AZ + .008, -.05, '138 0011 2266',
        { size: .048, gap: .006, color: INK, gloss: .06, lift: .004, tag: '广告' });
      // The torn one. Two scraps at different angles with the middle gone is what is left of a
      // flyer somebody has scraped; a whole rectangle with one corner off is not.
      box(AX + .48, AY + .13, AZ, .30, .21, .010, C('#cfc6ae'),
        { hard: true, mode: 1, gloss: .06, ry: .07, tag: '广告' });
      box(AX + .43, AY - .19, AZ, .19, .12, .010, C('#c4baa2'),
        { hard: true, mode: 1, gloss: .06, ry: -.16, tag: '广告' });
      glyphs(AX + .48, AY + .15, AZ + .008, .07, '疏通',
        { size: .085, gap: .012, color: C('#7a4a3c'), gloss: .06, lift: .004, tag: '广告' });
      // and the ghost of a dozen more, scraped back to a smear
      box(AX - .42, AY - .06, AZ - .003, .40, .58, .006, C('#8f887a'),
        { hard: true, mode: 1, alpha: .45, gloss: .04, tag: '广告' });
      thing('广告', AX, AY + .40, AZ, '墙上贴满了小广告。',
        'The wall is covered in fly-posted ads.',
        '广告 guǎnggào is any advertisement. The stuck-on kind is 小广告, and scraping them ' +
        'off again is somebody\'s whole job.',
        { focus: [AX, -1.75], reach: 2.0 });
    }

    // 空调外机 on the bare render above them. The block carries a dozen of these five storeys up
    // and had none at a height anybody can look at.
    condenser(3.92, 3.24, EZ, 1.45, null);

    // =========================================================================================
    // 老李面馆 — x -9.50 .. -4.50
    // =========================================================================================
    // Already here and not touched: the render front, the tiled stallriser, two windows with
    // 牛肉面 painted on the glass, the strip curtain in the doorway with a leaf folded back, the
    // red lantern, the menu case, two stools and a folding table on the paving, and the extract
    // vent that is what you smell from the far end of the alley.

    // The blade sign, on the east pier past the menu case. Vertical 面馆 in gold on red: a noodle
    // shop's sign is red, and after 超市 it is the second most common thing written on this street.
    // x -3.95 stands, on the strip of wall east of the downpipe at -4.20.
    //
    // The height does not. This sat at 3.22 — ABOVE the string course, while 超市's sat below it
    // forty metres of sightline away, which is most of why the row read as scattered. It is on the
    // shared BLADE line now. street.js's extract vent, which is what forced it up here, has been
    // dropped to 1.90 for the same reason.
    blade('z', -3.95, BLADE, EZ + .02, 1.02, BLADEH, RED, GOLD, '面馆', 'noodle');

    // 饮料 — the glass-door drinks cabinet stood outside the door with the door propped open,
    // which is what every one of these is like from May onwards. Its own carcass, a cool-lit
    // interior, three shelves of bottles, and the door standing twenty degrees open onto the
    // pavement. The door is why this one needs a collider: the cabinet alone would sit inside the
    // unreachable strip, the leaf does not.
    {
      // Out on the paving rather than against the glass, and that is measured, not stylistic:
      // between the noodle shop's menu case (which finishes at z -2.71) and the parcels another
      // district stacks against this plinth (z -2.63 .. -2.23) there is no metre of wall left to
      // stand a cabinet in. So it stands where the shopkeeper would actually wheel it in summer —
      // half a metre off the front, with its own collider, leaving 3.98 m of clear run.
      const FZ = -1.85;
      // 66 cm wide and at -4.12, which is the widest cabinet that fits: the noodle shop's own
      // door leaf stands folded back onto the paving as far as x -4.55, and its render fascia ends
      // at -4.50. Anything wider or further west stood inside one of them.
      box(RSTE, .92, FZ, .66, 1.84, .70, C('#2c3136'), { hard: true, gloss: .34, tag: '饮料' });
      box(RSTE, 1.86, FZ, .70, .16, .74, RED, { hard: true, gloss: .30, tag: '饮料' });
      glyphs(RSTE, 1.86, FZ - .38, 0, '冷饮',
        { size: .115, gap: .03, color: CREAM, mode: 1, lift: .006, tag: '饮料' });
      // Cool, not warm: this is a fluorescent tube in a cabinet, and the noodle shop's own
      // doorway two metres away is the warm one. The contrast between them is the whole point.
      lit.push({ p: box(RSTE, .96, FZ + .05, .56, 1.52, .04, COOL,
        { hard: true, mode: 1, gloss: .22, tag: '饮料' }), g: .16, key: 'noodle' });
      for (let s = 0; s < 3; s++) {
        const sy = .38 + s * .46;
        box(RSTE, sy, FZ - .06, .54, .022, .46, GALV, { hard: true, gloss: .40, tag: '饮料' });
        for (let i = 0; i < 5; i++) {
          const c2 = [RED, SKYB, GREEN, ORANGE, C('#8a5a9c')][(s * 2 + i) % 5];
          cyl(RSTE - .21 + i * .105, sy + .13, FZ - .13, .040, .24, c2,
            { gloss: .52, tag: '饮料' });
          cyl(RSTE - .21 + i * .105, sy + .27, FZ - .13, .022, .04, CREAM,
            { gloss: .40, tag: '饮料' });
        }
      }
      // The leaf, hinged on the west edge of the front face and swung twenty degrees out. Any
      // wider and it is across the pavement; drawn shut it is a dark rectangle and reads as a
      // cupboard. `ry` is 70° because the box is built long in z and has to end up lying along
      // the door's own direction, which is 20° off the wall.
      // Hinged on the west edge of the front face and swung twenty degrees out on it, which puts
      // the leaf's own centre almost exactly over the cabinet's centre line. `ry` is 70° and not
      // 20° because the box is built long in z and has to finish lying along the door.
      box(RSTE, .96, FZ + .470, .04, 1.62, .70, col.steelD,
        { hard: true, ry: 1.222, gloss: .38, tag: '饮料' });
      box(RSTE, .96, FZ + .482, .03, 1.44, .58, C('#9fb6c4'),
        { hard: true, mode: 18, alpha: .34, gloss: .82, ry: 1.222, tag: '饮料' });
      cap(RSTE + .253, .96, FZ + .562, .019, .48, .019, GALV, { gloss: G.metal });
      shade(RSTE, FZ + .10, 1.4, 1.2, .30);
      solid(RSTE - .36, RSTE + .36, -2.26, -1.23);
      thing('饮料', RSTE, 1.55, FZ, '冰箱里的饮料一瓶三块。',
        'The drinks in the fridge are three kuai a bottle.',
        '饮 to drink + 料 stuff. Anything cold and bottled: 汽水, 可乐, 冰红茶.',
        { focus: [RSTE, -0.80], reach: 2.2 });
    }

    // No gas bottles outside the noodle shop, and this is worth writing down because it is the
    // obvious thing to put there. The metre of plinth between its door and the stairwell is the
    // only clear stretch on this frontage, and by the time this district was measured a second
    // one had stacked the day's 快递 parcels across x -3.7 .. -3.2 of it. A welded bottle cage
    // dropped on top of somebody else's parcels is exactly the failure this street goes wrong by.
    // 液化气罐 is not missing from the district either way: `wallJunk` already stands one, with
    // its regulator and a bucket and mop beside it, at two points along these walls.

    // =========================================================================================
    // 五金电器 — x 14.20 .. 21.40, in the corner block that closes the east end of the alley
    // =========================================================================================
    // What street.js leaves here is one 7.2 m sheet of glass with a signboard over it, which is
    // the least finished shopfront in the district and also the longest. It is three units, and
    // this is what is behind each: one dead and shuttered, one open and trading out onto the
    // paving, one closing up for the night.
    //
    // The junk street.js piles at x 15.9 .. 17.4 — a heap of salvaged brick and a bundle of
    // flattened cardboard, its own comment says "outside the hardware shop" — is left exactly
    // where it is, and every measurement below starts east of it rather than through it.

    // ---- unit A, x 14.25 .. 16.35. Dead: 旺铺出租 and a number across the shutter.
    {
      const AX = 15.30;
      shutter(AX, 2.10, HWG + .075, .22, 2.80);
      // The one bulb somebody left on behind it. Not on anybody's hours — nobody is watching this
      // meter — and it is the only thing on the parade lit at four in the morning. What reads
      // from across the alley is not the bulb but the line of light under the bottom rail and the
      // pool it throws on the paving.
      lit.push({ p: box(AX, .12, HWG - .03, 1.72, .17, .02, WARM,
        { hard: true, mode: 1, gloss: .10 }), g: .55, key: 'dead' });
      pools.push({ g: glow(M.trs(AX, .035, -2.42, 0, 2.6, 1, 1.4), C('#ffcf96'), 0),
                   a: .17, key: 'dead' });
      const L = light(AX, .58, -2.58, [1.0, .84, .60], .22, 2.4); L.on = false;
      lamps.push({ l: L, key: 'dead' });
      // The banner: red cloth stapled across the shutter with the agent's number under it. This
      // is exactly how a vacant unit is advertised and there is nothing else it could be. Cloth,
      // not a lightbox — it goes dark with the rest of the front.
      box(AX, 2.06, HWG + .165, 1.94, .68, .012, RED, { hard: true, mode: 7, gloss: G.fabric });
      glyphs(AX, 2.23, HWG + .176, 0, '旺铺出租',
        { size: .235, gap: .05, color: GOLD, mode: 1, lift: .006, tag: '关门' });
      glyphs(AX, 1.90, HWG + .176, 0, '138 0011 2266',
        { size: .078, gap: .012, color: CREAM, mode: 1, lift: .006, tag: '关门' });
      // Junk mail nobody has picked up, drifted against the bottom rail.
      for (let i = 0; i < 5; i++) {
        const k = jit(AX + i, i * 2.7);
        box(AX - .70 + i * .34, .012, -2.62 + (k - .5) * .16, .20, .006, .28,
          i % 2 ? PAPER : C('#cf9f6a'),
          { hard: true, gloss: .08, ry: (k - .5) * 1.6, tag: '关门' });
      }
      thing('关门', AX, 1.55, HWG + .18, '这家店关门了，现在旺铺出租。',
        'This shop has closed down. The unit is up for rent now.',
        '关门 guānmén is to shut — for the evening, or for good. 旺铺出租 on the shutter is ' +
        'the second kind: a prime unit to let.',
        { focus: [AX, -1.10], reach: 2.6 });
    }

    // ---- unit B, x 16.45 .. 19.70. Open, and trading out onto the pavement.
    {
      const DX = 18.85;
      // A reveal standing proud of the glass rather than a dark panel behind it. There is no
      // cutting a hole in the shell's 7.2 m pane, so the doorway is built in front of it: 15 mm
      // clear of the glass at the back and 12 cm proud at the front, which is enough depth for
      // the curtain to hang *inside* something rather than on the face of a wall.
      box(DX, 1.34, HWG + .075, 1.24, 2.58, .14, col.charcoal,
        { hard: true, gloss: .28, tag: '拖把' });
      lit.push({ p: box(DX, 1.28, HWG + .055, 1.00, 2.10, .03, C('#7a5f3e'),
        { hard: true, mode: 1, gloss: .16 }), g: .30, key: 'hardw' });
      stripCurtain(DX, 1.26, HWG + .105, 1.00, 1.94);
      for (const s of [-1, 1])
        box(DX + s * .66, 1.32, HWG + .135, .13, 2.54, .13, REDD,
          { hard: true, gloss: .26, tag: '拖把' });
      box(DX, 2.70, HWG + .135, 1.36, .22, .13, REDD, { hard: true, gloss: .26 });
      // One leaf folded back against the jamb, so the opening keeps a silhouette even when the
      // transparent curtain catches the sky and stops reading.
      box(DX + .80, 1.28, HWG + .30, .46, 2.02, .06, REDD,
        { hard: true, ry: -.74, gloss: .24, tag: '拖把' });
      cap(DX + .67, 1.28, HWG + .44, .026, .44, .026, GOLD, { ry: -.74, gloss: G.metal });

      // The unit's own box sign. 五金 and not the full 五金电器 on the flat board above it: a
      // projecting sign carries the short form, because it is read at forty metres.
      // 16.62 rather than the mullion line: unit A's shutter guide finishes at 16.43 and its
      // housing at 16.44, and a sign plate sharing a face with a shutter guide is two faces on one
      // plane, which is the one thing this project has taken down three times.
      blade('z', 16.62, BLADE, HWG + .02, 1.04, BLADEH, C('#1f4f8f'), CREAM, '五金', 'hardw');

      // The goods against the glass, east of street.js's brick heap and west of the door: a stack
      // of nested red stools and three basins inside each other, with a coil of rope hung above
      // them. All of it at z <= -2.35, inside the strip the body can never reach.
      for (let i = 0; i < 4; i++)
        taper(17.58, .19 + i * .11, -2.62, .32, .40, .32, RED, { gloss: .30, tag: '拖把' });
      box(17.58, .60, -2.62, .34, .04, .34, RED, { hard: true, gloss: .30, tag: '拖把' });
      for (let i = 0; i < 3; i++)
        taper(18.00, .10 + i * .055, -2.66, .42 - i * .06, .22, .42 - i * .06,
          [PINK, C('#e08f4a'), SKYB][i], { rx: Math.PI, gloss: .32, tag: '拖把' });
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5;
        cap(17.62 + Math.cos(a) * .17, 1.58 + Math.sin(a) * .17, -2.76,
          .024, .108, .024, C('#c9b98a'), { rz: a, gloss: .18 });
      }
      cap(17.62, 1.82, -2.79, .010, .11, .010, col.steelD, { gloss: G.metal });
      // A rail of brushes hung over them, which is where a hardware shop keeps the small stock it
      // cannot leave on the ground.
      cap(18.04, 1.66, -2.78, .012, .70, .012, GALV, { rz: Math.PI / 2, gloss: G.metal });
      for (let i = 0; i < 5; i++) {
        cap(17.76 + i * .14, 1.50, -2.77, .009, .30, .009, col.trunkL, { gloss: G.wood });
        box(17.76 + i * .14, 1.32, -2.77, .085, .10, .05, i % 2 ? C('#b5a07a') : C('#8a6a3c'),
          { hard: true, gloss: .16 });
      }

      // 拖把 — the one cluster that genuinely spills onto the walk: a galvanised bin of mops and
      // brooms standing head-up, four buckets nested beside it. Measured: 4.55 m of clear run
      // left at this x. The collider's north edge is at -2.36, which is 1 cm *inside* the
      // building's own reach, so no body can end up in the slot between the two.
      const MX = 17.65, MZ2 = -2.06;
      cyl(MX, .30, MZ2, .225, .60, GALV, { gloss: .38, tag: '拖把' });
      cyl(MX, .61, MZ2, .235, .04, col.steelD, { gloss: .40, tag: '拖把' });
      for (let i = 0; i < 7; i++) {
        const a = i * .897, k = jit(MX + i, MZ2);
        cap(MX + Math.sin(a) * .11, 1.16, MZ2 + Math.cos(a) * .11, .020, 1.44, .020,
          i % 2 ? col.trunkL : C('#b5a07a'),
          { rz: (k - .5) * .17, ry: a, gloss: G.wood, tag: '拖把' });
        if (i % 2)
          cap(MX + Math.sin(a) * .13, 1.80, MZ2 + Math.cos(a) * .13, .052, .30, .052,
            C('#b9bcb4'), { rz: (k - .5) * .17, gloss: .10, tag: '拖把' });
        else
          for (let j = 0; j < 3; j++)
            cap(MX + Math.sin(a) * .13 + (j - 1) * .035, 1.82, MZ2 + Math.cos(a) * .13,
              .026, .34, .026, j % 2 ? C('#c2ad72') : C('#ab9660'),
              { rz: (k - .5) * .17 + (j - 1) * .12, gloss: .14, tag: '拖把' });
      }
      for (let i = 0; i < 4; i++)
        taper(MX + .48, .13 + i * .055, MZ2 - .04, .30, .28, .30, C('#c4452f'),
          { rx: Math.PI, gloss: .30, tag: '拖把' });
      cap(MX + .48, .34, MZ2 - .04, .012, .30, .012, GALV, { rz: Math.PI / 2, gloss: G.metal });
      shade(MX + .2, MZ2, 1.6, .9, .28);
      solid(MX - .35, MX + .70, -2.36, -1.80);
      thing('拖把', MX, 1.30, MZ2, '五金店门口摆着拖把和水桶。',
        'There are mops and buckets out in front of the hardware shop.',
        '拖 to drag + 把 handle. The bucket beside it is 水桶, and 桶 on its own is the ' +
        'measure word for a bucketful.',
        { focus: [MX, -1.28], reach: 2.2 });
    }

    // ---- unit C, x 19.80 .. 21.36. Closing up: the shutter half down over a window still lit.
    {
      const CX = 20.58, CW = 1.56;
      lit.push({ p: box(CX, 1.24, HWG + .045, CW - .16, 1.70, .03, COOL,
        { hard: true, mode: 1, gloss: .20 }), g: .22, key: 'hardw' });
      // Rice cookers and fans on a shelf — silhouettes, because that is all that survives being
      // seen through a pane at a grazing angle with a shutter half over it.
      box(CX, .96, HWG + .02, CW - .34, .03, .16, GALV, { hard: true, gloss: .40 });
      for (let i = 0; i < 3; i++) {
        cyl(CX - .40 + i * .40, 1.10, HWG + .02, .105, .24, i % 2 ? col.white : GALV,
          { gloss: .34 });
        cyl(CX - .40 + i * .40, 1.235, HWG + .02, .085, .03, col.charcoal, { gloss: .30 });
      }
      shutter(CX, CW, HWG + .075, 1.52, 2.80);
      // No projecting sign on this unit, and that is a measurement rather than an omission. The
      // newsstand street.js parks at x 19.6 .. 22.0 has a tiled roof at y 2.22 .. 2.55 standing
      // 1.3 m out from this frontage, so a box sign here either runs through that roof or gets
      // pushed up into the 五金电器 board above it. Two on the alley and four across the road are
      // enough to read the row by; a third one buried in a kiosk is not worth the draw calls.

      // The shopkeeper's stool outside it, with his tea glass and his phone left on the crate. He
      // is a roster entry rather than a prop — see the ticket in the report — but the furniture is
      // the shop's and belongs on this side of the line either way.
      taper(20.05, .21, -2.44, .32, .42, .32, C('#2f6a5c'), { gloss: .30 });
      box(20.05, .43, -2.44, .34, .04, .34, C('#2f6a5c'), { hard: true, gloss: .30 });
      box(20.52, .21, -2.50, .40, .42, .34, C('#8a6a3c'), { hard: true, gloss: .18 });
      cyl(20.46, .49, -2.50, .038, .14, C('#cfd8c8'), { mode: 18, alpha: .42, gloss: .80 });
      cyl(20.46, .485, -2.50, .033, .10, C('#6f8a4a'), { gloss: .40 });
      box(20.62, .437, -2.46, .075, .012, .145, col.charcoal,
        { hard: true, gloss: .42, ry: .3 });
    }

    // The service head where the shop's supply comes off the pole: the drop wire, the junction box
    // it lands in, the meter under it, and the run of it away west along the wall on standoffs.
    // The alley has a net of cable over it already — two poles and five spans — and none of it
    // ever arrived anywhere.
    {
      const SX = 22.34;
      box(SX, 2.30, HWW + .12, .34, .46, .22, C('#8d9298'), { hard: true, gloss: .30 });
      box(SX, 1.70, HWW + .10, .26, .60, .18, C('#b6b0a1'), { hard: true, gloss: .26 });
      box(SX, 1.78, HWW + .20, .16, .20, .02, C('#2c3136'), { hard: true, mode: 1, gloss: .40 });
      for (let i = 0; i < 4; i++)
        cap(SX - .09 + i * .06, 3.36, HWW + .16, .012, 1.72, .012, col.black,
          { rz: .10 + i * .02, gloss: .2 });
      for (let i = 0; i < 5; i++)
        cap(SX - .9 - i * 1.5, 4.18, HWW + .10, .014, 1.50, .014, col.black,
          { rz: Math.PI / 2 + (i % 2 ? .03 : -.02), gloss: .2 });
      // Deliberately untagged, and this is worth writing down because it looks like an oversight.
      // 空调 is in the dictionary and this is the one air-conditioner in the game you can walk up
      // to — but `USE` is global and `USE['空调']` is the flat's row: 开空调, "switch on the AC",
      // +9 mood. `canUse` only consults `USE_AT[place]` first, and there is no `USE_AT.street`.
      // So labelling this would have offered the player the verb "switch on the air conditioning"
      // while standing in an alley in front of somebody else's dripping condenser. The label is a
      // Hub ticket (a `USE_AT.street['空调']` override, or none at all); until it lands this is
      // scenery, which is better than a wrong verb.
      condenser(21.86, 3.42, HWW, 1.50, null);
    }

    // 防鸟网 — netting stretched over the top edge of the signboard, which is what stops forty
    // pigeons roosting on a lit fascia. Thin, cheap, and one of those details nobody names the
    // absence of and everybody reads the presence of.
    for (let i = 0; i < 13; i++)
      cap(14.72 + i * .52, 3.99, -2.88, .006, .30, .006, C('#9aa0a6'), { rx: -.55, gloss: .22 });
    for (const [oy, oz] of [[3.92, -2.90], [4.06, -2.79]])
      cap(17.80, oy, oz, .005, 6.40, .005, C('#9aa0a6'), { rz: Math.PI / 2, gloss: .22 });

    // =========================================================================================
    // 夜市 — the night-market gateway at x 4.60 in the courtyard wall
    // =========================================================================================
    // Already here and not touched: the two brick piers, the lintel and its board, the 夜市 tube
    // sign, the green strips, the dim brick wall behind the gap so it is not a hole through to
    // the sky, and the two pools of warm light that come up at dusk. What it never had is
    // anything that says what is *in* there.

    // 横幅 — a banner slung between the piers under the lintel, which is how a market announces
    // its hours. Facing the alley, which is -z from here.
    {
      box(MK, 2.86, MZ + .10, 2.34, .42, .014, RED, { hard: true, mode: 7, gloss: G.fabric });
      glyphs(MK, 2.86, MZ + .092, Math.PI, '每晚七点开市',
        { size: .225, gap: .045, color: GOLD, mode: 1, lift: .006, tag: '夜市' });
      for (const s of [-1, 1])
        cap(MK + s * 1.20, 2.99, MZ + .10, .008, .30, .008, col.charcoal, { gloss: .3 });
    }

    // 小吃 — the price board propped against the east pier. What is down there and what it costs,
    // which is the most useful piece of reading on this street: the names of the food, the
    // numbers and the measure of them, all in one place a learner will actually stop at.
    {
      const BX = 6.55, BZ = MZ - .49;
      box(BX, .78, BZ, .70, 1.44, .05, C('#2b2f33'), { hard: true, gloss: .22, tag: '小吃' });
      box(BX, .78, BZ - .032, .62, 1.34, .02, C('#20242a'),
        { hard: true, mode: 1, gloss: .18, tag: '小吃' });
      glyphs(BX, 1.34, BZ - .046, Math.PI, '小吃',
        { size: .155, gap: .035, color: GOLD, mode: 1, lift: .005, tag: '小吃' });
      const MENU = [['羊肉串', '五块'], ['煎饼', '八块'], ['炒面', '十五']];
      MENU.forEach((row, i) => {
        const y = 1.03 - i * .25;
        glyphs(BX + .13, y, BZ - .046, Math.PI, row[0],
          { size: .092, gap: .014, color: CREAM, mode: 1, lift: .005, tag: '小吃' });
        glyphs(BX - .19, y, BZ - .046, Math.PI, row[1],
          { size: .092, gap: .014, color: C('#ffcf6a'), mode: 1, lift: .005, tag: '小吃' });
      });
      for (const s of [-1, 1])
        cap(BX + s * .28, .28, BZ + .16, .014, .58, .014, col.trunkL, { rx: -.30, gloss: G.wood });
      box(BX, .05, BZ + .22, .24, .10, .12, col.brickD, { hard: true, mode: 11, gloss: G.matte });
      thing('小吃', BX, 1.20, BZ, '夜市里的小吃又便宜又好吃。',
        'The street food in the night market is cheap and good.',
        '小 small + 吃 to eat. Not a meal — a skewer, a pancake, a bowl of something, eaten ' +
        'standing up.',
        { focus: [BX, 2.20], reach: 2.6 });
    }

    // =========================================================================================
    // 北京新天地 — the mall entrance across the road at z -9.20
    // =========================================================================================
    // Already here and not touched: the recessed automatic doors, the warm lobby behind the
    // glass, the gold mullions, the fascia with the name on it, the vertical blade sign, the two
    // planters and the shade under them. What a Chinese mall entrance also always has is a
    // promotion running, and the only way to know that from the pavement is that it is written on
    // the front of the building in letters two metres high.

    // 条幅 — the sale banner down the face of the surround, on the south side of the entrance in
    // the 74 cm of stone between the edge of the glazing and the edge of the block, where it
    // covers nothing.
    {
      const BZ = MLZ - 3.20;
      box(FX - 1.20, 3.55, BZ, .03, 2.45, .50, RED, { hard: true, mode: 7, gloss: G.fabric });
      glyphs(FX - 1.22, 3.55, BZ, -Math.PI / 2, '全场五折',
        { size: .38, gap: .09, vertical: true, color: GOLD, mode: 1, lift: .008 });
      for (const s of [-1, 1])
        cap(FX - 1.19, 4.82, BZ + s * .20, .010, .28, .010, col.steelD, { gloss: G.metal });
    }

    // The LED ribbon under the fascia. Static — one scrolling strip in a scene is a detail and
    // two is a fairground — but lit, and on the mall's hours rather than on the sun's.
    {
      lit.push({ p: box(FX - 1.44, 4.66, MLZ, .10, .19, 5.40, C('#3a0f0c'),
        { hard: true, mode: 1, gloss: .18 }), g: .28, key: 'mall' });
      glyphs(FX - 1.50, 4.66, MLZ, -Math.PI / 2, '欢迎光临',
        { size: .155, gap: .30, color: C('#ff6a44'), mode: 1, lift: .005 });
    }

    // 打折 — a 立牌, the standing poster board every mall entrance in China has out on its
    // forecourt, and the one piece of mall signage the player can walk right up to.
    //
    // Everything about where and what it is came out of the tape rather than out of taste. At the
    // mall's own doors the far pavement is now 6 cm wide, because something else on this frontage
    // runs a collider from z -13.95 to -9.25 across the whole of it — not this district's, and it
    // has taken the mall's own 购物中心 label out of reach with it (see the report). The nearest
    // point a body can still stand is around z -7.4, and the 40 cm of that stretch which is clear
    // of the mall's door planter (to -6.90), of another district's post at (40.15, -6.95) and of a
    // third collider at -8.44 .. -7.56 is z -7.20 .. -7.56. A two-leaf A-board is 94 cm deep and
    // does not fit in it. One panel is 30 cm and does, and one face is all that is wanted: a body
    // on this pavement can only ever come at it from -x.
    //
    // `pick` takes the tag of the nearest prop the ray hits, so the line from the standing spot to
    // the board has to be clear of everything untagged as well — which at this z it is.
    {
      // Tall and narrow rather than wide: 34 cm is what fits the gap, so the writing runs down it
      // instead of across, which is the commoner of the two shapes anyway.
      const AX = 40.20, AZ = -7.40;
      box(AX + .03, .82, AZ, .04, 1.56, .40, REDD, { hard: true, gloss: .22, tag: '打折' });
      box(AX, .82, AZ, .05, 1.46, .34, CREAM, { hard: true, gloss: .16, tag: '打折' });
      glyphs(AX - .045, 1.24, AZ, -Math.PI / 2, '打折',
        { size: .25, gap: .06, vertical: true, color: REDD, gloss: .10, lift: .006, tag: '打折' });
      glyphs(AX - .045, .62, AZ, -Math.PI / 2, '全场五折',
        { size: .115, gap: .022, vertical: true, color: INK, gloss: .10, lift: .006, tag: '打折' });
      cyl(AX + .04, .05, AZ, .155, .10, col.steelD, { gloss: G.metal });
      shade(AX, AZ, .4, .5, .26);
      thing('打折', AX, 1.20, AZ, '这家商场全场打五折。',
        'Everything in this mall is half price.',
        '打 to strike + 折 a fold. 打五折 is fifty per cent OFF — the number is what you pay, ' +
        'not what you save, which catches every learner exactly once.',
        { focus: [38.60, AZ], reach: 2.6 });
    }

    // =========================================================================================
    // the far parade — the small units either side of the named ones
    // =========================================================================================
    // street.js already generates forty units along here, each with a lit shopfront, a coloured
    // board with a real name on it, a planter either side of the door and a full-height shutter on
    // roughly one in four. All of that stays. Two things it has none of, and both are about being
    // able to read the row from the pavement rather than from straight in front: signs that come
    // *out* of the wall, and stock standing in front of them.
    //
    // The z positions are the gaps between everything already standing on this frontage — the
    // mall at -12.8 .. -5.6, the subway mouth at -6.1 .. -3.9, the office lobby at 0.4 .. 4.0 and
    // the hypermarket at 1.7 .. 11.3 — so nothing here lands on top of anything.
    for (const [sz, name, base] of [[-15.80, '烟酒', REDD], [-1.55, '理发', C('#1f4f8f')],
                                    [12.35, '干洗', C('#2f6a5c')], [16.90, '家电', REDD]])
      blade('x', 41.32, 3.72, sz, 1.16, .58, base, CREAM, name, 'parade');

    // The stock. All of it between x 39.9 and 40.78: the road zone stops the body at 39.5 so
    // nothing here costs a centimetre of pavement or needs a collider, and 40.78 is where the
    // parade's own door planters begin — their z positions come out of a seeded shuffle this file
    // cannot see, so the only safe rule is to stay west of them.
    {
      // 便利店 — crates of fruit and a stack of cartons out on the flags.
      crateStack(40.18, .00, -2.72, 3, SKYB, ORANGE);
      crateStack(40.18, .00, -2.24, 2, GREEN, C('#c8ce62'));
      crateStack(40.45, .00, -1.72, 2, C('#8a4a3c'), C('#c4452f'));
      for (let i = 0; i < 4; i++)
        box(40.50, .16 + i * .30, -3.16, .52, .30, .44, i % 2 ? CARD : C('#b89b72'),
          { hard: true, gloss: .14, ry: .09 + i * .06 });
      shade(40.34, -2.40, 1.5, 1.9, .26);

      // 干洗 — a rail of dry-cleaning in polythene, wheeled out under the canopy.
      for (const s of [-1, 1])
        cap(40.40, .78, 12.35 + s * .52, .016, 1.56, .016, GALV, { gloss: G.metal });
      cap(40.40, 1.54, 12.35, .018, 1.10, .018, GALV, { rx: Math.PI / 2, gloss: G.metal });
      for (let i = 0; i < 7; i++) {
        const k = jit(i, 12.35);
        box(40.40, 1.02, 11.92 + i * .145, .30, .92, .13,
          [CREAM, C('#8f9aa4'), C('#6f5f52'), C('#4a5560')][i % 4],
          { hard: true, mode: 7, gloss: G.fabric, ry: (k - .5) * .2 });
        box(40.40, 1.06, 11.92 + i * .145, .34, 1.00, .15, C('#cfd6d2'),
          { hard: true, mode: 18, alpha: .22, gloss: .70, ry: (k - .5) * .2 });
      }
      shade(40.40, 12.35, 1.0, 1.5, .24);

      // and the recycling waiting for the 收废品 man, which is what the back end of every parade
      // in China looks like at six in the evening.
      for (let i = 0; i < 7; i++)
        box(40.32, .28 + i * .05, 13.62 + (jit(i, 3) - .5) * .06, .78, .05, .54, CARD,
          { hard: true, gloss: .12, rz: .10, ry: .05 + i * .05 });
      cyl(40.60, .34, 13.55, .150, .60, BRASS, { gloss: .34 });
      cyl(40.60, .645, 13.55, .120, .04, C('#8d7f2f'), { gloss: .36 });
      ball(40.24, .30, 13.98, .24, .30, .22, C('#cfd4d0'), { gloss: .22 });
      shade(40.40, 13.65, 1.2, 1.4, .24);
    }

    // Cable slung along the front of the parade, two dishes on brackets, and the standoffs that
    // carry it. The near side of the alley is a net of cable from end to end and the far side had
    // a clean parapet and nothing between the two — the one detail that reads at fifty metres and
    // says a building is occupied.
    for (let seg = 0; seg < 5; seg++) {
      const z0 = -24 + seg * 10;
      for (let i = 0; i < 3; i++)
        cap(41.10 + i * .04, 5.55 - i * .17 - (seg % 2) * .06, z0 + 5, .014, 10.2, .014,
          col.black, { rx: Math.PI / 2, gloss: .2 });
      cap(41.30, 5.20, z0, .030, .90, .030, col.steelD, { gloss: .34 });
    }
    for (const [dz, dy] of [[-16.60, 6.55], [14.20, 7.15]]) {
      cap(41.26, dy, dz, .020, .52, .020, col.steelD, { rz: Math.PI / 2, gloss: .34 });
      taper(41.00, dy, dz, .74, .28, .74, col.white, { rx: -.30, ry: -1.5, gloss: .26 });
      cap(41.13, dy + .14, dz, .014, .32, .014, col.steelD, { rz: 1.2, gloss: .34 });
    }

    // =========================================================================================
    // 门脸 — the shopfront kit, placed
    // =========================================================================================
    // STOREFRONT-UPGRADES A2, A3, A4, A5, A6, A8, D3, D5, D6. Everything below uses the helpers
    // at the head of this build and nothing below is emissive.
    //
    // Two coordinates come out of street.js and are copied here rather than re-measured, with
    // the line they came off, because a door that moves and a couplet that does not is worse
    // than no couplet:
    const SHOPDOOR = SHOP + 1.55;      // street.js:1483   幸福超市's double glass door,  x 9.15
    const RST = -7.0, RSTDOOR = RST + 1.55;  // street.js:1659,1686  老李面馆's,          x -5.45
    const HWB = 18.85;                 // this file, unit B above — 五金电器's own door
    const HWJ = .62;                   // and the half-spacing its couplet hangs on. Not .66, the
                                       // jambs' own: at .66 the east strip ran into the hours
                                       // plate in the 22 cm slot beyond it.

    // ---- A2. 门帘 on 超市. 面馆 has had one from the shell and 五金 unit B got one from this
    // file (see above), so this is the third and last doorway on the alley without one. Hung
    // 24 cm proud of the door glass at z -2.35 — the same `stripCurtain` as the other two, so
    // the same nine strips at the same alpha .30, and the same absence of a collider: at -2.35
    // it is 30 cm north of where the body can stand and the shop's own collider stops the walk
    // at -1.30 in front of it anyway.
    stripCurtain(SHOPDOOR, 1.25, EZ + .60, 1.16, 2.10);

    // ---- A3. 营业时间. Six plates, and not one of them has its times written out: `hoursPlate`
    // reads `HOURS` and formats it, so a plate is incapable of disagreeing with the hour its own
    // shop's lights go off. That is the whole reason the table was rounded to the half hour when
    // these went up — see the note on `HOURS`.
    hoursPlate(4.72, 1.60, EZ + .085, 'shop');        // the 40 cm white pier west of window 1
    hoursPlate(-6.27, 1.60, EZ + .205, 'noodle');     // the 34 cm pier between window 2 and the jamb
    hoursPlate(19.72, 1.86, HWG + .012, 'hardw');     // the 22 cm slot between unit B's jamb and C
    hoursPlate(40.405, 1.70, -6.35, 'mall', -Math.PI / 2);   // the stone north of the mall glazing
    hoursPlate(41.30, 1.70, -14.95, 'parade', -Math.PI / 2); // the far parade, by the 烟酒 blade
    hoursPlate(41.30, 1.70, 13.20, 'parade', -Math.PI / 2);  // and again by the 干洗 one

    // ---- A4. 支付. Two per door on all three of the alley's doors. On the glass where they
    // belong, 1 cm proud of the pane so nothing shares a plane with it.
    payDecals(8.72, 1.52, EZ + .4625);   // 超市's west door leaf
    payDecals(-6.80, 1.44, EZ + .285);   // 面馆's window beside the door, which is where its go
    payDecals(17.95, 1.90, HWG + .012);  // 五金, west of the door and clear of the brush rail

    // ---- A5. 营业执照 / 健康证. Behind the pane on both frontages that have a cavity to hang
    // them in, and nowhere else: the 五金 shell is a single sheet of glass with the shop's own
    // millwork right up against it and there is no depth there to hang anything in.
    //   超市: the third display window's cavity, above the top shelf's stock (which tops out at
    //         y 2.19) and below the white head box (y 2.56). 17 cm of clear glass, and this is
    //         all of it.
    //   面馆: its windows have no backing at all, so the 3.5 cm between the render face at -2.76
    //         and the back of the pane at -2.725 is empty and the pair goes straight in it.
    certPair(SHOP + .65, 2.38, EZ + .09);
    certPair(RST - 1.55, 1.95, EZ + .205);

    // ---- A6. 立牌. Three, and three is the number: the header of this file records that the
    // alley already carries exactly three deliberate chicanes and that eight would be an assault
    // course. These add a fourth, fifth and sixth *object* and a zeroth chicane, because every
    // one of them stands entirely inside the strip the body cannot reach:
    //
    //   x 8.05   front face -2.511   46.1 cm north of the body's limit at -2.05
    //   x -8.35  front face -2.402   35.2 cm      (2.4 cm clear of 面馆's tiled stallriser)
    //   x 12.55  front face -2.422   37.2 cm      (3.4 cm clear of the block's plinth at -2.74)
    //
    // The 超市's board, its hours plate and its number plate were all at x 10.20-10.45 and all
    // three were INVISIBLE, which a live render caught and no amount of arithmetic would have:
    // street.js:1716 puts the blue service door to the flat above at x 10.04 .. 11.06, standing
    // 34 cm proud of the wall, and it covered the lot. The board is west of the door now, in the
    // 25 cm between the shop's third crate (which ends at 7.80) and the glass door's reveal (which
    // starts at 8.42); the two plates are on the 40 cm of white pier west of window 1.
    //
    // No `solid`, no `blocker`, and the narrowest run in the district is still the 1.21 m beside
    // the fruit trike, untouched by any of the three.
    aBoard(8.05, -2.55, '今日特价', ['鸡蛋 四块五', '青菜 两块'], REDD);
    aBoard(-8.35, -2.44, '本店招牌', ['牛肉面 十八', '加面 免费'], C('#8a2f2f'));
    aBoard(12.55, -2.46, '五金电器', ['水暖 电料', '开锁 换锁'], C('#1f4f8f'));

    // ---- A8. 门牌号. The same blue enamel plate as the 单元门's, on the same alley's numbering:
    // even numbers on the block side, rising eastward, with the 单元门's own 十八号 between the
    // noodle shop and the 超市 where it already is.
    numPlate(-9.38, 2.30, EZ + .205, '十四号');    // 老李面馆
    numPlate(4.72, 2.32, EZ + .085, '二十号');     // 幸福超市
    numPlate(22.10, 1.30, HWW + .012, '二十四号'); // 五金电器, on the corner block's return

    // ---- D3. Two more 竖幅, which street.js's own comment calls "the vertical kind on every
    // Chinese shopfront" and then hangs only two of. Same cloth, same 34 cm width, same 1.44 m
    // drop as the pair at x 4.10 and 11.10 — and no glow on either, unlike those two.
    hangBanner(-8.95, EZ + .80, EZ + .19, RED, '手工拉面');
    hangBanner(16.20, -2.15, HWG, C('#1f4f8f'), '水电维修');

    // ---- D5. The bilingual under-plate, on the three names off this alley a learner most needs.
    // Under the box sign rather than under the fascia board: the fascia is the shell's and the
    // 超市's own awning at 3.16 would have swallowed a strip hung below it.
    subPlate(3.05, 2.09, EZ + .022, 'chāoshì', 'supermarket');
    subPlate(-3.40, 2.09, EZ + .022, 'miànguǎn', 'noodle shop');
    subPlate(17.00, 2.09, HWG + .03, 'wǔjīn diànqì', 'hardware');

    // ---- D6. 春联 on three shop doors. The alley's residential gates have had a pair since
    // street-entry.js and its shops have had none, which is backwards: a shop puts them up
    // because it wants the money, and takes them down later than anybody.
    couplet(SHOPDOOR, 1.52, EZ + .51, .59, '生意兴隆', '财源广进', '开门大吉');
    couplet(RSTDOOR, 1.52, EZ + .50, .59, '日进斗金', '四季平安', '万事如意');
    couplet(HWB, 1.52, HWG + .215, HWJ, '货真价实', '童叟无欺', '恭喜发财');
  };

  // ===========================================================================================
  // what moves, and what comes on when
  // ===========================================================================================
  StreetFit['retail'].tick = (t, body, mins) => {
    // ---- 走字屏. Six characters sliding along the awning valance and wrapping round. Writing
    // the translation column of the matrix directly is the whole animation: the quads are already
    // scaled and already facing +z, and nothing but where they are changes. `cx` goes with it,
    // because the draw loop culls off that and a character whose recorded centre is five metres
    // behind it gets dropped while it is still on screen.
    const run = led.props;
    if (run.length) {
      const head = (t * 1.15) % (led.span + run.length * led.step);
      for (let i = 0; i < run.length; i++) {
        const p = run[i], x = led.from + led.span - head + i * led.step;
        // Off the end of the board either side: parked out of sight rather than allowed to slide
        // across the brickwork next door.
        p.m[12] = (x > led.from - .05 && x < led.from + led.span + .05) ? x : -9999;
        p.cx = p.m[12];
      }
    }

    if (mins === undefined) return;
    const h = (mins / 60) % 24;
    const dark = isDark(h);
    // Everything below is written only when the state changes. The state is dark-or-not plus one
    // bit per shop for open-or-not, packed into a single integer so the test is one comparison
    // rather than seven.
    let k = dark ? 1 : 0, bit = 2;
    for (const key in HOURS) { if (trading(key, h)) k += bit; bit *= 2; }
    if (k === phase) return;
    phase = k;

    for (const e of lit) {
      // A sign is lit when the shop is open and it is dark enough to be worth it. An interior —
      // the drinks fridge, the light behind a doorway — is on whenever the shop is open, because
      // a shop with its lights off at two in the afternoon is a shop that is shut. The one
      // exception is the bulb behind the dead unit's shutter, whose hours are all of them.
      const open = trading(e.key, h);
      e.p.glow = open ? (dark ? e.g : e.g * .28) : 0;
    }
    for (const e of lamps) e.l.on = trading(e.key, h) && dark;
    for (const e of pools) e.g.a = trading(e.key, h) && dark ? e.a : 0;
  };
})();
