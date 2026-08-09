// 公司客梯 — deterministic controller plus one physical, inspectable passenger car.
//
// Floor scenes own their two visible landing portals.  This module owns the left-hand car, ride
// timing, doors, indicator, save recovery and the hand-off hooks used by game.js.  A save made in
// any moving phase restores to the nearest safe authored landing, never into a shaft or closed
// collider.

const OfficeLift=(()=>{
  const floors=OFFICE_FLOORS;
  const alias=key=>key==='officeRF'?'officeRoof':key;
  const byKey=key=>OFFICE_FLOOR_META[alias(key)]||null;
  const valid=key=>!!byKey(key);
  const state={
    currentKey:'office1',sourceKey:'office1',targetKey:'office1',phase:'idle',direction:0,
    openness:1,progress:0,elapsed:0,duration:0,display:'1',diagnostic:false,
  };
  let hooks={},visual=null,arriveFired=true;

  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  const physicalDistance=(a,b)=>Math.abs(byKey(a).level-byKey(b).level);
  const rideSeconds=(a,b)=>valid(a)&&valid(b)?+(1.20+physicalDistance(a,b)*.64).toFixed(3):0;
  const shownLevel=v=>{
    if(v<0)return 'B1';
    const roofLevel=byKey('officeRoof').level;
    if(v>=roofLevel-.45)return 'RF';
    return String(Math.max(1,Math.min(roofLevel-1,Math.round(v))));
  };
  const snapshot=()=>Object.freeze({
    currentKey:state.currentKey,sourceKey:state.sourceKey,targetKey:state.targetKey,
    current:byKey(state.currentKey)?.display||'1',target:byKey(state.targetKey)?.display||'1',
    phase:state.phase,direction:state.direction,openness:+state.openness.toFixed(3),
    progress:+state.progress.toFixed(3),elapsed:+state.elapsed.toFixed(3),
    duration:+state.duration.toFixed(3),display:state.display,diagnostic:!!state.diagnostic,
  });
  const syncVisual=()=>{if(visual)visual(snapshot());};

  function bind(options){hooks=options||{};return OfficeLift;}
  function init(options={}){
    if(typeof options==='string'){syncLanding(options);return OfficeLift;}
    if(options&&typeof options==='object'){
      if(options.bind)bind(options.bind);
      else if(options.arrive||options.cue||options.depart)bind(options);
      if(options.currentKey)syncLanding(options.currentKey);
    }
    return OfficeLift;
  }
  function syncLanding(key){
    key=alias(key);
    if(!valid(key)||(state.phase!=='idle'&&!state.diagnostic))return false;
    const meta=byKey(key);
    state.currentKey=state.sourceKey=state.targetKey=key;state.phase='idle';state.direction=0;
    state.openness=1;state.progress=0;state.elapsed=0;state.duration=0;state.display=meta.display;
    state.diagnostic=false;arriveFired=true;syncVisual();return true;
  }
  function begin(sourceKey,targetKey){
    sourceKey=alias(sourceKey);targetKey=alias(targetKey);
    if(!valid(sourceKey)||!valid(targetKey))return 'invalid';
    if(state.phase!=='idle'&&!state.diagnostic)return 'busy';
    if(sourceKey===targetKey){syncLanding(sourceKey);return 'here';}
    const a=byKey(sourceKey),b=byKey(targetKey);
    state.currentKey=sourceKey;state.sourceKey=sourceKey;state.targetKey=targetKey;
    state.phase='closing';state.direction=Math.sign(b.level-a.level);state.openness=1;
    state.progress=0;state.elapsed=0;state.duration=rideSeconds(sourceKey,targetKey);
    state.display=a.display;state.diagnostic=false;arriveFired=false;
    syncVisual();if(hooks.depart)hooks.depart(snapshot());return true;
  }
  function call(sourceKey){
    sourceKey=alias(sourceKey);
    if(!valid(sourceKey))return 'invalid';
    if(state.phase!=='idle'&&!state.diagnostic)return 'busy';
    const ok=syncLanding(sourceKey);if(ok&&hooks.cue)hooks.cue('call');return ok;
  }
  function goTo(targetKey,sourceKey=state.currentKey){return begin(sourceKey,targetKey);}
  function advance(dt){
    dt=clamp(dt,0,.25);
    if(state.diagnostic){syncVisual();return snapshot();}
    if(!dt||state.phase==='idle'){syncVisual();return snapshot();}
    state.elapsed+=dt;
    if(state.phase==='closing'){
      state.progress=Math.min(1,state.elapsed/1.10);state.openness=1-state.progress;
      if(state.progress>=1){state.phase='moving';state.elapsed=0;state.progress=0;state.openness=0;
        if(hooks.cue)hooks.cue('move');}
    }else if(state.phase==='moving'){
      state.progress=Math.min(1,state.elapsed/Math.max(.01,state.duration));state.openness=0;
      const a=byKey(state.sourceKey),b=byKey(state.targetKey);
      state.display=shownLevel(a.level+(b.level-a.level)*state.progress);
      if(state.progress>=1){state.phase='opening';state.elapsed=0;state.progress=0;
        state.currentKey=state.targetKey;state.display=b.display;if(hooks.cue)hooks.cue('arrive');}
    }else if(state.phase==='opening'){
      state.progress=Math.min(1,state.elapsed/1.10);state.openness=state.progress;
      if(state.progress>=1){state.phase='arrive';state.elapsed=0;state.progress=1;state.openness=1;}
    }else if(state.phase==='arrive'&&state.elapsed>=.45&&!arriveFired){
      arriveFired=true;state.phase='idle';state.sourceKey=state.targetKey;state.direction=0;
      state.elapsed=0;state.duration=0;state.progress=0;state.openness=1;
      syncVisual();if(!state.diagnostic&&hooks.arrive)hooks.arrive(state.currentKey,snapshot());
      return snapshot();
    }
    syncVisual();return snapshot();
  }
  const update=advance;
  function landingOpen(key,near=true){
    key=alias(key);
    if(!valid(key))return 0;
    if(state.phase==='idle')return key===state.currentKey&&near?1:0;
    if(state.phase==='closing'&&key===state.sourceKey)return state.openness;
    if((state.phase==='opening'||state.phase==='arrive')&&key===state.targetKey)return state.openness;
    return 0;
  }
  function safeLanding(){
    let key=state.currentKey;
    if(state.phase==='closing')key=state.sourceKey;
    else if(state.phase==='moving')key=state.progress>=.5?state.targetKey:state.sourceKey;
    else if(state.phase==='opening'||state.phase==='arrive')key=state.targetKey;
    if(!valid(key))key='office1';
    return {key,place:key,at:{...OFFICE_CORE.landing}};
  }
  const getSafeLanding=safeLanding;
  const getSafeSpawn=()=>safeLanding().at;
  function toSave(){const q=safeLanding();return {v:1,currentKey:q.key,phase:'landing'};}
  const saveState=toSave;
  function restore(saved){
    const candidate=alias(saved&&(saved.currentKey||saved.key||saved.place));
    const key=valid(candidate)?candidate:'office1',meta=byKey(key);
    state.currentKey=state.sourceKey=state.targetKey=key;state.phase='idle';state.direction=0;
    state.openness=1;state.progress=0;state.elapsed=0;state.duration=0;state.display=meta.display;
    state.diagnostic=false;arriveFired=true;syncVisual();return snapshot();
  }
  const restoreState=restore;
  function diagnostic(phase='moving',progress=.5,sourceKey='office1',targetKey='officeRoof'){
    sourceKey=alias(sourceKey);targetKey=alias(targetKey);
    if(!valid(sourceKey)||!valid(targetKey))return snapshot();
    if(!['idle','closing','moving','opening','arrive'].includes(phase))phase='moving';
    const a=byKey(sourceKey),b=byKey(targetKey),p=clamp(progress);
    state.sourceKey=sourceKey;state.targetKey=targetKey;
    state.currentKey=phase==='opening'||phase==='arrive'?targetKey:sourceKey;
    state.phase=phase;state.direction=Math.sign(b.level-a.level);state.duration=rideSeconds(sourceKey,targetKey);
    state.progress=p;state.elapsed=phase==='moving'?state.duration*p:1.10*p;
    state.openness=phase==='closing'?1-p:phase==='opening'||phase==='arrive'?p:phase==='idle'?1:0;
    state.display=phase==='moving'?shownLevel(a.level+(b.level-a.level)*p):
      (phase==='opening'||phase==='arrive'?b.display:a.display);
    state.diagnostic=true;arriveFired=true;syncVisual();return snapshot();
  }
  function reset(key='office1'){restore({currentKey:key});return snapshot();}
  function debug(){return {state:snapshot(),safe:safeLanding(),floors:floors.map(f=>({
    key:f.key,display:f.display,level:f.level,order:f.order})),car:{x:-1,doorZ:4.12},
    landing:{...OFFICE_CORE.landing}};}

  try{Glyphs.need('公司客梯运行中即将到达开门关门上行下行层操作盘镜子扶手电梯厅请勿倚靠地下一二三四五六七屋顶高层管理' +
    '紧急呼叫对讲机载重千克十三人监控中禁止吸烟注意安全检修B1RF12345671000kg13');}catch(_){}

  const scene=Lazy('OfficeTowerLiftScene',()=>{
    const col={
      steel:C('#9aa1a5'),steelD:C('#596166'),steelL:C('#c8cdcf'),ink:C('#171d20'),
      floor:C('#4b5154'),glass:C('#9cb7c2'),warm:C('#ffe2a8'),white:C('#f2f1ea'),
      accent:C('#3e7380'),accentL:C('#6ca3ad'),red:C('#a84238'),wood:C('#5d4838'),screen:C('#17272d'),
      wall:C('#c8c4bb'),wallD:C('#817e78'),green:C('#5f8168'),stone:C('#b8b7b1'),
      rubber:C('#2f3538'),blue:C('#476f8a'),brass:C('#9c8050'),
    };
    const B=Build.scene({wood:new Set([col.wood]),fabricGloss:.035});
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,glow,thing}=B;
    const hidden=M.trs(0,-80,0,0,.001,.001,.001),doorParts=[],displayGroups={},buttonGroups={},landingGroups={};
    const remember=(map,key,parts)=>map[key]=parts.map(p=>{
      const m0=p.m;p.fixed=true;p.cx=m0[12];p.cy=m0[13];p.cz=m0[14];
      const sx=Math.hypot(m0[0],m0[1],m0[2]),sy=Math.hypot(m0[4],m0[5],m0[6]),
        sz=Math.hypot(m0[8],m0[9],m0[10]);p.r=.5*Math.hypot(sx,sy,sz);return {p,m0};
    });

    // ---------------------------------------------------------------- physical car
    flat(0,.010,0,2.46,2.78,col.floor,{mode:7,gloss:.16,mat:'tile',matScale:.42,matAmt:.24,tag:'轿厢'});
    flat(0,.017,0,2.18,2.48,col.stone,{mode:7,gloss:.22,mat:'tile',matScale:.38,matAmt:.20,tag:'轿厢'});
    // Stainless perimeter, threshold and fine tile joints establish a manufactured floor build-up.
    for(const x of [-1.13,1.13])flat(x,.022,0,.075,2.64,col.steelL,{mode:1,gloss:.66,tag:'轿厢'});
    for(const z of [-1.24,1.24])flat(0,.022,z,2.24,.075,col.steelL,{mode:1,gloss:.66,tag:'轿厢'});
    for(const x of [-.73,0,.73])flat(x,.024,0,.014,2.38,col.rubber,{mode:1,alpha:.42,tag:'轿厢'});
    for(const z of [-.80,0,.80])flat(0,.024,z,2.08,.014,col.rubber,{mode:1,alpha:.42,tag:'轿厢'});
    box(-1.20,1.42,0,.12,2.84,2.78,col.steelD,{hard:true,gloss:.54,tag:'轿厢'});
    box(1.20,1.42,0,.12,2.84,2.78,col.steelD,{hard:true,gloss:.54,tag:'轿厢'});
    box(0,1.42,1.34,2.40,2.84,.10,col.wood,{hard:true,mode:6,gloss:.26,tag:'轿厢'});
    box(0,1.58,1.285,2.08,2.18,.028,col.glass,{hard:true,mode:1,alpha:.23,gloss:.86,tag:'镜子'});
    // Side-wall cassettes, lower kick rails and shadow joints turn the steel shells into finished
    // replaceable panels.  They are only a few centimetres proud of the original walls.
    for(const side of [-1,1]){
      box(side*1.125,.17,0,.026,.28,2.48,col.rubber,{hard:true,gloss:.18,tag:'轿厢'});
      for(const z of [-.86,0,.86]){
        box(side*1.127,1.62,z,.026,1.54,.72,col.wall,
          {hard:true,mode:14,gloss:.18,tag:'轿厢'});
        box(side*1.108,1.62,z,.014,1.39,.60,col.stone,
          {hard:true,mode:1,gloss:.24,tag:'轿厢'});
      }
      box(side*1.108,2.48,0,.014,.42,2.42,col.steel,
        {hard:true,mode:1,gloss:.52,tag:'轿厢'});
      for(const z of [-1.18,-.59,0,.59,1.18])box(side*1.096,2.48,z,.012,.22,.025,col.rubber,
        {hard:true,mode:1,tag:'轿厢'});
    }
    // Framed rear mirror with a timber dado and visible corner trims.
    box(0,.36,1.268,2.10,.58,.035,col.wood,{hard:true,mode:6,gloss:.30,tag:'轿厢'});
    for(const x of [-1.07,1.07])box(x,1.57,1.248,.055,2.26,.050,col.steelL,
      {hard:true,gloss:.68,tag:'镜子'});
    for(const y of [.47,2.69])box(0,y,1.248,2.18,.055,.050,col.steelL,
      {hard:true,gloss:.68,tag:'镜子'});
    box(0,2.82,0,2.42,.13,2.78,col.steelL,{hard:true,gloss:.30,tag:'轿厢'});
    box(0,2.755,0,1.78,.025,2.10,col.stone,{hard:true,gloss:.22,tag:'天花'});
    for(const x of [-1.07,1.07])box(x,2.748,0,.055,.035,2.46,col.ink,{hard:true,gloss:.18,tag:'天花'});
    for(const z of [-1.19,1.19])box(0,2.748,z,2.14,.035,.055,col.ink,{hard:true,gloss:.18,tag:'天花'});
    for(const x of [-.68,0,.68])for(const z of [-.67,.18,.88]){
      box(x,2.745,z,.37,.022,.37,col.steelD,{hard:true,gloss:.50,tag:'照明'});
      const p=box(x,2.725,z,.29,.026,.29,col.warm,{hard:true,mode:1,glow:.22,tag:'照明'});
      p._phase=x*2.1+z*1.7;
    }
    glow(M.trs(0,.022,0,0,2.2,1,2.45),col.warm,.10);
    // Continuous rails and their wall brackets.
    for(const side of [-1,1]){
      cyl(side*1.08,.92,.20,.040,1.75,col.steelL,{rx:Math.PI/2,gloss:.68,tag:'扶手'});
      for(const z of [-.48,.20,.88]){
        cyl(side*1.14,.92,z,.025,.14,col.steelD,{rz:Math.PI/2,gloss:.56,tag:'扶手'});
        cyl(side*1.105,.92,z,.068,.022,col.steelL,{rz:Math.PI/2,gloss:.66,tag:'扶手'});
      }
    }
    cyl(0,.92,1.18,.040,2.0,col.steelL,{rz:Math.PI/2,gloss:.68,tag:'扶手'});
    for(const x of [-.72,0,.72]){
      cyl(x,.92,1.235,.025,.14,col.steelD,{rx:Math.PI/2,gloss:.56,tag:'扶手'});
      cyl(x,.92,1.205,.068,.022,col.steelL,{rx:Math.PI/2,gloss:.66,tag:'扶手'});
    }
    // Capacity certificate on the left wall and a compact CCTV dome in the rear corner.
    box(-1.105,1.94,-.74,.022,.56,.56,col.ink,{hard:true,gloss:.24,tag:'轿厢'});
    box(-1.086,1.94,-.74,.012,.49,.49,col.white,{hard:true,mode:1,tag:'轿厢'});
    glyphs(-1.075,2.06,-.74,Math.PI/2,'载重 1000kg',{size:.048,gap:.006,color:col.ink,mode:1,lift:.005,tag:'轿厢'});
    glyphs(-1.075,1.86,-.74,Math.PI/2,'13人',{size:.060,gap:.008,color:col.ink,mode:1,lift:.005,tag:'轿厢'});
    cyl(-.94,2.63,1.06,.12,.10,col.ink,{rz:.28,rx:.20,gloss:.38,tag:'监控'});
    ball(-.91,2.58,1.00,.09,.07,.09,col.glass,{mode:1,alpha:.48,gloss:.86,tag:'监控'});
    ball(-.89,2.56,.98,.025,.025,.025,col.red,{mode:1,glow:.18,tag:'监控'});

    // Front portal and animated centre-opening leaves.
    const movingCarDoor=(p,s)=>{
      p.ob=null;p.fixed=true;p.cx=p.m[12];p.cy=p.m[13];p.cz=p.m[14];p.r=1.66;
      doorParts.push({p,s,m0:p.m});return p;
    };
    box(0,1.43,-1.505,2.25,2.76,.045,col.ink,{hard:true,gloss:.12,tag:'电梯门'});
    box(0,2.76,-1.40,2.45,.18,.16,col.steelD,{hard:true,gloss:.62,tag:'电梯门'});
    box(0,2.825,-1.48,2.30,.045,.10,col.steelL,{hard:true,gloss:.72,tag:'电梯门'});
    for(const s of [-1,1])box(s*1.12,1.42,-1.40,.22,2.84,.16,col.steelD,
      {hard:true,gloss:.62,tag:'电梯门'});
    for(const s of [-1,1])box(s*1.005,1.43,-1.48,.035,2.72,.065,col.steelL,
      {hard:true,gloss:.72,tag:'电梯门'});
    for(const s of [-1,1]){
      movingCarDoor(box(s*.52,1.43,-1.46,.98,2.68,.055,col.steel,
        {hard:true,gloss:.73,tag:'电梯门'}),s);
      movingCarDoor(box(s*.035,1.43,-1.498,.028,2.60,.022,col.rubber,
        {hard:true,gloss:.18,tag:'电梯门'}),s);
      movingCarDoor(box(s*.52,.38,-1.500,.84,.026,.020,col.steelL,
        {hard:true,gloss:.72,tag:'电梯门'}),s);
      movingCarDoor(box(s*.52,1.10,-1.501,.76,.050,.020,col.accent,
        {hard:true,mode:1,alpha:.62,glow:.035,tag:'电梯门'}),s);
    }
    flat(0,.030,-1.405,2.28,.38,col.steelD,{mode:1,gloss:.72,tag:'电梯门'});
    for(const x of [-.74,-.37,0,.37,.74])flat(x,.033,-1.39,.016,.31,col.rubber,
      {mode:1,alpha:.74,tag:'电梯门'});
    const doorBarrier=solid(-1.08,1.08,-1.50,-1.30);
    solid(-1.31,-1.10,-1.44,1.46);solid(1.10,1.31,-1.44,1.46);solid(-1.31,1.31,1.30,1.49);

    // ---------------------------------------------------------------- live control panel
    box(1.105,1.47,.10,.055,2.28,.66,col.ink,{hard:true,gloss:.26,tag:'操作盘'});
    box(1.073,1.47,.10,.016,2.16,.58,col.steelD,{hard:true,gloss:.58,tag:'操作盘'});
    box(1.070,2.34,.10,.024,.42,.58,col.screen,{hard:true,mode:1,glow:.055,tag:'操作盘'});
    glyphs(1.045,2.64,.10,-Math.PI/2,'客梯',{size:.075,gap:.014,color:col.steelL,mode:1,lift:.005,tag:'操作盘'});
    for(const f of floors)remember(displayGroups,f.display,glyphs(1.05,2.34,.18,-Math.PI/2,f.display,
      {size:f.display.length>1?.12:.20,color:col.white,mode:1,glow:.28,lift:.006,tag:'操作盘'}));
    remember(displayGroups,'UP',[box(1.048,2.39,-.10,.018,.13,.13,col.accentL,
      {hard:true,ry:Math.PI/4,mode:1,glow:.26,tag:'操作盘'})]);
    remember(displayGroups,'DOWN',[box(1.048,2.29,-.10,.018,.13,.13,col.red,
      {hard:true,ry:Math.PI/4,mode:1,glow:.24,tag:'操作盘'})]);
    floors.forEach((f,i)=>{
      const row=Math.floor(i/3),column=i%3,y=1.91-row*.36,z=-.10+column*.20;
      cyl(1.064,y,z,.075,.025,col.steelL,{rz:Math.PI/2,gloss:.48,tag:'操作盘'});
      glyphs(1.045,y,z,-Math.PI/2,f.display,{size:f.display.length>1?.045:.066,gap:.003,
        color:col.ink,mode:1,lift:.004,tag:'操作盘'});
      remember(buttonGroups,f.key,[cyl(1.040,y,z,.020,.010,col.accentL,
        {rz:Math.PI/2,mode:1,glow:.24,tag:'操作盘'})]);
    });
    // Door controls, alarm and intercom occupy the service zone below the nine truthful stops.
    for(const [z,label] of [[-.10,'开'],[.14,'关']]){
      cyl(1.063,.68,z,.068,.024,col.steelL,{rz:Math.PI/2,gloss:.50,tag:'操作盘'});
      glyphs(1.043,.68,z,-Math.PI/2,label,{size:.048,color:col.ink,mode:1,lift:.004,tag:'操作盘'});
    }
    cyl(1.062,.43,-.10,.060,.024,col.red,{rz:Math.PI/2,mode:1,glow:.05,tag:'紧急呼叫'});
    glyphs(1.043,.43,-.10,-Math.PI/2,'紧急',{size:.033,gap:.004,color:col.white,mode:1,lift:.004,tag:'紧急呼叫'});
    for(const y of [.38,.47])for(const z of [.08,.16,.24])cyl(1.043,y,z,.014,.010,col.rubber,
      {rz:Math.PI/2,tag:'对讲机'});
    box(1.043,.30,.15,.014,.055,.25,col.accent,{hard:true,mode:1,glow:.035,tag:'操作盘'});
    glyphs(-1.075,.33,-.02,Math.PI/2,'请勿倚靠',{size:.052,gap:.008,color:col.steelL,mode:1,lift:.005,tag:'电梯门'});
    const panel=thing('操作盘',1.05,1.42,.10,'操作盘显示楼层、方向和实时运行状态。',
      'The panel shows every office floor, direction and live travel state.',
      '操作盘 is a control panel. 上行 is going up; 下行 is going down.',
      {tag:'操作盘',focus:[.42,.10],reach:1.25});
    panel.officeFloor='officeLift';panel.officeAction='lift-panel';

    // ---------------------------------------------------------------- destination landing beyond the car
    flat(0,.008,-3.55,6.4,4.1,col.wall,{mode:7,gloss:.12,mat:'tile',matScale:.55,matAmt:.20,tag:'电梯厅'});
    flat(0,.014,-3.55,4.6,1.75,col.floor,{mode:7,gloss:.06,tag:'电梯厅'});
    flat(0,.019,-3.55,4.32,1.52,col.stone,{mode:7,gloss:.18,mat:'tile',matScale:.42,matAmt:.18,tag:'电梯厅'});
    for(const x of [-1.44,0,1.44])flat(x,.023,-3.55,.015,1.44,col.wallD,
      {mode:1,alpha:.36,tag:'电梯厅'});
    for(const z of [-4.00,-3.50,-3.00])flat(0,.023,z,4.22,.015,col.wallD,
      {mode:1,alpha:.34,tag:'电梯厅'});
    for(const x of [-2.18,2.18])flat(x,.025,-3.55,.045,1.60,col.accent,
      {mode:1,alpha:.72,glow:.018,tag:'电梯厅'});
    // The landing has its own ceiling and linear light slots, visible during the open-door dwell.
    box(0,3.08,-3.55,6.45,.13,4.10,col.white,{hard:true,gloss:.16,tag:'电梯厅'});
    for(const x of [-1.85,0,1.85]){
      box(x,3.00,-3.58,1.18,.035,.14,col.ink,{hard:true,gloss:.18,tag:'照明'});
      box(x,2.978,-3.58,.98,.018,.060,col.warm,{hard:true,mode:1,glow:.22,tag:'照明'});
    }
    glow(M.trs(0,.018,-3.55,0,5.6,1,3.6),col.warm,.055);
    box(0,1.55,-5.55,6.5,3.10,.16,col.wallD,{hard:true,mode:14,tag:'电梯厅'});
    for(const x of [-2.15,0,2.15])box(x,1.52,-5.445,1.82,2.72,.035,col.stone,
      {hard:true,mode:14,gloss:.18,tag:'电梯厅'});
    for(const x of [-3.08,-1.08,1.08,3.08])box(x,1.52,-5.410,.035,2.68,.035,col.steelD,
      {hard:true,gloss:.54,tag:'电梯厅'});
    box(0,.14,-5.400,6.18,.22,.045,col.rubber,{hard:true,gloss:.18,tag:'电梯厅'});
    box(0,3.02,-5.400,6.18,.18,.055,col.accent,{hard:true,mode:1,glow:.035,tag:'电梯厅'});
    box(0,2.54,-5.394,3.86,.54,.050,col.ink,{hard:true,mode:1,glow:.025,tag:'电梯厅'});
    box(-2.28,1.60,-5.392,1.15,.45,.046,col.white,{hard:true,mode:1,tag:'电梯厅'});
    for(const f of floors){
      const mark=f.display==='RF'?'RF':f.display==='B1'?'B1':`${f.display}F`;
      remember(landingGroups,f.key,[
        ...glyphs(0,2.54,-5.358,0,`${mark} · ${f.short}`,
          {size:.17,gap:.036,color:col.white,mode:1,glow:.10,lift:.008,tag:'电梯厅'}),
        ...glyphs(-2.28,1.60,-5.357,0,f.hz,
          {size:.115,gap:.024,color:col.ink,mode:1,lift:.008,tag:'电梯厅'}),
      ]);
    }
    // A small emergency-wayfinding blade makes the generic landing useful even before hand-off.
    box(2.30,1.60,-5.392,1.20,.45,.046,col.green,{hard:true,mode:1,glow:.028,tag:'电梯厅'});
    glyphs(2.30,1.60,-5.357,0,'安全出口',{size:.080,gap:.016,color:col.white,mode:1,glow:.045,lift:.007,tag:'电梯厅'});
    for(const x of [-2.45,2.45]){
      box(x,.10,-4.55,.66,.16,.66,col.steelD,{hard:true,gloss:.46,tag:'绿化'});
      taper(x,.28,-4.55,.62,.54,.62,col.wallD,{tag:'绿化'});
      box(x,.56,-4.55,.54,.06,.54,col.steelL,{hard:true,gloss:.58,tag:'绿化'});
      capsule(x,.88,-4.55,.065,.82,.065,col.wood,{tag:'绿化'});
      for(let i=0;i<4;i++)ball(x+Math.sin(i*1.7)*.20,1.22+(i%2)*.20,-4.55+Math.cos(i*1.7)*.16,
        .30,.23,.28,col.green,{mode:15,tag:'绿化'});
    }
    solid(-3.35,-3.05,-5.75,-1.25);solid(3.05,3.35,-5.75,-1.25);solid(-3.35,3.35,-5.75,-5.45);
    blocker(-3.42,3.42,-5.82,-5.36,3.45);

    visual=s=>{
      const open=s.openness;doorBarrier.open=open>.62;
      for(const q of doorParts)q.p.m=M.mul(M.trans(q.s*.72*open,0,0),q.m0);
      for(const key in displayGroups){
        const show=key===s.display||(key==='UP'&&s.direction>0)||(key==='DOWN'&&s.direction<0);
        for(const q of displayGroups[key])q.p.m=show?q.m0:hidden;
      }
      const selected=s.phase==='idle'?s.currentKey:s.targetKey;
      for(const key in buttonGroups)for(const q of buttonGroups[key])q.p.m=key===selected?q.m0:hidden;
      const landing=s.phase==='opening'||s.phase==='arrive'||s.phase==='idle'?s.targetKey:s.sourceKey;
      for(const key in landingGroups)for(const q of landingGroups[key])q.p.m=key===landing?q.m0:hidden;
    };
    visual(snapshot());
    let last=0;
    function tick(t){const dt=last?Math.min(.20,Math.max(0,t-last)):0;last=t;advance(dt);
      const moving=state.phase==='moving'?1:0;
      for(const p of B.props)if(p._phase!==undefined)p.glow=.20+moving*(.025*Math.sin(t*8+p._phase));}
    return B.finish({tick,indoor:true,cutaway:true,winOn:false,near:.045,far:22,expose:1.08,
      label:'公司客梯',labelK:'公司大楼 · 客梯轿厢',camera:{pitch:.28,dist:3.55,maxDist:3.9,lookY:1.18},
      spawn:{x:0,z:.48,yaw:Math.PI},zones:[{id:'officeLift',x0:-1.08,x1:1.08,z0:-1.60,z1:1.24,
        light:[0,2.55,0]},{id:'officeLiftLanding',x0:-3.0,x1:3.0,z0:-5.38,z1:-1.25,light:[0,2.65,-3.5]}],
      roomAt(x,z){return z<-1.5?this.zones[1]:this.zones[0];},officeLiftState:snapshot});
  });

  return Object.freeze({scene,init,bind,begin,call,goTo,advance,update,state:snapshot,syncLanding,
    landingOpen,safeLanding,getSafeLanding,getSafeSpawn,toSave,saveState,restore,restoreState,
    diagnostic,reset,debug,rideSeconds,FLOORS:floors});
})();

const OfficeLiftScene=OfficeLift.scene;
