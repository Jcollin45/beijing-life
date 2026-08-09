// 咖啡店 · 一间咖啡 · ONE ROOM COFFEE — floor 1
//
// This tenant's fit-out. Registering a function here overrides the inline `fit` still sitting in
// js/mall.js (see MallFit at the top of that file), so the two can be compared and the old one
// stays as the fallback until this is better than it.
//
// The callback is handed `A`, the shop's own local frame and toolkit. Coordinates are (a, b):
// `a` is depth measured inward from the outside wall, 0 at the back and 4.8 at the shopfront;
// `b` runs along the frontage, 0 at the centre and ±4.3 at the ends. `y` is height above this
// shop's own floor, so the same numbers work on any deck.
//
//   A.put(a,b,dep,wid,h,y,colour,opt)  a box. The third argument is its size along `a` and the
//                                      fourth its size along `b` — depth first, width second,
//                                      which is the opposite way round from how the parameters
//                                      are named where `put` is defined, and has cost time here.
//   A.cyl(a,b,y,r,h,c,opt)             upright cylinder; r is a radius, h a full height
//   A.ball(a,b,y,rx,ry,rz,c,opt)       radii, in WORLD axes: rx runs along b, rz along a
//   A.cap / A.taper (a,b,y,sx,sy,sz,…) full sizes, not radii, and also in world axes
//   A.counter(a,b,wid,dep[,colour,till])  the shell's service counter; brings its own collider
//   A.table(a,b[,seats,r])             a food-court table with chairs — NOT used here, see §8
//   A.glyph(a,b,y,text,opt)            characters on a surface, standing 12 mm proud of `a`
//   A.stop(a0,a1,b0,b1)                a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)    a real light; eight reach the shader and the nearest win
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// The plan of a real one-room café: a service line along the back, a room to stand in, and every
// seat either against a wall or against the glass, because the middle has to stay walkable.
//
//        b -4.3 ....................... 0 ....................... +4.3
//        └── but the unit stops at b -3.58: js/mall.js applies `cut:[.72,0]` so the north-west
//            corner is the jewellers', not this shop's. The west party wall is b -3.66 … -3.50
//            and no café-tag geometry may reach west of b -3.50.  The back-wall run is shortened
//            to the same plane as the customer fixtures; a hidden overhang is still an ownership
//            error from the neighbouring jeweller's view. See §0, §1, §4 and §"the west partition".
//   a 0.5  [ syrups · boiler · grinder · MACHINE · 手冲 ] [自助] [牛奶] [ 咖啡豆 ]  ← back wall
//   a 0.5  [        menu board hung above it          ]              [ plant ]
//   a 1.9  [ counter: pastry case · cake · 取餐 · 点单 ]  ‖lane‖  [ table ·· ]
//   a 2.4                                                ‖    ‖  [ table ·· ] banquette
//   a 3.6  [ 窗边 bar + 3 stools ]                        ‖    ‖  [ 窗边 bar + 3 stools ]
//   a 4.8  ═════════ window ═════════[  DOOR  ]═════════ window ═════════
//
// Three separate stations, which is what makes it operational rather than decorative: you order
// at 点单 (the till, east end of the counter, nearest the door), the drink is made at the machine
// behind, and it comes out at 取餐 — a raised timber hand-off shelf a metre west of the till, so
// the queue and the people waiting for a cup are not standing in the same square metre. The
// self-service bay is the fourth: milk, sugar, lids and stirrers, on the customer side.
//
// Two things set the layout, and both are measurements rather than taste.
//
// The first is the camera. The audit stands in the doorway at a 4.4 looking at the back wall and
// the horizontal half-angle works out at 0.709, so the frame is ±1.5 m at the counter and ±2.8 m
// at the back wall. The cone is a *lot* narrower at the front than at the back: anything on the
// counter past b -1.7 is off the left edge of the picture, which is why the espresso machine is
// on the back bar and not the counter, why the menu board is 1.96 m wide rather than the 2.45 m
// the wall would take, and why there is a self-service bay at all — the middle third of that cone
// is the shell's own timber feature panel, and 2.5 m of empty slatted wood dead centre was the
// single biggest thing wrong with the first version of this room.
//
// The second is the body. The player is a 0.30 m radius and an NPC 0.28, so a lane needs 0.60 m and
// the two that matter are both given more. The customers' lane runs from the door to the back wall
// between the east end of the counter (b -0.52) and the milk fridge (b +0.77) — 1.29 m, and
// nothing, seating or retail or plant pot, is allowed into it.
//
// The *staff* lane is the one that was easy to lose. The corridor behind the counter is bounded by
// the back bar's collider at a 0.82 and the counter's own at a 1.52, and at the counter's first
// position that gap measured 0.52 m — four centimetres less than a body. Nobody notices until you
// try to put a barista in the room: `clampMove` pushes anything with a radius out of a solid, and
// there was no strip of floor behind that counter wide enough to stand a person on. So the counter
// moved out to a 1.94 and lost four centimetres of depth, and the 0.70 m of working aisle that
// leaves is what the two people behind it stand in. Anything that moves the counter or the back bar
// again has to keep (back-bar a1 + 0.28) < (counter a0 − 0.28) true, or the staff vanish.
//
// Everything bright wears `steel` (×1.03, the only value-neutral map) and everything warm wears
// `wood` at a low amount over an already-dark colour, because the maps multiply: `plaster` would
// have turned this joinery beige and `metal` would have turned the machine into a mirror. All of
// them also carry `nrmAmt:.30`. The default is 1, which lays a grey AO-like cloud over a surface
// and is why the first version's timber looked damp.
// =================================================================================================
// 排队 · the shared queue kit, used by three shops
//
// 一间咖啡 (deck 1), 麦香面包 (deck 1) and 半糖甜品 (deck 2) all grew the same fixture at the same
// time: a marked line you stand in, a machine that gives you a number, and a display that calls it.
// Written three times that is three sets of segment maths and three chances to get the digit
// mirroring wrong; written once it is one.
//
// It lives at the top of *this* file rather than in a new js/mall-queue.js because a new shared
// module in js/ is a file nobody owns and index.html's FILES list is not mine to edit. mall-coffee
// loads before mall-bakery and mall-dessert in that list, so the two of them can see this.
//
// ---- the one thing that is easy to get wrong: which way the customer's right hand points.
//
// Every shop is built in its own (a, b) frame, and `b` is a signed distance along the frontage —
// not a screen direction. Whether +b is the customer's left or right depends on which wall the
// unit is on, because the customer always faces the back wall:
//
//     N (咖啡店, 面包店)   customer looks along -z   right = +x = +b
//     S (甜品店)           customer looks along +z   right = -x = -b
//     W                    customer looks along -x   right = -z = -b
//     E                    customer looks along +x   right = +z = +b
//
// A digit is not left-right symmetric — a mirrored 2 is a 5 with the wrong corners — so every
// board asks `MallQueue.right(A)` and multiplies its own `b` offsets by it. `A.yaw` is the shell's
// own per-wall yaw and is the only thing here that knows which wall this is.
const MallQueue = (() => {
  const right = A => (Math.abs(Math.cos(A.yaw)) > .5
    ? (Math.cos(A.yaw) > 0 ? 1 : -1)
    : (Math.sin(A.yaw) > 0 ? -1 : 1));

  // Seven segments in the order A(top) B(upper-right) C(lower-right) D(bottom) E(lower-left)
  // F(upper-left) G(middle), which is the order the strings below are written in. A real 叫号屏
  // in this city is an LED seven-segment panel, so this is the shape rather than a stylisation:
  // a glyph keeps one atlas character, while seven retained bars can change number without replacing
  // geometry. A display whose digits never change is only a photograph of a display.
  const SEG = ['1111110', '0110000', '1101101', '1111001', '0110011',
               '1011011', '1011111', '1110000', '1111111', '1111011'];

  // One digit, built on a plane of constant `a` facing the customer. `w`/`h` are the digit's full
  // size and `t` the stroke; `dir` is the sign from right() above. Every segment is an unlit-mode
  // box, so all twenty-one of a three-digit board are one instance batch with the housing.
  function digit(A, aa, bb, y, w, h, t, dir, off, tag) {
    const hw = (w - t) / 2, hh = (h - t) / 2, vh = hh - t * .70, bar = w - t * 1.7;
    const segs = [];
    const put = (ob, oy, db, dh) => segs.push(A.dynamicVisual(
      A.put(aa, bb + ob * dir, .012, db, dh, y + oy, off, { hard:true, mode:1, glow:.015, tag })));
    put(0,   hh,      bar, t);        // A
    put( hw,  hh / 2, t,   vh);       // B
    put( hw, -hh / 2, t,   vh);       // C
    put(0,  -hh,      bar, t);        // D
    put(-hw, -hh / 2, t,   vh);       // E
    put(-hw,  hh / 2, t,   vh);       // F
    put(0,   0,       bar, t);        // G
    return segs;
  }

  // The call display: a dark housing, a recessed face, three digits and a lamp that flashes for a
  // few seconds each time the number moves on.
  //
  // o: { a, b, y, digits=3, size=.16, on, off, lamp, body, tag, title, titleColor }
  // Returns { set(n), flash(k), segs, lampProp } — `set` only touches the geometry when the value
  // actually changes, so the per-frame cost of a board showing the same number is one comparison.
  function board(A, o) {
    const dir = right(A), tag = o.tag, n = o.digits === undefined ? 3 : o.digits;
    const h = o.size === undefined ? .16 : o.size, w = h * .60, t = h * .16;
    const pitch = w + t * 1.9, span = n * pitch;
    const bw = span + .30, bh = h + .28;
    // Housing, then a face recessed into it, then the digits standing proud of the face. Every
    // step is at least 4 mm, which is this renderer's minimum before two faces start fighting.
    //
    // `bare` skips both and leaves only the digits, for a readout that belongs to a machine the
    // caller has already built — the bakery's scale is a set of numbers on a scale, not a board
    // hung on a scale.
    if (!o.bare) {
      A.put(o.a, o.b, .07, bw + .05, bh + .05, o.y, o.body, { hard:true, gloss:.30, tag });
      A.put(o.a + .030, o.b, .016, bw - .04, bh - .05, o.y, C('#0b0e11'),
        { hard:true, gloss:.14, tag });
    }
    // The title sits on the housing's own head, above the face, so a passer-by knows what the
    // number means without having stood in the queue once already.
    if (o.title && !o.bare)
      A.glyph(o.a + .050, o.b, o.y + bh / 2 - .055, o.title,
        { size:.055, gap:.018, color:o.titleColor || o.on, mode:1, glow:.10, tag });
    const digits = [];
    // i counts from the most significant digit, which is the leftmost one the customer sees. Left
    // is -dir, so the run starts at -span/2 and walks back towards the customer's right.
    for (let i = 0; i < n; i++)
      digits.push(digit(A, o.a + .046, o.b + dir * (-span / 2 + pitch / 2 + i * pitch),
        o.y - .045, w, h, t, dir, o.off, tag));
    // The 请取餐 lamp beside the number. It is the part people actually look at from twelve
    // metres, so it is the only emissive thing on the board that is allowed to be bright. A bare
    // readout has no room for it and does not want one — a set of scales does not blink.
    const lamp = o.bare ? null : A.dynamicVisual(
      A.put(o.a + .046, o.b + dir * (span / 2 + .10), .014, .07, .07, o.y - .045, o.off,
        { hard:true, mode:1, glow:.02, tag }));
    const st = { value:-1, lit:0 };
    return {
      segs:digits, lamp,
      set(v) {
        const q = Math.max(0, Math.floor(v)) % Math.pow(10, n);
        if (q === st.value) return false;
        st.value = q;
        const s = String(q).padStart(n, '0');
        for (let i = 0; i < n; i++) {
          const map = SEG[s.charCodeAt(i) - 48];
          for (let k = 0; k < 7; k++) {
            const p = digits[i][k], hot = map[k] === '1';
            p.color = hot ? o.on : o.off; p.glow = hot ? .20 : .015;
          }
        }
        return true;
      },
      // 0..1. Driven from the shop's own motion callback so the flash is on the mall clock and
      // not on a timer of its own.
      flash(k) { if (!lamp) return; lamp.color = k > .5 ? o.lamp : o.off; lamp.glow = .02 + k * .26; },
      value() { return st.value; },
    };
  }

  // The floor of the queue. Painted stripes rather than posts and a belt, and that is a decision
  // this building has already made once: js/mall-dessert.js pulled a belt barrier out of a 0.93 m
  // walkway because two posts and a webbing strap left 0.35 m on one side of it, and every body in
  // the room — player and NPC — had to clip through. A stripe blocks nothing, costs one box each,
  // and the queue standing on it is made of people, which is what a queue is.
  //
  // o: { a, b, da=0, db, n, y, c, cHead, tag }. Returns the standing spots in (a, b), so the
  // MallCast block at the foot of each file can convert them to world coordinates and stand
  // somebody on every one of them.
  function marks(A, o) {
    const da = o.da || 0, db = o.db || 0, spots = [];
    const along = Math.abs(db) >= Math.abs(da);        // does the queue run along b, or along a?
    const wa = along ? .46 : .10, wb = along ? .10 : .46;
    for (let i = 0; i < o.n; i++) {
      const aa = o.a + da * i, bb = o.b + db * i;
      spots.push([aa, bb]);
      A.put(aa, bb, wa, wb, .008, o.y, i ? o.c : (o.cHead || o.c),
        { hard:true, mode:1, glow:i ? .04 : .09, tag:o.tag });
      // A chevron pointing up the queue, one per gap, so the direction of travel is readable
      // from the door rather than inferred from where the staff are standing.
      //
      // `ry`, not `rz`. A chevron lies in the floor plane and has to be turned about the vertical
      // axis; `rz` tips a flat plate up out of the floor and leaves two blades standing on edge.
      if (i) {
        const ma = aa - da * .5, mb = bb - db * .5;
        for (const s of [-1, 1])
          A.put(ma + (along ? s * .07 : 0), mb + (along ? 0 : s * .07), along ? .13 : .09,
            along ? .09 : .13, .006, o.y, o.c,
            { hard:true, mode:1, glow:.03, ry:s * .62, tag:o.tag });
      }
    }
    return spots;
  }

  // 取号机 — the ticket machine. A slim face with a lit slot, a printed ticket half out of it and
  // a button, built against whatever it is mounted on. `stand:true` gives it a floor pedestal and
  // the caller adds its collider; without it this hangs on a counter face or a wall and needs
  // none, which is how all three of these are fitted.
  //
  // o: { a, b, y, h=.34, body, face, ink, warm, tag, label='取号' }
  function ticket(A, o) {
    const h = o.h === undefined ? .34 : o.h, w = o.w === undefined ? .22 : o.w;
    A.put(o.a, o.b, .05, w, h, o.y, o.body, { hard:true, gloss:.34, tag:o.tag });
    A.put(o.a + .028, o.b, .014, w - .04, h - .05, o.y, o.face, { hard:true, gloss:.20, tag:o.tag });
    A.glyph(o.a + .038, o.b, o.y + h / 2 - .075, o.label === undefined ? '取号' : o.label,
      { size:.048, gap:.016, color:o.warm, mode:1, glow:.12, tag:o.tag });
    // The slot, and the ticket coming out of it. A machine with no paper in it is a box.
    A.put(o.a + .034, o.b, .010, w - .09, .014, o.y - h / 2 + .085, C('#0d1013'),
      { hard:true, gloss:.10, tag:o.tag });
    A.put(o.a + .044, o.b, .006, .062, .052, o.y - h / 2 + .050, o.ink,
      { hard:true, mode:7, gloss:.06, rz:.09, tag:o.tag });
    A.cyl(o.a + .036, o.b + .062, o.y + .010, .016, .014, o.warm,
      { rx:Math.PI / 2, mode:1, glow:.14, tag:o.tag });
    if (o.stand) {
      A.put(o.a - .04, o.b, .16, w + .04, o.y - h / 2, (o.y - h / 2) / 2, o.body,
        { hard:true, gloss:.30, tag:o.tag });
      A.put(o.a - .04, o.b, .20, w + .10, .04, .02, C('#1a1d21'), { hard:true, gloss:.34, tag:o.tag });
    }
  }

  return { right, board, marks, ticket, SEG };
})();

