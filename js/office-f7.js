// 公司七楼 · 高层管理与战略决策层
//
// Four daylight executive offices occupy the north curtain wall.  The general manager's suite is
// the visual centre, with HR and operations to the west and finance to the east.  A composed
// reception sequence, executive waiting lounge and compact strategy room face the shared core.
// Every authored wall and fitting stops north of z=2.20, preserving the building-wide lift and
// fire-stair spine exactly as OfficeCore defines it.

(() => {
  const KEY = 'office7';

  try {
    Glyphs.need(
      '七楼高层管理总经理办公室人力资源总监运营总监财务总监行政助理行政前台' +
      '高层等候区战略会议室领导层战略重点经营数据人才计划预算审批合同签字' +
      '城市景观今日议程来访预约请稍候董事长奖杯荣誉书架保密文件视频会议' +
      // Station names are drawn from this atlas too. 办公桌, 项目墙, 资料台, 投影, 合同审阅台
      // and 窗户 were each missing at least one character and were rendering with holes in them.
      '料项目墙桌阅窗户投影'
    );
  } catch (_) {}

  OfficeFit.register(KEY, A => {
    const {
      box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,light,thing,luminous,onTick,room,
      RX,RZ,H,C,accent,state,
    } = A;

    const P = {
      carpet:C('#565b66'), carpetL:C('#777c87'), carpetD:C('#3e444e'),
      stone:C('#d2cec4'), stoneL:C('#ebe7de'), stoneD:C('#9a9893'),
      wall:C('#e8e4dc'), wallD:C('#b8b4ac'), plaster:C('#f4f0e8'),
      walnut:C('#765337'), walnutL:C('#a67b52'), walnutD:C('#402e25'),
      oak:C('#bc956b'), leather:C('#34414d'), leatherL:C('#607285'),
      fabric:C('#778a98'), fabricL:C('#a7b5bd'), sage:C('#718679'),
      brass:C('#a7854d'), brassL:C('#d3b878'), bronze:C('#755b3d'),
      steel:C('#a9b0b3'), steelD:C('#596166'), black:C('#1c2227'), ink:C('#263038'),
      glass:C('#91b6c3'), glassL:C('#c1d9df'), screen:C('#17313e'), screenL:C('#4f8da5'),
      paper:C('#f6f0e4'), cream:C('#eee2cd'), white:C('#fbf8ef'),
      green:C('#526f5a'), greenL:C('#88a77b'), greenD:C('#344b3c'),
      blue:C('#486d91'), red:C('#9a3f38'), amber:C('#c48a3f'), warm:C('#ffe2ab'),
    };
    const wallT=.15, doorH=2.32;

    // `tag` defaults to the player-facing name but is separable, because the tag is interaction
    // wiring, not a label: Build.pick (js/build.js:439) resolves a clicked prop to the thing
    // wearing the same tag. A station whose tag no prop wears can only be activated by walking
    // into its own floating label, and a tag worn by props in four different rooms sends the
    // click to whichever station's focus happens to be nearest the hit point.
    const interactive=(hz,x,y,z,zh,en,note,focus,reach,action,department,tag=hz)=>{
      const q=thing(hz,x,y,z,zh,en,note,{tag,focus,reach});
      q.officeFloor=KEY;
      q.officeAction=action;
      q.officeStation={floor:KEY,id:action,department};
      return q;
    };

    function paneWallZ(z,x0,x1,doors=[],tag='木框玻璃隔墙') {
      const cuts=doors.map(([c,w])=>[Math.max(x0,c-w/2),Math.min(x1,c+w/2)])
        .sort((a,b)=>a[0]-b[0]);
      let at=x0;
      const pane=(a,b)=>{
        if(b-a<.08)return;
        const w=b-a,x=(a+b)/2;
        box(x,.16,z,w,.32,.18,P.walnutD,{hard:true,mode:6,gloss:.22,tag});
        box(x,1.58,z,w-.07,2.42,.035,P.glass,
          {hard:true,mode:1,alpha:.20,gloss:.82,tag});
        box(x,H-.12,z,w,.22,.18,P.walnutD,{hard:true,mode:6,gloss:.22,tag});
        for(const px of [a,b]) {
          box(px,1.62,z,.055,2.88,.11,P.brass,{hard:true,gloss:.58,tag});
          box(px,1.62,z-.035,.020,2.75,.025,P.black,{hard:true,tag});
        }
        // A pale privacy band keeps each office composed while retaining long sightlines.
        box(x,1.20,z-.024,w-.16,.38,.016,P.glassL,
          {hard:true,mode:1,alpha:.19,gloss:.44,tag});
        solid(a,b,z-.065,z+.065);
        A.blocker(a,b,z-.065,z+.065,A.H);
      };
      for(const [a,b] of cuts) {
        pane(at,a);
        box((a+b)/2,(doorH+H)/2,z,b-a,H-doorH,.17,P.walnutD,
          {hard:true,mode:6,tag});
        // Recessed jambs and a slim brass threshold make each opening intentional.
        for(const x of [a,b])box(x,1.23,z,.10,2.45,.20,P.walnut,
          {hard:true,mode:6,gloss:.24,tag});
        flat((a+b)/2,.030,z,b-a,.20,P.brass,{mode:1,gloss:.62,tag});
        at=b;
      }
      pane(at,x1);
    }

    function paneWallX(x,z0,z1,doors=[],tag='木框玻璃隔墙') {
      const cuts=doors.map(([c,w])=>[Math.max(z0,c-w/2),Math.min(z1,c+w/2)])
        .sort((a,b)=>a[0]-b[0]);
      let at=z0;
      const pane=(a,b)=>{
        if(b-a<.08)return;
        const d=b-a,z=(a+b)/2;
        box(x,.16,z,.18,.32,d,P.walnutD,{hard:true,mode:6,gloss:.22,tag});
        box(x,1.58,z,.035,2.42,d-.07,P.glass,
          {hard:true,mode:1,alpha:.20,gloss:.82,tag});
        box(x,H-.12,z,.18,.22,d,P.walnutD,{hard:true,mode:6,gloss:.22,tag});
        for(const pz of [a,b]) {
          box(x,1.62,pz,.11,2.88,.055,P.brass,{hard:true,gloss:.58,tag});
          box(x+.035,1.62,pz,.025,2.75,.020,P.black,{hard:true,tag});
        }
        box(x+.024,1.20,z,.016,.38,d-.16,P.glassL,
          {hard:true,mode:1,alpha:.19,gloss:.44,tag});
        solid(x-.065,x+.065,a,b);
        A.blocker(x-.065,x+.065,a,b,A.H);
      };
      for(const [a,b] of cuts) {
        pane(at,a);
        box(x,(doorH+H)/2,(a+b)/2,.17,H-doorH,b-a,P.walnutD,
          {hard:true,mode:6,tag});
        for(const z of [a,b])box(x,1.23,z,.20,2.45,.10,P.walnut,
          {hard:true,mode:6,gloss:.24,tag});
        at=b;
      }
      pane(at,z1);
    }

    function plateZ(x,y,z,w,text,color=accent,tag=text) {
      box(x,y,z,w,.36,.050,P.walnutD,{hard:true,mode:6,gloss:.24,tag});
      box(x,y,z-.030,w-.08,.28,.018,color,{hard:true,mode:1,glow:.025,tag});
      glyphs(x,y,z-.046,Math.PI,text,{size:Math.min(.13,(w-.34)/Math.max(2,[...text].length)),
        gap:.030,color:P.white,mode:1,lift:.008,tag});
      glyphs(x,y,z+.046,0,text,{size:Math.min(.13,(w-.34)/Math.max(2,[...text].length)),
        gap:.030,color:P.white,mode:1,lift:.008,tag});
    }

    function executiveChair(x,z,yaw=0,color=P.leather,tag='行政座椅') {
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      ball(x,.48,z,.34,.13,.34,color,{mode:7,gloss:.035,ry:yaw,tag});
      ball(x-fx*.22,.79,z-fz*.22,.36,.34,.14,color,{mode:7,gloss:.035,ry:yaw,tag});
      for(const s of [-1,1]) {
        capsule(x+rx*s*.34-fx*.02,.57,z+rz*s*.34-fz*.02,.025,.48,.025,P.brass,
          {rz:Math.PI/2,ry:yaw,gloss:.60,tag});
        ball(x+rx*s*.34-fx*.20,.58,z+rz*s*.34-fz*.20,.06,.06,.06,P.walnutD,{tag});
      }
      capsule(x,.24,z,.035,.42,.035,P.steelD,{gloss:.48,tag});
      cyl(x,.055,z,.23,.055,P.black,{gloss:.22,tag});
      for(let i=0;i<5;i++) {
        const a=i*Math.PI*2/5;
        box(x+Math.sin(a)*.16,.055,z+Math.cos(a)*.16,.055,.045,.28,P.black,
          {hard:true,ry:a,tag});
      }
      // Keep the seated worker's authored centre free, but make the substantial back/base stop a
      // player body.  Player-radius expansion turns this narrow rear strip into an honest chair
      // collision without invalidating desk poses centred on the seat.
      const cbx=x-fx*.27,cbz=z-fz*.27;
      const chx=Math.abs(rx)*.27+Math.abs(fx)*.07;
      const chz=Math.abs(rz)*.27+Math.abs(fz)*.07;
      solid(cbx-chx,cbx+chx,cbz-chz,cbz+chz);
      // The player has a 0.30 m body radius, so these two seat halves and tiny centre boss behave
      // as one continuous footprint.  The millimetre centre seam lets a scheduled desk worker be
      // authored at the chair pivot without being classified as embedded in the furniture.
      solid(x-.28,x-.025,z-.28,z+.28);
      solid(x+.025,x+.28,z-.28,z+.28);
      solid(x-.020,x+.020,z-.020,z+.020);
    }

    function visitorChair(x,z,yaw=0,color=P.fabric,tag='访客椅') {
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      box(x,.45,z,.58,.12,.58,color,{round:.18,mode:7,ry:yaw,gloss:.025,tag});
      box(x-fx*.24,.72,z-fz*.24,.56,.50,.14,color,
        {round:.20,mode:7,ry:yaw,gloss:.025,tag});
      for(const s of [-1,1]) capsule(x+rx*s*.23,.24,z+rz*s*.23,.024,.42,.024,P.brass,
        {gloss:.58,tag});
      const hx=Math.abs(rx)*.31+Math.abs(fx)*.30;
      const hz=Math.abs(rz)*.31+Math.abs(fz)*.30;
      solid(x-hx,x+hx,z-hz,z+hz);
    }

    function phone(x,z,yaw=0,tag='电话') {
      box(x,.84,z,.38,.075,.24,P.black,{round:.05,hard:true,ry:yaw,tag});
      capsule(x,.91,z,.060,.34,.060,P.ink,{rz:Math.PI/2,ry:yaw,tag});
      for(let i=0;i<6;i++)cyl(x-.11+(i%3)*.11,.89,z-.035+Math.floor(i/3)*.07,.012,.010,
        P.steel,{mode:1,glow:.015,tag});
    }

    function monitor(x,z,yaw=0,tag='显示器',wide=.72) {
      box(x,1.23,z,wide,.46,.055,P.black,{round:.055,hard:true,ry:yaw,tag});
      const fx=Math.sin(yaw),fz=Math.cos(yaw);
      const s=luminous(box(x+fx*.032,1.23,z+fz*.032,wide-.10,.36,.014,P.screen,
        {hard:true,mode:1,glow:.075,ry:yaw,tag}),.025,.12);
      capsule(x,.96,z,.026,.35,.026,P.steelD,{gloss:.50,tag});
      box(x,.80,z,.38,.025,.19,P.steelD,{hard:true,round:.04,tag});
      for(let i=0;i<4;i++)box(x-.20+i*.13,1.31-i*.06,z+fz*.043,.24-i*.035,.015,.010,
        i===0?P.blue:P.glassL,{hard:true,mode:1,glow:.022,ry:yaw,tag});
      return s;
    }

    function executiveDesk(x,z,w=2.65,d=1.02,color=P.walnut,tag='办公桌',dual=false) {
      box(x,.78,z,w,.13,d,color,{round:.16,hard:true,mode:6,gloss:.26,
        mat:'wood',matScale:.78,matAmt:.20,tag});
      box(x,.835,z,w-.16,.025,d-.13,P.leather,{round:.12,hard:true,mode:7,gloss:.035,tag});
      // Floating pedestals and a curved modesty layer keep the desk visually light.
      for(const sx of [-1,1]) taper(x+sx*(w/2-.28),.39,z,.23,.66,.18,P.walnutD,
        {round:.06,mode:6,gloss:.20,tag});
      box(x,.47,z+d*.39,w-.44,.48,.075,P.walnutD,
        {round:.14,hard:true,mode:6,gloss:.20,tag});
      box(x,.48,z+d*.435,w-.62,.055,.022,P.brassL,{hard:true,gloss:.68,tag});
      const count=dual?2:1;
      for(let i=0;i<count;i++)monitor(x+(i-(count-1)/2)*.68,z-.18,Math.PI,tag,dual?.62:.76);
      box(x-.15,.86,z+.06,.70,.022,.26,P.black,{round:.04,hard:true,tag});
      // Contract folio, fountain pen, phone, intercom and a small award all remain individually
      // readable at player height.
      // These three desk fittings are repeated on all four executive desks, so a literal tag put
      // the folio on the HR desk, the intercom on the finance desk and the award on the general
      // manager's into one group spanning 18 m. 对讲机 was judged from a point 3.2 m from the
      // nearest intercom. Suffixing the owning desk's own tag keeps each group inside one room —
      // and keeps the click on a folio resolving to that room's station, not another floor-wide one.
      const folio=tag+'·合同';
      box(x+w*.27,.87,z+.10,.54,.035,.36,P.paper,{hard:true,rz:-.035,tag:folio});
      box(x+w*.27,.895,z+.10,.46,.018,.30,P.red,{hard:true,rz:-.035,tag:folio});
      capsule(x+w*.25,.93,z+.08,.013,.30,.013,P.brass,{rz:Math.PI/2,tag:folio});
      phone(x-w*.31,z+.13,0,tag);
      box(x-w*.12,.875,z+.17,.20,.07,.18,P.steelD,{round:.04,hard:true,tag:tag+'·对讲'});
      for(let i=0;i<3;i++)cyl(x-w*.18+i*.06,.92,z+.17,.012,.010,i===0?P.green:P.amber,
        {mode:1,glow:.025,tag:tag+'·对讲'});
      taper(x+w*.42,.97,z-.16,.10,.27,.055,P.brassL,{gloss:.66,tag:tag+'·奖杯'});
      ball(x+w*.42,1.16,z-.16,.075,.075,.075,P.glassL,
        {mode:1,alpha:.58,gloss:.62,tag:tag+'·奖杯'});
      solid(x-w/2-.02,x+w/2+.02,z-d/2-.03,z+d/2+.03);
      shade(x,z,w+.18,d+.20,.25);
    }

    function displayShelfZ(x,z,w=2.20,h=2.05,tag='书架') {
      box(x,h/2,z,w,h,.34,P.walnutD,{hard:true,mode:6,gloss:.20,tag});
      box(x,h/2,z+.18,w-.14,h-.14,.035,P.wallD,{hard:true,tag});
      for(const y of [.18,.65,1.12,1.59,2.02])box(x,y,z+.23,w-.05,.055,.44,P.walnutL,
        {hard:true,mode:6,gloss:.22,tag});
      // Same again for the four display shelves: 112 books under one tag spanned 22.16 m.
      const bookColors=[P.blue,P.red,P.sage,P.cream,P.leatherL];
      for(let row=0;row<4;row++)for(let i=0;i<7;i++) {
        const bw=.12+(i%3)*.025,bh=.22+(i%4)*.035;
        box(x-w*.38+i*(w*.75/7),.23+row*.47+bh/2,z+.47,bw,bh,.16,
          bookColors[(i+row)%bookColors.length],{hard:true,rz:(i%3-1)*.025,tag:tag+'·书'});
      }
      // Awards, framed photograph and a brass architectural model occupy the display shelf.
      taper(x-w*.27,1.75,z+.47,.10,.30,.055,P.brassL,{gloss:.62,tag:tag+'·奖杯'});
      ball(x-w*.27,1.96,z+.47,.075,.075,.075,P.glassL,{mode:1,alpha:.58,tag:tag+'·奖杯'});
      box(x+.10,1.81,z+.46,.34,.30,.025,P.black,{round:.035,hard:true,tag:tag+'·照片'});
      box(x+.10,1.81,z+.48,.27,.23,.012,P.paper,{hard:true,tag:tag+'·照片'});
      for(const sx of [-.13,.13]) capsule(x+w*.32+sx,1.77,z+.47,.020,.32,.020,P.brass,
        {rz:sx*.9,gloss:.64,tag:tag+'·模型'});
      solid(x-w/2-.02,x+w/2+.02,z-.20,z+.50);
    }

    function plant(x,z,s=.75,tag='绿植') {
      taper(x,.28,z,.33*s,.50*s,.25*s,P.cream,{gloss:.18,tag});
      capsule(x,.70*s,z,.040*s,.82*s,.040*s,P.greenD,{tag});
      for(let i=0;i<10;i++) {
        const a=i*2.399,rr=.10+(i%4)*.075;
        ball(x+Math.sin(a)*rr*s,.86*s+(i%4)*.15*s,z+Math.cos(a)*rr*s,
          .21*s,.075*s,.14*s,i%3?P.green:P.greenL,{mode:15,ry:a,rz:(i%3-1)*.28,tag});
      }
      solid(x-.30*s,x+.30*s,z-.30*s,z+.30*s);
    }

    function floorLamp(x,z,yaw=0,tag='落地灯') {
      cyl(x,.055,z,.26,.055,P.walnutD,{gloss:.20,tag});
      capsule(x,1.05,z,.025,1.92,.025,P.brass,{gloss:.62,tag});
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      capsule(x+fx*.20,1.92,z+fz*.20,.020,.46,.020,P.brass,
        {rz:Math.PI/2,ry:yaw,gloss:.62,tag});
      taper(x+fx*.43,1.83,z+fz*.43,.21,.34,.12,P.cream,{gloss:.12,tag});
      luminous(ball(x+fx*.43,1.72,z+fz*.43,.10,.08,.10,P.warm,
        {mode:1,glow:.12,tag}),.035,.16);
      light(x+fx*.43,1.70,z+fz*.43,[1,.82,.62],.14,2.45);
      // Small pull and counterweight details make the arc lamp functional rather than sculptural.
      capsule(x+fx*.35+rx*.12,1.70,z+fz*.35+rz*.12,.009,.28,.009,P.black,{tag});
      ball(x+fx*.35+rx*.12,1.54,z+fz*.35+rz*.12,.025,.035,.025,P.brassL,{tag});
      solid(x-.24,x+.24,z-.24,z+.24);
    }

    function curvedSofa(x,z,yaw=0,color=P.fabric,tag='等候沙发') {
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      for(const s of [-1,0,1]) {
        const syaw=yaw-s*.15;
        const px=x+rx*s*.70-fx*Math.abs(s)*.08,pz=z+rz*s*.70-fz*Math.abs(s)*.08;
        box(px,.44,pz,.78,.22,.72,color,{round:.22,mode:7,ry:syaw,gloss:.025,tag});
        box(px-fx*.29,.72,pz-fz*.29,.73,.52,.16,color,
          {round:.24,mode:7,ry:syaw,gloss:.025,tag});
        ball(px+rx*s*.025,.58,pz+rz*s*.025,.25,.13,.20,s===0?P.fabricL:P.sage,
          {mode:7,ry:syaw,tag:'靠垫'});
      }
      for(const s of [-1,1])capsule(x+rx*s*1.10,.55,z+rz*s*1.10,.055,.42,.055,P.walnutL,
        {rz:Math.PI/2,ry:yaw,tag});
      const sx=Math.abs(Math.sin(yaw))>.5?.48:1.38,sz=Math.abs(Math.sin(yaw))>.5?1.38:.48;
      solid(x-sx,x+sx,z-sz,z+sz);
      shade(x,z,sx*2+.20,sz*2+.20,.22);
    }

    function roundTable(x,z,r=.48,tag='茶几') {
      cyl(x,.48,z,r,.075,P.walnutL,{mode:6,gloss:.27,tag});
      cyl(x,.25,z,.085,.43,P.brass,{gloss:.64,tag});
      cyl(x,.055,z,.30,.055,P.walnutD,{gloss:.22,tag});
      // The worst group on the floor: the lounge tea table and the general manager's window table
      // are 11.6 m apart, so '杂志' was judged from a point 6.93 m from the nearest magazine —
      // a point in the middle of an office neither table is in.
      box(x-.10,.55,z,.34,.025,.24,P.paper,{hard:true,rz:.10,tag:tag+'·杂志'});
      cyl(x+.20,.58,z-.04,.065,.12,P.white,{gloss:.18,tag:tag+'·茶杯'});
      solid(x-r-.03,x+r+.03,z-r-.03,z+r+.03);
    }

    function pendantRing(x,z,r=1.05,tag='吊灯') {
      for(let i=0;i<18;i++) {
        const a=i*Math.PI*2/18,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
        luminous(ball(px,2.78,pz,.045,.035,.045,P.warm,
          {mode:1,glow:.11,tag}),.035,.15);
      }
      for(const a of [0,Math.PI*2/3,Math.PI*4/3]) {
        const px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
        capsule(px,3.02,pz,.010,.42,.010,P.brass,{tag});
      }
      light(x,2.60,z,[1,.84,.66],.18,4.0);
    }

    function strategyChair(x,z,yaw=0,tag='会议椅') {
      box(x,.45,z,.50,.10,.50,P.leatherL,{round:.16,mode:7,ry:yaw,tag});
      const fx=Math.sin(yaw),fz=Math.cos(yaw);
      box(x-fx*.22,.72,z-fz*.22,.48,.47,.12,P.leather,
        {round:.17,mode:7,ry:yaw,tag});
      capsule(x,.23,z,.028,.40,.028,P.brass,{gloss:.60,tag});
      solid(x-.27,x+.27,z-.27,z+.27);
    }

    function dashboard(x,z,w=3.25,tag='投影') {
      box(x,1.73,z,w,1.52,.075,P.black,{hard:true,round:.07,tag});
      // The screen lives on the +z face: the board table and its chairs are at z -1.10 … +0.80,
      // south of this wall, so a screen on the -z face is showing the leadership dashboard to the
      // finance director's back wall and presenting its own black case to the room it belongs to.
      const p=luminous(box(x,1.73,z+.048,w-.16,1.34,.018,P.screen,
        {hard:true,mode:1,glow:.075,tag}),.025,.13);
      glyphs(x,2.12,z+.064,0,'领导层 · 战略重点',
        {size:.14,gap:.032,color:P.white,mode:1,lift:.008,tag});
      for(let i=0;i<5;i++) {
        const bw=.48+i*.22;
        box(x-.82+bw/2,1.87-i*.17,z+.068,bw,.045,.012,
          i===0?P.amber:i===4?P.green:P.blue,{hard:true,mode:1,glow:.028,tag});
        luminous(cyl(x+1.05,1.87-i*.17,z+.067,.035,.014,i<3?P.green:P.amber,
          {rx:Math.PI/2,mode:1,glow:.035,tag}),.008,.05);
      }
      // Camera bar, room microphone and side status lamps complete the conference system.
      box(x,2.58,z+.01,.82,.12,.13,P.black,{round:.04,hard:true,tag});
      ball(x,2.58,z+.085,.055,.055,.025,P.glassL,{mode:1,glow:.025,tag});
      onTick(t=>{p.glow=.060+(.5+.5*Math.sin(t*.75))*.025;});
      return p;
    }

    // ---------------------------------------------------------------- measured programme plan
    flat(-9.45,.020,-5.92,4.35,5.70,P.carpet,
      {mode:7,gloss:.040,mat:'fabric',matScale:.48,matAmt:.19,tag:'人力资源总监办公室'});
    flat(-4.72,.020,-5.92,4.35,5.70,P.carpetD,
      {mode:7,gloss:.040,mat:'fabric',matScale:.48,matAmt:.19,tag:'运营总监办公室'});
    flat(1.18,.022,-5.92,6.95,5.70,P.walnutL,
      {mode:6,gloss:.105,mat:'wood',matScale:.70,matAmt:.20,tag:'总经理办公室'});
    for(let z=-8.45;z<-3.25;z+=.56)flat(1.18,.024,z,6.82,.020,P.walnutD,
      {alpha:.23,tag:'总经理办公室'});
    flat(8.30,.020,-5.92,6.65,5.70,P.carpet,
      {mode:7,gloss:.040,mat:'fabric',matScale:.48,matAmt:.19,tag:'财务总监办公室'});
    flat(0,.021,-.30,9.05,4.70,P.stone,
      {mode:9,gloss:.13,mat:'tile',matScale:.54,matAmt:.18,tag:'行政前台'});
    for(let x=-4.25;x<=4.25;x+=.56)flat(x,.024,-.30,.018,4.58,P.stoneD,
      {mode:1,alpha:.26,tag:'行政前台'});
    flat(-8.30,.022,-.30,6.70,4.70,P.carpetL,
      {mode:7,gloss:.035,mat:'fabric',matScale:.48,matAmt:.18,tag:'高层等候区'});
    flat(8.25,.022,-.30,6.75,4.70,P.carpetD,
      {mode:7,gloss:.035,mat:'fabric',matScale:.48,matAmt:.18,tag:'战略会议室'});

    // Four individual office fronts share one transparent datum. Each door opens into a direct,
    // body-width route from the executive reception area.
    //
    // One call per office, and one tag per office. As a single 24 m call every pane, mullion and
    // privacy band on the floor wore the tag '木框玻璃隔墙', so tagBox (js/build.js:259) judged
    // all fifty-two of them from one point at x 0 — inside the general manager's doorway and
    // inside no other office. The cutaway would have taken every glazed front on the floor in and
    // out together, judged by a point that only one of the four rooms contains. Splitting on the
    // cross-wall centres adds no geometry: the seam falls exactly where the side walls already are.
    paneWallZ(-2.96,-RX,-7.15,[[-9.45,1.30]],'人力资源办公室隔墙');
    paneWallZ(-2.96,-7.15,-2.35,[[-4.72,1.30]],'运营办公室隔墙');
    paneWallZ(-2.96,-2.35,4.75,[[1.18,1.55]],'总经理办公室隔墙');
    paneWallZ(-2.96,4.75,RX,[[8.30,1.40]],'财务办公室隔墙');
    // Likewise the three side walls: one shared '行政办公室隔墙' put the judged point at x -1.18,
    // which is inside the general manager's office and inside none of the three walls.
    paneWallX(-7.15,-RZ,-3.03,[],'人力资源办公室侧墙');
    paneWallX(-2.35,-RZ,-3.03,[],'运营办公室侧墙');
    paneWallX(4.75,-RZ,-3.03,[],'财务办公室侧墙');
    paneWallX(4.72,-2.88,2.14,[[.92,1.45]],'战略室玻璃墙');
    // 战略室 had glass on its reception side and nothing at all on its corridor side, so the
    // board table stood in a 7.3 m opening onto the lift lobby — a table in a corridor, which is
    // the one thing a strategy room must not be. This closes it with its own door onto the spine,
    // stopping at z 2.165 so the protected circulation band (z 2.20 … 4.00) is untouched.
    paneWallZ(2.10,4.72,RX,[[6.30,1.30]],'战略室南墙');

    // Every one of these focus points used to sit in the middle of the room's own desk or table:
    // -9.45,-5.65 is inside the HR desk, 1.18,-5.60 inside the general manager's, .30,.25 inside
    // the reception counter, 8.25,-.25 inside the board table. The focus is where the room expects
    // a body to be able to stand, so each is now measured to a cell the flood fill reaches.
    room('office7-hr',-11.72,-7.24,-8.72,-3.07,-9.45,-4.00);
    room('office7-operations',-7.06,-2.44,-8.72,-3.07,-4.72,-4.00);
    room('office7-boss',-2.26,4.66,-8.72,-3.07,1.18,-4.20);
    room('office7-finance',4.84,11.72,-8.72,-3.07,8.30,-3.95);
    room('office7-waiting',-11.72,-4.80,-2.86,2.14,-6.80,-1.60);
    room('office7-reception',-4.62,4.62,-2.86,2.14,1.12,-1.20);
    room('office7-strategy',4.82,11.72,-2.86,2.14,5.60,0);

    plateZ(-1.0,3.03,2.09,5.35,'七楼 · 高层管理与战略',accent,'楼层牌');
    plateZ(-9.45,2.70,-2.87,2.70,'人力资源总监',P.sage,'人力资源总监办公室');
    plateZ(-4.72,2.70,-2.87,2.30,'运营总监',P.blue,'运营总监办公室');
    // Its own tag, not the room's: the room tag is also worn by the ceiling raft and its fins at
    // z -5.58, and one group holding both put the judged point at z -4.22, in the open floor
    // between them and inside neither.
    plateZ(1.18,2.74,-2.87,3.15,'总经理办公室',P.brass,'总经理办公室门牌');
    plateZ(8.30,2.70,-2.87,2.70,'财务总监',P.leatherL,'财务总监办公室');
    box(4.68,2.72,.92,.050,.36,1.55,P.walnutD,
      {hard:true,mode:6,gloss:.24,tag:'战略会议室'});
    box(4.645,2.72,.92,.018,.28,1.47,P.blue,
      {hard:true,mode:1,glow:.025,tag:'战略会议室'});
    glyphs(4.625,2.72,.92,-Math.PI/2,'战略会议室',
      {size:.105,gap:.024,color:P.white,mode:1,lift:.008,tag:'战略会议室'});

    // A layered walnut/brass privacy screen defines the waiting lounge without closing it off
    // from the assistant.  Fluted glass softens movement at reception, while the two open ends
    // remain generous routes into the lounge.
    box(-4.575,1.47,-.40,.025,2.22,3.72,P.glassL,
      {hard:true,mode:1,alpha:.10,gloss:.62,tag:'等候区屏风'});
    for(let z=-2.35,i=0;z<=1.55;z+=.40,i++) {
      box(-4.55,1.52,z,.085,2.62,.075,i%3===0?P.walnutD:P.walnutL,
        {hard:true,mode:6,gloss:.20,tag:'等候区屏风'});
      box(-4.505,.53,z,.022,.76,.025,P.brass,{hard:true,gloss:.62,tag:'等候区屏风'});
    }
    for(const y of [.22,2.88])box(-4.55,y,-.40,.14,.18,4.18,P.walnutD,
      {hard:true,mode:6,gloss:.22,tag:'等候区屏风'});
    // A short planted trough makes the privacy threshold feel deliberate without sealing either
    // end. Its 1.6 m run leaves clear north and south approaches around the screen.
    box(-4.82,.27,-.36,.46,.46,1.58,P.walnutD,
      {round:.12,mode:6,gloss:.18,tag:'等候区屏风'});
    box(-4.82,.49,-.36,.39,.08,1.46,P.stoneD,
      {round:.09,mode:7,gloss:.10,tag:'等候区屏风'});
    for(let z=-.94,i=0;z<=.22;z+=.29,i++) {
      capsule(-4.82,.81+(i%2)*.10,z,.020,.58+(i%3)*.10,.020,P.greenD,{tag:'等候区绿植'});
      for(const s of [-1,1])ball(-4.82+s*.13,.88+(i%2)*.11,z+s*.035,.18,.055,.12,
        i%3?P.green:P.greenL,{mode:15,ry:s*.65,rz:s*.30,tag:'等候区绿植'});
    }
    solid(-5.06,-4.58,-1.17,.45);

    // ---------------------------------------------------------------- executive assistant and reception
    box(1.12,.68,.52,3.20,1.05,.78,P.walnutL,
      {round:.28,mode:6,gloss:.24,hard:true,mat:'wood',matScale:.75,matAmt:.18,tag:'前台'});
    box(1.12,1.22,.52,3.08,.11,.70,P.stoneL,{round:.25,hard:true,gloss:.24,tag:'前台'});
    box(1.12,.58,.93,2.62,.52,.055,P.walnutD,{round:.18,hard:true,mode:6,tag:'前台'});
    box(1.12,.59,.966,2.18,.055,.018,P.brassL,{hard:true,mode:1,glow:.018,tag:'前台'});
    // Rounded end drums replace the old reception-monolith silhouette.
    for(const sx of [-1,1])taper(1.12+sx*1.36,.60,.52,.30,1.0,.23,P.stone,
      {mode:7,gloss:.18,tag:'前台'});
    monitor(.62,.30,0,'前台显示器',.66);
    phone(1.72,.43,0,'前台电话');
    box(2.15,1.31,.45,.24,.045,.32,P.black,{round:.04,hard:true,tag:'对讲机'});
    for(let i=0;i<3;i++)luminous(cyl(2.09+i*.06,1.37,.45,.013,.010,i===0?P.green:P.amber,
      {mode:1,glow:.03,tag:'对讲机'}),.006,.04);
    box(-.10,1.31,.42,.46,.025,.32,P.paper,{hard:true,rz:-.05,tag:'来访预约'});
    capsule(-.12,1.35,.42,.012,.28,.012,P.brass,{rz:Math.PI/2,tag:'来访预约'});
    executiveChair(.62,-.18,0,P.leatherL,'行政助理座椅');
    solid(-.56,2.80,.10,.96);
    pendantRing(1.10,.35,.86,'行政前台吊灯');
    interactive('前台',1.12,1.24,.52,
      '核对总经理今天的日程、来访预约和会议室安排。',
      'Check the general manager\'s calendar, visitors, and meeting-room schedule.',
      '行政助理 coordinates executives, visitors, documents, and meeting logistics.',
      [-.92,1.18],2.35,'manage-executive-calendar','executive-support');

    // ---------------------------------------------------------------- executive waiting lounge
    // A warm acoustic canopy lowers the perceived scale of the waiting room without becoming a
    // dropped solid ceiling. Alternating timber fins and felt rafts keep the visual rhythm light.
    for(let x=-11.05,i=0;x<=-5.35;x+=.48,i++)
      box(x,H-.235,-.25,.22,.060,3.62,i%4===0?P.walnutD:P.walnutL,
        {hard:true,mode:6,gloss:.17,tag:'等候区吸音天花'});
    for(const x of [-10.30,-8.25,-6.20]) {
      box(x,H-.285,-.25,1.12,.035,2.92,P.carpetD,
        {hard:true,mode:7,gloss:.025,tag:'等候区吸音天花'});
      luminous(box(x,H-.315,-.25,.035,.014,2.62,P.warm,
        {hard:true,mode:1,glow:.09,tag:'等候区照明'}),.035,.16);
      light(x,H-.40,-.25,[1,.80,.60],.12,3.05);
    }
    // Rounded acoustic wall fields on the west edge absorb sound from the open reception area.
    for(let z=-2.18,i=0;z<=1.58;z+=.78,i++) {
      box(-11.56,1.46,z,.13,2.36,.62,P.walnutD,
        {round:.10,mode:6,gloss:.18,tag:'等候区吸音墙'});
      box(-11.475,1.46,z,.035,2.14,.48,i%2?P.fabric:P.sage,
        {round:.12,mode:7,gloss:.025,tag:'等候区吸音墙'});
      box(-11.445,.43,z,.018,.50,.36,P.brass,
        {round:.05,hard:true,gloss:.62,tag:'等候区吸音墙'});
    }
    curvedSofa(-10.62,-.25,Math.PI/2,P.fabric,'等候沙发');
    // Continuous plinth, discreet brass feet and restrained lumbar cushions enrich the sofa
    // without turning the room into a hotel lobby.
    box(-10.62,.24,-.25,.62,.11,2.70,P.walnutD,
      {round:.18,mode:6,gloss:.18,tag:'等候沙发'});
    for(const z of [-1.15,.65])for(const x of [-10.82,-10.42])
      taper(x,.14,z,.045,.22,.035,P.brass,{gloss:.60,tag:'等候沙发'});
    for(const z of [-.92,-.25,.42])ball(-10.27,.62,z,.16,.12,.24,
      z===-.25?P.sage:P.fabricL,{mode:7,tag:'靠垫'});
    // Both loose chairs converge on the shared tea table; the former second heading pointed
    // almost directly away from the conversation group.
    visitorChair(-7.70,-.62,-.48,P.fabricL,'等候椅');
    visitorChair(-6.55,-.10,-1.26,P.sage,'等候椅');
    roundTable(-8.25,.45,.48,'等候茶几');
    // Reading and charging details: two current magazines, a wireless pad and its live indicator.
    box(-8.39,.565,.38,.36,.018,.24,P.paper,{hard:true,rz:.07,tag:'等候茶几·杂志'});
    box(-8.33,.582,.41,.31,.014,.21,P.blue,{hard:true,rz:-.04,tag:'等候茶几·杂志'});
    box(-7.96,.566,.54,.24,.020,.20,P.black,{round:.055,hard:true,tag:'充电板'});
    luminous(cyl(-7.86,.586,.63,.014,.010,P.green,{mode:1,glow:.045,tag:'充电板'}),.008,.055);
    capsule(-7.88,.545,.70,.009,.34,.009,P.steelD,{rz:Math.PI/2,ry:.18,tag:'充电线'});
    floorLamp(-11.25,1.15,-.85,'等候落地灯');
    plant(-5.25,1.34,.70,'等候区东绿植');
    plant(-10.95,-2.30,.84,'等候区北绿植');
    // Refined tea and water point, kept against the north-east edge and away from both approaches.
    box(-5.82,.56,-2.42,1.62,.88,.48,P.walnutD,
      {round:.12,mode:6,gloss:.20,tag:'茶水台'});
    box(-5.82,1.03,-2.42,1.70,.075,.54,P.stoneL,
      {round:.10,hard:true,gloss:.22,tag:'茶水台'});
    box(-5.82,.48,-2.17,1.32,.52,.030,P.walnutL,
      {round:.10,hard:true,mode:6,tag:'茶水台'});
    box(-5.82,.49,-2.145,.92,.030,.016,P.brassL,
      {hard:true,mode:1,glow:.018,tag:'茶水台'});
    // Glass carafe, porcelain pot, cups, tea tray and a compact filtered-water spout.
    cyl(-6.38,1.17,-2.38,.085,.25,P.glassL,
      {mode:1,alpha:.38,gloss:.52,tag:'水壶'});
    taper(-6.38,1.34,-2.38,.058,.09,.035,P.brass,{gloss:.62,tag:'水壶'});
    taper(-5.92,1.15,-2.38,.12,.20,.09,P.cream,{gloss:.16,tag:'茶壶'});
    capsule(-5.76,1.18,-2.38,.018,.22,.018,P.brass,{rz:Math.PI/2,tag:'茶壶'});
    box(-5.68,1.08,-2.36,.66,.028,.30,P.walnutL,
      {round:.07,hard:true,mode:6,tag:'茶盘'});
    for(const x of [-5.84,-5.56])cyl(x,1.17,-2.34,.052,.12,P.white,{gloss:.18,tag:'茶水台·茶杯'});
    capsule(-5.20,1.37,-2.44,.024,.54,.024,P.brass,{tag:'饮水机'});
    capsule(-5.12,1.54,-2.44,.018,.22,.018,P.brass,
      {rz:Math.PI/2,tag:'饮水机'});
    luminous(cyl(-5.03,1.55,-2.44,.018,.012,P.green,
      {mode:1,glow:.045,tag:'饮水机'}),.008,.055);
    solid(-6.70,-4.94,-2.72,-2.12);
    // Three small pendants pool warm light over the tea table rather than washing the room flat.
    for(const [x,z,y] of [[-8.56,.28,2.62],[-8.18,.48,2.50],[-7.86,.24,2.66]]) {
      capsule(x,(y+H-.18)/2,z,.010,H-.18-y,.010,P.brass,{tag:'等候区吊灯'});
      taper(x,y,z,.16,.28,.10,P.cream,{gloss:.12,tag:'等候区吊灯'});
      luminous(ball(x,y-.13,z,.070,.055,.070,P.warm,
        {mode:1,glow:.12,tag:'等候区吊灯'}),.035,.16);
    }
    light(-8.22,2.02,.36,[1,.78,.56],.18,2.80);
    box(-8.25,2.22,-2.82,3.45,.82,.045,P.walnutD,{hard:true,mode:6,tag:'公司荣誉'});
    glyphs(-8.25,2.43,-2.786,Math.PI,'公司荣誉',{size:.17,gap:.042,color:P.brassL,
      mode:1,lift:.008,tag:'公司荣誉'});
    for(const x of [-9.43,-8.65,-7.87,-7.09]) {
      box(x,2.03,-2.78,.56,.36,.018,P.paper,{hard:true,mode:1,tag:'奖状'});
      box(x,2.03,-2.795,.62,.42,.025,P.brass,{hard:true,gloss:.58,tag:'奖状'});
      luminous(cyl(x,2.03,-2.755,.055,.018,P.red,{rx:Math.PI/2,mode:1,glow:.025,tag:'奖状'}),.005,.035);
    }
    interactive('等候区',-8.25,.64,.45,
      '在高层等候区坐下，行政助理会通知来访对象。',
      'Sit in the executive waiting area; the assistant will notify your host.',
      // Tagged to the tea table it already stands on. Nothing wore '等候区' — every prop in the
      // lounge is '等候沙发', '等候茶几', '等候区屏风' and so on — so this station was another
      // label with no clickable object behind it.
      '等候 means to wait; 来访 is a business visit.',[-6.98,1.12],1.85,
      'wait-for-executive','executive-support','等候茶几');

    // ---------------------------------------------------------------- HR director office
    executiveDesk(-9.45,-5.62,2.35,.92,P.walnutL,'人力资源办公桌',false);
    executiveChair(-9.45,-6.47,0,P.sage,'人力资源总监座椅');
    visitorChair(-10.20,-4.45,Math.PI,P.fabricL,'人力资源访客椅');
    visitorChair(-8.70,-4.45,Math.PI,P.fabricL,'人力资源访客椅');
    displayShelfZ(-10.45,-8.55,1.90,2.05,'人才资料书架');
    plant(-7.62,-8.08,.72,'人力资源办公室绿植');
    floorLamp(-11.10,-3.62,.15,'办公室落地灯');
    // Talent-plan folios and confidential file caddy.
    box(-8.08,.72,-7.65,.82,1.28,.48,P.walnutD,{hard:true,round:.08,mode:6,tag:'资料台'});
    for(let i=0;i<5;i++)box(-8.08,.40+i*.19,-7.38,.58,.10,.025,
      i===4?P.red:P.paper,{hard:true,tag:'保密文件'});
    glyphs(-8.08,1.43,-7.36,0,'人才计划',{size:.12,gap:.028,color:P.white,mode:1,lift:.008,tag:'资料台'});
    solid(-8.54,-7.62,-7.96,-7.30);
    interactive('资料台',-8.08,1.12,-7.65,
      '审阅招聘、晋升和继任计划，并标出需要总经理决定的事项。',
      'Review hiring, promotion, and succession plans, and flag decisions for the general manager.',
      '继任计划 is a succession plan; 晋升 means promotion.',[-8.05,-6.78],1.55,
      'review-people-plan','people-leadership');

    // ---------------------------------------------------------------- deputy / operations director office
    executiveDesk(-4.72,-5.62,2.30,.92,P.walnut,'运营办公桌',true);
    executiveChair(-4.72,-6.47,0,P.leather,'运营总监座椅');
    visitorChair(-5.42,-4.45,Math.PI,P.fabric,'运营访客椅');
    visitorChair(-4.02,-4.45,Math.PI,P.fabric,'运营访客椅');
    displayShelfZ(-5.87,-8.55,1.72,2.05,'运营资料书架');
    plant(-2.82,-8.05,.72,'运营办公室绿植');
    // Standing operations wall with real status cards, magnetic markers and a slim shelf.
    box(-3.62,1.78,-7.72,1.95,1.28,.075,P.black,{hard:true,round:.06,tag:'项目墙'});
    luminous(box(-3.62,1.78,-7.665,1.80,1.12,.018,P.screen,
      {hard:true,mode:1,glow:.065,tag:'项目墙'}),.02,.11);
    glyphs(-3.62,2.15,-7.64,0,'经营数据',{size:.13,gap:.032,color:P.white,mode:1,lift:.008,tag:'项目墙'});
    for(let i=0;i<5;i++) {
      box(-4.30,1.94-i*.15,-7.63,.48+i*.20,.045,.012,
        i<3?P.blue:i===3?P.amber:P.green,{hard:true,mode:1,glow:.025,tag:'项目墙'});
      cyl(-2.88,1.94-i*.15,-7.63,.030,.012,i===4?P.red:P.green,
        {rx:Math.PI/2,mode:1,glow:.035,tag:'项目墙'});
    }
    box(-3.62,1.05,-7.63,2.05,.055,.26,P.brass,{hard:true,gloss:.58,tag:'项目墙'});
    interactive('项目墙',-3.62,1.78,-7.72,
      '检查本周经营数据、风险事项和跨部门行动清单。',
      'Review this week\'s operating figures, risks, and cross-department action list.',
      '经营数据 are operating metrics; 行动清单 is an action list.',[-3.62,-6.72],1.62,
      'review-operations','operations-leadership');

    // ---------------------------------------------------------------- general manager office — centrepiece
    // A layered walnut ceiling raft and halo mark the room without enclosing it or lowering the
    // walkable volume.
    box(1.18,H-.20,-5.58,4.95,.10,2.55,P.walnutD,{hard:true,mode:6,gloss:.20,tag:'总经理办公室'});
    for(let x=-.95;x<=3.31;x+=.43)box(x,H-.27,-5.58,.08,.075,2.36,P.walnutL,
      {hard:true,mode:6,gloss:.18,tag:'总经理办公室'});
    pendantRing(1.18,-5.30,1.02,'总经理办公室吊灯');
    executiveDesk(1.18,-5.48,3.35,1.10,P.walnut,'办公桌',true);
    executiveChair(1.18,-6.45,0,P.leather,'总经理座椅');
    // The three visitor chairs used to sit in a row at z -4.00/-4.15 with the middle one on the
    // door axis at x 1.18. The doorway is x 0.405 … 1.955, so at a 0.30 m body radius the only
    // passable centres are x 0.705 … 1.655 — and that chair's footprint expanded to x 0.57 … 1.79
    // covered every one of them. The general manager's office was sealed: a body could step into
    // the 0.2 m notch behind the door and go no further, which is what put 317 standable cells
    // beyond reach and left the desk's own focus [1.18,-4.50] inside a chair.
    //
    // Two chairs now flank the door lane instead of blocking it (clear margins 0.195 m west and
    // 0.155 m east), and the third has moved to the window group. The desk is unchanged.
    visitorChair(-.10,-4.30,Math.PI,P.fabricL,'总经理访客椅');
    visitorChair(2.42,-4.30,Math.PI,P.fabricL,'总经理访客椅');
    displayShelfZ(-.90,-8.55,1.95,2.10,'总经理书架');
    // The plant and the floor lamp both stood in the 1.77 m west bay, the room's only route past
    // the desk, squeezing it to a 0.26 m band. Moved against the west wall and the south wall
    // respectively, the bay now runs 0.589 m and 0.645 m clear at its two pinch points.
    plant(-1.95,-7.50,.82,'总经理办公室绿植');
    floorLamp(-2.00,-3.45,2.60,'总经理办公室落地灯');
    // A freestanding award plinth and signed-contract case reinforce the real work of the room.
    // It used to stand at x 3.55 … 4.29, which is the east bay — the route to the window corner —
    // leaving 0.075 m. On the entry side of the room it blocks nothing and is seen on arrival.
    taper(4.30,.47,-3.50,.32,.82,.26,P.stoneL,{mode:7,gloss:.18,tag:'总经理奖杯台'});
    taper(4.30,1.02,-3.50,.12,.35,.06,P.brassL,{gloss:.66,tag:'总经理奖杯台'});
    ball(4.30,1.29,-3.50,.12,.12,.12,P.glassL,{mode:1,alpha:.62,gloss:.72,tag:'总经理奖杯台'});
    solid(3.93,4.67,-3.86,-3.14);
    interactive('办公桌',1.18,1.18,-5.48,
      '查看总经理仪表板，决定今天最重要的三项工作。',
      'Review the general manager dashboard and choose today\'s three highest priorities.',
      '总经理 is the general manager; 优先事项 are priorities.',[1.18,-4.50],1.82,
      'manage-company','executive-leadership');
    interactive('合同审阅台',2.12,.93,-5.30,
      '核对合同金额、责任和批准流程，然后签字。',
      'Check the contract value, responsibilities, and approval path, then sign.',
      // [2.35,-4.40] was inside the east visitor chair. The folio is on the desk at x 2.12, so
      // the door lane reaches it comfortably within the same 1.58 m.
      '签字 means to sign; 批准流程 is an approval path.',[1.55,-4.50],1.58,
      'sign-executive-contract','executive-leadership','办公桌·合同');

    // City-view corner. The old group formed a closed ring in mid-floor: the second chair alone
    // spanned x 3.07 … 4.53 of the 3.175 … 4.385 east bay, so the corner sealed both itself and
    // the only route to it, and the station's focus [2.12,-7.38] was inside the first chair.
    // Pulled tight into the north-east corner against the glass and the east wall, the group is
    // now approached down a 0.99 m east bay and backs onto walls rather than onto walkable floor.
    visitorChair(2.70,-6.95,.35,P.sage,'景观椅');
    visitorChair(2.75,-8.10,1.30,P.sage,'景观椅');
    visitorChair(4.35,-8.10,-1.30,P.fabricL,'景观椅');
    roundTable(3.60,-8.10,.36,'景观茶几');
    floorLamp(2.10,-7.30,1.30,'景观灯');
    // The telescope has moved to the west light bay, where there is standing room in front of the
    // glass, and it now has a footprint: it used to be a 1.55 m brass mast a body walked through.
    capsule(2.05,1.16,-8.55,.030,1.55,.030,P.brass,{gloss:.62,tag:'望远镜'});
    for(const s of [-1,1])capsule(2.05+s*.10,1.80,-8.55,.060,.34,.060,P.black,
      {rx:Math.PI/2,tag:'望远镜'});
    box(2.05,1.59,-8.55,.38,.10,.24,P.brass,{round:.05,hard:true,tag:'望远镜'});
    solid(1.89,2.21,-8.71,-8.39);
    // Tagged to the telescope, not to '窗户': no prop on this floor wore '窗户' — the shell's
    // curtain wall is tagged '窗' — so this station could only ever be activated by walking into
    // its own floating label. The player-facing name is unchanged.
    interactive('窗户',2.05,1.72,-8.55,
      '站在城市景观角稍作停留，再回到下一项决策。',
      'Pause briefly at the city-view corner before returning to the next decision.',
      '城市景观 is a city view; 稍作停留 means pause briefly.',[1.20,-8.00],1.55,
      'take-city-view-break','executive-wellbeing','望远镜');

    // ---------------------------------------------------------------- finance director office
    executiveDesk(8.30,-5.62,2.75,.96,P.walnutD,'财务办公桌',true);
    executiveChair(8.30,-6.50,0,P.leather,'财务总监座椅');
    visitorChair(7.45,-4.40,Math.PI,P.fabricL,'财务访客椅');
    visitorChair(9.15,-4.40,Math.PI,P.fabricL,'财务访客椅');
    displayShelfZ(10.45,-8.55,2.05,2.05,'财务资料书架');
    plant(5.35,-8.02,.74,'财务办公室绿植');
    // Budget tray, secure approval token and payment checklist.
    box(6.15,.70,-7.42,.94,1.24,.52,P.walnutD,{hard:true,round:.08,mode:6,tag:'预算桌'});
    box(6.15,1.34,-7.42,.88,.055,.48,P.stoneL,{hard:true,round:.05,tag:'预算桌'});
    for(let i=0;i<4;i++)box(6.15,1.39+i*.020,-7.42+i*.025,.66,.016,.34,
      i===3?P.blue:P.paper,{hard:true,rz:(i-1.5)*.02,tag:'预算表'});
    luminous(cyl(6.48,1.46,-7.23,.035,.018,P.green,{mode:1,glow:.05,tag:'审批令牌'}),.01,.07);
    solid(5.63,6.67,-7.74,-7.10);
    interactive('预算桌',6.15,1.38,-7.42,
      '比较预算、现金流和付款清单，再提交最终审批。',
      'Compare the budget, cash flow, and payment checklist before final approval.',
      '预算 is a budget; 现金流 is cash flow; 审批 is formal approval.',[6.18,-6.58],1.48,
      'approve-executive-budget','finance-leadership');

    // ---------------------------------------------------------------- compact strategy / leadership room
    box(8.24,.75,-.15,3.55,.13,1.28,P.walnut,
      {hard:true,round:.30,mode:6,gloss:.27,mat:'wood',matScale:.78,matAmt:.20,tag:'会议桌'});
    box(8.24,.82,-.15,3.30,.025,1.08,P.leather,
      {hard:true,round:.26,mode:7,gloss:.035,tag:'会议桌'});
    box(8.24,.70,-.15,2.95,.035,.08,P.brassL,{hard:true,gloss:.68,tag:'会议桌'});
    for(const x of [6.88,9.60]) taper(x,.37,-.15,.18,.70,.14,P.walnutD,
      {mode:6,gloss:.20,tag:'会议桌'});
    solid(6.42,10.06,-.84,.54);
    for(const x of [7.05,8.24,9.43]) {
      strategyChair(x,-1.10,0,'会议椅');
      strategyChair(x,.80,Math.PI,'会议椅');
      capsule(x,.90,-.15,.015,.30,.015,P.steelD,{rz:Math.PI/2,tag:'会议麦克风'});
      luminous(cyl(x+.16,.91,-.15,.022,.014,P.red,{mode:1,glow:.03,tag:'会议麦克风'}),.006,.045);
    }
    dashboard(8.24,-2.77,3.35,'投影');
    pendantRing(8.24,-.15,.82,'战略室吊灯');
    // Cabinet contains conferencing remote, spare cables and a water service.
    box(11.02,.63,1.28,1.05,1.06,.50,P.walnutD,{hard:true,round:.07,mode:6,tag:'会议柜'});
    box(11.02,1.18,1.28,1.08,.055,.52,P.stoneL,{hard:true,round:.05,tag:'会议柜'});
    for(const x of [10.72,10.98])cyl(x,1.29,1.28,.055,.16,P.glassL,
      {mode:1,alpha:.40,gloss:.48,tag:'水杯'});
    box(11.28,1.28,1.28,.22,.040,.34,P.black,{round:.04,hard:true,tag:'会议遥控器'});
    solid(10.43,11.61,.98,1.62);
    interactive('会议桌',8.24,.96,-.15,
      '召集高层管理团队，讨论战略选择、风险和下一步行动。',
      'Bring the executive team together to discuss strategic choices, risks, and next actions.',
      '战略 is strategy; 高层管理团队 is the executive leadership team.',[5.58,.30],2.80,
      'hold-strategy-session','executive-leadership');
    interactive('投影',8.24,1.84,-2.77,
      '把经营数据和三种方案切到领导层屏幕。',
      'Put the operating figures and three options on the leadership display.',
      // [8.24,-1.72] was 0.05 m inside the north board chair's footprint, so the one cell the
      // game would walk the body to in order to present was not standable. 0.38 m further from
      // the table clears it and is still well inside the 1.48 m reach.
      '方案 is an option or proposal; 经营数据 are operating figures.',[8.24,-2.10],1.48,
      'present-leadership-dashboard','executive-leadership');

    // Soft wayfinding and plants finish the public edge without narrowing the lift route.
    glyphs(-1.0,2.20,2.07,0,'行政前台 · 来访请先登记',
      {size:.105,gap:.024,color:P.ink,mode:1,lift:.008,tag:'行政前台'});
    // Moved off the strategy-room door approach: at x 3.94 its footprint reached x 4.444, and the
    // door in the glass wall at x 4.72 needs body centres up to x 4.355, so the only way in was a
    // 0.37 m slot at the south end of the opening.
    plant(3.60,1.55,.68,'前台绿植');
    plant(-11.18,1.38,.66,'等候区南绿植');

    state.executiveFloor={
      actions:['manage-executive-calendar','wait-for-executive','review-people-plan',
        'review-operations','manage-company','sign-executive-contract','take-city-view-break',
        'approve-executive-budget','hold-strategy-session','present-leadership-dashboard'],
      rooms:['hr','operations','boss','finance','waiting','reception','strategy'],
      protectedSpine:{z0:2.2,z1:4.0},cityView:true,
    };
  });

  Object.assign(OfficeUse[KEY] || (OfficeUse[KEY]={}), {
    'manage-executive-calendar': {zh:'安排高层日程',py:'ānpái gāocéng rìchéng',en:'manage the executive calendar',secs:3.0,mins:18,
      gain:{mood:2,rest:-2},pose:{type:'desk'},done:'来访、会议和签字时间都排好了。',doneTr:'Visits, meetings, and signing times are organised.'},
    'wait-for-executive': {zh:'在高层等候',py:'zài gāocéng děnghòu',en:'wait for an executive appointment',secs:3.0,mins:12,
      gain:{rest:5,mood:2},pose:{type:'sit'},done:'行政助理通知你可以进去了。',doneTr:'The executive assistant says you may go in.'},
    'review-people-plan': {zh:'审阅人才计划',py:'shěnyuè réncái jìhuà',en:'review the people plan',secs:3.8,mins:35,
      gain:{mood:1,rest:-3},pose:{type:'work'},done:'招聘、晋升和继任事项已经整理。',doneTr:'Hiring, promotion, and succession items are organised.'},
    'review-operations': {zh:'审阅经营数据',py:'shěnyuè jīngyíng shùjù',en:'review operating performance',secs:4.0,mins:40,
      gain:{mood:1,rest:-4},pose:{type:'work'},done:'风险和跨部门行动已经明确。',doneTr:'Risks and cross-department actions are clear.'},
    'manage-company': {zh:'处理总经理工作',py:'chǔlǐ zǒngjīnglǐ gōngzuò',en:'handle general-manager priorities',secs:4.6,mins:65,
      gain:{mood:3,rest:-7,food:-3},pose:{type:'desk'},done:'今天最重要的三项决定完成了。',doneTr:'Today\'s three most important decisions are complete.'},
    'sign-executive-contract': {zh:'签署合同',py:'qiānshǔ hétong',en:'sign an executive contract',secs:3.4,mins:20,
      gain:{mood:2,rest:-2},pose:{type:'write'},done:'合同核对无误，已经签字。',doneTr:'The contract checks out and is signed.'},
    'take-city-view-break': {zh:'看一会儿城市',py:'kàn yíhuìr chéngshì',en:'take a city-view pause',secs:3.2,mins:10,
      gain:{rest:9,mood:10},pose:{type:'check'},done:'离开屏幕几分钟，思路清楚多了。',doneTr:'A few minutes away from the screen clears your head.'},
    'approve-executive-budget': {zh:'审批预算',py:'shěnpī yùsuàn',en:'approve the executive budget',secs:4.0,mins:38,
      gain:{mood:2,rest:-4},pose:{type:'work'},done:'预算、现金流和付款清单都批准了。',doneTr:'Budget, cash flow, and payments are approved.'},
    'hold-strategy-session': {zh:'召开战略会议',py:'zhàokāi zhànlüè huìyì',en:'hold a leadership strategy session',secs:4.8,mins:70,
      gain:{mood:3,rest:-7,food:-3},pose:{type:'sit'},done:'战略选择、风险和行动计划已经确认。',doneTr:'Strategic choices, risks, and actions are confirmed.'},
    'present-leadership-dashboard': {zh:'演示经营方案',py:'yǎnshì jīngyíng fāng\'àn',en:'present the leadership dashboard',secs:3.8,mins:25,
      gain:{mood:2,rest:-3},pose:{type:'work'},done:'三种方案和关键数据都汇报完了。',doneTr:'The three options and key figures are presented.'},
  });

  OfficeCast.push(
    {hz:'总经理',name:'赵明远',py:'Zhào Míngyuǎn',place:KEY,temper:'steady',
      look:{skin:'#c68e68',hair:'#2b2521',hairStyle:'short',top:'#f0ece3',pants:'#2e3740',
        shoe:'#23292e',jacket:'#35465a',tie:'#8e493d',glasses:true,tall:1.05,wide:1.00,faceSeed:9707},
      spots:[{h0:8,h1:19.5,at:[1.18,-6.45],face:0,act:'desk'}],
      lines:[['先把最重要的决定做完，再处理普通邮件。','Make the most important decisions before handling routine email.'],
             ['下午的战略会只讨论三种可执行方案。','This afternoon\'s strategy meeting considers only three actionable options.']]},
    {hz:'运营总监',name:'周岚',py:'Zhōu Lán',place:KEY,temper:'brisk',
      look:{skin:'#d8a47c',hair:'#28211e',hairStyle:'bob',top:'#ebe7de',pants:'#303944',
        shoe:'#292e33',jacket:'#4d6279',pin:true,tall:.98,wide:.93,faceSeed:9708},
      spots:[{h0:8,h1:19,at:[-4.72,-6.45],face:0,act:'work',held:null}],
      lines:[['经营数据没有大问题，但两个跨部门事项需要决定。','The operating figures are sound, but two cross-team items need decisions.'],
             ['我会把行动清单更新到项目墙。','I will update the action list on the project wall.']]},
    {hz:'财务总监',name:'林玮',py:'Lín Wěi',place:KEY,temper:'precise',
      look:{skin:'#be855f',hair:'#302722',hairStyle:'short',top:'#e6e1d7',pants:'#303943',
        shoe:'#252b30',jacket:'#3d4b59',tie:'#526f5a',tall:1.02,wide:.98,faceSeed:9709},
      spots:[{h0:8.5,h1:19.5,at:[8.30,-6.50],face:0,act:'desk'}],
      lines:[['预算和现金流必须一起看，不能只看一个数字。','Budget and cash flow must be read together, not as one isolated number.'],
             ['最终付款清单还差总经理审批。','The final payment list still needs the general manager\'s approval.']]},
    {hz:'人力资源总监',name:'顾宁',py:'Gù Níng',place:KEY,temper:'patient',
      look:{skin:'#e1af87',hair:'#352a25',hairStyle:'bun',top:'#e9e4db',pants:'#374149',
        shoe:'#2b3035',jacket:'#657b70',glasses:true,tall:.96,wide:.92,faceSeed:9710},
      spots:[{h0:8.5,h1:18.5,at:[-9.45,-6.47],face:0,act:'desk'}],
      lines:[['继任计划需要长期准备，不能等岗位空了才开始。','Succession planning takes time; it cannot start only when a role is vacant.'],
             ['招聘和晋升都要写清楚标准。','Hiring and promotion both need clear criteria.']]},
    {hz:'行政助理',name:'沈怡',py:'Shěn Yí',place:KEY,temper:'genial',
      look:{skin:'#d2a078',hair:'#251f1c',hairStyle:'ponytail',top:'#f0ece4',pants:'#34404b',
        shoe:'#282e33',jacket:'#536d87',badge:true,tall:.95,wide:.91,faceSeed:9711},
      spots:[{h0:8,h1:19.5,at:[.62,-.18],face:0,act:'desk'}],
      lines:[['您好，请先告诉我预约的姓名和时间。','Hello. Please tell me the appointment name and time.'],
             ['战略会议室已经准备好，资料也放到桌上了。','The strategy room is ready and the papers are on the table.']]}
  );
})();
