// 公司屋顶 · 屋顶花园 · 户外工作台 · 光伏设备 · 机房
//
// The roof is the one storey in this tower with an inside and an outside, and the programme names
// three different kinds of boundary.  A machine room wants a wall.  A photovoltaic array wants a
// screen you can see through — 3.45 m of masonry round an array would shade it and would blank
// this half of the plate out of the east camera.  A garden wants neither.  This file builds all
// three, and the parapet the deck stops at.
//
// Measured facts it depends on, read out of js/office-core.js rather than assumed:
//   * plate RX 12 / RZ 9 / H 3.45; the walkable base zone stops a body at |x| 11.52, z −8.52.
//   * the rooftop branch of the shell emits FOUR perimeter body solids — west x −12.15…−11.82,
//     east 11.82…12.15, south z −9.15…−8.82, north z 8.82…9.15 (office-core.js:284-285).  The
//     roof edge is therefore held by a real collider, coincident with the zone clamp and exactly
//     one body radius off the parapet's inner face.  Nothing here adds edge collision; what was
//     missing was the finish, and a distance for the edge to be an edge against.
//   * the camera cutaway is OFF on this floor (`cutaway:!rooftop`, office-core.js:686), so
//     hideX/hideZ never leave 0 and `hiddenProp` can never fire.  Tag groups are still kept tight
//     below, because that is only true for as long as nobody turns the cutaway on.
//   * spine z 2.20…4.00 and the whole north core band z 4.00…9.00 belong to the shell.

