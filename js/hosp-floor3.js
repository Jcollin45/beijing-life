// 三楼 — 检查治疗 · 药房
//
// The hospital shell gives this floor a 34 x 24 metre envelope, the two vertical cores and one
// shared furniture kit.  This fit-out keeps the whole south side as a legible public spine: come
// out of either core, read one sign, and every department door is on the same wall.  The rooms
// behind it are deep enough to be rooms rather than shop-window vignettes — blood collection and
// its laboratory, CT and X-ray, ultrasound, two treatment bays, a full infusion room and the
// dispensary that serves them all.

// Cast exists at script load, not when the Lazy scene is first entered.  game.js folds the
// HospitalCast registry into NPCS before it initialises the roster; putting these rows inside the
// builder would leave perfectly dressed staff with no movement, faces or schedules.
(() => {
  const staff = [
    { hz:'医护', place:'hospital3', hours:[7,22], temper:'steady',
      look:{ skin:'#d8a67d',hair:'#29231f',hairStyle:'bun',top:'#dce9e9',pants:'#394750',
             shoe:'#e7e1d5',collar:'shirt',sleeve:'half',badge:true,
             tall:.92,wide:.94,headScale:1.01,age:.22,faceSeed:8301 },
      spots:[{h0:7,h1:22,at:[-14.25,6.35],face:Math.PI,act:'work',held:null}] },
    { hz:'医护二', place:'hospital3', hours:[8,20], temper:'patient', seatY:.49,
      look:{ skin:'#c98f62',hair:'#27211e',hairStyle:'short',top:'#d9e5e7',pants:'#35424b',
             shoe:'#3a4046',collar:'shirt',glasses:true,badge:true,
             tall:1.03,wide:1.02,headScale:1.01,age:.32,faceSeed:8302 },
      spots:[{h0:8,h1:20,at:[-8.78,-3.48],face:0,act:'desk'}] },
    { hz:'护士', place:'hospital3', hours:[7,23], temper:'bustling',
      look:{ skin:'#e6b68d',hair:'#241f1c',hairStyle:'ponytail',top:'#d7e7ed',pants:'#3b4c59',
             shoe:'#edf0eb',collar:'shirt',sleeve:'half',badge:true,
             tall:.91,wide:.91,headScale:1.02,youth:.22,faceSeed:8303 },
      spots:[{h0:7,h1:23,at:[5.05,10.15],face:-Math.PI/2,act:'vend'}] },
    { hz:'医生', place:'hospital3', hours:[8,21], temper:'watchful',
      look:{ skin:'#c98f62',hair:'#27231f',hairStyle:'short',top:'#e5e8e3',pants:'#303943',
             shoe:'#343a40',collar:'shirt',glasses:true,badge:true,
             tall:1.04,wide:1.04,headScale:1.01,age:.42,faceSeed:8304 },
      spots:[{h0:8,h1:21,at:[10.08,.25],face:-Math.PI/2,act:'work',held:null}] },
    { hz:'药剂师', place:'hospital3', hours:[8,22], temper:'patient',
      look:{ skin:'#e2af88',hair:'#322a25',hairStyle:'bob',top:'#e9ece5',pants:'#3a444d',
             shoe:'#e5ded1',collar:'shirt',sleeve:'half',glasses:true,badge:true,
             tall:.94,wide:.96,headScale:1.0,age:.28,faceSeed:8305 },
      spots:[{h0:8,h1:22,at:[14.12,-3.48],face:Math.PI,act:'vend'}] },
    { hz:'超声医生', place:'hospital3', hours:[8,21], temper:'watchful',
      look:{ skin:'#d3a079',hair:'#26211e',hairStyle:'tie',top:'#e3e9e6',pants:'#34434c',
             shoe:'#343a40',collar:'shirt',glasses:true,badge:true,uniform:'coat',
             tall:.98,wide:.94,headScale:1.01,age:.34,faceSeed:8306 },
      spots:[{h0:8,h1:21,at:[1.25,.25],face:-Math.PI/2,act:'check'}] },
  ];
  const patients = [
    { hz:'病人', place:'hospital3', hours:[8,21], temper:'weary', seatY:.47,
      look:{ skin:'#d5a47d',hair:'#4b433d',hairStyle:'short',top:'#7b8a84',pants:'#3a414a',
             shoe:'#3d4247',collar:'polo',sleeve:'half',tall:.96,wide:1.06,
             stoop:.08,age:.50,faceSeed:8311 },
      spots:[{h0:8,h1:21,at:[.32,6.55],face:0,act:'sit'}] },
    { hz:'病人二', place:'hospital3', hours:[9,22], temper:'frail', seatY:.47,
      look:{ skin:'#c89d7b',hair:'#aaa59d',hairStyle:'perm',top:'#9a8066',pants:'#3c444b',
             shoe:'#41464b',collar:'polo',sleeve:'long',tall:.88,wide:1.02,
             stoop:.16,age:.82,faceSeed:8312 },
      spots:[{h0:9,h1:22,at:[2.18,9.28],face:Math.PI,act:'sit'}] },
    { hz:'病人三', place:'hospital3', hours:[8,20], temper:'bored', seatY:.47,
      look:{ skin:'#e5b58d',hair:'#29231f',hairStyle:'ponytail',top:'#607c91',pants:'#3c4654',
             shoe:'#ece5d8',sleeve:'short',bag:'tote',bagColor:'#8a6d52',
             tall:.91,wide:.92,headScale:1.02,youth:.28,faceSeed:8313 },
      spots:[{h0:8,h1:20,at:[-3.61,-10.17],face:0,act:'phone'}] },
    { hz:'病人四', place:'hospital3', hours:[8,19], temper:'brash', seatY:.47,
      look:{ skin:'#b97e51',hair:'#211c19',hairStyle:'buzz',top:'#596b70',pants:'#323a43',
             shoe:'#34393f',collar:'crew',sleeve:'short',beard:'stubble',
             tall:1.05,wide:1.12,age:.34,faceSeed:8314 },
      spots:[{h0:8,h1:19,at:[-14.65,-.92],face:0,act:'sit'}] },
    // Three patients wait on measured chairs, keeping CT, ultrasound and one treatment couch
    // available to the player. The second treatment bay remains visibly occupied; the fourth-floor
    // round is where deliberate hospital movement happens.
    { hz:'CT病人', place:'hospital3', hours:[8,20], temper:'patient', seatY:.47,
      look:{ skin:'#d6a47e',hair:'#575049',hairStyle:'short',top:'#9db9bf',pants:'#53616a',
             shoe:'#dcd7cc',collar:'crew',tall:.97,wide:1.03,age:.49,faceSeed:8321 },
      spots:[{h0:8,h1:20,at:[-10.46,-10.17],face:0,act:'sit'}] },
    { hz:'超声病人', place:'hospital3', hours:[8,21], temper:'weary', seatY:.47,
      look:{ skin:'#c8906d',hair:'#332b26',hairStyle:'bob',top:'#a2bec2',pants:'#52606a',
             shoe:'#ddd8ce',tall:.94,wide:1.01,stoop:.06,age:.42,faceSeed:8322 },
      spots:[{h0:8,h1:21,at:[2.01,-10.17],face:0,act:'sit'}] },
    { hz:'治疗病人', place:'hospital3', hours:[8,21], temper:'patient', seatY:.47,
      look:{ skin:'#e0ae86',hair:'#2d2622',hairStyle:'short',top:'#96b4bb',pants:'#4d5d66',
             shoe:'#ded9cf',tall:1.01,wide:.97,faceSeed:8323 },
      spots:[{h0:8,h1:21,at:[7.45,-10.17],face:0,act:'sit'}] },
    { hz:'治疗病人', place:'hospital3', hours:[8,21], temper:'frail', seatY:.84,
      look:{ skin:'#c59a78',hair:'#b5b0a7',hairStyle:'perm',top:'#a5bec0',pants:'#56616a',
             shoe:'#d7d3ca',tall:.88,wide:1.02,stoop:.15,age:.80,faceSeed:8324 },
      spots:[{h0:8,h1:21,at:[8.45,1.45],face:0,act:'sit'}] },
  ];
  HospitalCast.push(...staff,...patients);
})();

