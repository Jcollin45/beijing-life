// 华北创意中心 · 地下一层后勤运营
//
// The basement closes the loop between a public office and the invisible work that keeps it
// running: deliveries are received, parcels sorted, bicycles stored, supplies counted, equipment
// repaired and records stored.  A broad marked logistics lane runs from the service-lift side of
// the south spine to the receiving doors; furniture and cages stay outside that measured route.
//
// WHAT THE PLATE ACTUALLY HAD, measured rather than counted.  Six rooms were registered and five
// partitions were built, which reads like a nearly complete floor and was not one: receiving, the
// server room and the archive had four sides, but the staff changing room, the workshop and the
// whole east half had no north wall at all and opened onto the lift lobby along their full width
// — 4.9 m, 3.6 m and 9.7 m of missing wall.  A 3.5 m2 strip behind the server racks was standable
// and could not be reached from anywhere.  And the programme's 自行车库 did not exist.  The wall
// on z = 1.98, the bicycle store, and the rack row moved back against the south wall are those
// three findings; everything else here is as it was.

OfficeFit.register('officeB1', A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
    partitionZ,partitionX,sign,doorPlate,room,
  }=A;
  const P={
    slab:A.C('#676e6d'), slabD:A.C('#4e5656'), wall:A.C('#d5d6d1'),
    wallD:A.C('#aeb3b1'), steel:A.C('#727c7e'), steelD:A.C('#3e484b'),
    white:A.C('#f0eee7'), black:A.C('#1e2528'), safety:A.C('#deb244'),
    teal:A.C('#4b756d'), tealL:A.C('#83a99f'), red:A.C('#a8493d'),
    blue:A.C('#3d6680'), orange:A.C('#c87335'), green:A.C('#4f7457'),
    cardboard:A.C('#9a7952'), cardboardL:A.C('#b9986d'), wood:A.C('#8d6a48'),
    screen:A.C('#17323a'), screenL:A.C('#8eb9be'), cable:A.C('#2b3032'),
  };
  // build.js `glyphs` registers its own characters, but the signage on this floor is written by
  // several helpers and one missed call renders as blank paper, so the whole vocabulary is
  // declared once here as well.
  try{Glyphs.need('后勤运营物流通道收货验收区发与分拣器材维修信息设备档案物料员工更衣自行车库' +
    '回收快递格分拣台零件架储物柜长凳服务机柜网络监控库存终端站装卸门打气筒车架');}catch(_){}
  const tagOpt=(tag,o={})=>tag?{...o,tag}:o;
  const station=(hz,id,x,y,z,zh,en,note,focus=[x,z],reach=1.7,extra={})=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    th.officeAction=id;
    th.officeStation={floor:A.key,id,department:'operations',...extra};
    return th;
  };
  const info=(hz,x,y,z,zh,en,note,focus=[x,z],reach=1.7)=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});th.officeFloor=A.key;return th;
  };

  // ONE TAG PER FITTING.  All nine luminaires used to share '灯': one group 17.9 m wide by 7.4 m
  // deep whose centre landed at about (0, -3.8), 4.4 m from the nearest fitting in it and inside
  // no room at all.  The cutaway then switched every light in the basement together, judged from
  // a point in the middle of the lane.  The coordinate in the tag keeps each group to one box.
  function stripLight(x,z,w=3.0) {
    const tag='灯'+x.toFixed(2)+'/'+z.toFixed(2);
    const p=box(x,A.H-.17,z,w,.045,.18,P.white,{hard:true,mode:1,glow:.14,tag});
    if(A.luminous)A.luminous(p,.05,.25);
    light(x,A.H-.34,z,[.90,.96,1],.24,3.5);
    glow(M.trs(x,.023,z,0,w*1.15,1,2.1),P.white,.030);
  }
  function cageWallZ(z,x0,x1,openings=[],tag='铁网') {
    const cuts=openings.map(([c,w])=>[c-w/2,c+w/2]).sort((a,b)=>a[0]-b[0]);
    let at=x0;
    const span=(a,b)=>{
      if(b-a<.05)return;
      for(let x=a;x<=b+.01;x+=.36) capsule(x,1.30,z,.018,2.60,.018,P.steelD,{gloss:.42,...tagOpt(tag)});
      for(const y of [.12,.72,1.32,1.92,2.55]) box((a+b)/2,y,z,b-a,.025,.035,P.steelD,{hard:true,...tagOpt(tag)});
      solid(a,b,z-.04,z+.04);
    };
    for(const [a,b] of cuts){span(at,a);box((a+b)/2,2.72,z,b-a,.16,.08,P.steelD,{hard:true,...tagOpt(tag)});at=b;}
    span(at,x1);
  }
  function pallet(x,z,boxes=5,tag='货物') {
    for(const dz of [-.42,0,.42]) box(x,.10,z+dz,1.30,.14,.10,P.wood,{hard:true,mode:6,...tagOpt(tag)});
    for(const dx of [-.54,0,.54]) box(x+dx,.05,z, .10,.10,1.10,P.wood,{hard:true,mode:6,...tagOpt(tag)});
    for(let i=0;i<boxes;i++) {
      const row=i<3?0:1, n=row?boxes-3:Math.min(3,boxes), j=row?i-3:i;
      const bx=x+(j-(n-1)/2)*.43;
      box(bx,.31+row*.42,z,.38,.40,.68,row?P.cardboardL:P.cardboard,
        {hard:true,gloss:.08,...tagOpt(tag)});
      // Tape, label and a two-line barcode turn each carton into handled stock rather than a
      // pile of anonymous cubes. These details have no collider and leave pallet circulation
      // exactly as measured below.
      box(bx,.52+row*.42,z,.40,.025,.08,P.wallD,{hard:true,...tagOpt(tag)});
      box(bx,.31+row*.42,z-.347,.055,.27,.012,P.wallD,{hard:true,mode:1,...tagOpt(tag)});
      box(bx+.10,.34+row*.42,z-.354,.15,.12,.010,P.white,{hard:true,mode:1,...tagOpt(tag)});
      for(let k=0;k<4;k++)box(bx+.055+k*.027,.34+row*.42,z-.361,.010,.075,.008,P.black,
        {hard:true,mode:1,...tagOpt(tag)});
    }
    solid(x-.72,x+.72,z-.62,z+.62);shade(x,z,1.58,1.36,.24);
  }
  function rack(x,z,w=2.6,h=2.45,ry=0,tag='物料架') {
    const swap=Math.abs(Math.sin(ry))>.5;
    for(const u of [-w/2,w/2]) {
      const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
      capsule(px,h/2,pz,.045,h,.045,P.steelD,{gloss:.44,...tagOpt(tag)});
    }
    for(const y of [.18,.82,1.46,2.10]) {
      // Dimensions are local to the rotated prop.  Swapping them here and then applying `ry`
      // rotated the shelf twice, leaving the visible 2.4 m run across x while its collider and
      // uprights correctly ran along z. Keep the authored local width and let the matrix rotate it.
      box(x,y,z,w,.065,.62,P.steel,{hard:true,ry,gloss:.34,...tagOpt(tag)});
      for(let i=0;i<4;i++) {
        const u=-w*.36+i*w*.24;
        const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        box(px,y+.22,pz,.48,.40,.48,[P.cardboard,P.cardboardL,P.blue,P.teal][i],
          {hard:true,ry,gloss:.09,...tagOpt(tag)});
      }
    }
    solid(x-(swap?.36:w/2),x+(swap?.36:w/2),z-(swap?w/2:.36),z+(swap?w/2:.36));
  }
  function workbench(x,z,w=2.7,tag='器材维修台') {
    box(x,.82,z,w,.13,.82,P.wood,{hard:true,mode:6,gloss:.24,...tagOpt(tag)});
    for(const sx of [-1,1]) box(x+sx*(w/2-.12),.40,z,.10,.80,.66,P.steelD,{hard:true,...tagOpt(tag)});
    box(x,1.68,z+.36,w,1.45,.08,P.steelD,{hard:true,...tagOpt(tag)});
    for(const y of [1.15,1.55,1.95,2.28])
      for(let u=-w*.39;u<w*.42;u+=.20)cyl(x+u,y,z+.315,.018,.025,P.black,{rx:Math.PI/2,...tagOpt(tag)});
    // Recognisable hanging tools make the pegboard useful at room scale, not just a field of dots.
    capsule(x-.76,1.62,z+.268,.030,.52,.030,P.orange,{gloss:.30,...tagOpt(tag)});
    capsule(x-.76,1.89,z+.258,.040,.30,.040,P.steelD,{rz:Math.PI/2,gloss:.44,...tagOpt(tag)});
    capsule(x-.10,1.62,z+.266,.026,.48,.026,P.steel,{rz:.10,gloss:.48,...tagOpt(tag)});
    for(const s of [-1,1])capsule(x-.10+s*.08,1.86,z+.258,.025,.22,.025,P.steel,
      {rz:s*.48,gloss:.48,...tagOpt(tag)});
    for(const s of [-1,1])capsule(x+.60+s*.055,1.55,z+.263,.024,.46,.024,s<0?P.red:P.blue,
      {rz:s*.14,gloss:.28,...tagOpt(tag)});
    // Vice, task lamp and a partly opened device.
    box(x-.92,.97,z-.18,.34,.22,.34,P.blue,{hard:true,gloss:.28,...tagOpt(tag)});
    capsule(x+.85,1.34,z+.12,.030,.74,.030,P.steel,{rz:-.55,gloss:.50,...tagOpt(tag)});
    taper(x+.62,1.62,z-.14,.30,.18,.30,P.white,{rx:Math.PI/2,mode:1,glow:.11,...tagOpt(tag)});
    box(x,.94,z-.14,.74,.09,.48,P.black,{hard:true,...tagOpt(tag)});
    box(x,1.01,z-.14,.60,.025,.34,P.screen,{hard:true,mode:1,glow:.05,...tagOpt(tag)});
    // Steel drawers, rolled handles and loose hand tools give the bench a recognisable service
    // silhouette at the doorway. They remain within the existing collision rectangle.
    for(let i=0;i<3;i++){
      box(x+1.03,.29+i*.19,z-.24,.53,.16,.48,P.steel,{hard:true,gloss:.24,...tagOpt(tag)});
      capsule(x+1.03,.29+i*.19,z-.495,.018,.23,.018,P.black,
        {rz:Math.PI/2,gloss:.34,...tagOpt(tag)});
    }
    capsule(x-.34,.96,z-.18,.025,.38,.025,P.orange,{rz:Math.PI/2,gloss:.30,...tagOpt(tag)});
    capsule(x-.18,.96,z-.04,.030,.30,.030,P.steelD,{rz:Math.PI/2,ry:.28,gloss:.44,...tagOpt(tag)});
    cyl(x+.26,.96,z-.13,.11,.045,P.red,{gloss:.22,...tagOpt(tag)});
    capsule(x,.20,z+.18,.040,w-.42,.040,P.steelD,{rz:Math.PI/2,gloss:.40,...tagOpt(tag)});
    for(const sx of [-1,1])ball(x+sx*(w/2-.12),.035,z-.22,.075,.035,.075,P.black,
      {gloss:.20,...tagOpt(tag)});
    solid(x-w/2,x+w/2,z-.48,z+.48);shade(x,z,w+.2,1.18,.22);
  }
  function terminal(x,z,ry=0,tag='库存终端') {
    const nx=Math.sin(ry),nz=Math.cos(ry);
    box(x,.82,z,.72,1.42,.58,P.steelD,{hard:true,ry,...tagOpt(tag)});
    box(x,1.45,z,.68,.46,.12,P.black,{hard:true,ry,...tagOpt(tag)});
    box(x+nx*.067,1.45,z+nz*.067,.56,.34,.015,P.screen,{hard:true,ry,mode:1,glow:.10,...tagOpt(tag)});
    glyphs(x+nx*.078,1.45,z+nz*.078,ry,'库存',{size:.09,gap:.02,color:P.screenL,mode:1,lift:.008,tag});
    box(x,.70,z-nz*.34,.52,.055,.24,P.black,{hard:true,ry,...tagOpt(tag)});
    solid(x-.42,x+.42,z-.36,z+.36);
  }
  // `ry` is the direction the doors face, in the same convention as `glyphs` — 0 faces +z.  Every
  // door fitting therefore has to be pushed out along that vector.  The divider ribs, handles,
  // vents and numbers all used to sit on the bank's centre plane or 245 mm behind it while their
  // yaw still faced forward, so the ribs were buried inside the carcass and the numbers were
  // drawn on the back face pointing into it: at ry = 0 the numbering of the changing room was
  // rendered inside the lockers and back-face culled.
  function lockerBank(x,z,n=7,ry=0,tag='员工储物柜') {
    const w=n*.48,swap=Math.abs(Math.sin(ry))>.5;
    const fx=Math.sin(ry),fz=Math.cos(ry);
    box(x,1.12,z,swap?.46:w,2.20,swap?w:.46,P.steel,{hard:true,ry,gloss:.22,...tagOpt(tag)});
    for(let i=0;i<n;i++) {
      const u=(i-(n-1)/2)*.48,px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
      box(px+fx*.232,1.12,pz+fz*.232,.025,2.12,.025,P.steelD,{hard:true,ry,...tagOpt(tag)});
      box(px+.13*Math.cos(ry)+fx*.228,1.18,pz-.13*Math.sin(ry)+fz*.228,
        .035,.20,.035,P.black,{hard:true,ry,...tagOpt(tag)});
      for(const yy of [.53,1.60])
        for(const q of [-.055,0,.055])box(px+Math.cos(ry)*q+fx*.236,yy,pz-Math.sin(ry)*q+fz*.236,
          .025,.11,.015,P.steelD,{hard:true,ry,...tagOpt(tag)});
      glyphs(px+fx*.245,1.82,pz+fz*.245,ry,String(i+1),
        {size:.07,color:P.black,mode:1,lift:.008,tag});
    }
    solid(x-(swap?.27:w/2),x+(swap?.27:w/2),z-(swap?w/2:.27),z+(swap?w/2:.27));
  }

  // ---------------------------------------------------------------- bicycle store
  // Authored entirely in the z–y plane and parked nose toward -z, so every wheel is a disc whose
  // axis runs along x and no part carries `ry`: the row stays exactly parallel and its single
  // collision rectangle is honest about where the steel is.
  function bicycle(x,z,frame,tag='自行车') {
    for(const dz of [-.52,.52]) {
      cyl(x,.335,z+dz,.335,.042,P.black,{rz:Math.PI/2,gloss:.14,...tagOpt(tag)});
      cyl(x,.335,z+dz,.290,.046,P.slabD,{rz:Math.PI/2,gloss:.30,...tagOpt(tag)});
      cyl(x,.335,z+dz,.048,.084,P.steelD,{rz:Math.PI/2,gloss:.48,...tagOpt(tag)});
    }
    // Head, down, seat, top, chain stay, seat stay and fork.  `rx` tilts a capsule's own +y axis
    // toward +z, which is the plane the whole machine lives in.
    capsule(x,.94,z-.42,.036,.22,.036,frame,{gloss:.32,...tagOpt(tag)});
    capsule(x,.60,z-.15,.034,.78,.034,frame,{rx:-.766,gloss:.32,...tagOpt(tag)});
    capsule(x,.62,z+.27,.034,.67,.034,frame,{rx:.464,gloss:.32,...tagOpt(tag)});
    capsule(x,.90,z,.030,.84,.030,frame,{rx:1.523,gloss:.32,...tagOpt(tag)});
    capsule(x,.33,z+.32,.026,.40,.026,frame,{rx:1.521,gloss:.32,...tagOpt(tag)});
    capsule(x,.63,z+.47,.024,.59,.024,frame,{rx:-.171,gloss:.32,...tagOpt(tag)});
    capsule(x,.61,z-.47,.028,.55,.028,P.steelD,{rx:.183,gloss:.44,...tagOpt(tag)});
    capsule(x,1.00,z-.40,.028,.44,.028,P.steelD,{rz:Math.PI/2,gloss:.46,...tagOpt(tag)});
    capsule(x,.98,z-.41,.026,.12,.026,P.black,{...tagOpt(tag)});
    box(x,.96,z+.44,.11,.055,.26,P.black,{round:.035,gloss:.20,...tagOpt(tag)});
    capsule(x,.86,z+.40,.026,.26,.026,P.steel,{rx:.464,gloss:.50,...tagOpt(tag)});
    cyl(x,.33,z+.12,.085,.030,P.steelD,{rz:Math.PI/2,gloss:.50,...tagOpt(tag)});
    for(const s of [-1,1])box(x+s*.115,.26,z+.12,.10,.025,.16,P.black,{hard:true,...tagOpt(tag)});
    box(x,.80,z-.55,.30,.24,.20,P.steel,{hard:true,gloss:.28,...tagOpt(tag)});
    box(x,.83,z-.55,.26,.17,.16,P.slabD,{hard:true,...tagOpt(tag)});
  }

  function palletJack(x,z,ry=0,tag='货物') {
    const ux=Math.cos(ry),uz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    for(const s of [-.28,.28]){
      box(x+ux*s+fx*.18,.10,z+uz*s+fz*.18,.11,.09,1.55,P.safety,
        {hard:true,ry,gloss:.26,...tagOpt(tag)});
      ball(x+ux*s-fx*.50,.10,z+uz*s-fz*.50,.095,.095,.055,P.black,
        {ry,gloss:.18,...tagOpt(tag)});
    }
    box(x-fx*.58,.22,z-fz*.58,.74,.36,.42,P.safety,{round:.08,hard:true,ry,gloss:.27,...tagOpt(tag)});
    ball(x+ux*.29-fx*.70,.10,z+uz*.29-fz*.70,.12,.12,.065,P.black,{ry,gloss:.18,...tagOpt(tag)});
    ball(x-ux*.29-fx*.70,.10,z-uz*.29-fz*.70,.12,.12,.065,P.black,{ry,gloss:.18,...tagOpt(tag)});
    capsule(x-fx*.76,.72,z-fz*.76,.040,1.15,.040,P.steelD,{rz:-Math.sin(ry)*.46,rx:Math.cos(ry)*.46,gloss:.44,...tagOpt(tag)});
    capsule(x-fx*.93,1.18,z-fz*.93,.035,.42,.035,P.black,{rz:Math.PI/2,ry,gloss:.25,...tagOpt(tag)});
    // The jack is mobile equipment, but it is not intangible.  Use its rotated fork/handle
    // envelope rather than an oversized square so it remains parked wholly outside the marked
    // 3.2 m logistics lane while still stopping the player walking through its steel frame.
    const ex=Math.abs(Math.cos(ry))*.42+Math.abs(Math.sin(ry))*1.05;
    const ez=Math.abs(Math.sin(ry))*.42+Math.abs(Math.cos(ry))*1.05;
    solid(x-ex,x+ex,z-ez,z+ez);
    shade(x,z,1.25,2.05,.20);
  }

  // TAGS DOWN THE LANE.  A tag group is judged by ONE point — the centre of the whole group's
  // bounding box (js/build.js:273, js/game.js hiddenProp) — so a tag stretched down all 10.5 m of
  // the lane is judged from a point in the middle of it that most of its members are metres away
  // from.  These were one '物流通道' group before; they are now four, each under 3 m across and
  // each judged from inside itself.  Anything lying on the slab opts out of the cutaway entirely.
  function corridorDressing() {
    // Continuous impact rails and ceiling services make the central route feel like a working
    // basement. Everything is wall/ceiling mounted and contributes no new walking collision.
    for(const side of [-1,1]){
      capsule(side*1.60,.82,-3.25,.045,9.85,.045,P.safety,
        {rx:Math.PI/2,gloss:.36,nocut:true,tag:'物流护栏'});
      for(const z of [-7.3,-4.9,-2.5,-.1]){
        capsule(side*1.60,.55,z,.035,.54,.035,P.steelD,{gloss:.40,nocut:true,tag:'物流护栏'});
        box(side*1.60,.32,z,.12,.09,.36,P.black,{hard:true,nocut:true,tag:'物流护栏'});
      }
      capsule(side*1.18,A.H-.38,-3.35,.055,10.10,.055,side<0?P.red:P.blue,
        {rx:Math.PI/2,gloss:.42,nocut:true,tag:'管道'});
      for(const z of [-7.0,-4.4,-1.8,.8])
        box(side*1.18,A.H-.38,z,.15,.14,.12,P.steel,{hard:true,nocut:true,tag:'管道'});
    }
    // A clearance gantry frames the route without entering its 3.2 m floor width.
    for(const x of [-1.66,1.66])capsule(x,2.53,-1.05,.045,1.25,.045,P.steelD,{gloss:.45,tag:'通道龙门'});
    box(0,2.91,-1.05,3.42,.12,.12,P.steelD,{hard:true,gloss:.42,tag:'通道龙门'});
    box(0,2.57,-1.03,2.30,.48,.055,P.teal,{hard:true,mode:1,glow:.018,tag:'通道龙门'});
    glyphs(0,2.63,-.99,0,'收货 ←  通道  → 物料',
      {size:.105,gap:.023,color:P.white,mode:1,lift:.009,tag:'通道龙门'});
    // The lane terminates in a strongly composed destination rather than a blank grey wall.
    box(0,2.02,-8.69,2.76,1.16,.08,P.teal,{hard:true,mode:1,tag:'验收区标牌'});
    glyphs(0,2.25,-8.64,0,'收货验收区',{size:.19,gap:.045,color:P.white,mode:1,lift:.010,tag:'验收区标牌'});
    glyphs(0,1.78,-8.64,0,'RECEIVING',{size:.085,gap:.022,color:P.white,mode:1,lift:.010,tag:'验收区标牌'});
    for(const x of [-1.18,1.18]){
      capsule(x,.52,-8.30,.075,1.04,.075,P.safety,{gloss:.33,tag:'验收区标牌'});
      cyl(x,.06,-8.30,.14,.12,P.black,{gloss:.18,tag:'验收区标牌'});
      solid(x-.16,x+.16,-8.46,-8.14);
    }
    for(const z of [-6.85,-4.65,-2.45]){
      flat(0,.034,z,.16,.78,P.safety,{mode:1,nocut:true,tag:'通道地标'});
      taper(0,.045,z-.48,.48,.03,.52,P.safety,{rz:Math.PI,mode:1,nocut:true,tag:'通道地标'});
    }
  }

  // ---------------------------------------------------------------- floor plan
  // Trimmed 0.15 m off the north edge: the old 11.05 m depth ran to z = 2.225 and laid this
  // floor's own tile over the first 25 mm of the protected spine.
  //
  // `nocut` on every slab.  A 23.35 x 10.90 m decal is a single prop judged at its own centre,
  // (0, -3.375), which is behind the camera the moment it backs south out of any room on the
  // north side of the plate — and the whole basement floor would disappear at once.
  flat(0,.021,-3.375,23.35,10.90,P.slab,
    {mode:7,gloss:.08,mat:'tile',matScale:.72,matAmt:.18,nocut:true,tag:'后勤区'});
  // The centre lane is a true 3.2 m clear material-handling route.
  flat(0,.027,-3.35,3.20,10.45,P.slabD,{mode:7,gloss:.07,nocut:true,tag:'物流道面'});
  for(const s of [-1,1]) flat(s*1.56,.030,-3.35,.10,10.30,P.safety,
    {mode:1,alpha:.78,nocut:true,tag:'物流道面'});
  glyphs(0,.041,-5.20,0,'物流通道',{size:.20,gap:.05,color:P.safety,mode:1,lift:.006,nocut:true,tag:'通道地标'});
  sign(0,3.12,2.12,Math.PI,'B1 · 后勤运营',P.teal,'后勤运营',.22);
  // Moved 0.20 m south of the new lane header.  It faces -z and is read from inside the lane; at
  // z = 2.08 it would have been drawn on the far side of the header, pointing into it.
  glyphs(0,2.78,1.88,Math.PI,'LOGISTICS & BUILDING OPERATIONS',
    {size:.082,gap:.020,color:P.teal,mode:1,lift:.010,tag:'后勤运营'});
  corridorDressing();

  // West cages and workshop; east technology, archive, bicycles and supplies. All doors open onto
  // either the marked centre lane or the unobstructed core spine.
  //
  // TAGS.  Every stretch carries its OWN tag.  js/game.js `hiddenProp` judges a tagged prop by
  // the centre of its whole tag group (js/build.js:273), and the single '隔墙' that these six
  // calls used to share made one group spanning x -6.17..11.65 and z -8.75..2.15, whose centre
  // lands near (2.7, -3.3) — a point inside the server room that no wall on this floor occupies.
  // The cutaway then hid or revealed every partition in the basement together, judged from there.
  cageWallZ(-2.30,-11.65,-1.72,[[-6.85,1.30]],'收发围网');
  partitionX(-6.10,-2.30,2.05,[[-.10,1.20]],P.wall,'更衣隔墙');
  partitionX(-1.70,-8.75,2.05,[[-5.55,1.35],[-.05,1.25]],P.wall,'西通道隔墙');
  partitionX(1.70,-8.75,2.05,[[-5.55,1.35],[-.05,1.25]],P.wall,'东通道隔墙');
  partitionX(6.25,-8.75,2.05,[[-5.55,1.25],[-.05,1.25]],P.wall,'物料隔墙');
  // The x = 4.00 opening is gone.  It joined the server room to what is now the bicycle store —
  // an adjacency nobody walks — and the only way to keep it was to cut the bicycle row in half
  // around it.  The server room keeps its real door onto the logistics lane at (1.70, -5.55),
  // which is where a rack actually arrives from.
  partitionZ(-2.30,1.70,11.65,[[8.90,1.25]],P.wall,'机房横墙');
  // The spine wall, on z = 1.98 — the same line office-f4 uses, 0.17 m clear of the protected
  // circulation zone.  One call per bay so no two bays share a tag group.  The lane segment is a
  // header only: a 3.2 m material-handling route cannot be reduced to a door leaf, so its opening
  // is the full 3.4 m at a 2.62 m head and it lays no collision at all.
  partitionZ(1.98,-11.84,-6.10,[[-7.40,1.10,2.32]],P.wall,'更衣北墙');
  partitionZ(1.98,-6.10,-1.70,[[-4.10,1.10,2.32]],P.wall,'维修北墙');
  partitionZ(1.98,-1.70,1.70,[[0,3.40,2.62]],P.wall,'通道门楣');
  partitionZ(1.98,1.70,6.25,[[4.00,1.45,2.32]],P.wall,'车库北墙');
  partitionZ(1.98,6.25,11.84,[[11.05,1.10,2.32]],P.wall,'物料北墙');
  // Each plate wears its OWN name.  Lending it the fixture's tag looked tidy — plate and machine
  // highlighting together — and it was the largest tag fault on the floor: a plate on the door at
  // z = -2.25 joined to racks at z = -8.3 made a 7.1 m group judged from (3.8, -5.3), 2.5 m from
  // the nearest cabinet and in the middle of the room's walking space.  Measured across all seven
  // stations this alone accounted for orphans of 2.53, 1.40, 0.98 and 0.92 m.
  doorPlate(-6.85,2.50,-2.25,Math.PI,'收发与分拣','收发与分拣',P.teal);
  // Follows the server room's surviving door onto the logistics lane.  It reads from inside the
  // lane, off the west face of the x = 1.70 partition, and carries no collider into the 3.2 m route.
  doorPlate(1.59,2.50,-5.55,-Math.PI/2,'信息设备','信息设备',P.teal);
  doorPlate(8.90,2.50,-2.25,Math.PI,'档案与物料','档案与物料',P.teal);
  doorPlate(-7.40,2.50,2.10,Math.PI,'员工更衣','员工更衣',P.teal);
  doorPlate(-4.10,2.50,2.10,Math.PI,'器材维修','器材维修',P.teal);
  doorPlate(4.00,2.50,2.10,Math.PI,'自行车库','自行车库',P.teal);
  doorPlate(11.05,2.50,2.10,Math.PI,'物料与回收','物料与回收',P.teal);

  if(room){
    room('officeB1-receiving',-11.55,-1.82,-8.65,-2.42,[-6.7,-5.3]);
    room('officeB1-workshop',-6.00,-1.82,-2.18,1.92,[-3.9,-.1]);
    room('officeB1-lockers',-11.55,-6.20,-2.18,1.92,[-8.8,-.1]);
    room('officeB1-it',1.82,6.15,-8.65,-2.42,[4.0,-5.3]);
    room('officeB1-archive',6.35,11.55,-8.65,-2.42,[8.9,-5.3]);
    // The east half used to be registered as one 9.7 m room straddling the x = 6.25 partition, so
    // a body standing east of that wall was handed a focus on the far side of it.
    room('officeB1-bikes',1.82,6.15,-2.18,1.92,[4.0,.55]);
    room('officeB1-supplies',6.35,11.55,-2.18,1.92,[9.4,-.9]);
  }

  // ---------------------------------------------------------------- receiving and parcel sort
  // Roll-up door faces on the sealed basement perimeter explain where the loading dock sits
  // without inventing a second public exit.
  for(const x of [-8.10,-4.10]) {
    box(x,1.56,-8.77,3.40,2.82,.10,P.steelD,{hard:true,gloss:.28,tag:'装卸门'});
    for(let y=.28;y<2.85;y+=.27) box(x,y,-8.70,3.18,.055,.03,P.steel,{hard:true,tag:'装卸门'});
    box(x,2.98,-8.70,3.62,.22,.16,P.safety,{hard:true,tag:'装卸门'});
    for(const s of [-1,1]){
      box(x+s*1.63,1.56,-8.60,.18,2.82,.18,P.steelD,{hard:true,tag:'装卸门'});
      for(let y=.30;y<2.82;y+=.42)box(x+s*1.63,y,-8.49,.20,.16,.02,
        ((y/.42)|0)%2?P.black:P.safety,{hard:true,mode:1,tag:'装卸门'});
    }
    capsule(x,1.48,-8.49,.030,.72,.030,P.black,{rz:Math.PI/2,gloss:.34,tag:'装卸门'});
  }
  // Check-in counter and scale.
  box(-10.25,.82,-3.20,2.30,.14,.80,P.wood,{hard:true,mode:6,tag:'收货台'});
  for(const s of [-1,1]) box(-10.25+s*.95,.41,-3.20,.10,.82,.64,P.steelD,{hard:true,tag:'收货台'});
  box(-10.25,.94,-3.48,.90,.09,.52,P.steel,{hard:true,tag:'收货台'});
  box(-10.25,1.04,-3.48,.72,.08,.38,P.black,{hard:true,tag:'收货台'});
  solid(-11.45,-9.05,-3.66,-2.72);
  station('收货台','check-delivery',-10.25,1.03,-3.42,
    '核对送货单、件数和外包装，再给货物称重。',
    'Check the delivery note, quantity and packaging, then weigh the goods.',
    '收货 means receiving goods; 送货单 is a delivery note.',[-10.25,-4.08],1.70,{stage:'receiving'});

  // Parcel sort bench and pigeonhole wall.
  box(-6.85,.84,-4.15,4.15,.15,1.05,P.wood,{hard:true,mode:6,tag:'分拣台'});
  for(const s of [-1,1]) box(-6.85+s*1.75,.42,-4.15,.12,.84,.84,P.steelD,{hard:true,tag:'分拣台'});
  // Roller deck, handheld scanner and colour-coded totes turn the bench into a working sort line.
  for(let x=-8.60;x<=-5.10;x+=.27)
    capsule(x,.935,-4.15,.024,.72,.024,P.steel,{rx:Math.PI/2,gloss:.50,tag:'分拣台'});
  box(-5.12,.985,-4.44,.34,.055,.25,P.black,{round:.025,hard:true,tag:'分拣台'});
  capsule(-5.18,1.15,-4.38,.030,.30,.030,P.black,{rz:-.42,gloss:.24,tag:'分拣台'});
  box(-5.27,1.28,-4.33,.24,.13,.18,P.teal,{round:.035,hard:true,gloss:.28,tag:'分拣台'});
  box(-5.27,1.28,-4.425,.12,.045,.018,P.red,{hard:true,mode:1,glow:.06,tag:'分拣台'});
  for(const [i,x] of [-8.10,-6.85,-5.60].entries()){
    box(x,.34,-3.98,.88,.50,.58,[P.blue,P.teal,P.orange][i],
      {round:.07,hard:true,mode:7,gloss:.08,tag:'分拣台'});
    box(x,.60,-3.98,.78,.055,.50,P.black,{round:.04,hard:true,tag:'分拣台'});
    capsule(x,.43,-3.66,.025,.40,.025,P.steelD,{rz:Math.PI/2,gloss:.40,tag:'分拣台'});
  }
  solid(-9.00,-4.70,-4.74,-3.56);
  for(let i=0;i<8;i++) {
    const x=-8.30+(i%4)*.96,z=-4.15+(i<4?-.16:.22);
    box(x,.98,z,.72,.22,.40,i%3?P.cardboard:P.cardboardL,{hard:true,tag:'分拣台'});
    // The floor label faces +z, which is the side the sorter stands on (focus z = -3.10).  At
    // z - .22 it was drawn behind the tote pointing into it and never appeared.
    glyphs(x,1.10,z+.22,0,String(201+i),{size:.07,color:P.black,mode:1,lift:.008,tag:'分拣台'});
  }
  // Two banks flank the receiving door.  The former continuous run placed a full cubby exactly
  // at x=-6.8, visibly filling the 1.30 m doorway while its missing collider let the player walk
  // through it.  These measured centres keep 1.40 m clear between the cabinet faces.
  // The two banks are tagged separately.  As one '快递格' group they spanned 7.85 m and were
  // judged from (-6.78, -2.48) — the middle of the cage doorway between them, which no cubby
  // occupies. The east bank keeps the bare name because the station's `thing` wears it.
  const pigeonX=[-10.70,-9.80,-8.90,-8.00,-5.70,-4.75,-3.80,-2.85];
  for(const x of pigeonX) for(const y of [.50,1.04,1.58,2.12])
    box(x,y,-2.48,.90,.45,.42,P.wallD,{hard:true,tag:x<-6.85?'快递格西':'快递格'});
  solid(-11.18,-7.52,-2.72,-2.31);
  solid(-6.18,-2.37,-2.72,-2.31);
  station('分拣台','sort-parcels',-6.85,1.02,-4.48,
    '按楼层和收件人给包裹分区，再放进对应的周转筐。',
    'Sort parcels by floor and recipient into the matching totes.',
    '分拣 means sorting; 收件人 is the recipient.',[-6.85,-3.10],1.70,{stage:'sorting'});
  station('快递格','stage-internal-mail',-5.70,1.40,-2.51,
    '把已经登记的内部快递放进各楼层的格口。',
    'Place registered internal deliveries in each floor pigeonhole.',
    '快递 is a courier parcel; 格 is a compartment.',[-5.70,-3.30],1.55,{stage:'dispatch'});
  pallet(-9.65,-6.15,5,'货物');
  pallet(-5.95,-6.30,4,'货物');
  pallet(-3.15,-7.45,5,'货物');
  // Parked 0.90 m further west than it was.  At x = -2.80 its rotated envelope reached x = -1.98
  // and the partition's own collider starts at -2.08, so the jack sealed the receiving room's
  // door onto the logistics lane over the door's whole width: goods leaving the dock had to be
  // walked out through the staff changing room.  There are now 0.80 m of body centres — 1.40 m
  // clear — between the jack and the doorway.
  palletJack(-3.70,-5.55,.10,'货物');
  station('货物','move-pallet',-3.15,.75,-7.45,
    '检查托盘缠膜，然后把整托货物移到验收区。',
    'Check the pallet wrap, then move the load to the inspection area.',
    '托盘 is a pallet; 验收 means acceptance inspection.',[-2.20,-7.45],1.65,{stage:'handling'});
  for(const x of [-9.0,-5.0]) stripLight(x,-5.65,3.5);

  // ---------------------------------------------------------------- workshop and staff lockers
  // A 2.70 m bench leaves a measured body route around either end. The former 3.25 m run visually
  // filled the bay but pinched both wall gaps below the 0.60 m player capsule, trapping the
  // correctly positioned operator side of the work surface.  The claim of a route at BOTH ends
  // only became true again with the rack moved below: 0.76 m clear west, 0.79 m clear east.
  workbench(-3.92,-.25,2.70,'器材维修台');
  // The parts rack hugs the west wall, and is now 1.30 m rather than 2.40 m and pushed north.
  // At z = 0.70 its 2.40 m run covered z = -0.80 .. 2.20, which is the entire opening of the
  // workshop's own door into the changing room at (-6.10, -0.10): the door had never been
  // passable, and could not be seen to fail while both rooms still opened onto the spine.
  rack(-5.55,1.25,1.30,2.35,Math.PI/2,'零件架');
  station('器材维修台','repair-equipment',-3.92,1.18,-.48,
    '先断电检查，再更换损坏的线缆和接口。',
    'Disconnect power, inspect the unit, then replace damaged cables and connectors.',
    '器材 is equipment; 维修 means repair.',[-3.92,-1.12],1.75,{stage:'maintenance'});
  station('零件架','pick-spare-part',-5.55,1.35,1.25,
    '按设备型号寻找对应的备用线缆、接头和保险丝。',
    'Find the spare cable, connector and fuse for the equipment model.',
    '零件 is a spare part.',[-4.72,1.05],1.55,{stage:'maintenance'});
  stripLight(-3.90,-.20,3.7);

  lockerBank(-8.85,-.18,8,0,'员工储物柜');
  // The bench is 2.60 m and sits west, against the flank wall.  The old 3.70 m run reached to
  // x = -7.00 and, once the changing room got its north wall, left no stretch of that wall wide
  // enough for a door: the free x either side of it was 0.38 m and 0.22 m of body centres.  It
  // now stops at -8.62, which leaves 1.84 m of centres for the 1.10 m opening at x = -7.40.
  box(-9.95,.47,1.55,2.60,.13,.64,P.wood,{hard:true,mode:6,tag:'更衣长凳'});
  for(const x of [-10.95,-10.25,-9.65,-8.95]) box(x,.23,1.55,.08,.46,.50,P.steelD,{hard:true,tag:'更衣长凳'});
  solid(-11.35,-8.62,1.18,1.91);
  station('员工储物柜','use-staff-locker',-8.85,1.28,-.27,
    '刷员工卡打开储物柜，取出工作手套和反光背心。',
    'Badge open the locker and take work gloves and a high-visibility vest.',
    '储物柜 is a locker; 反光背心 is a high-visibility vest.',[-8.85,.72],1.65,{stage:'preparation'});
  info('更衣长凳',-8.85,.55,1.40,
    '长凳下面留着安全鞋的位置。',
    'The space beneath the bench is reserved for safety shoes.',
    '更衣 means changing clothes.',[-8.85,.75],1.45);
  stripLight(-8.85,-.20,3.8);

  // ---------------------------------------------------------------- IT/server room
  // The row now stands with its backs against the south shell wall and its doors facing the room.
  // At z = -6.80 the 1.5 m strip between the racks and that wall was standable and sealed on all
  // four sides — the partition at x = 1.70 to the west, the last rack's collider to the east —
  // so 3.5 m2 of floor could never be reached, and every LED, vent, latch and rack number faced
  // into it.  Everything below is the same cabinet mirrored about its own centre.
  for(const x of [2.30,3.80,5.30]) {
    box(x,1.32,-8.34,1.08,2.55,.88,P.black,{hard:true,gloss:.25,tag:'服务器机柜'});
    for(let y=.32;y<2.45;y+=.27) {
      box(x,y,-7.89,.94,.18,.055,P.steelD,{hard:true,tag:'服务器机柜'});
      for(let i=0;i<5;i++)
        cyl(x-.34+i*.17,y,-7.84,.018,.020,(i+y*10)%3<1?P.green:P.blue,{rx:Math.PI/2,mode:1,glow:.08,tag:'服务器机柜'});
    }
    // Perforated lower intake, recessed latch and numbered top plate.
    for(let i=0;i<7;i++)box(x-.33+i*.11,.19,-7.825,.055,.055,.012,P.steel,
      {hard:true,mode:1,tag:'服务器机柜'});
    capsule(x+.39,1.30,-7.82,.018,.38,.018,P.steel,{gloss:.52,tag:'服务器机柜'});
    box(x,2.46,-7.82,.62,.12,.018,P.teal,{hard:true,mode:1,tag:'服务器机柜'});
    glyphs(x,2.46,-7.80,0,String(1+Math.round((x-2.3)/1.5)),
      {size:.07,color:P.white,mode:1,lift:.008,tag:'服务器机柜'});
    // Overlaps the shell wall's own collider deliberately: nothing standable is left behind it.
    solid(x-.58,x+.58,-8.84,-7.86);
  }
  // Cooling unit and raised-floor grilles complete the server-room silhouette.  Both carry their
  // own tag: sharing '服务器机柜' stretched that group over the whole 5 m room and pulled its
  // judged point 1.4 m off the racks, where it now sits on the middle cabinet.
  box(5.72,1.18,-4.05,.70,2.20,.62,P.wallD,{hard:true,gloss:.20,tag:'机房空调'});
  solid(5.35,6.09,-4.39,-3.71);
  for(let y=.32;y<2.05;y+=.23)box(5.35,y,-4.05,.025,.08,.46,P.steelD,{hard:true,tag:'机房空调'});
  for(const x of [2.45,3.45,4.45,5.45])
    for(let z=-7.35;z<-3.85;z+=.52)flat(x,.031,z,.82,.40,P.steelD,
      {mode:7,gloss:.25,nocut:true,tag:'机房架空地板'});
  terminal(4.00,-3.42,Math.PI,'网络监控台');
  for(const z of [-5.65,-4.78])
    box(5.75,2.55,z,.08,.24,1.25,P.cable,{hard:true,tag:'电缆桥架'});
  station('服务器机柜','inspect-server-rack',3.80,1.42,-7.86,
    '检查温度、风扇和告警灯，确认机柜运行正常。',
    'Check temperature, fans and alarm lights to confirm the rack is healthy.',
    '服务器 is a server; 机柜 is a rack.',[3.80,-7.20],1.55,{stage:'it',secure:true});
  station('网络监控台','review-network-status',4.00,1.43,-3.36,
    '查看网络状态图，处理离线设备和异常流量告警。',
    'Review the network map and investigate offline devices and traffic alerts.',
    '网络 is a network; 监控 means monitoring.',[4.00,-2.52],1.55,{stage:'it'});
  stripLight(4.00,-5.60,3.7);
  stripLight(4.00,-7.45,3.7);

  // ---------------------------------------------------------------- archive, supplies and recycling
  for(const z of [-8.05,-6.55,-5.05,-3.55]) rack(8.90,z,4.25,2.40,0,z<-5.8?'档案架':'物料架');
  station('档案架','retrieve-record-box',8.90,1.38,-6.55,
    '按保管期限和箱号找到需要调阅的纸质记录。',
    'Locate the paper record by retention period and box number.',
    // The aisles between four 4.25 m racks are 0.18 m of body centres wide. [8.90, -5.72] was
    // 0.02 m off the edge of one; these two focus points are now the middle of their aisle.
    '档案 is an archive; 保管期限 is a retention period.',[8.90,-5.80],1.60,{stage:'records'});
  station('物料架','count-supplies',8.90,1.35,-3.55,
    '清点纸张、墨盒和清洁用品，并记录补货数量。',
    'Count paper, toner and cleaning supplies and record the replenishment quantity.',
    '物料 means supplies; 清点 means to inventory.',[8.90,-4.30],1.60,{stage:'inventory'});
  // The stock terminal belongs with the racks it counts, and it had to leave the west bay for the
  // bicycle store in any case.  Against the south partition, facing +z.  At x = 8.20 its collider
  // reached 8.92 and squeezed the archive doorway at x = 8.90 down to a 0.90 m slot — legal, and
  // visibly wrong in OFC-B1-E, where the cabinet stood square in the opening.  At 7.30 it clears
  // the door's body centres (8.575 .. 9.225) completely and closes onto the x = 6.25 wall band.
  terminal(7.30,-1.60,0,'库存终端');
  station('库存终端','update-inventory',7.30,1.42,-1.53,
    '录入本次收货和领用数量，让库存余额保持准确。',
    'Post received and issued quantities to keep stock balances accurate.',
    '库存 is inventory; 余额 is the balance.',[7.30,-.80],1.60,{stage:'inventory'});

  // Four-stream recycling point by the service circulation route.  Pitched at 0.98 m rather than
  // 1.10 m: the row used to reach x = 10.51 and left only 0.71 m of body centres between it and
  // the shell for the bay's door onto the spine.  It now stops at 10.20, leaving 1.02 m.
  for(const [i,[label,color]] of [['纸',P.blue],['塑',P.orange],['电',P.red],['其',P.slabD]].entries()) {
    const x=6.80+i*.98;
    box(x,.52,1.46,.88,1.04,.72,color,{hard:true,tag:'回收站'});
    box(x,1.08,1.46,.70,.08,.54,P.black,{hard:true,tag:'回收站'});
    glyphs(x,.64,1.08,Math.PI,label,{size:.18,color:P.white,mode:1,lift:.008,tag:'回收站'});
    solid(x-.46,x+.46,1.08,1.84);
  }
  station('回收站','sort-recycling',8.27,.90,1.10,
    '把纸张、塑料、电子废物和其他垃圾分别投入对应箱。',
    'Separate paper, plastic, e-waste and general waste into the correct bins.',
    '回收 means recycling; 电子废物 is electronic waste.',[8.27,.50],1.55,{stage:'waste'});
  stripLight(8.80,-5.60,4.5);
  // One 6.2 m luminaire used to run from x = 3.90 to 10.10, straight through the x = 6.25
  // partition. Two fittings, one per bay.
  stripLight(8.90,-.10,4.3);

  // ---------------------------------------------------------------- 自行车库 bicycle store
  // The floor's programme names a bicycle store and there was none: this bay held one inventory
  // terminal and nothing else.  Machines park nose-in against the south partition on numbered
  // stands, with the empty stand kept opposite the door as the player's own space.
  const SLOT=[2.50,3.10,3.70,4.30,4.90,5.50];
  flat(4.00,.024,-1.32,3.66,1.86,P.slabD,{mode:7,gloss:.07,nocut:true,tag:'自行车架'});
  for(const sx of [2.80,3.40,4.00,4.60,5.20])
    flat(sx,.028,-1.32,.05,1.80,P.safety,{mode:1,alpha:.62,nocut:true,tag:'自行车架'});
  for(const [i,sx] of SLOT.entries()) {
    for(const s of [-1,1])capsule(sx+s*.17,.34,-2.00,.030,.68,.030,P.steelD,
      {gloss:.42,tag:'自行车架'});
    capsule(sx,.67,-2.00,.030,.34,.030,P.steelD,{rz:Math.PI/2,gloss:.42,tag:'自行车架'});
    glyphs(sx,.30,-.42,0,String(i+1),{size:.09,color:P.safety,mode:1,lift:.007,tag:'车位号'});
  }
  bicycle(2.50,-1.36,P.teal); bicycle(3.10,-1.36,P.red); bicycle(3.70,-1.36,P.blue);
  bicycle(4.90,-1.36,P.green); bicycle(5.50,-1.36,P.orange);
  solid(2.28,5.72,-2.22,-.50); shade(4.00,-1.36,3.70,1.90,.20);
  sign(2.60,2.30,1.86,0,'自行车库',P.teal,'车库指示',.16);
  // A shared floor pump, tucked between the row and the lane wall.
  cyl(2.20,.030,-.72,.16,.060,P.steelD,{gloss:.30,tag:'打气筒'});
  capsule(2.20,.42,-.72,.048,.78,.048,P.black,{gloss:.34,tag:'打气筒'});
  capsule(2.20,.84,-.72,.055,.12,.055,P.red,{gloss:.30,tag:'打气筒'});
  cyl(2.20,.91,-.72,.085,.035,P.steel,{gloss:.42,tag:'打气筒'});
  solid(2.02,2.38,-.90,-.54);
  station('自行车','park-bicycle',4.30,1.02,-1.72,
    '把前轮推进车架，锁好车锁，再取走车筐里的东西。',
    'Push the front wheel into the stand, lock the frame, and clear out the basket.',
    '自行车 is a bicycle; 车架 here is the parking stand.',[4.30,-.02],1.70,{stage:'facilities'});
  info('打气筒',2.20,.98,-.72,
    '公用打气筒放在车库门口，用完请放回原处。',
    'The shared floor pump lives by the store door; put it back when you have finished.',
    '打气筒 is a floor pump; 公用 means shared.',[2.62,-.02],1.55);
  stripLight(4.00,-.10,3.4);

});

