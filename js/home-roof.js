// 屋顶 — F12, the roof. Deck 12, y = 34.10.
//
// Registered into FlatFit (declared at the top of js/world.js). See TOWER.md for the deck contract
// and APARTMENT.md for the footprint. Every height in here is written off `A.y0`, which is the
// deck this builder was called for; there is not one hardcoded 34.10 below.
//
// ---------------------------------------------------------------- what this floor is for
//
// It is the only place in the building that is outdoors, and that is the whole assignment. Eleven
// floors of this tower are corridors and other people's front doors. This one is the payoff: you
// ride up thirty-four metres, the doors open, and the city is there.
//
// So the file is in two halves and the first is the bigger one:
//
//   1. THE VIEW. A ring of sky, a plain of smog, the 小区 you live in laid out below, and a far
//      skyline. All of it built through `A.sky` and `A.city`, which are the two lists js/game.js
//      repaints every frame — `World.setCity(dl.city, …)` for the three skyline layers and
//      `dl.glass` for the sky panes. That is the difference between a view and a painted
//      backdrop: at half past six the horizon goes peach, the lit windows in the blocks below
//      come up, and none of it is animated here. It falls out of joining the right list.
//   2. THE ROOF ITSELF. What is actually on a Beijing residential roof, which is mostly laundry.
//
// ---------------------------------------------------------------- three things worth knowing
//
// **The scene is `indoor: true`.** That is a property of the whole home scene and not of a deck,
// so up here the renderer still believes it is in a room: `R.dome` is never called, the clear
// colour is `dl.bg` (very nearly black at noon), there is no weather and no cast sun, and the sun
// term is shaped by the 客厅 window through `beam()` — which evaluates to zero at this height, so
// daylight arrives at about 0.47 of full. Every one of those is a line in js/world.js that this
// file is not allowed to touch. So the sky here is *geometry I own*, drawn in `mode: 1` (the
// unlit shade), rather than the engine's sky dome. See ROOF_VISTA in the report: if the Surgeon
// makes `indoor` per-deck, the ring below comes out and `R.dome` does it better.
//
// **The far plane is 60 m.** Nothing in the view may be further than that from any position the
// camera can reach, or it is clipped and the sky has a hole in it. The eye gets to roughly 12 m
// off the building's centre line, so the ring stands at 30 m and its lowest course at y 6: worst
// case 42 m out and 30 down, which is 51.6 — comfortably inside.
//
// **Everything opaque here batches.** js/build.js groups props by mesh and mode, so the five
// hundred boxes of the city are three or four instanced draw calls rather than five hundred,
// which is what makes a view this size affordable in a scene that is also drawn from every other
// deck. See-through props are the one thing it cannot batch, so the graded haze is deliberately
// held to eight-sided rings.
const HomeRoof = { built: false };