HospFit[3] = A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,light,thing,
    RX,RZ,H,C,col,fc,luminous,liveScreen,partitionZ,partitionX,sign,doorPlate,screen,
    infoPanel,counter,desk,chair,bench,cabinet,examBed,sink,ivStand,cart,curtainBay,
    cameraRoom,
  } = A;
  const PI=Math.PI;
  const red=C('#a93d38'), redL=C('#e4a39d'), blood=C('#8e2727');
  const film=C('#335c78'), filmL=C('#a9d6e6'), purple=C('#77648e');
  const mint=C('#b9ddd2'), aqua=C('#7abfc3'), cream=C('#f1eee2');
  const drug=[C('#d8a94b'),C('#5e94b1'),C('#bf6a61'),C('#78a377'),C('#8a76a3')];

  const markFloor = th => { th.hospitalFloor=3; return th; };
  const word = (hz,x,y,z,sentence,tr,note,o={}) =>
    markFloor(thing(hz,x,y,z,sentence,tr,note,{tag:hz,...o}));

  // Floor-three decoration stays on walls and existing worktops.  Keeping these pieces out of
  // the walkable plate matters here: every department is also a care-flow destination, and the
  // south spine must remain wide enough for a bed.  The shallow frames use the same restrained
  // municipal-hospital palette as the signs, with Beijing roof and ginkgo motifs rather than
  // generic hotel art.
  function artPanelZ(x,y,z,yaw,w,h,title,accent=fc,motif='ginkgo',tag='医院挂画') {
    const nz=Math.cos(yaw), face=z+nz*.042, ink=z+nz*.064;
    box(x,y,z,w,h,.055,col.woodD,{hard:true,gloss:.18,tag});
    box(x,y,face,w-.11,h-.11,.022,col.warm,{hard:true,mode:1,gloss:.08,tag});
    box(x,y-h*.31,ink,w-.18,.055,.018,accent,{hard:true,mode:1,tag});
    glyphs(x,y-h*.39,ink+nz*.008,yaw,title,
      {size:Math.min(.13,(w-.24)/(Math.max(1,[...title].length)*1.30)),gap:.030,
       color:col.ink,mode:1,lift:.008,tag});
    if(motif==='roof') {
      capsule(x,y+.20,ink,.024,w*.46,.024,accent,{rz:PI/2,gloss:.28,tag});
      capsule(x-w*.17,y+.29,ink,.020,w*.24,.020,accent,{rz:PI/2-.24,tag});
      capsule(x+w*.17,y+.29,ink,.020,w*.24,.020,accent,{rz:PI/2+.24,tag});
      capsule(x,y+.39,ink,.020,w*.26,.020,accent,{rz:PI/2,tag});
      for(const sx of [-.21,0,.21])
        capsule(x+sx*w,y+.05,ink,.018,.31,.018,col.woodD,{tag});
    } else if(motif==='pulse') {
      const pts=[[-.38,0],[-.22,0],[-.12,.12],[0,-.18],[.13,.08],[.22,0],[.38,0]];
      for(let i=0;i<pts.length-1;i++) {
        const a=pts[i],b=pts[i+1], dx=(b[0]-a[0])*w*.72,dy=(b[1]-a[1])*h;
        capsule(x+(a[0]+b[0])*w*.36,y+.25+(a[1]+b[1])*h*.50,ink,.018,
          Math.hypot(dx,dy),.018,accent,{rz:Math.atan2(-dx,dy),mode:1,tag});
      }
    } else {
      // A branching ginkgo spray is a particularly Beijing note and stays legible as a calm
      // organic silhouette at the game's normal camera distance.
      capsule(x-.18,y+.20,ink,.018,.62,.018,col.woodD,{rz:-.42,tag});
      capsule(x+.10,y+.28,ink,.016,.48,.016,col.woodD,{rz:.55,tag});
      for(const [dx,dy,rz] of [[-.42,.38,-.55],[-.20,.48,.34],[.10,.46,-.25],[.37,.35,.62],[.22,.14,.18]])
        ball(x+dx*w*.55,y+dy*h*.52,ink,.14*w*.55,.075*h,.018,accent,
          {rz,mode:1,gloss:.10,tag});
    }
  }

  function worktopPlant(x,surfaceY,z,s=.75,tag='绿植') {
    taper(x,surfaceY+.09,z,.22*s,.18*s,.20*s,col.woodD,{gloss:.20,tag});
    cyl(x,surfaceY+.185*s,z,.125*s,.035*s,col.warm,{gloss:.18,tag});
    for(const [dx,dz,h,rz] of [[-.06,0,.42,-.24],[.05,.015,.48,.18],[0,-.04,.35,.04]]) {
      capsule(x+dx*s,surfaceY+.20*s+h*s*.45,z+dz*s,.012*s,h*s,.012*s,col.green,
        {rz,tag});
      ball(x+(dx+Math.sin(rz)*h*.45)*s,surfaceY+.22*s+h*s*.88,z+dz*s,
        .12*s,.065*s,.065*s,col.greenL,{rz,mode:7,gloss:.08,tag});
    }
  }

  function luckyKnotZ(x,y,z,s=.78,tag='平安结') {
    box(x,y,z,.36*s,.36*s,.035,col.redD,{rz:PI/4,hard:true,mode:1,gloss:.16,tag});
    box(x,y,z-.018,.21*s,.21*s,.018,col.red,{rz:PI/4,hard:true,mode:1,tag});
    for(const side of [-1,1]) {
      capsule(x+side*.14*s,y-.34*s,z,.016*s,.38*s,.016*s,col.redD,{rz:side*.10,tag});
      for(let k=-1;k<=1;k++)
        capsule(x+side*.14*s+k*.035*s,y-.56*s,z,.010*s,.25*s,.010*s,col.red,{tag});
    }
    ball(x,y+.30*s,z,.065*s,.065*s,.025,col.yellow,{mode:1,gloss:.16,tag});
  }

  // Small waveform overlays sit just proud of an existing z-facing display.  The coloured lamp
  // is registered as a live screen too, so it visibly breathes with the same safe scene-local
  // animation used by the hospital monitors; no new global timer or per-frame allocation is
  // introduced.
  function clinicalTraceZ(x,y,z,w,color=col.green,phase=0,tag='监护数据') {
    const pts=[[-.44,0],[-.30,0],[-.20,.07],[-.11,-.10],[0,.14],[.10,-.05],[.22,.035],[.31,0],[.44,0]];
    for(let i=0;i<pts.length-1;i++) {
      const a=pts[i],b=pts[i+1], dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*.44;
      capsule(x+(a[0]+b[0])*w/2,y+(a[1]+b[1])*.22,z,.010,
        Math.hypot(dx,dy),.010,color,
        {rz:Math.atan2(-dx,dy),mode:1,glow:.06,tag});
    }
    for(let i=0;i<4;i++) box(x-w*.34+i*w*.18,y+.16,z,.08,.018,.010,
      i===3?col.yellow:col.tealL,{hard:true,mode:1,glow:.025,tag});
    liveScreen(ball(x+w*.44,y+.16,z,.038,.038,.012,color,
      {mode:1,glow:.07,tag}),phase);
  }

  function statusStackX(x,y,z,phase=0,tag='设备状态') {
    for(let i=0;i<3;i++)
      liveScreen(ball(x,y+(1-i)*.105,z,.012,.030,.030,
        [col.green,col.yellow,col.teal][i],{mode:1,glow:.055,tag}),phase+i*.55);
  }

  // ---------------------------------------------------------------- circulation and rooms
  // The 3.8 m public spine stays unobstructed between its waiting seats and the clinical doors.
  // It is wide enough for two beds to pass, which is the useful test of a hospital corridor.
  const FRONT=-5.55, SPLIT=4.12;
  // All five departments open north from the public waiting spine.  The deeper controlled rooms
  // share that sightline, so one smooth turn at the public doorway is enough for the whole suite.
  for(const [id,x0,x1,fx] of [
    ['lab',-RX+.30,-10.20,-13.25],['imaging',-9.90,-1.94,-5.90],
    ['ultrasound',-1.62,6.12,2.10],['treatment',6.44,11.06,8.62],
    ['pharmacy',11.38,RX-.30,14.05],
  ]) cameraRoom(`f3-${id}`,x0,x1,FRONT+.30,RZ-.30,fx,1.25);
  partitionZ(FRONT,-RX+.12,RX-.12,
    [[-13.25,1.55],[-5.90,1.55],[2.10,1.55],[8.62,1.55],[14.05,1.70]],
    col.wall,'科室走廊');
  partitionX(-10.05,FRONT,RZ-.12,[],col.wall,'科室隔墙');
  partitionX(-1.78,FRONT,RZ-.12,[],col.wall,'科室隔墙');
  partitionX(6.28,FRONT,RZ-.12,[],col.wall,'科室隔墙');
  // Staff circulation links treatment and the dispensary behind their public fronts. Without this
  // internal doorway, the service counter and corridor partition enclosed every stock shelf and
  // the labelled medicine refrigerator in a component no player-sized route could enter.
  partitionX(11.22,FRONT,RZ-.12,[[-1.00,1.40]],col.wall,'科室隔墙');
  partitionZ(SPLIT,-RX+.12,-10.05,[[-13.30,1.42]],col.wall,'科室隔墙');
  partitionZ(SPLIT,-10.05,-1.78,[[-5.88,1.42]],col.wall,'科室隔墙');
  partitionZ(SPLIT,-1.78,6.28,[[2.15,1.42]],col.wall,'科室隔墙');
  partitionZ(SPLIT,6.28,11.22,[[8.70,1.42]],col.wall,'科室隔墙');

  // A continuous coloured course and door numbers do more wayfinding than another directory.
  flat(0,.026,-7.30,31.3,1.18,fc,{mode:1,alpha:.10,gloss:.05,tag:'三楼'});
  sign(0,3.48,-7.30,0,'三楼 · 检查治疗 · 药房',fc,'三楼',.235);
  glyphs(0,3.08,-7.26,0,'← 化验抽血　CT X光　超声　治疗输液　药房 →',
    {size:.115,gap:.032,color:col.ink,mode:1,lift:.012,tag:'三楼'});
  for(const [x,t,n] of [[-13.25,'化验 · 抽血','301'],[-5.90,'CT检查','302'],
                         [2.10,'超声检查','303'],[8.62,'治疗室','304'],
                         [14.05,'药房','305']]) {
    doorPlate(x,2.95,FRONT-.105,0,t,t,fc);
    glyphs(x-1.02,2.95,FRONT-.112,0,n,
      {size:.105,gap:.02,color:col.ink,mode:1,lift:.010,tag:t});
  }
  // Waiting lives against the south wall, leaving the centre line and both core approaches clear.
  bench(-10.15,-10.17,4,0,'候诊椅',col.fabric);
  bench(-3.92,-10.17,4,0,'候诊椅',col.fabric);
  bench(2.32,-10.17,4,0,'候诊椅',col.fabric);
  bench(7.45,-10.17,3,0,'候诊椅',col.fabric);
  word('候诊椅',-3.92,1.03,-10.17,'检查前在这里等叫号。','Wait here until your number is called.',
    '候诊 means waiting to be seen.',{focus:[-3.92,-9.18],reach:1.55});
  screen(-8.65,2.25,-5.72,0,2.55,.88,'当前叫号  A032','叫号屏');
  screen(5.15,2.25,-5.72,0,2.55,.88,'当前叫号  C018','叫号屏');
  for(const [x,p] of [[-8.65,.2],[5.15,1.1]]) {
    for(let i=0;i<5;i++) box(x-.74+i*.37,1.96,-5.785,.25,.025,.012,
      i<3?col.green:col.wallD,{hard:true,mode:1,glow:i<3?.025:0,tag:'叫号屏'});
    liveScreen(ball(x+.96,2.50,-5.79,.040,.040,.012,col.green,
      {mode:1,glow:.06,tag:'叫号屏'}),p);
  }
  // Preparation and medication checks live above the waiting seats, where patients actually have
  // time to read them.  Numbered circles turn the messages into glanceable infographics, while
  // small leaf/pulse motifs keep the long south wall from feeling institutional and empty.
  infoPanel(-10.15,2.08,-RZ+.17,0,3.45,1.28,
    {title:'检查前核对',subtitle:'请核对姓名 · 项目 · 部位',steps:['姓名','项目','部位'],
     color:col.green,tag:'检查',motif:'leaf'});
  infoPanel(7.45,2.08,-RZ+.17,0,3.45,1.28,
    {title:'安全用药',subtitle:'请核对姓名 · 药名 · 剂量 · 时间',steps:['药名','剂量','时间'],
     color:col.green,tag:'药房',motif:'pulse'});
  artPanelZ(-14.25,2.12,-RZ+.145,0,2.35,1.12,'北京仁和 · 温暖相伴',col.red,'roof','北京挂画');

  // ================================================================ 301 化验 · 抽血
  // Blood collection is public-facing; sample analysis is behind its own controlled door.
  doorPlate(-13.30,2.83,SPLIT-.10,0,'标本化验','化验',col.red);
  glyphs(-13.30,2.46,SPLIT-.105,0,'非工作人员请勿进入',
    {size:.085,gap:.022,color:col.redD,mode:1,lift:.010,tag:'化验'});

  // Two draw stations.  Padded arms and a tray distinguish them from waiting chairs.
  for(const [x,i] of [[-14.65,1],[-11.88,2]]) {
    chair(x,-.92,0,'抽血椅',col.fabric);
    box(x+.37,.73,-.80,.54,.08,.20,col.fabric,{round:.06,mode:7,tag:'抽血'});
    box(x+.51,.39,-.80,.055,.68,.055,col.steelD,{hard:true,tag:'抽血'});
    box(x-.52,.80,-.10,.80,.07,.44,col.steel,{hard:true,gloss:.34,tag:'抽血'});
    box(x-.52,1.02,-.10,.50,.10,.28,col.white,{hard:true,tag:'抽血'});
    // Cotton jar, sharps bin and a row of capped tubes.
    cyl(x-.68,1.14,-.12,.11,.19,col.white,{gloss:.28,tag:'抽血'});
    box(x-.39,1.16,-.12,.20,.25,.22,col.yellow,{hard:true,tag:'抽血'});
    for(let k=0;k<5;k++) {
      cyl(x-.79+k*.12,1.19,.02,.025,.22,k%2?purple:blood,{gloss:.35,tag:'采血管'});
      cyl(x-.79+k*.12,1.315,.02,.030,.025,k%2?purple:blood,{tag:'采血管'});
    }
    solid(x-.87,x+.72,-1.24,-.01);
    glyphs(x,.23,-1.31,0,String(i),{size:.12,color:col.white,mode:1,tag:'抽血'});
  }
  sink(-16.20,-3.93,PI/2,'洗手池');
  cabinet(-10.52,-3.25,2.55,2.05,.44,'采血用品',col.white,PI/2);
  word('抽血',-14.65,1.35,-.72,'护士核对姓名以后再抽血。','The nurse checks your name before drawing blood.',
    '抽 is to draw out; 血 is blood.',{focus:[-14.65,-2.08],reach:1.8});
  word('采血管',-12.40,1.31,-.08,'不同颜色的盖子送去做不同化验。',
    'Different coloured caps are used for different tests.','采血管 is a blood collection tube.',
    {focus:[-12.20,-1.52],reach:1.75});

  // The laboratory behind the inner door: a long wet bench, analyser, centrifuges and samples.
  box(-15.50,.84,9.65,2.55,.12,1.00,col.steel,{hard:true,gloss:.28,tag:'化验台'});
  box(-15.50,.43,9.98,2.55,.74,.34,col.white,{hard:true,tag:'化验台'});
  solid(-16.78,-14.18,9.13,10.52);
  for(let x=-16.35;x<-14.45;x+=.30) {
    box(x,.99,9.58,.22,.08,.34,col.white,{hard:true,tag:'标本架'});
    for(let z=9.48;z<=9.70;z+=.11)
      cyl(x,1.14,z,.022,.25,(Math.round((x+17)*10)+Math.round(z*10))%2?blood:purple,
        {gloss:.28,tag:'标本'});
  }
  // Automated chemistry analyser.  The stepped, rounded shell, open sample carousel and curved
  // access hatch make it read as a benchtop laboratory instrument rather than another cupboard.
  box(-12.05,.78,8.72,2.28,.84,1.34,col.white,{gloss:.20,tag:'化验仪'});
  box(-12.05,1.28,8.80,2.10,.38,1.16,col.white,{gloss:.22,tag:'化验仪'});
  box(-12.05,1.50,8.63,1.96,.18,.82,col.wallD,{gloss:.18,tag:'化验仪'});
  // Smoked inspection lid and the circular carousel beneath it.
  ball(-12.55,1.61,8.40,.51,.10,.46,col.glass,{mode:1,alpha:.42,gloss:.58,tag:'化验仪'});
  cyl(-12.55,1.63,8.40,.39,.11,col.steelD,{gloss:.34,tag:'化验仪'});
  for(let a=0;a<8;a++) {
    const q=a*PI/4;
    cyl(-12.55+Math.sin(q)*.25,1.76,8.40+Math.cos(q)*.25,.025,.18,
      a%2?blood:purple,{tag:'标本'});
  }
  // A projecting control pod, status light and curved front access door.
  box(-11.48,1.43,8.03,.83,.54,.18,col.black,{gloss:.30,tag:'化验仪'});
  screen(-11.48,1.46,7.93,0,.70,.38,'化验中','化验仪');
  clinicalTraceZ(-11.48,1.38,7.865,.54,col.green,.25,'化验数据');
  cyl(-11.00,1.54,7.93,.035,.018,col.green,{rx:PI/2,mode:1,glow:.10,tag:'化验仪'});
  ball(-12.12,.79,8.025,.62,.31,.035,col.wallD,{gloss:.20,tag:'化验仪'});
  capsule(-12.12,.79,7.97,.26,.035,.035,col.steelD,{rz:PI/2,gloss:.48,tag:'化验仪'});
  solid(-13.30,-10.78,7.98,9.48);
  // Twin centrifuges with transparent lids.
  for(const x of [-15.45,-14.35]) {
    cyl(x,1.02,6.18,.44,.32,col.white,{gloss:.22,tag:'离心机'});
    cyl(x,1.22,6.18,.36,.10,col.glass,{mode:1,alpha:.42,gloss:.52,tag:'离心机'});
    for(let a=0;a<6;a++) {
      const q=a*PI/3;
      cyl(x+Math.sin(q)*.22,1.25,6.18+Math.cos(q)*.22,.022,.14,blood,{tag:'离心机'});
    }
  }
  word('化验',-12.05,1.64,8.46,'标本送进机器，结果会传到医生那里。',
    'The sample goes into the analyser and the result is sent to the doctor.',
    '化验 is a laboratory test or analysis.',{focus:[-12.18,6.95],reach:2.1});
  word('离心机',-15.45,1.25,6.18,'离心机把血液分成不同的部分。',
    'The centrifuge separates the blood into layers.','离心 means centrifugal separation.',
    {focus:[-14.90,5.12],reach:1.7});

  // ================================================================ 302 CT 检查
  const CTX=-5.90, CTZ=1.95, CTY=1.63;
  // Thirty-two overlapping rounded segments make a smooth annular gantry with a genuinely open
  // bore.  The inset dark liner gives the tunnel depth and keeps the device from looking like a
  // painted wall of blocks.
  for(let i=0;i<32;i++) {
    const a=i*PI/16, r=1.29;
    box(CTX+Math.cos(a)*r,CTY+Math.sin(a)*r,CTZ,.31,.56,.94,col.white,
      {rz:a,gloss:.24,tag:'CT机'});
    box(CTX+Math.cos(a)*1.01,CTY+Math.sin(a)*1.01,CTZ-.01,.16,.34,1.00,col.steelD,
      {rz:a,gloss:.25,tag:'CT机'});
    if(i===3||i===4||i===5||i===19||i===20)
      box(CTX+Math.cos(a)*1.49,CTY+Math.sin(a)*1.49,CTZ-.47,.08,.24,.11,col.teal,
        {rz:a,mode:1,glow:.08,tag:'CT机'});
  }
  // Broad rounded feet blend the circular shell into the floor instead of ending in a slab.
  ball(CTX,.25,CTZ,1.61,.42,.72,col.wallD,{gloss:.22,tag:'CT机'});
  ball(CTX,.15,CTZ,1.30,.24,.56,col.steelD,{gloss:.30,tag:'CT机'});
  ball(CTX-1.30,.73,CTZ,.30,.72,.64,col.white,{gloss:.22,tag:'CT机'});
  ball(CTX+1.30,.73,CTZ,.30,.72,.64,col.white,{gloss:.22,tag:'CT机'});
  solid(CTX-1.62,CTX+1.62,CTZ-.72,CTZ+.72);
  // The moving couch reaches through the bore from the door side.
  taper(CTX,.42,CTZ-2.18,.66,.78,.92,col.steelD,{gloss:.34,tag:'检查床'});
  box(CTX,.70,CTZ-2.02,.62,.34,3.34,col.steel,{gloss:.32,tag:'检查床'});
  box(CTX,.95,CTZ-2.00,.57,.14,3.55,col.bed,{mode:7,tag:'检查床'});
  for(const sx of [-1,1]) capsule(CTX+sx*.30,.76,CTZ-2.00,.030,3.25,.030,col.steelD,
    {rx:PI/2,gloss:.48,tag:'检查床'});
  box(CTX,1.04,CTZ-3.47,.50,.11,.52,col.white,{round:.09,mode:7,tag:'检查床'});
  for(const s of [-1,1]) capsule(CTX+s*.24,.35,CTZ-3.25,.045,.64,.045,col.steelD,{tag:'检查床'});
  solid(CTX-.38,CTX+.38,CTZ-3.88,CTZ-.58);
  // Gantry control and the operator station, tucked clear of the patient route.
  box(CTX+1.33,1.10,CTZ-.50,.20,.58,.39,col.black,{gloss:.30,tag:'CT机'});
  liveScreen(box(CTX+1.225,1.10,CTZ-.50,.025,.42,.27,col.screen,
    {hard:true,mode:1,glow:.09,tag:'CT机'}),.6);
  for(let k=0;k<3;k++) liveScreen(cyl(CTX+1.21,.88+k*.12,CTZ-.50,.026,.015,
    k===0?col.red:col.teal,{rz:PI/2,mode:1,glow:.06,tag:'CT机'}),.35+k*.52);
  desk(-8.78,-2.82,1.65,.72,'CT控制台',0,col.wood);
  screen(-8.78,1.52,-2.48,0,1.18,.70,'CT 图像','CT控制台');
  clinicalTraceZ(-8.78,1.31,-2.535,.96,col.tealL,.65,'CT数据');
  chair(-8.78,-3.48,0,'操作椅',col.fabric);
  // A lead-apron rail, intercom and a small plant turn the operator corner into a used control
  // station.  All three sit behind the desk or on its top, outside the route to the couch.
  worktopPlant(-9.32,.80,-2.80,.72,'控制台绿植');
  capsule(-8.90,1.68,-5.425,.030,2.22,.030,col.steelD,{rz:PI/2,gloss:.46,tag:'铅衣'});
  for(const x of [-9.18,-8.42]) {
    taper(x,1.04,-5.41,.58,1.18,.060,col.blueD,{gloss:.12,tag:'铅衣'});
    capsule(x,1.78,-5.425,.024,.36,.024,col.steelD,{rz:PI/2,tag:'铅衣'});
  }
  box(-7.45,1.45,-5.41,.60,.42,.055,col.white,{hard:true,gloss:.20,tag:'对讲机'});
  box(-7.45,1.45,-5.445,.43,.24,.020,col.black,{hard:true,mode:1,tag:'对讲机'});
  for(let i=0;i<3;i++) cyl(-7.61+i*.16,1.30,-5.465,.022,.014,col.teal,
    {rx:PI/2,mode:1,glow:.035,tag:'对讲机'});
  const ctAction=word('CT机',CTX,2.95,CTZ,'圆环转一圈，会拍出身体里面的断层图像。',
    'The ring rotates to make cross-sectional images of the body.',
    'CT is computed tomography; 机 is the machine.',{focus:[CTX,CTZ-4.15],reach:2.35});
  ctAction.hospitalPose={at:[CTX,CTZ-2.0],yaw:0,seatY:1.02};
  word('检查室',CTX,2.98,FRONT-.11,'这里做CT检查，先把金属物品放在外面。',
    'CT examinations are done here; leave metal objects outside.',
    '检查 is to examine or inspect; 室 is a room.',{focus:[CTX,FRONT-1.34],reach:1.85});

  // --------------------------------------------------------- X光 behind the CT suite
  doorPlate(-5.88,2.83,SPLIT-.10,0,'X光检查室','X光',col.blue);
  // A cold lightbox with four films.  Each film has a spine and paired lung fields, enough detail
  // to read as radiographs before the player is close enough to read the label.
  box(-9.88,2.24,7.62,.08,2.08,3.42,col.black,{hard:true,gloss:.24,tag:'X光片'});
  const lp=luminous(box(-9.82,2.24,7.62,.035,1.94,3.28,filmL,
    {hard:true,mode:1,glow:.10,tag:'X光片'}),.36);
  for(const [y,z] of [[2.65,6.88],[2.65,8.34],[1.82,6.88],[1.82,8.34]]) {
    box(-9.785,y,z,.022,.70,1.18,film,{hard:true,mode:1,alpha:.82,tag:'X光片'});
    ball(-9.756,y+.02,z-.22,.018,.26,.22,C('#82afc3'),{mode:1,alpha:.42,tag:'X光片'});
    ball(-9.756,y+.02,z+.22,.018,.26,.22,C('#82afc3'),{mode:1,alpha:.42,tag:'X光片'});
    capsule(-9.744,y,z,.014,.54,.014,col.white,{alpha:.62,tag:'X光片'});
    for(let r=0;r<4;r++)
      box(-9.738,y-.20+r*.13,z,.012,.022,.76,col.white,
        {hard:true,mode:1,alpha:.36,tag:'X光片'});
  }
  // Ceiling rail and a genuinely articulated X-ray tube: carriage, elbow joint, yoke, tube
  // housing and tapered collimator.  The joints make its purpose readable from across the room.
  box(-5.75,H-.35,8.05,5.55,.18,.22,col.steelD,{hard:true,gloss:.36,tag:'X光机'});
  box(-5.15,3.56,8.05,.62,.20,.48,col.white,{gloss:.24,tag:'X光机'});
  capsule(-5.15,3.10,8.05,.12,.92,.12,col.steel,{gloss:.44,tag:'X光机'});
  ball(-5.15,2.68,8.05,.25,.25,.25,col.steelD,{gloss:.48,tag:'X光机'});
  for(const z of [7.73,8.37]) capsule(-5.15,2.53,z,.085,.54,.085,col.steelD,
    {rz:PI/2,gloss:.45,tag:'X光机'});
  cyl(-5.15,2.48,8.05,.35,.58,col.white,{rz:PI/2,gloss:.25,tag:'X光机'});
  cyl(-5.15,2.48,8.37,.20,.07,col.steelD,{rz:PI/2,gloss:.45,tag:'X光机'});
  taper(-5.15,2.04,8.05,.27,.48,.38,col.steelD,{tag:'X光机'});
  box(-5.15,1.80,8.05,.46,.12,.55,col.black,{gloss:.28,tag:'X光机'});
  // Upright detector with a soft housing, sliding column, hand grips and mobile foot.
  capsule(-3.05,1.54,8.05,.12,2.74,.12,col.steelD,{gloss:.40,tag:'X光机'});
  box(-3.18,1.72,8.05,.30,2.64,1.96,col.wallD,{gloss:.18,tag:'X光机'});
  box(-3.35,1.72,8.05,.055,2.38,1.66,col.film || film,{hard:true,mode:1,alpha:.68,tag:'X光机'});
  for(const z of [7.17,8.93]) capsule(-3.20,1.72,z,.035,.54,.035,col.steel,
    {gloss:.48,tag:'X光机'});
  taper(-3.02,.16,8.05,.84,.28,1.38,col.steelD,{gloss:.34,tag:'X光机'});
  for(const z of [7.55,8.55]) cyl(-3.03,.07,z,.09,.05,col.black,{rx:PI/2,tag:'X光机'});
  // Radiographic table with rounded mattress, metal rails and a recessed pedestal.
  taper(-6.35,.45,8.05,.72,.70,.72,col.steelD,{gloss:.34,tag:'检查床'});
  box(-6.35,.73,8.05,2.35,.20,.78,col.steel,{gloss:.34,tag:'检查床'});
  box(-6.35,.87,8.05,2.25,.14,.70,col.bed,{mode:7,tag:'检查床'});
  for(const z of [7.67,8.43]) capsule(-6.35,.76,z,.035,2.10,.035,col.steelD,
    {rz:PI/2,gloss:.48,tag:'检查床'});
  solid(-7.58,-5.12,7.60,8.50);
  solid(-3.52,-2.98,6.98,9.12);
  const xrayAction=word('X光',-9.72,2.20,7.62,'灯箱上是刚拍好的胸片。','Fresh chest films are clipped to the lightbox.',
    'X光 is an X-ray; 胸片 is a chest film.',{focus:[-8.35,7.62],reach:1.85});
  xrayAction.hospitalPose={at:[-4.0,8.05],yaw:Math.PI/2};
  word('X光片',-9.72,1.65,8.55,'骨头在X光片上最亮。','Bone appears brightest on an X-ray film.',
    '片 is a sheet, plate or film.',{focus:[-8.35,8.55],reach:1.85});
  artPanelZ(-5.92,2.70,RZ-.145,PI,3.05,1.06,'影像里的生命',col.blue,'pulse','影像挂画');
  // The illuminated warning beacon and apron pegs are the familiar threshold details that make
  // an imaging room feel controlled, rather than a large machine dropped into an empty bay.
  liveScreen(cyl(-2.42,2.62,4.27,.10,.07,col.red,
    {rx:PI/2,mode:1,glow:.14,tag:'射线警示'}),1.45);
  glyphs(-2.42,2.34,4.22,PI,'射线工作中',
    {size:.10,gap:.026,color:col.redD,mode:1,lift:.010,tag:'射线警示'});

  // ================================================================ 303 超声检查
  examBed(.25,.25,0,'超声检查床',col.bed);
  // Ultrasound cart: narrow wheeled base, tapered body, height-adjustable neck, swivel monitor,
  // sloped control deck, trackball, probe cradle and cable.  Its silhouette now reads as a mobile
  // scanner rather than a computer sitting on a box.
  taper(4.55,.16,.30,1.05,.28,.72,col.steelD,{gloss:.36,tag:'超声仪'});
  ball(4.55,.66,.30,.54,.48,.35,col.white,{gloss:.20,tag:'超声仪'});
  // Shallow service covers preserve the practical cart detailing without restoring a square body.
  ball(4.55,.63,-.055,.35,.27,.025,col.wallD,{gloss:.18,tag:'超声仪'});
  taper(4.55,1.04,.30,.88,.34,.62,col.white,{rz:PI,gloss:.22,tag:'超声仪'});
  capsule(4.55,1.46,.52,.085,.66,.085,col.steelD,{gloss:.45,tag:'超声仪'});
  ball(4.55,1.71,.52,.16,.16,.16,col.steelD,{gloss:.48,tag:'超声仪'});
  box(4.55,1.88,.64,1.33,.91,.14,col.black,{gloss:.30,tag:'超声仪'});
  screen(4.55,1.88,.565,PI,1.18,.76,'超声图像','超声仪');
  clinicalTraceZ(4.55,1.64,.505,.94,col.tealL,1.15,'超声数据');
  box(4.55,1.19,.25,1.10,.12,.70,col.wallD,{rx:-.16,gloss:.22,tag:'超声仪'});
  ball(4.55,1.30,.12,.12,.06,.12,col.steelD,{gloss:.44,tag:'超声仪'});
  for(let i=0;i<7;i++) cyl(4.18+i*.12,1.32,.31,.025,.018,i===3?col.orange:col.teal,
    {mode:1,glow:.035,tag:'超声仪'});
  // Four casters and the protruding probe cradle are the small cues characteristic of a scanner.
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    capsule(4.55+sx*.38,.13,.30+sz*.23,.035,.20,.035,col.steelD,{rz:PI/2,tag:'超声仪'});
    cyl(4.55+sx*.48,.065,.30+sz*.23,.075,.045,col.black,{rx:PI/2,tag:'超声仪'});
  }
  capsule(3.93,1.10,.33,.045,.34,.045,col.steel,{rz:PI/2,tag:'超声仪'});
  capsule(3.85,1.07,.38,.055,.42,.055,col.steelD,{rz:.42,tag:'超声探头'});
  for(let i=0;i<9;i++) {
    const a=i/8*PI*1.25;
    capsule(4.02+Math.cos(a)*.26,.94-i*.018,.15+Math.sin(a)*.32,.012,.16,.012,col.black,
      {rx:PI/2,ry:a,tag:'超声探头'});
  }
  solid(3.88,5.22,-.18,.86);
  sink(5.50,-3.80,-PI/2,'洗手池');
  cabinet(5.66,2.70,2.30,1.85,.40,'超声用品',col.white,PI/2);
  // Privacy curtain closes the bed without narrowing the door approach.
  curtainBay(.25,.25,3.05,2.45,'检查帘',mint);
  // Gel, wipes and a disposable couch-roll holder live on the equipment side, not in the
  // patient's entrance path.  Their soft cylinders break up the remaining cabinet-like forms.
  for(let i=0;i<3;i++) {
    taper(5.42,1.15,1.95+i*.22,.12,.30,.12,i===0?col.tealL:col.white,
      {gloss:.22,tag:'超声用品'});
    cyl(5.42,1.33,1.95+i*.22,.035,.055,col.steelD,{tag:'超声用品'});
  }
  capsule(-1.34,1.20,-.55,.055,.58,.055,col.steelD,{rz:PI/2,gloss:.45,tag:'检查床纸'});
  cyl(-1.62,1.20,-.55,.18,.30,col.white,{rz:PI/2,gloss:.12,tag:'检查床纸'});
  const ultrasoundAction=word('超声',4.55,1.90,.64,'超声检查不用X光，屏幕上的图像会跟着探头移动。',
    'Ultrasound uses no X-rays; the image moves with the probe.',
    '超声 literally means sound beyond hearing.',{focus:[3.60,-.10],reach:1.75});
  ultrasoundAction.hospitalPose={at:[.25,.25],yaw:0,seatY:.89};
  word('超声探头',3.86,1.08,.38,'医生把探头放在皮肤上检查。',
    'The doctor places the probe on the skin to examine you.',
    '探头 is a probe or sensor.',{focus:[3.25,.20],reach:1.45});

  // ================================================================ 304 治疗室
  // Two bays face the corridor, with their carts against the side wall and the centre kept open.
  curtainBay(8.70,-2.55,3.72,2.20,'治疗帘',col.tealL);
  curtainBay(8.70,1.45,3.72,2.20,'治疗帘',col.tealL);
  examBed(8.45,-2.55,0,'治疗床',col.bed);
  examBed(8.45,1.45,0,'治疗床',col.bed);
  cart(10.36,-.46,'治疗车',col.steel);
  // Monitor, oxygen/suction panel and defibrillator make it a treatment room, not two beds.
  box(10.60,2.18,2.76,.90,.62,.10,col.wallD,{hard:true,tag:'设备带'});
  for(let i=0;i<4;i++) cyl(10.32+i*.18,2.18,2.69,.055,.035,i<2?col.green:col.yellow,
    {rx:PI/2,mode:1,glow:.045,tag:'设备带'});
  glyphs(10.60,2.54,2.68,0,'氧气',{size:.09,gap:.025,color:col.ink,mode:1,lift:.010,tag:'设备带'});
  // Rolling vital-sign monitor with a rounded shell, carry handle, swivel pole, star base and
  // dangling ECG leads.  The lit traces sit proud of the white housing instead of on a crate.
  taper(10.23,.13,-3.79,.58,.23,.58,col.steelD,{gloss:.34,tag:'监护仪'});
  for(let i=0;i<5;i++) {
    const a=i*PI*2/5;
    capsule(10.23+Math.sin(a)*.23,.11,-3.79+Math.cos(a)*.23,.025,.42,.025,col.steelD,
      {rx:PI/2,ry:a,gloss:.46,tag:'监护仪'});
    cyl(10.23+Math.sin(a)*.43,.055,-3.79+Math.cos(a)*.43,.055,.035,col.black,{tag:'监护仪'});
  }
  capsule(10.23,.72,-3.79,.055,1.18,.055,col.steelD,{gloss:.48,tag:'监护仪'});
  ball(10.23,1.24,-3.79,.13,.13,.13,col.steelD,{gloss:.48,tag:'监护仪'});
  box(10.23,1.60,-3.70,1.02,.75,.20,col.white,{gloss:.20,tag:'监护仪'});
  capsule(10.23,2.04,-3.70,.035,.58,.035,col.steelD,{rz:PI/2,gloss:.46,tag:'监护仪'});
  screen(10.23,1.62,-3.585,0,.84,.56,'心率 72','监护仪');
  clinicalTraceZ(10.23,1.47,-3.515,.68,col.green,1.65,'监护数据');
  capsule(10.23,1.70,-3.52,.016,.58,.016,col.green,{rz:PI/2,mode:1,glow:.08,tag:'监护仪'});
  for(let i=0;i<3;i++) liveScreen(cyl(10.66,1.45+i*.13,-3.585,.025,.015,
    [col.green,col.yellow,col.red][i],{rx:PI/2,mode:1,glow:.04,tag:'监护仪'}),1.1+i*.48);
  // Two flexible leads fall from the side toward the lower equipment hook.
  for(let i=0;i<6;i++) {
    const a=i/5*PI;
    capsule(10.72+Math.sin(a)*.17,1.30-i*.09,-3.67,.010,.19,.010,col.black,
      {rz:-.55+Math.cos(a)*.35,tag:'监护仪'});
  }
  solid(9.72,10.74,-4.10,-3.43);
  cabinet(10.70,3.28,1.55,1.95,.42,'治疗用品',col.white,PI/2);
  artPanelZ(10.25,2.70,SPLIT-.145,PI,1.52,.88,'安心治疗',col.teal,'ginkgo','治疗室挂画');
  // The trolley now carries recognizable wound-care supplies instead of presenting three bare
  // steel shelves: an oval instrument tray, gauze rolls, antiseptic bottles and a lidded sharps
  // cup.  Everything is within the cart footprint, so the two curtained-bed approaches stay clear.
  ball(10.36,1.065,-.46,.43,.035,.21,col.steel,{mode:7,gloss:.46,tag:'治疗车'});
  for(const [dx,c] of [[-.28,col.white],[-.09,col.white],[.12,col.warm]]) {
    cyl(10.36+dx,1.19,-.46,.070,.20,c,{gloss:.18,tag:'纱布'});
    cyl(10.36+dx,1.30,-.46,.035,.020,col.wallD,{tag:'纱布'});
  }
  for(const [dx,c] of [[.27,col.redD],[.39,col.teal]]) {
    taper(10.36+dx,1.18,-.45,.10,.24,.10,c,{gloss:.28,tag:'消毒用品'});
    cyl(10.36+dx,1.32,-.45,.035,.04,col.white,{tag:'消毒用品'});
  }
  // Wall-mounted examination lamp: two pivot joints and a shallow round reflector give the room
  // one more unmistakably clinical silhouette without putting a wheeled base in either bay.
  capsule(11.02,2.46,-.58,.045,.66,.045,col.steelD,{rz:PI/2,gloss:.46,tag:'检查灯'});
  ball(10.72,2.46,-.58,.115,.115,.115,col.steelD,{gloss:.48,tag:'检查灯'});
  capsule(10.52,2.22,-.58,.042,.62,.042,col.steelD,{rz:-.62,gloss:.46,tag:'检查灯'});
  ball(10.34,2.00,-.58,.12,.12,.12,col.steelD,{gloss:.48,tag:'检查灯'});
  taper(10.20,1.91,-.58,.42,.17,.42,col.white,{rz:PI/2,gloss:.24,tag:'检查灯'});
  luminous(cyl(10.08,1.91,-.58,.25,.055,col.warm,
    {rz:PI/2,mode:1,glow:.10,tag:'检查灯'}),.20);
  const treatmentAction=word('治疗室',8.62,2.98,FRONT-.11,'这里处理伤口，也做门诊治疗。',
    'Wounds and outpatient treatments are handled here.',
    '治疗 is medical treatment; 室 is a room.',{focus:[8.62,FRONT-1.30],reach:1.8});
  treatmentAction.hospitalPose={at:[8.45,-2.55],yaw:0,seatY:.89};
  word('治疗车',10.36,1.14,-.46,'治疗车上按顺序放着消毒用品和器械。',
    'Disinfectant and instruments are arranged on the treatment trolley.',
    '车 is a cart here, not a car.',{focus:[9.18,-.55],reach:1.7});
  word('监护仪',10.23,1.72,-3.48,'屏幕显示心率和血氧。','The screen shows heart rate and blood oxygen.',
    '监护 means monitoring and 仪 is an instrument.',{focus:[9.12,-3.20],reach:1.65});

  // ---------------------------------------------------------------- staff hygiene / clean utility annex
  // The treatment department already had an entirely unused north annex.  A compact washroom at
  // its far end and clean-utility storage along the side walls use that dead space without taking
  // a metre from a diagnostic room, the public spine, either treatment bay or the doorway line.
  partitionZ(7.25,6.28,11.22,[[8.72,1.25]],col.wall,'医护洗手间');
  doorPlate(8.72,2.82,7.15,0,'医护洗手间','医护洗手间',col.teal);
  // The opaque leaf is held open against the east return wall.  It makes the hygiene room read as
  // private while preserving the entire doorway opening in the walkable/collision layer.
  box(9.315,1.30,7.86,.055,2.48,1.16,col.wallD,
    {hard:true,gloss:.16,tag:'医护洗手间门'});
  capsule(9.275,1.15,7.50,.025,.30,.025,col.steelD,
    {rx:PI/2,gloss:.48,tag:'医护洗手间门'});
  flat(8.75,.022,9.52,4.55,4.20,col.tile,
    {mat:'tile',matScale:.34,matAmt:.42,gloss:.18,tag:'医护洗手间'});

  // Clean utility in the approach: linen cabinet, covered hamper, glove boxes and a wall-mounted
  // mop rack.  All sit against x-side walls, leaving the 1.25 m doorway centreline untouched.
  cabinet(10.72,5.65,1.72,1.90,.38,'清洁用品',col.white,PI/2);
  for(let i=0;i<3;i++) box(10.47,.78+i*.42,5.65,.08,.24,1.30,
    i===0?col.blueL:col.wallD,{hard:true,mode:1,tag:'清洁用品'});
  taper(6.82,.34,5.72,.50,.66,.50,col.wallD,{gloss:.18,tag:'污物桶'});
  ball(6.82,.69,5.72,.27,.055,.27,col.steelD,{mode:7,gloss:.34,tag:'污物桶'});
  box(6.43,1.62,6.45,.055,.24,1.05,col.teal,{hard:true,mode:1,tag:'手套'});
  glyphs(6.39,1.62,6.45,PI/2,'手套',{size:.10,gap:.025,color:col.white,mode:1,lift:.010,tag:'手套'});
  for(let i=0;i<3;i++) {
    capsule(10.97,1.28,4.75+i*.35,.022,1.30,.022,col.steelD,{tag:'清洁工具'});
    ball(10.97,.60,4.75+i*.35,.11,.20,.11,
      [col.blueL,col.greenL,col.tealL][i],{mode:7,tag:'清洁工具'});
  }

  // Rounded accessible toilet with an inset seat, compact cistern and proper flush control.
  // Its collider hugs the fixture; the centre aisle and sink approach remain open.
  ball(7.25,.42,10.18,.39,.24,.49,col.white,{mode:7,gloss:.22,tag:'坐便器'});
  ball(7.25,.55,10.09,.31,.055,.39,col.steelD,{mode:7,gloss:.18,tag:'坐便器'});
  ball(7.25,.565,10.09,.23,.032,.30,col.glass,{mode:1,alpha:.42,gloss:.38,tag:'坐便器'});
  box(7.25,.83,10.76,.66,.68,.25,col.white,{round:.11,gloss:.23,tag:'坐便器'});
  cyl(7.25,1.19,10.70,.050,.025,col.steelD,{gloss:.48,tag:'坐便器'});
  taper(7.25,.18,10.43,.48,.36,.52,col.white,{gloss:.18,tag:'坐便器'});
  solid(6.78,7.72,9.66,11.02);
  // Grab rails, toilet roll and an emergency call cord make this a plausible staff-accessible WC.
  capsule(6.43,1.02,10.18,.030,.92,.030,col.steelD,{rx:PI/2,gloss:.48,tag:'扶手'});
  capsule(6.43,1.18,10.55,.030,.56,.030,col.steelD,{gloss:.48,tag:'扶手'});
  cyl(6.43,.82,9.54,.16,.24,col.white,{rz:PI/2,gloss:.12,tag:'卫生纸'});
  capsule(6.45,1.76,9.20,.012,.96,.012,col.red,{tag:'紧急呼叫'});
  ball(6.45,1.28,9.20,.055,.055,.055,col.red,{mode:1,glow:.05,tag:'紧急呼叫'});

  // Hand-wash wall: moulded basin, large mirror, soap, paper towels and covered pedal bin.
  sink(10.55,8.68,-PI/2,'医护洗手间');
  box(11.075,2.08,8.68,.035,1.18,1.18,col.steelD,{hard:true,gloss:.34,tag:'镜子'});
  box(11.045,2.08,8.68,.018,1.06,1.06,col.glass,
    {hard:true,mode:1,alpha:.56,gloss:.68,tag:'镜子'});
  box(10.98,1.48,9.60,.18,.56,.48,col.white,{round:.06,gloss:.20,tag:'擦手纸'});
  box(10.87,1.34,9.60,.035,.12,.30,col.black,{hard:true,tag:'擦手纸'});
  box(10.99,1.42,7.88,.18,.44,.25,col.tealL,{round:.05,gloss:.20,tag:'洗手液'});
  capsule(10.87,1.58,7.88,.018,.24,.018,col.steelD,{rz:PI/2,tag:'洗手液'});
  taper(10.45,.27,10.55,.40,.54,.40,col.steelD,{gloss:.34,tag:'垃圾桶'});
  ball(10.45,.56,10.55,.22,.040,.22,col.black,{mode:7,gloss:.18,tag:'垃圾桶'});
  glyphs(9.15,2.65,11.82,PI,'七步洗手 · 保持清洁',
    {size:.13,gap:.034,color:col.tealD,mode:1,lift:.010,tag:'医护洗手间'});

  // ================================================================ 输液室
  doorPlate(2.15,2.83,SPLIT-.10,0,'输液室','输液',col.green);
  glyphs(2.15,2.47,SPLIT-.105,0,'请按座位号入座',
    {size:.09,gap:.026,color:col.green,mode:1,lift:.010,tag:'输液'});
  // Two facing banks of four seats.  Their combined bench colliders leave a 2.1 m central aisle.
  bench(1.25,6.55,4,0,'输液椅',col.fabric);
  bench(1.25,9.28,4,PI,'输液椅',col.fabric);
  for(const [z,side] of [[6.55,-1],[9.28,1]]) for(let i=0;i<4;i++) {
    const x=.32+i*.62, sx=x+side*.26;
    ivStand(sx,z+side*.62,'输液架');
    // A soft-sided translucent bag, hanger eye, drip chamber and two-part flexible line.  The
    // rounded fluid volume and pinched neck avoid the old little-box-on-a-pole silhouette.
    ball(sx,1.57,z+side*.62,.105,.18,.038,col.bed,
      {mode:1,alpha:.62,gloss:.38,tag:'输液'});
    capsule(sx,1.74,z+side*.62,.018,.12,.018,col.teal,{tag:'输液'});
    cyl(sx,1.80,z+side*.62,.027,.020,col.steelD,{tag:'输液'});
    capsule(sx,1.36,z+side*.62,.012,.25,.012,col.glass,{alpha:.76,tag:'输液'});
    ball(sx,1.29,z+side*.62,.020,.055,.020,col.glass,{alpha:.78,gloss:.45,tag:'输液'});
    capsule(sx+(x<1.25?.04:-.04),1.13,z+side*.57,.009,.34,.009,col.glass,
      {rx:.34,ry:x<1.25?.30:-.30,alpha:.76,tag:'输液'});
    capsule(sx+(x<1.25?.14:-.14),.99,z+side*.42,.009,.30,.009,col.glass,
      {rx:.70,ry:x<1.25?.45:-.45,alpha:.76,tag:'输液'});
    glyphs(x,.31,z-side*.34,side<0?0:PI,String(i+1+(z>8?4:0)),
      {size:.09,color:col.white,mode:1,tag:'输液椅'});
  }
  // Nurse station, locked drug cabinet and hand-wash point at the back.
  desk(5.06,10.42,1.65,.76,'护士站',PI/2,col.wood);
  screen(5.28,1.43,10.42,-PI/2,.76,.48,'输液单','护士站');
  statusStackX(5.225,1.43,10.69,.30,'输液状态');
  cabinet(5.72,7.30,2.70,2.05,.44,'输液药品',col.white,PI/2);
  sink(5.55,5.10,-PI/2,'洗手池');
  cart(4.90,8.50,'输液车',col.steel);
  worktopPlant(4.82,.80,10.84,.78,'输液室绿植');
  // Shift notes, an enamel tea mug and a tissue packet make the infusion desk look staffed even
  // when the nurse is away checking a drip.  They remain on the measured desk top.
  for(let i=0;i<3;i++) box(5.18,.82+i*.018,10.86,.28,.018,.42,
    i===0?col.blueL:col.warm,{hard:true,ry:-.08+i*.05,tag:'输液单'});
  cyl(5.28,.90,10.07,.075,.16,col.white,{gloss:.20,tag:'茶杯'});
  capsule(5.37,.92,10.07,.018,.16,.018,col.blueD,{rz:PI/2,tag:'茶杯'});
  artPanelZ(2.18,2.72,RZ-.145,PI,3.15,1.08,'杏林春暖 · 平安北京',col.green,'ginkgo','输液室挂画');
  const infusionAction=word('输液',-.15,1.57,7.17,'药液从袋子经过细管慢慢进入血管。',
    'Medicine runs slowly from the bag through a tube into the vein.',
    '输 means to convey; 液 means liquid.',{focus:[-.15,5.58],reach:1.9});
  infusionAction.hospitalPose={at:[.94,6.55],yaw:0,seatY:.50};
  word('输液架',2.03,1.82,9.90,'输液袋挂在架子上。','The IV bag hangs from the stand.',
    '架 is a stand or frame.',{focus:[2.72,9.05],reach:1.55});
  word('护士站',5.10,1.30,10.42,'护士在这里核对输液单和座位号。',
    'The nurse checks infusion orders and seat numbers here.',
    '站 is a station or post.',{focus:[4.05,9.85],reach:1.75});

  // ================================================================ 305 药房
  // A glazed dispensing line directly behind the door. The public side stays a convincing service
  // boundary; staff/player access to stock uses the measured internal doorway above rather than an
  // implausible squeeze around the ends of the counter.
  counter(14.05,-4.42,4.55,.78,'药房',col.green,.54);
  box(14.05,2.28,-4.02,5.08,2.42,.08,col.glass,
    {hard:true,mode:1,alpha:.30,gloss:.52,tag:'药房'});
  // Two true service hatches in front of the glass, with numbers and pass trays.
  for(const [x,n] of [[13.05,1],[15.06,2]]) {
    box(x,1.54,-3.96,1.26,.82,.12,col.black,{hard:true,tag:'取药窗口'});
    box(x,1.54,-4.03,1.12,.70,.045,col.glass,
      {hard:true,mode:1,alpha:.12,gloss:.50,tag:'取药窗口'});
    box(x,1.07,-4.35,.76,.06,.46,col.steel,{hard:true,gloss:.38,tag:'取药窗口'});
    ball(x,1.115,-4.35,.36,.035,.20,col.steel,{gloss:.48,tag:'取药窗口'});
    box(x-.18,1.17,-4.36,.30,.018,.18,col.warm,
      {hard:true,ry:(n===1?-.06:.05),mode:1,tag:'处方'});
    glyphs(x,2.23,-4.08,0,String(n),{size:.24,color:col.white,mode:1,tag:'取药窗口'});
  }
  screen(12.00,2.54,-4.08,0,1.42,.62,'请  A057','取药叫号');
  clinicalTraceZ(12.00,2.34,-4.145,1.14,col.green,.95,'取药状态');
  glyphs(14.05,3.15,-4.09,0,'门诊药房 · 取药窗口',
    {size:.18,gap:.052,color:col.green,mode:1,lift:.012,tag:'药房'});
  luckyKnotZ(16.12,2.55,-4.09,.78,'平安结');
  word('药房',14.05,1.38,-4.28,'把药方交给药剂师，再核对姓名取药。',
    'Give the prescription to the pharmacist, then check your name and collect the medicine.',
    '药 medicine + 房 room: the hospital dispensary.',{focus:[14.05,-5.92],reach:2.05});
  word('处方',13.05,1.18,-4.24,'处方上写着药名、剂量和用法。',
    'The prescription lists the medicine, dose and instructions.',
    '处方 is a medical prescription.',{focus:[13.05,-5.48],reach:1.55});

  // Tall wall shelving and two stock islands fill the working pharmacy without blocking its aisle.
  for(const z of [-1.55,1.75,5.05,8.35])
    cabinet(16.43,z,2.75,2.30,.46,'药架',col.white,PI/2);
  for(const z of [1.50,5.20,8.85]) {
    box(13.35,1.02,z,2.65,1.98,.78,col.white,{hard:true,tag:'药架'});
    for(let s=0;s<4;s++) box(13.35,.42+s*.43,z-.405,2.48,.055,.06,col.wallD,
      {hard:true,tag:'药架'});
    solid(11.98,14.72,z-.43,z+.43);
    for(let row=0;row<4;row++) for(let k=0;k<7;k++) {
      const w=.24+(k%3)*.025;
      box(12.25+k*.34,.58+row*.43,z-.455,w,.28,.16,drug[(row+k)%drug.length],
        {hard:true,mode:1,tag:'药'});
      box(12.25+k*.34,.58+row*.43,z-.545,w-.06,.07,.012,col.white,
        {hard:true,mode:1,tag:'药'});
    }
    // A few round stock bottles and soft packs interrupt the repeated carton grid while staying
    // entirely on top of the existing islands.
    for(let k=0;k<5;k++) {
      cyl(12.45+k*.43,2.13,z-.10,.070+(k%2)*.012,.22,drug[(k+2)%drug.length],
        {gloss:.24,tag:'药'});
      cyl(12.45+k*.43,2.26,z-.10,.036,.04,col.white,{tag:'药'});
    }
  }
  // Medicine refrigerator and controlled-drug safe in the back corner.
  box(15.72,1.18,10.45,1.25,2.28,.76,col.white,{hard:true,gloss:.22,tag:'药品冰箱'});
  box(15.72,1.36,10.02,1.08,1.62,.06,col.glass,
    {hard:true,mode:1,alpha:.32,gloss:.50,tag:'药品冰箱'});
  for(let y=.78;y<1.90;y+=.35) box(15.72,y,9.98,.98,.04,.11,col.steel,
    {hard:true,tag:'药品冰箱'});
  box(12.08,.78,10.54,1.15,1.48,.82,col.steelD,{hard:true,gloss:.28,tag:'保险柜'});
  cyl(12.43,.83,10.11,.10,.04,col.steel,{rx:PI/2,gloss:.52,tag:'保险柜'});
  solid(15.04,16.40,9.98,10.88);
  solid(11.46,12.70,10.08,10.98);
  word('药',13.30,1.58,5.20,'药架按药名和剂型分类。','The shelves are organised by drug name and form.',
    '药 is medicine.',{focus:[14.72,5.20],reach:1.75});
  word('药品冰箱',15.72,1.42,10.02,'有些药必须冷藏。','Some medicines must be refrigerated.',
    '药品 are pharmaceutical products; 冰箱 is a refrigerator.',
    {focus:[14.55,10.02],reach:1.65});

  // ---------------------------------------------------------------- small institutional truths
  // Fire equipment, clocks and waste sorting keep long corridors from reading as gallery space.
  box(-.15,1.28,-5.70,.80,1.10,.10,col.redD,{hard:true,gloss:.22,tag:'医疗废物'});
  glyphs(-.15,1.28,-5.77,0,'医疗废物',{size:.115,gap:.028,color:col.white,mode:1,lift:.010,tag:'医疗废物'});
  word('医疗废物',-.15,1.28,-5.77,'针头和用过的采血管不能扔进普通垃圾桶。',
    'Needles and used blood tubes cannot go in ordinary rubbish.',
    '医疗 means medical; 废物 is waste.',{focus:[-.15,-6.72],reach:1.45});
  // A clock over each end of the spine, both reading the same time.
  for(const x of [-15.2,9.8]) {
    cyl(x,2.75,-5.73,.35,.07,col.white,{rx:PI/2,gloss:.20,tag:'时钟'});
    cyl(x,2.75,-5.79,.025,.30,col.ink,{rx:PI/2,rz:.45,tag:'时钟'});
    capsule(x+.08,2.83,-5.80,.014,.22,.014,col.ink,{rz:-.70,tag:'时钟'});
  }
};
