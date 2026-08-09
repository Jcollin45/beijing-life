// F9 · 新婚 — the newlyweds' floor, deck 9, y = 24.80.
//
// Registered into `FlatFit` (declared at the top of js/world.js) under the key 'f9', which
// `DECK_OF` maps to deck 9. TOWER.md holds the deck contract and APARTMENT.md the building's
// footprint; both are fixed, and this file builds to them rather than measuring off a neighbour
// who is being written at the same time.
//
//   x -6.00 .. 6.00     the building
//   z -5.00 .. 3.20     the flat
//   z  3.20 .. 6.20     the landing
//   LIFT   x 1.6..3.4  z 4.9..6.2      the working shaft
//   LIFT_B x -0.4..1.4 z 4.9..6.2      the second shaft, doors always shut
//   clear height 2.60
//
// ---------------------------------------------------------------------------------------------
// THIS FILE IS A SHELL AS WELL AS A FIT-OUT, which js/home-corridor.js is not.
//
// `buildShell` in js/world.js lays deck 0 and deck 2 by hand, and `buildShafts` loops over
// `[0, 2]`. Nothing above the second floor exists until its own file lays it: no slab, no
// ceiling, no perimeter wall, no shaft cladding, no landing, no call panel. All of that is built
// here, off `A.y0`, which is the only height this file is allowed to know. See the ticket at the
// foot of the file for the one thing that genuinely cannot be built from out here.
//
// ---------------------------------------------------------------------------------------------
// THE FLOOR, as this file settles it. Nine rooms and the landing; the lines are x = -4.00, -2.60,
// -1.60, 2.60, 3.20 and z = -3.40, -1.40, -1.20, 1.60, 3.20.
//
//        x -6.00     -4.00   -2.60  -1.60           2.60 3.20      6.00
//   6.20 ┌───────────────────────────────────────────────────────────┐
//        │        走廊  the landing        [LIFT_B]  [LIFT]          │
//   3.20 ├──────────┬───────────┬────────────────────────┬───────────┤
//        │  储藏    │  卫生间   │        走道            │   玄关    │
//   1.60 ├──────────┴───────────┼────────────────────┬───┴───────────┤
//        │       主卧           │                    │     餐厅     │
//  -1.20 │                      │                    ├──────────────┤
//  -1.40 ├──────────────────────┤       客厅         │              │
//        │                      │                    │     厨房     │
//  -3.40 │       空房           ├────────────────────┤              │
//        │    (the empty one)   │      阳台          │              │
//  -5.00 └──────────────────────┴────────────────────┴──────────────┘
//
// Everything opens off the 客厅 or the 走道, except the 储藏, which opens off the 主卧 — which is
// what a store room in a flat this shape actually does.
//
// The 空房 is the room they have not got to: bare plaster, a bare bulb on a flex, two windows,
// and nothing else at all. It is deliberately the best-lit room on the floor, because a room with
// nothing in it is only worth building if the light in it is the subject.
const HomeF9 = { built: false, ROOMS: [] };