// The roster is registered when the module loads, before game.js performs its one-time NPC
// initialisation. Keeping it outside the lazy scene builder also makes revisiting/rebuilding B1
// incapable of duplicating the staff. Each person stands at the side of their workstation so the
// authored player focus and the IT-room doorway remain clear.
if(typeof OfficeCast!=='undefined') OfficeCast.push(
  {hz:'收货员',name:'马强',py:'Mǎ Qiáng',place:'officeB1',temper:'brisk',
    look:{skin:'#bf845c',hair:'#28221e',hairStyle:'crop',top:'#5c7771',pants:'#303a3c',shoe:'#252b2d',vest:'#d5a13c',tall:1.04,wide:1.04,faceSeed:9101},
    spots:[{h0:7,h1:18,at:[-9.62,-4.20],face:0,act:'work',held:null}]},
  {hz:'维修员',name:'孙师傅',py:'Sūn shīfu',place:'officeB1',temper:'steady',
    look:{skin:'#ce996f',hair:'#37312c',hairStyle:'short',top:'#58716c',pants:'#343d3f',shoe:'#252b2d',gloves:true,tall:1.01,wide:1.08,age:.48,faceSeed:9102},
    spots:[{h0:8,h1:18,at:[-3.25,-1.10],face:0,act:'work',held:'tool'}]},
  {hz:'信息技术员',name:'高宇',py:'Gāo Yǔ',place:'officeB1',temper:'quiet',
    look:{skin:'#dfa984',hair:'#241f1c',hairStyle:'short',top:'#50677c',pants:'#303a44',shoe:'#272d32',glasses:true,tall:1.02,wide:.94,faceSeed:9103},
    spots:[{h0:8.5,h1:19,at:[5.00,-3.00],face:-Math.PI/2,act:'work',held:null}]}
);

