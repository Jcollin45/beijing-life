// 药店 — the chemist's on the far side of the road, from the inside.
//
// This shop has been on the street since the parade got its signs. It has a board, a name in
// characters, a lit window and a thing you can walk up to and be taught the word 药店 from — and
// until now no door. You could read the shop and never enter it.
//
// It is a small room and deliberately so: a chemist's in a 胡同 is one counter, two walls of boxes
// and somebody behind the glass who asks you what is wrong. That question is the reason the room is
// worth building. Being ill is the most predictable situation in which a person ends up having to
// speak a language they are still learning, and it was the one situation this game could not say a
// word about — 疼, 感冒 and 发烧 were not in the dictionary at all, so a player could name every
// object in their flat and not tell anybody they felt unwell.
//
// Indoors, so the shell comes off RX/H/RZ and the light comes off the ceiling panels and the
// shopfront glazing behind you.
const Pharmacy = Lazy('Pharmacy', () => {
  const col = {
    floor: C('#d8d4c8'), floorD: C('#c2beb2'), floorL: C('#e6e2d6'),
    wall: C('#eef0ea'), wallD: C('#d8dad4'), ceil: C('#f2f4ee'),
    trim: C('#b6bab4'),
    // The green a Chinese chemist's is signed in, and the cross on the front.
    green: C('#2f8a52'), greenD: C('#1f6a3c'), greenL: C('#4aa86a'),
    white: C('#f4f6f0'), cream: C('#ece8d8'), paper: C('#f2eede'),
    steel: C('#b8bec4'), steelD: C('#7c848a'), metal: C('#98a0a6'),
    charcoal: C('#33383d'), grey: C('#8d9298'),
    wood: C('#8b6a48'), woodD: C('#6a4f36'),
    glass: C('#a8c0cc'), glassLit: C('#cfe2e8'),
    // the boxes on the shelves, in the flat printed colours a shelf of medicine actually is
    boxA: C('#c8452f'), boxB: C('#2f6392'), boxC: C('#e0b850'), boxD: C('#4c8a86'),
    boxE: C('#a2705a'), boxF: C('#6a5a8a'), boxG: C('#d9d2c0'),
    plaster: C('#e8c9a0'), maskBlue: C('#8fb8d8'),
  };
  const G = { matte: .06, paint: .18, wood: .20, metal: .56, glass: .78, fabric: .05 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, wall, glyphs,
          solid: boundsSolid, blocker, shade, glow, thing } = B;
  // Every fixture below is authored as a centre plus footprint, while Build.solid takes four
  // bounds. Passing the centre/size tuple through unchanged produced reversed z extents on the
  // counter and both islands, so the player could walk through visible pharmacy furniture. Keep
  // the room's convenient signature, but convert it once at the renderer boundary.
  const solid = (cx, cz, w, d) =>
    boundsSolid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);

  // A single room, wider than it is deep, with the door in the -z wall and the counter across
  // the far end. 4.6 x 3.6 is about the footprint of the unit it sits behind on the parade.
  const RX = 4.6, RZ = 3.6, H = 3.2;
  const DX = 2.2;                       // the door, at the +x end of the near wall
  // Where the body lands back on the far pavement. Read off the street's own sign position at
  // build time — see the note on OUT below.
  const OUT = (typeof Street !== 'undefined' && Street.PHARMACY_OUT)
    ? { ...Street.PHARMACY_OUT }
    : { x: 24.98, z: -4.05, yaw: -Math.PI / 2 };

  const litProps = [], tubes = [], doorParts = [];
  const litten = (p, k) => { litProps.push({ p, k }); return p; };
  // Glazing: a pane is just a prop that takes the daylight, so it is the same call as `litten`
  // with a name that says what it is at the call site.
  const pane = (p, k) => litten(p, k);
  function movingDoor(p) {
    const sx=Math.hypot(p.m[0],p.m[1],p.m[2]);
    const sy=Math.hypot(p.m[4],p.m[5],p.m[6]);
    const sz=Math.hypot(p.m[8],p.m[9],p.m[10]);
    doorParts.push({p,m0:new Float32Array(p.m),ob:p.ob&&{...p.ob}});
    p.fixed=true; p.cx=p.m[12]; p.cy=p.m[13]; p.cz=p.m[14];
    p.r=.5*Math.hypot(sx,sy,sz)+.68;
    return p;
  }

  // ---------------------------------------------------------------- a wall of medicine
  // Four shelves of boxes against a back wall. The boxes are the room: a chemist's reads as one
  // because of the density of small flat rectangles, not because of the fittings.
  function shelfWall(cx, cz, wide, ry, tag) {
    const T = { ry, tag };
    // The carcass is 30 cm deep and the stock has to stand in *front* of its mid-plane, not on it.
    // Written the obvious way — boxes at the same z as the carcass — every one of the 168 boxes on
    // these two walls was sealed inside a solid white slab, and the room's whole subject was a
    // blank cupboard. `nx/nz` is the wall's outward normal: (0,-1) for the back wall, (1,0) for
    // the one down the -x side, so one expression serves both.
    const nx = Math.sin(ry), nz = -Math.cos(ry);
    const FRONT = .19;                      // clear of the 15 cm half-depth, with a little air
    box(cx, 1.05, cz, wide, 2.10, .30, col.white,
      { ...T, hard: true, gloss: G.paint, mat: 'plaster', matScale: 1.8, matAmt: .28 });
    box(cx, 2.12, cz, wide, .06, .34, col.trim,
      { ...T, hard: true, gloss: G.paint, mat: 'metal', matScale: .55, matAmt: .28 });
    const BOXES = [col.boxA, col.boxB, col.boxC, col.boxD, col.boxE, col.boxF, col.boxG];
    for (let s = 0; s < 4; s++) {
      const sy = .34 + s * .46;
      // the shelf board, brought forward with the stock that stands on it
      // Only the option bag changes here. The geometry — and in particular `nx/nz * .07`, which
      // is what brings the board forward with the stock standing on it — is left exactly alone.
      box(cx + nx * .07, sy - .03, cz + nz * .07, wide - .06, .03, .30, col.trim,
        { ...T, hard: true, gloss: G.paint, mat: 'metal', matScale: .55, matAmt: .28 });
      // the boxes, in runs of one colour, the way a shelf of stock actually sits
      const n = Math.max(3, Math.round((wide - .20) / .17));
      let run = 0, ci = (s * 3) % BOXES.length;
      for (let i = 0; i < n; i++) {
        if (run <= 0) { run = 2 + ((i + s) % 3); ci = (ci + 1 + (i % 2)) % BOXES.length; }
        run--;
        const bx = cx - (wide - .22) / 2 + i * ((wide - .22) / (n - 1));
        const bh = .22 + ((i + s) % 3) * .04, bw = .12 + ((i * 7 + s) % 3) * .012;
        // Along the wall, rotated with it — the same trick the shelves in the 超市 use.
        const ox = Math.cos(ry) * (bx - cx), oz = -Math.sin(ry) * (bx - cx);
        const px = cx + ox + nx * FRONT, pz = cz + oz + nz * FRONT;
        box(px, sy + bh / 2, pz, bw, bh, .14, BOXES[ci], { ...T, hard: true, gloss: .22 });
        // a paler band across the printed face, which is what a label reads as at this size
        box(px + nx * .075, sy + bh * .62, pz + nz * .075, bw - .03, bh * .16, .012, col.paper,
          { ...T, mode: 1, gloss: .10 });
      }
    }
  }

  function build() {
    // ---------------------------------------------------------------- shell
    // 60 cm ceramic, which is what every chemist's on the parade is floored in. The scale is
    // deliberately near mode 9's own 62 cm slab so the two grids do not beat against each other
    // where the vinyl bands below leave the base floor showing.
    const FLOORMAT = { mat: 'tile', matScale: .60, matAmt: .30 };
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor, { mode: 9, gloss: .12, ...FLOORMAT });
    // ceiling
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2], [0, H / 2, -RZ, RX * 2, H, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall,
      { mode: 4, mat: 'plaster', matScale: 2.4, matAmt: .28 });
    // skirting, so the walls meet the floor in a line rather than a seam
    for (const [x, z, sx, sz] of [[0, RZ - .04, RX * 2, .08], [-RX + .04, 0, .08, RZ * 2],
      [RX - .04, 0, .08, RZ * 2], [0, -RZ + .04, RX * 2, .08]])
      box(x, .06, z, sx, .12, sz, col.trim, { hard: true, gloss: G.paint });

    // The pale speckled vinyl every chemist's in the city has, laid as alternating bands.
    for (let i = -4; i <= 4; i++)
      flat(i * 1.0, .004, 0, .96, RZ * 2 - .1, i % 2 ? col.floorL : col.floorD,
        { gloss: .10, ...FLOORMAT });

    // ---------------------------------------------------------------- the counter
    // Across the +z end, with a glass screen over it and a gap at the -x end to serve through.
    const CZ = RZ - 1.05;
    box(-.35, .50, CZ, 5.2, 1.00, .62, col.white,
      { tag: '柜台', hard: true, gloss: G.paint, mat: 'plaster', matScale: 1.5, matAmt: .28 });
    box(-.35, 1.02, CZ, 5.3, .05, .70, col.steel,
      { tag: '柜台', hard: true, gloss: G.metal, mat: 'metal', matScale: .80, matAmt: .28 });
    // the green fascia strip that says which trade this is
    box(-.35, .70, CZ - .32, 5.2, .26, .02, col.green,
      { tag: '柜台', hard: true, mode: 1, gloss: G.paint });
    // glass screen, in two panes with the serving gap between them
    for (const [gx, gw] of [[-2.05, 1.70], [.75, 2.30]])
      pane(box(gx, 1.52, CZ - .28, gw, .94, .03, col.glass,
        { tag: '柜台', hard: true, mode: 1, alpha: .30, gloss: G.glass }), .9);
    box(-.35, 2.02, CZ - .28, 5.2, .06, .10, col.steel, { tag: '柜台', hard: true, gloss: G.metal });

    // the till, and a card reader on a little stand
    box(-1.60, 1.14, CZ - .10, .34, .20, .28, col.grey, { tag: '柜台', hard: true, gloss: .26 });
    litten(box(-1.60, 1.25, CZ - .18, .26, .14, .02, col.glassLit,
      { tag: '柜台', hard: true, mode: 1, glow: .22 }), .5);
    box(-1.05, 1.10, CZ - .16, .10, .12, .07, col.charcoal, { tag: '柜台', hard: true, gloss: .30 });

    // ---------------------------------------------------------------- the walls of stock
    shelfWall(-.35, RZ - .18, 7.4, 0, '药');              // behind the counter
    shelfWall(-RX + .18, -.30, 4.6, Math.PI / 2, '药');   // down the -x wall

    // ---------------------------------------------------------------- the open cases
    // Two low island units in the middle of the floor, which is where the things you buy without
    // asking anybody live: plasters, masks, a thermometer in a box.
    function island(cx, cz, tag, top) {
      box(cx, .42, cz, 1.30, .84, .52, col.white,
        { hard: true, gloss: G.paint, tag, mat: 'plaster', matScale: 1.5, matAmt: .28 });
      box(cx, .86, cz, 1.36, .05, .58, col.steel,
        { hard: true, gloss: G.metal, tag, mat: 'metal', matScale: .80, matAmt: .28 });
      top(cx, cz, tag);
    }
    island(-2.30, .35, '创可贴', (cx, cz, tag) => {
      // flat boxes of plasters, stacked in two short piles
      for (let i = 0; i < 5; i++)
        box(cx - .28 + (i % 2) * .52, .90 + Math.floor(i / 2) * .045, cz + (i % 2 ? -.06 : .06),
          .30, .04, .22, i % 2 ? col.plaster : col.boxC, { hard: true, gloss: .22, tag });
    });
    island(1.55, .35, '口罩', (cx, cz, tag) => {
      // a carton of masks, open, with the blue pleated edges showing
      box(cx, .96, cz, .46, .16, .34, col.boxG, { hard: true, gloss: .20, tag });
      for (let i = 0; i < 4; i++)
        box(cx - .14 + i * .09, 1.05 + (i % 2) * .01, cz, .07, .02, .26, col.maskBlue,
          { hard: true, rz: .06 * (i % 2 ? 1 : -1), gloss: .14, tag });
    });

    // 体温计 on the end of the counter, in its case
    box(1.95, 1.08, CZ - .12, .22, .07, .16, col.boxB, { tag: '体温计', hard: true, gloss: .24 });
    capsule(1.95, 1.13, CZ - .12, .012, .16, .012, col.white,
      { tag: '体温计', rz: Math.PI / 2, gloss: .34 });

    // ---------------------------------------------------------------- the prescription window
    // A hatch at the +x end of the counter with 药方 over it. Nothing is dispensed through it —
    // it is there because it is the word, and because a chemist's has one.
    box(2.62, 1.52, CZ - .30, .90, .96, .04, col.wallD,
      { tag: '药方', hard: true, gloss: G.paint, mat: 'plaster', matScale: 2.4, matAmt: .28 });
    box(2.62, 1.16, CZ - .33, .74, .22, .03, col.cream, { tag: '药方', hard: true, gloss: .20 });
    for (const g of glyphs(2.62, 1.86, CZ - .34, 0, '药方',
        { size: .13, gap: .05, color: col.green, mode: 1, tag: '药方' })) litten(g, .5);

    // ---------------------------------------------------------------- signage
    // The green cross, which is how you know what the shop is from the pavement, hung inside over
    // the counter so it reads from the door as well.
    for (const [w, h] of [[.62, .20], [.20, .62]])
      litten(box(-.35, 2.62, CZ - .30, w, h, .05, col.greenL,
        { hard: true, mode: 1, glow: .30 }), .9);
    // The shop's own name on the back wall. Untagged on purpose: 药店 is a thing you walk up to out
    // on the parade, where pressing Q on it is how you get in here. Tagging it in here as well
    // would put a second 药店 in the room whose verb is "go into the pharmacy" while you are
    // standing in the pharmacy.
    for (const g of glyphs(-2.60, 2.58, RZ - .12, 0, '药店',
        { size: .22, gap: .09, color: col.green, mode: 1 })) litten(g, .8);

    // A poster on the -x wall: the four things people come in saying, which is the room teaching
    // its own vocabulary the way the station's fare table does.
    box(-RX + .06, 1.90, 1.55, .03, 1.05, 1.35, col.paper,
      { tag: '药', hard: true, mode: 1, gloss: .10 });
    for (let i = 0; i < 4; i++)
      glyphs(-RX + .085, 2.26 - i * .26, 1.55, Math.PI / 2,
        ['感冒', '发烧', '头疼', '咳嗽'][i],
        { size: .115, gap: .045, color: col.charcoal, mode: 1, tag: '药' });

    // ---------------------------------------------------------------- the door and the front
    const dz = -RZ + .06;
    movingDoor(box(DX, 1.10, dz, 1.06, 2.20, .08, col.steelD,
      { tag: '门', hard: true, gloss: G.metal, mat: 'metal', matScale: .80, matAmt: .28 }));
    movingDoor(pane(box(DX, 1.16, dz + .03, .90, 1.94, .03, col.glass,
      { tag: '门', hard: true, mode: 1, alpha: .34, gloss: G.glass }), .9));
    movingDoor(capsule(DX - .38, 1.06, dz + .07, .022, .30, .022, col.steel,
      { tag: '门', rx: Math.PI / 2, gloss: G.metal }));
    // the shopfront glazing either side of it, so the street reads through the front wall
    pane(box(-1.15, 1.55, dz + .02, 4.60, 2.30, .03, col.glass,
      { hard: true, mode: 1, alpha: .26, gloss: G.glass }), .95);
    for(const g of glyphs(DX, 1.86, dz + .05, 0, '出口',
      { size: .12, gap: .045, color: col.charcoal, mode: 1, tag: '门' })) movingDoor(g);

    // ---------------------------------------------------------------- lighting
    for (const lx of [-2.2, .6, 2.6]) {
      box(lx, H - .05, .2, 1.10, .06, RZ * 1.1, col.white, { hard: true, gloss: .28 });
      litten(box(lx, H - .08, .2, 1.02, .04, RZ * 1.05, C('#f2f8ff'),
        { hard: true, mode: 1, glow: .16 }), .85);
      tubes.push(glow(M.trs(lx, H - .10, .2, 0, 1.02, 1, RZ * 1.05), C('#eef6ff'), 0));
      // And what the fitting does, as against what it looks like. A four-foot tube is a line,
      // not a point: one light per fitting put the whole of it above the middle of the floor and
      // left the wall of boxes at the back of the shop — the thing the room is about — lit only
      // by the ambient. Two per fitting, at the quarter points of the strip, is close enough to
      // a line of light at this size and reaches both the counter and the door.
      //
      // Cool and flat on purpose. A chemist's is the least flattering light on the street, and
      // the contrast with the warm tungsten of everywhere else in the game is the point of it.
      for (const lz of [.2 - RZ * .28, .2 + RZ * .28])
        B.light(lx, H - .16, lz, [.86, .92, 1.00], .55, 3.00);
    }
    // The green cross is a lit panel and reads as one; this is the colour it puts on the wall
    // behind it, which is the whole difference between a sign and a sticker. Weak and short —
    // it should tint the plaster around the cross, not turn the back of the shop green.
    B.light(-.35, 2.58, CZ - .52, [.34, 1.00, .52], .28, 1.50);

    // ---------------------------------------------------------------- what you can walk up to
    thing('柜台', -1.30, 1.30, CZ - .55, '你哪儿不舒服？',
      'What is the matter? — literally: where are you not comfortable?',
      'The counter. Say what hurts and she will find you something.',
      { focus: [-1.30, CZ - 1.25], reach: 2.0 });
    thing('药', -.35, 1.60, RZ - .55, '这些都是药。', 'These are all medicines.',
      'A wall of boxes. 药 is the word for all of it.',
      { focus: [-.35, RZ - 1.95], reach: 2.0 });
    thing('创可贴', -2.30, 1.00, .35, '创可贴在这边。', 'The plasters are over here.',
      'Sticking plasters, on the open case.', { focus: [-2.30, -.45], reach: 1.7 });
    thing('口罩', 1.55, 1.00, .35, '口罩一盒十块。', 'Masks, ten kuai a box.',
      'Face masks, by the box.', { focus: [1.55, -.45], reach: 1.7 });
    thing('体温计', 1.95, 1.16, CZ - .30, '体温计量体温。',
      'A thermometer measures your temperature.',
      '体温 body temperature + 计 meter.', { focus: [1.95, CZ - 1.15], reach: 1.6 });
    thing('药方', 2.62, 1.55, CZ - .40, '有药方吗？', 'Do you have a prescription?',
      'The prescription hatch. 药 medicine + 方 formula.',
      { focus: [2.62, CZ - 1.20], reach: 1.7 });
    thing('门', DX, 2.10, dz + .18, '该走了。', 'Time to leave.',
      'Out onto the pavement and back to the road.',
      { focus: [DX, dz + .95], reach: 1.9 }).exit = { place: 'street', at: OUT };

    // colliders: the counter, the two islands and the shelf runs
    solid(-.35, CZ, 5.3, .70);
    solid(-2.30, .35, 1.40, .60);
    solid(1.55, .35, 1.40, .60);
    solid(-.35, RZ - .18, 7.4, .34);
    solid(-RX + .18, -.30, .34, 4.6);
  }

  build();

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .30;
    for (const g of tubes) g.a = soft * .09;
  }

  function tick(t,body) {
    const dx=body?body.x-DX:99,dz=body?body.z-(-RZ+.70):99;
    let open=1-Math.min(1,Math.hypot(dx,dz)/1.90);
    open=open*open*(3-2*open);
    const a=1.16*open,c=Math.cos(a),s=Math.sin(a),px=DX+.56,pz=-RZ+.06;
    for(let i=0;i<doorParts.length;i++) {
      const q=doorParts[i],p=q.p,m=p.m,b=q.m0;
      for(let j=0;j<3;j++) {
        const o=j*4,x=b[o],z=b[o+2];
        m[o]=c*x+s*z; m[o+1]=b[o+1]; m[o+2]=-s*x+c*z; m[o+3]=b[o+3];
      }
      const x=b[12]-px,z=b[14]-pz;
      m[12]=px+c*x+s*z; m[13]=b[13]; m[14]=pz-s*x+c*z; m[15]=1;
      p.cx=m[12]; p.cy=m[13]; p.cz=m[14];
      if(q.ob) {
        const ox=q.ob.x-px,oz=q.ob.z-pz;
        p.ob.x=px+c*ox+s*oz; p.ob.z=pz-s*ox+c*oz; p.ob.ry=q.ob.ry+a;
      }
    }
  }

  return B.finish({
    setNight, tick, RX, RZ, H, OUT,
    // The shopfront is the window: it faces -z, onto the road.
    WIN: { x: 0, y: 1.55, z: -RZ + .06, hw: RX * 1.6, hh: 1.30 },
    SEAT_AT: [-1.30, RZ - 2.30], SEAT_FACE: 0, SEAT_Y: .46,
    label: '药店', labelK: '药店 · pharmacy',
    indoor: true, cutaway: true, near: .05, far: 30, expose: 1,
    spawn: { x: DX - .30, z: -RZ + 1.05, yaw: 0 },
    zones: [{ id: 'pharmacy', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .35, 0] }],
    roomAt() { return this.zones[0]; },
  });
});
