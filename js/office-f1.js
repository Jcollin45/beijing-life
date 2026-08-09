// 华北创意中心 · 一楼公共大厅
//
// The first floor is the building's public contract: arrive from the street, ask reception,
// register or collect a visitor, pass security, deal with property management, collect mail or
// a parcel, and get a coffee before taking the lift.  The centre remains an uninterrupted view
// from the north entrance to the south circulation spine; all service rooms live in side wings.

// Every character this file draws, registered before anything asks for a cell.  office-core.js
// registers the shell's own vocabulary, but not one of 大堂/物业/收发/快递/咖啡/报修/名录 — 187 of
// the glyphs below were never in any `need()` call, and an unregistered character renders blank.
try{
  Glyphs.need('一楼公司大堂物业服务安保室快递收发前台访客预约邮件登记名录后勤财法项目人事员工' +
    '今日报修处理中已完成咖啡美式拿铁茶内外·□0123456789' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
}catch(_){}

OfficeFit.register('office1', A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
    partitionZ,partitionX,sign,doorPlate,room,onTick,
  }=A;
  // ---------------------------------------------------------------- tag hygiene
  // `hiddenProp` (js/game.js:2017) judges a TAGGED prop by the centre of its whole tag group, and
  // `tagBox` (js/build.js:259) unions every prop wearing the tag.  A tag shared by two props metres
  // apart is therefore judged by a point neither of them occupies.  This floor had four such
  // groups: 玻璃墙 and 隔墙 each spanned BOTH wings, so their group centres landed at x≈0 in the
  // middle of the open lobby — the exact hotel-tower failure, where backing the camera out of the
  // west wing deleted the east wing's walls as well.  灯 spanned every pendant on the plate and
  // 绿植 both planters.  Each wall run, lamp and planter now carries its own tag, so the group is
  // the fixture plus its own trim and nothing else.
  let lampN=0,plantN=0;
  const P={
    stone:A.C('#c9c5bb'), stoneD:A.C('#918b82'), runner:A.C('#3b454b'),
    wall:A.C('#ebe8df'), wallD:A.C('#c8c5bd'), glass:A.C('#a9c6d1'),
    walnut:A.C('#76523b'), walnutD:A.C('#443127'), oak:A.C('#b3956c'),
    brass:A.C('#a47a3f'), brassL:A.C('#cfaa69'), steel:A.C('#899296'),
    steelD:A.C('#485156'), black:A.C('#202529'), white:A.C('#f7f2e8'),
    red:A.C('#a64437'), blue:A.C('#396a87'), green:A.C('#4a745b'),
    jade:A.C('#517c6c'), amber:A.C('#cf8738'), coffee:A.C('#56372a'),
    cream:A.C('#e9dbc1'), screen:A.C('#17323e'), screenL:A.C('#8ab8c8'),
    fabric:A.C('#6f625d'), fabricL:A.C('#a99385'), leaf:A.C('#4d7453'),
    parcel:A.C('#a6845b'), parcelL:A.C('#c1a079'),
  };
  const tagOpt=(tag,o={})=>tag?{...o,tag}:o;
  const station=(hz,id,x,y,z,zh,en,note,focus=[x,z],reach=1.75,extra={})=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    th.officeAction=id;
    th.officeStation={floor:A.key,id,department:'front-office',...extra};
    return th;
  };
  const info=(hz,x,y,z,zh,en,note,focus=[x,z],reach=1.7)=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});th.officeFloor=A.key;return th;
  };

  function pendant(x,z,r=.24) {
    const tag='灯'+(++lampN);
    capsule(x,A.H-.52,z,.020,.62,.020,P.black,{gloss:.28,tag});
    taper(x,A.H-.86,z,r*1.50,.32,r*1.50,P.brass,{gloss:.56,tag});
    const p=ball(x,A.H-1.02,z,r*.54,r*.54,r*.54,P.white,{mode:1,glow:.18,tag});
    if(A.luminous)A.luminous(p,.08,.32);
    light(x,A.H-1.02,z,[1,.82,.58],.20,3.0);
    glow(M.trs(x,.023,z,0,2.8,1,2.8),P.cream,.035);
  }
  function glassWallX(x,z0,z1,doors=[],tag='玻璃墙') {
    const cuts=doors.map(([c,w])=>[c-w/2,c+w/2]).sort((a,b)=>a[0]-b[0]);let at=z0;
    const pane=(a,b)=>{
      if(b-a<.08)return;
      box(x,1.72,(a+b)/2,.07,3.34,b-a,P.glass,{hard:true,mode:1,alpha:.22,gloss:.64,...tagOpt(tag)});
      // A translucent privacy band and bronze chair rail keep the long side-wall panes from
      // reading as invisible collision planes. They also visually join all four service rooms.
      box(x+(x<0?.041:-.041),1.34,(a+b)/2,.018,.42,b-a-.05,P.white,
        {hard:true,mode:1,alpha:.24,gloss:.28,...tagOpt(tag)});
      capsule(x+(x<0?.052:-.052),.23,(a+b)/2,.025,Math.max(.12,b-a-.12),.025,P.brass,
        {rx:Math.PI/2,gloss:.58,...tagOpt(tag)});
      for(const z of [a,b])box(x,1.72,z,.09,3.36,.045,P.black,{hard:true,...tagOpt(tag)});
      solid(x-.045,x+.045,a,b);
      A.blocker(x-.045,x+.045,a,b,A.H);
    };
    for(const [a,b] of cuts){
      pane(at,a);
      const cz=(a+b)/2;
      box(x,3.22,cz,.09,.42,b-a,P.walnutD,{hard:true,...tagOpt(tag)});
      // Tall paired pulls make each opening read as an actual glazed door threshold.
      for(const side of [-1,1])capsule(x+(x<0?.08:-.08),1.20,cz+side*.18,
        .026,.52,.026,P.brassL,{gloss:.62,...tagOpt(tag)});
      flat(x+(x<0?.08:-.08),.026,cz,.12,b-a-.12,P.brass,{ry:Math.PI/2,gloss:.58,...tagOpt(tag)});
      at=b;
    }
    pane(at,z1);
  }
  function loungeChair(x,z,ry=0,tag='等候椅',color=P.fabric) {
    for(const dx of [-.34,.34]) for(const dz of [-.28,.28]) {
      const px=x+Math.cos(ry)*dx+Math.sin(ry)*dz,pz=z-Math.sin(ry)*dx+Math.cos(ry)*dz;
      taper(px,.15,pz,.07,.30,.055,P.walnutD,{gloss:.30,...tagOpt(tag)});
      cyl(px,.025,pz,.08,.025,P.brass,{gloss:.60,...tagOpt(tag)});
    }
    box(x,.44,z,.86,.20,.74,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    // `ry` is the occupant's forward heading.  A chair back belongs behind that heading; the
    // previous plus sign put every backrest in front of its seat and made the lounge face away
    // from its own table.
    const bx=x-Math.sin(ry)*.35,bz=z-Math.cos(ry)*.35;
    box(bx,.76,bz,.86,.62,.18,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    for(const s of [-1,1]) {
      const ax=x+Math.cos(ry)*s*.41,az=z-Math.sin(ry)*s*.41;
      box(ax,.58,az,.12,.28,.72,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    }
    const ex=Math.abs(Math.cos(ry))*.49+Math.abs(Math.sin(ry))*.46;
    const ez=Math.abs(Math.sin(ry))*.49+Math.abs(Math.cos(ry))*.46;
    solid(x-ex,x+ex,z-ez,z+ez);
    shade(x,z,ex*2+.10,ez*2+.10,.24);
  }
  function lowTable(x,z,w=1.25,d=.72,tag='茶几') {
    box(x,.46,z,w,.10,d,P.walnut,{hard:true,mode:6,gloss:.29,...tagOpt(tag)});
    for(const s of [-1,1])box(x+s*(w/2-.14),.23,z,.075,.46,d-.12,P.brass,{hard:true,gloss:.56,...tagOpt(tag)});
    solid(x-w/2,x+w/2,z-d/2,z+d/2);
  }
  function serviceCounter(x,z,w=4.2,d=.88,tag='前台',color=P.walnut,curve=false) {
    box(x,.55,z,w,1.10,d,color,{round:curve?.16:.07,hard:true,mode:6,gloss:.28,...tagOpt(tag)});
    box(x,1.13,z-.18,w+.12,.12,d+.16,P.stone,{round:.06,hard:true,gloss:.22,...tagOpt(tag)});
    box(x,.56,z-d*.52,w-.30,.62,.035,P.walnutD,{hard:true,mode:6,...tagOpt(tag)});
    // Recessed fluting, brass shadow gaps and a proper public-side kick rail replace the single
    // flat brown rectangle visible on arrival.
    const n=Math.max(4,Math.round(w/.34));
    for(let i=0;i<n;i++){
      const px=x-w/2+(i+.5)*w/n;
      box(px,.55,z-d*.545,.045,.70,.030,P.brass,{hard:true,gloss:.48,...tagOpt(tag)});
    }
    box(x,.91,z-d*.558,w-.28,.035,.035,P.brassL,{hard:true,gloss:.58,...tagOpt(tag)});
    capsule(x,.27,z-d*.61,.035,w-.46,.035,P.brass,{rz:Math.PI/2,gloss:.58,...tagOpt(tag)});
    for(const s of [-1,1])capsule(x+s*(w/2-.31),.18,z-d*.61,.025,.24,.025,P.brass,
      {gloss:.58,...tagOpt(tag)});
    box(x,.15,z,w+.10,.17,d+.12,P.walnutD,{hard:true,mode:6,...tagOpt(tag)});
    solid(x-w/2,x+w/2,z-d/2,z+d/2);
    // Register the projecting stone worktop's own centre as well as the cabinet carcass below.
    // This is intentionally tiny and wholly inside the existing counter envelope, so it cannot
    // reduce any route while making the visual/physical correspondence explicit to the sampler.
    solid(x-.025,x+.025,z-.205,z-.155);
    shade(x,z,w+.25,d+1.0,.24);
  }
  function terminal(x,y,z,ry=0,tag='访客登记机',text='访客') {
    const nx=Math.sin(ry),nz=Math.cos(ry);
    box(x,y,z,.70,.48,.12,P.black,{round:.055,hard:true,ry,gloss:.30,...tagOpt(tag)});
    box(x+nx*.07,y,z+nz*.07,.58,.36,.016,P.screen,{hard:true,ry,mode:1,glow:.10,...tagOpt(tag)});
    glyphs(x+nx*.08,y,z+nz*.08,ry,text,{size:.085,gap:.018,color:P.screenL,mode:1,lift:.008,tag});
    capsule(x,y-.42,z,.035,.58,.035,P.steelD,{gloss:.46,...tagOpt(tag)});
    box(x,y-.70,z,.44,.055,.32,P.steelD,{hard:true,ry,...tagOpt(tag)});
    // Camera eye, ID-card ledge and illuminated badge slot.
    ball(x-.21*Math.cos(ry)+nx*.075,y+.15,z+.21*Math.sin(ry)+nz*.075,
      .035,.035,.018,P.screenL,{mode:1,glow:.08,...tagOpt(tag)});
    box(x+nx*.10,y-.29,z+nz*.10,.38,.055,.16,P.steel,{round:.025,hard:true,ry,gloss:.38,...tagOpt(tag)});
    box(x+nx*.145,y-.34,z+nz*.145,.24,.025,.035,P.green,{hard:true,ry,mode:1,glow:.08,...tagOpt(tag)});
  }
  function mailWall(x,z,w=3.6,h=2.25,ry=0,tag='收发室') {
    const swap=Math.abs(Math.sin(ry))>.5;
    const fx=Math.sin(ry),fz=Math.cos(ry);
    box(x,h/2,z,swap?.46:w,h,swap?w:.46,P.walnutD,{hard:true,ry,mode:6,...tagOpt(tag)});
    const cols=6,rows=5;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const u=(c-(cols-1)/2)*(w-.18)/cols,yy=.28+r*(h-.14)/rows;
      // Project each cubby in front of the cabinet carcass. Previously their centres were
      // coplanar with the .46 m backing, so the brown face occluded the entire pigeonhole grid.
      const px=x+Math.cos(ry)*u-fx*.34,pz=z-Math.sin(ry)*u-fz*.34;
      box(px,yy,pz,.50,.34,.36,P.cream,{hard:true,ry,...tagOpt(tag)});
      // A few occupied pigeonholes break the repeated blank grid with envelopes and routing tabs.
      if((r+c)%3===0){
        box(px-fx*.19,yy+.015,pz-fz*.19,.36,.16,.018,P.white,{hard:true,ry,...tagOpt(tag)});
        box(px-.12*Math.cos(ry)-fx*.205,yy+.015,pz+.12*Math.sin(ry)-fz*.205,.055,.17,.019,
          [P.red,P.blue,P.green][(r*2+c)%3],{hard:true,ry,...tagOpt(tag)});
      }
      glyphs(px-fx*.205,yy,pz-fz*.205,ry,String(201+c+r*cols),
        {size:.055,color:P.black,mode:1,lift:.007,tag});
    }
    // Include the projecting pigeonholes, not just the carcass behind them. Their fronts sit
    // 52 cm proud of the bank; the old 27 cm footprint left all thirty visible cubby centres
    // physically empty.
    // This floor uses a north-facing bank (ry=0): cubbies project toward -z, while the carcass
    // needs only 27 cm behind. Keep that asymmetry so the physical back stops at z=1.92 and never
    // spills the final centimetre into the protected z>=2.20 core spine.
    if(swap)solid(x-.56,x+.56,z-w/2,z+w/2);
    else solid(x-w/2,x+w/2,z-.56,z+.27);
  }
  function parcelRack(x,z,w=2.8,ry=0,tag='快递室') {
    const swap=Math.abs(Math.sin(ry))>.5;
    for(const u of [-w/2,w/2]){
      const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
      capsule(px,1.25,pz,.045,2.45,.045,P.steelD,{gloss:.42,...tagOpt(tag)});
    }
    for(let row=0;row<4;row++){
      const y=.18+row*.62;
      // Width/depth are local before `ry`.  The previous pre-swap plus rotation turned the rack
      // twice, projecting the first parcel bank through the glass wall while its solid ran along z.
      box(x,y,z,w,.065,.72,P.steel,{hard:true,ry,...tagOpt(tag)});
      for(let c=0;c<4;c++){
        const u=-w*.34+c*w*.23,px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        box(px,y+.23,pz,.52,.40,.53,(row+c)%2?P.parcel:P.parcelL,{hard:true,ry,...tagOpt(tag)});
        box(px,y+.31,pz-(swap?0:.29),.23,.11,.02,P.white,{hard:true,ry,...tagOpt(tag)});
        box(px,y+.43,pz-(swap?0:.295),.055,.24,.018,P.cream,{hard:true,ry,...tagOpt(tag)});
        for(let k=0;k<3;k++)box(px+.055+k*.035,y+.31,pz-(swap?0:.305),.012,.075,.010,P.black,
          {hard:true,ry,mode:1,...tagOpt(tag)});
      }
    }
    solid(x-(swap?.40:w/2),x+(swap?.40:w/2),z-(swap?w/2:.40),z+(swap?w/2:.40));
    solid(x-.025,x+.025,z-.025,z+.025);
  }
  function planter(x,z,s=.8,tag='绿植'+(++plantN)) {
    taper(x,.28,z,.60*s,.56*s,.50*s,P.stoneD,{gloss:.22,...tagOpt(tag)});
    for(let i=0;i<7;i++){
      const a=i*2.399;
      capsule(x+Math.sin(a)*.15*s,.78*s,z+Math.cos(a)*.15*s,.055*s,.92*s,.055*s,P.leaf,
        {ry:a,rz:(i%2?1:-1)*.43,gloss:.10,...tagOpt(tag)});
      ball(x+Math.sin(a)*.32*s,1.07*s+(i%3)*.08,z+Math.cos(a)*.32*s,.30*s,.16*s,.17*s,P.leaf,
        {mode:15,ry:a,...tagOpt(tag)});
    }
    const r=.34*s;
    solid(x-r,x+r,z-r,z+r);
  }

  // ---------------------------------------------------------------- architecture and arrival sightline
  // `nocut` on all three floor finishes.  A `flat` carries no obstacle box, so it contributes
  // NOTHING to its tag's box — but hiddenProp still judges it BY that box if one exists.  The only
  // cuttable props wearing 大堂 were the suspended sign and its rods at z = 2.12, so this 23.35 x
  // 11.05 m lobby slab was being judged at the sign's position: back the camera out of any side
  // room and the entire lobby floor, runner and brass inlays disappeared at once.  A floor finish
  // is never what the cutaway is trying to reveal, so it opts out outright, and the sign takes its
  // own tag so nothing is judged by anything else's centre.
  flat(0,.020,-3.30,23.35,11.05,P.stone,
    {mode:7,gloss:.18,mat:'tile',matScale:.85,matAmt:.20,tag:'大堂',nocut:true});
  flat(0,.026,-4.05,3.55,9.30,P.runner,{mode:7,gloss:.05,tag:'大堂',nocut:true});
  for(const s of [-1,1])flat(s*1.70,.029,-4.05,.055,9.20,P.brass,{gloss:.66,tag:'大堂',nocut:true});
  // `sign` is 0.48 m tall about its centre and the ceiling slab's soffit is at 3.25, so a centre of
  // 3.13 buried the top 12 cm of the arrival band inside the ceiling.  Lowered, and hung on two
  // visible drop rods rather than floating unsupported over the lift approach.
  sign(0,2.96,2.12,Math.PI,'一楼 · 公司大堂',P.red,'大堂标识',.22);
  for(const x of [-1.10,1.10])capsule(x,3.225,2.12,.016,.09,.016,P.black,{gloss:.30,tag:'大堂标识'});
  glyphs(0,2.62,2.08,Math.PI,'LOBBY · RECEPTION · SECURITY',
    {size:.086,gap:.022,color:P.red,mode:1,lift:.010,tag:'大堂标识'});

  // Two side wings, each divided into a public-front room and a secure back room. The open centre
  // is 14 m wide and preserves the entrance-to-lift orientation line.
  // Each side wall is emitted as TWO runs meeting at the cross-wall (z = -2.35) rather than one
  // 10.8 m sheet, so every run has its own tag and sits wholly inside one camera room.  The joint
  // also puts an honest mullion where the partition lands.  Geometry and collision are unchanged:
  // the pane that used to span z -4.75 … -0.85 is now two panes abutting at -2.35.
  glassWallX(-7.00,-8.70,-2.35,[[-5.40,1.30]],'玻璃墙·物业');
  glassWallX(-7.00,-2.35,2.12,[[-.20,1.30]],'玻璃墙·安保');
  glassWallX(7.00,-8.70,-2.35,[[-5.40,1.30]],'玻璃墙·快递');
  glassWallX(7.00,-2.35,2.12,[[-.20,1.30]],'玻璃墙·收发');
  partitionZ(-2.35,-11.65,-7.00,[[-9.15,1.25]],P.wall,'隔墙西');
  partitionZ(-2.35,7.00,11.65,[[9.30,1.25]],P.wall,'隔墙东');
  doorPlate(-7.05,2.53,-5.40,-Math.PI/2,'物业服务','物业服务台',P.red);
  doorPlate(-7.05,2.53,-.20,-Math.PI/2,'安保室','安保台',P.red);
  doorPlate(7.05,2.53,-5.40,Math.PI/2,'快递室','快递室',P.red);
  doorPlate(7.05,2.53,-.20,Math.PI/2,'收发室','收发室',P.red);
  // The two cross-wall openings had no plates at all: six real doorways, four labels.  These sit
  // above the 2.35 m head on the public side of each wing.
  doorPlate(-9.15,2.62,-2.47,0,'安保室','隔墙西',P.red);
  doorPlate(9.30,2.62,-2.47,0,'收发室','隔墙东',P.red);

  if(room){
    room('office1-lobby',-6.85,6.85,-8.70,2.10,[0,-4.0]);
    room('office1-property',-11.55,-7.12,-8.65,-2.47,[-9.2,-5.4]);
    room('office1-security',-11.55,-7.12,-2.23,2.10,[-9.2,-.2]);
    room('office1-parcels',7.12,11.55,-8.65,-2.47,[9.3,-5.4]);
    room('office1-mail',7.12,11.55,-2.23,2.10,[9.3,-.2]);
  }

  // Finished inner skins for the two compact back-of-house rooms. The tower perimeter is dark
  // beyond these wings; without local liners, three-quarter views read as furniture in a void.
  // Each liner takes its OWN tag and the two envelope planes opt out of the cutaway entirely.
  // Measured before this change, 安保室 was four props — floor, west wall, rear wall, ceiling —
  // whose group centre sat at (-10.41, 0.98), 1.49 m from the nearest of them: the room's whole
  // shell hid and showed as one unit, judged from a point in mid-air between its own surfaces.
  flat(-9.34,.031,-.05,4.22,4.08,P.stoneD,{mode:7,gloss:.10,tag:'安保室',nocut:true});
  box(-11.48,1.70,-.05,.08,3.40,4.06,P.wall,{hard:true,tag:'安保室西墙'});
  box(-9.34,1.70,2.02,4.22,3.40,.08,P.wall,{hard:true,tag:'安保室后墙'});
  box(-9.34,A.H-.055,-.05,4.22,.08,4.08,P.wallD,{hard:true,gloss:.12,tag:'安保室',nocut:true});
  flat(9.34,.031,-.05,4.22,4.08,P.stone,{mode:7,gloss:.11,tag:'收发室',nocut:true});
  box(11.48,1.70,-.05,.08,3.40,4.06,P.wall,{hard:true,tag:'收发室东墙'});
  box(9.34,1.70,2.02,4.22,3.40,.08,P.wall,{hard:true,tag:'收发室后墙'});
  box(9.34,A.H-.055,-.05,4.22,.08,4.08,P.wallD,{hard:true,gloss:.12,tag:'收发室',nocut:true});
  // The property and parcel wings had NO liner, and OFC-F1-W and -E showed what that costs: stand
  // in either wing, let the camera back out north, and the shell's envelope goes with it — tag 墙
  // is three perimeter walls whose group centre is (0, 4.46), 4.46 m from the nearest of them, and
  // tag 天花 is the ceiling slab at (0, 1.94).  Both centres are north of these rooms, so both cut,
  // and the outer third and the whole ceiling of each wing rendered as raw black void.  Those two
  // tags belong to buildShell in office-core.js and are not mine to mark `nocut`, so each wing now
  // carries the same local skin the two back rooms already had.  Liner walls run the full 3.40 m
  // to meet the soffit; at the old 3.02 they left a 30 cm black band under the ceiling.
  box(-11.48,1.70,-5.60,.08,3.40,6.18,P.wall,{hard:true,tag:'物业室西墙'});
  box(-9.34,A.H-.055,-5.60,4.22,.08,6.20,P.wallD,{hard:true,gloss:.12,tag:'物业室顶',nocut:true});
  box(11.48,1.70,-5.60,.08,3.40,6.18,P.wall,{hard:true,tag:'快递室东墙'});
  box(9.34,A.H-.055,-5.60,4.22,.08,6.20,P.wallD,{hard:true,gloss:.12,tag:'快递室顶',nocut:true});
  // These are full-height rear room walls, not decorative panels.  The shared shell protects the
  // tower perimeter, but without these two local strips the player could step through the visible
  // walls directly into the circulation spine.
  solid(-11.55,-7.12,1.96,2.10);
  solid(7.12,11.55,1.96,2.10);

  // ---------------------------------------------------------------- reception and visitor arrival
  serviceCounter(-3.40,-2.75,4.80,.92,'前台',P.walnut,true);
  box(-3.40,1.56,-2.27,3.55,.68,.08,P.red,{hard:true,mode:7,tag:'前台'});
  glyphs(-3.40,1.62,-2.22,0,'前台 · RECEPTION',
    {size:.15,gap:.038,color:P.white,mode:1,glow:.04,lift:.010,tag:'前台'});
  terminal(-4.40,1.48,-3.20,0,'前台','访客');
  terminal(-2.42,1.48,-3.20,0,'前台','预约');
  // Reception working set: desk bell, handset, appointment book and visitor-card tray.
  cyl(-4.92,1.25,-3.05,.075,.055,P.brassL,{gloss:.62,tag:'前台'});
  ball(-4.92,1.30,-3.05,.060,.035,.060,P.white,{gloss:.28,tag:'前台'});
  capsule(-3.65,1.25,-3.03,.055,.34,.055,P.black,{rz:Math.PI/2,gloss:.24,tag:'前台'});
  box(-3.65,1.21,-3.03,.46,.035,.20,P.steelD,{round:.035,hard:true,tag:'前台'});
  box(-1.82,1.23,-3.05,.52,.035,.36,P.cream,{hard:true,rz:-.03,tag:'前台'});
  for(let i=0;i<5;i++)box(-1.25+i*.12,1.23,-3.05,.09,.025,.15,[P.red,P.blue,P.jade][i%3],
    {hard:true,tag:'前台'});
  station('前台','register-visitor',-3.40,1.48,-3.16,
    '报上姓名、公司和受访人，前台会核对预约。',
    'Give your name, company and host so reception can verify the appointment.',
    '前台 is reception; 预约 is an appointment.',[-3.40,-4.12],1.80,{stage:'arrival'});
  pendant(-4.60,-2.75,.22);pendant(-2.20,-2.75,.22);

  // Two self-service visitor kiosks sit on the arrival route without narrowing its central axis.
  for(const x of [2.20,3.45]){
    terminal(x,1.46,-5.88,0,'访客登记机','登记');
    box(x,.40,-5.88,.58,.08,.58,P.steelD,{hard:true,tag:'访客登记机'});
    solid(x-.36,x+.36,-6.24,-5.52);
  }
  station('访客登记机','print-visitor-badge',2.80,1.43,-5.83,
    '扫描预约二维码，确认身份证件，然后打印临时访客证。',
    'Scan the appointment code, verify identification and print a temporary badge.',
    '访客 is a visitor; 访客证 is a visitor badge.',[2.80,-4.92],1.65,{stage:'arrival'});

  // Turnstiles mark the secure boundary but leave three honest 85 cm lanes. The glass paddles
  // are pickable decoration; the later badge action may animate them without replacing collision.
  const gates=[];
  for(const x of [-2.55,-.85,.85,2.55]){
    box(x,.50,-.42,.26,1.00,1.48,P.steelD,{round:.08,hard:true,gloss:.48,tag:'闸机'});
    const p=box(x+(x<0?.56:-.56),.82,-.42,.78,.62,.055,P.glass,
      {hard:true,mode:1,alpha:.35,gloss:.66,tag:'闸机'});
    // The paddle rotates after finish(), so its construction-time pick box is deliberately
    // removed and the cull sphere is centred on the hinge for the whole sweep.
    p.ob=null;p.fixed=true;p.cx=x;p.cy=.82;p.cz=-.42;p.r=1.05;
    gates.push({p,x,m0:p.m,side:x<0?1:-1});
    box(x,1.05,-.82,.16,.12,.20,P.screen,{hard:true,mode:1,glow:.10,tag:'闸机'});
    cyl(x,1.10,-.83,.035,.022,P.green,{rx:Math.PI/2,mode:1,glow:.12,tag:'闸机'});
    solid(x-.18,x+.18,-1.20,.36);
  }
  let gateK=0;
  if(onTick)onTick((t,body,clock,dt)=>{
    const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
    const target=Math.abs(bx)<3.2&&Math.abs(bz+.42)<1.8?1:0;
    gateK+=(target-gateK)*(1-Math.exp(-dt*7));
    for(const q of gates)q.p.m=M.mul(M.trans(q.x,0,-.42),M.mul(M.rotY(q.side*gateK*1.20),
      M.mul(M.trans(-q.x,0,.42),q.m0)));
  });
  station('闸机','swipe-access-badge',0,1.02,-.82,
    '把员工卡或访客证贴在读卡器上，绿灯亮后通过。',
    'Tap an employee or visitor badge and pass when the light turns green.',
    '闸机 is a turnstile; 刷卡 means to tap a card.',[0,-1.72],1.70,{stage:'access'});

  // Directory / waiting lounge opposite reception.
  box(5.60,1.62,-1.98,1.82,2.42,.12,P.walnutD,{hard:true,mode:6,tag:'公司名录'});
  box(5.60,1.62,-2.06,1.64,2.24,.025,P.cream,{hard:true,mode:1,tag:'公司名录'});
  glyphs(5.60,2.43,-2.09,0,'公司名录',{size:.15,gap:.035,color:P.red,mode:1,lift:.010,tag:'公司名录'});
  const directoryRows=[['B1','后勤'],['1F','大堂'],['2F','财务'],['3F','法务'],['4F','项目'],['5F','人事'],['6F','员工']];
  directoryRows.forEach(([n,t],i)=>{
    const y=2.06-i*.235;
    glyphs(5.20,y,-2.09,0,n,{size:.075,color:P.black,mode:1,lift:.010,tag:'公司名录'});
    glyphs(5.78,y,-2.09,0,t,{size:.075,color:P.black,mode:1,lift:.010,tag:'公司名录'});
  });
  info('公司名录',5.60,1.62,-2.08,
    '名录列出各楼层的部门和公共服务。',
    'The directory lists departments and shared services on each floor.',
    '名录 is a directory.',[5.60,-1.16],1.55);
  solid(4.67,6.53,-2.10,-1.86);

  const faceTable=(x,z)=>Math.atan2(-4.48-x,-7.34-z);
  loungeChair(-5.45,-6.65,faceTable(-5.45,-6.65),'等候区',P.fabric);
  loungeChair(-3.65,-6.82,faceTable(-3.65,-6.82),'等候区',P.fabricL);
  loungeChair(-5.35,-8.05,faceTable(-5.35,-8.05),'等候区',P.fabricL);
  loungeChair(-3.55,-7.90,faceTable(-3.55,-7.90),'等候区',P.fabric);
  lowTable(-4.48,-7.34,1.35,.76,'等候区');
  cyl(-4.48,.57,-7.34,.10,.18,P.white,{tag:'等候区'});
  station('等候区','wait-for-host',-4.48,.68,-7.34,
    '在等候区坐下，等受访人来大堂接你。',
    'Sit in the waiting area until your host comes to the lobby.',
    '等候 means to wait.',[-4.48,-6.20],1.70,{stage:'arrival'});
  planter(-6.28,-4.65,.78);planter(5.95,-7.55,.82);

  // ---------------------------------------------------------------- property-management wing
  serviceCounter(-9.28,-4.28,3.15,.82,'物业服务台',P.oak,false);
  terminal(-9.28,1.42,-4.74,0,'物业服务台','物业');
  // The board was 3.65 m wide, centred on x = -9.28 — dead centre of the 1.25 m doorway cut through
  // the cross-wall at x = -9.15.  It spanned y 1.24 … 2.08, so it papered the opening over at chest
  // and head height while the floor stayed walkable: you crossed to the security room by walking
  // through a visible board.  It now hangs on the solid wall segment west of the door instead.
  box(-10.60,1.66,-2.49,1.50,.84,.10,P.white,{hard:true,tag:'报修看板'});
  glyphs(-10.60,1.94,-2.42,0,'今日报修',{size:.14,gap:.034,color:P.red,mode:1,lift:.010,tag:'报修看板'});
  for(let i=0;i<4;i++)glyphs(-10.60,1.65-i*.20,-2.42,0,i<2?'□ 处理中':'□ 已完成',
    {size:.085,gap:.020,color:i<2?P.amber:P.green,mode:1,lift:.010,tag:'报修看板'});
  station('物业服务台','report-building-issue',-9.28,1.42,-4.72,
    '说明楼层、位置和故障现象，物业会生成报修单。',
    'Give the floor, location and fault so property management can create a work order.',
    '物业 is property management; 报修 is a repair request.',[-9.28,-5.35],1.70,{stage:'service'});
  station('报修看板','check-work-orders',-10.60,1.62,-2.40,
    '查看今天的报修任务、负责人和处理状态。',
    'Check today\'s repair requests, assignees and status.',
    '处理中 means in progress.',[-10.60,-3.20],1.55,{stage:'service'});
  pendant(-9.30,-5.35,.22);

  // ---------------------------------------------------------------- security room and lobby screening
  // 3.25 m of counter in a 4.18 m room left just 3 cm of body clearance between its east end and
  // the glazed door jamb — a 0.66 m squeeze on the only way in.  2.55 m gives 0.98 m at the door
  // and still carries the whole console; the room's west bypass widens to 1.25 m at the same time.
  serviceCounter(-9.30,-.45,2.55,.82,'安保台',P.steelD,false);
  // The CCTV array sits on the face of a full-depth equipment bank running back to the room's rear
  // wall.  It used to be an 8 cm panel with an 8 cm collider standing 1.3 m clear of that wall, and
  // the 0.6 m of floor behind it was standable with no route to it — 78 stranded flood-fill cells,
  // the only ones on the plate that a player could see into and never reach.  The carcass is now
  // the thing the collider describes, and the collider closes onto the rear wall.
  box(-9.30,1.66,.86,3.78,1.72,.08,P.walnutD,{hard:true,mode:6,gloss:.22,tag:'监控墙'});
  box(-9.29,1.25,1.46,4.26,2.50,1.08,P.walnutD,{hard:true,mode:6,gloss:.18,tag:'监控墙'});
  for(const x of [-11.13,-9.30,-7.47])box(x,1.25,.80,.055,2.46,.030,P.steelD,
    {hard:true,gloss:.44,tag:'监控墙'});
  solid(-11.55,-7.16,.79,2.02);
  box(-9.30,2.48,.81,3.64,.045,.035,P.brassL,{hard:true,gloss:.58,tag:'监控墙'});
  const securityLight=box(-9.30,A.H-.18,-.28,2.55,.045,.26,P.white,
    {hard:true,mode:1,glow:.15,tag:'安保灯'});
  if(A.luminous)A.luminous(securityLight,.050,.23);
  light(-9.30,A.H-.36,-.28,[.98,.88,.72],.22,3.2);
  // The four screens are mounted ON the bank's face in two courses.  They used to stand on stands
  // arranged 2x2 in PLAN at one height, and the back pair's bases sat at y 1.24 with the worktop
  // ending 0.49 m short of them — two monitors on pedestals standing on nothing.
  for(const [i,[dx,dy]] of [[0,[-.94,1.98]],[1,[.94,1.98]],[2,[-.94,1.30]],[3,[.94,1.30]]]){
    box(-9.30+dx,dy,.78,1.62,.62,.055,P.black,{hard:true,tag:'监控墙'});
    box(-9.30+dx,dy,.752,1.50,.50,.015,P.screen,{hard:true,mode:1,glow:.07,tag:'监控墙'});
    for(let k=0;k<3;k++)box(-9.30+dx-.42+k*.42,dy-.09+(i%2)*.11,.744,.34,.035,.012,P.screenL,
      {hard:true,mode:1,tag:'监控墙'});
    ball(-9.30+dx+.68,dy+.22,.744,.026,.020,.018,i===0?P.red:P.green,
      {mode:1,glow:.08,tag:'监控墙'});
  }
  box(-10.92,2.55,1.62,.10,.10,.42,P.steelD,{hard:true,tag:'监控墙'});
  capsule(-10.72,2.55,1.62,.028,.36,.028,P.steelD,{rz:Math.PI/2,gloss:.44,tag:'监控墙'});
  taper(-10.48,2.55,1.62,.26,.18,.18,P.black,{rz:Math.PI/2,mode:7,gloss:.24,tag:'监控墙'});
  ball(-10.34,2.55,1.62,.045,.045,.025,P.screenL,{mode:1,glow:.08,tag:'监控墙'});
  // Radio, duty log and tactile console controls keep the work surface from reading as a slab.
  box(-10.18,1.20,-.68,.34,.22,.18,P.black,{round:.035,hard:true,gloss:.24,tag:'安保台'});
  capsule(-10.18,1.46,-.68,.018,.46,.018,P.black,{rz:-.18,gloss:.26,tag:'安保台'});
  box(-9.38,1.21,-.68,.58,.025,.40,P.cream,{hard:true,rz:-.025,tag:'安保台'});
  capsule(-9.15,1.24,-.68,.012,.22,.012,P.blue,{rz:Math.PI/2,gloss:.28,tag:'安保台'});
  box(-8.42,1.20,-.69,.58,.12,.26,P.black,{round:.035,hard:true,gloss:.25,tag:'安保台'});
  for(let i=0;i<5;i++)cyl(-8.60+i*.09,1.28,-.76,.022,.014,i<2?P.green:P.amber,
    {mode:1,glow:.06,tag:'安保台'});
  station('安保台','security-check-in',-9.30,1.35,-.88,
    '交接值班记录，确认访客名单和需要特别留意的区域。',
    'Review the duty log, visitor list and areas requiring attention.',
    '安保 means security; 值班 is a duty shift.',[-9.30,-1.35],1.65,{stage:'security'});
  // The focus is the guard's own side of the desk, not the public side: the screens are on the back
  // wall now, and 0.37 m is the honest standing distance to read them.
  station('监控墙','review-lobby-cctv',-9.30,1.64,.72,
    '查看入口、闸机、收发室和装卸区的实时画面。',
    'Review live views of the entrance, turnstiles, mailroom and loading area.',
    '监控 is surveillance.',[-9.30,.37],1.55,{stage:'security'});
  // X-ray belt and bag table on the public side.
  box(4.78,.73,-7.25,2.55,1.38,.92,P.steelD,{hard:true,tag:'安检台'});
  box(4.78,.78,-7.25,2.76,.14,.76,P.black,{hard:true,tag:'安检台'});
  box(4.78,1.42,-7.25,1.18,1.42,1.02,P.steel,{hard:true,tag:'安检台'});
  box(4.78,1.42,-7.25,1.02,1.14,1.08,P.black,{hard:true,tag:'安检台'});
  // Independent rollers, curtain strips, side controls and tray stack make the machine readable
  // from the entrance instead of one large black cuboid.
  for(let x=3.48;x<=6.08;x+=.22)
    capsule(x,.84,-7.25,.032,.64,.032,P.steel,{rx:Math.PI/2,gloss:.48,tag:'安检台'});
  for(let x=4.35;x<=5.20;x+=.14)
    box(x,1.46,-7.78,.105,1.02,.035,P.black,{hard:true,mode:7,alpha:.84,tag:'安检台'});
  box(5.48,1.53,-7.79,.30,.48,.10,P.steelD,{round:.035,hard:true,gloss:.40,tag:'安检台'});
  for(const y of [1.65,1.50,1.35])cyl(5.48,y,-7.86,.035,.020,y>1.55?P.green:P.amber,
    {rx:Math.PI/2,mode:1,glow:.08,tag:'安检台'});
  for(let i=0;i<4;i++)box(6.05,.24+i*.055,-6.92,.72,.045,.52,P.blue,
    {round:.04,hard:true,ry:(i-1.5)*.018,tag:'安检台'});
  solid(3.40,6.18,-7.82,-6.68);
  station('安检台','screen-visitor-bag',4.78,1.20,-7.78,
    '把随身包平放在传送带上，通过以后从另一端取回。',
    'Lay your bag flat on the belt and collect it after screening.',
    '安检 is a security check; 传送带 is a conveyor belt.',[4.78,-6.25],1.65,{stage:'security'});
  pendant(-9.30,-.30,.22);

  // ---------------------------------------------------------------- parcel wing
  parcelRack(8.05,-7.52,2.35,Math.PI/2,'快递室');
  parcelRack(10.90,-7.52,2.35,-Math.PI/2,'快递室');
  // Two things were wrong with this room and they compounded.
  //
  // 1. The counter sat at z = -5.45.  Its collider ran to z = -5.06 and the two side racks' ran to
  //    -6.345; with the 0.30 m body radius those shadows OVERLAPPED by 9 cm, so the 1.45 m central
  //    bay between the racks had no opening at either end.  112 flood-fill cells — the whole aisle
  //    a player walks down to reach the parcels — were standable and unreachable from anywhere.
  //    Moving the counter 0.50 m north opens a 1.05 m clear band across the room's full width.
  // 2. The third rack lay across the middle of the room at z = -3.02, 3.35 m wide in a 4.18 m
  //    room.  It stood squarely in the approach to the 1.25 m doorway at x = 9.30 in the cross
  //    wall, so that doorway could be entered from the mailroom and led nowhere: a real opening in
  //    a real wall with no route to its far side.  It now runs down the east wall, which leaves
  //    the doorway a 1.53 m approach and gives the room one legible circulation loop.
  serviceCounter(9.30,-4.95,2.70,.78,'快递室',P.oak,false);
  parcelRack(11.00,-3.50,1.90,-Math.PI/2,'快递架');
  terminal(9.30,1.40,-5.38,0,'快递室','快递');
  station('快递室','collect-parcel',9.30,1.40,-5.36,
    '出示取件码，核对姓名以后领取包裹。',
    'Show the collection code and verify your name to collect a parcel.',
    '快递 is a courier delivery; 取件码 is a collection code.',[9.30,-5.85],1.70,{stage:'parcel'});
  station('快递架','log-parcel',10.55,1.25,-3.50,
    '扫描运单，把包裹放到系统指定的架位。',
    'Scan the waybill and place the parcel on its assigned shelf.',
    '运单 is a waybill; 架位 is a shelf location.',[10.02,-3.50],1.60,{stage:'parcel'});
  pendant(9.30,-4.95,.22);

  // ---------------------------------------------------------------- mailroom wing
  mailWall(9.35,1.65,3.70,2.25,0,'收发室');
  // Match the parcel-room counter width: the old 3.55 m run and postage machine pinched the
  // west-door approach below one body diameter, sealing both mail actions behind the counter.
  serviceCounter(9.35,-.48,2.70,.78,'收发室',P.walnut,false);
  terminal(9.35,1.42,-.90,0,'收发室','邮件');
  // Pull the postage unit south onto a compact ledge.  A measured .92 m west passage remains,
  // while its machine footprint is now physical instead of letting the player cross the console.
  box(7.70,.82,-1.85,.88,.07,.62,P.walnut,{hard:true,round:.025,mode:6,gloss:.26,tag:'邮资机'});
  for(const x of [7.42,7.98])box(x,.57,-1.85,.055,.48,.44,P.brass,
    {hard:true,gloss:.54,tag:'邮资机'});
  box(7.70,.93,-1.85,.70,.16,.54,P.white,{hard:true,tag:'邮资机'});
  box(7.70,1.08,-1.85,.42,.18,.22,P.black,{hard:true,tag:'邮资机'});
  box(7.70,1.11,-1.98,.32,.09,.025,P.screen,{hard:true,mode:1,glow:.08,tag:'邮资机'});
  cyl(7.95,1.01,-1.99,.045,.022,P.green,{rx:Math.PI/2,mode:1,glow:.08,tag:'邮资机'});
  box(7.28,.97,-1.85,.28,.035,.42,P.white,{hard:true,rz:-.03,tag:'邮资机'});
  solid(7.24,8.16,-2.17,-1.53);
  // Stacking trays, routing slips, label printer and round department bins compose the workroom.
  for(let i=0;i<3;i++){
    const x=8.54+i*.46;
    box(x,1.245+i*.018,-.54,.40,.045,.33,P.steel,{round:.025,hard:true,gloss:.36,tag:'收发室'});
    box(x,1.275+i*.018,-.55,.32,.018,.25,P.cream,{hard:true,rz:(i-1)*.018,tag:'收发室'});
    box(x-.12,1.295+i*.018,-.70,.055,.08,.018,[P.red,P.blue,P.green][i],{hard:true,tag:'收发室'});
  }
  box(10.20,1.32,-.56,.50,.28,.34,P.steelD,{round:.045,hard:true,gloss:.30,tag:'收发室'});
  box(10.20,1.38,-.75,.36,.10,.025,P.screen,{hard:true,mode:1,glow:.07,tag:'收发室'});
  box(10.20,1.18,-.75,.30,.035,.32,P.white,{hard:true,tag:'收发室'});
  for(const [i,x] of [10.55,11.08].entries()){
    cyl(x,.30,.70,.28,.55,[P.blue,P.green][i],{mode:7,gloss:.10,tag:'收发室'});
    cyl(x,.59,.70,.31,.060,P.black,{mode:7,gloss:.18,tag:'收发室'});
    box(x,.34,.39,.24,.13,.018,P.white,{hard:true,mode:1,tag:'收发室'});
    glyphs(x,.34,.37,0,i?'内':'外',{size:.075,color:P.black,mode:1,lift:.006,tag:'收发室'});
    solid(x-.31,x+.31,.39,1.01);
  }
  station('收发室','collect-office-mail',9.35,1.42,-.88,
    '报部门和姓名，签收当天的信件与内部文件。',
    'Give your department and name, then sign for today\'s letters and internal documents.',
    '收发室 is a mailroom; 签收 means to sign for receipt.',[9.35,-1.45],1.65,{stage:'mail'});
  station('邮资机','prepare-outgoing-mail',7.70,1.04,-1.87,
    '称量信封、选择邮资，然后贴上地址标签。',
    'Weigh the envelope, select postage and attach the address label.',
    '邮资 is postage; 信封 is an envelope.',[8.58,-1.68],1.50,{stage:'mail'});
  pendant(9.30,-.30,.22);

  // ---------------------------------------------------------------- coffee kiosk
  serviceCounter(4.65,-3.58,2.45,.72,'咖啡台',P.coffee,false);
  box(4.15,1.46,-3.92,.72,.84,.54,P.black,{hard:true,tag:'咖啡机'});
  box(4.15,1.58,-4.21,.58,.38,.05,P.steelD,{hard:true,gloss:.48,tag:'咖啡机'});
  for(const x of [3.98,4.32])capsule(x,1.25,-4.22,.025,.27,.025,P.brass,{gloss:.55,tag:'咖啡机'});
  for(const x of [3.98,4.32]){
    capsule(x,1.33,-4.26,.022,.30,.022,P.walnutD,{rz:Math.PI/2,gloss:.30,tag:'咖啡机'});
    cyl(x,1.17,-4.19,.08,.10,P.white,{gloss:.24,tag:'咖啡机'});
  }
  taper(4.57,1.30,-4.00,.18,.30,.18,P.steel,{gloss:.52,tag:'咖啡台'});
  capsule(4.70,1.35,-4.00,.020,.20,.020,P.steel,{rz:Math.PI/2,gloss:.52,tag:'咖啡台'});
  for(let i=0;i<7;i++)cyl(4.88+i*.16,1.28,-3.93,.055,.13,[P.white,P.red,P.jade][i%3],{tag:'咖啡台'});
  box(5.55,1.43,-3.93,.50,.54,.42,P.steel,{hard:true,tag:'收银机'});
  box(5.55,1.53,-4.16,.40,.24,.03,P.screen,{hard:true,mode:1,glow:.09,tag:'收银机'});
  // A compact menu panel gives the kiosk a vertical back and keeps the till from floating alone.
  box(5.18,2.06,-3.19,1.55,1.06,.08,P.coffee,{hard:true,mode:6,tag:'咖啡台'});
  glyphs(5.18,2.34,-3.14,Math.PI,'今日咖啡',{size:.14,gap:.035,color:P.cream,mode:1,lift:.010,tag:'咖啡台'});
  glyphs(5.18,1.98,-3.14,Math.PI,'美式  拿铁  茶',{size:.095,gap:.025,color:P.white,mode:1,lift:.010,tag:'咖啡台'});
  station('咖啡机','make-lobby-coffee',4.15,1.48,-4.17,
    '选一杯美式或拿铁，等指示灯停止闪烁。',
    'Choose an Americano or latte and wait for the light to stop flashing.',
    '咖啡 is coffee; 拿铁 is a latte.',[4.15,-4.72],1.55,{stage:'break'});
  station('咖啡台','buy-lobby-coffee',5.15,1.26,-3.96,
    '在咖啡台点单，拿上杯子再去等电梯。',
    'Order at the coffee counter and take your cup to the lift.',
    '点单 means to place an order.',[5.15,-4.65],1.55,{stage:'break'});
  pendant(4.65,-3.58,.20);

  // The long arrival axis gets warm pools without competing with the office core's ceiling grid.
  for(const [x,z] of [[0,-7.1],[0,-3.8],[0,.6],[-5.5,-5.0],[5.4,-5.0]])pendant(x,z,.18);

});

