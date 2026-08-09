// 主卧 — the master bedroom — owns World.rail
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract; build to those numbers rather than measuring off a neighbouring room,
// because the neighbour is being written at the same time as this file.
//
// ---------------------------------------------------------------- the room
//
//   x -6.00 .. -2.60      z -1.40 .. 3.20      floor y 0, ceiling 2.60
//
// Only one of the four walls faces outside. x = -6.00 is the flat's west elevation and is the
// only place a window can go; z = 3.20 backs onto the public 走廊, z = -1.40 onto the 次卧, and
// x = -2.60 onto the flat's internal hall, which is where the door is. So the layout has exactly
// one degree of freedom and it is spent the way a Beijing flat spends it: the wardrobe goes flat
// against the corridor wall (it is also the sound buffer), the bed's head goes against the party
// wall with the second bedroom, and the outside wall is left for daylight.
//
//   床        x -5.45 .. -3.79   z -1.31 .. 0.75    mattress top 0.60
//   床头柜 W  x -5.94 .. -5.50   z -1.36 .. -0.96   top 0.58
//   床头柜 E  x -3.77 .. -3.33   z -1.36 .. -0.96   top 0.58
//   衣柜      x -5.96 .. -3.60   z  2.62 .. 3.18    H 2.30, doors forward to z 2.52
//   镜子      x -2.76 .. -2.66   z  1.00 .. 1.60    leaning on the hall wall
//   空调      x -2.98 .. -2.62   z -0.16 .. 0.76    y 2.11 .. 2.41
//   篮子      x -3.17 .. -2.75   z -1.29 .. -0.87
//   照片墙    x -5.55 .. -3.34   y  1.59 .. 2.27    hung on z = -1.40
//   窗帘      x -5.94 .. -5.78   z  0.05 .. 2.05
//   地毯      x -3.89 .. -3.11   z -0.95 .. 0.25
//
// Two rectangles are deliberately left empty for other people:
//
//   the door    x = -2.60,  z 1.95 .. 2.87,  up to 2.05      — built by the hall, not by here
//   the window  x = -6.00,  z 0.20 .. 1.90,  y 0.95 .. 2.05  — cut by the shell, if it cuts one
//
// Nothing in this file stands in either. The curtains are hung to suit the second one and read
// as curtains whether or not the opening ever appears behind them.
//
// ---------------------------------------------------------------- the rail, which is the point
//
// `World.rail` is the clothes rail the outfit system indexes into. js/game.js reads it in three
// places — `wearFromRail(i)` takes `World.rail[i]`, the carried-shirt pose reads
// `World.rail[flat.outfit % World.rail.length]`, and 换衣服 advances `flat.outfit` — so the shape
// of a slot is a contract, not a convention:
//
//   { hex: '#rrggbb', color: <C() triple>, props: [ every prop of that garment ] }
//
// Changing clothes swaps `slot.color` with the shirt you are wearing and then writes the old
// colour onto every prop in `props`. Two consequences, both learned in the old flat and both
// still true here: every prop in one slot must be the same colour to start with, or a white cuff
// comes out shirt-red the first time you change; and the wire hanger is not part of the slot,
// because a steel hanger that turns purple is worse than no hanger at all.
//
// The five slots below are the same five hexes, in the same order and the same cuts, as the flat
// this room replaces. `flat.outfit` is an index in old save files and keeping the order stable
// means a saved game comes back wearing what it was wearing.
FlatFit['bedroom'] = function bedroom(A) {
  // The toolkit takes absolute world y while this room is authored from its own floor. Wrap every
  // y-bearing primitive at the boundary so the room builds on A.y0 instead of inside the lobby.
  // world.js keeps a rescue lift for legacy builders, but a room that uses the documented contract
  // should never need it (and no longer emits the warning on every boot).
  const Y0 = (A && typeof A.y0 === 'number') ? A.y0 : 3.10;
  const box = (x,y,z,sx,sy,sz,c,o) => A.box(x,y+Y0,z,sx,sy,sz,c,o);
  const cyl = (x,y,z,r,h,c,o) => A.cyl(x,y+Y0,z,r,h,c,o);
  const ball = (x,y,z,rx,ry,rz,c,o) => A.ball(x,y+Y0,z,rx,ry,rz,c,o);
  const taper = (x,y,z,sx,sy,sz,c,o) => A.taper(x,y+Y0,z,sx,sy,sz,c,o);
  const capFn = A.cap || A.capsule;
  const cap = (x,y,z,sx,sy,sz,c,o) => capFn(x,y+Y0,z,sx,sy,sz,c,o);
  const wall = (x,y,z,w,h,yaw,c,o) => A.wall(x,y+Y0,z,w,h,yaw,c,o);
  const flat = (x,y,z,w,d,c,o) => A.flat(x,y+Y0,z,w,d,c,o);
  const glyphFn = A.glyph || A.glyphs;
  const glyph = (x,y,z,yaw,t,o) => glyphFn(x,y+Y0,z,yaw,t,o);
  const stop = A.stop || A.solid;
  const thFn = A.th || A.thing;
  const th = (hz,x,y,z,zh,en,n,o) => thFn(hz,x,y+Y0,z,zh,en,n,o);
  const sha = A.shade;
  const light = (x,y,z,c,p,r) => A.light(x,y+Y0,z,c,p,r);

  // ---- the rail. `A.rail` is expected to be the live array `World.rail` hands out; if the shell
  // has not wired it yet we make one and publish it both ways, so nothing here depends on which
  // side of the handover lands first. See the note at the top of this file for the slot shape.
  const rail = Array.isArray(A.rail) ? A.rail : [];
  if (!Array.isArray(A.rail)) { try { A.rail = rail; } catch (_) { /* frozen toolkit: fine */ } }
  FlatFit['bedroom'].rail = rail;

  // ---------------------------------------------------------------- palette
  //
  // A new-build 主卧 in Beijing is not the ochre-and-jade of the old rented room. It is warm
  // grey-blue bedding, pale oak joinery and one red accent, because there is always one red
  // accent. Colours are made here rather than borrowed from world.js: `C` returns a fresh triple
  // every call, so `Build.scene`'s wood set cannot recognise these and `mode:6` has to be asked
  // for by hand on every timber prop. Anything that looks like flat brown plastic in a render is
  // a `mode:6` that was left off.
  const oak     = C('#b08f61'), oakD  = C('#7d5f3c'), oakL = C('#c8a877');
  const walnut  = C('#5a4433');
  const linen   = C('#bbb29f'), cream = C('#c4bfb2'), white = C('#c8c7c1');
  const quiltC  = C('#6f8a9b'), quiltL = C('#8ba4b2');
  const rose    = C('#a1503f'), red   = C('#a43c2c');
  const steel   = C('#aeb5bb'), brass = C('#c2963f'), dark  = C('#2a2e33');
  const rugA    = C('#7d5a52'), rugB  = C('#98705f');
  const wicker  = C('#b39a72'), wickerD = C('#967d58');
  const applianceW = C('#c8c7c1'), applianceG = C('#c8c7c1');
  const mirrorC = C('#bbcad0');
  const G = { matte:.05, wood:.20, paint:.14, fabric:.03, metal:.62 };

  // ---------------------------------------------------------------- the material kit
  //
  // The eleven tiling materials in js/assets.js are read triplanar in world space, so none of the
  // primitives below need UVs — a prop only has to name a material and say how big one repeat is.
  // `matScale` is METRES PER REPEAT, not per feature.
  //
  // The three numbers are not ART.md's table verbatim, and the reasons are worth keeping:
  //
  //   `matAmt` is detail, not lift. js/world.js records the measurement: these colour maps average
  //   well above mid grey, so wood lifts the surface it is on about 1.7x and plaster about 2.3x
  //   until the shader's divisor is fixed. That is why nothing here goes above .30, and why the
  //   two near-white surfaces in this room — the sheer, and the linen — get their own lower value
  //   instead of the shared one. A surface that comes out brighter rather than woven has too much.
  //
  //   `nrmAmt` on fabric is the channel that does the work, because the fabric colour map is
  //   nearly flat; but at full strength a large panel picks up relief that the AO pass then turns
  //   into cloud, which is indistinguishable from a renderer artifact. .30 is the value the 次卧
  //   next door settled on and these two rooms are seen through one doorway, so they match.
  //
  //   Scales are the flat's house scale rather than this file's invention: js/world.js's MAT.timber
  //   is .90 and its MAT.cloth .55, and js/home-second.js's joinery is .95 and its bedding .50.
  //   Matching them matters more here than hitting a starting point, because the wardrobe in this
  //   room and the bookcase in that one appear in the same frame and a scale mismatch between two
  //   pieces of the same oak reads as an error in a way that a slightly wrong scale does not.
  // Carcass and upholstery come from FLAT_PALETTE (js/home-walls.js). The paragraph above is right
  // that a scale mismatch between two pieces of the same oak reads as an error — it just stopped at
  // the doorway. The wardrobe in here and the bookcase in the 次卧 DO appear in one frame from the
  // hall, and before this the flat owned six different carcass timbers.
  const TIMBER  = { ...FLAT_PALETTE.timber };
  const CLOTH   = { ...FLAT_PALETTE.cloth };
  // Bedding sits under the room's only two lights and is the largest pale area in the frame, so it
  // takes the same weave at a lower amount: on linen and on white cotton, .28 lifts before it
  // textures. The quilt keeps the full amount because grey-blue has the headroom for it.
  const LINEN   = { mat:'fabric', matScale:.50, matAmt:.20, nrmAmt:.34 };
  // A 纱帘 is finer-woven than a curtain and nearly white. Lowest amount in the room by some way,
  // and it is the one surface where the normal map has to carry it alone.
  const SHEER   = { mat:'fabric', matScale:.34, matAmt:.14, nrmAmt:.24 };
  // Rug pile: the scale the outer border was already carrying, now on all three layers so the
  // border does not read as a different textile from the field it surrounds.
  const RUGM    = { mat:'fabric', matScale:.45, matAmt:.28, nrmAmt:.36 };
  // 藤 basketry is a weave, so the fabric map does the job the absence of a wicker material leaves;
  // finer than cloth because the object is 42 cm and one repeat across it would read as a smear.
  const BASKET  = { mat:'fabric', matScale:.30, matAmt:.26, nrmAmt:.38 };
  // Handles, the hanging rail, the head track and the curtain pole. Trimmed below ART.md's .26
  // because steel #aeb5bb and brass #c2963f are already pale and this map lifts as much as wood's.
  const FITTING = { ...FLAT_PALETTE.fitting };

  // ---------------------------------------------------------------- 床 the bed
  //
  // 1.5 x 2.0 m, which is what 双人床 means on a Chinese label. Head against the party wall with
  // the 次卧 so the sleeper's head is toward -z, which is what `pose.lie` with `yaw: 0` already
  // means in js/data.js — see the handover note in the report; the mattress top is held at
  // exactly 0.60 because `seatY: 0.60` in that file is hard-coded and a bed that is 4 cm taller
  // than the pose expects lays the player inside it.
  const bedX = -4.62, bedZ = -0.28;
  for (const [ox, oz] of [[-.72,-.90],[.72,-.90],[-.72,.90],[.72,.90]])
    taper(bedX + ox, .15, bedZ + oz, .10, .30, .10, walnut, { mode:6, ...TIMBER });
  box(bedX, .27, bedZ, 1.66, .34, 2.06, oak, { tag: '床', mode:6, gloss:G.wood, ...TIMBER });
  // Mattress, then the sheet over it. Two layers rather than one because the top 4 cm of a made
  // bed is a different, whiter, flatter thing than the mattress under it, and the join is the
  // only reason a bed reads as made rather than as a padded board.
  box(bedX, .46, bedZ, 1.58, .20, 1.98, linen, { tag: '床', mode:7, gloss:G.fabric, ...LINEN });
  box(bedX, .58, bedZ, 1.60, .04, 2.00, cream, { tag: '床', mode:7, gloss:G.fabric, ...LINEN });

  // Headboard: a timber board against the wall with a padded panel screwed to its face. The board
  // stops 2 cm short of z = -1.40 — flush would be two coplanar faces and a wall of flickering
  // stripes behind the pillows.
  box(bedX, .96, -1.34, 1.68, 1.06, .08, walnut,
      { tag: '床', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  box(bedX, .92, -1.28, 1.46, .82, .10, linen, { tag: '床', mode:7, gloss:G.fabric, ...LINEN });
  for (const s of [-1, 1])                                    // buttoned seams down the padding
    box(bedX + s * .36, .92, -1.235, .026, .74, .02, C('#cdc4b4'),
        { tag: '床', hard:true, mode:7, gloss:G.fabric });

  // ---- 被子 the quilt, pulled up but not straightened, with the cream underside turned back at
  // the top. Three soft ridges across it: without them the cover is one flat plane, which is
  // exactly what made the old bed read as a painted board.
  box(bedX, .655, .16, 1.64, .17, 1.06, quiltC, { tag: '被子', mode:7, gloss:G.fabric, ...CLOTH });
  box(bedX, .70, -.40, 1.62, .10, .20, cream, { tag: '被子', mode:7, gloss:G.fabric, ...LINEN });
  for (const rz of [-.10, .22, .52])
    cap(bedX, .745, rz, .055, 1.56, .055, quiltL,
        { rz:Math.PI/2, tag: '被子', mode:7, gloss:G.fabric, ...CLOTH });
  box(bedX, .52, .74, 1.60, .30, .12, quiltC, { tag: '被子', mode:7, gloss:G.fabric, ...CLOTH });

  // ---- 枕头 two pillows, and in front of them the two 抱枕 nobody ever knows what to do with.
  for (const s of [-1, 1])
    box(bedX + s * .36, .655, -1.05, .62, .15, .40, white,
        { ry:s * .05, tag: '枕头', mode:7, gloss:G.fabric, ...LINEN });
  for (const s of [-1, 1])
    box(bedX + s * .30, .66, -.72, .34, .16, .34, rose,
        { ry:s * .22, tag: '枕头', mode:7, gloss:G.fabric, ...CLOTH });

  sha(bedX, bedZ, 2.10, 2.44, .43);
  stop(-5.50, -3.74, -1.40, .80);
  th('床', bedX, 1.14, .10, '这张床比以前那张软多了。', 'This bed is much softer than the old one.',
     '一张床 — 张 zhāng is the measure word for flat things: beds, tables, tickets, paper.',
     { focus:[-3.42, -.35], reach:1.8 });
  th('枕头', bedX, .84, -1.05, '枕头是新的，还有点儿硬。', 'The pillows are new and still a bit firm.',
     'Two pillows on a double bed even when one person sleeps in it. That is how they are sold.',
     { focus:[-3.42, -.90], reach:1.7 });
  th('被子', bedX + .30, .84, .30, '被子是灰蓝色的，很厚。', 'The quilt is grey-blue, and thick.',
     '被子 is the quilt; 床 is the bed under it. 盖被子 gài bèizi is to pull it over yourself.',
     { focus:[-3.42, .30], reach:1.7 });

  // ---------------------------------------------------------------- 床头柜 the two bedside tables
  //
  // One each side, both tagged and both given their own `thing`, because `pick` sends you to the
  // nearest thing wearing the tag it hit: with one entry, clicking the far cabinet walks you
  // across the bed to the near one. Tops at 0.58, just under the mattress, which is where a
  // bedside table top actually sits.
  function nightstand(nsX, nsZ, facing) {
    box(nsX, .035, nsZ, .40, .07, .36, walnut, { tag: '床头柜', mode:6, ...TIMBER });
    box(nsX, .30, nsZ, .44, .46, .40, oak, { tag: '床头柜', mode:6, gloss:G.wood, ...TIMBER });
    box(nsX, .555, nsZ, .50, .05, .44, oakL, { tag: '床头柜', mode:6, gloss:G.wood, ...TIMBER });
    box(nsX, .44, nsZ + facing * .205, .36, .14, .03, walnut,
        { tag: '床头柜', hard:true, mode:6, gloss:G.wood, ...TIMBER });
    cap(nsX, .44, nsZ + facing * .235, .032, .11, .032, brass,
        { rz:Math.PI/2, tag: '床头柜', gloss:G.metal, ...FITTING });
    // An open cubby under the drawer. A cabinet with a drawer front and nothing else is a box
    // with a line drawn on it; the shadowed gap is what says there is an inside.
    box(nsX, .21, nsZ + facing * .16, .34, .20, .02, C('#2b2620'),
        { tag: '床头柜', hard:true, gloss:G.matte });
    sha(nsX, nsZ, .56, .52, .38);
  }
  const nsW = -5.72, nsE = -3.55, nsZ = -1.16;
  nightstand(nsW, nsZ, 1);
  nightstand(nsE, nsZ, 1);
  stop(-5.98, -5.46, -1.40, -.92);
  stop(-3.81, -3.29, -1.40, -.92);
  th('床头柜', nsE, .74, nsZ + .24, '床头柜上放着台灯和一杯水。',
     'There is a lamp and a glass of water on the bedside table.',
     '床 bed + 头 head + 柜 cabinet: the cupboard at the head of the bed.',
     { focus:[-3.20, -.60], reach:1.5 });
  th('床头柜', nsW, .74, nsZ + .24, '那边的床头柜上有一本书。',
     'There is a book on the other bedside table.',
     'Both sides get one, even in a flat where one person lives.',
     { focus:[-4.98, -.60], reach:1.7 });

  // ---- 台灯 the bedside lamp. Small bright face, low glow: the shade is a fair area of emissive
  // and anything much over .12 on it turns the corner of the room into a headlight. The real
  // light is `A.light` underneath; the two are complementary and both are wanted — the emissive
  // says the lamp is on, the light is what makes the wall next to it respond.
  const lampX = nsE + .13, lampZ = nsZ - .06;
  cyl(lampX, .60, lampZ, .058, .040, brass, { tag: '主卧台灯', gloss:G.metal, ...FITTING });
  cyl(lampX, .745, lampZ, .013, .29, brass, { tag: '主卧台灯', gloss:G.metal, ...FITTING });
  taper(lampX, .935, lampZ, .21, .17, .21, C('#efe4cd'),
        { tag: '主卧台灯', mode:1, glow:.11, gloss:.16 });
  ball(lampX, .875, lampZ, .030, .030, .030, C('#ffeecd'), { tag: '主卧台灯', mode:1, glow:.14 });
  const bedLamp = light(lampX, .92, lampZ, C('#ffd9a4'), .46, 2.0);
  FlatFit['bedroom'].lamp = bedLamp;              // so the shell can put it out with the hour
  // ---- 闹钟. The room had a lamp, a book and a glass of water on these two tops and nothing that
  // wakes anybody, which for a bedroom is the one absent object. It goes on the east table rather
  // than the west because that is the one a body can actually reach: the bed and the west table's
  // colliders between them deny every cell on that side once clampMove inflates by 0.30, so a
  // card over there could never be opened. Same focus as the lamp beside it, which is measured.
  //
  // A red seven-segment face rather than hands. A digital 闹钟 is what is on a Beijing bedside
  // table, and the glowing figures are also the one thing in a dark room that reads at 3 a.m.
  const clkX = -3.68, clkZ = -1.04;
  box(clkX, .636, clkZ, .150, .092, .105, C('#2a2e33'),
      { tag: '闹钟', hard:true, gloss:.32 });
  box(clkX - .046, .644, clkZ, .052, .058, .080, C('#171a1f'),
      { tag: '闹钟', hard:true, gloss:.46 });
  for (const dz of [-.020, .018])
    box(clkX - .050, .644, clkZ + dz, .006, .046, .022, C('#c8402c'),
        { tag: '闹钟', hard:true, mode:1, glow:.30 });
  for (const s of [-1, 1])
    cyl(clkX + s * .052, .690, clkZ, .030, .012, C('#8d94a0'),
        { rx:Math.PI/2, tag: '闹钟', gloss:G.metal, ...FITTING });
  th('闹钟', clkX, .80, clkZ, '闹钟定在六点半。', 'The alarm is set for half past six.',
     '闹 noisy + 钟 clock. 定闹钟 dìng nàozhōng is to set it; 关闹钟 is what you do to it twice.',
     { focus:[-3.20, -.55], reach:1.6 });

  th('台灯', lampX, 1.10, lampZ, '睡觉以前我开台灯看一会儿书。',
     'Before sleeping I read for a while by the lamp.',
     '台 a stand or platform + 灯 lamp. 开台灯 is to switch it on, 关台灯 to switch it off.',
     { focus:[-3.20, -.55], reach:1.5 });

  // ---- the small life on the two tops: a glass of water, a charger with nothing on the end of
  // it, and a paperback left face-down. The glass is built last of its cluster because it is the
  // only transparent thing in it — drawn before its neighbours it writes depth over them and they
  // vanish behind a pane of water.
  box(nsW, .615, nsZ + .04, .13, .035, .19, C('#7c3a30'),
      { tag: '主卧书', hard:true, mode:6, gloss:G.matte, ry:.09 });
  box(nsW, .636, nsZ + .04, .115, .010, .175, C('#cdc4b4'),
      { tag: '主卧书', hard:true, gloss:G.matte, ry:.09 });
  box(nsW - .01, .652, nsZ + .05, .095, .008, .155, C('#d3ccbc'),
      { tag: '主卧书', hard:true, gloss:G.matte, ry:.14 });
  th('书', nsW, .78, nsZ + .04, '这本书我还看不懂。', 'I still cannot read this book.',
     '一本书 — 本 běn is the measure word for anything bound.', { focus:[-4.98, -.62], reach:1.7 });

  box(nsE - .15, .605, nsZ - .07, .055, .040, .075, white,
      { tag: '床头柜', hard:true, gloss:.30 });
  cap(nsE - .15, .600, nsZ + .01, .012, .075, .012, white, { rx:Math.PI/2, tag: '床头柜' });
  cap(nsE - .10, .593, nsZ + .06, .011, .090, .011, white,
      { rz:Math.PI/2, ry:.5, tag: '床头柜' });
  cap(nsE - .03, .593, nsZ + .03, .011, .075, .011, white,
      { rz:Math.PI/2, ry:-.7, tag: '床头柜' });
  cyl(nsE - .17, .638, nsZ - .05, .038, .112, C('#b4c1c1'),
      { tag: '杯子', alpha:.40, gloss:.85 });
  cyl(nsE - .17, .614, nsZ - .05, .033, .060, C('#cfe6ef'),
      { tag: '杯子', alpha:.55, gloss:.85 });
  th('杯子', nsE - .17, .76, nsZ - .05, '晚上我在床头放一杯水。',
     'At night I keep a glass of water by the bed.',
     '一杯水 — 杯 is both the cup and its measure word.', { focus:[-3.20, -.50], reach:1.4 });

  // ---------------------------------------------------------------- 衣柜 the wardrobe
  //
  // 2.36 m of it, flat against the corridor wall, which is where a Chinese fitted wardrobe goes:
  // it is storage and it is the sound buffer between your bed and six neighbours' front doors.
  // Two sliding doors on two tracks, both pushed to the right — a two-door slider is never shut,
  // one bay is always open, and here the open bay is the hanging bay, so the rail and everything
  // on it is visible without any door needing to animate.
  const wX0 = -5.96, wX1 = -3.60, wZ0 = 2.62, wZ1 = 3.18;
  const wXc = (wX0 + wX1) / 2, wZc = (wZ0 + wZ1) / 2, wDepth = wZ1 - wZ0;
  const wTop = 2.30, divX = -5.02;

  box(wXc, .05, wZc, wX1 - wX0 - .02, .10, wDepth - .02, walnut,
      { tag: '主卧衣柜', mode:6, ...TIMBER });
  box(wXc, 1.20, wZ1 - .025, wX1 - wX0 - .02, 2.20, .05, walnut,
      { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  for (const sx of [wX0 + .035, wX1 - .035])
    box(sx, 1.20, wZc, .07, 2.20, wDepth, oak, { tag: '主卧衣柜', mode:6, gloss:G.wood, ...TIMBER });
  box(wXc, wTop - .035, wZc, wX1 - wX0, .07, wDepth, oak,
      { tag: '主卧衣柜', mode:6, gloss:G.wood, ...TIMBER });
  box(divX, 1.20, wZc, .05, 2.20, wDepth - .02, oak,
      { tag: '主卧衣柜', mode:6, gloss:G.wood, ...TIMBER });

  // The hanging bay: rail at 1.78, a shelf under the garments at 1.02 and another over them at
  // 1.90. Those two heights are the reason the garments below are cut the way they are — there
  // is 0.52 m of hanging space and no more, so a floor-length coat would go through the shelf.
  const railY = 1.78, railX = -5.47;
  cap(railX, railY, wZc, .028, .80, .028, steel,
      { rz:Math.PI/2, tag: '主卧衣柜', gloss:G.metal, ...FITTING });
  box(railX, 1.00, wZc, .82, .04, wDepth - .06, oakL,
      { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  box(railX, 1.92, wZc, .82, .04, wDepth - .06, oakL,
      { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  // Folded things on the low shelf, and a rolled quilt on the high one.
  box(railX - .16, 1.08, wZc, .34, .12, .32, C('#b5bbbf'),
      { tag: '主卧衣服', mode:7, gloss:G.fabric, ...CLOTH });
  box(railX + .19, 1.075, wZc + .02, .30, .11, .30, C('#b5a78f'),
      { tag: '主卧衣服', mode:7, gloss:G.fabric, ry:.05, ...CLOTH });
  cap(railX, 2.05, wZc, .21, .74, .21, C('#bcb8ac'),
      { rz:Math.PI/2, tag: '主卧衣柜', mode:7, gloss:G.fabric, ...LINEN });
  th('衣服', railX - .16, 1.24, wZc - .20, '干净的衣服都叠好放在这儿。',
     'The clean clothes are all folded and kept here.',
     '衣服 is clothes in general; 一件衣服 jiàn is the measure word for a garment.',
     { focus:[-5.30, 1.76], reach:1.5 });

  // ---- the shelf bay behind the doors, glimpsed down the side of the front panel.
  for (const sy of [.52, .96, 1.40, 1.84])
    box(-4.32, sy, wZc, 1.30, .04, wDepth - .06, oakL,
        { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  box(-4.62, .62, wZc + .02, .40, .16, .34, C('#b5bbbf'),
      { tag: '主卧衣柜', mode:7, gloss:G.fabric, ...CLOTH });
  box(-4.10, 1.06, wZc - .01, .38, .15, .32, C('#b5a78f'),
      { tag: '主卧衣柜', mode:7, gloss:G.fabric, ry:-.04, ...CLOTH });
  box(-4.50, 1.50, wZc + .01, .36, .13, .30, C('#9aa7ae'),
      { tag: '主卧衣柜', mode:7, gloss:G.fabric, ...CLOTH });

  // ---- the two sliding leaves. Front track at z 2.5375, rear at 2.590, carcass face at 2.62 —
  // every gap is at least 1.4 cm, because three parallel panels a few millimetres apart is the
  // one arrangement guaranteed to strobe. The rear leaf sticks 14 cm out past the front one,
  // which is the only thing that says there are two of them and not one.
  // The leaves carried the only material this file used to apply, at .80 m per repeat. They are the
  // largest oak panels in the room and the carcass stiles stand 8 cm from their edge, so they now
  // share the carcass's scale: two pieces of the same oak at two grain scales, touching, reads as a
  // mistake, and it is the one texture error in a wardrobe you cannot help looking at.
  // These two are also the only timber in the room without `mode:6`, which by the note in the
  // palette block above is what makes a wood prop read as flat brown plastic. Deliberately NOT
  // added here: `mode` selects the bevel in gl.js as well as the shading, so adding it would round
  // the leaf edges by 2.2 cm — a geometry change, not a material one, and not this pass's to make.
  // Flagged in the report instead.
  const doorMat = TIMBER;
  box(-4.42, 1.17, 2.590, 1.24, 2.10, .032, oak,
      { tag: '主卧衣柜', hard:true, gloss:G.wood, ...doorMat });
  box(-4.28, 1.17, 2.5375, 1.24, 2.10, .032, oakL,
      { tag: '主卧衣柜', hard:true, gloss:G.wood, ...doorMat });
  box(-3.74, 1.17, 2.5175, .022, .70, .026, walnut,
      { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood });     // finger pull, front leaf
  box(-4.98, 1.17, 2.5700, .022, .70, .026, walnut,
      { tag: '主卧衣柜', hard:true, mode:6, gloss:G.wood });     // finger pull, rear leaf
  box(-4.35, 2.242, 2.564, 1.42, .030, .11, steel,
      { tag: '主卧衣柜', hard:true, gloss:G.metal, ...FITTING }); // the head track they run on

  // ---- on top of the wardrobe, where the spare bedding lives in every flat in the country.
  box(-5.30, 2.42, wZc, 1.00, .22, .48, C('#b5bbbf'),
      { tag: '主卧衣柜', mode:7, gloss:G.fabric, ...CLOTH });
  box(-4.18, 2.40, wZc + .02, .88, .18, .44, C('#b6c0c8'),
      { tag: '主卧衣柜', mode:7, gloss:G.fabric, ry:.03, ...CLOTH });

  // ---------------------------------------------------------------- the rail's five slots
  //
  // The rail runs along x and each garment's shoulders span z, which is the wardrobe's depth —
  // that is how a hanger actually hangs, the hook across the rail and the shoulder bar pointing
  // into the cupboard, so you flip through the garments edge-on. It also means no face of a
  // garment is reliably "the front": tailoring that only exists on a front — lapels, a placket,
  // buttons — has nowhere unambiguous to go, so the variety here is in mass and hang instead.
  // The cream shirt is the crooked one, because one of them always is.
  [[-5.78,'#c8503d','shirt'], [-5.61,'#3d6f8e','jacket'], [-5.44,'#c8c1b3','shirt'],
   [-5.27,'#4f7a5e','coat'],  [-5.10,'#8d6bb0','dress']]
    .forEach(([gx, hex, cut], i) => {
      cap(gx, railY - .06, wZc, .020, .14, .020, steel, { tag: '主卧衣柜', gloss:G.metal });
      const c = C(hex);
      // The material goes on `F`, which every part of the garment shares, so a coat's body and its
      // collar are one cloth. It is deliberately outside the colour contract: 换衣服 rewrites
      // `prop.color` on everything in `props`, and weave is not colour, so a shirt that becomes red
      // becomes red woven cloth rather than red plastic.
      const F = { tag: '主卧衣柜', mode:7, gloss:G.fabric, ...CLOTH,
                  ry:(i % 2 ? 1 : -1) * .03 + (i === 2 ? .10 : 0) };
      const yoke = cut === 'dress' ? .26 : cut === 'shirt' ? .30 : .33;
      const g = [taper(gx, 1.60, wZc, .13, .14, yoke, c, F)];
      if (cut === 'dress') {
        g.push(box(gx, 1.45, wZc, .11, .22, .23, c, F));
        g.push(box(gx, 1.21, wZc, .16, .30, .30, c, F));
      } else if (cut === 'coat') {
        g.push(box(gx, 1.30, wZc, .17, .50, .33, c, F));
        g.push(box(gx, 1.525, wZc, .15, .075, .21, c, F));            // turned-up collar
      } else if (cut === 'jacket') {
        g.push(box(gx, 1.31, wZc, .14, .46, .28, c, F));
        for (const s of [-1, 1])                                       // sleeves, hanging clear
          g.push(box(gx, 1.24, wZc + s * .145, .10, .36, .075, c, { ...F, rx:-s * .05 }));
      } else {
        g.push(box(gx, 1.28, wZc, .12, .52, .30, c, F));
      }
      rail.push({ hex, color:c, props:g });
    });
  // Two empty hangers at the end of the run. They belong to no slot, so they keep their wire
  // colour however many times you change.
  for (const ex of [-4.94, -4.90])
    cap(ex, railY - .06, wZc, .020, .14, .020, steel, { tag: '主卧衣柜', gloss:G.metal, ry:.4 });

  sha(wXc, wZc + .04, 2.44, .74, .40);
  stop(-5.98, -3.56, 2.48, 3.20);
  th('衣柜', -5.20, 2.10, 2.48, '衣柜里挂着的衣服不多。',
     'There are not many clothes hanging in the wardrobe.',
     '衣 clothing + 柜 cabinet. 换衣服 huàn yīfu is to change your clothes.',
     { focus:[-4.98, 1.74], reach:1.6, tag: '主卧衣柜' });

  // ---------------------------------------------------------------- 镜子 the mirror
  //
  // A 穿衣镜 leaning on the hall wall rather than screwed flat to it, which solves two problems at
  // once: a leaning mirror never fights the wall for the same pixels, and it does not face the
  // bed. A mirror at the foot of a bed is the one piece of bedroom furniture placement a Chinese
  // household will actually move, so this one looks across the room instead.
  //
  // The tilt has to be applied as a rigid body. Setting `rz` on each part rotates each part about
  // its own centre, which leaves the frame in pieces; every part is placed through `mAt`, which
  // is the same rotation applied to its offset from the mirror's middle.
  const mirX = -2.68, mirY = .84, mirZ = 1.30, tilt = -.075;
  const tc = Math.cos(tilt), ts = Math.sin(tilt);
  const mAt = (dx, dy) => [mirX + dx * tc - dy * ts, mirY + dx * ts + dy * tc];
  const M0 = mAt(.030, 0), M1 = mAt(0, 0);
  box(M0[0], M0[1], mirZ, .022, 1.62, .52, walnut,
      { rz:tilt, tag: '主卧镜子', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  box(M1[0], M1[1], mirZ, .014, 1.46, .40, mirrorC,
      { rz:tilt, tag: '主卧镜子', hard:true, mode:1, glow:.06 });
  // The frame is four bars around the glass, not a slab behind it: side by side, nothing stacked,
  // and the bars stand 1 cm proud of the glass the way a real moulding does.
  for (const s of [-1, 1]) {
    const p = mAt(-.017, 0);
    box(p[0], p[1], mirZ + s * .225, .034, 1.62, .07, oak,
        { rz:tilt, tag: '主卧镜子', hard:true, mode:6, gloss:G.wood, ...TIMBER });
    const q = mAt(-.017, s * .775);
    box(q[0], q[1], mirZ, .034, .07, .52, oak,
        { rz:tilt, tag: '主卧镜子', hard:true, mode:6, gloss:G.wood, ...TIMBER });
  }
  // ---- what the mirror shows. A leaning mirror two metres from the clothes rail whose entire
  // purpose is feedback, and it reflected nothing: this renderer has no reflection pass and never
  // will at 60 fps, so the reflection is three flat shapes standing just inside the glass — a
  // shoulder-width top, a narrower bottom, and shoes. Read at two metres that is a person in a
  // mirror; a real reflection would be a second camera and a second pass for one prop.
  //
  // The colours are the point, not the silhouette. `rail` above already carries `{hex, color}`
  // per outfit and js/game.js indexes straight into it, so game.js can set `.color` on these
  // three and the mirror shows what you are wearing. `p.color` is read per frame at
  // js/gl.js:2854, so assignment is all it takes — no rebuild, no mover.
  const outfitAt = dy => mAt(-.026, dy);
  const OM = {};
  {
    const t = outfitAt(.34), b = outfitAt(-.16), f = outfitAt(-.60);
    OM.top   = box(t[0], t[1], mirZ, .006, .58, .30, C('#8d94a0'),
                   { rz:tilt, tag: '主卧镜子', mode:7, gloss:.10, alpha:.72 });
    OM.legs  = box(b[0], b[1], mirZ, .006, .46, .22, C('#4c5a63'),
                   { rz:tilt, tag: '主卧镜子', mode:7, gloss:.10, alpha:.72 });
    OM.shoes = box(f[0], f[1], mirZ, .006, .10, .24, C('#2b2620'),
                   { rz:tilt, tag: '主卧镜子', mode:7, gloss:.14, alpha:.72 });
  }
  FlatFit['bedroom'].outfitMirror = OM;

  sha(mirX - .04, mirZ, .30, .62, .34);
  stop(-2.82, -2.60, 1.00, 1.62);
  th('镜子', mirX - .10, 1.32, mirZ, '出门以前照照镜子。', 'A look in the mirror before going out.',
     '照镜子 zhào jìngzi is to look at yourself in one — 照 is the same 照 as in 照片, a photograph.',
     { focus:[-3.62, 1.30], reach:1.5 });

  // ---------------------------------------------------------------- 空调 the air conditioner
  //
  // A 挂式空调 high on the hall wall, blowing across the room rather than down onto the bed. Built
  // as a body, a slimmer fascia in front of it and a display in front of that — three separate
  // depths — because grilles cut as thin slots into a flat face are exactly the millimetre-apart
  // parallel planes that strobe.
  const acZ = .30;
  box(-2.775, 2.26, acZ, .30, .30, .92, applianceW, { tag: '主卧空调', hard:true, gloss:.24 });
  box(-2.945, 2.28, acZ, .06, .22, .88, C('#c6c9c6'), { tag: '主卧空调', hard:true, gloss:.20 });
  box(-2.950, 2.145, acZ, .09, .045, .84, applianceG,
      { tag: '主卧空调', hard:true, gloss:.22, rz:-.16 });                 // the deflector vane
  box(-2.984, 2.24, acZ + .32, .012, .05, .13, dark, { tag: '主卧空调', hard:true, gloss:.34 });
  ball(-2.994, 2.24, acZ + .40, .010, .010, .010, C('#7fd08a'),
       { tag: '主卧空调', mode:1, glow:.14 });
  box(-2.660, 2.06, acZ + .44, .10, .18, .07, applianceG,
      { tag: '主卧空调', hard:true, gloss:.20 });                          // the pipe run to the wall
  th('空调', -2.95, 2.03, acZ, '开空调吧，屋里太热了。', 'Let us put the AC on, it is too hot in here.',
     '空 air + 调 to adjust. 开空调 kāi kōngtiáo — and every flat has one in every room.',
     { focus:[-3.58, .30], reach:1.7, tag: '主卧空调' });

  // ---------------------------------------------------------------- 篮子 the laundry basket
  //
  // In the corner you undress in, between the bedside table and the hall wall. The lid is off
  // square and there is a sleeve over the rim, because a laundry basket with the lid on straight
  // and nothing showing is a bin.
  const bkX = -2.96, bkZ = -1.08;
  box(bkX, .27, bkZ, .42, .54, .42, wicker, { tag: '篮子', mode:7, gloss:.09, ...BASKET });
  for (const by of [.14, .28, .42])
    box(bkX, by, bkZ, .432, .022, .432, wickerD, { tag: '篮子', mode:7, gloss:.08, ...BASKET });
  box(bkX, .552, bkZ, .44, .04, .44, wickerD, { tag: '篮子', mode:7, gloss:.09, ...BASKET });
  box(bkX + .01, .585, bkZ - .01, .45, .035, .45, wicker,
      { tag: '篮子', mode:7, gloss:.09, ry:.09, rz:.035, ...BASKET });
  cap(bkX - .12, .585, bkZ - .19, .05, .24, .05, C('#c4bfb2'),
      { rz:1.05, ry:.55, tag: '篮子', mode:7, gloss:G.fabric, ...CLOTH });
  sha(bkX, bkZ, .56, .56, .36);
  stop(-3.20, -2.72, -1.32, -.84);
  th('篮子', bkX, .74, bkZ, '脏衣服都在篮子里。', 'The dirty clothes are all in the basket.',
     '篮子 basket. 脏 zāng is dirty — 干净 gānjìng is its opposite.',
     { focus:[-3.10, -.48], reach:1.4 });

  // ---------------------------------------------------------------- 拖鞋 slippers
  //
  // Beside the bed on the side you get out of, toes pointing away from it. No `thing` on them:
  // 拖鞋 has no row in js/vocab.js and `Vocab.get` has no fallback, so labelling them would be an
  // uncaught TypeError on the first frame the player stands here rather than a missing gloss.
  // One line in that file and they can be taught; see the report.
  for (const s of [-1, 1]) {
    const sx = -3.60, sz = .53 + s * .09, yaw = -.12 + s * .06;
    box(sx, .022, sz, .27, .04, .11, C('#cdc4b4'), { ry:yaw, gloss:.16 });
    box(sx - .065, .062, sz, .13, .09, .105, C('#7f9a97'),
        { ry:yaw, mode:7, gloss:.10, ...CLOTH });
  }
  // The one thing in this room that was standing on nothing. Every other freestanding object here
  // had a `shade` and the slippers did not, and a pair of slippers hovering 2 cm over a board floor
  // is the loudest kind of unfinished there is — small, at the foot of the bed, and exactly where
  // the eye goes when the player gets out of it. One soft patch under both, not two: they sit 18 cm
  // apart and two tight shadows at that spacing read as a stain rather than as contact.
  sha(-3.60, .53, .42, .38, .26);

  // ---------------------------------------------------------------- 地毯 the bedside rug
  //
  // Layered flats rather than one, so the rug has a border. It runs 10 cm under the bed, which is
  // where a bedside rug goes — square with the bed edge and it looks laid by a shop.
  // All three layers carry the same pile now. The border already had it and the two inner fields did
  // not, which made a woven edge around a painted middle — worse than no material at all, because
  // the join between them is a straight line the eye reads as a seam in the floor.
  flat(-3.50, .006, -.35, .78, 1.20, rugA, { mode:7, gloss:G.fabric, ...RUGM });
  flat(-3.50, .010, -.35, .64, 1.06, rugB, { mode:7, gloss:G.fabric, ...RUGM });
  flat(-3.50, .014, -.35, .50, .92, rugA, { mode:7, gloss:G.fabric, ...RUGM });
  th('地毯', -3.50, .30, -.35, '下床的时候脚不冷。', 'Your feet are not cold getting out of bed.',
     '地 ground + 毯 blanket. A rug on this side only, which is the side you get out on.',
     { focus:[-3.20, .10], reach:1.4 });

  // ---------------------------------------------------------------- 照片墙 the photographs
  //
  // Nine frames over the headboard. Each is a moulding box with the print standing exactly 1 cm
  // proud of its face — a print set flush inside the frame is two parallel faces a millimetre
  // apart and would flicker across the whole wall. Proud by a centimetre it reads as a mounted
  // print, which is what these are.
  //
  // The last one is not a photograph. It is a small red panel with 家 on it, which is the word
  // this wall is here to teach: the character means the building and the people in it at once,
  // and 想家 xiǎngjiā — to miss them — is the first thing anyone living this far away learns.
  const frameZ = -1.365, printZ = -1.368;
  const FR = [
    [-5.42, 2.06, .26, .34, walnut, '#c3b39a'],
    [-5.42, 1.70, .26, .22, cream,  '#a9b4ae'],
    [-5.04, 1.88, .40, .52, walnut, '#cdbda2'],
    [-4.60, 2.16, .30, .22, brass,  '#b6a68e'],
    [-4.58, 1.76, .34, .26, walnut, '#9fa9a4'],
    [-4.16, 2.10, .22, .28, cream,  '#c0ab90'],
    [-4.14, 1.70, .22, .18, walnut, '#aab0a6'],
    [-3.80, 1.94, .32, .42, cream,  '#c6b49b'],
  ];
  for (const [fx, fy, fw, fh, fc, ph] of FR) {
    box(fx, fy, frameZ, fw, fh, .040, fc,
        { tag: '家', hard:true, mode:6, gloss:G.wood, ...TIMBER });
    box(fx, fy, printZ, fw - .06, fh - .06, .026, C(ph),
        { tag: '家', hard:true, gloss:.28 });
  }
  // Two of them are close enough to read as pictures of somebody. Zero-thickness quads a
  // centimetre off the print's face: cheap, and they face +z, which is into the room.
  for (const [qx, qy, qw, qh, qc] of [
    [-5.04, 1.74, .30, .16, '#8e9d92'], [-5.10, 1.94, .07, .22, '#5d5a56'],
    [-4.97, 1.93, .06, .20, '#8a5f4a'], [-3.80, 1.82, .24, .13, '#a08c72'],
    [-3.83, 2.00, .06, .19, '#4f5b63'],
  ]) wall(qx, qy, -1.379, qw, qh, 0, C(qc), { gloss:.22 });
  box(-3.44, 2.02, frameZ, .20, .26, .040, red, { tag: '家', hard:true, gloss:.20 });
  glyph(-3.44, 2.02, -1.343, 0, '家', { size:.13, color:C('#e8d9a8'), mode:1, tag: '家' });
  th('家', -3.44, 1.84, -1.34, '墙上都是家里人的照片。', 'The wall is all photographs of my family.',
     '家 is the building and the people in it at the same time. 想家 xiǎngjiā is to miss them.',
     { focus:[-3.30, -.55], reach:1.5 });

  // ---------------------------------------------------------------- 窗帘 the curtains
  //
  // Hung to suit an opening at x -6.00, z 0.20..1.90 that this file does not cut — the shell owns
  // the flat's envelope, and a room builder punching a hole in somebody else's wall is how two
  // agents end up with one window each in the same place. Drawn back to the ends with a sheer
  // between them, which is how a Chinese bedroom is dressed: 纱帘 by day, the heavy pair at night.
  cap(-5.86, 2.22, 1.05, .022, 2.00, .022, C('#8d8579'),
      { rx:Math.PI/2, tag: '窗帘', gloss:.50, ...FITTING });
  // Bunched open at the two ends, and they now actually draw. js/world.js:1454 has had working
  // curtain movers since the corridor window — folds that slide toward the middle and widen as
  // they go — and this pair was a static prop next to it. The one difference is the axis: that
  // rail runs along x and this one along z, so the slide and the scale are both in z.
  //
  // `mover` is only recomputed when game.js calls `World.setPart`, so a pair of curtains nobody
  // has touched costs two array entries and no per-frame work.
  const CURT_MID = 1.05, curtainHalf = { '-1': [], '1': [] };
  for (const cz of [.28, 1.82]) {
    const side = cz < CURT_MID ? -1 : 1, half = curtainHalf[side];
    half.push(box(-5.86, 1.18, cz, .16, 2.02, .34, C('#cdc4b4'),
        { tag: '窗帘', mode:7, gloss:G.fabric, ...CLOTH }));
    for (const [oz, r] of [[-.10, .046], [.02, .052], [.11, .044]])
      half.push(cap(-5.80, 1.18, cz + oz, r, 1.98, r, C('#bbb29f'),
          { tag: '窗帘', mode:7, gloss:G.fabric, ...CLOTH }));
  }
  // The opening this dresses is z 0.20 .. 1.90, so closed each half has to carry 0.85 m of it.
  // The four members of a half spread out over that run rather than piling on one line, which is
  // what makes a drawn curtain read as folds instead of as a slab.
  if (A.mover && M && M.mul)
    for (const side of [-1, 1])
      A.mover(side < 0 ? 'bedCurtainL' : 'bedCurtainR', curtainHalf[side], (v, i, m0) => {
        const z0 = m0[14], tgt = CURT_MID + side * (.42 - i * .14);
        const tz = z0 + (tgt - z0) * v, s = 1 + 1.2 * v;
        return M.mul(M.trans(0, 0, tz), M.mul(M.scale(1, 1, s), M.trans(0, 0, -z0)));
      });
  // Published so game.js can draw them with the hour. Open is 0, closed is 1.
  FlatFit['bedroom'].curtain = { parts:['bedCurtainL', 'bedCurtainR'], mid:CURT_MID, open:0, shut:1 };
  // The sheer goes in last of everything near it. Transparency in this renderer depends on draw
  // order, and a pane built early sorts itself in front of the room behind it.
  // SHEER rather than CLOTH: this pane is #dad6cd at 55% and is the brightest large surface in the
  // room, so the shared .28 would lift it toward white instead of weaving it — which is the exact
  // failure ART.md names. .14 with the relief left to the normal map is what a 纱帘 wants anyway.
  box(-5.92, 1.18, 1.05, .04, 2.00, 1.30, C('#dad6cd'),
      { tag: '窗帘', mode:7, alpha:.55, gloss:.05, ...SHEER });
  th('窗帘', -5.84, 1.62, 1.05, '早上先拉开窗帘。', 'First thing in the morning, open the curtains.',
     '拉窗帘 lā chuānglián — 拉 is to pull, and it does for both opening and closing them.',
     { focus:[-4.94, 1.05], reach:1.6 });

  // ---------------------------------------------------------------- the floor and the ceiling
  //
  // Neither is built here, and that is on purpose rather than an omission — which is worth stating,
  // because ART.md's ownership table hands a room's floor and ceiling to the room's own file and the
  // next person to read that table will come looking for them.
  //
  // In this flat they are not this room's surfaces to own. js/world.js's `buildShell` lays ONE board
  // floor and ONE ceiling quad across the whole `FLAT` footprint — not per room — and the floor is
  // already carrying the board material at matScale 1.15, matAmt .30, nrmAmt .35. The 次卧 next door
  // lays no floor either, for the same reason. So the bedroom's floor is a surface it shares with
  // the hall and the 客厅, and ART.md is explicit about what happens then: a shared surface belongs
  // to the shell, and if you are unsure it belongs to the shell. Laying a second board flat over
  // this room's footprint would also put two nearly coplanar textured quads in the one arrangement
  // this file warns about three times, and would seam visibly at the doorway against the same
  // boards continuing into the hall.
  //
  // What IS this file's, and is below: the fitting in that ceiling, and the light in it.
  //
  // A 吸顶灯, the flush disc that is in the ceiling of every bedroom in every new block, plus the
  // real light under it. The room's own light rather than the shell's: eight lights reach the
  // shader and the nearest to the camera win, so a room declaring one of its own is safe.
  cyl(-4.30, 2.560, .90, .245, .045, C('#cdc4b4'), { gloss:.30 });
  cyl(-4.30, 2.498, .90, .225, .085, C('#f2f0e9'), { mode:1, glow:.10, gloss:.20 });
  const ceilLight = light(-4.30, 2.40, .90, C('#ffeecd'), 1.0, 3.4);
  FlatFit['bedroom'].ceiling = ceilLight;
};