MallFit['咖啡店'] = A => {
  // ---- palette. `col` lives inside the Mall body and cannot be reached from out here, so the
  // colours this shop needs are named again — warmer, and a shade darker than the shell's,
  // because every one of them is about to be multiplied by a texture.
  const c = {
    carc  : C('#43332a'),  // carcass joinery, the darkest timber in the room
    wood  : C('#8a6a49'),  // shelves and the perch
    woodL : C('#a5825a'),
    trim  : C('#2a2d31'),  // matte black, the shell's own trim line
    // Worktops. Started at #d7cfba and came out of the shader as white — the paving map brightens
    // what it is laid over, and a stone top under the counter lights is the biggest pale surface
    // in the room, so it took the whole picture up with it. Two steps down and it is stone again.
    stone : C('#b3a88e'),
    steel : C('#98a1a8'),
    steelD: C('#69727a'),
    chrome: C('#c1c9cf'),
    cream : C('#f0e7d4'),
    warm  : C('#ffe7bd'),
    gold  : C('#e8c66d'),
    brass : C('#b08640'),
    brassD: C('#7d5f2c'),
    jade  : C('#2f7d6f'),
    red   : C('#93342a'),
    rust  : C('#b06034'),
    bean  : C('#35251a'),
    milk  : C('#eceee9'),
    glass : C('#9dc0cf'),
    slate : C('#191d20'),
    // ×1.35 under the tile map, so this comes out about #46564f: a deep green glazed tile. It
    // started as a white one and that was the worst thing in the room — a two-metre band of
    // near-white behind the espresso machine, which is itself pale steel, so the hero object of
    // the shop had no silhouette at all. The machine needs something dark to stand against.
    tile  : C('#34403b'),
    // The floor. The shell lays `col.carpet`, a dusty pink, across every tenant that asks for
    // carpet, and in a room of dark green tile and walnut it read as a nail bar. A slab of warm
    // grey stone over the middle of it, stopping short of the shell's own entrance mat so the
    // threshold still says where the shop begins, with a brass strip over the change.
    floor : C('#4f524c'),
    leaf  : C('#3f7a4b'),
    paper : C('#e0d4b8'),
    kraft : C('#c0a077'),
    choc  : C('#6f4527'),
    berry : C('#a3455a'),
    custd : C('#e6bd5e'),
    // 促销 red, and it is not the same red as anything else in this room. `red` above is the
    // machine's brick lacquer; a Chinese promotional poster is a hotter, more orange red with gold
    // or white on it and nothing else, and printing the two in the same colour makes the sign
    // read as part of the fittings instead of as print stuck over them.
    promo : C('#b8302a'),
    promoD: C('#94211d'),
  };
  // The three colours the call board switches between, built once. A seven-segment display
  // rewrites twenty-one colour references every time the number moves on, and `p.color = C('#…')`
  // is an allocation — three constants and a reference swap is not.
  const SEG_ON = C('#ff7448'), SEG_OFF = C('#2b1410'), SEG_LAMP = C('#8fe39a');
  const Mtimber = { mat:'wood',   matScale:.90, matAmt:.28, nrmAmt:.30 };
  const Mslab   = { mat:'paving', matScale:.72, matAmt:.22, nrmAmt:.30 };
  const Msteel  = { mat:'steel',  matScale:.55, matAmt:.30, nrmAmt:.30 };
  const Mtile   = { mat:'tile',   matScale:.30, matAmt:.22, nrmAmt:.30 };
  const Mfloor  = { mat:'tile',   matScale:.52, matAmt:.24, nrmAmt:.30 };
  const T = A.tag;

  // ---------------------------------------------------------------- small goods
  // The things repeated enough to be worth a name. Each is three or four primitives, because a
  // stack of cups is not a cylinder — it is cups, and you can count them.

  // Cups standing on their rims, the way a café stores them. The taper mesh narrows upwards, so
  // mouth-down comes out the right way round for free.
  const cupStack = (a, b, y, n, cc) => {
    for (let i = 0; i < n; i++)
      A.taper(a, b, y + .030 + i * .058, .094, .058, .094, cc, { gloss:.30, tag:T });
  };
  // A retail bag of beans: a squared-off foil pouch, the top rolled and pinched flat, a kraft
  // label low on the face and a small dark degassing valve above it. The label used to be a white
  // square filling half the face, which turned a shelf of coffee into a shelf of tinned soup.
  const beanBag = (a, b, y, cc, h = .23) => {
    A.put(a, b, .085, .115, h, y + h / 2, cc, { hard:true, mode:7, gloss:.24, tag:T });
    A.put(a, b, .070, .105, .030, y + h + .010, c.trim, { hard:true, gloss:.34, tag:T });
    A.put(a + .048, b, .008, .066, .048, y + h * .38, c.kraft, { hard:true, mode:7, gloss:.12, tag:T });
    A.cyl(a + .050, b, y + h * .70, .011, .010, c.trim, { rx:Math.PI / 2, gloss:.30, tag:T });
  };
  // A mug. The handle goes on the +b side so a row of them all face the same way.
  const mug = (a, b, y, cc) => {
    A.cyl(a, b, y + .046, .042, .092, cc, { gloss:.34, tag:T });
    A.put(a, b + .053, .016, .022, .046, y + .052, cc, { hard:true, gloss:.34, tag:T });
  };
  // A glass jar with beans in it. The first version was an opaque cream cylinder with a lid,
  // which is a tin: what makes a jar a jar is that you can see the beans, so the beans are a
  // solid mass of their own inside a see-through wall.
  const jar = (a, b, y) => {
    A.cyl(a, b, y + .062, .050, .124, c.bean, { gloss:.30, tag:T });
    A.cyl(a, b, y + .075, .058, .150, c.glass, { mode:1, alpha:.24, gloss:.72, tag:T });
    A.cyl(a, b, y + .163, .052, .028, c.trim, { gloss:.45, tag:T });
  };
  // A pour-over dripper standing on a carafe. `taper` narrows *upwards*, so left alone it builds
  // a lampshade — which is exactly what the retail shelf used to be full of, two of them sitting
  // on brown pegs like a pair of bedside lamps. rx:π turns the cone over.
  const dripper = (a, b, y, cc) => {
    A.cyl(a, b, y + .075, .056, .150, c.glass, { mode:1, alpha:.28, gloss:.80, tag:T });
    A.cyl(a, b, y + .155, .062, .014, c.trim, { gloss:.40, tag:T });
    A.taper(a, b, y + .225, .140, .120, .140, cc, { rx:Math.PI, gloss:.34, tag:T });
    A.cyl(a, b, y + .290, .072, .012, c.cream, { gloss:.20, tag:T });      // the paper filter rim
  };
  // A price ticket standing on the front edge of a shelf: 4 cm of card, and the only reason a
  // shelf of goods reads as stock for sale rather than somebody's collection.
  const ticket = (a, b, y, cc = c.cream) =>
    A.put(a, b, .006, .075, .040, y, cc, { hard:true, mode:7, gloss:.10, tag:T });
  // A pot plant: foliage spheres over a tapered pot, with an optional length of stem under them
  // for the tall one. mode 15 is the renderer's own foliage shading — the leaves get a break-up
  // and a translucent edge that a flat green ball never had, and it costs nothing.
  const plant = (a, b, y, r, pot, lift = 0) => {
    A.taper(a, b, y + .095, r * .62, .19, r * .62, pot, { rx:Math.PI, gloss:.28, tag:T });
    A.cyl(a, b, y + .195, r * .40, .020, c.bean, { gloss:.10, tag:T });
    if (lift) A.cyl(a, b, y + .19 + lift / 2, .018, lift, c.carc, { gloss:.2, tag:T });
    for (let k = 0; k < 7; k++)
      A.ball(a + Math.sin(k * 2.4) * r * .55, b + Math.cos(k * 2.4) * r * .60,
             y + .30 + lift + (k % 3) * r * .38, r * .52, r * .44, r * .52, c.leaf,
             { mode:15, gloss:.12, tag:T });
  };
  // A 二维码 — the square that is on every counter and every table in the country. Printed under
  // acrylic and NOT lit: a glowing QR reads as a screen, and half of what makes these legible is
  // that they are matte paper next to gloss. Three finder blocks in the corners and a scatter of
  // cells is the whole silhouette; nobody reads the data, they read the shape.
  //
  // Each block stands 5 mm proud of the one under it. Printed detail is exactly the case where a
  // flush face is tempting and wrong — a 2 mm stack z-fights into a grey mush at four metres.
  const qr = (a, b, y, s) => {
    A.put(a, b, .004, s, s, y, c.slate, { hard:true, mode:7, gloss:.06 });
    for (const [ob, oy] of [[-1, 1], [1, 1], [-1, -1]]) {
      A.put(a + .007, b + ob * s * .31, .004, s * .28, s * .28, y + oy * s * .31, c.cream,
            { hard:true, mode:7, gloss:.06 });
      A.put(a + .012, b + ob * s * .31, .004, s * .12, s * .12, y + oy * s * .31, c.slate,
            { hard:true, mode:7, gloss:.06 });
    }
    for (const [ob, oy] of [[.20, -.20], [-.06, -.31], [.31, .04], [.05, .05]])
      A.put(a + .007, b + s * ob, .004, s * .12, s * .12, y + s * oy, c.cream,
            { hard:true, mode:7, gloss:.06 });
  };
  // 台卡: the little acrylic standee that stands on every counter and every table here — a
  // weighted foot, a clear sleeve, a card in it. 扫码点单 (scan the code to order) is how a café
  // in this city actually takes an order, so this object is not decoration: it is the ordering
  // system, and a Beijing coffee bar without one is a Western coffee bar with Chinese labels.
  const tent = (a, b, y, w, h) => {
    A.put(a - .028, b, .080, w * .80, .012, y + .011, c.chrome, { hard:true, gloss:.62 });
    A.put(a, b, .014, w, h, y + h / 2 + .014, c.chrome, { hard:true, gloss:.58 });
    A.put(a + .011, b, .006, w - .022, h - .020, y + h / 2 + .014, c.cream,
          { hard:true, mode:7, gloss:.14 });
  };

  // ---------------------------------------------------------------- 0 · the floor
  // Stops at a 3.55, short of the shell's entrance mat and the dark threshold band across the
  // opening, so the doorway still reads as a doorway. Everything here is stepped in millimetres
  // off what is under it: the shell's carpet quad is at y .020 and coplanar faces in this
  // renderer fight. The side edges stop 35 mm inside the partition skirtings for the same reason.
  //
  // Not symmetric about b 0, because this unit is not. js/mall.js applies `cut:[.72,0]`, which
  // moves the west partition to b -3.58 and its skirting's inner face to b -3.455; the east one
  // is untouched at b 4.30 / 4.175. So the plate runs b -3.42 … 4.14 — 35 mm inside each — which
  // is centre .36, span 7.56. At the old 8.28 about b 0 its west edge stood at b -4.14, which
  // after the cut is 0.56 m of café floor lying inside the jewellers' shop.
  A.put(1.895, .36, 3.31, 7.56, .024, .040, c.floor, { hard:true, mode:9, gloss:.26, ...Mfloor });
  A.put(3.575, .36, .07, 7.56, .028, .042, c.brassD, { hard:true, gloss:.45 });

  // ---------------------------------------------------------------- 1 · the back bar
  // Against the back wall, west half: tiled splashback, dark base units, a stone top, and the
  // whole of the machinery standing on it where the doorway camera is at its widest.
  // The cut-corner party wall's room face is b -3.50.  b0 -3.47 leaves 30 mm for the wall finish;
  // the worktop's 25 mm end overhang then stops at -3.495 rather than entering the jeweller.
  const WEST_INNER = -3.50;
  const BB = { a:.61, dep:.38, b0:WEST_INNER + .03, b1:-.58 };
  BB.b = (BB.b0 + BB.b1) / 2; BB.wid = BB.b1 - BB.b0;
  const BT = .97;                                     // worktop face

  A.put(.425, BB.b, .05, BB.wid, 1.03, 1.50, c.tile, { hard:true, gloss:.36, ...Mtile });
  A.put(.425, BB.b, .052, BB.wid, .030, 2.030, c.brass, { hard:true, gloss:.55 });   // capping
  A.put(BB.a, BB.b, BB.dep, BB.wid, .78, .51, c.carc, { hard:true, gloss:.20, ...Mtimber });
  A.put(BB.a - .04, BB.b, BB.dep - .10, BB.wid - .08, .14, .09, c.trim, { hard:true, gloss:.24 });
  A.put(BB.a, BB.b, BB.dep + .07, BB.wid + .05, .07, BT - .035, c.stone,
        { hard:true, gloss:.44, ...Mslab });
  // Four cupboard doors, a shadow gap between them, a slim pull on each. The difference between
  // joinery and a plank painted brown is that joinery has joints in it.
  for (let i = 0; i < 4; i++) {
    const bb = BB.b0 + .10 + (BB.wid - .20) * ((i + .5) / 4);
    A.put(BB.a + BB.dep / 2 - .008, bb, .02, (BB.wid - .20) / 4 - .035, .62, .53, c.woodL,
          { hard:true, gloss:.26, ...Mtimber });
    A.put(BB.a + BB.dep / 2 + .012, bb, .02, .30, .022, .80, c.steelD, { hard:true, gloss:.55 });
  }
  A.stop(.40, .82, BB.b0, BB.b1);

  // ---- the espresso machine. The one object that says what the shop is, so it gets more
  // primitives than anything else in the room, and it is built in the order a real one is:
  //
  //   drip tray → a low body → group heads hanging off the *front* of that low body → an upper
  //   body which overhangs them → the coloured cheek on the front of the upper body.
  //
  // That overhang is the whole shape. The first version was one slab of body with the cheek as
  // its outermost face and the group heads set 4 cm *behind* that face — and depth runs outward,
  // so everything that makes a machine legible as a machine was buried inside its own panel. All
  // the room showed was a red box with a white stripe and two lit squares on it, which from the
  // door read as a face.
  const MB = -2.15;
  A.put(.620, MB, .46, .78, .045, BT + .022, c.chrome, { hard:true, gloss:.72, ...Msteel });
  A.put(.620, MB, .38, .70, .014, BT + .052, c.trim, { hard:true, gloss:.50 });    // the grate
  A.put(.540, MB, .34, .72, .17, BT + .130, c.steelD, { hard:true, gloss:.55, ...Msteel });
  A.put(.560, MB, .40, .74, .30, BT + .360, c.steel, { hard:true, gloss:.62, ...Msteel });
  // The cheek. 0.60 m of it across a 0.74 m body left almost no steel showing and the machine
  // read as a red toolbox; 0.42 m leaves a hand's width of polished flank on each side, which is
  // the proportion a two-group machine actually has.
  A.put(.780, MB, .05, .42, .22, BT + .368, c.red, { hard:true, gloss:.55 });
  A.put(.802, MB, .012, .38, .014, BT + .250, c.brass, { hard:true, gloss:.70 });  // line under it
  A.glyph(.808, MB + .085, BT + .40, '一间', { size:.050, gap:.020, color:c.gold, mode:1, glow:.10, tag:T });
  // Pressure gauge, on the steel flank. A `cyl` turned on its side to face the room shades its
  // end cap as a fan of wedges — a white pinwheel, at this size — so the dial is a sphere
  // flattened along the depth axis instead, which has no cap to shade.
  A.ball(.804, MB - .265, BT + .355, .052, .052, .010, c.trim, { gloss:.55, tag:T });
  A.ball(.812, MB - .265, BT + .355, .042, .042, .008, c.cream, { gloss:.35, tag:T });
  A.put(.818, MB - .265, .008, .006, .052, BT + .368, c.red, { hard:true, gloss:.30, rz:.6 });
  for (const s of [-1, 1]) {
    A.cyl(.740, MB + s * .185, BT + .148, .050, .090, c.chrome, { gloss:.70, tag:T });
    A.cyl(.740, MB + s * .185, BT + .086, .030, .048, c.trim, { gloss:.50, tag:T });
    A.cap(.800, MB + s * .185, BT + .076, .019, .19, .019, c.trim,
          { rx:Math.PI / 2, gloss:.42, tag:T });             // portafilter handle, out towards you
    A.ball(.888, MB + s * .185, BT + .076, .026, .026, .026, c.trim, { gloss:.40, tag:T });
    A.cyl(.600, MB + s * .385, BT + .300, .028, .070, c.trim, { gloss:.50, tag:T });  // wand tap
    A.cap(.660, MB + s * .420, BT + .150, .013, .26, .013, c.chrome,
          { rz:s * .32, gloss:.70, tag:T });                 // steam wand
    // The two lit brew switches sit on the front of the *low* body, outboard of the groups. On
    // the cheek they floated a centimetre in front of the group heads and read as eyes.
    A.put(.716, MB + s * .300, .012, .046, .020, BT + .130, c.warm,
          { hard:true, mode:1, glow:.13 });
  }
  A.put(.600, MB, .46, .82, .05, BT + .510, c.chrome, { hard:true, gloss:.68, ...Msteel });
  for (let i = 0; i < 3; i++)
    cupStack(.545, MB - .26 + i * .26, BT + .535, 2, [c.jade, c.cream, c.rust][i]);
  // A small milk pitcher makes the active wand read as equipment in use rather than steam coming
  // out of an empty worktop.  The shared mall steam loop keeps the curl intermittent and skips it
  // completely when this floor/unit is not relevant.
  A.taper(.79, MB + .42, BT + .09, .13, .18, .13, c.chrome, { gloss:.62, tag:T });
  A.cap(.80, MB + .50, BT + .11, .07, .09, .07, c.chrome, { rz:.65, gloss:.62, tag:T });
  A.steam(.79, MB + .42, BT + .19,
    {n:5,height:.44,spread:.17,alpha:.42,speed:.19,duty:.62,phase:.13});

  // ---- grinder: doser body, a hopper of beans, a chute — and the knock box beside it.
  const GB = -2.95;
  A.put(BB.a, GB, .26, .24, .40, BT + .20, c.trim, { hard:true, gloss:.48 });
  A.put(BB.a + .12, GB, .06, .14, .13, BT + .11, c.steelD, { hard:true, gloss:.50, ...Msteel });
  A.taper(BB.a, GB, BT + .50, .21, .20, .21, c.bean, { gloss:.62, tag:T });
  A.cyl(BB.a, GB, BT + .615, .075, .03, c.trim, { gloss:.40, tag:T });
  // The knock box sits east of the grinder.  On its old west side it occupied the compacted
  // hot-water station after the corner was cut.
  A.cyl(BB.a + .02, GB + .34, BT + .085, .085, .17, c.steelD, { gloss:.35, tag:T });
  A.cap(BB.a + .02, GB + .34, BT + .175, .075, .022, .075, c.trim, { gloss:.30, tag:T });

  // ---- hot-water tower, and a row of syrup bottles at the far end.
  const HOT_B = -3.30;
  A.put(BB.a, HOT_B, .30, .34, .52, BT + .26, c.steelD, { hard:true, gloss:.50, ...Msteel });
  A.put(BB.a + .16, HOT_B, .03, .22, .10, BT + .34, c.warm, { hard:true, mode:1, glow:.12 });
  A.cyl(BB.a + .05, HOT_B, BT + .055, .05, .11, c.chrome, { gloss:.60, tag:T });
  for (let i = 0; i < 3; i++) {
    const bb = -3.44 + i * .13;
    A.cyl(BB.a - .06, bb, BT + .095, .034, .19, [c.choc, c.rust, c.cream][i], { gloss:.5, tag:T });
    A.cyl(BB.a - .06, bb, BT + .205, .014, .04, c.trim, { gloss:.40, tag:T });
  }

  // ---- 手冲. The board says 手冲 ¥35, so somewhere in the room there has to be something to make
  // it on: a timber board at the service end with two drippers on carafes, a gooseneck kettle and
  // a set of scales. This is also the length of back bar nearest the till, which is what a
  // customer standing at the counter is actually looking at.
  const HB = -1.16;
  A.put(BB.a + .02, HB, .34, .80, .035, BT + .017, c.carc, { hard:true, gloss:.24, ...Mtimber });
  dripper(BB.a + .02, HB - .26, BT + .035, c.cream);
  dripper(BB.a + .02, HB + .00, BT + .035, c.jade);
  A.cyl(BB.a + .04, HB + .28, BT + .130, .072, .19, c.steelD, { gloss:.55, tag:T });    // kettle
  A.cap(BB.a + .04, HB + .28, BT + .245, .100, .05, .100, c.steelD, { gloss:.55, tag:T });
  A.cap(BB.a + .13, HB + .32, BT + .215, .009, .22, .009, c.steelD,
        { rz:.9, rx:.5, gloss:.60, tag:T });                                          // gooseneck
  A.put(BB.a - .02, HB + .28, .05, .08, .10, BT + .140, c.trim, { hard:true, gloss:.40 });
  A.put(BB.a - .12, HB - .32, .16, .18, .022, BT + .028, c.trim, { hard:true, gloss:.45 });
  A.put(BB.a - .08, HB - .32, .05, .09, .008, BT + .043, c.warm,
        { hard:true, mode:1, glow:.10 });                                             // scales

  // ---- clean cups and clean saucers at the east end, where the bar runs out.
  //
  // There was a pot plant standing here, at b -0.90 and 0.30 m of foliage above a 0.97 worktop, and
  // it was wrong from the one camera that matters. Nothing overlapped in plan: the leaves stopped
  // at b -0.80 and the 自助 fascia starts at b -0.70. But the fascia is at a 0.45 and the plant at
  // a 0.61, and the doorway camera is a projection rather than a plan — from a 4.4 the nearer
  // object covers the further one, so a bush 16 cm in front of the fascia's west end sat squarely
  // across the top of it and the two read as one green-and-black smear. Clearance in `a` is not
  // clearance. A stack of saucers and a folded cloth is what is on the end of a real bar anyway,
  // and at 6 cm tall it cannot cover anything.
  cupStack(BB.a - .02, -.82, BT, 4, c.cream);
  cupStack(BB.a + .11, -.82, BT, 3, c.jade);
  for (let i = 0; i < 6; i++)
    A.cyl(BB.a - .01, -1.02, BT + .008 + i * .012, .072, .012, c.cream, { gloss:.34, tag:T });
  A.put(BB.a + .12, -1.02, .11, .14, .022, BT + .012, c.jade, { hard:true, mode:7, gloss:.08 });

  // ---------------------------------------------------------------- 2 · shelf over the back bar
  // Set forward at a .47–.77 so the goods on it stand *in front of* the menu board hung behind,
  // rather than through it. Nothing over 0.20 m tall goes east of b -2.95, because from the door
  // that is where the board's two text columns begin and a row of jars would stand in the prices.
  const SH = 1.90;
  A.put(.62, BB.b, .30, BB.wid, .045, SH, c.wood, { hard:true, gloss:.24, ...Mtimber });
  for (let i = 0; i < 4; i++)
    A.put(.57, BB.b0 + .16 + i * ((BB.wid - .32) / 3), .20, .035, .34, SH - .19, c.steelD,
          { hard:true, gloss:.45, ...Msteel });
  for (let i = 0; i < 5; i++)
    beanBag(.66, -3.36 + i * .18, SH + .022, [c.bean, c.jade, c.red, c.choc][i % 4],
            .19 + (i % 3) * .02);
  for (let i = 0; i < 2; i++) jar(.66, -2.42 + i * .16, SH + .022);
  for (let i = 0; i < 8; i++)
    mug(.66, -2.12 + i * .13, SH + .022, [c.cream, c.jade, c.rust][i % 3]);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++)
    A.cyl(.66, -1.08 + k * .18, SH + .034 + i * .020, .078, .020, c.cream,
          { gloss:.34, tag:T });

  // ---------------------------------------------------------------- 3 · the menu board
  // Slate, framed in the shell's own black, with a picture light over it. The prices are the
  // point: a board with lorem on it is a prop, a board with 拿铁 ¥26 on it is something you can
  // read, and reading it is what this whole game is.
  //
  // Width is set by the camera, not by the wall. The frame runs b -2.84 to -0.76, which puts its
  // west edge just inside the left of the doorway shot and leaves 10 cm between its east edge and
  // the shell's own gold 一间咖啡 on the timber panel. Two and a half metres of board — what the
  // back bar would take — hangs the item column outside the picture and leaves a row of prices
  // with nothing to buy against them.
  const MN = { a:.51, b:-1.80, wid:1.96, y:2.59, h:1.20 };
  A.put(MN.a - .03, MN.b, .05, MN.wid + .12, MN.h, MN.y, c.trim, { hard:true, gloss:.22 });
  A.put(MN.a + .03, MN.b, .05, MN.wid, MN.h - .12, MN.y, c.slate, { hard:true, gloss:.14 });
  A.put(.70, MN.b, .14, 1.60, .05, MN.y + MN.h / 2 + .10, c.trim, { hard:true, gloss:.30 });
  A.put(.70, MN.b, .10, 1.48, .04, MN.y + MN.h / 2 + .055, c.warm,
        { hard:true, mode:1, glow:.26 });                        // picture light over the board
  const GA = MN.a + .075;                                        // 2 cm proud of the board face
  const GS = .125, GG = .040;
  const lft = n => (MN.b - MN.wid / 2 + .12) + (n * (GS + GG) - GG) / 2;
  const rgt = n => (MN.b + MN.wid / 2 - .12) - (n * (GS + .012) - .012) / 2;
  A.glyph(GA, MN.b, 2.98, '咖啡单', { size:.145, gap:.045, color:c.gold, mode:1, glow:.14, tag:T });
  A.put(GA - .01, MN.b, .02, 1.72, .012, 2.87, c.gold, { hard:true, mode:1, glow:.10 });
  [['美式', '¥22'], ['拿铁', '¥26'], ['卡布奇诺', '¥28'], ['手冲', '¥35'], ['热巧克力', '¥28']]
    .forEach(([zh, px], i) => {
      const y = 2.73 - i * .155;
      A.glyph(GA, lft(zh.length), y, zh, { size:GS, gap:GG, color:c.cream, mode:1, glow:.07, tag:T });
      A.glyph(GA, rgt(px.length), y, px, { size:GS, gap:.012, color:c.gold, mode:1, glow:.09, tag:T });
    });

  // ------------------------------------------------------------- 3b · 促销, the offer of the week
  // The loudest difference between a coffee bar in Beijing and one anywhere else is how much
  // print is on the wall. 第二杯半价 — half price on the second cup — is the offer every chain in
  // the city runs, and a red-and-gold band of it over the shop's own name is the single biggest
  // cultural tell available for four primitives and five characters.
  //
  // Printed, not lit. 1.44 × 0.42 is 0.6 m² and the glow pass is additive over area, so an
  // emissive field this size is a lamp hung on the back wall: the red is an ordinary surface at
  // gloss .16 and the only thing that emits is the pair of 12 mm gold hairlines, which is exactly
  // the case the .18–.24 band is for.
  //
  // Two measurements set it, and neither is taste. Width 1.44 rather than the feature panel's
  // 3.61: the menu board's frame starts at b -0.76 and stands 3 cm further out, so anything wider
  // than this disappears behind it from the door. Height 2.50 rather than 2.30: the milk fridge's
  // own fascia tops out at y 2.07 at a 0.86, and the sightline from the doorway camera's eye to
  // the bottom edge of this banner has to clear it — at 2.30 the fridge cuts the bottom row of
  // strokes off, and clearance in plan is not clearance in a projection.
  const PR = { a:.44, b:.02, wid:1.44, h:.42, y:2.50 };
  A.put(PR.a, PR.b, .04, PR.wid, PR.h, PR.y, c.promo, { hard:true, gloss:.16 });
  A.put(PR.a + .036, PR.b, .012, PR.wid - .07, PR.h - .05, PR.y, c.promoD,
        { hard:true, mode:7, gloss:.10 });
  for (const oy of [-.158, .158])
    A.put(PR.a + .046, PR.b, .012, PR.wid - .18, .012, PR.y + oy, c.gold,
          { hard:true, mode:1, glow:.18 });
  A.glyph(PR.a + .054, PR.b, PR.y, '第二杯半价',
          { size:.155, gap:.045, color:c.gold, mode:1, glow:.12, tag:T });

  // ---------------------------------------------------------------- 4 · the counter
  // The shell's own millwork, so this shop's till, its 收银台 label and its "how much is it"
  // prompt are the same three things every other tenant in the building has. The accent colour is
  // passed straight through because `counter` matches on it to pick timber grain over plaster,
  // and it brings its own collider.
  //
  // Set at b -2.28 rather than the middle of the bar so that the till furniture the shell hangs
  // off the +b end of it — terminal, screen, customer-side reader — lands between b -0.6 and
  // -1.3, which is the only length of counter the doorway camera can see at all.
  //
  // At a 1.94 and 0.84 deep rather than a 1.78 and 0.88: see the note at the top about the staff
  // lane. Fourteen centimetres of customer floor bought a corridor two people can work in, and the
  // till's own `th` moved out with it — its focus lands at a 4.36, which the player reaches from
  // anywhere inside a 2.66, so the counter is still usable from a stride in front of it.
  //
  // The west end is where the unit stops, not where `len` says. js/mall.js applies `cut:[.72,0]`,
  // so the west party wall is at b -3.66 … -3.50 (x -18.16 … -18.00), its skirting's inner face
  // is at b -3.455 and its collider's east face at b -3.48. The carcass now stops at b -3.44 and
  // the helper's 60 mm stone overhang stops exactly at the inner wall plane, b -3.50. The old
  // b -2.28 / wid 3.52 ran
  // the body to b -4.04 and the top to -4.10, which is x -18.60 — through the jewellers'
  // shopfront.
  //
  // Only the west end moves: b + wid/2 is -0.52 before and after, so the shell's till block, its
  // screen, the card reader and the 点单 glyph all hang off the same east end they always did.
  const CT = { a:1.94, b:-1.98, wid:2.92, dep:.84 };
  A.counter(CT.a, CT.b, CT.wid, CT.dep, A.acc);
  const CTOP = .98;

  // ---- pastry case: steel plinth, glass box, two lit shelves and things on them worth ¥8. It
  // stands at the barista end of the run, where it is the first thing you are level with once you
  // have walked up to the counter, and where it is not between the doorway and the machine — the
  // first version put a 0.55 m case on a 0.98 m top squarely in that sightline, and the hero
  // object of the whole shop ended up behind a fridge door of its own making.
  //
  // It moves east with the counter's west end, and it is the piece js/mall.js measured reaching
  // x -18.28 through the jewellers' glass panes: the widest part of it is the 0.96 m steel cap,
  // so at the old b -3.30 it ran to b -3.78. At -3.02 it runs exactly to b -3.50. The westmost
  // pastry is then at b -3.34 and clears the wall, so nothing on the shelves is cut in half by it.
  // Its east end lands at b -2.54 and
  // the cake dome's base is at -2.65, so the two still stand 90 mm apart and the dome, the cup
  // stacks and everything else on the top stay exactly where they were.
  const PB = -3.02;
  A.put(CT.a, PB, .64, .94, .06, CTOP + .03, c.steelD, { hard:true, gloss:.50, ...Msteel });
  for (const sh of [0, 1]) {
    const y = CTOP + .13 + sh * .20;
    A.put(CT.a, PB, .58, .88, .022, y, c.paper, { hard:true, gloss:.30 });
    for (let i = 0; i < 4; i++) {
      const bb = PB - .32 + i * .21, k = (i + sh) % 4, aa = CT.a - .07 + (i % 2) * .13;
      if (k === 0) {                                            // a croissant, on the diagonal
        A.cap(aa, bb, y + .046, .034, .16, .034, c.rust,
              { ry:.5, rz:Math.PI / 2, mode:7, gloss:.20, tag:T });
        for (const s of [-1, 1])
          A.ball(aa + s * .052, bb + s * .030, y + .040, .026, .022, .026, c.rust,
                 { mode:7, gloss:.18, tag:T });
      } else if (k === 1) {                                     // 蛋挞, an egg tart
        A.taper(aa, bb, y + .022, .062, .036, .062, c.kraft,
                { rx:Math.PI, mode:7, gloss:.16, tag:T });
        A.cyl(aa, bb, y + .046, .050, .014, c.custd, { gloss:.28, tag:T });
      } else if (k === 2) {                                     // a scored bun
        A.ball(aa, bb, y + .050, .070, .044, .056, c.choc, { mode:7, gloss:.16, tag:T });
        A.put(aa, bb, .014, .080, .008, y + .092, c.cream, { hard:true, mode:7, gloss:.10 });
      } else {                                                  // a slice of cake on a plate
        A.cyl(aa, bb, y + .008, .062, .012, c.cream, { gloss:.34, tag:T });
        A.put(aa, bb, .088, .072, .062, y + .046, c.berry, { mode:7, gloss:.14, rz:.06, tag:T });
        A.put(aa, bb, .090, .074, .010, y + .080, c.cream, { hard:true, mode:7, gloss:.10 });
      }
      ticket(CT.a + .296, bb, y + .026, c.paper);
    }
  }
  A.put(CT.a, PB, .56, .84, .028, CTOP + .485, c.warm, { hard:true, mode:1, glow:.13 });
  A.put(CT.a, PB, .60, .90, .50, CTOP + .28, c.glass, { hard:true, mode:1, alpha:.13, gloss:.90 });
  A.put(CT.a, PB, .66, .96, .05, CTOP + .555, c.steelD, { hard:true, gloss:.55, ...Msteel });

  // ---- the till end of the top, which is the counter the doorway actually sees: a cake stand
  // under a glass dome, a card reader on a stalk, a tip jar with coins in it, a takeaway cup and
  // lid dispenser. The small change of a service counter, and the difference between a till and a
  // black box sitting on a plank. Everything here shuffled west when the hand-off shelf below
  // claimed b -1.95 to -1.05: the dome used to stand at b -1.72, which is now inside it.
  const DM = -2.50;
  A.cyl(CT.a - .02, DM, CTOP + .019, .150, .026, c.steelD, { gloss:.55, tag:T });
  A.cyl(CT.a - .02, DM, CTOP + .052, .028, .050, c.steelD, { gloss:.55, tag:T });
  A.cyl(CT.a - .02, DM, CTOP + .075, .165, .026, c.stone, { gloss:.42, tag:T, ...Mslab });
  for (let i = 0; i < 3; i++)
    A.cyl(CT.a - .02 + Math.sin(i * 2.1) * .06, DM + Math.cos(i * 2.1) * .06,
          CTOP + .114, .052, .050, [c.berry, c.choc, c.custd][i], { mode:7, gloss:.16, tag:T });
  A.ball(CT.a - .02, DM, CTOP + .223, .165, .135, .165, c.glass,
         { mode:1, alpha:.16, gloss:.90, tag:T });                            // the dome
  A.cyl(CT.a - .02, DM, CTOP + .372, .022, .034, c.brass, { gloss:.60, tag:T });
  A.put(CT.a + .26, -.86, .06, .10, .10, CTOP + .05, c.trim, { hard:true, gloss:.40 });
  A.put(CT.a + .26, -.86, .05, .09, .12, CTOP + .155, c.trim, { hard:true, gloss:.40, rz:.22 });
  A.put(CT.a + .285, -.86, .012, .066, .080, CTOP + .165, c.warm,
        { hard:true, mode:1, glow:.12, rz:.22 });                            // card reader
  // The tip jar, moved west off b -0.84 to make room for the 外卖 tier below: two objects on the
  // same 0.34 m of counter is one object with a cylinder growing out of it.
  A.cyl(CT.a - .14, -1.08, CTOP + .075, .058, .150, c.glass, { mode:1, alpha:.24, gloss:.85, tag:T });
  for (let i = 0; i < 3; i++)
    A.cyl(CT.a - .14, -1.08, CTOP + .022 + i * .012, .040, .012, c.gold, { gloss:.60, tag:T });
  // ---- 外卖. A café here runs as much through delivery as through its own door, and the orders
  // waiting for a rider are a fixture of the counter rather than a thing that happens off-stage:
  // bagged, folded over, stapled shut with the ticket under the staple, on their own low tier at
  // the end of the run so they are not in among the cups being handed to people standing here.
  //
  // The band goes 1.5 cm proud of both the riser's front face and the stone cap's, because they
  // are flush with each other at a 1.91 and a face laid on either of them stripes.
  A.put(1.76, -.80, .30, .34, .09, CTOP + .045, c.carc, { hard:true, gloss:.24, ...Mtimber });
  A.put(1.76, -.80, .30, .38, .025, CTOP + .102, c.stone, { hard:true, gloss:.44, ...Mslab });
  A.put(1.925, -.80, .014, .30, .056, CTOP + .046, c.promo, { hard:true, gloss:.30 });
  A.glyph(1.930, -.80, CTOP + .046, '外卖',
          { size:.044, gap:.018, color:c.gold, mode:1, glow:.14, tag:T });
  for (const [bb, cc] of [[-.905, c.kraft], [-.700, c.paper]]) {
    A.put(1.745, bb, .11, .135, .17, CTOP + .200, cc, { hard:true, mode:7, gloss:.10, tag:T });
    A.put(1.745, bb, .05, .135, .022, CTOP + .296, cc, { hard:true, mode:7, gloss:.10, tag:T });
    A.put(1.802, bb, .006, .058, .040, CTOP + .262, c.cream, { hard:true, mode:7, gloss:.08, tag:T });
    A.put(1.806, bb, .004, .030, .006, CTOP + .296, c.steelD, { hard:true, gloss:.50 });
  }
  // ---- 二维码台卡, on the customer side of the top where a hand reaches it. Scan to order, scan
  // to pay: the two coloured chips under the code are the two wallets everybody here uses, left
  // unlettered because this shop is not allowed to wear anybody's brand. It stands at b -0.70 —
  // the shell's own till block claims b -0.55 to -0.25 and a card standing inside a monolith is
  // half a card.
  tent(2.13, -.70, CTOP, .20, .27);
  qr(2.152, -.70, CTOP + .195, .110);
  A.put(2.150, -.745, .004, .034, .016, CTOP + .095, c.jade, { hard:true, gloss:.24 });
  A.put(2.150, -.655, .004, .034, .016, CTOP + .095, c.glass, { hard:true, gloss:.24 });
  A.glyph(2.150, -.70, CTOP + .048, '扫码点单',
          { size:.036, gap:.009, color:c.promo, mode:1, glow:.08, tag:T });
  cupStack(CT.a - .12, -2.24, CTOP, 4, c.cream);
  cupStack(CT.a - .12, -2.06, CTOP, 3, c.kraft);
  for (let i = 0; i < 4; i++)
    A.cyl(CT.a - .12, -1.88, CTOP + .014 + i * .022, .056, .022, c.trim, { gloss:.40, tag:T });
  // The shell's own till marker is a 1.02 m black block standing on the counter; it is what the
  // 收银台 label and prompt hang off, so it stays, but from the doorway it was a monolith. Naming
  // its customer-facing face turns it into a till. The block's face sits at a CT.a+0.50 now that
  // the counter is 0.84 deep, and a glyph stands 12 mm proud of whatever `a` it is given.
  A.glyph(CT.a + .492, CT.b + CT.wid / 2 - .02, 1.235, '点单',
          { size:.085, gap:.032, color:c.gold, mode:1, glow:.13, tag:T });

  // ---------------------------------------------------------------- 4b · 取餐, the hand-off
  // A café with one point of contact is a vending machine with a person in it. You order at the
  // till, which the shell puts at the east end where the queue arrives; the drink is made behind;
  // and it is put out *here*, on a raised timber shelf a metre west of the till, so that whoever is
  // waiting for a flat white is not standing in the way of whoever is paying. That separation is
  // the single most legible thing about a modern coffee bar and it costs one riser and four cups.
  //
  // 110 mm high and no more. The doorway camera's eye is at y 1.5 and 3.85 m from the espresso
  // machine's drip tray; the sightline to it passes y 1.22 at this shelf's depth, so a hand-off
  // that stood any taller would hide the hero object of the room behind its own service.
  const HO = { a:CT.a + .28, b:-1.50, wid:1.10, dep:.48 };
  A.put(HO.a, HO.b, HO.dep, HO.wid, .11, CTOP + .055, c.carc,
        { hard:true, gloss:.24, ...Mtimber });
  A.put(HO.a, HO.b, HO.dep + .04, HO.wid + .06, .035, CTOP + .128, c.stone,
        { hard:true, gloss:.44, ...Mslab });
  // The name band. The riser's own front face is at CT.a+0.52 and the stone cap's at CT.a+0.54, so
  // the band sits at CT.a+0.535 — five millimetres proud of the timber and clear of the cap in y.
  // Anything flush with either of them z-fights; four millimetres is the minimum step in this
  // renderer and it is not a guideline.
  A.put(CT.a + .535, HO.b, .02, HO.wid - .06, .075, CTOP + .050, c.trim,
        { hard:true, gloss:.32 });
  A.glyph(CT.a + .541, HO.b, CTOP + .050, '取餐',
          { size:.062, gap:.024, color:c.gold, mode:1, glow:.13, tag:T });
  const HY = CTOP + .146;                                   // the surface things stand on
  // What is standing on it: two takeaway cups capped and sleeved, a tall glass of iced coffee with
  // a straw, a paper bag folded over at the top, and a napkin holder. Four orders' worth, which is
  // what a bar this size has out at two in the afternoon.
  for (const [bb, cc] of [[-1.86, c.paper], [-1.62, c.kraft]]) {
    A.cyl(HO.a - .06, bb, HY + .056, .045, .112, cc, { gloss:.28, tag:T });
    A.cyl(HO.a - .06, bb, HY + .100, .049, .038, c.kraft, { gloss:.16, tag:T });   // the sleeve
    A.cyl(HO.a - .06, bb, HY + .120, .048, .016, c.trim, { gloss:.36, tag:T });    // the lid
  }
  A.cyl(HO.a - .06, -1.38, HY + .070, .039, .140, c.choc, { gloss:.36, tag:T });
  A.cyl(HO.a - .06, -1.38, HY + .075, .044, .150, c.glass,
        { mode:1, alpha:.22, gloss:.85, tag:T });
  A.cap(HO.a - .04, -1.36, HY + .175, .006, .13, .006, c.cream, { rz:.22, gloss:.30, tag:T });
  A.put(HO.a + .04, -1.14, .10, .12, .17, HY + .085, c.kraft,
        { hard:true, mode:7, gloss:.10, tag:T });                                   // paper bag
  A.put(HO.a + .04, -1.14, .04, .12, .022, HY + .180, c.kraft,
        { hard:true, mode:7, gloss:.10, tag:T });
  A.put(HO.a + .06, -1.90, .09, .11, .045, HY + .022, c.steelD, { hard:true, gloss:.45 });
  A.put(HO.a + .06, -1.90, .07, .09, .030, HY + .055, c.cream, { hard:true, mode:7, gloss:.08 });
  // 温馨提示 — the "kind reminder" notice, which in a Chinese shop is its own genre of print and
  // is never absent from a surface that hands over something hot. Yellow card, black rule, three
  // characters. It sits at the east end of the shelf where the hand goes, not where the eye does.
  A.put(2.290, -1.02, .070, .092, .010, HY + .011, c.steelD, { hard:true, gloss:.50 });
  A.put(2.318, -1.02, .012, .108, .078, HY + .052, c.trim, { hard:true, gloss:.26 });
  A.put(2.329, -1.02, .006, .096, .066, HY + .052, c.custd, { hard:true, mode:7, gloss:.12 });
  A.glyph(2.334, -1.02, HY + .052, '小心烫',
          { size:.027, gap:.008, color:c.trim, mode:1, glow:.05, tag:T });

  // ---------------------------------------------------------------- 4c · 定制, the order you build
  // Every drink in this country is ordered as four choices after the name of it — 中杯 / 热的 /
  // 燕麦奶 / 半糖 — and until now this shop had a price list and no way to learn any of that. The
  // four columns go on the customer face of the counter, which is the one surface in the room that
  // is (a) blank, (b) at reading distance from where you actually order, and (c) not competing
  // with the menu board or the machine for the doorway shot.
  //
  // Three numbers fix it and none of them is taste. The face is at a 2.36 and the band stands at
  // 2.372 — 5 mm proud, because a face laid flush on the carcass stripes. The stone top's underside
  // is at y 0.90 and the shell's own lit strip runs y 0.575–0.625, so the band lives in the 0.275 m
  // between them: centre 0.765, height 0.25. And it stops at b -1.35 because the shell's till block
  // and this shop's 外卖 tier own everything east of that.
  //
  // West end: b -3.50, exactly the cut-corner room plane. At the old wid 2.40 the band ran to
  // b -3.75 — 0.09 m past the wall's west face, on
  // a carcass that is no longer under it, and the last four props of this shop still standing in
  // the jewellers' window after the counter itself had been shortened.
  //
  // The four columns and the hairlines between them are laid out from `b + wid/2`, which is
  // -1.35 before and after, so none of the text moves. Only the blank west end of the band went.
  const DEF = { a:2.372, b:-2.425, wid:2.15, y:.765, h:.25 };
  A.put(DEF.a, DEF.b, .014, DEF.wid, DEF.h, DEF.y, c.slate, { hard:true, mode:7, gloss:.10 });
  A.put(DEF.a + .006, DEF.b, .008, DEF.wid - .04, DEF.h - .03, DEF.y, C('#1e2429'),
        { hard:true, mode:7, gloss:.08 });
  for (const oy of [-.111, .111])
    A.put(DEF.a + .010, DEF.b, .008, DEF.wid - .10, .008, DEF.y + oy, c.brass,
          { hard:true, mode:1, glow:.10 });
  A.glyph(DEF.a + .014, DEF.b, .855, '自己搭配一杯',
          { size:.040, gap:.014, color:c.gold, mode:1, glow:.09, tag:T });
  // Heading in gold, the choices under it in cream. Two option lines rather than one long row:
  // 小 中 大 read across is a size chart, 全脂 over 燕麦 reads as a choice of one.
  [['杯型', '小 中 大', '大杯加4元'],
   ['温度', '热',       '冰'],
   ['牛奶', '全脂',     '燕麦'],
   ['糖度', '半糖',     '无糖']].forEach(([head, o1, o2], i) => {
    const bb = DEF.b + DEF.wid / 2 - .32 - i * .55;
    A.glyph(DEF.a + .014, bb, .778, head, { size:.044, gap:.014, color:c.gold, mode:1, glow:.07, tag:T });
    A.glyph(DEF.a + .014, bb, .712, o1, { size:.034, gap:.011, color:c.cream, mode:1, glow:.05, tag:T });
    A.glyph(DEF.a + .014, bb, .667, o2, { size:.034, gap:.011, color:c.cream, mode:1, glow:.05, tag:T });
    // A hairline between columns, so four groups read as four and not as one paragraph.
    if (i) A.put(DEF.a + .010, bb + .275, .008, .006, DEF.h - .08, DEF.y, c.brassD,
                 { hard:true, gloss:.30 });
  });
  // ---- and the two offers, in the red-and-gold every promotion in this city is printed in. These
  // are the shop's loyalty scheme and its cup discount, said where you are standing when they
  // matter: 自带杯减3元 is the line on the counter of every chain in Beijing, and 集章 is the card.
  A.put(DEF.a, -.95, .014, .78, DEF.h, DEF.y, c.promo, { hard:true, gloss:.16 });
  A.put(DEF.a + .006, -.95, .008, .72, DEF.h - .04, DEF.y, c.promoD, { hard:true, mode:7, gloss:.10 });
  A.glyph(DEF.a + .014, -.95, .818, '自带杯减3元',
          { size:.038, gap:.012, color:c.gold, mode:1, glow:.12, tag:T });
  A.glyph(DEF.a + .014, -.95, .722, '集章满十送一',
          { size:.036, gap:.011, color:c.cream, mode:1, glow:.08, tag:T });

  // ---------------------------------------------------------------- 4d · 集章卡, and the cup pen
  // The loyalty card is a physical object here rather than a number in a save file: a block of
  // cards in an acrylic holder, a rubber stamp standing on its own ink pad, and one card lying
  // face up with the stamped circles on it. It sits at a 1.62 — the only clear pocket left on this
  // counter top, between the cup stacks at 1.82 and the top's west edge at 1.47 — which is also
  // where a stamp belongs, because the person holding it is standing behind the counter.
  const LY = 1.64;
  A.put(LY, -1.70, .13, .16, .030, CTOP + .015, c.trim, { hard:true, gloss:.42 });   // ink pad
  A.put(LY, -1.70, .10, .13, .012, CTOP + .036, c.promoD, { hard:true, mode:7, gloss:.14 });
  A.cyl(LY, -1.70, CTOP + .062, .028, .040, c.carc, { gloss:.26, tag:T, ...Mtimber }); // the stamp
  A.cyl(LY, -1.70, CTOP + .104, .016, .048, c.woodL, { gloss:.30, tag:T });
  A.ball(LY, -1.70, CTOP + .136, .026, .020, .026, c.carc, { gloss:.26, tag:T });
  A.put(LY + .02, -1.50, .10, .13, .075, CTOP + .038, c.chrome, { hard:true, gloss:.60 });
  for (let i = 0; i < 5; i++)                                        // the block of blank cards
    A.put(LY + .02, -1.50, .085, .115, .004, CTOP + .012 + i * .006, c.cream,
          { hard:true, mode:7, gloss:.08, tag:T });
  // One card lying face up with its ten circles, six of them stamped. Printed detail, so every
  // layer steps 4 mm and nothing is emissive: a glowing loyalty card is a phone screen.
  A.put(LY - .01, -1.31, .086, .118, .003, CTOP + .0035, c.cream,
        { hard:true, mode:7, gloss:.08, tag:T });
  for (let i = 0; i < 10; i++)
    A.cyl(LY - .038 + (i % 5) * .019, -1.348 + ((i / 5) | 0) * .038, CTOP + .0065, .0065, .002,
          i < 6 ? c.promo : c.kraft, { gloss:.10, tag:T });
  // The cup pen and the roll of order stickers. This is how the order gets a name on it: the till
  // prints a number, the barista writes what you asked for beside it, and the board calls the
  // number. Two objects, and they are the whole reason 取餐 works at all.
  A.cap(CT.a + .16, -1.02, HY + .016, .008, .13, .008, c.trim,
        { rz:Math.PI / 2, ry:.5, gloss:.44, tag:T });
  A.cyl(CT.a + .30, -1.02, HY + .020, .038, .040, c.paper, { gloss:.14, tag:T });
  A.cyl(CT.a + .30, -1.02, HY + .022, .014, .044, c.steelD, { gloss:.48, tag:T });

  // ---------------------------------------------------------------- 4e · the queue, and the board
  // Painted on the floor rather than fenced. See the note over MallQueue at the top of this file:
  // this building has already tried posts and webbing in a shop of this width and taken them out
  // again. Three standing places at a 2.78 — 0.42 m clear of the counter's collider at 2.36, which
  // leaves 0.14 for a 0.28 m body — running back from the till at b -0.60. Pitch 0.66 rather than
  // 0.60: two standing bodies are 0.56 m apart before they push each other, and four centimetres
  // of margin is not a queue, it is two people wearing the same coat. They stop at b -1.92 because
  // the west window bar's outermost stool stands at a 3.02, b -2.66 and a fourth place would put
  // somebody's shoulder through it.
  const QUEUE = MallQueue.marks(A, { a:2.78, b:-.60, db:-.66, n:3, y:.057,
                                     c:c.brassD, cHead:c.gold, tag:T });
  // 叫号屏. On the tiled splashback at the service end of the back bar, in the 0.43 m band between
  // the worktop's clutter (nothing above y 1.20 there) and the shelf at 1.88. It is the backmost
  // plane in the room, so it can hide nothing behind it, and it sits below the menu board's frame
  // at 1.99 rather than in front of it.
  //
  // Seven-segment because it has to change. A glyph keeps one atlas character, while this retained
  // set of bars can advance the number in place — see MallQueue.board.
  const CALL = MallQueue.board(A, {
    a:.49, b:-.95, y:1.60, digits:3, size:.15,
    on:SEG_ON, off:SEG_OFF, lamp:SEG_LAMP, body:c.trim, tag:T,
    title:'取餐叫号', titleColor:c.gold });
  const callPower=A.powerDisplay
    ?A.powerDisplay([CALL.segs,CALL.lamp],{id:'call-board'}):{active:true};

  // ---------------------------------------------------------------- 5 · the self-service bay
  // Dead centre of the back wall, under the shell's gold 一间咖啡. Everything else in this shop is
  // pushed to one side or the other by the counter, so from the doorway the middle third of the
  // picture was two and a half metres of empty slatted timber. A milk-and-sugar station is what a
  // café actually puts there; it is low enough that the shop's own name stays legible above it;
  // and it is on the customer side of the counter, which is where the fixture belongs.
  const SS = { a:.62, b:.03, dep:.40, wid:1.34 }, ST = .92;
  A.put(SS.a, SS.b, SS.dep, SS.wid, .76, .48, c.carc, { hard:true, gloss:.20, ...Mtimber });
  A.put(SS.a - .04, SS.b, SS.dep - .10, SS.wid - .08, .12, .07, c.trim, { hard:true, gloss:.24 });
  A.put(SS.a, SS.b, SS.dep + .06, SS.wid + .05, .06, ST - .03, c.stone,
        { hard:true, gloss:.44, ...Mslab });
  for (const ob of [-.34, .34]) {
    A.put(SS.a + SS.dep / 2 - .008, SS.b + ob, .02, .58, .52, .56, c.woodL,
          { hard:true, gloss:.26, ...Mtimber });
    A.put(SS.a + SS.dep / 2 + .012, SS.b + ob, .02, .26, .022, .78, c.steelD,
          { hard:true, gloss:.55 });
  }
  // On the top: a water urn with a tap and a lit switch, a cup tube, lids, napkins, a caddy of
  // sugar sachets, a jar of stirrers and a milk jug.
  A.cyl(SS.a - .02, SS.b - .48, ST + .175, .105, .35, c.steelD, { gloss:.55, tag:T, ...Msteel });
  A.cap(SS.a - .02, SS.b - .48, ST + .360, .210, .06, .210, c.steelD, { gloss:.55, tag:T });
  A.put(SS.a + .10, SS.b - .48, .05, .06, .07, ST + .085, c.trim, { hard:true, gloss:.45 });
  A.put(SS.a + .12, SS.b - .48, .02, .05, .022, ST + .175, c.warm, { hard:true, mode:1, glow:.12 });
  A.cyl(SS.a - .02, SS.b - .21, ST + .165, .050, .33, c.glass, { mode:1, alpha:.22, gloss:.80, tag:T });
  for (let i = 0; i < 5; i++)
    A.taper(SS.a - .02, SS.b - .21, ST + .050 + i * .052, .088, .052, .088, c.cream,
            { gloss:.28, tag:T });
  for (let i = 0; i < 4; i++)
    A.cyl(SS.a - .02, SS.b + .00, ST + .014 + i * .022, .056, .022, c.trim, { gloss:.40, tag:T });
  A.put(SS.a - .02, SS.b + .19, .12, .15, .05, ST + .026, c.trim, { hard:true, gloss:.35 });
  A.put(SS.a - .02, SS.b + .19, .10, .13, .020, ST + .060, c.cream, { hard:true, mode:7, gloss:.10 });
  A.put(SS.a + .02, SS.b + .40, .10, .18, .07, ST + .036, c.woodL,
        { hard:true, gloss:.26, ...Mtimber });
  for (let i = 0; i < 3; i++)
    A.put(SS.a + .02, SS.b + .34 + i * .06, .07, .045, .014, ST + .078,
          [c.cream, c.kraft, c.cream][i], { hard:true, mode:7, gloss:.10 });
  A.cyl(SS.a - .07, SS.b + .56, ST + .045, .036, .090, c.glass, { mode:1, alpha:.26, gloss:.8, tag:T });
  for (let i = 0; i < 4; i++)
    A.cap(SS.a - .07 + Math.sin(i * 1.9) * .012, SS.b + .56 + Math.cos(i * 1.9) * .012,
          ST + .075, .003, .16, .003, c.kraft, { rz:.10 * (i - 1.5), gloss:.20, tag:T });
  A.cyl(SS.a + .07, SS.b + .58, ST + .070, .048, .140, c.chrome, { gloss:.66, tag:T });
  A.put(SS.a + .07, SS.b + .63, .014, .040, .066, ST + .082, c.chrome, { hard:true, gloss:.66 });

  // ---- 杯具回收 · 垃圾 · the other half of self service --------------------------------------
  // The two existing lower doors already occupy the footprint and already have the collider. A
  // jade horizontal return slot and a rust circular waste port sit 11–29 mm proud of those faces,
  // still inside the collider's outward edge at a .86. Shape and colour separate them without
  // glyph draws; the used tray and cup on the top explain what the left opening accepts.
  //
  // Ten matte primitives, two existing mesh signatures (box/cylinder), no glow, alpha, light,
  // callback or stop. The tray begins four centimetres beyond the napkin caddy in depth and stays
  // inside the stone top, so it neither intersects the service stock nor borrows aisle width.
  const returnPut = (role, a, b, da, db, h, y, cc) => {
    const p = A.put(a, b, da, db, h, y, cc,
      { hard:true, mode:7, gloss:.06, tag:T });
    p.mallCoffeeReturn = role; return p;
  };
  const returnCyl = (role, a, b, y, radius, height, cc, rz=0) => {
    const p = A.cyl(a, b, y, radius, height, cc,
      { mode:7, gloss:.06, rz, tag:T });
    p.mallCoffeeReturn = role; return p;
  };
  returnPut('cup-panel', .838, -.31, .010, .430, .180, .550, c.jade);
  returnPut('waste-panel', .838, .37, .010, .430, .180, .550, c.rust);
  returnPut('cup-slot', .845, -.31, .006, .250, .050, .560, c.slate);
  returnCyl('waste-rim', .845, .37, .560, .062, .006, c.cream, Math.PI / 2);
  returnCyl('waste-slot', .849, .37, .560, .050, .004, c.slate, Math.PI / 2);
  returnPut('used-tray', .770, .20, .140, .200, .010, .928, c.trim);
  returnPut('tray-lip', .706, .20, .014, .200, .026, .946, c.trim);
  returnCyl('used-cup', .780, .20, .982, .040, .094, c.kraft);
  returnCyl('used-sleeve', .780, .20, .982, .041, .035, c.rust);
  returnCyl('used-inside', .780, .20, 1.032, .033, .004, c.slate);
  // A black fascia over it, the same one the fridge and the retail unit wear. Three of them across
  // the back wall is what makes the east half read as one shopfit instead of three objects, and
  // dead centre of the doorway shot it is the horizontal that holds the middle of the picture
  // together. Hung at 1.48 so the shell's gold 一间咖啡 at 1.82–2.08 is still clear of it.
  A.put(.45, SS.b, .10, SS.wid + .12, .22, 1.48, c.trim, { hard:true, gloss:.32 });
  A.glyph(.505, SS.b, 1.48, '自助', { size:.125, gap:.05, color:c.gold, mode:1, glow:.12, tag:T });
  A.stop(SS.a - SS.dep / 2, SS.a + SS.dep / 2 + .04, SS.b - SS.wid / 2, SS.b + SS.wid / 2);

  // ---------------------------------------------------------------- 6 · the milk fridge
  // A glass-fronted upright, east of the shop name. Built as a carcass — back, two sides, top and
  // plinth — and NOT as one box, which is what it was: a solid 0.44 m slab of steel from a 0.38 to
  // a 0.82, with every shelf and every carton modelled *inside* it. Depth runs outward, so all
  // four shelves and sixteen items were behind their own front panel, and what two metres of this
  // wall showed was a closed roller shutter with 牛奶 written over it.
  const FR = { a:.60, b:1.20, dep:.44, wid:.86 };
  A.put(FR.a - .19, FR.b, .06, FR.wid, 1.86, .93, c.steelD, { hard:true, gloss:.40, ...Msteel });
  for (const s of [-1, 1])
    A.put(FR.a, FR.b + s * (FR.wid / 2 - .03), FR.dep, .06, 1.86, .93, c.steelD,
          { hard:true, gloss:.40, ...Msteel });
  A.put(FR.a, FR.b, FR.dep, FR.wid, .08, 1.82, c.steelD, { hard:true, gloss:.40, ...Msteel });
  A.put(FR.a, FR.b, FR.dep, FR.wid, .14, .07, c.trim, { hard:true, gloss:.30 });
  A.put(FR.a - .15, FR.b, .02, FR.wid - .12, 1.58, .96, C('#cfe4ea'),
        { hard:true, mode:1, glow:.06 });                        // the lit back of the cabinet
  for (let sh = 0; sh < 4; sh++) {
    const y = .34 + sh * .40;
    A.put(FR.a + .02, FR.b, FR.dep - .12, FR.wid - .10, .022, y, c.steel,
          { hard:true, gloss:.50, ...Msteel });
    for (let i = 0; i < 4; i++) {
      const bb = FR.b - .29 + i * .19, cc = [c.milk, c.rust, c.jade, c.milk][(i + sh) % 4];
      if (sh === 3 || sh === 1) {                                // cartons of milk
        A.put(FR.a + .02, bb, .10, .115, .26, y + .15, c.milk, { hard:true, gloss:.22, tag:T });
        A.put(FR.a + .02, bb, .07, .085, .06, y + .30, [c.jade, c.rust][i % 2],
              { hard:true, gloss:.28, tag:T });
      } else {                                                   // bottles
        A.cyl(FR.a + .02, bb, y + .12, .050, .22, cc, { gloss:.50, tag:T });
        A.cyl(FR.a + .02, bb, y + .255, .024, .06, c.trim, { gloss:.45, tag:T });
      }
    }
    ticket(FR.a + .175, FR.b - .30 + sh * .05, y + .026, c.paper);
  }
  // The door. Alpha this low is barely a pane, but it is the difference between a fridge full of
  // milk and a locker — and it now has something behind it to be in front of.
  A.put(FR.a + .215, FR.b, .02, FR.wid - .08, 1.66, .96, c.glass,
        { hard:true, mode:1, alpha:.08, gloss:.90 });
  for (const s of [-1, 1])
    A.put(FR.a + .225, FR.b + s * (FR.wid / 2 - .04), .04, .06, 1.66, .96, c.steel,
          { hard:true, gloss:.55 });
  A.cap(FR.a + .255, FR.b + FR.wid / 2 - .13, 1.30, .016, .50, .016, c.steelD, { gloss:.55, tag:T });
  A.put(FR.a, FR.b, FR.dep + .04, FR.wid + .04, .22, 1.96, c.trim, { hard:true, gloss:.32 });
  A.glyph(FR.a + .245, FR.b, 1.96, '牛奶',
          { size:.115, gap:.04, color:c.cream, mode:1, glow:.10, tag:T });
  A.stop(FR.a - FR.dep / 2, FR.a + .26, FR.b - FR.wid / 2, FR.b + FR.wid / 2);

  // ---------------------------------------------------------------- 7 · retail: 咖啡豆
  // Beans, mugs and brew kit on an open timber unit, stocked in runs rather than one object every
  // half metre, which reads as a museum case rather than a shop. Four things separate this from a
  // wardrobe with things on it: a dark back so the goods have something to stand against, a lit
  // line under every shelf, a black header board with the department's name on it — the same
  // fascia the fridge wears, so the two read as one shopfit — and a price ticket per run.
  const RS = { a:.58, b:2.95, dep:.36, wid:2.20 };
  A.put(RS.a - .16, RS.b, .04, RS.wid, 2.02, 1.01, c.carc, { hard:true, gloss:.16, ...Mtimber });
  A.put(RS.a - .13, RS.b, .02, RS.wid - .08, 1.94, 1.01, c.slate, { hard:true, gloss:.10 });
  for (const s of [-1, 1])
    A.put(RS.a, RS.b + s * RS.wid / 2, RS.dep, .05, 2.02, 1.01, c.carc,
          { hard:true, gloss:.18, ...Mtimber });
  A.put(RS.a, RS.b, RS.dep + .04, RS.wid + .10, .05, 2.04, c.wood,
        { hard:true, gloss:.26, ...Mtimber });
  A.put(RS.a, RS.b, RS.dep - .06, RS.wid - .10, .12, .06, c.trim, { hard:true, gloss:.26 });
  A.put(RS.a + .02, RS.b, RS.dep + .06, RS.wid + .10, .24, 2.20, c.trim, { hard:true, gloss:.32 });
  A.glyph(RS.a + .225, RS.b, 2.20, '咖啡豆',
          { size:.125, gap:.045, color:c.gold, mode:1, glow:.12, tag:T });
  for (const yy of [.845, 1.285, 1.725, 2.005])
    A.put(RS.a + .13, RS.b, .02, RS.wid - .16, .014, yy, c.warm, { hard:true, mode:1, glow:.11 });
  for (let sh = 0; sh < 4; sh++) {
    const y = .44 + sh * .44;
    A.put(RS.a, RS.b, RS.dep, RS.wid - .10, .042, y, c.wood, { hard:true, gloss:.24, ...Mtimber });
    if (sh === 0 || sh === 2) {
      for (let i = 0; i < 9; i++)
        beanBag(RS.a + .04, RS.b - .92 + i * .23, y + .021,
                [c.bean, c.red, c.jade, c.choc, c.rust][(i + sh) % 5], .20 + ((i * 7) % 3) * .025);
      ticket(RS.a + .186, RS.b - .70, y + .042);
      ticket(RS.a + .186, RS.b + .48, y + .042);
    } else if (sh === 1) {
      for (let i = 0; i < 8; i++)
        mug(RS.a + .04, RS.b - .88 + i * .25, y + .021, [c.cream, c.jade, c.rust, c.paper][i % 4]);
      for (let i = 0; i < 3; i++) jar(RS.a + .04, RS.b - .96 + i * .13, y + .021);
      ticket(RS.a + .186, RS.b - .34, y + .042);
    } else {
      for (let i = 0; i < 3; i++)
        dripper(RS.a + .04, RS.b - .78 + i * .40, y + .021, [c.cream, c.jade, c.rust][i]);
      for (let i = 0; i < 5; i++) beanBag(RS.a + .04, RS.b + .20 + i * .19, y + .021, c.bean, .21);
      ticket(RS.a + .186, RS.b - .58, y + .042);
    }
  }
  A.stop(RS.a - RS.dep / 2 - .10, RS.a + .22, RS.b - RS.wid / 2, RS.b + RS.wid / 2);

  // ---------------------------------------------------------------- 8 · seating
  // Built here rather than through `A.table`, which is the food court's. That helper brings four
  // fully saturated moulded-plastic chairs in rotation and dresses half its tables with a tray, a
  // bowl of noodles and a pair of chopsticks laid across the rim — the right furniture for the
  // third floor and the wrong furniture for a café. A coffee shop with a bowl of noodles on every
  // other table is a canteen, and from the concourse the pink and baby-blue seats were the
  // loudest thing in the unit. Nothing is lost by leaving it: the crowd only ever sits on
  // `foodSeats` tagged 美食广场 on deck three, so these chairs were never sat in anyway.
  //
  // Eleven seats, and every one of them against something, because the middle of a 4.8 m unit has
  // to stay walkable and a chair with its back to open floor is a chair somebody trips over:
  //
  //   * a banquette down the east partition with two tables and two chairs in front of it — four
  //     covers, the way a room this narrow seats a group without putting anything in the lane;
  //   * a window bar in each half of the glass, three stools each, facing out at the concourse.
  //
  // The window bars are the point. The café's completion line is 在窗边坐着喝完 — "you drink it
  // sitting by the window" — and until there was somewhere to do that the sentence described
  // furniture the shop did not own. They also use the one part of the plan nothing else can: the
  // strip between a 3.35 and a 3.77, which is too shallow for a table and is dead against the
  // shell's own display platform, whose back edge is at a 3.655 and whose top is only 0.34 high.
  // A ledge at 1.06 passes clean over it on posts that stand in front of it.
  const chair = (a, b, face) => {
    A.put(a, b, .44, .44, .05, .445, c.carc, { round:.03, gloss:.20, ...Mtimber });
    A.put(a, b, .40, .40, .022, .478, c.jade, { mode:7, gloss:.10, tag:T });
    A.put(a, b - face * .19, .40, .05, .46, .68, c.carc, { round:.03, gloss:.18, ...Mtimber });
    A.put(a, b - face * .19, .34, .07, .05, .885, c.carc, { round:.02, gloss:.22, ...Mtimber });
    for (const oa of [-.17, .17]) for (const ob of [-.17, .17])
      A.cyl(a + oa, b + ob, .245, .020, .385, c.trim, { gloss:.42, tag:T });
  };
  const cafeTable = (a, b, r) => {
    A.cyl(a, b, .082, .190, .060, c.trim, { gloss:.45, tag:T });
    A.cyl(a, b, .414, .055, .604, c.trim, { gloss:.50, tag:T });
    A.cyl(a, b, .690, r - .020, .050, c.carc, { gloss:.24, tag:T, ...Mtimber });
    A.cyl(a, b, .745, r, .060, c.stone, { gloss:.42, tag:T, ...Mslab });
    A.stop(a - r, a + r, b - r, b + r);
  };
  // A bar stool. The pad tops out at 0.788, which is the number the window-bar sitters at the foot
  // of this file carry as `seatY`: the sit pose derives the whole leg from it, and a stool given
  // the bench's 0.46 seats somebody a third of a metre inside their own seat.
  const stool = (a, b, pad) => {
    A.cyl(a, b, .077, .155, .050, c.trim, { gloss:.40, tag:T });
    A.cyl(a, b, .410, .038, .620, c.steelD, { gloss:.50, tag:T });
    A.cyl(a, b, .280, .110, .028, c.steelD, { gloss:.45, tag:T });                // foot ring
    A.cyl(a, b, .742, .160, .045, c.carc, { gloss:.26, tag:T, ...Mtimber });
    A.cyl(a, b, .776, .150, .024, pad, { mode:7, gloss:.10, tag:T });
  };
  // A window counter: a timber ledge at 1.06 on two slim steel posts, with a brass foot rail.
  // No collider on the ledge or on the stools, and that is a decision rather than an omission.
  // The till's own focus point sits at a 4.36, so the player has to be able to get within 1.7 m of
  // it — and a 0.42 m box at a 3.35 with a 0.30 m body radius sterilises the floor from a 3.05 out
  // to the glass across the whole west half. A ledge you can walk under is worth more than a
  // collider that makes the shop's own till unreachable. Same reasoning the stools already had.
  const winBar = (b0, b1, pad, seats) => {
    const bm = (b0 + b1) / 2, w = b1 - b0;
    A.put(3.56, bm, .42, w, .055, 1.032, c.wood, { hard:true, gloss:.28, ...Mtimber });
    for (const bb of [b0 + .24, b1 - .24]) {
      A.cyl(3.60, bb, .012, .080, .024, c.trim, { gloss:.40, tag:T });
      A.cyl(3.60, bb, .508, .028, .968, c.steelD, { gloss:.52, tag:T });
      A.cyl(3.60, bb, .215, .020, .040, c.brass, { gloss:.60, tag:T });
    }
    A.cap(3.60, bm, .215, .019, w - .40, .019, c.brass,
          { rz:Math.PI / 2, gloss:.62, tag:T });                                  // foot rail
    for (const bb of seats) stool(3.02, bb, pad);
  };

  // ---- the east side: banquette, two tables, two chairs.
  // The banquette stops at a 2.90 rather than running the full depth, because the east window
  // bar's outermost stool stands at a 3.02 and two seats 3 cm apart is one seat and a mistake.
  const BQ = { a:2.075, b:4.03, len:1.65 };
  A.put(BQ.a, BQ.b, BQ.len, .38, .34, .19, c.carc, { hard:true, gloss:.20, ...Mtimber });
  A.put(BQ.a, BQ.b, BQ.len + .04, .38, .08, .420, c.rust, { mode:7, gloss:.10, tag:T });
  A.put(BQ.a, 4.145, BQ.len + .04, .13, .52, .720, c.rust, { mode:7, gloss:.10, tag:T });
  for (let i = 0; i < 4; i++)
    A.put(1.49 + i * .39, 4.065, .06, .04, .04, .720, c.carc, { gloss:.20, tag:T });
  for (const aa of [1.29, 2.86])
    A.put(aa, 4.03, .10, .38, .30, .560, c.carc, { round:.03, gloss:.22, ...Mtimber });
  A.stop(1.24, 2.92, 3.83, 4.22);
  cafeTable(1.55, 3.42, .34);
  cafeTable(2.45, 3.42, .34);
  chair(1.55, 2.72, +1);
  chair(2.45, 2.72, +1);
  // What is left on a café table: a cup on a saucer, a takeaway cup with the lid on, a phone face
  // down on a napkin. Not a bowl of noodles. Everything stands 4 mm proud of the 0.775 top: two
  // faces at the same height in this renderer fight, and a saucer is exactly that case.
  A.cyl(1.67, 3.30, .786, .078, .015, c.cream, { gloss:.34, tag:T });
  A.taper(1.67, 3.30, .836, .110, .085, .110, c.cream, { gloss:.30, tag:T });
  A.put(1.44, 3.56, .11, .14, .012, .784, c.paper, { hard:true, mode:7, ry:.40 });
  A.put(1.46, 3.55, .075, .012, .145, .793, c.trim, { hard:true, ry:.40, gloss:.45 });
  A.cyl(2.57, 3.30, .826, .043, .100, c.paper, { gloss:.28, tag:T });
  A.cyl(2.57, 3.30, .883, .046, .014, c.trim, { gloss:.34, tag:T });
  A.cyl(2.34, 3.55, .784, .068, .014, c.cream, { gloss:.34, tag:T });
  A.taper(2.34, 3.55, .812, .088, .042, .088, c.kraft, { rx:Math.PI, mode:7, gloss:.16, tag:T });
  A.cyl(2.34, 3.55, .838, .070, .014, c.custd, { gloss:.28, tag:T });             // an egg tart
  A.put(2.62, 3.62, .12, .16, .010, .783, c.kraft, { hard:true, mode:7, ry:-.30 });

  // ---- the two window bars. They replace the wall-facing perch that used to stand on the west
  // partition, which seated two people looking at a plasterboard wall 0.4 m from their nose in a
  // shop with eight metres of glass in front of it.
  //
  // The stool positions are given rather than derived, because both ends are constrained and no
  // even spacing hits either. East: the outermost seat has to clear the banquette's arm at b 3.83.
  //
  // West: **the west 0.60 m of this unit is not this unit.** 咖啡店 is shop('N',-14.5,8.6), so it
  // runs x -18.8 to -10.2; 珠宝店 next door is shop('W',-12.6,8.0), which occupies x -23.0 to -18.2
  // over z -16.6 to -8.6. The two overlap by 0.6 m of plan, and what stands in the overlap is the
  // jewellers' shopfront — a glazing collider at b -4.05..-3.55 running from a 1.40 to a 3.90, plus
  // their south partition below it. It is in `solids` and `clampMove` pushes bodies out of it, so a
  // stool written at b -3.86 seats somebody 0.84 m inside somebody else's window. The perch that
  // used to stand here was in the same strip and got away with it only by having no collider and
  // nobody sitting on it. Two seats on the west, therefore, both east of b -3.30, and nothing of
  // this shop that has a person in it goes west of that line. (Reported, not worked around: the
  // overlap is the shell's, in js/mall.js, and it is not this tenant's to move.)
  winBar(-3.48, -1.88, c.rust, [-3.22, -2.66]);
  winBar(1.86, 4.20, c.jade, [2.32, 3.00, 3.64]);
  // and what is on them. A window counter with nothing on it is a shelf.
  mug(3.50, -3.34, 1.062, c.jade);
  A.put(3.44, -2.92, .13, .17, .012, 1.066, c.paper, { hard:true, mode:7, ry:.20 });
  A.put(3.46, -2.94, .085, .012, .150, 1.075, c.trim, { hard:true, ry:.20, gloss:.45 });
  A.cyl(3.50, -2.54, 1.122, .043, .100, c.paper, { gloss:.28, tag:T });
  A.cyl(3.50, -2.54, 1.179, .046, .014, c.trim, { gloss:.34, tag:T });
  A.cyl(3.50, 2.32, 1.077, .078, .015, c.cream, { gloss:.34, tag:T });
  A.taper(3.50, 2.32, 1.127, .110, .085, .110, c.jade, { gloss:.30, tag:T });
  A.cyl(3.50, 3.00, 1.132, .039, .120, c.choc, { gloss:.36, tag:T });
  A.cyl(3.50, 3.00, 1.137, .044, .130, c.glass, { mode:1, alpha:.22, gloss:.85, tag:T });
  A.put(3.44, 3.62, .15, .19, .014, 1.067, c.kraft, { hard:true, mode:7, ry:-.24 });
  A.put(3.42, 3.60, .10, .13, .010, 1.079, c.paper, { hard:true, mode:7, ry:-.24 });

  // ---- 学习角. The east end of the west window bar is the shop's study perch, and it is the one
  // fixture here that is a game mechanic rather than dressing: 书桌 in the global USE table is
  // 复习 — "review your notes", a seated action worth fourteen mood — and 书架 is 看书. Neither
  // had anywhere in this building to happen. An open notebook, a pen, a stack of cards and a caddy
  // of the shop's own loan books is what makes those two verbs describe something that is here.
  //
  // b -2.40 .. -1.94, which is the stretch of the west ledge nothing else uses: the mug is at
  // -3.34, the napkin and phone at -2.92, the iced coffee at -2.54, and the ledge itself runs out
  // at -1.88. Nothing of this goes west of b -3.30 — see the note beside winBar about the
  // jewellers' shopfront standing in the overlap.
  const SB = 3.50, SY = 1.0595;
  // The notebook, open, ruled, with a line of writing already on the left-hand page.
  A.put(SB - .03, -2.34, .22, .30, .008, SY + .006, c.cream, { hard:true, mode:7, ry:.16 });
  A.put(SB - .03, -2.42, .21, .13, .004, SY + .012, C('#e6ddc6'), { hard:true, mode:7, ry:.16 });
  for (let i = 0; i < 4; i++)
    A.put(SB - .10 + i * .046, -2.42, .006, .10, .002, SY + .015, c.steelD,
          { hard:true, mode:7, ry:.16 });
  A.cap(SB + .04, -2.31, SY + .012, .006, .13, .006, c.jade, { rz:Math.PI / 2, ry:.9, gloss:.42, tag:T });
  // Flashcards, banded. Every learner in this city carries a deck of these.
  for (let i = 0; i < 6; i++)
    A.put(SB + .05, -2.16, .062, .092, .003, SY + .004 + i * .0045, c.paper,
          { hard:true, mode:7, ry:-.22, tag:T });
  A.put(SB + .05, -2.16, .066, .020, .028, SY + .018, c.rust, { hard:true, mode:7, ry:-.22 });
  // The caddy of loan books, standing on the ledge against the glass so it is read from the
  // concourse as well as from the stool.
  A.put(SB + .06, -1.99, .17, .30, .022, SY + .011, c.carc, { hard:true, gloss:.24, ...Mtimber });
  for (const s of [-1, 1])
    A.put(SB + .06, -1.99 + s * .145, .17, .022, .17, SY + .107, c.carc,
          { hard:true, gloss:.24, ...Mtimber });
  for (let i = 0; i < 6; i++)
    A.put(SB + .06, -2.11 + i * .046, .145, .038, .21 - (i % 3) * .022, SY + .128 - (i % 3) * .011,
          [c.jade, c.rust, c.brassD, c.cream, c.red, c.carc][i],
          { hard:true, mode:7, gloss:.12, rz:i === 5 ? .16 : 0, tag:T });

  // ---- 发财树, the money tree, in the one square metre of floor nothing else wants: between the
  // milk fridge and the bean shelf, a metre out from the back wall, where from the doorway it
  // stands in the gap the two fixtures leave and stops the east half reading as two cabinets and
  // a slab.
  //
  // It was in a plain dark pot, which is a houseplant. What makes it a 发财树 rather than a plant
  // is the pot: lacquer red, a gold rim, and 福 on the front of it — the one every shop in the
  // country stands by its till on the day it opens and never moves again. One primitive and one
  // character, and it is the cheapest cultural detail in this file.
  plant(1.20, 1.70, .052, .28, c.promo, .40);
  A.cyl(1.20, 1.70, .228, .094, .026, c.gold, { gloss:.58, tag:T });
  A.glyph(1.278, 1.70, .150, '福', { size:.062, color:c.gold, mode:1, glow:.12, tag:T });
  A.stop(.96, 1.44, 1.46, 1.94);

  // ---- the west partition. The shell hangs one blank lit panel on each of them between a 1.63 and
  // a 2.97 and leaves the rest bare, which from inside the shop is a grey rectangle floating on a
  // beige wall. Two framed prints where the panel is not, and a clock between them.
  //
  // WW is the west partition's inner face, and the partition moved: `cut:[.72,0]` in js/mall.js
  // puts it at b -3.66 … -3.50. WW is inset so even the frame's 20 mm depth stops at b -3.49;
  // the clock stands farther into the room on the same datum. At the old -4.02 the prints hung
  // in mid-air 0.6 m *inside the jewellers' shop*, the deepest café geometry in the building at
  // x -18.84, and neither was visible from this room at all.
  const WW = -3.28;
  for (const [aa, hh] of [[1.10, .54], [3.86, .44]]) {
    A.put(aa, WW - .19, hh, .04, hh * 1.24, 1.92, c.trim, { hard:true, gloss:.24 });
    A.put(aa, WW - .145, hh - .07, .02, hh * 1.24 - .07, 1.92, c.kraft,
          { hard:true, mode:7, gloss:.12 });
  }
  // and one on the east partition, over the head of the banquette, where the shell's panel stops.
  A.put(1.12, 4.21, .46, .04, .56, 1.92, c.trim, { hard:true, gloss:.24 });
  A.put(1.12, 4.165, .39, .02, .49, 1.92, c.kraft, { hard:true, mode:7, gloss:.12 });
  // A clock. Same trick as the machine's gauge: flattened spheres rather than cylinders on their
  // side, because a `cyl` end cap shades as a fan of wedges when you look straight at it.
  //
  // `A.ball` does not go through the shop's `dim`, so its three radii are world x, y, z whatever
  // wall the unit is on — and this unit is on the north wall, where b is world x and a is world
  // z. A disc hung on the *west partition* faces ±x and must therefore be thin in **x**. These
  // were written .150, .150, .020, which is thin in z: the dial stood edge-on in its own wall,
  // 0.30 m of it driven through the plasterboard, while the two hands below (0.11 in a, 0.010 in
  // b) were built the right way round and faced the room. The gauge on the espresso machine is
  // thin in z correctly — that one hangs on a face pointing down the shop's depth.
  A.ball(2.30, WW - .170, 2.88, .020, .150, .150, c.trim, { gloss:.40, tag:T });
  A.ball(2.30, WW - .150, 2.88, .012, .126, .126, c.cream, { gloss:.20, tag:T });
  A.put(2.32, WW - .138, .11, .010, .012, 2.912, c.trim, { hard:true, rx:.75, gloss:.30 });
  A.put(2.265, WW - .138, .09, .010, .012, 2.845, c.trim, { hard:true, rx:-.9, gloss:.30 });
  A.ball(2.30, WW - .136, 2.88, .008, .014, .014, c.trim, { gloss:.4, tag:T });

  // ---------------------------------------------------------------- 9 · the window
  // The shell stands two plinths of cups in each half of the glass, at b ±2.28 and ±3.52. The
  // 0.80 m gap between them is the part of a café window a passer-by actually reads, and it is
  // the only part of the platform this shop is free to dress: a low timber plinth of retail bags
  // with a slate card leaning against it.
  for (const s of [-1, 1]) {
    A.put(4.16, s * 2.90, .50, .72, .34, .515, c.carc, { hard:true, gloss:.22, ...Mtimber });
    A.put(4.16, s * 2.90, .52, .74, .03, .700, c.trim, { hard:true, gloss:.40 });
    for (let i = 0; i < 3; i++)
      beanBag(4.16, s * (2.66 + i * .16), .715, [c.bean, c.red, c.jade][i], .24);
    A.put(4.16, s * 3.16, .05, .22, .30, .865, c.slate, { hard:true, gloss:.14, rz:s * .06 });
  }

  // ---------------------------------------------------------------- 10 · pendants
  // On flex, with a lit disc inside each shade. Only eight `A.light`s reach the shader, so the
  // shades are geometry and the light behind them is declared once, below. The bulb is a sphere
  // and the glow pass is additive, so a sphere concentrates what a strip would spread: 0.30 on
  // these put a hard white ball in the middle of the doorway shot, and .14 is the ceiling for one.
  //
  // The two over the counter are at b -1.05 and -2.80 rather than anywhere else along it, because
  // a 0.30 m shade at a 1.94 projects onto 0.44 m of the menu board behind it, and from b -1.05
  // that lands squarely in the gutter between the board's item column and its price column.
  //
  // The four over the seating hang lower and smaller. A 0.30 m shade at 2.30 is a dining pendant;
  // over a 0.42 m window ledge it is a hat, and two of them 0.7 m apart close the top of the glass
  // off from inside. 0.19 across at 1.94 is the fitting a window counter actually gets.
  const pendant = (a, b, y, cc, s = 1) => {
    A.cap(a, b, (y + .10 * s + 3.55) / 2, .009, 3.55 - y - .10 * s, .009, c.trim,
          { gloss:.30, tag:T });
    A.taper(a, b, y, .30 * s, .19 * s, .30 * s, cc, { gloss:.34, tag:T });
    A.cyl(a, b, y - .085 * s, .13 * s, .03, c.warm, { mode:1, glow:.26, tag:T });
    A.ball(a, b, y - .125 * s, .045, .05, .045, c.warm, { mode:1, glow:.14, tag:T });
  };
  pendant(CT.a, -1.05, 2.14, c.trim);
  pendant(CT.a, -2.80, 2.14, c.trim);
  pendant(1.55, 3.42, 2.30, c.red);
  pendant(2.45, 3.42, 2.30, c.red);
  for (const bb of [-3.22, -2.66, 2.32, 3.64]) pendant(3.52, bb, 1.94, c.brassD, .62);

  // ---------------------------------------------------------------- 11 · light
  // Six of this shop's own. Eight reach the shader and the nearest to the camera win, so standing
  // inside this unit these are the eight, minus the shell's own lamp hung outside the glass.
  // Warm and low over the counter, one close in on the machine so the hero object is not lit by
  // the ceiling alone, one over the tables, one on the east side for the fridge and the bean
  // shelf, and one on each window bar — a seat by the glass that the room does not light is a
  // silhouette, and the whole point of them is the people sitting there.
  A.light(1.50, -1.90, 2.28, [1.00, 0.88, 0.68], .40, 3.3);
  A.light(0.90, -2.30, 1.86, [1.00, 0.90, 0.72], .26, 2.2);
  A.light(2.10, 3.55, 2.32, [1.00, 0.93, 0.79], .34, 3.6);
  A.light(0.90, 1.90, 2.05, [1.00, 0.91, 0.75], .28, 3.0);
  A.light(3.25, -2.85, 2.05, [1.00, 0.92, 0.77], .26, 2.6);
  A.light(3.25, 2.95, 2.05, [1.00, 0.92, 0.77], .26, 2.6);

  // ---------------------------------------------------------------- 11b · the shop working
  // One callback, and the mall culls it by floor and by distance before it ever runs — 16 m from
  // the middle of this unit, so standing at the fountain it costs nothing.
  //
  // What it does is the service cycle: a number is called about every thirty-four seconds, the
  // board takes it, and the lamp beside the digits blinks for four seconds so that a change is
  // visible from the far end of the queue rather than only to somebody already reading the panel.
  // `set` compares before it writes, so a board showing the same number costs one integer test a
  // frame and touches no geometry at all.
  //
  // The numbers run 118–159 and wrap. A café ticket here is a three-digit number that starts
  // wherever the day started, which is why this does not begin at 001: a display reading 001 at
  // four in the afternoon says the shop has served nobody.
  A.motion('service', (t, state) => {
    const n = 118 + Math.floor(t / 34) % 42;
    let k=0;
    if(callPower.active) {
      if (CALL.set(n)) state.calledAt = t;
      const since = state.calledAt === undefined ? 99 : t - state.calledAt;
      k = since < 4 && Math.sin(since * 6.4) > 0 ? 1 : 0;
      CALL.flash(k);
    }
    state.displayPower=callPower.active?'on':'off';
    state.now = n; state.blink = k; state.queue = QUEUE.length;
  }, { far:16 });

  // ---------------------------------------------------------------- 12 · things to say
  //
  // Reachability, because a label behind a counter is a label that does nothing. `A.th(hz,a,b,…)`
  // hangs the word at (a,b) and puts its focus 1.15 m further out at a+1.15; the player may use it
  // from anywhere within `reach` of that focus. So the test for each of these is: is there a
  // square metre of floor, outside every collider in this room, inside that circle? The colliders
  // that matter are the counter (a 1.52–2.36, b -3.52..-0.52), the back-wall run (a to 0.86) and
  // the banquette (a 1.24–2.92, b 3.83+), and a body needs 0.30 m of clearance from each.
  //
  // 咖啡店 is the browse action the catalogue generates, so it goes where you would actually order:
  // a stride in front of the hand-off, focus at a 3.90, reachable from anywhere between the
  // counter face and the doorway. The till's own comes from `A.counter` and lands at a 4.36, which
  // is reached from a 2.66 outward — the whole width of the room in front of the counter.
  A.th('咖啡店', 2.75, -1.35, '来一杯热的美式。', 'A hot americano, please.',
       '咖啡 coffee + 店 shop. Order at 点单, collect at 取餐.', 2.2, 1.42);
  A.th('咖啡', 2.62, -2.42, '这里的咖啡比机场便宜。',
       'The coffee here is cheaper than at the airport.',
       '咖啡 is a loan word — you can hear the English in it.', 1.8, 1.3);
  A.th('菜单', 2.60, -2.95, '拿铁多少钱？', 'How much is a latte?',
       '菜 dish + 单 list. It is the board on the wall behind the counter.', 1.8, 1.7);
  A.th('蛋糕', 2.50, -3.30, '来一块蛋糕，谢谢。', 'A slice of cake, please.',
       '蛋 egg + 糕 cake — what is under the glass on the counter.', 1.5, 1.2);
  A.th('杯子', 0.95, 0.03, '杯子在自助台上。', 'The cups are on the self-service counter.',
       '杯 cup + 子, the noun ending. 一杯 is also how a drink is counted.', 1.4, 1.1);
  A.th('牛奶', 1.05, 1.20, '这个咖啡加牛奶吗？', 'Does this coffee have milk in it?',
       '牛 cow + 奶 milk.', 1.5, 1.4);
  A.th('咖啡豆', 1.10, 2.30, '这种豆子是云南的。', 'These beans are from Yunnan.',
       '豆 bean — 咖啡豆 is literally coffee bean.', 1.6, 1.4);
  A.th('椅子', 2.30, 3.42, '窗边还有位子吗？', 'Are there still seats by the window?',
       '椅 chair + 子. 位子 is the seat itself — the space, not the furniture.', 1.5, 1.0);
  // ---- and the three that make sitting here worth doing. All three are words the game already
  // has a verb for, which is the whole test: 书桌 is 复习 in the global USE table (a seated review,
  // fourteen mood), 书架 is 看书, and 长椅 is 坐下 at seatY 0.48, which is 2 cm off this
  // banquette's own pan at 0.46. A label whose word is in neither USE nor USE_AT.mall is a thing
  // you can read and then press Q at for nothing, so nothing here is labelled 杯型, 糖度, 集章卡
  // or 自带杯 — those are printed on the counter and said by the staff instead. The rows that
  // would make them live are in the report, not in this file.
  //
  // Reach, which is the part that is arithmetic. `A.th` puts the focus 1.15 m outward and
  // `inReach` measures from the focus: 书桌 at a 3.40 focuses at 4.55 and is satisfied from a 2.55
  // out, which is the whole strip between the counter and the window platform.
  A.th('书桌', 3.40, -2.32, '在咖啡店背单词最有效。', 'Coffee shops are the best place to learn words.',
       '书 book + 桌 table. 复习 is to go back over what you already met.', 2.0, 1.12);
  A.th('书架', 3.45, -1.99, '这些书可以随便看。', 'You may read any of these.',
       '书 book + 架 rack. A café here lends books it does not sell.', 1.9, 1.22);
  A.th('长椅', 2.10, 3.60, '坐这边吧，卡座舒服。', 'Sit over here — the banquette is comfortable.',
       '长 long + 椅 chair. 卡座 is the booth seat it is built into.', 1.5, .95);
};

