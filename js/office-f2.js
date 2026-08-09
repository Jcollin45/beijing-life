// 华北创意中心 · 二楼财务部
//
// The floor is planned around two facts that are true of a finance department and of almost no
// other office floor, and they matter more than a symmetrical row of glazed boxes:
//
//   1. Audit has to be separable from the department it audits.  审计室 therefore sits at the east
//      end with its own door off the public spine and NO opening into the accounting suite or the
//      open hall.  You cannot walk from the payment desk into the audit files.
//   2. An expenses counter is a place people queue at.  报销大厅 is a genuine through-route from
//      the lift landing to the daylight hall, and 报销窗口 is a real transaction window cut into
//      the payroll office wall, so the claimant stays outside and the clerk stays inside.
//
// Everything else follows from keeping those two true while leaving the shell's circulation spine
// (z 2.2 … 4.0) completely clear.  Every task station keeps a stable `officeAction` id so the
// later workplace chapter can turn the physical workflow on without inferring intent from a
// repeated noun such as 电脑.

try {
  Glyphs.need('二楼财务部应付账款报销大厅预算会议室出纳付款室审计工资窗口取号流程填单附票批' +
    '季度清核复账收税薪与厅叫底稿凭证供应商发票档案系统银行机扫描打印' +
    'FINACE&OUNTG');
} catch (_) {}

