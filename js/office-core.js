// 公司大楼 · OFFICE COMPLEX
//
// Shared measured architecture for the workplace tower.  Department files own the useful rooms
// north of the circulation spine and register them through OfficeFit; this file owns the 24 x 18 m
// envelope, daylight wall, south service band, vertical circulation and stable floor metadata.
//
// The canonical workplace place remains `office` on F4 for legacy saves.  The old single-room
// Office scene may coexist while the complex is wired into game.js: the replacement fourth-floor
// Lazy scene is exported as Office4/OfficeScenes.office instead of redeclaring global `Office`.

const OFFICE_OUT = Object.freeze({ x:39.4, z:2.20, yaw:-Math.PI/2 });

const OFFICE_FLOORS = Object.freeze([
  Object.freeze({key:'officeB1',lazy:'OfficeB1',display:'B1',level:-1,order:0,
    hz:'地下一层',py:'dìxià yì céng',en:'building operations',short:'后勤运营',
    programme:'收发货 · 自行车库 · 设备间 · 员工更衣',accent:'#58756e',floor:'#727a78'}),
  Object.freeze({key:'office1',lazy:'Office1',display:'1',level:1,order:1,
    hz:'一楼',py:'yī lóu',en:'reception and arrival',short:'前台接待',
    programme:'大堂 · 安保 · 前台 · 收发室 · 咖啡吧',accent:'#a64536',floor:'#8c8177'}),
  Object.freeze({key:'office2',lazy:'Office2',display:'2',level:2,order:2,
    hz:'二楼',py:'èr lóu',en:'accounting and audit',short:'财务部',
    programme:'会计 · 报销 · 预算 · 审计',accent:'#3e6f91',floor:'#6f7881'}),
  Object.freeze({key:'office3',lazy:'Office3',display:'3',level:3,order:3,
    hz:'三楼',py:'sān lóu',en:'legal and compliance',short:'法务部',
    programme:'合同 · 案件 · 法律图书室 · 合规',accent:'#765493',floor:'#6b6873'}),
  Object.freeze({key:'office',lazy:'Office4',display:'4',level:4,order:4,
    hz:'四楼',py:'sì lóu',en:'Beijing Culture Media workplace',short:'北京文化传媒',
    programme:'开放工位 · 玩家办公桌 · 打印室 · 茶水间',accent:'#3f7564',floor:'#707276'}),
  Object.freeze({key:'office5',lazy:'Office5',display:'5',level:5,order:5,
    hz:'五楼',py:'wǔ lóu',en:'creative production',short:'创意制作',
    programme:'摄影棚 · 录音间 · 剪辑室 · 器材库',accent:'#976536',floor:'#777069'}),
  Object.freeze({key:'office6',lazy:'Office6',display:'6',level:6,order:6,
    hz:'六楼',py:'liù lóu',en:'conference, learning and recovery',short:'会议培训',
    programme:'会议中心 · 培训室 · 食堂 · 休息恢复',accent:'#965f31',floor:'#7f7668'}),
  Object.freeze({key:'office7',lazy:'Office7',display:'7',level:7,order:7,
    hz:'七楼',py:'qī lóu',en:'executive management',short:'高层管理',
    programme:'总经理办公室 · 董事会议室 · 战略室 · 行政支持',accent:'#485f7c',floor:'#74747a'}),
  Object.freeze({key:'officeRoof',lazy:'OfficeRoof',display:'RF',level:8,order:8,
    hz:'屋顶层',py:'wūdǐng céng',en:'roof workplace',short:'屋顶花园',
    programme:'屋顶花园 · 户外工作台 · 光伏设备 · 机房',accent:'#58765a',floor:'#747873'}),
]);

