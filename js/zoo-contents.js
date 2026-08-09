// Construction compiler for ZOO-PENS-BUILDINGS-BLUEPRINT.json.
//
// The companion blueprint records both the revision-2 geometry already in the zoo and the exact
// additive fit-out requested for every habitat, public building and Tropical House exhibit. This
// compiler deliberately builds only `implementationStatus: build-v1`; documented existing-r2
// records are reference geometry and must never be duplicated.
const ZooContents = (() => {
  'use strict';

  const SCHEMA='chinesegame.zoo-contents/v1';
  const REVISION=2;
  const CONTENT_HASH='sha256:7acb1ddef3e8491eb3f97d0929a0f8e45fb1409b200b81eeee131e36f90d15df';
  const EPS=1e-6;
  const SCREEN_LABELS=Object.freeze({
    'B03/snack/FIX05':'茶点菜单',
    'B08/FIX03':'热带馆',
    'T03/FIX09':'湿度',
    'T04/FIX06':'请关双门',
    'T04/FIX07':'请关双门',
    'TROP/SERVICE02':'环境控制',
  });
  const planOf=input=>input||(typeof window!=='undefined'?window.ZOO_CONTENTS_BLUEPRINT:null);

  function validatePlan(input,parentPlan) {
    const plan=planOf(input);
    const parent=parentPlan||(typeof window!=='undefined'?window.ZOO_BLUEPRINT:null);
    if(!plan||plan.schema!==SCHEMA||plan.revision!==REVISION||plan.contentHash!==CONTENT_HASH)
      throw new Error('ZooContents: canonical contents revision/hash mismatch');
    if(!parent||plan.parent.schema!==parent.schema||plan.parent.revision!==parent.revision||
       plan.parent.geometryHash!==parent.geometryHash)
      throw new Error('ZooContents: parent zoo blueprint mismatch');
    if(!Array.isArray(plan.habitats)||plan.habitats.length!==21||
       !Array.isArray(plan.buildings)||plan.buildings.length!==9||
       !plan.tropicalScene||plan.tropicalScene.rooms.length!==7)
      throw new Error('ZooContents: construction plan is structurally incomplete');
    const materialIds=new Set(plan.materials.map(q=>q.id));
    const archetypeIds=new Set(plan.archetypes.map(q=>q.id));
    const ids=new Set();let additions=0;
    const visit=v=>{
      if(!v||typeof v!=='object')return;
      if(Object.prototype.hasOwnProperty.call(v,'id')){
        if(typeof v.id!=='string'||!v.id||ids.has(v.id))
          throw new Error(`ZooContents: invalid/duplicate stable ID ${v.id}`);
        ids.add(v.id);
      }
      if(v.implementationStatus==='build-v1'){
        additions++;
        if(!archetypeIds.has(v.archetype)&&v.archetype!=='building-reference')
          throw new Error(`ZooContents: unknown archetype ${v.archetype}`);
        if(v.material&&!materialIds.has(v.material))
          throw new Error(`ZooContents: unknown material ${v.material}`);
      }
      if(Array.isArray(v))v.forEach(visit);else Object.values(v).forEach(visit);
    };
    visit(plan);
    if(additions!==236)throw new Error(`ZooContents: expected 236 additions, found ${additions}`);
    return plan;
  }

  const recordsForOutdoor=plan=>[
    ...plan.habitats.flatMap(h=>h.contents),
    ...plan.buildings.flatMap(b=>[...b.sharedFixtures,...b.rooms.flatMap(r=>r.fixtures)]),
  ].filter(q=>q.implementationStatus==='build-v1');
  const recordsForTropical=plan=>[
    ...plan.tropicalScene.rooms.flatMap(r=>r.contents),...plan.tropicalScene.sharedObjects,
  ].filter(q=>q.implementationStatus==='build-v1');

  // The revision-2 outdoor builder predates the detailed fit-out. Remove only its exact visual
  // stand-ins before compiling the canonical contents: collision and interactions remain owned by
  // the expansion, while the three staff rooms receive open-fronted shells instead of solid cubes.
  function cleanOutdoorBase(B) {
    const close=(a,b)=>Math.abs(a-b)<1e-5;
    const matches=(p,x,y,z,w,h,d)=>p&&p.ob&&close(p.ob.x,x)&&close(p.ob.y,y)&&
      close(p.ob.z,z)&&close(p.ob.sx,w)&&close(p.ob.sy,h)&&close(p.ob.sz,d);
    const oldRoomIds=new Set(['quarantine','feed-kitchen','staff-lockers']);
    const isOldCrate=p=>!p.blueprintId&&[-42.58,-41.84,-41.10,-40.36].some(x=>
      matches(p,x,.38,58.75,.58,.76,.72));
    const isOldPavilion=p=>!p.blueprintId&&(
      matches(p,-11.55,1.03,29.5,1.5,1.05,3)||
      matches(p,-10.1,.93,29.5,.82,.10,1.55));
    const isOldTropicalSign=p=>p.blueprintId==='TH-tropical'||
      (p.tag==='热带馆'&&p.ob&&p.ob.x>24&&p.ob.x<26&&p.ob.z>49&&p.ob.z<55);
    for(let i=B.props.length-1;i>=0;i--){
      const p=B.props[i];
      if(oldRoomIds.has(p.blueprintId)||isOldCrate(p)||isOldPavilion(p)||isOldTropicalSign(p))
        B.props.splice(i,1);
    }
    // Both hospital view panes use the same glass and visual opacity. The dedicated observation
    // sign remains the interaction target, so these render-only panes can stay unpickable/loose
    // instead of spending a whole alpha batch on a one-percent historical opacity difference.
    for(const p of B.props)if(p.tag==='动物医院'&&p.alpha<.999){
      p.alpha=.24;
      p.mesh='softBox';
      p.hard=false;
      p.tag=undefined;
      p.ob=null;
    }

    const render=C('#e6dcc6'),floor=C('#8c8577');
    const shell=(id,r,h)=>{
      let part=0;
      const mark=p=>{p.blueprintId=part++?`${id}/SHELL-${String(part-1).padStart(2,'0')}`:id;
        p.zooLodMax=32;return p;};
      const x=(r[0]+r[1])/2,z=(r[2]+r[3])/2,w=r[1]-r[0],d=r[3]-r[2];
      mark(B.flat(x,.021,z,w,d,floor,{hard:true,mode:9,gloss:.08}));
      mark(B.box(r[0],h/2,z,.14,h,d,render,{hard:true,gloss:.07}));
      mark(B.box(r[1],h/2,z,.14,h,d,render,{hard:true,gloss:.07}));
      mark(B.box(x,h/2,r[3],w,h,.14,render,{hard:true,gloss:.07}));
    };
    shell('quarantine',[-50,-44,55.5,60.5],3.8);
    shell('feed-kitchen',[-43,-40,47,52],3.5);
    shell('staff-lockers',[-43,-40,53,56],3.2);
  }

  function compiler(B,plan,scope) {
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,glow,light,thing}=B;
    const materialRepeat=Object.freeze({
      concrete:[1.45,.28],wood:[.60,.32],steel:[.55,.28],brick:[.88,.34],
      plaster:[2.10,.28],rooftile:[.58,.30],paving:[.72,.34],
    });
    const mats=new Map(plan.materials.map(m=>{
      const repeat=materialRepeat[m.texture];
      // Rendering mode belongs to the primitive, not the pigment: concrete furniture is an
      // ordinary opaque box even when a concrete floor uses mode 9. Keeping mode off this common
      // option also lets the new fit-out join the zoo's existing material batches.
      return [m.id,{...m,color:C(m.color),opt:{gloss:m.gloss,
        ...(repeat?{mat:m.texture,matScale:repeat[0],matAmt:repeat[1]}:{})}}];
    }));
    const stats={scope,records:0,props:0,solids:0,blockers:0,things:0,lights:0,ids:[]};
    const propStart=B.props.length,solidStart=B.solids.length,blockerStart=B.blockers.length,
      thingStart=B.things.length,lightStart=B.lights.length;

    const material=q=>mats.get(q.material)||mats.get('M-CONCRETE');
    const rectOf=q=>{
      if(q.rect)return q.rect.slice();
      const [x,,z]=q.at,[w,,d]=q.size,yaw=q.yaw||0,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
      const hx=(c*w+s*d)/2,hz=(s*w+c*d)/2;
      return [x-hx,x+hx,z-hz,z+hz];
    };
    const atOf=q=>q.at?q.at.slice():q.rect?[(q.rect[0]+q.rect[1])/2,q.y0||q.y||0,(q.rect[2]+q.rect[3])/2]:[0,0,0];
    const sizeOf=q=>q.size?q.size.slice():q.rect?[q.rect[1]-q.rect[0],q.height||.02,q.rect[3]-q.rect[2]]:[.5,.5,.5];
    const mark=(p,id,tag)=>{if(p){p.blueprintId=id;if(tag)p.tag=tag;}return p;};

    function build(q) {
      const before=B.props.length,m=material(q),opt={...m.opt},
        tag=q.interaction&&q.interaction.tag;
      let [x,y,z]=atOf(q),[w,h,d]=sizeOf(q);
      const yaw=q.yaw||0;
      // These tiny placement corrections preserve the canonical records while resolving the
      // handful of furniture collisions exposed by the close visual audit.
      if(q.id==='B04/seating/FIX02'||q.id==='B04/seating/FIX03')x=-10.10;
      if(q.id==='B04/tea/FIX02')z=30.0;
      if(q.id==='B04/tea/FIX04')y=1.85;
      if(q.id==='B07/quarantine/FIX06'){x=-44.40;z=55.95;}
      if(q.id==='B08/FIX04')y=3.02;
      if(q.id==='T00/FIX08'){x=-10.43;y=1.25;z=-1.82;w=.06;h=.28;d=.22;}
      if(tag)opt.tag=tag;
      let first=null,child=1;
      const add=p=>{if(!p)return p;mark(p,first?q.id+'/G'+String(child++).padStart(2,'0'):q.id,tag);if(!first)first=p;return p;};
      const b=(xx,yy,zz,ww,hh,dd,col=m.color,o={})=>add(box(xx,yy,zz,ww,hh,dd,col,{hard:true,...opt,...o}));
      const c=(xx,yy,zz,r,hh,col=m.color,o={})=>add(cyl(xx,yy,zz,r,hh,col,{...opt,...o}));
      const bl=(xx,yy,zz,rx,ry,rz,col=m.color,o={})=>add(ball(xx,yy,zz,rx,ry,rz,col,{...opt,...o}));
      const cp=(xx,yy,zz,sx,sy,sz,col=m.color,o={})=>add(capsule(xx,yy,zz,sx,sy,sz,col,{...opt,...o}));
      const fl=(r,yy,col=m.color,o={})=>add(flat((r[0]+r[1])/2,yy,(r[2]+r[3])/2,r[1]-r[0],r[3]-r[2],col,{...opt,...o}));

      switch(q.archetype){
        case 'surface-rect': {
          const r=q.rect||rectOf(q),authoredY=(q.id==='T04/S01'||q.id==='T04/S02') ? .030 : null,
            surfaceY=authoredY===null?(q.y===undefined?(q.at?q.at[1]:q.y0||0):q.y):authoredY;
          fl(r,surfaceY);break;
        }
        case 'pool-volume': {
          const r=q.rect||rectOf(q);
          let surfaceY=q.waterLevel===undefined?
            (q.rect?(q.y0||0)+(q.height||0):y+h/2):q.waterLevel;
          // The crocodile room floor sits at 8 mm. Owning the water at 18 mm keeps the authored
          // pool readable without shimmering against either that floor or the 25 mm mud shelf.
          if(q.id==='T01/S01')surfaceY=.018;
          if(q.id==='T02/S01'){
            // A blue-tinted depth veil just behind the visitor glass reads as a filled aquarium
            // without giving the transparent volume a full top face coplanar with the water sheet.
            // Keeping this first preserves T02/S01 for the volume and /G01 for the mode-16 surface.
            const depthH=surfaceY-.025;
            b((r[0]+r[1])/2,depthH/2,r[3]-.0125,r[1]-r[0],depthH,.025,m.color,
              {mode:1,alpha:.20,gloss:.72,hard:false});
          }else if((q.height||h)>.8&&scope==='tropical')
            b((r[0]+r[1])/2,surfaceY-(q.height||h)/2,(r[2]+r[3])/2,r[1]-r[0],q.height||h,r[3]-r[2],m.color,
              {mode:1,alpha:.20,gloss:.72,hard:false});
          fl(r,surfaceY,m.color,{mode:16,gloss:.60,hard:false});break;
        }
        case 'rock-cluster': {
          const offsets=[[0,0,1],[-.46,.18,.66],[.42,.12,.72],[-.15,-.38,.58],[.34,-.32,.48]];
          offsets.forEach(([ox,oz,s],i)=>bl(x+ox*w*.34,y+h*s*.42,z+oz*d*.34,w*s*.24,h*s*.42,d*s*.23,
            i%2?mats.get('M-ROCK-LIGHT').color:m.color,{mode:10,gloss:.06,hard:false}));break;
        }
        case 'ground-log':
          if(scope==='tropical'&&(q.id==='T00/FIX06'||q.id==='T00/FIX07')){
            const qx=q.id.endsWith('06')?-12.30:-10.75,z0=-1.14,z1=.24;
            for(const pz of [z0,(z0+z1)/2,z1])
              c(qx,.45,pz,.026,.90,mats.get('M-STEEL').color,{hard:false});
            cp(qx,.72,(z0+z1)/2,.026,z1-z0,.026,mats.get('M-STEEL').color,
              {rx:Math.PI/2,hard:false});
            break;
          }
          if(scope==='tropical'&&q.id==='T00/FIX05'){
            fl([-12.56,-11.78,2.22,2.37],.018,m.color,{mode:1,hard:false});
            b(-12.17,.029,2.22,.78,.018,.022,m.color,{mode:1,hard:false});
            b(-12.17,.029,2.37,.78,.018,.022,m.color,{mode:1,hard:false});
            break;
          }
          cp(x,y+h/2,z,h/2,w,h/2,m.color,{rz:Math.PI/2,ry:yaw,hard:false});
          if(h>.22)for(const s of [-1,1])cp(x+Math.cos(yaw)*w*.28*s,y+h*.55,z-Math.sin(yaw)*w*.28*s,h*.22,w*.23,h*.22,
            mats.get('M-TIMBER-DARK').color,{rz:Math.PI/2,ry:yaw+s*.8,hard:false});
          break;
        case 'tree': {
          if(!q.noTrunk)c(x,y+h*.27,z,Math.min(.22,w*.1),h*.54,mats.get('M-TIMBER-DARK').color,{hard:false});
          const count=q.clumpCount||7;
          for(let i=0;i<count;i++){const a=i*2.399,r=(q.noTrunk?.16:.22)*Math.min(w,d);
            cp(x+Math.sin(a)*r,y+h*(q.noTrunk?.42:.72),z+Math.cos(a)*r,
              q.noTrunk?Math.min(w,d)*.025:Math.min(w,d)*.17,q.noTrunk?h*.72:Math.min(w,d)*.42,
              q.noTrunk?Math.min(w,d)*.055:Math.min(w,d)*.16,m.color,
              {mode:15,ry:a,rz:q.noTrunk?Math.sin(a)*.2:0,hard:false});}
          break;
        }
        case 'bamboo-clump': {
          const n=q.caneCount||8;
          for(let i=0;i<n;i++){const a=i*2.399,r=.25+(i%4)*.18,bx=x+Math.sin(a)*r,bz=z+Math.cos(a)*r,hh=h*(.78+(i%4)*.06);
            cp(bx,y+hh*.48,bz,.034,hh*.96,.034,m.color,{hard:false});
            for(let k=0;k<3;k++)cp(bx+Math.sin(a+k*2.1)*.17,y+hh*(.67+k*.11),bz+Math.cos(a+k*2.1)*.17,.032,.52,.09,
              m.color,{mode:15,ry:a+k*2.1,rz:.65,hard:false});}
          break;
        }
        case 'animal-shelter':
          for(const ox of [-w*.42,w*.42])for(const oz of [-d*.42,d*.42])b(x+ox,y+h*.43,z+oz,Math.min(.24,w*.08),h*.86,Math.min(.24,d*.08),m.color);
          b(x,y+h,z,w,.18,d,mats.get('M-ROOF-GREEN').color,{...mats.get('M-ROOF-GREEN').opt});break;
        case 'animal-den':
          b(x,y+h/2,z,w,h,d,m.color);
          add(box(x,y+h*.42,z-d*.51,Math.min(1,w*.42),h*.65,.035,
            mats.get('M-MESH').color,{hard:true,mode:1}));break;
        case 'feed-trough':
          b(x,y+h*.35,z,w,h*.7,d,m.color);
          b(x,y+h*.78,z,w*.82,h*.16,d*.76,mats.get('M-SAND').color,{hard:false});break;
        case 'water-trough':
          b(x,y+h*.45,z,w,h*.55,d,m.color);
          fl([x-w*.42,x+w*.42,z-d*.34,z+d*.34],y+h*.76,mats.get('M-WATER-LIGHT').color,{mode:16,gloss:.58,hard:false});break;
        case 'scrub-post':
          c(x,y+h/2,z,w/2,h,m.color);for(let i=0;i<5;i++)c(x,y+h*(.18+i*.15),z,w*.58,.035,mats.get('M-RUBBER').color,{hard:false});break;
        case 'climbing-frame':
          for(const ox of [-w*.38,w*.38])for(const oz of [-d*.38,d*.38])c(x+ox,y+h*.45,z+oz,Math.min(.12,w*.06,d*.06),h*.9,m.color,{hard:false});
          for(let i=0;i<3;i++)cp(x,y+h*(.28+i*.24),z+(i-1)*d*.25,Math.min(.07,h*.03),w*.82,Math.min(.07,h*.03),m.color,{rz:Math.PI/2,ry:yaw,hard:false});break;
        case 'nest-platform':
          c(x,y+h/2,z,Math.min(w,d)/2,h,m.color,{hard:false});
          for(let i=0;i<10;i++){const a=i*Math.PI/5;cp(x+Math.cos(a)*w*.32,y+h*.75,z+Math.sin(a)*d*.32,.018,.35,.018,mats.get('M-SAND').color,{rz:Math.sin(a)*.6,hard:false});}break;
        case 'habitat-camera':
          c(x,y+h*.45,z,w*.18,h*.9,m.color);b(x,y+h*.88,z,w*1.5,h*.14,d*2.2,m.color,{ry:yaw});break;
        case 'floor-drain':
          b(x,y+.016,z,w,.032,d,m.color,{mode:1});
          for(let i=-2;i<=2;i++)b(x+i*w*.16,y+.034,z,w*.045,.012,d*.88,mats.get('M-MESH').color,{mode:1});break;
        case 'keeper-safe-zone':
          // Clear the broad habitat-art floor by 2.7 cm. At the old two-millimetre separation the
          // painted pad shimmered whenever the wide camera crossed a district.
          fl(rectOf(q),y+.027,m.color,{mode:9,gloss:.10});
          // The two painted edge bars are untextured markings, so submit them through the zoo's
          // existing mode-1 box batch instead of inheriting the concrete pad material.
          for(const s of [-1,1])add(box(x+s*w*.42,y+.052,z,w*.08,.025,d*.82,
            mats.get('M-ROOF-RED').color,{hard:true,mode:1}));break;
        case 'counter': {
          // A service counter is a framed work station, not one waist-high cuboid. The canonical
          // collision still owns its full footprint while the open under-counter bays expose the
          // sink, boiler and tea storage behind it.
          for(const oz of [-d*.41,d*.41])
            b(x,y+h*.51,z+oz,w*.84,h*.78,Math.min(.10,d*.06),m.color,{ry:yaw});
          b(x,y+h*.43,z,w*.82,h*.06,d*.84,mats.get('M-TIMBER').color,{ry:yaw});
          b(x,y+h*.96,z,w+Math.min(.16,w*.08),h*.1,d+Math.min(.12,d*.1),
            mats.get('M-TIMBER').color,{ry:yaw});
          break;
        }
        case 'table':
          b(x,y+h*.78,z,w,h*.12,d,m.color,{ry:yaw});
          for(const ox of [-w*.38,w*.38])for(const oz of [-d*.34,d*.34])b(x+ox,y+h*.38,z+oz,Math.min(.08,w*.08),h*.72,Math.min(.08,d*.12),mats.get('M-STEEL-DARK').color,{ry:yaw});break;
        case 'chair':
          b(x,y+h*.48,z,w,h*.08,d,m.color,{ry:yaw});b(x,y+h*.74,z-d*.42,w,h*.48,.08,m.color,{ry:yaw});break;
        case 'cabinet': {
          // The snack chiller is accessed from the staff side of its counter; its authored yaw
          // describes the body footprint, while the functional door must face north into the bay.
          const cabinetYaw=q.id==='B03/snack/FIX03'?Math.PI:yaw;
          b(x,y+h/2,z,w,h,d,m.color,{ry:cabinetYaw});
          const nx=-Math.sin(cabinetYaw),nz=-Math.cos(cabinetYaw),
            tx=Math.cos(cabinetYaw),tz=-Math.sin(cabinetYaw),
            fx=x+nx*(d*.505+.012),fz=z+nz*(d*.505+.012);
          b(fx,y+h*.54,fz,w*.84,h*.78,.026,m.color,{ry:cabinetYaw});
          c(fx+tx*w*.25,y+h*.56,fz+tz*w*.25,.012,h*.20,
            mats.get('M-STEEL-DARK').color,{hard:false});
          break;
        }
        case 'shelf': {
          // Open shelves keep their full authored envelope but never fill it with an opaque block.
          for(const yy of [.08,.94])b(x,y+h*yy,z,w*.94,.045,d*.92,m.color,{ry:yaw});
          if(w<=d){
            for(const oz of [-d*.43,d*.43])b(x,y+h*.50,z+oz,w*.92,h*.92,.045,m.color,{ry:yaw});
          }else for(const ox of [-w*.43,w*.43])b(x+ox,y+h*.50,z,.045,h*.92,d*.92,m.color,{ry:yaw});
          if(/tea/i.test(q.label)){
            // Keep the two existing canister child IDs, put them on a genuine middle shelf, and
            // append that new shelf as G06 so all previously-authored child mappings remain stable.
            const midY=y+h*.50,canisterH=h*.17,canisterY=midY+.0225+canisterH/2+.02;
            for(const zz of [-d*.25,0])c(x,canisterY,z+zz,Math.min(.07,w*.20),canisterH,
              mats.get('M-CERAMIC').color,{hard:false});
            b(x,midY,z,w*.94,.045,d*.92,m.color,{ry:yaw});
          }
          else if(/brochure/i.test(q.label))for(const zz of [-d*.18,d*.18])
            b(x+w*.08,y+h*.53,z+zz,w*.15,h*.26,d*.24,mats.get('M-CERAMIC').color,
              {mode:1});
          else for(const zz of [-d*.22,d*.22])
            bl(x,y+h*.30,z+zz,w*.25,h*.15,d*.15,mats.get('M-SAND').color,{hard:false});
          break;
        }
        case 'sanitary-fixture':
          b(x,y+h*.38,z,w*.72,h*.55,d,m.color,{ry:yaw});bl(x,y+h*.68,z-d*.16,w*.36,h*.20,d*.34,m.color,{hard:false});
          c(x,y+h*.82,z-d*.32,Math.min(.04,w*.08),h*.24,mats.get('M-STEEL').color,{hard:false});break;
        case 'display-case':
          b(x,y+h*.25,z,w,h*.5,d,mats.get('M-RENDER').color,{ry:yaw});
          // All cases need readable contents; opaque glazing made the outdoor galleries look like
          // solid storage blocks at normal visitor distance.
          b(x,y+h*.68,z,w*.94,h*.62,d*.94,mats.get('M-GLASS').color,
            {mode:1,alpha:scope==='tropical'?.28:.32,gloss:.9,ry:yaw,hard:false});
          bl(x,y+h*.65,z,w*.16,h*.16,d*.16,mats.get('M-ROCK-LIGHT').color,{hard:false});break;
        case 'screen': {
          const thin=Math.min(w,d),faceX=w<=d;
          const nx=Math.sin(yaw),nz=Math.cos(yaw),screenText=tag||SCREEN_LABELS[q.id]||null,
            screenTag=tag||(q.id==='B08/FIX03'?'热带馆':null);
          // Screen sizes are authored in world axes. Rotating those dimensions a second time made
          // every portrait display into a long blade through its room.
          b(x,y,z,w,h,d,mats.get('M-STEEL-DARK').color);
          b(x+nx*thin*.55,y,z+nz*thin*.55,
            faceX?w*.15:w*.92,h*.82,faceX?d*.9:Math.max(.02,d*.08),m.color,
            {mode:1,glow:.04});
          if(screenText)glyphs(x+nx*thin*.62,y,z+nz*thin*.62,yaw,screenText,
            {size:Math.min(.16,1.1/Math.max(1,[...screenText].length)),gap:.02,
              color:mats.get('M-CERAMIC').color,mode:1,...(screenTag?{tag:screenTag}:{})});
          break;
        }
        case 'light-fixture':
          b(x,y,z,w,h,d,m.color,{mode:1,glow:q.heat?.10:.06,ry:yaw});
          if(q.lumens&&(scope==='tropical'||OUTDOOR_POINT_LIGHT_IDS.has(q.id))){
            const lc=q.heat?[1,.34,.20]:[1,.86,.68];
            light(x,y-.18,z,lc,Math.min(1.1,.4+q.lumens/6000),Math.max(3,Math.sqrt(q.lumens)*.11));
          }
          break;
        case 'mesh-enclosure':
          for(const ox of [-w/2,w/2])for(const oz of [-d/2,d/2])b(x+ox,y+h/2,z+oz,.08,h,.08,m.color);
          for(const yy of [y+.65,y+h*.55,y+h]){cp(x,yy,z-d/2,.025,w,.025,m.color,{rz:Math.PI/2,hard:false});cp(x,yy,z+d/2,.025,w,.025,m.color,{rz:Math.PI/2,hard:false});}
          for(let zz=z-d/2;zz<=z+d/2+EPS;zz+=Math.max(.65,d/4)){c(x-w/2,y+h/2,zz,.014,h,m.color,{hard:false});c(x+w/2,y+h/2,zz,.014,h,m.color,{hard:false});}
          break;
        case 'box-fixture': {
          const rockLike=/stone|ledge|mineral|lick/i.test(q.label),crate=/crate/i.test(q.label),
            ticket=/ticket reader/i.test(q.label),binocular=/binocular/i.test(q.label),
            window=/viewing window/i.test(q.label),scale=/platform scale/i.test(q.label),
            hose=/hose reel/i.test(q.label),cart=/cleaning cart/i.test(q.label),
            pedestal=/audio station|sound post/i.test(q.label);
          if(rockLike){
            add(ball(x,y+h*.44,z,w*.50,h*.44,d*.50,m.color,
              {mode:10,gloss:.06,hard:false}));
          }else if(ticket){
            if(q.id.startsWith('B01/'))b(x,y+h/2,z,w,h,d,m.color,{ry:yaw,hard:false});
            else{
              c(x,y+h*.36,z,Math.min(w,d)*.20,h*.72,m.color,{hard:false});
              b(x,y+h*.82,z,w*.92,h*.30,d*.94,m.color,{ry:yaw});
            }
          }else if(binocular){
            c(x,y+h*.38,z,.055,h*.76,m.color,{hard:false});
            cp(x,y+h*.82,z,.12,.42,.12,m.color,{rz:Math.PI/2,ry:yaw,hard:false});
            c(x,y+h*.87,z-.10,.065,.18,mats.get('M-STEEL').color,
              {rx:Math.PI/2,hard:false});
          }else if(window){
            b(x,y+h/2,z,w*.76,h*.88,d,m.color,{mode:1,alpha:.28,hard:false});
            b(x,y+h*.08,z,w,.07,d,mats.get('M-STEEL-DARK').color);
            b(x,y+h*.92,z,w,.07,d,mats.get('M-STEEL-DARK').color);
          }else if(scale){
            b(x,y+h*.24,z,w,h*.48,d,m.color);
          }else if(hose){
            c(x,y+h/2,z,Math.min(h,d)*.42,w,m.color,{rz:Math.PI/2,hard:false});
            cp(x,y+h*.20,z+d*.38,.035,d*.62,.035,mats.get('M-RUBBER').color,
              {rx:Math.PI/2,rz:.28,hard:false});
          }else if(cart){
            b(x,y+h*.25,z,w,h*.12,d*.86,m.color);
            b(x,y+h*.62,z,w*.86,h*.54,d*.62,m.color);
            cp(x,y+h*.90,z+d*.42,.025,w*.76,.025,mats.get('M-STEEL-DARK').color,
              {rz:Math.PI/2,hard:false});
          }else if(crate){
            b(x,y+h/2,z,w,h,d,m.color,{ry:yaw});
          }else if(pedestal){
            c(x,y+h*.38,z,Math.min(w,d)*.22,h*.76,mats.get('M-STEEL-DARK').color,
              {hard:false});
            b(x,y+h*.82,z,w,h*.34,d,m.color,{ry:yaw});
            b(x,y+h*.84,z-d*.51,w*.60,h*.14,.025,mats.get('M-SCREEN').color,
              {ry:yaw,mode:1,glow:.04});
          }else{
            // Tiny wall controls and appliances use a single rounded, purpose-coloured housing;
            // at this scale extra coplanar facelets shimmer more than they clarify the object.
            b(x,y+h/2,z,w,h,d,m.color,{ry:yaw,hard:false});
          }
          break;
        }
        case 'cylinder-fixture':
          c(x,y+h/2,z,Math.min(w,d)/2,h,m.color,{ry:yaw});break;
        case 'door-opening':
          b(x,y+h*.82,z,w,h*.18,d,m.color,{ry:yaw});break;
        default:
          b(x,y+h/2,z,w,h,d,m.color,{ry:yaw});
      }

      if(!first&&q.archetype!=='building-reference')
        first=mark(box(x,y+h/2,z,w,h,d,m.color,{hard:true,...opt}),q.id,tag);

      // Habitat rectangles already own player collision, so interior equipment never spends a
      // second solid or blocker on the same inaccessible area. Public building and greenhouse
      // fixtures retain the exact body contract declared in the contents blueprint.
      const habitatOwned=scope==='outdoor'&&/^H\d/.test(q.id);
      if(!habitatOwned&&q.collision&&q.collision!=='none'&&q.collision!=='inherited'){
        // The PPE cabinet is deliberately moved into the clear east-wall bay. Its collision must
        // follow the visual instead of retaining the obsolete PEN01-overlapping blueprint rect.
        let r=rectOf(q);
        if(q.id==='B07/quarantine/FIX06'){
          const cc=Math.abs(Math.cos(yaw)),ss=Math.abs(Math.sin(yaw)),
            hx=(cc*w+ss*d)/2,hz=(ss*w+cc*d)/2;
          r=[x-hx,x+hx,z-hz,z+hz];
        }
        solid(...r);
        if(/camera/.test(q.collision))blocker(...r,(q.at?q.at[1]:q.y0||0)+(q.size?q.size[1]:q.height||2)+.15);
      }
      if(q.interaction&&!q.interaction.aliasOf){
        const i=q.interaction,th=thing(i.tag,x,y+h*.72,z,`看看${q.label}。`,
          `Look at the ${q.label}.`,`这里的${i.tag}是动物园设施的一部分。`,
          {focus:i.focus,reach:i.reach});
        th.blueprintId='TH-'+q.id;
      }
      B.props.slice(before).forEach((p,i)=>{if(!p.blueprintId)p.blueprintId=i?`${q.id}/G${String(i).padStart(2,'0')}`:q.id;p.zooLodMax=p.zooLodMax===undefined?28:p.zooLodMax;});
      stats.records++;stats.ids.push(q.id);
    }

    return {
      buildAll(records){records.forEach(build);stats.props=B.props.length-propStart;stats.solids=B.solids.length-solidStart;
        stats.blockers=B.blockers.length-blockerStart;stats.things=B.things.length-thingStart;stats.lights=B.lights.length-lightStart;return Object.freeze(stats);},
    };
  }

  function buildOutdoor(B,contentsPlan,parentPlan) {
    const plan=validatePlan(contentsPlan,parentPlan);
    cleanOutdoorBase(B);
    return compiler(B,plan,'outdoor').buildAll(recordsForOutdoor(plan));
  }
  function buildTropical(B,contentsPlan,parentPlan) {
    const plan=validatePlan(contentsPlan,parentPlan);
    return compiler(B,plan,'tropical').buildAll(recordsForTropical(plan));
  }

  const ACTIONS=Object.freeze({
    '检票':{zh:'检票入园',py:'jiǎnpiào rùyuán',en:'validate the ticket',done:'检票完成，可以入园。',doneTr:'The ticket is valid; you may enter.'},
    '入口状态':{zh:'查看入口状态',py:'chákàn rùkǒu zhuàngtài',en:'check the entrance status',done:'屏幕显示开放时间、检票状态和无障碍路线。',doneTr:'The screen shows opening hours, ticket status, and the accessible route.'},
    '茶亭':{zh:'在茶亭喝茶',py:'zài chátíng hē chá',en:'have tea at the pavilion',done:'坐在湖边喝了一杯热茶。',doneTr:'You have a cup of hot tea beside the lake.'},
    '望远镜':{zh:'用望远镜看水鸟',py:'yòng wàngyuǎnjìng kàn shuǐniǎo',en:'watch waterfowl through the binoculars',done:'远处的水鸟看得很清楚。',doneTr:'The distant waterfowl come into clear view.'},
    '熊猫保护':{zh:'了解熊猫保护',py:'liǎojiě xióngmāo bǎohù',en:'learn about panda conservation',done:'屏幕介绍了熊猫的遗传和栖息地保护。',doneTr:'The display explains panda genetics and habitat protection.'},
    '急救':{zh:'查看急救设备',py:'chákàn jíjiù shèbèi',en:'check the first-aid equipment',done:'急救设备都在指定位置。',doneTr:'The first-aid equipment is in its assigned place.'},
    '保育展':{zh:'参观保育展',py:'cānguān bǎoyù zhǎn',en:'visit the conservation exhibition',done:'展览记录了动物恢复的过程。',doneTr:'The exhibition traces how animal populations recover.'},
    '图书商店':{zh:'逛图书商店',py:'guàng túshū shāngdiàn',en:'browse the bookshop',done:'书架上都是动物和自然读物。',doneTr:'The shelves are full of books about animals and nature.'},
    '动物声音':{zh:'听动物声音',py:'tīng dòngwù shēngyīn',en:'listen to animal calls',done:'耳机里传来不同动物的叫声。',doneTr:'Different animal calls play through the listening station.'},
    '无障碍路线':{zh:'查看无障碍路线',py:'chákàn wúzhàng’ài lùxiàn',en:'check the accessible route',done:'路线避开了台阶和工作通道。',doneTr:'The route avoids steps and service paths.'},
    '雨林声音':{zh:'听雨林声音',py:'tīng yǔlín shēngyīn',en:'listen to the rainforest',done:'能听见雨声、虫鸣和鸟叫。',doneTr:'You hear rain, insects and birds.'},
  });

  const OUTDOOR_POINT_LIGHT_IDS=new Set([
    'B01/FIX05','B01/FIX06','B03/FIX-L01','B04/FIX-L01',
    'B05/FIX-L02','B06/FIX-L02','B07/FIX-L02','B08/FIX04',
  ]);

  function useRows(contentsPlan,place,parentPlan) {
    const plan=validatePlan(contentsPlan,parentPlan),out={};
    const records=place==='zoo_tropical'?recordsForTropical(plan):place==='zoo'?recordsForOutdoor(plan):[];
    for(const q of records){const tag=q.interaction&&!q.interaction.aliasOf&&q.interaction.tag,a=tag&&ACTIONS[tag];if(!a)continue;
      out[tag]={zh:a.zh,py:a.py,en:a.en,secs:2.4,mins:5,gain:{mood:5},pose:{type:'stand'},done:a.done,doneTr:a.doneTr};}
    return out;
  }

  return Object.freeze({SCHEMA,REVISION,CONTENT_HASH,validatePlan,buildOutdoor,buildTropical,useRows});
})();
