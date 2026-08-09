// 客厅 — the living room — owns World.WIN
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
//   客厅   x -1.40 .. 3.40   z -1.60 .. 1.60   floor at DECK[2]   H 2.60
//
// ---------------------------------------------------------------- what is load-bearing here
//
// This room owns `World.WIN`, and `World.WIN` is not decoration. js/game.js line 7 hands it
// straight to `R.setWindow`, and the fragment shader's `beam()` marches from every lit point
// toward the sun until it crosses the plane z = uWinPos.z, then tests the rectangle. That is
// where the shaft of daylight on the floor comes from, and it is also where `winK` — the
// weighting between direct sun and diffuse sky that every indoor surface in the game is lit by —
// comes from. Two consequences constrain everything below:
//
//   1. `beam()` returns 0 unless the sun's z is negative, so the opening must be in a wall the
//      room stands on the **+z side of**. The 客厅's window wall is z = -1.60 and the room runs
//      to z = +1.60, which is the one orientation that works. Nothing here may move it.
//   2. `uWinPos` is compared against `vW`, a **world** position, so `WIN.y` is an absolute world
//      height — the deck plus the sill height, not the sill height on its own. Getting that
//      wrong does not break the window, it silently drops the shaft through the floor.
//
// The shader also dims a cross at the centre of the opening (`bars`, ±0.055 either side of
// uWinPos.x and uWinPos.y), which is the painted shadow of a mullion and a transom. So the real
// window is built with a mullion at exactly WIN.x and a transom at exactly WIN.y, or the room
// gets a cross of shade lying across glass that has no bar in it.
//
// ---------------------------------------------------------------- the view
//
// Being high up is the point of the whole building, so the window looks *down*. The layer order
// of the skyline is inverted from the old hutong flat's, and the note on `city()` below explains
// why that single inversion is what reads as altitude.
//
// ---------------------------------------------------------------- coordinates
//
// `A` is in the flat's world (x, z) and — like the mall's tenant frame — a y measured from the
// floor of the deck this room sits on, which the toolkit lifts. `LIFT` below is the one place
// that assumption lives: if the shell hands absolute world y instead, set LIFT to A.y0 and every
// number in this file still means what it says.
//
// ---------------------------------------------------------------- what this room does NOT own
//
// ART.md's ownership table gives a room its own floor and ceiling. This room has neither to give.
// `buildShell` in js/world.js lays ONE board slab and ONE ceiling quad across the whole of DECK[2]
// — `flat(0, y2 + .004, …, RX * 2, FLAT.z1 - FLAT.z0, col.floor, { mat:'wood', matScale:1.15,
// matAmt:.30, nrmAmt:.35 })` and the `ceiling` beside it — so the boards under this room are the
// same prop as the boards under the 卧室 and the 厨房, already materialled, and the ceiling with
// them. Laying a second floor here would put two quads at one height, which world.js already warns
// about a few lines further down, and re-scaling the shell's would re-scale every room in the flat.
//
// So there is nothing for this file to do about either surface, and that is the correct outcome
// rather than an omission: a slab shared with the room next door is the shell's. What is left in
// scope here is furniture, fixtures and soft goods, which is what the material block below dresses.
// Skirting, the window reveal proper and the partitions are js/home-walls.js's.

// The window opening, declared out here so js/world.js can read it without having built the room
// — `World.WIN` is wanted at boot and the flat is built lazily. The builder also writes these
// numbers into whatever the shell offers (see the handover block), so there are three ways for
// them to arrive and no way for them to arrive stale.
const LIVING_DECK = 3.10;      // APARTMENT.md: DECK[2], your floor
const LIVING_WINY = 1.40;      // centre of the opening, above this room's floor
const LIVING_WIN = {
  x: 1.00,                     // centred on the 4.80 m external wall, not on the furniture
  y: LIVING_DECK + LIVING_WINY,
  z: -1.52,                    // 8 cm proud of the plaster, on the plane of the frame
  hw: 1.30,                    // opening x -0.30 .. 2.30
  hh: 0.85,                    // opening y  0.55 .. 2.25 above the floor
};

