// 京华大酒店 · service operations and wellness floors
//
// This module owns B1 and 4F only.  HotelCore supplies the measured shell, passenger/service
// lift bank, fire stair, directory and stable route metadata; these fit-outs turn those seams
// into two complete, distinct workplaces without changing the vertical-circulation contract.

const HotelServiceFit = (() => {
  const FLOORS=Object.freeze(['hotelB1','hotel4']);
  const TAU=Math.PI*2;

  try {
    Glyphs.need(
      '地下一层后勤服务员工入口刷卡进入装卸区收货台洗衣房水洗烘干熨烫折叠传送带布草间客房部工作间' +
      '员工更衣室淋浴员工食堂今日热菜工程部锅炉水泵配电保安部监控中心消防服务通道服务梯保持畅通' +
      '四楼康体水疗水疗接待理疗室芳香护理更衣室储物柜泳池深水浅水救生员毛巾站请小心地滑' +
      '健身房有氧力量自由重量放松茶廊静心庭营业时间水温空气质量楼层索引毛巾回收接待更衣健身' +
      '收货员何磊更衣室服务员方宁' +
      // A module declares every glyph it draws. These six are drawn by this file and were declared
      // by nobody: 值班 on the staff-entrance board (L317), 状态 on the engineering status wall
      // (L618) and 男/女 on the two changing-room portals (L1040). They rendered only because some
      // unrelated module happened to have registered them for its own reasons, so an edit anywhere
      // else in the codebase could blank three of the signs on these floors without touching it.
      '今日值班工程状态男更衣女更衣' +
      'BASEMENTOPERATIONSSTAFFENTRANCELOADINGLAUNDRYLINENHOUSEKEEPINGENGINEERINGSECURITYCANTEEN' +
      'SERVICEROUTELEVELSPAWELLNESSRECEPTIONTREATMENTCHANGINGPOOLFITNESSRELAXATIONWOMENMEN'
    );
  } catch (_) {}

  const keep=(p,x,y,z,r=2)=>{
    p.ob=null;p.fixed=true;p.cx=x;p.cy=y;p.cz=z;p.r=r;return p;
  };

  // The tower material kit, added 2026-08-08 (H271-H279). Numerically identical to the copies in
  // js/hotel-public.js and every js/hotel-f*.js, because build.js:329-331 puts mat, matScale,
  // matAmt and nrmAmt in the batch key: matching tuples let this module's fittings batch with the
  // per-floor architecture instead of doubling the draw calls. Change one, change all of them.
  // Roughness is 1 - gloss (gl.js:778), so the two constants below are the specular split H274
  // asks for — aged bronze against polished brass — and both are free, gloss being per instance.
  const MAT = {
    stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };
  const AGED = .34, POLISH = .78;

  function palette(A) {
    return {
      tile:A.C('#8b908b'), tileL:A.C('#bbbdb7'), tileD:A.C('#59635f'),
      concrete:A.C('#aaa99f'), paint:A.C('#c4c2b9'), paintD:A.C('#bcc2bc'),
      steel:A.C('#858c8d'), steelL:A.C('#b9c1c0'), steelD:A.C('#485354'),
      green:A.C('#557b6d'), greenL:A.C('#86a999'), teal:A.C('#3f7880'),
      yellow:A.C('#d2a84e'), red:A.C('#a83c34'), orange:A.C('#c46b38'),
      ink:A.C('#202729'), black:A.C('#14191b'), white:A.C('#d6d1c6'),
      warm:A.C('#ffe0a1'), walnut:A.C('#4b352a'), walnutL:A.C('#745342'),
      bronze:A.C('#9c7440'), bronzeL:A.C('#c5a164'), bronzeD:A.C('#5e472f'),
      stone:A.C('#596565'), stoneL:A.C('#aeb9b4'), stoneD:A.C('#293a3c'),
      celadon:A.C('#8ca99a'), celadonL:A.C('#c0d0c5'), jade:A.C('#456e61'),
      lacquer:A.C('#8e302a'), lacquerD:A.C('#572723'), silk:A.C('#c5b6a6'), towel:A.C('#d4d1c9'),
      glass:A.C('#85a9b1'), glassD:A.C('#263b42'), water:A.C('#4f8993'),
      waterL:A.C('#8cc9c7'), blue:A.C('#507f98'), leaf:A.C('#526f5d'),
      rubber:A.C('#343a3b'), linen:A.C('#e8e3da'), linenB:A.C('#bbcbd0'),
    };
  }

  function fixture(A,hz,x,z,zh,en,note,department,focus=[x,z],reach=1.9,y=1.25) {
    const th=A.thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.hotelFixture={floor:A.floor,department,tag:hz,route:A.route};
    return th;
  }

  function zSign(A,c,x,y,z,w,h,hz,en,accent=c.green,tag=hz,face=0) {
    A.box(x,y,z,w,h,.13,c.steelD,{hard:true,gloss:.34,tag});
    // glyphs() takes a yaw that points out toward the reader.  On a Z-facing panel the negative-Z
    // face therefore uses PI and the positive-Z face uses zero.  The old helper used those two
    // values backwards: the letters were placed on the correct side, but their lift pushed them
    // into the substrate and back-face culling turned every finished board into a blank slab.
    const faces=[
      {dz:-.075,tz:-.09,yaw:Math.PI},
      {dz: .075,tz: .09,yaw:0},
    ];
    for(const f of faces){
      A.box(x,y,z+f.dz,w-.18,h-.16,.025,accent,{hard:true,mode:1,gloss:.24,tag});
      A.glyphs(x,y+.15,z+f.tz,f.yaw,hz,{size:Math.min(.18,(w-.40)/Math.max(2,[...hz].length)),gap:.03,
        color:c.white,mode:1,lift:.007,glow:.025,tag});
      if(en) A.glyphs(x,y-.18,z+f.tz+(f.tz<0?-.005:.005),f.yaw,en,
        {size:Math.min(.065,(w-.38)/Math.max(2,[...en].length)),gap:.012,
         color:c.warm,mode:1,lift:.007,tag});
    }
    // A bronze reveal and two positive mounts keep even a wall sign from reading as a floating
    // coloured card when seen obliquely.
    for(const s of [-1,1]) A.box(x+s*(w/2-.12),y,z-(face===0?.01:-.01),.075,h-.10,.18,c.bronzeD,
      {hard:true,gloss:AGED,tag});
    A.box(x,y-h/2+.07,z-(face===0?.01:-.01),w-.18,.075,.18,c.bronzeD,{hard:true,gloss:AGED,tag});
    // Both faces are finished. This matters on cutaway cameras, where a sign fixed to a screen can
    // be seen from the next room; its reverse must not become a blank primitive slab.
  }

  function xSign(A,c,x,y,z,w,h,hz,en,accent=c.green,tag=hz,face=-Math.PI/2) {
    A.box(x,y,z,.13,h,w,c.steelD,{hard:true,gloss:.34,tag});
    const dx=face<0?-.075:.075;
    A.box(x+dx,y,z,.025,h-.16,w-.18,accent,{hard:true,mode:1,gloss:.24,tag});
    A.glyphs(x+(face<0?-.09:.09),y+.15,z,face,hz,{size:Math.min(.18,(w-.40)/Math.max(2,[...hz].length)),gap:.03,
      color:c.white,mode:1,lift:.007,glow:.025,tag});
    if(en) A.glyphs(x+(face<0?-.095:.095),y-.18,z,face,en,{size:Math.min(.065,(w-.38)/Math.max(2,[...en].length)),gap:.012,
      color:c.warm,mode:1,lift:.007,tag});
    for(const s of [-1,1]){
      A.box(x,y/2-h/4,z+s*(w/2-.20),.16,y-h/2,.16,c.steelD,{hard:true,gloss:.38,tag});
      A.box(x,.055,z+s*(w/2-.20),.58,.11,.50,c.rubber,{hard:true,gloss:.10,tag});
      A.box(x,y-h/2+.08,z+s*(w/2-.20),.34,.12,.34,c.bronzeD,{hard:true,gloss:AGED,tag});
    }
  }

  function portalZ(A,c,x,z,w,hz,en,accent=c.green,tag=hz,face=0) {
    for(const s of [-1,1]) A.box(x+s*(w/2-.09),1.68,z,.18,3.36,.28,c.steelD,
      {hard:true,gloss:.30,tag});
    A.box(x,3.28,z,w,.28,.28,c.steelD,{hard:true,gloss:.32,tag});
    const dz=face===0?-.15:.15;
    A.box(x,3.29,z+dz,w-.30,.12,.025,accent,{hard:true,mode:1,glow:.025,tag});
    const yaw=face===0?Math.PI:0;
    A.glyphs(x,3.54,z+(face===0?-.155:.155),yaw,hz,{size:Math.min(.17,(w-.45)/Math.max(2,[...hz].length)),gap:.03,
      color:c.white,mode:1,lift:.007,tag});
    if(en) A.glyphs(x,3.24,z+(face===0?-.16:.16),yaw,en,{size:Math.min(.062,(w-.40)/Math.max(2,[...en].length)),gap:.012,
      color:c.warm,mode:1,lift:.007,tag});
  }

  function portalX(A,c,x,z,w,hz,en,accent=c.green,tag=hz,face=-Math.PI/2) {
    for(const s of [-1,1]) A.box(x,1.68,z+s*(w/2-.09),.28,3.36,.18,c.steelD,
      {hard:true,gloss:.30,tag});
    A.box(x,3.28,z,.28,.28,w,c.steelD,{hard:true,gloss:.32,tag});
    const dx=face<0?-.15:.15;
    A.box(x+dx,3.29,z,.025,.12,w-.30,accent,{hard:true,mode:1,glow:.025,tag});
    A.glyphs(x+(face<0?-.155:.155),3.54,z,face,hz,{size:Math.min(.17,(w-.45)/Math.max(2,[...hz].length)),gap:.03,
      color:c.white,mode:1,lift:.007,tag});
    if(en) A.glyphs(x+(face<0?-.16:.16),3.24,z,face,en,{size:Math.min(.062,(w-.40)/Math.max(2,[...en].length)),gap:.012,
      color:c.warm,mode:1,lift:.007,tag});
  }

  function bench(A,c,x,z,w=2.4,ry=0,tag='长凳',soft=false) {
    A.box(x,.48,z,w,.18,.62,soft?c.silk:c.walnutL,{ry,mode:soft?7:6,gloss:soft?.035:.28,tag});
    for(const s of [-1,1]) A.box(x+s*(w*.40)*Math.cos(ry),.24,z-s*(w*.40)*Math.sin(ry),
      .09,.48,.46,c.bronzeD,{hard:true,ry,gloss:.52,tag});
    A.capsule(x,.24,z,.045,w*.72,.045,c.bronzeD,{rz:Math.PI/2,ry,gloss:AGED,tag});
    for(const s of [-1,1]) A.box(x+s*(w*.40)*Math.cos(ry),.035,z-s*(w*.40)*Math.sin(ry),
      .28,.07,.30,c.rubber,{hard:true,ry,gloss:.10,tag});
    A.shade(x,z,w+.15,.82,.20);
  }

  function chair(A,c,x,z,ry=0,tag='椅子',soft=c.silk) {
    A.box(x,.45,z,.62,.16,.62,soft,{ry,mode:7,gloss:.035,tag});
    const bx=x+Math.sin(ry)*.26,bz=z+Math.cos(ry)*.26;
    A.box(bx,.82,bz,.62,.72,.14,soft,{ry,mode:7,gloss:.035,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const px=x+Math.cos(ry)*sx*.23+Math.sin(ry)*sz*.23;
      const pz=z-Math.sin(ry)*sx*.23+Math.cos(ry)*sz*.23;
      A.box(px,.22,pz,.045,.44,.045,c.walnut,{hard:true,tag});
    }
    A.shade(x,z,.74,.74,.18);
  }

  function table(A,c,x,z,w=1.8,d=.78,tag='桌子',top=c.walnutL) {
    A.box(x,.74,z,w,.14,d,top,{gloss:.28,mode:top===c.walnutL?6:0,tag});
    for(const sx of [-1,1])for(const sz of [-1,1])
      A.box(x+sx*(w/2-.14),.37,z+sz*(d/2-.12),.07,.70,.07,c.steelD,{hard:true,tag});
    A.shade(x,z,w+.15,d+.18,.18);
  }

  function planter(A,c,x,z,r=.55,tag='绿化') {
    A.taper(x,.31,z,r,.62,r,c.stone,{...MAT.stone,gloss:.20,tag});
    A.capsule(x,.92,z,.07,1.25,.07,c.walnut,{tag});
    for(let i=0;i<7;i++){
      const a=i*2.399,rr=.18+(i%3)*.13;
      A.ball(x+Math.cos(a)*rr,1.46+(i%2)*.18,z+Math.sin(a)*rr,.24,.16,.18,c.leaf,
        {mode:15,gloss:.07,ry:a,tag});
    }
  }

  function towelStack(A,c,x,y,z,w=.82,d=.48,rows=4,tag='毛巾') {
    const out=[];
    for(let i=0;i<rows;i++){
      const xx=x+(i%2?-.04:.04), yy=y+i*.125;
      out.push(A.box(xx,yy,z,w,.11,d,c.towel,{...MAT.cloth,mode:7,gloss:.02,tag}));
      out.push(A.box(xx+w*.28,yy+.01,z-d*.51,.055,.07,.025,c.celadon,{hard:true,tag}));
    }
    return out;
  }

  function lantern(A,c,x,y,z,scale=1,tag='灯笼') {
    A.capsule(x,y+.48*scale,z,.025,.96*scale,.025,c.bronze,{gloss:AGED,tag});
    const shell=keep(A.ball(x,y,z,.20*scale,.30*scale,.20*scale,c.warm,{mode:1,glow:.13,tag}),x,y,z,.55*scale);
    const ring1=keep(A.cyl(x,y+.28*scale,z,.21*scale,.035*scale,c.bronze,{gloss:AGED,tag}),x,y+.28*scale,z,.5*scale);
    const ring2=keep(A.cyl(x,y-.28*scale,z,.21*scale,.035*scale,c.bronze,{gloss:AGED,tag}),x,y-.28*scale,z,.5*scale);
    return [{p:shell,m:shell.m},{p:ring1,m:ring1.m},{p:ring2,m:ring2.m}];
  }

  // ------------------------------------------------------------------------------------------
  // B1 · loading, laundry, staff support, engineering and security
  HotelFit.register('hotelB1',A=>{
    const c=palette(A), {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,light,onTick,luminous}=A;

    // Durable, legible service zoning.  The jade line is the actual route contract from the
    // service lift to linen, engineering and the staff circulation spine; it stays completely
    // free of counters, cast and moving carts.
    flat(-11.6,.019,-11.2,10.7,6.6,c.tileD,{mode:7,gloss:.12,mat:'tile',matScale:.48,matAmt:.24,tag:'装卸区'});
    flat(-4.1,.020,-.2,14.7,10.4,c.tileL,{mode:7,gloss:.12,mat:'tile',matScale:.42,matAmt:.24,tag:'洗衣房'});
    flat(-13.8,.021,1.6,6.2,5.2,c.paint,{mode:7,gloss:.10,tag:'员工食堂'});
    flat(-12.8,.021,10.6,8.1,6.6,c.tileD,{mode:7,gloss:.12,tag:'工程部'});
    flat(-4.0,.022,9.3,10.7,6.7,c.paintD,{mode:7,gloss:.10,tag:'员工更衣室'});
    flat(4.8,.023,9.2,8.0,7.0,c.tileL,{mode:7,gloss:.11,tag:'布草间'});
    flat(10.0,.021,-10.2,7.8,7.2,c.steelD,{mode:7,gloss:.10,tag:'保安部'});
    flat(12.4,.027,5.10,7.6,.74,c.green,{mode:7,gloss:.11,tag:'服务通道'});
    flat(9.0,.028,7.85,.74,6.25,c.green,{mode:7,gloss:.11,tag:'服务通道'});
    for(let i=0;i<5;i++){
      const x=14.8-i*1.25;
      flat(x,.030,5.10,.72,.12,c.white,{gloss:.24,tag:'服务通道'});
    }
    for(const z of [6.6,8.15,9.7]) flat(9.0,.030,z,.12,.72,c.white,{gloss:.24,tag:'服务通道'});
    // The route identity is fixed to the lift-bank wall.  A former floor-standing x-sign occupied
    // the exact service-lift sightline and its reverse filled the chase camera with a blank slab.
    // Applied lettering keeps the same bilingual wayfinding without putting any object in traffic.
    glyphs(17.80,3.72,5.10,-Math.PI/2,'地下一层 · 服务通道',
      {size:.145,gap:.032,color:c.greenL,mode:1,lift:.008,glow:.040,tag:'服务通道'});
    glyphs(17.79,3.43,5.10,-Math.PI/2,'B1 · SERVICE ROUTE',
      {size:.058,gap:.012,color:c.white,mode:1,lift:.007,tag:'服务通道'});
    fixture(A,'服务通道',12.25,5.10,'服务梯通往布草间、工程部和员工工作区，路线不得堆物。',
      'The service lift reaches linen, engineering and staff workrooms; keep the route clear.',
      '服务通道 is the staff and goods circulation route.','engineering',[14.25,5.10],2.35);
    // The shared directory already has its own plinth, frame, body solid, camera blocker and
    // finished back, so B1 does not surround it with a second camera-blocking gantry.

    // Loading dock, protected receiving platform and roll-up shutter.  The south wall remains
    // authoritative; the door is an interior dock face, not an unimplemented exterior exit.
    for(let i=0;i<13;i++) box(-11.8,.44+i*.22,-14.79,8.6,.16,.055,i%2?c.steel:c.steelL,
      {hard:true,gloss:.38,tag:'装卸区'});
    box(-11.8,3.45,-14.73,9.1,.32,.20,c.steelD,{hard:true,tag:'装卸区'});
    for(const s of [-1,1]) box(-11.8+s*4.40,1.65,-14.68,.32,3.30,.28,c.yellow,{hard:true,tag:'装卸区'});
    zSign(A,c,-11.8,3.62,-14.56,5.5,.72,'装卸区','LOADING / RECEIVING',c.green,'装卸区',Math.PI);
    box(-11.7,.31,-12.55,8.3,.60,1.30,c.concrete,{hard:true,gloss:.10,tag:'收货台'});
    // Flush dock-edge chevrons are paint, not extra collision.  They break up the concrete mass
    // and make the safe unloading edge legible from both the shutter and the staff aisle.
    for(let i=0;i<13;i++){
      const x=-15.45+i*.62;
      flat(x,.617,-11.89,.38,.11,i%2?c.yellow:c.ink,
        {ry:i%2?.46:-.46,hard:false,mode:7,gloss:.22,tag:'收货台'});
    }
    // A clipboard, barcode scanner and coiled lead make the acceptance point operational rather
    // than another clean slab.  All sit above the existing dock solid.
    box(-8.12,.665,-12.72,.54,.035,.36,c.white,{hard:false,ry:-.08,mode:7,tag:'收货台'});
    box(-8.12,.692,-12.72,.16,.018,.055,c.green,{hard:false,ry:-.08,mode:1,tag:'收货台'});
    box(-7.72,.735,-12.70,.20,.16,.12,c.steelD,{hard:false,ry:.10,gloss:.38,tag:'收货台'});
    luminous(box(-7.72,.785,-12.755,.10,.035,.018,c.greenL,
      {hard:false,mode:1,tag:'收货台'}),.055,.16);
    for(const x of [-14.7,-11.8,-8.9]){
      box(x,.18,-11.55,2.05,.22,1.42,c.walnut,{...MAT.timber,mode:6,gloss:.19,tag:'收货台'});
      for(const dx of [-.72,0,.72]){
        const j=dx<0?0:(dx>0?2:1),bx=x+dx;
        const bw=[.66,.52,.72][j],bh=[.44,.60,.50][j],bd=[.84,1.00,.76][j];
        const by=.32+bh/2,bc=j===0?c.paintD:(j===1?c.linenB:c.tileL);
        box(bx,by,-11.55,bw,bh,bd,bc,{tag:'收货台'});
        // Taped seams, protected corners and a receiving label turn each carton into a handled
        // delivery rather than a loose primitive cube.
        box(bx,by+bh/2+.02,-11.55,.10,.035,bd+.02,c.yellow,{hard:true,gloss:.22,tag:'收货台'});
        // The acceptance camera sees the north face: labels, route colour and handling marks are
        // placed there rather than on the shutter side.
        box(bx,by,-11.55+bd/2+.018,bw*.66,bh*.42,.025,c.white,{hard:true,mode:1,tag:'收货台'});
        box(bx-.10,by+.04,-11.55+bd/2+.034,bw*.26,.035,.018,j===2?c.orange:c.green,
          {hard:true,mode:1,tag:'收货台'});
        box(bx+.12,by-.06,-11.55+bd/2+.034,bw*.22,.025,.018,c.steelD,
          {hard:true,mode:1,tag:'收货台'});
        for(const s of [-1,1]) box(bx+s*(bw/2-.025),by,-11.55+bd/2-.02,.035,bh,.08,c.steelD,
          {hard:true,gloss:.30,tag:'收货台'});
      }
      for(let sl=0;sl<4;sl++) box(x,.29,-12.05+sl*.33,2.10,.055,.19,c.walnutL,
        {...MAT.timber, hard:true,mode:6,gloss:.20,tag:'收货台'});
      solid(x-1.05,x+1.05,-12.28,-10.82);
    }
    // Two wheeled roll cages carry soft linen bags.  Tubular frames, cross rails, wheel forks,
    // drawstrings and coloured route bands make them unmistakably handled hotel stock.
    for(const [x,z,accent] of [[-15.8,-9.55,c.green],[-7.45,-9.65,c.orange]]){
      box(x,.16,z,1.42,.12,1.05,c.steelD,{hard:true,gloss:.42,tag:'收货台'});
      for(const sx of [-1,1])for(const sz of [-1,1]){
        capsule(x+sx*.66,1.18,z+sz*.47,.045,2.08,.045,c.steelD,{gloss:.48,tag:'收货台'});
        box(x+sx*.66,.08,z+sz*.47,.16,.18,.12,c.steelD,{hard:true,tag:'收货台'});
        cyl(x+sx*.66,.06,z+sz*.47,.09,.06,c.rubber,{rz:Math.PI/2,tag:'收货台'});
      }
      for(const y of [.48,1.04,1.60,2.16]){
        capsule(x,y,z-.49,.04,1.30,.04,c.steel,{rz:Math.PI/2,gloss:.45,tag:'收货台'});
        capsule(x,y,z+.49,.04,1.30,.04,c.steel,{rz:Math.PI/2,gloss:.45,tag:'收货台'});
      }
      taper(x-.31,.78,z,.48,1.22,.42,c.linen,{...MAT.cloth,gloss:.025,mode:7,tag:'收货台'});
      taper(x+.31,.72,z,.46,1.10,.40,c.linenB,{...MAT.cloth,gloss:.025,mode:7,tag:'收货台'});
      capsule(x-.31,1.42,z,.025,.56,.025,c.bronzeD,{rz:Math.PI/2,tag:'收货台'});
      capsule(x+.31,1.33,z,.025,.52,.025,c.bronzeD,{rz:Math.PI/2,tag:'收货台'});
      box(x,1.80,z-.515,1.16,.22,.035,accent,{hard:true,mode:1,gloss:.26,tag:'收货台'});
      glyphs(x,1.81,z-.54,0,'布草',{size:.105,gap:.025,color:c.white,mode:1,lift:.006,tag:'收货台'});
      solid(x-.74,x+.74,z-.55,z+.55);
    }
    // Finished hand pallet truck: paired forks, load rollers, a hydraulic head and a curved
    // control handle.  It occupies the same small parking patch as the old two black blocks and
    // remains visual-only, so the measured receiving aisle is unchanged.
    for(const s of [-1,1]){
      box(-7.3+s*.46,.15,-12.94,.18,.12,.78,c.yellow,
        {hard:false,gloss:.30,round:.025,tag:'装卸区'});
      cyl(-7.3+s*.46,.075,-12.63,.085,.055,c.rubber,
        {rz:Math.PI/2,tag:'装卸区'});
      cyl(-7.3+s*.46,.075,-13.24,.095,.060,c.rubber,
        {rz:Math.PI/2,tag:'装卸区'});
    }
    taper(-7.30,.38,-13.38,.30,.55,.24,c.yellow,{gloss:.30,tag:'装卸区'});
    cyl(-7.30,.56,-13.38,.12,.09,c.steelD,{gloss:.48,tag:'装卸区'});
    capsule(-7.30,1.05,-13.52,.052,1.02,.052,c.steelD,
      {rx:-.20,gloss:.48,tag:'装卸区'});
    capsule(-7.30,1.53,-13.62,.048,.64,.048,c.rubber,
      {rz:Math.PI/2,gloss:.14,tag:'装卸区'});
    for(const s of [-1,1]) ball(-7.30+s*.30,1.53,-13.62,.075,.075,.075,c.rubber,
      {gloss:.10,tag:'装卸区'});
    fixture(A,'装卸区',-11.8,-12.55,'收货台按供应商和楼层整理当日到货。',
      'The receiving dock sorts today\'s deliveries by supplier and floor.',
      '装卸 is loading and unloading; 收货 is receiving.','housekeeping',[-7.1,-11.4],2.2);

    // Staff entrance beside receiving: card reader, glazed vision panel, roster board and a real
    // clear route toward lockers/security.  It is a workplace seam, not an exterior teleport.
    box(-3.35,1.58,-14.70,2.55,3.12,.18,c.steelD,{hard:true,gloss:.30,tag:'员工入口'});
    box(-3.35,1.52,-14.58,2.15,2.82,.08,c.green,{hard:true,gloss:.24,tag:'员工入口'});
    box(-3.35,.09,-14.43,2.30,.18,.34,c.steelD,{hard:true,gloss:.36,tag:'员工入口'});
    for(const s of [-1,1]) box(-3.35+s*1.02,1.52,-14.42,.055,2.74,.12,c.bronzeD,
      {hard:true,gloss:AGED,tag:'员工入口'});
    box(-3.35,.50,-14.40,2.02,.42,.025,c.steelL,{hard:true,gloss:.42,tag:'员工入口'});
    for(const y of [.70,1.72]) box(-4.28,y,-14.37,.07,.18,.035,c.bronzeD,
      {hard:true,gloss:AGED,tag:'员工入口'});
    capsule(-2.55,1.42,-14.34,.045,.42,.045,c.bronzeL,{gloss:POLISH,tag:'员工入口'});
    box(-3.35,2.14,-14.51,1.35,.68,.025,c.glassD,{hard:true,mode:1,alpha:.70,gloss:.76,tag:'员工入口'});
    luminous(box(-1.88,1.42,-14.44,.18,.42,.12,c.greenL,{hard:true,mode:1,tag:'员工入口'}),.05,.18);
    zSign(A,c,-3.35,3.48,-14.49,3.8,.72,'员工入口','STAFF ENTRANCE',c.green,'员工入口',Math.PI);
    box(.15,1.72,-13.90,3.25,2.54,.12,c.steelD,{hard:true,tag:'员工入口'});
    box(.15,1.72,-13.82,3.02,2.30,.025,c.white,{hard:true,mode:1,glow:.018,tag:'员工入口'});
    glyphs(.15,2.55,-13.79,0,'今日值班',{size:.16,gap:.035,color:c.green,mode:1,lift:.007,tag:'员工入口'});
    for(let i=0;i<5;i++) box(.15,2.15-i*.34,-13.77,2.52,.045,.018,i%2?c.greenL:c.bronzeL,
      {hard:true,mode:1,tag:'员工入口'});
    fixture(A,'员工入口',-3.35,-14.5,'员工刷卡后经过保安部，再到更衣室换制服。',
      'Staff badge in, pass security and change into uniform.',
      '员工 means staff; 入口 means entrance.','security',[-3.35,-12.55],2.2);

    // Laundry machine wall: ten independent front-load drums, status lights, actual linen
    // tumbling behind blue-grey glass and a central wet-work trench.
    portalZ(A,c,-4.3,-5.35,5.6,'洗衣房','LAUNDRY',c.green,'洗衣房');
    zSign(A,c,-7.55,3.43,5.26,4.4,.58,'水洗 · 烘干','WASH / DRY',c.teal,'洗衣房');
    const drumCloth=[],machineLights=[];
    const machineZ=[-4.15,-2.05,.05,2.15,4.25];
    machineZ.forEach((z,i)=>{
      box(-10.20,.09,z,1.66,.18,1.80,c.rubber,{hard:true,gloss:.14,tag:'洗衣房'});
      box(-10.20,1.42,z,1.55,2.72,1.70,c.steelL,{hard:true,gloss:.32,tag:'洗衣房'});
      // Recessed side reveals, vent grille and a proper control eyebrow dress the steel cabinet.
      for(const s of [-1,1]) box(-9.39,1.42,z+s*.72,.045,2.50,.055,c.steelD,
        {hard:true,gloss:.46,tag:'洗衣房'});
      box(-9.34,2.62,z,.06,.18,1.42,c.steelD,{hard:true,gloss:.48,tag:'洗衣房'});
      for(let v=0;v<5;v++) box(-9.29,.28+v*.07,z+.51,.025,.025,.54,c.black,
        {hard:true,mode:1,tag:'洗衣房'});
      box(-9.40,1.42,z,.075,2.52,1.52,c.steelD,{hard:true,gloss:.42,tag:'洗衣房'});
      for(let j=0;j<2;j++){
        const y=.78+j*1.28;
        cyl(-9.34,y,z,.48,.075,c.steelD,{rz:Math.PI/2,gloss:.58,tag:'洗衣房'});
        cyl(-9.28,y,z,.37,.045,c.glassD,{rz:Math.PI/2,gloss:.70,alpha:.75,mode:1,tag:'洗衣房'});
        for(let k=0;k<3;k++){
          const a0=k*TAU/3+i*.7+j*.4;
          const p=keep(ball(-9.23,y+Math.cos(a0)*.18,z+Math.sin(a0)*.18,.12,.10,.11,
            k===0?c.linenB:(k===1?c.linen:c.celadon),{mode:7,tag:'洗衣房'}),-9.23,y,z,.65);
          drumCloth.push({p,x:-9.23,y,z,a0,speed:1.55+(i%3)*.23});
        }
      }
      const lamp=keep(box(-9.31,2.55,z-.52,.035,.10,.10,c.greenL,{hard:true,mode:1,glow:.13,tag:'洗衣房'}),
        -9.31,2.55,z-.52,.25);
      machineLights.push({p:lamp,i});
      // Recessed status row, emergency stop and a stainless dosing cup give each pair its own
      // serviceable control face instead of repeating one blank appliance cabinet.
      for(let b=0;b<3;b++) cyl(-9.265,2.48,z-.16+b*.16,.030,.014,
        b===0?c.greenL:(b===1?c.yellow:c.steelL),
        {rz:Math.PI/2,mode:1,glow:b===0?.06:0,tag:'洗衣房'});
      cyl(-9.255,2.31,z+.43,.052,.018,c.red,
        {rz:Math.PI/2,mode:1,glow:.025,tag:'洗衣房'});
      cyl(-9.75,2.88,z+.52,.085,.16,i%2?c.celadon:c.linenB,
        {gloss:.32,alpha:.86,mode:1,tag:'洗衣房'});
      cyl(-9.75,2.99,z+.52,.055,.035,c.steelD,{gloss:.50,tag:'洗衣房'});
      glyphs(-9.29,2.58,z+.42,-Math.PI/2,String(i+1),{size:.11,color:c.white,mode:1,lift:.006,tag:'洗衣房'});
      solid(-11.0,-9.30,z-.84,z+.84);
    });
    // Overhead detergent/water header with flexible drops, colour bands and hand valves.  It is
    // tucked over the existing machine bank and does not project into the operator aisle.
    capsule(-10.72,3.18,.05,.060,8.95,.060,c.teal,
      {rx:Math.PI/2,gloss:.45,tag:'洗衣房'});
    capsule(-10.94,3.38,.05,.050,8.95,.050,c.orange,
      {rx:Math.PI/2,gloss:.43,tag:'洗衣房'});
    for(const [i,z] of machineZ.entries()){
      capsule(-10.72,2.96,z,.038,.40,.038,c.teal,{gloss:.42,tag:'洗衣房'});
      capsule(-10.94,2.99,z,.033,.66,.033,c.orange,{rz:.26,gloss:.40,tag:'洗衣房'});
      cyl(-10.72,2.79,z,.10,.035,c.steelD,{gloss:.54,tag:'洗衣房'});
      for(let k=0;k<4;k++) capsule(-10.72+Math.cos(k*Math.PI/2)*.085,2.79+
        Math.sin(k*Math.PI/2)*.085,z,.012,.15,.012,i%2?c.yellow:c.red,
        {rz:k*Math.PI/2,gloss:.38,tag:'洗衣房'});
      box(-10.83,3.31,z,.20,.12,.32,i%2?c.celadon:c.yellow,
        {hard:false,mode:1,gloss:.22,tag:'洗衣房'});
    }
    // Tall machine cabinets are real camera masses.  When a player turns east to leave, the
    // camera now shortens or shoulder-slides at the steel bank instead of entering a drum cabinet.
    blocker(-11.08,-9.20,-5.10,5.12,3.12);
    flat(-7.75,.030,.05,.16,9.0,c.teal,{gloss:.30,tag:'洗衣房'});

    // Sorting/folding island, steam press, clean/soiled colour coding and a moving conveyor.
    for(const z of [-2.65,0,2.65]){
      table(A,c,-5.45,z,3.2,1.15,'折叠台',c.steelL);
      towelStack(A,c,-5.45,.86,z,1.10,.70,3,'布草');
      // Braced stainless underframe and four swivelling casters visually carry the folding top.
      capsule(-5.45,.31,z-.43,.035,2.55,.035,c.steelD,
        {rz:Math.PI/2,gloss:.46,tag:'折叠台'});
      capsule(-5.45,.31,z+.43,.035,2.55,.035,c.steelD,
        {rz:Math.PI/2,gloss:.46,tag:'折叠台'});
      for(const sx of [-1,1])for(const sz of [-1,1]){
        box(-5.45+sx*1.28,.105,z+sz*.43,.12,.18,.10,c.steelD,
          {hard:false,gloss:.45,tag:'折叠台'});
        cyl(-5.45+sx*1.28,.045,z+sz*.43,.070,.045,c.rubber,
          {rz:Math.PI/2,tag:'折叠台'});
      }
      solid(-7.08,-3.82,z-.60,z+.60);
    }
    box(-1.60,.72,-2.35,2.45,.22,1.22,c.steelL,{gloss:.35,tag:'熨烫'});
    box(-1.60,1.17,-2.35,1.70,.16,.88,c.steelD,{hard:true,gloss:.40,tag:'熨烫'});
    capsule(-2.45,1.40,-2.35,.06,1.15,.06,c.steelD,{rz:-.45,tag:'熨烫'});
    for(const x of [-2.55,-.65])for(const z of [-2.78,-1.92]){
      box(x,.30,z,.08,.60,.08,c.steelD,{hard:true,gloss:.42,tag:'熨烫'});
      box(x,.045,z,.25,.09,.25,c.rubber,{hard:true,gloss:.10,tag:'熨烫'});
    }
    // Attached control fascia, guarded platen and tactile buttons replace the old floating sign.
    box(-1.60,1.55,-2.84,1.62,.55,.16,c.steelD,{hard:true,gloss:.40,tag:'熨烫'});
    box(-1.82,1.58,-2.94,.80,.30,.025,c.ink,{hard:true,mode:1,glow:.025,tag:'熨烫'});
    glyphs(-1.82,1.59,-2.97,0,'熨烫',{size:.105,gap:.025,color:c.white,mode:1,lift:.006,tag:'熨烫'});
    for(let i=0;i<3;i++) cyl(-1.22+i*.22,1.58,-2.95,.055,.025,i===0?c.red:(i===1?c.yellow:c.greenL),
      {rx:Math.PI/2,mode:1,glow:.08,tag:'熨烫'});
    capsule(-2.35,1.33,-1.86,.035,1.35,.035,c.yellow,{rz:Math.PI/2,gloss:.40,tag:'熨烫'});
    solid(-2.88,-.32,-2.98,-1.72);

    box(.50,.62,1.55,5.75,.28,1.20,c.steelD,{hard:true,gloss:.35,tag:'传送带'});
    box(.50,.82,1.55,5.45,.12,1.00,c.rubber,{hard:true,gloss:.12,tag:'传送带'});
    for(const x of [-1.85,.50,2.85])for(const z of [1.12,1.98]){
      box(x,.30,z,.095,.60,.095,c.steelD,{hard:true,gloss:.42,tag:'传送带'});
      box(x,.055,z,.30,.11,.30,c.rubber,{hard:true,gloss:.10,tag:'传送带'});
    }
    for(const x of [-2.28,3.28]) box(x,.93,1.55,.14,.54,1.30,c.yellow,
      {hard:true,gloss:.34,tag:'传送带'});
    for(let i=0;i<8;i++) cyl(-1.85+i*.67,.77,1.55,.10,.92,c.steel,{rz:Math.PI/2,gloss:.50,tag:'传送带'});
    const beltPacks=[];
    for(let i=0;i<4;i++){
      const x=-1.45+i*1.28,w=.72+(i%3)*.10,d=.60+(i%2)*.13,y=1.00+(i%2)*.035;
      const p=keep(box(x,y,1.55,w,.25+(i%2)*.05,d,i%2?c.linen:c.linenB,{...MAT.cloth,mode:7,tag:'传送带'}),x,y,1.55,1.2);
      beltPacks.push({p,m:p.m,i});
      const band=keep(box(x,y+.145,1.55,.10,.035,d+.02,i===3?c.orange:c.green,
        {hard:true,gloss:.22,tag:'传送带'}),x,y+.145,1.55,1.2);
      beltPacks.push({p:band,m:band.m,i});
    }
    solid(-2.42,3.42,.92,2.18);
    fixture(A,'洗衣房',-7.9,.05,'水洗、烘干、熨烫和折叠形成一条清楚的布草流程。',
      'Washing, drying, pressing and folding form one clear linen workflow.',
      '洗衣房 is the hotel laundry.','laundry',[-7.75,.05],2.0);
    fixture(A,'传送带',.50,1.55,'传送带把折好的布草送到客房部工作间。',
      'The conveyor carries folded linen toward housekeeping storage.',
      '传送带 means conveyor belt.','laundry',[.50,.20],1.9);

    // Housekeeping/linen store.  North-wall shelving remains tall and inventoried, while the old
    // row of three 2.5 m cabinets across z=8.45 is replaced by two low stocking carts at the sides.
    // That restores a genuine 3.4 m central route from the portal to every linen bay and lets the
    // player-height camera see through the whole workroom.
    portalZ(A,c,4.85,5.62,4.0,'布草间','LINEN ROOM',c.green,'布草间');
    flat(4.85,.029,8.78,.10,5.95,c.green,{gloss:.30,tag:'服务通道'});
    for(const x of [2.0,4.25,6.50,8.15]){
      box(x,1.55,11.75,1.60,3.00,.45,c.steelD,{hard:true,gloss:.28,tag:'布草间'});
      for(let j=0;j<4;j++){
        box(x,.45+j*.68,11.48,1.46,.075,.78,c.steel,{hard:true,gloss:.35,tag:'布草间'});
        towelStack(A,c,x,.55+j*.68,11.25,.94,.48,2,j%2?'布草':'毛巾');
      }
      solid(x-.82,x+.82,11.12,12.0);
    }
    blocker(1.10,9.05,11.04,12.08,3.18);
    for(const [x,no,accent] of [[2.15,'07',c.celadon],[7.55,'12',c.linenB]]){
      box(x,.13,8.68,1.70,.16,1.05,c.rubber,{hard:true,gloss:.12,tag:'客房部工作间'});
      for(const sx of [-1,1])for(const sz of [-1,1]){
        capsule(x+sx*.72,.70,8.68+sz*.43,.035,1.22,.035,c.steelD,
          {gloss:.46,tag:'客房部工作间'});
        cyl(x+sx*.72,.06,8.68+sz*.43,.09,.055,c.rubber,
          {rz:Math.PI/2,tag:'客房部工作间'});
      }
      for(const y of [.42,.86,1.30])
        box(x,y,8.68,1.46,.075,.86,c.steel,{hard:true,gloss:.36,tag:'客房部工作间'});
      box(x,1.47,9.09,1.52,.20,.055,accent,{hard:true,mode:1,gloss:.24,tag:'客房部工作间'});
      glyphs(x,1.48,9.13,0,`楼层 ${no}`,
        {size:.090,gap:.018,color:c.ink,mode:1,lift:.005,tag:'客房部工作间'});
      towelStack(A,c,x-.31,.51,8.62,.56,.42,3,'布草');
      for(let j=0;j<3;j++) cyl(x+.34+j*.16,.56,8.64,.055,.25,
        j===0?c.greenL:(j===1?c.orange:c.white),{gloss:.22,tag:'客房部工作间'});
      solid(x-.87,x+.87,8.12,9.23);
    }
    zSign(A,c,4.85,3.46,12.95,5.5,.58,'客房部工作间','HOUSEKEEPING STORE',c.green,'客房部工作间');
    fixture(A,'布草间',4.85,10.75,'布草按楼层、尺寸和洁净状态分架存放。',
      'Linen is shelved by floor, size and clean status.',
      '布草 is hotel linen.','housekeeping',[4.85,10.20],2.0);
    fixture(A,'客房部工作间',5.0,8.4,'客房部在这里配齐推车，再从服务梯送往客房层。',
      'Housekeeping stocks carts here before sending them up in the service lift.',
      '客房部 is housekeeping.','housekeeping',[5.0,6.90],2.1);

    // Staff changing: the five core lockers become one bank in a complete room with benches,
    // shoe shelves, mirror, wash counter and private shower thresholds.
    portalZ(A,c,-4.0,6.10,4.6,'员工更衣室','STAFF CHANGING',c.green,'员工更衣室');
    for(const x of [-8,-6,-4,-2,0]){
      box(x,.08,7.8,1.64,.16,.62,c.rubber,{hard:true,gloss:.12,tag:'储物柜'});
      box(x,1.48,7.48,1.50,2.78,.055,c.steelD,{hard:true,gloss:.34,tag:'储物柜'});
      for(const s of [-1,1]) box(x+s*.72,1.48,7.44,.045,2.66,.10,c.bronzeD,
        {hard:true,gloss:AGED,tag:'储物柜'});
      for(let v=0;v<4;v++) box(x-.34+v*.22,2.05,7.40,.13,.025,.018,c.black,
        {hard:true,mode:1,tag:'储物柜'});
      for(const y of [.70,1.75]) box(x-.64,y,7.39,.07,.18,.035,c.bronzeD,
        {hard:true,gloss:AGED,tag:'储物柜'});
      cyl(x+.49,1.06,7.38,.045,.022,c.bronzeL,{rx:Math.PI/2,gloss:POLISH,tag:'储物柜'});
      box(x,2.28,7.53,1.48,.085,.58,c.green,{hard:true,gloss:.25,tag:'储物柜'});
      glyphs(x,2.29,7.22,Math.PI,String(101+(x+8)/2),{size:.10,color:c.white,mode:1,lift:.006,tag:'储物柜'});
      box(x+.48,1.02,7.45,.055,.25,.10,c.steelD,{hard:true,tag:'储物柜'});
    }
    solid(-8.9,.9,7.45,8.15);
    blocker(-8.98,.98,7.38,8.22,3.02);
    bench(A,c,-6.4,9.75,3.0,0,'更衣长凳');
    bench(A,c,-2.0,9.75,3.0,0,'更衣长凳');
    box(-4.0,1.58,12.15,6.4,2.72,.14,c.tileL,{hard:true,gloss:.18,tag:'淋浴'});
    for(const x of [-6.2,-4.0,-1.8]){
      box(x,1.55,11.76,.10,2.75,.84,c.glass,{hard:true,mode:1,alpha:.27,gloss:.72,tag:'淋浴'});
      cyl(x,2.55,11.62,.14,.035,c.steelD,{rx:Math.PI/2,gloss:.48,tag:'淋浴'});
      for(let j=0;j<3;j++) capsule(x-.11+j*.11,2.35-j*.22,11.48,.012,.34,.012,c.waterL,{tag:'淋浴'});
    }
    box(.15,1.46,10.35,.12,2.55,2.75,c.glassD,{hard:true,mode:1,alpha:.68,gloss:.84,tag:'员工更衣室'});
    fixture(A,'员工更衣室',-4.0,8.1,'员工在这里换制服、存放私人物品并淋浴。',
      'Staff change uniform, store personal items and shower here.',
      '更衣室 is a changing room.','housekeeping',[-4.0,9.10],2.0);
    fixture(A,'储物柜',-4.0,7.55,'储物柜编号清楚，制服和个人物品分开存放。',
      'Numbered lockers keep uniforms and personal items separate.',
      '储物柜 means locker.','housekeeping',[-4.0,6.75],1.9);

    // A deliberately warm staff canteen: timber, soft light, hot dishes, fridge and pin-board.
    // Its comfort is part of the building's workplace quality, not guest-facing decoration.
    // A framed celadon screen separates food service from the engineering bay to the north.  The
    // former open view put boiler vessels directly behind the dining tables; this floor-standing
    // partition preserves the east circulation opening while giving both departments the hygienic,
    // operational separation a real hotel basement needs.
    box(-13.75,.30,4.14,5.55,.60,.18,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.25,tag:'员工食堂'});
    box(-13.75,2.66,4.14,5.55,.18,.18,c.bronzeD,{hard:true,gloss:AGED,tag:'员工食堂'});
    const canteenBays=[-15.58,-13.75,-11.92];
    for(const x of canteenBays){
      box(x,1.57,4.14,1.62,1.96,.045,c.glassD,
        {hard:true,mode:1,alpha:.68,gloss:.78,tag:'员工食堂'});
      // A simple Chinese lattice rhythm is applied to the occupied face of every screen; the
      // continuous sill below and lintel above carry it rather than leaving decorative bars loose.
      box(x,1.57,4.105,.075,1.96,.035,c.bronzeL,{hard:true,gloss:POLISH,tag:'员工食堂'});
      for(const y of [1.10,1.57,2.04]) box(x,y,4.105,1.62,.055,.035,c.bronzeL,
        {hard:true,gloss:POLISH,tag:'员工食堂'});
    }
    for(const x of [-16.48,-14.665,-12.835,-11.02]){
      box(x,1.46,4.14,.13,2.40,.18,c.bronzeD,{hard:true,gloss:AGED,tag:'员工食堂'});
      box(x,.055,4.14,.46,.11,.42,c.rubber,{hard:true,gloss:.10,tag:'员工食堂'});
      box(x,2.70,4.14,.30,.12,.30,c.bronzeL,{hard:true,gloss:POLISH,tag:'员工食堂'});
    }
    solid(-16.55,-10.95,4.04,4.23);
    // A shallow, two-faced header is carried by the screen posts.  The previous metre-high sign
    // hung at chase-camera height and repeatedly became the entire view while entering engineering.
    box(-13.75,2.96,4.14,5.45,.46,.18,c.lacquer,{hard:true,gloss:.30,tag:'员工食堂'});
    for(const [z,yaw] of [[4.025,Math.PI],[4.255,0]]){
      glyphs(-13.75,3.03,z,yaw,'员工食堂',
        {size:.145,gap:.035,color:c.white,mode:1,lift:.007,glow:.025,tag:'员工食堂'});
      glyphs(-13.75,2.82,z+(z<4.14?-.005:.005),yaw,'STAFF CANTEEN',
        {size:.052,gap:.011,color:c.warm,mode:1,lift:.006,tag:'员工食堂'});
    }
    blocker(-16.64,-10.86,4.00,4.28,3.24);
    box(-16.20,.76,1.40,1.25,1.18,4.15,c.walnut,{...MAT.timber,gloss:.28,mode:6,tag:'员工食堂'});
    box(-15.52,1.20,1.40,.14,.10,3.90,c.bronzeL,{hard:true,gloss:POLISH,tag:'员工食堂'});
    for(const z of [.15,1.35,2.55]){
      box(-15.42,1.15,z,.12,.18,.75,c.steelD,{hard:true,tag:'今日热菜'});
      ball(-15.30,1.27,z,.10,.09,.10,z<1?c.greenL:(z<2?c.orange:c.yellow),{tag:'今日热菜'});
    }
    box(-16.05,1.55,3.66,.92,2.60,.84,c.paintD,{hard:true,gloss:.20,tag:'员工食堂'});
    box(-15.56,1.62,3.66,.035,2.18,.65,c.glassD,{hard:true,mode:1,glow:.03,tag:'员工食堂'});
    for(const [x,z] of [[-13.65,.15],[-11.45,.15],[-12.55,2.55]]){
      table(A,c,x,z,1.35,.78,'员工餐桌',c.walnutL);
      // Each backrest is on the side away from the tabletop, with 34 cm of pull-out clearance.
      chair(A,c,x,z-.76,Math.PI,'员工餐椅',c.greenL);
      chair(A,c,x,z+.76,0,'员工餐椅',c.greenL);
      solid(x-.72,x+.72,z-.43,z+.43);
    }
    solid(-16.85,-15.45,-.75,3.75);
    fixture(A,'员工食堂',-13.2,1.4,'热菜、米饭和茶水让各班员工能安静吃一顿饭。',
      'Hot dishes, rice and tea give every shift a comfortable staff meal.',
      '食堂 is a staff canteen.','food-beverage',[-14.55,1.40],2.0);

    // Engineering plant: coloured pipework has real destinations, pumps have gauges and the
    // panel carries live deterministic status lamps.  The core's 工程部 focal wall is retained.
    portalZ(A,c,-12.7,7.35,4.6,'工程部','ENGINEERING',c.orange,'工程部');
    for(let i=0;i<4;i++){
      const x=-16.0+i*1.55;
      box(x,.08,11.85,1.42,.16,1.42,c.steelD,{hard:true,gloss:.34,tag:'工程部'});
      cyl(x,.20,11.85,.70,.10,c.bronzeD,{gloss:AGED,tag:'工程部'});
      cyl(x,1.00,11.85,.58,1.78,i%2?c.steel:c.steelL,{gloss:.38,tag:'工程部'});
      cyl(x,2.00,11.85,.60,.26,c.steelD,{gloss:.36,tag:'工程部'});
      cyl(x,2.16,11.85,.42,.08,c.bronzeD,{gloss:AGED,tag:'工程部'});
      // Service hatch, ID band and bolt ring give each vessel a maintained plant-room face.
      box(x,1.18,11.25,.68,.48,.035,c.steelD,{hard:true,mode:1,gloss:.42,tag:'工程部'});
      box(x,1.18,11.21,.46,.12,.018,i%2?c.teal:c.orange,{hard:true,mode:1,glow:.025,tag:'工程部'});
      glyphs(x,1.40,11.205,0,`泵${i+1}`,{size:.085,gap:.018,color:c.white,mode:1,lift:.005,tag:'工程部'});
      cyl(x,.30,11.85,.22,.22,c.rubber,{gloss:.12,tag:'工程部'});
      cyl(x,2.18,11.30,.20,.035,c.white,{rx:Math.PI/2,gloss:.30,tag:'工程部'});
      capsule(x,2.18,11.25,.012,.28,.012,c.red,{rz:(i-1.5)*.35,tag:'工程部'});
      capsule(x,2.16,11.58,.045,.56,.045,i%2?c.teal:c.orange,{rx:Math.PI/2,gloss:.48,tag:'工程部'});
      capsule(x,2.73,11.85,.09,1.08,.09,i%2?c.teal:c.orange,{gloss:.46,tag:'工程部'});
      capsule(x,3.18,11.10,.09,1.50,.09,i%2?c.teal:c.orange,{rx:Math.PI/2,gloss:.46,tag:'工程部'});
      cyl(x,3.18,10.38,.25,.055,c.steelD,{rx:Math.PI/2,gloss:.52,tag:'工程部'});
      for(let s=0;s<4;s++) capsule(x+Math.cos(s*Math.PI/2)*.16,3.18+Math.sin(s*Math.PI/2)*.16,10.31,
        .018,.30,.018,c.red,{rz:s*Math.PI/2,tag:'工程部'});
      solid(x-.62,x+.62,11.20,12.52);
    }
    // The four vessels read as one maintained plant bank and stop the orbit as one mass; this is
    // what prevents an about-face in the service aisle from putting the eye inside a boiler shell.
    blocker(-16.72,-10.65,11.10,12.62,3.44);
    for(const x of [-16.8,-10.55]) flat(x,.029,11.85,.10,2.55,c.yellow,{gloss:.28,tag:'工程部'});
    for(const z of [10.58,13.12]) flat(-13.68,.029,z,6.35,.10,c.yellow,{gloss:.28,tag:'工程部'});
    const pipes=[
      {z:9.25,y:2.65,col:c.teal},{z:9.80,y:2.90,col:c.orange},{z:10.35,y:3.15,col:c.greenL}
    ];
    pipes.forEach((q,i)=>{
      capsule(-13.25,q.y,q.z,.10,7.2,.10,q.col,{rz:Math.PI/2,gloss:.48,tag:'工程部'});
      for(const x of [-16.2,-13.25,-10.3]) cyl(x,q.y,q.z,.18,.07,c.steelD,{rz:Math.PI/2,gloss:.50,tag:'工程部'});
      capsule(-10.15,1.65+i*.30,q.z,.10,2.2-i*.25,.10,q.col,{tag:'工程部'});
    });
    box(-10.0,1.40,8.30,2.55,2.48,.62,c.steelD,{hard:true,gloss:.34,tag:'工程部'});
    box(-10.0,.09,8.30,2.75,.18,.82,c.rubber,{hard:true,gloss:.12,tag:'工程部'});
    box(-10.0,1.55,7.97,2.22,1.72,.035,c.ink,{hard:true,mode:1,glow:.025,tag:'工程部'});
    glyphs(-10.0,2.50,7.93,0,'工程状态',{size:.13,gap:.03,color:c.bronzeL,mode:1,lift:.006,tag:'工程部'});
    for(let v=0;v<7;v++) box(-10.75+v*.25,.42,7.92,.13,.025,.018,c.black,
      {hard:true,mode:1,tag:'工程部'});
    const engLamps=[];
    for(let r=0;r<3;r++)for(let j=0;j<5;j++){
      const p=keep(box(-10.82+j*.41,1.95-r*.42,7.94,.12,.10,.018,(j+r)%4?c.greenL:c.orange,
        {hard:true,mode:1,glow:.10,tag:'工程部'}),-10.82+j*.41,1.95-r*.42,7.94,.2);
      engLamps.push({p,i:r*5+j});
    }
    solid(-11.32,-8.68,7.95,8.68);
    blocker(-11.40,-8.60,7.88,8.75,2.82);
    fixture(A,'工程部',-12.7,10.2,'工程部监控供水、空调、电力和消防设备。',
      'Engineering monitors water, air conditioning, power and fire systems.',
      '工程部 is engineering.','engineering',[-12.7,8.45],2.2);

    // Security command room: a twelve-screen CCTV wall, incident board, radio chargers and a
    // sightline to the staff entrance.  Screens animate independently but never flash harshly.
    portalX(A,c,6.35,-9.45,3.2,'保安部','SECURITY',c.green,'保安部');
    box(10.0,1.85,-13.78,7.0,3.25,.15,c.steelD,{hard:true,gloss:.30,tag:'监控中心'});
    const screens=[];
    for(let r=0;r<3;r++)for(let j=0;j<4;j++){
      const x=7.45+j*1.70,y=2.65-r*.82;
      box(x,y,-13.67,1.48,.68,.035,c.black,{hard:true,mode:1,gloss:.50,tag:'监控中心'});
      const p=keep(box(x,y,-13.63,1.34,.54,.018,(r+j)%3?c.blue:c.green,
        {hard:true,mode:1,glow:.055,tag:'监控中心'}),x,y,-13.63,1.0);
      screens.push({p,i:r*4+j});
      box(x-.42,y+.12,-13.61,.34,.035,.012,c.warm,{hard:true,mode:1,glow:.08,tag:'监控中心'});
      box(x+.35,y+.13,-13.605,.40,.025,.012,c.white,{hard:true,mode:1,tag:'监控中心'});
      box(x+.35,y-.02,-13.605,.40,.025,.012,c.steelD,{hard:true,mode:1,tag:'监控中心'});
      for(const sx of [-1,1])for(const sy of [-1,1]) cyl(x+sx*.67,y+sy*.29,-13.59,.018,.012,c.steelL,
        {rx:Math.PI/2,gloss:.55,tag:'监控中心'});
    }
    table(A,c,9.8,-9.35,4.8,1.10,'保安部',c.steelL);
    for(const x of [8.15,9.75,11.35]){
      box(x,1.17,-9.35,.82,.42,.14,c.ink,{hard:true,gloss:.38,tag:'保安部'});
      box(x,1.18,-9.27,.70,.30,.018,c.blue,{hard:true,mode:1,glow:.05,tag:'保安部'});
      box(x,.93,-9.35,.075,.28,.075,c.steelD,{hard:true,gloss:.46,tag:'保安部'});
      box(x,.80,-9.35,.52,.055,.28,c.steelD,{hard:true,gloss:.46,tag:'保安部'});
      box(x,.84,-8.88,.74,.045,.28,c.black,{hard:true,gloss:.24,tag:'保安部'});
      for(let k=0;k<6;k++) box(x-.28+k*.11,.87,-8.86,.055,.018,.025,c.steelL,
        {hard:true,mode:1,tag:'保安部'});
      chair(A,c,x,-8.30,0,'保安椅',c.green);
    }
    // A ventilated cable tray, labelled looms and a low task strip make the desk read as a wired
    // command station.  These additions are tucked inside the existing desk footprint.
    box(9.75,.56,-9.58,4.10,.12,.24,c.steelD,
      {hard:false,gloss:.42,tag:'保安部'});
    for(let i=0;i<11;i++) box(8.02+i*.35,.565,-9.44,.22,.025,.035,
      i%3===0?c.yellow:(i%3===1?c.teal:c.black),
      {hard:false,mode:1,gloss:.20,tag:'保安部'});
    luminous(box(9.75,.70,-8.78,4.25,.035,.025,c.greenL,
      {hard:false,mode:1,tag:'保安部'}),.045,.12);
    for(const x of [8.15,9.75,11.35]){
      capsule(x,.98,-8.77,.018,.32,.018,c.black,{rx:-.38,tag:'保安部'});
      ball(x-.055,1.13,-8.71,.035,.035,.035,c.steelL,{gloss:.50,tag:'保安部'});
    }
    // Wall clock and shift-status beacon complete the 24-hour operational hierarchy.
    cyl(13.12,2.98,-7.20,.31,.045,c.white,
      {rz:Math.PI/2,gloss:.28,tag:'保安部'});
    cyl(13.075,2.98,-7.20,.255,.020,c.ink,
      {rz:Math.PI/2,mode:1,gloss:.18,tag:'保安部'});
    capsule(13.045,3.02,-7.20,.014,.25,.014,c.white,
      {rz:Math.PI/2,ry:.20,tag:'保安部'});
    capsule(13.038,2.92,-7.20,.012,.18,.012,c.red,
      {rz:Math.PI/2,ry:-.72,tag:'保安部'});
    luminous(ball(13.04,2.52,-7.20,.095,.095,.095,c.greenL,
      {mode:1,tag:'保安部'}),.07,.20);
    blocker(6.40,13.60,-13.90,-13.48,3.62);
    // Radio charging bank and incident tablet sit on the desk in visible docks.
    for(let i=0;i<4;i++){
      box(7.20+i*.28,.92,-8.83,.19,.24,.12,c.steelD,{hard:true,gloss:.40,tag:'保安部'});
      capsule(7.20+i*.28,1.22,-8.83,.018,.42,.018,c.black,{tag:'保安部'});
      box(7.20+i*.28,.81,-8.83,.25,.06,.20,c.black,{hard:true,tag:'保安部'});
    }
    box(12.15,.86,-8.88,.92,.06,.58,c.ink,{hard:true,gloss:.42,tag:'保安部'});
    box(12.15,.90,-8.88,.74,.018,.40,c.green,{hard:true,mode:1,glow:.035,tag:'保安部'});
    // Two ceiling cameras have canopies, stems, articulated yokes and lenses.
    for(const [x,z,ry] of [[6.75,-12.8,.35],[12.9,-6.5,-2.45]]){
      box(x,4.03,z,.62,.08,.62,c.steelD,{hard:true,gloss:.42,tag:'监控摄像头'});
      capsule(x,3.82,z,.035,.42,.035,c.steelD,{tag:'监控摄像头'});
      capsule(x,3.62,z,.055,.62,.055,c.steel,{rz:Math.PI/2,ry,tag:'监控摄像头'});
      box(x+Math.sin(ry)*.28,3.56,z+Math.cos(ry)*.28,.58,.25,.28,c.steelL,
        {hard:true,ry,gloss:.38,tag:'监控摄像头'});
      cyl(x+Math.sin(ry)*.56,3.56,z+Math.cos(ry)*.56,.09,.05,c.glassD,
        {rz:Math.PI/2,ry,gloss:.76,tag:'监控摄像头'});
    }
    box(13.30,1.55,-9.45,.18,2.80,3.75,c.paintD,{hard:true,tag:'消防'});
    for(let i=0;i<4;i++) box(13.15,.72+i*.52,-9.45,.025,.34,2.95,i===0?c.red:(i===1?c.orange:c.white),
      {hard:true,mode:1,tag:'消防'});
    solid(7.32,12.30,-9.92,-8.75);
    fixture(A,'保安部',9.8,-9.35,'保安员查看公共区、装卸区和服务通道的实时画面。',
      'Security watches live views of public rooms, receiving and service routes.',
      '保安部 is security.','security',[9.8,-7.85],2.0);
    fixture(A,'监控中心',10.0,-13.45,'监控墙分区显示酒店公共空间和后勤入口。',
      'The CCTV wall groups hotel public spaces and back-of-house entrances.',
      '监控中心 means security monitoring centre.','security',[10.0,-11.85],2.0);

    // Overhead workplace identity: painted ducts on real Unistrut hangers, protected lights and
    // numbered collars.  Every run is visibly fixed back to the structural ceiling.
    for(const x of [-15,-8,-1,6,13]){
      capsule(x,3.66,0,.13,26.0,.13,x%2?c.steelD:c.steel,{rx:Math.PI/2,gloss:.36,tag:'工程管线'});
      for(const [zi,z] of [-12,-8,-4,0,4,8,12].entries()){
        cyl(x,3.66,z,.21,.07,zi%2?c.steelD:c.yellow,{rx:Math.PI/2,gloss:.42,tag:'工程管线'});
        capsule(x,3.88,z,.035,.42,.035,c.steelD,{tag:'工程管线'});
        box(x,4.075,z,.76,.065,.18,c.steelD,{hard:true,gloss:.38,tag:'工程管线'});
      }
    }
    for(const x of [-13,-7,-1,5,11])for(const z of [-8,0,8]){
      luminous(box(x,3.82,z,2.5,.09,.24,c.white,{hard:true,mode:1,tag:'工作照明'}),.055,.12);
      box(x,4.045,z,2.72,.08,.34,c.steelD,{hard:true,gloss:.36,tag:'工作照明'});
      for(const s of [-1,1]) capsule(x+s*1.12,3.94,z,.028,.26,.028,c.steelD,{tag:'工作照明'});
      glow(M.trs(x,.025,z,0,3.0,1,2.2),c.warm,.035);
    }
    // Local pools of light separate work departments under the continuous fluorescent grid.
    // Four low-intensity fixtures are enough; the renderer ranks them by camera distance.
    for(const [x,z,rgb,power,range] of [
      [-11.7,-11.3,[.94,.82,.58],.19,4.8],
      [-5.6,.0,[.70,.90,.88],.18,5.3],
      [-13.1,10.0,[.90,.72,.48],.17,5.0],
      [9.8,-9.5,[.62,.82,.86],.18,4.7],
    ]){
      const l=light(x,3.15,z,rgb,power,range);l.on=true;
    }

    // Animated service traffic, belt packs, tumbling laundry, canteen steam, engineering status
    // and CCTV scan cues.  Every moving part is uncoupled from collision and has a tight cull
    // sphere so B1 costs nothing when another level is active.
    const cartParts=[];
    const addCart=p=>{const q=keep(p,p.ob?p.ob.x:12,p.ob?p.ob.y:1,p.ob?p.ob.z:5.1,2.0);cartParts.push({p:q,m:q.m});return q;};
    addCart(box(12.4,.07,5.10,1.42,.14,.96,c.rubber,{hard:true,gloss:.12,tag:'服务车'}));
    addCart(box(12.4,.66,5.10,1.28,1.18,.82,c.paintD,{hard:true,tag:'服务车'}));
    for(const s of [-1,1]){
      addCart(box(12.4+s*.59,.68,5.10,.06,1.00,.72,c.bronzeD,{hard:true,gloss:AGED,tag:'服务车'}));
      addCart(box(12.4+s*.60,.68,4.73,.08,.92,.055,c.steelD,{hard:true,gloss:.42,tag:'服务车'}));
      addCart(box(12.4+s*.60,1.39,5.46,.08,.34,.08,c.bronzeD,{hard:true,gloss:AGED,tag:'服务车'}));
      addCart(box(12.4+s*.60,1.39,4.74,.08,.34,.08,c.bronzeD,{hard:true,gloss:AGED,tag:'服务车'}));
    }
    addCart(box(12.4,.74,4.67,.96,.56,.035,c.green,{hard:true,mode:1,gloss:.26,tag:'服务车'}));
    addCart(box(12.4,.74,4.64,.54,.10,.018,c.white,{hard:true,mode:1,tag:'服务车'}));
    for(const z of [4.73,5.47]) addCart(box(12.4,.72,z,1.05,.045,.035,c.bronzeD,
      {hard:true,gloss:.60,tag:'服务车'}));
    addCart(capsule(12.4,1.58,5.48,.045,1.10,.045,c.bronze,{rz:Math.PI/2,gloss:AGED,tag:'服务车'}));
    addCart(box(12.4,1.56,5.10,1.22,.08,.82,c.steelD,{hard:true,tag:'服务车'}));
    for(const s of [-1,1]) for(const zz of [-.28,.28]) addCart(cyl(12.4+s*.44,.14,5.10+zz,.12,.08,c.rubber,
      {rz:Math.PI/2,tag:'服务车'}));
    const cartTop=[];
    // Every folded towel is part of the cart transform; none remains hovering after the frame
    // rolls away.  Raised bronze rails visibly contain the load.
    for(const p of towelStack(A,c,12.4,1.03,5.10,.88,.58,3,'服务车'))addCart(p);
    for(const z of [4.72,5.48]) addCart(capsule(12.4,1.45,z,.035,1.05,.035,c.bronze,
      {rz:Math.PI/2,gloss:.65,tag:'服务车'}));
    // A small celadon route lamp travels with the animated frame.
    const routeLamp=addCart(box(12.4,1.78,5.10,.18,.12,.18,c.greenL,{hard:true,mode:1,glow:.10,tag:'服务车'}));
    cartTop.push(routeLamp);

    const steam=[];
    for(let i=0;i<7;i++){
      const x=-15.25+(i%3)*.16,z=.25+(i%2)*.20;
      const p=keep(ball(x,1.35+(i%4)*.17,z,.12,.16,.12,c.white,{mode:1,alpha:.13,glow:.012,tag:'今日热菜'}),x,1.5,z,.7);
      steam.push({p,x,z,i});
    }
    onTick((t,body,clock,dt)=>{
      for(const q of drumCloth){
        const a=q.a0+t*q.speed;
        q.p.m=M.trs(q.x,q.y+Math.cos(a)*.19,q.z+Math.sin(a)*.19,0,.24,.20,.22);
      }
      machineLights.forEach(q=>{q.p.glow=.08+.07*(.5+.5*Math.sin(t*1.15+q.i*.9));});
      beltPacks.forEach(q=>{
        const dx=((t*.42+q.i*1.30)%5.15)-q.i*1.30;
        q.p.m=M.mul(M.trans(dx,0,0),q.m);
      });
      // Out-and-back L route: service lift -> housekeeping threshold -> service lift.  The former
      // return rectangle crossed straight through the core directory at (13.55,10.55).
      const u=(t*.14)%1,k=u<.5?u*2:(1-u)*2,d=k*9.30;
      let cx,cz;
      if(d<5.10){cx=14.6-d;cz=5.10;}
      else {cx=9.50;cz=5.10+(d-5.10);}
      for(const q of cartParts)q.p.m=M.mul(M.trans(cx-12.4,0,cz-5.10),q.m);
      screens.forEach(q=>{
        const pulse=.040+.025*(.5+.5*Math.sin(t*.33+q.i*.73));
        q.p.glow=pulse;q.p.alpha=.82+.08*Math.sin(t*.19+q.i);
      });
      engLamps.forEach(q=>{q.p.glow=q.i%5===0?.08+.08*(.5+.5*Math.sin(t*.85+q.i)):.075;});
      steam.forEach(q=>{
        const u=(t*.18+q.i*.137)%1,drift=Math.sin(t*.6+q.i)*.09,s=.16+u*.18;
        q.p.m=M.trs(q.x+drift,1.20+u*1.15,q.z+Math.cos(t*.4+q.i)*.06,0,s,s*1.35,s);
        q.p.alpha=.14*(1-u);
      });
      A.state.service={floor:'B1',laundryDrums:10,conveyorPacks:beltPacks.length,
        serviceCart:[+cx.toFixed(2),+cz.toFixed(2)],securityScreens:screens.length,
        routeClear:true,staffEntrance:'badge-controlled'};
    });
  });

  // ------------------------------------------------------------------------------------------
  // 4F · spa, treatment, changing, pool, relaxation and fitness
  HotelFit.register('hotel4',A=>{
    const c=palette(A), {box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,onTick,luminous}=A;

    // Arrival axis: dark stone underfoot, celadon wayfinding and a warm view toward water.  Both
    // lift landings and the x=9 service route remain at full walking width.
    flat(10.8,.020,-3.70,7.7,3.25,c.stoneD,{mode:7,gloss:.16,mat:'tile',matScale:.52,matAmt:.22,tag:'康体水疗'});
    flat(7.8,.024,-3.70,6.2,.06,c.bronze,{gloss:AGED,tag:'康体水疗'});
    flat(12.35,.026,5.10,7.2,.70,c.jade,{mode:7,gloss:.14,tag:'服务通道'});
    flat(9.0,.027,7.75,.70,6.0,c.jade,{mode:7,gloss:.14,tag:'服务通道'});
    // Identity is applied directly to the shared lift-bank wall and bronze head rail. It cannot
    // float into the landing or hide a car from an approaching guest.
    glyphs(17.82,3.72,-3.70,-Math.PI/2,'四楼 · 康体水疗',{size:.16,gap:.04,color:c.bronzeL,
      mode:1,lift:.008,glow:.045,tag:'康体水疗'});
    glyphs(17.81,3.45,-3.70,-Math.PI/2,'LEVEL 4 · SPA & WELLNESS',{size:.058,gap:.012,color:c.white,
      mode:1,lift:.007,tag:'康体水疗'});
    // The shared core directory's ten stop chips outgrew its original panel.  A 4F-specific,
    // floor-supported overlay now encloses every stop within one divided board and uses the lower
    // half for a real service-route legend.  Nothing projects past the walnut frame as UI-like
    // labels, and the physical jade L-route on the floor still lands directly at the service door.
    for(const z of [7.08,14.02]){
      box(13.16,1.58,z,.16,3.16,.16,c.bronzeD,{hard:true,gloss:AGED,tag:'楼层索引'});
      box(13.16,.06,z,.66,.12,.54,c.stoneD,{...MAT.stone,hard:true,gloss:.12,tag:'楼层索引'});
    }
    box(13.16,3.10,10.55,.16,.14,7.10,c.bronzeD,{hard:true,gloss:AGED,tag:'楼层索引'});
    box(13.16,1.60,10.55,.22,2.98,7.20,c.walnut,{hard:true,gloss:.31,tag:'楼层索引'});
    box(13.035,1.60,10.55,.035,2.68,6.88,c.warm,{hard:true,mode:1,gloss:.16,tag:'楼层索引'});
    // Applied header and floor-stop cells: ten cells share one measured row inside the frame.
    box(13.005,2.69,10.55,.025,.36,6.64,c.jade,{hard:true,mode:1,glow:.025,tag:'楼层索引'});
    glyphs(12.975,2.70,10.55,-Math.PI/2,'楼层索引 · SERVICE ROUTE',
      {size:.105,gap:.020,color:c.white,mode:1,lift:.006,tag:'楼层索引'});
    const hotelStops=['B1','1','2','3','4','5','8','10','11','12'];
    hotelStops.forEach((label,i)=>{
      const z=7.48+i*.682,on=label==='4';
      box(13.000,2.16,z,.028,.39,.58,on?c.teal:c.stoneL,{hard:true,mode:1,gloss:.14,tag:'楼层索引'});
      // Each stop is bounded by its own bronze divider on the backing panel.
      for(const s of [-1,1]) box(12.982,2.16,z+s*.302,.018,.43,.025,c.bronzeD,
        {hard:true,mode:1,gloss:AGED,tag:'楼层索引'});
      glyphs(12.962,2.17,z,-Math.PI/2,label,
        {size:.092,color:on?c.white:c.ink,mode:1,lift:.006,tag:'楼层索引'});
    });
    box(12.998,1.87,10.55,.028,.045,6.58,c.bronzeD,{hard:true,mode:1,gloss:AGED,tag:'楼层索引'});
    // Diagram and legend are panel-applied layers: service lift -> reception -> changing -> pool
    // -> fitness.  Nodes, route and captions all remain inside the same divided backing panel.
    glyphs(12.968,1.61,10.55,-Math.PI/2,'服务梯 · 水疗接待 · 更衣 · 泳池 · 健身',
      {size:.073,gap:.014,color:c.ink,mode:1,lift:.006,tag:'服务通道'});
    box(12.992,1.14,10.55,.028,.075,5.64,c.teal,{hard:true,mode:1,glow:.030,tag:'服务通道'});
    const routeStops=[['服务梯',8.15],['接待',9.35],['更衣',10.55],['泳池',11.75],['健身',12.95]];
    routeStops.forEach(([label,z],i)=>{
      box(12.972,1.14,z,.032,.22,.22,i===0?c.bronzeL:c.teal,{hard:true,mode:1,glow:.035,tag:'服务通道'});
      glyphs(12.952,.78,z,-Math.PI/2,label,
        {size:.070,gap:.010,color:c.ink,mode:1,lift:.006,tag:'服务通道'});
    });
    box(12.995,.46,10.55,.028,.28,6.58,c.stoneL,{hard:true,mode:1,tag:'楼层索引'});
    glyphs(12.962,.47,10.55,-Math.PI/2,'四楼 · 康体水疗',
      {size:.088,gap:.018,color:c.teal,mode:1,lift:.006,tag:'楼层索引'});
    // Three floor-inlaid brass/celadon arrows provide direction without freestanding plaques.
    for(const [z,label] of [[-5.05,'水疗'],[-3.70,'泳池'],[-2.35,'健身']]){
      flat(11.35,.031,z,1.25,.34,z===-3.7?c.bronze:c.celadon,{mode:7,gloss:.34,tag:'康体水疗'});
      flat(10.58,.032,z,.42,.08,c.bronzeL,{gloss:POLISH,tag:'康体水疗'});
      flat(10.38,.033,z-.11,.22,.08,c.bronzeL,{ry:-.62,gloss:POLISH,tag:'康体水疗'});
      flat(10.38,.033,z+.11,.22,.08,c.bronzeL,{ry:.62,gloss:POLISH,tag:'康体水疗'});
    }

    // Spa reception: curved limestone desk, lacquer/celadon identity wall, tea ritual, product
    // shelving and a planted threshold.  The stair at far west remains in a separate clear bay.
    flat(-10.2,.022,-9.55,10.7,8.1,c.stone,{mode:7,gloss:.17,mat:'tile',matScale:.55,matAmt:.20,tag:'水疗接待'});
    zSign(A,c,-10.1,2.45,-13.72,7.4,2.25,'水疗接待','SPA RECEPTION',c.jade,'水疗接待',Math.PI);
    for(let i=0;i<9;i++){
      const x=-13.0+i*.72, y=.70+Math.sin(i/8*Math.PI)*.16;
      box(x,y,-9.15,.80,1.02,.76,i%3===0?c.stoneL:c.walnutL,{ry:(i-4)*.025,gloss:.24,tag:'水疗接待'});
      box(x,1.24,-9.40,.76,.10,.18,c.bronze,{hard:true,gloss:AGED,tag:'水疗接待'});
    }
    box(-10.12,.12,-9.15,7.08,.24,.92,c.stoneD,{...MAT.stone,hard:true,gloss:.18,tag:'水疗接待'});
    box(-10.12,1.30,-9.15,7.16,.13,.98,c.stoneL,{...MAT.stone,gloss:.24,tag:'水疗接待'});
    box(-10.12,.46,-8.71,6.88,.12,.055,c.bronzeD,{hard:true,gloss:AGED,tag:'水疗接待'});
    for(let i=0;i<8;i++) box(-12.64+i*.72,.74,-8.70,.045,.78,.06,c.bronzeD,
      {hard:true,gloss:AGED,tag:'水疗接待'});
    // A recessed toe glow and continuous brass rail visually unify the curved desk segments.
    // Both remain inside the established desk footprint.
    luminous(box(-10.12,.22,-8.66,6.56,.035,.025,c.celadonL,
      {hard:false,mode:1,tag:'水疗接待'}),.035,.10);
    capsule(-10.12,.60,-8.69,.035,6.10,.035,c.bronze,
      {rz:Math.PI/2,gloss:AGED,tag:'水疗接待'});
    // Embedded arrival tablet, brass bell and room-card tray are supported by the stone worktop.
    box(-10.10,1.52,-9.10,1.06,.48,.10,c.ink,{hard:true,ry:-.08,gloss:.42,tag:'水疗接待'});
    box(-10.10,1.52,-9.04,.88,.34,.018,c.teal,{hard:true,ry:-.08,mode:1,glow:.045,tag:'水疗接待'});
    cyl(-8.75,1.43,-9.03,.13,.10,c.bronzeL,{gloss:POLISH,tag:'水疗接待'});
    ball(-8.75,1.54,-9.03,.14,.11,.14,c.bronzeL,{gloss:POLISH,tag:'水疗接待'});
    box(-11.50,1.40,-9.02,.78,.06,.42,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'水疗接待'});
    // Ceramic product trio and a linen-lined key bowl soften the technology on the counter.
    for(const [i,x] of [-12.28,-12.02,-11.76].entries()){
      taper(x,1.49,-9.00,.080,Math.max(.20,.30-i*.035),.070,
        i===1?c.celadon:c.linenB,{gloss:.26,tag:'水疗接待'});
      cyl(x,1.66-i*.018,-9.00,.045,.035,c.bronzeL,{gloss:POLISH,tag:'水疗接待'});
    }
    cyl(-8.08,1.43,-9.00,.22,.055,c.celadonL,{gloss:.30,tag:'水疗接待'});
    ball(-8.08,1.45,-9.00,.16,.035,.16,c.linen,{...MAT.cloth,mode:7,gloss:.02,tag:'水疗接待'});
    solid(-13.45,-6.50,-9.82,-8.55);
    glyphs(-10.1,1.53,-8.49,0,'静 · 水 · 心',{size:.20,gap:.10,color:c.bronzeL,mode:1,lift:.008,tag:'水疗接待'});
    // Product wall and aroma niches.
    box(-15.55,1.58,-11.15,.16,2.76,4.1,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.32,tag:'芳香护理'});
    for(let r=0;r<3;r++)for(let j=0;j<3;j++){
      const z=-12.4+j*1.18,y=.78+r*.76;
      box(-15.43,y,z,.025,.58,.88,c.stoneD,{hard:true,mode:1,glow:.020,tag:'芳香护理'});
      taper(-15.35,y-.12,z,.11,.27,.11,j%2?c.celadon:c.lacquer,{gloss:.26,tag:'芳香护理'});
      cyl(-15.34,y+.12,z,.08,.10,c.bronzeL,{gloss:POLISH,tag:'芳香护理'});
    }
    planter(A,c,-5.85,-11.65,.66,'静心庭');
    planter(A,c,-5.85,-7.15,.66,'静心庭');
    table(A,c,-7.15,-11.75,1.55,.72,'迎宾茶台',c.walnutL);
    taper(-7.15,.91,-11.75,.22,.30,.22,c.celadon,{gloss:.26,tag:'迎宾茶台'});
    for(const s of [-1,1]) cyl(-7.55,.87,-11.75+s*.16,.095,.11,c.celadonL,{gloss:.22,tag:'迎宾茶台'});
    fixture(A,'水疗接待',-10.1,-9.2,'接待员安排理疗、泳池和健身预约。',
      'Reception coordinates treatment, pool and fitness reservations.',
      '水疗 is spa or hydrotherapy.','spa',[-10.1,-7.75],2.1);
    fixture(A,'迎宾茶台',-7.15,-11.75,'客人抵达时会先喝一小杯温热的养生茶。',
      'Guests begin with a small cup of warm wellness tea.',
      '迎宾茶 is welcome tea.','spa',[-7.15,-10.70],1.8);

    // Treatment gallery at the west edge.  Two rooms remain visibly distinct through their open
    // bronze portals: one warm celadon massage room and one darker stone hydrotherapy room.
    portalX(A,c,-10.65,-2.8,3.4,'理疗室','TREATMENT',c.jade,'理疗室',-Math.PI/2);
    for(const z of [-3.0,2.15]){
      flat(-14.2,.026,z,6.0,4.45,z<0?c.stoneL:c.stoneD,{mode:7,gloss:.14,tag:'理疗室'});
      // Deliberately upholstered treatment table: open four-leg frame, shoes, perimeter rails and
      // a low bronze stretcher make the support structure visible from the room entrance.  Three
      // soft layers and a shallow ellipsoid cap replace the former raw mattress cuboid.
      for(const sx of [-1,1])for(const sz of [-1,1]){
        taper(-14.2+sx*.78,.34,z+sz*.36,.080,.60,.065,c.walnut,
          {gloss:.32,tag:'理疗床'});
        cyl(-14.2+sx*.78,.040,z+sz*.36,.115,.040,c.bronzeD,
          {gloss:AGED,tag:'理疗床'});
      }
      for(const sz of [-1,1]) box(-14.2,.40,z+sz*.36,1.58,.11,.085,c.walnut,
        {...MAT.timber, hard:true,mode:6,gloss:.31,tag:'理疗床'});
      for(const sx of [-1,1]) box(-14.2+sx*.78,.40,z,.085,.11,.64,c.walnut,
        {...MAT.timber, hard:true,mode:6,gloss:.31,tag:'理疗床'});
      capsule(-14.2,.25,z,.035,1.40,.035,c.bronzeD,
        {rz:Math.PI/2,gloss:AGED,tag:'理疗床'});
      box(-14.2,.64,z,2.18,.12,1.02,c.walnutL,
        {...MAT.timber, hard:true,mode:6,gloss:.28,round:.025,tag:'理疗床'});
      box(-14.2,.76,z,2.12,.14,.98,c.silk,
        {...MAT.cloth, mode:7,gloss:.035,round:.060,tag:'理疗床'});
      box(-14.2,.87,z,2.06,.14,.94,c.towel,
        {...MAT.cloth, mode:7,gloss:.022,round:.085,tag:'理疗床'});
      ball(-14.2,.945,z,1.00,.080,.435,c.towel,
        {...MAT.cloth, mode:7,gloss:.018,tag:'理疗床'});
      // Padded bolster, U-shaped face cradle and table-top folded linen are all carried by the
      // cushion/frame below rather than hovering alongside it.
      capsule(-13.58,1.075,z,.105,.72,.105,z<0?c.celadon:c.linenB,
        {rx:Math.PI/2,gloss:.025,tag:'理疗床'});
      for(const sz of [-1,1]){
        capsule(-13.03,.80,z+sz*.22,.032,.36,.032,c.bronzeD,
          {rz:Math.PI/2,gloss:AGED,tag:'理疗床'});
        capsule(-12.84,1.01,z+sz*.22,.070,.34,.070,c.towel,
          {rz:Math.PI/2,gloss:.025,tag:'理疗床'});
      }
      capsule(-12.72,1.01,z,.065,.43,.065,c.towel,
        {rx:Math.PI/2,gloss:.025,tag:'理疗床'});
      towelStack(A,c,-14.92,1.00,z+.10,.48,.34,2,'理疗床');

      // Wheeled side trolley replaces the unsupported cone-like oil prop.  Two fixed shelves,
      // four corner posts and casters carry folded towels, capped treatment bottles and a bowl.
      const tx=-15.76,tz=z+.95;
      for(const sx of [-1,1])for(const sz of [-1,1])
        cyl(tx+sx*.25,.085,tz+sz*.19,.075,.060,c.rubber,
          {rz:Math.PI/2,tag:'芳香护理'});
      box(tx,.17,tz,.68,.10,.54,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'芳香护理'});
      for(const sx of [-1,1])for(const sz of [-1,1])
        box(tx+sx*.27,.50,tz+sz*.20,.045,.66,.045,c.bronzeD,
          {hard:true,gloss:AGED,tag:'芳香护理'});
      box(tx,.43,tz,.62,.075,.48,c.stoneL,{...MAT.stone,hard:true,gloss:.18,round:.018,tag:'芳香护理'});
      box(tx,.82,tz,.72,.10,.56,c.walnutL,{...MAT.timber,hard:true,mode:6,gloss:.30,round:.022,tag:'芳香护理'});
      towelStack(A,c,tx,.49,tz,.42,.30,2,'芳香护理');
      for(const sx of [-1,0,1]){
        taper(tx+sx*.16,.98,tz-.05,.065,.22,.060,sx===0?c.celadon:c.water,
          {gloss:.30,tag:'芳香护理'});
        cyl(tx+sx*.16,1.115,tz-.05,.042,.035,c.bronzeL,{gloss:POLISH,tag:'芳香护理'});
      }
      cyl(tx+.19,.915,tz+.15,.105,.045,c.celadonL,{gloss:.36,tag:'芳香护理'});
      for(const sz of [-1,1]) capsule(tx+.34,1.00,tz+sz*.20,.025,.34,.025,c.bronzeD,
        {gloss:AGED,tag:'芳香护理'});
      capsule(tx+.34,1.17,tz,.025,.42,.025,c.bronzeD,
        {rx:Math.PI/2,gloss:AGED,tag:'芳香护理'});
      // Mobile therapist stool sits on the table centreline's south side.  Its low back is on the
      // wall side, so the occupant faces north into the treatment table rather than sideways into
      // circulation.  Star base, column and casters visibly carry both seat and backrest.
      const stoolX=-14.2,stoolZ=z-.96;
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2;
        capsule(stoolX+Math.sin(a)*.16,.105,stoolZ+Math.cos(a)*.16,.022,.34,.022,c.bronzeD,
          {rz:a,gloss:AGED,tag:'理疗凳'});
        cyl(stoolX+Math.sin(a)*.27,.050,stoolZ+Math.cos(a)*.27,.060,.040,c.rubber,
          {rz:a,tag:'理疗凳'});
      }
      capsule(stoolX,.34,stoolZ,.045,.50,.045,c.bronzeD,{gloss:AGED,tag:'理疗凳'});
      cyl(stoolX,.56,stoolZ,.30,.12,z<0?c.celadon:c.linenB,
        {gloss:.035,round:.070,tag:'理疗凳'});
      box(stoolX,.75,stoolZ-.24,.055,.38,.055,c.bronzeD,
        {hard:true,gloss:AGED,tag:'理疗凳'});
      box(stoolX,.88,stoolZ-.29,.50,.34,.12,z<0?c.celadon:c.linenB,
        {...MAT.cloth, mode:7,gloss:.030,round:.075,tag:'理疗凳'});
      for(const s of [-1,1]){
        box(-11.72,1.70,z+s*1.58,.12,3.0,.76,c.walnut,{...MAT.timber,hard:true,mode:6,tag:'理疗室'});
        for(let i=0;i<4;i++) box(-11.64,.62+i*.62,z+s*1.58,.025,.42,.50,i%2?c.celadon:c.silk,
          {hard:true,mode:1,alpha:.84,tag:'理疗室'});
      }
      solid(-15.32,-13.08,z-.55,z+.55);
      solid(tx-.38,tx+.38,tz-.30,tz+.30);
      solid(stoolX-.32,stoolX+.32,stoolZ-.36,stoolZ+.34);
    }
    // Ink-wash panels are restrained room focal points, not wallpaper.
    for(const [z,accent] of [[-3.0,c.celadon],[2.15,c.water]]){
      box(-16.95,2.18,z,.12,2.25,2.95,c.walnut,{hard:true,tag:'理疗室'});
      box(-16.87,2.18,z,.025,2.05,2.70,c.linen,{hard:true,mode:1,tag:'理疗室'});
      for(let i=0;i<6;i++) capsule(-16.82,1.48+i*.18,z-1.0+i*.38,.028,.48+i*.11,.028,c.ink,
        {rz:(i%2?-.45:.38),tag:'理疗室'});
      ball(-16.80,1.52,z+1.0,.10,.10,.025,accent,{mode:1,tag:'理疗室'});
    }
    fixture(A,'理疗室',-14.2,-3.0,'安静的理疗室配有加热床、芳香护理和独立洗手台。',
      'Quiet treatment rooms have heated beds, aroma care and private wash stations.',
      '理疗 means therapeutic treatment.','spa',[-12.35,-3.0],2.0);

    // Changing suite east of the arrival axis.  Two accessible, clearly labelled entries lead to
    // lockers, vanity, showers and towel return; none intrudes into the passenger landing.
    flat(6.2,.022,-9.35,8.8,7.8,c.stoneL,{mode:7,gloss:.16,mat:'tile',matScale:.42,matAmt:.24,tag:'更衣室'});
    portalZ(A,c,4.15,-5.62,3.0,'女更衣','WOMEN',c.lacquer,'更衣室',Math.PI);
    portalZ(A,c,8.25,-5.62,3.0,'男更衣','MEN',c.jade,'更衣室',Math.PI);
    for(const side of [-1,1]){
      const x=6.2+side*2.05;
      for(let i=0;i<3;i++){
        const z=-8.1-i*1.34;
        box(x,.08,z,1.68,.16,1.26,c.stoneD,{...MAT.stone,hard:true,gloss:.12,tag:'储物柜'});
        box(x,1.48,z,1.55,2.78,1.16,side<0?c.lacquerD:c.jade,{hard:true,gloss:.22,tag:'储物柜'});
        for(let r=0;r<2;r++){
          box(x-side*.79,.82+r*1.26,z,.035,1.05,1.02,c.stoneD,{hard:true,mode:1,tag:'储物柜'});
          const fx=x-side*.825,fy=.82+r*1.26;
          for(const sz of [-1,1]) box(fx,fy,z+sz*.49,.055,1.03,.055,c.bronzeD,
            {hard:true,gloss:AGED,tag:'储物柜'});
          box(fx,fy+.49,z,.055,.055,.98,c.bronzeD,{hard:true,gloss:AGED,tag:'储物柜'});
          box(fx,fy-.49,z,.055,.055,.98,c.bronzeD,{hard:true,gloss:AGED,tag:'储物柜'});
          for(let v=0;v<4;v++) box(fx-side*.025,fy+.28,z-.28+v*.18,.018,.025,.11,c.celadonL,
            {hard:true,mode:1,tag:'储物柜'});
          cyl(fx-side*.035,fy,z+.31,.045,.022,c.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'储物柜'});
          // Card slot, live lock lamp and tiny enamel number plaque make every locker operable.
          box(fx-side*.040,fy-.25,z-.31,.018,.10,.18,c.stoneD,
            {hard:false,mode:1,gloss:.20,tag:'储物柜'});
          luminous(box(fx-side*.052,fy-.25,z-.26,.012,.035,.045,
            (i+r)%3?c.greenL:c.bronzeL,{hard:false,mode:1,tag:'储物柜'}),.035,.10);
          box(fx-side*.045,fy+.28,z+.31,.015,.16,.24,c.warm,
            {hard:false,mode:1,gloss:.16,tag:'储物柜'});
          glyphs(x-side*.82,.84+r*1.26,z,side<0?Math.PI/2:-Math.PI/2,String((side<0?4:7)*10+i*2+r+1),
            {size:.09,color:c.bronzeL,mode:1,lift:.006,tag:'储物柜'});
        }
        // The corridor side is finished in framed walnut/celadon rather than a blank cabinet back.
        box(x+side*.79,1.48,z,.035,2.55,1.02,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.31,tag:'储物柜'});
        for(const y of [.72,1.48,2.24]) box(x+side*.82,y,z,.025,.055,.92,c.bronzeD,
          {hard:true,gloss:AGED,tag:'储物柜'});
        solid(x-.82,x+.82,z-.60,z+.60);
      }
    }
    // Centre bench stays on the same measured axis, preserving equal locker-front aisles.  A dark
    // floor plinth, inset pedestal and under-seat rail make its load path unmistakable; two soft
    // rounded layers and perimeter piping turn the former white slab into tailored upholstery.
    box(6.2,.06,-9.35,.50,.12,2.78,c.stoneD,{...MAT.stone,hard:true,gloss:.12,tag:'更衣长凳'});
    box(6.2,.17,-9.35,.40,.18,2.58,c.bronzeD,{hard:true,gloss:AGED,tag:'更衣长凳'});
    box(6.2,.31,-9.35,.34,.28,2.42,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'更衣长凳'});
    box(6.2,.43,-9.35,.58,.12,2.94,c.bronzeD,{hard:true,gloss:AGED,tag:'更衣长凳'});
    box(6.2,.53,-9.35,.70,.16,3.20,c.silk,
      {...MAT.cloth, mode:7,gloss:.032,round:.070,tag:'更衣长凳'});
    box(6.2,.625,-9.35,.64,.07,3.08,c.towel,
      {...MAT.cloth, mode:7,gloss:.020,round:.085,tag:'更衣长凳'});
    for(const sx of [-1,1]) box(6.2+sx*.315,.625,-9.35,.025,.035,2.94,c.celadon,
      {hard:true,mode:1,gloss:.16,tag:'更衣长凳'});
    for(const sz of [-1,1]) box(6.2,.625,-9.35+sz*1.505,.58,.035,.025,c.celadon,
      {hard:true,mode:1,gloss:.16,tag:'更衣长凳'});
    // Folded robe, woven sash and paired slippers add the small human traces a premium changing
    // room needs. They sit on or beside the existing bench and never affect its collision.
    ball(6.2,.705,-10.28,.27,.070,.40,c.linen,
      {...MAT.cloth, mode:7,gloss:.018,tag:'更衣长凳'});
    capsule(6.2,.755,-10.28,.020,.54,.020,c.celadon,
      {rz:Math.PI/2,gloss:.12,tag:'更衣长凳'});
    for(const sx of [-1,1]) ball(6.2+sx*.23,.075,-11.25,.16,.055,.31,c.stoneL,
      {mode:7,gloss:.045,tag:'更衣长凳'});
    shade(6.2,-9.35,.84,3.36,.22);

    // The changing-axis termination is intentional rather than a dead blank wall: a framed mirror
    // is mechanically tied to the wall over a plinth-supported towel-return cabinet and hook rail.
    box(6.2,1.92,-13.56,3.55,1.78,.14,c.walnut,{...MAT.timber,hard:true,mode:6,gloss:.31,tag:'更衣室'});
    box(6.2,1.92,-13.475,3.24,1.48,.030,c.glass,
      {hard:true,mode:1,alpha:.42,gloss:.88,tag:'更衣室'});
    for(const x of [4.78,5.32,7.08,7.62]){
      box(x,.99,-13.46,.055,.30,.055,c.bronzeD,{hard:true,gloss:AGED,tag:'更衣室'});
      ball(x,.83,-13.40,.075,.075,.065,c.bronzeL,{gloss:POLISH,tag:'更衣室'});
    }
    box(6.2,.055,-13.20,1.64,.11,.62,c.stoneD,{...MAT.stone,hard:true,gloss:.12,tag:'毛巾回收'});
    box(6.2,.48,-13.20,1.48,.76,.56,c.walnutL,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'毛巾回收'});
    box(6.2,.90,-13.20,1.54,.08,.62,c.bronzeD,{hard:true,gloss:AGED,tag:'毛巾回收'});
    box(6.2,.58,-12.905,1.02,.20,.025,c.ink,{hard:true,mode:1,tag:'毛巾回收'});
    glyphs(6.2,.30,-12.88,0,'毛巾回收',{size:.095,gap:.020,color:c.bronzeL,mode:1,lift:.006,tag:'毛巾回收'});
    box(10.25,1.45,-10.35,.15,2.55,4.4,c.glassD,{hard:true,mode:1,alpha:.68,gloss:.86,tag:'更衣室'});
    for(const z of [-8.75,-10.35,-11.95]){
      box(2.40,1.55,z,.12,2.75,1.25,c.glass,{hard:true,mode:1,alpha:.25,gloss:.75,tag:'淋浴'});
      box(2.40,.08,z,.20,.16,1.34,c.bronzeD,{hard:true,gloss:AGED,tag:'淋浴'});
      box(2.40,2.96,z,.20,.10,1.34,c.bronzeD,{hard:true,gloss:AGED,tag:'淋浴'});
      for(const s of [-1,1]) capsule(2.40,1.55,z+s*.60,.035,2.75,.035,c.bronzeD,{tag:'淋浴'});
      cyl(2.52,2.55,z,.14,.035,c.bronze,{rz:Math.PI/2,gloss:AGED,tag:'淋浴'});
      towelStack(A,c,3.15,.55,z,.74,.42,3,'毛巾');
    }
    fixture(A,'更衣室',6.2,-7.0,'更衣区设有编号储物柜、淋浴、梳妆台和毛巾回收。',
      'Changing includes numbered lockers, showers, vanity and towel return.',
      '更衣室 is the changing room.','spa',[6.2,-6.55],2.0);
    fixture(A,'储物柜',4.15,-8.1,'储物柜用房卡开启，贵重物品请随身保管。',
      'Lockers open with the room key; keep valuables with you.',
      '储物柜 means locker.','spa',[5.25,-8.10],1.9);

    // The core's water plane is retained as the deep body of the pool.  Dark-stone coping, a
    // shallow shelf, lane targets, underwater lamps, ladders and a full deck make it believable.
    flat(-2.0,.018,5.0,18.2,8.8,c.stoneD,{mode:7,gloss:.18,mat:'tile',matScale:.46,matAmt:.22,tag:'泳池'});
    flat(-2.0,.047,5.0,15.05,6.05,c.water,{mode:1,alpha:.73,gloss:.89,tag:'泳池'});
    // Keep water above the deck base, then restore the stone perimeter as four coping runs.
    box(-10.10,.12,5.0,.42,.22,7.05,c.stoneL,{...MAT.stone,gloss:.24,tag:'泳池'});
    box(6.10,.12,5.0,.42,.22,7.05,c.stoneL,{...MAT.stone,gloss:.24,tag:'泳池'});
    box(-2.0,.12,1.55,16.62,.22,.42,c.stoneL,{...MAT.stone,gloss:.24,tag:'泳池'});
    box(-2.0,.12,8.45,16.62,.22,.42,c.stoneL,{...MAT.stone,gloss:.24,tag:'泳池'});
    // Hand-set celadon/bronze mosaic on the coping gives the pool a crafted edge.  These are
    // surface inlays only; the single established pool collider remains authoritative.
    for(let i=0;i<24;i++){
      const x=-9.65+i*.665,accent=i%4===0?c.bronze:(i%2?c.celadonL:c.jade);
      flat(x,.236,1.545,.46,.075,accent,{hard:false,mode:7,gloss:.36,tag:'泳池'});
      flat(x,.236,8.455,.46,.075,accent,{hard:false,mode:7,gloss:.36,tag:'泳池'});
    }
    for(let i=0;i<9;i++){
      const z=2.05+i*.74,accent=i%3===0?c.bronzeL:(i%2?c.celadon:c.jade);
      flat(-10.105,.236,z,.075,.46,accent,{hard:false,mode:7,gloss:.34,tag:'泳池'});
      flat(6.105,.236,z,.075,.46,accent,{hard:false,mode:7,gloss:.34,tag:'泳池'});
    }
    // A slim jade reveal on the water-facing edge keeps the pale coping from becoming a blank
    // slab at low camera angles; it is applied to the existing face and has no footprint.
    box(-2.0,.155,1.325,16.18,.055,.025,c.jade,
      {hard:false,mode:1,gloss:.30,tag:'泳池'});
    box(-2.0,.155,8.675,16.18,.055,.025,c.jade,
      {hard:false,mode:1,gloss:.30,tag:'泳池'});
    // Shallow entry shelf at the east end.
    for(let i=0;i<4;i++) box(4.65-i*.42,.14+i*.075,5.0,.42,.15,5.55,c.stoneL,
      {...MAT.stone, hard:true,gloss:.22,tag:'浅水'});
    glyphs(5.72,.24,3.0,-Math.PI/2,'浅水',{size:.11,color:c.white,mode:1,lift:.006,tag:'泳池'});
    glyphs(-9.72,.24,3.0,Math.PI/2,'深水',{size:.11,color:c.white,mode:1,lift:.006,tag:'泳池'});
    for(const z of [2.65,7.35]){
      for(const x of [-9.15,5.15]){
        capsule(x,.62,z,.045,1.15,.045,c.bronze,{gloss:AGED,tag:'泳池'});
        capsule(x+.38,.62,z,.045,1.15,.045,c.bronze,{gloss:AGED,tag:'泳池'});
        capsule(x+.19,1.16,z,.045,.45,.045,c.bronze,{rz:Math.PI/2,gloss:AGED,tag:'泳池'});
      }
    }
    for(const x of [-7.2,-4.6,-2.0,.6,3.2]){
      // Filled rounded LED tiles replace the old shallow cylinders whose shaded rims read as
      // black ovals through the water at a low camera angle.
      luminous(ball(x,.075,7.95,.080,.018,.080,c.white,
        {mode:1,gloss:.70,tag:'泳池'}),.18,.30);
      luminous(ball(x,.075,2.05,.080,.018,.080,c.white,
        {mode:1,gloss:.70,tag:'泳池'}),.18,.30);
    }
    // Two restrained lane ropes float just above the water.  A fine bronze core keeps the beads
    // visually connected while alternating celadon floats echo the spa palette instead of sports
    // centre primary colours.
    for(const z of [3.78,6.22]){
      capsule(-2.0,.105,z,.032,13.90,.032,c.celadonL,
        {rz:Math.PI/2,mode:1,glow:.025,gloss:.58,tag:'泳池'});
      for(let i=0;i<26;i++){
        const x=-9.0+i*.56;
        ball(x,.108,z,.062,.052,.062,i%4===0?c.white:(i%2?c.celadonL:c.waterL),
          {mode:1,glow:.018,gloss:.64,tag:'泳池'});
      }
      // Bronze wall rosettes and short tension collars visibly terminate each rope.
      for(const x of [-9.78,5.78]){
        cyl(x,.13,z,.115,.055,c.bronzeL,
          {rz:Math.PI/2,gloss:POLISH,tag:'泳池'});
        cyl(x+(x<0?.10:-.10),.13,z,.070,.12,c.celadon,
          {rz:Math.PI/2,gloss:.45,tag:'泳池'});
        for(let k=0;k<4;k++) ball(x,.13+Math.sin(k*Math.PI/2)*.078,
          z+Math.cos(k*Math.PI/2)*.078,.018,.018,.018,c.steelD,{tag:'泳池'});
      }
    }
    solid(-10.05,6.05,1.58,8.42);

    // The old flattened ripple/caustic primitives shaded as detached dark rings from the low pool
    // camera.  The water shader, lantern glow and continuous lane ropes now carry the reflection
    // hierarchy cleanly; keep these arrays for the animation/state contract but deliberately do
    // not populate them with freestanding marks.
    const ripples=[],caustics=[];
    fixture(A,'泳池',-2.0,5.0,'恒温泳池设有三条泳道、浅水台阶和池畔救生位。',
      'The heated pool has three lanes, shallow steps and a staffed pool deck.',
      '泳池 is swimming pool.','spa',[-8.75,1.10],2.2);

    // Deck life: timber loungers, rolled towels, hydration station, lifeguard position and quiet
    // bronze lantern field.  The north-east service path to x=9,z=10 stays visibly open.
    // Four loungers fit between the staffed lifeguard bay and towel cabinet with a measured gap
    // at both ends.  The former five-seat run intersected both end fixtures by several centimetres
    // and left no believable approach to the towel shelves.
    for(const x of [-6.8,-3.9,-1.0,1.9]){
      // Long axes run north-south, not sideways along the coping: raised backs are on the north
      // end and every lounger faces the pool.  Centring at z=11.10 retains a 1.3 m clear deck lane.
      box(x,.075,11.10,.96,.15,2.42,c.stoneD,{...MAT.stone,hard:true,gloss:.13,tag:'躺椅'});
      box(x,.33,11.10,.78,.18,2.25,c.walnutL,{...MAT.timber,rx:-.015,mode:6,gloss:.24,tag:'躺椅'});
      box(x,.64,11.86,.72,.48,.20,c.silk,{...MAT.cloth,rx:-.10,mode:7,gloss:.03,round:.055,tag:'躺椅'});
      for(const s of [-1,1]){
        box(x,.19,11.10+s*.86,.58,.38,.075,c.bronzeD,{hard:true,gloss:AGED,tag:'躺椅'});
        box(x,.035,11.10+s*.86,.32,.07,.30,c.rubber,{hard:true,tag:'躺椅'});
      }
      for(const sx of [-1,1]) capsule(x+sx*.25,.55,11.74,.045,.72,.045,c.bronzeD,
        {rx:-.52,tag:'躺椅'});
      ball(x,.785,11.77,.29,.105,.24,c.towel,
        {...MAT.cloth, mode:7,gloss:.018,tag:'躺椅'});
      capsule(x,.735,11.48,.022,.58,.022,c.celadon,
        {rz:Math.PI/2,gloss:.14,tag:'躺椅'});
      towelStack(A,c,x,.49,10.36,.65,.45,2,'毛巾');
      shade(x,11.10,.95,2.38,.18);
    }
    // Low round side tables with covered water glasses alternate between lounger pairs.
    for(const x of [-5.35,.45]){
      cyl(x,.37,9.92,.055,.58,c.bronzeD,{gloss:AGED,tag:'躺椅'});
      cyl(x,.67,9.92,.28,.075,c.stoneL,{...MAT.stone,gloss:.22,tag:'躺椅'});
      cyl(x,.82,9.92,.075,.25,c.water,{mode:1,alpha:.66,gloss:.72,tag:'躺椅'});
      cyl(x,.965,9.92,.055,.035,c.bronzeL,{gloss:POLISH,tag:'躺椅'});
      box(x+.18,.77,9.92,.18,.035,.28,c.linen,
        {...MAT.cloth, hard:false,ry:.15,mode:7,gloss:.02,tag:'躺椅'});
    }
    box(6.55,.07,10.80,1.45,.14,2.72,c.stoneD,{...MAT.stone,hard:true,gloss:.14,tag:'毛巾站'});
    box(6.55,.74,10.80,1.25,1.18,2.55,c.walnut,{...MAT.timber,mode:6,gloss:.29,tag:'毛巾站'});
    for(const y of [.45,1.05,1.65]){
      box(5.88,y,10.80,.035,.07,2.15,c.bronze,{hard:true,gloss:AGED,tag:'毛巾站'});
      for(const z of [10.25,10.80,11.35]) towelStack(A,c,5.78,y-.12,z,.58,.38,2,'毛巾');
    }
    // Amenities are grouped on a supported tray: chilled water, paper cups and two capped oils.
    box(6.03,1.40,9.72,.72,.055,.48,c.stoneL,
      {hard:false,mode:7,gloss:.20,tag:'毛巾站'});
    cyl(5.84,1.59,9.72,.075,.34,c.water,
      {mode:1,alpha:.70,gloss:.68,tag:'毛巾站'});
    cyl(5.84,1.78,9.72,.045,.035,c.bronzeL,{gloss:POLISH,tag:'毛巾站'});
    for(const z of [9.58,9.78]) cyl(6.10,1.52,z,.080,.18,c.white,
      {gloss:.18,tag:'毛巾站'});
    for(const z of [9.58,9.80]){
      taper(6.30,1.53,z,.050,.19,.045,c.celadon,{gloss:.28,tag:'毛巾站'});
      cyl(6.30,1.64,z,.032,.025,c.bronzeL,{gloss:POLISH,tag:'毛巾站'});
    }
    zSign(A,c,6.55,2.35,12.12,3.25,.88,'毛巾站','TOWELS',c.jade,'毛巾站');
    // The sign sits over the back of the cabinet, carried by two posts that land on its worktop.
    // It is not a floating panel in the north-deck sightline.
    for(const x of [6.07,7.03]){
      capsule(x,1.62,12.02,.035,.58,.035,c.bronzeD,{gloss:AGED,tag:'毛巾站'});
      box(x,1.34,12.02,.26,.08,.26,c.bronzeL,{hard:true,gloss:POLISH,tag:'毛巾站'});
      box(x,1.91,12.02,.22,.08,.22,c.bronzeL,{hard:true,gloss:POLISH,tag:'毛巾站'});
    }
    box(-9.25,.055,10.75,1.26,.11,1.16,c.stoneD,{...MAT.stone,hard:true,gloss:.14,tag:'救生员'});
    box(-9.25,.85,10.75,1.1,1.55,1.0,c.stoneL,{...MAT.stone,gloss:.20,tag:'救生员'});
    capsule(-9.25,2.05,10.75,.08,1.35,.08,c.bronze,{tag:'救生员'});
    ball(-9.25,2.78,10.75,.44,.44,.12,c.red,{mode:1,tag:'救生员'});
    box(-9.25,2.78,10.62,.10,.58,.025,c.white,{hard:true,mode:1,tag:'救生员'});
    box(-9.25,2.78,10.61,.58,.10,.025,c.white,{hard:true,mode:1,tag:'救生员'});
    glyphs(-9.25,2.78,10.62,0,'救生员',{size:.11,color:c.white,mode:1,lift:.006,tag:'救生员'});
    fixture(A,'毛巾站',6.25,10.8,'毛巾站提供干毛巾、饮水和湿毛巾回收。',
      'The towel station provides dry towels, water and wet-towel return.',
      '毛巾 means towel.','spa',[5.0,10.8],1.9);

    const lanterns=[];
    for(const x of [-8,-4,0,4])for(const z of [3.2,6.8]) lanterns.push(...lantern(A,c,x,3.28,z,.82,'泳池灯笼'));
    for(const x of [-7.8,-2.0,3.8]){
      const l=light(x,3.2,5.0,[.76,.92,.86],.34,5.1);l.on=true;
      glow(M.trs(x,.030,5.0,0,4.5,1,3.2),c.waterL,.045);
    }

    // Relaxation/tea room wraps the west end of the pool behind the existing 水疗 focal screen.
    flat(-14.2,.022,10.85,5.5,5.6,c.walnut,{mode:7,gloss:.08,tag:'放松茶廊'});
    zSign(A,c,-14.2,2.45,13.48,4.9,1.60,'放松茶廊','RELAXATION TEA',c.jade,'放松茶廊');
    // Chair backs sit outside each two-seat conversation group: left chairs face east and right
    // chairs face west, directly toward their tea table and partner.
    const relaxSeats=[[-15.7,10.5,-Math.PI/2],[-12.8,10.5,Math.PI/2],
      [-15.7,12.3,-Math.PI/2],[-12.8,12.3,Math.PI/2]];
    for(const [x,z,ry] of relaxSeats){
      chair(A,c,x,z,ry,'放松椅',c.celadonL);
      // Ellipsoid seat/back cushions and rounded arms soften the timber chair frame without
      // changing its footprint or adding collision.
      const bx=x+Math.sin(ry)*.27,bz=z+Math.cos(ry)*.27;
      ball(x,.54,z,.27,.085,.27,c.silk,{...MAT.cloth,mode:7,gloss:.025,tag:'放松椅'});
      ball(bx,.87,bz,.27,.30,.075,c.celadonL,{mode:7,gloss:.028,tag:'放松椅'});
      for(const s of [-1,1]){
        const ax=x+Math.cos(ry)*s*.30,az=z-Math.sin(ry)*s*.30;
        capsule(ax,.69,az,.045,.42,.045,c.bronzeD,{gloss:AGED,tag:'放松椅'});
        ball(ax,.88,az,.070,.065,.070,c.celadon,{mode:7,gloss:.03,tag:'放松椅'});
      }
    }
    for(const z of [10.5,12.3]){
      table(A,c,-14.25,z,1.15,.62,'茶台',c.walnutL);
      taper(-14.25,.91,z,.17,.25,.17,c.celadon,{gloss:.24,tag:'茶台'});
      for(const s of [-1,1]) cyl(-14.25,.87,z+s*.21,.075,.10,c.celadonL,{gloss:.22,tag:'茶台'});
    }
    planter(A,c,-16.25,13.0,.46,'静心庭');
    fixture(A,'放松茶廊',-14.25,10.5,'理疗或游泳后可以在安静的茶廊慢慢休息。',
      'The quiet tea lounge is for resting after treatment or swimming.',
      '放松 means relax.','spa',[-14.25,9.6],1.9);
    fixture(A,'茶台',-14.25,12.3,'茶台备有温水、花草茶和无糖点心。',
      'The tea table offers warm water, herbal tea and unsweetened snacks.',
      '茶台 is a tea station.','spa',[-14.25,11.4],1.8);

    // Fitness room occupies the south-centre bay with a true mix of equipment: treadmills,
    // bikes, free weights, adjustable benches, cable station, stretching rail and hydration.
    flat(.2,.023,-1.65,11.5,6.4,c.rubber,{mode:7,gloss:.075,tag:'健身房'});
    portalZ(A,c,.2,-4.72,6.4,'健身房','FITNESS',c.teal,'健身房',Math.PI);
    // Mirrors suggested with dark reflective glazing; no expensive fake reflection pass.
    box(-4.75,1.90,-1.55,.12,3.05,5.45,c.glassD,{hard:true,mode:1,alpha:.70,gloss:.88,tag:'健身房'});
    for(const z of [-3.35,-1.55,.25]) box(-4.67,1.90,z,.025,2.75,1.52,c.glass,
      {hard:true,mode:1,alpha:.18,gloss:.91,tag:'健身房'});
    const treadmillMarks=[];
    for(const x of [-2.70,-.65,1.40]){
      box(x,.075,-2.55,1.62,.15,2.55,c.rubber,{hard:true,gloss:.10,tag:'有氧'});
      box(x,.24,-2.55,1.42,.28,2.35,c.steelD,{gloss:.34,tag:'有氧'});
      box(x,.40,-2.55,1.05,.10,1.82,c.rubber,{hard:true,gloss:.10,tag:'有氧'});
      for(let i=0;i<5;i++){
        const z=-3.25+i*.34;
        const p=keep(box(x,.46,z,.78,.018,.045,c.steelL,{hard:true,mode:1,glow:.012,tag:'有氧'}),x,.46,z,.6);
        treadmillMarks.push({p,m:p.m,x,z,i});
      }
      capsule(x-.62,1.12,-3.18,.055,1.45,.055,c.steel,{rz:-.32,tag:'有氧'});
      capsule(x+.62,1.12,-3.18,.055,1.45,.055,c.steel,{rz:.32,tag:'有氧'});
      capsule(x,1.34,-3.18,.045,1.10,.045,c.steel,{rz:Math.PI/2,gloss:.46,tag:'有氧'});
      box(x,1.54,-3.40,.72,.44,.15,c.ink,{hard:true,gloss:.38,tag:'有氧'});
      box(x,1.54,-3.31,.58,.28,.018,c.blue,{hard:true,mode:1,glow:.07,tag:'有氧'});
      // Readable workout telemetry, emergency stop and safety cord replace the generic blue
      // rectangle with a working console face.
      for(let k=0;k<4;k++) box(x-.19+k*.12,1.58,-3.295,.075,.025,.010,
        k===3?c.bronzeL:c.waterL,{hard:false,mode:1,glow:.025,tag:'有氧'});
      luminous(cyl(x+.25,1.43,-3.275,.045,.016,c.red,
        {rx:Math.PI/2,mode:1,tag:'有氧'}),.05,.16);
      capsule(x+.25,1.28,-3.25,.014,.32,.014,c.red,
        {rz:.08,gloss:.22,tag:'有氧'});
      ball(x+.26,1.11,-3.24,.045,.045,.045,c.red,{gloss:.20,tag:'有氧'});
      cyl(x-.42,1.34,-3.17,.085,.065,c.rubber,
        {rx:Math.PI/2,gloss:.12,tag:'有氧'});
      capsule(x-.62,1.22,-3.18,.070,.38,.070,c.rubber,
        {rz:-.32,gloss:.12,tag:'有氧'});
      capsule(x+.62,1.22,-3.18,.070,.38,.070,c.rubber,
        {rz:.32,gloss:.12,tag:'有氧'});
      box(x,.485,-1.38,.64,.025,.10,c.celadon,
        {hard:false,mode:1,gloss:.20,tag:'有氧'});
      for(let b=0;b<3;b++) cyl(x-.18+b*.18,1.43,-3.28,.025,.015,b===0?c.red:c.celadonL,
        {rx:Math.PI/2,mode:1,glow:.05,tag:'有氧'});
      solid(x-.75,x+.75,-3.78,-1.30);
    }
    // Bikes with moving pedals.
    const pedals=[];
    for(const x of [3.55,5.35]){
      box(x,.055,-2.45,1.55,.11,1.85,c.rubber,{hard:true,gloss:.10,tag:'有氧'});
      cyl(x,.58,-2.45,.56,.06,c.steelD,{rz:Math.PI/2,gloss:.48,tag:'有氧'});
      cyl(x,.58,-2.45,.48,.035,c.steelL,{rz:Math.PI/2,gloss:.54,tag:'有氧'});
      for(let s=0;s<8;s++) capsule(x,.58+Math.sin(s*Math.PI/4)*.40,-2.45+Math.cos(s*Math.PI/4)*.40,
        .018,.78,.018,c.steel,{rz:s*Math.PI/4,tag:'有氧'});
      capsule(x,.68,-2.45,.07,1.18,.07,c.steel,{rz:.30,tag:'有氧'});
      box(x,.98,-2.05,.62,.14,.30,c.rubber,{tag:'有氧'});
      capsule(x,1.18,-2.92,.055,.82,.055,c.steel,{rz:Math.PI/2,tag:'有氧'});
      box(x,1.42,-2.95,.54,.36,.12,c.ink,{hard:false,gloss:.38,tag:'有氧'});
      luminous(box(x,1.43,-2.88,.42,.24,.018,c.teal,
        {hard:false,mode:1,tag:'有氧'}),.035,.10);
      for(let k=0;k<3;k++) box(x-.12+k*.12,1.46,-2.865,.070,.022,.010,
        k===0?c.warm:c.waterL,{hard:false,mode:1,tag:'有氧'});
      cyl(x+.42,.91,-2.28,.075,.24,c.water,
        {mode:1,alpha:.66,gloss:.65,tag:'有氧'});
      cyl(x+.42,1.04,-2.28,.045,.030,c.bronzeL,{gloss:POLISH,tag:'有氧'});
      capsule(x-.62,.32,-2.45,.06,1.25,.06,c.steelD,{rz:Math.PI/2,tag:'有氧'});
      for(const s of [-1,1]) box(x+s*.60,.055,-2.45,.36,.11,.30,c.rubber,{hard:true,tag:'有氧'});
      for(let i=0;i<2;i++){
        const p=keep(ball(x,.58,-2.45,.09,.09,.09,c.bronzeL,{tag:'有氧'}),x,.58,-2.45,.5);
        pedals.push({p,x,i});
      }
      solid(x-.65,x+.65,-3.12,-1.75);
    }
    // Free weights and adjustable benches.  The dumbbell rack is an open three-rail frame with
    // floor shoes; replacing the old 3.5-metre solid back keeps the weight order visible and gives
    // the stretching zone a real sightline through the room.
    for(const z of [-1.30,1.45]){
      box(5.35,.67,z,.22,1.24,.22,c.steelD,{hard:true,gloss:.43,tag:'自由重量'});
      box(5.35,.055,z,.68,.11,.54,c.rubber,{hard:true,gloss:.10,tag:'自由重量'});
      box(5.35,1.30,z,.42,.12,.42,c.steelL,{hard:true,gloss:.50,tag:'自由重量'});
    }
    for(const y of [.34,.69,1.04]) box(5.28,y,.08,.16,.10,2.78,c.steelD,
      {hard:true,gloss:.43,tag:'自由重量'});
    for(let r=0;r<3;r++)for(let i=0;i<4;i++){
      const z=-1.02+i*.70,y=.35+r*.35;
      capsule(5.02,y,z,.045,.52,.045,c.steelL,{rz:Math.PI/2,gloss:.54,tag:'自由重量'});
      for(const s of [-1,1]) cyl(5.02+s*.34,y,z,.10+r*.025,.12,c.rubber,{rz:Math.PI/2,tag:'自由重量'});
      for(const s of [-1,1]) cyl(5.02+s*.41,y,z,.035,.018,
        r===0?c.celadon:(r===1?c.bronzeL:c.lacquer),
        {rz:Math.PI/2,mode:1,gloss:.42,tag:'自由重量'});
    }
    for(const z of [-.20,1.10]){
      box(1.65,.46,z,2.0,.16,.62,c.silk,{...MAT.cloth,ry:.08,mode:7,gloss:.03,tag:'力量'});
      box(1.65,.44,z,2.12,.055,.74,c.steelD,{hard:true,ry:.08,gloss:.44,tag:'力量'});
      box(.98,.49,z,1.02,.20,.58,c.silk,{...MAT.cloth,ry:.08,mode:7,gloss:.03,tag:'力量'});
      capsule(.92,.25,z,.055,.50,.055,c.steel,{tag:'力量'});
      capsule(2.38,.25,z,.055,.50,.055,c.steel,{tag:'力量'});
      capsule(1.65,.24,z,.045,1.32,.045,c.steelD,{rz:Math.PI/2,ry:.08,tag:'力量'});
      for(const s of [-1,1]) box(1.65+s*.73,.045,z,.32,.09,.30,c.rubber,{hard:true,tag:'力量'});
      solid(.62,2.68,z-.40,z+.40);
    }
    // Open dual-cable station.  The former implementation was a single person-height cuboid,
    // which blocked the pool view and looked like unfinished blocking geometry.  Uprights, feet,
    // top beam, guide rods, selectable plates, pulleys, cables and handles now expose the working
    // silhouette and make every load path explicit.
    for(const s of [-1,1]){
      const x=-2.1+s*1.08,stackX=-2.1+s*.68;
      box(x,.07,1.0,.62,.14,1.02,c.rubber,{hard:true,gloss:.10,tag:'力量'});
      capsule(x,1.56,1.0,.075,2.96,.075,c.steelL,{gloss:.48,tag:'力量'});
      box(x,3.03,1.0,.38,.16,.72,c.steelD,{hard:true,gloss:.43,tag:'力量'});
      box(stackX,.12,1.14,.58,.18,.62,c.steelD,{hard:true,gloss:.42,tag:'力量'});
      for(let i=0;i<8;i++) box(stackX,.30+i*.13,1.14,.50,.085,.48,i===3?c.bronzeL:c.rubber,
        {hard:true,gloss:i===3?.58:.16,tag:'力量'});
      for(const dx of [-.22,.22]) capsule(stackX+dx,1.05,1.14,.018,1.86,.018,c.steel,
        {gloss:.52,tag:'力量'});
      cyl(x,2.64,.81,.13,.06,c.steelD,{rz:Math.PI/2,gloss:.50,tag:'力量'});
      capsule(-2.1+s*.72,1.86,.83,.025,1.56,.025,c.steelD,
        {rz:-s*.30,gloss:.42,tag:'力量'});
      capsule(-2.1+s*.48,1.12,.83,.035,.48,.035,c.bronze,
        {rz:Math.PI/2,gloss:AGED,tag:'力量'});
    }
    box(-2.1,3.08,1.0,2.42,.20,.44,c.steelD,{hard:true,gloss:.43,tag:'力量'});
    capsule(-2.1,2.80,1.0,.055,1.72,.055,c.steelL,{rz:Math.PI/2,gloss:.50,tag:'力量'});
    capsule(-2.1,1.38,1.0,.045,1.60,.045,c.steelL,{rz:Math.PI/2,gloss:.48,tag:'力量'});
    solid(-3.34,-.86,.53,1.47);
    // Stretching area and water.
    for(const z of [-.20,.70,1.60]) flat(4.0,.033,z,1.55,.62,z<0?c.celadon:(z<1?c.blue:c.lacquer),
      {mode:7,gloss:.035,tag:'伸展'});
    box(6.35,.07,.95,.84,.14,1.28,c.stoneD,{...MAT.stone,hard:true,gloss:.14,tag:'饮水'});
    box(6.35,1.15,.95,.62,2.05,1.10,c.stoneL,{...MAT.stone,hard:true,gloss:.20,tag:'饮水'});
    for(const z of [.47,1.43]) box(6.02,1.15,z,.055,1.88,.08,c.bronzeD,
      {hard:true,gloss:AGED,tag:'饮水'});
    box(6.35,2.21,.95,.78,.10,1.22,c.bronzeD,{hard:true,gloss:AGED,tag:'饮水'});
    cyl(6.35,2.48,.95,.27,.45,c.water,{gloss:.62,mode:1,alpha:.70,tag:'饮水'});
    cyl(6.35,2.73,.95,.12,.08,c.bronzeL,{gloss:POLISH,tag:'饮水'});
    box(6.03,1.55,.95,.035,.42,.70,c.water,{hard:true,mode:1,glow:.06,tag:'饮水'});
    capsule(5.96,1.24,.95,.025,.24,.025,c.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'饮水'});
    box(5.96,.96,.95,.30,.055,.46,c.steelD,{hard:true,gloss:.44,tag:'饮水'});
    solid(6.00,6.72,.35,1.55);
    fixture(A,'健身房',.2,-1.0,'健身房有有氧、力量、自由重量和伸展区域。',
      'Fitness includes cardio, strength, free weights and stretching.',
      '健身房 is the fitness room.','spa',[.2,-4.0],2.0);
    fixture(A,'健身器械',1.40,-2.55,'跑步机和单车记录速度、时间和心率。',
      'Treadmills and bikes track speed, time and heart rate.',
      '器械 means equipment.','spa',[1.40,-1.05],1.9);
    fixture(A,'自由重量',5.0,.25,'哑铃按重量顺序放回架上。',
      'Dumbbells return to the rack in weight order.',
      '自由重量 means free weights.','spa',[4.10,.25],1.8);

    // Calm, local light hierarchy beyond the pool lanterns: warm at reception and tea, neutral
    // over treatment, and slightly cooler over exercise.  Together with the three pool lights
    // this remains within the renderer's eight nearest-light budget.
    for(const [x,z,rgb,power,range] of [
      [-10.1,-9.2,[1.00,.82,.62],.18,4.7],
      [-14.2,-.4,[.84,.92,.84],.16,5.0],
      [-14.2,11.2,[1.00,.78,.55],.16,4.2],
      [1.0,-1.7,[.70,.86,.88],.17,4.9],
    ]){
      const l=light(x,3.22,z,rgb,power,range);l.on=true;
    }

    // Motion: slow water, pool-floor caustics, lantern breathing/sway, treatment aroma steam,
    // tea steam, treadmill belts and bike pedals.  Evening warmth follows the in-game clock.
    const vapour=[];
    for(let i=0;i<12;i++){
      const treatment=i<6;
      const x=treatment?-15.8+(i%3)*.15:-7.15+(i%3)*.12;
      const z=treatment?(-3.0+(i%2)*5.15):-11.75;
      const p=keep(ball(x,1.15+(i%4)*.18,z,.11,.16,.11,c.white,
        {mode:1,alpha:.10,glow:.010,tag:treatment?'芳香护理':'迎宾茶台'}),x,1.4,z,.7);
      vapour.push({p,x,z,i,treatment});
    }
    const towelCart=[];
    const addTowelCart=p=>{const q=keep(p,p.ob?p.ob.x:7.6,p.ob?p.ob.y:.6,p.ob?p.ob.z:9.8,1.6);towelCart.push({p:q,m:q.m});return q;};
    addTowelCart(box(7.60,.07,9.80,1.30,.14,.88,c.stoneD,{...MAT.stone,hard:true,gloss:.13,tag:'毛巾车'}));
    addTowelCart(box(7.60,.55,9.80,1.15,.92,.72,c.walnutL,{...MAT.timber,mode:6,gloss:.26,tag:'毛巾车'}));
    addTowelCart(box(7.60,1.15,9.80,1.08,.08,.72,c.bronzeD,{hard:true,gloss:AGED,tag:'毛巾车'}));
    for(const s of [-1,1]){
      addTowelCart(capsule(7.60+s*.48,.82,9.80,.035,1.40,.035,c.bronze,{gloss:AGED,tag:'毛巾车'}));
      addTowelCart(capsule(7.60+s*.48,1.48,9.80,.035,.72,.035,c.bronze,{rz:Math.PI/2,gloss:AGED,tag:'毛巾车'}));
    }
    for(const p of towelStack(A,c,7.60,.78,9.80,.80,.52,4,'毛巾车'))addTowelCart(p);
    for(const s of [-1,1])for(const zz of [-.24,.24]) addTowelCart(cyl(7.60+s*.40,.14,9.80+zz,.11,.07,c.rubber,
      {rz:Math.PI/2,tag:'毛巾车'}));

    onTick((t,body,clock,dt)=>{
      const h=((Number(clock)||0)/60)%24,evening=(h>=18||h<7)?1:0;
      ripples.forEach(q=>{
        const dx=Math.sin(t*.34+q.i*.78)*.34,dz=Math.cos(t*.27+q.i)*.08;
        q.p.m=M.mul(M.trans(dx,.004*Math.sin(t*.7+q.i),dz),q.m);
        q.p.alpha=.36+.16*(.5+.5*Math.sin(t*.45+q.i*.6));
        q.p.glow=.055+evening*.045;
      });
      caustics.forEach(q=>{
        const k=.86+.18*Math.sin(t*.31+q.i*.83);
        q.p.m=M.mul(M.trans(Math.sin(t*.22+q.i)*.18,0,Math.cos(t*.25+q.i)*.14),q.m);
        q.p.alpha=.30+.16*(.5+.5*Math.sin(t*.42+q.i));q.p.glow=.050+evening*.055;
      });
      lanterns.forEach((q,i)=>{
        q.p.m=M.mul(M.trans(Math.sin(t*.28+i*.7)*.025,Math.cos(t*.22+i)*.010,0),q.m);
        if(q.p.tag==='泳池灯笼'&&q.p.mesh==='ball')q.p.glow=.11+evening*.22+.025*Math.sin(t*.55+i);
      });
      vapour.forEach(q=>{
        const u=(t*(q.treatment?.12:.17)+q.i*.151)%1,s=.12+u*.17;
        q.p.m=M.trs(q.x+Math.sin(t*.38+q.i)*.08,1.03+u*1.05,q.z+Math.cos(t*.31+q.i)*.05,0,s,s*1.45,s);
        q.p.alpha=.105*(1-u);
      });
      treadmillMarks.forEach(q=>{
        const dz=((t*.62+q.i*.34)%1.70)-q.i*.34;
        q.p.m=M.mul(M.trans(0,0,dz),q.m);
      });
      pedals.forEach(q=>{
        const a=t*1.35+q.i*Math.PI;
        q.p.m=M.trs(q.x,.58+Math.sin(a)*.20,-2.45+Math.cos(a)*.20,0,.18,.18,.18);
      });
      const cartDx=.32*Math.sin(t*.14),cartDz=.20*Math.sin(t*.09+.7);
      for(const q of towelCart)q.p.m=M.mul(M.trans(cartDx,0,cartDz),q.m);
      A.state.wellness={floor:4,pool:{ripples:ripples.length,caustics:caustics.length,heated:true},
        lanterns:lanterns.length/3,treatmentRooms:2,lockers:12,
        gym:{treadmills:3,bikes:2,strengthZones:3},serviceRouteClear:true,evening:!!evening};
    });
  });

  // ------------------------------------------------------------------------------------------
  // Stable floor-local actions. These are hospitality rituals and workplace attachment seams,
  // not a premature career chapter.
  Object.assign(HotelUse.hotelB1,{
    '员工入口':{zh:'刷员工卡',py:'shuā yuángōng kǎ',en:'badge in at the staff entrance',secs:1.8,mins:2,
      gain:{},pose:{type:'check'},done:'门禁灯变成绿色，值班开始了。',doneTr:'The access light turns green; the shift begins.'},
    '装卸区':{zh:'核对收货',py:'héduì shōuhuò',en:'check a delivery',secs:2.8,mins:10,
      gain:{rest:-3},pose:{type:'check'},done:'数量、温度和供应商都核对好了。',doneTr:'Quantity, temperature and supplier all check out.'},
    '洗衣房':{zh:'处理酒店布草',py:'chǔlǐ jiǔdiàn bùcǎo',en:'process hotel linen',secs:3.5,mins:25,
      gain:{rest:-6,clean:5},pose:{type:'work'},done:'这一批布草洗净、烘干并折好了。',doneTr:'This batch is washed, dried and folded.'},
    '传送带':{zh:'整理传送带',py:'zhěnglǐ chuánsòngdài',en:'sort the conveyor',secs:2.6,mins:8,
      gain:{rest:-2},pose:{type:'carry'},done:'布草按楼层分开了。',doneTr:'The linen is separated by floor.'},
    '布草间':{zh:'盘点布草',py:'pándiǎn bùcǎo',en:'inventory linen',secs:2.8,mins:12,
      gain:{rest:-3},pose:{type:'check'},done:'床单、浴巾和枕套数量一致。',doneTr:'Sheets, bath towels and pillowcases match the count.'},
    '客房部工作间':{zh:'配客房车',py:'pèi kèfáng chē',en:'stock a housekeeping cart',secs:3.0,mins:12,
      gain:{rest:-4},pose:{type:'carry'},done:'清洁用品和布草都配齐了。',doneTr:'Cleaning supplies and linen are fully stocked.'},
    '员工更衣室':{zh:'换工作服',py:'huàn gōngzuòfú',en:'change into uniform',secs:2.4,mins:8,
      gain:{clean:4},pose:{type:'open'},done:'制服整洁，工牌也戴好了。',doneTr:'The uniform is neat and the name badge is on.'},
    '储物柜':{zh:'打开储物柜',py:'dǎkāi chǔwùguì',en:'open a locker',secs:1.6,mins:2,
      gain:{},pose:{type:'open'},done:'个人物品安全地放好了。',doneTr:'Personal belongings are stored safely.'},
    '员工食堂':{zh:'吃员工餐',py:'chī yuángōng cān',en:'eat a staff meal',secs:3.8,mins:30,
      gain:{hunger:32,rest:8,mood:5},pose:{type:'eat',seatY:.48},done:'热饭热菜让人重新有了精神。',doneTr:'A hot meal brings your energy back.'},
    '工程部':{zh:'检查设备状态',py:'jiǎnchá shèbèi zhuàngtài',en:'inspect plant status',secs:3.0,mins:12,
      gain:{rest:-3},pose:{type:'check'},done:'水泵、空调和配电状态正常。',doneTr:'Pumps, air conditioning and power are normal.'},
    '保安部':{zh:'交接保安班次',py:'jiāojiē bǎo’ān bāncì',en:'hand over the security shift',secs:2.6,mins:8,
      gain:{rest:-2},pose:{type:'talk'},done:'钥匙、对讲机和事件记录都交接清楚了。',doneTr:'Keys, radios and incident logs are handed over.'},
    '监控中心':{zh:'查看监控',py:'chákàn jiānkòng',en:'review CCTV',secs:2.5,mins:8,
      gain:{rest:-2},pose:{type:'check'},done:'各公共区和后勤入口都正常。',doneTr:'Public areas and service entrances are normal.'},
    '服务通道':{zh:'检查服务路线',py:'jiǎnchá fúwù lùxiàn',en:'inspect the service route',secs:2.0,mins:5,
      gain:{},pose:{type:'walk'},done:'服务梯到各工作间的路线保持畅通。',doneTr:'Routes from the service lift to workrooms are clear.'},
  });
  // ---------------------------------------------------------------------------------------- H143
  // 预约. `Story.plan` / `Story.planned` / `Story.cancelPlan` existed, were proven, and had exactly
  // one repo-wide reference each: their own definition. A spa appointment therefore meant nothing —
  // you walked into the treatment room and lay down, and the word 预约 was a label on an action
  // with no consequence.
  //
  // This is the reader. Booking at 水疗接待 puts one day-scoped plan on the key 'spa'; 理疗室 will
  // not take a walk-in without it, and says so the way every other refusal in the hotel is said —
  // by a person, before the key is pressed, not as a beep after it. The treatment consumes the
  // plan, so one appointment is one treatment.
  //
  // `stayDesk` is the dispatch seam js/game.js:12162 invites any USE row to use: a function on the
  // key, called once when the action completes, rather than a side effect smuggled into a getter
  // that `useLabel` may evaluate several times while the player is merely standing nearby.
  const SPA_KEY = 'spa', SPA_OPEN = 10, SPA_LAST = 21.5;
  const gm = () => (typeof window !== 'undefined' && window.__game) || null;
  const spaNow = () => {
    try { const s = gm().state(); return { day:Math.max(1, s.day | 0), hour:(s.minutes | 0) / 60 }; }
    catch (_) { return { day:1, hour:12 }; }
  };
  const spaPlan = () => {
    try { return Story.planned(SPA_KEY, spaNow().day); } catch (_) { return null; }
  };
  const hhmm = h => `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h % 1) * 60)).padStart(2,'0')}`;
  // The next slot: half an hour from now, on the half hour, inside the treatment room's own window.
  function spaSlot() {
    const n = spaNow();
    const want = Math.max(SPA_OPEN, Math.ceil((n.hour + .5) * 2) / 2);
    return want > SPA_LAST ? null : want;
  }
  function bookSpa() {
    const n = spaNow(), had = spaPlan();
    if (had) return;                                     // already booked today; the row says when
    const at = spaSlot();
    if (at === null) return;                             // too late today; the row says so
    try { Story.plan(SPA_KEY, n.day, at); } catch (_) {}
  }
  Object.assign(HotelUse.hotel4,{
    '水疗接待':{zh:'预约水疗',py:'yùyuē shuǐliáo',secs:2.2,mins:5,
      gain:{mood:3},pose:{type:'talk'},stayDesk:bookSpa,
      get en(){ const p = spaPlan();
        return p ? `spa booked for ${hhmm(p.hour)} — the treatment room is expecting you`
          : spaSlot() === null ? 'ask about the spa — nothing left today'
          : 'book a spa treatment'; },
      get done(){ const p = spaPlan();
        return p ? `理疗室${hhmm(p.hour)}给您留着。` : '今天的理疗满了，明天请早。'; },
      get doneTr(){ const p = spaPlan();
        return p ? `The treatment room is holding ${hhmm(p.hour)} for you.`
                 : 'Today is fully booked; please come earlier tomorrow.'; }},
    '迎宾茶台':{zh:'喝养生茶',py:'hē yǎngshēng chá',en:'drink wellness tea',secs:2.8,mins:12,
      gain:{rest:7,mood:5},pose:{type:'drink'},done:'温热的花草茶让人慢慢安静下来。',doneTr:'Warm herbal tea settles you.'},
    // The appointment is what makes the treatment room a room you were expected in. Without one it
    // refuses; with one it keeps 唐莉's line about being on time, because arriving an hour and a
    // half late is a story rather than a score.
    '理疗室':{zh:'做芳香理疗',py:'zuò fāngxiāng lǐliáo',en:'take an aroma treatment',secs:4.0,mins:60,
      gain:{rest:30,mood:12,clean:8},pose:{type:'lie',seatY:.95},
      stayDesk(){ try { Story.cancelPlan(SPA_KEY); } catch (_) {} },
      get block(){ return spaPlan() ? undefined : '理疗要先在前台预约，我带您过去。'; },
      get blockTr(){ return spaPlan() ? undefined
        : 'Treatments are by appointment — book at reception first.'; },
      get done(){ const p = spaPlan(), n = spaNow();
        return p && n.hour > p.hour + 1.5 ? '您来晚了，那就做个短的。' : '肩背放松了，呼吸也慢了下来。'; },
      get doneTr(){ const p = spaPlan(), n = spaNow();
        return p && n.hour > p.hour + 1.5 ? 'You are late, so we will keep it short.'
                                          : 'Your shoulders relax and breathing slows.'; }},
    '更衣室':{zh:'更换泳衣',py:'gēnghuàn yǒngyī',en:'change for the pool',secs:2.5,mins:8,
      gain:{clean:3},pose:{type:'open'},done:'泳衣换好了，贵重物品锁在柜里。',doneTr:'You change and lock valuables away.'},
    '储物柜':{zh:'使用储物柜',py:'shǐyòng chǔwùguì',en:'use a locker',secs:1.6,mins:2,
      gain:{},pose:{type:'open'},done:'房卡锁好了储物柜。',doneTr:'The room key locks the locker.'},
    '泳池':{zh:'在恒温池游泳',py:'zài héngwēn chí yóuyǒng',en:'swim in the heated pool',secs:4.2,mins:35,
      gain:{rest:15,mood:12,clean:8},pose:{type:'stretch'},done:'水温刚好，游完很舒服。',doneTr:'The water is just right; the swim feels restorative.'},
    '毛巾站':{zh:'取干毛巾',py:'qǔ gān máojīn',en:'take a fresh towel',secs:1.7,mins:2,
      gain:{clean:5},pose:{type:'take'},done:'干净的毛巾已经准备好了。',doneTr:'A fresh towel is ready.'},
    '健身房':{zh:'做全身训练',py:'zuò quánshēn xùnliàn',en:'do a full workout',secs:4.0,mins:45,
      gain:{rest:-16,mood:9,clean:-6},pose:{type:'work'},done:'有氧和力量训练都完成了。',doneTr:'Cardio and strength training are complete.'},
    '健身器械':{zh:'使用跑步机',py:'shǐyòng pǎobùjī',en:'use a treadmill',secs:3.8,mins:30,
      gain:{rest:-12,mood:7},pose:{type:'walk'},done:'速度慢慢降下来，训练结束。',doneTr:'The belt slows and the workout ends.'},
    '自由重量':{zh:'练习力量',py:'liànxí lìliàng',en:'train with free weights',secs:3.5,mins:25,
      gain:{rest:-10,mood:6},pose:{type:'lift'},done:'哑铃放回了标记好的位置。',doneTr:'The dumbbells return to their marked place.'},
    '放松茶廊':{zh:'在茶廊休息',py:'zài cháláng xiūxi',en:'rest in the tea lounge',secs:3.2,mins:25,
      gain:{rest:14,mood:8},pose:{type:'sit',seatY:.48},done:'听着水声，人慢慢放松了。',doneTr:'The sound of water helps you relax.'},
    '茶台':{zh:'喝花草茶',py:'hē huācǎo chá',en:'drink herbal tea',secs:2.8,mins:15,
      gain:{rest:8,mood:6},pose:{type:'drink'},done:'花草茶清香温和。',doneTr:'The herbal tea is gentle and fragrant.'},
  });

  // ------------------------------------------------------------------------------------------
  // Staff and guests.  Positions are intentionally outside the passenger/service spines and
  // use the character motion vocabulary already supported by the shared figure rig.
  // `hair` is explicit rather than seeded because js/speech.js:81 reads the HAIRSTYLE to decide
  // whether a voice is a woman's — `WOMANS_HAIR` includes 'bun' — so `seed%2` was casting the
  // voices at random. It put a woman's voice on 孙伟 the night security officer, 杜海 the lifeguard
  // and 何磊 in receiving, and a man's on 王敏 and 唐莉. The silhouette was wrong for the same five
  // people at the same time; one field fixes both.
  const staffLook=(seed,jacket='#52685f',apron,hair)=>({
    skin:['#d8a57e','#c9916b','#e1af87'][seed%3],hair:['#29221f','#352a25','#211d1a'][seed%3],
    hairStyle:hair||(seed%2?'bun':'short'),top:'#eee8dc',pants:'#34383d',shoe:'#27292c',jacket,
    apron,scarf:'#9b7442',collar:'mandarin',uniform:'staff',tall:.96+(seed%4)*.025,
    wide:.93+(seed%3)*.025,faceSeed:seed
  });
  const guestLook=(seed,top,style='short')=>({
    skin:['#d9a67e','#c88f68','#e1b088'][seed%3],hair:['#2c2521','#3a302a','#211c19'][seed%3],
    hairStyle:style,top,pants:'#39434a',shoe:'#e6dfd3',collar:seed%2?'crew':'shirt',
    tall:.94+(seed%5)*.025,wide:.91+(seed%3)*.035,faceSeed:seed
  });

  // Receiving is a major staffed operation, not an unattended pile of boxes.  Register this
  // floor-local worker while the module loads (before game.js folds HotelCast into the live
  // roster), and make the rig key the exact-once identity if a development page evaluates the
  // fit module again.
  if(!HotelCast.some(n=>n.name==='何磊'&&n.place==='hotelB1')) HotelCast.push(
    {hz:'收货员',name:'何磊',py:'Hé Lěi',gender:'male',ageBand:'mature',place:'hotelB1',dept:'housekeeping',rig:'hotelb1-receiving-he-lei',temper:'brisk',
      look:staffLook(4105,'#536d66','#8ca99a','short'),
      spots:[{h0:5.5,h1:19,at:[-8.90,-13.05],face:0,act:'check'}],
      lines:[['今天的布草和用品都核对好了。','Today\'s linen and supplies have been checked.'],['收货台前要留出搬运空间。','Keep handling space clear in front of receiving.']]}
  );
  // The changing suite is large enough to read as abandoned when every guest teleports between
  // fixed leisure spots.  A discreet attendant at the towel-return cabinet gives the room a
  // believable host without occupying either gendered threshold or the central locker aisle.
  if(!HotelCast.some(n=>n.name==='方宁'&&n.place==='hotel4')) HotelCast.push(
    {hz:'更衣室服务员',name:'方宁',py:'Fāng Níng',gender:'female',ageBand:'adult',place:'hotel4',dept:'spa',rig:'hotel4-changing-fang-ning',temper:'calm',
      look:staffLook(4405,'#6b8174','#c0d0c5'),
      spots:[{h0:6,h1:23,at:[6.20,-12.05],face:Math.PI,act:'carry',held:'linen'}],
      lines:[['干毛巾已经补齐了。','Fresh towels have been restocked.'],['贵重物品请锁进储物柜。','Please lock valuables in a locker.']]}
  );

  // ------------------------------------------------------------------------------- H196 · 宴会
  //
  // A staged banquet with people in it, readable from the pre-function hall. The ballroom's tables,
  // linen, place settings and flowers were all built months ago and nobody has ever sat at them:
  // hotel3's whole cast is a manager, an advisor, a server and one business guest, none of whom is
  // at a table. From HT3-prefunction the room reads as a photograph of a banquet rather than a
  // banquet.
  //
  // WHY THE ROWS ARE HERE. The geometry is js/hotel-public.js, which this lane does not own and has
  // not touched — but `HotelCast` is a shared registry every module pushes to, and HOTEL-TODO.md's
  // section I names this lane's files as the owner of who is in the building. So the people are
  // added from the cast lane's own file and the ballroom is read, not edited.
  //
  // EVERY SEAT IS MEASURED OFF THAT FILE'S OWN ARITHMETIC, not placed by eye. `roundTable`
  // (js/hotel-public.js:279) puts `seats` chairs at radius r + 0.72 and angle i*2pi/seats, and the
  // ballroom ring (:1383) is four tables of r 0.82 with 4 seats — so a chair sits at
  // (x + sin(a)*1.54, z + cos(a)*1.54) and its back is on the radial outside, which means a sitter
  // faces a + pi, back toward the lazy Susan. The chair's own cushion top is 0.5625
  // (:chair, the 0.035-thick silk at y .545), comfortably inside resolveNPCSeat's default
  // 0.28-0.64 window, so no authored seatY is needed and none is given.
  //
  // `eat` and `drink` rather than `sit`: both are in NPC_SEAT_OPTIONAL, so if that fit-out ever
  // moves a chair these people degrade to standing guests rather than to bodies floating over a
  // seat that is no longer there.
  //
  // Six, not twenty-four. Figures are the most expensive thing that can go in a room and a banquet
  // reads from the two tables the pre-function portal actually frames; the far pair stay set and
  // empty, which is what the end of a room looks like anyway.
  //
  // NOT day-dependent, and deliberately: `dayEvent()` in js/hotel-public.js decides what is booked
  // in the ballroom today, but `npcAwake` reads `spots` every frame for every person in the game,
  // so a getter there would allocate sixty times a second to answer a question that changes once a
  // day. Fixed evening hours instead — 17:00 to 23:00, which is the window HT3-prefunction (17:00),
  // HT-PUB3-overview (18:00), HT3-ballroom-stage (18:00) and HT3-prefunction-night (22:00) all
  // stand in. Tying it to the booking wants a per-day cache in whoever owns that floor.
  const banquetRing = (cx, cz, seats) => seats.map(i => {
    const a = i * Math.PI / 2, rr = 1.54;
    return { at:[+(cx + Math.sin(a) * rr).toFixed(2), +(cz + Math.cos(a) * rr).toFixed(2)],
             face:a + Math.PI };
  });
  const banquetGuests = [];
  [[-11.7, 3.1, [0, 1, 2, 3]], [-.9, 3.1, [0, 2]]].forEach(([cx, cz, seats], t) => {
    banquetRing(cx, cz, seats).forEach((s, i) => {
      const seed = 4650 + t * 10 + i;
      banquetGuests.push({
        hz:'宾客', place:'hotel3', temper:['cheerful','genial','patient','relaxed'][i % 4],
        gender:i % 2 ? 'female' : 'male', ageBand:i === 3 ? 'mature' : 'adult', seatY:.56,
        look:guestLook(seed, ['#7d5a52','#4f6675','#8a6a4c','#5c6f63'][i % 4], i % 2 ? 'bun' : 'short'),
        spots:[{ h0:17, h1:19.5, at:s.at, face:s.face, act:'eat' },
               { h0:19.5, h1:23, at:s.at, face:s.face, act:'drink' }],
      });
    });
  });
  for (const n of banquetGuests)
    if (!HotelCast.some(q => q.place === 'hotel3' && q.look && n.look &&
                             q.look.faceSeed === n.look.faceSeed)) HotelCast.push(n);

  // `dept` is the department key from HOTEL_DEPARTMENTS (js/hotel.js:10-20), carried on the row so
  // a roster can be grouped by department and floor without guessing it back out of a job title.
  // CastCatalog.hotelRoster() reads it; nothing in the runtime requires it, so a row without one
  // is inferred rather than rejected.
  HotelCast.push(
    {hz:'洗衣房主管',name:'周秀兰',py:'Zhōu Xiùlán',place:'hotelB1',dept:'laundry',rig:'hotelb1-laundry-zhou-xiulan',temper:'focused',look:staffLook(4101,'#506d63','#78988a'),
      spots:[{h0:6,h1:15,at:[-7.7,.15],face:-Math.PI/2,act:'work',held:null},
             {h0:15,h1:23,at:[.25,.20],face:0,act:'check'}],
      lines:[['布草要分颜色、尺寸和楼层。','Linen is separated by colour, size and floor.'],['这批烘干后送到客房部工作间。','This batch goes to housekeeping after drying.'],['传送带旁边要一直保持整齐。','Keep the conveyor area orderly at all times.']]},
    // He was one spot for all twenty-four hours, which is a mannequin with a job title. His day is
    // now three legs: the night desk, a morning round of the plant bank, and the afternoon back at
    // the status board. He stays on B1 — the roof half of engineering's two floors is 祁川's, in
    // js/hotel-f12.js, because one name has to be one person.
    {hz:'工程师',name:'马建国',py:'Mǎ Jiànguó',place:'hotelB1',dept:'engineering',rig:'hotelb1-engineer-ma-jianguo',temper:'steady',look:staffLook(4102,'#4f6264'),
      spots:[{h0:0,h1:6,at:[-10.0,9.05],face:Math.PI,act:'check'},
             {h0:6,h1:10.5,at:[-13.68,10.40],face:0,act:'work',held:null},
             {h0:10.5,h1:24,at:[-10.0,9.05],face:Math.PI,act:'check'}],
      lines:[['水泵压力正常，空调也稳定。','Pump pressure and air conditioning are stable.'],['工程部二十四小时有人值班。','Engineering is staffed around the clock.'],['服务通道不能堆放东西。','Nothing may be stored in the service route.'],['屋顶设备归祁川管，他每天早上上去。','The roof plant is Qi Chuan\'s; he goes up every morning.']]},
    // The night person is not the day person. Security was one officer at one desk for all
    // twenty-four hours, which is the one department where that is obviously wrong. 孙伟 now works
    // 18:00-06:00 across two positions, and hands over to 柏松 at six.
    {hz:'保安员',name:'孙伟',py:'Sūn Wěi',place:'hotelB1',dept:'security',temper:'alert',seatY:.45,rig:'hotelb1-security-sun-wei',look:staffLook(4103,'#354f58',null,'short'),
      spots:[{h0:18,h1:26,at:[9.75,-8.30],face:Math.PI,act:'desk'},
             {h0:2,h1:6,at:[10.0,-12.60],face:Math.PI,act:'check'}],
      lines:[['员工入口和装卸区都在监控范围内。','The staff entrance and loading dock are both monitored.'],['交班前要核对钥匙和对讲机。','Keys and radios are checked before handover.'],['我上夜班，白班是柏松。','I work nights; Bai Song has the day shift.']]},
    {hz:'保安员',name:'柏松',py:'Bǎi Sōng',gender:'male',ageBand:'mature',place:'hotelB1',dept:'security',temper:'even',seatY:.45,look:staffLook(4106,'#3b525c'),
      spots:[{h0:6,h1:12,at:[8.15,-8.30],face:Math.PI,act:'desk'},
             {h0:12,h1:18,at:[10.0,-12.60],face:Math.PI,act:'check'}],
      lines:[['白班从六点到六点，晚上孙伟接。','The day shift runs six to six; Sun Wei takes over at night.'],['送货的车要先登记再进装卸区。','Delivery vehicles register before entering the dock.']]},
    {hz:'客房部协调员',name:'王敏',py:'Wáng Mǐn',place:'hotelB1',dept:'housekeeping',rig:'hotelb1-housekeeping-wang-min',temper:'busy',look:staffLook(4104,'#64705d','#8ca99a','bun'),
      spots:[{h0:6,h1:18,at:[5.0,6.85],face:0,act:'carry',held:'linen'},
             {h0:18,h1:23,at:[9.15,7.25],face:0,act:'check'}],
      lines:[['每辆车按楼层配布草和用品。','Each cart is stocked by floor.'],['服务梯路线今天很顺畅。','The service-lift route is clear today.']]},
    {hz:'员工',gender:'female',ageBand:'adult',place:'hotelB1',dept:'housekeeping',temper:'relaxed',seatY:.48,look:guestLook(4111,'#718780','bob'),
      spots:[{h0:6,h1:9,at:[-13.65,-.58],face:0,act:'eat'},{h0:11.5,h1:14,at:[-12.55,1.82],face:0,act:'eat'},{h0:18,h1:22,at:[-6.4,9.75],face:Math.PI,act:'sit'}]},
    // The canteen and the lockers are staffed round the clock or they are a stage set. Somebody on
    // the night shift eats at half past eleven and changes out at six, which is the only hour of
    // the day the locker room has anybody in it.
    {hz:'夜班员工',gender:'male',ageBand:'adult',place:'hotelB1',dept:'housekeeping',temper:'tired',seatY:.48,look:guestLook(4112,'#6c7a86','short'),
      spots:[{h0:23,h1:26,at:[-13.65,.92],face:Math.PI,act:'eat'},
             {h0:5.5,h1:6.5,at:[-2.0,9.75],face:Math.PI,act:'sit'}]},

    {hz:'水疗接待员',name:'沈雅',py:'Shěn Yǎ',place:'hotel4',dept:'spa',rig:'hotel4-spa-reception-shen-ya',temper:'calm',look:staffLook(4401,'#557366'),
      spots:[{h0:7,h1:14,at:[-10.1,-8.05],face:Math.PI,act:'hands'},
             {h0:14,h1:23,at:[-7.15,-12.40],face:0,act:'work',held:null}],
      lines:[['欢迎来到四楼水疗中心。','Welcome to the fourth-floor spa.'],['理疗前请先在更衣室存好物品。','Please store your belongings before treatment.'],['泳池水温今天是二十八度。','The pool is twenty-eight degrees today.'],['下午我在迎宾茶台，来一杯养生茶再进去。','In the afternoon I am at the tea table; have a cup before you go in.']]},
    {hz:'理疗师',name:'唐莉',py:'Táng Lì',place:'hotel4',dept:'spa',rig:'hotel4-therapist-tang-li',temper:'gentle',look:staffLook(4402,'#6b8174','#a9bbae','bun'),
      spots:[{h0:9,h1:21,at:[-12.65,-3.0],face:-Math.PI/2,act:'work',held:null}],
      lines:[['请慢慢呼吸，肩膀放松。','Breathe slowly and let your shoulders relax.'],['护理后可以去茶廊休息。','You can rest in the tea lounge after treatment.']]},
    {hz:'救生员',name:'杜海',py:'Dù Hǎi',place:'hotel4',dept:'spa',rig:'hotel4-lifeguard-du-hai',temper:'alert',look:staffLook(4403,'#345d67',null,'short'),
      spots:[{h0:6,h1:23,at:[-9.25,9.72],face:Math.PI,act:'wait'}],
      lines:[['浅水台阶在东边，请慢慢下水。','The shallow steps are on the east; enter slowly.'],['池边请小心地滑。','Please take care on the wet pool deck.']]},
    {hz:'健身教练',name:'陈骁',py:'Chén Xiāo',place:'hotel4',dept:'spa',rig:'hotel4-trainer-chen-xiao',temper:'upbeat',look:staffLook(4404,'#425b62'),
      spots:[{h0:6,h1:22,at:[4.0,.70],face:Math.PI,act:'stretch'}],
      lines:[['先热身，再开始力量训练。','Warm up before strength training.'],['哑铃用完请放回标记位置。','Please return dumbbells to their marked place.']]},
    {hz:'住客',gender:'female',ageBand:'adult',place:'hotel4',temper:'relaxed',seatY:.48,look:guestLook(4411,'#78908d','bob'),
      spots:[{h0:7,h1:15,at:[-6.8,11.10],face:Math.PI,act:'read'},{h0:15,h1:23,at:[-15.7,10.5],face:Math.PI/2,act:'drink'}]},
    {hz:'住客',gender:'male',ageBand:'adult',place:'hotel4',temper:'focused',look:guestLook(4412,'#59717e','short'),
      spots:[{h0:6,h1:22,at:[-.65,-.95],face:Math.PI,act:'walk'}]},
    {hz:'住客',gender:'female',ageBand:'senior',place:'hotel4',temper:'patient',seatY:.48,look:guestLook(4413,'#a06b59','bun'),
      spots:[{h0:10,h1:22,at:[-12.8,12.3],face:-Math.PI/2,act:'drink'}]}
  );

  // ------------------------------------------------------------------------------------------
  // The one runnable check for the appointment wiring above. An unread API with a passing unit
  // test is the failure mode this repo has already hit twice, so the check exercises the LIVE
  // HotelUse rows rather than a copy of the logic: it is the rows, the getters and the dispatch
  // seam that have to be right, not a private function.
  //
  //   HotelServiceFit.spaCheck()             -> { ok:true, checks:[...] }   from any page or harness
  // (a top-level const in a classic script is a global lexical binding, not a window property, so
  //  a devtools evaluate reaches it by bare name.)
  //
  // It restores whatever plan was there when it started, so it is safe to run mid-game.
  function spaCheck() {
    const checks = [], say = (name, ok, detail) => checks.push({ name, ok:!!ok, detail });
    const desk = HotelUse.hotel4['水疗接待'], room = HotelUse.hotel4['理疗室'];
    const day = spaNow().day;
    let before = null;
    try { before = Story.planned(SPA_KEY, day); } catch (_) {}
    try {
      try { Story.cancelPlan(SPA_KEY); } catch (_) {}
      say('with no appointment, the treatment room refuses', !!room.block, room.block);
      say('and it says so in both languages', !!room.blockTr, room.blockTr);
      say('the desk offers a booking', /book|nothing left/.test(String(desk.en)), desk.en);

      if (typeof desk.stayDesk === 'function') desk.stayDesk();
      const made = Story.planned(SPA_KEY, day);
      const late = spaSlot() === null;      // after 21:30 there is no slot left to book
      say('booking at the desk writes a day-scoped plan', late ? !made : !!made, { made, late });
      if (!late) {
        say('the plan is inside the treatment room opening window',
          made.hour >= SPA_OPEN && made.hour <= SPA_LAST, made && made.hour);
        say('with an appointment the treatment room lets you in', !room.block, room.block);
        say('and the desk now reads the time back', /\d\d:\d\d/.test(String(desk.done)), desk.done);

        if (typeof room.stayDesk === 'function') room.stayDesk();
        say('the treatment consumes the appointment', !Story.planned(SPA_KEY, day));
        say('so a second walk-in is refused again', !!room.block, room.block);

        // Asked LAST, and deliberately. `Story.planned` is not a pure read: js/story.js:234 DELETES
        // the stored plan when the day it is asked about is not the day it was made for. So a
        // caller that asks "is anything booked for tomorrow" silently throws away today's
        // appointment — which is exactly what an earlier draft of this check did to itself, and is
        // the reason the two rows above only ever ask about `spaNow().day`.
        if (typeof desk.stayDesk === 'function') desk.stayDesk();
        say('asking about another day answers null', !Story.planned(SPA_KEY, day + 1));
        say('...and, being a delete, it takes the real plan with it',
          !Story.planned(SPA_KEY, day));
      }
    } catch (e) {
      say('spaCheck ran without throwing', false, String(e && e.message || e));
    }
    try { Story.cancelPlan(SPA_KEY); if (before) Story.plan(SPA_KEY, before.day, before.hour); }
    catch (_) {}
    const bad = checks.filter(c => !c.ok);
    return { ok:!bad.length, passed:checks.length - bad.length, total:checks.length,
             failures:bad, checks };
  }

  return Object.freeze({floors:FLOORS,api:1,departments:['laundry','engineering','security','housekeeping','spa'],
    spaCheck,spaKey:SPA_KEY,
    routes:{hotelB1:HOTEL_ROUTES.hotelB1,hotel4:HOTEL_ROUTES.hotel4}});
})();
