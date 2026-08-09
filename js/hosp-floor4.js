// 北京市仁和医院 · 4F — inpatient wards, the operating suite, family visiting and rehabilitation.
HospFit[4] = A => {
  const { box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,thing,
          RX,RZ,H,col,fc,luminous,liveScreen,partitionZ,partitionX,sign,doorPlate,screen,
          infoPanel,counter,desk,chair,bench,cabinet,examBed,sink,ivStand,cart,curtainBay,
          onTick,privacyDoorZ,cameraRoom,state } = A;

  const WARD='病房', NURSE='护士站', OR='手术室', REHAB='康复训练', VISIT='探视区';

  // A compact overlay shared by bedside, theatre and recovery monitors.  It sits just in front
  // of an existing screen face: two genuinely shaped traces, a saturation bar, numbers and one
  // softly cycling status lamp.  liveScreen owns the animation, so these displays use the same
  // lazy-scene tick as the rest of the hospital and create no floor-global timers.
  function monitorData(x,y,z,yaw,w,h,tag,phase=0,accent=col.green) {
    const nx=Math.sin(yaw), nz=Math.cos(yaw), ux=Math.cos(yaw), uz=-Math.sin(yaw);
    const at=(u=0,v=0,d=0)=>[x+ux*u+nx*d,y+v,z+uz*u+nz*d];
    const segment=(u,v,len,angle,color=accent,th=.018)=>{
      const [px,py,pz]=at(u,v,.010);
      return box(px,py,pz,len,th,.012,color,
        {hard:true,ry:yaw,rz:angle,mode:1,glow:.045,tag});
    };
    // ECG trace: long calm sections and a recognisable QRS complex rather than one straight bar.
    segment(-w*.34,h*.13,w*.20,0);
    segment(-w*.205,h*.15,w*.10,.36);
    segment(-w*.135,h*.08,w*.12,-.98);
    segment(-w*.055,h*.17,w*.13,1.08);
    segment( w*.045,h*.13,w*.16,-.28);
    segment( w*.17,h*.13,w*.14,0);
    // A slower respiratory trace and a colour-coded oxygen saturation rail.
    segment(-w*.31,-h*.06,w*.18,.05,col.tealL,.014);
    segment(-w*.13,-h*.035,w*.13,.34,col.tealL,.014);
    segment( .00,-h*.06,w*.13,-.34,col.tealL,.014);
    segment( w*.13,-h*.035,w*.13,.34,col.tealL,.014);
    segment(-w*.18,-h*.23,w*.30,0,col.blueL,.022);
    segment( w*.08,-h*.23,w*.13,0,col.yellow,.022);
    const [gx,gy,gz]=at(w*.31,-h*.19,.014);
    glyphs(gx,gy,gz,yaw,'98',{size:Math.min(.105,h*.22),gap:.022,color:col.white,
      mode:1,lift:.006,tag});
    const [lx,ly,lz]=at(w*.39,h*.25,.016);
    liveScreen(ball(lx,ly,lz,.037,.037,.014,accent,
      {ry:yaw,mode:1,glow:.10,tag}),phase);
  }

  // Modern Beijing hospital art: a restrained wood frame, ginkgo leaves, a red civic roof line
  // and two large characters.  It is wall-thin and collider-free, so art can warm a waiting room
  // or rehabilitation bay without quietly narrowing an accessible route.
  function beijingPrint(x,y,z,yaw,text,accent=fc,tag='医院') {
    const nx=Math.sin(yaw), nz=Math.cos(yaw), ux=Math.cos(yaw), uz=-Math.sin(yaw);
    const at=(u=0,v=0,d=0)=>[x+ux*u+nx*d,y+v,z+uz*u+nz*d];
    const slab=(u,v,w,h,d,color,o={})=>{
      const [px,py,pz]=at(u,v,0);
      return box(px,py,pz,w,h,d,color,{hard:true,ry:yaw,...o,tag});
    };
    const stroke=(u,v,len,angle,color,th=.032)=>{
      const [px,py,pz]=at(u,v,.045);
      box(px,py,pz,len,th,.016,color,{hard:true,ry:yaw,rz:angle,mode:1,tag});
    };
    slab(0,0,2.82,1.34,.055,col.woodD,{gloss:.20});
    slab(0,0,2.62,1.16,.062,col.warm,{gloss:.08});
    // Ginkgo branch and asymmetric leaves keep the print botanical instead of diagrammatic.
    stroke(-.83,-.30,.70,.80,col.wood,.026);
    for(const [u,v,a,s] of [[-1.04,.14,-.45,.92],[-.78,.05,.52,1],[-.98,-.15,.20,.78],[-.61,.27,-.58,.88]]) {
      const [px,py,pz]=at(u,v,.055);
      ball(px,py,pz,.145*s,.070*s,.020,col.greenL,
        {ry:yaw,rz:a,mode:7,gloss:.12,tag});
    }
    // A pared-down Temple-of-Heaven roof silhouette is specifically Beijing without turning a
    // clinical room into a theme park.
    stroke(.05,.20,.92,0,col.redD,.050);
    stroke(-.22,.30,.48,-.22,col.redD,.042);
    stroke(.32,.30,.48,.22,col.redD,.042);
    stroke(.05,.38,.58,0,accent,.038);
    stroke(.05,.03,.48,Math.PI/2,col.woodD,.034);
    const [tx,ty,tz]=at(.84,-.25,.057);
    glyphs(tx,ty,tz,yaw,text,{size:.235,gap:.075,color:accent,mode:1,lift:.008,tag});
    slab(1.12,.38,.18,.18,.070,col.redD,{rz:Math.PI/4,mode:1,gloss:.10});
  }

  // Leafy floor plants use soft ellipsoids and thin stems instead of stacked cubes.  The small
  // red 安 seal on the planter is a domestic Beijing detail families bring into long stays.
  function pottedPlant(x,z,s=.85,tag='医院') {
    taper(x,.28*s,z,.52*s,.56*s,.52*s,col.woodD,{gloss:.22,tag});
    cyl(x,.56*s,z,.25*s,.08*s,col.wood,{gloss:.22,tag});
    cyl(x,.59*s,z,.21*s,.045*s,col.black,{gloss:.04,tag});
    const stems=[[-.10,.90,-.02,.72], [.07,1.08,.03,.98], [.15,.85,-.08,.55],[-.16,.78,.08,.50]];
    for(const [ox,cy,oz,len] of stems)
      capsule(x+ox*s,cy*s,z+oz*s,.018*s,len*s,.018*s,col.green,{rz:ox*1.7,tag});
    const leaves=[[-.22,1.16,.02,-.35],[-.07,1.34,.03,.45],[.14,1.47,.04,-.25],
                  [.30,1.20,-.03,.55],[.18,.98,.10,-.50],[-.25,.92,.12,.32],[-.02,1.08,-.14,-.18]];
    for(const [ox,yy,oz,a] of leaves)
      ball(x+ox*s,yy*s,z+oz*s,.18*s,.075*s,.11*s,col.greenL,
        {mode:7,ry:a,rz:a*.45,gloss:.08,tag});
    box(x,.32*s,z+.267*s,.19*s,.20*s,.018,col.redD,
      {hard:true,ry:Math.PI/4,mode:1,tag});
    glyphs(x,.32*s,z+.285*s,0,'安',{size:.105*s,color:col.white,mode:1,lift:.006,tag});
  }

  // Ward, visiting, operating and rehabilitation doors all branch off the central spine.  Each
  // footprint aims at its own activity rather than applying one blunt floor-wide camera angle.
  cameraRoom('ward-401',-RX+.30,-9.25,5.25,RZ-.30,-12.2,8.15);
  cameraRoom('ward-402',-9.05,-2.45,5.25,RZ-.30,-6.0,8.15);
  cameraRoom('isolation',-RX+.30,-14.92,9.28,RZ-.30,-15.7,10.55);
  cameraRoom('visiting',-RX+.30,-2.45,-RZ+.30,-5.25,-9.8,-8.1);
  cameraRoom('operating',2.45,9.98,5.15,RZ-.30,7.0,8.0);
  cameraRoom('recovery',10.32,RX-.30,5.15,RZ-.30,12.7,8.0);
  cameraRoom('rehabilitation',2.45,RX-.30,-RZ+.30,-5.15,8.6,-8.0);

  // ---------------------------------------------------------------- floor plan / wayfinding
  // A four-metre spine runs between ward and treatment wings.  Door openings repeat on a hospital
  // grid so a trolley can turn into every room; no furniture enters the spine itself.
  partitionX(-2.15,-RZ,RZ,[[-7.8,1.6],[-3.2,1.8],[2.3,1.8],[8.0,1.8]],col.wall,'病房走廊');
  partitionX( 2.15,-RZ,RZ,[[-7.8,1.6],[-3.0,1.8],[2.0,1.8],[7.9,1.8]],col.wall,'病房走廊');
  flat(0,.020,.15,3.55,RZ*2-.8,fc,{mode:1,alpha:.12});
  for(let z=-9;z<=9;z+=3) {
    glyphs(0,.054,z,0,z<0?'住院服务 ↑':'护士站 · 病房 ↑',
      {size:.15,gap:.040,color:col.orange,mode:1,lift:.008,tag:'病房走廊'});
  }
  sign(0,3.46,-5.40,0,'四楼  住院 · 手术 · 康复',col.orange,'病房走廊',.22);
  sign(-9.3,3.42,-4.52,0,'住院病房 · 探视',col.blue,WARD,.22);
  sign( 9.3,3.42,-4.52,0,'手术中心 · 康复',col.green,OR,.22);
  // Two compact corridor panels sit wholly inside solid wall spans between doors.  Their leaf and
  // pulse details decorate the inpatient floor while the numbered checks remain the visual focus.
  infoPanel(-1.99,1.90,-5.55,Math.PI/2,2.30,1.24,
    {title:'探视须知',subtitle:'轻声 · 洗手 · 不坐病床',steps:['轻声','洗手','探视'],
     color:col.blue,tag:VISIT,motif:'leaf'});
  infoPanel(1.99,1.90,4.95,-Math.PI/2,3.00,1.24,
    {title:'手术安全核查',subtitle:'核对患者 · 部位 · 术式',steps:['患者','部位','术式'],
     color:col.green,tag:OR,motif:'pulse'});

  // ---------------------------------------------------------------- 护士站
  // Curved-looking station assembled from three straight clinical counters around the central
  // view line.  Staff can see both ward doors and the lift without blocking the corridor.
  counter(-5.25,-2.95,5.45,1.05,NURSE,col.orange,.56);
  counter(-7.65,-1.65,2.10,.75,NURSE,col.orange,.56);
  chair(-5.6,-2.15,Math.PI,NURSE,col.fabric);
  box(-5.25,1.50,-3.49,4.72,.72,.08,col.white,{hard:true,tag:NURSE});
  glyphs(-5.25,1.58,-3.54,0,'护士站',{size:.25,gap:.075,color:col.orange,mode:1,lift:.012,tag:NURSE});
  glyphs(-5.25,1.25,-3.54,0,'NURSE STATION',{size:.08,gap:.026,color:col.inkL,mode:1,lift:.010,tag:NURSE});
  for(let i=0;i<3;i++) {
    box(-6.75+i*1.50,1.12,-2.95,.78,.06,.36,col.black,{hard:true,tag:NURSE});
    liveScreen(box(-6.75+i*1.50,1.42,-3.15,.70,.52,.035,col.screen,
      {hard:true,mode:1,glow:.07,tag:NURSE}),i*.8);
    monitorData(-6.75+i*1.50,1.42,-3.175,Math.PI,.62,.42,NURSE,i*.8,
      i===1?col.yellow:col.green);
  }
  // medicine trolley, chart rack and crash bell
  cart(-9.05,-2.0,'治疗车',col.steel);
  cabinet(-10.55,-1.70,1.45,1.72,.36,'病历夹',col.white,0);
  for(let i=0;i<7;i++) box(-11.08+i*.18,1.34,-1.47,.13,.48,.035,
    i%2?col.blueL:col.tealL,{hard:true,ry:(i-3)*.025,tag:'病历夹'});
  cyl(-3.15,1.31,-3.18,.065,.025,col.red,{rx:Math.PI/2,mode:1,glow:.06,tag:NURSE});
  pottedPlant(-11.75,-3.86,.72,NURSE);
  thing(NURSE,-5.25,1.55,-3.54,'护士站二十四小时有人，按铃也可以找护士。',
    'The nurses’ station is staffed twenty-four hours; you can also use the call bell.',
    '护士 is a nurse. 护士站 is the ward nurse base.',
    {tag:NURSE,focus:[-5.25,-4.22],reach:1.9});

  // ---------------------------------------------------------------- open-bay inpatient ward
  // Two four-bed bays rather than hotel rooms: curtains, oxygen points, bedside cupboards and a
  // family stool at every bed.  This is the institutional openness of a public inpatient ward.
  partitionZ(4.95,-RX,-2.15,[[-12.2,1.6],[-6.0,1.6]],col.wall,WARD);
  doorPlate(-12.2,2.83,4.84,0,'401病房',WARD,col.blue);
  doorPlate(-6.0,2.83,4.84,0,'402病房',WARD,col.blue);
  // Real sliding privacy leaves sit in the wall pockets while the ward is open.  The rounding
  // doctor below closes the room he is using only after passing the threshold, and opens it again
  // before leaving, so the choreography is visible without ever trapping the player.
  const wardDoors={
    '401':privacyDoorZ(-12.2,4.93,1.60,'401病房门',col.blue),
    '402':privacyDoorZ( -6.0,4.93,1.60,'402病房门',col.blue),
  };
  glyphs(-9.10,3.30,4.82,0,'住院病房',{size:.20,gap:.06,color:col.blueD,mode:1,lift:.012,tag:WARD});

  const bedRows=[[-13.8,7.3,Math.PI/2],[-10.5,7.3,Math.PI/2],[-7.2,7.3,Math.PI/2],[-3.9,7.3,Math.PI/2],
                 [-13.8,10.1,Math.PI/2],[-10.5,10.1,Math.PI/2],[-7.2,10.1,Math.PI/2],[-3.9,10.1,Math.PI/2]];
  bedRows.forEach(([x,z,yaw],i)=>{
    examBed(x,z,yaw,WARD,i%3===0?col.blueL:col.bed);
    // Rounded bedhead rail with shaped oxygen/suction sockets, call bell and patient number.
    // It reads as a manufactured service panel instead of a slab balanced beside the mattress.
    box(x+1.16,1.48,z,.09,.65,1.34,col.wallD,{hard:true,round:.09,gloss:.16,tag:WARD});
    capsule(x+1.105,1.43,z,.026,1.12,.026,col.steelD,
      {rx:Math.PI/2,gloss:.46,tag:WARD});
    ball(x+1.105,1.58,z-.27,.026,.11,.13,col.green,
      {mode:7,gloss:.22,tag:WARD});
    ball(x+1.105,1.58,z+.27,.026,.11,.13,col.yellow,
      {mode:7,gloss:.22,tag:WARD});
    ball(x+1.095,1.27,z+.38,.025,.060,.060,col.red,
      {mode:1,glow:.045,tag:WARD});
    glyphs(x+1.08,1.95,z,-Math.PI/2,String(i+1),{size:.18,color:col.blueD,mode:1,lift:.010,tag:WARD});
    // Four occupied stations show live traces without turning all eight beds into intensive care.
    if(i%2===0) {
      screen(x+1.075,2.37,z,-Math.PI/2,.72,.40,'',WARD,col.screen);
      monitorData(x+1.010,2.37,z,-Math.PI/2,.59,.30,WARD,.55*i,
        i===4?col.yellow:col.green);
    }
    // A rounded bedside cupboard, real drawer pulls, vacuum-flask handle and tubular family stool
    // soften the repeated bay while keeping every original prop footprint unchanged.
    ball(x-.72,.44,z+.72,.28,.39,.26,col.white,{mode:7,gloss:.12,tag:WARD});
    box(x-.72,.83,z+.72,.57,.055,.54,col.white,{hard:true,round:.06,gloss:.20,tag:WARD});
    for(const yy of [.39,.61]) {
      box(x-.72,yy,z+.978,.40,.16,.022,col.wallD,{hard:true,round:.035,tag:WARD});
      capsule(x-.72,yy,z+.995,.018,.18,.018,col.steelD,
        {rz:Math.PI/2,gloss:.46,tag:WARD});
    }
    taper(x-.72,.94,z+.72,.16,.34,.16,col.steel,{gloss:.42,tag:'暖水瓶'});
    cyl(x-.72,1.12,z+.72,.055,.06,col.black,{tag:'暖水瓶'});
    capsule(x-.85,.96,z+.72,.018,.22,.018,col.steelD,{tag:'暖水瓶'});
    capsule(x-.80,1.065,z+.72,.018,.10,.018,col.steelD,
      {rz:Math.PI/2,tag:'暖水瓶'});
    capsule(x-.61,1.01,z+.72,.018,.16,.018,col.steelD,
      {rz:Math.PI/2,tag:'暖水瓶'});
    ball(x-.72,.48,z-.72,.22,.055,.22,col.teal,{mode:7,gloss:.08,tag:'陪护凳'});
    for(const [ox,oz] of [[-.13,-.13],[-.13,.13],[.13,-.13],[.13,.13]])
      capsule(x-.72+ox,.25,z-.72+oz,.025,.43,.025,col.steelD,
        {gloss:.42,tag:'陪护凳'});
    if(i%3===0) {
      box(x+1.094,1.31,z-.46,.025,.20,.18,col.redD,
        {hard:true,mode:1,tag:WARD});
      glyphs(x+1.07,1.31,z-.46,-Math.PI/2,'安',
        {size:.095,color:col.white,mode:1,lift:.006,tag:WARD});
    }
    ivStand(x-.10,z-.70,'输液架');
    // Soft IV bag, hanger eye, drip chamber and line: these details make the stand clinical rather
    // than a bare metal coat rack, even when viewed from the ward entrance.
    ball(x-.10,1.57,z-.70,.105,.18,.038,col.bed,
      {mode:1,alpha:.62,gloss:.38,tag:'输液架'});
    capsule(x-.10,1.74,z-.70,.018,.12,.018,col.teal,{tag:'输液架'});
    ball(x-.10,1.29,z-.70,.020,.055,.020,col.glass,
      {mode:1,alpha:.76,gloss:.45,tag:'输液架'});
    capsule(x-.06,1.08,z-.64,.010,.40,.010,col.glass,
      {rx:.50,ry:.25,mode:1,alpha:.72,tag:'输液架'});
  });
  // Curtain tracks divide the long bay into four-bed halves; curtains are drawn open enough to
  // show the room from the corridor.
  for(const x of [-12.15,-8.85,-5.55]) {
    capsule(x,3.08,8.75,.022,3.10,.022,col.steelD,{rx:Math.PI/2,tag:'隔帘'});
    // Narrow overlapping leaves give the gathered fabric pleats and a soft scalloped edge.
    for(let k=0;k<6;k++)
      box(x,1.62,9.86+k*.19,.035,2.72,.22,col.blueL,
        {hard:true,round:.055,mode:7,alpha:.54+(k%2)*.08,tag:'隔帘'});
  }
  thing(WARD,-9.0,1.15,5.05,'病房里有八张床，白天可以探视。',
    'There are eight beds in the ward; visiting is allowed during the day.',
    '病房 is a ward; 住院 means to be admitted to hospital.',
    {tag:WARD,focus:[-9.0,5.70],reach:2.2});
  const wardBed=thing('病床',-10.5,.95,10.1,'病床旁边有呼叫铃，需要时可以按。',
    'There is a call bell beside the hospital bed.',
    '病床 is a hospital bed. 按铃叫护士 means ring for the nurse.',
    {tag:WARD,focus:[-9.55,10.1],reach:1.6});
  wardBed.hospitalPose={at:[-10.5,10.1],yaw:Math.PI/2,seatY:.89};
  thing('暖水瓶',-13.1,1.02,8.0,'家属带来了一个暖水瓶。',
    'The family brought a vacuum flask for hot water.',
    '暖水瓶 is the thermos found beside beds in Chinese hospitals.',
    {tag:'暖水瓶',focus:[-12.5,8.0],reach:1.5});

  // ---------------------------------------------------------------- visible ward rounds
  // Generic NPCs do not collide with room geometry.  A direct target inside the ward would send
  // the doctor diagonally through the partition, so every leg below stays on one of three real
  // clear lines: the nurses' work aisle, the doorway centreline and the open strip at the foot of
  // the beds.  Successive rounds alternate between 401 and 402 so both privacy doors work.
  const round={active:false,phase:'waiting',room:null,completed:0,nextAt:0};
  state.wardRound=round;
  state.wardDoors=wardDoors;
  const BASE=[-7.95,-1.15];
  let wardDoctor=null;
  const openWardDoors=()=>{
    wardDoors['401'].setOpen(true);
    wardDoors['402'].setOpen(true);
  };
  onTick((t,body,clock,dt)=>{
    round.now=t;
    if(!wardDoctor && typeof NPCS!=='undefined')
      wardDoctor=NPCS.find(n=>n.place==='hospital4'&&n.hospitalRound==='ward');
    if(!wardDoctor) { round.phase='no-doctor'; openWardDoors(); return; }

    // Nobody should be frozen behind a shut door when the shift ends while this floor is not in
    // view.  Resetting the unseen actor to the nurses' aisle also gives the next shift a clean,
    // doorway-aligned start.
    if(!wardDoctor.awake) {
      if(round.active) {
        wardDoctor.errand=null;
        wardDoctor.x=BASE[0]; wardDoctor.z=BASE[1];
        wardDoctor.wait=0; wardDoctor.ground=0;
      }
      round.active=false; round.phase='off-shift'; round.room=null;
      round.nextAt=t+3;
      openWardDoors();
      return;
    }
    if(round.active||wardDoctor.errand||t<round.nextAt) return;

    const room=round.completed%2===0?'402':'401';
    const door=wardDoors[room], dx=room==='402'?-6.0:-12.2;
    const patients=room==='402'?[-6.85,-3.55]:[-13.45,-10.15];
    round.active=true; round.phase='approaching'; round.room=room;
    door.setOpen(true);
    wardDoctor.wait=0; wardDoctor.act=undefined; wardDoctor.faceLock=false;
    wardDoctor.errand=[
      // Clear of the trolley and chart rack before turning north toward either doorway.
      {at:[dx,-.78],speed:1.05,act:'walk'},
      {at:[dx,4.18],speed:1.02,act:'walk',done:()=>{round.phase='entering';}},
      {at:[dx,5.72],speed:.82,act:'walk'},
      // Turn into the open foot-of-bed strip, then close the leaf behind the doctor.
      {at:[patients[0],6.18],speed:.72,dwell:.55,face:0,act:'check',done:()=>{
        door.setOpen(false); round.phase='checking';
      }},
      {at:[patients[0],6.18],speed:.55,dwell:4.2,face:0,act:'check'},
      {at:[patients[1],6.18],speed:.65,dwell:4.2,face:0,act:'check'},
      // Reopen from inside and wait for the leaves to clear before crossing the threshold.
      {at:[dx,5.72],speed:.78,dwell:.05,face:Math.PI,act:'wait',done:()=>{
        door.setOpen(true); round.phase='leaving';
      }},
      {at:[dx,5.72],speed:.35,dwell:1.05,face:Math.PI,act:'wait'},
      {at:[dx,4.18],speed:.88,act:'walk'},
      {at:[dx,-.78],speed:1.04,act:'walk'},
      {at:BASE.slice(),speed:1.00,dwell:1.2,face:Math.PI,act:'work',held:null,done:()=>{
        round.active=false; round.phase='waiting'; round.room=null;
        round.completed++; round.nextAt=round.now+10;
      }},
    ];
  });

  // Isolation room at the north-west corner, with an anteroom and observation window.
  partitionZ(9.0,-RX,-14.7,[[-15.7,1.25]],col.wall,'隔离病房');
  partitionX(-14.7,5.0,RZ,[[8.0,1.25]],col.wall,'隔离病房');
  box(-14.74,2.05,7.0,.055,1.05,1.45,col.glass,{hard:true,mode:1,alpha:.34,tag:'隔离病房'});
  doorPlate(-15.7,2.82,8.90,0,'隔离病房','隔离病房',col.red);
  glyphs(-15.7,2.46,8.90,0,'进入请戴口罩',{size:.105,gap:.03,color:col.redD,mode:1,lift:.010,tag:'隔离病房'});
  sink(-15.65,10.85,0,'隔离病房');
  // Wall-mounted PPE pockets keep the compact anteroom useful without consuming its turn space.
  box(-16.82,1.82,10.45,.055,1.22,1.20,col.white,
    {hard:true,round:.08,gloss:.12,tag:'隔离病房'});
  for(const [zz,c] of [[10.12,col.blueL],[10.45,col.tealL],[10.78,col.yellow]]) {
    ball(-16.775,1.63,zz,.028,.17,.135,c,
      {mode:7,gloss:.10,tag:'隔离病房'});
    capsule(-16.74,1.84,zz,.012,.20,.012,col.white,
      {rx:Math.PI/2,tag:'隔离病房'});
  }
  glyphs(-16.74,2.18,10.45,Math.PI/2,'口罩',
    {size:.13,gap:.04,color:col.redD,mode:1,lift:.006,tag:'隔离病房'});
  thing('隔离病房',-15.7,1.8,8.92,'隔离病房门口写着进入请戴口罩。',
    'The isolation-room notice says to wear a mask before entering.',
    '隔离 means isolation.',{tag:'隔离病房',focus:[-15.7,8.15],reach:1.6});

  // ---------------------------------------------------------------- family lounge / visiting
  // The south-west corner is where visitors wait outside formal visiting hours: tea boiler,
  // lockers, charging ledge and the fold-out stools families actually bring to wards.  Its unused
  // far corner now holds a true accessible patient bathroom rather than decorative dead space.
  partitionZ(-5.0,-RX,-2.15,[[-10.0,1.8],[-4.2,1.5]],col.wall,VISIT);
  partitionZ(-9.68,-RX,-13.05,[[-14.55,1.50]],col.wall,'卫生间');
  partitionX(-13.05,-RZ,-9.68,[],col.wall,'卫生间');
  doorPlate(-14.55,2.76,-9.57,Math.PI,'无障碍卫生间','卫生间',col.blue);

  // Accessible toilet: softened vitreous bowl and cistern, fold-down rails on two walls and a
  // generous clear transfer side next to the door.  Nothing projects into the visiting aisle.
  taper(-15.73,.29,-11.22,.54,.54,.62,col.white,{gloss:.24,tag:'卫生间'});
  ball(-15.73,.49,-11.18,.41,.18,.53,col.white,
    {mode:7,gloss:.25,tag:'卫生间'});
  ball(-15.73,.58,-11.18,.34,.035,.43,col.wallD,
    {mode:7,gloss:.18,tag:'卫生间'});
  ball(-15.73,.57,-11.18,.22,.022,.29,col.glass,
    {mode:1,alpha:.38,gloss:.36,tag:'卫生间'});
  box(-15.73,.84,-11.66,.72,.64,.22,col.white,
    {hard:true,round:.10,gloss:.24,tag:'卫生间'});
  cyl(-15.48,1.15,-11.67,.040,.026,col.steelD,
    {mode:1,gloss:.50,tag:'卫生间'});
  // Horizontal and vertical grab rails remain wall-mounted, with rounded returned ends.
  capsule(-16.78,.86,-11.12,.035,.94,.035,col.steelD,
    {rx:Math.PI/2,gloss:.48,tag:'卫生间'});
  capsule(-16.78,1.08,-10.67,.035,.48,.035,col.steelD,
    {gloss:.48,tag:'卫生间'});
  capsule(-15.05,.88,-11.76,.035,1.04,.035,col.steelD,
    {rz:Math.PI/2,gloss:.48,tag:'卫生间'});
  // Basin, low mirror, soap and paper dispensers all sit within seated reach.
  sink(-13.43,-10.76,Math.PI/2,'卫生间');
  box(-13.17,1.68,-10.76,.035,.86,.82,col.glass,
    {hard:true,mode:1,alpha:.40,gloss:.50,tag:'卫生间'});
  box(-13.15,1.31,-11.33,.06,.32,.24,col.white,
    {hard:true,round:.05,tag:'卫生间'});
  ball(-13.11,1.21,-11.33,.025,.040,.055,col.tealL,
    {mode:1,tag:'卫生间'});
  cyl(-16.76,.70,-10.28,.10,.08,col.white,
    {rz:Math.PI/2,tag:'卫生间'});
  capsule(-16.78,.70,-10.28,.025,.32,.025,col.steelD,
    {rx:Math.PI/2,tag:'卫生间'});
  taper(-16.33,.24,-10.08,.32,.48,.32,col.steel,
    {gloss:.34,tag:'卫生间'});
  thing('卫生间',-14.55,1.28,-9.58,'这里有病人用的无障碍卫生间。',
    'There is an accessible patient bathroom beside the ward lounge.',
    '无障碍 means accessible; 扶手 is a grab rail.',
    {tag:'卫生间',focus:[-14.55,-10.35],reach:1.7});

  doorPlate(-10.0,2.82,-5.10,Math.PI,'家属等候区',VISIT,col.blue);
  for(const z of [-8.9,-6.7]) {
    bench(-10.8,z,5,0,VISIT,col.fabric);
    bench(-6.8,z,5,0,VISIT,col.fabric);
  }
  // lockers
  for(let i=0;i<6;i++) for(let j=0;j<2;j++) {
    const x=-15.7+j*.72,z=-9.4+i*.72;
    box(x,.80,z,.60,1.48,.63,col.wallD,{hard:true,tag:'储物柜'});
    box(x,.96,z-.325,.065,.065,.025,col.steelD,{hard:true,tag:'储物柜'});
    glyphs(x,1.27,z-.34,0,String(j*6+i+1),{size:.09,color:col.inkL,mode:1,lift:.008,tag:'储物柜'});
  }
  solid(-16.05,-15.35,-9.82,-5.45);
  // charging rail and hot-water point
  box(-4.0,.92,-9.25,.54,.12,4.30,col.wood,{hard:true,tag:VISIT});
  for(let i=0;i<5;i++) {
    box(-3.69,1.08,-10.75+i*.73,.035,.22,.38,col.white,{hard:true,tag:'充电插座'});
    cyl(-3.66,1.08,-10.87+i*.73,.026,.018,col.black,{rz:Math.PI/2,tag:'充电插座'});
    cyl(-3.66,1.08,-10.63+i*.73,.026,.018,col.black,{rz:Math.PI/2,tag:'充电插座'});
  }
  // A Beijing/ginkgo print, a living plant and the ward's rounded hot-water boiler make the family
  // lounge feel maintained.  All three hug perimeter walls beyond the bench footprints.
  beijingPrint(-8.15,2.22,-11.80,0,'北京',col.blue,VISIT);
  pottedPlant(-2.82,-11.10,.78,VISIT);
  taper(-12.40,.68,-11.08,.54,1.22,.54,col.steel,{gloss:.38,tag:VISIT});
  cyl(-12.40,1.31,-11.08,.24,.09,col.steelD,{gloss:.44,tag:VISIT});
  ball(-12.40,1.39,-11.08,.070,.050,.070,col.black,{gloss:.18,tag:VISIT});
  capsule(-12.40,.79,-10.75,.025,.34,.025,col.steelD,
    {rx:Math.PI/2,gloss:.48,tag:VISIT});
  ball(-12.40,.78,-10.55,.055,.055,.055,col.red,
    {mode:1,glow:.035,tag:VISIT});
  taper(-12.40,.31,-10.50,.16,.20,.16,col.white,{gloss:.28,tag:VISIT});
  flat(-12.40,.018,-10.76,.62,.54,col.wallD,{mode:7,alpha:.55,tag:VISIT});
  thing(VISIT,-10.0,1.20,-5.12,'探视时间是下午三点到七点。',
    'Visiting hours are from three until seven in the afternoon.',
    '探视 is to visit somebody in hospital; 家属 means family member.',
    {tag:VISIT,focus:[-10.0,-5.85],reach:1.8});
  thing('充电插座',-3.7,1.08,-8.8,'等候区有手机充电插座。',
    'The waiting area has phone-charging sockets.',
    '插座 is an electrical socket.',{tag:'充电插座',focus:[-4.7,-8.8],reach:1.5});

  // ---------------------------------------------------------------- operating suite
  // A clean/dirty threshold, scrub sinks and glazed theatre window sell the suite before the
  // player reaches the table.  The theatre itself has the ring of shadowless lamps and anaesthesia
  // column that an ordinary treatment room does not.
  partitionZ(4.85,2.15,RX,[[7.0,1.5],[12.7,1.5]],col.wall,OR);
  partitionX(10.15,4.85,RZ,[[8.0,1.35]],col.wall,OR);
  doorPlate(7.0,2.83,4.73,0,'手术室',OR,col.green);
  doorPlate(12.7,2.83,4.73,0,'复苏室','复苏室',col.teal);
  // pass-through changing/scrub zone
  sink(4.00,6.05,0,'刷手池');
  sink(5.30,6.05,0,'刷手池');
  sink(6.60,6.05,0,'刷手池');
  glyphs(5.30,2.05,5.73,0,'外科刷手',{size:.16,gap:.05,color:col.green,mode:1,lift:.010,tag:'刷手池'});
  for(let i=0;i<6;i++) box(3.25+i*.62,2.25,5.05,.52,.22,.08,col.greenL,{hard:true,mode:7,tag:'口罩帽子'});
  thing('刷手池',5.30,1.25,5.82,'医生进手术室以前要刷手。',
    'Doctors scrub their hands before entering the operating theatre.',
    '刷手 is the surgical hand scrub.',{tag:'刷手池',focus:[5.30,6.70],reach:1.5});

  // Theatre behind a wide observation panel.
  box(10.10,2.13,8.1,.08,1.40,4.25,col.glass,{hard:true,mode:1,alpha:.30,gloss:.48,tag:OR});
  // The wall status display is readable from the scrub threshold.  It has the same live visual
  // language as the bedside monitors but a larger theatre-scale face and an amber warning rail.
  screen(10.02,2.56,6.35,-Math.PI/2,1.34,.78,'',OR,col.screen);
  monitorData(9.955,2.56,6.35,-Math.PI/2,1.10,.58,OR,1.15,col.green);
  glyphs(9.93,2.89,6.35,-Math.PI/2,'手术中',
    {size:.115,gap:.032,color:col.white,mode:1,lift:.006,tag:OR});
  examBed(6.95,8.65,0,OR,col.greenL);
  // A narrow pedestal and three articulated cushions make the operating table visibly distinct
  // from a ward bed.  Side rails and the head rest suggest the adjustments used in theatre.
  taper(6.95,.42,8.65,.62,.70,.62,col.steelD,{gloss:.38,tag:OR});
  box(6.95,.91,8.65,.72,.15,.92,col.greenL,{mode:7,tag:OR});
  box(6.95,.95,7.94,.66,.13,.45,col.greenL,{rx:-.13,mode:7,tag:OR});
  box(6.95,.96,9.39,.66,.13,.48,col.greenL,{rx:.12,mode:7,tag:OR});
  for(const x of [6.56,7.34]) capsule(x,.91,8.65,.025,1.46,.025,col.steelD,
    {rx:Math.PI/2,gloss:.48,tag:OR});
  // Ceiling pendant with two jointed booms and a ring of shadowless lamp lenses.
  capsule(6.15,3.74,8.65,.055,.80,.055,col.steelD,{tag:OR});
  ball(6.15,3.74,8.65,.14,.14,.14,col.steelD,{gloss:.46,tag:OR});
  capsule(6.55,3.74,8.65,.055,.82,.055,col.steelD,{rz:Math.PI/2,tag:OR});
  ball(6.95,3.74,8.65,.14,.14,.14,col.steelD,{gloss:.46,tag:OR});
  capsule(6.95,3.55,8.65,.055,.42,.055,col.steelD,{tag:OR});
  cyl(6.95,3.35,8.65,.68,.11,col.steelD,{gloss:.42,tag:OR});
  cyl(6.95,3.29,8.65,.52,.045,col.white,{gloss:.30,tag:OR});
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const p=luminous(cyl(6.95+Math.sin(a)*.42,3.26,8.65+Math.cos(a)*.42,.12,.055,col.warm,
      {mode:1,glow:.13,tag:OR}),.18);
  }
  // Anaesthesia workstation: wheeled rounded cart, drawers, flow meters, vapourisers, breathing
  // bag and corrugated hose.  These are the characteristic components missing from a plain box.
  taper(4.45,.14,9.55,.92,.24,.62,col.steelD,{gloss:.36,tag:'麻醉机'});
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    capsule(4.45+sx*.34,.12,9.55+sz*.20,.028,.18,.028,col.steelD,{rz:Math.PI/2,tag:'麻醉机'});
    cyl(4.45+sx*.44,.06,9.55+sz*.20,.065,.04,col.black,{rx:Math.PI/2,tag:'麻醉机'});
  }
  box(4.45,.72,9.55,.98,1.12,.58,col.white,{gloss:.20,tag:'麻醉机'});
  for(let i=0;i<3;i++) {
    box(4.45,.40+i*.29,9.245,.80,.22,.035,col.wallD,{hard:true,tag:'麻醉机'});
    capsule(4.45,.40+i*.29,9.215,.025,.32,.025,col.steelD,{rz:Math.PI/2,gloss:.46,tag:'麻醉机'});
  }
  // Transparent flow-meter tubes and twin colour-coded vaporisers.
  for(let i=0;i<3;i++) {
    capsule(4.10+i*.17,1.18,9.23,.040,.43,.040,col.glass,
      {mode:1,alpha:.55,gloss:.52,tag:'麻醉机'});
    ball(4.10+i*.17,1.10+i*.05,9.20,.026,.026,.026,col.teal,
      {mode:1,glow:.05,tag:'麻醉机'});
  }
  for(const [x,c] of [[4.62,col.yellow],[4.83,col.teal]]) {
    taper(x,1.15,9.25,.16,.34,.16,c,{gloss:.30,tag:'麻醉机'});
    cyl(x,1.35,9.25,.055,.05,col.steelD,{tag:'麻醉机'});
  }
  // Monitor on an articulated arm, with a luminous waveform and status lamps.
  capsule(4.45,1.57,9.55,.050,.44,.050,col.steelD,{tag:'麻醉机'});
  ball(4.45,1.77,9.55,.11,.11,.11,col.steelD,{gloss:.46,tag:'麻醉机'});
  box(4.45,1.88,9.50,.94,.62,.18,col.black,{gloss:.28,tag:'麻醉机'});
  liveScreen(box(4.45,1.88,9.395,.78,.48,.035,col.screen,
    {hard:true,mode:1,glow:.10,tag:'麻醉机'}),1.7);
  monitorData(4.45,1.88,9.35,Math.PI,.70,.40,'麻醉机',1.7,col.green);
  // Green reservoir bag and a hanging hose loop toward the patient's airway.
  ball(3.86,1.18,9.37,.17,.25,.13,col.greenL,{gloss:.24,tag:'麻醉机'});
  capsule(3.98,1.32,9.34,.024,.30,.024,col.black,{rz:-.65,tag:'麻醉机'});
  for(let i=0;i<8;i++) {
    const a=i/7*Math.PI;
    capsule(4.00+Math.sin(a)*.34,1.53-Math.cos(a)*.28,9.35,.026,.17,.026,col.steelD,
      {rz:-a+.15,tag:'麻醉机'});
  }
  // Rear oxygen cylinder completes the profile without widening the route around the table.
  cyl(3.93,.65,9.83,.14,1.18,col.green,{gloss:.34,tag:'麻醉机'});
  taper(3.93,1.28,9.83,.24,.12,.24,col.steelD,{tag:'麻醉机'});
  solid(3.88,5.02,9.2,9.9);
  // A slim rounded instrument trolley stays against the observation wall, clear of the direct
  // door-to-table approach.  Tubular legs and individual tools avoid another box-on-post cart.
  ball(8.70,.96,6.34,.58,.055,.34,col.steel,
    {mode:7,gloss:.48,tag:OR});
  ball(8.70,.82,6.34,.54,.038,.30,col.wallD,
    {mode:7,gloss:.26,tag:OR});
  for(const [ox,oz] of [[-.46,-.22],[-.46,.22],[.46,-.22],[.46,.22]]) {
    capsule(8.70+ox,.49,6.34+oz,.026,.84,.026,col.steelD,
      {gloss:.46,tag:OR});
    cyl(8.70+ox,.07,6.34+oz,.060,.035,col.black,
      {rx:Math.PI/2,tag:OR});
  }
  for(const [ox,len,a] of [[-.27,.34,-.12],[.04,.42,.08],[.31,.28,-.18]])
    capsule(8.70+ox,1.045,6.34,.015,len,.015,col.steelD,
      {rz:Math.PI/2+a,gloss:.52,tag:OR});
  cabinet(8.95,10.75,2.15,1.95,.48,'无菌柜',col.white,0);
  thing(OR,7.0,1.80,4.76,'手术室门口分清洁区和无菌区。',
    'The operating suite separates clean and sterile zones.',
    '手术 is an operation; 无菌 means sterile.',{tag:OR,focus:[7.0,5.55],reach:1.8});
  thing('麻醉机',4.45,1.55,9.44,'麻醉机旁边的屏幕显示心率。',
    'The screen by the anaesthesia machine shows the heart rate.',
    '麻醉 means anaesthesia.',{tag:'麻醉机',focus:[5.35,9.2],reach:1.6});

  // Recovery bay: two monitored beds and the final clinical checkpoint before the ward.
  for(const [x,z] of [[12.35,7.2],[14.8,9.7]]) {
    examBed(x,z,Math.PI/2,'复苏室',col.bed);
    ivStand(x-.55,z-.80,'输液架');
    ball(x-.55,1.57,z-.80,.105,.18,.038,col.bed,
      {mode:1,alpha:.62,gloss:.38,tag:'输液架'});
    ball(x-.55,1.29,z-.80,.020,.055,.020,col.glass,
      {mode:1,alpha:.76,gloss:.45,tag:'输液架'});
    capsule(x-.50,1.08,z-.75,.010,.40,.010,col.glass,
      {rx:.50,ry:.25,mode:1,alpha:.72,tag:'输液架'});
    // Wall-mounted monitor in a moulded case with swivel arm, alarm beacon, waveform and lead.
    capsule(RX-.42,2.40,z,.050,.44,.050,col.steelD,{rz:Math.PI/2,tag:'复苏室'});
    ball(RX-.62,2.40,z,.11,.11,.11,col.steelD,{gloss:.46,tag:'复苏室'});
    box(RX-.68,2.40,z,.20,.74,1.42,col.white,{gloss:.20,tag:'复苏室'});
    screen(RX-.79,2.40,z,-Math.PI/2,1.22,.56,'','复苏室',col.screen);
    monitorData(RX-.865,2.40,z,-Math.PI/2,.98,.40,'复苏室',z*.31,
      z>8?col.yellow:col.green);
    cyl(RX-.86,2.65,z+.58,.028,.016,col.red,
      {rz:Math.PI/2,mode:1,glow:.09,tag:'复苏室'});
    for(let i=0;i<5;i++) capsule(RX-.67,2.05-i*.10,z-.55+i*.08,.010,.18,.010,col.black,
      {rx:.65,tag:'复苏室'});
  }
  // Ceiling track and a compact gathered curtain allow the two recovery beds to be screened while
  // leaving the camera view and transfer route open.  Overlapping rounded leaves read as fabric.
  capsule(13.62,3.08,8.62,.024,5.10,.024,col.steelD,
    {rx:Math.PI/2,gloss:.44,tag:'复苏室'});
  for(let k=0;k<6;k++)
    box(13.62,1.67,10.76+k*.16,.038,2.58,.20,col.tealL,
      {hard:true,round:.055,mode:7,alpha:.54+(k%2)*.08,tag:'复苏室'});
  thing('复苏室',12.7,1.80,4.76,'手术以后先在复苏室观察。',
    'After an operation, patients are observed in recovery.',
    '复苏 is recovery/resuscitation.',{tag:'复苏室',focus:[12.7,5.55],reach:1.8});

  // ---------------------------------------------------------------- rehabilitation department
  partitionZ(-4.85,2.15,RX,[[6.0,1.6],[12.6,1.6]],col.wall,REHAB);
  doorPlate(6.0,2.83,-4.74,Math.PI,'康复训练',REHAB,col.green);
  // Parallel bars, height-adjustable, with a marked walking lane.
  flat(8.0,.025,-8.3,3.10,6.0,col.greenL,{mode:7,alpha:.32});
  for(const x of [7.28,8.72]) {
    capsule(x,.90,-8.3,.032,5.2,.032,col.steelD,{rx:Math.PI/2,gloss:.48,tag:REHAB});
    for(const z of [-10.5,-8.3,-6.1]) {
      capsule(x,.45,z,.035,.88,.035,col.steelD,{gloss:.48,tag:REHAB});
      capsule(x,.06,z,.030,.42,.030,col.steelD,
        {rx:Math.PI/2,gloss:.46,tag:REHAB});
    }
  }
  for(let i=0;i<7;i++) flat(8.0,.036,-10.3+i*.66,1.18,.055,col.green,{mode:1,alpha:.72,tag:REHAB});
  // training steps with rails
  for(let i=0;i<4;i++) {
    const z=-8.3+i*.36, top=.20+i*.20;
    box(4.4,.10+i*.10,z,2.0,.20+i*.20,.72,col.woodD,
      {hard:true,round:.055,tag:'训练台阶'});
    capsule(4.4,top+.018,z-.33,.030,1.84,.030,col.yellow,
      {rz:Math.PI/2,gloss:.32,tag:'训练台阶'});
  }
  for(const x of [3.55,5.25]) capsule(x,.86,-7.75,.030,2.10,.030,col.steelD,{rx:Math.PI/2-.30,tag:'训练台阶'});
  // stationary cycle and shoulder wheel
  capsule(12.0,.08,-8.95,.045,1.48,.045,col.steelD,
    {rx:Math.PI/2,gloss:.46,tag:'康复自行车'});
  capsule(12.0,.08,-9.48,.040,.78,.040,col.steelD,
    {rz:Math.PI/2,gloss:.46,tag:'康复自行车'});
  cyl(12.0,.36,-9.0,.38,.075,col.black,
    {rz:Math.PI/2,gloss:.24,tag:'康复自行车'});
  cyl(12.0,.36,-9.0,.30,.080,col.greenL,
    {rz:Math.PI/2,gloss:.28,tag:'康复自行车'});
  cyl(12.0,.36,-9.0,.085,.11,col.steelD,
    {rz:Math.PI/2,gloss:.44,tag:'康复自行车'});
  ball(12.0,.46,-9.0,.19,.28,.32,col.wallD,
    {mode:7,gloss:.24,tag:'康复自行车'});
  capsule(12.0,.54,-9.0,.04,.86,.04,col.steelD,{rx:.55,tag:'康复自行车'});
  ball(12.0,.76,-8.70,.24,.060,.17,col.fabric,
    {mode:7,gloss:.06,tag:'康复自行车'});
  capsule(12.0,.52,-8.73,.030,.46,.030,col.steelD,
    {gloss:.46,tag:'康复自行车'});
  capsule(12.0,1.08,-9.25,.025,.62,.025,col.steelD,{rz:Math.PI/2,tag:'康复自行车'});
  capsule(12.0,.36,-9.0,.025,.62,.025,col.steelD,
    {rz:Math.PI/2,gloss:.48,tag:'康复自行车'});
  for(const side of [-1,1]) {
    ball(12.0+side*.31,.36,-9.0,.11,.035,.075,col.black,
      {mode:7,gloss:.18,tag:'康复自行车'});
    ball(12.0+side*.31,1.08,-9.25,.11,.045,.055,col.black,
      {mode:7,gloss:.18,tag:'康复自行车'});
  }
  cyl(15.45,1.82,-7.15,.62,.055,col.green,{rz:Math.PI/2,gloss:.30,tag:'肩关节轮'});
  cyl(15.38,1.82,-7.15,.14,.10,col.steelD,
    {rz:Math.PI/2,gloss:.46,tag:'肩关节轮'});
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    capsule(15.38,1.82+Math.sin(a)*.45,-7.15+Math.cos(a)*.45,.016,.88,.016,col.steelD,
      {rx:Math.PI/2,ry:a,tag:'肩关节轮'});
    if(i%2===0) ball(15.29,1.82+Math.sin(a)*.53,-7.15+Math.cos(a)*.53,
      .055,.055,.055,col.wood,{gloss:.22,tag:'肩关节轮'});
  }
  // Wall art and a rack of therapy balls add colour at the quiet end of the room without entering
  // the parallel-bar lane, cycle footprint or the doorway-centred camera view.
  beijingPrint(8.0,2.25,-11.80,0,'健康',col.green,REHAB);
  for(const x of [14.58,15.72]) {
    capsule(x,.77,-10.92,.035,1.42,.035,col.steelD,{gloss:.46,tag:REHAB});
    capsule(x,.10,-10.92,.032,.46,.032,col.steelD,
      {rx:Math.PI/2,gloss:.46,tag:REHAB});
  }
  for(const [y,r,c] of [[.34,.28,col.blueL],[.82,.31,col.greenL],[1.32,.25,col.orange]]) {
    capsule(15.15,y-.27,-10.92,.026,1.10,.026,col.steelD,
      {rz:Math.PI/2,gloss:.44,tag:REHAB});
    ball(15.15,y,-10.88,r,r,r,c,{mode:7,gloss:.08,tag:REHAB});
  }
  solid(3.35,5.45,-8.9,-6.7);
  solid(11.5,12.5,-9.55,-8.45);
  thing(REHAB,8.0,1.0,-8.3,'扶着平行杠慢慢走，治疗师在旁边看着。',
    'Walk slowly between the parallel bars while the therapist watches.',
    '康复 means rehabilitation; 康复训练 is rehab exercise.',
    {tag:REHAB,focus:[8.0,-5.9],reach:2.4});
  thing('训练台阶',4.4,.80,-7.3,'练习上下台阶，先迈受伤轻的一边。',
    'Practise going up and down the steps, leading carefully.',
    '台阶 is a step or short flight of steps.',{tag:'训练台阶',focus:[5.5,-7.3],reach:1.8});
  thing('康复自行车',12.0,.95,-8.9,'康复自行车的阻力调得很轻。',
    'The rehabilitation bicycle is set to very low resistance.',
    '阻力 means resistance.',{tag:'康复自行车',focus:[11.2,-8.1],reach:1.6});

  // Discharge / inpatient services desk by the lift: the functional end of the care loop.
  counter(5.0,-2.55,4.2,.86,'出院处',col.green,.54);
  capsule(5.0,.83,-3.005,.040,3.72,.040,col.greenL,
    {rz:Math.PI/2,gloss:.30,tag:'出院处'});
  box(5.0,1.44,-3.02,3.62,.60,.07,col.white,{hard:true,tag:'出院处'});
  glyphs(5.0,1.51,-3.06,0,'出院结算',{size:.21,gap:.065,color:col.green,mode:1,lift:.012,tag:'出院处'});
  box(6.15,1.14,-2.55,.42,.07,.27,col.steelD,{hard:true,tag:'出院处'});
  box(6.15,1.18,-2.70,.34,.025,.18,col.tealL,{hard:true,mode:1,glow:.04,tag:'出院处'});
  // A small living arrangement at the service desk and a Beijing 平安 print between the rehab
  // doors make discharge feel like a cared-for destination, while every doorway remains clear.
  taper(3.62,1.23,-2.72,.18,.30,.18,col.blueL,{gloss:.28,tag:'出院处'});
  for(const [ox,a] of [[-.10,-.25],[.02,.08],[.12,.30]]) {
    capsule(3.62+ox,1.55,-2.72,.012,.42,.012,col.green,
      {rz:a,tag:'出院处'});
    ball(3.62+ox*1.8,1.73-Math.abs(ox)*.35,-2.72,.10,.045,.065,col.greenL,
      {mode:7,rz:a,tag:'出院处'});
  }
  beijingPrint(9.30,2.28,-4.72,0,'平安',col.green,'出院处');
  thing('出院处',5.0,1.45,-3.08,'医生同意以后，在这里办出院。',
    'Once the doctor agrees, complete discharge here.',
    '出院 is to leave hospital after treatment; 入院 is admission.',
    {tag:'出院处',focus:[5.0,-3.90],reach:1.8});
};

