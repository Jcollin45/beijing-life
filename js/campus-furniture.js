// Exhaustive campus furniture manifest. Coordinates in this file are the authored schedule.
const CAMPUS_TREES = [
  [-26,-10],[25,-10],[-26,16],[26,16],
  [-19,-8],[-11,-6],[20,-9],[21,-5],[-22,13],[18,13],
  [-16,26],[-9,28],[-16,39],[-9,43],
  [5,26],[13,28],[6,39],[14,43],
  [-26,45],[25,26],[26,39],[25,47],
];
const CAMPUS_LAMPS = [
  [-7,-8],[1,-8],[-7,2],[1,2],[-7,12],[1,12],
  [-12,25],[1,25],[-7,36],[1,36],[-12,48],[6,48],
  [-24,28],[-24,40],[22,28],[22,40],
  [-26.5,5.5],[27,1.5],[25,9],[23,17],
];
const CAMPUS_LOCAL_LIGHTS = [
  ['main-gate',-3,3.8,-12.2,1.10,5.5],['metro',-11.4,2.7,-10.2,.90,4.0],
  ['print',-10.5,2.0,14.5,.70,3.0],['canteen',-27.6,3.0,2.5,1.05,5.0],
  ['dorm',28.5,3.0,-2,.85,4.5],['admin',-27.5,3.0,30,.85,4.5],
  ['science',-26.5,3.0,50,.90,4.8],['teaching',-3,3.4,49.5,1.10,5.5],
  ['student',28.5,3.2,27,.80,4.2],['clinic',28.5,3.2,31,.80,4.2],
  ['library',28.5,3.2,50,1.00,5.0],['security',5.9,2.7,-9.5,.70,3.5],
  ['court',36,4.5,13,1.10,8.0],
];
const CAMPUS_BENCHES = [
  [-8,-3,0],[2,-3,0],[18,3.5,Math.PI],[-8,10,0],[3,7,Math.PI],
  [-16,23.5,0],[15,23.5,0],[-17,30,Math.PI/2],[-17,42,Math.PI/2],
  [17,30,-Math.PI/2],[17,42,-Math.PI/2],[-8,25,0],[11,25,0],
  [24,35.5,-Math.PI/2],[25,54,-Math.PI/2],[27,11.5,Math.PI/2],
];
const INTERACTIVE_BENCHES = [
  {at:[-8,.48,-3],focus:[-8,-2.1]},
  {at:[-17,.48,30],focus:[-16,30]},
  {at:[17,.48,30],focus:[16,30]},
  {at:[25,.48,54],focus:[24,54]},
];
const FOUNTAINS = [
  [4.5,-4.5],[-9,17],[8,23.2],[-18,46.5],[18,46.5],[-24.5,33.5],[27,35.5],[25,13],
];
const SORTING_BINS = [
  [-20,-5],[18,-7],[-24.8,10.5],[26,-6.5],[-15,16],[11,23],
  [-25.5,38],[27,42],[-25,58],[25,61.5],[-27,14],[27,7.5],
];
const FIRE_FIXTURES = [
  {id:'F01',at:[-28.72,1.25,10],kind:'cabinet-x'},
  {id:'F02',at:[29.72,1.25,6],kind:'cabinet-x'},
  {id:'F03',at:[-43.18,1.25,30],kind:'cabinet-x'},
  {id:'F04',at:[-26,.52,40],kind:'standpipe'},
  {id:'F05',at:[43.18,1.25,25],kind:'cabinet-x'},
  {id:'F06',at:[29.72,1.25,38.8],kind:'cabinet-x'},
  {id:'F07',at:[-21,.52,62],kind:'standpipe'},
  {id:'F08',at:[18,.52,62],kind:'standpipe'},
];
const INTERACTIVE_FOUNTAINS = [
  {at:[4.5,.78,-4.5],focus:[4.5,-3.7]},
  {at:[-9,.78,17],focus:[-9,17.8]},
  {at:[8,.78,23.2],focus:[8,22.4]},
  {at:[-18,.78,46.5],focus:[-18,47.3]},
  {at:[18,.78,46.5],focus:[18,47.3]},
];

