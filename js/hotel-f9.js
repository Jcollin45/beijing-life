// 京华大酒店 · 9F cultural club and junior suites
//
// The ninth floor is a residential club rather than another anonymous guest corridor.  Its three
// enclosed cultural rooms open from one gallery, while Junior Suite 903 is acoustically separated
// along the south facade.  The measured shell, lift bank, floor directory, fire stair and both published
// circulation spines remain owned by hotel.js.

const Hotel9Fit=Object.freeze({floor:'hotel9',api:1});

(() => {
  try {
    Glyphs.need(
      '九楼文化会所雅集前台茶艺沙龙功夫茶席围棋桌麻将桌书法台文房四宝藏书架临帖水墨长卷' +
      '小套房九零三玄关起居室卧室套房床书桌欢迎茶石材浴缸衣帽柜衣帽间备餐间杯具消毒服务通道静雅' +
      '会所茶艺师苏雯书法导师顾远舟住客蔡明谦' +
      'CULTURALCLUBRECEPTIONTEASALONBOARDGAMESCALLIGRAPHYJUNIORSUITEPANTRYBEDROOM'
    );
  } catch (_) {}

  const TAU=Math.PI*2;

  function palette(A) {
    return {
      plaster:A.C('#ddd7ca'), plasterL:A.C('#eee7da'), limestone:A.C('#d7cbbb'),
      limestoneL:A.C('#ede3d3'), walnut:A.C('#4a352c'), walnutL:A.C('#765545'),
      walnutD:A.C('#2d2522'), bronze:A.C('#9d7440'), bronzeL:A.C('#c9a364'),
      bronzeD:A.C('#5d432b'), lacquer:A.C('#8c332d'), lacquerD:A.C('#582824'),
      celadon:A.C('#89a696'), celadonL:A.C('#bfd0c4'), jade:A.C('#496e61'),
      ink:A.C('#25282a'), inkL:A.C('#4d5555'), silk:A.C('#b69a87'),
      silkL:A.C('#ded0bd'), silkRose:A.C('#a96e67'), carpet:A.C('#584b47'),
      carpetL:A.C('#78655d'), paper:A.C('#f1e8d8'), white:A.C('#f7f0e5'),
      warm:A.C('#ffe3a8'), tea:A.C('#7a552e'), glass:A.C('#8faab1'),
      glassD:A.C('#27373b'), water:A.C('#4d858d'), green:A.C('#52705c'),
      blue:A.C('#526d7a'), towel:A.C('#ece7dd'), steel:A.C('#858b8c'),
      // Ink-wash hill tones, pre-mixed. The artwork used to lay translucent ellipses over its
      // silk field at alpha .38-.46 to get the wash. Alpha is the one thing that is NOT free
      // here: build.js batches by mesh+mode+textures but anything under alpha .999 is drawn on
      // its own, and the club and suite panels were spending ~40 draw calls on five blobs each,
      // twice over (both faces). These three are those same blends computed against the silk and
      // plaster grounds, so the picture is unchanged and every layer batches.
      hillInk:A.C('#9b978d'), hillCelo:A.C('#b7bdab'), hillBlue:A.C('#9ea39f'),
      hillCeloL:A.C('#c8cec0'), hillBlueL:A.C('#b3b9b5'),
    };
  }

  // The tower's material kit. Numerically identical to the copies in js/hotel-f1.js and
  // js/hotel-public.js on purpose: build.js:329-331 keys batches on
  // (mat, matScale, matAmt, nrmAmt), so matching tuples let this floor batch with the rest of
  // the building instead of doubling the draw calls. Change one, change all. Every name is
  // already in EAGER_MATERIALS (js/assets.js:187), so none of it adds boot cost.
  const MAT = {
    stone:  { mat:'plaster',  matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',     matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',   matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete', matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };

  // The shell's ceiling soffit is at H-.26 = 4.09. Every partition on this floor stopped at
  // 3.56, leaving a 0.53 m open slot along the top of every wall — you looked over the club's
  // walls into the suite, and the suite's lighting spilled back. `cap()` closes that to the slab
  // and registers the camera blocker these walls never had: every surface is single-sided, so a
  // wall with a collider and no blocker lets the chase camera slide through and show its back.
  // `eye:false` for the piece over a doorway, where a blocker would stop the eye following the
  // player through the opening.
  const WTOP = 3.56, SOFFIT = 4.09;
  function cap(A,c,x0,x1,z0,z1,tag='墙',eye=true) {
    A.box((x0+x1)/2,(WTOP+SOFFIT)/2,(z0+z1)/2,x1-x0,SOFFIT-WTOP,z1-z0,c.plasterL,
      {...MAT.stone,hard:true,gloss:.10,tag});
    if(eye) A.blocker(x0-.03,x1+.03,z0-.03,z1+.03,SOFFIT);
  }

  // Room-sized finish fields read as hospitality interiors rather than narrow circulation lanes.
  // Both helpers are visual-only: their layers sit millimetres above the shared shell floor and
  // never register collision. A single recessed perimeter replaces long parallel brass stripes.
  function floorField(A,c,x,z,w,d,fill,tag,border=c.walnutD) {
    const {flat}=A;
    flat(x,.018,z,w,d,border,{...MAT.timber,mode:7,gloss:.16,tag});
    flat(x,.023,z,Math.max(.20,w-.28),Math.max(.20,d-.28),fill,
      {...MAT.cloth,mode:7,gloss:.035,tag});
    // Four small corner pins give the border a crafted termination without becoming another line.
    for(const sx of [-1,1])for(const sz of [-1,1])
      flat(x+sx*(w/2-.24),.027,z+sz*(d/2-.24),.17,.17,c.bronzeL,
        {ry:Math.PI/4,gloss:.64,tag});
  }

  function floorMedallion(A,c,x,z,r,accent,tag) {
    const {cyl}=A;
    cyl(x,.026,z,r,.012,c.bronzeD,{hard:true,mode:7,gloss:.60,tag});
    cyl(x,.033,z,r-.10,.012,c.limestoneL,{...MAT.stone,hard:true,mode:7,gloss:.20,tag});
    cyl(x,.040,z,Math.max(.16,r*.42),.012,accent,{...MAT.cloth,hard:true,mode:7,gloss:.33,tag});
  }

  const at=(x,z,yaw,u,v)=>[
    x+Math.cos(yaw)*u+Math.sin(yaw)*v,
    z-Math.sin(yaw)*u+Math.cos(yaw)*v,
  ];

  function stadium(A,x,y,z,w,d,h,color,opts={}) {
    const r=Math.min(d/2,w/2), core=Math.max(.02,w-r*2), yaw=opts.ry||0;
    const parts=[A.box(x,y,z,core,h,d,color,{...opts})];
    for(const s of [-1,1]) {
      const p=at(x,z,yaw,s*core/2,0);
      parts.push(A.cyl(p[0],y,p[1],r,h,color,{...opts,ry:0}));
    }
    return parts;
  }

  // A partition is TWO things: the box you SEE (centre + size) and the `solid` that STOPS you
  // (min/max extents).  `hard:true` only selects the sharp-edged mesh — it is a silhouette flag
  // and clampMove has never looked at it, so a box without its paired `solid` is a wall the
  // player walks straight through.  Both helpers below emit the solid on the same centreline as
  // the box, and both faces get a skirting and a bronze cornice so no partition reads as a bare
  // slab from whichever side you happen to approach it.
  function wallZ(A,c,x0,x1,z,tag='墙') {
    if(x1<=x0)return;
    const cx=(x0+x1)/2,w=x1-x0;
    Build.partition(0,3.56,(yc,hh,pf)=>A.box(cx,yc,z,w,hh,.18,c.plaster,{...MAT.stone,hard:true,mode:14,gloss:.11,tag,...pf}));
    for(const s of [-1,1]) {
      A.box(cx,.17,z+s*.105,w,.22,.035,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
      A.box(cx,3.48,z+s*.105,w,.10,.035,c.bronzeD,{hard:true,gloss:.60,tag,partition:true});
    }
    A.solid(x0,x1,z-.10,z+.10);
    cap(A,c,x0,x1,z-.09,z+.09,tag);
  }

  function wallX(A,c,x,z0,z1,tag='墙') {
    if(z1<=z0)return;
    const cz=(z0+z1)/2,d=z1-z0;
    Build.partition(0,3.56,(yc,hh,pf)=>A.box(x,yc,cz,.18,hh,d,c.plaster,{...MAT.stone,hard:true,mode:14,gloss:.11,tag,...pf}));
    for(const s of [-1,1]) {
      A.box(x+s*.105,.17,cz,.035,.22,d,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
      A.box(x+s*.105,3.48,cz,.035,.10,d,c.bronzeD,{hard:true,gloss:.60,tag,partition:true});
    }
    A.solid(x-.10,x+.10,z0,z1);
    cap(A,c,x-.09,x+.09,z0,z1,tag);
  }

  // `face` is the side the door is read from: -1 (default) puts the reveal, sign band and glyphs
  // on the -z face, +1 mirrors them onto the +z face.  The suite's dressing-to-bath door is
  // approached from the north, so it needs the mirrored sign; every other portal keeps -1.
  function portalZ(A,c,x,z,w,hz,en,accent=c.lacquer,face=-1) {
    const {box,capsule,glyphs,luminous}=A;
    const yaw=face<0?Math.PI:0;
    for(const s of [-1,1]) {
      box(x+s*(w/2-.11),1.72,z,.22,3.44,.34,c.walnutD,
        {...MAT.timber,hard:true,mode:6,gloss:.32,tag:hz});
      capsule(x+s*(w/2-.11),1.72,z+face*.19,.025,2.84,.025,c.bronzeL,
        {gloss:.67,tag:hz});
      box(x+s*(w/2-.11),.13,z+face*.14,.38,.26,.52,c.bronzeD,
        {hard:true,gloss:.58,tag:hz});
    }
    box(x,3.34,z,w,.34,.36,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.32,tag:hz});
    cap(A,c,x-w/2,x+w/2,z-.09,z+.09,hz,false);
    luminous(box(x,3.34,z+face*.19,w-.40,.17,.035,accent,
      {hard:true,mode:1,tag:hz}),.025,.12);
    glyphs(x,3.38,z+face*.218,yaw,hz,{size:Math.min(.18,(w-.55)/Math.max(2,[...hz].length)),
      gap:.028,color:c.white,mode:1,glow:.035,lift:.007,tag:hz});
    if(en)glyphs(x,3.09,z+face*.218,yaw,en,{size:Math.min(.066,(w-.50)/Math.max(2,en.length)),
      gap:.014,color:c.bronzeL,mode:1,lift:.007,tag:hz});
  }

  function portalX(A,c,x,z,w,hz,en,accent=c.jade) {
    const {box,capsule,glyphs,luminous}=A;
    for(const s of [-1,1]) {
      box(x,1.72,z+s*(w/2-.11),.34,3.44,.22,c.walnutD,
        {...MAT.timber,hard:true,mode:6,gloss:.32,tag:hz});
      capsule(x-.19,1.72,z+s*(w/2-.11),.025,2.84,.025,c.bronzeL,
        {gloss:.67,tag:hz});
      box(x-.14,.13,z+s*(w/2-.11),.52,.26,.38,c.bronzeD,
        {hard:true,gloss:.58,tag:hz});
    }
    box(x,3.34,z,.36,.34,w,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.32,tag:hz});
    cap(A,c,x-.09,x+.09,z-w/2,z+w/2,hz,false);
    luminous(box(x-.19,3.34,z,.035,.17,w-.40,accent,
      {hard:true,mode:1,tag:hz}),.025,.12);
    glyphs(x-.218,3.38,z,-Math.PI/2,hz,
      {size:Math.min(.17,(w-.55)/Math.max(2,[...hz].length)),gap:.028,color:c.white,
        mode:1,glow:.035,lift:.007,tag:hz});
    if(en)glyphs(x-.218,3.09,z,-Math.PI/2,en,
      {size:Math.min(.060,(w-.50)/Math.max(2,en.length)),gap:.012,color:c.bronzeL,
        mode:1,lift:.007,tag:hz});
  }

  function plaqueX(A,c,x,y,z,w,hz,en,accent=c.jade) {
    const {box,glyphs,luminous}=A;
    box(x,y,z,.13,1.08,w,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.32,tag:hz});
    luminous(box(x-.075,y,z,.028,.88,w-.20,accent,
      {hard:true,mode:1,tag:hz}),.025,.12);
    glyphs(x-.102,y+.15,z,-Math.PI/2,hz,{size:Math.min(.17,(w-.45)/Math.max(2,[...hz].length)),
      gap:.028,color:c.white,mode:1,glow:.03,lift:.007,tag:hz});
    if(en)glyphs(x-.102,y-.19,z,-Math.PI/2,en,{size:Math.min(.061,(w-.42)/Math.max(2,en.length)),
      gap:.012,color:c.bronzeL,mode:1,lift:.007,tag:hz});
  }

  function lattice(A,c,x,z,w,h,yaw=0,tag='格栅',collision=false) {
    const {box,capsule}=A;
    const n=Math.max(4,Math.round(w/.48));
    for(let i=0;i<=n;i++) {
      const u=-w/2+i*w/n,p=at(x,z,yaw,u,0);
      box(p[0],h/2+.16,p[1],.048,h,.048,c.walnut,
        {...MAT.timber,hard:true,mode:6,gloss:.29,ry:yaw,tag});
    }
    for(const v of [.16,h*.47+.16,h+.16])
      box(x,v,z,w,.052,.052,v===h*.47+.16?c.bronze:c.walnutD,
        {hard:true,gloss:v===h*.47+.16?.62:.28,ry:yaw,tag});
    for(const u of [-w/2+.20,w/2-.20]) {
      const p=at(x,z,yaw,u,0);
      capsule(p[0],h+.25,p[1],.035,.22,.035,c.bronzeL,{gloss:.68,tag});
    }
    if(collision) {
      if(Math.abs(Math.sin(yaw))>.5)A.solid(x-.09,x+.09,z-w/2,z+w/2);
      else A.solid(x-w/2,x+w/2,z-.09,z+.09);
    }
  }

  function ceilingRaft(A,c,x,z,w,d,tag='天花') {
    const {box,capsule,luminous}=A;
    // Warm mid-tone timber keeps the raft legible against the ceiling without turning its broad
    // perimeter into a black void in the chase camera.  The luminous inner leaf remains nested
    // inside the same measured outline, so this is a finish change rather than extra geometry.
    stadium(A,x,A.H-.30,z,w,d,.12,c.walnutL,{...MAT.timber,hard:true,mode:6,gloss:.29,tag});
    const inset=stadium(A,x,A.H-.385,z,w-.30,d-.30,.025,c.warm,
      {hard:true,mode:1,gloss:.08,tag});
    for(const p of inset)luminous(p,.035,.18);
    capsule(x,A.H-.42,z,.022,w-.82,.022,c.bronze,
      {rz:Math.PI/2,gloss:.66,tag});
  }

  function lantern(A,c,x,y,z,scale=1,tag='灯笼') {
    const {cyl,capsule,taper,ball,luminous}=A;
    cyl(x,A.H-.26,z,.16*scale,.09,c.walnutD,{gloss:.30,tag});
    cyl(x,A.H-.34,z,.11*scale,.07,c.bronzeD,{gloss:.62,tag});
    capsule(x,(A.H+y)/2-.18,z,.024*scale,Math.max(.14,A.H-y-.38),.024*scale,c.bronze,
      {gloss:.68,tag});
    taper(x,y,z,.30*scale,.52*scale,.30*scale,c.silkL,
      {...MAT.cloth,mode:7,gloss:.035,tag});
    for(let i=0;i<6;i++) {
      const a=i/6*TAU;
      capsule(x+Math.sin(a)*.245*scale,y,z+Math.cos(a)*.245*scale,.014*scale,
        .46*scale,.014*scale,c.bronzeD,{gloss:.58,tag});
    }
    luminous(ball(x,y,z,.09*scale,.13*scale,.09*scale,c.warm,{mode:1,tag}),.045,.30);
    cyl(x,y-.29*scale,z,.16*scale,.06*scale,c.bronzeD,{gloss:.62,tag});
  }

  function chair(A,c,x,z,yaw=0,upholstery=c.silk,tag='座椅') {
    const {box,capsule,taper,cyl,ball,shade}=A;
    box(x,.34,z,.62,.11,.60,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.27,ry:yaw,tag});
    box(x,.46,z,.72,.19,.68,upholstery,{...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
    box(x,.565,z,.60,.035,.56,c.silkL,{...MAT.cloth,mode:7,gloss:.04,ry:yaw,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]) {
      const p=at(x,z,yaw,sx*.25,sz*.22);
      taper(p[0],.19,p[1],.075,.38,.055,c.walnutD,{hard:true,gloss:.31,tag});
      cyl(p[0],.025,p[1],.082,.05,c.bronzeL,{gloss:.66,tag});
    }
    // `yaw` points toward the sitter's focal target: local +v is the open/front edge and local
    // -v carries the backrest.  Keeping that convention here makes every radial table chair,
    // writing chair and lounge chair face its paired table or desk.
    const back=at(x,z,yaw,0,-.30),inset=at(x,z,yaw,0,-.235);
    box(back[0],.90,back[1],.72,.76,.15,c.walnutD,{...MAT.timber,mode:6,gloss:.29,ry:yaw,tag});
    box(inset[0],.89,inset[1],.57,.58,.065,upholstery,{...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
    capsule(back[0],1.30,back[1],.028,.57,.028,c.bronzeL,
      {rz:Math.PI/2,ry:yaw,gloss:.68,tag});
    ball(inset[0],.92,inset[1],.035,.035,.020,c.bronzeL,{gloss:.67,tag});
    for(const s of [-1,1]) {
      const arm=at(x,z,yaw,s*.35,0);
      capsule(arm[0],.68,arm[1],.032,.43,.032,c.walnut,{tag});
      box(arm[0],.78,arm[1],.10,.09,.52,c.walnutL,{...MAT.timber,mode:7,gloss:.29,ry:yaw,tag});
    }
    shade(x,z,.82,.80,.18);
  }

  function sofa(A,c,x,z,w=2.5,yaw=0,upholstery=c.silk,tag='沙发',collide=true) {
    const {box,taper,cyl,capsule,shade}=A;
    box(x,.28,z,w-.10,.12,.72,c.walnutD,{...MAT.timber,mode:6,gloss:.26,ry:yaw,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]) {
      const p=at(x,z,yaw,sx*(w/2-.23),sz*.25);
      taper(p[0],.14,p[1],.08,.28,.055,c.walnutD,{gloss:.29,tag});
      cyl(p[0],.025,p[1],.09,.05,c.bronzeL,{gloss:.66,tag});
    }
    box(x,.45,z,w,.23,.82,upholstery,{...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
    const cushions=Math.max(2,Math.round(w/1.05));
    for(let i=0;i<cushions;i++) {
      const u=-w/2+(i+.5)*w/cushions,p=at(x,z,yaw,u,.02);
      box(p[0],.58,p[1],w/cushions-.055,.045,.68,c.silkL,
        {...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
    }
    // Match chair(): yaw points out of the sofa toward the coffee table, with its back at -v.
    const back=at(x,z,yaw,0,-.34);
    box(back[0],.79,back[1],w,.65,.18,upholstery,{...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
    for(const s of [-1,1]) {
      const arm=at(x,z,yaw,s*(w/2-.06),0);
      box(arm[0],.59,arm[1],.15,.30,.82,upholstery,{...MAT.cloth,mode:7,gloss:.035,ry:yaw,tag});
      capsule(arm[0],.76,arm[1],.024,.58,.024,c.bronzeL,
        {rz:Math.PI/2,ry:yaw,gloss:.64,tag});
    }
    shade(x,z,w+.16,.96,.24);
    if(collide) {
      if(Math.abs(Math.sin(yaw))>.5)A.solid(x-.47,x+.47,z-w/2-.06,z+w/2+.06);
      else A.solid(x-w/2-.06,x+w/2+.06,z-.47,z+.47);
    }
  }

  function roundTable(A,c,x,z,r=.76,tag='茶桌',collide=true) {
    const {cyl,capsule,shade}=A;
    cyl(x,.69,z,r,.14,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    cyl(x,.785,z,r*.82,.045,c.limestoneL,{gloss:.21,tag});
    cyl(x,.816,z,r*.32,.017,c.celadonL,{gloss:.33,tag});
    capsule(x,.36,z,.11,.60,.11,c.bronzeD,{gloss:.59,tag});
    cyl(x,.055,z,.42,.10,c.bronzeD,{gloss:.59,tag});
    shade(x,z,r*2.2,r*2.2,.20);
    if(collide)A.solid(x-r*.78,x+r*.78,z-r*.78,z+r*.78);
  }

  function lowTable(A,c,x,z,w=1.35,d=.74,tag='茶几',collide=true) {
    const {taper,cyl,shade}=A;
    stadium(A,x,.48,z,w,d,.11,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    stadium(A,x,.555,z,w-.18,d-.18,.035,c.limestoneL,{gloss:.20,tag});
    for(const s of [-1,1]) {
      taper(x+s*(w/2-.17),.25,z,.08,.48,.055,c.bronzeD,{hard:true,gloss:.57,tag});
      cyl(x+s*(w/2-.17),.025,z,.10,.05,c.bronzeL,{gloss:.65,tag});
    }
    shade(x,z,w+.18,d+.18,.18);
    if(collide)A.solid(x-w/2,x+w/2,z-d/2,z+d/2);
  }

  function teaSet(A,c,x,z,surface=.84,tag='功夫茶席') {
    const {box,cyl,taper,capsule,ball}=A;
    stadium(A,x,surface+.022,z,1.00,.48,.030,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    stadium(A,x,surface+.046,z,.90,.39,.018,c.limestone,{hard:true,gloss:.18,tag});
    const px=x+.18;
    taper(px,surface+.14,z,.18,.19,.18,c.celadonL,{...MAT.cloth,mode:7,gloss:.33,tag});
    cyl(px,surface+.245,z,.13,.035,c.celadon,{gloss:.31,tag});
    ball(px,surface+.285,z,.034,.034,.034,c.bronzeL,{gloss:.68,tag});
    capsule(px+.20,surface+.15,z,.030,.24,.030,c.bronzeD,
      {rz:Math.PI/2,gloss:.63,tag});
    taper(px+.34,surface+.15,z,.050,.09,.050,c.celadon,
      {rz:Math.PI/2,gloss:.30,tag});
    for(const s of [-1,1]) {
      const cx=x-.22+s*.16;
      cyl(cx,surface+.068,z,.105,.024,c.bronzeL,{gloss:.62,tag});
      taper(cx,surface+.115,z,.070,.080,.070,c.white,{...MAT.stone,mode:7,gloss:.28,tag});
      ball(cx,surface+.127,z,.048,.011,.048,c.tea,{mode:1,gloss:.50,tag});
    }
    for(let i=0;i<3;i++)ball(px-.04+i*.05,surface+.42+i*.10,z,
      .045,.11,.025,c.white,{mode:1,alpha:.18,gloss:.06,tag});
  }

  function gameTable(A,c,x,z,type='麻将桌') {
    const {box,cyl,capsule,glyphs,shade}=A;
    stadium(A,x,.70,z,1.52,1.52,.15,c.walnutD,{...MAT.timber,mode:7,gloss:.29,tag:type});
    stadium(A,x,.80,z,1.36,1.36,.055,type==='围棋桌'?c.limestoneL:c.jade,
      {...MAT.cloth,mode:7,gloss:.20,tag:type});
    stadium(A,x,.835,z,1.12,1.12,.018,c.ink,{hard:true,mode:1,gloss:.12,tag:type});
    for(const sx of [-1,1])for(const sz of [-1,1]) {
      const px=x+sx*.56,pz=z+sz*.56;
      A.taper(px,.35,pz,.085,.70,.060,c.bronzeD,{hard:true,gloss:.58,tag:type});
      cyl(px,.025,pz,.10,.05,c.bronzeL,{gloss:.67,tag:type});
    }
    if(type==='围棋桌') {
      for(let i=-4;i<=4;i++) {
        box(x+i*.115,.855,z,1.04,.010,.010,c.bronzeL,{hard:true,gloss:.50,tag:type});
        box(x,.856,z+i*.115,.010,.010,1.04,c.bronzeL,{hard:true,gloss:.50,tag:type});
      }
      for(let i=0;i<16;i++) {
        const a=i*2.399,rr=.13+(i%4)*.095;
        cyl(x+Math.sin(a)*rr,.875,z+Math.cos(a)*rr,.038,.025,i%2?c.white:c.inkL,
          {gloss:.28,tag:type});
      }
    } else {
      for(let i=0;i<20;i++) {
        const side=i%4,row=Math.floor(i/4),u=-.42+row*.21;
        const px=side<2?x+u:x+(side===2?-.44:.44);
        const pz=side<2?z+(side===0?-.44:.44):z+u;
        box(px,.875,pz,side<2?.16:.10,.055,side<2?.10:.16,c.white,
          {hard:true,gloss:.27,tag:type});
      }
      glyphs(x,.885,z,0,'静',{size:.13,color:c.lacquer,mode:1,lift:.007,tag:type});
    }
    for(const [dx,dz,yaw] of [[0,-1.03,0],[1.03,0,-Math.PI/2],[0,1.03,Math.PI],[-1.03,0,Math.PI/2]])
      chair(A,c,x+dx,z+dz,yaw,c.silk,type);
    shade(x,z,3.10,3.10,.22);
    A.solid(x-.68,x+.68,z-.68,z+.68);
  }

  function writingDesk(A,c,x,z,w=3.2,tag='书法台') {
    const {box,ball,capsule,taper,cyl,shade}=A;
    stadium(A,x,.74,z,w,1.05,.14,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    stadium(A,x,.835,z,w-.18,.87,.045,c.limestoneL,{gloss:.19,tag});
    box(x,.866,z,w*.70,.020,.58,c.paper,{hard:true,gloss:.035,tag});
    // Rolled scroll ends, ink stone, brush rest and three supported brushes.
    for(const s of [-1,1])capsule(x+s*w*.33,.90,z,.035,.60,.035,c.bronzeD,
      {rx:Math.PI/2,gloss:.62,tag});
    stadium(A,x-w*.34,.90,z+.25,.50,.28,.035,c.ink,{hard:true,gloss:.14,tag});
    ball(x-w*.34,.925,z+.25,.11,.012,.08,c.inkL,{mode:1,gloss:.42,tag});
    box(x+w*.26,.91,z+.24,.58,.10,.12,c.bronzeD,{mode:7,gloss:.60,tag});
    for(let i=0;i<3;i++) {
      capsule(x+w*.15+i*.14,.99,z+.24,.015,.48,.015,i===1?c.lacquerD:c.walnutD,
        {rz:Math.PI/2,gloss:.36,tag});
      taper(x+w*.40+i*.14,.99,z+.24,.030,.12,.014,c.ink,{rz:Math.PI/2,tag});
    }
    for(const s of [-1,1]) {
      taper(x+s*(w/2-.24),.37,z,.10,.74,.070,c.walnutD,{hard:true,gloss:.29,tag});
      cyl(x+s*(w/2-.24),.035,z,.12,.07,c.bronzeL,{gloss:.66,tag});
    }
    shade(x,z,w+.18,1.25,.21);
    A.solid(x-w/2+.10,x+w/2-.10,z-.43,z+.43);
  }

  function scrollWall(A,c,x,z,w=5.6,tag='藏书架') {
    const {box,cyl,capsule,glyphs}=A;
    box(x,.09,z,w,.18,.74,c.walnutD,{hard:true,gloss:.27,tag});
    box(x,1.44,z,w,2.70,.22,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag});
    box(x,2.84,z,w+.16,.16,.62,c.bronzeD,{hard:true,gloss:.62,tag});
    for(let bay=0;bay<5;bay++) {
      const bx=x-w*.40+bay*w*.20;
      box(bx,1.43,z-.13,w*.17,2.42,.035,bay%2?c.silkL:c.celadonL,
        {hard:true,mode:1,gloss:.05,tag});
      for(let i=0;i<4;i++) {
        const yy=.51+i*.53;
        cyl(bx-w*.055+i%2*w*.055,yy,z-.19,.12,.36,i%3===0?c.lacquer:c.paper,
          {rz:Math.PI/2,gloss:.10,tag});
        capsule(bx-w*.055+i%2*w*.055,yy,z-.405,.018,.28,.018,c.bronzeL,
          {rz:Math.PI/2,gloss:.66,tag});
      }
    }
    glyphs(x,3.02,z-.19,Math.PI,'藏书架',{size:.14,gap:.025,color:c.bronzeL,
      mode:1,lift:.007,tag});
    A.solid(x-w/2,x+w/2,z-.42,z+.16);
  }

  // Shallow, double-finished artwork for long programme walls.  Every layer is only a few
  // centimetres deep and deliberately has no `solid` footprint: it articulates an existing wall
  // without narrowing the gallery or changing any of the verified routes.
  function landscapePanelZ(A,c,x,y,z,w,h,title='',tag='会所水墨') {
    const {box,ball,capsule,glyphs,luminous}=A;
    box(x,y,z,w,h,.075,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.29,tag});
    box(x,y+h/2+.055,z,w+.18,.11,.18,c.bronzeD,{hard:true,gloss:.61,tag});
    for(const face of [-1,1]) {
      const zz=z+face*.055, front=zz+face*.027;
      // mode 7 is the woven-fabric shader and the cloth tuple gives it a weave; this used to be
      // mode 1, which is emissive — it ignored the room's light entirely, so every panel on the
      // floor rendered as a flat blazing rectangle whatever the hour.
      box(x,y,zz,w-.20,h-.20,.030,c.silkL,{...MAT.cloth,hard:true,mode:7,gloss:.045,tag});
      // Pale limestone horizon and layered celadon/ink hills make this read as a composed
      // landscape, rather than a single ochre rectangle.
      box(x,y-h*.19,front,w-.40,h*.38,.018,c.plasterL,
        {...MAT.stone,hard:true,gloss:.035,tag});
      for(let i=0;i<5;i++) {
        const u=-w*.35+i*w*.175;
        ball(x+u,y-h*.08+(i%2)*h*.055,front+face*.012,
          w*(.105+(i%3)*.018),h*(.13+(i%2)*.035),.018,
          i%3===0?c.hillInk:(i%3===1?c.hillCelo:c.hillBlue),
          {gloss:.025,tag});
      }
      for(let i=0;i<3;i++)capsule(x-w*.31+i*w*.31,y-h*.27+i*h*.055,
        front+face*.022,.015,w*.34,.015,c.bronze,
        {rz:Math.PI/2-.10+i*.08,gloss:.60,tag});
      // A grounded seal and slim title field give each panel a recognisable cultural identity.
      box(x+w*.36,y-h*.29,front+face*.032,.17,.17,.015,c.lacquer,
        {hard:true,mode:1,glow:.018,tag});
      if(title)glyphs(x+w*.29,y+h*.23,front+face*.034,face>0?0:Math.PI,title,
        {size:Math.min(.145,(w*.29)/Math.max(2,[...title].length)),gap:.024,
          color:c.walnutD,mode:1,lift:.006,tag});
      const lamp=box(x,y+h/2+.19,front+face*.020,w*.34,.055,.055,c.bronzeL,
        {hard:true,gloss:.67,tag});
      luminous(lamp,.016,.06);
    }
  }

  function suiteBackdrop(A,c,x,z,w=6.55,tag='套房床头背景') {
    const {box,ball,capsule,glyphs,luminous}=A;
    // A layered wall-sized frame sits behind the existing upholstered headboard.  It is a visual
    // datum only—thin enough to remain inside the perimeter wall and never registered as solid.
    box(x,1.72,z,w,3.12,.075,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.28,tag});
    box(x,1.72,z+.052,w-.22,2.90,.035,c.plasterL,
      {...MAT.stone,hard:true,gloss:.035,tag});
    box(x,2.72,z+.075,w-.48,.34,.020,c.celadonL,
      {...MAT.cloth,hard:true,mode:7,gloss:.06,tag});
    // Two battens, at the frame's quarter points, not seven across the full height. The old run
    // put a bronze rod every 0.86 m straight over the painting, which is the raked-rod-on-a-blank-
    // field motif this building has already removed from floors 5 and 6: it reads as an unhung
    // canvas with scaffolding on it, and it cut the landscape into strips.
    for(const s of [-1,1])box(x+s*(w-.56)/4,1.70,z+.078,.022,2.56,.020,
      c.bronze,{hard:true,gloss:.62,tag});
    // The quiet landscape remains visible above and to either side of the padded headboard.
    // Opaque, pre-mixed against the plaster ground — see the hill tones in palette().
    for(let i=0;i<5;i++)ball(x-w*.30+i*w*.15,2.18+(i%2)*.13,z+.096,
      .52+(i%3)*.08,.20+(i%2)*.06,.018,i%2?c.hillCeloL:c.hillBlueL,
      {gloss:.025,tag});
    glyphs(x,2.72,z+.104,0,'静雅',{size:.135,gap:.034,color:c.walnutD,
      mode:1,lift:.006,tag});
    for(const s of [-1,1]) {
      const sx=x+s*(w/2-.34);
      box(sx,2.15,z+.10,.20,.52,.028,c.bronzeD,{hard:true,gloss:.60,tag});
      capsule(sx,2.15,z+.125,.028,.40,.028,c.bronzeL,{gloss:.67,tag});
      luminous(ball(sx,2.15,z+.16,.080,.115,.055,c.warm,{mode:1,tag}),.05,.22);
    }
  }

  // Sealing the bedroom's old bath door made the east partition the suite's longest uninterrupted
  // plane, so it carries the bedroom's art wall.  This is the x-normal counterpart of
  // landscapePanelZ: a walnut frame, silk field, ink horizon, bronze battens, a grounded seal and
  // a picture light.  Every layer is a few centimetres deep and none registers collision, so it
  // articulates the wall without narrowing the room or moving the verified enfilade.
  function suiteArtX(A,c,x,z,w,h,title='',tag='套房壁画') {
    const {box,ball,capsule,glyphs,luminous}=A;
    box(x,1.86,z,.075,h,w,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.29,tag});
    box(x-.052,1.86,z,.035,h-.24,w-.24,c.silkL,{...MAT.cloth,hard:true,mode:7,gloss:.045,tag});
    box(x-.074,1.86-h*.24,z,.018,h*.34,w-.48,c.plasterL,
      {...MAT.stone,hard:true,gloss:.035,tag});
    for(let i=0;i<5;i++)
      ball(x-.088,1.96+(i%2)*.14,z-w*.30+i*w*.15,.018,h*(.12+(i%2)*.03),
        w*(.09+(i%3)*.018),i%3===0?c.hillInk:(i%3===1?c.hillCelo:c.hillBlue),
        {gloss:.025,tag});
    for(let i=0;i<3;i++)
      capsule(x-.098,1.50+i*.11,z-w*.28+i*w*.28,.014,w*.30,.014,c.bronze,
        {rx:Math.PI/2,gloss:.60,tag});
    box(x-.10,1.30,z+w*.34,.015,.17,.17,c.lacquer,{hard:true,mode:1,glow:.018,tag});
    if(title)glyphs(x-.104,1.86+h*.30,z,-Math.PI/2,title,
      {size:.135,gap:.026,color:c.walnutD,mode:1,lift:.006,tag});
    box(x-.028,1.86+h/2+.055,z,.18,.11,w+.18,c.bronzeD,{hard:true,gloss:.61,tag});
    luminous(box(x-.09,1.86+h/2+.17,z,.055,.055,w*.44,c.bronzeL,
      {hard:true,gloss:.67,tag}),.016,.06);
  }

  function reception(A,c,x,z) {
    const {box,cyl,capsule,ball,glyphs,shade}=A;
    stadium(A,x,.49,z,3.80,.86,.86,c.walnutD,{...MAT.timber,mode:7,gloss:.30,tag:'会所前台'});
    stadium(A,x,.95,z,3.98,1.00,.10,c.limestoneL,{gloss:.22,tag:'会所前台'});
    stadium(A,x,.995,z,3.28,.63,.025,c.celadonL,{hard:true,gloss:.30,tag:'会所前台'});
    for(let i=-2;i<=2;i++) {
      const px=x+i*.64;
      capsule(px,.48,z-.445,.022,.57,.022,c.bronzeL,{gloss:.66,tag:'会所前台'});
      ball(px,.48,z-.47,.035,.035,.020,c.bronzeL,{gloss:.67,tag:'会所前台'});
    }
    glyphs(x,.55,z-.455,Math.PI,'雅集',{size:.20,gap:.055,color:c.bronzeL,
      mode:1,glow:.035,lift:.007,tag:'会所前台'});
    // Registration folio, bell, pen tray and a real monitor on a weighted stem.
    box(x-.72,1.04,z-.10,.72,.025,.42,c.paper,{hard:true,ry:.10,gloss:.04,tag:'会所前台'});
    cyl(x+.50,1.05,z-.10,.12,.05,c.bronzeD,{gloss:.62,tag:'会所前台'});
    ball(x+.50,1.10,z-.10,.065,.055,.065,c.bronzeL,{gloss:.69,tag:'会所前台'});
    box(x+1.25,1.35,z+.03,.76,.54,.055,c.ink,{hard:true,gloss:.28,tag:'会所前台'});
    box(x+1.25,1.35,z-.005,.65,.43,.018,c.blue,{hard:true,mode:1,glow:.06,tag:'会所前台'});
    capsule(x+1.25,1.08,z+.03,.035,.35,.035,c.bronzeD,{gloss:.61,tag:'会所前台'});
    cyl(x+1.25,1.005,z+.03,.22,.035,c.bronzeD,{gloss:.62,tag:'会所前台'});
    shade(x,z,4.15,1.18,.26);
    A.solid(x-1.90,x+1.90,z-.43,z+.43);
  }

  function bed(A,c,x,z,w=2.55,tag='套房床') {
    const {box,ball,capsule,cyl,shade}=A;
    // The upholstered headboard and mattress both meet a continuous shadow plinth; curved bolster
    // ends and piped pillows soften the silhouette without enlarging its measured footprint.
    box(x,.11,z,w+.28,.22,3.02,c.walnutD,{...MAT.timber,mode:6,gloss:.26,tag});
    box(x,.34,z,w+.12,.42,2.84,c.walnut,{...MAT.timber,mode:7,gloss:.29,tag});
    box(x,.61,z,w,.34,2.68,c.silkL,{...MAT.cloth,mode:7,gloss:.025,tag});
    box(x,.79,z+.40,w-.12,.12,1.75,c.white,{...MAT.stone,mode:7,gloss:.018,tag});
    for(const s of [-1,1]) {
      const px=x+s*w*.27;
      box(px,.84,z-.70,w*.42,.20,.70,c.white,{...MAT.stone,mode:7,gloss:.018,rz:s*.05,tag});
      capsule(px,.84,z-.70,.025,w*.34,.025,c.bronzeL,
        {rz:Math.PI/2+s*.05,gloss:.62,tag});
    }
    box(x,1.45,-14.08,w+.46,1.65,.22,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.29,tag});
    box(x,1.45,-13.945,w+.18,1.39,.065,c.silk,{...MAT.cloth,hard:true,mode:7,gloss:.025,tag});
    for(let i=-2;i<=2;i++)capsule(x+i*w*.18,1.45,-13.90,.018,1.12,.018,c.bronzeL,
      {rz:i*.05,gloss:.62,tag});
    for(const s of [-1,1]) {
      cyl(x+s*(w/2-.18),.035,z+1.24,.10,.07,c.bronzeL,{gloss:.66,tag});
      ball(x+s*(w/2-.18),.12,z+1.24,.08,.08,.08,c.walnutD,{gloss:.25,tag});
    }
    shade(x,z,w+.45,3.18,.25);
    A.solid(x-w/2-.12,x+w/2+.12,-14.47,z+1.46);
  }

  function bedside(A,c,x,z,tag='床头柜') {
    const {box,cyl,capsule,taper,ball,luminous}=A;
    box(x,.06,z,.62,.12,.56,c.walnutD,{gloss:.27,tag});
    stadium(A,x,.34,z,.68,.60,.49,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    box(x,.35,z-.305,.50,.25,.025,c.walnutL,{hard:true,gloss:.29,tag});
    capsule(x,.35,z-.33,.022,.20,.022,c.bronzeL,{rz:Math.PI/2,gloss:.69,tag});
    stadium(A,x,.605,z,.74,.64,.055,c.limestoneL,{gloss:.20,tag});
    cyl(x,.66,z,.15,.07,c.bronzeD,{gloss:.62,tag});
    capsule(x,.90,z,.032,.46,.032,c.bronze,{gloss:.67,tag});
    taper(x,1.22,z,.40,.39,.40,c.silkL,{...MAT.cloth,mode:7,gloss:.035,tag});
    luminous(ball(x,1.19,z,.075,.09,.075,c.warm,{mode:1,tag}),.035,.28);
    ball(x,1.48,z,.045,.052,.045,c.bronzeL,{gloss:.68,tag});
  }

  function wardrobe(A,c,x,z,w=3.4,tag='衣帽柜') {
    const {box,capsule,glyphs}=A;
    box(x,.08,z,w,.16,.70,c.walnutD,{hard:true,gloss:.27,tag});
    box(x,1.45,z,w,2.72,.40,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag});
    box(x,2.88,z,w+.12,.16,.58,c.bronzeD,{hard:true,gloss:.62,tag});
    for(let i=0;i<3;i++) {
      const px=x-w/3+(i+.5)*w/3;
      // The middle leaf was mode 1 — emissive — so the wardrobe had one panel that ignored the
      // room and rendered as a lit white slab between two timber ones. Silk on a wardrobe door
      // is fabric, not a light fitting.
      box(px,1.44,z-.225,w/3-.06,2.50,.035,i===1?c.celadonL:c.walnutL,
        i===1?{...MAT.cloth,hard:true,mode:7,gloss:.12,tag}
             :{...MAT.timber,hard:true,mode:6,gloss:.29,tag});
      capsule(px+(i%2?-.18:.18),1.44,z-.26,.022,.42,.022,c.bronzeL,
        {gloss:.68,tag});
    }
    glyphs(x,2.66,z-.27,Math.PI,'衣帽柜',{size:.105,gap:.022,color:c.bronzeL,
      mode:1,lift:.006,tag});
    A.solid(x-w/2,x+w/2,z-.38,z+.28);
  }

  function desk(A,c,x,z,w=2.1,tag='书桌') {
    const {box,capsule,cyl,shade}=A;
    stadium(A,x,.74,z,w,.82,.14,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    stadium(A,x,.835,z,w-.14,.68,.035,c.limestoneL,{gloss:.19,tag});
    box(x,.86,z-.02,w*.58,.020,.42,c.silkL,{hard:true,gloss:.025,tag});
    for(const s of [-1,1]) {
      A.taper(x+s*(w/2-.19),.37,z,.085,.74,.060,c.bronzeD,{hard:true,gloss:.57,tag});
      cyl(x+s*(w/2-.19),.035,z,.105,.07,c.bronzeL,{gloss:.66,tag});
    }
    capsule(x+w*.28,.89,z+.05,.022,.18,.022,c.bronzeD,{rz:Math.PI/2,gloss:.58,tag});
    shade(x,z,w+.18,1.0,.20);
    A.solid(x-w/2+.10,x+w/2-.10,z-.32,z+.32);
  }

  function bath(A,c,x,z,tag='套房浴缸') {
    const {box,cyl,ball,capsule,taper,luminous,shade}=A;
    // Stone cradle, recessed blue water, overflow, mixer and hand shower all meet their supports.
    stadium(A,x,.39,z,3.12,1.62,.70,c.limestone,{...MAT.stone,mode:7,gloss:.20,tag});
    stadium(A,x,.66,z,2.64,1.18,.20,c.limestoneL,{...MAT.stone,mode:7,gloss:.22,tag});
    stadium(A,x,.735,z,2.36,.94,.055,c.water,{mode:1,alpha:.82,gloss:.82,tag});
    for(let i=0;i<7;i++) {
      const px=x-1.0+i*.33;
      luminous(ball(px,.758,z+(i%2?-.15:.15),.05,.018,.025,c.white,
        {mode:1,alpha:.32,tag}),.02,.06);
    }
    cyl(x+1.13,.86,z-.50,.14,.10,c.bronzeD,{gloss:.64,tag});
    capsule(x+1.13,1.06,z-.50,.032,.38,.032,c.bronzeL,{gloss:.68,tag});
    capsule(x+.90,1.20,z-.50,.035,.46,.035,c.bronzeL,
      {rz:Math.PI/2,gloss:.68,tag});
    taper(x+.67,1.20,z-.50,.06,.16,.035,c.bronzeL,
      {rz:Math.PI/2,gloss:.68,tag});
    capsule(x+1.43,1.09,z-.50,.025,.46,.025,c.bronzeD,{gloss:.62,tag});
    ball(x+1.43,1.34,z-.50,.10,.06,.10,c.bronzeL,{gloss:.68,tag});
    shade(x,z,3.35,1.85,.24);
    A.solid(x-1.56,x+1.56,-14.46,z+.81);
  }

  function vanity(A,c,x,z,tag='石材浴室') {
    const {box,cyl,capsule,taper,ball,luminous,glyphs}=A;
    box(x,.47,z,.72,.82,2.55,c.walnutD,{...MAT.timber,mode:6,gloss:.28,tag});
    // stadium() rounds along its first (long) dimension.  Feed the 2.64 m vanity run as that
    // dimension before rotating it onto the z axis; the former reversed arguments turned the
    // stone top across the bathroom and through the east wall while its base/collider ran north.
    stadium(A,x,.91,z,2.64,.86,.10,c.limestoneL,{gloss:.22,ry:Math.PI/2,tag});
    for(const s of [-1,1]) {
      const pz=z+s*.71;
      cyl(x-.17,.98,pz,.22,.08,c.white,{rz:Math.PI/2,gloss:.31,tag});
      capsule(x-.24,1.19,pz,.032,.34,.032,c.bronzeL,{gloss:.68,tag});
      taper(x-.24,1.36,pz,.055,.17,.030,c.bronzeL,{gloss:.68,tag});
      luminous(cyl(x-.34,2.01,pz,.54,.035,c.glass,
        {rz:Math.PI/2,mode:1,alpha:.64,gloss:.82,tag}),.012,.04);
      cyl(x-.37,2.01,pz,.59,.025,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag});
    }
    for(const pz of [z-.23,z+.23])capsule(x-.42,.46,pz,.024,.27,.024,c.bronzeL,
      {rx:Math.PI/2,gloss:.68,tag});
    glyphs(x-.43,2.82,z,-Math.PI/2,'静雅',{size:.10,gap:.02,color:c.bronzeL,
      mode:1,lift:.006,tag});
    A.solid(x-.45,x+.45,z-1.28,z+1.28);
  }

  function pantry(A,c) {
    const {box,cyl,capsule,taper,glyphs}=A;
    // North-wall millwork stays wholly inside the pantry's measured west/east partitions.  The
    // earlier 4.65 m carcass crossed the west boundary once that room received its missing wall.
    box(9.60,.08,14.24,4.10,.16,.52,c.walnutD,{hard:true,gloss:.27,tag:'备餐间'});
    box(9.60,.74,14.34,4.10,1.32,.32,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'备餐间'});
    stadium(A,9.60,1.43,14.13,4.20,.70,.10,c.limestoneL,{gloss:.22,tag:'备餐间'});
    for(let i=0;i<4;i++) {
      const x=7.98+i*1.04;
      box(x,.74,14.15,.90,1.05,.025,i%2?c.walnutL:c.celadonL,
        {hard:true,mode:i%2?6:1,gloss:.22,tag:'备餐间'});
      capsule(x,.76,14.11,.022,.25,.022,c.bronzeL,{rz:Math.PI/2,gloss:.68,tag:'备餐间'});
    }
    // Cup rack and stemware are physically tied to a shelf and wall rails.
    box(9.55,2.43,14.26,3.80,.09,.30,c.walnutL,{hard:true,gloss:.30,tag:'杯具消毒'});
    for(const x of [7.78,11.32])capsule(x,2.02,14.10,.030,.86,.030,c.bronzeD,
      {gloss:.64,tag:'杯具消毒'});
    for(let i=0;i<8;i++) {
      const x=8.00+i*.43;
      taper(x,2.63,14.05,.10,.20,.055,c.glass,{mode:1,alpha:.60,gloss:.78,tag:'杯具消毒'});
      capsule(x,2.78,14.05,.018,.12,.018,c.bronzeL,{gloss:.64,tag:'杯具消毒'});
      cyl(x,2.86,14.05,.075,.018,c.glass,{gloss:.78,tag:'杯具消毒'});
    }
    // Induction kettle, tea tins, towel stack and under-counter sanitiser.
    cyl(8.15,1.52,14.05,.26,.06,c.ink,{gloss:.28,tag:'备餐间'});
    taper(8.15,1.69,14.05,.22,.28,.22,c.steel,{gloss:.55,tag:'备餐间'});
    capsule(8.40,1.72,14.05,.045,.33,.045,c.ink,{rz:Math.PI/2,tag:'备餐间'});
    for(let i=0;i<3;i++) {
      cyl(9.05+i*.38,1.57,14.05,.14,.21,i===1?c.lacquer:c.celadon,{gloss:.28,tag:'备餐间'});
      cyl(9.05+i*.38,1.70,14.05,.12,.05,c.bronzeL,{gloss:.65,tag:'备餐间'});
    }
    for(let j=0;j<4;j++)box(10.75,1.48+j*.075,14.03,.72,.07,.44,
      j%2?c.celadonL:c.towel,{...MAT.cloth,mode:7,gloss:.02,tag:'备餐间'});
    glyphs(9.70,3.05,14.18,Math.PI,'备餐间',{size:.14,gap:.026,color:c.bronzeL,
      mode:1,lift:.007,tag:'备餐间'});
    A.solid(7.48,11.72,13.76,14.50);
  }

  function planter(A,c,x,z,r=.50,tag='绿化') {
    const {cyl,taper,capsule,ball}=A;
    cyl(x,.05,z,r*.68,.10,c.bronzeD,{gloss:.56,tag});
    taper(x,.33,z,r,.60,r*.84,c.limestone,{gloss:.18,tag});
    cyl(x,.64,z,r,.10,c.bronzeL,{gloss:.62,tag});
    capsule(x,1.14,z,.065,1.02,.065,c.walnutD,{tag});
    for(let i=0;i<9;i++) {
      const a=i*2.399,rr=.18+(i%3)*.14;
      ball(x+Math.cos(a)*rr,1.48+(i%3)*.12,z+Math.sin(a)*rr,
        .19+(i%2)*.04,.12+(i%3)*.025,.15+(i%2)*.03,i%3?c.green:c.celadon,
        {mode:15,gloss:.08,ry:a,tag});
    }
  }

  function roomThing(A,hz,x,z,zh,en,note,focus=[x,z],reach=1.8) {
    return A.thing(hz,x,1.30,z,zh,en,note,{tag:hz,focus,reach});
  }

  HotelFit.register('hotel9',A=>{
    const c=palette(A);
    const {box,cyl,ball,capsule,flat,glyphs,solid,shade,luminous}=A;

    // Chase-camera volumes follow actual partitions.  Small wet/service rooms are registered
    // first; the remaining club and suite volumes do not overlap, so doorway hysteresis cannot
    // trap the camera in a larger room after the body has crossed a threshold.
    if(A.cameraRoom) {
      A.cameraRoom('hotel9-suite-bath',5.62,10.46,-14.46,-9.43,2.45);
      A.cameraRoom('hotel9-pantry',7.42,11.78,11.42,14.44,2.55);
      A.cameraRoom('hotel9-suite-living',-12.44,-2.75,-14.46,-5.43,3.05);
      A.cameraRoom('hotel9-suite-bedroom',-2.55,5.44,-14.46,-5.43,2.95);
      A.cameraRoom('hotel9-suite-dressing',5.62,10.46,-9.27,-5.43,2.55);
      A.cameraRoom('hotel9-calligraphy',-15.65,-8.78,5.35,14.44,2.95);
      A.cameraRoom('hotel9-tea-salon',-8.58,1.22,2.20,14.44,3.25);
      A.cameraRoom('hotel9-games',1.45,7.16,5.38,14.38,2.85);
      A.cameraRoom('hotel9-club-gallery',-15.65,11.38,-5.20,1.98,4.05);
      A.cameraRoom('hotel9-lift-landing',11.48,17.84,-7.05,2.05,3.60);
    }

    // ---------------------------------------------------------------- arrival and gallery
    // One broad gallery field replaces the former narrow runner, twin brass rails and repeated
    // centre dashes.  Its dark recessed edge reads as a rug border from every approach, while the
    // uninterrupted interior leaves the shared guest spine visually calm.
    floorField(A,c,-2.10,-1.55,27.00,6.65,c.carpetL,'九楼文化会所');
    // Circular silk-and-jade identity inlay at the club threshold.
    cyl(12.70,.027,-3.70,1.23,.018,c.bronzeD,{gloss:.65,tag:'九楼文化会所'});
    cyl(12.70,.035,-3.70,1.04,.018,c.limestoneL,{gloss:.22,tag:'九楼文化会所'});
    cyl(12.70,.043,-3.70,.68,.018,c.jade,{gloss:.34,tag:'九楼文化会所'});
    for(let i=0;i<8;i++)flat(12.70,.050,-3.70,.075,1.72,c.bronzeL,
      {ry:i*Math.PI/4,gloss:.68,tag:'九楼文化会所'});
    plaqueX(A,c,18.00,3.66,-.20,2.70,'九楼文化会所','9F  CULTURAL CLUB',c.jade);
    // Bronze ceiling cadence and low-glare lanterns establish one coherent gallery.
    box(-1.20,4.04,-4.98,28.0,.12,.14,c.walnutL,{hard:true,gloss:.29,tag:'天花'});
    box(-1.20,4.04,-2.42,28.0,.12,.14,c.walnutL,{hard:true,gloss:.29,tag:'天花'});
    for(const x of [-12,-7.6,-3.2,1.2,5.6,10.0]) {
      box(x,4.04,-3.70,.12,.12,2.68,c.walnutL,{hard:true,gloss:.29,tag:'天花'});
      lantern(A,c,x,3.58,-3.70,.72,'走廊灯笼');
    }
    planter(A,c,11.35,-.35,.47,'绿化');

    reception(A,c,8.75,-.92);
    roomThing(A,'会所前台',8.75,-.92,'在雅集前台登记茶席或文化活动。',
      'Register a tea table or cultural activity at the club reception.',
      '会所 is a private club; 前台 is its reception desk.',[8.75,-2.05],1.85);

    // A framed silk screen announces the sequence without becoming a wall across the route.
    lattice(A,c,4.30,1.58,3.70,2.55,0,'会所屏风',true);
    glyphs(4.30,2.72,1.43,Math.PI,'雅集',{size:.20,gap:.055,color:c.bronzeL,
      mode:1,glow:.035,lift:.007,tag:'九楼文化会所'});
    // Leave a broad opening on each side of the screen: west leads to tea/calligraphy; east to
    // games and the service passage.  The published [0,0] -> [-8,4] guest route stays untouched.

    // ---------------------------------------------------------------- measured cultural-club rooms
    // The cultural programmes previously read as rooms only to the chase camera: their rugs and
    // freestanding lattices did not form complete architectural boundaries.  These shared walls
    // now make each named programme a real room.  Every opening is a measured 3.2 m portal and the
    // two published circulation spines still pass through clear door centres.
    // Run every north/south partition into the shared perimeter wall centreline.  Stopping at
    // z=14.52 left a 26 cm visual crack before the shell's inner face at z=14.78 even though the
    // player's radius happened to make that crack impassable.
    wallX(A,c,-15.75,-5.35,14.90,'文化会所外墙');
    // The club is one club, not four sealed cells.  Besides its own 3.2 m portal onto the gallery,
    // the calligraphy room opens directly into the tea salon through a 2.10 m internal doorway, so
    // the two cultural programmes read as connected alcoves and the club has a second loop.
    // PORTAL EXTENTS. Wall at x = -8.70 runs z 2.10..5.25 and z 7.35..14.90; the authored opening
    // between 书法雅集 and 茶艺沙龙 is z 5.25 .. 7.35, centre 6.30, width 2.10. It is DELIBERATE —
    // the two rooms are one club, not sealed cells (see the note above) — so anything enumerating
    // this wall must declare it rather than treat it as a hole.
    //
    // But the 2.10 m is not what is built. Two later pieces eat into it from both ends:
    //   · the calligraphy cross wall `wallZ(...,-10.60,-8.70,5.25,...)` below puts a collider at
    //     z 5.15..5.35, taking the south edge to z 5.35;
    //   · the tea salon's own credenza run `solid(-8.60,-7.65,6.90,11.86)` takes the north edge
    //     to z 6.90.
    // Clear run as built: z 5.35 .. 6.90 — centre 6.125, width 1.55. At the 0.30 m body radius
    // that is a 0.95 m passable neck (z 5.65..6.60), which is why a boundary scan reports exactly
    // 5.69..6.56 open and the rest of the portal walled. DECLARE 6.125 / 1.55, not 6.30 / 2.10:
    // the wider figure describes the drawn reveal and a body does not fit across it.
    //
    // The credenza is the piece in the wrong place — it was run 0.45 m into a declared portal.
    // Moving it needs its box at :788 (z 9.38, depth 4.92), its limestone rail and its seven jars
    // all shifted together, and a render to confirm; not done here, see the report.
    wallX(A,c,-8.70,2.10,5.25,'会所隔墙');
    wallX(A,c,-8.70,7.35,14.90,'会所隔墙');
    portalX(A,c,-8.70,6.30,2.10,'茶艺沙龙','TEA SALON',c.celadon);
    floorMedallion(A,c,-8.70,6.30,.36,c.celadon,'会所内门槛');
    wallX(A,c,1.35,2.10,14.90,'会所隔墙');
    wallX(A,c,7.30,5.25,14.90,'会所隔墙');

    wallZ(A,c,-8.70,-6.12,2.10,'茶艺沙龙');
    wallZ(A,c,-2.88,1.35,2.10,'茶艺沙龙');
    portalZ(A,c,-4.50,2.10,3.24,'茶艺沙龙','TEA SALON',c.celadon);

    wallZ(A,c,-15.75,-13.80,5.25,'书法雅集');
    wallZ(A,c,-10.60,-8.70,5.25,'书法雅集');
    portalZ(A,c,-12.20,5.25,3.20,'书法雅集','CALLIGRAPHY',c.lacquer);

    wallZ(A,c,1.35,2.93,5.25,'棋牌室');
    wallZ(A,c,6.17,7.30,5.25,'棋牌室');
    // The service distribution bay is a compact room-like field, not a continuation of the
    // gallery runner.  It also masks the shared shell's long structural inlay beneath this floor.
    floorField(A,c,9.60,7.95,4.15,6.25,c.limestone,'会所服务前厅',c.bronzeD);

    // ---------------------------------------------------------------- tea salon, northwest centre
    floorField(A,c,-3.68,8.48,9.55,11.95,c.silk,'茶艺沙龙');
    floorMedallion(A,c,-4.50,2.62,.52,c.celadon,'茶艺沙龙门槛');
    ceilingRaft(A,c,-4.50,7.10,8.2,3.10,'茶艺沙龙天花');
    ceilingRaft(A,c,-4.50,11.25,8.2,3.10,'茶艺沙龙天花');
    for(const x of [-7.25,-1.75])for(const z of [7.10,11.25])lantern(A,c,x,3.20,z,.84,'茶艺沙龙灯笼');
    // Main demonstration table, plus two quieter conversation settings.
    roundTable(A,c,-5.60,6.05,.82,'功夫茶席');
    teaSet(A,c,-5.60,6.05,.84,'功夫茶席');
    for(const [dx,dz,yaw] of [[0,-1.26,0],[1.26,0,-Math.PI/2],[0,1.26,Math.PI],[-1.26,0,Math.PI/2]])
      chair(A,c,-5.60+dx,6.05+dz,yaw,c.silk,'功夫茶席');
    roomThing(A,'功夫茶席',-5.60,6.05,'茶艺师以盖碗冲泡一席功夫茶。',
      'The tea specialist prepares a full gongfu tea service.',
      '功夫茶 is a careful, multi-infusion style of tea service.',[-5.60,4.62],1.75);

    for(const [x,z] of [[-2.05,8.85],[-5.95,11.35]]) {
      roundTable(A,c,x,z,.68,'茶席');teaSet(A,c,x,z,.84,'茶席');
      for(const [dx,dz,yaw] of [[0,-1.10,0],[1.10,0,-Math.PI/2],[0,1.10,Math.PI],[-1.10,0,Math.PI/2]])
        chair(A,c,x+dx,z+dz,yaw,c.celadonL,'茶席');
    }
    roomThing(A,'茶席',-2.05,8.85,'在窗边茶席慢慢品一壶岩茶。',
      'Take time over a pot of rock oolong at the window table.',
      '茶席 is a prepared tea setting.',[-.90,8.85],1.65);
    // Low cabinets support tea canisters, water kettle and folded service cloths.
    box(-8.22,.46,9.38,.76,.78,4.92,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'茶艺沙龙'});
    box(-7.80,.89,9.38,.10,.08,4.96,c.limestoneL,{hard:true,gloss:.20,tag:'茶艺沙龙'});
    for(let i=0;i<7;i++) {
      const z=7.15+i*.68;
      cyl(-7.72,1.02,z,.15,.22,i%3===0?c.lacquer:c.celadon,{gloss:.28,tag:'茶艺沙龙'});
      cyl(-7.72,1.16,z,.13,.05,c.bronzeL,{gloss:.66,tag:'茶艺沙龙'});
    }
    solid(-8.60,-7.65,6.90,11.86);

    // ---------------------------------------------------------------- calligraphy lounge, west
    floorField(A,c,-12.23,10.03,6.65,9.15,c.limestoneL,'书法雅集');
    floorMedallion(A,c,-12.20,5.77,.50,c.lacquer,'书法雅集门槛');
    // A shallow lattice dresses the calligraphy side of its real wall; collision belongs to the
    // wall itself, so there is no duplicate or offset invisible barrier.
    lattice(A,c,-8.83,10.85,5.20,2.75,Math.PI/2,'书法屏风',false);
    writingDesk(A,c,-12.15,8.40,3.35,'书法台');
    chair(A,c,-12.15,7.25,0,c.silkRose,'书法台');
    roomThing(A,'书法台',-12.15,8.40,'铺开宣纸，练习一行楷书。',
      'Unroll the paper and practise a line of regular-script calligraphy.',
      '书法 is calligraphy; 文房四宝 are the brush, ink, paper and inkstone.',[-12.15,6.98],1.80);
    roomThing(A,'文房四宝',-11.00,8.40,'查看笔、墨、纸、砚的摆放。',
      'Inspect the arrangement of brush, ink, paper and inkstone.',
      '文房四宝 means the four treasures of the study.',[-10.60,7.15],1.75);
    scrollWall(A,c,-12.20,14.18,5.85,'藏书架');
    roomThing(A,'藏书架',-12.20,13.75,'浏览会所收藏的碑帖和画册。',
      'Browse the club collection of rubbings and art books.',
      '碑帖 are albums of inscriptions used for calligraphy study.',[-12.20,12.62],1.65);
    // Three connected hanging scrolls: framed paper, ink landscape and grounded red seal.
    for(let i=0;i<3;i++) {
      const x=-14.75+i*2.55;
      box(x,2.10,13.77,2.08,2.34,.055,c.walnutD,{hard:true,gloss:.29,tag:'水墨长卷'});
      box(x,2.10,13.73,1.86,2.12,.024,c.paper,{...MAT.cloth,hard:true,mode:7,gloss:.035,tag:'水墨长卷'});
      for(let j=0;j<4;j++)ball(x-.46+j*.31,1.72+(j%2)*.17,13.69,
        .38,.16+(j%2)*.06,.025,j%3?c.hillInk:c.hillCelo,{gloss:.03,tag:'水墨长卷'});
      capsule(x-.43,2.12,13.68,.025,.70,.025,c.ink,{rz:-.55,gloss:.12,tag:'水墨长卷'});
      box(x+.66,1.26,13.68,.14,.14,.018,c.lacquer,{hard:true,mode:1,glow:.025,tag:'水墨长卷'});
    }

    // ---------------------------------------------------------------- board-game room, northeast centre
    floorField(A,c,4.33,10.03,5.55,9.15,c.carpetL,'棋牌室');
    floorMedallion(A,c,4.55,5.77,.50,c.jade,'棋牌室门槛');
    portalZ(A,c,4.55,5.25,3.25,'棋牌室','BOARD GAMES',c.jade);
    // Side screens are now finish layers on the room's two measured walls.  They preserve the
    // carved-timber character without inventing a second collision plane beside either wall.
    lattice(A,c,1.48,10.15,7.00,2.70,Math.PI/2,'棋牌室屏风',false);
    lattice(A,c,7.17,10.15,7.00,2.70,Math.PI/2,'棋牌室屏风',false);
    ceilingRaft(A,c,4.55,8.05,5.65,2.70,'棋牌室天花');
    ceilingRaft(A,c,4.55,12.00,5.65,2.70,'棋牌室天花');
    lantern(A,c,4.55,3.20,8.05,.85,'棋牌室灯笼');
    lantern(A,c,4.55,3.20,12.00,.85,'棋牌室灯笼');
    gameTable(A,c,4.55,8.15,'麻将桌');
    gameTable(A,c,4.55,11.85,'围棋桌');
    roomThing(A,'麻将桌',4.55,8.15,'与会所客人打一圈休闲麻将。',
      'Play a relaxed round of mahjong with club guests.',
      '麻将 is mahjong.',[3.18,8.15],1.65);
    roomThing(A,'围棋桌',4.55,11.85,'在十九路棋盘上下围棋。',
      'Play a game of Go on the nineteen-line board.',
      '围棋 is the strategy game Go.',[3.18,11.85],1.65);

    // ---------------------------------------------------------------- service pantry
    // It begins north of the published [9,5.1] -> [9,10] service spine.  The 1.5 m centred door
    // below is the final continuation of that route, while the shared directory at [13.55,10.55]
    // remains in the open landing to its east.
    floorField(A,c,9.60,13.04,4.15,2.92,c.limestoneL,'备餐间',c.bronzeD);
    floorMedallion(A,c,9.06,11.76,.40,c.celadon,'备餐间门槛');
    wallZ(A,c,7.30,8.30,11.30,'备餐间');
    wallZ(A,c,9.82,11.90,11.30,'备餐间');
    wallX(A,c,11.90,11.30,14.90,'备餐间');
    portalZ(A,c,9.06,11.30,1.78,'备餐间','PANTRY',c.celadon);
    pantry(A,c);
    roomThing(A,'备餐间',9.05,12.20,'备餐间补充茶水、杯具和客房欢迎礼。',
      'The pantry replenishes tea, glassware and suite welcome amenities.',
      '备餐间 is a service pantry.',[9.05,10.68],1.75);
    roomThing(A,'杯具消毒',9.15,14.02,'检查清洁后的茶杯和高脚杯。',
      'Inspect the cleaned teacups and stemware.',
      '消毒 means sanitise.',[9.15,12.90],1.65);

    // ---------------------------------------------------------------- Junior Suite 903, south facade
    wallZ(A,c,-12.55,-9.35,-5.35,'小套房');
    wallZ(A,c,-7.35,10.55,-5.35,'小套房');
    wallX(A,c,-12.55,-14.90,-5.35,'小套房');
    wallX(A,c,10.55,-14.90,-5.35,'小套房');
    portalZ(A,c,-8.35,-5.35,2.20,'小套房九零三','JUNIOR SUITE 903',c.lacquer);
    // The suite-facing gallery wall is intentionally a sequence of framed cultural moments,
    // not an uninterrupted hotel-corridor slab.  These panels sit within the wall finish and do
    // not add collision or disturb either public route around the club screen.
    landscapePanelZ(A,c,-10.95,1.92,-5.35,2.62,2.48,'九零三','小套房九零三');
    landscapePanelZ(A,c,-4.67,1.92,-5.35,4.72,2.48,'茶艺','会所水墨');
    landscapePanelZ(A,c,1.03,1.92,-5.35,5.92,2.48,'水墨雅集','会所水墨');
    landscapePanelZ(A,c,7.17,1.92,-5.35,5.46,2.48,'棋牌','会所水墨');
    roomThing(A,'小套房',-8.35,-5.35,'九零三小套房包括玄关、起居室、卧室和石材浴室。',
      'Junior Suite 903 includes an entry, living room, bedroom and stone bathroom.',
      '小套房 is a junior suite.',[-8.35,-4.32],1.75);

    // Broad living and sleeping fields replace the entry runner and its two lane-like brass
    // stripes.  A small threshold roundel now marks arrival without drawing the eye down a line.
    floorField(A,c,-7.60,-10.10,9.28,8.88,c.silk,'套房起居室');
    floorField(A,c,1.43,-10.10,7.62,8.88,c.carpetL,'套房卧室');
    floorMedallion(A,c,-8.35,-5.92,.52,c.lacquer,'九零三门槛');
    // Rounded bench, luggage shelf and a framed silk key drop furnish the entry bay.
    stadium(A,-10.95,.41,-7.20,1.95,.66,.25,c.silk,{...MAT.cloth,mode:7,gloss:.035,tag:'玄关'});
    for(const s of [-1,1]) {
      A.taper(-10.95+s*.73,.20,-7.20,.075,.40,.055,c.walnutD,{gloss:.29,tag:'玄关'});
      cyl(-10.95+s*.73,.025,-7.20,.09,.05,c.bronzeL,{gloss:.66,tag:'玄关'});
    }
    box(-11.96,1.78,-7.20,.055,2.32,2.25,c.walnutD,{hard:true,gloss:.29,tag:'玄关'});
    box(-11.92,1.78,-7.20,.025,2.08,2.00,c.celadonL,{hard:true,mode:1,gloss:.05,tag:'玄关'});
    glyphs(-11.88,1.82,-7.20,-Math.PI/2,'九零三',{size:.16,gap:.035,color:c.lacquer,
      mode:1,lift:.007,tag:'玄关'});

    // Living room is deliberately offset from the entry sightline.  Tailored upholstery, a
    // supported stone tea table, art light and planted corner make it residential, not a lobby.
    sofa(A,c,-10.10,-11.65,2.65,Math.atan2(-7.95-(-10.10),-10.50-(-11.65)),c.silk,'套房起居室');
    lowTable(A,c,-7.95,-10.50,1.55,.84,'欢迎茶');
    teaSet(A,c,-7.95,-10.50,.60,'欢迎茶');
    chair(A,c,-6.15,-11.85,Math.atan2(-7.95-(-6.15),-10.50-(-11.85)),c.celadonL,'套房起居室');
    chair(A,c,-6.10,-9.30,Math.atan2(-7.95-(-6.10),-10.50-(-9.30)),c.silkRose,'套房起居室');
    planter(A,c,-11.20,-13.30,.48,'绿化');
    roomThing(A,'套房起居室',-8.65,-10.85,'在套房起居室的丝绸沙发上放松。',
      'Relax on the tailored silk sofa in the suite living room.',
      '起居室 is a living room.',[-8.58,-9.05],1.85);
    roomThing(A,'欢迎茶',-7.95,-10.50,'客房准备了茉莉花欢迎茶。',
      'The suite has prepared jasmine welcome tea.',
      '欢迎茶 is welcome tea.',[-7.95,-9.25],1.55);

    // A wall divides living and sleeping zones, with a real 2.16 m framed opening aligned to the
    // bed.  The former full-width decorative lattice looked solid but had no collider, so the
    // player could walk through its timber uprights; this portal makes the visible and walkable
    // opening agree exactly with the two wall returns.
    wallX(A,c,-2.65,-14.90,-11.58,'小套房');
    wallX(A,c,-2.65,-9.42,-5.35,'小套房');
    portalX(A,c,-2.65,-10.50,2.16,'套房卧室','BEDROOM',c.celadon);
    suiteBackdrop(A,c,1.05,-14.40,6.55,'套房床头背景');
    bed(A,c,1.05,-12.58,2.65,'套房床');
    bedside(A,c,-.75,-12.35,'床头柜');
    bedside(A,c,2.85,-12.35,'床头柜');
    roomThing(A,'套房床',1.05,-12.35,'在小套房的特大床上休息。',
      'Rest on the junior suite king bed.',
      '套房床 is the suite bed.',[3.25,-11.15],2.10);
    desk(A,c,1.15,-7.05,2.15,'书桌');
    chair(A,c,1.15,-6.00,Math.PI,c.celadonL,'书桌');
    roomThing(A,'书桌',1.15,-7.05,'在套房书桌前写信或处理工作。',
      'Write a letter or work at the suite desk.',
      '书桌 is a writing desk.',[1.15,-5.82],1.60);
    // The walk-in dressing room is a furnished room, not an empty camera volume.  Its wardrobe
    // now sits wholly inside that enclosure instead of crossing the west partition by 30 cm.
    floorField(A,c,8.03,-7.30,4.62,3.58,c.carpetL,'衣帽间',c.bronzeD);
    floorMedallion(A,c,6.04,-7.30,.34,c.celadon,'衣帽间门槛');
    wardrobe(A,c,8.05,-5.78,4.20,'衣帽柜');
    roomThing(A,'衣帽柜',8.05,-5.78,'打开带有行李搁板的衣帽柜。',
      'Open the wardrobe with its integrated luggage shelf.',
      '衣帽柜 is a wardrobe.',[8.05,-6.75],1.65);
    // The enfilade makes this room a place you walk through every time you reach the bath, so it
    // is fitted on two sides rather than left as one wardrobe in an empty box.  The east run and
    // the dressing mirror both sit on their walls; the west-door -> bath-door route stays clear.
    box(10.30,1.45,-7.70,.30,2.72,2.46,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'衣帽间'});
    for(let i=0;i<3;i++) {
      const pz=-8.52+i*.82;
      box(10.135,1.44,pz,.035,2.50,.74,i===1?c.celadonL:c.walnutL,
        {hard:true,mode:i===1?1:6,gloss:i===1?.12:.29,tag:'衣帽间'});
      capsule(10.11,1.44,pz+(i%2?-.20:.20),.022,.42,.022,c.bronzeL,
        {gloss:.68,tag:'衣帽间'});
    }
    box(10.24,.08,-7.70,.42,.16,2.46,c.walnutD,{hard:true,gloss:.27,tag:'衣帽间'});
    box(10.36,2.88,-7.70,.30,.16,2.58,c.bronzeD,{hard:true,gloss:.62,tag:'衣帽间'});
    glyphs(10.10,2.62,-7.70,-Math.PI/2,'衣帽间',{size:.105,gap:.022,color:c.bronzeL,
      mode:1,lift:.006,tag:'衣帽间'});
    solid(10.10,10.47,-8.95,-6.45);
    // Dressing mirror on the west leg of the bath wall — dark reflective glazing, no real
    // reflection pass, per the hotel's material rule.
    box(6.30,1.28,-9.22,.96,2.02,.075,c.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'衣帽间'});
    box(6.30,1.28,-9.18,.80,1.86,.030,c.glassD,{hard:true,mode:1,gloss:.86,tag:'衣帽间'});
    ceilingRaft(A,c,8.03,-7.35,4.20,2.90,'衣帽间天花');
    lantern(A,c,8.03,3.05,-7.35,.78,'衣帽间灯笼');

    // Stone wet room in the southeast corner.  The only opening is on its west side, approached
    // from the bedroom; all walls and large fixtures use footprints matching the visible stone.
    // The suite is an enfilade: 起居室 -> 卧室 -> 衣帽间 -> 石材浴室, entered in that order.
    // The bath therefore has NO door onto the bedroom; its west side runs solid from the south
    // shell to the dressing-room cross wall, and the only way in is the 2.10 m portal through the
    // dressing room's south wall.  That is the whole point of a suite sequence, and it also keeps
    // the wet room off the bedroom's main sightline.
    wallX(A,c,5.52,-14.90,-8.25,'石材浴室');
    wallX(A,c,5.52,-6.35,-5.35,'石材浴室');
    // PORTAL EXTENTS, for anything that has to declare this opening. The wall at z = -9.35 runs
    // x 5.52..6.95 and x 9.05..10.55; the opening between them is x 6.95 .. 9.05, centre 8.00,
    // width 2.10. Take those two numbers, NOT the camera room's edges: `hotel9-suite-bath` and
    // `hotel9-suite-dressing` both run to x 10.46, and a plan that reads 10.46 as the opening's
    // east edge declares a 3.51 m door centred 8.705 and then trips over the second wall run at
    // x 9.05 (measured: blocked at 9.04, one centimetre in). That is the whole of the
    // .hotelcheck.js hotel9 portal failure.
    wallZ(A,c,5.52,6.95,-9.35,'石材浴室');
    wallZ(A,c,9.05,10.55,-9.35,'石材浴室');
    portalZ(A,c,8.00,-9.35,2.10,'石材浴室','STONE BATH',c.jade,1);
    portalX(A,c,5.52,-7.30,1.88,'衣帽间','DRESSING',c.celadon);
    suiteArtX(A,c,5.38,-11.60,3.20,2.30,'水墨','套房壁画');
    flat(8.03,.026,-11.95,4.82,5.02,c.limestoneL,
      {...MAT.stone,mode:7,gloss:.20,tag:'石材浴室'});
    floorMedallion(A,c,8.00,-9.35,.36,c.jade,'石材浴室门槛');
    bath(A,c,8.02,-12.46,'套房浴缸');
    // A built-in rounded stone amenity deck closes the narrow construction chase between the tub
    // and east wall.  It is visible, useful millwork (towels and bath salts), and its measured
    // footprint prevents the player collider from finding a one-cell-wide unreachable slit.
    stadium(A,10.06,.31,-13.25,2.42,.82,.56,c.limestone,
      {...MAT.stone,mode:7,gloss:.19,ry:Math.PI/2,tag:'石材浴室'});
    stadium(A,10.06,.625,-13.25,2.50,.90,.08,c.limestoneL,
      {...MAT.stone,mode:7,gloss:.22,ry:Math.PI/2,tag:'石材浴室'});
    for(let i=0;i<3;i++)box(10.03,.70+i*.075,-13.62,.60,.07,.48,
      i%2?c.celadonL:c.towel,{...MAT.cloth,mode:7,gloss:.02,tag:'石材浴室'});
    for(let i=0;i<2;i++){
      cyl(10.03,.76,-12.82+i*.35,.11,.18,i?c.celadon:c.white,{gloss:.27,tag:'石材浴室'});
      cyl(10.03,.87,-12.82+i*.35,.09,.04,c.bronzeL,{gloss:.66,tag:'石材浴室'});
    }
    solid(9.55,10.60,-14.55,-12.02);
    vanity(A,c,10.02,-10.75,'石材浴室');
    for(let i=0;i<4;i++)box(6.05,.17+i*.09,-13.50,.72,.08,.46,
      i%2?c.celadonL:c.towel,{...MAT.cloth,mode:7,gloss:.02,tag:'石材浴室'});
    // The wet room had no ceiling light of its own: at 19:00 it rendered as a black void behind a
    // lit tub.  A raft and a low pendant give it the same night identity as the rest of the suite.
    // hotel.js lights the plate with three pools on the x=0 spine at radius 8.5.  The wet room and
    // the dressing room sit 8.4 m out at the corner of that reach, so behind their new partitions
    // they rendered as a black void beyond a lit tub.  A real light (build.js light(), always
    // submitted) belongs in each, independent of which camera room the eye happens to be in.
    A.light(8.03,A.H-.75,-12.30,[1,.86,.66],.34,5.8).on=true;
    A.light(8.03,A.H-.75,-7.35,[1,.86,.66],.30,5.2).on=true;
    ceilingRaft(A,c,8.03,-12.30,4.20,2.80,'石材浴室天花');
    lantern(A,c,8.03,3.05,-12.30,.78,'石材浴室灯笼');
    roomThing(A,'套房浴缸',8.02,-12.46,'在带有恒温龙头的石材浴缸里泡澡。',
      'Take a bath in the stone tub with a thermostatic mixer.',
      '浴缸 is a bathtub.',[6.25,-10.35],1.85);

    // A final ceiling layer keys each programme while preserving the open shared shell above.
    ceilingRaft(A,c,-8.20,-10.65,6.70,5.65,'套房起居室天花');
    ceilingRaft(A,c,1.30,-10.25,6.90,6.55,'套房卧室天花');
    for(const [x,z] of [[-8.2,-10.65],[1.3,-10.25]])lantern(A,c,x,3.15,z,.94,'套房灯笼');
  });

  Object.assign(HotelUse.hotel9,{
    '会所前台':{zh:'登记会所活动',py:'dēngjì huìsuǒ huódòng',en:'register a club activity',
      secs:2.0,mins:5,gain:{mood:3},pose:{type:'talk'}},
    '功夫茶席':{zh:'体验功夫茶',py:'tǐyàn gōngfu chá',en:'experience gongfu tea',
      secs:3.6,mins:28,gain:{rest:12,mood:9},pose:{type:'drink',seatY:.49}},
    '茶席':{zh:'坐下品茶',py:'zuòxià pǐnchá',en:'sit for tea',
      secs:3.2,mins:24,gain:{rest:10,mood:7},pose:{type:'drink',seatY:.49}},
    '麻将桌':{zh:'打一圈麻将',py:'dǎ yì quān májiàng',en:'play a round of mahjong',
      secs:4.0,mins:45,gain:{mood:10,rest:3},pose:{type:'play',seatY:.49}},
    '围棋桌':{zh:'下围棋',py:'xià wéiqí',en:'play Go',
      secs:4.0,mins:40,gain:{mood:8,rest:2},pose:{type:'play',seatY:.49}},
    '书法台':{zh:'练习书法',py:'liànxí shūfǎ',en:'practise calligraphy',
      secs:4.0,mins:35,gain:{mood:10,rest:4},pose:{type:'write',seatY:.49}},
    '文房四宝':{zh:'研墨备笔',py:'yánmò bèibǐ',en:'prepare ink and brushes',
      secs:2.4,mins:8,gain:{mood:5},pose:{type:'work'}},
    '藏书架':{zh:'浏览碑帖',py:'liúlǎn bēitiè',en:'browse calligraphy albums',
      secs:3.2,mins:22,gain:{mood:7,rest:4},pose:{type:'read'}},
    '备餐间':{zh:'补充茶水用品',py:'bǔchōng cháshuǐ yòngpǐn',en:'restock tea amenities',
      secs:3.0,mins:15,gain:{rest:-4},pose:{type:'work'}},
    '杯具消毒':{zh:'检查消毒杯具',py:'jiǎnchá xiāodú bēijù',en:'inspect sanitised glassware',
      secs:2.0,mins:5,gain:{},pose:{type:'check'}},
    '小套房':{zh:'参观小套房',py:'cānguān xiǎo tàofáng',en:'tour the junior suite',
      secs:2.0,mins:5,gain:{mood:5},pose:{type:'walk'}},
    '套房起居室':{zh:'在起居室休息',py:'zài qǐjūshì xiūxi',en:'relax in the suite living room',
      secs:3.5,mins:30,gain:{rest:15,mood:9},pose:{type:'sit',seatY:.49}},
    '欢迎茶':{zh:'喝欢迎茶',py:'hē huānyíng chá',en:'drink the welcome tea',
      secs:3.0,mins:18,gain:{rest:8,mood:7},pose:{type:'drink',seatY:.49}},
    '套房床':{zh:'在套房休息',py:'zài tàofáng xiūxi',en:'rest in the suite',
      secs:4.2,mins:105,gain:{rest:39,mood:8},pose:{type:'lie',seatY:.60}},
    '书桌':{zh:'在书桌前工作',py:'zài shūzhuō qián gōngzuò',en:'work at the writing desk',
      secs:3.8,mins:40,gain:{rest:-7,mood:3},pose:{type:'write',seatY:.49}},
    '衣帽柜':{zh:'整理衣物',py:'zhěnglǐ yīwù',en:'organise clothing',
      secs:2.4,mins:10,gain:{},pose:{type:'work'}},
    '套房浴缸':{zh:'泡石材浴缸',py:'pào shícái yùgāng',en:'take a stone bath',
      secs:4.0,mins:38,gain:{clean:36,rest:13,mood:8},pose:{type:'scrub'}},
  });

  const staffLook=(seed,jacket='#596d63')=>({
    skin:['#d8a57e','#c9916b','#e1af87'][seed%3],hair:['#29221f','#352a25','#211d1a'][seed%3],
    hairStyle:seed%2?'bun':'short',top:'#eee8dc',pants:'#34383d',shoe:'#27292c',jacket,
    scarf:'#9b7442',collar:'mandarin',uniform:'staff',tall:.96+(seed%4)*.025,
    wide:.93+(seed%3)*.025,faceSeed:seed,
  });
  const guestLook=(seed,top,style='short')=>({
    skin:['#d9a67e','#c88f68','#e1b088'][seed%3],hair:['#2c2521','#3a302a','#211c19'][seed%3],
    hairStyle:style,top,pants:'#39434a',shoe:'#e6dfd3',collar:seed%2?'crew':'shirt',
    tall:.94+(seed%5)*.025,wide:.91+(seed%3)*.035,faceSeed:seed,
  });

  // The club cast owns local identities; CastCatalog maps each stable hotelGuestId onto the
  // compact shared production pool without aliasing one of the frozen named people.
  const cast=[
    {hotelGuestId:'hotel9-club-tea-su-wen',hz:'会所茶艺师',name:'苏雯',py:'Sū Wén',
      place:'hotel9',gender:'female',ageBand:'adult',temper:'poised',
      look:staffLook(5901,'#536d61'),
      spots:[
        {h0:6.5,h1:11,at:[8.75,-.12],face:Math.PI,act:'hands'},
        {h0:11,h1:24,at:[-5.60,4.55],face:0,act:'vend'},
      ],
      lines:[
        ['欢迎来到九楼雅集，我可以为您安排茶席。','Welcome to the ninth-floor club; I can arrange a tea table for you.'],
        ['今天冲泡的是武夷岩茶。','Today we are preparing Wuyi rock oolong.'],
        ['棋牌室和书法台都不需要另外预约。','The games room and calligraphy table need no separate reservation.'],
      ]},
    {hotelGuestId:'hotel9-calligraphy-gu-yuanzhou',hz:'书法导师',name:'顾远舟',py:'Gù Yuǎnzhōu',
      place:'hotel9',gender:'male',ageBand:'mature',temper:'calm',
      look:{...guestLook(5902,'#5d675f','part'),jacket:'#6d5848',collar:'mandarin'},
      spots:[
        {h0:9,h1:14,at:[-12.15,7.22],face:0,act:'write',held:'brush'},
        {h0:14,h1:21,at:[-10.15,11.15],face:Math.PI/2,act:'read'},
      ],
      lines:[
        ['先稳住手腕，再慢慢落笔。','Steady your wrist before lowering the brush.'],
        ['这套碑帖很适合练习楷书。','This album is well suited to practising regular script.'],
      ]},
    {hotelGuestId:'hotel9-guest-cai-mingqian',hz:'会所住客',name:'蔡明谦',py:'Cài Míngqiān',
      place:'hotel9',gender:'male',ageBand:'adult',temper:'genial',seatY:.49,
      look:guestLook(5911,'#586d79','short'),
      spots:[
        {h0:7.5,h1:14,at:[3.42,8.15],face:Math.PI/2,act:'play',held:'tile'},
        {h0:14,h1:23.5,at:[-10.10,-11.65],face:Math.atan2(2.15,1.15),act:'read'},
      ],
      lines:[
        ['我刚摆好牌，要不要一起玩？','I have just set the tiles; would you like to join?'],
        ['九零三的起居室很安静。','The living room in 903 is very quiet.'],
      ]},
  ];
  for(const n of cast)
    if(!HotelCast.some(q=>q.hotelGuestId===n.hotelGuestId))HotelCast.push(n);
})();
