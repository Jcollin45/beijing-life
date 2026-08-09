// 北京市仁和医院 · 二楼门诊科室
//
// The second floor is the hospital's outpatient workhorse.  It is arranged the way a large
// Beijing public hospital is read in practice: room numbers and department colours first, a
// central row of waiting seats, electronic 叫号 screens beside every door, and a clear route at
// each end to the lift and the enclosed fire stair.  No NPC patrols this floor.  Doctors stay at
// their desks, the nurse stays at 导诊, and patients occupy measured seats; a crowded clinic is
// convincing only while its people do not walk through the examination furniture.

HospFit[2] = A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,thing,
    RX,RZ,H,col,fc,luminous,liveScreen,onTick,partitionZ,partitionX,sign,doorPlate,screen,counter,
    infoPanel,desk,chair,bench,cabinet,examBed,sink,cart,cameraRoom,
  } = A;

  const WALL_Z = 3.15;
  const southEdges = [-13.80,-8.10,-2.40,3.30,8.00];
  const northEdges = [-RX,-10.20,-3.60,3.00,9.60,RX];
  const southRooms = [
    { num:'201', dept:'内科',     queue:'A023', x0:southEdges[0], x1:southEdges[1], side:-1, kind:'medicine', lead:true },
    { num:'202', dept:'外科',     queue:'B016', x0:southEdges[1], x1:southEdges[2], side:-1, kind:'surgery' },
    { num:'203', dept:'儿科',     queue:'C008', x0:southEdges[2], x1:southEdges[3], side:-1, kind:'child' },
    { num:'204', dept:'口腔科',   queue:'D012', x0:southEdges[3], x1:southEdges[4], side:-1, kind:'dental' },
  ];
  const northRooms = [
    { num:'205', dept:'呼吸内科', queue:'A031', x0:northEdges[0], x1:northEdges[1], side:1, kind:'medicine' },
    { num:'206', dept:'普通外科', queue:'B021', x0:northEdges[1], x1:northEdges[2], side:1, kind:'surgery' },
    { num:'207', dept:'儿童保健', queue:'C014', x0:northEdges[2], x1:northEdges[3], side:1, kind:'child' },
    { num:'208', dept:'口腔诊室', queue:'D019', x0:northEdges[3], x1:northEdges[4], side:1, kind:'dental' },
    { num:'209', dept:'专家门诊', queue:'E006', x0:northEdges[4], x1:northEdges[5], side:1, kind:'expert' },
  ];
  const rooms = southRooms.concat(northRooms);
  const queueDisplays = [];

  // Each consulting-room doorway has the same camera contract as its printed room number.  Aim
  // toward the examination area on entry, but leave the waiting spine entirely free-look.
  for(const r of rooms) {
    const cx=(r.x0+r.x1)/2;
    if(r.side>0)
      cameraRoom(`clinic-${r.num}`,r.x0+.16,r.x1-.16,WALL_Z+.30,RZ-.30,
        cx,WALL_Z+5.25);
    else
      cameraRoom(`clinic-${r.num}`,r.x0+.16,r.x1-.16,-RZ+.30,-WALL_Z-.30,
        cx,-WALL_Z-5.25);
  }

  // --------------------------------------------------------------- the outpatient plan
  // The southern block stops well short of both end walls.  These 3.2 m side aisles are the
  // direct, legible route from the waiting spine to the two pieces of shared vertical core.
  partitionZ(-WALL_Z,southEdges[0],southEdges[southEdges.length-1],
    southRooms.map(r=>[(r.x0+r.x1)/2,1.48]),col.wall,'诊室墙');
  for(const x of southEdges)
    partitionX(x,-RZ+.22,-WALL_Z,[],col.wall,'诊室墙');

  partitionZ(WALL_Z,-RX,RX,northRooms.map(r=>[(r.x0+r.x1)/2,1.48]),col.wall,'诊室墙');
  for(const x of northEdges.slice(1,-1))
    partitionX(x,WALL_Z,RZ-.22,[],col.wall,'诊室墙');

  // A warm, low-glare vinyl spine over the common tiled floor.  Two thin blue routes leave the
  // middle visually free even when every chair is occupied: one serves the north doors and one
  // the south doors.  The red line is the fire-stair route used on Chinese evacuation plans.
  flat(0,.019,0,RX*2-.50,WALL_Z*2-.16,col.warm,
    {mode:9,gloss:.10,mat:'tile',matScale:.66,matAmt:.22,tag:'候诊区'});
  flat(0,.024,2.63,RX*2-.90,.10,fc,{mode:1,alpha:.78,gloss:.08,tag:'候诊区'});
  flat(0,.024,-2.63,RX*2-.90,.10,fc,{mode:1,alpha:.78,gloss:.08,tag:'候诊区'});
  flat(-15.05,.025,-4.50,.10,15.0,col.red,{mode:1,alpha:.78,tag:'安全通道'});
  glyphs(-15.02,.035,-1.15,Math.PI/2,'安全通道',{size:.17,gap:.05,color:col.white,
    mode:1,lift:.010,tag:'安全通道'});

  // The large bilingual-style hierarchy common to municipal hospitals: institution and floor
  // in the header, departments beneath it, and the behavioural instruction in the smallest type.
  sign(0,3.56,-WALL_Z+.10,0,'二楼门诊科室',fc,'候诊区',.30);
  glyphs(0,3.18,-WALL_Z+.075,0,'OUTPATIENT CLINICS',{size:.11,gap:.035,color:col.ink,
    mode:1,lift:.012,tag:'候诊区'});
  sign(-13.05,3.42,WALL_Z-.09,Math.PI,'内科 · 外科',fc,'科室',.20);
  sign(6.25,3.42,WALL_Z-.09,Math.PI,'儿科 · 口腔科 · 专家门诊',fc,'科室',.18);

  // The common instruction board is an actual three-step diagram rather than four lines on a
  // blank rectangle.  Beijing public-hospital halls use this terse sequence because it is the
  // queue protocol a first-time patient needs.
  infoPanel(-16.78,1.83,0,Math.PI/2,3.00,2.02,
    {title:'就诊须知',subtitle:'看屏幕 · 听广播 · 请按叫号顺序就诊',
     steps:['分诊','候诊','就诊'],color:col.blue,tag:'就诊须知',motif:'leaf'});
  thing('就诊须知',-16.60,1.85,0,
    '先分诊，再候诊，请按电子屏的叫号顺序进诊室。',
    'Check in with triage, then wait until your number is called.',
    '就诊 means to see a doctor. 叫号 is the electronic queue calling a number.',
    {tag:'就诊须知',focus:[-15.25,0],reach:2.1});

  // A commissioned Beijing-health print balances the instruction board at the other end of the
  // waiting spine. It is wall-mounted and has no footprint in the lift approach.
  infoPanel(16.78,1.83,.30,-Math.PI/2,3.00,2.02,
    {title:'健康北京',subtitle:'安静候诊 · 勤洗手 · 请照顾老幼',
     steps:['洗手','候诊','问诊'],color:col.blue,tag:'北京',motif:'beijing'});
  thing('北京',16.62,1.83,.30,
    '墙上的健康北京图案借用了天坛屋顶和银杏叶的形状。',
    'The Healthy Beijing artwork borrows the roofline of the Temple of Heaven and ginkgo leaves.',
    '北京 is China\'s capital city.',{tag:'北京',focus:[15.25,.30],reach:2.0});

  // Quiet greenery and small porcelain desk pieces soften the municipal palette without turning
  // a clinical floor into a hotel lobby. Decorative plants deliberately have no collision box.
  function pottedBamboo(x,z,s=1) {
    const T={tag:'竹子'};
    taper(x,.19*s,z,.34*s,.38*s,.34*s,col.blueD,{gloss:.22,...T});
    cyl(x,.40*s,z,.35*s,.07*s,col.white,{gloss:.25,...T});
    const stems=[[-.12,.00,1.15],[-.02,.07,1.42],[.10,-.04,1.28],[.16,.08,1.02]];
    for(const [dx,dz,h] of stems) {
      capsule(x+dx*s,.43*s+h*s*.45,z+dz*s,.018*s,h*s,.018*s,col.green,
        {gloss:.14,...T});
      for(const [side,k] of [[-1,.58],[1,.78]])
        ball(x+(dx+side*.13)*s,(.43+h*k)*s,z+(dz+side*.045)*s,
          .15*s,.055*s,.075*s,side<0?col.greenL:col.green,
          {mode:7,ry:side*.55,rz:side*.42,...T});
    }
    shade(x,z,.86*s,.78*s,.14);
  }
  pottedBamboo(15.58,2.30,.92);
  thing('竹子',15.58,1.05,2.30,'候诊区放着一盆竹子，让走廊显得安静一点。',
    'A pot of bamboo makes the waiting corridor feel calmer.',
    '竹子 is bamboo.',{tag:'竹子',focus:[14.72,2.30],reach:1.55});

  // --------------------------------------------------------------- small clinical fittings
  function monitor(x,z,yaw=0,tag='电脑') {
    const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const at=(side,fore=0)=>[x+rx*side+fx*fore,z+rz*side+fz*fore];
    // Rounded white housing, inset screen, swivel joint and oval foot: a compact clinic monitor,
    // not a black cuboid balanced on a stick.
    box(x,1.20,z,.62,.44,.15,col.white,
      {round:.075,mode:7,hard:true,ry:yaw,gloss:.22,tag});
    let [sx,sz]=at(0,.082);
    box(sx,1.20,sz,.52,.34,.025,col.black,
      {round:.045,mode:7,hard:true,ry:yaw,gloss:.30,tag});
    [sx,sz]=at(0,.099);
    liveScreen(box(sx,1.20,sz,.46,.28,.012,col.screen,
      {hard:true,ry:yaw,mode:1,glow:.075,tag}),(x+z)*.21);
    glyphs(sx,1.23,sz,yaw,tag==='导诊台'?'导诊':'病历',
      {size:.075,gap:.018,color:col.white,mode:1,lift:.012,tag});
    [sx,sz]=at(.20,.102);
    liveScreen(ball(sx,1.08,sz,.025,.025,.012,col.green,
      {mode:1,glow:.06,ry:yaw,tag}),(x-z)*.17);
    ball(x,.99,z,.065,.065,.065,col.steelD,{gloss:.44,tag});
    capsule(x,.91,z,.035,.18,.035,col.steelD,{gloss:.44,tag});
    ball(x,.82,z,.27,.040,.18,col.steelD,{mode:7,ry:yaw,gloss:.40,tag});
  }

  function namePlate(x,z,yaw,text,tag='医生') {
    const swap=Math.abs(Math.sin(yaw))>.5;
    box(x,1.00,z,swap?.055:.58,.22,swap?.58:.055,col.white,
      {hard:true,ry:yaw,gloss:.22,tag});
    glyphs(x,1.00,z,yaw,text,{size:.12,gap:.035,color:col.blueD,mode:1,lift:.012,tag});
  }

  function chartRack(x,z,yaw=0,tag='病历') {
    for(let i=0;i<3;i++)
      box(x+i*.012,.925+i*.018,z-i*.010,.36,.025,.24,i===2?col.warm:col.white,
        {round:.025,mode:7,hard:true,ry:yaw,rz:.025-i*.018,gloss:.08,tag});
    capsule(x,.995,z,.020,.11,.020,fc,{rx:Math.PI/2,ry:yaw,gloss:.28,tag});
  }

  function bloodPressure(x,z,yaw=0,tag='血压计') {
    const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const at=(side,fore=0)=>[x+rx*side+fx*fore,z+rz*side+fz*fore];
    ball(x,.98,z,.22,.26,.15,col.white,{mode:7,ry:yaw,gloss:.24,tag});
    let [sx,sz]=at(0,.142);
    liveScreen(box(sx,1.02,sz,.25,.20,.018,col.screen,
      {round:.025,mode:1,hard:true,ry:yaw,glow:.06,tag}),.8+x*.1);
    glyphs(sx,1.02,sz,yaw,'120',{size:.052,gap:.012,color:col.white,mode:1,lift:.012,tag});
    [sx,sz]=at(.34,-.02);
    ball(sx,.82,sz,.16,.095,.105,col.inkL,{mode:7,ry:yaw,tag});
    for(let i=0;i<3;i++) {
      const k=i/2;
      const [cx,cz]=at(.17+.17*k,-.02-.03*Math.sin(k*Math.PI));
      capsule(cx,.86-.025*i,cz,.012,.18,.012,col.black,
        {rz:Math.PI/2-.25*i,ry:yaw,tag});
    }
  }

  function handwashMark(x,z,yaw=0) {
    const swap=Math.abs(Math.sin(yaw))>.5;
    box(x,1.92,z,swap?.045:.84,.36,swap?.84:.045,col.teal,
      {hard:true,ry:yaw,mode:1,tag:'洗手池'});
    glyphs(x,1.92,z,yaw,'七步洗手法',{size:.125,gap:.035,color:col.white,
      mode:1,lift:.012,tag:'洗手池'});
  }

  function childScale(x,z,tag='身高尺') {
    capsule(x,1.08,z,.060,2.10,.035,col.white,{gloss:.18,tag});
    for(let i=0;i<=8;i++) box(x+.10,1.74-i*.18,z-.035,i%2?.08:.14,.014,.018,fc,
      {hard:true,mode:1,tag});
    ball(x,.055,z-.31,.36,.055,.34,col.yellow,{mode:7,gloss:.16,tag});
    capsule(x,1.92,z-.04,.035,.46,.035,col.blueD,{rz:Math.PI/2,tag});
    glyphs(x,1.42,z-.045,0,'身高',{size:.14,gap:.04,color:col.blueD,mode:1,lift:.010,tag});
  }

  function playCorner(x,z) {
    flat(x,.025,z,2.20,1.80,col.blueL,{mode:7,gloss:.03,tag:'儿童角'});
    // Rounded stacking toys, a small drum and a soft panda give the paediatric rooms a recognisable
    // play corner without borrowing a branded cartoon character.
    taper(x-.64,.15,z-.34,.34,.30,.34,col.yellow,{mode:7,ry:.20,tag:'儿童角'});
    cyl(x-.12,.14,z-.42,.20,.28,col.red,{mode:7,tag:'儿童角'});
    ball(x+.42,.14,z-.34,.20,.14,.20,col.green,{mode:7,tag:'儿童角'});
    for(const s of [-1,1]) cyl(x-.12+s*.22,.14,z-.42,.045,.045,col.orange,
      {rx:Math.PI/2,tag:'儿童角'});
    // Panda: pear-shaped body, round head, ears, eye patches and four soft paws.
    ball(x+.52,.28,z+.34,.23,.29,.18,col.white,{mode:7,tag:'玩具'});
    ball(x+.52,.55,z+.30,.20,.18,.17,col.white,{mode:7,tag:'玩具'});
    for(const s of [-1,1]) {
      ball(x+.52+s*.15,.68,z+.30,.070,.070,.060,col.black,{mode:7,tag:'玩具'});
      ball(x+.52+s*.075,.57,z+.145,.055,.072,.025,col.black,{mode:7,rz:s*.38,tag:'玩具'});
      ball(x+.52+s*.20,.25,z+.30,.075,.16,.070,col.black,{mode:7,rz:s*.20,tag:'玩具'});
    }
    ball(x+.52,.49,z+.135,.030,.026,.018,col.black,{mode:7,tag:'玩具'});
    shade(x,z,2.28,1.88,.16);
  }

  function dentalChair(x,z,yaw=0) {
    const fx=Math.sin(yaw),fz=Math.cos(yaw);
    const swap=Math.abs(fx)>.5;
    cyl(x,.30,z,.38,.18,col.steelD,{gloss:.34,tag:'牙椅'});
    box(x,.61,z,1.52,.22,.64,col.blueL,
      {round:.15,mode:7,ry:yaw,tag:'牙椅'});
    box(x-fx*.63,.93,z-fz*.63,.62,.64,.64,col.blueL,
      {round:.16,mode:7,ry:yaw,rx:-.16,tag:'牙椅'});
    box(x+fx*.72,.67,z+fz*.72,.42,.14,.54,col.white,
      {round:.12,mode:7,ry:yaw,tag:'牙椅'});
    cyl(x+.78,.96,z-.40,.035,1.38,col.steelD,{gloss:.48,tag:'口腔灯'});
    capsule(x+.43,1.62,z-.25,.035,.76,.035,col.steelD,
      {rz:Math.PI/2,ry:-.32,gloss:.48,tag:'口腔灯'});
    ball(x+.10,1.62,z-.09,.30,.14,.24,col.white,{gloss:.28,tag:'口腔灯'});
    for(const sx of [-.13,0,.13]) cyl(x+.10+sx,1.55,z-.04,.045,.025,col.warm,
      {rx:Math.PI/2,mode:1,glow:.08,tag:'口腔灯'});
    solid(x-(swap?.48:.88),x+(swap?.48:.88),z-(swap?.88:.48),z+(swap?.88:.48));
  }

  function instrumentTray(x,z,tag='器械盘') {
    box(x,.93,z,.70,.055,.42,col.steel,{hard:true,gloss:.54,tag});
    cyl(x,.49,z,.025,.88,col.steelD,{gloss:.48,tag});
    for(let i=-2;i<=2;i++) capsule(x+i*.105,.975,z,.012,.24,.012,col.steelD,
      {rz:Math.PI/2,gloss:.60,tag});
    cyl(x+.24,1.04,z+.10,.055,.12,col.blueL,{gloss:.18,tag});
  }

  function deskWarmth(x,z,dir,tag='诊桌') {
    // A lidded blue-and-white tea cup and a pen pot are the small human signs found on a desk that
    // is actually used all day. They sit on the clinician edge, away from the patient handover.
    const cz=z+dir*.18;
    cyl(x+.08,.855,cz,.070,.14,col.white,{gloss:.20,tag});
    cyl(x+.08,.915,cz,.072,.018,col.blue,{gloss:.28,tag});
    ball(x+.08,.947,cz,.052,.022,.052,col.white,{mode:7,gloss:.22,tag});
    ball(x+.08,.969,cz,.016,.016,.016,col.blueD,{mode:7,tag});
    cyl(x-.58,.855,z+dir*.30,.055,.15,col.blueL,{gloss:.18,tag});
    for(const [dx,c,a] of [[-.018,col.blueD,-.08],[.018,col.red,.10]])
      capsule(x-.58+dx,.995,z+dir*.30,.010,.24,.010,c,{rz:a,tag});
  }

  function clinicPoster(cx,z,yaw,kind,dept) {
    const px=cx+(kind==='child'?1.52:.70);
    const fz=Math.cos(yaw), pz=z+fz*.045;
    const title={medicine:'心肺健康',surgery:'伤口护理',child:'快乐成长',
                 dental:'爱牙护齿',expert:'健康北京'}[kind]||'健康提示';
    const subtitle={medicine:'早发现 · 早治疗',surgery:'清洁 · 消毒 · 包扎',child:'吃好 · 睡好 · 多运动',
                    dental:'早晚刷牙 · 定期检查',expert:'仁心仁术 · 守护健康'}[kind]||'请听医生建议';
    const accent={medicine:col.blue,surgery:col.orange,child:col.yellow,
                  dental:col.teal,expert:col.red}[kind]||fc;
    box(px,2.38,z,1.62,1.08,.060,col.woodD,{hard:true,ry:yaw,gloss:.20,tag:dept});
    box(px,2.38,pz,1.48,.94,.025,col.warm,{hard:true,ry:yaw,mode:1,gloss:.08,tag:dept});
    box(px,2.70,pz+fz*.006,1.38,.22,.016,accent,{hard:true,ry:yaw,mode:1,tag:dept});
    glyphs(px,2.70,pz,yaw,title,{size:.105,gap:.025,color:col.white,mode:1,lift:.014,tag:dept});
    glyphs(px,2.12,pz,yaw,subtitle,{size:.066,gap:.015,color:col.ink,mode:1,lift:.014,tag:dept});

    if(kind==='medicine' || kind==='expert') {
      // A compact pulse line; the expert room adds the same red accent used by Beijing municipal
      // health graphics, rather than a generic stock landscape.
      for(const [dx,dy,len,a] of [[-.38,0,.24,Math.PI/2],[-.22,.05,.25,.55],[-.04,-.01,.32,-.72],
                                  [.17,.04,.24,.52],[.36,0,.22,Math.PI/2]])
        capsule(px+dx,2.39+dy,pz+fz*.008,.015,len,.012,accent,{rz:a,ry:yaw,mode:1,tag:dept});
    } else if(kind==='surgery') {
      for(const a of [-.72,.72]) capsule(px,2.40,pz+fz*.008,.050,.72,.018,col.white,
        {rz:a,ry:yaw,mode:7,tag:dept});
      ball(px,2.40,pz+fz*.012,.14,.14,.020,accent,{mode:1,ry:yaw,tag:dept});
    } else if(kind==='child') {
      for(const [dx,dy,c] of [[-.36,.05,col.red],[-.12,-.04,col.yellow],[.13,.07,col.green],[.37,-.02,col.blue]])
        ball(px+dx,2.40+dy,pz+fz*.010,.095,.095,.020,c,{mode:7,ry:yaw,tag:'儿童保健'});
    } else if(kind==='dental') {
      // Four rounded lobes and two roots make a friendly tooth silhouette without another box.
      for(const dx of [-.16,-.05,.06,.17])
        ball(px+dx,2.49,pz+fz*.010,.10,.12,.025,col.white,{mode:7,ry:yaw,tag:dept});
      for(const dx of [-.09,.09]) capsule(px+dx,2.31,pz+fz*.010,.045,.32,.018,col.white,
        {rz:dx<0?.12:-.12,ry:yaw,mode:7,tag:dept});
    }
  }

  function queueBoard(r,x,z,yaw) {
    // One two-sided shared screen supplies the luminous face; the layered content below is aimed
    // at the corridor. Four large glyph slots are rewritten in place, so a queue board changes
    // numbers without allocating props or rebuilding the scene every frame.
    screen(x,2.08,z,yaw,1.36,.78,'','叫号屏',col.screen);
    const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const at=(side,v,fore=.066)=>[x+rx*side+fx*fore,2.08+v,z+rz*side+fz*fore];
    let p=at(0,.25);
    glyphs(p[0],p[1],p[2],yaw,r.dept,{size:.066,gap:.018,color:col.tealL,mode:1,lift:.010,tag:'叫号屏'});
    p=at(0,.035);
    const digits=glyphs(p[0],p[1],p[2],yaw,r.queue,
      {size:.175,gap:.030,color:col.white,mode:1,glow:.06,lift:.010,tag:'叫号屏'});
    p=at(.12,-.245);
    glyphs(p[0],p[1],p[2],yaw,'候诊',{size:.064,gap:.016,color:col.white,mode:1,lift:.010,tag:'叫号屏'});
    p=at(.34,-.245);
    const waiting=glyphs(p[0],p[1],p[2],yaw,'2',
      {size:.070,gap:0,color:col.yellow,mode:1,glow:.04,lift:.010,tag:'叫号屏'})[0];
    p=at(.45,-.245);
    glyphs(p[0],p[1],p[2],yaw,'人',{size:.060,gap:0,color:col.white,mode:1,lift:.010,tag:'叫号屏'});
    for(let i=0;i<3;i++) {
      p=at(-.48+i*.11,-.245,.071);
      liveScreen(ball(p[0],p[1],p[2],.028,.028,.014,
        [col.green,col.yellow,col.red][i],{mode:1,glow:.05,ry:yaw,tag:'叫号屏'}),i*.65+x*.08);
    }
    queueDisplays.push({digits,waiting,prefix:r.queue[0],base:+r.queue.slice(1),phase:x*.19+z*.11});
  }

  // --------------------------------------------------------------- doors and consulting rooms
  function clinicDoor(r) {
    const x=(r.x0+r.x1)/2, z=r.side*WALL_Z;
    const faceYaw=r.side>0?0:Math.PI;
    const corridorYaw=r.side>0?Math.PI:0;
    // Blue jambs and a pale timber leaf parked fully inside the wall pocket; the opening itself
    // remains the full 1.48 m clear width needed by a wheelchair and companion.
    for(const s of [-1,1]) box(x+s*.77,1.34,z,.075,2.68,.24,fc,
      {hard:true,gloss:.20,tag:r.dept});
    box(x-.70,1.24,z+r.side*.10,.08,2.42,.88,col.wood,
      {hard:true,gloss:.20,tag:r.dept});
    doorPlate(x,2.82,z-r.side*.105,faceYaw,`${r.num}诊室`,r.dept,fc);
    queueBoard(r,x+1.38,z-r.side*.115,corridorYaw);
    glyphs(x,3.48,z-r.side*.11,faceYaw,r.dept,{size:.19,gap:.055,color:col.blueD,
      mode:1,lift:.012,tag:r.dept});
    thing(r.dept,x,2.72,z,
      `${r.num}诊室是${r.dept}。请等屏幕叫号再进去。`,
      `Room ${r.num} is ${r.dept}; wait until your number is called.`,
      '科 is a branch of study or medicine; 科室 is a hospital department.',
      {tag:r.dept,focus:[x-r.side*.03,z-r.side*1.05],reach:2.0});
    thing('叫号屏',x+1.38,2.08,z,
      '叫号屏轮流显示当前号码、候诊人数和诊室状态。',
      'The live queue screen cycles through the current number, waiting count, and clinic status.',
      '叫号 means to call a queue number.',
      {tag:'叫号屏',focus:[x+1.38,z-r.side*.92],reach:1.7});
  }

  function standardClinic(r) {
    const cx=(r.x0+r.x1)/2, dir=r.side;
    const entry=dir*WALL_Z;
    const faceDoctor=dir<0?0:Math.PI;
    const facePatient=dir<0?Math.PI:0;
    const dz=d=>entry+dir*d;
    const deskTag=r.lead?'医生':'诊桌';
    const deskX=r.kind==='dental'?cx-1.15:cx-.88;
    const deskW=r.kind==='dental'?1.35:1.62;

    // Consultation pair, with a spare family chair kept out of the doorway's centre line.
    desk(deskX,dz(3.12),deskW,.76,deskTag,0,col.wood);
    chair(deskX,dz(3.88),faceDoctor,deskTag,col.blue);
    chair(deskX,dz(2.38),facePatient,'患者椅',col.fabric);
    chair(deskX-.84,dz(2.38),facePatient,'家属椅',col.fabric);
    monitor(deskX+.54,dz(3.12),faceDoctor,deskTag);
    chartRack(deskX-.40,dz(3.12),faceDoctor,'病历');
    namePlate(deskX,dz(2.70),facePatient,r.lead?'王医生':`${r.dept}医生`,deskTag);
    deskWarmth(deskX,dz(3.12),dir,deskTag);
    shade(deskX,dz(3.12),2.10,2.35,.22);

    if(r.kind==='dental') {
      dentalChair(cx+1.25,dz(5.65),Math.PI/2);
      instrumentTray(Math.min(cx+2.15,r.x1-.62),dz(4.15),'器械盘');
      const dentalCabX=Math.max(cx-1.55,r.x0+1.12);
      cabinet(dentalCabX,dz(7.95),2.10,1.78,.40,'消毒柜',col.white,0);
      for(let i=-1;i<=1;i++) {
        cyl(dentalCabX+i*.24,1.86,dz(7.95),.050,.16,i===0?col.blueL:col.white,
          {gloss:.18,tag:'消毒柜'});
        cyl(dentalCabX+i*.24,1.95,dz(7.95),.025,.035,col.blueD,{tag:'消毒柜'});
      }
      const dentalSinkX=Math.max(cx-2.08,r.x0+.58);
      sink(dentalSinkX,dz(6.55),0,'洗手池');
      handwashMark(dentalSinkX,dz(7.02),faceDoctor);
    } else {
      examBed(cx+1.45,dz(5.85),Math.PI/2,r.kind==='child'?'儿童检查床':'检查床');
      const examCouch=thing('检查床',cx+1.45,.86,dz(5.85),
        '请按医生的要求躺到检查床上。','Lie on the examination bed when the doctor asks.',
        '检查 is to examine; 检查床 is an examination couch.',
        {tag:'检查床',focus:[cx+1.45,dz(4.72)],reach:1.9});
      examCouch.hospitalPose={at:[cx+1.45,dz(5.85)],yaw:Math.PI/2,seatY:.89};
      cabinet(cx-1.58,dz(8.10),1.95,1.76,.42,'药品柜',col.white,0);
      // Labelled bottles and rolled gauze break up the top of the otherwise very regular cabinet.
      for(let i=0;i<3;i++) {
        cyl(cx-1.88+i*.27,1.84,dz(8.10),.048,.15,
          [col.white,col.blueL,col.white][i],{gloss:.17,tag:'药品柜'});
        cyl(cx-1.88+i*.27,1.925,dz(8.10),.025,.028,col.blueD,{tag:'药品柜'});
      }
      sink(cx-2.05,dz(6.62),0,'洗手池');
      handwashMark(cx-2.05,dz(7.02),faceDoctor);
      if(r.kind==='surgery') {
        cart(cx+1.56,dz(3.66),'换药车',col.steel);
        // A tapered, lidded sharps canister plus wrapped gauze on the trolley replaces the pair of
        // squared crates previously used here.
        taper(cx+2.15,.36,dz(7.60),.40,.72,.38,col.yellow,
          {gloss:.18,tag:'锐器盒'});
        cyl(cx+2.15,.75,dz(7.60),.23,.065,col.red,{gloss:.18,tag:'锐器盒'});
        box(cx+2.15,.785,dz(7.60),.20,.018,.035,col.black,{hard:true,tag:'锐器盒'});
        for(let i=0;i<3;i++) capsule(cx+1.37+i*.19,1.06,dz(3.66),.065,.22,.065,col.white,
          {rz:Math.PI/2,tag:'换药车'});
      }
      if(r.kind==='medicine' || r.kind==='expert')
        bloodPressure(cx+1.95,dz(3.32),faceDoctor,'血压计');
      if(r.kind==='child') {
        childScale(cx-2.18,dz(5.02),'身高尺');
        playCorner(cx+1.35,dz(7.68));
        // The familiar smiling sun used on paediatric wayfinding, not a cartoon franchise.
        ball(cx,2.58,dz(8.26),.34,.34,.07,col.yellow,{mode:1,tag:'儿童保健'});
        for(let i=0;i<10;i++) {
          const a=i*Math.PI/5;
          capsule(cx+Math.sin(a)*.47,2.58+Math.cos(a)*.47,dz(8.24),.045,.22,.035,col.orange,
            {rz:-a,mode:1,tag:'儿童保健'});
        }
        if(r.num==='203') thing('玩具',cx+1.87,.52,dz(7.34),
          '儿童角里有一只软软的熊猫玩具。',
          'There is a soft panda toy in the children\'s corner.',
          '玩具 is a toy.',{tag:'玩具',focus:[cx+.40,dz(6.95)],reach:2.0});
      }
    }

    // A clinical clock and two framed hygiene reminders keep the rear wall from reading as an
    // empty domestic room.  They are all tagged to vocabulary, never made into colliders.
    cyl(cx-1.75,2.62,dz(8.45),.28,.045,col.white,
      {rx:Math.PI/2,gloss:.26,tag:'时钟'});
    capsule(cx-1.75,2.62,dz(8.40),.018,.18,.018,col.ink,
      {rz:.55,tag:'时钟'});
    capsule(cx-1.75,2.62,dz(8.39),.015,.13,.015,col.red,
      {rz:-1.05,tag:'时钟'});
    clinicPoster(cx,dz(8.45),faceDoctor,r.kind,r.dept);

    // Every consultation room has its own usable doctor focus. The room metadata is part of the
    // object rather than inferred from coordinates, so the care loop can enforce the room printed
    // on the registration slip and cannot be completed at the first convenient desk.
    glyphs(cx-.88,1.01,dz(2.68),facePatient,'医生',{size:.105,gap:.03,color:col.blueD,
      mode:1,lift:.013,tag:'医生'});
    const doctor=thing('医生',cx-.88,1.62,dz(3.88),
      `${r.dept}${r.num}诊室的医生正在坐诊，请先出示挂号条。`,
      `The doctor in ${r.dept}, room ${r.num}, is consulting; show your registration slip first.`,
      '医生 means doctor. 坐诊 means a doctor is seeing outpatients in a clinic.',
      {tag:'医生',focus:[cx-.88,dz(1.84)],reach:2.55});
    doctor.hospitalRoom=r.num;
    doctor.hospitalDept=r.dept;

    if(r.lead) {
      thing('病历',cx-1.28,.96,dz(3.12),
        '病历上记录着症状、检查和医嘱。',
        'The medical record lists symptoms, examinations, and the doctor\'s advice.',
        '病历 is a medical record; 医嘱 is a doctor\'s instruction.',
        {tag:'病历',focus:[cx-1.28,dz(1.95)],reach:2.0});
      thing('血压计',cx+1.95,.98,dz(3.32),
        '电子血压计可以量血压。','The electronic monitor measures blood pressure.',
        '量血压 means to measure blood pressure.',
        {tag:'血压计',focus:[cx+1.65,dz(2.10)],reach:2.0});
      thing('洗手池',cx-2.05,.90,dz(6.62),
        '医生每看完一位患者都要洗手。','The doctor washes her hands between patients.',
        '洗手池 is a handwashing sink.',
        {tag:'洗手池',focus:[cx-1.60,dz(5.45)],reach:1.8});
    }
  }

  for(const r of rooms) {
    clinicDoor(r);
    standardClinic(r);
  }

  // Nine lightweight displays share one floor-local tick. Only atlas characters are rewritten;
  // meshes, matrices and interaction objects stay fixed, so this remains cheap even on low-end
  // hardware. The pulse lamps are handled by the hospital's existing liveScreen loop.
  onTick(t=>{
    for(const q of queueDisplays) {
      const turn=Math.floor((t+q.phase)/5.5)%3;
      const label=q.prefix+String(q.base+turn).padStart(3,'0');
      for(let i=0;i<q.digits.length;i++) q.digits[i].ch=label[i];
      if(q.waiting) q.waiting.ch=String(1+(2-turn+3)%3);
    }
  });

  // --------------------------------------------------------------- central waiting spine
  // Benches sit between door centrelines, never in front of them.  Two facing rows leave a clear
  // 1.25 m lane along each department wall and a 1.35 m lane between the seat backs.
  const benchX=[-10.20,-3.60,3.00,9.60];
  for(const x of benchX) {
    bench(x,-1.08,4,Math.PI,'候诊椅',col.fabric);
    bench(x,1.08,4,0,'候诊椅',col.fabric);
    shade(x,-1.08,2.66,.74,.22);
    shade(x,1.08,2.66,.74,.22);
  }
  thing('候诊区',-3.60,1.25,0,
    '候诊区的蓝椅子按诊室分组，屏幕会显示下一位患者。',
    'The blue waiting chairs are grouped by consulting room; the screens show who is next.',
    '候诊 is to wait for a medical consultation.',
    {tag:'候诊区',focus:[-3.60,0],reach:3.0});
  const waitingSeat=thing('候诊椅',-3.29,.48,1.08,
    '请在候诊椅上等叫号。','Please wait on the clinic chairs until your number is called.',
    '椅 is chair; 候诊椅 is a clinic waiting chair.',
    {tag:'候诊椅',focus:[-3.60,.15],reach:2.0});
  waitingSeat.hospitalPose={at:[-3.29,1.08],yaw:0,seatY:.50};

  // 导诊 occupies the east end but stops 90 cm short of the lift route.  The low end lets a
  // wheelchair user speak to the nurse without having to reach over a standing-height counter.
  counter(11.70,1.72,3.25,.72,'导诊台',fc,.52);
  box(13.08,.40,1.72,.52,.80,.74,fc,{hard:true,gloss:.18,tag:'导诊台'});
  box(13.08,.83,1.72,.62,.06,.82,col.white,{hard:true,gloss:.22,tag:'导诊台'});
  sign(11.55,2.82,2.94,Math.PI,'导诊 · 分诊',fc,'导诊台',.20);
  monitor(11.15,1.70,Math.PI,'导诊台');
  chartRack(12.18,1.64,Math.PI,'挂号条');
  // A small fresh arrangement sits on the lowered accessible end, below the nurse's sightline.
  cyl(12.82,.91,1.72,.075,.15,col.blueD,{gloss:.24,tag:'花'});
  for(const [dx,dz,c] of [[-.06,0,col.red],[.04,-.03,col.yellow],[.07,.05,col.white]]) {
    capsule(12.82+dx,.995,1.72+dz,.010,.25,.010,col.green,{rz:dx*2.5,tag:'花'});
    ball(12.82+dx*1.7,1.13,1.72+dz*1.7,.055,.055,.055,c,{mode:7,tag:'花'});
  }
  thing('导诊台',11.70,1.25,1.72,
    '护士在导诊台核对科室和挂号条。',
    'The nurse at the guidance desk checks your department and registration slip.',
    '导诊 means directing patients to the right clinic; 分诊 is triage.',
    {tag:'导诊台',focus:[11.70,.64],reach:2.1});
  thing('挂号条',12.18,.96,1.64,
    '挂号条上有就诊科室、号码和时间。',
    'The registration slip shows the department, queue number, and time.',
    '挂号 is to register for a hospital appointment.',
    {tag:'挂号条',focus:[12.18,.55],reach:1.6});

  // --------------------------------------------------------------- public washroom / conveniences
  // The unused southeast service bay becomes a real hospital washroom. Its east wall stops at
  // x=13.35, leaving a measured 3.4 m clear lane between the room and the lift-side perimeter once
  // the player's collision radius is included. Clinic 204 supplies the west wall, so no duplicate
  // geometry or hidden sliver is added there.
  const WX0=8.08,WX1=13.35,WZ0=-8.20,WZ1=-WALL_Z;
  partitionZ(WZ1,WX0,WX1,[[10.55,1.50]],col.wall,'洗手间');
  partitionX(WX1,WZ0,WZ1,[],col.wall,'洗手间');
  partitionZ(WZ0,WX0,WX1,[],col.wall,'洗手间');
  flat((WX0+WX1)/2,.022,(WZ0+WZ1)/2,WX1-WX0-.18,WZ1-WZ0-.18,col.tile,
    {mat:'tile',matScale:.36,matAmt:.46,gloss:.20,tag:'洗手间'});
  cameraRoom('f2-washroom',WX0+.24,WX1-.24,WZ0+.22,WZ1-.26,11.90,-4.70);

  doorPlate(10.55,2.82,WZ1+.105,0,'公共卫生间','洗手间',fc);
  glyphs(10.55,2.44,WZ1+.115,0,'无障碍 · 母婴友好',
    {size:.095,gap:.025,color:col.blueD,mode:1,lift:.012,tag:'洗手间'});
  for(const [x,c,p] of [[9.98,col.green,.1],[11.12,col.red,.8]])
    liveScreen(ball(x,2.13,WZ1+.125,.045,.045,.018,c,
      {mode:1,glow:.065,tag:'洗手间'}),p);

  // Three private cubicles. The wider eastern one has a longer door and grab rails; all doors are
  // parked partly open inside the cubicle so the entry line remains visually and physically clear.
  partitionZ(-6.05,WX0+.10,WX1-.10,[[9.00,.98],[10.68,.98],[12.35,1.14]],
    col.wallD,'洗手间');
  partitionX(9.78,WZ0+.08,-6.05,[],col.wallD,'洗手间');
  partitionX(11.55,WZ0+.08,-6.05,[],col.wallD,'洗手间');
  for(const [x,w,c] of [[9.00,.66,col.wood],[10.68,.66,col.wood],[12.35,.82,fc]]) {
    box(x-w*.43,1.10,-6.17,.055,2.10,w,c,
      {hard:true,ry:-.34,gloss:.18,tag:'洗手间'});
    liveScreen(ball(x+w*.34,1.14,-5.99,.030,.030,.018,col.green,
      {mode:1,glow:.055,tag:'洗手间'}),x*.12);
  }
  glyphs(9.00,2.47,-5.94,0,'1',{size:.14,color:col.blueD,mode:1,lift:.012,tag:'洗手间'});
  glyphs(10.68,2.47,-5.94,0,'2',{size:.14,color:col.blueD,mode:1,lift:.012,tag:'洗手间'});
  glyphs(12.35,2.47,-5.94,0,'无障碍',
    {size:.095,gap:.025,color:col.blueD,mode:1,lift:.012,tag:'洗手间'});

  function toilet(x,z,accessible=false) {
    const T={tag:'洗手间'};
    // Elliptical bowl, visible water, raised seat and a softly rounded cistern replace a pair of
    // stacked bathroom cubes. The floor collider matches the ceramic footprint only.
    ball(x,.37,z,.34,.16,.43,col.white,{mode:7,gloss:.25,...T});
    ball(x,.515,z+.08,.29,.030,.35,col.white,{mode:7,gloss:.24,...T});
    ball(x,.535,z+.10,.18,.018,.225,col.blueL,{mode:1,alpha:.72,gloss:.32,...T});
    box(x,.69,z-.36,.57,.58,.20,col.white,
      {round:.10,mode:7,gloss:.24,...T});
    box(x,.89,z-.255,.16,.045,.055,col.steelD,{round:.02,mode:7,gloss:.48,...T});
    solid(x-.36,x+.36,z-.50,z+.48);
    if(accessible) {
      capsule(x,.91,z-.51,.030,.92,.030,col.steelD,
        {rz:Math.PI/2,gloss:.48,...T});
      capsule(x+.53,.82,z-.10,.030,.86,.030,col.steelD,
        {rx:Math.PI/2,gloss:.48,...T});
      capsule(x+.53,.72,z-.47,.030,.54,.030,col.steelD,
        {gloss:.48,...T});
    }
  }
  toilet(9.00,-7.48);
  toilet(10.68,-7.48);
  toilet(12.35,-7.48,true);

  // Two rounded basins, individual mirrors, soap, towel dispenser and a floor drain make the front
  // half read as a maintained public washroom instead of spare corridor space.
  for(const z of [-3.82,-4.70]) {
    sink(12.72,z,-Math.PI/2,'洗手池');
    box(13.205,1.70,z,.040,.84,.70,col.steelD,
      {round:.035,mode:7,hard:true,gloss:.42,tag:'镜子'});
    box(13.175,1.70,z,.018,.74,.60,col.glass,
      {hard:true,mode:1,alpha:.42,gloss:.62,tag:'镜子'});
  }
  box(13.13,1.30,-4.34,.12,.36,.28,col.white,
    {round:.045,mode:7,hard:true,gloss:.22,tag:'洗手液'});
  box(13.055,1.22,-4.34,.025,.12,.14,col.tealL,
    {hard:true,mode:1,glow:.025,tag:'洗手液'});
  box(8.22,1.22,-4.54,.16,.58,.90,col.white,
    {round:.10,mode:7,hard:true,gloss:.18,tag:'便民服务'});
  capsule(8.34,1.22,-4.54,.026,.66,.026,fc,
    {rx:Math.PI/2,gloss:.35,tag:'便民服务'});
  cyl(10.48,.028,-4.64,.16,.018,col.steelD,{gloss:.42,tag:'洗手间'});
  for(let i=0;i<8;i++) capsule(10.48,.045,-4.64,.010,.25,.010,col.black,
    {rx:Math.PI/2,ry:i*Math.PI/4,tag:'洗手间'});
  glyphs(12.93,2.30,-4.34,-Math.PI/2,'七步洗手法',
    {size:.090,gap:.025,color:col.tealD,mode:1,lift:.012,tag:'洗手池'});

  thing('洗手间',10.55,2.72,WZ1+.12,'二楼卫生间有三个隔间，最里面是无障碍隔间。',
    'The second-floor washroom has three cubicles; the last is accessible.',
    '洗手间 is a polite word for a bathroom.',
    {tag:'洗手间',focus:[10.55,-2.15],reach:1.85});
  thing('镜子',13.16,1.70,-4.33,'洗手池上方有两面镜子。','There are two mirrors above the washbasins.',
    '镜子 is a mirror.',{tag:'镜子',focus:[11.85,-4.33],reach:1.65});
  thing('洗手液',13.08,1.30,-4.34,'洗完手以后按一下洗手液。','Press the soap dispenser when washing your hands.',
    '洗手液 is liquid hand soap.',{tag:'洗手液',focus:[11.90,-4.34],reach:1.55});

  // The conveniences sign remains visible from the lift. The cooler now has a rounded cabinet,
  // translucent water bottle, dispensing recess, drip tray and live hot/cold status lamps.
  sign(14.62,3.10,-2.72,0,'卫生间 · 饮水处',fc,'便民服务',.16);
  box(15.55,.73,-1.94,.64,1.38,.54,col.white,
    {round:.12,mode:7,hard:true,gloss:.22,tag:'饮水机'});
  ball(15.55,1.62,-1.94,.27,.41,.23,col.glass,
    {mode:1,alpha:.42,gloss:.48,tag:'饮水机'});
  cyl(15.55,1.26,-1.94,.13,.10,col.blueL,{gloss:.22,tag:'饮水机'});
  box(15.55,.91,-1.655,.42,.43,.035,col.black,
    {round:.055,mode:7,hard:true,gloss:.30,tag:'饮水机'});
  for(const [x,c,p] of [[15.43,col.blue,.2],[15.67,col.red,1.1]]) {
    cyl(x,1.02,-1.62,.040,.07,c,{rx:Math.PI/2,mode:1,glow:.045,tag:'饮水机'});
    liveScreen(ball(x,1.17,-1.635,.025,.025,.014,c,
      {mode:1,glow:.06,tag:'饮水机'}),p);
  }
  box(15.55,.65,-1.61,.46,.045,.24,col.steel,
    {round:.025,mode:7,hard:true,gloss:.48,tag:'饮水机'});
  for(let i=0;i<5;i++) capsule(15.55,.68,-1.59+i*.035,.012,.32,.012,col.steelD,
    {rz:Math.PI/2,tag:'饮水机'});
  for(let i=0;i<6;i++) cyl(15.95,1.02-i*.055,-1.70,.045,.050,col.white,{tag:'饮水机'});
  solid(15.20,15.90,-2.25,-1.58);
  thing('饮水机',15.55,1.12,-1.96,
    '候诊区有冷热饮水机。','There is a hot-and-cold water dispenser in the waiting area.',
    '饮水处 is a drinking-water point.',
    {tag:'饮水机',focus:[14.75,-1.96],reach:1.5});
};

