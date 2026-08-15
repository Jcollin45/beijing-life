// 北京市澄安医院 · 1F — 门诊大厅, registration, triage and the 24-hour emergency department.
HospFit[1] = A => {
  const { box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,light,thing,
          RX,RZ,H,col,fc,luminous,liveScreen,partitionZ,partitionX,sign,doorPlate,screen,
          infoPanel,counter,desk,chair,bench,cabinet,examBed,sink,ivStand,cart,curtainBay,
          cameraRoom } = A;

  const REG='挂号处', TRI='分诊台', ER='急诊', WAIT='候诊区';

  // Floor one is the hospital's first impression, so its smaller equipment is assembled from
  // rounded shells, tube frames and recognisable working parts instead of relying on cuboids.
  // These helpers intentionally add no collision of their own: the authored counters, beds and
  // partitions below continue to define the safe walking envelope.
  const floorArrow=(x,z,yaw,color=col.red,tag=ER)=>{
    const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
    capsule(x-f[0]*.20,.030,z-f[1]*.20,.040,.68,.040,color,
      {rx:Math.PI/2,ry:yaw,mode:1,alpha:.78,tag});
    for(const s of [-1,1]) capsule(x+f[0]*.22+r[0]*s*.16,.031,z+f[1]*.22+r[1]*s*.16,
      .040,.46,.040,color,{rx:Math.PI/2,ry:yaw-s*.68,mode:1,alpha:.78,tag});
  };
  const vitalCart=(x,z,yaw=0,tag='监护仪')=>{
    const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
    // Five-spoke rolling base, telescoping pole and a soft-corner monitor shell.
    cyl(x,.43,z,.035,.78,col.steelD,{gloss:.48,tag});
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      capsule(x+Math.sin(a)*.16,.075,z+Math.cos(a)*.16,.024,.38,.024,col.steelD,
        {rx:Math.PI/2,ry:a,gloss:.46,tag});
      cyl(x+Math.sin(a)*.34,.045,z+Math.cos(a)*.34,.050,.034,col.black,{rx:Math.PI/2,tag});
    }
    const sx=x+f[0]*.025, sz=z+f[1]*.025;
    ball(sx,1.35,sz,.49,.36,.12,col.white,{mode:7,ry:yaw,gloss:.22,tag});
    screen(x+f[0]*.13,1.37,z+f[1]*.13,yaw,.76,.48,'ECG',tag,col.screen);
    capsule(x-r[0]*.31-f[0]*.02,1.72,z-r[1]*.31-f[1]*.02,.025,.46,.025,col.steelD,
      {rx:Math.PI/2,ry:yaw,gloss:.44,tag});
    for(let i=0;i<3;i++) cyl(x+r[0]*(i-1)*.14+f[0]*.145,1.13,
      z+r[1]*(i-1)*.14+f[1]*.145,.026,.018,[col.red,col.yellow,col.green][i],
      {rx:Math.PI/2,ry:yaw,mode:1,glow:.025,tag});
  };
  const oxygenHeadwall=(x,z,tag='观察床')=>{
    ball(x,2.12,z,.96,.30,.075,col.white,{mode:7,gloss:.18,tag});
    box(x,2.12,z-.065,1.66,.32,.035,col.blueL,{hard:true,mode:1,alpha:.64,tag});
    for(const [dx,c] of [[-.53,col.green],[-.28,col.yellow],[.26,col.blue],[.52,col.red]]) {
      cyl(x+dx,2.13,z-.10,.062,.027,c,{rx:Math.PI/2,gloss:.28,tag});
      cyl(x+dx,2.13,z-.13,.025,.018,col.white,{rx:Math.PI/2,mode:1,tag});
    }
    capsule(x,2.43,z-.10,.030,1.10,.030,col.warm,{rz:Math.PI/2,mode:1,glow:.06,tag});
  };
  const wallClock=(x,y,z,yaw,tag=ER)=>{
    const alongX=Math.abs(Math.sin(yaw))<.5;
    const opt={ry:yaw,mode:7,gloss:.18,tag};
    ball(x,y,z,alongX?.31:.045,.31,alongX?.045:.31,col.white,opt);
    ball(x,y,z,alongX?.255:.028,.255,alongX?.028:.255,col.warm,{...opt,mode:1});
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    capsule(x+nx*.05,y+.035,z+nz*.05,.018,.28,.018,col.ink,
      {rz:-.28,ry:yaw,tag});
    capsule(x+nx*.052,y-.015,z+nz*.052,.012,.20,.012,col.red,
      {rz:1.04,ry:yaw,mode:1,tag});
    cyl(x+nx*.058,y,z+nz*.058,.027,.014,col.red,{rx:Math.PI/2,ry:yaw,mode:1,tag});
  };
  const planter=(x,z,tag='门诊大厅')=>{
    cyl(x,.27,z,.30,.46,col.wallD,{gloss:.20,tag});
    cyl(x,.47,z,.35,.10,col.white,{gloss:.22,tag});
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7, rr=.12+(i%2)*.08;
      capsule(x+Math.sin(a)*rr,.90+(i%3)*.15,z+Math.cos(a)*rr,.055,.72,.055,col.green,
        {rz:Math.sin(a)*.42,rx:Math.cos(a)*.32,mode:7,gloss:.03,tag});
      ball(x+Math.sin(a)*(.30+(i%2)*.10),1.25+(i%3)*.16,z+Math.cos(a)*(.30+(i%2)*.10),
        .20,.10,.11,i%2?col.greenL:col.green,{mode:7,ry:a,gloss:.03,tag});
    }
  };
  const dataRibbon=(x,y,z,yaw,w,tag,phase=0)=>{
    const nx=Math.sin(yaw),nz=Math.cos(yaw),ux=Math.cos(yaw),uz=-Math.sin(yaw);
    const alongX=Math.abs(Math.sin(yaw))<.5;
    const slab=(u,v,sw,sh,c,p=phase)=>{
      const q=box(x+ux*u+nx*.068,y+v,z+uz*u+nz*.068,alongX?sw:.014,sh,alongX?.014:sw,c,
        {hard:true,ry:yaw,mode:1,glow:.08,tag});
      liveScreen(q,p);
      return q;
    };
    // Alternating data bars and status lamps remain legible even before their glow pulse is seen.
    for(let i=0;i<5;i++) slab(-w*.30+i*w*.145,.075-(i%2)*.10,w*(.08+(i%3)*.025),.035,
      [col.tealL,col.green,col.yellow,col.blueL,col.red][i],phase+i*.63);
    for(let i=0;i<3;i++) slab(w*.29+i*.11,-.10,.055,.055,
      [col.green,col.yellow,col.red][i],phase+1.2+i*.9);
  };
  const toilet=(x,z,accessible=false,tag='洗手间')=>{
    // A moulded cistern, tapered pedestal and separate oval seat avoid the old stacked-box look.
    ball(x,.61,z+.27,.32,.36,.15,col.white,{mode:7,gloss:.28,tag});
    ball(x,.42,z-.02,.35,.18,.48,col.white,{mode:7,gloss:.30,tag});
    ball(x,.49,z-.09,.30,.035,.38,col.wallD,{mode:7,gloss:.20,tag});
    taper(x,.23,z+.02,.27,.17,.48,col.white,{gloss:.26,tag});
    capsule(x,.91,z+.34,.040,.34,.040,col.steelD,{rz:Math.PI/2,gloss:.48,tag});
    if(accessible) {
      capsule(x+.62,.72,z+.08,.035,.92,.035,col.steelD,{rx:Math.PI/2,gloss:.48,tag});
      capsule(x+.62,.98,z+.42,.035,.52,.035,col.steelD,{gloss:.48,tag});
      capsule(x+.62,1.22,z+.42,.035,.58,.035,col.steelD,{rx:Math.PI/2,gloss:.48,tag});
    }
  };

  // The lobby remains free-look.  Crossing a clinical threshold frames the work area ahead once,
  // after which the player can orbit normally; stepping back into the public hall re-arms it.
  cameraRoom('f1-billing',-RX+.30,-5.50,1.25,RZ-.30,-10.6,7.8);
  cameraRoom('f1-emergency',4.50,RX-.30,1.25,6.35,9.7,4.5);
  cameraRoom('f1-observation',4.50,RX-.30,6.95,RZ-.30,10.1,9.0);
  cameraRoom('f1-washroom',-4.90,3.90,8.98,RZ-.30,-.35,10.55);

  // ---------------------------------------------------------------- lobby architecture
  // The public hall fills the south half of the plate; departments sit behind a strong blue-green
  // cross-corridor.  A hospital entrance must let a stretcher turn without clipping a chair, so the
  // four-metre run from the automatic doors to the desk stays completely clear.
  partitionZ(.90,-RX,RX,[[-8.2,1.8],[0,2.2],[7.8,2.2]],col.wall,'大厅隔墙');
  box(0,.028,-1.28,5.0,.035,18.2,fc,{hard:true,mode:1,alpha:.40});
  glyphs(0,.054,-2.80,0,'门诊大厅',{size:.40,gap:.12,color:col.tealD,mode:1,lift:.010,tag:'门诊大厅'});
  thing('门诊大厅',0,.08,-2.80,'门诊大厅里先挂号，再去分诊台。',
    'In the outpatient hall, register first and then go to triage.',
    '门诊 is outpatient care. 大厅 is a public hall.',{tag:'门诊大厅',focus:[0,-3.0],reach:2.1});

  // Hospital-character wayfinding hangs overhead instead of relying on tiny wall notices.
  sign(-8.8,3.45,-1.35,0,'挂号 · 收费',col.blue,REG,.22);
  sign(0,3.45,-1.35,0,'候诊 · 叫号',col.teal,WAIT,.22);
  sign(8.7,3.45,-1.35,0,'分诊 · 急诊',col.red,TRI,.22);
  for(const [x,c,t] of [[-8.8,col.blue,'挂号'],[0,col.teal,'候诊'],[8.7,col.red,'急诊']]) {
    flat(x,.032,-1.68,2.2,14.8,c,{mode:1,alpha:.13});
    for(let k=0;k<6;k++) cyl(x,.040,-8.8+k*1.45,.045,.014,c,{mode:1,alpha:.72});
  }
  // Two readable wall infographics make the lobby useful before the player reaches a desk.  The
  // first carries a restrained Temple-of-Heaven roofline for Beijing identity; the second uses a
  // pulse trace and keeps emergency red confined to a clear safety message.
  infoPanel(3.90,1.68,.755,Math.PI,4.70,1.10,
    {title:'健康北京 · 就诊流程',subtitle:'挂号以后先去分诊台',steps:['挂号','分诊','就诊'],
     color:col.teal,tag:'门诊大厅',motif:'beijing'});
  infoPanel(13.00,2.10,.755,Math.PI,5.80,1.35,
    {title:'急诊 24小时',subtitle:'胸痛 · 呼吸困难 · 严重外伤请先告知护士',
     steps:['求助','分级','抢救'],color:col.red,tag:'急诊',motif:'pulse'});

  // ---------------------------------------------------------------- 挂号 / 收费
  // Six windows: a real Beijing public-hospital hall has a bank, not a single boutique counter.
  // The long counter is one collider, while each numbered window is individually legible.
  counter(-9.2,-3.05,10.7,.86,REG,col.blueD,.54);
  // These are occupied staff stations, so the animated clerks need measured chairs behind the
  // counter rather than a seated pose floating in the service bay.
  chair(-10.3,-2.05,Math.PI,REG,col.fabric);
  chair(-7.0,-2.05,Math.PI,REG,col.fabric);
  box(-9.2,2.10,-2.58,10.8,2.42,.16,col.wallD,{hard:true,tag:REG});
  for(let i=0;i<6;i++) {
    const x=-13.45+i*1.70;
    box(x,1.70,-2.66,1.42,1.48,.055,col.glass,{hard:true,mode:1,alpha:.28,gloss:.48,tag:REG});
    box(x,2.54,-2.70,1.46,.34,.08,i===5?col.green:col.blue,{hard:true,mode:1,glow:.025,tag:REG});
    glyphs(x,2.54,-2.75,0,String(i+1),{size:.20,color:col.white,mode:1,lift:.012,tag:REG});
    box(x,1.08,-3.32,.66,.06,.35,col.black,{hard:true,tag:REG});
    const mon=liveScreen(box(x,1.34,-3.34,.58,.40,.045,col.screen,{hard:true,mode:1,glow:.08,tag:REG}),i*.4);
    dataRibbon(x,1.19,-3.34,Math.PI,.50,REG,i*.4);
    glyphs(x,1.34,-3.37,Math.PI,i===5?'收费':'挂号',{size:.105,gap:.025,color:col.white,mode:1,lift:.010,tag:REG});
    box(x+.48,1.12,-3.38,.18,.06,.26,col.steelD,{hard:true,tag:REG});
    box(x+.48,1.17,-3.43,.13,.025,.18,col.tealL,{hard:true,mode:1,glow:.04,tag:REG});
  }
  // Queue lines and one-metre marks: visible organisation, without filling the aisle with rails.
  for(let i=0;i<5;i++) {
    const x=-12.6+i*1.70;
    flat(x,.024,-5.15,.045,3.05,col.blue,{mode:1,alpha:.45});
    glyphs(x,.052,-5.95,0,'请排队',{size:.105,gap:.025,color:col.blueD,mode:1,lift:.008,tag:REG});
  }
  thing(REG,-9.2,1.65,-2.67,'请先在挂号处取号，告诉工作人员哪里不舒服。',
    'Register first, take a number, and tell the clerk what is wrong.',
    '挂号 literally means hang/register a number. 挂什么科 asks which department you need.',
    {tag:REG,focus:[-9.2,-4.18],reach:2.2});
  thing('收费处',-5.0,1.65,-2.67,'看完医生以后在收费处交费。',
    'After seeing the doctor, pay at the cashier.',
    '收费 is to collect a fee; 缴费 is to pay it.',{tag:REG,focus:[-5.0,-4.05],reach:1.8});

  // Two self-service registration terminals, both fully readable and reachable.  Their shells
  // lean toward the visitor on a narrow pedestal: a hospital kiosk should read as a purpose-built
  // touch terminal, not a refrigerator with a black square painted on it.
  for(const [x,z] of [[-3.55,-7.1],[-3.55,-5.35]]) {
    const KT={tag:'自助挂号机'};
    ball(x,.065,z+.055,.43,.065,.34,col.wallD,{mode:7,gloss:.22,...KT});
    capsule(x,.48,z+.105,.22,.78,.17,col.white,{gloss:.24,...KT});
    box(x,.97,z-.035,.76,.72,.42,col.white,{rx:-.14,gloss:.24,...KT});
    box(x,1.08,z-.255,.62,.54,.035,col.black,{rx:-.14,hard:true,...KT});
    liveScreen(box(x,1.08,z-.278,.54,.46,.018,col.screen,
      {rx:-.14,hard:true,mode:1,glow:.09,...KT}),z);
    dataRibbon(x,.94,z-.285,Math.PI,.46,'自助挂号机',z*.17);
    glyphs(x,1.08,z-.300,0,'自助挂号',
      {size:.09,gap:.018,color:col.white,mode:1,lift:.008,tag:'自助挂号机'});
    // Receipt mouth, illuminated ID-card shelf and a tactile side button.
    box(x, .68,z-.215,.34,.035,.055,col.black,{hard:true,...KT});
    box(x, .55,z-.245,.40,.055,.20,col.steelD,{gloss:.34,...KT});
    box(x, .59,z-.350,.31,.018,.14,col.tealL,{hard:true,mode:1,glow:.045,...KT});
    cyl(x+.34,.91,z-.205,.045,.025,col.blue,{rx:Math.PI/2,mode:1,glow:.045,...KT});
    solid(x-.40,x+.40,z-.31,z+.31);
  }
  thing('自助挂号机',-3.55,1.10,-6.20,'身份证放这里，也可以自助挂号。',
    'Place your ID here to register by yourself.',
    '自助 means self-service.',{tag:'自助挂号机',focus:[-2.75,-6.20],reach:1.55});

  // ---------------------------------------------------------------- 候诊 / 叫号
  // Banks face the main queue display.  Offset rows preserve a centre aisle wide enough for a
  // wheelchair; six little rows read busier and more convincing than one giant bench.
  for(const z of [-7.80,-5.85,-3.90]) {
    bench(-.25,z,4,0,WAIT,col.fabric);
    bench(3.00,z,4,0,WAIT,col.fabric);
  }
  box(1.38,2.82,-2.58,6.85,.72,.12,col.black,{hard:true,tag:'叫号屏'});
  const board=liveScreen(box(1.38,2.82,-2.66,6.68,.58,.055,col.screen,
    {hard:true,mode:1,glow:.10,tag:'叫号屏'}),1.1);
  glyphs(-.55,2.92,-2.71,Math.PI,'请  A023  到  2号窗口',{size:.145,gap:.035,color:col.white,mode:1,lift:.012,tag:'叫号屏'});
  glyphs(1.70,2.68,-2.71,Math.PI,'请注意屏幕和广播',{size:.105,gap:.028,color:col.tealL,mode:1,lift:.012,tag:'叫号屏'});
  dataRibbon(4.05,2.82,-2.67,Math.PI,1.18,'叫号屏',1.1);
  thing('叫号屏',1.38,2.82,-2.70,'屏幕正在叫A023号，请到二号窗口。',
    'The display is calling A023 to window two.',
    '叫号 is to call a queue number; 过号 means your number was skipped.',
    {tag:'叫号屏',focus:[1.38,-4.05],reach:2.5});

  // Drinking-water boiler and paper-cup rack — an unmistakable public-building detail.
  box(6.15,.68,-7.55,.72,1.36,.48,col.steel,{hard:true,gloss:.40,tag:'开水'});
  box(6.15,1.02,-7.80,.52,.38,.035,col.black,{hard:true,tag:'开水'});
  liveScreen(box(6.15,1.02,-7.83,.44,.30,.018,col.blueD,{hard:true,mode:1,glow:.05,tag:'开水'}),2.0);
  glyphs(6.15,1.02,-7.85,0,'开水',{size:.10,gap:.03,color:col.white,mode:1,lift:.008,tag:'开水'});
  for(let i=0;i<8;i++) cyl(6.55,1.24-i*.07,-7.80,.055,.065,col.white,{tag:'开水'});
  solid(5.75,6.55,-7.84,-7.28);
  thing('开水',6.15,1.02,-7.84,'医院大厅有开水，接水时小心烫。',
    'There is boiled water in the hall; be careful, it is hot.',
    '开水 is boiled drinking water, common in Chinese public buildings.',
    {tag:'开水',focus:[6.15,-6.85],reach:1.5});

  // ---------------------------------------------------------------- 分诊台
  counter(9.55,-3.65,5.5,1.18,TRI,col.teal,.58);
  box(9.55,1.48,-3.68,4.70,.70,.07,col.white,{hard:true,tag:TRI});
  glyphs(9.55,1.58,-3.73,0,'预检分诊台',{size:.22,gap:.065,color:col.tealD,mode:1,lift:.012,tag:TRI});
  glyphs(9.55,1.28,-3.73,0,'请出示挂号条',{size:.105,gap:.030,color:col.inkL,mode:1,lift:.010,tag:TRI});
  // thermometer, blood-pressure unit and sanitiser on the desk
  capsule(8.40,1.23,-4.18,.018,.34,.018,col.white,{rz:1.22,tag:'体温计'});
  box(9.25,1.22,-4.15,.48,.30,.30,col.steelD,{hard:true,tag:'血压计'});
  liveScreen(box(9.25,1.24,-4.32,.36,.20,.025,col.screen,{hard:true,mode:1,glow:.06,tag:'血压计'}),.6);
  for(let i=0;i<3;i++) liveScreen(box(9.15+i*.09,1.19,-4.355,.055,.025,.014,
    [col.green,col.yellow,col.red][i],{hard:true,mode:1,glow:.07,tag:'血压计'}),.6+i*.8);
  capsule(9.58,1.20,-4.08,.025,.48,.025,col.black,{rx:Math.PI/2,rz:.7,tag:'血压计'});
  thing(TRI,9.55,1.55,-3.75,'护士会问哪里不舒服，再告诉你去哪个科室。',
    'The nurse asks what is wrong, then directs you to a department.',
    '分诊 means triage: 分 sort + 诊 examine.',{tag:TRI,focus:[9.55,-5.05],reach:2.2});
  thing('体温计',8.40,1.23,-4.18,'先量一下体温。','Take your temperature first.',
    '体温 is body temperature; 量体温 is to take it.',{tag:'体温计',focus:[8.25,-4.95],reach:1.35});
  thing('血压计',9.25,1.24,-4.32,'把胳膊放好，量一下血压。',
    'Put your arm here and measure your blood pressure.',
    '血压 is blood pressure; 高血压 is hypertension.',{tag:'血压计',focus:[9.25,-5.0],reach:1.35});

  // Wheelchair bay beside triage.  The large rear wheels, push handles and footplates make it read
  // correctly instead of as another office chair.
  const wx=13.2,wz=-6.0,WT={tag:'轮椅'};
  for(const s of [-1,1]) {
    cyl(wx+s*.34,.47,wz,.38,.055,col.black,{rz:Math.PI/2,gloss:.22,...WT});
    cyl(wx+s*.34,.47,wz,.30,.065,col.steel,{rz:Math.PI/2,gloss:.42,...WT});
    capsule(wx+s*.34,.78,wz+.12,.025,.92,.025,col.steelD,{rx:.15,...WT});
  }
  box(wx,.54,wz-.02,.64,.10,.58,col.fabric,{round:.08,mode:7,...WT});
  box(wx,.91,wz+.26,.64,.72,.10,col.fabric,{round:.08,mode:7,...WT});
  for(const s of [-1,1]) {
    capsule(wx+s*.28,.91,wz+.45,.022,.38,.022,col.steelD,{rx:Math.PI/2,...WT});
    box(wx+s*.20,.14,wz-.36,.25,.035,.32,col.steelD,{hard:true,...WT});
  }
  solid(wx-.48,wx+.48,wz-.48,wz+.48);
  thing('轮椅',wx,.75,wz,'门口有轮椅，需要的话可以借。',
    'Wheelchairs by the entrance may be borrowed when needed.',
    '轮 is wheel + 椅 chair.',{tag:'轮椅',focus:[12.25,wz],reach:1.7});

  // ---------------------------------------------------------------- north service corridor
  // A change of floor tile and a broad door line mark the clinical side of the threshold.
  flat(0,.018,5.9,RX*2-.7,10.0,col.tile,{mat:'tile',matScale:.48,matAmt:.35,gloss:.18});
  box(0,2.55,.98,2.05,.12,2.60,col.steelD,{hard:true,tag:'门诊通道'});
  glyphs(0,3.33,.88,0,'请保持安静',{size:.16,gap:.05,color:col.tealD,mode:1,lift:.012,tag:'门诊通道'});

  // West: insurance/cash office and records collection.
  partitionX(-5.20,1.0,RZ,[4.5,8.4],col.wall,'收费处');
  partitionZ(6.45,-RX,-5.2,[[-10.8,1.5]],col.wall,'收费处');
  doorPlate(-10.8,2.80,6.35,0,'收费处','收费处',col.blue);
  counter(-10.8,8.05,6.2,.82,'收费处',col.blueD,.54);
  chair(-10.8,8.85,Math.PI,'收费处',col.fabric);
  for(let i=0;i<3;i++) screen(-12.4+i*1.65,1.55,7.58,0,1.22,.62,['医保','缴费','发票'][i],'收费处',col.screen);
  cabinet(-15.5,9.7,2.2,2.0,.48,'病历',col.white,Math.PI/2);
  thing('病历',-15.5,1.60,9.7,'病历记录了看病和检查的情况。',
    'The medical record contains consultations and test results.',
    '病 illness + 历 history.',{tag:'病历',focus:[-14.4,9.7],reach:1.7});

  // East/north: the emergency department, open twenty-four hours and built around two curtained
  // treatment bays, a resuscitation room and its own nurse base.
  partitionX(4.20,1.0,RZ,[3.35,8.75],col.wall,ER);
  partitionZ(6.65,4.2,RX,[[8.0,1.55],[13.2,1.65]],col.wall,ER);
  sign(10.55,3.34,1.02,0,'急诊  24小时',col.red,ER,.24);
  glyphs(10.55,2.97,1.00,0,'EMERGENCY',{size:.105,gap:.035,color:col.redD,mode:1,lift:.012,tag:ER});
  // A continuous red route and triage chevrons make the emergency threshold readable at a run.
  // The path is visual only, keeping the stretcher turn between the lobby and nurse base clear.
  flat(5.10,.025,3.35,1.62,.64,col.red,{mode:1,alpha:.20,gloss:.04,tag:ER});
  flat(6.40,.025,3.35,1.10,.64,col.red,{mode:1,alpha:.14,gloss:.04,tag:ER});
  floorArrow(4.68,3.35,Math.PI/2);
  floorArrow(5.88,3.35,Math.PI/2);
  for(const [x,c,t] of [[6.70,col.red,'1'],[7.26,col.yellow,'2'],[7.82,col.green,'3']]) {
    ball(x,.037,1.48,.20,.025,.20,c,{mode:1,alpha:.72,tag:ER});
    glyphs(x,.066,1.48,0,t,{size:.125,color:col.white,mode:1,lift:.006,tag:ER});
  }
  infoPanel(16.82,2.05,4.48,-Math.PI/2,3.55,1.55,
    {title:'急诊分级',subtitle:'红色优先处理 · 请听护士安排',steps:['抢救','紧急','一般'],
     color:col.red,tag:ER,motif:'pulse'});
  infoPanel(10.58,2.18,6.535,Math.PI,3.10,1.18,
    {title:'仁心仁术',subtitle:'生命至上 · 快速响应',steps:[],color:col.red,tag:ER,motif:'beijing'});
  wallClock(4.34,2.90,5.48,-Math.PI/2,ER);
  planter(15.95,1.86,ER);
  bench(13.78,1.86,2,-Math.PI/2,'候诊椅',col.fabric);
  // emergency nurse base
  counter(8.0,3.38,5.35,1.10,ER,col.redD,.56);
  box(8.0,1.45,2.79,4.7,.64,.08,col.white,{hard:true,tag:ER});
  glyphs(8.0,1.50,2.72,0,'急诊护士站',{size:.19,gap:.055,color:col.redD,mode:1,lift:.012,tag:ER});
  screen(9.4,2.45,2.78,0,1.45,.58,'床位 02',ER,col.screen);
  dataRibbon(9.40,2.45,2.71,0,1.28,ER,.2);
  // The nurse base carries the working clutter of a real emergency desk: two angled terminals,
  // barcode scanner, phone, wristband printer and colour-coded chart trays.
  for(const [x,label,phase] of [[6.72,'E017',.4],[8.05,'E018',1.1]]) {
    ball(x,1.21,3.20,.40,.30,.10,col.white,{mode:7,gloss:.20,tag:ER});
    screen(x,1.28,2.98,0,.62,.38,label,ER,col.screen);
    dataRibbon(x,1.27,2.90,0,.54,ER,phase);
    capsule(x,1.01,3.28,.030,.48,.030,col.steelD,{rz:Math.PI/2,gloss:.42,tag:ER});
  }
  ball(8.72,1.20,3.16,.22,.11,.14,col.black,{mode:7,gloss:.16,tag:ER});
  capsule(8.73,1.34,3.12,.040,.38,.040,col.black,{rz:Math.PI/2,tag:ER});
  box(9.30,1.16,3.18,.45,.21,.36,col.white,{round:.08,gloss:.20,tag:ER});
  box(9.30,1.29,3.05,.30,.09,.035,col.black,{hard:true,tag:ER});
  for(let i=0;i<4;i++) box(6.30+i*.34,1.19,3.72,.27,.045,.36,
    [col.red,col.yellow,col.green,col.blue][i],{round:.035,mode:1,alpha:.88,tag:ER});
  // A back-lit cross gives the base a visual anchor when screens are partly occluded by staff.
  box(10.52,2.02,2.70,.62,.16,.035,col.red,{hard:true,mode:1,glow:.10,tag:ER});
  box(10.52,2.02,2.70,.16,.62,.035,col.red,{hard:true,mode:1,glow:.10,tag:ER});
  thing(ER,8.0,1.55,2.74,'急诊二十四小时接诊，严重不舒服要先来这里。',
    'Emergency receives patients twenty-four hours a day.',
    '急 means urgent + 诊 examine. 急诊 is the emergency department.',
    {tag:ER,focus:[8.0,2.05],reach:1.9});

  // Infection-control point and PPE organiser immediately inside the clinical threshold.
  box(4.34,1.15,1.82,.10,.76,.34,col.white,{round:.06,gloss:.22,tag:'洗手液'});
  box(4.27,1.44,1.82,.045,.18,.17,col.tealL,{hard:true,mode:1,tag:'洗手液'});
  capsule(4.24,1.57,1.82,.020,.16,.020,col.steelD,{rz:Math.PI/2,gloss:.48,tag:'洗手液'});
  thing('洗手液',4.24,1.30,1.82,'进急诊区前先消毒双手。',
    'Sanitise your hands before entering the emergency treatment area.',
    '洗手液 is liquid hand cleanser.',{tag:'洗手液',focus:[5.12,1.82],reach:1.35});
  for(const [z,c,label] of [[4.72,col.blueL,'口罩'],[5.20,col.yellow,'手套'],[5.68,col.greenL,'护目']]) {
    box(4.33,1.42,z,.12,.34,.68,col.white,{round:.055,gloss:.18,tag:ER});
    box(4.25,1.42,z,.035,.22,.50,c,{hard:true,mode:1,alpha:.72,tag:ER});
    glyphs(4.22,1.42,z,-Math.PI/2,label,{size:.095,gap:.025,color:col.ink,mode:1,lift:.010,tag:ER});
  }

  // Two genuinely equipped observation bays.  Ceiling tracks, headwall gases, soft blankets,
  // infusion stands and live bedside data make these read as occupied treatment spaces rather
  // than two beds placed behind curtains.
  for(const [bay,[x,z]] of [[0,[7.1,8.9]],[1,[11.0,8.9]]]) {
    curtainBay(x,z,3.2,4.0,'观察床',col.blueL);
    for(const sx of [-1,1]) capsule(x+sx*1.56,3.56,z,.026,3.92,.026,col.steelD,
      {rx:Math.PI/2,gloss:.44,tag:'观察床'});
    capsule(x,3.56,z-1.94,.026,3.10,.026,col.steelD,
      {rz:Math.PI/2,gloss:.44,tag:'观察床'});
    examBed(x,z,0,'观察床',col.bed);
    ball(x,.98,z+.27,.33,.060,.40,bay?col.greenL:col.blueL,
      {mode:7,gloss:.025,tag:'观察床'});
    cart(x+1.15,z-1.15,'治疗车',col.steel);
    screen(x,2.50,6.58,0,1.70,.55,'监护中','监护仪',col.screen);
    dataRibbon(x,2.50,6.51,0,1.52,'监护仪',bay*.8);
    oxygenHeadwall(x,10.70,'观察床');
    ivStand(x-1.13,z+.78,'输液架');
    // Bedside locker with a rounded drawer, tissues, cup and labelled wristband tray.
    ball(x-1.13,.52,z-.72,.39,.48,.32,col.white,{mode:7,gloss:.18,tag:'观察床'});
    box(x-1.13,.64,z-.96,.60,.20,.035,col.wallD,{round:.05,hard:true,tag:'观察床'});
    capsule(x-1.13,.64,z-1.00,.020,.25,.020,col.steelD,{rz:Math.PI/2,tag:'观察床'});
    box(x-1.22,1.03,z-.75,.30,.16,.20,col.warm,{round:.045,tag:'观察床'});
    for(let i=0;i<4;i++) box(x-1.22+(i-1.5)*.055,1.15,z-.75,.025,.18,.10,col.white,
      {round:.02,tag:'观察床'});
    cyl(x-.82,.95,z-.74,.085,.20,col.white,{gloss:.14,tag:'观察床'});
  }
  doorPlate(13.2,2.84,6.54,0,'抢救室','抢救室',col.red);
  examBed(14.3,9.0,Math.PI/2,'抢救床',col.white);
  flat(14.30,.026,9.00,4.25,4.25,col.red,{mode:1,alpha:.055,gloss:.03,tag:'抢救室'});
  for(const p of [[12.55,7.36],[16.05,7.36],[12.55,10.68],[16.05,10.68]])
    ball(p[0],.034,p[1],.10,.022,.10,col.red,{mode:1,alpha:.72,tag:'抢救室'});
  // Ceiling service boom: articulated joints, gas outlets and a suspended live monitor.
  cyl(15.55,3.82,8.05,.14,.22,col.steelD,{gloss:.44,tag:'抢救室'});
  capsule(15.10,3.70,8.05,.045,.90,.045,col.steelD,{rz:Math.PI/2,gloss:.48,tag:'抢救室'});
  cyl(14.66,3.70,8.05,.10,.16,col.steel,{gloss:.44,tag:'抢救室'});
  capsule(14.66,3.29,8.05,.040,.78,.040,col.steelD,{gloss:.48,tag:'抢救室'});
  screen(14.66,2.85,8.05,Math.PI/2,.92,.56,'急救','监护仪',col.screen);
  dataRibbon(14.59,2.85,8.05,Math.PI/2,.78,'监护仪',1.8);
  // overhead operating lamp
  cyl(14.3,3.62,9.0,.52,.12,col.steelD,{gloss:.42,tag:'抢救室'});
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    cyl(14.3+Math.sin(a)*.30,3.51,9.0+Math.cos(a)*.30,.11,.055,col.warm,{mode:1,glow:.12,tag:'抢救室'});
  }
  capsule(14.3,3.83,9.0,.035,.64,.035,col.steelD,{rz:Math.PI/2,tag:'抢救室'});
  cabinet(15.75,4.55,1.65,1.95,.48,'急救药品',col.white,Math.PI/2);
  vitalCart(16.10,9.92,-Math.PI/2,'监护仪');
  cart(12.65,10.72,'治疗车',col.steel);
  // Oxygen and suction bank with transparent-looking collection bottles and coiled tubing.
  box(16.80,1.85,10.78,.10,.92,1.70,col.white,{round:.07,gloss:.18,tag:'抢救室'});
  for(const [z,c] of [[10.30,col.green],[10.62,col.yellow],[10.94,col.blue],[11.26,col.red]]) {
    cyl(16.72,2.02,z,.068,.035,c,{rz:Math.PI/2,gloss:.30,tag:'抢救室'});
    capsule(16.64,1.48,z,.080,.35,.080,col.glass,{mode:7,alpha:.42,gloss:.34,tag:'抢救室'});
    capsule(16.54,1.16,z,.018,.54,.018,col.steelD,{rx:Math.PI/2,rz:.48,tag:'抢救室'});
  }
  // Wrapped sterile packs and labelled drawers give the crash trolley useful visual scale.
  for(let i=0;i<4;i++) box(12.65+(i-1.5)*.22,1.04,10.70,.17,.07,.34,
    i===0?col.red:i===1?col.yellow:col.warm,{round:.025,gloss:.08,tag:'治疗车'});
  for(let i=0;i<3;i++) box(12.65,.74-i*.20,10.42,.74,.13,.035,col.white,
    {round:.025,hard:true,tag:'治疗车'});
  thing('抢救室',14.2,2.0,6.55,'抢救室里设备已经准备好了。',
    'The resuscitation room is equipped and ready.',
    '抢救 means emergency resuscitation or rescue.',
    {tag:'抢救室',focus:[13.2,7.3],reach:2.1});
  const observationBed=thing('观察床',7.1,1.05,8.9,'急诊观察床用帘子隔开。',
    'Emergency observation beds are separated by curtains.',
    '观察 means observe; patients may stay here before going home or upstairs.',
    {tag:'观察床',focus:[7.1,7.25],reach:2.2});
  observationBed.hospitalPose={at:[7.1,8.9],yaw:0,seatY:.89};

  // Defibrillator cart — a rounded portable case on a tubular crash trolley, with paddles,
  // cables and a trace screen.  The separated frame keeps the silhouette from becoming a box.
  const DT={tag:'除颤仪'};
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    capsule(5.65+sx*.34,.53,4.95+sz*.22,.035,.90,.035,col.steelD,{gloss:.42,...DT});
    cyl(5.65+sx*.34,.075,4.95+sz*.22,.075,.045,col.black,{rx:Math.PI/2,...DT});
  }
  box(5.65,.46,4.95,.86,.065,.62,col.steel,{gloss:.42,...DT});
  box(5.65,.91,4.95,.84,.88,.60,col.yellow,{round:.13,gloss:.24,...DT});
  capsule(5.65,1.43,5.00,.045,.70,.045,col.steelD,{rz:Math.PI/2,gloss:.44,...DT});
  box(5.65,1.18,4.64,.70,.47,.055,col.black,{hard:true,...DT});
  liveScreen(box(5.65,1.16,4.57,.58,.36,.018,col.screen,{hard:true,mode:1,glow:.10,tag:'除颤仪'}),2.7);
  dataRibbon(5.65,1.16,4.54,Math.PI,.50,'除颤仪',2.7);
  for(const s of [-1,1]) {
    capsule(5.65+s*.24,1.55,4.86,.11,.23,.08,col.black,{rx:Math.PI/2,...DT});
    capsule(5.65+s*.31,1.39,4.88,.015,.30,.015,col.black,{rx:Math.PI/2,rz:s*.40,...DT});
  }
  for(let i=0;i<4;i++) cyl(5.43+i*.15,.86,4.63,.026,.018,
    [col.red,col.yellow,col.green,col.blue][i],{rx:Math.PI/2,mode:1,...DT});
  solid(5.18,6.12,4.60,5.30);
  thing('除颤仪',5.65,1.22,4.58,'除颤仪放在急诊最容易拿到的位置。',
    'The defibrillator is kept where emergency staff can reach it immediately.',
    '除颤仪 is a defibrillator.',{tag:'除颤仪',focus:[5.65,3.85],reach:1.55});

  // ---------------------------------------------------------------- full public washroom
  // The original 1.7-metre strip held only two sinks.  Pulling its front wall south creates a
  // proper, navigable public bathroom with two standard cubicles, an accessible room and a real
  // wash counter, while still leaving the cross-corridor and west office untouched.
  partitionZ(8.72,-5.2,4.2,[[-.80,1.60]],col.wall,'洗手间');
  doorPlate(-.80,2.80,8.61,0,'卫生间 · 无障碍','洗手间',col.teal);
  flat(-.50,.020,10.32,8.95,3.10,col.tile,{mat:'tile',matScale:.36,matAmt:.42,gloss:.22,tag:'洗手间'});
  // Two west cubicles with raised doors, hardware and occupied/vacant status lamps.
  for(const x of [-4.28,-2.58]) {
    box(x,1.53,9.32,1.42,2.42,.075,col.wall,{hard:true,gloss:.12,tag:'洗手间'});
    box(x,1.48,9.26,1.16,2.12,.045,col.tealL,{hard:true,mode:7,alpha:.42,gloss:.18,tag:'洗手间'});
    capsule(x+.42,1.45,9.20,.024,.20,.024,col.steelD,{gloss:.48,tag:'洗手间'});
    const lamp=box(x-.48,2.64,9.20,.12,.08,.020,x<-3?col.green:col.red,
      {hard:true,mode:1,glow:.09,tag:'洗手间'});
    liveScreen(lamp,x);
    toilet(x,10.92,false,'洗手间');
    // Paper roll, bag hook and a slim privacy divider on each side.
    capsule(x-.53,.92,10.64,.050,.16,.050,col.white,{rx:Math.PI/2,gloss:.12,tag:'洗手间'});
    cyl(x-.53,.92,10.64,.064,.022,col.steelD,{rx:Math.PI/2,tag:'洗手间'});
    capsule(x+.56,1.82,10.20,.025,.16,.025,col.steelD,{rx:Math.PI/2,tag:'洗手间'});
  }
  box(-3.43,1.52,10.63,.075,2.92,2.63,col.wallD,{hard:true,gloss:.10,tag:'洗手间'});
  box(-1.72,1.52,10.63,.075,2.92,2.63,col.wallD,{hard:true,gloss:.10,tag:'洗手间'});

  // Accessible cubicle on the east side: a wider sliding-looking door, transfer clearance,
  // grab rails, low call button and fold-down changing shelf.
  box(2.72,1.54,9.22,2.62,2.46,.075,col.wall,{hard:true,gloss:.12,tag:'洗手间'});
  box(2.72,1.50,9.15,2.16,2.16,.045,col.blueL,
    {hard:true,mode:7,alpha:.36,gloss:.18,tag:'洗手间'});
  capsule(3.48,1.48,9.08,.026,.40,.026,col.steelD,{gloss:.48,tag:'洗手间'});
  glyphs(2.72,2.42,9.08,Math.PI,'无障碍',{size:.13,gap:.04,color:col.tealD,mode:1,lift:.010,tag:'洗手间'});
  toilet(3.12,10.78,true,'洗手间');
  cyl(1.75,.78,10.02,.055,.030,col.red,{rx:Math.PI/2,mode:1,glow:.08,tag:'洗手间'});
  capsule(1.75,.49,10.02,.014,.46,.014,col.red,{tag:'洗手间'});
  ball(1.96,.92,11.40,.58,.060,.30,col.white,{mode:7,gloss:.20,rx:-.08,tag:'洗手间'});
  capsule(1.96,.68,11.49,.028,.70,.028,col.steelD,{rz:Math.PI/2,gloss:.44,tag:'洗手间'});

  // Wash counter: three rounded basins, a continuous splashback and generous mirrors.  One basin
  // is lowered for children and wheelchair users; soap, paper towels and hand dryer are present.
  box(-.02,.73,10.86,2.55,.12,.62,col.white,{round:.10,gloss:.28,tag:'洗手间'});
  for(const [i,x] of [[0,-.78],[1,0],[2,.78]]) {
    ball(x,i===2?.71:.78,10.84,.30,.07,.24,col.wallD,{mode:7,gloss:.26,tag:'洗手间'});
    capsule(x,i===2?.94:1.01,11.05,.024,.30,.024,col.steelD,{rx:Math.PI/2,gloss:.50,tag:'洗手间'});
    box(x,1.77,11.61,.62,1.08,.035,col.glass,{hard:true,mode:1,alpha:.34,gloss:.58,tag:'洗手间'});
    box(x,1.77,11.64,.68,1.14,.025,col.steelD,{hard:true,mode:1,alpha:.24,tag:'洗手间'});
  }
  box(-1.26,1.35,11.50,.24,.54,.22,col.white,{round:.055,gloss:.18,tag:'洗手间'});
  box(-1.26,1.50,11.34,.12,.10,.035,col.tealL,{hard:true,mode:1,tag:'洗手间'});
  box(1.31,1.50,11.52,.38,.62,.24,col.steelD,{round:.07,gloss:.34,tag:'洗手间'});
  capsule(1.31,1.31,11.36,.030,.18,.030,col.black,{rz:Math.PI/2,tag:'洗手间'});
  thing('洗手间',-.80,1.70,8.63,'一楼卫生间有普通隔间和无障碍卫生间。',
    'The ground-floor washroom has standard cubicles and an accessible bathroom.',
    '洗手间 is the polite public word for a toilet.',{tag:'洗手间',focus:[-.80,9.52],reach:1.7});
};

