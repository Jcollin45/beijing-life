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
    const accent=({B01:'M-FABRIC-RED',B02:'M-FABRIC-BLUE',B03:'M-BRICK',B04:'M-FABRIC-BLUE',
      B05:'M-OAK-DARK',B06:'M-LAB-BLUE',B07:'M-WALL-GREEN',B08:'M-BRASS'})[building.id]||'M-OAK';
    const lit=[],lights=[];
    let liveLights=0;
    const opts = (materialId, extra={}) => {
      // Rounded furniture must use Build's soft-box mesh; `hard:true` forces the old sharp cube
      // and silently ignores the radius. Architectural pieces without a radius stay crisp.
      const m=mat(materialId),o={hard:extra.round===undefined,gloss:m.gloss===undefined?.12:m.gloss,...extra};
      if (m.texture && m.texture !== 'none' && m.texture !== 'glass') {
        o.mat=m.texture === 'terrazzo' ? 'tile' : m.texture === 'steel' ? 'metal' : m.texture;
        o.matScale=m.texture === 'wood' ? .62 : m.texture === 'brick' ? .9 : .38;
        o.matAmt=m.texture === 'wood' ? .42 : .30;
      }
      if (o.mode === undefined && m.renderMode !== undefined) o.mode=m.renderMode;
      return o;
    };
    const prop = (tag,x,y,z,w,h,d,materialId,o={}) => box(x,y,z,w,h,d,C0(materialId),
      opts(materialId,{tag,...o,ry:o.ry||0}));
    const localBox = (f,dx,y,dz,w,h,d,materialId,o={}) => {
      const [x,z]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
      return prop(f.id,x,y,z,w,h,d,materialId||f.material,{...o,ry:(f.yaw||0)+(o.ry||0)});
    };
    const localBall = (f,dx,y,dz,rx,ry,rz,materialId,o={}) => {
      const [x,z]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
      return ball(x,y,z,rx,ry,rz,C0(materialId||f.material),
        opts(materialId||f.material,{tag:f.id,...o,ry:(f.yaw||0)+(o.ry||0)}));
    };
    const localCyl = (f,dx,y,dz,r,h,materialId,o={}) => {
      const [x,z]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
      return cyl(x,y,z,r,h,C0(materialId||f.material),
        opts(materialId||f.material,{tag:f.id,...o,ry:(f.yaw||0)+(o.ry||0)}));
    };
    const bodySolid = (f,w,d) => {
      const q=((Math.round((f.yaw||0)/(Math.PI/2))%2)+2)%2;
      const sw=q?d:w,sd=q?w:d,x=f.at[0],z=f.at[2];
      // Keep the collision body just inside the visible footprint.  This is the same small
      // tolerance used by hand-built rooms: it prevents a visually clear 0.90–1.20 m doorway
      // from becoming impassable when the player's radius is added to both the wall and a desk.
      const body={x0:x-sw*.40,x1:x+sw*.40,z0:z-sd*.40,z1:z+sd*.40};
      // Never hide a bad layout by silently dropping its collider. Door and route envelopes are
      // enforced by the blueprint spacing gate, and the runtime flood-fill verifies the result.
      const s=solid(body.x0,body.x1,body.z0,body.z1);
      s.fixtureId=f.id;
    };
    const realLight = (x,y,z,temp=3800,power=.72,radius=3.0) => {
      // Keep every authored room luminaire available. The main renderer already ranks all scene
      // lights by player distance and submits only the nearest eight to the shader, so truncating
      // this list during construction made late-authored rooms dark without saving GPU work.
      if (liveLights++ >= 48) return;
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
    // A continuous skirting, ceiling reveal and low exterior-wall datum give every floor a
    // finished architectural shell rather than four unarticulated boxes.  The accent follows the
    // building identity but stays shallow and non-colliding.
    for(const [tag,x,z,w,d] of [[`${building.id}/SHELL/S`,CX,z0+.03,x1-x0-.2,.07],
      [`${building.id}/SHELL/N`,CX,z1-.03,x1-x0-.2,.07],
      [`${building.id}/SHELL/W`,x0+.03,CZ,.07,z1-z0-.2],
      [`${building.id}/SHELL/E`,x1-.03,CZ,.07,z1-z0-.2]]){
      prop(`${tag}/BASE`,x,.075,z,w,.15,d,accent);
      prop(`${tag}/COVE`,x,H-.09,z,w,.10,d,'M-OAK-DARK');
    }

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
        // Split skirting and a shallow two-step ceiling reveal follow the same authored openings
        // as the wall, so the finish never bridges a door. The layered profile makes the room
        // perimeter read as constructed architecture instead of raw intersecting boxes.
        if(vertical){
          prop(`${room.id}/${side}/SKIRT`,fixed,.065,mid,th+.035,.13,len,finish.trim,{round:.008});
          prop(`${room.id}/${side}/CROWN-A`,fixed,H-.055,mid,th+.050,.11,len,finish.trim,{round:.008});
          prop(`${room.id}/${side}/CROWN-B`,fixed,H-.125,mid,th+.030,.035,len,'M-ACOUSTIC',{round:.006});
        } else {
          prop(`${room.id}/${side}/SKIRT`,mid,.065,fixed,len,.13,th+.035,finish.trim,{round:.008});
          prop(`${room.id}/${side}/CROWN-A`,mid,H-.055,fixed,len,.11,th+.050,finish.trim,{round:.008});
          prop(`${room.id}/${side}/CROWN-B`,mid,H-.125,fixed,len,.035,th+.030,'M-ACOUSTIC',{round:.006});
        }
      }
      // An open leaf and a labelled lintel show where the omitted wall segment is.
      for(const door of (room.doors||[]).filter(q=>q.side===side)){
        const [dx,,dz]=door.at,yaw=vertical?Math.PI/2:0;
        let leafX=dx,leafZ=dz;
        if(vertical){leafZ=dz-door.width/2;leafX=dx+(side==='west'?1:-1)*door.width*.39;}
        else{leafX=dx-door.width/2;leafZ=dz+(side==='south'?1:-1)*door.width*.39;}
        prop(door.id,leafX,1.05,leafZ,door.width*.78,2.10,.07,'M-OAK-DARK',{ry:yaw+Math.PI/2,round:.012,bevel:.006});
        const frameMat=finish.trim||accent,post=.075;
        if(vertical){
          prop(`${door.id}/FRAME-A`,dx,1.08,dz-door.width/2-post/2,.13,2.16,post,frameMat);
          prop(`${door.id}/FRAME-B`,dx,1.08,dz+door.width/2+post/2,.13,2.16,post,frameMat);
          prop(`${door.id}/FRAME-T`,dx,2.13,dz,.13,.10,door.width+post*2,frameMat);
        } else {
          prop(`${door.id}/FRAME-A`,dx-door.width/2-post/2,1.08,dz,post,2.16,.13,frameMat);
          prop(`${door.id}/FRAME-B`,dx+door.width/2+post/2,1.08,dz,post,2.16,.13,frameMat);
          prop(`${door.id}/FRAME-T`,dx,2.13,dz,door.width+post*2,.10,.13,frameMat);
        }
        // Lever and vision strip stay attached to the open leaf, making the swing legible.
        prop(`${door.id}/VISION`,leafX,1.48,leafZ,door.width*.20,.54,.078,'M-GLASS',{ry:yaw+Math.PI/2,alpha:.42});
        const [hx,hz]=rotated(leafX,leafZ,door.width*.27,-.055,yaw+Math.PI/2);
        prop(`${door.id}/HANDLE`,hx,1.00,hz,.20,.035,.035,'M-STAINLESS',{ry:yaw+Math.PI/2});
        const [kx,kz]=rotated(leafX,leafZ,0,-.039,yaw+Math.PI/2);
        prop(`${door.id}/KICK`,kx,.19,kz,door.width*.62,.28,.012,'M-STAINLESS',{ry:yaw+Math.PI/2,round:.006});
        const [cx,cz]=rotated(leafX,leafZ,door.width*.13,-.045,yaw+Math.PI/2);
        prop(`${door.id}/CLOSER`,cx,1.94,cz,door.width*.28,.055,.035,'M-STEEL-DARK',{ry:yaw+Math.PI/2,round:.010});
        prop(`${door.id}/THRESHOLD`,dx,.018,dz,vertical?.16:door.width+.12,.035,vertical?door.width+.12:.16,'M-BRASS',{round:.006});
        const label=room.label.length>12?room.label.slice(0,12):room.label;
        glyphs(dx,2.28,dz,yaw+(side==='south'||side==='west'?0:Math.PI),label,
          {size:.105,gap:.022,color:C0('M-SCREEN'),mode:1,tag:door.id,lift:.014});
      }
    }
    for(const room of floor.rooms) for(const side of ['south','north','west','east']) partitionRun(room,side);

    function renderChair(f,w=.46,h=.84,d=.48,material=f.material) {
      const ground=f.at[1]-base;
      // A visible under-frame, separate crowned cushion and inset back pad keep the chair from
      // reading as two perpendicular slabs.  Every part remains inside the declared footprint.
      localBox(f,0,ground+.37,0,w*.88,.12,d*.76,'M-STEEL-DARK',{round:.018,bevel:.012});
      // Blueprint yaw zero means the sitter faces local +z.  Keep the back at -z so authored
      // chair directions, workstation screens and room sightlines all share that convention.
      localBox(f,0,ground+.47,d*.03,w,.16,d*.84,material,{mode:7,round:.065,gloss:.045});
      localBox(f,0,ground+.70,-d*.38,w*.94,.48,.075,'M-STEEL-DARK',{round:.026});
      localBox(f,0,ground+.70,-d*.345,w*.82,.34,.09,material,{mode:7,round:.055,gloss:.045});
      localBox(f,0,ground+.49,d*.405,w*.82,.025,.025,material,{mode:7,round:.012});
      for(const dx of [-w*.38,w*.38])for(const dz of [-d*.32,d*.32])
        localBox(f,dx,ground+.20,dz,.042,.40,.042,'M-STEEL-DARK',{round:.010,bevel:.008});
    }
    function renderTable(f,w,h,d,material=f.material) {
      const y=f.at[1]-base;
      localBox(f,0,y+h-.055,0,w,.11,d,material,{round:Math.min(.07,d*.10),bevel:.018});
      localBox(f,0,y+h-.15,0,w*.88,.15,d*.74,material,{round:.028,bevel:.014});
      for(const dx of [-w*.42,w*.42])for(const dz of [-d*.36,d*.36])
        localBox(f,dx,y+(h-.14)/2,dz,.052,h-.14,.052,'M-STEEL-DARK',{round:.012});
      localBox(f,0,y+.055,0,w*.78,.055,d*.70,'M-STEEL-DARK',{round:.018});
    }
    function renderSideTable(f,w,h,d) {
      const y=f.at[1]-base;
      renderTable(f,w,h,d,f.material);
      localBox(f,0,y+h*.58,0,w*.72,h*.34,d*.70,'M-OAK-DARK',{round:.025,bevel:.012});
      localBox(f,0,y+h*.62,-d*.37,w*.58,h*.18,.035,f.material,{round:.018,bevel:.008});
      localBox(f,w*.23,y+h*.62,-d*.40,.035,.035,.025,'M-BRASS',{round:.010});
      // A small reading lamp and book make the table feel occupied while staying inside its
      // measured footprint; these are decorative parts of the composed prefab, not new bodies.
      localCyl(f,-w*.20,y+h+.10,d*.06,.025,.20,'M-BRASS',{gloss:.40});
      localBall(f,-w*.20,y+h+.23,d*.06,w*.13,.09,d*.13,'M-WALL-WARM',{mode:7,glow:.08});
      localBox(f,w*.14,y+h+.025,-d*.08,w*.30,.035,d*.34,'M-FABRIC-RED',{round:.008,ry:.05});
    }
    function renderCompositeTable(f,w,h,d,reading=false) {
      const top={...f,at:[...f.at]},topW=w*(reading?.72:.70),topD=d*(reading?.46:.50);
      renderTable(top,topW,h,topD,f.material);
      const chairW=Math.min(.42,w*.24),chairD=Math.min(.42,d*.31),x=w*.27,z=d*.30;
      for(const [dx,dz,yaw] of [[-x,-z,0],[x,-z,0],[-x,z,Math.PI],[x,z,Math.PI]]){
        const q={...f,id:`${f.id}/CHAIR/${dx}/${dz}`,at:[...f.at],yaw:(f.yaw||0)+yaw};
        [q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
        renderChair(q,chairW,reading?.82:.76,chairD,reading?'M-FABRIC-BLUE':'M-WALL-GREEN');
      }
      const y=f.at[1]-base;
      if(reading){
        localBox(f,-topW*.25,y+h+.025,-topD*.08,topW*.24,.035,topD*.42,'M-WALL-WHITE',{round:.012});
        localBox(f,topW*.20,y+h+.025,topD*.05,topW*.20,.028,topD*.34,'M-FABRIC-RED',{round:.010});
        localBox(f,0,y+h+.20,0,.30,.18,.20,'M-BOARD-GREEN',{mode:7,round:.055,glow:.06});
      }
    }
    function renderShelf(f,w,h,d,books=false) {
      const y=f.at[1]-base;
      localBox(f,-w*.47,y+h/2,0,.07,h,d,f.material,{bevel:.012});
      localBox(f,w*.47,y+h/2,0,.07,h,d,f.material,{bevel:.012});
      localBox(f,0,y+h/2,d*.44,w,.08,.07,f.material,{bevel:.010});
      localBox(f,0,y+h-.045,0,w,.09,d,f.material,{bevel:.014});
      for(let i=0;i<5;i++)localBox(f,0,y+.075+i*(h-.13)/4,0,w,.065,d,f.material,{bevel:.010});
      if(books)for(let r=0;r<4;r++)for(let i=0;i<5;i++){
        const palette=['M-FABRIC-RED','M-FABRIC-BLUE','M-OAK','M-SAFETY-YELLOW'];
        const bh=.20+((r+i)%3)*.035;
        localBox(f,-w*.34+i*w*.17,y+.14+bh/2+r*(h-.13)/4,-d*.06,.10,bh,.68*d,
          palette[(r+i)%palette.length],{round:.006,ry:((r+i)%2?-.025:.018)});
      }
    }
    function renderWorkstation(f,w,h,d,lab=false) {
      const y=f.at[1]-base;
      if(!lab){
        const desk={...f,at:[...f.at]};
        [desk.at[0],desk.at[2]]=rotated(f.at[0],f.at[2],0,d*.14,f.yaw||0);
        renderTable(desk,w,h,d*.58,f.material);
        localBox(f,0,y+h+.27,d*.23,Math.min(.50,w*.45),.34,.055,'M-STEEL-DARK',{round:.025,gloss:.22});
        localBox(f,0,y+h+.27,d*.198,Math.min(.43,w*.39),.27,.025,'M-SCREEN',{round:.012,glow:.10});
        localBox(f,0,y+h+.09,d*.02,Math.min(.48,w*.48),.025,d*.20,'M-WALL-WHITE',{round:.012});
        localBox(f,w*.30,y+h+.075,d*.02,.08,.035,.12,'M-STEEL-DARK',{round:.020});
        const chair={...f,id:`${f.id}/TASK-CHAIR`,at:[...f.at]};
        [chair.at[0],chair.at[2]]=rotated(f.at[0],f.at[2],0,-d*.24,f.yaw||0);
        renderChair(chair,Math.min(.42,w*.42),.82,Math.min(.36,d*.52),'M-FABRIC-BLUE');
        if(f.prefab==='PF-LANGUAGE-DESK'){
          localBox(f,-w*.46,y+h+.25,d*.10,.035,.48,d*.46,'M-ACOUSTIC',{round:.012});
          localBox(f,w*.46,y+h+.25,d*.10,.035,.48,d*.46,'M-ACOUSTIC',{round:.012});
          localBall(f,-w*.22,y+h+.12,-d*.04,.12,.10,.035,'M-STEEL-DARK',{gloss:.20});
          localBox(f,-w*.31,y+h+.11,-d*.04,.028,.18,.028,'M-STEEL-DARK',{round:.010,rz:-.45});
        } else if(f.prefab==='PF-OFFICE-DESK'){
          localBox(f,-w*.31,y+h+.055,-d*.06,w*.18,.07,d*.20,'M-STEEL-DARK',{round:.025});
          localBox(f,-w*.31,y+h+.12,-d*.06,w*.14,.035,d*.15,'M-SCREEN',{round:.015,glow:.07});
          localCyl(f,w*.32,y+h+.11,-d*.03,.022,.20,'M-BRASS',{gloss:.36});
          localBall(f,w*.32,y+h+.25,-d*.03,w*.09,.07,d*.12,'M-WALL-WARM',{mode:7,glow:.08});
        } else if(f.prefab==='PF-DORM-DESK'){
          localCyl(f,w*.31,y+h+.10,-d*.02,.020,.18,'M-BRASS',{gloss:.34});
          localBall(f,w*.31,y+h+.22,-d*.02,w*.09,.065,d*.11,'M-WALL-WARM',{mode:7,glow:.08});
          localBox(f,-w*.28,y+h+.025,-d*.08,w*.25,.035,d*.28,'M-FABRIC-BLUE',{round:.008,ry:-.04});
          localBox(f,-w*.24,y+h+.050,-d*.06,w*.22,.025,d*.24,'M-FABRIC-RED',{round:.007,ry:.035});
        } else {
          localBox(f,w*.34,y+.25,d*.19,w*.17,.46,d*.27,'M-STEEL-DARK',{round:.022});
          localBox(f,w*.34,y+.32,d*.045,w*.11,.08,.025,'M-SCREEN',{round:.010,glow:.06});
        }
      } else {
        renderTable(f,w,h,d,f.material);
        localBox(f,0,y+.38,d*.43,w*.92,.64,.06,'M-LAB-BLUE',{bevel:.012});
        localBox(f,0,y+h+.12,d*.34,w*.88,.16,.065,'M-STEEL-DARK',{round:.018});
        localBox(f,-w*.30,y+h+.19,d*.15,.10,.22,.10,'M-SAFETY-YELLOW',{round:.024});
        localBox(f,w*.30,y+h+.10,d*.12,.16,.055,.22,'M-WALL-WHITE',{round:.014});
        if(f.prefab==='PF-MICROSCOPE'){
          localBox(f,0,y+h+.28,-d*.04,.12,.42,.12,'M-STEEL-DARK',{round:.030,ry:.15});
          localBall(f,.05,y+h+.46,-d*.10,.11,.08,.11,'M-WALL-WHITE',{gloss:.20});
          localBox(f,-.11,y+h+.08,-d*.04,.25,.05,.24,'M-STEEL-DARK',{round:.030});
        } else if(f.prefab==='PF-ROBOTICS'){
          localBox(f,0,y+h+.42,d*.38,w*.78,.52,.045,'M-STEEL-DARK',{round:.018});
          for(const dx of [-w*.22,0,w*.22])localBox(f,dx,y+h+.42,d*.345,.08,.08,.025,'M-SAFETY-YELLOW',{round:.018,glow:.06});
          localBox(f,0,y+h+.16,-d*.06,.34,.22,.28,'M-LAB-BLUE',{round:.035});
        }
      }
    }

    function renderBench(f,w,h,d,material=f.material) {
      const y=f.at[1]-base;
      localBox(f,0,y+h*.35,0,w*.94,.10,d*.72,'M-STEEL-DARK',{round:.020});
      const sections=Math.max(2,Math.round(w/.72)),sw=w/sections;
      for(let i=0;i<sections;i++){
        const dx=-w/2+(i+.5)*sw;
        localBox(f,dx,y+h*.49,d*.04,sw-.035,.18,d*.80,material,{mode:7,round:.065,gloss:.045});
        localBox(f,dx,y+h*.74,-d*.35,sw-.035,h*.40,.10,material,{mode:7,round:.050,gloss:.045});
      }
      localBox(f,0,y+h*.72,-d*.39,w*.96,h*.46,.055,'M-STEEL-DARK',{round:.018});
      for(const dx of [-w*.40,w*.40]){
        localBox(f,dx,y+h*.20,-d*.20,.055,h*.40,.055,'M-STEEL-DARK',{round:.012});
        localBox(f,dx,y+h*.20,d*.20,.055,h*.40,.055,'M-STEEL-DARK',{round:.012});
      }
      for(const dx of [-w*.47,w*.47]){
        localBox(f,dx,y+h*.52,-d*.03,w*.055,h*.28,d*.72,'M-STEEL-DARK',{round:.025});
        localBox(f,dx,y+h*.62,-d*.04,w*.085,h*.14,d*.68,material,{mode:7,round:.040,gloss:.04});
      }
    }

    function renderCabinet(f,w,h,d,cols=2,rows=1,material=f.material) {
      const y=f.at[1]-base,panelW=w/cols,panelH=(h-.16)/rows;
      localBox(f,-w*.475,y+h/2,0,w*.05,h,d,material,{bevel:.010});
      localBox(f,w*.475,y+h/2,0,w*.05,h,d,material,{bevel:.010});
      localBox(f,0,y+h-.035,0,w,.07,d,material,{bevel:.012});
      localBox(f,0,y+h/2,d*.47,w*.95,h*.93,.055,'M-STEEL-DARK',{bevel:.006});
      localBox(f,0,y+.075,0,w*.92,.15,d*.92,'M-STEEL-DARK',{round:.014});
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const px=-w/2+panelW*(col+.5),py=y+.10+panelH*(row+.5);
        localBox(f,px,py,-d*.49,panelW-.045,panelH-.045,.035,material==='M-CLINIC'?'M-WALL-WHITE':material,{round:.012,bevel:.008});
        localBox(f,px+panelW*.31,py,-d*.525,.025,Math.min(.22,panelH*.28),.025,'M-STAINLESS',{round:.008});
        if(rows>1)localBox(f,px-panelW*.23,py,-d*.528,panelW*.25,.045,.018,'M-WALL-WHITE',{round:.006});
      }
    }

    function renderCounter(f,w,h,d,clinical=false) {
      const y=f.at[1]-base,body=clinical?'M-CLINIC':f.material;
      localBox(f,-w*.18,y+h*.40,0,w*.60,h*.72,d*.84,body,{round:.025,bevel:.014});
      localBox(f,w*.40,y+h*.32,0,w*.16,h*.58,d*.84,body,{round:.020,bevel:.012});
      localBox(f,0,y+.055,0,w*.94,.11,d*.92,'M-STEEL-DARK',{round:.018});
      localBox(f,0,y+h-.045,0,w,.09,d,f.material,{round:.045,bevel:.018});
      localBox(f,-w*.18,y+h*.46,-d*.445,w*.57,h*.43,.035,clinical?'M-WALL-GREEN':accent,{round:.018});
      for(const dx of [-w*.36,-w*.18,0])localBox(f,dx,y+h*.43,-d*.472,.025,h*.32,.018,'M-BRASS',{round:.008});
      localBox(f,w*.25,y+h+.17,.02,.42,.28,.055,'M-SCREEN',{round:.026,glow:.13});
      localBox(f,-w*.30,y+h+.045,-d*.10,.38,.025,.24,'M-WALL-WHITE');
      if(/SERVICE|PHARMACY|CIRC/.test(f.prefab))
        localBox(f,w*.43,y+h+.38,0,.035,.68,d*.72,'M-GLASS',{alpha:.34});
    }

    function renderKiosk(f,w,h,d) {
      const y=f.at[1]-base;
      localBox(f,0,y+.045,0,w*.92,.09,d*.92,'M-STEEL-DARK',{round:.035});
      localBox(f,0,y+h*.32,0,w*.70,h*.60,d*.68,'M-STEEL-DARK',{round:.035});
      localBox(f,0,y+h*.70,d*.04,w,h*.56,d*.50,f.material,{round:.055,bevel:.018});
      localBox(f,0,y+h*.78,-d*.225,w*.76,h*.34,.035,'M-SCREEN',{round:.025,glow:.18});
      localBox(f,0,y+h*.46,-d*.345,w*.58,.035,d*.24,'M-WALL-WHITE',{round:.015});
      localBox(f,w*.27,y+h*.52,-d*.36,.08,.025,.08,'M-SAFETY-YELLOW',{round:.020,glow:.12});
    }

    function renderAppliance(f,w,h,d,medical=false) {
      const y=f.at[1]-base,body=medical?'M-CLINIC':f.material;
      localBox(f,0,y+h/2,0,w,h,d,body);
      localBox(f,0,y+h*.52,-d*.505,w*.90,h*.86,.025,medical?'M-WALL-WHITE':'M-STAINLESS');
      localBox(f,w*.34,y+h*.53,-d*.535,.035,h*.45,.03,'M-STEEL-DARK');
      localBox(f,0,y+h*.88,-d*.54,w*.70,.13,.025,'M-SCREEN',{glow:.08});
      localBox(f,0,y+.045,0,w*1.02,.09,d*1.02,'M-STEEL-DARK');
    }

    function renderWaterStation(f,w,h,d) {
      const y=f.at[1]-base;
      localBox(f,0,y+h*.40,0,w,h*.70,d,'M-WALL-WHITE');
      cyl(f.at[0],y+h*.88,f.at[2],w*.30,h*.30,C0('M-GLASS'),opts('M-GLASS',{tag:f.id,alpha:.42}));
      localBox(f,0,y+h*.56,-d*.51,w*.58,h*.18,.03,'M-STEEL-DARK');
      localBox(f,-w*.16,y+h*.50,-d*.54,.07,.07,.04,'M-SCREEN',{glow:.10});
      localBox(f,w*.16,y+h*.50,-d*.54,.07,.07,.04,'M-SAFETY-RED',{glow:.08});
    }

    function renderWallRun(f,w,h,d) {
      const y=f.at[1]-base,isGlass=f.material==='M-GLASS';
      const floorLayer=h<=.08&&y<.20,ceilingLayer=h<=.10&&y>H-.62;
      const faceAlongX=d<=w,span=faceAlongX?w:d,thin=faceAlongX?d:w;
      const soft=/curtain|blind/i.test(`${f.label||''} ${f.purpose||''}`);
      const textile=mat(f.material).texture==='fabric';
      const trim=soft||textile?f.material:f.material==='M-RUBBER'?'M-STEEL-DARK':
        f.material==='M-ACOUSTIC'?accent:f.material==='M-GLASS'?'M-STEEL-DARK':'M-OAK-DARK';
      // Every architectural layer is an assembly. Rugs and floor insets receive a recessed
      // border, acoustic rafts gain separated baffles, glazing receives a proper frame and
      // mullion, and wall panels/curtains gain shadow joints or pleats. This removes the last
      // one-cuboid visual fallback without changing any authored footprint or collision.
      if(floorLayer){
        localBox(f,0,y,0,w,h,d,f.material,{round:Math.min(.025,w*.04,d*.04),bevel:.008,gloss:.035});
        const edge=Math.max(.018,Math.min(.045,Math.min(w,d)*.055));
        localBox(f,0,y+h*.54,-d*.47,w*.92,.012,edge,trim,{round:.006,gloss:.05});
        localBox(f,0,y+h*.54,d*.47,w*.92,.012,edge,trim,{round:.006,gloss:.05});
        localBox(f,-w*.47,y+h*.54,0,edge,.012,d*.82,trim,{round:.006,gloss:.05});
        localBox(f,w*.47,y+h*.54,0,edge,.012,d*.82,trim,{round:.006,gloss:.05});
        return;
      }
      if(ceilingLayer){
        localBox(f,0,y,0,w,h,d,f.material,{round:.025,bevel:.010,gloss:.035});
        const n=Math.max(2,Math.min(5,Math.round(span/.62)));
        for(let i=0;i<n;i++){
          const u=-span*.39+i*(span*.78/(n-1));
          if(faceAlongX)localBox(f,u,y-h*.62,0,Math.min(.075,w*.10),h*.45,d*.90,trim,{round:.012});
          else localBox(f,0,y-h*.62,u,w*.90,h*.45,Math.min(.075,d*.10),trim,{round:.012});
        }
        return;
      }
      if(isGlass){
        localBox(f,0,y,0,w,h,d,f.material,{round:.010,alpha:.32,gloss:.72});
        const bar=Math.max(.025,Math.min(.065,span*.035));
        if(faceAlongX){
          for(const dx of [-w*.47,0,w*.47])localBox(f,dx,y,0,bar,h*.98,thin*1.04,trim,{round:.008});
          for(const dy of [-h*.47,h*.47])localBox(f,0,y+dy,0,w*.96,bar,thin*1.04,trim,{round:.008});
        } else {
          for(const dz of [-d*.47,0,d*.47])localBox(f,0,y,dz,thin*1.04,h*.98,bar,trim,{round:.008});
          for(const dy of [-h*.47,h*.47])localBox(f,0,y+dy,0,thin*1.04,bar,d*.96,trim,{round:.008});
        }
        return;
      }
      localBox(f,0,y,0,w,h,d,f.material,{round:Math.min(.018,thin*.22),bevel:.008});
      const n=soft?5:Math.max(2,Math.min(5,Math.round(span/1.0)));
      for(let i=1;i<n;i++){
        const u=-span/2+i*span/n;
        if(faceAlongX)localBox(f,u,y,thin*.38,soft?.035:.022,h*.92,Math.max(.012,thin*.18),trim,{round:.008});
        else localBox(f,thin*.38,y,u,Math.max(.012,thin*.18),h*.92,soft?.035:.022,trim,{round:.008});
      }
      // A fine top and bottom reveal makes even a very narrow datum read as intentionally fixed
      // architecture instead of an isolated floating box.
      if(faceAlongX){
        localBox(f,0,y-h*.47,thin*.30,w*.96,Math.max(.012,h*.025),Math.max(.012,thin*.16),trim,{round:.006});
        localBox(f,0,y+h*.47,thin*.30,w*.96,Math.max(.012,h*.025),Math.max(.012,thin*.16),trim,{round:.006});
      } else {
        localBox(f,thin*.30,y-h*.47,0,Math.max(.012,thin*.16),Math.max(.012,h*.025),d*.96,trim,{round:.006});
        localBox(f,thin*.30,y+h*.47,0,Math.max(.012,thin*.16),Math.max(.012,h*.025),d*.96,trim,{round:.006});
      }
    }

    const collide=/BED|TABLE|DESK|COUNTER|BENCH|BOOK|SHELF|CABINET|LOCKER|RANGE|FRIDGE|FREEZER|LAB-|FUME|ROBOT|MICRO|EXAM|PHARM|CCTV|WARDROBE|STAIR|TOILET|BASIN|SHOWER|LAUNDRY|WAIT-CHAIRS|LECTURE-SEAT|SELF-CHECK|DIRECTORY/;
    const nonBodyFloorPrefabs=new Set(['PF-EXTINGUISHER','PF-BIN','PF-LIFT']);
    function renderFixture(f) {
      const p=prefab(f.prefab),size=f.size||p.size,[w,h,d]=size,y=f.at[1]-base;
      const physicalFloor=p.anchor==='floor'&&h>.20&&!nonBodyFloorPrefabs.has(f.prefab);
      if(f.collision!=='none'&&(collide.test(f.prefab)||physicalFloor)) bodySolid(f,w*.9,d*.9);
      if(p.anchor==='floor'&&f.collision!=='none'&&h>.20){
        const c=Math.abs(Math.cos(f.yaw||0)),s=Math.abs(Math.sin(f.yaw||0));
        shade(f.at[0],f.at[2],(c*w+s*d)*.92,(s*w+c*d)*.92,.16,.022);
      }
      switch(f.prefab){
        case 'PF-WALL-RUN': renderWallRun(f,w,h,d); break;
        case 'PF-CEILING-LIGHT': {
          localBox(f,0,y,0,w,h,d,'M-STEEL-DARK',{round:.018,bevel:.010});
          const q=localBox(f,0,y-.012,0,w*.88,h*.52,d*.76,'M-WALL-WHITE',{round:.022,glow:.24}); lit.push(q);
          for(const dx of [-w*.42,w*.42])for(const dz of [-d*.38,d*.38])
            localBox(f,dx,y-.018,dz,w*.06,h*.60,d*.08,'M-BRASS',{round:.006});
          realLight(f.at[0],Math.min(H-.15,y-.08),f.at[2],f.temperatureK||3800,
            clamp((f.lumens||1700)/2300,.52,.92),clamp(2.7+Math.max(w,d)*.42,3.0,3.8)); break;
        }
        case 'PF-PENDANT':
          // Clamp the suspension to the actual underside of this floor's ceiling.  Authored
          // shades can sit at different heights, but the stem must never pierce the slab above.
          {
            const stem=Math.max(.08,Math.min(.65,H-y-.03));
            localBox(f,0,y+stem/2,0,.025,stem,.025,'M-STEEL-DARK');
          }
          localBall(f,0,y,0,w*.43,h*.34,d*.43,f.material,{mode:7,gloss:.14,glow:.16});
          localCyl(f,0,y-h*.28,0,Math.min(w,d)*.31,.035,'M-BRASS',{gloss:.36});
          realLight(f.at[0],y-.25,f.at[2],f.temperatureK||3300,
            clamp((f.lumens||900)/1800,.42,.72),clamp(1.9+Math.max(w,d)*.65,2.1,2.7)); break;
        case 'PF-EMERGENCY-LIGHT':
          localBox(f,0,y,0,w,h,d,'M-WALL-WHITE',{round:.035,bevel:.012});
          localBox(f,0,y-.018,-d*.52,w*.76,h*.54,.025,'M-WALL-WHITE',{round:.028,glow:.24});
          localBall(f,-w*.36,y,d*.02,.045,.045,.035,'M-SCREEN',{glow:.18});
          localBall(f,w*.36,y,d*.02,.045,.045,.035,'M-SCREEN',{glow:.18}); break;
        case 'PF-ALARM':
          localBox(f,0,y,0,w,h,d,f.material,{round:.024,bevel:.010});
          localBox(f,0,y-.025,-d*.52,w*.66,h*.38,.022,'M-WALL-WHITE',{round:.012});
          localBox(f,0,y+.055,-d*.55,w*.38,h*.16,.018,'M-SAFETY-RED',{round:.010,glow:.08});
          localBall(f,0,y+h*.43,-d*.04,w*.24,h*.14,d*.22,'M-SAFETY-RED',{alpha:.68,glow:.12}); break;
        case 'PF-EXTINGUISHER':
          localBox(f,0,y+h*.50,0,w,h,d,'M-SAFETY-RED',{round:.025,bevel:.012});
          localBox(f,0,y+h*.50,-d*.51,w*.78,h*.78,.025,'M-GLASS',{round:.018,alpha:.34});
          localCyl(f,0,y+h*.39,-d*.20,w*.23,h*.54,'M-SAFETY-RED',{gloss:.26});
          localBox(f,0,y+h*.70,-d*.20,w*.22,.10,d*.20,'M-STEEL-DARK',{round:.014});
          localBox(f,w*.27,y+h*.47,-d*.54,w*.12,h*.44,.018,'M-WALL-WHITE',{round:.006}); break;
        case 'PF-AED':
          localBox(f,0,y,0,w,h,d,'M-WALL-WHITE',{round:.035,bevel:.016});
          localBox(f,0,y,-d*.52,w*.84,h*.82,.025,'M-GLASS',{round:.025,alpha:.34});
          localBox(f,0,y,-d*.55,w*.30,.055,.018,'M-SAFETY-RED',{round:.012});
          localBox(f,0,y,-d*.55,.055,h*.30,.018,'M-SAFETY-RED',{round:.012});
          localBall(f,w*.34,y+h*.34,-d*.55,.035,.035,.018,'M-PLANT',{glow:.20}); break;
        case 'PF-FIRST-AID':
          localBox(f,0,y,0,w,h,d,f.material,{round:.030,bevel:.014});
          localBox(f,0,y,-d*.52,w*.86,h*.86,.025,'M-WALL-WHITE',{round:.020});
          localBox(f,0,y,-d*.55,w*.34,.075,.018,'M-SAFETY-RED',{round:.012});
          localBox(f,0,y,-d*.55,.075,h*.30,.018,'M-SAFETY-RED',{round:.012});
          localBox(f,w*.36,y,-d*.57,.025,h*.22,.018,'M-STAINLESS',{round:.008}); break;
        case 'PF-CHAIR': case 'PF-LECTURE-SEAT': renderChair(f,w,h,d); break;
        case 'PF-BENCH': renderBench(f,w,h,d); break;
        case 'PF-STOOL':
          localCyl(f,0,y+h*.68,0,w*.40,.10,f.material,{gloss:.08});
          localCyl(f,0,y+h*.34,0,.035,h*.58,'M-STAINLESS',{gloss:.42});
          localBall(f,0,y+h*.13,0,.09,.055,.09,'M-STEEL-DARK',{gloss:.28});
          for(let i=0;i<5;i++){
            const a=i*Math.PI*2/5,dx=Math.sin(a)*w*.24,dz=Math.cos(a)*d*.24;
            localBox(f,dx,y+h*.09,dz,w*.42,.035,.035,'M-STEEL-DARK',{ry:a,round:.012});
            localBall(f,Math.sin(a)*w*.40,y+h*.055,Math.cos(a)*d*.40,.035,.035,.035,'M-STEEL-DARK',{gloss:.32});
          }
          break;
        case 'PF-WAIT-CHAIRS':
          for(let i=-1;i<=1;i++){const q={...f,id:`${f.id}/${i}`,at:[...f.at]};[q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],i*w/3,0,f.yaw||0);renderChair(q,w/3*.82,h,d*.85);}
          localBox(f,0,y+.34,0,w,.07,.08,'M-STEEL-DARK'); break;
        case 'PF-CANTEEN-TABLE': renderCompositeTable(f,w,h,d,false); break;
        case 'PF-READING-TABLE':
          renderCompositeTable(f,w,h,d,true); break;
        case 'PF-STUDENT-DESK-2':
          {
            const desk={...f,at:[...f.at]};
            [desk.at[0],desk.at[2]]=rotated(f.at[0],f.at[2],0,d*.14,f.yaw||0);
            renderTable(desk,w,h,d*.58,f.material);
            for(const dx of [-w*.25,w*.25]){
              const q={...f,id:`${f.id}/STOOL/${dx}`,at:[...f.at]};
              [q.at[0],q.at[2]]=rotated(f.at[0],f.at[2],dx,-d*.24,f.yaw||0);
              renderChair(q,.30,.48,Math.min(.28,d*.34),'M-WOOD-DESK');
            }
          } break;
        case 'PF-TEACHER-PODIUM':
          renderCabinet(f,w,h,d,2,1,'M-OAK-DARK');
          localBox(f,0,y+h+.03,-d*.08,w*.94,.10,d*.82,f.material);
          localBox(f,w*.24,y+h+.22,-d*.18,.34,.26,.05,'M-SCREEN',{glow:.12}); break;
        case 'PF-SIDE-TABLE': renderSideTable(f,w,h,d); break;
        case 'PF-MEETING-TABLE': case 'PF-ART-TABLE': case 'PF-PREP-TABLE': renderTable(f,w,h,d); break;
        case 'PF-COMPUTER-DESK': case 'PF-LANGUAGE-DESK': case 'PF-OFFICE-DESK': case 'PF-DORM-DESK': renderWorkstation(f,w,h,d); break;
        case 'PF-LAB-BENCH': case 'PF-MICROSCOPE': case 'PF-ROBOTICS': renderWorkstation(f,w,h,d,true); break;
        case 'PF-BOOKCASE': case 'PF-BOOKSTACK': renderShelf(f,w,h,d,true); break;
        case 'PF-SHELF': case 'PF-TRAY-RACK': case 'PF-SHOE-RACK': case 'PF-MUSIC-RACK': renderShelf(f,w,h,d,false); break;
        case 'PF-SPEAKER':
          localBox(f,0,y,0,w*.92,h*.96,d*.92,'M-STEEL-DARK',{round:.045,bevel:.018});
          localBox(f,0,y,-d*.49,w*.78,h*.84,.025,f.material,{round:.035,bevel:.010});
          localBall(f,0,y-h*.19,-d*.54,w*.27,h*.18,.018,'M-STEEL-DARK',{gloss:.18});
          localBall(f,0,y+h*.20,-d*.54,w*.17,h*.11,.018,'M-STEEL-DARK',{gloss:.18});
          localBox(f,w*.31,y+h*.35,-d*.555,.035,.035,.015,'M-SCREEN',{round:.012,glow:.16});
          localBox(f,0,y+h*.54,d*.38,w*.34,.12,d*.18,'M-STEEL-DARK',{round:.018}); break;
        case 'PF-CIRC-DESK': case 'PF-SERVICE-COUNTER': case 'PF-PHARMACY': case 'PF-CASHIER':
          renderCounter(f,w,h,d,f.prefab==='PF-PHARMACY'); break;
        case 'PF-SELF-CHECK': renderKiosk(f,w,h,d); break;
        case 'PF-SECURITY-GATE':
          localBox(f,0,y+.08,0,w*1.35,.16,d*1.10,'M-STEEL-DARK');
          localBox(f,0,y+h*.52,0,w,h*.86,d*.10,'M-GLASS',{alpha:.32});
          localBox(f,0,y+h*.92,0,w*.95,.10,d*.18,'M-SCREEN',{glow:.16}); break;
        case 'PF-FILE-CABINET': renderCabinet(f,w,h,d,1,4); break;
        case 'PF-CLINIC-CABINET': renderCabinet(f,w,h,d,2,3,'M-CLINIC'); break;
        case 'PF-LOCKERS': renderCabinet(f,w,h,d,3,2); break;
        case 'PF-WARDROBE': renderCabinet(f,w,h,d,2,1); break;
        case 'PF-CLEANING': renderCabinet(f,w,h,d,2,1); break;
        case 'PF-BED':
          for(const dx of [-w*.42,w*.42])for(const dz of [-d*.36,d*.36])
            localBox(f,dx,y+.10,dz,.08,.20,.08,'M-OAK-DARK',{round:.018});
          localBox(f,0,y+.24,0,w,.26,d,'M-OAK-DARK',{round:.035,bevel:.016});
          localBox(f,0,y+.42,0,w*.95,.22,d*.94,'M-WALL-WHITE',{mode:7,round:.075,gloss:.025});
          localBox(f,-w*.08,y+.545,-d*.13,w*.78,.11,d*.54,f.material,{mode:7,round:.060,gloss:.04});
          localBox(f,-w*.08,y+.602,-d*.12,w*.70,.025,d*.46,'M-WALL-WHITE',{mode:7,round:.025,gloss:.025});
          for(const dx of [-w*.27,-w*.08,w*.11])localBox(f,dx,y+.617,-d*.12,.018,.014,d*.40,'M-OAK-DARK',{round:.005,gloss:.03});
          localBall(f,w*.25,y+.56,d*.30,w*.22,.075,d*.17,'M-FABRIC-BLUE',{mode:7,gloss:.035,ry:-.06});
          localBox(f,-w*.43,y+.50,0,.035,.44,d*.90,'M-BRASS',{round:.012});
          localBox(f,w*.43,y+.50,0,.035,.44,d*.90,'M-BRASS',{round:.012});
          break;
        case 'PF-PLANT':
          cyl(f.at[0],y+.22,f.at[2],w*.32,.44,C0('M-OAK'),opts('M-OAK',{tag:f.id}));
          for(const [dx,dz,hh] of [[0,0,.78],[-.16,.04,.56],[.15,-.05,.61]]){const [px,pz]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);capsule(px,y+.46+hh/2,pz,.12,hh,.12,C0('M-PLANT'),opts('M-PLANT',{tag:f.id}));} break;
        case 'PF-STAIR':
          {
            const rise=Math.min(H,h),steps=8,flightD=d*.37,stepD=flightD/steps,flightW=w*.43,stepH=rise/(steps*2);
            for(let i=0;i<steps;i++){
              const sh=(i+1)*stepH,zA=-d*.45+(i+.5)*stepD,zB=d*.45-(i+.5)*stepD;
              localBox(f,-w*.25,y+sh/2,zA,flightW,sh,stepD+.012,'M-TERRAZZO',{bevel:.006});
              localBox(f,-w*.25,y+sh+.012,zA,flightW*.98,.024,stepD*.16,'M-SAFETY-YELLOW',{bevel:.004});
              const shB=rise/2+(i+1)*stepH;
              localBox(f,w*.25,y+shB/2,zB,flightW,shB,stepD+.012,'M-TERRAZZO',{bevel:.006});
              localBox(f,w*.25,y+shB+.012,zB,flightW*.98,.024,stepD*.16,'M-SAFETY-YELLOW',{bevel:.004});
            }
            localBox(f,0,y+rise/2,0,w,.14,d*.18,'M-TERRAZZO',{bevel:.010});
            const angle=Math.atan((rise/2)/Math.max(.2,flightD));
            localBox(f,-w*.48,y+rise*.27,-d*.25,.045,.045,Math.hypot(flightD,rise/2),'M-STEEL-DARK',{rx:-angle,round:.014});
            localBox(f,w*.48,y+rise*.73,d*.25,.045,.045,Math.hypot(flightD,rise/2),'M-STEEL-DARK',{rx:-angle,round:.014});
            for(const dx of [-w*.48,w*.48])for(const dz of [-d*.43,0,d*.43])
              localBox(f,dx,y+rise*.50,dz,.045,rise*.72,.045,'M-STEEL-DARK',{round:.012});
          } break;
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
        case 'PF-SERVING-COUNTER':
          renderCounter(f,w,h,d,false);
          localBox(f,0,y+h+.34,0,w*.92,.62,.035,'M-GLASS',{alpha:.30});
          for(const dx of [-w*.28,0,w*.28])localBox(f,dx,y+h+.055,-d*.05,w*.20,.05,d*.44,'M-KITCHEN-EPOXY'); break;
        case 'PF-DISH-RETURN':
          renderCounter(f,w,h,d,false);
          localBox(f,0,y+h*.64,-d*.46,w*.54,h*.34,.04,'M-STEEL-DARK');
          localBox(f,0,y+h*.63,-d*.49,w*.43,h*.16,.025,'M-SCREEN',{glow:.08}); break;
        case 'PF-KITCHEN-RANGE': {
          localBox(f,0,y+h*.44,0,w,h*.88,d,'M-STAINLESS');
          localBox(f,0,y+h-.03,0,w,.08,d,'M-STEEL-DARK');
          for(const [dx,dz] of [[-w*.25,-d*.22],[w*.25,-d*.22],[-w*.25,d*.22],[w*.25,d*.22]]){
            const [px,pz]=rotated(f.at[0],f.at[2],dx,dz,f.yaw||0);
            cyl(px,y+h+.025,pz,Math.min(w,d)*.14,.035,C0('M-STEEL-DARK'),opts('M-STEEL-DARK',{tag:f.id}));
          }
          localBox(f,0,y+h*.48,-d*.52,w*.72,.18,.04,'M-SCREEN',{glow:.06}); break;
        }
        case 'PF-HOOD':
          localBox(f,0,y-.20,0,w,.40,d,'M-STAINLESS');
          localBox(f,0,y+.16,d*.20,w*.70,.42,d*.38,'M-STAINLESS');
          for(const dx of [-w*.30,-w*.10,w*.10,w*.30])localBox(f,dx,y-.32,0,.035,.16,d*.72,'M-STEEL-DARK'); break;
        case 'PF-SINK-DOUBLE':
          renderCounter(f,w,h,d,false);
          for(const dx of [-w*.24,w*.24])localBox(f,dx,y+h+.015,0,w*.38,.035,d*.58,'M-STEEL-DARK');
          localBox(f,0,y+h+.24,d*.27,.05,.45,.05,'M-STAINLESS'); break;
        case 'PF-FRIDGE': case 'PF-FREEZER': case 'PF-MED-FRIDGE': case 'PF-LAUNDRY':
          renderAppliance(f,w,h,d,f.prefab==='PF-MED-FRIDGE');
          if(f.prefab==='PF-LAUNDRY')for(const yy of [y+h*.28,y+h*.70]){
            localBall(f,0,yy,-d*.515,w*.28,h*.12,.028,'M-STEEL-DARK',{gloss:.28});
            localBall(f,0,yy,-d*.535,w*.22,h*.09,.025,'M-GLASS',{alpha:.34,gloss:.48});
          } break;
        case 'PF-WATER': renderWaterStation(f,w,h,d); break;
        case 'PF-BIN':
          localCyl(f,0,y+h*.48,0,w*.45,h*.88,f.material,{gloss:.24});
          localCyl(f,0,y+h*.93,0,w*.48,h*.08,'M-STEEL-DARK',{gloss:.35});
          localBox(f,0,y+.04,-d*.40,w*.28,.06,d*.16,'M-STEEL-DARK',{round:.020});
          localBox(f,0,y+h*.54,-d*.465,w*.42,h*.16,.018,'M-WALL-WHITE',{round:.018}); break;
        case 'PF-AC':
          localBox(f,0,y,0,w,h,d,'M-WALL-WHITE');
          for(let i=-2;i<=2;i++)localBox(f,i*w*.15,y-h*.20,-d*.52,w*.10,.025,.02,'M-STEEL-DARK');
          localBox(f,w*.35,y+h*.16,-d*.53,.08,.045,.02,'M-SCREEN',{glow:.12}); break;
        case 'PF-FUME-HOOD':
          localBox(f,0,y+h*.22,0,w,h*.44,d,'M-LAB-BLUE');
          localBox(f,0,y+h*.63,d*.12,w*.90,h*.67,d*.70,'M-GLASS',{alpha:.30});
          localBox(f,0,y+h*.94,0,w,h*.12,d,'M-STAINLESS');
          localBox(f,w*.36,y+h*.49,-d*.47,.22,.28,.035,'M-SCREEN',{glow:.08}); break;
        case 'PF-EXAM-COUCH':
          localBox(f,0,y+.49,0,w,.18,d,'M-CLINIC');
          localBox(f,0,y+.67,0,w*.97,.18,d*.94,f.material);
          localBox(f,0,y+.76,d*.35,w*.96,.16,d*.24,'M-WALL-GREEN');
          for(const dx of [-w*.37,w*.37])for(const dz of [-d*.30,d*.30])localBox(f,dx,y+.24,dz,.055,.48,.055,'M-STEEL-DARK'); break;
        case 'PF-TOILET':
          localBall(f,0,y+.21,-d*.05,w*.34,.19,d*.36,'M-CERAMIC',{gloss:.34});
          localBall(f,0,y+.39,-d*.10,w*.46,.15,d*.40,'M-CERAMIC',{gloss:.40});
          localBall(f,0,y+.505,-d*.10,w*.43,.025,d*.37,'M-WALL-WHITE',{gloss:.24});
          localBox(f,0,y+.60,d*.30,w*.70,.34,d*.26,'M-CERAMIC',{round:.055,bevel:.018,gloss:.36});
          localBox(f,0,y+.79,d*.30,w*.74,.045,d*.30,'M-WALL-WHITE',{round:.025,gloss:.32});
          localBall(f,w*.22,y+.78,d*.17,.035,.018,.035,'M-STAINLESS',{gloss:.55});
          if(f.grabRails){
            localBox(f,w*.45,y+.68,d*.08,.035,.035,d*.60,'M-SAFETY-YELLOW',{round:.012});
            localBox(f,w*.45,y+.53,d*.35,.035,.34,.035,'M-SAFETY-YELLOW',{round:.012});
          }
          break;
        case 'PF-BASIN': case 'PF-HANDWASH': case 'PF-LAB-SINK':
          {
            const lab=f.prefab==='PF-LAB-SINK',hand=f.prefab==='PF-HANDWASH',ceramic=lab?'M-STAINLESS':'M-CERAMIC';
            localBox(f,0,y+h*.53,d*.13,w*(lab ? .98 : .34),h*(lab ? .58 : .48),d*(lab ? .88 : .36),lab?'M-STEEL-DARK':'M-WALL-WHITE',{round:.035,bevel:.014});
            localBall(f,0,y+h*.68,-d*.04,w*(lab ? .42 : .45),h*.115,d*(lab ? .38 : .43),ceramic,{gloss:.42});
            localBall(f,0,y+h*.70,-d*.04,w*(lab ? .29 : .32),h*.075,d*(lab ? .27 : .30),'M-STEEL-DARK',{gloss:.38});
            localCyl(f,0,y+h*.72,-d*.04,.022,.018,'M-STAINLESS',{gloss:.55});
            localCyl(f,0,y+h*.87,d*.25,.026,h*.30,'M-STAINLESS',{gloss:.52});
            localBox(f,0,y+h*.99,d*.12,.052,.052,d*.30,'M-STAINLESS',{round:.016});
            localBox(f,hand?w*.28:-w*.30,y+h*.91,d*.39,w*.16,h*.18,d*.08,hand?'M-WALL-WHITE':'M-LAB-BLUE',{round:.018});
            if(lab)localBox(f,w*.36,y+h*.72,0,w*.18,.035,d*.72,'M-STAINLESS',{round:.014});
          }
          break;
        case 'PF-SHOWER':
          localBox(f,0,y+.035,0,w,.07,d,'M-TILE-DARK',{round:.025,bevel:.012});
          localBox(f,w*.47,y+h/2,0,.04,h*.96,d,'M-GLASS',{alpha:.38,round:.010});
          localBox(f,0,y+h/2,d*.47,w,h*.96,.04,'M-GLASS',{alpha:.30,round:.010});
          localBox(f,-w*.34,y+h*.51,d*.40,.045,h*.78,.045,'M-STAINLESS',{round:.014});
          localBox(f,-w*.34,y+h*.88,d*.22,.045,.045,d*.38,'M-STAINLESS',{round:.014});
          localCyl(f,-w*.34,y+h*.87,d*.06,w*.13,.035,'M-STAINLESS',{gloss:.46});
          localBox(f,-w*.34,y+h*.49,d*.38,w*.20,.16,.035,'M-STEEL-DARK',{round:.030});
          localCyl(f,0,y+.065,0,w*.10,.018,'M-STEEL-DARK',{gloss:.32});
          localBox(f,w*.34,y+h*.68,-d*.42,.06,.12,.06,'M-BRASS',{round:.018}); break;
        case 'PF-PROJECTOR':
          localBox(f,0,y+.22,0,.035,.44,.035,'M-STEEL-DARK');
          localBox(f,0,y,0,w,h,d,'M-WALL-WHITE');
          localBox(f,0,y,-d*.53,w*.23,h*.46,.04,'M-SCREEN',{glow:.20}); break;
        case 'PF-FLAG':
          localBox(f,0,y,0,w,h,d,f.material);
          localBox(f,0,y+h*.58,0,w*1.12,.035,d*1.2,'M-BRASS'); break;
        case 'PF-CHALKBOARD': case 'PF-WHITEBOARD': case 'PF-SCREEN': case 'PF-DANCE-MIRROR':
          {
            const frame=f.prefab==='PF-DANCE-MIRROR'?'M-BRASS':f.prefab==='PF-SCREEN'?'M-STEEL-DARK':'M-OAK-DARK';
            localBox(f,0,y,0,w,h,d,frame,{round:.018,bevel:.012});
            localBox(f,0,y,-d*.16,w*.94,h*.90,d*.72,f.material,{round:.014,
              alpha:f.prefab==='PF-DANCE-MIRROR'?.52:undefined,glow:f.prefab==='PF-SCREEN'?.09:undefined});
            localBox(f,0,y-h*.48,-d*.42,w*.90,.035,d*.32,frame,{round:.010});
            if(f.prefab==='PF-DANCE-MIRROR')localBox(f,0,y-h*.25,-d*.57,w*.92,.045,.045,'M-OAK',{round:.014});
            if(f.prefab==='PF-CHALKBOARD'||f.prefab==='PF-WHITEBOARD')for(const dx of [-w*.22,0,w*.22])
              localBox(f,dx,y-h*.52,-d*.52,w*.10,.035,.035,dx?'M-FABRIC-BLUE':'M-SAFETY-RED',{round:.008});
            if(f.text&&f.prefab==='PF-SCREEN')glyphs(f.at[0],y,f.at[2],(f.yaw||0)+Math.PI,f.text,
              {size:Math.min(.105,w/Math.max(5,[...f.text].length)),gap:.016,color:C0('M-WALL-WHITE'),mode:1,tag:f.id,lift:.012});
          } break;
        case 'PF-DIRECTORY':
          localBox(f,0,y+h*.48,0,w,h*.90,d,'M-STEEL-DARK');
          localBox(f,0,y+h*.62,-d*.55,w*.84,h*.58,.035,'M-SCREEN',{glow:.15});
          localBox(f,0,y+.045,0,w*.98,.09,d*.98,'M-STEEL-DARK',{round:.018});
          if(f.text)glyphs(f.at[0],y+h*.66,f.at[2],(f.yaw||0)+Math.PI,f.text,
            {size:Math.min(.10,w/Math.max(4,[...f.text].length)),gap:.016,color:C0('M-WALL-WHITE'),mode:1,tag:f.id}); break;
        case 'PF-ROOM-SIGN': case 'PF-EXIT-SIGN':
          {
          const cy=p.anchor==='floor'?y+h/2:y;
          localBox(f,0,cy,0,w,h,d,'M-STEEL-DARK',{round:.018,bevel:.010});
          localBox(f,0,cy,-d*.28,w*.90,h*.78,d*.55,f.material,{round:.012,glow:f.prefab==='PF-EXIT-SIGN'?.15:undefined});
          if(f.text)glyphs(f.at[0],p.anchor==='floor'?y+h*.62:y,f.at[2],(f.yaw||0)+Math.PI,f.text,
            {size:Math.min(.11,w/Math.max(4,[...f.text].length)),gap:.018,color:C0('M-WALL-WHITE'),mode:1,tag:f.id}); break;
          }
        case 'PF-CLOCK':
          localCyl(f,0,y,d*.10,w*.50,d,'M-OAK-DARK',{rx:Math.PI/2,gloss:.24});
          localCyl(f,0,y,-d*.08,w*.44,d*.62,'M-WALL-WHITE',{rx:Math.PI/2,gloss:.10});
          localBox(f,0,y+.045,-d*.48,.025,h*.27,.018,'M-STEEL-DARK',{round:.008});
          localBox(f,w*.07,y-.02,-d*.50,w*.24,.020,.018,'M-SAFETY-RED',{rz:.55,round:.007});
          localBall(f,0,y,-d*.52,.035,.035,.018,'M-BRASS',{gloss:.42}); break;
        case 'PF-EYEWASH':
          localCyl(f,0,y+h*.47,0,.045,h*.90,'M-SAFETY-YELLOW',{gloss:.24});
          localCyl(f,0,y+h*.43,0,w*.29,.09,'M-STAINLESS',{gloss:.38});
          localCyl(f,0,y+h*.46,0,w*.23,.035,'M-SCREEN',{gloss:.22});
          for(const dx of [-w*.16,w*.16]){
            localBox(f,dx,y+h*.53,0,.035,h*.13,.035,'M-STAINLESS',{round:.010});
            localBall(f,dx,y+h*.59,0,.055,.035,.055,'M-SAFETY-YELLOW',{gloss:.22});
          }
          localBox(f,0,y+h*.91,0,w*.72,.045,.045,'M-SAFETY-YELLOW',{round:.014});
          localCyl(f,w*.31,y+h*.88,0,w*.14,.045,'M-STAINLESS',{gloss:.40});
          localBox(f,w*.24,y+h*.28,0,.035,h*.25,.035,'M-SAFETY-YELLOW',{round:.010,rz:-.42});
          localBox(f,0,y+.025,0,w*.70,.05,d*.70,'M-STEEL-DARK',{round:.025}); break;
        case 'PF-CCTV-DESK':
          renderTable(f,w,h,d,'M-OAK-DARK');
          for(const dx of [-w*.39,-w*.13,w*.13,w*.39]){
            localBox(f,dx,y+h+.27,d*.08,w*.21,.30,.045,'M-STEEL-DARK',{round:.020,bevel:.008});
            localBox(f,dx,y+h+.27,d*.052,w*.18,.25,.025,'M-SCREEN',{round:.012,glow:.14});
            localBox(f,dx,y+h+.09,d*.08,.035,.16,.035,'M-STEEL-DARK',{round:.010});
          }
          localBox(f,-w*.18,y+h+.035,-d*.18,w*.34,.025,d*.18,'M-WALL-WHITE',{round:.010});
          localBox(f,w*.20,y+h+.045,-d*.17,w*.18,.045,d*.20,'M-STEEL-DARK',{round:.018});
          localBox(f,w*.37,y+h+.13,-d*.13,w*.08,.18,d*.10,'M-SAFETY-RED',{round:.025});
          localCyl(f,w*.37,y+h+.25,-d*.13,.018,.16,'M-STEEL-DARK',{gloss:.30});
          break;
        case 'PF-KEY-CABINET':
          localBox(f,0,y,0,w,h,d,'M-STEEL-DARK',{round:.025,bevel:.014});
          localBox(f,0,y,-d*.52,w*.88,h*.90,.025,'M-GLASS',{round:.018,alpha:.30});
          for(let row=0;row<4;row++)for(let col=0;col<5;col++)
            localBox(f,-w*.34+col*w*.17,y-h*.30+row*h*.20,-d*.55,.035,.055,.018,
              (row+col)%3?'M-BRASS':'M-SAFETY-RED',{round:.010});
          localBox(f,w*.42,y,-d*.57,.025,h*.25,.018,'M-STAINLESS',{round:.008}); break;
        case 'PF-COAT-RAIL':
          localBox(f,0,y,0,w,.14,d*.52,f.material,{round:.025,bevel:.012});
          for(let i=0;i<5;i++){
            const x=-w*.40+i*w*.20;
            localBox(f,x,y,-d*.30,.028,h*.58,.035,'M-BRASS',{round:.009,rx:-.12});
            localBox(f,x,y-h*.22,-d*.43,.028,.12,d*.24,'M-BRASS',{round:.009,rx:.38});
            localBox(f,x,y+h*.20,-d*.39,.028,.10,d*.18,'M-BRASS',{round:.009,rx:-.28});
          }
          localBox(f,-w*.43,y,0,.045,.22,d*.74,'M-STEEL-DARK',{round:.010});
          localBox(f,w*.43,y,0,.045,.22,d*.74,'M-STEEL-DARK',{round:.010}); break;
        case 'PF-ELECTRICAL-CABINET':
          localBox(f,0,y,0,w,h,d,'M-STEEL-DARK',{round:.018,bevel:.012});
          localBox(f,0,y,-d*.48,w*.88,h*.91,.025,'M-STEEL',{round:.012,bevel:.008});
          for(let row=0;row<4;row++)for(let col=0;col<3;col++)
            localBox(f,-w*.25+col*w*.25,y-h*.29+row*h*.18,-d*.55,w*.16,h*.075,.018,
              row===0?'M-SAFETY-YELLOW':'M-STEEL-DARK',{round:.008});
          localBox(f,w*.40,y,-d*.575,.025,h*.22,.018,'M-STAINLESS',{round:.008});
          localBox(f,-w*.27,y+h*.36,-d*.575,w*.25,h*.12,.018,'M-SAFETY-YELLOW',{round:.010}); break;
        case 'PF-DOOR-SINGLE': case 'PF-DOOR-DOUBLE':
          localBox(f,0,y+h/2,0,w,h,d,'M-STEEL-DARK',{round:.018,bevel:.010});
          localBox(f,0,y+h*.49,-d*.20,w*.88,h*.92,d*.70,f.material,{round:.014,alpha:f.prefab==='PF-DOOR-DOUBLE'?.48:undefined});
          if(f.prefab==='PF-DOOR-DOUBLE')localBox(f,0,y+h*.49,-d*.54,.025,h*.86,.018,'M-STEEL-DARK',{round:.008});
          for(const dx of f.prefab==='PF-DOOR-DOUBLE'?[-w*.18,w*.18]:[w*.28])
            localBox(f,dx,y+h*.50,-d*.56,.035,h*.30,.025,'M-BRASS',{round:.012,gloss:.42});
          break;
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
      const vertical=Math.abs(nearest.yaw)>1,half=.72;
      if(vertical){
        prop(`${p.id}/FRAME-A`,nearest.x,1.10,nearest.z-half,.15,2.20,.12,'M-STEEL-DARK');
        prop(`${p.id}/FRAME-B`,nearest.x,1.10,nearest.z+half,.15,2.20,.12,'M-STEEL-DARK');
        prop(`${p.id}/FRAME-T`,nearest.x,2.17,nearest.z,.15,.14,1.56,accent);
        prop(`${p.id}/PULL-A`,nearest.x-.07,1.12,nearest.z-.22,.05,.70,.035,'M-BRASS');
        prop(`${p.id}/PULL-B`,nearest.x-.07,1.12,nearest.z+.22,.05,.70,.035,'M-BRASS');
      } else {
        prop(`${p.id}/FRAME-A`,nearest.x-half,1.10,nearest.z,.12,2.20,.15,'M-STEEL-DARK');
        prop(`${p.id}/FRAME-B`,nearest.x+half,1.10,nearest.z,.12,2.20,.15,'M-STEEL-DARK');
        prop(`${p.id}/FRAME-T`,nearest.x,2.17,nearest.z,1.56,.14,.15,accent);
        prop(`${p.id}/PULL-A`,nearest.x-.22,1.12,nearest.z-.07,.035,.70,.05,'M-BRASS');
        prop(`${p.id}/PULL-B`,nearest.x+.22,1.12,nearest.z-.07,.035,.70,.05,'M-BRASS');
      }
      const approach=publicArrival(p);
      const t=thing('门',nearest.x,1.15,nearest.z,'从这里回到校园。','This door returns to the campus.','门 is a door; 出门 is to step outside.',
        {focus:[approach.x,approach.z],reach:1.8});
      t.exit={place:'campus',at:{x:p.campusReturn[0],z:p.campusReturn[1],yaw:p.campusReturn[2]}};
    }

    const navObjects=allObjects(floor).filter(o=>o.prefab==='PF-LIFT'||o.prefab==='PF-STAIR');
    const nav=navObjects.find(o=>o.prefab==='PF-LIFT')||navObjects[0];
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
    const navApproach=(targetAt=navAt,onFloor=floor,useRuntimeClearance=true)=>{
      const candidates=[];
      for(const route of onFloor.circulation||[]){
        const [a,b,c,d]=route.bounds,pad=Math.min(.42,(b-a)/2,(d-c)/2);
        const px=clamp(targetAt[0],a+pad,b-pad),pz=clamp(targetAt[1],c+pad,d-pad);
        candidates.push([px,pz],[(a+b)/2,(c+d)/2],[px,(c+d)/2],[(a+b)/2,pz]);
      }
      candidates.sort((u,v)=>Math.hypot(u[0]-targetAt[0],u[1]-targetAt[1])-Math.hypot(v[0]-targetAt[0],v[1]-targetAt[1]));
      const at=(useRuntimeClearance?candidates.find(([x,z])=>clearAt(x,z)):candidates[0])||Object.values(arrivalHere());
      return{x:at[0],z:at[1]};
    };
    for(const vertical of navObjects){
      const verticalAt=[vertical.at[0],vertical.at[2]],landing=navApproach(verticalAt);
      const via=vertical.prefab==='PF-LIFT'?'电梯':'安全楼梯',viaEn=vertical.prefab==='PF-LIFT'?'lift':'protected stair';
      const destinationAt=targetLevel=>{
        const targetFloor=building.floorsPlan.find(q=>q.level===targetLevel);
        const suffix=vertical.id.replace(/^B\d+\/F\d+\//,'');
        const targetVertical=targetFloor&&allObjects(targetFloor).find(q=>q.id.replace(/^B\d+\/F\d+\//,'')===suffix);
        const targetAt=targetVertical?[targetVertical.at[0],targetVertical.at[2]]:verticalAt;
        const targetLanding=targetFloor?navApproach(targetAt,targetFloor,false):landing;
        return{x:targetLanding.x,z:targetLanding.z,yaw:Math.atan2(targetAt[0]-targetLanding.x,targetAt[1]-targetLanding.z)};
      };
      if(floor.level<building.floors){
        const t=thing('上楼',verticalAt[0]-.34,1.15,verticalAt[1],`从${via}上楼。`,`Go up via this ${viaEn}.`,'上 up + 楼 floor.',
          {focus:[landing.x,landing.z],reach:1.8});
        t.exit={place:placeKey(building.id,floor.level+1),at:destinationAt(floor.level+1)};
      }
      if(floor.level>1){
        const t=thing('下楼',verticalAt[0]+.34,1.15,verticalAt[1],`从${via}下楼。`,`Go down via this ${viaEn}.`,'下 down + 楼 floor.',
          {focus:[landing.x,landing.z],reach:1.8});
        t.exit={place:placeKey(building.id,floor.level-1),at:destinationAt(floor.level-1)};
      }
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
      // Stay in the authored entrance room/route that contains the threshold. Without this
      // boundary, a long clear ray can pass through an internal doorway and place the player in
      // an unrelated room (the compact B08 vestibule previously admitted the WC as a candidate).
      const entryZone=[...floor.rooms,...(floor.circulation||[])]
        .filter(q=>sx>=q.bounds[0]&&sx<=q.bounds[1]&&sz>=q.bounds[2]&&sz<=q.bounds[3])
        .sort((a,b)=>(a.bounds[1]-a.bounds[0])*(a.bounds[3]-a.bounds[2])-
          (b.bounds[1]-b.bounds[0])*(b.bounds[3]-b.bounds[2]))[0];
      const staysInEntryZone=(x,z)=>{
        if(!entryZone)return true;
        const [a,b,c,d]=entryZone.bounds,pad=Math.max(.05,Math.min(.32,(b-a)/2-.05,(d-c)/2-.05));
        return x>=a+pad&&x<=b-pad&&z>=c+pad&&z<=d-pad;
      };
      // The blueprint point is the vestibule threshold.  A third-person camera needs another
      // pace behind it, so arrive farther along the same accessible line when that point is clear.
      for(const distance of [3.6,3.2,2.8,2.4,2.0,1.6,1.2,.8,.4,0]){
        for(const side of [0,.8,-.8,1.2,-1.2]){
          const x=sx+Math.sin(yaw)*distance+Math.cos(yaw)*side;
          const z=sz+Math.cos(yaw)*distance-Math.sin(yaw)*side;
          if(x>x0+.45&&x<x1-.45&&z>z0+.45&&z<z1-.45&&staysInEntryZone(x,z)&&clearAt(x,z))return{x,z,yaw};
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