const OFFICE_FLOOR_ORDER = Object.freeze(OFFICE_FLOORS.map(f=>f.key));
const OFFICE_FLOOR_META = Object.freeze(Object.fromEntries(OFFICE_FLOORS.map(f=>[f.key,f])));
// All public floor keys eventually index an ordinary object. Saved data and diagnostic calls are
// input, so inherited names (`__proto__`, `constructor`, `toString`) must never become floors.
const officeOwn=(object,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(object,key);
// Action ids also index ordinary per-floor objects. Reject Object-prototype names (including the
// `__proto__` setter) plus the otherwise-dangerous registry name `prototype`, while leaving every
// authored hyphenated/Chinese action id valid.
const officeSafeOwnKey=key=>typeof key==='string'&&key.trim().length>0&&key!=='prototype'&&
  !Object.prototype.hasOwnProperty.call(Object.prototype,key);

const OFFICE_CORE = Object.freeze({
  RX:12,RZ:9,H:3.45,
  daylight:Object.freeze({z:-9}),
  spine:Object.freeze({z0:2.2,z1:4.0,width:1.8}),
  band:Object.freeze({z0:4.0,z1:9.0}),
  cells:Object.freeze({
    stairA:Object.freeze({x0:-12,x1:-9,door:-10.5}),
    janitor:Object.freeze({x0:-9,x1:-6,door:-8.05}),
    wc:Object.freeze({x0:-6,x1:-2,doors:Object.freeze([-5.05,-3.15])}),
    passenger:Object.freeze({x0:-2,x1:2,cars:Object.freeze([-1,1]),active:-1}),
    service:Object.freeze({x0:2,x1:6,car:4}),
    mep:Object.freeze({x0:6,x1:9,door:7.55}),
    stairB:Object.freeze({x0:9,x1:12,door:10.5}),
  }),
  landing:Object.freeze({x:-1,z:2.85,yaw:0}),
  liftDoorZ:4.12,
  stairFocusZ:2.85,
  tags:Object.freeze(['门','电梯','楼梯','楼层索引','卫生间','服务电梯','安全出口']),
});

const OFFICE_ROUTES = Object.freeze(Object.fromEntries(OFFICE_FLOORS.map(f=>[f.key,Object.freeze({
  lift:Object.freeze([-1,2.85]),stairA:Object.freeze([-10.5,2.85]),
  stairB:Object.freeze([10.5,2.85]),spine:Object.freeze([[-10.5,3.1],[-1,3.1],[10.5,3.1]]),
  street:f.key==='office1'?Object.freeze([0,-7.55]):null,
})])));

const OfficeCast = [];
const OfficeUse = Object.fromEntries(OFFICE_FLOORS.map(f=>[f.key,{}]));
OfficeUse.officeRF=OfficeUse.officeRoof; // compatibility with the provisional blueprint key
OfficeUse.officeLift={};

// Floor builders can be assigned directly (`OfficeFit.office2 = fn`) or composed in order.
const OfficeFit = {};
Object.defineProperties(OfficeFit,{
  register:{enumerable:false,value(key,fn){
    if(key==='officeRF')key='officeRoof';
    if(!officeOwn(OFFICE_FLOOR_META,key))throw new Error('OfficeFit: unknown floor '+key);
    if(typeof fn!=='function')throw new Error('OfficeFit: '+key+' builder is not a function');
    const old=officeOwn(OfficeFit,key)?OfficeFit[key]:null;
    OfficeFit[key]=!old?fn:Array.isArray(old)?old.concat(fn):[old,fn];
    return fn;
  }},
  builders:{enumerable:false,value(key){
    if(key==='officeRF')key='officeRoof';
    const q=officeOwn(OfficeFit,key)?OfficeFit[key]:
      key==='officeRoof'&&officeOwn(OfficeFit,'officeRF')?OfficeFit.officeRF:null;
    return !q?[]:Array.isArray(q)?q.slice():[q];
  }},
});

try{
  Glyphs.need('公司大楼地下一层二三四五六七屋顶后勤运营前台接待客户会议媒体制作项目办公人事财务员工生活花园高层管理' +
    '电梯客梯服务楼梯安全出口楼层索引卫生间无障碍清洁间设备间请勿倚靠运行中到达上行下行' +
    '男女残疾人方向安全门常闭防火载重禁止通行注意服务通道');
}catch(_){}

// The forward shader owns eight local-light slots.  Every floor used to author between fourteen
// and thirty-two emitters and leave game.js to choose the nearest eight every frame.  That made a
// perfectly stationary fitting trade shader slots with its neighbour as the camera crossed a
// distance tie.  Keep the luminous fixture geometry -- it is the visible ceiling rhythm -- but
// deliver one fixed, building-wide lighting plan to the renderer.  Indoors the six broad base
// emitters establish the same gradient on every storey and two deliberately balanced accents keep
// each department distinctive.  The roof has no ceiling grid, so it uses eight broad zone volumes
// aligned with its pavilion, garden, plant, terrace and two arrival approaches.
const OFFICE_LIGHT_LIMIT=8;
const OFFICE_LIGHT_ACCENT_TARGETS=Object.freeze({
  officeB1:Object.freeze([[-9.00,-5.65],[8.80,-5.60]]),
  office1:Object.freeze([[-9.30,-5.35],[9.30,-4.95]]),
  office2:Object.freeze([[-9.50,-5.70],[9.50,-5.70]]),
  office3:Object.freeze([[-8.66,-6.85],[9.10,-6.85]]),
  office:Object.freeze([[-9.30,-7.85],[10.60,-7.40]]),
  office5:Object.freeze([[9.50,-4.25],[-10.106,-4.358]]),
  office6:Object.freeze([[-9.00,-5.30],[9.50,-5.30]]),
  office7:Object.freeze([[-10.98,-7.20],[8.24,-.15]]),
});
const OFFICE_ROOF_LIGHT_PLAN=Object.freeze([
  Object.freeze({id:'pergola',x:-8.00,y:2.50,z:-5.50,col:[1,.82,.62],power:.20,radius:5.60}),
  Object.freeze({id:'garden',x:0,y:2.50,z:-5.50,col:[1,.82,.62],power:.20,radius:5.60}),
  Object.freeze({id:'plant',x:8.50,y:3.00,z:-6.60,col:[.92,.96,1],power:.24,radius:5.60}),
  Object.freeze({id:'west-deck',x:-8.00,y:2.50,z:-.30,col:[1,.82,.62],power:.18,radius:5.60}),
  Object.freeze({id:'arrival',x:0,y:2.50,z:-.30,col:[1,.82,.62],power:.18,radius:5.60}),
  Object.freeze({id:'terrace',x:8.50,y:2.50,z:-.30,col:[1,.82,.62],power:.18,radius:5.60}),
  Object.freeze({id:'west-spine',x:-7.50,y:2.80,z:2.90,col:[.92,.96,1],power:.20,radius:5.60}),
  Object.freeze({id:'east-spine',x:7.50,y:2.80,z:2.90,col:[.92,.96,1],power:.20,radius:5.60}),
]);

const OfficeCore=(()=>{
  const {RX,RZ,H}=OFFICE_CORE;
  const scenes={};
  const metaFor=key=>officeOwn(OFFICE_FLOOR_META,key)?OFFICE_FLOOR_META[key]:null;
  const keyFor=value=>{
    if(value==='officeRF')return 'officeRoof';
    if(officeOwn(OFFICE_FLOOR_META,value))return value;
    if(Number.isInteger(value))return OFFICE_FLOORS.find(f=>f.level===value)?.key||null;
    return null;
  };

  function createFloorContext(key){
    const meta=metaFor(key);
    if(!meta)throw new Error('OfficeCore: unknown floor '+key);
    const Cc=hex=>C(hex);
    const col={
      floor:Cc(meta.floor),floorD:Cc('#5a6062'),wall:Cc('#d9d7d0'),wallD:Cc('#aaa8a1'),
      ceiling:Cc('#efeee9'),trim:Cc('#b7b5ae'),steel:Cc('#a8afb3'),steelD:Cc('#6d7479'),
      steelL:Cc('#d4d8d8'),
      glass:Cc('#a8c4d2'),ink:Cc('#20272b'),white:Cc('#f5f4ee'),warm:Cc('#ffe6b0'),
      accent:Cc(meta.accent),accentD:Cc('#374c52'),red:Cc('#a63c32'),green:Cc('#4d745b'),
      blue:Cc('#426c8b'),wood:Cc('#8a6b4a'),woodD:Cc('#594534'),screen:Cc('#182128'),
      carpet:Cc('#62686d'),stone:Cc('#c8c6bf'),stoneD:Cc('#8f918f'),
      brass:Cc('#9a7d47'),rubber:Cc('#303638'),
    };
    const B=Build.scene({wood:new Set([col.wood,col.woodD]),fabricGloss:.04});
    const {box,cyl,ball,capsule,taper,wall,flat,glyphs,solid,blocker,shade,glow,thing}=B;
    const ticks=[],lit=[],rooms=[],officeMountedAssemblyManifest=[];
    const dollhouseCeilingProps=[];
    const state={floor:key,landing:{open:0,near:false},entrance:{open:key==='office1'?1:0,near:false}};
    const onTick=fn=>{if(typeof fn==='function')ticks.push(fn);return fn;};
    const luminous=(p,day=.04,night=.25)=>{p.glow=day;lit.push({p,day,night});return p;};
    const dollhouseCeiling=(...items)=>{
      const add=value=>{
        if(Array.isArray(value))for(const q of value)add(q);
        else if(value&&typeof value==='object'){
          value.dollhouseCeiling=true;dollhouseCeilingProps.push(value);
        }
      };
      for(const item of items)add(item);
      return items.length===1?items[0]:items;
    };
    const light=(...args)=>B.light(...args);
    const tagOpt=(tag,o={})=>tag?{...o,tag}:o;
    // Camera visibility ownership is deliberately separate from semantic/pick tags. Local fit-outs
    // request a floor-qualified ID, stamp it while constructing props, or stamp returned prop/
    // glyph arrays after construction. The shared kernel still rejects groups over 32 members or
    // 2.8 m, so a mistaken broad ID safely falls back to per-prop cutting.
    const cameraGroup=id=>`${key}:${String(id)}`;
    const cameraOpts=(id,o={})=>({...o,cameraGroup:cameraGroup(id)});
    const groupCamera=(id,...items)=>{
      const group=cameraGroup(id);
      const stamp=value=>{
        if(Array.isArray(value))for(const q of value)stamp(q);
        else if(value&&typeof value==='object')value.cameraGroup=group;
      };
      for(const item of items)stamp(item);
      return group;
    };

    function normalizeOpenings(openings,a,b){
      return (openings||[]).map(o=>{
        if(typeof o==='number')return {c:o,w:1.25,h:2.35};
        if(Array.isArray(o))return {c:o[0],w:o[1]||1.25,h:o[2]||2.35};
        return {c:o.c===undefined?o.center:o.c,w:o.w||o.width||1.25,h:o.h||o.height||2.35};
      }).filter(o=>Number.isFinite(o.c)).map(o=>({
        a:Math.max(a,o.c-o.w/2),b:Math.min(b,o.c+o.w/2),h:Math.min(H-.10,o.h),
      })).sort((q,r)=>q.a-r.a);
    }
    function partitionZ(z,x0,x1,openings=[],color=col.wall,tag='墙',opts={}){
      const cuts=normalizeOpenings(openings,x0,x1);let at=x0;
      // Three calls, not two. `solid` stops the body; `blocker` stops the EYE, and without it the
      // chase camera slides straight through every interior wall in the building. Every surface
      // here is single-sided, so what you get is the unlit back of the wall you are standing
      // behind — reported from play as "sometimes I just see the back of a wall", and it got worse
      // the moment nine floors gained real partitions. The blocker matches the solid exactly, so
      // it is cut by the same door openings and the camera can still see through a doorway.
      // Built as two pieces through the shared `Build.partition` split: a 0.40 m stub that is
      // never flagged, and the upper part flagged `partition`, which `hiddenProp` culls when the
      // owner's walls-down setting is on. The stub is the point — with the wall gone, an opening
      // reads as a gap in the kerb, so a doorway is findable from above instead of being an
      // unmarked stretch of empty floor. Collision is untouched: `solid` and `blocker` below run
      // the same extents they always did, so the body and the eye behave identically either way.
      const segment=(a,b)=>{if(b-a<.025)return;
        B.partition(0,H,(yc,hh,dh)=>
          box((a+b)/2,yc,z,b-a,hh,.14,color,{hard:true,mode:14,gloss:.12,...tagOpt(tag,opts),...dh}));
        solid(a,b,z-.08,z+.08);
        blocker(a,b,z-.08,z+.08,H,{pad:.08});
      };
      // The panel over a door starts at the door head — 2.35 m at the default, far above the
      // 0.40 m kerb — so it has no stub of its own and is flagged whole. Left unflagged it would
      // hang in the air over every doorway once the walls beside it had gone.
      for(const q of cuts){segment(at,q.a);if(q.h<H-.04)
        box((q.a+q.b)/2,(H+q.h)/2,z,q.b-q.a,H-q.h,.14,color,
          {hard:true,mode:14,gloss:.12,...tagOpt(tag,opts),partition:true});at=Math.max(at,q.b);}
      segment(at,x1);return cuts;
    }
    function partitionX(x,z0,z1,openings=[],color=col.wall,tag='墙',opts={}){
      const cuts=normalizeOpenings(openings,z0,z1);let at=z0;
      // See partitionZ: the blocker is what keeps the camera on the player's side of the wall.
      const segment=(a,b)=>{if(b-a<.025)return;
        B.partition(0,H,(yc,hh,dh)=>
          box(x,yc,(a+b)/2,.14,hh,b-a,color,{hard:true,mode:14,gloss:.12,...tagOpt(tag,opts),...dh}));
        solid(x-.08,x+.08,a,b);
        blocker(x-.08,x+.08,a,b,H,{pad:.08});
      };
      for(const q of cuts){segment(at,q.a);if(q.h<H-.04)
        box(x,(H+q.h)/2,(q.a+q.b)/2,.14,H-q.h,q.b-q.a,color,
          {hard:true,mode:14,gloss:.12,...tagOpt(tag,opts),partition:true});at=Math.max(at,q.b);}
      segment(at,z1);return cuts;
    }
    function sign(x,y,z,yaw,text,color=col.accent,tag=text,size=.18,opts={}){
      const cg=cameraGroup(`sign:${tag}:${x.toFixed(3)}:${z.toFixed(3)}`);
      const alongX=Math.abs(Math.cos(yaw))>.5;
      box(x,y,z,alongX?Math.max(1.2,[...text].length*(size+.05)+.34):.055,.48,
        alongX?.055:Math.max(1.2,[...text].length*(size+.05)+.34),color,
        {hard:true,mode:1,glow:.018,cameraGroup:cg,...tagOpt(tag)});
      glyphs(x,y,z,yaw,text,{size,gap:size*.22,color:col.white,mode:1,lift:.035,tag,cameraGroup:cg});
      if(opts.twoSided!==false)glyphs(x,y,z,yaw+Math.PI,text,
        {size,gap:size*.22,color:col.white,mode:1,lift:.035,tag,cameraGroup:cg});
    }
    function doorPlate(x,y,z,yaw,text,tag=text,color=col.accent,opts={}){
      return sign(x,y,z,yaw,text,color,tag,.13,opts);
    }
    function room(id,x0,x1,z0,z1,focusX=(x0+x1)/2,focusZ=(z0+z1)/2,extra={}){
      if(Array.isArray(focusX)){extra=focusZ&&typeof focusZ==='object'?focusZ:extra;
        [focusX,focusZ]=focusX;}
      const q={id,x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),
        z1:Math.max(z0,z1),focus:[focusX,focusZ],light:[(x0+x1)/2,H-.35,(z0+z1)/2],
        // Camera `ceil` is an eye limit. Stop below the slab and the lowest recessed track/fixture
        // underside; H-.08 parked high-pitch eyes inside opaque ceiling geometry.
        ...(key==='officeRoof'?{}:{ceil:H-.26}),...extra};
      rooms.push(q);return q;
    }
    const cameraRoom=room;
    function officeThing(actionId,hz,x,y,z,sentence,tr,note,o={}){
      const q=thing(hz,x,y,z,sentence,tr,note,o);q.officeFloor=key;
      if(actionId)q.officeAction=actionId;return q;
    }

    // Small shared furniture primitives keep every department on the same scale while allowing
    // its fit-out to supply its own palette and arrangement.
    function furnitureSolid(x,z,w,d,ry=0,inset=0){
      const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));
      const hx=Math.max(.04,(c*w+s*d)/2-inset),hz=Math.max(.04,(s*w+c*d)/2-inset);
      return solid(x-hx,x+hx,z-hz,z+hz);
    }
    function chair(x,z,ry=0,color=col.accentD,tag){
      const cg=cameraGroup(`chair:${tag||'chair'}:${x.toFixed(3)}:${z.toFixed(3)}`);
      const fx=Math.sin(ry),fz=Math.cos(ry);
      box(x,.46,z,.48,.09,.48,color,{ry,mode:7,cameraGroup:cg,...tagOpt(tag)});
      // +sin/+cos is the sitter's forward direction throughout game.js.  The chair back belongs
      // behind that vector; the old fixed z+.21 offset detached on quarter-turns and put the back
      // in front of a sitter at yaw 0.
      box(x-fx*.21,.78,z-fz*.21,.46,.58,.08,color,
        {ry,mode:7,cameraGroup:cg,...tagOpt(tag)});
      cyl(x,.24,z,.035,.42,col.steelD,{cameraGroup:cg,...tagOpt(tag)});
      for(let i=0;i<5;i++){const a=ry+i*1.257;
        box(x+Math.sin(a)*.17,.04,z+Math.cos(a)*.17,
          .07,.04,.30,col.steelD,{hard:true,ry:a,cameraGroup:cg,...tagOpt(tag)});}
      // Player-radius expansion joins these halves into one physical chair, while the hairline
      // pivot remains available to an authored seated NPC.  The tiny boss covers the rendered
      // centre for geometry audits but is narrower than the NPC penetration tolerance.
      solid(x-.24,x-.025,z-.24,z+.24);solid(x+.025,x+.24,z-.24,z+.24);
      solid(x-.020,x+.020,z-.020,z+.020);
    }
    function desk(x,z,w=1.5,d=.72,ry=0,tag){
      const cg=cameraGroup(`desk:${tag||'desk'}:${x.toFixed(3)}:${z.toFixed(3)}`);
      const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
      box(x,.74,z,w,.07,d,col.wood,
        {ry,gloss:.22,mat:'wood',matScale:.8,matAmt:.22,cameraGroup:cg,...tagOpt(tag)});
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const u=sx*(w/2-.08),v=sz*(d/2-.07);
        box(x+rx*u+fx*v,.37,z+rz*u+fz*v,.055,.70,.055,col.steelD,
          {hard:true,ry,cameraGroup:cg,...tagOpt(tag)});
      }
      const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));
      shade(x,z,c*(w+.12)+s*(d+.18),s*(w+.12)+c*(d+.18),.18);
      furnitureSolid(x,z,w,d,ry,.015);
    }
    function cabinet(x,z,w=1.2,h=1.8,d=.42,ry=0,tag){
      const cg=cameraGroup(`cabinet:${tag||'cabinet'}:${x.toFixed(3)}:${z.toFixed(3)}`);
      const rx=Math.cos(ry),rz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
      box(x,h/2,z,w,h,d,col.wallD,
        {hard:true,ry,gloss:.20,cameraGroup:cg,...tagOpt(tag)});
      for(const sx of [-1,1])box(x+rx*sx*w*.25-fx*d*.51,h/2,
        z+rz*sx*w*.25-fz*d*.51,.035,h-.16,.025,col.steelD,
        {hard:true,ry,gloss:.48,cameraGroup:cg,...tagOpt(tag)});
      furnitureSolid(x,z,w,d,ry,.01);
    }
    function plant(x,z,s=.7,tag='绿化'){
      const cg=cameraGroup(`plant:${tag}:${x.toFixed(3)}:${z.toFixed(3)}`);
      taper(x,.26,z,.56*s,.50*s,.56*s,col.woodD,{tag,cameraGroup:cg});
      capsule(x,.72*s,z,.06*s,.75*s,.06*s,col.woodD,{tag,cameraGroup:cg});
      for(let i=0;i<5;i++)ball(x+Math.sin(i*2.1)*.20*s,.92*s+((i%2)*.17*s),
        z+Math.cos(i*2.1)*.20*s,.34*s,.25*s,.30*s,col.green,
        {mode:15,tag,cameraGroup:cg});
      furnitureSolid(x,z,.48*s,.48*s,0,.01);
    }

    return {B,box,cyl,ball,capsule,taper,wall,flat,glyphs,solid,blocker,shade,glow,light,thing,
      RX,RZ,H,key,floor:key,meta,C:Cc,col,accent:col.accent,levels:OFFICE_FLOORS,
      routes:OFFICE_ROUTES,route:OFFICE_ROUTES[key],core:OFFICE_CORE,state,
      partition:B.partition,partitionElement:B.partitionElement,dollhouseCeiling,
      onTick,luminous,partitionZ,partitionX,sign,doorPlate,room,cameraRoom,officeThing,
      furnitureSolid,chair,desk,cabinet,plant,cameraGroup,cameraOpts,groupCamera,
      officeMountedAssemblyManifest,_dollhouseCeilingProps:dollhouseCeilingProps,
      _ticks:ticks,_lit:lit,_rooms:rooms};
  }

  function buildShell(A){
    const {B,box,cyl,taper,flat,glyphs,solid,blocker,shade,glow,light,thing,
      RX,RZ,H,key,meta,col,onTick,luminous,dollhouseCeiling,state,officeThing,cameraGroup}=A;

    // ---------------------------------------------------------------- envelope + daylight
    // The floor plate is untagged, so `hiddenProp` falls back to judging it by its own centre at
    // (0,0) — and cuts the whole 24 x 18 m slab away as one prop whenever that point is behind the
    // wall the camera backed out through. Both F5 and F1 hit the same shape of bug on their own
    // floor decals and fixed it the same way. Only masked here because most fits lay their own
    // floor over the top; a floor that does not gets a hole where the building should be.
    flat(0,.006,0,RX*2,RZ*2,col.floor,{mode:7,nocut:true,gloss:.09,mat:'fabric',matScale:.46,matAmt:.18});
    flat(0,.011,3.10,RX*2-.28,1.80,col.floorD,{mode:7,gloss:.08,tag:'走廊'});
    for(const x of [-8,-4,0,4,8])flat(x,.015,3.10,.025,1.72,col.accent,{mode:1,alpha:.44,tag:'走廊'});
    // A durable porcelain apron announces the passenger bank without narrowing the protected
    // east–west route.  The hairline joints and stainless nosing are surface-only, so the walking
    // contract remains exactly the same while the lift lobby gains a believable material change.
    flat(0,.020,3.10,4.52,1.72,col.stone,
      {mode:7,gloss:.16,mat:'tile',matScale:.48,matAmt:.20,tag:'电梯厅'});
    for(const x of [-1.50,0,1.50])flat(x,.023,3.10,.018,1.64,col.stoneD,
      {mode:1,alpha:.42,tag:'电梯厅'});
    for(const z of [2.58,3.10,3.62])flat(0,.024,z,4.42,.016,col.stoneD,
      {mode:1,alpha:.36,tag:'电梯厅'});
    // The threshold crosses two lift bays.  Split it exactly at the centre seam so either car's
    // jamb and the surface directly beneath it cut as one modest, local fixture; one 4.56 m decal
    // otherwise bridged both independent cars and left a stainless strip floating in space.
    for(const s of [-1,1]){
      const cg=cameraGroup(`core-passenger-car-${s<0?0:1}`);
      flat(s*1.14,.026,3.925,2.28,.045,col.steelD,
        {mode:1,gloss:.60,tag:'电梯厅',cameraGroup:cg});
      flat(s*1.05,.028,3.885,2.10,.018,col.accent,
        {mode:1,glow:.018,tag:'电梯厅',cameraGroup:cg});
    }
    const basement=key==='officeB1',rooftop=key==='officeRoof';
    if(rooftop){
      // The roof is genuinely outdoors. A low masonry parapet and transparent wind screen keep
      // the edge safe without turning the garden back into an enclosed glazed office floor.
      // The roof-core canopy is visually continuous but camera-local in two-metre construction
      // bays. A single 24×5 m prop could only disappear as a 120 m² sheet when the eye grazed its
      // underside, defeating the shared cut's bounded-footprint promise. Exact edge joins retain
      // the same silhouette while a camera cut owns at most the bay it actually intersects.
      for(let i=0;i<12;i++){
        const x=-11+i*2;
        box(x,H-.10,6.50,2,.20,5.0,col.ceiling,
          {hard:true,gloss:.10,tag:`核心筒顶棚${i+1}`});
      }
      box(0,H/2,RZ-.08,RX*2,H,.16,col.wall,{hard:true,mode:14,tag:'核心筒'});
      for(const [side,x] of [['西',-RX+.08],['东',RX-.08]])for(let i=0;i<7;i++){
        const z0=-9+i*2,len=Math.min(2,4-z0),z=z0+len/2;
        box(x,.48,z,.16,.96,len,col.wallD,{hard:true,mode:14,tag:`女儿墙${side}${i+1}`});
        box(x,1.34,z,.055,.76,len,col.glass,
          {hard:true,mode:1,alpha:.25,gloss:.62,tag:`挡风屏${side}${i+1}`});
      }
      for(let i=0;i<12;i++){
        const x=-11+i*2;
        box(x,.48,-RZ+.08,2,.96,.16,col.wallD,
          {hard:true,mode:14,tag:`女儿墙南${i+1}`});
      }
      // The former south pane accidentally swapped height/depth (55 mm high, 760 mm deep).
      // Two-metre vertical bays restore the intended screen and keep camera cuts construction-local.
      const southPane=(RX*2-.30)/12;
      for(let i=0;i<12;i++)box(-RX+.15+southPane*(i+.5),1.34,-RZ+.05,
        southPane,.76,.055,col.glass,
        {hard:true,mode:1,alpha:.25,gloss:.62,tag:`挡风屏南${i+1}`});
      for(let x=-10.5;x<=10.5;x+=3.0)box(x,1.34,-RZ+.03,.07,.82,.12,col.steelD,
        {hard:true,gloss:.48,tag:'挡风屏'});
      solid(-RX-.15,-RX+.18,-RZ,RZ);solid(RX-.18,RX+.15,-RZ,RZ);
      solid(-RX,RX,RZ-.18,RZ+.15);solid(-RX,RX,-RZ-.15,-RZ+.18);
      blocker(-RX-.24,-RX+.20,-RZ,4.05,1.85);blocker(RX-.20,RX+.24,-RZ,4.05,1.85);
      blocker(-RX,RX,-RZ-.22,-RZ+.22,1.85);blocker(-RX,RX,RZ-.22,RZ+.26,H+.4);
      // Weatherproof linear luminaires beneath the roof core canopy.  Their dark channels give
      // the soffit the same construction language as the enclosed floors below.
      for(const x of [-7.5,-2.8,2.8,7.5]){
        box(x,H-.235,6.30,2.20,.055,.12,col.ink,{hard:true,gloss:.18,tag:'照明'});
        luminous(box(x,H-.270,6.30,1.92,.020,.050,col.white,
          {hard:true,mode:1,tag:'照明'}),.11,.36);
      }
    }else{
      // A shallow lift-header recess interrupts the otherwise continuous ceiling at the core
      // frontage.  The previous full plate passed horizontally through the complete floor-name
      // band at y=3.365, so every storey's primary wayfinding was behind the opaque soffit. Four
      // abutting slabs retain the exact ceiling footprint everywhere except this intentional cove.
      // The recess starts far enough into the public lift lobby that the real overview camera's
      // upward ray reaches the cove before it reaches the ordinary 3.25 m soffit.
      // The south edge clears the complete top/corner sightline to the floor-name band.  At
      // z=3.20 the ordinary soffit caught that legal ray at z≈3.14 despite the sign centre being
      // visible, so the cove now carries a deliberate 120 mm visual reveal before the band.
      const recessX=1.96,recessZ0=3.08,recessZ1=4.28;
      const ceilingSlab=(x,z,w,d)=>dollhouseCeiling(
        box(x,H-.10,z,w,.20,d,col.ceiling,{hard:true,nocut:true,gloss:.10,tag:'天花'}));
      ceilingSlab(0,(-RZ+recessZ0)/2,RX*2,recessZ0+RZ);
      ceilingSlab(0,(recessZ1+RZ)/2,RX*2,RZ-recessZ1);
      ceilingSlab((-RX-recessX)/2,(recessZ0+recessZ1)/2,RX-recessX,recessZ1-recessZ0);
      ceilingSlab((RX+recessX)/2,(recessZ0+recessZ1)/2,RX-recessX,recessZ1-recessZ0);
      // The cove is enclosed by a higher 25 mm soffit, not an opening into the floor above. Its
      // 175 mm reveal is deep enough to clear the wayfinding band and shallow enough to read as
      // one intentional ceiling transition from every legal lobby pitch.
      const coveCap=dollhouseCeiling(box(0,H-.0125,(recessZ0+recessZ1)/2,recessX*2,.025,
        recessZ1-recessZ0,col.ceiling,{hard:true,nocut:true,gloss:.10,tag:'天花'}));
      coveCap.officeCeilingCoveCap=true;
      coveCap.officeCeilingCoveBounds=Object.freeze({
        x0:-recessX,x1:recessX,z0:recessZ0,z1:recessZ1,
      });
      box(-RX+.08,H/2,0,.16,H,RZ*2,col.wall,{hard:true,mode:14,tag:'墙'});
      box(RX-.08,H/2,0,.16,H,RZ*2,col.wall,{hard:true,mode:14,tag:'墙'});
      box(0,H/2,RZ-.08,RX*2,H,.16,col.wall,{hard:true,mode:14,tag:'墙'});
      solid(-RX-.15,-RX+.18,-RZ,RZ);solid(RX-.18,RX+.15,-RZ,RZ);
      solid(-RX,RX,RZ-.18,RZ+.15);
      blocker(-RX-.26,-RX+.22,-RZ,RZ,H+.4);blocker(RX-.22,RX+.26,-RZ,RZ,H+.4);
      blocker(-RX,RX,RZ-.22,RZ+.26,H+.4);
      if(basement){
        box(0,H/2,-RZ+.08,RX*2,H,.16,col.wallD,{hard:true,mode:14,tag:'墙'});
        solid(-RX,RX,-RZ-.15,-RZ+.18);blocker(-RX,RX,-RZ-.24,-RZ+.22,H+.4);
      }else{
        // A continuous north curtain wall gives every department the same truthful daylight edge.
        if(key==='office1'){
          box((-RX-1.75)/2,.39,-RZ+.09,RX-1.75,.78,.18,col.wall,{hard:true,mode:14,tag:'窗'});
          box((RX+1.75)/2,.39,-RZ+.09,RX-1.75,.78,.18,col.wall,{hard:true,mode:14,tag:'窗'});
        }else box(0,.39,-RZ+.09,RX*2,.78,.18,col.wall,{hard:true,mode:14,tag:'窗'});
        box(0,H-.22,-RZ+.09,RX*2,.44,.18,col.wall,{hard:true,mode:14,tag:'窗'});
        if(key==='office1'){
          const gw=RX-1.88;
          box((-RX-1.88)/2,1.72,-RZ+.04,gw,2.18,.035,col.glass,
            {hard:true,mode:1,alpha:.34,gloss:.72,tag:'窗'});
          box((RX+1.88)/2,1.72,-RZ+.04,gw,2.18,.035,col.glass,
            {hard:true,mode:1,alpha:.34,gloss:.72,tag:'窗'});
        }else box(0,1.72,-RZ+.04,RX*2-.25,2.18,.035,col.glass,
          {hard:true,mode:1,alpha:.34,gloss:.72,tag:'窗'});
        // Sky/city layers sit outside the collision plane and are only visible through the glass.
        box(0,2.10,-RZ-.18,RX*2-.30,2.65,.025,C('#b8d0dd'),{hard:true,mode:1,glow:.055,tag:'窗'});
        box(0,.88,-RZ-.20,RX*2-.30,.78,.026,C('#8f9ca4'),{hard:true,mode:1,glow:.025,tag:'窗'});
        for(let x=-10.8,i=0;x<11;x+=1.45,i++){
          const h=.28+(i%4)*.17;
          box(x,.78+h/2,-RZ-.21,1.05,h,.030,i%2?C('#778791'):C('#84939c'),
            {hard:true,mode:1,glow:.018,tag:'窗'});
        }
        for(let x=-12;x<=12;x+=3)if(key!=='office1'||Math.abs(x)>1.9)
          box(x,1.70,-RZ+.02,.09,2.65,.12,col.steelD,{hard:true,gloss:.46,tag:'窗'});
        if(key==='office1'){
          solid(-RX,-1.75,-RZ-.15,-RZ+.18);solid(1.75,RX,-RZ-.15,-RZ+.18);
        }else solid(-RX,RX,-RZ-.15,-RZ+.18);
        blocker(-RX,RX,-RZ-.24,-RZ+.22,H+.4);
      }

      // Ceiling panels are emissive; sparse real lights establish useful surface gradients.
      for(let x=-9;x<=9;x+=3)for(const z of [-5.7,-2.0,1.15,3.45]){
        // The centre rear panel is recessed into the higher cove cap; leaving it at the ordinary
        // soffit height would make it float 155 mm below its support.
        const panelY=Math.abs(x)<.01&&z===3.45?H-.045:H-.18;
        dollhouseCeiling(luminous(box(x,panelY,z,1.15,.035,.38,col.white,
          {hard:true,mode:1,tag:'照明'}),.10,.40));
      }
      // Recessed black tracks run continuously along the circulation spine.  They visually bind
      // all seven departments to one base-build and hide the raw ceiling-panel edges in long views.
      for(const z of [2.30,3.88]){
        // The rear track stops at the lift-header cove instead of floating across its opening.
        const spans=z===3.88?[[-RX+.31,-recessX],[recessX,RX-.31]]:
          [[-RX+.31,RX-.31]];
        for(const [a,b] of spans){
          // Split the physically continuous extrusion into construction bays so a camera cut can
          // never own a 10–23 m strip. The luminous insert is also tiled, but only the two outer
          // ends retain its original 150 mm setback: internal joins abut and preserve the exact
          // authored light union without repeated dark gaps.
          const count=Math.ceil((b-a)/2.60),step=(b-a)/count;
          for(let i=0;i<count;i++){
            const u=a+i*step,v=i===count-1?b:a+(i+1)*step,x=(u+v)/2,w=v-u,
              cg=cameraGroup(`core-track:${z}:${u.toFixed(3)}:${v.toFixed(3)}`),
              lu=i===0?u+.15:u,lv=i===count-1?v-.15:v,lw=lv-lu;
            dollhouseCeiling(box(x,H-.205,z,w,.045,.075,col.ink,
              {hard:true,gloss:.20,tag:'天花',cameraGroup:cg}));
            dollhouseCeiling(luminous(box((lu+lv)/2,H-.235,z,Math.max(.08,lw),.014,.025,
              col.white,{hard:true,mode:1,tag:'照明',cameraGroup:cg}),.08,.34));
          }
        }
      }
      for(const x of [-7.5,0,7.5])for(const z of [-3.5,2.9]){
        const l=light(x,H-.36,z,[.91,.95,1],.24,5.8);l.on=true;
        l.officeRole='base';
        glow(M.trs(x,.020,z,0,5.0,1,3.4),col.warm,.025);
      }
    }

    // ---------------------------------------------------------------- south service/core band
    // Full-height cell dividers make this one repeatable building, not nine unrelated rooms.
    const dividerFrontGroups=new Map();
    for(const x of [-9,-6,-2,2,6,9]){
      // Split the rendered divider exactly by face and depth.  The front half-returns can then
      // own the base trim of the service cell on that side without linking two adjacent rooms or
      // hiding a five-metre wall as one camera fixture.  The four boxes exactly tile the original
      // .14 x 5.0 m volume; collision remains the single continuous mass below.
      const faces={};
      // Indoors, the west/east render halves are two skins of one physical divider.  Keep both
      // skins (and both pieces produced by the walls-down split) in one tight camera fixture so
      // a cut cannot leave the opposite 70 mm skin floating.  The frontage groups stay side-local
      // below: joining both neighbouring facade bays would exceed the 2.8 m fixture contract.
      // The roof preserves its original side-local ownership and unsplit geometry verbatim.
      const pairedFront=cameraGroup(`core-divider:${x}:paired:front`),
        pairedRear=cameraGroup(`core-divider:${x}:paired:rear`);
      for(const s of [-1,1]){
        const side=s<0?'west':'east';
        const front=cameraGroup(`core-divider:${x}:${side}:front`);
        faces[side]=front;
        const makeFront=(yc,hh,dh)=>box(x+s*.035,yc,5.25,.07,hh,2.50,col.wallD,
          {hard:true,mode:14,tag:'核心筒',cameraGroup:rooftop?front:pairedFront,...dh});
        if(rooftop)makeFront(H/2,H,{});else B.partition(0,H,makeFront);
        const rear=cameraGroup(`core-divider:${x}:${side}:rear`);
        const makeRear=(yc,hh,dh)=>box(x+s*.035,yc,7.75,.07,hh,2.50,col.wallD,
          {hard:true,mode:14,tag:'核心筒',cameraGroup:rooftop?rear:pairedRear,...dh});
        if(rooftop)makeRear(H/2,H,{});else B.partition(0,H,makeRear);
      }
      dividerFrontGroups.set(x,faces);
      solid(x-.08,x+.08,4.0,9.0);
      blocker(x-.08,x+.08,4.0,9.0,H+.4,{pad:.08});
    }
    flat(0,.016,6.50,RX*2,5.0,col.floorD,{mode:7,gloss:.08,tag:'核心筒'});

    const frontSlab=(x0,x1,tag,openings=[])=>{
      // A portal is an aperture in the rendered facade, even when its collision remains a
      // deliberate transition barrier.  The old monolithic slab was drawn in front of every
      // leaf: the doors could be clicked only because the invisible wall shared their tag.
      // Full-height side runs plus a lintel now describe the actual construction, while the
      // continuous solid/blocker below retains the authored transition semantics.
      const cuts=openings.map(([x,w])=>({x,
        a:Math.max(x0,x-w/2-.02),b:Math.min(x1,x+w/2+.02),w}))
        .filter(q=>q.b-q.a>.04).sort((a,b)=>a.a-b.a);
      const segments=[];
      let serial=0;
      const putRun=(ra,rb)=>{
        if(rb-ra<=.04)return;
        const count=Math.ceil((rb-ra)/2.40),step=(rb-ra)/count;
        for(let i=0;i<count;i++){
          const a=ra+i*step,b=i===count-1?rb:a+step,x=(a+b)/2;
          // At an internal core divider, the bordering wall bay and its half-return are one exact
          // construction component. Keeping each side distinct prevents a cut from chaining into
          // the neighbouring service cell.
          const left=Math.abs(a-x0)<1e-6&&dividerFrontGroups.get(x0),
            right=Math.abs(b-x1)<1e-6&&dividerFrontGroups.get(x1);
          const cg=left?left.east:right?right.west:
            cameraGroup(`core-front:${tag}:run-${serial++}:${x0.toFixed(2)}`);
          const makeWall=(yc,hh,dh)=>box(x,yc,4.10,b-a,hh,.16,col.wall,
            {hard:true,mode:14,gloss:.10,tag,cameraGroup:cg,...dh});
          const pieces=rooftop?[makeWall(H/2,H,{})]:B.partition(0,H,makeWall);
          for(const wall of pieces)if(wall)wall.officeFacadeWall=true;
          segments.push({a,b,cg});
        }
      };
      let at=x0;
      for(const [i,q] of cuts.entries()){
        putRun(at,q.a);
        const lintelBottom=2.985;
        // Wide service apertures get contiguous lintel bays. This keeps the exact facade union,
        // while the matching cornice bay below can cut with only the construction directly behind
        // it instead of chaining both sides of a four-metre frontage into one camera fixture.
        const count=Math.ceil((q.b-q.a)/2.40),step=(q.b-q.a)/count;
        for(let bay=0;bay<count;bay++){
          const a=q.a+bay*step,b=bay===count-1?q.b:q.a+(bay+1)*step,
            cg=cameraGroup(`core-front:${tag}:lintel-${i}-${bay}:${x0.toFixed(2)}`),
            lintel=box((a+b)/2,(H+lintelBottom)/2,4.10,b-a,
              H-lintelBottom,.16,col.wall,
              {hard:true,mode:14,gloss:.10,tag,
                ...(rooftop?{}:{partition:true}),cameraGroup:cg});
          lintel.officeFacadeWall=true;
          segments.push({a,b,cg,opening:true});
        }
        at=Math.max(at,q.b);
      }
      putRun(at,x1);
      // The cornice is continuous over each aperture and each wall bay, but remains split into
      // camera-local lengths. It reads as the head trim tying the portal lintels together.
      const trimCount=Math.ceil((x1-x0)/2.40),trimStep=(x1-x0)/trimCount;
      for(let i=0;i<trimCount;i++){
        const a=x0+i*trimStep,b=i===trimCount-1?x1:a+trimStep,x=(a+b)/2;
        box(x,H-.16,4.006,Math.max(.04,b-a-.05),.045,.030,col.trim,
          {hard:true,...(rooftop?{}:{partition:true}),gloss:.26,tag,
            cameraGroup:frontageGroup(segments,x,
            cameraGroup(`core-front:${tag}:cornice-${i}`))});
      }
      solid(x0,x1,4.00,4.20);
      blocker(x0,x1,4.00,4.20,H+.4,{pad:.08});
      return segments;
    };
    const frontageGroup=(segments,x,fallback)=>{
      let best=null,dist=Infinity;
      for(const q of segments||[]){
        const d=x<q.a?q.a-x:x>q.b?x-q.b:0;
        if(d<dist){dist=d;best=q;}
      }
      return best?best.cg:fallback;
    };
    const coreSkirt=(x0,x1,openings=[],tag='核心筒',segments=[])=>{
      const cuts=openings.map(q=>({a:q[0]-q[1]/2-.10,b:q[0]+q[1]/2+.10})).sort((a,b)=>a.a-b.a);
      let at=x0+.05;
      const put=(a,b)=>{if(b-a>.04){const x=(a+b)/2;
        box(x,.105,4.006,b-a,.19,.030,col.stoneD,
          {hard:true,gloss:.30,tag,cameraGroup:frontageGroup(segments,x,
            cameraGroup(`core-skirt:${tag}:${x.toFixed(3)}`))});}};
      for(const q of cuts){put(at,Math.max(at,q.a));at=Math.max(at,q.b);}
      put(at,x1-.05);
    };
    const portal=(x,w,tag,doorColor=col.steelD,opts={})=>{
      const frame=opts.frame||col.trim;
      const cg=frontageGroup(opts.front,x,
        cameraGroup(`core-portal:${tag}:${x.toFixed(3)}`));
      const sideGroup=s=>frontageGroup(opts.front,x+s*(w/2+.10),cg);
      // A real reveal sits behind the leaf; stepped jambs and a projecting cap put the door in a
      // recess instead of pasting a coloured rectangle onto the core wall.
      box(x,1.45,4.185,w+.05,2.68,.050,col.ink,{hard:true,gloss:.12,tag,cameraGroup:cg});
      box(x,2.84,4.08,w+.36,.22,.25,frame,{hard:true,gloss:.34,tag,cameraGroup:cg});
      box(x,2.955,4.015,w+.48,.055,.34,col.stoneD,{hard:true,gloss:.36,tag,cameraGroup:cg});
      for(const s of [-1,1]){
        const sideCg=sideGroup(s);
        box(x+s*(w/2+.10),1.48,4.08,.20,2.74,.25,frame,
          {hard:true,gloss:.30,tag,cameraGroup:sideCg});
        box(x+s*(w/2+.015),1.46,4.030,.035,2.66,.055,col.ink,
          {hard:true,gloss:.20,tag,cameraGroup:sideCg});
      }
      const leaf=box(x,1.45,4.145,w,2.62,.075,doorColor,
        {hard:true,gloss:.42,tag,cameraGroup:cg});
      leaf.officePortalLeaf=true;
      leaf.officePortalWidth=w;
      // Surface hardware: closer, kick plate, threshold and either a pull handle, panic rail or
      // louvres.  All sit north of the leaf and have no authored obstacle.
      box(x,2.65,4.096,w-.18,.045,.026,col.steelD,
        {hard:true,gloss:.54,tag,cameraGroup:cg});
      box(x,.245,4.096,w-.15,.34,.026,col.steelD,
        {hard:true,gloss:.48,tag,cameraGroup:cg});
      flat(x,.028,4.015,w+.28,.26,col.steelD,{mode:1,gloss:.62,tag,cameraGroup:cg});
      if(opts.panic){
        box(x,1.08,4.066,w-.18,.075,.075,col.steelL,
          {hard:true,gloss:.66,tag,cameraGroup:cg});
        for(const s of [-1,1])box(x+s*(w/2-.13),1.08,4.080,.065,.24,.065,col.steelD,
          {hard:true,gloss:.54,tag,cameraGroup:cg});
      }else{
        const hs=opts.handleLeft?-1:1;
        box(x+hs*w*.31,1.25,4.083,.055,.42,.055,col.steelL,
          {hard:true,gloss:.68,tag,cameraGroup:cg});
        box(x+hs*w*.31,1.25,4.100,.12,.055,.050,col.steelD,
          {hard:true,gloss:.54,tag,cameraGroup:cg});
      }
      if(opts.vent)for(let i=0;i<4;i++)box(x,.50+i*.105,4.080,w-.30,.030,.028,col.ink,
        {hard:true,gloss:.18,tag,cameraGroup:cg});
      return cg;
    };

    // Fire stairs are genuinely opposed at the two ends of the core band.
    for(const [which,x,x0,x1] of [['A',-10.5,-12,-9],['B',10.5,9,12]]){
      // Each entrance owns its pick group. Pooling both ends under 楼梯 put the cutaway/pick
      // centre in the solid core between them, so neither visible door ever resolved to either
      // authored stair action; distinct tags also prevent a click on A selecting B's focus.
      const stairTag=`楼梯${which}`;
      const stairFront=frontSlab(x0,x1,stairTag,[[x,1.34]]);
      const stairCg=portal(x,1.34,stairTag,col.red,{panic:true,front:stairFront});
      coreSkirt(x0,x1,[[x,1.34]],stairTag,stairFront);
      const exitCg=frontageGroup(stairFront,x,cameraGroup(`core-exit:${which}`));
      luminous(box(x,3.145,3.958,1.38,.245,.065,col.ink,
        {hard:true,mode:1,tag:'安全出口',cameraGroup:exitCg}),.045,.22);
      glyphs(x,3.145,3.928,Math.PI,'安全出口',{size:.105,gap:.021,color:col.white,
        mode:1,glow:.05,lift:.009,tag:'安全出口',cameraGroup:exitCg});
      const stairLetterX=x+(which==='A'?-.91:.91),
        stairLetterCg=frontageGroup(stairFront,stairLetterX,stairCg);
      box(stairLetterX,2.54,3.982,.34,.54,.065,col.ink,
        {hard:true,gloss:.22,tag:stairTag,cameraGroup:stairLetterCg});
      glyphs(stairLetterX,2.56,3.952,Math.PI,which,
        {size:.25,color:col.white,mode:1,lift:.008,tag:stairTag,cameraGroup:stairLetterCg});
      glyphs(x,1.67,4.116,Math.PI,'楼梯',
        {size:.20,gap:.055,color:col.white,mode:1,lift:.014,tag:stairTag,cameraGroup:stairCg});
      glyphs(x,1.26,4.116,Math.PI,'安全出口',
        {size:.10,gap:.022,color:col.white,mode:1,lift:.014,tag:stairTag,cameraGroup:stairCg});
      // The leaf is intentionally set into the opaque core slab. Expose one real, shallow release
      // station on the room-facing jamb so a visible click can resolve the corresponding stair
      // action without rays passing through the wall or selecting the opposite stair.
      const releaseX=x+(which==='A'?-.48:.48);
      const releaseCg=frontageGroup(stairFront,releaseX,stairCg);
      box(releaseX,1.35,3.944,.20,.36,.045,col.steelD,
        {hard:true,round:.025,gloss:.52,tag:stairTag,cameraGroup:releaseCg});
      luminous(box(releaseX,1.43,3.916,.085,.085,.018,col.green,
        {hard:true,mode:1,glow:.045,tag:stairTag,cameraGroup:releaseCg}),.012,.08);
      const q=officeThing('stairs-'+which.toLowerCase(),'楼梯',x,1.42,4.02,
        `防火楼梯${which}连接相邻的办公楼层。`,
        `Fire stair ${which} connects adjacent office floors.`,
        '楼梯 stairs。安全出口 means emergency exit.',{tag:stairTag,focus:[x,2.85],reach:2.15});
      q.labelGroup='楼梯';
      q.officeStair=which;
    }

    // Janitor/riser cell. A compact directory shares this otherwise blank core frontage.
    const cleanerFront=frontSlab(-9,-6,'清洁间',[[-8.05,1.02]]);
    const cleanerCg=portal(-8.05,1.02,'清洁间',col.wallD,
      {vent:true,front:cleanerFront});
    coreSkirt(-9,-6,[[-8.05,1.02]],'清洁间',cleanerFront);
    glyphs(-8.05,2.36,4.116,Math.PI,'清洁间',{size:.115,gap:.025,color:col.ink,
      mode:1,lift:.014,tag:'清洁间',cameraGroup:cleanerCg});
    // The directory is row-built, not one 76-part semantic group. Each background owns only the
    // text printed on it; the surrounding frame is a separate eight-part fixture. A camera cut
    // therefore cannot remove a full-height backing while leaving every row floating.
    const directoryFrameCg=cameraGroup('core-directory-frame');
    for(const [x,y,w,h] of [[-6.73,.32,1.26,.08],[-6.73,2.78,1.26,.08],
      [-7.32,1.55,.08,2.38],[-6.14,1.55,.08,2.38]])
      box(x,y,3.98,w,h,.10,col.ink,
        {hard:true,gloss:.28,tag:'楼层索引',cameraGroup:directoryFrameCg});
    const directoryHeaderCg=cameraGroup('core-directory-header');
    luminous(box(-6.73,2.48,3.920,1.13,.30,.025,col.white,
      {hard:true,mode:1,tag:'楼层索引',cameraGroup:directoryHeaderCg}),.035,.15);
    box(-6.73,2.48,3.895,1.13,.25,.030,col.ink,
      {hard:true,mode:1,glow:.025,tag:'楼层索引',cameraGroup:directoryHeaderCg});
    glyphs(-6.73,2.49,3.880,Math.PI,'楼层索引',{size:.090,gap:.020,color:col.white,
      mode:1,lift:.008,tag:'楼层索引',cameraGroup:directoryHeaderCg});
    const directoryStep=Math.min(.245,1.68/Math.max(1,OFFICE_FLOORS.length-1));
    OFFICE_FLOORS.forEach((f,i)=>{
      const y=2.15-i*directoryStep,on=f.key===key;
      const rowCg=cameraGroup(`core-directory-row-${i}`);
      luminous(box(-6.73,y,3.920,1.13,.20,.025,col.white,
        {hard:true,mode:1,tag:'楼层索引',cameraGroup:rowCg}),.035,.15);
      box(-6.73,y,3.892,1.02,.19,.020,on?col.ink:(i%2?col.ceiling:col.stone),
        {hard:true,mode:1,tag:'楼层索引',cameraGroup:rowCg});
      // Keep the accent rule beside the floor code rather than underneath its outer antialiased
      // strokes. It remains a clear active-row marker without clipping the first character.
      box(-7.10,y,3.874,.015,.15,.012,on?col.white:col.accent,
        {hard:true,mode:1,tag:'楼层索引',cameraGroup:rowCg});
      glyphs(-6.98,y,3.877,Math.PI,f.display,{size:.064,color:on?col.white:col.ink,
        mode:1,lift:.006,tag:'楼层索引',cameraGroup:rowCg});
      glyphs(-6.58,y,3.877,Math.PI,f.short,{size:.044,gap:.006,color:on?col.white:col.ink,
        mode:1,lift:.006,tag:'楼层索引',cameraGroup:rowCg});
    });
    for(const sx of [-1,1])for(const sy of [-1,1])cyl(-6.73+sx*.535,1.55+sy*1.14,3.882,
      .020,.018,col.steelL,{rx:Math.PI/2,gloss:.62,tag:'楼层索引',cameraGroup:directoryFrameCg});
    officeThing('directory','楼层索引',-6.73,1.55,3.91,
      `${meta.hz}是${meta.short}：${meta.programme}。`,
      `${meta.display} is ${meta.en}: ${meta.programme}.`,
      '楼层 floor + 索引 index.',{tag:'楼层索引',focus:[-6.73,2.72],reach:1.65});

    // WC/AWC cell: doors and truthful wayfinding, leaving the fit-out free to add detailed use.
    const restroomFront=frontSlab(-6,-2,'卫生间',[[-5.05,1.05],[-3.15,1.05]]);
    for(const [x,label,accessible] of [[-5.05,'卫生间',false],[-3.15,'无障碍',true]]){
      const restroomCg=portal(x,1.05,'卫生间',col.blue,
        {handleLeft:accessible,front:restroomFront});
      box(x,2.36,3.985,1.02,.29,.045,col.ink,
        {hard:true,mode:1,glow:.018,tag:'卫生间',cameraGroup:restroomCg});
      glyphs(x,2.36,3.968,Math.PI,label,{size:.096,gap:.020,color:col.white,mode:1,
        lift:.008,tag:'卫生间',cameraGroup:restroomCg});
    }
    coreSkirt(-6,-2,[[-5.05,1.05],[-3.15,1.05]],'卫生间',restroomFront);
    // Each real doorway owns a local approach. One midpoint station made the outer trim of both
    // doors depend on a 2 m reach envelope; two 1.55 m stations are clearer and remain truthful
    // when the picker resolves a click on either end of the four-metre frontage.
    for(const [x,hz] of [[-5.05,'卫生间'],[-3.15,'无障碍卫生间']]){
      const q=officeThing('restroom',hz,x,1.48,4.01,
        '公共卫生间和无障碍卫生间在这里。',
        'The shared and accessible washrooms are here.',
        '卫生间 is a washroom; 无障碍 means accessible.',
        {tag:'卫生间',focus:[x,2.80],reach:1.55});
      q.labelGroup='卫生间';
    }

    // Passenger bank: two visible cars, with the left-hand car owned by OfficeLift.
    const liftZ=OFFICE_CORE.liftDoorZ,activeX=OFFICE_CORE.cells.passenger.active;
    const landingLeaves=[];
    const movableLandingPart=(p,s,x)=>{
      if(x===activeX){
        p.fixed=true;p.cx=p.m[12];p.cy=p.m[13];p.cz=p.m[14];p.r=1.72;
        p.cameraSweepX=.68;
        landingLeaves.push({p,s,m0:p.m,ob:p.ob,obX:p.ob&&p.ob.x});
      }
      return p;
    };
    for(const [i,x] of OFFICE_CORE.cells.passenger.cars.entries()){
      // Only the active left car is an interaction surface. The closed right car is visual
      // context; giving it the active tag made its visible jambs select a focus three metres away.
      const carTag=x===activeX?'电梯':'客梯轿厢';
      const carCg=cameraGroup(`core-passenger-car-${i}`);
      // Double-stepped portal: the dark shaft reveal is a three-sided liner, never a backing
      // panel.  The active doors therefore open onto the finished car recess instead of onto a
      // black rectangle; the inactive car remains truthfully closed behind its own metal leaves.
      box(x,2.79,liftZ+.12,1.72,.10,.16,col.ink,{hard:true,tag:carTag,cameraGroup:carCg});
      for(const s of [-1,1])box(x+s*.83,1.48,liftZ+.12,.06,2.54,.16,col.ink,
        {hard:true,tag:carTag,cameraGroup:carCg});
      box(x,2.93,liftZ,1.94,.18,.30,col.steelD,
        {hard:true,gloss:.50,tag:carTag,cameraGroup:carCg});
      box(x,3.015,liftZ-.105,2.06,.055,.16,col.steelL,
        {hard:true,gloss:.66,tag:carTag,cameraGroup:carCg});
      for(const s of [-1,1]){
        box(x+s*.92,1.48,liftZ,.18,2.82,.30,col.steelD,
          {hard:true,gloss:.48,tag:carTag,cameraGroup:carCg});
        box(x+s*.815,1.47,liftZ-.105,.040,2.70,.070,col.steelL,
          {hard:true,gloss:.70,tag:carTag,cameraGroup:carCg});
      }
      for(const s of [-1,1]){
        movableLandingPart(box(x+s*.40,1.45,liftZ-.07,.76,2.60,.065,col.steel,
          {hard:true,gloss:.68,tag:carTag,cameraGroup:carCg}),s,x);
        // Brushed-metal rails and dark centre seals travel with the real left-hand leaves.
        movableLandingPart(box(x+s*.055,1.45,liftZ-.112,.026,2.52,.020,col.rubber,
          {hard:true,gloss:.20,tag:carTag,cameraGroup:carCg}),s,x);
        movableLandingPart(box(x+s*.40,.39,liftZ-.113,.64,.025,.018,col.steelL,
          {hard:true,gloss:.72,tag:carTag,cameraGroup:carCg}),s,x);
        movableLandingPart(box(x+s*.40,2.40,liftZ-.113,.64,.018,.018,col.steelD,
          {hard:true,gloss:.54,tag:carTag,cameraGroup:carCg}),s,x);
      }
      flat(x,.030,4.020,1.92,.34,col.steelD,
        {mode:1,gloss:.68,tag:carTag,cameraGroup:carCg});
      for(const gx of [-.55,0,.55])flat(x+gx,.033,4.012,.018,.27,col.rubber,
        {mode:1,alpha:.65,tag:carTag,cameraGroup:carCg});
      // Displays project from the stone header instead of occupying its opaque core. The former
      // z=4.105 assembly was completely inside the 320 mm header blocks at z=4.02.
      box(x,3.13,liftZ-.280,.88,.38,.090,col.steelD,
        {hard:true,gloss:.62,tag:carTag,cameraGroup:carCg});
      box(x,3.13,liftZ-.337,.74,.29,.036,col.screen,
        {hard:true,mode:1,glow:.08,tag:carTag,cameraGroup:carCg});
      box(x-.27,3.13,liftZ-.363,.10,.10,.018,col.accent,{hard:true,ry:Math.PI/4,
        mode:1,glow:i===0?.10:.025,tag:carTag,cameraGroup:carCg});
      glyphs(x+.08,3.13,liftZ-.351,Math.PI,meta.display,{size:meta.display.length>1?.12:.18,
        color:col.white,mode:1,glow:.10,lift:.008,tag:carTag,cameraGroup:carCg});
    }
    // Closed decorative car and a shallow, safe active-car reveal.
    solid(.08,1.92,3.96,9.02);
    solid(-1.92,-.08,5.48,9.02);
    solid(-2.02,-1.86,3.96,5.50);solid(-.14,.02,3.96,5.50);
    const activeRevealCg=cameraGroup('core-passenger-active-reveal');
    flat(activeX,.019,4.80,1.68,1.30,col.floorD,
      {mode:7,gloss:.16,mat:'tile',matScale:.40,tag:'电梯',cameraGroup:activeRevealCg});
    for(const side of [-1,1])box(activeX+side*.82,1.42,4.80,.08,2.74,1.28,col.steelD,
      {hard:true,gloss:.48,tag:'电梯',cameraGroup:activeRevealCg});
    box(activeX,1.42,5.42,1.68,2.74,.10,col.woodD,
      {hard:true,mode:6,gloss:.30,tag:'电梯',cameraGroup:activeRevealCg});
    box(activeX,1.62,5.352,1.42,1.92,.025,col.glass,
      {hard:true,mode:1,alpha:.25,gloss:.82,tag:'电梯',cameraGroup:activeRevealCg});
    box(activeX,2.78,4.80,1.68,.08,1.30,col.steelL,
      {hard:true,gloss:.34,tag:'电梯',cameraGroup:activeRevealCg});
    luminous(box(activeX,2.73,4.80,.88,.025,.42,col.warm,
      {hard:true,mode:1,tag:'照明',cameraGroup:activeRevealCg}),.11,.34);
    cyl(activeX,.88,5.28,.035,1.28,col.steelL,
      {rz:Math.PI/2,gloss:.68,tag:'扶手',cameraGroup:activeRevealCg});
    const landingBarrier=solid(-1.88,-.12,3.96,4.18);
    blocker(-2.04,2.04,3.92,9.08,H+.25,{pad:.08});
    for(const [side,x] of [['west',-2.02],['east',2.02]]){
      const cg=cameraGroup(`core-lift-lobby-jamb-${side}`);
      box(x,1.42,3.98,.20,2.84,.30,col.stoneD,
        {hard:true,gloss:.24,tag:'客梯门厅',cameraGroup:cg});
      box(x,1.42,3.805,.055,2.72,.035,col.steelL,
        {hard:true,gloss:.66,tag:'客梯门厅',cameraGroup:cg});
    }
    for(const [id,x,w] of [['west',-1.52,1.12],['center',0,1.92],['east',1.52,1.12]]){
      const cg=cameraGroup(`core-lift-lobby-header-${id}`);
      // Keep the structural stone header below the recessed floor-name band.  The prior
      // 3.20 centre left the lower 8 mm of every rendered floor glyph buried in stone even
      // though its centre remained readable.
      box(x,3.18,4.02,w,.26,.32,col.stoneD,
        {hard:true,gloss:.26,tag:'客梯门厅',cameraGroup:cg});
      if(id==='center'){
        box(0,3.205,3.842,1.18,.235,.055,col.ink,
          {hard:true,mode:1,glow:.025,tag:'客梯门厅',cameraGroup:cg});
        glyphs(0,3.205,3.816,Math.PI,'客梯',{size:.12,gap:.026,color:col.white,mode:1,
          glow:.045,lift:.009,tag:'客梯门厅',cameraGroup:cg});
      }
    }
    const call=officeThing('lift','电梯',activeX,1.42,4.00,
      '客梯通往地下一层、一楼至七楼和屋顶层。',
      'The passenger lift serves B1, floors 1–7 and the roof.',
      '客梯 is a passenger lift. 选择楼层 means choose a floor.',
      {tag:'电梯',focus:[activeX,2.85],reach:2.2});
    call.officeLift='passenger';
    // Hall station in the centre mullion: screen, separate up/down buttons and an access reader.
    // Keep its shallow cabinet south of the bank's camera stop. At the old z=3.835 a legal
    // blocker-resolved eye at z=3.807 ended inside the opaque station during a reverse orbit.
    const hallStationCg=cameraGroup('core-lift-hall-station');
    // A real mullion/standoff bridges the hall station to the lift frontage.  Without it the
    // cabinet hovered 232 mm south of the bank with its lower edge almost a metre above floor.
    box(0,1.38,3.845,.12,.84,.26,col.steelD,
      {hard:true,gloss:.50,tag:'电梯',cameraGroup:hallStationCg});
    box(0,1.38,3.685,.18,.78,.105,col.steelD,
      {hard:true,gloss:.58,tag:'电梯',cameraGroup:hallStationCg});
    box(0,1.67,3.625,.125,.15,.018,col.screen,
      {hard:true,mode:1,glow:.055,tag:'电梯',cameraGroup:hallStationCg});
    for(const [y,label] of [[1.43,'上'],[1.18,'下']]){
      cyl(0,y,3.610,.062,.022,col.ink,
        {rx:Math.PI/2,gloss:.62,tag:'电梯',cameraGroup:hallStationCg});
      glyphs(0,y,3.544,Math.PI,label,{size:.044,color:col.white,mode:1,lift:.006,
        tag:'电梯',cameraGroup:hallStationCg});
    }
    luminous(cyl(0,1.43,3.588,.031,.014,col.ink,
      {rx:Math.PI/2,mode:1,tag:'电梯',cameraGroup:hallStationCg}),.10,.26);
    box(0,.92,3.620,.115,.18,.020,col.ink,
      {hard:true,mode:1,glow:.025,tag:'电梯',cameraGroup:hallStationCg});
    let landingOpen=0;
    onTick((t,body,clock,dt)=>{
      const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
      const near=Math.hypot(bx-activeX,bz-2.85)<2.55;
      let target=near?1:0;
      if(typeof OfficeLift!=='undefined'&&OfficeLift.landingOpen)
        target=OfficeLift.landingOpen(key,near);
      landingOpen+=(target-landingOpen)*(1-Math.exp(-dt*(target?7.2:4.8)));
      if(Math.abs(target-landingOpen)<.001)landingOpen=target;
      landingBarrier.open=landingOpen>.62;
      for(const q of landingLeaves){
        q.p.m=M.mul(M.trans(q.s*.68*landingOpen,0,0),q.m0);
        if(q.ob)q.ob.x=q.obX+q.s*.68*landingOpen;
      }
      state.landing={open:+landingOpen.toFixed(3),near,floor:key};
    });

    // Visible service lift. It is deliberately non-passenger and remains shut for future logistics.
    const serviceFront=frontSlab(2,6,'服务电梯',[[4,2.55]]);
    coreSkirt(2,6,[[4,2.55]],'服务电梯',serviceFront);
    const serviceLiftCg=cameraGroup('core-service-lift');
    box(4,1.48,4.015,2.30,2.82,.14,col.ink,
      {hard:true,tag:'服务电梯',cameraGroup:serviceLiftCg});
    for(const s of [-1,1]){
      box(4+s*.56,1.45,3.925,1.06,2.62,.065,col.steelD,
        {hard:true,gloss:.58,tag:'服务电梯',cameraGroup:serviceLiftCg});
      box(4+s*.055,1.45,3.882,.026,2.52,.020,col.rubber,
        {hard:true,gloss:.20,tag:'服务电梯',cameraGroup:serviceLiftCg});
      box(4+s*1.16,1.48,3.930,.18,2.82,.22,col.steelD,
        {hard:true,gloss:.52,tag:'服务电梯',cameraGroup:serviceLiftCg});
      box(4+s*.56,.40,3.880,.92,.025,.018,col.steelL,
        {hard:true,gloss:.68,tag:'服务电梯',cameraGroup:serviceLiftCg});
    }
    box(4,2.96,3.93,2.55,.18,.20,col.steelD,
      {hard:true,gloss:.56,tag:'服务电梯',cameraGroup:serviceLiftCg});
    flat(4,.031,3.900,2.42,.36,col.steelD,
      {mode:1,gloss:.62,tag:'服务电梯',cameraGroup:serviceLiftCg});
    for(let i=0;i<9;i++)box(2.98+i*.255,.046,3.885,.13,.030,.28,
      i%2?col.ink:col.brass,
      {hard:true,ry:-.55,gloss:.35,tag:'服务电梯',cameraGroup:serviceLiftCg});
    box(4,3.12,3.885,1.46,.25,.055,col.ink,
      {hard:true,mode:1,glow:.025,tag:'服务电梯',cameraGroup:serviceLiftCg});
    glyphs(4,3.12,3.859,Math.PI,'服务电梯',{size:.105,gap:.022,color:col.white,mode:1,
      lift:.009,tag:'服务电梯',cameraGroup:serviceLiftCg});
    box(5.35,1.38,3.845,.18,.66,.09,col.steelD,
      {hard:true,gloss:.52,tag:'服务电梯',cameraGroup:serviceLiftCg});
    box(5.35,1.59,3.790,.12,.16,.018,col.screen,
      {hard:true,mode:1,glow:.05,tag:'服务电梯',cameraGroup:serviceLiftCg});
    cyl(5.35,1.28,3.776,.060,.021,col.steelL,
      {rx:Math.PI/2,gloss:.60,tag:'服务电梯',cameraGroup:serviceLiftCg});

    // MEP cell completes the core frontage without claiming to be a public activity.
    const mepFront=frontSlab(6,9,'设备间',[[7.55,1.08]]);
    const mepCg=portal(7.55,1.08,'设备间',col.wallD,
      {vent:true,handleLeft:true,front:mepFront});
    coreSkirt(6,9,[[7.55,1.08]],'设备间',mepFront);
    box(7.55,2.36,3.985,1.05,.29,.045,col.ink,
      {hard:true,mode:1,tag:'设备间',cameraGroup:mepCg});
    glyphs(7.55,2.36,3.968,Math.PI,'设备间',{size:.096,gap:.021,color:col.white,mode:1,
      lift:.008,tag:'设备间',cameraGroup:mepCg});
    const warningCg=cameraGroup('core-mep-warning');
    box(8.48,1.35,3.980,.34,.54,.060,col.red,
      {hard:true,mode:1,glow:.018,tag:'安全出口',cameraGroup:warningCg});
    glyphs(8.48,1.35,3.952,Math.PI,'注意',{size:.070,gap:.012,color:col.white,mode:1,
      lift:.007,tag:'安全出口',cameraGroup:warningCg});

    // First-floor automatic street entrance in the centre of the north curtain wall.
    if(key==='office1'){
      // Mask the lower opaque sill and glass visually with a deep vestibule frame and moving doors;
      // the collision plane is split so the opening itself is genuinely traversable.
      for(const s of [-1,1]){
        const headerCg=cameraGroup(`core-entry-header-${s<0?'west':'east'}`);
        box(s*.9625,2.92,-RZ+.16,1.925,.42,.34,col.stoneD,
          {hard:true,gloss:.30,tag:'门',cameraGroup:headerCg});
        box(s*.885,2.735,-RZ+.31,1.77,.075,.16,col.ink,
          {hard:true,gloss:.18,tag:'门',cameraGroup:headerCg});
        const jambCg=cameraGroup(`core-entry-jamb-${s<0?'west':'east'}`);
        box(s*1.86,1.55,-RZ+.16,.24,2.68,.34,col.stoneD,
          {hard:true,gloss:.30,tag:'门',cameraGroup:jambCg});
        box(s*1.73,1.53,-RZ+.31,.050,2.56,.075,col.steelL,
          {hard:true,gloss:.62,tag:'门',cameraGroup:jambCg});
      }
      const leaves=[];
      const entryPart=(p,s)=>{p.fixed=true;p.cx=p.m[12];p.cy=p.m[13];p.cz=p.m[14];p.r=1.72;
        p.cameraSweepX=1.34;leaves.push({p,s,m0:p.m,ob:p.ob,obX:p.ob&&p.ob.x});return p;};
      for(const s of [-1,1]){
        const leafCg=cameraGroup(`core-entry-leaf-${s<0?'west':'east'}`);
        entryPart(box(s*.79,1.45,-RZ+.10,1.48,2.54,.055,col.glass,
          {hard:true,mode:1,alpha:.40,gloss:.72,tag:'门',cameraGroup:leafCg}),s);
        entryPart(box(s*.055,1.45,-RZ+.055,.045,2.52,.035,col.steelD,
          {hard:true,gloss:.66,tag:'门',cameraGroup:leafCg}),s);
        entryPart(box(s*.79,.82,-RZ+.052,1.32,.065,.025,col.accent,
          {hard:true,mode:1,alpha:.78,glow:.018,tag:'门',cameraGroup:leafCg}),s);
      }
      // This barrier is the authored entrance collision. The north curtain collider is omitted for
      // F1 in finish-time integration; game wiring should use this dynamic barrier.
      const barrier=solid(-1.72,1.72,-RZ-.14,-RZ+.18);barrier.open=true;
      flat(0,.019,-RZ+1.05,3.85,1.45,col.ink,{mode:7,gloss:.05,tag:'门'});
      // Keep the stainless threshold measurably below F1's lobby runner where their two finishes
      // overlap by 20 mm. Equal planes flickered at the doorway; this 3 mm reveal is intentional.
      flat(0,.023,-RZ+.16,3.74,.32,col.steelD,{mode:1,gloss:.64,tag:'门'});
      for(const x of [-1.2,-.6,0,.6,1.2])flat(x,.029,-RZ+.14,.018,.26,col.rubber,
        {mode:1,alpha:.72,tag:'门'});
      const entrySignCg=cameraGroup('core-entry-sign');
      // Mount the identity panel on the lobby face of the upper wall. Its former centre at
      // z=-8.985 occupied the wall core; moving the complete panel forward makes both backing
      // and lettering visible from the interior approach.
      const entryIdentity=box(0,3.07,-RZ+.380,2.45,.30,.065,col.ink,
        {hard:true,mode:1,glow:.020,tag:'入口标识',cameraGroup:entrySignCg});
      entryIdentity.officeMountedAssembly='core-entry-identity';
      A.officeMountedAssemblyManifest.push('core-entry-identity');
      for(const x of [-.82,.82])box(x,3.07,-RZ+.339,.065,.065,.018,col.steelD,
        {hard:true,gloss:.58,tag:'入口标识支架',cameraGroup:entrySignCg,
          officeAssemblySupport:'core-entry-identity'});
      glyphs(0,3.08,-RZ+.411,0,'公司大楼',{size:.17,gap:.036,color:col.white,mode:1,
        glow:.06,lift:.009,tag:'门',cameraGroup:entrySignCg});
      box(0,2.80,-RZ+.370,.44,.15,.060,col.screen,
        {hard:true,mode:1,glow:.055,tag:'门',cameraGroup:entrySignCg});
      luminous(cyl(0,2.80,-RZ+.405,.035,.018,col.accent,
        {rx:Math.PI/2,mode:1,tag:'门',cameraGroup:entrySignCg}),.10,.28);
      const exit=officeThing('exit','门',0,1.45,-RZ+.08,
        '自动门外就是公司楼前的人行道。',
        'The automatic doors open onto the pavement outside the office complex.',
        '上班 means going to work; 下班 means finishing work.',{tag:'门',focus:[0,-7.45],reach:2.2});
      exit.exit={place:'street',at:OFFICE_OUT};
      let open=1;
      onTick((t,body,clock,dt)=>{
        const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
        const near=Math.abs(bx)<2.8&&Math.abs(bz+RZ)<3.0,target=near?1:0;
        open+=(target-open)*(1-Math.exp(-dt*(target?7.0:4.5)));
        if(Math.abs(target-open)<.001)open=target;
        for(const q of leaves){
          q.p.m=M.mul(M.trans(q.s*1.34*open,0,0),q.m0);
          if(q.ob)q.ob.x=q.obX+q.s*1.34*open;
        }
        barrier.open=open>.60;state.entrance={open:+open.toFixed(3),near};
      });
    }

    // Core-front label is a proper tenant band, aligned identically on every storey.
    const floorMark=meta.display==='RF'?'RF':meta.display==='B1'?'B1':`${meta.display}F`;
    // This tenant band is passive wayfinding, not the actionable directory six metres west.
    // Giving both the same pick tag made the roof header resolve to an unreachable directory card.
    // The centre tenant band is mounted directly over the centre lift-header sign; those two
    // modest layers are one physical header assembly.  Side wings remain independent bays.
    const floorMarkCg=cameraGroup('core-lift-lobby-header-center');
    box(0,3.365,3.928,2.40,.145,.050,col.ink,
      {hard:true,mode:1,glow:.018,tag:'楼层标识',cameraGroup:floorMarkCg});
    for(const s of [-1,1])box(s*1.53,3.365,3.928,.66,.145,.050,col.ink,
      {hard:true,mode:1,glow:.018,tag:'楼层标识',
        cameraGroup:cameraGroup(`core-lift-lobby-header-${s<0?'west':'east'}`)});
    box(-1.72,3.365,3.895,.10,.145,.018,col.accent,
      {hard:true,mode:1,glow:.035,tag:'楼层标识',
        cameraGroup:cameraGroup('core-lift-lobby-header-west')});
    // Four short wall standoffs bridge the 67 mm reveal to the core facade. They make the band a
    // mounted header assembly rather than a black strip suspended in the cove by coincidence.
    for(const x of [-1.53,-.78,.78,1.53]){
      const cg=Math.abs(x)<1?floorMarkCg:
        cameraGroup(`core-lift-lobby-header-${x<0?'west':'east'}`);
      const mount=box(x,3.365,3.9865,.075,.055,.067,col.steelD,
        {hard:true,gloss:.48,tag:'楼层标识',cameraGroup:cg});
      mount.officeWayfindingMount=true;
    }
    glyphs(.05,3.365,3.905,Math.PI,`${floorMark} · ${meta.short}`,
      {size:.086,gap:.018,color:col.white,mode:1,glow:.035,lift:.008,
        tag:'楼层标识',cameraGroup:floorMarkCg});
    return A;
  }

  function curateOfficeLights(A){
    const {B,key}=A,authored=B.lights.slice();
    let submitted;
    if(key==='officeRoof'){
      submitted=OFFICE_ROOF_LIGHT_PLAN.map(q=>({
        x:q.x,y:q.y,z:q.z,col:q.col.slice(),power:q.power,radius:q.radius,on:true,
        officeRole:'zone',officeLightId:key+':'+q.id,
      }));
    }else{
      const base=authored.filter(l=>l.officeRole==='base');
      if(base.length!==6)throw new Error(`OfficeCore: ${key} base-light count ${base.length}, expected 6`);
      const local=authored.filter(l=>l.officeRole!=='base'),used=new Set();
      submitted=base.slice();
      for(const [tx,tz] of OFFICE_LIGHT_ACCENT_TARGETS[key]||[]){
        let best=null,bd=Infinity;
        for(const l of local){
          if(used.has(l))continue;
          const d=(l.x-tx)*(l.x-tx)+(l.z-tz)*(l.z-tz);
          if(d<bd){best=l;bd=d;}
        }
        if(!best||bd>.015*.015)
          throw new Error(`OfficeCore: ${key} accent light missing near ${tx},${tz}`);
        used.add(best);submitted.push(best);
      }
      if(submitted.length!==OFFICE_LIGHT_LIMIT)
        throw new Error(`OfficeCore: ${key} submits ${submitted.length}/${OFFICE_LIGHT_LIMIT} lights`);
      submitted.forEach((l,i)=>{
        l.officeRole=i<6?'base':'accent';
        l.officeLightId=`${key}:${l.officeRole}-${i+1}`;
      });
    }
    if(submitted.length!==OFFICE_LIGHT_LIMIT)
      throw new Error(`OfficeCore: ${key} submits ${submitted.length}/${OFFICE_LIGHT_LIMIT} lights`);
    B.lights.splice(0,B.lights.length,...submitted);
    return {
      version:'office-fixed-eight-v1',limit:OFFICE_LIGHT_LIMIT,policy:'fixed-build-time',
      authored,authoredCount:authored.length,submitted:B.lights,submittedCount:B.lights.length,
    };
  }

  function finishFloor(A){
    const {B,key,meta,col,state,_ticks,_lit,_rooms}=A;
    let last=0,hasLast=false,nightK=0;
    function setNight(k){nightK=Math.max(0,Math.min(1,Number(k)||0));nightK=nightK*nightK*(3-2*nightK);
      for(const q of _lit)q.p.glow=q.day+(q.night-q.day)*nightK;}
    function tick(t,body,clock){
      // A malformed host timestamp must not poison every animated matrix and entrance state with
      // NaN. Hold the last finite animation time for this zero-delta frame, then rebase so the
      // next finite timestamp recovers without integrating an arbitrary gap.
      const finite=Number.isFinite(t),now=finite?t:last;
      const dt=finite&&hasLast?Math.min(.20,Math.max(0,t-last)):0;
      if(finite){last=t;hasLast=true;}else hasLast=false;
      for(const fn of _ticks)fn(now,body,clock,dt);
    }
    const base={id:key+'-floor',x0:-RX+.18,x1:RX-.18,z0:-RZ+.18,z1:RZ-.18,
      ...(key==='officeRoof'?{}:{ceil:H-.26}),light:[0,H-.36,0]};
    const zones=[..._rooms,base];
    const roomAt=(x,z,prev)=>{
      const old=zones.find(q=>q.id===prev);
      // Keep hysteresis for a real room, but never for the whole-floor fallback. The fallback
      // contains every authored room, so retaining it here would make roomAt permanently return
      // the base zone after a corridor/landing spawn and defeat room-specific cutaway and light
      // selection on every office level.
      if(old&&old!==base&&x>=old.x0-.12&&x<=old.x1+.12&&z>=old.z0-.12&&z<=old.z1+.12)return old;
      let best=base,area=(base.x1-base.x0)*(base.z1-base.z0);
      for(const q of zones){if(x<q.x0||x>q.x1||z<q.z0||z>q.z1)continue;
        const a=(q.x1-q.x0)*(q.z1-q.z0);if(a<area){best=q;area=a;}}
      return best;
    };
    // Set the lobby arrival just beyond the automatic-door sensor: the leaves begin open after a
    // street entry, then close behind the player while the default camera retains a full-body view
    // instead of pinning itself against the south curtain-wall blocker.
    const spawn=key==='office1'?{x:0,z:-4.90,yaw:0}:{...OFFICE_CORE.landing};
    const rooftop=key==='officeRoof';
    const officeLighting=curateOfficeLights(A);
    // Walls-down is a complete construction cut, not just a flag on the large wall rectangles.
    // If a localized camera fixture contains one of those rectangles, every supported trim/sign/
    // door component above the 0.40 m datum follows it; the retained kerb and floor thresholds do
    // not. Ceiling ownership is intentionally explicit through `dollhouseCeiling()` at authoring
    // sites — height inference would misclassify tall furniture, plant crowns and wall-mounted art.
    // Neither rule changes solids, blockers, floors, furniture or actions.
    if(!rooftop){
      const partitionGroups=new Set(B.props.filter(p=>p.partition&&p.cameraGroup)
        .map(p=>p.cameraGroup));
      for(const p of B.props){
        const m=p.m;
        if(!m||m.length<16)continue;
        const extentY=.5*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]));
        const bottom=m[13]-extentY,top=m[13]+extentY;
        if(p.cameraGroup&&partitionGroups.has(p.cameraGroup)&&top>Build.PARTITION_STUB+.001&&
            !p.dollhouseRetain)p.partition=true;
      }
    }
    return B.finish({setNight,tick,OUT:OFFICE_OUT,floor:key,officeFloor:key,meta,officeState:state,
      officeLighting,
      officeMountedAssemblyManifest:Object.freeze([...A.officeMountedAssemblyManifest]),
      route:OFFICE_ROUTES[key],core:OFFICE_CORE,RX,RZ,H,
      label:'公司',labelK:`公司大楼 · ${meta.display}F ${meta.short}`,
      indoor:!rooftop,cutaway:!rooftop,winOn:false,near:.055,far:rooftop?88:82,
      expose:key==='officeB1'?1.10:rooftop?1.05:1.16,aoRadius:.29,aoAmt:.065,bloom:.72,
      // Keep the closer rooftop orbit's full head and a deliberate headroom margin in frame.
      // The former 1.12 m target cropped the 1.82 m crown on every legal close-track yaw.
      camera:rooftop?{pitch:.24,dist:5.15,maxDist:5.8,lookY:1.18}:
        {pitch:.27,dist:4.65,maxDist:5.15,lookY:1.16},spawn,
      WIN:rooftop?undefined:{x:0,y:1.72,z:-RZ+.05,hw:RX-1,hh:1.2},zones,roomAt});
  }

  function buildModule(key){
    const A=createFloorContext(key);buildShell(A);
    for(const fit of OfficeFit.builders(key))fit(A);
    return finishFloor(A);
  }
  function makeFloor(lazyName,key){
    if(!metaFor(key))throw new Error('OfficeCore: unknown floor '+key);
    if(officeOwn(scenes,key))return scenes[key];
    const scene=Lazy(lazyName,()=>buildModule(key));scenes[key]=scene;return scene;
  }
  function sceneFor(value){const key=keyFor(value);return key&&officeOwn(scenes,key)?scenes[key]:null;}
  function registerFloor(key,builder){return OfficeFit.register(key,builder);}
  function createFloor(key,builder){if(builder)registerFloor(key,builder);return sceneFor(key);}
  function buildFloor(value){const key=keyFor(value),scene=sceneFor(key);if(!scene)return null;
    return typeof Lazy!=='undefined'&&Lazy.force?Lazy.force(OFFICE_FLOOR_META[key].lazy):scene;}
  function registerAction(key,id,definition){
    if(key==='officeRF')key='officeRoof';
    if(!officeOwn(OFFICE_FLOOR_META,key)||!officeOwn(OfficeUse,key))
      throw new Error('OfficeUse: unknown floor '+key);
    if(!officeSafeOwnKey(id)||!definition||typeof definition!=='object')
      throw new Error('OfficeUse: invalid action '+id);
    OfficeUse[key][id]=definition;return definition;
  }

  for(const f of OFFICE_FLOORS)makeFloor(f.lazy,f.key);
  scenes.officeRF=scenes.officeRoof;
  return Object.freeze({makeFloor,createFloorContext,buildShell,finishFloor,createFloor,registerFloor,
    buildFloor,sceneFor,registerAction,RX,RZ,H,OUT:OFFICE_OUT,FLOORS:OFFICE_FLOORS,
    FLOOR_ORDER:OFFICE_FLOOR_ORDER,FLOOR_META:OFFICE_FLOOR_META,ROUTES:OFFICE_ROUTES,
    CONTRACT:OFFICE_CORE,Fit:OfficeFit,Use:OfficeUse,Cast:OfficeCast,SCENES:Object.freeze(scenes)});
})();

const OfficeScenes=OfficeCore.SCENES;
const OfficeB1=OfficeScenes.officeB1;
const Office1=OfficeScenes.office1;
const Office2=OfficeScenes.office2;
const Office3=OfficeScenes.office3;
const Office4=OfficeScenes.office;
const Office5=OfficeScenes.office5;
const Office6=OfficeScenes.office6;
const Office7=OfficeScenes.office7;
const OfficeRoof=OfficeScenes.officeRoof;
const OfficeRF=OfficeRoof;
