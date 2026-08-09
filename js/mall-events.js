// Modular retained atrium-event library.
//
// The mall scene owns rendering and the shared six-person audience. This file owns only five
// declarative, brand-free layouts inside one 2.7 × 3.0 m footprint. A layout is inert data until
// mall.js turns each descriptor into an existing primitive and hands it to the existing eventPart
// visibility controller; no template can add a collider, light, callback, actor or path.
const MallEvents=(()=>{
  const FOOTPRINT=Object.freeze({x0:-1.35,x1:1.35,z0:4.20,z1:7.20,y0:.02,y1:2.80});
  const PROGRAMS=Object.freeze({
    launch:Object.freeze({key:'launch',short:'首发',hz:'新品首发会',py:'xīnpǐn shǒufā huì',en:'new-product launch'}),
    signing:Object.freeze({key:'signing',short:'签售',hz:'作者签售会',py:'zuòzhě qiānshòu huì',en:'author signing'}),
    cooking:Object.freeze({key:'cooking',short:'烹饪',hz:'现场烹饪课',py:'xiànchǎng pēngrèn kè',en:'live cooking class'}),
    craft:Object.freeze({key:'craft',short:'手作',hz:'亲子手作坊',py:'qīnzǐ shǒuzuò fāng',en:'family craft workshop'}),
    esports:Object.freeze({key:'esports',short:'电竞',hz:'商场电竞赛',py:'shāngchǎng diànjìng sài',en:'mall esports match'}),
  });
  // Monday preserves the original three hero programmes and Saturday preserves the dated 10:00
  // fitness announcement. The five modular templates rotate through the remaining public slots.
  const WEEK=Object.freeze([
    Object.freeze(['fitness','fashion','lights']),
    Object.freeze(['launch','signing','lights']),
    Object.freeze(['fitness','cooking','esports']),
    Object.freeze(['craft','launch','fashion']),
    Object.freeze(['signing','cooking','lights']),
    Object.freeze(['fitness','craft','esports']),
    Object.freeze(['launch','signing','cooking']),
  ]);
  // The public event camera approaches from the north edge (high z).  Solid kit therefore stays
  // behind the working row at z <= 5.75, while narrow, raised colour cues sit on the far edge.  The
  // old layouts put a 1.74 x 1.18 m translucent screen at z 6.78: it was the nearest object to the
  // eye, filled the capture and depth-masked everything behind it.  The remaining kits made the
  // opposite mistake: their only identifying props were low, translucent and stage-gated out of
  // the deterministic stage-zero shot.  These helpers deliberately default to solid display-kit
  // opacity; only small luminous accents opt into a lower value.
  const b=(role,x,y,z,sx,sy,sz,color,extra={})=>Object.freeze({
    shape:'box',role,x,y,z,sx,sy,sz,color,hard:true,a:.96,g:.035,...extra});
  const c=(role,x,y,z,r,h,color,extra={})=>Object.freeze({
    shape:'cyl',role,x,y,z,r,h,color,a:.95,g:.04,...extra});
  const p=(role,x,y,z,sx,sy,sz,color,extra={})=>Object.freeze({
    shape:'capsule',role,x,y,z,sx,sy,sz,color,a:.96,g:.03,...extra});
  const t=(role,x,y,z,sx,sy,sz,color,extra={})=>Object.freeze({
    shape:'taper',role,x,y,z,sx,sy,sz,color,a:.96,g:.04,...extra});
  const LAYOUTS=Object.freeze({
    launch:Object.freeze([
      b('plinth',0,.15,5.58,1.06,.22,.62,'#c9a35a'),
      t('hero-product',0,.67,5.56,.32,.82,.32,'#3f88a8',{g:.10}),
      c('beacon',-.76,.42,5.28,.10,.62,'#d45f79',{mode:1,a:.94,g:.18,phase:.2}),
      c('beacon', .76,.42,5.28,.10,.62,'#55aa98',{mode:1,a:.94,g:.18,phase:.8}),
      b('reveal-fin',-.88,1.24,4.255,.15,1.72,.07,'#b84f62'),
      b('reveal-fin', .88,1.24,4.255,.15,1.72,.07,'#397f75'),
      b('launch-header',0,2.12,4.255,1.94,.18,.07,'#223c55',{mode:1,a:.94,g:.10}),
    ]),
    signing:Object.freeze([
      b('signing-desk',0,.45,5.48,1.56,.82,.64,'#8f6844',{hard:false,round:.035,gloss:.16}),
      b('open-book',-.43,.90,5.30,.40,.055,.46,'#b83f35',{mode:7,rx:-.16}),
      b('open-book', .05,.91,5.30,.40,.055,.46,'#2b6c9e',{mode:7,rx:.13}),
      b('name-card',.52,1.06,5.34,.42,.34,.045,'#eee2cc',{mode:1,a:.94,g:.09}),
      b('book-banner',-.88,1.34,4.255,.30,1.62,.07,'#922f39'),
      b('book-banner', .88,1.34,4.255,.30,1.62,.07,'#315c86'),
      b('signing-header',0,2.24,4.255,1.98,.17,.07,'#c6a052',{mode:1,a:.94,g:.08}),
    ]),
    cooking:Object.freeze([
      b('cook-counter',0,.46,5.46,1.62,.84,.68,'#829397',{hard:false,round:.04,gloss:.28}),
      c('stock-pot',0,.96,5.35,.31,.22,'#414c52',{gloss:.42}),
      c('broth',0,1.09,5.35,.27,.055,'#d77935',{mode:1,a:.94,g:.13}),
      c('prep-bowl',-.55,.93,5.28,.16,.12,'#f4eee4'),
      c('prep-bowl', .55,.93,5.28,.16,.12,'#f4eee4'),
      p('utensil-standard',-.82,1.30,4.27,.055,1.56,.055,'#e3aa48',{gloss:.44}),
      p('utensil-standard', .82,1.30,4.27,.055,1.56,.055,'#e06f3d',{gloss:.44}),
    ]),
    craft:Object.freeze([
      b('craft-table',0,.40,5.46,1.48,.72,.92,'#997451',{hard:false,round:.04,gloss:.14}),
      b('paper',-.42,.78,5.28,.34,.035,.32,'#d45f79',{mode:7,rx:-.10}),
      b('paper', .00,.79,5.28,.34,.035,.32,'#53a1cf',{mode:7,rx:.08}),
      b('paper', .42,.80,5.28,.34,.035,.32,'#e2b83e',{mode:7,rx:-.06}),
      c('tool-caddy',0,1.02,5.18,.13,.40,'#388477',{gloss:.25}),
      t('folded-banner',-.82,1.30,4.27,.25,1.64,.07,'#71538e'),
      t('folded-banner', .82,1.30,4.27,.25,1.64,.07,'#388477'),
    ]),
    esports:Object.freeze([
      b('gaming-desk',0,.42,5.45,1.70,.76,.62,'#252b31',{hard:false,round:.045,gloss:.18}),
      b('screen',-.50,1.12,5.36,.43,.58,.055,'#2b6c9e',{mode:1,a:.94,g:.15}),
      b('screen',0,1.17,5.34,.43,.66,.055,'#71538e',{mode:1,a:.94,g:.18}),
      b('screen', .50,1.12,5.36,.43,.58,.055,'#388477',{mode:1,a:.94,g:.15}),
      b('controller-pad',-.50,.83,5.08,.30,.055,.18,'#d45f79',{gloss:.28}),
      b('controller-pad', .50,.83,5.08,.30,.055,.18,'#53a1cf',{gloss:.28}),
      b('score-header',0,2.12,4.255,1.92,.18,.07,'#d6af4a',{mode:1,a:.94,g:.14}),
    ]),
  });
  const KEYS=Object.freeze(Object.keys(PROGRAMS));
  function layout(key){
    if(!LAYOUTS[key])throw new Error(`unknown mall event template ${key}`);
    return LAYOUTS[key];
  }
  function bounds(part){
    if(part.shape==='cyl')return {x0:part.x-part.r,x1:part.x+part.r,z0:part.z-part.r,z1:part.z+part.r,
      y0:part.y-part.h/2,y1:part.y+part.h/2};
    return {x0:part.x-part.sx/2,x1:part.x+part.sx/2,z0:part.z-part.sz/2,z1:part.z+part.sz/2,
      y0:part.y-part.sy/2,y1:part.y+part.sy/2};
  }
  function validate(){
    const problems=[];
    if(KEYS.length!==5)problems.push(`expected 5 templates, got ${KEYS.length}`);
    for(const key of KEYS){
      const parts=layout(key);
      if(parts.length!==7)problems.push(`${key}: expected 7 parts, got ${parts.length}`);
      const roles=new Set();
      let raised=0,farCue=0;
      for(const part of parts){
        const q=bounds(part);roles.add(part.role);
        if(!['box','cyl','capsule','taper'].includes(part.shape))problems.push(`${key}: bad shape ${part.shape}`);
        const eps=1e-6;
        if(q.x0<FOOTPRINT.x0-eps||q.x1>FOOTPRINT.x1+eps||q.z0<FOOTPRINT.z0-eps||
           q.z1>FOOTPRINT.z1+eps||q.y0<FOOTPRINT.y0-eps||q.y1>FOOTPRINT.y1+eps)
          problems.push(`${key}/${part.role}: outside footprint`);
        if(!/^#[0-9a-f]{6}$/i.test(part.color))problems.push(`${key}/${part.role}: bad colour`);
        // A deterministic hero must show its complete identifying kit at every live phase. Stage
        // gates remain available to the three legacy shows, but made four of these five templates
        // nearly empty in their declared capture at progress 10/45.
        if(part.stage!==undefined)problems.push(`${key}/${part.role}: identifying part is stage-gated`);
        if(part.a<.90)problems.push(`${key}/${part.role}: display-kit opacity is too low`);
        if(q.y1>=1.10)raised++;
        if(part.z<=4.40&&q.y1>=1.50)farCue++;
        const frontal=part.shape==='cyl'?part.r*2*part.h:(part.sx||0)*(part.sy||0);
        if(part.z>6.10&&frontal>.20)
          problems.push(`${key}/${part.role}: large occluder sits on the camera-facing edge`);
      }
      if(roles.size<4)problems.push(`${key}: not visually distinct enough (${roles.size} roles)`);
      if(raised<3)problems.push(`${key}: fewer than three raised readable cues`);
      if(!farCue)problems.push(`${key}: no raised far-edge silhouette behind the event cast`);
    }
    const scheduled=new Set(WEEK.flat());
    for(const key of KEYS)if(!scheduled.has(key))problems.push(`${key}: absent from weekly schedule`);
    if(WEEK.length!==7||WEEK.some(day=>day.length!==3))problems.push('weekly programme is not 7 × 3');
    return {pass:!problems.length,problems,templates:KEYS.length,parts:KEYS.reduce((n,k)=>n+layout(k).length,0),
      footprint:{...FOOTPRINT}};
  }
  return Object.freeze({FOOTPRINT,PROGRAMS,WEEK,KEYS,layout,validate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MallEvents;
