// 华北创意中心 · 三楼法务部
//
// This is a complete in-house legal floor: public intake close to the shared spine, quiet case
// rooms behind a glazed threshold, a real law library, secure evidence storage and a mediation
// suite.  Stable action ids deliberately separate research, review, certification and filing —
// four activities which would otherwise all look like “use the desk” to gameplay code.

OfficeFit.register('office3', A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
    partitionZ,partitionX,sign,doorPlate,room,
  } = A;

  const P = {
    carpet:A.C('#4d5357'), carpetD:A.C('#383e43'), rug:A.C('#5c3040'),
    wall:A.C('#ebe8df'), wallD:A.C('#c9c6bd'), glass:A.C('#b1c6cb'),
    walnut:A.C('#73543e'), walnutD:A.C('#45352b'), oak:A.C('#b49870'),
    brass:A.C('#a78348'), black:A.C('#242729'), steel:A.C('#788186'),
    white:A.C('#f7f2e7'), paper:A.C('#eee7d7'), red:A.C('#983d38'),
    burgundy:A.C('#672f3b'), blue:A.C('#315e79'), green:A.C('#466b52'),
    screen:A.C('#183342'), screenL:A.C('#8db4c1'), leather:A.C('#383330'),
    bookRed:A.C('#87463d'), bookBlue:A.C('#405f73'), bookGreen:A.C('#51684c'),
  };
  const tagOpt=(tag,o={})=>tag?{...o,tag}:o;

  // A TAG DOES TWO UNRELATED JOBS HERE, WHICH IS WHY ONLY HALF OF THEM MAY BE SPLIT.
  //
  //  1. `pick` (js/build.js:439) resolves a clicked prop to the `thing` wearing the SAME tag. Every
  //     tag that a station() or info() below registers is therefore live interaction wiring: rename
  //     it and the object stops opening its card. Those seventeen tags stay exactly as they are.
  //  2. `hiddenProp` (js/game.js:1994) judges a TAGGED prop by the centre of its whole tag group's
  //     bounding box. A group spread over metres is judged from a point no member occupies.
  //
  // Job 2 was a live defect on this floor. The seven partitions did NOT carry the toolkit default
  // '墙' — they carried an explicit '隔墙' — but one shared string over seven walls is the same
  // fault as the hotel's, and the name is irrelevant to the mechanism. The '隔墙' group ran
  // x -10.34..10.64, z -6.93..-0.14, centre (0.15, -3.53); the 23 m '玻璃墙' group centred on
  // (0.00, -2.44). Neither point lies inside any of the eight camera rooms, so the moment the
  // camera backed out of ANY room the whole floor's architecture hid or showed as one unit —
  // walls turning into holes from certain angles. The same held for '灯' and for every chair tag,
  // each of which pooled furniture from opposite ends of a 24 m plate.
  //
  // The fix is per-stretch and per-instance tags for architecture and pure decoration, so a group
  // is a wall plus its own head and jambs, or one chair plus its own legs. js/hotel-f4.js:255 and
  // js/home-walls.js:184 are the template.
  let tagN=0;
  const newTag=p=>(p||'三楼隔墙')+(++tagN);
  const station=(hz,id,x,y,z,zh,en,note,focus=[x,z],reach=1.7,extra={})=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    th.officeAction=id;
    th.officeStation={floor:A.key,id,department:'legal',...extra};
    return th;
  };
  const info=(hz,x,y,z,zh,en,note,focus=[x,z],reach=1.7)=>{
    const th=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
    th.officeFloor=A.key;
    return th;
  };

  function panelLight(x,z,w=3.2) {
    const p=box(x,A.H-.16,z,w,.045,.25,P.white,{hard:true,mode:1,glow:.15,tag:newTag('灯')});
    if(A.luminous)A.luminous(p,.045,.21);
    light(x,A.H-.33,z,[.98,.92,.80],.21,3.5);
    glow(M.trs(x,.024,z,0,w*1.2,1,2.25),P.white,.032);
  }
  // The glazed threshold is 23.3 m of one elevation, so it is divided by the same lines that
  // divide the rooms behind it: `bayTag` names the bay a piece of glass belongs to, and `splits`
  // are the partition heads the glazing dies into. Each bay's panes, mullions, door head and
  // hardware then form a tag group whose centre sits on that bay's own frontage instead of on the
  // middle of the floor plate, which is the only point the old single '玻璃墙' group could offer.
  function glassWallZ(z,x0,x1,doors=[],bayTag=()=>'玻璃墙',splits=[]) {
    const cuts=doors.map(([c,w])=>[c-w/2,c+w/2]).sort((a,b)=>a[0]-b[0]);
    const pane=(a,b)=>{
      if(b-a<.08)return;
      const tag=bayTag((a+b)/2);
      box((a+b)/2,1.72,z,b-a,3.34,.07,P.glass,
        {hard:true,mode:1,alpha:.16,gloss:.68,...tagOpt(tag)});
      // A restrained privacy band keeps the legal rooms readable without turning the
      // threshold into an opaque wall when approached from the circulation spine.
      box((a+b)/2,1.26,z-.043,b-a-.06,.34,.009,P.white,
        {hard:true,mode:1,alpha:.22,gloss:.42,...tagOpt(tag)});
      box((a+b)/2,.13,z-.047,b-a-.04,.10,.018,P.brass,
        {hard:true,mode:1,gloss:.58,...tagOpt(tag)});
      for(const x of [a,b]) box(x,1.72,z,.045,3.36,.09,P.black,{hard:true,...tagOpt(tag)});
      solid(a,b,z-.045,z+.045);
    };
    // A run of glazing is cut wherever a partition meets it, so a single pane never straddles two
    // rooms. Two abutting panes cover exactly the span one pane covered, collider included.
    const run=(a,b)=>{
      let at=a;
      for(const s of splits) if(s>a+.08&&s<b-.08){pane(at,s);at=s;}
      pane(at,b);
    };
    let at=x0;
    for(const [a,b] of cuts){
      run(at,a);
      const tag=bayTag((a+b)/2);
      box((a+b)/2,3.22,z,b-a,.42,.09,P.walnutD,{hard:true,...tagOpt(tag)});
      box((a+b)/2,.065,z,b-a-.06,.085,.14,P.brass,{hard:true,gloss:.58,...tagOpt(tag)});
      for(const x of [a+.18,b-.18]) {
        capsule(x,1.08,z-.10,.022,.34,.022,P.brass,{gloss:.62,...tagOpt(tag)});
        ball(x,.91,z-.10,.035,.035,.035,P.brass,{gloss:.66,...tagOpt(tag)});
      }
      at=b;
    }
    run(at,x1);
  }
  function chair(x,z,ry=0,tag='椅子',color=P.leather) {
    // One tag per seat. No card is registered against a chair name, so the tag is doing cutaway
    // work only: it must group this chair's legs, back, arms and piping and nothing else. The old
    // shared names pooled eight '办公椅' from four different rooms into one group whose centre,
    // (-0.59, -2.88), sat in the corridor between them.
    tag=newTag(tag);
    const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    for(const u of [-.20,.20]) for(const v of [-.18,.18]) {
      const px=x+Math.cos(ry)*u+Math.sin(ry)*v;
      const pz=z-Math.sin(ry)*u+Math.cos(ry)*v;
      capsule(px,.23,pz,.030,.44,.030,P.walnutD,{gloss:.30,...tagOpt(tag)});
    }
    box(x,.46,z,.54,.12,.50,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    // `ry` is the direction the sitter faces.  The back therefore belongs behind that vector;
    // the old plus sign put every otherwise-correctly authored chair 180 degrees backwards.
    const bx=x-fx*.25,bz=z-fz*.25;
    box(bx,.76,bz,.54,.58,.10,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
    // Piped cushion edge and compact timber arms give every seat a clear silhouette.
    const ex=x+fx*.235,ez=z+fz*.235;
    box(ex,.49,ez,.51,.045,.055,P.burgundy,{round:.018,ry,gloss:.14,...tagOpt(tag)});
    for(const u of [-.28,.28]) {
      const ax=x+rx*u+fx*.04,az=z+rz*u+fz*.04;
      capsule(ax,.61,az,.022,.28,.022,P.walnutD,{gloss:.34,...tagOpt(tag)});
      box(ax,.76,az,.075,.055,.34,P.walnut,{round:.018,ry,gloss:.31,...tagOpt(tag)});
    }
    // A point-sized authored collider expands by the player's body radius at runtime.  It covers
    // the seat centre rigorously without turning a row of meeting chairs into an accidental wall.
    solid(x-.06,x+.06,z-.06,z+.06);
  }
  function desk(x,z,w=1.65,d=.78,ry=0,tag='办公桌',monitor=true) {
    const swap=Math.abs(Math.sin(ry))>.5;
    const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    box(x,.75,z,swap?d:w,.11,swap?w:d,P.walnut,
      {round:.055,hard:true,ry,mode:6,gloss:.28,...tagOpt(tag)});
    for(const s of [-1,1]) {
      const px=x+Math.cos(ry)*s*w*.39,pz=z-Math.sin(ry)*s*w*.39;
      box(px,.37,pz,.08,.72,d-.14,P.walnutD,{hard:true,ry,mode:6,...tagOpt(tag)});
    }
    if(monitor) {
      const sx=x-Math.sin(ry)*.22,sz=z-Math.cos(ry)*.22;
      box(sx,1.17,sz,.60,.40,.09,P.black,{hard:true,ry,gloss:.30,...tagOpt(tag)});
      box(sx+Math.sin(ry)*.052,1.17,sz+Math.cos(ry)*.052,.50,.30,.012,P.screen,
        {hard:true,ry,mode:1,glow:.08,...tagOpt(tag)});
      capsule(sx,.94,sz,.025,.23,.025,P.steel,{gloss:.44,...tagOpt(tag)});
      ball(sx+rx*.23+fx*.054,1.02,sz+rz*.23+fz*.054,.018,.018,.018,P.green,
        {glow:.16,...tagOpt(tag)});
    }
    const frontX=x+fx*(d*.47),frontZ=z+fz*(d*.47);
    box(frontX,.715,frontZ,swap?.06:w-.10,.055,swap?w-.10:.06,P.brass,
      {round:.015,ry,gloss:.52,...tagOpt(tag)});
    const padX=x+rx*.18+fx*.03,padZ=z+rz*.18+fz*.03;
    box(padX,.825,padZ,swap?.38:.60,.022,swap?.60:.38,P.leather,
      {round:.025,ry,mode:7,gloss:.04,...tagOpt(tag)});
    box(padX-rx*.18,.842,padZ-rz*.18,swap?.18:.30,.012,swap?.30:.18,P.paper,
      {ry,hard:true,...tagOpt(tag)});
    capsule(padX+rx*.17,.862,padZ+rz*.17,.013,.21,.013,P.brass,
      {rz:Math.PI/2-ry,gloss:.60,...tagOpt(tag)});
    solid(x-(swap?.48:w/2),x+(swap?.48:w/2),z-(swap?w/2:.48),z+(swap?w/2:.48));
    shade(x,z,swap?1.05:w+.18,swap?w+.18:1.05,.20);
  }
  // `seats` exists because the two meeting rooms on this floor are not the same shape. The
  // mediation room is open to the spine and 4.5 m deep, so it seats both long sides. The case
  // conference room has only 3.64 m of clear depth between the door wall and the daylight wall,
  // and a table with chairs pulled out on both sides needs about 4.8 m: the original both-sides
  // layout left 0.03 m of standing room north of the table and sealed the room off entirely — the
  // door opened onto a 0.13 m gap between two chairs. One side plus the two ends is what fits.
  function conferenceTable(x,z,w=3.5,d=1.18,tag='会议桌',seats={}) {
    box(x,.75,z,w,.13,d,P.walnut,{round:.11,hard:true,mode:6,gloss:.30,...tagOpt(tag)});
    box(x,.39,z,w-.42,.68,.20,P.walnutD,{hard:true,mode:6,...tagOpt(tag)});
    box(x,.825,z,w-.34,.018,.30,P.leather,{round:.035,mode:7,gloss:.035,...tagOpt(tag)});
    for(const gx of [-w*.28,w*.28]) {
      cyl(x+gx,.844,z,.085,.018,P.black,{mode:7,gloss:.18,...tagOpt(tag)});
      cyl(x+gx,.865,z,.050,.010,P.brass,{mode:7,gloss:.52,...tagOpt(tag)});
    }
    box(x,.865,z,.46,.075,.31,P.black,{round:.07,mode:7,gloss:.18,...tagOpt(tag)});
    for(const gx of [-.13,.13]) ball(x+gx,.904,z-.06,.020,.020,.020,P.green,{glow:.12,...tagOpt(tag)});
    for(const gx of [-w*.34,w*.34]) {
      box(x+gx,.855,z-.20,.40,.022,.27,P.paper,{ry:gx<0?-.035:.035,hard:true,...tagOpt(tag)});
      capsule(x+gx+.12,.875,z-.05,.012,.18,.012,P.brass,
        {rz:Math.PI/2,gloss:.58,...tagOpt(tag)});
      cyl(x+gx,.91,z+.24,.060,.15,P.glass,{mode:1,alpha:.42,gloss:.58,...tagOpt(tag)});
    }
    solid(x-w/2,x+w/2,z-d/2,z+d/2);
    const us=seats.us||[-1.28,-.43,.43,1.28],off=seats.off===undefined?.98:seats.off;
    const sides=seats.sides||'both';
    for(const u of us) {
      if(sides!=='north')chair(x+u,z-off,0,'会议椅');
      if(sides!=='south')chair(x+u,z+off,Math.PI,'会议椅');
    }
    shade(x,z,w+.3,d+(sides==='both'?1.32:.86),.23);
  }
  function bookshelf(x,z,w=2.0,h=2.45,ry=0,tag='法律图书室') {
    const swap=Math.abs(Math.sin(ry))>.5;
    const fx=Math.sin(ry),fz=Math.cos(ry);
    // Dimensions stay in shelf-local space; `ry` rotates them into the room.  Swapping the
    // dimensions here as well as rotating them had turned every side-wall case across the aisle
    // while its books (correctly authored along local x) remained on the intended axis.
    box(x,h/2,z,w,h,.38,P.walnutD,
      {hard:true,ry,mode:6,gloss:.24,...tagOpt(tag)});
    box(x,h+.045,z,w+.10,.09,.46,P.brass,
      {round:.025,hard:true,ry,gloss:.52,...tagOpt(tag)});
    for(let s=0;s<5;s++) {
      const yy=.24+s*.49;
      box(x,yy,z,w-.08,.055,.42,P.walnut,
        {hard:true,ry,mode:6,...tagOpt(tag)});
      box(x+fx*.215,yy+.025,z+fz*.215,w-.12,.030,.035,P.brass,
        {hard:true,ry,gloss:.48,...tagOpt(tag)});
      for(let i=0;i<8;i++) {
        const u=-w*.39+i*w*.11;
        const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        const bh=.31+((i*7+s*3)%5)*.025;
        box(px,yy+bh/2,pz,.13,bh,.27,[P.bookRed,P.bookBlue,P.bookGreen][(i+s)%3],
          {hard:true,ry,gloss:.15,...tagOpt(tag)});
        if(i===1&&s%2===0) box(px+fx*.145,yy+bh*.66,pz+fz*.145,.105,.025,.018,P.brass,
          {hard:true,ry,gloss:.46,...tagOpt(tag)});
      }
    }
    solid(x-(swap?.24:w/2),x+(swap?.24:w/2),z-(swap?w/2:.24),z+(swap?w/2:.24));
  }
  function fileCabinet(x,z,w=1.4,h=2.0,ry=0,tag='证据柜',color=P.steel) {
    const swap=Math.abs(Math.sin(ry))>.5;
    const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    // As with the bookshelves, author the cabinet in local dimensions and rotate once.  The old
    // double swap made the visible carcass cross its already-correct collision footprint.
    box(x,h/2,z,w,h,.48,color,{hard:true,ry,gloss:.23,...tagOpt(tag)});
    for(let i=1;i<5;i++) box(x,h*i/5,z,w-.06,.026,.50,P.black,
      {hard:true,ry,...tagOpt(tag)});
    for(let i=0;i<4;i++) {
      const yy=h*(i+.5)/4;
      const hx=x-fx*.265,hz=z-fz*.265;
      box(hx,yy,hz,.34,.035,.16,P.brass,
        {hard:true,ry,gloss:.56,...tagOpt(tag)});
      box(hx,yy+.13,hz,.42,.12,.24,P.white,
        {hard:true,ry,mode:1,alpha:.86,...tagOpt(tag)});
      ball(hx+rx*.28,yy,hz+rz*.28,.025,.025,.025,i===0?P.green:P.black,
        {gloss:.46,...tagOpt(tag)});
    }
    box(x-fx*.27,h-.12,z-fz*.27,.34,.22,.18,P.black,
      {hard:true,ry,gloss:.18,...tagOpt(tag)});
    glyphs(x-fx*.286,h-.12,z-fz*.286,ry,'SECURE',
      {size:.045,gap:.010,color:P.screenL,mode:1,lift:.006,tag});
    solid(x-(swap?.27:w/2),x+(swap?.27:w/2),z-(swap?w/2:.27),z+(swap?w/2:.27));
  }
  function caseTray(x,z,tag='案件登记') {
    box(x,.83,z,2.55,.14,.72,P.walnut,{hard:true,mode:6,gloss:.28,...tagOpt(tag)});
    box(x,.755,z+.34,2.42,.055,.035,P.brass,{hard:true,gloss:.52,...tagOpt(tag)});
    for(const s of [-1,1]) box(x+s*1.05,.41,z,.09,.82,.58,P.walnutD,{hard:true,mode:6,...tagOpt(tag)});
    for(let i=0;i<3;i++) {
      box(x-.55+i*.55,.94,z-.10,.42,.10,.56,P.paper,{hard:true,rz:(i-1)*.018,...tagOpt(tag)});
      box(x-.55+i*.55,1.00,z-.34,.24,.07,.03,[P.red,P.blue,P.green][i],{hard:true,...tagOpt(tag)});
      for(const s of [-1,1]) box(x-.55+i*.55+s*.205,1.02,z-.10,.025,.16,.58,P.brass,
        {hard:true,gloss:.50,...tagOpt(tag)});
    }
    capsule(x+.92,.94,z+.03,.012,.22,.012,P.brass,{rz:Math.PI/2,gloss:.62,...tagOpt(tag)});
    solid(x-1.30,x+1.30,z-.42,z+.42);
  }

  // ---------------------------------------------------------------- architecture
  // `nocut` for the same reason the shell's envelope takes it (js/game.js:1999): a 23 m floor
  // covering is building-scale geometry, and no single point can stand for it. Judged by the
  // department sign's tag box at (0.00, 2.12) the whole carpet vanished the instant the camera
  // left any room toward the centre of the plate, leaving the clear colour showing through.
  flat(0,.020,-3.30,23.35,11.05,P.carpet,{mode:7,gloss:.045,mat:'fabric',matScale:.50,matAmt:.21,tag:'法务部',nocut:true});
  flat(0,.025,1.43,23.30,1.22,P.wallD,{mode:7,gloss:.11,tag:'法务部',nocut:true});
  flat(0,.029,1.43,9.2,.055,P.burgundy,{mode:1,alpha:.80,tag:'法务部',nocut:true});
  sign(0,3.12,2.12,Math.PI,'三楼 · 法务部',P.burgundy,'法务部',.22);
  glyphs(0,2.78,2.08,Math.PI,'LEGAL & COMPLIANCE',
    {size:.092,gap:.025,color:P.burgundy,mode:1,lift:.010,tag:'法务部'});

  // Intake rooms face the shared spine; the daylight band behind them is divided into a library,
  // case team, conference room and partner office. Door widths remain at least 1.22 m.
  const FRONT_SPLITS=[-5.95,-.35,5.25];
  const frontBay=x=>'玻璃墙·'+(x<-5.95?'接待':x<-.35?'审阅':x<5.25?'调解':'合规');
  glassWallZ(-2.42,-11.65,11.65,[[-8.55,1.28],[-3.25,1.28],[2.15,1.28],[8.20,1.28]],
    frontBay,FRONT_SPLITS);
  partitionX(-5.95,-2.42,2.15,[],P.wall,'隔墙·接待东');
  partitionX(-.35,-2.42,2.15,[],P.wall,'隔墙·审阅东');
  partitionX(5.25,-2.42,2.15,[],P.wall,'隔墙·调解东');
  // The corridor's south wall was one 23.3 m partitionZ. Four calls split at the three cross-walls
  // it already meets emit exactly the same boxes and the same abutting colliders, and give each
  // room's frontage a tag group centred on its own wall rather than on the middle of the floor.
  partitionZ(-5.10,-11.65,-5.40,[[-8.4,1.24]],P.wall,'隔墙·图书室北');
  partitionZ(-5.10,-5.40,1.00,[[-2.7,1.24]],P.wall,'隔墙·案件组北');
  partitionZ(-5.10,1.00,6.60,[[3.8,1.24]],P.wall,'隔墙·会议室北');
  partitionZ(-5.10,6.60,11.65,[[9.0,1.24]],P.wall,'隔墙·顾问室北');
  partitionX(-5.40,-8.75,-5.10,[],P.wall,'隔墙·图书室东');
  partitionX(1.00,-8.75,-5.10,[],P.wall,'隔墙·案件组东');
  partitionX(6.60,-8.75,-5.10,[],P.wall,'隔墙·会议室东');

  doorPlate(-8.55,2.55,-2.37,Math.PI,'案件接待','案件登记',P.burgundy);
  doorPlate(-3.25,2.55,-2.37,Math.PI,'合同审阅','合同审阅台',P.burgundy);
  doorPlate(2.15,2.55,-2.37,Math.PI,'调解室','调解室',P.burgundy);
  doorPlate(8.20,2.55,-2.37,Math.PI,'证据与合规','证据柜',P.burgundy);
  // A plate's second argument is the TAG `pick` resolves against, so it names the card that opens
  // when the plate is clicked. Two were wired to the wrong side of the floor: 案件组 pointed at
  // 法律数据库, which is a desk in the contract room on the other side of the corridor, and
  // 总法律顾问 pointed at 办公室, a tag no thing wears at all, so that plate opened nothing.
  doorPlate(-8.40,2.55,-5.05,Math.PI,'法律图书室','法律图书室',P.burgundy);
  doorPlate(-2.70,2.55,-5.05,Math.PI,'案件组','案件工作台',P.burgundy);
  doorPlate(3.80,2.55,-5.05,Math.PI,'案件会议室','案件会议室',P.burgundy);
  doorPlate(9.00,2.55,-5.05,Math.PI,'总法律顾问','总法律顾问办公桌',P.burgundy);

  if(room) {
    room('office3-intake',-11.55,-6.05,-2.30,2.10,[-8.6,-.1]);
    room('office3-contract',-5.85,-.45,-2.30,2.10,[-3.2,-.1]);
    room('office3-mediation',-.25,5.15,-2.30,2.10,[2.2,-.1]);
    room('office3-evidence',5.35,11.55,-2.30,2.10,[8.4,-.1]);
    room('office3-library',-11.80,-5.47,-8.65,-5.20,[-8.66,-6.80]);
    room('office3-case-team',-5.30,.90,-8.65,-5.20,[-2.2,-6.8]);
    room('office3-conference',1.10,6.50,-8.65,-5.20,[3.8,-6.8]);
    room('office3-counsel',6.70,11.55,-8.65,-5.20,[9.1,-6.8]);
  }

  // ---------------------------------------------------------------- intake and conflict checks
  caseTray(-8.55,-.15,'案件登记');
  chair(-9.15,.83,Math.PI,'访客椅',P.rug);
  chair(-7.75,.83,Math.PI,'访客椅',P.rug);
  desk(-10.28,-1.40,1.60,.72,0,'利益冲突检索',true);
  chair(-10.28,-.72,Math.PI,'办公椅');
  // The three boards facing the spine used to be panels hanging with their lower edge at knee or
  // chest height over open floor, with no collider: a body walked straight through them. They are
  // taken to the floor and given the obstacle they always implied, which also gives intake,
  // mediation and the evidence room the privacy screen their programme asks for. Each room keeps
  // an opening of at least 1.12 m clear beside its screen — see the flood fill.
  box(-7.62,1.12,1.87,2.45,2.24,.12,P.white,{hard:true,tag:'案件流程'});
  A.furnitureSolid(-7.62,1.87,2.45,.12);
  glyphs(-7.62,1.83,1.79,Math.PI,'案件流程',{size:.19,gap:.045,color:P.burgundy,mode:1,lift:.012,tag:'案件流程'});
  glyphs(-7.62,1.40,1.79,Math.PI,'登记 → 冲突检索 → 分派',
    {size:.12,gap:.03,color:P.black,mode:1,lift:.012,tag:'案件流程'});
  station('案件登记','register-case',-8.55,.94,-.18,
    '登记来访人的姓名、单位、问题和截止日期。',
    'Record the visitor, organisation, issue and deadline.',
    '案件 is a legal matter; 登记 means to register.',[-8.55,.78],1.65,{stage:'intake'});
  station('利益冲突检索','conflict-check',-10.28,1.17,-1.58,
    '在接受案件以前检索客户和关联方，排除利益冲突。',
    'Search the client and related parties for conflicts before accepting the matter.',
    '利益冲突 means conflict of interest.',[-10.28,-.52],1.65,{stage:'clearance'});
  info('案件流程',-7.62,1.50,1.78,
    '新案件必须先登记和完成冲突检索，才能分派律师。',
    'A new matter must be registered and conflict-checked before assignment.',
    '分派 means to assign.',[-7.62,.92],1.55);
  panelLight(-8.60,-.10,4.5);

  // ---------------------------------------------------------------- contract review and certification
  desk(-4.30,-.35,1.70,.78,0,'合同审阅台',true);
  chair(-4.30,.37,Math.PI,'办公椅');
  desk(-1.47,-.35,1.70,.78,0,'法律数据库',true);
  chair(-1.47,.37,Math.PI,'办公椅');
  box(-2.90,.88,1.42,2.75,.16,.78,P.walnut,{hard:true,mode:6,gloss:.28,tag:'盖章台'});
  // Red stamp, ink pad and document alignment rail.
  cyl(-3.23,1.08,1.40,.12,.18,P.red,{gloss:.30,tag:'盖章台'});
  box(-2.82,.99,1.40,.34,.10,.28,P.red,{hard:true,gloss:.24,tag:'盖章台'});
  box(-2.28,.98,1.40,.62,.025,.42,P.paper,{hard:true,tag:'盖章台'});
  solid(-4.32,-1.47,1.00,1.84);
  station('合同审阅台','review-contract',-4.30,1.16,-.53,
    '逐条审阅合同，把风险、责任和终止条件标出来。',
    'Review the contract clause by clause and mark risks, liability and termination terms.',
    '合同 is a contract; 条款 is a clause.',[-4.30,.52],1.70,{stage:'review'});
  station('法律数据库','search-legal-database',-1.47,1.16,-.53,
    '检索现行法律、司法解释和相似案例。',
    'Search current law, judicial interpretations and similar cases.',
    '法律 is law; 案例 is a precedent or case.',[-1.47,.52],1.70,{stage:'research'});
  station('盖章台','certify-document',-2.90,1.02,1.35,
    '核对批准页以后，在归档副本上盖章。',
    'After checking the approval page, stamp the archive copy.',
    '盖章 means to affix an official seal.',[-2.90,.62],1.45,{stage:'certification'});
  panelLight(-3.15,-.10,4.5);

  // ---------------------------------------------------------------- mediation room
  // Tagged 调解室, not 调解桌: 调解桌 was a tag no thing wore, so clicking the mediation table
  // itself resolved to nothing and only the door plate opened the card.
  conferenceTable(2.30,-.25,3.55,1.10,'调解室');
  flat(2.30,.027,-.25,4.55,3.35,P.rug,{mode:7,gloss:.04,tag:'调解室',nocut:true});
  box(4.87,1.55,-.12,.08,2.45,3.35,P.walnutD,{hard:true,mode:6,tag:'隔音墙'});
  solid(4.79,4.95,-1.80,1.56);
  // Layered timber fins turn the acoustic treatment into a crafted feature wall.
  for(let i=0;i<14;i++) {
    const zz=-1.55+i*.245;
    box(4.815,1.55,zz,.055,2.30,.070,i%4===0?P.brass:(i%2?P.oak:P.walnut),
      {hard:true,round:.014,gloss:i%4===0?.48:.20,tag:'隔音墙'});
  }
  for(const zz of [-1.22,.98]) {
    cyl(4.75,1.56,zz,.10,.055,P.brass,{rx:Math.PI/2,gloss:.55,tag:'隔音墙'});
    ball(4.68,1.56,zz,.075,.075,.075,P.white,{glow:.12,tag:newTag('灯')});
  }
  // Narrowed from 3.90 m: at full width the screen plus its collider would have left only a
  // 0.08 m slot on the west side and reduced the mediation room to a single approach.
  box(2.30,1.125,1.84,2.60,2.25,.10,P.white,{hard:true,tag:'调解原则'});
  A.furnitureSolid(2.30,1.84,2.60,.10);
  glyphs(2.30,1.92,1.77,Math.PI,'依法 · 自愿 · 保密',
    {size:.18,gap:.055,color:P.burgundy,mode:1,lift:.012,tag:'调解原则'});
  station('调解室','conduct-mediation',2.30,.85,-.25,
    '安排双方陈述，记录共同点，并起草调解方案。',
    'Hear both sides, record common ground and draft a mediation proposal.',
    // Focus was [1.87, -1.23], which is the exact seat position of the second south chair — a
    // point the player can never occupy. The table centre is reachable from both long sides.
    '调解 is mediation; 保密 means confidentiality.',[2.30,-.25],1.75,{stage:'mediation'});
  info('调解原则',2.30,1.66,1.76,
    '调解遵循依法、自愿和保密三项原则。',
    'Mediation follows legality, consent and confidentiality.',
    '自愿 means voluntary.',[2.30,.90],1.55);
  panelLight(2.30,-.10,4.2);

  // ---------------------------------------------------------------- secure evidence and compliance room
  // Both cabinets present their labelled drawer fronts to the usable aisle.  Their previous yaw
  // put the handles against the side walls while the authored focus points were on the blank rear
  // faces; flipping them leaves the exact same collision footprint and makes close-up use truthful.
  fileCabinet(6.02,-.15,1.10,2.20,-Math.PI/2,'证据柜',P.steel);
  fileCabinet(10.98,-.15,1.10,2.20,Math.PI/2,'合规档案',P.steel);
  desk(8.48,-.45,1.70,.76,0,'文件脱敏台',true);
  chair(8.48,.27,Math.PI,'办公椅');
  box(8.48,1.085,1.85,3.75,2.17,.11,P.burgundy,{hard:true,mode:7,tag:'证据清单'});
  A.furnitureSolid(8.48,1.85,3.75,.11);
  glyphs(8.48,1.72,1.78,Math.PI,'证据清单',{size:.19,gap:.05,color:P.white,mode:1,lift:.012,tag:'证据清单'});
  for(let i=0;i<4;i++) glyphs(8.48,1.45-i*.19,1.78,Math.PI,'□ 封存',
    {size:.10,gap:.025,color:i===0?P.brass:P.white,mode:1,lift:.012,tag:'证据清单'});
  // 证据清单 and 诉讼策略 were the only two boards on the floor carrying a prop tag that no thing
  // wore, so `pick` resolved a click on them to null and they were decoration with a label.
  info('证据清单',8.48,1.20,1.79,
    '每件证据都写明编号、来源、封存日期和保管人。',
    'Every exhibit records its number, source, sealing date and custodian.',
    '封存 means to seal for safekeeping.',[8.48,1.10],1.55);
  station('证据柜','log-evidence',6.10,1.25,-.18,
    '登记取出时间、经手人和封条编号以后再开柜。',
    'Log the time, handler and seal number before opening the evidence cabinet.',
    '证据 is evidence; 封条 is a tamper seal.',[6.95,-.18],1.55,{stage:'custody',secure:true});
  station('文件脱敏台','redact-document',8.48,1.16,-.62,
    '复制材料以前遮盖身份证号、账户和个人联系方式。',
    'Redact identity numbers, accounts and personal contact details before copying.',
    '脱敏 means to redact sensitive information.',[8.48,.39],1.70,{stage:'compliance'});
  station('合规档案','file-compliance-record',10.92,1.22,-.18,
    '把签字版本放回对应年度和项目的合规档案。',
    'Return the signed version to its compliance file by year and project.',
    '合规 means compliance.',[10.05,-.18],1.55,{stage:'filing'});
  panelLight(8.45,-.10,4.7);

  // ---------------------------------------------------------------- law library
  // THE LAW LIBRARY IS THE ONE ROOM HERE WHOSE WALLS ARE MADE OF BOOKS, SO THE CASES BELONG
  // AGAINST THE WALLS. They were not: the west run stood at x -10.43, its back face 1.22 m clear
  // of the shell wall, and that strip — 1.15 m wide and 3.8 m long — was standable, invisible as
  // a room, and sealed at both ends. It was 18 of the floor's stranded cells. The run now backs
  // onto the shell (carcass -11.84, which is the wall's own inside face) and the east run backs
  // onto the 图书室东 partition, closing a second 0.36 m slot behind it.
  // The two runs carry a tag EACH, not the room's. Sharing 法律图书室 with the reading table put
  // 176 bookcase props into one group centred in the middle of the aisle, so backing the camera
  // out through the east run left it drawn and standing between the eye and the player — the
  // furniture form of the same fault the partitions had. Each run now gets a card of its own,
  // which is what makes the split safe: `pick` needs a thing wearing the tag or the object goes
  // dead, and a bookcase is the most clickable thing in the room.
  for(const z of [-8.24,-7.35,-6.46]) {
    bookshelf(-11.65,z,2.00,2.45,Math.PI/2,'法规汇编');
    bookshelf(-5.66,z,2.00,2.45,-Math.PI/2,'判例评注');
  }
  info('法规汇编',-11.40,1.45,-7.35,
    '这一排按部门法分类，放法律、行政法规和司法解释的汇编。',
    'This run is arranged by branch of law: statutes, regulations and judicial interpretations.',
    '汇编 means a compiled collection.',[-10.60,-7.35],1.60);
  info('判例评注',-5.91,1.45,-7.35,
    '这一排放指导性案例和判决评注，按年份排列。',
    'This run holds guiding cases and judgment commentary, ordered by year.',
    '判例 is a precedent; 评注 is commentary.',[-6.70,-7.35],1.60);
  // Brass library rail and rolling ladder introduce a distinctive vertical silhouette.
  capsule(-5.99,2.33,-7.35,.026,1.74,.026,P.brass,{rx:Math.PI/2,gloss:.58,tag:'法律图书室'});
  for(const z of [-7.50,-7.20]) {
    capsule(-6.09,1.22,z,.035,2.12,.035,P.walnut,{rz:z<-7.35?-.035:.035,gloss:.30,tag:'法律图书室'});
    ball(-6.09,.16,z,.075,.075,.075,P.brass,{gloss:.54,tag:'法律图书室'});
  }
  for(let i=0;i<6;i++) box(-6.09,.36+i*.31,-7.35,.08,.045,.36,P.brass,
    {hard:true,round:.012,gloss:.52,tag:'法律图书室'});
  solid(-6.20,-5.98,-7.58,-7.12);
  // The reading table was 2.65 m wide in a 4.0 m aisle. Expanded by the body radius that left
  // 0.09 m of standing room each side — a 0.69 m squeeze the flood fill could not pass at all —
  // and everything south of the table, 4.7 m2 of the room, was cut off from its own door. At
  // 2.00 m, recentred on the widened aisle, both sides open to 1.75 m clear.
  box(-8.66,.73,-6.86,1.95,.10,.82,P.oak,{hard:true,mode:6,gloss:.24,tag:'法律图书室'});
  box(-8.66,.675,-6.49,1.80,.055,.045,P.brass,{hard:true,gloss:.50,tag:'法律图书室'});
  for(const x of [-9.16,-8.16]) {
    chair(x,-6.20,Math.PI,'阅览椅',P.rug);
    box(x,.80,-6.86,.48,.025,.34,P.paper,{hard:true,tag:'法律图书室'});
    cyl(x+.30,.84,-6.96,.10,.035,P.brass,{mode:7,gloss:.58,tag:'法律图书室'});
    capsule(x+.30,1.06,-6.96,.018,.42,.018,P.brass,{rz:-.22,gloss:.56,tag:'法律图书室'});
    taper(x+.22,1.27,-6.96,.19,.11,.16,P.green,{rx:Math.PI/2,mode:7,glow:.06,tag:'法律图书室'});
  }
  solid(-9.66,-7.66,-7.33,-6.38);
  station('法律图书室','research-law-library',-8.66,1.20,-6.86,
    '按法律门类和年份查找法规汇编与判例评注。',
    'Find statute collections and case commentary by subject and year.',
    '图书室 is a library; 法规 is legislation.',[-8.66,-5.75],1.70,{stage:'research'});
  panelLight(-8.66,-6.85,4.8);

  // ---------------------------------------------------------------- case team
  for(const x of [-4.30,-1.80,.05]) {
    desk(x,-6.80,1.45,.72,0,'案件工作台',true);
    chair(x,-6.13,Math.PI,'办公椅');
  }
  // Moved from z -8.56 to -8.87. The board had no collider and hung 0.30 m out from the daylight
  // wall, so a body walked through it at chest height; at -8.87 its face is flush with the limit
  // the shell's own curtain-wall collider already imposes, and nothing can reach it.
  box(-2.15,1.56,-8.87,5.25,1.10,.10,P.white,{hard:true,tag:'案件时间线'});
  glyphs(-2.15,1.88,-8.80,0,'案件时间线',{size:.18,gap:.045,color:P.burgundy,mode:1,lift:.012,tag:'案件时间线'});
  for(let i=0;i<6;i++) {
    const x=-4.20+i*.82;
    // `rx` matters: without it these are horizontal discs on a vertical board, and the timeline
    // reads as six hairlines edge-on rather than six milestone dots.
    cyl(x,1.49,-8.78,.045,.035,i<3?P.green:P.red,{rx:Math.PI/2,mode:1,tag:'案件时间线'});
    if(i<5) box(x+.41,1.49,-8.78,.70,.025,.018,P.brass,{hard:true,mode:1,tag:'案件时间线'});
  }
  station('案件工作台','draft-legal-memo',-1.80,1.16,-6.98,
    '把研究结论整理成事实、问题、规则和建议四部分。',
    'Draft the research into facts, issue, rule and recommendation.',
    '法律意见 is legal advice; 建议 is a recommendation.',[-1.80,-6.00],1.70,{stage:'drafting'});
  info('案件时间线',-2.15,1.52,-8.79,
    '时间线把证据、会议和截止日期排在同一条线上。',
    'The timeline aligns evidence, meetings and deadlines.',
    '截止日期 is a deadline.',[-2.15,-7.62],1.55);
  panelLight(-2.15,-6.85,4.8);

  // ---------------------------------------------------------------- conference and counsel office
  // THIS ROOM COULD NOT BE ENTERED. Clear depth here is 3.64 m; the old 3.65 x 1.12 m table with
  // four chairs pulled out on each side occupied 3.61 m of it, leaving 0.03 m of standing room
  // between the door wall and the north chair backs and 0.13 m between adjacent chairs. The door
  // opened onto a three-cell dead end and the whole 18 m2 room was unreachable floor.
  //
  // Seating one long side and both ends is the layout the room can actually hold, and it turns
  // the chairs to face the 诉讼策略 board on the daylight wall, which is where they should have
  // been looking. Measured clear: 1.11 m along the north side, 0.87 m behind the table, 1.02 m at
  // each end — a real loop around the table instead of a sealed box.
  conferenceTable(3.80,-7.40,3.40,1.10,'案件会议室',
    {us:[-1.20,-.40,.40,1.20],off:1.05,sides:'north'});
  box(3.80,1.62,-8.87,4.10,1.22,.11,P.white,{hard:true,tag:'诉讼策略'});
  glyphs(3.80,1.91,-8.80,0,'诉讼策略',{size:.20,gap:.05,color:P.burgundy,mode:1,lift:.012,tag:'诉讼策略'});
  station('案件会议室','review-case-strategy',3.80,.84,-7.40,
    '用证据清单和时间线检查案件策略里的薄弱环节。',
    'Use the evidence list and timeline to test weak points in the case strategy.',
    '诉讼 is litigation; 策略 is strategy.',[3.80,-7.40],1.72,{stage:'strategy'});
  info('诉讼策略',3.80,1.62,-8.79,
    '策略板上写明主张、抗辩、举证责任和开庭日期。',
    'The strategy board sets out the claim, the defence, the burden of proof and the hearing date.',
    '举证责任 means the burden of proof.',[3.80,-8.40],1.55);
  panelLight(3.80,-7.40,4.5);

  desk(9.10,-6.85,2.00,.86,0,'总法律顾问办公桌',true);
  chair(9.10,-6.08,Math.PI,'办公椅',P.leather);
  chair(8.40,-7.98,0,'访客椅',P.rug);
  chair(9.80,-7.98,0,'访客椅',P.rug);
  fileCabinet(11.20,-7.30,1.45,2.12,Math.PI/2,'签字文件',P.walnut);
  // A low credenza display makes the counsel room feel occupied without narrowing its route.
  box(7.14,.47,-8.47,.62,.88,.30,P.walnutD,{hard:true,round:.035,mode:6,tag:'办公室'});
  solid(6.80,7.48,-8.65,-8.29);
  box(7.14,.94,-8.47,.52,.06,.22,P.brass,{hard:true,round:.020,gloss:.54,tag:'办公室'});
  cyl(7.14,1.19,-8.47,.14,.34,P.white,{mode:7,gloss:.22,tag:'办公室'});
  for(let i=0;i<7;i++) {
    const a=i/7*Math.PI*2;
    capsule(7.14+Math.cos(a)*.13,1.46,-8.47+Math.sin(a)*.08,.028,.34,.028,P.green,
      {rz:(i-3)*.16,gloss:.16,tag:'办公室'});
  }
  station('总法律顾问办公桌','seek-legal-approval',9.10,1.18,-7.02,
    '提交法律意见，说明关键风险和建议的处理方式。',
    'Submit the legal advice and explain the key risks and recommended response.',
    '法律顾问 is legal counsel; 风险 is risk.',[8.40,-7.98],1.75,{stage:'approval'});
  station('签字文件','collect-signed-opinion',11.14,1.22,-7.30,
    '取走已经签字的法律意见，并送回案件档案。',
    'Collect the signed legal opinion and return it to the matter file.',
    '签字 means to sign.',[10.50,-7.30],1.55,{stage:'completion'});
  panelLight(9.10,-6.85,4.2);

});

