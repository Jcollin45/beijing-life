// 京华大酒店 · public floors 1 / 2 / 3
//
// This module owns the complete public guest journey.  The measured shell, entrance seam,
// directories, passenger/service lifts and fire stair remain in hotel.js; everything below is a
// registered fit-out.  That boundary is important: a future workplace chapter can replace a
// department's task logic without remodelling the public rooms or changing the vertical core.

const HotelPublicFit = (() => {
  const FLOORS = Object.freeze(['hotel','hotel2','hotel3']);

  try {
    Glyphs.need(
      '前台接待礼宾部行李房大堂茶廊水景银杏庭墨韵北京今日接待大楼梯门斗欢迎光临伦敦纽约' +
      '中餐厅全日餐厅私宴包间明档厨房后厨传菜口早餐自助京华宴服务通道厨房' +
      '宴会厅宴会前厅婚礼沙龙会议室商务中心签到处百年好合今日活动可分隔墙' +
      '京华雅集' +
      // The private-dining couplet and the apostrophe on the events board. 松鹤延年 rendered only
      // because js/hotel-f12.js registers 松鹤延 for the roof garden, so the lobby was borrowing the
      // rooftop's registration and any edit up there could blank a sign down here. The atlas is a
      // set — registering a character twice costs nothing — so the floor that draws it asks for it.
      '松鹤延年库' + "'" +
      '全日餐厅服务员吴晴会议协调员罗婷' +
      '一二三楼客梯服务梯安全出口' +
      'RECEPTIONCONCIERGEBELLDESKTEASALONARRIVALSGRANDSTAIR' +
      'CHINESEDININGALLDAYDININGPRIVATEDININGSHOWKITCHENSERVICE' +
      'BALLROOMPREFUNCTIONWEDDINGSALONMEETINGBUSINESSCENTREEVENTS'
    );
  } catch (_) {}

  function atelier(A) {
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,light,thing,luminous,onTick}=A;
    // Value range, regraded 2026-08-08. Measured on .audit-HT1-vestibule-inward: 24.1% of the
    // arrival frame sat above 82% sRGB and the grand stair was a field of near-white slabs.
    // ART.md is explicit — no interior surface above ~80% except a light fitting or a specular
    // hit, and a white-painted wall is 0.72–0.78. The pale end of this palette was 0.80–0.96,
    // which is why every material pass before this one was invisible: texture needs headroom to
    // be seen in, and against white it is crushed. Hues are unchanged; only value moved.
    const P = {
      limestone:A.C('#c2b7a2'), limestoneL:A.C('#cec6b8'), limestoneD:A.C('#a99b86'),
      walnut:A.C('#493329'), walnutL:A.C('#76513c'), walnutD:A.C('#2c211d'),
      bronze:A.C('#a7783e'), bronzeL:A.C('#d5aa68'), bronzeD:A.C('#62452c'),
      lacquer:A.C('#922f28'), lacquerD:A.C('#5b2826'), celadon:A.C('#7f9f8f'),
      celadonL:A.C('#a9bcb0'), jade:A.C('#3f6d5e'), ink:A.C('#202527'),
      inkL:A.C('#4a4d4a'), silk:A.C('#c1a48f'), silkRose:A.C('#a66e68'),
      warm:A.C('#ffe1a3'), cream:A.C('#d3ccbf'), glass:A.C('#8daab3'),
      glassD:A.C('#26363b'), water:A.C('#3f7a80'), copper:A.C('#b66935'),
      flame:A.C('#ff8a32'), leaf:A.C('#536f59'), carpet:A.C('#654947'),
      carpetGold:A.C('#b58d54'), steel:A.C('#83898b'), white:A.C('#d6d1c6'),
      red:A.C('#a32f29'), blue:A.C('#557f91'), black:A.C('#17191a'),
    };

    // ---- the material kit (H271, H272, H273, H277, H279) ------------------------------------
    //
    // Before this the whole tower carried exactly one triplanar material — `tile`, and only on
    // floor plates — so stone, timber and textile were separated by gloss alone and every large
    // surface was an untextured flat colour at close range. These four recipes are the whole kit
    // for floors 1/2/3.
    //
    // Each material name gets exactly ONE (matScale, matAmt, nrmAmt) tuple, and that is not
    // decoration: build.js:329-331 puts all three in the batch key, so a second tuple for the
    // same material splits every mesh that carries it into a second draw call. Vary colour and
    // gloss instead — both travel per instance and are free.
    //
    // Roughness is 1 - gloss (gl.js:778), so the gloss bands below ARE the roughness response
    // H271 asks for: stone .16-.22, timber .22-.30, aged bronze .30-.38, polished brass .74-.80,
    // textile .03-.09, glass .78-.88.
    const MAT = {
      // Limestone. `plaster` is nearly uniform in colour, so nrmAmt does the work and matAmt
      // stays low — a stone wall wants relief, not mottling.
      stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
      // Dark walnut. mode 6 already lays directional grain over this; the map adds the pore.
      timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
      // Carpet, silk, upholstery. mode 7's weave is deliberately quiet, which is why carpet has
      // been reading as a coloured slab; the map is what makes it a pile.
      cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
      // Stone paving/floor plate. Coarser than the wall recipe so a floor is not a wall lying down.
      paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
    };
    // Aged bronze against polished brass (H274). Same colour family, opposite specular; both
    // free, because gloss is per instance.
    const AGED = .34, POLISH = .78;

    const anim = (p,x,y,z,r=1) => {
      p.ob=null; p.fixed=true; p.cx=x; p.cy=y; p.cz=z; p.r=r; return p;
    };
    const fixture = (hz,x,z,zh,en,note,dept,focus=[x,z],reach=1.8,y=1.20) => {
      const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
      th.hotelFixture={floor:A.floor,department:dept,tag:hz,route:A.route};
      return th;
    };
    // The wayfinding panel. Its infill used to be mode 1 — the emissive/pane material, which the
    // lighting never touches — so an 8 m reception field came out as one unlit slab of flat
    // colour: the single loudest theme-park read in the building (H275, H279, H281). It is a
    // stretched textile panel now, lit like everything else and carrying the weave. The glyphs
    // stay mode 1, because signage IS the thing that should be brighter than its background.
    const zPanel = (x,y,z,w,h,zh,en,accent=P.silk,tag=zh) => {
      box(x,y,z,w,h,.16,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.32,tag});
      box(x,y,z-.085,w-.24,h-.22,.035,accent,{...MAT.cloth,hard:true,mode:7,gloss:.09,tag});
      box(x,y,z+.085,w-.24,h-.22,.035,accent,{...MAT.cloth,hard:true,mode:7,gloss:.09,tag});
      // yaw 0 faces +z; yaw PI faces -z. Public wayfinding must read from both directions.
      for(const [fz,yaw] of [[z-.115,Math.PI],[z+.115,0]]){
        glyphs(x,y+.18,fz,yaw,zh,{size:Math.min(.22,(w-.45)/Math.max(2,[...zh].length)),gap:.035,
          color:P.cream,mode:1,glow:.035,lift:.007,tag});
        if(en) glyphs(x,y-.25,fz,yaw,en,{size:Math.min(.082,(w-.42)/Math.max(2,[...en].length)),gap:.018,
          color:P.bronzeL,mode:1,glow:.025,lift:.007,tag});
      }
    };
    const xPanel = (x,y,z,w,h,zh,en,accent=P.silk,tag=zh,face=-Math.PI/2) => {
      box(x,y,z,.16,h,w,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.32,tag});
      box(x-(face<0?.085:-.085),y,z,.035,h,w-.24,accent,{...MAT.cloth,hard:true,mode:7,gloss:.09,tag});
      glyphs(x-(face<0?.11:-.11),y+.18,z,face,zh,{size:Math.min(.22,(w-.45)/Math.max(2,[...zh].length)),gap:.035,
        color:P.cream,mode:1,glow:.035,lift:.007,tag});
      if(en) glyphs(x-(face<0?.115:-.115),y-.25,z,face,en,{size:Math.min(.082,(w-.42)/Math.max(2,[...en].length)),gap:.018,
        color:P.bronzeL,mode:1,glow:.025,lift:.007,tag});
    };
    const portalZ = (x,z,w,zh,en,tag=zh) => {
      for(const s of [-1,1]) box(x+s*(w/2-.10),1.72,z,.20,3.44,.34,P.bronzeD,
        {hard:true,gloss:AGED,tag});
      box(x,3.34,z,w,.34,.34,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.34,tag});
      for(const [fz,yaw] of [[z-.19,Math.PI],[z+.19,0]]){
        glyphs(x,3.38,fz,yaw,zh,{size:Math.min(.19,(w-.6)/Math.max(2,[...zh].length)),gap:.032,
          color:P.bronzeL,mode:1,glow:.05,lift:.008,tag});
        if(en) glyphs(x,3.07,fz,yaw,en,{size:Math.min(.070,(w-.5)/Math.max(2,[...en].length)),gap:.015,
          color:P.cream,mode:1,lift:.008,tag});
      }
    };
    const lattice = (x,y,z,w,h,ry=0,tag='格栅') => {
      const n=Math.max(3,Math.round(w/.55));
      for(let i=0;i<=n;i++){
        const u=-w/2+i*w/n;
        const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        box(px,y,pz,.055,h,.055,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,ry,tag});
      }
      for(const v of [-h/2+.08,0,h/2-.08]) box(x,y+v,z,w,.055,.055,P.bronze,
        {hard:true,gloss:AGED,ry,tag});
    };
    const chair = (x,z,ry=0,c=P.silk,tag='座椅') => {
      box(x,.39,z,.55,.09,.53,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.25,ry,tag});
      box(x,.46,z,.60,.14,.58,c,{gloss:.05,mode:7,ry,tag});
      box(x,.545,z,.52,.035,.50,P.silk,{...MAT.cloth,gloss:.08,mode:7,ry,tag});
      const bx=x+Math.sin(ry)*.29,bz=z+Math.cos(ry)*.29;
      box(bx,.79,bz,.60,.70,.12,P.walnutD,{...MAT.timber,gloss:.25,mode:6,ry,tag});
      // Measured, because two lanes stopped here on the wrong diagnosis. The upholstered inset is
      // NOT buried — at .07 it stands .0325 proud of a .12-deep frame and reads correctly from the
      // front, which HT2-private-room shows on the far chair. Two things are actually wrong:
      //
      //  * the bronze rail sat at the inset's own centre, so a .018 rod inside a .0225 half-depth
      //    panel was swallowed whole and appeared from neither side. It stands .03 proud now.
      //  * the backrest had no rear face at all, so a chair seen from behind — which is what the
      //    包间 doorway camera looks straight at — was a featureless dark slab. A dining chair is
      //    upholstered on the sitter's side and panelled on the other; it has both faces now.
      const fx=bx-Math.sin(ry)*.07,fz=bz-Math.cos(ry)*.07;
      box(fx,.79,fz,.48,.54,.045,c,{...MAT.cloth,gloss:.05,mode:7,ry,tag});
      capsule(bx-Math.sin(ry)*.104,.79,bz-Math.cos(ry)*.104,.018,.40,.018,P.bronzeL,
        {rz:Math.PI/2,ry,gloss:POLISH,tag});
      box(bx+Math.sin(ry)*.075,.79,bz+Math.cos(ry)*.075,.46,.52,.035,P.walnutL,
        {...MAT.timber,hard:true,mode:6,gloss:.22,ry,tag});
      for(const dx of [-.23,.23]) for(const dz of [-.21,.21]) {
        const px=x+Math.cos(ry)*dx+Math.sin(ry)*dz;
        const pz=z-Math.sin(ry)*dx+Math.cos(ry)*dz;
        box(px,.20,pz,.055,.40,.055,P.walnut,{...MAT.timber,hard:true,mode:6,tag});
        cyl(px,.025,pz,.070,.05,P.bronzeD,{gloss:AGED,tag});
      }
    };
    const loungeChair = (x,z,ry=0,c=P.silk,tag='座椅') => {
      // An upholstered lounge chair is still assembled furniture: recessed bronze feet,
      // a shadow base, separate seat cushion and piping keep it off the "floating block" read.
      box(x,.31,z,.76,.12,.66,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.26,ry,tag});
      for(const dx of [-.32,.32]) for(const dz of [-.25,.25]){
        const px=x+Math.cos(ry)*dx+Math.sin(ry)*dz;
        const pz=z-Math.sin(ry)*dx+Math.cos(ry)*dz;
        taper(px,.145,pz,.085,.29,.065,P.walnutD,{gloss:.32,ry,tag});
        cyl(px,.032,pz,.105,.035,P.bronzeL,{gloss:POLISH,tag});
      }
      for(const dz of [-.25,.25]){
        const px=x+Math.sin(ry)*dz,pz=z+Math.cos(ry)*dz;
        box(px,.27,pz,.66,.065,.075,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.25,ry,tag});
      }
      // Substantial sled cheeks make the floor contact legible even in a distant salon camera.
      for(const s of [-1,1]){
        const ax=x+Math.cos(ry)*s*.34,az=z-Math.sin(ry)*s*.34;
        box(ax,.17,az,.085,.28,.62,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.27,ry,tag});
        box(ax,.035,az,.12,.055,.70,P.bronzeD,{hard:true,gloss:AGED,ry,tag});
      }
      box(x,.45,z,.88,.22,.78,c,{gloss:.045,mode:7,ry,tag});
      box(x,.575,z,.78,.045,.67,P.silk,{...MAT.cloth,gloss:.08,mode:7,ry,tag});
      const bx=x+Math.sin(ry)*.36,bz=z+Math.cos(ry)*.36;
      box(bx,.76,bz,.88,.62,.18,c,{gloss:.045,mode:7,ry,tag});
      box(bx-Math.sin(ry)*.105,.76,bz-Math.cos(ry)*.105,.78,.045,.54,P.silk,
        {...MAT.cloth,gloss:.08,mode:7,ry,tag});
      for(const s of [-1,1]) {
        const ax=x+Math.cos(ry)*s*.44,az=z-Math.sin(ry)*s*.44;
        box(ax,.56,az,.12,.28,.70,c,{gloss:.045,mode:7,ry,tag});
        capsule(ax,.705,az,.025,.56,.025,P.bronzeL,{rz:Math.PI/2,ry,gloss:POLISH,tag});
      }
      shade(x,z,.96,.88,.22);
    };
    const sofa = (x,z,w,ry=0,c=P.silk,tag='沙发') => {
      box(x,.31,z,w-.16,.12,.68,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.26,ry,tag});
      for(const dx of [-w/2+.24,w/2-.24]) for(const dz of [-.26,.26]){
        const px=x+Math.cos(ry)*dx+Math.sin(ry)*dz;
        const pz=z-Math.sin(ry)*dx+Math.cos(ry)*dz;
        taper(px,.145,pz,.085,.29,.065,P.walnutD,{gloss:.32,ry,tag});
        cyl(px,.032,pz,.105,.035,P.bronzeL,{gloss:POLISH,tag});
      }
      box(x,.45,z,w,.22,.82,c,{gloss:.045,mode:7,ry,tag});
      // Distinct cushions with a narrow reveal read as tailored upholstery at close range.
      const cushions=Math.max(2,Math.round(w/1.15));
      for(let i=0;i<cushions;i++){
        const u=-w/2+(i+.5)*w/cushions;
        const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        box(px,.575,pz,w/cushions-.055,.045,.69,P.silk,{...MAT.cloth,gloss:.08,mode:7,ry,tag});
      }
      const bx=x+Math.sin(ry)*.35,bz=z+Math.cos(ry)*.35;
      box(bx,.78,bz,w,.64,.18,c,{gloss:.045,mode:7,ry,tag});
      for(const s of [-1,1]) {
        const ax=x+Math.cos(ry)*s*(w/2-.08),az=z-Math.sin(ry)*s*(w/2-.08);
        box(ax,.57,az,.15,.30,.78,c,{gloss:.045,mode:7,ry,tag});
      }
      shade(x,z,w+.08,.94,.25);
    };
    // Stadium slabs give counters, tables and ceiling rafts a genuinely rounded plan without
    // changing their measured outer envelope.  The straight centre stops exactly where two
    // circular end pieces begin, so the silhouette reads as one fabricated hospitality piece.
    const stadium = (x,y,z,w,d,h,c,opts={}) => {
      const r=Math.min(d/2,w/2),core=Math.max(.02,w-r*2),parts=[];
      parts.push(box(x,y,z,core,h,d,c,{...opts}));
      for(const s of [-1,1]) parts.push(cyl(x+s*core/2,y,z,r,h,c,{...opts}));
      return parts;
    };
    const ceilingRaft = (x,z,w,d,accent=P.walnutD,tag='天花') => {
      stadium(x,A.H-.31,z,w,d,.12,accent,{...MAT.timber,hard:true,mode:6,gloss:.30,tag});
      const inset=stadium(x,A.H-.385,z,w-.30,d-.30,.025,P.warm,
        {hard:true,mode:1,gloss:.10,tag});
      for(const p of inset) luminous(p,.035,.17);
      capsule(x,A.H-.42,z,.022,w-.78,.022,P.bronzeL,
        {rz:Math.PI/2,gloss:POLISH,tag});
      return inset;
    };
    const lowTable = (x,z,w=1.25,d=.72,tag='茶桌') => {
      stadium(x,.48,z,w,d,.10,P.walnut,{...MAT.timber,gloss:.30,mode:6,tag});
      for(const s of [-1,1]) {
        taper(x+s*(w/2-.17),.25,z,.085,.48,.060,P.bronzeD,
          {hard:true,gloss:AGED,tag});
        cyl(x+s*(w/2-.17),.035,z,.11,.055,P.bronzeL,{gloss:POLISH,tag});
      }
    };
    const teaSet = (x,z,tag='茶桌') => {
      taper(x,.60,z,.24,.30,.24,P.celadon,{gloss:.24,tag});
      capsule(x+.27,.64,z,.08,.24,.08,P.celadon,{rz:Math.PI/2,gloss:.24,tag});
      for(const s of [-1,1]) cyl(x-.31,.58,z+s*.16,.10,.13,P.celadonL,{gloss:.20,tag});
    };
    const planter = (x,z,r=.62,h=.62,tag='绿化') => {
      // Footed, banded stoneware planter with an expressly branched ginkgo silhouette.
      cyl(x,.045,z,r*.62,.09,P.bronzeD,{gloss:AGED,tag});
      for(let i=0;i<4;i++){
        const a=Math.PI/4+i*Math.PI/2;
        cyl(x+Math.sin(a)*r*.39,.055,z+Math.cos(a)*r*.39,r*.11,.11,P.bronzeD,{gloss:AGED,tag});
      }
      taper(x,h*.48+.09,z,r*.88,h*.80,r*.72,P.limestoneD,{...MAT.stone,gloss:.18,tag});
      cyl(x,h*.17+.10,z,r*.82,.075,P.bronze,{gloss:AGED,tag});
      cyl(x,h*.82+.08,z,r,.12,P.limestoneL,{...MAT.stone,gloss:.22,tag});
      cyl(x,h*.88+.09,z,r*.86,.055,P.bronzeL,{gloss:POLISH,tag});
      capsule(x,h+0.47,z,.075,.94,.075,P.walnutD,{gloss:.18,tag});
      const branches=[[-.28,h+1.02,0,.62,.48], [.27,h+1.14,0,-.58,.45],
        [0,h+1.23,-.22,-.48,.38],[0,h+1.33,.24,.52,.40]];
      for(const [dx,y,dz,rot,len] of branches){
        capsule(x+dx*.48,y,z+dz*.48,.045,len,.045,P.walnutD,
          {rz:dx?rot:0,rx:dz?rot:0,gloss:.16,tag});
      }
      for(let i=0;i<13;i++){
        const a=i*2.399,rr=.22+(i%4)*.105;
        const col=i%5===0?P.celadon:i%3===0?P.jade:P.leaf;
        ball(x+Math.cos(a)*rr,h+1.23+(i%3)*.16,z+Math.sin(a)*rr,
          .16+(i%2)*.045,.095+(i%3)*.02,.13+(i%2)*.035,col,
          {mode:15,gloss:.08,ry:a,rz:(i%3-1)*.18,tag});
      }
    };
    const roundTable = (x,z,r=.95,seats=4,tag='餐桌',cloth=P.cream) => {
      cyl(x,.68,z,r,.13,cloth,{...MAT.cloth,gloss:.06,mode:7,tag});
      cyl(x,.36,z,.20,.68,P.walnut,{...MAT.timber,mode:6,gloss:.28,tag});
      for(let i=0;i<seats;i++){
        const a=i*Math.PI*2/seats,rr=r+.72;
        // `ry` points toward the chair back.  Keeping it on the radial outside means the seat
        // faces inward toward the lazy Susan rather than away from the table.
        chair(x+Math.sin(a)*rr,z+Math.cos(a)*rr,a,P.silk,tag);
      }
      shade(x,z,r*2+1.0,r*2+1.0,.24);
    };
    const placeSetting = (x,z,tag='餐桌') => {
      cyl(x,.76,z,.15,.018,P.white,{gloss:.22,tag});
      cyl(x+.18,.79,z-.08,.045,.11,P.celadon,{gloss:.20,tag});
      capsule(x-.20,.78,z,.018,.34,.018,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag});
    };
    const lantern = (x,y,z,scale=1,tag='吊灯') => {
      // A visible ceiling rose meets the measured underside (A.H-.26); the drop runs without a
      // gap into a ribbed silk drum.  Giving each part the lamp's full cull sphere prevents a
      // distant banquet view from keeping only the cord and losing its shade.
      const canopyY=A.H-.31,cordTop=canopyY-.05,lampTop=y+.24*scale;
      const cord=Math.max(.08,cordTop-lampTop);
      anim(cyl(x,canopyY,z,.15*scale,.10,P.bronzeD,{gloss:AGED,tag}),x,canopyY,z,.52*scale);
      anim(capsule(x,(lampTop+cordTop)/2,z,.024,cord,.024,P.bronze,
        {gloss:.65,tag}),x,(lampTop+cordTop)/2,z,.60*scale);
      anim(cyl(x,y+.235*scale,z,.205*scale,.045*scale,P.bronzeL,
        {gloss:.66,tag}),x,y+.235*scale,z,.52*scale);
      const p=luminous(taper(x,y,z,.175*scale,.42*scale,.175*scale,P.warm,
        {mode:1,alpha:.88,gloss:.18,tag}),.08,.34);
      anim(cyl(x,y-.235*scale,z,.205*scale,.045*scale,P.bronzeL,
        {gloss:.66,tag}),x,y-.235*scale,z,.52*scale);
      for(const s of [-1,1]) anim(capsule(x+s*.13*scale,y,z,.014,.38*scale,.014,P.bronze,
        {gloss:.60,tag}),x,y,z,.52*scale);
      return anim(p,x,y,z,.45*scale);
    };

    return {P,MAT,AGED,POLISH,anim,fixture,zPanel,xPanel,portalZ,lattice,chair,loungeChair,sofa,lowTable,teaSet,
      planter,roundTable,placeSetting,lantern,stadium,ceilingRaft,box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,
      glow,light,thing,luminous,onTick};
  }

  // -------------------------------------------------------------------------------------------
  // 1F · arrival, reception, concierge, tea lounge and the water / ink-art court
  HotelFit.register('hotel', A => {
    const T=atelier(A), {P,MAT,AGED,POLISH,anim,fixture,zPanel,xPanel,portalZ,lattice,loungeChair,sofa,lowTable,
      teaSet,planter,lantern,stadium,ceilingRaft,box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,
      glow,light,luminous,onTick}=T;

    // A central limestone runner pulls the eye from the real exterior threshold to the water
    // court.  Two hairline bronze bands continue into the vestibule and make the portal alignment
    // unmistakable even when the glass leaves are fully open.
    flat(0,.020,-5.2,5.25,18.8,P.limestoneL,{...MAT.paving,mode:7,gloss:.20,tag:'大堂'});
    for(const s of [-1,1]) flat(s*2.30,.025,-5.25,.045,18.9,P.bronze,{gloss:AGED,tag:'大堂'});
    flat(0,.027,-8.55,4.45,2.0,P.walnutD,{mode:7,gloss:.05,tag:'门斗'});

    // The core owns the outer automatic leaves at z=-15.  This second pair is the inner vestibule
    // set: standing between them gives a complete glass room, and looking out still sees the core's
    // forecourt, lane, taxi and opposite occupied facade.
    for(const s of [-1,1]){
      box(s*3.05,1.62,-12.92,.10,3.24,3.72,P.bronzeD,{hard:true,gloss:AGED,tag:'门斗'});
      box(s*3.00,1.60,-12.92,.035,3.10,3.50,P.glass,{hard:true,mode:1,alpha:.26,gloss:.82,tag:'门斗'});
      box(s*2.05,1.62,-11.08,.12,3.24,.22,P.bronzeD,{hard:true,gloss:AGED,tag:'门斗'});
    }
    box(0,3.30,-11.08,4.22,.32,.22,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.34,tag:'门斗'});
    glyphs(0,3.39,-11.205,Math.PI,'欢迎光临',{size:.20,gap:.055,color:P.bronzeL,mode:1,glow:.07,lift:.008,tag:'门斗'});
    glyphs(0,3.39,-10.995,0,'欢迎光临',{size:.20,gap:.055,color:P.bronzeL,mode:1,glow:.07,lift:.008,tag:'门斗'});
    const innerLeaves=[];
    for(const s of [-1,1]){
      const p=anim(box(s*.72,1.53,-11.12,1.36,2.84,.045,P.glass,
        {hard:true,mode:1,alpha:.34,gloss:.88,tag:'门斗'}),s*.72,1.53,-11.12,1.76);
      p._m0=p.m; innerLeaves.push({p,s});
      box(s*1.38,1.54,-11.10,.055,2.92,.12,P.bronze,{hard:true,gloss:AGED,tag:'门斗'});
    }
    fixture('门斗',0,-11.12,'内外两道自动门围成安静的迎宾门斗。',
      'Two automatic door lines form a calm arrival vestibule.',
      '门斗 is a vestibule between an outer and inner entrance.','front-office',[0,-12.05],2.2);

    // Concierge and bell are built into the south wall rather than carried on a freestanding
    // billboard.  This matters most in normal play: the arrival camera can now turn toward the
    // desk without ever crossing the back of a three-metre panel.
    const conciergeX=-10.40, conciergeWallZ=-14.56, conciergeDeskZ=-12.72;
    box(conciergeX,2.05,conciergeWallZ,5.40,2.92,.18,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.31,tag:'礼宾部'});
    for(let i=0;i<5;i++){
      const x=conciergeX-2.10+i*1.05, centre=i===2;
      box(x,2.03,conciergeWallZ+.105,.88,2.54,.035,centre?P.jade:P.celadon,
        {hard:true,mode:1,gloss:.24,tag:'礼宾部'});
      box(x,2.03,conciergeWallZ+.132,.70,2.28,.018,centre?P.ink:P.jade,
        {hard:true,mode:1,gloss:.20,tag:'礼宾部'});
      if(!centre) lattice(x,2.03,conciergeWallZ+.165,.65,2.18,0,'礼宾部');
    }
    for(const y of [.69,3.40]) box(conciergeX,y,conciergeWallZ+.17,5.16,.055,.07,P.bronzeL,
      {hard:true,gloss:POLISH,tag:'礼宾部'});
    glyphs(conciergeX,2.30,conciergeWallZ+.205,0,'礼宾部',{size:.18,gap:.045,color:P.cream,mode:1,glow:.04,lift:.008,tag:'礼宾部'});
    glyphs(conciergeX,1.88,conciergeWallZ+.21,0,'CONCIERGE',{size:.075,gap:.018,color:P.bronzeL,mode:1,lift:.006,tag:'礼宾部'});
    box(conciergeX,.62,conciergeDeskZ,1.72,.92,.86,P.walnut,{...MAT.timber,gloss:.30,mode:6,tag:'礼宾部'});
    for(const s of [-1,1]) box(conciergeX+s*1.43,.58,conciergeDeskZ,1.24,.80,.77,P.walnutL,
      {...MAT.timber,gloss:.28,mode:6,ry:-s*.12,tag:'礼宾部'});
    box(conciergeX,.10,conciergeDeskZ,3.92,.20,.66,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'礼宾部'});
    box(conciergeX,1.12,conciergeDeskZ,1.94,.14,1.02,P.limestoneL,{...MAT.stone,gloss:.24,tag:'礼宾部'});
    for(const s of [-1,1]) box(conciergeX+s*1.43,1.03,conciergeDeskZ,1.42,.13,.94,P.limestone,
      {...MAT.stone,gloss:.22,ry:-s*.12,tag:'礼宾部'});
    for(const x of [-11.78,-11.08,-10.40,-9.72,-9.02])
      box(x,.60,conciergeDeskZ+.395,.52,.50,.035,x===conciergeX?P.jade:P.lacquerD,
        {hard:true,mode:1,gloss:.20,tag:'礼宾部'});
    for(const y of [.34,.86]) box(conciergeX,y,conciergeDeskZ+.42,3.55,.035,.035,P.bronzeL,
      {hard:true,gloss:POLISH,tag:'礼宾部'});
    glyphs(conciergeX,.66,conciergeDeskZ+.455,0,'礼宾部',{size:.15,gap:.038,color:P.bronzeL,mode:1,lift:.008,tag:'礼宾部'});
    // Bell, telephone, tablet and pen tray all sit on the stone counter.
    cyl(conciergeX+.48,1.225,conciergeDeskZ-.17,.09,.09,P.bronzeL,{gloss:POLISH,tag:'礼宾部'});
    ball(conciergeX+.48,1.30,conciergeDeskZ-.17,.065,.055,.065,P.bronzeL,{gloss:POLISH,tag:'礼宾部'});
    box(conciergeX-.58,1.225,conciergeDeskZ-.14,.38,.10,.23,P.ink,{hard:true,gloss:.20,tag:'礼宾部'});
    capsule(conciergeX-.58,1.305,conciergeDeskZ-.14,.045,.31,.045,P.inkL,{rz:Math.PI/2,gloss:.23,tag:'礼宾部'});
    box(conciergeX-.02,1.30,conciergeDeskZ+.17,.48,.36,.045,P.glassD,{hard:true,mode:1,glow:.025,rx:.30,tag:'礼宾部'});
    box(conciergeX+1.08,1.205,conciergeDeskZ-.07,.46,.025,.22,P.bronzeD,{hard:true,gloss:AGED,tag:'礼宾部'});
    for(const s of [-1,1]) capsule(conciergeX+1.08+s*.10,1.235,conciergeDeskZ-.07,.012,.20,.012,P.cream,
      {rz:Math.PI/2,tag:'礼宾部'});
    solid(conciergeX-2.15,conciergeX+2.15,conciergeDeskZ-.52,conciergeDeskZ+.52);
    fixture('礼宾部',conciergeX,conciergeDeskZ,'礼宾员安排车辆、行李和城市礼遇。',
      'The concierge arranges cars, luggage and city hospitality.',
      '礼宾部 is the concierge and bell department.','concierge',[conciergeX,conciergeDeskZ+1.45],2.2);

    const trolley=[];
    for(const x of [-15.15,-13.72]){
      const parts=[];
      const z=-12.42;
      parts.push(anim(box(x,.18,z,1.05,.16,.62,P.bronzeD,{gloss:AGED,tag:'行李车'}),x,.18,z,1.4));
      for(const dx of [-.40,.40]) parts.push(anim(capsule(x+dx,.98,z,.045,1.70,.045,P.bronze,
        {gloss:.72,tag:'行李车'}),x+dx,.98,z,1.2));
      parts.push(anim(capsule(x,1.76,z,.045,.82,.045,P.bronze,{rz:Math.PI/2,gloss:AGED,tag:'行李车'}),x,1.76,z,1.2));
      for(const dx of [-.38,.38]) for(const dz of [-.22,.22])
        parts.push(anim(cyl(x+dx,.11,z+dz,.13,.08,P.ink,
          {rz:Math.PI/2,tag:'行李车'}),x+dx,.11,z+dz,.34));
      const caseC=x<-12?P.lacquerD:P.walnutL;
      parts.push(anim(box(x,.52,z,.76,.62,.48,caseC,{mode:7,gloss:.16,tag:'行李车'}),x,.52,z,.72));
      parts.push(anim(box(x,.52,z-.255,.62,.48,.025,P.walnutD,
        {hard:true,mode:6,gloss:.26,tag:'行李车'}),x,.52,z-.255,.60));
      for(const dx of [-.31,.31]){
        parts.push(anim(capsule(x+dx,.52,z-.275,.025,.50,.025,P.bronze,
          {gloss:.66,tag:'行李车'}),x+dx,.52,z-.275,.50));
        for(const y of [.25,.79]) parts.push(anim(ball(x+dx,y,z-.27,.055,.055,.035,P.bronzeL,
          {gloss:.66,tag:'行李车'}),x+dx,y,z-.27,.14));
      }
      for(const dx of [-.18,.18]) parts.push(anim(capsule(x+dx,.94,z,.018,.28,.018,P.bronzeD,
        {gloss:.62,tag:'行李车'}),x+dx,.94,z,.30));
      parts.push(anim(capsule(x,1.06,z,.024,.40,.024,P.bronzeD,
        {rz:Math.PI/2,gloss:.64,tag:'行李车'}),x,1.06,z,.42));
      trolley.push({parts,x,z});
    }
    fixture('行李车',-14.40,-12.42,'铜色行李车停在礼宾台旁边。',
      'Bronze luggage trolleys wait beside the bell desk.',
      '行李 luggage + 车 cart.','concierge',[-14.40,-11.25],2.0);

    // A live arrivals board and three clocks are recessed beside the entry opening.  The board is
    // readable on arrival while its back is absorbed by the measured south wall.
    const arrivalsX=-5.05, arrivalsZ=-14.56;
    zPanel(arrivalsX,2.00,arrivalsZ,3.25,2.30,'今日接待','GUEST RECEPTION',P.ink,'今日接待');
    // A single walnut clock rail continues the board frame upward, so the three dials are visibly
    // wall-mounted rather than detached discs above it.
    box(arrivalsX,3.38,arrivalsZ+.13,2.48,.56,.11,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'今日接待'});
    const boardBars=[];
    for(let i=0;i<4;i++){
      const b=luminous(box(arrivalsX,2.38-i*.34,arrivalsZ+.20,2.62,.055,.025,i%2?P.celadonL:P.bronzeL,
        {hard:true,mode:1,tag:'今日接待'}),.04,.13);
      anim(b,arrivalsX,2.38-i*.34,arrivalsZ+.20,1.5); boardBars.push(b);
    }
    // H221 · the three dials told the same fixed time forever — one hand each, at a hard-coded
    // angle. They are world clocks now, driven by the in-game clock the scene tick already
    // carries (minutes of day, Beijing). A hand pivots about the dial centre rather than its own
    // middle, so each is a real single-ended hand: `_m0` places it half its length above the
    // spindle and the tick rotates it about the spindle.
    const clockHands=[];
    let clockMin=-1;
    const ckA=new Float32Array(16), ckB=new Float32Array(16), ckR=new Float32Array(16);
    const CLOCK_CITY=[['北京',0],['伦敦',-8],['纽约',-13]];
    for(let i=0;i<3;i++){
      const cx=arrivalsX-.73+i*.73, cy=3.38, cz=arrivalsZ+.205;
      cyl(cx,cy,cz,.235,.030,P.bronzeD,{rx:Math.PI/2,gloss:AGED,tag:'今日接待'});
      cyl(cx,cy,cz+.018,.205,.030,P.cream,{...MAT.cloth,rx:Math.PI/2,mode:7,gloss:.10,tag:'今日接待'});
      // Twelve, three, six and nine only. At 0.20 m radius a full chapter ring is sub-pixel.
      for(const [dx,dy] of [[0,.165],[.165,0],[0,-.165],[-.165,0]])
        box(cx+dx,cy+dy,cz+.030,dx?.030:.014,dx?.014:.030,.010,P.ink,{hard:true,gloss:.16,tag:'今日接待'});
      for(const [len,w,c] of [[.115,.017,P.ink],[.170,.011,P.bronzeD]]){
        const h=anim(capsule(cx,cy+len/2,cz+.036,w,len,w,c,
          {gloss:c===P.ink?.16:AGED,tag:'今日接待'}),cx,cy,cz,.26);
        h._m0=h.m; clockHands.push({p:h,cx,cy,cz,fast:len>.14});
      }
      cyl(cx,cy,cz+.044,.022,.014,P.bronzeL,{rx:Math.PI/2,gloss:POLISH,tag:'今日接待'});
      glyphs(cx,cy-.30,cz+.030,0,CLOCK_CITY[i][0],
        {size:.072,gap:.018,color:P.bronzeL,mode:1,lift:.006,tag:'今日接待'});
    }
    fixture('今日接待',arrivalsX,arrivalsZ,'今日接待牌写着接机、用车和会议迎宾的安排。',
      "Today's reception board lists transfers, cars and conference welcomes.",
      '接待 means to receive guests; 接机 means meeting someone off a flight.','front-office',[arrivalsX,arrivalsZ+1.38],1.9);

    // Reception mirrors concierge on the south wall.  Its staff zone is enclosed by the wall and
    // counter instead of an isolated eight-metre screen in the middle of the lobby.  The entire
    // lift-to-door path therefore remains visible while the desk still reads as a grand arrival
    // destination from the vestibule.
    const receptionX=9.45, receptionWallZ=-14.56, receptionDeskZ=-12.70;
    // H275 · lacquer where lacquer would be. The reception field was 8.05 x 3.05 m of #a32f29
    // behind a gold grid — the "red-and-gold everywhere" the brief exists to refuse. The field is
    // silk now; the lacquer survives as one recessed reveal directly behind the house name, which
    // is the scale a lacquer panel is actually made at.
    zPanel(receptionX,2.14,receptionWallZ,8.05,3.05,'前台接待','RECEPTION',P.silk,'前台');
    box(receptionX,2.30,receptionWallZ+.100,2.62,1.22,.030,P.lacquer,{hard:true,gloss:.44,tag:'前台'});
    for(const s of [-1,1]) box(receptionX+s*1.33,2.30,receptionWallZ+.108,.045,1.30,.030,P.bronzeD,
      {hard:true,gloss:AGED,tag:'前台'});
    for(const yy of [1.68,2.92]) box(receptionX,yy,receptionWallZ+.108,2.70,.045,.030,P.bronzeD,
      {hard:true,gloss:AGED,tag:'前台'});
    for(let i=0;i<5;i++) lattice(receptionX-3.15+i*1.58,2.08,receptionWallZ+.19,1.28,2.52,0,'前台');
    box(receptionX,.10,receptionDeskZ,7.55,.20,1.10,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'前台'});
    box(receptionX,.67,receptionDeskZ,7.65,1.04,1.22,P.limestone,{...MAT.stone,gloss:.23,tag:'前台'});
    box(receptionX,1.23,receptionDeskZ,7.82,.14,1.40,P.limestoneL,{...MAT.stone,gloss:.25,tag:'前台'});
    box(receptionX,1.10,receptionDeskZ+.67,7.72,.18,.15,P.bronze,{hard:true,gloss:AGED,tag:'前台'});
    for(let i=0;i<5;i++){
      const x=receptionX-2.92+i*1.46;
      box(x,.68,receptionDeskZ+.625,1.16,.62,.035,i===2?P.jade:P.lacquerD,
        {hard:true,mode:1,gloss:.20,tag:'前台'});
      for(const yy of [.34,1.02]) box(x,yy,receptionDeskZ+.66,1.08,.035,.025,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'前台'});
    }
    // Lowered, knee-clear accessible end bay.
    box(receptionX+3.07,.53,receptionDeskZ,1.35,.78,1.48,P.limestoneL,{...MAT.stone,gloss:.20,tag:'前台'});
    box(receptionX+3.07,.095,receptionDeskZ,1.17,.19,1.30,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'前台'});
    box(receptionX+3.07,.53,receptionDeskZ+.71,1.03,.46,.035,P.jade,{hard:true,mode:1,gloss:.20,tag:'前台'});
    // Check-in terminals, card trays and desk lamps are physically based on the counter.
    for(const x of [receptionX-2.25,receptionX,receptionX+2.25]){
      capsule(x,1.39,receptionDeskZ,.022,.22,.022,P.bronzeD,{gloss:AGED,tag:'前台'});
      box(x,1.34,receptionDeskZ,.38,.035,.32,P.bronzeD,{hard:true,gloss:AGED,tag:'前台'});
      box(x,1.54,receptionDeskZ-.02,.72,.42,.075,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.27,tag:'前台'});
      luminous(box(x,1.54,receptionDeskZ+.025,.60,.32,.025,P.glassD,{hard:true,mode:1,tag:'前台'}),.025,.10);
      box(x-.16,1.325,receptionDeskZ+.35,.46,.025,.30,P.inkL,{hard:true,gloss:.18,tag:'前台'});
      for(let k=0;k<4;k++) box(x-.31+k*.10,1.342,receptionDeskZ+.37,.055,.008,.035,P.cream,
        {...MAT.cloth,hard:true,mode:7,tag:'前台'});
      box(x+.35,1.34,receptionDeskZ+.32,.18,.025,.30,P.bronzeD,{hard:true,gloss:AGED,tag:'前台'});
      box(x+.35,1.37,receptionDeskZ+.32,.12,.014,.24,P.cream,{...MAT.cloth,hard:true,mode:7,tag:'前台'});
      box(x+.67,1.34,receptionDeskZ+.30,.22,.09,.30,P.ink,{hard:true,gloss:.20,tag:'前台'});
      capsule(x+.67,1.42,receptionDeskZ+.34,.032,.23,.032,P.inkL,{rz:Math.PI/2,gloss:.22,tag:'前台'});
    }
    for(const x of [receptionX+2.39,receptionX+3.75]){
      box(x,.53,receptionDeskZ+.70,1.08,.54,.025,P.jade,{hard:true,mode:1,gloss:.20,tag:'前台'});
      for(const yy of [.28,.78]) box(x,yy,receptionDeskZ+.72,1.02,.035,.018,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'前台'});
    }
    solid(receptionX-3.95,receptionX+3.95,receptionDeskZ-.64,receptionDeskZ+.68);
    fixture('前台',receptionX,receptionDeskZ,'前台办理入住、退房并解答楼层问题。',
      'Reception handles check-in, check-out and floor enquiries.',
      '前台 is the front desk; 办理入住 means check in.','front-office',[receptionX,receptionDeskZ+1.52],2.1);

    // A shallow rounded ceiling raft makes the long check-in counter feel built into the room.
    // Its underside sits above the shared clear height and carries its own bronze datum and warm
    // light pool, while the circulation envelope and the counter collider remain untouched.
    ceilingRaft(receptionX,receptionDeskZ,8.75,2.55,P.walnutD,'前台天花');
    glow(M.trs(receptionX,.026,receptionDeskZ,0,5.2,1,2.5),P.warm,.055);

    // The previously blank south-east wall now terminates the reception view with a flush,
    // museum-style ginkgo relief.  Layered textile bays, three moon discs and thin bronze branches
    // stay entirely on the perimeter plane, adding depth without placing scenery in a guest path.
    const galleryX=17.28,galleryZ=-14.56;
    box(galleryX,2.08,galleryZ,7.55,2.72,.16,P.walnutD,
      {...MAT.timber,hard:true,mode:6,gloss:.30,tag:'大堂艺术墙'});
    for(let i=0;i<5;i++){
      const x=galleryX-2.88+i*1.44;
      box(x,2.08,galleryZ+.105,1.20,2.34,.035,i===2?P.jade:(i%2?P.silk:P.cream),
        {hard:true,mode:1,gloss:.12,tag:'大堂艺术墙'});
      for(const y of [.84,3.31]) box(x,y,galleryZ+.145,1.28,.035,.035,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'大堂艺术墙'});
    }
    for(const [dx,y,r,c] of [[-1.95,2.22,.48,P.lacquerD],[0,2.12,.66,P.celadonL],[1.98,2.28,.44,P.bronze]])
      cyl(galleryX+dx,y,galleryZ+.19,r,.035,c,{rx:Math.PI/2,mode:1,gloss:.20,tag:'大堂艺术墙'});
    for(const s of [-1,1]){
      capsule(galleryX+s*.98,2.03,galleryZ+.245,.030,2.18,.030,P.bronzeD,
        {rz:s*.82,gloss:AGED,tag:'大堂艺术墙'});
      for(let i=0;i<4;i++) ball(galleryX+s*(.32+i*.42),1.44+i*.42,galleryZ+.28,
        .20,.12,.035,i%2?P.celadon:P.bronzeL,{mode:15,ry:s*.35,rz:s*.22,gloss:.12,tag:'大堂艺术墙'});
    }
    luminous(box(galleryX,3.48,galleryZ+.19,6.95,.035,.045,P.warm,
      {hard:true,mode:1,tag:'大堂艺术墙'}),.045,.18);

    // Monumental stair: limestone treads float between walnut cheeks, with a bronze handrail and
    // a small gallery landing.  It is an architectural lobby stair, not a dishonest floor change;
    // the authored lift and fire stair remain the only vertical routes.
    for(let i=0;i<12;i++){
      const y=.11+i*.175,z=1.55+i*.62;
      box(-14.0,y,z,5.30,.22,.68,P.limestoneL,{...MAT.stone,hard:true,gloss:.19,tag:'大楼梯'});
      box(-14.0,y+.13,z-.30,5.15,.035,.08,P.bronzeL,{hard:true,gloss:POLISH,tag:'大楼梯'});
      const riserH=i? .175:.22,riserY=i? .1325+i*.175:.11;
      box(-14.0,riserY,z-.34,5.16,riserH,.08,P.limestone,
        {...MAT.stone,hard:true,gloss:.18,tag:'大楼梯'});
    }
    box(-14.0,2.23,9.0,5.35,.22,2.15,P.limestone,{...MAT.stone,hard:true,gloss:.18,tag:'大楼梯'});
    for(const s of [-1,1]){
      const x=-14+s*2.45;
      box(x,.98,5.02,.16,.20,7.62,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,rx:-.275,tag:'大楼梯'});
      for(let i=0;i<12;i++){
        const stepY=.22+i*.175,z=1.55+i*.62;
        cyl(x,stepY+.035,z-.05,.075,.07,P.bronzeD,{gloss:AGED,tag:'大楼梯'});
        box(x,stepY+.53,z-.05,.060,.99,.060,P.bronze,{hard:true,gloss:AGED,tag:'大楼梯'});
        cyl(x,stepY+1.035,z-.05,.070,.055,P.bronzeL,{gloss:POLISH,tag:'大楼梯'});
      }
      capsule(x,1.76,5.02,.055,7.45,.055,P.bronze,{rx:-1.296,gloss:AGED,tag:'大楼梯'});
      capsule(x,1.23,5.02,.035,7.45,.035,P.bronzeL,{rx:-1.296,gloss:POLISH,tag:'大楼梯'});
      for(const [y,z] of [[.74,1.30],[2.72,8.72]]){
        box(x,y,z,.13,1.28,.13,P.bronzeD,{hard:true,gloss:AGED,tag:'大楼梯'});
        ball(x,y+.68,z,.11,.11,.11,P.bronzeL,{gloss:POLISH,tag:'大楼梯'});
      }
    }
    solid(-16.78,-11.22,1.15,10.10);
    fixture('大楼梯',-14,5.2,'大楼梯通向大堂上层画廊，客房楼层请乘客梯。',
      'The grand stair reaches the lobby gallery; use the passenger lifts for guest floors.',
      '大楼梯 is a grand stair.','front-office',[-10.55,2.0],2.3,1.65);
    zPanel(-14.0,2.30,14.66,5.60,2.42,'大楼梯','GRAND STAIR',P.jade,'大楼梯');
    for(const x of [-16.18,-11.82]) lattice(x,2.30,14.52,.72,2.08,0,'大楼梯');
    box(-19.25,2.28,14.66,4.35,2.42,.16,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'大楼梯'});
    for(let i=0;i<3;i++){
      const x=-20.58+i*1.33;
      box(x,2.28,14.555,1.08,2.08,.035,i===1?P.jade:P.silk,
        {hard:true,mode:1,gloss:.16,tag:'大楼梯'});
      if(i!==1) lattice(x,2.28,14.515,.84,1.84,0,'大楼梯');
    }
    glyphs(-19.25,2.40,14.49,Math.PI,'京华',{size:.21,gap:.06,color:P.cream,mode:1,glow:.035,lift:.008,tag:'大楼梯'});
    glyphs(-19.25,1.94,14.485,Math.PI,'JINGHUA',{size:.075,gap:.018,color:P.bronzeL,mode:1,lift:.006,tag:'大楼梯'});

    // Tea lounge wraps the north-west side of the shared water court.  Every table is dressed,
    // every chair faces a real focal point, and steam proves the service is active.
    const teaWallZ=14.56;
    box(-8.85,2.24,teaWallZ,5.45,2.72,.18,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'茶廊'});
    for(const x of [-10.78,-9.49,-8.20,-6.91]){
      box(x,2.24,teaWallZ-.11,1.10,2.38,.035,P.celadon,{hard:true,mode:1,gloss:.20,tag:'茶廊'});
      lattice(x,2.24,teaWallZ-.15,.90,2.18,0,'茶廊');
    }
    box(-8.85,2.24,teaWallZ-.17,2.05,1.12,.055,P.jade,{hard:true,mode:1,gloss:.22,tag:'茶廊'});
    for(const y of [1.59,2.89]) box(-8.85,y,teaWallZ-.19,2.25,.045,.045,P.bronzeL,{hard:true,gloss:POLISH,tag:'茶廊'});
    glyphs(-8.85,2.45,teaWallZ-.23,Math.PI,'大堂茶廊',{size:.17,gap:.043,color:P.cream,mode:1,glow:.04,lift:.008,tag:'茶廊'});
    glyphs(-8.85,2.05,teaWallZ-.235,Math.PI,'TEA SALON',{size:.076,gap:.018,color:P.bronzeL,mode:1,lift:.006,tag:'茶廊'});
    flat(-8.6,.023,9.25,6.75,6.0,P.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'茶廊'});
    const steam=[];
    [[-9.55,7.55],[-7.00,10.35]].forEach(([x,z],i)=>{
      lowTable(x,z,1.25,.74,'茶桌'); teaSet(x,z,'茶桌');
      // Chair backs stay on the radial outside, leaving each sitter facing the tea table.
      loungeChair(x-1.08,z,-Math.PI/2,i===1?P.celadonL:P.silk,'茶桌');
      loungeChair(x+1.08,z,Math.PI/2,i===1?P.celadonL:P.silk,'茶桌');
      solid(x-1.48,x+1.48,z-.62,z+.62);
      for(let j=0;j<3;j++){
        const q=anim(ball(x+.02*(j-1),.90+j*.13,z,.075,.12,.075,P.cream,
          {mode:1,alpha:.18,glow:.025,tag:'茶桌'}),x,.90+j*.13,z,.32);
        q._m0=q.m; q._phase=i*1.7+j*.8; steam.push(q);
      }
    });
    fixture('茶桌',-9.4,7.6,'茶师用盖碗冲一泡京华茉莉。',
      'The tea host prepares a gaiwan of Beijing jasmine tea.',
      '盖碗 is a lidded tea bowl; 茉莉 is jasmine.','food-beverage',[-7.95,7.6],1.9);

    // The core supplies the water plane; a double stone coping, bronze inlay, anchored jets and
    // koi turn it into a constructed basin rather than a cyan rectangle with painted-on spots.
    for(const x of [-6.25,2.25]){
      box(x,.19,5.2,.40,.38,5.34,P.limestoneD,{...MAT.stone,hard:true,gloss:.18,tag:'水景'});
      box(x,.39,5.2,.58,.11,5.52,P.limestoneL,{...MAT.stone,hard:true,gloss:.23,tag:'水景'});
      box(x+(x<0?.20:-.20),.32,5.2,.045,.11,5.20,P.bronzeL,{hard:true,gloss:POLISH,tag:'水景'});
    }
    for(const z of [2.72,7.68]){
      box(-2.0,.19,z,8.90,.38,.40,P.limestoneD,{...MAT.stone,hard:true,gloss:.18,tag:'水景'});
      box(-2.0,.39,z,9.08,.11,.58,P.limestoneL,{...MAT.stone,hard:true,gloss:.23,tag:'水景'});
      box(-2.0,.32,z+(z<5? .20:-.20),8.72,.11,.045,P.bronzeL,{hard:true,gloss:POLISH,tag:'水景'});
    }
    for(const x of [-6.25,2.25]) for(const z of [2.72,7.68])
      cyl(x,.455,z,.16,.08,P.bronze,{gloss:AGED,tag:'水景'});
    // H220 / H271 / H279 · the basin was one flat teal rectangle. Mode 16 was tried here and is a
    // regression indoors: its grazing-angle uSky mix washes the surface to pale mint and the koi
    // come out as yellow slivers against it. Reverted, and given js/hotel-f4.js's measured
    // treatment instead — the one that made the pool stop reading as a slab.
    //
    // The whole trick is that everything laid ON the water is OPAQUE. An alpha < 0.999 prop does
    // not batch and costs a draw call each; a pale opaque streak a few percent lighter than the
    // water reads as a swell exactly as well as a translucent one. Tints stay within a few percent
    // of the water's own #3f7a80, because f4 measured that contrast and span were the fault, not
    // the technique: a band that spans the basin reads as a painted line, a band that stops short
    // of both edges reads as a swell.
    flat(-2.0,.038,5.20,8.02,4.42,P.glassD,{...MAT.paving,mode:0,gloss:.20,tag:'水景'});
    flat(-2.0,.116,5.20,7.98,4.38,P.water,{mode:1,alpha:.84,gloss:.90,tag:'水景'});
    // Second pass on the reflection tone. #74a29e against #3f7a80 came back from HT-PUB1-overview
    // as seven hard pale bars — f4's own first-pass failure, where contrast and span were the
    // fault rather than the technique. A few percent off the water, and narrower than the fitting.
    const swellC=A.C('#47848a'), swellH=A.C('#4d8b90'), reflW=A.C('#56888c');
    const swell=[];
    // Staggered in x and in length so no two share an end, each with its own drift rate.
    const SW=[[-3.90,3.20],[-1.10,3.90],[-2.95,2.60],[-.55,3.45]];
    for(let i=0;i<4;i++){
      const z=3.55+i*.95;
      const p=flat(SW[i][0],.1195+i*.0006,z,SW[i][1],.20+(i%2)*.09,
        i%2?swellC:swellH,{mode:1,gloss:.70,tag:'水景'});
      anim(p,SW[i][0],.12,z,2.6); p._m0=p.m; p._i=i; swell.push(p);
    }
    // Reflections placed from the real fixture coordinates — the seven lanterns hung over the
    // water court below sit at x -5..1, z 4.2/5.8 — smeared along z toward the arrival camera.
    // A painted reflection, meant to be read as one; it cannot go wrong the way a render-to-
    // texture can, and it moves with the swell.
    const refl=[];
    for(let i=0;i<7;i++){
      const x=-5+i, z=4.2+(i%2)*1.6;
      const p=flat(x,.1225,z,.15,.78,reflW,{mode:1,gloss:.82,glow:.02,tag:'水景'});
      anim(p,x,.122,z,1.0); p._m0=p.m; p._i=x*.31+z; refl.push(p);
    }
    // The coping is visually substantial and now physically substantial too: normal play cannot
    // walk through the water plane or strand the follow camera inside a fountain jet.
    solid(-6.58,2.58,2.40,8.00);
    const jets=[],koi=[],waterRings=[];
    for(let i=0;i<5;i++){
      const x=-4.85+i*1.42,z=4.25+(i%2)*1.45;
      cyl(x,.075,z,.095,.10,P.bronzeD,{gloss:AGED,tag:'水景'});
      cyl(x,.14,z,.055,.08,P.bronzeL,{gloss:POLISH,tag:'水景'});
      luminous(capsule(x,.255,z,.020,.23,.020,P.celadonL,
        {mode:1,alpha:.32,gloss:.76,tag:'水景'}),.025,.08);
      for(const r of [.16,.29]){
        const ring=luminous(cyl(x,.128,z,r,.010,P.celadonL,
          {mode:1,alpha:.58,gloss:.82,tag:'水景'}),.02,.06);
        cyl(x,.132,z,r-.042,.012,P.water,{mode:1,alpha:.96,gloss:.88,tag:'水景'});
        waterRings.push(ring);
      }
      const q=anim(ball(x,.365,z,.025,.045,.025,P.celadonL,
        {mode:1,alpha:.45,glow:.07,tag:'水景'}),x,.365,z,.20);
      q._m0=q.m;q._phase=i*.83;jets.push(q);
    }
    for(let i=0;i<4;i++){
      const x=-4.75+i*1.65,z=5.0+(i%2?-.62:.66),c=i%2?P.cream:P.copper;
      const parts=[];
      const body=anim(ball(x,.105,z,.28,.065,.11,c,{mode:15,gloss:.26,tag:'水景'}),x,.105,z,.42);
      body._m0=body.m;parts.push(body);
      for(const s of [-1,1]){
        const tail=anim(ball(x-.25,.105,z+s*.065,.13,.025,.075,P.lacquerD,
          {mode:15,gloss:.20,ry:s*.38,tag:'水景'}),x-.25,.105,z+s*.065,.22);
        tail._m0=tail.m;parts.push(tail);
        const fin=anim(ball(x-.01,.105,z+s*.10,.10,.018,.065,P.bronzeL,
          {mode:15,gloss:.22,ry:s*.28,tag:'水景'}),x-.01,.105,z+s*.10,.18);
        fin._m0=fin.m;parts.push(fin);
      }
      const eye=anim(ball(x+.22,.13,z-.065,.022,.022,.018,P.ink,{gloss:.18,tag:'水景'}),x+.22,.13,z-.065,.08);
      eye._m0=eye.m;parts.push(eye);
      koi.push({parts,x,z,phase:i*1.37});
    }
    planter(1.08,5.55,.72,.68,'银杏庭');
    // Museum-style, wall-mounted relief: a deep walnut shadow box, bronze inner frame, carved
    // stone/ink masses and brush-stroke ribbons, all proud of the pale backing on mounting pins.
    // The ink relief is a true north-wall installation.  The previous freestanding placement was
    // attractive from its beauty camera but its opaque back repeatedly swallowed the player camera.
    const artZ=14.56;
    box(-1.55,1.72,artZ,8.50,3.02,.24,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'墨韵北京'});
    box(-1.55,1.72,artZ-.145,8.14,2.68,.055,P.cream,{hard:true,mode:1,gloss:.11,tag:'墨韵北京'});
    for(const x of [-5.50,2.40]) box(x,1.72,artZ-.215,.055,2.56,.08,P.bronzeL,{hard:true,gloss:POLISH,tag:'墨韵北京'});
    for(const y of [.46,2.98]) box(-1.55,y,artZ-.215,7.96,.055,.08,P.bronzeL,{hard:true,gloss:POLISH,tag:'墨韵北京'});
    // Deliberately faceted brush bars: layered diagonals form three mountain ridges without the
    // renderer's thin-ellipsoid ring artifact. Narrow bronze reveals make every piece read as an
    // individually mounted relief element rather than a pile of primitive slabs.
    const strokes=[
      [-4.78,1.10,1.26,.16,.72,P.inkL],[-4.03,1.18,1.36,.18,-.78,P.ink],
      [-4.55,.88,.82,.10,.56,P.ink],[-3.82,.83,.74,.10,-.42,P.inkL],
      [-3.12,1.28,1.58,.18,.82,P.ink],[-2.16,1.38,1.72,.20,-.86,P.ink],
      [-2.85,.94,1.10,.11,.48,P.inkL],[-2.15,1.00,.98,.11,-.50,P.inkL],
      [-1.30,1.08,1.28,.17,.70,P.inkL],[-.52,1.14,1.36,.18,-.76,P.ink],
      [-1.02,.82,.82,.10,.40,P.ink],[.12,.82,.86,.11,-.38,P.inkL],
      [.42,.92,.74,.15,.66,P.inkL],[.90,.91,.70,.15,-.70,P.ink]
    ];
    for(const [x,y,w,h,rz,c] of strokes){
      box(x,y,artZ-.335,w+.10,h+.08,.075,P.bronzeD,{hard:true,gloss:AGED,rz,tag:'墨韵北京'});
      box(x,y,artZ-.385,w,h,.11,c,{...MAT.timber,hard:true,mode:6,gloss:.08,rz,tag:'墨韵北京'});
    }
    for(const [x,y,w,rz,c] of [[-3.90,.57,2.25,-.08,P.ink],[-2.30,.66,2.05,.07,P.inkL],[-.72,.54,1.62,-.04,P.ink]]){
      box(x,y,artZ-.40,w+.10,.12,.075,P.bronzeD,{hard:true,gloss:AGED,rz,tag:'墨韵北京'});
      box(x,y,artZ-.45,w,.055,.11,c,{...MAT.timber,hard:true,mode:6,gloss:.08,rz,tag:'墨韵北京'});
    }
    box(-1.55,.405,artZ-.28,7.72,.12,.22,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'墨韵北京'});
    luminous(box(-1.55,3.045,artZ-.27,7.72,.035,.055,P.warm,{hard:true,mode:1,tag:'墨韵北京'}),.04,.16);
    glyphs(-1.55,2.68,artZ-.26,Math.PI,'墨韵北京',{size:.18,gap:.045,color:P.bronze,mode:1,glow:.03,lift:.008,tag:'墨韵北京'});
    solid(-5.78,2.68,14.18,14.82);
    fixture('水景',-2,5.2,'浅水庭映着银杏、铜灯和墨色山影。',
      'The shallow court reflects ginkgo, bronze lanterns and ink-dark mountains.',
      '水景 is a water feature; 墨韵 is the resonance of ink.','front-office',[3.1,4.0],2.4);
    fixture('墨韵北京',-1.55,artZ-.25,'层叠石片把北京西山画成一幅立体水墨。',
      'Layered stone turns Beijing\'s western hills into a three-dimensional ink painting.',
      '水墨 is ink-wash painting.','front-office',[-1.55,12.82],2.0);

    // A restrained ginkgo chandelier hangs over the clear arrival axis. Three ceiling rails carry
    // an ordered staggered array, so no suspension reads as an orphan rod.
    const leaves=[];
    // The rails are flush to the ceiling plane.  This is deliberately simpler than a second
    // layer of tiny suspension hardware: in the long arrival view even a correctly modelled
    // short hanger can cull independently and leave the rail appearing to float.
    const chandelierRailY=A.H-.33;
    for(const z of [-3.58,-3.02]){
      box(0,chandelierRailY,z,3.85,.14,.16,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'吊灯'});
    }
    for(let row=0;row<2;row++) for(let i=0;i<5;i++){
      const x=-1.40+i*.70+(row?.35:0),z=-3.58+row*.56;
      const y=3.48-row*.14-(i%2)*.07,a=(i+row)*.62;
      cyl(x,chandelierRailY-.075,z,.055,.08,P.bronzeD,{gloss:AGED,tag:'吊灯'});
      capsule(x,(chandelierRailY+y)/2,z,.018,chandelierRailY-y,.018,P.bronzeD,{gloss:AGED,tag:'吊灯'});
      const q=anim(ball(x,y,z,.12,.055,.18,row%2?P.bronzeL:P.warm,
        {mode:1,glow:.16,ry:a,tag:'吊灯'}),x,y,z,.36);
      q._m0=q.m;q._phase=row*1.6+i*.73;leaves.push(q);
    }
    glow(M.trs(0,.026,-3.3,0,5.4,1,5.4),P.warm,.08);
    light(0,3.55,-3.3,[1,.78,.50],.58,7.5);

    // Anchor the seven starter lanterns supplied by HotelCore over the water court. Two dropped
    // tracks organize the alternating array; framed celadon shades terminate every suspension.
    const waterTrackY=A.H-.33;
    for(const z of [4.2,5.8])
      box(-2,waterTrackY,z,6.45,.14,.14,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'吊灯'});
    for(let i=0;i<7;i++){
      const x=-5+i,z=4.2+(i%2)*1.6;
      const trackBottom=waterTrackY-.07,shadeTop=3.565;
      anim(capsule(x,(trackBottom+shadeTop)/2,z,.022,trackBottom-shadeTop,.022,P.bronzeD,
        {gloss:.65,tag:'吊灯'}),x,(trackBottom+shadeTop)/2,z,.58);
      anim(cyl(x,3.51,z,.19,.055,P.bronzeL,{gloss:POLISH,tag:'吊灯'}),x,3.51,z,.46);
      anim(luminous(cyl(x,3.35,z,.17,.27,P.celadonL,
        {mode:1,alpha:.38,gloss:.48,tag:'吊灯'}),.06,.20),x,3.35,z,.48);
      anim(cyl(x,3.18,z,.19,.055,P.bronzeL,{gloss:POLISH,tag:'吊灯'}),x,3.18,z,.46);
    }

    // A quiet seating island bridges reception and water court without occupying the path.
    // A generous bordered carpet, paired inward-facing chairs, rounded tables and a shaded floor
    // lamp make this a professional waiting vignette rather than furniture adrift on bare stone.
    // Keep the lift-to-lobby waypoint at (5,-3.7) genuinely open for a 0.30 m player.  The
    // former island sat directly on that protected guest route; translating the complete group
    // north-east preserves its conversational composition while turning it into a destination
    // beside the arrival axis rather than a barricade across it.
    flat(7.15,.023,.02,4.20,4.15,P.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'大堂等候区'});
    for(const x of [5.14,9.16]) flat(x,.028,.02,.045,4.00,P.carpetGold,{gloss:.64,tag:'大堂等候区'});
    for(const z of [-1.96,2.00]) flat(7.15,.028,z,4.08,.045,P.carpetGold,{gloss:.64,tag:'大堂等候区'});
    for(const s of [-1,1]) ball(7.15+s*.50,.031,.02,.46,.012,.22,
      s<0?P.silkRose:P.carpetGold,{mode:7,gloss:.05,ry:s*.58,tag:'大堂等候区'});
    sofa(7.10,.82,2.45,0,P.silkRose,'大堂');
    // Aim each chair at the centre of the coffee table.  The lounge-chair helper stores its
    // backrest along +local Z, so the yaw below is the outward (chair-to-back) vector.
    loungeChair(6.38,-1.02,Math.atan2(6.38-7.15,-1.02-(-.08)),P.celadonL,'大堂');
    loungeChair(7.82,-1.02,Math.atan2(7.82-7.15,-1.02-(-.08)),P.silk,'大堂');
    lowTable(7.15,-.08,1.36,.78,'大堂');
    for(const x of [6.15,8.05]){
      cyl(x,.43,.78,.28,.075,P.limestoneL,{...MAT.stone,gloss:.23,tag:'大堂'});
      taper(x,.23,.78,.10,.42,.075,P.bronzeD,{gloss:AGED,tag:'大堂'});
      cyl(x,.025,.78,.15,.05,P.bronzeL,{gloss:POLISH,tag:'大堂'});
    }
    // Low floor lamp: weighted base, tapered stem, silk shade and warm local pool.
    cyl(6.10,.035,1.34,.22,.07,P.bronzeD,{gloss:AGED,tag:'大堂'});
    taper(6.10,.77,1.34,.050,1.42,.035,P.bronzeL,{gloss:POLISH,tag:'大堂'});
    luminous(taper(6.10,1.48,1.34,.25,.40,.18,P.warm,
      {mode:1,alpha:.82,gloss:.16,tag:'大堂'}),.09,.32);
    cyl(6.10,1.69,1.34,.19,.04,P.bronzeL,{gloss:POLISH,tag:'大堂'});
    solid(5.85,8.35,-1.75,1.55);
    planter(8.72,1.66,.46,.48,'绿化');
    // Dress the two HotelCore entrance pots so their measured stone volumes read as planted urns.
    planter(-5.8,-9.6,.76,.64,'银杏');
    planter(5.8,-9.6,.76,.64,'银杏');

    // An east-side wall treatment completes the north elevation without sitting behind the ink
    // relief or tea salon.  The earlier thirteen-metre overlay occupied the same plane as both and
    // produced duplicated, flickering panels whenever the camera moved laterally.
    box(7.45,2.02,14.56,7.35,2.48,.055,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'大堂'});
    for(let i=0;i<4;i++){
      const x=4.75+i*1.80,centre=i===2;
      box(x,2.02,14.515,1.52,2.14,.025,centre?P.lacquerD:P.silk,
        {hard:true,mode:1,gloss:.16,tag:'大堂'});
      if(!centre) lattice(x,2.02,14.485,1.26,1.88,0,'大堂');
    }
    glyphs(7.45,2.24,14.46,Math.PI,'京华大堂',{size:.18,gap:.045,color:P.cream,mode:1,glow:.04,lift:.008,tag:'大堂'});
    glyphs(7.45,1.82,14.455,Math.PI,'JINGHUA LOBBY',{size:.074,gap:.017,color:P.bronzeL,mode:1,lift:.006,tag:'大堂'});

    let innerOpen=1;
    onTick((t,body,clock,dt)=>{
      const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
      const near=Math.abs(bx)<3.0&&Math.abs(bz+11.25)<3.8;
      const target=near?1:0;
      innerOpen+=(target-innerOpen)*(1-Math.exp(-dt*(target?7.2:4.0)));
      for(const q of innerLeaves) q.p.m=M.mul(M.trans(q.s*1.22*innerOpen,0,0),q.p._m0);
      // Parked luggage trolleys stay parked.  Their previous unsupported oscillation looked like
      // ghost motion because no bell attendant was pushing them.
      for(const q of steam){
        const u=(t*.20+q._phase)%1,dy=u*.42;
        q.m=M.mul(M.trans(0,dy,0),q._m0);q.alpha=.20*(1-u);q.glow=.018+.018*(1-u);
      }
      for(const q of jets){
        const u=(t*.34+q._phase)%1;
        q.m=M.mul(M.trans(0,.22*Math.sin(u*Math.PI),0),q._m0);q.alpha=.18+.38*Math.sin(u*Math.PI);
      }
      for(const q of koi){
        const a=t*.20+q.phase,dx=Math.cos(a)*.34,dz=Math.sin(a)*.20;
        const R=M.mul(M.trans(q.x+dx,0,q.z+dz),M.mul(M.rotY(-a),M.trans(-q.x,0,-q.z)));
        for(const p of q.parts)p.m=M.mul(R,p._m0);
      }
      for(const q of leaves){
        q.m=M.mul(M.trans(0,.025*Math.sin(t*.55+q._phase),0),q._m0);
        q.glow=.11+.09*(.5+.5*Math.sin(t*.82+q._phase));
      }
      for(let i=0;i<boardBars.length;i++) boardBars[i].glow=.04+.05*(.5+.5*Math.sin(t*.75+i*.8));
      for(const p of swell){
        const i=p._i;
        p.m=M.mul(M.trans(Math.sin(t*(.13+i*.021)+i*1.7)*.85,0,Math.sin(t*.09+i*2.1)*.07),p._m0);
        p.glow=.012+.022*(.5+.5*Math.sin(t*.37+i*.9));
      }
      for(const p of refl){
        const i=p._i;
        p.m=M.mul(M.trans(Math.sin(t*.21+i)*.055,0,Math.sin(t*.16+i*1.3)*.10),p._m0);
        p.glow=.035+.030*(.5+.5*Math.sin(t*.44+i));
      }
      // The world clocks move once an in-game minute, not once a frame. Guarding on the whole
      // minute is what makes six pivoted hands cost nothing: the matrix work below runs about
      // once every few hundred frames instead of six times every frame.
      const mins=Math.round(Number(clock)||0);
      if(mins!==clockMin){
        clockMin=mins;
        for(let i=0;i<clockHands.length;i++){
          const q=clockHands[i], off=CLOCK_CITY[i>>1][1]*60;
          const local=((mins+off)%1440+1440)%1440;
          // Viewed from +z the dial turns clockwise for a NEGATIVE rotation about +Z.
          const a=q.fast ? -2*Math.PI*((local%60)/60)
                         : -2*Math.PI*((local%720)/720);
          M.mul(M.rotZ(a,ckA),M.trans(-q.cx,-q.cy,-q.cz,ckB),ckR);
          M.mul(M.trans(q.cx,q.cy,q.cz,ckA),ckR,ckR);
          q.p.m=M.mul(ckR,q.p._m0,q.p._mw||(q.p._mw=new Float32Array(16)));
        }
      }
      A.state.public={vestibuleOpen:+innerOpen.toFixed(3),waterJets:jets.length,
        waterRings:waterRings.length,koi:koi.length,
        chandelierLeaves:leaves.length,trolleys:trolley.length};
    });
  });

  // -------------------------------------------------------------------------------------------
  // 2F · all-day restaurant, Chinese dining, private rooms and a complete kitchen seam
  HotelFit.register('hotel2', A => {
    const T=atelier(A), {P,MAT,AGED,POLISH,anim,fixture,zPanel,xPanel,portalZ,lattice,chair,roundTable,placeSetting,
      planter,lantern,stadium,ceilingRaft,box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,
      light,luminous,onTick}=T;

    // The lift opens onto a broad host gallery.  A celadon path turns west to the dining rooms;
    // the service lift route remains clear on the far east edge.
    flat(4.0,.022,-3.7,23.0,2.35,P.limestoneL,{...MAT.paving,mode:7,gloss:.18,tag:'餐饮'});
    for(const s of [-1,1]) flat(4.0,.027,-3.7+s*1.05,23.0,.045,P.bronze,{gloss:AGED,tag:'餐饮'});
    zPanel(1.0,2.04,-1.82,4.6,2.45,'京华宴','DINING',P.jade,'餐厅接待');
    for(const x of [-.65,2.65]) lattice(x,2.04,-1.93,.74,2.08,0,'餐厅接待');
    box(1.0,.10,-2.72,2.24,.20,.62,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'餐厅接待'});
    box(1.0,.65,-2.72,2.05,.90,.74,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'餐厅接待'});
    for(const x of [.36,1.0,1.64]) box(x,.65,-3.105,.50,.52,.035,x===1?P.jade:P.lacquerD,
      {hard:true,mode:1,gloss:.20,tag:'餐厅接待'});
    box(1.0,1.17,-2.72,2.25,.14,.92,P.limestoneL,{...MAT.stone,gloss:.23,tag:'餐厅接待'});
    box(1.0,1.28,-3.10,1.70,.08,.15,P.bronzeL,{hard:true,gloss:POLISH,tag:'餐厅接待'});
    cyl(.38,1.30,-2.83,.075,.07,P.bronzeL,{gloss:POLISH,tag:'餐厅接待'});
    box(1.55,1.29,-2.70,.38,.24,.035,P.glassD,{hard:true,mode:1,glow:.025,rx:-.24,tag:'餐厅接待'});
    box(1.0,.08,-2.72,1.80,.16,.58,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'餐厅接待'});
    fixture('餐厅接待',1.0,-2.72,'接待员安排全日餐厅、中餐厅和私宴包间。',
      'The host assigns all-day, Chinese and private dining tables.',
      '接待员 is a host; 包间 is a private room.','food-beverage',[2.35,-3.45],1.9);

    // Chinese restaurant: walnut portal, celadon carpet, screen walls and three fully set round
    // tables.  A long view through the portal terminates on the core's 中餐厅 identity wall.
    portalZ(-7.0,-.15,7.4,'中餐厅','CHINESE DINING','中餐厅');
    flat(-7.1,.023,4.5,14.8,8.4,P.celadon,{...MAT.cloth,mode:7,gloss:.035,tag:'中餐厅'});
    for(const x of [-13.8,-.4]) lattice(x,1.75,4.45,6.9,3.05,Math.PI/2,'中餐厅');
    const lazy=[];
    [[-11.4,3.45],[-7.2,3.20],[-2.45,3.45]].forEach(([x,z],i)=>{
      // hotel.js supplies the centre table as the floor's starter anchor; dress that measured
      // piece instead of building a second table through it.
      if(i!==1) roundTable(x,z,1.03,4,'餐桌',P.cream);
      else {
        cyl(x,.36,z,.21,.68,P.walnut,{...MAT.timber,mode:6,gloss:.28,tag:'餐桌'});
        for(let j=0;j<4;j++){
          const a=j*Math.PI/2;chair(x+Math.sin(a)*1.70,z+Math.cos(a)*1.70,a,P.silk,'餐桌');
        }
      }
      const disc=anim(cyl(x,.775,z,.48,.035,P.celadonL,{gloss:.36,tag:'餐桌'}),x,.775,z,1.2);
      disc._m0=disc.m; disc._phase=i*.9;
      const dishes=[];
      for(let j=0;j<4;j++){
        const a=j*Math.PI/2;
        const q=anim(cyl(x+Math.sin(a)*.30,.82,z+Math.cos(a)*.30,.12,.025,
          j%2?P.lacquer:P.white,{gloss:.22,tag:'餐桌'}),x,.82,z,1.15);
        q._m0=q.m;dishes.push(q);
      }
      lazy.push({x,z,disc,dishes,phase:i*.8});
      for(let j=0;j<4;j++){
        const a=j*Math.PI/2;
        placeSetting(x+Math.sin(a)*.68,z+Math.cos(a)*.68,'餐桌');
      }
    });
    fixture('餐桌',-7.2,3.20,'圆桌中央的转盘缓缓转动，方便大家夹菜。',
      'The lazy Susan turns slowly so everyone can share the dishes.',
      '转盘 is the rotating tray on a Chinese banquet table.','food-beverage',[-5.2,3.20],2.0);

    // Dress the two measured HotelCore identity walls as framed Chinese architectural screens.
    // Their actual wall planes remain the room boundary; these applied bays remove the billboard read.
    for(const [sx,c,title,en] of [[-7.2,P.lacquer,'中餐厅','CHINESE DINING'],[7.2,P.jade,'全日餐厅','ALL DAY DINING']]){
      box(sx,1.98,7.655,5.48,2.18,.055,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:title});
      for(let i=0;i<3;i++){
        const x=sx-1.72+i*1.72;
        box(x,1.98,7.615,1.47,1.86,.025,c,{...MAT.cloth,hard:true,mode:7,gloss:.09,tag:title});
        if(i!==1) lattice(x,1.98,7.585,1.22,1.61,0,title);
      }
      glyphs(sx,2.18,7.565,Math.PI,title,{size:.21,gap:.052,color:P.cream,mode:1,glow:.04,lift:.008,tag:title});
      glyphs(sx,1.72,7.56,Math.PI,en,{size:.072,gap:.016,color:P.bronzeL,mode:1,lift:.006,tag:title});
      for(const y of [.83,3.13]) box(sx,y,7.59,5.25,.045,.05,P.bronzeL,{hard:true,gloss:POLISH,tag:title});
    }

    // All-day dining occupies the bright south-east quadrant.  Buffet islands form bays rather
    // than a wall, keeping a direct route back to the passenger lifts.
    zPanel(5.15,2.20,-13.08,7.2,2.55,'全日餐厅','ALL DAY DINING',P.jade,'全日餐厅');
    flat(4.2,.023,-8.0,14.5,7.9,P.limestone,{...MAT.paving,mode:7,gloss:.15,tag:'全日餐厅'});
    for(const x of [.2,4.15,8.1]){
      box(x,.12,-10.2,2.88,.24,.94,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'早餐自助'});
      box(x,.73,-10.2,3.05,.98,1.12,P.limestoneD,{...MAT.stone,gloss:.19,tag:'早餐自助'});
      // Three inset cabinet bays with brass dividers, a continuous toe-kick and foot rail.
      for(let j=0;j<3;j++){
        const px=x-.92+j*.92;
        box(px,.70,-9.628,.76,.62,.035,j===1?P.jade:P.walnut,
          {hard:true,mode:j===1?1:6,gloss:.25,tag:'早餐自助'});
        for(const y of [.38,1.02]) box(px,y,-9.65,.70,.026,.035,P.bronzeL,{hard:true,gloss:POLISH,tag:'早餐自助'});
      }
      // Rounded stone cap and tapered end hardware soften the three service islands while
      // preserving the original 3.28 x 1.30 m countertop envelope.
      stadium(x,1.27,-10.2,3.28,1.30,.14,P.limestoneL,{...MAT.stone,gloss:.25,tag:'早餐自助'});
      for(const s of [-1,1]){
        taper(x+s*1.43,.72,-10.2,.18,.92,.14,s<0?P.jade:P.walnutL,
          {mode:s<0?1:6,gloss:.26,tag:'早餐自助'});
        cyl(x+s*1.43,.245,-10.2,.20,.055,P.bronzeL,{gloss:POLISH,tag:'早餐自助'});
      }
      capsule(x,.35,-9.48,.035,2.68,.035,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'早餐自助'});
      for(const px of [x-1.15,x+1.15]) capsule(px,.35,-9.72,.025,.48,.025,P.bronzeD,{rx:Math.PI/2,gloss:AGED,tag:'早餐自助'});
      // Sneeze guard: four fixed posts, glass, and a bronze cap rail visibly tied to the counter.
      for(const px of [x-1.18,x+1.18]){
        capsule(px,1.73,-10.30,.028,.82,.028,P.bronze,{gloss:AGED,tag:'早餐自助'});
        cyl(px,1.31,-10.30,.075,.055,P.bronzeD,{gloss:AGED,tag:'早餐自助'});
      }
      box(x,1.76,-10.30,2.36,.72,.035,P.glass,{hard:true,mode:1,alpha:.28,gloss:.82,tag:'早餐自助'});
      capsule(x,2.13,-10.30,.032,2.48,.032,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'早餐自助'});
      // Varied serviceware and food, all resting on the stone counter.
      for(let j=0;j<3;j++){
        const px=x-.82+j*.82;
        box(px,1.365,-10.04,.60,.055,.48,P.steel,{hard:true,gloss:.42,tag:'早餐自助'});
        box(px,1.405,-10.04,.50,.035,.38,P.glassD,{hard:true,mode:1,gloss:.30,tag:'早餐自助'});
        for(const s of [-1,1]) capsule(px+s*.28,1.42,-10.04,.018,.16,.018,P.bronzeL,
          {rz:Math.PI/2,gloss:POLISH,tag:'早餐自助'});
        if(j===1){
          ball(px,1.455,-10.04,.22,.055,.16,P.leaf,{mode:15,gloss:.18,tag:'早餐自助'});
          for(const s of [-1,1]) ball(px+s*.11,1.47,-10.02,.08,.045,.07,s<0?P.flame:P.copper,
            {mode:15,gloss:.16,tag:'早餐自助'});
        } else {
          // Roll-top chafers alternate with the open plated-food pan.
          ball(px,1.505,-10.08,.25,.10,.19,P.steel,{mode:15,gloss:.46,tag:'早餐自助'});
          cyl(px,1.60,-10.08,.045,.055,P.bronzeL,{gloss:POLISH,tag:'早餐自助'});
        }
      }
      taper(x+1.13,1.50,-10.02,.20,.38,.16,P.celadon,{gloss:.24,tag:'早餐自助'});
      cyl(x+1.13,1.70,-10.02,.16,.04,P.bronzeL,{gloss:POLISH,tag:'早餐自助'});
      ceilingRaft(x,-10.2,3.45,1.68,P.walnutD,'早餐自助天花');
    }
    [[1.0,-6.8],[5.3,-6.75],[9.2,-7.5]].forEach(([x,z],i)=>{
      // Capsule-plan dining tops replace the former straight slabs; their extents and seat
      // centres stay identical, so the audited approaches remain unchanged.
      stadium(x,.66,z,2.25,.92,.12,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'全日餐厅'});
      stadium(x,.745,z,2.42,1.02,.055,P.bronzeL,{hard:true,gloss:POLISH,tag:'全日餐厅'});
      for(const dx of [-.82,.82]) for(const dz of [-.30,.30])
        taper(x+dx,.32,z+dz,.065,.64,.050,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.25,tag:'全日餐厅'});
      for(const s of [-1,1]) chair(x+s*1.50,z,s<0?-Math.PI/2:Math.PI/2,i===1?P.celadonL:P.silk,'全日餐厅');
      for(const s of [-.55,.55]) placeSetting(x+s,z,'全日餐厅');
      taper(x,.84,z,.105,.18,.08,P.celadon,{gloss:.24,tag:'全日餐厅'});
      for(const s of [-1,1]) ball(x+s*.10,.96,z,.10,.055,.075,
        s<0?P.leaf:P.silkRose,{mode:15,ry:s*.35,tag:'全日餐厅'});
      lantern(x,3.58,z,.70,'全日餐厅');
    });
    fixture('早餐自助',4.15,-10.2,'早餐台有热食、水果、面包和北京小吃。',
      'The breakfast buffet has hot dishes, fruit, bread and Beijing snacks.',
      '自助 means self-service or buffet.','food-beverage',[4.15,-8.85],1.9);
    fixture('全日餐厅',5.3,-6.75,'全日餐厅从早餐一直服务到夜宵。',
      'The all-day restaurant serves from breakfast through late supper.',
      '全日 means all day.','food-beverage',[6.6,-6.75],1.9);

    // Two private dining rooms sit beyond open moon-gate-like portals.  Their tables, artwork and
    // service credenzas are visible from the restaurant, so neither opening ends on a blank shell.
    for(const [x,w,name,en,c] of [[-13.1,5.35,'私宴一','PRIVATE 1',P.lacquer],[-1.75,4.75,'私宴二','PRIVATE 2',P.jade]]){
      // These openings occupy the two genuine gaps beside/between the shared identity screens at
      // x=-7.2 and x=+7.2; no portal is drawn through a wall supplied by hotel.js.
      portalZ(x,8.15,w,name,en,'包间');
      for(const s of [-1,1]) lattice(x+s*(w/2-.46),1.72,8.03,.72,3.08,0,'包间');
      flat(x,.026,11.15,w+.25,5.55,c,{mode:7,gloss:.035,tag:'包间'});
      roundTable(x,11.20,.88,4,'包间',P.cream);
      const disc=anim(cyl(x,.775,11.20,.42,.035,P.celadonL,{gloss:.34,tag:'包间'}),x,.775,11.20,1.1);
      disc._m0=disc.m;
      const roomDishes=[];
      for(let j=0;j<4;j++){
        const a=j*Math.PI/2;
        placeSetting(x+Math.sin(a)*.62,11.20+Math.cos(a)*.62,'包间');
        const q=anim(cyl(x+Math.sin(a)*.24,.82,11.20+Math.cos(a)*.24,.105,.025,
          j%2?P.lacquer:P.celadon,{gloss:.22,tag:'包间'}),x,.82,11.20,1.1);
        q._m0=q.m;roomDishes.push(q);
      }
      lazy.push({x,z:11.20,disc,dishes:roomDishes,phase:x});
      zPanel(x,2.55,13.70,4.6,1.65,'松鹤延年','PRIVATE DINING',c,'包间');
      // Applied triptych, bronze branch and seal turn the rear panel into a framed art niche.
      for(let i=0;i<3;i++) box(x-1.30+i*1.30,2.53,13.585,1.05,1.28,.025,i===1?P.cream:P.silk,
        {hard:true,mode:1,gloss:.10,tag:'包间'});
      capsule(x,2.42,13.54,.035,2.15,.035,P.inkL,{rz:Math.PI/2+.12,gloss:.10,tag:'包间'});
      for(let i=0;i<7;i++) ball(x-1.0+i*.34,2.58+Math.sin(i)*.25,13.50,.12,.07,.08,
        i%2?P.celadon:P.bronzeL,{mode:15,gloss:.10,tag:'包间'});
      box(x-2.45,.075,12.55,.62,.15,1.55,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'包间'});
      box(x-2.45,.65,12.55,.62,.95,1.75,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'包间'});
      for(const zz of [12.05,12.55,13.05]){
        box(x-2.765,.65,zz,.025,.65,.38,P.jade,{hard:true,mode:1,gloss:.20,tag:'包间'});
        cyl(x-2.79,.65,zz,.035,.035,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'包间'});
      }
      box(x-2.45,1.16,12.55,.78,.12,1.90,P.limestoneL,{...MAT.stone,gloss:.23,tag:'包间'});
      taper(x-2.45,1.37,12.55,.18,.30,.14,P.celadon,{gloss:.24,tag:'包间'});
      lantern(x,3.50,11.15,1.04,'包间');
    }
    fixture('包间',-13.1,11.2,'私宴包间有独立茶台和服务柜。',
      'Each private dining room has its own tea station and service credenza.',
      '私宴 is a private banquet.','food-beverage',[-13.1,9.35],2.0);

    // Show kitchen and back kitchen.  The south side is theatre—copper wok line, roast cabinet,
    // steam and flame—while the glass beyond reveals stainless prep, racks and a genuine door to
    // the service-lift spine.  The opening at x=12.1 is deliberately unobstructed.
    zPanel(7.1,2.78,6.72,8.5,1.55,'明档厨房','SHOW KITCHEN',P.copper,'明档厨房');
    for(let i=0;i<5;i++) lattice(3.75+i*1.68,2.78,6.58,1.30,1.22,0,'明档厨房');
    box(7.0,.78,.70,8.2,1.15,1.15,P.walnutD,{...MAT.timber,mode:6,gloss:.28,tag:'明档厨房'});
    box(7.0,.12,.70,7.75,.24,.88,P.black,{hard:true,gloss:.18,tag:'明档厨房'});
    for(let i=0;i<8;i++){
      const x=3.57+i*.98;
      box(x,.75,.105,.78,.68,.035,i%2?P.walnut:P.jade,{hard:true,mode:i%2?6:1,gloss:.24,tag:'明档厨房'});
      cyl(x+.28,.75,.075,.032,.035,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'明档厨房'});
    }
    box(7.0,1.39,.70,8.38,.13,1.28,P.copper,{hard:true,gloss:.58,tag:'明档厨房'});
    const flames=[],steam=[],fans=[];
    for(let i=0;i<4;i++){
      const x=4.3+i*1.75;
      cyl(x,1.48,.63,.46,.10,P.black,{gloss:.30,tag:'明档厨房'});
      cyl(x,1.53,.63,.35,.09,P.steel,{gloss:.40,tag:'明档厨房'});
      capsule(x+.31,1.61,.63,.035,.62,.035,P.walnutD,{rz:Math.PI/2,gloss:.24,tag:'明档厨房'});
      const f=anim(taper(x,1.70,.63,.22,.52,.22,P.flame,{mode:1,glow:.55,tag:'明档厨房'}),x,1.70,.63,.72);
      f._m0=f.m;f._phase=i*.72;flames.push(f);
      for(let j=0;j<3;j++){
        const q=anim(ball(x,2.05+j*.24,.63,.10+j*.04,.13,.10+j*.04,P.cream,
          {mode:1,alpha:.16,glow:.025,tag:'明档厨房'}),x,2.05+j*.24,.63,.48);
        q._m0=q.m;q._phase=i*.87+j*.31;steam.push(q);
      }
      box(x,3.30,.82,1.45,.22,1.45,P.copper,{hard:true,gloss:.48,tag:'明档厨房'});
      box(x,3.16,.82,1.62,.09,1.62,P.bronzeL,{hard:true,gloss:POLISH,tag:'明档厨房'});
      box(x,(A.H+3.41)/2,.82,.28,A.H-3.41,.28,P.bronzeD,{hard:true,gloss:AGED,tag:'明档厨房'});
      cyl(x,A.H-.07,.82,.20,.08,P.copper,{gloss:.55,tag:'明档厨房'});
      const fan=anim(capsule(x,3.17,.82,.035,1.02,.035,P.steel,{rz:Math.PI/2,tag:'明档厨房'}),x,3.17,.82,.85);
      fan._m0=fan.m;fan._phase=i*.4;fans.push(fan);
    }
    // Ingredient shelf, condiment jars and utensil rail above the active cook line.
    box(7.0,2.48,1.62,7.6,.10,.50,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'明档厨房'});
    for(let i=0;i<10;i++){
      const x=3.75+i*.72;
      taper(x,2.68,1.62,.10,.34,.085,i%3===0?P.lacquer:i%3===1?P.celadon:P.cream,{gloss:.22,tag:'明档厨房'});
      cyl(x,2.86,1.62,.085,.035,P.bronzeL,{gloss:POLISH,tag:'明档厨房'});
    }
    capsule(7.0,2.15,1.23,.025,7.5,.025,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'明档厨房'});
    for(let i=0;i<8;i++) capsule(3.8+i*.92,1.92,1.23,.018,.42,.018,P.steel,{gloss:.42,rz:(i%2?-.18:.18),tag:'明档厨房'});
    // Glass kitchen line with an open service throat on the right.
    for(const [x,w] of [[5.05,5.85],[10.7,1.65]]){
      box(x,.45,7.00,w,.90,.13,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.27,tag:'后厨'});
      box(x,2.22,7.00,w,2.55,.055,P.glass,{hard:true,mode:1,alpha:.24,gloss:.82,tag:'后厨'});
      for(let u=x-w/2+.45;u<x+w/2;u+=1.15) box(u,2.22,6.98,.05,2.58,.10,P.bronzeD,{hard:true,gloss:AGED,tag:'后厨'});
      box(x,3.52,7.00,w,.09,.13,P.bronzeD,{hard:true,gloss:AGED,tag:'后厨'});
    }
    portalZ(12.2,7.0,2.05,'服务','SERVICE','服务通道');
    flat(8.0,.024,10.15,9.4,6.0,P.steel,{mode:7,gloss:.12,tag:'后厨'});
    for(const x of [5.2,8.0,10.8]){
      box(x,.76,9.25,2.2,1.10,.72,P.steel,{hard:true,gloss:.36,tag:'后厨'});
      for(const dx of [-.86,.86]) for(const dz of [-.25,.25])
        box(x+dx,.34,9.25+dz,.07,.68,.07,P.steel,{hard:true,gloss:.34,tag:'后厨'});
      // Toe-kick, framed cabinet faces and handles make the measured stainless mass read as an
      // installed prep station, rather than a bare metallic block.
      box(x,.17,9.25,2.05,.16,.58,P.ink,{hard:true,gloss:.18,tag:'后厨'});
      for(let j=0;j<3;j++){
        const px=x-.68+j*.68;
        box(px,.77,8.875,.57,.78,.028,P.steel,{hard:true,mode:1,gloss:.42,tag:'后厨'});
        box(px,.77,8.855,.47,.66,.018,P.glassD,{hard:true,mode:1,gloss:.28,tag:'后厨'});
        capsule(px,.88,8.83,.018,.30,.018,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'后厨'});
      }
      box(x,1.345,9.25,2.34,.10,.84,P.steel,{hard:true,gloss:.46,tag:'后厨'});
      box(x,1.405,9.56,2.18,.035,.06,P.bronzeD,{hard:true,gloss:AGED,tag:'后厨'});
      for(const y of [.40,.86,1.32]) box(x,y,10.72,2.18,.08,1.78,P.steel,{hard:true,gloss:.34,tag:'后厨'});
      for(const dx of [-1.02,1.02]) for(const dz of [-.82,.82])
        box(x+dx,.82,10.72+dz,.065,1.64,.065,P.steel,{hard:true,gloss:.34,tag:'后厨'});
      for(let shelf=0;shelf<3;shelf++) for(let j=0;j<3;j++){
        const px=x-.67+j*.67,yy=.47+shelf*.46;
        taper(px,yy,10.72,.115,.22,.095,(j+shelf)%3===0?P.lacquer:(j+shelf)%3===1?P.celadon:P.cream,
          {gloss:.22,tag:'后厨'});
        cyl(px,yy+.12,10.72,.095,.035,P.bronzeL,{gloss:POLISH,tag:'后厨'});
      }
    }
    // Distinct work surfaces: chopping, washing and hot-pass plating.
    box(5.2,1.415,9.20,.92,.035,.48,P.walnutL,{...MAT.timber,hard:true,mode:6,gloss:.22,tag:'后厨'});
    for(let i=0;i<5;i++) ball(4.88+i*.16,1.47,9.18,.07,.05,.07,i%2?P.leaf:P.flame,
      {mode:15,gloss:.10,tag:'后厨'});
    box(8.0,1.415,9.23,.86,.035,.48,P.glassD,{hard:true,mode:1,gloss:.34,tag:'后厨'});
    capsule(8.0,1.68,9.49,.027,.50,.027,P.steel,{rx:Math.PI/2,gloss:.46,tag:'后厨'});
    capsule(8.0,1.86,9.30,.027,.38,.027,P.steel,{gloss:.46,tag:'后厨'});
    for(const s of [-1,1]){
      cyl(10.8+s*.34,1.48,9.22,.24,.17,P.steel,{gloss:.44,tag:'后厨'});
      capsule(10.8+s*.58,1.52,9.22,.035,.34,.035,P.walnutD,{rz:Math.PI/2,gloss:.24,tag:'后厨'});
      cyl(10.8+s*.34,1.59,9.22,.20,.035,P.bronzeL,{gloss:POLISH,tag:'后厨'});
    }
    xPanel(11.15,2.25,12.55,2.7,2.55,'后厨','BACK KITCHEN',P.ink,'后厨',Math.PI/2);
    fixture('明档厨房',7.0,.70,'明档里能看见厨师炒锅、蒸汽和铜色烟罩。',
      'The show kitchen reveals wok flames, steam and copper extraction hoods.',
      '明档 is a visible cooking station.','food-beverage',[7.0,-.70],2.1);
    fixture('厨房',8.0,9.25,'后厨连接备餐台、传菜口和服务梯。',
      'The back kitchen connects prep benches, pass and service lift.',
      '后厨 is the back kitchen; 传菜口 is the service pass.','food-beverage',[12.2,7.9],2.3);

    // Service pass details make the workplace seam explicit without creating career rules.
    // Open heated pass cabinet beside the service throat: a recessed plinth, rear skin, framed
    // shelf posts and plated trays preserve the clear route while avoiding a blank steel monolith.
    box(12.75,.18,8.45,.72,.36,2.20,P.ink,{hard:true,gloss:.18,tag:'传菜口'});
    box(13.06,1.19,8.45,.10,1.72,2.08,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'传菜口'});
    for(let j=0;j<3;j++){
      const zz=7.84+j*.61;
      box(13.125,1.20,zz,.035,1.42,.48,j===1?P.jade:P.walnut,
        {hard:true,mode:1,gloss:.24,tag:'传菜口'});
      for(const yy of [.58,1.82]) box(13.15,yy,zz,.025,.035,.42,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'传菜口'});
    }
    for(const zz of [7.53,9.37]){
      box(12.43,1.20,zz,.075,2.04,.075,P.steel,{hard:true,gloss:.40,tag:'传菜口'});
      box(13.03,1.20,zz,.075,2.04,.075,P.steel,{hard:true,gloss:.40,tag:'传菜口'});
    }
    for(let i=0;i<4;i++){
      const yy=.52+i*.43;
      box(12.72,yy,8.45,.66,.065,1.90,P.steel,{hard:true,gloss:.43,tag:'传菜口'});
      box(12.37,yy+.055,8.45,.035,.035,1.74,P.bronzeL,{hard:true,gloss:POLISH,tag:'传菜口'});
      for(const zz of [8.05,8.78]){
        cyl(12.65,yy+.07,zz,.18,.035,P.white,{gloss:.20,tag:'传菜口'});
        ball(12.65,yy+.105,zz,.14,.035,.10,(i+Math.round(zz*10))%2?P.leaf:P.copper,
          {mode:15,gloss:.14,tag:'传菜口'});
      }
    }
    box(12.75,2.28,8.45,.78,.16,2.22,P.steel,{hard:true,gloss:.44,tag:'传菜口'});
    for(const zz of [7.65,9.25]) capsule(12.40,2.16,zz,.022,.44,.022,P.bronzeL,
      {rx:Math.PI/2,gloss:POLISH,tag:'传菜口'});
    fixture('传菜口',12.75,8.45,'传菜口把后厨连接到宴会和餐厅服务路线。',
      'The pass connects the back kitchen to restaurant and banquet service routes.',
      '传菜 means carry dishes from kitchen to dining room.','food-beverage',[13.75,7.45],1.9);

    planter(-15.0,-2.0,.50,.52,'绿化');
    planter(-.2,-2.0,.50,.52,'绿化');
    for(const [x,z] of [[-11.4,2.35],[-6.9,4.75],[-2.45,2.35]]) lantern(x,3.62,z,.88,'吊灯');
    light(-7,3.45,4.3,[1,.73,.48],.44,7.0);
    light(5,3.45,-7,[1,.82,.62],.40,6.8);
    light(7,3.35,4.0,[1,.55,.28],.36,5.6);

    // `M.mul`, `M.trans` and `M.rotY` each allocate a fresh Float32Array(16) when called without
    // an out-parameter (js/math.js:7,17,19) — and this tick called them five times per lazy susan
    // plus once per dish, flame, steam puff and fan, every frame. The out-parameter has been there
    // all along. Three scratch matrices carry the intermediates; the *results* cannot share them,
    // because the renderer reads each prop's `.m` later in the same frame, so every animated prop
    // gets one matrix of its own, allocated on the first tick and written in place after that.
    //
    // `M.mul(a, b, o)` with `o === b` is safe and is used below: the inner loop reads all four of
    // b's values for a column before writing that column of o. `o === a` is NOT safe and is not
    // done here, because `a` is read across every column.
    const mA=new Float32Array(16), mB=new Float32Array(16), mR=new Float32Array(16);
    const own=p=>p._mw||(p._mw=new Float32Array(16));
    onTick((t,body,clock,dt)=>{
      for(const q of lazy){
        const a=t*.075+q.phase;
        M.mul(M.rotY(a,mA),M.trans(-q.x,0,-q.z,mB),mR);
        M.mul(M.trans(q.x,0,q.z,mA),mR,mR);
        q.disc.m=M.mul(mR,q.disc._m0,own(q.disc));
        for(const d of q.dishes)d.m=M.mul(mR,d._m0,own(d));
      }
      for(const f of flames){
        const dy=.10*Math.sin(t*7.2+f._phase);
        f.m=M.mul(M.trans(0,dy,0,mA),f._m0,own(f));f.glow=.43+.20*(.5+.5*Math.sin(t*9+f._phase));
      }
      for(const q of steam){
        const u=(t*.24+q._phase)%1;
        q.m=M.mul(M.trans(0,u*.55,0,mA),q._m0,own(q));q.alpha=.18*(1-u);
      }
      for(const q of fans){
        M.mul(M.rotY(t*2.8+q._phase,mA),M.trans(-q.cx,-q.cy,-q.cz,mB),mR);
        M.mul(M.trans(q.cx,q.cy,q.cz,mA),mR,mR);
        q.m=M.mul(mR,q._m0,own(q));
      }
      A.state.public={lazySusans:lazy.length,wokFlames:flames.length,steam:steam.length,
        extractorFans:fans.length,serviceRoute:A.route.serviceSpine};
    });
  });

  // -------------------------------------------------------------------------------------------
  // 3F · pre-function gallery, ballroom, wedding salon, meetings and business centre
  HotelFit.register('hotel3', A => {
    const T=atelier(A), {P,MAT,AGED,POLISH,anim,fixture,zPanel,xPanel,portalZ,lattice,chair,roundTable,placeSetting,
      loungeChair,sofa,lowTable,planter,lantern,stadium,ceilingRaft,box,cyl,ball,capsule,taper,flat,
      glyphs,solid,blocker,shade,glow,light,luminous,onTick}=T;

    // The pre-function gallery is the circulation spine: patterned silk carpet, ceiling coffers,
    // registration and a live programme board.  It leaves the passenger-lift landing completely
    // open and gives each doorway a destination worth seeing beyond it.
    flat(1.0,.024,-3.25,27.8,4.0,P.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'宴会前厅'});
    for(const z of [-5.02,-1.48]) flat(1.0,.030,z,27.2,.055,P.bronzeL,{gloss:POLISH,tag:'宴会前厅'});
    for(let i=0;i<9;i++){
      const x=-11+i*3.0;
      // Ginkgo-leaf carpet inlay replaces the unrelated rotated squares.
      for(const s of [-1,1]) ball(x+s*.28,.034,-3.25,.42,.012,.22,i%2?P.carpetGold:P.silkRose,
        {...MAT.cloth,mode:7,gloss:.05,ry:s*.55,tag:'宴会前厅'});
      capsule(x,.035,-3.25,.018,.48,.018,P.bronzeD,{rz:Math.PI/2,ry:.20,gloss:AGED,tag:'宴会前厅'});
      // Flush framed coffers with four visible hangers and ceiling roses.
      box(x,3.93,-4.30,2.30,.10,.15,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'宴会前厅'});
      box(x,3.93,-2.20,2.30,.10,.15,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'宴会前厅'});
      for(const dx of [-1.075,1.075]) box(x+dx,3.93,-3.25,.15,.10,2.25,P.walnutD,
        {...MAT.timber,hard:true,mode:6,gloss:.28,tag:'宴会前厅'});
      luminous(box(x,3.985,-3.25,1.92,.035,1.88,P.cream,{hard:true,mode:1,tag:'宴会前厅'}),.025,.12);
      for(const dx of [-.88,.88]) for(const dz of [-.82,.82]){
        capsule(x+dx,(A.H+4.02)/2,-3.25+dz,.018,A.H-4.02,.018,P.bronzeD,{gloss:AGED,tag:'宴会前厅'});
        cyl(x+dx,A.H-.055,-3.25+dz,.060,.07,P.bronzeD,{gloss:AGED,tag:'宴会前厅'});
      }
      luminous(box(x,3.91,-3.25,.58,.025,.58,P.warm,{hard:true,mode:1,tag:'宴会前厅'}),.06,.26);
    }
    zPanel(7.7,2.08,-5.18,4.25,2.45,'今日活动',"TODAY'S EVENTS",P.ink,'今日活动');
    for(const x of [6.04,9.36]) lattice(x,2.08,-5.32,.56,2.08,0,'今日活动');
    for(const y of [1.02,3.14]) box(7.7,y,-5.34,3.18,.04,.045,P.bronzeL,{hard:true,gloss:POLISH,tag:'今日活动'});
    const eventRows=[];
    ['京华厅 18:00','婚礼沙龙 15:30','会议室 09:00'].forEach((s,i)=>{
      const g=glyphs(7.7,2.38-i*.43,-5.31,0,s,{size:.105,gap:.022,color:i?P.celadonL:P.bronzeL,
        mode:1,glow:.04,lift:.007,tag:'今日活动'});
      eventRows.push(...g.map(p=>anim(p,7.7,2.38-i*.43,-5.31,2.2)));
    });
    // Sculpted registration desk: recessed plinth, faceted wings, inset fronts and working kit.
    box(1.7,.10,-4.40,3.80,.20,.62,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'签到处'});
    box(1.7,.62,-4.40,1.48,.84,.82,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'签到处'});
    for(const s of [-1,1]) box(1.7+s*1.28,.58,-4.35,1.20,.76,.75,P.walnutL,
      {...MAT.timber,mode:6,gloss:.28,ry:-s*.12,tag:'签到处'});
    for(const x of [.65,1.35,2.05,2.75]) box(x,.61,-4.79,.52,.48,.028,x===1.35||x===2.05?P.silkRose:P.jade,
      {hard:true,mode:1,gloss:.20,tag:'签到处'});
    for(const y of [.34,.88]) box(1.7,y,-4.82,3.28,.035,.035,P.bronzeL,{hard:true,gloss:POLISH,tag:'签到处'});
    box(1.7,1.10,-4.40,3.95,.14,.96,P.limestoneL,{...MAT.stone,gloss:.24,tag:'签到处'});
    glyphs(1.7,.63,-4.84,0,'签到处',{size:.16,gap:.04,color:P.bronzeL,mode:1,lift:.008,tag:'签到处'});
    // Name-card trays, seating chart, tablet and bell rest on the counter.
    for(let i=0;i<3;i++){
      box(.52+i*.42,1.205,-4.22,.34,.025,.20,P.bronzeD,{hard:true,gloss:AGED,tag:'签到处'});
      box(.52+i*.42,1.235,-4.22,.28,.018,.14,P.cream,{...MAT.cloth,hard:true,mode:7,tag:'签到处'});
    }
    box(1.82,1.22,-4.20,.70,.035,.43,P.cream,{...MAT.cloth,hard:true,mode:7,ry:.06,tag:'签到处'});
    for(let i=0;i<4;i++) box(1.55+i*.17,1.245,-4.20,.012,.01,.33,P.carpetGold,{hard:true,tag:'签到处'});
    box(2.55,1.30,-4.17,.46,.32,.035,P.glassD,{hard:true,mode:1,glow:.025,rx:-.28,tag:'签到处'});
    cyl(3.10,1.22,-4.22,.075,.07,P.bronzeL,{gloss:POLISH,tag:'签到处'});
    ball(3.10,1.285,-4.22,.055,.045,.055,P.bronzeL,{gloss:POLISH,tag:'签到处'});
    fixture('签到处',1.7,-4.4,'签到台准备了名牌、座位图和活动流程。',
      'The registration desk holds name cards, seating plan and event programme.',
      '签到 means register or sign in.','banqueting',[3.75,-4.4],2.1);
    fixture('今日活动',7.7,-5.18,'活动牌显示宴会、婚礼和会议安排。',
      'The programme board lists ballroom, wedding and meeting events.',
      '今日活动 means today\'s events.','banqueting',[7.7,-3.65],1.9);

    // A flush event-gallery installation completes the long view behind registration.  The
    // offset silk bays, moon disc and shallow ginkgo relief turn the former blank perimeter into
    // a composed contemporary-Chinese backdrop without introducing a freestanding camera plane.
    const eventGalleryX=.85,eventGalleryZ=-14.56;
    box(eventGalleryX,2.10,eventGalleryZ,9.65,2.72,.16,P.walnutD,
      {...MAT.timber,hard:true,mode:6,gloss:.30,tag:'京华雅集'});
    for(let i=0;i<5;i++){
      const x=eventGalleryX-3.72+i*1.86;
      box(x,2.10,eventGalleryZ+.105,1.58,2.34,.035,
        i===2?P.lacquerD:(i%2?P.silk:P.cream),
        {hard:true,mode:1,gloss:.12,tag:'京华雅集'});
      box(x,.88,eventGalleryZ+.15,1.68,.045,.045,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'京华雅集'});
    }
    cyl(eventGalleryX,2.16,eventGalleryZ+.19,.71,.035,P.silkRose,
      {rx:Math.PI/2,mode:1,gloss:.14,tag:'京华雅集'});
    glyphs(eventGalleryX,2.30,eventGalleryZ+.245,0,'京华雅集',
      {size:.19,gap:.048,color:P.cream,mode:1,glow:.045,lift:.008,tag:'京华雅集'});
    glyphs(eventGalleryX,1.86,eventGalleryZ+.25,0,'JINGHUA EVENTS',
      {size:.072,gap:.017,color:P.bronzeL,mode:1,lift:.006,tag:'京华雅集'});
    for(const s of [-1,1]){
      capsule(eventGalleryX+s*2.70,2.05,eventGalleryZ+.235,.030,2.08,.030,P.bronzeD,
        {rz:s*.78,gloss:AGED,tag:'京华雅集'});
      for(let i=0;i<4;i++) ball(eventGalleryX+s*(2.10+i*.40),1.48+i*.37,eventGalleryZ+.275,
        .19,.11,.035,i%2?P.celadon:P.carpetGold,
        {mode:15,ry:s*.32,rz:s*.20,gloss:.10,tag:'京华雅集'});
    }
    luminous(box(eventGalleryX,3.49,eventGalleryZ+.19,9.05,.035,.045,P.warm,
      {hard:true,mode:1,tag:'京华雅集'}),.045,.18);

    // Ballroom threshold and room.  The open bronze portals frame a centre aisle and stage;
    // clustered tables read as a specific wedding banquet rather than generic empty floor area.
    portalZ(-6.2,-.25,8.4,'京华宴会厅','GRAND BALLROOM','宴会厅');
    for(const x of [-10.2,-2.2]){
      box(x,1.72,-.10,3.1,3.44,.08,P.glass,{hard:true,mode:1,alpha:.15,gloss:.74,tag:'宴会厅'});
      lattice(x,1.72,-.18,3.0,3.28,0,'宴会厅');
    }
    flat(-6.3,.028,6.5,17.4,12.0,P.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'宴会厅'});
    // Golden ginkgo runner / centre aisle, with a bordered walnut dance floor near the stage.
    flat(-6.3,.034,6.35,2.0,11.5,P.silk,{...MAT.cloth,mode:7,gloss:.05,tag:'宴会厅'});
    for(let i=0;i<8;i++){
      const z=1.35+i*1.28;
      for(const s of [-1,1]) ball(-6.3+s*.72,.055,z,.20,.012,.10,P.carpetGold,{mode:7,gloss:.08,ry:s*.7,tag:'宴会厅'});
    }
    flat(-6.3,.036,9.15,5.2,2.65,P.walnutL,{...MAT.timber,mode:6,gloss:.20,tag:'宴会厅'});
    for(const x of [-8.84,-3.76]) flat(x,.041,9.15,.055,2.55,P.bronzeL,{gloss:POLISH,tag:'宴会厅'});
    for(const z of [7.86,10.44]) flat(-6.3,.041,z,5.05,.055,P.bronzeL,{gloss:POLISH,tag:'宴会厅'});
    const banquet=[];
    [[-11.7,3.1],[-.9,3.1],[-11.7,6.1],[-.9,7.6]].forEach(([x,z],i)=>{
      roundTable(x,z,.82,4,'宴会厅',P.cream);
      const d=anim(cyl(x,.775,z,.34,.030,P.celadonL,{gloss:.34,tag:'宴会厅'}),x,.775,z,.95);
      d._m0=d.m;banquet.push({p:d,x,z,phase:i*.8});
      for(let j=0;j<4;j++){
        const a=j*Math.PI/2;placeSetting(x+Math.sin(a)*.58,z+Math.cos(a)*.58,'宴会厅');
      }
      // One low, asymmetrical arrangement per table keeps sightlines open while dressing the
      // banquet for an actual event rather than leaving a bare rotating disc.
      taper(x,.93,z,.14,.28,.10,P.celadon,{gloss:.24,tag:'宴会厅'});
      for(let j=0;j<5;j++){
        const a=-.95+j*.48;
        capsule(x+Math.sin(a)*.15,1.13+j*.025,z+Math.cos(a)*.08,.018,.32,.018,P.leaf,
          {rz:Math.sin(a)*.32,rx:Math.cos(a)*.18,tag:'宴会厅'});
        ball(x+Math.sin(a)*.30,1.28+j*.035,z+Math.cos(a)*.18,.10,.07,.09,
          j%2?P.silkRose:P.cream,{mode:15,gloss:.08,tag:'宴会厅'});
      }
    });
    // Stage and wedding focal wall.
    box(-6.3,.12,11.9,11.2,.24,2.55,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'宴会厅'});
    box(-6.3,.34,11.9,10.8,.20,2.40,P.walnut,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'宴会厅'});
    box(-6.3,.16,10.55,4.40,.16,.48,P.limestoneL,{...MAT.stone,hard:true,gloss:.22,tag:'宴会厅'});
    for(let i=0;i<7;i++) box(-10.55+i*1.42,.24,10.64,1.16,.22,.035,i%2?P.lacquerD:P.jade,
      {hard:true,mode:1,gloss:.20,tag:'宴会厅'});
    // Layered proscenium and silk triptych replace the single red backdrop slab.
    box(-6.3,2.16,13.08,10.0,3.22,.20,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.31,tag:'宴会厅'});
    for(let i=0;i<5;i++){
      const x=-10.30+i*2.0,centre=i===2;
      box(x,2.16,12.955,1.76,2.82,.035,centre?P.lacquer:P.silkRose,
        {...MAT.cloth,hard:true,mode:7,gloss:.09,tag:'宴会厅'});
      if(!centre) lattice(x,2.16,12.915,1.48,2.54,0,'宴会厅');
    }
    for(const x of [-11.12,-1.48]) box(x,2.16,12.90,.12,3.10,.18,P.bronzeL,{hard:true,gloss:POLISH,tag:'宴会厅'});
    for(const y of [.66,3.66]) box(-6.3,y,12.90,9.72,.10,.18,P.bronzeL,{hard:true,gloss:POLISH,tag:'宴会厅'});
    luminous(box(-6.3,2.16,12.89,3.28,2.55,.025,P.lacquer,{hard:true,mode:1,tag:'宴会厅'}),.03,.13);
    glyphs(-6.3,2.38,12.84,Math.PI,'百年好合',{size:.22,gap:.055,color:P.cream,mode:1,glow:.06,lift:.008,tag:'宴会厅'});
    glyphs(-6.3,1.88,12.84,Math.PI,'JINGHUA WEDDING',{size:.075,gap:.017,color:P.bronzeL,mode:1,lift:.006,tag:'宴会厅'});
    // Flattened ginkgo leaves and branching bronze lines break the proscenium's outer bays into
    // an organic relief, giving the focal wall a crafted silhouette rather than stacked panels.
    for(const s of [-1,1]){
      capsule(-6.3+s*3.25,2.15,12.785,.030,1.68,.030,P.bronzeD,
        {rz:s*.72,gloss:AGED,tag:'宴会厅'});
      for(let i=0;i<5;i++){
        const x=-6.3+s*(2.58+i*.28),y=1.42+i*.38;
        ball(x,y,12.75,.22,.13,.035,i%2?P.celadonL:P.carpetGold,
          {mode:15,ry:s*.34,rz:s*.24,gloss:.12,tag:'宴会厅'});
      }
    }
    for(const s of [-1,1]){
      const x=-6.3+s*3.25;
      cyl(x,.055,11.48,.30,.11,P.bronzeD,{gloss:AGED,tag:'宴会厅'});
      taper(x,.64,11.48,.48,1.06,.36,P.limestone,{...MAT.stone,gloss:.18,tag:'宴会厅'});
      cyl(x,1.18,11.48,.42,.10,P.bronzeL,{gloss:POLISH,tag:'宴会厅'});
      for(let i=0;i<7;i++){
        const a=i*2.1;
        capsule(x+Math.sin(a)*.22,1.46+i*.035,11.48+Math.cos(a)*.16,.022,.52,.022,P.leaf,
          {rz:Math.sin(a)*.34,rx:Math.cos(a)*.25,tag:'宴会厅'});
        ball(x+Math.sin(a)*.46,1.60+i*.07,11.48+Math.cos(a)*.30,
          .14,.10,.14,i%2?P.cream:P.silkRose,{mode:15,gloss:.08,tag:'宴会厅'});
      }
    }
    box(-6.3,.54,11.22,4.5,.72,1.05,P.cream,{...MAT.cloth,mode:7,gloss:.06,tag:'宴会厅'});
    box(-6.3,.93,11.22,4.72,.10,1.14,P.limestoneL,{...MAT.stone,gloss:.20,tag:'宴会厅'});
    for(const x of [-8.15,-7.55,-6.95,-6.35,-5.75,-5.15,-4.55]) box(x,.53,10.67,.52,.52,.025,P.silkRose,
      {...MAT.cloth,hard:true,mode:7,gloss:.05,tag:'宴会厅'});
    fixture('宴会厅',-6.3,6.4,'京华宴会厅正在布置一场现代中式婚宴。',
      'The Jinghua Ballroom is set for a contemporary Chinese wedding banquet.',
      '宴会厅 is a ballroom or banquet hall.','banqueting',[-6.3,.95],2.3);

    // Three bronze/crystal chandeliers, plus low programmable event lights.  The animation is a
    // slow luminance programme, not a nightclub strobe.
    const crystals=[],eventLights=[];
    for(const x of [-11.0,-6.3,-1.6]){
      cyl(x,A.H-.055,6.2,.25,.09,P.bronzeD,{gloss:AGED,tag:'吊灯'});
      capsule(x,4.02,6.2,.035,.48,.035,P.bronzeL,{gloss:POLISH,tag:'吊灯'});
      ball(x,3.80,6.2,.13,.13,.13,P.bronzeL,{gloss:POLISH,tag:'吊灯'});
      for(let ring=0;ring<3;ring++) for(let i=0;i<8;i++){
        const a=i*Math.PI/4+ring*.22,r=.34+ring*.24;
        const y=3.62-ring*.20,z=6.2+Math.cos(a)*r,px=x+Math.sin(a)*r;
        // A straight 12 mm suspension cable crosses the 26 cm ceiling slab and ends at the
        // crystal's centre, so both cylinder caps stay buried while the visible wire keeps its size.
        cyl(px,(A.H+y)/2,z,.006,A.H-y,P.bronzeD,{gloss:AGED,tag:'吊灯'});
        capsule((x+px)/2,3.80,(6.2+z)/2,.016,r,.016,P.bronze,
          {rz:Math.PI/2,ry:a,gloss:AGED,tag:'吊灯'});
        const q=anim(ball(px,y,z,.075,.13,.075,ring===2?P.bronzeL:P.warm,
          {mode:1,glow:.18,tag:'吊灯'}),px,y,z,.30);
        q._m0=q.m;q._phase=x*.37+ring+i*.43;crystals.push(q);
      }
    }
    // The five HotelCore starter pendants are now explicitly tied to ceiling roses and collars.
    for(const x of [-6,-3,0,3,6]){
      cyl(x,A.H-.055,4.5,.14,.08,P.bronzeD,{gloss:AGED,tag:'吊灯'});
      capsule(x,(A.H+3.55)/2,4.5,.022,A.H-3.55,.022,P.bronze,{gloss:AGED,tag:'吊灯'});
      cyl(x,3.46,4.5,.34,.055,P.bronzeL,{gloss:POLISH,tag:'吊灯'});
    }
    for(let i=0;i<6;i++){
      const x=-13.4+i*2.85;
      const q=anim(cyl(x,.12,.65,.12,.18,i%3===0?P.lacquer:i%3===1?P.celadon:P.bronzeL,
        {mode:1,glow:.16,tag:'宴会灯'}),x,.12,.65,.36);
      q._phase=i*.61;eventLights.push(q);
    }
    light(-6.3,3.55,6.2,[1,.72,.46],.52,9.0);

    // Operable partition wall at the east side of the ballroom.  Most panels are stacked; two
    // ease out and back on a long deterministic cycle, exposing the wedding salon beyond.
    const partitions=[];
    box(3.15,3.74,6.05,.34,.14,9.95,P.bronzeD,{hard:true,gloss:AGED,tag:'可分隔墙'});
    box(3.15,.035,6.05,.10,.045,9.95,P.bronzeL,{hard:true,gloss:POLISH,tag:'可分隔墙'});
    // These are architectural panels, not scenery the player or chase camera may pass through.
    // The body collider follows the full stored/animated envelope; the taller camera blocker
    // prevents a side orbit in the wedding salon from landing inside a single-sided silk panel.
    solid(2.92,3.38,1.28,11.62);
    blocker(2.86,3.44,1.22,11.68,3.82);
    for(let i=0;i<7;i++){
      const z=2.0+i*1.35;
      const parts=[];
      const panel=anim(box(3.15,1.78,z,.20,3.34,1.18,i%2?P.silk:P.walnutL,
        {hard:true,mode:i%2?7:6,gloss:i%2?.06:.28,tag:'可分隔墙'}),3.15,1.78,z,1.95);
      panel._m0=panel.m;parts.push(panel);
      for(const y of [.17,3.39]){
        const p=anim(box(3.02,y,z,.035,.12,1.20,P.bronzeL,{hard:true,gloss:POLISH,tag:'可分隔墙'}),3.02,y,z,1.25);
        p._m0=p.m;parts.push(p);
      }
      for(const zz of [z-.53,z+.53]){
        const p=anim(box(3.015,1.78,zz,.035,3.22,.075,P.bronzeL,{hard:true,gloss:POLISH,tag:'可分隔墙'}),3.015,1.78,zz,1.65);
        p._m0=p.m;parts.push(p);
      }
      const inset=anim(box(3.005,1.80,z,.025,2.72,.82,i%2?P.silkRose:P.jade,
        {hard:true,mode:1,gloss:.18,tag:'可分隔墙'}),3.005,1.80,z,1.50);
      inset._m0=inset.m;parts.push(inset);
      for(const zz of [z-.38,z,z+.38]){
        const rail=anim(box(2.985,1.80,zz,.018,2.55,.032,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'可分隔墙'}),2.985,1.80,zz,1.30);
        rail._m0=rail.m;parts.push(rail);
      }
      for(const zz of [z-.40,z+.40]){
        const wheel=anim(cyl(3.15,.10,zz,.075,.055,P.steel,{rz:Math.PI/2,gloss:.44,tag:'可分隔墙'}),3.15,.10,zz,.18);
        wheel._m0=wheel.m;parts.push(wheel);
      }
      partitions.push({parts,index:i});
    }
    box(3.15,1.82,11.05,.46,3.64,1.10,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'可分隔墙'});
    glyphs(2.89,1.82,11.05,-Math.PI/2,'活动墙库',{size:.10,gap:.025,color:P.bronzeL,mode:1,lift:.006,tag:'可分隔墙'});
    fixture('可分隔墙',3.15,6.0,'活动隔墙可以把宴会厅分成两个独立厅。',
      'Operable partitions divide the ballroom into two independent halls.',
      '可分隔 means divisible.','banqueting',[1.8,6.0],1.9);

    // Wedding salon: consultation table, fabric library, ceremony model and a view back into the
    // ballroom through the partially stacked partition.
    box(8.1,2.25,.55,7.05,2.74,.18,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.30,tag:'婚礼沙龙'});
    for(let i=0;i<5;i++){
      const x=5.35+i*1.38,centre=i===2;
      box(x,2.25,.445,1.15,2.38,.035,centre?P.silkRose:P.cream,{hard:true,mode:1,gloss:.14,tag:'婚礼沙龙'});
      if(!centre) lattice(x,2.25,.405,.92,2.16,0,'婚礼沙龙');
    }
    glyphs(8.1,2.47,.375,Math.PI,'婚礼沙龙',{size:.18,gap:.045,color:P.cream,mode:1,glow:.04,lift:.008,tag:'婚礼沙龙'});
    glyphs(8.1,2.02,.37,Math.PI,'WEDDING SALON',{size:.075,gap:.017,color:P.bronzeL,mode:1,lift:.006,tag:'婚礼沙龙'});
    flat(8.0,.024,3.65,8.3,5.8,P.silk,{...MAT.cloth,mode:7,gloss:.04,tag:'婚礼沙龙'});
    box(7.3,.68,3.9,3.7,.12,1.15,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'婚礼沙龙'});
    box(7.3,.77,3.9,3.92,.055,1.29,P.bronzeL,{hard:true,gloss:POLISH,tag:'婚礼沙龙'});
    for(const dx of [-1.45,1.45]) for(const dz of [-.38,.38]) taper(7.3+dx,.34,3.9+dz,.065,.68,.05,P.walnutD,
      {...MAT.timber,mode:6,gloss:.26,tag:'婚礼沙龙'});
    // Swatch trays and proposal book sit on the consultation table.
    for(let i=0;i<5;i++) box(6.45+i*.34,.84,3.88,.26,.025,.36,
      i%3===0?P.lacquer:i%3===1?P.celadon:P.silk,{hard:true,mode:7,ry:(i-2)*.05,tag:'婚礼沙龙'});
    box(7.95,.84,3.90,.72,.035,.48,P.cream,{...MAT.cloth,hard:true,mode:7,ry:-.08,tag:'婚礼沙龙'});
    for(const s of [-1,1]) loungeChair(7.3+s*1.25,5.05,0,s<0?P.silk:P.celadonL,'婚礼沙龙');
    // Material library and miniature ceremony table.
    box(11.15,1.58,3.2,.34,2.95,2.95,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'婚礼沙龙'});
    for(let i=0;i<6;i++){
      const y=.46+i*.43;
      box(10.96,y,3.2,.035,.34,2.62,i%3===0?P.lacquer:i%3===1?P.celadon:P.silk,
        {...MAT.cloth,hard:true,mode:7,gloss:.05,tag:'婚礼沙龙'});
      box(10.92,y-.19,3.2,.025,.035,2.72,P.bronzeL,{hard:true,gloss:POLISH,tag:'婚礼沙龙'});
    }
    // Dress mannequin on a weighted brass stand.
    cyl(9.92,.055,2.38,.28,.11,P.bronzeD,{gloss:AGED,tag:'婚礼沙龙'});
    capsule(9.92,.72,2.38,.035,1.28,.035,P.bronzeL,{gloss:POLISH,tag:'婚礼沙龙'});
    taper(9.92,1.33,2.38,.48,1.35,.24,P.cream,{...MAT.cloth,mode:7,gloss:.07,tag:'婚礼沙龙'});
    taper(9.92,2.10,2.38,.23,.42,.17,P.silk,{...MAT.cloth,mode:7,gloss:.07,tag:'婚礼沙龙'});
    ball(9.92,2.49,2.38,.16,.20,.16,P.limestone,{...MAT.stone,gloss:.14,tag:'婚礼沙龙'});
    box(8.5,.12,6.0,2.82,.24,1.25,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.25,tag:'婚礼沙龙'});
    box(8.5,.58,6.0,2.7,.12,1.25,P.limestoneL,{...MAT.stone,gloss:.18,tag:'婚礼沙龙'});
    for(const dx of [-1.05,1.05]) for(const dz of [-.42,.42]) taper(8.5+dx,.29,6.0+dz,.06,.58,.045,P.bronzeD,{gloss:AGED,tag:'婚礼沙龙'});
    for(const s of [-1,1]) taper(8.5+s*.78,.90,6.0,.18,.56,.18,P.bronzeL,{gloss:POLISH,tag:'婚礼沙龙'});
    fixture('婚礼沙龙',8.0,3.65,'婚礼顾问用面料、花艺和宴会厅模型讨论方案。',
      'Wedding consultants use fabrics, flowers and a ballroom model to plan the event.',
      '沙龙 here means a consultation salon.','banqueting',[6.1,3.65],2.0);

    // Meeting suite along the north-east edge.  Glazed fronts and open doors show complete rooms,
    // while the directory and service route remain outside their envelope.
    for(const [x,name] of [[6.0,'会议一'],[10.2,'会议二']]){
      portalZ(x,8.0,3.75,name,'MEETING','会议室');
      flat(x,.024,11.0,3.85,5.25,P.carpet,{...MAT.cloth,mode:7,gloss:.04,tag:'会议室'});
      // Textile acoustic wall, bronze reveals and a halo rail visually integrate the screen and
      // credenza.  Everything remains flush behind the existing display plane.
      box(x,2.24,13.43,3.55,2.78,.14,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.29,tag:'会议室'});
      box(x,2.24,13.34,3.29,2.52,.035,P.silk,{...MAT.cloth,hard:true,mode:7,gloss:.06,tag:'会议室'});
      for(const dx of [-1.48,1.48]) box(x+dx,2.24,13.285,.075,2.36,.055,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'会议室'});
      for(const y of [1.08,3.43]) box(x,y,13.285,3.16,.045,.055,P.bronzeL,
        {hard:true,gloss:POLISH,tag:'会议室'});
      luminous(box(x,3.50,13.27,2.72,.025,.035,P.warm,
        {hard:true,mode:1,tag:'会议室'}),.04,.16);
      ceilingRaft(x,10.9,3.42,2.05,P.walnutD,'会议室天花');
      stadium(x,.70,10.9,2.85,1.15,.12,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'会议室'});
      stadium(x,.79,10.9,3.02,1.30,.055,P.bronzeL,{hard:true,gloss:POLISH,tag:'会议室'});
      for(const dx of [-1.05,1.05]) for(const dz of [-.40,.40]) taper(x+dx,.34,10.9+dz,.06,.68,.045,P.walnutD,
        {...MAT.timber,mode:6,gloss:.25,tag:'会议室'});
      cyl(x,.84,10.9,.14,.035,P.ink,{gloss:.24,tag:'会议室'});
      for(const s of [-1,1]) capsule(x+s*.11,.87,10.9,.012,.18,.012,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'会议室'});
      for(const s of [-1,1]){
        box(x+s*.62,.845,10.88,.42,.025,.30,P.cream,
          {...MAT.cloth,hard:true,mode:7,ry:s*.055,tag:'会议室'});
        capsule(x+s*.62,.875,10.72,.012,.30,.012,P.bronzeD,
          {rz:Math.PI/2,gloss:AGED,tag:'会议室'});
        cyl(x+s*.39,.86,11.18,.055,.095,P.celadonL,{gloss:.22,tag:'会议室'});
      }
      for(const dx of [-.72,.72]){
        chair(x+dx,9.95,Math.PI,P.silk,'会议室');
        chair(x+dx,11.85,0,P.silk,'会议室');
      }
      box(x,2.42,13.25,2.65,1.38,.08,P.glassD,{hard:true,mode:1,glow:.025,tag:'会议室'});
      box(x,1.62,13.18,2.86,.42,.36,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.28,tag:'会议室'});
      for(const dx of [-.72,.72]) box(x+dx,2.42,13.17,.10,.70,.10,P.bronzeD,{hard:true,gloss:AGED,tag:'会议室'});
      for(const xx of [x-.74,x,x+.74]) cyl(xx,1.68,12.96,.055,.06,P.bronzeL,{gloss:POLISH,tag:'会议室'});
      glyphs(x,2.42,13.19,0,'会议室',{size:.16,gap:.04,color:P.cream,mode:1,lift:.006,tag:'会议室'});
    }
    fixture('会议室',6.0,11.0,'会议室准备了屏幕、电话和可移动座椅。',
      'The meeting room has a display, conference phone and movable chairs.',
      '会议室 is a meeting room.','banqueting',[6.0,8.95],2.0);

    // Business centre is close to, but never inside, the lift landing.  Walnut library shelving,
    // two workstations and a print counter give it a credible future workplace seam.
    xPanel(12.15,2.20,-9.1,5.4,2.65,'商务中心','BUSINESS CENTRE',P.ink,'商务中心');
    flat(8.7,.024,-9.15,7.0,5.15,P.walnutD,{mode:7,gloss:.05,tag:'商务中心'});
    for(const z of [-10.6,-8.65]){
      box(8.55,.70,z,4.2,.12,1.05,P.walnut,{...MAT.timber,mode:6,gloss:.30,tag:'商务中心'});
      box(8.55,.79,z,4.38,.045,1.18,P.bronzeL,{hard:true,gloss:POLISH,tag:'商务中心'});
      for(const dx of [-1.72,1.72]) for(const dz of [-.36,.36]) taper(8.55+dx,.34,z+dz,.06,.68,.045,P.walnutD,
        {...MAT.timber,mode:6,gloss:.25,tag:'商务中心'});
      for(const s of [-1,1]){
        chair(8.55+s*.82,z-.85,Math.PI,P.silk,'商务中心');
        box(8.55+s*.82,1.30,z,.56,.42,.08,P.glassD,{hard:true,mode:1,glow:.04,tag:'商务中心'});
        capsule(8.55+s*.82,1.02,z,.025,.34,.025,P.bronzeD,{gloss:AGED,tag:'商务中心'});
        box(8.55+s*.82,.86,z,.40,.035,.24,P.bronzeD,{hard:true,gloss:AGED,tag:'商务中心'});
        box(8.55+s*.82,.84,z-.30,.52,.025,.18,P.inkL,{hard:true,gloss:.16,tag:'商务中心'});
      }
    }
    // Credenza-mounted multifunction printer with paper trays, output slot, control and feet.
    box(11.15,.10,-7.15,1.58,.20,1.02,P.walnutD,{...MAT.timber,hard:true,mode:6,gloss:.24,tag:'商务中心'});
    box(11.15,.52,-7.15,1.45,.64,.92,P.limestoneD,{...MAT.stone,gloss:.18,tag:'商务中心'});
    for(const y of [.34,.61]){
      box(10.415,y,-7.15,.025,.18,.68,P.jade,{hard:true,mode:1,gloss:.20,tag:'商务中心'});
      capsule(10.38,y,-7.15,.018,.36,.018,P.bronzeL,{rz:Math.PI/2,gloss:POLISH,tag:'商务中心'});
    }
    box(11.15,.90,-7.15,1.34,.22,.82,P.cream,{...MAT.cloth,hard:true,mode:7,gloss:.16,tag:'商务中心'});
    box(11.15,1.08,-7.25,1.16,.14,.62,P.glassD,{hard:true,mode:1,gloss:.24,tag:'商务中心'});
    box(11.15,1.17,-7.45,.82,.035,.34,P.ink,{hard:true,gloss:.22,tag:'商务中心'});
    box(10.72,1.18,-6.94,.22,.035,.13,P.jade,{hard:true,mode:1,glow:.03,tag:'商务中心'});
    for(const x of [10.55,11.75]) for(const z of [-7.48,-6.82]) cyl(x,.025,z,.06,.05,P.bronzeD,{gloss:AGED,tag:'商务中心'});
    for(let i=0;i<4;i++) box(11.73,1.15+i*.42,-10.65,.16,.08,2.55,P.bronzeL,{hard:true,gloss:POLISH,tag:'商务中心'});
    fixture('商务中心',8.55,-9.15,'商务中心可以打印、开视频会议和处理邮件。',
      'The business centre supports printing, video calls and email work.',
      '商务 means business affairs.','front-office',[6.1,-9.15],2.1);

    planter(-15.4,-3.3,.48,.50,'绿化');
    planter(12.5,-3.2,.46,.48,'绿化');

    onTick((t,body,clock,dt)=>{
      for(const q of crystals){
        q.m=M.mul(M.trans(0,.018*Math.sin(t*.58+q._phase),0),q._m0);
        q.glow=.12+.13*(.5+.5*Math.sin(t*.72+q._phase));
      }
      for(const q of eventLights) q.glow=.09+.15*(.5+.5*Math.sin(t*.36+q._phase));
      for(const q of banquet){
        const R=M.mul(M.trans(q.x,0,q.z),M.mul(M.rotY(t*.045+q.phase),M.trans(-q.x,0,-q.z)));
        q.p.m=M.mul(R,q.p._m0);
      }
      // Twenty-four-second programme: partition opens only forty centimetres, enough to make its
      // operable state legible without crossing the guest path or invalidating colliders.
      const u=.5-.5*Math.cos(((t%24)/24)*Math.PI*2);
      for(const q of partitions){
        const dz=q.index<2?u*(q.index?-.36:.36):0;
        for(const p of q.parts)p.m=M.mul(M.trans(0,0,dz),p._m0);
      }
      for(let i=0;i<eventRows.length;i++) eventRows[i].glow=.025+.045*(.5+.5*Math.sin(t*.55+i*.05));
      A.state.public={ballroomEvent:'modern-Chinese-wedding',chandelierCrystals:crystals.length,
        programmedLights:eventLights.length,partition:+u.toFixed(3),meetingRooms:2};
    });
  });

  // -------------------------------------------------------------------------------------------
  // 前台 — the front desk, as a transaction rather than a pose.
  //
  // The rules all live in js/stay.js, which draws nothing and knows about no room.  This is the
  // desk's own side of them: the walk-up prompt, the panels, and the four places money and minutes
  // actually move.  It is the same arrangement js/mall-cinema.js uses for the box office —
  // `money`, `Pick`, `advanceTime` and `logDiary` are all `const` inside game.js's IIFE, so the
  // seam is `window.__game`.
  //
  // How the panel is opened is worth stating plainly.  The row's `stayDesk` key is the opener
  // itself, and `stopUse` calls it beside every other panel opener (`if (def.stayDesk)
  // def.stayDesk();`, js/game.js).  It used to be a side-effect inside the `done` getter, which
  // worked only because game.js happens to read `def.done` exactly once — a hook nobody would
  // find twice.  `done` is a plain string again.
  const reception = (() => {
    const G = () => window.__game || null;
    const H = {
      money(){ try { return Math.floor(G().state().money) || 0; } catch (_) { return 0; } },
      day(){ try { return Math.max(1, G().state().day | 0); } catch (_) { return 1; } },
      minutes(){ try { return G().state().minutes | 0; } catch (_) { return 0; } },
      hour(){ return H.minutes() / 60; },
      pay(n){ const g = G(); if (g && g.setMoney) g.setMoney(Math.max(0, H.money() - n)); },
      refund(n){ const g = G(); if (g && g.setMoney) g.setMoney(H.money() + n); },
      spend(n){ const g = G(); if (g && g.advanceTime && n > 0) g.advanceTime(n); },
      Pick(){ const g = G(); return (g && g.Pick) || null; },
      // game.js's own `say` is not published on __game; this writes the same toast element the
      // same way js/mall-cinema.js does.
      say(zh, en){
        const el = document.getElementById('toast'); if (!el) return;
        el.innerHTML = en ? `${zh} · <span class="dim">${en}</span>` : zh;
        el.style.opacity = 1;
        clearTimeout(H._t); H._t = setTimeout(() => { el.style.opacity = 0; }, 4600);
      },
      diary(zh, en, tag){ const g = G(); if (g && g.logDiary) g.logDiary(zh, en, tag); },
      word(zh){ const g = G(); try { if (g && g.Vocab && g.Vocab.sentenceHTML) g.Vocab.sentenceHTML(zh); } catch (_) {} },
      mood(n){ const g = G(); if (g && g.needs) g.needs.mood = Math.max(0, Math.min(100, g.needs.mood + n)); },
    };
    const yuan = n => (n < 0 ? `−¥${-n}` : `¥${n}`);

    // Three reads that existed and had no caller. All are pure — `Story.reception()` is a summary
    // of stays already taken, `Disrupt.hotelCheckin` is what the hour means for a room tonight —
    // so the desk may ask on every open. `waiveDeposit` has to be honoured HERE and not inside
    // `Stay.quote`, because every deposit figure the guest reads is printed from `Stay.DEPOSIT` at
    // this level: zeroing it in the module would make the desk say 押金¥200 and charge nothing.
    const recep = () => { try { return Story.reception(); } catch (_) { return null; } };
    const arrival = (day, mins) => { try { return Disrupt.hotelCheckin(day, mins); } catch (_) { return null; } };
    const waived = () => { const r = recep(); return !!(r && r.favours && r.favours.waiveDeposit); };
    const depositNow = () => waived() ? 0 : Stay.DEPOSIT;

    // ---- 出示证件. Asked for first, because it is asked for first (H103).
    function openDoc(back){
      const P = H.Pick(); if (!P) return;
      P.show({ title:'前台 · 请出示证件', sub:'办理入住要登记证件 · registration needs a document',
        rows:Stay.DOCS.map(d => ({ hz:d.hz, py:d.py, en:d.en, right:'登记', doc:d.key })),
        onPick(r){
          const d = Stay.showDoc(r.doc);
          H.word(`我用${d.hz}登记。`);
          H.say(`${d.hz}登记好了。`, `Registered with your ${d.en}.`);
          H.spend(2);
          setTimeout(back, 0);
          return true;
        } });
    }

    // ---- 住几晚. The second half of the booking, and the moment the ¥ stops being one number.
    function openNights(offer){
      const P = H.Pick(); if (!P) return;
      const day = H.day(), money = H.money(), dep = depositNow();
      P.show({ title:`${offer.hz} · 住几晚`,
        sub:`¥${offer.rate}一晚 · ${dep ? `押金¥${dep}` : '老客人免押金'} · 钱包¥${money}`,
        rows:[1, 2, 3, 5, 7].map(n => {
          const q = Stay.quote(offer.grade.key, day, n);
          return { hz:`${n}晚`, py:`${n} wǎn`,
            en:q ? `房费¥${offer.rate * n}${dep ? ` + 押金¥${dep}` : ' · 免押金 · deposit waived'}`
                 : `这几天没有空房 · none free for ${n}`,
            right:q ? `¥${q.total - (Stay.DEPOSIT - dep)}` : '满房',
            off:!q || q.total - (Stay.DEPOSIT - dep) > money, nights:n };
        }),
        onPick(r){
          const q = Stay.quote(offer.grade.key, day, r.nights);
          if (!q) { H.say('这几天没有空房。', 'Nothing free for those dates.'); return false; }
          // The waive is applied to the quote before anything reads it, so the wallet, the folio
          // and the bill's 押金 line are all the same number. `Stay.book` copies `deposit` and
          // `total` straight off this object.
          if (!dep) { q.total -= q.deposit; q.deposit = 0; }
          if (q.total > H.money()) {
            const c = Stay.cheapest(day, r.nights, H.money());
            H.say(`差${q.total - H.money()}块。${c ? `${c.hz}可以。` : '要不要少住一晚？'}`,
                  c ? `¥${q.total - H.money()} short — the ${c.en} at ¥${c.rate} is within reach.`
                    : `¥${q.total - H.money()} short — try fewer nights.`);
            return false;
          }
          H.pay(q.total);
          Stay.book(q, day);
          H.spend(10);
          H.mood(5);
          H.word(`我要住${r.nights}晚。`);
          // The upgrade is said out loud, with the price repeated, because a guest who is handed a
          // room they did not ask for and a number they did not expect assumes they are being
          // charged for it. `q.rate` is the grade they picked and it is what the folio bills.
          H.say((q.up ? `给您升级到${q.up.hz}，还是${q.rate}一晚。` : '')
                + `${q.room}房，房卡好了。房费${q.rate * q.nights}，押金${q.deposit}，退房时退。`,
                (q.up ? `Upgraded to the ${q.up.en} at the ${q.up.fromEn} price. ` : '')
                + `Room ${q.room}. ¥${q.rate * q.nights} for the room and a ¥${q.deposit} deposit back at check-out.`);
          H.diary(`在京华大酒店办了入住，${q.room}房，住${q.nights}晚。`,
                  `Checked in at the Jinghua Grand — room ${q.room}, ${q.nights} night(s).`, 'hotel-checkin');
          return true;
        } });
    }

    // ---- 报修. The reply is the lesson; what you choose to do about it is the answer, and there
    // is no wrong-answer screen anywhere in it (H119, H120).
    function openReport(){
      const P = H.Pick(); if (!P) return;
      P.show({ title:'前台 · 报修', sub:'房间怎么了？ · what is wrong with the room',
        rows:Stay.PROBLEMS.map(p => ({ hz:p.hz, py:p.py, en:p.en, right:p.dept, key:p.key })),
        onPick(r){ setTimeout(() => openHeard(r.key), 0); return true; } });
    }
    function openHeard(key, shown){
      const P = H.Pick(); if (!P) return;
      const p = Stay.problem();
      const said = Stay.reply(key);
      if (!p || !said) { H.say('房间没有问题。', 'Nothing is wrong with the room.'); return; }
      const real = Stay.PROBLEMS.find(q => q.key === key);
      P.show({ title:said[0], sub:shown ? said[1] : '前台说了一句 · she says one sentence, once',
        rows:[
          { hz:real.act.hz, py:'', en:shown ? real.act.en : '', right:'好', heard:true },
          { hz:real.slip.hz, py:'', en:shown ? real.slip.en : '', right:'好', heard:false },
          { hz:'请您再说一遍', py:'qǐng nín zài shuō yí biàn', en:'ask her to say it again — 3 minutes',
            right:'再问', again:true },
        ],
        onPick(r){
          if (r.again) { H.spend(3); setTimeout(() => openHeard(key, true), 0); return true; }
          const out = Stay.report(key, r.heard, H.day());
          if (!out) { H.say('已经处理好了。', 'That has already been dealt with.'); return true; }
          H.spend(out.mins);
          if (!out.fixed) H.mood(-6);
          H.word(said[0]);
          H.say(out.zh, out.en + (out.discount ? ` A ¥${out.discount} goodwill discount goes on the bill.` : ''));
          H.diary(out.fixed ? `跟前台说了${real.hz}，处理好了。` : `跟前台说了${real.hz}，送来的却是${out.wrong.hz}。`,
                  out.fixed ? `Reported ${real.en}; it was sorted.` : `Reported ${real.en}; ${out.wrong.en}.`,
                  'hotel-report');
          return true;
        } });
    }

    // ---- 账单. Read it before you agree to it (H123).
    function openBill(){
      const P = H.Pick(); if (!P) return;
      const day = H.day(), b = Stay.bill(day, H.minutes());
      if (!b) return;
      const rows = [{ sec:`${b.room}房 · 账单`, en:`room ${b.room} · itemised bill` }];
      for (const r of b.rows) rows.push({ hz:r.hz, py:r.py, en:r.en, right:yuan(r.amt), read:true });
      rows.push({ hz:'押金', py:'yājīn', en:'deposit held at check-in', right:yuan(-b.deposit), read:true });
      rows.push({ hz:'预付', py:'yùfù', en:'paid at check-in', right:yuan(-b.paid), read:true });
      rows.push({ hz:b.settle >= 0 ? '退您' : '还要付', py:b.settle >= 0 ? 'tuì nín' : 'hái yào fù',
        en:b.settle >= 0 ? 'back to you' : 'still to pay', right:yuan(Math.abs(b.settle)), read:true });
      rows.push({ hz:'确认退房', py:'quèrèn tuìfáng', en:'check out and settle', right:'退房', go:true });
      P.show({ title:'京华大酒店 · 退房', sub:`${b.nights}晚 · 共¥${b.total} · 钱包¥${H.money()}`, rows,
        onPick(r){
          if (!r.go) return false;
          // Time continues behind the bill panel. Re-read it at confirmation so crossing a daily
          // charge boundary cannot settle yesterday's captured total and clear the stay cheaply.
          const nowDay=H.day(), nowMinutes=H.minutes();
          const live=Stay.bill(nowDay,nowMinutes);
          if (!live) return true;
          if (live.nights!==b.nights || live.total!==b.total ||
              live.deposit!==b.deposit || live.settle!==b.settle) {
            H.say('账单有变化，请重新确认。','The bill has changed; review the updated total.');
            setTimeout(openBill,0);
            return true;
          }
          if (live.settle < 0 && H.money() < -live.settle) {
            H.say(`还差${-live.settle - H.money()}块，先去取钱。`,
                  `¥${-live.settle - H.money()} short of settling the bill — the cash machine is at the bank.`);
            return false;
          }
          const done = Stay.checkOut(nowDay,nowMinutes);
          if (done.settle >= 0) H.refund(done.settle); else H.pay(-done.settle);
          H.spend(8);
          H.word('我要退房。');
          H.say(done.settle >= 0 ? `退房好了，退您${done.settle}块。` : `退房好了，补了${-done.settle}块。`,
                done.settle >= 0 ? `Checked out — ¥${done.settle} back.` : `Checked out — ¥${-done.settle} to pay.`);
          H.diary(`在京华大酒店退房，住了${done.nights}晚，一共${done.total}块。`,
                  `Checked out of the Jinghua Grand — ${done.nights} night(s), ¥${done.total}.`, 'hotel-checkout');
          return true;
        } });
    }

    function openLate(){
      const P = H.Pick(); if (!P) return;
      P.show({ title:'前台 · 延迟退房', sub:'退房是中午十二点 · check-out is noon',
        rows:[14, 16, 18].map(h => {
          const q = Stay.lateQuote(h);
          return { hz:`延到${h}点`, py:`yán dào ${h} diǎn`,
            en:q && q.amt ? `half a day's charge` : 'no charge — they are used to being asked',
            right:q ? (q.amt ? `¥${q.amt}` : '免费') : '—', off:!q || (q && q.amt > H.money()), h };
        }),
        onPick(r){
          const q = Stay.lateQuote(r.h);
          if (!q) return false;
          if (q.amt > H.money()) { H.say('钱不够。', 'Not enough for that.'); return false; }
          // The folio owns this charge (js/stay.js, `kind:'lateout'`), so the desk must not also
          // take it out of the wallet — that billed a late check-out twice, once here and once on
          // the bill. The money moves when the bill is settled, which is also the only place the
          // player ever reads the amount.
          Stay.lateCheckout(r.h, H.day());
          H.word(`能不能延到${r.h}点退房？`);
          H.say(q.amt ? `可以，${r.h}点退房，${q.amt}块记在房账上。` : `可以，${r.h}点退房。`,
                q.amt ? `Agreed — check out by ${r.h}:00. ¥${q.amt} goes on the room bill.`
                      : `Agreed — check out by ${r.h}:00.`);
          return true;
        } });
    }

    // ---- the desk itself.
    function openDesk(){
      const P = H.Pick(); if (!P) return;
      const day = H.day(), mins = H.minutes(), money = H.money();
      const b = Stay.booking(day, mins);
      const r0 = recep(), arrive = arrival(day, mins), dep = depositNow();
      const rows = [];
      if (!b) {
        if (Stay.needsDoc())
          rows.push({ hz:'出示证件', py:'chūshì zhèngjiàn', en:'reception asks for ID first',
            right:'登记', doc:true });
        // What the hour means for a room, said by the clerk rather than enforced as a rule.
        if (arrive) rows.push({ sec:arrive.hz, en:arrive.en });
        rows.push({ sec:'今天的房价',
          en:`tonight · ${dep ? `deposit ¥${dep}` : 'no deposit for a returning guest'} · wallet ¥${money}` });
        for (const o of Stay.offers(day, 1, money))
          rows.push({ hz:o.hz, py:o.py, right:`¥${o.rate}`,
            en:!o.rooms ? `${o.en} · 今天满房 · full tonight`
              : `${o.en} · 还有${o.rooms}间`
                // 免费升级 (H139). The price on the row does not move, because js/stay.js does not
                // move it — the guest is given the better room for the money they were already
                // spending, so every ¥ printed here stays the ¥ that gets charged.
                + (o.up ? ` · 给您升级到${o.up.hz} · upgraded to the ${o.up.en}, same price` : '')
                + (o.total - (Stay.DEPOSIT - dep) <= money ? '' : ` · 差¥${o.total - (Stay.DEPOSIT - dep) - money}`),
            off:!o.rooms || Stay.needsDoc(), offer:o });
      } else {
        const p = Stay.problem();
        rows.push({ sec:`${b.room}房 · ${Stay.GRADES.find(g => g.key === b.grade).hz}`,
          en:`room ${b.room} · until day ${b.to}, check-out ${Stay.dueHour()}:00` });
        rows.push({ hz:'退房', py:'tuìfáng', en:'check out and read the bill', right:'账单', bill:true });
        rows.push({ hz:'延迟退房', py:'yánchí tuìfáng', en:'negotiate a later check-out', right:'谈', late:true });
        rows.push({ hz:'报修', py:'bàoxiū', en:p && !p.fixed ? `report ${p.en}` : 'report a problem with the room',
          right:p && !p.fixed ? '有问题' : '—', report:true });
        rows.push({ hz:'补办房卡', py:'bǔbàn fángkǎ',
          en:Stay.hasKey() ? 'you already have your card' : `a new key card — ${Stay.KEY_REISSUE_MINS} minutes`,
          right:'房卡', off:Stay.hasKey(), rekey:true });
        const lug = Stay.luggage();
        rows.push({ hz:lug ? '取行李' : '寄存行李', py:lug ? 'qǔ xínglǐ' : 'jìcún xínglǐ',
          en:lug ? `bell desk tag ${lug.tag}` : 'leave your bags at the bell desk', right:'行李', bag:true });
      }
      P.show({ title:'京华大酒店 · 前台', start:rows.find(r => !r.sec && !r.off)?.hz,
        // The desk reads differently for a guest it remembers: `Story.reception().greeting` is
        // written from how the previous stays actually went, including the late check-outs.
        sub:b ? `${b.room}房 · 押金¥${b.deposit} · 钱包¥${money}`
              : `${r0 ? r0.greeting.hz : (Stay.stays() ? '欢迎再次光临。' : '欢迎光临。')} 钱包¥${money}`,
        rows,
        onPick(r){
          if (r.doc) { setTimeout(() => openDoc(openDesk), 0); return true; }
          if (r.offer) {
            if (Stay.needsDoc()) { H.say('请先出示身份证或护照。', 'Present an ID card or passport first.'); return false; }
            if (!r.offer.rooms) { H.say(`${r.offer.hz}今天满房了。`, `No ${r.offer.en} free tonight.`); return false; }
            if (r.offer.total - (Stay.DEPOSIT - dep) > money) {
              // Never a dead end: the desk names the room you *can* have (H101).
              const c = Stay.cheapest(day, 1, money);
              H.say(c ? `${r.offer.hz}差${r.offer.total - (Stay.DEPOSIT - dep) - money}块，${c.hz}可以。` : `钱不够，今天住不了。`,
                    c ? `¥${r.offer.total - (Stay.DEPOSIT - dep) - money} short. The ${c.en} is ¥${c.rate}${dep ? ` plus the ¥${dep} deposit` : ''}.`
                      : 'Not enough for any room tonight, even the standard one.');
              return false;
            }
            setTimeout(() => openNights(r.offer), 0);
            return true;
          }
          if (r.bill) { setTimeout(openBill, 0); return true; }
          if (r.late) { setTimeout(openLate, 0); return true; }
          if (r.report) { setTimeout(openReport, 0); return true; }
          if (r.rekey) {
            if (Stay.hasKey()) return false;
            const k = Stay.reissueKey();
            H.spend(k.mins); H.word('房卡丢了，麻烦补办一张。'); H.say(k.zh, k.en);
            return true;
          }
          if (r.bag) {
            const got = Stay.collectLuggage(day);
            if (got) H.say(`${got.tag}号，行李拿到了。`, `Tag ${got.tag} — your bags are back.`);
            else { const t = Stay.storeLuggage(day);
                   H.say(`存好了，${t.tag}号牌，今天之内来取。`, `Stored — tag ${t.tag}, collect it later today.`); }
            H.spend(3);
            return true;
          }
          return false;
        } });
    }

    // The walk-up prompt. `en` is rebuilt only when the desk's own state changes, so standing in
    // front of it costs one string comparison a frame rather than a formatted line.
    let sig = '', label = 'check in — a room, a deposit and a key card';
    const row = {
      zh:'办理入住', py:'bànlǐ rùzhù', secs:2.8, mins:2, pose:{ type:'check' },
      stayDesk:openDesk,
      get en(){
        // The waive is part of what the prompt promises, so it is part of what invalidates the
        // cached line — `Stay.sig()` alone does not move when the guest's history does.
        const s = `${Stay.sig()}|${depositNow()}`;
        if (s !== sig) {
          sig = s;
          const b = Stay.booking(), dep = depositNow();
          label = b ? `room ${b.room} — bill, key card, late check-out or a problem`
                    : `check in — rooms from ¥${Stay.GRADES[0].rate}`
                      + (dep ? ` plus a ¥${dep} deposit` : ', no deposit for a returning guest');
        }
        return label;
      },
      get done(){
        return Stay.checkedIn() ? '您好，有什么可以帮您？' : '欢迎光临京华大酒店，请问几位，住几晚？';
      },
      get doneTr(){
        return Stay.checkedIn() ? 'Good evening — what can we do for you?'
                                : 'Welcome to the Jinghua Grand. How many of you, and how many nights?';
      },
    };
    return { row, openDesk, openBill, openReport };
  })();

  // -------------------------------------------------------------------------------------------
  // Floor-local actions.  These are ordinary hospitality rituals, not a career system; stable
  // fixture tags and department metadata above are the deliberate attachment points for one.
  // ---- the two boards that read the day rather than a fixed sentence.
  //
  // `Disrupt.hotelNote` and `Disrupt.hotelEvent` were both defined and never read: one repo-wide
  // reference each, their own definition. They are pure reads of a memoised day plan, so a board
  // may ask on every open and cost nothing. These getters compute a string and touch nothing —
  // unlike the desk hook that used to live in a `done` getter, which is now a plain dispatch.
  const today = () => { try { return Math.max(1, window.__game.state().day | 0); } catch (_) { return 1; } };
  const dayNote = () => { try { return Disrupt.hotelNote(today()); } catch (_) { return null; } };
  const dayEvent = () => { try { return Disrupt.hotelEvent(today()); } catch (_) { return null; } };
  // 早餐. Null when nobody is checked in, which is when the buffet has nothing to say about your
  // room. `Stay.breakfast` needs the hour only for its own `open` field, which this does not read —
  // the row's `open:[6.5,10]` window is what actually shuts the buffet.
  const meal = () => { try { return Stay.checkedIn() ? Stay.breakfast(8) : null; } catch (_) { return null; } };

  Object.assign(HotelUse.hotel, {
    '前台':reception.row,
    '礼宾部':{zh:'问礼宾',py:'wèn lǐbīn',en:'ask the concierge',secs:2.0,mins:3,
      gain:{mood:3},pose:{type:'talk'},done:'礼宾员在地图上标出了路线。',doneTr:'The concierge marks the route on a map.'},
    '行李车':{zh:'推行李车',py:'tuī xínglǐchē',en:'move the luggage trolley',secs:2.0,mins:2,
      gain:{rest:-1},pose:{type:'lift'},done:'行李车稳稳地推回了礼宾台。',doneTr:'The trolley rolls neatly back to the bell desk.'},
    '茶桌':{zh:'品茶',py:'pǐn chá',en:'take tea in the lobby',secs:3.2,mins:18,
      gain:{mood:8,rest:2},pose:{type:'drink'},done:'茉莉香气慢慢散开。',doneTr:'The jasmine aroma slowly opens.'},
    '水景':{zh:'看水景',py:'kàn shuǐjǐng',en:'watch the water court',secs:2.3,mins:5,
      gain:{mood:6},pose:{type:'stand'},done:'水面映着银杏和铜灯。',doneTr:'Ginkgo and bronze lights reflect in the water.'},
    '今日接待':{zh:'看接待牌',py:'kàn jiēdàipái',en:'read the reception board',secs:1.7,mins:2,
      pose:{type:'read'},
      get done(){ const n = dayNote(); return n ? n.hz : '接机和会议迎宾都写在牌上。'; },
      get doneTr(){ const n = dayNote(); return n ? n.en : 'Transfers and conference welcomes are all listed.'; }},
  });
  Object.assign(HotelUse.hotel2, {
    '餐厅接待':{zh:'问座位',py:'wèn zuòwèi',en:'ask for a table',secs:2.0,mins:4,
      gain:{mood:3},pose:{type:'talk'},done:'接待员带你走向餐桌。',doneTr:'The host leads you to a table.'},
    '餐桌':{zh:'一起用餐',py:'yìqǐ yòngcān',en:'share a meal',secs:3.5,mins:35,
      gain:{food:24,mood:9},pose:{type:'eat'},done:'大家转着转盘，慢慢吃完这一桌菜。',doneTr:'Everyone turns the lazy Susan and shares the meal.'},
    // 早餐 (H114). The window is the `open:[6.5,10]` js/data.js patches onto this row from
    // js/stay.js's own BREAKFAST; what this getter adds is the other half — whether it is included
    // at the grade you actually booked, or whether you are paying for it. A pure read of
    // `Stay.breakfast`, in the same shape as the two day boards below: it computes a string and
    // touches nothing, so it is safe on the label path that a `done` getter sits on.
    '早餐自助':{zh:'取早餐',py:'qǔ zǎocān',en:'take breakfast from the buffet',secs:2.5,mins:18,
      gain:{food:18,rest:5},pose:{type:'take'},
      get done(){ const b = meal();
        return !b ? '热粥、小菜和水果装好了。'
             : b.included ? '您的房型含早餐，请随意。'
             : '您的房型不含早餐，自助餐八十八一位。'; },
      get doneTr(){ const b = meal();
        return !b ? 'Congee, side dishes and fruit are on the plate.'
             : b.included ? 'Breakfast is included with your room — help yourself.'
             : 'Breakfast is not included with your room; the buffet is ¥88 a head.'; }},
    '包间':{zh:'看包间',py:'kàn bāojiān',en:'view a private dining room',secs:1.8,mins:3,
      gain:{mood:3},pose:{type:'open'},done:'包间安静，茶具和餐位都准备好了。',doneTr:'The room is quiet; tea ware and place settings are ready.'},
    '明档厨房':{zh:'看厨师做菜',py:'kàn chúshī zuòcài',en:'watch the show kitchen',secs:2.6,mins:7,
      gain:{mood:4},pose:{type:'stand'},done:'炒锅起火，蒸汽一下升到铜烟罩。',doneTr:'The wok flames and steam rises into the copper hood.'},
    '传菜口':{zh:'检查传菜口',py:'jiǎnchá chuáncàikǒu',en:'check the service pass',secs:2.0,mins:4,
      pose:{type:'check'},done:'餐具、桌号和出菜顺序都对了。',doneTr:'Tableware, table numbers and service order are correct.'},
  });
  Object.assign(HotelUse.hotel3, {
    '签到处':{zh:'签到',py:'qiāndào',en:'sign in for the event',secs:2.0,mins:3,
      gain:{mood:3},pose:{type:'check'},done:'名牌领好了，座位也找到了。',doneTr:'You collect your name card and find your table.'},
    '宴会厅':{zh:'参加婚宴',py:'cānjiā hūnyàn',en:'join the wedding banquet',secs:3.5,mins:45,
      gain:{food:18,mood:12},pose:{type:'eat'},done:'灯光暖下来，婚宴正式开始。',doneTr:'The lights warm and the wedding banquet begins.'},
    '婚礼沙龙':{zh:'看婚礼方案',py:'kàn hūnlǐ fāngàn',en:'review a wedding concept',secs:2.6,mins:12,
      gain:{mood:6},pose:{type:'read'},done:'面料、花艺和灯光方案放在了一起。',doneTr:'Fabric, flowers and lighting come together in one concept.'},
    '会议室':{zh:'开会',py:'kāihuì',en:'hold a meeting',secs:3.0,mins:30,
      gain:{rest:-4},pose:{type:'talk'},done:'会议结束，行动项目已经记下。',doneTr:'The meeting ends with action items recorded.'},
    '商务中心':{zh:'处理邮件',py:'chǔlǐ yóujiàn',en:'work through email',secs:3.0,mins:25,
      gain:{rest:-4},pose:{type:'type'},done:'邮件发完了，文件也打印好了。',doneTr:'The email is sent and the document printed.'},
    '今日活动':{zh:'看活动牌',py:'kàn huódòngpái',en:'read today\'s events',secs:1.7,mins:2,
      pose:{type:'read'},
      get done(){ const e = dayEvent();
        return e ? `今天三楼有${e.hz}，${e.from}点到${e.to}点。`
                 : '今天三楼没有安排，厅里很安静。'; },
      get doneTr(){ const e = dayEvent();
        return e ? `${e.en[0].toUpperCase()}${e.en.slice(1)} on 3F, ${e.from}:00 to ${e.to}:00.`
                 : 'Nothing booked in the ballroom today.'; }},
  });

  // Public-floor cast.  Their exact positions were chosen against the fit-out above and remain
  // clear of the lift landing (x>14), the centre arrival runner and both service spines.
  const publicCast = [
    {hz:'门童',name:'高迎',py:'Gāo Yíng',place:'hotel',rig:'hotel-doorman-gao-ying',temper:'poised',
      look:{skin:'#d6a277',hair:'#211c1a',hairStyle:'short',top:'#eee5d7',pants:'#292b30',shoe:'#252529',
        jacket:'#633532',tie:'#b58b4f',hatColor:'#633532',tall:1.05,wide:1.00,faceSeed:4601},
      spots:[{h0:0,h1:24,at:[2.25,-10.0],face:Math.PI,act:'wait'}],
      lines:[['欢迎光临，前台在右手边。','Welcome. Reception is on your right.'],
             ['外面有车，我来为您开门。','Your car is outside; I will open the door.']]},
    {hz:'前台接待员',name:'林若',py:'Lín Ruò',place:'hotel',rig:'hotel-front-desk-lin-ruo',temper:'focused',
      look:{skin:'#e3b38b',hair:'#29211f',hairStyle:'bun',top:'#f0e7da',pants:'#323239',shoe:'#29282c',
        jacket:'#5b413a',scarf:'#9a332d',tall:.98,wide:.94,faceSeed:4602},
      // Stand in the staffed bay between the centre and eastern terminals.  Centring the figure
      // directly behind a monitor hid the entire receptionist and made an occupied desk read empty.
      spots:[{h0:0,h1:24,at:[10.55,-13.58],face:0,act:'work',held:null}],
      lines:[['您好，请出示证件。','Good afternoon. May I see your identification?'],
             ['早餐在二楼全日餐厅。','Breakfast is in the second-floor all-day restaurant.']]},
    {hz:'茶艺师',name:'苏婉',py:'Sū Wǎn',place:'hotel',rig:'hotel-tea-master-su-wan',temper:'calm',
      look:{skin:'#ddb087',hair:'#2b211d',hairStyle:'bun',top:'#d9e2d8',pants:'#4c4a45',shoe:'#302e2b',
        apron:'#6b8477',collar:'mandarin',tall:.97,wide:.94,faceSeed:4603},
      spots:[{h0:8,h1:23,at:[-8.05,9.55],face:Math.PI,act:'pour',held:'teapot'}],
      lines:[['这泡是北京茉莉花茶。','This is Beijing jasmine tea.'],
             ['水温刚好，请慢慢品。','The water is just right; take your time.']]},
    {hz:'住客',place:'hotel',temper:'relaxed',seatY:.53,
      look:{skin:'#c99368',hair:'#2b2522',hairStyle:'part',top:'#778b80',pants:'#3d4148',shoe:'#292d31',
        jacket:'#665447',tall:1.04,faceSeed:4611},
      spots:[{h0:8,h1:23,at:[-10.48,7.6],face:Math.PI/2,act:'drink'}],
      lines:[['大堂很安静，水景也漂亮。','The lobby is quiet, and the water court is beautiful.']]},

    {hz:'餐厅接待员',name:'叶青',py:'Yè Qīng',place:'hotel2',rig:'hotel2-host-ye-qing',temper:'poised',
      look:{skin:'#deb087',hair:'#30251f',hairStyle:'bob',top:'#efe7da',pants:'#37363a',shoe:'#2d2b2d',
        vest:'#496b5e',scarf:'#a7773d',tall:.99,faceSeed:4621},
      spots:[{h0:6,h1:23,at:[2.40,-2.75],face:-Math.PI/2,act:'wait'}],
      lines:[['两位吗？中餐厅这边请。','A table for two? The Chinese restaurant is this way.'],
             ['包间已经准备好了。','Your private room is ready.']]},
    {hz:'中餐厨师',name:'邓师傅',py:'Dèng shīfu',place:'hotel2',rig:'hotel2-chef-deng-shifu',temper:'busy',
      look:{skin:'#b97f58',hair:'#221b18',hairStyle:'short',top:'#f1ece2',pants:'#34393d',shoe:'#2a2e31',
        apron:'#7b3d2e',hatColor:'#eee8dd',tall:1.04,wide:1.05,faceSeed:4622},
      spots:[{h0:6,h1:23,at:[6.2,1.48],face:Math.PI,act:'cook',held:'ladle'}],
      lines:[['锅气要足，菜才香。','The wok must be hot for the right aroma.'],
             ['小心，刚出锅。','Careful—it has just left the wok.']]},
    {hz:'传菜员',name:'方宇',py:'Fāng Yǔ',place:'hotel2',rig:'hotel2-runner-fang-yu',temper:'brisk',
      look:{skin:'#ce986f',hair:'#29221f',hairStyle:'short',top:'#eee8dd',pants:'#32373c',shoe:'#282d31',
        vest:'#4a594e',tall:1.02,faceSeed:4623},
      spots:[{h0:6,h1:23,at:[12.0,6.05],face:0,act:'carry',held:'tray'}],
      lines:[['二号桌的菜齐了。','Table two\'s order is complete.'],
             ['这条路直接到服务梯。','This route goes directly to the service lift.']]},
    {hz:'食客',place:'hotel2',temper:'cheerful',seatY:.50,
      look:{skin:'#e2b38a',hair:'#352925',hairStyle:'bob',top:'#a85e57',pants:'#41454b',shoe:'#2f3032',
        tall:.96,faceSeed:4628},
      spots:[{h0:7,h1:22,at:[-7.20,4.90],face:Math.PI,act:'eat'}],
      lines:[['烤鸭转过来，我夹一块。','Turn the roast duck this way; I will take a piece.']]},
    {hz:'全日餐厅服务员',name:'吴晴',py:'Wú Qíng',place:'hotel2',rig:'hotel2-all-day-server-wu-qing',temper:'warm',
      look:{skin:'#dba981',hair:'#2e2521',hairStyle:'bun',top:'#eee8dd',pants:'#34383c',shoe:'#292c2e',
        vest:'#4f6d61',apron:'#8ca99b',scarf:'#a7773d',tall:.98,wide:.94,faceSeed:4624},
      spots:[{h0:6,h1:23,at:[9.20,-5.65],face:Math.PI,act:'carry',held:'tray'}],
      lines:[['这边有空桌，我来为您摆餐具。','There is an open table here; I will set it for you.'],
             ['早餐台会一直补到十点半。','The breakfast buffet is replenished until ten thirty.']]},

    {hz:'宴会经理',name:'唐经理',py:'Táng jīnglǐ',place:'hotel3',rig:'hotel3-banquet-manager-tang',temper:'focused',
      look:{skin:'#d8a579',hair:'#27211f',hairStyle:'part',top:'#eee6da',pants:'#303238',shoe:'#28282b',
        jacket:'#503b38',tie:'#aa7942',tall:1.04,faceSeed:4631},
      // Work from the staffed side of the registration counter, leaving the patterned centre
      // aisle open from the passenger lifts to the ballroom portal.
      spots:[{h0:7,h1:24,at:[1.70,-5.20],face:0,act:'check'}],
      lines:[['先核对桌号和灯光流程。','First check table numbers and the lighting programme.'],
             ['宴会厅十八点开门。','The ballroom doors open at six.']]},
    {hz:'婚礼顾问',name:'赵宁',py:'Zhào Níng',place:'hotel3',rig:'hotel3-wedding-advisor-zhao-ning',temper:'warm',
      look:{skin:'#e5b68d',hair:'#2c2220',hairStyle:'long',top:'#e8ddd3',pants:'#444047',shoe:'#302d31',
        jacket:'#936760',scarf:'#c3a07e',tall:.98,faceSeed:4632},
      spots:[{h0:9,h1:21,at:[4.75,3.9],face:Math.PI/2,act:'read'}],
      lines:[['这是今天的花艺和面料方案。','These are today\'s floral and fabric concepts.'],
             ['活动隔墙打开后，两个厅可以连起来。','With the partition open, the two halls connect.']]},
    {hz:'宴会服务员',name:'许诚',py:'Xǔ Chéng',place:'hotel3',rig:'hotel3-banquet-server-xu-cheng',temper:'steady',
      look:{skin:'#bd855f',hair:'#241e1b',hairStyle:'short',top:'#f0e9df',pants:'#31343a',shoe:'#282a2d',
        vest:'#5a3e36',bow:'#a77c49',tall:1.01,faceSeed:4633},
      spots:[{h0:8,h1:24,at:[-3.9,1.0],face:Math.PI,act:'carry',held:'tray'}],
      lines:[['香槟杯已经摆好了。','The glasses are already set.'],
             ['主桌还差两套餐具。','The head table still needs two place settings.']]},
    {hz:'商务客人',place:'hotel3',temper:'focused',seatY:.50,
      look:{skin:'#c48d66',hair:'#25211f',hairStyle:'short',top:'#607387',pants:'#373d45',shoe:'#252a30',
        bag:'shoulder',bagColor:'#443932',tall:1.05,faceSeed:4638},
      spots:[{h0:8,h1:23,at:[7.73,-11.45],face:0,act:'work',held:null}],
      lines:[['文件打印好了，会议还有十分钟。','The document is printed; the meeting starts in ten minutes.']]},
    {hz:'会议协调员',name:'罗婷',py:'Luó Tíng',place:'hotel3',rig:'hotel3-meeting-coordinator-luo-ting',temper:'focused',seatY:.50,
      look:{skin:'#e1b087',hair:'#2d2421',hairStyle:'bob',top:'#eee7dc',pants:'#37383d',shoe:'#292b2e',
        jacket:'#596d67',scarf:'#a5754a',tall:.98,wide:.94,faceSeed:4634},
      spots:[{h0:8,h1:22,at:[5.28,11.85],face:Math.PI,act:'work',held:null}],
      lines:[['屏幕和会议电话都测试好了。','The display and conference phone have both been tested.'],
             ['会议一还有五分钟开始。','Meeting One starts in five minutes.']]}
  ];

  // Register while the module loads, before game.js folds HotelCast into the live roster.  A
  // stable rig (or face seed for deliberately unnamed guests) keeps development re-evaluation
  // exact-once without conflating the recurring generic labels 住客 and 食客.
  const castKey=n=>n.rig||`${n.place}|${n.hz}|${n.look&&n.look.faceSeed||''}`;
  for(const n of publicCast) if(!HotelCast.some(q=>castKey(q)===castKey(n))) HotelCast.push(n);

  return Object.freeze({floors:FLOORS,api:1,identity:'contemporary-Chinese-public-rooms'});
})();