FlatFit['f9'] = A => {
  if (!A || typeof A.box !== 'function') { console.warn('home-f9: toolkit A missing'); return HomeF9; }

  const box = A.box, cyl = A.cyl, ball = A.ball, taper = A.taper || A.box;
  const cap = A.cap || A.capsule || A.box;
  const wall = A.wall, flat = A.flat, ceilQ = A.ceiling;
  const glyph = A.glyph || (() => []);
  const stop = A.stop, light = A.light || (() => null), shade = A.shade || (() => null);
  const glow = A.glow || (() => null);
  const C = A.C, M = A.M, MAT = A.MAT;
  const skyP = A.sky || (p => p), cityP = A.city || ((l, p) => p);
  const PI = Math.PI;

  // ------------------------------------------------------------------ the contract, read not typed
  const Y = A.y0;                                  // deck 9 in world y — never a literal
  const CR = A.CORR, FT = A.FLAT, LF = A.LIFT, LB = A.LIFT_B;
  const X0 = FT.x0, X1 = FT.x1;                    // -6.00 .. 6.00
  const ZF = FT.z0;                                // -5.00, the south face of the building
  const ZM = FT.z1;                                //  3.20, flat | landing
  const ZN = CR.z1;                                //  6.20, the north face
  const H = CR.h;                                  //  2.60 clear
  const CY = Y + H;                                // the ceiling plane
  const FL = Y + .006;                             // what things stand on, 2 mm over the slab
  const T = .10;                                   // interior partition thickness
  const DTOP = 2.05;                               // interior door head

  // ------------------------------------------------------------------ palette
  // A flat handed over eight weeks ago: developer's paint, new laminate, and red on top of it.
  const col = {
    wall:   C('#dad1bd'), wallC: C('#cdc4b1'), bare: C('#cfc8b8'), bareD: C('#bab3a2'),
    ceil:   C('#f2eee4'), skirt: C('#c5b79c'), trim:  C('#8d7857'),
    floor:  C('#a8804f'), tile:  C('#e2dbcd'), tileD: C('#d3cbba'), stone: C('#8f8880'),
    red:    C('#c22a1e'), redD:  C('#8d1c13'), redL:  C('#dc4a35'),
    gold:   C('#e6c164'), goldD: C('#b9913c'),
    steel:  C('#b4babf'), steelD:C('#8b9298'), steelX:C('#666d73'), alu: C('#c6ccd0'),
    film:   C('#9fc0cf'),                                    // protective film, still on
    ply:    C('#c9a877'), plyD:  C('#a8873f'), card: C('#b6935f'), cardD: C('#96784a'),
    wrap:   C('#dfe6e4'), foam:  C('#e7eaea'),
    doorA:  C('#6f3d2c'), doorB: C('#824934'), doorD: C('#4c281f'),
    white:  C('#f2efe6'), paper: C('#eee8d8'), ink: C('#241d17'), grey: C('#7f868c'),
    warm:   C('#f7f0d9'), dead:  C('#bab7ae'), bulbW: C('#ffe9b8'),
    sky:    C('#b8cfe0'), towerF:C('#93a7b7'), towerN: C('#7c93a5'), lit: C('#f6d489'),
    porc:   C('#f7f5ef'), glass: C('#cfdde4'), leaf: C('#4e7c46'), rubber: C('#3a3f42'),
  };
  const PL = { hard: true, gloss: .12, ...MAT.plaster };
  const TIL = { hard: true, gloss: .40, ...MAT.tile };
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    A.th(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // ==================================================================== 1. slab and ceiling
  //
  // One quad per room, so no two share a plane and each room gets the surface it actually has:
  // laminate where they live, tile where it is wet, and the landing's terrazzo outside.
  const SLAB = Y + .004;
  const floorQ = (x0, x1, z0, z1, c, o) =>
    flat((x0 + x1) / 2, SLAB, (z0 + z1) / 2, x1 - x0, z1 - z0, c, o);
  const WOOD = { mode: 3, gloss: .30, mat: 'wood', matScale: 1.05, matAmt: .28, nrmAmt: .32 };
  const TILEF = { mode: 9, gloss: .42, ...MAT.tile };

  floorQ(X0, X1, ZM, ZN, col.stone, { mode: 9, gloss: .34, ...MAT.slab });   // the landing
  floorQ(-6.00, -1.60, 1.60, 3.20, col.tile, TILEF);       // 储藏 + 卫生间
  floorQ(-1.60, 3.20, 1.60, 3.20, col.floor, WOOD);        // 走道
  floorQ(3.20, 6.00, 1.60, 3.20, col.tileD, TILEF);        // 玄关 — tiled, shoes come off here
  floorQ(-6.00, -2.60, -1.40, 1.60, col.floor, WOOD);      // 主卧
  floorQ(-2.60, 2.60, -3.40, 1.60, col.floor, WOOD);       // 客厅
  floorQ(2.60, 6.00, -1.20, 1.60, col.floor, WOOD);        // 餐厅
  floorQ(2.60, 6.00, -5.00, -1.20, col.tile, TILEF);       // 厨房
  floorQ(-6.00, -2.60, -5.00, -1.40, col.floor, WOOD);     // 空房
  floorQ(-2.60, 2.60, -5.00, -3.40, col.tileD, TILEF);     // 阳台

  ceilQ(0, CY, (ZF + ZM) / 2, X1 - X0, ZM - ZF, col.ceil, { gloss: .07, glow: .015 });
  ceilQ(0, CY, (ZM + ZN) / 2, X1 - X0, ZN - ZM, C('#e7e1d4'), { gloss: .07, glow: .015 });

  // ==================================================================== 2. the envelope
  //
  // Four one-sided faces, each turned into the building. A quad faces its yaw and nothing else,
  // so an outward-facing perimeter wall is a hole you look straight through — which is exactly
  // what went wrong with the shell's second shaft on deck 2.
  //
  // `exWall` lays a run with rectangular holes cut for windows: full-height segments between the
  // holes, an apron under each and a header over. `ax` is the axis the wall stands on ('z' = at
  // constant z, running in x); `sgn` is +1 when the room is on the greater side of it.
  function exWall(ax, at, sgn, a0, a1, holes, c) {
    const yaw = ax === 'z' ? (sgn > 0 ? 0 : PI) : (sgn > 0 ? PI / 2 : -PI / 2);
    const put = (m, L, y0, h) => {
      if (L < .004 || h < .004) return;
      ax === 'z' ? wall(m, Y + y0 + h / 2, at, L, h, yaw, c, PL)
                 : wall(at, Y + y0 + h / 2, m, L, h, yaw, c, PL);
    };
    let cur = a0;
    for (const w of (holes || []).slice().sort((p, q) => p.a0 - q.a0)) {
      put((cur + w.a0) / 2, w.a0 - cur, 0, H);
      put((w.a0 + w.a1) / 2, w.a1 - w.a0, 0, w.sill);
      put((w.a0 + w.a1) / 2, w.a1 - w.a0, w.top, H - w.top);
      cur = w.a1;
    }
    put((cur + a1) / 2, a1 - cur, 0, H);
  }

  // A window. Everything beyond the wall plane is placed *away* from the room and turned back at
  // it, so the sky, the skyline and the glazing are all read from inside and nothing is ever laid
  // on the wall's own plane. `A.sky` hands the pane to the clock and `A.city` hands it the towers,
  // so these change colour with the hour and light up at night on their own.
  //
  // Nine floors up the view is most of what there is to look at in a flat with no furniture in it,
  // which is why the windows get more geometry than anything else in the room.
  function window9(ax, at, sgn, ctr, w, sill, top, o = {}) {
    const hh = top - sill, cy = Y + (sill + top) / 2;
    // out(d): d metres outside the wall, facing back into the room.
    const P = (d, m, y, W, Hh, c, oo) => ax === 'z'
      ? box(m, y, at - sgn * d, W, Hh, .012, c, oo)
      : box(at - sgn * d, y, m, .012, Hh, W, c, oo);
    // Glow by area, not by habit: this pane is w x hh, and the brief's band is .02-.05 for about
    // a square metre. The balcony's glazing is eight of them and asks for the bottom of it.
    skyP(P(.115, ctr, cy + .06, w + .14, hh + .30, col.sky,
           { hard: true, mode: 1, glow: o.glow === undefined ? .028 : o.glow }));
    const bands = o.bands || [[-.34, .34, .78], [-.02, .26, 1.14], [.30, .30, .62], [.52, .22, .96]];
    bands.forEach(([bx, bw, bh], i) => {
      const far = i % 2 === 0;
      cityP(far ? 0 : 1, P(far ? .100 : .086, ctr + bx * w, Y + sill - .30 + bh / 2,
        bw * w, bh, far ? col.towerF : col.towerN, { hard: true, mode: 1, glow: .016 }));
      if (!far) for (let k = 0; k < 3; k++)
        cityP(2, P(.078, ctr + bx * w + (k - 1) * bw * w * .30, Y + sill + .10 + k * .22,
          bw * w * .17, .05, col.lit, { hard: true, mode: 1, glow: .05 }));
    });
    // the reveal — four plaster returns, so the hole reads as a hole in a thick wall
    const rv = (m, y, W, Hh, D) => ax === 'z'
      ? box(m, y, at - sgn * (D / 2 - .005), W, Hh, D, col.wallC, PL)
      : box(at - sgn * (D / 2 - .005), y, m, D, Hh, W, col.wallC, PL);
    rv(ctr, Y + sill - .05, w + .18, .10, .16);
    rv(ctr, Y + top + .05, w + .18, .10, .16);
    for (const s of [-1, 1]) ax === 'z'
      ? box(ctr + s * (w / 2 + .05), cy, at - sgn * .075, .10, hh, .16, col.wallC, PL)
      : box(at - sgn * .075, cy, ctr + s * (w / 2 + .05), .16, hh, .10, col.wallC, PL);
    // white aluminium frame: two rails, two stiles, one mullion
    const fr = (m, y, W, Hh) => ax === 'z'
      ? box(m, y, at - sgn * .045, W, Hh, .045, col.alu, { hard: true, gloss: .38, ...MAT.metal })
      : box(at - sgn * .045, y, m, .045, Hh, W, col.alu, { hard: true, gloss: .38, ...MAT.metal });
    fr(ctr, Y + sill + .03, w + .04, .06);
    fr(ctr, Y + top - .03, w + .04, .06);
    for (const s of [-1, 1]) fr(ctr + s * (w / 2 - .03), cy, .06, hh);
    if (o.mullion !== false) fr(ctr, cy, .05, hh);
    // the pane
    ax === 'z'
      ? box(ctr, cy, at - sgn * .022, w - .07, hh - .07, .010, col.glass,
            { hard: true, mode: 18, alpha: .14, gloss: .80 })
      : box(at - sgn * .022, cy, ctr, .010, hh - .07, w - .07, col.glass,
            { hard: true, mode: 18, alpha: .14, gloss: .80 });
    // the board inside, and the patch of daylight the opening throws on the floor
    if (o.sill !== false) ax === 'z'
      ? box(ctr, Y + sill - .045, at + sgn * .10, w + .22, .05, .24, col.white,
            { hard: true, gloss: .26, tag: '窗户' })
      : box(at + sgn * .10, Y + sill - .045, ctr, .24, .05, w + .22, col.white,
            { hard: true, gloss: .26, tag: '窗户' });
    const px = ax === 'z' ? ctr : at + sgn * .95, pz = ax === 'z' ? at + sgn * .95 : ctr;
    glow(M.trs(px, Y + .022, pz, 0, ax === 'z' ? w + .9 : 2.1, 1, ax === 'z' ? 2.1 : w + .9),
         C('#e8e2cd'), o.pool === undefined ? .30 : o.pool, true);
  }

  exWall('z', ZF, 1, X0, X1, [                                   // south, faces +z
    { a0: -5.20, a1: -3.80, sill: .90, top: 2.15 },              //   空房
    { a0: -2.20, a1: 2.20, sill: .35, top: 2.22 },               //   阳台, near floor to head
    { a0: 4.20, a1: 5.60, sill: 1.00, top: 2.10 },               //   厨房
  ], col.wall);
  exWall('x', X0, 1, ZF, ZN, [                                   // west, faces +x
    { a0: -3.40, a1: -2.00, sill: .90, top: 2.15 },              //   空房
    { a0: -.60, a1: .80, sill: .90, top: 2.15 },                 //   主卧
    { a0: 4.30, a1: 5.50, sill: .95, top: 2.15 },                //   the landing
  ], col.wall);
  exWall('x', X1, -1, ZF, ZN, [                                  // east, faces -x
    { a0: -2.80, a1: -1.70, sill: 1.05, top: 2.05 },             //   厨房
    { a0: -.40, a1: 1.00, sill: .95, top: 2.15 },                //   餐厅
  ], col.wall);
  exWall('z', ZN, -1, X0, X1, [], col.wall);                     // north, faces -z

  window9('z', ZF, 1, -4.50, 1.40, .90, 2.15);
  window9('z', ZF, 1, 0, 4.40, .35, 2.22, { pool: .42, glow: .016, bands:
    [[-.40, .20, .92], [-.12, .16, 1.34], [.16, .22, .70], [.44, .18, 1.08]] });
  window9('z', ZF, 1, 4.90, 1.40, 1.00, 2.10);
  window9('x', X0, 1, -2.70, 1.40, .90, 2.15, { pool: .36 });
  window9('x', X0, 1, .10, 1.40, .90, 2.15);
  window9('x', X0, 1, 4.90, 1.20, .95, 2.15, { pool: .22 });
  window9('x', X1, -1, -2.25, 1.10, 1.05, 2.05, { mullion: false });
  window9('x', X1, -1, .30, 1.40, .95, 2.15);

  stop(X0 - .40, X0 + .10, ZF, ZN);
  stop(X1 - .10, X1 + .40, ZF, ZN);
  stop(X0, X1, ZF - .40, ZF + .10);
  stop(X0, X1, ZN - .10, ZN + .40);
  const skirtRun = (ax, at, sgn, a0, a1) => ax === 'z'
    ? box((a0 + a1) / 2, Y + .062, at + sgn * .042, a1 - a0, .124, .06, col.skirt,
          { hard: true, gloss: .20 })
    : box(at + sgn * .042, Y + .062, (a0 + a1) / 2, .06, .124, a1 - a0, col.skirt,
          { hard: true, gloss: .20 });
  skirtRun('z', ZF, 1, X0, X1); skirtRun('z', ZN, -1, X0, X1);
  skirtRun('x', X0, 1, ZF, ZN); skirtRun('x', X1, -1, ZF, ZN);

  // ==================================================================== 3. flat | landing
  //
  // Two faces 20 mm apart rather than one plane. The shell builds these back-to-back and coplanar
  // on deck 2 and gets away with it because a quad is single-sided; 10 mm each way costs nothing
  // and takes the question off the table for good.
  const FDX = 3.90, FDW = 1.00, FDTOP = 2.10;      // the front door, stacked over deck 2's
  for (const [x0, x1] of [[X0, FDX - FDW / 2], [FDX + FDW / 2, X1]]) {
    wall((x0 + x1) / 2, Y + H / 2, ZM - .010, x1 - x0, H, PI, col.wall, PL);
    wall((x0 + x1) / 2, Y + H / 2, ZM + .010, x1 - x0, H, 0, C('#cfc3ab'), PL);
    box((x0 + x1) / 2, Y + .062, ZM - .052, x1 - x0, .124, .06, col.skirt, { hard: true, gloss: .20 });
    box((x0 + x1) / 2, Y + .062, ZM + .052, x1 - x0, .124, .06, col.skirt, { hard: true, gloss: .20 });
  }
  wall(FDX, Y + (FDTOP + H) / 2, ZM - .010, FDW, H - FDTOP, PI, col.wall, PL);
  wall(FDX, Y + (FDTOP + H) / 2, ZM + .010, FDW, H - FDTOP, 0, C('#cfc3ab'), PL);
  box(FDX, Y + FDTOP + .035, ZM, FDW + .22, .07, .13, col.trim, { hard: true, gloss: .20 });
  stop(X0, FDX - FDW / 2, ZM - .09, ZM + .07);
  stop(FDX + FDW / 2, X1, ZM - .09, ZM + .07);
  box(FDX, FL + .016, ZM, FDW + .06, .032, .20, C('#9a948a'),
      { hard: true, gloss: .42, ...MAT.slab });

  // ==================================================================== 4. the partitions
  //
  // `clampMove` inflates every collider by the 0.30 m body radius, so a 1.10 m opening leaves
  // 0.50 m of genuinely clear run. Everything below was checked by flood-filling the deck.
  const barrier = (ax, at, s, e, t) => ax === 'x'
    ? stop(at - t / 2 - .012, at + t / 2 + .012, s, e)
    : stop(s, e, at - t / 2 - .012, at + t / 2 + .012);

  function part(ax, at, a0, a1, gaps, o = {}) {
    const c = o.c || col.wall, t = o.t === undefined ? T : o.t;
    const put = (m, L, y0, h) => {
      if (L < .004 || h < .004) return;
      ax === 'x' ? box(at, Y + y0 + h / 2, m, t, h, L, c, PL)
                 : box(m, Y + y0 + h / 2, at, L, h, t, c, PL);
    };
    const sk = (m, L) => {
      if (L < .004 || o.skirt === false) return;
      for (const s of [-1, 1]) ax === 'x'
        ? box(at + s * (t / 2 + .028), Y + .062, m, .056, .124, L, col.skirt, { hard: true, gloss: .20 })
        : box(m, Y + .062, at + s * (t / 2 + .028), L, .124, .056, col.skirt, { hard: true, gloss: .20 });
    };
    let cur = a0;
    for (const [s, e] of (gaps || []).slice().sort((p, q) => p[0] - q[0])) {
      if (s > cur + .002) { put((cur + s) / 2, s - cur, 0, H); barrier(ax, at, cur, s, t); sk((cur + s) / 2, s - cur); }
      put((s + e) / 2, e - s, DTOP, H - DTOP);
      cur = Math.max(cur, e);
    }
    if (a1 > cur + .002) { put((cur + a1) / 2, a1 - cur, 0, H); barrier(ax, at, cur, a1, t); sk((cur + a1) / 2, a1 - cur); }
  }

  // The lining round an opening: reveals and an architrave both sides, so a doorway is a made
  // thing and not a hole. `leaf` hangs a door in it, swung `sw` radians about the `hg` jamb and
  // `out` tells it which room to swing into — a leaf that opens into a 0.85 m hall is a leaf
  // standing in the only place anybody can walk.
  function doorway(ax, at, s, e, o = {}) {
    const t = o.t === undefined ? T : o.t, c = o.c || col.trim;
    const m = (s + e) / 2, W = e - s;
    const put = (mm, L, y, h, d, cc, oo) => ax === 'x'
      ? box(at, y, mm, d, h, L, cc, oo) : box(mm, y, at, L, h, d, cc, oo);
    for (const sg of [-1, 1])
      put(m + sg * (W / 2 - .012), .024, Y + DTOP / 2, DTOP, t - .004, col.wallC,
          { hard: true, gloss: .14 });
    put(m, W, Y + DTOP - .012, .024, t - .004, col.wallC, { hard: true, gloss: .14 });
    for (const f of [-1, 1]) {
      const d = t / 2 + .022;
      for (const sg of [-1, 1]) ax === 'x'
        ? box(at + f * d, Y + (DTOP + .05) / 2, m + sg * (W / 2 + .035), .045, DTOP + .05, .07, c,
              { hard: true, gloss: .22 })
        : box(m + sg * (W / 2 + .035), Y + (DTOP + .05) / 2, at + f * d, .07, DTOP + .05, .045, c,
              { hard: true, gloss: .22 });
      ax === 'x'
        ? box(at + f * d, Y + DTOP + .025, m, .045, .07, W + .14, c, { hard: true, gloss: .22 })
        : box(m, Y + DTOP + .025, at + f * d, W + .14, .07, .045, c, { hard: true, gloss: .22 });
    }
    if (!o.leaf) return;
    const hg = o.hg === undefined ? -1 : o.hg, sw = o.sw === undefined ? 1.4 : o.sw;
    const out = o.out === undefined ? 1 : o.out;
    const LW = Math.min(W - .06, .86), LH = DTOP - .03;
    const hx = m + hg * (W / 2 - .03);
    const along = -hg * (LW / 2) * Math.cos(sw), off = out * (LW / 2) * Math.sin(sw);
    const lx = ax === 'x' ? at + off : hx + along;
    const lz = ax === 'x' ? hx + along : at + off;
    const ry = ax === 'x' ? PI / 2 - hg * out * sw : hg * out * sw;
    const body = o.body || C('#ded7c7');
    box(lx, Y + LH / 2, lz, LW, LH, .042, body, { hard: true, ry, gloss: .26, tag: o.tag });
    for (const py of [LH * .70, LH * .28])
      box(lx, Y + py, lz, LW - .17, LH * .30, .052, C('#d0c8b5'),
          { hard: true, ry, gloss: .24, tag: o.tag });
    // The handle, near the swinging edge. `ry` turns the leaf's width axis to (cos ry, 0, -sin ry)
    // in world, and the edge that moves is `u` along that axis — the same sign the swing was
    // derived from, so the handle is never on the hinge side whichever way the door was hung.
    const k = (ax === 'x' ? hg : -hg) * (LW / 2 - .10);
    box(lx + k * Math.cos(ry), Y + 1.02, lz - k * Math.sin(ry), .07, .16, .07, C('#b7973f'),
        { hard: true, gloss: .55, ry, tag: o.tag });
  }

  // --- the walls, and the doorways in them
  part('x', 3.20, 1.60, 3.20, [[2.05, 3.20]]);                    // 玄关 | 走道
  part('x', -1.60, 1.60, 3.20, [[1.95, 3.05]]);                   // 走道 | 卫生间
  part('x', -4.00, 1.60, 3.20, []);                               // 卫生间 | 储藏
  part('x', -2.60, -1.40, 1.60, [[.20, 1.30]]);                   // 主卧 | 客厅
  part('x', -2.60, -3.40, -1.40, [[-3.00, -1.90]]);               // 空房 | 客厅
  part('x', -2.60, ZF, -3.40, []);                                // 空房 | 阳台
  part('x', 2.60, -1.20, 1.60, [[.10, 1.45]]);                    // 客厅 | 餐厅 — a wide arch
  part('x', 2.60, -3.40, -1.20, []);                              // 客厅 | 厨房
  part('x', 2.60, ZF, -3.40, []);                                 // 阳台 | 厨房
  part('z', 1.60, -1.60, 3.20, [[.20, 1.80]]);                    // 走道 | 客厅
  part('z', 1.60, -4.00, -1.60, []);                              // 卫生间 | 主卧 + 客厅
  part('z', 1.60, X0, -4.00, [[-5.45, -4.35]]);                   // 储藏 | 主卧
  part('z', 1.60, 3.20, X1, [[3.30, 4.60]]);                      // 玄关 | 餐厅
  part('z', -1.40, X0, -2.60, []);                                // 主卧 | 空房
  part('z', -1.20, 2.60, X1, [[3.50, 4.60]]);                     // 餐厅 | 厨房
  part('z', -3.40, -2.60, 2.60, [[-1.30, 1.30]]);                 // 客厅 | 阳台

  doorway('x', -1.60, 1.95, 3.05, { leaf: true, hg: -1, sw: 1.15, out: -1, tag: '门' });
  doorway('x', -2.60, .20, 1.30, { leaf: true, hg: 1, sw: 1.45, out: -1, tag: '门' });
  doorway('x', -2.60, -3.00, -1.90, { leaf: true, hg: -1, sw: 1.52, out: -1, tag: '门' });
  doorway('x', 2.60, .10, 1.45);
  doorway('z', 1.60, .20, 1.80);
  doorway('z', 1.60, 3.30, 4.60);
  doorway('z', 1.60, -5.45, -4.35, { leaf: true, hg: 1, sw: 1.25, out: 1, tag: '门' });
  doorway('z', -1.20, 3.50, 4.60, { leaf: true, hg: -1, sw: 1.20, out: -1, tag: '门' });

  // --- the sliding door onto the 阳台. Two glazed leaves parked either side of the opening, in
  // an aluminium track — the one door in the flat that is properly finished, because it came with
  // the building.
  //
  // The leaf is a FRAME — two stiles, two rails, glass between them — and not a panel with a
  // sheet of glass laid over it. The first version was a solid 0.68 x 1.94 box of aluminium with
  // the glazing drawn on top of it: the box is opaque and it is behind the glass, so what the
  // render showed was two blank white slabs where the doors should be, and no balcony through
  // them. Alpha over an opaque body is not glazing.
  (function slider() {
    const zw = -3.40, LWd = .68, LHt = 1.94, MY = Y + 1.02;
    box(0, Y + DTOP - .04, zw, 2.72, .07, .12, col.alu, { hard: true, gloss: .40, ...MAT.metal });
    box(0, FL + .012, zw, 2.72, .024, .12, col.alu, { hard: true, gloss: .40, ...MAT.metal });
    for (const s of [-1, 1]) {
      const lx = s * .98, lz = zw + s * .028;
      for (const t of [-1, 1])
        box(lx + t * (LWd / 2 - .024), MY, lz, .048, LHt, .042, col.alu,
            { hard: true, gloss: .38, ...MAT.metal, tag: '门' });
      for (const t of [-1, 1])
        box(lx, MY + t * (LHt / 2 - .024), lz, LWd, .048, .042, col.alu,
            { hard: true, gloss: .38, ...MAT.metal, tag: '门' });
      box(lx, MY, lz, LWd - .10, LHt - .10, .010, col.glass,
          { hard: true, mode: 18, alpha: .16, gloss: .82, tag: '门' });
      box(lx - s * .28, MY, lz + .036, .040, .32, .026, col.steelD,
          { hard: true, gloss: .55, tag: '门' });
    }
  })();

  // ==================================================================== 5. the shafts
  //
  // This was the upper-floor stand-in while js/world.js stopped its landing build at deck 2. The
  // shared shell now owns both shafts on every deck, so the stand-in remains only as a fallback for
  // older toolkit implementations and never occupies the same planes as the live landing.
  const LBZ = LB.z0 - .012, LFZ = LF.z0 - .012;
  if (!A.shellLanding) {
    const CARX = (LF.x0 + LF.x1) / 2;
    const DW = (A.CAR && A.CAR.door) || .80, DH = (A.CAR && A.CAR.doorH) || 2.10, hw = DW / 2;

    wall((LB.x0 + LB.x1) / 2, Y + H / 2, LBZ, LB.x1 - LB.x0, H, PI, col.wall, PL);
    for (const [fx, fyaw] of [[LB.x0 + .006, -PI / 2], [LB.x1 - .006, PI / 2]])
      wall(fx, Y + H / 2, (LBZ + LB.z1) / 2, LB.z1 - LBZ, H, fyaw, C('#c4bdac'), PL);
    box((LB.x0 + LB.x1) / 2, Y + .062, LBZ - .042, LB.x1 - LB.x0, .124, .06, col.skirt,
        { hard: true, gloss: .20 });
    box((LB.x0 + LB.x1) / 2, Y + 1.05, LBZ - .022, 1.02, 2.06, .028, C('#c8c1b0'),
        { hard: true, gloss: .14 });
    stop(LB.x0 - .10, LB.x1 + .10, LB.z0 - .05, LB.z1 + .05);

    for (const [x0, x1] of [[LF.x0, CARX - hw], [CARX + hw, LF.x1]])
      wall((x0 + x1) / 2, Y + H / 2, LFZ, x1 - x0, H, PI, col.wall, PL);
    wall(CARX, Y + (DH + H) / 2, LFZ, DW, H - DH, PI, col.wall, PL);
    for (const [fx, fyaw] of [[LF.x0 + .006, -PI / 2], [LF.x1 - .006, PI / 2]])
      wall(fx, Y + H / 2, (LFZ + LF.z1) / 2, LF.z1 - LFZ, H, fyaw, C('#b8ae9c'), PL);
    wall(CARX, Y + H / 2, LF.z1 - .012, LF.x1 - LF.x0, H, PI, C('#6f6a62'), PL);
    for (const s of [-1, 1]) {
      box(CARX + s * (hw + .07), Y + DH / 2 + .05, LFZ - .020, .14, DH + .10, .05, C('#7e868c'),
          { hard: true, gloss: .60, tag: '电梯', ...MAT.metal });
      box(CARX + s * (LF.x1 - LF.x0 + DW) / 4, Y + .062, LFZ - .042,
          (LF.x1 - LF.x0 - DW) / 2, .124, .06, col.skirt, { hard: true, gloss: .20 });
    }
    box(CARX, Y + DH + .075, LFZ - .020, DW + .42, .14, .05, C('#7e868c'),
        { hard: true, gloss: .60, tag: '电梯', ...MAT.metal });
    box(CARX, Y + DH + .34, LFZ - .022, .52, .30, .06, C('#3d4348'), { hard: true, gloss: .34, tag: '电梯' });
    G(CARX, Y + DH + .34, LFZ - .058, PI, '九',
      { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16, tag: '电梯' });
    stop(LF.x0 - .10, CARX - hw, LF.z0 - .05, LF.z1 + .05);
    stop(CARX + hw, LF.x1 + .10, LF.z0 - .05, LF.z1 + .05);

    const PBX = 3.72, PBZ = LF.z0 - .04;
    box(PBX, Y + 1.12, PBZ, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34, tag: '电梯' });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(PBX, Y + 1.12 + dy, PBZ - .022, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
      G(PBX, Y + 1.12 + dy, PBZ - .038, PI, ch, { size: .038, color: C('#4a3316'), gloss: .12, tag: '电梯' });
    }
    TH('电梯', PBX, Y + 1.52, PBZ - .10, '按电梯，下楼去。', 'Press for the lift, and go down.',
       '电 electricity + 梯 ladder. 上楼 is up, 下楼 is down.', PBX, LF.z0 - 1.10, 1.9);
  }

  // Keep this floor's specific notice, but paste it onto the shell-owned shut leaves when the
  // generalized landing exists. The paper is in front of either implementation and never needs a
  // second wall, surround, indicator, call panel or collider behind it.
  const LBX = (LB.x0 + LB.x1) / 2;
  box(LBX, Y + 1.64, LBZ - .040, .44, .30, .018, col.paper,
      { hard: true, gloss: .05, ry: .02 });
  G(LBX, Y + 1.72, LBZ - .052, PI, '此梯停用', { size: .052, gap: .010, color: col.redD });
  G(LBX, Y + 1.62, LBZ - .052, PI, '请乘另一部', { size: .042, gap: .008 });
  G(LBX, Y + 1.53, LBZ - .052, PI, '物业管理处', { size: .034, gap: .007, color: col.grey });

  // ==================================================================== 6. the landing
  //
  // The walkway in front of the shafts is z 3.27 .. 4.85 — 1.58 m, or 0.98 m after the body — and
  // the full three metres at either end of the building.
  const ZS = ZM, LZ = 4.30;

  const PIPE = ZS + .22;
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, PIPE, .036, 3.0, col.redD, { rz: PI / 2, gloss: .34, ...MAT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, PIPE, .016, .07, col.goldD, { gloss: .5 });
    ball(px, CY - .262, PIPE, .026, .020, .026, col.gold, { gloss: .55 });
  }
  box(0, CY - .045, ZS + .34, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });

  for (const [px, pz, alive] of [[-4.40, LZ, true], [-1.20, LZ, false], [1.50, ZS + .45, true],
                                 [4.70, LZ, true]]) {
    box(px, CY - .045, pz, .46, .07, .16, col.steelD, { hard: true, gloss: .30 });
    box(px, CY - .095, pz, .40, .05, .12, alive ? col.warm : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) {
      light(px, CY - .20, pz, C('#dfe9ef'), .46, 3.20);
      glow(M.trs(px, Y + .020, pz, 0, 2.6, 1, 2.3), C('#dfe6ea'), .18);
    }
  }

  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, C('#1e7a45'), { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, C('#4ec489'),
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    // '→' reads left-to-right in the reader's frame, and on a wall facing -z the reader's right
    // hand points at world -x. The stair is east, so the arrow flips with the wall.
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  exitSign(-2.60, Y + 2.28, ZS, 1, true);
  exitSign(-5.10, Y + 2.28, ZN, -1, true);
  exitSign(5.00, Y + 2.28, ZS, 1, true);

  // ==================================================================== 7. the six doors
  //
  // 901 to 906. Five are neighbours' and stay shut; 906 is the one that opens, and it is the only
  // door on the floor with 囍 on it. A neighbour's leaf is tagged 邻居 rather than 门 — `pick`
  // resolves a ray to a tag and then to the nearest thing wearing it, so with all six tagged 门
  // there would be nothing left to say about your own.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = z => zw + sgn * z;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: .24, tag: o.tag });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.doorD,
            { hard: true, gloss: .3, tag: o.tag });
    }
    const hx = cx - hinge * (LW / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, col.steelD, { hard: true, gloss: .46, tag: o.tag });
    cyl(hx, Y + 1.03, F(.115), .016, .07, col.steel, { rx: PI / 2, gloss: .5, tag: o.tag });
    box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, col.steel,
        { hard: true, gloss: .5, tag: o.tag });
    cyl(cx, Y + 1.56, F(.078), .012, .030, col.gold, { rx: PI / 2, gloss: .6, tag: o.tag });
    for (const hy of [.36, 1.06, 1.76])
      cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, col.steelD,
          { gloss: .45, tag: o.tag });
    box(cx, Y + 1.84, F(.072), .30, .13, .024, col.steel, { hard: true, gloss: .40, tag: o.tag });
    G(cx, Y + 1.84, F(.086), yaw, num, { size: .073, gap: .012, color: col.ink, gloss: .2 });
    flat(cx, FL + .006, F(.32), .64, .40, o.mat || col.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .72, .48, .26, FL + .010);
    return leaf;
  }

  function couplets(cx, zw, sgn, lines, top, o = {}) {
    const yaw = sgn > 0 ? 0 : PI, F = z => zw + sgn * z;
    const c = o.paper || col.red, ink = o.ink || col.gold;
    for (const [s, text] of [[-1, lines[0]], [1, lines[1]]]) {
      box(cx + s * (o.out || .58), Y + 1.48, F(.020), .12, 1.02, .04, c,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * (o.out || .58), Y + 1.48, F(.042), yaw, text,
        { size: .105, gap: .018, color: ink, vertical: true, gloss: .12 });
    }
    box(cx, Y + 2.26, F(.020), .64, .15, .04, c, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.26, F(.042), yaw, top, { size: .098, gap: .020, color: ink });
  }

  // 囍 — the double-happiness paper cut, pasted as a diamond. `yaw` is the way the reader looks
  // at it; the paper stands 10 mm off whatever it is stuck to and the ink 22 mm, so it never
  // fights the surface behind it. A box thin in z becomes a diamond by turning about z, and one
  // thin in x by turning about x — turning either about y only makes a thin diagonal slab.
  function xi(x, y, z, yaw, s = .26, o = {}) {
    const onZ = Math.abs(Math.sin(yaw)) < .5;                  // faces ±z rather than ±x
    const f = onZ ? (Math.cos(yaw) > 0 ? 1 : -1) : (Math.sin(yaw) > 0 ? 1 : -1);
    const px = onZ ? x : x + f * .010, pz = onZ ? z + f * .010 : z;
    box(px, y, pz, onZ ? s : .014, s, onZ ? .014 : s, o.paper || col.red,
        { hard: true, gloss: .08, rz: onZ ? PI / 4 : 0, rx: onZ ? 0 : PI / 4, tag: '囍' });
    G(onZ ? x : x + f * .022, y, onZ ? z + f * .022 : z, yaw, '囍',
      { size: s * .56, color: o.ink || col.gold, gloss: .14, tag: '囍' });
  }

  const N1 = -5.20, N2 = -3.40, N3 = -1.60, N4 = 4.30, N5 = 5.55;
  frontDoor(N1, ZN, -1, '901', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, ['天增岁月人增寿', '春满乾坤福满门'], '万象更新');
  frontDoor(N2, ZN, -1, '902', { tag: '邻居', body: col.doorB, panel: col.doorA, mat: C('#7d3f37') });
  frontDoor(N3, ZN, -1, '903', { tag: '邻居', mat: col.rubber });
  frontDoor(N4, ZN, -1, '904', { tag: '邻居', hinge: 1, body: col.doorD, panel: col.doorA,
                                 mat: C('#3f4a3f') });
  frontDoor(N5, ZN, -1, '905', { tag: '邻居', mat: col.rubber });

  // --- 906, yours. Eight weeks old, and everything on it is still the wedding's.
  frontDoor(FDX, ZS, 1, '906', { tag: '门', body: C('#7a4230'), panel: C('#8d5039'),
                                 mat: C('#8d2a20'), w: FDW, top: FDTOP,
                                 headTo: Y + FDTOP - .015 });
  box(FDX, Y + FDTOP - .020, ZS + .030, FDW, .040, .06, col.doorD, { hard: true, gloss: .24 });
  couplets(FDX, ZS, 1, ['百年好合永结同心', '花好月圆佳偶天成'], '喜结良缘',
           { out: .60, paper: col.redL });
  xi(FDX, Y + 1.34, ZS + .092, 0, .30);
  // the 拉花 streamer still taped over the frame, and a ribbon rosette at each end of it
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    box(FDX - .70 + t * 1.40, Y + FDTOP + .17 - Math.sin(t * PI) * .10, ZS + .026, .17, .055, .012,
        i % 2 ? col.redL : col.gold, { hard: true, gloss: .16, rz: (t - .5) * .55 });
  }
  for (const s of [-1, 1]) {
    ball(FDX + s * .74, Y + FDTOP + .12, ZS + .050, .075, .075, .035, col.redL, { gloss: .18 });
    ball(FDX + s * .74, Y + FDTOP + .12, ZS + .066, .034, .034, .026, col.gold, { gloss: .30 });
  }

  // ==================================================================== 8. what the landing holds
  const HX = -4.30, HZ = ZS + .13;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .114, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .114, 0, '火警119', { size: .058, gap: .012, color: col.gold });
  cyl(HX + .52, FL + .27, ZS + .19, .075, .48, col.red, { gloss: .34 });
  taper(HX + .52, FL + .55, ZS + .19, .15, .10, .15, col.red, { gloss: .34 });
  cyl(HX + .52, FL + .63, ZS + .19, .020, .09, col.steelD, { gloss: .5 });
  shade(HX + .52, ZS + .19, .22, .22, .30, FL + .008);

  const MX = 5.30, MZ = ZS + .07;
  box(MX, Y + 1.44, MZ, .46, .92, .12, col.steelD, { hard: true, gloss: .34, tag: '电表', ...MAT.metal });
  box(MX, Y + 1.44, MZ + .065, .40, .84, .012, col.steelX, { hard: true, gloss: .30 });
  ['0031', '0028', '0902'].forEach((r, i) => {
    const my = 1.72 - i * .28;
    box(MX - .06, Y + my, MZ + .073, .20, .13, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(MX - .06, Y + my, MZ + .083, 0, r,
      { size: .048, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
    cyl(MX + .13, Y + my, MZ + .073, .010, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
  });
  G(MX, Y + 1.96, MZ + .068, 0, '电表箱', { size: .062, gap: .012, color: col.white });
  box(MX, Y + 2.30, MZ + .010, .09, .60, .05, col.white, { hard: true, gloss: .12 });

  // --- 通知. On a floor with a new flat on it there is only ever one notice, and it is about
  // when you are allowed to drill.
  const PX = -1.05, PZ = ZS + .014;
  box(PX, Y + 1.54, PZ, .34, .48, .022, col.paper, { hard: true, gloss: .05, ry: .02, tag: '通知' });
  G(PX, Y + 1.71, PZ + .014, 0, '通知', { size: .078, gap: .020 });
  box(PX, Y + 1.645, PZ + .016, .26, .006, .006, col.ink, { hard: true });
  G(PX, Y + 1.575, PZ + .014, 0, '装修施工时间', { size: .040, gap: .007 });
  G(PX, Y + 1.510, PZ + .014, 0, '八点至十二点', { size: .040, gap: .007 });
  G(PX, Y + 1.445, PZ + .014, 0, '十四点至十八点', { size: .037, gap: .006 });
  G(PX, Y + 1.368, PZ + .014, 0, '周末请勿电钻', { size: .038, gap: .006, color: col.redD });
  G(PX, Y + 1.290, PZ + .014, 0, '物业管理处', { size: .034, gap: .007, color: col.grey });
  for (const [sx, sy] of [[-.14, .21], [.14, .21], [-.14, -.21], [.14, -.21]])
    box(PX + sx, Y + 1.54 + sy, PZ + .017, .05, .022, .004, C('#d9d2bd'), { hard: true });
  box(PX - .43, Y + 1.48, PZ, .28, .21, .018, C('#f0d8c8'), { hard: true, gloss: .05, ry: -.05 });
  G(PX - .43, Y + 1.525, PZ + .012, 0, '恭喜906', { size: .044, gap: .008, color: col.redD });
  G(PX - .43, Y + 1.445, PZ + .012, 0, '新婚之喜', { size: .040, gap: .008, color: col.redD });

  // --- the flattened cartons, stacked on the north wall where they do not block the walkway
  (function cartons() {
    const cx = -.95, cz = ZN - .22;
    for (let i = 0; i < 6; i++)
      box(cx + (i % 2 - .5) * .03, FL + .04 + i * .055, cz, 1.02, .05, .40,
          i % 2 ? col.card : col.cardD, { hard: true, gloss: .06, ry: .015 * (i - 2.5) });
    G(cx - .12, FL + .34, cz - .208, PI, '易碎', { size: .058, gap: .012, color: col.cardD });
    shade(cx, cz, 1.20, .52, .30, FL + .008);
    ball(cx + .38, FL + .40, cz + .04, .07, .055, .07, C('#d8c9a3'), { gloss: .30 });
    box(cx - .30, FL + .375, cz + .06, .15, .020, .035, C('#c8a02c'), { hard: true, gloss: .40, ry: .5 });
  })();
  stop(-1.52, -.38, ZN - .46, ZN);

  // --- 拖鞋 outside 906. Nobody's shoes come in.
  for (const s of [-1, 1])
    cap(FDX - .74 + s * .065, FL + .038, ZS + .26, .078, .058, .20, C('#c8515a'),
        { ry: s * .07, gloss: .14, tag: '鞋' });
  for (const s of [-1, 1])
    cap(FDX - .98 + s * .07, FL + .042, ZS + .24, .086, .066, .225, C('#3d4a5c'),
        { ry: s * .05, gloss: .14, tag: '鞋' });
  shade(FDX - .86, ZS + .25, .64, .34, .24, FL + .008);

  // --- red paper trodden into the landing from the wedding day
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399, r = .5 + (i % 7) * .42;
    flat(FDX - 1.1 + Math.cos(a) * r * 1.5, FL + .002, 3.95 + Math.sin(a) * r * .4,
         .045 + (i % 3) * .012, .035 + (i % 4) * .010,
         i % 3 ? C('#b9382c') : C('#d8b44e'), { mode: 7, gloss: .06, ry: a });
  }

  G(-3.10, Y + 1.32, ZS + .024, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-3.10, Y + 1.24, ZS + .024, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-2.00, Y + 1.28, ZS + .024, 0, '搬家拉货', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(.90, Y + 1.30, ZS + .024, 0, '装修队', { size: .052, gap: .008, color: C('#a8352a'), gloss: .05 });

  // --- the fire stair, surface-mounted: this door never opens, so it wants no hole behind it.
  (function stair() {
    const SZ = 4.60, SW = .95, STOP = 2.06, sf = d => X1 - d;
    for (const s of [-1, 1])
      box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07, col.steelD,
          { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, col.steelD,
        { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
        { hard: true, gloss: .26, tag: '楼梯', ...MAT.metal });
    box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
    box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
    cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
    G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: C('#1e7a45') });
    G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
    box(X1 - .035, Y + STOP + .19, SZ, .06, .155, .40, C('#1e7a45'),
        { hard: true, gloss: .26, tag: '安全出口' });
    box(X1 - .068, Y + STOP + .19, SZ, .006, .125, .365, C('#4ec489'),
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(X1 - .068, Y + STOP + .19, SZ, -PI / 2, '安全出口',
      { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });
  })();

  TH('邻居', N4, Y + 1.30, ZN - .10, '邻居家在904，还没见过。',
     'The neighbours are in 904; we have not met them yet.',
     '邻 neighbouring + 居 to dwell.', N4, 5.10, 1.9);
  TH('春联', FDX - .60, Y + 1.48, ZS + .06, '门口贴的是婚联，不是春联。',
     'The couplets at the door are wedding ones, not New Year ones.',
     '春联 the red New Year couplets; a wedding gets its own pair, 婚联.', FDX - .60, 3.90, 2.0);
  TH('囍', FDX, Y + 1.34, ZS + .11, '门上贴着一个大红囍字。',
     'A big red 囍 is pasted on the door.',
     '囍 is 喜 written twice — double happiness. Only ever used for a wedding.',
     FDX, 3.92, 1.9);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, 3.95, 2.0);
  TH('电表', MX, Y + 1.50, MZ + .08, '电表箱在我家门旁边。', 'The meter box is beside my door.',
     '电 electricity + 表 gauge.', MX, 3.90, 1.9);
  TH('通知', PX, Y + 1.55, PZ + .02, '通知上写着几点能装修。',
     'The notice says what hours you may drill.',
     '通 to pass through + 知 to know: to inform.', PX, 3.90, 1.8);
  TH('纸箱', -.95, Y + .40, ZN - .30, '走廊里堆着拆下来的纸箱。',
     'Flattened boxes are stacked in the corridor.',
     '纸 paper + 箱 case. 拆 chāi is to break down or unpack.', -.95, 5.20, 1.9);
  TH('安全出口', X1 - .10, Y + 2.25, 4.60, '安全出口在东头。', 'The emergency exit is at the east end.',
     '安全 safe + 出口 exit. The green sign is the same in every building.', 5.30, 4.30, 2.3);
  TH('楼梯', X1 - .10, Y + 1.10, 4.60, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.', '楼 storey + 梯 ladder.', 5.30, 4.30, 2.1);
  TH('走廊', -2.30, Y + 1.60, 4.10, '九楼走廊，六户人家。',
     'The ninth-floor landing: six front doors.',
     '走 walk + 廊 covered passage. A corridor here is also storage.', -2.30, 4.10, 3.2);

  // ==================================================================== 9. 玄关 the entry
  (function entry() {
    // shoe cabinet, turned against the east wall so it does not stand in the only walkable strip
    const cx = 5.62, cz = 2.40;
    box(cx, FL + .46, cz, .38, .90, 1.24, C('#d8cdb8'), { hard: true, gloss: .22, tag: '鞋柜' });
    box(cx, FL + .925, cz, .42, .04, 1.30, C('#c9bda3'), { hard: true, gloss: .30, tag: '鞋柜' });
    for (const s of [-1, 1]) {
      box(cx - .195, FL + .46, cz + s * .30, .012, .84, .56, C('#e3dac6'),
          { hard: true, gloss: .26, tag: '鞋柜' });
      box(cx - .204, FL + (s < 0 ? .52 : .46), cz + s * .30, .004, s < 0 ? .68 : .80, .52, col.film,
          { hard: true, mode: 18, alpha: .55, gloss: .70 });
      cyl(cx - .215, FL + .50, cz + s * .10, .010, .13, col.steel, { gloss: .5 });
    }
    stop(cx - .26, cx + .26, cz - .70, cz + .70);
    shade(cx, cz, .52, 1.40, .34, FL + .008);
    // the dish of 红包 on top
    cyl(cx, FL + .955, cz - .42, .105, .045, col.porc, { gloss: .55, tag: '红包' });
    for (let i = 0; i < 5; i++)
      box(cx + (i % 3 - 1) * .03, FL + .972 + i * .011, cz - .42 + (i % 2 - .5) * .03,
          .095, .006, .062, i === 2 ? col.redL : col.red,
          { hard: true, gloss: .12, ry: i * .30, tag: '红包' });
    G(cx, FL + .995, cz - .42, 0, '囍', { size: .030, color: col.gold, tag: '红包' });
    for (let i = 0; i < 3; i++)
      box(cx - .02, FL + .955, cz + .02 + i * .022, .012, .004, .055, col.goldD,
          { hard: true, gloss: .5, ry: .4 + i * .2 });
    box(cx + .04, FL + .952, cz + .34, .075, .010, .150, C('#20242a'), { hard: true, gloss: .5, ry: -.2 });
    // slippers, two pairs
    const pair = (px, pz, c, sc) => {
      for (const s of [-1, 1])
        cap(px + s * .065 * sc, FL + .036 * sc, pz, .075 * sc, .052 * sc, .195 * sc, c,
            { ry: s * .06, gloss: .14, tag: '拖鞋' });
      shade(px, pz, .34 * sc, .30 * sc, .22, FL + .008);
    };
    pair(4.38, 2.88, C('#b8404a'), 1.0);
    pair(4.40, 2.44, C('#3f5a7a'), 1.12);
    flat(FDX, FL + .004, 2.70, .76, .46, C('#8f2f28'), { mode: 7, gloss: .05 });
    // coat hooks on the flat's side of the front-door wall
    box(4.86, Y + 1.62, ZM - .085, .58, .09, .05, col.trim, { hard: true, gloss: .20 });
    for (const hx2 of [-.20, 0, .20]) {
      cyl(4.86 + hx2, Y + 1.585, ZM - .115, .011, .07, col.steelD, { rx: PI / 2, gloss: .5 });
      ball(4.86 + hx2, Y + 1.585, ZM - .150, .019, .019, .019, col.steel, { gloss: .55 });
    }
    box(4.86, Y + 1.24, ZM - .165, .30, .62, .10, C('#3a4756'), { gloss: .10, mode: 7 });
    box(5.06, Y + 1.40, ZM - .160, .19, .24, .09, col.redL, { hard: true, gloss: .14 });
    G(5.06, Y + 1.40, ZM - .210, PI, '囍', { size: .085, color: col.gold });
    xi(3.05, Y + 1.42, ZM - .022, PI, .26);
    light(4.60, CY - .36, 2.40, C('#ffeec8'), .40, 3.0);
    glow(M.trs(4.60, Y + .020, 2.40, 0, 2.4, 1, 1.8), C('#e8dcb8'), .16);

    TH('鞋柜', cx - .22, Y + .80, cz, '鞋柜上的保护膜还没撕。',
       'The film is still on the shoe cabinet.',
       '鞋 shoe + 柜 cabinet. Shoes come off here, not inside.', 4.70, cz, 1.9);
    TH('红包', cx, Y + 1.00, cz - .42, '碟子里还剩几个红包。',
       'A few red envelopes left in the dish.',
       '红 red + 包 wrapper. Money is given in one, at a wedding and at 春节.', 4.80, 2.20, 1.8);
    TH('拖鞋', 4.39, Y + .22, 2.66, '两双拖鞋，一大一小。', 'Two pairs of slippers, one big, one small.',
       '拖 to drag + 鞋 shoe: the slip-on kind worn indoors.', 4.10, 2.60, 1.6);
  })();

  // ==================================================================== 10. 走道 the hall
  (function hall() {
    // the switch bank, on the landing wall inside the flat
    box(3.00, Y + 1.30, ZM - .022, .16, .11, .022, col.white, { hard: true, gloss: .28 });
    for (const s of [-1, 1])
      box(3.00, Y + 1.30 + s * .026, ZM - .036, .052, .038, .008, C('#eae6dc'), { hard: true, gloss: .34 });
    // a mirror, and the calendar still open on the month they married
    box(-.90, Y + 1.46, 1.666, .58, .88, .014, C('#b9b0a0'), { hard: true, gloss: .22 });
    box(-.90, Y + 1.46, 1.682, .52, .82, .016, col.steel,
        { hard: true, gloss: .82, mode: 18, alpha: .30 });
    box(2.40, Y + 1.62, 1.672, .34, .46, .016, col.paper, { hard: true, gloss: .06, tag: '日历' });
    box(2.40, Y + 1.78, 1.686, .34, .14, .008, col.red, { hard: true, gloss: .10, tag: '日历' });
    G(2.40, Y + 1.78, 1.692, 0, '十月', { size: .072, gap: .014, color: col.gold });
    for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 7; c2++)
      box(2.29 + c2 * .037, Y + 1.68 - r * .052, 1.684, .022, .022, .004,
          (r === 1 && c2 === 5) ? col.redL : C('#ded7c6'), { hard: true, gloss: .06 });
    light(.60, CY - .34, 2.40, C('#ffe7bd'), .36, 3.2);
  })();

  // ==================================================================== 11. 客厅 the living room
  //
  // A sofa still in the plastic it was delivered in, a television that has not come out of its
  // box, and the folder of wedding photographs leaning where they will one day be hung.
  //
  // The plan of this room is set by two doorways it must not block: the 空房's, at x -2.60 and
  // z -3.00..-1.90, and the 主卧's at z .20..1.30. The sofa stood in the middle of the floor to
  // begin with, and the flood fill came back with 748 standable cells in the empty room and none
  // of them reachable — a 2.20 m sofa inflated by the body radius seals a 1.10 m door from three
  // metres away. It now stands along the east wall, and the whole west strip is clear.
  (function living() {
    // --- 沙发, along the east wall and facing across the room. Long axis in z.
    const sx = 2.06, sz = -1.90;
    box(sx, FL + .21, sz, .84, .38, 2.05, C('#8e8578'), { gloss: .12, mode: 7, tag: '沙发' });
    box(sx + .30, FL + .52, sz, .26, .64, 2.05, C('#8e8578'), { gloss: .12, mode: 7, tag: '沙发' });
    for (const s of [-1, 1])
      box(sx - .02, FL + .44, sz + s * .95, .84, .48, .16, C('#7f7669'),
          { gloss: .12, mode: 7, tag: '沙发' });
    for (const s of [-1, 1])
      cyl(sx - .32, FL + .05, sz + s * .82, .028, .10, col.steelD, { gloss: .4 });
    // the plastic over it — one skin a little bigger than the sofa, taped at the arms
    box(sx + .01, FL + .40, sz, .96, .82, 2.20, col.wrap,
        { mode: 18, alpha: .34, gloss: .72, tag: '沙发' });
    box(sx + .30, FL + .84, sz, .30, .10, 2.16, col.wrap, { mode: 18, alpha: .40, gloss: .70 });
    for (const s of [-1, 1]) {
      box(sx - .02, FL + .44, sz + s * 1.03, .90, .60, .05, C('#cfd6d2'),
          { mode: 18, alpha: .38, gloss: .70 });
      box(sx + .40, FL + .78, sz + s * .96, .06, .035, .30, C('#c8b06a'),
          { hard: true, gloss: .35, rx: s * .12 });
    }
    stop(sx - .50, sx + .50, sz - 1.06, sz + 1.06);
    shade(sx, sz, 1.05, 2.35, .40, FL + .008);

    // --- 电视, still in its carton, leaning on the wall it will hang on — the stretch of the
    // west wall between the two bedroom doors, which is the only unbroken wall in the room.
    const tx = -2.48, tz = -.85;
    box(tx, FL + .58, tz, .17, 1.10, 1.24, col.card, { hard: true, gloss: .07, rz: .10, tag: '电视' });
    box(tx + .095, FL + .58, tz, .010, .96, 1.10, col.cardD, { hard: true, gloss: .06, rz: .10 });
    G(tx + .112, FL + .84, tz, PI / 2, '液晶电视', { size: .070, gap: .014, color: C('#5d4a30') });
    G(tx + .112, FL + .70, tz, PI / 2, '55英寸', { size: .052, gap: .010, color: C('#5d4a30') });
    G(tx + .112, FL + .48, tz, PI / 2, '向上', { size: .044, gap: .010, color: C('#7c6440') });
    box(tx - .02, FL + 1.13, tz, .19, .06, 1.24, col.cardD, { hard: true, gloss: .06, rz: .10 });
    stop(tx - .14, tx + .18, tz - .66, tz + .66);
    shade(tx + .06, tz, .46, 1.36, .34, FL + .008);
    box(-2.538 - .010, Y + 1.66, tz, .022, .28, .46, col.steelX, { hard: true, gloss: .45 });
    for (const s of [-1, 1])
      cyl(-2.560, Y + 1.66, tz + s * .17, .012, .014, col.steel, { rx: PI / 2, gloss: .6 });
    flat(tx + .08, FL + .003, tz, .18, .50, C('#cfc7b4'), { mode: 7, gloss: .04 });

    // --- the wedding photographs, in their folder, leaning where they will be hung
    const fx = -1.70, fz = 1.50;
    box(fx, FL + .46, fz, .66, .90, .09, C('#7c2f2a'), { hard: true, gloss: .18, rx: .12, tag: '婚纱照' });
    box(fx, FL + .46, fz - .058, .60, .84, .012, C('#a8433a'), { hard: true, gloss: .22, rx: .12, tag: '婚纱照' });
    G(fx, FL + .70, fz - .078, PI, '婚纱照', { size: .058, gap: .012, color: col.gold });
    for (let i = 0; i < 3; i++)
      box(fx + .05 - i * .04, FL + .42 - i * .012, fz - .10 - i * .026, .54 - i * .03,
          .74 - i * .04, .010, i === 1 ? C('#e6e2d8') : C('#dad6cc'),
          { hard: true, gloss: .30, rx: .14 });
    shade(fx, fz - .12, .82, .34, .34, FL + .008);

    // --- a folding table doing duty as everything, with the tea things on it
    const gx = 1.00, gz = -1.90;
    box(gx, FL + .445, gz, .60, .04, 1.00, C('#c8b48c'), { hard: true, gloss: .22, tag: '桌子' });
    for (const [ox, oz] of [[-.22, -.42], [-.22, .42], [.22, -.42], [.22, .42]])
      box(gx + ox, FL + .22, gz + oz, .035, .44, .035, col.steelD, { hard: true, gloss: .40 });
    stop(gx - .34, gx + .34, gz - .54, gz + .54);
    shade(gx, gz, .70, 1.10, .34, FL + .010);
    cyl(gx - .04, FL + .52, gz + .22, .085, .11, col.porc, { gloss: .55, tag: '热水壶' });
    cyl(gx - .04, FL + .585, gz + .22, .050, .03, C('#c8322a'), { gloss: .40, tag: '热水壶' });
    for (const s of [-1, 1])
      cyl(gx + .10, FL + .495, gz - .12 + s * .13, .036, .06, col.porc, { gloss: .50, tag: '杯子' });
    cyl(gx - .14, FL + .505, gz - .32, .095, .08, col.redL, { gloss: .38, tag: '喜糖' });
    cyl(gx - .14, FL + .548, gz - .32, .092, .008, C('#e8d7a8'), { gloss: .30, tag: '喜糖' });
    G(gx - .14, FL + .555, gz - .32, 0, '囍', { size: .055, color: col.gold, tag: '喜糖' });
    for (let i = 0; i < 6; i++)
      cap(gx - .14 + Math.cos(i * 1.1) * .13, FL + .462, gz - .32 + Math.sin(i * 1.1) * .17,
          .014, .045, .014, i % 2 ? col.gold : col.redL, { rz: PI / 2, ry: i * .7, gloss: .34 });

    // the fitting is still in a box, so this room has a bare bulb like the rest of them
    cyl(0, CY - .01, -.70, .028, .04, col.white, { gloss: .2 });
    cyl(0, CY - .21, -.70, .0035, .40, C('#3a3a38'), { gloss: .3 });
    ball(0, CY - .45, -.70, .046, .062, .046, col.bulbW, { mode: 1, glow: .10 });
    light(0, CY - .50, -.70, C('#ffe3ae'), .58, 4.4);
    glow(M.trs(0, Y + .020, -.70, 0, 3.6, 1, 3.2), C('#e6d9b6'), .22);

    TH('沙发', sx - .44, Y + .70, sz, '沙发上的塑料还没拆。', 'The plastic is still on the sofa.',
       '沙发 is a loan of "sofa". 拆 chāi is to unwrap or take apart.', .30, sz, 1.9);
    TH('电视', tx + .14, Y + .70, tz, '电视还在箱子里。', 'The television is still in its box.',
       '电 electric + 视 to see. 箱子 is the box it came in.', -1.90, tz, 1.9);
    TH('婚纱照', fx, Y + .70, fz - .14, '婚纱照还靠在墙边，没挂。',
       'The wedding photos lean against the wall, not hung yet.',
       '婚纱 the wedding dress + 照 photograph.', fx, .90, 1.9);
    TH('喜糖', gx - .14, Y + .58, gz - .32, '喜糖还剩半盒。', 'Half a tin of wedding sweets left.',
       '喜 joy + 糖 sweets — handed round to everybody at a wedding.', .20, gz - .32, 1.6);
    TH('客厅', .10, Y + 1.40, -.60, '客厅里只有一个沙发和一张小桌子。',
       'The living room has a sofa and one small table, and that is all.',
       '客 guest + 厅 hall.', .10, -.60, 3.0);
  })();

  // ==================================================================== 12. 主卧 the bedroom
  (function bedroom() {
    const bx = -4.70, bz = -.35;                      // head against the south wall
    box(bx, FL + .17, bz, 1.48, .30, 1.90, C('#a8895f'), { gloss: .18, tag: '床' });
    box(bx, FL + .40, bz, 1.42, .20, 1.84, C('#efeade'), { gloss: .08, mode: 7, tag: '床' });
    box(bx, FL + .66, bz - 1.00, 1.48, .70, .10, C('#8f7351'), { hard: true, gloss: .20, tag: '床' });
    stop(bx - .76, bx + .76, bz - 1.02, bz + .97);
    shade(bx, bz, 1.76, 2.14, .40, FL + .008);
    // 被子 — the red quilt set still in the shop's clear bag, standing on the mattress
    box(bx + .06, FL + .64, bz + .30, 1.00, .28, .74, col.red, { gloss: .10, mode: 7, tag: '被子' });
    box(bx + .06, FL + .64, bz + .30, 1.06, .32, .80, col.wrap,
        { mode: 18, alpha: .32, gloss: .74, tag: '被子' });
    box(bx + .06, FL + .795, bz + .30, .34, .10, .22, C('#d8cfb8'), { hard: true, gloss: .20 });
    G(bx + .06, FL + .795, bz + .70, 0, '囍', { size: .085, color: col.gold, tag: '被子' });
    for (const s of [-1, 1])
      box(bx + s * .36, FL + .55, bz - .74, .60, .12, .34, C('#f2eee2'),
          { gloss: .08, mode: 7, ry: s * .05, tag: '枕头' });
    for (const [i, c] of [[0, C('#c96f78')], [1, C('#5f88a8')]])
      box(bx + .48, FL + .53 + i * .075, bz + .80, .34, .07, .24, c, { mode: 7, gloss: .06, ry: .04 });

    // --- 婚纱照, the studio canvas over the bed. This one IS hung: it went up first, and it is
    // why the drill was borrowed off 904.
    const wy = Y + 1.80, wz = -1.338;
    box(bx, wy, wz, 1.70, .92, .05, C('#6d5233'), { hard: true, gloss: .22, tag: '婚纱照' });
    box(bx, wy, wz + .028, 1.58, .80, .012, C('#dcd4c4'), { hard: true, gloss: .18, tag: '婚纱照' });
    box(bx, wy, wz + .036, 1.52, .74, .006, C('#e6dfd0'), { hard: true, gloss: .16, tag: '婚纱照' });
    box(bx - .04, wy - .16, wz + .042, 1.52, .40, .004, C('#d3c9b6'), { hard: true, gloss: .14 });
    taper(bx + .20, wy - .12, wz + .046, .30, .52, .06, C('#f4f1ea'), { gloss: .12, tag: '婚纱照' });
    ball(bx + .20, wy + .20, wz + .046, .058, .070, .030, C('#e6cdb4'), { gloss: .16 });
    box(bx - .24, wy - .06, wz + .046, .26, .58, .05, C('#2e3440'), { gloss: .14, tag: '婚纱照' });
    ball(bx - .24, wy + .24, wz + .046, .054, .066, .030, C('#e2c8ae'), { gloss: .16 });
    box(bx - .24, wy + .30, wz + .052, .058, .036, .02, C('#8f1f1a'), { hard: true, gloss: .20 });
    box(bx, wy + .56, wz + .01, .34, .05, .09, col.goldD, { hard: true, gloss: .5 });
    // the hook for the second frame, which has not gone on yet
    cyl(bx + 1.20, Y + 1.90, wz + .01, .008, .022, col.steel, { rz: PI / 2, gloss: .6 });

    // --- a carton doing duty as a bedside table, in the 0.56 m gap between the bed and the west
    // wall, and the honeymoon suitcase in the clear strip at the foot end. Neither is in the
    // walking strip down the east side of the bed, which is the only floor this room has.
    const lx = -5.72, lz = -.20;
    box(lx, FL + .23, lz, .42, .46, .36, col.card, { hard: true, gloss: .07, ry: -.08, tag: '纸箱' });
    box(lx, FL + .455, lz, .42, .02, .36, col.cardD, { hard: true, gloss: .06, ry: -.08 });
    G(lx, FL + .30, lz + .19, 0, '厨房', { size: .050, gap: .010, color: C('#6d5836') });
    shade(lx, lz, .52, .46, .32, FL + .008);
    taper(lx, FL + .565, lz, .10, .20, .10, C('#e8dfc8'), { mode: 1, glow: .06, gloss: .10, tag: '灯' });
    light(lx, FL + .62, lz, C('#ffd9a0'), .28, 2.1);
    glow(M.trs(lx, Y + .020, lz, 0, 1.6, 1, 1.6), C('#e8d8b0'), .18);
    box(lx + .05, FL + .48, lz + .12, .07, .010, .145, C('#22262c'), { hard: true, gloss: .5, ry: .3 });
    const sx2 = -3.90, sz2 = 1.10;
    box(sx2, FL + .34, sz2, .46, .66, .28, C('#a52a22'), { gloss: .30, ry: .22, tag: '行李箱' });
    box(sx2, FL + .34, sz2, .40, .60, .30, C('#8d1f19'), { gloss: .26, ry: .22, tag: '行李箱' });
    box(sx2, FL + .70, sz2, .16, .05, .05, col.steelD, { hard: true, gloss: .5, ry: .22 });
    box(sx2 + .10, FL + .70, sz2 - .08, .30, .04, .22, C('#dfe4ea'), { mode: 7, gloss: .06, ry: .30 });
    shade(sx2, sz2, .60, .44, .32, FL + .008);

    cyl(bx + .40, CY - .01, .30, .026, .04, col.white, { gloss: .2 });
    cyl(bx + .40, CY - .19, .30, .0035, .36, C('#3a3a38'), { gloss: .3 });
    ball(bx + .40, CY - .41, .30, .044, .058, .044, col.bulbW, { mode: 1, glow: .10 });
    light(bx + .40, CY - .46, .30, C('#ffe0a6'), .48, 3.6);
    xi(X0 + .002, Y + 1.52, .10, PI / 2, .22);

    TH('床', bx, Y + .70, bz + .70, '床上还堆着没拆的被子。', 'The unopened quilt is still on the bed.',
       '床 bed. 双人床 is a double.', -3.30, .10, 2.2);
    TH('被子', bx + .06, Y + .82, bz + .30, '被子还在袋子里，红的。',
       'The quilt is still in its bag — red.',
       '被子 quilt. A red set is what a couple is given.', -3.30, .00, 2.0);
    TH('婚纱照', bx, wy, wz + .06, '婚纱照挂在床头。', 'The wedding photo hangs over the bed.',
       '婚纱照 the studio photographs every couple has taken before the wedding.', -3.30, -.60, 2.4);
    TH('行李箱', sx2, Y + .60, sz2, '行李箱还没收拾。', 'The suitcase is still not unpacked.',
       '行李 luggage + 箱 case.', -3.30, .95, 1.4);
  })();

  // ==================================================================== 13. 空房 the empty room
  //
  // The room they have not got to. Bare plaster, a bare bulb on a flex, two windows and a floor
  // with nothing on it — and, because of that, the room worth standing in at six in the evening.
  // Everything in here is light: the west window and the south window cross on the floor, the
  // plaster takes it, and there is nothing to interrupt it.
  (function empty() {
    const cx = -4.30, cz = -3.30;
    const BARE = { hard: true, gloss: .06, ...MAT.plaster };
    // Skimmed plaster over the paint, on the two internal faces. 12 mm proud of the partition,
    // and split round the doorway rather than drawn across it.
    wall(cx, Y + H / 2, -1.40 - T / 2 - .012, 3.40, H, PI, col.bare, BARE);
    for (const [z0, z1] of [[ZF, -3.00], [-1.90, -1.40]])
      wall(-2.60 - T / 2 - .012, Y + H / 2, (z0 + z1) / 2, z1 - z0, H, -PI / 2, col.bare, BARE);
    // and the same skim over the two outside walls, split round the windows
    for (const [x0, x1] of [[X0, -5.20], [-3.80, -2.60]])
      wall((x0 + x1) / 2, Y + H / 2, ZF + .022, x1 - x0, H, 0, col.bare, BARE);
    for (const [x0, x1] of [[-5.20, -3.80]]) {
      wall((x0 + x1) / 2, Y + .45, ZF + .022, x1 - x0, .90, 0, col.bare, BARE);
      wall((x0 + x1) / 2, Y + 2.375, ZF + .022, x1 - x0, .45, 0, col.bare, BARE);
    }
    for (const [z0, z1] of [[ZF, -3.40], [-2.00, -1.40]])
      wall(X0 + .022, Y + H / 2, (z0 + z1) / 2, z1 - z0, H, PI / 2, col.bare, BARE);
    wall(X0 + .022, Y + .45, -2.70, 1.40, .90, PI / 2, col.bare, BARE);
    wall(X0 + .022, Y + 2.375, -2.70, 1.40, .45, PI / 2, col.bare, BARE);
    // the filler over the joints, which is what an unpainted room actually looks like
    for (const [px, py, pw, ph] of [[-5.05, 1.72, .70, .34], [-3.35, .95, .52, .60],
                                    [-4.55, 2.12, .90, .26]])
      box(px, Y + py, -1.478, pw, ph, .008, col.bareD, BARE);
    for (const [pz, py, pw, ph] of [[-4.30, 1.30, .80, .50], [-2.35, 1.92, .60, .30]])
      box(-2.678, Y + py, pz, .008, ph, pw, col.bareD, BARE);
    for (const [pz, py, pw, ph] of [[-4.20, 1.86, .74, .28]])
      box(X0 + .034, Y + py, pz, .008, ph, pw, col.bareD, BARE);

    // the bare bulb: a plastic rose, 42 cm of flex, a brass lampholder and the lamp
    cyl(cx, CY - .01, cz, .030, .04, col.white, { gloss: .2 });
    cyl(cx, CY - .22, cz, .0035, .42, C('#3a3a38'), { gloss: .3, tag: '灯泡' });
    cyl(cx, CY - .45, cz, .017, .05, C('#c8b98a'), { gloss: .45, tag: '灯泡' });
    ball(cx, CY - .53, cz, .048, .066, .048, col.bulbW, { mode: 1, glow: .11, tag: '灯泡' });
    light(cx, CY - .60, cz, C('#ffe0a4'), .54, 4.2);
    glow(M.trs(cx, Y + .020, cz, 0, 3.4, 1, 3.4), C('#e4d5ac'), .20);

    // two capped socket boxes with the tails still poking out of one
    for (const [sx, sz2, onX] of [[X0 + .054, -2.10, true], [-3.60, ZF + .054, false]]) {
      box(sx, Y + .32, sz2, onX ? .026 : .10, .10, onX ? .10 : .026, C('#e6e2d6'),
          { hard: true, gloss: .28 });
      cyl(sx + (onX ? .020 : .03), Y + .385, sz2 + (onX ? .03 : .020), .004, .09, C('#c8503a'),
          { rz: .8, gloss: .3 });
    }
    // a strip of masking tape left on the skirting, a broom, a dustpan and the plaster dust
    box(-3.10, Y + .134, ZF + .078, .60, .022, .008, C('#e2c06a'), { hard: true, gloss: .12 });
    cyl(-5.70, FL + .66, -4.62, .014, 1.30, C('#a5844f'), { rz: .13, gloss: .18 });
    box(-5.88, FL + .05, -4.58, .30, .09, .10, C('#7f6a44'), { hard: true, gloss: .10, rz: .13 });
    shade(-5.80, -4.60, .40, .32, .26, FL + .008);
    box(-5.40, FL + .026, -4.58, .24, .05, .20, C('#3f5a72'), { hard: true, gloss: .24, ry: .4 });
    for (let i = 0; i < 9; i++)
      flat(-5.28 + (i % 3) * .13, FL + .002, -4.48 + ((i / 3) | 0) * .12, .16, .13,
           C('#d8d2c2'), { mode: 7, gloss: .04, ry: i });

    TH('灯泡', cx, CY - .53, cz, '这间屋子只有一个灯泡。', 'This room has nothing but a bare bulb.',
       '灯 lamp + 泡 bubble — the bulb itself. 灯 on its own is the light.', cx, cz + 1.00, 2.6);
    TH('空', cx - .40, Y + 1.30, cz - 1.00, '这间还空着，什么都没有。',
       'This room is still empty — nothing in it at all.',
       '空 kōng is empty. 空房间 an empty room; but 有空 yǒu kòng is to have free time.',
       cx - .40, cz + .10, 2.8, '空');
  })();

  // ==================================================================== 11b. 空调还没装
  //
  // The air conditioner, bought and not fitted, standing on its end in the 主卧 with the bracket
  // and the drill bit on top of it and a pencil cross on the wall where the hole goes. In a
  // Beijing flat in August this is the most urgent unfinished thing there is, which is exactly why
  // it belongs on a floor whose brief is "half-furnished" — half-furnished is not an amount of
  // furniture, it is a list of jobs.
  (function aircon() {
    // Clear of the 储藏 | 主卧 doorway, which is `part('z', 1.60, X0, -4.00, [[-5.45, -4.35]])`
    // at line 356 — a 1.10 m gap at z 1.60, x -5.45 .. -4.35. At z 1.05 this box inflated to
    // z 0.21 .. 1.89 and closed it to 0.44 m. Dropped south, against the same wall.
    const AX = -5.35, AZ = -0.20;
    box(AX, Y + .50, AZ, .42, 1.00, .96, C('#b39a72'), { hard: true, gloss: .10, mode: 11, tag: '纸箱' });
    box(AX, Y + 1.01, AZ, .44, .04, .98, C('#9e8760'), { hard: true, gloss: .08 });
    box(AX - .215, Y + .62, AZ, .012, .34, .52, C('#e9e2cf'), { hard: true, gloss: .06 });
    G(AX - .223, Y + .70, AZ, -PI / 2, '分体式空调', { size: .046, gap: .010, color: col.ink });
    G(AX - .223, Y + .60, AZ, -PI / 2, '大一匹', { size: .034, gap: .007, color: C('#8d8578') });
    G(AX - .223, Y + .50, AZ, -PI / 2, '向上　小心轻放',
      { size: .026, gap: .004, color: C('#b8342a') });
    for (const s of [-1, 1])
      box(AX, Y + .50 + s * .30, AZ, .43, .024, .99, C('#e2c06a'), { hard: true, gloss: .18 });
    // the wall bracket on top, still in its bag, and the masonry bit beside it
    for (const s of [-1, 1])
      box(AX + s * .10, Y + 1.06, AZ - .12, .06, .05, .48, C('#8d949a'),
          { hard: true, gloss: .42, ry: .08 });
    box(AX, Y + 1.06, AZ - .34, .30, .05, .06, C('#8d949a'), { hard: true, gloss: .42 });
    box(AX, Y + 1.07, AZ - .12, .34, .04, .56, C('#dfe6ea'), { mode: 18, alpha: .24, gloss: .70 });
    cap(AX + .04, Y + 1.06, AZ + .30, .010, .22, .010, C('#6d757b'), { rz: PI / 2, ry: .3, gloss: .46 });
    // the copper pair and the drain hose, coiled and taped, that come with it
    for (let i = 0; i < 4; i++)
      cyl(AX + .30, Y + .045 + i * .036, AZ - .48, .19 - i * .015, .034, C('#b58a52'),
          { gloss: .38, ry: i * .7 });
    cyl(AX + .30, Y + .19, AZ - .48, .06, .04, C('#cfd8d2'), { gloss: .24 });
    cyl(AX + .30, Y + .22, AZ - .48, .035, .03, C('#b58a52'), { gloss: .38 });
    cyl(AX + .44, Y + .028, AZ - .60, .045, .022, C('#8d949a'), { gloss: .44 });
    cyl(AX + .52, Y + .028, AZ - .56, .038, .022, C('#8d949a'), { gloss: .44 });
    box(AX + .48, Y + .034, AZ - .68, .16, .028, .10, C('#e2c06a'), { hard: true, gloss: .18, ry: .3 });
    box(AX + .66, Y + .030, AZ - .66, .12, .020, .08, C('#cfd8d2'), { mode: 7, gloss: .14, ry: -.4 });
    box(AX + .30, Y + .21, AZ - .48, .10, .020, .10, C('#e2c06a'), { hard: true, gloss: .18, ry: .4 });
    for (let i = 0; i < 3; i++)
      cyl(AX + .62, Y + .035 + i * .030, AZ - .30, .155 - i * .012, .028, C('#dfe6ea'),
          { gloss: .22, ry: -i * .6 });
    shade(AX + .30, AZ - .48, .48, .48, .30);
    shade(AX + .62, AZ - .30, .40, .40, .28);
    // the pencil cross on the wall, and the hole that has not been drilled
    for (const [gw, gh] of [[.34, .010], [.010, .34]])
      box(AX - .40, Y + 1.90, 1.60 - .028, gw, gh, .004, C('#5d5a52'), { hard: true, gloss: .04 });
    G(AX - .40, Y + 2.16, 1.60 - .028, 0, '打这儿', { size: .036, gap: .007, color: C('#8d8578') });
    shade(AX, AZ, .60, 1.12, .36);
    stop(AX - .26, AX + .26, AZ - .54, AZ + .54);
    TH('空调', AX, Y + .90, AZ - .62, '空调买回来了，还没装上。',
       'The air conditioner has been bought and not yet fitted.',
       '空 air + 调 to adjust. 装空调 — to have one put in, which somebody has to come and do.',
       AX + .70, AZ - .62, 1.8);
  })();

  // ==================================================================== 12b. 结婚的东西
  //
  // The other half of "half-furnished": what came IN with the wedding and has not been put away.
  // A newlywed flat in this city is full of things still in their wrapping — the quilts the two
  // families sent, in their zip bags; the tins of 喜糖 that did not get handed out; a boxed
  // television nobody has hung yet; and the 红包 the couple have not finished counting.
  //
  // Stacked against the living room's west partition, out of the walking line between the door and
  // the sofa, and countable — four quilts, three tins, one television.
  (function weddingGear() {
    // Clear of the 主卧 | 客厅 doorway, and clear of the run up to it.
    //
    // That partition is `part('x', -2.60, -1.40, 1.60, [[.20, 1.30]])` at line 348: a 1.10 m gap
    // in the wall at x -2.60, whose two jambs inflate to leave a 0.50 m band at z 0.50 .. 1.00 —
    // the only way into the main bedroom. At x -2.30 this stack covered the gap itself; at x -1.30
    // it cleared the gap but left a 0.10 m slot between its own inflated face and the jambs', which
    // is narrower than the body and sealed the bedroom just as completely. A collider near a
    // doorway has to be judged against the APPROACH, not just the opening.
    const WX2 = -0.60, WZ2 = 0.55;
    // the quilts, four of them, each in a clear zip bag with a red band across it
    for (let i = 0; i < 4; i++) {
      const qy = Y + .11 + i * .21;
      box(WX2, qy, WZ2 + (i % 2 ? .03 : -.03), .96, .20, .70,
          [C('#c9506a'), C('#d8cbb0'), C('#b8425c'), C('#e0d6c2')][i],
          { hard: true, gloss: .10, ry: (i - 1.5) * .03, mode: 7, tag: '被子' });
      box(WX2, qy, WZ2 + (i % 2 ? .03 : -.03), .99, .21, .73, C('#dfe6ea'),
          { mode: 18, alpha: .22, gloss: .70, ry: (i - 1.5) * .03 });
      box(WX2, qy + .10, WZ2 + (i % 2 ? .03 : -.03), 1.00, .04, .12, C('#b8342a'),
          { hard: true, gloss: .14, ry: (i - 1.5) * .03 });
    }
    G(WX2, Y + .70, WZ2 - .37, 0, '囍', { size: .085, gap: .014, color: C('#f0e0d2') });
    shade(WX2, WZ2, 1.16, .90, .38);
    stop(WX2 - .54, WX2 + .54, WZ2 - .42, WZ2 + .42);

    // 喜糖罐 — three tins of wedding sweets on top of the stack, one open
    for (const [i, tz] of [[0, -.18], [1, .16], [2, .48]]) {
      cyl(WX2 + .22 - i * .04, Y + .94, WZ2 + tz, .105, .16, C('#c9382a'), { gloss: .34 });
      cyl(WX2 + .22 - i * .04, Y + 1.02, WZ2 + tz, .108, .012, C('#e0b52c'),
          { hard: true, gloss: .46 });
    }
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      box(WX2 + .18 + Math.cos(a) * .10, Y + 1.04, WZ2 + .48 + Math.sin(a) * .09,
          .034, .020, .026, i % 2 ? C('#d8a520') : C('#c9506a'), { hard: true, gloss: .30, ry: a });
    }
    // the boxed television, on its end against the partition
    box(WX2 + .84, Y + .52, WZ2 - .30, .18, 1.00, .74, C('#ab8f62'),
        { hard: true, gloss: .10, rz: .04, mode: 11, tag: '纸箱' });
    box(WX2 + .93, Y + .66, WZ2 - .30, .012, .30, .40, C('#e9e2cf'), { hard: true, gloss: .06 });
    G(WX2 + .938, Y + .74, WZ2 - .30, PI / 2, '液晶电视', { size: .044, gap: .009, color: col.ink });
    G(WX2 + .938, Y + .64, WZ2 - .30, PI / 2, '向上　防潮',
      { size: .028, gap: .005, color: C('#8d8578') });
    for (const s of [-1, 1])
      box(WX2 + .845, Y + .52 + s * .30, WZ2 - .30, .19, .022, .75, C('#e2c06a'),
          { hard: true, gloss: .18, rz: .04 });
    shade(WX2 + .84, WZ2 - .30, .46, .90, .34);
    stop(WX2 + .70, WX2 + .98, WZ2 - .70, WZ2 + .10);

    // 红包, counted into two piles on the floor beside it, with the notebook they are logged in
    for (const [i, px, pz] of [[0, WX2 + .30, WZ2 - .95], [1, WX2 + .56, WZ2 - .88]])
      for (let k = 0; k < 5; k++)
        box(px, Y + .008 + k * .009, pz, .17, .008, .10, C('#b8342a'),
            { hard: true, gloss: .12, ry: i * .5 + k * .09 });
    box(WX2 + .06, Y + .010, WZ2 - .92, .22, .012, .16, C('#e9e2cf'),
        { hard: true, gloss: .05, ry: -.22 });
    for (let i = 0; i < 4; i++)
      box(WX2 + .06, Y + .018, WZ2 - .96 + i * .026, .16, .002, .003, C('#8d9aa4'),
          { hard: true, ry: -.22 });
    cap(WX2 - .06, Y + .022, WZ2 - .88, .006, .13, .006, C('#2b4f86'),
        { rz: PI / 2, ry: .4, gloss: .40 });
    shade(WX2 + .40, WZ2 - .92, .70, .40, .26);

    // and the curtain rail up over the south window with no curtain on it yet, which is the single
    // clearest "not finished" in the flat and the reason the room is bright at seven in the morning
    cap(0.20, Y + 2.34, ZF + .10, .014, 2.20, .014, C('#9aa2a6'),
        { rz: PI / 2, gloss: .48 });
    for (const s of [-1, 1])
      box(0.20 + s * 1.06, Y + 2.34, ZF + .10, .05, .09, .09, C('#8d949a'),
          { hard: true, gloss: .40 });
    for (let i = 0; i < 6; i++)
      cyl(-0.55 + i * .30, Y + 2.34, ZF + .10, .022, .012, C('#c3c9cd'),
          { rz: PI / 2, gloss: .52 });
    box(1.10, Y + .30, ZF + .26, .30, .58, .22, C('#cfd8d2'), { mode: 7, gloss: .12, ry: .3 });
    shade(1.10, ZF + .26, .44, .36, .28);

    // 婚纱照 — the wedding photograph, a metre and a half of it, leaning face-in against the wall
    // because the hook is not up. It is the largest single object in the flat and it is on the
    // floor, which is the whole of "half-furnished" in one prop.
    const PHX = 1.85, PHZ = 1.42;
    box(PHX, Y + .78, PHZ, 1.10, 1.52, .06, C('#8a6a48'),
        { hard: true, gloss: .24, rx: .13, mode: 6, tag: '照片' });
    box(PHX, Y + .78, PHZ - .042, 1.00, 1.42, .012, C('#d8cfc0'),
        { hard: true, gloss: .10, rx: .13 });
    box(PHX, Y + .78, PHZ - .050, .94, 1.36, .006, C('#c9c2b4'),
        { hard: true, gloss: .06, rx: .13 });
    for (const s of [-1, 1])
      box(PHX + s * .40, Y + 1.38, PHZ - .12, .22, .10, .010, C('#e2c06a'),
          { hard: true, gloss: .16, rx: .13 });
    // the two hooks and the spirit level on the wall behind it, put up and given up on
    for (const s of [-1, 1])
      cyl(PHX + s * .32, Y + 1.86, 1.60 - .026, .010, .045, C('#9aa2a6'),
          { rx: PI / 2, gloss: .48 });
    box(PHX, Y + 1.72, 1.60 - .030, .38, .05, .04, C('#d8a520'), { hard: true, gloss: .30 });
    box(PHX, Y + 1.72, 1.60 - .052, .09, .030, .006, C('#8fd08f'),
        { hard: true, mode: 1, glow: .05 });
    for (let i = 0; i < 3; i++)
      box(PHX - .40 + i * .40, Y + 1.94, 1.60 - .026, .06, .006, .004, C('#5d5a52'), { hard: true });
    shade(PHX, PHZ, 1.30, .60, .34);
    stop(PHX - .58, PHX + .58, PHZ - .26, PHZ + .22);

    // 鞋柜 still in its shrink wrap, turned against the EAST gable and not left across the door.
    //
    // It stood at (4.55, 2.90) for one run, which put its collider — inflated by the 0.30 m body
    // radius to x 3.71 .. 5.39 — straight over the front door's opening at x 3.40 .. 4.40. That
    // left 0.31 m of clear run where a body needs 0.60, and it sealed the whole flat from the
    // landing: the flood fill went from 64 m2 reachable to 24, and every fixture in the flat,
    // including ones that predate this lane, became unreachable. A cabinet 1.0 m wide has to stand
    // along a wall it does not share with the door.
    //
    // Turned through 90 degrees so its long axis runs in z against the gable, and pushed to
    // x 5.50: inflated it occupies x 5.03 .. 5.97, which leaves the 玄关 1.5 m of clear floor and
    // the doorway untouched.
    const SHX = 5.50, SHZ2 = 2.20;
    box(SHX, Y + .44, SHZ2, .34, .88, 1.00, C('#c6b295'), { hard: true, gloss: .16, mode: 6 });
    box(SHX - .006, Y + .44, SHZ2, .36, .91, 1.03, C('#dfe6ea'),
        { mode: 18, alpha: .26, gloss: .72 });
    box(SHX, Y + .88, SHZ2, .38, .04, 1.04, C('#b8a888'), { hard: true, gloss: .14 });
    box(SHX - .02, Y + .96, SHZ2 - .18, .26, .12, .40, C('#ab8f62'),
        { hard: true, gloss: .10, ry: .18, mode: 11 });
    for (const s of [-1, 1])
      box(SHX + s * .17, Y + .44, SHZ2, .02, .026, 1.05, C('#e2c06a'), { hard: true, gloss: .18 });
    shade(SHX, SHZ2, .50, 1.16, .34);
    stop(SHX - .17, SHX + .17, SHZ2 - .50, SHZ2 + .50);

    TH('照片', PHX, Y + 1.00, PHZ - .34, '婚纱照还靠在墙边，没挂上去。',
       'The wedding photograph is still leaning against the wall, not hung.',
       '照片 zhàopiàn — a photograph. 婚纱照 hūnshāzhào is the big studio one every couple has.',
       PHX, PHZ - .95, 1.9);
    TH('被子', WX2, Y + .90, WZ2 - .56, '两家送的被子还堆在客厅。',
       'The quilts both families sent are still stacked in the living room.',
       '被子 bèizi — a quilt. 一床被子 is one of them; 床 is its measure word.',
       WX2, WZ2 - 1.10, 1.9);
    TH('红包', WX2 + .40, Y + .30, WZ2 - 1.20, '红包还没数完。', 'The red envelopes are not counted yet.',
       '红 red + 包 wrapper. 包红包 — to give one; 收红包 — to be given one.',
       WX2 + .40, WZ2 - 1.55, 1.6);
  })();

  // ==================================================================== 13b. 家具还没装
  //
  // "Newlyweds, half-furnished" was 331 draws and a bare room, which reads as *un*furnished — the
  // difference between the two is entirely in what is standing about waiting to be put together.
  // `HOME_USE_FLOOR[9]`'s 说明书 action talks about the flat-pack; this is the flat-pack, stacked
  // where a real one is stacked and countable at a glance, which is what makes the action about
  // something.
  //
  // Along the west wall of the 空房 and out into the middle, because that is what stops the room
  // being a room. Every carton is a box and a strap and a label, not a modelled crate: at two
  // metres that is what a carton is, and thirty of them modelled would be the whole floor's budget.
  (function flatpack() {
    const KC = C('#ab8f62'), KCD = C('#8d7449'), KCL = C('#bd9f6f'), STRAP = C('#e2c06a');
    // The wardrobe, still boxed: two long flat cartons on edge against the west wall, which is how
    // a 衣柜 arrives and where it waits until somebody has a free Sunday.
    for (const [i, cz] of [[0, -2.95], [1, -2.68]]) {
      box(X0 + .30 + i * .015, Y + .98, cz, .22, 1.92, 1.10, i ? KCD : KC,
          { hard: true, gloss: .10, rz: .02, mode: 11, tag: '纸箱' });
      box(X0 + .42, Y + 1.34, cz, .012, .34, .46, C('#e9e2cf'), { hard: true, gloss: .06 });
      G(X0 + .428, Y + 1.42, cz, PI / 2, '两门衣柜', { size: .048, gap: .010, color: col.ink });
      G(X0 + .428, Y + 1.32, cz, PI / 2, '一件', { size: .034, gap: .007, color: C('#8d8578') });
      box(X0 + .31, Y + 1.40, cz, .24, .022, 1.11, STRAP, { hard: true, gloss: .18 });
      box(X0 + .31, Y + .56, cz, .24, .022, 1.11, STRAP, { hard: true, gloss: .18 });
    }
    // The bookcase and the shoe cabinet, flat and stacked, with the fittings bag on top.
    const SX = -4.55, SZ2 = -4.20;
    for (let i = 0; i < 4; i++)
      box(SX + (i % 2 ? .03 : -.02), Y + .09 + i * .105, SZ2 + (i % 2 ? -.04 : .03),
          1.34, .10, .58, [KC, KCD, KCL, KC][i], { hard: true, gloss: .10, ry: (i - 1.5) * .022,
                                                   mode: 11, tag: '纸箱' });
    box(SX + .30, Y + .50, SZ2 - .06, .38, .05, .28, C('#cfd8d2'),
        { mode: 7, gloss: .16, ry: .18 });
    for (let i = 0; i < 5; i++)
      cyl(SX + .22 + (i % 3) * .07, Y + .52, SZ2 - .12 + (i % 2) * .09, .014, .05, C('#9aa2a6'),
          { gloss: .40, ry: i });
    box(SX - .30, Y + .49, SZ2 + .06, .40, .012, .30, C('#e9e2cf'),
        { hard: true, gloss: .05, ry: -.12 });
    G(SX - .30, Y + .497, SZ2 + .06, 0, '安装说明书',
      { size: .046, gap: .010, color: col.ink, rx: -PI / 2, ry: -.12 });
    shade(SX, SZ2, 1.60, .84, .34);
    stop(SX - .74, SX + .74, SZ2 - .38, SZ2 + .38);

    // The dining chairs, four to a carton, one carton opened and one chair out and half-built.
    // Pushed west, off the 空房's doorway. The east wall of this room has its gap at x -2.60,
    // z -3.00 .. -1.90; a carton at x -3.20 inflated to x -3.92 .. -2.48 and left 0.18 m of that
    // doorway clear, which sealed the room. Anything standing in here keeps its inflated east edge
    // west of x -3.00.
    const CCX = -4.40, CCZ = -2.30;
    box(CCX, Y + .34, CCZ, .74, .66, .74, KC, { hard: true, gloss: .10, ry: .12, mode: 11, tag: '纸箱' });
    box(CCX, Y + .68, CCZ, .76, .04, .76, KCD, { hard: true, gloss: .08, ry: .12 });
    for (const s of [-1, 1])
      box(CCX + s * .19, Y + .74, CCZ + .30, .36, .12, .34, KCL,
          { hard: true, gloss: .10, ry: .12, rx: s * .34 });
    box(CCX, Y + .015, CCZ, .78, .022, .78, STRAP, { hard: true, gloss: .18, ry: .12 });
    shade(CCX, CCZ, .92, .92, .38);
    stop(CCX - .42, CCX + .42, CCZ - .42, CCZ + .42);
    // and the chair itself, seat on, back leaning against the carton, two legs still in the bag
    const HCX = -3.95, HCZ = -1.55;
    box(HCX, Y + .44, HCZ, .40, .04, .40, C('#a5844f'), { hard: true, gloss: .20, ry: -.24, mode: 6 });
    for (const s of [-1, 1])
      cap(HCX + s * .16, Y + .22, HCZ - .16, .020, .44, .020, C('#a5844f'),
          { ry: -.24, gloss: .18, mode: 6 });
    box(HCX + .26, Y + .40, HCZ + .26, .05, .80, .34, C('#a5844f'),
        { hard: true, gloss: .20, rz: .34, ry: .5, mode: 6 });
    for (const s of [-1, 1])
      cap(HCX - .30 + s * .05, Y + .022, HCZ + .22, .020, .44, .020, C('#a5844f'),
          { rz: PI / 2, ry: .8 + s * .1, gloss: .18, mode: 6 });
    box(HCX - .12, Y + .028, HCZ + .38, .22, .04, .16, C('#cfd8d2'), { mode: 7, gloss: .16, ry: .4 });
    cyl(HCX + .40, Y + .06, HCZ - .18, .034, .12, C('#c8503a'), { gloss: .30, tag: '螺丝刀' });
    cap(HCX + .40, Y + .20, HCZ - .18, .010, .18, .010, C('#9aa2a6'), { gloss: .48 });
    shade(HCX, HCZ, .70, .70, .32);
    stop(HCX - .34, HCX + .34, HCZ - .34, HCZ + .34);

    // The polystyrene and the shredded cardboard that comes out of all of it, swept into a corner.
    for (const [px, pz, pw, ph, pd, pr] of [[-5.55, -1.85, .52, .10, .34, .3],
                                            [-5.30, -1.72, .44, .08, .30, -.5],
                                            [-5.62, -1.55, .38, .07, .26, .9]])
      box(px, Y + ph / 2 + .01, pz, pw, ph, pd, C('#e2ded2'), { hard: true, gloss: .10, ry: pr });
    for (let i = 0; i < 6; i++)
      box(-5.10 + (i % 3) * .13, Y + .012, -2.20 + Math.floor(i / 3) * .16, .16, .006, .11,
          i % 2 ? KCL : KCD, { hard: true, gloss: .06, ry: i * 1.1 });
    shade(-5.45, -1.72, .90, .70, .30);

    TH('纸箱', SX, Y + .60, SZ2 + .52, '家具还在纸箱里，没拆。',
       'The furniture is still in its boxes, unopened.',
       '纸 paper + 箱 case. 拆 chāi — to open one up. 组装 zǔzhuāng — to put it together.',
       SX, SZ2 + 1.05, 2.0);
    TH('说明书', SX - .30, Y + .55, SZ2 + .06, '说明书摊在纸箱上。',
       'The instructions are spread out on the carton.',
       '说明 to explain + 书 written thing. 按说明书装 — assemble it by the book.',
       SX - .30, SZ2 + .95, 1.6);
  })();

  // ==================================================================== 14. 储藏 the box room
  //
  // Where the flat's furniture actually is. The wardrobe half out of its flat pack, the
  // instructions and the key on the floor beside it, a wall of unopened cartons, and the bubble
  // wrap it all came in.
  (function store() {
    const cx = -5.10, cz = 2.92;
    // two sides up, a base, a top rail, and the back panel not fixed yet
    for (const s of [-1, 1])
      box(cx + s * .45, FL + .92, cz, .05, 1.82, .44, col.ply, { hard: true, gloss: .16, tag: '衣柜' });
    box(cx, FL + .04, cz, .95, .05, .44, col.ply, { hard: true, gloss: .16, tag: '衣柜' });
    box(cx, FL + 1.81, cz, .95, .05, .44, col.plyD, { hard: true, gloss: .16, tag: '衣柜' });
    box(cx, FL + .90, cz + .21, .95, 1.76, .008, C('#d8c9a8'), { hard: true, gloss: .10, tag: '衣柜' });
    box(cx, FL + 1.20, cz - .02, .86, .022, .022, col.steel, { hard: true, gloss: .55, tag: '衣柜' });
    stop(cx - .54, cx + .54, cz - .28, cz + .28);
    shade(cx, cz, 1.15, .58, .34, FL + .008);
    // the two doors, not on yet, leaning against the west wall
    for (const i of [0, 1])
      box(X0 + .17 + i * .07, FL + .88, 2.28 - i * .06, .05, 1.74, .48, col.ply,
          { hard: true, gloss: .18, rz: .10 - i * .01, tag: '衣柜' });
    shade(X0 + .21, 2.26, .26, .56, .30, FL + .008);
    // the shelf still banded in polythene, flat on the floor
    box(-4.55, FL + .05, 2.20, .78, .09, .40, col.plyD, { hard: true, gloss: .14, ry: .12 });
    box(-4.55, FL + .05, 2.20, .82, .11, .44, col.wrap, { mode: 18, alpha: .34, gloss: .70, ry: .12 });
    shade(-4.55, 2.20, .90, .52, .30, FL + .008);
    // --- 说明书 and the Allen key on the floor, which is the whole picture
    box(-4.90, FL + .006, 2.44, .21, .004, .30, col.paper, { hard: true, gloss: .06, ry: .35, tag: '说明书' });
    G(-4.90, FL + .011, 2.44, 0, '安装说明', { size: .028, gap: .006, ry: .35 });
    for (let i = 0; i < 4; i++)
      box(-4.95 + (i % 2) * .07, FL + .011, 2.40 + ((i / 2) | 0) * .07, .045, .002, .045,
          C('#c9c3b2'), { hard: true, gloss: .05, ry: .35 });
    cyl(-4.64, FL + .012, 2.38, .0045, .09, C('#3f464b'), { rz: PI / 2, ry: .9, gloss: .5, tag: '说明书' });
    cyl(-4.62, FL + .012, 2.34, .0045, .035, C('#3f464b'), { rx: PI / 2, ry: .9, gloss: .5 });
    for (let i = 0; i < 7; i++)
      cyl(-4.78 + (i % 4) * .035, FL + .008, 2.58 + ((i / 4) | 0) * .05, .006, .016, C('#9aa0a4'),
          { rx: PI / 2, gloss: .55 });

    // --- the cartons, out of reach against the east wall
    const stack = (px, pz, n, w, d, hgt, lbl) => {
      for (let i = 0; i < n; i++)
        box(px + (i % 2 - .5) * .025, FL + .01 + hgt * (i + .5), pz, w, hgt, d,
            i % 2 ? col.card : col.cardD, { hard: true, gloss: .07, ry: .05 * (i - 1) });
      if (lbl) G(px - w / 2 - .008, FL + hgt * (n - .5), pz, -PI / 2, lbl,
                 { size: .048, gap: .010, color: C('#6b5637') });
      shade(px, pz, w + .12, d + .12, .32, FL + .008);
    };
    stack(-4.22, 2.92, 3, .52, .46, .38, '厨房');
    stack(-4.24, 2.34, 2, .48, .42, .34, '书');
    // --- 气泡膜, a roll of it and a torn sheet on the floor
    cyl(-4.60, FL + .21, 2.02, .21, .55, col.foam,
        { rz: PI / 2, mode: 18, alpha: .55, gloss: .55, tag: '气泡膜' });
    for (let i = 0; i < 5; i++)
      cyl(-4.60 - .22 + i * .11, FL + .21, 2.02, .213, .012, C('#dfe6e6'),
          { rz: PI / 2, mode: 18, alpha: .40, gloss: .60 });
    flat(-5.30, FL + .004, 2.16, .70, .52, col.foam, { mode: 18, alpha: .42, gloss: .55, ry: .5, tag: '气泡膜' });
    shade(-4.60, 2.05, .60, .50, .30, FL + .008);

    cyl(-4.90, CY - .01, 2.30, .026, .04, col.white, { gloss: .2 });
    cyl(-4.90, CY - .15, 2.30, .003, .26, C('#3a3a38'), { gloss: .3 });
    ball(-4.90, CY - .32, 2.30, .042, .056, .042, col.bulbW, { mode: 1, glow: .09 });
    light(-4.90, CY - .38, 2.30, C('#ffe0a6'), .36, 2.8);

    TH('衣柜', cx, Y + 1.00, cz - .24, '衣柜装了一半就停了。',
       'The wardrobe got half built and then stopped.',
       '衣 clothes + 柜 cabinet. 装 zhuāng is to install or assemble.', cx, 2.25, 1.9);
    TH('说明书', -4.90, Y + .16, 2.44, '说明书摊在地上，看不懂。',
       'The instructions are spread on the floor and make no sense.',
       '说明 to explain + 书 a written thing: a manual.', -4.90, 2.15, 1.5);
    TH('气泡膜', -4.60, Y + .32, 2.02, '气泡膜还剩一大卷。', 'A big roll of bubble wrap left over.',
       '气泡 bubble + 膜 film. 保护膜 is the protective film on new appliances.', -4.90, 2.15, 1.6);
    TH('储藏室', -4.60, Y + 1.40, 2.60, '东西都堆在储藏室里。', 'Everything is piled in the store room.',
       '储藏 to store + 室 room.', -4.90, 2.15, 2.4, '储藏室');
  })();

  // ==================================================================== 15. 卫生间 the bathroom
  //
  // Two of everything and nothing else. New sanitaryware with the labels still on it.
  (function bath() {
    wall(-2.80, Y + 1.10, 1.60 + T / 2 + .012, 2.40, 2.20, 0, col.tile, TIL);
    wall(-1.60 - T / 2 - .012, Y + 1.10, 2.40, 1.60, 2.20, -PI / 2, col.tile, TIL);
    wall(-4.00 + T / 2 + .012, Y + 1.10, 2.40, 1.60, 2.20, PI / 2, col.tile, TIL);
    wall(-2.80, Y + 1.10, ZM - .034, 2.40, 2.20, PI, col.tile, TIL);
    // 淋浴 in the west end, on a tray with a glass screen
    box(-3.55, FL + .035, 2.55, .82, .05, 1.06, col.porc, { hard: true, gloss: .55 });
    box(-3.14, FL + 1.00, 2.55, .012, 1.90, 1.06, col.glass,
        { hard: true, mode: 18, alpha: .18, gloss: .82 });
    cyl(-3.85, Y + 2.02, 2.55, .014, .34, col.steel, { rz: PI / 2, gloss: .6 });
    cyl(-3.66, Y + 1.98, 2.55, .055, .03, col.steel, { rx: 0, gloss: .65, tag: '淋浴' });
    box(-3.90, Y + 1.02, 2.55, .07, .17, .05, col.steel, { hard: true, gloss: .6 });
    stop(-3.98, -3.20, 2.02, 3.10);
    shade(-3.55, 2.55, .92, 1.16, .22, FL + .008);
    // 马桶, in the north-east corner
    box(-2.05, FL + .19, 2.92, .38, .38, .56, col.porc, { gloss: .52, tag: '马桶' });
    box(-2.05, FL + .40, 2.92, .40, .06, .54, col.porc, { hard: true, gloss: .50, tag: '马桶' });
    box(-2.05, FL + .55, 3.09, .38, .38, .17, col.porc, { hard: true, gloss: .52, tag: '马桶' });
    shade(-2.05, 2.94, .50, .66, .28, FL + .008);
    // 洗手台 on the south wall, with two of everything on it
    const wx = -2.80, wz = 1.90;
    box(wx, FL + .82, wz, .78, .10, .50, col.porc, { hard: true, gloss: .55, tag: '洗手池' });
    box(wx, FL + .74, wz, .58, .09, .38, col.porc, { gloss: .50, tag: '洗手池' });
    box(wx, FL + .40, wz, .70, .70, .44, C('#d6ccb6'), { hard: true, gloss: .24 });
    cyl(wx, FL + .93, wz - .17, .017, .16, col.steel, { gloss: .68, tag: '水龙头' });
    cyl(wx, FL + .99, wz - .11, .012, .11, col.steel, { rx: PI / 2, gloss: .68, tag: '水龙头' });
    cyl(wx + .30, FL + .925, wz + .02, .042, .11, C('#e8e4d8'), { gloss: .40, tag: '牙刷' });
    for (const [s, c] of [[-1, C('#3f7fa8')], [1, C('#d8607a')]]) {
      cyl(wx + .30 + s * .016, FL + 1.03, wz + .02, .0055, .17, c, { rz: s * .10, gloss: .40, tag: '牙刷' });
      cap(wx + .30 + s * .022, FL + 1.115, wz + .02, .012, .035, .010, C('#f0ede4'),
          { rz: s * .10, gloss: .30, tag: '牙刷' });
    }
    box(wx - .28, FL + .90, wz + .02, .05, .16, .05, C('#e0dcd0'), { hard: true, gloss: .40 });
    box(wx, FL + 1.42, wz - .225, .62, .68, .014, col.steel,
        { hard: true, gloss: .84, mode: 18, alpha: .28 });
    box(wx, FL + 1.42, wz - .234, .68, .74, .012, C('#b6ada0'), { hard: true, gloss: .24 });
    box(wx, FL + 1.82, wz - .18, .48, .05, .10, C('#f4f0e2'), { hard: true, mode: 1, glow: .09 });
    light(wx, FL + 1.78, wz + .30, C('#eaf2f4'), .40, 2.6);
    // two towels on two rails
    for (const [i, c] of [[0, C('#c96f78')], [1, C('#5f88a8')]]) {
      box(-1.70, FL + 1.06 - i * .40, 2.20, .05, .05, .42, col.steel, { hard: true, gloss: .6 });
      box(-1.74, FL + .86 - i * .40, 2.20, .04, .38, .34, c, { mode: 7, gloss: .06, tag: '毛巾' });
    }
    // 热水器, still with its sticker on
    box(-2.60, FL + 1.66, 3.02, .70, .44, .22, C('#eae6dc'), { hard: true, gloss: .30, tag: '热水器' });
    box(-2.60, FL + 1.66, 2.905, .30, .18, .010, C('#dce4e8'), { hard: true, gloss: .40 });
    box(-2.90, FL + 1.76, 2.902, .18, .12, .004, C('#e8d05a'), { hard: true, gloss: .20 });
    ball(-2.80, CY - .30, 2.40, .042, .056, .042, col.bulbW, { mode: 1, glow: .09 });
    cyl(-2.80, CY - .15, 2.40, .003, .26, C('#3a3a38'), { gloss: .3 });
    light(-2.80, CY - .36, 2.40, C('#f2ecd8'), .42, 3.0);

    TH('牙刷', wx + .30, Y + 1.06, wz + .02, '杯子里有两把牙刷。', 'Two toothbrushes in one cup.',
       '牙 tooth + 刷 brush. 两把 — 把 is the measure word for a handled thing.', wx + .10, 2.30, 1.6);
    TH('毛巾', -1.74, Y + .86, 2.20, '两条毛巾，一人一条。', 'Two towels, one each.',
       '毛 fur + 巾 cloth. 条 tiáo is the measure word for it.', -2.15, 2.25, 1.6);
    TH('热水器', -2.60, Y + 1.66, 2.90, '热水器是新装的。', 'The water heater is newly fitted.',
       '热水 hot water + 器 appliance.', -2.60, 2.30, 1.9);
  })();

  // ==================================================================== 16. 厨房 the kitchen
  //
  // Everything in here is new and everything in here still has the film on it. That is the point
  // of the room: it is finished, and it has never been cooked in.
  (function kitchen() {
    for (const [x0, x1] of [[2.60, 3.50], [4.60, X1]])
      wall((x0 + x1) / 2, Y + 1.20, -1.20 - T / 2 - .012, x1 - x0, 2.40, PI, col.tile, TIL);
    wall(2.60 + T / 2 + .012, Y + 1.20, -3.10, 3.80, 2.40, PI / 2, col.tile, TIL);
    // the run of units down the east wall
    const ux = 5.62;
    box(ux, FL + .42, -3.10, .60, .84, 3.40, C('#e0dacc'), { hard: true, gloss: .28, tag: '厨房' });
    box(ux, FL + .865, -3.10, .64, .05, 3.44, C('#8b8a86'), { hard: true, gloss: .48, ...MAT.slab });
    for (let i = 0; i < 5; i++) {
      box(ux - .305, FL + .42, -4.55 + i * .70, .012, .74, .62, C('#eae4d6'), { hard: true, gloss: .30 });
      box(ux - .318, FL + .42, -4.55 + i * .70, .006, .70, .58, col.film,
          { hard: true, mode: 18, alpha: .50, gloss: .72 });
      box(ux - .330, FL + .70, -4.55 + i * .70, .014, .022, .28, col.steel, { hard: true, gloss: .6 });
    }
    stop(ux - .34, ux + .34, -4.85, -1.35);
    shade(ux, -3.10, .70, 3.50, .34, FL + .008);
    // 水槽 under the east window
    box(ux - .02, FL + .845, -2.25, .42, .04, .52, C('#c2c8cc'), { hard: true, gloss: .70, ...MAT.metal });
    box(ux - .02, FL + .805, -2.25, .36, .10, .46, C('#aeb5ba'), { gloss: .66, ...MAT.metal });
    cyl(ux + .18, FL + .96, -2.25, .016, .19, col.steel, { gloss: .72, tag: '水龙头' });
    cyl(ux + .09, FL + 1.045, -2.25, .012, .18, col.steel, { rz: PI / 2, gloss: .72, tag: '水龙头' });
    // 灶台 and 抽油烟机, both still filmed
    box(ux - .02, FL + .895, -3.85, .42, .015, .56, C('#20242a'), { hard: true, gloss: .68, tag: '炉子' });
    for (const s of [-1, 1]) {
      cyl(ux - .02, FL + .908, -3.85 + s * .15, .075, .012, C('#3d434a'), { gloss: .55, tag: '炉子' });
      cyl(ux - .02, FL + .920, -3.85 + s * .15, .028, .012, C('#5a6068'), { gloss: .60, tag: '炉子' });
    }
    box(ux - .02, FL + .932, -3.85, .40, .002, .54, col.film, { hard: true, mode: 18, alpha: .45, gloss: .78 });
    box(ux - .06, FL + 1.72, -3.85, .52, .28, .70, C('#c8ced2'),
        { hard: true, gloss: .50, ...MAT.metal });
    taper(ux - .06, FL + 1.50, -3.85, .50, .22, .66, C('#d2d8dc'), { gloss: .50, tag: '油烟机' });
    box(ux - .33, FL + 1.72, -3.85, .010, .24, .62, col.film,
        { hard: true, mode: 18, alpha: .50, gloss: .76 });
    // 冰箱 — new, tall, doors facing into the room, and half its film still on
    const fx = 3.35, fz = -4.42;
    box(fx, FL + .88, fz, 1.28, 1.76, .68, C('#d2d8dc'),
        { hard: true, gloss: .52, ...MAT.metal, tag: '冰箱' });
    box(fx, FL + 1.30, fz + .345, 1.22, .86, .012, C('#dee3e6'), { hard: true, gloss: .58, tag: '冰箱' });
    box(fx, FL + .44, fz + .345, 1.22, .82, .012, C('#dee3e6'), { hard: true, gloss: .58, tag: '冰箱' });
    box(fx + .10, FL + 1.10, fz + .356, 1.02, 1.30, .006, col.film,
        { hard: true, mode: 18, alpha: .52, gloss: .78, tag: '冰箱' });
    box(fx - .52, FL + 1.16, fz + .362, .18, .34, .010, col.film,
        { hard: true, mode: 18, alpha: .30, gloss: .74, rz: .30 });
    for (const py of [1.34, .48])
      box(fx + .52, FL + py, fz + .372, .04, .34, .028, col.steel, { hard: true, gloss: .66, tag: '冰箱' });
    stop(fx - .68, fx + .68, fz - .38, fz + .38);
    shade(fx, fz, 1.40, .80, .38, FL + .008);
    xi(fx, FL + 1.62, fz + .368, 0, .20);
    // the one thing that has been used: a kettle and two mugs
    cyl(ux - .02, FL + .995, -1.60, .085, .21, C('#e8e4da'), { gloss: .40, tag: '热水壶' });
    box(ux - .10, FL + .995, -1.60, .05, .17, .05, C('#d0ccc2'), { hard: true, gloss: .35 });
    for (const s of [-1, 1])
      cyl(ux - .06 + s * .06, FL + .935, -1.90, .038, .085, s < 0 ? col.redL : C('#4d7fa4'),
          { gloss: .48, tag: '杯子' });
    // 电饭煲, still boxed, under the south window
    box(4.90, FL + .21, -4.62, .44, .42, .40, col.card, { hard: true, gloss: .07, ry: .10 });
    G(4.90, FL + .28, -4.41, 0, '电饭煲', { size: .050, gap: .010, color: C('#6b5637') });
    shade(4.90, -4.62, .52, .48, .30, FL + .008);
    box(ux - .18, FL + 1.42, -2.80, .12, .04, 1.30, C('#f4f0e2'), { hard: true, mode: 1, glow: .07 });
    light(ux - .70, FL + 1.50, -2.80, C('#f6efdc'), .42, 3.2);
    light(4.10, CY - .38, -2.60, C('#fff0cf'), .42, 3.6);
    glow(M.trs(ux - .70, Y + .020, -2.90, 0, 1.7, 1, 3.0), C('#e8e0c8'), .16);

    TH('冰箱', fx, Y + 1.30, fz + .40, '冰箱上的保护膜还没撕。',
       'The film on the fridge has not been peeled off.',
       '冰 ice + 箱 case. 保护膜 the protective film; 撕 sī is to tear it off.', fx + .70, -3.50, 2.2);
    TH('油烟机', ux - .20, Y + 1.60, -3.85, '油烟机是新的，还没开过。',
       'The extractor is new and has never been switched on.',
       '油 oil + 烟 smoke + 机 machine — the hood over every Chinese hob.', 4.70, -3.85, 2.0);
    TH('厨房', 4.30, Y + 1.30, -2.60, '厨房什么都新，什么都没用过。',
       'Everything in the kitchen is new, and nothing has been used.',
       '厨 kitchen + 房 room.', 4.30, -2.60, 2.6);
  })();

  // ==================================================================== 17. 餐厅 the dining room
  //
  // Two folding stools and the carton the table came in, which is what people actually eat off
  // for the first month.
  (function dining() {
    const tx = 4.80, tz = .40;
    box(tx, FL + .38, tz, .90, .76, .70, col.card, { hard: true, gloss: .07, ry: .06, tag: '桌子' });
    box(tx, FL + .765, tz, .92, .02, .72, col.cardD, { hard: true, gloss: .06, ry: .06 });
    G(tx, FL + .46, tz - .372, PI, '餐桌四人', { size: .048, gap: .010, color: C('#6b5637') });
    shade(tx, tz, 1.00, .80, .34, FL + .008);
    flat(tx, FL + .782, tz, .84, .64, C('#c8503f'), { mode: 7, gloss: .05 });
    for (const s of [-1, 1]) {
      cyl(tx + s * .20, FL + .812, tz + .04, .072, .045, col.porc, { gloss: .55, tag: '碗' });
      cyl(tx + s * .20, FL + .820, tz + .04, .038, .022, C('#e8e2d4'), { gloss: .50 });
      for (const k of [-1, 1])
        cap(tx + s * .20 + .13, FL + .800, tz + .04 + k * .010, .005, .22, .005, C('#d8c9a8'),
            { rz: PI / 2, ry: .1, gloss: .30, tag: '筷子' });
    }
    for (const [ox, oz, ry] of [[-.75, .12, .1], [.75, -.06, -.2]]) {
      box(tx + ox, FL + .42, tz + oz, .32, .04, .28, C('#8f6b42'), { hard: true, gloss: .18, ry, tag: '凳子' });
      for (const [sx, sz2] of [[-.12, -.10], [.12, -.10], [-.12, .10], [.12, .10]])
        cyl(tx + ox + sx, FL + .21, tz + oz + sz2, .013, .42, col.steelD, { gloss: .42 });
      shade(tx + ox, tz + oz, .40, .36, .28, FL + .008);
    }
    // a pot plant somebody was given, under the east window
    cyl(5.55, FL + .13, 1.15, .115, .26, C('#a86a44'), { gloss: .22, tag: '花' });
    cyl(5.55, FL + .265, 1.15, .105, .02, C('#4e3c26'), { gloss: .10 });
    for (let i = 0; i < 7; i++)
      cap(5.55 + Math.cos(i * .9) * .07, FL + .44 + (i % 3) * .07, 1.15 + Math.sin(i * .9) * .07,
          .022, .30, .022, i % 2 ? col.leaf : C('#3f6b3a'), { rz: (i - 3) * .16, ry: i, gloss: .12 });
    box(5.55, FL + .18, 1.035, .16, .09, .012, col.redL, { hard: true, gloss: .14 });
    G(5.55, FL + .18, 1.028, PI, '新婚快乐', { size: .026, gap: .005, color: col.gold });
    shade(5.55, 1.15, .34, .34, .30, FL + .008);
    cyl(tx, CY - .01, tz, .026, .04, col.white, { gloss: .2 });
    cyl(tx, CY - .27, tz, .0035, .52, C('#3a3a38'), { gloss: .3 });
    ball(tx, CY - .57, tz, .046, .062, .046, col.bulbW, { mode: 1, glow: .10 });
    light(tx, CY - .62, tz, C('#ffe3ae'), .46, 3.4);
    glow(M.trs(tx, Y + .020, tz, 0, 2.4, 1, 2.2), C('#e6d9b6'), .20);

    TH('桌子', tx, Y + .84, tz, '餐桌还没拆箱，先用箱子吃饭。',
       'The table is still boxed, so they eat off the box.',
       '桌子 table. 餐桌 is the one you eat at.', 3.90, tz, 1.9);
    TH('碗', tx - .20, Y + .86, tz + .04, '两个碗，两双筷子。', 'Two bowls, two pairs of chopsticks.',
       '碗 bowl. 双 shuāng is the measure word for a pair — and the 双 in 双喜.', 3.90, tz, 1.9);
  })();

  // ==================================================================== 18. 阳台 the balcony
  (function balcony() {
    const wx = -1.90, wz = -4.42;
    box(wx, FL + .42, wz, .62, .84, .60, C('#e4e0d6'), { hard: true, gloss: .38, tag: '洗衣机' });
    box(wx, FL + .855, wz, .64, .04, .62, C('#d6d2c8'), { hard: true, gloss: .34 });
    cyl(wx, FL + .46, wz + .308, .19, .022, C('#b6bcc0'), { rx: PI / 2, gloss: .55, tag: '洗衣机' });
    cyl(wx, FL + .46, wz + .318, .155, .012, C('#3d4a52'),
        { rx: PI / 2, gloss: .72, alpha: .6, mode: 18, tag: '洗衣机' });
    box(wx, FL + .76, wz + .312, .52, .12, .010, C('#ecead2'), { hard: true, gloss: .40 });
    box(wx, FL + .42, wz + .326, .58, .78, .005, col.film,
        { hard: true, mode: 18, alpha: .48, gloss: .78, tag: '洗衣机' });
    stop(wx - .34, wx + .34, wz - .34, wz + .34);
    shade(wx, wz, .74, .72, .36, FL + .008);
    // 晾衣架 — two rails on brackets, with two shirts on them and nothing else
    for (const s of [-1, 1])
      box(.60 + s * .62, Y + 2.26, -4.30, .05, .28, .05, col.steel, { hard: true, gloss: .55 });
    for (const dz of [-4.42, -4.20])
      cyl(.60, Y + 2.08, dz, .012, 1.30, col.steel, { rz: PI / 2, gloss: .60, tag: '晾衣架' });
    for (const [i, c] of [[0, C('#dfe4ea')], [1, C('#c9d4dc')]]) {
      box(.28 + i * .52, Y + 1.74, -4.42, .38, .60, .04, c, { mode: 7, gloss: .05, tag: '衣服' });
      box(.28 + i * .52, Y + 2.02, -4.42, .30, .06, .05, c, { mode: 7, gloss: .05 });
    }
    cyl(1.70, FL + .13, -4.55, .135, .26, C('#3f6f96'), { gloss: .28 });
    cyl(1.70, FL + .255, -4.55, .118, .012, C('#8d9aa0'), { gloss: .30 });
    cyl(1.44, FL + .68, -4.60, .014, 1.32, C('#9a7c4e'), { rz: .11, gloss: .18 });
    cap(1.30, FL + .10, -4.60, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    shade(1.58, -4.56, .62, .40, .30, FL + .010);
    // the air-conditioner on its bracket outside, seen through the glazing
    box(2.15, Y + 1.60, ZF - .42, .78, .54, .32, C('#c8c4b8'), { hard: true, gloss: .26 });
    for (let i = 0; i < 4; i++)
      box(2.15, Y + 1.42 + i * .12, ZF - .252, .68, .05, .012, C('#a8a498'), { hard: true, gloss: .20 });
    xi(1.10, Y + 1.50, ZF + .036, 0, .26);
    xi(-1.10, Y + 1.50, ZF + .036, 0, .26);
    light(.30, CY - .40, -4.20, C('#f4efe0'), .36, 3.2);

    TH('洗衣机', wx, Y + .80, wz + .36, '洗衣机上的膜还贴着。',
       'The film is still stuck to the washing machine.',
       '洗 wash + 衣 clothes + 机 machine. Laundry lives on the 阳台.', -1.15, -3.95, 1.9);
    TH('阳台', .60, Y + 1.40, -4.20, '阳台上只晾了两件衣服。',
       'Only two shirts hang on the balcony.',
       '阳 sun + 台 platform. Washing dries out here, not in a machine.', .60, -4.00, 2.4);
  })();

  // ==================================================================== 19. zones
  //
  // Ten rooms, then the landing, then one walkable rectangle over the whole deck, LAST.
  //
  // The order is load-bearing twice over. `roomAt` returns the FIRST zone that contains the body,
  // so the rooms have to come before the big one or every room up here would be lit by one bulb
  // hanging in the middle of the flat. And `clampMove` clamps the body into whichever of the zones
  // containing it needs the smallest move — so the big one, which always contains it, is what
  // makes this deck a single continuous walkable region.
  //
  // Per-room *walkable* zones do not work here, and the reason is worth writing down rather than
  // rediscovering: `clampMove` insets every zone by the 0.30 body radius before clamping, so a
  // body standing in a room 3.4 m wide can never reach that room's own edge, and therefore can
  // never cross into the next one. A flat tiled with per-room zones is a flat of sealed rooms.
  // Rooms for light; one rectangle for walking; the partitions above are what keep the body out
  // of the walls.
  const ZL = Y + H - .06;
  const RM = (id, hz, x0, x1, z0, z1, near) => {
    const q = A.zone({ id, x0, x1, z0, z1, near,
                       light: [(x0 + x1) / 2, Y + H - .22, (z0 + z1) / 2], ceil: ZL });
    q.hz = hz; HomeF9.ROOMS.push(q); return q;
  };
  RM('f9bed', '主卧', -6.00, -2.60, -1.40, 1.60, 3.4);
  RM('f9empty', '空房', -6.00, -2.60, -5.00, -1.40, 4.0);
  RM('f9store', '储藏室', -6.00, -4.00, 1.60, 3.20, 2.6);
  RM('f9bath', '卫生间', -4.00, -1.60, 1.60, 3.20, 2.8);
  RM('f9hall', '走道', -1.60, 3.20, 1.60, 3.20, 3.0);
  RM('f9entry', '玄关', 3.20, 6.00, 1.60, 3.20, 2.8);
  RM('f9living', '客厅', -2.60, 2.60, -3.40, 1.60, 4.4);
  RM('f9dining', '餐厅', 2.60, 6.00, -1.20, 1.60, 3.2);
  RM('f9kitchen', '厨房', 2.60, 6.00, -5.00, -1.20, 3.6);
  RM('f9balcony', '阳台', -2.60, 2.60, -5.00, -3.40, 2.8);
  // The landing, in three. It is twelve metres by three and it was one zone with one lamp position
  // at (0, 4.20) — the same complaint the rooms above answer for the flat, left unanswered for the
  // corridor. There are four bulkheads down that run and one of them is dead (section 6), so the
  // west end, the lift lobby and the east end by the stair are three genuinely different places at
  // night, and hanging all three off a point in the middle of the second one is what made the
  // landing read as evenly lit grey.
  //
  // Written directly rather than through `RM` because these are not rooms of the flat: `RM` also
  // pushes to `HomeF9.ROOMS`, which js/home-walls.js and the cutaway read as the flat's room plan,
  // and a corridor is not one of its rooms. Registered before the landing catch-all and long
  // before `f9all`, which is what `roomAt` falls through to.
  //
  // Each spans the landing's full depth ZM..ZN, so no internal boundary runs across the walking
  // line and the pairs overlap by 0.9 m or more — well clear of the 0.60 m dead band two merely
  // touching zones would leave.
  A.zone({ id: 'f9landW', x0: X0, x1: -0.40, z0: ZM, z1: ZN,
           light: [-4.40, CY - .30, LZ], ceil: ZL, near: 3.6 });
  A.zone({ id: 'f9landLift', x0: -1.30, x1: 3.40, z0: ZM, z1: ZN,
           light: [1.50, CY - .30, ZS + .45], ceil: ZL, near: 3.4 });
  A.zone({ id: 'f9landE', x0: 2.50, x1: X1, z0: ZM, z1: ZN,
           light: [4.70, CY - .30, LZ], ceil: ZL, near: 3.6 });
  A.zone({ id: 'f9', x0: X0, x1: X1, z0: ZM, z1: ZN,
           light: [0, Y + H - .30, 4.20], ceil: ZL, near: 4.2 });
  // The one that makes the deck walkable. Everything above is for light; this is for the body.
  A.zone({ id: 'f9all', x0: X0, x1: X1, z0: ZF, z1: ZN,
           light: [0, Y + H - .30, 0], ceil: ZL });
  // The room box `R.setRoom` measures its ambient term against. Without this the shell hands it
  // deck 2's 5.70 and every surface up here shades as though the ceiling were twenty metres below.
  A.deckH(Y + H);

  HomeF9.built = true;
  return HomeF9;
};

// ---------------------------------------------------------------------------------------------
// FOR WHOEVER OWNS js/world.js AND js/game.js — two things this file cannot fix from out here.
//
// 1. THE SHELL BUILDS NOTHING ABOVE DECK 2, so the landing doors do not move up here.
//    `buildShell` lays deck 0 and deck 2 by hand and `buildShafts` loops `for (const f of [0, 2])`.
//    Every floor builder is therefore laying its own slab, ceiling, perimeter, shaft cladding,
//    landing and call panel — twelve times, differently. More to the point, `leaves` and
//    `doorStops` are pushed only inside `landing(f, ...)` for f in [0, 2] and both arrays are
//    private to js/world.js, so no floor builder can register a leaf that slides with `landingK`.
//
//    This file therefore builds the opening open, and the car's own leaves are the doors you see
//    slide. In play that is always right: the only way onto deck 9 is to ride here, and
//    `callLift()` with the car already at your floor only re-opens it, so the car cannot leave
//    without you. It is wrong in a screenshot taken with the car parked elsewhere, and it will be
//    wrong the moment anything can send the car away from an occupied deck.
//
//    The fix is to run that loop over `decks()` rather than `[0, 2]`. Everything section 5 builds
//    stands 12 mm proud of the shaft plane so the two do not z-fight in the meantime, and the
//    whole of section 5 comes out on the same day.
//
// 2. THE CROSS-DECK LAMP PROBLEM IS ALREADY FIXED, and this is a note not to un-fix it. Twelve
//    decks stand in the same x and z, so ranking `scene.lights` by ground-plane distance alone put
//    a lamp on deck 2 exactly as near as one on deck 9 and filled all eight shader slots with
//    lamps on floors you cannot see. js/game.js now narrows the list to the current deck with
//    `drawDeck` before it ranks (the frame loop, beside `R.setLights`). Every lamp this file makes
//    sits between `A.y0` and `A.y0 + 2.60` so that filter finds them.
//
//    This floor is nevertheless built so that it still reads if it ever loses that contest: the
//    room lamp `roomAt` hands to `R.setBulb` is per-zone and per-deck and is always right, and the
//    bulbs, the window panes, the skyline and the light pools are emissive or decals rather than
//    lit surfaces.
//
// ---------------------------------------------------------------------------------------------
// TICKETS FOR js/game.js (USE_AT.home) AND js/vocab.js — see the report.
