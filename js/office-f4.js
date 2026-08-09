// 公司四楼 · 北京文化传媒
//
// The original office remains the player's recognisable team room and the owner of the established
// career constants.  This fit-out places that finished room inside the measured tower floor, opens
// its old lift-side wall into the shared circulation spine, and grows real project/review space
// around it.  Old saves can therefore keep `place: "office"` without losing either the desk they
// know or the new building around it.

(() => {
  const KEY = 'office';

  try {
    Glyphs.need('四楼北京文化传媒项目协作区创意评审项目墙策划桌审片台资料台今日进度待确认已完成' +
      '开放工位我的打印室复印碎纸耗材茶水间角饮水机水槽洗杯热本层同事共享安静休息长排别组站会');
  } catch (_) {}

  OfficeFit.register(KEY, A => {
    const {
      B,box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,glow,light,thing,
      partitionZ,partitionX,sign,doorPlate,room,desk,onTick,luminous,RX,RZ,H,C,col,
    } = A;

    // Building the legacy scene here is intentional. It stays lazy until somebody actually reaches
    // F4, then becomes a source module for the one active tower scene. The copy goes through this
    // floor's Build.finish pass, so its old batches and cull data cannot leak into the new room.
    const source = Office;
    const copiedProps = [];
    const oldBackZ = 3.40, oldRX = 4.40, oldRZ = 3.40, oldDoorX = 3.35;
    // The original room's south edge sat at z=3.4. In the full plate that is the protected
    // 1.8 m east-west escape spine, so the whole retained suite moves 1.35 m north. Its doorway
    // now lands at z=2.05, immediately beside — but never inside — the clear z=2.2..4.0 route.
    const LEGACY_DZ=-1.35, suiteBackZ=oldBackZ+LEGACY_DZ, suiteNorthZ=-oldRZ+LEGACY_DZ;
    // The old one-room office was entered by a teleport, so its fridge and tea counter could sit
    // directly behind the exit without ever having to admit a body.  F4 has a real 1.35 m tenant
    // threshold now.  Moving that complete service bank north keeps every familiar appliance while
    // leaving a 1.48 m-deep vestibule in which a 0.30 m-radius player can cross and turn west.
    const BREAKROOM_DZ=-1.10;

    // The two retained desk workers occupy the chair centres.  Marking those authored spots as
    // seated lets the scene give the chairs honest collision without treating the staff as having
    // spawned inside a cabinet; their face yaws already point precisely toward their monitors.
    if(typeof NPCS!=='undefined') for(const n of NPCS) if(n.place===KEY&&
        (n.name==='王经理'||n.name==='小赵')) for(const sp of n.spots||[]) sp.act='sit';

    const isOldDoor = p => {
      const o = p.ob;
      return p.tag === '门' || !!(o && o.x > oldDoorX - .72 && o.x < oldDoorX + .72 && o.z > 3.23);
    };
    const isOldBackWall = p => p.mesh === 'quad' && Math.abs(p.m[14] - oldBackZ) < .035 &&
      Math.abs(p.m[13] - source.H / 2) < .08;
    const isBreakroomProp = p => {
      const o=p.ob;
      return !!(o&&o.x>2.75&&o.z>1.30&&p.tag!=='打卡机'&&p.tag!=='门');
    };
    const isBreakroomSolid = s => s.x0>2.75&&(s.z0+s.z1)/2>1.30;
    const isBreakroomThing = th => th.hz==='咖啡'||th.hz==='冰箱'||th.hz==='微波炉';

    for (const p of source.props) {
      if (isOldDoor(p) || isOldBackWall(p)) continue;
      const dz=LEGACY_DZ+(isBreakroomProp(p)?BREAKROOM_DZ:0);
      const q = { ...p, m:M.mul(M.trans(0,0,dz),p.m) };
      if (p.ob) q.ob = { ...p.ob,z:p.ob.z+dz };
      // The retained south-row task chairs visually face north, but the old seat cushions predate
      // orientation metadata and therefore reported yaw zero.  Preserve their actual PI heading
      // so seated staff, collision and rendered-chair audits all agree.
      if(q.ob&&q.ob.y>=.40&&q.ob.y<=.52&&q.ob.sy>=.06&&q.ob.sy<=.16&&
          (Math.abs(q.ob.x+2.55)<.03||Math.abs(q.ob.x+.85)<.03)&&p.ob.z>0)
        q.ob.ry=Math.PI;
      delete q.batch; delete q.cx; delete q.cy; delete q.cz; delete q.r;
      // This room uses primitives only; recomputing the bounds makes the imported cull data belong
      // to this scene and avoids retaining the legacy scene's packed arrays.
      q.fixed = false;
      B.props.push(q); copiedProps.push(q);
      // Imported task-chair seats were built before the full tower had walk-through furniture
      // checks.  Their tiny centre colliders preserve circulation while making every retained
      // chair physical; the round meeting chairs are harmless duplicates inside their table solid.
      if(q.ob&&q.ob.y>=.40&&q.ob.y<=.52&&q.ob.sy>=.06&&q.ob.sy<=.16&&
          q.ob.sx>=.40&&q.ob.sx<=.55&&q.ob.sz>=.38&&q.ob.sz<=.52)
        solid(q.ob.x-.06,q.ob.x+.06,q.ob.z-.06,q.ob.z+.06);
    }
    for (const s of source.solids) {
      const dz=LEGACY_DZ+(isBreakroomSolid(s)?BREAKROOM_DZ:0);
      B.solids.push({ ...s,z0:s.z0+dz,z1:s.z1+dz });
    }
    for (const s of source.shadows) B.shadows.push({ ...s,m:M.mul(M.trans(0,0,LEGACY_DZ),s.m) });
    for (const g of source.glows) B.glows.push({ ...g,m:M.mul(M.trans(0,0,LEGACY_DZ),g.m) });
    for (const l of source.lights) B.lights.push({ ...l,z:l.z+LEGACY_DZ });
    // Measured, not guessed. Sliding the retained suite north moved its things and its colliders
    // by the same vector, so every focus that had been authored against the old *sealed* room came
    // over intact — but the old room had no full-height plinth under its window, no physical task
    // chairs and no expanded-radius aisle, and five of those focus points now land inside a
    // collider. Probing each one with the scene's own clampMove at r = 0.30 (four 0.1 m trial
    // steps; 4 means genuinely standable) gave 办公桌 0, 会议桌 0, 空调 0, 冰箱 0 and 窗户 1.
    //
    // 办公桌 is the one that matters: the desk this whole game is about had its approach 0.14 m
    // inside the task chair's own collider, so the player could never stand where the game sends
    // them. Each replacement below measures 4 and is the nearest honest floor to the fixture.
    const FOCUS_FIX = {
      '办公桌':[-.85,-3.85],  // open carpet 0.60 m behind the chair, south of the desk bank
      '窗户'  :[-2.20,-3.85], // the same clear strip, in front of the retained window wall
      '会议桌':[1.90,-1.35],  // north of the table, in the suite's own middle aisle
      '空调'  :[2.15,-1.30],  // the only floor with a sight line to the east-wall unit
      '冰箱'  :[2.55,.42],    // beside the microwave approach, clear of the fridge swing
    };
    for (const th of source.things) {
      if (th.hz === '门') continue;
      const dz=LEGACY_DZ+(isBreakroomThing(th)?BREAKROOM_DZ:0);
      const q={ ...th,pos:[th.pos[0],th.pos[1],th.pos[2]+dz],
        focus:[th.focus[0],th.focus[1]+dz],officeFloor:KEY };
      // The imported printer sits behind the retained meeting-table circulation. The old 1.8 m
      // prompt radius ended before the nearest connected aisle cell on the expanded floor.
      if(q.hz==='打印机')q.reach=2.75;
      if(FOCUS_FIX[q.hz])q.focus=FOCUS_FIX[q.hz].slice();
      B.things.push(q);
    }

    // The suite was formerly a sealed 8.8 x 6.8 m scene. Its south wall is rebuilt as real segments
    // around a 1.35 m doorway, and the other three visual walls gain matching collision now that the
    // player's walkable zone is the whole 24 x 18 m plate.
    // Two calls rather than one with an opening. partitionZ stamps a single tag on every segment
    // it emits, and the pair either side of a 1.35 m door measured as one 5.1 m group whose centre
    // fell 1.68 m from the nearest piece of wall — out in the room, on nothing. The cutaway judges
    // a group by exactly that point, so the east stretch never hid when the eye was east of it and
    // stood between the camera and the player. Split, each stretch is judged by itself. The head
    // over the opening is rebuilt here because the openings path is what would have drawn it.
    partitionZ(suiteBackZ,-oldRX,oldDoorX-.675,[],C('#dcd9d1'),'四层办公室西墙');
    partitionZ(suiteBackZ,oldDoorX+.675,oldRX,[],C('#dcd9d1'),'四层办公室东墙');
    box(oldDoorX,(H+2.34)/2,suiteBackZ,1.35,H-2.34,.14,C('#dcd9d1'),
      {hard:true,mode:14,gloss:.12,tag:'四层办公室门楣'});
    solid(-oldRX-.08,-oldRX+.10,suiteNorthZ,suiteBackZ);
    solid(oldRX-.10,oldRX+.08,suiteNorthZ,suiteBackZ);
    // Cover the full low north-wall plinth; its visual centre sits 10 cm in front of the old wall
    // plane and was the sole remaining substantial-furniture centre without physical coverage.
    solid(-oldRX,oldRX,suiteNorthZ-.12,suiteNorthZ+.22);
    box(oldDoorX,2.51,suiteBackZ-.07,1.62,.42,.20,col.accent,{hard:true,mode:1,glow:.025,tag:'北京文化传媒'});
    glyphs(oldDoorX,2.52,suiteBackZ-.19,0,'北京文化传媒',
      {size:.125,gap:.025,color:col.white,mode:1,glow:.04,lift:.012,tag:'北京文化传媒'});
    flat(oldDoorX,.018,suiteBackZ-.40,1.85,.78,col.floorD,{mode:7,gloss:.07,tag:'北京文化传媒'});
    room('office-team-suite',-4.28,4.28,suiteNorthZ+.12,suiteBackZ-.12,[0,LEGACY_DZ]);

    const P = {
      carpet:C('#616a73'), carpetD:C('#48525c'), wall:C('#e3e1da'), wallD:C('#b9bab6'),
      oak:C('#a9855e'), oakD:C('#654d36'), ink:C('#242a30'), steel:C('#7d858c'),
      glass:C('#93b5c2'), white:C('#f5f1e8'), blue:C('#3a6f92'), blueL:C('#7ea7bf'),
      red:C('#aa4338'), green:C('#48785d'), amber:C('#c58a38'), navy:C('#2f4354'),
      screen:C('#18313e'), screenL:C('#7dafc4'), paper:C('#eee9dd'), plant:C('#47764f'),
    };

    // A finished frame makes the open tenant threshold legible at standing eye height.  These are
    // shallow visual layers outside the measured opening; collision remains solely the partition
    // segments above, so neither the protected spine nor the clear width changes.
    for(const sx of [-1,1])
      box(oldDoorX+sx*.715,1.18,suiteBackZ-.06,.055,2.36,.13,P.ink,
        {hard:true,mode:7,gloss:.42,tag:'北京文化传媒'});
    box(oldDoorX,2.36,suiteBackZ-.06,1.48,.08,.13,P.ink,
      {hard:true,mode:7,gloss:.42,tag:'北京文化传媒'});
    box(oldDoorX-.56,1.23,suiteBackZ-.135,.10,.42,.025,P.green,
      {hard:true,mode:1,glow:.035,tag:'北京文化传媒'});

    const station = (hz,id,x,y,z,zh,en,note,focus=[x,z],reach=1.75) => {
      const q=thing(hz,x,y,z,zh,en,note,{tag:hz,focus,reach});
      q.officeFloor=KEY; q.officeAction=id;
      q.officeStation={floor:KEY,id,department:'culture-media'};
      return q;
    };
    // The cutaway hides a tag group as one object, judged by the group's own centre — so a tag
    // shared by fittings in different rooms is a group whose centre is in neither of them. This
    // took a `tag` argument because the five calls below had shipped as one 16.6 m group named
    // 灯 whose centre sat in the retained suite: backing the camera out of the team room took
    // the project room's and the review room's ceiling out with it.
    function panel(x,z,w=2.5,power=.22,tag='灯') {
      luminous(box(x,H-.17,z,w,.04,.34,P.white,{hard:true,mode:1,tag}),.07,.28);
      light(x,H-.32,z,[.92,.96,1],power,4.3);
      glow(M.trs(x,.022,z,0,w*1.35,1,2.2),P.white,.03);
    }
    function chair(x,z,ry=0) {
      const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
      cyl(x,.07,z,.24,.06,P.ink,{gloss:.27});
      capsule(x,.29,z,.035,.43,.035,P.steel,{gloss:.42});
      box(x,.47,z,.48,.09,.46,P.navy,{mode:7,ry,round:.11,gloss:.04});
      const bx=x-fx*.22,bz=z-fz*.22;
      box(bx,.77,bz,.46,.56,.08,P.navy,{mode:7,ry,gloss:.04});
      solid(x-.06,x+.06,z-.06,z+.06);
    }
    function worktable(x,z,w=2.8,d=1.05,tag='策划桌') {
      box(x,.76,z,w,.10,d,P.oak,{hard:true,round:.07,gloss:.23,tag});
      for (const sx of [-1,1]) for (const sz of [-1,1])
        box(x+sx*(w/2-.16),.38,z+sz*(d/2-.14),.08,.72,.08,P.ink,{hard:true,tag});
      solid(x-w/2,x+w/2,z-d/2,z+d/2); shade(x,z,w+.3,d+.35,.20);
    }
    function monitor(x,z,ry=0,tag='电脑') {
      box(x,1.22,z,.65,.42,.08,P.ink,{hard:true,ry,tag});
      const nx=Math.sin(ry),nz=Math.cos(ry);
      luminous(box(x+nx*.046,1.22,z+nz*.046,.55,.32,.012,P.screen,
        {hard:true,ry,mode:1,tag}),.08,.16);
      box(x,.91,z,.06,.30,.06,P.steel,{hard:true,tag});
      box(x,.77,z,.34,.035,.24,P.steel,{hard:true,tag});
    }
    function pendant(x,z,color=P.amber,tag='吊灯') {
      capsule(x,H-.48,z,.018,.72,.018,P.ink,{gloss:.34,tag});
      taper(x,H-.91,z,.34,.30,.16,color,{mode:7,gloss:.22,tag});
      luminous(ball(x,H-1.08,z,.13,.105,.13,P.white,{mode:1,glow:.08,tag}),.035,.16);
      light(x,H-1.10,z,[1,.82,.62],.13,3.25);
    }
    function softPlant(x,z,tag='绿化') {
      taper(x,.26,z,.43,.46,.36,P.oakD,{mode:7,gloss:.16,tag});
      for(let i=0;i<11;i++) {
        const a=i*2.399,r=.12+(i%4)*.045;
        ball(x+Math.sin(a)*r,.62+(i%3)*.15,z+Math.cos(a)*r,
          .25,.09,.17,i%3?P.plant:P.green,{mode:15,ry:a,rz:(i%3-1)*.26,tag});
      }
      solid(x-.25,x+.25,z-.25,z+.25);
    }
    // The project and review rooms keep solid acoustic walls, but their entrances now read as
    // finished glazed office portals instead of undecorated rectangular holes. These are shallow
    // visual layers only, so the measured doorway and escape circulation do not change.
    function dressedPortal(cx,z,color,tag) {
      for(const sx of [-1,1]) {
        box(cx+sx*.77,1.20,z-.055,.065,2.35,.12,P.ink,{mode:7,gloss:.34,tag});
        box(cx+sx*1.47,1.34,z-.065,1.18,1.72,.025,P.glass,
          {mode:1,alpha:.24,gloss:.72,tag});
        box(cx+sx*1.47,.73,z-.085,1.08,.055,.03,color,
          {mode:1,alpha:.72,glow:.015,tag});
        for(const mx of [-1,1]) box(cx+sx*1.47+mx*.55,1.34,z-.075,.035,1.78,.055,
          P.ink,{mode:7,gloss:.31,tag});
      }
      box(cx,2.37,z-.055,1.62,.10,.13,P.ink,{mode:7,gloss:.34,tag});
      flat(cx,.026,z-.30,1.68,.48,color,{mode:1,alpha:.20,gloss:.18,tag});
      // A small round occupancy beacon avoids the ubiquitous square indicator light.
      luminous(ball(cx+.58,2.37,z-.13,.055,.055,.025,P.green,
        {mode:1,glow:.10,tag}),.02,.12);
    }
    function sofa(x,z,ry=0,w=2.25,tag='沙发') {
      const swap=Math.abs(Math.sin(ry))>.5;
      box(x,.42,z,swap?.76:w,.22,swap?w:.76,P.navy,{mode:7,ry,round:.16,tag});
      box(x-Math.sin(ry)*.33,.78,z-Math.cos(ry)*.33,swap?.14:w,.72,swap?w:.14,
        P.navy,{mode:7,ry,round:.18,tag});
      solid(x-(swap?.44:w/2),x+(swap?.44:w/2),z-(swap?w/2:.44),z+(swap?w/2:.44));
    }

    // West: a project room that can hold a real planning session without consuming the escape
    // spine. East: client review and proofing. A clear 1.55 m route remains around both sides of
    // the old suite and continues north to the collaboration lounge.
    // A 39 m2 floor decal is not a prop the cutaway can reason about: `flat` never records an
    // `ob`, so it is judged by its own centre and vanishes whole the moment the eye leaves the
    // room toward it, leaving the clear colour where the floor was. Floors never occlude a body
    // from an orbiting camera, so they opt out.
    flat(-8.25,.018,-.25,6.55,5.95,P.carpet,{mode:7,gloss:.05,mat:'fabric',matScale:.48,matAmt:.18,
      nocut:true,tag:'项目室地毯'});
    partitionX(-5.05,-3.25,2.05,[[.40,1.30,2.32]],P.wall,'项目室东墙');
    partitionZ(1.98,-11.70,-5.05,[[-8.30,1.35,2.32]],P.wall,'项目室北墙');
    dressedPortal(-8.30,1.98,P.blue,'项目室门套');
    sign(-8.25,3.05,1.88,Math.PI,'项目协作区',P.blue,'项目协作区',.16);
    // A real door plate on the pier beside the opening. The floor shipped with none at all: its
    // three openings were named by room signs at 0.16 m instead, which reads at 6 m and not at
    // the threshold. 0.13 m on the jamb is the size you read with your hand on the frame.
    doorPlate(-5.62,2.05,1.84,0,'项目室','项目室门牌',P.blue);
    worktable(-8.25,-.20,3.65,1.18,'策划桌');
    for(const x of [-9.55,-8.25,-6.95]) { chair(x,-1.18,0); chair(x,.78,Math.PI); }
    for(let i=0;i<8;i++) box(-9.55+i*.38,.84,-.28,.30,.018,.46,i%3?P.paper:P.blueL,
      {hard:true,rz:(i-3.5)*.025,tag:'策划桌'});
    // Rounded meeting details break up the large tabletop and make its scale immediately legible.
    cyl(-8.25,.85,-.20,.29,.045,P.ink,{mode:7,gloss:.26,tag:'策划桌'});
    luminous(cyl(-8.25,.91,-.20,.055,.022,P.green,{mode:1,glow:.07,tag:'策划桌'}),.015,.08);
    for(const x of [-9.12,-7.38]) {
      cyl(x,.89,.13,.075,.11,P.white,{gloss:.20,tag:'策划桌'});
      capsule(x+.05,1.02,.13,.012,.18,.012,P.ink,{rz:.28,tag:'策划桌'});
    }
    station('策划桌','plan-project',-8.25,.90,-.20,
      '把脚本、排期和负责人铺在桌上，排出今天的制作顺序。',
      'Lay out the script, schedule, and owners, then sequence today\'s production work.',
      // The authored focus sat inside the middle meeting chair's collider and scored 0.
      '策划 is planning; 排期 is a production schedule.',[-8.25,-1.90],1.90);
    box(-11.42,1.65,-.25,.12,2.15,3.55,P.white,{hard:true,tag:'项目墙'});
    glyphs(-11.34,2.38,-.25,-Math.PI/2,'今日进度',
      {size:.16,gap:.035,color:P.blue,mode:1,lift:.010,tag:'项目墙'});
    for(let i=0;i<9;i++) box(-11.33,1.95-(i%3)*.48,-1.25+((i/3)|0)*.82,
      .035,.30,.58,[P.amber,P.blueL,P.green][i%3],{hard:true,mode:1,tag:'项目墙'});
    for(const z of [-1.41,-.58,.25,.82]) capsule(-11.285,1.12,z,.018,1.72,.018,P.steel,
      {rz:Math.PI/2,gloss:.42,tag:'项目墙'});
    // Soft, asymmetric objects at the corners keep the room from reading as a box with a box in it.
    softPlant(-10.78,1.26,'项目室绿化');
    for(const z of [-2.15,.92]) ball(-5.13,1.48,z,.035,.38,.38,
      z<0?P.blue:P.blueL,{mode:7,gloss:.04,tag:'项目室软包'+(z<0?'南':'北')});
    pendant(-9.25,-.20,P.blue,'项目吊灯');
    pendant(-7.25,-.20,P.amber,'项目吊灯');
    // Measured: the authored focus stood 0.075 m inside the planning table's expanded collider
    // and scored 3 of 4. This one is 0.38 m clear of it and of the west shell wall.
    station('项目墙','update-project-wall',-11.30,1.62,-.25,
      '把完成的卡片移到已完成栏，再标出今天还在等确认的内容。',
      'Move finished cards to done and mark the items still awaiting approval.',
      '进度 is progress; 确认 means confirmation.',[-10.75,-.25],1.65);
    panel(-8.35,-1.65,3.7,.22,'项目室灯南'); panel(-8.35,.85,3.7,.22,'项目室灯北');
    room('office-project-room',-11.60,-5.15,-3.15,1.88,[-8.2,-.4]);

    flat(8.25,.018,-.25,6.55,5.95,P.carpetD,{mode:7,gloss:.05,mat:'fabric',matScale:.48,matAmt:.18,
      nocut:true,tag:'评审室地毯'});
    partitionX(5.05,-3.25,2.05,[[.40,1.30,2.32]],P.wall,'评审室西墙');
    partitionZ(1.98,5.05,11.70,[[8.30,1.35,2.32]],P.wall,'评审室北墙');
    dressedPortal(8.30,1.98,P.red,'评审室门套');
    sign(8.25,3.05,1.88,Math.PI,'创意评审',P.red,'创意评审',.17);
    doorPlate(5.62,2.05,1.84,0,'评审室','评审室门牌',P.red);
    box(11.43,1.67,-.42,.12,2.15,3.72,P.ink,{hard:true,tag:'审片台'});
    luminous(box(11.34,1.72,-.42,.025,1.72,3.12,P.screen,
      {hard:true,mode:1,tag:'审片台'}),.07,.15);
    glyphs(11.29,2.52,-.42,Math.PI/2,'创意评审',
      {size:.17,gap:.04,color:P.screenL,mode:1,glow:.04,lift:.009,tag:'审片台'});
    worktable(8.30,-.48,3.25,.98,'审片台');
    monitor(8.30,-.56,Math.PI,'审片台');
    for(const x of [7.25,8.30,9.35]) chair(x,.48,Math.PI);
    cyl(7.35,.86,-.62,.24,.035,P.ink,{mode:7,gloss:.30,tag:'审片控制器'});
    for(let i=0;i<7;i++) luminous(ball(7.18+i*.055,.91,-.62,.018,.018,.018,
      i%3===0?P.red:i%3===1?P.blueL:P.green,{mode:1,glow:.045,tag:'审片控制器'}),.006,.04);
    for(const x of [7.00,9.60]) {
      const spk='监听音箱'+(x<8?'西':'东');
      capsule(x,1.54,-2.88,.035,.72,.035,P.ink,{gloss:.30,tag:spk});
      ball(x,1.63,-2.86,.18,.18,.08,P.screenL,{mode:15,gloss:.24,tag:spk});
    }
    for(const z of [-2.15,.92]) ball(5.13,1.48,z,.035,.38,.38,
      z<0?P.red:P.amber,{mode:7,gloss:.04,tag:'评审室软包'+(z<0?'南':'北')});
    softPlant(10.78,1.25,'评审室绿化');
    pendant(7.55,-.45,P.red,'评审吊灯');
    pendant(9.05,-.45,P.amber,'评审吊灯');
    // The authored focus was inside the centre chair (scored 1); 0.26 m further back clears all
    // three and still reaches the table at 1.70 m.
    station('审片台','review-cut',8.30,1.25,-.60,
      '一起看第一版，逐条记录画面、字幕和声音的修改意见。',
      'Review the first cut together and log picture, subtitle, and sound changes.',
      '审片 is a formal review of a film or video.',[8.30,1.10],1.80);
    box(6.05,.82,-2.42,1.38,1.55,.48,P.wallD,{hard:true,tag:'资料台'});
    for(let y=.25;y<1.48;y+=.31) box(6.05,y,-2.70,1.25,.035,.44,P.steel,{hard:true,tag:'资料台'});
    for(let i=0;i<12;i++) box(5.52+(i%4)*.35,.42+((i/4)|0)*.36,-2.72,.25,.28,.34,
      [P.blue,P.green,P.red,P.amber][i%4],{hard:true,tag:'资料台'});
    solid(5.30,6.80,-2.78,-2.05);
    station('资料台','file-project-assets',6.05,1.14,-2.58,
      '把授权书、脚本版本和交付清单归到同一个项目盒里。',
      'File releases, script versions, and the delivery checklist in one project box.',
      // The authored focus was inside the shelf run's own collider and scored 0.
      '资料 means project materials or records.',[7.35,-2.42],1.65);
    panel(8.25,-1.65,3.7,.22,'评审室灯南'); panel(8.25,.85,3.7,.22,'评审室灯北');
    room('office-review-room',5.15,11.60,-3.15,1.88,[8.3,-.4]);

    // North daylight lounge: accessible round either side of the retained suite, useful for an
    // informal check-in, and deliberately low so the continuous window wall remains the focal edge.
    flat(0,.020,-6.90,14.10,3.55,C('#c7c0b2'),{mode:7,gloss:.08,nocut:true,tag:'休息区地面'});
    for(const x of [-3.80,3.80]) {
      const side=x<0?'西':'东';
      sofa(x,-6.90,x<0?Math.PI/2:-Math.PI/2,2.10,'休息区沙发'+side);
      taper(x,.24,-8.10,.48,.48,.44,P.oakD,{tag:'休息区绿化'+side});
      solid(x-.28,x+.28,-8.38,-7.82);
      for(let i=0;i<6;i++) ball(x+Math.sin(i*2.2)*.18,.64+(i%2)*.12,
        -8.10+Math.cos(i*2.2)*.18,.24,.17,.22,P.plant,{mode:15,tag:'休息区绿化'+side});
    }
    // Not 资料台: that tag belongs to the review room's file run 4.8 m away, and sharing it made
    // one group 8.0 m wide whose centre sat on open floor between the two, in neither room.
    worktable(0,-6.90,3.10,.95,'长桌');
    cyl(0,.84,-6.90,.30,.028,P.ink,{mode:7,gloss:.25,tag:'无线充电'});
    for(const x of [-1.12,1.12]) cyl(x,.86,-6.90,.085,.12,P.white,{gloss:.20,tag:'水杯'+(x<0?'西':'东')});
    for(const x of [-1.05,0,1.05]) chair(x,-6.13,Math.PI);
    pendant(-.72,-6.90,P.green,'协作吊灯');
    pendant(.72,-6.90,P.amber,'协作吊灯');
    panel(0,-6.90,4.6,.28,'休息区灯');
    // Until now the only card this table had was the review room's 资料台, reached across 4.8 m by
    // a shared tag. Giving the tag back to the file run leaves this table clicking on nothing
    // unless it gets a card of its own, which it should have had.
    station('长桌','floor-standup',0,.98,-6.90,
      '站着开个短会，五分钟说完今天各组卡在哪儿。',
      'Hold a five-minute stand-up on what each team is stuck on today.',
      '站会 is a stand-up meeting; 卡住 means stuck.',[0,-5.60],1.75);
    room('office-daylight-collab',-6.90,6.90,-8.70,-4.95,[0,-6.9]);

    // ================================================================ 开放工位 · the open plan
    // The programme's first item had no geometry anywhere on the plate: every desk on this floor
    // was inside the retained team suite, and the whole south-west quadrant — 6.6 x 5.0 m of
    // daylight floor — was empty. Two ranks of three bench desks, backs to the west shell wall and
    // to the planted edge, sitters facing each other across a 1.68 m aisle. It is also what the
    // long daylight run now ends on: from the tea point door the view west was 19 m of nothing.
    const OPEN_Z=[-7.85,-6.25,-4.65];
    flat(-9.30,.017,-6.25,4.90,5.20,P.carpetD,{mode:7,gloss:.05,mat:'fabric',matScale:.48,
      matAmt:.18,nocut:true,tag:'开放工位地毯'});
    for(const [dx,sx,sgn,rank] of [[-10.85,-10.04,1,'开放工位'],[-7.55,-8.36,-1,'开放工位东']]) {
      OPEN_Z.forEach((z,i)=>{
        // ry = PI/2 turns the 1.5 m top to run along z, so the rank reads as one continuous bench
        // against the wall rather than three tables end-on. The pedestal stays inside the desk's
        // own footprint: nothing in this bank narrows the aisle, which is the only way in.
        desk(dx,z,1.50,.72,Math.PI/2,rank);
        box(dx-sgn*.02,.30,z+.46,.42,.58,.44,P.steel,{hard:true,gloss:.22,tag:rank});
        monitor(dx-sgn*.20,z,sgn*Math.PI/2,rank);
        box(dx+sgn*.12,.78,z,.17,.02,.44,P.ink,{hard:true,gloss:.28,tag:rank});
        box(dx+sgn*.05,.775,z-.36,.26,.03,.20,i%2?P.paper:P.white,{hard:true,gloss:.18,tag:rank});
        cyl(dx+sgn*.16,.81,z+.30,.045,.10,[P.white,P.blueL,P.amber][i%3],{gloss:.28,tag:rank});
        chair(sx,z,-sgn*Math.PI/2);
      });
    }
    // The edge the workroom needed. Three planters east of the far rank: the 0.36 m behind them
    // is too narrow to stand in, so they close the bank without leaving a pocket.
    for(const z of [-7.60,-6.25,-4.90]) softPlant(-6.60,z,'开放工位绿化');
    for(const z of [-7.85,-6.25,-4.65]) panel(-9.30,z,3.40,.24,'开放工位灯');
    // z -4.20, not -3.72. `hiddenAt` cuts anything whose tag centre is within 0.32 m of the room
    // edge the eye has crossed, and this room's edge is z -3.60: a sign hung at -3.72 was inside
    // that band and disappeared every time the camera sat north of a player standing in the bank —
    // which is most of the time you are here, and is how OFC-F4-W rendered it.
    sign(-9.20,2.92,-4.20,0,'开放工位',P.green,'开放工位标识',.15);
    for(const rx of [-.52,.52]) capsule(-9.20+rx,3.09,-4.20,.012,.34,.012,P.ink,
      {gloss:.36,tag:'开放工位标识'});
    // One card per rank. Splitting the bank into two tag groups to keep each one judged by its
    // own centre also splits the interaction: `pick` resolves a clicked prop to the thing wearing
    // the same tag, so the east rank without a thing of its own would have been eleven desks that
    // click on nothing.
    station('开放工位','hot-desk',-10.85,1.06,-6.25,
      '找张空工位坐下，插上电脑，先把今天的活儿理一遍。',
      'Take a free desk, plug the laptop in, and work out what today actually needs.',
      '工位 is a workstation; 开放 means open-plan.',[-9.20,-6.25],1.90);
    station('开放工位东','hot-desk-east',-7.55,1.06,-7.85,
      '这一排坐的是别的组，路过时顺手把今天的排期贴上去。',
      'The far rank is another team; pin today\'s schedule up as you pass.',
      '这一排 means this row; 别的组 is another group.',[-9.20,-7.85],1.90);
    room('office-open-desks',-11.60,-6.95,-8.70,-3.60,[-9.20,-6.25]);

    // ================================================================ 打印室 · the print bay
    // The flood fill found exactly one hole on this plate and it was here: x 3.55..4.00,
    // z -4.23..-2.13, twelve standable cells (0.27 m2) in a 0.45 m slot between the meeting
    // table's collider and the suite's east wall, sealed at the north end by the printer counter
    // and at the south by the window plinth. A 0.60 m body can never enter it and never leave it.
    // Widening it is not available — the table and the wall are both fixed — so the slot is filled
    // with the joinery a print room actually wants, which is also the missing programme item.
    const PZ0=-4.36,PZ1=-2.02;
    solid(3.26,4.40,PZ0,PZ1);
    box(3.84,.44,(PZ0+PZ1)/2,1.04,.88,PZ1-PZ0-.12,P.oakD,{hard:true,gloss:.20,tag:'打印室'});
    box(3.84,.91,(PZ0+PZ1)/2,1.10,.06,PZ1-PZ0-.06,P.oak,{hard:true,round:.02,gloss:.26,tag:'打印室'});
    for(let i=0;i<3;i++){
      const z=PZ0+.46+i*.74;
      box(3.33,.46,z,.03,.72,.64,P.oak,{hard:true,gloss:.22,tag:'打印室'});
      box(3.30,.72,z,.03,.03,.22,P.steel,{hard:true,gloss:.60,tag:'打印室'});
    }
    box(3.86,1.60,PZ0+.52,.96,1.36,.86,P.wallD,{hard:true,gloss:.20,tag:'打印室'});
    for(const sz of [-1,1]) box(3.39,1.60,PZ0+.52+sz*.21,.02,1.24,.38,P.steel,
      {hard:true,gloss:.46,tag:'打印室'});
    box(3.86,1.12,-2.55,.50,.36,.44,P.ink,{hard:true,gloss:.28,tag:'打印室'});
    box(3.86,1.31,-2.55,.40,.02,.06,P.steel,{hard:true,gloss:.55,tag:'打印室'});
    for(let i=0;i<3;i++) box(3.60,.99+i*.10,-3.05,.34,.09,.26,i%2?P.paper:P.white,
      {hard:true,gloss:.16,tag:'打印室'});
    box(4.36,1.75,-1.45,.03,.86,.90,P.paper,{hard:true,gloss:.10,tag:'打印室'});
    for(let i=0;i<6;i++) box(4.344,1.55+((i/3)|0)*.36,-1.75+(i%3)*.30,.006,.22,.18,
      [P.blueL,P.amber,P.white][i%3],{hard:true,mode:1,tag:'打印室'});
    doorPlate(4.35,2.20,-2.60,Math.PI/2,'打印室','打印室门牌',P.blue);

    // ================================================================ 茶水角 · the team kitchenette
    // Surface work only. Every collider here is the retained scene's, so the approach the tea bank
    // has always had is exactly the approach it keeps; what it gains is a finish and a name.
    box(4.36,1.35,-.55,.03,.90,.78,C('#cfd6d3'),{hard:true,mode:7,gloss:.34,tag:'茶水角'});
    box(4.10,1.95,-.55,.52,.60,.74,P.wallD,{hard:true,gloss:.22,tag:'茶水角'});
    box(3.84,1.95,-.55,.02,.54,.68,P.oak,{hard:true,gloss:.24,tag:'茶水角'});
    // Deliberately no wall cupboard over the microwave. AUTO-office-adjacent puts its eye at
    // (3.35, ~1.5, 0.17) looking north through the tenant door, and a carcass over the microwave
    // spans x 2.79..3.31 at exactly that height — 0.04 m off the lens. The shot's whole purpose is
    // that the lift lobby is visible through the opening; nothing new goes in that cone.
    doorPlate(4.35,2.28,.60,Math.PI/2,'茶水角','茶水角门牌',P.green);

    // ================================================================ 茶水间 · the floor tea point
    // A real room in the one corner of the plate that was still bare, with the curtain wall as its
    // south side. Its west wall is what the daylight run now ends on looking east.
    //
    // Its west wall stands at x 9.40 and not at 7.55, which is where the first build put it. The
    // OFC-F4-E lane camera stands its player at (8, -3.65) and pulls its eye 5.05 m back to
    // (8, -8.70) — inside a room whose west wall was then 0.45 m off the lens and whose north wall
    // filled the middle of the frame. Rendering it is what showed this; no flood fill would have.
    // The three lane eyes sit at (-8, -8.70), (0, -8.70) and (8, -8.70), so the daylight strip at
    // those x has to stay open, and this room is a galley clear of it by 1.40 m.
    const TX0=9.40,TZ0=-8.82,TZ1=-4.60,TDOOR=-6.10;
    flat(10.62,.018,-6.72,2.36,4.14,C('#c3c7c4'),{mode:7,gloss:.14,mat:'tile',matScale:.50,
      matAmt:.18,nocut:true,tag:'茶水间地面'});
    partitionX(TX0,TZ0,TZ1,[[TDOOR,1.05,2.32]],P.wall,'茶水间西墙');
    partitionZ(TZ1,TX0,11.82,[],P.wall,'茶水间北墙');
    for(const sz of [-1,1]) box(TX0-.07,1.18,TDOOR+sz*.575,.12,2.36,.06,P.ink,
      {hard:true,mode:7,gloss:.42,tag:'茶水间门套'});
    box(TX0-.07,2.36,TDOOR,.12,.08,1.21,P.ink,{hard:true,mode:7,gloss:.42,tag:'茶水间门套'});
    flat(TX0-.36,.026,TDOOR,.56,1.30,P.green,{mode:1,alpha:.20,gloss:.18,nocut:true,tag:'茶水间门套'});
    luminous(ball(TX0-.11,2.36,TDOOR+.72,.025,.055,.055,P.green,
      {mode:1,glow:.10,tag:'茶水间门套'}),.02,.12);
    sign(TX0-.10,2.90,TDOOR-1.62,Math.PI/2,'茶水间',P.green,'茶水间',.16);
    doorPlate(TX0-.10,2.02,TDOOR-1.62,Math.PI/2,'茶水间','茶水间门牌',P.green);
    // The north elevation is the one OFC-F4-E looks at down the east side of the floor, from 6 m
    // away, and it is the only 2.4 m of new wall with nothing on it. Named, it reads as the end of
    // a room; blank, it reads as a slab somebody left in the corner.
    sign(10.60,2.60,-4.50,Math.PI,'茶水间',P.green,'茶水间北标',.16);
    box(10.60,1.62,-4.50,2.30,1.34,.03,C('#cfd6d3'),{hard:true,mode:7,gloss:.30,tag:'茶水间北标'});
    // The counter run is one object against the east shell wall, sealed to it and to the curtain
    // wall, so there is no reachable strip behind it at either end. 0.50 m deep rather than 0.64:
    // in a 2.42 m room every centimetre of it comes straight off the only aisle.
    solid(11.32,11.82,-8.45,-4.80);
    box(11.57,.44,-6.62,.50,.88,3.58,P.oakD,{hard:true,gloss:.20,tag:'茶水台'});
    box(11.55,.91,-6.62,.54,.06,3.64,P.white,{hard:true,round:.02,gloss:.30,tag:'茶水台'});
    box(11.80,1.45,-6.62,.06,1.02,3.58,C('#cfd6d3'),{hard:true,mode:7,gloss:.34,tag:'茶水台'});
    for(let i=0;i<4;i++){
      const z=-8.10+i*.96;
      box(11.31,.46,z,.03,.74,.86,P.oak,{hard:true,gloss:.22,tag:'茶水台'});
      box(11.28,.72,z,.03,.03,.26,P.steel,{hard:true,gloss:.60,tag:'茶水台'});
    }
    box(11.66,1.98,-6.90,.30,.04,1.60,P.oak,{hard:true,gloss:.24,tag:'茶水台'});
    for(let i=0;i<5;i++) cyl(11.66,2.05,-7.58+i*.34,.045,.10,
      [P.white,P.blueL,P.amber,P.green,P.white][i],{gloss:.28,tag:'茶水台'});
    box(11.64,2.42,-5.30,.36,.72,1.44,P.wallD,{hard:true,gloss:.22,tag:'茶水台'});
    box(11.45,2.42,-5.30,.02,.66,1.36,P.oak,{hard:true,gloss:.24,tag:'茶水台'});
    // A shallow open shelf on the blank west wall: 0.11 m deep and no collider, because the aisle
    // it faces is 1.24 m and anything that took a bite out of it would take it out of the room.
    box(9.54,1.42,-7.30,.11,.035,1.60,P.oak,{hard:true,gloss:.24,tag:'茶水台'});
    box(9.54,1.92,-7.30,.11,.035,1.60,P.oak,{hard:true,gloss:.24,tag:'茶水台'});
    for(let i=0;i<6;i++) box(9.55,1.56+((i/3)|0)*.50,-7.90+(i%3)*.56,.10,.24,.20,
      [P.green,P.amber,P.red][i%3],{hard:true,gloss:.18,tag:'茶水台'});
    // sink, mixer, and the boiler every Chinese office floor actually has
    box(11.55,.885,-7.80,.46,.13,.52,P.steel,{hard:true,gloss:.55,tag:'水槽'});
    box(11.55,.90,-7.80,.38,.03,.44,C('#8d959a'),{hard:true,gloss:.62,tag:'水槽'});
    capsule(11.74,1.06,-7.80,.021,.32,.021,P.steel,{gloss:.62,tag:'水槽'});
    box(11.66,1.20,-7.80,.18,.026,.026,P.steel,{hard:true,gloss:.62,tag:'水槽'});
    box(11.55,1.33,-5.60,.44,.78,.44,P.white,{hard:true,gloss:.30,tag:'饮水机'});
    box(11.34,1.30,-5.60,.03,.60,.34,C('#8d959a'),{hard:true,gloss:.48,tag:'饮水机'});
    for(const [dy,cc] of [[.20,P.red],[.06,P.blueL]])
      luminous(cyl(11.33,1.33+dy,-5.60,.026,.014,cc,{rz:Math.PI/2,mode:1,tag:'饮水机'}),.02,.10);
    box(11.55,.95,-5.60,.34,.03,.34,P.steel,{hard:true,gloss:.52,tag:'饮水机'});
    // The planter sits in the outside corner between the two new walls rather than in the room: at
    // 0.50 m across it would have halved the aisle, and out here it seals to both walls instead of
    // leaving a slot behind it.
    softPlant(9.00,-5.00,'茶水间绿化');
    panel(10.60,-7.40,2.00,.24,'茶水间灯南'); panel(10.60,-5.30,2.00,.24,'茶水间灯北');
    station('饮水机','boil-water',11.55,1.58,-5.60,
      '接一杯热水，顺手看一眼水位灯。',
      'Draw a cup of hot water and glance at the level light.',
      '饮水机 is the hot-and-cold water dispenser; 接 here is to draw or fill.',[10.45,-5.60],1.75);
    station('水槽','wash-cup',11.55,1.06,-7.80,
      '把杯子涮干净，倒掉昨天的茶叶。',
      "Rinse your cup out and tip yesterday's tea leaves away.",
      '水槽 is a sink; 洗 is to wash.',[10.45,-7.80],1.60);
    station('茶水台','tea-break',11.55,1.10,-6.70,
      '泡杯茶站一会儿，听同事讲楼下的事。',
      'Brew a cup and stand a while, hearing the gossip from the floor below.',
      '茶水间 is the tea point; 休息 is to rest.',[10.45,-6.70],1.60);
    room('office-tea',9.45,11.75,-8.75,-4.68,[10.45,-6.10]);

    // ================================================================ 玩家办公桌 · the player's desk
    // The desk the game is about, given the one thing it did not have: somewhere to stand. The mat
    // covers the corrected focus, and the plate on the front edge faces the way the player arrives.
    flat(-.85,.019,-3.55,1.44,1.24,P.blue,{mode:1,alpha:.15,gloss:.14,nocut:true,tag:'我的工位地垫'});
    box(-1.42,.835,-2.98,.30,.13,.02,P.navy,{hard:true,mode:7,gloss:.12,tag:'我的工位'});
    glyphs(-1.42,.835,-2.992,0,'我的工位',
      {size:.052,gap:.011,color:P.white,mode:1,lift:.005,tag:'我的工位'});

    // 窗户 was activatable only by walking into its own floating label: the thing carries tag 窗户
    // and, once the retained window wall came across untagged, no prop on this floor wore it, so
    // `pick` could never resolve a ray to it. These sit on the retained sill at the thing's own x,
    // which is what a ray hitting the window now lands on.
    box(-2.20,1.06,-4.56,.30,.05,.24,P.oakD,{hard:true,gloss:.24,tag:'窗户'});
    cyl(-2.20,1.16,-4.56,.075,.16,C('#8f6b4b'),{mode:7,gloss:.18,tag:'窗户'});
    for(let i=0;i<5;i++) ball(-2.20+Math.sin(i*2.4)*.09,1.30+(i%2)*.07,
      -4.56+Math.cos(i*2.4)*.08,.16,.10,.13,P.plant,{mode:15,ry:i*2.4,tag:'窗户'});
    capsule(-1.95,1.62,-4.60,.012,.62,.012,P.steel,{gloss:.44,tag:'窗户'});

    // The copied monitors keep a little independent life; this is the only legacy animation that
    // materially reads at normal play distance. Door animation is intentionally gone because that
    // door is now a permanent internal passage.
    const screens=copiedProps.filter(p=>p.glow&&p.glow>.12&&p.ob&&p.ob.y>.90&&p.ob.y<1.50);
    onTick(t=>{for(let i=0;i<screens.length;i++)screens[i].glow=.17+.035*Math.sin(t*(1.1+i*.07)+i);});
    A.state.f4={legacyProps:copiedProps.length,legacyThings:source.things.length-1,legacyOffsetZ:LEGACY_DZ,
      breakroomOffsetZ:BREAKROOM_DZ,entryVestibuleDepth:1.48,
      expansion:['project-room','review-room','daylight-collab','open-desks','tea-room','print-bay'],
      focusFixed:Object.keys(FOCUS_FIX),strandedFilled:{x0:3.26,x1:4.40,z0:PZ0,z1:PZ1},
      protectedSpine:{z0:2.2,z1:4.0}};
  });

  Object.assign(OfficeUse[KEY] || (OfficeUse[KEY] = {}), {
    'plan-project': {zh:'排制作计划',py:'pái zhìzuò jìhuà',en:'plan the production run',secs:3.3,mins:24,
      gain:{mood:2,rest:-2},pose:{type:'work'},done:'脚本、排期和负责人都排好了。',doneTr:'Script, schedule, and owners are all lined up.'},
    'update-project-wall': {zh:'更新进度',py:'gēngxīn jìndù',en:'update the project wall',secs:2.6,mins:12,
      gain:{mood:2},pose:{type:'reach'},done:'完成、进行中和待确认一眼就能看清。',doneTr:'Done, in progress, and awaiting approval are clear at a glance.'},
    'review-cut': {zh:'创意审片',py:'chuàngyì shěnpiàn',en:'review the first cut',secs:4.2,mins:45,
      gain:{mood:3,rest:-3},pose:{type:'work'},done:'修改意见已经按画面、字幕和声音分好。',doneTr:'Changes are sorted into picture, subtitle, and sound notes.'},
    'file-project-assets': {zh:'整理项目资料',py:'zhěnglǐ xiàngmù zīliào',en:'file the project records',secs:2.8,mins:18,
      gain:{mood:1},pose:{type:'shelf'},done:'这个项目的资料都装进同一个盒子了。',doneTr:'The project records are together in one box.'},
    // The floor's own programme: open desks, a print bay and a tea point, none of which had an
    // action before because none of them had geometry.
    'hot-desk': {zh:'开放工位办公',py:'kāifàng gōngwèi bàngōng',en:'work from an open desk',secs:3.0,mins:30,
      gain:{mood:1,rest:-2},pose:{type:'work'},done:'换个位置反而更专心。',doneTr:'Somehow you concentrate better away from your own desk.'},
    'boil-water': {zh:'接热水',py:'jiē rèshuǐ',en:'draw hot water',secs:1.6,mins:3,
      gain:{rest:5,mood:1},pose:{type:'drink'},done:'水刚烧开，杯子有点烫手。',doneTr:'Just boiled; the cup is almost too hot to hold.'},
    'wash-cup': {zh:'洗杯子',py:'xǐ bēizi',en:'rinse your cup',secs:1.8,mins:4,
      gain:{mood:1},pose:{type:'work'},done:'茶叶倒了，杯子归位。',doneTr:'Leaves tipped out, cup back on the shelf.'},
    'tea-break': {zh:'在茶水间泡杯茶',py:'zài cháshuǐjiān pào bēi chá',en:'brew a cup at the tea point',secs:3.2,mins:15,
      gain:{rest:9,mood:4},pose:{type:'drink'},done:'听了一耳朵楼下的八卦。',doneTr:'You caught an earful of gossip from the floor below.'},
    'hot-desk-east': {zh:'贴今天的排期',py:'tiē jīntiān de páiqī',en:"pin up today's schedule",secs:2.2,mins:8,
      gain:{mood:1},pose:{type:'reach'},done:'别的组也知道今天谁等谁了。',doneTr:'The other team can see who is waiting on whom now.'},
    'floor-standup': {zh:'开个站会',py:'kāi ge zhànhuì',en:'hold a stand-up',secs:2.6,mins:10,
      gain:{mood:2,rest:-1},pose:{type:'stand'},done:'五分钟，各组卡在哪儿都说清楚了。',doneTr:'Five minutes, and every team said where it was stuck.'},
    // Familiar fixtures in the retained room get workplace meanings here instead of falling into
    // the apartment's fridge/microwave state or a generic no-context action.
    '打印机': {zh:'打印一份',py:'dǎyìn yí fèn',en:'print a working copy',secs:2.2,mins:5,
      gain:{},pose:{type:'work'},done:'打印机今天居然没卡纸。',doneTr:'For once, the printer did not jam.'},
    '咖啡': {zh:'接杯咖啡',py:'jiē bēi kāfēi',en:'make an office coffee',secs:2.4,mins:6,
      gain:{rest:7,mood:3},pose:{type:'drink'},done:'咖啡很苦，正好提神。',doneTr:'Bitter, and exactly enough to wake you up.'},
    '冰箱': {zh:'看看午饭',py:'kànkan wǔfàn',en:'check the staff fridge',secs:1.5,mins:2,
      gain:{},pose:{type:'open'},done:'饭盒上都贴着名字。',doneTr:'Every lunch box has a name on it.'},
    '微波炉': {zh:'热午饭',py:'rè wǔfàn',en:'heat up lunch',secs:2.8,mins:10,
      gain:{food:12,mood:2},pose:{type:'work'},done:'午饭热好了。',doneTr:'Lunch is warm.'},
    '空调': {zh:'看看空调',py:'kànkan kōngtiáo',en:'check the office air conditioning',secs:1.5,mins:2,
      gain:{},pose:{type:'check'},done:'还是不够凉，报修单已经在一楼。',doneTr:'Still not cool enough; the work order is with property on F1.'},
    '窗户': {zh:'看看窗外',py:'kànkan chuāngwài',en:'look over the business district',secs:2.0,mins:4,
      gain:{mood:4},pose:{type:'stand'},done:'从四楼能看见主路和地铁口。',doneTr:'From F4 you can see the main road and subway entrance.'},
  });

  // Populate the two added rooms at module load, before game.js performs its one-time merge of
  // OfficeCast into NPCS. These are quiet background colleagues: each occupies a real meeting
  // chair and leaves the public approach to the table, room portal and action focus unobstructed.
  const projectRoomCast = [
    {hz:'项目助理',name:'周楠',py:'Zhōu Nán',place:KEY,temper:'brisk',seatY:.48,faceLock:true,
      look:{skin:'#dba77f',hair:'#2d2521',hairStyle:'short',top:'#dde2df',pants:'#38434c',
        shoe:'#2b3034',jacket:'#456b65',collar:'shirt',tall:.98,wide:.93,faceSeed:9404},
      spots:[{h0:8.5,h1:18.5,at:[-6.95,-1.18],face:0,act:'sit'}]},
    {hz:'客户代表',name:'何悦',py:'Hé Yuè',place:KEY,temper:'patient',seatY:.48,faceLock:true,
      look:{skin:'#c99068',hair:'#2b231f',hairStyle:'bob',top:'#ece6dc',pants:'#343e48',
        shoe:'#282e32',jacket:'#72505d',glasses:true,tall:1.01,wide:.95,faceSeed:9405},
      spots:[{h0:9,h1:18,at:[9.35,.48],face:Math.PI,act:'sit'}]},
  ];
  for(const member of projectRoomCast)
    if(!OfficeCast.some(existing=>existing.place===member.place&&existing.name===member.name))
      OfficeCast.push(member);

})();
