// 北京文华大学 · shared exterior shell and deterministic fit registry.
// Geometry lives in campus-*.js. This file owns the coordinate/runtime contract and the helpers
// that keep every fit on the same materials, facade grammar, collision rules, and night state.

const CAMPUS_CONTRACT = window.CampusContract = Object.freeze({
  layoutVersion: 2,
  x0: -48.0, x1: 48.0,
  z0: -13.0, z1: 67.0,
  cx: 0.0, cz: 27.0,
  w: 96.0, d: 80.0,
  spawn: Object.freeze({ x: -11.40, z: -9.35, yaw: 0 }),
});

const CampusFits = window.CampusFits = {
  rows: [],
  register(id, order, build) {
    if (this.rows.some(r => r.id === id)) throw new Error(`duplicate Campus fit: ${id}`);
    if (typeof build !== 'function') throw new Error(`Campus fit ${id} has no builder`);
    this.rows.push({ id, order, build });
  },
};

try {
  Glyphs.need('北京文华大学大学城教学楼图书馆食堂宿舍行政实验活动中心校医院门卫访客室' +
    '校园地图布告板打印自行车长椅饮水机篮球场快递柜西门东门后勤通道消防栓通知' +
    '可回收物厨余垃圾有害垃圾其他垃圾第一厚德博学国际学生服务科学创新');
} catch (_) {}

