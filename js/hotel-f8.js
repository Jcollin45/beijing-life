// 🏨 京华大酒店 · Floor 8 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   deluxe guestrooms and a corner room
//
// ---------------------------------------------------------------------------------------------
// WHY THIS FILE EXISTS
//
// The fit-out modules furnished all thirteen levels and furnished them well. What nobody built
// was the building. Measured with the scene's own `clampMove` at the real 0.30 m body radius,
// every authored level is ONE connected walkable region of roughly 950 m² — a 44 m x 30 m hall
// with furniture standing in it. There are no room walls, no doorways and no corridors anywhere
// in the hotel.
//
// On some floors the plan already exists, but only as camera metadata. js/hotel.js:637 registers
// `hotel5-room501`, `hotel5-room502`, `hotel5-room503`, `hotel5-bath503`, `hotel5-linen`,
// `hotel5-guest-corridor` and `hotel5-lift-landing` with exact rectangles, and says outright that
// they "do not alter walking/collision zones". hotel-f6/f7/f9.js call `cameraRoom(...)` the same
// way. So the camera believes in rooms the player walks straight through.
//
// Your job is to make the plan real: partitions, door openings, reveals, jambs, thresholds and
// the collision that makes them mean something — and to leave the floor legible, not mazy.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   scene key   hotel8
//   shell       RX 22, RZ 15, H 4.35  (the plate is 44 m x 30 m x 4.35 m — A.RX / A.RZ / A.H)
//   lift bank   x 18.15, cars at z -7.20 / -3.70 / -0.20, service car z 5.10
//   landing     [16.15, -3.70]        — where the player arrives from the lift
//   stairs      x -18.0, z -7.1, landing [-16.0, -7.1]
//   spawn       [15.6, -3.70] facing -x   (on floor 1 it is the entrance, [0, -12.55])
//   route       A.route — passenger / service / stair anchors and the guest spine
//
// **Every one of those has to stay reachable.** The lift landing, the stair landing and the guest
// spine are the floor's skeleton; a partition that seals any of them off strands the player on a
// level they cannot leave.
//
// ---------------------------------------------------------------------------------------------
// THE TOOLKIT
//
// Your builder is called with `A`, and it is the same `A` the fit-out module got:
//
//   geometry    A.box A.cyl A.ball A.capsule A.taper A.flat A.glyphs A.shade A.glow A.thing
//   collision   A.solid(x0, x1, z0, z1)  — THE ONLY THING THAT STOPS A BODY. Note it takes
//               EXTENTS, not centre+size, and it is a 2D footprint: no height, no rotation.
//   camera      A.blocker(x0, x1, z0, z1, top)  — stops the CAMERA sliding through a mass.
//               Not collision. Every surface is single-sided, so without it the eye sees
//               straight through your wall from the far side.
//   colour      A.col (wall wallD ceiling stone stoneL dark accent bronze bronzeD bronzeL walnut
//               walnutL lacquer celadon jade ink glass glassD warm white steel red green water
//               carpet), A.C('#rrggbb') for anything else
//   shell       A.RX A.RZ A.H A.floor A.meta A.levels A.departments A.core A.route
//   motion      A.onTick(fn)  — scene-local, dispatched once a frame. Do not start your own timer.
//   light       A.light(...)  A.luminous(p, day, night)  — night dimming is handled for you
//   camera      A.cameraRoom(id, x0, x1, z0, z1, near) — register the room you just BUILT, so the
//               chase camera stops clipping through it. Nested rooms register BEFORE the room
//               that contains them, so the smallest authored volume wins.
//
// THE COLLISION TRAP — read this twice, it is the one that wastes a whole run.
//
// `hard:true` does NOT make a collider. build.js:48 uses it only to pick the sharp-edged
// 'box' mesh instead of the rounded 'softBox' — it is a silhouette flag for architectural
// trim, and nothing in clampMove has ever looked at it. A partition built with box(...,
// {hard:true}) alone is a wall you walk straight through: exactly the defect you are here
// to fix, rebuilt by hand.
//
// There is no `wall` primitive. A partition is TWO calls, and you need both:
//
//     A.box(cx, cy, cz, w, h, d, colour, { hard: true });   // what you SEE (centre + size)
//     A.solid(x0, x1, z0, z1);                              // what STOPS you (extents!)
//
// Mind the argument shapes — box takes a centre and a size, solid takes a min/max footprint.
// Mixing them up puts the collider somewhere the wall is not, and the flood fill will show it
// as a blockage in open floor with a walk-through wall beside it.
//
// A DOORWAY IS NOT A GAP IN THE GEOMETRY. `solid` has no height and no opening, so the way to
// make a door is to split the run into two solids with clear space between them, and hang the
// head/lintel above as geometry with no solid of its own:
//
//     A.solid(-8.00, -2.55, 4.90, 5.10);   // wall, west of the door
//     A.solid(-1.45,  6.00, 4.90, 5.10);   // wall, east of the door   -> a 1.10 m opening
//
// Give the wall real thickness (0.12–0.20 m reads right), a head over each opening, and a
// jamb/reveal so it is not a card standing on the floor. Add A.blocker(...) on the same
// footprint so the chase camera cannot slide through it, and A.cameraRoom(...) for the room
// you have just enclosed.
//
// ---------------------------------------------------------------------------------------------
// THE ONE RULE THAT MATTERS: NEVER PLACE A WALL OR A DOOR BY EYE
//
// `clampMove` inflates every collider by the 0.30 m body radius, so a doorway needs about 0.60 m
// of clear run before a body fits through it at all, and appreciably more before it feels like a
// door rather than a squeeze. A 0.90–1.10 m clear opening is the number to aim for.
//
// The proof is a flood fill, never a coordinate. Run this before you build and after every wall
// you add:
//
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel8 -22 22 -15 15 15.6 -3.7
//
// It floods from the lift landing and prints an ASCII map: `.` reachable, `o` standable but
// WALLED OFF, `#` blocked. Two failure modes, both of which pass a screenshot:
//
//   * any `o` cell  — floor the player can see and can never stand on. Always a bug.
//   * a room that is all `#` — you built a solid block, not a room. Also always a bug.
//
// A finished floor is several `.` regions joined by door-width necks, all still reachable from
// the lift landing at [15.6, -3.70], with zero `o`.
//
// ---------------------------------------------------------------------------------------------
// FRAME RATE — you have room, and you should spend it
//
// Measured on the real GPU at quality 高: this floor renders in roughly 4.5–5.5 ms median and
// 8–10 ms at p95, against a 16.7 ms budget for 60 fps, at about 80 draw calls. That is six to
// eight milliseconds of genuine headroom, and partitions BUY frame time back by occluding what is
// behind them. Build the architecture properly.
//
// Spend it well anyway. Props batch by mesh + mode + round + bevel + textures; **colour, gloss,
// alpha and glow travel per instance and are free**, so fifty differently-coloured boxes of the
// same size are one draw call. Anything with `alpha < 0.999` does **not** batch and costs a draw
// call each — glazing, water and anything see-through is the expensive category, so a screen wall
// of forty translucent panes is forty calls. Keep this floor under about 2,600 props.
//
// **Do NOT run `node .fpscheck.js`.** It takes the whole GPU exclusively and there are thirteen
// of you; a timing run beside twelve other renders is not a slow reading, it is a meaningless
// one. The frame-rate gate is run centrally at the end. `node .audit.js <shot>` is fine.
//
// ---------------------------------------------------------------------------------------------
// HOUSE RULES
//
//   * **No real brand names or logos, ever.** Invented Chinese names only, everywhere, including
//     art, signage and packaging. The hotel is 京华大酒店 and that is the only fixed name.
//   * Signs are bilingual where a real luxury hotel would be; Chinese stays primary. Call
//     `Glyphs.need('...')` for any character you write, or it renders blank.
//   * Do not edit js/hotel.js, js/hotel-lift.js, js/game.js, js/gl.js, index.html, or any other
//     floor's module. If you need something the shell does not give you, report it — do not reach.
//   * `node --check js/hotel-f8.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------
// THE PLAN THIS MODULE BUILDS
//
// Floor 5's plan (js/hotel.js:637) is the house pattern: corridor down the middle band, rooms
// along the -z side, service on the +z side, lift landing east.  8F is the deluxe plate, so it is
// the same diagram with fewer and larger rooms, a wet room in every one of them, and both real
// building corners spent on guests rather than on back-of-house:
//
//   -z side   801 (existing fit) + 景观浴室 801 · 802 (existing fit) + 浴室 802 ·
//             803 + 浴室 803 · 805 SE corner room + 浴室 805
//   middle    guest gallery between the two existing partitions, west view lounge, west lobby
//             onto the fire stair, east gallery onto the lift landing
//   +z side   807 NW corner room + 浴室 807 · 808 (existing fit) + 浴室 808 ·
//             服务工作间 (wraps the existing pantry) · north view gallery
//   back      the 2.5 m slot behind the lift core is sealed as riser mass; it was walkable
//
// Everything the fit-out module already placed (js/hotel-guests.js, which this file must not
// edit) is treated as fixed: every partition below was moved to clear it, and the two walls that
// module already built at z=-5.12 and z=5.05 are extended and capped rather than replaced.
// ---------------------------------------------------------------------------------------------

const Hotel8Fit = Object.freeze({ floor: 'hotel8', api: 1 });