OfficeFit.register('office2', A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
    partitionZ,partitionX,sign,doorPlate,room,
  } = A;

  const P = {
    carpet:A.C('#52606d'), carpetD:A.C('#3e4953'), runner:A.C('#d8dde0'),
    wall:A.C('#e7e9e7'), wallD:A.C('#c4cacb'), glass:A.C('#a6c2cc'),
    oak:A.C('#b69a73'), oakD:A.C('#786146'), black:A.C('#242a2f'),
    steel:A.C('#7d878d'), white:A.C('#f6f3eb'), paper:A.C('#eeeadd'),
    blue:A.C('#285f83'), blueL:A.C('#6da2bf'), navy:A.C('#25394b'),
    green:A.C('#3f765d'), red:A.C('#a9473f'), amber:A.C('#c88a35'),
    screen:A.C('#173140'), screenL:A.C('#86b5c9'), plant:A.C('#426c4a'),
  };

  const tagOpt = (tag,o={}) => tag ? { ...o,tag } : o;
  const station = (hz,id,x,y,z,zh,en,note,focus=[x,z],reach=1.75,extra={}) => {
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    th.officeAction=id;
    th.officeStation={floor:A.key,id,department:'accounting',...extra};
    return th;
  };
  const info = (hz,x,y,z,zh,en,note,focus=[x,z],reach=1.7) => {
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    return th;
  };

  // `tag` is per room, never shared.  A cutaway hides a tag group by ONE point — the group's
  // bounding-box centre — so any tag whose members straddle a room boundary deletes all of them
  // the moment the eye leaves that room.  Sharing '灯' across the whole plate is exactly that
  // failure, one storey up in the ceiling.
  function panelLight(x,z,w=3.0,tag='灯') {
    const p=box(x,A.H-.16,z,w,.045,.26,P.white,{hard:true,mode:1,glow:.15,tag});
    if (A.luminous) A.luminous(p,.045,.22);
    light(x,A.H-.32,z,[.91,.96,1],.22,3.4);
    glow(M.trs(x,.024,z,0,w*1.25,1,2.2),P.white,.035);
  }
  function screen(x,y,z,ry=0,tag='电脑',text='账') {
    const nx=Math.sin(ry), nz=Math.cos(ry);
    box(x,y,z,.62,.42,.09,P.black,{hard:true,ry,gloss:.30,...tagOpt(tag)});
    box(x+nx*.051,y,z+nz*.051,.52,.32,.012,P.screen,
      {hard:true,ry,mode:1,glow:.10,...tagOpt(tag)});
    glyphs(x+nx*.060,y,z+nz*.060,ry,text,
      {size:.10,gap:.022,color:P.screenL,mode:1,glow:.04,lift:.008,tag});
    capsule(x,y-.31,z,.026,.28,.026,P.steel,{gloss:.46,...tagOpt(tag)});
    box(x,y-.46,z,.34,.035,.25,P.steel,{hard:true,ry,gloss:.44,...tagOpt(tag)});
  }
  function taskDesk(x,z,ry=0,tag='办公桌',screenTag='电脑',label='账') {
    const swap=Math.abs(Math.sin(ry))>.5;
    box(x,.75,z,swap?.78:1.62,.10,swap?1.62:.78,P.oak,
      {round:.05,hard:true,ry,gloss:.22,...tagOpt(tag)});
    // Dark laminate edge, under-desk cable tray and a compact CPU give the top a manufactured
    // thickness and keep the repeated open-office desks from looking like boards on two spikes.
    const fx=Math.sin(ry),fz=Math.cos(ry),ux=Math.cos(ry),uz=-Math.sin(ry);
    box(x,.70,z-fz*.30,swap?.07:1.54,.055,swap?1.54:.07,P.oakD,
      {hard:true,ry,gloss:.25,...tagOpt(tag)});
    box(x,.57,z-fz*.28,swap?.18:1.18,.08,swap?1.18:.18,P.black,
      {hard:true,ry,gloss:.25,...tagOpt(tag)});
    for(const u of [-.66,.66]) {
      const px=x+Math.cos(ry)*u, pz=z-Math.sin(ry)*u;
      capsule(px,.37,pz,.035,.72,.035,P.black,{gloss:.34,...tagOpt(tag)});
      box(px,.04,pz,.20,.055,.36,P.black,{hard:true,ry,gloss:.25,...tagOpt(tag)});
    }
    const sx=x-Math.sin(ry)*.21, sz=z-Math.cos(ry)*.21;
    screen(sx,1.16,sz,ry,screenTag,label);
    const kx=x+Math.sin(ry)*.18,kz=z+Math.cos(ry)*.18;
    box(kx,.82,kz,.48,.025,.17,P.black,{hard:true,ry,gloss:.26,...tagOpt(tag)});
    const pcx=x+ux*.54-fx*.06,pcz=z+uz*.54-fz*.06;
    box(pcx,.39,pcz,.22,.62,.48,P.black,{round:.035,hard:true,ry,gloss:.24,...tagOpt(tag)});
    cyl(pcx,.63,pcz-fz*.25,.022,.016,P.green,{rx:Math.PI/2,mode:1,glow:.06,...tagOpt(tag)});
    // Folder and pen vary with the workstation's screen label, adding a little authored disorder.
    box(x-ux*.46+fx*.08,.82,z-uz*.46+fz*.08,.36,.020,.27,P.paper,
      {hard:true,ry,rz:(label.charCodeAt(0)%5-2)*.012,...tagOpt(tag)});
    capsule(x-ux*.45+fx*.12,.85,z-uz*.45+fz*.12,.012,.24,.012,
      label==='付'?P.red:P.blue,{rz:Math.PI/2,ry,gloss:.24,...tagOpt(tag)});
    // Task light, calculator and paper tray establish a believable individual workstation.
    const side=label.charCodeAt(0)%2?1:-1;
    const lx=x+ux*side*.53+fx*.08,lz=z+uz*side*.53+fz*.08;
    cyl(lx,.835,lz,.075,.025,P.steel,{mode:7,gloss:.50,...tagOpt(tag)});
    capsule(lx,.99,lz,.018,.29,.018,P.steel,{rz:side*.18,gloss:.48,...tagOpt(tag)});
    taper(lx-fx*.09,1.15,lz-fz*.09,.17,.12,.17,P.blueL,
      {rx:Math.PI/2,mode:7,glow:.045,...tagOpt(tag)});
    const cx=x-ux*side*.34+fx*.14,cz=z-uz*side*.34+fz*.14;
    box(cx,.84,cz,.27,.035,.34,P.navy,{round:.025,hard:true,ry,gloss:.24,...tagOpt(tag)});
    for(const [du,dv] of [[-.07,-.08],[.07,-.08],[-.07,.05],[.07,.05]])
      box(cx+ux*du+fx*dv,.865,cz+uz*du+fz*dv,.045,.018,.050,P.screenL,
        {round:.008,hard:true,ry,...tagOpt(tag)});
    if(label.charCodeAt(0)%3===0){
      const tx=x-ux*.54-fx*.04,tz=z-uz*.54-fz*.04;
      box(tx,.85,tz,.38,.045,.30,P.steel,{round:.025,hard:true,ry,gloss:.36,...tagOpt(tag)});
      for(let i=0;i<3;i++)box(tx,.885+i*.012,tz,.31,.012,.23,P.paper,
        {hard:true,ry,rz:(i-1)*.012,...tagOpt(tag)});
    }
    if(label==='收'||label==='薪'||label==='税'){
      const px=x+ux*.58-fx*.03,pz=z+uz*.58-fz*.03;
      taper(px,.87,pz,.16,.16,.14,P.white,{mode:7,gloss:.20,...tagOpt(tag)});
      for(let i=0;i<4;i++)capsule(px+Math.sin(i*1.7)*.06,1.04,pz+Math.cos(i*1.7)*.06,
        .025,.30,.025,P.plant,{rz:(i-1.5)*.22,gloss:.10,...tagOpt(tag)});
    }
    solid(x-(swap?.48:.86),x+(swap?.48:.86),z-(swap?.86:.48),z+(swap?.86:.48));
    shade(x,z,swap?1.05:1.82,swap?1.82:1.05,.20);
  }
  function chair(x,z,ry=0,tag='办公椅') {
    // Five-star base, casters and arms: seen through the glazed rooms these details are what
    // distinguish a task chair from a dining chair balanced on a pole.
    for(let i=0;i<5;i++){
      const a=ry+i*Math.PI*2/5,ex=x+Math.sin(a)*.29,ez=z+Math.cos(a)*.29;
      capsule(x,.075,z,.030,.55,.030,P.black,{rx:Math.PI/2,ry:a,gloss:.30,...tagOpt(tag)});
      ball(ex,.045,ez,.055,.045,.055,P.black,{gloss:.20,...tagOpt(tag)});
    }
    capsule(x,.30,z,.035,.45,.035,P.steel,{gloss:.45,...tagOpt(tag)});
    box(x,.48,z,.52,.10,.48,P.navy,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    // `ry` is the seated person's forward heading, so the backrest must be behind it.  Building
    // it with +sin/+cos reversed every task and meeting chair even though their authored yaws were
    // correct (south-side chairs use PI; north-side chairs use 0).
    const bx=x-Math.sin(ry)*.23,bz=z-Math.cos(ry)*.23;
    box(bx,.78,bz,.50,.58,.09,P.navy,{mode:7,gloss:.04,ry,rx:-.06,...tagOpt(tag)});
    for(const s of [-1,1]){
      const ax=x+Math.cos(ry)*s*.28,az=z-Math.sin(ry)*s*.28;
      capsule(ax,.63,az,.022,.29,.022,P.steel,{gloss:.45,...tagOpt(tag)});
      capsule(ax-Math.sin(ry)*.08,.76,az-Math.cos(ry)*.08,.025,.22,.025,P.black,
        {rx:Math.PI/2,ry,gloss:.22,...tagOpt(tag)});
    }
    // Split the footprint around the exact seated anchor.  The two rails stop a 0.30 m player
    // capsule crossing the chair while leaving the authored NPC point clear for a desk pose.
    const swap=Math.abs(Math.sin(ry))>.5;
    if(swap){
      solid(x-.30,x+.30,z-.33,z-.11);solid(x-.30,x+.30,z+.11,z+.33);
    }else{
      solid(x-.33,x-.11,z-.30,z+.30);solid(x+.11,x+.33,z-.30,z+.30);
    }
    // Match the visible pedestal as a small central hub.  At 5 cm square it covers the rendered
    // seat centre and blocks a 30 cm player capsule, while the NPC anchor remains on the collider's
    // deliberately eroded edge in the roster audit instead of being misreported inside furniture.
    solid(x-.025,x+.025,z-.025,z+.025);
  }
  function cabinet(x,z,w=1.6,h=1.85,tag='档案柜',ry=0) {
    const swap=Math.abs(Math.sin(ry))>.5;
    // These sizes are local to the cabinet matrix.  Pre-swapping and then rotating put both
    // side-wall archives across x (and partly through the perimeter) while their solids, handles,
    // and intended long axes ran along z.
    box(x,h/2,z,w,h,.45,P.wallD,
      {hard:true,ry,gloss:.20,...tagOpt(tag)});
    for(let i=1;i<5;i++) box(x,h*i/5,z,w-.08,.026,.47,P.steel,
      {hard:true,ry,...tagOpt(tag)});
    for(let i=0;i<4;i++) {
      const px=x+Math.cos(ry)*(-w*.29+i*w*.19),pz=z-Math.sin(ry)*(-w*.29+i*w*.19);
      box(px,h*.51,pz,.025,.16,.025,P.black,{hard:true,ry,...tagOpt(tag)});
      box(px-Math.sin(ry)*.245,h*(.16+i*.21),pz-Math.cos(ry)*.245,.22,.10,.015,P.white,
        {hard:true,ry,mode:1,...tagOpt(tag)});
    }
    box(x,.07,z,w+.04,.14,.50,P.navy,{hard:true,ry,...tagOpt(tag)});
    solid(x-(swap?.26:w/2),x+(swap?.26:w/2),z-(swap?w/2:.26),z+(swap?w/2:.26));
  }
  function glassWallZ(z,x0,x1,doors=[],tag='玻璃墙') {
    const cuts=doors.map(([c,w])=>[c-w/2,c+w/2]).sort((a,b)=>a[0]-b[0]);
    let at=x0;
    const pane=(a,b)=>{
      if(b-a<.08)return;
      box((a+b)/2,1.72,z,b-a,3.36,.07,P.glass,
        {hard:true,mode:1,alpha:.22,gloss:.60,...tagOpt(tag)});
      box((a+b)/2,1.34,z-.042,b-a-.05,.40,.018,P.white,
        {hard:true,mode:1,alpha:.23,gloss:.22,...tagOpt(tag)});
      capsule((a+b)/2,.22,z-.052,.025,Math.max(.12,b-a-.10),.025,P.blue,
        {rz:Math.PI/2,gloss:.44,...tagOpt(tag)});
      for(const x of [a,b]) box(x,1.72,z,.045,3.38,.09,P.black,{hard:true,...tagOpt(tag)});
      solid(a,b,z-.045,z+.045);
      A.blocker(a,b,z-.045,z+.045,A.H);
    };
    for(const [a,b] of cuts){
      pane(at,a);const cx=(a+b)/2;
      box(cx,3.23,z,b-a,.40,.10,P.black,{hard:true,...tagOpt(tag)});
      for(const side of [-1,1])capsule(cx+side*.18,1.18,z-.075,.025,.50,.025,P.steel,
        {gloss:.54,...tagOpt(tag)});
      flat(cx,.027,z-.04,b-a-.08,.10,P.blue,{mode:1,alpha:.72,...tagOpt(tag)});
      at=b;
    }
    pane(at,x1);
  }
  function meetingTable(x,z,w=3.1,d=1.15,tag='预算桌') {
    box(x,.75,z,w,.12,d,P.oak,{round:.10,hard:true,gloss:.24,...tagOpt(tag)});
    box(x,.37,z,w-.38,.68,.18,P.black,{hard:true,gloss:.30,...tagOpt(tag)});
    for(const u of [-w*.28,w*.28])cyl(x+u,.82,z,.065,.022,P.black,{gloss:.20,...tagOpt(tag)});
    // Speakerphone, water carafes and marked-up budget packs compose the otherwise empty top.
    ball(x,.84,z,.24,.055,.16,P.black,{mode:7,gloss:.24,...tagOpt(tag)});
    for(const u of [-.72,.72]){
      cyl(x+u,.96,z-.05,.065,.25,P.glass,{mode:1,alpha:.45,gloss:.62,...tagOpt(tag)});
      box(x+u,.84,z+.22,.42,.018,.30,P.paper,{hard:true,rz:u*.025,...tagOpt(tag)});
      box(x+u-.12,.86,z+.22,.035,.015,.24,u<0?P.blue:P.amber,{hard:true,...tagOpt(tag)});
    }
    solid(x-w/2,x+w/2,z-d/2,z+d/2);
    for(const u of [-1.12,-.37,.37,1.12]) {
      const px=x+u;
      chair(px,z-d*.78,0,'会议椅');
      chair(px,z+d*.78,Math.PI,'会议椅');
    }
    shade(x,z,w+.3,d+1.3,.23);
  }
  function printer(x,z,tag='财务打印机') {
    box(x,.62,z,.82,1.18,.65,P.wallD,{round:.055,hard:true,gloss:.18,...tagOpt(tag)});
    for(const y of [.23,.45,.67])box(x,y,z+.335,.72,.025,.035,P.steel,{hard:true,...tagOpt(tag)});
    for(const side of [-1,1])capsule(x+side*.27,.33,z+.36,.018,.15,.018,P.black,
      {rz:Math.PI/2,gloss:.30,...tagOpt(tag)});
    box(x,.97,z-.34,.68,.12,.14,P.black,{hard:true,...tagOpt(tag)});
    box(x,1.02,z-.42,.56,.015,.34,P.paper,{hard:true,rx:.12,...tagOpt(tag)});
    box(x,.35,z-.34,.50,.25,.05,P.black,{hard:true,...tagOpt(tag)});
    box(x+.27,.78,z-.355,.20,.18,.035,P.screen,{round:.025,hard:true,mode:1,glow:.08,...tagOpt(tag)});
    cyl(x+.34,.78,z-.38,.022,.016,P.green,{rx:Math.PI/2,mode:1,glow:.07,...tagOpt(tag)});
    for(let y=.28;y<.78;y+=.10)box(x-.415,y,z,.018,.045,.44,P.navy,{hard:true,...tagOpt(tag)});
    solid(x-.45,x+.45,z-.38,z+.38);
  }

  // ---------------------------------------------------------------- floor finishes
  // `nocut` on every floor plane.  A 23 m carpet is one prop whose centre is the middle of the
  // plate, so with camera rooms authored it vanishes the instant the eye leaves any room that
  // does not straddle the origin — the same failure that read as "walls turning into holes".
  flat(0,.020,-3.32,23.35,11.00,P.carpet,
    {mode:7,gloss:.05,mat:'fabric',matScale:.48,matAmt:.20,tag:'财务地面',nocut:true});
  flat(-1.70,.025,-0.30,2.72,4.34,P.runner,{mode:7,gloss:.10,tag:'财务地面',nocut:true});
  flat(-1.70,.029,1.84,1.78,.055,P.blue,{mode:1,alpha:.75,tag:'财务地面',nocut:true});

  // ---------------------------------------------------------------- enclosure
  // Nothing crosses z = 2.2.  The north wall stands at z = 2.05, so its 0.16 m collision band
  // (1.97 … 2.13) stops short of the protected spine.  It is built as six separately tagged
  // segments rather than one 24 m call for the reason given above panelLight.
  partitionZ(2.05,-11.84,-6.00,[[-7.80,1.10]],P.wall,'应付北墙');
  partitionZ(2.05,-6.00,-3.20,[],P.wall,'工资北墙');
  partitionZ(2.05,-3.20,-0.20,[[-1.70,1.80,2.60]],P.wall,'报销北墙');
  partitionZ(2.05,-0.20,5.30,[[0.42,1.00]],P.wall,'预算北墙');
  partitionZ(2.05,5.30,8.60,[],P.wall,'付款北墙');
  partitionZ(2.05,8.60,11.84,[[9.30,1.00]],P.wall,'审计北墙');

  // Cross walls.  The 工资 wall carries two openings: a staff door and the counter aperture, which
  // is filled by the 报销窗口 joinery below and closed again with its own collider.
  partitionX(-6.00,-2.55,2.05,[],P.wall,'应付隔墙');
  partitionX(-3.20,-2.55,2.05,[[-1.60,0.95],[0.95,1.50]],P.wall,'工资隔墙');
  partitionX(-0.20,-2.55,2.05,[],P.wall,'报销隔墙');
  partitionX(5.30,-2.55,2.05,[],P.wall,'预算隔墙');
  partitionX(8.60,-2.55,2.05,[],P.wall,'付款隔墙');

  // Glazed south line onto the daylight hall.  审计 deliberately has no opening here: its only
  // door is off the public spine, which is what makes the audit room separable.
  glassWallZ(-2.55,-11.84,-6.00,[[-7.80,1.20]],'应付玻璃');
  glassWallZ(-2.55,-6.00,-3.20,[],'工资玻璃');
  glassWallZ(-2.55,-3.20,-0.20,[[-1.70,1.60]],'报销玻璃');
  glassWallZ(-2.55,-0.20,5.30,[[2.55,1.25]],'预算玻璃');
  glassWallZ(-2.55,5.30,8.60,[[6.95,1.10]],'付款玻璃');
  glassWallZ(-2.55,8.60,11.84,[],'审计玻璃');

  // ---------------------------------------------------------------- wayfinding
  // y is bounded above by the ceiling slab (3.25 … 3.45) and below by the 2.60 m opening head.
  sign(-1.70,3.00,2.16,0,'二楼 · 财务部',P.blue,'财务部牌',.20);
  glyphs(-1.70,2.68,2.145,0,'FINANCE & ACCOUNTING',
    {size:.082,gap:.022,color:P.blue,mode:1,lift:.010,tag:'财务部牌'});
  doorPlate(-7.80,2.62,2.16,0,'应付账款','应付账款牌',P.blue);
  doorPlate(0.42,2.62,2.16,0,'预算会议室','预算会议室牌',P.blue);
  doorPlate(9.30,2.62,2.16,0,'审计室','审计室牌',P.blue);
  // Hall-side plates hang in their own glazed openings, level with the door heads.
  doorPlate(-7.80,2.72,-2.50,Math.PI,'应付账款','应付账款牌南',P.blue);
  doorPlate(-1.70,2.72,-2.50,Math.PI,'报销大厅','报销大厅牌',P.blue);
  doorPlate(2.55,2.72,-2.50,Math.PI,'预算会议室','预算会议室牌南',P.blue);
  doorPlate(6.95,2.72,-2.50,Math.PI,'出纳付款室','出纳付款室牌',P.blue);
  // On the claims-hall face of the wall (face is x = -3.13), above the 2.35 m door head — a plate
  // left on the wall centreline would be buried inside the 0.14 m partition.
  doorPlate(-3.10,2.62,-1.60,Math.PI/2,'工资','工资室牌',P.blue);

  if(room) {
    room('office2-open',-11.6,11.6,-8.7,-2.65,[0,-6.2]);
    room('office2-payable',-11.6,-6.1,-2.45,1.95,[-7.80,-1.60]);
    room('office2-payroll',-5.9,-3.3,-2.45,1.95,[-3.60,-1.70]);
    room('office2-claims',-3.1,-0.3,-2.45,1.95,[-1.70,0.20]);
    room('office2-budget',-0.1,5.2,-2.45,1.95,[0.45,1.30]);
    room('office2-payment',5.4,8.5,-2.45,1.95,[6.95,-1.70]);
    room('office2-audit',8.7,11.6,-2.45,1.95,[9.30,1.05]);
  }

  // ---------------------------------------------------------------- daylight accounts team
  // Desks are butted into pairs with real aisles between the bays.  The previous even spacing left
  // 0.68 m slots between neighbouring desks — wider than a body but far too tight to steer
  // through, and combined with the full-depth acoustic fins it walled off the whole west end of
  // the hall: a flood fill from the lift landing could not reach roughly 7 m2 of it.
  const BAY1=[[-9.60,-7.88],[-4.90,-3.18],[1.60,3.32],[7.10,8.82]];
  BAY1.forEach(([a,b],i)=>{
    for(const x of [a,b]){
      taskDesk(x,-5.60,0,'工位'+i,'财务电脑'+i,x<0?'应':'收');
      chair(x,-4.87,Math.PI,'工位椅'+i);
    }
  });
  const BAY2=[[-9.60,-7.88],[-0.86,0.86],[7.10,8.82]];
  BAY2.forEach(([a,b],i)=>{
    for(const x of [a,b]){
      taskDesk(x,-7.45,Math.PI,'窗位'+i,'窗位电脑'+i,x<0?'票':'税');
      chair(x,-8.18,0,'窗位椅'+i);
    }
  });
  // Low acoustic fins mark the bays without blocking the window or circulation.  They stand hard
  // against the east end of a bench rather than across an aisle, which is both where an acoustic
  // fit-out actually puts them and what keeps the aisle its full width.
  [-6.95,-2.25,4.25].forEach((x,i)=>{
    box(x,1.08,-6.30,.065,.72,2.25,P.blueL,{round:.035,hard:true,mode:7,alpha:.72,tag:'隔音鳍'+i});
    solid(x-.055,x+.055,-7.44,-5.16);
  });
  // One tag per bay, not one for the whole ceiling.  Ten baffles under a single tag span 16.9 m
  // and are judged from a point 0.95 m from the nearest of them, so half the ceiling goes dark
  // together the moment the eye leaves a room; five linear luminaires under one tag spanned 19 m.
  [-8.4,-4.2,0,4.2,8.4].forEach((x,i)=>{ for(const z of [-6.70,-4.80])
    box(x,A.H-.38,z,2.35,.38,.07,x===0?P.blue:P.blueL,
      {round:.035,hard:true,mode:7,gloss:.04,tag:'吸音板'+i}); });
  [-9.5,-4.75,0,4.75,9.5].forEach((x,i)=>panelLight(x,-5.70,3.2,'灯槽厅'+i));
  // The band between the glazed line and the first desk row carries no shell ceiling panel — the
  // shell's are at z -2.0 and -5.7 — and it is now the hall's main east-west aisle, with the scan
  // bench and the printer on it.  Three luminaires, not five: this is a route, not a workspace.
  [-8.0,0,8.0].forEach((x,i)=>panelLight(x,-3.70,3.0,'灯槽前厅'+i));

  // Invoice intake and scan bench, tight against the glazed line so the hall keeps a walkable
  // north aisle in front of it.
  box(-10.08,.84,-3.05,2.45,.14,.82,P.oak,{hard:true,gloss:.23,tag:'发票扫描仪'});
  box(-10.08,1.16,-3.06,.78,.46,.64,P.wallD,{hard:true,gloss:.20,tag:'发票扫描仪'});
  box(-10.08,1.22,-3.40,.61,.025,.42,P.screen,{hard:true,mode:1,glow:.08,tag:'发票扫描仪'});
  for(let i=0;i<4;i++) box(-9.30+i*.18,.94,-3.18,.14,.07,.30,P.paper,
    {hard:true,rz:(i-1.5)*.025,tag:'发票扫描仪'});
  capsule(-10.08,1.40,-3.06,.030,.58,.030,P.steel,{rz:Math.PI/2,gloss:.48,tag:'发票扫描仪'});
  box(-10.45,1.28,-3.38,.16,.12,.035,P.screen,{hard:true,mode:1,glow:.08,tag:'发票扫描仪'});
  for(let i=0;i<3;i++)box(-10.92+i*.18,.94,-3.17,.14,.028,.28,P.paper,
    {hard:true,rz:(i-1)*.015,tag:'发票扫描仪'});
  solid(-11.35,-8.82,-3.55,-2.60);
  station('发票扫描仪','scan-invoice',-10.08,1.13,-3.25,
    '把纸质发票摊平，扫描以后核对号码和金额。',
    'Flatten the paper invoice, scan it, then verify its number and amount.',
    '发票 is an official invoice; 扫描 means to scan.',[-10.05,-4.05],1.65,{stage:'intake'});

  // Shared finance printer and document-finishing bench.
  printer(10.45,-3.15,'财务打印机');
  station('财务打印机','print-finance-pack',10.45,.92,-3.48,
    '打印月末财务包，再按成本中心分成几叠。',
    'Print the month-end finance pack and sort it into cost-centre bundles.',
    '打印 means to print; 财务 is finance.',[10.45,-4.15],1.65,{stage:'output'});

  for(const [x,tag] of [[-10.20,'绿植西'],[10.20,'绿植东']]) {
    taper(x,.26,-8.30,.52,.52,.46,P.white,{gloss:.20,tag});
    for(let i=0;i<7;i++) {
      const a=i*2.399;
      capsule(x+Math.sin(a)*.18,.72+Math.cos(i)*.08,-8.30+Math.cos(a)*.18,
        .055,.78,.055,P.plant,{ry:a,rz:(i%2?1:-1)*.38,gloss:.10,tag});
    }
    solid(x-.29,x+.29,-8.59,-8.01);
  }

  // ---------------------------------------------------------------- accounts payable room
  // Two doors on the same axis, x = -7.80, so the spine and the hall are joined by a straight
  // 1.66 m column between the desk and the invoice archive rather than a detour round furniture.
  taskDesk(-9.30,-.35,0,'应付账款','应付账款电脑','付');
  chair(-9.30,.40,Math.PI,'应付椅');
  cabinet(-11.15,.90,1.85,1.82,'供应商档案',Math.PI/2);
  cabinet(-6.52,.90,1.85,1.82,'发票档案',-Math.PI/2);
  station('应付账款','match-invoices',-9.30,1.16,-.50,
    '把采购单、收货记录和发票三项核对一致。',
    'Match the purchase order, goods receipt and invoice.',
    '应付账款 is accounts payable; 核对 means to reconcile.',[-9.30,.55],1.70,{stage:'matching'});
  station('供应商档案','check-vendor-file',-11.08,1.15,.85,
    '查供应商资料，确认收款账户没有临时变更。',
    'Check the vendor file and confirm the receiving bank account has not changed.',
    '供应商 is a supplier; 档案 is a file.',[-10.50,.85],1.55,{stage:'verification'});
  panelLight(-8.9,0,3.6,'灯槽应付');

  // ---------------------------------------------------------------- payroll office
  // Confidential work, so the room has no glazed door onto the open hall: staff reach it through
  // the claims hall, and the public reach only the counter.
  // Desk and chair are both 0.25 m further west than the room's centre line wants them.  Centred,
  // the pull-back chair left a 0.72 m gap to the counter wall — passable, but the narrowest point
  // on the floor and well under the 0.90 m a route should have.  Against the west wall it is 0.92 m.
  taskDesk(-5.30,-1.25,Math.PI/2,'工资系统','工资电脑','薪');
  chair(-4.50,-1.25,-Math.PI/2,'工资椅');
  chair(-3.95,.95,Math.PI/2,'窗口椅');
  station('工资系统','review-payroll',-4.95,1.16,-1.25,
    '复核本月考勤、津贴和工资总额，再锁定工资表。',
    'Review attendance, allowances and the payroll total, then lock the payroll sheet.',
    '工资 is salary; 考勤 is attendance.',[-4.30,-1.25],1.70,{stage:'payroll'});
  panelLight(-4.6,-.3,2.2,'灯槽工资');

  // 报销窗口 — the transaction window itself.  The aperture in the wall is real; this joinery
  // fills it and re-closes the collision, so a claimant queues in the hall and never gets inside.
  box(-3.20,.50,.95,.74,1.00,1.52,P.wallD,{hard:true,gloss:.18,tag:'报销窗口'});
  box(-3.20,1.03,.95,.88,.09,1.64,P.oak,{round:.03,hard:true,gloss:.28,tag:'报销窗口'});
  box(-3.20,1.83,.95,.05,1.00,1.50,P.glass,
    {hard:true,mode:1,alpha:.24,gloss:.62,tag:'报销窗口'});
  for(const z of [.20,1.70]) box(-3.20,1.72,z,.16,1.30,.16,P.steel,
    {hard:true,gloss:.44,tag:'报销窗口'});
  box(-3.20,2.30,.95,.20,.10,1.66,P.steel,{hard:true,gloss:.40,tag:'报销窗口'});
  box(-2.90,1.14,1.35,.16,.13,.20,P.black,{round:.02,hard:true,gloss:.28,tag:'报销窗口'});
  cyl(-2.90,1.20,1.27,.020,.014,P.green,{rx:Math.PI/2,mode:1,glow:.06,tag:'报销窗口'});
  glyphs(-3.08,2.30,.95,Math.PI/2,'报销窗口',
    {size:.10,gap:.024,color:P.blue,mode:1,lift:.010,tag:'报销窗口'});
  solid(-3.62,-2.78,.15,1.75);
  station('报销窗口','submit-expense',-2.95,1.10,.95,
    '在窗口填写报销单，把发票按日期贴好以后交给出纳。',
    'Fill in the claim at the window, attach the receipts by date and hand them over.',
    '报销 means reimbursement; 窗口 is a service window.',[-2.35,.95],1.60,{stage:'expense'});

  // ---------------------------------------------------------------- claims hall
  // The public room, and the only through-route from the lift landing to the daylight hall.  It is
  // deliberately 2.84 m clear with 1.90 m still free between the counter and the waiting bench, so
  // a queue and a person walking past can coexist.
  box(-2.95,.55,-1.05,.34,1.10,.44,P.navy,{round:.03,hard:true,gloss:.22,tag:'叫号机'});
  box(-2.94,1.22,-1.05,.30,.30,.40,P.black,{hard:true,gloss:.26,tag:'叫号机'});
  box(-2.90,1.22,-1.05,.20,.24,.32,P.screen,{hard:true,mode:1,glow:.09,tag:'叫号机'});
  glyphs(-2.79,1.26,-1.05,Math.PI/2,'取号',
    {size:.075,gap:.018,color:P.screenL,mode:1,glow:.04,lift:.008,tag:'叫号机'});
  solid(-3.12,-2.74,-1.32,-.78);
  station('叫号机','take-queue-ticket',-2.72,1.22,-1.05,
    '先取号，屏幕上叫到号码再去窗口。',
    'Take a ticket first and go to the window when your number is called.',
    '取号 means to take a queue number.',[-2.30,-1.05],1.55,{stage:'queue'});

  box(-.60,.44,.70,.48,.10,1.90,P.oak,{round:.04,hard:true,gloss:.26,tag:'等候椅'});
  for(const z of [-.05,1.45]) box(-.60,.22,z,.42,.34,.09,P.steel,
    {hard:true,gloss:.40,tag:'等候椅'});
  box(-.34,.80,.70,.07,.56,1.86,P.blueL,{hard:true,mode:7,gloss:.10,tag:'等候椅'});
  solid(-.88,-.30,-.32,1.72);
  box(-.34,1.74,.70,.09,1.12,2.10,P.white,{hard:true,tag:'报销流程'});
  glyphs(-.28,2.08,.70,Math.PI/2,'报销流程',
    {size:.17,gap:.042,color:P.blue,mode:1,lift:.010,tag:'报销流程'});
  glyphs(-.28,1.62,.70,Math.PI/2,'填单 → 附票 → 审批 → 付款',
    {size:.10,gap:.022,color:P.black,mode:1,lift:.010,tag:'报销流程'});
  info('报销流程',-.42,1.60,.70,
    '报销必须经过填单、附票、审批和付款四步。',
    'Reimbursement passes through claim, receipt, approval and payment.',
    '流程 is a workflow.',[-1.30,.70],1.60);
  panelLight(-1.70,-.30,2.3,'灯槽报销');

  // ---------------------------------------------------------------- budget room
  // The door is at the west end so the quarterly board can keep the whole north wall; entering
  // opposite a 4 m board would have meant walking straight into it.
  meetingTable(2.55,-.20,3.60,1.10,'预算桌');
  box(3.15,1.54,1.85,4.10,1.82,.12,P.white,{hard:true,gloss:.15,tag:'预算表'});
  solid(1.10,5.20,1.72,1.92);
  glyphs(3.15,1.84,1.78,Math.PI,'季度预算',
    {size:.22,gap:.055,color:P.blue,mode:1,lift:.012,tag:'预算表'});
  for(let i=0;i<5;i++) {
    const h=.18+i*.12;
    box(1.55+i*.52,.72+h/2,1.74,.29,h,.03,i<3?P.blueL:P.amber,{hard:true,mode:1,tag:'预算表'});
  }
  station('预算表','prepare-budget',1.35,1.50,1.72,
    '比较实际支出和预算，给超支项目写一条说明。',
    'Compare actual spending with budget and explain each overspend.',
    '预算 is a budget; 超支 means over budget.',[1.05,1.35],1.70,{stage:'planning'});
  station('预算桌','review-budget',2.55,.82,-.20,
    '和部门负责人逐项确认下个季度的预算。',
    'Review next quarter\'s budget line by line with the department lead.',
    '逐项 means item by item.',[2.18,-1.06],1.75,{stage:'meeting'});
  panelLight(2.55,-.10,4.2,'灯槽预算');

  // ---------------------------------------------------------------- cashier and payment room
  // Treasury, not audit.  It keeps its glazed door onto the accounting hall because it belongs to
  // the department; the room that checks it does not.
  // Both pushed to the east wall.  Centred, the 1.72 m desk left 0.76 m west and 0.66 m east of
  // itself, and a 0.30 m body cannot steer either: the flood fill cut this 3.1 m room clean in
  // two and stranded its whole north half. One 1.31 m column beats two that only look passable.
  cabinet(8.20,-1.85,1.20,1.82,'付款凭证',-Math.PI/2);
  taskDesk(7.55,-.35,0,'银行付款机','付款电脑','付');
  chair(7.55,.40,Math.PI,'出纳椅');
  box(7.00,1.48,1.85,2.60,1.44,.12,P.navy,{hard:true,mode:7,tag:'付款清单'});
  solid(5.70,8.30,1.78,1.92);
  glyphs(7.00,1.72,1.77,Math.PI,'付款清单',
    {size:.18,gap:.045,color:P.white,mode:1,lift:.012,tag:'付款清单'});
  for(let i=0;i<5;i++) glyphs(7.00,1.47-i*.18,1.77,Math.PI,'□ 复核',
    {size:.10,gap:.024,color:i<2?P.green:P.white,mode:1,lift:.012,tag:'付款清单'});
  station('付款凭证','file-payment-voucher',7.85,1.15,-1.85,
    '把当天的付款凭证按批次编号归档。',
    'File the day\'s payment vouchers by batch number.',
    '凭证 is an accounting voucher.',[7.15,-1.85],1.55,{stage:'filing'});
  station('银行付款机','release-payment',7.55,1.16,-.50,
    '完成双人复核以后，把批准的付款批次发送给银行。',
    'After dual approval, release the approved payment batch to the bank.',
    '付款 is payment; 复核 is a second check.',[7.55,.55],1.70,{stage:'payment',secure:true});
  info('付款清单',7.00,1.48,1.70,
    '清单上每一笔付款都需要两个人复核。',
    'Every payment on the list requires two-person approval.',
    '清单 is a checklist.',[7.00,1.00],1.55);
  panelLight(6.95,-.20,2.6,'灯槽付款');

  // ---------------------------------------------------------------- audit room
  // The separation the whole plan exists for: one door, off the public spine, and no opening into
  // either the accounting hall or the payment room next door.  An auditor reaches this room
  // without passing a single desk belonging to the department being audited.
  taskDesk(10.55,-.30,Math.PI,'审计工位','审计电脑','审');
  chair(10.55,-1.03,0,'审计椅');
  cabinet(10.75,1.58,2.00,1.90,'审计档案',0);
  taper(9.10,.26,-2.05,.52,.52,.46,P.white,{gloss:.20,tag:'绿植审计'});
  for(let i=0;i<7;i++) {
    const a=i*2.399;
    capsule(9.10+Math.sin(a)*.18,.72+Math.cos(i)*.08,-2.05+Math.cos(a)*.18,
      .055,.78,.055,P.plant,{ry:a,rz:(i%2?1:-1)*.38,gloss:.10,tag:'绿植审计'});
  }
  solid(8.81,9.39,-2.34,-1.76);
  station('审计档案','retrieve-audit-file',10.75,1.20,1.28,
    '按年度和凭证号取出审计抽查需要的原始资料。',
    'Retrieve source documents by year and voucher number for the audit sample.',
    '审计 is an audit; 凭证 is an accounting voucher.',[10.75,.75],1.60,{stage:'audit'});
  station('审计工位','review-audit',10.55,1.16,-.55,
    '把抽到的凭证和账簿逐笔对照，把差异写进底稿。',
    'Check each sampled voucher against the ledger and record differences in the working papers.',
    '底稿 are audit working papers; 差异 is a discrepancy.',[10.55,-1.03],1.70,
    {stage:'audit',independent:true});
  panelLight(10.25,-.20,2.6,'灯槽审计');

});