// Static positions are deliberate: generic NPC walking does not collide with room partitions.
// Staff still breathe, turn, gesture and work at their stations, while patients fill the seats.
HospitalCast.push(
  { hz:'挂号员', place:'hospital', temper:'patient',
    look:{skin:'#d6a27f',hair:'#26221f',hairStyle:'bob',top:'#dbe5e7',pants:'#334551',shoe:'#262b2e',uniform:'staff',faceSeed:7101},
    spots:[{h0:7,h1:20,at:[-10.3,-2.05],face:Math.PI,act:'desk'}] },
  { hz:'挂号员', place:'hospital', temper:'steady',
    look:{skin:'#c8926f',hair:'#302721',hairStyle:'tie',top:'#e5ece9',pants:'#374652',shoe:'#252a2d',uniform:'staff',faceSeed:7102},
    spots:[{h0:7,h1:20,at:[-7.0,-2.05],face:Math.PI,act:'desk'}] },
  { hz:'护士', place:'hospital', temper:'busy',
    look:{skin:'#d4a17e',hair:'#241f1c',hairStyle:'bun',top:'#eef0e9',pants:'#dde6e5',shoe:'#e4e3dc',uniform:'coat',faceSeed:7110},
    spots:[{h0:0,h1:24,at:[9.1,-2.72],face:Math.PI,act:'work',held:null}] },
  { hz:'护士', place:'hospital', temper:'busy',
    look:{skin:'#bf8767',hair:'#302620',hairStyle:'tie',top:'#eef0e9',pants:'#dbe5e4',shoe:'#e4e3dc',uniform:'coat',faceSeed:7111},
    spots:[{h0:0,h1:24,at:[7.6,4.15],face:0,act:'check'}] },
  { hz:'医生', place:'hospital', temper:'steady',
    look:{skin:'#c9916d',hair:'#37302b',hairStyle:'crop',glasses:true,top:'#eef0e9',pants:'#35424a',shoe:'#252a2d',uniform:'coat',faceSeed:7120},
    spots:[{h0:0,h1:24,at:[13.8,8.8],face:-Math.PI/2,act:'work',held:null}] },
  { hz:'保安', place:'hospital', temper:'alert',
    look:{skin:'#bd8262',hair:'#25211e',hairStyle:'crop',top:'#2e4253',pants:'#283641',shoe:'#202529',uniform:'guard',faceSeed:7130},
    spots:[{h0:0,h1:24,at:[4.4,-9.3],face:Math.PI,act:'hands'}] },
  { hz:'病人', place:'hospital', temper:'patient',seatY:.50,
    look:{skin:'#d5a47f',hair:'#352b25',hairStyle:'short',top:'#7d8da0',pants:'#414952',shoe:'#2c3135',faceSeed:7140},
    spots:[{h0:6,h1:22,at:[-.9,-7.8],face:0,act:'sit'}] },
  { hz:'病人', place:'hospital', temper:'bored',seatY:.50,
    look:{skin:'#c48f70',hair:'#1f1d1c',hairStyle:'tie',top:'#a66f62',pants:'#3c4550',shoe:'#e3ded2',faceSeed:7141},
    spots:[{h0:6,h1:22,at:[2.4,-5.85],face:0,act:'sit'}] },
  { hz:'家属', place:'hospital', temper:'patient',seatY:.50,
    look:{skin:'#d6a581',hair:'#534840',hairStyle:'short',top:'#6e776f',pants:'#3f454a',shoe:'#2b3034',faceSeed:7142},
    spots:[{h0:6,h1:22,at:[3.0,-3.9],face:0,act:'sit'}] },
  // The north office and emergency observation beds are visible from the main hall. One couch is
  // deliberately kept free for the player's 留院观察 action; its former patient waits on an exact
  // lobby chair instead. These remain static because each treatment curtain is a real partition;
  // movement is reserved for the authored ward route upstairs.
  { hz:'收费员', place:'hospital', temper:'steady',
    look:{skin:'#dca983',hair:'#2b2420',hairStyle:'tie',top:'#dce6e7',pants:'#374650',
      shoe:'#2c3136',collar:'shirt',uniform:'staff',tall:.97,wide:.94,age:.29,faceSeed:7150},
    spots:[{h0:7,h1:20,at:[-10.8,8.85],face:Math.PI,act:'desk'}] },
  { hz:'观察病人', place:'hospital', temper:'weary',seatY:.50,
    look:{skin:'#c99370',hair:'#554d46',hairStyle:'short',top:'#9dbac0',pants:'#526069',
      shoe:'#d9d5cb',tall:.96,wide:1.04,stoop:.08,age:.51,faceSeed:7151},
    spots:[{h0:0,h1:24,at:[-.56,-5.85],face:0,act:'sit'}] },
  { hz:'观察病人', place:'hospital', temper:'patient',seatY:.82,
    look:{skin:'#deb087',hair:'#302824',hairStyle:'bob',top:'#a6c1c5',pants:'#56616a',
      shoe:'#ded9cf',tall:.94,wide:.98,faceSeed:7152},
    // Sit on the clear centre mattress, not the raised folded blanket at z 9.17.
    spots:[{h0:0,h1:24,at:[11.00,8.55],face:0,act:'sit'}] }
  ,{ hz:'病人', place:'hospital', temper:'weary',seatY:.82,
    look:{skin:'#c78f6c',hair:'#272321',hairStyle:'short',top:'#b8cbd0',pants:'#59646c',
      shoe:'#dedbd2',tall:.98,wide:1.02,stoop:.06,faceSeed:7153},
    spots:[{h0:0,h1:24,at:[14.30,9.00],face:Math.PI/2,act:'sit'}] }
  ,{ hz:'护士', place:'hospital', temper:'focused',
    look:{skin:'#d9a27c',hair:'#312620',hairStyle:'bun',top:'#eef2ed',pants:'#d8e4e2',
      shoe:'#e4e2db',uniform:'coat',collar:'shirt',faceSeed:7154},
    spots:[{h0:0,h1:24,at:[6.05,8.05],face:.58,act:'check'}] }
  ,{ hz:'护士', place:'hospital', temper:'steady',
    look:{skin:'#b97d5e',hair:'#211d1b',hairStyle:'crop',top:'#edf1ec',pants:'#d7e3e2',
      shoe:'#deddd6',uniform:'coat',glasses:true,faceSeed:7155},
    spots:[{h0:0,h1:24,at:[12.78,10.18],face:Math.PI/2,act:'check'}] }
  ,{ hz:'家属', place:'hospital', temper:'worried',seatY:.50,
    look:{skin:'#d4a17d',hair:'#443932',hairStyle:'short',top:'#7c6f68',pants:'#3f474d',
      shoe:'#2c3033',tall:.96,wide:.98,age:.44,faceSeed:7156},
    spots:[{h0:0,h1:24,at:[13.78,1.56],face:-Math.PI/2,act:'sit'}] }
);