(() => {
  try {
    Glyphs.need(
      '八楼豪华客房转角景观房套房西厅观景廊客房工作间布草间备品间景观浴室浴室淋浴' +
      '衣帽间行李台书桌窗边榻贵妃榻茶台落地窗城市天际线安全楼梯客梯服务梯电梯厅' +
      '东廊北廊西廊请勿打扰整理房间毛巾浴袍拖鞋洗漱台马桶花洒浴缸镜台衣柜保险箱' +
      '迷你吧行政客房夜灯阅读灯京华八层楼层平面转角景观台墨竹图远山图银杏图' +
      'DELUXEROOMCRNSUITEBATHLINENHOUSEKEPINGALRYWSTLOUNGE'
    );
  } catch (_) {}

  const TAU = Math.PI * 2;

  HotelFit.register('hotel8', A => {
    const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
    const { C, col, RX, RZ, H } = A;
    const { light, luminous, onTick, cameraRoom } = A;

    // Deluxe palette. Warmer and heavier than 5F's residential range: more walnut, more stone,
    // celadon and lacquer used as accents only.
    const c = {
      plaster: C('#e3dbcd'), plasterL: C('#efe8db'), limestone: C('#d6ccbb'),
      limestoneL: C('#eae1d1'), limestoneD: C('#b9ac99'),
      walnut: C('#49352c'), walnutL: C('#75543f'), walnutD: C('#2e2522'),
      bronze: C('#9b7442'), bronzeL: C('#c9a566'), bronzeD: C('#5a432d'),
      celadon: C('#8ca99a'), celadonL: C('#c1d0c5'), jade: C('#48705f'),
      lacquer: C('#8d302a'), ink: C('#25282a'), inkL: C('#4c5354'),
      silk: C('#ac9179'), silkL: C('#ddcfba'), silkD: C('#7d6752'),
      carpet: C('#594b45'), carpetL: C('#7d6a60'), rug: C('#6d5750'),
      glass: C('#8faab3'), glassD: C('#24343c'), water: C('#4b8790'),
      white: C('#f5efe4'), warm: C('#ffe3a8'), steel: C('#8b9092'),
      towel: C('#eee9df'), green: C('#52715d'), paper: C('#efe6d5'),
      city: C('#33434e'), cityL: C('#6a808b'), night: C('#101a23'),
      blue: C('#385e79'), tea: C('#7a542d'), rose: C('#a4655c'),
    };

    // The tower's material kit, numerically identical to the copies in js/hotel-f1.js and
    // js/hotel-public.js. build.js:329-331 keys batches on (mat, matScale, matAmt, nrmAmt), so
    // matching tuples let these partitions batch with the fit-out instead of doubling the calls.
    // Every name is already in EAGER_MATERIALS (js/assets.js:187): no added boot cost.
    // The `mode` values here are kept as they were — mode 14 and 6 are the procedural render and
    // wood shaders, and the triplanar map layers on top of them rather than replacing them.
    const MAT = {
      stone:  { mat: 'plaster',  matScale: 2.30, matAmt: .16, nrmAmt: .62 },
      timber: { mat: 'wood',     matScale: .95,  matAmt: .26, nrmAmt: .34 },
      cloth:  { mat: 'fabric',   matScale: .52,  matAmt: .26, nrmAmt: .46 },
      paving: { mat: 'concrete', matScale: 1.85, matAmt: .17, nrmAmt: .30 },
    };

    // Cutaway grouping. js/game.js:1981 judges a prop by the CENTRE of its whole tag group, so a
    // tag shared by props metres apart is decided by a point none of them occupies — the fault
    // js/build.js:258 documents, where 124 partitions all tagged 墙 hid and showed as one from a
    // point in the middle of the floor plate. Every helper below mints its own tag per call, so a
    // group is one wall plus its skirting, or one bed plus its pillows, judged where it stands.
    // js/home-walls.js:184 is the same pattern.
    let tagN = 0;
    const uid = base => base + (++tagN);

    // The shell hangs its ceiling slab at H-.13 with a .26 depth, so the soffit is at H-.26.
    // Partitions run the full height to it; anything shorter reads as a screen, not a wall.
    const SOFFIT = H - .26;                     // 4.09
    // The fit-out module's own two partitions stop at 3.16.  They are not this file's to edit,
    // so a plaster bulkhead is built over them instead and every wall on the floor lines through.
    const FITWALL_TOP = 3.16;

    // ======================================================================= building elements
    //
    // Every partition is authored as EXTENTS, and the same four numbers drive the visible box,
    // the collider and the camera blocker.  They cannot drift apart.

    function partition(x0, x1, z0, z1, o = {}) {
      const w = x1 - x0, d = z1 - z0;
      if (w <= 0 || d <= 0) return;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const y0 = o.y0 || 0, y1 = o.y1 === undefined ? SOFFIT : o.y1;
      const tag = o.tag || uid('八楼隔墙');
      const nsWall = w < d;                     // thin in x -> the wall runs north/south
      box(cx, (y0 + y1) / 2, cz, w, y1 - y0, d, o.color || c.plaster,
        { ...MAT.stone, hard: true, mode: 14, gloss: .11, tag });
      if (o.trim !== false) {
        // Walnut skirting on both faces. Without it a partition is a card standing on the floor.
        for (const s of [-1, 1]) {
          const ox = nsWall ? s * (w / 2 + .016) : 0, oz = nsWall ? 0 : s * (d / 2 + .016);
          box(cx + ox, .115, cz + oz, nsWall ? .032 : w - .01, .23, nsWall ? d - .01 : .032,
            o.base || c.walnutD, { ...MAT.timber, hard: true, mode: 6, gloss: .28, tag });
        }
      }
      if (o.solid !== false) solid(x0, x1, z0, z1);
      blocker(x0 - .02, x1 + .02, z0 - .02, z1 + .02, o.top === undefined ? y1 + .10 : o.top);
    }

    // A plaster head over a run of wall that somebody else built short. Geometry only: the
    // fit-out module already owns the collider underneath it.
    function bulkhead(x0, x1, z0, z1, tag = uid('八楼过梁')) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      box(cx, (FITWALL_TOP + SOFFIT) / 2, cz, x1 - x0, SOFFIT - FITWALL_TOP, z1 - z0,
        c.plaster, { ...MAT.stone, hard: true, mode: 14, gloss: .11, tag });
      const nsWall = (x1 - x0) < (z1 - z0);
      for (const s of [-1, 1]) {
        const ox = nsWall ? s * ((x1 - x0) / 2 + .015) : 0;
        const oz = nsWall ? 0 : s * ((z1 - z0) / 2 + .015);
        box(cx + ox, FITWALL_TOP + .05, cz + oz, nsWall ? .030 : x1 - x0 - .01, .07,
          nsWall ? z1 - z0 - .01 : .030, c.bronzeD, { hard: true, gloss: .56, tag });
      }
      blocker(x0 - .02, x1 + .02, z0 - .02, z1 + .02, SOFFIT + .10);
    }

    // The clear opening between two solids. Takes the OPENING footprint — the same numbers that
    // are missing from the solid runs either side — and hangs jambs, reveals, a head and a
    // threshold on it. Never registers a collider of its own.
    function doorway(x0, x1, z0, z1, o = {}) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const w = x1 - x0, d = z1 - z0;
      const nsWall = w < d;                     // opening cut through a north/south wall
      const thick = nsWall ? w : d;             // the wall's own thickness
      const clear = nsWall ? d : w;             // the clear opening
      const tag = uid(o.tag || '门洞');
      const head = o.head === undefined ? 2.46 : o.head;
      // Jambs, each with a bronze bead down the reveal.
      for (const s of [-1, 1]) {
        const jx = nsWall ? cx : cx + s * (clear / 2 + .07);
        const jz = nsWall ? cz + s * (clear / 2 + .07) : cz;
        box(jx, head / 2, jz, nsWall ? thick + .07 : .14, head, nsWall ? .14 : thick + .07,
          c.walnutD, { ...MAT.timber, hard: true, mode: 6, gloss: .33, tag });
        const bx = nsWall ? cx : cx + s * (clear / 2 + .015);
        const bz = nsWall ? cz + s * (clear / 2 + .015) : cz;
        cyl(bx, head / 2 - .06, bz, .011, head - .22, c.bronzeL, { gloss: .68, tag });
      }
      // Head, then a plaster transom carrying the wall up to the soffit.
      box(cx, head + .10, cz, nsWall ? thick + .07 : clear + .28, .20,
        nsWall ? clear + .28 : thick + .07, c.walnutD, { ...MAT.timber, hard: true, mode: 6, gloss: .33, tag });
      box(cx, (head + .20 + SOFFIT) / 2, cz, nsWall ? thick : clear + .28,
        SOFFIT - head - .20, nsWall ? clear + .28 : thick, c.plaster,
        { ...MAT.stone, hard: true, mode: 14, gloss: .11, tag });
      // Bronze threshold across the opening, and a low reveal light in the head.
      box(cx, .020, cz, nsWall ? thick + .10 : clear, .040, nsWall ? clear : thick + .10,
        c.bronzeD, { hard: true, gloss: .64, tag });
      if (o.lit !== false)
        luminous(box(cx, head + .015, cz, nsWall ? thick - .05 : clear - .30, .028,
          nsWall ? clear - .30 : thick - .05, c.warm, { hard: true, mode: 1, tag }), .030, .16);
      return { cx, cz, nsWall, clear, head };
    }

    // Guest door: the leaf, its handle and the numbered plaque beside the jamb. `face` is the
    // side the plaque and the leaf's front live on (-1 toward -x/-z, +1 the other way).
    function guestDoor(x0, x1, z0, z1, number, label, face = -1) {
      const tag = uid('客房' + number);
      const g = doorway(x0, x1, z0, z1, { tag, head: 2.46 });
      const { cx, cz, nsWall, clear } = g;
      const off = (v) => nsWall ? [cx + v, cz] : [cx, cz + v];
      const leafW = clear - .06;
      const [lx, lz] = off(face * .045);
      const leaf = box(lx, 1.22, lz, nsWall ? .07 : leafW, 2.40, nsWall ? leafW : .07,
        c.walnut, { ...MAT.timber, hard: true, mode: 6, gloss: .35, tag });
      const [fx, fz] = off(face * .085);
      box(fx, 1.24, fz, nsWall ? .022 : leafW - .18, 2.16, nsWall ? leafW - .18 : .022,
        c.walnutD, { hard: true, gloss: .30, tag });
      for (const q of [[.86, .74, c.silkL], [1.86, .92, c.celadon]]) {
        const [px, pz] = off(face * .10);
        box(px, q[0], pz, nsWall ? .020 : leafW - .34, q[1], nsWall ? leafW - .34 : .020,
          q[2], { ...MAT.cloth, mode: 7, gloss: .045, tag });
      }
      // Handle set: back plate, lever and a bronze escutcheon, all on the pull side.
      const hu = clear / 2 - .20;
      const [hx, hz] = nsWall ? [cx + face * .115, cz + hu] : [cx + hu, cz + face * .115];
      box(hx, 1.06, hz, nsWall ? .028 : .085, .30, nsWall ? .085 : .028, c.bronzeD,
        { hard: true, gloss: .62, tag });
      capsule(hx + (nsWall ? face * .045 : 0), 1.06, hz + (nsWall ? 0 : face * .045),
        .022, .17, .022, c.bronzeL, nsWall ? { rz: Math.PI / 2, ry: Math.PI / 2, gloss: .72, tag }
          : { rz: Math.PI / 2, gloss: .72, tag });
      // Number plaque with an inset celadon ground, mounted on the corridor face of the jamb.
      const pu = clear / 2 + .21;
      const [ax, az] = nsWall ? [cx + face * (.055 + .04), cz + pu] : [cx + pu, cz + face * (.055 + .04)];
      const yaw = nsWall ? (face < 0 ? -Math.PI / 2 : Math.PI / 2) : (face < 0 ? Math.PI : 0);
      box(ax, 1.62, az, nsWall ? .030 : .46, .62, nsWall ? .46 : .030, c.walnutD,
        { ...MAT.timber, hard: true, mode: 6, gloss: .34, tag });
      luminous(box(ax + (nsWall ? face * .020 : 0), 1.62, az + (nsWall ? 0 : face * .020),
        nsWall ? .014 : .36, .50, nsWall ? .36 : .014, c.celadon,
        { hard: true, mode: 1, gloss: .12, tag }), .020, .10);
      const [gx, gz] = nsWall ? [ax + face * .034, az] : [ax, az + face * .034];
      glyphs(gx, 1.74, gz, yaw, number, { size: .15, gap: .026, color: c.white, mode: 1,
        glow: .05, lift: .008, tag });
      if (label) glyphs(gx, 1.47, gz, yaw, label,
        { size: .088, gap: .018, color: c.bronzeL, mode: 1, lift: .008, tag });
      // Slow sliding leaf: the guest doors the fit-out module built behave the same way.
      // Its cull sphere is pinned to the opening, because js/build.js:248 measures a prop's
      // bounds once from the matrix it was built with — a leaf that then slides most of a metre
      // would be dropped by the draw loop while still on screen.
      leaf.fixed = true; leaf.cx = cx; leaf.cy = 1.22; leaf.cz = cz; leaf.r = 3.2;
      const m0 = leaf.m, travel = clear * .84;
      onTick((t, body, mins, dt) => {
        const bx = body && Number.isFinite(body.x) ? body.x : 99;
        const bz = body && Number.isFinite(body.z) ? body.z : 99;
        const near = Math.hypot(bx - cx, bz - cz) < 2.1 ? 1 : 0;
        leaf._o = (leaf._o || 0) + (near - (leaf._o || 0)) * (1 - Math.exp(-dt * (near ? 6 : 3.4)));
        leaf.m = M.mul(M.trans(nsWall ? 0 : travel * leaf._o, 0, nsWall ? travel * leaf._o : 0), m0);
      });
      return leaf;
    }

    // A signed opening with no leaf: service rooms, galleries and the wet rooms.
    //
    // build.js writes a glyph on a quad rotated by rotY(yaw), so its readable face points along
    // (sin yaw, 0, cos yaw): yaw 0 reads from +z, PI from -z, PI/2 from +x, -PI/2 from -x. Every
    // offset below is taken along that same vector, so the text can never end up inside its board.
    function roomPlate(x, y, z, yaw, hz, en, w = 1.05, accent = c.bronzeD) {
      const nx = Math.sin(yaw), nz = Math.cos(yaw), tag = uid(hz);
      const flat2 = Math.abs(nx) > .5;
      box(x, y, z, flat2 ? .05 : w, .40, flat2 ? w : .05, c.walnutD,
        { ...MAT.timber, hard: true, mode: 6, gloss: .33, tag });
      luminous(box(x + nx * .024, y, z + nz * .024, flat2 ? .016 : w - .12, .30,
        flat2 ? w - .12 : .016, accent,
        { hard: true, mode: 1, gloss: .14, tag }), .018, .09);
      glyphs(x + nx * .034, y + .07, z + nz * .034, yaw, hz,
        { size: Math.min(.135, (w - .18) / Math.max(2, [...hz].length)), gap: .022,
          color: c.white, mode: 1, glow: .04, lift: .008, tag });
      if (en) glyphs(x + nx * .034, y - .11, z + nz * .034, yaw, en,
        { size: Math.min(.058, (w - .16) / Math.max(2, en.length)), gap: .011,
          color: c.bronzeL, mode: 1, lift: .008, tag });
    }

    // A window onto the city. `yaw` faces the occupied side: 0 looks out toward -z, PI toward
    // +z, ±PI/2 along x. Bronze frame, deep stone reveal, painted skyline, mullions and a sill.
    //
    // `P(u, v)` is a point u metres along the glazing plane and v metres INTO the room;
    // `S(a, b)` is a size a metres along the plane and b metres across it. Every piece below is
    // written in those two, so one helper serves all four facades without a second code path.
    function view(x, z, w, yaw = 0, o = {}) {
      const tag = o.tag || uid('落地窗');
      const h = o.h === undefined ? 2.62 : o.h;
      const y = o.y === undefined ? 1.72 : o.y;
      // `yaw` points INTO the room, the same convention js/hotel-guests.js uses for its own
      // skyline panels: 0 means the room is at +z, PI at -z, PI/2 at -x, -PI/2 at +x.
      const ns = Math.abs(Math.sin(yaw)) > .5;                 // glazing plane runs along z
      const ix = ns ? -Math.sign(Math.sin(yaw)) : 0;
      const iz = ns ? 0 : (Math.abs(yaw) < .1 ? 1 : -1);
      const P = (u, v) => ns ? [x + ix * v, z + u] : [x + u, z + iz * v];
      const S = (a, b) => ns ? [b, a] : [a, b];
      const put = (u, v, yy, a, b, hh, color, opt) => {
        const p = P(u, v), s = S(a, b);
        return box(p[0], yy, p[1], s[0], hh, s[1], color, opt);
      };
      // Stone reveal: jambs, head and a sill returning into the room. The whole assembly stays
      // inside 0.33 m of the glazing plane, because the body can stand 0.30 m from the shell.
      for (const s of [-1, 1])
        put(s * (w / 2 + .10), .15, y, .20, .32, h + .34, c.limestone,
          { hard: true, gloss: .19, tag });
      put(0, .15, y + h / 2 + .19, w + .40, .32, .30, c.limestone, { hard: true, gloss: .19, tag });
      put(0, .16, y - h / 2 - .09, w + .40, .34, .15, c.limestoneL,
        {...MAT.stone, hard: true, mode: 7, gloss: .25, tag });
      // Glazing plane: dark frame, then the painted panorama on the room side.
      put(0, 0, y, w, .10, h, c.bronzeD, { hard: true, gloss: .52, tag });
      luminous(put(0, .07, y, w - .14, .026, h - .14, o.warm === false ? c.glassD : c.city,
        { hard: true, mode: 1, gloss: .80, tag }),
        o.warm === false ? .012 : .034, o.warm === false ? .09 : .20);
      const base = y - h / 2 + .10;
      const n = Math.max(4, Math.floor(w / 1.55));
      for (let i = 0; i < n; i++) {
        const bw = w / n * .68, bh = .32 + ((i * 13 + 5) % 9) * .14;
        const u = -w * .46 + (i + .45) * w / n;
        put(u, .10, base + bh * .5, bw, .018, bh, i % 4 === 0 ? c.cityL : c.night,
          { hard: true, mode: 1, glow: i % 5 === 0 ? .07 : .012, tag });
        if (i % 3 === 1)
          put(u, .115, base + bh * .66, bw * .22, .014, .055, c.warm,
            { hard: true, mode: 1, glow: .20, tag });
      }
      const mul = Math.max(2, Math.floor(w / 3.4));
      for (let i = 0; i <= mul; i++) {
        const p = P(-w * .45 + i * w * .90 / mul, .13);
        cyl(p[0], y, p[1], .012, h - .26, c.bronzeL, { gloss: .68, tag });
      }
    }

    // ======================================================================= THE PLAN
    //
    // Solid extents first, then the geometry hung on exactly the same numbers.
    // Existing colliders this has to live with, all owned by other files:
    //   wall A  z -5.21..-5.04   x -13.40..-8.20 and -6.80..9.00   (js/hotel-guests.js)
    //   wall B  z  4.97.. 5.13   x -13.90..-10.20 and -8.80..3.10  (js/hotel-guests.js)
    //   stair vestibule  x -21.94..-17.84  z -8.86..-5.34          (js/hotel.js)
    //   lift bank        x  17.70.. 18.81  z -10.00..2.62          (js/hotel.js)
    //   service car      x  17.87.. 18.55  z   3.55..6.65          (js/hotel.js)
    //   floor directory  x  13.15.. 13.95  z   9.47..11.63         (js/hotel.js)

    // ------------------------------------------------------------------ south band: 801 + bath
    // 801's west wall lands exactly on wall A's west end so the two runs close without a slot.
    partition(-13.60, -13.40, -14.40, -5.04);
    // The wet room's east wall swallows the existing shower panel and bench: they were already
    // built as a wall-mounted assembly at x -7.82, and now they have a wall to be mounted on.
    partition(-7.95, -7.75, -14.40, -7.45);
    partition(-7.95, -7.75, -6.35, -5.04);
    // The double vanity's mirror and towel rail were hanging 0.46 m clear of wall A. A tiled
    // lining brings the wall out to meet them; its east end forms the door's west reveal pier.
    partition(-13.60, -7.95, -5.67, -5.04, { color: c.limestone });
    bulkhead(-13.60, 9.44, -5.24, -5.04, '八楼过梁南');       // cap the fit-out module's 3.16 m wall A

    // ------------------------------------------------------------------ south band: 802 + bath
    partition(0.35, 0.55, -14.40, -5.04);
    partition(3.00, 3.20, -14.40, -11.10);
    partition(0.35, 1.60, -11.30, -11.10);
    partition(2.70, 3.20, -11.30, -11.10);
    // 802 is sealed from the gallery by wall A, which this file cannot cut, so the room is
    // entered from the east cross-gallery instead — the deluxe wing's own approach.
    partition(9.24, 9.44, -14.40, -7.55);
    partition(9.24, 9.44, -6.45, -5.04);
    partition(9.00, 9.44, -5.24, -5.04, { trim: false });

    // ------------------------------------------------------------------ south band: 803 + bath
    partition(9.24, 9.60, -8.70, -8.50, { trim: false });
    partition(10.70, 14.50, -8.70, -8.50);
    partition(14.30, 14.50, -14.40, -8.50);
    partition(11.20, 11.40, -11.50, -10.60);
    partition(11.20, 11.40, -9.50, -8.70);
    partition(11.20, 14.50, -11.50, -11.30);

    // ----------------------------------------------------- south-east corner room 805 + bath
    partition(14.30, 15.30, -10.20, -10.00);
    partition(16.40, 21.45, -10.20, -10.00);
    partition(18.20, 18.40, -12.80, -11.40);
    partition(18.20, 21.45, -12.80, -12.60);

    // ------------------------------------------------------------------ back of the lift core
    // A 2.5 m slot behind the bank was walkable and showed the back of every single-sided
    // surface in it. It is the shaft and riser zone; seal it and face it in stone.
    partition(18.85, 21.45, -10.10, 7.30, { color: c.limestoneD, trim: false });
    partition(17.70, 18.90, 2.55, 3.62, { color: c.limestoneD, trim: false });

    // ---------------------------------------------------------------- west end: linen + lobby
    partition(-18.04, -17.84, -14.40, -10.40);
    partition(-18.04, -17.84, -9.30, -8.86);

    // ------------------------------------------------------------------ north band: 808 + bath
    partition(-14.05, -13.85, 4.97, 14.40);
    partition(3.10, 3.50, 4.97, 14.40);
    partition(-10.95, -10.75, 4.97, 5.75);
    partition(-10.95, -10.75, 6.85, 8.85);
    partition(-14.05, -10.75, 8.65, 8.85);
    bulkhead(-14.05, 3.50, 4.97, 5.13, '八楼过梁北');         // cap the fit-out module's 3.16 m wall B

    // ------------------------------------------------- north-west corner room 807 + bath
    partition(-21.45, -17.20, 4.95, 5.15);
    partition(-16.10, -13.85, 4.95, 5.15);
    partition(-18.30, -18.10, 4.95, 5.60);
    partition(-18.30, -18.10, 6.70, 8.70);
    partition(-21.45, -18.10, 8.50, 8.70);

    // ------------------------------------------------------------- north band: service room
    // Wrapped around the pantry the fit-out module already built; its 2.70 m back panel at
    // z 9.15..9.29 becomes the room's north wall, so only the wing pieces are drawn here.
    partition(6.39, 8.45, 5.35, 5.55);
    partition(9.55, 12.15, 5.35, 5.55);
    partition(6.39, 6.59, 5.35, 9.31);
    partition(11.95, 12.15, 5.35, 9.31);
    // The module's back panel is 3.05 m long, 0.14 thick and 2.70 tall with no collider. This
    // wall is 0.18 thick and full height, so that panel ends up wholly inside it: no coplanar
    // faces to z-fight, and the run finally stops a body.
    // Walnut, so the pantry keeps the warm back the fit-out module gave it rather than gaining a
    // white plaster one; the module's own panel is simply swallowed by it.
    partition(6.39, 12.15, 9.13, 9.31, { color: c.walnut, base: c.walnutD });

    // ======================================================================= doors and plates
    //
    // Each call takes the OPENING footprint — the gap the two solid runs either side left
    // behind — never the wall run itself. Guest doors get a leaf, a handle and a numbered
    // plaque; wet rooms and back-of-house get a signed opening with no leaf.
    guestDoor(9.24, 9.44, -7.55, -6.45, '802', 'DELUXE ROOM', 1);      // from the east gallery
    guestDoor(9.60, 10.70, -8.70, -8.50, '803', 'DELUXE ROOM', 1);
    guestDoor(15.30, 16.40, -10.20, -10.00, '805', 'CORNER SUITE', 1);
    guestDoor(-17.20, -16.10, 4.95, 5.15, '807', 'CORNER SUITE', -1);

    doorway(-7.95, -7.75, -7.45, -6.35, { tag: '景观浴室' });           // 801 wet room
    doorway(1.60, 2.70, -11.30, -11.10, { tag: '浴室' });               // 802 wet room
    doorway(11.20, 11.40, -10.60, -9.50, { tag: '浴室' });              // 803 wet room
    doorway(18.20, 18.40, -11.40, -10.20, { tag: '浴室' });             // 805 wet room
    doorway(-18.30, -18.10, 5.60, 6.70, { tag: '浴室' });               // 807 wet room
    doorway(-10.95, -10.75, 5.75, 6.85, { tag: '浴室' });               // 808 wet room
    doorway(-18.04, -17.84, -10.40, -9.30, { tag: '布草间' });          // linen store
    doorway(8.45, 9.55, 5.35, 5.55, { tag: '客房服务' });               // housekeeping

    roomPlate(-7.70, 1.62, -8.02, Math.PI / 2, '景观浴室', 'VIEW BATH', .92);
    roomPlate(1.15, 1.62, -11.02, 0, '浴室', 'BATHROOM', .78);
    roomPlate(11.16, 1.62, -9.15, -Math.PI / 2, '浴室', 'BATHROOM', .68);
    roomPlate(18.16, 1.62, -12.10, -Math.PI / 2, '浴室', 'BATHROOM', .68);
    roomPlate(-18.06, 1.62, 5.28, Math.PI / 2, '浴室', 'BATHROOM', .60);
    roomPlate(-10.71, 1.62, 7.60, Math.PI / 2, '浴室', 'BATHROOM', .70);
    roomPlate(-17.80, 1.66, -11.20, Math.PI / 2, '布草间', 'LINEN', 1.00);
    roomPlate(10.60, 1.66, 5.31, Math.PI, '客房服务', 'HOUSEKEEPING', 1.25);

    // ======================================================================= furniture kit
    //
    // `yaw` faces the way a piece is used — a chair's seat, a bed's foot, a window seat's view.
    // Local +u is across that direction, local +v is along it, matching js/hotel-guests.js.
    const at = (x, z, yaw, u, v) =>
      [x + Math.cos(yaw) * u + Math.sin(yaw) * v, z - Math.sin(yaw) * u + Math.cos(yaw) * v];

    function rugField(x, z, w, d, fill = c.rug, border = c.walnutD, tag = uid('地毯')) {
      flat(x, .017, z, w, d, border, {...MAT.cloth, mode: 7, gloss: .05, tag });
      flat(x, .022, z, w - .26, d - .26, fill, {...MAT.cloth, mode: 7, gloss: .035, tag });
    }

    function bed8(x, z, yaw, w = 1.90, accent = c.celadon, tag = uid('床')) {
      const L = 2.05;
      const P = (u, v) => at(x, z, yaw, u, v);
      const put = (u, v, yy, sw, hh, sl, color, opt = {}) => {
        const p = P(u, v);
        return box(p[0], yy, p[1], sw, hh, sl, color, { ry: yaw, ...opt, tag });
      };
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const p = P(su * w * .40, sv * (L / 2 - .18));
        cyl(p[0], .07, p[1], .085, .14, c.bronzeD, { gloss: .58, tag });
      }
      put(0, 0, .22, w, .36, L, c.walnutD, {...MAT.timber, mode: 7, gloss: .27 });
      put(0, 0, .43, w - .05, .18, L - .06, c.silk, {...MAT.cloth, mode: 7, gloss: .035 });
      put(0, 0, .60, w - .11, .28, L - .10, c.white, {...MAT.stone, mode: 7, gloss: .025 });
      put(0, .16, .73, w - .04, .22, L - .58, accent, {...MAT.cloth, mode: 7, gloss: .025 });
      // Rolled duvet edge and a folded runner give the foot a soft, intentional silhouette.
      const rp = P(0, L / 2 - .18);
      capsule(rp[0], .70, rp[1], .10, w - .10, .10,
        c.white, { rz: Math.PI / 2, ry: yaw, gloss: .025, tag });
      put(0, L / 2 - .40, .78, w - .06, .10, .34, c.silkL, {...MAT.cloth, mode: 7, gloss: .025 });
      // Headboard: walnut frame, bronze reveal, silk field and three padded panels.
      put(0, -L / 2 - .06, 1.30, w + .34, 1.72, .18, c.walnutD, {...MAT.timber, mode: 7, gloss: .31 });
      put(0, -L / 2 + .05, 1.30, w + .12, 1.49, .055, c.bronze, { hard: true, gloss: .66 });
      put(0, -L / 2 + .09, 1.30, w + .02, 1.39, .045, c.silk, {...MAT.cloth, mode: 7, gloss: .04 });
      for (const s of [-1, 0, 1]) {
        put(s * w * .285, -L / 2 + .12, 1.30, w * .27, 1.22, .035,
          s === 0 ? accent : c.silkL, {...MAT.cloth, mode: 7, gloss: .035 });
        if (s) {
          const q = P(s * w * .145, -L / 2 + .145);
          cyl(q[0], 1.30, q[1], .0125, 1.12, c.bronzeL, { gloss: .68, tag });
        }
      }
      for (const s of [-1, 1]) {
        put(s * w * .23, -L / 2 + .38, .87, w * .39, .22, .46, c.white, {...MAT.stone, mode: 7, gloss: .02 });
        put(s * w * .23, -L / 2 + .34, .91, w * .25, .10, .25,
          s < 0 ? c.celadonL : c.silkL, {...MAT.cloth, mode: 7, gloss: .02 });
      }
      const mp = P(0, -L / 2 + .155);
      box(mp[0], 1.92, mp[1], .30, .30, .032, c.bronzeL,
        { hard: true, rz: Math.PI / 4, ry: yaw, mode: 1, gloss: .68, tag });
      ball(mp[0], 1.92, mp[1] - .02, .105, .105, .026, accent, { mode: 1, gloss: .18, tag });
      shade(x, z, w + .30, L + .30, .30);
    }

    // Bedside cabinet with a reading light on it.
    function nightStand(x, z, yaw, tag = uid('床头柜')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      box(x, .30, z, .58, .52, .50, c.walnut, {...MAT.timber, ry: yaw, mode: 7, gloss: .31, tag });
      box(x, .585, z, .64, .06, .56, c.limestone, {...MAT.stone, ry: yaw, mode: 7, gloss: .23, tag });
      const f = P(0, -.26);
      box(f[0], .32, f[1], .46, .30, .025, c.walnutL, { hard: true, ry: yaw, gloss: .28, tag });
      capsule(f[0], .32, f[1] - .02, .022, .16, .022, c.bronzeL,
        { rz: Math.PI / 2, ry: yaw, gloss: .72, tag });
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const p = P(su * .24, sv * .20);
        taper(p[0], .05, p[1], .05, .11, .05, c.bronzeD, { gloss: .60, tag });
      }
      cyl(x, .68, z, .085, .16, c.bronzeD, { gloss: .62, tag });
      cyl(x, .92, z, .011, .42, c.bronze, { gloss: .68, tag });
      taper(x, 1.20, z, .17, .26, .17, c.silkL, {...MAT.cloth, mode: 7, gloss: .04, tag });
      luminous(ball(x, 1.14, z, .09, .10, .09, c.warm, { mode: 1, tag }), .05, .30);
      solid(x - .32, x + .32, z - .30, z + .30);
    }

    function wardrobe(x, z, yaw, w = 1.6, D = .62, tag = uid('衣柜')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      box(x, 1.15, z, Math.abs(Math.cos(yaw)) > .5 ? w : D, 2.30,
        Math.abs(Math.cos(yaw)) > .5 ? D : w, c.walnut, {...MAT.timber, ry: yaw, mode: 7, gloss: .32, tag });
      const f = P(0, D / 2 - .02);
      for (const s of [-1, 1]) {
        const p = at(f[0], f[1], yaw, s * w * .25, 0);
        box(p[0], 1.18, p[1], Math.abs(Math.cos(yaw)) > .5 ? w * .46 : .03, 2.06,
          Math.abs(Math.cos(yaw)) > .5 ? .03 : w * .46, c.walnutL,
          { hard: true, ry: yaw, gloss: .30, tag });
        const h = at(f[0], f[1], yaw, s * .07, .02);
        cyl(h[0], 1.18, h[1], .010, .84, c.bronzeL, { gloss: .70, tag });
      }
      box(x, 2.34, z, Math.abs(Math.cos(yaw)) > .5 ? w + .09 : D + .09, .09,
        Math.abs(Math.cos(yaw)) > .5 ? D + .09 : w + .09, c.walnutD,
        { hard: true, ry: yaw, gloss: .34, tag });
      box(x, .06, z, Math.abs(Math.cos(yaw)) > .5 ? w - .10 : D - .10, .12,
        Math.abs(Math.cos(yaw)) > .5 ? D - .10 : w - .10, c.bronzeD,
        { hard: true, ry: yaw, gloss: .56, tag });
      const hw = Math.abs(Math.cos(yaw)) > .5 ? w / 2 : D / 2;
      const hd = Math.abs(Math.cos(yaw)) > .5 ? D / 2 : w / 2;
      solid(x - hw, x + hw, z - hd, z + hd);
      shade(x, z, hw * 2 + .16, hd * 2 + .16, .24);
    }

    // Built-in window seat: cabinet base, upholstered squab, bolsters and a bronze rail.
    function windowSeat(x, z, yaw, w = 2.4, tag = uid('窗边榻')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const cw = Math.abs(Math.cos(yaw)) > .5 ? w : .96;
      const cd = Math.abs(Math.cos(yaw)) > .5 ? .96 : w;
      box(x, .06, z, cw - .16, .12, cd - .16, c.walnutD, {...MAT.timber, ry: yaw, mode: 7, gloss: .26, tag });
      box(x, .30, z, cw, .48, cd, c.walnut, {...MAT.timber, ry: yaw, mode: 7, gloss: .31, tag });
      const n = Math.max(2, Math.round(w / 1.05));
      for (let i = 0; i < n; i++) {
        const u = -w / 2 + (i + .5) * w / n;
        const p = P(u, -.44);
        box(p[0], .30, p[1], Math.abs(Math.cos(yaw)) > .5 ? w / n - .07 : .028, .34,
          Math.abs(Math.cos(yaw)) > .5 ? .028 : w / n - .07, c.walnutL,
          { hard: true, ry: yaw, gloss: .29, tag });
        const q = P(u, -.47);
        capsule(q[0], .30, q[1], .018, .17, .018, c.bronzeL,
          { rz: Math.PI / 2, ry: yaw, gloss: .70, tag });
      }
      box(x, .60, z, cw + .06, .14, cd + .06, c.silk, {...MAT.cloth, ry: yaw, mode: 7, gloss: .035, tag });
      box(x, .685, z, cw - .10, .04, cd - .10, c.silkL, {...MAT.cloth, ry: yaw, mode: 7, gloss: .035, tag });
      for (let i = 0; i < n; i++) {
        const u = -w / 2 + (i + .5) * w / n;
        const p = P(u + (i % 2 ? .12 : -.10), .30);
        box(p[0], .82, p[1], Math.abs(Math.cos(yaw)) > .5 ? .46 : .16, .30,
          Math.abs(Math.cos(yaw)) > .5 ? .16 : .46, i % 2 ? c.celadonL : c.silkL,
          {...MAT.cloth, ry: yaw, mode: 7, gloss: .03, tag });
      }
      const b = P(w * .30, .06);
      capsule(b[0], .80, b[1], .12, .58, .12, c.silkD,
        { rz: Math.PI / 2, ry: yaw + Math.PI / 2, gloss: .03, tag });
      solid(x - cw / 2, x + cw / 2, z - cd / 2, z + cd / 2);
      shade(x, z, cw + .16, cd + .16, .22);
    }

    function armchair(x, z, yaw, upholstery = c.silk, tag = uid('扶手椅')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      box(x, .34, z, .68, .11, .64, c.walnutD, {...MAT.timber, hard: true, mode: 6, ry: yaw, gloss: .27, tag });
      box(x, .46, z, .78, .20, .72, upholstery, {...MAT.cloth, mode: 7, ry: yaw, gloss: .035, tag });
      box(x, .575, z, .64, .035, .58, c.silkL, {...MAT.cloth, mode: 7, ry: yaw, gloss: .04, tag });
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const p = P(su * .27, sv * .24);
        taper(p[0], .19, p[1], .075, .38, .055, c.walnutD, { gloss: .31, tag });
      }
      const back = P(0, -.32), inset = P(0, -.26);
      box(back[0], .92, back[1], .78, .80, .15, c.walnutD, {...MAT.timber, mode: 6, ry: yaw, gloss: .29, tag });
      box(inset[0], .91, inset[1], .62, .60, .065, upholstery, {...MAT.cloth, mode: 7, ry: yaw, gloss: .035, tag });
      cyl(back[0], 1.34, back[1], .014, .60, c.bronzeL,
        { rz: Math.PI / 2, ry: yaw, gloss: .68, tag });
      for (const s of [-1, 1]) {
        const arm = P(s * .38, 0);
        box(arm[0], .78, arm[1], .11, .10, .56, c.walnutL, {...MAT.timber, mode: 7, ry: yaw, gloss: .29, tag });
        cyl(arm[0], .64, arm[1], .015, .40, c.walnut, { tag });
      }
      solid(x - .44, x + .44, z - .42, z + .42);
      shade(x, z, .92, .88, .20);
    }

    function lowTable(x, z, r = .46, tag = uid('茶几')) {
      cyl(x, .40, z, r, .06, c.limestone, {...MAT.stone, mode: 7, gloss: .24, tag });
      cyl(x, .36, z, r - .05, .05, c.walnutD, {...MAT.timber, mode: 7, gloss: .28, tag });
      cyl(x, .19, z, .10, .34, c.bronzeD, { gloss: .62, tag });
      cyl(x, .025, z, r * .62, .05, c.bronzeD, { gloss: .60, tag });
      shade(x, z, r * 2.3, r * 2.3, .18);
    }

    function deskSet(x, z, yaw, w = 1.55, tag = uid('书桌')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const cw = Math.abs(Math.cos(yaw)) > .5 ? w : .62;
      const cd = Math.abs(Math.cos(yaw)) > .5 ? .62 : w;
      box(x, .74, z, cw, .06, cd, c.walnut, {...MAT.timber, ry: yaw, mode: 7, gloss: .33, tag });
      box(x, .70, z, cw - .10, .04, cd - .10, c.walnutD, {...MAT.timber, ry: yaw, mode: 7, gloss: .28, tag });
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const p = P(su * (w / 2 - .10), sv * .24);
        cyl(p[0], .36, p[1], .014, .72, c.bronzeD, { gloss: .60, tag });
      }
      const d = P(w * .26, -.02);
      box(d[0], .58, d[1], Math.abs(Math.cos(yaw)) > .5 ? w * .40 : .50, .22,
        Math.abs(Math.cos(yaw)) > .5 ? .50 : w * .40, c.walnutL, {...MAT.timber, ry: yaw, mode: 7, gloss: .30, tag });
      // Blotter, a folded newspaper stand-in and a small bronze task light.
      const t = P(-w * .16, 0);
      box(t[0], .775, t[1], .46, .012, .34, c.ink, { hard: true, ry: yaw, gloss: .12, tag });
      box(t[0], .785, t[1], .30, .008, .22, c.paper, { hard: true, ry: yaw, gloss: .06, tag });
      const l = P(w * .38, -.16);
      cyl(l[0], .80, l[1], .075, .05, c.bronzeD, { gloss: .62, tag });
      cyl(l[0], 1.02, l[1], .009, .42, c.bronze, { gloss: .68, tag });
      cyl(l[0] - .10, 1.22, l[1], .008, .24, c.bronze,
        { rz: Math.PI / 2, gloss: .68, tag });
      luminous(ball(l[0] - .20, 1.19, l[1], .055, .045, .055, c.warm,
        { mode: 1, tag }), .05, .26);
      const hw = cw / 2, hd = cd / 2;
      solid(x - hw, x + hw, z - hd, z + hd);
      shade(x, z, cw + .14, cd + .14, .20);
    }

    function deskChair(x, z, yaw, tag = uid('椅子')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      box(x, .44, z, .52, .09, .50, c.walnutD, {...MAT.timber, hard: true, mode: 6, ry: yaw, gloss: .28, tag });
      box(x, .50, z, .56, .12, .54, c.silk, {...MAT.cloth, mode: 7, ry: yaw, gloss: .035, tag });
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const p = P(su * .20, sv * .19);
        taper(p[0], .22, p[1], .028, .44, .028, c.walnutD, { gloss: .30, tag });
      }
      const back = P(0, -.25);
      box(back[0], .78, back[1], .52, .58, .07, c.walnutD, {...MAT.timber, mode: 6, ry: yaw, gloss: .30, tag });
      box(back[0], .78, back[1], .40, .44, .045, c.silkL, {...MAT.cloth, mode: 7, ry: yaw, gloss: .035, tag });
      shade(x, z, .66, .64, .18);
    }

    // Wall-hung media panel: walnut ground, framed screen, console and a bronze shelf.
    function media(x, z, yaw, w = 1.7, tag = uid('电视')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const across = Math.abs(Math.cos(yaw)) > .5;
      const panel = P(0, .09);
      box(panel[0], 1.62, panel[1], across ? w + .70 : .10, 2.34, across ? .10 : w + .70,
        c.walnut, {...MAT.timber, hard: true, ry: yaw, mode: 6, gloss: .32, tag });
      const face = P(0, .01);
      box(face[0], 1.86, face[1], across ? w + .12 : .07, w * .58 + .12, across ? .07 : w + .12,
        c.walnutD, { hard: true, ry: yaw, gloss: .30, tag });
      const scr = P(0, -.03);
      const screen = box(scr[0], 1.86, scr[1], across ? w : .020, w * .58, across ? .020 : w,
        c.blue, { hard: true, ry: yaw, mode: 1, glow: .07, tag });
      const shelf = P(0, -.06);
      box(shelf[0], .52, shelf[1], across ? w + .46 : .44, .09, across ? .44 : w + .46,
        c.limestone, {...MAT.stone, ry: yaw, mode: 7, gloss: .23, tag });
      box(P(0, .04)[0], .28, P(0, .04)[1], across ? w + .34 : .34, .40, across ? .34 : w + .34,
        c.walnutD, {...MAT.timber, ry: yaw, mode: 7, gloss: .29, tag });
      for (const s of [-1, 1]) {
        const b = P(s * w * .26, -.11);
        capsule(b[0], .28, b[1], .020, .20, .020, c.bronzeL,
          { rz: Math.PI / 2, ry: yaw, gloss: .70, tag });
      }
      // The unit is joinery, not a decal: it has to stop a body like any other cabinet.
      const s0 = P(0, -.02);
      const hw2 = across ? (w + .46) / 2 : .20, hd2 = across ? .20 : (w + .46) / 2;
      solid(s0[0] - hw2, s0[0] + hw2, s0[1] - hd2, s0[1] + hd2);
      blocker(s0[0] - hw2 - .04, s0[0] + hw2 + .04, s0[1] - hd2 - .04, s0[1] + hd2 + .04, 2.90);
      shade(s0[0], s0[1], hw2 * 2 + .2, hd2 * 2 + .2, .22);
      onTick((t, body, mins) => {
        const h = (((Number(mins) || 0) / 60) % 24);
        const on = (h >= 7 && h < 10) || (h >= 18 && h < 24);
        screen.glow = on ? .10 + .022 * Math.sin(t * .8) : .004;
        screen.color = on ? (Math.sin(t * .2) > 0 ? c.blue : c.jade) : c.ink;
      });
    }

    // ------------------------------------------------------------------------- wet room kit
    function wetFloor(x0, x1, z0, z1, tag = uid('浴室')) {
      flat((x0 + x1) / 2, .019, (z0 + z1) / 2, x1 - x0, z1 - z0, c.limestoneL,
        { mode: 7, gloss: .21, mat: 'tile', matScale: .44, matAmt: .22, tag });
      for (const xx of [x0 + .06, x1 - .06])
        flat(xx, .027, (z0 + z1) / 2, .035, z1 - z0 - .12, c.bronzeD, { gloss: .50, tag });
      for (const zz of [z0 + .06, z1 - .06])
        flat((x0 + x1) / 2, .027, zz, x1 - x0 - .12, .035, c.bronzeD, { gloss: .50, tag });
    }

    function vanity(x, z, yaw, w = 1.6, tag = uid('洗漱台')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const across = Math.abs(Math.cos(yaw)) > .5;
      const D = .58;
      box(x, .055, z, across ? w - .18 : D - .14, .11, across ? D - .14 : w - .18,
        c.walnutD, { ry: yaw, gloss: .27, tag });
      box(x, .40, z, across ? w : D, .58, across ? D : w, c.walnut,
        {...MAT.timber, ry: yaw, mode: 7, gloss: .31, tag });
      box(x, .74, z, across ? w + .12 : D + .12, .09, across ? D + .12 : w + .12,
        c.limestone, {...MAT.stone, ry: yaw, mode: 7, gloss: .24, tag });
      for (const s of [-1, 1]) {
        const f = P(s * w * .24, D / 2 - .02);
        box(f[0], .42, f[1], across ? w * .42 : .026, .46, across ? .026 : w * .42,
          c.walnutL, { hard: true, ry: yaw, gloss: .28, tag });
        const h = P(s * w * .24, D / 2 + .01);
        capsule(h[0], .42, h[1], .020, .20, .020, c.bronzeL,
          { rz: Math.PI / 2, ry: yaw, gloss: .72, tag });
      }
      const basin = P(0, .02);
      cyl(basin[0], .80, basin[1], .23, .07, c.white, { gloss: .34, tag });
      const tap = P(0, -.20);
      cyl(tap[0], .86, tap[1], .06, .045, c.bronzeD, { gloss: .66, tag });
      cyl(tap[0], 1.00, tap[1], .014, .26, c.bronze, { gloss: .69, tag });
      const spout = P(0, -.10);
      cyl(spout[0], 1.11, spout[1], .013, .22, c.bronze,
        { rz: Math.PI / 2, ry: yaw + Math.PI / 2, gloss: .69, tag });
      // Mirror and its two wall lights, hung on the wall the vanity backs onto.
      const wall = P(0, -D / 2 - .03);
      box(wall[0], 1.86, wall[1], across ? w + .10 : .07, 1.42, across ? .07 : w + .10,
        c.bronzeD, { hard: true, gloss: .64, tag });
      const face = P(0, -D / 2 + .01);
      box(face[0], 1.86, face[1], across ? w - .06 : .022, 1.26, across ? .022 : w - .06,
        c.glassD, { hard: true, mode: 1, alpha: .74, gloss: .88, tag });
      for (const s of [-1, 1]) {
        const l = P(s * (w / 2 + .13), -D / 2 + .04);
        cyl(l[0], 1.86, l[1], .014, .52, c.bronze, { gloss: .68, tag });
        luminous(ball(l[0], 1.86, l[1], .05, .24, .05, c.warm, { mode: 1, tag }), .04, .26);
      }
      const hw = across ? w / 2 + .06 : D / 2 + .06, hd = across ? D / 2 + .06 : w / 2 + .06;
      solid(x - hw, x + hw, z - hd, z + hd);
    }

    function wc(x, z, yaw, tag = uid('马桶')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const cist = P(0, -.26);
      box(cist[0], .58, cist[1], .40, 1.02, .16, c.white, {...MAT.stone, ry: yaw, mode: 7, gloss: .34, tag });
      box(cist[0], 1.06, cist[1], .18, .08, .04, c.bronzeL, { hard: true, ry: yaw, gloss: .70, tag });
      box(x, .21, z, .38, .42, .54, c.white, {...MAT.stone, ry: yaw, mode: 7, gloss: .34, tag });
      box(x, .43, z, .40, .06, .56, c.limestoneL, {...MAT.stone, ry: yaw, mode: 7, gloss: .30, tag });
      solid(x - .28, x + .28, z - .34, z + .34);
    }

    function tubBay(x, z, yaw, w = .88, l = 1.86, tag = uid('浴缸')) {
      const across = Math.abs(Math.cos(yaw)) > .5;
      const sw = across ? l : w, sd = across ? w : l;
      box(x, .07, z, sw * .92, .14, sd * .88, c.walnutD, {...MAT.timber, mode: 7, gloss: .26, tag });
      box(x, .34, z, sw, .54, sd, c.white, {...MAT.stone, mode: 7, gloss: .30, tag });
      for (const s of [-1, 1]) {
        box(x + (across ? s * sw / 2 : 0), .63, z + (across ? 0 : s * sd / 2),
          across ? .10 : sw + .07, .10, across ? sd + .07 : .10, c.limestone,
          {...MAT.stone, mode: 7, gloss: .26, tag });
        box(x + (across ? 0 : s * sw / 2), .63, z + (across ? s * sd / 2 : 0),
          across ? sw + .07 : .10, .10, across ? .10 : sd + .07, c.limestone,
          {...MAT.stone, mode: 7, gloss: .26, tag });
      }
      box(x, .61, z, sw * .78, .07, sd * .74, c.water, { mode: 1, alpha: .76, gloss: .84, tag });
      const P = (u, v) => at(x, z, yaw, u, v);
      const t = P(l * .34, 0);
      cyl(t[0], .72, t[1], .055, .06, c.bronzeD, { gloss: .64, tag });
      cyl(t[0], .92, t[1], .015, .38, c.bronze, { gloss: .70, tag });
      const s2 = P(l * .26, 0);
      cyl(s2[0], 1.09, s2[1], .014, .26, c.bronze,
        { rz: Math.PI / 2, ry: yaw, gloss: .70, tag });
      const tw = P(-l * .30, -w * .34);
      capsule(tw[0], .74, tw[1], .10, .56, .10, c.towel,
        { rz: Math.PI / 2, ry: yaw + Math.PI / 2, gloss: .02, tag });
      solid(x - sw / 2, x + sw / 2, z - sd / 2, z + sd / 2);
    }

    // Open rain shower: a tiled back wall, a drained tray, a bench and real hardware. No
    // floor-to-ceiling glass, which would cost a draw call per pane and read as a box.
    function shower(x, z, yaw, w = 1.10, d = 1.10, tag = uid('淋浴')) {
      const P = (u, v) => at(x, z, yaw, u, v);
      const across = Math.abs(Math.cos(yaw)) > .5;
      const back = P(0, -d / 2 - .04);
      box(back[0], 1.42, back[1], across ? w + .10 : .08, 2.84, across ? .08 : w + .10,
        c.limestone, { hard: true, gloss: .17, tag });
      for (const yy of [.14, .80, 1.46, 2.12, 2.72])
        box(back[0], yy, back[1], across ? w + .04 : .014, .018, across ? .014 : w + .04,
          c.bronzeD, { hard: true, gloss: .44, tag });
      flat(x, .028, z, across ? w : d, across ? d : w, c.celadonL,
        { mode: 7, gloss: .17, mat: 'tile', matScale: .28, matAmt: .18, tag });
      flat(x, .036, z, across ? w * .5 : .11, across ? .11 : w * .5, c.steel,
        { mode: 1, gloss: .52, tag });
      const head = P(0, -d / 2 + .06);
      cyl(head[0], 2.26, head[1], .10, .05, c.bronzeD,
        { rz: across ? 0 : Math.PI / 2, rx: across ? Math.PI / 2 : 0, gloss: .64, tag });
      const arm = P(0, -d / 2 + .26);
      cyl(arm[0], 2.20, arm[1], .14, .06, c.bronzeL,
        { rx: Math.PI / 2, ry: yaw, gloss: .70, tag });
      const ctl = P(w * .34, -d / 2 + .05);
      box(ctl[0], 1.22, ctl[1], across ? .28 : .06, .36, across ? .06 : .28, c.bronzeD,
        { mode: 7, gloss: .58, tag });
      const bench = P(-w * .28, -d / 2 + .22);
      box(bench[0], .42, bench[1], across ? w * .48 : .40, .10, across ? .40 : w * .48,
        c.limestone, {...MAT.stone, mode: 7, gloss: .22, tag });
      box(bench[0], .21, bench[1], across ? w * .34 : .16, .32, across ? .16 : w * .34,
        c.walnutD, {...MAT.timber, mode: 7, gloss: .25, tag });
    }

    // A short stack of folded linen: the only thing that makes a store room read as stocked.
    function linenStack(x, y, z, n = 4, w = .50, tag = uid('布草')) {
      for (let i = 0; i < n; i++)
        box(x, y + i * .085, z, w, .075, .34, i % 3 === 0 ? c.celadonL : c.towel,
          {...MAT.cloth, mode: 7, gloss: .02, ry: (i % 2 - .5) * .04, tag });
    }

    // Wet rooms get a flush bronze downlight rather than a hanging lantern: cheaper, and a
    // pendant over a bath is not what a hotel builds anyway.
    function downlight(x, z, tag = uid('筒灯')) {
      cyl(x, SOFFIT - .05, z, .17, .07, c.bronzeD, { gloss: .60, tag });
      luminous(cyl(x, SOFFIT - .10, z, .13, .025, c.warm, { mode: 1, tag }), .05, .28);
    }

    function pendant(x, z, y = 2.34, scale = 1, tag = uid('吊灯')) {
      cyl(x, SOFFIT - .06, z, .13 * scale, .07, c.walnutD, { gloss: .30, tag });
      cyl(x, (SOFFIT + y) / 2, z, .009 * scale, SOFFIT - y - .18, c.bronze,
        { gloss: .68, tag });
      taper(x, y, z, .22 * scale, .34 * scale, .22 * scale, c.silkL, {...MAT.cloth, mode: 7, gloss: .04, tag });
      luminous(ball(x, y - .04, z, .085 * scale, .10 * scale, .085 * scale, c.warm,
        { mode: 1, tag }), .045, .30);
      cyl(x, y - .19 * scale, z, .11 * scale, .05, c.bronzeD, { gloss: .62, tag });
    }

    // Framed ink painting. Seeded so no two are the same wash.
    function inkArt(x, y, z, w, h, yaw, seed, title, tag = uid('水墨画')) {
      const across = Math.abs(Math.cos(yaw)) > .5;
      const T = (t) => across ? [w * t, .06] : [.06, w * t];
      box(x, y, z, ...T(1).slice(0, 1), h, ...T(1).slice(1), c.walnutD,
        { ...MAT.timber, hard: true, mode: 6, gloss: .33, tag });
      // Same facing rule as roomPlate: the paper, the wash and the title all step off the frame
      // along (sin yaw, cos yaw), so a painting is never hung facing into its own wall.
      const dx = Math.sin(yaw) * .04, dz = Math.cos(yaw) * .04;
      box(x + dx, y, z + dz, across ? w - .13 : .03, h - .13, across ? .03 : w - .13, c.paper,
        {...MAT.cloth, hard: true, mode: 7, gloss: .07, tag });
      for (let i = 0; i < 4; i++) {
        const r = (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
        const u = (Math.abs(r) - .5) * w * .70, hh = .10 + Math.abs(r) * h * .40;
        const px = x + dx * 1.4 + (across ? u : 0), pz = z + dz * 1.4 + (across ? 0 : u);
        taper(px, y - h * .18 + hh * .5, pz, .05 + Math.abs(r) * .10, hh,
          .05 + Math.abs(r) * .10, i % 2 ? c.inkL : c.ink, {...MAT.cloth, mode: 7, gloss: .06, tag });
      }
      const px = x + dx * 1.4, pz = z + dz * 1.4;
      ball(px, y + h * .28, pz, .055, .055, .012, c.lacquer, { mode: 1, glow: .02, tag });
      glyphs(px, y - h * .38, pz, yaw, title,
        { size: .075, gap: .014, color: c.ink, mode: 1, lift: .006, tag });
    }

    function planter(x, z, r = .34, tag = uid('绿化')) {
      cyl(x, .22, z, r, .44, c.limestone, {...MAT.stone, mode: 7, gloss: .22, tag });
      cyl(x, .45, z, r - .03, .04, c.walnutD, { gloss: .26, tag });
      cyl(x, .03, z, r + .04, .06, c.bronzeD, { gloss: .58, tag });
      cyl(x, .86, z, .0175, .80, c.walnut, { gloss: .30, tag });
      for (const [dx, dy, dz, rx] of [[-.22, 1.16, .04, .30], [.20, 1.24, -.06, .33],
        [.02, 1.42, .08, .29], [-.06, 1.02, -.20, .24]])
        ball(x + dx, dy, z + dz, rx, rx * .72, rx * .84, c.green, { mode: 15, gloss: .10, tag });
      solid(x - r, x + r, z - r, z + r);
    }

    function console8(x, z, yaw, w = 1.5, tag = uid('边柜')) {
      const across = Math.abs(Math.cos(yaw)) > .5;
      box(x, .72, z, across ? w : .44, .06, across ? .44 : w, c.limestone,
        {...MAT.stone, mode: 7, gloss: .24, tag });
      box(x, .42, z, across ? w - .18 : .36, .56, across ? .36 : w - .18, c.walnut,
        {...MAT.timber, mode: 7, ry: yaw, gloss: .31, tag });
      for (const s of [-1, 1]) {
        const p = at(x, z, yaw, s * w * .34, .19);
        cyl(p[0], .36, p[1], .013, .68, c.bronzeD, { gloss: .60, tag });
      }
      cyl(x, .82, z, .16, .16, c.celadon, {...MAT.cloth, mode: 7, gloss: .28, tag });
      cyl(x, .92, z, .09, .05, c.bronzeL, { gloss: .68, tag });
      solid(x - (across ? w / 2 : .24), x + (across ? w / 2 : .24),
        z - (across ? .24 : w / 2), z + (across ? .24 : w / 2));
      shade(x, z, across ? w + .2 : .7, across ? .7 : w + .2, .20);
    }

    // ======================================================================= 803 deluxe room
    // The entry hall is 1.76 m wide, so its wardrobe is fitted at 0.42 m rather than freestanding:
    // a 0.62 m carcase would have left a 0.54 m lane, which is below the 0.60 m a body needs.
    rugField(11.9, -12.9, 4.4, 2.9, c.rug);
    view(11.87, -14.70, 4.5, 0);
    bed8(13.20, -12.90, -Math.PI / 2, 1.90, c.celadon, '豪华客房803');
    nightStand(13.95, -13.95, -Math.PI / 2);
    nightStand(13.95, -11.85, -Math.PI / 2);
    media(9.54, -12.60, -Math.PI / 2, 1.45);
    windowSeat(10.65, -13.90, 0, 2.10);
    wardrobe(9.65, -10.10, -Math.PI / 2, 1.55, .42);
    pendant(11.90, -12.20, 2.44);
    inkArt(12.70, 1.90, -11.56, 1.40, 1.00, Math.PI, 3, '远山图');
    light(12.0, 2.65, -12.6, [1, .84, .60], .34, 6.2);

    // ======================================================================= 803 wet room
    wetFloor(11.40, 14.30, -11.30, -8.70);
    vanity(12.60, -8.98, Math.PI, 1.55, '浴室803');
    shower(13.55, -10.75, Math.PI / 2, 1.20, 1.20);
    wc(11.78, -11.00, -Math.PI / 2);
    linenStack(11.95, .79, -9.05, 3, .38);
    downlight(12.85, -10.10);

    // ================================================================ 805 south-east corner
    // The corner is the point of the room, so the corner is kept EMPTY: the window seat sits
    // under the long south glazing and the bronze viewer stands where the two facades meet, with
    // a clear 0.7 m lane between the media panel and the wet-room wall so the corner stays
    // reachable. A bench across the corner bay looked better and sealed it off — the arm is only
    // 1.6 m deep, which is a 0.4 m lane once a 0.96 m seat and the body radius are taken out.
    rugField(15.90, -12.40, 3.4, 3.0, c.carpetL);
    view(18.00, -14.70, 6.4, 0);
    view(21.70, -13.60, 1.5, Math.PI / 2);
    bed8(15.45, -12.30, Math.PI / 2, 1.85, c.silkL, '转角套房805');
    nightStand(14.80, -13.55, Math.PI / 2);
    nightStand(14.80, -11.05, Math.PI / 2);
    media(16.70, -12.30, Math.PI / 2, 1.05);
    windowSeat(16.20, -13.90, 0, 2.00);
    lowTable(19.40, -13.70, .40);
    // Bronze corner viewer, aimed across the junction of the two facades.
    cyl(20.60, .06, -13.60, .30, .12, c.bronzeD, { gloss: .58, tag: '观景台' });
    cyl(20.60, .60, -13.60, .0225, 1.00, c.bronzeD, { gloss: .62, tag: '观景台' });
    cyl(20.60, 1.24, -13.60, .0375, 1.36, c.bronze, { rx: -.52, rz: .40, gloss: .70, tag: '观景台' });
    cyl(20.60, 1.16, -13.60, .11, .10, c.bronzeL, { gloss: .70, tag: '观景台' });
    solid(20.34, 20.86, -13.86, -13.34);
    pendant(19.70, -13.30, 2.46);
    pendant(15.90, -12.20, 2.46);
    inkArt(14.86, 1.90, -10.28, .68, .90, Math.PI, 7, '墨竹图');
    light(16.0, 2.65, -12.4, [1, .84, .60], .34, 6.4);
    light(20.0, 2.55, -13.4, [1, .86, .64], .30, 5.4);

    // ======================================================================= 805 wet room
    wetFloor(18.40, 21.40, -12.60, -10.20);
    view(21.70, -11.40, 1.9, Math.PI / 2, { h: 2.10, y: 1.86 });
    vanity(19.55, -12.44, 0, 1.45);
    tubBay(20.30, -10.62, Math.PI, .86, 1.80);
    downlight(19.80, -11.30);

    // ================================================================ 807 north-west corner
    rugField(-16.10, 11.00, 3.6, 3.4, c.carpetL);
    view(-17.70, 14.70, 6.6, Math.PI);
    view(-21.70, 11.60, 5.0, -Math.PI / 2);
    bed8(-15.20, 11.00, -Math.PI / 2, 2.00, c.celadon, '转角套房807');
    nightStand(-14.42, 9.72, -Math.PI / 2);
    nightStand(-14.42, 12.28, -Math.PI / 2);
    media(-17.88, 11.00, Math.PI / 2, 1.50);
    windowSeat(-19.55, 13.90, Math.PI, 2.40);
    windowSeat(-20.90, 12.55, -Math.PI / 2, 1.80);
    lowTable(-19.85, 12.60, .42);
    deskSet(-14.42, 7.30, -Math.PI / 2, 1.55, '书桌807');
    deskChair(-15.20, 7.30, Math.PI / 2);
    armchair(-16.70, 8.20, .9, c.silk);
    wardrobe(-17.78, 7.70, -Math.PI / 2, 1.50);
    pendant(-19.60, 12.90, 2.46);
    pendant(-16.00, 10.40, 2.46);
    inkArt(-15.20, 1.90, 5.32, 1.10, .86, 0, 11, '银杏图');
    light(-16.2, 2.65, 10.8, [1, .84, .60], .34, 6.6);
    light(-20.0, 2.55, 12.6, [1, .86, .64], .30, 5.6);

    // ======================================================================= 807 wet room
    wetFloor(-21.40, -18.30, 5.15, 8.50);
    view(-21.70, 6.85, 2.4, -Math.PI / 2, { h: 2.10, y: 1.86 });
    vanity(-18.62, 7.95, -Math.PI / 2, 1.40);
    tubBay(-20.95, 6.75, -Math.PI / 2, .86, 1.86);
    wc(-19.60, 5.55, 0);
    linenStack(-18.62, .79, 8.42, 3, .38);
    downlight(-19.90, 7.20);

    // ======================================================================= 808 wet room
    // 808 was a corner room with no bathroom at all. Its west wall is the fit-out module's
    // false window, so this wet room shares the view the bedroom already had.
    wetFloor(-13.85, -10.95, 5.13, 8.65);
    vanity(-11.28, 7.90, -Math.PI / 2, 1.30);
    tubBay(-13.35, 7.05, Math.PI / 2, .86, 1.86);
    wc(-12.60, 5.62, 0);
    shower(-12.30, 8.18, Math.PI, 1.15, 1.05);
    downlight(-12.20, 6.60);

    // ======================================================================= 802 additions
    // The fit-out module gave 802 a window seat, a tea table and a television, but no bed and
    // no wet room. A freestanding walnut bedhead screen makes the sleeping half a real place.
    rugField(6.10, -9.80, 3.9, 3.3, c.rug);
    partition(4.65, 4.85, -11.10, -8.50, { color: c.walnut, y1: 2.42, trim: false, top: 2.6 });
    box(4.75, 2.50, -9.80, .34, .10, 2.80, c.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .33, tag: '床屏' });
    for (const zz of [-10.60, -9.80, -9.00])
      cyl(4.90, 1.30, zz, .012, 2.00, c.bronzeL, { gloss: .68, tag: '床屏' });
    bed8(5.95, -9.80, Math.PI / 2, 1.95, c.silkL);
    nightStand(5.15, -11.05, Math.PI / 2);
    nightStand(5.15, -8.55, Math.PI / 2);
    wardrobe(6.90, -5.60, Math.PI, 1.55);
    deskSet(3.35, -5.62, Math.PI, 1.50);
    deskChair(3.35, -6.38, 0);
    pendant(6.30, -9.20, 2.46);
    light(6.2, 2.65, -9.6, [1, .84, .60], .34, 6.8);

    // ======================================================================= 802 wet room
    // 2.35 m x 3.10 m: a soaking tub under the existing south glazing and a vanity, and that is
    // all that fits. A WC as well left a 0.11 m lane at the door, which is not a room.
    wetFloor(0.65, 3.00, -14.40, -11.30);
    tubBay(1.86, -13.92, Math.PI, .84, 1.90);
    vanity(2.66, -13.05, -Math.PI / 2, 1.10);
    downlight(1.70, -12.40);

    // ======================================================================= 801 additions
    wardrobe(-7.44, -8.60, -Math.PI / 2, 1.40);
    deskSet(-1.55, -5.62, Math.PI, 1.50);
    deskChair(-1.55, -6.38, 0);
    armchair(-6.30, -12.80, .6, c.celadonL);
    lowTable(-5.30, -13.10, .40);
    pendant(-4.20, -8.30, 2.46);

    // ======================================================================= the guest gallery
    // 10 m between the two existing partitions is a hall, not a corridor. A bordered runner and
    // a walnut colonnade give it a walking lane, alcoves either side and something to occlude.
    rugField(-3.60, 0.10, 30.0, 3.4, c.carpet, c.walnutD, '地毯');
    for (const px of [-16.4, -10.9, -5.4, 0.1, 5.6]) {
      for (const pz of [-2.10, 2.30]) {
        const ptag = uid('廊柱');
        box(px, 2.04, pz, .34, SOFFIT, .34, c.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: ptag });
        box(px, .16, pz, .46, .32, .46, c.limestone, { hard: true, gloss: .22, tag: ptag });
        box(px, 2.52, pz, .42, .06, .42, c.bronzeD, { hard: true, gloss: .60, tag: ptag });
        box(px, SOFFIT - .16, pz, .44, .10, .44, c.bronzeD, { hard: true, gloss: .58, tag: ptag });
        solid(px - .17, px + .17, pz - .17, pz + .17);
        blocker(px - .19, px + .19, pz - .19, pz + .19, SOFFIT);
      }
      if (px !== -5.4) pendant(px, 0.10, 2.62, .9);
    }
    inkArt(-11.00, 1.84, -5.00, 1.55, 1.12, 0, 5, '京城山水');
    inkArt(-2.40, 1.84, 4.93, 1.55, 1.12, Math.PI, 13, '京城山水');
    inkArt(0.60, 1.84, 4.93, 1.35, 1.02, Math.PI, 29, '京城山水');
    console8(-11.0, -4.55, 0, 1.5);
    console8(-2.4, 4.46, Math.PI, 1.5);
    planter(-6.2, 4.40); planter(12.6, 4.30);
    roomPlate(-12.70, 2.20, -5.00, 0, '西廊', 'WEST WING', 1.05, c.jade);
    roomPlate(2.45, 2.20, 4.93, Math.PI, '东廊', 'EAST WING', 1.00, c.jade);

    // ======================================================================= west view lounge
    // One continuous seat, not two flanking one: a pair of benches with a gap between them turns
    // the gap into a pocket the armchairs then seal, which is exactly how an `o` cell is made.
    view(-21.70, 0.00, 8.4, -Math.PI / 2);
    windowSeat(-20.90, 0.00, -Math.PI / 2, 3.60, '西厅');
    armchair(-19.55, -2.30, -1.9, c.celadonL, '扶手椅西厅');
    armchair(-19.55, 2.30, -1.2, c.silk);
    lowTable(-19.95, 0.00, .46);
    pendant(-20.30, 0.00, 2.52);
    planter(-19.30, 3.90);
    light(-20.2, 2.60, 0, [1, .86, .62], .32, 6.4);

    // ======================================================================= west stair lobby
    view(-15.72, -14.70, 3.4, 0);
    windowSeat(-15.72, -13.90, 0, 2.60);
    console8(-13.85, -7.40, -Math.PI / 2, 1.40);
    inkArt(-13.66, 1.86, -7.40, 1.40, 1.06, -Math.PI / 2, 17, '京城山水');
    planter(-14.10, -11.20);
    pendant(-15.90, -9.80, 2.52);

    // ======================================================================= east gallery
    console8(9.74, -5.60, Math.PI / 2, 1.10);
    inkArt(9.50, 1.86, -5.60, 1.10, .92, Math.PI / 2, 23, '远山图');
    windowSeat(12.90, -8.10, Math.PI, 1.60);
    planter(14.00, -6.10);
    pendant(11.60, -6.90, 2.52);
    roomPlate(12.60, 2.20, -8.45, 0, '电梯厅', 'LIFT LOBBY', 1.15, c.jade);

    // ======================================================================= north view gallery
    view(9.80, 14.70, 4.8, Math.PI);
    view(17.60, 14.70, 6.0, Math.PI);
    windowSeat(9.80, 13.90, Math.PI, 3.00);
    windowSeat(17.60, 13.90, Math.PI, 3.40, '观景廊');
    armchair(16.40, 12.30, -.4, c.silk);
    armchair(18.80, 12.30, .4, c.celadonL);
    lowTable(17.60, 12.60, .46);
    planter(13.20, 13.60); planter(5.10, 13.20);
    pendant(9.80, 13.20, 2.56); pendant(17.60, 13.20, 2.56);
    inkArt(3.56, 1.90, 9.60, 1.50, 1.10, Math.PI / 2, 31, '银杏图');
    roomPlate(3.56, 2.24, 6.40, Math.PI / 2, '观景廊', 'VIEW GALLERY', 1.25, c.jade);
    light(17.6, 2.62, 13.2, [1, .86, .62], .34, 7.0);
    light(9.8, 2.62, 13.2, [1, .86, .62], .30, 6.0);

    // ======================================================================= linen store
    flat(-19.70, .018, -11.60, 3.20, 5.30, c.limestoneD,
      { mode: 7, gloss: .12, mat: 'tile', matScale: .58, matAmt: .18, tag: '布草间' });
    for (const zz of [-13.60, -12.30, -11.00]) {
      box(-21.15, 1.06, zz, .46, 2.12, 1.10, c.steel, { hard: true, gloss: .38, tag: '布草间' });
      for (let i = 0; i < 3; i++) {
        box(-21.15, .44 + i * .66, zz, .50, .035, 1.14, c.steel,
          { hard: true, gloss: .44, tag: '布草间' });
        linenStack(-21.13, .46 + i * .66, zz + (i % 2 ? .24 : -.24), 2, .40);
      }
      solid(-21.40, -20.90, zz - .58, zz + .58);
    }
    box(-19.60, .46, -14.10, 2.40, .84, .58, c.limestone, {...MAT.stone, mode: 7, gloss: .22, tag: '布草间' });
    box(-19.60, .90, -14.10, 2.48, .06, .64, c.walnut, {...MAT.timber, mode: 7, gloss: .28, tag: '布草间' });
    solid(-20.80, -18.40, -14.40, -13.78);
    for (const xx of [-20.20, -19.00]) linenStack(xx, .94, -14.08, 3, .46);
    // Housekeeping trolley, parked clear of the door swing and stocked.
    box(-18.55, .48, -13.20, .78, .80, 1.20, c.steel, { hard: true, gloss: .40, tag: '布草间' });
    box(-18.55, .90, -13.20, .84, .05, 1.26, c.walnutL, {...MAT.timber, mode: 7, gloss: .28, tag: '布草间' });
    for (const s of [-1, 1]) cyl(-18.55 + s * .30, .06, -13.20, .085, .07, c.ink,
      { rz: Math.PI / 2, gloss: .30, tag: '布草间' });
    linenStack(-18.55, .94, -13.20, 4, .58);
    solid(-18.97, -18.13, -13.82, -12.58);
    luminous(box(-19.70, SOFFIT - .10, -11.60, 1.70, .07, .34, c.warm,
      { hard: true, mode: 1, tag: '布草间' }), .06, .22);
    thing('布草间', -19.70, 1.28, -11.60,
      '八楼布草间存放本层客房的床品和毛巾。',
      'The 8F linen store holds the bedding and towels for this floor.',
      '布草 is hotel linen; 布草间 is the linen store.',
      { tag: '布草间', focus: [-19.30, -11.60], reach: 2.3 });

    // ======================================================================= housekeeping room
    // The fit-out module's pantry counter and trolley stand in here; this adds the working
    // shelving, a tray rack and a duty board so it reads as staffed rather than decorated.
    flat(9.27, .018, 7.30, 5.20, 3.40, c.limestoneD,
      { mode: 7, gloss: .12, mat: 'tile', matScale: .56, matAmt: .18, tag: '客房服务' });
    for (const zz of [6.60, 8.20]) {
      box(11.78, 1.02, zz, .30, 2.04, 1.24, c.steel, { hard: true, gloss: .38, tag: '客房服务' });
      for (let i = 0; i < 3; i++) {
        box(11.78, .46 + i * .64, zz, .34, .032, 1.28, c.steel,
          { hard: true, gloss: .44, tag: '客房服务' });
        linenStack(11.78, .48 + i * .64, zz + (i % 2 ? .26 : -.26), 2, .30);
      }
      solid(11.60, 11.95, zz - .64, zz + .64);
    }
    box(6.86, 1.04, 7.30, .32, 2.08, 2.60, c.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: '客房服务' });
    for (const zz of [6.35, 7.30, 8.25])
      box(6.90, 1.34, zz, .36, .040, .86, c.bronzeD, { hard: true, gloss: .56, tag: '客房服务' });
    solid(6.59, 7.05, 6.00, 8.60);
    box(7.90, 1.94, 5.61, 1.30, .84, .07, c.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .32, tag: '客房服务' });
    luminous(box(7.90, 1.94, 5.65, 1.14, .68, .020, c.celadon,
      { hard: true, mode: 1, tag: '客房服务' }), .018, .09);
    glyphs(7.90, 2.16, 5.68, 0, '整理房间',
      { size: .095, gap: .018, color: c.white, mode: 1, lift: .006, tag: '客房服务' });
    luminous(box(9.27, SOFFIT - .10, 7.30, 2.60, .07, .34, c.warm,
      { hard: true, mode: 1, tag: '客房服务' }), .06, .22);
    // The fit-out module's pantry counter and its parked trolley were drawn but never collided:
    // the body walked through both. They are this floor's furniture too, so give them footprints.
    solid(7.24, 9.96, 8.44, 9.11);
    solid(9.87, 11.47, 5.76, 6.54);

    // ======================================================================= interactions
    // Every label this file adds has a matching HotelUse entry, so none of them are dead.
    thing('豪华客房', 11.90, 1.30, -12.90,
      '八零三是标准豪华客房：落地窗、独立浴室和整面城市景观。',
      'Room 803 is the standard deluxe plan: full-height glazing, its own bathroom and a city wall of view.',
      '豪华客房 is a deluxe guestroom.', { tag: '豪华客房803', focus: [11.90, -12.20], reach: 2.4 });
    thing('转角套房', 19.10, 1.30, -13.40,
      '八零五占据东南转角，两面落地窗在窗边榻上交汇。',
      'Room 805 takes the south-east corner, where two walls of glazing meet over the window seat.',
      '转角 means corner; 套房 is a suite.', { tag: '转角套房805', focus: [19.10, -12.70], reach: 2.4 });
    thing('转角套房', -19.20, 1.30, 12.90,
      '八零七在西北转角，卧室朝北，起居角朝西看落日。',
      'Room 807 holds the north-west corner: the bed faces north and the sitting corner faces the sunset.',
      '西北 is north-west.', { tag: '转角套房807', focus: [-19.20, 12.10], reach: 2.4 });
    thing('浴室', 12.85, 1.28, -10.10,
      '豪华客房的独立浴室有石台盆、雨淋和独立坐便间。',
      'The deluxe bathroom has a stone vanity, a rain shower and a separate WC.',
      '浴室 is a bathroom; 淋浴 is a shower.', { tag: '浴室803', focus: [12.85, -9.60], reach: 2.2 });
    thing('观景廊', 17.60, 1.30, 13.10,
      '北廊的窗边座位正对京城北面的天际线。',
      'The north gallery seats look straight out over the northern skyline.',
      '观景 means to take in a view.', { tag: '观景廊', focus: [17.60, 12.40], reach: 2.4 });
    thing('西厅', -20.10, 1.30, 0.00,
      '西厅是走廊尽头的休息角，傍晚有整面西晒。',
      'The west lounge closes the corridor with an evening wall of western light.',
      '西 is west; 厅 is a hall or lounge.', { tag: '西厅', focus: [-19.40, 0.00], reach: 2.4 });
    thing('床', 13.20, 1.28, -12.90,
      '八零三的床正对南面落地窗，早上有整面日光。',
      'The bed in 803 faces the south glazing, and the morning light with it.',
      '床 is a bed; 客房 is a guestroom.', { tag: '豪华客房803', focus: [12.20, -12.90], reach: 2.2 });
    thing('扶手椅', -19.55, 1.10, -2.30,
      '西厅的扶手椅正对西面落地窗。',
      'The west lounge armchairs face the full-height western glazing.',
      '扶手椅 is an armchair.', { tag: '扶手椅西厅', focus: [-18.90, -2.30], reach: 2.0 });
    thing('书桌', -14.42, 1.30, 7.30,
      '转角套房的书桌靠窗，抽屉里有信纸和文具。',
      'The corner suite writing desk sits by the window, with paper in the drawer.',
      '书桌 is a writing desk.', { tag: '书桌807', focus: [-15.20, 7.30], reach: 2.0 });

    // (HotelUse.hotel8 is registered at load time at the foot of this file, not here.)

    // ======================================================================= camera rooms
    // Nested volumes first: a wet room has to beat the bedroom that contains it.
    cameraRoom('hotel8-bath801', -13.40, -7.95, -14.40, -5.67, 2.55);
    cameraRoom('hotel8-bath802', 0.55, 3.00, -14.40, -11.30, 2.35);
    cameraRoom('hotel8-bath803', 11.40, 14.30, -11.30, -8.70, 2.35);
    cameraRoom('hotel8-bath805', 18.40, 21.40, -12.60, -10.20, 2.35);
    cameraRoom('hotel8-bath807', -21.40, -18.30, 5.15, 8.50, 2.45);
    cameraRoom('hotel8-bath808', -13.85, -10.95, 5.13, 8.65, 2.45);
    cameraRoom('hotel8-room801', -13.40, 0.35, -14.40, -5.04, 3.25);
    cameraRoom('hotel8-room802', 0.55, 9.24, -14.40, -5.04, 3.25);
    cameraRoom('hotel8-room803', 9.44, 14.30, -14.40, -8.50, 2.95);
    cameraRoom('hotel8-room805', 14.50, 21.40, -14.40, -10.00, 2.95);
    cameraRoom('hotel8-room807', -21.40, -14.05, 5.15, 14.40, 3.15);
    cameraRoom('hotel8-room808', -13.85, 3.30, 5.13, 14.40, 3.35);
    cameraRoom('hotel8-linen', -21.40, -18.04, -14.40, -8.86, 2.55);
    cameraRoom('hotel8-service', 6.59, 11.95, 5.55, 9.13, 2.55);
    cameraRoom('hotel8-west-lobby', -17.84, -13.60, -14.40, -5.04, 3.05);
    cameraRoom('hotel8-east-gallery', 9.44, 14.30, -8.50, -5.04, 3.05);
    cameraRoom('hotel8-lift-landing', 13.60, 17.80, -9.90, 2.50, 3.65);
    cameraRoom('hotel8-north-gallery', 3.50, 21.40, 5.13, 14.40, 3.65);
    cameraRoom('hotel8-guest-corridor', -21.40, 14.30, -5.04, 4.95, 4.05);
  });

  // --------------------------------------------------------------------------------- floor actions
  // AT LOAD TIME, not inside the builder. These used to be assigned from inside the
  // HotelFit.register callback, which only runs when the scene is first built — so js/data.js had
  // nothing to patch at load, and anything that wants to attach opening hours, a dictionary link or
  // a price to one of these rows silently found no row. The systemic-wiring lane lost an outlet
  // window to exactly this (京华雅集 on floor 3, js/hotel-f3.js:690, same defect). Every other floor
  // module registers here; this one now does too, and .hotelhours.js is what says so.
  Object.assign(HotelUse.hotel8, {
    '豪华客房': { zh: '参观豪华客房', py: 'cānguān háohuá kèfáng', en: 'tour the deluxe room',
      secs: 2.0, mins: 5, gain: { mood: 5 }, pose: { type: 'walk' } },
    '转角套房': { zh: '参观转角套房', py: 'cānguān zhuǎnjiǎo tàofáng', en: 'tour the corner suite',
      secs: 2.2, mins: 6, gain: { mood: 7 }, pose: { type: 'walk' } },
    '浴室': { zh: '洗澡', py: 'xǐzǎo', en: 'take a shower',
      secs: 3.5, mins: 30, gain: { clean: 35, rest: 8 }, pose: { type: 'scrub' } },
    '布草间': { zh: '整理布草', py: 'zhěnglǐ bùcǎo', en: 'organise hotel linen',
      secs: 3.0, mins: 12, gain: { rest: -3, clean: 5 }, pose: { type: 'work' } },
    '床': { zh: '在客房休息', py: 'zài kèfáng xiūxi', en: 'rest in the guestroom',
      secs: 4.2, mins: 90, gain: { rest: 34, mood: 6 }, pose: { type: 'lie', seatY: .58 } },
    '书桌': { zh: '在书桌前写信', py: 'zài shūzhuō qián xiěxìn', en: 'write at the desk',
      secs: 3.4, mins: 25, gain: { rest: 4, mood: 5 }, pose: { type: 'type', seatY: .50 } },
    '扶手椅': { zh: '坐下休息', py: 'zuòxià xiūxi', en: 'sit and rest',
      secs: 3.2, mins: 20, gain: { rest: 11, mood: 5 }, pose: { type: 'sit', seatY: .50 } },
    '观景廊': { zh: '看城市夜景', py: 'kàn chéngshì yèjǐng', en: 'watch the city view',
      secs: 3.0, mins: 15, gain: { mood: 9 }, pose: { type: 'stand' } },
    '西厅': { zh: '在西厅小坐', py: 'zài xītīng xiǎozuò', en: 'sit a while in the west lounge',
      secs: 3.2, mins: 20, gain: { rest: 12, mood: 7 }, pose: { type: 'sit', seatY: .50 } },
  });
})();