// Finance staff must be present before game.js performs its one-time NPC initialisation, not when
// this lazy floor first builds. Each role is seated in its authored task chair; the manager uses an
// actual budget-table chair rather than floating between two seats, and the auditor sits inside the
// separated audit room so the plan reads at a glance.
if (typeof OfficeCast!=='undefined') OfficeCast.push(
  { hz:'会计', name:'刘敏', py:'Liú Mǐn', place:'office2', temper:'careful', seatY:.48, faceLock:true,
    look:{skin:'#ddb089',hair:'#28221f',hairStyle:'bob',top:'#e5e1d8',pants:'#3c4650',shoe:'#2f3438',glasses:true,tall:.98,wide:.94,faceSeed:9201},
    spots:[{h0:8.5,h1:18.5,at:[-9.60,-4.87],face:Math.PI,act:'desk'}] },
  { hz:'出纳', name:'王璐', py:'Wáng Lù', place:'office2', temper:'brisk', seatY:.48, faceLock:true,
    look:{skin:'#c99169',hair:'#211d1a',hairStyle:'bun',top:'#6a8799',pants:'#303a44',shoe:'#252b30',tall:1.01,wide:.92,faceSeed:9202},
    spots:[{h0:8.5,h1:18,at:[7.55,.40],face:Math.PI,act:'desk'}] },
  { hz:'财务经理', name:'蒋雯', py:'Jiǎng Wén', place:'office2', temper:'steady', seatY:.48, faceLock:true,
    look:{skin:'#d3a17b',hair:'#554b44',hairStyle:'short',top:'#f0ece3',pants:'#38434d',shoe:'#30353a',jacket:'#354f65',collar:'shirt',glasses:true,tall:1.02,wide:.98,age:.42,faceSeed:9203},
    spots:[{h0:9,h1:18,at:[2.18,-1.06],face:0,act:'read'}] },
  { hz:'审计师', name:'方岚', py:'Fāng Lán', place:'office2', temper:'careful', seatY:.48, faceLock:true,
    look:{skin:'#d8a882',hair:'#2b2521',hairStyle:'short',top:'#dfe3e4',pants:'#333c45',shoe:'#2b3034',glasses:true,tall:1.00,wide:.93,age:.34,faceSeed:9204},
    spots:[{h0:9,h1:17.5,at:[10.55,-1.03],face:0,act:'desk'}] },
  { hz:'报销窗口', name:'陈昕', py:'Chén Xīn', place:'office2', temper:'brisk', seatY:.48, faceLock:true,
    look:{skin:'#cfa079',hair:'#241f1c',hairStyle:'bob',top:'#eae6dc',pants:'#39434c',shoe:'#2d3236',tall:.97,wide:.95,faceSeed:9205},
    spots:[{h0:9,h1:17,at:[-3.95,.95],face:Math.PI/2,act:'desk'}] }
);