FlatFit['roof'] = A => {
  if (!A || typeof A.box !== 'function') {
    console.warn('home-roof: toolkit A missing — the roof is not built');
    return HomeRoof;
  }

  const box = A.box, cyl = A.cyl, ball = A.ball, cap = A.cap || A.box;
  const taper = A.taper || A.box, flat = A.flat, wall = A.wall;
  const glyph = A.glyph || (() => []);
  const stop = A.stop || (() => null);
  const th = A.th || (() => null);
  const shade = A.shade || (() => null);
  const glow = A.glow || (() => null);
  const light = A.light || (() => null);
  const mover = A.mover || (() => null);
  const skyReg = typeof A.sky === 'function' ? A.sky : p => p;
  const cityReg = typeof A.city === 'function' ? A.city : (l, p) => p;
  const C = A.C, M = A.M, MAT = A.MAT || {}, G = A.G || { metal: .62, matte: .05 };

  // Where this file's props start in the scene's list. Everything from here to the end of the
  // builder is roof geometry, and the last thing the builder does is opt all of it out of the
  // wall cutaway — see `no cutaway up here` at the foot of this file, which is what lets the
  // deck carry more than one zone without the parapet blinking.
  const P0 = (A.props && A.props.length) || 0;

  const Y = A.y0;                                  // the deck. Never a literal.
  const X0 = -6.0, X1 = 6.0, Z0 = -5.0, Z1 = 6.2;  // the building, from the shared brief
  const LIFT = A.LIFT, LIFT_B = A.LIFT_B;

  const PAR = 1.06;                     // parapet, deck to the top of the coping
  const PT  = 0.22;                     // and how thick it is
  const IX  = X1 - PT;                  // inner face of the east/west runs, ±5.78
  const IZ0 = Z0 + PT, IZ1 = Z1 - PT;   // and of the south/north, -4.78 and 5.98

  // The over-runs at the back: the working shaft's, with the opening you step out of, and the
  // second shaft's beside it, sealed. Both written off the shafts rather than off numbers.
  const OA0 = LIFT.x0 - .15, OA1 = LIFT.x1 + .25;   //  1.45 .. 3.65, the working one
  const OB0 = LIFT_B.x0 - .25, OB1 = OA0;           // -0.65 .. 1.45, the sealed one
  const OZ  = 4.86;                                 // their front face, 4 cm proud of the shafts
  const OH  = 2.78, OHB = 2.52;                     // how tall each stands off the deck
  const DW  = 1.30, DH = 2.06;                      // the opening you walk out through
  const DX  = (LIFT.x0 + LIFT.x1) / 2;              // centred on the car, x 2.50
  // The current shell supplies the working landing, moving leaves, call panel and open collider
  // on F12.  This file predates that generalized landing and retains a compatibility version, but
  // only when the toolkit says the shell does not own it.  The machine-room overrun, coping and
  // rooftop equipment remain roof-authored dressing in either case.
  const shellLanding = !!A.shellLanding;
  // The stair head, at the other end of the back edge. The stair itself is not modelled — deck 11
  // is somebody else's file — but a roof you can only reach by lift is not a roof anybody has
  // ever been on, and the door propped open with a brick is half of what a roof looks like.
  const SH0 = -4.60, SH1 = -2.60, SHZ = 4.20, SHH = 2.44;
  const SDX = (SH0 + SH1) / 2, SDW = .95, SDH = 2.02;

  // ---------------------------------------------------------------- palette
  // Local, and every entry a fresh array: js/build.js infers `mode: 6` from colour *identity*
  // against the scene's wood set, so a colour minted here can never be mistaken for timber.
  const cDeck = C('#8e887c'), cDeckD = C('#7a746a');
  const cPar = C('#bbb3a4'), cParIn = C('#a89f90'), cCope = C('#9b9488');
  const cHouse = C('#c2bbac'), cHouseD = C('#a49b8c');
  const cSteel = C('#adb4b9'), cSteelD = C('#798187'), cGalv = C('#9aa2a6');
  const cRustD = C('#6f452c'), cTar = C('#4b4741');
  const cRed = C('#ab3a2b'), cGreen = C('#2f7a4a'), cWhite = C('#eceae2');
  const cBamboo = C('#b99a5e');
  const cLeaf = C('#4b7d43'), cLeafD = C('#33603a'), cSoil = C('#4a3a2c');
  const cFoam = C('#e2ded2'), cTub = C('#3f6f8e'), cTubR = C('#9a4b3c');

  // ART.md's own rows, spelled out rather than aliased off world.js's generic MAT presets. A roof
  // is not a lobby: the screed and the drain surrounds are the `concrete` row (2.9 / .15 / .13),
  // the parapet render is wall plaster, and the bamboo is timber. Written as literals so the
  // coverage sweep can see them — a one-identifier spread (`...METL`) is invisible to it.
  const SLAB = { mat: 'paving',   matScale: 1.10, matAmt: .26, nrmAmt: .30 };
  const PLAS = { mat: 'plaster',  matScale: 2.40, matAmt: .26, nrmAmt: .55 };
  const METL = { mat: 'metal',    matScale: .55,  matAmt: .26, nrmAmt: .50 };
  const CAST = { mat: 'concrete', matScale: 2.90, matAmt: .15, nrmAmt: .30 };
  const TIMB = { mat: 'wood',     matScale: .90,  matAmt: .30, nrmAmt: .32 };

  // ================================================================ 1. THE VIEW
  //
  // Built first, and it matters that it is: js/build.js draws every opaque prop through its
  // instanced batches before it draws the see-through ones in creation order, so the graded haze
  // below only works if it is laid down far to near.
  const R_RING = 33.0;      // where the sky stands
  const GY = -0.60;         // the ground, safely under the lobby's own floor at y 0

  // A ring of flat panels. Boxes rather than `A.wall` quads for two reasons: a box is closed, so
  // there is no way to get the facing backwards and find yourself looking through the sky, and
  // `A.box` hands the prop back — which both `A.sky` and `A.city` need in order to re-tint it.
  // `ry: a` turns each panel's thin axis radial, since rotY maps local +z to (sin a, 0, cos a).
  function ring(r, y0, y1, n, rot, colour, o = {}) {
    const w = 2 * r * Math.tan(Math.PI / n) + (o.overlap || 0), out = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i + .5) * Math.PI * 2 / n;
      out.push(box(Math.sin(a) * r, (y0 + y1) / 2, Math.cos(a) * r, w, y1 - y0, .04, colour,
        { hard: true, mode: 1, ry: a, gloss: 0, alpha: o.alpha }));
    }
    return out;
  }

  // ---- the sky, on `skyGlass`, which js/game.js repaints with `dl.glass` every frame: #c8dcee at
  // noon, #d08a54 at seven in the evening, #2c3f5e at midnight. One even wash of it from y 6 to
  // y 56, and everything below is a modifier laid over the top of that.
  for (const p of ring(R_RING, 6, 56, 12, 0, C('#c8dcee'), { overlap: .5 })) skyReg(p);

  // ---- the zenith. Real sky is darkest overhead and palest at the horizon, and the engine gives
  // one colour per list — so the gradient is three see-through courses of a fixed deep blue, each
  // on its own radius so they never share a plane, each rotated off the last so the eight seams
  // never stack into one visible edge. Eight sides on purpose: transparency is the one thing
  // js/build.js cannot batch, so each of these costs a draw call of its own.
  for (const [r, y0, rot] of [[32.8, 37, .00], [32.6, 43, .39], [32.4, 49, .78]])
    ring(r, y0, 56, 8, rot, C('#20406a'), { alpha: .17 });

  // ---- and the smog under it. Below the horizon the ring is not sky, it is thirty kilometres of
  // Beijing seen edge on, which on most days is a flat white-grey nothing. On the `city` far list
  // so it warms with the skyline instead of staying cold under a sunset.
  //
  // The alphas here were all roughly twice this to begin with, and stacked — smog, plus a horizon
  // band, plus two sheets of ground haze — they came to about 1.4 of white over the middle third
  // of the frame. Everything went the same value: the near blocks, the far towers and the sky were
  // one pale wash and the view had no depth in it at all. Haze reads at a quarter of what it feels
  // like it should be, because it is the *difference* between the layers that says distance.
  for (const p of ring(32.7, 6, 36.6, 8, .20, C('#a9bccd'), { alpha: .26 })) cityReg(0, p);
  // The bright band sitting right on the horizon line, which is the single cue that says "hazy
  // day, and you are looking a very long way". Narrow, and only just there.
  ring(32.0, Y - .4, Y + 2.4, 8, .55, C('#eae4d8'), { alpha: .13 });

  // ---- the ground, thirty-four metres down. A box and not a quad, so it cannot be seen through
  // from below, and set 0.60 m under the lobby's own floor so the two can never fight for pixels.
  cityReg(1, box(0, GY, 0, 72, .06, 72, C('#6e7276'), { hard: true, mode: 1 }));

  // The 小区 you live in, read from directly above: two roads crossing, the courtyard between the
  // blocks, cars nose-in along the kerbs. All of it flat, because from here everything is a plan.
  const road = (x, z, w, d) =>
    cityReg(1, box(x, GY + .05, z, w, .04, d, C('#4a4d51'), { hard: true, mode: 1 }));
  road(0, -19, 64, 7.5); road(21, 0, 7.0, 64); road(-24, 4, 6.0, 64);
  for (let x = -30; x < 30; x += 3.4)
    cityReg(0, box(x, GY + .08, -19, 1.7, .03, .22, C('#c9c6b8'), { hard: true, mode: 1 }));
  for (let z = -30; z < 30; z += 3.4)
    cityReg(0, box(21, GY + .08, z, .22, .03, 1.7, C('#c9c6b8'), { hard: true, mode: 1 }));
  cityReg(0, box(-3.5, GY + .05, 8.5, 15, .04, 11, C('#8d8b82'), { hard: true, mode: 1 }));
  cityReg(1, box(-4.0, GY + .07, 12.5, 9.5, .05, 4.2, C('#4f6b46'), { hard: true, mode: 1 }));

  let vs = 771103;
  const vr = () => (vs = (vs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  // Poplars, which is what every 小区 in this city is planted with. Unlit, because at twenty-five
  // metres a lit tree is a lit sphere and the value is the mass, not the shading.
  for (let i = 0; i < 26; i++) {
    const a = vr() * Math.PI * 2, d = 9 + vr() * 16;
    const tx = Math.sin(a) * d, tz = Math.cos(a) * d, h = 4.4 + vr() * 3.2;
    if (Math.abs(tx) < 8.2 && Math.abs(tz) < 8.0) continue;   // not through our own building
    cyl(tx, GY + h * .34, tz, .16, h * .68, C('#4a3c30'), { mode: 1 });
    ball(tx, GY + h * .82, tz, 1.5 + vr() * .7, 1.7 + vr() * .8, 1.5 + vr() * .7,
      vr() > .5 ? C('#3f6238') : C('#4c7040'), { mode: 1 });
  }
  // Cars. At this distance a car is a coloured tile, and six props each would buy nothing.
  const carCol = ['#2c3138', '#b9bcc0', '#7e838a', '#8d3a33', '#25415e'];
  for (let i = 0; i < 22; i++) {
    const along = -26 + i * 2.45, side = (i % 2) ? -15.4 : -22.6;
    cityReg(1, box(along, GY + .12, side, 1.7, .22, 4.0, C(carCol[i % 5]), { hard: true, mode: 1 }));
  }
  // Street lighting, which does nothing by day and is most of what the view is after dark: on the
  // *lit* list, so `setCity` brings its glow up as the sky goes down.
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399, d = 12 + (i % 5) * 3.4;
    const lx = Math.sin(a) * d, lz = Math.cos(a) * d;
    if (Math.abs(lx) < 8.4 && Math.abs(lz) < 8.2) continue;
    cyl(lx, GY + 3.0, lz, .07, 6.0, C('#6e7278'), { mode: 1 });
    cityReg(2, box(lx, GY + 6.1, lz, .5, .12, .24, C('#ffd9a0'), { hard: true, mode: 1 }));
  }

  // ---- the far skyline: somebody else's district, standing just inside the ring. On the far
  // list, so it is the palest thing in the view — distance in this engine is a value, not a blur.
  for (let i = 0; i < 30; i++) {
    const a = i * (Math.PI * 2 / 30) + vr() * .10, d = 27 + vr() * 5;
    const bx = Math.sin(a) * d, bz = Math.cos(a) * d;
    const w = 2.6 + vr() * 4.4, h = 22 + vr() * 26;
    cityReg(0, box(bx, GY + h / 2, bz, w, h, w * (.6 + vr() * .5), C('#93a7ba'),
      { hard: true, mode: 1, ry: a }));
    if (vr() > .5)
      cityReg(0, box(bx, GY + h + .9, bz, w * .5, 1.8, w * .4, C('#93a7ba'),
        { hard: true, mode: 1, ry: a }));
    if (vr() > .35)
      for (let f = 4; f < h - 3; f += 3.2) if (vr() > .45) {
        const on = vr() > .74;                          // same rule as the near blocks, see below
        const p = box(bx, GY + f, bz, w * .74, 1.0, w * .76,
          C(on ? '#ffd08a' : '#67788a'), { hard: true, mode: 1, ry: a, glow: 0 });
        if (on) cityReg(2, p); else cityReg(0, p);
      }
  }

  // ---- the blocks you are level with, and above.
  //
  // This is the part of the view that says how high you are, and the rule that makes it work is
  // that most of them have to be SHORTER than thirty-four metres. Looking across at other towers
  // is a picture of a city. Looking DOWN onto other people's roofs — their tanks, their solar
  // heaters, their washing — is a picture of this city, and it is the only thing that puts the
  // player thirty-four metres up rather than at ground level in front of a big backdrop.
  // Bearing, distance, width, height. Distances start at eighteen metres, which is what the gap
  // between two towers in a 小区 of this vintage actually is — closer than that and the block
  // opposite fills the whole frame from the parapet, which is a wall and not a view.
  const NEAR = [
    [0.30, 19.0, 11.5, 24.5], [1.05, 23.0, 13.0, 19.0], [1.85, 18.5, 10.5, 30.0],
    [2.55, 25.5, 15.0, 22.5], [3.35, 20.5, 12.0, 27.5], [4.05, 27.0, 11.5, 17.5],
    [4.85, 19.5, 13.5, 33.0], [5.60, 24.0, 10.0, 21.0], [6.05, 28.5, 15.5, 38.0],
  ];
  for (const [a, d, w, h] of NEAR) {
    const bx = Math.sin(a) * d, bz = Math.cos(a) * d, dep = w * .55;
    const rx = Math.cos(a), rz = -Math.sin(a);          // along the block's own long face
    cityReg(1, box(bx, GY + h / 2, bz, w, h, dep, C('#4e6072'), { hard: true, mode: 1, ry: a }));
    // `setCity` gives the whole view exactly three tones — the far list, the near list at 0.70 of
    // it, and the lit windows — and three tones over nine blocks and thirty towers is a stencil.
    // A fixed see-through dark wash over the lower two thirds of each block buys a fourth without
    // needing a fourth list: it darkens whatever tint the block is currently wearing, so it tracks
    // sunset and midnight for free, and it goes where the value belongs anyway, since the bottom
    // of a block is in the shadow of everything around it.
    box(bx, GY + h * .34, bz, w * 1.01, h * .68, dep * 1.01, C('#1b2733'),
      { hard: true, mode: 1, ry: a, alpha: .26 });
    // 客厅 window uses too, and it is what makes a dark block read as a block with a top on it.
    cityReg(0, box(bx, GY + h + .10, bz, w * 1.02, .20, dep * 1.02, C('#98a9b6'),
      { hard: true, mode: 1, ry: a }));
    cityReg(1, box(bx, GY + h + .55, bz, w * 1.02, .55, dep * 1.02, C('#63758a'),
      { hard: true, mode: 1, ry: a }));                 // its own parapet, seen edge on
    cityReg(0, box(bx + rx * w * .28, GY + h + 1.4, bz + rz * w * .28, w * .22, 2.4, dep * .5,
      C('#a3b0bb'), { hard: true, mode: 1, ry: a }));   // their over-run
    for (let t = 0; t < 2; t++) {
      const o = (t - .5) * w * .34;
      cyl(bx + rx * o, GY + h + 1.0, bz + rz * o, .55, 1.5, C('#8e9ba6'), { mode: 1 });
    }
    for (let s = -1; s <= 1; s++) {                     // solar heaters, edge on
      const o = s * w * .22;
      cityReg(0, box(bx + rx * o, GY + h + .95, bz + rz * o, w * .17, .90, dep * .30,
        C('#b8c2c9'), { hard: true, mode: 1, ry: a + .5 }));
    }
    // Two washing lines and eight pale rags, which at this distance is ten props and reads
    // instantly as somebody else's Tuesday.
    for (let l = 0; l < 2; l++) {
      const o = (l - .5) * w * .30;
      cityReg(0, box(bx + rx * o, GY + h + 1.5, bz + rz * o, .05, .05, dep * .74,
        C('#c7d0d6'), { hard: true, mode: 1, ry: a }));
      for (let g = 0; g < 4; g++) {
        const q = (g - 1.5) * dep * .17;
        cityReg(0, box(bx + rx * o - Math.sin(a) * q, GY + h + 1.10, bz + rz * o - Math.cos(a) * q,
          .30, .70, .04, C(g % 2 ? '#e6e6e0' : '#cfd6da'),
          { hard: true, mode: 1, ry: a + Math.PI / 2 }));
      }
    }
    // Balcony bands and lit windows down the face. Six storeys of glazing is what tells you the
    // block is a 板楼 and not a slab of card.
    for (let f = 2.6; f < h - 1.6; f += 2.9) {
      cityReg(1, box(bx, GY + f, bz, w * .96, .16, dep * 1.04, C('#5d7183'),
        { hard: true, mode: 1, ry: a }));
      for (let c = -2; c <= 2; c++) {
        const on = ((c + 7) * ((f | 0) + 1) + (w | 0)) % 4 === 0;   // one flat in four has a light
        const p = box(bx + rx * c * w * .19, GY + f + 1.2, bz + rz * c * w * .19,
          w * .13, 1.1, dep * 1.06, C(on ? '#ffd08a' : '#3d4b59'),
          { hard: true, mode: 1, ry: a, glow: 0 });
        if (on) cityReg(2, p);
      }
    }
  }

  // ---- the high-rises, which are the ones that do the work in a level view.
  //
  // Worth writing down, because the first version of this view got it wrong and the reason is not
  // obvious. Standing on this parapet the eye is at y ≈ 35.6, so the horizon is at y ≈ 35.6, so
  // every block above is *below the sightline* — nine neighbours, none of them taller than 38 m,
  // and looking straight ahead you saw nothing but sky. The city was all there and all under your
  // feet. What a level view actually needs is the handful of things taller than you are, and they
  // have to be near enough and dark enough to read as silhouettes against the sky rather than as
  // more haze. So: ten of them, on the near list, with a wash to darken them further.
  const TALL = [
    [0.55, 28.0,  7.5, 46], [1.30, 30.5,  6.0, 58], [2.15, 27.0,  9.0, 41],
    [2.95, 31.0,  6.5, 64], [3.70, 26.5,  8.0, 44], [4.40, 29.0,  7.0, 52],
    [5.20, 28.5,  9.5, 39], [5.95, 31.5,  6.0, 49], [0.05, 30.0,  8.5, 43],
    [3.20, 32.0, 10.0, 55],
  ];
  for (const [a, d, w, h] of TALL) {
    const bx = Math.sin(a) * d, bz = Math.cos(a) * d, dep = w * .70;
    cityReg(1, box(bx, GY + h / 2, bz, w, h, dep, C('#4e6072'), { hard: true, mode: 1, ry: a }));
    cityReg(0, box(bx, GY + h + .8, bz, w * .40, 1.6, dep * .40, C('#8fa3b4'),
      { hard: true, mode: 1, ry: a }));                   // the plant room on the crown
    // The red obstruction light every one of these carries, which is the only thing in the view
    // that is the same brightness at noon and at four in the morning.
    cityReg(2, box(bx, GY + h + 1.9, bz, .5, .5, .5, C('#e04a38'),
      { hard: true, mode: 1, ry: a, glow: .34 }));
    // The glazing grid down the face. Five columns and a course every 3.1 m, which is the scale a
    // real curtain wall has — the first version used two columns at 22% of the tower's width and
    // the windows came out two metres across, so the tower read as a filing cabinet. Storeys are
    // what give a tower its height, and you only believe them if you can count them.
    // Most of them dark, and one in five on the lit list.
    //
    // A window is not a lamp. Every pane in this view used to be on the `city[2]` list, which is
    // the one `setCity` puts a glow on — and a glow in this renderer goes into the light buffer
    // and comes back as bloom. Six hundred glowing panes is not six hundred lit flats, it is a
    // sheet of milk laid over the whole frame, and it washed the city out at three in the
    // afternoon when almost nobody has a light on. Dark by default is also simply what a window
    // looks like by day: you are seeing into an unlit room.
    for (let f = 4; f < h - 4; f += 3.1)
      for (const c of [-.34, -.17, 0, .17, .34]) {
        const wx = bx + Math.cos(a) * c * w, wz = bz - Math.sin(a) * c * w;
        const on = ((f * 7 | 0) + (c * 100 | 0) + (w | 0)) % 5 === 0;
        const p = box(wx, GY + f, wz, w * .125, 1.7, dep * 1.02,
          C(on ? '#ffd08a' : '#41505e'), { hard: true, mode: 1, ry: a, glow: 0 });
        if (on) cityReg(2, p);
      }
    box(bx, GY + h * .30, bz, w * 1.01, h * .60, dep * 1.01, C('#1b2733'),
      { hard: true, mode: 1, ry: a, alpha: .22 });
  }

  // ---- the haze, laid after all of it.
  //
  // Two horizontal sheets, at 2.6 m and 6.4 m, so distance eats the bottom of everything: the cars
  // go first, then the trees, then the lower storeys, and the far towers stand out of a white
  // floor. Built after the towers on purpose — these are see-through, and see-through in this
  // renderer is the one thing that depends on the order it was made in.
  for (const [hy, r0, r1, al] of [[2.6, 13, 32.5, .26], [6.4, 20, 32.5, .42]]) {
    const m = (r0 + r1) / 2, t = r1 - r0;
    for (const [hx, hz, sw, sd] of [
      [0, m, r1 * 2, t], [0, -m, r1 * 2, t], [m, 0, t, r0 * 2], [-m, 0, t, r0 * 2],
    ]) cityReg(0, box(hx, GY + hy, hz, sw, .04, sd, C('#c6d2dc'),
      { hard: true, mode: 1, alpha: al }));
  }

  // ---- 楼下 the building you are standing on, seen from outside it.
  //
  // This is not decoration, it is a hole being filled. The camera on this deck is a third-person
  // one at 4.4 m: walk to the south parapet, turn round to face the roof, and the eye is five
  // metres out over the courtyard and four metres up. Everything it sees below the roof edge used
  // to be *the inside of the flat on deck 2* — js/world.js builds real exterior walls only on
  // decks 0 and 2, and from outside they are single-sided and invisible, so the tower had no face
  // at all between the lobby ceiling and this parapet. The default camera on this floor was
  // looking straight through eleven storeys of building at somebody's kitchen.
  //
  // Six centimetres outside the shell's own wall planes, so nothing is ever coplanar with them,
  // and lit rather than emissive so it takes the same hour of the day the parapet does.
  const FO = .06;                       // how far out the skin stands
  const FACES = [
    // [centre x, centre z, along x, along z, outward x, outward z, width, detail]
    [0, Z0 - FO, 1, 0, 0, -1, X1 - X0, true],
    [0, Z1 + FO, 1, 0, 0, 1, X1 - X0, false],
    [X0 - FO, (Z0 + Z1) / 2, 0, 1, -1, 0, Z1 - Z0, true],
    [X1 + FO, (Z0 + Z1) / 2, 0, 1, 1, 0, Z1 - Z0, true],
  ];
  const STOREY = A.STOREY || 3.10;
  for (const [cx, cz, ax, az, ox, oz, fw, detail] of FACES) {
    const ry = Math.atan2(-az, ax);
    const at = (u, y, out) => [cx + ax * u + ox * out, y, cz + az * u + oz * out];
    // the wall itself, from the pavement to the underside of the parapet
    let p = at(0, Y / 2, 0);
    box(p[0], p[1], p[2], fw, Y, .12, C('#b6aea0'),
      { hard: true, gloss: .12, mode: 14, ry, ...PLAS });
    // every floor slab showing as a band, which is what a 板楼 facade is made of
    for (let n = 0; n <= 11; n++) {
      p = at(0, n * STOREY, .05);
      box(p[0], p[1], p[2], fw + .04, .20, .16, C('#c8c0b0'),
        { hard: true, gloss: .16, mode: 14, ry, ...PLAS });
    }
    // and the string course under the parapet, so the roof has an eave and not a cut edge
    p = at(0, Y - .16, .10);
    box(p[0], p[1], p[2], fw + .10, .26, .26, C('#a49b8c'), { hard: true, gloss: .22, ...SLAB });
    if (!detail) continue;
    // The top four storeys in full: windows, an enclosed 阳台 on each, and the air-conditioner
    // hung off the wall beside it. Only the top four, because that is as far down as the eye can
    // see past its own parapet, and a hundred and fifty props for a facade nobody leans over is
    // a hundred and fifty props.
    const cols = fw > 11.6 ? [-4.4, -1.5, 1.4, 4.3] : [-3.9, -1.2, 1.5, 4.2];
    for (let s = 0; s < 4; s++) {
      const base = Y - (s + 1) * STOREY;
      for (let c = 0; c < cols.length; c++) {
        const u = cols[c];
        if (c % 2 === 0) {                              // a window
          p = at(u, base + 1.72, .05);
          box(p[0], p[1], p[2], 1.44, 1.50, .10, C('#3a4c58'),
            { hard: true, gloss: .60, mode: 18, ry });
          p = at(u, base + 1.72, .09);
          box(p[0], p[1], p[2], 1.54, 1.60, .06, C('#cfc7b6'),
            { hard: true, gloss: .18, ry });
          // the security grille, which is on every window under the sixth floor and on plenty
          // above it, and which is most of what says this is not an office block
          for (let g = -2; g <= 2; g++) {
            p = at(u + g * .30, base + 1.72, .13);
            box(p[0], p[1], p[2], .035, 1.44, .035, C('#8b8478'), { hard: true, gloss: .30, ry });
          }
        } else {                                        // an enclosed balcony
          p = at(u, base + .95, .34);
          box(p[0], p[1], p[2], 2.10, 1.90, .70, C('#c2bbac'),
            { hard: true, gloss: .14, mode: 14, ry });
          p = at(u, base + 1.55, .70);
          box(p[0], p[1], p[2], 1.94, .90, .06, C('#42545f'),
            { hard: true, gloss: .60, mode: 18, ry });
          p = at(u, base + 2.02, .36);
          box(p[0], p[1], p[2], 2.20, .12, .76, C('#a49b8c'), { hard: true, gloss: .20, ry });
          // somebody's washing pole out over the drop, which from up here you see the top of
          p = at(u - .5, base + 1.30, .82);
          cyl(p[0], p[1], p[2], .028, 1.90, cBamboo, { rz: Math.PI / 2, ry, gloss: .24, mode: 6, ...TIMB });
        }
      }
      // the air-conditioner, on its bracket, dripping down the render below it
      p = at(cols[1] + 1.25, base + 2.10, .30);
      box(p[0], p[1], p[2], .78, .58, .34, C('#cfcabd'), { hard: true, gloss: .24, ry, ...METL });
      p = at(cols[1] + 1.25, base + 1.10, .06);
      box(p[0], p[1], p[2], .50, 1.30, .02, C('#a79d8c'), { hard: true, gloss: .10, ry, alpha: .5 });
    }
  }

  // ================================================================ 2. THE ROOF
  //
  // ---- the deck. Poured screed with 隔热砖 insulating tiles bedded over it, which is the top of
  // every one of these blocks: `mode: 9` lays courses off world x and z, so the grid runs true
  // across twelve metres without a texture. Three quads, because the working shaft is a hole in
  // the back edge that must not be floored over — the car comes up through it.
  const DECKMAT = { hard: true, gloss: .18, mode: 9,
                    mat: 'tile', matScale: 2.20, matAmt: .22, nrmAmt: .34 };
  flat(0, Y + .006, (Z0 + LIFT.z0) / 2, X1 - X0, LIFT.z0 - Z0, cDeck, DECKMAT);
  flat((X0 + LIFT.x0) / 2, Y + .006, (LIFT.z0 + Z1) / 2, LIFT.x0 - X0, Z1 - LIFT.z0, cDeck, DECKMAT);
  flat((LIFT.x1 + X1) / 2, Y + .006, (LIFT.z0 + Z1) / 2, X1 - LIFT.x1, Z1 - LIFT.z0, cDeck, DECKMAT);

  // The fall. A roof is never flat — it is laid to about a 2% fall — and where the water goes is
  // written on it in years of dirt. Two dark washes running to two 地漏 drains, cast iron with a
  // grating over, and the puddle beside each that never quite goes.
  for (const [dx, dz] of [[-3.30, -3.60], [3.10, 1.40]]) {
    box(dx, Y + .012, dz, 4.6, .006, 2.9, cDeckD, { hard: true, mode: 9, alpha: .5, ...SLAB });
    box(dx, Y + .017, dz, 2.4, .006, 1.5, cDeckD, { hard: true, mode: 9, alpha: .6, ...SLAB });
    cyl(dx, Y + .022, dz, .175, .030, cTar, { hard: true, gloss: .30, ...CAST });
    cyl(dx, Y + .036, dz, .145, .016, cSteelD, { hard: true, gloss: G.metal, ...METL });
    for (let i = -2; i <= 2; i++)
      box(dx, Y + .045, dz + i * .055, .26, .008, .022, C('#4c5257'), { hard: true, gloss: G.metal });
    glow(M.trs(dx - .28, Y + .026, dz + .34, .4, 1.5, 1, 1.1), C('#8fa6b4'), .30, false);
    glow(M.trs(dx + .55, Y + .026, dz - .40, .9, 1.0, 1, .8), C('#8fa6b4'), .22, false);
  }

  // ---- 女儿墙 the parapet.
  //
  // This is the thing that must actually stop you, so every run below is backed by a collider on
  // its inner face and there is no way to walk off the roof. The coping stands proud of the render
  // on both sides, because a parapet has a top rather than an edge. The north run is interrupted
  // three times — twice for the lift over-runs and once for the stair head, all of which are part
  // of the building's own back edge.
  const parapet = (x, z, w, d) => {
    box(x, Y + PAR / 2 - .05, z, w, PAR - .10, d, cPar,
      { hard: true, gloss: .14, mode: 14, ...PLAS });
    box(x, Y + PAR - .015, z, w + .09, .09, d + .09, cCope, { hard: true, gloss: .30, ...SLAB });
  };
  const NORTH = [[X0, SH0], [SH1, OB0], [OA1, X1]];
  parapet(0, Z0 + PT / 2, X1 - X0, PT);
  for (const s of [-1, 1]) parapet(s * (X1 - PT / 2), (Z0 + Z1) / 2, PT, Z1 - Z0);
  for (const [nx0, nx1] of NORTH) parapet((nx0 + nx1) / 2, Z1 - PT / 2, nx1 - nx0, PT);
  // The colliders, written off the inner faces and not off the boxes: the coping overhangs, and a
  // collider taken from the coping would leave you standing four centimetres inside a wall.
  stop(X0 - .40, -IX, Z0 - .40, Z1 + .40);
  stop(IX, X1 + .40, Z0 - .40, Z1 + .40);
  stop(X0 - .40, X1 + .40, Z0 - .40, IZ0);
  for (const [nx0, nx1] of NORTH) stop(nx0 - .40, nx1 + .40, IZ1, Z1 + .40);

  // The inner face gets its own skin a centimetre proud, because the render inside a parapet is
  // always in worse condition than the render outside it: it is what the rain runs down.
  const parIn = (x, z, w, d) =>
    box(x, Y + (PAR - .12) / 2, z, w, PAR - .12, d, cParIn,
      { hard: true, gloss: .10, mode: 14, ...PLAS });
  parIn(0, IZ0 + .012, X1 - X0 - .05, .024);
  for (const s of [-1, 1]) parIn(s * (IX - .012), (Z0 + Z1) / 2, .024, Z1 - Z0 - .05);

  // 高空作业注意安全 — "work at height, mind your safety". Stencilled on the parapet in the red
  // every 施工 notice in this country is written in, on the face that turns back into the roof,
  // because that is the only side anybody will ever read it from.
  // Written off `IZ0 + .026` and not off `IZ0`. The inner skin below stands 24 mm proud of the
  // parapet's own face, so text placed on the parapet at a 12 mm lift is *inside* the skin and
  // invisible — which is exactly what happened, and it took a render to notice, because a buried
  // glyph does not warn about anything. Measure against the surface you are actually painting on.
  glyph(-1.10, Y + .70, IZ0 + .026, 0, '高空作业注意安全',
    { size: .30, gap: .07, color: cRed, gloss: .06, lift: .014 });
  glyph(3.30, Y + .66, IZ0 + .026, 0, '注意安全',
    { size: .18, gap: .05, color: C('#8d5f4a'), gloss: .06, lift: .014, tag: '女儿墙' });
  th('女儿墙', -1.10, Y + 1.10, IZ0 + .30, '别靠近女儿墙，很危险。',
    'Stay back from the parapet — it is dangerous.',
    '女儿墙 nǚ’érqiáng, "daughter wall": the low wall round the edge of a roof.',
    { focus: [-1.10, IZ0 + .95], reach: 1.9 });

  // ---- 电梯机房 the lift over-runs.
  //
  // The car climbs 2.24 m above this deck, so the housing over the working shaft has to clear it,
  // and its front face is where you step out. js/world.js now owns the live F12 landing below;
  // this file adds only the real overrun above the shell's corridor-height shaft walls.
  const houseWall = (x, y, z, w, h, d, c) =>
    box(x, y, z, w, h, d, c, { hard: true, gloss: .13, mode: 14, ...PLAS });

  houseWall((OB0 + OB1) / 2, Y + OHB / 2, (OZ + Z1) / 2, OB1 - OB0, OHB, Z1 - OZ, cHouse);
  box((OB0 + OB1) / 2, Y + OHB + .05, (OZ + Z1) / 2, OB1 - OB0 + .10, .10, Z1 - OZ + .10, cCope,
    { hard: true, gloss: .28, ...SLAB });
  stop(OB0, OB1, OZ, Z1 + .40);

  const pw = (DX - DW / 2) - OA0, pe = OA1 - (DX + DW / 2);
  if (!shellLanding) {
    // Compatibility landing: its two jamb masses and head form the opening used before the shell
    // generated a live F12 landing of its own.
    houseWall(OA0 + pw / 2, Y + OH / 2, (OZ + Z1) / 2, pw, OH, Z1 - OZ, cHouse);
    houseWall(OA1 - pe / 2, Y + OH / 2, (OZ + Z1) / 2, pe, OH, Z1 - OZ, cHouse);
    houseWall(DX, Y + (DH + OH) / 2, (OZ + Z1) / 2, DW, OH - DH, Z1 - OZ, cHouse);
  } else {
    // The shell's shaft walls stop at corridor height.  Finish only the genuine overrun above
    // them; rebuilding the lower jambs would sit a second portal over the moving shell doors.
    const sh = (A.CORR && A.CORR.h) || 2.60;
    if (OH > sh)
      houseWall((OA0 + OA1) / 2, Y + (sh + OH) / 2, (OZ + Z1) / 2,
        OA1 - OA0, OH - sh, Z1 - OZ, cHouse);
  }
  box(DX, Y + OH + .05, (OZ + Z1) / 2, OA1 - OA0 + .10, .10, Z1 - OZ + .10, cCope,
    { hard: true, gloss: .28, ...SLAB });
  if (!shellLanding) {
    stop(OA0, DX - DW / 2, OZ, Z1 + .40);
    stop(DX + DW / 2, OA1, OZ, Z1 + .40);
  }
  // 1.30 m of opening against a 0.60 m body diameter is 0.70 m of genuinely clear run — the number
  // the brief asks for, and twice what the landings downstairs give you. The car's own doors are
  // 0.80 and centred on the same x, so the two line up.

  if (!shellLanding) {
    // The compatibility portal's reveal, shaft infill and threshold.  With the live shell these
    // are redundant layers in front of working leaves, so the real landing is left unobstructed.
    for (const s of [-1, 1]) {
      box(DX + s * (DW / 2 + .045), Y + DH / 2, OZ + .02, .09, DH, .10, cHouseD,
        { hard: true, gloss: .18, ...PLAS });
      box(DX + s * (DW / 2 - .035), Y + .30, OZ - .016, .07, .60, .03, cSteelD,
        { hard: true, gloss: G.metal, ...METL });
    }
    box(DX, Y + DH + .045, OZ + .02, DW + .19, .09, .10, cHouseD, { hard: true, gloss: .18 });
    box(DX, Y - 1.55, (LIFT.z0 + LIFT.z1) / 2, LIFT.x1 - LIFT.x0, 3.00, LIFT.z1 - LIFT.z0,
      C('#3c4045'), { hard: true, gloss: .10, ...CAST });
    box(DX, Y + .030, LIFT.z0 - .045, LIFT.x1 - LIFT.x0, .05, .09, cSteelD,
      { hard: true, gloss: G.metal, ...METL });

    // Older shells have no F12 call control, so the fallback portal keeps its own one.
    const BX = OA1 - .34, BZ = OZ - .035;
    box(BX, Y + 1.12, BZ, .15, .26, .05, C('#d3cec2'), { hard: true, gloss: .30, tag: '电梯' });
    box(BX, Y + 1.155, BZ - .030, .062, .062, .012, C('#ffbe6a'),
      { hard: true, mode: 1, glow: .16, tag: '电梯' });
    glyph(BX, Y + 1.155, BZ - .044, Math.PI, '▼', { size: .04, color: C('#4a3316'), gloss: .12 });
    box(BX, Y + 1.44, BZ - .012, .30, .16, .03, C('#2a2f33'), { hard: true, gloss: .34, tag: '电梯' });
    glyph(BX, Y + 1.44, BZ - .032, Math.PI, '十二',
      { size: .10, color: C('#ff9a4d'), mode: 1, glow: .16, tag: '电梯' });
    th('电梯', BX, Y + 1.55, BZ - .12, '按电梯，下楼去。', 'Press for the lift and go down.',
      '电 electricity + 梯 ladder. 上楼 up, 下楼 down — and the only way off this roof.',
      { focus: [BX - .25, BZ - .70], reach: 1.9 });
  }

  // ---- 楼梯间 the stair head, and the door propped open with a brick.
  const spw = (SDX - SDW / 2) - SH0, spe = SH1 - (SDX + SDW / 2);
  houseWall(SH0 + spw / 2, Y + SHH / 2, (SHZ + Z1) / 2, spw, SHH, Z1 - SHZ, cHouse);
  houseWall(SH1 - spe / 2, Y + SHH / 2, (SHZ + Z1) / 2, spe, SHH, Z1 - SHZ, cHouse);
  houseWall(SDX, Y + (SDH + SHH) / 2, (SHZ + Z1) / 2, SDW, SHH - SDH, Z1 - SHZ, cHouse);
  box((SH0 + SH1) / 2, Y + SHH + .05, (SHZ + Z1) / 2, SH1 - SH0 + .10, .10, Z1 - SHZ + .10, cCope,
    { hard: true, gloss: .28, ...SLAB });
  stop(SH0, SDX - SDW / 2, SHZ, Z1 + .40);
  stop(SDX + SDW / 2, SH1, SHZ, Z1 + .40);
  stop(SDX - SDW / 2 - .05, SDX + SDW / 2 + .05, SHZ + .12, Z1 + .40);
  // The dark of the stairwell, and the top flight going down into it. You cannot go down — deck 11
  // is somebody else's file — but a black rectangle is a lie and a stair is not.
  wall(SDX, Y + SDH / 2, SHZ + .74, SDW + .30, SDH, 0, C('#2b2e31'), { gloss: .06 });
  for (let s = 0; s < 4; s++)
    box(SDX, Y - .05 - s * .165, SHZ + .30 + s * .26, SDW, .07, .26, C('#6a6459'),
      { hard: true, gloss: .16, ...SLAB });
  box(SDX, Y + .04, SHZ + .24, SDW + .10, .10, .09, cSteelD, { hard: true, gloss: G.metal });
  // The leaf standing open against the wall, and the brick holding it there. A fire door wedged
  // open with half a brick is the most reliable object in Chinese architecture.
  box(SDX - SDW / 2 - .17, Y + SDH / 2 - .04, SHZ - .30, .06, SDH - .08, .84, C('#5d6b5f'),
    { hard: true, gloss: .22, ry: -.42, tag: '门' });
  box(SDX - SDW / 2 - .14, Y + 1.02, SHZ - .48, .04, .10, .10, cSteel,
    { hard: true, gloss: G.metal, ry: -.42 });
  box(SDX - SDW / 2 - .02, Y + .038, SHZ - .13, .22, .07, .11, C('#8e5a48'),
    { hard: true, gloss: .10, mode: 11, ry: .30, tag: '砖' });
  shade(SDX - SDW / 2 - .02, SHZ - .13, .30, .20, .40);
  th('砖', SDX - SDW / 2 - .02, Y + .17, SHZ - .13, '门用一块砖顶着。',
    'The door is propped open with a brick.',
    '砖 zhuān, a brick. 顶着 dǐngzhe — propped, held open against something.',
    { focus: [SDX - .75, SHZ - .55], reach: 1.4 });

  // 安全出口 over the door: white on green, lit from inside the way every one of them is. On the
  // emissive path so it reads at dusk without behaving like a lamp.
  box(SDX, Y + SDH + .20, SHZ - .020, .62, .22, .05, cGreen,
    { hard: true, mode: 1, glow: .11, tag: '安全出口' });
  glyph(SDX + .10, Y + SDH + .20, SHZ - .050, Math.PI, '安全出口',
    { size: .095, gap: .012, color: cWhite, mode: 1, glow: .13, tag: '安全出口' });
  box(SDX - .20, Y + SDH + .20, SHZ - .047, .10, .15, .01, cWhite,
    { hard: true, mode: 1, glow: .13, tag: '安全出口' });
  th('安全出口', SDX, Y + SDH + .34, SHZ - .18, '安全出口在这边。', 'The fire exit is this way.',
    '安全 safety + 出口 exit. On every stairwell door in the country.',
    { focus: [SDX, SHZ - .80], reach: 2.0 });
  // A bulkhead lamp beside it — the one real light on this roof, and the one the zone hangs its
  // overhead bulb on, so after dark this corner is where the roof is lit from.
  box(SDX + .70, Y + 2.14, SHZ - .045, .20, .13, .09, C('#d9d3c4'), { hard: true, mode: 1, glow: .12 });
  light(SDX + .70, Y + 2.10, SHZ - .30, [1.00, 0.92, 0.74], .40, 4.2);
  glow(M.trs(SDX + .70, Y + .028, SHZ - .70, 0, 2.4, 1, 2.0), C('#ffe0ae'), .16, false);

  // ================================================================ 晾衣 the drying yard
  //
  // The most characteristic thing on a roof in this city, and it is not a detail — it is what the
  // roof is FOR. Four runs of galvanised wire between welded frames, a bamboo pole across two
  // forks for the things that must not have a crease in them, and enough on the line for two
  // households.
  //
  // Nothing here is a collider. You walk through the washing, which is exactly what it is like.
  const laundry = [];
  const LX0 = -5.20, LX1 = 5.20;
  const LINES = [[-0.10, 1.66], [1.00, 1.78], [2.05, 1.72], [3.05, 1.80]];
  for (const s of [-1, 1]) {
    const fx = s > 0 ? LX1 : LX0;
    for (const [lz] of LINES) {
      cyl(fx, Y + .90, lz, .035, 1.80, cGalv, { gloss: G.metal, ...METL });
      box(fx, Y + .024, lz, .26, .045, .26, cRustD, { hard: true, gloss: .20, ...METL });
      shade(fx, lz, .34, .34, .40);
    }
    // the rail that ties one side's posts together, and the collider for the whole frame
    cap(fx, Y + 1.76, (LINES[0][0] + LINES[3][0]) / 2, .028,
      LINES[3][0] - LINES[0][0] + .30, .028, cGalv, { rx: Math.PI / 2, gloss: G.metal, ...METL });
    stop(fx - .09, fx + .09, LINES[0][0] - .12, LINES[3][0] + .12);
  }
  // The wires themselves, in five segments each so they sag. A dead-straight line reads as a pipe.
  for (const [lz, ly] of LINES)
    for (let i = 0; i < 5; i++) {
      const tm = (i + .5) / 5, sag = .085 * Math.sin(Math.PI * tm);
      cap(LX0 + (LX1 - LX0) * tm, Y + ly - sag, lz, .010, (LX1 - LX0) / 5 + .02, .010, cGalv,
        { rz: Math.PI / 2, gloss: G.metal });
    }

  // What is on them. Eight kinds, because a line of identical rectangles is bunting and not
  // washing: sheets that take the whole depth of the line, shirts on hangers with their shoulders
  // showing, trousers folded double over the wire, towels, a duvet cover, a child's things. Every
  // one leans the same way, because there is only ever one wind.
  const CLOTH = [
    ['#eeece4', .96, 1.30, 7], ['#dfe6ea', .74, 1.06, 6], ['#c9d6dd', .52, .86, 5],
    ['#e8ddc9', .60, .96, 5], ['#b9c8d2', .46, .74, 4], ['#d8c9b8', .68, 1.00, 5],
    ['#8fa9b6', .40, .66, 4], ['#e6e2d4', .88, 1.16, 6],
  ];
  let ls = 4402117;
  const lr = () => (ls = (ls * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (const [lz, ly] of LINES) {
    let x = LX0 + .60;
    while (x < LX1 - .60) {
      const [hex, w, h, kind] = CLOTH[(lr() * CLOTH.length) | 0];
      const lean = (lr() - .5) * .10 + .07;             // the wind, plus a little scatter
      const col = C(hex), topY = Y + ly - .055;
      // The pegged band right under the wire, the body of the cloth hanging off it with a twist,
      // and the hem, which is where a real sheet is heaviest and hangs furthest out of true.
      box(x, topY - .04, lz, w * .92, .08, .05, col,
        { hard: true, mode: 7, gloss: .03, ry: lean * .4 });
      laundry.push(box(x + lean * .30, topY - .06 - h / 2, lz + lean * .16, w, h, .035, col,
        { mode: 7, gloss: .03, rz: -lean, ry: lean * .8, tag: '衣服' }));
      laundry.push(box(x + lean * .52, topY - .04 - h, lz + lean * .30, w * .96, .12, .045, C(hex),
        { mode: 7, gloss: .03, rz: -lean * 1.4, ry: lean, tag: '衣服' }));
      for (const s of [-1, 1])
        box(x + s * w * .38, Y + ly - .012, lz, .028, .075, .05,
          C(lr() > .5 ? '#c8543f' : '#3f7fa8'), { hard: true, gloss: .30 });
      if (kind >= 6) {                                  // the ones that get a hanger
        cap(x, Y + ly - .09, lz, .008, w * .70, .008, cSteel, { rz: Math.PI / 2, gloss: G.metal });
        cap(x, Y + ly - .045, lz, .007, .09, .007, cSteel, { gloss: G.metal });
      }
      x += w + .16 + lr() * .30;
    }
  }

  // A bamboo pole across two forks, which is what a 被子 goes over — you never peg a quilt, you
  // fold it over a pole in the sun and beat it. The forks are 晾衣叉, in every hardware shop here.
  // Set over on the west half, and every dish below is on the west half of the south parapet too.
  // The south-east corner of this roof is deliberately left empty: a roof with something on every
  // square metre of it has nowhere to walk to and look, and looking is what the floor is for. The
  // clear run is x 0.3 .. 3.2, z -4.6 .. -0.6, which is where the camera goes for the view.
  const POLE_X = -2.00, POLE_Z = -1.45;
  for (const s of [-1, 1]) {
    const px = POLE_X + s * 1.60;
    cyl(px, Y + .78, POLE_Z, .032, 1.56, cBamboo, { gloss: .24, mode: 6 });
    box(px, Y + .022, POLE_Z, .24, .04, .24, cRustD, { hard: true, gloss: .20 });
    for (const d of [-1, 1])
      cap(px + d * .07, Y + 1.60, POLE_Z, .014, .22, .014, cBamboo,
        { rz: d * .55, gloss: .24, mode: 6 });
    shade(px, POLE_Z, .32, .32, .38);
  }
  cap(POLE_X, Y + 1.68, POLE_Z, .038, 4.00, .038, cBamboo, { rz: Math.PI / 2, gloss: .24, mode: 6 });
  for (const [qx, qw, qh, qc] of [[-2.90, 1.55, .96, '#c9506a'], [-1.15, 1.60, 1.02, '#d8cbb0']]) {
    for (const d of [-1, 1])
      box(qx, Y + 1.66 - qh / 2, POLE_Z + d * .085, qw, qh, .07, C(qc),
        { mode: 7, gloss: .03, rz: d * .03, tag: '被子' });
    box(qx, Y + 1.70, POLE_Z, qw, .10, .20, C(qc), { mode: 7, gloss: .03, tag: '被子' });
    shade(qx, POLE_Z, qw * 1.05, .55, .30);
  }
  th('被子', -2.90, Y + 1.30, POLE_Z - .34, '天气好，把被子拿出来晒。',
    'Good weather — put the quilt out in the sun.',
    '晒 shài, to dry in the sun. 晒被子 is a Saturday, all over this city.',
    { focus: [-2.90, POLE_Z - .80], reach: 1.7 });
  th('衣服', 1.40, Y + 1.25, LINES[1][0], '衣服晾在楼顶上，风一吹就干。',
    'The washing hangs on the roof; one gust of wind and it is dry.',
    '晾 liàng — to hang out to dry. 晾衣服 is what this roof is for.',
    { focus: [1.40, LINES[1][0] - .60], reach: 1.7 });

  // The washing moves. There is no wind uniform indoors and js/game.js does not know this fixture
  // yet, so it is registered as a `mover` and left at rest — one line in the tick loop turns the
  // whole yard on, and it is in the report as a ticket. Registered rather than left out, because
  // a sheet that never moves is a painted sheet and this is the fixture that most wants the fix.
  mover('laundry', laundry, (v, i, m0) => {
    const ph = m0[12] * 1.30 + m0[14] * 0.70 + i * 0.37;
    const a = (v * 2 - 1) * 0.16 * (0.65 + 0.35 * Math.sin(ph));
    const py = m0[13] + 0.62, pz = m0[14];
    return M.mul(M.trans(0, py, pz), M.mul(M.rotX(a), M.trans(0, -py, -pz)));
  });

  // ================================================================ 太阳能热水器 solar heaters
  //
  // Stainless drums on galvanised A-frames with a rack of evacuated tubes sloping into them, three
  // in a row because three households on the top floors each paid for one. The tubes are dark
  // blue-green and not black: the coating on an evacuated tube is a colour, and it is most of what
  // identifies the object from across a roof.
  function solar(sx, sz) {
    const TL = 1.72;
    cyl(sx, Y + 1.26, sz, .215, TL, C('#b8bfc4'), { rz: Math.PI / 2, gloss: G.metal, ...METL });
    // The end caps are a rim on the drum, not a plate over it: at 0.222 and a lighter grey they
    // read as two white discs floating beside the tank rather than as the ends of it.
    for (const s of [-1, 1])
      cyl(sx + s * (TL / 2 - .015), Y + 1.26, sz, .219, .05, C('#7f878d'),
        { rz: Math.PI / 2, gloss: G.metal, ...METL });
    for (const s of [-1, 1]) {
      const lx = sx + s * .70;
      for (const d of [-1, 1])
        cap(lx, Y + .62, sz + d * .18, .026, 1.30, .026, cGalv,
          { rx: -d * .16, gloss: G.metal, ...METL });
      box(lx, Y + .024, sz, .30, .045, .46, cRustD, { hard: true, gloss: .22 });
      shade(lx, sz, .40, .55, .42);
    }
    cap(sx, Y + .70, sz + .30, .022, 1.50, .022, cGalv,
      { rz: Math.PI / 2, gloss: G.metal, ...METL });
    for (let i = 0; i < 18; i++)
      cyl(sx - .78 + i * .092, Y + .78, sz + .46, .028, 1.62,
        i % 2 ? C('#224a52') : C('#1f4550'), { rx: .93, gloss: .72 });
    cap(sx - .30, Y + .74, sz - .30, .034, 1.05, .034, C('#d8d2c4'), { gloss: .16 });
    cyl(sx - .30, Y + .20, sz - .30, .022, .16, cSteel, { gloss: G.metal, ...METL });
    stop(sx - .90, sx + .90, sz - .30, sz + .46);
  }
  solar(4.05, -3.75);
  solar(4.05, -2.25);
  solar(4.05, -0.75);
  th('太阳能', 4.05, Y + 1.55, -2.25, '楼上的热水是太阳能烧的。',
    'The hot water upstairs is heated by the sun.',
    '太阳能 tàiyángnéng — solar power. 太阳能热水器 is the drum on every roof in China.',
    { focus: [3.05, -2.25], reach: 1.9 });

  // ================================================================ 水箱 the water tanks
  //
  // Two of the pressed stainless kind on welded stands, feeding the top four floors when the mains
  // pressure gives out — which in a twelve-storey block is every summer evening.
  function tank(tx, tz, r, h) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const lx = tx + Math.sin(a) * r * .72, lz = tz + Math.cos(a) * r * .72;
      cap(lx, Y + .42, lz, .035, .84, .035, cGalv, { gloss: G.metal, ...METL });
      box(lx, Y + .024, lz, .18, .045, .18, cRustD, { hard: true, gloss: .22 });
    }
    cyl(tx, Y + .86, tz, r * .96, .06, cSteelD, { gloss: G.metal, ...METL });
    cyl(tx, Y + .86 + h / 2, tz, r, h, C('#c9ced2'), { gloss: G.metal, ...METL });
    for (let c = 0; c < 3; c++)                       // the pressed courses of the drum
      cyl(tx, Y + 1.02 + c * (h - .30) / 2.6, tz, r * 1.005, .028, C('#b3babf'),
        { hard: true, gloss: G.metal });
    cyl(tx, Y + .90 + h, tz, r * .99, .10, C('#d3d8db'), { gloss: G.metal, ...METL });
    cyl(tx, Y + .99 + h, tz, .17, .09, C('#9aa2a8'), { gloss: G.metal, ...METL });   // the hatch
    cap(tx + r * .80, Y + .48, tz, .030, .92, .030, C('#d8d2c4'), { gloss: .16 });
    shade(tx, tz, r * 2.5, r * 2.5, .46);
    stop(tx - r - .06, tx + r + .06, tz - r - .06, tz + r + .06);
  }
  tank(-4.55, 1.05, .68, 1.34);
  tank(-4.55, 2.85, .58, 1.16);
  cap(-4.55, Y + 1.62, 1.95, .026, 1.30, .026, C('#d8d2c4'), { rx: Math.PI / 2, gloss: .16 });
  th('水箱', -4.55, Y + 2.10, 1.05, '楼顶的水箱夏天最忙。', 'The roof tank is busiest in summer.',
    '水箱 shuǐxiāng — water tank. 箱 is a box or a case: 冰箱 is the ice one.',
    { focus: [-3.60, 1.05], reach: 2.0 });

  // ================================================================ 天线 dishes and aerials
  //
  // A forest of them, because for twenty years this was how everybody got television and nobody
  // has ever taken one down. Most point the same way — at the same satellite, south — and the one
  // that does not is the one that stopped working.
  //
  // `{ ry: aim, rx: tilt }` turns a prop's local +y to (sin aim·sin tilt, cos tilt, cos aim·sin
  // tilt), which is the dish's normal: so the same two angles aim the flattened ball, the arm and
  // the LNB on the end of it without any of them being placed by eye.
  function dish(dx, dz, r, aim, tilt) {
    const nx = Math.sin(aim) * Math.sin(tilt), ny = Math.cos(tilt), nz = Math.cos(aim) * Math.sin(tilt);
    cyl(dx, Y + .38, dz, .045, .76, cSteelD, { gloss: G.metal, ...METL });
    box(dx, Y + .024, dz, .26, .045, .26, cRustD, { hard: true, gloss: .22 });
    const cy = Y + .86;
    ball(dx, cy, dz, r, r * .28, r, C('#dcd8ce'), { ry: aim, rx: tilt, gloss: .26, mode: 14 });
    ball(dx + nx * .02, cy + ny * .02, dz + nz * .02, r * .93, r * .24, r * .93, C('#c2beb4'),
      { ry: aim, rx: tilt, gloss: .18 });
    cap(dx + nx * r * .50, cy + ny * r * .50, dz + nz * r * .50, .014, r * 1.00, .014, cSteel,
      { ry: aim, rx: tilt, gloss: G.metal });
    cyl(dx + nx * r * .98, cy + ny * r * .98, dz + nz * r * .98, .045, .14, C('#e6e2d8'),
      { ry: aim, rx: tilt, gloss: .30 });
    shade(dx, dz, .44, .44, .40);
    stop(dx - .10, dx + .10, dz - .10, dz + .10);
  }
  dish(-5.05, -4.05, .34, Math.PI + .12, .86);
  dish(-4.05, -4.18, .30, Math.PI - .09, .90);
  dish(-3.05, -4.05, .38, Math.PI + .18, .84);
  dish(-2.05, -4.20, .28, Math.PI - .04, .92);
  dish(-1.05, -4.05, .33, 0.55, 1.10);                // the one that points nowhere
  dish(5.10, 2.60, .36, Math.PI + .06, .88);
  th('天线', -3.05, Y + 1.20, -3.55, '楼顶上全是天线。', 'The roof is covered in aerials.',
    '天线 tiānxiàn — antenna, literally "sky wire". A dish is a 锅, "a wok", to everybody.',
    { focus: [-3.05, -3.35], reach: 1.7 });

  // A lattice mast in the west corner with somebody's aerials on it, guyed to three eyes cast into
  // the deck. Same two-angle trick as the dish: `ry` is the compass bearing and `rx` the angle off
  // vertical, so a guy wire is placed by where its two ends are rather than by trial.
  const MX = -5.10, MZ = 4.60, MH = 3.40, MR = .13;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    cap(MX + Math.sin(a) * MR, Y + MH / 2, MZ + Math.cos(a) * MR, .020, MH, .020, cGalv,
      { gloss: G.metal, ...METL });
  }
  for (let hh = .30; hh < MH; hh += .42)
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3, b = a + Math.PI * 2 / 3;
      const ax = Math.sin(a) * MR, az = Math.cos(a) * MR;
      const bx = Math.sin(b) * MR, bz = Math.cos(b) * MR;
      const dx = bx - ax, dz = bz - az;
      cap(MX + (ax + bx) / 2, Y + hh, MZ + (az + bz) / 2, .010, Math.hypot(dx, dz), .010, cGalv,
        { ry: Math.atan2(dx, dz), rx: Math.PI / 2, gloss: G.metal });
    }
  for (let i = 0; i < 4; i++)
    cap(MX, Y + 2.30 + i * .26, MZ, .008, .90 - i * .12, .008, cSteel,
      { rz: Math.PI / 2, ry: .5, gloss: G.metal });
  for (const [gx, gz] of [[-3.90, 3.70], [-5.35, 2.85], [-4.15, 5.60]]) {
    const dx = gx - MX, dz = gz - MZ, drop = MH - .30;
    const flatL = Math.hypot(dx, dz), L = Math.hypot(flatL, drop);
    cap((MX + gx) / 2, Y + drop / 2, (MZ + gz) / 2, .008, L, .008, C('#8d8778'),
      { ry: Math.atan2(dx, dz), rx: Math.atan2(flatL, -drop), gloss: .12 });
    box(gx, Y + .028, gz, .10, .05, .10, cRustD, { hard: true, gloss: .22 });
  }
  box(MX, Y + .032, MZ, .40, .06, .40, cTar, { hard: true, gloss: .18, ...CAST });
  shade(MX, MZ, .58, .58, .44);
  stop(MX - .22, MX + .22, MZ - .22, MZ + .22);

  // 避雷针 the lightning rod, on the highest thing there is, with its tape down the corner of the
  // over-run and into the deck. And the 航空障碍灯 beside it — red, always lit, which is what an
  // obstruction light does.
  const LRX = OA1 - .30;
  cap(LRX, Y + OH + .78, Z1 - .35, .016, 1.50, .016, cSteel, { gloss: G.metal, ...METL });
  cyl(LRX, Y + OH + 1.55, Z1 - .35, .010, .16, C('#d8d4c8'), { gloss: .40 });
  box(LRX + .06, Y + OH / 2, OZ - .016, .035, OH, .012, C('#b8b2a4'), { hard: true, gloss: .24 });
  box(LRX + .06, Y + .40, OZ - .016, .035, .80, .012, C('#b8b2a4'), { hard: true, gloss: .24 });
  cyl(LRX - .40, Y + OH + .11, Z1 - .40, .055, .12, cSteelD, { gloss: G.metal, ...METL });
  ball(LRX - .40, Y + OH + .23, Z1 - .40, .075, .085, .075, C('#c8362a'), { mode: 1, glow: .30 });
  th('避雷针', LRX, Y + OH + 1.20, Z1 - .70, '楼顶有避雷针。',
    'There is a lightning rod on the roof.',
    '避 to avoid + 雷 thunder + 针 needle. A very literal word, and a very good one.',
    { focus: [LRX - .60, Z1 - 1.30], reach: 2.2 });

  // Cable. Bundles of it, cable-tied every half metre, running from the dishes along the foot of
  // the parapet and up the side of the over-run — because nobody has ever cut one, they only ever
  // add another. This is the single most honest thing on any roof in Beijing.
  function bundle(x0, z0, x1, z1, y, r, c) {
    const dx = x1 - x0, dz = z1 - z0;
    cap((x0 + x1) / 2, Y + y, (z0 + z1) / 2, r, Math.hypot(dx, dz), r, c,
      { ry: Math.atan2(dx, dz), rx: Math.PI / 2, gloss: .18 });
  }
  bundle(-5.10, -4.42, -4.85, -4.42, .075, .040, C('#2f3236'));
  bundle(-5.10, -4.42, -4.85, -4.42, .155, .034, C('#3a3d42'));
  bundle(-4.85, -4.42, -4.85, 4.60, .075, .048, C('#2f3236'));
  bundle(-4.85, -4.42, -4.85, 4.60, .150, .036, C('#3a3d42'));
  bundle(-4.85, 4.60, MX, 4.60, .075, .046, C('#2f3236'));
  bundle(-4.85, 3.20, OA0 + .30, 3.20, .075, .046, C('#2f3236'));
  for (let z = -4.0; z < 4.4; z += .55)
    box(-4.85, Y + .118, z, .10, .12, .028, C('#d6d1c4'), { hard: true, gloss: .28 });
  for (let x = -4.6; x < -0.9; x += .55)
    box(x, Y + .118, -4.42, .028, .12, .10, C('#d6d1c4'), { hard: true, gloss: .28 });
  box(OA0 + .18, Y + 1.10, OZ - .040, .09, 2.10, .06, C('#cdc7b8'), { hard: true, gloss: .22 });

  // ================================================================ plant and vents
  //
  // 风帽 the extractor cowls over the kitchen and bathroom stacks — the spinning kind, which have
  // not spun in years — and the vent stacks themselves in painted cast iron on their plinths.
  function cowl(vx, vz, h, r) {
    cyl(vx, Y + h / 2, vz, r, h, C('#5c5a54'), { gloss: .22, mode: 14, ...CAST });
    cyl(vx, Y + h + .03, vz, r * 1.18, .06, cSteelD, { gloss: G.metal, ...METL });
    taper(vx, Y + h + .17, vz, r * 2.0, .22, r * 2.0, C('#b6bcc0'), { gloss: G.metal, ...METL });
    ball(vx, Y + h + .40, vz, r * 1.05, r * .70, r * 1.05, C('#c3c8cb'), { gloss: G.metal, ...METL });
    cyl(vx, Y + h + .54, vz, r * .30, .07, C('#9aa2a8'), { gloss: G.metal });
    shade(vx, vz, r * 3.0, r * 3.0, .42);
    stop(vx - r - .04, vx + r + .04, vz - r - .04, vz + r + .04);
  }
  cowl(-1.75, -2.05, .84, .18);
  cowl(-1.05, -2.62, .70, .15);
  cowl(-0.35, -1.70, .95, .21);
  for (const [vx, vz, vh] of [[-3.05, -1.20, 1.15], [-1.30, 1.55, 1.00]]) {
    box(vx, Y + .058, vz, .52, .11, .52, C('#8b8578'), { hard: true, gloss: .20, ...CAST });
    cyl(vx, Y + .11 + vh / 2, vz, .155, vh, C('#6b675f'), { gloss: .22, mode: 14, ...CAST });
    taper(vx, Y + .11 + vh + .09, vz, .46, .18, .46, C('#7d786d'), { gloss: .24 });
    shade(vx, vz, .70, .70, .44);
    stop(vx - .28, vx + .28, vz - .28, vz + .28);
  }
  // 空调外机 two condenser units on brackets against the sealed over-run, dripping onto the deck.
  for (const [ax, az] of [[-0.10, 4.60], [0.72, 4.60]]) {
    box(ax, Y + .78, az, .74, .55, .30, C('#d5d1c6'), { hard: true, gloss: .26, ...METL });
    cyl(ax, Y + .78, az - .158, .21, .035, C('#4c4f52'), { rx: Math.PI / 2, gloss: .30 });
    for (let i = 0; i < 7; i++)
      box(ax, Y + .78, az - .178, .40, .026, .012, C('#82868a'),
        { hard: true, gloss: .30, rz: i * .45 });
    for (const s of [-1, 1])
      cap(ax + s * .30, Y + .68, az + .12, .016, .34, .016, cGalv, { gloss: G.metal });
    glow(M.trs(ax, Y + .026, az - .55, 0, .5, 1, .5), C('#8fa6b4'), .22, false);
    stop(ax - .40, ax + .40, az - .34, az + .20);
  }

  // ================================================================ 菜园子 the illegal roof garden
  //
  // Somebody on eleven grows vegetables up here in polystyrene fish boxes and old paint tubs, and
  // 物业 have put a notice about it twice. The greens are `mode: 15`: the foliage path in js/gl.js
  // moves a mode-15 cluster off `uTime` in the vertex stage, so these are the only things on this
  // roof that are actually alive without a line of game code — and they take the season's leaf
  // tint with them, so the roof garden goes over in the autumn along with every tree in the city.
  const GX = -4.20, GZ = -3.10;
  function foamBox(px, pz, w, d, h, ry) {
    box(px, Y + h / 2, pz, w, h, d, cFoam, { hard: true, gloss: .10, ry, mode: 14 });
    box(px, Y + h - .014, pz, w - .08, .03, d - .08, cSoil, { hard: true, gloss: .06, ry });
    shade(px, pz, w * 1.25, d * 1.25, .44);
    stop(px - w / 2 - .03, px + w / 2 + .03, pz - d / 2 - .03, pz + d / 2 + .03);
  }
  function greens(px, py, pz, n, spread, size, c) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, rr = spread * Math.sqrt((i + .4) / n);
      ball(px + Math.cos(a) * rr, py + size * (.5 + (i % 3) * .16), pz + Math.sin(a) * rr,
        size, size * .82, size, c, { mode: 15 });
    }
  }
  foamBox(GX, GZ, 1.00, .62, .26, .06);
  greens(GX, Y + .26, GZ, 9, .38, .13, cLeaf);
  foamBox(GX + .06, GZ + .84, .96, .60, .24, -.04);
  greens(GX + .06, Y + .24, GZ + .84, 8, .36, .11, cLeafD);
  foamBox(GX - .98, GZ + .42, .70, .52, .28, .22);
  greens(GX - .98, Y + .28, GZ + .42, 7, .26, .12, C('#5b8f47'));
  // 大葱 spring onions standing in a paint tub — thin and vertical, which is what tells them apart
  // from everything else in the garden at a glance.
  for (const [tx, tz, tc, tr] of [[GX + 1.06, GZ - .30, cTub, .21], [GX + 1.02, GZ + .42, cTubR, .18]]) {
    taper(tx, Y + .14, tz, tr * 2.02, .28, tr * 2.02, tc, { gloss: .18 });
    cyl(tx, Y + .27, tz, tr * .94, .04, cSoil, { hard: true, gloss: .06 });
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399, rr = tr * .62 * Math.sqrt((i + .5) / 11);
      cap(tx + Math.cos(a) * rr, Y + .45, tz + Math.sin(a) * rr, .014, .34, .014,
        i % 3 ? C('#4f8a3f') : C('#a8bd6a'),
        { rz: Math.cos(a) * .16, rx: Math.sin(a) * .16, mode: 15 });
    }
    shade(tx, tz, tr * 2.6, tr * 2.6, .42);
    stop(tx - tr - .04, tx + tr + .04, tz - tr - .04, tz + tr + .04);
  }
  // The watering can — an old paint tin with a wire handle — and a bamboo frame for the beans.
  cyl(GX - 1.12, Y + .13, GZ - .66, .115, .26, C('#3f6f8e'), { gloss: .24 });
  cap(GX - 1.12, Y + .30, GZ - .66, .010, .24, .010, cSteel, { rz: Math.PI / 2, gloss: G.metal });
  cap(GX - 0.98, Y + .21, GZ - .80, .022, .30, .022, C('#5d7f92'), { rz: .9, ry: .7, gloss: .24 });
  shade(GX - 1.12, GZ - .66, .30, .30, .40);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + .4;
    cap(GX + Math.cos(a) * .30, Y + .62, GZ + .84 + Math.sin(a) * .22, .012, 1.24, .012, cBamboo,
      { rx: Math.sin(a) * .22, rz: -Math.cos(a) * .22, gloss: .22, mode: 6 });
  }
  th('菜', GX, Y + .48, GZ - .52, '楼上的邻居在屋顶上种菜。',
    'The neighbour upstairs grows vegetables on the roof.',
    '种 zhòng, to plant. 种菜 — to grow vegetables, which nobody up here is supposed to do.',
    { focus: [GX, GZ - .98], reach: 1.6 });

  // The folding chair, an upturned crate for a table, and the cigarette tin that is the ashtray.
  // Somebody sits here in the evening with the washing behind them and the city in front.
  const CHX = -2.35, CHZ = -3.95;
  for (const s of [-1, 1]) {
    cap(CHX + s * .21, Y + .22, CHZ - .16, .015, .46, .015, cSteelD, { rx: -.22, gloss: G.metal });
    cap(CHX + s * .21, Y + .22, CHZ + .16, .015, .46, .015, cSteelD, { rx: .22, gloss: G.metal });
    cap(CHX + s * .21, Y + .52, CHZ + .21, .014, .48, .014, cSteelD, { rx: .14, gloss: G.metal });
  }
  box(CHX, Y + .43, CHZ, .46, .04, .40, C('#3f5f7a'), { mode: 7, gloss: .04, tag: '椅子' });
  box(CHX, Y + .70, CHZ + .22, .44, .40, .04, C('#3f5f7a'),
    { mode: 7, gloss: .04, rx: .16, tag: '椅子' });
  shade(CHX, CHZ, .62, .58, .46);
  box(CHX + .72, Y + .16, CHZ + .10, .34, .32, .30, C('#9b7c52'),
    { hard: true, gloss: .18, mode: 6, ry: .26 });
  shade(CHX + .72, CHZ + .10, .44, .40, .44);
  cyl(CHX + .72, Y + .345, CHZ + .10, .045, .05, C('#b9a244'), { hard: true, gloss: .44, ...METL });
  for (let i = 0; i < 3; i++)
    cap(CHX + .72 + (i - 1) * .022, Y + .375, CHZ + .10 + (i % 2) * .02, .006, .05, .006,
      C('#e8e2d2'), { rz: Math.PI / 2, ry: i * .8, gloss: .10 });
  th('椅子', CHX, Y + .70, CHZ - .38, '傍晚搬把椅子上来，坐着看城市。',
    'In the evening you carry a chair up and sit looking at the city.',
    '把 bǎ is the measure word for a chair. 搬 bān — to shift something heavy.',
    { focus: [CHX, CHZ - .82], reach: 1.6 });

  // A mop, a bucket and a coil of hose by the stair head: the things that live on a roof because
  // there is nowhere else in a flat to put them.
  cap(SH1 + .32, Y + .62, SHZ - .24, .022, 1.24, .022, cBamboo, { rz: .16, gloss: .22, mode: 6 });
  cap(SH1 + .42, Y + 1.20, SHZ - .24, .06, .22, .10, C('#c9c2ae'), { rz: .16, gloss: .06 });
  cyl(SH1 + .62, Y + .14, SHZ - .32, .145, .28, C('#c2453a'), { gloss: .22 });
  shade(SH1 + .55, SHZ - .30, .50, .40, .42);
  for (let i = 0; i < 4; i++)
    cyl(SH1 + 1.14, Y + .045 + i * .045, SHZ - .42, .22 - i * .012, .04, C('#3f6f4f'), { gloss: .26 });
  shade(SH1 + 1.14, SHZ - .42, .52, .52, .40);

  // A 物业 notice cable-tied to the parapet: the one about the vegetables.
  box(-3.30, Y + .82, IZ0 + .042, .46, .60, .012, C('#e4dfd0'),
    { hard: true, gloss: .10, tag: '通知' });
  glyph(-3.30, Y + 1.02, IZ0 + .050, 0, '通知',
    { size: .085, gap: .015, color: C('#8c2f24'), gloss: .06, lift: .008, tag: '通知' });
  for (let i = 0; i < 4; i++)
    box(-3.30, Y + .86 - i * .095, IZ0 + .050, .34, .012, .006, C('#8d8878'),
      { hard: true, gloss: .06, tag: '通知' });
  th('通知', -3.30, Y + 1.10, IZ0 + .18, '通知：楼顶不许种菜。',
    'Notice: growing vegetables on the roof is not permitted.',
    '通知 tōngzhī — a notice. 不许 bùxǔ — not allowed. Nobody has taken the boxes away.',
    { focus: [-3.30, IZ0 + .85], reach: 1.6 });

  // The word for the place itself, and the word for what you came up here to look at, both hung
  // out over the south parapet where you go to stand.
  th('屋顶', 0.20, Y + 1.25, IZ0 + .55, '站在屋顶上，北京在下面。',
    'Standing on the roof, Beijing is below you.',
    '屋 house + 顶 top. 楼顶 lóudǐng is the same thing on a block of flats.',
    { focus: [0.20, IZ0 + 1.05], reach: 2.2 });
  th('北京', 2.30, Y + 1.35, IZ0 + .55, '天气好的时候，能看得很远。',
    'On a clear day you can see a long way.',
    'The one thing this roof is for that is not laundry.',
    { focus: [2.30, IZ0 + 1.10], reach: 2.2 });

  // ================================================================ 消防栓 and the stair
  //
  // `HOME_SHARED_USE` in js/game.js offers an action for 安全出口, 消防栓 and 楼梯 on any deck.
  // The roof had the first and neither of the other two, so two of the three fixtures the game
  // believes every storey carries answered nothing up here. A roof hydrant is not decoration
  // either: it is the top of the wet riser, and on a twelve-storey block it is the reason the
  // booster on eleven exists at all.
  const FHX = SH1 + .62, FHZ = SHZ - .13;
  box(FHX, Y + 1.14, FHZ, .68, 1.00, .22, cRed, { hard: true, gloss: .28, tag: '消防栓' });
  box(FHX, Y + 1.14, FHZ - .112, .58, .90, .010, C('#82251b'),
    { hard: true, gloss: .32, tag: '消防栓' });
  box(FHX - .01, Y + 1.20, FHZ - .118, .38, .56, .008, C('#3d4a4e'),
    { hard: true, gloss: .60, alpha: .55 });
  cyl(FHX - .01, Y + 1.20, FHZ - .06, .165, .12, C('#8c1f18'), { rx: Math.PI / 2, gloss: .18 });
  cyl(FHX - .01, Y + 1.20, FHZ - .09, .068, .07, C('#82251b'), { rx: Math.PI / 2, gloss: .30 });
  cyl(FHX + .23, Y + .82, FHZ - .10, .052, .022, cSteelD, { rx: Math.PI / 2, gloss: .5 });
  glyph(FHX, Y + 1.76, FHZ - .112, Math.PI, '消火栓',
    { size: .110, gap: .021, color: cWhite, tag: '消防栓' });
  glyph(FHX, Y + .70, FHZ - .112, Math.PI, '火警119',
    { size: .056, gap: .012, color: C('#dca42a') });
  // The riser itself climbing out of the slab into the cabinet, which is what makes it read as
  // plumbing and not as a red box screwed to a wall.
  cyl(FHX - .26, Y + .70, FHZ + .04, .048, 1.40, cRed, { gloss: .30 });
  cyl(FHX - .26, Y + .06, FHZ + .04, .062, .12, C('#82251b'), { gloss: .26 });
  cyl(FHX - .26, Y + 1.42, FHZ + .02, .040, .16, cRed, { rx: Math.PI / 2, gloss: .30 });
  // 水泵接合器, the brigade's inlet, standing clear of the wall on its own plinth. Two instantaneous
  // couplings under a cap each: the one object on this roof a fire engine is interested in.
  box(FHX + .74, Y + .07, FHZ - .34, .46, .14, .34, cCope, { hard: true, gloss: .24, ...SLAB });
  cyl(FHX + .74, Y + .56, FHZ - .34, .075, .84, cRed, { gloss: .30, tag: '消防栓' });
  for (const s of [-1, 1]) {
    cyl(FHX + .74 + s * .17, Y + .92, FHZ - .34, .055, .22, cRed,
      { rz: s * .55, gloss: .30, tag: '消防栓' });
    cyl(FHX + .74 + s * .26, Y + 1.02, FHZ - .34, .062, .05, C('#b8bcc0'),
      { rz: s * .55, gloss: G.metal, ...METL });
  }
  box(FHX + .74, Y + 1.20, FHZ - .34, .30, .13, .012, cWhite, { hard: true, gloss: .12 });
  glyph(FHX + .74, Y + 1.20, FHZ - .348, Math.PI, '水泵接合器',
    { size: .034, gap: .006, color: C('#2a241d') });
  shade(FHX, FHZ, .78, .34, .28);
  shade(FHX + .74, FHZ - .34, .52, .44, .34);
  stop(FHX - .36, FHX + .36, SHZ - .26, SHZ);
  stop(FHX + .50, FHX + .98, FHZ - .54, FHZ - .14);
  th('消防栓', FHX, Y + 1.40, FHZ - .20, '楼顶也有一个消火栓。',
    'There is a hydrant on the roof as well.',
    '消 extinguish + 火 fire + 栓 a plug or a valve. The top of the wet riser.',
    { focus: [FHX, SHZ - .90], reach: 1.9 });

  // ---- the stair itself, given the handrail it never had and the word it never had either. The
  // flight going down is already modelled; what was missing is the thing your hand finds on the
  // way, and the reason F11's file calls being an ordinary floor its whole job.
  for (let i = 0; i < 4; i++)
    cyl(SDX + SDW / 2 - .06, Y - .02 - i * .165, SHZ + .34 + i * .26, .020, .46, cSteelD,
      { rx: -.56, gloss: G.metal, ...METL });
  cap(SDX + SDW / 2 - .06, Y + .48, SHZ + .82, .022, 1.42, .022, C('#8d949a'),
    { rx: 1.02, gloss: G.metal, ...METL });
  cyl(SDX + SDW / 2 - .06, Y + .86, SHZ + .22, .024, .30, cSteelD, { gloss: G.metal, ...METL });
  box(SDX, Y + .96, SHZ + .12, SDW + .26, .05, .06, cSteelD, { hard: true, gloss: G.metal });
  th('楼梯', SDX, Y + .96, SHZ + .06, '楼梯通到楼下十一层。',
    'The stairs go down to the eleventh floor.',
    '楼 storey + 梯 ladder. 楼梯间 lóutījiān is the stairwell itself.',
    { focus: [SDX - .78, SHZ - .62], reach: 1.8 });

  // ================================================================ 锁 — whether the roof is shut
  //
  // The door is propped with half a brick, which is the honest state of most roof doors in this
  // city and a permanent one here. It is now a state rather than a fixture: `HomeRoof.roofOpen`
  // is what the brick, the padlock and the collider all read, so 物业 shutting the roof is one
  // assignment and not a rebuild.
  //
  // The collider follows the state and not the prop. That distinction is the whole reason this is
  // worth doing: a door modelled shut with no collider is a door you walk through, and a door
  // modelled open with a collider is a doorway that reads clear and is not. `stop` hands back its
  // record and `.open` is what `clampMove` skips on, so one flag drives both.
  const roofDoorStop = stop(SDX - SDW / 2 - .04, SDX + SDW / 2 + .04, SHZ - .04, SHZ + .10);
  // The hasp and staple welded to the leaf and the frame, and the padlock hanging open through the
  // staple — which is exactly how a padlock lives when the brick is doing the work.
  box(SDX + SDW / 2 - .02, Y + 1.06, SHZ - .028, .17, .05, .012, cSteelD,
    { hard: true, gloss: G.metal, ...METL });
  box(SDX + SDW / 2 + .10, Y + 1.06, SHZ - .034, .06, .07, .016, C('#6d757b'),
    { hard: true, gloss: G.metal, ...METL });
  box(SDX + SDW / 2 + .10, Y + .96, SHZ - .046, .05, .07, .028, C('#9a8a4e'),
    { hard: true, gloss: .50, tag: '锁' });
  cap(SDX + SDW / 2 + .10, Y + 1.03, SHZ - .046, .009, .10, .009, C('#b8bcc0'),
    { rz: .5, gloss: G.metal, tag: '锁' });
  cyl(SDX + SDW / 2 + .10, Y + .94, SHZ - .062, .009, .010, C('#3a3d42'),
    { rx: Math.PI / 2, gloss: .40, tag: '锁' });
  // 物业's sheet about it, which is the half of the story the brick does not tell.
  box(SDX - SDW / 2 - .30, Y + 1.52, SHZ - .022, .30, .38, .012, C('#e4dfd0'),
    { hard: true, gloss: .10, tag: '通知' });
  glyph(SDX - SDW / 2 - .30, Y + 1.64, SHZ - .034, Math.PI, '楼顶门',
    { size: .062, gap: .012, color: C('#8c2f24'), lift: .008 });
  glyph(SDX - SDW / 2 - .30, Y + 1.54, SHZ - .034, Math.PI, '夜间上锁',
    { size: .048, gap: .010, color: C('#2a241d'), lift: .008 });
  glyph(SDX - SDW / 2 - .30, Y + 1.44, SHZ - .034, Math.PI, '物业管理处',
    { size: .034, gap: .007, color: C('#7e858b'), lift: .008 });
  th('锁', SDX + SDW / 2 + .10, Y + 1.00, SHZ - .24, '门上挂着一把锁，没锁上。',
    'There is a padlock on the door; it is not locked.',
    '锁 suǒ — a lock, and to lock. 上锁 shàngsuǒ is to put it on.',
    { focus: [SDX + .82, SHZ - .60], reach: 1.5 });

  // One call, and everything above agrees with it: the leaf swings shut, the brick goes, the
  // padlock closes and the collider fills the opening. Nothing here polls — it is a setter, so a
  // roof that is never shut costs nothing at all.
  HomeRoof.setRoofOpen = open => {
    HomeRoof.roofOpen = !!open;
    if (roofDoorStop) roofDoorStop.open = !!open;
  };
  HomeRoof.setRoofOpen(true);

  // ================================================================ 避雷 lightning protection
  //
  // 避雷带 — a copper tape run on stub posts all the way round the coping, with 避雷针 finials at
  // the corners and a mast over the lift over-run carrying the obstruction light. It is on every
  // roof of this height in the country, it is the reason a Beijing roof has a visible outline
  // against the sky at all, and it is the one thing up here that reads from the street.
  //
  // The tape is drawn as segments rather than as one long box because a run that never breaks
  // over twelve metres reads as a handrail; a real one steps at every post.
  const LT = Y + PAR + .28;                        // the tape, 280 mm over the coping
  const BOLT = C('#8a6a3c'), BOLTD = C('#6d5230');
  function boltPost(px, pz) {
    cyl(px, Y + PAR + .14, pz, .012, .30, BOLTD, { gloss: .44, ...METL });
    box(px, Y + PAR + .01, pz, .07, .04, .07, C('#9aa2a6'), { hard: true, gloss: G.metal });
  }
  for (let i = 0; i < 9; i++) {                    // the south run, the one you stand at
    const px = X0 + .40 + i * ((X1 - X0 - .80) / 8);
    boltPost(px, Z0 + PT / 2);
    if (i < 8)
      cap(px + (X1 - X0 - .80) / 16, LT, Z0 + PT / 2, .008, (X1 - X0 - .80) / 8 + .02, .008,
        BOLT, { rz: Math.PI / 2, gloss: .44 });
  }
  for (const s of [-1, 1])                          // the two side runs, in four steps each
    for (let i = 0; i < 5; i++) {
      const pz = Z0 + .40 + i * ((Z1 - Z0 - .80) / 4);
      boltPost(s * (X1 - PT / 2), pz);
      if (i < 4)
        cap(s * (X1 - PT / 2), LT, pz + (Z1 - Z0 - .80) / 8, .008, (Z1 - Z0 - .80) / 4 + .02, .008,
          BOLT, { rx: Math.PI / 2, gloss: .44 });
    }
  for (const [cx, cz] of [[X0 + .30, Z0 + .30], [X1 - .30, Z0 + .30]]) {
    cyl(cx, Y + PAR + .52, cz, .014, 1.04, C('#b8bcc0'), { gloss: G.metal, ...METL });
    taper(cx, Y + PAR + 1.12, cz, .034, .18, .034, C('#d0d4d8'), { gloss: G.metal, ...METL });
    cyl(cx, Y + PAR + .06, cz, .045, .10, C('#9aa2a6'), { hard: true, gloss: G.metal });
  }
  // The mast over the working over-run, and the red obstruction light on top of it. Two stays,
  // because a 3 m mast on a roof edge always has them and they are what make it read as tall.
  const LPX = (OA0 + OA1) / 2 - .30, LPZ = (OZ + Z1) / 2;
  box(LPX, Y + OH + .10, LPZ, .30, .10, .30, cCope, { hard: true, gloss: .26, ...SLAB });
  cyl(LPX, Y + OH + 1.60, LPZ, .038, 2.90, cGalv, { gloss: G.metal, ...METL });
  cyl(LPX, Y + OH + 1.60, LPZ, .048, .06, cSteelD, { gloss: G.metal });
  for (const s of [-1, 1])
    cap(LPX + s * .52, Y + OH + 1.30, LPZ - .10, .006, 2.30, .006, C('#9aa2a6'),
      { rz: s * .43, rx: -.08, gloss: .40 });
  taper(LPX, Y + OH + 3.14, LPZ, .10, .16, .10, C('#c9ced2'), { gloss: G.metal, ...METL });
  ball(LPX, Y + OH + 3.30, LPZ, .085, .095, .085, C('#c9382a'),
    { mode: 1, glow: .30, gloss: .40, tag: '避雷针' });
  cyl(LPX, Y + OH + 3.22, LPZ, .062, .04, C('#4b4741'), { hard: true, gloss: .30 });
  light(LPX, Y + OH + 3.20, LPZ, [1.00, 0.32, 0.24], .22, 3.6);
  th('避雷针', LPX, Y + OH + 1.20, LPZ - .40, '楼顶上立着一根避雷针。',
    'A lightning rod stands on the roof.',
    '避 to avoid + 雷 thunder + 针 needle. 避雷带 is the tape it is bonded to.',
    { focus: [LPX - .30, OZ - 1.10], reach: 3.0 });

  // ================================================================ 鸽子笼 the pigeon loft
  //
  // Somebody on ten keeps racing pigeons, and this is where they live: a mesh-fronted timber loft
  // on brick piers with a landing board and a whistle-perch above it, tucked into the corner the
  // washing does not reach. It is the second-most Beijing object on this roof after the laundry.
  //
  // The birds are lane 8's roster to add — the animal rig is skinned like the human one and costs
  // what a person costs, so a loft with four birds modelled would be four figures standing on the
  // roof of a scene that is drawn from every other deck. What this builds is the loft.
  (function loft() {
    const PX = 5.05, PZ = 2.60, PW = 1.80, PD = .95, PH = 1.20, PY = Y + .46;
    for (const [bx, bz] of [[PX - PW / 2 + .18, PZ - PD / 2 + .16], [PX + PW / 2 - .18, PZ - PD / 2 + .16],
                            [PX - PW / 2 + .18, PZ + PD / 2 - .16], [PX + PW / 2 - .18, PZ + PD / 2 - .16]])
      box(bx, Y + .23, bz, .24, .46, .24, C('#9c7a5e'), { hard: true, gloss: .12, mode: 11 });
    box(PX, PY + .03, PZ, PW + .10, .06, PD + .10, C('#8d7a55'),
      { hard: true, gloss: .16, mode: 6 });
    box(PX, PY + PH / 2 + .06, PZ + PD / 2 - .03, PW, PH, .06, C('#a58a5f'),
      { hard: true, gloss: .14, mode: 6 });
    for (const s of [-1, 1])
      box(PX + s * (PW / 2 - .03), PY + PH / 2 + .06, PZ, .06, PH, PD, C('#9d825a'),
        { hard: true, gloss: .14, mode: 6 });
    // the mesh front: a frame and six verticals, which is enough to read as wire without being it
    box(PX, PY + PH + .02, PZ, PW + .06, .05, PD + .06, C('#8d7a55'), { hard: true, gloss: .16, mode: 6 });
    box(PX, PY + PH + .12, PZ - .10, PW + .12, .14, PD - .06, C('#6f5f45'),
      { hard: true, gloss: .12, rx: -.14, mode: 6 });
    box(PX, PY + PH / 2 + .06, PZ - PD / 2 + .02, PW - .10, PH - .10, .012, C('#6a6459'),
      { hard: true, gloss: .30, alpha: .42, ...METL });
    for (let i = 0; i < 7; i++)
      cap(PX - PW / 2 + .16 + i * ((PW - .32) / 6), PY + PH / 2 + .06, PZ - PD / 2 + .012,
        .006, PH - .12, .006, cGalv, { gloss: G.metal });
    for (let i = 0; i < 3; i++)
      cap(PX, PY + .30 + i * ((PH - .22) / 2), PZ - PD / 2 + .012, .006, PW - .12, .006, cGalv,
        { rz: Math.PI / 2, gloss: G.metal });
    // the landing board and the pop-hole above it
    box(PX - .30, PY + PH - .12, PZ - PD / 2 - .16, .52, .04, .34, C('#c0a56f'),
      { hard: true, gloss: .18, mode: 6 });
    box(PX - .30, PY + PH - .02, PZ - PD / 2 + .006, .26, .22, .014, C('#3a352e'),
      { hard: true, gloss: .08 });
    for (const s of [-1, 1])
      cap(PX - .30 + s * .22, PY + PH - .22, PZ - PD / 2 - .16, .010, .22, .010, cGalv,
        { rx: .5, gloss: G.metal });
    // the whistle perch — a bamboo cross on a pole, which is what the flock circles
    cyl(PX + .78, PY + PH + .60, PZ + .10, .022, 1.20, cBamboo, { gloss: .22, mode: 6 });
    cap(PX + .78, PY + PH + 1.16, PZ + .10, .014, .90, .014, cBamboo,
      { rz: Math.PI / 2, gloss: .22, mode: 6 });
    cap(PX + .78, PY + PH + 1.02, PZ + .10, .012, .60, .012, cBamboo,
      { rz: Math.PI / 2, gloss: .22, mode: 6 });
    // the feed tin, the water pan and the grit, on the deck beside the piers
    cyl(PX - .95, Y + .13, PZ - .30, .115, .26, C('#8a7f5e'), { gloss: .24 });
    cyl(PX - .95, Y + .27, PZ - .30, .105, .03, C('#c9b47a'), { hard: true, gloss: .14 });
    cyl(PX - .68, Y + .045, PZ - .42, .140, .09, C('#3f6f8e'), { gloss: .26 });
    cyl(PX - .68, Y + .085, PZ - .42, .125, .012, C('#8fa6b4'),
      { hard: true, gloss: .50, alpha: .78 });
    // and the droppings, which is the honest half of keeping pigeons on a roof
    for (let i = 0; i < 6; i++)
      flat(PX - .70 + i * .34, Y + .010, PZ - PD / 2 - .40 - (i % 3) * .16, .16 + (i % 2) * .08,
        .13, C('#d6d2c4'), { mode: 7, gloss: .04, alpha: .30, ry: i * .9 });
    shade(PX, PZ, PW + .40, PD + .40, .46);
    stop(PX - PW / 2 - .06, PX + PW / 2 + .06, PZ - PD / 2 - .06, PZ + PD / 2 + .06);
    stop(PX + .68, PX + .88, PZ, PZ + .20);
    th('鸽子', PX, PY + PH * .6, PZ - PD / 2 - .30, '十楼的邻居在楼顶养鸽子。',
      'The neighbour on the tenth floor keeps pigeons on the roof.',
      '鸽子 gēzi — a pigeon. 养 yǎng, to keep an animal. 鸽子笼 is also what you call a tiny flat.',
      { focus: [PX - .40, PZ - 1.20], reach: 2.0 });
  })();

  // ================================================================ 杂物 what a roof accumulates
  //
  // Everything that came out of a flat and did not go to the tip: a bed base, two chairs with a
  // leg gone, a rolled mat and a bicycle frame, all under a blue tarp weighted with bricks. It is
  // the west corner, it is nobody's, and it has been there for years.
  (function junk() {
    const JX = -5.10, JZ = -1.30;
    box(JX, Y + .19, JZ, 1.10, .34, 1.80, C('#8a7f6a'), { hard: true, gloss: .10, ry: .07 });
    box(JX + .20, Y + .48, JZ - .30, .90, .26, 1.10, C('#7d7460'), { hard: true, gloss: .10, ry: -.14 });
    for (const [cx, cz, cr] of [[JX - .10, JZ + .70, .5], [JX + .34, JZ + .58, -.9]]) {
      box(cx, Y + .46, cz, .40, .04, .40, C('#9b7c52'), { hard: true, gloss: .14, ry: cr, mode: 6 });
      box(cx, Y + .70, cz + .18, .38, .44, .04, C('#9b7c52'),
        { hard: true, gloss: .14, ry: cr, rx: .10, mode: 6 });
      for (const s of [-1, 1])
        cap(cx + s * .16, Y + .23, cz - .14, .016, .46, .016, C('#8a6d47'),
          { ry: cr, gloss: .14, mode: 6 });
    }
    cyl(JX - .52, Y + .70, JZ - .10, .180, 1.30, C('#b8ae92'),
      { rz: Math.PI / 2, gloss: .12, ry: .3, mode: 7 });
    cap(JX + .58, Y + .64, JZ + .10, .022, 1.05, .022, C('#5d6b5f'), { rz: 1.1, ry: .5, gloss: .30 });
    cap(JX + .40, Y + .70, JZ - .34, .022, .90, .022, C('#5d6b5f'), { rz: -.7, ry: .9, gloss: .30 });
    cyl(JX + .62, Y + .30, JZ + .58, .270, .05, C('#3a3d42'), { rz: Math.PI / 2, gloss: .20 });
    cyl(JX + .62, Y + .30, JZ + .58, .050, .06, C('#8d949a'), { rz: Math.PI / 2, gloss: G.metal });
    // the tarp over the lot, and the bricks holding it down
    box(JX, Y + .90, JZ - .10, 1.50, .05, 2.20, C('#2f6f8e'), { gloss: .16, rz: .05, mode: 7 });
    box(JX - .74, Y + .52, JZ - .10, .06, .78, 2.10, C('#2f6f8e'), { gloss: .16, rz: .07, mode: 7 });
    box(JX + .74, Y + .58, JZ - .10, .06, .66, 2.10, C('#2a6584'), { gloss: .16, rz: -.05, mode: 7 });
    box(JX, Y + .60, JZ - 1.18, 1.46, .62, .06, C('#2a6584'), { gloss: .16, rx: .06, mode: 7 });
    for (const [bx, bz, br] of [[JX - .72, JZ + .82, .3], [JX + .70, JZ - .74, -.5], [JX - .66, JZ - .96, .8]])
      box(bx, Y + .95, bz, .22, .07, .11, C('#8e5a48'), { hard: true, gloss: .10, ry: br, mode: 11 });
    shade(JX, JZ, 1.90, 2.50, .48);
    stop(JX - .80, JX + .80, JZ - 1.25, JZ + 1.00);
    th('杂物', JX, Y + 1.00, JZ + 1.20, '楼顶堆着一堆杂物，盖着蓝布。',
      'A pile of junk sits on the roof under a blue tarpaulin.',
      '杂 miscellaneous + 物 things. 蓝色的防水布 — that blue tarp is on every site in the country.',
      { focus: [JX + 1.30, JZ + 1.20], reach: 2.2 });
  })();

  // ---- 马扎, the folding stool that lives folded against the south parapet. The chair by the
  // garden seats one and the roof's own prompt is about bringing a chair up at dusk; a second
  // seat is what makes that a thing two people do, and folded flat it costs the deck nothing.
  box(1.05, Y + .34, IZ0 + .05, .34, .66, .05, C('#8a6d47'), { gloss: .16, rz: .06, mode: 6 });
  box(1.12, Y + .34, IZ0 + .09, .30, .64, .04, C('#7d6340'), { gloss: .16, rz: -.04, mode: 6 });
  for (const s of [-1, 1])
    cap(1.08 + s * .13, Y + .34, IZ0 + .12, .012, .62, .012, C('#6f5836'),
      { rz: s * .05, gloss: .14, mode: 6 });
  box(1.08, Y + .42, IZ0 + .11, .30, .10, .05, C('#3f6f8e'), { gloss: .10, mode: 7 });
  cyl(1.08, Y + .04, IZ0 + .10, .020, .34, C('#9aa2a6'), { rz: Math.PI / 2, gloss: G.metal });
  cyl(1.08, Y + .66, IZ0 + .10, .020, .30, C('#9aa2a6'), { rz: Math.PI / 2, gloss: G.metal });
  shade(1.08, IZ0 + .10, .42, .28, .30);
  th('马扎', 1.08, Y + .52, IZ0 + .22, '墙根靠着一个马扎。',
    'A folding stool is propped against the parapet.',
    '马扎 mǎzhá — the little folding stool everybody in this city owns one of.',
    { focus: [1.08, IZ0 + .82], reach: 1.4 });

  // ---- 落水口, the two overflow scuppers cut through the south parapet at deck level. The 地漏
  // take the water in normal weather; these are what a Beijing cloudburst actually uses, and the
  // stain fanning down the render below each one is how you know which is which from the street.
  for (const sx of [-2.40, 2.90]) {
    box(sx, Y + .09, IZ0 - .015, .26, .14, .06, C('#6a6459'), { hard: true, gloss: .12, ...CAST });
    cyl(sx, Y + .09, Z0 + PT / 2, .062, PT + .04, C('#5f5c56'),
      { rx: Math.PI / 2, gloss: .16, ...CAST });
    box(sx, Y + .022, IZ0 + .16, .40, .012, .34, C('#7a746a'),
      { hard: true, mode: 9, gloss: .16, alpha: .55, ...SLAB });
    for (let i = 0; i < 3; i++)
      cap(sx - .07 + i * .07, Y + .11, IZ0 - .022, .006, .11, .006, cSteelD, { gloss: .40 });
  }

  // ================================================================ 配电箱 the roof's own supply
  //
  // The bulkhead by the door, the lift machine room and the obstruction light on the mast all have
  // to be fed from something, and on a Beijing roof that something is a grey steel box screwed to
  // the stair head with galvanised conduit fanning out of the bottom of it. It is the fixture that
  // explains every light up here, and it was the one thing missing that made them arbitrary.
  {
    const EX = SH0 + .52, EZ = SHZ - .11;
    box(EX, Y + 1.46, EZ, .52, .68, .17, C('#9aa1a6'), { hard: true, gloss: .34, ...METL });
    box(EX + .01, Y + 1.46, EZ - .088, .44, .60, .012, C('#8d949a'), { hard: true, gloss: .40 });
    cyl(EX - .21, Y + 1.46, EZ - .092, .012, .05, cSteelD, { rx: Math.PI / 2, gloss: .5 });
    box(EX + .19, Y + 1.46, EZ - .096, .05, .09, .014, C('#6d757b'), { hard: true, gloss: .46 });
    box(EX, Y + 1.74, EZ - .092, .30, .10, .006, C('#dca42a'), { hard: true, gloss: .20 });
    glyph(EX, Y + 1.74, EZ - .100, Math.PI, '有电危险',
      { size: .040, gap: .008, color: C('#2a241d') });
    box(EX, Y + 1.82, EZ - .02, .58, .05, .21, C('#8d949a'), { hard: true, gloss: .32, rx: -.18 });
    // the conduit: one run up to the mast, one along to the bulkhead, one dropping into the slab
    cyl(EX + .30, Y + 1.10, EZ - .04, .022, .74, cGalv, { rz: Math.PI / 2, gloss: G.metal });
    cyl(EX + .67, Y + 1.62, EZ - .04, .022, 1.10, cGalv, { gloss: G.metal, ...METL });
    cyl(EX - .16, Y + .62, EZ - .04, .022, 1.00, cGalv, { gloss: G.metal, ...METL });
    cyl(EX - .16, Y + .10, EZ - .04, .026, .16, C('#87909a'), { gloss: G.metal });
    for (let i = 0; i < 4; i++)
      box(EX - .16, Y + .34 + i * .30, EZ - .062, .06, .03, .05, cSteelD,
        { hard: true, gloss: G.metal });
    // two 消防砂 buckets under it, which is what the 物业 inspection actually looks for
    for (const [bs, bc] of [[-1, '#b8412c'], [1, '#a8382a']]) {
      taper(EX + .96 + bs * .17, Y + .13, EZ - .16, .30, .26, .30, C(bc), { gloss: .24 });
      cyl(EX + .96 + bs * .17, Y + .26, EZ - .16, .140, .03, C('#c4a97a'), { hard: true, gloss: .10 });
      cap(EX + .96 + bs * .17, Y + .30, EZ - .16, .008, .28, .008, cSteelD,
        { rz: Math.PI / 2, gloss: .40 });
    }
    shade(EX, EZ, .70, .34, .26);
    shade(EX + .96, EZ - .16, .74, .40, .32);
    stop(EX - .30, EX + .30, SHZ - .22, SHZ);
    stop(EX + .70, EX + 1.22, EZ - .34, EZ + .02);
    th('配电箱', EX, Y + 1.46, EZ - .26, '楼顶的配电箱，写着有电危险。',
      'The roof distribution board, marked "danger — live".',
      '配电 to distribute power + 箱 box. 有电危险 is on every one of them.',
      { focus: [EX, SHZ - .86], reach: 1.7 });
  }

  // ================================================================ 屋面检修口 the roof hatch
  //
  // F11 prints 屋面检修口 · 已上锁 · 禁止攀爬 on a notice by its own ceiling (js/home-f11.js), and
  // until now the hatch that notice is about did not exist on the deck above it. It is the other
  // way onto this roof: a steel lid on a low kerb over the eleventh-floor landing, padlocked from
  // this side, with the rungs of the ladder visible under the lip.
  (function hatch() {
    const HTX = 5.10, HTZ = -1.10, HW = .78, HD = .68;
    box(HTX, Y + .11, HTZ, HW + .18, .22, HD + .18, cCope, { hard: true, gloss: .24, ...SLAB });
    box(HTX, Y + .225, HTZ, HW, .03, HD, C('#2b2e31'), { hard: true, gloss: .10 });
    box(HTX, Y + .30, HTZ + .12, HW + .06, .05, HD + .06, cGalv,
      { hard: true, gloss: G.metal, rx: -.30, ...METL });
    for (const s of [-1, 1])
      cap(HTX + s * (HW / 2 - .06), Y + .34, HTZ + .04, .010, .30, .010, cSteelD,
        { rx: -.30, gloss: G.metal });
    cyl(HTX, Y + .38, HTZ - .30, .022, .16, cSteelD, { rz: Math.PI / 2, gloss: G.metal });
    box(HTX, Y + .30, HTZ - .34, .09, .05, .03, C('#9a8a4e'), { hard: true, gloss: .48, tag: '锁' });
    for (let i = 0; i < 3; i++)
      cap(HTX, Y + .16 - i * .17, HTZ - .18, .012, .40, .012, cSteel,
        { rz: Math.PI / 2, gloss: G.metal });
    glyph(HTX, Y + .245, HTZ - .02, 0, '禁止攀爬',
      { size: .050, gap: .010, color: C('#c9382a'), lift: .006 });
    shade(HTX, HTZ, HW + .40, HD + .40, .40);
    stop(HTX - HW / 2 - .12, HTX + HW / 2 + .12, HTZ - HD / 2 - .12, HTZ + HD / 2 + .12);
    th('检修口', HTX, Y + .50, HTZ - .52, '屋面检修口，锁着的。',
      'The roof access hatch, and it is locked.',
      '检修 to inspect and repair + 口 an opening. 已上锁 — already locked.',
      { focus: [HTX - .30, HTZ - 1.05], reach: 1.6 });
  })();

  // ================================================================ 洗衣 what the yard needs
  //
  // A drying yard with nothing but line is half an object. What is actually beside one is the
  // gear: a galvanised tub on a stand, an enamel basin, a scrubbing board, the peg bag on the
  // frame post, and a tap on the riser — because the water for all of it is already up here.
  (function washing() {
    const WX = 3.55, WZ = 3.30;
    for (const s of [-1, 1]) {
      cap(WX + s * .34, Y + .27, WZ - .18, .020, .56, .020, cGalv, { rx: -.14, gloss: G.metal });
      cap(WX + s * .34, Y + .27, WZ + .18, .020, .56, .020, cGalv, { rx: .14, gloss: G.metal });
    }
    box(WX, Y + .55, WZ, .84, .04, .48, cGalv, { hard: true, gloss: G.metal, ...METL });
    taper(WX, Y + .70, WZ, .74, .26, .46, C('#b9bfc3'), { gloss: G.metal, ...METL });
    cyl(WX, Y + .82, WZ, .30, .012, C('#8fa6b4'), { hard: true, gloss: .55, alpha: .70 });
    box(WX - .34, Y + .78, WZ - .04, .04, .38, .26, C('#c6b58c'),
      { hard: true, gloss: .14, rz: .26, mode: 6 });
    for (let i = 0; i < 5; i++)
      cap(WX - .355, Y + .70 + i * .07, WZ - .04, .006, .22, .006, C('#a8956c'),
        { rz: Math.PI / 2 + .26, gloss: .12 });
    taper(WX + .62, Y + .10, WZ + .26, .46, .20, .46, C('#e0ded2'), { gloss: .30 });
    cyl(WX + .62, Y + .20, WZ + .26, .215, .012, C('#c9382a'), { hard: true, gloss: .34 });
    cyl(WX + .58, Y + .26, WZ + .22, .075, .06, C('#dfe6ea'), { gloss: .26 });
    // the tap on the riser, and the hose end lying under it
    cyl(WX - .90, Y + .60, IZ1 - .30, .034, 1.20, cGalv, { gloss: G.metal, ...METL });
    cyl(WX - .90, Y + 1.02, IZ1 - .38, .026, .18, C('#b8bcc0'),
      { rx: Math.PI / 2, gloss: G.metal, ...METL });
    cyl(WX - .90, Y + 1.14, IZ1 - .30, .038, .07, C('#3f6f8e'), { gloss: .34, tag: '水龙头' });
    for (let i = 0; i < 5; i++)
      cyl(WX - .90 + (i % 2 ? .12 : -.10), Y + .045 + i * .042, WZ + .70 - i * .05,
        .19 - i * .012, .04, C('#3f6f4f'), { gloss: .26 });
    // the peg bag hung on the line frame, and the pegs that fell out of it
    box(LX1 - .02, Y + 1.34, LINES[3][0] + .16, .05, .30, .24, C('#c9506a'),
      { gloss: .10, mode: 7, rz: .05 });
    cap(LX1 - .02, Y + 1.52, LINES[3][0] + .16, .008, .22, .008, cSteel,
      { rz: Math.PI / 2 + .4, gloss: G.metal });
    for (let i = 0; i < 4; i++)
      cap(LX1 - .30 + i * .16, Y + .012, LINES[3][0] + .34 + (i % 2) * .18, .012, .07, .012,
        i % 2 ? C('#c8543f') : C('#3f7fa8'), { rz: Math.PI / 2, ry: i * 1.2, gloss: .28 });
    shade(WX, WZ, 1.00, .70, .42);
    shade(WX + .62, WZ + .26, .58, .58, .38);
    stop(WX - .48, WX + .48, WZ - .30, WZ + .30);
    stop(WX + .38, WX + .86, WZ + .02, WZ + .50);
    th('洗衣', WX, Y + .90, WZ - .40, '在楼顶洗衣服，水从水箱来。',
      'You do the washing on the roof; the water comes from the tank.',
      '洗 to wash + 衣 clothing. 搓板 cuōbǎn is the scrubbing board leaning in the tub.',
      { focus: [WX, WZ - .95], reach: 1.8 });
  })();

  // ---- 保温管, the solar heaters' flow and return in grey lagging, dropping into the slab. Three
  // drums that feed nothing are three drums; the pipework is what makes them plumbing.
  for (const sz of [-3.75, -2.25, -0.75]) {
    cyl(4.05, Y + .40, sz - .34, .048, .70, C('#d8d2c4'), { gloss: .16 });
    cyl(3.62, Y + .11, sz - .34, .048, .90, C('#d8d2c4'), { rz: Math.PI / 2, gloss: .16 });
  }
  cyl(3.14, Y + .11, -2.25, .056, 3.30, C('#cfc9bb'), { rx: Math.PI / 2, gloss: .16 });
  cyl(3.14, Y + .11, -0.55, .062, .16, C('#b8b2a4'), { rx: Math.PI / 2, gloss: .16 });
  box(3.14, Y + .05, -0.34, .22, .10, .22, cTar, { hard: true, gloss: .20, ...CAST });
  for (let i = 0; i < 4; i++)
    cyl(3.62, Y + .11, -4.05 + i * 1.05, .062, .05, C('#9aa2a6'),
      { rz: Math.PI / 2, gloss: G.metal });
  shade(3.38, -2.25, .60, 3.60, .30);

  // ================================================================ 天黑以后 lighting the roof
  //
  // One bulkhead by the stair head was the whole night lighting for a 13.8 × 12.1 m deck whose
  // stated payoff is the city at half past six — so everything past the door was black at the hour
  // the floor exists for. Three more, each on a fixture that would really carry one: the tank
  // stand's inspection lamp, a lamp on the loft, and the drying yard's own strip on the pole.
  //
  // They are `light()` and not glow: `A.light` is a real point source the renderer sums, and four
  // of them on a deck this size is the same count the corridor downstairs runs. Radius is kept
  // short — 3.2 to 4.2 m — because a roof lit evenly is a car park, and the thing being protected
  // is the contrast that makes the skyline read.
  box(-4.55, Y + 2.34, 1.95, .16, .11, .09, C('#d9d3c4'), { hard: true, mode: 1, glow: .10 });
  cap(-4.55, Y + 2.52, 1.95, .012, .36, .012, cGalv, { gloss: G.metal });
  light(-4.55, Y + 2.28, 1.95, [0.96, 0.94, 0.86], .26, 3.60);
  box(5.05, Y + 1.96, 2.10, .18, .10, .12, C('#d9d3c4'), { hard: true, mode: 1, glow: .09 });
  light(5.05, Y + 1.90, 2.05, [1.00, 0.90, 0.70], .22, 3.20);
  cap(-2.00, Y + 1.74, -1.45, .022, .70, .022, C('#e8e2d2'),
    { rz: Math.PI / 2, mode: 1, glow: .08, gloss: .20 });
  light(-2.00, Y + 1.70, -1.45, [0.98, 0.95, 0.88], .20, 3.40);

  // ================================================================ 晾衣 and the weather
  //
  // The washing is the roof's one visible tie to the rest of the simulation, and it had none: four
  // lines hung with a fixed set of cloths that read the same in a downpour as at noon in June.
  //
  // `Weather.now` is the live record js/weather.js advances — `wind` for the envelope and `wet`
  // for whether anything should be out at all. This reads it in two places and neither of them is
  // per-frame:
  //
  //   1. at build, so the yard is dressed for the day you arrive rather than for a default;
  //   2. in `HomeRoof.weatherTick`, a setter js/game.js can call as coarsely as once a second.
  //
  // What it must NOT do is poll. There is no tick hook a FlatFit room can register — the fixture
  // block at js/game.js:10567 names every driven part by hand — so the honest shape is a setter
  // that costs nothing until somebody calls it, and a ticket for the one line that calls it. Until
  // that line lands the build-time read is what runs, and the movement below stays at rest. Said
  // plainly rather than dressed up: today this changes the washing when the scene is built and not
  // while you watch.
  const wxNow = () => (typeof Weather !== 'undefined' && Weather.now) ? Weather.now : null;
  // How much washing is out. Nobody leaves a quilt on the roof in the rain, and the line comes in
  // before the sheets do — so `wet` takes the quilts off the pole first and thins the lines after.
  HomeRoof.weatherTick = w => {
    const wx = w || wxNow();
    if (!wx) return;
    const wet = wx.wet || 0, wind = wx.wind === undefined ? .14 : wx.wind;
    const takeIn = wet > .35;
    for (const p of laundry) p.alpha = takeIn ? 0 : 1;
    HomeRoof.washingOut = !takeIn;
    HomeRoof.windAmt = Math.max(0, Math.min(1, wind));
    return HomeRoof.windAmt;
  };
  HomeRoof.weatherTick(null);
  // A puddle on the screed that is there when the roof is wet and gone when it is not. One prop,
  // read once, and the cheapest possible statement that this deck is outdoors in a game that
  // believes it is in a room.
  {
    const wx = wxNow(), wet = wx ? (wx.wet || 0) : 0;
    flat(1.90, Y + .014, -0.30, 2.20, 1.40, C('#8fa6b4'),
      { mode: 7, gloss: .55, alpha: .10 + .42 * wet });
    flat(-3.10, Y + .014, -3.30, 1.60, 1.00, C('#8fa6b4'),
      { mode: 7, gloss: .55, alpha: .08 + .34 * wet });
  }

  // ================================================================ registration
  //
  // `zone` is what `clampMove` keeps the body inside, and js/world.js `setFloor` refuses a deck
  // with none — so this is the line that makes the twelfth button on the lift panel true.
  //
  // ONE rectangle, the whole footprint, and everything solid above is a collider. Two abutting
  // zones would have been the obvious shape and would have been wrong: `clampMove` insets the zone
  // you are standing in by the 0.30 m body radius, so two rectangles that merely touch leave a
  // 0.60 m band down the join that the body is pushed out of from both sides. That is what the
  // 'gap' zone at the front door downstairs exists to patch, and the way not to need one is to
  // have a single zone and let the colliders draw the walls.
  //
  // `ceil` is generous. The point of this floor is the view, and a camera held 2.56 m over the
  // deck the way a corridor holds it cannot look over its own parapet.
  //
  // It is also deliberately WIDER than the building on three sides, and that is not sloppiness.
  // `hiddenAt` in js/game.js measures the cutaway off this rectangle: once the eye leaves it,
  // everything within 0.32 m of the edge it left through stops being drawn. On a floor with a
  // ceiling that is the whole point — it is what opens a room up. Up here there is no ceiling to
  // open, and the only things near the edge are the parapet and the facade below it, which are
  // exactly what must NOT vanish when the camera backs out over the courtyard. Pushed out to
  // ±6.9 and -5.9, the cutaway threshold clears the skin at ±6.06 and the roof keeps its edges.
  // The body is held by the parapet colliders regardless, which is where an edge belongs.
  // ---------------------------------------------------------------- no cutaway up here
  //
  // Every prop this file built, opted out of the wall cutaway in one sweep.
  //
  // `hiddenAt` (js/game.js:2008) hides anything within 0.32 m of the edge of the room rectangle
  // the eye has backed out through. That is what opens a *room* up — you back the camera through
  // the near wall and the near wall stops being drawn. There is no near wall up here and no
  // ceiling either, so the cutaway has nothing useful to take away and everything to lose: what
  // sits near the edge of this deck is the parapet, the facade below it and thirty metres of city
  // beyond that, and those are precisely what must not vanish when the camera drifts out over the
  // courtyard. `hiddenProp` returns false for a `nocut` prop before it reads the room at all.
  //
  // Doing it here rather than as a flag on three hundred calls is deliberate: it is one statement
  // that cannot be forgotten by the next prop somebody adds, and js/build.js already excludes
  // `nocut` props from `tagBox`, so no tag group is left being judged by a point nothing occupies.
  //
  // It is also what makes the four zones below safe. With the cutaway live, a deck split into
  // rooms pops its own parapet every time the eye crosses an internal boundary — which is why
  // this file shipped with one zone and a paragraph explaining why. The zones were never the
  // problem; the cutaway on an open deck was.
  if (A.props) for (let i = P0; i < A.props.length; i++) A.props[i].nocut = true;

  // ---------------------------------------------------------------- the zones
  //
  // Four areas rather than one. `roomAt` (js/world.js:343) hands back the FIRST zone that contains
  // the body, so these run most specific first and the whole-deck rectangle last; `clampMove`
  // keeps the body inside the *union*, and the whole-deck one is in that union, so walkability is
  // exactly what it was with one zone and the flood fill reads the same.
  //
  // What changes is `light` and `ceil`. One zone meant one overhead lamp position for the whole
  // 13.8 × 12.1 m deck and one room-box height for the drying yard, the tank stand, the stair head
  // and the open south edge alike — so the corner under the bulkhead and the middle of the roof
  // shaded identically, which is the one thing a roof at dusk must not do.
  //
  // The two abutting-zone hazards the single-zone note warned about are both handled: the sub-
  // zones overlap by a metre or more rather than merely touching, so no 0.60 m dead band forms
  // where `clampMove` insets from both sides; and the cutaway is off, so no internal boundary can
  // blink the parapet.
  A.zone({                                   // the stair head and the machine rooms, at the back
    id: 'roofStair', x0: -6.9, x1: 6.9, z0: 3.10, z1: Z1,
    light: [SDX + .70, Y + 2.20, SHZ - .50],
    ceil: Y + 3.40,
  });
  A.zone({                                   // the drying yard and the tanks, the middle band
    id: 'roofYard', x0: -6.9, x1: 6.9, z0: -0.90, z1: Z1,
    light: [-0.40, Y + 2.05, 1.60],
    ceil: Y + 4.20,
  });
  A.zone({                                   // the garden, the chair and the south parapet
    id: 'roofView', x0: -6.9, x1: 6.9, z0: -5.9, z1: 0.40,
    light: [-2.30, Y + 1.70, -3.20],
    ceil: Y + 9.00,
  });
  // The whole deck, last and deliberately WIDER than the building on three sides. It is the
  // rectangle `clampMove` actually walks the body around, and the fallback `roomAt` returns for
  // anything the three above miss. The body is held by the parapet colliders regardless, which is
  // where an edge belongs.
  A.zone({
    id: 'roof', x0: -6.9, x1: 6.9, z0: -5.9, z1: Z1,
    light: [SDX + .70, Y + 2.20, SHZ - .50],
    ceil: Y + 5.20,
  });
  // The room box `R.setRoom` uses on this deck. Left at the corridor's, every surface up here
  // would be shaded as though there were a ceiling four centimetres over it: `openness()` in
  // js/gl.js measures `uRoom.y - p.y` and closes the ambient down to 0.76 when that reaches zero.
  // Nine metres of headroom is the nearest an indoor scene can come to saying "sky above this".
  A.deckH(Y + 9.0);

  HomeRoof.built = true;
  return HomeRoof;
};