HospitalCast.push(
  { hz:'护士', place:'hospital4', temper:'busy',
    look:{skin:'#d2a07d',hair:'#27221e',hairStyle:'bun',top:'#eef0e9',pants:'#dce7e5',shoe:'#e5e2dc',uniform:'coat',faceSeed:7401},
    spots:[{h0:0,h1:24,at:[-5.6,-2.15],face:Math.PI,act:'desk'}] },
  { hz:'护士', place:'hospital4', temper:'steady',
    look:{skin:'#bf896a',hair:'#332a24',hairStyle:'tie',top:'#eef0e9',pants:'#dae5e3',shoe:'#e4e1da',uniform:'coat',faceSeed:7402},
    spots:[{h0:0,h1:24,at:[-9.0,6.25],face:0,act:'check'}] },
  { hz:'医生', place:'hospital4', temper:'steady', hospitalRound:'ward',
    look:{skin:'#c8916e',hair:'#312a26',hairStyle:'crop',glasses:true,top:'#eef0e9',pants:'#34434c',shoe:'#272c30',uniform:'coat',faceSeed:7410},
    spots:[{h0:7,h1:19,at:[-7.95,-1.15],face:Math.PI,act:'work',held:null}] },
  { hz:'医生', place:'hospital4', temper:'busy',
    look:{skin:'#d4a07a',hair:'#23201e',hairStyle:'short',top:'#eef0e9',pants:'#2f414b',shoe:'#252a2e',uniform:'coat',faceSeed:7411},
    spots:[{h0:7,h1:19,at:[6.4,7.2],face:Math.PI/2,act:'work',held:null}] },
  { hz:'护士', place:'hospital4', temper:'busy',
    look:{skin:'#c58d6c',hair:'#2c2420',hairStyle:'bun',top:'#dcebe4',pants:'#d9e4e1',shoe:'#e7e4dd',uniform:'coat',faceSeed:7412},
    spots:[{h0:0,h1:24,at:[12.0,6.2],face:0,act:'check'}] },
  { hz:'康复师', place:'hospital4', temper:'genial',
    look:{skin:'#d6a37d',hair:'#3a3029',hairStyle:'tie',top:'#dce8e0',pants:'#435761',shoe:'#e3ded1',uniform:'staff',faceSeed:7420},
    spots:[{h0:8,h1:18,at:[9.6,-7.2],face:-Math.PI/2,act:'hands'}] },
  { hz:'病人', place:'hospital4', temper:'patient',seatY:.82,
    look:{skin:'#c89271',hair:'#5f5851',hairStyle:'short',top:'#9ebbc1',pants:'#53606a',shoe:'#d9d5ca',faceSeed:7430},
    spots:[{h0:0,h1:24,at:[-10.5,7.3],face:Math.PI/2,act:'sit'}] },
  { hz:'病人', place:'hospital4', temper:'steady',seatY:.82,
    look:{skin:'#d7a682',hair:'#2a2420',hairStyle:'short',top:'#a9c5cb',pants:'#535e66',shoe:'#dad6cb',faceSeed:7431},
    spots:[{h0:0,h1:24,at:[-7.2,10.1],face:Math.PI/2,act:'sit'}] },
  // Occupied beds on both sides of the doctors' foot-of-bed route.  Distinct faces and patient
  // clothes make the ward read as people being cared for, not repeated mannequins on furniture.
  { hz:'病人', place:'hospital4', temper:'patient',seatY:.82,
    look:{skin:'#bd8668',hair:'#4b433d',hairStyle:'short',top:'#91b1b8',pants:'#59656d',shoe:'#d8d3c8',faceSeed:7432,age:.62},
    spots:[{h0:0,h1:24,at:[-13.8,7.3],face:Math.PI/2,act:'sit'}] },
  { hz:'病人', place:'hospital4', temper:'steady',seatY:.82,
    look:{skin:'#d5a17d',hair:'#29231f',hairStyle:'tie',top:'#a6c5ca',pants:'#536069',shoe:'#ded9cf',faceSeed:7433},
    spots:[{h0:0,h1:24,at:[-7.2,7.3],face:Math.PI/2,act:'sit'}] },
  { hz:'病人', place:'hospital4', temper:'patient',seatY:.82,
    look:{skin:'#c18b6e',hair:'#302925',hairStyle:'crop',top:'#98b7bd',pants:'#4f5c65',shoe:'#d9d5ca',faceSeed:7434},
    spots:[{h0:0,h1:24,at:[-3.9,7.3],face:Math.PI/2,act:'sit'}] },
  { hz:'病人', place:'hospital4', temper:'genial',seatY:.82,
    look:{skin:'#c99373',hair:'#68615a',hairStyle:'short',top:'#adc9cd',pants:'#5b666d',shoe:'#ddd8cc',faceSeed:7435,age:.70},
    spots:[{h0:0,h1:24,at:[-13.8,10.1],face:Math.PI/2,act:'sit'}] },
  { hz:'家属', place:'hospital4', temper:'patient',seatY:.50,
    look:{skin:'#c48b6a',hair:'#28231f',hairStyle:'tie',top:'#816f68',pants:'#3f4950',shoe:'#ded8cc',faceSeed:7440},
    spots:[{h0:15,h1:19,at:[-10.8,-6.7],face:0,act:'sit'}] },
  { hz:'病人', place:'hospital4', temper:'patient',
    look:{skin:'#d1a07f',hair:'#4e4740',hairStyle:'short',top:'#91afb5',pants:'#536169',shoe:'#d9d4c9',faceSeed:7441},
    spots:[{h0:8,h1:18,at:[8.0,-8.2],face:0,act:'hands'}] }
);