(() => {
  const KEY='officeRoof';

  try {
    Glyphs.need(
      '屋顶花园凉亭拉伸区灌溉太阳能板公司屋顶开放时间请爱护植物设备区非工作人员勿入' +
      '香草番茄生菜雨水回收滴灌水泵光伏逆变器空调机组安全通道' +
      '户外工作台机房刷卡进入配电柜新风注意高压今日发电电源工位值班巡检' +
      '检修门直流交流并网屋面排水护栏城市远景合用工具间露天'
    );
  } catch (_) {}

  OfficeFit.register(KEY,A=>{
    const {
      box,cyl,ball,taper,flat,glyphs,solid,blocker,shade,light,thing,luminous,onTick,room,
      partitionZ,partitionX,
      groupCamera,RX,RZ,H,C,col,accent,state,
    }=A;

    const P={
      roof:C('#777a77'), roofD:C('#5d6261'), path:C('#c9c5b8'), pathD:C('#a9a79f'),
      steel:C('#8d9698'), steelD:C('#4f595b'), black:C('#1d2224'), white:C('#f3efe4'),
      cream:C('#e6ddc9'),
      wall:C('#bcb8ad'), wallD:C('#9d9a90'), stone:C('#cbc7bb'), mesh:C('#b6bdbe'),
      wood:C('#98704b'), woodL:C('#bb9368'), woodD:C('#5c4432'),
      green:C('#4e7450'), greenL:C('#7fa273'), greenD:C('#31543b'), leaf:C('#5f8858'),
      sage:C('#8aa17b'), herb:C('#5b8460'), lettuce:C('#91ad68'), flower:C('#d5a247'),
      soil:C('#574333'), soilL:C('#765942'), terracotta:C('#a96747'), clayL:C('#bc7956'),
      blue:C('#3f718c'), blueL:C('#76aabc'), glass:C('#809faa'),
      red:C('#ad4036'), amber:C('#d29436'), warm:C('#ffd99a'),
      rubber:C('#44505a'), rubberL:C('#647789'), screen:C('#17303a'),
      sky:C('#c2d6e2'), cityA:C('#6f7d88'), cityB:C('#5e6b75'), cityC:C('#828e97'),
    };

    // ---------------------------------------------------------------- measured envelope numbers
    // Everything about the built east sixth of the plate derives from these, so the walls, the
    // rooms, the floors and the two openings through the envelope cannot drift apart.
    const YARD={x0:5.20,x1:11.84,z0:-5.80,z1:-2.30};   // 光伏设备区 — screened, open to the sky
    const PLANT={x0:5.20,x1:11.84,z0:-8.84,z1:-5.80};  // 机房 — walled and roofed
    const PLANT_DOOR={x:8.00,w:1.10,h:2.30};           // in the wall at z = PLANT.z1
    const YARD_GATE={x:8.00,w:1.20};                   // in the screen at z = YARD.z1

    // Two conventions this file holds to, both of them things that have gone wrong elsewhere:
    //
    //  * glyph facing.  yaw 0 is read from the −z side and yaw π from the +z side (check it
    //    against the shell's own directory at office-core.js:448).  The inherited planter labels
    //    here were on the bed's south face pointing north, i.e. behind the bed from every camera
    //    on this roof; they are on the north face now.
    //  * `cyl` for anything rod-shaped.  js/gl.js:1466 gives a capsule hemispherical caps a
    //    quarter of its height each, scaled by sy, so a rail or a stem drawn as one tapers to a
    //    point.  `cyl` takes a RADIUS where `capsule` takes a full width — every number halved.
    const DECAL={nocut:true};   // floor-plate-scale props opt out of a cutaway they would break
    // Duplicated intentionally for loader independence; the Node parity gates require this exact
    // Float32 ceiling to match OfficeCamera, weather and the renderer upload clamp.
    const MAX_AGGREGATE_FOLIAGE_WIND=Math.fround(1.05*1.17);
    const cameraFixture=(id,build)=>{
      const at=A.B.props.length,value=build();
      groupCamera(id,A.B.props.slice(at));
      return value;
    };
    // Dense organic fixtures should cost one conservative camera candidate, not one candidate per
    // leaf. One rendered member owns the complete rotated-OBB union; all siblings remain in its
    // local camera group, so a cut removes the cohesive assembly and never leaves floating detail.
    const aggregateCameraFixture=(id,items)=>{
      const props=[];
      const collect=value=>{
        if(Array.isArray(value))for(const q of value)collect(q);
        else if(value&&typeof value==='object')props.push(value);
      };
      collect(items);
      const obbed=props.filter(p=>p.cameraOb||p.ob);
      if(!obbed.length){groupCamera(id,props);return props;}
      let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,z0=Infinity,z1=-Infinity;
      for(const p of obbed){
        const b=p.cameraOb||p.ob,c=Math.cos(b.ry||0),s=Math.sin(b.ry||0),m=p.m;
        let px0=b.x-(Math.abs(c)*b.sx+Math.abs(s)*b.sz)/2;
        let px1=b.x+(Math.abs(c)*b.sx+Math.abs(s)*b.sz)/2;
        let py0=b.y-b.sy/2,py1=b.y+b.sy/2;
        let pz0=b.z-(Math.abs(s)*b.sx+Math.abs(c)*b.sz)/2;
        let pz1=b.z+(Math.abs(s)*b.sx+Math.abs(c)*b.sz)/2;
        if(m&&m.length===16&&Array.from(m).every(Number.isFinite)){
          const f=i=>Math.fround(m[i]);
          const ex=(Math.abs(f(0))+Math.abs(f(4))+Math.abs(f(8)))/2;
          const ey=(Math.abs(f(1))+Math.abs(f(5))+Math.abs(f(9)))/2;
          const ez=(Math.abs(f(2))+Math.abs(f(6))+Math.abs(f(10)))/2;
          let wx=0,wy=0,wz=0;
          if(p.mode===15){
            const scaleX=Math.hypot(f(0),f(1),f(2)),scaleZ=Math.hypot(f(8),f(9),f(10));
            const a=(.055+.16*MAX_AGGREGATE_FOLIAGE_WIND)/
              Math.max(.35,.5*Math.hypot(scaleX,scaleZ));
            wx=a*(Math.abs(f(0))+Math.abs(f(8)));
            wy=a*(Math.abs(f(1))+Math.abs(f(9)));
            wz=a*(Math.abs(f(2))+Math.abs(f(10)));
          }
          px0=Math.min(px0,f(12)-ex-wx);px1=Math.max(px1,f(12)+ex+wx);
          py0=Math.min(py0,f(13)-ey-wy);py1=Math.max(py1,f(13)+ey+wy);
          pz0=Math.min(pz0,f(14)-ez-wz);pz1=Math.max(pz1,f(14)+ez+wz);
        }
        // One-micrometre physical margin closes Float32/double face-rounding without relying on
        // validator tolerance as geometry. This is far below a rendered pixel at office scale.
        p.cameraOb={x:(px0+px1)/2,y:(py0+py1)/2,z:(pz0+pz1)/2,
          sx:px1-px0+2e-6,sy:py1-py0+2e-6,sz:pz1-pz0+2e-6,ry:0};
        px0-=1e-6;px1+=1e-6;py0-=1e-6;py1+=1e-6;pz0-=1e-6;pz1+=1e-6;
        x0=Math.min(x0,px0);x1=Math.max(x1,px1);
        y0=Math.min(y0,py0);y1=Math.max(y1,py1);
        z0=Math.min(z0,pz0);z1=Math.max(z1,pz1);
      }
      const leader=obbed[0];
      leader.cameraOb={x:(x0+x1)/2,y:(y0+y1)/2,z:(z0+z1)/2,
        sx:x1-x0+4e-6,sy:y1-y0+4e-6,sz:z1-z0+4e-6,ry:0};
      leader.cameraOccluder=true;
      for(const p of obbed)if(p!==leader)p.cameraOccluder=false;
      groupCamera(id,props);
      return props;
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
    const localizeCameraGroup=(props,x,z,span=2.68)=>{
      const half=span/2;
      for(const p of props) {
        const source=p.cameraOb||p.ob;
        if(!source) continue;
        const b={...source};
        for(const [axis,sizeKey,sweepKey,centre] of [
          ['x','sx','cameraSweepX',x],['z','sz','cameraSweepZ',z],
        ]) {
          const oldSize=b[sizeKey],oldCentre=b[axis];
          if(!Number.isFinite(oldSize)||!Number.isFinite(oldCentre)) continue;
          const size=Math.min(oldSize,span);
          const next=Math.max(centre-half+size/2,Math.min(centre+half-size/2,oldCentre));
          p[sweepKey]=Math.max(p[sweepKey]||0,Math.abs(oldCentre-next)+(oldSize-size)/2);
          b[sizeKey]=size; b[axis]=next;
        }
        p.cameraOb=b;
      }
      return props;
    };

    // `tag` is not decoration: js/build.js:456 resolves a picked prop's tag to the thing that
    // wears it, so a station whose tag no prop carries can only be reached by walking into its own
    // floating label.  Every call below names the prop group the player actually walks up to.
    const interactive=(hz,tag,x,y,z,zh,en,note,focus,reach,action,department)=>{
      const q=thing(hz,x,y,z,zh,en,note,{tag,focus,reach});
      q.officeFloor=KEY;
      q.officeAction=action;
      q.officeStation={floor:KEY,id:action,department};
      return q;
    };
    function plateZ(x,y,z,w,h,zh,color=accent,tag=zh,opts={}) {
      return cameraSpanFixture(`plate:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,'x',()=>{
        box(x,y,z,w,h,.055,color,{hard:true,mode:1,glow:.025,tag});
        const faces=opts.twoSided===false?[[z+.034,0]]:[[z-.034,Math.PI],[z+.034,0]];
        for(const [fz,yaw] of faces)
          glyphs(x,y,fz,yaw,zh,{size:Math.min(.205,(w-.22)/Math.max(2,[...zh].length)),
            gap:.034,color:P.white,mode:1,lift:.009,tag});
      });
    }
    function bollard(x,z,tag) {
      const at=A.B.props.length;
      cyl(x,.39,z,.085,.74,P.steelD,{gloss:.42,tag});
      luminous(cyl(x,.73,z,.095,.15,P.warm,{mode:1,alpha:.86,glow:.12,tag}),.03,.22);
      box(x,.84,z,.20,.055,.20,P.black,{hard:true,tag});
      light(x,.85,z,[1,.79,.54],.15,2.65);
      solid(x-.11,x+.11,z-.11,z+.11);
      groupCamera(`bollard:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function bench(x,z,w=2.15,yaw=0,tag='长椅') {
      const at=A.B.props.length;
      box(x,.47,z,w,.12,.55,P.woodL,{hard:true,mode:6,gloss:.20,ry:yaw,tag});
      // yaw points toward the sitter's view; the backrest sits behind it.
      const bx=x-Math.sin(yaw)*.24,bz=z-Math.cos(yaw)*.24;
      for(let i=-2;i<=2;i++) cyl(bx+Math.cos(yaw)*i*w/5,.76,bz-Math.sin(yaw)*i*w/5,
        .0125,.52,P.wood,{rz:Math.PI/2,ry:yaw,tag});
      for(const s of [-1,1]) {
        const px=x+Math.cos(yaw)*s*(w/2-.28),pz=z-Math.sin(yaw)*s*(w/2-.28);
        box(px,.23,pz,.075,.46,.45,P.steelD,{hard:true,ry:yaw,tag});
      }
      const sx=Math.abs(Math.sin(yaw))>.5?.40:w/2;
      const sz=Math.abs(Math.sin(yaw))>.5?w/2:.40;
      solid(x-sx,x+sx,z-sz,z+sz);
      shade(x,z,w+.12,.90,.20);
      groupCamera(`bench:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function planter(x,z,w,d,label,seed,tag,labelTag) {
      const planterCamera=[];
      const shell=label==='番茄'?P.terracotta:label==='生菜'?P.clayL:P.wood;
      planterCamera.push(box(x,.38,z,w,.70,d,shell,
        {hard:true,round:.08,mode:7,gloss:.12,tag}));
      planterCamera.push(box(x,.69,z,w-.18,.08,d-.18,P.soil,
        {hard:true,mode:7,gloss:.035,tag}));
      planterCamera.push(box(x,.08,z,w+.08,.16,d+.08,P.woodD,
        {hard:true,mode:6,tag}));
      for(const sz of [-1,1]) planterCamera.push(box(x,.73,z+sz*(d/2-.035),w+.06,.11,.075,
        P.woodL,{hard:true,mode:6,gloss:.16,tag}));
      for(const sx of [-1,1]) planterCamera.push(box(x+sx*(w/2-.035),.73,z,.075,.11,d-.04,
        P.woodL,{hard:true,mode:6,gloss:.16,tag}));
      for(const sx of [-1,1]) for(const sz of [-1,1]) {
        planterCamera.push(box(x+sx*(w/2-.13),.17,z+sz*(d/2-.13),.14,.28,.14,P.woodD,
          {hard:true,mode:6,tag}));
        planterCamera.push(box(x+sx*(w/2-.035),.51,z+sz*(d/2-.035),.055,.52,.055,
          P.steelD,{hard:true,gloss:.44,tag}));
      }
      // Airy herbs, staked tomatoes and low lettuce rosettes: the silhouette identifies the bed
      // before the small label on its face can be read.
      const n=label==='番茄'?Math.max(3,Math.floor(w/.70)):Math.max(4,Math.floor(w/.46));
      const tomatoPlants=[];
      for(let i=0;i<n;i++) {
        const plantAt=A.B.props.length;
        const px=x-w/2+.30+i*(w-.60)/Math.max(1,n-1);
        const row=((i+seed)%2)-.5,pz=z+row*.34;
        if(label==='番茄') {
          const crown=[],plant=[],h=.70+((i+seed)%2)*.12;
          plant.push(cyl(px,.72+h*.50,pz,.009,h,P.greenD,{tag}));
          plant.push(cyl(px,.72+.52,pz+.06,.007,1.08,P.woodD,
            {tag,cameraOccluder:true}));
          for(let k=0;k<4;k++) {
            const a=k*2.399+(i+seed)*.3,yy=.88+k*.15;
            crown.push(ball(px+Math.sin(a)*.14,yy,pz+Math.cos(a)*.11,.16,.050,.10,
              k%2?P.leaf:P.greenL,{mode:15,ry:a,rz:(k%2-.5)*.5,tag}));
          }
          for(let k=0;k<2;k++) crown.push(ball(
            px+(k?-.09:.10),1.10+k*.14,pz+(k?-.07:.08),.060,.060,.060,
            k?P.red:P.amber,{mode:7,tag,cameraOccluder:true}));
          plant.push(...crown);tomatoPlants.push(plant);
        } else if(label==='生菜') {
          for(let k=0;k<7;k++) {
            const a=k*Math.PI*2/7+(i+seed)*.21;
            ball(px+Math.sin(a)*.11,.80+(k%2)*.025,pz+Math.cos(a)*.10,
              .18,.050,.10,k%3?P.lettuce:P.greenL,{mode:15,ry:a,rz:(k%2?1:-1)*.30,tag});
          }
          ball(px,.83,pz,.11,.07,.11,P.greenL,{mode:15,tag});
        } else {
          const stems=3+(i+seed)%3;
          for(let k=0;k<stems;k++) {
            const a=k*2.399+(i+seed)*.2,h=.24+(k%2)*.10;
            cyl(px+Math.sin(a)*.07,.72+h*.52,pz+Math.cos(a)*.08,.006,h,P.greenD,{tag});
            ball(px+Math.sin(a)*.11,.77+h,pz+Math.cos(a)*.11,.10,.038,.07,
              k%2?P.herb:P.sage,{mode:15,ry:a,rz:(k%3-1)*.35,tag});
          }
        }
        // Lettuce rosettes use seven overlapping depth-writing leaves; one exact local union per
        // rosette preserves that silhouette while avoiding seven identical broad-phase entries.
        if(label==='生菜')
          aggregateCameraFixture(`planter:${tag}:plant-${i}`,A.B.props.slice(plantAt));
      }
      // Cultivar labels identify each individual bed; the column log board below owns the action.
      // A label on both sides of two large beds should not behave like one invisible long-range
      // control, so these keep a descriptive tag rather than borrowing the workflow tag.
      const cultivarTag=labelTag+'苗牌';
      planterCamera.push(box(x-w/2+.18,.94,z+d/2-.14,.05,.42,.05,P.woodD,
        {hard:true,tag:cultivarTag}));
      planterCamera.push(box(x-w/2+.18,1.08,z+d/2-.14,.34,.18,.025,P.cream,
        {hard:true,ry:.04,tag:cultivarTag}));
      for(let i=0;i<7;i++) planterCamera.push(ball(
        x-w/2+.30+(i*(.37+seed*.01))%(w-.60),.745,
        z+(((i*seed+3)%7)/6-.5)*(d-.28),.035,.018,.025,
        i%2?P.soilL:P.steel,{mode:7,tag}));
      if(label==='番茄') {
        for(const [i,sx] of [[0,-1],[n-1,1]])tomatoPlants[i].push(
          cyl(x+sx*(w/2-.18),1.23,z,.010,1.02,P.steelD,{tag}));
        cyl(x,1.72,z,.010,w-.36,P.steelD,{rz:Math.PI/2,tag});
        for(let i=0;i<n;i++) tomatoPlants[i].push(cyl(
          x-w/2+.30+i*(w-.60)/Math.max(1,n-1),1.25,z,
          .004,.82,P.steel,{tag,cameraOccluder:true}));
        // Each crown, stem and its two stakes form one tight nine-member cut. The shared trellis
        // remains independently indexed, so grazing one plant never blinks a whole 2.55 m bed.
        for(let i=0;i<n;i++)
          aggregateCameraFixture(`planter:${tag}:tomato-${i}`,tomatoPlants[i]);
      }
      // A light head on the bed's own north-east corner post.  Four of the inherited garden
      // bollards stood in the middle of the 0.82 m gaps between beds and in the 1.10 m alley,
      // and a 0.22 m obstacle in an 0.82 m gap leaves a body no centre line at all.
      planterCamera.push(luminous(cyl(x+w/2-.035,.86,z+d/2-.035,.075,.13,P.warm,
        {mode:1,alpha:.88,glow:.10,tag}),.02,.20));
      planterCamera.push(box(x+w/2-.035,.95,z+d/2-.035,.16,.05,.16,P.black,
        {hard:true,tag}));
      if(seed%2) light(x+w/2-.035,.97,z+d/2-.035,[1,.80,.56],.12,2.4);
      // North face, facing the whole roof — the old label was on the south face pointing north,
      // i.e. hidden behind its own bed from every camera on this floor.
      // A real cream enamel plaque gives every cultivar a consistent small-text contrast. The
      // north-east bed shifts its plaque clear of the adjacent irrigation tank instead of letting
      // that cylinder cover both characters.
      const labelX=seed===6?x+.52:x,labelW=seed===6?.46:.54;
      planterCamera.push(box(labelX,.39,z+d/2+.0125,labelW,.24,.025,P.cream,
        {hard:true,mode:1,tag}));
      planterCamera.push(glyphs(labelX,.39,z+d/2+.035,0,label,
        {size:.14,gap:.035,color:P.black,mode:1,lift:.008,tag}));
      groupCamera(`planter:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,planterCamera);
      solid(x-w/2-.04,x+w/2+.04,z-d/2-.04,z+d/2+.04);
      shade(x,z,w+.15,d+.18,.20);
    }

    // A 2.29 m screen: low masonry plinth, coping, mesh infill and a capping rail.  Deliberately
    // mostly mesh — this is the enclosure the coordinator's "fence you can see through" asks for,
    // but built as a wall rather than as loose posts, and it emits its own solid.
    function screenRun(axis,fixed,a,b,tag) {
      if(b-a<.06) return;
      const alongX=axis==='z',mid=(a+b)/2,len=b-a;
      const at=A.B.props.length;
      const put=(y,h,t,color,o={})=>alongX
        ? box(mid,y,fixed,len,h,t,color,{hard:true,tag,...o})
        : box(fixed,y,mid,t,h,len,color,{hard:true,tag,...o});
      put(.275,.55,.14,P.wallD,{mode:14,gloss:.10});
      put(.59,.08,.24,P.stone,{gloss:.26});
      put(1.43,1.60,.030,P.mesh,{mode:1,alpha:.34,gloss:.28});
      put(2.245,.09,.16,P.steelD,{gloss:.44});
      for(let t=a;t<=b+.01;t+=1.62) {
        const p=Math.min(t,b);
        if(alongX) box(p,1.12,fixed,.10,2.24,.16,P.steelD,{hard:true,gloss:.40,tag});
        else box(fixed,1.12,p,.16,2.24,.10,P.steelD,{hard:true,gloss:.40,tag});
      }
      const screenCamera=A.B.props.slice(at);
      localizeCameraGroup(screenCamera,alongX?mid:fixed,alongX?fixed:mid);
      groupCamera(`screen:${tag}:${axis}:${fixed.toFixed(2)}:${a.toFixed(2)}:${b.toFixed(2)}`,
        screenCamera);
      if(alongX) solid(a,b,fixed-.08,fixed+.08); else solid(fixed-.08,fixed+.08,a,b);
    }
    function airHandler(x,z,w,d,tag) {
      const at=A.B.props.length;
      box(x,.76,z,w,1.30,d,P.steel,{hard:true,round:.08,mode:7,gloss:.38,tag});
      for(const sx of [-1,1]) for(const sz of [-1,1])
        box(x+sx*(w/2-.18),.12,z+sz*(d/2-.18),.15,.24,.15,P.steelD,{hard:true,tag});
      for(let i=-2;i<=2;i++) box(x-w*.25+i*w*.12,.80,z+d/2+.025,.035,.78,.018,P.steelD,
        {hard:true,tag});
      luminous(cyl(x+w*.38,.90,z+d/2+.04,.035,.018,P.green,
        {rx:Math.PI/2,mode:1,glow:.055,tag}),.01,.08);
      cyl(x-w*.22,1.72,z,.19,.62,P.steelD,{gloss:.30,tag});
      cyl(x-w*.22,2.05,z,.22,.09,P.steel,{gloss:.44,tag});
      solid(x-w/2-.08,x+w/2+.08,z-d/2-.08,z+d/2+.08);
      shade(x,z,w+.25,d+.25,.25);
      groupCamera(`air-handler:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function stool(x,z,tag) {
      const at=A.B.props.length;
      cyl(x,.44,z,.185,.055,P.woodL,{mode:6,gloss:.22,tag});
      cyl(x,.21,z,.032,.42,P.steelD,{gloss:.46,tag});
      cyl(x,.025,z,.20,.045,P.steelD,{gloss:.40,tag});
      solid(x-.14,x+.14,z-.14,z+.14);
      shade(x,z,.44,.44,.18);
      groupCamera(`stool:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }
    function servicePost(x,z,tag) {
      const at=A.B.props.length;
      cyl(x,.55,z,.075,1.06,P.steelD,{gloss:.44,tag});
      box(x,.94,z,.22,.30,.22,P.black,{hard:true,round:.03,gloss:.28,tag});
      for(const s of [-1,1]) luminous(box(x+s*.115,.94,z,.010,.11,.13,P.amber,
        {hard:true,mode:1,glow:.05,tag}),.012,.09);
      cyl(x,.03,z,.16,.055,P.steelD,{gloss:.38,tag});
      solid(x-.11,x+.11,z-.11,z+.11);
      groupCamera(`service-post:${tag}:${x.toFixed(2)}:${z.toFixed(2)}`,A.B.props.slice(at));
    }

    // ---------------------------------------------------------------- deck surfaces and routes
    // Every prop below is a floor decal at plate scale.  `nocut` on all of them: one 23.55 ×
    // 10.95 m quad judged from its own centre is precisely the prop that deletes a whole
    // department's floor the moment a camera steps out of a room toward the middle of the plate.
    flat(0,.016,-3.32,23.55,10.95,P.roof,
      {mode:14,gloss:.08,mat:'concrete',matScale:1.7,matAmt:.16,tag:'公司屋顶',...DECAL});
    flat(-1.0,.024,-3.10,1.50,10.30,P.path,
      {mode:9,gloss:.12,mat:'paving',matScale:.78,matAmt:.18,tag:'无障碍通道',...DECAL});
    // The path network uses two alternating 3 mm finish planes. Every crossing therefore has a
    // stable depth order while the connected route still reads as one continuous paved system.
    flat(0,.027,-2.05,22.60,1.45,P.path,
      {mode:9,gloss:.12,mat:'paving',matScale:.78,matAmt:.18,tag:'无障碍通道',...DECAL});
    flat(-10.55,.024,-5.20,1.40,6.60,P.path,{mode:9,gloss:.12,tag:'无障碍通道',...DECAL});
    flat(4.50,.024,-5.40,1.10,6.40,P.path,{mode:9,gloss:.12,tag:'无障碍通道',...DECAL});
    flat(-3.20,.027,-8.15,16.40,1.10,P.path,{mode:9,gloss:.12,tag:'无障碍通道',...DECAL});
    flat(8.00,.024,0.05,1.50,4.20,P.path,{mode:9,gloss:.12,tag:'无障碍通道',...DECAL});
    for(let z=-7.6;z<=1.2;z+=1.2)
      flat(-1,.030,z,.11,.45,P.blue,{mode:1,alpha:.64,tag:'无障碍通道',...DECAL});
    // Drainage channels. The southern one stops short of the machine room, which drains through
    // its own roof outlets.
    box(-3.30,.026,-8.58,17.0,.035,.16,P.steelD,{hard:true,gloss:.45,tag:'排水沟',...DECAL});
    for(let x=-11.2;x<4.9;x+=.35)
      box(x,.050,-8.58,.025,.030,.14,P.black,{hard:true,tag:'排水沟',...DECAL});
    box(0,.026,1.92,23.0,.035,.16,P.steelD,{hard:true,gloss:.45,tag:'排水沟',...DECAL});
    for(let x=-11.2;x<11.3;x+=.35)
      box(x,.050,1.92,.025,.030,.14,P.black,{hard:true,tag:'排水沟',...DECAL});

    // ---------------------------------------------------------------- rooms
    // Five rooms were registered here and only one of them had an envelope of any kind.  Two of
    // these seven now do, and they are two different kinds: 光伏设备区 is screened with a gate,
    // 机房 is walled, roofed and entered through a door with a lintel.  The other five are open
    // deck and are camera rooms only, which on a roof garden is the correct answer.
    // Aim the room camera from the open approach, not through the solid centre table.
    room('officeRoof-pergola',-11.72,-4.25,-8.72,-2.35,-7.85,-4.36);
    room('officeRoof-garden',-4.25,5.05,-8.72,-2.35,-0.20,-5.40);
    room('officeRoof-stretch',-11.72,-4.25,-2.20,2.15,-7.90,.10);
    room('officeRoof-arrival',-4.25,5.05,-2.20,2.15,-1.00,.00);
    room('officeRoof-terrace',5.05,11.72,-2.20,2.15,8.50,-.30);
    // These two rects are clipped to the base walkable zone (|x| 11.82, z -8.82) rather than to
    // their own wall lines.  clampMove picks whichever zone containing the body moves it least,
    // so a camera room 2 cm wider than the plate quietly widens the walk envelope with it — the
    // solar room at x1 11.84 measurably let a body reach 11.54, and only the shell's perimeter
    // solid pulled it back to 11.52.  A room should never be the widest thing in the union.
    room('officeRoof-solar',YARD.x0,11.82,YARD.z0,YARD.z1,8.00,-3.10);
    room('officeRoof-plant',PLANT.x0,11.82,-8.82,PLANT.z1,8.00,-6.60,
      {near:3.30,ceil:3.22});

    plateZ(-1.0,2.98,2.10,5.25,.48,'公司屋顶 · 花园',accent,'楼层牌');
    plateZ(-7.70,2.60,-2.08,2.70,.38,'凉亭',P.wood,'凉亭牌');
    plateZ(-0.20,2.60,-2.08,3.15,.38,'屋顶花园',P.green,'屋顶花园牌');
    plateZ(-7.90,2.60,2.08,3.15,.38,'拉伸区',P.rubber,'拉伸区牌');
    plateZ(8.50,2.62,2.08,3.60,.38,'户外工作台',P.woodD,'露台牌');

    // ---------------------------------------------------------------- 女儿墙 · the roof edge
    // What holds a body at this edge is the shell's own four perimeter solids, which stop the
    // capsule at |x| 11.52 and z −8.52 — one body radius off the parapet's inner face at
    // |x| 11.84 / z −8.84, so the capsule's surface touches the masonry.  This is NOT the hotel
    // roof's defect, where the camera was blocked and the body was held only by the zone clamp.
    // So nothing here adds a collider: another parapet inboard of that one would walk the deck
    // edge back for no gain and would leave an unreachable slot behind it.  What the edge was
    // actually missing was the coping on the 0.96 m upstand, a capping rail on the 1.72 m wind
    // screen, outlets at the base and a lightning tape.  Runs get their own tag each.
    const copingRuns=[
      ['x',-11.92,-9.00,4.00,'女儿墙西'],
      ['x',11.92,-5.74,4.00,'女儿墙东'],
      ['z',-8.92,-12.00,5.14,'女儿墙南'],
    ];
    for(const [axis,fixed,a,b,tag] of copingRuns) {
      const at=A.B.props.length;
      const alongX=axis==='z',mid=(a+b)/2,len=b-a,s=Math.sign(fixed)||1;
      if(alongX) {
        box(mid,1.005,fixed,len,.09,.30,P.stone,{hard:true,gloss:.24,tag,...DECAL});
        cyl(mid,1.775,fixed+.010,.030,len-.14,P.steelD,{rz:Math.PI/2,gloss:.52,tag,...DECAL});
        for(let t=a+.70;t<b;t+=1.55)
          box(t,1.36,fixed+.020,.10,.86,.12,P.steelD,{hard:true,gloss:.42,tag,...DECAL});
        for(let t=a+1.40;t<b;t+=3.10) {
          box(t,.10,fixed+.060,.26,.17,.07,P.black,{hard:true,tag,...DECAL});
          box(t,.035,fixed+.150,.34,.030,.20,P.steelD,{hard:true,gloss:.40,tag,...DECAL});
        }
        for(let t=a+.35;t<b;t+=2.05)
          box(t,1.13,fixed+.060,.05,.13,.05,P.steel,{hard:true,gloss:.5,tag,...DECAL});
      } else {
        box(fixed,1.005,mid,.30,.09,len,P.stone,{hard:true,gloss:.24,tag,...DECAL});
        cyl(fixed-s*.010,1.775,mid,.030,len-.14,P.steelD,{rx:Math.PI/2,gloss:.52,tag,...DECAL});
        for(let t=a+.70;t<b;t+=1.55)
          box(fixed-s*.020,1.36,t,.12,.86,.10,P.steelD,{hard:true,gloss:.42,tag,...DECAL});
        for(let t=a+1.40;t<b;t+=3.10) {
          box(fixed-s*.060,.10,t,.07,.17,.26,P.black,{hard:true,tag,...DECAL});
          box(fixed-s*.150,.035,t,.20,.030,.34,P.steelD,{hard:true,gloss:.40,tag,...DECAL});
        }
        for(let t=a+.35;t<b;t+=2.05)
          box(fixed-s*.060,1.13,t,.05,.13,.05,P.steel,{hard:true,gloss:.5,tag,...DECAL});
      }
      const parapetCamera=A.B.props.slice(at);
      if(tag==='女儿墙南') {
        const spine=parapetCamera.slice(0,2),details=parapetCamera.slice(2);
        localizeCameraGroup(spine,mid,fixed); localizeCameraGroup(details,mid,fixed);
        groupCamera('parapet:女儿墙南:spine',spine);
        groupCamera('parapet:女儿墙南:details',details);
      } else {
        localizeCameraGroup(parapetCamera,alongX?mid:fixed,alongX?fixed:mid);
        groupCamera(`parapet:${tag}`,parapetCamera);
      }
    }
    // Corner returns, so the three runs meet instead of leaving two mitres in mid-air.
    for(const [cx,cz,tag] of [[-11.92,-8.92,'女儿墙西'],[11.92,-8.92,'女儿墙南']]) {
      cameraFixture(`parapet-corner:${tag}`,()=>{
        box(cx,1.005,cz,.30,.09,.30,P.stone,{hard:true,gloss:.24,tag,...DECAL});
        box(cx-Math.sign(cx)*.02,1.36,cz+.02,.13,.86,.13,P.steelD,
          {hard:true,gloss:.42,tag,...DECAL});
      });
    }

    // ---------------------------------------------------------------- 远景 · what an edge is for
    // A parapet against the clear colour reads as an unfinished wall.  These sit outside the
    // plate and outside every collider and exist only so the roof has a distance to look at.
    // Invented city; no real skyline.  All `nocut` — nothing this size may vote on a cutaway.
    const skyline=(axis,dist,span,tag)=>{
      const place=(t,y,w,h,d,c,g)=>axis==='z'
        ? box(t,y,dist,w,h,d,c,{hard:true,mode:1,glow:g,tag,...DECAL})
        : box(dist,y,t,d,h,w,c,{hard:true,mode:1,glow:g,tag,...DECAL});
      place(0,6.0,span*1.5,16.0,.06,P.sky,.075);
      let seed=axis==='z'?3:(dist<0?7:11);
      for(let i=0;i<8;i++) {
        seed=(seed*1103515245+12345)%2147483648;
        const r=seed/2147483648;
        const t=-span+i*(span*2/7)+(r-.5)*2.4;
        const h=4.2+r*8.0,w=3.0+((i*5)%4)*1.6;
        place(t,h/2-.4,w,h,.05,i%3?P.cityA:P.cityB,.012);
        place(t,h-.15,w*.34,.9,.045,P.cityC,.020);
      }
      for(let i=0;i<5;i++) {
        const t=-span*.78+i*(span*1.56/4);
        const h=2.4+((i*3)%5)*1.15;
        place(t,h/2-.3,4.2,h,.04,P.cityC,.026);
      }
    };
    skyline('z',-30.0,30.0,'远景南');
    skyline('x',-28.0,20.0,'远景西');
    skyline('x',28.0,20.0,'远景东');

    // ---------------------------------------------------------------- pergola and shaded seating
    flat(-7.85,.030,-5.40,7.10,5.70,P.woodD,
      {mode:6,gloss:.12,mat:'wood',matScale:.82,matAmt:.22,tag:'凉亭地面',...DECAL});
    for(let x=-11.05;x<=-4.65;x+=.80)
      flat(x,.035,-5.40,.025,5.52,P.black,{alpha:.24,tag:'凉亭地面',...DECAL});
    const pergolaPosts=[[-10.75,-7.75],[-7.85,-7.75],[-4.95,-7.75],
      [-10.75,-3.05],[-7.85,-3.05],[-4.95,-3.05]];
    // A row per tag, beam included.  All six posts and both beams under one '凉亭' spanned 7.5 m
    // and put the group's judging point 2.35 m from the nearest member of it.
    for(const [x,z] of pergolaPosts) {
      const tag=z<-5?'凉亭排南':'凉亭排北';
      box(x,1.38,z,.20,2.70,.20,P.woodD,{hard:true,mode:6,gloss:.23,tag});
      box(x,.06,z,.34,.12,.34,P.steelD,{hard:true,tag});
      solid(x-.13,x+.13,z-.13,z+.13);
    }
    for(const z of [-7.75,-3.05]) box(-7.85,2.66,z,6.05,.20,.24,P.woodD,
      {hard:true,mode:6,tag:z<-5?'凉亭排南':'凉亭排北'});
    for(let x=-10.70;x<=-5.0;x+=.48) box(x,2.74,-5.40,.13,.10,5.05,P.woodL,
      {hard:true,mode:6,gloss:.20,tag:x<-7.85?'凉亭顶西':'凉亭顶东'});
    for(let i=0;i<18;i++) {
      const a=i*2.399,x=-7.85+Math.sin(a)*(1.1+(i%4)*.45),z=-5.4+Math.cos(a)*(1.0+(i%3)*.50);
      ball(x,2.84+(i%2)*.06,z,.26,.055,.19,i%3?P.green:P.greenL,
        {mode:15,ry:a,rz:(i%3-1)*.20,tag:x<-7.85?'凉亭顶西':'凉亭顶东'});
    }
    for(let z=-7.42;z<=-3.48;z+=.55)
      box(-10.87,1.42,z,.045,2.12,.060,P.woodL,{hard:true,mode:6,gloss:.16,tag:'凉亭格栅'});
    for(const y of [.54,1.40,2.26])
      box(-10.87,y,-5.45,.060,.055,4.18,P.woodD,{hard:true,mode:6,tag:'凉亭格栅'});
    // Visually porous, but not a doorway.
    solid(-10.94,-10.80,-7.48,-3.42);
    for(const z of [-6.90,-5.40,-3.90]) {
      cyl(-7.85,2.51,z,.007,5.35,P.black,{rz:Math.PI/2,tag:'灯串',
        // Build's generic walking OBB only carries yaw, so give this roll-rotated cable its true
        // horizontal camera bounds. This changes neither the rendered rod nor body collision.
        cameraOb:{x:-7.85,y:2.51,z,sx:5.35,sy:.014,sz:.014,ry:0}});
      for(let x=-10.35;x<=-5.35;x+=.50) {
        cyl(x,2.43,z,.004,.14,P.black,{tag:'灯串'});
        luminous(ball(x,2.35,z,.040,.050,.040,P.warm,
          // This single depth-writing bulb still covers six avatar probes at 20/30/120 Hz on the
          // real stretch-boundary path; the shared explicit-coverage audit proves it is indexed.
          {mode:7,alpha:.90,glow:.08,tag:'灯串',
            ...(Math.abs(x+7.85)<.001&&Math.abs(z+6.90)<.001?{cameraOccluder:true}:{})}),.015,.07);
      }
    }
    for(const [x,z] of [[-10.20,-4.05],[-8.60,-6.92],[-6.72,-4.00],[-5.28,-6.88]]) {
      const tag='吊盆'+Math.round(x*10);
      cyl(x,2.43,z,.005,.42,P.steelD,{tag});
      taper(x,2.13,z,.17,.28,.12,P.terracotta,{gloss:.14,tag});
      for(let i=0;i<5;i++) {
        const a=i*2.399;
        cyl(x+Math.sin(a)*.07,1.88-(i%2)*.12,z+Math.cos(a)*.07,.006,.38+(i%2)*.16,
          P.greenD,{tag,cameraOccluder:true});
        ball(x+Math.sin(a)*.12,1.72-(i%2)*.15,z+Math.cos(a)*.11,.11,.035,.075,
          i%2?P.leaf:P.greenL,{mode:15,ry:a,rz:.35,tag});
      }
    }
    bench(-9.65,-5.40,2.10,Math.PI/2,'凉亭长椅西');
    bench(-6.05,-5.40,2.10,-Math.PI/2,'凉亭长椅东');
    box(-9.65,.55,-5.40,1.58,.10,.42,P.sage,{round:.07,mode:7,gloss:.025,hard:true,ry:Math.PI/2,tag:'凉亭长椅西'});
    box(-9.90,.79,-5.40,1.48,.42,.12,P.green,{round:.07,mode:7,gloss:.025,hard:true,ry:Math.PI/2,tag:'凉亭长椅西'});
    groupCamera('bench:凉亭长椅西:-9.65:-5.40',A.B.props.slice(-2));
    box(-6.05,.55,-5.40,1.58,.10,.42,P.sage,{round:.07,mode:7,gloss:.025,hard:true,ry:-Math.PI/2,tag:'凉亭长椅东'});
    box(-5.80,.79,-5.40,1.48,.42,.12,P.green,{round:.07,mode:7,gloss:.025,hard:true,ry:-Math.PI/2,tag:'凉亭长椅东'});
    groupCamera('bench:凉亭长椅东:-6.05:-5.40',A.B.props.slice(-2));
    cameraFixture('pergola-table',()=>{
      box(-7.85,.52,-5.40,1.40,.08,.76,P.woodL,{hard:true,mode:6,tag:'凉亭'});
      for(const x of [-8.35,-7.35]) box(x,.26,-5.40,.08,.52,.58,P.steelD,{hard:true,tag:'凉亭'});
      for(const x of [-8.24,-7.92]) {
        cyl(x,.61,-5.22,.070,.14,P.white,{gloss:.20,tag:'凉亭'});
        cyl(x+.07,.68,-5.22,.006,.13,P.steelD,{rz:Math.PI/2,tag:'凉亭'});
      }
      cyl(-7.47,.65,-5.22,.075,.22,P.glass,{mode:1,alpha:.38,gloss:.42,tag:'凉亭'});
      taper(-7.47,.79,-5.22,.055,.07,.035,P.steelD,{gloss:.46,tag:'凉亭'});
      box(-7.92,.62,-5.58,.52,.035,.34,P.black,{hard:true,ry:.08,tag:'凉亭'});
      luminous(box(-7.92,.645,-5.58,.46,.012,.29,P.screen,
        {hard:true,mode:1,glow:.045,ry:.08,tag:'凉亭'}),.008,.06);
    });
    solid(-8.60,-7.10,-5.83,-4.97);
    for(const x of [-10.75,-7.85,-4.95]) {
      const tag='凉亭灯'+Math.round(-x*10);
      luminous(cyl(x,2.30,-5.40,.12,.32,P.warm,{mode:1,alpha:.88,glow:.11,tag}),.03,.19);
      cyl(x,2.55,-5.40,.009,.36,P.steelD,{tag});
      light(x,2.28,-5.40,[1,.78,.52],.16,2.9);
    }
    interactive('凉亭','凉亭',-7.85,1.20,-5.40,
      '凉亭有遮阴和座位，适合午休时短暂离开屏幕。',
      'The pergola provides shade and seating for a brief screen break at midday.',
      '凉亭 is a shaded pavilion; 遮阴 means shade from the sun.',
      [-7.85,-4.36],1.95,'sit-pergola','wellbeing');

    // ---------------------------------------------------------------- raised roof garden
    // A bed per tag: six beds under one 种植箱 spanned 9 m and would have been judged from a
    // point in the middle of the path between them.
    planter(-3.00,-6.82,2.55,1.05,'香草',1,'种植箱1','屋顶花园西列');
    planter(.45,-6.82,2.55,1.05,'番茄',2,'种植箱2','屋顶花园中列');
    planter(3.20,-6.82,1.55,1.05,'生菜',3,'种植箱3','屋顶花园东列');
    planter(-3.00,-4.15,2.55,1.05,'生菜',4,'种植箱4','屋顶花园西列');
    planter(.45,-4.15,2.55,1.05,'香草',5,'种植箱5','屋顶花园中列');
    planter(3.20,-4.15,1.55,1.05,'番茄',6,'种植箱6','屋顶花园东列');
    for(const z of [-6.82,-4.15]) {
      const row=z<-5?'南':'北';
      const middle=z<-5?['种植箱2',.45]:['种植箱5',.45];
      const pipe=cyl(-.10,.77,z,.012,7.00,P.blue,
        {rz:Math.PI/2,gloss:.26,tag:'滴灌干管'+row,
          cameraOb:{x:.45,y:.77,z,sx:2.68,sy:.024,sz:.024,ry:0},cameraSweepX:2.71});
      groupCamera(`planter:${middle[0]}:${middle[1].toFixed(2)}:${z.toFixed(2)}`,pipe);
      for(const x of [-3.95,-2.05,-.50,1.40,2.60,3.80]) {
        const valve=luminous(cyl(x,.80,z,.045,.045,P.blueL,
          {mode:1,glow:.025,tag:'滴灌阀'+row+(x<0?'西':'东')}),.005,.035);
        const bed=x<-1.2?(z<-5?['种植箱1',-3]:['种植箱4',-3]):x<2?
          (z<-5?['种植箱2',.45]:['种植箱5',.45]):
          (z<-5?['种植箱3',3.2]:['种植箱6',3.2]);
        groupCamera(`planter:${bed[0]}:${bed[1].toFixed(2)}:${z.toFixed(2)}`,valve);
      }
    }
    // Compost and tool cabinet, moved west to keep the 1.10 m alley beside the plant block clear.
    cameraFixture('garden-tools',()=>{
      box(3.30,.70,-8.05,1.18,1.20,.80,P.greenD,
        {hard:true,round:.08,mode:7,tag:'园艺工具'});
      for(const sx of [-.34,0,.34]) cyl(3.30+sx,1.36,-7.80,.011,.84,P.steel,
        {rz:sx*.35,tag:'园艺工具'});
    });
    solid(2.63,3.97,-8.52,-7.58);
    // One labelled log board in the cross-aisle serves each north/south bed pair.  It is the real
    // place to record plant condition and harvests, stays below the four-fixture action bound, and
    // avoids turning six decorative cultivar signs into distant use surfaces.
    for(const [tag,x] of [
      ['屋顶花园西列',-4.095],['屋顶花园中列',-.645],['屋顶花园东列',2.605],
    ]) {
      box(x,.94,-5.10,.055,.42,.055,P.woodD,{hard:true,tag});
      box(x,1.08,-5.10,.38,.20,.030,P.cream,{hard:true,round:.025,ry:.03,tag});
      const gardenStation=interactive('屋顶花园',tag,x,1.05,-5.10,
        '检查香草、番茄和生菜，把成熟的叶子记录下来。',
        'Check the herbs, tomatoes, and lettuce, and log anything ready to harvest.',
        '屋顶花园 is a roof garden; 成熟 means ripe or ready.',
        [x+.55,-5.10],2.05,'tend-roof-garden','roof-garden');
      gardenStation.labelGroup=tag;
    }

    // Rainwater/irrigation station, also pulled west off the alley.
    const irrigationAt=A.B.props.length;
    cyl(2.85,.86,-3.05,.62,1.55,P.blue,{mode:7,gloss:.22,tag:'灌溉',
      cameraOb:{x:2.85,y:.86,z:-2.95,sx:1.24,sy:1.55,sz:1.00,ry:0},cameraSweepZ:.22});
    cyl(2.85,1.65,-3.05,.67,.08,P.steelD,{gloss:.45,tag:'灌溉'});
    box(3.68,.65,-3.02,.62,1.10,.56,P.steelD,{hard:true,round:.05,tag:'灌溉'});
    luminous(box(3.68,.86,-2.72,.40,.24,.024,P.screen,
      {hard:true,mode:1,glow:.075,tag:'灌溉'}),.02,.12);
    box(2.85,1.16,-2.422,1.02,.22,.018,P.black,
      {hard:true,mode:1,glow:.015,tag:'灌溉'});
    glyphs(2.85,1.16,-2.41,0,'雨水回收',
      {size:.12,gap:.03,color:P.white,mode:1,lift:.008,tag:'灌溉'});
    cyl(3.26,.27,-3.05,.022,1.05,P.blueL,{rz:Math.PI/2,tag:'灌溉'});
    solid(2.18,4.02,-3.74,-2.42);
    const pumpLamp=luminous(cyl(3.94,1.10,-2.74,.035,.020,P.green,
      {rx:Math.PI/2,mode:1,glow:.055,tag:'灌溉'}),.01,.09);
    groupCamera('irrigation-station',A.B.props.slice(irrigationAt));
    onTick(t=>{pumpLamp.glow=.035+(.5+.5*Math.sin(t*.82))*.045;});
    const irrigationNorth=interactive('灌溉','灌溉',3.40,1.02,-3.02,
      '读取雨水箱水位，打开滴灌泵十分钟。',
      'Read the rainwater level and run the drip-irrigation pump for ten minutes.',
      '灌溉 is irrigation; 滴灌 delivers water slowly at each plant.',
      // The old [2.10,-2.20] point was eight centimetres inside the tank/pump footprint after the
      // player's 0.30 m radius was applied.  This point is on the same paved approach and remains
      // within the authored reach without clampMove having to push the player away.
      [2.05,-1.90],1.95,'run-irrigation','roof-garden');
    irrigationNorth.labelGroup='灌溉';
    const irrigationSouth=interactive('灌溉','灌溉',2.85,1.02,-3.45,
      '读取雨水箱水位，打开滴灌泵十分钟。',
      'Read the rainwater level and run the drip-irrigation pump for ten minutes.',
      '灌溉 is irrigation; 滴灌 delivers water slowly at each plant.',
      // This is just beyond the tank's body-expanded south edge, close enough that a click on
      // the cabinet's south face resolves to the south approach instead of the east station.
      [3.35,-4.25],1.55,'run-irrigation','roof-garden');
    irrigationSouth.labelGroup='灌溉';
    // The tank, pump cabinet and status lamp form one visible assembly, but its east face is more
    // than either north/south station's honest reach away. A third local approach owns that face;
    // all three retain one label group and action instead of pretending the control has extra reach.
    const irrigationEast=interactive('灌溉','灌溉',3.98,1.02,-3.02,
      '读取雨水箱水位，打开滴灌泵十分钟。',
      'Read the rainwater level and run the drip-irrigation pump for ten minutes.',
      '灌溉 is irrigation; 滴灌 delivers water slowly at each plant.',
      [4.68,-3.00],1.55,'run-irrigation','roof-garden');
    irrigationEast.labelGroup='灌溉';
    const irrigationSouthEast=interactive('灌溉','灌溉',3.96,1.02,-3.32,
      '读取雨水箱水位，打开滴灌泵十分钟。',
      'Read the rainwater level and run the drip-irrigation pump for ten minutes.',
      '灌溉 is irrigation; 滴灌 delivers water slowly at each plant.',
      [4.05,-4.10],1.55,'run-irrigation','roof-garden');
    irrigationSouthEast.labelGroup='灌溉';

    // ---------------------------------------------------------------- stretching deck
    flat(-7.90,.032,.02,7.10,3.75,P.rubber,
      {mode:7,gloss:.035,mat:'fabric',matScale:.52,matAmt:.15,tag:'拉伸区',...DECAL});
    for(let x=-10.90;x<=-5.10;x+=.58)
      flat(x,.038,.02,.025,3.55,P.rubberL,{alpha:.20,tag:'拉伸区',...DECAL});
    for(const [x,c,tag] of [
      [-10.25,P.blue,'拉伸垫西'],[-8.10,P.green,'拉伸垫中'],[-5.95,P.amber,'拉伸垫东'],
    ]) {
      flat(x,.045,.62,1.10,1.92,c,{mode:7,gloss:.025,alpha:.82,tag,...DECAL});
      // A slim raised orientation marker gives the mat an unambiguous pickable face above the
      // main roof membrane; coplanar floor quads alone can lose the ray to the deck below.
      box(x,.066,1.32,.42,.030,.16,c,{hard:true,round:.025,mode:1,glow:.018,tag});
    }
    for(const x of [-10.85,-9.85]) {
      cyl(x,1.20,-1.10,.0175,2.20,P.steelD,{tag:'肋木架'});
      solid(x-.07,x+.07,-1.17,-1.03);
    }
    for(let y=.32;y<=2.10;y+=.29) cyl(-10.35,y,-1.10,.0125,.95,P.steel,
      {rz:Math.PI/2,gloss:.46,tag:'肋木架'});
    for(const x of [-7.55,-6.15]) {
      cyl(x,1.04,-1.08,.020,1.92,P.steelD,{tag:'拉伸杆'});
      solid(x-.07,x+.07,-1.15,-1.01);
    }
    cyl(-6.85,1.92,-1.08,.0225,1.40,P.steel,{rz:Math.PI/2,gloss:.46,tag:'拉伸杆'});
    bench(-5.10,1.42,1.55,Math.PI,'拉伸区长椅');
    for(const [tag,x] of [['拉伸垫西',-10.25],['拉伸垫中',-8.10],['拉伸垫东',-5.95]]) {
      const stretchStation=interactive('拉伸区',tag,x,.70,.62,
        '跟着地垫上的标记活动肩膀、背部和腿。',
        'Follow the mat markers to stretch your shoulders, back, and legs.',
        '拉伸 is stretching; 活动 here means to loosen or mobilise a joint.',
        [x,1.42],1.55,'stretch-break','wellbeing');
      stretchStation.labelGroup='拉伸区';
    }

    // ---------------------------------------------------------------- 机房 · the inside
    // Four real walls, each with its own tag rather than the toolkit's '墙' default.  Two are
    // partitions from the shared toolkit, so the door is a real opening with a lintel.  The south
    // and east faces are carried by the shell parapet with a full-height upstand above it, which
    // is deliberate: a second wall built 5 cm inboard of the parapet would leave a slot nobody can
    // reach, while sitting on it leaves the body stopping exactly where the perimeter solid
    // already stops it.
    const plantWallsAt=A.B.props.length;
    partitionX(PLANT.x0,PLANT.z0,PLANT.z1,[],P.wall,'机房西墙',
      {mat:'concrete',matScale:1.1,matAmt:.14});
    partitionZ(PLANT.z1,PLANT.x0,PLANT.x1,[[PLANT_DOOR.x,PLANT_DOOR.w,PLANT_DOOR.h]],
      P.wall,'机房北墙',{mat:'concrete',matScale:1.1,matAmt:.14});
    box((PLANT.x0+PLANT.x1)/2,2.205,-8.92,PLANT.x1-PLANT.x0,2.49,.16,P.wall,
      {hard:true,mode:14,gloss:.10,tag:'机房南墙'});
    box((PLANT.x0+PLANT.x1)/2,.99,-8.90,PLANT.x1-PLANT.x0+.06,.10,.26,P.stone,
      {hard:true,gloss:.24,tag:'机房南墙'});
    box(11.92,2.205,(PLANT.z0+PLANT.z1)/2,.16,2.49,PLANT.z1-PLANT.z0,P.wall,
      {hard:true,mode:14,gloss:.10,tag:'机房东墙'});
    box(11.90,.99,(PLANT.z0+PLANT.z1)/2,.26,.10,PLANT.z1-PLANT.z0+.06,P.stone,
      {hard:true,gloss:.24,tag:'机房东墙'});
    for(const [tag,x,z] of [
      ['机房西墙',PLANT.x0,(PLANT.z0+PLANT.z1)/2],
      ['机房北墙',(PLANT.x0+PLANT.x1)/2,PLANT.z1],
      ['机房南墙',(PLANT.x0+PLANT.x1)/2,-8.91],
      ['机房东墙',11.91,(PLANT.z0+PLANT.z1)/2],
    ]) {
      const props=A.B.props.slice(plantWallsAt).filter(p=>p.tag===tag);
      localizeCameraGroup(props,x,z); groupCamera(`plant-wall:${tag}`,props);
    }
    // The shell authors the transparent windscreen before this fit-out runs.  Bind its local
    // panels/posts here to the roof-edge fixture they physically complete; rendered geometry and
    // shell collision remain untouched.
    const southWind=A.B.props.filter(p=>p.ob&&p.ob.z<-8.90&&
      (p.tag==='挡风屏'||String(p.tag||'').startsWith('挡风屏南')));
    const plantSouth=southWind.filter(p=>p.ob.x>=4);
    groupCamera('plant-wall:机房南墙',plantSouth);
    localizeCameraGroup(A.B.props.filter(p=>p.cameraGroup===KEY+':plant-wall:机房南墙'),8.52,-8.92);
    for(const panel of southWind.filter(p=>String(p.tag||'').startsWith('挡风屏南')&&p.ob.x<4)) {
      const post=southWind.filter(p=>p.tag==='挡风屏'&&p.ob.x<4)
        .sort((a,b)=>Math.abs(a.ob.x-panel.ob.x)-Math.abs(b.ob.x-panel.ob.x))[0];
      groupCamera(`south-windscreen:${panel.tag}`,panel,post);
    }
    for(const [tag,px] of [['挡风屏南1',-10.5],['挡风屏南3',-7.5],['挡风屏南4',-4.5],
      ['挡风屏南6',-1.5],['挡风屏南7',1.5]])
      groupCamera(`south-windscreen:${tag}`,southWind.find(p=>p.tag===tag),
        southWind.find(p=>p.tag==='挡风屏'&&Math.abs(p.ob.x-px)<.01));
    const eastWind=A.B.props.filter(p=>p.ob&&p.ob.x>11.85&&
      String(p.tag||'').startsWith('挡风屏东'));
    groupCamera('plant-wall:机房东墙',eastWind);
    localizeCameraGroup(A.B.props.filter(p=>p.cameraGroup===KEY+':plant-wall:机房东墙'),11.92,-7.32);
    // Roof slab, kerb, and the plant that belongs on top of one.
    box(8.52,3.40,-7.32,6.76,.18,3.16,P.roofD,{hard:true,mode:14,gloss:.10,tag:'机房屋面'});
    box(8.52,3.56,-7.32,6.84,.14,3.24,P.wallD,{hard:true,mode:14,tag:'机房屋面'});
    for(const [x,z] of [[6.30,-7.60],[9.60,-7.60]]) {
      cyl(x,4.00,z,.26,.92,P.steelD,{gloss:.36,tag:'机房屋面'});
      cyl(x,4.50,z,.34,.10,P.steel,{gloss:.44,tag:'机房屋面'});
      taper(x,4.62,z,.60,.22,.60,P.steelD,{gloss:.30,tag:'机房屋面'});
    }
    box(11.05,3.86,-6.35,1.10,.60,.90,P.steel,{hard:true,gloss:.34,tag:'机房屋面'});
    // Interior.  The aisle runs the full width in front of the door, so the room can be walked
    // rather than only looked into: plant on the south wall, switchgear on the west.
    flat(8.52,.022,-7.30,6.55,3.05,P.pathD,{mode:7,gloss:.10,tag:'机房地面',...DECAL});
    for(let x=5.55;x<11.8;x+=.62)
      flat(x,.026,-7.30,.020,3.00,P.steelD,{alpha:.22,tag:'机房地面',...DECAL});
    airHandler(6.30,-8.02,2.00,1.20,'新风机组西');
    airHandler(9.60,-8.02,2.00,1.20,'新风机组东');
    cameraFixture('water-tank',()=>{
      cyl(11.20,1.10,-8.05,.52,2.00,P.steel,{gloss:.38,tag:'水箱'});
      for(const y of [.22,.88,1.54,2.05]) cyl(11.20,y,-8.05,.55,.050,P.steelD,
        {gloss:.44,tag:'水箱'});
    });
    solid(10.60,11.80,-8.62,-7.42);
    cameraFixture('switchboard',()=>{
      box(5.55,.95,-6.60,.46,1.90,1.60,P.steelD,
        {hard:true,gloss:.30,tag:'配电柜'});
      for(const z of [-7.20,-6.60,-6.00]) {
        box(5.79,.95,z,.020,1.74,.50,P.steel,{hard:true,gloss:.42,tag:'配电柜'});
        luminous(cyl(5.80,1.62,z,.026,.018,z<-6.9?P.amber:P.green,
          {rz:Math.PI/2,mode:1,glow:.05,tag:'配电柜'}),.01,.08);
      }
    });
    solid(5.30,5.80,-7.42,-5.78);
    for(const y of [2.55,2.78]) cyl(8.50,y,-6.45,.055,6.30,P.blueL,
      {rz:Math.PI/2,gloss:.30,tag:'机房管线'});
    box(8.50,2.98,-7.05,6.40,.06,.34,P.steelD,{hard:true,gloss:.30,tag:'机房管线'});
    for(let x=5.70;x<11.6;x+=1.05) box(x,3.13,-7.05,.06,.30,.40,P.steelD,
      {hard:true,gloss:.34,tag:'机房管线'});
    for(let x=6.10;x<11.5;x+=1.80) {
      cameraFixture(`plant-light:${x.toFixed(2)}`,()=>{
        box(x,3.24,-6.55,1.50,.055,.12,P.black,{hard:true,gloss:.18,tag:'机房照明'});
        luminous(box(x,3.205,-6.55,1.30,.020,.055,P.white,
          {hard:true,mode:1,tag:'机房照明'}),.16,.42);
      });
    }
    for(const x of [6.80,10.30]) light(x,3.00,-6.80,[1,.97,.90],.30,4.6);
    // The door leaf is hung flat against the yard face of the wall, where it can never narrow the
    // 1.10 m opening.  Signage faces the yard (yaw π), because that is the side it warns.
    cameraFixture('maintenance-door',()=>{
      box(9.15,1.15,-5.665,1.06,2.24,.055,P.steelD,{hard:true,gloss:.44,tag:'检修门'});
      for(let y=.55;y<1.85;y+=.16) box(9.15,y,-5.635,.92,.040,.020,P.black,
        {hard:true,gloss:.20,tag:'检修门'});
      box(9.62,1.20,-5.625,.055,.34,.045,P.steel,{hard:true,gloss:.62,tag:'检修门'});
    });
    groupCamera('plant-wall:机房北墙',A.B.props.filter(p=>p.cameraGroup===KEY+':maintenance-door'));
    const plantTitleAt=A.B.props.length;
    plateZ(8.00,2.60,-5.70,1.50,.34,'机房',P.steelD,'机房',{twoSided:false});
    // This title is physically mounted on the door-header bay, so it follows that exact localized
    // north-wall cut rather than an independent sign group that can survive after its wall leaves.
    groupCamera('plant-wall:机房北墙',A.B.props.slice(plantTitleAt));
    // Keep the warning above the cable tray and the access instruction below it. Both are
    // wall-flush safety placards rather than paint that the tray can visibly cross.
    const plantWarningAt=A.B.props.length;
    box(6.60,1.96,-5.70,1.18,.24,.040,P.red,{hard:true,mode:1,tag:'机房'});
    glyphs(6.60,1.96,-5.66,0,'非工作人员勿入',
      {size:.105,gap:.026,color:P.white,mode:1,lift:.008,tag:'机房'});
    groupCamera('plant-warning',A.B.props.slice(plantWarningAt));
    const plantAccessAt=A.B.props.length;
    box(6.60,1.34,-5.70,.76,.22,.040,P.black,{hard:true,mode:1,tag:'机房'});
    glyphs(6.60,1.34,-5.66,0,'刷卡进入',
      {size:.105,gap:.026,color:P.white,mode:1,lift:.008,tag:'机房'});
    groupCamera('plant-access-instruction',A.B.props.slice(plantAccessAt));
    cameraFixture('plant-access',()=>{
      box(10.35,1.28,-5.70,.16,.24,.045,P.black,{hard:true,mode:1,tag:'门禁'});
      luminous(cyl(10.35,1.28,-5.675,.030,.016,P.green,
        {rx:Math.PI/2,mode:1,glow:.05,tag:'门禁'}),.012,.09);
    });
    // The duty panel on the east wall is the reachable end of all of this.
    cameraFixture('duty-panel',()=>{
      box(11.72,1.35,-6.60,.18,1.20,1.40,P.steelD,
        {hard:true,gloss:.30,tag:'值班盘'});
      luminous(box(11.61,1.52,-6.60,.022,.42,.86,P.screen,
        {hard:true,mode:1,glow:.075,tag:'值班盘'}),.02,.12);
    });
    interactive('机房','值班盘',11.45,1.35,-6.60,
      '巡检新风机组、水泵和配电柜，把读数记在值班表上。',
      'Walk the plant round: air handlers, pumps and switchboards, and log the readings.',
      '机房 is a plant or machine room; 巡检 means an inspection round.',
      [10.60,-6.60],1.55,'check-plant','facilities');

    // ---------------------------------------------------------------- 光伏设备区 · screened yard
    // West side and both halves of the north side are screens with their own tags; the east side
    // is the roof parapet itself, which is what encloses a plant yard at a building edge.  One
    // measured gate, 1.20 m, on the axis the terrace approach and the machine-room door share.
    screenRun('x',YARD.x0,YARD.z0,YARD.z1,'设备院墙西');
    screenRun('z',YARD.z1,YARD.x0,YARD_GATE.x-YARD_GATE.w/2,'设备院墙北西');
    screenRun('z',YARD.z1,YARD_GATE.x+YARD_GATE.w/2,YARD.x1,'设备院墙北东');
    // Pinned back flat against the screen, which is how a plant-yard gate is actually held open
    // and which lets it carry no collider at all.  Standing 1.17 m out into the terrace it left a
    // 0.10 m squeeze between itself and the power post: the 0.15 m flood fill found the pocket
    // behind it, the 0.10 m one sampled a cell inside the squeeze and called it reachable.
    cameraFixture('solar-gate',()=>{
      box(9.23,1.12,-2.12,1.14,2.20,.06,P.steelD,
        {hard:true,mode:1,alpha:.62,gloss:.44,tag:'设备院门'});
      for(const y of [.24,1.12,2.14]) box(9.23,y,-2.09,1.16,.09,.09,P.steelD,
        {hard:true,gloss:.46,tag:'设备院门'});
      box(9.80,1.12,-2.10,.10,2.24,.10,P.steelD,{hard:true,gloss:.48,tag:'设备院门'});
      box(9.92,.92,-2.20,.09,.09,.26,P.steel,{hard:true,gloss:.55,tag:'设备院门'});
    });
    plateZ(8.00,2.43,-2.22,3.10,.36,'光伏设备区',P.steelD,'光伏设备区');
    // Standoff placards sit in front of the screen posts, so no character is readable only by
    // accident when it crosses a post. Short steel blocks make the suspension physically clear.
    for(const [x,w,text] of [[6.30,1.10,'非工作人员勿入'],[10.10,.70,'注意高压']]) {
      for(const sx of [-1,1]) box(x+sx*(w/2-.08),1.58,-2.2525,.045,.12,.075,P.steelD,
        {hard:true,tag:'光伏设备区'});
      box(x,1.58,-2.195,w,.24,.040,P.red,{hard:true,mode:1,tag:'光伏设备区'});
      glyphs(x,1.58,-2.157,0,text,
        {size:.10,gap:.024,color:P.white,mode:1,lift:.008,tag:'光伏设备区'});
    }
    const solarSigns=A.B.props.filter(p=>p.tag==='光伏设备区'&&
      ((p.ob&&p.ob.z>-2.30&&p.ob.z<-2.10)||(p.m&&p.m[14]>-2.30&&p.m[14]<-2.10)));
    const propX=p=>p.ob?p.ob.x:p.m?p.m[12]:NaN;
    const solarHeader=solarSigns.filter(p=>propX(p)>=7.20&&propX(p)<=9.40),
      solarWest=solarSigns.filter(p=>propX(p)<7.20),
      solarEast=solarSigns.filter(p=>propX(p)>9.40);
    localizeCameraGroup(solarHeader,8.00,-2.22);
    groupCamera('plate:光伏设备区:8.00:-2.22',solarHeader);
    // Localize each standoff placard to the screen bay it physically occupies. Localizing the
    // combined east/header/west sign set first shifted west camera envelopes toward x=8.2 and
    // made a 2.2 m screen bay appear 2.81 m wide to the runtime index.
    localizeCameraGroup(solarWest,6.30,-2.22);
    groupCamera('screen:设备院墙北西:z:-2.30:5.20:7.40',solarWest);
    localizeCameraGroup(solarEast,10.10,-2.22);
    groupCamera('screen:设备院墙北东:z:-2.30:8.60:11.84',solarEast);
    flat(8.52,.020,-4.05,6.55,3.42,P.pathD,{mode:7,gloss:.10,tag:'设备院地面',...DECAL});
    for(let x=5.55;x<11.8;x+=.62)
      flat(x,.024,-4.05,.020,3.36,P.steelD,{alpha:.20,tag:'设备院地面',...DECAL});
    // Two racks with a 1.20 m service corridor between them on x = 8.00, so the gate, the
    // corridor and the machine-room door are one straight route.  The blocked footprint is the
    // whole rack including its legs — the inherited array blocked only its middle 1.64 m and let
    // the player walk through the outer panels.
    const racks=[
      {tag:'太阳能板西',legs:[5.63,7.07],panels:[[6.35,1.48]],x0:5.30,x1:7.40},
      {tag:'太阳能板东',legs:[8.85,10.27,11.70],panels:[[9.50,1.48],[11.05,1.48]],x0:8.62,x1:11.84},
    ];
    for(const R of racks) {
      const rackCamera=[];
      for(const [px,pw] of R.panels) {
        rackCamera.push(box(px,2.14,-4.62,pw,.075,1.02,P.black,
          {hard:true,rx:-.22,gloss:.30,tag:R.tag}));
        rackCamera.push(luminous(box(px,2.19,-4.70,pw-.12,.025,.90,P.blue,
          {hard:true,mode:1,alpha:.86,glow:.035,rx:-.22,tag:R.tag}),.005,.055));
        for(const sx of [-.42,0,.42]) rackCamera.push(box(px+sx,2.20,-4.72,.025,.035,.86,
          P.steel,{hard:true,rx:-.22,tag:R.tag}));
      }
      // The array is tilted to the south, so the south legs are the short ones.
      for(const lx of R.legs) for(const [dz,h] of [[-.48,2.00],[.48,2.22]])
        rackCamera.push(box(lx,h/2,-4.62+dz,.070,h,.070,P.steelD,
          {hard:true,gloss:.40,tag:R.tag}));
      rackCamera.push(cyl((R.x0+R.x1)/2,1.62,-4.62,.030,R.x1-R.x0-.30,P.steelD,
        {rz:Math.PI/2,gloss:.42,tag:R.tag}));
      localizeCameraGroup(rackCamera,(R.x0+R.x1)/2,-4.62);
      groupCamera(`solar-rack:${R.tag}`,rackCamera);
      solid(R.x0,R.x1,-5.18,-4.06);
      shade((R.x0+R.x1)/2,-4.62,R.x1-R.x0,1.60,.22);
    }
    // Inverter, DC isolators and the generation meter, against the west screen beside the gate.
    cameraFixture('solar-inverter',()=>{
      box(5.62,.95,-3.10,.52,1.80,1.40,P.steelD,
        {hard:true,round:.04,gloss:.32,tag:'光伏逆变器'});
      luminous(box(5.90,1.28,-3.10,.024,.30,.46,P.screen,
        {hard:true,mode:1,glow:.075,tag:'光伏逆变器'}),.02,.12);
      for(const [z,c] of [[-3.62,P.green],[-3.44,P.blue],[-3.26,P.green]])
        luminous(cyl(5.90,1.62,z,.028,.018,c,
          {rz:Math.PI/2,mode:1,glow:.045,tag:'光伏逆变器'}),.01,.07);
      glyphs(5.92,.62,-3.10,Math.PI/2,'今日发电',
        {size:.10,gap:.024,color:P.white,mode:1,lift:.010,tag:'光伏逆变器'});
    });
    solid(5.34,5.90,-3.82,-2.38);
    // Containment from the array down to the inverter and on through the machine-room wall.
    cameraFixture('solar-inverter',()=>{
      box(5.42,2.06,-4.30,.26,.06,2.10,P.steelD,{hard:true,gloss:.30,tag:'设备院桥架'});
      for(const z of [-5.10,-4.30,-3.55]) box(5.42,1.55,z,.22,1.06,.06,P.steelD,
        {hard:true,gloss:.30,tag:'设备院桥架',
          cameraOb:{x:5.38,y:1.55,z,sx:.12,sy:1.06,sz:.06,ry:0},cameraSweepX:.09});
      box(6.45,1.62,-5.66,1.60,.26,.06,P.steelD,{hard:true,gloss:.30,tag:'设备院桥架'});
    });
    localizeCameraGroup(A.B.props.filter(p=>p.cameraGroup===KEY+':solar-inverter'),5.85,-4.20);
    // Wall-mounted DC combiner: shallow enough that it needs no collision of its own.
    cameraFixture('grid-combiner',()=>{
      box(10.60,1.30,-5.53,.90,.90,.28,P.steelD,
        {hard:true,gloss:.30,tag:'并网柜'});
      luminous(cyl(10.60,1.62,-5.38,.026,.018,P.amber,
        {rx:Math.PI/2,mode:1,glow:.05,tag:'并网柜'}),.01,.08);
    });
    groupCamera('grid-combiner',A.B.props.filter(p=>p.cameraGroup===KEY+':plant-access'));
    interactive('太阳能板','光伏逆变器',5.98,1.30,-3.10,
      '在逆变器上检查今日发电量和直流隔离开关的状态。',
      'Check today\'s generation and the DC isolator status at the inverter.',
      '太阳能板 is a solar panel; 发电量 is the amount of electricity generated.',
      [6.55,-3.10],1.55,'inspect-solar','facilities');

    // ---------------------------------------------------------------- 户外工作台 · open deck
    // The roof workplace proper: open air, on the lift side of the plant block, laid out either
    // side of the 1.50 m approach to the gate on x = 8.00 so the route is never furniture the
    // player has to squeeze past.
    flat(8.45,.028,-.10,6.30,3.90,P.wood,
      {mode:6,gloss:.14,mat:'wood',matScale:.80,matAmt:.22,tag:'露台地面',...DECAL});
    for(let x=5.40;x<=11.55;x+=.52)
      flat(x,.033,-.10,.022,3.80,P.woodD,{alpha:.26,tag:'露台地面',...DECAL});
    // Slatted, not sheeted.  The east camera has to see the plant block and the parapet through
    // this; a solid canopy at 2.7 m fills the top third of that frame and hides both.
    for(const [px,pz] of [[5.60,-2.05],[5.60,1.10],[11.30,-2.05],[11.30,1.10]]) {
      const tag=`遮阳柱${Math.round(px*10)}_${Math.round(-pz*10)}`;
      box(px,1.32,pz,.13,2.64,.13,P.woodD,{hard:true,mode:6,gloss:.22,tag});
      box(px,.05,pz,.26,.10,.26,P.steelD,{hard:true,tag});
      solid(px-.09,px+.09,pz-.09,pz+.09);
    }
    for(const pz of [-2.05,1.10]) box(8.45,2.70,pz,5.86,.16,.16,P.woodD,
      {hard:true,mode:6,tag:pz<0?'遮阳梁南':'遮阳梁北'});
    for(let x=5.72;x<=11.25;x+=.46) box(x,2.78,-.475,.09,.07,3.15,P.woodL,
      {hard:true,mode:6,gloss:.18,tag:x<8.45?'遮阳板西':'遮阳板东'});
    for(const x of [6.60,10.30]) {
      const tag='工作台灯'+Math.round(x*10);
      luminous(box(x,2.62,-.40,.90,.045,.10,P.warm,
        {hard:true,mode:1,alpha:.90,glow:.09,tag}),.02,.24);
      light(x,2.58,-.40,[1,.86,.66],.16,3.2);
    }
    // West bay: a four-person outdoor work table.
    cameraFixture('outdoor-work-table',()=>{
      box(6.35,.735,-.90,1.90,.07,.86,P.woodL,
        {hard:true,mode:6,gloss:.24,tag:'户外工作台'});
      box(6.35,.66,-.90,1.70,.09,.24,P.steelD,{hard:true,gloss:.34,tag:'户外工作台'});
      for(const sx of [-1,1]) box(6.35+sx*.78,.35,-.90,.075,.62,.72,P.steelD,
        {hard:true,gloss:.36,tag:'户外工作台'});
      box(6.35,.79,-1.02,.42,.035,.30,P.black,{hard:true,ry:.06,tag:'户外工作终端'});
      luminous(box(6.35,.812,-1.02,.37,.012,.25,P.screen,
        {hard:true,mode:1,glow:.045,ry:.06,tag:'户外工作终端'}),.008,.06);
      for(const x of [5.95,6.75]) cyl(x,.85,-.72,.038,.16,P.white,
        {gloss:.20,tag:'户外工作台'});
    });
    solid(5.42,7.28,-1.34,-.46);
    shade(6.35,-.90,2.10,1.06,.20);
    for(const [sx,sz] of [[5.20,-.90],[7.80,-.90],[5.70,-.16],[6.85,-.16]])
      stool(sx,sz,'工位凳西');
    // East bay: a standing counter along the parapet, which is what the view is there for.
    cameraSpanFixture('window-work-counter','z',()=>{
      box(11.05,.775,-.10,.72,.07,3.40,P.woodL,
        {hard:true,mode:6,gloss:.24,tag:'临窗工作台'});
      box(11.05,.70,-.10,.56,.09,3.20,P.steelD,{hard:true,gloss:.34,tag:'临窗工作台'});
      for(const z of [-1.50,-.10,1.30]) box(11.05,.37,z,.62,.66,.080,P.steelD,
        {hard:true,gloss:.36,tag:'临窗工作台'});
    });
    localizeCameraGroup(A.B.props.filter(p=>p.cameraGroup===KEY+':window-work-counter'),11.05,-.10);
    solid(10.64,11.46,-1.85,1.65);
    shade(11.05,-.10,.92,3.60,.20);
    for(const sz of [-1.20,-.10,1.00]) stool(10.25,sz,'工位凳东');
    servicePost(7.25,-.90,'电源柱西');
    // Pull the east power post off the line between the three stools and parapet counter.  Its old
    // expanded footprint completed a four-sided ring around a 0.04 m² unreachable floor sliver.
    servicePost(9.15,-.90,'电源柱东');
    // Task board on the west post pair, faced east toward the terrace it serves.
    cameraFixture('terrace-task-board',()=>{
      box(5.72,1.60,-.40,.055,1.00,1.70,P.white,
        {hard:true,mode:7,gloss:.16,tag:'工作板'});
      box(5.69,1.60,-.40,.020,1.06,1.76,P.steelD,{hard:true,gloss:.34,tag:'工作板'});
      glyphs(5.79,1.94,-.40,Math.PI/2,'今日工位',
        {size:.11,gap:.026,color:P.steelD,mode:1,lift:.008,tag:'工作板'});
      for(let i=0;i<6;i++) box(5.76,1.72-((i%3)*.24),-.98+Math.floor(i/3)*1.12,
        .012,.16,.34,i%2?P.amber:P.blueL,{hard:true,mode:1,tag:'工作板'});
    });
    for(const [x,z] of [[9.30,1.42],[6.10,1.42]]) {
      const tag='露台绿化'+Math.round(x*10);
      const at=A.B.props.length;
      taper(x,.30,z,.66,.58,.66,P.terracotta,{mode:7,gloss:.14,tag});
      for(let i=0;i<7;i++) {
        const a=i*2.399;
        cyl(x+Math.sin(a)*.10,.86,z+Math.cos(a)*.10,.008,.66,P.greenD,{rz:(i%3-1)*.12,tag});
        ball(x+Math.sin(a)*.16,1.16,z+Math.cos(a)*.15,.13,.045,.09,
          i%2?P.sage:P.greenL,{mode:15,ry:a,rz:.30,tag});
      }
      solid(x-.38,x+.38,z-.38,z+.38);
      shade(x,z,.86,.86,.22);
      groupCamera(`terrace-plant:${tag}`,A.B.props.slice(at));
    }
    interactive('户外工作台','户外工作终端',6.35,1.05,-.90,
      '在屋顶工作台上办公，风大的时候记得压住纸。',
      'Work outdoors at the roof bench; weigh your papers down when it is windy.',
      '户外 means outdoors; 工作台 is a work bench or counter.',
      [6.35,.15],2.40,'work-outdoors','roof-garden');

    // Deck lighting.  A tag each: nine bollards spread over 22 m under one tag is the same fault
    // as one tag on twenty-four ceiling panels.
    for(const [x,z] of [[-10.55,-2.15],[-4.75,-2.15],[1.25,-2.15],[4.70,-2.15],[11.05,-2.05]])
      bollard(x,z,`庭院灯${Math.round(x*10)}_${Math.round(-z*10)}`);

    // The plant block is a real mass.  Keep the chase camera out of it rather than letting the
    // eye slide inside and look at the back faces of the machine room.  The 2.29 m screens are
    // deliberately left out — an eye that rises over them is the shot this yard wants.
    blocker(PLANT.x0-.10,11.92,-8.94,PLANT.z1+.08,3.58);

    state.roof={
      actions:['sit-pergola','tend-roof-garden','run-irrigation','stretch-break',
        'inspect-solar','work-outdoors','check-plant'],
      rooms:['pergola','garden','stretch','arrival','terrace','solar','plant'],
      accessibleLoop:true,protectedSpine:{z0:2.2,z1:4.0},
      enclosures:{
        plant:{...PLANT,kind:'wall',door:[PLANT_DOOR.x,PLANT.z1],doorWidth:PLANT_DOOR.w,roofed:true},
        solar:{...YARD,kind:'screen',gate:[YARD_GATE.x,YARD.z1],gateWidth:YARD_GATE.w,roofed:false},
      },
      parapet:{inner:{x:11.84,z:-8.84},bodyLimit:{x:11.52,z:-8.52},height:.96,screen:1.72,
        heldBy:'shell perimeter solids, office-core.js:284-285'},
    };
  });

  Object.assign(OfficeUse[KEY] || (OfficeUse[KEY]={}),{
    'sit-pergola': {zh:'坐一会儿',py:'zuò yíhuìr',en:'take a shaded roof break',secs:3.2,mins:12,
      gain:{rest:10,mood:10},pose:{type:'sit'},done:'吹了一会儿风，脑子清醒多了。',doneTr:'The breeze clears your head.'},
    'tend-roof-garden': {zh:'照料花园',py:'zhàoliào huāyuán',en:'tend the roof garden',secs:3.8,mins:20,
      gain:{mood:12,rest:-2},pose:{type:'work'},done:'香草、番茄和生菜都检查过了。',doneTr:'Herbs, tomatoes, and lettuce are all checked.'},
    'run-irrigation': {zh:'启动滴灌',py:'qǐdòng dīguàn',en:'run the drip irrigation',secs:2.8,mins:10,
      gain:{mood:3},pose:{type:'reach'},done:'滴灌泵运行十分钟，水位正常。',doneTr:'The drip pump runs for ten minutes; the water level is normal.'},
    'stretch-break': {zh:'拉伸身体',py:'lāshēn shēntǐ',en:'take a stretching break',secs:3.5,mins:12,
      gain:{rest:9,mood:7,food:-1},pose:{type:'stretch'},done:'肩膀、背部和腿都活动开了。',doneTr:'Your shoulders, back, and legs feel loosened up.'},
    'inspect-solar': {zh:'检查光伏',py:'jiǎnchá guāngfú',en:'inspect the solar system',secs:3.0,mins:14,
      gain:{mood:2,rest:-1},pose:{type:'check'},done:'发电量正常，逆变器没有报警。',doneTr:'Generation is normal and the inverter has no alarms.'},
    'work-outdoors': {zh:'户外办公',py:'hùwài bàngōng',en:'work at the roof bench',secs:3.6,mins:35,
      gain:{mood:8,rest:-3},pose:{type:'work'},done:'在屋顶把手上的活干完了，风一直没停。',doneTr:'You finish the task on the roof; the wind never let up.'},
    'check-plant': {zh:'巡检机房',py:'xúnjiǎn jīfáng',en:'walk the plant room round',secs:3.4,mins:18,
      gain:{mood:1,rest:-2},pose:{type:'check'},done:'新风机组、水泵和配电柜都记录完毕。',doneTr:'Air handlers, pumps and switchboards are all logged.'},
  });

  OfficeCast.push(
    {hz:'园艺师',name:'彭燕',py:'Péng Yàn',place:KEY,temper:'patient',
      look:{skin:'#d3a17a',hair:'#2b241f',hairStyle:'bun',top:'#5d795c',pants:'#3b4a42',
        shoe:'#343b36',hat:'cap',hatColor:'#8b7658',gloves:true,tall:.96,wide:.96,faceSeed:9701},
      // The crossing of both bed gaps, so she is never standing inside a raised bed.
      spots:[{h0:7,h1:17,at:[-1.28,-5.49],face:Math.PI/2,act:'work',held:null}],
      lines:[['香草今天可以剪一点，番茄还要再等两天。','We can cut some herbs today; the tomatoes need two more days.'],
             ['雨水箱够用，不需要接自来水。','The rainwater tank is sufficient; we do not need mains water.']]},
    {hz:'设施技师',name:'吴工',py:'Wú gōng',place:KEY,temper:'steady',
      look:{skin:'#be865f',hair:'#29231f',hairStyle:'short',top:'#59676d',pants:'#313b41',
        shoe:'#252b2e',uniform:'staff',hat:'cap',hatColor:'#d8a33d',tall:1.04,wide:1.03,faceSeed:9702},
      // In the yard's service corridor between the two racks — never standing in the gate itself.
      spots:[{h0:7,h1:19,at:[8.05,-3.30],face:Math.PI,act:'check'}],
      lines:[['设备区要刷工牌进入，参观请站在门外。','The plant yard requires a staff badge; visitors should stay outside the gate.'],
             ['机房里新风机组和水泵都正常，逆变器也没有报警。','In the plant room the air handlers and pumps are fine, and the inverter has no alarms.']]},
    {hz:'同事',name:'周妍',py:'Zhōu Yán',place:KEY,temper:'genial',seatY:.47,
      look:{skin:'#e2b188',hair:'#312823',hairStyle:'ponytail',top:'#7d8e9d',pants:'#37424d',
        shoe:'#2b3035',bag:'shoulder',bagColor:'#6f5948',tall:.98,wide:.92,faceSeed:9703},
      spots:[{h0:11.5,h1:14.5,at:[-9.65,-5.40],face:Math.PI/2,act:'sit'}],
      lines:[['中午在凉亭坐十分钟，比一直看屏幕舒服。','Ten minutes in the pergola at lunch is better than staring at a screen.'],
             ['屋顶风大，离开时别把纸留在桌上。','It is windy up here; do not leave paper on the table.']]},
    {hz:'同事',name:'骆宇',py:'Luò Yǔ',place:KEY,temper:'brisk',
      look:{skin:'#c99a6f',hair:'#241f1c',hairStyle:'short',top:'#8a7f6b',pants:'#3f4750',
        shoe:'#2e3338',bag:'laptop',bagColor:'#41474d',tall:1.01,wide:.97,faceSeed:9704},
      // Standing north of the outdoor bench's solid, facing the table.
      spots:[{h0:9,h1:18,at:[6.35,.15],face:Math.PI,act:'work'}],
      lines:[['天气好的时候我把电话会议搬到屋顶来开。','When the weather is good I take my calls up here.'],
             ['工作台上有插座和网口，不用抢会议室。','The bench has power and data, so there is no fighting over a meeting room.']]}
  );
})();