// game.js folds OfficeCast into the live roster before any lazy floor builder runs. Register the
// lobby team here at module load so they exist on the first visit and are never duplicated by a
// rebuild. Counter staff occupy the private side of their desks, leaving every public interaction
// focus and the protected arrival axis unobstructed.
if(typeof OfficeCast!=='undefined')OfficeCast.push(
  {hz:'前台职员',name:'许佳',py:'Xǔ Jiā',place:'office1',temper:'welcoming',
    look:{skin:'#e2b18a',hair:'#2c231e',hairStyle:'bun',top:'#eee7dc',pants:'#343d47',shoe:'#292e32',jacket:'#9b443a',collar:'shirt',tall:.98,wide:.92,faceSeed:9001},
    spots:[{h0:7.5,h1:19,at:[-1.35,-1.92],face:Math.PI,act:'vend'}]},
  {hz:'保安',name:'何军',py:'Hé Jūn',place:'office1',temper:'alert',
    look:{skin:'#c98e66',hair:'#231f1c',hairStyle:'short',top:'#426073',pants:'#26323a',shoe:'#20272c',uniform:'guard',tall:1.05,wide:1.03,faceSeed:9002},
    spots:[{h0:7,h1:19,at:[2.85,-7.18],face:Math.PI/2,act:'stand'}]},
  {hz:'物业职员',name:'罗师傅',py:'Luó shīfu',place:'office1',temper:'practical',
    look:{skin:'#c58f68',hair:'#4d443d',hairStyle:'short',top:'#697c72',pants:'#343e42',shoe:'#2a3032',tall:1.01,wide:1.06,age:.44,faceSeed:9003},
    spots:[{h0:8,h1:18,at:[-9.28,-3.45],face:Math.PI,act:'work',held:null}]},
  {hz:'收发员',name:'邓芳',py:'Dèng Fāng',place:'office1',temper:'brisk',
    look:{skin:'#dba984',hair:'#302823',hairStyle:'bob',top:'#5f7f79',pants:'#354047',shoe:'#2b3034',tall:.97,wide:.96,faceSeed:9004},
    spots:[{h0:8,h1:18,at:[9.35,.35],face:Math.PI,act:'work',held:null}]},
  {hz:'咖啡师',name:'阿文',py:'Ā Wén',place:'office1',temper:'genial',
    look:{skin:'#d6a079',hair:'#25201d',hairStyle:'crop',top:'#e2d8c7',pants:'#363331',shoe:'#2b2928',apron:'#51372d',tall:1.02,wide:.96,faceSeed:9005},
    spots:[{h0:7.5,h1:17.5,at:[4.65,-2.70],face:Math.PI,act:'vend'}]}
);