// Floor-local activity registry. The action id, not the visible noun, is the contract: this lets
// later job steps distinguish scanning an invoice from searching a vendor file even though both
// happen beside ordinary office furniture.
Object.assign(OfficeUse.office2, {
  'scan-invoice':{zh:'扫描发票',py:'sǎomiáo fāpiào',en:'scan an invoice',secs:2.8,mins:8,
    gain:{rest:-2},pose:{type:'work'}},
  'print-finance-pack':{zh:'打印财务包',py:'dǎyìn cáiwù bāo',en:'print the finance pack',secs:2.7,mins:6,
    gain:{rest:-1},pose:{type:'work'}},
  'match-invoices':{zh:'核对应付账款',py:'héduì yìngfù zhàngkuǎn',en:'match payable invoices',secs:3.6,mins:25,
    gain:{rest:-5,mood:-2},pose:{type:'type',seatY:.48}},
  'check-vendor-file':{zh:'查供应商档案',py:'chá gōngyìngshāng dàng’àn',en:'check a vendor file',secs:2.8,mins:12,
    gain:{rest:-2},pose:{type:'check'}},
  'review-payroll':{zh:'复核工资表',py:'fùhé gōngzībiǎo',en:'review payroll',secs:3.8,mins:30,
    gain:{rest:-6,mood:-2},pose:{type:'type',seatY:.48}},
  'take-queue-ticket':{zh:'取号',py:'qǔ hào',en:'take a queue ticket',secs:1.8,mins:3,
    gain:{},pose:{type:'check'}},
  'submit-expense':{zh:'提交报销',py:'tíjiāo bàoxiāo',en:'submit an expense claim',secs:3.0,mins:12,
    gain:{rest:-2},pose:{type:'work'}},
  'prepare-budget':{zh:'编制预算',py:'biānzhì yùsuàn',en:'prepare a budget',secs:4.0,mins:35,
    gain:{rest:-7,mood:-2},pose:{type:'write'}},
  'review-budget':{zh:'开预算会',py:'kāi yùsuàn huì',en:'hold a budget review',secs:3.6,mins:30,
    gain:{rest:-5,mood:1},pose:{type:'sit',seatY:.48}},
  'file-payment-voucher':{zh:'归档付款凭证',py:'guīdàng fùkuǎn píngzhèng',en:'file a payment voucher',secs:2.6,mins:10,
    gain:{rest:-2},pose:{type:'check'}},
  'release-payment':{zh:'发送付款批次',py:'fāsòng fùkuǎn pīcì',en:'release a payment batch',secs:3.2,mins:15,
    gain:{rest:-3,mood:-1},pose:{type:'type',seatY:.48}},
  'retrieve-audit-file':{zh:'取审计档案',py:'qǔ shěnjì dàng’àn',en:'retrieve an audit file',secs:2.5,mins:8,
    gain:{rest:-2},pose:{type:'check'}},
  'review-audit':{zh:'审阅底稿',py:'shěnyuè dǐgǎo',en:'review audit working papers',secs:3.8,mins:30,
    gain:{rest:-6,mood:-1},pose:{type:'type',seatY:.48}},
});
