// 京华大酒店 · guest and luxury floors
//
// Five authored destinations share the measured HotelCore shell and vertical routes, but not a
// plan.  This module owns only their fit-out, local life and future-workplace attachment points.
const HotelGuestFit = Object.freeze({ floors:['hotel5','hotel8','hotel10','hotel11','hotel12'], api:1 });

(() => {
  // Every partition below gets a tag of its own.
  //
  // `hiddenProp` (js/game.js) hides a TAGGED prop by the centre of its whole tag group, so that a
  // cabinet never loses its own door panel to the cutaway. That is right for a fixture: two or
  // three props in one place, judged by a point inside them. It is wrong for a shared label.
  //
  // These eleven partitions all carried the bare shell tag, which is also what the four exterior
  // walls carry (js/hotel.js). Four walls on four sides of the building average to the middle of
  // the floor plate, so every one of these was taking its hide/show decision from a point none of
  // them occupies — and this is shared fit code, so it landed on all five guest floors at once.
  // On floor 8 that was 124 props deciding together. It is the same defect that was reported as
  // "walls render black": they were not black, they were not being drawn.
  //
  // js/home-walls.js:184 is the pattern this follows — one tag per wall stretch, so the group is
  // that wall plus its own skirting and door head. Each of these is a single prop, so a unique
  // tag makes `hiddenProp` judge it by its own centre, which is what it should have done always.
  let wallTagN = 0;
  const wallTag = () => '墙' + (++wallTagN);
  try {
    Glyphs.need(
      '五楼客房五零一五零二五零三标准大床双床无障碍浴室布草间客房服务客房部工作间紧急呼叫欢迎茶阅读椅员工通道' +
      '城南晨雾西山晚照什刹初雪长街灯影京华旧影' +
      '八楼豪华客房八零一八零八转角景观房窗边榻景观浴缸晚安' +
      '十楼行政酒廊早餐图书室商务桌会议室茶台城市天际会员服务' +
      '十一楼京华套房玄关起居室餐厅主卧石材浴室衣帽间水墨京城' +
      '十二楼云端中餐厅天际酒廊观景露台京城夜景零点餐台风雨花园请小心地滑'
    );
  } catch (_) {}

  const TAU=Math.PI*2;
  const hours=mins=>((Number(mins)||0)/60)%24;
  const fixed=(p,r=2.0)=>{p.fixed=true;p.cx=p.ob.x;p.cy=p.ob.y;p.cz=p.ob.z;p.r=r;return p;};
  const hide=M.trs(0,-70,0,0,.001,.001,.001);

  // ---- one scratch matrix for every animated fixture in this file.
  //
  // `M.mul`, `M.trans`, `M.rotY` and `M.rotZ` allocate a fresh Float32Array(16) when they are
  // not handed an output (js/math.js:7,17,19,27). Written that way, the curtains, doors, steam,
  // lanterns and traffic in here allocated between fifty and a hundred and forty matrices per
  // frame per floor, for every frame the player stood on a guest floor — a steady garbage stream
  // whose collections show up as frame spikes rather than as steady cost, which is exactly the
  // shape of failure they were producing.
  //
  // Two things make the fix safe. The scene's ticks are dispatched one after another from a
  // single loop (js/hotel.js:754), never interleaved, so one shared scratch cannot be observed
  // half-written by another tick. And the *output* is never the scratch: every animated part
  // carries its own permanent `out` matrix, seeded from its base so a prop is never submitted
  // with an all-zero transform in the frames before its first tick, and rewritten in place
  // afterwards while the renderer keeps reading the same array.
  //
  // The one rule `M.mul(a,b,o)` imposes is that `o` must not alias `a`: it reads a[] throughout
  // while writing o[], so an aliased first argument corrupts the later columns. Every call
  // below passes the scratch or a base as the arguments and `out` as the output.
  const MS=new Float32Array(16);
  const moving=p=>({p,m:p.m,out:new Float32Array(p.m)});

  function palette(A, extra={}) {
    const c={
      limestone:A.C('#d8cfbf'), limestoneL:A.C('#ebe3d4'), plaster:A.C('#e6dfd2'),
      walnut:A.C('#49352c'), walnutL:A.C('#745444'), walnutD:A.C('#2f2623'),
      bronze:A.C('#9b7442'), bronzeL:A.C('#c5a066'), bronzeD:A.C('#5a432d'),
      celadon:A.C('#8ca99a'), celadonL:A.C('#c1d0c5'), jade:A.C('#496f61'),
      lacquer:A.C('#8d302a'), lacquerD:A.C('#572723'), ink:A.C('#25282a'),
      silk:A.C('#b19a88'), silkL:A.C('#ddd0bf'), carpet:A.C('#62534d'),
      carpetL:A.C('#89756a'), glass:A.C('#8faab3'), glassD:A.C('#24343c'),
      water:A.C('#4b8790'), white:A.C('#f5efe4'), warm:A.C('#ffe3a8'),
      steel:A.C('#8b9092'), towel:A.C('#eee9df'), green:A.C('#52715d'),
      city:A.C('#364650'), cityL:A.C('#69808a'), night:A.C('#111b24'),
      blue:A.C('#385e79'), tea:A.C('#7a542d'), rose:A.C('#a75950'),
      ...extra,
    };
    return c;
  }

  function sign(A,c,x,y,z,yaw,hz,en,w=3.0,accent=c.lacquer) {
    const {box,glyphs,luminous}=A;
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,y,z,w,1.02,.11,c.walnut,{hard:true,ry:yaw,gloss:.32,tag:hz});
    // Every arrival marker is genuinely two-sided.  Several proof cameras approach along the
    // lift corridor, so a single south-facing graphic became a large blank walnut slab edge-on.
    for(const side of [-1,1]){
      // Build's writing yaw follows the surface axis in the opposite handedness to a box ry.
      // This pairing matches the proven west-facing lift labels in hotel.js.
      const syaw=side<0?-yaw:Math.PI-yaw,fx=x+nx*.068*side,fz=z+nz*.068*side;
      luminous(box(fx,y,fz,w-.16,.86,.025,accent,
        {hard:true,ry:syaw,mode:1,tag:hz}),.018,.10);
      // Keep the glyph quad decisively in front of the luminous face.  Its own local lift points
      // back toward the board after yaw, so a two-millimetre gap was enough to depth-fight away.
      const gx=x+nx*.115*side,gz=z+nz*.115*side;
      glyphs(gx,y+.14,gz,syaw,hz,{size:Math.min(.18,(w-.45)/[...hz].length),
        gap:.025,color:c.white,mode:1,lift:.003,tag:hz});
      if(en) glyphs(gx,y-.20,gz,syaw,en,{size:.070,gap:.012,color:c.bronzeL,
        mode:1,lift:.003,tag:hz});
    }
  }

  function signPosts(A,c,x,y,z,yaw,w,tag) {
    const bottom=Math.max(.18,y-.51),ux=Math.cos(yaw),uz=-Math.sin(yaw);
    for(const side of [-1,1]){
      const px=x+ux*side*w*.39,pz=z+uz*side*w*.39;
      // `cyl`, not `capsule`. makeCapsule (js/gl.js:1466) is hemisphere / cylinder / hemisphere
      // with each cap a quarter of the HEIGHT, scaling with sy rather than sx — so a 2.14 m post
      // 32 mm thick drew as two 0.53 m spikes meeting a short band, tapering to a point at the
      // floor. The disc below hid the point well enough that nobody looked twice. js/gl.js:3 says
      // what the primitive is for: "capsules for people."
      //
      // MIND THE ARGUMENT: capsule takes a full WIDTH (sx), cyl takes a RADIUS and doubles it
      // internally (build.js:50, `r * 2`). Converting one to the other by keeping the number the
      // same silently doubles the thickness — which is exactly what I did here on the first pass.
      // sx 0.032 becomes r 0.016.
      A.cyl(px,bottom*.5,pz,.016,bottom,c.bronzeD,{gloss:.62,tag});
      A.cyl(px,.045,pz,.15,.09,c.bronzeD,{gloss:.58,tag});
    }
  }

  function lowPlinth(A,c,x,z,w,d,tag) {
    A.box(x,.09,z,w,.18,d,c.walnutD,{gloss:.24,tag});
  }

  function inkArt(A,c,x,y,z,w,h,seed=0,yaw=0,tag='水墨画') {
    const {box,ball}=A;
    const project=(u,v=0)=>[x+Math.cos(yaw)*u-Math.sin(yaw)*v,
      z-Math.sin(yaw)*u-Math.cos(yaw)*v];
    // The occupied face changes with the two wall orientations used by this fit-out. Keep every
    // mark on the paper plane instead of letting world-X strokes peel away from a rotated frame.
    const faceV=Math.abs(Math.sin(yaw))>.5?-.064:.064;
    // Which way is OUT of the paper. Every mark below sits at faceV plus a small depth, but
    // faceV is negative on the yaw=+-pi/2 walls, so adding a positive depth moved the marks
    // TOWARD the frame and buried them behind the paper: at yaw pi/2 the sheet lands at x+0.064
    // and a 0.010 mark at x+0.054, i.e. inside the board. Floor 10 reported its 京城水墨 panel
    // as a blank sheet, which is exactly what that looks like. Depth has to carry faceV's sign.
    const out=Math.sign(faceV);
    box(x,y,z,w,h,.10,c.walnut,{hard:true,ry:yaw,gloss:.34,tag});
    const paper=project(0,faceV);
    box(paper[0],y,paper[1],w-.18,h-.18,.025,c.silkL,
      {hard:true,ry:yaw,mode:1,gloss:.06,tag});

    // A recognizable lakeside pagoda replaces the former spray of diagonal marks: layered ink
    // hills, one connected tower with three aligned eaves, quiet water lines and a red seal.
    //
    // `seed` used to be accepted and then ignored, so all eight calls across floors 5, 8, 10, 11
    // and 12 drew the identical picture — the same hills at the same offsets with the tower always
    // left of centre. Five floors sharing one focal image is the sameness HOTEL.md forbids, and it
    // cost nothing to fix: every dimension below is now a function of the seed, and the prop count
    // per painting is unchanged (3 hills, 1 shaft, 3 eaves + 3 gilt strips, 1 finial, 2 water
    // lines, 1 seal).
    let sr=(Math.abs(seed)%9973)+7;
    const rnd=()=>{ sr=(sr*1103515245+12345)&0x7fffffff; return (sr>>>8)/8388608%1; };
    const jog=a=>(rnd()-.5)*2*a;                       // symmetric jitter, |jog| <= a
    const artBox=(u,yy,ww,hh,color,depth=.010)=>{
      const p=project(u,faceV+out*depth);
      box(p[0],yy,p[1],ww,hh,.018,color,
        {hard:true,ry:yaw,mode:1,gloss:.035,tag});
    };
    const mid=jog(.10);                                // where the massif sits, left or right
    for(const [u,ww,hh,col] of [
      [w*(-.25+mid),w*(.30+rnd()*.10),h*(.30+rnd()*.14),c.cityL],
      [w*(-.03+mid),w*(.38+rnd()*.10),h*(.40+rnd()*.14),c.celadon],
      [w*( .24+mid),w*(.26+rnd()*.10),h*(.26+rnd()*.12),c.city]
    ]){
      const p=project(u,faceV+out*.007);
      ball(p[0],y-h*.22,p[1],ww*.5,hh*.5,.014,col,
        {ry:yaw,mode:1,alpha:.66,gloss:.025,tag});
    }
    // The tower stands on one of the flanking hills rather than always the left one, and its
    // storeys shorten with the seed, so a three-eave pagoda and a squat gate tower both occur.
    const tower=w*((rnd()<.45?.21:-.19)+mid*.5),base=y-h*.19;
    const rise=h*(.10+rnd()*.05),body=h*(.44+rnd()*.16);
    artBox(tower,base+body*.42,.055,body,c.ink,.016);
    for(let i=0;i<3;i++){
      const ww=w*(.26-i*.055);
      artBox(tower,base+rise*i,ww,.035,c.ink,.020);
      artBox(tower,base+rise*i+.030,ww*.70,.020,c.bronzeD,.022);
    }
    artBox(tower,base+body*.78,.035,h*(.12+rnd()*.08),c.ink,.020);
    const wu=w*(.05+rnd()*.20);
    artBox(wu,y-h*.31,w*(.28+rnd()*.14),.020,c.city,.020);
    artBox(wu+w*.06,y-h*.36,w*(.16+rnd()*.12),.014,c.cityL,.020);
    const seal=project(w*(rnd()<.5?.34:-.34),faceV+out*.024);
    box(seal[0],y-h*.31,seal[1],.14,.14,.018,c.lacquer,
      {hard:true,ry:yaw,mode:1,glow:.018,gloss:.18,tag});
  }

  function skyline(A,c,x,z,w,h=2.45,tag='城市天际',warm=false,yaw=0) {
    const {box,ball,capsule,luminous}=A;
    const project=(u,v=0)=>[x+Math.cos(yaw)*u-Math.sin(yaw)*v,
      z-Math.sin(yaw)*u-Math.cos(yaw)*v];
    box(x,1.86,z,w,h,.12,c.bronzeD,{hard:true,ry:yaw,gloss:.50,tag});
    // Negative local depth is the occupied side of the glazing. North-facing panoramas call this
    // helper with yaw PI, so the same rule puts their silhouettes into the room as well.
    const face=project(0,-.07);
    luminous(box(face[0],1.86,face[1],w-.16,h-.16,.025,warm?c.city:c.glassD,
      {hard:true,ry:yaw,mode:1,gloss:.78,tag}),warm?.035:.012,warm?.22:.09);
    const n=Math.max(7,Math.floor(w/1.05));
    for(let i=0;i<n;i++){
      const bw=w/n*.66,bh=.34+((i*11+3)%8)*.13,u=-w*.46+(i+.45)*w/n;
      const bp=project(u,-.105);
      box(bp[0],.76+bh*.5,bp[1],bw,bh,.018,i%4===0?c.cityL:c.night,
        {hard:true,ry:yaw,mode:1,glow:i%5===0?.07:.012,tag});
      if(i%3===1){const lp=project(u,-.118);box(lp[0],.76+bh*.64,lp[1],bw*.18,.06,.014,c.warm,
        {hard:true,ry:yaw,mode:1,glow:.20,tag});}
    }
    // Slender bronze mullions and low marker lights give the panorama a framed, hotel-grade
    // cadence. They live on the glazing plane and have no collision footprint.
    const mullions=Math.max(3,Math.floor(w/3.8));
    for(let i=0;i<=mullions;i++){
      const u=-w*.43+i*w*.86/mullions,p=project(u,-.128);
      capsule(p[0],1.86,p[1],.022,h-.30,.022,c.bronzeL,
        {gloss:.68,tag});
      if(i%2===1) luminous(ball(p[0],.71,p[1],.028,.045,.018,c.warm,
        {mode:1,tag}),.035,.18);
    }
  }

  function chair(A,c,x,z,yaw=0,tag='椅子',upholstery=c.silk) {
    const {box,ball,capsule,shade}=A,{modelOr}=A.B;
    modelOr('chinese_armchair',x,0,z,.83,{ry:yaw,tag,gloss:.24},()=>{
      const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
      // Framed club chair: upholstered pad over a visible under-seat rail, inset back and arms.
      box(x,.39,z,.66,.11,.66,c.walnutD,{ry:yaw,gloss:.28,tag});
      box(x,.49,z,.74,.18,.74,upholstery,{ry:yaw,mode:7,gloss:.035,tag});
      const bp=at(0,-.31);
      box(bp[0],.88,bp[1],.78,.82,.14,c.walnutD,{ry:yaw,gloss:.30,tag});
      const bi=at(0,-.285);
      box(bi[0],.88,bi[1],.62,.66,.08,upholstery,{ry:yaw,mode:7,gloss:.035,tag});
      for(const sx of [-1,1])for(const sz of [-1,1])
        {const p=at(sx*.27,sz*.24);capsule(p[0],.22,p[1],.038,.44,.038,c.walnut,{tag});}
      for(const s of [-1,1]){
        const ap=at(s*.36,.02),arm=at(s*.36,.01);
        capsule(ap[0],.67,ap[1],.035,.48,.035,c.walnut,{tag});
        box(arm[0],.78,arm[1],.11,.10,.60,c.walnutL,{ry:yaw,mode:7,gloss:.30,tag});
      }
      // A rounded crest rail, inset button and piping break up the rectangular back silhouette.
      const crest=at(0,-.39),button=at(.07,-.374);
      capsule(crest[0],1.27,crest[1],.030,.66,.030,c.bronzeL,
        {rz:Math.PI/2,ry:yaw,gloss:.70,tag});
      ball(button[0],.93,button[1],.045,.045,.024,c.bronzeL,
        {ry:yaw,gloss:.68,tag});
      const welt=at(0,.35);
      capsule(welt[0],.55,welt[1],.022,.60,.022,c.silkL,
        {rz:Math.PI/2,ry:yaw,gloss:.025,tag});
    });
    shade(x,z,.82,.82,.19);
    return {x,z,yaw};
  }

  function roundTable(A,c,x,z,r=.74,tag='茶桌') {
    const {cyl,capsule,shade}=A;
    cyl(x,.73,z,r,.12,c.walnut,{gloss:.30,tag});
    cyl(x,.805,z,r*.78,.035,c.limestone,{gloss:.20,tag});
    cyl(x,.828,z,r*.34,.018,c.celadonL,{gloss:.36,tag});
    capsule(x,.38,z,.10,.62,.10,c.bronzeD,{gloss:.55,tag});
    cyl(x,.04,z,.42,.08,c.bronzeD,{gloss:.56,tag});
    shade(x,z,r*2.15,r*2.15,.22);
  }

  function desk(A,c,x,z,w=1.8,yaw=0,tag='桌子') {
    const {box,capsule,cyl,shade}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,.75,z,w,.16,.76,c.walnut,{ry:yaw,mode:7,gloss:.32,tag});
    box(x,.84,z,w-.16,.025,.62,c.bronze,{hard:true,ry:yaw,gloss:.68,tag});
    box(x,.862,z-.02,w*.48,.025,.40,c.silkL,
      {ry:yaw,mode:7,gloss:.025,tag:'书桌垫'});
    box(x,.66,z,w-.18,.16,.60,c.walnutD,{ry:yaw,gloss:.28,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const p=at(sx*w*.40,sz*.25);capsule(p[0],.34,p[1],.045,.68,.045,c.bronzeD,{tag});
      A.cyl(p[0],.035,p[1],.085,.07,c.bronzeD,{gloss:.58,tag});
    }
    const edge=at(0,-.39),grommet=at(w*.34,.10);
    capsule(edge[0],.78,edge[1],.028,w*.88,.028,c.bronzeL,
      {rz:Math.PI/2,ry:yaw,gloss:.70,tag});
    cyl(grommet[0],.885,grommet[1],.065,.025,c.bronzeD,{gloss:.64,tag:'桌面电源'});
    shade(x,z,w+.2,.95,.20);
  }

  function lamp(A,c,x,z,tag='床头灯') {
    const {box,capsule,taper,ball,cyl,luminous,onTick}=A,{modelOr}=A.B;
    // Proper bedside casegood with toe-kick, framed drawer, pull and a weighted lamp base.
    modelOr('classic_nightstand_01',x,0,z,.90,{ry:Math.PI,tag:'床头柜',gloss:.24},()=>{
      box(x,.055,z,.58,.11,.50,c.walnutD,{gloss:.26,tag:'床头柜'});
      box(x,.32,z,.66,.48,.56,c.walnut,{mode:7,gloss:.31,tag:'床头柜'});
      box(x,.34,z-.294,.52,.24,.025,c.walnutL,{hard:true,gloss:.30,tag:'床头柜'});
      capsule(x,.34,z-.318,.025,.22,.025,c.bronzeL,{rz:Math.PI/2,gloss:.72,tag:'床头柜'});
      box(x,.59,z,.72,.08,.62,c.limestone,{mode:7,gloss:.20,tag:'床头柜'});
    });
    cyl(x,.66,z,.18,.08,c.bronzeD,{gloss:.62,tag});
    capsule(x,.89,z,.035,.46,.035,c.bronze,{gloss:.66,tag});
    taper(x,1.23,z,.44,.42,.44,c.silkL,{gloss:.04,tag});
    capsule(x,1.49,z,.018,.15,.018,c.bronzeD,{tag});
    ball(x,1.58,z,.045,.055,.045,c.bronzeL,{gloss:.68,tag});
    const bulb=luminous(ball(x,1.18,z,.08,.10,.08,c.warm,{mode:1,tag}),.025,.34);
    onTick((t,body,mins)=>{const h=hours(mins),on=h>=18.5||h<7.2;bulb.glow=on?.31:.025;});
  }

  function television(A,c,x,y,z,w=1.55,yaw=0,tag='电视') {
    const {box,capsule,cyl,ball,onTick}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    // Framed display above a rounded media console with toe-kick, door lines and real hardware.
    const consoleY=.32,consoleW=w*1.30;
    box(x,.055,z,consoleW*.88,.11,.56,c.walnutD,{ry:yaw,gloss:.26,tag:'电视柜'});
    box(x,consoleY,z,consoleW,.48,.62,c.walnut,{ry:yaw,mode:7,gloss:.31,tag:'电视柜'});
    box(x,.585,z,consoleW+.10,.07,.70,c.limestone,{ry:yaw,mode:7,gloss:.19,tag:'电视柜'});
    for(const s of [-1,1]){
      const fp=at(s*consoleW*.25,-.322);
      box(fp[0],.34,fp[1],consoleW*.43,.31,.025,c.walnutL,{hard:true,ry:yaw,gloss:.28,tag:'电视柜'});
      const hp=at(s*consoleW*.25,-.342);
      capsule(hp[0],.34,hp[1],.024,.18,.024,c.bronzeL,{rz:Math.PI/2,ry:yaw,gloss:.72,tag:'电视柜'});
    }
    const postH=Math.max(.30,y-w*.28-.58),pp=at(0,.13);
    capsule(pp[0],.60+postH*.5,pp[1],.05,postH,.05,c.bronzeD,{gloss:.62,tag});
    box(x,y,z,w+.15,w*.56+.15,.13,c.walnutD,{ry:yaw,mode:7,gloss:.34,tag});
    const face=at(0,-.078);
    box(face[0],y,face[1],w+.02,w*.56+.02,.025,c.bronze,{hard:true,ry:yaw,gloss:.68,tag});
    const sf=at(0,-.096);
    const screen=box(sf[0],y,sf[1],w-.12,w*.56-.12,.014,c.blue,
      {hard:true,ry:yaw,mode:1,glow:.07,tag});
    const led=at(w*.41,-.112);ball(led[0],y-w*.24,led[1],.018,.018,.010,c.warm,{mode:1,glow:.12,tag});
    onTick((t,body,mins)=>{
      const h=hours(mins),on=(h>=7&&h<10)||(h>=18&&h<24);
      screen.glow=on?.11+.025*Math.sin(t*.82):.004;
      screen.color=on?(Math.sin(t*.21)>0?c.blue:c.jade):c.ink;
    });
    return screen;
  }

  function curtains(A,c,x,z,w=4.5,tag='窗帘') {
    const {box,capsule,onTick}=A,parts=[];
    box(x,3.51,z,w+.48,.24,.24,c.walnutD,{mode:7,gloss:.30,tag});
    box(x,3.48,z-(z<0?.13:-.13),w+.18,.10,.035,c.bronze,
      {hard:true,mode:1,gloss:.68,tag});
    capsule(x,3.38,z,.045,w+.20,.045,c.bronze,{rz:Math.PI/2,gloss:.68,tag});
    // Rail brackets return to the perimeter wall; individual hooks bridge rail to fabric.
    const wallDir=z<0?-1:1;
    for(const s of [-1,1]) capsule(x+s*w*.42,3.38,z+wallDir*.13,.026,.28,.026,c.bronzeD,
      {rx:Math.PI/2,gloss:.62,tag});
    for(const s of [-1,1]) for(let i=0;i<4;i++){
      const px=x+s*(w*.27+i*.17);
      const p=fixed(box(px,1.88,z-.04,.31,2.78,.08,c.silk,
        {mode:7,gloss:.025,tag}),w+3);
      const hook=fixed(capsule(px,3.33,z-.04,.018,.14,.018,c.bronze,
        {gloss:.66,tag}),w+3);
      parts.push({...moving(p),s,i});parts.push({...moving(hook),s,i});
    }
    onTick((t,body,mins)=>{
      const h=hours(mins),closed=h>=22.4||h<6.6?1:0;
      for(const q of parts){
        const breathe=Math.sin(t*.46+q.i*.7+q.s)*.025;
        M.trans(q.s*(-w*.22*(1-closed)+breathe),0,0,MS);
        q.p.m=M.mul(MS,q.m,q.out);
      }
    });
  }

  // `room` is a real room number (501, 808, …) and turns this portal into a guestroom door: it
  // opens for the card that has that number on it and refuses everybody else out loud (H106). A
  // door called without one — the breakfast room, the roof restaurant, the suite's own bedroom
  // door — is a door, and behaves exactly as it always has.
  // `serviced` is an [h0,h1] window during which this door stands open because somebody else is
  // through it — the housekeeper is in the room. That is half of H194: a corridor where a door is
  // open is a corridor with a life going on in it, and it costs one extra comparison in a tick
  // that already runs. The hour is read inside the tick for the usual reason.
  function door(A,c,x,z,yaw=0,tag='客房',label='',room=0,serviced=null) {
    const {box,glyphs,onTick}=A,parts=[];
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    // Full portal with side jambs, lintel, bronze threshold and a layered sliding leaf.
    for(const s of [-1,1]){const p=at(s*.98,0);box(p[0],1.54,p[1],.14,3.08,.18,c.walnutD,
      {hard:true,ry:yaw,gloss:.32,tag});}
    box(x,3.03,z,2.10,.18,.20,c.walnutD,{hard:true,ry:yaw,gloss:.32,tag});
    box(x,.035,z,2.02,.07,.28,c.bronzeD,{hard:true,ry:yaw,gloss:.68,tag});
    const addMoving=p=>{fixed(p,3.5);p.ob=null;parts.push(moving(p));return p;};
    const leaf=addMoving(box(x,1.48,z,1.82,2.76,.10,c.walnut,
      {ry:yaw,mode:7,gloss:.34,tag}));
    const front=at(0,-.066);
    addMoving(box(front[0],1.50,front[1],1.58,2.48,.025,c.walnutD,
      {hard:true,ry:yaw,gloss:.30,tag}));
    for(const q of [[1.02,.56,c.silk],[1.92,.86,c.celadon]])
      addMoving(box(front[0],q[0],front[1],1.38,q[1],.030,q[2],
        {ry:yaw,mode:7,gloss:.045,tag}));
    for(const u of [-.72,.72]){const p=at(u,-.086);addMoving(box(p[0],1.50,p[1],.045,2.38,.028,c.bronze,
      {hard:true,ry:yaw,gloss:.70,tag}));}
    if(label){
      const plaque=at(0,-.12);
      box(plaque[0],2.72,plaque[1],.78,.28,.045,c.ink,{hard:true,ry:yaw,gloss:.38,tag});
      glyphs(plaque[0],2.72,plaque[1],yaw,label,
        {size:.10,gap:.016,color:c.bronzeL,mode:1,lift:.018,tag});
    }
    const handle=capsule(A,c,x,z,yaw,tag);
    let open=0,toldAt=-99;
    onTick((t,body,mins,dt)=>{
      const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
      const near=Math.hypot(bx-x,bz-z)<2.25;
      // 房卡 (H106). `Stay.opensDoor` is the rule: your card carries one floor and one room number
      // and opens that door. Everything else on the corridor stays shut — and says why, which is
      // the whole of this item. A shut door that produced nothing was the defect; a shut door that
      // produced a "wrong answer" screen would be a worse one, so this is a sentence in Chinese
      // and the corridor is still yours to walk down.
      //
      // Said once per approach, not once per frame: `toldAt` is reset as soon as the player steps
      // back out of range, so walking the corridor is one line per door rather than a wall of
      // toast. Silent with no js/stay.js at all, which is every harness that builds this floor on
      // its own — a door with nobody to ask opens as it always did.
      let mine=true;
      if(room&&typeof Stay!=='undefined'&&Stay.opensDoor){
        try{ mine=Stay.opensDoor(A.floor,room); }catch(_){ mine=true; }
      }
      if(!near) toldAt=-99;
      else if(!mine&&t-toldAt>6&&typeof say==='function'){
        toldAt=t;
        const k=typeof Stay!=='undefined'&&Stay.key&&Stay.key();
        say(k&&!k.lost?`房卡开不了${room}房，您住${k.room}。`:`${room}房不是您的房间。`,
            k&&!k.lost?`The card will not open ${room} — your room is ${k.room}.`
                      :`Room ${room} is not yours.`);
      }
      // Open for you if it is your room; open anyway while housekeeping is inside it. A serviced
      // door only goes to 0.62 of full travel, so it reads as ajar with a trolley outside rather
      // than as a room standing wide open to the corridor.
      const h=hours(mins);
      const busy=serviced&&(serviced[1]>24?(h>=serviced[0]||h<serviced[1]-24)
                                          :(h>=serviced[0]&&h<serviced[1]));
      const target=near&&mine?1:busy?.62:0;
      open+=(target-open)*(1-Math.exp(-dt*(target?6:3.5)));
      const dx=Math.cos(yaw)*1.50*open,dz=-Math.sin(yaw)*1.50*open;
      // The leaf translation is the same for every part of the door, so it is built once per
      // frame instead of once per part — seven identical matrices where one will do.
      M.trans(dx,0,dz,MS);
      for(const q of parts)q.p.m=M.mul(MS,q.m,q.out);
      handle.m=M.mul(MS,handle._m0,handle._out);
    });
    return leaf;
  }

  // Small helper kept outside door() so a bronze handle remains in the same transform group.
  function capsule(A,c,x,z,yaw,tag) {
    const px=x+Math.cos(yaw)*.56-Math.sin(yaw)*.082;
    const pz=z-Math.sin(yaw)*.56-Math.cos(yaw)*.082;
    const p=fixed(A.ball(px,1.45,pz,.075,.075,.045,c.bronzeL,
      {gloss:.74,tag}),3.5);
    p._m0=p.m;p._out=new Float32Array(p.m);p.ob=null;return p;
  }

  function bed(A,c,x,z,w=2.25,tag='床',accent=c.celadon) {
    const {box,ball,capsule,cyl,shade}=A;
    // Layered hotel bed with visible feet, upholstered base, sprung mattress and tailored duvet.
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cyl(x+sx*w*.39,.07,z+sz*.82,.09,.14,c.bronzeD,{gloss:.58,tag});
      ball(x+sx*w*.39,.025,z+sz*.82,.11,.045,.11,c.bronzeD,{gloss:.54,tag});
    }
    box(x,.22,z,w,.36,2.14,c.walnutD,{mode:7,gloss:.27,tag});
    box(x,.43,z,w-.05,.18,2.06,c.silk,{mode:7,gloss:.035,tag});
    box(x,.60,z,w-.10,.28,2.02,c.white,{mode:7,gloss:.025,tag});
    box(x,.73,z-.16,w-.03,.22,1.54,accent,{mode:7,gloss:.025,tag});
    // Rolled duvet edge and a folded silk runner give the foot an intentional soft silhouette.
    capsule(x,.70,z-.86,.10,w-.10,.10,c.white,{rz:Math.PI/2,gloss:.025,tag});
    box(x,.78,z-.63,w-.05,.10,.34,c.silkL,{mode:7,gloss:.025,tag});

    // Walnut outer frame, inset silk panel and three padded sections replace the plain slab.
    box(x,1.30,z+.99,w+.34,1.72,.18,c.walnutD,{mode:7,gloss:.31,tag});
    box(x,1.30,z+.885,w+.12,1.49,.055,c.bronze,{hard:true,gloss:.66,tag});
    box(x,1.30,z+.845,w+.02,1.39,.045,c.silk,{mode:7,gloss:.04,tag});
    for(const s of [-1,0,1]){
      box(x+s*w*.285,1.30,z+.815,w*.27,1.22,.035,s===0?accent:c.silkL,
        {mode:7,gloss:.035,tag});
      if(s) A.cyl(x+s*w*.145,1.30,z+.79,0.0125,1.12,c.bronzeL,{gloss:.68,tag});
    }
    // Two plump pillows sit on the mattress rather than merging into a single block.
    for(const s of [-1,1]){
      box(x+s*w*.23,.87,z+.56,w*.39,.22,.46,c.white,{mode:7,gloss:.02,tag});
      box(x+s*w*.23,.91,z+.60,w*.25,.10,.25,s<0?c.celadonL:c.silkL,{mode:7,gloss:.02,tag});
    }
    // Tailored piping, an off-centre bolster and tuft buttons add textile scale without adding
    // any new floor footprint.
    capsule(x,.805,z-.62,.045,w-.18,.045,c.bronzeL,
      {rz:Math.PI/2,gloss:.66,tag});
    capsule(x-w*.09,.94,z+.29,.105,w*.46,.105,accent,
      {rz:Math.PI/2,gloss:.025,tag});
    for(const yy of [1.08,1.48])for(const s of [-1,0,1])
      ball(x+s*w*.28,yy,z+.783,.038,.038,.022,s===0?c.bronzeL:c.walnutL,
        {mode:1,gloss:.44,tag});
    // A compact medallion is fixed entirely inside the headboard frame. Its overlapping bars and
    // inset celadon boss make the Chinese joinery cue visibly mounted rather than airborne.
    box(x,1.91,z+.775,.30,.30,.032,c.bronzeL,
      {hard:true,rz:Math.PI/4,mode:1,gloss:.68,tag});
    ball(x,1.91,z+.750,.105,.105,.026,accent,{mode:1,gloss:.18,tag});
    capsule(x,1.91,z+.735,.018,.38,.018,c.bronzeD,{gloss:.66,tag});
    capsule(x,1.91,z+.730,.018,.38,.018,c.bronzeD,
      {rz:Math.PI/2,gloss:.66,tag});
    shade(x,z,w+.20,2.35,.30);
    return {x,z,w};
  }

  function sleepingFigure(A,c,x,z,tag='睡眠',yaw=0) {
    const {ball,box,onTick}=A,parts=[];
    const add=p=>{fixed(p,3);parts.push(moving(p));return p;};
    add(ball(x-.53,.83,z+.50,.18,.20,.18,A.C('#d7a27c'),{tag}));
    add(ball(x-.57,.91,z+.52,.19,.10,.19,c.walnutD,{mode:15,tag}));
    add(box(x,.75,z-.05,1.55,.34,1.25,c.celadon,{mode:7,gloss:.025,tag}));
    onTick((t,body,mins)=>{
      const h=hours(mins),show=h>=22.7||h<6.8;
      if(!show){for(const q of parts)q.p.m=hide;return;}
      M.trans(0,Math.sin(t*1.15)*.008,0,MS);
      for(const q of parts)q.p.m=M.mul(MS,q.m,q.out);
    });
  }

  // The one stone recipe every bath in this file shares, so a tub, a rim and a deck are the same
  // material rather than three different guesses. `concrete` is the only mineral map in
  // js/assets.js with a fine even grain (Concrete034); `paving` reads as jointed pavers and is
  // wrong on a monolith. matScale 1.15 puts roughly one grain period across a hand's width.
  const STONE={mat:'concrete',matScale:1.15,matAmt:.16,nrmAmt:.45,gloss:.17};
  function bathroom(A,c,x,z,w,d,tag='浴室',accessible=false) {
    const {box,cyl,capsule,ball,flat,thing,luminous}=A;
    // ART.md's order: value range first, material third. The floor was `limestoneL` (#ebe3d4,
    // ~90% luminance) with the tile map at matScale .38 — a 6 cm mosaic against near-white, which
    // is exactly the "no headroom for the texture to sit in" case ART.md describes, and
    // HT11-stone-bath showed a flat white plane. Down to the darker limestone and out to the 1.8 m
    // repeat the table asks for.
    flat(x,.020,z,w,d,c.limestone,{mode:7,gloss:.16,mat:'tile',matScale:1.8,matAmt:.28,tag});
    if(accessible){
      const east=x+w*.485,south=z-d*.485,north=z+d*.485;

      // Three localized tiled mounting walls make the fixture zones explicit without closing the
      // camera out of the room. All hardware below terminates visibly into one of these walls.
      const vanityWallX=x+w*.18;
      box(east,1.40,z-d*.10,.08,2.80,d*.78,c.limestone,{hard:true,gloss:.16,tag});
      box(vanityWallX,1.40,north,w*.48,2.80,.08,c.limestone,{hard:true,gloss:.16,tag});
      for(const yy of [.10,.72,1.34,1.96,2.58]){
        box(east-.045,yy,z-d*.10,.012,.018,d*.78,c.bronzeD,{hard:true,gloss:.42,tag:'墙面收口'});
        box(vanityWallX,yy,north-.045,w*.48,.018,.012,c.bronzeD,{hard:true,gloss:.42,tag:'墙面收口'});
      }
      // A real bedroom/bath partition hides fixture backings from the room view. Its broad west
      // opening now reaches beyond the room's camera centreline: the earlier off-centre portal was
      // physically passable, but a third-person camera following a guest into the wet room stayed
      // behind the solid east leaf and showed only the top/back of the partition.
      const bathLeft=x-w*.50,openingRight=x+w*.16,entryZ=south-.13,eastEdge=x+w*.50;
      box((openingRight+eastEdge)/2,1.55,entryZ,eastEdge-openingRight,3.10,.15,c.plaster,
        {hard:true,tag:'无障碍浴室隔墙'});
      box((bathLeft+openingRight)/2,2.78,entryZ,openingRight-bathLeft,.64,.15,c.plaster,
        {hard:true,tag:'无障碍浴室隔墙'});
      for(const xx of [bathLeft+.06,openingRight-.06])box(xx,1.22,entryZ-.02,.12,2.44,.24,c.walnutD,
        {hard:true,gloss:.29,tag:'无障碍浴室门套'});
      box((bathLeft+openingRight)/2,2.43,entryZ-.02,openingRight-bathLeft,.14,.24,c.walnutD,
        {hard:true,gloss:.29,tag:'无障碍浴室门套'});
      // Bedroom face: crown and inset celadon silk turn the partition into intentional millwork.
      const partitionX=(openingRight+eastEdge)/2,partitionW=eastEdge-openingRight;
      box(partitionX,3.04,entryZ-.10,partitionW+.10,.14,.10,c.walnutD,
        {hard:true,gloss:.30,tag:'无障碍浴室隔墙'});
      box(partitionX,2.65,entryZ-.095,partitionW-.18,.56,.045,c.walnutD,
        {hard:true,gloss:.30,tag:'无障碍浴室隔墙'});
      box(partitionX,2.65,entryZ-.122,partitionW-.34,.40,.020,c.celadonL,
        {hard:true,mode:1,gloss:.05,tag:'无障碍浴室隔墙'});

      // Roll-in shower: a flush contrasting floor field and linear drain provide an unmistakable
      // threshold without any raised curb or glass needles.
      const shx=x+w*.245,shz=z-d*.22,shw=w*.47,shd=d*.45;
      flat(shx,.029,shz,shw,shd,c.celadonL,
        {mode:7,gloss:.16,mat:'tile',matScale:.28,matAmt:.20,tag:'无障碍淋浴'});
      for(const xx of [shx-shw*.49,shx+shw*.49])flat(xx,.033,shz,.035,shd,c.bronzeD,
        {gloss:.46,tag:'无障碍淋浴'});
      for(const zz of [shz-shd*.49,shz+shd*.49])flat(shx,.033,zz,shw,.035,c.bronzeD,
        {gloss:.46,tag:'无障碍淋浴'});
      flat(shx-shw*.15,.037,shz-shd*.34,shw*.48,.13,c.steel,{mode:1,gloss:.52,tag:'淋浴排水'});
      for(let i=-2;i<=2;i++)flat(shx-shw*.15+i*shw*.075,.041,shz-shd*.34,.018,.10,c.ink,
        {mode:1,gloss:.18,tag:'淋浴排水'});

      // Wall-mounted shower head, hose and controls. Backplates and short wall arms remove every
      // unsupported lozenge while keeping the silhouette easy to read from the doorway.
      const fixtureZ=shz-shd*.27;
      cyl(east-.055,2.24,fixtureZ,.13,.055,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'淋浴器'});
      capsule(east-.17,2.24,fixtureZ,.032,.23,.032,c.bronze,{rz:Math.PI/2,gloss:.69,tag:'淋浴器'});
      cyl(east-.31,2.17,fixtureZ,.15,.07,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag:'淋浴器'});
      cyl(east-.355,2.17,fixtureZ,.115,.025,c.steel,{rz:Math.PI/2,gloss:.48,tag:'淋浴喷头'});
      for(let i=0;i<6;i++){
        const a=i/6*TAU;
        ball(east-.375,2.17+Math.sin(a)*.065,fixtureZ+Math.cos(a)*.065,
          .010,.010,.010,c.ink,{gloss:.18,tag:'淋浴喷头'});
      }
      box(east-.055,1.23,fixtureZ,.075,.40,.32,c.bronzeD,{mode:7,gloss:.56,tag:'淋浴控制'});
      cyl(east-.105,1.28,fixtureZ,.075,.06,c.celadon,{rz:Math.PI/2,gloss:.24,tag:'淋浴控制'});
      capsule(east-.12,1.72,fixtureZ,.020,.80,.020,c.bronze,
        {gloss:.66,tag:'淋浴软管'});

      // Horizontal and vertical grab bars share a consistent height and have paired wall returns.
      const grabZ=shz+shd*.23;
      capsule(east-.11,1.00,grabZ,.040,shd*.58,.040,c.bronze,
        {rx:Math.PI/2,gloss:.70,tag:'扶手'});
      for(const zz of [grabZ-shd*.24,grabZ+shd*.24]){
        cyl(east-.055,1.00,zz,.070,.035,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'扶手墙座'});
        capsule(east-.095,1.00,zz,.026,.12,.026,c.bronzeD,
          {rz:Math.PI/2,gloss:.64,tag:'扶手固定座'});
      }
      const verticalZ=shz+shd*.40;
      A.cyl(east-.11,1.48,verticalZ,0.02,0.82,c.bronze,{gloss:.70,tag:'扶手'});
      for(const yy of [1.18,1.78]){
        cyl(east-.055,yy,verticalZ,.070,.035,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'扶手墙座'});
        capsule(east-.095,yy,verticalZ,.026,.12,.026,c.bronzeD,
          {rz:Math.PI/2,gloss:.64,tag:'扶手固定座'});
      }

      // Fold-down shower seat: padded leaf meets a broad wall plate and two visible hinge blocks.
      const seatZ=shz+shd*.15;
      box(east-.040,.68,seatZ,.075,.62,.68,c.bronzeD,{mode:7,gloss:.55,tag:'淋浴椅安装板'});
      box(east-.40,.58,seatZ,.70,.11,.58,c.celadon,{mode:7,gloss:.035,tag:'折叠淋浴椅'});
      for(const zz of [seatZ-.22,seatZ+.22]){
        cyl(east-.11,.60,zz,.065,.10,c.bronzeL,{rx:Math.PI/2,gloss:.70,tag:'淋浴椅铰链'});
        box(east-.22,.44,zz,.32,.22,.065,c.bronzeD,{mode:7,gloss:.56,tag:'淋浴椅支架'});
      }

      // Recognizable toilet with pedestal, bowl, water, tank and flush control. The open east side
      // preserves the transfer zone; its fold-up rail is fixed back to the tiled rear wall.
      const tx=east-.58,tz=z+d*.12;
      A.taper(tx-.10,.25,tz,.22,.50,.28,c.white,{gloss:.28,tag:'无障碍坐便器'});
      ball(tx-.18,.48,tz,.42,.18,.31,c.white,{mode:7,gloss:.29,tag:'无障碍坐便器'});
      ball(tx-.23,.53,tz,.30,.055,.22,c.water,{mode:1,alpha:.72,gloss:.72,tag:'无障碍坐便器'});
      box(east-.15,.77,tz,.25,.58,.60,c.white,{mode:7,gloss:.29,tag:'无障碍坐便器'});
      box(east-.15,1.08,tz,.29,.06,.64,c.limestone,{mode:7,gloss:.20,tag:'无障碍坐便器'});
      cyl(east-.22,1.13,tz+.18,.045,.035,c.bronzeL,{gloss:.70,tag:'冲水按钮'});
      const railZ=tz-.48;
      box(east-.045,.82,railZ,.075,.30,.18,c.bronzeD,{mode:7,gloss:.58,tag:'转移扶手安装板'});
      cyl(east-.095,.82,railZ,.075,.08,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag:'转移扶手铰链'});
      capsule(east-.47,.82,railZ,.042,.88,.042,c.bronze,
        {rz:Math.PI/2,gloss:.70,tag:'折叠转移扶手'});
      ball(east-.89,.82,railZ,.055,.055,.055,c.bronzeL,{gloss:.70,tag:'转移扶手端头'});
      capsule(east-.095,.92,tz,.040,1.02,.040,c.bronze,
        {rx:Math.PI/2,gloss:.70,tag:'坐便器后扶手'});
      for(const zz of [tz-.40,tz+.40]){
        cyl(east-.055,.92,zz,.070,.035,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'扶手墙座'});
        capsule(east-.095,.92,zz,.026,.12,.026,c.bronzeD,
          {rz:Math.PI/2,gloss:.64,tag:'扶手固定座'});
      }

      // Wall-supported knee-clear vanity. Side brackets stop at the edges, leaving the full center
      // open for a seated guest; the inset basin, faucet, framed mirror and centered sconce align.
      const vx=vanityWallX,vz=north-.34,vw=w*.36;
      box(vx,.80,vz,vw,.11,.66,c.limestone,{mode:7,gloss:.22,tag:'无障碍盥洗台'});
      box(vx,.69,north-.07,vw*.90,.16,.12,c.walnutD,{mode:7,gloss:.29,tag:'盥洗台墙架'});
      for(const sx of [-1,1])box(vx+sx*vw*.40,.54,north-.18,.10,.42,.30,c.walnutD,
        {mode:7,gloss:.29,tag:'盥洗台侧架'});
      cyl(vx,.86,vz-.05,.27,.07,c.white,{gloss:.34,tag:'盥洗盆'});
      capsule(vx,.99,vz+.08,.032,.30,.032,c.bronze,{gloss:.68,tag:'水龙头'});
      capsule(vx+.12,1.11,vz+.08,.030,.24,.030,c.bronze,{rx:Math.PI/2,gloss:.68,tag:'水龙头'});
      box(vx,1.87,north-.055,vw*.92,1.40,.075,c.bronzeD,{hard:true,gloss:.62,tag:'镜子'});
      box(vx,1.87,north-.105,vw*.78,1.24,.025,c.glassD,{hard:true,mode:1,alpha:.72,gloss:.88,tag:'镜子'});
      box(vx,2.73,north-.06,.25,.28,.075,c.bronzeD,{mode:7,gloss:.58,tag:'镜前灯底座'});
      capsule(vx,2.61,north-.16,.025,.20,.025,c.bronze,{rx:Math.PI/2,gloss:.66,tag:'镜前灯灯臂'});
      luminous(ball(vx,2.55,north-.28,.12,.16,.12,c.warm,{mode:1,tag:'镜前灯'}),.035,.25);

      // Towel rail and towels are wall-mounted beside the vanity, clear of knee and transfer zones.
      const towelX=x+w*.38;
      capsule(towelX,1.25,north-.11,.032,w*.09,.032,c.bronze,
        {rz:Math.PI/2,gloss:.68,tag:'毛巾架'});
      for(const sx of [-1,1]){
        cyl(towelX+sx*w*.045,1.25,north-.055,.060,.032,c.bronzeD,
          {rx:Math.PI/2,gloss:.64,tag:'毛巾架墙座'});
        capsule(towelX+sx*w*.045,1.25,north-.095,.024,.12,.024,c.bronzeD,
          {rx:Math.PI/2,gloss:.64,tag:'毛巾架固定座'});
      }
      for(const sx of [-1,1])box(towelX+sx*w*.022,.99,north-.13,w*.035,.48,.055,c.towel,
        {mode:7,gloss:.02,tag:'毛巾'});

      thing(tag,x,1.26,z,'无障碍浴室有无门槛淋浴、折叠座椅、转移扶手和悬空盥洗台。',
        'The accessible bathroom has a curbless shower, folding seat, transfer rails and knee-clear vanity.',
        '浴室 is a bathroom.',{tag,focus:[x,z-d*.36],reach:2.4});
      return;
    }
    // Framed millwork vanity: toe-kick, cabinet, stone cap, inset basin, drawers and hardware.
    const vx=x-w*.25,vz=z+d*.31,vw=w*.39;
    box(vx,.055,vz,vw*.86,.11,.50,c.walnutD,{gloss:.26,tag});
    box(vx,.40,vz,vw,.68,.62,c.walnut,{mode:7,gloss:.30,tag});
    box(vx,.77,vz,vw+.12,.10,.70,c.limestone,{mode:7,gloss:.22,tag});
    const faceZ=vz-.325;
    for(const s of [-1,1]){
      box(vx+s*vw*.24,.42,faceZ,vw*.42,.46,.028,c.walnutL,{hard:true,gloss:.28,tag});
      capsule(vx+s*vw*.24,.42,faceZ-.022,.024,.18,.024,c.bronzeL,{rz:Math.PI/2,gloss:.72,tag});
    }
    cyl(vx,.82,vz-.02,.25,.08,c.white,{gloss:.34,tag});
    capsule(vx,.99,vz+.08,.032,.32,.032,c.bronze,{gloss:.68,tag});
    capsule(vx+.12,1.12,vz+.08,.030,.26,.030,c.bronze,{rx:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])cyl(vx+s*.18,.88,vz+.07,.045,.05,c.bronzeL,{gloss:.72,tag});

    // Back-lit framed mirror with two wall-mounted sconces and visible escutcheons.
    box(vx,1.88,z+d*.465,vw+.20,1.58,.075,c.bronzeD,{hard:true,gloss:.62,tag});
    box(vx,1.88,z+d*.425,vw,1.38,.025,c.glassD,{hard:true,mode:1,alpha:.72,gloss:.88,tag});
    for(const s of [-1,1]){
      const lx=vx+s*(vw*.60);
      cyl(lx,1.92,z+d*.405,.10,.05,c.bronzeD,{rx:Math.PI/2,gloss:.62,tag});
      capsule(lx,1.92,z+d*.34,.025,.16,.025,c.bronze,{rx:Math.PI/2,gloss:.66,tag});
      luminous(ball(lx,1.92,z+d*.26,.10,.14,.10,c.warm,{mode:1,tag}),.035,.25);
    }

    // Raised bath with shadow plinth, softened apron, four-piece rim and supported fittings.
    // The apron was `c.white` (#f5efe4, ~95% luminance) and untextured, which is why a bath the
    // room's own sign calls 石材浴室 read as a moulded plastic box at arm's length. It is stone
    // now, in both senses: a limestone value with headroom, and the shared STONE grain on the
    // apron and all four rim rails so they are one material and not three.
    const bx=x+w*.22,bz=z-d*.22,bw=w*.42,bd=d*.33;
    box(bx,.07,bz,bw*.88,.14,bd*.88,c.walnutD,{mode:7,gloss:.24,tag});
    box(bx,.35,bz,bw,.56,bd,c.limestone,{mode:7,...STONE,tag});
    box(bx,.37,bz-bd*.505,bw*.78,.34,.026,c.limestoneL,{hard:true,gloss:.22,tag});
    for(const s of [-1,1]){
      box(bx+s*bw*.47,.65,bz,.10,.10,bd+.08,c.limestoneL,{mode:7,...STONE,gloss:.24,tag});
      box(bx,.65,bz+s*bd*.47,bw+.08,.10,.10,c.limestoneL,{mode:7,...STONE,gloss:.24,tag});
    }
    box(bx,.625,bz,bw*.78,.07,bd*.72,c.water,{mode:1,alpha:.74,gloss:.82,tag});
    capsule(bx+bw*.32,.88,bz+bd*.36,.035,.46,.035,c.bronze,{gloss:.68,tag});
    capsule(bx+bw*.20,1.08,bz+bd*.36,.035,.34,.035,c.bronze,{rx:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])cyl(bx+bw*(.16+s*.10),.72,bz+bd*.36,.045,.05,c.bronzeL,{gloss:.72,tag});

    // Shower glazing has a complete frame, floor track, hinges, pull and a visible drain.
    const sx=x+w*.44,sz=z+d*.16,sd=d*.30;
    box(sx,1.35,sz,.035,2.55,sd,c.glass,{hard:true,mode:1,alpha:.28,gloss:.76,tag});
    for(const zz of [sz-sd*.5,sz+sd*.5])A.cyl(sx,1.35,zz,0.019,2.58,c.bronze,{gloss:.68,tag});
    for(const yy of [.08,2.62])capsule(sx,yy,sz,.038,sd+.08,.038,c.bronze,
      {rx:Math.PI/2,gloss:.68,tag});
    for(const yy of [.72,1.95])cyl(sx-.025,yy,sz+sd*.43,.055,.035,c.bronzeL,
      {rz:Math.PI/2,gloss:.72,tag});
    capsule(sx-.07,1.28,sz-sd*.30,.035,.48,.035,c.bronzeL,{gloss:.72,tag});
    flat(sx-.55,.028,sz,.34,.34,c.steel,{mode:1,gloss:.52,tag});

    // Towels are carried by a wall rail, with end brackets visibly tied into the wall.
    capsule(x-w*.02,1.28,z+d*.475,.032,w*.34,.032,c.bronze,{rz:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])capsule(x-w*.02+s*w*.17,1.28,z+d*.43,.025,.12,.025,c.bronzeD,
      {rx:Math.PI/2,tag});
    for(const s of [-1,1])box(x-w*.02+s*w*.085,.98,z+d*.43,w*.15,.55,.06,c.towel,
      {mode:7,gloss:.02,tag});
    thing(tag,x,1.26,z,'浴室里有石材浴缸和独立淋浴。',
      'The stone bathroom has a bath and a separate shower.',
      '浴室 is a bathroom.',{tag,focus:[x,z-d*.42],reach:2.2});
  }

  // Suite-scale wet room used by 8F. It deliberately avoids the generic glass-box shower:
  // every fixture is mounted to stone, every seat has a base, and the view bath is freestanding.
  function deluxeBathroom(A,c,x,z,w,d,tag='景观浴缸') {
    const {box,cyl,capsule,ball,flat,luminous,thing}=A;
    flat(x,.020,z,w,d,c.limestoneL,
      {mode:7,gloss:.20,mat:'tile',matScale:.46,matAmt:.22,tag});
    // Flush bronze border defines the generous wet-room footprint without becoming a curb.
    for(const xx of [x-w*.49,x+w*.49])flat(xx,.029,z,.035,d*.96,c.bronzeD,{gloss:.50,tag});
    for(const zz of [z-d*.49,z+d*.49])flat(x,.029,zz,w*.96,.035,c.bronzeD,{gloss:.50,tag});

    // Double vanity on a recessed toe-kick, with framed doors, twin inset basins and wall lighting.
    const vx=x-w*.25,vz=z+d*.31,vw=w*.46,wallZ=z+d*.485;
    box(vx,.055,vz,vw*.88,.11,.62,c.walnutD,{gloss:.27,tag:'双人盥洗台'});
    box(vx,.40,vz,vw,.68,.70,c.walnut,{mode:7,gloss:.31,tag:'双人盥洗台'});
    box(vx,.78,vz,vw+.14,.10,.78,c.limestone,{mode:7,gloss:.23,tag:'双人盥洗台'});
    for(let i=-1;i<=1;i++){
      const px=vx+i*vw*.30;
      box(px,.41,vz-.365,vw*.27,.46,.026,i===0?c.celadon:c.walnutL,
        {hard:true,mode:7,gloss:.27,tag:'双人盥洗台'});
      capsule(px,.41,vz-.39,.024,.18,.024,c.bronzeL,
        {rz:Math.PI/2,gloss:.72,tag:'双人盥洗台'});
    }
    for(const s of [-1,1]){
      const bx=vx+s*vw*.23;
      cyl(bx,.84,vz-.04,.24,.07,c.white,{gloss:.34,tag:'盥洗盆'});
      cyl(bx,.91,vz+.12,.065,.05,c.bronzeD,{gloss:.66,tag:'水龙头底座'});
      capsule(bx,1.04,vz+.12,.030,.26,.030,c.bronze,{gloss:.69,tag:'水龙头'});
      capsule(bx+.11,1.14,vz+.12,.028,.22,.028,c.bronze,
        {rx:Math.PI/2,gloss:.69,tag:'水龙头'});
    }
    box(vx,1.93,wallZ,vw+.18,1.66,.08,c.bronzeD,{hard:true,gloss:.64,tag:'双人镜'});
    box(vx,1.93,wallZ-.052,vw,1.48,.025,c.glassD,
      {hard:true,mode:1,alpha:.74,gloss:.88,tag:'双人镜'});
    for(const s of [-1,1]){
      const lx=vx+s*vw*.58;
      cyl(lx,1.95,wallZ-.055,.10,.045,c.bronzeD,{rx:Math.PI/2,gloss:.64,tag:'镜前灯墙座'});
      capsule(lx,1.95,wallZ-.14,.025,.18,.025,c.bronze,{rx:Math.PI/2,gloss:.68,tag:'镜前灯灯臂'});
      luminous(ball(lx,1.95,wallZ-.24,.11,.16,.11,c.warm,{mode:1,tag:'镜前灯'}),.04,.26);
    }

    // Freestanding view bath on a shadow plinth. Layered apron panels, a deep rim and deck-mounted
    // controls make it read as a finished soaking tub rather than a white box.
    const tx=x+w*.18,tz=z-d*.25,tw=w*.46,td=d*.25;
    box(tx,.07,tz,tw*.90,.14,td*.86,c.walnutD,{mode:7,gloss:.26,tag});
    box(tx,.35,tz,tw,.56,td,c.white,{mode:7,gloss:.30,tag});
    box(tx,.37,tz-td*.505,tw*.78,.34,.028,c.limestone,{hard:true,gloss:.22,tag});
    for(const s of [-1,1]){
      box(tx+s*tw*.47,.65,tz,.10,.10,td+.08,c.limestone,{mode:7,gloss:.26,tag});
      box(tx,.65,tz+s*td*.47,tw+.08,.10,.10,c.limestone,{mode:7,gloss:.26,tag});
    }
    box(tx,.625,tz,tw*.78,.07,td*.70,c.water,{mode:1,alpha:.76,gloss:.84,tag});
    // Celadon apron inset and attached bronze lattice/seal provide the floor's Chinese signature.
    box(tx,.36,tz-td*.525,tw*.42,.24,.024,c.celadon,{hard:true,mode:7,gloss:.08,tag});
    box(tx,.36,tz-td*.544,.22,.22,.018,c.bronzeL,
      {hard:true,rz:Math.PI/4,mode:1,gloss:.68,tag});
    ball(tx,.36,tz-td*.558,.065,.065,.018,c.lacquer,{mode:1,glow:.018,tag});
    const tapX=tx+tw*.30,tapZ=tz+td*.38;
    box(tapX,.73,tapZ,.54,.08,.26,c.bronzeD,{mode:7,gloss:.60,tag:'浴缸五金'});
    capsule(tapX,.94,tapZ,.036,.42,.036,c.bronze,{gloss:.70,tag:'浴缸龙头'});
    capsule(tapX-.13,1.11,tapZ,.034,.32,.034,c.bronze,
      {rz:Math.PI/2,gloss:.70,tag:'浴缸龙头'});
    for(const s of [-1,1])cyl(tapX+s*.18,.77,tapZ,.050,.055,c.bronzeL,{gloss:.72,tag:'浴缸五金'});
    // Rolled towel rests on the broad deck and visibly contacts it.
    capsule(tx-tw*.29,.76,tz+td*.39,.11,.62,.11,c.towel,
      {rz:Math.PI/2,gloss:.02,tag:'浴巾'});

    // Open rain shower on a tiled wall: no floating glass plane, no floor-to-ceiling needles.
    const east=x+w*.485,shz=z+d*.02,shd=d*.36,shx=east-w*.15;
    box(east,1.42,shz,.08,2.84,shd,c.limestone,{hard:true,gloss:.16,tag:'独立淋浴'});
    for(const yy of [.12,.76,1.40,2.04,2.68])box(east-.045,yy,shz,.012,.018,shd,c.bronzeD,
      {hard:true,gloss:.42,tag:'墙面收口'});
    flat(shx,.030,shz,w*.29,shd*.90,c.celadonL,
      {mode:7,gloss:.16,mat:'tile',matScale:.30,matAmt:.18,tag:'独立淋浴'});
    flat(shx-w*.03,.038,shz-shd*.32,w*.16,.12,c.steel,{mode:1,gloss:.52,tag:'淋浴排水'});
    for(let i=-2;i<=2;i++)flat(shx-w*.03+i*w*.025,.042,shz-shd*.32,.015,.09,c.ink,
      {mode:1,gloss:.18,tag:'淋浴排水'});
    const hz=shz-shd*.18;
    cyl(east-.055,2.27,hz,.13,.055,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'花洒墙座'});
    capsule(east-.17,2.27,hz,.032,.23,.032,c.bronze,{rz:Math.PI/2,gloss:.69,tag:'花洒灯臂'});
    cyl(east-.31,2.19,hz,.15,.07,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag:'花洒'});
    cyl(east-.355,2.19,hz,.112,.025,c.steel,{rz:Math.PI/2,gloss:.48,tag:'花洒'});
    for(let i=0;i<6;i++){
      const a=i/6*TAU;
      ball(east-.375,2.19+Math.sin(a)*.063,hz+Math.cos(a)*.063,.009,.009,.009,c.ink,{tag:'花洒'});
    }
    box(east-.055,1.25,hz,.075,.40,.32,c.bronzeD,{mode:7,gloss:.56,tag:'淋浴控制'});
    cyl(east-.105,1.30,hz,.075,.06,c.celadon,{rz:Math.PI/2,gloss:.24,tag:'淋浴控制'});
    A.cyl(east-.12,1.73,hz,0.01,0.8,c.bronze,{gloss:.66,tag:'淋浴软管'});
    // Grounded stone bench faces into the usable shower area.
    box(east-.43,.07,shz+shd*.27,.62,.14,.72,c.walnutD,{mode:7,gloss:.25,tag:'淋浴坐凳'});
    box(east-.43,.45,shz+shd*.27,.72,.12,.80,c.limestone,{mode:7,gloss:.22,tag:'淋浴坐凳'});
    for(const zz of [shz+shd*.14,shz+shd*.40])box(east-.20,.25,zz,.22,.36,.10,c.bronzeD,
      {mode:7,gloss:.58,tag:'淋浴坐凳支架'});

    // Wall-fixed towel rail beside the vanity, with end plates and folded towels.
    const towelX=x+w*.03;
    capsule(towelX,1.28,wallZ-.11,.034,w*.24,.034,c.bronze,
      {rz:Math.PI/2,gloss:.68,tag:'毛巾架'});
    for(const s of [-1,1]){
      const px=towelX+s*w*.12;
      cyl(px,1.28,wallZ-.055,.065,.032,c.bronzeD,{rx:Math.PI/2,gloss:.64,tag:'毛巾架墙座'});
      capsule(px,1.28,wallZ-.095,.025,.12,.025,c.bronzeD,{rx:Math.PI/2,tag:'毛巾架固定座'});
    }
    for(const s of [-1,1])box(towelX+s*w*.06,1.00,wallZ-.13,w*.10,.52,.055,c.towel,
      {mode:7,gloss:.02,tag:'毛巾'});

    thing(tag,x,1.28,z,'景观浴室有独立浸泡缸、双人盥洗台和开放式雨淋。',
      'The view bath has a freestanding soaking tub, double vanity and open rain shower.',
      '浸泡缸 is a soaking tub.',{tag,focus:[x,z-d*.42],reach:2.4});
  }

  function deluxeDaybed(A,c,x,z,w=5.0,tag='窗边榻') {
    const {box,capsule}=A;
    // Built-in cabinetry supports the upholstered seat; fronts, pulls, arms and back cushions
    // remove the former single-block silhouette.
    box(x,.055,z,w*.92,.11,1.08,c.walnutD,{mode:7,gloss:.26,tag});
    box(x,.34,z,w,.58,1.20,c.walnut,{mode:7,gloss:.31,tag});
    for(let i=0;i<4;i++){
      const px=x-w*.36+i*w*.24;
      box(px,.34,z+.612,w*.205,.36,.026,i%2?c.walnutL:c.celadon,
        {hard:true,mode:7,gloss:.25,tag});
      capsule(px,.34,z+.637,.022,w*.065,.022,c.bronzeL,
        {rz:Math.PI/2,gloss:.70,tag});
    }
    box(x,.69,z,w+.04,.18,1.24,c.silk,{mode:7,gloss:.03,tag});
    box(x,1.02,z-.49,w-.18,.62,.18,c.walnutD,{mode:7,gloss:.29,tag});
    box(x,1.02,z-.535,w-.38,.46,.08,c.silkL,{mode:7,gloss:.03,tag});
    for(const s of [-1,1]){
      box(x+s*w*.47,.91,z,.22,.64,1.28,c.walnutD,{mode:7,gloss:.29,tag});
      box(x+s*w*.44,.95,z,.16,.38,.86,c.celadon,{mode:7,gloss:.03,tag});
    }
    for(let i=0;i<4;i++)box(x-w*.30+i*w*.20,.95,z-.28,w*.16,.42,.25,
      i%2?c.celadonL:c.silkL,{mode:7,gloss:.03,tag});
    capsule(x,.76,z+.57,.040,w*.84,.040,c.bronzeL,
      {rz:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])capsule(x+s*w*.31,.89,z-.18,.105,w*.22,.105,
      s<0?c.celadonL:c.silkL,{rz:Math.PI/2,gloss:.025,tag});
    A.shade(x,z,w+.28,1.55,.30);
  }

  function steam(A,c,x,y,z,n=4,tag='热茶') {
    const {ball,onTick}=A,parts=[];
    for(let i=0;i<n;i++){
      const p=fixed(ball(x+(i%2-.5)*.09,y+i*.18,z,.09,.13,.09,c.white,
        {mode:1,alpha:.15,glow:.025,tag}),2.2);
      parts.push({...moving(p),i});
    }
    onTick((t,body,mins)=>{
      for(const q of parts){const u=(t*.19+q.i/n)%1;
        M.trans(Math.sin(t*.7+q.i)*.07,u*.58,0,MS);
        q.p.m=M.mul(MS,q.m,q.out);q.p.alpha=.15*(1-u);}
    });
  }

  function teaSet(A,c,x,z,tag='茶台',surface=.79) {
    const {box,cyl,capsule,taper,ball}=A;
    box(x,surface+.018,z,.92,.025,.42,c.walnutD,{mode:7,gloss:.28,tag});
    cyl(x,surface+.05,z,.18,.10,c.celadonL,{gloss:.36,tag});
    capsule(x+.18,surface+.08,z,.035,.20,.035,c.bronzeD,{rz:Math.PI/2,tag});
    cyl(x,surface+.115,z,.13,.035,c.celadon,{gloss:.32,tag});
    ball(x,surface+.15,z,.032,.032,.032,c.bronzeL,{gloss:.68,tag});
    for(const s of [-1,1]){
      const px=x-.34+s*.14;
      cyl(px,surface+.042,z,.090,.022,c.bronzeL,{gloss:.62,tag});
      taper(px,surface+.09,z,.070,.075,.070,c.white,{mode:7,gloss:.28,tag});
    }
    steam(A,c,x,surface+.17,z,3,tag);
  }

  function placeSetting(A,c,x,z,yaw=0,surface=.84,tag='餐具') {
    const {box,cyl,capsule,taper}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    // A fine celadon charger, porcelain plate, folded napkin, teacup and paired chopsticks. All
    // pieces sit directly on the tabletop, so a banquet reads as prepared without narrowing a
    // single circulation route.
    cyl(x,surface+.018,z,.205,.025,c.bronzeL,{gloss:.62,tag});
    cyl(x,surface+.040,z,.172,.022,c.white,{gloss:.30,tag});
    cyl(x,surface+.060,z,.108,.014,c.celadonL,{gloss:.34,tag});
    const napkin=at(-.19,-.015);
    box(napkin[0],surface+.055,napkin[1],.13,.055,.27,c.silkL,
      {ry:yaw+.16,mode:7,gloss:.025,tag});
    const cup=at(.20,.025);
    cyl(cup[0],surface+.035,cup[1],.105,.018,c.bronzeL,{gloss:.64,tag});
    taper(cup[0],surface+.098,cup[1],.070,.085,.070,c.white,
      {mode:7,gloss:.28,tag});
    for(const s of [-1,1]){
      const p=at(.30+s*.026,-.03);
      capsule(p[0],surface+.072,p[1],.010,.30,.010,s<0?c.bronzeL:c.walnutD,
        {rx:Math.PI/2,ry:yaw,gloss:.58,tag});
    }
  }

  function roundSettings(A,c,x,z,count,ring,surface=.84,tag='餐具') {
    for(let i=0;i<count;i++){
      const a=i/count*TAU;
      placeSetting(A,c,x+Math.sin(a)*ring,z+Math.cos(a)*ring,a+Math.PI,surface,tag);
    }
  }

  // The standard guest rooms need a compact service that still reads cleanly from the player
  // camera. Every piece lands on one tray; saucers support the cups, and the pot's lid, knob and
  // spout all meet its body. This replaces the detached crescents the original three cylinders
  // became at oblique walking angles without changing the larger tea services on later floors.
  function guestTeaSet(A,c,x,z,tag='欢迎茶',surface=.79) {
    const {box,cyl,taper,capsule,ball}=A;
    box(x,surface+.016,z,.98,.032,.52,c.walnutD,{mode:7,gloss:.28,tag});
    box(x,surface+.038,z,.90,.020,.44,c.limestone,{hard:true,gloss:.18,tag});
    const potX=x+.18;
    taper(potX,surface+.13,z,.17,.18,.17,c.celadonL,{mode:7,gloss:.34,tag});
    cyl(potX,surface+.235,z,.13,.035,c.celadon,{gloss:.30,tag});
    ball(potX,surface+.275,z,.035,.035,.035,c.bronzeL,{gloss:.70,tag});
    // Low spout and its tip grow directly out of the pot shoulder.
    capsule(potX+.20,surface+.15,z,.030,.25,.030,c.bronzeD,
      {rz:Math.PI/2,gloss:.66,tag});
    taper(potX+.35,surface+.15,z,.055,.10,.055,c.celadon,
      {rz:Math.PI/2,gloss:.30,tag});
    // Two cups sit on broad saucers, separated enough to remain distinct silhouettes.
    for(const s of [-1,1]){
      const cupX=x-.22+s*.16;
      cyl(cupX,surface+.065,z,.105,.025,c.bronzeL,{gloss:.62,tag});
      taper(cupX,surface+.115,z,.072,.085,.072,c.white,{mode:7,gloss:.27,tag});
      ball(cupX,surface+.125,z,.050,.012,.050,c.tea,{mode:1,gloss:.52,tag});
    }
    steam(A,c,potX,surface+.27,z,3,tag);
  }

  // `stops` turns the trolley from a thing that drifts into a thing that is being WORKED (H190).
  // Each entry is {h0,h1,dx}: the hour window and how far along +x the cart stands during it. The
  // clock is read inside the tick and never at build time — a builder runs once, so a schedule
  // resolved there would bake whichever hour the page happened to load on. Between two stops the
  // cart eases rather than teleports, which is what makes it read as being pushed.
  //
  // `travel` (the old sine drift) still works and is what the parked trolleys use. A cart with
  // `stops` ignores it.
  function housekeepingCart(A,c,x,z,travel=0,tag='客房服务',stops=null) {
    const {box,cyl,capsule,ball,onTick}=A,parts=[];
    const span=stops?Math.max(...stops.map(s=>Math.abs(s.dx)))+4:(travel?travel+4:3);
    const add=p=>{fixed(p,span);parts.push(moving(p));return p;};
    // Open brass-framed trolley: shelves and linen remain visible through the silhouette.
    add(box(x,.25,z,1.36,.13,.78,c.walnutD,{mode:7,gloss:.28,tag}));
    for(const y of [.36,.67,.98])add(box(x,y,z,1.22,.075,.67,y===.98?c.limestone:c.walnutL,
      {mode:7,gloss:y===.98?.18:.28,tag}));
    for(const sx of [-1,1])for(const sz of [-1,1]){
      add(A.cyl(x+sx*.55,.66,z+sz*.28,0.0175,0.82,c.bronzeD,{gloss:.68,tag}));
      add(capsule(x+sx*.55,.17,z+sz*.28,.024,.18,.024,c.bronzeD,{tag}));
      add(cyl(x+sx*.55,.075,z+sz*.28,.12,.08,c.ink,{rz:Math.PI/2,gloss:.24,tag}));
      add(ball(x+sx*.55,.04,z+sz*.28,.045,.04,.045,c.steel,{gloss:.50,tag}));
    }
    // Varied folded linens on two shelves; each stack touches the shelf below.
    for(let row=0;row<2;row++)for(let i=0;i<3;i++)for(let j=0;j<2;j++)
      add(box(x-.34+i*.34,.43+row*.31+j*.075,z-.03,.29,.07,.48,
        (i+j+row)%3===0?c.celadonL:c.towel,{mode:7,gloss:.02,tag}));
    // Side laundry bag with top rail, bumper and stitched front pocket.
    add(box(x+.73,.59,z,.34,.72,.62,c.silk,{mode:7,gloss:.025,tag}));
    add(box(x+.73,.94,z,.38,.08,.66,c.bronzeD,{mode:7,gloss:.58,tag}));
    add(box(x+.90,.57,z-.18,.025,.34,.26,c.celadon,{hard:true,gloss:.05,tag}));
    add(capsule(x+.82,.22,z,.055,.62,.055,c.walnutD,{rx:Math.PI/2,tag}));
    // U-shaped push handle is tied into both rear posts, not a floating gold lozenge.
    for(const zz of [-.26,.26])add(capsule(x-.72,.84,z+zz,.040,.68,.040,c.bronze,{gloss:.70,tag}));
    add(capsule(x-.72,1.17,z,.040,.58,.040,c.bronze,{rx:Math.PI/2,gloss:.70,tag}));
    if(stops){
      let at=null;
      onTick((t,body,mins,dt)=>{
        const h=hours(mins);
        const s=stops.find(q=>q.h1>24?(h>=q.h0||h<q.h1-24):(h>=q.h0&&h<q.h1))||stops[0];
        if(at===null)at=s.dx;
        // 0.55 m/s is a pushed trolley, not a teleport, and the ease is frame-rate independent.
        const step=.55*Math.min(.2,dt||0);
        at+=Math.max(-step,Math.min(step,s.dx-at));
        M.trans(at,0,0,MS);                      // one trolley, one translation, forty parts
        for(const q of parts)q.p.m=M.mul(MS,q.m,q.out);
      });
    } else if(travel) onTick((t,body)=>{
      const d=(Math.sin(t*.16)*.5+.5)*travel;
      M.trans(d,0,0,MS);                         // one trolley, one translation, forty parts
      for(const q of parts)q.p.m=M.mul(MS,q.m,q.out);
    });
    return parts;
  }

  function planter(A,c,x,z,r=.55,sway=false,tag='绿化') {
    const {taper,capsule,ball,onTick}=A,leaves=[];
    taper(x,r*.36,z,r,r*.72,r,c.limestone,{gloss:.18,tag});
    A.cyl(x,.90,z,0.035,1.2,c.walnutD,{tag});
    for(let i=0;i<7;i++){
      const a=i/7*TAU,p=fixed(ball(x+Math.sin(a)*.38,1.28+(i%2)*.12,z+Math.cos(a)*.38,
        .30,.38,.18,c.green,{mode:15,gloss:.08,tag}),2.5);
      leaves.push({...moving(p),a});
    }
    if(sway) onTick((t,body,mins)=>{
      const weather=typeof Weather!=='undefined'&&Weather.now?Weather.now.wind:0.25;
      for(const q of leaves){
        M.trans(Math.sin(t*.65+q.a)*.055*(.5+weather),0,
                Math.cos(t*.53+q.a)*.035*(.5+weather),MS);
        q.p.m=M.mul(MS,q.m,q.out);
      }
    });
  }

  function roomUse(A,hz,x,z,zh,en,note,focus=[x,z],reach=2.0,tag=hz) {
    return A.thing(hz,x,1.32,z,zh,en,note,{tag,focus,reach});
  }

  // --------------------------------------------------------------------------- 5F guest rooms
  function fit5(A) {
    const c=palette(A,{carpet:A.C('#675d56'),accent:A.C('#78634f')});
    const {box,cyl,ball,capsule,flat,glyphs,solid,shade,thing,onTick,luminous}=A;
    // Calm residential arrival. A bordered runner, coffer rhythm and supported lanterns make the
    // route feel like finished hospitality architecture rather than an empty shell.
    flat(-2,.023,-3.65,28.5,2.45,c.carpet,{mode:7,gloss:.035,tag:'客房'});
    for(const z of [-4.78,-2.52])flat(-2,.030,z,28.4,.055,c.bronze,{gloss:.68,tag:'客房'});
    for(let x=-12;x<=9;x+=3.5) flat(x,.027,-3.65,1.45,.045,c.bronze,{gloss:.60,tag:'客房'});
    // Layered celadon threshold medallion under the lift plaque.
    cyl(14.15,.018,-3.65,1.45,.018,c.bronzeD,{gloss:.68,tag:'电梯厅'});
    cyl(14.15,.026,-3.65,1.24,.018,c.limestoneL,{gloss:.24,tag:'电梯厅'});
    cyl(14.15,.034,-3.65,.82,.018,c.jade,{gloss:.38,tag:'电梯厅'});
    for(let i=0;i<8;i++)flat(14.15,.044,-3.65,.08,2.10,c.bronzeL,
      {ry:i*Math.PI/4,gloss:.68,tag:'电梯厅'});
    // The identity plaque is mounted above the lift fascia: visible on arrival, never a blade
    // across the guest route or a foreground slab in a corridor view.
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'五楼客房','5F  GUEST ROOMS',2.30,c.jade);
    // Carved crest and short fascia brackets visibly tie the plaque into the lift portal.
    A.cyl(17.89,4.13,-.20,0.0175,2.2,c.bronzeL,{rx:Math.PI/2,gloss:.72,tag:'五楼客房'});
    for(const z of [-1.28,.88]){
      ball(17.89,4.13,z,.075,.075,.075,c.bronzeL,{gloss:.70,tag:'五楼客房'});
      capsule(17.95,3.25,z,.032,.30,.032,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'五楼客房'});
    }
    inkArt(A,c,-14.0,2.08,-3.70,3.2,1.65,5,Math.PI/2,'北京印象');

    // Ceiling coffers and lanterns. Every light has a ceiling canopy, hanger and bronze collar.
    box(-2,4.05,-4.92,29.0,.13,.14,c.walnutD,{hard:true,gloss:.30,tag:'客房'});
    box(-2,4.05,-2.38,29.0,.13,.14,c.walnutD,{hard:true,gloss:.30,tag:'客房'});
    for(const x of [-12,-7.5,-3,1.5,6,10.5]){
      box(x,4.05,-3.65,.14,.14,2.68,c.walnutD,{hard:true,gloss:.30,tag:'客房'});
      // Ceiling cleats close the former air gap at both coffer rails. The matching center boss
      // carries the lantern canopy on the same centerline as the crossbeam.
      for(const z of [-4.92,-2.38]){
        box(x,4.235,z,.30,.24,.30,c.walnutD,{hard:true,gloss:.30,tag:'客房'});
        cyl(x,4.15,z,.16,.08,c.bronzeD,{gloss:.64,tag:'客房'});
      }
      capsule(x,4.245,-3.65,.035,.36,.035,c.bronzeD,{gloss:.66,tag:'客房'});
      cyl(x,4.275,-3.65,.20,.15,c.walnutD,{gloss:.30,tag:'客房'});
      cyl(x,4.16,-3.65,.18,.10,c.bronzeD,{gloss:.64,tag:'客房'});
      capsule(x,3.94,-3.65,.025,.38,.025,c.bronze,{gloss:.68,tag:'客房'});
      luminous(ball(x,3.70,-3.65,.13,.18,.13,c.warm,{mode:1,tag:'客房'}),.045,.28);
      cyl(x,3.56,-3.65,.16,.06,c.jade,{gloss:.24,tag:'客房'});
    }
    // The landing medallion gets its own ceiling-mounted pendant. The earlier isolated x=15
    // crossbar sat beyond the long coffer rails and consequently read as a floating black beam.
    cyl(14.15,4.275,-3.65,.24,.15,c.walnutD,{gloss:.30,tag:'电梯厅'});
    cyl(14.15,4.16,-3.65,.19,.10,c.bronzeD,{gloss:.64,tag:'电梯厅'});
    capsule(14.15,3.93,-3.65,.027,.40,.027,c.bronze,{gloss:.68,tag:'电梯厅'});
    luminous(ball(14.15,3.67,-3.65,.15,.20,.15,c.warm,{mode:1,tag:'电梯厅'}),.05,.30);
    cyl(14.15,3.51,-3.65,.18,.07,c.jade,{gloss:.24,tag:'电梯厅'});
    // Lift-bank sconces are mounted with backplates and arms in the gaps between cars.
    for(const z of [-5.35,1.15]){
      cyl(17.94,2.12,z,.15,.055,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'电梯厅'});
      capsule(17.75,2.12,z,.028,.28,.028,c.bronze,{rz:Math.PI/2,gloss:.68,tag:'电梯厅'});
      luminous(ball(17.57,2.12,z,.12,.17,.12,c.warm,{mode:1,tag:'电梯厅'}),.04,.26);
    }

    // Framed silk wall panels dress every solid bay between the south guestroom portals, and three
    // of them carry a real hung print.
    //
    // H240 asks for framed prints in the corridor. What was here was a silk field with one bronze
    // rod raked across it and a lacquer dot — which reads in every corridor camera as a blank
    // stretched canvas, not as panelling and not as a picture. The rod and dot are gone; the bays
    // are now plain fielded panelling, which is what they are, and the pictures are real paintings
    // hung proud of them at eye height with their own titles. Same idiom on the service wall
    // below, so the guest side and the staff side of the corridor read as one gallery.
    for(const [i,q] of [[-12.35,2.18],[-8.05,2.08],[-4.75,2.14],[-.45,2.12],[2.90,2.12],[8.15,3.72]].entries()){
      const x=q[0],w=q[1];
      box(x,1.58,-5.035,w,2.38,.040,c.walnutD,{hard:true,gloss:.31,tag:'客房'});
      box(x,1.58,-5.008,w-.18,2.18,.025,i%2?c.silkL:c.celadonL,{hard:true,mode:1,gloss:.06,tag:'客房'});
    }
    // yaw pi, so inkArt's paper plane steps to +z and the painting faces the corridor rather than
    // the bay it hangs on. Distinct seeds, so no two are the same picture.
    for(const [x,w,seed,title] of [
      [-12.35,1.62,131,'城南晨雾'],[-4.75,1.58,467,'什刹初雪'],[2.90,1.56,829,'长街灯影'],
    ]){
      inkArt(A,c,x,1.72,-5.00,w,1.02,seed,Math.PI,'走廊挂画');
      glyphs(x,1.06,-4.930,0,title,
        {size:.062,gap:.011,color:c.ink,mode:1,lift:.006,tag:'走廊挂画'});
    }

    // A continuous privacy wall separates the calm guest circulation from the working service
    // route. The former version dressed four isolated starter blocks as rooms 504–507; from the
    // service lift their exposed backs read as a forest of floating black/white panels and forced
    // the player through narrow collision gaps. Plinth, crown and end returns now make one piece of
    // architecture, with silk on the guest face and a durable celadon dado on the staff face.
    const serviceWallX=-1.25,serviceWallW=25.30,serviceWallZ=5.10;
    box(serviceWallX,1.55,serviceWallZ,serviceWallW,3.10,.18,c.plaster,
      {hard:true,tag:'客房服务隔墙'});
    solid(serviceWallX-serviceWallW*.5,serviceWallX+serviceWallW*.5,
      serviceWallZ-.10,serviceWallZ+.10);
    for(const side of [-1,1]){
      const faceZ=serviceWallZ+side*.105;
      box(serviceWallX,.10,faceZ,serviceWallW,.20,.12,c.walnutD,
        {hard:true,gloss:.29,tag:'客房服务隔墙'});
      box(serviceWallX,3.08,faceZ,serviceWallW,.16,.12,c.walnutD,
        {hard:true,gloss:.29,tag:'客房服务隔墙'});
    }
    // Guest-side framed silk bays are shallow appliques, all visibly fixed to the wall.
    for(const [i,x] of [-11.15,-7.20,-3.25,.70,4.65,8.60].entries()){
      box(x,1.62,4.985,3.34,2.18,.045,c.walnutD,
        {hard:true,gloss:.31,tag:'客房服务隔墙'});
      box(x,1.62,4.952,3.10,1.94,.025,i%2?c.silkL:c.celadonL,
        {hard:true,mode:1,gloss:.05,tag:'客房服务隔墙'});
    }
    // yaw 0 here: the corridor is south of this wall, and inkArt's paper steps to -z at yaw 0.
    for(const [x,w,seed,title] of [
      [-7.20,1.66,233,'西山晚照'],[4.65,1.60,617,'京华旧影'],
    ]){
      inkArt(A,c,x,1.76,4.94,w,1.04,seed,0,'走廊挂画');
      glyphs(x,1.08,4.868,Math.PI,title,
        {size:.062,gap:.011,color:c.ink,mode:1,lift:.006,tag:'走廊挂画'});
    }
    // Staff-side wainscot, rail and supported sconces make the dedicated service route legible.
    box(serviceWallX,.72,5.205,serviceWallW-.18,1.18,.035,c.celadonL,
      {hard:true,mode:7,gloss:.045,tag:'员工通道'});
    box(serviceWallX,1.34,5.225,serviceWallW-.12,.085,.10,c.bronzeD,
      {hard:true,gloss:.60,tag:'员工通道'});
    for(const x of [-10.5,-5.5,-.5,4.5,9.5]){
      box(x,2.20,5.218,.42,.52,.055,c.walnutD,
        {hard:true,mode:7,gloss:.30,tag:'员工通道'});
      capsule(x,2.20,5.34,.026,.24,.026,c.bronze,
        {rx:Math.PI/2,gloss:.68,tag:'员工通道'});
      luminous(ball(x,2.20,5.50,.11,.16,.11,c.warm,
        {mode:1,tag:'员工通道'}),.035,.24);
    }
    // The east end is the generous, unobstructed turn from the service lift.
    box(11.46,1.55,5.70,.18,3.10,1.38,c.walnutD,
      {hard:true,gloss:.30,tag:'员工通道'});
    box(11.35,2.44,5.70,.035,.54,1.04,c.ink,
      {hard:true,mode:7,gloss:.34,tag:'员工通道'});
    glyphs(11.31,2.55,5.70,-Math.PI/2,'员工通道',
      {size:.12,gap:.020,color:c.bronzeL,mode:1,lift:.006,tag:'员工通道'});
    glyphs(11.31,2.30,5.70,-Math.PI/2,'SERVICE',
      {size:.065,gap:.012,color:c.silkL,mode:1,lift:.006,tag:'员工通道'});

    // Three full south rooms. Segmented front walls leave a 1.30 m threshold into each room.
    // `service` is the two hours housekeeping is inside that room (H190). Rooms are worked west to
    // east, one after another and never two at once, and the same three windows drive the trolley
    // below and 罗小燕's own day at the bottom of this file — one schedule, three readers, so the
    // door, the cart and the person cannot disagree about which room is being made up.
    const rooms=[
      {tag:'五零一',no:501,x0:-13.8,x1:-6.7,door:-10.2,bed:-10.9,light:-10.65,accent:c.celadon,service:[9,11]},
      {tag:'五零二',no:502,x0:-6.2,x1:1.0,door:-2.6,bed:-3.5,light:-3.40,accent:c.silk,service:[11,13]},
      {tag:'五零三',no:503,x0:1.5,x1:10.5,door:5.1,bed:4.2,light:4.25,accent:c.celadonL,access:true,service:[13,15]},
    ];
    for(const r of rooms){
      flat((r.x0+r.x1)/2,.021,-9.65,r.x1-r.x0,9.0,c.limestoneL,
        {mode:7,gloss:.14,mat:'tile',matScale:.70,matAmt:.12,tag:'客房'});
      // Walnut base/crown trim encloses each room and meets the walls at every corner.
      box((r.x0+r.x1)/2,.10,-14.73,r.x1-r.x0-.18,.20,.10,c.walnutD,{hard:true,gloss:.28,tag:'客房'});
      box((r.x0+r.x1)/2,3.10,-14.70,r.x1-r.x0-.18,.16,.12,c.walnutD,{hard:true,gloss:.28,tag:'客房'});
      for(const xx of [r.x0+.08,r.x1-.08]){
        box(xx,.10,-9.82,.10,.20,9.55,c.walnutD,{hard:true,gloss:.28,tag:'客房'});
        box(xx,3.10,-9.82,.12,.16,9.55,c.walnutD,{hard:true,gloss:.28,tag:'客房'});
      }
      const left=r.door-.72-r.x0,right=r.x1-(r.door+.72);
      if(left>0){box(r.x0+left/2,1.58,-5.15,left,3.16,.16,c.plaster,{hard:true,tag:wallTag()});solid(r.x0,r.door-.72,-5.24,-5.07);}
      if(right>0){box(r.door+.72+right/2,1.58,-5.15,right,3.16,.16,c.plaster,{hard:true,tag:wallTag()});solid(r.door+.72,r.x1,-5.24,-5.07);}
      door(A,c,r.door,-5.12,0,'客房',r.tag,r.no,r.service);
      glyphs(r.door,2.83,-5.255,0,r.access?`${r.tag}  无障碍`:r.tag,
        {size:.105,gap:.018,color:c.bronze,mode:1,lift:.007,tag:'客房'});
      // Dividing walls stop short of the corridor and keep each room architecturally complete.
      if(r!==rooms[0]){box(r.x0,1.58,-9.75,.14,3.16,9.2,c.plaster,{hard:true,tag:wallTag()});solid(r.x0-.08,r.x0+.08,-14.5,-5.15);}
      // 503 is the last room in the row, so it needs its own east enclosure. Without it the bed,
      // bath and wheelchair were exposed directly to the lift hall as soon as the car opened.
      if(r===rooms[rooms.length-1]){
        box(r.x1,1.58,-9.75,.14,3.16,9.2,c.plaster,{hard:true,tag:wallTag()});
        solid(r.x1-.08,r.x1+.08,-14.5,-5.15);
      }
      curtains(A,c,(r.x0+r.x1)/2,-14.66,r.x1-r.x0-1.0,'窗帘');
      skyline(A,c,(r.x0+r.x1)/2,-14.72,r.x1-r.x0-.55,2.18,'北京景观');
      // Supported room lantern with a silk drum and celadon finial.
      const cx=r.light;
      cyl(cx,4.13,-9.20,.16,.10,c.bronzeD,{gloss:.64,tag:'客房灯'});
      capsule(cx,3.89,-9.20,.025,.42,.025,c.bronze,{tag:'客房灯'});
      luminous(ball(cx,3.62,-9.20,.20,.24,.20,c.warm,{mode:1,tag:'客房灯'}),.04,.25);
      cyl(cx,3.42,-9.20,.22,.08,c.celadon,{gloss:.22,tag:'客房灯'});
    }

    // 501: true bed / seating / work / bath sequence.
    bed(A,c,-10.65,-10.55,2.30,'床',c.celadon);lamp(A,c,-12.40,-10.35);lamp(A,c,-8.92,-10.35);
    desk(A,c,-8.25,-7.15,1.48,0,'书桌');
    solid(-9.03,-7.47,-7.58,-6.72);
    chair(A,c,-8.25,-6.05,Math.PI,'椅子',c.silkL);
    inkArt(A,c,-8.35,2.16,-5.31,2.10,1.18,51,0,'客房水墨');
    guestTeaSet(A,c,-8.25,-7.15,'欢迎茶',.84);
    roomUse(A,'椅子',-8.25,-6.05,'在书桌前坐一会儿。','Sit at the writing desk for a while.',
      '椅子 is a chair.',[-8.25,-6.05],1.45);
    roomUse(A,'欢迎茶',-8.25,-7.15,'客房准备了热茶。','The room has prepared hot tea.',
      '欢迎茶 is welcome tea.',[-8.25,-6.75],1.55);
    television(A,c,-13.62,1.88,-8.0,1.42,Math.PI/2);
    bathroom(A,c,-12.0,-7.20,3.15,3.45,'浴室',false);
    sleepingFigure(A,c,-10.65,-10.55,'睡眠');
    roomUse(A,'床',-10.65,-10.2,'旅途累了，在客房里睡一觉。','Rest in the guestroom bed.','床 is a bed.',[-10.65,-9.2],2.0);

    // 502: twin room with a proper shared nightstand and reading chair.
    bed(A,c,-4.85,-10.80,1.45,'床',c.silk);bed(A,c,-1.95,-10.80,1.45,'床',c.silk);
    lamp(A,c,-3.40,-10.45);roundTable(A,c,-1.70,-7.12,.55,'茶桌');
    solid(-2.31,-1.09,-7.73,-6.51);
    guestTeaSet(A,c,-1.70,-7.12,'欢迎茶');
    chair(A,c,-.75,-6.25,-Math.PI*.736,'阅读椅',c.celadon);
    roomUse(A,'床',-3.40,-10.45,'双床房也可以在这里休息。','Rest in the twin room.',
      '床 is a bed.',[-3.40,-9.55],2.0);
    roomUse(A,'阅读椅',-.75,-6.25,'坐下来读一会儿。','Sit down and read for a while.',
      '阅读椅 is a reading chair.',[-.75,-6.25],1.45);
    roomUse(A,'欢迎茶',-1.70,-7.12,'坐下喝一杯欢迎茶。','Sit down for a cup of welcome tea.',
      '欢迎茶 is welcome tea.',[-1.15,-6.60],1.55);
    bathroom(A,c,-5.05,-7.25,2.05,3.35,'浴室',false);
    television(A,c,-6.06,1.82,-8.1,1.30,Math.PI/2);

    // 503: wider clearances, low bed, roll-under desk and a visibly usable accessible bath.
    bed(A,c,4.25,-10.55,2.45,'无障碍床',c.celadonL);lamp(A,c,2.52,-10.30);lamp(A,c,5.98,-10.30);
    desk(A,c,8.30,-7.25,1.80,0,'无障碍书桌');
    solid(7.35,9.25,-7.68,-6.82);
    chair(A,c,8.30,-6.05,Math.PI,'椅子',c.celadonL);
    inkArt(A,c,8.25,2.16,-5.31,2.25,1.18,53,0,'客房水墨');
    guestTeaSet(A,c,8.30,-7.25,'欢迎茶',.84);
    roomUse(A,'床',4.25,-10.30,'无障碍床保留了宽阔的侧向转移空间。',
      'The accessible bed preserves a broad side-transfer space.','床 is a bed.',[4.25,-9.30],2.0);
    roomUse(A,'椅子',8.30,-6.05,'在无障碍书桌前坐下。','Sit at the accessible writing desk.',
      '椅子 is a chair.',[8.30,-6.05],1.45);
    roomUse(A,'欢迎茶',8.30,-7.25,'客房准备了热茶。','The room has prepared hot tea.',
      '欢迎茶 is welcome tea.',[8.30,-6.65],1.55);
    // The accessible bath occupies a full 4.2 x 3.7 m bay: enough for a genuine side-transfer
    // zone and turning area rather than forcing accessible fixtures into the standard bath width.
    bathroom(A,c,3.75,-7.25,4.20,3.70,'无障碍浴室',true);
    // Complete wheelchair with paired wheels, axle, framed seat/back, push handles and footrest.
    // It is parked beside the bed, facing the window and entirely outside the entry/bath/desk
    // transfer aisle. The earlier sideways position occupied the very clearance it advertised.
    const wcx=8.60,wcz=-11.65;
    for(const sx of [-1,1]){
      const wx=wcx+sx*.34;
      A.cyl(wx,.46,wcz,.43,.055,c.ink,{rz:Math.PI/2,gloss:.22,tag:'轮椅'});
      A.cyl(wx,.46,wcz,.34,.061,c.bronze,{rz:Math.PI/2,gloss:.66,tag:'轮椅'});
      A.cyl(wx,.46,wcz,.075,.075,c.walnutD,{rz:Math.PI/2,gloss:.35,tag:'轮椅'});
      capsule(wx,.77,wcz+.23,.030,.74,.030,c.bronzeD,{gloss:.65,tag:'轮椅'});
      capsule(wx,1.24,wcz+.29,.030,.28,.030,c.bronzeD,{rx:Math.PI/2,gloss:.65,tag:'轮椅'});
    }
    capsule(wcx,.46,wcz,.035,.68,.035,c.bronzeD,{rz:Math.PI/2,gloss:.62,tag:'轮椅'});
    box(wcx,.64,wcz,.62,.12,.58,c.celadon,{mode:7,gloss:.03,tag:'轮椅'});
    box(wcx,.99,wcz+.26,.62,.58,.10,c.celadonL,{mode:7,gloss:.03,tag:'轮椅'});
    capsule(wcx,.28,wcz-.37,.035,.54,.035,c.bronzeD,{rz:Math.PI/2,gloss:.62,tag:'轮椅'});
    box(wcx,.20,wcz-.44,.50,.07,.24,c.walnutL,{mode:7,gloss:.27,tag:'轮椅'});
    roomUse(A,'无障碍客房',5.10,-8.35,'门口、书桌和浴室都留出了轮椅空间。',
      'The doorway, desk and bathroom preserve wheelchair clearance.','无障碍 means accessible.',[5.10,-6.0],2.5);

    // North housekeeping pantry and physical service route from the service lift.
    // Two wall returns and a generous opening. The first fit-out used one continuous wall here,
    // so its own camera could see the pantry sign but no pantry and the service route was a lie.
    box(-6.72,1.55,9.10,3.16,3.10,.16,c.walnutD,{hard:true,tag:'布草间'});
    box(-1.68,1.55,9.10,3.16,3.10,.16,c.walnutD,{hard:true,tag:'布草间'});
    box(-4.20,3.13,9.10,1.88,.46,.16,c.walnutD,{hard:true,tag:'布草间'});
    for(const [i,x] of [-6.72,-1.68].entries()){
      box(x,1.55,9.005,2.84,2.82,.035,c.bronzeD,{hard:true,gloss:.62,tag:'布草间'});
      box(x,1.55,8.978,2.58,2.56,.022,i?c.silkL:c.celadonL,{hard:true,mode:1,gloss:.06,tag:'布草间'});
      for(const s of [-1,1])capsule(x+s*.48,1.55,8.952,.025,1.52,.025,c.bronzeL,
        {rz:s*(i?-.55:.55),gloss:.68,tag:'布草间'});
      ball(x,1.55,8.946,.08,.08,.025,c.lacquer,{mode:1,glow:.025,tag:'布草间'});
    }
    box(-4.20,3.31,9.02,2.22,.16,.28,c.bronzeD,{mode:7,gloss:.64,tag:'布草间'});
    box(-8.22,1.55,11.55,.16,3.10,5.05,c.plaster,{hard:true,tag:'布草间'});
    sign(A,c,-4.20,2.68,9.00,0,'客房部','HOUSEKEEPING',1.82,c.jade);
    // Built-in linen wall with toe-kick, crown, framed cubbies and varied stacks. It is mounted to
    // the north perimeter instead of standing in the middle of the pantry, restoring a deep turn
    // circle and keeping both the player camera and the working housekeeper out of the shelves.
    box(-4.55,.06,14.48,6.45,.12,.72,c.walnutD,{gloss:.27,tag:'布草间'});
    box(-4.55,1.34,14.62,6.60,2.55,.18,c.walnutD,{hard:true,gloss:.30,tag:'布草间'});
    box(-4.55,2.64,14.43,6.72,.16,.60,c.bronzeD,{mode:7,gloss:.62,tag:'布草间'});
    for(let i=0;i<=4;i++)box(-7.28+i*1.37,1.35,14.30,.10,2.45,.62,c.walnut,
      {hard:true,gloss:.30,tag:'布草间'});
    for(const y of [.50,1.16,1.82,2.48])box(-4.55,y,14.30,6.30,.09,.64,
      y===2.48?c.bronzeD:c.walnutL,{mode:7,gloss:.31,tag:'布草间'});
    for(let bay=0;bay<4;bay++)for(let shelf=0;shelf<3;shelf++)for(let j=0;j<2;j++){
      const xx=-6.78+bay*1.37+(j-.5)*.32,yy=.58+shelf*.66+j*.075;
      box(xx,yy,14.00,.55,.07,.40,(bay+shelf+j)%4===0?c.celadonL:c.towel,
        {mode:7,gloss:.02,tag:'布草间'});
    }
    // Integrated lower sorting drawers keep the aisle clear and avoid loose bins in front of the
    // millwork. Every front has a reveal, label field and centered pull.
    for(let bay=0;bay<4;bay++){
      const xx=-6.78+bay*1.37;
      box(xx,.28,14.00,1.12,.40,.50,c.walnut,{mode:7,gloss:.29,tag:'布草间'});
      box(xx,.28,13.735,.94,.25,.025,bay%2?c.silkL:c.celadonL,
        {hard:true,mode:1,gloss:.05,tag:'布草间'});
      capsule(xx,.40,13.705,.022,.28,.022,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'布草间'});
    }
    // Cleaning amenities sit on the counter, each with a cap and tray rather than floating bars.
    box(-4.55,2.55,13.98,1.55,.06,.42,c.limestone,{mode:7,gloss:.18,tag:'布草间'});
    for(let i=0;i<4;i++){
      A.cyl(-5.02+i*.32,2.69,13.98,.075,.22,i%2?c.celadon:c.white,{gloss:.25,tag:'布草间'});
      A.cyl(-5.02+i*.32,2.82,13.98,.04,.05,c.bronzeL,{gloss:.65,tag:'布草间'});
    }
    // Both trolleys park outside the marked circulation centerlines. A shallow, fully backed staff
    // bay keeps the moving trolley off the corridor and out of the linen-wall work clearance.
    box(-11.35,.08,7.80,3.40,.16,.92,c.walnutD,{hard:true,gloss:.28,tag:'客房服务'});
    box(-11.35,1.34,8.18,3.40,2.52,.16,c.walnutD,{hard:true,gloss:.30,tag:'客房服务'});
    box(-11.35,2.66,8.05,3.58,.18,.40,c.bronzeD,{hard:true,gloss:.62,tag:'客房服务'});
    glyphs(-11.35,2.40,7.95,0,'客房服务',{size:.12,gap:.018,color:c.bronzeL,mode:1,lift:.006,tag:'客房服务'});
    housekeepingCart(A,c,15.0,6.80,0,'客房服务');
    // Parked, not drifting. This one stands in the staff bay as a spare; a cart that slides two
    // metres back and forth in a store room for ever is the thing H190 is complaining about.
    housekeepingCart(A,c,-12.30,7.55,0,'客房服务');
    // The one that is actually being worked. It stands 1.6 m east of whichever room's door is
    // open, on the corridor line at z -4.35 — clear of the guest spine at z -3.70 and of the
    // doorway itself — and is parked at the service end outside the round. Built at 501's stop, so
    // dx is the distance from there to each of the others.
    housekeepingCart(A,c,-8.60,-4.35,0,'客房服务',[
      { h0:9,  h1:11, dx:0 },        // 五零一, door x -10.20
      { h0:11, h1:13, dx:7.60 },     // 五零二, door x  -2.60
      { h0:13, h1:15, dx:15.30 },    // 五零三, door x   5.10
      { h0:15, h1:33, dx:18.20 },    // parked by the service route until nine the next morning
    ]);
    thing('布草间',-4.2,1.35,9.0,'布草间里的床单和毛巾按房号分类。',
      'Sheets and towels are sorted by room number in the linen pantry.','布草 is hotel linen.',
      {tag:'布草间',focus:[-4.2,12.55],reach:2.2});
    thing('客房服务',15.0,1.25,6.80,'服务车从服务梯沿专用路线进入客房层。',
      'The service trolley reaches the floor along the dedicated service route.','客房服务 means room service.',
      {tag:'客房服务',focus:[14.5,6.25],reach:2.1});
  }

  // --------------------------------------------------------------------------- 8F deluxe rooms
  function fit8(A) {
    const c=palette(A,{carpet:A.C('#594b45'),accent:A.C('#725a43'),silk:A.C('#aa8f78')});
    const {box,flat,solid,glyphs,thing,luminous}=A;
    // Richer arrival gallery with a broad stone threshold and a composed celadon focal wall.
    flat(-1,.023,-3.65,26,2.30,c.carpet,{mode:7,gloss:.032,tag:'豪华客房'});
    flat(8.6,.026,-3.65,4.7,2.30,c.limestoneL,{mode:7,gloss:.20,mat:'tile',matScale:.62,matAmt:.18,tag:'豪华客房'});
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'八楼豪华客房','8F  DELUXE ROOMS',2.55,c.bronzeD);
    inkArt(A,c,-14.2,2.06,-3.65,3.0,1.56,8,Math.PI/2,'京城山水');

    // South deluxe room 801: entry, stone bath, bed, lounge and deep window bench.
    box(-2.0,1.58,-5.12,22.0,3.16,.16,c.plaster,{hard:true,tag:wallTag()});
    solid(-13.4,-8.2,-5.21,-5.04);solid(-6.8,9.0,-5.21,-5.04);
    door(A,c,-7.5,-5.12,0,'豪华客房','801',801);
    glyphs(-7.5,2.84,-5.25,0,'801  豪华客房',{size:.11,gap:.020,color:c.bronzeL,mode:1,lift:.007,tag:'豪华客房'});
    // Bronze-framed celadon silk panels turn the deluxe corridor into an arrival gallery and
    // distinguish it immediately from 5F's quieter residential passage.
    for(const [i,x] of [-4.2,-1.1,2.0,5.1,7.5].entries()){
      box(x,1.68,-5.015,2.25,2.20,.032,c.bronzeD,{hard:true,mode:1,gloss:.58,tag:'豪华客房'});
      luminous(box(x,1.68,-4.988,2.06,2.00,.018,i%2?c.celadon:c.silk,
        {hard:true,mode:1,gloss:.08,tag:'豪华客房'}),.014,.055);
      // A bronze fret band across the lower third. The raked rod and lacquer dot that used to be
      // here were the same mark floors 5 and 6 carried, so three floors read as one blank-canvas
      // motif side by side; 8F's register is backlit silk behind cast bronze, which is what makes
      // the step up from 5F's plain panelling and hung paper legible without a caption (H251).
      A.box(x,1.30,-4.962,1.86,.045,.016,c.bronzeL,{hard:true,mode:1,gloss:.70,tag:'豪华客房'});
      for(let k=0;k<4;k++)
        A.box(x-.70+k*.465,1.30+(k%2?.10:-.10),-4.962,.045,.20,.016,c.bronzeL,
          {hard:true,mode:1,gloss:.70,tag:'豪华客房'});
      A.ball(x+.43,2.34,-4.968,.075,.075,.026,c.lacquer,
        {mode:1,glow:.035,tag:'豪华客房'});
    }
    flat(-2,.021,-9.75,22.0,9.2,c.limestoneL,{mode:7,gloss:.16,mat:'tile',matScale:.78,matAmt:.16,tag:'豪华客房'});
    skyline(A,c,-1.8,-14.73,21.2,2.40,'城市天际',true);curtains(A,c,-2.0,-14.65,20.0,'窗帘');
    bed(A,c,-3.6,-10.65,2.75,'豪华床',c.silk);lamp(A,c,-5.60,-10.40);lamp(A,c,-1.58,-10.40);
    television(A,c,8.88,1.95,-9.75,1.75,Math.PI/2);
    roundTable(A,c,3.05,-9.05,.70,'茶桌');
    chair(A,c,2.25,-8.35,Math.atan2(3.05-2.25,-9.05-(-8.35)),'窗边榻',c.silkL);
    chair(A,c,3.85,-8.35,Math.atan2(3.05-3.85,-9.05-(-8.35)),'窗边榻',c.celadon);
    // Fully joined millwork, layered upholstery and asymmetric bolsters make the broad window seat
    // feel purpose-built. The suite-scale wet room uses a freestanding bath and open rain shower.
    deluxeDaybed(A,c,5.8,-13.30,5.0,'窗边榻');
    deluxeBathroom(A,c,-10.3,-9.25,5.2,7.3,'景观浴缸');
    roomUse(A,'窗边榻',5.8,-12.8,'坐在窗边榻上可以看到京城天际线。',
      'The deep window seat looks across the Beijing skyline.','榻 is a raised daybed or window seat.',[5.8,-11.8],2.2);
    sleepingFigure(A,c,-3.6,-10.65,'睡眠');

    // North corner room 808: a different plan organised around an L-shaped panorama.
    box(-5.4,1.58,5.05,17.0,3.16,.16,c.walnutD,{hard:true,tag:wallTag()});
    solid(-13.9,-10.2,4.97,5.13);solid(-8.8,3.1,4.97,5.13);
    door(A,c,-9.5,5.06,0,'转角景观房','808',808);
    flat(-5.5,.021,10.0,17.0,9.4,c.carpetL,{mode:7,gloss:.035,tag:'转角景观房'});
    skyline(A,c,-4.6,14.72,15.2,2.45,'转角景观',true,Math.PI);
    skyline(A,c,-13.72,10.0,8.0,2.45,'转角景观',true,Math.PI/2);
    curtains(A,c,-4.7,14.63,14.3,'窗帘');
    bed(A,c,-5.0,10.30,2.70,'转角大床',c.celadon);lamp(A,c,-7.0,10.05);lamp(A,c,-3.02,10.05);
    // Corner chaise and telescope-like bronze viewer provide a reason to visit this room.
    box(-11.3,.48,11.65,2.80,.58,1.20,c.celadon,{mode:7,gloss:.035,tag:'窗边榻'});
    lowPlinth(A,c,-11.3,11.65,2.45,.90,'窗边榻');
    box(-11.8,.88,12.05,1.05,.55,.30,c.silkL,{mode:7,gloss:.03,tag:'窗边榻'});
    A.cyl(-10.0,1.18,12.55,0.035,1.62,c.bronze,{rx:-.55,gloss:.70,tag:'观景镜'});
    A.cyl(-10.0,.55,12.55,0.0275,1.02,c.bronzeD,{tag:'观景镜'});
    roundTable(A,c,.20,10.25,.65,'茶桌');
    chair(A,c,.9,9.55,Math.atan2(.20-.9,10.25-9.55),'椅子',c.silkL);
    television(A,c,2.92,1.90,8.40,1.50,Math.PI/2);
    roomUse(A,'转角景观房',-9.5,8.0,'转角玻璃把两个方向的城市景观连在一起。',
      'Corner glazing joins two directions of the city panorama.','转角 means corner.',[-9.5,6.2],2.4);

    // A real open pantry, not a labelled wall: low stone counter, tea and towel shelves, and a
    // shallow walnut back.  It faces the service spine and keeps the x=9 route usable.
    box(8.6,1.55,9.22,3.05,2.70,.14,c.walnut,{hard:true,tag:'客房服务'});
    box(8.6,.58,8.78,2.72,1.06,.66,c.limestone,{gloss:.20,tag:'客房服务'});
    box(8.6,1.10,8.68,2.55,.08,.48,c.bronzeD,{hard:true,gloss:.58,tag:'客房服务'});
    for(let i=0;i<4;i++){
      box(7.75+i*.57,1.21,9.12,.46,.11,.35,i%2?c.towel:c.celadonL,
        {mode:7,gloss:.02,tag:'客房服务'});
      A.cyl(7.78+i*.56,1.17,8.55,.095,.10,i%2?c.white:c.celadonL,
        {gloss:.28,tag:'客房服务'});
    }
    glyphs(8.6,2.45,9.09,0,'客房服务',{size:.15,gap:.030,color:c.bronzeL,mode:1,lift:.003,tag:'客房服务'});
    housekeepingCart(A,c,10.55,6.15,0,'客房服务');
    thing('客房服务',10.55,1.22,6.15,'豪华客房也使用东侧的服务梯和备餐柜。',
      'Deluxe rooms use the east service lift and floor pantry.','备餐柜 is a service pantry.',{tag:'客房服务',focus:[11.5,5.75],reach:2.0});
  }

  // ---------------------------------------------------------------------- 10F executive lounge
  function fit10(A) {
    const c=palette(A,{carpet:A.C('#51443c'),silk:A.C('#8d765e'),accent:A.C('#785a36')});
    const {box,cyl,flat,glyphs,solid,shade,thing,luminous,onTick}=A;
    flat(-1,.022,-3.65,27.5,2.25,c.carpet,{mode:7,gloss:.03,tag:'行政酒廊'});
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'行政酒廊','10F  EXECUTIVE LOUNGE',2.55,c.bronzeD);
    inkArt(A,c,-14.0,2.08,-3.66,3.4,1.70,10,Math.PI/2,'京城水墨');
    // The full north face reads as club-like skyline glazing, with walnut mullions and deep bays.
    skyline(A,c,-1.0,14.70,25.0,2.62,'城市天际',true,Math.PI);
    for(let x=-12;x<=10;x+=3.7)box(x,2.10,14.57,.10,3.35,.26,c.bronzeD,{hard:true,gloss:.62,tag:'城市天际'});
    // Breakfast room south-west. A screen wall hides service preparation without sealing it.
    flat(-6.2,.023,-9.4,14.4,8.2,c.limestoneL,{mode:7,gloss:.18,mat:'tile',matScale:.62,matAmt:.18,tag:'早餐'});
    box(-6.2,1.58,-5.15,14.4,3.16,.16,c.plaster,{hard:true,tag:wallTag()});
    solid(-13.4,-8.1,-5.23,-5.07);solid(-6.7,.9,-5.23,-5.07);
    door(A,c,-7.4,-5.12,0,'早餐','早餐');
    sign(A,c,-6.2,2.70,-5.03,0,'行政早餐','EXECUTIVE BREAKFAST',4.3,c.jade);
    // Stone buffet with real food heights, coffee urn and continuously rising steam.
    box(-6.2,.86,-11.7,8.8,.78,1.15,c.limestone,{gloss:.20,tag:'早餐台'});
    // H256 — the servery had seven empty platters and never changed, so HT10-breakfast at 08:30
    // showed a cleared counter in the middle of breakfast. Two groups now share the platters and
    // exactly one of them is up at a time: the food during service, and the cleared counter after
    // it. The hour is read inside the tick, never at build time — a builder runs once and would
    // bake whatever day and hour the page happened to load on.
    //
    // Hidden the way js/hotel-guests.js hides a sleeping figure: the matrix goes to the shared
    // `hide` transform. The cull sphere does not move, so a hidden item costs an instance slot and
    // never a draw call, and nothing has to be rebuilt when the window opens.
    const SERVE0=6.5,SERVE1=10.5;
    const hot=[],cleared=[],warmers=[];
    const grp=(arr,p)=>{fixed(p,5);arr.push(moving(p));return p;};
    for(let i=0;i<7;i++){
      const px=-9.3+i*1.05;
      cyl(px,1.27,-11.7,.36,.08,i%3===0?c.celadonL:i%3===1?c.rose:c.walnutL,{gloss:.25,tag:'早餐'});
      box(px,1.29,-11.7,.48,.05,.08,c.bronze,{hard:true,gloss:.65,tag:'早餐'});
      // Chinese breakfast, dish by dish along the counter: steamed buns, congee, dumplings,
      // pickles, fruit, pastry, eggs. Each platter gets a different one so the run reads as a
      // buffet rather than seven of the same thing.
      if(i%3===0){                                   // 包子 in a bamboo steamer, lid tilted off
        A.cyl(px,1.365,-11.7,.30,.11,c.tea,{gloss:.16,tag:'早餐'});
        for(let k=0;k<5;k++){const a=k/5*TAU;
          grp(hot,A.ball(px+Math.sin(a)*.14,1.455,-11.7+Math.cos(a)*.14,.085,.075,.085,c.white,
            {mode:7,gloss:.05,tag:'早餐'}));}
        grp(hot,A.cyl(px+.34,1.40,-11.98,.29,.045,c.tea,{rz:.42,gloss:.18,tag:'早餐'}));
      } else if(i%3===1){                            // 粥 in a deep tureen, still steaming
        A.cyl(px,1.375,-11.7,.27,.13,c.celadonL,{gloss:.30,tag:'早餐'});
        grp(hot,A.cyl(px,1.435,-11.7,.235,.022,c.silkL,{mode:1,gloss:.34,tag:'早餐'}));
        grp(hot,A.capsule(px+.12,1.50,-11.56,.016,.26,.016,c.bronzeL,{rz:.9,gloss:.66,tag:'早餐'}));
      } else {                                       // cold table: fruit, pastry, pickles
        for(let k=0;k<6;k++)
          grp(hot,A.ball(px-.20+(k%3)*.20,1.375,-11.78+Math.floor(k/3)*.20,.075,.070,.075,
            [c.rose,c.green,c.warm][k%3],{mode:7,gloss:.10,tag:'早餐'}));
      }
      // The cleared counter: upturned plates stacked on the platter, and nothing warm anywhere.
      // Two per platter rather than four — hotel10 is the one floor in the building that does not
      // hold 60 Hz, and a stack that is only ever seen from two metres does not need the other two.
      for(let k=0;k<2;k++)
        grp(cleared,A.cyl(px,1.335+k*.030,-11.7,.19,.026,c.white,{gloss:.30,tag:'早餐'}));
    }
    // One folded service cloth and one card, up only when the counter is closed.
    grp(cleared,box(-1.42,1.32,-12.10,.44,.06,.30,c.towel,{mode:7,gloss:.02,tag:'早餐'}));
    grp(cleared,box(-6.2,1.36,-12.20,.62,.14,.030,c.walnutD,{hard:true,gloss:.34,tag:'早餐'}));
    onTick((t,body,mins)=>{
      const h=hours(mins),on=h>=SERVE0&&h<SERVE1;
      for(const q of hot)q.p.m=on?q.m:hide;
      for(const q of cleared)q.p.m=on?hide:q.m;
      // Colour, not glow. `luminous` registers the bulb on the shell's night curve and
      // js/hotel.js:986 rewrites `glow` only when the curve moves, so a tick that wrote `glow`
      // would win once and then latch at whatever it last wrote. Emissive is colour x glow, so
      // darkening the colour turns the lamp off without touching anything the shell owns — the
      // same trick television() already uses for a screen that is not on.
      for(const p of warmers)p.color=on?c.warm:c.ink;
    });
    // Low warming lamps tie directly into the buffet top instead of floating above the food.
    for(const x of [-8.25,-6.15,-4.05]){
      cyl(x,1.29,-11.28,.09,.045,c.bronzeD,{gloss:.64,tag:'早餐保温灯'});
      A.capsule(x,1.58,-11.28,.025,.58,.025,c.bronze,{gloss:.69,tag:'早餐保温灯'});
      A.capsule(x+.13,1.83,-11.28,.024,.27,.024,c.bronze,
        {rz:Math.PI/2,gloss:.69,tag:'早餐保温灯'});
      // The bulb is on the shared night curve through `luminous`, and gated by the service window
      // on top of it: a warming lamp burning over a cleared counter at midnight is the same
      // mistake as an empty counter at half past eight, seen from the other side.
      warmers.push(luminous(A.ball(x+.27,1.78,-11.28,.095,.075,.095,c.warm,
        {mode:1,tag:'早餐保温灯'}),.035,.24));
    }
    cyl(-1.42,1.18,-11.7,.30,.70,c.bronzeD,{gloss:.62,tag:'咖啡'});
    A.capsule(-1.06,1.18,-11.7,.04,.42,.04,c.bronzeL,{rz:Math.PI/2,tag:'咖啡'});
    steam(A,c,-1.42,1.61,-11.7,4,'咖啡');
    for(const x of [-10.4,-6.5,-2.6]){
      roundTable(A,c,x,-7.75,.68,'早餐');
      chair(A,c,x-.75,-7.1,Math.atan2(.75,-.65),'椅子',c.silkL);
      chair(A,c,x+.75,-7.1,Math.atan2(-.75,-.65),'椅子',c.celadon);
    }
    thing('早餐',-6.2,1.20,-10.8,'行政早餐包括中式点心、粥和现磨咖啡。',
      'Executive breakfast includes dim sum, congee and freshly ground coffee.','早餐 is breakfast.',{tag:'早餐',focus:[-6.2,-9.9],reach:2.2});

    // Central library uses the core's starter tables as a spine and gives them a real room.
    box(-10.2,1.74,5.7,.44,3.35,15.8,c.walnutD,{hard:true,gloss:.30,tag:'图书室'});
    // Books, and enough of them to read as a collection. Each bay used to carry ONE 0.16 m block
    // per 1.45 m of shelf, so 11% of every shelf was occupied and HT10-library showed five bare
    // boards with a coloured chip floating on each. Two contiguous runs per bay fill 88% of the
    // pitch instead, at 0.39 m of shelf per prop rather than 1.45 — the wall reads as books and
    // the whole change is +45 props on the floor, all the same mesh/mode as the ones they join,
    // so they batch into the existing walnut box call and cost no extra draw.
    const shelfPal=[c.lacquer,c.jade,c.silkL,c.bronzeD,c.blue,c.celadon,c.walnutL];
    for(let z=-.2;z<=11.5;z+=1.45){
      box(-9.92,1.58,z,.08,.075,1.12,c.bronze,{hard:true,gloss:.65,tag:'图书室'});
      for(let i=0;i<5;i++){
        const k=i+Math.round(z*2);
        // A run of tall books and a run of shorter ones, butted together. Heights differ by
        // 4 cm so the top line is broken the way a real shelf is, and the pair spans 1.28 of
        // the 1.45 m bay.
        for(const [off,len,dh] of [[-.33,.70,0],[.35,.58,-.042]])
          box(-9.82,.75+i*.39+dh/2,z+off,.32,.27+dh,len,
            shelfPal[(k+(off>0?3:0))%shelfPal.length],{hard:true,tag:'图书室'});
      }
    }
    sign(A,c,-8.8,2.82,10.5,Math.PI/2,'图书室','LIBRARY',2.6,c.bronzeD);
    signPosts(A,c,-8.8,2.82,10.5,Math.PI/2,2.6,'图书室');
    for(const z of [1.1,4.2,7.3,10.4]){
      desk(A,c,-5.7,z,3.7,0,'商务桌');
      chair(A,c,-6.6,z-.65,Math.atan2(.9,.65),'商务椅',c.silk);
      chair(A,c,-4.8,z+.65,Math.atan2(-.9,-.65),'商务椅',c.celadon);
      box(-5.7,1.14,z,1.02,.58,.05,c.ink,{hard:true,gloss:.38,tag:'笔记本电脑'});
      box(-5.7,.85,z,.48,.045,.14,c.bronzeD,{hard:true,tag:'笔记本电脑'});
      // Compact articulated lamp and stationery tray complete each workstation without growing
      // the desk footprint or intruding into either chair approach.
      cyl(-4.35,.90,z-.15,.11,.045,c.bronzeD,{gloss:.65,tag:'商务桌阅读灯'});
      A.capsule(-4.35,1.08,z-.15,.024,.36,.024,c.bronze,{gloss:.69,tag:'商务桌阅读灯'});
      A.capsule(-4.48,1.23,z-.15,.023,.31,.023,c.bronze,
        {rz:-.68,gloss:.69,tag:'商务桌阅读灯'});
      luminous(A.ball(-4.58,1.34,z-.15,.080,.065,.080,c.warm,
        {mode:1,tag:'商务桌阅读灯'}),.030,.21);
      box(-6.93,.88,z+.12,.42,.025,.25,c.limestone,{mode:7,gloss:.18,tag:'商务桌文具'});
      A.capsule(-6.93,.91,z+.12,.016,.26,.016,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'商务桌文具'});
    }
    thing('图书室',-8.9,1.45,5.5,'图书室收藏北京历史、建筑和当代艺术图书。',
      'The library collects books on Beijing history, architecture and contemporary art.','图书室 is a library.',{tag:'图书室',focus:[-8.4,5.5],reach:2.2});
    thing('商务桌',-5.7,1.18,4.2,'商务桌有电源、阅读灯和稳定的网络。',
      'Business tables have power, reading lights and reliable connectivity.','商务 means business.',{tag:'商务桌',focus:[-3.9,4.2],reach:2.2});

    // North-east club lounge stays west of the permanent directory and leaves both lift routes clear.
    flat(3.8,.024,8.6,11.0,10.0,c.carpetL,{mode:7,gloss:.035,tag:'行政酒廊'});
    for(const q of [[1.0,7.4],[5.2,7.4],[1.0,11.0],[5.2,11.0]]){
      lowPlinth(A,c,q[0],q[1],2.24,.82,'行政酒廊');
      box(q[0],.31,q[1],2.34,.18,.82,c.walnutD,{mode:7,gloss:.27,tag:'行政酒廊'});
      for(const s of [-1,1]){
        box(q[0]+s*.57,.49,q[1]-.04,1.05,.25,.94,c.silk,
          {ry:s*.018,mode:7,gloss:.03,tag:'行政酒廊'});
        box(q[0]+s*.57,.86,q[1]+.40,1.03,.55,.22,s<0?c.celadon:c.silkL,
          {ry:-s*.025,mode:7,gloss:.025,tag:'行政酒廊'});
        A.capsule(q[0]+s*1.12,.67,q[1],.12,.72,.12,c.walnutL,
          {rx:Math.PI/2,gloss:.30,tag:'行政酒廊'});
      }
      A.capsule(q[0],.77,q[1]+.49,.030,2.18,.030,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'行政酒廊'});
      A.capsule(q[0],.62,q[1]-.53,.030,2.30,.030,c.silkL,
        {rz:Math.PI/2,gloss:.025,tag:'行政酒廊'});
      A.capsule(q[0]+.84,.84,q[1]+.15,.105,.42,.105,c.bronzeL,
        {rz:Math.PI/2,gloss:.54,tag:'行政酒廊'});
      roundTable(A,c,q[0]+1.65,q[1],.48,'茶台');teaSet(A,c,q[0]+1.65,q[1],'茶台');
    }
    sign(A,c,7.9,2.70,8.0,Math.PI/2,'行政酒廊','EXECUTIVE LOUNGE',3.05,c.bronzeD);
    signPosts(A,c,7.9,2.70,8.0,Math.PI/2,3.05,'行政酒廊');
    roomUse(A,'行政酒廊',4.2,8.9,'行政酒廊提供安静的茶点和城市景观。',
      'The executive lounge offers quiet tea service and skyline views.','酒廊 is a lounge.',[6.4,8.9],2.4);
    thing('茶台',6.85,1.05,7.4,'服务员用盖碗泡茶。','The attendant brews tea in a covered bowl.','盖碗 is a lidded tea bowl.',
      {tag:'茶台',focus:[6.0,6.4],reach:1.8});
    // Discreet service station on the stable x=9 route.
    box(9.0,.55,6.25,1.95,1.10,.72,c.walnut,{gloss:.30,tag:'会员服务'});
    for(let i=0;i<4;i++)cyl(8.45+i*.36,1.15,6.10,.10,.09,c.celadonL,{gloss:.30,tag:'会员服务'});
    steam(A,c,9.0,1.24,6.10,3,'会员服务');
  }

  // -------------------------------------------------------------------------- 11F grand suite
  function fit11(A) {
    const c=palette(A,{carpet:A.C('#594843'),silk:A.C('#a48775'),accent:A.C('#8e443c')});
    const {box,cyl,flat,glyphs,solid,shade,thing,luminous}=A;
    // Arrival vestibule and a deliberate sightline through living room to monumental ink art.
    flat(-1,.022,-3.60,27.5,2.25,c.carpet,{mode:7,gloss:.03,tag:'京华套房'});
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'京华套房','11F  JINGHUA SUITE',2.45,c.lacquer);
    box(6.9,1.55,-1.10,.16,3.10,5.0,c.walnutD,{hard:true,tag:'玄关'});
    // Two faults in one call, both measured rather than guessed. (1) w and h were `.10, 2.2`,
    // a 0.10 m wide by 2.2 m tall painting whose paper is `h-.18` -> negative, so the sheet
    // inverted and the piece read as a bare walnut plank. Every sibling on floors 5/8/10/12 is
    // landscape at w/h = 1.9..2.0, and 2.2 is the only plausible magnitude in the call, so the
    // height is that width at the family's ratio. (2) The screen's west face is x 6.81
    // (js/hotel-f11.js:353) and the frame is half 0.10 m deep, so x 6.76 is a flush west mount —
    // but inkArt layers paper and marks toward +x at yaw +pi/2 (that is why floor 5's 北京印象
    // sits at x -14.00 on W1's EAST face at -14.05). At +pi/2 here the paper landed inside the
    // screen and the frame board hid what was left. -pi/2 mirrors the stack to face the living
    // room, which is the sightline the section comment above is about.
    inkArt(A,c,6.76,2.00,-1.1,2.2,1.10,11,-Math.PI/2,'玄关水墨');
    for(const z of [-2.7,1.0])planter(A,c,7.8,z,.48,false,'玄关');
    // Supports for the core's intentionally retained suite set-piece: upholstered island and
    // console now read as furniture rather than hovering starter blocks.
    lowPlinth(A,c,-5.0,4.5,4.15,1.48,'套房');
    for(const sx of [-1,1])for(const sz of [-1,1])A.capsule(4+sx*1.78,.34,4.5+sz*.66,
      .045,.68,.045,c.bronzeD,{tag:'套房'});

    // Partitions define a real sequence but preserve broad 1.5m doorways.
    // Bath / living split at x=-7.0, bedroom / dining split at x=-3.0, transverse opening at z=1.8.
    box(-7.0,1.58,-8.8,.16,3.16,10.8,c.plaster,{hard:true,tag:wallTag()});solid(-7.08,-6.92,-14.2,-4.0);
    box(-3.0,1.58,8.0,.16,3.16,11.8,c.plaster,{hard:true,tag:wallTag()});solid(-3.08,-2.92,2.2,13.8);
    box(-8.7,1.58,1.8,11.5,3.16,.16,c.plaster,{hard:true,tag:wallTag()});
    solid(-14.4,-10.2,1.72,1.88);solid(-8.7,-3.0,1.72,1.88);
    door(A,c,-9.45,1.80,0,'主卧','主卧');

    // Stone bath at the west-south corner.
    bathroom(A,c,-10.75,-9.20,6.6,9.2,'石材浴室',false);
    // ---- and the part that makes it a SUITE bath rather than the standard-room one (H260).
    // `bathroom()` is shared with the three rooms on floor 5, so the difference is dressing rather
    // than a fourth bath function: a stone step you get into it by, a bath rack across it, the
    // products a bath actually has beside it, and towels within reach. Geometry read off the
    // helper's own arithmetic rather than copied — bx/bz/bw/bd below are exactly what it computes
    // for these arguments (x+w*.22, z-d*.22, w*.42, d*.33), so nothing drifts if the bath moves.
    {
      const bx=-10.75+6.6*.22, bz=-9.20-9.2*.22, bw=6.6*.42, bd=9.2*.33;
      // Stone step across the approach side, and a folded mat on the floor in front of it.
      box(bx,.145,bz+bd*.5+.36,bw*.82,.29,.52,c.limestone,{mode:7,...STONE,tag:'石材浴室'});
      box(bx,.30,bz+bd*.5+.36,bw*.82+.06,.045,.56,c.limestoneL,{hard:true,...STONE,gloss:.20,tag:'石材浴室'});
      A.flat(bx,.026,bz+bd*.5+1.02,1.30,.72,c.towel,{mode:7,gloss:.02,mat:'fabric',matScale:.50,matAmt:.28,tag:'浴垫'});
      // A walnut rack across the tub, with a folded cloth and a celadon bowl on it.
      A.capsule(bx,.735,bz+.62,.030,bw+.14,.030,c.walnut,{rz:Math.PI/2,gloss:.30,tag:'浴缸架'});
      A.capsule(bx,.735,bz+.86,.030,bw+.14,.030,c.walnut,{rz:Math.PI/2,gloss:.30,tag:'浴缸架'});
      for(let i=0;i<7;i++)box(bx-bw*.44+i*bw*.147,.755,bz+.74,.085,.022,.30,c.walnutL,
        {hard:true,mode:7,gloss:.29,tag:'浴缸架'});
      box(bx-.62,.80,bz+.74,.30,.07,.24,c.towel,{mode:7,gloss:.02,tag:'浴缸架'});
      A.cyl(bx+.48,.815,bz+.74,.10,.10,c.celadonL,{gloss:.33,tag:'浴缸架'});
      // Bath products on the west rim: three bottles and a stone dish, all standing on the rail.
      for(let i=0;i<3;i++)
        A.cyl(-10.60,.775+((i%2)?.012:0),bz-.42+i*.34,.042,.15+(i%2)*.04,
          [c.celadon,c.limestoneL,c.jade][i],{gloss:.30,tag:'浴品'});
      A.cyl(-10.60,.725,bz+.42,.13,.05,c.limestoneL,{...STONE,gloss:.22,tag:'浴品'});
      A.ball(-10.60,.775,bz+.42,.075,.055,.075,c.white,{mode:7,gloss:.06,tag:'浴品'});
      // Two rolled towels on the far rim, so the tub is somewhere a person is about to be.
      for(const s of [-1,1])
        A.cyl(bx+s*.42,.775,bz-bd*.47,.075,.44,c.towel,{rz:Math.PI/2,mode:7,gloss:.02,tag:'浴巾'});
    }
    box(-13.2,1.30,-12.5,2.2,2.35,.52,c.walnut,{hard:true,gloss:.30,tag:'衣帽间'});
    A.cyl(-13.2,1.55,-12.75,0.0175,1.75,c.bronzeD,{rz:Math.PI/2,gloss:.62,tag:'衣帽间'});
    for(let i=0;i<4;i++)A.capsule(-13.85+i*.45,1.46,-12.75,.025,.48,.025,c.bronze,
      {rz:Math.PI/2,gloss:.68,tag:'衣帽间'});
    sign(A,c,-10.75,2.82,-4.14,0,'石材浴室','STONE BATH',3.4,c.jade);

    // Living room south-centre: layered seating, lacquer cabinet, TV and curated objects.
    flat(-1.0,.023,-8.40,11.2,10.0,c.carpetL,{mode:7,gloss:.03,tag:'起居室'});
    lowPlinth(A,c,-1.0,-9.75,4.25,.95,'起居室');
    box(-1.0,.31,-9.75,4.36,.18,.86,c.walnutD,{mode:7,gloss:.27,tag:'起居室'});
    for(const [i,x] of [-2.44,-1.0,.44].entries()){
      box(x,.49,-9.70,1.32,.27,1.02,c.silk,
        {ry:(i-1)*.018,mode:7,gloss:.03,tag:'起居室'});
      box(x,.87,-10.13,1.28,.54,.23,i===1?c.celadon:i===2?c.silkL:c.celadonL,
        {ry:(1-i)*.022,mode:7,gloss:.025,tag:'起居室'});
      for(const y of [.79,.93])A.ball(x,y,-10.005,.035,.035,.020,c.bronzeL,
        {mode:1,gloss:.54,tag:'起居室'});
    }
    for(const s of [-1,1])A.capsule(-1.0+s*2.16,.68,-9.75,.13,.80,.13,c.walnutL,
      {rx:Math.PI/2,gloss:.30,tag:'起居室'});
    A.capsule(-1.0,.77,-10.27,.032,4.20,.032,c.bronzeL,
      {rz:Math.PI/2,gloss:.68,tag:'起居室'});
    A.capsule(-1.0,.63,-9.18,.035,4.32,.035,c.bronzeL,
      {rz:Math.PI/2,gloss:.66,tag:'起居室'});
    for(const s of [-1,1])A.capsule(-1.0+s*1.82,.85,-9.63,.13,.75,.13,
      s<0?c.celadonL:c.silkL,{rz:Math.PI/2,gloss:.025,tag:'起居室'});
    // Two supported, overlapping drum tables replace the oversized rectangular slab. Their
    // different diameters and inset materials make an asymmetric composition with a clear edge.
    for(const [tx,r,inset] of [[-1.68,.77,c.limestone],[-.36,.65,c.celadonL]]){
      cyl(tx,.055,-6.45,r*.43,.11,c.bronzeD,{gloss:.58,tag:'茶几'});
      A.capsule(tx,.32,-6.45,.085,.52,.085,c.bronzeD,{gloss:.60,tag:'茶几'});
      cyl(tx,.62,-6.45,r,.08,c.walnut,{gloss:.31,tag:'茶几'});
      cyl(tx,.675,-6.45,r*.84,.025,inset,{gloss:.28,tag:'茶几'});
    }
    teaSet(A,c,-1.0,-6.45,'茶几',.69);
    chair(A,c,-4.6,-7.5,Math.atan2(3.6,1.05),'扶手椅',c.celadon);
    chair(A,c,2.6,-7.5,Math.atan2(-3.6,1.05),'扶手椅',c.silkL);
    television(A,c,4.50,2.05,-8.5,2.10,Math.PI/2,'套房电视');
    // Yaw pi, not 0, and this is the third bug of the same family in this one function. inkArt
    // stacks the paper and every mark at `faceV` = +0.064 when |sin(yaw)| < .5, and `project`
    // turns that into z - 0.064 at yaw 0 — the -z side of the board. The living room is at +z of
    // this wall, so the whole painting was hung facing the south perimeter and HT11-living-room
    // showed a 6.7 x 2.05 m sheet of bare walnut filling the wall behind the sofa: the frame's
    // back. At yaw pi the same arithmetic puts the sheet at z + 0.064, facing the room.
    //
    // Not a general fix, deliberately: the four other yaw-0 calls in this file are on walls whose
    // room lies to the SOUTH (501 and 503 hang on z -5.31 with the bedroom behind at -14.5, and
    // the 走廊挂画 pair at :1114/:1147 already use pi and 0 correspondingly), so they are correct
    // as written. What the signature is missing is a name for which side the room is on; yaw is
    // carrying it, and yaw 0 versus pi is exactly that distinction.
    inkArt(A,c,-1.0,2.15,-13.70,6.7,2.05,21,Math.PI,'京城水墨');
    roomUse(A,'起居室',-1.0,-7.35,'套房的起居室以胡桃木、丝绸和漆色家具布置。',
      'The suite living room is composed in walnut, silk and restrained lacquer.','起居室 is a living room.',[-1.0,-5.6],2.3);

    // Bedroom north-west, wrapped by a low city panorama and silk panels.
    flat(-8.6,.023,8.7,11.2,12.0,c.carpet,{mode:7,gloss:.03,tag:'主卧'});
    skyline(A,c,-8.4,14.72,10.6,2.52,'主卧景观',true,Math.PI);curtains(A,c,-8.4,14.62,9.8,'窗帘');
    bed(A,c,-8.5,9.60,3.15,'主卧大床',c.silk);lamp(A,c,-10.80,9.32);lamp(A,c,-6.18,9.32);
    // Preserve the original 20–74 cm daybed silhouette while exposing its real thin top cushion
    // to the seat resolver; one 54 cm-deep primitive was indistinguishable from a cabinet carcass.
    box(-12.4,.37,12.75,3.20,.34,1.22,c.celadon,{mode:7,gloss:.03,tag:'窗边榻'});
    box(-12.4,.64,12.75,3.20,.20,1.22,c.celadon,{mode:7,gloss:.03,tag:'窗边榻'});
    lowPlinth(A,c,-12.4,12.75,2.80,.92,'窗边榻');
    desk(A,c,-4.4,12.1,2.0,0,'梳妆台');chair(A,c,-4.4,11.35,0,'椅子',c.silkL);
    sleepingFigure(A,c,-8.5,9.60,'睡眠');
    roomUse(A,'主卧',-8.5,8.5,'主卧的丝绸床头墙面对城市景观。',
      'The silk-panelled bedroom faces the city panorama.','主卧 is the principal bedroom.',[-8.5,6.6],2.4);

    // Dining room north-east. Eight useful seats, lazy Susan, sideboard and room-service landing.
    flat(3.5,.023,8.7,11.5,11.8,c.limestoneL,{mode:7,gloss:.16,mat:'tile',matScale:.70,matAmt:.16,tag:'餐厅'});
    A.capsule(3.4,.39,8.55,.12,.70,.12,c.bronzeD,{gloss:.60,tag:'套房餐桌'});
    A.cyl(3.4,.055,8.55,.62,.11,c.bronzeD,{gloss:.58,tag:'套房餐桌'});
    cyl(3.4,.74,8.55,1.75,.16,c.walnut,{gloss:.32,tag:'套房餐桌'});
    cyl(3.4,.85,8.55,.78,.06,c.celadonL,{gloss:.72,tag:'转盘'});
    for(let i=0;i<8;i++){const a=i/8*TAU;chair(A,c,3.4+Math.sin(a)*2.45,8.55+Math.cos(a)*2.45,a+Math.PI,'餐椅',i%2?c.silk:c.celadon);}
    roundSettings(A,c,3.4,8.55,8,1.25,.85,'套房餐具');
    box(7.6,.775,12.0,2.8,1.55,.72,c.walnut,{gloss:.31,tag:'备餐柜'});
    for(let i=0;i<5;i++){
      const px=6.68+i*.46;
      A.capsule(px,.78,11.625,.022,.46,.022,i===2?c.lacquer:c.bronzeL,
        {gloss:.66,tag:'备餐柜'});
      A.ball(px,.78,11.595,.038,.038,.022,c.bronzeL,{mode:1,gloss:.70,tag:'备餐柜'});
    }
    for(let i=0;i<5;i++)cyl(6.8+i*.38,1.61,11.85,.11,.09,c.celadonL,{gloss:.31,tag:'备餐柜'});
    A.taper(6.70,1.72,11.90,.18,.34,.18,c.celadon,{mode:7,gloss:.24,tag:'备餐柜花器'});
    A.capsule(6.70,2.11,11.90,.018,.46,.018,c.bronzeD,
      {rz:-.28,gloss:.58,tag:'备餐柜花器'});
    A.ball(6.58,2.30,11.90,.10,.08,.10,c.rose,{mode:7,gloss:.03,tag:'备餐柜花器'});
    teaSet(A,c,7.5,11.85,'备餐柜',1.55);
    // Against the dining room's east wall, not standing in the middle of it on posts.
    //
    // This was authored when floor 11 was a single open plate, where a freestanding two-sided
    // board on posts is the right way to name a zone that has no walls to hang a sign on. Floor 11
    // has since enclosed the room (x -3.00..10.30, z 2.10..14.60), and the board was left marooned
    // 2.6 m inside it, dominating the background of HT11-private-dining. A room with walls names
    // itself from a wall.
    //
    // x 10.16 puts the 0.11-deep board just clear of the wall's inner face at 10.22. The posts go
    // with it: a wall-mounted board on legs is neither one thing nor the other.
    sign(A,c,10.16,2.65,5.0,Math.PI/2,'套房餐厅','PRIVATE DINING',3.6,c.lacquer);
    roomUse(A,'套房餐桌',3.4,8.55,'圆桌可以进行套房早餐或私家宴请。',
      'The round table supports in-suite breakfast or private dining.','套房餐饮 is in-suite dining.',[3.4,5.7],2.6);
    housekeepingCart(A,c,9.0,5.8,0,'客房服务');
    thing('客房服务',9.0,1.24,5.8,'客房服务车从东侧服务梯进入套房备餐区。',
      'The room-service trolley reaches the suite pantry from the east service lift.',
      '客房服务 means room service.',{tag:'客房服务',focus:[10.2,5.45],reach:2.1});
  }

  // --------------------------------------------------------------- 12F rooftop dining & terrace
  function fit12(A) {
    const c=palette(A,{carpet:A.C('#4c4740'),silk:A.C('#91735c'),accent:A.C('#a46d32')});
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,thing,luminous,onTick}=A;
    flat(-1,.022,-3.65,27.5,2.30,c.carpet,{mode:7,gloss:.03,tag:'云端餐厅'});
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'云端餐厅','12F  SKY DINING',2.45,c.lacquer);
    inkArt(A,c,-14.0,2.06,-3.65,3.2,1.62,12,Math.PI/2,'云山水墨');
    // The ceiling is visually opened into a bronze pavilion and dark-sky coffers. It remains a
    // weather-safe occupied roof, while the north and west terraces are genuinely walkable.
    flat(-1,4.205,3.0,33.0,22.0,c.night,{mode:1,glow:.018,tag:'天际'});
    for(const z of [-10,-3,4,11])for(const x of [-13,-7,-1,5,11]){
      capsule(x,4.17,z,.012,.12,.012,c.bronzeD,{tag:'天际'});
      luminous(ball(x,4.10,z,.045,.045,.045,c.warm,{mode:1,tag:'天际'}),.10,.36);
    }
    // Skyline panorama around the terrace edge.
    skyline(A,c,-1.0,14.73,26.0,2.70,'京城夜景',true,Math.PI);
    skyline(A,c,-21.72,7.0,13.0,2.70,'京城夜景',true,Math.PI/2);
    // West/north terrace deck, glass rail, wind-aware planting and a clear 1.7m circulation band.
    flat(-7.0,.026,8.2,20.8,12.5,c.limestone,{mode:7,gloss:.20,mat:'tile',matScale:.72,matAmt:.20,tag:'观景露台'});
    for(const x of [-15,-10,-5,0]){
      box(x,1.05,13.78,4.2,1.95,.045,c.glass,{hard:true,mode:1,alpha:.25,gloss:.78,tag:'观景露台'});
      box(x,.045,13.78,4.22,.09,.12,c.bronzeD,{hard:true,gloss:.62,tag:'观景露台'});
      A.cyl(x,2.03,13.72,0.0225,4.2,c.bronze,{rz:Math.PI/2,gloss:.70,tag:'观景露台'});
    }
    // Low shielded lanterns stay behind the drink ledge and light the rail without cluttering the
    // terrace's clear standing band.
    for(const x of [-13,-9,-5,-1]){
      cyl(x,.08,13.18,.13,.10,c.bronzeD,{gloss:.62,tag:'露台地灯'});
      capsule(x,.34,13.18,.025,.44,.025,c.bronze,{gloss:.68,tag:'露台地灯'});
      taper(x,.62,13.18,.16,.22,.16,c.silkL,{mode:7,alpha:.84,gloss:.05,tag:'露台地灯'});
      luminous(ball(x,.61,13.18,.075,.09,.075,c.warm,{mode:1,tag:'露台地灯'}),.05,.28);
    }
    // A small grounded conversation vignette occupies the quiet west corner, well away from the
    // main terrace standing route and the late-evening skyline guest.
    chair(A,c,-16.0,7.15,Math.atan2(1.1,1.1),'露台座椅',c.celadonL);
    chair(A,c,-13.8,7.15,Math.atan2(-1.1,1.1),'露台座椅',c.silkL);
    roundTable(A,c,-14.9,8.25,.52,'露台茶几');teaSet(A,c,-14.9,8.25,'露台茶几');
    planter(A,c,-16.45,8.85,.44,true,'露台绿植');
    for(const q of [[-15,10.8],[-10.5,12.1],[-6.0,10.9],[-1.5,12.0],[3.0,10.7]])planter(A,c,q[0],q[1],.52,true,'风雨花园');
    // Bronze viewing rail and standing drink ledge.
    A.cyl(-6.0,1.12,12.95,0.0275,14.8,c.bronze,{rz:Math.PI/2,gloss:.70,tag:'观景台'});
    box(-6.0,1.02,12.50,13.8,.10,.48,c.walnut,{gloss:.32,tag:'观景台'});
    for(const x of [-12,-8,-4,0])capsule(x,.55,12.78,.045,1.10,.045,c.bronzeD,
      {gloss:.62,tag:'观景台'});
    thing('观景露台',-6.0,1.30,11.8,'露台上可以看到京城的天际线和夜色。',
      'The terrace overlooks the Beijing skyline and night lights.','露台 is a terrace.',{tag:'观景露台',focus:[-6.0,9.9],reach:2.4});

    // South Chinese dining room: screen wall, show sideboard and round banquet tables.
    flat(-6.0,.023,-9.5,15.0,8.5,c.limestoneL,{mode:7,gloss:.17,mat:'tile',matScale:.62,matAmt:.17,tag:'云端中餐厅'});
    box(-6.0,1.58,-5.12,15.0,3.16,.16,c.walnutD,{hard:true,tag:wallTag()});
    solid(-13.5,-7.1,-5.22,-5.05);solid(-5.6,1.5,-5.22,-5.05);
    door(A,c,-6.35,-5.12,0,'云端中餐厅','中餐厅');
    sign(A,c,-6.0,2.74,-5.02,0,'云端中餐厅','YUNDUAN CHINESE DINING',5.2,c.lacquer);
    for(const x of [-10.4,-5.7,-1.0]){
      capsule(x,.39,-9.55,.11,.70,.11,c.bronzeD,{gloss:.60,tag:'中餐桌'});
      cyl(x,.055,-9.55,.56,.11,c.bronzeD,{gloss:.58,tag:'中餐桌'});
      cyl(x,.74,-9.55,1.38,.16,c.walnut,{gloss:.32,tag:'中餐桌'});
      const turn=cyl(x,.85,-9.55,.64,.055,c.celadonL,{gloss:.76,tag:'转盘'});fixed(turn,2.2);
      turn._m0=turn.m;turn._out=new Float32Array(turn.m);
      onTick((t)=>{M.rotY(t*.06,MS);turn.m=M.mul(MS,turn._m0,turn._out);});
      for(let i=0;i<6;i++){const a=i/6*TAU;chair(A,c,x+Math.sin(a)*2.0,-9.55+Math.cos(a)*2.0,a+Math.PI,'餐椅',i%2?c.silk:c.celadon);}
      roundSettings(A,c,x,-9.55,6,.94,.85,'中餐具');
      teaSet(A,c,x,-9.55,'中餐桌');
    }
    // A refined zero-waste service sideboard rather than a full show kitchen on the roof.
    box(-6.0,.76,-13.45,11.4,1.52,.70,c.walnut,{gloss:.31,tag:'零点餐台'});
    for(let i=0;i<7;i++){
      cyl(-9.9+i*1.30,1.59,-13.35,.18,.12,i%2?c.celadonL:c.bronzeL,{gloss:.30,tag:'零点餐台'});
      steam(A,c,-9.9+i*1.30,1.75,-13.35,2,'零点餐台');
    }
    roomUse(A,'云端中餐厅',-6.0,-8.2,'云端中餐厅以现代方式表达京城宴饮礼仪。',
      'Yunduan dining presents Beijing banquet hospitality in a contemporary way.','宴饮 means formal dining.',[-6.0,-6.2],2.5);

    // Sky lounge under a second, lighter pavilion rhythm.
    flat(5.5,.023,5.0,10.0,11.0,c.carpet,{mode:7,gloss:.03,tag:'天际酒廊'});
    for(const x of [1.2,5.2,9.2]){
      for(const z of [1.6,7.2])A.cyl(x,2.10,z,0.045,4.15,c.bronze,{gloss:.68,tag:'青铜亭'});
      A.cyl(x,4.02,4.4,0.045,10.5,c.bronze,{rx:Math.PI/2,gloss:.68,tag:'青铜亭'});
    }
    const lanterns=[];
    for(let i=0;i<9;i++){
      const x=1.3+(i%3)*3.8,z=1.6+Math.floor(i/3)*2.7;
      capsule(x,3.75,z,.025,.50,.025,c.bronzeD,{tag:'灯笼'});
      const p=fixed(ball(x,3.34,z,.18,.27,.18,i%4===0?c.lacquer:c.warm,{mode:1,glow:.20,tag:'灯笼'}),3);
      lanterns.push({...moving(p),i});
    }
    onTick((t,body,mins)=>{
      const wind=typeof Weather!=='undefined'&&Weather.now?Weather.now.wind:.25;
      for(const q of lanterns){
        M.rotZ(Math.sin(t*.65+q.i*.8)*.055*(.45+wind),MS);
        q.p.m=M.mul(MS,q.m,q.out);
      }
    });
    for(const q of [[2.1,3.1],[7.5,3.1],[2.1,8.2],[7.5,8.2]]){
      lowPlinth(A,c,q[0],q[1],2.16,.84,'天际酒廊');
      box(q[0],.31,q[1],2.28,.18,.84,c.walnutD,{mode:7,gloss:.27,tag:'天际酒廊'});
      for(const s of [-1,1]){
        box(q[0]+s*.55,.49,q[1]-.04,1.01,.25,.96,c.silk,
          {ry:s*.018,mode:7,gloss:.03,tag:'天际酒廊'});
        box(q[0]+s*.55,.86,q[1]+.42,.99,.54,.22,s<0?c.celadon:c.silkL,
          {ry:-s*.025,mode:7,gloss:.025,tag:'天际酒廊'});
        capsule(q[0]+s*1.08,.67,q[1],.12,.74,.12,c.walnutL,
          {rx:Math.PI/2,gloss:.30,tag:'天际酒廊'});
      }
      capsule(q[0],.77,q[1]+.51,.030,2.10,.030,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'天际酒廊'});
      capsule(q[0],.62,q[1]-.55,.030,2.16,.030,c.silkL,
        {rz:Math.PI/2,gloss:.025,tag:'天际酒廊'});
      capsule(q[0]+.81,.84,q[1]+.16,.10,.40,.10,c.bronzeL,
        {rz:Math.PI/2,gloss:.54,tag:'天际酒廊'});
      roundTable(A,c,q[0]+1.52,q[1],.46,'酒廊茶几');teaSet(A,c,q[0]+1.52,q[1],'酒廊茶几');
    }
    sign(A,c,9.5,2.62,8.0,Math.PI/2,'天际酒廊','SKY LOUNGE',3.5,c.bronzeD);
    signPosts(A,c,9.5,2.62,8.0,Math.PI/2,3.5,'天际酒廊');
    roomUse(A,'天际酒廊',5.0,5.0,'天际酒廊在青铜亭架下提供茶、酒和晚点。',
      'The sky lounge serves tea, drinks and late snacks beneath the bronze pavilion.','天际 means skyline.',[6.8,5.0],2.3);

    // Distant traffic ribbons: tiny moving lights, conservatively bounded and local to this floor.
    box(-1.0,.61,14.34,25.5,.10,.10,c.night,{hard:true,tag:'远处车流'});
    const traffic=[];
    for(let i=0;i<14;i++){
      const p=fixed(box(-12+i*1.65,.68,14.35,.16,.045,.035,i%3?c.warm:c.rose,{hard:true,mode:1,glow:.24,tag:'远处车流'}),30);
      traffic.push({...moving(p),i});
    }
    onTick((t)=>{for(const q of traffic){const dx=((t*.34+q.i*1.65)%23)-q.i*1.65;
      M.trans(dx,0,0,MS);q.p.m=M.mul(MS,q.m,q.out);}});
  }

  HotelFit.register('hotel5',fit5);
  HotelFit.register('hotel8',fit8);
  HotelFit.register('hotel10',fit10);
  HotelFit.register('hotel11',fit11);
  HotelFit.register('hotel12',fit12);

  // ---------------------------------------------------------------- interactions / workplace seams
  Object.assign(HotelUse.hotel5,{
    '床':{zh:'在客房休息',py:'zài kèfáng xiūxi',en:'rest in the guestroom',secs:4.2,mins:90,gain:{rest:34,mood:6},pose:{type:'lie',seatY:.58}},
    '椅子':{zh:'在书桌前坐下',py:'zài shūzhuō qián zuòxià',en:'sit at the writing desk',secs:3.0,mins:18,gain:{rest:8,mood:3},pose:{type:'sit',seatY:.49}},
    '阅读椅':{zh:'坐下阅读',py:'zuòxià yuèdú',en:'sit and read',secs:3.4,mins:25,gain:{rest:10,mood:5},pose:{type:'sit',seatY:.49}},
    '欢迎茶':{zh:'喝欢迎茶',py:'hē huānyíng chá',en:'drink the welcome tea',secs:3.0,mins:15,gain:{rest:7,mood:5},pose:{type:'drink',seatY:.49}},
    '浴室':{zh:'洗澡',py:'xǐzǎo',en:'take a bath',secs:3.5,mins:30,gain:{clean:35,rest:8},pose:{type:'scrub'}},
    '无障碍浴室':{zh:'检查无障碍设施',py:'jiǎnchá wúzhàngài shèshī',en:'inspect the accessible bathroom',secs:1.8,mins:3,gain:{},pose:{type:'check'}},
    '无障碍客房':{zh:'参观无障碍客房',py:'cānguān wúzhàngài kèfáng',en:'inspect the accessible room',secs:1.8,mins:3,gain:{mood:2},pose:{type:'walk'}},
    '布草间':{zh:'整理布草',py:'zhěnglǐ bùcǎo',en:'organise hotel linen',secs:3.0,mins:12,gain:{rest:-3,clean:5},pose:{type:'work'}},
    '客房服务':{zh:'叫客房服务',py:'jiào kèfáng fúwù',en:'order room service to the room',secs:2.0,mins:4,gain:{},pose:{type:'phone'},stayService:true},
  });
  Object.assign(HotelUse.hotel8,{
    '转角景观房':{zh:'参观景观房',py:'cānguān jǐngguāng fáng',en:'tour the corner-view room',secs:2.0,mins:5,gain:{mood:5},pose:{type:'walk'}},
    '窗边榻':{zh:'坐在窗边',py:'zuò zài chuāngbiān',en:'sit by the window',secs:3.5,mins:25,gain:{rest:12,mood:9},pose:{type:'sit',seatY:.49}},
    '景观浴缸':{zh:'泡澡',py:'pào zǎo',en:'take a view bath',secs:3.8,mins:35,gain:{clean:34,rest:12,mood:8},pose:{type:'scrub'}},
    '客房服务':{zh:'预订客房服务',py:'yùdìng kèfáng fúwù',en:'request room service',secs:2.0,mins:6,gain:{mood:4},pose:{type:'phone'},stayService:true},
  });
  Object.assign(HotelUse.hotel10,{
    '行政酒廊':{zh:'在酒廊休息',py:'zài jiǔláng xiūxi',en:'relax in the executive lounge',secs:3.2,mins:25,gain:{rest:12,mood:7},pose:{type:'sit',seatY:.48}},
    '早餐':{zh:'吃行政早餐',py:'chī xíngzhèng zǎocān',en:'eat executive breakfast',secs:4.0,mins:35,gain:{food:35,mood:7},pose:{type:'eat',seatY:.49}},
    '图书室':{zh:'看书',py:'kàn shū',en:'read in the library',secs:3.6,mins:30,gain:{mood:8,rest:5},pose:{type:'stand'}},
    '商务桌':{zh:'处理工作',py:'chǔlǐ gōngzuò',en:'work at a business table',secs:4.0,mins:45,gain:{rest:-9,mood:2},pose:{type:'type',seatY:.48}},
    '茶台':{zh:'喝茶',py:'hē chá',en:'drink tea',secs:3.0,mins:20,gain:{rest:10,mood:6},pose:{type:'drink',seatY:.48}},
  });
  Object.assign(HotelUse.hotel11,{
    '起居室':{zh:'在套房休息',py:'zài tàofáng xiūxi',en:'relax in the suite living room',secs:3.5,mins:30,gain:{rest:16,mood:9},pose:{type:'sit',seatY:.48}},
    '主卧':{zh:'在主卧休息',py:'zài zhǔwò xiūxi',en:'rest in the principal bedroom',secs:4.2,mins:120,gain:{rest:42,mood:8},pose:{type:'lie',seatY:.60}},
    '石材浴室':{zh:'泡浴',py:'pàoyù',en:'take a stone bath',secs:4.0,mins:40,gain:{clean:38,rest:14},pose:{type:'scrub'}},
    '套房餐桌':{zh:'用套房餐',py:'yòng tàofáng cān',en:'eat in the suite',secs:4.0,mins:45,gain:{food:35,mood:9},pose:{type:'eat',seatY:.49}},
    '客房服务':{zh:'叫套房送餐',py:'jiào tàofáng sòngcān',en:'order in-suite dining',secs:2.4,mins:5,gain:{},pose:{type:'phone'},stayService:true},
  });
  Object.assign(HotelUse.hotel12,{
    '云端中餐厅':{zh:'吃中餐',py:'chī zhōngcān',en:'dine at Yunduan',secs:4.2,mins:50,gain:{food:38,mood:10},pose:{type:'eat',seatY:.49}},
    '观景露台':{zh:'看京城夜景',py:'kàn Jīngchéng yèjǐng',en:'view the Beijing skyline',secs:3.0,mins:15,gain:{mood:12,rest:4},pose:{type:'stand'}},
    '天际酒廊':{zh:'在天际酒廊喝茶',py:'zài tiānjì jiǔláng hē chá',en:'take tea in the sky lounge',secs:3.4,mins:25,gain:{rest:10,mood:10},pose:{type:'drink',seatY:.48}},
  });

  // --------------------------------------------------------------------------- lived-in floors
  const staffLook=(seed,accent='#6d5041')=>({skin:'#d7a57f',hair:'#29231f',hairStyle:seed%2?'bun':'short',
    top:'#efe9dd',pants:'#34383e',shoe:'#27292c',jacket:accent,scarf:'#9b7442',uniform:'staff',tall:.97+(seed%3)*.025,wide:.94,faceSeed:seed});
  const guestLook=(seed,top,style='short')=>({skin:['#d7a37d','#c7916b','#e0af87'][seed%3],hair:['#2b2420','#3a302a','#211c19'][seed%3],
    hairStyle:style,top,pants:'#3b444f',shoe:'#e8e0d3',collar:seed%2?'shirt':'crew',tall:.94+(seed%5)*.025,wide:.90+(seed%4)*.04,faceSeed:seed});

  // ---------------------------------------------------------------- H209. Being remembered.
  //
  // js/game.js:13005 picks a line with `n.lines[n.met % n.lines.length]`, so what a person says
  // FIRST is `lines[0]`. That is the whole seam: `memory()` returns the same lines in a different
  // ORDER, warm ones first once the desk has a reason to know you.
  //
  // Rotating rather than substituting is deliberate, and it is about the voice bake, not about
  // style. `.dumplines.js` enumerates `n.lines` out of the live page, so a getter that returned a
  // *shorter* array to a stranger would hand the baker a roster missing every warm line, and those
  // clips would never be rendered — the silent half of the `hz|name|text` clip key. Both branches
  // return every line this person has, so the dump is complete whatever Story happens to hold when
  // it runs.
  //
  // Two reasons to be remembered, and either will do. `Story.knows` is ordinary affinity —
  // conversations of theirs you have actually followed — and `Story.reception().stays` is the
  // folio: you have stayed here before. Both are pure reads. Everything is wrapped because the
  // floor modules are built by harnesses that have no js/story.js at all.
  const memory=(who,base,warm)=>{
    let known=0;
    try{
      if(typeof Story!=='undefined'){
        if(Story.knows) known=Story.knows({name:who})|0;
        if(!known&&Story.reception) known=(Story.reception().stays|0)>0?1:0;
      }
    }catch(_){}
    return known>0?[...warm,...base]:[...base,...warm];
  };

  const guestFloorCast=[
    // H190. She used to stand in the linen pantry for four hours, at the service lift for seven and
    // in the corridor for five, which is a floor with a housekeeper on it and no housekeeping
    // happening. Her day is now the round itself, west to east, and the three middle windows are
    // the SAME [h0,h1] pairs the room doors and the corridor trolley read (fit5, `rooms[].service`
    // above): at ten she is at 501's open door with the trolley beside her, at twelve at 502's, at
    // two at 503's. Standing 0.57 m north of the room fronts, clear of the 0.30 m body radius
    // against the front-wall solids at z -5.07 and 0.35 m clear of the trolley's west edge.
    {hotelGuestId:'hotel5-attendant-luo',hz:'客房服务员',name:'罗小燕',py:'Luó Xiǎoyàn',place:'hotel5',dept:'housekeeping',rig:'hotel5-room-attendant-luo-xiaoyan',temper:'busy',look:staffLook(5501,'#52685b'),
      spots:[{h0:7,h1:9,at:[-4.55,12.95],face:0,act:'work',held:null},
             {h0:9,h1:11,at:[-10.20,-4.45],face:Math.PI,act:'carry',held:'linen'},
             {h0:11,h1:13,at:[-2.60,-4.45],face:Math.PI,act:'carry',held:'linen'},
             {h0:13,h1:15,at:[5.10,-4.45],face:Math.PI,act:'carry',held:'linen'},
             {h0:15,h1:18,at:[13.65,6.80],face:-Math.PI/2,act:'check'},
             {h0:18,h1:23,at:[-1.0,-3.3],face:-Math.PI/2,act:'work',held:null}],
      get lines(){ return memory('罗小燕',
        [['您好，请问房间需要打扫吗？','Hello. Would you like the room serviced?'],
         ['无障碍客房在五零三。','The accessible room is 503.'],
         ['布草会从服务梯送上来。','Linen comes up in the service lift.'],
         ['我从五零一开始做，一间一间来。','I start at 501 and work along the corridor room by room.']],
        [['您又来住了，我先把您那间做出来。','You are staying with us again — I will do your room first.']]); }},
    // H194 — the corridor is not just doors. Somebody stands at the lift landing waiting for a car
    // in the morning and again after work, at [14.40, -2.35] facing the bank: outside the lift
    // footprint (x 17.70..18.81) and off the landing barrier the shell animates.
    {hotelGuestId:'hotel5-guest-waiting',hz:'客人',place:'hotel5',temper:'patient',look:guestLook(5513,'#6d7f8c','short'),
      spots:[{h0:7.5,h1:9.5,at:[14.40,-2.35],face:Math.PI/2,act:'wait'},
             {h0:17,h1:19,at:[14.40,-2.35],face:Math.PI/2,act:'phoneStand'}]},
    // H200 — the five verbs HOTEL.md:79-80 asks for by name, on the floor that has the furniture
    // for them. 501 wakes on the edge of the bed, reads at the writing desk, and watches the
    // television in the evening; 503 reads, takes tea and eats a room-service dinner at its desk.
    // Sleeping is the bed itself: `sleepingFigure` at (-10.65,-10.55) is up 22:42-06:48 and this
    // guest's day starts after it ends, so the room is never occupied twice.
    //
    // seatY is per-spot on purpose. The mattress top is 0.74 (bed(): the .28-tall cushion centred
    // at .60), which is outside resolveNPCSeat's default .28-.64 window, and only an authored
    // height reaches it — the chairs stay at .50. The bed spot sits at z -9.75, on the mattress
    // clear of the duvet, which ends at -9.94.
    {hotelGuestId:'hotel5-guest-501',hz:'客人',place:'hotel5',temper:'patient',seatY:.50,look:guestLook(5511,'#718999','bob'),
      spots:[{h0:6.9,h1:7.6,at:[-10.65,-9.75],face:Math.atan2(-2.97,1.75),act:'sit',seatY:.74},
             {h0:7.6,h1:14,at:[-8.25,-6.05],face:Math.PI,act:'read'},
             {h0:14,h1:18,at:[-8.25,-6.05],face:Math.PI,act:'phone'},
             // 电视 is on 18:00-24:00 (television() above), so this is a guest watching it and
             // not a guest sitting in the dark facing a dead screen.
             {h0:18,h1:22.5,at:[-10.65,-9.75],face:Math.atan2(-2.97,1.75),act:'sit',seatY:.74}]},
    {hotelGuestId:'hotel5-guest-503',hz:'客人',place:'hotel5',temper:'steady',seatY:.50,look:guestLook(5512,'#b06d55','short'),
      spots:[{h0:7,h1:11,at:[8.30,-6.05],face:Math.PI,act:'read'},
             {h0:11,h1:19,at:[8.30,-6.05],face:Math.PI,act:'drink'},
             {h0:19,h1:22,at:[8.30,-6.05],face:Math.PI,act:'eat'}]},

    {hotelGuestId:'hotel8-butler-xu',hz:'楼层管家',name:'许管家',py:'Xǔ guǎnjiā',place:'hotel8',dept:'housekeeping',rig:'hotel8-butler-xu',temper:'poised',look:staffLook(5801,'#64493f'),
      spots:[{h0:7,h1:23,at:[9.2,6.4],face:-Math.PI/2,act:'hands'}],
      get lines(){ return memory('许管家',
        [['八楼的转角房有两个方向的景观。','The eighth-floor corner room has views in two directions.'],
         ['晚安茶会在睡前送到。','Evening tea is delivered before bedtime.']],
        [['许久不见，还是要转角那间吗？','It has been a while — the corner room again?']]); }},
    {hotelGuestId:'hotel8-guest-801',hz:'客人',place:'hotel8',temper:'patient',seatY:.49,look:guestLook(5811,'#596f7d','short'),
      spots:[{h0:7,h1:12,at:[5.25,-13.30],face:0,act:'read'},{h0:12,h1:23,at:[2.25,-8.35],face:Math.atan2(.80,-.70),act:'drink'}]},
    {hotelGuestId:'hotel8-guest-808',hz:'客人',place:'hotel8',temper:'genial',seatY:.49,look:guestLook(5812,'#9a6d58','bun'),
      spots:[{h0:8,h1:23,at:[-11.3,11.65],face:-Math.PI/2,act:'read'}]},

    // hotel10 is the one floor in the building that does not hold 60 Hz (p95 16.3-20.5 ms against
    // a 16.7 budget), so NOBODY is added to it here. 林宁's day is rearranged instead: she is on
    // the servery through the whole service window the buffet is now dressed for, clears it at
    // 10:30, and takes the tea station after. Same head count, and the two moments the floor's
    // cameras look at are the two she is somewhere that makes sense.
    {hotelGuestId:'hotel10-server-lin',hz:'酒廊服务员',name:'林宁',py:'Lín Níng',place:'hotel10',dept:'food-beverage',rig:'hotel10-lounge-server-lin-ning',temper:'poised',look:staffLook(51001,'#594235'),
      spots:[{h0:6.5,h1:10.5,at:[-1.4,-11.0],face:Math.PI,act:'work',held:null},
             {h0:10.5,h1:11.2,at:[-4.05,-10.75],face:Math.PI,act:'carry',held:'tray'},
             {h0:11.2,h1:23,at:[8.8,5.28],face:0,act:'vend'}],
      get lines(){ return memory('林宁',
        [['早上好，早餐到十一点。','Good morning. Breakfast is served until eleven.'],
         ['图书室的商务桌可以预订。','The library business tables can be reserved.'],
         ['我来给您泡茶。','Let me prepare tea for you.'],
         ['十点半收台，之后只有茶和咖啡。','The counter is cleared at half past ten; after that it is tea and coffee only.']],
        [['您常住的客人，我记得您的茶。','You stay with us often — I remember how you take your tea.']]); }},
    {hotelGuestId:'hotel10-guest-business',hz:'客人',place:'hotel10',temper:'focused',seatY:.48,look:guestLook(51011,'#566a73','short'),
      spots:[{h0:7,h1:10.8,at:[-11.15,-7.10],face:Math.atan2(.75,-.65),act:'eat'},{h0:10.8,h1:23,at:[-6.60,3.55],face:Math.atan2(.90,.65),act:'desk'}]},
    // She sat at (1.00, 7.40), which is the sofa's own centreline — and the lounge sofas are built
    // as a PAIR of cushions at q +- 0.57, each 1.05 wide, so the centreline is the 4.5 cm gap
    // between them. resolveNPCSeat matched the west cushion only on its 8 cm edge tolerance and
    // HT10-executive-lounge showed her wedged into the arm. (1.57, 7.36) is the east cushion's
    // actual centre. Same person, same seat count, no new figure on this floor.
    {hotelGuestId:'hotel10-guest-lounge',hz:'客人',place:'hotel10',temper:'patient',seatY:.48,look:guestLook(51012,'#a36a55','bob'),
      spots:[{h0:7,h1:23,at:[1.57,7.36],face:Math.PI,act:'read'}]},

    // H262's open half — the butler lane's MOTION. She stood at one point in the foyer for sixteen
    // hours. Her day is now the lane itself: the 备餐间 pantry counter in the morning (east of the
    // solid at x 10.40..10.94, facing it), the dining room's 备餐柜 with a tray at lunch, the
    // arrival foyer through the afternoon, and the living-room tea table in the evening. A spot
    // change makes her WALK — js/game.js:5251 moves a body toward `npcTarget` whenever it is more
    // than the arrival radius away — so the lane is travelled rather than asserted.
    {hotelGuestId:'hotel11-butler-han',hz:'套房管家',name:'韩丽娜',py:'Hán Lìnà',place:'hotel11',dept:'housekeeping',rig:'hotel11-suite-butler-han-lina',temper:'poised',look:staffLook(51101,'#633d3a'),
      spots:[{h0:7,h1:11,at:[11.50,3.55],face:-Math.PI/2,act:'work',held:null},
             {h0:11,h1:14,at:[7.60,11.20],face:0,act:'carry',held:'tray'},
             {h0:14,h1:18,at:[7.35,5.35],face:-Math.PI/2,act:'hands'},
             {h0:18,h1:23,at:[1.10,-6.00],face:Math.atan2(-2.1,-.45),act:'carry',held:'tray'}],
      get lines(){ return memory('韩丽娜',
        [['京华套房包括起居室、餐厅、主卧和石材浴室。','The Jinghua Suite includes living, dining, bedroom and stone bathroom.'],
         ['需要我安排套房餐吗？','Shall I arrange in-suite dining?'],
         ['托盘从备餐间过来，走服务梯那条线。','The tray comes from the pantry, along the service-lift line.']],
        [['欢迎回来，茶还是照旧？','Welcome back — tea as usual?']]); }},
    {hotelGuestId:'hotel11-guest-suite',hz:'客人',place:'hotel11',temper:'patient',seatY:.49,look:guestLook(51111,'#7d695b','short'),
      // …and at seven the suite's own television goes on (18:00-24:00), so the evening ends on the
      // middle sofa cushion at (0.44, -9.70) — a real 1.32 x 1.02 seat whose top is 0.625, inside
      // resolveNPCSeat's default window — turned to face the screen at (4.50, -8.50).
      spots:[{h0:6.7,h1:9,at:[-12.4,12.75],face:0,act:'sit',seatY:.74},
             {h0:9,h1:17,at:[-4.4,11.35],face:0,act:'read'},
             {h0:17,h1:19,at:[-4.6,-7.5],face:Math.atan2(3.6,1.05),act:'drink'},
             {h0:19,h1:23,at:[.44,-9.70],face:Math.atan2(4.06,1.20),act:'sit'}]},
    {hotelGuestId:'hotel11-guest-dining',hz:'客人',place:'hotel11',temper:'genial',seatY:.49,look:guestLook(51112,'#9e6250','bun'),
      spots:[{h0:7,h1:23,at:[3.4,6.1],face:0,act:'eat'}]},

    {hotelGuestId:'hotel12-server-gao',hz:'云端服务员',name:'高舒',py:'Gāo Shū',place:'hotel12',rig:'hotel12-sky-server-gao-shu',temper:'poised',look:staffLook(51201,'#6a3d35'),
      spots:[{h0:11,h1:24,at:[7.0,5.0],face:-Math.PI/2,act:'vend'}],
      get lines(){ return memory('高舒',
        [['欢迎来到云端餐厅。','Welcome to Yunduan Dining.'],
         ['露台风大，请小心。','It is windy on the terrace, so please take care.'],
         ['夜里可以看到京城的灯光。','At night you can see Beijing lights across the city.']],
        [['又见到您了，还是靠窗那桌吗？','Good to see you again — the window table as before?']]); }},
    {hotelGuestId:'hotel12-guest-dining-west',hz:'客人',place:'hotel12',temper:'genial',seatY:.49,look:guestLook(51211,'#4f6675','short'),
      spots:[{h0:11,h1:17,at:[-10.4,-7.55],face:Math.PI,act:'eat'},{h0:17,h1:24,at:[2.1,3.1],face:Math.PI,act:'drink'}]},
    {hotelGuestId:'hotel12-guest-dining-centre',hz:'客人',place:'hotel12',temper:'patient',seatY:.49,look:guestLook(51212,'#a16655','bob'),
      spots:[{h0:11,h1:18,at:[-5.7,-7.55],face:Math.PI,act:'eat'},{h0:18,h1:24,at:[-6.0,11.7],face:Math.PI,act:'wait'}]}
  ];
  // The loader normally evaluates each module once, but development reloads and recovery from a
  // partially loaded page can evaluate a fit-out again. Stable local IDs make this roster
  // genuinely exact-once without conflating the deliberately repeated generic label 客人.
  for(const n of guestFloorCast)
    if(!HotelCast.some(q=>q.hotelGuestId===n.hotelGuestId)) HotelCast.push(n);
})();
