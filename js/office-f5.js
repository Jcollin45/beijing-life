// 公司五楼 · 创意制作中心
//
// A complete small-agency production floor: equipment is checked out beside the arrival spine,
// the large west room is a photo/video studio, the acoustically isolated middle suite records
// sound, and the east side carries editing, colour, proofing and export.  The shared office core
// owns everything at z >= 2.20; this fit-out deliberately stops north of that line so the lift,
// stairs, toilets and the full 1.8 m escape spine always remain usable.

(() => {
  const KEY = 'office5';

  try {
    Glyphs.need(
      '五楼创意制作中心器材库器材笼器材登记摄影棚录音棚录音间控制室剪辑室调色审片导出打样台样片打印' +
      '绿幕背景灯光摄影机麦克风耳机混音台今日拍摄电池充电安全通道'
    );
  } catch (_) {}

  OfficeFit.register(KEY, A => {
    const {
      box,cyl,ball,capsule,taper,flat,glyphs,solid,shade,light,thing,luminous,onTick,room,
      RX,RZ,H,C,col,accent,state,
    } = A;

    const P = {
      floor:C('#454a54'), floorD:C('#343943'), wall:C('#e2e0d9'), wallD:C('#b9bab7'),
      ceiling:C('#efeee9'), ink:C('#242930'), white:C('#f6f3ea'), black:C('#171b20'),
      steel:C('#929aa1'), steelD:C('#565f68'), glass:C('#8cb2c1'),
      blue:C('#356d92'), blueL:C('#8cb7cd'), cyan:C('#50a5ad'),
      red:C('#b64035'), amber:C('#d99436'), green:C('#3f7657'), greenL:C('#82aa90'),
      wood:C('#9b7955'), woodD:C('#604a37'), fabric:C('#41556c'),
      foam:C('#31343b'), screen:C('#152b38'), screenL:C('#78aeca'), paper:C('#eee9dc'),
      warm:C('#ffe0a0'),
    };
    const wallT = .16, doorH = 2.28;

    // `tag` is what the ray has to hit for this station to open, and it defaults to the word only
    // because that is usually the fixture's own tag.  Where the fixture is tagged for what it is
    // (器材登记, 导出站, 样片打印机) the word alone matches no prop at all, and the station could
    // only ever be reached by walking into its label — never by clicking the object it names.
    const interactive = (hz,x,y,z,zh,en,note,focus,reach,action,tag=hz) => {
      const q = thing(hz,x,y,z,zh,en,note,{tag,focus,reach});
      q.officeFloor = KEY;
      q.officeAction = action;
      q.officeStation = {floor:KEY,id:action,department:'creative-production'};
      return q;
    };

    // Segment-built partitions leave honest openings: their collision runs are exactly the same
    // as their visible runs, so a labelled door can never be a painted opening in a solid wall.
    function wallZ(z,x0,x1,doors=[],tag='隔墙',color=P.wall) {
      const cuts = doors.slice().sort((a,b)=>a[0]-b[0]);
      let at=x0;
      // Split through the shared `A.partition` (js/build.js): a 0.40 m stub that stays, and the
      // upper part flagged for the owner's walls-down setting. The skirting below is 0.13 m tall
      // and never flagged, so with the wall down a doorway reads as a gap in the kerb. Collision
      // is unchanged — `solid` and `A.blocker` keep the extents they had.
      const run=(a,b)=>{
        if(b-a<.08) return;
        A.partition(0,H,(yc,hh,dh)=>
          box((a+b)/2,yc,z,b-a,hh,wallT,color,
            {hard:true,mat:'plaster',matScale:1.6,matAmt:.16,tag,...dh}));
        box((a+b)/2,.065,z-.09,b-a,.13,.035,P.wallD,{hard:true,tag});
        solid(a,b,z-wallT*.62,z+wallT*.62);
        A.blocker(a,b,z-wallT*.62,z+wallT*.62,A.H);
      };
      for(const [cx,w] of cuts) {
        const l=Math.max(x0,cx-w/2), r=Math.min(x1,cx+w/2);
        run(at,l);
        // Door head panel: its base is `doorH`, well above the kerb, so it is flagged whole
        // rather than split — otherwise it hangs over the opening with its wall gone.
        if(r>l) box((l+r)/2,(doorH+H)/2,z,r-l,H-doorH,wallT,color,{hard:true,tag,partition:true});
        at=Math.max(at,r);
      }
      run(at,x1);
    }
    function wallX(x,z0,z1,doors=[],tag='隔墙',color=P.wall) {
      const cuts = doors.slice().sort((a,b)=>a[0]-b[0]);
      let at=z0;
      const run=(a,b)=>{
        if(b-a<.08) return;
        A.partition(0,H,(yc,hh,dh)=>
          box(x,yc,(a+b)/2,wallT,hh,b-a,color,
            {hard:true,mat:'plaster',matScale:1.6,matAmt:.16,tag,...dh}));
        box(x+.09,.065,(a+b)/2,.035,.13,b-a,P.wallD,{hard:true,tag});
        solid(x-wallT*.62,x+wallT*.62,a,b);
        A.blocker(x-wallT*.62,x+wallT*.62,a,b,A.H);
      };
      for(const [cz,w] of cuts) {
        const l=Math.max(z0,cz-w/2), r=Math.min(z1,cz+w/2);
        run(at,l);
        if(r>l) box(x,(doorH+H)/2,(l+r)/2,wallT,H-doorH,r-l,color,{hard:true,tag,partition:true});
        at=Math.max(at,r);
      }
      run(at,z1);
    }
    function plateZ(x,y,z,w,h,zh,color=accent,tag=zh) {
      box(x,y,z,w,h,.055,color,{hard:true,mode:1,glow:.025,tag});
      glyphs(x,y,z-.034,Math.PI,zh,{size:Math.min(.21,(w-.24)/Math.max(2,[...zh].length)),
        gap:.035,color:P.white,mode:1,lift:.009,tag});
      glyphs(x,y,z+.034,0,zh,{size:Math.min(.21,(w-.24)/Math.max(2,[...zh].length)),
        gap:.035,color:P.white,mode:1,lift:.009,tag});
    }
    // One tag per fitting, not one tag for the floor's lighting.  `tagBox` (js/build.js) turns a
    // shared tag into a single fixture and `hiddenProp` (js/game.js) then hides or shows the whole
    // group from one point — so twelve panels tagged alike were being judged by a spot on the floor
    // 3.2 m from the nearest of them, and would have gone dark together.
    function ceilingPanel(x,z,w=1.55,d=.48,power=.24,tag='顶灯') {
      box(x,H-.12,z,w,.055,d,P.steelD,{hard:true,tag});
      luminous(box(x,H-.155,z,w-.10,.025,d-.08,P.white,
        {hard:true,mode:1,glow:.11,tag}),.03,.20);
      light(x,H-.25,z,[.92,.96,1],power,4.4);
    }
    function officeChair(x,z,yaw=0,c=P.fabric,tag='椅子') {
      const rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);
      cyl(x,.055,z,.25,.055,P.black,{gloss:.22,tag});
      for(let i=0;i<5;i++) {
        const a=i*Math.PI*2/5;
        box(x+Math.sin(a)*.16,.055,z+Math.cos(a)*.16,.055,.045,.28,P.black,
          {hard:true,ry:a,tag});
      }
      capsule(x,.27,z,.032,.40,.032,P.steelD,{gloss:.42,tag});
      box(x,.46,z,.50,.11,.48,c,{round:.09,mode:7,ry:yaw,gloss:.04,tag});
      const bx=x-fx*.23, bz=z-fz*.23;
      box(bx,.76,bz,.48,.53,.10,c,{round:.10,mode:7,ry:yaw,gloss:.04,tag});
      solid(x-.06,x+.06,z-.06,z+.06);
    }
    function monitorDesk(x,z,yaw=0,tag='剪辑台',dual=true) {
      const rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);
      const swap=Math.abs(fx)>.5;
      const at=(u,v)=>[x+rx*u+fx*v,z+rz*u+fz*v];
      box(x,.73,z,swap?.74:1.70,.075,swap?1.70:.74,P.wood,
        {hard:true,mode:6,gloss:.22,ry:yaw,tag});
      for(const s of [-1,1]) {
        const [lx,lz]=at(s*.72,0);
        box(lx,.36,lz,swap?.63:.065,.70,swap?.065:.63,P.steelD,
          {hard:true,ry:yaw,gloss:.48,tag});
      }
      const count=dual?2:1;
      for(let i=0;i<count;i++) {
        const ox=(i-(count-1)/2)*.62;
        const [mx,mz]=at(ox,.24),[sx,sz]=at(ox,.213),[tx,tz]=at(ox,.197);
        box(mx,1.13,mz,swap?.045:.57,.38,swap?.57:.045,P.black,{hard:true,ry:yaw,tag});
        luminous(box(sx,1.13,sz,swap?.014:.52,.33,swap?.52:.014,i%2?P.screenL:P.screen,
          {hard:true,mode:1,glow:.075,ry:yaw,tag}),.02,.12);
        box(tx,1.32,tz,swap?.014:.48,.035,swap?.48:.014,P.blue,
          {hard:true,mode:1,glow:.035,ry:yaw,tag});
        for(let k=0;k<4;k++) {
          const [gx,gz]=at(ox-.10+(k%2)*.08,.195);
          box(gx,1.22-k*.050,gz,swap?.012:.25-(k%3)*.035,.012,
            swap?.25-(k%3)*.035:.012,P.blueL,{hard:true,mode:1,glow:.025,ry:yaw,tag});
        }
        const [stemX,stemZ]=at(ox,.23);
        capsule(stemX,.90,stemZ,.025,.30,.025,P.steelD,{gloss:.50,tag});
      }
      const [keyX,keyZ]=at(-.18,-.12),[mouseX,mouseZ]=at(.44,-.12),[chairX,chairZ]=at(0,-.72);
      box(keyX,.785,keyZ,swap?.22:.68,.025,swap?.68:.22,P.black,{hard:true,ry:yaw,tag});
      ball(mouseX,.79,mouseZ,.065,.035,.09,P.black,{mode:7,tag});
      officeChair(chairX,chairZ,yaw,P.fabric,tag);
      solid(x-(swap?.41:.90),x+(swap?.41:.90),z-(swap?.90:.40),z+(swap?.90:.41));
      shade(x,z,2.0,1.25,.22);
    }
    function tripodLight(x,z,yaw=0,tag='灯光') {
      capsule(x,1.18,z,.028,2.12,.028,P.steelD,{gloss:.52,tag});
      cyl(x,1.58,z,.10,.10,P.black,{gloss:.32,tag});
      for(const a of [-.85,0,.85]) capsule(x+Math.sin(a)*.25,.17,z+Math.cos(a)*.25,
        .018,.64,.018,P.steelD,{rx:Math.PI/2,ry:a,gloss:.48,tag});
      const fx=Math.sin(yaw), fz=Math.cos(yaw);
      box(x+fx*.12,2.12,z+fz*.12,.76,.60,.19,P.black,
        {round:.08,hard:true,ry:yaw,tag});
      luminous(box(x+fx*.225,2.12,z+fz*.225,.64,.49,.025,P.warm,
        {hard:true,mode:1,glow:.18,ry:yaw,tag}),.05,.28);
      // A softbox is a framed fabric fixture, not a floating black slab. Four edge flaps, the
      // rear ballast and the orange safety clip give the light a readable front and back.
      for(const sx of [-1,1]) box(x+fx*.23+Math.cos(yaw)*sx*.35,2.12,
        z+fz*.23-Math.sin(yaw)*sx*.35,.035,.58,.07,P.steelD,{hard:true,ry:yaw,tag});
      for(const sy of [-1,1]) box(x+fx*.23,2.12+sy*.275,z+fz*.23,.72,.035,.07,P.steelD,
        {hard:true,ry:yaw,tag});
      box(x-fx*.12,1.77,z-fz*.12,.30,.22,.17,P.steelD,{round:.04,hard:true,ry:yaw,tag});
      luminous(cyl(x-fx*.21,1.80,z-fz*.21,.025,.018,P.amber,
        {rx:Math.PI/2,ry:yaw,mode:1,glow:.045,tag}),.01,.06);
      light(x+fx*.42,2.06,z+fz*.42,[1,.84,.64],.38,3.4);
      solid(x-.28,x+.28,z-.28,z+.28);
    }
    function videoCamera(x,z,yaw=0,tag='摄影机') {
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
      capsule(x,.88,z,.030,1.55,.030,P.steelD,{gloss:.50,tag});
      cyl(x,1.25,z,.14,.12,P.black,{gloss:.40,tag});
      for(const a of [-.75,0,.75]) capsule(x+Math.sin(a)*.20,.18,z+Math.cos(a)*.20,
        .018,.58,.018,P.steelD,{rx:Math.PI/2,ry:a,tag});
      box(x,1.58,z,.58,.38,.72,P.black,{round:.065,mode:7,hard:true,ry:yaw,tag});
      // Shoulder body, battery, stepped zoom rings and a squared lens hood make the silhouette
      // legible from either side of the studio rather than only as one black rectangle.
      box(x-fx*.32,1.58,z-fz*.32,.44,.34,.20,P.floorD,{round:.04,hard:true,ry:yaw,tag});
      luminous(box(x-fx*.435,1.59,z-fz*.435,.31,.20,.018,P.screenL,
        {hard:true,mode:1,glow:.085,ry:yaw,tag}),.020,.12);
      box(x-fx*.446,1.59,z-fz*.446,.23,.010,.010,P.white,
        {hard:true,mode:1,alpha:.75,ry:yaw,tag});
      box(x-fx*.446,1.59,z-fz*.446,.010,.14,.010,P.white,
        {hard:true,mode:1,alpha:.75,ry:yaw,tag});
      for(let k=0;k<3;k++) box(x-.10+k*.10-fx*.445,1.64-k*.055,z-fz*.445,
        .075,.012,.012,k===0?P.red:P.greenL,{hard:true,mode:1,glow:.025,ry:yaw,tag});
      for(const d of [.40,.50,.60]) cyl(x+fx*d,1.58,z+fz*d,.18-(d-.40)*.22,.12,
        d<.5?P.steelD:P.black,{rx:Math.PI/2,ry:yaw,gloss:.48,tag});
      box(x+fx*.69,1.58,z+fz*.69,.34,.30,.10,P.floorD,{round:.03,hard:true,ry:yaw,tag});
      cyl(x+fx*.745,1.58,z+fz*.745,.145,.030,P.steel,
        {rx:Math.PI/2,ry:yaw,gloss:.58,tag});
      luminous(cyl(x+fx*.765,1.58,z+fz*.765,.115,.018,P.screenL,
        {rx:Math.PI/2,ry:yaw,mode:1,glow:.085,tag}),.018,.12);
      box(x-fx*.08,1.86,z-fz*.08,.42,.07,.18,P.black,{round:.025,hard:true,ry:yaw,tag});
      for(const s of [-1,1]) capsule(x+rx*s*.18-fx*.08,1.99,z+rz*s*.18-fz*.08,
        .018,.22,.018,P.steelD,{rz:Math.PI/2,ry:yaw,tag});
      // Flip-out monitor and tally lamp on the operator side.
      box(x+rx*.43-fx*.02,1.65,z+rz*.43-fz*.02,.34,.25,.035,P.black,
        {hard:true,ry:yaw+Math.PI/2,tag});
      luminous(box(x+rx*.45-fx*.02,1.65,z+rz*.45-fz*.02,.29,.20,.012,P.screenL,
        {hard:true,mode:1,glow:.055,ry:yaw+Math.PI/2,tag}),.012,.08);
      luminous(cyl(x-rx*.20,1.80,z-rz*.20,.025,.018,P.red,
        {rx:Math.PI/2,ry:yaw+Math.PI/2,mode:1,glow:.06,tag}),.012,.07);
      box(x-fx*.43,1.34,z-fz*.43,.48,.030,.030,P.steelD,{hard:true,ry:yaw,tag});
      solid(x-.25,x+.25,z-.25,z+.25);
    }
    function rack(x,z,w=2.30,yaw=0,tag='器材架') {
      const alongX=Math.abs(Math.sin(yaw))<.5;
      box(x,1.12,z,alongX?w:.42,2.18,alongX?.42:w,P.steelD,
        {hard:true,gloss:.42,ry:yaw,tag});
      box(x,1.12,z,alongX?w-.12:.46,2.02,alongX?.46:w-.12,P.floorD,
        {hard:true,gloss:.08,ry:yaw,tag});
      for(const y of [.42,.88,1.34,1.80]) box(x,y,z,alongX?w-.08:.50,.055,alongX?.50:w-.08,
        P.steel,{hard:true,gloss:.50,ry:yaw,tag});
      for(let i=-2;i<=2;i++) {
        const u=i*(w-.45)/5;
        if(alongX) box(x+u,.65+(i%2)*.48,z,.34,.25,.32,i%2?P.black:P.blue,
          {round:.05,mode:7,hard:true,tag});
        else box(x,.65+(i%2)*.48,z+u,.32,.25,.34,i%2?P.black:P.blue,
          {round:.05,mode:7,hard:true,tag});
      }
      solid(x-(alongX?w/2:.28),x+(alongX?w/2:.28),z-(alongX?.28:w/2),z+(alongX?.28:w/2));
    }

    // ---------------------------------------------------------------- measured floor plan
    // `nocut` on the floor plane. These are single 24 m decals with no collision and nothing can
    // ever stand between them and the eye, but the cutaway judges each by its own centre near
    // (0, -3.3): from inside the 剪辑室 the camera backs west past x=1.04 and the whole floor of
    // the department was being deleted in one prop.
    flat(0,.014,-3.32,23.55,10.95,P.floor,
      {mode:7,gloss:.055,mat:'fabric',matScale:.48,matAmt:.20,nocut:true,tag:'创意制作中心'});
    // A pale route from the lift approach at x=-1 continues into the internal cross-corridor.
    flat(-1.0,.020,-.18,1.35,4.65,P.floorD,{mode:7,gloss:.05,nocut:true,tag:'通道'});
    flat(0,.021,-1.62,23.50,.13,accent,{mode:1,alpha:.62,nocut:true,tag:'通道'});

    // One tag per wall RUN, never one tag for the fit-out's walls.  The two runs below used to
    // share 制作区隔墙: an L 13.7 m across whose group centre landed at (2.49, -2.96), inside the
    // 剪辑室 and on neither wall.  Backing the camera east out of the 摄影棚 deleted the edit
    // suite's north wall with it, fifteen metres away and nowhere near the eye.
    wallZ(-1.15,-RX,-4.35,[[-8.10,1.55]],'摄影棚北墙');
    // Split at the z=-2.70 and x=+0.55 corners, so each stretch is the boundary of ONE room. The
    // runs are still continuous — segment ends abut exactly — but the 12.9 m and 11.2 m groups they
    // formed were being hidden and shown as single fixtures from one point on the far side of the
    // floor, taking a neighbouring room's wall with them every time the camera crossed a corner.
    wallX(-4.35,-RZ,-2.70,[[-4.90,1.45]],'录音区西墙');
    wallX(-4.35,-2.70,2.18,[[-.10,1.40]],'器材库东墙');
    wallX(.55,-RZ,-2.70,[[-5.10,1.30]],'录音区东墙');
    wallZ(-2.70,-4.35,.55,[[-2.05,1.30]],'录音区北墙');
    wallZ(-2.70,.55,RX,[[5.95,1.45]],'制作区北墙');
    wallX(3.55,-2.70,2.18,[[-.20,1.45]],'审片室西墙');

    // Acoustic control/vocal split: laminated glass above a low, genuinely solid wall.
    for(const [a,b] of [[-4.18,-3.28],[-2.02,.38]]) {
      box((a+b)/2,1.04,-6.32,b-a,2.08,.13,P.wallD,{hard:true,tag:'隔音窗'});
      solid(a,b,-6.40,-6.24);
      box((a+b)/2,1.36,-6.235,Math.max(.25,b-a-.18),1.42,.035,P.glass,
        {hard:true,mode:1,alpha:.28,gloss:.76,tag:'隔音窗'});
    }
    box(-2.65,(doorH+H)/2,-6.32,1.26,H-doorH,.13,P.wallD,{hard:true,tag:'录音间门'});
    for(const x of [-3.54,-2.04,-.26]) box(x,1.36,-6.21,.055,1.48,.07,P.steelD,
      {hard:true,gloss:.48,tag:'隔音窗'});

    room('office5-equipment',-11.72,-4.53,-1.00,2.15,-8.2,.45);
    room('office5-studio',-11.72,-4.53,-8.72,-1.31,-8.0,-4.8);
    room('office5-audio',-4.18,.38,-8.72,-2.88,-1.9,-5.2);
    room('office5-edit',.72,11.72,-8.72,-2.88,6.1,-5.3);
    room('office5-finish',3.72,11.72,-2.52,2.15,7.2,-.25);
    room('office5-arrival',-4.15,3.38,-2.50,2.15,-.8,-.25);

    plateZ(-1.0,3.02,2.10,5.60,.48,'五楼 · 创意制作中心',accent,'楼层牌');
    plateZ(-8.10,2.82,-1.06,2.55,.38,'摄影棚',P.blue,'摄影棚牌');
    plateZ(-1.92,2.82,-2.61,2.55,.38,'录音棚',P.red,'录音棚');
    plateZ(5.95,2.82,-2.61,2.55,.38,'剪辑室',P.green,'剪辑室');
    plateZ(7.60,2.82,2.08,3.55,.38,'审片 · 调色 · 导出',P.amber,'审片室');

    const panelXs=[-9.2,-5.8,-2.0,2.3,6.0,9.5];
    panelXs.forEach((x,i)=>ceilingPanel(x,-4.25,1.45,.46,.20,'顶灯南'+i));
    panelXs.forEach((x,i)=>ceilingPanel(x,.45,1.45,.46,.17,'顶灯北'+i));

    // ---------------------------------------------------------------- equipment cage and checkout
    // The cage front follows the room wall and shares its 1.55 m doorway.  The previous rails
    // accidentally ran three metres *through* the room at four x positions, intersecting both
    // racks and making a decorative fence the player could simply walk through.
    // West and east leaves are separate fixtures: tagged as one, the group's centre sat in the
    // middle of the gate opening, 0.63 m from the nearest post and on nothing at all.
    const cageGateL=-8.875,cageGateR=-7.325;
    for(const [x,tag] of [[-11.25,'器材笼西'],[cageGateL,'器材笼西'],
                          [cageGateR,'器材笼东'],[-5.25,'器材笼东']])
      box(x,1.18,-.98,.045,2.28,.045,P.steelD,{hard:true,tag});
    for(let y=.24;y<2.2;y+=.28) {
      for(const [a,b,tag] of [[-11.25,cageGateL,'器材笼西'],[cageGateR,-5.25,'器材笼东']])
        box((a+b)/2,y,-.98,b-a,.018,.045,P.steel,{hard:true,tag});
    }
    // The structural wall immediately behind these rails already owns the exact two collision
    // runs and doorway. Duplicating them 17 cm forward pinched the body-radius route at the gate.
    rack(-10.35,.96,2.35,0,'器材架西');
    rack(-6.10,.96,2.35,0,'器材架东');
    // Two case banks leave the gate-to-checkout aisle centred and visibly usable, and each bank is
    // its own tag so the cutaway is never judging six cases by the empty aisle between them.
    const caseXs=[-10.85,-10.10,-9.35,-6.85,-6.10,-5.35];
    for(let i=0;i<caseXs.length;i++) {
      const x=caseXs[i], tag=i<3?'器材箱西':'器材箱东';
      box(x,.20,-.20,.64,.35,.48,i%2?P.blue:P.black,{round:.08,mode:7,hard:true,tag});
      box(x,.41,-.20,.32,.045,.08,P.steel,{hard:true,tag});
    }
    // Each case is physical, but do not fuse a whole bank into one long barrier: body-radius
    // expansion already gives these compact centres the correct apparent 64 x 48 cm footprint.
    for(const x of caseXs) solid(x-.06,x+.06,-.26,-.14);
    box(-8.05,.73,1.62,2.45,.08,.82,P.wood,{hard:true,mode:6,gloss:.22,tag:'器材登记'});
    box(-8.05,.39,1.88,2.35,.68,.10,P.woodD,{hard:true,mode:6,tag:'器材登记'});
    luminous(box(-8.05,1.23,1.86,.88,.53,.045,P.screen,
      {hard:true,mode:1,glow:.08,tag:'器材登记'}),.02,.12);
    glyphs(-8.05,1.23,1.827,Math.PI,'器材登记',{size:.13,gap:.03,color:P.white,mode:1,lift:.008,tag:'器材登记'});
    solid(-9.35,-6.75,1.20,2.08);
    // The label used to float at (-9.55, 0.96), which is inside the west rack's own collider, and
    // carried the tag 器材库 — a word no prop on this floor wears, so the ray could never resolve
    // it.  It now sits over the registration desk and is picked by the desk.
    interactive('器材库',-8.05,1.15,1.42,
      '先在器材登记台扫码，再领取摄影机、电池和灯光包。',
      'Scan the checkout sheet before taking a camera, batteries, and a lighting kit.',
      '器材 is production equipment; 领取 means to check something out for use.',
      [-8.05,.72],2.1,'check-out-kit','器材登记');

    // ---------------------------------------------------------------- photo/video studio
    // A three-sided cyclorama has a curved-looking floor sweep assembled from shallow white bands.
    // The two cyclorama walls meet at a corner, so tagged together their group centre falls 2.4 m
    // out into the middle of the set.  One tag each; the sweep is floor and never cut.
    box(-11.48,1.58,-5.20,.18,3.02,6.70,P.white,{hard:true,tag:'天幕西'});
    box(-8.08,1.58,-8.72,6.95,3.02,.18,P.white,{hard:true,tag:'天幕北'});
    for(let i=0;i<5;i++) flat(-8.15,.022+i*.006,-8.15+i*.18,6.45,.40,P.white,
      {mode:7,gloss:.07,nocut:true,tag:'天幕北'});
    // Changeable green and warm-paper backdrops on a ceiling roller.
    capsule(-9.75,2.88,-8.42,.055,3.18,.055,P.steelD,{rz:Math.PI/2,tag:'背景'});
    box(-9.75,1.56,-8.35,3.02,2.48,.035,P.green,
      {hard:true,mode:7,gloss:.025,tag:'绿幕'});
    glyphs(-9.75,2.52,-8.30,0,'绿幕',{size:.18,gap:.05,color:P.white,mode:1,lift:.008,tag:'绿幕'});
    // Interview set and floor marks.
    officeChair(-8.75,-6.20,0,P.blue,'访谈椅');
    officeChair(-7.20,-6.20,0,P.blue,'访谈椅');
    cyl(-7.98,.50,-5.98,.38,.06,P.wood,{gloss:.24,tag:'访谈桌'});
    solid(-8.38,-7.58,-6.38,-5.58);
    for(const [x,z] of [[-8.75,-5.66],[-7.20,-5.66],[-7.95,-3.55]])
      flat(x,.025,z,.34,.055,P.red,{mode:1,alpha:.85,tag:'机位'});
    videoCamera(-7.95,-3.65,Math.PI,'摄影机');
    tripodLight(-10.35,-4.70,.62,'灯光西');
    tripodLight(-5.55,-5.35,-.62,'灯光东');
    // Ceiling track, boom microphone, slate, reflector and cable management turn the set into a
    // working production bay. They are deliberately slim/non-colliding: the clear shooting lane
    // from the door to the interview marks stays exactly where it was.
    for(const z of [-4.45,-6.45]) {
      box(-8.05,3.10,z,6.20,.055,.075,P.steelD,{hard:true,gloss:.46,tag:'灯光轨道'});
      for(const x of [-10.25,-8.05,-5.85]) {
        cyl(x,3.05,z,.075,.08,P.black,{gloss:.26,tag:'灯光轨道'});
        capsule(x,2.90,z,.018,.25,.018,P.steel,{tag:'灯光轨道'});
      }
    }
    // Boom stand and its counterweight sit at the room edge; the pole reaches over the set.
    capsule(-5.15,1.25,-4.22,.025,2.28,.025,P.steelD,{gloss:.48,tag:'麦克风'});
    for(const a of [-.8,0,.8]) capsule(-5.15+Math.sin(a)*.22,.14,-4.22+Math.cos(a)*.22,
      .016,.55,.016,P.steelD,{rx:Math.PI/2,ry:a,tag:'麦克风'});
    const boomYaw=Math.atan2(-2.25,-1.70);
    box(-6.27,2.26,-5.07,.035,.035,2.82,P.steelD,
      {hard:true,ry:boomYaw,rz:-.045,gloss:.46,tag:'麦克风'});
    capsule(-7.36,2.18,-5.93,.055,.42,.055,P.black,
      {rx:Math.PI/2,ry:boomYaw,tag:'麦克风'});
    box(-4.84,2.24,-3.98,.30,.16,.22,P.black,{round:.06,mode:7,hard:true,tag:'配重'});
    // The stand's own tripod, and nothing else.  One 0.60 x 1.22 collider used to cover this stand
    // AND the bounce disc together, and its east edge reached x=-4.78 — inside the 0.30 m body
    // inflation of the 录音区西墙 doorway at z=-4.90, which sealed that door completely: measured,
    // 0.09 m of the 1.45 m opening was left. The doorway now measures as a doorway.
    solid(-5.37,-4.93,-4.44,-4.00);
    // Collapsible bounce disc: a bright oval in profile rather than another square softbox. It
    // stands beside the set bouncing the key light back, clear of the door it used to block; the
    // disc is 1.08 m across in plan, so it can never be dressed against a wall with an opening.
    cyl(-6.55,1.40,-4.28,.50,.030,P.white,
      {rx:Math.PI/2,ry:-.55,mode:1,alpha:.92,gloss:.18,tag:'反光板'});
    cyl(-6.55,1.40,-4.30,.54,.018,P.steelD,
      {rx:Math.PI/2,ry:-.55,mode:1,alpha:.90,tag:'反光板'});
    capsule(-6.55,.72,-4.28,.020,1.20,.020,P.steelD,{tag:'反光板'});
    solid(-7.01,-6.09,-4.58,-4.00);
    // Slate on the interview table, with the striped clapper held visibly open.
    box(-7.98,.62,-5.98,.44,.28,.035,P.black,{hard:true,rx:-.20,tag:'场记板'});
    for(let i=0;i<5;i++) box(-8.14+i*.08,.77,-5.93,.075,.035,.045,
      i%2?P.white:P.black,{hard:true,rx:-.20,rz:-.12,tag:'场记板'});
    for(let i=0;i<3;i++) box(-8.09,.67-i*.065,-5.94,.22-i*.03,.014,.014,P.white,
      {hard:true,mode:1,tag:'场记板'});
    // Gaffer-taped cable coils and sandbags stop the stands looking weightless on the floor.
    // Loose kit is dressed in pairs four metres apart; each pair member keeps its own tag so a
    // coil and a sandbag are never hidden by a point out in the middle of the shooting lane.
    for(const [x,z,tag] of [[-9.72,-3.34,'电缆西'],[-5.82,-4.72,'电缆东']]) {
      cyl(x,.035,z,.30,.025,P.black,{tag});
      cyl(x,.047,z,.19,.028,P.floor,{tag});
      flat(x,.054,z,.74,.055,P.amber,{mode:1,alpha:.72,rz:.20,nocut:true,tag});
    }
    for(const [x,z,ry,tag] of [[-10.10,-4.42,.25,'沙袋西'],[-5.34,-5.10,-.35,'沙袋东']]) {
      box(x,.10,z,.40,.15,.22,P.black,{round:.08,mode:7,ry,tag});
      box(x,.18,z,.20,.055,.055,P.steelD,{round:.03,mode:7,ry,tag});
    }
    // Two apple boxes and a monitor cart live against the west wall, ready to roll onto set.
    // Apple boxes, not equipment cases: they are in the 摄影棚 and the cases are in the 器材库 on
    // the far side of a wall, so sharing 器材箱 put the group's centre in the doorway between them.
    for(const [x,y,z,ry] of [[-11.05,.23,-2.55,0],[-10.68,.45,-2.55,Math.PI/2]]) {
      box(x,y,z,.62,.42,.42,P.wood,{hard:true,mode:6,gloss:.12,ry,tag:'苹果箱'});
      box(x,y,z-.22,.32,.10,.018,P.floorD,{hard:true,mode:1,ry,tag:'苹果箱'});
    }
    box(-11.02,.76,-3.38,.74,.055,.52,P.steelD,{hard:true,tag:'监看车'});
    for(const sx of [-.27,.27]) {
      box(-11.02+sx,.39,-3.38,.035,.72,.42,P.steelD,{hard:true,tag:'监看车'});
      cyl(-11.02+sx,.08,-3.18,.055,.045,P.black,{rx:Math.PI/2,tag:'监看车'});
    }
    box(-11.02,1.23,-3.55,.68,.46,.055,P.black,{hard:true,tag:'监看器'});
    luminous(box(-11.02,1.23,-3.516,.60,.38,.015,P.screen,
      {hard:true,mode:1,glow:.055,tag:'监看器'}),.012,.08);
    solid(-11.43,-10.34,-3.82,-2.30);
    // A low control cart does not obstruct the route through the room door.
    box(-10.18,.70,-2.10,1.42,.08,.60,P.black,{hard:true,tag:'灯光台'});
    for(const s of [-1,1]) box(-10.18+s*.58,.36,-2.10,.055,.68,.50,P.steelD,{hard:true,tag:'灯光台'});
    for(let i=0;i<8;i++) luminous(cyl(-10.66+i*.14,.77,-2.18,.026,.018,
      i%3===0?P.red:i%3===1?P.green:P.amber,{mode:1,glow:.05,tag:'灯光台'}),.01,.06);
    solid(-10.92,-9.44,-2.45,-1.77);
    interactive('摄影棚',-7.95,1.58,-3.65,
      '摄影机已经对准访谈区，先检查构图，再录一条。',
      'The camera is aimed at the interview set; check the framing, then record a take.',
      '摄影 is photography or filming; 一条 is one recorded take.',[-7.08,-2.78],1.85,'record-take',
      '摄影机');
    interactive('灯光台',-10.18,.82,-2.10,
      '灯光台控制主光、补光和背景光。',
      'The lighting console controls the key, fill, and background lights.',
      '主光 is the key light; 补光 is fill light.',[-9.20,-2.05],1.65,'set-lighting');

    // ---------------------------------------------------------------- audio booth and control room
    for(let x=-3.80;x<=.05;x+=.58) {
      const high=((Math.round((x+3.8)/.58))%2)===0;
      box(x,1.72,-8.64,.48,high?1.62:1.22,.09,high?P.foam:P.fabric,
        {hard:true,mode:7,gloss:.025,tag:'吸音板'});
    }
    for(const z of [-7.82,-7.20,-6.58]) for(const x of [-3.75,.02])
      box(x,1.55,z,.10,1.02,.48,P.foam,{hard:true,mode:7,gloss:.02,tag:'吸音板'});
    solid(-3.86,-3.64,-8.08,-6.34);
    solid(-.09,.13,-8.08,-6.34);
    // 录音麦克风, not 麦克风: the studio's boom is four metres west behind a solid wall, and one
    // shared tag made a fixture out of two microphones in two different rooms.
    box(-2.15,.74,-7.55,1.20,.075,.52,P.wood,{hard:true,mode:6,tag:'录音麦克风'});
    capsule(-2.15,1.28,-7.55,.022,1.02,.022,P.steelD,{gloss:.48,tag:'录音麦克风'});
    capsule(-2.15,1.73,-7.55,.045,.34,.045,P.black,{rx:Math.PI/2,tag:'录音麦克风'});
    ball(-2.15,1.73,-7.38,.075,.12,.075,P.steel,{mode:15,gloss:.38,tag:'录音麦克风'});
    capsule(-2.15,1.72,-7.22,.12,.020,.12,P.black,{rx:Math.PI/2,tag:'防喷罩'});
    solid(-2.82,-1.48,-7.88,-7.20);
    // Control desk with faders, near-field monitors and headphones.
    box(-1.90,.76,-4.82,2.55,.09,.92,P.woodD,{hard:true,mode:6,tag:'混音台'});
    box(-1.90,.86,-4.87,1.55,.15,.65,P.black,{hard:true,rx:-.10,tag:'混音台'});
    for(let i=0;i<10;i++) {
      box(-2.52+i*.14,.94,-4.96,.018,.055,.28,P.steel,{hard:true,tag:'混音台'});
      cyl(-2.52+i*.14,.98,-5.05+(i%3)*.08,.025,.018,i%2?P.blue:P.red,{mode:1,glow:.035,tag:'混音台'});
    }
    luminous(box(-1.90,1.42,-5.05,.88,.52,.045,P.screen,
      {hard:true,mode:1,glow:.085,tag:'录音控制'}),.02,.13);
    for(const sx of [-1,1]) {
      box(-1.90+sx*.85,1.25,-5.00,.35,.54,.32,P.black,{round:.05,mode:7,hard:true,tag:'监听音箱'});
      cyl(-1.90+sx*.85,1.30,-4.82,.10,.025,P.blueL,{rx:Math.PI/2,tag:'监听音箱'});
    }
    officeChair(-1.90,-3.98,Math.PI,P.fabric,'录音椅');
    solid(-3.22,-.58,-5.36,-4.32);
    const recordLamp=luminous(cyl(-3.72,2.56,-6.18,.095,.035,P.red,
      {rx:Math.PI/2,mode:1,glow:.15,tag:'录音中'}),.04,.28);
    glyphs(-3.72,2.30,-6.17,Math.PI/2,'录音中',{size:.12,gap:.03,color:P.red,mode:1,lift:.008,tag:'录音中'});
    onTick(t=>{recordLamp.glow=.10+(.5+.5*Math.sin(t*3.1))*.16;});
    interactive('录音间',-2.15,1.62,-7.55,
      '关门、戴上耳机，然后录制旁白。','Close the door, put on the headphones, and record the voice-over.',
      '录音 is audio recording; 旁白 is narration or voice-over.',[-2.15,-6.72],1.55,'record-audio',
      '录音麦克风');

    // ---------------------------------------------------------------- edit suites
    // Four bays, four tags, four stations.  Sharing 剪辑台 made 112 props one 9.3 m fixture judged
    // from a point 1.3 m off any of them, and gave every bay the middle bay's standing spot: click
    // the far desk and the player walked three metres past it.  Each bay now owns its own aisle
    // position, and `labelGroup` keeps the nearest word on screen instead of four identical ones.
    const editBays=[
      [2.35,-7.15,0,true,'剪辑台一',[2.35,-6.18]],
      [5.20,-7.15,0,true,'剪辑台二',[5.20,-6.18]],
      [8.05,-7.15,0,true,'剪辑台三',[8.05,-6.18]],
      [10.25,-4.55,Math.PI,false,'剪辑台四',[10.25,-3.25]],
    ];
    for(const [bx,bz,byaw,dual,btag,stand] of editBays) {
      monitorDesk(bx,bz,byaw,btag,dual);
      const q=interactive('剪辑台',bx,1.10,bz,
        '把采访、空镜和同期声整理成一条完整时间线。',
        'Arrange the interview, cutaways, and location sound into one complete timeline.',
        '剪辑 is editing; 时间线 is an editing timeline.',stand,1.7,'edit-sequence',btag);
      q.labelGroup='剪辑台';
    }
    // Shared near-field speakers and a render-status wall display.
    box(6.20,1.85,-8.60,4.80,1.12,.075,P.black,{hard:true,tag:'制作进度'});
    luminous(box(6.20,1.85,-8.545,4.58,.94,.020,P.screen,
      {hard:true,mode:1,glow:.07,tag:'制作进度'}),.02,.12);
    glyphs(6.20,2.10,-8.52,0,'今日拍摄 · 剪辑进度',{size:.16,gap:.04,color:P.white,mode:1,lift:.008,tag:'制作进度'});
    for(let i=0;i<5;i++) {
      box(5.02,1.89-i*.14,-8.50,1.45,.055,.018,P.steelD,{hard:true,mode:1,tag:'制作进度'});
      box(5.02-(1.45*(1-(i+3)/9))/2,1.89-i*.14,-8.48,1.45*(i+3)/9,.055,.018,
        i===4?P.green:P.blue,{hard:true,mode:1,glow:.03,tag:'制作进度'});
    }

    // ---------------------------------------------------------------- review, colour, proof and export
    monitorDesk(7.15,-1.15,0,'调色台',true);
    box(10.78,1.55,-2.55,1.80,1.55,.065,P.black,{hard:true,tag:'审片屏'});
    luminous(box(10.78,1.55,-2.50,1.67,1.40,.018,P.screenL,
      {hard:true,mode:1,glow:.09,tag:'审片屏'}),.025,.16);
    for(const x of [9.45,10.25]) officeChair(x,-1.45,Math.PI,P.fabric,'审片椅');
    interactive('调色台',7.15,1.08,-1.15,
      '在审片屏上比较肤色、白平衡和字幕安全框。',
      'Compare skin tone, white balance, and subtitle-safe framing on the review display.',
      '调色 is colour grading; 白平衡 is white balance.',[6.10,-.52],1.85,'colour-grade');

    // Export kiosk at the arrival side: fast network storage, media slots and a job light.
    box(1.72,.78,1.16,1.38,1.42,.58,P.steelD,{hard:true,gloss:.46,tag:'导出站'});
    luminous(box(1.72,1.05,.85,.86,.50,.035,P.screen,
      {hard:true,mode:1,glow:.09,tag:'导出站'}),.02,.15);
    glyphs(1.72,1.05,.82,Math.PI,'导出',{size:.17,gap:.05,color:P.white,mode:1,lift:.008,tag:'导出站'});
    for(let i=0;i<4;i++) cyl(1.37+i*.23,.58,.84,.040,.022,i===3?P.green:P.blue,
      {rx:Math.PI/2,mode:1,glow:.05,tag:'导出站'});
    solid(.98,2.46,.80,1.52);
    interactive('导出',1.72,1.02,1.05,
      '检查文件名、字幕和声道，再导出交付母版。',
      'Check the filename, subtitles, and audio channels, then export the delivery master.',
      '导出 is to export; 母版 is the final master file.',[.82,.72],1.65,'export-master','导出站');

    // Calibrated proof printer and a broad review table.
    box(10.25,.66,.78,1.35,1.20,.72,P.white,{hard:true,round:.06,mode:7,tag:'样片打印机'});
    box(10.25,1.02,.39,1.02,.24,.055,P.black,{hard:true,tag:'样片打印机'});
    luminous(box(10.68,.94,.38,.22,.13,.018,P.blue,
      {hard:true,mode:1,glow:.06,tag:'样片打印机'}),.02,.10);
    for(let i=0;i<5;i++) box(9.80+i*.20,.27,.38,.14,.045,.22,
      i%2?P.paper:P.white,{hard:true,tag:'样片纸'});
    solid(9.52,10.98,.34,1.42);
    box(7.65,.77,1.28,3.20,.07,1.00,P.wood,{hard:true,mode:6,tag:'样片桌'});
    for(const x of [6.35,8.95]) box(x,.39,1.28,.09,.74,.82,P.woodD,{hard:true,tag:'样片桌'});
    for(let i=0;i<4;i++) box(6.72+i*.55,.83,1.18,.42,.018,.58,
      i%2?P.paper:P.white,{hard:true,rz:(i-1.5)*.025,tag:'样片'});
    solid(6.00,9.30,.74,1.82);
    interactive('打样台',10.25,.98,.78,
      '打印一张校色样片，和屏幕上的版本并排检查。',
      'Print a calibrated proof and compare it beside the screen version.',
      '样片 is a proof or sample output; 校色 means colour calibration.',[9.18,.18],1.85,'print-proof',
      '样片打印机');

    // A battery-safe charging locker completes the production loop on return.
    box(-5.00,1.10,1.46,.48,2.04,1.05,P.steelD,{hard:true,gloss:.44,tag:'充电柜'});
    for(let y=.38;y<1.92;y+=.38) for(const z of [1.16,1.48,1.80])
      luminous(cyl(-4.74,y,z,.025,.018,(Math.round(y*10)+Math.round(z*10))%2?P.green:P.amber,
        {rz:Math.PI/2,mode:1,glow:.045,tag:'充电柜'}),.01,.07);
    solid(-5.32,-4.66,.88,2.05);
    interactive('充电柜',-5.00,1.12,1.46,
      '归还电池时要登记电量，再放进防火充电柜。',
      'Log the charge level before returning batteries to the fire-safe charging locker.',
      '归还 is to return something; 电量 is the remaining charge.',[-5.85,1.20],1.55,'return-batteries');

    state.production = {
      workflow:['check-out-kit','set-lighting','record-take','record-audio','edit-sequence',
        'colour-grade','print-proof','export-master','return-batteries'],
      rooms:['equipment','studio','audio','edit','finish'],
      protectedSpine:{z0:2.2,z1:4.0},
    };
  });

  Object.assign(OfficeUse[KEY] || (OfficeUse[KEY] = {}), {
    'check-out-kit': {zh:'领取器材',py:'lǐngqǔ qìcái',en:'check out the production kit',secs:2.8,mins:12,
      gain:{mood:1,rest:-1},pose:{type:'reach'},done:'器材和电池都登记好了。',doneTr:'The equipment and batteries are checked out.'},
    'set-lighting': {zh:'设置灯光',py:'shèzhì dēngguāng',en:'set the studio lights',secs:3.0,mins:18,
      gain:{mood:2,rest:-2},pose:{type:'work'},done:'主光、补光和背景光都调好了。',doneTr:'Key, fill, and background lights are set.'},
    'record-take': {zh:'录一条',py:'lù yì tiáo',en:'record a video take',secs:4.0,mins:35,
      gain:{mood:3,rest:-4,food:-2},pose:{type:'work'},done:'这一条构图和声音都合格。',doneTr:'The framing and sound are good on this take.'},
    'record-audio': {zh:'录旁白',py:'lù pángbái',en:'record the voice-over',secs:3.8,mins:28,
      gain:{mood:2,rest:-3},pose:{type:'work'},done:'旁白录完了，没有底噪。',doneTr:'The voice-over is finished with no background noise.'},
    'edit-sequence': {zh:'剪片子',py:'jiǎn piànzi',en:'edit the sequence',secs:5.0,mins:85,
      gain:{mood:-3,rest:-8,food:-4},pose:{type:'desk'},done:'采访、空镜和声音已经对齐。',doneTr:'Interview, cutaways, and sound are aligned.'},
    'colour-grade': {zh:'调色审片',py:'tiáosè shěnpiàn',en:'grade and review the film',secs:4.6,mins:50,
      gain:{mood:1,rest:-5},pose:{type:'desk'},done:'白平衡和肤色通过审片。',doneTr:'White balance and skin tones passed review.'},
    'print-proof': {zh:'打印样片',py:'dǎyìn yàngpiàn',en:'print a calibrated proof',secs:2.7,mins:8,
      gain:{mood:1},pose:{type:'reach'},done:'样片和屏幕的颜色一致。',doneTr:'The proof matches the display.'},
    'export-master': {zh:'导出母版',py:'dǎochū mǔbǎn',en:'export the delivery master',secs:4.4,mins:42,
      gain:{mood:4,rest:-3},pose:{type:'work'},done:'母版、字幕和声道全部导出。',doneTr:'Master, subtitles, and audio channels are exported.'},
    'return-batteries': {zh:'归还电池',py:'guīhuán diànchí',en:'return and charge the batteries',secs:2.4,mins:9,
      gain:{mood:1},pose:{type:'reach'},done:'电池已登记并放进充电柜。',doneTr:'The batteries are logged and in the charging locker.'},
  });

  const productionCast = [
    {hz:'摄影师',name:'罗晴',py:'Luó Qíng',place:KEY,temper:'brisk',
      look:{skin:'#d9a67e',hair:'#27211e',hairStyle:'ponytail',top:'#313943',pants:'#252b31',
        shoe:'#20242a',jacket:'#596b77',tall:.98,wide:.94,faceSeed:9501},
      // Operator side of the tripod, beside its flip-out monitor and clear of the lens-to-set lane.
      spots:[{h0:8,h1:19,at:[-8.55,-2.85],face:Math.PI,act:'check'}],
      lines:[['拍之前先核对电池、存储卡和白平衡。','Before shooting, check the battery, card, and white balance.'],
             ['灯光不用太亮，人物和背景要分开。','The lights need not be harsh; separate the subject from the background.']]},
    {hz:'录音师',name:'许超',py:'Xǔ Chāo',place:KEY,temper:'steady',
      look:{skin:'#c48d65',hair:'#29231f',hairStyle:'short',top:'#41515c',pants:'#29333c',
        shoe:'#23282d',glasses:true,tall:1.04,wide:1.00,faceSeed:9502},
      // The control chair faces south toward the console; desk pose puts both hands at the faders.
      spots:[{h0:8,h1:20,at:[-1.90,-3.98],face:Math.PI,act:'sit'}],
      lines:[['录音棚里请把手机调成静音。','Please silence your phone in the recording booth.'],
             ['这条旁白很干净，可以直接进剪辑。','This voice-over is clean enough to go straight into the edit.']]},
    {hz:'剪辑师',name:'孟然',py:'Mèng Rán',place:KEY,temper:'patient',
      look:{skin:'#e4b38c',hair:'#352a25',hairStyle:'bob',top:'#596c82',pants:'#303945',
        shoe:'#292d32',glasses:true,tall:.96,wide:.91,faceSeed:9503},
      // Seat at the centre edit bay, facing its dual monitors rather than standing in front of them.
      spots:[{h0:9,h1:21,at:[5.20,-7.87],face:0,act:'sit'}],
      lines:[['先整理素材，再开始剪时间线。','Organise the footage before cutting the timeline.'],
             ['导出前别忘了检查字幕和声道。','Do not forget subtitles and audio channels before export.']]},
    {hz:'制片助理',name:'唐冉',py:'Táng Rǎn',place:KEY,temper:'genial',
      look:{skin:'#d3a078',hair:'#231e1b',hairStyle:'bun',top:'#8a6b4f',pants:'#333c45',
        shoe:'#262b30',bag:'shoulder',bagColor:'#4f5960',tall:.95,wide:.92,faceSeed:9504},
      // Standing scan position at the registration desk's east end, outside both furniture solids.
      spots:[{h0:8,h1:18.5,at:[-6.40,1.48],face:-Math.PI/2,act:'check'}],
      lines:[['器材领用和归还都要扫码。','Equipment must be scanned both out and back in.'],
             ['今天下午三点在审片室看第一版。','We review the first cut at three this afternoon.']]}
  ];
  // A live-reload or repeated module evaluation must not add a second production crew.
  for (const member of productionCast)
    if (!OfficeCast.some(existing => existing.place === member.place && existing.name === member.name))
      OfficeCast.push(member);
})();
