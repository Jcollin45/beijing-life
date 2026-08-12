// 北京市柳荫消防救援站 — a complete, enterable municipal fire station.
//
// The street frontage is the east (+x) wall.  Three measured apparatus openings occupy the
// southern hall; the public door enters a separate lobby at the north end.  The shell and every
// internal partition are built only where masonry exists: doorways are true gaps with lintels,
// glazing sits in framed openings, and every solid follows the visible wall segments exactly.

const FIRE_STATION_OUT = { x:24.80, z:-35.15, yaw:-Math.PI/2 };

// This module is lazy, but its signs must already own atlas cells when game.js uploads the glyph
// texture.  Register every character that can be written, including appliance numbers.
try {
  Glyphs.need('北京市柳荫消防救援站消防车库一号二号三号公共入口值班接待大厅安全出口'
    +'厨房休息室培训会议室调度值班室更衣室淋浴间卫生间装备室空气呼吸器清洗消毒车间'
    +'工具软管水带塔个人防护装备灭火器报警器地图出勤状态待命车辆检查访客请登记'
    +'当心车辆保持通道畅通紧急冲淋洗眼器压力正常危险禁止吸烟门窗桌椅灯水龙头头盔'
    +'防护服靴子氧气瓶工作台排水沟泵浦云梯救生绳医药箱无线电站长办公室宿舍床铺茶水咖啡'
    +'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789·-&/');
} catch (_) {}

