// Campus boundary, arrival court, historic gate, metro mouth, and security pavilion.
CampusFits.register('boundary', 10, kit => {
  const {box,cyl,ball,capsule,flat,glyphs,solid,blocker,shade,light,
    col,G,S,held,GROUND,litten,pane} = kit;

  // Base ground and the arrival/service surfaces owned by this fit.
  flat(GROUND.x,0,GROUND.z,GROUND.w,GROUND.d,held(col.pave,S.pave),
    {mode:9,gloss:.10,...S.pave});
  flat(-1,.006,-.25,42,24.5,held(col.paveL,S.pave),{mode:9,gloss:.14,...S.pave});
  flat(-3,.008,-14.15,6.70,3.10,held(col.paveL,S.path),{mode:9,gloss:.13,...S.path});
  flat(-48.85,.008,20,3.70,5.40,held(col.paveD,S.path),{mode:9,gloss:.12,...S.path});
  flat(48.85,.008,20,3.70,5.40,held(col.paveD,S.path),{mode:9,gloss:.12,...S.path});
  flat(0,.004,65,90,3,held(col.paveD,S.rend),{mode:9,gloss:.08,...S.rend});

  function hWall(id,x0,x1,z,insideSign) {
    const tag=`围墙-${id}`,cx=(x0+x1)/2,w=x1-x0;
    box(cx,1.10,z,w,2.20,.36,held(col.brickD,S.brick),
      {tag,hard:true,mode:11,gloss:G.matte,...S.brick});
    box(cx,2.26,z,w+.10,.12,.46,col.stoneL,{tag,hard:true,mode:13,gloss:.18});
    box(cx,1.10,z+insideSign*.20,w,2,.04,held(col.render,S.rend),
      {tag,hard:true,mode:14,gloss:G.matte,...S.rend});
    solid(x0,x1,z-.18,z+.18); blocker(x0,x1,z-.18,z+.18,2.45);
  }
  function vWall(id,x,z0,z1,insideSign) {
    const tag=`围墙-${id}`,cz=(z0+z1)/2,d=z1-z0;
    box(x,1.10,cz,.36,2.20,d,held(col.brickD,S.brick),
      {tag,hard:true,mode:11,gloss:G.matte,...S.brick});
    box(x,2.26,cz,.46,.12,d+.10,col.stoneL,{tag,hard:true,mode:13,gloss:.18});
    box(x+insideSign*.20,1.10,cz,.04,2,d,held(col.render,S.rend),
      {tag,hard:true,mode:14,gloss:G.matte,...S.rend});
    solid(x-.18,x+.18,z0,z1); blocker(x-.18,x+.18,z0,z1,2.45);
  }
  hWall('SW',-48,-7.75,-13,1); hWall('SE',1.75,48,-13,1);
  vWall('WS',-48,-13,17,1); vWall('WN',-48,23,67,1);
  vWall('ES',48,-13,17,-1); vWall('EN',48,23,67,-1);
  hWall('NW',-48,31,67,-1); hWall('NE',39,48,67,-1);

  // Apron end rails: the visible endpoint of every open gate zone.
  const railCol=held(col.steelD,S.steel);
  box(-3,.55,-15.90,7.4,1.10,.30,railCol,{tag:'主门护栏',hard:true,gloss:G.metal,...S.steel});
  solid(-6.7,.7,-16.05,-15.75);
  box(-50.90,.55,20,.30,1.10,6,railCol,{tag:'西门护栏',hard:true,gloss:G.metal,...S.steel});
  solid(-51.05,-50.75,17,23);
  box(50.90,.55,20,.30,1.10,6,railCol,{tag:'东门护栏',hard:true,gloss:G.metal,...S.steel});
  solid(50.75,51.05,17,23);

  // Main historic gate, copied dimension-for-dimension from the original campus component.
  const GX=-3,GZ=-13,gateStone=held(col.stoneL,S.stone);
  for(const x of [-7.2,1.2]){
    box(x,2.10,GZ,1.10,4.20,1.10,gateStone,
      {tag:'大学',hard:true,gloss:G.matte,...S.stone});
    box(x,4.34,GZ,1.34,.28,1.34,held(col.stoneD,S.stone),
      {tag:'大学',hard:true,gloss:G.matte,...S.stone});
    solid(x-.55,x+.55,GZ-.55,GZ+.55); blocker(x-.55,x+.55,GZ-.55,GZ+.55,4.50);
  }
  const truss=held(col.steelD,S.steel);
  box(GX,4,GZ,8.4,.30,.34,truss,{tag:'大学',hard:true,gloss:G.metal,...S.steel});
  box(GX,4.62,GZ,8.4,.18,.28,truss,{tag:'大学',hard:true,gloss:G.metal,...S.steel});
  for(let i=0;i<9;i++) box(GX-3.8+i*.95,4.31,GZ,.10,.60,.20,truss,
    {tag:'大学',hard:true,gloss:G.metal,...S.steel});
  for(const [z,yaw] of [[GZ+.10,0],[GZ-.10,Math.PI]])
    for(const g of glyphs(GX,5.20,z,yaw,'北京文华大学',
      {size:.48,gap:.20,color:col.redD,mode:1,tag:'大学'})) litten(g,.8);

  // Stone stele.
  box(3.6,1.10,-11.6,2.4,2.2,.44,gateStone,{tag:'大学',hard:true,gloss:G.matte,...S.stone});
  box(3.6,.12,-11.6,2.8,.24,.80,held(col.stoneD,S.stone),
    {tag:'大学',hard:true,gloss:G.matte,...S.stone});
  glyphs(3.6,1.30,-11.83,Math.PI,'文华大学',
    {size:.34,gap:.14,color:col.charcoal,mode:1,tag:'大学',lift:.02});
  solid(2.2,5,-12,-11.2);

  // Paired stone lions, with the exact .68 x .56 blocking plinths.
  for(const [x,face] of [[-6,-1],[0,1]]){
    const z=-12.7,T={tag:'大学'};
    box(x,.21,z,.58,.42,.54,col.stoneD,{hard:true,gloss:.24,...T});
    box(x,.45,z,.50,.07,.46,col.stone,{hard:true,gloss:.26,...T});
    box(x,.68,z+.09*face,.32,.40,.30,col.stone,{gloss:.24,round:.09,...T});
    box(x,.78,z-.09*face,.28,.48,.26,col.stone,{gloss:.24,round:.09,...T});
    ball(x,1.06,z-.12*face,.14,.14,.14,col.stone,{gloss:.26,...T});
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      ball(x+Math.sin(a)*.145,1.05+Math.cos(a)*.138,z-.01*face,.048,.048,.046,
        col.stoneD,{gloss:.22,...T});
    }
    ball(x,1.02,z-.24*face,.072,.062,.062,col.stone,{gloss:.26,...T});
    solid(x-.34,x+.34,z-.28,z+.28);
  }
  kit.thing('大学',-3,5.6,-12.4,'我在北京文华大学上学。','I study at Beijing Wenhua University.',
    '大 big + 学 study. 上学 is to attend school; 大学生 is a university student.',
    {focus:[-3,-10.4],reach:3.0});

  function sideGate(x,label,yaw) {
    for(const z of [17,23]){
      box(x,1.60,z,.80,3.20,.80,gateStone,{tag:label,hard:true,gloss:G.matte,...S.stone});
      box(x,3.27,z,1,.14,1,col.stoneD,{tag:label,hard:true,gloss:.20});
      solid(x-.4,x+.4,z-.4,z+.4); blocker(x-.4,x+.4,z-.4,z+.4,3.40);
    }
    const bx=x<0?-47.88:47.88;
    box(bx,3.45,20,2.2,.46,.12,col.blueSign,{tag:label,hard:true,ry:yaw,gloss:.26});
    glyphs(bx+(x<0?.08:-.08),3.45,20,yaw,label,
      {tag:label,size:.24,gap:.08,color:col.white,mode:1});
  }
  sideGate(-48,'西门',Math.PI/2); sideGate(48,'东门',-Math.PI/2);

  // Closed north service gate.
  for(const x of [33,37]) box(x,1.25,66.78,4,2.5,.12,railCol,
    {tag:'后勤通道',hard:true,gloss:G.metal,...S.steel});
  box(35,3.25,66.76,4.8,.48,.16,col.blueSign,{tag:'后勤通道',hard:true,gloss:.24});
  glyphs(35,3.25,66.66,Math.PI,'后勤通道',
    {tag:'后勤通道',size:.24,gap:.09,color:col.white,mode:1});
  litten(ball(35,3.10,66.70,.11,.11,.11,col.red,{tag:'后勤通道',mode:1,glow:.18}),.8);
  solid(31,39,66.70,67.05); blocker(31,39,66.70,67.05,2.60);

  // Metro mouth at the retained centre, with a safe focus north of its body solid.
  const MX=-11.4,MZ=-11.7;
  flat(MX,.006,MZ+.5,3.6,3.6,held(col.paveL,S.pave),{mode:9,gloss:.12,...S.pave});
  flat(MX,.012,MZ+.70,2.10,1.70,col.black,{gloss:.08});
  for(let i=0;i<6;i++) box(MX,.016,MZ+.06+i*.22-i*i*.012,1.84,.01,.055,
    i<3?col.kerb:col.stoneD,{hard:true,gloss:.14});
  for(const s of [-1,1]){
    box(MX+s*1.14,.48,MZ+.70,.16,.96,1.80,held(col.stone,S.stone),
      {hard:true,gloss:G.matte,...S.stone});
    box(MX+s*1.14,.98,MZ+.70,.22,.07,1.86,col.kerb,{hard:true,gloss:.20});
    box(MX+s*1.20,1.30,MZ+1.64,.13,2.60,.13,col.steelD,{hard:true,gloss:G.metal});
  }
  box(MX,2.62,MZ+1.06,2.86,.12,2,col.renderL,{hard:true,gloss:G.paint});
  litten(box(MX,2.53,MZ+1.06,1.60,.05,.28,C('#fbf3e0'),
    {hard:true,mode:1,glow:.10}),.9);
  box(MX,2.40,MZ+.08,2.86,.34,.10,col.blueSign,{tag:'地铁站',hard:true,gloss:.26});
  for(const [z,yaw] of [[MZ+.02,Math.PI],[MZ+.14,0]])
    for(const g of glyphs(MX+.32,2.40,z,yaw,'地铁站',
      {tag:'地铁站',size:.20,gap:.05,color:col.white,mode:1})) litten(g,.9);
  box(MX-1.96,1.55,MZ-.16,.16,3.10,.16,col.steelD,{hard:true,gloss:G.metal});
  box(MX-1.96,2.60,MZ-.20,.52,1.60,.14,col.blueSign,{hard:true,gloss:.26});
  for(const g of glyphs(MX-1.96,2.58,MZ-.28,Math.PI,'大学城',
    {size:.17,gap:.05,vertical:true,color:col.white,mode:1})) litten(g,.9);
  solid(-13.5,-10.1,-12,-9.9); shade(MX,MZ+.6,3.4,2.6,.28);
  const metro=kit.thing('地铁站',-11.4,2.92,-11.9,'坐地铁回去吧。',"Let's take the subway back.",
    '地铁 subway + 站 stop. 大学城 is University Town.',{focus:[-11.4,-9.15],reach:2.4});
  metro.station='大学城';

  // Security pavilion B08.
  box(9.4,1.60,-9.7,6,3.20,5.4,held(col.render,S.plas),
    {tag:'门卫',hard:true,mode:14,gloss:G.paint,...S.plas});
  box(9.4,.55,-9.7,6.12,1.10,5.52,held(col.brick,S.brick),
    {tag:'门卫',hard:true,mode:11,gloss:G.matte,...S.brick});
  box(9.4,3.30,-9.7,6.3,.20,5.7,col.renderD,{tag:'门卫',hard:true,gloss:G.paint});
  pane(box(6.36,1.72,-9.5,.05,1.30,2.2,col.glassDark,
    {tag:'门卫',hard:true,mode:1,gloss:G.glass}));
  pane(box(9.4,1.72,-12.43,2.4,1.3,.05,col.glassDark,
    {tag:'门卫',hard:true,mode:1,gloss:G.glass}));
  box(9.4,3.58,-12.35,2.2,.42,.14,col.redD,{tag:'门卫',hard:true,gloss:.24});
  glyphs(9.4,3.58,-12.44,Math.PI,'门卫',{tag:'门卫',size:.22,gap:.08,color:col.goldL,mode:1});
  // The north portal remains interaction-driven, but reads as a real 0.95 m staff door. These
  // layered leaf, frame and access-control props add no solid or blocker to the pavilion shell.
  box(11.2,1.14,-6.975,1.13,2.28,.07,col.charcoal,
    {tag:'门卫',hard:true,gloss:.18});
  box(11.2,1.11,-6.925,.95,2.12,.055,col.steelD,
    {tag:'门卫',hard:true,gloss:G.metal});
  pane(box(11.2,1.49,-6.892,.43,.82,.025,col.glassDark,
    {tag:'门卫',hard:true,mode:1,gloss:G.glass}));
  for(const x of [10.675,11.725]) box(x,1.14,-6.88,.10,2.28,.11,col.chrome,
    {tag:'门卫',hard:true,gloss:G.metal});
  box(11.2,2.255,-6.88,1.15,.10,.11,col.chrome,
    {tag:'门卫',hard:true,gloss:G.metal});
  box(11.2,.035,-6.88,1.15,.07,.18,col.steelD,
    {tag:'门卫',hard:true,gloss:G.metal});
  box(11.49,1.04,-6.855,.035,.30,.035,col.chrome,
    {tag:'门卫',hard:true,gloss:G.metal});
  box(11.81,1.22,-6.89,.18,.25,.055,col.blueSign,
    {tag:'门卫',hard:true,mode:1,gloss:.24});
  box(11.2,2.53,-6.93,1.15,.25,.06,col.blueSign,
    {tag:'门卫',hard:true,gloss:.24});
  glyphs(11.2,2.53,-6.97,0,'员工入口',{tag:'门卫',size:.11,gap:.035,color:col.white,mode:1});
  // Desk silhouette, clock, control panel, and two roof cameras.
  box(8.8,.76,-9.4,2.1,.10,.75,col.trunkL,{hard:true,gloss:G.wood});
  cyl(9.5,2.35,-12.36,.25,.04,col.white,{rx:Math.PI/2,mode:1,gloss:.18});
  box(6.32,1.0,-8.0,.10,.58,.38,col.charcoal,{hard:true,gloss:.24});
  for(const [x,z,ry] of [[6.7,-7.3,-Math.PI/2],[12.1,-12.1,Math.PI]]){
    capsule(x,3.65,z,.035,.42,.035,col.steelD,{rz:Math.PI/2,gloss:G.metal});
    box(x,3.72,z,.42,.18,.18,col.charcoal,{hard:true,ry,gloss:.25});
  }
  solid(6.2,12.6,-12.6,-6.8); blocker(6.2,12.6,-12.6,-6.8,3.60);
  const security=kit.thing('门卫',11.2,1.35,-7.02,'访客请在西侧服务窗登记；北门是值班人员入口。',
    'Visitors register at the west service window; the north door is the staff and security entrance.',
    '登记 is to register; 值班人员 are on-duty staff.',{focus:[11.2,-5.8],reach:2.2});
  security.exit={place:'campus_security'};
  // O10 guard stool and thermos.
  box(5.55,.21,-8,.38,.42,.38,col.steelD,{hard:true,gloss:.28});
  cyl(5.70,.60,-7.92,.07,.34,col.chrome,{gloss:G.metal});
  solid(5.36,5.74,-8.19,-7.81);

  // Campus map S01.
  box(15,1.55,-2.5,3.2,1.8,.18,col.blueSign,
    {tag:'校园地图',hard:true,gloss:.25});
  for(const x of [13.65,16.35]) box(x,.65,-2.5,.12,1.30,.12,col.steelD,
    {tag:'校园地图',hard:true,gloss:G.metal});
  glyphs(15,2.16,-2.60,Math.PI,'校园地图',
    {tag:'校园地图',size:.20,gap:.07,color:col.white,mode:1});
  solid(13.3,16.7,-2.75,-2.35);
  kit.thing('校园地图',15,2.55,-2.6,'地图把四个校区入口都标出来了。',
    'The map marks every campus district and entrance.','校园 campus + 地图 map.',
    {focus:[15,-4],reach:2.2});

  // Historic three-panel noticeboard translated to (9,-2.5).
  const NX=9,NZ=-2.5;
  for(const s of [-1,1]) box(NX+s*2.9,.95,NZ,.16,1.90,.28,held(col.steelD,S.steel),
    {tag:'布告板',hard:true,gloss:G.metal,...S.steel});
  for(let i=0;i<3;i++){
    const x=NX-2+i*2;
    box(x,1.50,NZ,1.86,1.42,.14,held(col.steel,S.steel),
      {tag:'布告板',hard:true,gloss:G.metal,...S.steel});
    box(x,1.50,NZ-.08,1.70,1.28,.03,col.cream,{tag:'布告板',hard:true,gloss:.18});
    pane(box(x,1.50,NZ-.12,1.70,1.28,.02,col.glassDay,
      {tag:'布告板',hard:true,mode:1,alpha:.22,gloss:G.glass}));
  }
  box(NX,2.36,NZ,6.2,.34,.18,col.blueSign,{tag:'布告板',hard:true,gloss:.24});
  glyphs(NX,2.36,NZ-.11,Math.PI,'通知',{tag:'布告板',size:.19,gap:.07,color:col.white,mode:1});
  solid(5.9,12.1,-2.8,-2.2);
  kit.thing('布告板',9,2.72,-2.8,'布告板上都是通知。','The noticeboard is covered in notices.',
    '布告 notice + 板 board. 通知 is an announcement.',{focus:[9,-4],reach:2.4});

  // Print kiosk at the cross-promenade approach.
  const PX=-10.5,PZ=15;
  box(PX,.60,PZ,1.60,1.20,1,held(col.render,S.plas),
    {tag:'打印',hard:true,mode:14,gloss:G.paint,...S.plas});
  box(PX,.30,PZ,1.64,.60,1.04,held(col.brick,S.brick),
    {tag:'打印',hard:true,mode:11,gloss:G.matte,...S.brick});
  box(PX,.92,PZ-.52,1.10,.56,.04,col.glassDark,{tag:'打印',hard:true,mode:1,alpha:.6,gloss:G.glass});
  box(PX,.64,PZ-.50,1.20,.10,.22,col.trunkL,{tag:'打印',hard:true,gloss:G.wood});
  box(PX,1.56,PZ-.10,1.30,.40,.14,col.redD,{tag:'打印',hard:true,gloss:.26});
  for(const g of glyphs(PX,1.56,PZ-.18,Math.PI,'复印打印',
    {tag:'打印',size:.18,gap:.06,color:col.goldL,mode:1})) litten(g,.6);
  solid(-11.35,-9.65,14.45,15.55); shade(PX,PZ,2.2,1.6,.22);
  kit.thing('打印',PX,1.10,PZ,'打印一份，两毛。','One copy, twenty fen.',
    '复 again + 印 to print. 打印 is to print.',{focus:[-10.5,13.6],reach:1.8});

  // Inlaid school seal, paint only.
  cyl(-3,.014,11.5,1.30,.018,col.redD,{hard:true,mode:7,gloss:.10});
  cyl(-3,.026,11.5,1.02,.012,col.gold,{hard:true,mode:7,gloss:.12});
  flat(-3,.034,11.5,1.30,.10,col.redD,{gloss:.10});
  flat(-3,.035,11.5,.10,1.30,col.redD,{gloss:.10});

  return {};
});
