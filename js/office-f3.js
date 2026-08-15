// 华北创意中心 · 三楼法务部
//
// This is a complete in-house legal floor: public intake close to the shared spine, quiet case
// rooms behind a glazed threshold, a real law library, secure evidence storage and a mediation
// suite.  Stable action ids deliberately separate research, review, certification and filing —
// four activities which would otherwise all look like “use the desk” to gameplay code.

OfficeFit.register('office3', A => {
  const {
    box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
    partitionZ,partitionX,sign,doorPlate,room,B,cameraGroup,groupCamera,
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
  const stampSince=(id,start)=>groupCamera(id,B.props.slice(start));

  // A TAG DOES TWO UNRELATED JOBS HERE, WHICH IS WHY ONLY HALF OF THEM MAY BE SPLIT.
  //
  //  1. `pick` (js/build.js:439) resolves a clicked prop to the `thing` wearing the SAME tag. Every
  //     tag that a station() or info() below registers is therefore live interaction wiring: rename
  //     it and the object stops opening its card. Every established tag stays; repeated case-team
  //     desks below gain two additional per-bay tags with matching things instead of dead copies.
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
    const {tag=hz,...stationExtra}=extra;
    const th=thing(hz,x,y,z,zh,en,note,{tag,focus,reach});
    th.officeFloor=A.key;
    th.officeAction=id;
    th.officeStation={floor:A.key,id,department:'legal',...stationExtra};
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
    const mullions=new Set();
    const pane=(a,b)=>{
      if(b-a<.08)return;
      const tag=bayTag((a+b)/2);
      // Split every pane and its surface bands exactly at the midpoint. Each half owns only its
      // outer mullion, so a camera cut cannot remove a glass backing while leaving both frame
      // posts floating. The two half-volumes abut exactly and reproduce the original elevation.
      const mid=(a+b)/2;
      for(const [side,p0,p1] of [['left',a,mid],['right',mid,b]]){
        const start=B.props.length,c=(p0+p1)/2;
        A.partitionElement(1.72,3.34,(yc,hh,dh)=>
          box(c,yc,z,p1-p0,hh,.07,P.glass,
            {hard:true,mode:1,alpha:.16,gloss:.68,...tagOpt(tag),...dh}));
        const ba=side==='left'?a+.03:mid,bb=side==='left'?mid:b-.03;
        if(bb-ba>.01)A.partitionElement(1.26,.34,(yc,hh,dh)=>
          box((ba+bb)/2,yc,z-.043,bb-ba,hh,.009,P.white,
            {hard:true,mode:1,alpha:.22,gloss:.42,...tagOpt(tag),...dh}));
        const ta=side==='left'?a+.02:mid,tb=side==='left'?mid:b-.02;
        if(tb-ta>.01)box((ta+tb)/2,.13,z-.047,tb-ta,.10,.018,P.brass,
          {hard:true,mode:1,gloss:.58,...tagOpt(tag)});
        const mx=side==='left'?a:b,key=mx.toFixed(3)+':'+z.toFixed(3);
        if(!mullions.has(key)){
          mullions.add(key);
          A.partitionElement(1.72,3.36,(yc,hh,dh)=>
            box(mx,yc,z,.045,hh,.09,P.black,{hard:true,...tagOpt(tag),...dh}));
        }
        stampSince(`glass:${tag}:${a.toFixed(2)}:${b.toFixed(2)}:${side}`,start);
      }
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
      box((a+b)/2,3.22,z,b-a,.42,.09,P.walnutD,
        {hard:true,partition:true,...tagOpt(tag)});
      box((a+b)/2,.065,z,b-a-.06,.085,.14,P.brass,{hard:true,gloss:.58,...tagOpt(tag)});
      for(const x of [a+.18,b-.18]) {
        capsule(x,1.08,z-.10,.022,.34,.022,P.brass,
          {partition:true,gloss:.62,...tagOpt(tag)});
        ball(x,.91,z-.10,.035,.035,.035,P.brass,
          {partition:true,gloss:.66,...tagOpt(tag)});
      }
      at=b;
    }
    run(at,x1);
  }
  function chair(x,z,ry=0,tag='椅子',color=P.leather) {
    const taskChair=tag==='办公椅';
    // One tag per seat. No card is registered against a chair name, so the tag is doing cutaway
    // work only: it must group this chair's legs, back, arms and piping and nothing else. The old
    // shared names pooled eight '办公椅' from four different rooms into one group whose centre,
    // (-0.59, -2.88), sat in the corridor between them.
    tag=newTag(tag);
    const cameraStart=B.props.length;
    const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    const fallback=()=>{
      for(const u of [-.20,.20]) for(const v of [-.18,.18]) {
        const px=x+Math.cos(ry)*u+Math.sin(ry)*v;
        const pz=z-Math.sin(ry)*u+Math.cos(ry)*v;
        capsule(px,.23,pz,.030,.44,.030,P.walnutD,{gloss:.30,...tagOpt(tag)});
      }
      box(x,.46,z,.54,.12,.50,color,{mode:7,gloss:.04,ry,...tagOpt(tag)});
      // `ry` is the direction the sitter faces. The back therefore belongs behind that vector.
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
    };
    let rendered;
    if(taskChair) fallback();
    else {
      rendered=B.modelOr('chinese_armchair',x,0,z,.65,{ry,tag,gloss:.24},fallback);
      // The generic model proxy is a cube. Give office cutaway logic the measured chair bounds so
      // the tall back remains owned by the same per-seat camera group as its loaded mesh.
      if(Array.isArray(rendered)) for(const p of rendered) p.cameraOb={
        x:x+rx*.000486+fx*.004427,y:.515932,z:z+rz*.000486+fz*.004427,
        sx:.551379,sy:1.031864,sz:.512631,ry,
      };
    }
    stampSince(`chair:${tag}:${x}:${z}`,cameraStart);
    // A point-sized authored collider expands by the player's body radius at runtime.  It covers
    // the seat centre rigorously without turning a row of meeting chairs into an accidental wall.
    solid(x-.06,x+.06,z-.06,z+.06);
    return rendered;
  }
  function desk(x,z,w=1.65,d=.78,ry=0,tag='办公桌',monitor=true) {
    // The desk carcass is furniture; the illuminated monitor face is the control.  Keeping the
    // full tabletop, legs and stationery on the action tag made every far edge promise a usable
    // click even when the authored operator point was correctly on the chair side.
    const shellTag=tag+'桌体';
    const cameraStart=B.props.length;
    const swap=Math.abs(Math.sin(ry))>.5;
    const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
    box(x,.75,z,swap?d:w,.11,swap?w:d,P.walnut,
      {round:.055,hard:true,ry,mode:6,gloss:.28,...tagOpt(shellTag)});
    for(const s of [-1,1]) {
      const px=x+Math.cos(ry)*s*w*.39,pz=z-Math.sin(ry)*s*w*.39;
      box(px,.37,pz,.08,.72,d-.14,P.walnutD,{hard:true,ry,mode:6,...tagOpt(shellTag)});
    }
    if(monitor) {
      const sx=x-Math.sin(ry)*.22,sz=z-Math.cos(ry)*.22;
      box(sx,1.17,sz,.60,.40,.09,P.black,{hard:true,ry,gloss:.30,...tagOpt(shellTag)});
      box(sx+Math.sin(ry)*.052,1.17,sz+Math.cos(ry)*.052,.50,.30,.012,P.screen,
        {hard:true,ry,mode:1,glow:.08,...tagOpt(tag)});
      capsule(sx,.94,sz,.025,.23,.025,P.steel,{gloss:.44,...tagOpt(shellTag)});
      ball(sx+rx*.23+fx*.054,1.02,sz+rz*.23+fz*.054,.018,.018,.018,P.green,
        {glow:.16,...tagOpt(shellTag)});
    }
    const frontX=x+fx*(d*.47),frontZ=z+fz*(d*.47);
    box(frontX,.715,frontZ,swap?.06:w-.10,.055,swap?w-.10:.06,P.brass,
      {round:.015,ry,gloss:.52,...tagOpt(shellTag)});
    const padX=x+rx*.18+fx*.03,padZ=z+rz*.18+fz*.03;
    box(padX,.825,padZ,swap?.38:.60,.022,swap?.60:.38,P.leather,
      {round:.025,ry,mode:7,gloss:.04,...tagOpt(shellTag)});
    box(padX-rx*.18,.842,padZ-rz*.18,swap?.18:.30,.012,swap?.30:.18,P.paper,
      {ry,hard:true,...tagOpt(shellTag)});
    capsule(padX+rx*.17,.862,padZ+rz*.17,.013,.21,.013,P.brass,
      {rz:Math.PI/2-ry,gloss:.60,...tagOpt(shellTag)});
    stampSince(`desk:${tag}:${x}:${z}`,cameraStart);
    solid(x-(swap?.48:w/2),x+(swap?.48:w/2),z-(swap?w/2:.48),z+(swap?w/2:.48));
    shade(x,z,swap?1.05:w+.18,swap?w+.18:1.05,.20);
  }
  function apronControl(x,y,z,side,tag,shellTag,color=P.black) {
    // A recessed face with a real bezel is one-sided under the real OBB picker: the backing masks
    // rear rays and the rails mask the six sampled edge rays, while the three front samples still
    // resolve to the control. This avoids turning a whole table into a remote-control surface.
    box(x,y,z,.44,.26,.045,P.walnutD,{hard:true,mode:6,...tagOpt(shellTag)});
    const faceZ=z+side*.026;
    box(x,y,faceZ,.30,.14,.006,color,{hard:true,mode:1,glow:.035,...tagOpt(tag)});
    for(const sx of [-1,1])
      box(x+sx*.165,y,faceZ+side*.002,.05,.22,.014,P.brass,
        {hard:true,gloss:.50,...tagOpt(shellTag)});
  }
  // `seats` exists because the two meeting rooms on this floor are not the same shape. The
  // mediation room is open to the spine and 4.5 m deep, so it seats both long sides. The case
  // conference room has only 3.64 m of clear depth between the door wall and the daylight wall,
  // and a table with chairs pulled out on both sides needs about 4.8 m: the original both-sides
  // layout left 0.03 m of standing room north of the table and sealed the room off entirely — the
  // door opened onto a 0.13 m gap between two chairs. One side plus the two ends is what fits.
  function conferenceTable(x,z,w=3.5,d=1.18,tag='会议桌',seats={}) {
    // Only the compact conferencing controls are an action target.  Giving the entire 3.5 m
    // carcass the action tag promised that clicking either distant end could operate the one
    // centre anchor; room signs and furniture shells are not remote controls.
    const shellTag=tag+'桌体';
    const cameraStart=B.props.length;
    // Exact left/right halves keep every authored camera fixture under 2.8 m while preserving the
    // continuous tabletop silhouette and collision footprint.
    for(const s of [-1,1]){
      box(x+s*w/4,.75,z,w/2,.13,d,P.walnut,
        {round:.11,hard:true,mode:6,gloss:.30,...tagOpt(shellTag)});
      box(x+s*(w-.42)/4,.39,z,(w-.42)/2,.68,.20,P.walnutD,
        {hard:true,mode:6,...tagOpt(shellTag)});
      box(x+s*(w-.34)/4,.825,z,(w-.34)/2,.018,.30,P.leather,
        {round:.035,mode:7,gloss:.035,...tagOpt(shellTag)});
    }
    for(const gx of [-w*.28,w*.28]) {
      cyl(x+gx,.844,z,.085,.018,P.black,{mode:7,gloss:.18,...tagOpt(shellTag)});
      cyl(x+gx,.865,z,.050,.010,P.brass,{mode:7,gloss:.52,...tagOpt(shellTag)});
    }
    // A recessed operator panel on the chosen apron is the truthful conferencing control.
    const controlSide=seats.controlSide || -1;
    apronControl(x,.73,z+controlSide*d/2,controlSide,tag,shellTag,P.black);
    for(const gx of [-w*.34,w*.34]) {
      box(x+gx,.855,z-.20,.40,.022,.27,P.paper,{ry:gx<0?-.035:.035,hard:true,...tagOpt(shellTag)});
      capsule(x+gx+.12,.875,z-.05,.012,.18,.012,P.brass,
        {rz:Math.PI/2,gloss:.58,...tagOpt(shellTag)});
      cyl(x+gx,.91,z+.24,.060,.15,P.glass,{mode:1,alpha:.42,gloss:.58,...tagOpt(shellTag)});
    }
    const made=B.props.slice(cameraStart),left=[],right=[];
    for(const p of made)((p.ob&&p.ob.x<x)?left:right).push(p);
    groupCamera(`conference:${tag}:${x}:${z}:left`,left);
    groupCamera(`conference:${tag}:${x}:${z}:right`,right);
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
    const frameStart=B.props.length;
    box(x,h/2,z,w,h,.38,P.walnutD,
      {hard:true,ry,mode:6,gloss:.24,...tagOpt(tag)});
    box(x,h+.045,z,w+.10,.09,.46,P.brass,
      {round:.025,hard:true,ry,gloss:.52,...tagOpt(tag)});
    stampSince(`bookshelf:${tag}:${x}:${z}:frame`,frameStart);
    for(let s=0;s<5;s++) {
      const shelfStart=B.props.length;
      const yy=.24+s*.49;
      box(x,yy,z,w-.08,.055,.42,P.walnut,
        {hard:true,ry,mode:6,...tagOpt(tag)});
      box(x+fx*.215,yy+.025,z+fz*.215,w-.12,.030,.035,P.brass,
        {hard:true,ry,gloss:.48,...tagOpt(tag)});
      for(let i=0;i<8;i++) {
        const u=-w*.39+i*w*.11;
        const px=x+Math.cos(ry)*u,pz=z-Math.sin(ry)*u;
        const bh=.31+((i*7+s*3)%5)*.025;
        const spine=box(px,yy+bh/2,pz,.13,bh,.27,
          [P.bookRed,P.bookBlue,P.bookGreen][(i+s)%3],
          {hard:true,ry,gloss:.15,...tagOpt(tag)});
        // The shelf carcass is the camera occluder. Individual volumes retain their full rendered
        // and pick depth, but use a truthful shallow-spine camera proxy so a sightline through one
        // bookcase does not schedule 120 independent cuts for details hidden with their parent.
        spine.cameraOb={...spine.ob,sz:.08};
        if(i===1&&s%2===0) box(px+fx*.145,yy+bh*.66,pz+fz*.145,.105,.025,.018,P.brass,
          {hard:true,ry,gloss:.46,...tagOpt(tag)});
      }
      stampSince(`bookshelf:${tag}:${x}:${z}:shelf-${s}`,shelfStart);
    }
    solid(x-(swap?.24:w/2),x+(swap?.24:w/2),z-(swap?w/2:.24),z+(swap?w/2:.24));
  }
  function fileCabinet(x,z,w=1.4,h=2.0,ry=0,tag='证据柜',color=P.steel) {
    const swap=Math.abs(Math.sin(ry))>.5;
    const cameraStart=B.props.length;
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
    // A slim security badge occupies the cabinet's top rail, clear of the fourth drawer label.
    // Its rear face is flush with the .48 m carcass instead of projecting through the label card.
    box(x-fx*.2525,h-.03,z-fz*.2525,.34,.06,.025,P.black,
      {hard:true,ry,gloss:.18,...tagOpt(tag)});
    glyphs(x-fx*.269,h-.03,z-fz*.269,ry+Math.PI,'SECURE',
      {size:.045,gap:.010,color:P.screenL,mode:1,lift:.006,tag});
    stampSince(`file-cabinet:${tag}:${x}:${z}`,cameraStart);
    solid(x-(swap?.27:w/2),x+(swap?.27:w/2),z-(swap?w/2:.27),z+(swap?w/2:.27));
  }
  function caseTray(x,z,tag='案件登记') {
    const shellTag=tag+'柜体';
    const cameraStart=B.props.length;
    box(x,.83,z,2.55,.14,.72,P.walnut,{hard:true,mode:6,gloss:.28,...tagOpt(shellTag)});
    box(x,.755,z+.34,2.42,.055,.035,P.brass,{hard:true,gloss:.52,...tagOpt(shellTag)});
    for(const s of [-1,1]) box(x+s*1.05,.41,z,.09,.82,.58,P.walnutD,{hard:true,mode:6,...tagOpt(shellTag)});
    for(let i=0;i<3;i++) {
      const folderTag=i===1?tag:shellTag;
      box(x-.55+i*.55,.94,z-.10,.42,.10,.56,P.paper,
        {hard:true,rz:(i-1)*.018,...tagOpt(folderTag)});
      box(x-.55+i*.55,1.00,z-.34,.24,.07,.03,[P.red,P.blue,P.green][i],
        {hard:true,...tagOpt(folderTag)});
      // Folder clips are visual binding hardware, not separate registration controls. Keeping
      // their 25 mm end faces on the action tag made a side-on ray select the station from beyond
      // either end of the 2.55 m counter even though the paperwork surface itself is in range.
      for(const s of [-1,1]) box(x-.55+i*.55+s*.205,1.02,z-.10,.025,.16,.58,P.brass,
        {hard:true,gloss:.50,tag:tag+'文件夹夹具'});
    }
    capsule(x+.92,.94,z+.03,.012,.22,.012,P.brass,
      {rz:Math.PI/2,gloss:.62,...tagOpt(shellTag)});
    stampSince(`case-tray:${tag}:${x}:${z}`,cameraStart);
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
  const legalHeaderStart=B.props.length;
  // Centre the header in the uninterrupted mediation bay instead of through the x=-.35
  // cross-wall, and give its subtitle a real matching fascia.
  const legalHeaderX=1.25;
  sign(legalHeaderX,3.06,2.12,Math.PI,'三楼 · 法务部',P.burgundy,'法务部',.22);
  box(legalHeaderX,2.78,2.12,2.25,.26,.055,P.burgundy,
    {hard:true,mode:1,glow:.012,tag:'法务部'});
  glyphs(legalHeaderX,2.78,2.12,Math.PI,'LEGAL & COMPLIANCE',
    {size:.092,gap:.025,color:P.white,mode:1,lift:.035,tag:'法务部'});
  stampSince('legal-header',legalHeaderStart);

  // Intake rooms face the shared spine; the daylight band behind them is divided into a library,
  // case team, conference room and partner office. Door widths remain at least 1.22 m.
  const FRONT_SPLITS=[-5.95,-.35,5.25];
  const frontBay=x=>'玻璃墙·'+(x<-5.95?'接待':x<-.35?'审阅':x<5.25?'调解':'合规');
  glassWallZ(-2.42,-11.65,11.65,[[-8.55,1.28],[-3.25,1.28],[2.15,1.28],[8.20,1.28]],
    frontBay,FRONT_SPLITS);
  partitionX(-5.95,-2.42,0,[],P.wall,'隔墙·接待东南');
  const intakePartitionStart=B.props.length;
  partitionX(-5.95,0,2.15,[],P.wall,'隔墙·接待东北');
  const intakeCeilingLight=B.props.find(p=>p.tag==='照明'&&p.ob&&
    Math.abs(p.ob.x+6)<.02&&Math.abs(p.ob.z-1.15)<.02);
  groupCamera('intake-partition-light',B.props.slice(intakePartitionStart),intakeCeilingLight);
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

  // Threshold signs identify rooms; they do not operate equipment several metres inside them.
  // Dedicated display-only tags prevent a corridor click from selecting an action whose honest
  // standing point is beyond reach, while keeping each plate independently cutaway-safe.
  for(const [x,text,tag] of [[-8.55,'案件接待','案件接待门牌'],
    [-3.25,'合同审阅','合同审阅门牌'],[2.15,'调解室','调解室门牌'],
    [8.20,'证据与合规','证据与合规门牌']]){
    doorPlate(x,2.55,-2.37,Math.PI,text,tag,P.burgundy);
    const cg=cameraGroup(`sign:${tag}:${x.toFixed(3)}:-2.370`);
    for(const s of [-1,1])box(x+s*.43,2.90,-2.37,.035,.22,.035,P.steel,
      {hard:true,gloss:.56,tag,cameraGroup:cg});
  }
  doorPlate(-8.40,2.55,-5.05,0,'法律图书室','法律图书室门牌',P.burgundy,{twoSided:false});
  doorPlate(-2.70,2.55,-5.05,0,'案件组','案件组门牌',P.burgundy,{twoSided:false});
  doorPlate(3.80,2.55,-5.05,0,'案件会议室','案件会议室门牌',P.burgundy,{twoSided:false});
  doorPlate(9.00,2.55,-5.05,0,'总法律顾问','总法律顾问门牌',P.burgundy,{twoSided:false});

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
  const caseFlowStart=B.props.length;
  box(-7.62,1.12,1.87,2.45,2.24,.12,P.white,{hard:true,tag:'案件流程'});
  A.furnitureSolid(-7.62,1.87,2.45,.12);
  glyphs(-7.62,1.83,1.79,Math.PI,'案件流程',{size:.19,gap:.045,color:P.burgundy,mode:1,lift:.012,tag:'案件流程'});
  glyphs(-7.62,1.40,1.79,Math.PI,'登记 → 冲突检索 → 分派',
    {size:.12,gap:.03,color:P.black,mode:1,lift:.012,tag:'案件流程'});
  stampSince('case-flow-board',caseFlowStart);
  station('案件登记','register-case',-8.55,.94,-.18,
    '登记来访人的姓名、单位、问题和截止日期。',
    'Record the visitor, organisation, issue and deadline.',
    '案件 is a legal matter; 登记 means to register.',[-8.55,.72],1.65,{stage:'intake'});
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
  // The certification counter sits 23 cm farther north than the original teleport-era layout.
  // That leaves a real body-centre operator strip behind both task chairs instead of overlapping
  // their expanded collision with the counter and forcing contract work to be used from the side.
  const stampDeskStart=B.props.length;
  box(-2.90,.88,1.65,2.75,.16,.78,P.walnut,{hard:true,mode:6,gloss:.28,tag:'盖章台桌体'});
  // Red stamp, ink pad and document alignment rail.
  cyl(-3.23,1.08,1.63,.12,.18,P.red,{gloss:.30,tag:'盖章台桌体'});
  box(-2.82,.99,1.63,.34,.10,.28,P.red,{hard:true,gloss:.24,tag:'盖章台桌体'});
  box(-2.28,.98,1.63,.62,.025,.42,P.paper,{hard:true,tag:'盖章台桌体'});
  // The red verification pad sits on the operator apron. The table shell is immediately behind
  // it, so a ray from the corridor side resolves to furniture rather than a remote action.
  apronControl(-2.90,.82,1.23,-1,'盖章台','盖章台桌体',P.red);
  stampSince('certification-counter',stampDeskStart);
  solid(-4.32,-1.47,1.23,2.07);
  station('合同审阅台','review-contract',-4.30,1.16,-.53,
    '逐条审阅合同，把风险、责任和终止条件标出来。',
    'Review the contract clause by clause and mark risks, liability and termination terms.',
    '合同 is a contract; 条款 is a clause.',[-4.30,.52],1.70,{stage:'review'});
  station('法律数据库','search-legal-database',-1.47,1.16,-.53,
    '检索现行法律、司法解释和相似案例。',
    'Search current law, judicial interpretations and similar cases.',
    '法律 is law; 案例 is a precedent or case.',[-1.47,.52],1.70,{stage:'research'});
  station('盖章台','certify-document',-2.90,1.02,1.58,
    '核对批准页以后，在归档副本上盖章。',
    'After checking the approval page, stamp the archive copy.',
    '盖章 means to affix an official seal.',[-2.90,.85],1.45,{stage:'certification'});
  panelLight(-3.15,-.10,4.5);

  // ---------------------------------------------------------------- mediation room
  // Tagged 调解室, not 调解桌: 调解桌 was a tag no thing wore, so clicking the mediation table
  // itself resolved to nothing and only the door plate opened the card.
  conferenceTable(2.30,-.25,3.55,1.10,'调解室');
  flat(2.30,.027,-.25,4.55,3.35,P.rug,{mode:7,gloss:.04,tag:'调解室',nocut:true});
  const acousticWallStart=B.props.length,acousticCut=-.12;
  const acousticSouth=box(4.87,1.55,-.9575,.08,2.45,1.675,P.walnutD,
    {hard:true,mode:6,tag:'隔音墙'});
  acousticSouth.officeMountedAssembly='office3-acoustic-south';
  const acousticNorth=box(4.87,1.55,.7175,.08,2.45,1.675,P.walnutD,
    {hard:true,mode:6,tag:'隔音墙'});
  acousticNorth.officeMountedAssembly='office3-acoustic-north';
  A.officeMountedAssemblyManifest.push('office3-acoustic-south','office3-acoustic-north');
  for(const [z,id] of [[-1.38,'office3-acoustic-south'],[-.54,'office3-acoustic-south'],
    [.30,'office3-acoustic-north'],[1.14,'office3-acoustic-north']])
    box(5.045,1.55,z,.27,.065,.065,P.steel,
      {hard:true,gloss:.55,tag:'隔音墙支架',officeAssemblySupport:id});
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
  const acousticParts=B.props.slice(acousticWallStart),partZ=p=>p.ob?p.ob.z:p.m[14];
  groupCamera('mediation-acoustic:south',acousticParts.filter(p=>partZ(p)<=acousticCut));
  groupCamera('mediation-acoustic:north',acousticParts.filter(p=>partZ(p)>acousticCut));
  // Narrowed from 3.90 m: at full width the screen plus its collider would have left only a
  // 0.08 m slot on the west side and reduced the mediation room to a single approach.
  const mediationBoardStart=B.props.length;
  box(2.31,1.125,1.84,2.78,2.25,.10,P.white,{hard:true,tag:'调解原则'});
  A.furnitureSolid(2.30,1.84,2.72,.10);
  glyphs(2.33,1.92,1.77,Math.PI,'依法 · 自愿 · 保密',
    {size:.18,gap:.055,color:P.burgundy,mode:1,lift:.012,tag:'调解原则'});
  stampSince('mediation-principles-board',mediationBoardStart);
  station('调解室','conduct-mediation',2.30,.85,-.25,
    '安排双方陈述，记录共同点，并起草调解方案。',
    'Hear both sides, record common ground and draft a mediation proposal.',
    // The centre is hard tabletop. This clear midpoint between the south chairs is the truthful
    // operator face for the compact conferencing control that retains the action tag.
    '调解 is mediation; 保密 means confidentiality.',[2.30,-1.78],1.75,{stage:'mediation'});
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
  const evidenceBoardStart=B.props.length;
  for(const s of [-1,1])box(8.48+s*.9375,1.085,1.85,1.875,2.17,.11,P.burgundy,
    {hard:true,mode:7,tag:'证据清单'});
  A.furnitureSolid(8.48,1.85,3.75,.11);
  glyphs(8.48,1.72,1.78,Math.PI,'证据清单',{size:.19,gap:.05,color:P.white,mode:1,lift:.012,tag:'证据清单'});
  for(let i=0;i<4;i++) glyphs(8.48,1.45-i*.19,1.78,Math.PI,'□ 封存',
    {size:.10,gap:.025,color:P.white,mode:1,lift:.012,tag:'证据清单'});
  const evidenceLeft=[],evidenceRight=[];
  for(const p of B.props.slice(evidenceBoardStart)){
    const px=p.ob&&Number.isFinite(p.ob.x)?p.ob.x:p.m[12];
    (px<8.48?evidenceLeft:evidenceRight).push(p);
  }
  groupCamera('evidence-board:left',evidenceLeft);
  groupCamera('evidence-board:right',evidenceRight);
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
  // Three 2 m cases in a 3.45 m room overlapped their neighbours by 1.11 m after rotation,
  // duplicating sixteen opaque shelf/book faces on each wall.  These 1.04 m modules form the
  // same continuous six-bay library run, with honest 4 cm reveals and no coplanar geometry.
  for(const z of [-8.08,-7.00,-5.92]) {
    bookshelf(-11.65,z,1.04,2.45,Math.PI/2,'法规汇编');
    bookshelf(-5.66,z,1.04,2.45,-Math.PI/2,'判例评注');
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
  // The rail and rolling ladder belong to the east 判例评注 run. They are useful visual furniture,
  // not a second research control three metres from the reading-table anchor.
  capsule(-5.99,2.33,-7.35,.026,1.74,.026,P.brass,{rx:Math.PI/2,gloss:.58,tag:'判例评注'});
  for(const z of [-7.50,-7.20]) {
    capsule(-6.09,1.22,z,.035,2.12,.035,P.walnut,{rz:z<-7.35?-.035:.035,gloss:.30,tag:'判例评注'});
    ball(-6.09,.16,z,.075,.075,.075,P.brass,{gloss:.54,tag:'判例评注'});
  }
  for(let i=0;i<6;i++) box(-6.09,.36+i*.31,-7.35,.08,.045,.36,P.brass,
    {hard:true,round:.012,gloss:.52,tag:'判例评注'});
  solid(-6.20,-5.98,-7.58,-7.12);
  // The reading table was 2.65 m wide in a 4.0 m aisle. Expanded by the body radius that left
  // 0.09 m of standing room each side — a 0.69 m squeeze the flood fill could not pass at all —
  // and everything south of the table, 4.7 m2 of the room, was cut off from its own door. At
  // 2.00 m, recentred on the widened aisle, both sides open to 1.75 m clear.
  const libraryTableTag='法律图书室桌体';
  const libraryTableStart=B.props.length;
  box(-8.66,.73,-6.86,1.95,.10,.82,P.oak,{hard:true,mode:6,gloss:.24,tag:libraryTableTag});
  box(-8.66,.675,-6.49,1.80,.055,.045,P.brass,{hard:true,gloss:.50,tag:libraryTableTag});
  const libraryTableProps=B.props.slice(libraryTableStart);
  for(const x of [-9.16,-8.16]) {
    chair(x,-6.20,Math.PI,'阅览椅',P.rug);
    const detailStart=B.props.length;
    box(x,.80,-6.86,.48,.025,.34,P.paper,{hard:true,tag:libraryTableTag});
    cyl(x+.30,.84,-6.96,.10,.035,P.brass,{mode:7,gloss:.58,tag:libraryTableTag});
    capsule(x+.30,1.06,-6.96,.018,.42,.018,P.brass,{rz:-.22,gloss:.56,tag:libraryTableTag});
    taper(x+.22,1.27,-6.96,.19,.11,.16,P.green,{rx:Math.PI/2,mode:7,glow:.06,tag:libraryTableTag});
    libraryTableProps.push(...B.props.slice(detailStart));
  }
  // The catalogue pad is inset into the aisle apron. The tabletop behind it masks its rear face;
  // lamps, legs and the full two-metre work surface remain descriptive furniture.
  const libraryControlStart=B.props.length;
  apronControl(-8.66,.73,-6.45,1,'法律图书室',libraryTableTag,P.paper);
  libraryTableProps.push(...B.props.slice(libraryControlStart));
  groupCamera('library-reading-table',libraryTableProps);
  solid(-9.66,-7.66,-7.33,-6.38);
  station('法律图书室','research-law-library',-8.66,1.20,-6.86,
    '按法律门类和年份查找法规汇编与判例评注。',
    'Find statute collections and case commentary by subject and year.',
    '图书室 is a library; 法规 is legislation.',[-8.66,-5.75],1.70,{stage:'research'});
  panelLight(-8.66,-6.85,4.8);

  // ---------------------------------------------------------------- case team
  const caseTeamBays=[
    [-4.30,'案件工作台西',[-4.30,-5.70],'西'],
    // Centred in the clear aisle beyond the chair. The old -3.05 x anchor covered the west half
    // but left the middle desk's connected east operator face outside its 1.70 m use radius.
    [-1.80,'案件工作台',[-1.80,-5.70],'中'],
    [ .05,'案件工作台东',[ .05,-5.70],'东'],
  ];
  for(const [x,tag] of caseTeamBays) {
    desk(x,-6.80,1.45,.72,0,tag,true);
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
  // All three visibly tagged desks are real stations. Previously one thing at the middle bay owned
  // a 4.35 m shared tag: clicking the west desk selected it, but its single focus was 2.50 m away
  // and outside the 1.70 m action reach. Per-bay tags also stop the cutaway judging all 34 props
  // from an empty point between desks; labelGroup keeps the repeated word visually quiet.
  for(const [x,tag,focus,bay] of caseTeamBays) {
    const q=station('案件工作台','draft-legal-memo',x,1.16,-6.98,
      '把研究结论整理成事实、问题、规则和建议四部分。',
      'Draft the research into facts, issue, rule and recommendation.',
      '法律意见 is legal advice; 建议 is a recommendation.',focus,1.70,
      {stage:'drafting',bay,tag});
    q.labelGroup='案件工作台';
  }
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
    {us:[-1.20,-.40,.40,1.20],off:1.05,sides:'north',controlSide:1});
  box(3.80,1.62,-8.87,4.10,1.22,.11,P.white,{hard:true,tag:'诉讼策略'});
  glyphs(3.80,1.91,-8.80,0,'诉讼策略',{size:.20,gap:.05,color:P.burgundy,mode:1,lift:.012,tag:'诉讼策略'});
  station('案件会议室','review-case-strategy',3.80,.84,-7.40,
    '用证据清单和时间线检查案件策略里的薄弱环节。',
    'Use the evidence list and timeline to test weak points in the case strategy.',
    // Clear centre gap on the room-facing chair side; the tabletop centre is a collider.
    '诉讼 is litigation; 策略 is strategy.',[3.80,-5.72],1.72,{stage:'strategy'});
  info('诉讼策略',3.80,1.62,-8.79,
    '策略板上写明主张、抗辩、举证责任和开庭日期。',
    'The strategy board sets out the claim, the defence, the burden of proof and the hearing date.',
    '举证责任 means the burden of proof.',[3.80,-8.40],1.55);
  panelLight(3.80,-7.40,4.5);

  const counselWorkstationStart=B.props.length;
  desk(9.10,-6.85,2.00,.86,0,'总法律顾问办公桌',true);
  // Tuck all three seats under their work surfaces.  The working chair no longer shaves the only
  // doorway approach; the visitor pair leaves a body-clear route behind the seats instead of
  // sealing a small pocket against the south wall.
  chair(9.10,-6.30,Math.PI,'办公椅',P.leather);
  stampSince('counsel-workstation',counselWorkstationStart);
  chair(8.40,-7.55,0,'访客椅',P.rug);
  chair(9.80,-7.55,0,'访客椅',P.rug);
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
    '法律顾问 is legal counsel; 风险 is risk.',[9.10,-5.90],1.75,{stage:'approval'});
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
    spots:[{h0:9,h1:18,at:[9.10,-6.28],face:Math.PI,act:'sit'}] },
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
