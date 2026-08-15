// 大超市 — the hypermarket on the far side of the road, at the east end.
//
// The 超市 off the alley is 7.2 by 6 metres and sells five things. That is exactly right for a
// 便利店 on the ground floor of a walk-up — milk, noodles, a bag of rice, thirty seconds from your
// door — and it is precisely why this room exists separately rather than instead of it. The two
// shops are different transactions, and knowing which one you go to for what is itself a thing you
// learn about living here.
//
// A supermarket is the richest vocabulary environment in ordinary life. Every aisle is a domain,
// every item on every shelf is a countable noun with a measure word welded to it, and the signs
// hanging over the aisles are the room teaching its own contents. Sixty-seven dictionary rows
// arrived with this building and almost all of them are things you can walk up to.
//
// The layout is the one every Chinese hypermarket uses and it is not decoration: fresh food around
// the perimeter where the services and drains are (produce down the left, butcher, fish and hot
// deli across the back, dairy and freezers down the right), dry goods in gondola runs through the
// middle, and the checkouts across the front by the door. Walking it in that order is walking a
// real shop, which means the vocabulary arrives in the order a real shop teaches it.
const Market = Lazy('Market', () => {
  const col = {
    floor: C('#c9c5b8'), floorD: C('#bdb9ac'), floorL: C('#d4d0c4'),
    wall: C('#d8dad3'), wallD: C('#c2c5bd'), ceil: C('#cdd1cf'),
    steel: C('#a6adb4'), steelD: C('#6d757c'), metal: C('#8b939a'),
    charcoal: C('#33383d'), grey: C('#8d9298'), white: C('#f4f6f0'),
    trim: C('#b6bab4'), rail: C('#a8b0b6'),
    // The green a Chinese supermarket signs its fresh departments in, and the red of the
    // promotion tickets that are on absolutely everything.
    green: C('#2f8a52'), greenD: C('#1f6a3c'), greenL: C('#4aa86a'),
    red: C('#c8452f'), redD: C('#9a2f20'), gold: C('#e0b850'),
    blue: C('#2f6392'), teal: C('#4c8a86'),
    wood: C('#8b6a48'), woodD: C('#6a4f36'), crate: C('#9a7d5a'),
    glass: C('#a8c0cc'), glassLit: C('#cfe2e8'), chill: C('#bcd6de'),
    // produce
    tomato: C('#c33c2c'), cuke: C('#3f7a3a'), potato: C('#c2a273'), aubergine: C('#5b3a6b'),
    pepper: C('#3f8a44'), carrot: C('#d2762c'), onion: C('#d8c9a8'), garlic: C('#ece7d8'),
    ginger: C('#c8a86a'), scallion: C('#7faa4a'), mushroom: C('#cdbfa4'), spinach: C('#3c6b34'),
    apple: C('#c43a34'), banana: C('#dcc248'), tangerine: C('#e08a2c'), grape: C('#6a4a86'),
    melon: C('#3f7a44'), pear: C('#cfc06a'), peach: C('#dd9a7a'), berry: C('#c0304a'),
    // counters
    pork: C('#d98f8a'), beef: C('#a3453c'), chicken: C('#e6d3a8'), sausage: C('#a05244'),
    fish: C('#9aa8b0'), prawn: C('#e0a08a'), crab: C('#c05a3a'),
    // packaged
    boxA: C('#c8452f'), boxB: C('#2f6392'), boxC: C('#e0b850'), boxD: C('#4c8a86'),
    boxE: C('#a2705a'), boxF: C('#6a5a8a'), boxG: C('#d9d2c0'), boxH: C('#3f7a44'),
    milk: C('#eef2f4'), oil: C('#d8b24a'), soy: C('#4a3428'),
  };
  const G = { matte: .06, paint: .18, wood: .20, metal: .56, glass: .78, fabric: .05 };

  // ---------------------------------------------------------------- surfaces
  //
  // Tiling materials (js/assets.js), read triplanar in world space, so nothing here needs UVs
  // and one entry dresses a twenty-six metre floor and a four-centimetre shelf deck without
  // either coming out wrong. `matScale` is one repeat in metres. `matAmt` is how far the map
  // may move the colour, and it is deliberately at the low end of the usable band: the palette
  // above is the art direction, and the texture is here to stop surfaces reading as flat paint,
  // not to repaint the shop in whatever colour the photograph happened to be.
  //
  // Tiles141 carries a six-by-six grid of tiles inside one repeat, so .78 m lays a 13 cm
  // porcelain tile — the small hard-wearing floor a shop this size is actually tiled with, and
  // small enough that the run of it across twenty-six metres reads as a floor rather than as a
  // pattern. It is a bright map, which is the point: a hypermarket floor is the brightest
  // surface in the building and this room's was reading closer to a warehouse's.
  const FLOOR = { mat: 'tile', matScale: .78, matAmt: .30 };
  // The walls are above the fittings and mostly seen at a distance, so the relief that matters
  // is the normal map rather than the colour map — PaintedPlaster017 is nearly uniform in
  // albedo and all of its surface is in the bump.
  const PLASTER = { mat: 'plaster', matScale: .62, matAmt: .28 };
  // The sheet metal every fitting in here is pressed out of: gondola backs and decks, the
  // chiller cases, the freezer skins, the produce bases, the sides of the checkout lanes. The
  // map is luminance-neutral, so at this strength it adds surface without moving how bright any
  // of it is — which is what this room wants, being brighter rather than patchier. `nrmAmt` is
  // pulled to just over half so the ribbing stays a fine grain on shop steel instead of becoming
  // the corrugated iron the map was photographed from.
  const STEEL = { mat: 'steel', matScale: .55, matAmt: .28, nrmAmt: .55 };

  // ---------------------------------------------------------------- the four kinds of light
  //
  // A hypermarket is not lit evenly, and the unevenness is functional: long neutral runs down
  // the dry aisles, warm light over everything fresh because that is what makes meat and fruit
  // look like food, cold light in the cold chain because that is what the cases themselves put
  // out, and the checkouts a shade cooler again. Walking produce → aisles → freezers crosses
  // three of them, and that is most of how a real shop tells you which department you are in
  // without a single sign.
  const L_RUN   = [0.86, 0.93, 1.00];   // the ceiling runs over the dry goods
  const L_FRESH = [1.00, 0.86, 0.64];   // produce, butcher, fish, deli
  const L_COLD  = [0.74, 0.87, 1.00];   // chillers, freezers, the fish tanks
  const L_FRONT = [0.90, 0.95, 1.00];   // the checkouts and the door end

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, wall, glyphs, modelOr,
          solid: boundsSolid, blocker, shade, glow, thing } = B;
  // The market generators all speak in fixture centres and physical widths/depths. Build.solid
  // speaks in min/max bounds. Treating those two APIs as interchangeable left most gondolas,
  // counters, chillers and checkout lanes with reversed or metre-shifted collision rectangles.
  // Convert at this single seam so every visible footprint and every collider share one plan.
  const solid = (cx, cz, w, d) =>
    boundsSolid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);

  // 26 by 19 metres and 5.2 high — the size of a real neighbourhood hypermarket, and by a wide
  // margin the largest single room in this game.
  const RX = 13.0, RZ = 9.5, H = 5.2;
  const DX = 9.4;                        // the doors, at the +x end of the front wall
  // Back onto 新天地步行街, not the far pavement. 大超市 moved off the x 41.60 building line and
  // onto the lane's SOUTH frontage at z -12.60 (js/street-lane.js), so this stepped you out at
  // (39.05, 6.50) — a spot on the far pavement with a row of anonymous shopfronts behind it and
  // no hypermarket anywhere in sight. 2.55 m out into the lane, facing +z, which is away from the
  // shop, the way you leave a building. Inside the lane zone (z -11.90 .. -6.50) by 1.85 m.
  const OUT = { x: 52.80, z: -10.05, yaw: 0 };

  const litProps = [], tubes = [], entranceLeaves = [], beltMarkers = [];
  const litten = (p, k) => { litProps.push({ p, k }); return p; };
  const pane = (p, k) => litten(p, k);
  const pick = (arr, i) => arr[i % arr.length];

  // ---------------------------------------------------------------- department parts
  //
  // Everything below is a generator rather than a list of boxes, because a hypermarket is the same
  // six fittings repeated forty times and written out longhand it would be nine thousand lines.

  // A gondola: a double-sided dry-goods run with four decks a side. `items` is the palette of what
  // is stacked on it, so the snack aisle and the oil aisle are the same fitting with different
  // contents — which is exactly what they are in the shop.
  function gondola(cx, z0, z1, tag, items, o = {}) {
    const len = z1 - z0, mid = (z0 + z1) / 2;
    // the spine and the base kick, in pressed steel
    box(cx, .90, mid, .22, 1.80, len, col.steel, { hard: true, gloss: G.metal, tag, ...STEEL });
    box(cx, .09, mid, .96, .18, len, col.steelD, { hard: true, gloss: G.metal, tag, ...STEEL });
    // the ticket rail along the top, which is where the promotion cards live
    box(cx, 1.86, mid, 1.00, .10, len, col.white, { hard: true, gloss: G.paint, tag });
    for (const s of [-1, 1]) {
      for (let d = 0; d < 4; d++) {
        const sy = .34 + d * .40;
        box(cx + s * .30, sy, mid, .48, .04, len, col.steel,
          { hard: true, gloss: G.metal, tag, ...STEEL });
        // the stock: runs of one product, because that is how a shelf is faced up
        const n = Math.max(3, Math.round(len / .38));
        let run = 0, ci = (d * 3 + (s > 0 ? 1 : 0)) % items.length;
        for (let i = 0; i < n; i++) {
          if (run <= 0) { run = 2 + ((i + d) % 4); ci = (ci + 1 + (i % 2)) % items.length; }
          run--;
          const iz = z0 + .18 + i * ((len - .36) / (n - 1));
          const it = items[ci];
          const bh = (it.h || .22) * 1.35, bw = (it.w || .16) * 1.30;
          const px = cx + s * (.30 + .10);
          if (it.mesh === 'cyl') cyl(px, sy + bh / 2, iz, bw / 2, bh, it.c, { gloss: .30, tag: it.tag || tag });
          else box(px, sy + bh / 2, iz, bw, bh, .26, it.c, { hard: true, gloss: .24, tag: it.tag || tag });
        }
      }
      // the red promotion tickets clipped along the front edge of two decks
      for (let d = 0; d < 4; d += 2)
        for (let i = 0; i < Math.round(len / 1.1); i++)
          box(cx + s * .53, .30 + d * .40, z0 + .5 + i * 1.1, .02, .11, .17, col.red,
            { hard: true, mode: 1, gloss: .20, tag: '促销' });
    }
    solid(cx, mid, 1.06, len);
    if (o.sign) aisleSign(cx, mid, o.sign, o.signEn);
  }

  // The hanging sign over an aisle. This is the room's own teaching: you find the soy sauce by
  // reading 米面粮油, not by walking every aisle.
  function aisleSign(cx, cz, text, sub) {
    box(cx, 3.62, cz, 1.90, .52, .06, col.blue, { hard: true, gloss: .28, tag: text });
    for (const s of [-1, 1])
      capsule(cx + s * .70, 4.10, cz, .014, .90, .014, col.steelD, { gloss: G.metal });
    // Both faces, and the yaw has to point *away* from the board on each side. Written the other
    // way round — which is how this first went in — every sign in the shop was a blank blue plank,
    // because the characters were facing into six centimetres of steel. The one room in the game
    // whose whole idea is that you find things by reading the signs.
    for (const g of glyphs(cx, 3.62, cz - .05, Math.PI, text,
      { size: .26, gap: .09, color: col.white, mode: 1, tag: text })) litten(g, .5);
    for (const g of glyphs(cx, 3.62, cz + .05, 0, text,
      { size: .26, gap: .09, color: col.white, mode: 1, tag: text })) litten(g, .5);
  }

  // 生鲜 a produce table: a sloped crate bed on a base, piled with one thing. The slope is what
  // makes produce read as produce from across a room.
  function produceTable(cx, cz, w, d, items) {
    box(cx, .34, cz, w, .68, d, col.steelD, { hard: true, gloss: G.metal, tag: '蔬菜', ...STEEL });
    box(cx, .70, cz, w + .06, .05, d + .06, col.steel, { hard: true, gloss: G.metal, tag: '蔬菜' });
    const cols = Math.max(1, Math.round(w / .62)), rows = Math.max(1, Math.round(d / .62));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const it = pick(items, i * rows + j);
      const bx = cx - w / 2 + (i + .5) * (w / cols), bz = cz - d / 2 + (j + .5) * (d / rows);
      // the crate, tipped towards the aisle
      box(bx, .80, bz, w / cols - .06, .16, d / rows - .06, col.crate,
        { hard: true, rx: -.13, gloss: G.wood, tag: it.tag });
      // and what is in it, as a heap of its own colour
      for (let k = 0; k < 7; k++) {
        const a = k * 1.9, r = .10 + (k % 3) * .045;
        ball(bx + Math.cos(a) * r, .90 + (k % 2) * .035, bz + Math.sin(a) * r * .8,
          it.r || .055, (it.r || .055) * .9, it.r || .055, it.c, { gloss: .26, tag: it.tag });
      }
      // the price card on the front lip
      box(bx, .86, bz - d / rows / 2 + .03, .17, .10, .012, col.white,
        { hard: true, mode: 1, gloss: .16, tag: it.tag });
    }
    // Warm light, hung low and set out towards the aisle rather than centred over the bed. A
    // produce table is lit from in front and slightly above so the light falls down the tipped
    // face of the crates, which is the whole reason they are tipped: the fruit is what catches
    // it. Overhead and centred it lights the rims and leaves the fruit in its own shadow.
    B.light(cx + .40, 2.85, cz, L_FRESH, .48, 2.4);
    solid(cx, cz, w, d);
  }

  // A service counter: glass front, a chilled bed of product, a scale and somebody's side of it.
  function serviceCounter(cx, cz, w, tag, items, signText) {
    box(cx, .50, cz, w, 1.00, 1.00, col.white, { hard: true, gloss: G.paint, tag });
    box(cx, 1.02, cz, w + .06, .06, 1.10, col.steel, { hard: true, gloss: G.metal, tag });
    // the sloped glass over the display
    pane(box(cx, 1.26, cz - .46, w, .52, .03, col.glass,
      { hard: true, mode: 1, alpha: .28, rx: .32, gloss: G.glass, tag }), .8);
    // the product in the bed, in trays
    const n = Math.max(2, Math.round(w / .78));
    for (let i = 0; i < n; i++) {
      const it = pick(items, i);
      const bx = cx - w / 2 + (i + .5) * (w / n);
      box(bx, 1.00, cz - .16, w / n - .10, .06, .52, col.steel,
        { hard: true, gloss: G.metal, tag: it.tag });
      for (let k = 0; k < 5; k++)
        box(bx - .16 + (k % 3) * .16, 1.06 + Math.floor(k / 3) * .05, cz - .30 + (k % 2) * .22,
          .14, .05, .17, it.c, { hard: true, rz: (k % 3 - 1) * .12, gloss: .22, tag: it.tag });
      box(bx, 1.10, cz - .49, .16, .10, .012, col.white,
        { hard: true, mode: 1, gloss: .16, tag: it.tag });
    }
    // the scale and the back rail
    box(cx + w / 2 - .5, 1.12, cz + .18, .30, .14, .26, col.charcoal,
      { hard: true, gloss: .30, tag: '称重' });
    litten(box(cx + w / 2 - .5, 1.21, cz + .10, .24, .09, .02, col.glassLit,
      { hard: true, mode: 1, glow: .22, tag: '称重' }), .5);
    if (signText) {
      box(cx, 2.72, cz + .52, w * .55, .48, .06, col.green, { hard: true, gloss: .26, tag: signText });
      for (const g of glyphs(cx, 2.72, cz + .47, Math.PI, signText,
        { size: .26, gap: .10, color: col.white, mode: 1, tag: signText })) litten(g, .7);
    }
    // The warm bar over the service counter, in front of the glass rather than behind it, which
    // is where the light on a butcher's or a deli's display actually comes from. The lit strip
    // in the bed and the pane over it are what the counter looks like; neither of them has ever
    // put a single lumen on the trays, so a whole counter of meat has been lit until now by a
    // bulb in the middle of a twenty-six metre room.
    B.light(cx, 2.55, cz - .55, L_FRESH, .45, 2.6);
    solid(cx, cz, w, 1.10);
  }

  // 冷藏 an upright glass chiller, the kind the dairy lives in.
  function chiller(cx, cz, w, tag, items) {
    box(cx, 1.05, cz, .82, 2.10, w, col.steelD, { hard: true, gloss: G.metal, tag, ...STEEL });
    box(cx, 2.16, cz, .90, .12, w + .04, col.steel, { hard: true, gloss: G.metal, tag, ...STEEL });
    // the glass doors, with their frames
    const doors = Math.max(1, Math.round(w / 1.0));
    for (let i = 0; i < doors; i++) {
      const dz = cz - w / 2 + (i + .5) * (w / doors);
      pane(box(cx - .42, 1.10, dz, .04, 1.86, w / doors - .06, col.chill,
        { hard: true, mode: 1, alpha: .26, gloss: G.glass, tag }), .9);
      capsule(cx - .46, 1.10, dz - (w / doors) / 2 + .10, .016, 1.20, .016, col.steel,
        { gloss: G.metal, tag });
    }
    // four lit decks of product behind the glass
    for (let d = 0; d < 4; d++) {
      const sy = .38 + d * .44;
      litten(box(cx, sy, cz, .68, .03, w - .08, col.steel,
        { hard: true, mode: 1, glow: .10, gloss: G.metal, tag }), .6);
      const n = Math.max(3, Math.round(w / .22));
      for (let i = 0; i < n; i++) {
        const it = pick(items, i + d);
        const iz = cz - w / 2 + .12 + i * ((w - .24) / (n - 1));
        if (it.mesh === 'cyl') cyl(cx + .02, sy + .10, iz, .055, .20, it.c, { gloss: .34, tag: it.tag });
        else box(cx + .02, sy + .11, iz, .17, .22, .15, it.c, { hard: true, gloss: .26, tag: it.tag });
      }
    }
    // Cold light, out in the aisle above the case rather than inside it. Inside is where the
    // strip really is, but a point light in there sits a hand's width from the top deck and
    // burns it out, and none of this renderer's lights are occluded by the cabinet anyway. Out
    // here it does the thing the case is recognised by: a cold pool on the floor in front of it
    // and a cold edge on the case and the cartons, against the neutral of the aisles behind you.
    // The panes themselves are mode 1 and take no light from this or anything else — what makes
    // them read is the lit product behind them, which is exactly what this is aimed at.
    B.light(cx - .80, 3.40, cz, L_COLD, .48, 2.6);
    solid(cx, cz, .92, w);
  }

  // 冷冻 an open chest freezer, seen from above — the ones you lean into.
  function freezerBin(cx, cz, w, d, items, tag) {
    box(cx, .42, cz, w, .84, d, col.white, { hard: true, gloss: G.paint, tag, ...STEEL });
    box(cx, .86, cz, w + .06, .06, d + .06, col.steel, { hard: true, gloss: G.metal, tag });
    // the cold well, and the frost light in it
    box(cx, .74, cz, w - .16, .20, d - .16, col.chill, { hard: true, mode: 1, alpha: .5, gloss: .5, tag });
    litten(box(cx, .70, cz, w - .24, .02, d - .24, col.glassLit,
      { hard: true, mode: 1, glow: .16, tag }), .7);
    const cols = Math.max(2, Math.round(w / .40)), rows = Math.max(1, Math.round(d / .40));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const it = pick(items, i * rows + j);
      box(cx - w / 2 + (i + .5) * (w / cols), .80, cz - d / 2 + (j + .5) * (d / rows),
        w / cols - .07, .10, d / rows - .07, it.c,
        { hard: true, ry: (i * 7 + j) % 5 * .1, gloss: .22, tag: it.tag });
    }
    // And the cold overhead, which is what you lean into the well through. The frost light in
    // the bottom of the bin is emissive and lights nothing; this is what actually puts a cold
    // edge on the bags of dumplings and on the rim you put your hands on.
    B.light(cx, 2.55, cz, L_COLD, .42, 2.2);
    solid(cx, cz, w, d);
  }

  // 收银台 a checkout lane: belt, till, screen, divider rail and the bagging end.
  function checkoutLane(cx, cz, i) {
    const T = { tag: '收银台' };
    const on = i % 3 !== 2;                       // not every lane is open, ever
    box(cx, .45, cz, 1.10, .90, 2.60, col.white, { ...T, hard: true, gloss: G.paint, ...STEEL });
    box(cx, .92, cz, 1.16, .06, 2.66, col.steel, { ...T, hard: true, gloss: G.metal });
    // the belt
    box(cx, .95, cz - .40, .62, .03, 1.60, col.charcoal, { ...T, hard: true, gloss: .22 });
    if (on) for (let j = 0; j < 5; j++) {
      const z0=cz-1.10+j*.31;
      const p=box(cx,.972,z0,.52,.012,.045,col.steelD,{...T,hard:true,gloss:.34});
      // The marker travels the whole belt; enlarge its packed cull sphere before finish().
      p.fixed=true; p.cx=cx; p.cy=.972; p.cz=cz-.40; p.r=.92;
      beltMarkers.push({p,z0:cz-1.10,phase:j/5+i*.137});
    }
    // the till and its screen, on the far side
    box(cx + .26, 1.10, cz + .82, .34, .26, .30, col.grey, { ...T, hard: true, gloss: .26 });
    litten(box(cx + .26, 1.24, cz + .70, .28, .18, .02, col.glassLit,
      { ...T, hard: true, mode: 1, glow: .24 }), .5);
    // the lane number on a pole, which is how you are told which one is open
    capsule(cx - .48, 1.70, cz - 1.20, .022, 1.50, .022, col.steelD, { gloss: G.metal });
    litten(box(cx - .48, 2.48, cz - 1.20, .34, .30, .05, on ? col.green : col.grey,
      { hard: true, mode: 1, glow: on ? .30 : .04, tag: '收银台' }), on ? .9 : .2);
    for (const g of glyphs(cx - .48, 2.48, cz - 1.26, 0, String(i + 1),
      { size: .17, gap: .05, color: col.white, mode: 1, tag: '收银台' })) litten(g, .6);
    solid(cx, cz, 1.20, 2.70);
  }

  // 购物车 a trolley, in the bay by the door and scattered about the shop.
  function trolley(cx, cz, ry) {
    const T = { ry, tag: '购物车' };
    // TRELLIS.2 may replace only the trolley's visual shell. Keeping this authored cage as the
    // fallback means a missing or rejected asset leaves the bay exactly as usable as before.
    modelOr('supermarket_shopping_trolley', cx, 0, cz, 1, { ...T, gloss: .34 }, () => {
      // the basket, as a tapered cage
      taper(cx, .62, cz, .56, .44, .92, col.steel, { ...T, hard: true, gloss: G.metal });
      box(cx, .86, cz, .60, .04, .96, col.steel, { ...T, hard: true, gloss: G.metal });
      // the handle and the legs
      capsule(cx, .96, cz + .46, .020, .54, .020, col.red, { ...T, rz: Math.PI / 2, gloss: .30 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        capsule(cx + sx * .24, .20, cz + sz * .38, .016, .40, .016, col.steelD,
          { ...T, gloss: G.metal });
        cyl(cx + sx * .24, .05, cz + sz * .38, .05, .04, col.charcoal,
          { ...T, rx: Math.PI / 2, gloss: .28 });
      }
    });
  }

  // ---------------------------------------------------------------- the stock lists
  const DRY_OIL = [
    { c: col.oil, mesh: 'cyl', w: .16, h: .30, tag: '油' },
    { c: col.soy, mesh: 'cyl', w: .13, h: .26, tag: '酱油' },
    { c: col.boxG, mesh: 'cyl', w: .12, h: .24, tag: '醋' },
    { c: col.boxB, w: .18, h: .20, tag: '盐' },
    { c: col.boxC, w: .17, h: .22, tag: '味精' },
    { c: col.boxE, w: .22, h: .26, tag: '面粉' },
    { c: col.boxG, w: .24, h: .18, tag: '面条' },
  ];
  const DRY_SNACK = [
    { c: col.boxA, w: .20, h: .26, tag: '薯片' },
    { c: col.boxC, w: .17, h: .20, tag: '饼干' },
    { c: col.boxF, w: .14, h: .16, tag: '糖果' },
    { c: col.boxH, w: .16, h: .22, tag: '瓜子' },
    { c: col.boxD, w: .15, h: .24, tag: '茶叶' },
  ];
  const DRY_DRINK = [
    { c: col.red, mesh: 'cyl', w: .13, h: .26, tag: '可乐' },
    { c: col.boxH, mesh: 'cyl', w: .14, h: .28, tag: '啤酒' },
    { c: col.boxC, mesh: 'cyl', w: .13, h: .25, tag: '果汁' },
    { c: col.glassLit, mesh: 'cyl', w: .12, h: .30, tag: '水' },
  ];
  const DRY_HOME = [
    { c: col.boxG, w: .26, h: .28, tag: '纸巾' },
    { c: col.boxB, w: .22, h: .30, tag: '洗衣粉' },
    { c: col.boxD, w: .18, h: .20, tag: '垃圾袋' },
    { c: col.boxF, w: .14, h: .18, tag: '肥皂' },
    { c: col.white, w: .12, h: .20, tag: '牙膏' },
  ];
  const VEG = [
    { c: col.tomato, tag: '西红柿' }, { c: col.cuke, tag: '黄瓜', r: .05 },
    { c: col.potato, tag: '土豆' }, { c: col.aubergine, tag: '茄子', r: .06 },
    { c: col.pepper, tag: '青椒' }, { c: col.carrot, tag: '胡萝卜', r: .045 },
    { c: col.onion, tag: '洋葱' }, { c: col.garlic, tag: '大蒜', r: .04 },
    { c: col.ginger, tag: '生姜', r: .045 }, { c: col.scallion, tag: '葱', r: .04 },
    { c: col.mushroom, tag: '蘑菇', r: .04 }, { c: col.spinach, tag: '菠菜', r: .06 },
  ];
  const FRUIT = [
    { c: col.apple, tag: '苹果' }, { c: col.banana, tag: '香蕉', r: .06 },
    { c: col.tangerine, tag: '橘子', r: .05 }, { c: col.grape, tag: '葡萄', r: .045 },
    { c: col.melon, tag: '西瓜', r: .12 }, { c: col.pear, tag: '梨' },
    { c: col.peach, tag: '桃子' }, { c: col.berry, tag: '草莓', r: .035 },
  ];
  const MEAT = [
    { c: col.pork, tag: '猪肉' }, { c: col.beef, tag: '牛肉' },
    { c: col.chicken, tag: '鸡肉' }, { c: col.beef, tag: '排骨' },
    { c: col.pork, tag: '肉馅' }, { c: col.sausage, tag: '香肠' },
  ];
  const SEA = [{ c: col.fish, tag: '鱼' }, { c: col.prawn, tag: '虾' }, { c: col.crab, tag: '螃蟹' }];
  const DELI = [{ c: col.sausage, tag: '烤鸡' }, { c: col.boxE, tag: '熟食' }];
  const DAIRY = [
    { c: col.milk, mesh: 'cyl', tag: '牛奶' }, { c: col.white, tag: '酸奶' },
    { c: col.boxC, tag: '奶酪' }, { c: col.boxG, tag: '黄油' },
    { c: col.boxA, tag: '鸡蛋' },
  ];
  const FROZEN = [
    { c: col.boxG, tag: '饺子' }, { c: col.white, tag: '汤圆' },
    { c: col.boxB, tag: '冷冻' }, { c: col.boxD, tag: '冰淇淋' },
  ];

  function build() {
    // Every character this room draws has to be in the atlas before it is built, or it renders as
    // a blank cell — which is what the aisle signs were: white slivers on blue boards, in the one
    // room whose entire premise is that you find the soy sauce by reading the sign over the aisle.
    Glyphs.need('生鲜冷冻日用品米面粮油零食酒水肉海鲜熟食大超市出口收银台购物车蔬菜水果乳制品123456');

    // ================================================================ shell
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor, { mode: 0, gloss: .16, ...FLOOR });
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2],
    ]) wall(x, y, z, w, h, yaw, col.wall, { mode: 4, ...PLASTER });
    // The front is glazing plus a real 3.8 m door opening, not an automatic door animated over an
    // opaque wall.  Three piers and one high lintel retain the shell while leaving the window and
    // sliding leaves below physically visible all the way through.
    for(const [x,w] of [[-11.75,2.50],[7.05,1.10],[12.10,1.80]])
      box(x,H/2,-RZ,w,H,.18,col.wall,{hard:true,mode:4,...PLASTER});
    box(0,H-.65,-RZ,RX*2,1.30,.18,col.wall,{hard:true,mode:4,...PLASTER});

    // A lightweight continuation of the business-district pavement and road fills both the glass
    // shopfront and the door gap.  It is deliberately wider than the whole façade so camera orbit
    // cannot expose a card edge; changing scene still belongs to the named door at the threshold.
    flat(0,.004,-RZ-1.70,RX*2,3.40,col.floorD,
      {mat:'paving',matScale:1.12,matAmt:.25,gloss:.10,tag:'门外'});
    box(0,.10,-RZ-3.38,RX*2,.20,.18,col.steelD,{hard:true,gloss:.22,tag:'门外'});
    flat(0,.001,-RZ-5.72,RX*2+8,4.55,col.charcoal,
      {mat:'concrete',matScale:2.9,matAmt:.15,gloss:.13,tag:'门外'});
    for(let x=-14;x<=14;x+=4.6)
      flat(x,.010,-RZ-5.72,1.75,.10,col.gold,{mode:1,alpha:.64,tag:'门外'});
    box(0,3.65,-RZ-8.42,RX*2+10,7.30,.38,col.wallD,
      {hard:true,mode:14,...PLASTER,tag:'门外'});
    box(0,.56,-RZ-8.18,RX*2+10,1.12,.20,col.blue,{hard:true,tag:'门外'});
    for(let x=-14;x<=14;x+=3.5) {
      box(x,2.08,-RZ-8.18,2.45,2.62,.08,col.charcoal,{hard:true,gloss:.22,tag:'门外'});
      pane(box(x,2.08,-RZ-8.12,2.25,2.42,.025,col.glass,
        {hard:true,mode:1,alpha:.42,gloss:G.glass,tag:'门外'}),.34);
    }
    cyl(4.8,.98,-RZ-1.72,.12,1.96,col.woodD,{gloss:.18,tag:'门外'});
    ball(4.8,2.20,-RZ-1.72,.82,.74,.82,col.green,{mode:15,gloss:.09,tag:'门外'});
    box(-5.0,.58,-RZ-5.12,3.60,.70,1.54,col.red,
      {hard:true,round:.15,mode:7,gloss:.25,tag:'门外'});
    for(const x of [-6.15,-3.85]) cyl(x,.30,-RZ-5.12,.30,.12,col.charcoal,
      {rx:Math.PI/2,gloss:.16,tag:'门外'});
    // the polished floor in bands, which is what a shop floor of this size actually looks like.
    // These sit four millimetres over the slab above and cover all of it, so the tile has to go
    // on both or the room is tiled only in the four-centimetre gaps between the bands. Both take
    // the same scale and strength, and the material is sampled in world space rather than per
    // quad, so the tile grid runs straight through all twenty-seven of them and the bands stay
    // what they are: a polish laid over one continuous floor, not twenty-seven separate ones.
    for (let i = -13; i <= 13; i++)
      flat(i * 1.0, .004, 0, .96, RZ * 2 - .1, i % 2 ? col.floorL : col.floorD,
        { gloss: .14, ...FLOOR });

    // ================================================================ 蔬菜/水果 produce, down -x
    produceTable(-11.0, -4.2, 3.0, 2.2, VEG);
    produceTable(-11.0, -1.2, 3.0, 2.2, VEG);
    produceTable(-11.0, 1.8, 3.0, 2.2, FRUIT);
    produceTable(-11.0, 4.8, 3.0, 2.2, FRUIT);
    box(-12.6, 3.30, .3, .10, .60, 5.0, col.green, { hard: true, gloss: .26, tag: '生鲜' });
    for (const g of glyphs(-12.54, 3.30, .3, Math.PI / 2, '生鲜',
      { size: .40, gap: .16, color: col.white, mode: 1, tag: '生鲜' })) litten(g, .8);

    // ================================================================ the back wall services
    serviceCounter(-8.2, 8.4, 4.4, '肉', MEAT, '肉');
    serviceCounter(-2.6, 8.4, 3.6, '海鲜', SEA, '海鲜');
    serviceCounter(3.4, 8.4, 3.6, '熟食', DELI, '熟食');
    // the fish tanks, which are the thing that makes a Chinese supermarket unmistakable
    for (let i = 0; i < 3; i++) {
      const tx = -2.6 - 1.3 + i * 1.3;
      pane(box(tx, 1.55, 9.05, 1.20, .90, .70, col.chill,
        { hard: true, mode: 1, alpha: .34, gloss: G.glass, tag: '海鲜' }), .9);
      litten(box(tx, 1.98, 9.05, 1.10, .04, .60, col.glassLit,
        { hard: true, mode: 1, glow: .22, tag: '海鲜' }), .8);
    }
    // One cold light over the tank run. Small radius on purpose: it belongs to the tanks and the
    // strip of back wall above them, and it is the coldest thing in the shop because a live tank
    // is lit by a bare blue-white tube sitting on top of it.
    B.light(-2.6, 2.18, 9.08, L_COLD, .38, 1.6);

    // ================================================================ 乳制品/冷冻 down +x
    chiller(11.9, -5.0, 3.6, '乳制品', DAIRY);
    chiller(11.9, -1.0, 3.6, '乳制品', DAIRY);
    chiller(11.9, 3.0, 3.6, '酒水', DRY_DRINK);
    for (let i = 0; i < 3; i++) freezerBin(8.4, -5.4 + i * 2.5, 2.2, 1.9, FROZEN, '冷冻');
    box(12.6, 3.30, -3.0, .10, .60, 4.4, col.blue, { hard: true, gloss: .26, tag: '冷冻' });
    for (const g of glyphs(12.54, 3.30, -3.0, -Math.PI / 2, '冷冻',
      { size: .40, gap: .16, color: col.white, mode: 1, tag: '冷冻' })) litten(g, .8);

    // ================================================================ the dry aisles
    gondola(-5.6, -5.6, 5.6, '米', DRY_OIL, { sign: '米面粮油' });
    gondola(-1.8, -5.6, 5.6, '零食', DRY_SNACK, { sign: '零食' });
    gondola(1.8, -5.6, 5.6, '酒水', DRY_DRINK, { sign: '酒水' });
    gondola(5.4, -5.6, 5.6, '日用品', DRY_HOME, { sign: '日用品' });
    // sacks of rice on the floor at the end of the first aisle, because they always are
    for (let i = 0; i < 6; i++)
      box(-5.6 + (i % 2 ? .34 : -.34), .16 + Math.floor(i / 2) * .22, -6.6,
        .62, .22, .44, col.crate, { hard: true, ry: (i % 3) * .12, gloss: .16, tag: '米' });

    // ================================================================ 收银台 the front
    for (let i = 0; i < 6; i++) checkoutLane(-9.0 + i * 2.3, -7.6, i);
    // the trolley bay by the door, and a few loose in the shop
    for (let i = 0; i < 6; i++) trolley(11.2, -8.4 + i * .52, Math.PI);
    trolley(-3.4, -3.0, .6); trolley(6.8, 1.4, -1.2);

    // ---- the doors, and the glazed front the street shows through
    const dz = -RZ + .06;
    for (const s of [-1, 1]) {
      const p=pane(box(DX + s * .95, 1.60, dz, 1.70, 3.20, .05, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass, tag: '门' }), .95);
      entranceLeaves.push({p,s,x0:DX+s*.95,obx0:p.ob.x});
      p.fixed=true; p.cx=p.m[12]; p.cy=p.m[13]; p.cz=p.m[14]; p.r=2.05;
    }
    box(DX, 3.30, dz, 4.10, .30, .12, col.steelD, { hard: true, gloss: G.metal, tag: '门' });
    pane(box(-2.0, 1.90, dz, 17.0, 3.80, .04, col.glass,
      { hard: true, mode: 1, alpha: .22, gloss: G.glass }), .95);
    for (const g of glyphs(DX, 4.10, dz + .10, 0, '出口',
      { size: .22, gap: .08, color: col.charcoal, mode: 1, tag: '门' })) litten(g, .4);

    // ---- the name over the checkouts, facing you as you walk in
    for (const g of glyphs(-2.0, 4.30, RZ - .12, 0, '大超市',
      { size: .52, gap: .20, color: col.red, mode: 1 })) litten(g, .9);

    // ================================================================ lighting
    // A grid of the flat panel lights every shop this size has, which is what makes the floor read
    // as a floor rather than as a plane.
    for (let ix = -3; ix <= 3; ix++) for (let iz = -1; iz <= 1; iz++) {
      const lx = ix * 3.6, lz = iz * 5.4;
      box(lx, H - .05, lz, 2.60, .06, .70, col.white, { hard: true, gloss: .28 });
      litten(box(lx, H - .09, lz, 2.46, .04, .58, C('#f4f8ff'),
        { hard: true, mode: 1, glow: .11 }), .62);
      tubes.push(glow(M.trs(lx, H - .12, lz, 0, 2.46, 1, .58), C('#eef4ff'), 0));
      // And the light itself, half a metre below the fitting. The panel and the glow under it
      // are what the fitting looks like and between them they have never lit anything: this room
      // has been lit, all twenty-six metres of it, by the single bulb every room gets, which is
      // why the far corners have always fallen away.
      //
      // The five inner columns only. The outermost pair sit over the produce run and over the
      // dairy cases, and both of those have their own light of their own colour a metre and a
      // half lower — putting a neutral run over them as well would wash out exactly the
      // separation the warm and the cold are there to make. Only the nearest eight lights to the
      // camera reach the shader (js/game.js), so what a run of these buys is that in a dry aisle
      // the eight nearest are all ceiling, and at a counter or a case the department's own light
      // is nearer than any of them and takes the first slot.
      if (Math.abs(ix) <= 2) B.light(lx, H - .60, lz, L_RUN, .50, 3.5);
    }
    // The checkout end, which the panel grid does not reach — it stops at z = -5.4 and the lanes
    // are at -7.6, so the front four metres of the shop, the part you stand in while you pay and
    // the part you walk into off the street, has been the dimmest floor in the building. Broad
    // and soft rather than four hotspots, because there is no fitting modelled up there to be the
    // source of a hotspot, and a bright patch of ceiling with nothing on it reads as a mistake.
    for (const lx of [-7.5, -3.0, 1.5, 10.4]) B.light(lx, 4.40, -7.40, L_FRONT, .45, 3.4);

    // ================================================================ what you can walk up to
    thing('蔬菜', -11.0, 1.10, -2.7, '西红柿多少钱一斤？',
      'How much are the tomatoes a catty?',
      'The vegetable tables. Everything here is sold by weight — 一斤 is 500 g.',
      { focus: [-8.9, -2.7], reach: 2.4 });
    thing('水果', -11.0, 1.10, 3.3, '苹果和梨都很新鲜。', 'The apples and pears are both fresh.',
      'The fruit tables, at the end of the fresh run.', { focus: [-8.9, 3.3], reach: 2.4 });
    thing('肉', -8.2, 1.50, 7.6, '来半斤肉馅。', 'Half a catty of mince, please.',
      'The butcher’s counter. 猪肉 is the default meat: 肉 on its own usually means pork.',
      { focus: [-8.2, 6.6], reach: 2.2 });
    thing('海鲜', -2.6, 1.50, 7.6, '这鱼是活的吗？', 'Is this fish alive?',
      'The fish counter and the tanks behind it.', { focus: [-2.6, 6.6], reach: 2.2 });
    thing('熟食', 3.4, 1.50, 7.6, '要半只烤鸡。', 'Half a roast chicken, please.',
      'The hot deli. Cooked food, sold by weight and by the half.',
      { focus: [3.4, 6.6], reach: 2.2 });
    thing('乳制品', 11.9, 1.50, -3.0, '牛奶在冷柜里。', 'The milk is in the chiller.',
      '乳制品 dairy products — the sign over the whole run.', { focus: [10.2, -3.0], reach: 2.2 });
    thing('冷冻', 8.4, 1.00, -5.4, '冷冻饺子，一袋二十个。',
      'Frozen dumplings, twenty to a bag.', 'The freezer bins.', { focus: [6.9, -5.4], reach: 2.2 });
    thing('米面粮油', -5.6, 2.10, 0, '油和酱油在这一排。',
      'The oil and the soy sauce are in this aisle.',
      'Rice, flour, grain and oil — the four things a Chinese kitchen is built on.',
      { focus: [-4.4, 0], reach: 2.4 });
    thing('零食', -1.8, 2.10, 0, '零食太多了，挑不过来。',
      'Too many snacks. You cannot get through them all.',
      'The snack aisle.', { focus: [-.6, 0], reach: 2.4 });
    thing('日用品', 5.4, 2.10, 0, '纸巾和洗衣粉在日用品。',
      'Tissues and washing powder are in household.',
      '日用品 — literally daily-use goods.', { focus: [6.6, 0], reach: 2.4 });
    thing('购物车', 11.2, .90, -8.4, '拿个购物车吧。', 'Take a trolley.',
      'A trolley, from the bay by the door.', { focus: [9.9, -8.4], reach: 2.0 });
    thing('收银台', -9.0, 1.20, -7.6, '一共多少钱？', 'How much altogether?',
      'The checkouts. The lit number over a lane means it is open.',
      { focus: [-9.0, -6.0], reach: 2.4 });
    thing('门', DX, 2.20, dz + .20, '该走了。', 'Time to leave.',
      'Out through the doors and back onto the pavement.',
      { focus: [DX, dz + 1.30], reach: 2.2 }).exit = { place: 'street', at: OUT };

    // colliders for the perimeter fittings the generators did not already claim
    solid(-12.6, .3, .24, 5.2);
    solid(12.6, -3.0, .24, 4.6);
  }

  build();

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .22;
    for (const g of tubes) g.a = soft * .07;
  }

  function tick(t, body) {
    // Five evenly-spaced slats recycle beneath each staffed checkout. Only the thin visual
    // markers move; the counter and its collision rectangle stay exactly where they were built.
    for(let i=0;i<beltMarkers.length;i++) {
      const q=beltMarkers[i], p=q.p;
      let u=(t*.24+q.phase)%1; if(u<0) u+=1;
      p.m[14]=q.z0+u*1.44; p.cz=p.m[14];
    }
    const dx=body?body.x-DX:99, dz=body?body.z-(-RZ+.75):99;
    let open=1-Math.min(1,Math.hypot(dx,dz)/2.30);
    open=open*open*(3-2*open);
    for(const d of entranceLeaves) {
      const x=d.x0+d.s*.78*open, p=d.p;
      p.m[12]=x; p.cx=x;
      if(p.ob) p.ob.x=d.obx0+d.s*.78*open;
    }
  }

  return B.finish({
    setNight, tick, RX, RZ, H, OUT,
    WIN: { x: 0, y: 1.90, z: -RZ + .06, hw: RX * 1.5, hh: 1.90 },
    label: '大超市', labelK: '大超市 · the hypermarket',
    indoor: true, cutaway: true, near: .05, far: 60, expose: 1,
    spawn: { x: DX - .40, z: -RZ + 1.60, yaw: 0 },
    zones: [{ id: 'market', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .40, 0] }],
    roomAt() { return this.zones[0]; },
  });
});