// ---------------------------------------------------------------- the two shopfront windows
// The café's frontage is intentionally clearer and a little less mirror-like than the house glass:
// warm timber, cups and the working machine should be visible from the entrance rather than read as
// pale reflections. The room still has a pane; its highlights are simply not the display.
//
// Budget: 23 primitives in the espresso bay and 26 in the brew/bean bay, 49 for the tenant. They
// are static, material-free forms, so the already animated coffee equipment inside keeps the only
// per-frame work.
MallFit['咖啡店:glass'] = { alpha: .16, gloss: .84 };
MallFit['咖啡店:win'] = (W, bc, side) => {
  const bean = C('#332820'), timber = C('#725139'), oak = C('#9c7651');
  const cream = C('#eee3cf'), jade = C('#506e61'), brass = C('#c4a467');
  const steel = C('#777b79'), dark = C('#242729'), warm = C('#ffe0a6');

  // This width also clears the café's deliberately shortened west bay.
  W.put(4.18, bc, .94, 1.64, .045, .363, timber, { hard:true, gloss:.25 });
  W.put(3.80, bc, .070, 1.52, 1.08, 1.46, bean, { hard:true, gloss:.18 });
  W.put(3.842, bc - .72, .016, .035, .92, 1.46, brass, { hard:true, gloss:.46 });
  W.put(3.842, bc + .72, .016, .035, .92, 1.46, brass, { hard:true, gloss:.46 });
  W.put(3.844, bc, .012, 1.30, .035, 1.92, warm, { hard:true, mode:1, glow:.085 });

  if (side < 0) {
    // A compact working espresso tableau, rather than another shelf of takeaway cups.
    W.put(4.06, bc, .50, 1.20, .22, .475, oak, { hard:true, gloss:.24 });
    W.put(4.06, bc, .53, 1.23, .025, .598, cream, { hard:true, gloss:.34 });
    W.put(3.99, bc, .30, .82, .46, .850, steel, { hard:true, gloss:.48, round:.035 });
    W.put(4.15, bc, .025, .70, .34, .875, dark, { hard:true, gloss:.34 });
    for (const k of [-1, 1])
      W.put(4.17, bc + k * .22, .055, .13, .080, .865, brass,
        { hard:true, gloss:.52, round:.025 });
    W.cap(4.17, bc + .39, .720, .018, .30, .018, steel, { rz:-.55, gloss:.50 });
    W.put(4.23, bc, .18, .64, .025, .625, dark, { hard:true, gloss:.30 });
    for (const k of [-1, 1]) {
      const b = bc + k * .23;
      W.taper(4.26, b, .675, .12, .14, .12, cream, { gloss:.30 });
      W.cyl(4.26, b, .755, .065, .025, dark, { gloss:.40 });
      W.put(4.26, b, .13, .13, .045, .700, jade, { hard:true, round:.018 });
    }
    for (const k of [-1, 1]) {
      const b = bc + k * .55;
      W.put(4.22, b, .18, .25, .30, .515, k < 0 ? jade : cream,
        { hard:true, mode:7, gloss:.10, round:.025 });
      W.put(4.315, b, .010, .15, .085, .520, k < 0 ? cream : bean,
        { hard:true, gloss:.18 });
    }
  } else {
    // The other bay tells the slower story: beans, grinder, pour-over stand and a waiting cup.
    for (const [off, h] of [[-.43, .22], [.42, .36]]) {
      W.put(4.02, bc + off, .48, .56, h, .39 + h / 2, timber, { hard:true, gloss:.22 });
      W.put(4.02, bc + off, .51, .59, .022, .401 + h, oak, { hard:true, gloss:.30 });
    }

    const gb = bc - .43;
    W.put(4.12, gb, .28, .28, .06, .650, dark, { hard:true, gloss:.36 });
    W.cyl(4.12, gb, .710, .115, .26, steel, { gloss:.48 });
    W.taper(4.12, gb, .930, .24, .22, .24, cream, { gloss:.28 });
    W.cyl(4.12, gb, 1.055, .125, .025, dark, { gloss:.42 });

    const pb = bc + .38;
    W.put(4.12, pb, .34, .34, .045, .787, dark, { hard:true, gloss:.34 });
    W.put(4.03, pb, .045, .045, .64, 1.085, brass, { hard:true, gloss:.50 });
    W.put(4.12, pb, .20, .38, .035, 1.340, brass, { hard:true, gloss:.50 });
    W.taper(4.14, pb, 1.160, .20, .22, .20, jade, { gloss:.30 });
    W.cyl(4.14, pb, .955, .125, .25, cream, { gloss:.32, alpha:.86 });
    W.cap(4.19, pb + .13, 1.010, .018, .18, .018, brass, { rx:Math.PI / 2, gloss:.48 });
    W.taper(4.31, pb - .32, .780, .12, .14, .12, cream, { gloss:.30 });
    W.cyl(4.31, pb - .32, .860, .065, .025, dark, { gloss:.40 });
    W.put(4.31, pb - .32, .13, .13, .045, .805, jade, { hard:true, round:.018 });

    for (const k of [-1, 1]) {
      const b = bc + k * .68;
      W.put(4.25, b, .18, .24, .28, .505, k < 0 ? cream : jade,
        { hard:true, mode:7, gloss:.10, round:.025 });
      W.put(4.345, b, .010, .14, .080, .510, k < 0 ? bean : cream,
        { hard:true, gloss:.18 });
    }
  }
};

