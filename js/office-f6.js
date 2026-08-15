// 公司六楼 · 会议、培训与员工生活层
//
// This is the floor that lets the office complex operate as a workplace rather than a stack of
// desks.  Training occupies the west daylight room, the boardroom sits at the centre, the staff
// canteen has a real serving/return loop on the east, and the quiet recovery lounge is directly
// off the shared circulation spine.  No fit-out crosses z=2.20: the core's lift lobby, toilets,
// service rooms and two escape stairs remain continuous and unobstructed.

(() => {
  const KEY = 'office6';

  try {
    Glyphs.need(
      '六楼会议培训员工生活董事会议室培训室食堂咖啡休息区投影白板讲台视频会议' +
      '今日课程签到员工餐厅取餐热菜主食汤餐盘回收茶水间安静舱午休请保持安静'
    );
  } catch (_) {}

  OfficeFit.register(KEY, A => {
    const {
      box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,light,thing,luminous,onTick,room,
      groupCamera,RX,RZ,H,C,col,accent,state,
    } = A;

    const P = {
      carpet:C('#505764'), carpetD:C('#3d444f'), tile:C('#c7c3b9'), tileD:C('#a7a49c'),
      wall:C('#e4e1d9'), wallD:C('#bbb9b2'), white:C('#f6f2e9'), ink:C('#242a31'),
      black:C('#1b2025'), steel:C('#939aa0'), steelD:C('#555e66'), glass:C('#8fb4c1'),
      navy:C('#304b69'), cobalt:C('#386f9e'), blueL:C('#87b1cb'),
      wood:C('#a17b54'), woodL:C('#c4a47d'), woodD:C('#604933'),
      fabric:C('#65778b'), fabricL:C('#9cabb6'), green:C('#54765b'), greenL:C('#91af8d'),
      red:C('#a83e35'), amber:C('#d4943e'), cream:C('#eee5d3'), warm:C('#ffdda2'),
      screen:C('#18303d'), food:C('#b96f43'),
    };
    const wallT=.16, doorH=2.28;
    // Camera ownership follows a physical fixture, never its semantic tag: tags are deliberately
    // shared by repeated seats and stations for picking, while a camera cut must remove only the
    // local backing and the details physically attached to it.
    const cameraFixture=(id,build)=>{
      const at=A.B.props.length,value=build();
      groupCamera(id,A.B.props.slice(at));
      return value;
    };
    const cameraSpanFixture=(id,axis,build)=>{
      const at=A.B.props.length,value=build(),props=A.B.props.slice(at);
      const sizeKey=axis==='x'?'sx':'sz',sweepKey=axis==='x'?'cameraSweepX':'cameraSweepZ';
      for(const p of props) {
        const b=p.cameraOb||p.ob,size=b&&b[sizeKey];
        if(!b||!Number.isFinite(size)||size<=2.68) continue;
        p.cameraOb={...b,[sizeKey]:2.68};
        p[sweepKey]=Math.max(p[sweepKey]||0,(size-2.68)/2);
      }
      groupCamera(id,props);
      return value;
    };

    const interactive=(hz,x,y,z,zh,en,note,focus,reach,action,department,tag=hz)=>{
      const q=thing(hz,x,y,z,zh,en,note,{tag,focus,reach});
      q.officeFloor=KEY;
      q.officeAction=action;
      q.officeStation={floor:KEY,id:action,department};
      return q;
    };
    function wallZ(z,x0,x1,doors=[],tag='隔墙',color=P.wall) {
      const cuts=doors.slice().sort((a,b)=>a[0]-b[0]); let at=x0;
      // Split through the shared `A.partition` (js/build.js): a 0.40 m stub that stays, and the
      // upper part flagged for the owner's walls-down setting. The skirting below is never
      // flagged, so a doorway reads as a gap in the kerb. Collision is unchanged.
      const run=(a,b)=>{
        if(b-a<.08)return;
        cameraSpanFixture(`wall-z:${tag}:${a.toFixed(2)}:${b.toFixed(2)}`,'x',()=>{
          A.partition(0,H,(yc,hh,dh)=>
            box((a+b)/2,yc,z,b-a,hh,wallT,color,
              {hard:true,mat:'plaster',matScale:1.65,matAmt:.16,tag,...dh}));
          box((a+b)/2,.065,z-.09,b-a,.13,.035,P.wallD,{hard:true,tag});
        });
        solid(a,b,z-wallT*.62,z+wallT*.62);
        A.blocker(a,b,z-wallT*.62,z+wallT*.62,A.H,{pad:.08});
      };
      for(const [cx,w] of cuts){
        const l=Math.max(x0,cx-w/2),r=Math.min(x1,cx+w/2);
        run(at,l);
        // Door head panel: base is `doorH`, above the kerb, so flagged whole rather than split.
        if(r>l)box((l+r)/2,(doorH+H)/2,z,r-l,H-doorH,wallT,color,{hard:true,tag,partition:true});
        at=Math.max(at,r);
      }
      run(at,x1);
    }
    function wallX(x,z0,z1,doors=[],tag='隔墙',color=P.wall) {
      const cuts=doors.slice().sort((a,b)=>a[0]-b[0]); let at=z0;
      const run=(a,b)=>{
        if(b-a<.08)return;
        cameraSpanFixture(`wall-x:${tag}:${a.toFixed(2)}:${b.toFixed(2)}`,'z',()=>{
          A.partition(0,H,(yc,hh,dh)=>
            box(x,yc,(a+b)/2,wallT,hh,b-a,color,
              {hard:true,mat:'plaster',matScale:1.65,matAmt:.16,tag,...dh}));
          box(x+.09,.065,(a+b)/2,.035,.13,b-a,P.wallD,{hard:true,tag});
        });
        solid(x-wallT*.62,x+wallT*.62,a,b);
        A.blocker(x-wallT*.62,x+wallT*.62,a,b,A.H,{pad:.08});
      };
      for(const [cz,w] of cuts){
        const l=Math.max(z0,cz-w/2),r=Math.min(z1,cz+w/2);
        run(at,l);
        if(r>l)box(x,(doorH+H)/2,(l+r)/2,wallT,H-doorH,r-l,color,{hard:true,tag,partition:true});
        at=Math.max(at,r);
      }
      run(at,z1);
    }
    function glassWallZ(z,x0,x1,doors=[],tag='玻璃隔墙') {
      const cuts=doors.map(([c,w])=>[Math.max(x0,c-w/2),Math.min(x1,c+w/2)])
        .sort((a,b)=>a[0]-b[0]);
      let at=x0;
      const pane=(a,b)=>{
        if(b-a<.08)return;
        const w=b-a,x=(a+b)/2;
        cameraSpanFixture(`glass:${tag}:${a.toFixed(2)}:${b.toFixed(2)}`,'x',()=>{
          box(x,.18,z,w,.36,.14,P.wallD,{hard:true,tag});
          A.partitionElement(1.71,2.70,(yc,hh,dh)=>
            box(x,yc,z,w-.06,hh,.045,P.glass,
              {hard:true,mode:1,alpha:.24,gloss:.78,tag,...dh}));
          box(x,H-.10,z,w,.20,.14,P.wallD,{hard:true,tag,partition:true});
        });
        for(const px of [a,b]) {
          const post=A.partitionElement(1.72,3.34,(yc,hh,dh)=>
            box(px,yc,z,.045,hh,.075,P.steelD,{hard:true,gloss:.46,tag,...dh}));
          // This mullion is also the physical join into the east room wall; owning it with that
          // wall prevents either side of the T-junction from leaving the shared trim behind.
          if(tag==='会议区玻璃墙'&&Math.abs(px-4.55)<.001)
            groupCamera('wall-x:食堂隔墙:-4.40:-0.80',post);
          else groupCamera(`glass-post:${tag}:${px.toFixed(2)}`,post);
        }
        solid(a,b,z-.065,z+.065);
        A.blocker(a,b,z-.065,z+.065,A.H,{pad:.08});
      };
      for(const [a,b] of cuts){
        pane(at,a);
        box((a+b)/2,(doorH+H)/2,z,b-a,H-doorH,.14,P.wallD,
          {hard:true,tag,partition:true});
        at=b;
      }
      pane(at,x1);
    }
    function plateZ(x,y,z,w,h,zh,color=accent,tag=zh,faces={south:true,north:true}) {
      return cameraFixture(`plate:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,()=>{
        const focusW=Math.min(w,2.68);
        box(x,y,z,w,h,.055,color,{hard:true,mode:1,glow:.025,tag,
          cameraOb:{x,y,z,sx:focusW,sy:h,sz:.055,ry:0},cameraSweepX:(w-focusW)/2});
        for(const [fz,yaw,face] of [[z-.034,Math.PI,'south'],[z+.034,0,'north']])
          if(faces[face]!==false)
          glyphs(x,y,fz,yaw,zh,{size:Math.min(.205,(w-.24)/Math.max(2,[...zh].length)),
            gap:.034,color:P.white,mode:1,lift:.009,tag});
      });
    }
    function ceilingPanel(x,z,tone='neutral',power=.19) {
      const at=A.B.props.length;
      // Every fitting owns its tag.  Sharing one '灯' put all twelve into a single group whose
      // judged centre landed at (0.25, -2.57) — 2.78 m from the nearest fitting, on bare floor
      // between the two runs — so hiddenProp would have darkened the whole ceiling at once from a
      // point no luminaire occupies.  Per-fixture tags keep the group to a fitting and its housing.
      const tag='灯'+x.toFixed(1)+'@'+z.toFixed(1);
      box(x,H-.12,z,1.55,.055,.48,P.steelD,{hard:true,tag});
      const c=tone==='warm'?P.warm:P.white;
      luminous(box(x,H-.155,z,1.45,.025,.39,c,{hard:true,mode:1,glow:.10,tag}),.025,.19);
      light(x,H-.25,z,tone==='warm'?[1,.86,.68]:[.93,.96,1],power,4.35);
      groupCamera(`ceiling:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function chair(x,z,yaw=0,c=P.fabric,tag='椅子') {
      const at=A.B.props.length;
      // Office seating follows the shared character convention: yaw is the direction the sitter
      // faces, so the backrest belongs behind that vector.  The old plus sign visually reversed
      // every canteen chair and made chair/NPC headings disagree.
      const backX=x-Math.sin(yaw)*.22,backZ=z-Math.cos(yaw)*.22;
      box(x,.45,z,.49,.11,.49,c,{round:.08,mode:7,ry:yaw,gloss:.04,tag});
      box(backX,.75,backZ,.48,.51,.10,c,{round:.09,mode:7,ry:yaw,gloss:.04,tag});
      for(const dx of [-.18,.18]) for(const dz of [-.17,.17]) {
        const px=x+Math.cos(yaw)*dx+Math.sin(yaw)*dz;
        const pz=z-Math.sin(yaw)*dx+Math.cos(yaw)*dz;
        box(px,.22,pz,.045,.44,.045,P.steelD,{hard:true,gloss:.45,tag});
      }
      // A compact seat footprint prevents walking through the chair while retaining the generous
      // aisles between training rows and dining tables.
      solid(x-.27,x+.27,z-.27,z+.27);
      groupCamera(`chair:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function taskChair(x,z,yaw=0,c=P.navy,tag='座椅') {
      const at=A.B.props.length;
      cyl(x,.055,z,.24,.05,P.black,{gloss:.22,tag});
      capsule(x,.27,z,.030,.40,.030,P.steelD,{gloss:.47,tag});
      box(x,.46,z,.49,.11,.48,c,{round:.08,mode:7,ry:yaw,tag});
      const bx=x-Math.sin(yaw)*.22,bz=z-Math.cos(yaw)*.22;
      box(bx,.76,bz,.47,.53,.10,c,{round:.09,mode:7,ry:yaw,tag});
      solid(x-.27,x+.27,z-.27,z+.27);
      groupCamera(`task-chair:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    // Both displays hang on the daylight wall at z=-8.62 and are watched from the room, which is
    // to the +z side of them.  Every layer inside the bezel was offset to -z instead: the emissive
    // panel, the caption and the five bars all sat 0.05-0.07 m behind a 0.085 m black slab, so the
    // OFC-F6-W and -C renders showed two blank black rectangles.  The whiteboard three metres away
    // already used the correct convention — face on the +z side, yaw 0 — and was legible.
    function wallScreen(x,z,w,zh,tag=zh) {
      const at=A.B.props.length,focusW=Math.min(w,2.68),sweepX=(w-focusW)/2;
      box(x,1.72,z,w,1.40,.085,P.black,{hard:true,tag,
        cameraOb:{x,y:1.72,z,sx:focusW,sy:1.40,sz:.085,ry:0},cameraSweepX:sweepX});
      const p=luminous(box(x,1.72,z+.050,w-.18,1.22,.022,P.screen,
        {hard:true,mode:1,glow:.075,tag,
          cameraOb:{x,y:1.72,z:z+.050,sx:focusW,sy:1.22,sz:.022,ry:0},
          cameraSweepX:Math.max(0,(w-.18-focusW)/2)}),.02,.14);
      glyphs(x,2.02,z+.067,0,zh,{size:Math.min(.18,(w-.5)/Math.max(2,[...zh].length)),
        gap:.038,color:P.white,mode:1,lift:.008,tag});
      for(let i=0;i<5;i++) box(x-.62,1.78-i*.14,z+.070,1.18-i*.10,.030,.016,
        i===0?P.cobalt:P.blueL,{hard:true,mode:1,glow:.025,tag});
      groupCamera(`wall-screen:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
      return p;
    }
    function sofa(x,z,w=2.30,yaw=0,c=P.fabric,tag='沙发') {
      const at=A.B.props.length;
      box(x,.43,z,w,.28,.82,c,{round:.13,mode:7,ry:yaw,gloss:.035,tag});
      const bx=x-Math.sin(yaw)*.35,bz=z-Math.cos(yaw)*.35;
      box(bx,.77,bz,w,.65,.18,c,{round:.13,mode:7,ry:yaw,gloss:.035,tag});
      for(const s of [-1,1]) {
        const ax=x+Math.cos(yaw)*s*(w/2-.10),az=z-Math.sin(yaw)*s*(w/2-.10);
        box(ax,.56,az,.18,.32,.78,c,{round:.08,mode:7,ry:yaw,tag});
      }
      for(const s of [-1,1]) {
        const px=x+Math.cos(yaw)*s*(w/2-.28),pz=z-Math.sin(yaw)*s*(w/2-.28);
        box(px,.15,pz,.07,.30,.62,P.woodD,{hard:true,ry:yaw,tag});
      }
      shade(x,z,w+.10,1.0,.24);
      const sx=Math.abs(Math.sin(yaw))>.5?.52:w/2;
      const sz=Math.abs(Math.sin(yaw))>.5?w/2:.52;
      solid(x-sx,x+sx,z-sz,z+sz);
      groupCamera(`sofa:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function planter(x,z,r=.42,tag='绿植') {
      const at=A.B.props.length;
      taper(x,.30,z,r,.52,r*.82,P.cream,{gloss:.15,tag});
      capsule(x,.90,z,.040,1.10,.040,P.woodD,{gloss:.16,tag});
      for(let i=0;i<9;i++) {
        const a=i*2.399,rr=.18+(i%3)*.10;
        ball(x+Math.sin(a)*rr,1.20+(i%2)*.13,z+Math.cos(a)*rr,.18,.09,.13,
          i%3?P.green:P.greenL,{mode:15,ry:a,tag});
      }
      solid(x-r*.72,x+r*.72,z-r*.72,z+r*.72);
      groupCamera(`plant:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }

    // ---------------------------------------------------------------- measured floor plan
    // Floor planes opt out of the cutaway.  A 16 m slab has no meaningful single point for
    // hiddenProp to judge it by, and hiding one does not reveal a room behind it — it opens a hole
    // straight to the clear colour under the whole department.  js/hotel.js:169 does the same.
    flat(-3.75,.014,-3.32,16.35,10.95,P.carpet,
      {mode:7,gloss:.05,mat:'fabric',matScale:.48,matAmt:.20,nocut:true,tag:'会议培训'});
    flat(8.27,.014,-3.32,7.43,10.95,P.tile,
      {mode:9,gloss:.11,mat:'tile',matScale:.58,matAmt:.18,nocut:true,tag:'员工食堂地面'});
    for(let x=4.72;x<12;x+=.60) flat(x,.020,-3.32,.025,10.82,P.tileD,
      {alpha:.28,nocut:true,tag:'员工食堂地面'});
    // The route from the active passenger lift at x=-1 reaches every programme door before it
    // branches, with a cobalt line tying room signs together without narrowing the path.
    flat(-1,.021,.02,1.35,4.30,P.carpetD,{mode:7,nocut:true,tag:'通道'});
    flat(0,.024,-2.14,23.45,.11,accent,{mode:1,alpha:.58,nocut:true,tag:'通道'});

    wallX(-4.35,-RZ,2.18,[[-5.15,1.45],[-.05,1.45]],'培训区隔墙');
    wallX(4.55,-RZ,2.18,[[-5.15,1.50],[-.05,1.50]],'食堂隔墙');
    // The two formal rooms have honest glazed fronts: transparent panes and their collision runs
    // are the same measured segments, with a full-height clear doorway at each room centre.
    glassWallZ(-2.25,-RX,4.55,[[-8.15,1.50],[0,1.50]],'会议区玻璃墙');
    // The two rooms that had no north boundary at all now have one.  A canteen and a quiet
    // recovery room sharing an open edge with the circulation spine is the adjacency this floor
    // exists to resolve; both walls sit at z=1.98 so their body clearance stops at z=2.38 and the
    // protected spine keeps a wider running width than the existing partition ends already leave.
    wallZ(1.98,-11.90,-4.26,[[-6.60,1.50]],'休息区北墙');
    wallZ(1.98,4.64,11.90,[[7.70,1.70]],'食堂北墙');

    // Extents follow the built wall centrelines, not the fit-out.  The camera's idea of a room and
    // the collision that encloses it are now the same rectangle.
    room('office6-training',-11.84,-4.35,-8.84,-2.25,-8.15,-5.10);
    room('office6-boardroom',-4.35,4.55,-8.84,-2.25,0,-3.60);
    room('office6-canteen',4.55,11.84,-8.84,1.98,8.30,-2.20);
    room('office6-recovery',-11.84,-4.35,-2.25,1.98,-7.10,.60);
    room('office6-arrival',-4.35,4.55,-2.25,2.15,-.90,.10);

    // Each sign owns its own tag.  Sharing '员工食堂' with the canteen floor slab put the tile
    // plane's cutaway vote on a sign standing out in the spine; sharing '休息区' did the same to
    // the lounge carpet.
    plateZ(-1.0,3.02,2.10,6.20,.48,'六楼 · 会议培训与员工生活',accent,'楼层牌',
      {south:false});
    plateZ(-8.15,2.82,-2.17,2.65,.38,'培训室',P.cobalt,'培训室牌',{south:false});
    plateZ(0,2.82,-2.17,3.10,.38,'董事会议室',P.navy,'董事会议室牌',{south:false});
    plateZ(7.70,2.82,2.12,3.35,.38,'员工食堂',P.green,'员工食堂牌',{south:false});
    plateZ(-6.60,2.82,2.12,2.80,.38,'安静休息区',P.fabric,'安静休息区牌',
      {south:false});

    for(const x of [-9,-6,-2.6,.8,6.2,9.5]) ceilingPanel(x,-5.30,x>4.5?'warm':'neutral',.20);
    for(const x of [-9,-6,-2.6,.8,6.2,9.5]) ceilingPanel(x,.15,x>4.5?'warm':'neutral',.16);

    // ---------------------------------------------------------------- training room
    wallScreen(-8.15,-8.62,3.65,'今日课程','培训屏');
    // Marker board and magnetic schedule beside the display.
    cameraFixture('training-whiteboard',()=>{
      box(-10.72,1.64,-8.60,1.35,1.10,.055,P.white,{hard:true,tag:'白板'});
      glyphs(-10.72,1.90,-8.56,0,'今日课程',
        {size:.13,gap:.03,color:P.ink,mode:1,lift:.008,tag:'白板'});
      for(let i=0;i<4;i++) box(-10.94,1.70-i*.17,-8.54,.65-i*.06,.025,.014,
        i===0?P.red:P.ink,{hard:true,mode:1,tag:'白板'});
    });
    // The lectern belongs at the front of the room, facing the class.  Where it stood before —
    // (-8.15, -3.25), footprint -8.78..-7.52 x -3.72..-2.78 — it sealed the x=-8.15 doorway in the
    // glazed front from the training side while a quiet pod sealed the same doorway from the lounge
    // side, so the only door under the 培训室 sign could not be walked through in either direction.
    // It also swallowed run-training's own focus at (-7.35, -2.80), which sat inside its collider.
    cameraFixture('training-lectern',()=>{
      box(-5.30,.82,-8.10,1.12,1.50,.72,P.wood,{hard:true,mode:6,tag:'培训室'});
      luminous(box(-5.30,1.08,-7.72,.62,.35,.025,P.screen,
        {hard:true,mode:1,glow:.07,tag:'培训室'}),.02,.11);
      box(-5.30,.69,-7.728,.70,.28,.024,P.black,{hard:true,mode:1,tag:'培训室'});
      box(-5.30,.69,-8.472,.70,.28,.024,P.black,{hard:true,mode:1,tag:'培训室'});
      for(const [gz,gyaw] of [[-7.70,0],[-8.50,Math.PI]])
        glyphs(-5.30,.69,gz,gyaw,'培训',
          {size:.16,gap:.045,color:P.white,mode:1,lift:.008,tag:'培训室'});
    });
    solid(-5.93,-4.67,-8.57,-7.63);
    // Four columns, three rows and a 1.1 m centre aisle: enough seats for a genuine session while
    // keeping routes to both sides of the room obvious.  Each column carries its own tag: one
    // shared '培训椅' spanned 5.46 m and was judged 1.13 m from the nearest seat, out in the aisle.
    // Pull the east pair 0.20 m off the inter-room doorway.  The former x=-5.60 column left only
    // a 0.72 m usable turn through the 1.45 m opening once a player's body and the row depth were
    // applied; the shifted pair preserves the generous centre aisle and gives the door a truthful
    // 0.9 m-plus approach from both rooms.
    for(const z of [-4.55,-5.85,-7.15]) for(const x of [-10.70,-9.45,-7.05,-5.80]) {
      const col='列'+x.toFixed(2);
      chair(x,z,Math.PI,P.fabric,'培训椅'+col);
      // Writing surfaces sit between the trainee and the north presentation wall, never behind
      // the chair back.
      box(x,.72,z-.38,1.02,.055,.42,P.woodL,{hard:true,mode:6,tag:'培训桌'+col});
    }
    for(const x of [-10.08,-6.42]) solid(x-.68,x+.68,-7.64,-4.14);
    interactive('培训室',-5.30,1.05,-8.10,
      '在讲台签到、打开课件，然后开始今天的培训。',
      'Check in at the lectern, open the materials, and begin today\'s training.',
      '培训 is organised workplace training; 课件 is the course material or slide deck.',
      // The lectern is deliberately freestanding and readable from its open front and east end.
      // 2.10 m covers those two genuine standing faces; 1.75 m left the visible screen and east
      // control edge 0.16–0.26 m outside the action even with the player beside the lectern.
      [-6.60,-8.10],2.10,'run-training','learning');
    interactive('白板',-10.72,1.62,-8.60,
      '把小组讨论的重点写在白板上。','Write the group discussion points on the whiteboard.',
      '重点 is a key point; 小组讨论 is a small-group discussion.',[-10.72,-8.20],1.55,'write-whiteboard','learning');

    // ---------------------------------------------------------------- boardroom
    const tableX=0,tableZ=-5.50;
    // Broad table surfaces are descriptive furniture. Four local touch controls below own the
    // meeting action, so clicking one end can never resolve to an unreachable opposite-side focus.
    const boardCamera=[];
    boardCamera.push(box(tableX,.76,tableZ,5.60,.12,1.62,P.wood,
      {hard:true,round:.18,mode:7,gloss:.24,tag:'董事会议桌面',
        cameraOb:{x:tableX,y:.76,z:tableZ,sx:2.68,sy:.12,sz:1.62,ry:0},cameraSweepX:1.46}));
    boardCamera.push(box(tableX,.70,tableZ,5.25,.07,1.30,P.woodD,
      {hard:true,round:.15,mode:7,tag:'董事会议桌面',
        cameraOb:{x:tableX,y:.70,z:tableZ,sx:2.68,sy:.07,sz:1.30,ry:0},cameraSweepX:1.285}));
    // The steel trestles are structure, not controls. Giving the legs the meeting action tag
    // made a click on their north/south ends promise an interaction from opposite sides of the
    // table; the four local edge controls below are the complete, visible action surface.
    for(const x of [-2.25,2.25]) box(x,.38,tableZ,.18,.70,1.22,P.steelD,
      {hard:true,gloss:.50,tag:'董事会议桌支架'});
    solid(-2.92,2.92,tableZ-.90,tableZ+.90);
    // One '会议椅' group put every chair around a 7.14 m ring judged at the table centre, 1.50 m
    // from any of them.  A chair and its own castors are the honest group.
    for(const x of [-2.15,-.72,.72,2.15]) {
      taskChair(x,tableZ-1.32,0,P.navy,'会议椅'+x.toFixed(2)+'北');
      taskChair(x,tableZ+1.32,Math.PI,P.navy,'会议椅'+x.toFixed(2)+'南');
    }
    // The two end chairs are gone, and this is a circulation fix rather than a styling one.  With
    // them in place the clear run past the table ends was 0.13 m west and 0.23 m east, so the band
    // north of the table and the band south of it were joined only through the 培训室 doorway
    // pocket at x=-4.4 — a room that reads '#' rather than 'o' and so passes a stranded-cell test
    // while being nearly impossible to walk around.  Without them both ends open to 0.83 m and
    // 0.93 m, and eight seats on the two long sides is a full board table regardless.
    // Flush table boxes, microphones and a central conference speaker.
    boardCamera.push(luminous(box(0,.84,tableZ,.62,.035,.38,P.screen,
      {hard:true,mode:1,glow:.06,tag:'会议扬声器'}),.02,.11));
    for(const x of [-1.75,-.58,.58,1.75]) {
      const mic=[capsule(x,.90,tableZ,.018,.30,.018,P.steelD,
        {rz:Math.PI/2,tag:'会议麦克风'}),
        luminous(cyl(x+.16,.91,tableZ,.025,.014,P.red,
          {mode:1,glow:.035,tag:'会议麦克风'}),.01,.06)];
      if(Math.abs(x)<1) boardCamera.push(...mic);
      else groupCamera(`board-mic:${x.toFixed(2)}`,mic);
    }
    groupCamera('board-table-centre',boardCamera);
    // present-slides is the wall display, so the display carries that station's tag.  Nothing on
    // the floor wore '投影' at all, which left the action pickable only by walking into its own
    // floating label.
    const boardScreen=wallScreen(0,-8.62,4.55,'视频会议','投影');
    // Camera bar above screen and participant tiles.
    cameraFixture('board-camera-bar',()=>{
      box(0,2.55,-8.54,1.10,.14,.16,P.black,{round:.05,hard:true,tag:'视频会议'});
      ball(0,2.55,-8.43,.070,.070,.025,P.glass,{mode:1,glow:.025,tag:'视频会议'});
    });
    const participantTiles=[];
    for(const x of [-1.45,-.48,.48,1.45]) {
      const outer=Math.abs(x)>1;
      participantTiles.push(box(x,1.60,-8.53,.78,.40,.018,
        x<0?P.blueL:P.fabricL,{hard:true,mode:1,glow:.03,tag:'视频会议',
          ...(outer?{cameraOb:{x:Math.sign(x)*1.25,y:1.60,z:-8.53,sx:.20,sy:.40,sz:.018,ry:0},
            cameraSweepX:.59}:{})}));
    }
    groupCamera('wall-screen:投影:0.00:-8.62',participantTiles);
    onTick(t=>{boardScreen.glow=.065+(.5+.5*Math.sin(t*1.25))*.025;});
    // Four outward-facing edge controls make all four sides of the 5.60 m table honest.  Their
    // opaque housings sit just inboard of the thin action screens, so a ray from the opposite
    // aisle sees ordinary console casing rather than clicking through the whole table.  Each
    // screen has its own pick tag and open standing focus; labelGroup keeps the UI calm.
    for(const [x,z,focusX,focusZ,side,axis,inward] of [
      [-2.855,tableZ,-3.52,tableZ,'西','x',1],[2.855,tableZ,3.52,tableZ,'东','x',-1],
      [0,tableZ-.855,0,-7.41,'北','z',1],[0,tableZ+.855,0,-3.59,'南','z',-1],
    ]) {
      const controlTag='董事会议控制台'+side;
      const casingTag='董事会议控制台外壳'+side;
      const controlCamera=[];
      if(axis==='x') {
        controlCamera.push(box(x+inward*.075,.86,z,.16,.18,.38,P.black,
          {hard:true,round:.045,mode:7,tag:casingTag}));
        controlCamera.push(luminous(box(x-inward*.012,.86,z,.025,.12,.28,P.screen,
          {hard:true,round:.025,mode:1,glow:.055,tag:controlTag}),.018,.09));
      } else {
        controlCamera.push(box(x,.86,z+inward*.075,.38,.18,.16,P.black,
          {hard:true,round:.045,mode:7,tag:casingTag}));
        controlCamera.push(luminous(box(x,.86,z-inward*.012,.28,.12,.025,P.screen,
          {hard:true,round:.025,mode:1,glow:.055,tag:controlTag}),.018,.09));
      }
      groupCamera(axis==='z'?'board-table-centre':`board-control:${side}`,controlCamera);
      const boardStation=interactive('董事会议室',x,.96,z,
        '连接远程参会人，确认议程，再开始董事会议。',
        'Connect remote participants, confirm the agenda, and begin the board meeting.',
        '董事会 is the board of directors; 议程 is the meeting agenda.',
        [focusX,focusZ],1.75,'start-board-meeting','leadership',controlTag);
      boardStation.labelGroup='董事会议室';
    }
    // A 4.55 m display has two genuine presentation positions.  One centre focus left both ends
    // visibly clickable but beyond use range; the two things share the same tag/action, and the
    // picker resolves a hit to the nearer focus.
    // The east operator stands beyond the board-table end.  At x=1.30 the third-person eye sat
    // directly behind that table, so every real screen ray was intercepted and the east action
    // could never be selected even though its 2D focus was nominally reachable.
    for(const [x,fx,reach] of [[-1.15,-1.30,1.55],[1.15,3.30,1.70]])
      interactive('投影',x,2.12,-8.62,
        '把季度数据投到主屏幕，并切换到演示模式。',
        'Put the quarterly figures on the main display and switch to presentation mode.',
        '投影 is projection or presenting to a screen; 季度 is a quarter of the year.',
        [fx,-7.72],reach,'present-slides','leadership');

    // ---------------------------------------------------------------- staff canteen
    // The serving line is on the east wall, with staff behind it and an unobstructed queue lane
    // along x=9.4. Hot food, rice, soup and tray return make it a working canteen, not a cafe set.
    // Counter height is a real 0.98 m: the old 1.53 m monolith hid both the food and the staff
    // from the dining room. Panel joints, toe-kick and handles make the long run read as fitted
    // food-service joinery without changing its collision footprint.
    // Customer-side joinery stops at x=10.79, leaving a genuine 0.79 m staff aisle between the
    // counter and the stainless back wall.  The previous 1.65 m-deep cabinet filled that aisle,
    // so the canteen worker's whole lower body was embedded in both geometry and collision.
    // The full-length carcass is decorative joinery, while the three food groups below are the
    // actual use surfaces.  Treating this 5.75 m span as one station made its far serving bays
    // clickable from positions that could not reach the sole centre focus.
    cameraSpanFixture('canteen-carcass','z',()=>{
      box(10.43,.52,-5.35,.72,.92,5.75,P.woodD,{hard:true,mode:6,tag:'食堂柜体'});
      box(10.15,.98,-5.35,.20,.12,5.75,P.steel,{hard:true,gloss:.55,tag:'食堂柜体'});
      box(10.08,.16,-5.35,.08,.20,5.55,P.black,{hard:true,tag:'食堂柜体'});
    });
    for(const z of [-7.55,-6.45,-5.35,-4.25,-3.15]) {
      const panel=box(10.075,.55,z,.035,.64,.92,z===-5.35?P.wood:P.woodL,
        {hard:true,mode:6,gloss:.13,tag:'食堂柜体'});
      const handle=box(10.045,.60,z,.025,.035,.28,P.steel,
        {hard:true,gloss:.52,tag:'食堂柜体'});
      if(Math.abs(z+5.35)<=1.11) {
        panel.cameraOb={...panel.ob,sz:.20}; panel.cameraSweepZ=.36;
        groupCamera('canteen-carcass',panel,handle);
      } else groupCamera(`canteen-door:${z.toFixed(2)}`,panel,handle);
    }
    for(const z of [-7.15,-6.05,-4.95,-3.85]) {
      const tag=z<-5.5?'食堂热菜区':z<-4.4?'食堂主食区':'食堂汤品区';
      cameraFixture(`serving-well:${z.toFixed(2)}`,()=>{
        box(10.08,.98,z,.74,.16,.72,P.steel,{hard:true,round:.05,gloss:.48,tag});
        box(10.02,1.08,z,.57,.06,.53,z<-5.5?P.food:P.amber,{round:.06,mode:7,tag});
        luminous(capsule(9.98,2.28,z,.035,.85,.035,P.warm,
          {rz:Math.PI/2,mode:1,glow:.08,tag:'保温灯'}),.02,.12);
      });
    }
    // Food silhouettes sit above their wells: leafy greens, a braised dish, rice and a lidded
    // soup kettle. This is the visual information a player needs before reading the label.
    const hotGreens=[];
    for(let i=0;i<7;i++) {
      const a=i*2.399;
      hotGreens.push(ball(10.00+Math.sin(a)*.18,1.16,-7.15+Math.cos(a)*.17,.10,.050,.075,
        i%3?P.green:P.greenL,{mode:15,ry:a,tag:'食堂热菜区'}));
    }
    groupCamera('serving-well:-7.15',hotGreens);
    const hotDish=[];
    for(let i=0;i<8;i++) hotDish.push(ball(10.00+(i%4-.5*3)*.105,1.16,-6.05+(Math.floor(i/4)-.5)*.16,
      .075,.060,.075,i%3?P.food:P.red,{mode:7,tag:'食堂热菜区'}));
    groupCamera('serving-well:-6.05',hotDish);
    const staple=[];
    for(let i=0;i<9;i++) staple.push(ball(10.00+(i%3-1)*.12,1.16,-4.95+(Math.floor(i/3)-1)*.11,
      .085,.055,.085,P.cream,{mode:7,tag:'食堂主食区'}));
    groupCamera('serving-well:-4.95',staple);
    const soup=[cyl(10.00,1.16,-3.85,.24,.20,P.steelD,{gloss:.46,tag:'食堂汤品区'}),
      cyl(10.00,1.27,-3.85,.20,.025,P.amber,{alpha:.88,gloss:.20,tag:'食堂汤品区'}),
      capsule(10.20,1.34,-3.85,.018,.34,.018,P.steel,{rz:Math.PI/2,tag:'食堂汤品区'})];
    groupCamera('serving-well:-3.85',soup);
    // Proper sneeze guard: slim posts, glass bays and a continuous top rail. It frames every food
    // well, then leaves a clear staffed pickup bay at the north end of the line.
    const guardPosts=new Map();
    for(const z of [-8.05,-7.15,-6.05,-4.95,-3.85,-2.18])
      guardPosts.set(z,capsule(9.76,1.48,z,.025,.96,.025,P.steelD,
        {gloss:.52,tag:'食堂防护栏'}));
    const guardPanes=[];
    for(const [a,b] of [[-8.05,-7.15],[-7.15,-6.05],[-6.05,-4.95],[-4.95,-3.85]])
      guardPanes.push(box(9.76,1.58,(a+b)/2,.025,.58,b-a-.06,P.glass,
        {hard:true,mode:1,alpha:.10,gloss:.76,tag:'食堂防护栏'}));
    groupCamera('sneeze-guard-south',guardPanes.slice(0,2),guardPosts.get(-8.05),guardPosts.get(-7.15));
    groupCamera('sneeze-guard-north',guardPanes.slice(2),guardPosts.get(-6.05),
      guardPosts.get(-4.95),guardPosts.get(-3.85));
    groupCamera('sneeze-guard-pickup',guardPosts.get(-2.18));
    const guardRail=box(9.76,1.90,-5.18,.08,.065,6.14,P.steelD,
      {hard:true,gloss:.52,tag:'食堂防护栏',
        cameraOb:{x:9.76,y:1.90,z:-5.18,sx:.08,sy:.065,sz:2.68,ry:0},cameraSweepZ:1.73});
    groupCamera('sneeze-guard-north',guardRail);
    // Stainless backsplash, extraction slots and compact countertop appliances reveal the staff
    // side that the former high frontage completely concealed.  Both appliances sit on the fitted
    // counter at the two ends of the food run.  Floor-standing in the 0.79 m staff aisle, their
    // body-radius-expanded footprints overlapped the counter and the curtain wall and sealed a
    // 3.4 m-deep pocket behind the line; using the worktop for the same equipment keeps the full
    // rear service run continuous and lets the canteen worker reach every bay.
    box(11.58,1.50,-5.35,.045,1.20,5.40,P.steel,
      {hard:true,gloss:.48,tag:'食堂后厨'});
    for(let z=-7.55;z<=-3.15;z+=.48) box(11.54,1.77,z,.025,.40,.24,P.steelD,
      {hard:true,tag:'排风'});
    cameraFixture('rice-cooker',()=>{
      cyl(10.47,1.19,-7.83,.30,.37,P.steelD,{gloss:.48,tag:'电饭锅'});
      taper(10.47,1.42,-7.83,.28,.16,.06,P.steel,{gloss:.52,tag:'电饭锅'});
    });
    cameraFixture('warming-urn',()=>{
      box(10.47,1.20,-2.93,.56,.42,.46,P.cream,
        {round:.10,mode:7,hard:true,tag:'保温桶'});
      luminous(cyl(10.18,1.33,-2.70,.025,.018,P.green,
        {rx:Math.PI/2,mode:1,glow:.05,tag:'保温桶'}),.01,.06);
    });
    for(const [x,z] of [[10.80,-7.45],[11.25,-7.45]]) {
      cyl(x,1.15,z,.16,.25,P.steelD,{gloss:.46,tag:'调料'});
      capsule(x,1.40,z,.018,.26,.018,P.steel,{tag:'调料'});
    }
    // A labelled tray rail on the customer side gives the queue an obvious beginning and flow.
    const trayRail=capsule(9.48,.82,-5.35,.025,5.45,.025,P.steelD,
      {rx:Math.PI/2,gloss:.50,tag:'取餐动线',
        cameraOb:{x:9.48,y:.82,z:-5.35,sx:.05,sy:.05,sz:2.68,ry:0},cameraSweepZ:1.385});
    groupCamera('tray-rail',trayRail);
    for(const z of [-7.70,-5.35,-3.00]) {
      const marker=box(9.62,.77,z,.30,.10,.035,P.green,
        {hard:true,mode:1,glow:.025,tag:'取餐动线'});
      groupCamera(z===-3?'tray-stack':`tray-marker:${z.toFixed(2)}`,marker);
    }
    solid(9.72,10.84,-8.40,-2.70);
    flat(11.18,.022,-5.25,.58,5.50,P.black,
      {mode:7,gloss:.025,mat:'fabric',matScale:.42,matAmt:.12,tag:'食堂后厨通道'});
    box(11.58,2.52,-5.35,.045,.30,3.20,P.black,
      {hard:true,mode:1,tag:'食堂导视'});
    for(const z of [-6.75,-3.95])box(11.58,2.235,z,.045,.27,.06,P.steelD,
      {hard:true,tag:'食堂导视'});
    glyphs(11.55,2.52,-5.35,-Math.PI/2,'热菜 · 主食 · 汤',{size:.135,gap:.035,color:P.white,
      mode:1,lift:.008,tag:'食堂导视'});
    // Tray stack at the queue start.
    const trayStack=[];
    for(let i=0;i<8;i++) trayStack.push(box(9.48,.72+i*.018,-2.88,.58,.025,.40,P.steel,
      {hard:true,round:.03,gloss:.46,tag:'餐盘'}));
    groupCamera('tray-stack',trayStack);
    for(const [tag,z,focusZ] of [
      ['食堂热菜区',-6.60,-6.60],['食堂主食区',-4.95,-4.95],['食堂汤品区',-3.85,-3.85],
    ]) interactive('食堂',10.12,1.02,z,
      '先拿餐盘，再选热菜、主食和汤。','Take a tray, then choose a hot dish, a staple, and soup.',
      '食堂 is a workplace canteen; 主食 is the staple, usually rice or noodles.',
      // The staffed rear aisle is real circulation, so a visible well must work from either side
      // of the 0.72 m counter.  This measured span covers the customer rail and staff-side edge.
      // Four centimetres east keeps the focus on the clear customer strip while bringing the
      // two far staff-side garnish faces inside the same measured 2.15 m service envelope.
      [9.24,focusZ],2.15,'collect-lunch','staff-canteen',tag);

    // One table setting is one fixture: the top, its legs, its plates, caddy, chopsticks and glass
    // share a tag scoped to that table.  Pooling all five settings gave '水杯' a 17.41 m span
    // judged 6.56 m from the nearest glass — the lounge tumblers and the canteen glasses were one
    // group — and left '筷子' judged 1.02 m out in an aisle.
    function diningTable(x,z,seats=4) {
      const T='餐桌'+x.toFixed(2)+'@'+z.toFixed(2),TC='餐椅'+x.toFixed(2)+'@'+z.toFixed(2);
      const tableCamera=[];
      // Two-seat settings are genuinely two-seat tables.  Reusing the 1.62 m four-person top put
      // the east pair within one body diameter of both the adjacent four-top and serving counter;
      // the row became a nearly continuous barricade in front of the curtain wall.
      const tw=seats===4?1.62:1.00,half=tw/2+.05;
      tableCamera.push(box(x,.75,z,tw,.075,.78,P.woodL,{hard:true,mode:6,tag:T}));
      tableCamera.push(box(x,.70,z,tw+.04,.055,.82,P.woodD,{hard:true,mode:6,tag:T}));
      for(const sx of [-1,1]) tableCamera.push(box(x+sx*(tw/2-.17),.38,z,.07,.72,.62,
        P.steelD,{hard:true,tag:T}));
      solid(x-half,x+half,z-.44,z+.44);
      const pts=seats===4?[[-.55,-.72,0],[.55,-.72,0],[-.55,.72,Math.PI],[.55,.72,Math.PI]]:
        [[0,-.72,0],[0,.72,Math.PI]];
      for(const [dx,dz,yaw] of pts) chair(x+dx,z+dz,yaw,seats===4?P.fabricL:P.greenL,TC);
      const settings=seats===4?3:2;
      for(let i=0;i<settings;i++) tableCamera.push(cyl(x+(i-(settings-1)/2)*.35,.81,z,
        .13,.018,P.white,{gloss:.20,tag:T}));
      // Condiment caddy, chopsticks and a water bottle break up the bare tabletops.
      tableCamera.push(box(x,.86,z,.22,.18,.18,P.woodD,
        {round:.035,mode:7,hard:true,tag:T}));
      for(const sx of [-.055,.055]) tableCamera.push(capsule(x+sx,1.02,z,.010,.30,.010,P.wood,
        {rz:sx<0?-.06:.06,tag:T}));
      tableCamera.push(cyl(x+(seats===4?.58:.34),.91,z,.065,.22,P.glass,
        {mode:1,alpha:.42,gloss:.38,tag:T}));
      groupCamera(`dining-table:${x.toFixed(2)}:${z.toFixed(2)}`,tableCamera);
      shade(x,z,tw+.48,2.0,.24);
    }
    // Three centred four-tops make a calmer, legible dining rhythm and preserve an honest loop
    // down both sides of the room.  The former paired four-/two-top rows reached almost from the
    // west partition to the serving counter: at a 0.40 m body radius they pinched the boardroom
    // door to 0.88 m and sealed a 4.24 m strip against the south curtain wall.  Centring each row
    // at x=7.10 leaves more than a body diameter at both ends, so the window-side seats are
    // reachable without squeezing through furniture while retaining twelve proper dining places.
    diningTable(7.10,-6.35,4);
    diningTable(7.10,-3.70,4);
    diningTable(7.10,-1.05,4);
    // Dish return has two apertures, pictogram lights and a trolley behind it.
    cameraFixture('tray-return',()=>{
      box(10.82,.96,.78,1.55,1.70,1.10,P.steelD,{hard:true,gloss:.42,tag:'餐盘回收'});
      for(const z of [.48,1.08]) box(10.27,1.05,z,.12,.47,.43,P.black,
        {hard:true,tag:'餐盘回收'});
      box(10.08,1.86,.78,.10,.24,1.15,P.black,{hard:true,mode:1,tag:'餐盘回收'});
      glyphs(10.028,1.86,.78,-Math.PI/2,'餐盘回收',
        {size:.125,gap:.03,color:P.white,mode:1,lift:.008,tag:'餐盘回收'});
    });
    solid(10.05,11.72,.12,1.45);
    const trayWest=interactive('餐盘回收',10.35,1.18,.78,
      '吃完以后把餐盘、筷子和杯子分类回收。',
      'After eating, sort the tray, chopsticks, and cup at the return station.',
      '回收 is to collect for reuse or recycling; 分类 means to sort by category.',
      [9.45,.78],1.80,'return-tray','staff-canteen');
    trayWest.labelGroup='餐盘回收';
    const traySouth=interactive('餐盘回收',10.82,1.18,.34,
      '吃完以后把餐盘、筷子和杯子分类回收。',
      'After eating, sort the tray, chopsticks, and cup at the return station.',
      '回收 is to collect for reuse or recycling; 分类 means to sort by category.',
      [11.35,-.20],1.65,'return-tray','staff-canteen');
    traySouth.labelGroup='餐盘回收';

    // Coffee/tea point by the canteen entrance, accessible without entering the hot-food queue.
    cameraFixture('coffee-machine',()=>{
      box(5.18,.88,1.42,1.02,1.58,.78,P.woodD,{hard:true,mode:6,tag:'咖啡'});
      box(5.18,1.28,1.05,.70,.58,.18,P.black,{hard:true,round:.05,mode:7,tag:'咖啡'});
      luminous(box(5.18,1.42,.95,.44,.15,.020,P.cobalt,
        {hard:true,mode:1,glow:.075,tag:'咖啡'}),.02,.12);
      for(const sx of [-.20,.20]) {
        capsule(5.18+sx,1.04,.93,.018,.22,.018,P.steel,{tag:'咖啡'});
        cyl(5.18+sx,.90,.90,.075,.13,P.white,{gloss:.20,tag:'咖啡'});
      }
    });
    cameraFixture('tea-counter',()=>{
      box(6.02,.92,1.42,.62,.10,.70,P.woodL,{hard:true,mode:6,tag:'茶水'});
      for(let i=0;i<6;i++) cyl(5.82+(i%3)*.16,1.02,1.28+Math.floor(i/3)*.20,
        .055,.11,P.white,{tag:'杯子'});
    });
    solid(4.60,6.36,.98,1.88);
    // The old focus (4.30, 1.05) stood inside the 食堂隔墙 collider and the counter's own footprint
    // at once, so brew-coffee could never be walked to.  The counter serves from the south.
    const coffeeSouth=interactive('咖啡',5.18,1.32,1.18,
      '选一杯咖啡，也可以在旁边泡茶。','Choose a coffee, or make tea beside the machine.',
      '咖啡 is coffee; 泡茶 is to brew tea.',[5.30,.40],1.80,'brew-coffee','staff-canteen');
    coffeeSouth.labelGroup='咖啡';
    const coffeeEast=interactive('咖啡',5.58,1.32,1.62,
      '选一杯咖啡，也可以在旁边泡茶。','Choose a coffee, or make tea beside the machine.',
      '咖啡 is coffee; 泡茶 is to brew tea.',[6.75,1.70],1.35,'brew-coffee','staff-canteen');
    coffeeEast.labelGroup='咖啡';

    // ---------------------------------------------------------------- recovery lounge
    //
    // The lounge was measurably not a room you could use.  Three quiet pods on one line sealed
    // x -12.06..-4.54 at z -2.22..-0.42 with 0.13 m between them, and two sofas plus two planters
    // sealed the full width again at z -0.32..1.32; a flood fill from the lift reached neither the
    // sofas, the tea table nor any pod, and take-recovery-break's focus at (-8.03, 0.35) sat 1.05 m
    // inside furniture.  Nothing showed as stranded only because the same furniture made those
    // cells unstandable too.  This layout keeps one clear north-south lane on the training door's
    // axis and pushes every fixture flush to a wall or to its neighbour, so no sub-0.6 m crevice
    // is left anywhere.
    flat(-8.15,.020,.02,7.25,3.85,P.carpetD,{mode:7,gloss:.035,nocut:true,tag:'休息区地面'});
    // Two pods, banked against the west wall and each other, clear of the lane from x=-8.59 east.
    // Both pods share the single tag '安静舱' and each has a matching use focus. Build.pick resolves
    // a clicked member of the group to the nearer thing, so neither pod borrows the other's range.
    for(const x of [-11.00,-9.65]) {
      const at=A.B.props.length;
      const tag='安静舱';
      box(x,.76,-1.30,1.42,1.46,1.10,P.fabric,{round:.22,mode:7,gloss:.035,tag});
      box(x,.76,-1.04,1.05,1.18,.62,P.fabricL,{round:.18,mode:7,tag});
      box(x,.46,-.94,.78,.18,.58,P.navy,{round:.12,mode:7,tag});
      luminous(box(x,1.34,-.76,.52,.12,.025,P.warm,{hard:true,mode:1,glow:.06,tag:'阅读灯'+x.toFixed(2)}),.02,.10);
      solid(x-.76,x+.76,-1.90,-.70);
      groupCamera(`quiet-pod:${x.toFixed(2)}`,A.B.props.slice(at));
    }
    planter(-11.05,1.05,.42,'绿植');
    // One sofa with its back to the daylight wall, spanning the east bay so nothing can be trapped
    // behind it, and a low table small enough to leave a walkable margin on both sides.
    sofa(-6.05,-1.35,2.40,0,P.fabric,'休息沙发');
    cameraFixture('recovery-table',()=>{
      box(-6.05,.46,-.15,1.10,.08,.62,P.woodL,{hard:true,mode:6,tag:'休息区'});
      for(const sx of [-.36,0,.36]) cyl(-6.05+sx,.54,-.15,.08,.12,P.white,
        {gloss:.20,tag:'休息区'});
    });
    solid(-6.65,-5.45,-.52,.22);
    box(-8.15,2.38,-2.155,2.40,.24,.04,P.white,{hard:true,mode:1,tag:'安静标语'});
    glyphs(-8.15,2.38,-2.133,0,'午休 · 请保持安静',{size:.145,gap:.038,color:P.ink,
      mode:1,lift:.008,tag:'安静标语'});
    interactive('休息区',-6.05,.92,-.15,
      '离开屏幕十分钟，喝水、坐下，让眼睛休息。',
      'Step away from the screen for ten minutes, drink water, and rest your eyes.',
      '休息 is to rest; 午休 is the midday break.',[-6.05,.75],1.65,'take-recovery-break','wellbeing');
    for(const x of [-11.00,-9.65]) interactive('安静舱',x,1.05,-1.30,
      '安静舱适合短暂闭眼，不要在里面打电话。',
      'The quiet pod is for closing your eyes briefly, not for phone calls.',
      '安静 means quiet; 短暂 means brief.',[x,-.05],2.10,'use-quiet-pod','wellbeing');

    state.staffFloor={
      actions:['start-board-meeting','present-slides','run-training','write-whiteboard',
        'collect-lunch','return-tray','brew-coffee','take-recovery-break','use-quiet-pod'],
      rooms:['training','boardroom','canteen','recovery'],
      protectedSpine:{z0:2.2,z1:4.0},
    };
  });

  Object.assign(OfficeUse[KEY] || (OfficeUse[KEY]={}), {
    'start-board-meeting': {zh:'开始会议',py:'kāishǐ huìyì',en:'start the board meeting',secs:3.6,mins:55,
      gain:{mood:-2,rest:-5,food:-2},pose:{type:'sit'},done:'议程全部讨论完了。',doneTr:'Every item on the agenda has been discussed.'},
    'present-slides': {zh:'演示汇报',py:'yǎnshì huìbào',en:'present the report',secs:4.0,mins:25,
      gain:{mood:1,rest:-3},pose:{type:'work'},done:'季度数据汇报完了。',doneTr:'The quarterly figures have been presented.'},
    'run-training': {zh:'开始培训',py:'kāishǐ péixùn',en:'run the training session',secs:4.2,mins:60,
      gain:{mood:2,rest:-5},pose:{type:'work'},done:'今天的培训和签到都完成了。',doneTr:'Today\'s training and attendance are complete.'},
    'write-whiteboard': {zh:'写白板',py:'xiě báibǎn',en:'write the discussion points',secs:2.8,mins:12,
      gain:{mood:1},pose:{type:'write'},done:'讨论重点已经写在白板上。',doneTr:'The key discussion points are on the whiteboard.'},
    'collect-lunch': {zh:'取员工餐',py:'qǔ yuángōng cān',en:'collect a staff lunch',secs:2.8,mins:25,
      gain:{food:32,mood:5,rest:3},pose:{type:'reach'},done:'一份热菜、米饭和汤。',doneTr:'A hot dish, rice, and soup.'},
    'return-tray': {zh:'回收餐盘',py:'huíshōu cānpán',en:'return the tray',secs:2.0,mins:3,
      gain:{mood:1},pose:{type:'reach'},done:'餐盘、筷子和杯子都分好了。',doneTr:'Tray, chopsticks, and cup are sorted.'},
    'brew-coffee': {zh:'接杯咖啡',py:'jiē bēi kāfēi',en:'make a coffee',secs:2.5,mins:6,
      gain:{rest:10,mood:4,food:2},pose:{type:'reach'},done:'咖啡好了，先喝一口。',doneTr:'The coffee is ready. Take a first sip.'},
    'take-recovery-break': {zh:'休息十分钟',py:'xiūxi shí fēnzhōng',en:'take a ten-minute recovery break',secs:3.4,mins:10,
      gain:{rest:12,mood:8},pose:{type:'sit'},done:'眼睛和肩膀都轻松一点了。',doneTr:'Your eyes and shoulders feel a little better.'},
    'use-quiet-pod': {zh:'安静闭眼',py:'ānjìng bìyǎn',en:'rest briefly in the quiet pod',secs:3.8,mins:18,
      gain:{rest:18,mood:6},pose:{type:'sit'},done:'短暂休息以后清醒多了。',doneTr:'That short quiet rest helped a lot.'},
  });

  OfficeCast.push(
    {hz:'培训师',name:'邹敏',py:'Zōu Mǐn',place:KEY,temper:'brisk',
      look:{skin:'#d9a57d',hair:'#26201d',hairStyle:'bob',top:'#42658b',pants:'#303943',
        shoe:'#262b30',collar:'shirt',tall:.97,wide:.92,faceSeed:9601},
      // Was [-7.28, -3.62], inside the old rear podium's collider.  She now stands beside the
      // lectern at the front of the room facing the class, which sits facing north to the screen.
      spots:[{h0:8,h1:18,at:[-6.60,-8.15],face:0,act:'work',held:null}],
      lines:[['请先签到，课件已经发到会议平板。','Please sign in; the materials are on the meeting tablets.'],
             ['十分钟以后分组讨论。','We break into group discussion in ten minutes.']]},
    {hz:'会议协调员',name:'何景',py:'Hé Jǐng',place:KEY,temper:'steady',
      look:{skin:'#c58e68',hair:'#2c2723',hairStyle:'short',top:'#d8d4c8',pants:'#34404b',
        shoe:'#293036',jacket:'#3b4d60',glasses:true,tall:1.03,wide:.98,faceSeed:9602},
      spots:[{h0:8,h1:19,at:[3.35,-3.25],face:Math.PI,act:'check'}],
      lines:[['远程参会人已经连线，麦克风测试正常。','Remote participants are connected and the microphones tested.'],
             ['会议结束后我会把纪要发给大家。','I will send the minutes after the meeting.']]},
    {hz:'食堂师傅',name:'郭师傅',py:'Guō shīfu',place:KEY,temper:'genial',
      look:{skin:'#c68f68',hair:'#302923',hairStyle:'crop',top:'#e8e3d7',pants:'#3d454b',
        shoe:'#31363a',hat:'cap',hatColor:'#ece8df',uniform:'staff',tall:1.02,wide:1.08,faceSeed:9603},
      spots:[{h0:10.5,h1:19.5,at:[11.18,-2.55],face:-Math.PI/2,act:'vend'}],
      lines:[['今天有宫保鸡丁、青菜、米饭和汤。','Today we have kung pao chicken, greens, rice, and soup.'],
             ['餐盘吃完放到门口回收台。','Return your tray at the station by the entrance.']]},
    {hz:'同事',name:'叶帆',py:'Yè Fān',place:KEY,temper:'patient',seatY:.45,
      look:{skin:'#e1b087',hair:'#302720',hairStyle:'bun',top:'#7d8d98',pants:'#36414c',
        shoe:'#2b3035',bag:'tote',bagColor:'#76634d',tall:.96,wide:.93,faceSeed:9604},
      spots:[{h0:12,h1:14,at:[6.55,-.33],face:Math.PI,act:'sit'}],
      lines:[['下午还有两个会，我先安静吃饭。','I still have two meetings this afternoon, so I am eating quietly.'],
             ['咖啡机旁边也有无咖啡因的茶。','There is caffeine-free tea beside the coffee machine.']]},
    {hz:'同事',name:'钟诚',py:'Zhōng Chéng',place:KEY,temper:'weary',seatY:.45,
      look:{skin:'#b9825d',hair:'#2b2521',hairStyle:'short',top:'#536a78',pants:'#343d47',
        shoe:'#292e33',glasses:true,tall:1.05,wide:1.01,faceSeed:9605},
      // West end of the sofa rather than its middle: measured against the flood fill, the middle
      // seat is 1.27 m from the nearest cell a player can stand on and this one is 0.75 m.
      spots:[{h0:13,h1:17,at:[-6.85,-1.35],face:0,act:'sit'}],
      lines:[['我只休息十分钟，三点还要交材料。','I am only resting ten minutes; the material is due at three.'],
             ['安静舱里面不能接电话。','Phone calls are not allowed in the quiet pods.']]}
  );
})();