Object.assign(OfficeUse.office1,{
  'register-visitor':{zh:'登记访客',py:'dēngjì fǎngkè',en:'register a visitor',secs:2.8,mins:8,gain:{},pose:{type:'stand'}},
  'print-visitor-badge':{zh:'打印访客证',py:'dǎyìn fǎngkèzhèng',en:'print a visitor badge',secs:2.4,mins:5,gain:{},pose:{type:'work'}},
  'swipe-access-badge':{zh:'刷卡进闸',py:'shuākǎ jìn zhá',en:'tap through the turnstile',secs:1.6,mins:1,gain:{},pose:{type:'check'}},
  'wait-for-host':{zh:'等候受访人',py:'děnghòu shòufǎngrén',en:'wait for your host',secs:3.2,mins:10,gain:{rest:4,mood:1},pose:{type:'sit',seatY:.48}},
  'report-building-issue':{zh:'提交报修',py:'tíjiāo bàoxiū',en:'report a building issue',secs:2.7,mins:6,gain:{},pose:{type:'write'}},
  'check-work-orders':{zh:'查看报修单',py:'chákàn bàoxiūdān',en:'check work orders',secs:2.2,mins:4,gain:{},pose:{type:'check'}},
  'security-check-in':{zh:'交接安保班次',py:'jiāojiē ānbǎo bāncì',en:'hand over a security shift',secs:2.8,mins:8,gain:{rest:-2},pose:{type:'work'}},
  'review-lobby-cctv':{zh:'查看大堂监控',py:'chákàn dàtáng jiānkòng',en:'review lobby CCTV',secs:2.8,mins:8,gain:{rest:-2},pose:{type:'check'}},
  'screen-visitor-bag':{zh:'检查访客行李',py:'jiǎnchá fǎngkè xíngli',en:'screen a visitor bag',secs:2.4,mins:4,gain:{},pose:{type:'work'}},
  'collect-parcel':{zh:'领取快递',py:'lǐngqǔ kuàidì',en:'collect a parcel',secs:2.2,mins:4,gain:{mood:1},pose:{type:'carry'}},
  'log-parcel':{zh:'登记快递',py:'dēngjì kuàidì',en:'log a parcel',secs:2.5,mins:6,gain:{rest:-1},pose:{type:'work'}},
  'collect-office-mail':{zh:'领取邮件',py:'lǐngqǔ yóujiàn',en:'collect office mail',secs:2.2,mins:4,gain:{},pose:{type:'carry'}},
  'prepare-outgoing-mail':{zh:'准备寄件',py:'zhǔnbèi jìjiàn',en:'prepare outgoing mail',secs:2.7,mins:7,gain:{rest:-1},pose:{type:'work'}},
  'make-lobby-coffee':{zh:'制作咖啡',py:'zhìzuò kāfēi',en:'make a coffee',secs:2.8,mins:5,gain:{rest:6,mood:3},pose:{type:'drink'}},
  'buy-lobby-coffee':{zh:'点一杯咖啡',py:'diǎn yì bēi kāfēi',en:'buy a lobby coffee',secs:2.6,mins:8,gain:{rest:6,mood:4},pose:{type:'drink'}},
});
