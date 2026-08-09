// 北京文华大学 · blueprint-driven interiors.
//
// UNIVERSITY-INTERIORS-BLUEPRINT.json is the source of truth for every room, opening,
// fixture, finish and coordinate.  This file is deliberately a renderer, not a second plan:
// each floor is a Lazy scene assembled from the JSON only when the player enters it.
const CampusInteriors = (() => {
  const plan = window.UNIVERSITY_INTERIORS_BLUEPRINT;
  if (!plan || !plan.meta || plan.meta.schema !== 'chinesegame.university-interiors/v1')
    throw new Error('CampusInteriors: missing or incompatible UNIVERSITY_INTERIORS_BLUEPRINT');

  const materials = new Map(plan.materials.map(m => [m.id, m]));
  const prefabs = new Map(plan.prefabCatalog.map(p => [p.id, p]));
  const buildings = new Map(plan.buildings.map(b => [b.id, b]));
  const prefix = { B01:'b01', B02:'b02', B04:'dorm', B05:'admin', B06:'science', B07:'student' };
  const places = {};

  const placeKey = (buildingId, level) => buildingId === 'B03' ? 'campus_canteen' :
    buildingId === 'B08' ? 'campus_security' : `campus_${prefix[buildingId]}_f${level}`;

  const allObjects = floor => floor.rooms.flatMap(r => r.contents || []).concat(floor.sharedObjects || []);
  const mat = id => materials.get(id) || materials.get('M-WALL-WARM');
  const prefab = id => prefabs.get(id) || { id, size:[.5,.5,.5], anchor:'floor' };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rotated = (x, z, dx, dz, yaw) => {
    const c=Math.cos(yaw||0),s=Math.sin(yaw||0);
    return [x+c*dx+s*dz,z-s*dx+c*dz];
  };

  function validate() {
    const errors=[];
    if (plan.buildings.length !== 8) errors.push(`expected 8 buildings, found ${plan.buildings.length}`);
    for (const b of plan.buildings) {
      if (b.floorsPlan.length !== b.floors) errors.push(`${b.id}: floor count mismatch`);
      for (const f of b.floorsPlan) for (const o of allObjects(f)) {
        if (!prefabs.has(o.prefab)) errors.push(`${o.id}: unknown prefab ${o.prefab}`);
        if (!materials.has(o.material)) errors.push(`${o.id}: unknown material ${o.material}`);
        if (!Array.isArray(o.at) || o.at.length !== 3 || o.at.some(v => !Number.isFinite(v)))
          errors.push(`${o.id}: invalid coordinate`);
      }
    }
    if (errors.length) throw new Error(`CampusInteriors blueprint invalid:\n${errors.slice(0,20).join('\n')}`);
    return { buildings:plan.buildings.length, floors:plan.buildings.reduce((n,b)=>n+b.floors,0),
      rooms:plan.buildings.reduce((n,b)=>n+b.floorsPlan.reduce((m,f)=>m+f.rooms.length,0),0),
      fixtures:plan.buildings.reduce((n,b)=>n+b.floorsPlan.reduce((m,f)=>m+allObjects(f).length,0),0) };
  }
  const counts=validate();

  // A small vocabulary is authored here because these strings are derived from room labels rather
  // than repeated in hand-written geometry files.  `need` is idempotent and runs before the atlas
  // is sealed by the game.
  try {
    Glyphs.need(plan.buildings.map(b => b.label + b.floorsPlan.flatMap(f => f.rooms.map(r => r.label)).join('')).join('') +
      '上下楼层校园出口大学教室图书馆食堂宿舍行政科学创新活动中心校医院门卫访客室');
  } catch (_) {}

  function buildFloor(building, floor, entryPortalId) {
    const C0 = id => C(mat(id).color);
    const B=Build.scene({fabricGloss:.04});
    const {box,cyl,ball,capsule,flat,wall,glyphs,solid,blocker,shade,thing}=B;
    const [x0,x1,z0,z1]=building.localBounds;
    const RX=(x1-x0)/2,RZ=(z1-z0)/2,CX=(x0+x1)/2,CZ=(z0+z1)/2;
    const H=Math.max(2.75,floor.height-.18),base=floor.elevation;
    const lit=[],lights=[];
    let liveLights=0;
    const doorClearances=floor.rooms.flatMap(room=>(room.doors||[]).map(d=>{
      const vertical=d.side==='east'||d.side==='west',half=d.width/2+.32,depth=1.35;
      return vertical?{x0:d.at[0]-depth,x1:d.at[0]+depth,z0:d.at[2]-half,z1:d.at[2]+half,id:d.id}:
        {x0:d.at[0]-half,x1:d.at[0]+half,z0:d.at[2]-depth,z1:d.at[2]+depth,id:d.id};
    }));

    const opts = (materialId, extra={}) => {
      const m=mat(materialId),o={hard:true,gloss:m.gloss===undefined?.12:m.gloss,...extra};
      if (m.texture && m.texture !== 'none' && m.texture !== 'glass') {
        o.mat=m.texture === 'terrazzo' ? 'tile' : m.texture === 'steel' ? 'metal' : m.texture;
        o.matScale=m.texture === 'wood' ? .62 : m.texture === 'brick' ? .9 : .38;
        o.matAmt=m.texture === 'wood' ? .42 : .30;
      }
      if (m.renderMode !== undefined) o.mode=m.renderMode;
      return o;
    };
    const prop = (tag,x,y,z,w,h,d,materialId,o={}) => box(x,y,z,w,h,d,C0(materialId),
      opts(materialId,{tag,ry:o.ry||0,alpha:o.alpha,glow:o.glow,partition:o.partition}));
    const localBox = (f,dx,y,dz,w,h,d,materialId,o={}) => {
      const [x,z]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
      return prop(f.id,x,y,z,w,h,d,materialId||f.material,{...o,ry:(f.yaw||0)+(o.ry||0)});
    };
    const bodySolid = (f,w,d) => {
      const q=((Math.round((f.yaw||0)/(Math.PI/2))%2)+2)%2;
      const sw=q?d:w,sd=q?w:d,x=f.at[0],z=f.at[2];
      // Keep the collision body just inside the visible footprint.  This is the same small
      // tolerance used by hand-built rooms: it prevents a visually clear 0.90–1.20 m doorway
      // from becoming impassable when the player's radius is added to both the wall and a desk.
      const body={x0:x-sw*.40,x1:x+sw*.40,z0:z-sd*.40,z1:z+sd*.40};
      // Door swings and their 1.35 m approach rectangles are hard keep-clear zones.  A fixture
      // whose decorative footprint clips that zone remains visible but does not receive a body
      // collider; this is preferable to an invisible navigation failure in a data-heavy room.
      if(f.prefab!=='PF-LIFT'&&doorClearances.some(k=>body.x1>k.x0&&body.x0<k.x1&&body.z1>k.z0&&body.z0<k.z1))return;
      const s=solid(body.x0,body.x1,body.z0,body.z1);
      s.fixtureId=f.id;
    };
    const realLight = (x,y,z,temp=3800,power=.72,radius=3.0) => {
      if (liveLights++ >= 10) return;
      const warm=clamp((4200-temp)/1700,0,1);
      lights.push(B.light(x,y,z,[1,.90+.07*(1-warm),.76+.19*(1-warm)],power,radius));
    };

    // Base deck, ceiling and exterior envelope.  Room/circulation finish patches are laid a few
    // millimetres above the base, so the complete plate remains walkable even in service gaps.
    flat(CX,0,CZ,x1-x0,z1-z0,C0('M-TERRAZZO'),opts('M-TERRAZZO',{tag:`${building.id}/F${floor.level}/FLOOR`}));
    B.props.push({mesh:'quad',color:C0('M-WALL-WHITE'),mode:1,alpha:1,nocut:true,
      m:M.mul(M.trans(CX,H,CZ),M.mul(M.rotZ(Math.PI),M.scale(x1-x0,1,z1-z0)))});
    for (const [x,y,z,w,h,yaw] of [[CX,H/2,z1,x1-x0,H,Math.PI],[x0,H/2,CZ,z1-z0,H,Math.PI/2],
      [x1,H/2,CZ,z1-z0,H,-Math.PI/2],[CX,H/2,z0,x1-x0,H,0]])
      wall(x,y,z,w,h,yaw,C0('M-WALL-WARM'),opts('M-WALL-WARM',{nocut:true}));
    const edge=.16;
    solid(x0-edge,x0+edge,z0-edge,z1+edge); solid(x1-edge,x1+edge,z0-edge,z1+edge);
    solid(x0-edge,x1+edge,z0-edge,z0+edge); solid(x0-edge,x1+edge,z1-edge,z1+edge);
    blocker(x0-edge,x0+edge,z0-edge,z1+edge,H); blocker(x1-edge,x1+edge,z0-edge,z1+edge,H);

    const floorPatch = (bounds,materialId,tag) => {
      const [a,b,c,d]=bounds;
      flat((a+b)/2,.006,(c+d)/2,b-a,d-c,C0(materialId),opts(materialId,{tag}));
    };
    for (const route of floor.circulation || []) floorPatch(route.bounds,route.surface,route.id);
    for (const room of floor.rooms) {
      const finish=plan.finishSets[room.finish]||plan.finishSets.public;
      floorPatch(room.bounds,finish.floor,room.id);
    }

    // Room rectangles become real, cutaway-aware partitions.  Each side is split around every
    // blueprint door on that side; both the visible wall and the body collider use the same gaps.
    const seen=new Set();
    function partitionRun(room,side) {
      const [a,b,c,d]=room.bounds,vertical=side==='east'||side==='west';
      const fixed=vertical?(side==='west'?a:b):(side==='south'?c:d);
      const lo=vertical?c:a,hi=vertical?d:b;
      const key=`${vertical?'v':'h'}:${fixed.toFixed(3)}:${lo.toFixed(3)}:${hi.toFixed(3)}`;
      if (seen.has(key)) return; seen.add(key);
      const openings=(room.doors||[]).filter(q=>q.side===side).map(q=>{
        const centre=vertical?q.at[2]:q.at[0]; return [centre-q.width/2,centre+q.width/2];
      });
      // A circulation rectangle that crosses a room face is itself an authored open passage.
      // Cut that passage through the partition as well as cutting explicit doors; otherwise a
      // room such as the library circulation core can redraw a wall across the public hall.
      for(const route of floor.circulation||[]){
        const [rx0,rx1,rz0,rz1]=route.bounds;
        if(vertical&&rx0<=fixed+.02&&rx1>=fixed-.02){
          const u=Math.max(lo,rz0),v=Math.min(hi,rz1); if(v>u+.05)openings.push([u-.04,v+.04]);
        } else if(!vertical&&rz0<=fixed+.02&&rz1>=fixed-.02){
          const u=Math.max(lo,rx0),v=Math.min(hi,rx1); if(v>u+.05)openings.push([u-.04,v+.04]);
        }
      }
      openings.sort((u,v)=>u[0]-v[0]);
      const segments=[]; let cursor=lo;
      for(const [oa,ob] of openings){if(oa>cursor+.04)segments.push([cursor,Math.min(oa,hi)]);cursor=Math.max(cursor,ob);}
      if(cursor<hi-.04)segments.push([cursor,hi]);
      const finish=plan.finishSets[room.finish]||plan.finishSets.public;
      for(const [s0,s1] of segments){
        if(s1-s0<.05)continue;
        const mid=(s0+s1)/2,len=s1-s0,th=building.partitionThickness||.12;
        B.partition(0,H,(y,h,o)=>vertical?
          prop(`${room.id}/${side}`,fixed,y,mid,th,h,len,finish.wall,o):
          prop(`${room.id}/${side}`,mid,y,fixed,len,h,th,finish.wall,o));
        const s=vertical?solid(fixed-th/2,fixed+th/2,s0,s1):solid(s0,s1,fixed-th/2,fixed+th/2);
        s.partitionId=`${room.id}/${side}`;
      }
      // An open leaf and a labelled lintel show where the omitted wall segment is.
      for(const door of (room.doors||[]).filter(q=>q.side===side)){
        const [dx,,dz]=door.at,yaw=vertical?Math.PI/2:0;
        let leafX=dx,leafZ=dz;
        if(vertical){leafZ=dz-door.width/2;leafX=dx+(side==='west'?1:-1)*door.width*.39;}
        else{leafX=dx-door.width/2;leafZ=dz+(side==='south'?1:-1)*door.width*.39;}
        prop(door.id,leafX,1.05,leafZ,door.width*.78,2.10,.07,'M-OAK-DARK',{ry:yaw+Math.PI/2});
        const label=room.label.length>12?room.label.slice(0,12):room.label;
        glyphs(dx,2.28,dz,yaw+(side==='south'||side==='west'?0:Math.PI),label,
          {size:.105,gap:.022,color:C0('M-SCREEN'),mode:1,tag:door.id,lift:.014});
      }
    }
    for(const room of floor.rooms) for(const side of ['south','north','west','east']) partitionRun(room,side);

    function renderChair(f,w=.46,h=.84,d=.48,material=f.material) {
      const ground=f.at[1]-base;
      localBox(f,0,ground+.45,0,w,.07,d*.84,material);
      localBox(f,0,ground+.69,d*.36,w,.42,.07,material);
      for(const dx of [-w*.38,w*.38])for(const dz of [-d*.32,d*.32])
        localBox(f,dx,ground+.22,dz,.045,.44,.045,'M-STEEL-DARK');
    }
    function renderTable(f,w,h,d,material=f.material,chairs=0) {
      const y=f.at[1]-base;
      localBox(f,0,y+h-.05,0,w,.10,d,material);
      for(const dx of [-w*.42,w*.42])for(const dz of [-d*.36,d*.36])
        localBox(f,dx,y+(h-.10)/2,dz,.055,h-.10,.055,'M-STEEL-DARK');
      if(chairs===4) for(const [dx,dz,yaw] of [[-w*.26,-d*.83,0],[w*.26,-d*.83,0],[-w*.26,d*.83,Math.PI],[w*.26,d*.83,Math.PI]]){
        const q={...f,id:`${f.id}/CHAIR/${dx}/${dz}`,at:[...f.at],yaw:(f.yaw||0)+yaw};
        [q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0); renderChair(q,.42,.82,.44,'M-FABRIC-BLUE');
      }
    }
    function renderShelf(f,w,h,d,books=false) {
      const y=f.at[1]-base;
      localBox(f,-w*.47,y+h/2,0,.07,h,d,f.material); localBox(f,w*.47,y+h/2,0,.07,h,d,f.material);
      localBox(f,0,y+h/2,d*.44,w,.08,.07,f.material);
      for(let i=0;i<5;i++)localBox(f,0,y+.08+i*(h-.13)/4,0,w,.07,d,f.material);
      if(books)for(let r=0;r<4;r++)for(let i=0;i<5;i++){
        const palette=['M-FABRIC-RED','M-FABRIC-BLUE','M-OAK','M-SAFETY-YELLOW'];
        localBox(f,-w*.34+i*w*.17,y+.20+r*(h-.13)/4,0,.10,.25,.72*d,palette[(r+i)%palette.length]);
      }
    }
    function renderWorkstation(f,w,h,d,lab=false) {
      renderTable(f,w,h,d,f.material);
      const y=f.at[1]-base;
      if(!lab){
        localBox(f,0,y+h+.28,d*.10,.48,.34,.06,'M-STEEL-DARK');
        localBox(f,0,y+h+.09,-d*.18,.48,.035,.18,'M-WALL-WHITE');
        const chair={...f,id:`${f.id}/TASK-CHAIR`,at:[...f.at]};
        [chair.at[0],chair.at[2]]=rotated(f.at[0],f.at[2],0,-d*.95,f.yaw||0);
        renderChair(chair,.43,.82,.45,'M-FABRIC-BLUE');
      } else {
        localBox(f,0,y+.38,d*.43,w*.92,.64,.06,'M-LAB-BLUE');
        localBox(f,-w*.28,y+h+.14,0,.10,.18,.10,'M-SAFETY-YELLOW');
      }
    }

    const collide=/BED|TABLE|DESK|COUNTER|BENCH|BOOK|SHELF|CABINET|LOCKER|RANGE|FRIDGE|FREEZER|LAB-|FUME|ROBOT|MICRO|EXAM|PHARM|CCTV|WARDROBE|STAIR|TOILET|BASIN|SHOWER|LAUNDRY|WAIT-CHAIRS|LECTURE-SEAT|SELF-CHECK|DIRECTORY/;
    function renderFixture(f) {
      const p=prefab(f.prefab),size=f.size||p.size,[w,h,d]=size,y=f.at[1]-base;
      if(f.collision!=='none'&&collide.test(f.prefab)) bodySolid(f,w*.9,d*.9);
      switch(f.prefab){
        case 'PF-CEILING-LIGHT': {
          const q=localBox(f,0,y,0,w,h,d,'M-WALL-WHITE',{glow:.24}); lit.push(q);
          realLight(f.at[0],Math.min(H-.15,y-.08),f.at[2],f.temperatureK||3800,.72,3.2); break;
        }
        case 'PF-PENDANT':
          localBox(f,0,y+.35,0,.025,.70,.025,'M-STEEL-DARK');
          localBox(f,0,y,0,w,h,d,f.material,{glow:.18}); realLight(f.at[0],y-.25,f.at[2],f.temperatureK||3300,.55,2.3); break;
        case 'PF-CHAIR': case 'PF-LECTURE-SEAT': renderChair(f,w,h,d); break;
        case 'PF-STOOL':
          cyl(f.at[0],y+h*.64,f.at[2],w*.42,.08,C0(f.material),opts(f.material,{tag:f.id}));
          cyl(f.at[0],y+h*.30,f.at[2],.035,h*.58,C0('M-STEEL-DARK'),opts('M-STEEL-DARK',{tag:f.id})); break;
        case 'PF-WAIT-CHAIRS':
          for(let i=-1;i<=1;i++){const q={...f,id:`${f.id}/${i}`,at:[...f.at]};[q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],i*w/3,0,f.yaw||0);renderChair(q,w/3*.82,h,d*.85);}
          localBox(f,0,y+.34,0,w,.07,.08,'M-STEEL-DARK'); break;
        case 'PF-CANTEEN-TABLE': renderTable(f,w,h,d,f.material,4); break;
        case 'PF-READING-TABLE':
          renderTable(f,w,h,d,f.material,4); localBox(f,0,y+h+.22,0,.38,.20,.24,'M-BOARD-GREEN',{glow:.08}); break;
        case 'PF-STUDENT-DESK-2':
          renderTable(f,w,h,d,f.material);
          for(const dx of [-w*.25,w*.25]){const q={...f,id:`${f.id}/STOOL/${dx}`,at:[...f.at]};[q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],dx,-d*.72,f.yaw||0);renderChair(q,.34,.48,.34,'M-WOOD-DESK');} break;
        case 'PF-MEETING-TABLE': case 'PF-ART-TABLE': case 'PF-PREP-TABLE': renderTable(f,w,h,d); break;
        case 'PF-COMPUTER-DESK': case 'PF-LANGUAGE-DESK': case 'PF-OFFICE-DESK': case 'PF-DORM-DESK': renderWorkstation(f,w,h,d); break;
        case 'PF-LAB-BENCH': case 'PF-MICROSCOPE': case 'PF-ROBOTICS': renderWorkstation(f,w,h,d,true); break;
        case 'PF-BOOKCASE': case 'PF-BOOKSTACK': renderShelf(f,w,h,d,true); break;
        case 'PF-SHELF': renderShelf(f,w,h,d,false); break;
        case 'PF-BED':
          localBox(f,0,y+.22,0,w,.24,d,'M-OAK-DARK'); localBox(f,0,y+.43,0,w*.94,.26,d*.94,'M-WALL-WHITE');
          localBox(f,0,y+.59,d*.34,w*.55,.12,d*.22,'M-FABRIC-BLUE'); localBox(f,0,y+.59,-d*.16,w*.90,.07,d*.46,f.material); break;
        case 'PF-PLANT':
          cyl(f.at[0],y+.22,f.at[2],w*.32,.44,C0('M-OAK'),opts('M-OAK',{tag:f.id}));
          for(const [dx,dz,hh] of [[0,0,.78],[-.16,.04,.56],[.15,-.05,.61]]){const [px,pz]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);capsule(px,y+.46+hh/2,pz,.12,hh,.12,C0('M-PLANT'),opts('M-PLANT',{tag:f.id}));} break;
        case 'PF-STAIR':
          for(let i=0;i<10;i++)localBox(f,0,y+(i+1)*Math.min(H,h)/20,-d*.42+i*d*.084,w,.15+i*.0,d*.09,'M-TERRAZZO');
          localBox(f,-w*.48,y+1.0,0,.05,1.8,d,'M-STEEL-DARK'); break;
        case 'PF-LIFT':
          // An open, enterable lift cabin: back and side panels instead of one solid cuboid.
          // Vertical travel remains an interaction, but the landing and car floor are walkable.
          localBox(f,0,y+h/2,d*.48,w,h,.06,'M-STEEL-DARK');
          localBox(f,-w*.48,y+h/2,0,.06,h,d,'M-STEEL-DARK');
          localBox(f,w*.48,y+h/2,0,.06,h,d,'M-STEEL-DARK');
          localBox(f,0,y+h*.90,-d*.48,w,.20,.07,'M-STAINLESS');
          localBox(f,-w*.33,y+h*.48,-d*.49,w*.27,h*.78,.035,'M-STAINLESS');
          localBox(f,w*.33,y+h*.48,-d*.49,w*.27,h*.78,.035,'M-STAINLESS');
          localBox(f,w*.46,y+h*.55,-d*.53,.12,.42,.04,'M-SCREEN',{glow:.15}); break;
        case 'PF-TOILET':
          localBox(f,0,y+.27,0,w,.40,d,'M-CERAMIC'); localBox(f,0,y+.58,d*.28,w*.72,.40,d*.30,'M-CERAMIC'); break;
        case 'PF-BASIN': case 'PF-HANDWASH': case 'PF-LAB-SINK':
          localBox(f,0,y+h*.56,0,w,h*.35,d,'M-CERAMIC'); localBox(f,0,y+h*.78,d*.28,.06,h*.34,.06,'M-STAINLESS'); break;
        case 'PF-SHOWER':
          localBox(f,0,y+.035,0,w,.07,d,'M-TILE-DARK'); localBox(f,w*.47,y+h/2,0,.05,h,d,'M-GLASS',{alpha:.38});
          localBox(f,0,y+h*.82,d*.44,.05,.05,.05,'M-STAINLESS'); break;
        case 'PF-CHALKBOARD': case 'PF-WHITEBOARD': case 'PF-SCREEN': case 'PF-DANCE-MIRROR':
          localBox(f,0,y,0,w,h,d,f.material,{alpha:f.prefab==='PF-DANCE-MIRROR'?.52:undefined,glow:f.prefab==='PF-SCREEN'?.09:undefined}); break;
        case 'PF-ROOM-SIGN': case 'PF-EXIT-SIGN': case 'PF-DIRECTORY':
          localBox(f,0,p.anchor==='floor'?y+h/2:y,0,w,h,d,f.material,{glow:f.prefab==='PF-EXIT-SIGN'?.15:undefined});
          if(f.text)glyphs(f.at[0],p.anchor==='floor'?y+h*.62:y,f.at[2],(f.yaw||0)+Math.PI,f.text,
            {size:Math.min(.11,w/Math.max(4,[...f.text].length)),gap:.018,color:C0('M-WALL-WHITE'),mode:1,tag:f.id}); break;
        case 'PF-CLOCK':
          cyl(f.at[0],y,f.at[2],w/2,d,C0('M-WALL-WHITE'),opts('M-WALL-WHITE',{tag:f.id,rx:Math.PI/2,ry:f.yaw||0})); break;
        case 'PF-EYEWASH':
          cyl(f.at[0],y+h/2,f.at[2],.045,h,C0('M-SAFETY-YELLOW'),opts('M-SAFETY-YELLOW',{tag:f.id}));
          localBox(f,0,y+h*.92,0,w,.08,d,f.material); break;
        case 'PF-CCTV-DESK':
          renderTable(f,w,h,d,'M-OAK-DARK'); for(const dx of [-.65,-.22,.22,.65])localBox(f,dx,y+h+.27,.05,.36,.30,.05,'M-SCREEN',{glow:.12}); break;
        case 'PF-DOOR-SINGLE': case 'PF-DOOR-DOUBLE':
          localBox(f,0,y+h/2,0,w,h,d,f.material,{alpha:f.prefab==='PF-DOOR-DOUBLE'?.48:undefined}); break;
        default: {
          const anchor=p.anchor||'floor',cy=anchor==='floor'||anchor==='threshold'?y+h/2:y;
          localBox(f,0,cy,0,w,h,d,f.material,{alpha:f.material==='M-GLASS'?.42:undefined});
          if(/COUNTER|DESK|RANGE|SINK/.test(f.prefab)) localBox(f,0,y+h+.025,0,w*.94,.05,d*.94,'M-STAINLESS');
          break;
        }
      }
    }
    for(const f of allObjects(floor)) renderFixture(f);

    const clearAt=(x,z,margin=.34)=>!B.solids.some(s=>!s.open&&x>s.x0-margin&&x<s.x1+margin&&z>s.z0-margin&&z<s.z1+margin);

    // Main building door(s).  Ground-floor public portals retain their distinct campus return
    // points; B07 consequently has separate student-centre and clinic doors in one shared scene.
    const portals=building.portals.filter(p=>p.localSpawn&&floor.level===1);
    for(const p of portals){
      const [spawnX,,spawnZ]=p.localSpawn;
      const nearest=[
        {d:Math.abs(spawnX-x0),x:x0+.07,z:spawnZ,yaw:Math.PI/2},
        {d:Math.abs(spawnX-x1),x:x1-.07,z:spawnZ,yaw:Math.PI/2},
        {d:Math.abs(spawnZ-z0),x:spawnX,z:z0+.07,yaw:0},
        {d:Math.abs(spawnZ-z1),x:spawnX,z:z1-.07,yaw:0},
      ].sort((a,b)=>a.d-b.d)[0];
      prop(`${p.id}/DOOR`,nearest.x,1.08,nearest.z,1.35,2.16,.08,'M-GLASS',{ry:nearest.yaw,alpha:.42});
      const approach=publicArrival(p);
      const t=thing('门',nearest.x,1.15,nearest.z,'从这里回到校园。','This door returns to the campus.','门 is a door; 出门 is to step outside.',
        {focus:[approach.x,approach.z],reach:1.8});
      t.exit={place:'campus',at:{x:p.campusReturn[0],z:p.campusReturn[1],yaw:p.campusReturn[2]}};
    }

    const nav=allObjects(floor).find(o=>o.prefab==='PF-LIFT')||allObjects(floor).find(o=>o.prefab==='PF-STAIR');
    const navAt=nav?[nav.at[0],nav.at[2]]:[CX,CZ];
    // Find a real body-clear landing in this already-built scene.  An authored lift anchor is the
    // centre of the car and therefore cannot itself be a spawn; circulation rectangles supply the
    // preferred candidates, with a deterministic plate grid as a safety net.
    const arrivalHere=()=>{
      const candidates=[];
      const routes=[...(floor.circulation||[])].sort((a,b)=>(b.clearWidth||0)-(a.clearWidth||0));
      for(const route of routes){
        const [a,b,c,d]=route.bounds;
        const yaw=(b-a)>=(d-c)?Math.PI/2:0;
        for(const [tx,tz] of [[.5,.5],[.25,.5],[.75,.5],[.5,.25],[.5,.75],[.25,.25],[.75,.75]])
          candidates.push([a+(b-a)*tx,c+(d-c)*tz,yaw]);
      }
      const grid=[];
      for(let z=z0+.55;z<=z1-.55;z+=.55)for(let x=x0+.55;x<=x1-.55;x+=.55)grid.push([x,z,Math.PI/2]);
      grid.sort((a,b)=>Math.hypot(a[0]-navAt[0],a[1]-navAt[1])-Math.hypot(b[0]-navAt[0],b[1]-navAt[1]));
      candidates.push(...grid);
      const good=candidates.filter(([x,z])=>clearAt(x,z));
      const at=good[0]||[CX,CZ,0]; return {x:at[0],z:at[1],yaw:at[2]};
    };
    const navApproach=()=>{
      const candidates=[];
      for(const route of floor.circulation||[]){
        const [a,b,c,d]=route.bounds,pad=Math.min(.42,(b-a)/2,(d-c)/2);
        const px=clamp(navAt[0],a+pad,b-pad),pz=clamp(navAt[1],c+pad,d-pad);
        candidates.push([px,pz],[(a+b)/2,(c+d)/2],[px,(c+d)/2],[(a+b)/2,pz]);
      }
      candidates.sort((u,v)=>Math.hypot(u[0]-navAt[0],u[1]-navAt[1])-Math.hypot(v[0]-navAt[0],v[1]-navAt[1]));
      const at=candidates.find(([x,z])=>clearAt(x,z))||Object.values(arrivalHere());
      return{x:at[0],z:at[1]};
    };
    const navLanding=navApproach();
    if(floor.level<building.floors){
      const t=thing('上楼',navAt[0]-.45,1.15,navAt[1],'上楼去下一层。','Go up to the next floor.','上 up + 楼 floor.',
        {focus:[navLanding.x,navLanding.z],reach:1.8});
      // Omit `at`: the destination floor computes its own collision-checked landing when built.
      t.exit={place:placeKey(building.id,floor.level+1)};
    }
    if(floor.level>1){
      const t=thing('下楼',navAt[0]+.45,1.15,navAt[1],'下楼去前一层。','Go down to the previous floor.','下 down + 楼 floor.',
        {focus:[navLanding.x,navLanding.z],reach:1.8});
      t.exit={place:placeKey(building.id,floor.level-1)};
    }

    // Preserve the two original showcase rooms as optional rooms reached from their blueprint
    // locations.  Their old place keys and save compatibility remain intact.
    if(building.id==='B01'&&floor.level===2){
      const t=thing('教室',-4.25,1.25,3.45,'这间小班教室保留了原来的细节。','This small seminar keeps the original detailed room.','教室 is a classroom.',{focus:[-4.25,4.2],reach:1.8});
      t.exit={place:'classroom',at:{x:2.9,z:2.9,yaw:Math.PI*1.02}};
    }
    if(building.id==='B02'&&floor.level===2){
      const t=thing('图书馆',2.8,1.25,1.1,'北阅览室保留了原来的细节。','The north reading room keeps the original detailed scene.','阅览室 is a reading room.',{focus:[2.8,.2],reach:1.8});
      t.exit={place:'library',at:{x:1.4,z:-3.3,yaw:.02*Math.PI}};
    }
    if(building.id==='B03'){
      const t=thing('食堂',.55,1.05,5.6,'在窗口买一份食堂饭。','Buy a canteen meal at the serving window.','食堂 is a canteen.',{focus:[1.5,5.6],reach:2.0});
      t.campusInterior=true;
    }
    if(building.id==='B07'&&floor.level===1){
      thing('活动中心',-3.6,1.0,-2.5,'这里可以报名参加社团活动。','You can register for a club activity here.','活动 is an activity.',{focus:[-4.2,-1.5],reach:2.0});
      thing('校医院',-3.2,1.0,1.2,'先在这里挂号。','Register here before seeing the campus doctor.','校医院 is the campus clinic.',{focus:[-4.3,1.2],reach:2.0});
    }

    // Spawn at the public entrance on level one; upper levels arrive beside their lift/stair.
    const publicPortal=portals.find(p=>p.id===entryPortalId)||portals[0];
    function publicArrival(p) {
      const [sx,,sz,yaw]=p.localSpawn;
      // The blueprint point is the vestibule threshold.  A third-person camera needs another
      // pace behind it, so arrive farther along the same accessible line when that point is clear.
      for(const distance of [3.6,3.2,2.8,2.4,2.0,1.6,1.2,.8,.4,0]){
        for(const side of [0,.8,-.8,1.2,-1.2]){
          const x=sx+Math.sin(yaw)*distance+Math.cos(yaw)*side;
          const z=sz+Math.cos(yaw)*distance-Math.sin(yaw)*side;
          if(x>x0+.45&&x<x1-.45&&z>z0+.45&&z<z1-.45&&clearAt(x,z))return{x,z,yaw};
        }
      }
      return{x:sx,z:sz,yaw};
    }
    const spawn=publicPortal?publicArrival(publicPortal):arrivalHere();
    const zones=floor.rooms.map(r=>({id:r.id,label:r.label,x0:r.bounds[0],x1:r.bounds[1],z0:r.bounds[2],z1:r.bounds[3],
      light:[(r.bounds[0]+r.bounds[1])/2,H-.35,(r.bounds[2]+r.bounds[3])/2]}));
    zones.push(...(floor.circulation||[]).map(r=>({id:r.id,label:'走廊',x0:r.bounds[0],x1:r.bounds[1],z0:r.bounds[2],z1:r.bounds[3],
      light:[(r.bounds[0]+r.bounds[1])/2,H-.35,(r.bounds[2]+r.bounds[3])/2]})));
    const setNight = night => {
      for(const p of lit)p.glow=night?.30:.14;
      for(const l of lights)l.on=true;
    };
    return B.finish({
      RX,RZ,H,OUT:publicPortal?{x:publicPortal.campusReturn[0],z:publicPortal.campusReturn[1],yaw:publicPortal.campusReturn[2]}:null,
      setNight,tick(){},label:`${building.label} · ${floor.level}层`,labelK:`${building.id} · floor ${floor.level}`,
      indoor:true,cutaway:true,near:.05,far:Math.max(42,Math.hypot(x1-x0,z1-z0)*2.1),expose:1,
      spawn,zones,level:()=>floor.level,buildingId:building.id,blueprintFloor:floor,
      roomAt(x,z){return zones.find(q=>x>=q.x0&&x<=q.x1&&z>=q.z0&&z<=q.z1)||zones[0];},
    });
  }

  for(const building of plan.buildings) for(const floor of building.floorsPlan){
    const key=placeKey(building.id,floor.level);
    places[key]=Lazy(`CampusInterior${building.id}F${floor.level}`,()=>buildFloor(building,floor));
    if(building.id==='B07') places[`campus_clinic_f${floor.level}`]=places[key];
  }

  return Object.freeze({plan,counts,places,placeKey,buildFloor,validate,
    building:id=>buildings.get(id),floor:(id,level)=>buildings.get(id)?.floorsPlan.find(f=>f.level===level)});
})();