const Campus = Lazy('Campus', () => {
  const col = {
    pave:C('#9a958b'),paveD:C('#827d74'),paveL:C('#aaa49a'),kerb:C('#b3ada3'),
    grass:C('#5b7343'),grassD:C('#496035'),render:C('#c3bdaf'),renderD:C('#a8a294'),
    renderL:C('#d2ccbe'),brick:C('#9a6c56'),brickD:C('#7d5644'),stone:C('#918c83'),
    stoneD:C('#6f6a62'),stoneL:C('#a9a39b'),trunk:C('#5b4a38'),trunkL:C('#74604a'),
    leaf:C('#4f7a3c'),leafD:C('#3c6130'),red:C('#a8372a'),redD:C('#7f2a20'),
    gold:C('#c9992f'),goldL:C('#e0b850'),cream:C('#e6dcc6'),white:C('#eceae2'),
    steel:C('#a7adb2'),steelD:C('#7b8288'),chrome:C('#c6ccd0'),charcoal:C('#33383d'),
    black:C('#22262b'),blue:C('#2f6392'),blueSign:C('#1f4f8f'),teal:C('#4c8a86'),
    green:C('#4b7a59'),glassDay:C('#9fb6c4'),glassDark:C('#3d4650'),
    bike1:C('#2f86bd'),bike2:C('#d9662f'),bike3:C('#3f7a4e'),bike4:C('#c0b33a'),
    tarp:C('#3f6d55'),yellow:C('#d9b02f'),orange:C('#cf7a2b'),warm:C('#ffcf87'),
  };
  const G = { matte:.05, wood:.20, paint:.16, metal:.58, glass:.80, fabric:.04 };
  const MEAN = { paving:1.14,brick:1.06,concrete:2.21,plaster:2.32,
    tile:2.72,fabric:2.68,metal:4.33,asphalt:.35 };
  const S = {
    pave:{mat:'paving',matScale:.68,matAmt:.36},path:{mat:'paving',matScale:.54,matAmt:.36},
    court:{mat:'asphalt',matScale:2.4,matAmt:.34},rend:{mat:'concrete',matScale:2.4,matAmt:.30},
    lib:{mat:'concrete',matScale:3.0,matAmt:.28},stone:{mat:'concrete',matScale:1.4,matAmt:.30},
    plas:{mat:'plaster',matScale:2.1,matAmt:.30},brick:{mat:'brick',matScale:.92,matAmt:.34},
    tile:{mat:'tile',matScale:.32,matAmt:.38},steel:{mat:'metal',matScale:.40,matAmt:.30},
    tarp:{mat:'fabric',matScale:.85,matAmt:.32},
  };
  const s2l = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const l2s = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
  const held = (c, surface) => {
    const k = 1 + (MEAN[surface.mat] - 1) * surface.matAmt;
    return c.map(v => Math.min(1, Math.max(0, l2s(s2l(v) / k))));
  };

  const B = Build.scene({ fabricGloss:G.fabric });
  const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,thing} = B;
  const light = B.light;
  const glyph = glyphs;
  const RX = 48.0, RZ = 40.0;
  const GROUND = Object.freeze({ x:0,z:27,w:104,d:88 });
  const AXIS_X = -3.0, SPAWN = CAMPUS_CONTRACT.spawn, OUT = SPAWN;
  const panes = [], litProps = [], lampPools = [];
  let seed = 0x2c9f70;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];
  const pane = (p, warm=rnd()) => { panes.push({p,warm}); return p; };
  const litten = (p, k=1) => { litProps.push({p,k,base:p.glow || 0}); return p; };
  function dynamic(p,cx,cy,cz,r) {
    p.dynamic=true; p.fixed=true; p.cx=cx; p.cy=cy; p.cz=cz; p.r=r; return p;
  }

  function fwinZ(x,y,z,w,h,n=-1) {
    const d=q=>z+n*q;
    box(x,y,d(.030),w+.14,h+.14,.06,col.glassDark,{hard:true,gloss:.20});
    const warm=rnd();
    pane(box(x,y,d(.055),w,h,.02,col.glassDay,{hard:true,mode:1,gloss:G.glass}),warm);
    box(x,y,d(.070),.045,h,.02,col.steel,{hard:true,gloss:G.metal});
    box(x,y,d(.070),w,.045,.02,col.steel,{hard:true,gloss:G.metal});
    box(x,y-h/2-.055,d(.085),w+.26,.07,.17,col.renderD,{hard:true,gloss:G.paint});
    return warm;
  }
  const fwin = fwinZ;
  function fwinX(x,y,z,w,h,n=-1) {
    const d=q=>x+n*q;
    box(d(.030),y,z,.06,h+.14,w+.14,col.glassDark,{hard:true,gloss:.20});
    const warm=rnd();
    pane(box(d(.055),y,z,.02,h,w,col.glassDay,{hard:true,mode:1,gloss:G.glass}),warm);
    box(d(.070),y,z,.02,h,.045,col.steel,{hard:true,gloss:G.metal});
    box(d(.070),y,z,.02,.045,w,col.steel,{hard:true,gloss:G.metal});
    box(d(.085),y-h/2-.055,z,.17,.07,w+.26,col.renderD,{hard:true,gloss:G.paint});
    return warm;
  }
  function acBox(x,y,z,axis='z',n=-1) {
    if (typeof axis === 'number') { n=axis; axis='z'; }
    if (axis === 'x') {
      box(x+n*.30,y,z,.36,.50,.84,col.white,{hard:true,gloss:.26});
      for(let i=-2;i<=2;i++) box(x+n*.50,y,z+i*.13,.03,.38,.05,col.steelD,{hard:true,gloss:.3});
      for(const s of [-1,1]) box(x+n*.28,y-.30,z+s*.34,.30,.08,.06,col.steelD,{hard:true,gloss:.3});
    } else {
      box(x,y,z+n*.30,.84,.50,.36,col.white,{hard:true,gloss:.26});
      for(let i=-2;i<=2;i++) box(x+i*.13,y,z+n*.50,.05,.38,.03,col.steelD,{hard:true,gloss:.3});
      for(const s of [-1,1]) box(x+s*.34,y-.30,z+n*.28,.06,.08,.30,col.steelD,{hard:true,gloss:.3});
    }
  }
  function tree(x,z,h) {
    capsule(x,h*.40,z,.15,h*.84,.15,col.trunkL,{gloss:G.wood});
    for(let i=0;i<7;i++){
      const a=i*2.399;
      ball(x+Math.sin(a)*.60,h*.78+(i%3)*.26,z+Math.cos(a)*.60,.90,.72,.90,
        i%2?col.leaf:col.leafD,{gloss:.12,mode:15,ry:a});
    }
    solid(x-.28,x+.28,z-.28,z+.28); shade(x,z,2.8,2.8,.26);
  }
  function bike(x,z,ry,color=col.bike1,tag='自行车') {
    const T={tag,ry};
    for(const o of [-.50,.50]) cyl(x+Math.sin(ry)*o,.33,z+Math.cos(ry)*o,.33,.045,
      col.charcoal,{...T,rx:Math.PI/2,gloss:.30});
    // At campus viewing distance one continuous, slightly stronger frame spine reads as clearly as
    // the former overlapping two-tube frame while saving one property on every authored bicycle.
    capsule(x,.50,z,.055,1.02,.055,color,{...T,rz:Math.PI/2,gloss:.34});
    capsule(x+Math.sin(ry)*.44,.74,z+Math.cos(ry)*.44,.028,.46,.028,col.steelD,
      {...T,rz:Math.PI/2,gloss:G.metal});
    box(x-Math.sin(ry)*.24,.74,z-Math.cos(ry)*.24,.24,.06,.11,col.black,{...T,gloss:.26});
  }
  function bench(x,z,ry=0) {
    const c=Math.cos(ry),s=Math.sin(ry);
    for(const q of [-1,1]) box(x+c*q*.72,.22,z-s*q*.72,.14,.44,.44,col.stone,
      {hard:true,ry,gloss:G.matte});
    for(let i=0;i<4;i++) box(x-s*(-.15+i*.11),.45,z-c*(-.15+i*.11),1.56,.05,.09,
      col.trunkL,{hard:true,ry,gloss:G.wood});
    const hx=Math.abs(c)*.78+Math.abs(s)*.22+.10, hz=Math.abs(s)*.78+Math.abs(c)*.22+.10;
    solid(x-hx,x+hx,z-hz,z+hz); shade(x,z,2,1,.24);
  }
  function fountain(x,z) {
    cyl(x,.38,z,.21,.76,col.teal,{gloss:.26});
    cyl(x,.78,z,.22,.06,col.charcoal,{gloss:.24});
    capsule(x,.78,z,.022,.18,.022,col.chrome,{rx:1.2,gloss:G.metal});
    box(x,.66,z,.30,.06,.30,col.steelD,{hard:true,gloss:G.metal});
    solid(x-.24,x+.24,z-.24,z+.24);
  }
  function lamp(x,z) {
    cyl(x,2.30,z,.085,4.60,col.charcoal,{gloss:.28});
    box(x,4.72,z,.56,.20,.40,col.charcoal,{hard:true,gloss:.28});
    litten(box(x,4.56,z,.46,.10,.32,C('#ffe6ae'),{hard:true,mode:1,glow:.10}),1);
    lampPools.push(glow(M.trs(x,.03,z,0,6,1,6),C('#ffd79a'),0));
    light(x,4.40,z,[1,.88,.66],.95,4.6); solid(x-.13,x+.13,z-.13,z+.13);
  }
  function sign(x,z,labels,tag='校园指示') {
    const rows=Array.isArray(labels)?labels:String(labels).split('/').map(q=>q.trim());
    box(x,1.175,z,.12,2.35,.12,col.blueSign,{tag,hard:true,gloss:.25});
    rows.forEach((labelText,i)=>{
      const y=2.18-i*.34, left=i%2===0;
      box(x,y,z-.02,1.85,.28,.08,col.blueSign,{tag,hard:true,gloss:.25});
      glyphs(x,y,z-.07,Math.PI,(left?'← ':'')+labelText+(left?'':' →'),
        {tag,size:.105,gap:.025,color:col.white,mode:1});
    });
    solid(x-.11,x+.11,z-.11,z+.11);
  }

  const kit = Object.freeze({
    B,box,cyl,ball,capsule,taper,flat,glyphs,glyph,solid,blocker,shade,glow,thing,light,
    col,G,S,held,contract:CAMPUS_CONTRACT,CAMPUS_CONTRACT,RX,RZ,GROUND,AXIS_X,SPAWN,OUT,
    rnd,pick,panes,litProps,lampPools,pane,litten,fwin,fwinZ,fwinX,acBox,
    tree,bike,bench,fountain,lamp,sign,dynamic,
  });
  const requiredFits={boundary:10,academic:20,west:30,east:40,furniture:50,life:60};
  for(const [id,order] of Object.entries(requiredFits)){
    const row=CampusFits.rows.find(r=>r.id===id);
    if(!row) throw new Error(`missing Campus fit: ${id}`);
    if(row.order!==order) throw new Error(`Campus fit ${id} must use order ${order}`);
  }
  for(const row of CampusFits.rows)
    if(requiredFits[row.id]===undefined) throw new Error(`unknown Campus fit: ${row.id}`);
  const rows=CampusFits.rows.slice().sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const hooks=[];
  for(const row of rows) hooks.push({id:row.id,hook:row.build(kit)||{}});

  function sharedNight(n) {
    const k=Math.max(0,Math.min(1,Number(n)||0)),soft=k*k*(3-2*k);
    for(const q of litProps) q.p.glow=q.base+soft*q.k*.34;
    for(const g of lampPools) g.a=soft*.30;
    for(let i=0;i<panes.length;i++){
      const q=panes[i],p=q.p||q;
      if(!p.color0) p.color0=p.color;
      const on=((i*2654435761>>>0)%100)/100<.42;
      p.color=soft>.5&&on?col.warm:p.color0; p.glow=soft>.5&&on?.34*soft:0;
    }
  }
  function setNight(n) {
    for(const q of hooks) if(typeof q.hook.setNight==='function') q.hook.setNight(n);
    sharedNight(n);
  }
  function tick(t,player,gameMinutes) {
    const events=[];
    for(const q of hooks){
      if(typeof q.hook.tick!=='function') continue;
      const v=q.hook.tick(t,player,gameMinutes);
      if(Array.isArray(v)) events.push(...v); else if(v!==undefined&&v!==null) events.push(v);
    }
    return events.length?events:undefined;
  }
  const campusSouth={id:'campus-south',x0:-47.8,x1:47.8,z0:-13.4,z1:18.8,light:[-3,4,-1]};
  const zones=[
    {id:'main-gate-apron',x0:-6.35,x1:.35,z0:-15.7,z1:-12.6,light:[-3,4,-1]},
    {id:'west-gate-apron',x0:-50.7,x1:-47,z0:17.3,z1:22.7,light:[-35,4,44]},
    {id:'east-gate-apron',x0:47,x1:50.7,z0:17.3,z1:22.7,light:[36,4,44]},
    campusSouth,
    {id:'campus-core',x0:-28.4,x1:28.4,z0:18,z1:66.6,light:[-3,4,36]},
    {id:'campus-west',x0:-47.8,x1:-27.6,z0:18,z1:66.6,light:[-35,4,44]},
    {id:'campus-east',x0:27.6,x1:47.8,z0:18,z1:66.6,light:[36,4,44]},
  ];
  return B.finish({
    setNight,tick,RX,RZ,OUT,contract:CAMPUS_CONTRACT,
    label:'大学城',labelK:'北京文华大学 · campus',indoor:false,cutaway:false,
    near:.18,far:700,fogNear:30,fogD:.0058,expose:.52,spawn:{...SPAWN},zones,
    roomAt(x,z,previousRoomId){
      const hit=zones.find(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
      return hit||zones.find(r=>r.id===previousRoomId)||campusSouth;
    },
  });
});