FlatFit['living'] = A => {
  const Y0 = (A && typeof A.y0 === 'number') ? A.y0 : LIVING_DECK;
  // The toolkit takes absolute world y. All authored measurements in this file are deliberately
  // floor-relative, so lift them onto the deck the shell handed us. Leaving this at zero made the
  // whole room build inside the lobby and rely on world.js's legacy rescue pass every boot.
  const LIFT = Y0;

  // ---------------------------------------------------------------- the WIN handover
  // The living room owns the opening; js/world.js owns the `WIN` object that `game.js` reads.
  // Rather than ask the shell to duplicate these numbers — two copies of a load-bearing constant
  // in two files edited by two people is how the shaft ends up pointing at a wall — the builder
  // writes them across whichever channel the shell has provided. All three are optional and all
  // three are idempotent.
  LIVING_WIN.y = Y0 + LIVING_WINY;
  if (A && A.WIN && typeof A.WIN === 'object') Object.assign(A.WIN, LIVING_WIN);
  if (A && typeof A.setWin === 'function') A.setWin(LIVING_WIN);

  // ---------------------------------------------------------------- toolkit
  // The documented surface, in this room's frame.
  const box   = (x,y,z,sx,sy,sz,c,o) => A.box  (x, y+LIFT, z, sx, sy, sz, c, o || {});
  const cyl   = (x,y,z,r,h,c,o)      => A.cyl  (x, y+LIFT, z, r, h,       c, o || {});
  const ball  = (x,y,z,rx,ry,rz,c,o) => A.ball (x, y+LIFT, z, rx, ry, rz, c, o || {});
  const cap   = (x,y,z,sx,sy,sz,c,o) => A.cap  (x, y+LIFT, z, sx, sy, sz, c, o || {});
  const taper = (x,y,z,sx,sy,sz,c,o) => A.taper(x, y+LIFT, z, sx, sy, sz, c, o || {});
  const flat  = (x,y,z,w,d,c,o)      => A.flat (x, y+LIFT, z, w, d,       c, o || {});
  const glyph = (x,y,z,yaw,t,o)      => A.glyph(x, y+LIFT, z, yaw, t,     o || {});
  const th    = (hz,x,y,z,zh,en,n,o) => A.th   (hz, x, y+LIFT, z, zh, en, n, o || {});
  const stop  = (x0,x1,z0,z1)        => A.stop (x0, x1, z0, z1);
  const sha   = (x,z,w,d,a)          => A.shade(x, z, w, d, a === undefined ? .42 : a);
  const light = (x,y,z,c,p,r)        => A.light(x, y+LIFT, z, c, p, r);
  // 407 — until this line js/home-roof.js was the only js/home-*.js module that read `Weather`
  // at all, which made the apartment the largest weather-blind building in the game. Read ONCE,
  // at build — the flat is rebuilt on every scene entry — and never in the draw.
  const wxWet = (() => {
    const w = (typeof Weather !== 'undefined' && Weather.now) ? Weather.now : null;
    return w ? Math.max(0, Math.min(1, w.wet || 0)) : 0;
  })();
  const mtrs  = (x,y,z,ry,sx,sy,sz)  => M.trs(x, y+LIFT, z, ry, sx, sy, sz);

  // Everything past this line is machinery the shell may or may not have hung on `A` yet: the
  // mover/emitter registries the game loop drives by name, the sky-tinted pane list, the three
  // skyline layers `setCity` re-tints, the dial list the clock's hands are re-aimed from, and the
  // glow pool the television throws. Each is optional. Absent, the room still builds — it simply
  // has a window that does not slide, a screen that is always the same brightness and a clock
  // whose hands do not move — and none of that is a crash.
  const fn = n => (A && typeof A[n] === 'function') ? A[n] : null;
  const mover   = fn('mover');
  const emitter = fn('emitter') || fn('emit');
  const glowFn  = fn('glow');
  const dialReg = fn('dial');
  const skyReg  = fn('sky');
  const cityReg = fn('city');
  const tvReg   = fn('tv');
  // The toolkit exposes registration FUNCTIONS, not its private sky/city arrays. The old code
  // looked for `A.skyGlass` and an array-shaped `A.city`, found neither, and silently left every
  // pane and skyline prop out of the lists that the clock repaints. Register through the public
  // surface, just as every upper-floor window does. Variadic on purpose: the 北京 glyph below is
  // two props and both characters must join the lit-window layer.
  const sky = (...ps) => {
    if (skyReg) for (const p of ps) if (p) skyReg(p);
    return ps[0];
  };
  const city = layer => (...ps) => {
    if (cityReg) for (const p of ps) if (p) cityReg(layer, p);
    return ps[0];
  };
  const far = city(0), near = city(1), lit = city(2);

  const mix = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------- palette
  // Held locally rather than reached for out of world.js, because `C()` mints a fresh array per
  // call and the scene's wood-colour Set is keyed on identity: a colour built here is not the
  // same object as the same hex built there, so `mode: 6` never gets inferred for it. Every
  // timber surface below therefore says `mode: 6` out loud.
  const col = {
    white: C('#c8c7c1'), cream: C('#bcb8ac'), linen: C('#b3aa9c'), paper: C('#bbb29f'),
    trim: C('#5a4433'), woodD: C('#4b3628'), woodM: C('#76583e'), woodL: C('#a7835b'),
    charcoal: C('#2a2e33'), black: C('#171a1f'), steel: C('#aeb5bb'), grey: C('#838b93'),
    jade: C('#3f7564'), jadeL: C('#69a08a'), gold: C('#d19a32'),
    red: C('#a43c2c'), redD: C('#793025'),
    sky: C('#c4dbea'), glass: C('#b4c1c1'), clay: C('#7a4a38'), clayL: C('#96573c'),
    terra: C('#a65e3e'), plant: C('#4b7d43'), plantD: C('#315d32'),
  };
  const G = { matte: .05, wood: .20, paint: .14, fabric: .03, metal: .62, glass: .85 };
  // ---------------------------------------------------------------- the material kit
  //
  // ART.md's kit, tuned against `.audit.js 12-sofa 13-desk`. `matScale` is METRES PER REPEAT, so
  // every number here is the size of the real thing in the photograph and not a taste setting.
  //
  // The earlier version of this block ran fabric at .70/.20 with a note warning that matAmt above
  // ~.40 "stops being texture and starts being a repaint". The warning is right about .40 and
  // wrong about why .20 was needed: it predates gl.js reading each material's *measured* mean
  // (`textureMean`, gl.js:2536, fed from Assets' `measureMean`). The shader now divides by the
  // photograph's own linear mean rather than a nominal 0.22, so a material contributes contrast
  // and grain at the albedo the palette above chose. That is what makes .28 safe here where .20
  // was cautious before — nothing below lifts toward white, it only gains weave.
  //
  // Fabric081C is a close-woven upholstery photograph. At .70 m per repeat its weave came out
  // twice life size and read as flat cloth from the sofa distance; .34 puts the weave back at the
  // scale a hand would feel. Curtains and the rug are the same cloth seen at 2-3 m across a much
  // larger area, so they get a coarser repeat — a fine weave stretched over 2.9 m of rug is just
  // noise, and a coarse one is pile.
  //
  // `nrmAmt` stays near half. It defaults to 1, and 1 on a large soft surface hands the AO pass a
  // field of relief it turns into cloud — that part of the old note stands and is why none of
  // these reach ART.md's .60.
  // Aliased onto FLAT_PALETTE (js/home-walls.js) rather than restated. The values below were this
  // room's, and they are what the shared kit was resolved TO — the fabric repeat in particular is
  // the measured one described above. Aliasing rather than editing four hundred call sites is the
  // whole point: the flat gets one carcass timber and one upholstery weave, and this room keeps
  // every placement it had.
  const MAT_WOOD   = { ...FLAT_PALETTE.timber };   // carcass timber
  const MAT_TRIM   = { ...FLAT_PALETTE.joinery };  // small joinery
  const MAT_FABRIC = { ...FLAT_PALETTE.cloth };    // upholstery
  const MAT_DRAPE  = { ...FLAT_PALETTE.drape };    // curtains, throw
  // The rug is the one soft good in the room seen face-on rather than edge-on, and it is lit from
  // directly above by the ceiling drum. That geometry is why it sits at ART.md's fabric row while
  // the curtain sits under it: on a surface whose normal points at the light, the colour map has
  // almost no shading to modulate and the relief is the channel that carries the pile. A curtain is
  // seen at a grazing angle and mostly in its own fold shadow, where the reverse is true.
  //
  // These are ART.md's numbers, not numbers pushed up to make texture visible. Nothing in this file
  // exceeds the kit: matAmt tops out at ART.md's .30 and every nrmAmt is under its .60. If the room
  // still reads flat that is base-albedo headroom, which is not something a material can buy back —
  // see ART.md, "Value range comes first". Turning these up would only make it muddy and brighter.
  const MAT_RUG    = { mat: 'fabric', matScale: .48, matAmt: .30, nrmAmt: .56 };  // pile, seen flat
  // Metal049A is near-featureless: it contributes almost no pattern at any scale, only brightness,
  // and the mean division cancels the brightness. So this is deliberately a whisper — it exists to
  // stop a rail or a handle reading as painted plastic, and matAmt above .20 buys nothing.
  const MAT_METAL  = { ...FLAT_PALETTE.fitting };  // fittings

  // The living group's centre line: sofa, tea table, television, the photograph wall over it, the
  // rug under it and the ceiling disc above it. Everything that belongs to that arrangement is
  // written off X, so the group moves as one thing.
  //
  // 0.95 -> 0.70 on 2026-08-08, and this is a MEASURED move rather than a nudge. .flatcheck.js
  // reported 餐厅 and 厨房 as "0 cells at 0.2 m clearance" and the 客厅|餐厅 doorway was blamed
  // twice and widened twice, 0.80 to 0.90 to 1.00, without moving the number by a single cell.
  // The doorway was never the fault. Walking the lattice cell by cell across it showed the opening
  // itself passing at 0.20 and the failure sitting one column WEST of it, in the living room:
  //
  //   z  0.05 | 2.25X 2.35. 2.45+ 2.55+ 2.65+ 2.75+ 2.85+ 2.95+ 3.05+     (+ passes, . free, X blocked)
  //
  // x 2.25 is blocked and x 2.35 is free but too tight, so the doorway's passable island had no
  // way in. The collider doing it is this sofa's: it ran x -0.11 .. 2.01 and the wall's west face
  // is at 2.70, which is a 0.69 m gap — and clampMove takes 0.30 off each side of that, leaving
  // 0.09 m of legal centre. A body cannot walk down the side of the sofa to the dining room, and
  // everything past the dining room is the kitchen.
  //
  // Moving the whole group 0.25 west puts the sofa's inflated edge at 2.06 against the wall's 2.40
  // — 0.34 m of legal centre, over the 0.30 the 0.10 lattice needs to resolve at any phase. The
  // group is what moves, not the sofa: shifting the sofa alone would leave it off the television's
  // axis, which is the one alignment a living room has. Checked west as well — the tea table lands
  // at 0.02..1.38 and the console at -0.28..1.68, both well clear of the 走道 opening at
  // x -1.85 .. -0.85 and of the 主卧 wall inflated to -2.30.
  const X  =  0.70;
  const NW = -1.60;     // the window wall
  const SW =  1.60;     // the television wall, backing onto the 走道
  const WW = -1.40;     // the west wall

  // ================================================================ 窗户 the window
  //
  // Built as a relief on the room-side face of the plaster rather than through a hole in it, the
  // way the old flat's window was: the sky pane stands a centimetre proud of the wall and the
  // reveal, frame, glass and sill stack forward from there. That means this file needs nothing
  // cut out of the shell's z = -1.60 wall — only that the wall is there, facing +z, and that
  // nothing else is hung on it between x -1.40 and 3.40.
  const WX = LIVING_WIN.x, WY = LIVING_WINY, WHW = LIVING_WIN.hw, WHH = LIVING_WIN.hh;
  const OX0 = WX - WHW, OX1 = WX + WHW;     // the opening: x -0.30 .. 2.30
  const OY0 = WY - WHH, OY1 = WY + WHH;     //              y  0.55 .. 2.25

  // Depths. Each layer steps forward out of the recess; nothing shares a plane with anything in
  // front of it, and the backdrop clears the plaster by a centimetre.
  const Z_BACK = -1.590, Z_HAZE = -1.586, Z_FAR = -1.578, Z_MID = -1.572, Z_MIDLIT = -1.569,
        Z_NEAR = -1.564, Z_ROOF = -1.560, Z_TANK = -1.557, Z_NEARLIT = -1.554, Z_SIGN = -1.551,
        Z_PARK = -1.548, Z_ROAD = -1.544, Z_CAR = -1.541,
        Z_REVEAL = -1.535, Z_FRAME = -1.500, Z_GLASS = -1.487, Z_SASH = -1.430,
        Z_SILL = -1.470, Z_RAIL = -1.320, Z_CURT = -1.310;

  // ---- the sky, and the pane that takes its colour. `setCity` re-tints the skyline every hour
  // and the day/night pass rewrites every entry of skyGlass, so both lists have to be joined or
  // this window stays cold blue under a sunset.
  sky(box(WX, WY, Z_BACK, WHW * 2 + .22, WHH * 2 + .16, .020, col.sky,
    { hard: true, mode: 1, glow: .05 }));

  // ---- the view.
  //
  // **This flat is on deck 2, not deck 14.** The view was first composed for a high floor — the
  // horizon low in the glass, every near block finished with a pale roof deck and a water tank —
  // and that is a view looking *down* on a city. Standing in this room you are about 4.7 m above
  // the courtyard: the whole 小区 is taller than you and you look *up* at it.
  //
  // So the horizon is the eye line, a little above the middle of the glass, and the layers stack
  // the way they do from a low floor:
  //   · nothing has a visible roof. A roof deck is the one surface you never see from below, and
  //     it was the loudest single tell that this window was painted from the wrong storey.
  //   · the near wing and the 板楼 slabs opposite both cross the eye line and run up out of the
  //     opening, cut off by the window head — which is the read that says "I am near the bottom
  //     of a tall block", and no amount of horizon nudging replaces it.
  //   · the distant towers are the *small* layer again, sitting on the horizon in the gaps
  //     between the slabs, because from down here the neighbours hide most of the city.
  //   · the ground is close. The courtyard trees come up to just under the eye line rather than
  //     reading as canopies seen from above, and the road is a strip at the very bottom, seen
  //     almost edge-on instead of in plan.
  const HZ = 1.52;                                  // the horizon = the eye line, 0.12 over centre
  let seed = 20240817;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // A band of smog sitting on the horizon. Beijing's distance is not blue, it is white.
  box(WX, HZ + .05, Z_HAZE, WHW * 2 + .10, .30, .008, C('#cfe6ef'),
    { hard: true, mode: 1, alpha: .40 });

  // Far layer: the rest of the city, small and pale, sitting *on* the eye line. Mostly hidden
  // behind the slabs opposite — which is the point, and why it is cheap.
  for (let x = OX0 - .04; x < OX1 + .02;) {
    const w = .055 + rnd() * .085, h = .06 + rnd() * .26, cx = x + w / 2, base = HZ - .16;
    far(box(cx, base + h / 2, Z_FAR, w * .96, h, .010, C('#a9bccd'), { hard: true, mode: 1 }));
    if (rnd() > .58)
      far(box(cx, base + h + .014, Z_FAR, w * .46, .028, .010, C('#a9bccd'),
        { hard: true, mode: 1 }));
    x += w + .012 + rnd() * .030;
  }

  // Middle distance: the 板楼 slabs of the block opposite, across the courtyard. Bases below you
  // on the near ground, tops well over the eye line — six or seven storeys seen from the second.
  // The lit flats run a fixed number of rows so a taller slab costs no more props than a short
  // one: window pitch scales with the building the same way perspective does.
  for (let x = OX0 - .06; x < OX1 + .02;) {
    const w = .110 + rnd() * .130, h = .62 + rnd() * .44, cx = x + w / 2, base = .92;
    near(box(cx, base + h / 2, Z_MID, w * .97, h, .010, C('#6f8a9b'), { hard: true, mode: 1 }));
    for (let r = 0; r < 4; r++) {
      const ry = base + .09 + r * (h - .18) / 3;
      for (const c of [-.28, 0, .28]) if (rnd() > .58)
        lit(box(cx + c * w, ry, Z_MIDLIT, .015, .022, .006,
          C(rnd() > .55 ? '#ffd08a' : '#bcd3e2'), { hard: true, mode: 1, glow: .16 }));
    }
    x += w + .014 + rnd() * .042;
  }

  // Near layer: the wing of this same 小区 nearest the glass. Fewer and wider than the slabs
  // behind — closer means bigger in the frame — and they run off the top of the opening. SKY_TOP is
  // the cap: the frame's head rail spans 2.25..2.34 at Z_FRAME, in front of every city layer, so
  // a block topping out at 2.28 is cut off by the window head instead of ending on a visible
  // edge. Anything above 2.34 would be painted on the plaster, because this view is a relief on
  // the wall and not a hole through it.
  const SKY_TOP = 2.28;
  let signHost = null;
  for (let x = OX0 - .10; x < OX1 + .04;) {
    const w = .22 + rnd() * .24, h = Math.min(1.10 + rnd() * .46, SKY_TOP - .78),
          cx = x + w / 2, base = .78;
    near(box(cx, base + h / 2, Z_NEAR, w * .98, h, .012, C('#4e6072'), { hard: true, mode: 1 }));
    // No roof deck, no water tanks, no aerial: every one of these is over your head.
    for (let r = 0; r < 5; r++) {
      const ry = base + .10 + r * (h - .20) / 4;
      for (const c of [-.32, -.11, .11, .32]) if (rnd() > .52)
        lit(box(cx + c * w, ry, Z_NEARLIT, .019, .026, .006,
          C(rnd() > .48 ? '#ffcf85' : '#cfe0ec'), { hard: true, mode: 1, glow: .18 }));
    }
    if (!signHost || w > signHost.w) signHost = { cx, h, w, base };
    x += w + .020 + rnd() * .055;
  }

  // The lit sign on the wing opposite — hung down the *face*, not stood on a roof, because from
  // here a roof sign would be a sign you cannot see. It joins the lit-window list so it comes up
  // as the sky goes down; the board behind it stays dark, being a board.
  if (signHost) {
    const sy = signHost.base + signHost.h * .62;
    near(box(signHost.cx + signHost.w * .30, sy, Z_SIGN,
      Math.min(.058, signHost.w * .26), .105, .006, C('#1d2126'), { hard: true, mode: 1 }));
    lit(...glyph(signHost.cx + signHost.w * .30, sy, Z_SIGN + .003, 0, '北京',
      { size: .042, gap: .005, vertical: true, lift: .002, mode: 1, glow: .18,
        gloss: G.matte, color: C('#ff8a52') }));
  }

  // The 小区 courtyard, close underneath. The trees come up to just under the eye line — from the
  // second floor you are level with the crowns, not looking down onto them — and they stand in
  // front of the slab bases opposite, which is where trees in a courtyard actually are.
  box(WX, .820, Z_PARK, WHW * 2 - .10, .120, .008, C('#3e5a44'), { hard: true, mode: 1 });
  for (let i = 0; i < 7; i++) {
    const tx = OX0 + .16 + i * ((WHW * 2 - .32) / 6) + (rnd() - .5) * .06;
    ball(tx, .952 + rnd() * .030, Z_PARK + .003, .052 + rnd() * .022, .080, .010,
      C(rnd() > .5 ? '#4b7d43' : '#3d6b3c'), { mode: 1 });
  }
  // The 小区 road at the very bottom of the glass, seen almost edge-on rather than in plan.
  // Traffic on it in both directions: warm beads going one way, red the other, which at this
  // scale is the only thing a road needs.
  box(WX, .625, Z_ROAD, WHW * 2 - .04, .046, .008, C('#2e343b'), { hard: true, mode: 1 });
  box(WX, .625, Z_ROAD + .002, WHW * 2 - .04, .003, .006, C('#5a6068'), { hard: true, mode: 1 });
  for (let i = 0; i < 14; i++) {
    const cx2 = OX0 + .04 + rnd() * (WHW * 2 - .08), up = i % 2 === 0;
    lit(box(cx2, .625 + (up ? .010 : -.010), Z_CAR, .012, .007, .005,
      C(up ? '#ffd9a0' : '#e4553f'), { hard: true, mode: 1, glow: .22 }));
  }
  // The strip of ground between the road and the courtyard wall.
  box(WX, .578, Z_ROAD, WHW * 2 - .02, .058, .008, C('#4a5856'), { hard: true, mode: 1 });

  // ---- the reveal. A 13 cm returned recess, which is what a wall this thick actually has, and
  // what stops the sky reading as a poster taped to the plaster.
  for (const s of [-1, 1])
    box(WX + s * (WHW + .145), WY, Z_REVEAL, .11, WHH * 2 + .30, .130, col.cream,
      { hard: true, gloss: G.paint });
  box(WX, OY1 + .145, Z_REVEAL, WHW * 2 + .40, .11, .130, col.cream,
    { hard: true, gloss: G.paint });

  // ---- 窗台 the sill. Deep, because a Chinese windowsill is a shelf, and this is the brightest
  // horizontal surface in the flat.
  box(WX, OY0 - .045, Z_SILL, WHW * 2 + .40, .09, .260, col.white,
    { tag: '窗户', hard: true, gloss: G.paint });
  cap(WX, OY0 - .052, Z_SILL + .128, .022, WHW * 2 + .40, .022, col.white,
    { rz: Math.PI / 2, tag: '窗户', gloss: G.paint });

  // ---- the frame. The mullion stands at exactly WIN.x and the transom at exactly WIN.y so the
  // painted cross the shader draws in the shaft has a real bar behind it — see the header.
  for (const [x, y, sx, sy] of [
    [OX0 - .045, WY,         .09, WHH * 2 + .10],
    [OX1 + .045, WY,         .09, WHH * 2 + .10],
    [WX,         OY1 + .045, WHW * 2 + .18, .09],
    [WX,         WY,         .055, WHH * 2 - .04],     // mullion, on WIN.x
    [WX,         WY,         WHW * 2 - .04, .055],     // transom, on WIN.y
  ]) box(x, y, Z_FRAME, sx, sy, .090, col.white, { tag: '窗户', hard: true, gloss: G.paint });

  // ---- the glass. Four fixed lights, built after the city behind them on purpose: transparent
  // props still write depth in this renderer, and a pane drawn first deletes whatever is meant to
  // show through it. Thinner than the old flat's .22 as well — this is a picture window and the
  // view is the reason for it.
  const paneW = (WHW * 2 - .095) / 2 - .015;
  for (const px of [WX - paneW / 2 - .028, WX + paneW / 2 + .028])
    for (const [py, ph] of [[mix(OY0, WY - .0275, .5), (WY - .0275) - OY0],
                            [mix(WY + .0275, OY1, .5), OY1 - (WY + .0275)]])
      box(px, py, Z_GLASS, paneW, ph, .016, col.glass,
        { tag: '窗户', hard: true, alpha: .15, gloss: G.glass });

  // ---- the opening leaf. A 推拉窗, not a casement: nobody puts an inward-swinging sash on a
  // tower, and a leaf that slides along its own track in front of the fixed light is both what is
  // actually up there and one fewer hinge to get wrong. It runs on the near track, so it stacks
  // over the fixed pane beside it instead of through the mullion.
  const LX = WX - paneW / 2 - .028, LY = mix(OY0, WY - .0275, .5), LH = (WY - .0275) - OY0;
  const leaf = [];
  for (const [dx, dy, sx, sy] of [
    [0, LH / 2 - .022, paneW + .09, .044], [0, -LH / 2 + .022, paneW + .09, .044],
    [-paneW / 2 - .023, 0, .044, LH], [paneW / 2 + .023, 0, .044, LH],
  ]) leaf.push(box(LX + dx, LY + dy, Z_SASH, sx, sy, .044, col.white,
    { tag: '窗户', hard: true, gloss: G.paint }));
  leaf.push(
    box(LX, LY, Z_SASH, paneW + .02, LH - .05, .014, col.glass,
      { tag: '窗户', hard: true, alpha: .15, gloss: G.glass }),
    cap(LX + paneW / 2 + .012, LY - .06, Z_SASH + .038, .022, .150, .022, col.steel,
      { tag: '窗户', gloss: G.metal, ...MAT_METAL }));
  if (mover) mover('window', leaf, v => M.trans((paneW + .095) * v, 0, 0));

  // ---- 窗帘 the curtains. Full length, as a living room's are, on a rail that overruns the
  // opening at both ends so that drawn back they stand clear of the glass instead of masking a
  // strip of it. Open, each half is bunched at its end of the rail; closed, every fold slides in
  // and widens until the two halves meet over the mullion.
  cap(WX, OY1 + .17, Z_RAIL, .030, WHW * 2 + .62, .030, col.steel,
    { rz: Math.PI / 2, gloss: G.metal, ...MAT_METAL });
  for (const s of [-1, 1]) {
    cap(WX + s * (WHW + .33), OY1 + .17, Z_RAIL, .048, .048, .048, col.steel,
      { gloss: G.metal, ...MAT_METAL });
    box(WX + s * (WHW + .30), OY1 + .11, Z_RAIL - .03, .05, .13, .07, col.steel,
      { hard: true, gloss: G.metal, ...MAT_METAL });
    const bx = WX + s * (WHW + .14), folds = [];
    for (let p = -1; p <= 1; p++)
      folds.push(box(bx + p * .075, 1.22, Z_CURT, .12, 2.32, .12,
        p === 0 ? col.linen : C('#aba08f'),
        { tag: '窗帘', mode: 7, gloss: G.fabric, ...MAT_DRAPE }));
    if (mover) mover(s < 0 ? 'curtainL' : 'curtainR', folds, (v, i, m0) => {
      const x0 = m0[12], tx = mix(x0, WX + s * (1.14 - i * .44), v), sc = mix(1, 3.8, v);
      return M.mul(M.trans(tx, 0, 0), M.mul(M.scale(sc, 1, 1), M.trans(-x0, 0, 0)));
    });
  }

  // ---- what is on the sill. A two-and-a-half metre shelf in the brightest part of the flat is
  // never empty. A 绿萝 trailing over the front edge at one end, a jar of tea leaves catching the
  // light at the other.
  taper(OX1 - .28, OY0 + .085, Z_SILL - .01, .155, .170, .155, C('#9c6a4a'), { gloss: .22 });
  cyl(OX1 - .28, OY0 + .172, Z_SILL - .01, .062, .014, C('#3a2f28'), { gloss: G.matte });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, len = .10 + (i % 4) * .05;
    cap(OX1 - .28 + Math.cos(a) * .048, OY0 + .185 + len / 2, Z_SILL - .01 + Math.sin(a) * .048,
      .034, len, .012, C(i % 2 ? '#4b7d43' : '#5f9a4c'),
      { ry: a, rz: Math.cos(a) * .55, rx: Math.sin(a) * .30, gloss: .24, mode: 7 });
  }
  // Two runners hanging over the front lip, which is what a 绿萝 does and what says the pot has
  // been there a while.
  for (const s of [-1, 1])
    cap(OX1 - .28 + s * .10, OY0 + .075, Z_SILL + .080, .028, .190, .012, C('#4b7d43'),
      { rz: s * .35, rx: .55, gloss: .24, mode: 7 });
  cyl(OX0 + .26, OY0 + .062, Z_SILL - .02, .052, .124, C('#8c9aa8'), { gloss: .34 });
  cyl(OX0 + .26, OY0 + .131, Z_SILL - .02, .054, .016, col.red, { gloss: .30 });

  // ---- the daylight. The shaft itself is the shader's; this is the soft ambient patch under the
  // opening that no point light without global illumination will ever produce on its own, and it
  // is marked `sun` so it fades with the clock.
  if (glowFn) glowFn(mtrs(WX, .02, NW + .62, 0, WHW * 2 + .50, 1, 1.30), C('#ffe4b8'), .11, true);

  th('窗户', WX, OY1 + .12, Z_FRAME + .06, '从这里能看见半个北京。',
    'You can see half of Beijing from here.',
    '窗 = window, 户 = door/household. Fourteen floors up, it is the best thing in the flat.',
    { focus: [WX, NW + .95], reach: 1.8 });
  th('窗帘', WX - WHW - .16, 1.70, Z_CURT + .10, '晚上我拉上窗帘。', 'At night I draw the curtains.',
    '拉 lā to pull: 拉上 to draw closed, 拉开 to draw open.',
    { focus: [WX - WHW, NW + .95], reach: 1.6 });

  // ================================================================ 电视 + 电视柜
  //
  // On the interior wall, facing the window. The sofa sits with the city behind it and the screen
  // in front, which is both the commonest arrangement in a flat this shape and the one that keeps
  // every large object off the external wall.
  const TZ = 1.36;                       // centre of the console; the wall is at z = 1.60
  // Everything from here to the `shade` below is ONE FIXTURE, tagged in a single sweep at the end
  // of the block. Before this the console carried no tag at all while the set carried '电视', so
  // `hiddenProp` judged each of the cabinet's ten parts by its own z: the carcass at 1.36 went with
  // the wall and the door fronts at 1.13 stayed behind, which is half a cabinet standing in the
  // air. Same fault as the photograph wall above, arrived at from the other direction — there by a
  // tag shared across five decks, here by no tag at all.
  const TVP0 = (A.props || []).length;
  box(X, .045, TZ + .01, 1.74, .09, .40, col.trim, { hard: true, gloss: G.wood, ...MAT_WOOD });
  box(X, .245, TZ, 1.86, .32, .44, col.woodD, { mode: 6, ...MAT_WOOD });
  box(X, .420, TZ, 1.92, .06, .48, col.woodL, { mode: 6, ...MAT_WOOD });
  // A drawer on the left and an open bay on the right. Two matching blank doors under a
  // television is a carcass with lines drawn on it; the shadowed mouth is what says there is an
  // inside, and the boxes in it are where the set-top box and the router actually live.
  box(X - .46, .245, TZ - .232, .80, .24, .022, col.woodM, { hard: true, mode: 6, ...MAT_WOOD });
  cap(X - .46, .245, TZ - .252, .020, .30, .020, col.gold,
    { rz: Math.PI / 2, gloss: G.metal, ...MAT_METAL });
  box(X + .46, .245, TZ - .230, .80, .25, .020, C('#211d1a'), { hard: true, gloss: .06 });
  box(X + .42, .215, TZ - .248, .34, .09, .16, C('#2a2e33'), { hard: true, gloss: .30 });
  for (let i = 0; i < 3; i++)
    box(X + .30 + i * .045, .215, TZ - .258, .014, .010, .006, C('#7fe0a0'),
      { hard: true, mode: 1, glow: .16 });
  // 机顶盒 on the top, standing forward of the screen so it is not inside it. Its standby light
  // stays lit through the night on purpose — it is the one thing in the flat that never goes off.
  box(X + .70, .490, TZ - .10, .26, .075, .20, C('#2a2e33'), { hard: true, gloss: .34 });
  box(X + .70, .521, TZ - .10, .21, .006, .15, C('#3d444b'), { hard: true, gloss: .42 });
  box(X + .62, .487, TZ - .201, .018, .010, .006, C('#7fe0a0'), { hard: true, mode: 1, glow: .18 });

  const SCZ = TZ - .035;                            // the panel; the screen stands 15 mm proud
  taper(X, .500, SCZ - .015, .26, .100, .26, col.charcoal, { gloss: G.metal, tag: '客厅电视' });
  box(X, .905, SCZ, 1.32, .78, .075, col.black, { tag: '客厅电视', gloss: .42 });
  // A screen is a small bright face, not a lightbox: one flat rectangle of colour reads as a
  // coloured card, so it gets a brighter upper band, a darker block, a raking sheen — and the
  // subtitle strip that is on every Chinese channel all evening, which is the detail that says
  // what country the television is in. The set is dark until it is switched on.
  const screen = [
    box(X, .905, SCZ - .044, 1.20, .66, .018, C('#315d73'),
      { tag: '客厅电视', mode: 1, glow: .14, hard: true }),
    box(X, 1.105, SCZ - .053, 1.18, .19, .006, C('#4d8298'),
      { tag: '客厅电视', mode: 1, glow: .16, hard: true }),
    box(X - .30, .845, SCZ - .053, .38, .24, .006, C('#27506a'),
      { tag: '客厅电视', mode: 1, glow: .09, hard: true }),
    box(X, .655, SCZ - .056, .78, .050, .006, C('#1d3345'),
      { tag: '客厅电视', mode: 1, glow: .08, hard: true }),
    ...glyph(X, .655, SCZ - .060, Math.PI, '新闻联播',
      { size: .046, gap: .014, mode: 1, glow: .16, gloss: G.matte, color: C('#e8f1f6'),
        lift: .002, tag: '客厅电视' }),
    box(X - .26, .905, SCZ - .062, .30, .50, .005, C('#a8d6e4'),
      { tag: '客厅电视', rz: .34, mode: 1, alpha: .11, hard: true }),
  ];
  if (emitter) emitter('tv', screen, .28);
  // The pool the screen throws into the room. Small and dim at rest — see game.js, which drives
  // its alpha between .02 and .18 off the same 0..1 the emitter runs on.
  let tvGlow = null;
  if (glowFn) {
    tvGlow = glowFn(mtrs(X, .88, SCZ - .58, 0, 1.80, 1, 1.15), C('#5b829a'), .08);
    // 404 — the pool is blue on purpose (#5b829a) and js/game.js eases its alpha between .02 and
    // .18 off `fixt.tv`, the same signal the screen quads are on through `emitter('tv', …)`.
    // It is built at the RESTING value rather than at the lit one, so a set nobody switched on
    // does not throw light into the room at four in the morning.
    if (tvReg) { tvGlow.glow = .02; tvReg(tvGlow); }
  }
  // The sweep promised above. It also replaces the '电视' literals on the set itself, which were a
  // tag shared with the neighbours' televisions on decks 3, 5, 7 and 9.
  for (let i = TVP0; i < (A.props || []).length; i++)
    if (A.props[i]) A.props[i].tag = '客厅电视';
  // 402 — the set is a light, not a glow quad. Blue, weak and low; js/gl.js takes the eight
  // nearest lights, so a third fitting in this room costs the sort and nothing in the draw.
  light(X, 1.05, SCZ - .45, C('#5b829a'), .26, 2.30);
  // 402 — and the strip under the console, which is the one fitting in a Chinese living room that
  // is always on. It grounds the cabinet: without it the carcass and the boards meet on a hard
  // line and the unit reads as pasted onto the floor. One prop and one light; the light sits at
  // .10 so it washes the boards rather than the cabinet front.
  box(X, .052, TZ - .265, 1.52, .010, .016, C('#f4e2c0'),
      { tag: '客厅电视', hard: true, mode: 1, glow: .16 });
  light(X, .10, TZ - .30, C('#ffe2b4'), .22, 1.60);
  sha(X, TZ, 2.05, .95, .38);
  stop(X - .98, X + .98, TZ - .24, SW);
  th('电视', X, 1.34, SCZ - .16, '电视里在说中文。', 'They are speaking Chinese on TV.',
    'Leaving it on in the background is free listening practice.',
    { focus: [X, .10], reach: 1.7, tag: '客厅电视' });

  // ================================================================ 照片 the photograph wall
  //
  // THE TAG IS '客厅照片', NOT '照片', AND THAT IS THE WHOLE REASON THESE STOPPED FLOATING.
  //
  // `hiddenProp` (js/game.js:2027) hides a tagged prop by the centre of its TAG GROUP, and
  // `scene.tagBox` is scene-wide. This scene is a twelve-storey building: js/home-f3.js,
  // js/home-f5.js, js/home-f7.js and js/home-f9.js hang photographs in their own flats and all of
  // them wrote `tag: '照片'`. Measured on 2026-08-08, `tagBox['照片']` sat at (-1.87, 0.03) — the
  // average of five flats on five decks — while these five frames stand at x 0.36..1.38, z 1.55.
  //
  // The consequence is exactly what the flat's hero camera showed. The eye comes into the 客厅
  // from the 走道, so it is north of the z = 1.60 wall, the cutaway takes that wall, and the test
  // that should have taken these with it was run against a point a metre and a half away in the
  // middle of the room. `hiddenAt(-1.87, 0.03)` is false in every direction. So the wall vanished
  // and five picture frames stayed hanging in the air where it had been — seen from behind, which
  // in a single-sided renderer is five unlit brown slabs across the top of the frame. The photo
  // faces built by `faces()` below carry no tag at all, so they were culled by their own position
  // and disappeared correctly, which is why the slabs were blank.
  //
  // js/home-walls.js:112 had already found this for the partitions and gives every stretch of wall
  // its own tag. The rooms never did the same for what hangs ON them. A tag is scene-global; in a
  // stacked building a room noun is not a unique name, and the label the player reads is `hz`, the
  // first argument to `th`, so making the tag unique costs nothing the player can see.
  //
  // Frames over the television, which is where they go. A picture hung flush to plaster flickers
  // in stripes, so the backs of these stand 18 mm off the wall and each layer inside a frame steps
  // forward again — checked on the *front* face of the box, not its centre.
  const PZ = 1.565;
  const faces = (fx, fy, w, h, n, warm) => {
    // What is actually in a photograph at two metres is two or three people and a wash of colour.
    // Blobs at this size read as figures; a printed scene does not survive the resolution.
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - .5);
      const px = fx + t * w * .40, r = Math.min(w, h) * (n > 2 ? .13 : .17);
      ball(px, fy + h * .10, PZ - .022, r, r * 1.05, .004,
        C(warm ? '#c9a288' : '#b8ac9c'), { hard: true, gloss: G.matte });
      box(px, fy - h * .16, PZ - .022, r * 2.0, h * .34, .004,
        C(['#8d4a3c', '#3c5670', '#6c6152', '#7d6f8a'][i % 4]), { hard: true, gloss: G.matte });
    }
  };
  for (const [fx, fy, w, h, n, frameC, warm] of [
    [X - .34, 1.82, .52, .40, 3, col.woodD, true],     // 全家福, the big one, in the middle
    [X + .30, 2.04, .26, .32, 1, col.trim,  false],
    [X + .30, 1.63, .32, .25, 2, col.woodM, true],
    [X + .68, 1.84, .23, .29, 1, col.woodD, false],
    [X - .80, 2.06, .27, .21, 2, col.trim,  true],
  ]) {
    box(fx, fy, PZ, w, h, .034, frameC,
      { tag: '客厅照片', hard: true, mode: 6, gloss: .22, ...MAT_TRIM });
    box(fx, fy, PZ - .010, w - .045, h - .045, .020, col.paper,
      { tag: '客厅照片', hard: true, gloss: G.matte });
    box(fx, fy, PZ - .018, w - .105, h - .105, .008, C(warm ? '#d8c3a6' : '#c2cdd4'),
      { tag: '客厅照片', hard: true, gloss: .12 });
    faces(fx, fy, w - .105, h - .105, n, warm);
  }
  // Two more standing on the console, the way the ones that did not get a hook end up.
  for (const [sx, sz, ry, w, h] of [[X - .74, TZ - .13, .34, .17, .21], [X - .56, TZ - .07, -.22, .14, .17]]) {
    box(sx, .450 + h / 2, sz, w, h, .020, col.woodM,
      { tag: '客厅照片', hard: true, mode: 6, ry, rz: -.10, ...MAT_TRIM });
    box(sx, .450 + h / 2, sz - .014, w - .035, h - .035, .006, C('#cdc4b4'),
      { tag: '客厅照片', hard: true, ry, rz: -.10, gloss: .12 });
  }
  th('照片', X - .34, 1.82, PZ - .12, '这是我家的全家福。', 'This is my family photograph.',
    '全家福 quánjiāfú — the whole family in one frame. Also the name of a stew.',
    { focus: [X - .34, .40], reach: 1.8, tag: '客厅照片' });
  // A second one, because a wall with one labelled photograph on it is a picture, and a wall with
  // two is a household. This is the older 相框 — grandparents, taken in a studio, printed square
  // and hung higher than the rest, which is where the oldest 相框 in a Chinese living room ends up.
  // It is a second card on the same wall rather than more geometry: the five frames and the two
  // standing on the console were already built, and what the wall was short of was words.
  th('照片', X + .30, 2.04, PZ - .12, '那张是我爷爷奶奶。', 'That one is my grandparents.',
    '相框 xiàngkuàng is the frame; 照片 zhàopiàn the photograph in it. 挂 guà is the verb for ' +
    'hanging one — 墙上挂着几个相框.',
    { focus: [X + .30, .40], reach: 1.8, tag: '客厅照片' });

  // ================================================================ 空调 the air conditioner
  //
  // High on the side wall near the window, where the pipe run to the outdoor unit is shortest.
  // A 挂机 is the default in a flat this size and it is the single most-used object in a Beijing
  // summer, which is why the vocabulary is worth the wall space.
  const ACZ = -.95;
  box(WW + .138, 2.240, ACZ, .260, .320, .980, col.white, { tag: '客厅空调', gloss: .27 });
  box(WW + .218, 2.118, ACZ, .100, .060, .840, C('#c8c7c1'), { tag: '客厅空调', hard: true });
  for (let i = 0; i < 5; i++)
    box(WW + .246, 2.116, ACZ - .32 + i * .16, .030, .046, .022, col.grey,
      { tag: '客厅空调', hard: true });
  box(WW + .252, 2.318, ACZ + .34, .020, .040, .130, C('#3d444b'), { tag: '客厅空调', hard: true });
  box(WW + .262, 2.318, ACZ + .34, .006, .014, .034, C('#7fe0a0'),
    { hard: true, mode: 1, glow: .40 });
  // The trunking, running from the back of the unit to the external wall and out. Ugly, white,
  // and on the outside of the plaster in every flat in the country.
  box(WW + .075, 2.284, ACZ - .58, .110, .110, .200, col.white, { hard: true, gloss: G.paint });
  box(WW + .075, 2.284, NW + .18, .110, .110, .560, col.white, { hard: true, gloss: G.paint });
  th('空调', WW + .30, 2.52, ACZ, '北京的夏天没有空调不行。',
    'A Beijing summer without air conditioning is impossible.',
    '空 air + 调 to adjust. 开空调 to switch it on; it is set to 26° forever.',
    { focus: [WW + 1.05, ACZ], reach: 1.9, tag: '客厅空调' });

  // ================================================================ 钟 the wall clock
  //
  // On the west wall, facing the way you come in, so it is the first thing read on entering and
  // reachable from the sofa's eye line. Its hands are re-aimed from the game clock every frame
  // through the shell's dial list; frozen they render as a letter L on the wall, in a game whose
  // entire HUD is a clock.
  const CKZ = .05, CKX = WW + .052, CKY = 2.00, CKYAW = Math.PI / 2;
  cyl(CKX, CKY, CKZ, .190, .075, col.white, { rx: Math.PI / 2, ry: CKYAW, tag: '钟', gloss: .30 });
  cyl(CKX + .043, CKY, CKZ, .162, .022, C('#f2f0e9'), { rx: Math.PI / 2, ry: CKYAW, tag: '钟', mode: 1 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r = .130, long = i % 3 === 0;
    // The face is turned to +x, so a tick's offset around the dial runs in z, not x — and the
    // tick's own roll has to follow the same hand angle the dial list uses.
    box(CKX + .053, CKY + Math.cos(a) * r, CKZ - Math.sin(a) * r,
      .008, long ? .030 : .018, long ? .014 : .009, col.charcoal,
      { tag: '钟', mode: 1, hard: true, ry: CKYAW, rz: -a });
  }
  const hand = (len, w, t, c) =>
    box(CKX + .062, CKY + len / 2, CKZ, w, len, t, c,
      { tag: '钟', mode: 1, hard: true, ry: CKYAW });
  const hands = [
    { p: hand(.058, .012, .010, col.charcoal), per: 720, len: .058, w: .012, t: .010, off: .062 },
    { p: hand(.098, .009, .008, col.charcoal), per: 60,  len: .098, w: .009, t: .008, off: .064 },
    { p: hand(.112, .004, .006, col.red),      per: 1,   len: .112, w: .004, t: .006, off: .066 },
  ];
  if (dialReg) dialReg(CKX, CKY + LIFT, CKZ, CKYAW, hands);
  cyl(CKX + .068, CKY, CKZ, .014, .010, col.charcoal, { rx: Math.PI / 2, ry: CKYAW, tag: '钟', mode: 1 });
  th('钟', CKX + .10, CKY, CKZ, '几点了？我看一下钟。', 'What time is it? Let me check the clock.',
    '钟 zhōng is the clock on the wall; 表 biǎo is the one on your wrist.',
    { focus: [WW + 1.00, CKZ], reach: 1.6 });

  // ================================================================ 日历 the wall calendar
  //
  // The paper kind with a red header, hung on a nail, still turned to a month somebody has been
  // crossing days off. Below the clock on the same wall.
  const CZ = .78, CX = WW + .038;
  box(CX, 1.60, CZ, .030, .580, .400, col.cream, { tag: '日历', hard: true, gloss: G.matte });
  box(CX + .010, 1.815, CZ, .030, .140, .400, col.red, { tag: '日历', hard: true, gloss: .16 });
  glyph(CX + .028, 1.815, CZ, Math.PI / 2, '八月',
    { size: .082, gap: .022, color: C('#f6e9d4'), mode: 1, gloss: G.matte, lift: .004, tag: '日历' });
  // The date grid as four rules and six hairlines rather than thirty-five little squares: at two
  // metres those read identically and this is a thirtieth of the props.
  for (let r = 0; r < 4; r++)
    box(CX + .020, 1.680 - r * .092, CZ, .008, .004, .340, C('#b3aa9c'),
      { tag: '日历', hard: true, mode: 1 });
  for (let c = 0; c < 6; c++)
    box(CX + .020, 1.545, CZ - .170 + (c + 1) * .0486, .008, .380, .004, C('#c4bfb2'),
      { tag: '日历', hard: true, mode: 1 });
  // Today, ringed — and the ring is placed from a date rather than painted on a square, which is
  // the whole of item 133. A 日历 whose number never moves is the one prop in this room that can
  // be proved wrong by looking at it twice.
  //
  // The grid above is four rules and six hairlines, so it is five week bands of seven columns.
  // Both steps are read straight off those loops rather than restated: .092 in y between rules,
  // .0486 in z between hairlines, first column starting at CZ - .170. CAL_FIRST is which weekday
  // the 1st of the printed sheet falls on, 0 = Monday — a sheet-level fact, not a world-calendar
  // one, and the month itself is a baked glyph, so this advances *within* a sheet. Tearing off a
  // month is a different job and belongs to whoever owns the date, not to a room file.
  const CAL_FIRST = 4;
  const calRing = box(CX + .028, 1.542, CZ + .146, .006, .056, .050, C('#c8503c'),
    { tag: '日历', hard: true, mode: 1 });
  const setDate = day => {
    const d = Math.max(1, Math.min(31, Math.round(day) || 1)), i = CAL_FIRST + d - 1;
    if (M && M.trs) calRing.m = mtrs(CX + .028, 1.726 - Math.floor(i / 7) * .092,
      CZ - .170 + (i % 7 + .5) * .0486, 0, .006, .056, .050);
  };
  setDate((A && A.date && A.date.day) || 17);
  // Published so game.js can advance it at each rollover. The room does not know what day it is
  // and must not: it knows how to put a ring round one.
  FlatFit['living'].dateReg = setDate;
  box(CX + .016, 1.902, CZ, .034, .014, .400, C('#cdc4b4'), { tag: '日历', hard: true, gloss: G.matte });
  th('日历', CX + .12, 1.60, CZ, '今天几号？', "What's the date today?",
    '日历 rìlì, a calendar. 号 hào is the day of the month: 八月十七号.',
    { focus: [WW + 1.00, CZ], reach: 1.6 });

  // ================================================================ 地毯 the rug
  //
  // Concentric bands, lit rather than emissive, so it takes the same sun and lamp light as the
  // boards under it instead of reading as a sticker. It runs under the front third of the sofa,
  // which is where a rug in a room this depth actually ends up.
  const RGX = X, RGZ = .10, RGW = 2.90, RGD = 1.90;
  // The bands carry the drape repeat rather than the upholstery's: 2.9 m of rug at the sofa's
  // .34 would be too fine to survive being seen from standing height, and reads as noise. At .48
  // the pile is legible and Fabric081C is homogeneous enough that six repeats across the width do
  // not announce themselves as a grid — which is the failure to watch for on a floor this size.
  // COLOUR, changed 2026-08-08, and it is a composition fix rather than a taste one. The four bands
  // were #7e4039 / #a15b50 / #8e4c45 / #b06a5c — four saturated terracottas over 2.9 x 1.9 m, which
  // is 5.5 square metres of red on the floor of a room whose sofa is jade and whose floor is honey
  // oak. ART.md's line is "selective red/jade/gold accents, never a red room", and a rug that size
  // is not an accent; in the hero frame it was the loudest thing in the flat and it fought the one
  // piece of furniture the room is arranged around.
  //
  // So: an oat wool field, which sits between the floor's honey and the wall's cream and lets the
  // sofa be the only saturated object in the room, with ONE red — FLAT_PALETTE.accent, darkened for
  // a floor — as the border. The same red is at the front door on the 春联 and nowhere else in the
  // flat. Four bands are kept because the geometry and the prop count are unchanged; three of them
  // are now near neighbours, so it reads as a bordered rug rather than as concentric stripes.
  [[0, C('#8f4436')], [.30, C('#c2b294')], [.92, C('#b5a78f')], [1.34, C('#c2b294')]]
    .forEach(([inset, c], i) => // 489: the border red is FLAT_PALETTE.accent, floor-darkened, and it is the only red here.
      flat(RGX, .005 + i * .0035, RGZ, RGW - inset, RGD - inset, c,
        { mode: 7, gloss: G.fabric, ...MAT_RUG }));
  // Fringe on the short ends, which on this rug are the ones facing the walls, not the sofa.
  //
  // ONE STRIP PER END, not twenty-two tufts. The tufts were 44 props for a feature that is 15 mm
  // tall and 55 mm deep: at the distance this room is ever seen from they resolved to a dotted line
  // along the rug edge, which read as speckle rather than as fringe, and the room is looked at from
  // the 走道 four metres away. A single low strip at the same height reads identically and costs
  // two props. 44 -> 2 in the 客厅 alone.
  for (const s of [-1, 1])
    box(RGX + s * (RGW / 2 + .028), .010, RGZ, .055, .015, RGD * .96, C('#c8bda4'),
      { mode: 7, gloss: G.fabric, ...MAT_RUG });
  th('地毯', RGX - .90, .30, RGZ - .60, '地毯是房东留下的。', 'The rug was left behind by the landlord.',
    'Slightly stained already. It adds warmth anyway.', { focus: [RGX - .90, RGZ - .30], reach: 1.3 });

  // ================================================================ 沙发 the sofa
  //
  // Facing the television, with the city behind it. Their old sofa, moved up fourteen floors —
  // the same jade it always was, because this is the same flat given a building around it.
  const SX = X, SZ = -.58;
  for (const s of [-1, 1]) for (const z of [SZ - .32, SZ + .34])
    taper(SX + s * .84, .10, z, .09, .20, .09, col.woodD, { mode: 6, ...MAT_TRIM });
  box(SX, .18, SZ - .04, 2.00, .30, .94, col.jade, { tag: '沙发', mode: 7, ...MAT_FABRIC });
  box(SX, .65, SZ - .39, 1.98, .68, .17, col.jade, { tag: '沙发', mode: 7, ...MAT_FABRIC });
  // Seat and back cushions get a crowned upper pad and a piping seam along the front lip. One
  // slab per cushion is what makes a sofa read as a moulded block.
  //
  // Every one of these carries the weave. Before, the carcass had it and the cushions did not,
  // which is the worst possible split: the cushions are the whole front of the sofa and the only
  // part of it the eye ever lands on, so the sofa read as flat jade paint with a textured plinth
  // hidden behind it. The material is triplanar in *world* space, so a piping capsule and the
  // cushion it runs along sample the same cloth in the same place and the seam stays a seam.
  for (const s of [-1, 1]) {
    box(SX + s * .46, .40, SZ + .03, .90, .23, .80, col.jadeL, { tag: '沙发', mode: 7, ...MAT_FABRIC });
    box(SX + s * .46, .515, SZ + .04, .80, .07, .70, col.jadeL,
      { tag: '沙发', mode: 7, gloss: G.fabric, ...MAT_FABRIC });
    cap(SX + s * .46, .405, SZ + .415, .05, .88, .05, col.jade,
      { rz: Math.PI / 2, tag: '沙发', mode: 7, gloss: G.fabric, ...MAT_FABRIC });
    box(SX + s * .46, .65, SZ - .28, .88, .46, .20, col.jadeL, { tag: '沙发', mode: 7, ...MAT_FABRIC });
    cap(SX + s * .46, .865, SZ - .26, .045, .86, .045, col.jade,
      { rz: Math.PI / 2, tag: '沙发', mode: 7, gloss: G.fabric, ...MAT_FABRIC });
  }
  for (const s of [-1, 1])
    box(SX + s * .97, .43, SZ - .02, .16, .54, .94, col.jade, { tag: '沙发', mode: 7, ...MAT_FABRIC });
  // Throw pillows as squashed spheres with a puffed centre: a thin box cannot read as something
  // soft however the fabric shader treats it.
  for (const [px, pz, ry, c] of [[.59, -.13, -.38, col.gold], [-.61, -.14, .30, C('#b65e42')]])
    for (const [rx2, ry2, rz2] of [[.155, .145, .075], [.130, .120, .098]])
      ball(SX + px, .69, SZ + pz, rx2, ry2, rz2, c,
        { ry, rx: .28, mode: 7, gloss: G.fabric, tag: '沙发', ...MAT_FABRIC });
  // 沙发巾 — the cloth thrown over the back and down one arm, which is on half the sofas in the
  // country and is also the one thing here that says which end of it gets sat on. A woven cotton
  // throw, so it gets the coarser drape repeat rather than the upholstery's tight weave.
  box(SX + .30, .995, SZ - .30, 1.30, .045, .21, C('#b5a78f'),
    { tag: '沙发', mode: 7, gloss: G.fabric, ...MAT_DRAPE });
  box(SX + .97, .725, SZ - .04, .20, .075, .56, C('#b5a78f'),
    { tag: '沙发', mode: 7, gloss: G.fabric, ...MAT_DRAPE });
  box(SX + 1.065, .545, SZ - .04, .030, .30, .52, C('#b5a78f'),
    { tag: '沙发', mode: 7, gloss: G.fabric, rz: -.05, ...MAT_DRAPE });
  box(SX + .68, .585, SZ + .05, .42, .055, .60, C('#aba08f'),
    { tag: '沙发', mode: 7, gloss: G.fabric, ry: -.06, ...MAT_DRAPE });
  sha(SX, SZ - .02, 2.32, 1.22, .43);
  stop(SX - 1.06, SX + 1.06, SZ - .52, SZ + .44);
  th('沙发', SX, 1.02, SZ + .40, '坐在沙发上看电视。', 'Sit on the sofa and watch TV.',
    'Guests are received here. That is what the tea on the table is for.',
    { focus: [SX, SZ + .95], reach: 1.6 });

  // ================================================================ 茶几 the tea table
  //
  // A Chinese living room is where guests are received, and the tea things on this table are what
  // says so: 茶盘 tray, 紫砂壶 pot, four small cups and a 公道杯 to pour them level, a caddy of
  // leaves, a cloth to wipe the tray, a dish of 瓜子 to be pressed on whoever sits down. Nobody
  // sets this out for themselves. It is set out because somebody might come.
  const TX = X, TTZ = .42, TOP = .4275;
  box(TX, TOP - .0375, TTZ, 1.30, .075, .68, col.woodL, { tag: '茶几', mode: 6, ...MAT_WOOD });
  box(TX, .175, TTZ, 1.08, .045, .50, col.woodM, { tag: '茶几', mode: 6, ...MAT_WOOD });
  for (const [ox, oz] of [[-.55, -.26], [.55, -.26], [-.55, .26], [.55, .26]])
    taper(TX + ox, .19, TTZ + oz, .070, .38, .070, col.woodD, { tag: '茶几', mode: 6, ...MAT_TRIM });

  // ---- 茶盘 the tray. Slatted, because the whole ritual involves pouring the first wash of water
  // straight over the pot and letting it drain away underneath.
  const TRX = TX - .23, TRZ = TTZ - .02;
  box(TRX, TOP + .015, TRZ, .50, .030, .34, C('#4b3628'),
    { tag: '客厅茶', hard: true, gloss: .34, ...MAT_TRIM });
  for (const [dx, dz, sx, sz2] of [[0, -.165, .50, .020], [0, .165, .50, .020],
                                   [-.245, 0, .020, .34], [.245, 0, .020, .34]])
    box(TRX + dx, TOP + .039, TRZ + dz, sx, .018, sz2, C('#5a4433'),
      { tag: '客厅茶', hard: true, gloss: .34, ...MAT_TRIM });
  for (let i = 0; i < 5; i++)
    box(TRX, TOP + .033, TRZ - .12 + i * .06, .46, .010, .026, C('#655648'),
      { tag: '客厅茶', hard: true, gloss: .30, ...MAT_TRIM });

  // ---- 茶壶 the pot. Small, unglazed, the colour of the clay it is thrown from.
  const PX = TRX - .11, PY = TOP + .100, PZ2 = TRZ - .04;
  ball(PX, PY, PZ2, .082, .058, .082, col.clay, { tag: '客厅茶', gloss: .30 });
  cyl(PX, PY + .050, PZ2, .046, .014, col.clayL, { tag: '客厅茶', gloss: .30 });
  ball(PX, PY + .066, PZ2, .017, .014, .017, col.clayL, { tag: '客厅茶', gloss: .34 });
  cap(PX - .088, PY + .020, PZ2 - .028, .017, .095, .017, col.clay,
    { rz: -.85, ry: .45, tag: '客厅茶', gloss: .30 });
  for (const [dy, dz2, rz2] of [[.030, .080, .55], [.055, .100, .05], [.026, .082, -.60]])
    cap(PX + .078, PY + dy, PZ2 + dz2 - .058, .015, .052, .015, col.clay,
      { rz: rz2, ry: -1.1, tag: '客厅茶', gloss: .30 });

  // ---- 公道杯 and the cups. Four, because four is what a tray holds and how many people fit on
  // that sofa.
  taper(TRX + .16, TOP + .078, TRZ - .10, .052, .066, .052, C('#e8f1f6'),
    { tag: '客厅茶', alpha: .55, gloss: .70 });
  for (let i = 0; i < 4; i++) {
    const cx2 = TRX - .16 + i * .105, cz2 = TRZ + .098;
    cyl(cx2, TOP + .060, cz2, .026, .030, C('#f2f0e9'), { tag: '客厅茶', gloss: .46 });
    if (i < 2) cyl(cx2, TOP + .072, cz2, .021, .005, C('#b3873c'), { tag: '客厅茶', mode: 1, gloss: .60 });
  }
  // 茶巾 the tea cloth, folded on the corner of the tray where it lives.
  box(TX + .10, TOP + .012, TTZ + .21, .14, .016, .10, C('#aba08f'),
    { tag: '客厅茶', mode: 7, gloss: G.fabric, ry: .28 });
  // 茶叶罐 the caddy.
  cyl(TX + .40, TOP + .058, TTZ - .13, .052, .116, C('#3f5b4e'), { tag: '客厅茶', gloss: .30 });
  cyl(TX + .40, TOP + .124, TTZ - .13, .054, .016, col.gold, { tag: '客厅茶', gloss: .44 });
  box(TX + .40, TOP + .062, TTZ - .183, .050, .052, .008, C('#e3d8c3'), { tag: '客厅茶', hard: true });
  th('茶', PX, TOP + .30, PZ2 - .16, '来，喝杯茶。', 'Come in — have a cup of tea.',
    '倒茶 dào chá to pour it. Filling a guest\'s cup before your own is the whole etiquette.',
    { focus: [PX, TTZ - .55], reach: 1.4 });

  // ---- 瓜子 the dish of melon seeds set out for whoever comes, and the two remotes that live on
  // this table because there is nowhere else for them.
  cyl(TX + .44, TOP + .015, TTZ + .19, .082, .030, C('#ceccc2'), { tag: '茶几', gloss: .36 });
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399, r = .046 * Math.sqrt((i + .5) / 11);
    ball(TX + .44 + Math.cos(a) * r, TOP + .034, TTZ + .19 + Math.sin(a) * r,
      .012, .006, .008, C(i % 3 ? '#5c4a34' : '#6d5940'), { tag: '茶几', ry: a, gloss: .20 });
  }
  for (const [rx3, rz3, ry3, c] of [[-.52, .20, .42, col.charcoal], [-.50, .05, .30, C('#cbc4b7')]]) {
    box(TX + rx3, TOP + .012, TTZ + rz3, .055, .020, .175, c,
      { ry: ry3, tag: '遥控器', hard: true, gloss: .30 });
    box(TX + rx3, TOP + .023, TTZ + rz3, .040, .004, .150,
      c === col.charcoal ? C('#3d444b') : C('#c4bfb2'), { ry: ry3, tag: '遥控器', hard: true });
  }
  box(TX - .555, TOP + .026, TTZ + .265, .014, .004, .014, C('#a53326'),
    { ry: .42, tag: '遥控器', hard: true, mode: 1 });
  th('遥控器', TX - .52, TOP + .22, TTZ + .20, '遥控器在茶几上。', 'The remote is on the tea table.',
    '遥 distant + 控 control + 器 device. One is the television\'s, one the air conditioner\'s.',
    { focus: [TX - .52, TTZ + .72], reach: 1.3 });
  // ---- 茶壶 and 茶杯. The pot and the cups were already modelled on the tray above and both were
  // tagged 茶, which is the leaf. A jar of leaves is the ingredient; the pot and the four small
  // cups are the service, and APARTMENT.md:129's "tea things on the table" means the service.
  // One headword, not two: 茶杯 has no js/vocab.js row and 茶壶 does, and adding a thing the
  // dictionary cannot gloss buys a label that teaches nothing. The cups are covered in the note.
  th('茶壶', TRX + .04, TOP + .26, TRZ - .04, '茶壶里的茶还是热的。', 'The tea in the pot is still hot.',
    '茶壶 cháhú — 壶 is the pot, 杯 the cup. This one is 紫砂, unglazed purple clay, which is ' +
    'what a serious pot is made of and why it is never washed with soap. The four small cups ' +
    'beside it hold two mouthfuls each: you refill a guest\'s often, and theirs before your own.',
    { focus: [TX - .10, TTZ - .82], reach: 1.5 });
  sha(TX, TTZ, 1.58, .96, .33);
  stop(TX - .68, TX + .68, TTZ - .38, TTZ + .38);
  // 402 — 台灯 on the far corner of the tea table, and it owns a real light. This room had three
  // light calls against 老李家's ten, and the two that existed were both overhead: a 3.20 m ceiling
  // drum and a floor lamp in the window corner, so everything between the sofa and the console was
  // lit from above and read flat. A lamp at .55 m is the only fitting in here at sitting height.
  //
  // Drum shade built as a `cyl`, not a `taper` — a taper's direction is a guess from the call site
  // and a cone the wrong way up is a funnel. The saucer at TX + .44 / TTZ + .19 is 0.41 m away and
  // the remote at TX - .52 is on the other end; measured against both, not placed by eye.
  const TLX = TX + .50, TLZ = TTZ - .21;
  cyl(TLX, TOP + .012, TLZ, .058, .024, col.woodD, { mode: 6, ...MAT_TRIM });
  cyl(TLX, TOP + .120, TLZ, .009, .200, col.woodD, { mode: 6, ...MAT_TRIM });
  cyl(TLX, TOP + .295, TLZ, .086, .150, C('#efe0c4'), { mode: 1, glow: .12, gloss: G.matte });
  light(TLX, TOP + .30, TLZ, C('#ffd9a4'), .34, 1.90);
  th('茶几', TX, .70, TTZ - .40, '茶几上有一杯茶。', 'There is a cup of tea on the tea table.',
    '茶 tea + 几 small table. It is a tea table before it is a coffee table.',
    { focus: [TX, TTZ - .82], reach: 1.4 });

  // ---- 热水壶 the thermos on the floor beside it, because the tea needs topping up and the
  // kettle is in the kitchen. Every flat in the country has one of these standing about.
  const FX = TX + .92, FZ = TTZ + .18;
  cyl(FX, .150, FZ, .092, .300, C('#bcb8ac'), { tag: '热水壶', gloss: .30, ...MAT_METAL });
  cyl(FX, .308, FZ, .074, .028, C('#b23a2b'), { tag: '热水壶', gloss: .26 });
  cyl(FX, .330, FZ, .046, .022, C('#b23a2b'), { tag: '热水壶', gloss: .26 });
  cap(FX + .098, .225, FZ, .020, .130, .020, C('#8d8579'),
    { rz: .18, tag: '热水壶', gloss: .34, ...MAT_METAL });
  box(FX, .200, FZ - .092, .090, .120, .010, C('#c2492f'), { tag: '热水壶', hard: true, mode: 1 });
  sha(FX, FZ, .28, .28, .30);
  th('热水壶', FX, .48, FZ - .10, '热水壶里还有热水。', 'There is still hot water in the thermos.',
    '开水 kāishuǐ is boiled water. Nobody here drinks it cold.',
    { focus: [FX + .55, FZ], reach: 1.3 });

  // ================================================================ 拖鞋 the slippers
  //
  // Kicked off at the end of the sofa rather than lined up: shoes come off at the 玄关, and these
  // are the indoor pair, which live wherever they were last stepped out of.
  // ---- grounding. These were the one thing in the room standing at the wrong height, and both
  // ways at once. The sole sat at y +6 mm, but both slippers stand on the rug, whose bands reach
  // +12 mm and +15.5 mm where they fall — so the slippers were buried to a third of their depth in
  // pile. And they were the only floor-standing object here with no contact shadow at all, which
  // ART.md calls the loudest unfinished signal there is.
  //
  // `A.shade` lays its quad at the deck +20 mm, deliberately above any rug layer so a shadow falls
  // *onto* the rug rather than being swallowed by it (js/build.js). A sole at +6 mm is under that
  // quad, so simply adding the shadow would have drawn a dark band across the slipper. SLY lifts
  // the whole slipper 15 mm, which puts the sole at +21 mm: 1 mm clear of its own shadow quad and
  // above the highest rug band it stands on. The quad then fills the few millimetres beneath, which
  // is exactly how the sofa's feet and the table's legs are grounded here already.
  const SLY = .015;
  for (const [sx, sz, ry] of [[SX + .74, SZ + .62, .34], [SX + .90, SZ + .70, -.18]]) {
    box(sx, SLY + .020, sz, .105, .028, .268, C('#44586f'),
      { tag: '拖鞋', ry, gloss: .16, mode: 7, ...MAT_FABRIC });
    box(sx, SLY + .038, sz + .026, .092, .014, .200, C('#8c9aa8'),
      { tag: '拖鞋', ry, gloss: .14, mode: 7, ...MAT_FABRIC });
    ball(sx, SLY + .052, sz - .082, .054, .040, .058, C('#5b6b7c'),
      { tag: '拖鞋', ry, gloss: .16, mode: 7, ...MAT_FABRIC });
    cap(sx, SLY + .062, sz - .050, .050, .088, .022, C('#5b6b7c'),
      { ry, rz: Math.PI / 2, tag: '拖鞋', gloss: .16, mode: 7, ...MAT_FABRIC });
    sha(sx, sz - .02, .21, .35, .30);
  }
  th('拖鞋', SX + .82, .28, SZ + .78, '进屋要换拖鞋。', 'You change into slippers indoors.',
    '拖鞋 tuōxié. Leaving your street shoes on is the one thing a guest must not do.',
    { focus: [SX + .82, SZ + 1.25], reach: 1.3 });

  // ================================================================ light
  //
  // A 吸顶灯 flush on the ceiling, which is what a room of this height gets instead of a pendant,
  // and a floor lamp in the window corner for the evening. The disc is a shallow drum rather than
  // a plate: a genuinely thin cylinder overhead reads as a seam of z-fighting from underneath.
  const CLX = X, CLZ = .30;
  cyl(CLX, 2.545, CLZ, .300, .100, col.cream, { gloss: .22 });
  cyl(CLX, 2.482, CLZ, .272, .026, C('#fff3d8'), { mode: 1, glow: .30 });
  cyl(CLX, 2.598, CLZ, .090, .020, col.white, { gloss: .20 });
  // Wet weather outside is a darker room, so the 吸顶灯 works harder. This is the flat noticing
  // the rain for the cost of two multiplications and not one extra prop.
  light(CLX, 2.40, CLZ, C('#ffe9c2'), 1.00 + wxWet * .22, 3.20 + wxWet * .30);
  if (glowFn) glowFn(mtrs(CLX, .02, CLZ, 0, 2.30, 1, 2.00), C('#ffe4b8'), .09);

  // 落地灯 — the floor lamp. It was already built and it was anonymous: the room's brief calls it
  // "a floor lamp in the window corner for the evening" and nothing in the file said 落地灯 or let
  // the player point at it. A 吸顶灯 on its own gives a room one hard source directly overhead and
  // no warm pool anywhere, which is exactly what an evening in here looked like.
  // MOVED 2026-08-08, into the corner the brief above already said it was in. It was at
  // (-0.78, -0.52): 0.62 m off the west wall, 1.08 m off the window wall, standing in open floor —
  // and its 0.35 m base landed 30 mm inside the rug's west edge at x -0.75. Half on a rug and half
  // off it is the single clearest case of "coincidence reads as mess": nobody puts a floor lamp
  // three centimetres onto a rug, and at orbit distance that overlap is what the eye reads first.
  //
  // Now at (-1.05, -1.05), which is the corner: 0.35 m off the west wall, 0.26 m clear of the
  // curtain plane at Z_CURT -1.31, beside the sofa's west arm (outer face x -0.35) and DELIBERATELY
  // 0.125 m clear of the rug rather than nearly on it. It carries no collider — `shade` is a
  // contact shadow — so .flatcheck.js cannot move on this.
  const LMX = WW + .35, LMZ = -1.05;
  cyl(LMX, .022, LMZ, .175, .044, col.charcoal, { tag: '客厅灯', gloss: .40, ...MAT_METAL });
  // cyl, not cap. A capsule's hemispheres are a quarter of its height each and scale with sy
  // (js/gl.js:1466), so a 1.40 m "pole" built as a capsule is a lozenge with 0.35 m ends. A pole
  // is a cylinder; cyl takes a RADIUS where cap takes a full width, hence .010 against .020.
  cyl(LMX, .74, LMZ, .010, 1.40, col.steel, { tag: '客厅灯', gloss: G.metal, ...MAT_METAL });
  taper(LMX, 1.53, LMZ, .300, .300, .300, C('#e3d8c3'), { tag: '客厅灯', gloss: .18, alpha: .96 });
  cyl(LMX, 1.395, LMZ, .118, .018, C('#ffeecd'), { tag: '客厅灯', mode: 1, glow: .26 });
  const floorLamp = light(LMX, 1.45, LMZ, C('#ffd9a4'), .55, 2.10);
  if (glowFn) glowFn(mtrs(LMX, .02, LMZ, 0, 1.30, 1, 1.30), C('#ffd9a4'), .10);
  sha(LMX, LMZ, .42, .42, .34);
  // 开灯 already exists as a verb in js/data.js and every other furnished room has a 灯 to use it
  // on — 餐厅, 卫生间, 厨房 all do. The largest room in the flat did not, so the one verb that
  // belongs in a living room at nine in the evening could not be performed in it. The headword
  // goes on the floor lamp rather than the ceiling disc because the lamp is the one you reach.
  //
  // The focus is pulled a metre east of the lamp on purpose: WW is the west wall at -1.40 and
  // clampMove keeps a 0.30 body off it, so a focus on the lamp itself would sit inside the wall's
  // own exclusion and the card would be unreachable from anywhere the body can stand.
  th('灯', LMX + .10, 1.72, LMZ, '天黑了，开灯吧。', 'It is getting dark — put the light on.',
    '开灯 kāi dēng to switch on, 关灯 guān dēng to switch off. 落地灯 luòdìdēng is this one, ' +
    'standing on the floor; 吸顶灯 is the flush disc overhead.',
    { focus: [LMX + .70, LMZ + .55], reach: 1.6, tag: '客厅灯' });
  FlatFit['living'].lamp = floorLamp;

  // ================================================================ the corner plant
  //
  // Blades on their own bearings rather than one shrub, fanned by the golden angle: evenly spaced
  // turns lay them out in visible pairs and the clump stops reading as growth.
  const GX = WW + .34, GZ = 1.06;
  taper(GX, .150, GZ, .270, .300, .270, C('#a86a48'), { gloss: .22 });
  cyl(GX, .296, GZ, .118, .022, C('#3a2f28'), { gloss: G.matte });
  for (let i = 0; i < 13; i++) {
    const a = i * 2.399, len = .38 + (i % 4) * .16;
    cap(GX + Math.cos(a) * .050, .300 + len * .46, GZ + Math.sin(a) * .050,
      .052, len, .016, C(i % 3 ? '#4b7d43' : '#3d6b3c'),
      { ry: a, rz: Math.cos(a) * .40, rx: Math.sin(a) * .34, gloss: .24, mode: 7 });
  }
  sha(GX, GZ, .58, .58, .34);

  return { WIN: LIVING_WIN, tvGlow };
};

// The opening, reachable without building the room. js/world.js may read this at any time —
// `FlatFit['living'].WIN` — and assign or copy it into the `WIN` the module exports.
FlatFit['living'].WIN = LIVING_WIN;
