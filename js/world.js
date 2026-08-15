// The apartment: cohesive rounded low-poly geometry, colliders, shadows, and vocab objects.

// The rooms of the flat, and the parts of the building around it, each declared by its own file.
//
// This exists for the same reason `MallFit` does in js/mall.js: the flat is being taken from one
// room to a lobby, a lift, a corridor and ten rooms, and ten authors editing one 1,600-line file
// is ten chances to break the place the player wakes up in. A room registers a builder here, in
// its own `js/home-<room>.js`, and this file calls whatever has registered.
//
// A builder is handed `A`, a toolkit in the flat's own world coordinates — the same (x, z, y)
// the rest of world.js uses, NOT a per-room local frame, because these rooms share walls and a
// door in one is a door out of another. The coordinate contract is written down in APARTMENT.md
// and is fixed: build to it rather than measuring off a neighbour, because the neighbour is being
// written at the same time as you.
//
// Three things in here are load-bearing and are named in that document: `WIN` is the window the
// renderer shafts daylight through and belongs to the 客厅; `rail` is the clothes rail the outfit
// system indexes into and belongs to the 主卧; and RX/RZ/H feed `R.setRoom`. A room that quietly
// stops providing one of those does not break itself, it breaks the game.
//
// ---------------------------------------------------------------- the A toolkit
//
// **Y IS WORLD Y.** There is no per-room origin and no per-room floor: the lobby's floor is
// y 0 and your floor is y `A.y0` (3.10). A table top in the 客厅 is `A.y0 + .74`, not `.74`.
// This is the one thing that is easy to get wrong and impossible to miss once you look: a
// room written in floor-relative y builds itself three metres down, inside the lobby ceiling.
// `A.y0` is the deck of the room being built — 0 while the lobby builds, 3.10 for everything
// else — so `A.y0 + h` is always right, in every file, including this one.
//
//   A.box(x,y,z, w,h,d, colour, opt)        centre-anchored, rounded unless opt.hard
//   A.cyl(x,y,z, r,h, colour, opt)          centre-anchored
//   A.ball(x,y,z, rx,ry,rz, colour, opt)    radii, not diameters
//   A.cap(x,y,z, sx,sy,sz, colour, opt)     a capsule; sx/sz are radii, sy the full length
//   A.taper(x,y,z, sx,sy,sz, colour, opt)   a frustum: sx/sz the bottom, sy the height
//   A.wall(x,y,z, w,h, yaw, colour, opt)    an upright quad, y is its CENTRE, faces +z at yaw 0
//   A.flat(x,y,z, w,d, colour, opt)         a horizontal quad facing +y (a floor, a shelf top)
//   A.glyph(x,y,z, yaw, text, opt)          writing on a face; opt.size, .gap, .color, .glow
//   A.stop(x0,x1,z0,z1 [,deck])             a collider on this room's deck. Returns the record,
//                                           so a door can set `.open = true` to let the body by
//   A.shade(x,z,w,d,a [,y])                 the contact shadow under a thing; y defaults to the
//                                           deck floor, so pass only x/z sizes in a normal room
//   A.th(hz,x,y,z, zh,en,note, opt)         an interactable. opt: {focus:[x,z], reach, tag}
//   A.light(x,y,z, [r,g,b], power, radius)  a real light. Returns it; set `.on = false` to douse
//   A.col   the palette          A.G   the gloss table         A.DECK  [0, 0, 3.10]
//   A.y0    this room's deck y   A.MAT the surface presets     A.C, A.M  colour and matrix
//   A.ceiling(x,y,z, w,d, colour, opt)      a quad turned face down
//   A.flatText(x,y,z, yaw, text, opt)       writing laid on an upward face, not stood up
//
// And the plan, which is one place and not a comment to copy off. Read these rather than typing
// the number, because two of them have already moved once:
//
//   A.LOBBY  A.CORR  A.FLAT       {x0, x1, z0, z1, h} — the three rooms of the building
//   A.LIFT   A.LIFT_B             {x0, x1, z0, z1} — the two shafts
//   A.frontDoor                   {x, x0, x1, z, w, top} — your own door, in world y
//   A.CAR                         the lift car: {x, z, w, d, h, door, leaf, y0,
//                                 floor, side, front, back}. Inside is x ± side,
//                                 z front..back, standing on y0 + floor.
//
// And the fixtures that move or are looked up by name elsewhere in the game:
//
//   A.mover(name, props, mat)     a hinge or a slide. game.js drives it by name with setPart
//   A.emitter(name, props, dim)   a screen or a burner, dark at 0 and lit at 1
//   A.fader(name, props, max)     running water, lather: not there until it is
//   A.steam(name, [x,y,z], n, spread, rise)
//   A.dial(x,y,z, yaw, hands)     a clock face; setClockHands aims it off the game clock
//   A.glow(m, colour, a, sun)     a soft pool of light on a surface. A.rug(x,z,w,d,bands)
//   A.setWin(x,y,z,hw,hh)         the 客厅 declares the window the daylight shaft comes through
//   A.rail                        the 主卧 pushes {hex, color, props} onto the clothes rail
//   A.lamp(shade, bulb, colour)   the ceiling pendant setLamp dims
//   A.tv(prop)                    the pool of light the screen throws — World.tvGlow
//   A.bagSpot(hz, py, en, x,y,z)  a surface the takeaway bag can be set down on, in mover order
//   A.sky(prop)                   a pane that takes the colour of the sky outside
//   A.city(layer, prop)           0 far skyline, 1 near skyline, 2 lit windows
//   A.rides(prop|props)           this travels with the lift car. A.CAR describes the car
//
// Materials: `matAmt` about .30 and never over .40, `nrmAmt` about 0.3 and never the default 1
// — see the note in the shell below, which is where those two numbers were got wrong first.
// ---- 459. One numeral table, shared. The landing indicator over the doors and the row in the
// car panel are two renderings of the same fact, and TOWER-STATE.md records the wave where they
// disagreed: all ten new floors were labelled the second floor because buildShafts held its own
// copy of the rule. Top level in this file, so js/game.js can assert HOME_FLOORS against it
// rather than restate it. Deck 0 is floor 1; deck N is floor N.
const FLOOR_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const floorLabel = deck => FLOOR_NUM[deck === 0 ? 1 : deck] || String(deck);
// ---- 469. The ride is the longest continuous camera motion in the game and the stylesheet
// already honours the OS preference (index.html:1336); the car did not.
const prefersReducedMotion = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
};
const FlatFit = {};