Object.assign(OfficeUse.officeB1,{
  'check-delivery':{zh:'核对收货',py:'héduì shōuhuò',en:'check a delivery',secs:3.0,mins:12,gain:{rest:-3},pose:{type:'work'}},
  'sort-parcels':{zh:'分拣包裹',py:'fēnjiǎn bāoguǒ',en:'sort parcels',secs:3.2,mins:15,gain:{rest:-4},pose:{type:'carry'}},
  'stage-internal-mail':{zh:'分发内部快递',py:'fēnfā nèibù kuàidì',en:'stage internal deliveries',secs:2.8,mins:10,gain:{rest:-3},pose:{type:'carry'}},
  'move-pallet':{zh:'移动托盘',py:'yídòng tuōpán',en:'move a pallet',secs:3.3,mins:10,gain:{rest:-6},pose:{type:'carry'}},
  'repair-equipment':{zh:'维修器材',py:'wéixiū qìcái',en:'repair equipment',secs:3.8,mins:30,gain:{rest:-7,mood:1},pose:{type:'work'}},
  'pick-spare-part':{zh:'领取零件',py:'lǐngqǔ língjiàn',en:'pick a spare part',secs:2.2,mins:5,gain:{rest:-1},pose:{type:'check'}},
  'use-staff-locker':{zh:'打开员工柜',py:'dǎkāi yuángōng guì',en:'open a staff locker',secs:2.0,mins:4,gain:{},pose:{type:'check'}},
  'inspect-server-rack':{zh:'检查服务器',py:'jiǎnchá fúwùqì',en:'inspect a server rack',secs:3.0,mins:12,gain:{rest:-2},pose:{type:'check'}},
  'review-network-status':{zh:'查看网络状态',py:'chákàn wǎngluò zhuàngtài',en:'review network status',secs:3.1,mins:15,gain:{rest:-3},pose:{type:'type'}},
  'retrieve-record-box':{zh:'调阅档案',py:'diàoyuè dàng’àn',en:'retrieve an archive box',secs:2.8,mins:10,gain:{rest:-3},pose:{type:'check'}},
  'count-supplies':{zh:'清点物料',py:'qīngdiǎn wùliào',en:'count supplies',secs:3.1,mins:15,gain:{rest:-4},pose:{type:'check'}},
  'update-inventory':{zh:'更新库存',py:'gēngxīn kùcún',en:'update inventory',secs:3.0,mins:12,gain:{rest:-3},pose:{type:'type'}},
  'sort-recycling':{zh:'分类回收',py:'fēnlèi huíshōu',en:'sort recycling',secs:2.6,mins:8,gain:{rest:-2,clean:2},pose:{type:'carry'}},
  'park-bicycle':{zh:'停放自行车',py:'tíngfàng zìxíngchē',en:'park a bicycle',secs:2.4,mins:5,gain:{rest:-1,mood:1},pose:{type:'carry'}},
});
