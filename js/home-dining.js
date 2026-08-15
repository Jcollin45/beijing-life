// 餐厅 — the dining area
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
// x 3.4 .. 6.0, z -1.6 .. 1.6, floor at DECK[2], ceiling 2.60 above it. Two and a half metres
// by three, which is a Beijing dining area exactly: the 客厅 is through the opening at x 3.4, the
// 厨房 is through the wall at z -1.6, and the 玄关 is over the line at z 1.6. So this is a
// crossroads with a table in it, not a room with four walls, and the layout is arranged around
// that: everything is pushed to the east half and the strip from x 3.4 to about x 4.30 is left
// open the whole depth of the room, because that is the walk from the kitchen to the sofa.
//
// The one big decision here is that the table is *round* and its middle is kept empty. A Chinese
// family does not eat off individual plates set at each place; the dishes go down in the centre
// and everybody reaches. So there is a woven trivet at the middle of the top and nothing else
// within 20 cm of it, and that is where a cooked meal is meant to land — see MEAL at the bottom.
FlatFit['dining'] = A => {

  // ---------------------------------------------------------------- the toolkit, and the datum
  //
  // Written to the `A` documented in world.js. Two of these have an obvious second name and the
  // shell may have chosen either, so both are accepted rather than having the room fail to build
  // over a synonym.
  const box = A.box, cyl = A.cyl, ball = A.ball, taper = A.taper, flat = A.flat;
  const cap   = A.cap   || A.capsule;
  const glyph = A.glyph || A.glyphs;
  const stop  = A.stop  || A.solid;
  const th    = A.th    || A.thing;
  const shade = A.shade, light = A.light;

  // The floor plane, and the single number to change if this is ever wrong.
  //
  // APARTMENT.md fixes the flat's deck at y = 3.10 and world.js documents `A` as taking the
  // flat's own world coordinates — the same y as everything else in that file — so 3.10 is the
  // default. If the shell turns out to add the deck itself the way MallFit does, it only has to
  // hand the toolkit an `A.floorY` of 0 and every height in this file follows, because nothing
  // below writes a bare y: they are all `Y0 + something`.
  const Y0 = A.floorY !== undefined ? A.floorY : 3.10;
  const CEIL = Y0 + 2.60;

  // The room, from the contract. Only the +x wall is load-bearing to this file: it is the flat's
  // outer envelope, it is the one wall here that certainly exists, and the calendar and the
  // sideboard both assume its inner face is exactly x = 6.0.
  const X0 = 3.4, X1 = 6.0, Z0 = -1.6, Z1 = 1.6;

  // Colours are the flat's, by hex, not by reference: `C` returns a fresh array each call, so the
  // wood set that Build.scene infers `mode:6` from cannot recognise them. Every timber prop below
  // therefore says `mode:6` out loud. That is also why nothing here uses `mat:'wood'` — mode 6 is
  // procedural grain and the photograph is a second grain on top of it, and the rest of the flat
  // is built with mode 6.
  const col = {
    // The three timbers are the flat's, named rather than copied. They were already these exact
    // values, which is why this line is a no-op in the picture and not a no-op in the file: the
    // 次卧 had the same three a unit or two off and the 厨房 had two of its own, and nothing said
    // where the right ones lived. FLAT_PALETTE (js/home-walls.js) is now where.
    woodD: C(FLAT_PALETTE.woodD), woodM: C(FLAT_PALETTE.woodM), woodL: C(FLAT_PALETTE.woodL),
    cream: C('#cbc4b7'), white: C('#f2f0e9'), linen: C('#d3ccbc'),
    charcoal: C('#2a2e33'), steel: C('#aeb5bb'), grey: C('#838b93'),
    red: C('#a43c2c'), redD: C('#793025'), gold: C('#d19a32'),
    jade: C('#3f7564'), blue: C('#315d73'), porcelain: C('#f8f6f0'),
    clay: C('#7a4a38'), bamboo: C('#c8a877'),
  };
  const G = { matte: .05, wood: .20, paint: .16, fabric: .03, metal: .58 };

  // A local offset (u across, v fore-and-aft) placed into the world for a prop carrying `ry:a`.
  // M.trs sends local +x to (cos a, -sin a) and local +z to (sin a, cos a); this is that, and
  // nothing that yaws below computes its own sines.
  const rot = (cx, cz, a, u, v) =>
    [cx + Math.cos(a) * u + Math.sin(a) * v, cz - Math.sin(a) * u + Math.cos(a) * v];

  // ================================================================ 餐桌 the table
  //
  // Round, 1.10 m, seats four: the shape a family flat actually owns, because a long table needs
  // a wall to stand along and there is not one to spare in here.
  //
  // The top is 62 mm of timber and that thickness is not decoration. A disc built at the
  // proportions a table top wants — 1.1 m across and a centimetre thick — comes out of the
  // cylinder mesh with its side normals dominating, and shades as though the top face were
  // pointing sideways: the table goes dark when you stand over it and bright when you crouch.
  // 62 mm is 18:1 and behaves.
  const TX = 4.88, TZ = 0.05, TR = .55;
  const TT = Y0 + .755;                       // the top surface; everything on it is measured off this

  for (const [ox, oz] of [[-.335, -.335], [.335, -.335], [-.335, .335], [.335, .335]])
    taper(TX + ox, Y0 + .325, TZ + oz, .072, .65, .072, col.woodD, { mode:6, gloss:G.wood });
  cyl(TX, Y0 + .655, TZ, .50, .085, col.woodM, { mode:6, gloss:.18 });          // apron
  cyl(TX, Y0 + .706, TZ, .556, .030, col.woodM, { mode:6, gloss:G.wood });      // moulded edge
  cyl(TX, Y0 + .724, TZ, TR, .062, col.woodL, { tag: '桌子', mode:6, gloss:.28 });

  shade(TX, TZ, 1.30, 1.30, .34, Y0 + .020);
  shade(TX, TZ, 1.94, 1.94, .15, Y0 + .016);

  // ================================================================ 椅子 four chairs
  //
  // Pushed in, all four of them, which is both what a table looks like when nobody is eating and
  // the only way four chairs and a table fit across 2.6 m and still leave a walkable metre on the
  // west side. Seat tops land 17 cm inside the rim; the backs stand 16 cm clear above it.
  //
  // Deliberately not labelled 椅子. That word's action in js/data.js carries a hard-coded seat at
  // [1.12, -1.72] — the desk chair of the old one-room flat — so using one of these would sit the
  // player down in another room. See the note at the end of this file.
  function chair(cx, cz, a, cushion) {
    const P = (u, v) => rot(cx, cz, a, u, v);
    const O = { mode:6, gloss:G.wood, ry:a };
    let p;
    p = P(0, 0);        box(p[0], Y0 + .430, p[1], .42, .050, .40, col.woodL, O);
    for (const u of [-.175, .175]) for (const v of [-.165, .165]) {
      p = P(u, v);      taper(p[0], Y0 + .215, p[1], .042, .43, .042, col.woodM, O);
    }
    for (const u of [-.170, .170]) {
      p = P(u, -.170);  box(p[0], Y0 + .660, p[1], .046, .46, .046, col.woodM, O);
    }
    p = P(0, -.170);    box(p[0], Y0 + .880, p[1], .386, .080, .052, col.woodM, O);
    p = P(0, -.168);    box(p[0], Y0 + .690, p[1], .300, .155, .026, col.woodL, O);
    for (const u of [-.175, .175]) {
      p = P(u, 0);      box(p[0], Y0 + .150, p[1], .032, .026, .330, col.woodM, O);
    }
    p = P(0, .165);     box(p[0], Y0 + .150, p[1], .340, .026, .032, col.woodM, O);
    // One chair has a tied-on cushion, because in a flat where four chairs were bought at once
    // exactly one of them is somebody's.
    if (cushion) {
      p = P(0, 0);      box(p[0], Y0 + .472, p[1], .385, .046, .365, col.red,
                            { mode:7, gloss:G.fabric, ry:a });
      for (const u of [-.150, .150]) {
        p = P(u, -.160); cap(p[0], Y0 + .478, p[1], .010, .085, .010, col.redD,
                             { rz:Math.PI / 2, ry:a, mode:7, gloss:G.fabric });
      }
    }
  }
  chair(TX - .58, TZ, Math.PI / 2, true);      // west, facing the table across the walkway
  chair(TX + .58, TZ, -Math.PI / 2, false);    // east, the one nobody sits in — the laptop's side
  chair(TX, TZ + .58, Math.PI, false);         // north
  chair(TX, TZ - .58, 0, false);               // south, the seat nearest the kitchen door

  // The stable table core is the obstacle; dining chairs are light, movable brush-past furniture.
  // Treating all four as one fixed 1.56 x 1.56 m block left only 0.75 m of legal body-centre run
  // beside the partition even though the round top itself begins at x 4.33. The core below covers
  // the full top and legs, while restoring 0.90 m to the kitchen-to-living through-route.
  stop(TX - .58, TX + .58, TZ - .56, TZ + .56);

  // ================================================================ what is on the table
  //
  // The middle first, and the middle is a woven trivet with nothing on it. See MEAL at the end.
  flat(TX, TT + .003, TZ, .22, .22, C('#a1503f'), { mode:7, gloss:G.fabric, ry:.34 });
  flat(TX, TT + .005, TZ, .15, .15, C('#8a3a2c'), { mode:7, gloss:G.fabric, ry:.34 });

  // ---- 茶 the tea tray, north-west corner of the top. A 紫砂 pot and three cups, on a lipped
  // wooden tray, which is where tea lives in a flat that has no separate tea table.
  {
    const cx = 4.62, cz = .34, a = .20, T = { mode:6, hard:true, gloss:.24, ry:a };
    let p = rot(cx, cz, a, 0, 0);
    box(p[0], TT + .012, p[1], .30, .024, .22, col.woodD, T);
    for (const v of [-.108, .108]) {
      p = rot(cx, cz, a, 0, v);  box(p[0], TT + .033, p[1], .30, .022, .014, col.woodM, T);
    }
    for (const u of [-.147, .147]) {
      p = rot(cx, cz, a, u, 0);  box(p[0], TT + .033, p[1], .014, .022, .21, col.woodM, T);
    }
    const pot = rot(cx, cz, a, -.072, .004), C1 = { gloss:.30, tag: '餐厅茶' };
    ball(pot[0], TT + .086, pot[1], .074, .060, .074, col.clay, C1);
    cyl(pot[0], TT + .150, pot[1], .040, .016, col.clay, C1);
    ball(pot[0], TT + .166, pot[1], .014, .012, .014, col.clay, { gloss:.34, tag: '餐厅茶' });
    cap(pot[0] - .080, TT + .100, pot[1] + .026, .012, .075, .012, col.clay,
        { rz:.95, ry:.30, gloss:.30, tag: '餐厅茶' });
    cap(pot[0] + .080, TT + .108, pot[1] - .020, .010, .086, .010, col.clay,
        { rz:-1.10, gloss:.30, tag: '餐厅茶' });
    // Cups the right way up: the taper mesh narrows toward +y, and a teacup does the opposite.
    for (const [u, v] of [[.074, -.054], [.078, .052], [.006, .070]]) {
      p = rot(cx, cz, a, u, v);
      taper(p[0], TT + .041, p[1], .062, .034, .062, col.white,
            { rx:Math.PI, gloss:.38, tag: '餐厅茶' });
    }
    th('茶', cx, TT + .17, cz, '茶还是热的，你倒一杯。', 'The tea is still hot — pour yourself a cup.',
       '倒茶 dào chá to pour tea. Pouring for somebody else before yourself is the whole etiquette.',
       { focus:[cx, cz], reach:1.5 });
  }

  // ---- one place setting, at the west chair. A bowl, chopsticks laid across the mat, a soup
  // spoon: one person eats here more often than four do, and that is the story the table tells.
  {
    const cx = 4.53, cz = -.06;
    flat(cx, TT + .003, cz, .30, .22, C('#b65e42'), { mode:7, gloss:G.fabric, ry:.06 });
    cyl(cx, TT + .034, cz, .073, .068, col.porcelain, { gloss:.36, tag: '餐厅碗' });
    cyl(cx, TT + .050, cz, .0748, .016, col.blue,     { gloss:.34, tag: '餐厅碗' });
    cyl(cx, TT + .068, cz, .079, .012, col.porcelain, { gloss:.36, tag: '餐厅碗' });
    for (const ox of [-.008, .008])
      cap(cx + .118 + ox, TT + .010, cz, .006, .23, .006, col.bamboo,
          { rx:Math.PI / 2, gloss:.24, tag: '餐厅碗' });
    ball(cx + .07, TT + .014, cz + .128, .026, .010, .034, col.porcelain, { gloss:.38 });
    cap(cx + .07, TT + .014, cz + .195, .008, .10, .008, col.porcelain,
        { rx:Math.PI / 2, gloss:.38 });
    th('碗', cx, TT + .13, cz, '桌上摆着一个碗和一双筷子。',
       'A bowl and a pair of chopsticks are set out on the table.',
       '一双筷子 yì shuāng kuàizi — chopsticks come in 双, pairs, never 个.',
       { focus:[cx, cz], reach:1.4 });
  }

  // ---- 筷子筒 the chopstick holder. No dictionary row for 筷子 yet, so this is furniture rather
  // than a label; the word is taught on the bowl above instead.
  {
    const cx = 5.02, cz = .31;
    cyl(cx, TT + .062, cz, .046, .124, col.cream, { gloss:.28 });
    cyl(cx, TT + .115, cz, .048, .014, col.red,   { gloss:.26 });
    for (const [ox, oz, rz, rx] of [[-.012, -.010, .10, -.06], [.010, -.012, -.08, .05],
                                    [.000, .014, .04, .11], [.016, .008, -.05, -.09]])
      cap(cx + ox, TT + .185, cz + oz, .005, .16, .005, col.bamboo, { rz, rx, gloss:.24 });
  }

  // ---- 醋 and the chilli oil. Both live on the table permanently in a house that cooks; the
  // vinegar is the labelled one because it is the word, and the jar beside it is the company.
  {
    const cx = 5.18, cz = .24, V = { gloss:.52, tag: '醋' };
    cyl(cx, TT + .075, cz, .034, .150, C('#3a2f28'), V);
    cyl(cx, TT + .082, cz, .0356, .070, col.cream, { gloss:.18, tag: '醋' });
    taper(cx, TT + .172, cz, .068, .044, .068, C('#3a2f28'), V);
    cyl(cx, TT + .208, cz, .017, .030, C('#3a2f28'), V);
    cyl(cx, TT + .232, cz, .019, .020, col.red, { gloss:.40, tag: '醋' });
    glyph(cx - .038, TT + .082, cz, -Math.PI / 2, '醋',
          { size:.038, color:C('#3a2f28'), gloss:G.matte, lift:.003, tag: '醋' });
    th('醋', cx, TT + .26, cz, '吃饺子要放醋。', 'You want vinegar with dumplings.',
       '醋 cù. 吃醋 chīcù, "to eat vinegar", is to be jealous.',
       { focus:[cx, cz], reach:1.5 });

    cyl(5.30, TT + .048, .17, .040, .096, C('#c05a24'), { gloss:.46 });
    cyl(5.30, TT + .104, .17, .042, .020, col.grey,     { gloss:.55 });
  }

  // ---- 纸巾 the tissue box. The one thing on a Chinese dining table that is never put away,
  // because it is the napkin.
  {
    const cx = 5.02, cz = -.31, a = -.18, B = { hard:true, gloss:.20, ry:a, tag: '纸巾' };
    box(cx, TT + .052, cz, .215, .100, .112, C('#bfc3c4'), B);
    box(cx, TT + .052, cz, .223, .034, .120, col.red, B);
    box(cx, TT + .101, cz, .090, .006, .050, col.grey, B);
    ball(cx, TT + .116, cz, .045, .022, .030, C('#f8f6f0'), { gloss:.10, ry:a, tag: '纸巾' });
    th('纸巾', cx, TT + .16, cz, '递给我一张纸巾。', 'Pass me a tissue.',
       '一张纸巾 — flat things are counted with 张, like 一张票 and 一张桌子.',
       { focus:[cx, cz], reach:1.4 });
  }

  // ---- the post, the keys and a shut laptop. The reason this table is worth building at all:
  // it is the only large flat surface in the flat, so everything that has nowhere else to go ends
  // up here, and a table with nothing but crockery on it reads as a showroom.
  {
    box(4.68, TT + .006, -.34, .215, .008, .108, col.cream, { hard:true, gloss:.10, ry:-.26 });
    box(4.70, TT + .016, -.325, .205, .009, .102, col.linen, { hard:true, gloss:.10, ry:-.10 });
    box(4.66, TT + .024, -.330, .075, .002, .034, C('#c4cdd2'), { hard:true, mode:1, ry:-.10 });

    cyl(4.50, TT + .005, -.30, .022, .006, col.steel, { gloss:G.metal });
    for (const [ox, oz, ry] of [[.030, -.014, .5], [.026, .016, .9], [.014, .030, 1.4]])
      box(4.50 + ox, TT + .006, -.30 + oz, .012, .004, .050, C('#c9b382'),
          { hard:true, ry, gloss:.44 });

    box(5.22, TT + .017, -.02, .300, .022, .210, C('#8d94a0'), { hard:true, gloss:.42, ry:.22 });
    box(5.22, TT + .029, -.02, .282, .004, .196, C('#6e7475'), { hard:true, gloss:.30, ry:.22 });
  }

  // ---- 剩菜 the leftovers, and 报纸 the folded paper. The room was laid for a family that is not
  // there: a trivet in the middle, a tray of tea, four chairs and one place setting. What one
  // person eating alone actually leaves on a table is the dish from last night still covered, and
  // whatever they were reading propped against it.
  //
  // The film is a lens rather than a lid — a wide, very shallow ball at .96 alpha sitting inside
  // the dish rim, which is what taut 保鲜膜 looks like from above. A flat disc over the top reads
  // as a plate with a second plate on it.
  {
    const cx = 5.08, cz = -.30;
    cyl(cx, TT + .026, cz, .098, .052, col.porcelain, { gloss:.36, tag: '剩菜' });
    cyl(cx, TT + .050, cz, .102, .010, col.blue,      { gloss:.34, tag: '剩菜' });
    ball(cx, TT + .046, cz, .092, .030, .092, C('#76583e'), { gloss:.20, tag: '剩菜' });
    ball(cx, TT + .062, cz, .100, .022, .100, C('#bfc3c4'),
         { mode:7, alpha:.34, gloss:.72, tag: '剩菜' });
    th('剩菜', cx, TT + .20, cz, '昨天的剩菜还在桌上。', "Last night's leftovers are still on the table.",
       '剩 shèng left over + 菜 dish. 保鲜膜 bǎoxiānmó is the cling film over it — literally ' +
       '"keep fresh film". Leftovers go in the 冰箱, and this one did not.',
       { focus:[TX, TZ], reach:1.7 });
  }
  {
    const cx = 4.62, cz = -.42;
    box(cx, TT + .008, cz, .230, .008, .155, C('#ddd3bb'), { hard:true, ry:-.14, gloss:G.matte });
    box(cx, TT + .015, cz, .224, .006, .150, C('#cdc4b4'), { hard:true, ry:-.11, gloss:G.matte });
    box(cx, TT + .020, cz - .052, .224, .004, .046, C('#4b4740'), { hard:true, ry:-.11 });
    for (let i = 0; i < 4; i++)
      box(cx, TT + .021, cz + .002 + i * .026, .200, .003, .010, C('#98948a'),
          { hard:true, ry:-.11 });
    th('报纸', cx, TT + .16, cz, '报纸看了一半就放下了。', 'The paper was put down half read.',
       '报纸 bàozhǐ — 报 to report + 纸 paper. 看报 kàn bào is the everyday verb; you read a ' +
       'paper with 看, not with 读.',
       { focus:[TX, TZ], reach:1.7 });
  }

  // 椅子 — the four chairs, finally named. The note at the head of the chair section records that
  // this word was held back because its action in js/data.js carries a hard-coded seat position,
  // so calling a chair 椅子 in here sat the player somewhere else. That is a data.js fault and it
  // is queued for the lane that owns that file (.reports/data-rows-queue.md); leaving four chairs
  // the player cannot name in their own dining room was the worse of the two.
  th('椅子', TX - .58, TT + .18, TZ, '拉把椅子坐下。', 'Pull up a chair and sit down.',
     '椅子 yǐzi. 一把椅子 — 把 again, for anything you take hold of. The four here are the same ' +
     'chair four times, which is what a set is.',
     { focus:[TX, TZ], reach:1.7 });

  // 桌子 is the table itself. The word glosses "desk, table" and its action goes through a drawer,
  // which a dining table in a flat this size genuinely has — it is where the post above ends up.
  th('桌子', TX, TT + .30, TZ, '一家人围着桌子吃饭。', 'The family eats sitting round the table.',
     '围着 wéizhe, gathered around. A round table has no head, which is rather the point.',
     { focus:[TX, TZ], reach:1.6 });

  // ================================================================ 餐边柜 the sideboard
  //
  // North-east corner, hard against the outer wall, out of the way of every chair. Everything
  // that is not eaten off stands on it.
  {
    const cx = 5.795, cz = 1.20, ST = Y0 + .832;         // ST is the top surface
    box(cx, Y0 + .050, cz, .340, .100, .580, col.woodD, { mode:6, hard:true, gloss:.16 });
    box(cx, Y0 + .450, cz, .380, .700, .640, col.woodM, { mode:6, hard:true, gloss:G.wood });
    box(5.788, Y0 + .816, cz, .404, .032, .676, col.woodL, { mode:6, hard:true, gloss:.30 });
    // Doors stand 16 mm proud of the carcass front at x 5.605, which is well past the centimetre
    // it takes for two faces this close to stop trading places at range.
    for (const s of [-1, 1]) {
      box(5.598, Y0 + .455, cz + s * .163, .018, .60, .30, col.woodL,
          { mode:6, hard:true, gloss:.26 });
      cyl(5.583, Y0 + .455, cz + s * .040, .009, .13, col.steel, { gloss:G.metal });
    }
    shade(cx, cz, .48, .74, .34, Y0 + .020);
    stop(5.58, 6.00, .86, 1.54);

    // ---- 水壶 the thermos. The enamelled vacuum flask with a bail handle and a cork stopper —
    // still how boiled water gets kept in a flat, and the reason there is no kettle on this table.
    const hx = 5.79, hz2 = 1.00;
    cyl(hx, ST + .014, hz2, .092, .028, C('#6f6a63'), { gloss:.36, tag: '水壶' });
    cyl(hx, ST + .175, hz2, .085, .300, C('#a43c2c'), { gloss:.32, tag: '水壶' });
    cyl(hx, ST + .200, hz2, .0872, .050, col.cream,   { gloss:.30, tag: '水壶' });
    taper(hx, ST + .365, hz2, .170, .080, .170, C('#a43c2c'), { gloss:.32, tag: '水壶' });
    cyl(hx, ST + .420, hz2, .046, .035, col.steel, { gloss:.55, tag: '水壶' });
    cyl(hx, ST + .455, hz2, .040, .045, C('#c9a26a'), { gloss:.18, tag: '水壶' });
    for (const s of [-1, 1])
      cap(hx + s * .082, ST + .420, hz2, .008, .10, .008, col.steel,
          { gloss:.55, tag: '水壶' });
    cap(hx, ST + .470, hz2, .008, .175, .008, col.steel,
        { rz:Math.PI / 2, gloss:.55, tag: '水壶' });
    th('水壶', hx, ST + .25, hz2, '水壶里有热水，别烫着。',
       'There is hot water in the flask — mind you do not scald yourself.',
       '热水壶 rèshuǐhú is the full name. 开水 kāishuǐ is what is in it: water that has been boiled.',
       { focus:[hx, hz2], reach:1.5 });

    // ---- the fruit. Off the table on purpose: the middle of the top is reserved for dinner, and
    // this is where a bowl of fruit actually sits between meals. Unlabelled, following the flat's
    // own precedent — 水果 is taught in the supermarket, where its verb hands fruit to a basket
    // you are not carrying in here.
    cyl(5.80, ST + .030, 1.38, .118, .060, col.porcelain, { gloss:.36 });
    cyl(5.80, ST + .062, 1.38, .126, .014, C('#cbc4b7'), { gloss:.34 });
    for (const [ox, oz, r, hex] of [[-.040, -.018, .040, '#d9853a'], [.038, .012, .038, '#e09a3c'],
                                    [.004, .042, .036, '#8fa63e'], [-.010, -.048, .034, '#b2452f']])
      ball(5.80 + ox, ST + .070 + r * .55, 1.38 + oz, r, r * .86, r, C(hex), { gloss:.26 });

    // ---- a tea caddy and a stack of clean bowls.
    cyl(5.68, ST + .048, 1.19, .046, .096, col.jade, { gloss:.30 });
    cyl(5.68, ST + .104, 1.19, .048, .020, col.gold, { gloss:.42 });
    glyph(5.632, ST + .052, 1.19, -Math.PI / 2, '茶',
          { size:.046, color:col.gold, gloss:G.matte, lift:.004 });
    for (let i = 0; i < 3; i++)
      cyl(5.91, ST + .022 + i * .030, 1.19, .068 - i * .002, .052, col.porcelain, { gloss:.36 });
    cyl(5.91, ST + .096, 1.19, .066, .010, col.blue, { gloss:.34 });
  }

  // ================================================================ 饮水机 the water dispenser
  //
  // South-east corner, against the outer wall and clear of the kitchen doorway, which is assumed
  // to be at the west end of z = -1.6 where the traffic is. A bottled-water dispenser is standard
  // equipment in a Beijing flat and it is the room's other working verb.
  {
    const cx = 5.79, cz = -1.34, TOP = Y0 + .880;
    box(cx, Y0 + .440, cz, .360, .880, .340, col.white, { hard:true, gloss:.30, tag: '饮水机' });
    box(5.598, Y0 + .600, cz, .020, .220, .260, C('#c6c9c6'),
        { hard:true, gloss:.35, tag: '饮水机' });
    for (const [s, hex] of [[-1, '#b8342a'], [1, '#2f6f8f']]) {
      cyl(5.578, Y0 + .600, cz + s * .062, .011, .070, C(hex), { gloss:.50, tag: '饮水机' });
      box(5.566, Y0 + .662, cz + s * .062, .036, .022, .046, col.grey,
          { hard:true, gloss:.40, tag: '饮水机' });
    }
    box(5.600, Y0 + .500, cz, .078, .016, .260, C('#9aa1a5'),
        { hard:true, gloss:.45, tag: '饮水机' });
    cyl(cx, TOP + .015, cz, .105, .050, C('#bfc3c4'), { gloss:.34, tag: '饮水机' });
    cyl(cx, TOP + .070, cz, .045, .070, C('#9fc0c9'), { gloss:.55, alpha:.92, tag: '饮水机' });
    // The bottle, upside down as it is delivered: the taper mesh narrows toward +y, so it is
    // turned over to put the neck at the bottom.
    taper(cx, TOP + .200, cz, .270, .190, .270, C('#b6d0d6'),
          { rx:Math.PI, gloss:.60, alpha:.90, tag: '饮水机' });
    cyl(cx, TOP + .490, cz, .135, .400, C('#b6d0d6'), { gloss:.60, alpha:.90, tag: '饮水机' });
    ball(cx, TOP + .690, cz, .135, .080, .135, C('#b6d0d6'),
         { gloss:.60, alpha:.90, tag: '饮水机' });
    shade(cx, cz, .44, .42, .32, Y0 + .020);
    stop(5.58, 6.00, -1.53, -1.15);
    th('饮水机', cx, Y0 + 1.10, cz, '我去接杯水。', "I'll go and get a cup of water.",
       '饮水 drinking water + 机 machine. 接水 jiē shuǐ is to draw it off.',
       { focus:[cx, cz], reach:1.5 });
  }

  // ================================================================ 挂历 the wall calendar
  //
  // On the outer wall, low enough to read. Decoration rather than a labelled object: 日历 has no
  // dictionary row, and a thing whose headword the dictionary has never heard of is a crash and
  // not a missing gloss. The month matches the one hanging in the old flat.
  //
  // Everything on the face is a separate shallow box standing off the board, and the offsets are
  // chosen so no two of them share a plane: board front at x 5.972, the red header at 5.967, the
  // ruling at 5.962, the ringed date at 5.956 and its paper centre at 5.951.
  {
    const cz = -.90;
    box(5.982, Y0 + 1.600, cz, .020, .440, .320, col.linen, { hard:true, gloss:.14 });
    box(5.974, Y0 + 1.775, cz, .014, .085, .320, col.red, { hard:true, mode:1 });
    glyph(5.966, Y0 + 1.775, cz, -Math.PI / 2, '十月',
          { size:.062, gap:.010, color:col.gold, mode:1, gloss:G.matte, lift:.004 });
    for (let i = 0; i < 5; i++)
      box(5.968, Y0 + 1.685 - i * .062, cz, .012, .004, .280, C('#b3aa9c'),
          { hard:true, mode:1 });
    for (const oz of [-.09, 0, .09])
      box(5.968, Y0 + 1.561, cz + oz, .012, .290, .004, C('#bcb8ac'), { hard:true, mode:1 });
    // The ringed date. There is no ring in the mesh pack that would not want a shader change, so
    // it is a red disc with a smaller paper-coloured one standing in front of it.
    cyl(5.960, Y0 + 1.623, cz + .045, .022, .008, col.red, { rz:Math.PI / 2, mode:1 });
    cyl(5.954, Y0 + 1.623, cz + .045, .014, .006, col.linen, { rz:Math.PI / 2, mode:1 });
    cyl(5.978, Y0 + 1.845, cz, .006, .022, col.grey, { rz:Math.PI / 2, gloss:G.metal });
  }

  // ================================================================ 灯 the pendant
  //
  // Low: the shade bottom hangs 84 cm over the table top, which is where a dining pendant belongs
  // and is close enough that it lights the food rather than the room.
  //
  // The bulb is a 42 mm sphere at glow .16 and the shade's inner disc is .13. Glow is area
  // dependent — the same number that reads as a filament on something this size reads as a light
  // box on a shade — so the brightness in here comes from the real light below, not from painting
  // the fitting white.
  const lampY = Y0 + 1.70;
  cyl(TX, CEIL - .035, TZ, .065, .050, col.white, { gloss:G.paint });
  cap(TX, Y0 + 2.190, TZ, .009, .760, .009, col.charcoal, { gloss:G.metal });
  const shadeProp = taper(TX, lampY, TZ, .400, .210, .400, col.cream, { tag: '餐厅灯', gloss:.20, glow:.10 });
  const discProp  = cyl(TX, lampY - .094, TZ, .185, .012, C('#fff3d8'), { tag: '餐厅灯', mode:1, glow:.13 });
  const bulbProp  = ball(TX, lampY - .045, TZ, .042, .048, .042, C('#ffeecd'),
                         { tag: '餐厅灯', mode:1, glow:.16 });
  const lampLight = light(TX, lampY - .10, TZ, C('#ffd9a4'), .95, 3.0);
  th('灯', TX, lampY + .16, TZ, '吃饭的时候把灯开着。', 'Keep the light on while we eat.',
     '开灯 kāi dēng to switch it on, 关灯 guān dēng to switch it off.',
     { focus:[TX, TZ], reach:2.0 });

  // ---------------------------------------------------------------- handed back to the shell
  //
  // Two things this room cannot wire up from inside itself, published on the builder so whoever
  // owns js/world.js can pick them up in a line each rather than reading this file for them.
  //
  // `lamp` is the pendant's dimmable parts. The flat's light switch flips one global flag and
  // world.js dims the fitting it built itself; nothing dims this one, so without the hook this
  // pendant stays lit at three in the morning.
  //
  // `MEAL` is where a cooked meal is set down. It is the middle of the round table, on the
  // trivet, and it is empty by construction: nothing on the top comes within 20 cm of it. That is
  // the right answer culturally as well as mechanically — dishes go in the centre of a round table
  // and everybody reaches — and it is the obvious 放在桌子上 for the takeaway bag too.
  FlatFit['dining'].lamp = { shade: shadeProp, disc: discProp, bulb: bulbProp, light: lampLight };
  FlatFit['dining'].MEAL = { at: [TX, TT + .006, TZ], clear: .20, hz: '桌子' };
};