const World = Lazy('World', () => {
  // Every dial in the flat — the one on the wall, the one by the bed — re-aimed each frame from
  // the game clock. A dial records where its hands hang, which way its face is turned, and one
  // entry per hand; `setClockHands` is the only thing that reads it.
  const dials = [];
  // Fixtures that move. Each one records the rest transform of its props once, then rebuilds
  // them from a single 0..1 value, so the game loop only has to say "the fridge is 0.6 open".
  const parts = {}, emits = {}, fades = {}, steam = {};
  // The ceiling pendant, whose 灯 text has always said it flickers. Held here so `setLamp` can dim
  // the fitting itself; the room's light is a separate matter — see `lampFlicker`.
  const lamp = { shade: null, bulb: null, bulbC: C('#fff0cd') };
  // The 灯 fixture itself, so its sentence can follow the fault rather than being frozen at the
  // day the flat was built. `lampSaid` is the state it was last written for, so the per-frame
  // caller below does three string writes when it changes and none when it does not.
  let lampThing = null, lampSaid = null;
  const rail = [];              // the shirts hanging in the wardrobe, swapped as you change
  let tvGlow = null;            // the pool of light the screen throws into the room
  let bagThing = null;          // the 袋子 you carry in, and its label
  let bagSpots = [];            // the surfaces it can be set down on, in mover order
  const piv = (x, y, z, R) => M.mul(M.trans(x, y, z), M.mul(R, M.trans(-x, -y, -z)));
  const hingeY = (x, z, a) => piv(x, 0, z, M.rotY(a));

  // `mat(v, i)` may vary per item, which is what lets a bunched curtain spread across a
  // window instead of sliding along it as one lump.
  function mover(name, items, mat) {
    const moving = items.filter(Boolean);
    // Build seals ordinary prop centres into static packed cull arrays. A hinge or slide changes
    // both the matrix and that centre, so registering the fixture is also the authoritative moment
    // to opt every piece into Build's small dynamic-cull table. Without it a refrigerator door,
    // curtain or sash could move a metre while frustum tests kept asking where it was when shut.
    for (const p of moving) p.dynamic = true;
    parts[name] = { v: -1, mat,
      items: moving.map(p => ({ p, m0: p.m, ob: p.ob && { ...p.ob } })) };
  }
  // Screens and burners: dark and inert at 0, lit at 1.
  function emitter(name, items, dim = .26) {
    emits[name] = { v: -1, dim, items: items.filter(Boolean).map(p => ({ p, c: p.color, glow: p.glow || 0 })) };
  }
  // Things that are simply not there until they are: running water, a bar of soap lather.
  function fader(name, items, max = 1) {
    for (const p of items) p.alpha = 0;
    fades[name] = { v: -1, max, items: items.filter(Boolean) };
  }
  // A rising, spreading, fading plume. Registered per source: the pot and the shower.
  function steamRig(name, at, n = 5, spread = .055, rise = .50) {
    const props = [];
    for (let i = 0; i < n; i++)
      props.push(ball(at[0], at[1] + .2, at[2], .07, .07, .07, C('#eef3f6'), { mode:1, alpha:0 }));
    steam[name] = { at, props, spread, rise };
  }

  const col = {
    floor: C('#8b653f'), wall: C('#d4c9b5'), ceil: C('#f1ede4'), trim: C('#5a4433'),
    woodD: C('#4b3628'), woodM: C('#76583e'), woodL: C('#a7835b'),
    cream: C('#e8dfcf'), white: C('#f2f0e9'), linen: C('#d7cbb9'),
    charcoal: C('#2c3239'), black: C('#171a1f'), steel: C('#aeb5bb'), grey: C('#838b93'),
    jade: C('#3f7564'), jadeL: C('#69a08a'), red: C('#a43c2c'), redD: C('#793025'),
    gold: C('#d19a32'), sky: C('#c4dbea'), plant: C('#4b7d43'), plantD: C('#315d32'),
    terra: C('#a65e3e'), blue: C('#345d78'), navy: C('#29384d'),
    tileF: C('#ddd7cc'), tileW: C('#e9e3d7'), tile: C('#f1ece1'), grout: C('#b3aa9c'),
    porcelain: C('#f8f6f0'), glass: C('#d3e2e2'), teal: C('#5f8f92'), tealL: C('#7faaad'),
  };
  const G = { matte: .05, wood: .20, paint: .14, fabric: .03, metal: .62, glass: .85, screen: .50 };
  const woodColors = new Set([col.trim, col.woodD, col.woodM, col.woodL]);

  const B = Build.scene({ wood: woodColors, fabricGloss: G.fabric });
  const { props, things, solids, shadows, glows,
          box, cyl, ball, capsule, taper, wall, flat,
          solid, shade, rug, glow, thing } = B;
  const skyGlass = [];      // panes that should take the colour of the sky outside

  // Characters lying flat on an upward face — a phone on a desk, a calendar's date block if it ever
  // hangs face-up. `B.glyphs` stands its quads up to face into a room, which is right for a wall and
  // wrong here, so this lets it lay out the string and then rewrites each quad's transform without
  // the stand-up: the glyph mesh is already a quad in the xz plane facing +y, so translate · yaw ·
  // scale is the whole matrix. The atlas cell puts the top of the character at the quad's -z edge,
  // which means flat text reads correctly to somebody standing on the +z side of it — the side of
  // the desk the chair is on. Safe to call before `finish`, which is what measures these props.
  function flatText(x, y, z, yaw, text, o) {
    const out = B.glyphs(x, y, z, yaw, text, o);
    const size = o.size, gap = o.gap === undefined ? size * .14 : o.gap;
    const step = size + gap, span = out.length * step - gap;
    out.forEach((p, i) => {
      const t = -span / 2 + step * (i + .5);
      p.m = M.mul(M.trans(x, y, z),
        M.mul(M.rotY(yaw), M.mul(M.trans(t, 0, 0), M.scale(size, 1, size))));
    });
    return out;
  }

  // ================================================================ the building
  //
  // The building is twelve floors. See TOWER.md for the contract every floor builder reads.
  //
  // This was `[0, 0, 3.10]` — two decks, and a two-deck assumption baked through the whole file.
  // Generalising it is Wave 0 of TOWER.md and had to land before any floor above the second could
  // be built at all: a builder writing deck 6 into a two-deck machine is silently dropped onto
  // deck 2, on top of the flat, and cannot tell.
  //
  // Deck 0 is F1 at ground. Deck 1 is deliberately unused — the lift is the ride between floors,
  // not a place you stand — and the index is kept so `deckY(2)` still means "the second floor" in
  // save files and in conversation, which is what the existing flat and every save depend on.
  // Decks 2..12 are F2..F12 at (n - 1) × STOREY.
  const STOREY = 3.10;
  const FLOORS = 12;
  const DECK = [];
  for (let n = 0; n <= FLOORS; n++) DECK[n] = n === 0 ? 0 : (n - 1) * STOREY;
  // APARTMENT.md gives the lobby H 3.40 and your floor a deck at 3.10, and those two numbers
  // cannot both be true of the same footprint: the flat stands directly over the lobby, so a
  // lobby ceiling at 3.40 is thirty centimetres *inside* the flat's floor slab. It is not a
  // near miss either — every surface in this renderer is one-sided, so the flat's floor is
  // invisible from underneath and the first shot of the lobby had the wardrobes and the kitchen
  // units of the flat hanging in the air over the entrance, drawn in front of a ceiling farther
  // away than they were.
  //
  // 3.40 is the storey, 3.02 is the room: floor to slab soffit, with the slab above it. That is
  // an ordinary lobby height and it is the number `ZONE[0].ceil` was already clamping the camera
  // to. Every height in the lobby is written off `LOBBY.h` rather than off 3.40, here and in
  // js/home-lobby.js, so this is the only place it is stated. If the design would rather keep the
  // 3.40, the fix is at the other end — raise DECK[2] to about 3.55 — and every room file already
  // builds off `A.y0` and would follow it without an edit.
  // The back of the building has moved twice, and this is the second time. 5.3 gave the upstairs
  // corridor a 0.80 m walkway in front of the lift shafts, which sounds like a corridor and is not
  // one: `clampMove` spends 0.30 of it on the body radius at each side, so what you could actually
  // stand in was 0.14 m — measured across the whole run, not deduced. You threaded it sideways or
  // you stuck. At 6.2 the walkway is 1.70 m and the standing room is 0.91, which is a landing you
  // walk down without thinking about it. The flat is untouched; the building got deeper at the
  // back, where there is nothing but lift shafts.
  const LOBBY = { x0: -6.0, x1: 6.0, z0: -5.0, z1: 6.2, h: DECK[2] - .08 };
  const CORR  = { x0: -6.0, x1: 6.0, z0:  3.2, z1: 6.2, h: 2.60 };
  const FLAT  = { x0: -6.0, x1: 6.0, z0: -5.0, z1: 3.2, h: 2.60 };
  // The working shaft, and a second set of doors beside it — a tower this size has two lifts and
  // one of them is always somewhere else, which is half of what a Chinese lift lobby is for.
  //
  // These have moved twice, for the same reason both times, and the arithmetic is worth keeping
  // because it is the only thing that says whether a corridor is a corridor.
  //
  //   at z0 3.6  the flat's wall pushed the body to z > 3.59 and the piers to z < 3.25. No z
  //              satisfies both: the landing was sealed for the whole of x -0.5 .. 3.5 and you
  //              could not reach your own front door from the lift.
  //   at z0 4.0  0.71 m of walkway, 0.11 m of standing room. Passable in the sense that a value
  //              exists, which is not the sense that matters — measured across the run, most of
  //              it was a 0.14 m slot you had to thread.
  //   at z0 4.9  1.70 m of walkway, 0.91 m of standing room, and the shafts still end flush with
  //              the back wall at 6.2 so nothing bulges through it.
  const LIFT   = { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LIFT_B = { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const CARW = 1.80, CARD = 1.30, CARH = 2.24;
  const CARX = (LIFT.x0 + LIFT.x1) / 2, CARZ = (LIFT.z0 + LIFT.z1) / 2;
  const CARFY = .018;                     // the car floor's TOP, off CAR.y — flush with the stone
  // The opening in a landing and in the car, and how far a leaf slides to clear it.
  //
  // 0.80, not 1.00. The car's inside faces stand at CARX ± 0.865 and a centre-opening pair has to
  // park inside them: a leaf of DOORW/2 travelling DOORW/2 ends with its outer edge at
  // CARX - DOORW, so anything over 0.865 slides straight through the car's own side wall — which
  // is what a 1.00 door did, by 21 cm. At 0.80 the parked leaf stops at CARX - 0.80 = 1.70, three
  // centimetres clear of the wall at 1.67, and the landing's 0.60 jamb hides it completely.
  const DOORW = 0.80, DOORH = 2.10, LEAF_T = DOORW / 2;
  // The decks the shaft serves. Deck 1 is skipped — the lift is the ride between floors, not a
  // place you stand — so this is 0 and 2..FLOORS, which is F1 and F2..F12.
  const SHAFT_DECKS = [0];
  for (let n = 2; n <= FLOORS; n++) SHAFT_DECKS.push(n);
  // The fire stair serves exactly what the shaft serves, and is declared here rather than beside
  // `buildStair` because `buildShell` calls that builder some four hundred lines before the
  // builder is written: a `const` down there is in its temporal dead zone at the call site and
  // throws. See the note over `buildStair` for what is and is not built on each of these.
  const STAIR_DECKS = SHAFT_DECKS.slice();
  // Two footprints, because the two doors are in different walls: the lobby's 安全出口 is in the
  // +z wall at x 4.80, the landing's fire door is in the +x wall at z 4.70. A real switchback
  // shifts in plan between the ground and the first floor for exactly this reason.
  const STAIR  = { x0: 6.10, x1: 8.30, z0: 3.90, z1: 6.90 };
  const STAIR0 = { x0: 4.10, x1: 6.90, z0: 6.30, z1: 8.60 };
  // State for `timed`, `parcel`, `locker` and the lift notice, declared up here with the shell's
  // other lists rather than beside the functions that own them. FlatFit files write these
  // registries as the rooms build, and that loop runs some two thousand lines before the functions:
  // a `const` down there is in its temporal dead zone when a room calls it and throws
  // "Cannot access 'timedProps' before initialization" — which is exactly what .bootcheck.js
  // caught the first time this was written the other way round. Function declarations hoist;
  // const arrays do not.
  const timedProps = [];
  let timedHour = -1;
  const parcels = [], lockers = [];
  const liftNotices = [];
  let liftOutNow = null, liftNoticeOn = null;

  // One box for the whole scene, which is what `R.setRoom` wants and what the shader's ambient
  // term measures walls and ceiling against. x and z cover both decks; the height is the deck
  // you are standing on, so `setFloor` re-states it rather than picking an average that is
  // wrong in both rooms.
  const RX = 6.0, RZ = LOBBY.z1, H = DECK[2] + FLAT.h;

  // The window the daylight patch is projected from. The 客厅 owns it and moves it with
  // `A.setWin`; this is the contract position it stands at until somebody does.
  const WIN = { x: 1.00, y: DECK[2] + 1.45, z: FLAT.z0 + 3.48, hw: .84, hh: .60 };
  let winSet = false;

  // Every room's own opening, in the order they were declared. `WIN` is a single record and can
  // only ever describe one window, which is why all twelve storeys were lit through the 客厅's:
  // gl.js keeps a registry now (`R.addWindow`) and shades whichever opening is nearest the eye,
  // so `A.setWin` appends here as well as writing the legacy record.
  //
  // Nothing is handed to the renderer at build time. game.js line 11264 calls
  // `R.setWindow(scene.WIN.x, …)` on every entry into this scene, and the five-argument form
  // clears the registry by design — so a registration made while building would be thrown away
  // the first time the player walked in. `applyWins`, driven from `tick`, is where it lands.
  const WINS = [];
  function applyWins() {
    if (!WINS.length || typeof R === 'undefined' || !R || !R.setWindow) return;
    R.setWindow(WINS);
  }

  // ---------------------------------------------------------------- decks
  // Both decks stand in the same (x, z), so what the body may walk through, and what the camera
  // must not rise through, is per deck. The two arrays handed to `B.finish` are the *live* ones:
  // `setFloor` empties and refills them in place, which is what lets the single `clampMove` in
  // build.js do the right thing on either floor without knowing there are two of them.
  // One bucket per deck rather than the two this used to have. A deck with nothing registered in
  // it is an empty array, not a missing key, so a floor that has not been built yet fails by being
  // unreachable rather than by throwing.
  const ZONE = {}, SOL = {};
  // Contact shadows and light pools are per deck for a harder reason than the colliders are.
  // A decal is not depth-tested against the room — that is the whole point of it, it is painted
  // onto whatever is under it — so the forty-eight shadow patches the flat lays under its
  // furniture were being drawn straight through the lobby ceiling, three metres below where they
  // belong. What that looked like was not "a shadow in the wrong place": it looked like the flat
  // itself showing through, a soft white ghost of plant pots and kitchen units hanging over the
  // lift doors in every shot of the lobby. Zeroing these fifty-two quads and nothing else is what
  // identified them.
  const SHA = {}, GLO = {};
  for (let n = 0; n <= FLOORS; n++) { ZONE[n] = []; SOL[n] = []; SHA[n] = []; GLO[n] = []; }
  // How tall each deck's room box is, for `R.setRoom`. The lobby is its own height; every
  // residential floor is the corridor's until its builder says otherwise.
  const DECK_H = {};
  let decked = false;                      // the decals have been sorted into their decks
  const zones = [];
  let floor = 2;                           // the deck the body is on
  const deckY = f => DECK[f] || 0;
  // Is there anything to stand on up there? A floor whose builder has not landed yet has an empty
  // zone list, and walking into one would put the body in a room with no walls and no floor.
  const deckLive = f => !!(ZONE[f] && ZONE[f].length);
  const stopAt = (f, x0, x1, z0, z1) => {
    const s = { x0, x1, z0, z1, open: false };
    SOL[f].push(s); return s;
  };
  // Sort every shadow and light pool onto the deck it was laid on. Called once, at the end of the
  // build, before the first `setFloor`. The cut is 20 cm under your floor slab, which is well
  // above anything the lobby lays and well under anything the flat does.
  function deckDecals() {
    // Which deck a decal belongs to is now "the highest deck at or below it", not a single cut.
    // With two decks one comparison did it; with twelve, a shadow laid on deck 7 has to find deck
    // 7 rather than land in whichever of two buckets it is nearer.
    const of = y => {
      let best = 0;
      for (let n = 0; n <= FLOORS; n++) if (n !== 1 && DECK[n] <= y + .20 && DECK[n] >= DECK[best]) best = n;
      return best;
    };
    for (const s of shadows) (SHA[of(s.m[13])] || SHA[0]).push(s);
    for (const q of glows) (GLO[of(q.m[13])] || GLO[0]).push(q);
    decked = true;
  }
  function setFloor(n) {
    n = Math.round(n) || 0;
    // A deck nobody has built yet has no zones, so there is nothing to stand on and nothing to
    // stop you: `clampMove` with an empty zone list leaves the body wherever it was pushed. Refuse
    // it and say so, rather than dropping the player into an empty world silently — which is
    // exactly the failure TOWER.md warns Wave 0 has to make impossible.
    if (n < 0 || n > FLOORS || n === 1 || !deckLive(n)) {
      if (n !== 0 && n !== 2)
        console.warn('World.setFloor(' + n + '): deck ' + n + ' has nothing built on it yet.');
      n = deckLive(n === 0 ? 0 : 2) ? (n === 0 ? 0 : 2) : 0;
    }
    floor = n;
    zones.length = 0; for (const q of ZONE[floor]) zones.push(q);
    solids.length = 0; for (const s of SOL[floor]) solids.push(s);
    if (decked) {
      shadows.length = 0; for (const s of SHA[floor]) shadows.push(s);
      glows.length = 0; for (const q of GLO[floor]) glows.push(q);
    }
    if (typeof R !== 'undefined' && R.setRoom)
      R.setRoom(RX, DECK_H[floor] !== undefined ? DECK_H[floor]
                : floor === 0 ? LOBBY.h : DECK[2] + FLAT.h, RZ);
  }
  // Where a ride in a given direction ends up. This was the two-stop answer — up meant deck 2 and
  // down meant deck 0, because there was nowhere else to go. With twelve floors the honest answer
  // is "one floor that way from where you are", and the caller is free to ask for somewhere else
  // with `goFloor`.
  const rideFloor = (dir, finished) => {
    if (!finished) return floor;
    const step = dir === 'up' ? 1 : -1;
    for (let n = floor + step; n >= 0 && n <= FLOORS; n += step) {
      if (n === 1) continue;                 // deck 1 is the ride, not a place you stand
      if (deckLive(n)) return n;
    }
    return floor;
  };
  // Which room the body is standing in. The hysteresis stops the camera cutaway from flickering
  // while they linger exactly on a threshold. Inside the car is its own room, on either deck,
  // because a lit box 1.8 m across should not be lit by a lamp out in the corridor.
  // `exact` turns off every hysteresis band below and answers with the room the point is
  // literally inside. The bands exist so that walking through a doorway swaps the lamp and the
  // orbit limit once instead of four times — they are right for lighting and wrong for the
  // camera cutaway, which needs the box the body is actually in. At the flat/corridor seam the
  // band leaves `room` naming the corridor while the body is up to 0.16 m inside the flat, and
  // `hiddenAt` then measures its cut band off the corridor's far face: the wall standing between
  // the eye and the player is not in that band, so it is drawn, full screen, with the player
  // behind it. Same fault at every interior doorway, in both directions.
  function roomAt(x, z, prev, exact) {
    if (ride && ride.rider) return carZone;
    // Being *in* the car, not standing in front of it. This used to reach 10 cm past the front
    // face, which upstairs is walkable corridor — anyone waiting at the doors was lit by a lamp
    // in a box they were not inside. And the car has to actually be at your deck for you to be in
    // it at all, which is what the height test is: two decks share these x and z.
    const inCar = Math.abs(CAR.y - deckY(floor)) < .02 &&
                  Math.abs(x - CARX) < CARW / 2 - .06 && z > CARZ - CARD / 2 + .04;
    if (inCar) { carZone.light[1] = CAR.y + CARH - .30; return carZone; }
    if (floor === 0) return ZONE[0][0];
    // Every deck above the second is somebody else's floor and answers for itself: whichever of
    // its own zones contains the body, or its first. Only deck 2 has the flat's room plan below.
    if (floor !== 2) {
      const zs = ZONE[floor];
      if (!zs || !zs.length) return ZONE[0][0];
      for (const q of zs)
        if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return q;
      return zs[0];
    }
    const edge = exact ? 0 : prev === 'corr' ? -.16 : .16;
    if (z > CORR.z0 + edge) return ZONE[2][1];
    // Inside the flat, which room. Before js/home-walls.js there was one answer — "the flat" — and
    // a 12 × 8 m flat lit by one bulb hanging in the middle of it is half of why nothing in here
    // read as a room. Each partitioned room now carries its own lamp and its own cutaway bounds.
    //
    // The hysteresis is the same trick as the corridor edge above and matters more here, because
    // these boundaries are doorways you stand in the middle of: a room keeps you until you are
    // 0.18 m clear of it, so walking through a door changes the lighting once rather than four
    // times. `prev` is the id this returned last frame.
    const rooms = (typeof HomeWalls !== 'undefined' && HomeWalls.ROOMS) || null;
    if (rooms && rooms.length) {
      if (prev && !exact) {
        const was = rooms.find(r => r.id === prev);
        if (was && x > was.x0 - .18 && x < was.x1 + .18 && z > was.z0 - .18 && z < was.z1 + .18)
          return was;
      }
      for (const r of rooms)
        if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
    }
    return ZONE[2][0];
  }

  // The skyline is emissive, so it has to be re-tinted by hand or it stays cold blue under
  // a sunset sky. `far` is the hazy back layer, `near` the darker front one.
  const city = [[], [], []];
  function setCity(far, near, litGlow) {
    for (const p of city[0]) p.color = far;
    for (const p of city[1]) p.color = near;
    for (const p of city[2]) p.glow = litGlow;
  }

  // ================================================================ the lift, and the ride
  //
  // One car, two stops, and a ride you take rather than one that happens to you. The sequence is
  // the one a real lift runs, and each step of it is a separate thing you do:
  //
  //   你按电梯    callLift()    the car comes if it is elsewhere, then the doors open — 叮
  //   你走进去    'lift-in'     standing in an open car is what opens the floor panel
  //   你选楼层    goFloor(n)    the doors shut, the car travels, the doors open — 叮
  //
  // This used to be one step: the doors stood permanently open and stepping into the car started
  // it moving on its own. That is not a lift, it is a trapdoor — you could not ride to the floor
  // you were already on, could not change your mind, and never once pressed anything. The state
  // below is what buys the other four seconds.
  //
  // `CAR.y` is where the car floor is in world y and everything that travels — the car, its two
  // leaves, its light, the fit-out in js/home-lift.js, the body standing in it — is driven off it.
  const CAR = { y: DECK[0] };
  const DOOR_T = 1.15;             // seconds a leaf takes to cross its half of the opening
  const HOLD_T = 7.0;              // seconds the doors stand open before they give up on you
  // Seconds for one storey, and the whole ride is that times the storeys travelled — but capped,
  // because eleven floors at four seconds each is a loading screen and not a lift. A real car does
  // most of its travel at line speed, so the cap is where this stops being linear.
  const RIDE_1 = 2.6, RIDE_MAX = 7.5;
  // Reduced motion does not skip the ride: the doors, the indicator and the arrival still have to
  // happen or the lift stops being a place. It caps the moving part at one storey worth, so
  // eleven floors is 2.6 s of travelling car instead of 7.5.
  const rideSecs = (from, to) =>
    prefersReducedMotion() ? RIDE_1
      : Math.min(RIDE_MAX, RIDE_1 + Math.abs(deckY(to) - deckY(from)) / STOREY * 0.55);
  const CLOSE_T = 0.9;             // grace after a floor is chosen, so the 叮 is not stepped on
  // `carAt` is where the car is. `floor`, above, is where *you* are. Keeping them apart is the
  // whole of it: the car can be downstairs while you are up, which is the only reason a call
  // button has anything to do.
  let carAt = 0;
  let door = 'shut';               // 'shut' | 'opening' | 'open' | 'closing'
  let doorK = 0;                   // how far the doors at the car's own stop stand open, 0..1
  let hold = 0;                    // seconds the open doors have left to run
  let ride = null;                 // { from, to, t, rider } while the car is moving
  let pend = -1, pendRider = false, pendWait = 0;   // a deck the closing doors are closing for
  let wasIn = false;               // the body was aboard an open car last frame
  const evs = [];                  // what happened this frame, for game.js to make a sound of
  const riders = [];               // props that travel with the car: { p, m0, oy }
  const leaves = [];               // door leaves: { p, m0, oy, s, at }  at = 'car' | 0 | 2
  const carZone = { id: 'lift', x0: CARX - CARW / 2 + .10, x1: CARX + CARW / 2 - .10,
                    z0: CARZ - CARD / 2 + .06, z1: CARZ + CARD / 2 - .06,
                    light: [CARX, CARH - .28, CARZ], ceil: CARH - .06,
                    // The orbit limit the camera eases to in here. It used to be moot: the eye was
                    // being clamped to the car's own walls, 7 cm behind your head, whatever this
                    // said. With that clamp lifted (`inLift` in js/game.js) this is what sets the
                    // shot — far enough back through the rear wall to see the whole figure and
                    // the box it is standing in, and no further.
                    near: 2.45 };
  let carLight = null;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // A prop that travels. `m0` is where it was built — at DECK[0], because the car is built in the
  // lobby and lifted from there — and `oy` is its pick box's own y, which has to move with it or
  // clicking the mirror in a car three metres up misses by three metres.
  function rides(p) {
    if (Array.isArray(p)) { p.forEach(rides); return p; }
    // -1 is "never cull by deck". A prop that travels with the car is on whatever deck the car is
    // on, which is not the deck it was built on, so the per-deck cull in js/game.js must skip it.
    if (p) p.deck = -1;
    if (p && p.m) riders.push({ p, m0: p.m, oy: p.ob ? p.ob.y : 0 });
    return p;
  }
  function moveRider(r, dx, dy) {
    r.p.m = M.mul(M.trans(dx, dy, 0), r.m0);
    r.p.cx = r.p.m[12]; r.p.cy = r.p.m[13]; r.p.cz = r.p.m[14];
    if (r.p.ob) { r.p.ob.y = r.oy + dy; r.p.ob.x = r.p.m[12]; }
  }
  // Where the doors at a given landing stand: open only when the car is actually there, which is
  // the whole reason a lift shaft is not simply a hole in the wall.
  const landingK = f => Math.abs(CAR.y - deckY(f)) < .02 ? doorK : 0;

  // Send the car to a deck. It cannot start until the doors are shut, so if they are not this
  // parks the request and the closing handler picks it up — which is exactly the order a real one
  // does it in, and is why you get to watch the doors close on the floor you chose.
  function sendCar(to, rider) {
    if (door === 'shut' && doorK <= 0) {
      ride = { from: carAt, to, t: 0, rider, secs: rideSecs(carAt, to) };
      evs.push('lift-go');
      // While it moves you are in the car and nowhere else, and nothing in it is in your way.
      if (rider) { zones.length = 0; zones.push(carZone); solids.length = 0; }
    } else {
      pend = to; pendRider = rider; pendWait = rider ? CLOSE_T : 0;
      if (door !== 'closing') { door = 'closing'; evs.push('lift-close'); }
    }
  }
  function openDoors() {
    hold = HOLD_T;
    pend = -1;
    if (door === 'opening' || door === 'open') return;
    door = 'opening';
    evs.push('lift-ding');
  }

  // ---- the two ways in.
  //
  // `callLift()` is the button on the landing: bring the car to the deck the body is standing on
  // and open it. `goFloor(n)` is the panel inside: shut the doors and take them there. Both return
  // a string when they are refusing, which is what the caller says out loud, and true otherwise —
  // "the lift is on its way" is a better answer than a button that does nothing.
  function callLift(to) {
    // The old signature took the deck to go to. Anything passing one still means `goFloor`.
    if (to !== undefined) return goFloor(to);
    if (liftOutNow) return 'liftOut';
    if (ride) return ride.to === floor ? 'coming' : 'busy';
    if (carAt === floor) { openDoors(); return true; }
    sendCar(floor, false);
    return true;
  }
  // `day` and `minutes` are optional and are the building's clock, not this file's: nothing in here
  // knows the time, and a lift that refused on a clock it read itself would be untestable. Handed
  // them, the car also answers for 停电 and 电梯检修 — see the refusal below.
  function goFloor(n, day, minutes) {
    // Any deck, not the two this used to collapse to. A floor nobody has built has no zones, and
    // riding to one would put you in a room with no floor — so it is refused by name rather than
    // quietly rounded to the flat, which is what `n === 0 ? 0 : 2` did to every button above two.
    const to = Math.round(n) || 0;
    if (ride) return 'busy';
    if (to < 0 || to > FLOORS || to === 1 || !deckLive(to)) return 'unbuilt';
    // 停电，电梯用不了 / 电梯检修. A separate refusal from 'unbuilt', and separately worded, because
    // the two mean opposite things to a player: 'unbuilt' is "there is nothing up there", this is
    // "there is, and today you walk". `js/disrupt.js` is a pure function of the day, so the same
    // day always refuses at the same hours and a replay refuses identically. The caller re-asks
    // `Disrupt.liftOut` for the note rather than having it returned here, which keeps this
    // function's contract the one every caller already switches on: `true`, or a reason string.
    //
    // Guarded on the module existing at all: js/world.js is loaded by harnesses that do not load
    // the disruption layer, and a lift that throws in .flatcheck.js is worse than one that runs.
    if (day !== undefined && typeof Disrupt !== 'undefined' && Disrupt.liftOut
        && Disrupt.liftOut(day, minutes)) return 'liftOut';
    if (to === carAt) { hold = HOLD_T; return 'here'; }
    sendCar(to, true);
    return true;
  }

  // Is the body standing in the car? The margins are the ones `tick` used to arm the ride with —
  // well inside the walls, so brushing the doorway is not "aboard".
  const aboard = (x, z) =>
    Math.abs(x - CARX) < CARW / 2 - .22 && Math.abs(z - CARZ) < CARD / 2 - .16;
  // And in the opening, where a door must not shut on them.
  const inDoorway = (x, z) =>
    Math.abs(x - CARX) < DOORW / 2 + .20 && Math.abs(z - CARZ) < CARD / 2 + .45;
  // What the floor panel needs to know to draw itself — and what the sound needs to know to swell.
  // `near` is how close the car is to the deck you are standing on, 0 at the far floor and 1 when
  // it is level with you: a lift you have called is behind a steel door and the only thing that
  // tells you it is coming is that it gets louder.
  const liftState = () => {
    return {
      at: carAt, on: floor, moving: !!ride, door, open: doorK,
      riding: !!(ride && ride.rider),
      out: !!liftOutNow,
      outNote: liftOutNow ? liftOutNow.note : null,
      // 461. Where it is going and how much of the ride is left, in seconds of real time. A
      // refusal is not a wait: the landing button could say the car was busy and nothing else,
      // so the player pressed it again. Both are already here; they were just never handed out.
      to: ride ? ride.to : carAt,
      eta: ride ? Math.max(0, ride.secs - ride.t) : 0,
      // Across one storey, not the whole shaft: the sound has to swell as the car arrives at
      // *your* floor, and on a twelve-floor shaft dividing by the full 34 m makes that inaudible.
      near: clamp(1 - Math.abs(CAR.y - deckY(floor)) / STOREY, 0, 1),
    };
  };

  // Called every frame by game.js with the body. Two jobs: hold `P.lift` at the deck the body is
  // standing on — which is what makes the camera, the shadow and the drawn figure agree that the
  // flat is three metres up — and run the car when it is running.
  let lastT = -1;
  function tick(t, P) {
    // The per-room daylight openings go back in here rather than at build time, because game.js
    // clears the renderer's registry every time it enters this scene. This tick only runs while
    // the flat is the live scene, so a quarter-second hole in `t` means the player has been
    // somewhere else and the registry is now somebody else's window. Re-applying is idempotent —
    // a loading hitch that trips it costs one clear and N pushes and nothing else — and it is not
    // per-frame work: in steady play `t - lastT` is a frame, and this does not fire.
    if (t - lastT > .25) applyWins();
    const dt = lastT < 0 ? 0 : clamp(t - lastT, 0, .05);
    lastT = t;
    evs.length = 0;
    if (ride) {
      // The doors are already shut — `sendCar` will not start a ride until they are — so the whole
      // of the ride is travel. The car eases out of one floor and into the other rather than
      // starting at speed.
      ride.t += dt / (ride.secs || 4.2);
      const u = clamp(ride.t, 0, 1);
      CAR.y = lerp(deckY(ride.from), deckY(ride.to), sstep(.10, .92, u));
      if (ride.rider) {
        P.lift = CAR.y;
        P.x = lerp(P.x, CARX, 1 - Math.pow(.02, dt));
        P.z = lerp(P.z, CARZ, 1 - Math.pow(.02, dt));
        P.vx = P.vz = 0; P.speed = 0; P.ground = 0;
      } else {
        // An empty car on its way to fetch you. You are standing on your own deck watching a
        // number change, and nothing about you moves.
        P.lift = deckY(floor);
      }
      if (u >= 1) {
        const rider = ride.rider;
        carAt = ride.to; CAR.y = deckY(carAt); ride = null;
        if (rider) setFloor(carAt);
        openDoors();
      }
    } else {
      CAR.y = deckY(carAt);
      P.lift = deckY(floor);
      // ---- the doors
      if (door === 'opening') {
        doorK = Math.min(1, doorK + dt / DOOR_T);
        if (doorK >= 1) door = 'open';
      } else if (door === 'closing') {
        // The pause between choosing a floor and the doors actually moving. Without it the 叮 of
        // arriving and the shove of leaving land on the same frame.
        if (pendWait > 0) pendWait -= dt;
        else doorK = Math.max(0, doorK - dt / DOOR_T);
        // The safety edge every lift has: it will not shut on somebody standing in the opening,
        // unless they are aboard, in which case the opening is behind them and they are fine.
        if (pend < 0 && carAt === floor && inDoorway(P.x, P.z) && !aboard(P.x, P.z)) openDoors();
        else if (doorK <= 0) {
          door = 'shut';
          if (pend >= 0) { const to = pend, r = pendRider; pend = -1; sendCar(to, r); }
        }
      } else if (door === 'open') {
        hold -= dt;
        if (hold <= 0) {
          if (carAt === floor && inDoorway(P.x, P.z) && !aboard(P.x, P.z)) hold = 1.2;
          else { door = 'closing'; evs.push('lift-close'); }
        }
      }
      // ---- stepping into an open car is what asks you which floor. Once per arrival: dismissing
      // the panel and standing there does not re-open it, which is what the 按钮 on the wall is
      // for. Stepping out and back in does.
      const in0 = door !== 'shut' && carAt === floor && aboard(P.x, P.z);
      if (in0 && !wasIn) evs.push('lift-in');
      wasIn = in0;
    }
    carZone.light[1] = CAR.y + CARH - .28;
    carZone.ceil = CAR.y + CARH - .06;
    if (carLight) carLight.y = CAR.y + CARH - .16;
    const dy = CAR.y - deckY(0);
    for (const r of riders) moveRider(r, 0, dy);
    for (const l of leaves) {
      const k = l.at === 'car' ? doorK : landingK(l.at);
      moveRider(l, l.s * LEAF_T * k, l.at === 'car' ? dy : 0);
    }
    // The car's fit-out — js/home-lift.js — rides on the same height. It carries the panel, the
    // handrail, the mirror and the four interactables in there, and it drives the floor indicator
    // off this number, so it has to be told before anything is drawn rather than after.
    if (typeof HomeLift !== 'undefined' && HomeLift && HomeLift.tick) HomeLift.tick(CAR.y, doorK);
    // A shut door is a wall. Doing this here rather than in `setFloor` means the body cannot
    // walk into an empty shaft during the four seconds the car is on its way back.
    for (const d of doorStops) d.rec.open = landingK(d.at) > .55;
    // game.js turns these into sounds and into the floor panel. One frame's worth, or nothing.
    return evs.length ? evs.slice() : null;
  }
  const doorStops = [];

  // ================================================================ the shell
  //
  // The envelope only: floors, ceilings, the building's own four walls on both decks, the wall
  // between the corridor and the flat, and the lift shaft. Everything that stands inside these
  // walls belongs to one of the ten room files — see FlatFit at the top.
  const MAT = {
    stone:   { mat: 'paving',   matScale: 1.10, matAmt: .28, nrmAmt: .30 },
    slab:    { mat: 'paving',   matScale: .70,  matAmt: .26, nrmAmt: .30 },
    plaster: { mat: 'plaster',  matScale: .65,  matAmt: .20, nrmAmt: .25 },
    metal:   { mat: 'metal',    matScale: .50,  matAmt: .28, nrmAmt: .30 },
    tile:    { mat: 'tile',     matScale: .34,  matAmt: .28, nrmAmt: .30 },
    timber:  { mat: 'wood',     matScale: .90,  matAmt: .28, nrmAmt: .30 },
    cloth:   { mat: 'fabric',   matScale: .55,  matAmt: .30, nrmAmt: .30 },
    cast:    { mat: 'concrete', matScale: 1.10, matAmt: .24, nrmAmt: .30 },
  };
  // A ceiling is a quad turned face down. Doing it by hand everywhere is how one room ends up
  // with a ceiling nobody can see, so it is written once.
  function ceiling(x, y, z, w, d, c, o = {}) {
    const p = { mesh: 'quad', color: c, mode: 1, alpha: 1, ...o,
      m: M.mul(M.trans(x, y, z), M.mul(M.rotZ(Math.PI), M.scale(w, 1, d))) };
    props.push(p); return p;
  }

  function buildShell() {
    const PL = { ...MAT.plaster };
    // ---- L0 大堂. A polished stone floor with a darker border laid inside it: a lobby floor is
    // never one field of stone, and the border is what tells you where the walking is.
    //
    // The lobby is not symmetric about the origin — it runs z -5.0 .. 6.2, because the corridor
    // and shafts above it were deepened to be walkable — so every one of these is written off LOBBY.z0
    // and LOBBY.z1 rather than off ±RZ. RZ is the half-extent of the box `R.setRoom` wants, and
    // it is the larger of the two ends; using it as a wall position put the street wall 0.3 m
    // outside the building.
    const LZ0 = LOBBY.z0, LZ1 = LOBBY.z1, LZC = (LZ0 + LZ1) / 2, LZD = LZ1 - LZ0;
    // The walls are built taller than the room. `LOBBY.h` is where the ceiling is, and a ceiling
    // is a quad: it hides what is above it only over the footprint it covers, and it stops exactly
    // at the wall. An eye standing in the middle of a room 3 m high and 12 m across looks *over*
    // the far wall at anything above it — and what is above it here is the flat, whose own walls
    // are one-sided and face inward, so the lobby had a strip of somebody's kitchen along the top
    // of every shot. Ten centimetres of wall standing above the ceiling closes that sightline and
    // is invisible from inside, because the ceiling is in front of it.
    const WH = Math.max(LOBBY.h, DECK[2]) + .02;
    flat(0, .004, LZC, RX * 2, LZD, col.tileF, { mode: 9, gloss: .40, glow: .03, ...MAT.stone });
    flat(0, .010, LZC, RX * 2 - 1.7, LZD - 1.7, C('#cfc6b6'), { mode: 9, gloss: .46, ...MAT.slab });
    flat(0, .014, LZC, RX * 2 - 2.0, LZD - 2.0, C('#b9ad99'), { mode: 9, gloss: .48, ...MAT.slab });
    flat(0, .018, LZC, RX * 2 - 2.2, LZD - 2.2, col.tile, { mode: 9, gloss: .44, ...MAT.slab });
    ceiling(0, LOBBY.h, LZC, RX * 2, LZD, col.ceil, { gloss: .08, glow: .02 });
    // The four walls. The street face is left open between x ±1.9 for the vestibule, which the
    // lobby file fills with glass; everything else is solid plaster over a stone plinth.
    for (const [x0, x1] of [[-RX, -1.9], [1.9, RX]])
      wall((x0 + x1) / 2, WH / 2, LZ0, x1 - x0, WH, 0, col.wall, PL);
    wall(0, (2.62 + WH) / 2, LZ0, 3.8, WH - 2.62, 0, col.wall, PL);
    for (const [x0, x1] of [[-RX, -.5], [3.6, RX]])
      wall((x0 + x1) / 2, WH / 2, LZ1, x1 - x0, WH, Math.PI, col.wall, PL);
    wall(-RX, WH / 2, LZC, LZD, WH, Math.PI / 2, col.wall, PL);
    wall(RX, WH / 2, LZC, LZD, WH, -Math.PI / 2, col.wall, PL);
    // Stone plinth and a shadow-gap reveal at the top, so the walls have a bottom and a top.
    for (const [x, y, z, sx, sy, sz] of [
      [0, .075, LZ0 + .06, RX * 2, .15, .11], [0, .075, LZ1 - .06, RX * 2, .15, .11],
      [-RX + .06, .075, LZC, .11, .15, LZD], [RX - .06, .075, LZC, .11, .15, LZD],
    ]) box(x, y, z, sx, sy, sz, C('#9c9384'), { hard: true, gloss: .40, ...MAT.slab });
    for (const [x, z, sx, sz] of [
      [0, LZ0 + .05, RX * 2, .06], [0, LZ1 - .05, RX * 2, .06],
      [-RX + .05, LZC, .06, LZD], [RX - .05, LZC, .06, LZD],
    ]) box(x, LOBBY.h - .14, z, sx, .05, sz, C('#efe9dc'), { hard: true, mode: 1, glow: .10 });
    stopAt(0, -RX, RX, LZ0 - .4, LZ0 + .10);
    stopAt(0, -RX, RX, LZ1 - .10, LZ1 + .4);
    stopAt(0, -RX - .4, -RX + .10, LZ0, LZ1);
    stopAt(0, RX - .10, RX + .4, LZ0, LZ1);

    // ---- L2 the deck. Your floor's slab, seen from above only: from the lobby the eye is held
    // under it by the zone's own ceiling, and from up here it is the floor you stand on.
    const y2 = DECK[2];
    // `nocut` on all four, and it is the same bug the hotel had — js/game.js:hiddenProp says so at
    // length. That function represents every prop by ONE point, its own centre, and asks whether
    // that point lies behind the wall the eye has backed out through. For a fixture that is a fair
    // question. For a slab 12.00 x 8.20 m it is meaningless: this floor's centre is (0, -0.90), and
    // hideX/hideZ are measured against the bounds of the ROOM the body is standing in, so the
    // moment the eye stepped out of any room not containing that point — nine of the flat's ten —
    // the whole floor was culled. The owner's report is exactly that: the floor vanishes while the
    // camera is spun, and the rooms beyond it are visible through the hole.
    //
    // It was latent before and is not any more, because the flat now orbits at 1.90 to 2.97 m
    // rather than a 6.80 m default, so the eye sits outside an interior wall far more of the time.
    // The ceilings go with the floors for the same reason and by the same arithmetic.
    //
    // Opting out rather than inventing a smarter point is what hiddenProp's own note argues for,
    // and it costs nothing here: the eye is kept inside the building by the room's orbit limit, so
    // culling the slab you are standing on was never doing useful work. `nocut` also takes these
    // out of `tagBox` (js/build.js:279), which is the other half of the same class of bug.
    flat(0, y2 + .004, (FLAT.z0 + FLAT.z1) / 2, RX * 2, FLAT.z1 - FLAT.z0, col.floor,
      { mode: 3, gloss: .25, mat: 'wood', matScale: 1.15, matAmt: .30, nrmAmt: .35, nocut: true });
    flat(0, y2 + .004, (CORR.z0 + CORR.z1) / 2, RX * 2, CORR.z1 - CORR.z0, C('#8a8378'),
      { mode: 9, gloss: .34, ...MAT.slab, nocut: true });
    ceiling(0, y2 + FLAT.h, (FLAT.z0 + FLAT.z1) / 2, RX * 2, FLAT.z1 - FLAT.z0, col.ceil,
      { gloss: .08, glow: .02, nocut: true });
    ceiling(0, y2 + CORR.h, (CORR.z0 + CORR.z1) / 2, RX * 2, CORR.z1 - CORR.z0, C('#e6e0d3'),
      { gloss: .08, glow: .02, nocut: true });
    wall(0, y2 + FLAT.h / 2, FLAT.z0, RX * 2, FLAT.h, 0, col.wall, PL);
    wall(0, y2 + CORR.h / 2, CORR.z1, RX * 2, CORR.h, Math.PI, col.wall, PL);
    for (const s of [-1, 1]) {
      wall(s * RX, y2 + FLAT.h / 2, (FLAT.z0 + FLAT.z1) / 2, FLAT.z1 - FLAT.z0, FLAT.h,
        -s * Math.PI / 2, col.wall, PL);
      wall(s * RX, y2 + CORR.h / 2, (CORR.z0 + CORR.z1) / 2, CORR.z1 - CORR.z0, CORR.h,
        -s * Math.PI / 2, col.wall, PL);
    }
    // The wall between the corridor and the flat, and your own front door in it. The opening is
    // in the 玄关's stretch of it, which is where you take your shoes off on the other side.
    const fdx = 3.90, fdw = 1.00, fdtop = 2.10;
    for (const [x0, x1] of [[-RX, fdx - fdw / 2], [fdx + fdw / 2, RX]]) {
      wall((x0 + x1) / 2, y2 + FLAT.h / 2, FLAT.z1, x1 - x0, FLAT.h, Math.PI, col.wall, PL);
      wall((x0 + x1) / 2, y2 + CORR.h / 2, CORR.z0, x1 - x0, CORR.h, 0, C('#c9bda8'), PL);
    }
    wall(fdx, y2 + (fdtop + FLAT.h) / 2, FLAT.z1, fdw, FLAT.h - fdtop, Math.PI, col.wall, PL);
    wall(fdx, y2 + (fdtop + CORR.h) / 2, CORR.z0, fdw, CORR.h - fdtop, 0, C('#c9bda8'), PL);
    box(fdx, y2 + fdtop + .02, FLAT.z1, fdw + .20, .05, .16, col.trim, { hard: true, gloss: G.wood });
    // ±6 cm, not ±9. The wall itself is a quad with no thickness, and every centimetre of collider
    // on its corridor side comes out of the 1.70 m gross strip in front of the lift shafts.
    stopAt(2, -RX, fdx - fdw / 2, FLAT.z1 - .09, FLAT.z1 + .06);
    stopAt(2, fdx + fdw / 2, RX, FLAT.z1 - .09, FLAT.z1 + .06);
    // Skirting, both sides.
    for (const [x0, x1] of [[-RX, fdx - fdw / 2], [fdx + fdw / 2, RX]]) {
      box((x0 + x1) / 2, y2 + .065, FLAT.z1 - .045, x1 - x0, .13, .065, col.trim,
        { hard: true, gloss: G.wood });
      box((x0 + x1) / 2, y2 + .065, CORR.z0 + .045, x1 - x0, .13, .065, col.trim,
        { hard: true, gloss: G.wood });
    }
    for (const s of [-1, 1]) {
      box(s * (RX - .045), y2 + .065, (FLAT.z0 + FLAT.z1) / 2, .065, .13, FLAT.z1 - FLAT.z0,
        col.trim, { hard: true, gloss: G.wood });
      box(s * (RX - .045), y2 + .065, (CORR.z0 + CORR.z1) / 2, .065, .13, CORR.z1 - CORR.z0,
        col.trim, { hard: true, gloss: G.wood });
    }
    // The south wall crosses three finishes. Dark timber belongs to the bedroom/study only;
    // continuing it through the tiled bathroom was the loudest palette clash in the flat. The wet
    // room tiles run cleanly to the floor, while the kitchen gets a quiet washable tile plinth.
    box(-3.70, y2 + .065, FLAT.z0 + .045, 4.60, .13, .065, col.trim,
      { hard: true, gloss: G.wood });
    box(4.10, y2 + .065, FLAT.z0 + .045, 3.80, .13, .065, col.tileW,
      { hard: true, gloss: .16, ...MAT.tile });
    box(0, y2 + .065, CORR.z1 - .045, RX * 2, .13, .065, col.trim, { hard: true, gloss: G.wood });
    stopAt(2, -RX - .4, -RX + .10, FLAT.z0, CORR.z1);
    stopAt(2, RX - .10, RX + .4, FLAT.z0, CORR.z1);
    stopAt(2, -RX, RX, FLAT.z0 - .4, FLAT.z0 + .10);
    stopAt(2, -RX, RX, CORR.z1 - .10, CORR.z1 + .4);

    buildShafts();
    buildStair();
    buildCar();
  }

  // ---------------------------------------------------------------- the two shafts
  // The working one is the contract's, x 1.6..3.4. The second stands beside it with its doors
  // shut, because a tower this size has two and one of them is always somewhere else.
  function buildShafts() {
    // Darker than the plaster around them, which is what a lift door is. At #9aa1a6 the two leaves
    // were lighter than the wall they sit in, and a square metre of light grey metal facing a lamp
    // has nowhere to go but white — they read as two sheets of paper with an indicator over them.
    const steel = C('#7e868c'), dark = C('#3d4348');
    // A landing: the wall face across the shaft, its opening, the leaves behind it, the surround,
    // and the indicator over the top. `working` gets doors that move and a collider that opens.
    function landing(f, sh, cx, w, working) {
      const y0 = deckY(f), ch = f === 0 ? LOBBY.h : CORR.h, zf = sh.z0;
      const hw = w / 2;
      // lintel and jambs, 12 cm of wall thickness standing at the front of the shaft
      box(cx, y0 + (DOORH + ch) / 2, zf + .06, w + 1.20, ch - DOORH, .12, col.wall,
        { hard: true, gloss: .12, ...MAT.plaster });
      for (const s of [-1, 1])
        box(cx + s * (hw + .30), y0 + DOORH / 2, zf + .06, .60, DOORH, .12, col.wall,
          { hard: true, gloss: .12, ...MAT.plaster });
      // brushed-steel surround, standing 2 cm proud of the plaster
      for (const s of [-1, 1])
        box(cx + s * (hw + .07), y0 + DOORH / 2 + .05, zf - .01, .14, DOORH + .10, .05, steel,
          { hard: true, gloss: G.metal, tag: '电梯', ...MAT.metal });
      box(cx, y0 + DOORH + .075, zf - .01, w + .42, .14, .05, steel,
        { hard: true, gloss: G.metal, tag: '电梯', ...MAT.metal });
      // the leaves, behind the wall face so they slide out of sight into the jambs
      for (const s of [-1, 1]) {
        // Gloss .34, not .52. A lift leaf is nearly a square metre of flat steel facing straight
        // at you with a lamp two metres in front of it: at .52 both leaves blew out to white
        // paper and the whole lift lobby lost its doors.
        const p = box(cx + s * w / 4, y0 + DOORH / 2, zf + .13, w / 2, DOORH, .045, steel,
          { hard: true, gloss: .34, tag: '电梯', ...MAT.metal });
        const q = box(cx + s * w / 4, y0 + DOORH / 2, zf + .105, w / 2 - .05, DOORH - .10, .012,
          C('#8d959b'), { hard: true, gloss: .34, tag: '电梯' });
        if (working) for (const r of [p, q])
          leaves.push({ p: r, m0: r.m, oy: r.ob ? r.ob.y : 0, s, at: f });
      }
      // the floor indicator over the doors: a dark panel with the floor lit on it
      box(cx, y0 + DOORH + .34, zf - .015, .52, .30, .06, dark, { hard: true, gloss: .34, tag: '电梯' });
      // The floor number over the doors. This read `f === 0 ? '一' : '二'`, which was true of a
      // two-deck building and labels every one of the ten new floors 二. `NUM` is the same mapping
      // the car's own panel uses — deck 0 is floor 1, deck N is floor N — so the landing and the
      // button agree by construction rather than by two people writing the same rule twice.
      B.glyphs(cx, y0 + DOORH + .34, zf - .05, Math.PI, floorLabel(f),
        { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16, tag: '电梯' });
      // 458. Which floor is yours, on the landing, without reading English. Deck 2 only, one
      // glyph, and deliberately not a second indicator: it sits beside the numeral the player
      // is already looking at when the doors open.
      if (f === 2)
        B.glyphs(cx + .40, y0 + DOORH + .34, zf - .05, Math.PI, '家',
          { size: .13, color: C('#8fd6a0'), mode: 1, glow: .12, tag: '电梯' });
      // The colliders start at the plane of the shaft, not five centimetres in front of it. On
      // the upper deck the walkway past these is 0.71 m wide and `clampMove` spends 0.60 of that
      // on the body radius, so five centimetres of collider standing proud of the geometry it
      // represents is the difference between a corridor and a wall.
      if (working) {
        const rec = stopAt(f, cx - hw, cx + hw, zf, zf + .20);
        rec.shaft = true;
        doorStops.push({ rec, at: f });
      } else stopAt(f, cx - hw, cx + hw, zf, zf + .20).shaft = true;
      // The piers either side, which are the shaft walls seen from the room — and they stop 8 cm
      // SHORT of the opening, which is the whole of whether you can get out of the lift.
      //
      // `clampMove` inflates every collider by the 0.30 m body radius, so piers flush with an
      // 0.80 m opening leave a lane of 0.80 - 0.60 = 0.20 m. That is walkable only if you go
      // exactly down the middle, and it leaves no tolerance at all: measured by riding to all
      // twelve decks and walking the body out of the car, decks 5, 9, 10 and 12 threaded it and
      // decks 3 and 4 did not, purely because their floor files had left a stand-in collider a few
      // centimetres inside the shaft. A door you can only use if nothing else is anywhere near it
      // is not a door.
      //
      // Backing the pier off by 0.08 makes the lane 0.36 m. What that exposes is an 8 cm sliver of
      // shaft either side of the opening, which is inside the door reveal and behind the landing's
      // own wall geometry — there is nothing there to fall into. Widening DOORW instead is not
      // available: a centre-opening leaf travels DOORW/2 and parks at CARX - DOORW, so anything
      // over 0.83 slides through the car's own side wall.
      const PIER_GAP = .08;
      stopAt(f, sh.x0 - .10, cx - hw - PIER_GAP, zf, sh.z1 + .05).shaft = true;
      stopAt(f, cx + hw + PIER_GAP, sh.x1 + .10, zf, sh.z1 + .05).shaft = true;
    }
    // The shaft walls themselves, on both decks, so the eye never sees into a void beside the car.
    // Every floor, not two. `buildShafts` ran `for (const f of [0, 2])` for as long as this was a
    // two-deck building, and ten agents reported the consequence independently: decks 3–12 got no
    // doors, no surround, no indicator, no call button and — worse — no entry in `leaves` or
    // `doorStops`, so the car arrived at a landing whose leaves never moved and whose collider
    // never opened. Every floor built its own stand-in to cover it.
    //
    // Unconditional rather than `decks()`, and that is deliberate: `buildShafts` runs inside
    // `buildShell`, which runs BEFORE the FlatFit loop, so at this point no deck above the second
    // has registered a zone yet and `deckLive` would answer no for all of them. The building has
    // twelve floors whether or not somebody has furnished them; `goFloor` is what refuses to take
    // you to an empty one.
    for (const f of SHAFT_DECKS) {
      const y0 = deckY(f), ch = f === 0 ? LOBBY.h : CORR.h;
      for (const sh of [LIFT, LIFT_B]) {
        if (f === 2 && sh === LIFT_B) {
          // Upstairs the second shaft is simply a wall: no doors, no opening, nothing to press.
          // Facing PI, not 0. The corridor is on the -z side of this plane, and a quad at yaw 0
          // faces +z — into the shaft, away from the only person who will ever look at it. It
          // read as a hole straight through the building, and js/home-corridor.js papered over
          // it with a panel of its own 12 mm in front, which can now come out.
          wall((sh.x0 + sh.x1) / 2, y0 + ch / 2, sh.z0, sh.x1 - sh.x0, ch, Math.PI, col.wall,
            MAT.plaster);
          // This blanked-off shaft face is permanent shell structure. Mark it exactly like the
          // working shaft piers below so the stale per-floor-collider cleanup cannot remove it.
          stopAt(2, sh.x0 - .10, sh.x1 + .10, sh.z0, sh.z1 + .05).shaft = true;
          continue;
        }
        wall(sh.x0, y0 + ch / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, ch, Math.PI / 2, C('#b8ae9c'),
          MAT.plaster);
        wall(sh.x1, y0 + ch / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, ch, -Math.PI / 2, C('#b8ae9c'),
          MAT.plaster);
        wall((sh.x0 + sh.x1) / 2, y0 + ch / 2, sh.z1, sh.x1 - sh.x0, ch, Math.PI, C('#7c756a'),
          MAT.plaster);
        landing(f, sh, (sh.x0 + sh.x1) / 2, sh === LIFT ? DOORW : .92, sh === LIFT);
      }
    }
    // The call panel between the two sets of doors, and one upstairs. Pressing it is 电梯.
    for (const f of SHAFT_DECKS) {
      const y0 = deckY(f), px = f === 0 ? 1.50 : 3.72, pz = LIFT.z0 - .02;
      box(px, y0 + 1.12, pz, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34, tag: '电梯' });
      // The two buttons, and the arrow on each of them. The arrow used to be destructured out of
      // this list and then never drawn — two amber squares, which is a call panel with no up and
      // no down on it. The glyph stands 8 mm in front of the button face.
      for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
        box(px, y0 + 1.12 + dy, pz - .022, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
        B.glyphs(px, y0 + 1.12 + dy, pz - .036, Math.PI, ch,
          { size: .038, color: C('#4a3316'), gloss: .12, tag: '电梯' });
      }
      // Shell fixtures are built before the per-floor builders, so they are outside the normal
      // room-stamping pass below.  Leaving this undefined made every landing's call control look
      // current on every other deck: all eleven buttons competed for the same pick, and a roof
      // press could resolve to the lobby.  A call control belongs to one landing, even though the
      // shaft geometry itself is shared by the whole tower.
      const call = thing('电梯', px, y0 + 1.52, pz - .10,
        f === 0 ? '电梯在一楼，等一下。' : '按电梯，下楼去。',
        f === 0 ? 'The lift is on the ground floor — wait a moment.' : 'Press for the lift, and go down.',
        '电 electricity + 梯 ladder. 上楼 is up, 下楼 is down.',
        { focus: [px, LIFT.z0 - 1.3], reach: 1.9 });
      call.deck = f;
    }
  }

  // ---------------------------------------------------------------- 楼梯 the fire stair
  //
  // Two signs in this building have pointed at nothing since it was built: the 安全出口 plate and
  // door leaf in the lobby (js/home-lobby.js), and the fire-stair door and the 楼梯 interactable at
  // the east end of the landing (js/home-corridor.js). `grep -c homeStair js/world.js` was 0.
  // Behind both of them was the outside of the building.
  //
  // `STAIR_DECKS` is `SHAFT_DECKS`, and for the reason written over that list: this runs inside
  // `buildShell`, before any FlatFit has registered a zone, so `deckLive` answers no for every
  // upper deck here and a stair built on `decks()` would exist on two floors out of twelve.
  //
  // What is deliberately NOT built:
  //
  //   * a walkable zone. `goStair` below is a deck change, not a room you stand in — the two fire
  //     doors never open, and a zone behind a closed door is either unreachable (so dead props) or
  //     reachable through a shut leaf (so a bug). The geometry is what the doors look *into*.
  //   * the full flight on every deck. Only decks 0 and 2 have a door with a vision panel in it,
  //     so only those two are ever seen; the rest get the landing slab and its guard wall, which
  //     is what item 108 is really asking for — a stair that exists on every deck the lift serves,
  //     rather than only where somebody happened to furnish a floor.
  //
  // 48 props for the whole tower. A flight on all eleven would have been about 170, for geometry
  // behind a shut steel door.
  function buildStair() {
    const conc = C('#a49b8c'), concD = C('#8b8375'), rail = C('#8f9599');
    for (const f of STAIR_DECKS) {
      const y0 = deckY(f), S = f === 0 ? STAIR0 : STAIR;
      const cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
      // The landing slab and the guard wall behind it. Every deck gets these, live or not.
      flat(cx, y0 + .012, cz, S.x1 - S.x0, S.z1 - S.z0, concD, { gloss: .16, ...MAT.slab });
      wall(cx, y0 + 1.30, S.z1, S.x1 - S.x0, 2.60, Math.PI, conc, MAT.plaster);
      if (f !== 0 && f !== 2) continue;
      // The two decks with a door looking into them get the rest: three walls, a flight of nine
      // going up, the soffit of the flight coming down, a handrail and the emergency lamp that is
      // the only light in one of these.
      wall(S.x1, y0 + 1.30, cz, S.z1 - S.z0, 2.60, -Math.PI / 2, conc, MAT.plaster);
      wall(cx, y0 + 1.30, S.z0, S.x1 - S.x0, 2.60, 0, conc, MAT.plaster);
      const fx = f === 0 ? S.x1 - .70 : S.x0 + .70;       // which side the flight climbs
      for (let i = 0; i < 9; i++)
        box(fx, y0 + .09 + i * .172, S.z0 + .34 + i * .27, 1.20, .07, .27, conc,
          { hard: true, gloss: .18, ...MAT.slab });
      box(fx, y0 + 1.62, cz + .30, 1.20, .10, 2.10, concD,
        { hard: true, gloss: .14, rx: -.56, ...MAT.slab });                     // the soffit above
      cyl(fx + .62, y0 + 1.05, cz, .022, 2.60, rail, { rx: .56, gloss: .50, ...MAT.metal });
      box(cx, y0 + 2.34, S.z1 - .12, .34, .13, .06, C('#2f3a34'), { hard: true, gloss: .30 });
      box(cx, y0 + 2.34, S.z1 - .155, .28, .09, .01, C('#7fe0a8'),
        { hard: true, mode: 1, glow: .18 });                                    // 应急灯
    }
  }

  // Climbing it. `goFloor` is the lift and it answers 'unbuilt' when a deck has nothing on it and
  // 'busy' while the car is moving — which, on a building whose own second shaft is dressed
  // 此梯停用, left a failed lift meaning a floor nobody could reach. This is the other route: one
  // deck at a time, no car, refused for the same two reasons the lift refuses and for one more —
  // you cannot take the stairs from inside the lift.
  function goStair(dir) {
    if (ride) return 'busy';
    // Deck 1 does not exist — it is the ride between the lobby and the first landing — so one
    // flight from 0 is 2 and one flight down from 2 is 0. Everywhere else it is ±1.
    const up = dir >= 0;
    const to = floor === 0 ? (up ? 2 : 0) : floor === 2 && !up ? 0 : floor + (up ? 1 : -1);
    if (to === floor) return 'unbuilt';
    if (to < 0 || to > FLOORS || to === 1 || !deckLive(to)) return 'unbuilt';
    setFloor(to);
    return to;
  }

  // ---------------------------------------------------------------- the car
  // Structure only — floor, walls, ceiling, light and the two leaves — because js/home-lift.js
  // fits it out. Anything that file builds with `A.rides` travels with this.
  function buildCar() {
    const steel = C('#a8afb4'), pan = C('#4a5055');
    // The floor. Its *top* is CARFY, flush with the lobby's finished stone, and that is the one
    // number the fit-out measures off. It used to be a 9 cm slab standing on y 0 with its top at
    // 0.090, while the deck under it is a quad at 0.004..0.018 — so the body stood at deckY with
    // its feet 72 mm inside the car floor.
    rides(box(CARX, CARFY - .025, CARZ, CARW - .06, .05, CARD - .06, pan,
      { hard: true, gloss: .30, tag: '电梯', ...MAT.metal }));
    // The side walls stop 55 mm short of the front, so the leaves have a pocket to park into
    // instead of sliding through them.
    for (const s of [-1, 1])
      rides(box(CARX + s * (CARW / 2 - .035), CARH / 2, CARZ + .0275, .07, CARH, CARD - .115, steel,
        { hard: true, gloss: .46, tag: '电梯', ...MAT.metal }));
    rides(box(CARX, CARH / 2, CARZ + CARD / 2 - .035, CARW - .14, CARH, .07, steel,
      { hard: true, gloss: .46, tag: '电梯', ...MAT.metal }));
    rides(box(CARX, CARH - .05, CARZ, CARW - .06, .10, CARD - .06, C('#dcd7cb'),
      { hard: true, gloss: .20, tag: '电梯' }));
    // A metre square of lit ceiling. Anything over about a square metre wants .02–.05 or it stops
    // being a light and becomes a lightbox; this was .14.
    rides(box(CARX, CARH - .115, CARZ, CARW - .52, .03, CARD - .52, C('#fff2d6'),
      { hard: true, mode: 1, glow: .05, tag: '电梯' }));
    // The car's own leaves, 15 mm in front of the front face so they can slide across it.
    for (const s of [-1, 1]) {
      const p = box(CARX + s * DOORW / 4, DOORH / 2, CARZ - CARD / 2 + .030, DOORW / 2, DOORH, .05,
        steel, { hard: true, gloss: .52, tag: '电梯', ...MAT.metal });
      leaves.push({ p, m0: p.m, oy: p.ob.y, s, at: 'car' });
    }
    // and the front face either side of them, so the car is a box and not three walls
    for (const s of [-1, 1])
      rides(box(CARX + s * (CARW / 2 - .09), DOORH / 2 + .06, CARZ - CARD / 2 + .055, .18,
        DOORH + .12, .05, steel, { hard: true, gloss: .46, tag: '电梯', ...MAT.metal }));
    rides(box(CARX, (DOORH + .12 + CARH) / 2, CARZ - CARD / 2 + .055, CARW - .06,
      CARH - DOORH - .12, .05, steel, { hard: true, gloss: .46, tag: '电梯', ...MAT.metal }));
    // .32, not .60. This is a lamp 2 m above the floor of a box 1.8 by 1.3, with steel on three
    // sides of it: at .60 the whole interior saturated, and with the doors open at a landing what
    // you saw from the lobby was not a lift but a rectangle of white light.
    carLight = B.light(CARX, CARH - .16, CARZ, [1.00, 0.95, 0.86], .32, 2.4);
  }

  // ================================================================ the toolkit
  //
  // One object, handed to every builder in FlatFit. See the note at the top of this file for the
  // whole of it; the only thing worth repeating here is that y is world y and `A.y0` is the deck
  // the room being built stands on.
  let curDeck = 2;
  // Which deck a FlatFit builder is called for. Anything not listed builds on deck 2, which is the
  // flat — so every new floor file MUST have a row here or it lands on top of your living room.
  // The names are TOWER.md's; the file for floor N is js/home-f<N>.js.
  const DECK_OF = { lobby: 0, lift: 0, corridor: 2 };
  for (let n = 3; n <= FLOORS - 1; n++) DECK_OF['f' + n] = n;
  DECK_OF.roof = FLOORS;
  const A = {
    DECK, MAT, col, G, C, M, LOBBY, CORR, FLAT, LIFT, LIFT_B,
    // The car, for js/home-lift.js. `floor` is the top of the car's own floor slab measured off
    // `y0`, and `front`/`back`/`side` are the inside faces, so a fit-out never has to re-derive
    // them from the wall thicknesses: inside is x CAR.x ± CAR.side, z CAR.front .. CAR.back.
    // `doorH` and `ceil` are here so js/home-lift.js can hang its returns and its transom off the
    // opening rather than off a number it copied. The whole of that file is now derived from this
    // object — it had drifted 0.35 m in z, 0.07 in y and 0.20 in door width by being written in
    // literals, and the only way that does not happen again is for there to be no literals.
    CAR: { x: CARX, z: CARZ, w: CARW, d: CARD, h: CARH, door: DOORW, doorH: DOORH, y0: DECK[0],
           ceil: CARH - .10, floor: CARFY, side: CARW / 2 - .07, leaf: LEAF_T,
           front: CARZ - CARD / 2 + .080, back: CARZ + CARD / 2 - .070 },
    // Your own front door, in the wall between the corridor and the flat. The shell cuts the
    // opening and hangs the lintel; the 玄关 hangs the leaf on one side and js/home-corridor.js
    // numbers it on the other, and both need the same four numbers rather than a measurement off
    // a comment. `top` is the head in world y, so a builder never has to add DECK[2] to it.
    frontDoor: { x: 3.90, x0: 3.40, x1: 4.40, z: FLAT.z1, w: 1.00, top: DECK[2] + 2.10 },
    get y0() { return deckY(curDeck); },
    get deck() { return curDeck; },
    rail, props, things,
    box, cyl, ball, taper, wall, flat,
    // The doll's-house split (js/build.js `partitionSplit`). Forwarded straight through — it is
    // pure arithmetic over the piece heights and the caller's own `make`, so it needs nothing
    // from this file, not even `y0`: a floor passes the base y it already has.
    partition: B.partition,
    cap: capsule,
    glyph: (x, y, z, yaw, text, o = {}) => B.glyphs(x, y, z, yaw, text, o),
    flatText,
    th: thing,
    light: B.light,
    // Downloaded meshes, forwarded the same way `light` is. Build.scene has always had `model`
    // and the standalone scenes (js/diner.js) use it, but it was never put on this object, so a
    // FlatFit room could only build out of primitives. It takes world y like every other builder
    // here, which means a caller passes `A.y0 + h` and not a floor-relative height.
    model: B.model,
    // A model replacement must keep a code-native visual when its download is absent or rejected.
    // Forward the paired helper too so floor fit-outs can use the same fail-safe seam as rooms.
    modelOr: B.modelOr,
    glow,
    // `rug` lays its quads at a hardcoded world y of 0.005, so on any deck above the ground it
    // draws the rug in the lobby. Wrapped rather than fixed in js/build.js because every other
    // scene in the game is single-storey and relies on the flat-zero behaviour.
    rug: (x, z, w, d, bands, fringe) => {
      const y = deckY(curDeck);
      if (!y) return B.rug(x, z, w, d, bands, fringe);
      const n = props.length;
      B.rug(x, z, w, d, bands, fringe);
      for (let i = n; i < props.length; i++) {
        props[i].m = M.mul(M.trans(0, y, 0), props[i].m);
        props[i].cy = props[i].m[13];
        if (props[i].ob) props[i].ob.y += y;
      }
    },
    ceiling,
    stop: (x0, x1, z0, z1, f) => stopAt(f === undefined ? curDeck : f, x0, x1, z0, z1),
    // The shell builds the real landing on every deck — doors, surround, indicator, call panel,
    // moving leaves and an opening collider. This flag remains part of the floor-toolkit contract
    // so a new or older fit-out can decline its fallback; the obsolete floor-owned fallbacks and
    // their A.props scans have been removed from the maintained decks.
    shellLanding: true,
    // ---- what a floor above the second needs from the shell, and nothing more.
    //
    // `zone` is the walkable rectangle for the deck being built — `clampMove` keeps the body inside
    // the union of these, so a floor with no zone is a floor you cannot stand on and `setFloor`
    // refuses it. `id` is what `roomAt` hands back, so it is also what names the room's lamp.
    // `deckH` is the room-box height `R.setRoom` uses on that deck; leave it and the corridor's is
    // assumed. Both default to the deck currently being built, which is the one you want.
    zone(q, f) {
      const d = f === undefined ? curDeck : f;
      const r = { id: q.id || ('deck' + d), x0: q.x0, x1: q.x1, z0: q.z0, z1: q.z1,
                  light: q.light || [(q.x0 + q.x1) / 2, deckY(d) + 2.30, (q.z0 + q.z1) / 2],
                  ceil: q.ceil !== undefined ? q.ceil : deckY(d) + CORR.h - .04,
                  near: q.near };
      (ZONE[d] || (ZONE[d] = [])).push(r);
      return r;
    },
    deckH: (h, f) => { DECK_H[f === undefined ? curDeck : f] = h; },
    STOREY, FLOORS,
    shade: (x, z, w, d, a = .42, y) => shade(x, z, w, d, a, y === undefined ? deckY(curDeck) + .020 : y),
    mover, emitter, fader,
    steam: steamRig,
    rides,
    dial: (x, y, z, yaw, hands) => { const d = { x, y, z, yaw, hands }; dials.push(d); return d; },
    sky: p => { skyGlass.push(p); return p; },
    timed,
    parcel, locker, liftNotice,
    city: (layer, p) => { city[layer].push(p); return p; },
    // Five numbers, or the record itself — `A.setWin({x, y, z, hw, hh})` reads so naturally that
    // js/home-living.js wrote it that way, and the five-argument form quietly stored the whole
    // object as `WIN.x`. game.js line 7 hands `World.WIN.x` straight to `R.setWindow`, so what
    // that produced was not an error but a daylight shaft aimed at NaN. Both forms are taken.
    // `n` is the sixth number and the whole point of the registry: the outward normal, the
    // direction daylight travels coming in. Omit it and the opening faces -z, which is where every
    // window in this building faced when there was only one of them — so a north room and a south
    // room have to differ here or they cannot differ at all.
    setWin(x, y, z, hw, hh, n) {
      const w = (x && typeof x === 'object') ? x : { x, y, z, hw, hh, n };
      // The legacy record is the *flat's* window and nothing else. game.js line 7 hands it to
      // `R.setWindow` at boot, before a single deck has been built, and APARTMENT.md documents it
      // as the 客厅's. An eleventh-floor bedroom declaring its own opening must not move it, or
      // the room that owns the contract loses it to whichever storey happened to build last.
      if (curDeck === 2) {
        WIN.x = w.x; WIN.y = w.y; WIN.z = w.z; WIN.hw = w.hw; WIN.hh = w.hh; winSet = true;
      }
      // Copied, not referenced: a builder that keeps its own record and edits it later would
      // otherwise change what the renderer is told on the next re-apply, silently and a frame late.
      WINS.push({ x: w.x, y: w.y, z: w.z, hw: w.hw, hh: w.hh, n: w.n, shade: w.shade });
    },
    lamp(shade_, bulb, c) { lamp.shade = shade_; lamp.bulb = bulb; if (c) lamp.bulbC = c; },
    tv(p) { tvGlow = p; return p; },
    bagSpot(hz, py, en, x, y, z) { bagSpots.push({ hz, py, en, at: [x, y, z] }); },
  };

  // Per-room footprints, filled in by `build` below and exported for the partition work. See the
  // note at the call site for why they are centres and not extents.
  const roomBoxes = {};

  // ---------------------------------------------------------------- the eye, and the partitions
  //
  // `A.stop` stops the body. Nothing in this building has ever stopped the CAMERA: measured with
  // `grep -c "blocker(" js/world.js js/home-*.js`, all 23 files return 0. Every surface in this
  // renderer is single-sided, so an eye that slides through a partition does not go dark, it
  // renders the neighbouring room — which is the owner's report, "when I spin the camera I can see
  // some of the other rooms", and why the 书房's plaster carried a smear of the bookshelf and the
  // bedroom furniture under its certificates.
  //
  // THE SHELL, AND DELIBERATELY NOT THE PARTITIONS. Blocking the interior partitions was tried
  // first and is wrong for this flat, measured rather than argued: `camNear` (js/home-walls.js:570)
  // asks for 1.90 m of orbit in the 书房, and the 书房 is 1.20 m wide. The flat's camera is
  // *designed* to sit outside a room's own partitions with the cutaway hiding them — so a blocker
  // on those partitions confines the eye to a 1.06 m slot and collapses the orbit to about 0.48 m
  // (0.60 m to the wall, less the pad, less the 0.05 back-off). Rendered at the owner's own angle
  // that is a camera inside the desk. `.camsweep.js` still passed it — 11/11 smooth, doorways
  // 0.0391 m/frame — because the collapse is smooth, not stepped, which is exactly the kind of
  // regression a smoothness check cannot see. Do not reintroduce it.
  //
  // The shell has no such conflict: the flat is 12.0 × 8.2 m and the widest orbit is 2.97 m, so
  // stopping the eye at the outer walls never shortens an orbit any room actually asks for. These
  // five rectangles mirror the shell's own body colliders below one for one, including the split
  // either side of the front door, so the eye and the feet agree about where the building is.
  //
  // Two fields on each record are the reason build.js's own `blocker()` is not used:
  //
  //   `bot`  — the deck floor. Twelve storeys share one (x, z) footprint, so a scene-global
  //            blocker over the flat's shell would block the eye on all twelve of them.
  //            game.js's `cameraBlockLimit` treats a missing `bot` as "everywhere", which is what
  //            every outdoor building mass in the game wants and still gets.
  //   `pad`  — 0.05, not the 0.4 the outdoor masses use. At 0.4 the 1.00 m front door leaves the
  //            camera a 0.20 m slot and the dolly out onto the landing reads as sealed.
  //
  // Idempotent, because `build()` is not guaranteed to run once.
  function camBlockFlat() {
    const bl = B.blockers;
    for (let i = bl.length - 1; i >= 0; i--) if (bl[i].flatPart) bl.splice(i, 1);
    const Y = DECK[2], FD = A.frontDoor;
    const put = (x0, x1, z0, z1, bot, top) =>
      bl.push({ x0, x1, z0, z1, top, bot, pad: .05, flatPart: true });
    // North: the corridor wall, cut for your own front door. Above the head it closes again, or a
    // risen eye goes over the lintel into the lift landing.
    put(-RX, FD.x0, FLAT.z1, FLAT.z1, Y, H);
    put(FD.x1, RX, FLAT.z1, FLAT.z1, Y, H);
    put(FD.x0, FD.x1, FLAT.z1, FLAT.z1, FD.top, H);
    // South, and the two sides — which run the full depth, so the corridor is enclosed too.
    put(-RX, RX, FLAT.z0, FLAT.z0, Y, H);
    put(-RX, -RX, FLAT.z0, CORR.z1, Y, H);
    put(RX, RX, FLAT.z0, CORR.z1, Y, H);
  }

  // ================================================================ the build
  function build() {
    buildShell();
    // Every room that has registered itself, in its own file, on its own deck. A builder that is
    // still an empty stub costs nothing; a builder that throws would take the whole game down, so
    // it is not allowed to — one bad room is one missing room.
    const made = {};
    // `walls` last, always. js/home-walls.js lays its partitions between the rooms *as they were
    // actually built* — it reads `roomBoxes`, which do not exist until every other room has run —
    // and a partition built before the furniture would be measured against nothing. Explicit
    // rather than relying on the order of the script tags in index.html, because that order is not
    // this file's to depend on.
    const order = Object.keys(FlatFit).filter(k => k !== 'walls');
    if (FlatFit.walls) order.push('walls');
    for (const k of order) {
      curDeck = DECK_OF[k] === undefined ? 2 : DECK_OF[k];
      const mark = markBuild();
      try { FlatFit[k](A); } catch (e) { console.error('FlatFit ' + k + ': ' + (e && e.message)); }
      made[k] = props.length - mark.p;
      // ---- stamp the deck onto every prop this room made.
      //
      // Twelve floors share one (x, z) footprint, and `hiddenProp` in js/game.js culls on x and z
      // only — so before this, every deck's geometry was drawn on every other deck. Measured from
      // deck 10: 822 props belonging to that floor and 15,136 belonging to other floors in the same
      // draw list, none of them translucent. What that looks like is a pale second building smeared
      // through the one you are standing in, and it costs twelve times the geometry per frame.
      //
      // `-1` means never cull: anything handed to `rides` travels with the lift car and has to stay
      // visible while the car passes decks it does not belong to. Shell props are left undefined,
      // which also means never cull — the building's own envelope is everybody's.
      for (let i = mark.p; i < props.length; i++)
        if (props[i].deck === undefined) props[i].deck = curDeck;
      for (let i = mark.t; i < things.length; i++)
        if (things[i].deck === undefined) things[i].deck = curDeck;
      // ------------------------------------------------------------ where the room actually is
      //
      // The footprint of everything the room just built, in x and z. Nothing in the game reads
      // this; it exists because the flat has no interior walls and the partitions have to be laid
      // *between* the rooms as they were actually built rather than where a plan says they are.
      // A wall placed by fiat goes through somebody's bed — which is exactly how the 主卧 ended up
      // in the lobby — so the plan is derived from these boxes and then checked back against them.
      //
      // Real extents, not centres. Centres were tried first and are not good enough to lay a wall
      // against: the 主卧's southernmost prop *centre* and the 次卧's northernmost are 0.07 m
      // apart, which says nothing at all about whether a 0.10 m partition between them would go
      // through a wardrobe. Every mesh in this renderer is built on ±0.5, so the world-space
      // half-extent of a prop is the sum of the absolute row terms of its matrix — the standard
      // AABB of a transformed unit cube, and correct for a rotated prop as well as an axis-aligned
      // one.
      if (made[k] > 0) {
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (let i = mark.p; i < props.length; i++) {
          const m = props[i].m;
          const hx = .5 * (Math.abs(m[0]) + Math.abs(m[4]) + Math.abs(m[8]));
          const hz = .5 * (Math.abs(m[2]) + Math.abs(m[6]) + Math.abs(m[10]));
          if (m[12] - hx < x0) x0 = m[12] - hx;
          if (m[12] + hx > x1) x1 = m[12] + hx;
          if (m[14] - hz < z0) z0 = m[14] - hz;
          if (m[14] + hz > z1) z1 = m[14] + hz;
        }
        // `p0`/`p1` index back into `props`, so a partition plan can ask which *individual* prop
        // it would go through rather than only whether it clips the room's box. The box always
        // touches the wall — a room's floor quad spans the room — so the aggregate cannot tell a
        // rug from a wardrobe and the per-prop list is the only thing that can.
        roomBoxes[k] = { x0, x1, z0, z1, n: made[k], deck: curDeck, p0: mark.p, p1: props.length };
      }
      // ------------------------------------------------------------ the deck a room came out on
      //
      // The note at the top of this file says y is world y and a room on your floor builds at
      // `A.y0 + h`. Some of them do not: js/home-bedroom.js never reads `A.y0` at all and builds
      // its bed, its wardrobe and its 衣柜 rail at y 0 — which is not three metres up in the flat,
      // it is standing in the middle of the lobby, on the stone, in front of the letterboxes. The
      // first render of this lobby had a double bed in it.
      //
      // So the shell checks, because the shell is the only thing that knows which deck the room
      // was called for. The test is unambiguous rather than clever: a room built correctly on
      // DECK[2] has *something* above DECK[2] — its own floor, at worst, four millimetres up. A
      // room whose entire output sits below its own deck was written floor-relative, and the whole
      // of it is lifted by exactly one deck, which is the same post-pass `liftLegacy` has always
      // used on the old flat.
      //
      // This is a rescue and not a feature. It says so out loud every time it fires, it costs
      // nothing when nobody needs it, and it stops firing the moment the room reads `A.y0`.
      const dy = deckY(curDeck);
      if (dy > 0 && made[k] > 0) {
        let top = -Infinity;
        for (let i = mark.p; i < props.length; i++) if (props[i].m[13] > top) top = props[i].m[13];
        if (top < dy) {
          console.warn('World: FlatFit ' + k + ' built floor-relative — everything it made is '
            + 'below y ' + dy.toFixed(2) + ', which is the lobby. Lifted a deck; the fix is in '
            + 'js/home-' + k + '.js, which should read A.y0 and build at A.y0 + h.');
          liftBuild(mark, dy);
        }
      }
    }
    // ---- the shaft is the shell's, and nobody else's.
    //
    // For as long as `buildShafts` only ran on decks 0 and 2, every floor above the second built a
    // stand-in landing — and with it a stand-in COLLIDER across the shaft mouth, which is static
    // and never opens. Now that the shell builds a real landing on every deck those stand-ins seal
    // the car shut: measured by riding to all twelve decks and walking the body out, the floors
    // that still had one could not be left at all. The body stopped 0.15 m from the middle of the
    // car with the doors standing wide open.
    //
    // Gating the geometry in each file is right and has been done where the block was cleanly
    // delimited, but the colliders are scattered through those files and cutting them out by hand
    // risks nine working floors. So the shell asserts what is now true: it owns the shaft, and any
    // collider inside the shaft mouth that is not its own is left over from when it did not.
    // `rec.shaft` marks the shell's, including the door stop that opens with the doors.
    for (const f of SHAFT_DECKS) {
      const list = SOL[f]; if (!list) continue;
      for (const sh of [LIFT, LIFT_B]) {
        for (let i = list.length - 1; i >= 0; i--) {
          const s = list[i];
          if (s.shaft) continue;
          // wholly inside the shaft footprint, with a little tolerance for a stand-in built proud
          if (s.x0 > sh.x0 - .16 && s.x1 < sh.x1 + .16 && s.z1 > sh.z0 - .12 && s.z0 < sh.z1 + .12)
            list.splice(i, 1);
        }
      }
    }
    camBlockFlat();
    curDeck = 2;
    // The old flat, if the ten rooms have not furnished the new one yet. See the note over
    // `buildLegacyFlat`: this is the thing that keeps the game playable while they are written,
    // and it takes itself out of the build the moment they are.
    //
    // This decision has already broken the game once, and the way it broke is worth writing down.
    // The count below says "the rooms have furnished the flat", and it was allowed to mean "so
    // everything the old flat used to provide is provided". It is not the same statement. The old
    // builder was also the only source of `World.rail`, `World.WIN` and the 袋子 — three things
    // game.js reads by name — and dropping it dropped those with it. So the count now decides one
    // thing only, which is whether to build furniture, and the three contracts are each settled
    // separately below: the window falls back to its contract position, the rail is reported
    // missing rather than faked, and the bag is built by the shell whichever way this goes.
    const FLATROOMS = ['entry', 'living', 'dining', 'kitchen', 'bedroom', 'second', 'bath'];
    const furnished = FLATROOMS.reduce((n, k) => n + (made[k] || 0), 0);
    if (furnished < 500) {
      const mark = markBuild();
      buildLegacyFlat();
      liftLegacy(mark);
    } else {
      // The rooms are in. Say out loud which of the old flat's contracts nobody picked up, because
      // the symptom of each of these is a bug three files away — a daylight shaft through a blank
      // wall, a wardrobe that changes nothing — and not an error here.
      if (!winSet) console.warn('World: no room called A.setWin. World.WIN is the 客厅\'s; ' +
        'standing at the APARTMENT.md contract position until it takes it.');
      if (!rail.length) console.warn('World: nothing on A.rail. World.rail is the 主卧\'s; ' +
        'the wardrobe has no clothes in it until it fills it.');
    }
    // The flat's own opening goes in unless a room on deck 2 has already put one there. `winSet`
    // and not `WINS.length` is the test, and the difference is the whole bug it avoids: an
    // eleventh-floor bedroom registering a window would otherwise leave the flat with no opening
    // of its own, and the renderer picks the *nearest* — so the 客厅 would be lit through a
    // bedroom nine storeys up. On a build where nobody has declared anything this is the only
    // entry, and a registry of one is the same thing as the single window gl.js already had: its
    // `addWin` copies a lone entry straight into the legacy uniforms, and the -z normal it
    // defaults to is exactly what the five-argument `R.setWindow` sets. So today this changes
    // nothing, and the multi-window path is the only path rather than a second one lying dormant.
    if (!winSet) WINS.push({ x: WIN.x, y: WIN.y, z: WIN.z, hw: WIN.hw, hh: WIN.hh });
    // The 袋子, which is the shell's and not any one room's: it is delivered to the flat from
    // outside it, it moves between rooms, and `game.js` holds a reference to the label. A room
    // contributes a *surface* with `A.bagSpot`; the bag itself is built here so that
    // `World.bagThing` is never null however many rooms happen to be written on a given day.
    if (!bagThing) buildBag();
    // Walkable space, per deck. One rectangle each and the rooms carve them with `A.stop`, which
    // is how a plan with ten rooms in it stays a plan and not thirty overlapping boxes.
    ZONE[0].push({ id: 'lobby', x0: LOBBY.x0, x1: LOBBY.x1, z0: LOBBY.z0, z1: LOBBY.z1,
                   light: [0, LOBBY.h - .34, .40], ceil: LOBBY.h - .06 });
    ZONE[0].push(carZone);
    const y2 = DECK[2];
    // `near` is the orbit limit the camera eases to, the same field the car declares above. The
    // ten partitioned rooms get theirs from `camNear` in js/home-walls.js; these two are the
    // deck's own zones and had none, so the eye sat wherever the player's wheel had left it —
    // 4.40 m by default and 6.80 m at full zoom out, in a corridor whose west wing is 1.30 m of
    // standing room. That is a camera parked two flats away looking at a strip of floor.
    //
    // 'main' is the flat-wide fallback `roomAt` returns when no partitioned room claims the body,
    // which today is a 4 cm sliver at z 1.61..1.65 and the first frame after a spawn. It takes the
    // 客厅's number so that frame is not a jump cut.
    //
    // 'corr' is 2.20: far enough back through a 1.30 m wing's wall to see the whole figure and the
    // wing it is standing in — the walls between are single-sided and the cutaway takes them — and
    // near enough that the lift lobby end does not read as a corridor seen from the next building.
    // Both are under the 3.00 m WALL_MIN in js/game.js, so both also opt out of `clearWall`, which
    // is the point: a 3 m deep box was stepping the eye 1.96 m every time the player panned past
    // its long walls (.camsweep.js).
    // 513. lookY 1.10 is chest height and it is right in a room with 3 m of head clearance.
    // These two have 2.60, and an eye 2.2-2.9 m back aimed at 1.10 spends the top of the frame
    // on ceiling. 1.02 is 8 cm, deliberately small: enough to buy the ceiling back, not enough
    // to be a different camera. Read per frame in js/game.js beside room.near and eased on the
    // same curve, so a doorway between a declared room and an undeclared one is not a cut.
    ZONE[2].push({ id: 'main', x0: FLAT.x0, x1: FLAT.x1, z0: FLAT.z0, z1: FLAT.z1,
                   light: [0, y2 + FLAT.h - .40, -.20], ceil: y2 + FLAT.h - .06, near: 2.90,
                   lookY: 1.02 });
    // 509. The corridor walks the full 12.00 x 3.00 m plate, but the two shafts own z 4.90..6.20
    // across the middle of it, so the strip a body can stand on in front of the doors is
    // CORR.z0..LIFT.z0. hiddenAt was measuring its hide band off 1.30 m of rectangle nobody can
    // occupy, which put the band inner edge behind the player instead of in front of them. The
    // cut box is the cutaway box and nothing else: clampMove still gets the full plate, so where
    // the body may walk does not change. Derived from the shell own LIFT box rather than
    // re-measured, because js/home-corridor.js:14 and lane 5 disagree by 1.20 m and item 510 is
    // still open on which of them is right.
    ZONE[2].push({ id: 'corr', x0: CORR.x0, x1: CORR.x1, z0: CORR.z0, z1: CORR.z1,
                   light: [0, y2 + CORR.h - .34, 4.10], ceil: y2 + CORR.h - .06, near: 2.20,
                   lookY: 1.02,
                   cut: { x0: CORR.x0, x1: CORR.x1, z0: CORR.z0, z1: LIFT.z0 } });
    // The doorway itself, so a body standing in the flat and a body standing in the corridor are
    // in one walkable region rather than two that touch.
    // 508. It was the one deck-2 zone with no orbit limit, so the first frame roomAt ever does
    // return it the eye jumps to the 12 m default for the width of a doorway. 2.20 is the
    // corridor limit, the tighter of the two rooms it joins: a doorway is never the place to
    // open the shot out.
    ZONE[2].push({ id: 'gap', x0: 3.40, x1: 4.40, z0: FLAT.z1 - .70, z1: FLAT.z1 + .70,
                   light: [3.90, y2 + CORR.h - .34, 3.60], ceil: y2 + CORR.h - .06,
                   near: 2.20, lookY: 1.02 });
    ZONE[2].push(carZone);
    // The inside of the car is its own room on EVERY deck it can reach, not just the two it used
    // to. Without this `roomAt` hands the car the corridor's lamp and the corridor's cutaway box
    // the moment you ride above the second floor.
    for (const f of SHAFT_DECKS) if (f !== 0 && f !== 2) ZONE[f].push(carZone);
    deckDecals();
    setFloor(2);
    if (!bagSpots.length) bagSpots = LEGACY_BAG;
  }
  let LEGACY_BAG = [];

  // ---------------------------------------------------------------- the 袋子
  //
  // The takeaway bag, when the old flat is no longer the thing that makes it. It is one white
  // carrier with a red band and the handles knotted over the top, which is how nearly every meal
  // in this city arrives, and it is moved between surfaces by the `bag` mover rather than rebuilt:
  // `setBag(i)` drives that mover to `i + 1` and slides the whole body to `bagSpots[i]`.
  //
  // It is built at the first spot, so `bagSpots[0]` is its rest position and every other spot is
  // an offset off it. If no room has offered a surface at all it gets one: the floor just inside
  // the front door, which is where a delivery actually ends up in a flat where the shoes come off.
  function buildBag() {
    if (!bagSpots.length)
      bagSpots.push({ hz: '门口', py: 'ménkǒu', en: 'by the door',
                      at: [3.90, DECK[2] + .014, 2.78] });
    const h = bagSpots[0].at, T = { tag: '袋子' };
    const body = [
      box(h[0], h[1] + .105, h[2], .235, .21, .155, col.white, { ...T, gloss: .30 }),
      box(h[0], h[1] + .085, h[2], .242, .055, .162, col.red, { ...T, hard: true, gloss: .30 }),
      capsule(h[0], h[1] + .245, h[2], .042, .075, .042, col.white, { ...T, hard: true, gloss: .28 }),
      // Something in it: a soup tub's red lid clear of the rim on one side, a paper carton corner
      // on the other, and a pair of chopsticks standing out of the carton.
      cyl(h[0] - .055, h[1] + .222, h[2] + .012, .052, .020, C('#d94f36'), { ...T, gloss: .34 }),
      box(h[0] + .072, h[1] + .200, h[2] - .020, .070, .100, .070, col.cream,
        { ...T, hard: true, gloss: .24 }),
      capsule(h[0] + .066, h[1] + .300, h[2] - .026, .006, .170, .006, C('#d8c9a8'), { ...T, rz: .26, ry: .5 }),
      capsule(h[0] + .080, h[1] + .298, h[2] - .014, .006, .165, .006, C('#d8c9a8'), { ...T, rz: .20, ry: .7 }),
    ];
    // Off the bottom of the world at 0, which is `setBag(-1)` — carried, or never ordered.
    mover('bag', body, v => {
      const s = bagSpots[Math.round(v) - 1];
      return s ? M.trans(s.at[0] - h[0], s.at[1] - h[1], s.at[2] - h[2]) : M.trans(0, -60, 0);
    });
    bagThing = thing('袋子', h[0], h[1] + .34, h[2],
      '袋子里是我的外卖。', 'My delivery is in the bag.',
      'A 袋子 is any bag. 塑料袋 is the plastic one this is.',
      { focus: [h[0], h[2]], reach: 1.4 });
  }

  // ---------------------------------------------------------------- lifting the old flat
  //
  // Everything the legacy build made, moved onto DECK[2]. The 12 mm is not slop: the flat's own
  // floor slab is already laid at DECK[2] + 4 mm, and two floors at the same height are two
  // surfaces fighting for the same pixels across seventy square metres.
  //
  // Six kinds of thing remember where they were and all six have to be told. Props and shadows
  // and glows carry a matrix; a thing's label and a prop's pick box carry a bare y; a light and
  // a clock face and a steam source carry their own coordinates; and a hinge carries a pivot,
  // which is conjugated rather than translated — the door still swings about its own edge, that
  // edge is simply three metres higher than it was.
  const LEG = DECK[2] + .012;
  // Where the build had got to. Six kinds of thing remember where they were and all six have to
  // be told, so the mark records one index each rather than a props count.
  const markBuild = () => ({
    p: props.length, t: things.length, s: shadows.length, g: glows.length,
    l: B.lights.length, d: dials.length, so: solids.length,
    k: Object.keys(parts).length, st: Object.keys(steam).length, b: bagSpots.length,
  });
  // Everything made since `m`, moved up by `dy`. Solids move deck rather than height: a collider
  // is a footprint in (x, z) and it belongs to whichever floor's list is live.
  function liftBuild(m, dy) {
    const T = M.trans(0, dy, 0), Ti = M.trans(0, -dy, 0);
    for (let i = m.p; i < props.length; i++) {
      const p = props[i];
      p.m = M.mul(T, p.m);
      if (p.ob) p.ob.y += dy;
    }
    for (let i = m.t; i < things.length; i++) things[i].pos[1] += dy;
    for (let i = m.s; i < shadows.length; i++) shadows[i].m = M.mul(T, shadows[i].m);
    for (let i = m.g; i < glows.length; i++) glows[i].m = M.mul(T, glows[i].m);
    for (let i = m.l; i < B.lights.length; i++) B.lights[i].y += dy;
    for (let i = m.d; i < dials.length; i++) dials[i].y += dy;
    const added = solids.splice(m.so);
    for (const s of added) SOL[2].push(s);
    const keys = Object.keys(parts);
    for (let i = m.k; i < keys.length; i++) {
      const q = parts[keys[i]], f = q.mat;
      for (const it of q.items) { it.m0 = M.mul(T, it.m0); if (it.ob) it.ob.y += dy; }
      q.mat = (v, j, m0) => M.mul(T, M.mul(f(v, j, m0), Ti));
      q.v = -1;
    }
    const sk = Object.keys(steam);
    for (let i = m.st; i < sk.length; i++) steam[sk[i]].at[1] += dy;
    for (let i = m.b; i < bagSpots.length; i++) bagSpots[i].at[1] += dy;
  }
  function liftLegacy(m) {
    liftBuild(m, LEG);
    LEGACY_BAG = bagSpots.slice();
    if (!winSet && legacyWin) {
      WIN.x = legacyWin.x; WIN.y = legacyWin.y + LEG; WIN.z = legacyWin.z;
      WIN.hw = legacyWin.hw; WIN.hh = legacyWin.hh;
    }
  }

  // ================================================================ the old single-room flat
  //
  // Everything from here to the end of `buildLegacyFlat` is the flat as it was before there was a
  // building round it: one room 7.0 × 5.5, a bathroom off it, and the forty-five labelled objects
  // the whole game is written against. It is still here, and still runs, for one reason — the ten
  // rooms of APARTMENT.md are being written in ten other files at the same time as this one, and
  // a flat with no furniture in it while that happens is a worse thing to ship than a flat with
  // its furniture in the wrong plan.
  //
  // It is built where it always was and then lifted onto DECK[2] by `liftLegacy` below, which is
  // a post-pass over the props, things, shadows, glows, lights, dials, steam and hinges it made.
  // Every one of its constants is local to it, so the outer RX/RZ/H can describe the building.
  //
  // It steps aside on its own: `build` counts what the seven flat-room builders produced and does
  // not call this at all once they have furnished the place. Nothing to remove by hand, and no
  // window in which the flat is empty.
  function buildLegacyFlat() {
    const RX = 3.5, RZ = 2.75, H = 2.72;
    const WIN = { x: -.55, y: 1.45, z: -RZ + .08, hw: .84, hh: .60 };
    // The bathroom is a second room beyond the +x wall, entered through the door that was
    // previously just a panel. It has its own shell, ceiling height and light.
    const BX0 = RX, BX1 = RX + 2.15, BZ0 = .80, BH = 2.46;
    const DZ0 = 1.78, DTOP = 2.08;          // doorway: z DZ0..RZ, up to DTOP
    // The front doorway in the +z wall, and the landing on the other side of it. The opening is
    // cut narrower and lower than the door leaf on purpose — the leaf is .96 by 2.06 and this is
    // .92 by 2.05 — so a shut door overlaps its reveal by two centimetres all round and no slit
    // of the stairwell shows through the gap.
    const FDX = 2.55, FDW = .92, FDTOP = 2.05;
    const LZ0 = RZ, LZ1 = RZ + .86;       // the landing: a boxed half-flight, no deeper than needed
    legacyWin = WIN;
    // ================================================================ shell
    // Surface texture over the shading modes, not instead of them. `mode: 3` still lays out the
    // boards and their seams; the material puts grain inside each one. `matAmt` stays low
    // because the palette was chosen and the texture is here to stop the floor being one flat
    // brown, not to repaint it whatever colour the photograph happened to be.
    // Three numbers here were wrong when first written, and every one of them was a guess I
    // handed to other people as guidance before checking it:
    //
    //   `matScale` was 2.3 on the walls. On a 2.5 m wall that makes each trowel swirl over a
    //   metre across, which reads as damp rather than plaster. 0.65 is hand-sized.
    //
    //   `matAmt` assumed the shader's `t / 0.22` left brightness alone. It does not: these maps
    //   average well above mid grey, so wood lifts the surface 1.7x and plaster 2.3x. The
    //   amounts below are pulled back to compensate until that divisor is fixed properly.
    //
    //   `nrmAmt` defaulted to 1, and for plaster and fabric the normal map *is* the material —
    //   their colour maps are nearly flat. At full strength a large wall picks up relief the AO
    //   pass then turns into clouds, which is indistinguishable from the renderer's own AO
    //   artifact until you A/B it with the material removed.
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor,
      { mode: 3, gloss: .25, mat: 'wood', matScale: 1.15, matAmt: .30, nrmAmt: .35 });
    props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    wall(0, H / 2, -RZ, RX * 2, H, 0, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    // The +z wall comes in three pieces, because the front door now opens onto somewhere. Until this
    // the wall was continuous and the doorway was plugged by a solid slab of wood: the dark panel
    // built to be "the stairwell beyond" sat *inside* that slab and had never been visible, so what
    // an open front door actually showed was a blank brown board.
    wall((-RX + FDX - FDW / 2) / 2, H / 2, RZ, FDX - FDW / 2 + RX, H, Math.PI, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    wall((RX + FDX + FDW / 2) / 2, H / 2, RZ, RX - FDX - FDW / 2, H, Math.PI, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    wall(FDX, (FDTOP + H) / 2, RZ, FDW, H - FDTOP, Math.PI, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    wall(-RX, H / 2, 0, RZ * 2, H, Math.PI / 2, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    // the +x wall is interrupted by the bathroom doorway, so it comes in two pieces
    wall(RX, H / 2, (-RZ + DZ0) / 2, DZ0 + RZ, H, -Math.PI / 2, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    wall(RX, (DTOP + H) / 2, (DZ0 + RZ) / 2, RZ - DZ0, H - DTOP, -Math.PI / 2, col.wall, { mode: 4, mat: 'plaster', matScale: .65, matAmt: .20, nrmAmt: .25 });
    for (const [x,y,z,sx,sy,sz] of [
      [0,.065,-RZ+.045,RX*2-.02,.13,.065],
      // The skirting on the +z wall stops either side of the front doorway now instead of running
      // straight across the threshold, which is what it did while the doorway was a solid panel.
      [(-RX+.01 + FDX-FDW/2)/2,.065,RZ-.045,FDX-FDW/2 + RX-.01,.13,.065],
      [(FDX+FDW/2 + RX-.01)/2,.065,RZ-.045,RX-.01 - FDX-FDW/2,.13,.065],
      [-RX+.045,.065,0,.065,.13,RZ*2-.02], [RX-.045,.065,(-RZ+DZ0)/2,.065,.13,DZ0+RZ-.02],
    ]) box(x,y,z,sx,sy,sz,col.trim,{ hard:true, gloss:G.wood });

    // ================================================================ 窗户 window
    const wx = WIN.x, wy = WIN.y, wz = WIN.z;
    // Sky backdrop at the very back of the recess; the skyline is layered in front of it.
    skyGlass.push(box(wx, wy, wz - .025, 1.70, 1.24, .020, col.sky, { hard:true, mode:1, glow:.05 }));
    // Frame, bars and sill all wear the 窗户 tag. They carried none, which meant no prop in the room
    // answered to the word: a ray fired at the window went straight past it to the wall behind, so
    // 开窗户 could only ever be reached by clicking its floating label and never the window itself.
    for (const [x,y,sx,sy] of [
      [wx-0.88,wy,.09,1.42], [wx+0.88,wy,.09,1.42], [wx,wy+.665,1.84,.09], [wx,wy-.665,1.84,.09],
      [wx,wy,.055,1.24], [wx,wy,1.70,.055],
    ]) box(x,y,wz+.045,sx,sy,.08,col.white,{ tag:'窗户', hard:true, gloss:G.paint });
    box(wx, wy-.735, wz+.10, 1.94, .10, .26, col.white, { tag:'窗户', gloss:G.paint });
    // Things on the sill. A two-metre shelf in the brightest part of the room was empty, which is
    // the one place in a flat that never is: spring onions rooting in a pot because they were
    // cheaper by the bunch, and a saucer of 橘子 going soft in the sun. Set at the right-hand end,
    // clear of both the bedside table below and the casement that swings in over the left half.
    cyl(.14,.822,-2.57,.062,.115,C('#9c6a4a'),{ gloss:.20 });
    cyl(.14,.876,-2.57,.066,.016,C('#8a5a3f'),{ gloss:.20 });
    cyl(.14,.882,-2.57,.052,.012,C('#3a2b22'),{ gloss:G.matte });
    // Blades, not a shrub: each one leans out on its own bearing so the clump reads as growth.
    // Fanned by the golden angle for the same reason the plant's crown is — evenly spaced turns
    // laid the blades in visible pairs.
    for (let i=0;i<7;i++) {
      const a = i*2.399, h = .13 + (i%3)*.045;
      capsule(.14+Math.cos(a)*.022, .888+h/2, -2.57-Math.sin(a)*.022, .011, h, .011,
        C(i%2 ? '#4b7d43' : '#5f9a4c'), { ry:a, rz:Math.cos(a)*.28, gloss:.22 });
    }
    cyl(-.30,.775,-2.57,.078,.020,col.white,{ gloss:.34 });
    for (const [ox,oz,r] of [[-.028,-.016,.042],[.030,.012,.038],[.004,.034,.034]])
      ball(-.30+ox,.792+r*.55,-2.57+oz,r,r*.86,r,C('#d9853a'),{ gloss:.26 });
    // The left casement actually opens inwards. Closed it reads as the inner pane of a
    // double window; open, the room gets a draught and the hutong gets a little louder.
    // Its frame goes up now and its glass goes in after the city — see the note down there.
    const sash=[
      ...[[-.42,.615,.86,.055],[-.42,-.615,.86,.055],[-.825,0,.055,1.29],[-.015,0,.055,1.29]]
        .map(([dx,dy,sx,sy]) =>
          box(wx+dx,wy+dy,wz+.145,sx,sy,.055,col.white,{ tag:'窗户',hard:true,gloss:G.paint })),
    ];
    // A hazy Beijing skyline in two depth layers: paler and lower at the back so the city
    // recedes into smog, darker and taller at the front. Windows carry a constant dim glow
    // that is washed out by the bright daytime sky but reads clearly once it goes dark.
    let wseed = 8675309;
    const wrnd = () => (wseed = (wseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const skyBase = wy - .66;                 // building bases meet the lower sash bar
    let signHost = null;                      // the tower that gets the rooftop sign
    for (const [layer, bz, tint, hmax] of [[0, wz-.008, '#93a7ba', .34], [1, wz+.001, '#63788c', .70]]) {
      let x = wx - .82;
      while (x < wx + .80) {
        const bw = .085 + wrnd() * .135, bh = .12 + wrnd() * hmax;
        const cx = x + bw / 2;
        city[layer].push(box(cx, skyBase + bh / 2, bz, bw * .97, bh, .012, C(tint), { hard:true, mode:1 }));
        // A flat or pitched roof cap, so the towers are not all identical slabs.
        if (wrnd() > .55) city[layer].push(
          box(cx, skyBase + bh + .015, bz, bw * .55, .03, .012, C(tint), { hard:true, mode:1 }));
        if (layer === 1 && bh > .30)
          for (let ry = skyBase + .09; ry < skyBase + bh - .05; ry += .092)
            for (const c of [-.26, 0, .26]) if (wrnd() > .5)
              city[2].push(box(cx + c * bw, ry, bz + .006, .020, .032, .006,
                C(wrnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard:true, mode:1, glow:.16 }));
        // The tallest tower in the right-hand half of the opening, which is the half no pane of
        // glass is muting: that is where the sign will read from across the room.
        if (layer === 1 && cx > -.40 && (!signHost || bh > signHost.bh)) signHost = { cx, bh, bw, bz };
        x += bw + .012 + wrnd() * .04;
      }
    }
    // A vertical neon sign down the face of it, the way half the towers on the third ring road carry
    // one. Two characters is all that fits and all that is wanted: at three metres through a window
    // this is a hundredth of the frame, and 北京 is a word the atlas is already carrying for the
    // fridge magnet. The characters join the lit-window list so they come up as the sky goes down;
    // the board behind them stays dark, being a board.
    if (signHost) {
      const sw = Math.min(.062, signHost.bw * .72), sy0 = skyBase + signHost.bh - .085;
      box(signHost.cx, sy0, signHost.bz + .004, sw, .130, .006, C('#20242a'),
        { hard:true, mode:1 });
      city[2].push(...B.glyphs(signHost.cx, sy0, signHost.bz + .009, 0, '北京',
        { size:.050, gap:.006, vertical:true, lift:.002, mode:1, glow:.16,
          gloss:G.matte, color:C('#ff8a52') }));
    }
    // The pane, and the handle on it, deliberately built after the city behind them. Transparent
    // props still write depth in this renderer, and drawn before the towers this one pane deleted
    // the whole left half of the skyline: the window read as a sheet of milk with a lit city beside
    // it. Built after, it blends over them — which is what a pane of glass does.
    sash.push(
      box(wx-.42,wy,wz+.145,.80,1.20,.020,col.glass,{ tag:'窗户',hard:true,alpha:.22,gloss:G.glass }),
      capsule(wx-.055,wy-.10,wz+.20,.026,.13,.026,col.steel,{ tag:'窗户',gloss:G.metal }));
    mover('window', sash, v => hingeY(wx-.84, wz+.145, -.86*v));
    // The capsule mesh runs along local Y, so the rail's length belongs in sy and the
    // rz turn lays it flat across the window. With it in sx it became a vertical rod.
    capsule(wx,wy+.79,wz+.15,.035,2.18,.035,col.steel,{ rz:Math.PI/2,gloss:G.metal });
    // Curtains that actually draw. Open they are bunched at the ends of the rail; closed
    // each fold slides in and widens until the two halves meet over the glass.
    for (const side of [-1,1]) {
      const cx=wx+side*.98, folds=[];
      for (let p=-1;p<=1;p++)
        folds.push(box(cx+p*.065,wy+.12,wz+.16,.10,1.28,.10,p===0?col.linen:C('#c9bca9'),
          { tag:'窗帘',mode:7,gloss:G.fabric }));
      capsule(wx+side*1.10,wy+.79,wz+.15,.055,.055,.055,col.steel,{ gloss:G.metal });
      mover(side < 0 ? 'curtainL' : 'curtainR', folds, (v, i, m0) => {
        const x0 = m0[12], tx = lerp(x0, wx + side * (.74 - i * .27), v), s = lerp(1, 3.4, v);
        return M.mul(M.trans(tx, 0, 0), M.mul(M.scale(s, 1, 1), M.trans(-x0, 0, 0)));
      });
    }
    thing('窗帘',wx-1.02,wy+.60,wz+.20,'晚上我拉上窗帘。','At night I draw the curtains.',
      '拉 lā to pull: 拉上 to draw closed, 拉开 to draw open.',{focus:[wx-.9,-RZ+1.0],reach:1.6});
    // The daylight this window throws is built by setSunlight, which tracks the clock.
    // A dim ambient sill glow stays behind so the recess never goes flat.
    glow(M.trs(wx,.02,-RZ+.55,0,2.2,1,.85),C('#ffe4b8'),.10,true);
    thing('窗户',wx,wy+.88,wz+.15,'打开窗户，外面是北京。','Open the window — outside is Beijing.',
      '窗 = window, 户 = door/household. Together: the thing you look through.',{focus:[wx,-RZ+1.0],reach:1.7});

    // ================================================================ doors
    const dx=FDX, dz=RZ-.12;
    // The lining, in four pieces where it used to be one solid 1.14 × 2.22 slab of wood filling the
    // whole doorway. Two jambs, a head and a threshold: each of them overlaps the leaf, so a shut
    // door still shows nothing of the landing, and the middle is now actually open.
    for (const s of [-1,1])
      box(dx+s*(FDW/2+.055),1.08,RZ-.045,.11,2.22,.12,col.woodD,{ hard:true,mode:6 });
    box(dx,(FDTOP+2.19)/2,RZ-.045,FDW+.22,2.19-FDTOP,.12,col.woodD,{ hard:true,mode:6 });
    box(dx,.005,RZ-.045,FDW+.22,.010,.12,col.trim,{ hard:true,gloss:G.wood });
    mover('frontdoor', [
      box(dx,1.04,dz,.96,2.06,.085,col.red,{ tag:'门',gloss:.28 }),
      ...[.55,1.48].map(y => box(dx,y,dz-.052,.72,.63,.022,col.redD,{ tag:'门',hard:true,gloss:.20 })),
      box(dx,1.04,dz-.064,.035,1.88,.018,C('#b84a36'),{ tag:'门',hard:true }),
      capsule(dx-.36,1.02,dz-.11,.055,.13,.055,col.gold,{ rx:Math.PI/2,gloss:G.metal,tag:'门' }),
      ball(dx-.36,1.02,dz-.17,.045,.045,.045,col.gold,{ gloss:G.metal,tag:'门' }),
      // What used to be here was a dark panel described as "the stairwell beyond" — inside the door's
      // own array, so it swung with the leaf, and inside the doorway slab, so it was never drawn. The
      // stairwell is a real place now, a dozen lines down, and it stays still while the door moves.
    ], v => hingeY(dx+.47, dz, -1.15 * v));
    for (const s of [0,1]) box(2.38+s*.18,.04,RZ-.41,.15,.075,.31,C('#3b4858'),{ry:.10-s*.20,mode:7});
    thing('门',dx,2.34,RZ-.28,'我要出门了。',"I'm heading out.",
      'Beyond this door: the hallway, the street, and a city you cannot read yet.',{focus:[dx,RZ-.95],reach:1.6});

    // ---- the landing. Everything here is beyond z = RZ and can only be seen through the open door,
    // which is exactly the moment it is for: the courier stands in this doorway every time you order
    // food, and until now he stood against a blank board. A boxed half-flight rather than a stairwell
    // with real steps in it — the flight itself is off past the handrail, where the camera cannot
    // follow, and building treads nobody can get to is spending props on nothing.
    //
    // It is deliberately dimmer than the room at every hour. The one bright thing in here is a 35%
    // bulb, well under the flat's own pendant, because a bright surface behind a shut door is how the
    // bloom pass was caught laying a ghost of the bathroom across the whole apartment.
    //
    // Tagged 门 so the cutaway takes it away with the door: a camera that has backed out through the
    // +z wall must not be left looking at the inside of a landing it is standing in.
    // The box is a little wider than the opening — its side walls stand at x ±.52 against a .92
    // opening — so that the reveal always hides the corners. Sized flush with the opening instead,
    // a glance in from either side of the doorway found the one-centimetre sliver where the wall
    // piece's culled back face is, and looked through it into nothing.
    const lcz = (LZ0 + LZ1) / 2, land = C('#8e8478');
    box(FDX,-.032,lcz,1.04,.06,LZ1-LZ0,C('#6b6660'),{ tag:'门',hard:true,gloss:.10 });
    box(FDX,1.19,LZ1-.03,1.04,2.44,.06,land,{ tag:'门',hard:true,gloss:.08 });
    for (const s of [-1,1])
      box(FDX+s*.52,1.19,lcz,.06,2.44,LZ1-LZ0,land,{ tag:'门',hard:true,gloss:.08 });
    box(FDX,2.44,lcz,1.04,.06,LZ1-LZ0,C('#6f6a62'),{ tag:'门',hard:true,gloss:.08 });
    // 402 across the landing: the neighbour's door, and the number on it. Facing -z, so its glyphs
    // are laid on with yaw π; a plate facing the other way would be readable only from inside a wall.
    box(FDX+.02,1.02,LZ1-.085,.84,2.04,.05,C('#3f4a3f'),{ tag:'门',hard:true,gloss:.24 });
    box(FDX+.02,1.02,LZ1-.113,.030,1.86,.016,C('#586451'),{ tag:'门',hard:true,gloss:.20 });
    capsule(FDX+.36,1.00,LZ1-.135,.045,.16,.045,col.gold,{ tag:'门',gloss:G.metal });
    // Three digits at .048 span .156, so the plate is .19 across. At .062 they ran off both ends of
    // a .155 plate, which is a number painted on a wall rather than a number on a plate.
    box(FDX+.02,1.66,LZ1-.117,.190,.095,.008,C('#cdc5b2'),{ tag:'门',hard:true,mode:1 });
    B.glyphs(FDX+.02,1.66,LZ1-.122,Math.PI,'402',
      { size:.048,gap:.006,color:C('#2f3a33'),mode:1,gloss:G.matte,lift:.004,tag:'门' });
    // The handrail down one side, which is all that says the stairs are that way.
    for (const oz of [LZ0+.16,LZ1-.20])
      capsule(FDX-.44,.52,oz,.020,1.00,.020,C('#5c5751'),{ tag:'门',gloss:.30 });
    capsule(FDX-.44,1.00,lcz,.026,LZ1-LZ0-.24,.026,col.woodD,
      { rx:Math.PI/2,tag:'门',gloss:G.wood });
    box(FDX-.30,2.40,lcz-.06,.16,.05,.16,C('#ffe3b0'),{ tag:'门',hard:true,mode:1,glow:.35 });
    glow(M.trs(FDX-.06,.02,lcz+.04,0,.86,1,.78),C('#ffdcae'),.15);

    // The bathroom door now stands open: jamb and lintel frame a doorway you walk through,
    // and the panel is folded back against the wall on the bathroom side.
    const bz = (DZ0 + RZ) / 2;
    box(RX-.015,1.03,DZ0-.05,.17,2.06,.13,col.woodD,{ hard:true,mode:6 });
    box(RX-.015,DTOP+.06,bz+.06,.17,.13,RZ-DZ0+.10,col.woodD,{ hard:true,mode:6 });
    box(BX0+.075,1.02,1.29,.085,2.00,.84,C('#aaa8a3'),{ tag:'洗手间',gloss:G.paint });
    box(BX0+.125,1.60,1.29,.022,.22,.42,col.white,{ tag:'洗手间',gloss:G.paint });
    capsule(BX0+.135,1.01,.98,.045,.12,.045,col.steel,{ rx:Math.PI/2,tag:'洗手间',gloss:G.metal });
    thing('洗手间',RX-.34,2.28,bz,'洗手间在那边。','The bathroom is over there.',
      '洗 wash + 手 hand + 间 room. Signs may also say 卫生间 or just WC.',{focus:[RX-1.0,bz],reach:1.6});

    // ================================================================ 床 bed
    const bedX=-2.5, bedZ=-1.5;
    for (const [ox,oz] of [[-.70,-.88],[.70,-.88],[-.70,.88],[.70,.88]])
      taper(bedX+ox,.15,bedZ+oz,.10,.30,.10,col.woodD,{ mode:6 });
    box(bedX,.27,bedZ,1.64,.34,2.02,col.woodM,{ tag:'床' });
    box(bedX,.48,bedZ,1.56,.24,1.94,col.cream,{ tag:'床',mode:7,gloss:G.fabric });
    // A turn-down at the head end plus two soft ridges. Without them the cover is a single
    // flat plane, which is what made the bed read as a painted board. The whole cover slides
    // down the bed and bunches when you climb in.
    // Tagged 被子, not 床: it is a different word and it is the part of the bed you actually
    // touch. Sleeping is still one click away on the sheet, the frame, the headboard or the
    // pillow, all of which are still 床 or 枕头 and all of which run 睡觉.
    mover('duvet', [
      box(bedX,.61,bedZ+.43,1.58,.24,1.10,col.jade,{ tag:'被子',mode:7,gloss:G.fabric }),
      box(bedX,.68,bedZ+.94,1.56,.12,.22,col.jadeL,{ tag:'被子',mode:7 }),
      box(bedX,.665,bedZ-.13,1.60,.11,.21,col.jadeL,{ tag:'被子',mode:7,gloss:G.fabric }),
      ...[[.13,1.54],[.58,1.50],[.86,1.46]].map(([oz,w]) =>
        capsule(bedX,.706,bedZ+oz,.062,w,.062,col.jade,
          { rz:Math.PI/2,tag:'被子',mode:7,gloss:G.fabric })),
    ], v => M.mul(M.trans(0, -.02 * v, .42 * v), piv(bedX, .55, bedZ + .9, M.scale(1, 1 + .5 * v, 1 - .22 * v))));
    box(bedX,.99,bedZ-1.03,1.66,1.02,.11,col.woodD,{ mode:6 });
    for (const s of [-1,1]) box(bedX+s*.36,.64,bedZ-.70,.61,.17,.40,col.white,
      {ry:s*.05,tag:'枕头',mode:7,gloss:G.fabric});
    shade(bedX,bedZ,2.10,2.48,.43); solid(-RX,-1.66,-RZ,-.46);
    thing('床',bedX,1.10,bedZ+.24,'我很累，我想睡觉。',"I'm tired. I want to sleep.",
      'Sleeping restores energy — and dreams in Chinese come later.',{focus:[-1.35,bedZ+.1],reach:1.7});
    thing('枕头',bedX,.88,bedZ-.70,'枕头有点儿硬。','The pillow is a little hard.',
      'The landlord left it. It is not great.',{focus:[-1.35,bedZ-.6],reach:1.7});
    // The cover is its own word. It was tagged 床 with everything else, so the largest, softest,
    // most obviously nameable thing in the room taught the same word as the frame under it.
    thing('被子',bedX-.10,.94,bedZ+.72,'被子太薄了。','The duvet is too thin.',
      '被子 is the quilt; 床 is the bed under it. 盖被子 is to pull it over yourself.',
      {focus:[-1.35,bedZ+.70],reach:1.7});
    rug(-1.30,-1.30,.92,1.52,[[0,C('#8f544c')],[.20,C('#a96a5e')]],false);

    // ================================================================ 床头柜 bedside table
    // Wedged between the head of the bed and the window, which is the only wall space left and
    // where one would really go. Its top is at .58, low enough to pass under the sill at .765.
    // Two numbers here were arrived at the hard way. Pushed back against the wall the cabinet was
    // fine but the alarm clock on top of it stood inside the windowsill, whose underside is at .665
    // and which reaches .26 out from the wall: the clock's bells were buried in the boards. So the
    // cabinet is pulled forward until only its back tucks under the sill, and the clock stands clear
    // of the sill's footprint entirely. And at x -1.47 its left side interpenetrated the bed frame
    // and the headboard; -1.42 clears both.
    const nsX = -1.42, nsZ = -2.33;
    box(nsX,.035,nsZ,.40,.07,.36,col.woodD,{ tag:'床头柜',mode:6 });
    box(nsX,.30,nsZ,.44,.46,.40,col.woodM,{ tag:'床头柜' });
    box(nsX,.555,nsZ,.50,.05,.44,col.woodL,{ tag:'床头柜',mode:6 });
    box(nsX,.44,nsZ+.205,.36,.14,.03,col.woodD,{ tag:'床头柜',hard:true,gloss:G.wood });
    capsule(nsX,.44,nsZ+.235,.032,.11,.032,col.gold,{ rz:Math.PI/2,tag:'床头柜',gloss:G.metal });
    // An open cubby under the drawer with a paperback face-down in it. A cabinet with a drawer
    // front and nothing else is a box with a line drawn on it; the shadowed gap is what says
    // there is an inside.
    box(nsX,.21,nsZ+.16,.34,.20,.02,C('#33251c'),{ tag:'床头柜',hard:true,gloss:.06 });
    box(nsX,.155,nsZ+.13,.21,.032,.27,C('#7c3a30'),{ tag:'床头柜',hard:true,gloss:G.matte,ry:.06 });
    box(nsX,.171,nsZ+.13,.185,.010,.25,C('#ded3bc'),{ tag:'床头柜',hard:true,gloss:G.matte,ry:.06 });

    // ---- 闹钟 a twin-bell alarm clock, angled to face the bed and the room at once.
    // Its hands run off the same game clock as the one on the wall, through `dials`. A painted
    // face would have been a second clock in the room disagreeing with the first — the exact
    // fault the wall clock was built to stop.
    const acx = nsX+.13, acy = .655, acz = nsZ-.03, acYaw = .55;
    const anx = Math.sin(acYaw), anz = Math.cos(acYaw);      // out of the face
    const atx = Math.cos(acYaw), atz = -Math.sin(acYaw);     // across it, left to right
    cyl(acx,acy,acz,.072,.068,col.gold,{ rx:Math.PI/2,ry:acYaw,tag:'闹钟',gloss:G.metal });
    cyl(acx+anx*.036,acy,acz+anz*.036,.066,.010,C('#c98f2c'),
      { rx:Math.PI/2,ry:acYaw,tag:'闹钟',gloss:G.metal });
    cyl(acx+anx*.041,acy,acz+anz*.041,.056,.008,C('#f7f2e4'),
      { rx:Math.PI/2,ry:acYaw,tag:'闹钟',mode:1 });
    dials.push({ x:acx, y:acy, z:acz, yaw:acYaw, hands:[
      // The alarm hand first, so the two live hands are layered over it rather than under.
      { p: box(acx,acy,acz,.006,.048,.005,C('#a4341f'),{ tag:'闹钟',mode:1,hard:true }),
        off:.046, len:.048, w:.006, t:.005, fix:7/12*Math.PI*2 },
      { p: box(acx,acy,acz,.010,.030,.005,col.charcoal,{ tag:'闹钟',mode:1,hard:true }),
        off:.050, len:.030, w:.010, t:.005, per:720 },
      { p: box(acx,acy,acz,.007,.046,.005,col.charcoal,{ tag:'闹钟',mode:1,hard:true }),
        off:.054, len:.046, w:.007, t:.005, per:60 },
    ] });
    cyl(acx+anx*.058,acy,acz+anz*.058,.008,.008,C('#a4341f'),
      { rx:Math.PI/2,ry:acYaw,tag:'闹钟',mode:1 });
    for (const s of [-1,1]) {
      ball(acx+atx*s*.052,acy+.058,acz+atz*s*.052,.030,.026,.030,col.gold,
        { tag:'闹钟',gloss:G.metal });
      capsule(acx+atx*s*.042+anx*.02,acy-.078,acz+atz*s*.042+anz*.02,.014,.030,.014,col.gold,
        { tag:'闹钟',gloss:G.metal });
    }
    thing('闹钟',acx,.80,acz+.06,'闹钟每天早上七点响。','The alarm goes off at seven every morning.',
      '闹 noisy + 钟 clock. 定闹钟 dìng nàozhōng is to set it.',{focus:[-1.30,nsZ+.55],reach:1.5});

    // ---- the charger, plugged in behind the table with the lead coiled on top and nothing on the
    // end of it: your phone spends the day on the desk, which is why the desk is where you find it.
    box(nsX-.14,.60,nsZ-.06,.055,.040,.075,col.white,{ tag:'床头柜',hard:true,gloss:.30 });
    capsule(nsX-.14,.595,nsZ+.02,.012,.075,.012,col.white,{ rx:Math.PI/2,tag:'床头柜' });
    capsule(nsX-.09,.588,nsZ+.07,.011,.090,.011,col.white,{ rz:Math.PI/2,ry:.5,tag:'床头柜' });
    capsule(nsX-.02,.588,nsZ+.04,.011,.075,.011,col.white,{ rz:Math.PI/2,ry:-.7,tag:'床头柜' });
    // Last of the cluster, because it is the only transparent thing in it: a glass drawn before
    // its neighbours writes depth over them and they vanish behind a pane of water. Kept out at the
    // left front corner, clear of the sill overhead for the same reason as the clock.
    cyl(nsX-.17,.635,nsZ-.05,.038,.110,col.glass,{ tag:'床头柜',alpha:.40,gloss:G.glass });
    cyl(nsX-.17,.612,nsZ-.05,.033,.060,C('#cfe6ef'),{ tag:'床头柜',alpha:.55,gloss:G.glass });
    shade(nsX,nsZ,.58,.52,.40); solid(nsX-.27,nsX+.27,nsZ-.24,nsZ+.24);
    thing('床头柜',nsX,.72,nsZ+.24,'床头柜上有一个闹钟。','There is an alarm clock on the nightstand.',
      '床 bed + 头 head + 柜 cabinet: the cupboard at the head of the bed.',
      {focus:[-1.47,nsZ+.60],reach:1.4});

    // ================================================================ 衣柜 wardrobe
    const wardX=-RX+.34, wardZ=.35;
    // A carcass with an open front, so opening the doors shows the few clothes you own
    // rather than a blank slab of wood.
    box(wardX-.27,1.04,wardZ,.12,2.08,1.36,col.woodM,{ tag:'衣柜' });
    for (const s of [-1,1]) box(wardX+.03,1.04,wardZ+s*.63,.60,2.08,.10,col.woodM,{ tag:'衣柜' });
    box(wardX+.03,2.03,wardZ,.60,.10,1.36,col.woodM,{ tag:'衣柜' });
    box(wardX-.17,1.04,wardZ,.10,1.92,1.22,col.woodD,{ tag:'衣柜',hard:true });
    box(wardX+.03,1.02,wardZ,.56,.045,1.16,col.woodD,{ tag:'衣柜',hard:true,gloss:G.wood });
    capsule(wardX+.02,1.78,wardZ,.030,1.14,.030,col.steel,{ rx:Math.PI/2,tag:'衣柜',gloss:G.metal });
    // Hangers and shirts. Each one is a shoulder wedge under a wire, offset along the rail.
    // Each shirt is one wardrobe slot. Changing clothes takes one off the rail and hangs
    // the one you were wearing back up in its place, so the rail is a real inventory.
    // Five slots, and no longer five copies of the same shirt. There is only .52 of hanging space
    // between the rail and the shelf under it, so length is not available: a floor-length coat
    // would go straight through the shelf. The variety is in mass and hang instead — a bulkier
    // coat, a jacket with its sleeves hanging clear of the body, a fuller skirt on the dress, and
    // the cream shirt slipped crooked on its hanger the way one always is.
    //
    // Two things to know before adding to a slot. Every prop in a slot must be the same colour,
    // because changing clothes swaps the slot's colour with the one you are wearing and recolours
    // all of them — a white cuff would come out shirt-red the first time you changed. And the rail
    // runs along z with each garment's shoulders spanning x, so the garments hang edge-on to the
    // doors and no face of one of them is reliably "the front": tailoring that only exists on a
    // front — lapels, a placket, buttons — has nowhere unambiguous to go here.
    [[-.44,'#c8503d','shirt'],[-.26,'#3d6f8e','jacket'],[-.08,'#d9d2c2','shirt'],
     [.14,'#4f7a5e','coat'],[.34,'#8d6bb0','dress']]
      .forEach(([dz,hex,cut],i) => {
        capsule(wardX+.02,1.72,wardZ+dz,.020,.14,.020,col.steel,{ tag:'衣柜',gloss:G.metal });
        const c = C(hex), z = wardZ+dz;
        // The crooked one is the cream shirt; the rest lean a little, alternating.
        const F = { tag:'衣柜',mode:7,gloss:G.fabric,ry:(i%2?1:-1)*.03 + (i===2?.10:0) };
        const yoke = cut === 'dress' ? .26 : cut === 'shirt' ? .30 : .33;
        const g = [taper(wardX+.02,1.60,z,yoke,.14,.13,c,F)];
        if (cut === 'dress') {
          g.push(box(wardX+.02,1.45,z,.23,.22,.11,c,F));
          g.push(box(wardX+.02,1.21,z,.30,.30,.16,c,F));
        } else if (cut === 'coat') {
          g.push(box(wardX+.02,1.30,z,.33,.50,.17,c,F));
          g.push(box(wardX+.02,1.525,z,.21,.075,.15,c,F));            // turned-up collar
        } else if (cut === 'jacket') {
          g.push(box(wardX+.02,1.31,z,.28,.46,.14,c,F));
          for (const s of [-1,1])                                       // sleeves, hanging clear
            g.push(box(wardX+.02+s*.145,1.24,z,.075,.36,.10,c,{ ...F,rz:s*.05 }));
        } else {
          g.push(box(wardX+.02,1.28,z,.30,.52,.12,c,F));
        }
        rail.push({ hex, color: c, props: g });
      });
    // ---- 行李箱 the case you arrived with, stood on end at the bottom of the wardrobe.
    // It was one grey box, which at this size reads as a cardboard carton: what says suitcase is
    // the wheels under it, the pull handle over it and the seam round the middle where it opens.
    // Face toward the doors, handle up, the way you would shove it in.
    const lgX = wardX+.02, lgZ = wardZ-.22;
    box(lgX,.42,lgZ,.42,.52,.44,C('#8a7c68'),{ tag:'行李箱',gloss:.22 });
    box(lgX+.20,.42,lgZ,.030,.44,.36,C('#7a6d5b'),{ tag:'行李箱',hard:true,gloss:.20 });
    box(lgX,.42,lgZ,.432,.026,.452,C('#5f5548'),{ tag:'行李箱',hard:true,gloss:.26 });
    for (const s of [-1,1]) {
      cyl(lgX+.13,.145,lgZ+s*.155,.035,.030,col.black,{ rx:Math.PI/2,tag:'行李箱',gloss:.30 });
      capsule(lgX-.02,.735,lgZ+s*.105,.016,.14,.016,col.steel,{ tag:'行李箱',gloss:G.metal });
    }
    capsule(lgX-.02,.805,lgZ,.020,.23,.020,col.steel,{ rz:Math.PI/2,tag:'行李箱',gloss:G.metal });
    box(lgX-.02,.735,lgZ+.17,.055,.075,.010,col.linen,{ tag:'行李箱',hard:true,gloss:.12 });
    thing('行李箱',lgX+.10,.86,lgZ-.06,'行李箱里还有没打开的东西。',
      'There are still things in the suitcase I have not unpacked.',
      '行李 luggage + 箱 case. 一个行李箱, and everything you own came in it.',
      {focus:[-2.30,.10],reach:1.5});
    for (const s of [-1,1]) {
      const door=[
        box(wardX+.38,1.04,wardZ+s*.31,.07,1.86,.57,col.woodL,{ tag:'衣柜' }),
        // Stiles and a mid rail, so a two-metre door is not one blank slab of wood.
        ...[-1,1].map(e =>
          box(wardX+.424,1.04,wardZ+s*.31+e*.243,.022,1.80,.078,col.woodM,
            { tag:'衣柜',hard:true,gloss:G.wood })),
        box(wardX+.424,1.04,wardZ+s*.31,.022,.088,.412,col.woodM,
          { tag:'衣柜',hard:true,gloss:G.wood }),
        box(wardX+.335,1.04,wardZ+s*.31,.022,1.80,.53,col.woodD,
          { tag:'衣柜',hard:true,gloss:G.wood }),
        capsule(wardX+.45,1.04,wardZ+s*.08,.045,.20,.045,col.gold,{ tag:'衣柜',gloss:G.metal }),
      ];
      mover(s < 0 ? 'wardrobeL' : 'wardrobeR', door,
        v => hingeY(wardX+.38, wardZ+s*.615, -s*1.02*v));
    }
    box(wardX,2.11,wardZ,.76,.10,1.46,col.woodD,{ mode:6 });
    box(wardX,.055,wardZ,.70,.11,1.40,col.woodD,{ tag:'衣柜',mode:6 });
    shade(wardX+.06,wardZ,1.0,1.65,.42); solid(-RX,-2.79,-.35,1.05);
    thing('衣柜',wardX+.08,2.22,wardZ,'衣柜里只有几件衣服。','There are only a few clothes in the wardrobe.',
      'Everything you own fits in here. For now.',{focus:[-2.20,wardZ],reach:1.6});

    // ================================================================ 电视 TV + media console
    const tvX=-1.15, tvZ=.36;
    box(tvX,.20,tvZ,1.42,.38,.48,col.woodD,{ mode:6 });
    box(tvX,.42,tvZ,1.46,.08,.52,col.woodL,{ mode:6 });
    // The left bay keeps its door; the right one is an open mouth with four disc cases standing in
    // it. Two identical blank doors under a television is what the console was, and these units are
    // built with one bay open anyway so the box inside can see the remote.
    //
    // Everything on this console's front is a panel stuck onto the carcass rather than a hollow in
    // it — the carcass is one solid box — so the dark bay and the cases in it stand off the face by
    // the same couple of millimetres the door does. Anything meant to sit *inside* it would have to
    // cut the carcass first.
    box(tvX-.34,.20,tvZ+.25,.62,.25,.025,col.woodM,{ hard:true,mode:6 });
    box(tvX+.34,.20,tvZ+.25,.62,.25,.022,C('#211d1a'),{ tag:'电视',hard:true,gloss:.06 });
    for (let i=0;i<4;i++)
      box(tvX+.14+i*.028,.185,tvZ+.268,.020,.185,.135,
        C(['#7c3a30','#33445f','#5c7040','#b8843c'][i]),
        { tag:'电视',hard:true,gloss:G.matte,rz:.05 });
    // 机顶盒: the set-top box on the right-hand end of the top, standing forward of the screen so
    // it is not inside it. Its standby light stays lit at night on purpose — it is the one thing in
    // the flat that never goes off.
    box(tvX+.58,.495,tvZ+.15,.26,.070,.20,C('#2a2e33'),{ tag:'电视',hard:true,gloss:.34 });
    box(tvX+.58,.523,tvZ+.15,.21,.006,.15,C('#3d444b'),{ tag:'电视',hard:true,gloss:.42 });
    box(tvX+.50,.492,tvZ+.251,.018,.010,.006,C('#7fe0a0'),{ hard:true,mode:1,glow:.55 });
    taper(tvX,.51,tvZ,.22,.11,.22,col.charcoal,{ gloss:G.metal,tag:'电视' });
    box(tvX,.79,tvZ,1.12,.66,.075,col.black,{ tag:'电视',gloss:.42 });
    // One flat rectangle of colour reads as a coloured card, not a picture. A brighter
    // upper band, a darker block and a raking sheen give it depth and glass.
    // The set is dark until you actually switch it on.
    emitter('tv', [
      box(tvX,.79,tvZ+.044,1.02,.56,.018,C('#315d73'),{ tag:'电视',mode:1,glow:.28,hard:true }),
      box(tvX,.955,tvZ+.053,1.00,.185,.006,C('#4d8298'),{ tag:'电视',mode:1,glow:.34,hard:true }),
      box(tvX-.27,.735,tvZ+.053,.34,.21,.006,C('#27506a'),{ tag:'电视',mode:1,glow:.18,hard:true }),
      box(tvX,.98,tvZ+.058,.64,.025,.008,C('#5888a0'),{ mode:1,alpha:.55,hard:true }),
      box(tvX-.21,.79,tvZ+.063,.26,.46,.005,C('#a8d6e4'),
        { tag:'电视',rz:.34,mode:1,alpha:.11,hard:true }),
    ], .30);
    tvGlow = glow(M.trs(tvX,.80,tvZ+.48,0,1.55,1,1.0),C('#5b829a'),.08);
    shade(tvX,tvZ,1.75,.90,.38); solid(-1.88,-.42,.08,.64);
    thing('电视',tvX,1.20,tvZ,'电视里在说中文。','They are speaking Chinese on TV.',
      'Leaving it on in the background is free listening practice.',{focus:[tvX,1.05],reach:1.5});

    // ================================================================ living rug + coffee table
    rug(-1.35,1.74,2.58,1.94,[
      [0,C('#7e4039')], [.28,C('#a15b50')], [.86,C('#8e4c45')], [1.24,C('#b06a5c')],
    ]);
    thing('地毯',-1.35,.34,1.74,'地毯是房东留下的。','The rug was left behind by the landlord.',
      'Slightly stained. Adds warmth anyway.',{focus:[-1.35,1.74],reach:1.2});

    const tableX=-1.35, tableZ=1.28;
    box(tableX,.39,tableZ,1.08,.075,.60,col.woodL,{ tag:'茶几',mode:6 });
    box(tableX,.25,tableZ,.92,.045,.44,col.woodM,{ tag:'茶几',mode:6 });
    for (const [ox,oz] of [[-.45,-.22],[.45,-.22],[-.45,.22],[.45,.22]])
      taper(tableX+ox,.19,tableZ+oz,.065,.38,.065,col.woodD,{ tag:'茶几',mode:6 });
    // ---- what is on the table. The top is at .4275 and everything here is measured off it: the
    // cup used to be centred at .47, which put its base .022 *under* the wood and made it read as
    // growing out of the table. The coaster is what made that impossible to ignore.
    box(-1.11,.4335,1.25,.105,.012,.105,C('#8a6a4a'),{ tag:'茶',hard:true,gloss:.20 });
    taper(-1.11,.5045,1.25,.11,.13,.11,col.white,{ tag:'茶',gloss:.38 });
    cyl(-1.11,.5725,1.25,.043,.012,C('#87602f'),{ tag:'茶',gloss:.72 });
    capsule(-1.04,.5145,1.25,.06,.08,.06,col.white,{ rz:Math.PI/2,tag:'茶',gloss:.38 });
    thing('茶',-1.11,.70,1.25,'茶还是热的。','The tea is still hot.',
      '喝茶 to drink tea, 倒茶 to pour it, 一杯茶 for a cup of it.',
      {focus:[-1.11,.82],reach:1.3});
    // A dish of 橘子. Decoration and not a 水果 thing on purpose: the word is already taught on the
    // supermarket's produce trestle, and its verb there hands goods to your shopping basket — the
    // same verb fired at home would put fruit in a basket you are not carrying, in a shop you are
    // not in.
    cyl(-1.34,.4395,1.08,.105,.024,col.white,{ tag:'茶几',gloss:.36 });
    cyl(-1.34,.4535,1.08,.110,.012,C('#e7e2d6'),{ tag:'茶几',gloss:.34 });
    for (const [ox,oz,r,hex] of [[-.036,-.018,.042,'#d9853a'],[.034,.010,.038,'#e09a3c'],
                                 [.002,.038,.036,'#8fa63e']])
      ball(-1.34+ox,.470+r*.5,1.08+oz,r,r*.86,r,C(hex),{ tag:'茶几',gloss:.26 });
    // 遥控器: the television's, where it always is. The air conditioner's is the one the 空调 text
    // says has gone missing, and it is still missing.
    box(-1.02,.4445,1.05,.055,.020,.175,col.charcoal,{ ry:.5,tag:'遥控器',hard:true,gloss:.30 });
    box(-1.02,.4555,1.05,.040,.004,.150,C('#3c4249'),{ ry:.5,tag:'遥控器',hard:true,gloss:.24 });
    box(-1.055,.4585,1.117,.014,.004,.014,C('#a4341f'),{ ry:.5,tag:'遥控器',hard:true,mode:1 });
    thing('遥控器',-1.02,.62,1.05,'遥控器在茶几上。','The remote is on the coffee table.',
      '遥 distant + 控 control + 器 device. 电视遥控器 is this one.',{focus:[-1.02,.80],reach:1.3});
    // ---- 书 the paperback. It was a single flat slab the colour of paper, which at this size read
    // as a second coaster: what says book is the cream page block between two covers and the folded
    // spine down one edge. The spine offset is the book's own half-width turned through its yaw,
    // because the volume is laid on the table at an angle and the spine has to follow it.
    box(-1.60,.4345,1.32,.225,.014,.30,C('#7a4a3c'),{ tag:'书',ry:.25,hard:true,gloss:G.matte });
    box(-1.60,.4475,1.32,.205,.026,.28,C('#ded3bc'),{ tag:'书',ry:.25,hard:true,gloss:G.matte });
    box(-1.60,.4675,1.32,.225,.014,.30,C('#7a4a3c'),{ tag:'书',ry:.25,hard:true,gloss:.14 });
    capsule(-1.60-Math.cos(.25)*.112,.4505,1.32+Math.sin(.25)*.112,.020,.28,.020,C('#6b3f33'),
      { rx:Math.PI/2,ry:.25,tag:'书',gloss:G.matte });
    box(-1.60+Math.sin(.25)*.17,.4525,1.32+Math.cos(.25)*.17,.030,.006,.055,C('#a4341f'),
      { ry:.25,tag:'书',hard:true,gloss:G.matte });
    thing('书',-1.60,.62,1.32,'这本书我还看不懂。','I still cannot read this book.',
      '一本书 yì běn shū — books are counted with 本, not 个.',{focus:[-1.60,.86],reach:1.3});
    shade(tableX,tableZ,1.42,.96,.33); solid(-1.94,-.76,1.0,1.61);
    thing('茶几',tableX,.70,tableZ,'茶几上有一杯茶。','There is a cup of tea on the coffee table.',
      '茶 tea + 几 small table.',{focus:[tableX,.85],reach:1.4});

    // ================================================================ 沙发 sofa
    const sofaX=-1.35, sofaZ=2.28;
    for (const s of [-1,1]) for (const z of [sofaZ-.32,sofaZ+.34])
      taper(sofaX+s*.88,.10,z,.09,.20,.09,col.woodD,{ mode:6 });
    box(sofaX,.18,sofaZ+.04,2.08,.30,.94,col.jade,{ tag:'沙发',mode:7 });
    box(sofaX,.65,sofaZ+.39,2.06,.68,.17,col.jade,{ tag:'沙发',mode:7 });
    // Seat and back cushions get a crowned upper pad and a piping seam along the front
    // lip. One slab per cushion is what made the sofa read as a moulded block.
    for (const s of [-1,1]) {
      box(sofaX+s*.48,.40,sofaZ-.03,.94,.23,.80,col.jadeL,{ tag:'沙发',mode:7 });
      box(sofaX+s*.48,.515,sofaZ-.04,.84,.07,.70,col.jadeL,{ tag:'沙发',mode:7,gloss:G.fabric });
      capsule(sofaX+s*.48,.405,sofaZ-.415,.05,.92,.05,col.jade,
        { rz:Math.PI/2,tag:'沙发',mode:7,gloss:G.fabric });
      box(sofaX+s*.48,.65,sofaZ+.28,.92,.46,.20,col.jadeL,{ tag:'沙发',mode:7 });
      capsule(sofaX+s*.48,.865,sofaZ+.26,.045,.90,.045,col.jade,
        { rz:Math.PI/2,tag:'沙发',mode:7,gloss:G.fabric });
    }
    for (const s of [-1,1]) box(sofaX+s*1.01,.43,sofaZ+.02,.16,.54,.94,col.jade,{ tag:'沙发',mode:7 });
    // Throw pillows as squashed spheres with a puffed centre: a thin box cannot read as
    // something soft, no matter how the fabric shader treats it.
    for (const [px,py,pz,ry,c] of [[.61,.70,.13,.38,col.gold],[-.63,.68,.14,-.30,C('#b65e42')]]) {
      ball(sofaX+px,py,sofaZ+pz,.155,.145,.075,c,{ ry,rx:-.28,mode:7,gloss:G.fabric,tag:'沙发' });
      ball(sofaX+px,py,sofaZ+pz,.130,.120,.098,c,{ ry,rx:-.28,mode:7,gloss:G.fabric,tag:'沙发' });
    }
    // A throw over the left arm, hanging down the outside and spilling onto the seat. Both halves
    // of this sofa were mirror images of each other down to the crease in the piping, and a room
    // where somebody lives is not symmetrical: the throw is the one thing here that says which end
    // of it gets sat on.
    box(sofaX-1.01,.725,sofaZ+.06,.20,.075,.56,C('#cfc0a4'),{ tag:'沙发',mode:7,gloss:G.fabric });
    box(sofaX-1.105,.545,sofaZ+.06,.030,.30,.52,C('#cfc0a4'),
      { tag:'沙发',mode:7,gloss:G.fabric,rz:.05 });
    box(sofaX-.71,.585,sofaZ-.04,.42,.055,.60,C('#c6b79c'),
      { tag:'沙发',mode:7,gloss:G.fabric,ry:.06 });
    capsule(sofaX-.80,.605,sofaZ-.04,.032,.58,.032,C('#bdad8f'),
      { rx:Math.PI/2,tag:'沙发',mode:7,gloss:G.fabric });
    shade(sofaX,sofaZ,2.42,1.22,.43); solid(-2.46,-.24,1.81,RZ);
    thing('沙发',sofaX,1.08,sofaZ-.24,'坐在沙发上看电视。','Sit on the sofa and watch TV.',
      'Your friends will sit here eventually. You have not met them yet.',{focus:[sofaX,1.55],reach:1.5});

    // ================================================================ living-room focal wall
    // The sofa used to sit against the largest uninterrupted wall in the flat with nothing above
    // it. A small, coordinated gallery gives the living room a focal point without taking a single
    // centimetre from the walking route. The middle print is a simplified Beijing dusk skyline;
    // the two smaller frames keep it from reading like a television mounted over another television.
    const artZ = RZ - .085;
    for (const [x,y,w,h,matte] of [
      [-2.08,1.69,.43,.55,'#d6c3a5'], [-1.35,1.76,.72,.72,'#c9d5ce'], [-.62,1.68,.43,.52,'#dfc4ad'],
    ]) {
      box(x,y,artZ,w+.09,h+.09,.070,col.woodD,{ tag:'墙',mode:6,gloss:G.wood });
      box(x,y,artZ-.040,w,h,.020,C(matte),{ tag:'墙',hard:true,gloss:G.matte });
    }
    // Main print: a warm sun, layered skyline and a tiny title plate.
    ball(-1.51,1.91,artZ-.064,.082,.082,.018,C('#d9824b'),{ tag:'墙',mode:1,glow:.10 });
    for (const [x,w,h,c] of [
      [-1.61,.16,.19,'#667b78'],[-1.42,.13,.27,'#4d6667'],[-1.26,.14,.16,'#7d8175'],[-1.08,.18,.23,'#3e5559'],
    ]) box(x,1.43+h/2,artZ-.067,w,h,.012,C(c),{ tag:'墙',hard:true,mode:1 });
    box(-1.35,1.51,artZ-.071,.48,.025,.010,C('#a04b37'),{ tag:'墙',hard:true,mode:1 });
    B.glyphs(-1.35,1.54,artZ-.078,Math.PI,'北京',
      { size:.082,gap:.014,color:C('#f4ead6'),mode:1,glow:.04,lift:.003,tag:'墙' });
    // Side frames are deliberately quieter: one ink landscape and one family-style snapshot.
    for (const [x,y,w,ry] of [[-2.14,1.72,.25,-.14],[-2.01,1.57,.19,.12]])
      box(x,y,artZ-.062,w,.028,.012,C('#596b62'),{ tag:'墙',hard:true,mode:1,rz:ry });
    ball(-.69,1.72,artZ-.063,.070,.090,.018,C('#7d9185'),{ tag:'墙',mode:1 });
    ball(-.55,1.70,artZ-.064,.062,.080,.018,C('#b8795b'),{ tag:'墙',mode:1 });
    box(-.62,1.54,artZ-.066,.28,.055,.012,C('#8e674d'),{ tag:'墙',hard:true,mode:1 });

    // A shaded reading lamp layers the lighting in the living room and makes the sofa corner feel
    // intentional after dark. It is tucked behind the right arm, inside the sofa's existing solid.
    const floorLampX=-.20, floorLampZ=2.48;
    cyl(floorLampX,.035,floorLampZ,.19,.045,col.charcoal,{ tag:'灯',gloss:G.metal });
    capsule(floorLampX,.68,floorLampZ,.026,1.30,.026,col.gold,{ tag:'灯',gloss:G.metal });
    capsule(floorLampX-.10,1.24,floorLampZ-.06,.024,.25,.024,col.gold,
      { tag:'灯',rz:-.72,gloss:G.metal });
    taper(floorLampX-.19,1.34,floorLampZ-.12,.36,.24,.36,C('#e5d6bd'),
      { tag:'灯',rx:-.18,gloss:.16,glow:.20 });
    ball(floorLampX-.19,1.28,floorLampZ-.16,.072,.064,.072,C('#ffe3ad'),
      { tag:'灯',mode:1,glow:.66 });
    // The bulb above is what the lamp looks like and the pool on the floor is where it lands.
    // Neither of them lights anything. This does: a standard lamp beside a sofa is the whole
    // reason that corner of a room is warmer than the rest of it, and until now it was not.
    B.light(floorLampX-.19,1.24,floorLampZ-.16,[1.00,0.84,0.60],.55,1.7);
    glow(M.trs(floorLampX-.20,.03,floorLampZ-.42,0,1.18,1,.92),C('#f4c779'),.22);

    // ================================================================ 植物 plant
    const plantX=-3.02, plantZ=2.28;
    // The saucer it stands in, wider than the pot's foot so a lip of it shows all the way round.
    // Without one the pot met the floorboards on a hard line and read as moulded into them, and
    // there was nowhere for the water you are nagged about pouring to go.
    cyl(plantX,.020,plantZ,.245,.040,C('#8d4f34'),{ tag:'植物',gloss:.24 });
    cyl(plantX,.040,plantZ,.252,.014,C('#a3603d'),{ tag:'植物',gloss:.22 });
    taper(plantX,.19,plantZ,.38,.38,.38,col.terra,{ tag:'植物',gloss:.18 });
    cyl(plantX,.383,plantZ,.178,.050,C('#93573a'),{ tag:'植物',gloss:.20 });
    cyl(plantX,.400,plantZ,.150,.028,C('#382820'),{ tag:'植物',gloss:G.matte });
    for (const [ox,oz,h,lean] of [[-.035,.020,.56,.05],[.042,-.018,.44,-.06],[.006,-.048,.33,.02]])
      capsule(plantX+ox,.40+h/2,plantZ+oz,.05,h,.05,C('#4b6f39'),{ rz:lean,tag:'植物' });
    // Blade leaves, fanned around the crown in three tiers and tilted further up the
    // higher they sit. The old leaves were flat pancake ellipsoids all at one angle, which
    // stacked into a pile of green plates rather than reading as foliage.
    const LEAFC = [col.plant, col.plantD, C('#5f9a4c')];
    const crown = [];
    let li = 0;
    for (const [ly,tilt,len,n] of [[.60,-.14,.36,4],[.80,.18,.31,4],[.99,.46,.24,3]]) {
      for (let i=0;i<n;i++,li++) {
        // rotZ lifts the blade out of the crown, then rotY fans it: after rotY the blade
        // points along (cos a, 0, -sin a), so the centre is offset that way to radiate.
        const a = li*2.399 + .40, L = len*(.80 + ((li*7)%5)*.10);
        crown.push(ball(plantX+Math.cos(a)*L*.42, ly, plantZ-Math.sin(a)*L*.42,
          L/2, .022, .056, LEAFC[li%3], { ry:a, rz:tilt, gloss:.24, tag:'植物' }));
      }
    }
    // Left too long without water the whole crown wilts over the rim of the pot, and it
    // straightens up again within a moment of being watered.
    mover('plant', crown, v => piv(plantX, .42, plantZ,
      M.mul(M.rotZ(-.34 * v), M.scale(1, 1 - .18 * v, 1))));
    fader('canWater', [
      cyl(plantX-.02,.72,plantZ+.05,.010,.30,C('#bfe0ea'),{ tag:'植物',mode:1,hard:true }),
    ], .6);
    shade(plantX,plantZ,.64,.64,.38); solid(-RX,-2.80,2.02,RZ);
    thing('植物',plantX,1.12,plantZ,'别忘了给植物浇水。',"Don't forget to water the plant.",
      'It will die if you ignore it for a week. Genuinely.',{focus:[-2.25,2.10],reach:1.4});

    // ================================================================ desk + devices
    const deskX=1.10, deskZ=-2.40;
    box(deskX,.75,deskZ,1.72,.075,.68,col.woodL,{ tag:'桌子',mode:6 });
    box(deskX,.68,deskZ,1.58,.10,.58,col.woodM,{ tag:'桌子',mode:6 });
    for (const ox of [-.77,.77]) for (const oz of [-.25,.25])
      taper(deskX+ox,.37,deskZ+oz,.075,.74,.075,col.woodD,{ tag:'桌子',mode:6 });
    // A drawer that really pulls out, with the things you arrived with inside it.
    mover('drawer', [
      box(1.64,.58,deskZ+.285,.44,.20,.035,col.woodM,{ tag:'桌子',hard:true,mode:6 }),
      capsule(1.64,.58,deskZ+.315,.030,.16,.030,col.gold,{ rz:Math.PI/2,tag:'桌子',gloss:G.metal }),
      box(1.64,.50,deskZ+.13,.42,.035,.30,col.woodD,{ tag:'桌子',hard:true,mode:6 }),
      ...[-1,1].map(s => box(1.64+s*.21,.56,deskZ+.13,.020,.13,.30,col.woodD,
        { tag:'桌子',hard:true,mode:6 })),
      box(1.64,.535,deskZ+.10,.30,.045,.22,col.woodD,{ tag:'桌子',hard:true,mode:6 }),
      box(1.58,.545,deskZ+.09,.12,.025,.17,C('#7a2f2c'),{ tag:'桌子',hard:true,gloss:.22 }),  // passport
      box(1.58,.559,deskZ+.09,.075,.004,.055,col.gold,{ tag:'桌子',hard:true,mode:1 }),
      box(1.72,.545,deskZ+.15,.11,.022,.15,C('#d8d2c4'),{ tag:'桌子',hard:true,ry:.22 }),     // papers
      capsule(1.70,.552,deskZ+.06,.010,.09,.010,C('#2b2f36'),{ rz:Math.PI/2,tag:'桌子' }),    // pen
    ], v => M.trans(0, 0, .30 * v));
    shade(deskX,deskZ,1.98,.98,.34); solid(.22,1.98,-RZ,-2.02);
    thing('桌子',deskX,1.10,deskZ+.10,'桌子上有一个手机。','There is a phone on the desk.',
      'Where you will fill in job applications you cannot fully read.',{focus:[deskX,-1.55],reach:1.5});

    box(.70,.792,deskZ+.02,.46,.035,.32,col.steel,{ tag:'电脑',gloss:G.metal });
    box(.70,.813,deskZ+.07,.38,.010,.18,C('#747d84'),{ tag:'电脑',hard:true });
    // Keys and a trackpad in that well. It was a bare grey rectangle, which from the desk camera
    // read as a laptop with its keyboard removed. Three banded rows and a spacebar rather than
    // eighty separate keys: at this distance the rows are what the eye reads anyway, and eighty
    // props for one prop's worth of silhouette is not a trade worth making.
    for (const dz of [.005,.035,.065])
      box(.70,.8205,deskZ+dz,.30,.005,.022,C('#22262a'),{ tag:'电脑',hard:true,gloss:.20 });
    box(.70,.8205,deskZ+.092,.14,.005,.014,C('#22262a'),{ tag:'电脑',hard:true,gloss:.20 });
    box(.70,.8195,deskZ+.125,.10,.004,.052,C('#9aa2a8'),{ tag:'电脑',hard:true,gloss:.30 });
    // A mouse, and the two leads that were missing. The power cord runs off the back of the desk
    // and out of sight, which is where the room's one socket would be.
    ball(1.14,.8115,deskZ+.10,.042,.024,.058,C('#e2ded4'),{ tag:'电脑',ry:-.12,gloss:.32 });
    box(1.14,.8305,deskZ+.075,.010,.006,.018,C('#5c6369'),{ tag:'电脑',hard:true,gloss:.26 });
    capsule(1.03,.7935,deskZ+.048,.006,.13,.006,C('#2b2f36'),{ rz:Math.PI/2,ry:.34,gloss:.20 });
    capsule(.92,.7935,deskZ+.010,.006,.10,.006,C('#2b2f36'),{ rz:Math.PI/2,ry:-.42,gloss:.20 });
    capsule(.44,.7935,deskZ-.07,.006,.12,.006,C('#2b2f36'),{ rz:Math.PI/2,ry:1.05,gloss:.20 });
    capsule(.38,.7935,deskZ-.23,.006,.18,.006,C('#2b2f36'),{ rx:Math.PI/2,ry:.14,gloss:.20 });
    // The lid hinges on the back edge of the base: shut when you are not working, and it
    // swings up as you sit down to it.
    const lid = [
      box(.70,.91,deskZ-.12,.44,.025,.30,col.steel,{ tag:'电脑',rx:-1.18,gloss:G.metal }),
      // The lid's outer face is what you see from most of the room; unbadged it is a blank slab.
      box(.70,.918,deskZ-.132,.075,.010,.075,C('#8d959b'),{ tag:'电脑',rx:-1.18,hard:true,gloss:.30 }),
    ];
    const screen = box(.70,.92,deskZ-.105,.38,.012,.24,C('#2b485b'),
      { tag:'电脑',rx:-1.18,mode:1,glow:.35,hard:true });
    emitter('laptop', [screen], .30);
    mover('laptop', [...lid, screen],
      v => piv(.70,.795,deskZ-.135, M.rotX(1.16 * (1 - v))));
    thing('电脑',.70,1.15,deskZ-.10,'我用电脑找工作。','I use the computer to look for work.',
      'Job listings are in Chinese. Of course they are.',{focus:[.70,-1.55],reach:1.4});

    box(1.66,.796,deskZ+.13,.16,.025,.30,col.black,{ ry:.42,tag:'手机',gloss:.46 });
    box(1.66,.812,deskZ+.13,.135,.007,.26,C('#78c8aa'),{ ry:.42,tag:'手机',mode:1,glow:.36,hard:true });
    // The message the thing text quotes, actually on the screen. It was a plain green rectangle,
    // while the label beside it said in so many words that the landlord had just texted about the
    // rent — the one screen in the flat whose content the player is told and cannot see.
    // `pAt` turns a position on the screen (u across, v down its length) into world xz, because the
    // handset lies at .42 radians and everything on it has to follow that.
    const pAt = (u, v) => [1.66 + Math.cos(.42) * u + Math.sin(.42) * v,
                           deskZ + .13 - Math.sin(.42) * u + Math.cos(.42) * v];
    const [sbx, sbz] = pAt(0, -.113);
    box(sbx,.8175,sbz,.125,.004,.013,C('#2e6b57'),{ ry:.42,hard:true,mode:1 });
    const [b1x, b1z] = pAt(-.008, -.055);
    box(b1x,.8175,b1z,.104,.004,.056,C('#f4f7f3'),{ ry:.42,hard:true,mode:1 });
    flatText(b1x,.8205,b1z,.42,'房租',{ size:.036, gap:.006, color:C('#2b2f36'), mode:1 });
    const [b2x, b2z] = pAt(.020, .040);
    box(b2x,.8175,b2z,.072,.004,.040,C('#4fae86'),{ ry:.42,hard:true,mode:1 });
    const [b3x, b3z] = pAt(-.022, .105);
    box(b3x,.8175,b3z,.058,.004,.030,C('#f4f7f3'),{ ry:.42,hard:true,mode:1 });
    thing('手机',1.66,1.00,deskZ+.13,'房东给我发短信了。','The landlord sent me a text message.',
      '「房租明天到期。」 — Rent is due tomorrow. You have ¥5,000.',{focus:[1.66,-1.55],reach:1.3});

    taper(.38,.785,deskZ-.18,.20,.045,.20,col.charcoal,{ tag:'台灯',gloss:G.metal });
    // The rocker switch, on the side of the foot rather than the top of it: the foot is a cone that
    // narrows to .036 across at the top, so a switch laid up there would have floated off the edge
    // of it. Its own flex runs off the back of the desk, because a lamp the 灯 verb switches on
    // ought to be plugged into something.
    box(.38,.788,deskZ-.112,.032,.018,.014,C('#1f2327'),{ tag:'台灯',hard:true,gloss:.28 });
    box(.38,.793,deskZ-.117,.014,.007,.008,C('#c9c8c3'),{ tag:'台灯',hard:true,gloss:.30 });
    capsule(.36,.7935,deskZ-.27,.005,.15,.005,C('#2b2f36'),{ rx:Math.PI/2,ry:-.10,gloss:.20 });
    capsule(.38,1.00,deskZ-.18,.032,.43,.032,col.charcoal,{ tag:'台灯',gloss:G.metal });
    capsule(.42,1.19,deskZ-.12,.032,.18,.032,col.charcoal,{ tag:'台灯',rz:-.72,gloss:G.metal });
    taper(.48,1.26,deskZ-.06,.25,.18,.25,col.cream,{ tag:'台灯',rx:-.28,gloss:.16,glow:.20 });
    ball(.47,1.18,deskZ-.02,.065,.055,.065,C('#ffe8bd'),{ tag:'台灯',mode:1,glow:.62 });
    // The desk lamp, which is the light you actually read by — a tighter, nearer pool than the
    // standard lamp across the room, so a smaller radius rather than a dimmer bulb.
    B.light(.47,1.14,deskZ-.02,[1.00,0.88,0.68],.50,1.15);
    glow(M.trs(.42,.76,deskZ-.08,0,1.05,1,.86),C('#ffd696'),.31);
    thing('台灯',.43,1.47,deskZ-.08,'开灯，房间太黑了。','Turn on the lamp — the room is too dark.',
      '开 kāi turns things on: 开灯, 开门, 开电视.',{focus:[.38,-1.55],reach:1.3});

    // ================================================================ 椅子 desk chair
    // It was a four-legged dining chair pulled up to a computer desk. This is the chair that comes
    // with the desk: a five-star base on casters, a gas column, a back on two stays and a pair of
    // armrests. The one number here that is not free is the height of the seat — the sitting pose in
    // game.js drops the body at seatY .50, so the pad and its crown both finish at exactly .50, and
    // neither may be raised to make room for anything.
    const chairX=1.12, chairZ=-1.72;
    for (let i=0;i<5;i++) {
      // rotY(-a) turns each arm's own long axis onto (cos a, 0, sin a), which is what makes the star
      // radiate. Without it all five boxes lie the same way and only their centres fan out, which
      // reads as a pile of sticks under the chair rather than a base.
      const a = i / 5 * Math.PI * 2 + .35, ca = Math.cos(a), sa = Math.sin(a);
      box(chairX+ca*.135,.048,chairZ+sa*.135,.21,.042,.052,C('#2e3338'),
        { tag:'椅子',ry:-a,hard:true,gloss:.34 });
      cyl(chairX+ca*.235,.028,chairZ+sa*.235,.026,.024,col.black,
        { rx:Math.PI/2,ry:-a,tag:'椅子',gloss:.30 });
    }
    cyl(chairX,.145,chairZ,.043,.17,C('#3a4046'),{ tag:'椅子',gloss:.40 });
    cyl(chairX,.29,chairZ,.028,.30,col.steel,{ tag:'椅子',gloss:G.metal });
    box(chairX,.415,chairZ,.17,.055,.21,C('#2e3338'),{ tag:'椅子',hard:true,gloss:.32 });
    box(chairX,.470,chairZ,.46,.060,.44,col.charcoal,{ tag:'椅子',mode:7,gloss:G.fabric });
    box(chairX,.482,chairZ-.01,.41,.036,.39,C('#3b4249'),{ tag:'椅子',mode:7,gloss:G.fabric });
    for (const s of [-1,1]) {
      capsule(chairX+s*.175,.60,chairZ+.215,.017,.26,.017,C('#2e3338'),
        { rx:-.12,tag:'椅子',gloss:.36 });
      box(chairX+s*.245,.575,chairZ+.02,.042,.15,.09,C('#2e3338'),
        { tag:'椅子',hard:true,gloss:.34 });
      box(chairX+s*.245,.665,chairZ-.01,.052,.034,.23,col.charcoal,
        { tag:'椅子',mode:7,gloss:G.fabric });
    }
    box(chairX,.76,chairZ+.245,.42,.40,.045,col.charcoal,{ tag:'椅子',rx:-.12,mode:7,gloss:G.fabric });
    capsule(chairX,.615,chairZ+.225,.028,.40,.028,C('#2e3338'),
      { rz:Math.PI/2,tag:'椅子',gloss:.34 });
    shade(chairX,chairZ,.74,.74,.34); solid(.80,1.44,-2.02,-1.42);
    thing('椅子',chairX,1.06,chairZ+.10,'请坐在椅子上。','Please sit on the chair.',
      'It rolls, it swivels, and one caster sticks. Everything here sticks a little.',
      {focus:[chairX,-1.10],reach:1.4});

    // ================================================================ 书架 bookshelf
    const shelfX=2.62, shelfZ=-RZ+.19;
    box(shelfX,.92,shelfZ,1.42,1.86,.35,col.woodM,{ tag:'书架',mode:6 });
    box(shelfX,.92,shelfZ+.035,1.28,1.70,.27,col.woodD,{ tag:'书架',hard:true,mode:6 });
    let seed=20260725;
    const rnd=()=> (seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
    // Spines come from a fixed set of cloth and paperback colours. Picking channels at
    // random gave neon magenta and lime next to each other, and a shelf of highlighter
    // pens was the loudest thing in an apartment of ochre, jade and terracotta.
    const SPINES = [
      '#7c3a30','#96432f','#a75f34','#b8843c','#8f7a35','#5c7040','#3f6b55','#356070',
      '#33445f','#3b3550','#5d3548','#7a4a3c','#4a4642','#2f3236','#cbbca0','#ddd0b6',
    ].map(C);
    const PAGES = C('#ded3bc');
    const spine = () => SPINES[(rnd() * SPINES.length) | 0];
    const FRONT = shelfZ + .175;
    const titleable = [];      // upright volumes broad and tall enough to carry writing
    for (const sy of [.24,.72,1.20,1.68]) {
      // Machined board, so its top stays flat and the books have something to stand on.
      box(shelfX,sy,shelfZ+.04,1.30,.055,.32,col.woodL,{ tag:'书架',hard:true,mode:6 });
      const top = sy + .0275;                    // the surface books actually sit on
      let x=shelfX-.60;
      // A row of identical upright blocks reads as a striped texture. Varying depth, adding
      // the odd gap, a leaning volume and a short flat stack is what makes it read as books.
      while (x<shelfX+.52) {
        const r=rnd();
        if (r<.09 && x>shelfX-.50) { x+=.032+rnd()*.05; continue; }
        if (r<.19) {
          const sw=.14+rnd()*.06, n=2+((rnd()*3)|0);
          for (let k=0;k<n;k++) {
            const d=.20+rnd()*.045, th=.030+rnd()*.012;
            box(x+sw/2,top+k*.036+th/2,FRONT-d/2,sw,th,d,spine(),
              { tag:'书架',hard:true,gloss:G.matte,ry:(rnd()-.5)*.10 });
          }
          x+=sw+.016; continue;
        }
        const w=.055+rnd()*.055, h=.19+rnd()*.15, d=.20+rnd()*.055;
        const lean=r>.86?(rnd()-.5)*.26:0;
        const cs=Math.cos(lean), sn=Math.abs(Math.sin(lean));
        // Pivot is the volume's centre, so a leaning book has to be lifted by however far
        // its low corner swings down, or it sinks through the board.
        const cy=top+h/2*cs+w/2*sn;
        const sc=spine();
        box(x+w/2,cy,FRONT-d/2,w,h,d,sc,{ tag:'书架',hard:true,gloss:G.matte,rz:lean });
        // Remember the ones a title would fit on: standing straight, wide enough for a character
        // and tall enough for two. Titles are written after the shelves are full so they can be
        // spread across the whole case instead of landing on whichever books came first.
        if (!lean && w>.072 && h>.26) titleable.push({ x:x+w/2, cy, h, c:sc });
        // Page block on the taller volumes: from a camera that is nearly always above the
        // shelf, a cream top edge is what separates a book from a painted block.
        if (h>.25) box(x+w/2,cy+h/2-.007,FRONT-d/2-.006,w*.80,.014,d*.90,PAGES,
          { tag:'书架',hard:true,gloss:G.matte,rz:lean });
        x+=w+.008+sn*.34;
      }
    }
    // ---- four spines with writing on them. The case's own sentence is 书架上都是中文书 and every
    // spine on it was blank cloth, in the one piece of furniture whose entire point is that it is
    // covered in characters you cannot read yet. Four rather than forty: a fully lettered shelf
    // reads as a shop display, and picking one candidate per quarter of the list spreads them over
    // all four boards instead of stacking them on whichever books the generator laid down first.
    // Ink comes off the spine's own luminance — dark on the two pale bindings, cream on the dark
    // ones — because a single fixed ink colour vanished completely on half of them.
    ['汉语','词典','北京','中文'].forEach((txt, i) => {
      const b = titleable[Math.min(titleable.length - 1,
        Math.floor((i + .5) * titleable.length / 4))];
      if (!b) return;
      const lum = b.c[0] * .30 + b.c[1] * .59 + b.c[2] * .11;
      B.glyphs(b.x, b.cy + b.h / 2 - .066, FRONT, 0, txt,
        { size:.036, gap:.010, vertical:true, lift:.004, tag:'书架', gloss:G.matte,
          color: lum > .55 ? C('#2f2620') : C('#efe6d4') });
    });
    // A photograph from home on top of the case, leaning back against the wall. The flat had exactly
    // one picture in it, and the top of the bookshelf was the only clear horizontal surface above
    // waist height in the room.
    box(2.05,1.935,-2.680,.20,.155,.016,col.woodD,{ rx:-.14,mode:6 });
    box(2.05,1.933,-2.665,.16,.115,.005,C('#8a9a92'),{ rx:-.14,hard:true,gloss:.22 });
    box(2.05,1.900,-2.648,.05,.030,.010,col.woodD,{ rx:-.14,hard:true,mode:6 });
    shade(shelfX,shelfZ+.05,1.72,.72,.40); solid(1.90,3.34,-RZ,-2.16);
    thing('书架',shelfX,1.99,shelfZ+.20,'书架上都是中文书。','The bookshelf is all Chinese books.',
      'You cannot read any of them yet. That is the point.',{focus:[shelfX,-1.90],reach:1.6});

    // ================================================================ 冰箱 refrigerator — closed, flush, facing the room
    // Built as a carcass with an open front rather than one solid block, so the door can
    // actually swing off it and leave something worth looking at behind.
    const fridgeX=RX-.38, fridgeZ=-1.15, shellC=C('#e7e5df');
    box(fridgeX+.29,.87,fridgeZ,.14,1.74,.78,shellC,{ tag:'冰箱',gloss:.30 });
    for (const s of [-1,1])
      box(fridgeX-.03,.87,fridgeZ+s*.345,.66,1.74,.09,shellC,{ tag:'冰箱',gloss:.30 });
    box(fridgeX-.03,1.695,fridgeZ,.66,.09,.78,shellC,{ tag:'冰箱',gloss:.30 });
    box(fridgeX-.03,.055,fridgeZ,.66,.11,.78,shellC,{ tag:'冰箱',gloss:.30 });
    // Interior: liner, freezer divider, two shelves, and enough food to read as a fridge.
    box(fridgeX+.19,.87,fridgeZ,.10,1.60,.62,C('#b9c4c6'),{ tag:'冰箱',hard:true,gloss:.34 });
    for (const s of [-1,1])
      box(fridgeX+.02,.87,fridgeZ+s*.29,.44,1.60,.05,C('#cdd6d7'),{ tag:'冰箱',hard:true,gloss:.30 });
    box(fridgeX-.02,1.02,fridgeZ,.60,.055,.62,C('#e9edec'),{ tag:'冰箱',hard:true,gloss:.30 });
    for (const y of [.42,.72]) box(fridgeX-.02,y,fridgeZ,.58,.022,.60,col.glass,
      { tag:'冰箱',hard:true,alpha:.55,gloss:G.glass });
    box(fridgeX+.02,.55,fridgeZ-.20,.11,.24,.11,C('#dae6f0'),{ tag:'冰箱',gloss:.32 });   // milk
    box(fridgeX+.02,.545,fridgeZ-.20,.113,.07,.113,C('#5f8f92'),{ tag:'冰箱',hard:true });
    cyl(fridgeX+.01,.85,fridgeZ+.16,.052,.24,C('#7a9c5a'),{ tag:'冰箱',gloss:.40 });      // bottle
    cyl(fridgeX+.01,.99,fridgeZ+.16,.020,.05,C('#c9a63f'),{ tag:'冰箱',hard:true });
    box(fridgeX+.03,.48,fridgeZ+.14,.20,.09,.20,C('#c9683f'),{ tag:'冰箱',gloss:.26 });   // takeaway box
    ball(fridgeX-.10,.79,fridgeZ-.16,.052,.052,.052,C('#b8452f'),{ tag:'冰箱',gloss:.30 });
    ball(fridgeX-.10,.79,fridgeZ-.04,.050,.050,.050,C('#7fa03c'),{ tag:'冰箱',gloss:.30 });
    box(fridgeX+.02,1.30,fridgeZ,.30,.14,.34,C('#eef1f0'),{ tag:'冰箱',gloss:.24 });      // freezer bag
    // 鸡蛋 in a paper tray, at the back of the upper shelf where the two pieces of fruit are not.
    // Six of them, in the two-by-three the trays come in. The fridge said 冰箱里没有吃的 while
    // holding milk, a bottle, a takeaway box and fruit; what it was actually missing was eggs.
    // The usable inside of this carcass is narrower than it looks: the liner at the back stands at
    // x 3.26 and the two side liners at z -1.42 and -0.88. Set further back and further left, as it
    // was at first, the tray stuck straight through the left-hand liner and out of the cabinet.
    box(fridgeX-.24,.755,fridgeZ+.02,.13,.055,.235,C('#c9bda6'),
      { tag:'鸡蛋',hard:true,gloss:.12 });
    for (const ix of [-1,1]) for (const iz of [-1,0,1])
      ball(fridgeX-.24+ix*.032,.795,fridgeZ+.02+iz*.070,.026,.022,.026,C('#f0e3cc'),
        { tag:'鸡蛋',gloss:.20 });
    thing('鸡蛋',fridgeX-.24,.92,fridgeZ+.02,'冰箱里有六个鸡蛋。','There are six eggs in the fridge.',
      '鸡 chicken + 蛋 egg. 一个鸡蛋 — counted with 个, like most small things.',
      {focus:[2.40,fridgeZ],reach:1.6});
    // Greens in the bottom of it, wrapped in the newspaper the market gave them in.
    for (const ox of [-.10,-.01,.08])
      capsule(fridgeX+ox,.195,fridgeZ+.04,.042,.24,.042,C(ox<0 ? '#6f9a4a' : '#5f8a41'),
        { rx:Math.PI/2,tag:'冰箱',gloss:.22 });
    box(fridgeX-.01,.19,fridgeZ-.06,.27,.085,.055,C('#d8d2c0'),{ tag:'冰箱',hard:true,gloss:.14 });
    // The door: two panels, seal strip, handles and the magnet, all swinging as one piece.
    const fdoor=[
      box(fridgeX-.375,1.31,fridgeZ,.055,.79,.70,C('#d6d9dc'),{ tag:'冰箱',gloss:.38 }),
      box(fridgeX-.375,.45,fridgeZ,.055,.85,.70,C('#d2d5d8'),{ tag:'冰箱',gloss:.36 }),
      box(fridgeX-.407,.89,fridgeZ,.016,.025,.64,col.grey,{ tag:'冰箱',hard:true }),
      box(fridgeX-.345,1.31,fridgeZ,.020,.66,.56,C('#eceeee'),{ tag:'冰箱',hard:true,gloss:.30 }),
      box(fridgeX-.345,.45,fridgeZ,.020,.72,.56,C('#eceeee'),{ tag:'冰箱',hard:true,gloss:.30 }),
      ...[.55,1.34].map(y => capsule(fridgeX-.425,y,fridgeZ-.25,.035,.38,.035,col.steel,{ tag:'冰箱',gloss:G.metal })),
      // 冰箱贴 and the photograph under it. These were two flat rectangles of colour, gold and
      // linen, on the one surface in a Chinese flat that is always covered: a magnet off somebody's
      // holiday and a photo held by a second one. The characters on the magnet and the little steel
      // disc on the photo are what separate either from a paint swatch. Both belong to the door's
      // array so they swing with it — glyph quads carry no pick box, which the mover allows for.
      box(fridgeX-.408,1.52,fridgeZ+.20,.016,.105,.135,C('#a4341f'),
        { tag:'冰箱',hard:true,gloss:.22 }),
      ...B.glyphs(fridgeX-.416,1.52,fridgeZ+.20,-Math.PI/2,'北京',
        { size:.044,gap:.008,color:col.gold,mode:1,gloss:G.matte,lift:.004,tag:'冰箱' }),
      box(fridgeX-.409,1.13,fridgeZ+.17,.016,.17,.13,col.linen,{ tag:'冰箱',hard:true,gloss:.16 }),
      box(fridgeX-.417,1.125,fridgeZ+.17,.004,.13,.098,C('#7d8f8a'),
        { tag:'冰箱',hard:true,gloss:.20 }),
      cyl(fridgeX-.421,1.205,fridgeZ+.17,.014,.010,col.steel,
        { rz:Math.PI/2,tag:'冰箱',gloss:G.metal }),
    ];
    // Hinged on the far side of the opening, so it swings clear of anyone standing at it.
    mover('fridge', fdoor, v => hingeY(fridgeX-.375, fridgeZ-.39, -1.15*v));
    shade(fridgeX,fridgeZ,1.08,1.12,.43); solid(2.76,RX,-1.60,-.72);
    thing('冰箱',fridgeX,1.90,fridgeZ,'冰箱里没有吃的。','There is nothing to eat in the fridge.',
      'The 超市 downstairs opens at 7. That word will matter tomorrow.',{focus:[2.30,fridgeZ],reach:1.6});

    // ================================================================ 厨房 modular counter + sink
    const counterX=RX-.36, counterZ=.45;
    for (const z of [-.48,.26,1.00]) {
      box(counterX,.43,z,.70,.84,.68,col.woodM,{ tag:'厨房',mode:6 });
      // The middle cupboard is where the pans live, so it opens while you cook.
      const doorParts = [
        box(counterX-.37,.43,z,.055,.72,.59,col.woodD,{ tag:'厨房',mode:6 }),
        capsule(counterX-.41,.57,z,.032,.22,.032,col.gold,{ rz:Math.PI/2,tag:'厨房',gloss:G.metal }),
      ];
      if (z === .26) {
        box(counterX+.02,.16,z,.56,.03,.52,C('#5d4634'),{ tag:'厨房',hard:true,mode:6 });
        cyl(counterX+.06,.26,z-.14,.115,.16,col.steel,{ tag:'厨房',gloss:G.metal });
        cyl(counterX+.04,.22,z+.16,.135,.09,C('#8a5a3c'),{ tag:'厨房',gloss:.30 });
        mover('cupboard', doorParts, v => hingeY(counterX-.37, z-.30, -1.05 * v));
      }
    }
    box(counterX,.885,counterZ,.77,.075,2.38,C('#d4d0c7'),{ tag:'厨房',gloss:.40 });
    box(counterX,.96,1.61,.77,.15,.055,C('#d4d0c7'),{ tag:'厨房',gloss:.38 });

    // A real backsplash and upper cupboards visually anchor the kitchen to the wall. The original
    // run of lower cabinets stopped at the worktop, leaving a broad empty beige panel above every
    // appliance. These are wall-mounted, so the floor and the bathroom route remain untouched.
    const tileX = RX - .036;
    for (let row=0; row<3; row++) for (let i=0; i<7; i++) {
      const z = -.66 + i*.35, y = 1.08 + row*.27;
      box(tileX,y,z,.025,.245,.325,C((row+i)%3===0 ? '#dfd8c9' : '#eee8dc'),
        { tag:'厨房',hard:true,gloss:.30 });
    }
    box(tileX-.012,1.47,.39,.022,.035,2.47,col.teal,{ tag:'厨房',hard:true,gloss:.32 });
    for (const z of [-.48,.26,1.00]) {
      box(RX-.18,2.05,z,.34,.56,.64,col.cream,{ tag:'厨房',mode:6,gloss:G.paint });
      box(RX-.365,2.05,z,.035,.48,.55,C('#ded5c5'),{ tag:'厨房',hard:true,gloss:.22 });
      capsule(RX-.395,2.05,z-.18,.022,.16,.022,col.gold,
        { tag:'厨房',rz:Math.PI/2,gloss:G.metal });
      // A warm strip under each cabinet keeps the counter readable at night.
      box(RX-.35,1.747,z,.10,.025,.48,C('#ffe3ad'),{ tag:'厨房',hard:true,mode:1,glow:.44 });
      glow(M.trs(RX-.48,.92,z,Math.PI/2,.72,1,.48),C('#ffd795'),.10);
    }
    // The rail and everyday tools break up the tiled run without adding floor clutter.
    capsule(RX-.43,1.56,.24,.020,1.55,.020,col.steel,
      { tag:'厨房',rx:Math.PI/2,gloss:G.metal });
    for (const z of [-.24,.12,.48]) {
      capsule(RX-.45,1.45,z,.014,.18,.014,col.steel,{ tag:'厨房',gloss:G.metal });
      cyl(RX-.45,1.34,z,.055,.045,C(z<0 ? '#a65e3e' : '#d8cfbf'),
        { tag:'厨房',rx:Math.PI/2,gloss:.28 });
    }
    box(counterX,.93,-.48,.55,.045,.54,col.charcoal,{ tag:'厨房',gloss:.44 });
    for (const [a,b] of [[-.12,-.12],[.12,-.12],[-.12,.12],[.12,.12]])
      cyl(counterX+a,.958,-.48+b,.069,.018,C('#14171a'),{ tag:'厨房',gloss:.52 });
    // A gas ring that lights, a lid that rattles, and steam once the pot is going.
    // The ring is wider than the base of the pot standing on it, so the flame shows.
    emitter('burner', [
      cyl(counterX-.05,.962,-.55,.150,.006,C('#3f7fd0'),{ mode:1,glow:.60,hard:true }),
      cyl(counterX-.05,.964,-.55,.128,.008,C('#89b8ea'),{ mode:1,glow:.85,hard:true }),
    ], 0);
    // A second ring, unlit. Beijing flats come with two or four and this one had a single burner in
    // the middle of a half-metre hob, which is what made the plate read as unfinished rather than
    // small. The small ring is the 小火 one and nothing stands on it; the four dark studs already
    // there fall between the two rings and now read as the trivet they always were.
    // The pan supports are .05 long and no longer: the plate is .54 front to back and the big ring
    // already takes .30 of it, so a finger any longer than this either overhung the front lip of the
    // hob or reached back into the big ring's flame.
    cyl(counterX-.08,.958,-.30,.062,.016,C('#14171a'),{ tag:'厨房',gloss:.52 });
    cyl(counterX-.08,.968,-.30,.088,.008,C('#2a2f34'),{ tag:'厨房',hard:true,gloss:.40 });
    for (let i=0;i<3;i++) {
      const a = i / 3 * Math.PI * 2 + .5;
      box(counterX-.08+Math.cos(a)*.062,.964,-.30+Math.sin(a)*.062,.050,.010,.020,C('#1b1f23'),
        { tag:'厨房',ry:-a,hard:true,gloss:.44 });
    }
    // The pot is a cylinder rather than a cone now. As a taper its mouth came out .083 across while
    // its own lid was .23 — a lid nearly three times the width of the pot it sits on — and there
    // was no opening to see anything through. Straight-sided is also what a 汤锅 actually is.
    cyl(counterX-.05,1.025,-.55,.115,.16,col.steel,{ gloss:G.metal });
    cyl(counterX-.05,1.100,-.55,.118,.012,C('#8d959b'),{ gloss:G.metal });
    // Something in it. Broth to just under the rim and four 饺子 sitting in it, so the lid coming
    // off during 做饭 shows a meal rather than an empty pan.
    cyl(counterX-.05,1.058,-.55,.100,.014,C('#d8c48d'),{ gloss:.34 });
    for (const [ox,oz] of [[-.045,-.030],[.038,-.038],[.010,.032],[-.030,.050]])
      ball(counterX-.05+ox,1.072,-.55+oz,.030,.020,.024,C('#f2ead6'),{ gloss:.16 });
    // The lid lifts .045 while it rattles, not .010. At the old height nothing could be seen under
    // it even wide open, which is a fair description of a lid that does not lift.
    mover('potlid', [cyl(counterX-.05,1.112,-.55,.115,.025,col.charcoal,{ gloss:G.metal })],
      v => M.mul(M.trans(0,.045*v,0), piv(counterX-.05,1.112,-.55, M.rotZ(.07*v))));
    steamRig('pot', [counterX-.05,1.16,-.55]);
    capsule(counterX-.20,1.02,-.55,.035,.30,.035,col.charcoal,{ rz:Math.PI/2,gloss:G.metal });
    // 电饭锅 the rice cooker, moved off the hob plate onto the worktop beside it, since an electric
    // cooker standing on a gas ring is a thing no kitchen has ever contained. It was a blank white
    // cone; a rice cooker is a drum with a domed lid, a handle, a black plinth and a light on the
    // front that says it is keeping warm.
    cyl(counterX+.08,1.005,-.04,.105,.165,C('#eceae3'),{ tag:'厨房',gloss:.40 });
    cyl(counterX+.08,.930,-.04,.110,.020,col.charcoal,{ tag:'厨房',gloss:.34 });
    ball(counterX+.08,1.090,-.04,.104,.045,.104,C('#f4f2ec'),{ tag:'厨房',gloss:.44 });
    cyl(counterX+.08,1.128,-.04,.020,.022,col.grey,{ tag:'厨房',gloss:G.metal });
    capsule(counterX+.08,1.115,-.04,.014,.19,.014,col.charcoal,
      { rz:Math.PI/2,ry:.4,tag:'厨房',gloss:.30 });
    box(counterX-.03,.985,-.04,.006,.016,.016,C('#e06a4a'),{ tag:'厨房',hard:true,mode:1,glow:.30 });

    box(counterX,.925,1.03,.58,.055,.56,col.steel,{ tag:'水池',gloss:G.metal });
    box(counterX,.895,1.03,.46,.07,.44,C('#838c94'),{ tag:'水池',gloss:G.metal });
    capsule(counterX+.22,1.08,1.03,.034,.30,.034,col.steel,{ tag:'水池',gloss:G.metal });
    capsule(counterX+.13,1.22,1.03,.034,.20,.034,col.steel,{ rz:Math.PI/2,tag:'水池',gloss:G.metal });
    // Dirty bowls: they drop out of sight into the cupboard once you have washed up, and
    // come back the next time you cook.
    mover('dishes', [
      taper(counterX-.05,.95,1.10,.13,.07,.13,col.white,{ tag:'水池',gloss:.38 }),
      taper(counterX+.04,.95,.95,.14,.065,.14,C('#e0dbcf'),{ tag:'水池',gloss:.38 }),
      cyl(counterX-.02,.99,1.02,.055,.11,C('#b8c2c6'),{ tag:'水池',gloss:.36 }),
    ], v => M.trans(0, -.55 * (1 - v), 0));
    // 洗洁精 on the worktop to the right of the basin, where the hand that washes up would reach it.
    // The sink's own sentence is about dirty bowls and there was nothing anywhere to wash them with.
    cyl(counterX+.06,.988,1.42,.032,.130,C('#4f9e6a'),{ tag:'水池',gloss:.42 });
    taper(counterX+.06,1.068,1.42,.062,.030,.062,C('#4f9e6a'),{ tag:'水池',gloss:.42 });
    cyl(counterX+.06,1.095,1.42,.009,.028,col.white,{ tag:'水池',gloss:.36 });
    box(counterX+.026,.985,1.42,.004,.070,.046,C('#f2f0e9'),{ tag:'水池',hard:true,gloss:.20 });
    // Running water from the kitchen mixer.
    fader('tapK', [
      cyl(counterX+.04,.98,1.03,.016,.20,C('#bfe0ea'),{ tag:'水池',mode:1,hard:true }),
      cyl(counterX+.04,.905,1.03,.055,.012,C('#dcefF4'.toLowerCase()),{ tag:'水池',mode:1,hard:true }),
    ], .55);
    shade(counterX-.03,counterZ,1.08,2.60,.42); solid(2.76,RX,-.80,1.70);
    thing('厨房',counterX-.24,1.40,-.13,'厨房很小，可是够用。','The kitchen is small, but it is enough.',
      'One burner, one pot, no oven. Very normal here.',{focus:[2.30,-.13],reach:1.6});
    thing('水池',counterX-.24,1.28,1.03,'水池里有脏碗。','There are dirty bowls in the sink.',
      'Not yours. They came with the apartment.',{focus:[2.30,1.03],reach:1.6});

    // ================================================================ 垃圾桶 + 背包
    // The bin sits between fridge and bookshelf: the old spot is now the path to the bathroom.
    const binZ = -1.88;
    taper(2.90,.22,binZ,.36,.43,.36,col.grey,{ tag:'垃圾桶',gloss:.28 });
    // Rubbish piles up over the days and is gone the moment you take it down.
    mover('rubbish', [
      box(2.90,.30,binZ,.30,.20,.30,C('#2a2d31'),{ tag:'垃圾桶',hard:true,gloss:.10 }),
      box(2.87,.40,binZ+.04,.16,.10,.14,C('#c8bda6'),{ tag:'垃圾桶',hard:true,ry:.4,gloss:.14 }),
      box(2.95,.39,binZ-.05,.12,.08,.12,C('#9aa39a'),{ tag:'垃圾桶',hard:true,ry:-.3,gloss:.14 }),
    ], v => piv(0, .16, 0, M.scale(1, .12 + .88 * v, 1)));
    // 垃圾袋: the liner, turned down over the rim. Opaque on purpose — a translucent one would have
    // written depth over the rubbish behind it and swallowed it, since the bag surrounds the very
    // thing it is meant to be holding. Built after the rubbish for the same reason.
    cyl(2.90,.398,binZ,.196,.048,C('#dcded9'),{ tag:'垃圾桶',gloss:.34 });
    for (const s of [-1,1])
      ball(2.90+s*.163,.414,binZ+s*.055,.032,.024,.028,C('#e6e8e3'),
        { tag:'垃圾桶',ry:s*.5,gloss:.30 });
    mover('bin', [
      taper(2.90,.43,binZ,.38,.055,.38,col.charcoal,{ tag:'垃圾桶',gloss:.32 }),
      box(2.90,.48,binZ,.18,.10,.17,col.linen,{ ry:.4,tag:'垃圾桶',gloss:.22 }),
    ], v => piv(2.90,.43,binZ+.19, M.rotX(-1.0*v)));
    shade(2.90,binZ,.56,.56,.40); solid(2.70,3.10,-2.08,-1.68);
    thing('垃圾桶',2.90,.70,binZ,'垃圾桶满了。','The trash can is full.',
      'Bins are downstairs by the bike racks.',{focus:[2.40,binZ],reach:1.4});

    const bagX=2.06,bagZ=2.40;
    box(bagX,.28,bagZ,.42,.54,.30,col.navy,{ tag:'背包',mode:7 });
    box(bagX,.27,bagZ-.17,.32,.22,.095,C('#243249'),{ tag:'背包',mode:7 });
    box(bagX,.47,bagZ-.055,.35,.14,.24,C('#334764'),{ tag:'背包',mode:7 });
    box(bagX,.395,bagZ-.222,.23,.022,.015,col.gold,{ tag:'背包',hard:true });
    capsule(bagX,.59,bagZ,.18,.15,.05,C('#243249'),{ rz:Math.PI/2,tag:'背包',mode:7 });
    for (const s of [-1,1]) box(bagX+s*.215,.22,bagZ,.06,.24,.20,C('#293a55'),{ tag:'背包',mode:7 });
    shade(bagX,bagZ,.64,.58,.42);
    thing('背包',bagX,.76,bagZ,'我的背包里有护照和钱。','My passport and money are in my backpack.',
      '¥5,000 and a one-year visa. That is the whole safety net.',{focus:[bagX,1.90],reach:1.3});

    // ================================================================ wall details: AC, clock, poster
    // Shifted clear of the window: at x=-1.40 the unit shared its wall band with the
    // curtain rail and the two intersected.
    const acX = -2.58;
    box(acX,2.32,-RZ+.16,1.05,.33,.27,col.white,{ tag:'空调',gloss:.27 });
    box(acX,2.205,-RZ+.29,.91,.055,.065,C('#c9c8c3'),{ tag:'空调',hard:true });
    for (const o of [-.25,-.10,.05,.20]) box(acX+o,2.205,-RZ+.33,.018,.045,.025,col.grey,{ tag:'空调',hard:true });
    thing('空调',acX,2.57,-RZ+.34,'北京的夏天没有空调不行。','A Beijing summer without air conditioning is impossible.',
      'Remote is missing. It is set to 26°C forever.',{focus:[acX,-1.55],reach:1.9});

    const clockZ=-RZ+.07;
    cyl(.62,2.08,clockZ,.19,.075,col.white,{ rx:Math.PI/2,tag:'钟',gloss:.30 });
    cyl(.62,2.08,clockZ+.043,.16,.022,C('#f7f4ed'),{ rx:Math.PI/2,tag:'钟',mode:1 });
    for (let i=0;i<12;i++) {
      const a=i/12*Math.PI*2, r=.128, long=i%3===0;
      box(.62+Math.sin(a)*r,2.08+Math.cos(a)*r,clockZ+.052,
        long?.014:.009,long?.030:.018,.008,col.charcoal,
        { tag:'钟',mode:1,hard:true,rz:-a });
    }
    // The hands are re-aimed from the in-game clock every frame. Frozen at 12:15 they
    // rendered as a literal letter L on the wall, in a game whose whole HUD is a clock.
    dials.push({ x:.62, y:2.08, z:clockZ, yaw:0, hands:[
      { p: box(.62,2.08,clockZ+.058,.016,.088,.010,col.charcoal,{ tag:'钟',mode:1,hard:true }),
        off:.058, len:.088, w:.016, per:720 },
      { p: box(.62,2.08,clockZ+.064,.012,.130,.010,col.charcoal,{ tag:'钟',mode:1,hard:true }),
        off:.064, len:.130, w:.012, per:60 },
    ] });
    cyl(.62,2.08,clockZ+.070,.015,.012,C('#a4341f'),{ rx:Math.PI/2,tag:'钟',mode:1 });
    thing('钟',.62,2.34,clockZ+.10,'现在几点？','What time is it now?',
      'Numbers and time are the first thing you will actually need on the street.',{focus:[.62,-1.60],reach:1.9});

    // A framed piece of calligraphy: one character, brushed, with the artist's seal beside it.
    // It used to be two abstract rectangles standing in for a picture, which in a flat about
    // learning to read was a missed opportunity.
    box(-2.82,1.67,-RZ+.065,.72,.92,.055,col.woodD,{ mode:6 });
    box(-2.82,1.67,-RZ+.10,.62,.82,.025,col.linen,{ hard:true });
    B.glyphs(-2.80,1.70,-RZ+.115,0,'家',
      { size:.46, color:C('#2a2320'), gloss:G.matte, lift:.006 });
    box(-2.60,1.36,-RZ+.115,.09,.09,.010,C('#a4341f'),{ hard:true,gloss:G.matte });

    // ---- 日历 the wall calendar, over the right-hand end of the desk between the clock and the
    // bookshelf. One framed character was the only thing on four walls of a flat somebody lives in.
    // The month is written out because that is the part worth reading; the days are eight ruled
    // lines rather than thirty-five little boxes, since at two metres the ruling is all the eye
    // takes in and thirty-five props for a grid is not a trade worth making. The date ringed in red
    // is drawn as a red disc with a smaller paper-coloured one over it — there is no ring mesh in
    // the pack that would not need a shader change to get one.
    box(1.52,1.72,-RZ+.030,.34,.46,.020,col.linen,{ hard:true,gloss:.14 });
    box(1.52,1.90,-RZ+.038,.34,.10,.006,C('#a4341f'),{ hard:true,mode:1 });
    B.glyphs(1.52,1.90,-RZ+.042,0,'十月',
      { size:.062,gap:.010,color:col.gold,mode:1,gloss:G.matte,lift:.004 });
    for (let i=0;i<5;i++)
      box(1.52,1.79-i*.070,-RZ+.038,.30,.004,.006,C('#b3aa9c'),{ hard:true,mode:1 });
    for (const ox of [-.10,0,.10])
      box(1.52+ox,1.655,-RZ+.038,.004,.29,.006,C('#c3bbae'),{ hard:true,mode:1 });
    cyl(1.44,1.686,-RZ+.042,.024,.006,C('#a4341f'),{ rx:Math.PI/2,mode:1 });
    cyl(1.44,1.686,-RZ+.045,.016,.006,col.linen,{ rx:Math.PI/2,mode:1 });

    // ================================================================ 灯 ceiling pendant
    cyl(0,H-.035,-.20,.075,.07,col.white,{ gloss:G.paint });
    capsule(0,H-.17,-.20,.032,.30,.032,col.charcoal,{ gloss:G.metal });
    lamp.shade = taper(0,H-.36,-.20,.48,.22,.48,col.cream,{ tag:'灯',gloss:.18,glow:.26 });
    lamp.bulb = ball(0,H-.47,-.20,.10,.09,.10,C('#fff0cd'),{ tag:'灯',mode:1,glow:.86 });
    // Item 316. The sentence used to be the whole of the fault: it said 灯坏了 on the day the
    // repairman had been and gone, because nothing it could read knew any different. `js/faults.js`
    // now holds that fact across a reload, so the fixture asks it — the line the player reads is
    // 报修过 once it has been reported, and stops mentioning the fault at all once it is cleared.
    lampThing = thing('灯',0,H-.04,-.20,'灯坏了，我得修一下。','The light is broken — I have to fix it.',
      'It flickers. The 房东 says he will send someone 明天.',{focus:[0,-.20],reach:2.2});
    lampSaid = null;
    lampFault();

    // ================================================================ 洗手间 the bathroom
    // Built last so the shower glass blends over everything behind it.
    const bcx = (BX0 + BX1) / 2, bcz = (BZ0 + RZ) / 2, bW = BX1 - BX0, bD = RZ - BZ0;

    // ---- shell: tiled floor, own ceiling, three solid walls plus the pierced partition
    flat(bcx, 0, bcz, bW, bD, col.tileF,
      { gloss: .34, mat: 'tile', matScale: .26, matAmt: .24, nrmAmt: .35 });
    props.push({ mesh:'quad', color:col.tile, mode:1, alpha:1,
      m: M.mul(M.trans(bcx, BH, bcz), M.mul(M.rotZ(Math.PI), M.scale(bW, 1, bD))) });
    wall(BX1, BH/2, bcz, bD, BH, -Math.PI/2, col.tileW, { mode:4, mat:'tile', matScale:.22, matAmt:.24, nrmAmt:.35 });
    wall(bcx, BH/2, BZ0, bW, BH, 0, col.tileW, { mode:4, mat:'tile', matScale:.22, matAmt:.24, nrmAmt:.35 });
    wall(bcx, BH/2, RZ, bW, BH, Math.PI, col.tileW, { mode:4, mat:'tile', matScale:.22, matAmt:.24, nrmAmt:.35 });
    wall(BX0, BH/2, (BZ0+DZ0)/2, DZ0-BZ0, BH, Math.PI/2, col.tileW, { mode:4, mat:'tile', matScale:.22, matAmt:.24, nrmAmt:.35 });
    wall(BX0, (DTOP+BH)/2, (DZ0+RZ)/2, RZ-DZ0, BH-DTOP, Math.PI/2, col.tileW, { mode:4, mat:'tile', matScale:.22, matAmt:.24, nrmAmt:.35 });

    // tiled wainscot with a capping stripe, so the walls read as tile rather than plaster
    for (const [x,z,sx,sz] of [
      [BX1-.035, bcz, .06, bD-.03], [bcx, BZ0+.035, bW-.03, .06],
      [bcx, RZ-.035, bW-.03, .06], [BX0+.035, (BZ0+DZ0)/2, .06, DZ0-BZ0-.03],
    ]) {
      box(x, .66, z, sx, 1.32, sz, col.tile, { hard:true, gloss:.30 });
      box(x, 1.35, z, sx*.999, .055, sz*.999, col.tealL, { hard:true, gloss:.34 });
    }
    for (let i=1;i<5;i++) box(BX0+i*bW/5,.008,bcz,.014,.014,bD-.04,col.grout,{ hard:true,gloss:.12 });
    for (let i=1;i<5;i++) box(bcx,.008,BZ0+i*bD/5,bW-.04,.014,.014,col.grout,{ hard:true,gloss:.12 });

    // ---- ceiling light + frosted window: a windowless bathroom would read as a cave
    box(bcx+.05,BH-.05,1.70,.60,.09,.34,col.white,{ mode:1,glow:.55 });
    skyGlass.push(box(5.18,1.88,RZ-.055,.70,.54,.05,col.sky,{ hard:true,mode:1,glow:.12 }));
    for (const [x,y,sx,sy] of [[4.81,1.88,.07,.62],[5.55,1.88,.07,.62],
                               [5.18,1.88,.05,.54],[5.18,2.17,.80,.07],[5.18,1.59,.80,.07]])
      box(x,y,RZ-.085,sx,sy,.06,col.white,{ hard:true,gloss:G.paint });
    glow(M.trs(bcx+.05,.02,1.72,0,2.05,1,1.90),C('#ffe9c8'),.30);
    glow(M.trs(5.18,.02,2.30,0,1.30,1,1.05),C('#dcecf8'),.13,true);

    // ---- 洗手池 vanity and basin
    const vx = 4.22, vz = 1.02;
    box(vx,.34,vz,.66,.68,.44,col.woodM,{ tag:'洗手池' });
    box(vx,.36,vz+.225,.58,.56,.05,col.woodD,{ tag:'洗手池',hard:true });
    capsule(vx,.36,vz+.255,.032,.22,.032,col.gold,{ rz:Math.PI/2,tag:'洗手池',gloss:G.metal });
    box(vx,.715,vz,.72,.07,.48,col.tile,{ tag:'洗手池',gloss:.42 });
    ball(vx,.755,vz+.01,.21,.085,.16,col.porcelain,{ tag:'洗手池',gloss:.44 });
    ball(vx,.765,vz+.01,.17,.065,.125,C('#e3e7e5'),{ tag:'洗手池',gloss:.40 });
    cyl(vx,.755,vz+.01,.022,.02,col.steel,{ tag:'洗手池',gloss:G.metal });
    capsule(vx,.83,vz-.17,.030,.19,.030,col.steel,{ tag:'洗手池',gloss:G.metal });
    capsule(vx,.915,vz-.10,.026,.15,.026,col.steel,{ rx:Math.PI/2,tag:'洗手池',gloss:G.metal });
    fader('tapB', [
      cyl(vx,.845,vz-.02,.014,.16,C('#bfe0ea'),{ tag:'洗手池',mode:1,hard:true }),
      cyl(vx,.772,vz-.02,.050,.010,C('#dcedf3'),{ tag:'洗手池',mode:1,hard:true }),
    ], .55);
    shade(vx,vz+.02,.78,.56,.36); solid(3.88,4.57,BZ0,1.27);
    thing('洗手池',vx,1.02,vz+.04,'洗手池里有水。','There is water in the basin.',
      '厨房的是水池，洗手间的是洗手池 — same 池, different room.',{focus:[4.20,1.72],reach:1.4});

    // ---- 镜子 mirror and its light
    box(vx,1.44,BZ0+.055,.64,.74,.07,col.woodD,{ hard:true,mode:6 });
    box(vx,1.44,BZ0+.095,.55,.65,.02,C('#ccdade'),{ tag:'镜子',hard:true,mode:1,glow:.06 });
    box(vx,1.87,BZ0+.10,.40,.05,.09,col.white,{ mode:1,glow:.50 });
    // The bar was a bright strip that lit nothing. Two additive pools fix it: one standing on the
    // wall in front of the mirror, which is what puts light on a face at the basin, and one lying on
    // the counter under it. The standing one has to be turned to face the room — a light pool is a
    // single-sided quad whose normal is +y, so rotX(π/2) is what stops it being invisible edge-on.
    glow(M.mul(M.trans(vx,1.46,BZ0+.13),
      M.mul(M.rotX(Math.PI/2), M.scale(.80,1,.66))), C('#ffeed2'), .17);
    glow(M.trs(vx,.762,BZ0+.40,0,.86,1,.58), C('#ffeed2'), .16);
    thing('镜子',vx,1.90,BZ0+.14,'镜子里的人是我。','The person in the mirror is me.',
      '子 here is only a noun ending, like the 子 in 椅子 and 桌子.',{focus:[4.20,1.72],reach:1.4});

    // ---- the shelf under the mirror, and what lives on it. A bathroom with a basin, a brush and a
    // bar of soap and nothing else is a hotel bathroom. Opaque rather than the glass one that would
    // be more usual: a transparent shelf writes depth over whatever stands on it and the bottoms of
    // the bottles disappear into it.
    // It stands .16 out from the wall, not .075. Tucked closer, everything on it stood inside the
    // bottom of the mirror frame, whose own box reaches .07 off the tiles and starts at y 1.07.
    box(vx,1.05,BZ0+.16,.58,.022,.13,col.white,{ tag:'洗手池',hard:true,gloss:.36 });
    for (const s of [-1,1])
      box(vx+s*.26,1.032,BZ0+.10,.020,.030,.16,col.steel,
        { tag:'洗手池',hard:true,gloss:G.metal });
    box(3.99,1.069,BZ0+.16,.105,.014,.026,col.charcoal,{ tag:'洗手池',hard:true,gloss:.30 });
    cyl(4.10,1.116,BZ0+.16,.032,.110,C('#e2dcc8'),{ tag:'洗手池',gloss:.40 });
    taper(4.10,1.183,BZ0+.16,.058,.026,.058,C('#e2dcc8'),{ tag:'洗手池',gloss:.40 });
    cyl(4.26,1.089,BZ0+.16,.030,.056,C('#dfe6e4'),{ tag:'洗手池',gloss:.44 });
    cyl(4.26,1.122,BZ0+.16,.033,.012,C('#b9c6c4'),{ tag:'洗手池',gloss:.40 });

    // ---- 牙刷 and 肥皂 on the counter
    taper(4.45,.795,vz+.04,.10,.16,.10,col.white,{ tag:'牙刷',gloss:.36 });
    capsule(4.46,.95,vz+.04,.022,.26,.022,C('#3f8f86'),{ rz:.12,tag:'牙刷' });
    box(4.48,1.08,vz+.04,.032,.05,.022,col.white,{ tag:'牙刷',hard:true });
    thing('牙刷',4.45,1.16,vz+.04,'我的牙刷是新的。','My toothbrush is new.',
      '牙 tooth + 刷 brush. The tube beside it is 牙膏.',{focus:[4.22,1.66],reach:1.3});

    // 牙膏 the tube, which the 牙刷 note has always claimed was "beside it" and never was. On the
    // right-hand end of the shelf, directly over the brush cup. It began on the strip of counter
    // behind the basin, where it looked right and could not be clicked: the basin's own pick box
    // reaches y .84 and a ray from standing height to the counter behind it goes through the bowl
    // first, so every click on the tube came back as 洗手池.
    capsule(4.40,1.085,BZ0+.16,.024,.115,.024,col.white,
      { rz:Math.PI/2,ry:.14,tag:'牙膏',gloss:.30 });
    box(4.40,1.096,BZ0+.16,.115,.014,.020,C('#3f8f86'),{ ry:.14,tag:'牙膏',hard:true,gloss:.26 });
    box(4.345,1.085,BZ0+.168,.014,.036,.028,col.white,{ ry:.14,tag:'牙膏',hard:true,gloss:.28 });
    cyl(4.462,1.085,BZ0+.151,.013,.024,C('#3f8f86'),
      { rz:Math.PI/2,ry:.14,tag:'牙膏',gloss:.34 });
    thing('牙膏',4.40,1.22,BZ0+.20,'牙膏快用完了。','The toothpaste is nearly finished.',
      '牙 tooth + 膏 paste. 刷牙 needs both this and the 牙刷 under it.',
      {focus:[4.36,1.60],reach:1.3});

    // A dish with a well in it, rather than the flat white slab the bar used to sit on: the slab read
    // as a second bar of soap under the first one. Two squashed spheres — the outer one the dish, the
    // inner one the hollow — which is as close to a moulded ceramic dish as the primitives get.
    ball(3.99,.760,vz+.03,.098,.016,.074,col.porcelain,{ tag:'肥皂',gloss:.44 });
    ball(3.99,.767,vz+.03,.078,.010,.056,C('#e4e6e2'),{ tag:'肥皂',gloss:.40 });
    box(3.99,.784,vz+.03,.105,.036,.075,C('#e6d49f'),{ tag:'肥皂',gloss:.22 });
    thing('肥皂',3.99,.94,vz+.03,'肥皂没有了。','The soap is gone.',
      'You will need 超市 — the supermarket — sooner than you thought.',{focus:[4.10,1.66],reach:1.3});

    // ---- 马桶 toilet against the far wall
    const tqx = 5.34, tqz = 2.26;
    taper(tqx,.105,tqz,.30,.21,.34,col.porcelain,{ tag:'马桶',gloss:.40 });
    ball(tqx,.28,tqz,.20,.13,.25,col.porcelain,{ tag:'马桶',gloss:.40 });
    ball(tqx,.385,tqz,.21,.035,.26,col.white,{ tag:'马桶',gloss:.44 });
    ball(tqx,.378,tqz+.02,.145,.03,.185,C('#d8dcda'),{ tag:'马桶' });
    // Lid hinged at the cistern end: up while it is in use, down the rest of the time.
    mover('lid', [
      ball(tqx-.01,.415,tqz,.215,.028,.265,col.white,{ tag:'马桶',gloss:.46 }),
      ball(tqx-.01,.432,tqz,.175,.022,.215,C('#eceeed'),{ tag:'马桶',gloss:.40 }),
    ], v => piv(tqx+.20,.42,tqz, M.rotZ(-1.45 * v)));
    // shoulder joining bowl to cistern, so the tank does not read as a floating box
    box(tqx+.19,.36,tqz,.24,.30,.30,col.porcelain,{ tag:'马桶',gloss:.40 });
    box(BX1-.13,.60,tqz,.22,.62,.46,col.porcelain,{ tag:'马桶',gloss:.40 });
    box(BX1-.13,.93,tqz,.24,.055,.48,col.white,{ tag:'马桶',gloss:.42 });
    cyl(BX1-.13,.965,tqz-.11,.042,.03,col.steel,{ tag:'马桶',gloss:G.metal });
    shade(tqx,tqz,.72,.80,.38); solid(5.02,BX1,1.92,2.60);
    thing('马桶',tqx,.80,tqz,'洗手间里有一个马桶。','There is a toilet in the bathroom.',
      'The room is 洗手间 or 卫生间; this fixture is 马桶.',{focus:[4.52,2.18],reach:1.6});

    // ---- 卫生纸 on the wall beside the cistern, on the hand you would actually reach with. There
    // was no paper anywhere in the flat. The roll is a cylinder lying along x, which is what rz π/2
    // does to it; the loose sheet in front is a flat panel rather than a hanging curve, because a
    // curve would want a mesh nobody else needs.
    box(BX1-.045,.78,1.95,.05,.030,.09,col.steel,{ hard:true,gloss:G.metal });
    cyl(BX1-.13,.78,1.95,.056,.110,col.white,{ rz:Math.PI/2,tag:'卫生纸',gloss:.20 });
    cyl(BX1-.13,.78,1.95,.019,.114,C('#c9c1b2'),{ rz:Math.PI/2,tag:'卫生纸',gloss:.16 });
    box(BX1-.13,.685,1.898,.098,.130,.005,col.white,{ tag:'卫生纸',hard:true,gloss:.18 });
    thing('卫生纸',BX1-.13,.92,1.95,'卫生纸在马桶旁边。','The toilet paper is next to the toilet.',
      '卫生 hygiene + 纸 paper. 手纸 is the other everyday word for it.',
      {focus:[4.90,1.95],reach:1.5});

    // ---- 淋浴 shower in the far corner
    const shx = 5.30, shz = 1.22;
    box(shx,.05,shz,.70,.10,.85,col.porcelain,{ tag:'淋浴',gloss:.46 });
    box(4.975,.09,shz,.05,.18,.85,col.tile,{ tag:'淋浴',hard:true,gloss:.34 });
    cyl(shx,.105,shz,.05,.015,col.steel,{ tag:'淋浴',gloss:G.metal });
    capsule(BX1-.09,1.40,shz,.032,1.05,.032,col.steel,{ tag:'淋浴',gloss:G.metal });
    capsule(BX1-.19,1.95,shz,.028,.22,.028,col.steel,{ rz:-.95,tag:'淋浴',gloss:G.metal });
    taper(BX1-.32,1.86,shz,.17,.07,.17,col.steel,{ rz:-.52,tag:'淋浴',gloss:G.metal });
    cyl(BX1-.10,.98,shz-.30,.055,.05,col.steel,{ rx:Math.PI/2,tag:'淋浴',gloss:G.metal });
    capsule(BX1-.13,1.12,shz-.30,.026,.13,.026,col.steel,{ rz:.5,tag:'淋浴',gloss:G.metal });
    // Water falling from the head, and the room fogging up while it runs.
    fader('shower', [
      cyl(BX1-.36,.98,shz,.105,1.66,C('#cfe6ef'),{ tag:'淋浴',mode:1,hard:true }),
      cyl(BX1-.36,.155,shz,.20,.03,C('#dfeff4'),{ tag:'淋浴',mode:1,hard:true }),
    ], .30);
    steamRig('shower', [BX1-.36,.60,shz], 6, .13, 1.30);
    // 洗发水 and a body wash, standing in the corner of the tray where they would be kicked over
    // twice a week. The shower's own sentence complains about the water pressure and there was
    // nothing in the cubicle to wash with at all. Both stand clear of where the water column falls.
    cyl(BX1-.11,.196,1.56,.036,.192,C('#4d7fa8'),{ tag:'洗发水',gloss:.42 });
    taper(BX1-.11,.305,1.56,.064,.026,.064,C('#4d7fa8'),{ tag:'洗发水',gloss:.42 });
    box(BX1-.11,.328,1.56,.040,.024,.032,C('#eceae3'),{ tag:'洗发水',hard:true,gloss:.36 });
    thing('洗发水',BX1-.11,.44,1.56,'洗发水快没有了。','The shampoo is nearly out.',
      '洗 wash + 发 hair + 水 liquid. The other bottle is 沐浴露, for the rest of you.',
      {focus:[4.90,1.60],reach:1.5});
    cyl(BX1-.21,.180,1.60,.032,.160,C('#b9a6c6'),{ tag:'淋浴',gloss:.42 });
    cyl(BX1-.21,.270,1.60,.020,.024,C('#eceae3'),{ tag:'淋浴',gloss:.36 });
    shade(shx,shz,.78,.92,.30); solid(4.94,BX1,BZ0,1.68);
    thing('淋浴',BX1-.34,1.62,shz,'淋浴的水太小了。','The shower water is too weak.',
      '淋 to pour + 浴 to bathe. The everyday verb is 洗澡 xǐzǎo.',{focus:[4.50,1.60],reach:1.6});

    // ---- 毛巾 towels: three of them, which is what a bathroom that gets used has. One bath towel on
    // the rail, a second on a hook in the gap between the rail and the shower — where the hand coming
    // out of the cubicle actually reaches — and a hand towel folded over the front edge of the vanity.
    // All three wear the same tag, so whichever one is clicked resolves to the same word.
    capsule(4.34,1.46,RZ-.085,.026,.60,.026,col.steel,{ rz:Math.PI/2,gloss:G.metal });
    box(4.34,1.13,RZ-.135,.44,.62,.07,col.teal,{ tag:'毛巾',mode:7,gloss:G.fabric });
    box(4.34,1.41,RZ-.135,.46,.10,.09,col.tealL,{ tag:'毛巾',mode:7 });
    box(4.82,1.515,RZ-.055,.030,.030,.05,col.steel,{ hard:true,gloss:G.metal });
    box(4.82,1.28,RZ-.115,.20,.44,.065,C('#6f9ea1'),{ tag:'毛巾',mode:7,gloss:G.fabric });
    box(4.82,1.485,RZ-.10,.17,.075,.055,C('#8ab4b6'),{ tag:'毛巾',mode:7 });
    box(4.06,.665,vz+.265,.17,.19,.030,C('#7faaad'),{ tag:'毛巾',mode:7,gloss:G.fabric });
    box(4.06,.757,vz+.252,.17,.028,.055,C('#93bcbe'),{ tag:'毛巾',mode:7 });
    thing('毛巾',4.34,1.58,RZ-.18,'毛巾是干净的。','The towel is clean.',
      '干净 clean is the word you want against 脏 dirty.',{focus:[4.34,2.24],reach:1.5});

    // ---- shower screen last: it is the only transparent surface in the room
    box(4.985,1.00,BZ0+.23,.035,1.80,.44,col.glass,
      { tag:'淋浴',hard:true,alpha:.30,gloss:G.glass });

    // ================================================================ 袋子 the takeaway bag
    // One bag for the whole flat, because you can only carry one. Wherever you set it down is
    // where it is: the mover carries the geometry and its pick box from surface to surface,
    // and parks the lot far under the floor while the bag is in your hand, or has been
    // unpacked into the fridge, or has never arrived. The surfaces are named rather than
    // numbered so the game can talk about them — 放在桌子上 is a different sentence from
    // 放在茶几上, and the point of the bag is that you have to say which.
    //
    // The heights are each surface's own top: the desk at .7875, the coffee table at .4275 and
    // the kitchen counter at .9225, all read off the boxes above rather than guessed.
    const BAG_SPOTS = [
      { hz:'桌子', py:'zhuōzi', en:'the desk',            at:[1.25, .7875, -2.30] },
      // The near end of the coffee table: the middle of it is where the cup of tea stands, and
      // a bag set down through a teacup is worse than no bag at all.
      { hz:'茶几', py:'chájī',  en:'the coffee table',    at:[-0.92, .4275, 1.42] },
      { hz:'厨房', py:'chúfáng',en:'the kitchen counter', at:[3.14, .9225, .30] },
    ];
    const bagHome = BAG_SPOTS[0].at;          // built on the desk; every spot is an offset off it
    const bagBody = [
      // A white carrier with a red band round it and the handles knotted over the top, which is
      // what nearly every meal in this city arrives in.
      box(bagHome[0],bagHome[1]+.105,bagHome[2],.235,.21,.155,col.white,
        { tag:'袋子',gloss:.30 }),
      box(bagHome[0],bagHome[1]+.085,bagHome[2],.242,.055,.162,col.red,
        { tag:'袋子',hard:true,gloss:.30 }),
      capsule(bagHome[0],bagHome[1]+.245,bagHome[2],.042,.075,.042,col.white,
        { tag:'袋子',hard:true,gloss:.28 }),
      // Something in it. The bag was a sealed white box with a knot on top, which is a bag-shaped
      // object rather than a bag with dinner in it: the red lid of a soup tub clears the rim on one
      // side, a paper carton corner on the other, and a pair of chopsticks out of the carton. What
      // is in it still does not change with what you ordered — that needs the order itself, which
      // lives in game.js; see the TICKETS note.
      cyl(bagHome[0]-.055,bagHome[1]+.222,bagHome[2]+.012,.052,.020,C('#d94f36'),
        { tag:'袋子',gloss:.34 }),
      box(bagHome[0]+.072,bagHome[1]+.200,bagHome[2]-.020,.070,.100,.070,C('#e8dfcf'),
        { tag:'袋子',hard:true,gloss:.24 }),
      capsule(bagHome[0]+.066,bagHome[1]+.300,bagHome[2]-.026,.006,.170,.006,C('#d8c9a8'),
        { rz:.26,ry:.5,tag:'袋子' }),
      capsule(bagHome[0]+.080,bagHome[1]+.298,bagHome[2]-.014,.006,.165,.006,C('#d8c9a8'),
        { rz:.20,ry:.7,tag:'袋子' }),
    ];
    mover('bag', bagBody, v => {
      const s = BAG_SPOTS[Math.round(v) - 1];
      return s ? M.trans(s.at[0]-bagHome[0], s.at[1]-bagHome[1], s.at[2]-bagHome[2])
               : M.trans(0, -60, 0);
    });
    bagThing = thing('袋子',bagHome[0],bagHome[1]+.34,bagHome[2],
      '袋子里是我的外卖。','My delivery is in the bag.',
      'A 袋子 is any bag. 塑料袋 is the plastic one this is.',
      { focus:[bagHome[0],bagHome[2]],reach:1.4 });
    bagSpots = BAG_SPOTS;
  }

  // The orchestrator: the shell of the building, then every room that has registered itself in
  // FlatFit, then the old flat if those rooms have not furnished the new one yet, then the
  // walkable space of both decks. It is defined above, next to the toolkit it hands out.
  build();

  // Point every dial's hands at the given time. A hand is built pointing up from the pivot, so it
  // is translated half its length off the pivot before being swung round the face; the face's own
  // yaw goes on last, which keeps an angled dial's hands in its own plane. `off` is how far the
  // hand stands off the face along its normal, so the two hands and the boss never fight for the
  // same pixels. A hand with a `fix` angle does not follow the clock at all: that is the little red
  // one on the alarm, and where it points is the time the alarm is set for.
  //
  // The sign is not a typo and must not be "fixed" to match rail.js. A dial laid out in world
  // coordinates is read mirrored when you look at it from the -z side — that is what had nine
  // o'clock pointing at the three on the station clock. Both of the flat's faces look the other
  // way: they sit on the -z side of the room and are read from the +z side, where world +x falls on
  // the viewer's right, so positive angles already run clockwise. Flipping this would break them.
  // ---------------------------------------------------------------- props that keep hours
  //
  // A room fitting whose state is the time of day rather than the frame: a desk lamp that is on
  // overnight, a shutter that is down after closing. `setClockHands` is already called every frame
  // by js/game.js with the clock, and this rides it — but only on the frames where the *hour*
  // changed, which is twice a game-day rather than sixty times a second. Glow and colour only; a
  // band that had to move a matrix would belong on `mover`.
  //
  //   h0 <= h1   on between them          timed(p, 8, 18, ...)
  //   h0 >  h1   on across midnight       timed(p, 21, 6, ...)
  function timed(p, h0, h1, o = {}) {
    const t = { p, h0, h1, on: o.on === undefined ? .28 : o.on, off: o.off === undefined ? 0 : o.off,
                onC: o.onC, offC: o.offC };
    timedProps.push(t);
    return p;
  }
  function applyTimed(t, hh) {
    const on = t.h0 <= t.h1 ? (hh >= t.h0 && hh < t.h1) : (hh >= t.h0 || hh < t.h1);
    t.p.glow = on ? t.on : t.off;
    if (t.onC && t.offC) t.p.color = on ? t.onC : t.offC;
  }

  // ---------------------------------------------------------------- 快递 the lobby's parcel pile
  //
  // The lobby's pile has said 这几个包裹是别人的 unconditionally since it was built, including ten
  // minutes after you ordered something — and the 快递柜 beside it has never received a parcel,
  // because js/game.js teleports the courier straight to your flat door. Both of those are lane
  // 2's to wire; these two are the hooks they need, so the room can answer for its own state
  // instead of narrating a fixed one.
  //
  //   parcel(th, crate, o)  registers the pile's interactable and the one crate that changes
  //   setParcel(mine)       js/game.js calls this when `courier.here` fires or is cleared
  //   setLocker(n, full)    lights one door of the 快递柜 as holding something
  function parcel(th, crate, o) { parcels.push({ th, crate, o }); return th; }
  function setParcel(mine) {
    for (const { th, crate, o } of parcels) {
      th.sentence = mine ? o.mine : o.other;
      th.tr = mine ? o.mineTr : o.otherTr;
      if (crate && o.mineC) crate.color = mine ? o.mineC : o.otherC;
    }
  }
  function locker(p) { lockers.push(p); return p; }
  function setLocker(n, full) {
    const p = lockers[n];
    if (p) p.glow = full ? .22 : .02;
  }

  // ---------------------------------------------------------------- 电梯维修, only while it is true
  //
  // The lobby builds the paper and its glyphs once, because rebuilding text during play would
  // invalidate the scene's batches. They start invisible; the building clock supplies the one
  // outage record that also governs the car. A power cut still stops the car, but it does not turn
  // a repair notice on — 停电 and 电梯检修 are different information for somebody choosing stairs.
  function liftNotice(items, th) {
    const visible = items.filter(Boolean);
    for (const p of visible) { p.alpha = 0; p.liftNotice = true; }
    liftNotices.push({ items: visible, th,
      sentence: th && th.sentence, tr: th && th.tr });
    return th;
  }
  function setLiftOut(day, minutes) {
    const out = day !== undefined && typeof Disrupt !== 'undefined' && Disrupt.liftOut
      ? Disrupt.liftOut(day, minutes) : null;
    const repair = !!(out && out.why && out.why.hz === '电梯检修');
    liftOutNow = out;
    if (repair === liftNoticeOn) return out;
    liftNoticeOn = repair;
    for (const q of liftNotices) {
      for (const p of q.items) p.alpha = repair ? 1 : 0;
      if (q.th) {
        q.th.sentence = repair ? '通知栏贴着电梯维修通知。' : q.sentence;
        q.th.tr = repair ? 'A lift repair notice is posted on the board.' : q.tr;
      }
    }
    return out;
  }

  function setClockHands(mins) {
    const hh = Math.floor((mins || 0) / 60) % 24;
    if (hh !== timedHour) { timedHour = hh; for (const t of timedProps) applyTimed(t, hh); }
    for (const d of dials) {
      const nx = Math.sin(d.yaw), nz = Math.cos(d.yaw);
      for (const h of d.hands) {
        const ang = h.fix === undefined ? (mins % h.per) / h.per * Math.PI * 2 : h.fix;
        h.p.m = M.mul(M.trans(d.x + nx * h.off, d.y, d.z + nz * h.off),
          M.mul(M.rotY(d.yaw), M.mul(M.rotZ(-ang),
            M.mul(M.trans(0, h.len / 2, 0), M.scale(h.w, h.len, h.t || .010)))));
      }
    }
  }

  // ---------------------------------------------------------------- the failing pendant
  // 灯坏了 has been in the light's own sentence since the flat was built, and the light has burned
  // perfectly steadily the whole time. This is the curve: mostly a clean 1, with a stutter every few
  // seconds when two slow sines happen to agree, and only then a fast blink on top. Wobbling all the
  // time reads as a campfire; a bad ballast is steady and then suddenly is not.
  //
  // `t` is in seconds. Nothing in this file calls either of these, because half of the effect is not
  // here: the light the room is actually lit by is `R.setBulb` in game.js, and dimming the shade
  // without dimming that gives a fitting that flickers over a room whose brightness never moves —
  // which looks more broken than the bug. The two lines that finish it are in the TICKETS note.
  // The threshold is what sets how often it happens: at .55 the lamp was misbehaving an eighth of
  // the time, which is a lamp nobody would leave in the ceiling. At .72 it is about one second in
  // twelve, and it dips to a quarter brightness at the worst of it.
  function lampFlicker(t) {
    // And it only misbehaves while it is actually broken. That is the whole difference between a
    // decoration and a fault: the light stops flickering because somebody came and fixed it, not
    // because a timer ran out. `js/faults.js` holds that fact across a reload; before it existed
    // this curve had nothing to ask, which is why it was written and never called.
    //
    // Guarded on the module existing, like the lift refusal above: a harness that loads js/world.js
    // without the fault layer gets a steady lamp rather than a throw.
    lampFault();
    if (typeof Faults === 'undefined' || !Faults.broken('light')) return 1;
    const gate = Math.max(0, Math.sin(t * 0.37) * Math.sin(t * 1.13) - 0.72) / 0.28;
    return 1 - gate * (0.42 + 0.34 * Math.sin(t * 41));
  }

  // Item 316. Three states, and the fixture has to be able to be in the third one: broken and
  // unreported, 报修过 and waiting for the visit, and fixed. `isBroken` and `repairDue` are read
  // off js/faults.js rather than tracked here — this file draws the flat, it does not own its
  // faults — and `lampSaid` keeps it to one comparison a frame.
  function lampFault() {
    if (!lampThing) return;
    const F = typeof Faults === 'undefined' ? null : Faults;
    const isBroken = !!(F && F.broken('light'));
    const repairDue = !!(F && F.reported('light'));
    const state = !isBroken ? 'ok' : repairDue ? 'due' : 'broken';
    if (state === lampSaid) return;
    lampSaid = state;
    if (state === 'ok') {
      lampThing.sentence = '灯修好了，屋里亮堂了。';
      lampThing.tr = 'The light is fixed — the room is bright again.';
      lampThing.note = '修好 xiū hǎo — 好 on the end of a verb is the thing finished and right.';
    } else if (state === 'due') {
      lampThing.sentence = '灯报修过了，说明天来人。';
      lampThing.tr = 'The light is reported. Someone is coming tomorrow.';
      lampThing.note = '报修 bàoxiū — to report a fault. 过 says it is already done.';
    } else {
      lampThing.sentence = '灯坏了，我得修一下。';
      lampThing.tr = 'The light is broken — I have to fix it.';
      lampThing.note = 'It flickers. The 房东 says he will send someone 明天.';
    }
  }
  function setLamp(k) {
    if (!lamp.bulb) return;
    const d = .30 + .70 * k;                    // an unlit bulb is dark glass, not a black hole
    lamp.bulb.color = [lamp.bulbC[0] * d, lamp.bulbC[1] * d, lamp.bulbC[2] * d];
    lamp.bulb.glow = .86 * k;
    lamp.shade.glow = .26 * k;
  }

  // ---------------------------------------------------------------- moving fixtures
  const xf = (m, x, y, z) => [m[0]*x + m[4]*y + m[8]*z + m[12],
                              m[1]*x + m[5]*y + m[9]*z + m[13],
                              m[2]*x + m[6]*y + m[10]*z + m[14]];
  // `v` runs 0 (shut, dark, still) to 1 (wide open, lit, boiling).
  function setPart(name, v) {
    // The F2 front-door leaf sits in an otherwise walkable shell opening. Its collider is the
    // same fixture as its geometry: keep blocking until the swing has cleared most of a body,
    // and restore the barrier as the leaf closes. Updating before the mover's early return also
    // makes a repeated deterministic setPart call repair the collision state.
    if (name === 'frontdoor' && A.frontDoor && A.frontDoor.stop)
      A.frontDoor.stop.open = v >= .72;
    const q = parts[name];
    if (!q || Math.abs(q.v - v) < 3e-4) return;
    q.v = v;
    q.items.forEach((it, i) => {
      const T = q.mat(v, i, it.m0), p = it.p;
      p.m = M.mul(T, it.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      // Pick boxes travel with the panel, or clicking a swung-open door would miss it.
      if (p.ob && it.ob) {
        const w = xf(T, it.ob.x, it.ob.y, it.ob.z);
        p.ob.x = w[0]; p.ob.y = w[1]; p.ob.z = w[2];
        p.ob.ry = it.ob.ry + Math.atan2(T[8], T[0]);
      }
    });
  }
  function setFade(name, v) {
    const q = fades[name];
    if (!q || Math.abs(q.v - v) < 3e-4) return;
    q.v = v;
    for (const p of q.items) p.alpha = q.max * v;
  }
  function setEmit(name, v) {
    const q = emits[name];
    if (!q || Math.abs(q.v - v) < 3e-4) return;
    q.v = v;
    const k = q.dim + (1 - q.dim) * v;
    for (const it of q.items) {
      it.p.color = [it.c[0] * k, it.c[1] * k, it.c[2] * k];
      it.p.glow = it.glow * v;
    }
  }
  // Puffs rise, spread and fade on a loop; `amt` is how hard the source is going.
  function setSteam(name, amt, t) {
    const rig = steam[name];
    if (!rig) return;
    const [sx, sy, sz] = rig.at;
    rig.props.forEach((p, i) => {
      const u = (t * 0.42 + i / rig.props.length) % 1;
      const s = 0.055 + u * 0.17;
      p.m = M.trs(sx + Math.sin(u * 5.5 + i * 2.1) * rig.spread * u,
                  sy + u * rig.rise,
                  sz + Math.cos(u * 4.7 + i * 1.7) * rig.spread * u, 0, s, s * .85, s);
      p.cy = sy + u * rig.rise;
      p.alpha = amt * Math.sin(u * Math.PI) * 0.52;
    });
  }

  // Put the bag on one of the BAG_SPOTS, or nowhere at all with -1. The label travels with it,
  // because a word floating over the desk you took the bag off is a word about nothing.
  function setBag(i) {
    setPart('bag', i + 1);
    // `bagThing` is created by the legacy flat, which the new room system now skips once the
    // FlatFit rooms have furnished enough of the place. So on a fully-roomed build it is null and
    // this threw on the first frame, taking the whole game down before the title screen.
    //
    // Guarded rather than solved: the bag is one of several objects — with `rail` and the window —
    // that the legacy builder used to provide and that a room must now take ownership of. Until
    // one does, the bag simply has nowhere to sit, which is a missing prop rather than a crash.
    if (!bagThing) return;
    const s = bagSpots[i];
    if (s) {
      bagThing.pos[0] = s.at[0]; bagThing.pos[1] = s.at[1] + .34; bagThing.pos[2] = s.at[2];
      bagThing.focus[0] = s.at[0]; bagThing.focus[1] = s.at[2];
      bagThing.reach = 1.4;
    } else bagThing.reach = -1;          // in your hand, or not in the flat at all
  }

  const api = B.finish({
    // `WIN` is the flat's one legacy record; `WINS` is every room's, which is what the renderer is
    // actually driven from. A plain field and not a getter: the array is never reassigned, so the
    // spread in `B.finish` carries the identity and later pushes show through it.
    skyGlass, RX, RZ, H, WIN, WINS, zones, roomAt, setClockHands, setLiftOut, setCity,
    setPart, setEmit, setFade, setSteam, setLamp, lampFlicker, tvGlow, rail,
    setBag, get BAG_SPOTS() { return bagSpots; }, get bagThing() { return bagThing; },
    // The building. `tick` is the one game.js already calls on any scene that has it, and it is
    // what holds `P.lift` at the deck the body is standing on — without it the flat is drawn three
    // metres above a body standing at y 0. The rest mirror the shopping centre's names one for one
    // (js/mall.js), so the save code and the crowd can treat the two buildings the same way:
    // `level()` is the deck you are on, `setFloor(n)` puts you on one, `deckY(n)` is its height.
    // The ride is two halves, because pressing a button on the landing and picking a floor inside
    // the car are two different things you do minutes apart: `callLift()` fetches the car to where
    // you are and opens it, `goFloor(n)` takes you somewhere once you are in it. `liftState()` is
    // what the panel reads to know which rows to grey out.
    tick, setFloor, deckY, callLift, goFloor, liftState, aboard, rideFloor, DECK, CAR: A.CAR,
    // The other way up. `goStair(+1)` / `goStair(-1)` is one flight, refused for the same reasons
    // `goFloor` refuses — an unbuilt deck, or a car already moving — and it is what makes a
    // 停电 or a broken lift survivable rather than a floor nobody can reach. STAIR_DECKS is
    // exported so a harness can assert the stair serves what the shaft serves.
    goStair, STAIR_DECKS, STAIR, STAIR0,
    // What the indicators actually read. This is NOT `rideFloor`: that answers "which deck do I
    // hand the rider when this ride ends" and, called with no arguments, returns the deck the body
    // is standing on — so a harness sampling it across a 1 to 9 ride sees 0 then 9 and reports the
    // indicator jumping. That was a fact about `rideFloor`, not about the sign in the car.
    // js/home-lift.js reads its display straight off the car's height, and this is the same
    // arithmetic, exported so the one thing everybody notices in a lift can be asserted.
    shownFloor: () => 1 + (CAR.y - DECK[0]) / STOREY,
    setParcel, setLocker,
    roomBoxes, FLAT, CORR, LOBBY, STOREY, FLOORS,
    // For the floor builders and for .towercheck.js: which decks actually have something on them.
    deckLive, decks: () => { const o = []; for (let n = 0; n <= FLOORS; n++) if (deckLive(n)) o.push(n); return o; },
    // A floor builder registers its own walkable zone and its room box through these rather than
    // reaching into the shell. `zone` is what `clampMove` keeps the body inside on that deck.
    addZone: (f, q) => { (ZONE[f] || (ZONE[f] = [])).push(q); return q; },
    setDeckH: (f, h) => { DECK_H[f] = h; },
    level: () => floor,
    // A little more peripheral room than the generic interior lens. It exposes both sides of a
    // doorway sooner, so the flat needs less panning without turning the room into a fisheye view.
    camera: { fov: .96 },
    indoor: true, cutaway: true, near: .05, far: 60,
    // Where the body stands after coming in through the front door.
    spawn: { x: 2.30, z: 1.90, yaw: Math.PI * 0.85 },
  });
  // Arriving is the one moment the deck has to be re-stated. `spawn` above is inside the flat, and
  // game.js zeroes `P.lift` on every travel — so walking out of the lobby to the alley and coming
  // back would otherwise drop you into the flat's floor plan at the lobby's height, inside the
  // lobby ceiling. `resolveMats` is called by game.js on arrival at a place and nowhere else,
  // which makes it the arrival hook; the original still runs, since it is what uploads the
  // textures of a scene built before there was a GL context.
  const resolveMats0 = api.resolveMats;
  api.resolveMats = () => { if (resolveMats0) resolveMats0(); setFloor(2); };

  // How wide a contact crease is, per deck — and it has to be a property on the finished object
  // rather than a field in the extras above, because `B.finish` spreads those and a getter in a
  // spread is read once and frozen.
  //
  // The number is in *screen* units, so what it costs in metres depends on how far away the
  // surface is, and the indoor default of 0.26 is tuned for a room you cross in four paces. The
  // lobby is 12 by 10.3 with a far plane at 60, which is the case js/mall.js documents at its own
  // `aoRadius`: at that scale the pass reaches across metres of plaster and resolves as soft grey
  // blotches instead of creases. 0.10 is just under the mall's own 0.13.
  //
  // It is worth being clear that this is *not* what caused the ghost of the flat over the lift
  // doors — that was the flat's shadow decals drawing through the lobby ceiling, and it is fixed
  // where decks are switched. Turning AO off also made the ghost go away, which is exactly the
  // kind of coincidence that gets the wrong thing blamed.
  //
  // Only the lobby is re-tuned. Your floor is now 12 by 8.2 and very probably wants the same
  // treatment, but that is nine other people's room and their shots are all taken at the default.
  // `aoAmt` is not a lever at all: game.js forwards `scene.aoRadius` and nothing else, so the
  // amount js/mall.js sets has never reached the shader either.
  Object.defineProperty(api, 'aoRadius', { get: () => (floor === 0 ? .10 : undefined) });
  // No bag until one is carried in — and after `finish`, not before it, so the props are
  // measured where they were built rather than at the bottom of the world.
  setBag(-1);
  return api;
});