const FireStation = Lazy('FireStation', () => {
  const RX=12.5, RZ=15.0, H=6.4;
  // Roof/shell height is not a personnel-room wall height.  The apparatus volume stays tall;
  // service rooms close under a 4.42 m raft and crew rooms close at their 3.4–3.8 m ceilings.
  const SERVICE_H=4.42, CREW_H=3.58, WET_H=3.46, LOBBY_H=3.82;
  const BODY_R=.30;
  const B=Build.scene({fabricGloss:.035});
  const {shape,box,cyl,ball,capsule,taper,model,flat,glyphs,solid,shade,glow,light,thing}=B;

  const col={
    floor:C('#9da4a2'), floorD:C('#646d6d'), floorL:C('#c8ceca'), drain:C('#424b4f'),
    // Warm plaster over a washable blue-grey dado.  The old near-white wall at exposure 1.04
    // erased jambs, corners and depth; the darker high field belongs only to the tall shell.
    wall:C('#c9c5ba'), wallD:C('#818b8a'), wallL:C('#ded9cc'), wallLow:C('#939f9e'),
    wallHigh:C('#747e80'), wallCap:C('#3f4a4e'), ceil:C('#8b9593'), acoustic:C('#768280'),
    frame:C('#3e494e'), door:C('#58666b'), doorPanel:C('#35454b'),
    red:C('#aa2925'), redD:C('#681b1b'), redL:C('#d84b3f'), redHi:C('#ff6452'),
    yellow:C('#e2b83e'), yellowD:C('#9b7422'), lime:C('#c9e34c'),
    steel:C('#8f9b9e'), steelL:C('#c0c9c9'), steelD:C('#465157'), chrome:C('#d1d7d6'),
    black:C('#14191b'), tire:C('#111518'), rubber:C('#282e30'),
    glass:C('#84b4c3'), glassD:C('#315c6b'), screen:C('#102e3c'), screenOn:C('#6fd7cb'),
    wood:C('#8a6244'), woodD:C('#503827'), woodL:C('#b38a62'),
    tan:C('#c59c61'), turnout:C('#b68b48'), stripe:C('#dbe36b'),
    navy:C('#233943'), blue:C('#316b88'), green:C('#3d7655'), orange:C('#d76d30'),
    white:C('#f4f1e6'), paper:C('#e9e3d5'), fabric:C('#50656c'), fabricD:C('#34474d'),
    skin:C('#c89068'), water:C('#91c6d2'), concrete:C('#afb4b0'),
  };

  const PLAN=Object.freeze({
    footprint:Object.freeze({x0:-RX,x1:RX,z0:-RZ,z1:RZ,height:H,front:'east',bodyRadius:BODY_R}),
    apparatusHall:Object.freeze({x0:-6.90,x1:12.25,z0:-14.25,z1:4.95}),
    supportStrip:Object.freeze({x0:-12.25,x1:-7.05,z0:-14.25,z1:4.95}),
    bays:Object.freeze([
      Object.freeze({id:'bay1',wall:'east',centerZ:-10.6,clearWidth:4.4,clearHeight:4.7,
        lane:Object.freeze({x0:-6.65,x1:12.25,z0:-12.8,z1:-8.4})}),
      Object.freeze({id:'bay2',wall:'east',centerZ:-5.2,clearWidth:4.4,clearHeight:4.7,
        lane:Object.freeze({x0:-6.65,x1:12.25,z0:-7.4,z1:-3.0})}),
      Object.freeze({id:'bay3',wall:'east',centerZ:.2,clearWidth:4.4,clearHeight:4.7,
        lane:Object.freeze({x0:-6.65,x1:12.25,z0:-2.0,z1:2.4})}),
    ]),
    doors:Object.freeze([
      Object.freeze({id:'public',axis:'x',x:RX,z:11.0,clearWidth:1.6,clearHeight:2.5}),
      Object.freeze({id:'hall-corridor',axis:'z',x:-5.0,z:5.0,clearWidth:1.2,clearHeight:2.4}),
      Object.freeze({id:'hall-lobby',axis:'z',x:8.7,z:5.0,clearWidth:1.6,clearHeight:2.4}),
      Object.freeze({id:'workshop',axis:'x',x:-7.0,z:-10.7,clearWidth:1.2,clearHeight:2.4}),
      Object.freeze({id:'decon',axis:'x',x:-7.0,z:-4.4,clearWidth:1.2,clearHeight:2.4}),
      Object.freeze({id:'gear',axis:'x',x:-7.0,z:1.8,clearWidth:1.2,clearHeight:2.4}),
      Object.freeze({id:'workshop-decon',axis:'z',x:-9.2,z:-7.6,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'decon-gear',axis:'z',x:-9.2,z:-1.2,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'corridor-kitchen',axis:'z',x:-8.8,z:7.4,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'corridor-briefing',axis:'z',x:-2.3,z:7.4,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'corridor-watch',axis:'x',x:.8,z:6.2,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'watch-lobby',axis:'x',x:6.1,z:7.1,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'lockers-lobby',axis:'x',x:6.1,z:11.1,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'watch-lockers',axis:'z',x:3.4,z:10.1,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'locker-shower',axis:'z',x:2.15,z:12.0,clearWidth:1.0,clearHeight:2.4}),
      Object.freeze({id:'locker-wc',axis:'z',x:4.85,z:12.0,clearWidth:1.0,clearHeight:2.4}),
      Object.freeze({id:'briefing-dorm',axis:'z',x:-4.45,z:11.8,clearWidth:1.1,clearHeight:2.4}),
      Object.freeze({id:'lobby-chief',axis:'z',x:8.35,z:11.8,clearWidth:1.1,clearHeight:2.4}),
    ]),
    glazing:Object.freeze([
      Object.freeze({id:'watch-hall',axis:'z',z:5.0,x0:.8,x1:6.1,sill:1.0,head:3.2}),
      Object.freeze({id:'lobby-front-1',axis:'x',x:RX,z0:5.45,z1:7.05,sill:.92,head:2.72}),
      Object.freeze({id:'lobby-front-2',axis:'x',x:RX,z0:7.90,z1:9.60,sill:.92,head:2.72}),
      Object.freeze({id:'lobby-front-3',axis:'x',x:RX,z0:12.60,z1:13.70,sill:.92,head:2.72}),
      Object.freeze({id:'lobby-front-4',axis:'x',x:RX,z0:13.90,z1:14.80,sill:.92,head:2.72}),
    ]),
    rooms:Object.freeze({
      hall:Object.freeze({x0:-6.90,x1:12.25,z0:-14.25,z1:4.95}),
      workshop:Object.freeze({x0:-12.25,x1:-7.05,z0:-14.25,z1:-7.65}),
      decon:Object.freeze({x0:-12.25,x1:-7.05,z0:-7.55,z1:-1.25}),
      gear:Object.freeze({x0:-12.25,x1:-7.05,z0:-1.15,z1:4.95}),
      corridor:Object.freeze({x0:-12.25,x1:.75,z0:5.05,z1:7.35}),
      kitchen:Object.freeze({x0:-12.25,x1:-5.45,z0:7.45,z1:14.25}),
      briefing:Object.freeze({x0:-5.25,x1:.75,z0:7.45,z1:11.75}),
      dorm:Object.freeze({x0:-5.25,x1:.75,z0:11.85,z1:14.25}),
      watch:Object.freeze({x0:.85,x1:6.05,z0:5.05,z1:10.05}),
      lockers:Object.freeze({x0:.85,x1:6.05,z0:10.15,z1:14.25}),
      lobby:Object.freeze({x0:6.15,x1:12.25,z0:5.05,z1:14.25}),
      chief:Object.freeze({x0:6.15,x1:9.05,z0:11.85,z1:14.25}),
    }),
    clearances:Object.freeze({bodyRadius:BODY_R,mainAisle:1.2,bayLane:4.4,
      standardDoor:1.0,publicDoor:1.6}),
  });

  const lit=[], screens=[], beacons=[];
  const tagOpt=(tag,o={})=>tag?{...o,tag}:o;
  const luminous=(p,k=.24)=>{lit.push({p,g0:p.glow||0,k});return p;};
  const liveScreen=(p,phase=0)=>{screens.push({p,g0:p.glow||.06,phase});return luminous(p,.16);};

  // Long rounded members.  The trusses, ladders, rails, pipes and wheel spokes all use these;
  // their open silhouettes are important in a building that is viewed in cutaway.
  function rodX(x,y,z,len,r,color,o={}) {
    return capsule(x,y,z,r,len,r,color,{rz:Math.PI/2,...o});
  }
  function rodZ(x,y,z,len,r,color,o={}) {
    return capsule(x,y,z,r,len,r,color,{rx:Math.PI/2,...o});
  }
  function rodXY(x0,y0,x1,y1,z,r,color,o={}) {
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy);
    return capsule((x0+x1)/2,(y0+y1)/2,z,r,len,r,color,
      {rz:-Math.atan2(dx,dy),...o});
  }
  // Rectangular hollow sections are the correct language for trusses, bed frames, rack rails and
  // sectional-door hardware, and avoid spending a 20-sided capsule on a straight steel member.
  function barX(x,y,z,len,r,color,o={}) {
    return box(x,y,z,len,r,r,color,{hard:true,...o});
  }
  function barY(x,y,z,len,r,color,o={}) {
    return box(x,y,z,r,len,r,color,{hard:true,...o});
  }
  function barZ(x,y,z,len,r,color,o={}) {
    return box(x,y,z,r,r,len,color,{hard:true,...o});
  }
  function barXY(x0,y0,x1,y1,z,r,color,o={}) {
    const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy);
    return box((x0+x1)/2,(y0+y1)/2,z,r,len,r,color,
      {hard:true,rz:-Math.atan2(dx,dy),...o});
  }

  function signZ(x,y,z,text,color=col.red,tag=text,size=.19,yaw=0) {
    const w=Math.max(1.15,[...text].length*(size+.045)+.28);
    box(x,y,z,w+.06,.36,.045,col.frame,{hard:true,gloss:.22,...tagOpt(tag)});
    box(x,y,z-.027,w-.04,.27,.018,color,{hard:true,mode:6,gloss:.18,...tagOpt(tag)});
    box(x,y-.175,z-.040,w+.08,.026,.030,col.chrome,{hard:true,gloss:.45,...tagOpt(tag)});
    glyphs(x,y,z-.047,yaw,text,{size,gap:.045,color:col.white,mode:1,lift:.010,tag});
  }
  function signX(x,y,z,text,color=col.red,tag=text,size=.19,yaw=-Math.PI/2) {
    const w=Math.max(1.15,[...text].length*(size+.045)+.28);
    box(x,y,z,.045,.36,w+.06,col.frame,{hard:true,gloss:.22,...tagOpt(tag)});
    box(x+.027,y,z,.018,.27,w-.04,color,{hard:true,mode:6,gloss:.18,...tagOpt(tag)});
    box(x+.040,y-.175,z,.030,.026,w+.08,col.chrome,{hard:true,gloss:.45,...tagOpt(tag)});
    glyphs(x+.047,y,z,yaw,text,{size,gap:.045,color:col.white,mode:1,lift:.010,tag});
  }

  // A wall is a construction assembly rather than one white block: dark skirting, washable dado,
  // warm upper plaster, a shadowed top cap, and (only above the human datum in the high bay) a
  // darker shell field.  Indoor plaster uses the documented 0.62 texture scale; the former 2.2
  // scale enlarged plaster noise into metre-wide swirls.
  function wallZSegment(z,x0,x1,tag,color=col.wall,o={}) {
    if(x1-x0<.025)return;
    const w=x1-x0,mid=(x0+x1)/2,th=o.th||.22,height=o.height||H;
    const dado=Math.min(1.08,height), high=height>4.65?3.62:height;
    box(mid,.21,z,w,.42,th,col.wallLow,
      {hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
    if(dado>.42)box(mid,(dado+.42)/2,z,w,dado-.42,th,col.wallLow,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
    if(high>dado)box(mid,(high+dado)/2,z,w,high-dado,th,color,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(tag)});
    if(height>high)box(mid,(height+high)/2,z,w,height-high,th,col.wallHigh,
      {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.10,...tagOpt(tag)});
    box(mid,.075,z,w+.02,.15,th+.035,col.wallCap,{hard:true,gloss:.22,...tagOpt(tag)});
    box(mid,height+.025,z,w+.04,.050,th+.055,col.wallCap,
      {hard:true,partition:true,gloss:.28,...tagOpt(tag)});
    solid(x0,x1,z-th/2,z+th/2);
  }
  function wallXSegment(x,z0,z1,tag,color=col.wall,o={}) {
    if(z1-z0<.025)return;
    const d=z1-z0,mid=(z0+z1)/2,th=o.th||.22,height=o.height||H;
    const dado=Math.min(1.08,height),high=height>4.65?3.62:height;
    box(x,.21,mid,th,.42,d,col.wallLow,
      {hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
    if(dado>.42)box(x,(dado+.42)/2,mid,th,dado-.42,d,col.wallLow,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
    if(high>dado)box(x,(high+dado)/2,mid,th,high-dado,d,color,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(tag)});
    if(height>high)box(x,(height+high)/2,mid,th,height-high,d,col.wallHigh,
      {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.10,...tagOpt(tag)});
    box(x,.075,mid,th+.035,.15,d+.02,col.wallCap,{hard:true,gloss:.22,...tagOpt(tag)});
    box(x,height+.025,mid,th+.055,.050,d+.04,col.wallCap,
      {hard:true,partition:true,gloss:.28,...tagOpt(tag)});
    solid(x-th/2,x+th/2,z0,z1);
  }
  function lintelZ(z,a,b,h,tag,color=col.wall,o={}) {
    const th=o.th||.22,height=o.height||H,high=height>4.65?3.62:height,
      upperStart=Math.max(high,h),mid=(a+b)/2,w=b-a;
    if(high>h)box(mid,h+(high-h)/2,z,w,high-h,th,color,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(tag)});
    if(height>upperStart)box(mid,(height+upperStart)/2,z,w,height-upperStart,th,col.wallHigh,
      {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.10,...tagOpt(tag)});
    box(mid,height+.025,z,w+.04,.050,th+.055,col.wallCap,
      {hard:true,partition:true,gloss:.28,...tagOpt(tag)});
  }
  function lintelX(x,a,b,h,tag,color=col.wall,o={}) {
    const th=o.th||.22,height=o.height||H,high=height>4.65?3.62:height,
      upperStart=Math.max(high,h),mid=(a+b)/2,d=b-a;
    if(high>h)box(x,h+(high-h)/2,mid,th,high-h,d,color,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(tag)});
    if(height>upperStart)box(x,(height+upperStart)/2,mid,th,height-upperStart,d,col.wallHigh,
      {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.10,...tagOpt(tag)});
    box(x,height+.025,mid,th+.055,.050,d+.04,col.wallCap,
      {hard:true,partition:true,gloss:.28,...tagOpt(tag)});
  }
  function frameZ(z,c,w,h,tag,color=col.steelD) {
    const a=c-w/2,b=c+w/2;
    for(const x of [a-.045,b+.045]) box(x,h/2,z-.132,.09,h,.10,color,
      {hard:true,gloss:.34,partition:true,...tagOpt(tag)});
    box(c,h+.045,z-.132,w+.18,.09,.10,color,{hard:true,gloss:.34,partition:true,...tagOpt(tag)});
  }
  function frameX(x,c,w,h,tag,color=col.steelD) {
    const a=c-w/2,b=c+w/2;
    for(const z of [a-.045,b+.045]) box(x-.132,h/2,z,.10,h,.09,color,
      {hard:true,gloss:.34,partition:true,...tagOpt(tag)});
    box(x-.132,h+.045,c,.10,.09,w+.18,color,{hard:true,gloss:.34,partition:true,...tagOpt(tag)});
  }
  function windowX(x,c,w,sill,head,tag,o=lobbyWall) {
    const th=o.th||.18,height=o.height||LOBBY_H;
    box(x,sill/2,c,th,sill,w,col.wallLow,
      {hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
    if(height>head)box(x,head+(height-head)/2,c,th,height-head,w,col.wall,
      {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(tag)});
    box(x-.125,(sill+head)/2,c,.045,head-sill,w-.10,col.glass,
      {hard:true,mode:1,alpha:.24,gloss:.90,partition:true,tag:'大厅前窗玻璃'});
    for(const z of [c-w/2+.045,c,c+w/2-.045])
      box(x-.145,(sill+head)/2,z,.075,head-sill+.10,.065,col.frame,
        {hard:true,partition:true,gloss:.36,...tagOpt(tag)});
    for(const y of [sill-.025,head+.025])box(x-.145,y,c,.075,.075,w+.06,col.frame,
      {hard:true,partition:true,gloss:.36,...tagOpt(tag)});
    box(x,sill+.035,c,th+.05,.07,w+.08,col.wallCap,
      {hard:true,partition:true,gloss:.30,...tagOpt(tag)});
    solid(x-th/2,x+th/2,c-w/2,c+w/2);
  }
  function partitionZ(z,x0,x1,openings=[],tagRoot='内墙',color=col.wall,o={}) {
    const cuts=openings.map((o,i)=>({c:o.c,w:o.w,h:o.h||2.4,id:o.id||i,
      a:Math.max(x0,o.c-o.w/2),b:Math.min(x1,o.c+o.w/2)})).sort((a,b)=>a.a-b.a);
    let at=x0,n=0;
    for(const q of cuts) {
      if(q.a>at+.02)wallZSegment(z,at,q.a,`${tagRoot}-${n++}`,color,o);
      lintelZ(z,q.a,q.b,q.h,`${tagRoot}-${q.id}-门楣`,color,o);
      frameZ(z,q.c,q.w,q.h,`${tagRoot}-${q.id}-门框`,o.frame||col.frame);
      at=Math.max(at,q.b);
    }
    if(at<x1-.02)wallZSegment(z,at,x1,`${tagRoot}-${n}`,color,o);
  }
  function partitionX(x,z0,z1,openings=[],tagRoot='内墙',color=col.wall,o={}) {
    const cuts=openings.map((o,i)=>({c:o.c,w:o.w,h:o.h||2.4,id:o.id||i,
      a:Math.max(z0,o.c-o.w/2),b:Math.min(z1,o.c+o.w/2)})).sort((a,b)=>a.a-b.a);
    let at=z0,n=0;
    for(const q of cuts) {
      if(q.a>at+.02)wallXSegment(x,at,q.a,`${tagRoot}-${n++}`,color,o);
      lintelX(x,q.a,q.b,q.h,`${tagRoot}-${q.id}-门楣`,color,o);
      frameX(x,q.c,q.w,q.h,`${tagRoot}-${q.id}-门框`,o.frame||col.frame);
      at=Math.max(at,q.b);
    }
    if(at<z1-.02)wallXSegment(x,at,z1,`${tagRoot}-${n}`,color,o);
  }

  // Personnel doors share one robust language: a thin charcoal steel leaf, narrow vision panel,
  // kick plate, one legible pull and two hinge barrels.  Leaves stand fully open at a jamb;
  // they are visual only, so the documented clear width and its collider remain untouched.
  function openDoorZ(z,c,w,hingeSide,into,tag,color=col.door,detailFace=-hingeSide) {
    const lw=Math.min(1.08,w-.08),hinge=c+hingeSide*w/2,cz=z+into*lw/2;
    box(hinge,1.15,cz,.060,2.30,lw,color,{round:.025,mode:6,gloss:.18,tag});
    const face=detailFace;
    box(hinge+face*.039,1.62,cz,.018,.60,lw*.58,col.glass,
      {hard:true,mode:1,alpha:.44,gloss:.78,tag:'消防站内门视窗'});
    box(hinge+face*.041,.32,cz,.022,.46,lw-.10,col.steelL,
      {hard:true,gloss:.42,tag});
    capsule(hinge+face*.056,1.03,z+into*(lw-.16),.022,.28,.022,col.chrome,
      {gloss:.58,tag});
    for(const y of [.42,1.88])cyl(hinge,y,z+into*.045,.035,.13,col.frame,{tag});
    flat(c,.009,z,w,.28,col.steelD,{gloss:.34,tag});
  }
  function openDoorX(x,c,w,hingeSide,into,tag,color=col.door,detailFace=-hingeSide) {
    const lw=Math.min(1.08,w-.08),hinge=c+hingeSide*w/2,cx=x+into*lw/2;
    box(cx,1.15,hinge,lw,2.30,.060,color,{round:.025,mode:6,gloss:.18,tag});
    const face=detailFace;
    box(cx,1.62,hinge+face*.039,lw*.58,.60,.018,col.glass,
      {hard:true,mode:1,alpha:.44,gloss:.78,tag:'消防站内门视窗'});
    box(cx,.32,hinge+face*.041,lw-.10,.46,.022,col.steelL,
      {hard:true,gloss:.42,tag});
    capsule(x+into*(lw-.16),1.03,hinge+face*.056,.022,.28,.022,col.chrome,
      {gloss:.58,tag});
    for(const y of [.42,1.88])cyl(x+into*.045,y,hinge,.035,.13,col.frame,{tag});
    flat(x,.009,c,.28,w,col.steelD,{gloss:.34,tag});
  }

  const serviceWall={height:SERVICE_H,th:.18,frame:col.frame};
  const crewWall={height:CREW_H,th:.16,frame:col.frame};
  const wetWall={height:WET_H,th:.16,frame:col.frame};
  const lobbyWall={height:LOBBY_H,th:.18,frame:col.frame};

  // ---------------------------------------------------------------- measured shell and floor
  flat(0,0,0,RX*2,RZ*2,col.floor,
    {mode:9,gloss:.08,mat:'tile',matScale:.42,matAmt:.28,tag:'消防站地面'});
  flat(2.78,.004,-4.65,18.85,19.0,col.concrete,
    {mode:9,gloss:.09,mat:'tile',matScale:.58,matAmt:.24,tag:'车库地面'});
  flat(0,.006,10.1,24.45,9.6,col.floorL,
    {mode:9,gloss:.07,mat:'tile',matScale:.34,matAmt:.22,tag:'生活区地面'});

  // The shell follows the section: high apparatus volume east of x=-7, lower service/crew wings
  // elsewhere.  This stepped parapet prevents a 6.4 m blank slab around 3.5 m occupied rooms.
  wallZSegment(-RZ,-RX,-7.0,'外墙-南-服务',col.wall,serviceWall);
  wallZSegment(-RZ,-7.0,RX,'外墙-南-车库');
  wallZSegment(RZ,-RX,6.1,'外墙-北-生活',col.wall,crewWall);
  wallZSegment(RZ,6.1,RX,'外墙-北-大厅',col.wall,lobbyWall);
  wallXSegment(-RX,-RZ,5.0,'外墙-西-服务',col.wall,serviceWall);
  wallXSegment(-RX,5.0,RZ,'外墙-西-生活',col.wall,crewWall);

  // East/front wall: real masonry piers around three 4.4 m apparatus openings and the 1.6 m
  // public threshold.  The openings have high and ordinary lintels respectively.
  for(const [z0,z1,i] of [[-15,-12.8,0],[-8.4,-7.4,1],[-3.0,-2.0,2],[2.4,5.0,'3高']])
    wallXSegment(RX,z0,z1,`外墙-东-${i}`);
  wallXSegment(RX,5.0,5.45,'外墙-东-3a',col.wall,lobbyWall);
  windowX(RX,6.25,1.60,.92,2.72,'大厅前窗一',lobbyWall);
  wallXSegment(RX,7.05,7.90,'外墙-东-3b',col.wall,lobbyWall);
  windowX(RX,8.75,1.70,.92,2.72,'大厅前窗二',lobbyWall);
  wallXSegment(RX,9.60,10.2,'外墙-东-3c',col.wall,lobbyWall);
  wallXSegment(RX,11.8,12.60,'外墙-东-4a',col.wall,lobbyWall);
  windowX(RX,13.15,1.10,.92,2.72,'大厅前窗三',lobbyWall);
  wallXSegment(RX,13.70,13.90,'外墙-东-4b',col.wall,lobbyWall);
  windowX(RX,14.35,.90,.92,2.72,'大厅前窗四',lobbyWall);
  wallXSegment(RX,14.80,15.0,'外墙-东-4c',col.wall,lobbyWall);
  for(const bay of PLAN.bays) {
    lintelX(RX,bay.centerZ-2.2,bay.centerZ+2.2,bay.clearHeight,`东墙-${bay.id}-高门楣`);
    frameX(RX,bay.centerZ,4.4,4.7,`东墙-${bay.id}-门框`,col.redD);
  }
  lintelX(RX,10.2,11.8,2.5,'东墙-公共门楣',col.wall,lobbyWall);
  frameX(RX,11,1.6,2.5,'东墙-公共门框',col.steelD);

  // West support strip and its three service rooms.
  partitionX(-7.0,-RZ,5.0,[
    {c:-10.7,w:1.2,h:2.4,id:'车间'},
    {c:-4.4,w:1.2,h:2.4,id:'清洗'},
    {c:1.8,w:1.2,h:2.4,id:'装备'},
  ],'车库西隔墙',col.wall,serviceWall);
  partitionZ(-7.6,-RX,-7.0,[{c:-9.2,w:1.1,h:2.4,id:'内门'}],
    '车间清洗隔墙',col.wall,serviceWall);
  partitionZ(-1.2,-RX,-7.0,[{c:-9.2,w:1.1,h:2.4,id:'内门'}],
    '清洗装备隔墙',col.wall,serviceWall);

  // Hall-to-crew separator.  The watch room uses a true framed window above a one-metre wall;
  // its full footprint remains a solid while the lobby and crew-corridor doors stay clear.
  partitionZ(5.0,-RX,.8,[{c:-5.0,w:1.2,h:2.4,id:'走廊'}],
    '车库走廊隔墙',col.wall,crewWall);
  const watchTag='值班室观察窗墙';
  box(3.45,.50,5.0,5.30,1.0,.18,col.wallLow,
    {hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(watchTag)});
  box(3.45,3.39,5.0,5.30,.38,.18,col.wall,
    {hard:true,partition:true,mat:'plaster',matScale:.62,matAmt:.13,...tagOpt(watchTag)});
  box(3.45,.075,5.0,5.34,.15,.215,col.wallCap,{hard:true,...tagOpt(watchTag)});
  box(3.45,1.04,4.92,5.34,.075,.24,col.steelD,
    {hard:true,partition:true,gloss:.36,...tagOpt(watchTag)});
  box(3.45,3.17,4.92,5.34,.10,.24,col.frame,
    {hard:true,partition:true,gloss:.32,...tagOpt(watchTag)});
  box(3.45,CREW_H+.025,5.0,5.36,.05,.24,col.wallCap,
    {hard:true,partition:true,gloss:.28,...tagOpt(watchTag)});
  for(const x of [.84,2.15,3.45,4.75,6.06])
    box(x,2.10,4.87,.07,2.20,.10,col.steelD,
      {hard:true,partition:true,gloss:.38,...tagOpt(watchTag)});
  for(let i=0;i<4;i++) box(1.50+i*1.30,2.10,4.885,1.23,2.04,.025,col.glass,
    {hard:true,mode:1,alpha:.22,gloss:.84,partition:true,...tagOpt(watchTag)});
  solid(.8,6.1,4.89,5.11);
  partitionZ(5.0,6.1,RX,[{c:8.7,w:1.6,h:2.4,id:'大厅'}],
    '车库大厅隔墙',col.wall,lobbyWall);

  // North admin/crew plan.
  partitionZ(7.4,-RX,.8,[
    {c:-8.8,w:1.1,h:2.4,id:'厨房'},
    {c:-2.3,w:1.1,h:2.4,id:'培训'},
  ],'走廊北墙',col.wall,crewWall);
  wallXSegment(-5.4,7.4,RZ,'厨房培训隔墙',col.wall,crewWall);
  partitionX(.8,5.0,RZ,[{c:6.2,w:1.1,h:2.4,id:'值班'}],
    '行政西隔墙',col.wall,crewWall);
  partitionX(6.1,5.0,RZ,[
    {c:7.1,w:1.1,h:2.4,id:'接待'},
    {c:11.1,w:1.1,h:2.4,id:'更衣'},
  ],'大厅西隔墙',col.wall,lobbyWall);
  partitionZ(10.1,.8,6.1,[{c:3.4,w:1.1,h:2.4,id:'更衣'}],
    '值班更衣隔墙',col.wall,crewWall);
  partitionZ(12.0,.8,6.1,[
    {c:2.15,w:1.0,h:2.4,id:'淋浴'},
    {c:4.85,w:1.0,h:2.4,id:'卫生间'},
  ],'更衣湿区隔墙',col.wall,wetWall);
  wallXSegment(3.65,12.0,RZ,'淋浴卫生间隔墙',col.wall,wetWall);
  partitionZ(11.8,-5.4,.8,[{c:-4.45,w:1.1,h:2.4,id:'宿舍'}],
    '培训宿舍隔墙',col.wall,crewWall);
  partitionZ(11.8,6.1,9.1,[{c:8.35,w:1.1,h:2.4,id:'站长'}],
    '大厅站长隔墙',col.wall,lobbyWall);
  wallXSegment(9.1,11.8,RZ,'站长办公室东墙',col.wall,lobbyWall);

  // The low service and crew roofs meet the 6.4 m appliance hall along two real vertical step
  // returns.  Segmented charcoal panels and expressed rails close those junctions without
  // resurrecting the monolithic pale slabs that previously dominated the cutaway.
  function upperStepZ(z,x0,x1,base,n,tagRoot) {
    const gap=.10,pw=(x1-x0-gap*(n-1))/n,top=H-.14;
    for(let i=0;i<n;i++) {
      const x=x0+pw/2+i*(pw+gap),tag=`${tagRoot}-${i+1}`;
      box(x,(base+top)/2,z,pw,top-base,.14,i%2?col.acoustic:col.wallHigh,
        {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.08,tag});
    }
    for(const y of [base+.04,top-.04])
      rodX((x0+x1)/2,y,z-.09,x1-x0-.04,.030,col.frame,{tag:`${tagRoot}-框`});
  }
  function upperStepX(x,z0,z1,base,n,tagRoot) {
    const gap=.10,pd=(z1-z0-gap*(n-1))/n,top=H-.14;
    for(let i=0;i<n;i++) {
      const z=z0+pd/2+i*(pd+gap),tag=`${tagRoot}-${i+1}`;
      box(x,(base+top)/2,z,.14,top-base,pd,i%2?col.acoustic:col.wallHigh,
        {hard:true,partition:true,mat:'concrete',matScale:.70,matAmt:.08,tag});
    }
    for(const y of [base+.04,top-.04])
      rodZ(x+.09,y,(z0+z1)/2,z1-z0-.04,.030,col.frame,{tag:`${tagRoot}-框`});
  }
  upperStepX(-7.0,-RZ,5.0,SERVICE_H,6,'车库西高侧墙');
  upperStepZ(5.0,-7.0,6.1,CREW_H,4,'车库北高侧墙');
  upperStepZ(5.0,6.1,RX,LOBBY_H,2,'大厅北高侧墙');

  // Fully-open personnel leaves.  Hinge choices keep every main approach line clear: service
  // leaves fold into their rooms, the two public-side leaves fold to the wall edge, and wet-room
  // leaves open north without covering the locker bench.
  openDoorX(-7.0,-10.7,1.2, 1,-1,'车间门');
  openDoorX(-7.0,-4.4, 1.2,-1,-1,'清洗门');
  openDoorX(-7.0, 1.8,  1.2, 1,-1,'装备门');
  openDoorZ(-7.6,-9.2,1.1,-1,-1,'车间清洗内门');
  // West-jamb leaf opens north into the clear gear-room centre, away from the decon sink.
  openDoorZ(-1.2,-9.2,1.1,-1,1,'清洗装备内门');
  openDoorZ(5.0,-5.0,1.2,-1,-1,'车库走廊门');
  // The lobby sees the east face of this parked leaf; put its vision panel, kick plate and pull
  // on that face instead of leaving the public view as a featureless red slab.
  openDoorZ(5.0, 8.7,1.6, 1, 1,'车库大厅门',col.red,1);
  openDoorZ(7.4,-8.8,1.1,-1, 1,'厨房门');
  openDoorZ(7.4,-2.3,1.1, 1, 1,'培训门');
  openDoorX(.8,6.2,1.1, 1, 1,'值班室门');
  openDoorX(6.1,7.1,1.1,-1, 1,'接待内门');
  openDoorX(6.1,11.1,1.1,-1,-1,'更衣大厅门');
  openDoorZ(10.1,3.4,1.1,-1, 1,'值班更衣门');
  openDoorZ(12.0,2.15,1.0,-1,1,'淋浴门');
  openDoorZ(12.0,4.85,1.0, 1,1,'卫生间门');
  openDoorZ(11.8,-4.45,1.1,-1,1,'宿舍门');
  openDoorZ(11.8, 8.35,1.1, 1,1,'站长办公室门');

  // Room plates sit beside, not inside, each clear opening.
  signX(-6.84,2.73,-11.55,'车间',col.navy,'车间门牌',.16,Math.PI/2);
  signX(-6.84,2.73,-5.25,'清洗消毒',col.blue,'清洗门牌',.15,Math.PI/2);
  signX(-6.84,2.73,.95,'装备室',col.red,'装备门牌',.16,Math.PI/2);
  signZ(-8.8,2.73,7.24,'厨房 · 休息室',col.green,'厨房门牌',.145,Math.PI);
  signZ(-2.3,2.73,7.24,'培训会议室',col.navy,'培训门牌',.15,Math.PI);
  signX(.96,2.73,6.95,'调度值班室',col.red,'值班门牌',.15,-Math.PI/2);
  signX(6.26,2.73,11.9,'更衣室',col.navy,'更衣门牌',.16,Math.PI/2);

  // ---------------------------------------------------------------- apparatus hall fabric
  // Lane paint follows the exact 4.4 m clear bay rectangles.  Nothing projects into the third
  // lane, which remains a genuine spare appliance route from the rear apron to the open door.
  for(const bay of PLAN.bays) {
    const z0=bay.centerZ-2.2,z1=bay.centerZ+2.2;
    for(const z of [z0+.035,z1-.035]) flat(2.78,.014,z,18.85,.07,col.yellow,
      {mode:7,gloss:.12,tag:`${bay.id}-边线`});
    for(let x=-5.95;x<11.5;x+=1.55) flat(x,.016,bay.centerZ,.78,.045,col.white,
      {mode:7,gloss:.10,tag:`${bay.id}-中心线`});
    // A slotted trench drain just inside each threshold, with the slots individually legible.
    box(10.65,.022,bay.centerZ,.34,.035,3.72,col.drain,
      {hard:true,gloss:.28,tag:`${bay.id}-排水沟`});
    for(let z=z0+.48;z<z1-.40;z+=.26)
      flat(10.65,.043,z,.25,.055,col.steelL,{gloss:.45,tag:`${bay.id}-排水沟`});
    // Fully-open overhead sectional door: side guides, horizontal ceiling tracks and a compact
    // roll above the inner end.  It documents a working mechanism without putting a fake slab in
    // the high opening.
    for(const s of [-1,1]) {
      box(12.22,2.38,bay.centerZ+s*2.25,.10,4.66,.08,col.steelD,
        {hard:true,gloss:.36,tag:`${bay.id}-门轨`});
      barX(9.70,4.78,bay.centerZ+s*2.25,5.05,.045,col.steelD,{tag:`${bay.id}-门轨`});
    }
    cyl(7.28,4.75,bay.centerZ,.22,3.90,col.steel,
      {rx:Math.PI/2,gloss:.32,tag:`${bay.id}-卷门`});
    for(let z=z0+.34;z<z1-.25;z+=.22)
      barX(7.28,4.76,z,.34,.018,col.steelL,{tag:`${bay.id}-卷门`});
    signX(12.34,5.22,bay.centerZ,`${bay.id==='bay1'?'一':bay.id==='bay2'?'二':'三'}号车库`,
      col.red,`${bay.id}-标志`,.17,Math.PI/2);
    // Protective bollards are outside the 4.4 m clear rectangle, never inside its jambs.
    for(const s of [-1,1]) {
      const bz=bay.centerZ+s*2.34;
      cyl(11.91,.49,bz,.105,.82,col.yellow,{gloss:.30,tag:`${bay.id}-防撞柱`});
      for(let y=.20;y<.75;y+=.24)cyl(11.91,y,bz,.109,.07,col.black,
        {gloss:.16,tag:`${bay.id}-防撞柱`});
    }
  }

  // Yellow hatching preserves a 1.25 m-wide west-side turnout route behind both parked engines.
  flat(-5.85,.013,-4.70,1.25,18.9,col.floorD,{mode:7,alpha:.20,tag:'车库主通道'});
  for(let z=-13.7;z<4.2;z+=.70)
    flat(-5.85,.017,z,1.18,.075,col.yellow,{mode:7,gloss:.10,ry:-.55,tag:'车库主通道'});
  glyphs(11.92,3.82,3.55,-Math.PI/2,'当心车辆',
    {size:.20,gap:.055,color:col.yellow,mode:1,lift:.02,tag:'车辆警告'});

  function ceilingLight(x,y,z,w=2.2,axis='x',tag='顶灯') {
    const alongX=axis==='x';
    box(x,y,z,alongX?w:.18,.10,alongX?.18:w,col.steelD,
      {hard:true,gloss:.28,...tagOpt(tag)});
    const p=box(x,y-.065,z,alongX?w-.14:.11,.032,alongX?.11:w-.14,col.floorL,
      {hard:true,mode:1,glow:.17,...tagOpt(tag)});
    luminous(p,.42);
    glow(M.trs(x,.025,z,0,alongX?w*1.45:2.8,1,alongX?2.8:w*1.45),col.white,.07,false);
    light(x,y-.28,z,col.white,.58,4.6);
  }

  // Four open-web trusses span only the high apparatus volume.  The lower service wing closes
  // independently at x=-7, so no steel members unrealistically spear its ceiling raft.
  for(const [ti,z] of [-13.2,-8.3,-3.4,1.5].entries()) {
    const tag=`车库桁架-${ti+1}`;
    const x0=-6.75,x1=12.10,mid=(x0+x1)/2,span=x1-x0;
    const topY=x=>5.50+(1-Math.abs((x-mid)/(span/2)))*.68;
    barX(mid,5.48,z,span,.075,col.steelD,{tag});
    barXY(x0,5.50,mid,6.18,z,.065,col.steel,{tag});
    barXY(mid,6.18,x1,5.50,z,.065,col.steel,{tag});
    for(let i=0;i<8;i++) {
      const a=x0+i*span/8,b=x0+(i+1)*span/8;
      barXY(a,5.50,b,topY(b),z,.038,col.steelD,{tag});
      barXY(b,5.50,a,topY(a),z,.038,col.steelD,{tag});
    }
    for(const x of [-4.0,2.4,8.1]) ceilingLight(x,5.27,z,1.78,'x',`${tag}-灯`);
  }
  // Long purlins tie the trusses together.
  for(const x of [-4.8,0,4.8,9.6])barZ(x,5.73,-5.85,17.6,.045,col.steelD,
    {tag:`车库檩条-${x}`});
  // Narrow corrugated liner pans close the roof without becoming one uncullable black slab.
  // Each pan owns a local cutaway tag; the open seams still reveal truss depth and services.
  for(let i=0;i<10;i++) {
    const z=-13.91+i*1.98;
    box(2.68,6.30,z,18.90,.055,1.88,col.ceil,
      {hard:true,mode:7,gloss:.08,tag:`车库屋面-${i+1}`});
  }

  // Segmented round supply duct with collars, two drops and louvred diffusers.
  for(const z of [-12.0,-9.4,-6.8,-4.2,-1.6,1.0]) {
    cyl(-3.65,5.05,z+1.22,.245,2.44,col.steelL,
      {rx:Math.PI/2,gloss:.26,tag:'车库送风管'});
    cyl(-3.65,5.05,z+.02,.275,.065,col.steelD,
      {rx:Math.PI/2,gloss:.35,tag:'车库送风管'});
  }
  // A measured short terminal stops 30 cm before the north high-side wall.
  cyl(-3.65,5.05,4.10,.245,1.20,col.steelL,
    {rx:Math.PI/2,gloss:.26,tag:'车库送风管'});
  cyl(-3.65,5.05,3.52,.275,.065,col.steelD,
    {rx:Math.PI/2,gloss:.35,tag:'车库送风管'});
  for(const z of [-10.2,-4.9,.4]) {
    capsule(-3.65,4.65,z,.065,.72,.065,col.steelD,{tag:'车库送风管'});
    box(-3.65,4.26,z,1.15,.10,.42,col.steelL,
      {hard:true,gloss:.28,tag:'车库风口'});
    for(let x=-4.1;x<=-3.2;x+=.18)box(x,4.19,z,.035,.04,.35,col.steelD,
      {hard:true,tag:'车库风口'});
  }

  // Red sprinkler main and a measured head grid.  The little deflector discs hang below branch
  // pipes; no decorative nozzle floats unsupported.
  rodZ(8.7,5.42,-5.25,18.0,.035,col.redD,{tag:'消防喷淋主管'});
  for(const z of [-12.0,-8.0,-4.0,0,4.0]) {
    rodX(3.2,5.42,z,11.0,.026,col.redD,{tag:`喷淋支管-${z}`});
    for(const x of [-1.8,3.2,8.2]) {
      capsule(x,5.25,z,.020,.30,.020,col.redD,{tag:`喷头-${x}-${z}`});
      cyl(x,5.08,z,.075,.018,col.chrome,{gloss:.52,tag:`喷头-${x}-${z}`});
    }
  }

  function extinguisher(x,z,yaw=0,tag='灭火器') {
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    cyl(x,.52,z,.145,.72,col.red,{gloss:.28,...tagOpt(tag)});
    taper(x,.93,z,.18,.22,.18,col.redD,{gloss:.28,...tagOpt(tag)});
    cyl(x,1.08,z,.055,.12,col.steelD,{gloss:.46,...tagOpt(tag)});
    box(x+nx*.10,.99,z+nz*.10,.20,.045,.055,col.black,
      {hard:true,ry:yaw,gloss:.28,...tagOpt(tag)});
    capsule(x-nx*.15,.70,z-nz*.15,.025,.55,.025,col.black,
      {rx:.28,ry:yaw,...tagOpt(tag)});
    ball(x+nx*.06,1.15,z+nz*.06,.055,.055,.025,col.white,{gloss:.42,...tagOpt(tag)});
    box(x,.52,z+.151,.17,.23,.015,col.white,{hard:true,mode:1,...tagOpt(tag)});
    solid(x-.20,x+.20,z-.20,z+.20);
    return thing('灭火器',x,.72,z,'墙边挂着一具灭火器。','An extinguisher is mounted by the wall.',
      '灭火器 means fire extinguisher.',{tag,focus:[x-nx*.55,z-nz*.55],reach:1.35});
  }
  function egressZ(x,y,z,yaw=0,tag='安全出口') {
    const p=box(x,y,z,1.52,.36,.055,col.green,
      {hard:true,mode:1,glow:.14,...tagOpt(tag)});
    luminous(p,.30);
    glyphs(x,y,z-.040,yaw,'安全出口',{size:.165,gap:.04,color:col.white,mode:1,
      glow:.06,lift:.012,tag});
  }
  function egressX(x,y,z,yaw=-Math.PI/2,tag='安全出口') {
    const p=box(x,y,z,.055,.36,1.52,col.green,
      {hard:true,mode:1,glow:.14,...tagOpt(tag)});
    luminous(p,.30);
    glyphs(x+.040,y,z,yaw,'安全出口',{size:.165,gap:.04,color:col.white,mode:1,
      glow:.06,lift:.012,tag});
  }
  extinguisher(-6.65,3.7,Math.PI/2,'车库灭火器');
  extinguisher(6.55,5.38,Math.PI,'大厅灭火器');
  egressZ(8.7,2.75,4.84,Math.PI,'车库安全出口');
  egressX(12.32,2.88,11.0,Math.PI/2,'公共安全出口');

  // ---------------------------------------------------------------- fire appliances
  function ringXY(cx,cy,cz,r,n,thick,color,tag) {
    const seg=2*r*Math.sin(Math.PI/n);
    for(let i=0;i<n;i++) {
      const a=(i+.5)*Math.PI*2/n;
      capsule(cx+Math.cos(a)*r,cy+Math.sin(a)*r,cz,thick,seg,thick,color,
        {rz:a,gloss:.22,tag});
    }
  }
  function ringXZ(cx,cy,cz,r,n,thick,color,tag) {
    const seg=2*r*Math.sin(Math.PI/n);
    for(let i=0;i<n;i++) {
      const a=(i+.5)*Math.PI*2/n;
      capsule(cx+Math.cos(a)*r,cy,cz+Math.sin(a)*r,thick,seg,thick,color,
        {ry:-a,rx:Math.PI/2,gloss:.22,tag});
    }
  }
  function ringYZ(cx,cy,cz,r,n,thick,color,tag) {
    const seg=2*r*Math.sin(Math.PI/n);
    for(let i=0;i<n;i++) {
      const a=(i+.5)*Math.PI*2/n;
      capsule(cx,cy+Math.cos(a)*r,cz+Math.sin(a)*r,thick,seg,thick,color,
        {rx:a+Math.PI/2,gloss:.22,tag});
    }
  }
  // Decorative coils do not need ten to twelve 20-segment capsules apiece.  The renderer already
  // owns a smooth, genuinely open torus mesh; one instance preserves the silhouette and the hole
  // while removing the repeated capsule vertex work.  Road wheels deliberately retain their
  // authored segmented construction because their tyre/rim/spoke assemblies are working-scale
  // vehicle geometry, not background loops.
  function torusXY(cx,cy,cz,r,depth,color,tag) {
    return shape('ring',cx,cy,cz,2*r,2*r,depth,color,{gloss:.22,tag});
  }
  function torusXZ(cx,cy,cz,r,depth,color,tag) {
    return shape('ring',cx,cy,cz,2*r,2*r,depth,color,
      {rx:Math.PI/2,gloss:.22,tag});
  }
  function torusYZ(cx,cy,cz,r,depth,color,tag) {
    return shape('ring',cx,cy,cz,2*r,2*r,depth,color,
      {ry:Math.PI/2,gloss:.22,tag});
  }
  function openWheel(wx,wy,wz,tag) {
    ringXY(wx,wy,wz,.54,12,.14,col.tire,`${tag}-轮胎`);
    ringXY(wx,wy,wz,.35,10,.047,col.chrome,`${tag}-轮圈`);
    cyl(wx,wy,wz,.115,.16,col.steelD,{rx:Math.PI/2,gloss:.42,tag:`${tag}-轮毂`});
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;
      const mx=wx+Math.cos(a)*.20,my=wy+Math.sin(a)*.20;
      capsule(mx,my,wz,.027,.37,.027,col.steelL,{rz:a,gloss:.50,tag:`${tag}-轮辐`});
    }
  }
  function lockerOutline(x,y,z,w,h,side,tag) {
    const zz=z+side*1.208;
    box(x,y,zz,w-.07,h-.08,.026,col.redD,{hard:true,gloss:.18,tag});
    box(x,y,zz+side*.018,w-.16,h-.17,.018,col.red,{hard:true,mode:6,gloss:.24,tag});
    for(const sy of [-1,1])box(x,y+sy*(h/2-.065),zz+side*.035,w-.10,.035,.018,col.chrome,
      {hard:true,gloss:.54,tag});
    for(const sx of [-1,1])box(x+sx*(w/2-.055),y,zz+side*.035,.035,h-.10,.018,col.chrome,
      {hard:true,gloss:.54,tag});
    box(x+w*.31,y,zz+side*.060,.055,.26,.035,col.black,{hard:true,gloss:.35,tag});
    for(let k=-2;k<=2;k++)box(x-w*.20,y+.43+k*.07,zz+side*.060,w*.36,.018,.025,col.steelD,
      {hard:true,tag});
  }
  function fireEngine(z,unit,variant=0) {
    const tag=`消防车${unit}号`;
    const body=variant?col.redL:col.red;
    const accent=variant?col.yellow:col.white;
    // Twin open chassis rails and crossmembers are the underbody: no full-width black plate masks
    // the wheel openings or turns the appliance into a bus-shaped slab.
    for(const s of [-1,1])rodX(2.05,.55,z+s*.72,9.55,.105,col.steelD,{tag});
    for(const x of [-2.45,-.65,1.20,3.05,5.15,6.80])rodZ(x,.55,z,1.50,.07,col.steelD,{tag});
    for(const s of [-1,1])
      cyl(2.35,.63,z+s*.91,.285,1.18,col.steel,{rz:Math.PI/2,gloss:.38,tag:`${tag}-油箱`});

    // Rear equipment body: a low structural sill supports four separately rounded locker pods,
    // eliminating the former bus-like uninterrupted box while retaining useful interior volume.
    for(const side of [-1,1])
      capsule(.05,.92,z+side*1.08,.11,5.34,.11,col.redD,
        {rz:Math.PI/2,gloss:.25,tag:`${tag}-器材舱侧梁`});
    for(let i=0;i<4;i++)
      box(-1.93+i*1.31,2.04,z,1.23,2.00,2.24,body,
        {round:.12,mode:6,gloss:.26,tag:`${tag}-器材舱体-${i}`});
    taper(.05,3.12,z,5.02,.32,2.20,col.redD,{gloss:.25,tag});
    for(const side of [-1,1]) for(let i=0;i<4;i++)
      lockerOutline(-1.93+i*1.31,1.92,z,1.20,1.72,side,`${tag}-器材舱-${side}-${i}`);
    // Rear pump panel, gauges, colour-coded couplings and fold-down step.
    box(-2.72,1.72,z,.08,1.75,1.94,col.steelD,{hard:true,gloss:.30,tag:`${tag}-泵浦`});
    for(let i=0;i<4;i++) {
      const zz=z-.69+i*.46;
      cyl(-2.78,1.70,zz,.13,.09,i%2?col.yellow:col.redL,
        {rz:Math.PI/2,gloss:.48,tag:`${tag}-泵浦`});
      torusYZ(-2.83,2.32,zz,.10,.018,col.white,`${tag}-压力表`);
      capsule(-2.88,2.32,zz,.012,.075,.012,col.black,
        {rz:i*.48,tag:`${tag}-压力表`});
    }
    box(-2.91,.48,z,.30,.20,2.46,col.chrome,{round:.04,gloss:.48,tag:`${tag}-后保险杠`});
    box(-2.95,.75,z,.24,.10,1.35,col.steelL,{hard:true,gloss:.40,tag:`${tag}-登车踏板`});
    for(let zz=z-.55;zz<=z+.55;zz+=.22)box(-3.08,.77,zz,.16,.025,.10,col.black,
      {hard:true,tag:`${tag}-登车踏板`});

    // Cab: rounded lower shell plus tapered crew canopy and nose.  Windows remain transparent;
    // mullions, wipers, handles and mirrors are separate working-scale parts.
    box(4.86,1.48,z,3.48,1.62,2.36,body,{round:.18,mode:6,gloss:.27,tag});
    taper(4.72,2.60,z,3.05,1.42,2.24,body,{gloss:.25,tag});
    taper(6.48,1.56,z,1.25,1.48,2.26,col.redD,{gloss:.26,tag});
    box(4.76,3.32,z,2.96,.15,2.28,col.redD,{round:.06,hard:true,gloss:.27,tag});
    // Front and side glazing.
    box(6.26,2.58,z,.035,.72,1.82,col.glassD,
      {hard:true,mode:1,alpha:.30,gloss:.88,tag:`${tag}-前窗`});
    box(6.295,2.58,z,.018,.055,1.88,col.black,{hard:true,tag:`${tag}-前窗中柱`});
    for(const side of [-1,1]) {
      const zz=z+side*1.132;
      for(const [x,w] of [[3.92,1.05],[5.28,1.10]])
        box(x,2.58,zz,w,.72,.025,col.glass,
          {hard:true,mode:1,alpha:.28,gloss:.88,tag:`${tag}-侧窗-${side}`});
      box(4.59,2.58,zz,.07,.78,.045,col.redD,{hard:true,tag:`${tag}-窗柱-${side}`});
      box(5.05,1.82,zz+side*.030,1.20,.035,.030,accent,
        {hard:true,gloss:.42,tag:`${tag}-反光带`});
      box(5.30,2.03,zz+side*.045,.34,.055,.035,col.black,
        {hard:true,gloss:.32,tag:`${tag}-门把手`});
      // Mirror arm and rounded mirror shell.
      rodZ(6.12,2.69,z+side*1.36,.43,.025,col.chrome,{tag:`${tag}-后视镜`});
      box(6.12,2.69,z+side*1.57,.30,.43,.085,col.black,
        {round:.08,gloss:.26,tag:`${tag}-后视镜`});
      box(6.12,2.69,z+side*1.618,.23,.34,.016,col.glass,
        {hard:true,mode:1,alpha:.46,gloss:.94,tag:`${tag}-后视镜`});
      // Non-slip access steps under each crew door.
      box(4.70,.73,z+side*1.28,2.12,.12,.30,col.chrome,
        {round:.035,gloss:.46,tag:`${tag}-踏板`});
      for(let x=3.85;x<5.65;x+=.24)box(x,.80,z+side*1.38,.12,.025,.12,col.black,
        {hard:true,tag:`${tag}-踏板`});
    }
    for(const side of [-1,1])
      box(.05,2.42,z+side*1.225,5.02,.075,.025,accent,
        {hard:true,gloss:.46,tag:`${tag}-器材舱反光带`});
    // Windscreen wipers on the east face.
    for(const zz of [z-.44,z+.44])
      capsule(6.305,2.39,zz,.018,.48,.018,col.black,{rx:.25,tag:`${tag}-雨刷`});
    box(7.15,.49,z,.24,.25,2.58,col.chrome,{round:.05,gloss:.50,tag:`${tag}-前保险杠`});
    box(7.115,1.30,z,.07,.52,1.34,col.black,{hard:true,gloss:.22,tag:`${tag}-格栅`});
    for(let zz=z-.54;zz<=z+.54;zz+=.18)box(7.16,1.30,zz,.03,.41,.065,col.chrome,
      {hard:true,gloss:.50,tag:`${tag}-格栅`});
    for(const zz of [z-.83,z+.83]) {
      cyl(7.19,1.72,zz,.18,.07,col.white,{rz:Math.PI/2,mode:1,glow:.08,tag:`${tag}-前灯`});
      cyl(7.20,1.28,zz,.105,.075,col.orange,{rz:Math.PI/2,mode:1,glow:.05,tag:`${tag}-转向灯`});
    }
    glyphs(7.23,.91,z,-Math.PI/2,`119-${unit}`,
      {size:.105,gap:.022,color:col.white,mode:1,lift:.01,tag:`${tag}-车牌`});

    // Four open wheel rings per vehicle: the scene can be viewed through every rim, and six
    // spokes connect a true hub rather than being painted circles.
    for(const wx of [-1.58,5.38]) for(const side of [-1,1])
      openWheel(wx,.63,z+side*1.255,`${tag}-${wx}-${side}`);
    for(const wx of [-1.58,5.38])for(const side of [-1,1])
      capsule(wx,1.10,z+side*1.18,.075,1.30,.075,body,
        {rz:Math.PI/2,gloss:.26,tag:`${tag}-轮眉`});

    // Roof extension ladder with two rails, eleven rungs, end stops and support saddles.
    for(const side of [-1,1])rodX(.05,3.57,z+side*.57,5.28,.052,col.chrome,
      {tag:`${tag}-云梯`});
    for(let x=-2.35;x<=2.45;x+=.48)rodZ(x,3.57,z,1.14,.032,col.chrome,{tag:`${tag}-云梯`});
    for(const x of [-2.25,2.25])for(const s of [-1,1])
      capsule(x,3.42,z+s*.57,.045,.30,.045,col.steelD,{tag:`${tag}-云梯支架`});

    // Exposed hose reel on the accessible north side, with a coiled open ring, spokes, nozzle
    // cradle and crank.  The opposite face gets a smaller foam line reel.
    for(const side of [-1,1]) {
      const zz=z+side*1.255;
      torusXY(.42,1.85,zz,.43,.055,side>0?col.yellow:col.redD,`${tag}-水带卷盘-${side}`);
      torusXY(.42,1.85,zz,.31,.040,side>0?col.redD:col.yellowD,`${tag}-水带卷盘-${side}`);
      for(let i=0;i<4;i++) {
        const a=i*Math.PI/2;
        capsule(.42+Math.cos(a)*.20,1.85+Math.sin(a)*.20,zz,.022,.38,.022,col.steelL,
          {rz:a,gloss:.43,tag:`${tag}-卷盘支臂-${side}`});
      }
      cyl(.42,1.85,zz,.095,.12,col.steelD,{rx:Math.PI/2,gloss:.42,tag:`${tag}-卷盘轴-${side}`});
      capsule(.78,1.53,zz+side*.04,.025,.48,.025,col.black,
        {rz:-.75,tag:`${tag}-水枪-${side}`});
    }

    // Twin rotating beacons and centre siren sit on proper plinths.
    for(const zz of [z-.66,z+.66]) {
      cyl(4.25,3.46,zz,.14,.07,col.black,{gloss:.26,tag:`${tag}-警灯`});
      const p=cyl(4.25,3.59,zz,.11,.20,col.redHi,
        {mode:1,alpha:.56,glow:.14,gloss:.80,tag:`${tag}-警灯`});
      beacons.push({p,phase:unit*1.7+(zz-z)*2,g0:.14});
    }
    cyl(5.10,3.48,z,.20,.09,col.chrome,{gloss:.52,tag:`${tag}-警报器`});
    taper(5.10,3.62,z,.26,.22,.26,col.steelD,{gloss:.38,tag:`${tag}-警报器`});

    // Vehicle collider follows its footprint and stays more than 1.2 m from the west turnout
    // route.  Decorative mirrors and wheels never create invisible collision bulges.
    solid(-3.05,7.32,z-1.34,z+1.34);
    shade(2.05,z,10.65,2.90,.30);
    thing('消防车',5.15,1.65,z,`这是${unit}号消防车，器材已经检查完毕。`,
      `This is fire appliance ${unit}; its equipment check is complete.`,
      '消防车 is a fire engine. 出勤 means to turn out for a call.',
      {tag,focus:[7.9,z],reach:2.4});
  }

  fireEngine(-10.6,1,0);
  fireEngine(-5.2,2,1);

  // ---------------------------------------------------------------- rear support rooms
  function openBench(x,z,w,d,tag,collide=true) {
    box(x,.88,z,w,.12,d,col.wood,{round:.035,mode:6,gloss:.26,tag});
    for(const sx of [-1,1])for(const sz of [-1,1])
      box(x+sx*(w/2-.12),.43,z+sz*(d/2-.09),.09,.78,.09,col.steelD,
        {hard:true,gloss:.32,tag});
    rodX(x,.24,z,w-.18,.035,col.steelD,{tag});
    rodZ(x,.24,z,d-.14,.035,col.steelD,{tag});
    box(x,.54,z+d*.42,w-.28,.38,.12,col.steelD,{hard:true,tag});
    for(let i=-2;i<=2;i++)box(x+i*w*.13,.54,z+d*.49,w*.10,.05,.035,col.chrome,
      {hard:true,gloss:.50,tag});
    if(collide)solid(x-w/2,x+w/2,z-d/2,z+d/2);
    shade(x,z,w+.18,d+.18,.20);
  }
  function pegTool(x,y,z,type,color,tag) {
    // Tools are thin silhouettes proud of the pegboard, never painted symbols.
    if(type%3===0) {
      capsule(x,y,z,.025,.58,.025,col.woodD,{rz:.12,tag});
      box(x-.08,y+.20,z-.025,.36,.10,.055,color,{round:.025,ry:.10,tag});
    } else if(type%3===1) {
      capsule(x,y,z,.020,.52,.020,color,{rz:-.26,tag});
      for(const s of [-1,1])capsule(x+s*.11,y+.22,z,.020,.25,.020,color,
        {rz:s*.50,tag});
    } else {
      capsule(x,y,z,.022,.54,.022,col.woodD,{tag});
      taper(x,y+.28,z,.20,.22,.07,color,{gloss:.35,tag});
    }
  }

  // Workshop: west-wall bench, perforated board, vice, loose hand tools and a clear centre route.
  openBench(-11.72,-11.18,1.10,3.35,'车间工作台');
  box(-12.31,2.05,-11.18,.055,1.75,3.48,col.navy,
    {hard:true,mode:6,gloss:.15,tag:'车间工具板'});
  for(let y=1.40;y<2.70;y+=.40)for(let z=-12.62;z<-9.72;z+=.43)
    cyl(-12.34,y,z,.012,.025,col.steelL,{rz:Math.PI/2,tag:'车间工具板孔'});
  for(let i=0;i<7;i++)pegTool(-12.39,1.48+(i%2)*.63,-12.45+i*.45,i,
    i%2?col.redL:col.chrome,'车间手工具');
  // A real bench vice: fixed jaw, sliding jaw, screw and tommy bar.
  box(-11.15,.99,-12.15,.26,.20,.34,col.blue,{round:.04,gloss:.30,tag:'台钳'});
  for(const z of [-12.31,-12.02])box(-11.15,1.16,z,.28,.19,.09,col.steelD,
    {hard:true,gloss:.34,tag:'台钳'});
  rodZ(-11.15,.91,-12.47,.52,.035,col.chrome,{tag:'台钳'});
  for(const s of [-1,1])ball(-11.15,.91,-12.47+s*.25,.055,.055,.055,col.steelD,{tag:'台钳'});

  // Open hose tower/rack on the south wall: posts, shelves and genuinely coiled hose rings.
  const hoseTag='水带塔';
  for(const x of [-10.52,-9.68,-8.84,-8.00])for(const z of [-14.35,-13.58])
    box(x,2.24,z,.07,4.35,.07,col.steelD,{hard:true,gloss:.34,tag:hoseTag});
  for(const y of [.35,1.22,2.10,2.98,4.05]) {
    rodX(-9.26,y,-14.35,2.58,.045,col.steel,{tag:hoseTag});
    rodX(-9.26,y,-13.58,2.58,.045,col.steel,{tag:hoseTag});
    for(const x of [-10.52,-9.68,-8.84,-8.00])rodZ(x,y,-13.96,.77,.032,col.steel,{tag:hoseTag});
  }
  for(let i=0;i<8;i++) {
    const x=-10.22+(i%3)*.88,y=.78+Math.floor(i/3)*.90;
    torusXY(x,y,-13.48,.28,.055,i%2?col.yellow:col.tan,hoseTag);
    torusXY(x,y,-13.47,.18,.043,col.tan,hoseTag);
  }
  solid(-10.62,-7.90,-14.48,-13.48);
  signZ(-9.25,4.55,-14.37,'水带塔',col.red,hoseTag,.17,0);
  thing('工作台',-11.25,1.10,-11.18,'工作台上摆着检修工具。','Maintenance tools are laid out on the bench.',
    '工作台 is a workbench; 工具 are tools.',{tag:'车间工作台',focus:[-10.55,-11.18],reach:1.7});
  thing('水带',-9.25,1.60,-13.62,'水带已经清洗、晾干并卷好。','The hoses are washed, dried, and rolled.',
    '水带 is a fire hose.',{tag:hoseTag,focus:[-9.25,-12.95],reach:1.7});
  extinguisher(-7.38,-8.05,-Math.PI/2,'车间灭火器');

  function scbaCylinder(x,z,tag,color=col.black) {
    capsule(x,.83,z,.16,1.18,.16,color,{gloss:.30,tag});
    cyl(x,1.45,z,.075,.13,col.chrome,{gloss:.52,tag});
    taper(x,1.57,z,.12,.14,.12,col.steelD,{gloss:.42,tag});
    ball(x+.09,1.64,z,.045,.045,.030,col.white,{gloss:.46,tag});
    capsule(x-.14,1.12,z,.026,.65,.026,col.yellowD,{rz:.18,tag});
  }
  function faucet(x,y,z,yaw,tag) {
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    capsule(x,y,z,.025,.35,.025,col.chrome,{gloss:.62,tag});
    capsule(x+nx*.10,y+.15,z+nz*.10,.025,.23,.025,col.chrome,
      {rx:Math.PI/2,ry:yaw,gloss:.62,tag});
    ball(x+nx*.21,y+.15,z+nz*.21,.035,.035,.035,col.chrome,{gloss:.65,tag});
    for(const s of [-1,1]) {
      cyl(x+s*.16,y-.04,z,.045,.06,s<0?col.blue:col.red,
        {gloss:.42,tag});
      rodX(x+s*.16,y+.015,z,.18,.016,col.chrome,{tag});
    }
  }

  // SCBA bottle rack.  Every cylinder is separate and retained by paired open rails and straps.
  const scbaTag='空气呼吸器';
  for(const z of [-6.75,-3.95])for(const x of [-12.18,-11.08])
    box(x,1.18,z,.07,2.15,.07,col.steelD,{hard:true,tag:scbaTag});
  for(const y of [.34,1.04,1.76])for(const x of [-12.18,-11.08])
    barZ(x,y,-5.35,2.80,.035,col.steel,{tag:scbaTag});
  for(let i=0;i<8;i++)scbaCylinder(-11.62,-6.52+i*.39,scbaTag,i%2?col.black:col.yellowD);
  for(let z=-6.48;z<-3.95;z+=.39)
    box(-11.32,1.06,z,.055,.14,.25,col.redD,{round:.025,mode:7,tag:scbaTag});
  solid(-12.28,-10.98,-6.88,-3.82);
  signX(-12.30,2.75,-5.35,'空气呼吸器',col.navy,scbaTag,.14,-Math.PI/2);

  // Decontamination sink: an open steel frame supports a rimmed basin; the drainboard, spray
  // wand, valves and waste trap all read at human scale.
  const sinkTag='清洗消毒水槽';
  for(const sx of [-1,1])for(const sz of [-1,1])
    box(-8.05+sx*.62,.48,-1.72+sz*.30,.065,.90,.065,col.steelD,
      {hard:true,tag:sinkTag});
  for(const [x,z,w,d] of [[-8.05,-1.72,1.48,.72],[-8.05,-1.72,1.20,.50]])
    box(x,.94,z,w,.09,d,col.chrome,{round:.035,gloss:.52,tag:sinkTag});
  box(-8.05,.88,-1.72,.90,.25,.44,col.glassD,
    {round:.07,hard:true,mode:1,alpha:.22,gloss:.75,tag:sinkTag});
  faucet(-8.05,1.23,-1.48,Math.PI,sinkTag);
  capsule(-8.55,.55,-1.72,.055,.60,.055,col.steelD,{tag:sinkTag});
  cyl(-8.55,.25,-1.72,.09,.12,col.steelD,{tag:sinkTag});
  solid(-8.83,-7.27,-2.12,-1.32);

  // Emergency shower/eyewash in the north-west corner, with open splash screen and floor drain.
  const showerTag='紧急冲淋洗眼器';
  capsule(-11.86,1.70,-1.64,.035,3.10,.035,col.chrome,{tag:showerTag});
  rodX(-11.45,3.19,-1.64,.82,.035,col.chrome,{tag:showerTag});
  cyl(-11.04,3.05,-1.64,.24,.08,col.chrome,{gloss:.52,tag:showerTag});
  for(let a=0;a<Math.PI*2;a+=Math.PI/6)
    capsule(-11.04+Math.cos(a)*.14,2.95,-1.64+Math.sin(a)*.14,.008,.18,.008,col.water,
      {rx:.10,ry:a,alpha:.42,mode:1,tag:showerTag});
  box(-11.83,1.48,-1.82,.04,2.75,1.28,col.glass,
    {hard:true,mode:1,alpha:.16,gloss:.90,tag:showerTag});
  for(const z of [-2.45,-1.19])box(-11.80,1.48,z,.09,2.80,.08,col.steelD,
    {hard:true,gloss:.36,tag:showerTag});
  box(-11.02,.025,-1.78,1.15,.035,1.00,col.drain,{hard:true,tag:showerTag});
  for(let x=-11.45;x<-10.55;x+=.14)flat(x,.048,-1.78,.055,.82,col.steelL,
    {gloss:.46,tag:showerTag});
  solid(-12.25,-11.67,-2.48,-1.18);
  thing('空气呼吸器',-11.50,1.35,-5.32,'架上是检查过压力的空气呼吸器。',
    'The rack holds pressure-checked breathing apparatus.',
    '空气呼吸器 is self-contained breathing apparatus.',
    {tag:scbaTag,focus:[-10.55,-5.3],reach:1.8});
  thing('清洗消毒',-8.05,1.05,-1.75,'水槽用于返回后的器材清洗和消毒。',
    'The sink is used to wash and decontaminate equipment after a call.',
    '清洗 means wash; 消毒 means disinfect.',{tag:sinkTag,focus:[-8.05,-2.55],reach:1.7});

  function turnoutSet(x,z,index,tag) {
    const coat=index%2?col.turnout:col.tan;
    // Jacket hangs from a real hanger; tapered body and angled sleeves keep the shoulders shaped.
    barZ(x,2.82,z,.55,.022,col.chrome,{tag});
    barXY(x-.02,2.78,x+.26,2.62,z-.25,.022,col.chrome,{tag});
    barXY(x-.02,2.78,x+.26,2.62,z+.25,.022,col.chrome,{tag});
    taper(x+.10,2.15,z,.38,1.05,.62,coat,{gloss:.10,mode:7,tag});
    for(const s of [-1,1])capsule(x+.11,2.16,z+s*.39,.105,.88,.105,coat,
      {rx:s*.27,tag});
    box(x+.31,2.12,z,.035,.10,.58,col.stripe,{hard:true,mode:7,tag});
    // Keep adjacent cuff bands visibly separate; at ±.43 m they coincided exactly between racks.
    for(const s of [-1,1])box(x+.12,2.05,z+s*.37,.20,.085,.12,col.stripe,
      {hard:true,mode:7,tag});
    // Helmet: flattened crown, protective brim, crest and chin strap.
    ball(x+.02,3.36,z,.25,.18,.32,index%2?col.yellow:col.redL,{gloss:.32,tag});
    box(x+.05,3.23,z,.52,.06,.72,index%2?col.yellowD:col.redD,
      {round:.06,hard:true,gloss:.30,tag});
    box(x+.28,3.39,z,.06,.22,.10,col.white,{hard:true,mode:1,tag});
    capsule(x-.02,3.17,z,.025,.64,.025,col.black,{rx:Math.PI/2,tag});
    // Paired trousers and shaped boots under the coat.
    for(const s of [-1,1]) {
      capsule(x,.98,z+s*.17,.13,.84,.13,col.turnout,{tag});
      box(x+.12,.51,z+s*.17,.45,.36,.28,col.black,{round:.08,mode:6,tag});
      box(x+.25,.32,z+s*.17,.42,.12,.31,col.rubber,{round:.06,mode:6,tag});
    }
  }

  // Turnout rack runs along the west wall and leaves 4.0 m clear to the east service door.
  const gearTag='个人防护装备';
  for(const z of [-.82,4.48])for(const x of [-12.10,-11.02])
    box(x,2.05,z,.07,4.0,.07,col.steelD,{hard:true,tag:gearTag});
  for(const y of [.30,2.84,3.75])for(const x of [-12.10,-11.02])
    rodZ(x,y,1.83,5.30,.040,col.steel,{tag:gearTag});
  for(let i=0;i<6;i++)turnoutSet(-11.45,-.40+i*.86,i,gearTag);
  box(-11.56,.20,1.83,1.20,.10,5.15,col.steelD,{hard:true,tag:gearTag});
  solid(-12.28,-10.92,-.86,4.52);
  // Open changing bench and cubby shelf occupy the north wall, away from the door at z=1.8.
  // The surrounding turnout cubby already owns this exact footprint collider.
  openBench(-8.72,4.32,2.52,.56,'装备室长凳',false);
  box(-8.72,2.10,4.76,2.70,2.30,.18,col.woodD,{hard:true,mode:6,tag:'装备室储物格'});
  for(const x of [-9.58,-8.72,-7.86])for(const y of [1.38,2.10,2.82])
    box(x,y,4.61,.74,.58,.20,col.wood,{round:.035,mode:6,tag:'装备室储物格'});
  for(const x of [-9.58,-8.72,-7.86])for(const y of [1.38,2.10,2.82])
    capsule(x,y,4.48,.018,.30,.018,col.chrome,{rx:Math.PI/2,tag:'装备室储物格'});
  solid(-10.10,-7.34,4.02,4.89);
  thing('防护服',-11.38,2.05,1.75,'防护服、靴子和头盔按号码挂好。',
    'Turnout coats, boots, and helmets are hung by number.',
    '防护服 is protective clothing; 头盔 is a helmet.',
    {tag:gearTag,focus:[-10.45,1.75],reach:1.8});

  // ---------------------------------------------------------------- crew/admin furniture
  function chair(x,z,yaw=0,tag='椅子',color=col.fabric) {
    const authored=model('plastic_monobloc_chair',x,0,z,.95,
      {ry:yaw,color,tag,gloss:.10});
    if(authored) {
      shade(x,z,.72,.74,.13);
      return authored;
    }
    const f=[Math.sin(yaw),Math.cos(yaw)],r=[Math.cos(yaw),-Math.sin(yaw)];
    ball(x,.47,z,.34,.095,.30,color,{mode:7,gloss:.04,ry:yaw,tag});
    ball(x-f[0]*.27,.80,z-f[1]*.27,.34,.28,.095,color,
      {mode:7,gloss:.04,ry:yaw,tag});
    for(const a of [-1,1])
      taper(x+r[0]*a*.25,.23,z+r[1]*a*.25,.040,.42,.030,col.steelD,{gloss:.26,tag});
    shade(x,z,.76,.74,.16);
  }
  function openTable(x,z,w,d,tag,color=col.wood) {
    box(x,.78,z,w,.12,d,color,{round:.055,mode:6,gloss:.25,tag});
    for(const sx of [-1,1])for(const sz of [-1,1])
      taper(x+sx*(w/2-.17),.38,z+sz*(d/2-.13),.075,.70,.055,col.steelD,
        {gloss:.32,tag});
    rodX(x,.18,z,w-.25,.035,col.steelD,{tag});
    solid(x-w/2,x+w/2,z-d/2,z+d/2);
    shade(x,z,w+.24,d+.24,.18);
  }
  function cabinetModule(x,z,yaw=0,tag='柜子',color=col.wood,w=.78,h=.88,d=.54,y=.44) {
    const swap=Math.abs(Math.sin(yaw))>.5;
    box(x,y,z,swap?d:w,h,swap?w:d,color,{round:.035,mode:6,gloss:.22,ry:yaw,tag});
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x+nx*(d/2+.018),y,z+nz*(d/2+.018),swap?.025:w-.10,h-.10,
      swap?w-.10:.025,col.woodL,{hard:true,mode:6,ry:yaw,gloss:.24,tag});
    box(x+nx*(d/2+.045),y,z+nz*(d/2+.045),swap?.035:.055,.25,
      swap?.055:.035,col.steelD,{hard:true,ry:yaw,tag});
  }
  function monitor(x,y,z,yaw,text,tag) {
    const alongX=Math.abs(Math.sin(yaw))<.5,nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,y,z,alongX?.92:.055,.58,alongX?.055:.92,col.black,
      {round:.035,hard:true,ry:yaw,gloss:.30,tag});
    const p=box(x+nx*.035,y,z+nz*.035,alongX?.82:.025,.48,alongX?.025:.82,col.screen,
      {hard:true,mode:1,glow:.075,ry:yaw,tag});
    liveScreen(p,(x+z)*.44);
    if(text)glyphs(x+nx*.052,y,z+nz*.052,yaw,text,
      {size:.105,gap:.025,color:col.screenOn,mode:1,glow:.05,lift:.010,tag});
    capsule(x,y-.43,z,.035,.30,.035,col.steelD,{tag});
    box(x,y-.59,z,alongX?.42:.20,.055,alongX?.20:.42,col.steelD,
      {round:.035,gloss:.36,ry:yaw,tag});
  }
  function openSofa(x,z,w,yaw,tag,color=col.fabricD) {
    const swap=Math.abs(Math.sin(yaw))>.5;
    box(x,.43,z,swap?.78:w,.25,swap?w:.78,color,
      {round:.14,mode:7,gloss:.035,ry:yaw,tag});
    const nx=-Math.sin(yaw),nz=-Math.cos(yaw);
    box(x+nx*.34,.76,z+nz*.34,swap?.20:w,.70,swap?w:.20,color,
      {round:.13,mode:7,gloss:.035,ry:yaw,tag});
    const r=[Math.cos(yaw),-Math.sin(yaw)];
    for(const s of [-1,1])box(x+r[0]*s*(w/2-.09),.58,z+r[1]*s*(w/2-.09),
      swap?.72:.18,.42,swap?.18:.72,color,{round:.09,mode:7,ry:yaw,tag});
    for(const s of [-1,1])box(x+r[0]*s*w*.23,.50,z+r[1]*s*w*.23,
      swap?.61:w*.43,.15,swap?w*.43:.61,col.fabric,{round:.10,mode:7,ry:yaw,tag});
    solid(x-(swap?.48:w/2),x+(swap?.48:w/2),z-(swap?w/2:.48),z+(swap?w/2:.48));
    shade(x,z,swap?1.10:w+.18,swap?w+.18:1.10,.22);
  }

  // Kitchen casework is a run of small working modules with a continuous worktop, sink, cooker,
  // hood and under-cabinet light—not a single monolithic kitchen block.
  const kitchenTag='厨房';
  for(let x=-11.82;x<=-7.42;x+=.88)cabinetModule(x,14.42,0,kitchenTag,col.woodD,.80,.84,.62,.43);
  box(-9.62,.91,14.37,5.02,.10,.70,col.floorL,
    {round:.035,hard:true,gloss:.25,tag:kitchenTag});
  for(const x of [-11.55,-10.65,-9.75])
    cabinetModule(x,14.60,0,'厨房吊柜',col.woodL,.78,.70,.37,2.15);
  // Stainless sink and tap.
  box(-10.72,.96,14.30,1.08,.08,.50,col.chrome,
    {round:.045,hard:true,gloss:.52,tag:'厨房水槽'});
  box(-10.72,.93,14.28,.77,.17,.34,col.glassD,
    {round:.06,hard:true,mode:1,alpha:.20,gloss:.75,tag:'厨房水槽'});
  faucet(-10.72,1.22,14.50,0,'厨房水槽');
  // Hob rings, controls and vent hood.
  for(const x of [-9.25,-8.82])for(const z of [14.20,14.48])
    torusXZ(x,.975,z,.15,.026,col.black,'厨房炉灶');
  for(let x=-9.40;x<-8.65;x+=.24)cyl(x,1.03,14.68,.035,.035,col.redL,
    {gloss:.35,tag:'厨房炉灶'});
  taper(-9.02,2.12,14.58,1.28,.72,.48,col.steelL,{gloss:.32,tag:'厨房排烟罩'});
  box(-9.02,2.52,14.65,.80,.30,.30,col.steelD,{hard:true,tag:'厨房排烟罩'});
  // Detailed refrigerator, clear of the room's south doorway.
  box(-11.88,1.23,12.95,.62,2.30,1.02,col.steelL,
    {round:.09,hard:true,gloss:.42,tag:'冰箱'});
  box(-11.54,1.56,12.95,.035,1.52,.90,col.chrome,
    {hard:true,mode:1,alpha:.22,gloss:.64,tag:'冰箱'});
  box(-11.52,.72,12.95,.04,.055,.78,col.steelD,{hard:true,tag:'冰箱'});
  capsule(-11.50,1.55,12.62,.026,.62,.026,col.steelD,{tag:'冰箱'});
  solid(-12.24,-11.48,12.38,13.52);
  solid(-12.20,-7.06,14.03,14.78);

  // Shared dining table is offset east of the door; its west side retains a 2.8 m clear route.
  openTable(-7.62,10.46,2.20,1.02,'厨房餐桌',col.woodL);
  for(const x of [-8.35,-7.62,-6.89]) {
    chair(x,9.62,0,'厨房餐椅',col.fabric);
    chair(x,11.30,Math.PI,'厨房餐椅',col.fabric);
  }
  // Dayroom sofa and screen live in the north-east corner, away from the kitchen work triangle.
  openSofa(-5.87,12.72,2.10,-Math.PI/2,'休息室沙发',col.fabricD);
  box(-8.20,1.62,12.72,.07,1.12,1.85,col.black,{round:.045,hard:true,tag:'休息室电视'});
  const tv=box(-8.15,1.62,12.72,.025,1.00,1.72,col.screen,
    {hard:true,mode:1,glow:.035,tag:'休息室电视'});
  liveScreen(tv,.9);
  box(-8.22,.68,12.72,.46,.10,1.24,col.woodD,{round:.04,mode:6,tag:'休息室电视柜'});
  for(const z of [12.24,13.20])box(-8.22,.35,z,.35,.64,.08,col.steelD,
    {hard:true,tag:'休息室电视柜'});
  solid(-8.48,-8.02,12.02,13.42);
  thing('厨房',-10.70,1.18,14.0,'这里可以为值班班组准备饭菜。',
    'The duty crew can prepare meals here.','厨房 means kitchen.',
    {tag:kitchenTag,focus:[-10.70,13.45],reach:1.8});

  // Briefing/training room.  A compact six-seat table leaves a 1.55 m west route between the
  // corridor door and the new dormitory door; the response board closes the shorter room.
  openTable(-1.25,9.65,2.75,.80,'培训桌',col.wood);
  for(const x of [-2.15,-1.25,-.35]) {
    chair(x,8.93,0,'培训椅',col.fabric);
    chair(x,10.37,Math.PI,'培训椅',col.fabric);
  }
  // Whiteboard/map assembly fixed to the south face of the briefing/dorm partition.
  const mapTag='出勤地图';
  box(-1.45,2.10,11.69,3.75,1.78,.08,col.steelD,{hard:true,gloss:.30,tag:mapTag});
  box(-1.45,2.10,11.64,3.58,1.62,.035,col.paper,{hard:true,mode:1,gloss:.14,tag:mapTag});
  // Street grid and response routes are raised lines, with station/call markers.
  for(let x=-2.95;x<.15;x+=.62)box(x,2.10,11.61,.025,1.30,.025,col.wallD,
    {hard:true,tag:mapTag});
  for(let y=1.58;y<2.68;y+=.36)box(-1.45,y,11.61,3.10,.025,.025,col.wallD,
    {hard:true,tag:mapTag});
  barXY(-2.82,1.62,-.18,2.58,11.59,.028,col.red,{tag:mapTag});
  barXY(-2.55,2.55,-.42,1.64,11.58,.025,col.blue,{tag:mapTag});
  for(const [x,y,c] of [[-2.55,1.72,col.red],[-.45,2.46,col.yellow],[-1.45,2.12,col.green]])
    ball(x,y,11.56,.075,.075,.035,c,{mode:1,glow:.04,tag:mapTag});
  glyphs(-1.45,2.91,11.58,Math.PI,'出勤地图',
    {size:.17,gap:.05,color:col.navy,mode:1,lift:.012,tag:mapTag});
  thing('地图',-1.45,2.10,11.54,'地图标出消防站的出勤路线。',
    'The map marks the station response routes.','出勤 is a service turnout or response.',
    {tag:mapTag,focus:[-1.45,10.55],reach:1.8});

  // Four real bunks occupy the north wall of the dormitory.  Open rails, guard bars and end
  // ladders retain depth and leave a continuous 1.45 m aisle in front of every berth.
  function bunkUnit(x,z,tag) {
    const w=2.05,d=.82,frameTag=`${tag}-床架`;
    for(const sx of [-1,1])for(const sz of [-1,1])
      barY(x+sx*w/2,1.12,z+sz*d/2,2.18,.035,col.steelD,{tag:frameTag});
    for(const y of [.42,1.38]) {
      for(const sz of [-1,1])barX(x,y,z+sz*d/2,w,.035,col.steelD,{tag:frameTag});
      for(const sx of [-1,1])barZ(x+sx*w/2,y,z,d,.035,col.steelD,{tag:frameTag});
      box(x,y+.10,z,w-.12,.16,d-.10,col.fabric,{round:.08,mode:7,gloss:.025,tag});
      box(x-w*.34,y+.22,z,.45,.14,d-.16,col.paper,{round:.09,mode:7,gloss:.02,tag});
    }
    barX(x,1.71,z-d/2,w-.18,.030,col.steel,{tag:frameTag});
    for(const sz of [-.19,.19])barY(x+w/2+.08,1.02,z+sz,1.55,.025,col.steelD,
      {tag:frameTag});
    for(const y of [.45,.82,1.19,1.56])barZ(x+w/2+.08,y,z,.38,.023,col.steel,
      {tag:frameTag});
    solid(x-w/2-.05,x+w/2+.16,z-d/2-.05,z+d/2+.05);
    shade(x,z,w+.20,d+0.16,.18);
  }
  bunkUnit(-3.70,13.82,'宿舍床铺一');
  bunkUnit(-1.12,13.82,'宿舍床铺二');
  signZ(-3.45,2.73,11.67,'宿舍',col.navy,'宿舍门牌',.16,Math.PI);

  // Compact chief office: the desk is north of its swing and the east-side public aisle remains
  // 1.35 m clear between the office return and waiting chairs.
  openTable(7.05,13.08,1.52,.68,'站长办公桌',col.woodD);
  chair(7.05,14.02,Math.PI,'站长办公椅',col.navy);
  cabinetModule(6.48,14.56,0,'站长文件柜',col.woodD,.62,.76,.34,.40);
  box(7.52,2.38,14.71,1.56,.72,.035,col.navy,{hard:true,mode:6,tag:'站长值勤板'});
  glyphs(7.52,2.39,14.68,Math.PI,'站长办公室',
    {size:.135,gap:.035,color:col.white,mode:1,lift:.010,tag:'站长值勤板'});
  signZ(7.25,2.73,11.67,'站长办公室',col.redD,'站长门牌',.14,Math.PI);

  // Watch/dispatch office faces the apparatus floor through full-height framed glazing.
  const dispatchTag='调度值班台';
  openTable(3.53,6.27,3.16,.78,dispatchTag,col.woodD);
  // Radios and three independent live displays sit on articulated stems.
  for(const [x,text] of [[2.55,'待命'],[3.53,'车辆检查'],[4.51,'出勤状态']])
    monitor(x,1.57,5.96,0,text,dispatchTag);
  for(const x of [2.46,3.05,3.63,4.22]) {
    box(x,.97,6.28,.43,.14,.35,col.black,{round:.045,hard:true,tag:'调度无线电'});
    capsule(x,.99,6.08,.018,.19,.018,col.chrome,{rz:-.45,tag:'调度无线电'});
    for(let i=0;i<3;i++)cyl(x-.10+i*.10,1.07,6.18,.018,.025,i===2?col.redL:col.green,
      {gloss:.40,tag:'调度无线电'});
  }
  chair(3.52,7.24,Math.PI,'值班椅',col.navy);
  // Printer, duty log and station clock on the north service credenza.
  for(const x of [1.48,2.32,5.20])cabinetModule(x,9.68,Math.PI,'值班室柜',col.woodD,.70,.78,.52,.39);
  box(1.48,.94,9.62,.62,.35,.42,col.steelL,{round:.04,hard:true,tag:'打印机'});
  box(1.48,1.12,9.45,.46,.035,.42,col.paper,{hard:true,tag:'打印机'});
  box(2.35,.91,9.60,.70,.045,.40,col.paper,{hard:true,ry:.04,tag:'值班记录'});
  for(let y=.84;y<.98;y+=.045)box(2.35,y,9.58,.66,.012,.37,col.paper,{hard:true,tag:'值班记录'});
  // The authored clock faces its local -z into the room; the station preload guarantees it.
  model('wall_clock',5.16,2.46,9.82,1.65,
    {anchor:'mid',tag:'值班时钟',gloss:.30});
  thing('调度值班室',3.53,1.30,6.12,'值班台显示车辆、无线电和出勤状态。',
    'The watch desk shows vehicle, radio, and response status.',
    '值班 means to be on duty; 调度 means dispatch.',
    {tag:dispatchTag,focus:[3.53,7.55],reach:2.2});

  // ---------------------------------------------------------------- lockers, showers and WC
  function locker(x,z,yaw,index,tag) {
    const swap=Math.abs(Math.sin(yaw))>.5,nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,1.19,z,swap?.52:.70,2.18,swap?.70:.52,col.navy,
      {round:.035,hard:true,mode:6,ry:yaw,tag});
    box(x+nx*.275,1.22,z+nz*.275,swap?.025:.59,2.03,swap?.59:.025,col.blue,
      {hard:true,mode:6,ry:yaw,tag});
    for(const y of [1.76,1.84,1.92])box(x+nx*.298,y,z+nz*.298,
      swap?.028:.30,.022,swap?.30:.028,col.steelD,{hard:true,ry:yaw,tag});
    box(x+nx*.315,1.16,z+nz*.315,swap?.03:.055,.34,swap?.055:.03,col.chrome,
      {hard:true,ry:yaw,gloss:.54,tag});
    glyphs(x+nx*.338,2.08,z+nz*.338,yaw,String(index),
      {size:.10,gap:.01,color:col.white,mode:1,lift:.008,tag});
  }
  const lockerTag='更衣室储物柜';
  for(let z=10.48,i=1;z<=11.62;z+=.57,i++)locker(1.19,z,-Math.PI/2,i,lockerTag);
  solid(.86,1.55,10.18,11.92);
  openBench(3.50,11.72,1.00,.32,'更衣室长凳');
  // Paired showers: glass returns, overhead pipes, heads, mixer and slotted floor drains.
  for(const [x,i] of [[1.48,1],[2.88,2]]) {
    const tag=`淋浴-${i}`;
    for(const sx of [-.60,.60])box(x+sx,1.20,13.86,.045,2.28,1.55,col.glass,
      {hard:true,mode:1,alpha:.15,gloss:.90,tag});
    rodZ(x,2.52,14.57,.46,.028,col.chrome,{tag});
    capsule(x,2.12,14.72,.028,.82,.028,col.chrome,{tag});
    cyl(x,2.55,14.22,.18,.06,col.chrome,{rx:Math.PI/2,gloss:.52,tag});
    for(let a=0;a<Math.PI*2;a+=Math.PI/7)
      capsule(x+Math.cos(a)*.10,2.44,14.18+Math.sin(a)*.10,.007,.13,.007,col.water,
        {alpha:.34,mode:1,tag});
    for(const sx of [-.13,.13])cyl(x+sx,1.36,14.69,.05,.055,sx<0?col.blue:col.red,
      {rx:Math.PI/2,gloss:.45,tag});
    box(x,.030,13.55,1.05,.035,.16,col.drain,{hard:true,tag});
    for(let xx=x-.43;xx<x+.45;xx+=.12)flat(xx,.052,13.55,.045,.12,col.steelL,
      {gloss:.46,tag});
    solid(x-.64,x+.64,13.18,14.82);
  }
  // WC fixture is rounded and plumbed; the open vanity leaves the entry swing clear.
  const wcTag='卫生间';
  box(5.28,.45,14.18,.63,.62,.78,col.white,{round:.18,hard:true,gloss:.22,tag:wcTag});
  ball(5.28,.78,14.38,.36,.26,.34,col.white,{gloss:.24,tag:wcTag});
  ball(5.28,.80,14.34,.24,.12,.22,col.glassD,{mode:1,alpha:.18,gloss:.72,tag:wcTag});
  box(5.28,1.10,14.63,.64,.57,.20,col.white,{round:.07,hard:true,gloss:.24,tag:wcTag});
  cyl(5.50,1.20,14.50,.035,.05,col.chrome,{gloss:.55,tag:wcTag});
  solid(4.90,5.66,13.74,14.75);
  // Small wall basin with exposed frame and mirror.
  for(const s of [-1,1])box(4.06+s*.28,.46,12.66,.05,.78,.05,col.steelD,{hard:true,tag:wcTag});
  box(4.06,.90,12.66,.72,.12,.46,col.white,{round:.10,hard:true,gloss:.24,tag:wcTag});
  ball(4.06,.91,12.64,.25,.08,.16,col.glassD,{mode:1,alpha:.18,gloss:.72,tag:wcTag});
  faucet(4.06,1.15,12.82,0,wcTag);
  box(4.06,1.86,12.88,.82,1.05,.035,col.glass,
    {hard:true,mode:1,alpha:.40,gloss:.94,tag:'卫生间镜子'});
  solid(3.66,4.46,12.40,12.96);

  signZ(2.15,2.72,11.84,'淋浴间',col.blue,'淋浴门牌',.15,Math.PI);
  signZ(4.85,2.72,11.84,'卫生间',col.navy,'卫生间门牌',.15,Math.PI);

  // ---------------------------------------------------------------- public lobby and reception
  const receptionTag='接待台';
  // Slender open-frame desk along the staff side; the 4.5 m public field east of it remains clear
  // from the street door at (12.5,11) to the hall door at (8.7,5).
  box(7.75,.82,8.25,.72,.11,2.72,col.woodD,
    {round:.055,mode:6,gloss:.25,tag:receptionTag});
  for(const z of [7.03,9.47])for(const x of [7.50,8.00])
    taper(x,.40,z,.065,.74,.055,col.steelD,{gloss:.34,tag:receptionTag});
  rodZ(7.50,.24,8.25,2.42,.035,col.steelD,{tag:receptionTag});
  // An open rib screen provides modesty without reading as another solid slab from the lobby.
  for(const y of [.91,1.35])rodZ(7.93,y,8.25,2.44,.025,col.frame,{tag:receptionTag});
  for(let z=7.16;z<9.40;z+=.45)
    capsule(7.94,1.13,z,.027,.42,.027,col.doorPanel,{gloss:.20,tag:receptionTag});
  // The transaction shelf now bears directly on the upper rail; its monitor clears the shelf
  // rather than being visually bisected by a floating tan strip.
  box(8.02,1.40,8.25,.28,.07,2.68,col.woodL,
    {round:.035,hard:true,mode:6,gloss:.24,tag:receptionTag});
  solid(7.35,8.18,6.86,9.64);
  monitor(8.22,1.78,7.72,Math.PI/2,'访客登记',receptionTag);
  box(8.23,.94,8.82,.44,.08,.62,col.paper,
    {hard:true,ry:.04,tag:'访客登记簿'});
  for(let z=8.60;z<9.05;z+=.10)box(8.26,.995,z,.34,.010,.018,col.navy,
    {hard:true,tag:'访客登记簿'});
  capsule(8.32,1.04,9.02,.018,.40,.018,col.blue,{rx:Math.PI/2,rz:.20,tag:'访客登记笔'});
  chair(6.55,8.25,-Math.PI/2,'接待椅',col.navy);

  // Five moulded chairs form a vertical row against the east wall, clear of the chief-office
  // return and the public-door approach.  A single light rail keeps their backs aligned.
  const lobbyBench='大厅等候椅';
  // 0.63 m centres exceed the authored chair's 0.6098 m rotated width, leaving a real gap.
  rodZ(11.98,.20,13.28,2.75,.040,col.steelD,{tag:lobbyBench});
  for(const z of [12.02,12.65,13.28,13.91,14.54])
    chair(11.58,z,-Math.PI/2,lobbyBench,col.fabric);

  // Station identity, response status and a small historic helmet display animate the public
  // room without narrowing the route.
  signX(12.30,3.34,6.25,'北京市柳荫消防救援站',col.red,'大厅前窗一',.19,-Math.PI/2);
  // Use the host wall's cutaway tag: the status assembly cannot remain floating after that wall
  // drops out of the camera view.
  const statusTag='大厅西隔墙-1';
  box(6.22,2.12,9.06,.055,1.46,2.42,col.black,
    {hard:true,gloss:.24,tag:statusTag});
  const status=box(6.27,2.12,9.06,.025,1.34,2.30,col.screen,
    {hard:true,mode:1,glow:.075,tag:statusTag});
  liveScreen(status,2.4);
  glyphs(6.29,2.45,9.06,Math.PI/2,'出勤状态',
    {size:.15,gap:.04,color:col.screenOn,mode:1,glow:.05,lift:.012,tag:statusTag});
  glyphs(6.30,1.94,9.06,Math.PI/2,'一待命 二待命',
    {size:.13,gap:.035,color:col.white,mode:1,lift:.012,tag:statusTag});
  const displayTag='纪念头盔';
  // A round museum plinth supports the helmet without any surrounding case or halo.  The helmet
  // has a domed shell, soft elliptical brim, crown ridge and a small warm-metal shield crest.
  cyl(9.88,.48,14.42,.42,.12,col.woodD,{gloss:.27,tag:displayTag});
  taper(9.88,.69,14.42,.15,.32,.12,col.chrome,{gloss:.48,tag:displayTag});
  ball(9.88,.88,14.42,.19,.075,.19,col.steelD,{gloss:.38,tag:displayTag});
  ball(9.88,.98,14.40,.44,.055,.38,col.redD,{gloss:.30,tag:displayTag});
  ball(9.86,1.18,14.42,.34,.27,.34,col.redL,{gloss:.35,tag:displayTag});
  capsule(9.86,1.40,14.42,.032,.38,.032,col.redD,
    {rx:Math.PI/2,gloss:.30,tag:displayTag});
  taper(9.88,1.18,14.075,.095,.15,.024,col.yellowD,
    {gloss:.40,tag:displayTag});
  // Two short rear cradle tips stop below the brim and disappear into the helmet silhouette.
  for(const x of [9.64,10.12])capsule(x,.83,14.58,.024,.18,.024,col.chrome,
    {gloss:.50,tag:displayTag});

  // A framed field of shallow, round-edged wood slats breaks the chief-office return into a
  // human-scale backdrop.  Eight centimetres of projection cannot narrow the 1.35 m aisle.
  for(let z=12.18;z<14.70;z+=.48)
    box(9.23,2.14,z,.08,1.52,.11,col.wood,
      {round:.025,mode:6,gloss:.18,tag:'站长办公室东墙'});
  for(const y of [1.35,2.93])
    box(9.22,y,13.38,.075,.07,2.78,col.woodD,
      {round:.018,mode:6,gloss:.22,tag:'站长办公室东墙'});

  // Four narrow telescoping leaves stack two-deep in the 0.60 m wall pockets.  A conventional
  // 0.72 m leaf overlapped the south lobby window by 14 cm; these frames stop at z=9.65, leaving
  // 5 cm of real separation, and add no solid to the documented 1.60 m threshold.
  const entranceTag='公共入口门';
  for(const [side,centres] of [[-1,[9.91,9.96]],[1,[12.09,12.04]]]) {
    for(let i=0;i<2;i++) {
      const z=centres[i],x=12.37-i*.07;
      box(x,1.27,z,.045,2.42,.44,col.glass,
        {hard:true,mode:1,alpha:.24,gloss:.92,tag:entranceTag});
      for(const s of [-1,1])box(x-.03,1.27,z+s*.235,.085,2.46,.045,col.steelD,
        {hard:true,tag:entranceTag});
    }
    const pocket=(centres[0]+centres[1])/2;
    box(12.34,2.47,pocket,.10,.07,.55,col.steelD,{hard:true,tag:entranceTag});
    box(12.34,.07,pocket,.10,.11,.55,col.steelD,{hard:true,tag:entranceTag});
    capsule(12.27,1.20,centres[0]-side*.18,.022,.46,.022,col.chrome,{tag:entranceTag});
  }
  box(12.33,2.68,11.0,.12,.22,2.18,col.steelD,{round:.04,hard:true,tag:entranceTag});
  for(const z of [10.56,11.44])ball(12.25,2.64,z,.045,.045,.045,col.redHi,
    {mode:1,glow:.08,tag:entranceTag});
  flat(11.18,.018,11.0,2.32,1.62,col.redD,{mode:7,gloss:.055,tag:'公共入口地垫'});
  for(let x=10.22;x<12.20;x+=.18)flat(x,.021,11.0,.08,1.52,col.red,
    {mode:7,gloss:.045,tag:'公共入口地垫'});
  signX(12.30,3.08,11.0,'公共入口',col.red,entranceTag,.18,-Math.PI/2);
  const exitThing=thing('门',12.30,1.42,11.0,'自动门外是消防站前的街道。',
    'The automatic door leads to the street outside the fire station.',
    '门 is a door; 出口 is an exit.',
    {tag:entranceTag,focus:[11.25,11.0],reach:2.3});
  exitThing.exit={place:'street',at:FIRE_STATION_OUT};

  // Alarm call point and audible beacon live on the short clear wall south of the watch-room
  // door.  Their controls face into the lobby; they no longer overlap the status screen as a red
  // blank card.
  const alarmTag='报警器';
  box(6.28,1.50,6.15,.14,.52,.40,col.redD,{round:.035,hard:true,tag:alarmTag});
  box(6.36,1.52,6.15,.035,.29,.25,col.redL,{hard:true,mode:1,glow:.035,tag:alarmTag});
  ball(6.39,1.52,6.15,.035,.10,.10,col.white,{mode:1,glow:.05,tag:alarmTag});
  cyl(6.36,2.10,6.15,.13,.10,col.redHi,{rz:Math.PI/2,mode:1,alpha:.62,glow:.10,tag:alarmTag});
  thing('报警器',6.35,1.55,6.15,'红色按钮连接全站报警系统。',
    'The red call point connects to the station alarm system.',
    '报警器 is an alarm device.',{tag:alarmTag,focus:[7.05,6.15],reach:1.5});
  thing('访客登记',8.23,1.02,8.82,'访客进入消防站前要登记。',
    'Visitors sign in before entering the fire station.','登记 means to register.',
    {tag:'访客登记簿',focus:[8.85,8.82],reach:1.4});

  // ---------------------------------------------------------------- crew-zone ceiling services
  // Narrow acoustic baffles replace the former five giant pale slabs.  Their top edges stop just
  // under the matching partition caps, giving every room one legible ceiling datum while gaps
  // preserve the cutaway and expose the disciplined service plenum.
  function ceilingBaffles(x,y,z,w,d,tag,acrossX=true,color=col.acoustic) {
    const span=acrossX?w:d,n=Math.max(4,Math.min(10,Math.round(span/.62)));
    for(let i=0;i<n;i++) {
      const off=-span/2+(i+.5)*span/n;
      box(x+(acrossX?off:0),y,z+(acrossX?0:off),
        acrossX?span/n-.08:w-.18,.065,acrossX?d-.18:span/n-.08,color,
        {hard:true,mode:7,gloss:.055,tag});
    }
    rodX(x,y+.055,z-d/2+.06,w-.10,.025,col.wallCap,{tag});
    rodX(x,y+.055,z+d/2-.06,w-.10,.025,col.wallCap,{tag});
    rodZ(x-w/2+.06,y+.055,z,d-.10,.025,col.wallCap,{tag});
    rodZ(x+w/2-.06,y+.055,z,d-.10,.025,col.wallCap,{tag});
    for(const sx of [-1,1])for(const sz of [-1,1])
      capsule(x+sx*(w/2-.10),y+.14,z+sz*(d/2-.10),.018,.24,.018,col.steelD,{tag});
  }
  const rafts=[
    [-9.0,3.48,10.60,5.35,4.90,'厨房吊顶'],
    [-2.30,3.48,9.55,4.55,3.65,'培训吊顶'],
    [-2.25,3.48,13.25,4.55,2.55,'宿舍吊顶'],
    [3.45,3.46,7.55,4.25,3.90,'值班吊顶'],
    [3.45,3.38,12.15,4.20,3.25,'更衣吊顶'],
    [9.15,3.72,8.25,5.25,6.20,'大厅南吊顶'],
    [10.68,3.72,13.35,2.75,2.75,'大厅北吊顶'],
    [7.55,3.72,13.35,2.55,2.75,'站长吊顶'],
  ];
  for(const q of rafts)ceilingBaffles(...q,true);
  ceilingBaffles(-5.85,3.48,6.20,12.55,1.88,'走廊吊顶',false,col.ceil);
  // Service-room ceilings close directly on their 4.42 m walls beneath the apparatus trusses.
  ceilingBaffles(-9.75,4.34,-11.30,5.25,6.90,'车间吊顶',true,col.ceil);
  ceilingBaffles(-9.75,4.34,-4.40,5.25,5.95,'清洗吊顶',true,col.ceil);
  ceilingBaffles(-9.75,4.34,1.90,5.25,5.80,'装备吊顶',true,col.ceil);
  for(const z of [-12.1,-9.4,-5.55,-2.85,.35,3.35])
    ceilingLight(-9.75,4.16,z,1.55,'x',`服务区灯-${z}`);
  for(const [x,y,z,w,axis,tag] of [
    [-10.3,3.34,9.3,1.55,'x','厨房灯一'],[-7.25,3.34,11.8,1.55,'x','厨房灯二'],
    [-3.55,3.34,9.4,1.55,'x','培训灯一'],[-.85,3.34,9.7,1.35,'x','培训灯二'],
    [-2.25,3.34,13.3,1.55,'x','宿舍灯'],[7.55,3.58,13.4,1.35,'x','站长灯'],
    [2.25,3.32,7.5,1.35,'x','值班灯一'],[4.75,3.32,8.3,1.35,'x','值班灯二'],
    [2.25,3.24,11.0,1.15,'x','更衣灯'],[2.15,3.24,13.6,1.15,'x','淋浴灯'],
    [4.85,3.24,13.6,1.15,'x','卫生间灯'],[9.25,3.58,7.2,2.05,'x','大厅灯一'],
    [9.85,3.58,11.2,1.75,'x','大厅灯二'],[10.75,3.58,13.6,1.35,'x','大厅灯三'],
  ])ceilingLight(x,y,z,w,axis,tag);
  // Corridor linear lights and compact branch duct.
  for(const x of [-10.5,-6.3,-2.1])ceilingLight(x,3.38,6.20,1.55,'x',`走廊灯-${x}`);
  for(let x=-10.8;x<-.2;x+=2.4) {
    cyl(x+1.10,3.82,6.73,.15,2.20,col.steelL,{rz:Math.PI/2,gloss:.28,tag:'走廊送风管'});
    cyl(x,3.82,6.73,.17,.055,col.steelD,{rz:Math.PI/2,tag:'走廊送风管'});
  }
  // Smoke detectors and sprinklers are distributed by occupied room, not randomly.
  for(const [x,z] of [[-9,10.7],[-2.3,9.7],[-2.3,13.2],[3.45,7.6],[3.45,12.5],
    [9.2,8.0],[10.5,13.2],[7.5,13.2],[-6,6.2]]) {
    cyl(x,3.37,z,.11,.035,col.white,{gloss:.25,tag:'烟感'});
    cyl(x,3.32,z,.045,.055,col.redD,{gloss:.34,tag:'室内喷头'});
    cyl(x,3.26,z,.075,.016,col.chrome,{gloss:.52,tag:'室内喷头'});
  }
  egressX(12.30,2.88,11.0,-Math.PI/2,'大厅安全出口内侧');
  egressZ(-5.0,2.78,5.15,0,'走廊安全出口');

  // ---------------------------------------------------------------- scene behaviour and measured rooms
  let nightK=0;
  function setNight(k) {
    nightK=k*k*(3-2*k);
    for(const q of lit)q.p.glow=q.g0+nightK*q.k*.18;
  }
  function tick(t) {
    for(const q of screens)q.p.glow=q.g0+(.5+.5*Math.sin(t*1.35+q.phase))*.035+nightK*.05;
    // Parked apparatus beacons stay dark enough to be believable but their lenses catch a slow
    // status-test pulse after dark.  No moving matrix or collider is involved.
    for(const q of beacons)q.p.glow=.025+nightK*(.10+.10*Math.max(0,Math.sin(t*2.1+q.phase)));
  }

  const zones=[
    // One connected movement envelope spans every real doorway.  Detailed zones below remain the
    // exact room/light records returned by roomAt; the base prevents the radius-.30 body from
    // being clamped back by the intentional 10 cm wall-centre gaps between those records.
    {id:'firestation',label:'消防站',x0:-RX,x1:RX,z0:-RZ,z1:RZ,ceil:H,
      light:[0,5.20,0],circulation:true},
    {id:'fire-hall',label:'车库',...PLAN.rooms.hall,ceil:H,light:[3.2,5.20,-5.0]},
    {id:'fire-workshop',label:'车间',...PLAN.rooms.workshop,ceil:SERVICE_H,light:[-9.7,4.16,-10.8]},
    {id:'fire-decon',label:'清洗消毒',...PLAN.rooms.decon,ceil:SERVICE_H,light:[-9.7,4.16,-4.4]},
    {id:'fire-gear',label:'装备室',...PLAN.rooms.gear,ceil:SERVICE_H,light:[-9.7,4.16,1.8]},
    {id:'fire-corridor',label:'走廊',...PLAN.rooms.corridor,ceil:3.48,light:[-5.8,3.28,6.2]},
    {id:'fire-kitchen',label:'厨房休息室',...PLAN.rooms.kitchen,ceil:3.48,light:[-9.0,3.28,10.7]},
    {id:'fire-briefing',label:'培训会议室',...PLAN.rooms.briefing,ceil:3.48,light:[-2.3,3.28,10.7]},
    {id:'fire-dorm',label:'宿舍',...PLAN.rooms.dorm,ceil:3.48,light:[-2.25,3.28,13.2]},
    {id:'fire-watch',label:'调度值班室',...PLAN.rooms.watch,ceil:3.46,light:[3.45,3.25,7.6]},
    {id:'fire-lockers',label:'更衣淋浴',...PLAN.rooms.lockers,ceil:3.38,light:[3.45,3.18,12.3]},
    {id:'fire-lobby',label:'公共大厅',...PLAN.rooms.lobby,ceil:3.72,light:[9.2,3.48,10.0]},
    {id:'fire-chief',label:'站长办公室',...PLAN.rooms.chief,ceil:3.72,light:[7.55,3.48,13.3]},
  ];
  const zoneById=Object.fromEntries(zones.map(q=>[q.id,q]));
  function roomAt(x,z) {
    // Door thresholds are assigned to the room they lead into, so camera and exposure do not
    // flicker at the jamb.  The order mirrors the actual partitions above.
    if(z<5.0) {
      if(x<-7.0) {
        if(z<-7.6)return zoneById['fire-workshop'];
        if(z<-1.2)return zoneById['fire-decon'];
        return zoneById['fire-gear'];
      }
      return zoneById['fire-hall'];
    }
    if(x>=6.1) {
      if(x<9.1&&z>=11.8)return zoneById['fire-chief'];
      return zoneById['fire-lobby'];
    }
    if(x<=.8&&z<7.4)return zoneById['fire-corridor'];
    if(x<-5.4)return zoneById['fire-kitchen'];
    if(x<=.8) {
      if(z>=11.8)return zoneById['fire-dorm'];
      return zoneById['fire-briefing'];
    }
    if(z<10.1)return zoneById['fire-watch'];
    return zoneById['fire-lockers'];
  }

  return B.finish({
    setNight,tick,OUT:FIRE_STATION_OUT,PLAN,RX,RZ,H,
    WIN:{x:RX-.08,y:1.65,z:11.0,hw:.80,hh:1.25},
    label:'消防站',labelK:'北京市柳荫消防救援站',
    indoor:true,cutaway:true,winOn:false,near:.06,far:76,expose:.94,
    aoRadius:.42,aoAmt:.105,bloom:.32,
    camera:{pitch:.29,dist:5.35,lookY:1.22},
    spawn:{x:10.55,z:11.0,yaw:-Math.PI/2},
    zones,roomAt,
  });
});

