// 图书馆 — the university library, entered from the campus forecourt.
//
// A grand reading room: tall ceilings, tall bookshelves, reading tables with green
// banker's lamps, a circulation desk near the entrance, and a wall of windows at the
// far end. The hush is the point — this is where the player comes to sit and study.
//
// Indoors: the renderer takes the light from the ceiling bulb and the windows, and
// the room shell is set from RX/H/RZ.
const Library = Lazy('Library', () => {
  const col = {
    // The floor is a boarded oak now rather than the slab grid it was, so it takes the
    // wood material and mode 3 together; the three tones are one board run, its paler
    // centre runner, and the dark inlay that edges the runner.
    floor: C('#c0a982'), floorD: C('#96794f'), floorL: C('#cdb890'),
    // the skirting is a stained oak board now, to close the new floor against the plaster
    wall: C('#e3dccb'), wallD: C('#cfc6b0'), trim: C('#8f7454'), ceil: C('#e8e0d0'),
    // woodL is the table tops, the chair seats and the counter — every large surface that
    // faces up. Facing up in this room means facing a wall of windows, and at the old value
    // they all clipped to a flat blond and took the wood grain with them. Deeper, so the
    // material has somewhere to move.
    wood: C('#6d5039'), woodD: C('#5d4530'), woodL: C('#725530'),
    // shelfD was near-black, which swallowed the wood material whole: the side panels are the
    // biggest surfaces in the room and were reading as flat cut-outs. Lifted so the grain lands.
    shelf: C('#5d4530'), shelfD: C('#57402c'), shelfL: C('#6b4a32'),
    metal: C('#8a9097'), metalD: C('#5f656b'), steel: C('#b8bec4'),
    red: C('#a8372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    cream: C('#ece4cf'), white: C('#eceae2'), charcoal: C('#33383d'),
    sky: C('#c2d4e2'), haze: C('#b4bcc0'), glass: C('#9fb6c4'),
    lampShade: C('#3a6a3a'), lampShadeD: C('#2a502a'), lampGlow: C('#f5e6c0'),
    globe: C('#4a7a9a'), globeLand: C('#6a9a4a'), globeStand: C('#8b6a48'),
    leaf: C('#4f7a3c'), leafD: C('#3c6130'), terracotta: C('#a2705a'),
    mud: C('#6b5a45'),
    blue: C('#2f6392'), teal: C('#4c8a86'), green: C('#2f7a4f'),
    navy: C('#183a5a'), navyL: C('#2d5c82'), brass: C('#b28a45'),
    acoustic: C('#d6cdbb'), acousticD: C('#b8aa91'), rug: C('#314f64'),
    paper: C('#f0ead8'), binder: C('#6a4a3a'),
    baize: C('#27452f'), seat: C('#5e372a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, wall, glyphs,
          solid, blocker, shade, glow, thing } = B;

  const RX = 6.0, RZ = 5.5, H = 4.8;
  const DX = 1.8;                         // door at the +x end of the -z wall
  const OUT = { x: 27.20, z: 50, yaw: Math.PI * .5 };

  const litProps = [], tubes = [], doorParts = [];
  const litten = (p, k) => { litProps.push({ p, k }); return p; };
  function movingDoor(p) {
    const sx=Math.hypot(p.m[0],p.m[1],p.m[2]);
    const sy=Math.hypot(p.m[4],p.m[5],p.m[6]);
    const sz=Math.hypot(p.m[8],p.m[9],p.m[10]);
    doorParts.push({p,m0:new Float32Array(p.m),ob:p.ob&&{...p.ob}});
    p.fixed=true; p.cx=p.m[12]; p.cy=p.m[13]; p.cz=p.m[14];
    p.r=.5*Math.hypot(sx,sy,sz)+.70;
    return p;
  }

  // ---------------------------------------------------------------- a reading table
  // A large wooden table with four chairs and a green banker's lamp.
  function readingTable(cx, cz) {
    const T = { tag: '书桌' };
    // Oak, and read as oak: the top is one board repeat every 62 cm, the frame and the legs
    // tighter so a 6 cm post does not get a whole plank's worth of grain across its face.
    const OAK = { mat: 'wood', matScale: .62, matAmt: .48 };
    const OAKS = { mat: 'wood', matScale: .34, matAmt: .46 };
    // table top and skirt
    box(cx, .76, cz, 2.40, .04, .60, col.woodL, { hard: true, gloss: G.wood, ...OAK, ...T });
    box(cx, .72, cz, 2.32, .04, .56, col.wood, { hard: true, gloss: G.wood, ...OAK, ...T });
    // The baize writing inlay, the way a reading-room desk is actually made — and the one
    // place in the room a woven material belongs. Everything on the table sits on top of it.
    box(cx, .784, cz, 2.04, .010, .44, col.baize,
      { hard: true, mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .34, matAmt: .34, ...T });
    // legs
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(cx + sx * 1.04, .36, cz + sz * .44, .06, .68, .06, col.woodD,
        { hard: true, gloss: G.wood, ...OAKS, ...T });
    // four chairs, two on each long side
    for (const s of [-1, 1]) {
      for (const side of [-1, 1]) {
        const cy = cz + s * .86;
        box(cx + side * .60, .46, cy, .44, .04, .40, col.woodL,
          { hard: true, gloss: G.wood, ...OAKS, ...T });
        // a thin cloth pad on the seat — hours of reading, and it softens the row of chairs
        box(cx + side * .60, .486, cy, .40, .016, .36, col.seat,
          { hard: true, mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .28, matAmt: .34, ...T });
        // chair back
        box(cx + side * .60, .72, cy - s * .18, .40, .18, .04, col.woodL,
          { hard: true, gloss: G.wood, ...OAKS, ...T });
        for (const lx of [-1, 1]) for (const lz of [-1, 1])
          box(cx + side * .60 + lx * .18, .23, cy + lz * .16, .04, .42, .04, col.woodD,
            { hard: true, gloss: G.wood, ...OAKS, ...T });
      }
    }
    // the green banker's lamp on the table centre — no material on the shade or the glow:
    // it is enamel, and the two boxes below are emissive.
    taper(cx, .96, cz, .18, .20, .18, col.lampShade, { hard: true, gloss: .22, ...T });
    box(cx, 1.04, cz, .16, .06, .16, col.lampShadeD, { hard: true, gloss: .18, ...T });
    // the glow under the shade, falling on the table
    litten(box(cx, .82, cz, .20, .02, .16, col.lampGlow,
      { hard: true, mode: 1, glow: .35, ...T }), 1);
    // the warm pool on the table surface
    litten(box(cx, .794, cz, .50, .01, .30, C('#f5e6c0'),
      { hard: true, mode: 1, glow: .12, ...T }), .6);
    // And the lamp as a light, not a picture of one. Tight — a banker's lamp lights the page
    // and the person over it, and leaves the rest of the room to the ceiling. One per table
    // beats one big fixture: it is what makes three tables read as three separate places to sit.
    B.light(cx, .90, cz, [1.00, 0.88, 0.70], .38, 1.25);
    // a book and a notebook on the table, so it is not a bare board
    box(cx - .30, .80, cz + .08, .22, .02, .16, col.red, { hard: true, gloss: .18, ...T });
    box(cx + .20, .797, cz - .10, .16, .015, .22, col.cream, { hard: true, gloss: .14, ...T });
    // a pencil
    cyl(cx + .40, .80, cz + .12, .010, .16, col.paper, { rx: Math.PI / 2, gloss: .14, ...T });
    // solid zone under the table
    solid(cx - 1.30, cx + 1.30, cz - .60, cz - .10);
    shade(cx, cz, 2.3, 1.1, .20);
  }

  // A backless, human-scale side-wall bay.  The plaster wall remains visible between open oak
  // uprights, so six bays read as furniture rather than as repeated box walls.  Book blocks are
  // deliberately grouped: enough variation to feel stocked without hundreds of tiny props.
  function shelfBay(sx, zc, label, seed) {
    const shelfX=sx*(RX-.34), faceX=sx*(RX-.63);
    const OAK={mat:'wood',matScale:.62,matAmt:.48};
    for(const ez of [-1,1]) box(shelfX,1.31,zc+ez*1.07,.54,2.50,.07,col.shelfD,
      {hard:true,gloss:G.wood,...OAK});
    box(shelfX,.11,zc,.56,.18,2.12,col.shelfD,{hard:true,gloss:G.wood,...OAK});
    box(shelfX,2.56,zc,.58,.12,2.18,col.shelfL,{hard:true,gloss:G.wood,...OAK});
    const palette=[col.red,col.blue,col.teal,col.green,col.gold,col.cream,col.binder,col.charcoal];
    for(let row=0;row<5;row++) {
      const sy=.20+row*.52;
      box(shelfX,sy,zc,.58,.035,2.08,col.shelf,{hard:true,gloss:G.wood,...OAK});
      if(row===4) continue;
      for(let j=0;j<9;j++) {
        const bw=.11+((seed*7+row*11+j*5)%4)*.018;
        const bh=.23+((seed*3+row*7+j*2)%5)*.035;
        const bz=zc-.84+j*.205;
        box(faceX,sy+.025+bh/2,bz,.11,bh,bw,palette[(seed+row*3+j)%palette.length],
          {hard:true,gloss:.18});
      }
      if(row===1||row===3) litten(box(faceX-sx*.015,sy+.055,zc,.025,.018,1.98,col.lampGlow,
        {hard:true,mode:1,glow:.07}),.35);
    }
    box(faceX-sx*.015,2.73,zc,.035,.30,1.16,col.navy,{hard:true,gloss:.26});
    for(const g of glyphs(faceX-sx*.038,2.73,zc,sx>0?-Math.PI/2:Math.PI/2,label,
      {size:.105,gap:.025,color:col.goldL,mode:1,tag:'书架'})) litten(g,.25);
    shade(shelfX,zc,.7,2.25,.16);
  }

  function wallPlate(x,y,z,yaw,text,width=2.4,tag='图书馆') {
    box(x,y,z,width,.44,.055,col.navy,{hard:true,ry:yaw,gloss:.28,tag});
    box(x,y-.225,z,width+.08,.028,.07,col.brass,{hard:true,ry:yaw,gloss:.48,tag});
    for(const g of glyphs(x,y,z-.035,yaw,text,
      {size:.13,gap:.04,color:col.goldL,mode:1,tag})) litten(g,.35);
  }

  function loungeBench(cx,cz) {
    box(cx,.34,cz,1.55,.12,.50,col.woodD,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.45,matAmt:.40});
    box(cx,.43,cz,1.45,.11,.44,col.rug,
      {hard:true,mode:7,gloss:G.fabric,mat:'fabric',matScale:.34,matAmt:.42});
    box(cx,.76,cz+.20,1.45,.58,.10,col.rug,
      {hard:true,mode:7,gloss:G.fabric,mat:'fabric',matScale:.34,matAmt:.42,rx:-.08});
    for(const x of [cx-.61,cx+.61]) box(x,.18,cz,.07,.34,.42,col.woodD,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.34,matAmt:.40});
    solid(cx-.83,cx+.83,cz-.34,cz+.36); shade(cx,cz,1.7,.7,.18);
  }

  function selfCheckKiosk(cx,cz) {
    box(cx,.45,cz,.60,.82,.45,col.woodD,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.50,matAmt:.38});
    box(cx,.90,cz-.08,.52,.16,.32,col.charcoal,{hard:true,rx:-.25,gloss:G.metal});
    litten(box(cx,.91,cz-.18,.43,.11,.02,C('#5f96bd'),
      {hard:true,rx:-.25,mode:1,glow:.16}),.35);
    box(cx+.18,.62,cz-.23,.10,.03,.08,col.red,{hard:true,gloss:.20});
    glyphs(cx,.26,cz-.235,0,'自助借还',{size:.065,gap:.018,color:col.goldL,mode:1,tag:'自助借还'});
    solid(cx-.38,cx+.38,cz-.30,cz+.30); shade(cx,cz,.8,.65,.16);
  }

  function build() {
    // ================================================================ shell
    // The floor was a grid of pale slabs. It is a boarded oak floor now: mode 3 lays the
    // plank seams and the wood material puts real grain across them. The old .80 m slab
    // lines had to go with it — they crossed the planks and read as neither.
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor,
      { mode: 3, gloss: .18, mat: 'wood', matScale: 1.10, matAmt: .40 });
    // a paler run of boards down the centre aisle, edged with a dark inlay
    flat(0, .004, 0, .80, RZ * 2, col.floorL,
      { mode: 3, gloss: .18, mat: 'wood', matScale: 1.10, matAmt: .38 });
    for (const sx of [-1, 1])
      flat(sx * .42, .006, 0, .05, RZ * 2, col.floorD,
        { gloss: .20, mat: 'wood', matScale: .50, matAmt: .30 });
    // ceiling
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2], [0, H / 2, -RZ, RX * 2, H, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall,
      { mode: 4, mat: 'plaster', matScale: 2.4, matAmt: .28, nrmAmt: .25 });
    for (const [x, z, sx, sz] of [[0, RZ - .04, RX * 2, .08],
      [-RX + .04, 0, .08, RZ * 2], [RX - .04, 0, .08, RZ * 2],
      [0, -RZ + .04, RX * 2, .08]])
      box(x, .06, z, sx, .12, sz, col.trim,
        { hard: true, gloss: G.wood, mat: 'wood', matScale: .90, matAmt: .34 });

    // ================================================================ window wall (+z)
    // A tall ribbon of windows looking out onto the campus, with a sill and a clerestory.
    box(0, .60, RZ - .10, RX * 2, 1.20, .20, col.wall,
      { hard: true, gloss: G.paint, mat: 'plaster', matScale: 2.4, matAmt: .28, nrmAmt: .25 });
    box(0, 1.22, RZ - .16, RX * 2, .06, .30, col.white,
      { hard: true, gloss: .28, mat: 'concrete', matScale: 1.20, matAmt: .30 });
    box(0, H - .20, RZ - .10, RX * 2, .40, .20, col.wall,
      { hard: true, gloss: G.paint, mat: 'plaster', matScale: 2.4, matAmt: .28, nrmAmt: .25 });
    // glazing panels across the full width
    for (let i = 0; i < 6; i++) {
      const gx = -RX + 1.20 + i * 2.00;
      box(gx, 2.40, RZ - .03, 1.60, 2.40, .02, col.sky,
        { hard: true, mode: 1, glow: .06 });
      box(gx, 1.80, RZ - .02, 1.60, .80, .02, col.haze,
        { hard: true, mode: 1, glow: .04 });
      box(gx, 2.40, RZ - .03, 1.72, 2.60, .03, col.glass,
        { hard: true, mode: 1, alpha: .26, gloss: G.glass, glow: .05 });
    }
    // mullions
    for (let i = 0; i < 7; i++) {
      const mx = -RX + .20 + i * 2.00;
      box(mx, 2.40, RZ - .05, .06, 2.60, .08, col.metalD,
        { hard: true, gloss: G.metal, mat: 'metal', matScale: .30, matAmt: .34 });
    }
    // skyline in the window, for depth
    let ws = 0x4a7e3b;
    const wr = () => (ws = (ws * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let wx = -RX + .40;
    while (wx < RX - .40) {
      const bw = .25 + wr() * .35, bh = .18 + wr() * .40;
      box(wx + bw / 2, 1.70 + bh / 2, RZ - .015, bw * .95, bh, .008,
        C(wr() > .5 ? '#8b98a4' : '#788690'), { hard: true, mode: 1, glow: .03 });
      wx += bw + .03 + wr() * .08;
    }
    // the windowsill — a continuous stone shelf across the whole wall
    box(0, .60, RZ - .04, RX * 2 - .2, .10, .16, col.white,
      { hard: true, gloss: .28, mat: 'concrete', matScale: 1.00, matAmt: .30 });
    // windowsill plants — small pots along the sill
    for (let i = 0; i < 4; i++) {
      const px = -RX + 1.50 + i * 3.00;
      cyl(px, .44, RZ - .12, .10, .08, col.terracotta, { gloss: .22 });
      for (let j = 0; j < 3; j++) {
        const pa = j * 2.1, pr = .06 + wr() * .04, ph = .10 + wr() * .08;
        capsule(px + Math.cos(pa) * pr, .48 + ph / 2, RZ - .12 + Math.sin(pa) * pr,
          .006, ph, .006, col.leaf, { rx: .3 + wr() * .2, ry: pa, gloss: .12 });
      }
    }

    // ================================================================ 借书处 circulation desk
    // A long wooden counter facing the room, with a computer and a lamp.
    const CX = -2.4, CZ = -RZ + .80;
    // A 90 cm board on the front panel and the same on the counter — a joinery counter, and
    // at that scale the grain runs the length of it rather than repeating every hand's width.
    const CTR = { mat: 'wood', matScale: .90, matAmt: .44 };
    // One oak datum and a mounted fascia frame the service point without building another wall
    // out of repeated boxes behind it.
    box(CX,2.68,-RZ+.14,3.0,.10,.08,col.woodD,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.62,matAmt:.42});
    wallPlate(CX,3.20,-RZ+.105,0,'借还书处 · CIRCULATION',2.95,'借书处');
    box(CX, .52, CZ, 1.80, .04, .70, col.woodL, { hard: true, gloss: G.wood, ...CTR });
    box(CX, .48, CZ - .30, 1.74, .96, .04, col.woodD, { hard: true, gloss: G.wood, ...CTR });
    // the counter top, slightly proud
    box(CX, .56, CZ, 1.90, .06, .74, col.wood, { hard: true, gloss: G.wood, ...CTR });
    // A lower return wing makes the desk accessible and breaks up the single long counter mass.
    box(CX+1.38,.38,CZ+.02,.86,.04,.62,col.woodL,{hard:true,gloss:G.wood,...CTR});
    box(CX+1.38,.35,CZ-.27,.80,.70,.04,col.woodD,{hard:true,gloss:G.wood,...CTR});
    box(CX+1.38,.425,CZ+.02,.92,.05,.66,col.wood,{hard:true,gloss:G.wood,...CTR});
    box(CX+1.38,.37,CZ-.305,.34,.12,.025,col.charcoal,{hard:true,gloss:.30});
    // a computer on the desk
    box(CX + .60, .80, CZ - .08, .22, .20, .02, col.charcoal,
      { hard: true, gloss: .40, mat: 'metal', matScale: .16, matAmt: .30 });
    litten(box(CX + .60, .80, CZ - .10, .20, .16, .01, C('#4a6a8a'),
      { hard: true, mode: 1, glow: .14 }), .15);
    box(CX + .60, .70, CZ - .02, .10, .01, .02, col.cream, { hard: true, gloss: .18 });
    box(CX + .60, .70, CZ, .22, .02, .10, col.charcoal, { hard: true, gloss: .30 });
    // a small desk lamp
    taper(CX - .60, .76, CZ - .04, .12, .14, .12, col.lampShade, { hard: true, gloss: .22 });
    litten(box(CX - .60, .70, CZ, .14, .01, .12, col.lampGlow,
      { hard: true, mode: 1, glow: .28 }), .8);
    // and the desk lamp as a real light, so the counter is a lit place and not a lit decal
    B.light(CX - .55, .68, CZ + .02, [1.00, 0.90, 0.74], .30, 1.25);
    // the 借书处 sign on the front panel
    glyphs(CX, .80, CZ - .32, 0, '借书处', { size: .10, gap: .03, color: col.goldL,
      mode: 1, tag: '借书处' });
    solid(CX - 1.60, CX + 1.92, CZ - .76, CZ - .10);
    shade(CX, CZ, 2.6, .8, .22);
    thing('借书处', CX, 1.00, CZ - .70, '借书处可以借书和还书。',
      'You can borrow and return books at the desk.',
      '借 to borrow + 书 book + 处 place. 还书 is to return a book.',
      { focus: [CX, CZ - 1.2], reach: 1.8 });

    // Entry sequence: woven threshold, transparent security leaves, self-check and a compact
    // directional plate.  The 2.1 m centre lane from the door to the reading-room aisle stays open.
    flat(DX,.010,-RZ+1.25,2.45,1.70,col.rug,
      {mode:7,gloss:G.fabric,mat:'fabric',matScale:.42,matAmt:.42});
    for(const gx of [.68,2.92]) {
      box(gx,.82,-RZ+1.12,.075,1.42,.42,col.metalD,
        {hard:true,gloss:G.metal,mat:'metal',matScale:.24,matAmt:.34});
      box(gx,.98,-RZ+1.12,.025,1.05,.30,col.glass,
        {hard:true,mode:1,alpha:.30,gloss:G.glass});
      litten(box(gx,1.48,-RZ+1.12,.055,.05,.30,col.blue,
        {hard:true,mode:1,glow:.08}),.35);
    }
    selfCheckKiosk(4.45,-RZ+.92);
    wallPlate(4.55,2.18,-RZ+.11,0,'自助借还 · SELF CHECK',2.05,'自助借还');
    wallPlate(.05,2.55,-RZ+.11,0,'借还书 ←  ·  阅览区 ↑',2.65,'图书馆');

    // ================================================================ 书架 bookshelves
    // Six fitted, labelled bays form a rhythm of oak piers and illuminated book spines.  The
    // north end stops short of the windows so daylight and the lounge remain visually open.
    const westLabels=['文学','历史','艺术'],eastLabels=['语言','社会科学','工具书'];
    const bayZ=[-3.82,-.98,1.86];
    for(const sx of [-1,1]) for(let i=0;i<bayZ.length;i++)
      shelfBay(sx,bayZ[i],(sx<0?westLabels:eastLabels)[i],i+(sx>0?7:1));
    // blocker so the camera doesn't slip inside the shelves
    blocker(-RX, -RX + .30, -RZ, RZ, H + 1);
    blocker(RX - .30, RX, -RZ, RZ, H + 1);

    // ================================================================ 书桌 reading tables
    // Staggered tables make two intimate reading pockets while preserving the oak centre aisle
    // and the long arrival view to the window wall.
    readingTable(-2.10, -.45);
    readingTable(2.10, 1.45);
    readingTable(-2.10, 3.55);

    thing('书桌', -2.10, .76, 3.55, '在这里看书很安静。', 'It is quiet enough to read here.',
      '书 book + 桌 table. 看书 is to read a book.',
      { focus: [-1.50, 2.69], reach: 1.8 });

    // A window seat and rug create a softer destination beyond the desks without filling the
    // centre aisle.  It is deliberately offset to the east, opposite the north reading table.
    flat(3.92,.008,4.70,2.05,1.20,col.floorL,
      {mode:7,gloss:G.fabric,mat:'fabric',matScale:.40,matAmt:.34});
    loungeBench(3.92,4.78);

    // ================================================================ 门 the exit (-z wall)
    const dz = -RZ + .10;
    // Static jambs, lintel and stone threshold give the moving leaf an architectural opening.
    for(const fx of [DX-.67,DX+.67]) box(fx,1.12,dz+.08,.10,2.28,.22,col.trim,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.42,matAmt:.42});
    box(DX,2.25,dz+.08,1.44,.12,.22,col.trim,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.42,matAmt:.42});
    box(DX,.035,dz+.17,1.48,.055,.42,col.white,
      {hard:true,gloss:.26,mat:'concrete',matScale:.50,matAmt:.26});
    wallPlate(DX,2.72,dz+.03,0,'出口 · EXIT',1.72,'门');
    movingDoor(box(DX, 1.06, dz + .04, 1.18, 2.20, .14, col.woodD,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .60, matAmt: .40 }));
    movingDoor(box(DX, 1.02, dz, 1.00, 2.06, .07, col.wood,
      { tag: '门', gloss: .28, mat: 'wood', matScale: .60, matAmt: .40 }));
    movingDoor(box(DX, 1.42, dz - .04, .44, .60, .02, col.glass,
      { tag: '门', hard: true, mode: 1, alpha: .40, gloss: G.glass }));
    movingDoor(box(DX,.24,dz-.045,.90,.22,.025,col.brass,
      {tag:'门',hard:true,gloss:.46,mat:'metal',matScale:.28,matAmt:.24}));
    movingDoor(capsule(DX - .38, 1.02, dz - .09, .026, .22, .026, col.steel,
      { tag: '门', rx: Math.PI / 2, gloss: G.metal }));
    for(const g of glyphs(DX, 1.86, dz - .05, 0, '出口',
      { size: .13, gap: .05, color: col.charcoal, mode: 1, tag: '门' })) movingDoor(g);
    thing('门', DX, 2.30, dz - .20, '该走了。', 'Time to leave.',
      'Out through the door and back to the campus forecourt.',
      { focus: [DX, dz - 1.0], reach: 1.9 }).exit = { place: 'campus', at: OUT };

    // ================================================================ lighting and atmosphere
    // Local acoustic rafts now follow the actual service, reading and lounge zones.  They replace
    // the three room-length luminous slabs, so ceiling depth and furniture grouping are visible.
    const ceilingModules=[
      [-2.40,-4.42,2.65,.82],[1.80,-4.15,2.75,.78],
      [-2.10,-.45,2.70,.92],[2.10,1.45,2.70,.92],[-2.10,3.55,2.70,.92],
    ];
    for(const [lx,lz,lw,ld] of ceilingModules) {
      box(lx,H-.12,lz,lw,.10,ld,col.acoustic,
        {hard:true,gloss:.10,mat:'fabric',matScale:.52,matAmt:.22});
      box(lx,H-.19,lz,lw*.76,.035,.15,col.acousticD,{hard:true,gloss:.16});
      litten(box(lx,H-.215,lz,lw*.68,.025,.11,C('#fff0d0'),
        {hard:true,mode:1,glow:.17}),.85);
      tubes.push(glow(M.trs(lx,H-.23,lz,0,lw*.68,1,.11),C('#fff0d0'),0));
      B.light(lx,H-.42,lz,[1.00,.89,.72],.72,3.4);
    }
    // Slim oak rails continue the floor's centre-line language overhead without darkening it.
    for(const sx of [-1,1]) box(sx*.47,H-.105,.12,.065,.09,9.65,col.woodD,
      {hard:true,gloss:G.wood,mat:'wood',matScale:.60,matAmt:.34});
    for(const sx of [-1,1]) litten(box(sx*(RX-.70),3.93,-.95,.026,.025,8.15,col.lampGlow,
      {hard:true,mode:1,glow:.07}),.30);

    // ================================================================ decor
    // A globe on a stand, near the circulation desk
    cyl(CX + 1.60, .58, CZ + .20, .025, .56, col.woodD, { gloss: G.wood });  // stand
    ball(CX + 1.60, .84, CZ + .20, .14, .14, .14, col.globe, { gloss: .18 });  // globe body
    for (let i = 0; i < 3; i++)  // continents as patches
      ball(CX + 1.60 + Math.sin(i * 2.09) * .08, .84 + Math.cos(i * 2.09) * .04,
        CZ + .20 + Math.cos(i * 2.09) * .06, .04, .03, .04, col.globeLand,
        { ry: i * .7, gloss: .12 });

    // A wall clock above the far window
    const CLX = 0, CLY = 3.70, CLZ = RZ - .02;
    cyl(CLX, CLY, CLZ - .02, .28, .05, col.white, { rx: Math.PI / 2, gloss: .26 });
    cyl(CLX, CLY, CLZ - .05, .26, .03, col.wallD, { rx: Math.PI / 2, gloss: .26 });
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      box(CLX + Math.sin(a) * .20, CLY + Math.cos(a) * .20, CLZ - .06,
        .018, .04, .03, col.charcoal, { hard: true, rx: Math.PI / 2, ry: a, gloss: .30 });
    }
    clock.hour = box(CLX, CLY, CLZ - .06, .014, .14, .018, col.charcoal,
      { hard: true, rx: Math.PI / 2, gloss: .34 });
    clock.min = box(CLX, CLY, CLZ - .07, .012, .20, .014, col.charcoal,
      { hard: true, rx: Math.PI / 2, gloss: .34 });
    clock.x = CLX; clock.y = CLY; clock.z = CLZ;

    // 图书馆 name on the wall above the entrance
    for (const g of glyphs(0, 3.80, -RZ + .10, 0, '图书馆',
        { size: .30, gap: .12, color: col.goldL, mode: 1, tag: '图书馆' })) litten(g, .6);

    // A plant in the corner by the window, +x side
    box(RX - .40, .20, RZ - .40, .20, .36, .20, col.terracotta, { hard: true, gloss: .26 });
    box(RX - .40, .44, RZ - .40, .16, .04, .16, col.mud, { hard: true, gloss: .06 });
    for (let i = 0; i < 7; i++) {
      const pa = i * 0.9 + .2, pr = .10 + (i % 3) * .04, ph = .24 + (i % 2) * .12;
      capsule(RX - .40 + Math.cos(pa) * pr, .36 + ph / 2, RZ - .40 + Math.sin(pa) * pr,
        .010, ph, .010, col.leaf, { rx: .3 + (i % 3) * .2, ry: pa, gloss: .12 });
    }
  }

  const clock = { hour: null, min: null, x: 0, y: 0, z: 0 };

  build();

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .30;
    for (const g of tubes) g.a = soft * .08;
  }

  function tick(t, body, mins) {
    const dx=body?body.x-DX:99,dz=body?body.z-(-RZ+.72):99;
    let open=1-Math.min(1,Math.hypot(dx,dz)/2.10);
    open=open*open*(3-2*open);
    const a=1.16*open,c=Math.cos(a),s=Math.sin(a),px=DX+.62,pz=-RZ+.10;
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
    if (!clock.hour) return;
    const hand = (p, z, len, w, ang) => {
      p.m = M.mul(M.trans(clock.x, clock.y, z),
        M.mul(M.rotZ(ang), M.mul(M.trans(0, len / 2, 0), M.scale(w, len, .012))));
    };
    hand(clock.hour, clock.z - .06, .135, .018, -(mins % 720) / 720 * Math.PI * 2);
    hand(clock.min, clock.z - .07, .190, .014, -(mins % 60) / 60 * Math.PI * 2);
  }

  return B.finish({
    setNight, tick, RX, RZ, H,
    // Half-extents match the 11.6 x 2.6 m glazing ribbon. `n` records that this opening is on the
    // +z wall for renderer paths that accept oriented window metadata.
    WIN: { x: 0, y: 2.40, z: RZ - .03, hw: RX - .2, hh: 1.30, n: [0, 0, 1] },
    OUT,
    SEAT_AT: [-1.50, 2.69], SEAT_FACE: 0, SEAT_Y: .46,
    label: '图书馆', labelK: '图书馆 · library',
    indoor: true, cutaway: true, near: .05, far: 40, expose: 1,
    spawn: { x: DX - .40, z: -RZ + 2.20, yaw: Math.PI * .02 },
    zones: [{ id: 'library', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .40, 0] }],
    roomAt() { return this.zones[0]; },
  });
});