// --------------------------------------------------------------------- outpatient cast
// These rows are folded into NPCS by game.js before its one-time roster initialisation.  Every
// clinician is stationary and wears the shared white-coat kit.  Patients occupy exact chair pans
// built above, so the hall looks busy without generating crossing paths through the furniture.
HospitalCast.push(
  { hz:'医生', name:'王宁', py:'Wáng Níng', place:'hospital2',
    rig:'hospital2-doctor-wang-ning', temper:'patient',
    look:{skin:'#deb086',hair:'#211d1b',hairStyle:'bun',top:'#d8e1e4',pants:'#38424d',
      shoe:'#2b3035',collar:'shirt',glasses:true,uniform:'coat',tall:.98,wide:.94,
      age:.28,faceSeed:8201},
    spots:[{h0:7.5,h1:18,at:[-11.83,-7.03],face:0,act:'sit'}],
    lines:[['您好，请把挂号条和病历给我。','Hello. Please give me your registration slip and medical record.'],
           ['哪里不舒服？什么时候开始的？','Where do you feel unwell, and when did it start?'],
           ['我先给您量血压，再听一下心肺。','I will check your blood pressure, then listen to your heart and lungs.'],
           ['检查结果出来以后再回来找我。','Come back to me after the test results are ready.']] },
  { hz:'医生', name:'赵明远', py:'Zhào Míngyuǎn', place:'hospital2',
    rig:'hospital2-doctor-zhao-mingyuan', temper:'steady',
    look:{skin:'#c58f64',hair:'#3c3530',hairStyle:'short',top:'#dce2e2',pants:'#35404b',
      shoe:'#2c3136',collar:'shirt',glasses:true,uniform:'coat',tall:1.05,wide:1.04,
      age:.42,faceSeed:8202},
    spots:[{h0:7.5,h1:18,at:[-6.13,-7.03],face:0,act:'sit'}],
    lines:[['请坐，先说说怎么受伤的。','Please sit down and tell me how you were injured.'],
           ['伤口需要消毒，再重新包扎。','The wound needs cleaning and a fresh dressing.'],
           ['今天不要碰水，有红肿就来复诊。','Keep it dry today; return if it becomes red or swollen.']] },
  { hz:'医生', name:'刘悦', py:'Liú Yuè', place:'hospital2',
    rig:'hospital2-doctor-liu-yue', temper:'genial',
    look:{skin:'#edbd94',hair:'#2b211d',hairStyle:'ponytail',top:'#dce5e5',pants:'#3a4652',
      shoe:'#30363c',collar:'shirt',uniform:'coat',tall:.96,wide:.91,age:.16,faceSeed:8203},
    spots:[{h0:7.5,h1:18,at:[-.43,-7.03],face:0,act:'sit'}],
    lines:[['小朋友别紧张，我们先量身高。','Do not worry, little one; we will measure your height first.'],
           ['张嘴说“啊”，很快就好了。','Open wide and say “ah”; it will be over quickly.'],
           ['回家多喝水，按时吃药。','Drink plenty of water at home and take the medicine on time.']] },
  { hz:'医生', name:'陈洁', py:'Chén Jié', place:'hospital2',
    rig:'hospital2-doctor-chen-jie', temper:'brisk',
    look:{skin:'#d8a77f',hair:'#221d1a',hairStyle:'bob',top:'#dce4e4',pants:'#36404a',
      shoe:'#2a3035',collar:'shirt',uniform:'coat',tall:.99,wide:.92,faceSeed:8204},
    spots:[{h0:7.5,h1:18,at:[4.50,-7.03],face:0,act:'work',held:null}],
    lines:[['请躺好，把头靠在这里。','Please lie back and rest your head here.'],
           ['这颗牙需要拍片以后再决定。','We need an X-ray before deciding what to do with this tooth.'],
           ['早晚刷牙，每次至少两分钟。','Brush morning and night, for at least two minutes each time.']] },
  { hz:'医生', name:'张磊', py:'Zhāng Lěi', place:'hospital2',
    rig:'hospital2-doctor-zhang-lei', temper:'steady',
    look:{skin:'#c9956d',hair:'#28231f',hairStyle:'short',top:'#dce4e4',pants:'#35414b',
      shoe:'#2b3136',collar:'shirt',uniform:'coat',tall:1.03,wide:.98,faceSeed:8207},
    spots:[{h0:7.5,h1:18,at:[-14.48,7.03],face:Math.PI,act:'sit'}],
    lines:[['咳嗽多久了？有没有发烧？','How long have you been coughing? Do you have a fever?'],
           ['我先听一下呼吸，再给您开检查单。','I will listen to your breathing, then order a test.'],
           ['拍完胸片以后请到三楼治疗室。','After the chest X-ray, go to the third-floor treatment room.']] },
  { hz:'护士', name:'孙晓梅', py:'Sūn Xiǎoméi', place:'hospital2',
    rig:'hospital2-nurse-sun-xiaomei', temper:'brisk',
    look:{skin:'#e7b68d',hair:'#29221f',hairStyle:'bun',top:'#dce8ea',pants:'#3b4a54',
      shoe:'#eef0ea',collar:'shirt',uniform:'coat',tall:.97,wide:.94,faceSeed:8205},
    spots:[{h0:7,h1:19,at:[11.70,2.38],face:Math.PI,act:'vend'}],
    lines:[['您好，请问您挂的是哪个科？','Hello. Which department are you registered for?'],
           ['先在这里报到，然后看屏幕等叫号。','Check in here first, then watch the screen for your number.'],
           ['二零一到二零四在南侧，二零五以后在北侧。','Rooms 201 to 204 are on the south side; 205 onward are on the north side.'],
           ['医保码和身份证请提前准备好。','Please have your medical-insurance code and ID ready.']] },
  { hz:'医生', name:'周教授', py:'Zhōu jiàoshòu', place:'hospital2',
    rig:'hospital2-professor-zhou', temper:'patient',
    look:{skin:'#c89670',hair:'#aaa69e',hairStyle:'short',top:'#dce3e3',pants:'#36404a',
      shoe:'#30353a',collar:'shirt',glasses:true,uniform:'coat',tall:1.01,wide:1.00,
      age:.72,faceSeed:8206},
    spots:[{h0:8,h1:16.5,at:[12.32,7.03],face:Math.PI,act:'sit'}],
    lines:[['请把以前的检查报告也给我看看。','Please let me see your previous test reports as well.'],
           ['这个情况需要长期观察，不要着急。','This needs long-term observation; do not worry.'],
           ['三个月以后来复查。','Come back for a follow-up in three months.']] },

  // Rooms 206–208 use the same complete furniture plan as the named story clinics. They also
  // need visible clinicians: otherwise an open northern door exposes a computer apparently
  // treating nobody. These three sit on the exact doctor-chair centres generated above.
  { hz:'医生', place:'hospital2', temper:'steady',
    look:{skin:'#d9a77e',hair:'#28221f',hairStyle:'short',top:'#dce4e4',pants:'#35414b',
      shoe:'#2b3136',collar:'shirt',uniform:'coat',tall:1.02,wide:.98,age:.30,faceSeed:8251},
    spots:[{h0:7.5,h1:18,at:[-7.78,7.03],face:Math.PI,act:'sit'}] },
  { hz:'医生', place:'hospital2', temper:'genial',
    look:{skin:'#e5b38b',hair:'#2a221f',hairStyle:'bun',top:'#dce6e5',pants:'#38444e',
      shoe:'#30363b',collar:'shirt',uniform:'coat',tall:.97,wide:.92,age:.24,faceSeed:8252},
    spots:[{h0:7.5,h1:18,at:[-1.18,7.03],face:Math.PI,act:'sit'}] },
  { hz:'医生', place:'hospital2', temper:'brisk',
    look:{skin:'#bd845f',hair:'#25201d',hairStyle:'crop',top:'#d9e3e4',pants:'#33414b',
      shoe:'#293036',collar:'shirt',glasses:true,uniform:'coat',tall:1.05,wide:1.02,
      age:.37,faceSeed:8253},
    spots:[{h0:7.5,h1:18,at:[5.15,7.03],face:Math.PI,act:'work',held:null}] },

  // Exact seats on the two banks at x -10.20, -3.60, 3.00 and 9.60.
  { hz:'患者', name:'高阿姨', py:'Gāo āyí', place:'hospital2',
    rig:'hospital2-patient-gao-ayi', temper:'patient', seatY:.47,
    look:{skin:'#d7aa83',hair:'#8e877e',hairStyle:'perm',top:'#7c8a7d',pants:'#3d444c',
      shoe:'#363b40',bag:'tote',bagColor:'#8c7657',tall:.93,wide:1.06,stoop:.07,
      age:.62,faceSeed:8211},
    spots:[{h0:7.5,h1:18,at:[-10.51,-1.08],face:Math.PI,act:'sit'}],
    lines:[['我在等内科叫号，前面还有两个人。','I am waiting for internal medicine; there are two people ahead of me.'],
           ['现在看病都要先在机器上报到。','These days you have to check in at the machine before seeing the doctor.']] },
  { hz:'患者', place:'hospital2', temper:'bored', seatY:.47,
    look:{skin:'#c68f64',hair:'#2e2824',hairStyle:'short',top:'#596b78',pants:'#363e48',
      shoe:'#282d32',glasses:true,bag:'shoulder',bagColor:'#51463c',tall:1.04,wide:1.02,
      faceSeed:8212},
    spots:[{h0:8,h1:18,at:[-3.91,1.08],face:0,act:'phone'}] },
  { hz:'患儿', place:'hospital2', temper:'eager', seatY:.47,
    look:{skin:'#edbf99',hair:'#2a221e',hairStyle:'tousled',top:'#e1ad3e',pants:'#55739a',
      shoe:'#d95445',tall:.70,wide:.81,youth:1,headScale:1.10,faceSeed:8213},
    spots:[{h0:8,h1:18,at:[2.69,-1.08],face:Math.PI,act:'sit'}] },
  { hz:'家长', place:'hospital2', temper:'watchful', seatY:.47,
    look:{skin:'#dfae86',hair:'#241f1c',hairStyle:'ponytail',top:'#a65f51',pants:'#414a55',
      shoe:'#e7e0d3',bag:'tote',bagColor:'#9b774f',tall:.98,wide:.94,faceSeed:8214},
    spots:[{h0:8,h1:18,at:[3.31,-1.08],face:Math.PI,act:'sit'}] },
  { hz:'患者', place:'hospital2', temper:'steady', seatY:.47,
    look:{skin:'#b77d55',hair:'#4a433d',hairStyle:'short',top:'#d7d0c1',pants:'#3c444e',
      shoe:'#33383d',jacket:'#526171',collar:'shirt',tall:1.06,wide:1.11,age:.38,
      faceSeed:8215},
    spots:[{h0:7.5,h1:18,at:[9.29,1.08],face:0,act:'read'}] },
  { hz:'患者', place:'hospital2', temper:'frail', seatY:.47,
    look:{skin:'#c9a07d',hair:'#c3bfb7',hairStyle:'short',top:'#747f72',pants:'#3b424b',
      shoe:'#41464b',hat:'flat',hatColor:'#625b50',tall:.90,wide:.98,stoop:.16,
      age:.86,faceSeed:8216},
    spots:[{h0:8,h1:17,at:[-9.89,1.08],face:0,act:'sit'}] },

  // The waiting hall is only half of an outpatient floor. These patients occupy the measured
  // visitor chairs opposite the doctors in four different consulting rooms, which makes an open
  // door reveal an examination already in progress rather than an empty stage set. Their chair
  // positions are deliberately static: the ward-round route on 4F is the hospital's moving cast,
  // while consultation pairs stay clear of desks, sinks and room partitions.
  { hz:'就诊患者', place:'hospital2', temper:'weary', seatY:.47,
    look:{skin:'#d2a17a',hair:'#514a43',hairStyle:'short',top:'#79909a',pants:'#3d4852',
      shoe:'#353b40',collar:'polo',tall:.96,wide:1.04,stoop:.07,age:.48,faceSeed:8221},
    spots:[{h0:8,h1:18,at:[-11.83,-5.53],face:Math.PI,act:'sit'}] },
  { hz:'换药患者', place:'hospital2', temper:'patient', seatY:.47,
    look:{skin:'#c68d67',hair:'#28231f',hairStyle:'crop',top:'#718370',pants:'#3b444d',
      shoe:'#30363b',jacket:'#53656b',tall:1.03,wide:1.01,age:.31,faceSeed:8222},
    spots:[{h0:8,h1:18,at:[-6.13,-5.53],face:Math.PI,act:'sit'}] },
  { hz:'患儿', place:'hospital2', temper:'eager', seatY:.47,
    look:{skin:'#e9b990',hair:'#2b241f',hairStyle:'tousled',top:'#e0a842',pants:'#5375a0',
      shoe:'#d95747',tall:.72,wide:.82,youth:1,headScale:1.10,faceSeed:8223},
    spots:[{h0:8,h1:18,at:[-.43,-5.53],face:Math.PI,act:'sit'}] },
  { hz:'复诊患者', place:'hospital2', temper:'steady', seatY:.47,
    look:{skin:'#b9815d',hair:'#625a53',hairStyle:'short',top:'#837968',pants:'#3d454d',
      shoe:'#34393e',collar:'shirt',glasses:true,tall:.99,wide:1.07,age:.55,faceSeed:8224},
    spots:[{h0:8,h1:16.5,at:[12.42,5.53],face:0,act:'read'}] }
);