// Staff stations sit in actual clear pockets: the watch chair is behind its desk, the apparatus
// firefighter uses the 1.25 m west turnout route, and the crew member stays on the kitchen's wide
// west aisle.  Their patrol points never cross a vehicle, wall, table or doorway.
const FireStationCast=[
  {
    hz:'值班员',name:'赵宁',py:'Zhào Níng',place:'firestation',temper:'alert',
    look:{skin:'#c58a66',hair:'#24201d',hairStyle:'crop',top:'#243a45',pants:'#263238',
      shoe:'#1b2023',uniform:'staff',tall:1.01,faceSeed:11901},
    spots:[{h0:0,h1:24,at:[5.25,7.45],face:-Math.PI/2,act:'hands'}],
    lines:[
      ['值班台二十四小时有人。','The watch desk is staffed twenty-four hours a day.'],
      ['两辆消防车都已经完成检查。','Both fire engines have completed their checks.'],
    ],
  },
  {
    hz:'消防员',name:'陈浩',py:'Chén Hào',place:'firestation',temper:'steady',
    look:{skin:'#b87955',hair:'#1f1b19',hairStyle:'crop',top:'#30454a',pants:'#263337',
      shoe:'#171c1e',uniform:'guard',tall:1.05,faceSeed:11902},
    spots:[
      {h0:0,h1:8,at:[-5.52,-1.90],face:Math.PI,act:'hands'},
      {h0:8,h1:18,at:[-5.48,3.25],face:-Math.PI/2,act:'hands'},
      {h0:18,h1:24,at:[-5.55,-8.08],face:0,act:'hands'},
    ],
    lines:[
      ['通道必须保持畅通。','The turnout route must stay clear.'],
      ['防护服和空气呼吸器每天都要检查。','Turnout gear and breathing apparatus are checked every day.'],
    ],
  },
  {
    hz:'消防员',name:'刘梅',py:'Liú Méi',place:'firestation',temper:'warm',
    look:{skin:'#d3a17a',hair:'#2a211d',hairStyle:'bun',top:'#38525a',pants:'#2a383d',
      shoe:'#202426',uniform:'staff',tall:.97,faceSeed:11903},
    spots:[
      {h0:0,h1:7,at:[-10.35,9.18],face:Math.PI/2,act:'hands'},
      {h0:7,h1:14,at:[-10.42,10.55],face:Math.PI/2,act:'hands'},
      {h0:14,h1:24,at:[-3.90,9.78],face:-Math.PI/2,act:'hands'},
    ],
    lines:[
      ['我们在这里吃饭、培训，也随时准备出勤。','We eat and train here while staying ready to respond.'],
      ['墙上的地图标出了最快的路线。','The wall map marks the quickest routes.'],
    ],
  },
];
