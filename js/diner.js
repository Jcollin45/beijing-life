// 老李面馆 — the noodle place two doors down, from the inside.
//
// The kind of room that exists on every hutong corner in Beijing: eight tables, a tiled wall
// to shoulder height, a laminated menu board over the pass, a glass case of cold dishes, and
// an open kitchen at the back where somebody is pulling noodles into a pot you can hear from
// the street. Cheap, bright, loud, and always a little steamy.
//
// Same convention as every interior here: the frontage is on the -z wall so the renderer's
// daylight projection works, and the way out is tagged 门.
const Diner = Lazy('Diner', () => {
  // The palette is graded warm on purpose. A room like this is genuinely lit by cold fluorescent
  // tube, and the first version of it was — accurately, and it read as a waiting room. Warm
  // cream above a sage-green tile wainscot is just as true to the type (the green dado is on
  // half the noodle shops in Beijing) and it gives the pendants something to be warm *against*.
  // `groutG` is separate from `grout` because the wall tile is green and the floor tile is not;
  // one grout colour for both put green lines across the floor.
  const col = {
    floor: C('#c7bca4'), grout: C('#aa9f8b'), groutG: C('#87997a'),
    tileW: C('#a9bf99'), wall: C('#ece1c8'),
    ceil: C('#f4edda'), trim: C('#8a7253'), steel: C('#a9b0b6'),
    steelD: C('#7a8186'), chrome: C('#c8ced2'), white: C('#f2f0e9'), cream: C('#e9e0cd'),
    charcoal: C('#31363c'), black: C('#1c1f23'),
    red: C('#a8372a'), redD: C('#7e281e'), redL: C('#c14d33'),
    gold: C('#cf9c31'), goldL: C('#e6c05a'), amber: C('#d8a43a'),
    wood: C('#96754c'), woodD: C('#634c34'), woodL: C('#b8935e'),
    jade: C('#3f7564'), green: C('#4e7a44'), blue: C('#38678d'),
    // The pendant shades. Green vitreous enamel outside, warm white inside, which is the fitting
    // itself rather than a white cone standing in for one.
    enamel: C('#3f6b50'),
    lino: C('#cec8ba'), glass: C('#c6d8e2'), broth: C('#c98b3f'), noodle: C('#e8dfc0'),
    tube: C('#fbf4e4'),
    meat: C('#8e4a33'), scallion: C('#5b8a3c'), chilli: C('#b8392a'), egg: C('#e5c05e'),
  };
  const G = { matte: .06, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, model, wall, flat, glyphs,
          solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 3.9, RZ = 3.3, H = 2.72;
  const WIN = { x: -.60, y: 1.44, z: -RZ + .06, hw: 1.70, hh: .92 };
  const DX = 2.55;                        // the door, at the +x end of the frontage
  // Out on the pavement, directly in front of the exterior door at RST + 1.55. This used to
  // return the player at x=13.4, on the far side of the alley from the restaurant they left.
  const OUT = { x: -7.0 + 1.55, z: -2.95 + 1.75, yaw: Math.PI * .5 };

  const litProps = [], steamRigs = [], fanBlades = [], flameProps = [];
  const fishProps = [], bubbleProps = [], doorStrips = [];
  let nightK = 0;
  let lastTick = 0, doorPulseAt = -99;
  // The four groups that make up whatever the waitress has just put in front of you: a bowl, the
  // noodles that may or may not be in it, a plate for the 小菜, and a bottle and glass.
  const servedBowl = [], servedNoodle = [], servedPlate = [], servedBottle = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }

  let seed = 0x0d17e7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- 菜单 the menu
  // The one place the prices live. The board on the back wall is painted from this list, the
  // order panel is built from it and the waitress charges off it, because a restaurant where the
  // board says 18 and the till says something else is a bug nobody would ever find twice.
  //
  // Rows with `sec` are section headings; rows with `hz` are dishes. The board splits the list
  // down the middle into two columns, so the eleven-and-eleven balance below is load-bearing:
  // move a line and the columns go ragged.
  //
  // Per dish: `price` in kuai, `cook` how many minutes the kitchen takes over it, `secs` how
  // long it takes you to eat in real time and `mins` in the day, `gain` what it does for you,
  // and `kind` what actually turns up on the table — a bowl of noodles, a bowl without them,
  // a plate, or a bottle and a glass.
  const MENU = [
    // ---- column one: 面类 and 饭类
    { sec:'面类', en:'noodles' },
    { hz:'牛肉面', py:'niúròumiàn', en:'beef noodle soup', price:18, cook:7,
      kind:'noodle', fill:'#c4762e', secs:5.0, mins:35, gain:{ food:74, mood:20 },
      done:'汤很辣，面很筋道。', doneTr:'The broth is hot and the noodles have bite.' },
    { hz:'西红柿鸡蛋面', py:'xīhóngshì jīdànmiàn', en:'tomato and egg noodles', price:14, cook:6,
      kind:'noodle', fill:'#c25a3a', secs:4.6, mins:30, gain:{ food:64, mood:16 },
      done:'家常味道，很舒服。', doneTr:'Home cooking. Comforting.' },
    { hz:'炸酱面', py:'zhájiàngmiàn', en:'noodles in bean sauce', price:15, cook:6,
      kind:'noodle', fill:'#6d4a2c', secs:4.6, mins:30, gain:{ food:68, mood:18 },
      done:'北京的味道，酱很香。', doneTr:'The taste of Beijing. The sauce is rich.' },
    { hz:'打卤面', py:'dǎlǔmiàn', en:'noodles in thick gravy', price:16, cook:6,
      kind:'noodle', fill:'#9c6a35', secs:4.8, mins:32, gain:{ food:70, mood:16 },
      done:'卤子浇得满满的。', doneTr:'Ladled over until it nearly spills.' },
    { hz:'拉面', py:'lāmiàn', en:'hand-pulled noodles', price:13, cook:5,
      kind:'noodle', fill:'#cf9a52', secs:4.4, mins:28, gain:{ food:62, mood:15 },
      done:'师傅当场拉的。', doneTr:'Pulled to order, right there at the range.' },
    { hz:'凉面', py:'liángmiàn', en:'cold noodles', price:12, cook:3,
      kind:'noodle', fill:'#c9a05a', secs:4.0, mins:24, gain:{ food:54, mood:16 },
      done:'夏天就吃这个。', doneTr:'This is what summer is for.' },
    { sec:'饭类', en:'rice' },
    { hz:'米饭', py:'mǐfàn', en:'bowl of rice', price:3, cook:2,
      kind:'rice', fill:'#f1eee2', secs:2.6, mins:12, gain:{ food:26, mood:4 },
      done:'就是一碗白饭。', doneTr:'Just a bowl of white rice.' },
    { hz:'蛋炒饭', py:'dànchǎofàn', en:'egg fried rice', price:12, cook:5,
      kind:'rice', fill:'#e0c064', secs:3.8, mins:24, gain:{ food:58, mood:14 },
      done:'粒粒分开，够火。', doneTr:'Every grain separate. Proper wok heat.' },
    { hz:'盖饭', py:'gàifàn', en:'rice with a topping', price:16, cook:6,
      kind:'rice', fill:'#a9743a', secs:4.4, mins:30, gain:{ food:72, mood:17 },
      done:'一碗解决一顿。', doneTr:'One bowl and the meal is settled.' },
    // ---- column two: 小菜, 汤类 and 饮料
    { sec:'小菜', en:'small dishes' },
    { hz:'凉菜', py:'liángcài', en:'cold dish', price:8, cook:2,
      kind:'plate', fill:'#7d9a52', secs:3.0, mins:15, gain:{ food:22, mood:12 },
      done:'开胃，先上这个。', doneTr:'Comes out first, to open the appetite.' },
    { hz:'拍黄瓜', py:'pāihuánggua', en:'smashed cucumber', price:8, cook:2,
      kind:'plate', fill:'#5f8f46', secs:2.8, mins:14, gain:{ food:18, mood:14 },
      done:'蒜多，脆。', doneTr:'Heavy on the garlic. Crunchy.' },
    { hz:'花生米', py:'huāshēngmǐ', en:'fried peanuts', price:6, cook:1,
      kind:'plate', fill:'#c8a06a', secs:2.6, mins:12, gain:{ food:16, mood:11 },
      done:'配啤酒的东西。', doneTr:'What beer is for.' },
    { hz:'土豆丝', py:'tǔdòusī', en:'shredded potato', price:10, cook:4,
      kind:'plate', fill:'#d9c168', secs:3.0, mins:16, gain:{ food:26, mood:11 },
      done:'又酸又脆。', doneTr:'Sharp and crisp.' },
    { sec:'汤类', en:'soup' },
    { hz:'蛋花汤', py:'dànhuātāng', en:'egg drop soup', price:6, cook:3,
      kind:'soup', fill:'#e8d48a', secs:2.8, mins:12, gain:{ food:20, mood:10 },
      done:'蛋花散开了。', doneTr:'The egg spreads out in ribbons.' },
    { hz:'酸辣汤', py:'suānlàtāng', en:'hot and sour soup', price:8, cook:4,
      kind:'soup', fill:'#b5522c', secs:3.0, mins:14, gain:{ food:24, mood:13 },
      done:'一口下去就出汗。', doneTr:'One mouthful and you are sweating.' },
    { sec:'饮料', en:'drinks' },
    { hz:'啤酒', py:'píjiǔ', en:'beer', price:6, cook:0,
      kind:'bottle', fill:'#5c6b3a', pour:'#d8a83e', secs:3.2, mins:20,
      gain:{ food:8, mood:26, rest:-6 },
      done:'冰的，一口就见底。', doneTr:'Ice cold, and gone in one.' },
    { hz:'可乐', py:'kělè', en:'cola', price:4, cook:0,
      kind:'bottle', fill:'#3a2a22', pour:'#4a3226', secs:2.8, mins:16,
      gain:{ food:10, mood:18 },
      done:'冰镇的，很甜。', doneTr:'Straight out of the ice. Very sweet.' },
  ];
  const DISHES = MENU.filter(r => r.hz);

  // ---------------------------------------------------------------- parts
  // A table for four with stools rather than chairs, which is what these places have. `n` is
  // how many stools are pulled out, so the room does not read as laid up and unused.
  function table(cx, cz, ry, n, used) {
    const T = { ry, tag: '餐桌' };
    box(cx, .74, cz, 1.10, .06, .78, col.woodL, { ...T, gloss: G.wood });
    box(cx, .70, cz, 1.00, .04, .68, col.woodD, { ...T, hard: true, gloss: G.wood });
    for (const [ox, oz] of [[-.44, -.28], [.44, -.28], [-.44, .28], [.44, .28]])
      capsule(cx + ox, .37, cz + oz, .028, .74, .028, col.steelD, { gloss: G.metal });
    box(cx, .12, cz, .92, .04, .60, col.steelD, { ...T, hard: true, gloss: G.metal });
    // Chairs: a padded seat with a back, on the same four splayed legs the stools had.
    //
    // The seat centre and height are the stool's to the millimetre, and they have to stay that
    // way — `.sitcheck.js` measures every sitter against the nearest seat pan within 65 cm, and
    // the diners in this room are placed off exactly these coordinates. The pan is a box rather
    // than a disc now, which the harness is happy with (it wants something at seat height that
    // is wider than it is tall); the backrest at .69 is above the band it looks in, so it
    // cannot be mistaken for a second seat.
    //
    // `ry: a` turns each chair to face the table: rotY(a) sends local +z to (sin a, 0, cos a),
    // which is the outward radial, so the back lands behind the sitter rather than across them.
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI / 2 + .4, sx = cx + Math.sin(a) * .95, sz = cz + Math.cos(a) * .78;
      box(sx, .44, sz, .38, .07, .38, col.green, { ry: a, gloss: .20 });
      box(sx, .395, sz, .35, .03, .35, col.woodD, { ry: a, hard: true, gloss: G.wood });
      // The back sits 21 cm out — just clear of the seat's own rear edge at 19, so a seated
      // figure's torso does not push through it.
      box(sx + Math.sin(a) * .21, .69, sz + Math.cos(a) * .21, .36, .38, .05, col.green,
        { ry: a, gloss: .20 });
      for (const s of [-1, 1])
        capsule(sx + Math.sin(a) * .21 + Math.cos(a) * s * .155, .60,
          sz + Math.cos(a) * .21 - Math.sin(a) * s * .155,
          .022, .48, .022, col.woodD, { gloss: G.wood });
      for (let k = 0; k < 4; k++)
        capsule(sx + Math.sin(k * 1.57 + .8) * .12, .21, sz + Math.cos(k * 1.57 + .8) * .12,
          .020, .42, .020, col.steelD, { gloss: G.metal, rz: Math.sin(k * 1.57 + .8) * .10,
            rx: -Math.cos(k * 1.57 + .8) * .10 });
    }
    // The permanent furniture of a table like this: vinegar, chilli oil, a napkin box, and a
    // cylinder of chopsticks.
    box(cx + .30, .82, cz - .20, .16, .12, .16, col.charcoal, { ...T, hard: true, gloss: .34 });
    cyl(cx + .18, .84, cz - .22, .035, .14, col.black, { gloss: .40 });
    cyl(cx + .27, .84, cz - .22, .035, .14, col.chilli, { gloss: .40 });
    cyl(cx - .28, .82, cz - .18, .050, .11, col.steel, { gloss: G.metal });
    for (let i = 0; i < 5; i++)
      capsule(cx - .28 + (i - 2) * .012, .93, cz - .18, .006, .20, .006, col.cream,
        { gloss: .16, rz: (i - 2) * .03 });
    // A bowl left on a used table, with the last of the broth in it.
    if (used) {
      cyl(cx - .10, .80, cz + .08, .13, .10, col.white, { gloss: .30 });
      cyl(cx - .10, .845, cz + .08, .115, .02, col.broth, { mode: 1, gloss: .40 });
      // Lying on the table, not hovering three centimetres over it at twenty degrees to it.
      capsule(cx + .13, .782, cz + .15, .006, .22, .006, col.woodL,
        { rz: Math.PI / 2, ry: .5, gloss: .20 });
    }
    solid(cx - .60, cx + .60, cz - .45, cz + .45);
    shade(cx, cz, 1.9, 1.6, .26);
  }

  // A hanging pendant over each table: a shallow enamel shade on a flex.
  function pendant(cx, cz) {
    capsule(cx, H - .22, cz, .010, .44, .010, col.charcoal, { gloss: .30 });
    taper(cx, H - .50, cz, .34, .16, .34, col.enamel, { gloss: .34 });
    litten(cyl(cx, H - .59, cz, .09, .04, C('#ffd89c'),
      { mode: 1, glow: .60 }), 1);
    glow(M.trs(cx, .02, cz, 0, 2.4, 1, 2.4), C('#ffd095'), .20);
    // And the light itself, just under the bulb. The two above are what the lamp looks like —
    // a bright emissive disc and a painted pool on the floor — and neither of them lights
    // anything: until now a diner sitting under this pendant was lit by the ceiling and the
    // window and got nothing at all from the lamp a foot above their head.
    B.light(cx, H - .68, cz, [1.00, 0.82, 0.58], .62, 1.9);
  }

  function build() {
    // ================================================================ shell
    // The floor, the wall tile and the boarded counter carry real surface texture now, read
    // triplanar in world space (js/assets.js). `matScale` is the size of one tile repeat in
    // metres, so it is set to what the thing actually is: 64 cm floor slabs, a 32 cm wall tile
    // matching the grout grid drawn over it, and a 90 cm board on the counter front.
    //
    // `matAmt` is how far the texture may move the colour. It is deliberately low: the palette
    // was chosen deliberately and the texture is here to stop surfaces being flat, not to
    // repaint the room in whatever colour the photograph happened to be.
    // `matAmt` and `nrmAmt` are both pulled back from what was first written here. See the note
    // in world.js: the shader's fixed `t / 0.22` divisor lets a bright map raise the surface
    // rather than only texture it, and a normal map at full strength on a large flat plane
    // feeds the AO pass until it blooms into cloud. Paving is the mildest of the maps at 1.2x,
    // so it keeps most of its amount; the tile below is nearly 3x and loses more.
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor,
      { mode: 9, gloss: .22, mat: 'paving', matScale: .64, matAmt: .40, nrmAmt: .45 });
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // 日光灯 the bare fluorescent battens every one of these rooms is lit by — two runs down the
    // length of it, on stubby drops off the slab. Until now the ceiling was an evenly emissive
    // sheet with nothing on it: the room was bright, but nothing in it was the thing making it
    // bright, and a ceiling with no fitting on it is the tell of a room that was painted rather
    // than built.
    for (const cz2 of [-RZ * .42, RZ * .34]) {
      for (const ox of [-RX * .46, RX * .46])
        box(ox, H - .05, cz2, .05, .10, .05, col.steel, { hard: true, gloss: .40 });
      box(0, H - .13, cz2, RX * 1.42, .07, .13, col.white, { hard: true, gloss: .30 });
      litten(box(0, H - .175, cz2, RX * 1.36, .035, .10, C('#fbf3e0'),
        { hard: true, mode: 1, glow: .085 }), .30);
    }
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2], [0, H / 2, -RZ, RX * 2, H, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall, { mode: 4 });
    // White wall tile to shoulder height on three sides — the surface every cheap restaurant
    // in China is lined with, because it hoses down.
    for (const [x, z, sx, sz] of [[0, RZ - .04, RX * 2, .07],
                                  [-RX + .04, 0, .07, RZ * 2], [RX - .04, 0, .07, RZ * 2]]) {
      box(x, .80, z, sx, 1.60, sz, col.tileW,
        { hard: true, gloss: .34, mat: 'tile', matScale: .32, matAmt: .26, nrmAmt: .35 });
      box(x, 1.63, z, sx, .06, sz + .01, col.jade, { hard: true, gloss: .30 });
      box(x, .07, z, sx, .14, sz + .01, col.charcoal, { hard: true, gloss: .26 });
    }
    // The grid of grout lines. Cheap to draw and the whole reason the wall reads as tile —
    // with only the horizontal courses on it, it came out as painted clapboard.
    for (let i = 0; i < 5; i++) {
      box(0, .32 + i * .32, RZ - .07, RX * 2, .012, .02, col.groutG, { hard: true });
      for (const s of [-1, 1])
        box(s * (RX - .07), .32 + i * .32, 0, .02, .012, RZ * 2, col.groutG, { hard: true });
    }
    for (let i = -12; i <= 12; i++) {
      box(i * .32, .80, RZ - .07, .012, 1.58, .02, col.groutG, { hard: true });
      for (const s of [-1, 1])
        box(s * (RX - .07), .80, i * .32, .02, 1.58, .012, col.groutG, { hard: true });
    }

    // ---- the frontage: a low tiled riser, glazing above it, and the door at the +x end
    box(0, .34, -RZ + .09, RX * 2, .68, .18, col.tileW, { hard: true, gloss: .32 });
    box(0, .70, -RZ + .09, RX * 2, .06, .20, col.red, { hard: true, gloss: .26 });
    box(0, H - .20, -RZ + .09, RX * 2, .40, .18, col.wall, { hard: true, gloss: G.paint });
    // What you see through the glazing from a dim interior: the alley, overexposed. A flat
    // emissive white sheet did read as bright, but it read as a lightbox rather than a window,
    // and it flattened the mullions and the painted characters against it. Two graded bands and
    // a hint of the wall opposite do the same job and keep some depth in it.
    box(0, 1.62, -RZ + .035, RX * 2 - .2, 1.22, .02, C('#d8dbd4'),
      { hard: true, mode: 1, glow: .16 });
    box(0, 1.06, -RZ + .030, RX * 2 - .2, .40, .02, C('#b9b2a2'),
      { hard: true, mode: 1, glow: .09 });
    box(0, 1.98, -RZ + .030, RX * 2 - .2, .34, .02, C('#c2c6c2'),
      { hard: true, mode: 1, glow: .11 });
    for (const gx of [-2.90, -1.55, -.20, 1.15])
      box(gx, 1.48, -RZ + .06, 1.24, 1.50, .04, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass, glow: .08 });
    for (const mx of [-3.55, -2.24, -.88, .48, 1.82])
      box(mx, 1.46, -RZ + .10, .08, 1.62, .10, col.steel, { hard: true, gloss: G.metal });
    // 面 painted on the glass, reversed for the people outside — from in here you read the back
    // of it, which is exactly how it is.
    glyphs(-1.55, 1.62, -RZ + .13, 0, '牛肉面', { size: .30, gap: .12, color: col.redD,
      mode: 1, alpha: .85 });

    // ---- 门 the way out
    const dz = -RZ + .10;
    box(DX, 1.44, dz, 1.02, 1.94, .05, col.glass,
      { tag: '门', hard: true, mode: 1, alpha: .46, gloss: G.glass, glow: .34 });
    for (const [x, y, sx, sy] of [[DX - .50, 1.44, .09, 1.98], [DX + .50, 1.44, .09, 1.98],
                                  [DX, 2.44, 1.08, .09], [DX, .46, 1.08, .09]])
      box(x, y, dz + .04, sx, sy, .09, col.steel, { tag: '门', hard: true, gloss: G.metal });
    capsule(DX - .32, 1.12, dz + .12, .028, .80, .028, col.steelD, { tag: '门', gloss: G.metal });
    // The plastic strip curtain in the doorway, which every one of these has in summer.
    for (let i = 0; i < 7; i++) {
      const x = DX - .42 + i * .14, base = (rnd() - .5) * .06;
      const p = box(x, 1.36, dz + .18, .13, 1.74, .02, col.glass,
        { tag: '门', hard: true, mode: 1, alpha: .28, gloss: .5, ry: base });
      doorStrips.push({ p, x, y:1.36, z:dz + .18, base, phase:i * .72 });
    }
    // The brass bell that makes the doorway audible. It hangs from the top rail and visibly
    // rocks when anybody pushes through the strip curtain.
    capsule(DX, 2.49, dz + .22, .012, .18, .012, col.charcoal,
      { tag:'门', gloss:.34 });
    taper(DX, 2.38, dz + .22, .12, .11, .12, col.gold,
      { tag:'门', gloss:.62, rx:Math.PI });
    ball(DX, 2.31, dz + .22, .025, .025, .025, col.goldL,
      { tag:'门', mode:1, glow:.08, gloss:.60 });
    thing('门', DX, 2.18, dz + .30, '吃完了，我走了。', "Finished. I'm off.",
      'Out through the strip curtain and back into the alley.',
      { focus: [DX, dz + 1.10], reach: 1.9 }).exit = { place: 'street', at: OUT };

    // ---- 外卖 takeaway window on the frontage, past the door at the +x end
    const TWX = 3.50, TWZ = -RZ + .09;
    box(TWX, 1.14, TWZ - .02, .60, .54, .08, C('#d0d4ce'),
      { hard: true, mode: 1, glow: .12 });
    box(TWX, .90, TWZ + .06, .62, .06, .14, col.woodL,
      { hard: true, gloss: G.wood });
    box(TWX, 1.39, TWZ + .02, .66, .04, .10, col.red,
      { hard: true, gloss: .22 });
    box(TWX, .88, TWZ + .02, .66, .04, .10, col.red,
      { hard: true, gloss: .22 });
    box(TWX - .32, 1.13, TWZ + .02, .06, .54, .10, col.red,
      { hard: true, gloss: .22 });
    box(TWX + .32, 1.13, TWZ + .02, .06, .54, .10, col.red,
      { hard: true, gloss: .22 });
    glyphs(TWX, 1.74, TWZ + .04, 0, '外卖',
      { size: .16, gap: .08, color: col.redD, mode: 1, alpha: .90 });
    // Finished takeaway orders wait on the inside ledge, each with a folded receipt and loop
    // handles. The short-visit customers below actually carry this same bag shape out.
    for (let i = 0; i < 2; i++) {
      const x = TWX - .13 + i * .27;
      box(x, 1.02, TWZ + .22, .21, .25, .16, col.cream,
        { tag:'外卖', gloss:.18, ry:(i ? -.05 : .04) });
      for (const s of [-1, 1])
        capsule(x + s * .055, 1.18, TWZ + .22, .008, .16, .008, col.woodL,
          { tag:'外卖', rz:s * .12, gloss:.18 });
      box(x, 1.08, TWZ + .13, .10, .055, .008, col.red,
        { tag:'外卖', hard:true, mode:1, glow:.04 });
    }

    // ================================================================ the tables
    // Four of them, staggered, with one against the window and one already eaten at.
    table(-2.55, -1.85, .06, 3, true);
    table(-2.55, .60, -.04, 4, false);
    // The fourth table used to stand at z 2.35, which put half of it inside the pass counter.
    table(-2.55, 2.20, .02, 2, false);
    // The middle table is the one your own order lands on, so it starts clear rather than with
    // somebody else's empty bowl still on it.
    table(.70, .55, .10, 4, false);
    // Three pendants, not four. The one over the back table hung a metre in front of the menu
    // board and its shade took three dishes out of the right-hand column; that table gets a
    // batten over the board instead, which is what lights a menu in one of these places anyway.
    pendant(-2.55, -1.85); pendant(-2.55, .60); pendant(.70, .55);
    // 顾客 sits on the far stool of the second table over lunch and again in the evening. Her
    // lunch lives here rather than in the NPC: a bowl of noodles set at the place she is on,
    // with chilli oil stirred through it and her chopsticks laid across the rim.
    const kbx = -2.38, kbz = .90;
    cyl(kbx, .80, kbz, .145, .11, col.white, { tag: '餐桌', gloss: .30 });
    cyl(kbx, .848, kbz, .130, .022, col.broth, { tag: '餐桌', mode: 1, gloss: .42 });
    for (let i = 0; i < 5; i++)
      capsule(kbx - .05 + i * .025, .862, kbz + (i - 2) * .020, .010, .17, .010, col.noodle,
        { tag: '餐桌', rz: Math.PI / 2, ry: .55 + i * .14, gloss: .24 });
    cyl(kbx + .045, .868, kbz - .035, .034, .014, col.chilli,
      { tag: '餐桌', mode: 1, gloss: .50 });
    for (const s of [-1, 1])
      capsule(kbx + .09, .895, kbz + .05 + s * .013, .006, .26, .006, col.woodL,
        { tag: '餐桌', rz: Math.PI / 2, ry: .40, gloss: .20 });
    // The other occupied places get their own food, tea and small table mess. Repeating the
    // exact same bowl would look staged, so every setting gets a different broth and garnish.
    function ambientMeal(x, z, fill, tea) {
      cyl(x, .815, z, .138, .105, col.white, { tag: '餐桌', gloss: .30 });
      cyl(x, .860, z, .123, .020, C(fill), { tag: '餐桌', mode: 1, gloss: .43 });
      for (let i = 0; i < 4; i++)
        capsule(x - .04 + i * .025, .872, z + (i - 1.5) * .022, .008, .14, .008,
          col.noodle, { tag: '餐桌', rz: Math.PI / 2, ry: .45 + i * .18, gloss: .22 });
      for (let i = 0; i < 4; i++)
        cyl(x + (i - 1.5) * .025, .878, z - .025 + (i % 2) * .04, .010, .009,
          col.scallion, { tag: '餐桌', mode: 1 });
      for (const s of [-1, 1])
        capsule(x + .08, .895, z + .06 + s * .012, .006, .24, .006, col.woodL,
          { tag: '餐桌', rz: Math.PI / 2, ry: .34, gloss: .18 });
      cyl(x - .24, .825, z + .03, .040, .115, col.glass,
        { tag: '餐桌', mode: 1, alpha: .40, gloss: G.glass });
      cyl(x - .24, .835, z + .03, .034, .075, C(tea), { tag: '餐桌', gloss: .42 });
    }
    ambientMeal(-2.30, -1.55, '#a86a31', '#bb8736');
    ambientMeal(-2.10, -1.98, '#c05b34', '#d0a34b');
    ambientMeal(-2.70,   .28, '#ba7a35', '#c39742');
    ambientMeal(-2.70,  1.88, '#755035', '#ad7b32');
    // Your table is the middle one, approached from the door side, because that is where the
    // waitress brings the food and 吃饭 has to act on the table the order is actually on.
    thing('餐桌', .70, 1.06, .55, '这张桌子有人吗？', 'Is anyone sitting at this table?',
      '餐 meal + 桌 table. A table at home is just a 桌子.',
      { focus: [.70, -.42], reach: 1.9 });

    // ---- 上菜 what the waitress brings. Hidden until you have ordered something: a restaurant
    // that has a bowl waiting on your table whether or not you asked for one is a diorama.
    //
    // Hidden by being moved off the world and scaled to nothing, not by alpha — a see-through
    // prop still writes depth, so a bowl at alpha 0 would cut a bowl-shaped hole in the table.
    // On the near half of the table, since 餐桌 is approached from the door side and your own
    // bowl does not get put down across the table from you. The table top is at y .77, so the
    // bowl stands on it and everything else is measured off its rim at .90.
    // Set at the near stool, clear of the chopstick jar on one side and the condiment caddy on
    // the other — the only 45 cm of that table nothing else is standing on. The table top is at
    // y .77, so the bowl stands on it and everything else is measured off its rim at .90.
    const SVX = .64, SVZ = .33;
    // A bowl: noodles, rice and soup all arrive in one, and the fill takes the dish's colour.
    servedBowl.push(
      cyl(SVX, .835, SVZ, .145, .13, col.white, { tag: '餐桌', gloss: .30 }),
      cyl(SVX, .888, SVZ, .128, .022, col.broth, { tag: '餐桌', mode: 1, gloss: .42 }));
    for (let i = 0; i < 5; i++)
      servedNoodle.push(capsule(SVX - .05 + i * .025, .898, SVZ + (i - 2) * .020,
        .010, .15, .010, col.noodle, { tag: '餐桌', rz: Math.PI / 2, ry: .5 + i * .15,
          gloss: .24 }));
    // Chopsticks resting across the rim, not hovering four centimetres over it.
    for (const s of [-1, 1])
      servedBowl.push(capsule(SVX + .06, .912, SVZ + .04 + s * .013, .006, .26, .006, col.woodL,
        { tag: '餐桌', rz: Math.PI / 2, ry: .40, gloss: .20 }));
    // A 小菜 comes on a shallow plate instead, heaped in the middle.
    // A dome heaped in the middle, not a truncated cone: `taper` is wide at the bottom and flat
    // on top, and from above that flat top read as a crater rather than a heap of cucumber.
    // The chopsticks lie on the near rim, in front of the food where you would have put them.
    servedPlate.push(
      cyl(SVX, .793, SVZ, .165, .046, col.white, { tag: '餐桌', gloss: .32 }),
      ball(SVX, .818, SVZ, .118, .052, .118, col.jade, { tag: '餐桌', gloss: .34 }),
      capsule(SVX + .02, .824, SVZ - .12, .006, .24, .006, col.woodL,
        { tag: '餐桌', rz: Math.PI / 2, ry: .28, gloss: .20 }));
    // 饮料 comes as a bottle and a glass. The glass stands where the bowl would have.
    servedBottle.push(
      cyl(.88, .90, .56, .036, .26, C('#5c6b3a'), { tag: '餐桌', gloss: .58 }),
      cyl(.88, 1.045, .56, .014, .05, C('#5c6b3a'), { tag: '餐桌', gloss: .58 }),
      cyl(.88, 1.075, .56, .017, .015, col.gold, { tag: '餐桌', gloss: .60 }),
      cyl(SVX - .02, .835, SVZ, .038, .13, col.glass,
        { tag: '餐桌', mode: 1, alpha: .42, gloss: G.glass }),
      cyl(SVX - .02, .855, SVZ, .033, .09, C('#d8a83e'), { tag: '餐桌', gloss: .46 }));

    // ================================================================ 菜单 the menu board
    // On the back wall to the left of the pass, not above it. Over the pass it shared its wall
    // and its height with the extract hood, which stood 40 cm proud of the tiles and covered
    // the bottom two thirds of every line on it.
    //
    // One column, dish on the left and price on the right, six lines. Laid out in two columns
    // of three the long dish names ran straight under the prices of the column beside them.
    const mx0 = 1.05;                       // centre of the pass and the kitchen behind it
    const MBX = -2.20;                      // centre of the menu board
    // Wider and taller than it was, because there are seventeen dishes on it now rather than
    // six. It runs from the wall to the near end of the pass, which is all the wall there is.
    box(MBX, 2.05, RZ - .10, 3.24, 1.34, .07, col.woodD,
      { tag: '菜单', hard: true, gloss: G.wood });
    box(MBX, 2.05, RZ - .145, 3.06, 1.20, .025, col.charcoal,
      { tag: '菜单', hard: true, gloss: .20 });
    // A lacquer title band, brass frame and centre rule turn the board into a real menu system
    // instead of twenty-two loose labels on a red rectangle.
    box(MBX, 2.60, RZ - .165, 3.02, .16, .018, col.redD,
      { tag:'菜单', hard:true, gloss:.24 });
    glyphs(MBX, 2.603, RZ - .178, Math.PI, '老李面馆',
      { size:.112, gap:.034, color:col.goldL, mode:1, tag:'菜单' });
    box(MBX, 2.02, RZ - .171, .018, .94, .012, col.gold,
      { tag:'菜单', hard:true, gloss:.45 });
    for (const x of [MBX - 1.55, MBX + 1.55])
      box(x, 2.05, RZ - .172, .034, 1.28, .016, col.gold,
        { tag:'菜单', hard:true, gloss:.48 });
    for (const y of [1.405, 2.695])
      box(MBX, y, RZ - .172, 3.12, .034, .016, col.gold,
        { tag:'菜单', hard:true, gloss:.48 });
    for (const x of [MBX - 1.52, MBX + 1.52]) for (const y of [1.44, 2.66])
      ball(x, y, RZ - .192, .025, .025, .018, col.goldL,
        { tag:'菜单', mode:1, glow:.08, gloss:.58 });
    // The batten that lights it, tucked under the ceiling in front of the top edge.
    box(MBX, 2.66, RZ - .34, 2.60, .07, .16, col.steel, { hard: true, gloss: G.metal });
    litten(box(MBX, 2.612, RZ - .34, 2.50, .036, .12, col.tube,
      { hard: true, mode: 1, glow: .40 }), 1);
    glow(M.trs(MBX, .02, RZ - 1.05, 0, 3.2, 1, 2.4), C('#ffe9c2'), .07);
    // Twenty-two lines in two columns. The board faces -z, which mirrors x on screen, so the
    // first column has to sit at the *larger* x to be read first and so does the dish within its
    // own line — written the other way round every line read as its price and then its name.
    //
    // Names are flush to the reading edge and prices flush to the far one, worked out from the
    // character count rather than centred: centred, a three-character dish floated in the middle
    // of the column and the board read as a word cloud.
    const ROWS = Math.ceil(MENU.length / 2), SZ = .088, GAP = .008;
    // Digits get a negative gap. Every glyph is drawn in a square cell and the ink in a Latin
    // one fills about half of it, so at the same spacing as the characters "18" came out as
    // "1 8" and every price on the board read as two separate numbers.
    const PGAP = -.038;
    const span = (s, g = GAP) => [...s].length * (SZ + g) - g;
    MENU.forEach((row, i) => {
      const cx = MBX + ((i / ROWS) | 0 ? -.775 : .775);
      const y = 2.48 - (i % ROWS) * .101;
      if (row.sec) {                                   // a section heading, no price
        glyphs(cx - .01, y, RZ - .16, Math.PI, row.sec,
          { size: SZ * 1.02, gap: GAP, color: col.jade, mode: 1, tag: '菜单' });
        return;
      }
      glyphs(cx + .60 - span(row.hz) / 2, y, RZ - .18, Math.PI, row.hz,
        { size: SZ, gap: GAP, color: col.cream, mode: 1, tag: '菜单' });
      const p = String(row.price);
      glyphs(cx - .62 + span(p, PGAP) / 2, y, RZ - .18, Math.PI, p,
        { size: SZ, gap: PGAP, color: col.goldL, mode: 1, tag: '菜单' });
    });
    thing('菜单', MBX, 2.78, RZ - .26, '看看菜单，你想吃什么？',
      'Have a look at the menu — what do you want to eat?',
      '菜 dish + 单 list. Reading one is the first real test of your characters.',
      { focus: [MBX, RZ - 1.40], reach: 2.2 });

    // ================================================================ 装饰 the dressing
    // What separates a room from a rendering of one is the layer nobody planned: prints that
    // have hung there long enough to stop being noticed, a plant somebody waters, and crockery
    // stacked where it drains rather than where it looks tidy. It all goes where it would
    // actually be — the long wall the diners face, the top of the tank, and the shelf over the
    // pass — and the placements are picked around what is already there rather than on a grid.

    // ---- three framed prints along the left wall. That wall is busier than it looks and the
    // first attempt hung all three of them inside something: the middle one through the
    // oscillating fan at z -0.40, the third through the clock at z 1.70, and the first through
    // the aquarium hood, which tops out at 1.86. The clear bands are z < -0.82, z 0.02–1.53 and
    // z > 1.87; the frames sit at 2.22 so their bottom edge clears the hood as well.
    //
    // The mount is not emissive. It was, at glow .05, on the theory that paper catches the
    // light — and a lit sheet of paper is a lightbox: the three of them washed a haze across
    // the whole wall through the bloom and the fan showed through the print in front of it.
    // Paper is a lit surface like everything else.
    function print(pz, top, bot) {
      box(-RX + .045, 2.22, pz, .05, .68, .73, col.woodD, { hard: true, gloss: .26 });
      box(-RX + .073, 2.22, pz, .014, .60, .62, col.cream, { hard: true, gloss: .12 });
      // 3 mm proud of the mount. Flush, the glyphs z-fight with the paper they are printed on.
      glyphs(-RX + .083, 2.32, pz, Math.PI / 2, top, { size: .16, gap: .03, color: col.woodD });
      glyphs(-RX + .083, 2.12, pz, Math.PI / 2, bot, { size: .16, gap: .03, color: col.woodD });
    }
    print(-2.55, '好好', '吃面');
    print(.77, '老李', '面馆');
    print(2.40, '干净', '卫生');

    // ---- plants. `y0` is what it stands on, because the second one stands on the fish tank,
    // which is where a plant ends up in a shop with one windowless wall.
    function plant(px, pz, s, n, y0 = 0) {
      taper(px, y0 + .17 * s, pz, .34 * s, .34 * s, .34 * s, col.trim, { gloss: .22 });
      box(px, y0 + .33 * s, pz, .27 * s, .03 * s, .27 * s, col.woodD, { hard: true, gloss: .08 });
      // The clumps were .17 wide and .085 tall, which is a disc, and eleven discs up a stem is
      // a stack of pancakes rather than a plant. Nearly round and smaller, with the radius and
      // the height both varying, reads as foliage at the distance anybody sees this from.
      for (let i = 0; i < n; i++) {
        const a = i * 2.399, r = (.09 + (i % 3) * .06) * s, hz = (i % 5) * .045;
        capsule(px + Math.sin(a) * r * .5, y0 + (.42 + hz) * s, pz + Math.cos(a) * r * .5,
          .013 * s, .32 * s, .013 * s, col.green,
          { rx: Math.cos(a) * .26, rz: Math.sin(a) * .26, gloss: .14 });
        ball(px + Math.sin(a) * r, y0 + (.60 + hz + (i % 2) * .07) * s, pz + Math.cos(a) * r,
          (.115 + (i % 3) * .022) * s, (.095 + (i % 3) * .018) * s, (.115 + (i % 3) * .022) * s,
          i % 2 ? col.green : col.jade, { ry: a, gloss: .16 });
      }
    }
    plant(-RX + .38, 2.50, 1.20, 11);
    solid(-RX, -RX + .76, 2.18, 2.82);
    plant(-RX + .30, -1.78, .55, 7, 1.86);

    // ---- the shelf over the pass. It goes in the one metre of back wall between the menu
    // board (which ends at -0.95) and the range splashback (which starts at 0.12); anywhere
    // else on that wall it would be inside something.
    for (const [sy, kind] of [[1.78, 0], [2.16, 1]]) {
      box(-.42, sy, RZ - .16, .95, .035, .28, col.wood, { hard: true, gloss: G.wood });
      for (const ox of [-.44, .44])
        box(-.42 + ox, sy - .10, RZ - .16, .03, .17, .26, col.woodD, { hard: true, gloss: G.wood });
      if (!kind) {
        // stacked bowls, draining upside down, and the tea caddies beside them
        for (let i = 0; i < 4; i++)
          cyl(-.72, sy + .045 + i * .052, RZ - .17, .085, .05, col.white, { gloss: .30 });
        for (let i = 0; i < 3; i++)
          cyl(-.30 + i * .13, sy + .09, RZ - .17, .055, .15, i % 2 ? col.red : col.gold,
            { gloss: .26 });
      } else {
        // jars of dry goods along the top, which is where they go because nobody reaches them
        for (let i = 0; i < 5; i++)
          cyl(-.78 + i * .19, sy + .105, RZ - .17, .068, .18,
            [col.cream, col.broth, col.chilli, col.noodle, col.woodL][i], { gloss: .34 });
        for (let i = 0; i < 5; i++)
          cyl(-.78 + i * .19, sy + .202, RZ - .17, .070, .022, col.charcoal, { gloss: .30 });
      }
    }

    // ---- a spare stool, pulled out of the way against the front wall. Somewhere between four
    // and eight of these live in every shop like this and only some of them are ever at a table.
    model('chinese_stool', 1.55, 0, -2.62, 1.0, { ry: .5, gloss: .22 });

    // ================================================================ the pass and the kitchen
    // A tiled counter across the back with the kitchen behind it: two woks on a gas range, a
    // stockpot going, a noodle board, and the extract hood over the lot.
    //
    // The pass and the range used to be 9 cm apart, which is to say there was nowhere for the
    // cook to stand — and the moment somebody had to be put behind that counter it was obvious.
    // The pass has come forward and the range has gone back against the wall, leaving half a
    // metre of aisle between them, which is about what one of these kitchens really has.
    const cz = 1.85, RANGEZ = 3.00;
    // The front of the pass is boarded rather than tiled. Tiled, it was a second run of the
    // same green as the wainscot directly under it, and the two read as one continuous surface
    // with the counter top floating off it.
    box(mx0, .52, cz, 2.75, 1.04, .70, col.wood,
      { tag: '厨房', hard: true, gloss: G.wood, mat: 'wood', matScale: .90, matAmt: .50 });
    box(mx0, 1.06, cz, 2.85, .08, .82, col.steel, { tag: '厨房', hard: true, gloss: G.metal });
    // Grout lines down the tiled front of the pass. At half a metre wide these were not lines
    // at all — they were six beige panels, and the counter read as a row of cupboard doors.
    for (let i = 0; i < 6; i++)
      box(mx0 - 1.30 + i * .52, .52, cz - .355, .022, .96, .02, col.woodD,
        { hard: true, gloss: G.wood });
    for (let i = 0; i < 3; i++)
      box(mx0, .18 + i * .34, cz - .355, 2.72, .020, .02, col.woodD, { hard: true, gloss: G.wood });

    // ---- the range, against the back wall. Stainless with a black top and a splashback, not
    // a single dark volume: at one flat near-black box two metres across it read as a monolith
    // parked in the middle of the room.
    box(mx0 + .20, .42, RANGEZ, 2.20, .84, .48, col.steel,
      { tag: '厨房', hard: true, gloss: G.metal });
    box(mx0 + .20, .06, RANGEZ - .06, 2.10, .12, .36, col.steelD,
      { tag: '厨房', hard: true, gloss: .30 });
    box(mx0 + .20, .86, RANGEZ, 2.24, .06, .52, col.charcoal,
      { tag: '厨房', hard: true, gloss: .46 });
    // Stainless splashback, and it stops under the jade band. In white tile at z RZ-.06 it sat
    // inside the wall tile it was pretending to be, ran 13 cm above the band and cut the green
    // line clean out of the middle of the room — a blank white patch behind the cook.
    box(mx0 + .20, 1.20, RZ - .12, 2.26, .74, .05, col.steel,
      { tag: '厨房', hard: true, gloss: G.metal });
    box(mx0 + .20, 1.585, RZ - .13, 2.30, .03, .07, col.steelD,
      { tag: '厨房', hard: true, gloss: G.metal });
    // the control knobs along the front, which is most of what makes it read as a cooker
    for (let i = 0; i < 4; i++)
      cyl(mx0 - .55 + i * .50, .60, RANGEZ - .25, .045, .05, col.charcoal,
        { tag: '厨房', rx: Math.PI / 2, gloss: .40 });
    for (const ox of [-.55, .25]) {
      cyl(mx0 + .20 + ox, .90, RANGEZ, .26, .06, col.charcoal, { tag: '厨房', gloss: .40 });
      litten(cyl(mx0 + .20 + ox, .93, RANGEZ, .17, .03, C('#3d7fd8'),
        { tag: '厨房', mode: 1, glow: .30 }), .3);
      // A broken ring of blue flame around each burner. The pieces pulse independently so the
      // kitchen still looks active from the dining room even when the cook is between motions.
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const p = ball(mx0 + .20 + ox + Math.cos(a) * .18, .965,
          RANGEZ + Math.sin(a) * .18, .022, .045, .022, C('#62a9ff'),
          { tag: '厨房', mode: 1, glow: .44, alpha: .82 });
        flameProps.push({ p, phase: i * .73 + (ox > 0 ? 1.9 : 0) });
      }
      // A wok on each ring. `taper` narrows upward, so a wok has to be turned over: left the
      // way round it comes, the two of them read as black buckets with the mouth pinched shut.
      // The rim, the sheen of oil in the bottom and the handle are what say wok rather than pot.
      taper(mx0 + .20 + ox, 1.05, RANGEZ, .48, .17, .48, col.charcoal,
        { tag: '厨房', rx: Math.PI, gloss: .46 });
      cyl(mx0 + .20 + ox, 1.135, RANGEZ, .245, .022, col.steelD,
        { tag: '厨房', gloss: G.metal });
      cyl(mx0 + .20 + ox, 1.03, RANGEZ, .17, .015, C('#4a3a24'),
        { tag: '厨房', mode: 1, gloss: .62 });
      capsule(mx0 + .20 + ox, 1.12, RANGEZ - .26, .022, .34, .022, col.woodD,
        { tag: '厨房', rx: Math.PI / 2, gloss: G.wood });
    }
    // the stockpot, and the steam off it
    cyl(mx0 + 1.10, 1.04, RANGEZ, .21, .34, col.steel, { tag: '厨房', gloss: G.metal });
    cyl(mx0 + 1.10, 1.22, RANGEZ, .22, .03, col.steelD, { tag: '厨房', gloss: G.metal });
    for (let i = 0; i < 5; i++)
      steamRigs.push(ball(mx0 + 1.10, 1.30 + i * .10, RANGEZ, .07, .07, .07,
        C('#eef3f6'), { mode: 1, alpha: 0 }));

    // ---- the extract hood. Against the wall, with a duct carrying on up to the ceiling: as a
    // pair of free-floating slabs with a 26 cm gap above them it hung in mid-air over the room
    // like a blackboard nobody had fixed to anything.
    box(mx0 + .20, 1.98, RZ - .30, 2.30, .26, .58, col.steel,
      { tag: '厨房', hard: true, gloss: G.metal });
    box(mx0 + .20, 2.20, RZ - .22, 2.10, .20, .42, col.steelD,
      { tag: '厨房', hard: true, gloss: G.metal });
    box(mx0 + .20, 2.51, RZ - .16, 1.10, .42, .30, col.steelD,
      { tag: '厨房', hard: true, gloss: G.metal });
    // the lip along its front edge, and a strip light under it
    box(mx0 + .20, 1.86, RZ - .58, 2.30, .06, .04, col.steelD,
      { tag: '厨房', hard: true, gloss: G.metal });
    litten(box(mx0 + .20, 1.84, RZ - .46, 1.90, .04, .10, col.tube,
      { tag: '厨房', hard: true, mode: 1, glow: .30 }), .7);

    // The pass now looks like a working hand-off point: order tickets hang from a steel rail,
    // and a clear 取餐处 sign tells you where finished bowls appear.
    capsule(mx0 + .18, 1.70, RZ - .56, .018, 1.92, .018, col.steelD,
      { tag:'厨房', rz:Math.PI / 2, gloss:G.metal });
    for (let i = 0; i < 5; i++) {
      const px = mx0 - .54 + i * .36;
      box(px, 1.59 - (i % 2) * .025, RZ - .575, .20, .22, .012, col.cream,
        { tag:'厨房', hard:true, gloss:.16, rz:(i - 2) * .018 });
      box(px, 1.63 - (i % 2) * .025, RZ - .585, .12, .014, .008, col.redL,
        { tag:'厨房', hard:true });
      for (let k = 0; k < 3; k++)
        box(px, 1.59 - k * .045 - (i % 2) * .025, RZ - .586, .10 - k * .012,
          .009, .007, col.charcoal, { tag:'厨房', hard:true });
    }
    box(mx0 + .10, .74, cz - .376, .72, .31, .018, col.jade,
      { tag:'厨房', hard:true, gloss:.24 });
    glyphs(mx0 + .10, .75, cz - .391, 0, '取餐处',
      { size:.135, gap:.025, color:col.cream, mode:1, tag:'厨房' });

    // a rack of bowls and a noodle board on the pass
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++)
      cyl(mx0 - 1.05 + s * .34, 1.14 + i * .055, cz + .10, .12, .05, col.white,
        { gloss: .30, tag: '厨房' });
    box(mx0 + .16, 1.12, cz + .08, .64, .04, .44, col.woodL, { tag: '厨房', gloss: G.wood });
    for (let i = 0; i < 9; i++)
      capsule(mx0 - .06 + i * .055, 1.15, cz + .08, .008, .38, .008, col.noodle,
        { gloss: .18, rz: Math.PI / 2, rx: (rnd() - .5) * .2, tag: '厨房' });
    // A small battered radio supplies the occasional melody heard under the extractor.
    const rdx = mx0 + .94, rdz = cz - .04;
    box(rdx, 1.22, rdz, .34, .22, .16, col.redD, { tag:'厨房', gloss:.28 });
    cyl(rdx - .07, 1.22, rdz - .09, .060, .018, col.charcoal,
      { tag:'厨房', rx:Math.PI / 2, gloss:.28 });
    for (let i = 0; i < 4; i++)
      box(rdx - .07, 1.19 + i * .020, rdz - .101, .085, .007, .006, col.steelD,
        { tag:'厨房', hard:true, gloss:.30 });
    litten(box(rdx + .08, 1.24, rdz - .095, .075, .035, .008, C('#e4b85e'),
      { tag:'厨房', hard:true, mode:1, glow:.16 }), .35);
    capsule(rdx + .12, 1.43, rdz, .007, .34, .007, col.steel,
      { tag:'厨房', rz:-.26, gloss:G.metal });
    solid(mx0 - 1.45, mx0 + 1.45, cz - .38, cz + .38);
    solid(mx0 - 1.20, mx0 + 1.35, RANGEZ - .30, RZ);
    thing('厨房', mx0, 1.60, cz - .42, '厨房就在后面，一直有声音。',
      'The kitchen is right at the back — you can always hear it.',
      'The same 厨房 as at home. Here it is open and half a metre away.',
      { focus: [mx0, cz - 1.30], reach: 2.0 });

    // ---- 点菜 the order station at the far end of the pass, which is where you actually stop
    // and say what you want. A short counter, a till, a jar of chopsticks and a bell.
    // It butts up against the end of the pass rather than overlapping it. At x 2.70 the wooden
    // carcass ran 21 cm into the tiled counter, which from the door read as one counter with a
    // brown patch in it.
    const OSX = 2.92;                       // pass ends at mx0 + 1.425 = 2.475
    box(OSX, .48, cz + .06, .90, .96, .62, col.woodD, { tag: '服务员', gloss: G.wood });
    box(OSX, .98, cz + .06, .96, .06, .70, col.woodL, { tag: '服务员', gloss: G.wood });
    box(OSX, .10, cz - .27, .86, .20, .04, col.charcoal, { tag: '服务员', hard: true, gloss: .22 });
    // The till is dark. In white it sat directly in front of the server's cream apron and the
    // two of them merged into one pale mass with a head above it.
    box(OSX + .18, 1.14, cz + .12, .34, .26, .30, col.charcoal, { tag: '服务员', gloss: .30 });
    box(OSX + .18, 1.20, cz - .04, .30, .13, .02, col.steelD,
      { tag: '服务员', hard: true, gloss: .34 });
    litten(box(OSX + .18, 1.20, cz - .05, .24, .09, .01, C('#8fe0b0'),
      { tag: '服务员', hard: true, mode: 1, glow: .28 }), .6);
    cyl(OSX - .26, 1.09, cz + .02, .055, .16, col.steel, { tag: '服务员', gloss: G.metal });
    for (let i = 0; i < 6; i++)
      capsule(OSX - .26 + (i - 2.5) * .014, 1.24, cz + .02, .007, .22, .007, col.woodL,
        { tag: '服务员', gloss: .18, rz: (i - 2.5) * .04 });
    // The service bell: a base, a dome and a plunger. One gold sphere on a counter is a lemon.
    cyl(OSX - .08, 1.025, cz - .17, .062, .020, col.steelD, { tag: '服务员', gloss: G.metal });
    ball(OSX - .08, 1.035, cz - .17, .055, .050, .055, col.gold,
      { tag: '服务员', gloss: .62 });
    capsule(OSX - .08, 1.095, cz - .17, .014, .045, .014, col.steelD,
      { tag: '服务员', gloss: G.metal });
    thing('服务铃', OSX - .08, 1.18, cz - .17,
      '按一下铃，服务员就知道了。', 'Ring once and the waitress will know.',
      '服务 means service; 铃 is a bell. A small sound with a very clear job.',
      { focus:[OSX - .08, cz - .80], reach:1.45 });
    // a laminated 扫码点菜 note taped to the front of the counter
    box(OSX - .24, .72, cz - .26, .24, .17, .01, col.cream,
      { tag: '服务员', hard: true, gloss: .20 });
    glyphs(OSX - .24, .74, cz - .265, Math.PI, '扫码',
      { size: .062, gap: .012, color: col.redD, tag: '服务员' });
    solid(OSX - .52, OSX + .52, cz - .32, cz + .40);

    // ---- 牛肉面 a bowl of beef noodles on the pass, ready to be picked up. This is what you
    // came in for, and it is a whole prop rather than a decal because you are about to eat it.
    const bx = mx0 - .95, by = 1.10, bz = cz - .18;
    cyl(bx, by + .08, bz, .17, .16, col.white, { tag: '牛肉面', gloss: .30 });
    cyl(bx, by + .16, bz, .155, .02, col.broth, { tag: '牛肉面', mode: 1, gloss: .44 });
    for (let i = 0; i < 7; i++)
      capsule(bx + (rnd() - .5) * .18, by + .17, bz + (rnd() - .5) * .18, .007, .16, .007,
        col.noodle, { tag: '牛肉面', rz: Math.PI / 2, ry: rnd() * 3, gloss: .20 });
    for (let i = 0; i < 4; i++)
      box(bx - .06 + (i % 2) * .09, by + .18, bz - .05 + ((i / 2) | 0) * .08, .07, .02, .05,
        col.meat, { tag: '牛肉面', hard: true, gloss: .28, ry: rnd() });
    for (let i = 0; i < 5; i++)
      cyl(bx + (rnd() - .5) * .20, by + .185, bz + (rnd() - .5) * .20, .012, .01,
        col.scallion, { tag: '牛肉面', mode: 1 });
    for (let i = 0; i < 3; i++)
      steamRigs.push(ball(bx, by + .24 + i * .07, bz, .05, .05, .05, C('#eef3f6'),
        { mode: 1, alpha: 0 }));
    thing('牛肉面', bx, by + .42, bz - .10, '来一碗牛肉面。', 'One bowl of beef noodles, please.',
      '牛 cow + 肉 meat + 面 noodles. 来一碗 is how you order it.',
      { focus: [bx, bz - 1.10], reach: 1.8 });

    // ---- 茶 a jug of tea and a stack of cups on a side table by the door, help yourself
    // An open frame: a top, an apron, four legs and an under-shelf with the spares on it. It
    // had a 60 cm cube of dark wood between the legs as well, which swallowed the frame whole
    // and left a brown block with four steel pins sticking out of the corners.
    const tx = 3.20, tz = -1.40;
    box(tx, .82, tz, .76, .05, .76, col.woodL, { gloss: G.wood });
    box(tx, .765, tz, .68, .055, .68, col.woodD, { hard: true, gloss: G.wood });
    for (const [ox, oz] of [[-.32, -.32], [.32, -.32], [-.32, .32], [.32, .32]])
      capsule(tx + ox, .41, tz + oz, .026, .82, .026, col.steelD, { gloss: G.metal });
    box(tx, .30, tz, .66, .035, .66, col.woodD, { hard: true, gloss: G.wood });
    box(tx + .15, .40, tz - .17, .30, .17, .26, col.red, { hard: true, gloss: .24, ry: .14 });
    cyl(tx - .19, .42, tz + .15, .13, .22, col.blue, { gloss: .28 });
    // The urn: a steel body with a warm window in it and a tap, rather than a yellow drum.
    cyl(tx - .12, 1.04, tz, .14, .38, col.steel, { tag: '茶', gloss: G.metal });
    litten(box(tx - .26, 1.02, tz, .03, .22, .10, col.amber,
      { tag: '茶', hard: true, mode: 1, glow: .14 }), .5);
    cyl(tx - .12, 1.25, tz, .145, .04, col.steelD, { tag: '茶', gloss: G.metal });
    capsule(tx - .28, .90, tz, .020, .10, .020, col.charcoal,
      { tag: '茶', rz: Math.PI / 2, gloss: .40 });
    for (let i = 0; i < 3; i++)
      steamRigs.push(ball(tx - .12, 1.28 + i * .055, tz, .035, .035, .035,
        C('#eef3f6'), { mode:1, alpha:0 }));
    // two stacks of cups, upside down the way they are left to drain
    for (const oz of [-.20, .16])
      for (let i = 0; i < 4; i++)
        cyl(tx + .20, .87 + i * .058, tz + oz, .046, .055, col.white,
          { tag: '茶', gloss: .30 });
    solid(tx - .42, RX, tz - .42, tz + .42);
    thing('茶', tx - .10, 1.32, tz - .16, '茶是免费的，自己倒。',
      'The tea is free — pour it yourself.',
      'Hot water and tea on the side is standard. 免费 means free.',
      { focus: [tx - .95, tz], reach: 1.8 });

    // ================================================================ the rest of the room
    // A fan on the wall, a wall clock, a lucky cat by the till, a red banner, and the tank of
    // drinking water on its stand — none of them load-bearing, all of them the difference
    // between a room and a restaurant.
    // 电风扇 an oscillating fan bracketed to the tiled wall. This was a white cube with three
    // grey slabs spun about z — and for a fan whose axis points along +x, spinning the blades
    // about z swings them out through the wall behind it rather than round the hub.
    const wfx = -RX + .14, wfy = 2.16, wfz = -.40;
    box(wfx - .04, wfy, wfz, .10, .17, .17, col.cream, { hard: true, gloss: .26 });
    cyl(wfx + .08, wfy, wfz, .085, .18, col.white, { rz: Math.PI / 2, gloss: .28 });
    cyl(wfx + .19, wfy, wfz, .055, .06, col.cream, { rz: Math.PI / 2, gloss: .30 });
    for (let i = 0; i < 3; i++) {
      const p = box(wfx + .22, wfy, wfz, .04, .38, .11, col.cream,
        { hard: true, gloss: .30, rx: i * 2.09, rz: .16 });
      fanBlades.push({ p, x:wfx + .22, y:wfy, z:wfz, phase:i * 2.09 });
    }
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      box(wfx + .26, wfy + Math.cos(a) * .21, wfz + Math.sin(a) * .21,
        .014, .086, .014, col.steel, { hard: true, gloss: G.metal, rx: a + Math.PI / 2 });
    }
    for (let i = 0; i < 5; i++)
      box(wfx + .255, wfy, wfz, .012, .42, .012, col.steel,
        { hard: true, gloss: G.metal, rx: i * Math.PI / 5 });
    // 钟 the wall clock. A downloaded model now, with the primitives it replaces kept below as
    // the fallback — `model` hands back null if the asset did not load, and a clock that failed
    // to download should become the old cylinder-and-two-hands again rather than a bare wall.
    // This is the pattern for every conversion: the model is an improvement layered over
    // something that already worked, never a replacement that can fail to nothing.
    //
    // The asset is a flat disc in its own XY plane, so its face points along ±z and it needs a
    // quarter turn to look into the room off the -x wall. `anchor:'mid'` because it hangs: its
    // origin is its centre, not its foot, and standing it on 1.98 would bury half of it.
    // Turned -90°, not +90°: this asset's face is on its own -z, so the intuitive quarter turn
    // hangs it backwards and you get a grey disc — which is exactly what the first attempt did.
    // There is no convention to rely on here; the only way to know is to hang one and look.
    if (!model('wall_clock', -RX + .10, 1.98, 1.70, 1.0,
               { ry: -Math.PI / 2, anchor: 'mid', gloss: .30 })) {
      cyl(-RX + .12, 1.98, 1.70, .17, .06, col.white, { rz: Math.PI / 2, gloss: .30 });
      cyl(-RX + .16, 1.98, 1.70, .145, .02, col.cream, { rz: Math.PI / 2, mode: 1 });
      box(-RX + .175, 1.98 + Math.cos(-.6) * .042, 1.70 + Math.sin(-.6) * .042,
        .012, .098, .016, col.charcoal, { hard: true, rx: -.6, gloss: .30 });
      box(-RX + .178, 1.98 + Math.cos(1.75) * .058, 1.70 + Math.sin(1.75) * .058,
        .010, .134, .012, col.charcoal, { hard: true, rx: 1.75, gloss: .30 });
    }
    // The 恭喜发财 banner has moved to the +x wall above the order station: over the pass it
    // occupied exactly the volume the extract duct now runs through.
    box(RX - .05, 2.34, 1.70, .04, .28, 1.70, col.red, { hard: true, gloss: .18 });
    glyphs(RX - .09, 2.34, 1.70, -Math.PI / 2, '恭喜发财',
      { size: .19, gap: .12, color: col.goldL, mode: 1 });
    // 饮水机 the water cooler by the door. The bottle goes on upside down and narrows to a neck
    // in the collar — a plain translucent cylinder standing on the cabinet read as a pane of
    // blue glass balanced on a filing cabinet.
    const wcx = 3.30, wcz = .95;
    box(wcx, .46, wcz, .40, .92, .40, col.white, { gloss: .30 });
    box(wcx, .04, wcz, .42, .08, .42, col.steelD, { hard: true, gloss: .28 });
    cyl(wcx, .95, wcz, .158, .06, col.steelD, { gloss: G.metal });
    // Lit and nearly opaque. Unlit at alpha .62 the bottle took no shading at all, so against a
    // white tiled wall it disappeared and left a pale wedge hanging over the cabinet.
    cyl(wcx, 1.01, wcz, .046, .09, C('#8ec6dc'), { alpha: .90, gloss: G.glass });
    taper(wcx, 1.115, wcz, .30, .13, .30, C('#9ed2e6'),
      { alpha: .88, gloss: G.glass, rx: Math.PI });
    cyl(wcx, 1.35, wcz, .15, .34, C('#9ed2e6'), { alpha: .88, gloss: G.glass });
    cyl(wcx, 1.525, wcz, .146, .02, C('#7fb6cd'), { alpha: .92, gloss: G.glass });
    // the two taps, the drip tray and the little red/blue lamps above them
    for (const [ox, c] of [[-.07, col.blue], [.07, col.red]]) {
      box(wcx + ox, .80, wcz - .21, .07, .09, .05, col.steelD, { hard: true, gloss: G.metal });
      capsule(wcx + ox, .74, wcz - .23, .014, .07, .014, col.steelD, { gloss: G.metal });
      litten(box(wcx + ox, .87, wcz - .205, .045, .022, .01, c,
        { hard: true, mode: 1, glow: .22 }), .5);
    }
    box(wcx, .655, wcz - .20, .26, .015, .10, col.steel, { hard: true, gloss: G.metal });
    // a paper cup dispenser on the side of it
    cyl(wcx + .23, .82, wcz + .04, .038, .30, col.cream, { rz: .04, gloss: .22 });
    solid(3.06, RX, .70, 1.20);

    // 鱼缸 — the dark entrance corner now has a living focal point. It is narrow enough not to
    // steal the aisle, brightly top-lit, and the fish and bubbles keep moving when the room is
    // otherwise between customers. The cabinet also hides the practical pump and filter box.
    const aqx = -RX + .25, aqz = -2.18;
    box(aqx, .39, aqz, .48, .78, 1.50, col.woodD, { hard:true, gloss:G.wood });
    box(aqx + .25, .39, aqz, .035, .62, 1.28, col.wood,
      { hard:true, gloss:G.wood });
    box(aqx, .82, aqz, .52, .10, 1.54, col.black, { hard:true, gloss:.36 });
    // gravel, plants and a small filter sit behind the glass
    box(aqx + .03, .91, aqz, .33, .08, 1.36, C('#806e58'), { hard:true, gloss:.18 });
    for (let i = 0; i < 18; i++)
      ball(aqx + .17, .96 + (i % 3) * .012, aqz - .58 + i * .069,
        .025 + (i % 4) * .004, .018, .025, C(i % 3 ? '#b8aa8e' : '#65756d'),
        { gloss:.20 });
    for (const oz of [-.46, .38]) {
      for (let i = 0; i < 5; i++)
        capsule(aqx + .16, 1.08 + i * .07, aqz + oz + Math.sin(i) * .035,
          .014, .24 + i * .025, .014, C(i % 2 ? '#4e8467' : '#6a9a73'),
          { rz:(i - 2) * .13, gloss:.16 });
    }
    box(aqx + .02, 1.81, aqz, .52, .10, 1.54, col.black, { hard:true, gloss:.42 });
    litten(box(aqx + .24, 1.75, aqz, .025, .06, 1.28, C('#b9eaff'),
      { hard:true, mode:1, glow:.30 }), .55);
    // Five different fish, each with a body and a tapered tail. Their path is computed in tick;
    // keeping each one inside the same shallow x plane makes it readable through the front pane.
    const fishColors = ['#e7a23d','#cf5c42','#f1cf62','#66a5b9','#d985ac'];
    for (let i = 0; i < fishColors.length; i++) {
      const y = 1.16 + (i % 3) * .18, z = aqz - .45 + i * .22;
      const body = ball(aqx + .21, y, z, .055, .045, .13, C(fishColors[i]),
        { mode:1, gloss:.42 });
      const tail = taper(aqx + .21, y, z - .15, .10, .12, .10, C(fishColors[i]),
        { mode:1, gloss:.34, rx:Math.PI / 2 });
      fishProps.push({ body, tail, x:aqx + .21, y, center:z, phase:i * 1.37,
        speed:.52 + i * .055, range:.28 + (i % 2) * .10 });
    }
    for (let i = 0; i < 11; i++) {
      const p = ball(aqx + .20, 1.02 + (i % 5) * .12, aqz - .50 + (i % 3) * .46,
        .012 + (i % 3) * .004, .012 + (i % 3) * .004, .012 + (i % 3) * .004,
        C('#d8f4ff'), { mode:1, alpha:.48, glow:.08 });
      bubbleProps.push({ p, x:aqx + .20, baseY:1.00, z:aqz - .50 + (i % 3) * .46,
        phase:i / 11 });
    }
    // Water and the front pane are last so the fish remain visible through them.
    box(aqx + .05, 1.32, aqz, .34, .92, 1.40, C('#6eb4c5'),
      { hard:true, mode:1, alpha:.13, gloss:.22 });
    box(aqx + .235, 1.32, aqz, .025, .96, 1.44, col.glass,
      { hard:true, mode:1, alpha:.30, gloss:G.glass });
    for (const oz of [-.73, .73])
      box(aqx + .24, 1.32, aqz + oz, .05, 1.02, .045, col.black,
        { hard:true, gloss:.40 });
    solid(-RX, -RX + .53, aqz - .78, aqz + .78);
    thing('鱼缸', aqx + .30, 1.42, aqz,
      '鱼在水里慢慢游。', 'The fish drift slowly through the water.',
      '鱼 is fish; 缸 is a tank or large jar. Together: aquarium.',
      { focus:[-RX + .82, aqz], reach:1.45 });

    // A proper entrance mat softens the threshold and catches the bright red shop colour again.
    flat(DX, .009, -RZ + .56, 1.02, .60, col.redD, { mode:7, gloss:.04 });
    flat(DX, .012, -RZ + .56, .82, .40, col.red, { mode:7, gloss:.04 });

    // grout lines on the floor
    for (let i = -3; i <= 3; i++)
      flat(i * 1.10, .004, 0, .03, RZ * 2, col.grout, { gloss: .10 });
    for (let i = -2; i <= 2; i++)
      flat(0, .004, i * 1.20, RX * 2, .03, col.grout, { gloss: .10 });
  }

  build();

  // Props are drawn in the order they were built and a see-through one still writes depth, so
  // anything translucent has to come after whatever stands behind it. The steam is created up
  // in the kitchen and the noodle bowl for readability; left where it was built, every puff
  // that drifted across the order station or the tea table cut a round hole in them.
  for (const p of steamRigs) {
    const i = B.props.indexOf(p);
    if (i >= 0) { B.props.splice(i, 1); B.props.push(p); }
  }

  // ---------------------------------------------------------------- 上菜 serving
  // What is on your table, given what you ordered — the whole point of ordering being a separate
  // step from eating. `null` clears it away.
  //
  // Every prop keeps the matrix it was built with and is parked far below the world when it is
  // not wanted. `cy` goes with it so the frustum test drops it as well and a cleared table costs
  // nothing to draw.
  const HIDDEN = M.trs(0, -60, 0, 0, .001, .001, .001);
  for (const p of [...servedBowl, ...servedNoodle, ...servedPlate, ...servedBottle])
    p.m0 = p.m;
  // `null`, not '': the cleared state is '' and starting there would make the first call a
  // no-op, leaving a bowl of noodles on the table from the moment the room was built.
  let servedNow = null;
  function setServed(hz) {
    const key = hz || '';
    if (key === servedNow) return;
    servedNow = key;
    const d = DISHES.find(q => q.hz === key);
    const kind = d ? d.kind : '';
    for (const [group, on] of [[servedBowl, kind === 'noodle' || kind === 'rice' || kind === 'soup'],
                               [servedNoodle, kind === 'noodle'],
                               [servedPlate, kind === 'plate'],
                               [servedBottle, kind === 'bottle']])
      for (const p of group) {
        p.m = on ? p.m0 : HIDDEN;
        p.cx = on ? p.m0[12] : 0;
        p.cy = on ? p.m0[13] : -60;
        p.cz = on ? p.m0[14] : 0;
      }
    // Whatever it is takes its own colour: the broth in the bowl, the heap on the plate, or the
    // glass and the bottle it came out of.
    if (!d) return;
    const tint2 = C(d.fill);
    if (kind === 'plate') servedPlate[1].color = tint2;
    else if (kind === 'bottle') {
      servedBottle[0].color = tint2; servedBottle[1].color = tint2;
      servedBottle[4].color = C(d.pour || d.fill);
    } else servedBowl[1].color = tint2;
  }
  // The waitress's round, from the pass to your table. She cannot walk through the counter, and
  // the only gap in it is past the +x end of the order station, so the route goes: pick the food
  // up in the aisle behind the pass, out through that gap, down the near side of the room clear
  // of the water cooler, and up to the table. She comes back the same way.
  const SERVE_ROUTE = [[2.00, 2.42], [3.58, 2.28], [3.58, 1.30], [.95, 1.10]];
  // Where she ends up: beside your table, on the opposite side from the stool you sit on.
  const SERVE_FACE = Math.atan2(.70 - .95, .55 - 1.10);
  // The stool you eat from, and how high its seat is.
  const SEAT_AT = [.33, -.168], SEAT_FACE = Math.atan2(.70 - .33, .55 + .168), SEAT_Y = .47;

  // The pendants and the gas rings lift a little once it is dark outside, and the steam runs
  // all the time — a noodle shop is never not steaming.
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    nightK = soft;
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .26;
  }
  // Called from the loop so the plumes actually rise. Each puff climbs, spreads and fades on
  // its own offset of the same loop.
  function tick(t) {
    lastTick = t;
    // The wall fan and the burner flames supply small constant motion at opposite ends of the
    // room. A tiny irregular fluorescent flutter keeps the ceiling from reading as a lightbox.
    fanBlades.forEach(f => {
      const a = t * 5.8 + f.phase;
      f.p.m = M.mul(M.trans(f.x, f.y, f.z),
        M.mul(M.rotX(a), M.mul(M.rotZ(.16), M.scale(.04, .38, .11))));
      f.p.cx = f.x; f.p.cy = f.y; f.p.cz = f.z;
    });
    flameProps.forEach(({ p, phase }) => {
      const pulse = .72 + Math.sin(t * 11.5 + phase) * .18 + Math.sin(t * 4.2 + phase) * .07;
      p.alpha = pulse;
      p.glow = .36 + pulse * .20;
    });
    const flutter = Math.sin(t * 6.7) * .006 + Math.sin(t * 13.1 + 1.4) * .003;
    for (const { p, k: kk } of litProps) {
      const base = p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0;
      p.glow = base + nightK * kk * .26 + flutter * kk;
    }
    fishProps.forEach((f, i) => {
      const a = t * f.speed + f.phase;
      const z = f.center + Math.sin(a) * f.range;
      const dir = Math.cos(a) >= 0 ? 1 : -1;
      const y = f.y + Math.sin(a * 1.7 + i) * .025;
      f.body.m = M.trs(f.x, y, z, 0, .11, .09, .26);
      f.body.cx = f.x; f.body.cy = y; f.body.cz = z;
      f.tail.m = M.mul(M.trans(f.x, y, z - dir * .16),
        M.mul(M.rotX(dir * Math.PI / 2 + Math.sin(a * 4.0) * .12), M.scale(.10, .12, .10)));
      f.tail.cx = f.x; f.tail.cy = y; f.tail.cz = z - dir * .16;
    });
    bubbleProps.forEach((b, i) => {
      const u = (t * .13 + b.phase) % 1;
      const s = .018 + u * .014;
      const x = b.x + Math.sin(u * 7 + i) * .018;
      const y = b.baseY + u * .68;
      b.p.m = M.trs(x, y, b.z, 0, s, s, s);
      b.p.cx = x; b.p.cy = y; b.p.cz = b.z;
      b.p.alpha = Math.sin(u * Math.PI) * .55;
    });
    const doorAge = t - doorPulseAt;
    const doorKick = doorAge >= 0 && doorAge < 2.1
      ? Math.sin(doorAge * Math.PI / 2.1) * Math.exp(-doorAge * .42) : 0;
    doorStrips.forEach((s, i) => {
      const angle = s.base + doorKick * (.20 + (i % 3) * .045) * Math.sin(doorAge * 8 + s.phase);
      s.p.m = M.mul(M.trans(s.x, s.y, s.z), M.mul(M.rotY(angle), M.scale(.13, 1.74, .02)));
      s.p.cx = s.x; s.p.cy = s.y; s.p.cz = s.z;
    });
    steamRigs.forEach((p, i) => {
      const u = (t * .30 + i / steamRigs.length) % 1;
      const s = .05 + u * .16;
      const b = p.ob;
      p.m = M.trs(b.x + Math.sin(u * 5.5 + i * 2.1) * .05 * u, b.y + u * .46,
        b.z + Math.cos(u * 4.7 + i * 1.7) * .05 * u, 0, s, s * .85, s);
      p.cy = b.y + u * .46;
      p.alpha = Math.sin(u * Math.PI) * .30;
    });
  }

  function doorPass() { doorPulseAt = lastTick; }

  const api = B.finish({
    setNight, tick, doorPass, setServed, MENU, DISHES,
    SERVE_ROUTE, SERVE_FACE, SEAT_AT, SEAT_FACE, SEAT_Y,
    ENTRY_OUT:[DX, -RZ - .42], ENTRY_DOOR:[DX, -RZ + .28], ENTRY_AISLE:[3.28, -1.35],
    RX, RZ, H, WIN, OUT,
    label: '餐馆', labelK: '餐馆 · restaurant',
    indoor: true, cutaway: true, near: .05, far: 40, expose: 1,
    spawn: { x: DX - .40, z: -RZ + 1.00, yaw: Math.PI * .10 },
    zones: [{ id: 'diner', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .40, .20] }],
    roomAt() { return this.zones[0]; },
  });
  // Clear the table, after `finish` and not before it: finish derives each prop's centre and
  // bounding radius from the matrix it finds, and a prop parked below the world at a thousandth
  // of its size would be sealed at that size for good and then culled the moment it came back.
  setServed(null);
  return api;
});
