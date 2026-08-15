// 京华大酒店客梯 — a real, inspectable car and deterministic ride controller.
//
// `HotelLift.scene` is a place in game.js. Choosing a destination puts the player in this car;
// the controller closes the leaves, advances a physical floor display for a distance-proportional
// duration, opens on the target landing, then hands control back to game.js through `bind`.

const HotelLift = (() => {
  const floors=HOTEL_FLOORS;
  const byKey=key=>floors.find(f=>f.key===key);
  const valid=key=>!!byKey(key);
  const state={
    currentKey:'hotel', sourceKey:'hotel', targetKey:'hotel', phase:'idle', direction:0,
    openness:1, progress:0, elapsed:0, duration:0, display:'1', diagnostic:false,
  };
  let hooks={},visual=null,arriveFired=false;

  const physicalDistance=(a,b)=>Math.abs(byKey(a).level-byKey(b).level);
  const rideSeconds=(a,b)=>+(1.35+physicalDistance(a,b)*.58).toFixed(3);
  const shownLevel=v=>{
    if(v<-.32)return 'B1';
    if(v<1)return '1';
    return String(Math.max(1,Math.min(12,Math.round(v))));
  };
  const snapshot=()=>({
    currentKey:state.currentKey,sourceKey:state.sourceKey,targetKey:state.targetKey,
    current:byKey(state.currentKey)?.display||'1',target:byKey(state.targetKey)?.display||'1',
    phase:state.phase,direction:state.direction,openness:+state.openness.toFixed(3),
    progress:+state.progress.toFixed(3),elapsed:+state.elapsed.toFixed(3),
    duration:+state.duration.toFixed(3),display:state.display,diagnostic:!!state.diagnostic,
  });

  function syncVisual(){if(visual)visual(snapshot());}
  function bind(o){hooks=o||{};return HotelLift;}
  function syncLanding(key){
    if(!valid(key)||state.phase!=='idle'&&!state.diagnostic)return false;
    state.currentKey=state.sourceKey=state.targetKey=key;
    state.direction=0;state.progress=0;state.elapsed=0;state.duration=0;
    state.openness=1;state.display=byKey(key).display;state.diagnostic=false;
    syncVisual();return true;
  }
  // 房卡 (H105). The card rule belongs to js/stay.js — `canEnterFloor` names the six guest floors
  // and answers for exactly one card — and this is the ride refusing to be the way round it.
  //
  // The panel in game.js dims the row and says the sentence, which is where the player meets this;
  // the check is repeated here because `begin` is the public entry to the ride and a caller that
  // has not asked must not be able to take somebody to floor 8 on nobody's card. Ordered after
  // `valid` and before `busy` so an invalid key still reads as invalid, and a refusal is never
  // confused with a car that is merely moving.
  //
  // Silent when js/stay.js is absent — a harness loading this module on its own gets the lift it
  // has always had — and silent for B1 and the seven public floors, which are open to anybody.
  const carded=key=>{
    if(typeof Stay==='undefined'||!Stay.canEnterFloor)return true;
    try{return Stay.canEnterFloor(key);}catch(_){return true;}
  };
  function begin(sourceKey,targetKey){
    if(!valid(sourceKey)||!valid(targetKey))return 'invalid';
    if(!carded(targetKey))return 'nokey';
    if(state.phase!=='idle')return 'busy';
    if(sourceKey===targetKey)return 'here';
    const a=byKey(sourceKey),b=byKey(targetKey);
    state.currentKey=sourceKey;state.sourceKey=sourceKey;state.targetKey=targetKey;
    state.phase='closing';state.direction=Math.sign(b.level-a.level);
    state.openness=1;state.progress=0;state.elapsed=0;state.duration=rideSeconds(sourceKey,targetKey);
    state.display=a.display;state.diagnostic=false;arriveFired=false;
    syncVisual();return true;
  }
  function advance(dt){
    dt=Math.max(0,Math.min(.25,Number(dt)||0));
    if(state.diagnostic){syncVisual();return snapshot();}
    if(!dt||state.phase==='idle'){syncVisual();return snapshot();}
    state.elapsed+=dt;
    if(state.phase==='closing'){
      state.progress=Math.min(1,state.elapsed/1.25);
      state.openness=1-state.progress;
      if(state.progress>=1){state.phase='moving';state.elapsed=0;state.progress=0;state.openness=0;
        if(hooks.cue)hooks.cue('move');}
    } else if(state.phase==='moving'){
      state.progress=Math.min(1,state.elapsed/state.duration);
      const a=byKey(state.sourceKey).level,b=byKey(state.targetKey).level;
      state.display=shownLevel(a+(b-a)*state.progress);
      state.openness=0;
      if(state.progress>=1){state.phase='opening';state.elapsed=0;state.progress=0;
        state.currentKey=state.targetKey;state.display=byKey(state.targetKey).display;
        if(hooks.cue)hooks.cue('arrive');}
    } else if(state.phase==='opening'){
      state.progress=Math.min(1,state.elapsed/1.25);state.openness=state.progress;
      if(state.progress>=1){state.phase='arrive';state.elapsed=0;state.progress=1;state.openness=1;}
    } else if(state.phase==='arrive'&&state.elapsed>=.55&&!arriveFired){
      arriveFired=true;state.phase='idle';state.sourceKey=state.targetKey;state.direction=0;
      state.elapsed=0;state.duration=0;state.progress=0;state.openness=1;
      syncVisual();if(!state.diagnostic&&hooks.arrive)hooks.arrive(state.currentKey);
      return snapshot();
    }
    syncVisual();return snapshot();
  }
  function landingOpen(key,near){
    if(state.phase==='idle')return key===state.currentKey&&near?1:0;
    if((state.phase==='opening'||state.phase==='arrive')&&key===state.targetKey)return state.openness;
    return 0;
  }
  function safeLanding(){
    let key=state.currentKey;
    if(state.phase==='closing')key=state.sourceKey;
    else if(state.phase==='moving')key=state.progress>=.5?state.targetKey:state.sourceKey;
    else if(state.phase==='opening'||state.phase==='arrive')key=state.targetKey;
    if(!valid(key))key='hotel';
    return {key,at:{x:15.55,z:-3.70,yaw:-Math.PI/2}};
  }
  function toSave(){const q=safeLanding();return {v:1,currentKey:q.key,phase:'landing'};}
  function restore(s){
    // Loading is allowed to interrupt a live ride.  syncLanding intentionally refuses that during
    // play, but using it here left the old moving controller alive while the saved body resumed on
    // a landing.  Force the optional save extension to one deterministic, open, solid-floor state.
    const key=s&&valid(s.currentKey)?s.currentKey:'hotel';
    state.currentKey=state.sourceKey=state.targetKey=key;
    state.phase='idle';state.direction=0;state.openness=1;state.progress=0;
    state.elapsed=0;state.duration=0;state.display=byKey(key).display;state.diagnostic=false;
    arriveFired=true;syncVisual();return snapshot();
  }
  function diagnostic(phase='moving',progress=.5,sourceKey='hotel',targetKey='hotel12'){
    if(!valid(sourceKey)||!valid(targetKey))return snapshot();
    const a=byKey(sourceKey),b=byKey(targetKey),p=Math.max(0,Math.min(1,progress));
    state.currentKey=phase==='opening'||phase==='arrive'?targetKey:sourceKey;
    state.sourceKey=sourceKey;state.targetKey=targetKey;state.phase=phase;
    state.direction=Math.sign(b.level-a.level);state.duration=rideSeconds(sourceKey,targetKey);
    state.progress=p;state.elapsed=phase==='moving'?state.duration*p:1.25*p;
    state.openness=phase==='closing'?1-p:phase==='opening'||phase==='arrive'?p:phase==='idle'?1:0;
    state.display=phase==='moving'?shownLevel(a.level+(b.level-a.level)*p):
      (phase==='opening'||phase==='arrive'?b.display:a.display);
    state.diagnostic=true;arriveFired=true;syncVisual();return snapshot();
  }

  try{Glyphs.need('京华大酒店客梯运行中即将到达到达开门关门上行下行层服务梯轿厢请勿倚靠B1234567890');}catch(_){}

  const scene=Lazy('HotelLiftScene',()=>{
    const col={
      stone:C('#80766a'),stoneL:C('#b7aa96'),walnut:C('#49362d'),bronze:C('#a17a43'),
      bronzeD:C('#5d452d'),bronzeL:C('#d4ad68'),steel:C('#85898a'),glass:C('#8ca1a9'),
      glassD:C('#243139'),ink:C('#171a1c'),warm:C('#ffe2a6'),red:C('#9d3028'),
      celadon:C('#789b8e'),white:C('#f4eddf'),carpet:C('#443b39'),
    };
    const B=Build.scene({wood:new Set([col.walnut]),fabricGloss:.035});
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,glow,thing}=B;
    const hidden=M.trs(0,-80,0,0,.001,.001,.001),doorParts=[],displayGroups={},landingGroups={};
    const rememberGroup=(map,key,arr)=>map[key]=arr.map(p=>{
      // finish() freezes cull centres after construction.  These groups are initially parked at
      // y=-80, so without an authored fixed bound their *hidden* position becomes their permanent
      // cull position: restoring the matrix later still never submits the glyph.  Preserve the
      // real bound before visual(snapshot()) parks inactive floors.
      const m0=p.m;
      p.fixed=true;p.cx=m0[12];p.cy=m0[13];p.cz=m0[14];
      const sx=Math.hypot(m0[0],m0[1],m0[2]),sy=Math.hypot(m0[4],m0[5],m0[6]),
        sz=Math.hypot(m0[8],m0[9],m0[10]);
      p.r=.5*Math.hypot(sx,sy,sz);
      return {p,m0};
    });

    // ---------------------------------------------------------------- actual car
    flat(0,.010,0,3.25,3.20,col.stone,{mode:7,gloss:.25,mat:'tile',matScale:.55,matAmt:.26});
    // A flush three-part medallion breaks up the stone field with a genuinely rounded centrepiece.
    // The pieces are only millimetres thick and carry no body collider.
    cyl(0,.018,.25,.76,.012,col.bronzeD,{hard:true,gloss:.62,tag:'轿厢'});
    cyl(0,.025,.25,.61,.012,col.stoneL,{hard:true,gloss:.22,tag:'轿厢'});
    cyl(0,.032,.25,.20,.012,col.celadon,{hard:true,gloss:.36,tag:'轿厢'});
    // Walnut side panels in bronze frames; a dark mirror at the rear is intentionally suggested,
    // not a fake real-time reflection.
    box(-1.57,1.42,0,.12,2.84,3.18,col.walnut,{hard:true,mode:6,gloss:.34,tag:'轿厢'});
    box(1.57,1.42,0,.12,2.84,3.18,col.walnut,{hard:true,mode:6,gloss:.34,tag:'轿厢'});
    box(0,1.42,1.57,3.16,2.84,.12,col.bronzeD,{hard:true,gloss:.58,tag:'镜子'});
    box(0,1.48,1.49,2.86,2.45,.035,col.glassD,{hard:true,mode:1,alpha:.72,gloss:.86,tag:'镜子'});
    // The hotel mark and paired sconces sit on the mirror as a restrained focal composition.
    // Their shallow depth preserves the usable car envelope.
    for(const s of [-1,1]) {
      cyl(s*1.08,2.05,1.43,.022,.12,col.bronzeD,
        {rx:Math.PI/2,gloss:.64,tag:'轿厢'});
      ball(s*1.08,2.13,1.40,.075,.11,.045,col.warm,
        {mode:1,glow:.20,gloss:.20,tag:'轿厢'});
    }
    box(0,2.18,1.455,1.56,.42,.025,col.ink,
      {hard:true,mode:1,alpha:.68,gloss:.54,tag:'轿厢'});
    glyphs(0,2.18,1.438,Math.PI,'京华大酒店',
      {size:.105,gap:.020,color:col.bronzeL,mode:1,glow:.12,lift:.006,tag:'轿厢'});
    // Continuous rails have flat, machined ends and visible wall brackets.  The old capsules were
    // mathematically attached but their stretched caps read as unsupported gold needles.
    for(const side of [-1,1]) {
      cyl(side*1.42,.92,.60,.045,1.65,col.bronze,
        {rx:Math.PI/2,gloss:.70,tag:'扶手'});
      for(const z of [.05,.60,1.15]) {
        cyl(side*1.49,.92,z,.030,.16,col.bronzeD,
          {rz:Math.PI/2,gloss:.60,tag:'扶手'});
        cyl(side*1.555,.92,z,.075,.025,col.bronze,
          {rz:Math.PI/2,gloss:.66,tag:'扶手'});
      }
    }
    cyl(0,.92,1.36,.045,2.65,col.bronze,{rz:Math.PI/2,gloss:.70,tag:'扶手'});
    for(const x of [-.88,0,.88]) {
      cyl(x,.92,1.46,.030,.20,col.bronzeD,{rx:Math.PI/2,gloss:.60,tag:'扶手'});
      cyl(x,.92,1.555,.075,.025,col.bronze,{rx:Math.PI/2,gloss:.66,tag:'扶手'});
    }
    // Bronze panel rails and celadon insets subdivide the walnut walls into finished millwork.
    for(const side of [-1,1]) {
      for(const z of [-1.04,0,1.04]) box(side*1.505,1.62,z,.035,2.22,.025,col.bronzeD,
        {hard:true,gloss:.60,tag:'轿厢'});
      box(side*1.49,1.74,-.52,.025,.86,.78,col.celadon,
        {hard:true,mode:1,alpha:.22,gloss:.44,tag:'轿厢'});
    }
    box(0,2.88,0,3.18,.14,3.18,col.stoneL,{hard:true,gloss:.20,tag:'轿厢'});
    // Warm cove lines conceal the ceiling-to-wall seam and give the car useful depth at night.
    for(const side of [-1,1]) {
      box(side*1.47,2.75,0,.035,.045,2.64,col.warm,
        {hard:true,mode:1,glow:.18,tag:'轿厢'});
      box(0,2.75,side*1.42,2.72,.045,.035,col.warm,
        {hard:true,mode:1,glow:.18,tag:'轿厢'});
      // Matching ankle-level strips turn the side panels into floating millwork instead of slabs.
      box(side*1.49,.18,.20,.025,.045,2.20,col.warm,
        {hard:true,mode:1,glow:.10,tag:'轿厢'});
    }
    for(const x of [-.86,0,.86])for(const z of [-.86,0,.86]){
      box(x,2.792,z,.42,.018,.42,col.bronzeD,{hard:true,gloss:.54,tag:'轿厢'});
      const p=box(x,2.78,z,.32,.025,.32,col.warm,{hard:true,mode:1,glow:.23,tag:'轿厢'});
      p._phase=(x+z)*1.7;
    }
    glow(M.trs(0,.025,0,0,3.0,1,3.0),col.warm,.12);

    // Door throat and two bronze-faced moving leaves. They have no pick or body collider: the car
    // controller, not stale construction bounds, owns whether the opening is passable.
    // A portal, not a bronze wall.  The first version put one opaque 3.20 x 2.92 slab behind the
    // moving leaves, so the doors animated correctly but opened onto metal.  Side jambs and a
    // header preserve the frame while leaving a real sightline to the modeled destination lobby.
    box(0,2.84,-1.60,3.20,.18,.16,col.bronzeD,{hard:true,gloss:.62,tag:'电梯门'});
    box(-1.48,1.46,-1.60,.24,2.92,.16,col.bronzeD,{hard:true,gloss:.62,tag:'电梯门'});
    box(1.48,1.46,-1.60,.24,2.92,.16,col.bronzeD,{hard:true,gloss:.62,tag:'电梯门'});
    box(-1.26,1.46,-1.69,.46,2.74,.10,col.bronze,{hard:true,gloss:.66,tag:'电梯门'});
    box(1.26,1.46,-1.69,.46,2.74,.10,col.bronze,{hard:true,gloss:.66,tag:'电梯门'});
    for(const s of [-1,1]){
      const p=box(s*.61,1.46,-1.73,1.18,2.72,.055,col.steel,
        {hard:true,gloss:.76,tag:'电梯门'});
      p.ob=null;p.fixed=true;p.cx=s*.94;p.cy=1.46;p.cz=-1.73;p.r=1.75;
      doorParts.push({p,s,m0:p.m});
      box(s*1.39,1.47,-1.74,.035,2.80,.07,col.bronzeL,{hard:true,gloss:.72,tag:'电梯门'});
    }

    // ---------------------------------------------------------------- control panel and bilingual indicator
    box(1.445,1.45,.08,.055,2.30,.78,col.bronzeD,{hard:true,gloss:.62,tag:'操作盘'});
    box(1.405,2.37,.08,.025,.44,.76,col.ink,{hard:true,mode:1,glow:.05,tag:'操作盘'});
    const displayTexts=['B1',...Array.from({length:12},(_,i)=>String(i+1))];
    for(const s of displayTexts)rememberGroup(displayGroups,s,glyphs(1.375,2.38,.13,-Math.PI/2,s,
      {size:s.length>1?.16:.23,gap:.018,color:col.bronzeL,mode:1,glow:.38,lift:.006,tag:'操作盘'}));
    // Direction chevrons beside the number.
    const up=displayGroups.UP=[{p:box(1.37,2.40,-.18,.025,.19,.19,col.celadon,{hard:true,ry:Math.PI/4,mode:1,glow:.28,tag:'操作盘'}),m0:null}];
    up[0].m0=up[0].p.m;
    const down=displayGroups.DOWN=[{p:box(1.37,2.34,.38,.025,.19,.19,col.red,{hard:true,ry:Math.PI/4,mode:1,glow:.28,tag:'操作盘'}),m0:null}];
    down[0].m0=down[0].p.m;
    glyphs(1.38,2.69,.08,-Math.PI/2,'客梯',{size:.095,gap:.018,color:col.white,mode:1,lift:.006,tag:'操作盘'});
    // Chinese stays primary and the stop labels are language-neutral digits, but the panel was the
    // one fixture in the car claiming to be bilingual with nothing English on it.
    glyphs(1.375,2.60,.08,-Math.PI/2,'PASSENGER LIFT',
      {size:.036,gap:.008,color:col.stoneL,mode:1,lift:.005,tag:'操作盘'});
    // Thirteen truthful stop buttons: B1 and every physical floor from 1 through 12. Three
    // measured columns fit the existing panel without shrinking two-digit labels to noise.
    HOTEL_FLOORS.forEach((f,i)=>{
      const row=i%5,colNo=Math.floor(i/5),y=1.96-row*.31,z=-.20+colNo*.28;
      cyl(1.385,y,z,.065,.025,col.stoneL,{rz:Math.PI/2,gloss:.42,tag:'操作盘'});
      glyphs(1.365,y,z,-Math.PI/2,f.display,{size:f.display.length>1?.046:.061,gap:.003,color:col.ink,mode:1,lift:.004,tag:'操作盘'});
    });
    // Emergency key, call button and a small speaker grille complete the lower control panel.
    cyl(1.385,.55,-.11,.060,.025,col.red,{rz:Math.PI/2,gloss:.44,tag:'操作盘'});
    cyl(1.385,.55,.13,.060,.025,col.celadon,{rz:Math.PI/2,gloss:.44,tag:'操作盘'});
    for(const y of [.47,.55,.63])for(const z of [.31,.39])
      cyl(1.383,y,z,.012,.026,col.ink,{rz:Math.PI/2,gloss:.12,tag:'操作盘'});
    glyphs(1.37,.37,.08,-Math.PI/2,'请勿倚靠',{size:.070,gap:.012,color:col.stoneL,mode:1,lift:.005,tag:'操作盘'});
    thing('操作盘',1.38,1.48,.08,'操作盘显示楼层、方向和运行状态。',
      'The panel shows the floor, direction and live travel state.',
      '操作盘 is a control panel. 上行 is going up; 下行 is going down.',
      {tag:'操作盘',focus:[.72,.08],reach:1.35});

    // ---------------------------------------------------------------- real landing beyond the opening
    flat(0,.005,-4.00,7.4,4.7,col.stoneL,{mode:7,gloss:.18,tag:'电梯厅'});
    flat(0,.014,-4.05,5.55,2.45,col.carpet,{mode:7,gloss:.05,tag:'电梯厅'});
    flat(0,.018,-4.05,5.10,2.02,col.stoneL,{mode:7,gloss:.12,tag:'电梯厅'});
    box(0,1.55,-6.25,7.5,3.10,.18,col.walnut,{hard:true,mode:6,gloss:.28,tag:'电梯厅'});
    // The landing had no ceiling. The car's own slab stops at z +1.59 and the door head at y 2.93,
    // so from eye height the top of the opening framed the clear colour — a black band across the
    // upper third of HT-LIFT-arrive, above a landing that is otherwise fully modeled. One slab and
    // its cove close it. It sits above the back wall's 3.10 m head, out of every camera path.
    box(0,3.18,-4.00,7.6,.20,5.20,col.stoneL,{hard:true,gloss:.14,tag:'电梯厅'});
    box(0,3.02,-4.00,7.2,.055,.045,col.warm,{hard:true,mode:1,glow:.14,tag:'电梯厅'});
    for(const x of [-2.45,0,2.45]){
      box(x,1.48,-6.12,1.85,2.75,.08,col.steel,{hard:true,gloss:.62,tag:'电梯厅'});
      box(x,3.02,-6.14,2.15,.16,.12,col.bronzeD,{hard:true,gloss:.60,tag:'电梯厅'});
    }
    // Layered wall rails and two luminous sconces make the destination read as a finished hotel
    // landing even before the player crosses the threshold.
    box(0,.46,-6.04,6.72,.12,.055,col.bronzeD,{hard:true,gloss:.60,tag:'电梯厅'});
    box(0,.60,-6.035,6.52,.11,.035,col.stoneL,{hard:true,gloss:.20,tag:'电梯厅'});
    for(const x of [-1.48,1.48]) {
      cyl(x,2.18,-6.00,.035,.18,col.bronzeD,
        {rx:Math.PI/2,gloss:.64,tag:'电梯厅'});
      ball(x,2.31,-5.95,.17,.23,.12,col.warm,
        {mode:1,glow:.20,gloss:.20,tag:'电梯厅'});
    }
    box(-3.22,1.68,-5.98,.10,2.65,1.05,col.bronzeD,{hard:true,gloss:.58,tag:'电梯厅'});
    for(const f of HOTEL_FLOORS) {
      const floorAccent=C(f.accent);
      rememberGroup(landingGroups,f.key,[
        // A restrained colour rail changes with the destination. Two rounded terminals keep the
        // identity line from reading as another unsupported rectangular sign.
        box(0,2.13,-6.045,4.46,.055,.025,floorAccent,
          {hard:true,mode:1,glow:.065,gloss:.46,tag:'电梯厅'}),
        ball(-2.27,2.13,-6.025,.13,.13,.032,floorAccent,
          {mode:1,glow:.08,gloss:.38,tag:'电梯厅'}),
        ball(2.27,2.13,-6.025,.13,.13,.032,floorAccent,
          {mode:1,glow:.08,gloss:.38,tag:'电梯厅'}),
        ...glyphs(-3.30,1.70,-5.98,Math.PI/2,`${f.display} · ${f.short}`,
          {size:.11,gap:.020,color:col.bronzeL,mode:1,glow:.06,lift:.007,tag:'电梯厅'}),
        // This header faces the car.  The side directory is useful once a guest steps out, but was
        // edge-on through the opening and could not prove which destination had arrived.
        ...glyphs(0,2.48,-6.02,0,`${f.display}F · ${f.short}`,
          {size:.22,gap:.050,color:col.bronzeL,mode:1,glow:.16,lift:.008,tag:'电梯厅'}),
      ]);
    }
    for(const x of [-2.7,2.7]){
      box(x,.07,-3.95,.58,.14,.58,col.bronzeD,{hard:true,gloss:.48,tag:'绿化'});
      taper(x,.30,-3.95,.62,.52,.62,col.stone,{gloss:.18,tag:'绿化'});
      box(x,.57,-3.95,.52,.08,.52,col.bronze,{hard:true,gloss:.54,tag:'绿化'});
      capsule(x,.93,-3.95,.075,.72,.075,col.bronzeD,{gloss:.30,tag:'绿化'});
      for(const q of [-1,1]) capsule(x+q*.14,1.16,-3.95,.045,.48,.045,col.bronzeD,
        {rz:q*.52,gloss:.28,tag:'绿化'});
      ball(x-.24,1.35,-3.95,.30,.24,.28,col.celadon,{mode:15,gloss:.10,tag:'绿化'});
      ball(x+.25,1.39,-3.95,.32,.26,.29,col.celadon,{mode:15,gloss:.10,tag:'绿化'});
      ball(x,1.57,-3.95,.34,.27,.31,col.celadon,{mode:15,gloss:.10,tag:'绿化'});
    }
    blocker(-3.8,3.8,-6.5,-6.0,3.4);

    let last=0;
    visual=s=>{
      const open=s.openness;
      for(const q of doorParts)q.p.m=M.mul(M.trans(q.s*.88*open,0,0),q.m0);
      for(const key in displayGroups){
        const show=key===s.display||(key==='UP'&&s.direction>0)||(key==='DOWN'&&s.direction<0);
        for(const q of displayGroups[key])q.p.m=show?q.m0:hidden;
      }
      const landing=s.phase==='opening'||s.phase==='arrive'||s.phase==='idle'?s.targetKey:s.sourceKey;
      for(const key in landingGroups)for(const q of landingGroups[key])q.p.m=key===landing?q.m0:hidden;
    };
    visual(snapshot());
    function tick(t){
      const dt=last?Math.min(.20,Math.max(0,t-last)):0;last=t;
      advance(dt);
      // Small independent light flutter while the motor is loaded. It reads as machinery without
      // moving the room or camera and costs nine scalar writes only in this scene.
      const moving=state.phase==='moving'?1:0;
      for(const p of B.props)if(p._phase!==undefined)p.glow=.21+moving*(.025*Math.sin(t*8+p._phase));
    }
    return B.finish({tick,indoor:true,cutaway:true,winOn:false,near:.045,far:24,expose:1.06,
      label:'京华大酒店客梯',labelK:'京华大酒店 · 客梯轿厢',camera:{pitch:.29,dist:3.75,lookY:1.20},
      // `ceil` is the one camera limit this room was missing. game.js's `inLift` shortcut keys off
      // `room.id === 'lift'`, which is the office tower's car and not this one, so the hotel car
      // goes through the ordinary solver: `clearWall` never bites here (the car is far shallower
      // than the 3.75 m orbit, so the eye sits outside it and sees in through the single-sided
      // rear wall, which is the framing this scene is designed around), but the ceiling limit is
      // continuous and did not exist. Without it a pitch past ~0.44 rad put the eye inside the
      // 2.81 m ceiling slab. At the authored pitch of 0.29 the limit computes to 5.59 m against a
      // 3.75 m orbit, so it changes nothing you can see and only bites when the player looks up.
      spawn:{x:0,z:.72,yaw:Math.PI},zones:[{id:'hotelLift',x0:-1.30,x1:1.30,z0:-1.35,z1:1.35,ceil:2.80,light:[0,2.65,0]}],
      roomAt(){return this.zones[0];},hotelLiftState:snapshot});
  });

  return {scene,bind,begin,advance,state:snapshot,syncLanding,landingOpen,safeLanding,toSave,restore,
          diagnostic,rideSeconds,FLOORS:floors};
})();