// Cast registration belongs to module load, not the lazy scene builder. `game.js` folds
// OfficeCast into the live NPC roster before a player first visits F3, so registering while the
// floor builds made every legal-department character arrive one scene too late. The identity guard
// also keeps hot reloads or a repeated script evaluation from duplicating people.
const OFFICE3_CAST_ROSTER = [
  { hz:'法务助理', name:'赵可', py:'Zhào Kě', place:'office3', temper:'brisk',
    look:{skin:'#e1ae84',hair:'#29211d',hairStyle:'ponytail',top:'#d9d6cd',pants:'#37414a',shoe:'#2b3035',tall:.98,wide:.91,faceSeed:9301},
    // -0.86 put her 0.01 m inside the case tray's collider once the body radius is applied.
    spots:[{h0:8.5,h1:18.5,at:[-8.55,-1.00],face:0,act:'work',held:null}] },
  { hz:'律师', name:'陈航', py:'Chén Háng', place:'office3', temper:'precise',
    look:{skin:'#c88f66',hair:'#211d1b',hairStyle:'short',top:'#ece7dc',pants:'#333c45',shoe:'#292e32',jacket:'#3e4b59',collar:'shirt',glasses:true,tall:1.04,wide:.97,faceSeed:9302},
    spots:[{h0:9,h1:19,at:[-4.30,-6.13],face:Math.PI,act:'sit',held:null}] },
  { hz:'总法律顾问', name:'沈宁', py:'Shěn Níng', place:'office3', temper:'steady',
    look:{skin:'#d5a47e',hair:'#403934',hairStyle:'bob',top:'#f0ebe2',pants:'#303944',shoe:'#282d31',jacket:'#5b3b46',collar:'shirt',tall:1.00,wide:.95,age:.46,faceSeed:9303},
    spots:[{h0:9,h1:18,at:[9.10,-6.06],face:Math.PI,act:'sit'}] },
];
if(typeof OfficeCast!=='undefined') for(const member of OFFICE3_CAST_ROSTER) {
  if(!OfficeCast.some(existing=>existing.place===member.place&&existing.name===member.name))
    OfficeCast.push(member);
}

