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
      RX,RZ,H,C,col,accent,state,
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

    const interactive=(hz,x,y,z,zh,en,note,focus,reach,action,department)=>{
      const q=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
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
        A.partition(0,H,(yc,hh,dh)=>
          box((a+b)/2,yc,z,b-a,hh,wallT,color,
            {hard:true,mat:'plaster',matScale:1.65,matAmt:.16,tag,...dh}));
        box((a+b)/2,.065,z-.09,b-a,.13,.035,P.wallD,{hard:true,tag});
        solid(a,b,z-wallT*.62,z+wallT*.62);
        A.blocker(a,b,z-wallT*.62,z+wallT*.62,A.H);
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
        A.partition(0,H,(yc,hh,dh)=>
          box(x,yc,(a+b)/2,wallT,hh,b-a,color,
            {hard:true,mat:'plaster',matScale:1.65,matAmt:.16,tag,...dh}));
        box(x+.09,.065,(a+b)/2,.035,.13,b-a,P.wallD,{hard:true,tag});
        solid(x-wallT*.62,x+wallT*.62,a,b);
        A.blocker(x-wallT*.62,x+wallT*.62,a,b,A.H);
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
        box(x,.18,z,w,.36,.14,P.wallD,{hard:true,tag});
        box(x,1.71,z,w-.06,2.70,.045,P.glass,
          {hard:true,mode:1,alpha:.24,gloss:.78,tag});
        box(x,H-.10,z,w,.20,.14,P.wallD,{hard:true,tag});
        for(const px of [a,b])box(px,1.72,z,.045,3.34,.075,P.steelD,
          {hard:true,gloss:.46,tag});
        solid(a,b,z-.065,z+.065);
        A.blocker(a,b,z-.065,z+.065,A.H);
      };
      for(const [a,b] of cuts){
        pane(at,a);
        box((a+b)/2,(doorH+H)/2,z,b-a,H-doorH,.14,P.wallD,{hard:true,tag});
        at=b;
      }
      pane(at,x1);
    }
    function plateZ(x,y,z,w,h,zh,color=accent,tag=zh) {
      box(x,y,z,w,h,.055,color,{hard:true,mode:1,glow:.025,tag});
      for(const [fz,yaw] of [[z-.034,Math.PI],[z+.034,0]])
        glyphs(x,y,fz,yaw,zh,{size:Math.min(.205,(w-.24)/Math.max(2,[...zh].length)),
          gap:.034,color:P.white,mode:1,lift:.009,tag});
    }
    function ceilingPanel(x,z,tone='neutral',power=.19) {
      // Every fitting owns its tag.  Sharing one '灯' put all twelve into a single group whose
      // judged centre landed at (0.25, -2.57) — 2.78 m from the nearest fitting, on bare floor
      // between the two runs — so hiddenProp would have darkened the whole ceiling at once from a
      // point no luminaire occupies.  Per-fixture tags keep the group to a fitting and its housing.
      const tag='灯'+x.toFixed(1)+'@'+z.toFixed(1);
      box(x,H-.12,z,1.55,.055,.48,P.steelD,{hard:true,tag});
      const c=tone==='warm'?P.warm:P.white;
      luminous(box(x,H-.155,z,1.45,.025,.39,c,{hard:true,mode:1,glow:.10,tag}),.025,.19);
      light(x,H-.25,z,tone==='warm'?[1,.86,.68]:[.93,.96,1],power,4.35);
    }
    function chair(x,z,yaw=0,c=P.fabric,tag='椅子') {
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
    }
    function taskChair(x,z,yaw=0,c=P.navy,tag='座椅') {
      cyl(x,.055,z,.24,.05,P.black,{gloss:.22,tag});
      capsule(x,.27,z,.030,.40,.030,P.steelD,{gloss:.47,tag});
      box(x,.46,z,.49,.11,.48,c,{round:.08,mode:7,ry:yaw,tag});
      const bx=x-Math.sin(yaw)*.22,bz=z-Math.cos(yaw)*.22;
      box(bx,.76,bz,.47,.53,.10,c,{round:.09,mode:7,ry:yaw,tag});
      solid(x-.27,x+.27,z-.27,z+.27);
    }
    // Both displays hang on the daylight wall at z=-8.62 and are watched from the room, which is
    // to the +z side of them.  Every layer inside the bezel was offset to -z instead: the emissive
    // panel, the caption and the five bars all sat 0.05-0.07 m behind a 0.085 m black slab, so the
    // OFC-F6-W and -C renders showed two blank black rectangles.  The whiteboard three metres away
    // already used the correct convention — face on the +z side, yaw 0 — and was legible.
    function wallScreen(x,z,w,zh,tag=zh) {
      box(x,1.72,z,w,1.40,.085,P.black,{hard:true,tag});
      const p=luminous(box(x,1.72,z+.050,w-.18,1.22,.022,P.screen,
        {hard:true,mode:1,glow:.075,tag}),.02,.14);
      glyphs(x,2.02,z+.067,0,zh,{size:Math.min(.18,(w-.5)/Math.max(2,[...zh].length)),
        gap:.038,color:P.white,mode:1,lift:.008,tag});
      for(let i=0;i<5;i++) box(x-.62,1.78-i*.14,z+.070,1.18-i*.10,.030,.016,
        i===0?P.cobalt:P.blueL,{hard:true,mode:1,glow:.025,tag});
      return p;
    }
    function sofa(x,z,w=2.30,yaw=0,c=P.fabric,tag='沙发') {
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
    }
    function planter(x,z,r=.42,tag='绿植') {
      taper(x,.30,z,r,.52,r*.82,P.cream,{gloss:.15,tag});
      capsule(x,.90,z,.040,1.10,.040,P.woodD,{gloss:.16,tag});
      for(let i=0;i<9;i++) {
        const a=i*2.399,rr=.18+(i%3)*.10;
        ball(x+Math.sin(a)*rr,1.20+(i%2)*.13,z+Math.cos(a)*rr,.18,.09,.13,
          i%3?P.green:P.greenL,{mode:15,ry:a,tag});
      }
      solid(x-r*.72,x+r*.72,z-r*.72,z+r*.72);
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
    plateZ(-1.0,3.02,2.10,6.20,.48,'六楼 · 会议培训与员工生活',accent,'楼层牌');
    plateZ(-8.15,2.82,-2.17,2.65,.38,'培训室',P.cobalt,'培训室牌');
    plateZ(0,2.82,-2.17,3.10,.38,'董事会议室',P.navy,'董事会议室牌');
    plateZ(7.70,2.82,2.12,3.35,.38,'员工食堂',P.green,'员工食堂牌');
    plateZ(-6.60,2.82,2.12,2.80,.38,'安静休息区',P.fabric,'安静休息区牌');

    for(const x of [-9,-6,-2.6,.8,6.2,9.5]) ceilingPanel(x,-5.30,x>4.5?'warm':'neutral',.20);
    for(const x of [-9,-6,-2.6,.8,6.2,9.5]) ceilingPanel(x,.15,x>4.5?'warm':'neutral',.16);

    // ---------------------------------------------------------------- training room
    wallScreen(-8.15,-8.62,3.65,'今日课程','培训屏');
    // Marker board and magnetic schedule beside the display.
    box(-10.72,1.64,-8.60,1.35,1.10,.055,P.white,{hard:true,tag:'白板'});
    glyphs(-10.72,1.90,-8.56,0,'今日课程',{size:.13,gap:.03,color:P.cobalt,mode:1,lift:.008,tag:'白板'});
    for(let i=0;i<4;i++) box(-10.94,1.70-i*.17,-8.54,.65-i*.06,.025,.014,
      i===0?P.red:P.ink,{hard:true,mode:1,tag:'白板'});
    // The lectern belongs at the front of the room, facing the class.  Where it stood before —
    // (-8.15, -3.25), footprint -8.78..-7.52 x -3.72..-2.78 — it sealed the x=-8.15 doorway in the
    // glazed front from the training side while a quiet pod sealed the same doorway from the lounge
    // side, so the only door under the 培训室 sign could not be walked through in either direction.
    // It also swallowed run-training's own focus at (-7.35, -2.80), which sat inside its collider.
    box(-5.30,.82,-8.10,1.12,1.50,.72,P.wood,{hard:true,mode:6,tag:'培训室'});
    luminous(box(-5.30,1.08,-7.72,.62,.35,.025,P.screen,
      {hard:true,mode:1,glow:.07,tag:'培训室'}),.02,.11);
    for(const [gz,gyaw] of [[-7.70,0],[-8.50,Math.PI]])
      glyphs(-5.30,.69,gz,gyaw,'培训',
        {size:.16,gap:.045,color:P.white,mode:1,lift:.008,tag:'培训室'});
    solid(-5.93,-4.67,-8.57,-7.63);
    // Four columns, three rows and a 1.1 m centre aisle: enough seats for a genuine session while
    // keeping routes to both sides of the room obvious.  Each column carries its own tag: one
    // shared '培训椅' spanned 5.46 m and was judged 1.13 m from the nearest seat, out in the aisle.
    for(const z of [-4.55,-5.85,-7.15]) for(const x of [-10.70,-9.45,-6.85,-5.60]) {
      const col='列'+x.toFixed(2);
      chair(x,z,Math.PI,P.fabric,'培训椅'+col);
      // Writing surfaces sit between the trainee and the north presentation wall, never behind
      // the chair back.
      box(x,.72,z-.38,1.02,.055,.42,P.woodL,{hard:true,mode:6,tag:'培训桌'+col});
    }
    for(const x of [-10.08,-6.22]) solid(x-.68,x+.68,-7.64,-4.14);
    interactive('培训室',-5.30,1.05,-8.10,
      '在讲台签到、打开课件，然后开始今天的培训。',
      'Check in at the lectern, open the materials, and begin today\'s training.',
      '培训 is organised workplace training; 课件 is the course material or slide deck.',
      [-6.60,-8.10],1.75,'run-training','learning');
    interactive('白板',-10.72,1.62,-8.60,
      '把小组讨论的重点写在白板上。','Write the group discussion points on the whiteboard.',
      '重点 is a key point; 小组讨论 is a small-group discussion.',[-10.72,-8.20],1.55,'write-whiteboard','learning');

    // ---------------------------------------------------------------- boardroom
    const tableX=0,tableZ=-5.50;
    // The table wears the room's own tag, because start-board-meeting stands at the table.  Its
    // tag used to be worn only by the wall screen 3.1 m north, which put the group's judged point
    // 3.21 m from the nearest member.
    box(tableX,.76,tableZ,5.60,.12,1.62,P.wood,{hard:true,round:.18,mode:7,gloss:.24,tag:'董事会议室'});
    box(tableX,.70,tableZ,5.25,.07,1.30,P.woodD,{hard:true,round:.15,mode:7,tag:'董事会议室'});
    for(const x of [-2.25,2.25]) box(x,.38,tableZ,.18,.70,1.22,P.steelD,{hard:true,gloss:.50,tag:'董事会议室'});
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
    luminous(box(0,.84,tableZ,.62,.035,.38,P.screen,
      {hard:true,mode:1,glow:.06,tag:'董事会议室'}),.02,.11);
    for(const x of [-1.75,-.58,.58,1.75]) {
      capsule(x,.90,tableZ,.018,.30,.018,P.steelD,{rz:Math.PI/2,tag:'会议麦克风'});
      luminous(cyl(x+.16,.91,tableZ,.025,.014,P.red,{mode:1,glow:.035,tag:'会议麦克风'}),.01,.06);
    }
    // present-slides is the wall display, so the display carries that station's tag.  Nothing on
    // the floor wore '投影' at all, which left the action pickable only by walking into its own
    // floating label.
    const boardScreen=wallScreen(0,-8.62,4.55,'视频会议','投影');
    // Camera bar above screen and participant tiles.
    box(0,2.55,-8.54,1.10,.14,.16,P.black,{round:.05,hard:true,tag:'视频会议'});
    ball(0,2.55,-8.43,.070,.070,.025,P.glass,{mode:1,glow:.025,tag:'视频会议'});
    for(const x of [-1.45,-.48,.48,1.45]) box(x,1.60,-8.53,.78,.40,.018,
      x<0?P.blueL:P.fabricL,{hard:true,mode:1,glow:.03,tag:'视频会议'});
    onTick(t=>{boardScreen.glow=.065+(.5+.5*Math.sin(t*1.25))*.025;});
    interactive('董事会议室',0,.96,tableZ,
      '连接远程参会人，确认议程，再开始董事会议。',
      'Connect remote participants, confirm the agenda, and begin the board meeting.',
      '董事会 is the board of directors; 议程 is the meeting agenda.',
      [0,-3.72],2.0,'start-board-meeting','leadership');
    interactive('投影',0,2.12,-8.62,
      '把季度数据投到主屏幕，并切换到演示模式。',
      'Put the quarterly figures on the main display and switch to presentation mode.',
      '投影 is projection or presenting to a screen; 季度 is a quarter of the year.',
      [0,-7.72],1.55,'present-slides','leadership');

    // ---------------------------------------------------------------- staff canteen
    // The serving line is on the east wall, with staff behind it and an unobstructed queue lane
    // along x=9.4. Hot food, rice, soup and tray return make it a working canteen, not a cafe set.
    // Counter height is a real 0.98 m: the old 1.53 m monolith hid both the food and the staff
    // from the dining room. Panel joints, toe-kick and handles make the long run read as fitted
    // food-service joinery without changing its collision footprint.
    // Customer-side joinery stops at x=10.79, leaving a genuine 0.79 m staff aisle between the
    // counter and the stainless back wall.  The previous 1.65 m-deep cabinet filled that aisle,
    // so the canteen worker's whole lower body was embedded in both geometry and collision.
    box(10.43,.52,-5.35,.72,.92,5.75,P.woodD,{hard:true,mode:6,tag:'食堂'});
    box(10.15,.98,-5.35,.20,.12,5.75,P.steel,{hard:true,gloss:.55,tag:'食堂'});
    box(10.08,.16,-5.35,.08,.20,5.55,P.black,{hard:true,tag:'食堂'});
    for(const z of [-7.55,-6.45,-5.35,-4.25,-3.15]) {
      box(10.075,.55,z,.035,.64,.92,z===-5.35?P.wood:P.woodL,
        {hard:true,mode:6,gloss:.13,tag:'食堂'});
      box(10.045,.60,z,.025,.035,.28,P.steel,{hard:true,gloss:.52,tag:'食堂'});
    }
    for(const z of [-7.15,-6.05,-4.95,-3.85]) {
      box(10.08,.98,z,.74,.16,.72,P.steel,{hard:true,round:.05,mode:7,gloss:.48,tag:'热菜'});
      box(10.02,1.08,z,.57,.06,.53,z<-5.5?P.food:P.amber,{round:.06,mode:7,tag:'热菜'});
      luminous(capsule(9.98,2.28,z,.035,.85,.035,P.warm,{rz:Math.PI/2,mode:1,glow:.08,tag:'保温灯'}),.02,.12);
    }
    // Food silhouettes sit above their wells: leafy greens, a braised dish, rice and a lidded
    // soup kettle. This is the visual information a player needs before reading the label.
    for(let i=0;i<7;i++) {
      const a=i*2.399;
      ball(10.00+Math.sin(a)*.18,1.16,-7.15+Math.cos(a)*.17,.10,.050,.075,
        i%3?P.green:P.greenL,{mode:15,ry:a,tag:'热菜'});
    }
    for(let i=0;i<8;i++) ball(10.00+(i%4-.5*3)*.105,1.16,-6.05+(Math.floor(i/4)-.5)*.16,
      .075,.060,.075,i%3?P.food:P.red,{mode:7,tag:'热菜'});
    for(let i=0;i<9;i++) ball(10.00+(i%3-1)*.12,1.16,-4.95+(Math.floor(i/3)-1)*.11,
      .085,.055,.085,P.cream,{mode:7,tag:'米饭'});
    cyl(10.00,1.16,-3.85,.24,.20,P.steelD,{gloss:.46,tag:'汤'});
    cyl(10.00,1.27,-3.85,.20,.025,P.amber,{alpha:.88,gloss:.20,tag:'汤'});
    capsule(10.20,1.34,-3.85,.018,.34,.018,P.steel,{rz:Math.PI/2,tag:'汤勺'});
    // Proper sneeze guard: slim posts, glass bays and a continuous top rail. It frames every food
    // well, then leaves a clear staffed pickup bay at the north end of the line.
    for(const z of [-8.05,-7.15,-6.05,-4.95,-3.85,-2.18])
      capsule(9.76,1.48,z,.025,.96,.025,P.steelD,{gloss:.52,tag:'食堂'});
    for(const [a,b] of [[-8.05,-7.15],[-7.15,-6.05],[-6.05,-4.95],[-4.95,-3.85]])
      box(9.76,1.58,(a+b)/2,.025,.58,b-a-.06,P.glass,
        {hard:true,mode:1,alpha:.10,gloss:.76,tag:'食堂'});
    box(9.76,1.90,-5.18,.08,.065,6.14,P.steelD,{hard:true,gloss:.52,tag:'食堂'});
    // Stainless backsplash, extraction slots and compact appliances reveal the staff side that
    // the former high frontage completely concealed.
    box(11.58,1.50,-5.35,.045,1.20,5.40,P.steel,
      {hard:true,gloss:.48,tag:'食堂后厨'});
    for(let z=-7.55;z<=-3.15;z+=.48) box(11.54,1.77,z,.025,.40,.24,P.steelD,
      {hard:true,tag:'排风'});
    cyl(11.18,1.19,-4.45,.30,.37,P.steelD,{gloss:.48,tag:'电饭锅'});
    taper(11.18,1.42,-4.45,.28,.16,.06,P.steel,{gloss:.52,tag:'电饭锅'});
    box(11.18,1.20,-3.30,.56,.42,.46,P.cream,{round:.10,mode:7,hard:true,tag:'保温桶'});
    luminous(cyl(10.90,1.33,-3.07,.025,.018,P.green,
      {rx:Math.PI/2,mode:1,glow:.05,tag:'保温桶'}),.01,.06);
    // These floor-standing appliances occupy the staff aisle edge and need their own footprints;
    // the serving-counter collider stops west of them by design.
    solid(10.86,11.50,-4.78,-4.12);
    solid(10.86,11.50,-3.58,-3.02);
    for(const [x,z] of [[10.80,-7.45],[11.25,-7.45]]) {
      cyl(x,1.15,z,.16,.25,P.steelD,{gloss:.46,tag:'调料'});
      capsule(x,1.40,z,.018,.26,.018,P.steel,{tag:'调料'});
    }
    // A labelled tray rail on the customer side gives the queue an obvious beginning and flow.
    capsule(9.48,.82,-5.35,.025,5.45,.025,P.steelD,{rx:Math.PI/2,gloss:.50,tag:'食堂'});
    for(const z of [-7.70,-5.35,-3.00]) box(9.62,.77,z,.30,.10,.035,P.green,
      {hard:true,mode:1,glow:.025,tag:'食堂'});
    solid(9.72,10.84,-8.40,-2.70);
    flat(11.18,.022,-5.25,.58,5.50,P.black,
      {mode:7,gloss:.025,mat:'fabric',matScale:.42,matAmt:.12,tag:'食堂后厨通道'});
    glyphs(11.55,2.52,-5.35,-Math.PI/2,'热菜 · 主食 · 汤',{size:.135,gap:.035,color:P.white,
      mode:1,lift:.008,tag:'食堂'});
    // Tray stack at the queue start.
    for(let i=0;i<8;i++) box(9.48,.72+i*.018,-2.88,.58,.025,.40,P.steel,
      {hard:true,round:.03,mode:7,gloss:.46,tag:'餐盘'});
    interactive('食堂',10.12,1.02,-4.95,
      '先拿餐盘，再选热菜、主食和汤。','Take a tray, then choose a hot dish, a staple, and soup.',
      '食堂 is a workplace canteen; 主食 is the staple, usually rice or noodles.',
      [9.20,-4.95],1.65,'collect-lunch','staff-canteen');

    // One table setting is one fixture: the top, its legs, its plates, caddy, chopsticks and glass
    // share a tag scoped to that table.  Pooling all five settings gave '水杯' a 17.41 m span
    // judged 6.56 m from the nearest glass — the lounge tumblers and the canteen glasses were one
    // group — and left '筷子' judged 1.02 m out in an aisle.
    function diningTable(x,z,seats=4) {
      const T='餐桌'+x.toFixed(2)+'@'+z.toFixed(2),TC='餐椅'+x.toFixed(2)+'@'+z.toFixed(2);
      box(x,.75,z,1.62,.075,.78,P.woodL,{hard:true,mode:6,tag:T});
      box(x,.70,z,1.66,.055,.82,P.woodD,{hard:true,mode:6,tag:T});
      for(const sx of [-1,1]) box(x+sx*.64,.38,z,.07,.72,.62,P.steelD,{hard:true,tag:T});
      solid(x-.86,x+.86,z-.44,z+.44);
      const pts=seats===4?[[-.55,-.72,0],[.55,-.72,0],[-.55,.72,Math.PI],[.55,.72,Math.PI]]:
        [[0,-.72,0],[0,.72,Math.PI]];
      for(const [dx,dz,yaw] of pts) chair(x+dx,z+dz,yaw,seats===4?P.fabricL:P.greenL,TC);
      for(let i=0;i<3;i++) cyl(x-.35+i*.35,.81,z,.13,.018,P.white,{gloss:.20,tag:T});
      // Condiment caddy, chopsticks and a water bottle break up the bare tabletops.
      box(x,.86,z,.22,.18,.18,P.woodD,{round:.035,mode:7,hard:true,tag:T});
      for(const sx of [-.055,.055]) capsule(x+sx,1.02,z,.010,.30,.010,P.wood,
        {rz:sx<0?-.06:.06,tag:T});
      cyl(x+.58,.91,z,.065,.22,P.glass,{mode:1,alpha:.42,gloss:.38,tag:T});
      shade(x,z,2.1,2.0,.24);
    }
    diningTable(6.20,-6.80,4);
    diningTable(8.35,-6.80,2);
    diningTable(6.20,-3.90,4);
    diningTable(8.35,-3.90,2);
    diningTable(7.10,-1.05,4);
    // Dish return has two apertures, pictogram lights and a trolley behind it.
    box(10.82,.96,.78,1.55,1.70,1.10,P.steelD,{hard:true,gloss:.42,tag:'餐盘回收'});
    for(const z of [.48,1.08]) box(10.27,1.05,z,.12,.47,.43,P.black,{hard:true,tag:'餐盘回收'});
    glyphs(10.18,1.86,.78,Math.PI/2,'餐盘回收',{size:.125,gap:.03,color:P.white,mode:1,lift:.008,tag:'餐盘回收'});
    solid(10.05,11.72,.12,1.45);
    interactive('餐盘回收',10.35,1.18,.78,
      '吃完以后把餐盘、筷子和杯子分类回收。',
      'After eating, sort the tray, chopsticks, and cup at the return station.',
      '回收 is to collect for reuse or recycling; 分类 means to sort by category.',
      [9.45,.78],1.55,'return-tray','staff-canteen');

    // Coffee/tea point by the canteen entrance, accessible without entering the hot-food queue.
    box(5.18,.88,1.42,1.02,1.58,.78,P.woodD,{hard:true,mode:6,tag:'咖啡'});
    box(5.18,1.28,1.05,.70,.58,.18,P.black,{hard:true,round:.05,mode:7,tag:'咖啡'});
    luminous(box(5.18,1.42,.95,.44,.15,.020,P.cobalt,
      {hard:true,mode:1,glow:.075,tag:'咖啡'}),.02,.12);
    for(const sx of [-.20,.20]) {
      capsule(5.18+sx,1.04,.93,.018,.22,.018,P.steel,{tag:'咖啡'});
      cyl(5.18+sx,.90,.90,.075,.13,P.white,{gloss:.20,tag:'咖啡'});
    }
    box(6.02,.92,1.42,.62,.10,.70,P.woodL,{hard:true,mode:6,tag:'茶水'});
    for(let i=0;i<6;i++) cyl(5.82+(i%3)*.16,1.02,1.28+Math.floor(i/3)*.20,.055,.11,P.white,{tag:'杯子'});
    solid(4.60,6.36,.98,1.88);
    // The old focus (4.30, 1.05) stood inside the 食堂隔墙 collider and the counter's own footprint
    // at once, so brew-coffee could never be walked to.  The counter serves from the south.
    interactive('咖啡',5.18,1.32,1.18,
      '选一杯咖啡，也可以在旁边泡茶。','Choose a coffee, or make tea beside the machine.',
      '咖啡 is coffee; 泡茶 is to brew tea.',[5.30,.40],1.55,'brew-coffee','staff-canteen');

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
    // Both pods keep the single tag '安静舱' deliberately.  pick (js/build.js:439) resolves a
    // clicked prop to the thing wearing the same tag, so splitting this one would leave
    // use-quiet-pod pickable only by walking into its own floating label.  Two adjacent pods are a
    // legitimate group anyway: 2.82 m span, judged 0.65 m from the nearer pod's own centre.
    for(const x of [-11.00,-9.65]) {
      const tag='安静舱';
      box(x,.76,-1.30,1.42,1.46,1.10,P.fabric,{round:.22,mode:7,gloss:.035,tag});
      box(x,.76,-1.04,1.05,1.18,.62,P.fabricL,{round:.18,mode:7,tag});
      box(x,.46,-.94,.78,.18,.58,P.navy,{round:.12,mode:7,tag});
      luminous(box(x,1.34,-.76,.52,.12,.025,P.warm,{hard:true,mode:1,glow:.06,tag:'阅读灯'+x.toFixed(2)}),.02,.10);
      solid(x-.76,x+.76,-1.90,-.70);
    }
    planter(-11.05,1.05,.42,'绿植');
    // One sofa with its back to the daylight wall, spanning the east bay so nothing can be trapped
    // behind it, and a low table small enough to leave a walkable margin on both sides.
    sofa(-6.05,-1.35,2.40,0,P.fabric,'休息沙发');
    box(-6.05,.46,-.15,1.10,.08,.62,P.woodL,{hard:true,mode:6,tag:'休息区'});
    for(const sx of [-.36,0,.36]) cyl(-6.05+sx,.54,-.15,.08,.12,P.white,{gloss:.20,tag:'休息区'});
    solid(-6.65,-5.45,-.52,.22);
    glyphs(-8.15,2.28,-2.04,0,'午休 · 请保持安静',{size:.145,gap:.038,color:P.fabric,
      mode:1,lift:.008,tag:'安静标语'});
    interactive('休息区',-6.05,.92,-.15,
      '离开屏幕十分钟，喝水、坐下，让眼睛休息。',
      'Step away from the screen for ten minutes, drink water, and rest your eyes.',
      '休息 is to rest; 午休 is the midday break.',[-6.05,.75],1.65,'take-recovery-break','wellbeing');
    interactive('安静舱',-9.65,1.05,-1.30,
      '安静舱适合短暂闭眼，不要在里面打电话。',
      'The quiet pod is for closing your eyes briefly, not for phone calls.',
      '安静 means quiet; 短暂 means brief.',[-9.65,-.05],1.60,'use-quiet-pod','wellbeing');

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