// ---------------------------------------------------------------- the people
//
// Staff and customers, in MallCast rather than in game.js — see the note at the top of js/mall.js.
// Everything here is in the MALL's world coordinates, not the shop's (a, b), and the conversion
// for this unit is the one line worth writing down:
//
//     x = -14.5 + b        z = -18.0 + a
//
// because 咖啡店 is `shop('N', -14.5, 8.6, …)`: the north frontage, centred on x -14.5, with the
// back wall on the building line at z -18 and depth running outward towards the concourse.
//
// Facing follows from the same mapping. An NPC's `face` is a world yaw where 0 looks along +z, so
// in this shop 0 is "out towards the door" and Math.PI is "at the back wall". A barista faces 0; a
// customer at the counter faces Math.PI; somebody on a window stool faces 0, at the glass.
//
// Two rules got everybody placed, and both are checkable arithmetic rather than taste:
//
//   1. A standing NPC is a 0.28 m radius and `Mall.clampMove` pushes it out of every collider in
//      the room. Nobody is written closer than 0.28 to one — which is why the counter had to move
//      out in the first place, and why the two behind it stand at a 1.17, dead centre of the only
//      0.70 m of floor in this shop that has staff-side access.
//   2. A seated NPC carries the `seatY` of the thing it is sitting on, and the sit pose builds the
//      whole leg from that number: 0.788 on a bar stool, 0.46 on the banquette pan, 0.49 on a
//      chair. Getting it wrong buries the hips in the seat or floats them above it.
if (typeof MallCast !== 'undefined') MallCast.push(
  // ---- 老板. The owner, on the machine, at the point in the bar where the two group heads are.
  // 'vend' hands something over and goes back to waiting, which is what a barista's arms do.
  { hz:'老板', name:'方启明', py:'Fāng Qǐmíng', place:'mall', mallFloor:1,
    rig:'mall-cafe-owner-fang-qiming', temper:'genial',
    look:{ skin:'#d9a97e', hair:'#241d1a', hairStyle:'short', top:'#e8e0d0', pants:'#39414b',
      shoe:'#26292d', apron:'#2f4a44', collar:'shirt', tall:1.02, faceSeed:8811 },
    spots:[{ h0:7, h1:22, at:[-16.65, -16.83], face:0, act:'vend' }],
    lines:[['要热的还是冰的？', 'Hot or iced?'],
           ['豆子是今天早上磨的。', 'The beans were ground this morning.'],
           ['坐窗边吧，那边亮。', 'Sit by the window — it is brighter over there.']] },
  // ---- 收银员, at the east end of the counter, where the queue arrives from the door.
  { hz:'收银员', name:'苏小满', py:'Sū Xiǎomǎn', place:'mall', mallFloor:1,
    rig:'mall-cafe-cashier-su-xiaoman', temper:'brisk',
    look:{ skin:'#efc19b', hair:'#2b2320', hairStyle:'bun', top:'#f1e8d8', pants:'#4a4048',
      shoe:'#332f32', apron:'#7c3a32', tall:.96, faceSeed:8812 },
    spots:[{ h0:7, h1:22, at:[-15.45, -16.83], face:0, act:'vend' }],
    lines:[['您好，喝点什么？', 'Hello — what would you like to drink?'],
           ['拿铁二十六，加奶不加钱。', 'A latte is twenty-six; milk is no extra.'],
           ['做好了在那边取餐。', 'It comes out over there, at the collection point.']] },
  // ---- the queue, standing on the two marks nearest the till. §4e paints three places at a 2.78,
  // b -0.60 / -1.26 / -1.92, and this shop's frame is x = -14.5 + b, z = -18 + a — so the head of
  // the queue is (-15.10, -15.22) and the second place is (-15.76, -15.22). Both face Math.PI,
  // which in this unit is "at the back wall", because that is where the till is.
  //
  // The third mark is deliberately left empty. A queue with every place filled is a bus stop; a
  // queue with one gap at the back is a queue you can join, which is the point of painting it.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
    look:{ skin:'#ddb188', hair:'#1f1a17', hairStyle:'bob', top:'#8d6f7e', pants:'#3b4552',
      shoe:'#e0d9cb', bag:'tote', bagColor:'#c1a05e', tall:.99, faceSeed:8813 },
    spots:[{ h0:9, h1:22, at:[-15.10, -15.22], face:Math.PI, act:'wait' }] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored',
    look:{ skin:'#e3b58e', hair:'#2d2521', hairStyle:'short', top:'#6a7f6c', pants:'#3d434d',
      shoe:'#2b2f34', collar:'crew', tall:1.02, faceSeed:8822 },
    spots:[{ h0:9, h1:22, at:[-15.76, -15.22], face:Math.PI, act:'phone' }] },
  // ---- waiting at 取餐 for a drink that is being made, out of the queue and turned to the
  // hand-off, which is the whole reason the hand-off exists. Moved off the old (-16.00, -15.05):
  // that was 0.35 m from the second queue place, and two 0.28 m bodies need 0.56 m between them
  // before the clamp starts pushing one of them out of the other.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored',
    look:{ skin:'#c99168', hair:'#302823', hairStyle:'short', top:'#5d7383', pants:'#343b44',
      shoe:'#272c30', collar:'shirt', tall:1.07, faceSeed:8814 },
    spots:[{ h0:9, h1:22, at:[-16.05, -14.70], face:Math.PI, act:'wait' }] },
  // ---- at the self-service bay, putting milk in it. Dead centre of the doorway shot.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'steady',
    look:{ skin:'#e7b78d', hair:'#262019', hairStyle:'ponytail', top:'#b9784c', pants:'#454b56',
      shoe:'#eae3d6', tall:.94, faceSeed:8815 },
    spots:[{ h0:9, h1:22, at:[-14.47, -16.70], face:Math.PI, act:'wait' }] },
  // ---- at the bean shelf, choosing a bag to take home. Clear of the near table's collider, which
  // reaches b 3.08 — this one stands at b 2.30 and is 0.28 wide.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
    look:{ skin:'#cfa079', hair:'#8d867e', hairStyle:'short', top:'#6d7b86', pants:'#3d444c',
      shoe:'#2b3034', jacket:'#4a5a63', tall:.97, stoop:.06, faceSeed:8816 },
    spots:[{ h0:9, h1:22, at:[-12.20, -16.75], face:Math.PI, act:'wait' }] },
  // ---- the two at the near table: one on the banquette, one on the chair opposite. `seatY` is
  // the top of the pan each of them is actually on, and they are 0.9 m apart across the table.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'genial', seatY:.46,
    look:{ skin:'#e2b189', hair:'#2b2320', hairStyle:'long', top:'#93a08c', pants:'#414954',
      shoe:'#e9e2d5', tall:1.00, faceSeed:8817 },
    spots:[{ h0:9, h1:22, at:[-10.47, -15.55], face:-Math.PI / 2, act:'sit' }] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored', seatY:.49,
    look:{ skin:'#d5a077', hair:'#332b26', hairStyle:'short', top:'#7c8a6f', pants:'#3b434d',
      shoe:'#2a2f33', tall:1.03, faceSeed:8818 },
    spots:[{ h0:9, h1:22, at:[-11.78, -16.45], face:Math.PI / 2, act:'read' }] },
  // ---- 在窗边坐着喝完. One on each window bar, on a 0.788 stool, looking out at the concourse —
  // which is the sentence the café's own completion line describes.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient', seatY:.788,
    look:{ skin:'#eabf95', hair:'#221c19', hairStyle:'bun', top:'#c2996a', pants:'#3e4854',
      shoe:'#2c3135', tall:.98, faceSeed:8819 },
    spots:[{ h0:9, h1:22, at:[-11.50, -14.98], face:0, act:'phone' }] },
  // The west one at b -3.22, not further west: past b -3.30 is the jewellers' shopfront, see the
  // note beside `winBar` above.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'steady', seatY:.788,
    look:{ skin:'#c8946b', hair:'#2e2622', hairStyle:'short', top:'#4f6a7d', pants:'#333a42',
      shoe:'#252a2e', glasses:true, tall:1.05, faceSeed:8820 },
    spots:[{ h0:9, h1:22, at:[-17.72, -14.98], face:0, act:'read' }] },
  // ---- 郑一凡, on the other west stool, at the study end of the ledge. The shop's named regular
  // and the reason 学习角 in §8c is worth building: a place to sit and revise is worth more when
  // somebody is already sitting there doing it, and she is the only person in this unit whose four
  // lines are about the language rather than about the coffee.
  //
  // b -2.66, a 3.02 — the second stool of `winBar(-3.58, -1.88, …)` — which is x -17.16, z -14.98.
  // `seatY` 0.788 is the stool's pad, not the banquette's 0.46: the sit pose builds the whole leg
  // from that number and the wrong one buries her hips in the seat.
  //
  // No `rig` field. Every explicit rig id in this game has to already exist in the fixed 82-rig
  // roster in js/cast-catalog.js, which is not this file's to extend, so she takes an ambient rig
  // like the shop's other regulars. The id this file would ask for is in the report.
  { hz:'学生', name:'郑一凡', py:'Zhèng Yīfán', place:'mall', mallFloor:1,
    temper:'patient', seatY:.788,
    look:{ skin:'#e3b892', hair:'#221c19', hairStyle:'ponytail', top:'#5d7a6d', pants:'#3b434f',
      shoe:'#e8e1d3', glasses:true, tall:.95, faceSeed:8823 },
    spots:[{ h0:9, h1:22, at:[-17.16, -14.98], face:0, act:'read' }],
    lines:[['我每天下午都在这儿背单词。', 'I come here every afternoon to learn words.'],
           ['这家的书随便看，不用买。', 'You can read their books here; you do not have to buy them.'],
           ['自带杯便宜三块，我带了两年了。', 'Your own cup is three kuai off — I have brought mine for two years.'],
           ['集章卡满十杯送一杯，快满了。', 'Ten stamps and the eleventh is free. Mine is nearly full.']] },
  // ---- and one who is not settled: in through the door, along the counter, past the fridge and
  // back out into the concourse. Every waypoint is 0.30 m clear of a collider, and `mallBlocked`
  // in game.js advances the leg if a route ever does jam, so a bad corner costs a pause and not a
  // person marching into a plinth forever.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
    look:{ skin:'#dbaa83', hair:'#29211d', hairStyle:'tousled', top:'#a8543f', pants:'#46566a',
      shoe:'#ece6da', pack:true, packColor:'#3d5a70', tall:1.01, faceSeed:8821 },
    patrol:[[-14.45, -12.20], [-14.40, -14.40], [-15.20, -15.10], [-14.30, -16.55],
            [-13.60, -15.60], [-14.30, -13.60], [-14.45, -12.20],
            [-11.80, -11.80], [-17.20, -11.80], [-14.45, -12.20]], speed:.98 },
);