Object.assign(OfficeUse.office3, {
  'register-case':{zh:'登记案件',py:'dēngjì ànjiàn',en:'register a legal matter',secs:2.8,mins:10,
    gain:{rest:-2},pose:{type:'write'}},
  'conflict-check':{zh:'检索利益冲突',py:'jiǎnsuǒ lìyì chōngtū',en:'run a conflict check',secs:3.2,mins:18,
    gain:{rest:-3},pose:{type:'type',seatY:.48}},
  'review-contract':{zh:'审阅合同',py:'shěnyuè hétong',en:'review a contract',secs:4.0,mins:35,
    gain:{rest:-7,mood:-2},pose:{type:'write'}},
  'search-legal-database':{zh:'检索法律数据库',py:'jiǎnsuǒ fǎlǜ shùjùkù',en:'search the legal database',secs:3.6,mins:25,
    gain:{rest:-5},pose:{type:'type',seatY:.48}},
  'certify-document':{zh:'给文件盖章',py:'gěi wénjiàn gàizhāng',en:'certify a document',secs:2.4,mins:5,
    gain:{rest:-1},pose:{type:'work'}},
  'conduct-mediation':{zh:'主持调解',py:'zhǔchí tiáojiě',en:'conduct a mediation',secs:4.2,mins:45,
    gain:{rest:-8,mood:-3},pose:{type:'sit',seatY:.48}},
  'log-evidence':{zh:'登记证据',py:'dēngjì zhèngjù',en:'log evidence custody',secs:3.0,mins:12,
    gain:{rest:-3},pose:{type:'check'}},
  'redact-document':{zh:'给文件脱敏',py:'gěi wénjiàn tuōmǐn',en:'redact a document',secs:3.4,mins:22,
    gain:{rest:-5},pose:{type:'work'}},
  'file-compliance-record':{zh:'归档合规记录',py:'guīdàng héguī jìlù',en:'file a compliance record',secs:2.7,mins:10,
    gain:{rest:-2},pose:{type:'check'}},
  'research-law-library':{zh:'查阅法律图书',py:'cháyuè fǎlǜ túshū',en:'research in the law library',secs:3.5,mins:25,
    gain:{rest:-4,mood:2},pose:{type:'read'}},
  'draft-legal-memo':{zh:'起草法律意见',py:'qǐcǎo fǎlǜ yìjiàn',en:'draft a legal memorandum',secs:4.0,mins:40,
    gain:{rest:-8,mood:-2},pose:{type:'type',seatY:.48}},
  'review-case-strategy':{zh:'审查案件策略',py:'shěnchá ànjiàn cèlüè',en:'review case strategy',secs:3.8,mins:35,
    gain:{rest:-6,mood:-1},pose:{type:'sit',seatY:.48}},
  'seek-legal-approval':{zh:'申请法律批准',py:'shēnqǐng fǎlǜ pīzhǔn',en:'seek legal approval',secs:3.2,mins:18,
    gain:{rest:-3},pose:{type:'sit',seatY:.48}},
  'collect-signed-opinion':{zh:'取签字意见',py:'qǔ qiānzì yìjiàn',en:'collect the signed opinion',secs:2.2,mins:4,
    gain:{rest:-1,mood:1},pose:{type:'check'}},
});