CampusFits.register('furniture', 50, kit => {
  const {box,cyl,capsule,flat,glyphs,solid,shade,thing,light,col,G,S,held,
    bike,tree,lamp,bench,fountain,sign,litten} = kit;

  // P-BIKE and the packed bicycle hub.
  flat(-16.5,.006,3,13,10,held(col.paveD,S.path),{mode:9,gloss:.10,...S.path});
  const frame=held(col.steelD,S.steel);
  for(const x of [-22,-16.5,-11]) for(const z of [-1.5,7.5]){
    cyl(x,1.35,z,.075,2.70,frame,{gloss:G.metal,...S.steel});
    solid(x-.11,x+.11,z-.11,z+.11);
  }
  for(const z of [-1.5,7.5]) box(-16.5,2.56,z,11.2,.14,.28,frame,
    {hard:true,gloss:G.metal,...S.steel});
  box(-16.5,2.76,3,12.4,.12,9.2,held(col.tarp,S.tarp),
    {hard:true,mode:7,gloss:.10,...S.tarp});
  for(const row of [{z:.20,yaw:0},{z:5.80,yaw:Math.PI}]){
    for(let i=0;i<16;i++){
      const x=-21.75+i*.70;
      box(x,.09,row.z,.10,.18,.70,frame,{hard:true,gloss:G.metal,...S.steel});
      bike(x,row.z,row.yaw,[col.bike1,col.bike2,col.bike3,col.bike4][i%4]);
    }
  }
  solid(-22,-11,-.70,1.10); solid(-22,-11,4.90,6.70);

  // O02 charging cabinet and numbered sockets.
  box(-10.7,.90,3,.80,1.80,.45,col.blue,{tag:'自行车',hard:true,gloss:.27});
  for(let i=0;i<6;i++){
    const y=.40+(i%3)*.46,z=2.75+(i>2?.22:0);
    cyl(-10.27,y,z,.055,.035,col.black,{rz:Math.PI/2,gloss:.25,tag:'自行车'});
    glyphs(-10.25,y+.12,z,-Math.PI/2,String(i+1),
      {tag:'自行车',size:.08,gap:0,color:col.white,mode:1});
  }
  solid(-11.15,-10.25,2.55,3.45);
  thing('自行车',-10.3,1.1,5.8,'这么多自行车，我的在哪儿？',
    'So many bicycles. Where is mine?','自行车 — self-run vehicle. 骑车 is to ride one.',
    {focus:[-8.9,5.8],reach:2.2});

  const sharedBikes = [
    [-8,-7.5,.20],[3,-7,-.30],[18,-5,.50],[24,-5.5,1.20],
    [-25,11.5,.10],[-8,18,.60],[9,18,-.25],[24,18,.15],
    [-25,23,1.40],[-18,48,.20],[18,48,-.20],[27,33,.80],
  ];
  sharedBikes.forEach(([x,z,yaw],i)=>bike(x,z,yaw,
    [col.bike1,col.bike2,col.bike3,col.bike4][i%4]));

  // Trees and exterior lamps.
  const heights=[5.6,6.0,6.3];
  CAMPUS_TREES.forEach(([x,z],i)=>tree(x,z,heights[i%heights.length]));
  CAMPUS_LAMPS.forEach(([x,z])=>lamp(x,z));
  for(const [,x,y,z,power,radius] of CAMPUS_LOCAL_LIGHTS)
    light(x,y,z,[1,.86,.62],power,radius);

  // Benches and the four usable anchors.
  CAMPUS_BENCHES.forEach(([x,z,yaw])=>bench(x,z,yaw));
  for(const row of INTERACTIVE_BENCHES)
    thing('长椅',...row.at,'坐一会儿再走。','Sit for a while before moving on.',
      '长 long + 椅 chair. 坐下 is to sit down.',{focus:row.focus,reach:1.8});

  // Fountains and exact interactive rows.
  FOUNTAINS.forEach(([x,z])=>fountain(x,z));
  for(const row of INTERACTIVE_FOUNTAINS)
    thing('饮水机',...row.at,'饮水机的水不要钱。','The water from the fountain is free.',
      '饮水 drinking water + 机 machine. 喝 is to drink.',{focus:row.focus,reach:1.6});

  // Four-stream sorting stations with one conservative body solid apiece.
  const binCols=[col.blue,col.green,col.redD,col.charcoal];
  const binNames=['可回收物','厨余垃圾','有害垃圾','其他垃圾'];
  for(const [x,z] of SORTING_BINS){
    [-.66,-.22,.22,.66].forEach((dx,i)=>{
      box(x+dx,.43,z,.38,.86,.48,binCols[i],{tag:binNames[i],hard:true,gloss:.18});
      glyphs(x+dx,.70,z-.25,Math.PI,binNames[i],
        {tag:binNames[i],size:.055,gap:.012,color:col.white,mode:1});
    });
    solid(x-.95,x+.95,z-.275,z+.275);
  }

  // Fire cabinets are already covered by their building bodies; standpipes get exact solids.
  for(const f of FIRE_FIXTURES){
    const [x,y,z]=f.at;
    if(f.kind==='cabinet-x'){
      box(x,y,z,.18,.90,.72,col.redD,{tag:'消防栓',hard:true,gloss:.24});
      glyphs(x+(x<0?.12:-.12),y,z,x<0?Math.PI/2:-Math.PI/2,'消防栓',
        {tag:'消防栓',size:.09,gap:.025,color:col.white,mode:1,vertical:true});
    } else {
      cyl(x,y,z,.14,1.04,col.redD,{tag:'消防栓',gloss:.25});
      cyl(x,1.05,z,.16,.08,col.chrome,{tag:'消防栓',gloss:G.metal});
      solid(x-.18,x+.18,z-.18,z+.18);
    }
  }

  // Drainage details are flush and non-blocking.
  for(const [x,z] of [[-21,-10],[19,-10],[-21,16],[19,16],[-27,47],[27,47],[-44,30],[44,30]]){
    flat(x,.014,z,.45,.45,col.steelD,{gloss:G.metal});
    // Three wider slots preserve the full grate silhouette with two fewer tiny draw properties.
    for(let i=-1;i<=1;i++) flat(x+i*.13,.017,z,.028,.39,col.black,{gloss:.05});
  }
  for(const [x,z] of [[-3,-1],[-3,40]]){
    cyl(x,.014,z,.30,.02,col.steelD,{hard:true,mode:7,gloss:.22});
  }

  // S02-S06 exact wayfinding posts.
  sign(3,16,['教学楼','图书馆','食堂','宿舍'],'校园指示-S02');
  sign(-24,20,['食堂','行政楼','实验楼'],'校园指示-S03');
  sign(22,20,['宿舍','活动中心','校医院','图书馆'],'校园指示-S04');
  sign(-24,49,['实验楼','第一教学楼'],'校园指示-S05');
  sign(22,49,['第一教学楼','图书馆'],'校园指示-S06');

  return {};
});
