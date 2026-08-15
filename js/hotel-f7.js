// 京华大酒店 · 7F serviced residences
//
// This module owns only the seventh-floor fit-out, its local interactions and its three residents.
// The shared shell, passenger/service lifts, fire stair and floor metadata remain HotelCore's job.
const Hotel7Fit = Object.freeze({ floor:'hotel7', api:1 });

(() => {
  try {
    Glyphs.need(
      '七楼长住公寓七零一七零二七零三服务式公寓共享客厅联合办公早餐吧共享厨房住客洗衣房安静阅读瑜伽' +
      '睡眠区书桌厨房起居室主卧餐桌浴室窗边榻工作台电话间打印台咖啡机洗衣机叠衣台阅读角瑜伽垫' +
      '楼层管家住客欢迎回家请随时告诉我您需要什么早餐每天早上供应洗衣房全天开放' +
      // Wall, doorhead and back-of-house wayfinding added with the partitions.
      '服务通道布草间安全出口楼层索引服务梯客房服务备用床品'
    );
  } catch (_) {}

  const TAU=Math.PI*2;
  const fixed=(p,r=2)=>{p.fixed=true;p.cx=p.ob.x;p.cy=p.ob.y;p.cz=p.ob.z;p.r=r;return p;};

  function colours(A){
    return {
      plaster:A.C('#e7e0d3'), plasterD:A.C('#cfc6b7'), limestone:A.C('#d9cfbe'),
      limestoneL:A.C('#ede5d8'), walnut:A.C('#4a362c'), walnutL:A.C('#765648'),
      walnutD:A.C('#2e2724'), bronze:A.C('#9c7542'), bronzeL:A.C('#c8a36a'),
      bronzeD:A.C('#5a432d'), celadon:A.C('#87a696'), celadonL:A.C('#c2d1c6'),
      jade:A.C('#496f60'), lacquer:A.C('#8d302a'), ink:A.C('#25292b'),
      silk:A.C('#ad9684'), silkL:A.C('#ddd0bf'), carpet:A.C('#65564e'),
      glass:A.C('#96afb6'), glassD:A.C('#263840'), warm:A.C('#ffe3a8'),
      white:A.C('#f5f0e7'), steel:A.C('#858b8d'), water:A.C('#4d8790'),
      green:A.C('#52725d'), rose:A.C('#a55e55'), blue:A.C('#587589'),
      oatmeal:A.C('#bbaa91'), tile:A.C('#bbb5a9'),
    };
  }

  // The tower's material kit. Numerically identical to the copies in js/hotel-f1.js and
  // js/hotel-public.js on purpose: build.js:329-331 keys batches on
  // (mat, matScale, matAmt, nrmAmt), so matching tuples let this floor batch with the rest of
  // the building instead of doubling the draw calls. Change one, change all. Every name is
  // already in EAGER_MATERIALS (js/assets.js:187), so none of it adds boot cost.
  const MAT = {
    stone:  { mat:'plaster',  matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',     matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',   matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete', matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };

  // Heights. The shell hangs its ceiling slab at H-.13 with a .26 depth, so the soffit is at
  // H-.26 = 4.09. Every authored partition on this floor stopped at 3.14, which left a 0.95 m
  // open slot over every wall in every flat: from the residential hall you looked straight over
  // the unit walls into the bedrooms, and the light of one room spilled into the next.
  // `cap()` carries a wall run from its own top to the slab with no seam, and registers the
  // camera blocker the partitions were also missing — every surface here is single-sided, so a
  // wall with a collider and no blocker lets the chase camera slide through and show its back.
  // `eye:false` for the piece over a DOORWAY. A blocker on a door footprint would stop the chase
  // camera passing through the opening, which is the opposite of the problem being fixed.
  const WTOP = 3.14, SOFFIT = 4.09;
  function cap(A,c,x0,x1,z0,z1,tag='墙',eye=true){
    A.box((x0+x1)/2,(WTOP+SOFFIT)/2,(z0+z1)/2,x1-x0,SOFFIT-WTOP,z1-z0,c.plasterD,
      {...MAT.stone,hard:true,gloss:.10,tag});
    if(eye) A.blocker(x0-.03,x1+.03,z0-.03,z1+.03,SOFFIT);
  }

  function plaque(A,c,x,y,z,yaw,hz,en,w=3.2,accent=c.jade){
    const {box,glyphs,luminous}=A,nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,y,z,w,1.00,.12,c.walnutD,{hard:true,ry:yaw,gloss:.34,tag:hz});
    for(const side of [-1,1]){
      // A glyph quad drawn at yaw ψ faces (sin ψ, 0, cos ψ) — yaw 0 faces +z, not -z. The old
      // `-yaw`/`π-yaw` pair happened to be right for the ±π/2 plaques and back-to-front for every
      // plaque at yaw 0, which is why the cowork entrance sign was blank from the corridor.
      const sy=side<0?yaw+Math.PI:yaw;
      const fx=x+nx*.074*side,fz=z+nz*.074*side;
      luminous(box(fx,y,fz,w-.16,.84,.025,accent,
        {hard:true,ry:sy,mode:1,gloss:.24,tag:hz}),.018,.10);
      const gx=x+nx*.12*side,gz=z+nz*.12*side;
      glyphs(gx,y+.13,gz,sy,hz,{size:Math.min(.18,(w-.48)/[...hz].length),gap:.024,
        color:c.white,mode:1,lift:.006,tag:hz});
      glyphs(gx,y-.19,gz,sy,en,{size:.066,gap:.011,color:c.bronzeL,
        mode:1,lift:.006,tag:hz});
    }
  }

  function roomSign(A,c,x,z,label,sub='RESIDENCE',yaw=0){
    const {box,glyphs,ball}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,2.62,z,1.08,.42,.055,c.ink,{hard:true,ry:yaw,gloss:.37,tag:label});
    const face=at(0,-.035);
    box(face[0],2.62,face[1],.94,.30,.024,c.walnutD,
      {hard:true,ry:yaw,mode:1,gloss:.30,tag:label});
    const text=at(0,-.060);
    // The plate sits on the -v side of the sign body, so its readable face is yaw+π.
    glyphs(text[0],2.67,text[1],yaw+Math.PI,label,{size:.105,gap:.018,color:c.bronzeL,
      mode:1,lift:.006,tag:label});
    glyphs(text[0],2.49,text[1],yaw+Math.PI,sub,{size:.040,gap:.007,color:c.silkL,
      mode:1,lift:.006,tag:label});
    const dot=at(-.45,-.068);
    ball(dot[0],2.62,dot[1],.035,.035,.020,c.lacquer,{mode:1,glow:.025,tag:label});
  }

  function portal(A,c,x,z,label,yaw=0){
    const {box,ball,onTick}=A,parts=[];
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    for(const s of [-1,1]){
      const p=at(s*.92,0);
      box(p[0],1.54,p[1],.14,3.08,.22,c.walnutD,
        {...MAT.timber,hard:true,ry:yaw,gloss:.31,tag:label});
    }
    box(x,3.04,z,1.98,.18,.24,c.walnutD,{...MAT.timber,hard:true,ry:yaw,gloss:.31,tag:label});
    box(x,.035,z,1.90,.07,.26,c.bronzeD,{hard:true,ry:yaw,gloss:.68,tag:label});
    // The wall over the unit's front door, carried to the slab. No blocker: the eye has to be
    // able to follow the player through the doorway.
    A.box(x,(WTOP+SOFFIT)/2,z,2.10,SOFFIT-WTOP,.22,c.plasterD,
      {...MAT.stone,hard:true,ry:yaw,gloss:.10,tag:label});
    const add=p=>{fixed(p,3.4);p.ob=null;parts.push({p,m:p.m});return p;};
    add(box(x,1.48,z,1.70,2.76,.10,c.walnut,{...MAT.timber,ry:yaw,mode:7,gloss:.34,tag:label}));
    const inset=at(0,-.064);
    add(box(inset[0],1.50,inset[1],1.46,2.48,.026,c.silkL,
      {...MAT.cloth,hard:true,ry:yaw,mode:7,gloss:.04,tag:label}));
    for(const u of [-.58,0,.58]){
      const p=at(u,-.084);
      add(box(p[0],1.50,p[1],.035,2.30,.024,c.bronze,
        {hard:true,ry:yaw,gloss:.70,tag:label}));
    }
    const hp=at(.57,-.104);
    const handle=add(ball(hp[0],1.43,hp[1],.070,.070,.040,c.bronzeL,
      {gloss:.74,tag:label}));
    let open=0;
    onTick((t,body,mins,dt)=>{
      const bx=body&&Number.isFinite(body.x)?body.x:99,bz=body&&Number.isFinite(body.z)?body.z:99;
      const target=Math.hypot(bx-x,bz-z)<2.05?1:0;
      open+=(target-open)*(1-Math.exp(-Math.max(.001,dt)*(target?6:3.5)));
      const travel=1.36*open;
      for(const q of parts)q.p.m=M.mul(M.trans(Math.cos(yaw)*travel,0,-Math.sin(yaw)*travel),q.m);
      handle.glow=target?.018:0;
    });
  }

  function wallWithDoor(A,c,x0,x1,z,door,label,sub='RESIDENCE'){
    const {box,solid}=A,gap=.98;
    if(door-gap>x0){
      const a=x0,b=door-gap;
      box((a+b)/2,1.57,z,b-a,3.14,.16,c.plaster,{...MAT.stone,hard:true,tag:'墙'});
      solid(a,b,z-.09,z+.09);
      cap(A,c,a,b,z-.08,z+.08,'墙');
    }
    if(door+gap<x1){
      const a=door+gap,b=x1;
      box((a+b)/2,1.57,z,b-a,3.14,.16,c.plaster,{...MAT.stone,hard:true,tag:'墙'});
      solid(a,b,z-.09,z+.09);
      cap(A,c,a,b,z-.08,z+.08,'墙');
    }
    // The unit's front door faces the corridor, not the flat. Turning the portal through π puts
    // the panelled face, bronze mullions and handle on the +z side and the number plate with it;
    // before this the corridor saw the plain back of every leaf and an unreadable plate.
    portal(A,c,door,z,label,Math.PI);roomSign(A,c,door,z+.12,label,sub,Math.PI);
  }

  function wallXWithDoor(A,c,x,z0,z1,door,label,sub='ROOM'){
    const {box,solid}=A,gap=.98;
    if(door-gap>z0){
      const a=z0,b=door-gap;
      box(x,1.57,(a+b)/2,.16,3.14,b-a,c.plaster,{...MAT.stone,hard:true,tag:'墙'});
      solid(x-.09,x+.09,a,b);
      cap(A,c,x-.08,x+.08,a,b,'墙');
    }
    if(door+gap<z1){
      const a=door+gap,b=z1;
      box(x,1.57,(a+b)/2,.16,3.14,b-a,c.plaster,{...MAT.stone,hard:true,tag:'墙'});
      solid(x-.09,x+.09,a,b);
      cap(A,c,x-.08,x+.08,a,b,'墙');
    }
    portal(A,c,x,door,label,Math.PI/2);
    roomSign(A,c,x-.12,door,label,sub,Math.PI/2);
  }

  function crossPartition(A,c,x0,x1,z,tag='墙'){
    A.box((x0+x1)/2,1.57,z,x1-x0,3.14,.16,c.plaster,{...MAT.stone,hard:true,tag});
    A.solid(x0,x1,z-.09,z+.09);
    A.box((x0+x1)/2,.10,z,x1-x0,.20,.10,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
    A.box((x0+x1)/2,3.08,z,x1-x0,.14,.12,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
    cap(A,c,x0,x1,z-.08,z+.08,tag);
  }

  function partition(A,c,x,z0,z1,tag='墙'){
    Build.partition(0,3.14,(yc,hh,pf)=>A.box(x,yc,(z0+z1)/2,.16,hh,z1-z0,c.plaster,{...MAT.stone,hard:true,tag,...pf}));
    A.solid(x-.09,x+.09,z0,z1);
    A.box(x,.10,(z0+z1)/2,.10,.20,z1-z0,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
    A.box(x,3.08,(z0+z1)/2,.12,.14,z1-z0,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag,partition:true});
    cap(A,c,x-.08,x+.08,z0,z1,tag);
  }

  // ------------------------------------------------------------------ openings and blind walls
  // `hard:true` picks the sharp-edged box mesh; it has never blocked a body. Every wall below is
  // therefore two statements — the box you see (centre + size) and the `solid` that stops you
  // (min/max footprint) — and every doorway is the ABSENCE of a solid, with the head hung above
  // it as geometry that deliberately owns no collider of its own.

  // Framed opening in a wall that runs along x. `a`..`b` is the published clear width: the jambs
  // sit outside it, over the ends of the flanking wall segments, so the number is honest.
  function crossOpening(A,c,a,b,z,hz=''){
    const {box,capsule,glyphs,flat}=A,w=b-a,cx=(a+b)/2;
    box(cx,2.90,z,w+.30,.44,.16,c.plaster,{...MAT.stone,hard:true,tag:'门头'});
    box(cx,3.08,z,w+.36,.14,.20,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag:'门头'});
    box(cx,2.66,z,w+.24,.09,.26,c.walnutD,{...MAT.timber,hard:true,gloss:.30,tag:'门头'});
    cap(A,c,a-.15,b+.15,z-.08,z+.08,'门头',false);
    for(const s of [-1,1]){
      const jx=cx+s*(w/2+.07);
      box(jx,1.31,z,.14,2.62,.30,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag:"门套"});
      for(const t of [-1,1])capsule(jx,1.31,z+t*.155,.020,2.44,.020,c.bronzeL,
        {gloss:.68,tag:'门套'});
    }
    flat(cx,.030,z,w,.34,c.bronzeD,{gloss:.60,tag:'门槛'});
    if(hz)for(const t of [-1,1])glyphs(cx,2.66,z+t*.145,t<0?Math.PI:0,hz,
      {size:.125,gap:.021,color:c.bronzeL,mode:1,lift:.006,tag:hz});
  }

  // The same opening in a wall that runs along z.
  function sideOpening(A,c,x,a,b,hz=''){
    const {box,capsule,glyphs,flat}=A,d=b-a,cz=(a+b)/2;
    box(x,2.90,cz,.16,.44,d+.30,c.plaster,{...MAT.stone,hard:true,tag:'门头'});
    box(x,3.08,cz,.20,.14,d+.36,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag:'门头'});
    box(x,2.66,cz,.26,.09,d+.24,c.walnutD,{...MAT.timber,hard:true,gloss:.30,tag:'门头'});
    cap(A,c,x-.08,x+.08,a-.15,b+.15,'门头',false);
    for(const s of [-1,1]){
      const jz=cz+s*(d/2+.07);
      box(x,1.31,jz,.30,2.62,.14,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag:"门套"});
      for(const t of [-1,1])capsule(x+t*.155,1.31,jz,.020,2.44,.020,c.bronzeL,
        {gloss:.68,tag:'门套'});
    }
    flat(x,.030,cz,.34,d,c.bronzeD,{gloss:.60,tag:'门槛'});
    // Same face convention as `plaque`: the -x face reads at yaw -π/2, the +x face at +π/2.
    if(hz)for(const t of [-1,1])glyphs(x+t*.145,2.66,cz,t*Math.PI/2,hz,
      {size:.125,gap:.021,color:c.bronzeL,mode:1,lift:.006,tag:hz});
  }

  // A wall line with openings cut in it. `gaps` are ascending [a,b] clear spans; only the pieces
  // between them receive `solid`, which is what makes the doorway a doorway.
  function crossWallGaps(A,c,x0,x1,z,gaps,tag='墙'){
    let cur=x0;
    for(const g of gaps){ if(g[0]-cur>.04) crossPartition(A,c,cur,g[0],z,tag); cur=g[1]; }
    if(x1-cur>.04) crossPartition(A,c,cur,x1,z,tag);
    for(const g of gaps) crossOpening(A,c,g[0],g[1],z,g[2]||'');
  }
  function sideWallGaps(A,c,x,z0,z1,gaps,tag='墙'){
    let cur=z0;
    for(const g of gaps){ if(g[0]-cur>.04) partition(A,c,x,cur,g[0],tag); cur=g[1]; }
    if(z1-cur>.04) partition(A,c,x,cur,z1,tag);
    for(const g of gaps) sideOpening(A,c,x,g[0],g[1],g[2]||'');
  }

  // A blind full-height wall closing a zone that carries no programme — the riser and plant bays
  // either side of the vertical core, and the structure west of the fire stair. These are the only
  // walls on the floor that run to the ceiling, because nothing behind them is ever entered.
  function sealWall(A,c,x0,x1,z0,z1,tag='结构墙'){
    const cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0;
    A.box(cx,2.02,cz,w,4.04,d,c.plasterD,{...MAT.stone,hard:true,gloss:.11,tag});
    A.box(cx,.11,cz,w+.03,.22,d+.03,c.walnutD,{...MAT.timber,hard:true,gloss:.27,tag});
    A.box(cx,3.10,cz,w+.03,.10,d+.03,c.walnutD,{...MAT.timber,hard:true,gloss:.27,tag});
    A.solid(x0,x1,z0,z1);
    A.blocker(x0-.02,x1+.02,z0-.02,z1+.02,4.30);
  }
  // The volume behind a blind wall. Filling it is what keeps the flood fill honest: an enclosed
  // pocket left empty reads as standable-but-unreachable, which is the same bug as a walk-through
  // wall wearing the opposite disguise.
  function sealZone(A,x0,x1,z0,z1){ A.solid(x0,x1,z0,z1); A.blocker(x0,x1,z0,z1,4.40); }

  function skyline(A,c,x,z,w,tag='城市景观'){
    const {box,capsule,luminous}=A;
    box(x,1.95,z,w,2.48,.12,c.bronzeD,{hard:true,gloss:.56,tag});
    luminous(box(x,1.95,z-.068,w-.16,2.30,.026,c.glassD,
      {hard:true,mode:1,gloss:.82,tag}),.010,.045);
    const n=Math.max(6,Math.floor(w/.8));
    for(let i=0;i<n;i++){
      const px=x-w*.45+(i+.4)*w*.9/n,bh=.30+((i*13+7)%7)*.14;
      box(px,.69+bh*.5,z-.095,w/n*.60,bh,.018,i%3?c.ink:c.blue,
        {hard:true,mode:1,glow:i%5===0?.05:.006,tag});
      if(i%4===1)box(px,.74+bh*.58,z-.110,w/n*.14,.045,.012,c.warm,
        {hard:true,mode:1,glow:.14,tag});
    }
    for(let i=1;i<4;i++)capsule(x-w*.5+i*w/4,1.95,z-.105,.022,2.22,.022,c.bronzeL,
      {gloss:.68,tag});
  }

  function curtains(A,c,x,z,w,tag='窗帘'){
    const {box,capsule}=A;
    box(x,3.37,z,w+.32,.18,.22,c.walnutD,{...MAT.timber,mode:7,gloss:.29,tag});
    capsule(x,3.26,z-.05,.034,w+.12,.034,c.bronze,{rz:Math.PI/2,gloss:.70,tag});
    for(const s of [-1,1])for(let i=0;i<4;i++){
      const px=x+s*(w*.26+i*.13);
      box(px,1.81,z-.09,.22,2.74,.08,i%2?c.silk:c.silkL,
        {...MAT.cloth,mode:7,gloss:.025,tag});
      capsule(px,3.22,z-.09,.014,.11,.014,c.bronzeL,{tag});
    }
  }

  function pendant(A,c,x,z,accent=c.celadon,tag='灯'){
    const {cyl,capsule,taper,ball,luminous}=A;
    cyl(x,4.16,z,.19,.10,c.walnutD,{gloss:.30,tag});
    cyl(x,4.08,z,.14,.06,c.bronzeD,{gloss:.64,tag});
    capsule(x,3.78,z,.024,.58,.024,c.bronze,{gloss:.68,tag});
    // Opaque. At alpha .88 the shade was 12% transparent and nobody could see it, but it took
    // the prop out of its batch (build.js only batches at alpha >= .999) and cost a draw call
    // per pendant — eight of them on this floor for no visible gain.
    taper(x,3.43,z,.24,.28,.24,c.silkL,{...MAT.cloth,mode:7,gloss:.04,tag});
    luminous(ball(x,3.41,z,.10,.13,.10,c.warm,{mode:1,tag}),.05,.30);
    cyl(x,3.20,z,.20,.07,accent,{gloss:.25,tag});
  }

  function plant(A,c,x,z,r=.48,tag='绿植'){
    const {taper,capsule,ball}=A;
    taper(x,.27,z,r,r*.58,r,c.limestone,{...MAT.stone,mode:7,gloss:.18,tag});
    cylFoot(A,c,x,z,r,tag);
    capsule(x,.82,z,.055,1.02,.055,c.walnutD,{tag});
    for(let i=0;i<7;i++){
      const a=i/7*TAU;
      ball(x+Math.sin(a)*r*.58,1.18+(i%2)*.15,z+Math.cos(a)*r*.58,
        r*.42,r*.55,r*.24,c.green,{mode:15,gloss:.08,tag});
    }
  }

  function cylFoot(A,c,x,z,r,tag){
    A.cyl(x,.035,z,r*.70,.07,c.bronzeD,{gloss:.58,tag});
  }

  function chair(A,c,x,z,yaw=0,accent=c.celadon,tag='椅子'){
    const {shade}=A,{modelOr}=A.B;
    modelOr('chinese_armchair',x,0,z,.83,{ry:yaw,tag,gloss:.24},()=>{
      const {box,capsule,ball}=A;
      const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
      box(x,.42,z,.64,.14,.64,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.29,tag});
      box(x,.52,z,.71,.18,.72,accent,{...MAT.cloth,ry:yaw,mode:7,gloss:.03,tag});
      const bp=at(0,-.31);
      box(bp[0],.91,bp[1],.74,.80,.14,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.30,tag});
      const bi=at(0,-.30);
      box(bi[0],.91,bi[1],.58,.63,.075,c.silkL,{...MAT.cloth,ry:yaw,mode:7,gloss:.025,tag});
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const p=at(sx*.25,sz*.22);capsule(p[0],.22,p[1],.035,.44,.035,c.bronzeD,{tag});
      }
      for(const s of [-1,1]){
        const a=at(s*.34,.02);capsule(a[0],.70,a[1],.040,.46,.040,c.walnutL,{tag});
        ball(a[0],.84,a[1],.09,.08,.22,accent,{...MAT.cloth,ry:yaw,mode:7,gloss:.025,tag});
      }
      const crest=at(0,-.39);
      capsule(crest[0],1.31,crest[1],.028,.65,.028,c.bronzeL,
        {rz:Math.PI/2,ry:yaw,gloss:.70,tag});
    });
    shade(x,z,.84,.84,.18);
  }

  function desk(A,c,x,z,w=1.75,yaw=0,tag='书桌'){
    const {box,capsule,cyl,shade}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,.74,z,w,.15,.72,c.walnut,{...MAT.timber,ry:yaw,mode:7,gloss:.32,tag});
    box(x,.835,z,w-.12,.035,.58,c.limestoneL,{...MAT.stone,ry:yaw,mode:7,gloss:.19,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const p=at(sx*w*.40,sz*.24);capsule(p[0],.35,p[1],.042,.70,.042,c.bronzeD,{tag});
      cyl(p[0],.035,p[1],.075,.07,c.bronzeD,{gloss:.58,tag});
    }
    const lip=at(0,-.365);capsule(lip[0],.79,lip[1],.025,w*.87,.025,c.bronzeL,
      {rz:Math.PI/2,ry:yaw,gloss:.70,tag});
    // Laptop, notebook, pen cup and power grommet all contact the worktop.
    const lp=at(-w*.15,.02);
    box(lp[0],.89,lp[1],.62,.035,.42,c.ink,{...MAT.stone,ry:yaw,mode:7,gloss:.38,tag:'笔记本电脑'});
    box(lp[0],1.14,lp[1]+.19,.62,.48,.025,c.glassD,
      {ry:yaw,rx:-.32,mode:1,glow:.035,gloss:.74,tag:'笔记本电脑'});
    const np=at(w*.25,-.02);box(np[0],.88,np[1],.34,.035,.46,c.silkL,
      {...MAT.cloth,ry:yaw+.08,mode:7,gloss:.03,tag:'笔记本'});
    const cp=at(w*.38,.15);cyl(cp[0],.90,cp[1],.09,.12,c.celadon,{gloss:.28,tag:'笔筒'});
    for(const s of [-1,0,1])capsule(cp[0]+s*.025,1.08,cp[1],.009,.28,.009,
      s?c.walnutD:c.lacquer,{rz:s*.08,tag:'笔'});
    shade(x,z,w+.18,.92,.20);
  }

  function bed(A,c,x,z,w=2.20,accent=c.celadon,tag='睡眠区'){
    const {box,capsule,cyl,ball,shade}=A;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cyl(x+sx*w*.39,.07,z+sz*.82,.085,.14,c.bronzeD,{gloss:.58,tag});
      ball(x+sx*w*.39,.025,z+sz*.82,.10,.045,.10,c.bronzeD,{tag});
    }
    box(x,.23,z,w,.36,2.14,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    box(x,.44,z,w-.05,.18,2.06,c.silk,{...MAT.cloth,mode:7,gloss:.03,tag});
    box(x,.60,z,w-.10,.28,2.01,c.white,{...MAT.stone,mode:7,gloss:.025,tag});
    box(x,.73,z-.18,w-.02,.21,1.50,accent,{...MAT.cloth,mode:7,gloss:.025,tag});
    capsule(x,.71,z-.86,.095,w-.12,.095,c.white,{rz:Math.PI/2,gloss:.025,tag});
    box(x,1.29,z+.99,w+.30,1.70,.18,c.walnutD,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,1.30,z+.885,w+.10,1.48,.055,c.bronze,{hard:true,gloss:.67,tag});
    box(x,1.30,z+.845,w,1.38,.045,c.silkL,{...MAT.cloth,mode:7,gloss:.03,tag});
    for(const s of [-1,1])box(x+s*w*.24,.90,z+.54,w*.41,.23,.44,c.white,
      {...MAT.stone,mode:7,gloss:.02,tag});
    capsule(x-w*.08,.94,z+.27,.105,w*.48,.105,accent,
      {rz:Math.PI/2,gloss:.025,tag});
    for(const yy of [1.09,1.47])for(const s of [-1,0,1])
      ball(x+s*w*.27,yy,z+.79,.034,.034,.020,s===0?c.bronzeL:c.walnutL,
        {mode:1,gloss:.45,tag});
    shade(x,z,w+.20,2.34,.28);
  }

  function nightstand(A,c,x,z,tag='床头柜'){
    const {box,cyl,capsule,taper,ball,luminous}=A;
    box(x,.055,z,.55,.11,.50,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.31,z,.64,.46,.56,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,.59,z,.70,.08,.62,c.limestone,{...MAT.stone,mode:7,gloss:.20,tag});
    box(x,.33,z-.294,.49,.22,.025,c.walnutL,{hard:true,gloss:.29,tag});
    capsule(x,.33,z-.319,.022,.19,.022,c.bronzeL,{rz:Math.PI/2,gloss:.72,tag});
    cyl(x,.66,z,.16,.08,c.bronzeD,{gloss:.62,tag});
    capsule(x,.90,z,.032,.46,.032,c.bronze,{gloss:.68,tag});
    taper(x,1.22,z,.40,.40,.40,c.silkL,{...MAT.cloth,mode:7,gloss:.04,tag});
    luminous(ball(x,1.18,z,.075,.095,.075,c.warm,{mode:1,tag}),.035,.28);
    ball(x,1.49,z,.042,.052,.042,c.bronzeL,{gloss:.70,tag});
  }

  function daybed(A,c,x,z,w=2.55,tag='窗边榻'){
    const {box,capsule,shade}=A;
    box(x,.055,z,w*.92,.11,1.05,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.34,z,w,.58,1.16,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    for(let i=0;i<3;i++){
      const px=x-w*.29+i*w*.29;
      box(px,.34,z+.59,w*.25,.34,.025,i%2?c.celadon:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.25,tag});
      capsule(px,.34,z+.615,.021,w*.08,.021,c.bronzeL,
        {rz:Math.PI/2,gloss:.70,tag});
    }
    box(x,.69,z,w+.02,.18,1.20,c.silk,{...MAT.cloth,mode:7,gloss:.03,tag});
    box(x,1.03,z+.48,w-.12,.62,.18,c.walnutD,{...MAT.timber,mode:7,gloss:.29,tag});
    box(x,1.03,z+.43,w-.30,.45,.08,c.silkL,{...MAT.cloth,mode:7,gloss:.025,tag});
    for(const s of [-1,1])box(x+s*w*.28,.91,z+.17,w*.42,.38,.25,
      s<0?c.celadonL:c.oatmeal,{...MAT.cloth,mode:7,gloss:.025,tag});
    capsule(x,.77,z-.57,.036,w*.82,.036,c.bronzeL,{rz:Math.PI/2,gloss:.68,tag});
    shade(x,z,w+.22,1.44,.25);
  }

  function sofa(A,c,x,z,w=3.15,yaw=0,accent=c.celadon,tag='起居室'){
    const {box,capsule,shade}=A;
    box(x,.055,z,w*.90,.11,1.12,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.27,tag});
    box(x,.31,z,w,.18,1.10,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.29,tag});
    for(const s of [-1,1]){
      box(x+s*w*.235,.50,z-.03,w*.45,.26,1.05,s<0?accent:c.silk,
        {...MAT.cloth,ry:yaw+s*.018,mode:7,gloss:.025,tag});
      box(x+s*w*.235,.88,z+.43,w*.44,.58,.20,s<0?c.silkL:accent,
        {...MAT.cloth,ry:yaw-s*.022,mode:7,gloss:.025,tag});
      capsule(x+s*w*.49,.66,z,.12,.72,.12,c.walnutL,
        {rx:Math.PI/2,ry:yaw,gloss:.31,tag});
    }
    capsule(x,.77,z+.54,.030,w*.91,.030,c.bronzeL,
      {rz:Math.PI/2,ry:yaw,gloss:.68,tag});
    capsule(x-w*.28,.84,z+.10,.11,w*.22,.11,c.oatmeal,
      {rz:Math.PI/2,ry:yaw,gloss:.025,tag});
    shade(x,z,w+.25,1.45,.28);
  }

  function roundTable(A,c,x,z,r=.68,tag='餐桌'){
    const {cyl,capsule,shade}=A;
    cyl(x,.055,z,r*.46,.11,c.bronzeD,{gloss:.58,tag});
    capsule(x,.37,z,.095,.64,.095,c.bronzeD,{gloss:.60,tag});
    cyl(x,.73,z,r,.14,c.walnut,{gloss:.32,tag});
    cyl(x,.815,z,r*.84,.035,c.limestoneL,{gloss:.23,tag});
    cyl(x,.845,z,r*.30,.018,c.celadonL,{gloss:.38,tag});
    shade(x,z,r*2.20,r*2.20,.20);
  }

  function teaSet(A,c,x,z,surface=.86,tag='欢迎茶'){
    const {box,cyl,taper,capsule,ball}=A;
    box(x,surface+.016,z,.86,.030,.42,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    const px=x+.16;
    taper(px,surface+.13,z,.15,.17,.15,c.celadonL,{...MAT.cloth,mode:7,gloss:.34,tag});
    cyl(px,surface+.23,z,.12,.032,c.celadon,{gloss:.31,tag});
    ball(px,surface+.267,z,.032,.032,.032,c.bronzeL,{gloss:.70,tag});
    capsule(px+.17,surface+.15,z,.026,.22,.026,c.bronzeD,{rz:Math.PI/2,tag});
    for(const s of [-1,1]){
      const q=x-.22+s*.13;cyl(q,surface+.052,z,.09,.022,c.bronzeL,{gloss:.62,tag});
      taper(q,surface+.102,z,.062,.072,.062,c.white,{...MAT.stone,mode:7,gloss:.28,tag});
    }
  }

  function kitchenette(A,c,x,z,w=3.0,yaw=0,tag='厨房'){
    const {box,cyl,capsule,taper,ball}=A;
    // Toe-kick, framed doors and stone worktop make a believable compact galley.
    box(x,.055,z,w*.94,.11,.68,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.27,tag});
    box(x,.44,z,w,.78,.72,c.walnut,{...MAT.timber,ry:yaw,mode:7,gloss:.31,tag});
    box(x,.865,z,w+.10,.07,.80,c.limestoneL,{...MAT.stone,ry:yaw,mode:7,gloss:.22,tag});
    for(let i=0;i<4;i++){
      const px=x-w*.36+i*w*.24;
      box(px,.45,z-.375,w*.205,.53,.026,i%2?c.walnutL:c.celadon,
        {...MAT.cloth,hard:true,ry:yaw,mode:7,gloss:.27,tag});
      capsule(px,.45,z-.402,.022,w*.065,.022,c.bronzeL,
        {rz:Math.PI/2,ry:yaw,gloss:.72,tag});
    }
    // Induction hob, inset basin, faucet, kettle, chopping board and herb pot.
    box(x-w*.27,.91,z-.04,w*.30,.025,.46,c.ink,{ry:yaw,mode:1,gloss:.62,tag:'电磁炉'});
    for(const s of [-1,1])cyl(x-w*(.31+s*.08),.93,z-.04,.095,.012,c.bronzeD,
      {gloss:.62,tag:'电磁炉'});
    cyl(x+w*.14,.90,z-.03,.25,.045,c.steel,{gloss:.46,tag:'水槽'});
    capsule(x+w*.14,1.12,z+.14,.032,.38,.032,c.bronze,{gloss:.69,tag:'水龙头'});
    capsule(x+w*.26,1.25,z+.14,.030,.25,.030,c.bronze,
      {rx:Math.PI/2,gloss:.69,tag:'水龙头'});
    taper(x+w*.36,1.05,z-.06,.15,.20,.15,c.celadonL,{...MAT.cloth,mode:7,gloss:.33,tag:'热水壶'});
    ball(x+w*.36,1.18,z-.06,.032,.032,.032,c.bronzeL,{tag:'热水壶'});
    box(x,1.70,z+.30,w,1.12,.34,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.30,tag:'吊柜'});
    for(let i=0;i<3;i++){
      const px=x-w*.30+i*w*.30;
      box(px,1.70,z+.11,w*.275,.88,.025,i===1?c.celadonL:c.walnutL,
        {...MAT.cloth,hard:true,ry:yaw,mode:7,gloss:.27,tag:'吊柜'});
      capsule(px,1.70,z+.083,.022,.22,.022,c.bronzeL,{gloss:.72,tag:'吊柜'});
    }
    cyl(x+w*.05,.93,z-.12,.21,.020,c.bronzeD,{gloss:.59,tag:'砧板'});
    taper(x+w*.46,.99,z+.16,.13,.18,.13,c.limestone,{...MAT.stone,mode:7,gloss:.18,tag:'香草'});
    for(let i=0;i<5;i++)ball(x+w*.46+(i-2)*.035,1.15+(i%2)*.06,z+.16,.065,.09,.035,c.green,
      {mode:15,gloss:.08,tag:'香草'});
  }

  function compactBath(A,c,x,z,w,d,tag='浴室'){
    const {box,cyl,capsule,ball,flat,luminous}=A;
    flat(x,.022,z,w,d,c.limestoneL,{...MAT.stone,mode:7,gloss:.20,tag});
    // Vanity and mirror fixed to the north wall.
    const vx=x-w*.20,north=z+d*.47;
    box(vx,.055,north-.35,w*.38,.11,.60,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(vx,.42,north-.35,w*.43,.70,.68,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(vx,.80,north-.35,w*.47,.08,.74,c.limestone,{...MAT.stone,mode:7,gloss:.23,tag});
    cyl(vx,.85,north-.38,.23,.06,c.white,{gloss:.34,tag});
    capsule(vx,1.05,north-.23,.030,.34,.030,c.bronze,{gloss:.69,tag});
    capsule(vx+.11,1.18,north-.23,.028,.22,.028,c.bronze,{rx:Math.PI/2,tag});
    box(vx,1.88,north-.07,w*.44,1.50,.075,c.bronzeD,{hard:true,gloss:.62,tag});
    box(vx,1.88,north-.12,w*.37,1.32,.024,c.glassD,
      {hard:true,mode:1,alpha:.74,gloss:.88,tag});
    for(const s of [-1,1]){
      const lx=vx+s*w*.25;luminous(ball(lx,1.90,north-.23,.10,.15,.10,c.warm,
        {mode:1,tag}),.035,.25);
      capsule(lx,1.90,north-.14,.025,.18,.025,c.bronze,{rx:Math.PI/2,tag});
    }
    // Rounded soaking tub on a dark plinth.
    const tx=x+w*.19,tz=z-d*.17,tw=w*.42,td=d*.42;
    box(tx,.07,tz,tw*.88,.14,td*.86,c.walnutD,{...MAT.timber,mode:7,gloss:.26,tag});
    box(tx,.35,tz,tw,.56,td,c.white,{...MAT.stone,mode:7,gloss:.30,tag});
    for(const s of [-1,1]){
      box(tx+s*tw*.47,.65,tz,.09,.10,td+.07,c.limestone,{...MAT.stone,mode:7,gloss:.25,tag});
      box(tx,.65,tz+s*td*.47,tw+.07,.10,.09,c.limestone,{...MAT.stone,mode:7,gloss:.25,tag});
    }
    box(tx,.625,tz,tw*.78,.065,td*.70,c.water,{mode:1,alpha:.74,gloss:.84,tag});
    capsule(tx+tw*.30,.91,tz+td*.37,.032,.42,.032,c.bronze,{gloss:.70,tag});
    capsule(tx+tw*.18,1.08,tz+td*.37,.030,.31,.030,c.bronze,
      {rz:Math.PI/2,gloss:.70,tag});
    // Complete towel rail with brackets and towels.
    capsule(x,1.25,north-.14,.030,w*.30,.030,c.bronze,{rz:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])capsule(x+s*w*.15,1.25,north-.08,.022,.13,.022,c.bronzeD,
      {rx:Math.PI/2,tag});
    for(const s of [-1,1])box(x+s*w*.07,.98,north-.16,w*.12,.50,.055,c.white,
      {...MAT.stone,mode:7,gloss:.02,tag:'毛巾'});
  }

  function bookshelf(A,c,x,z,w=2.8,yaw=0,tag='书架'){
    const {box,capsule}=A;
    box(x,.055,z,w*.94,.11,.52,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.27,tag});
    box(x,1.48,z,w,2.86,.54,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.31,tag});
    for(const y of [.18,.84,1.50,2.16,2.82])box(x,y,z,w-.16,.08,.60,c.walnutL,
      {...MAT.timber,ry:yaw,mode:7,gloss:.30,tag});
    for(let row=0;row<4;row++)for(let i=0;i<9;i++){
      const px=x-w*.40+i*w*.10,hh=.29+((i+row*3)%3)*.06;
      box(px,.25+row*.66+hh*.5,z-.32,w*.073,hh,.18,
        (i+row)%5===0?c.lacquer:(i%3===0?c.celadonL:c.silk),
        {...MAT.cloth,ry:yaw,mode:7,gloss:.04,tag:'书'});
      if(i%4===0)box(px,.25+row*.66+hh+.025,z-.33,w*.078,.018,.19,c.bronzeL,
        {ry:yaw,hard:true,gloss:.66,tag:'书'});
    }
    for(const s of [-1,1])capsule(x+s*w*.46,1.48,z-.31,.026,2.65,.026,c.bronze,
      {gloss:.68,tag});
  }

  function phoneBooth(A,c,x,z,tag='电话间'){
    const {box,capsule,ball,luminous}=A;
    box(x,.055,z,1.48,.11,1.26,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    for(const sx of [-1,1])for(const sz of [-1,1])capsule(x+sx*.69,1.58,z+sz*.56,
      .035,3.08,.035,c.bronzeD,{gloss:.66,tag});
    for(const side of [-1,1])box(x+side*.72,1.58,z,.045,2.92,1.20,c.glass,
      {hard:true,mode:1,alpha:.22,gloss:.76,tag});
    box(x,1.58,z+.59,1.42,2.92,.045,c.glass,{hard:true,mode:1,alpha:.22,gloss:.76,tag});
    box(x,3.10,z,1.48,.14,1.26,c.walnutD,{...MAT.timber,mode:7,gloss:.30,tag});
    luminous(ball(x,2.83,z,.11,.11,.11,c.warm,{mode:1,tag}),.045,.25);
    box(x,.89,z+.45,.82,.08,.25,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag:'电话台'});
    capsule(x,.62,z+.45,.045,.54,.045,c.bronzeD,{gloss:.62,tag:'电话台'});
    box(x,.97,z+.35,.36,.12,.16,c.ink,{...MAT.stone,mode:7,gloss:.28,tag:'电话'});
    ball(x-.17,1.06,z+.32,.07,.11,.07,c.ink,{...MAT.stone,mode:7,gloss:.24,tag:'听筒'});
  }

  function printer(A,c,x,z,tag='打印台'){
    const {box,capsule,ball}=A;
    box(x,.055,z,1.55,.11,.64,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.47,z,1.65,.82,.70,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    for(const s of [-1,1]){
      box(x+s*.40,.46,z-.37,.68,.54,.026,s<0?c.walnutL:c.celadon,
        {...MAT.cloth,hard:true,mode:7,gloss:.26,tag});
      capsule(x+s*.40,.46,z-.397,.022,.19,.022,c.bronzeL,
        {rz:Math.PI/2,gloss:.72,tag});
    }
    box(x,.96,z,1.16,.18,.58,c.ink,{...MAT.stone,mode:7,gloss:.28,tag:'打印机'});
    box(x,1.13,z+.08,.92,.22,.48,c.white,{...MAT.stone,mode:7,gloss:.24,tag:'打印机'});
    box(x,1.19,z-.22,.58,.055,.18,c.glassD,{hard:true,mode:1,glow:.025,tag:'打印机'});
    for(let i=0;i<3;i++)ball(x+.24+i*.10,1.19,z-.25,.018,.018,.010,
      i===0?c.celadonL:c.bronzeL,{mode:1,glow:.035,tag:'打印机'});
    box(x,1.35,z+.10,.70,.035,.62,c.white,{...MAT.stone,ry:-.05,mode:7,gloss:.02,tag:'文件'});
  }

  function breakfastIsland(A,c,x,z,tag='早餐吧台'){
    const {box,cyl,capsule,taper,ball}=A;
    box(x,.055,z,5.25,.11,1.18,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.48,z,5.35,.84,1.25,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,.93,z,5.52,.08,1.40,c.limestoneL,{...MAT.stone,mode:7,gloss:.23,tag});
    for(let i=0;i<5;i++){
      const px=x-2.05+i*1.02;
      box(px,.48,z-.64,.82,.56,.026,i%2?c.celadon:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.26,tag});
      capsule(px,.48,z-.668,.023,.21,.023,c.bronzeL,
        {rz:Math.PI/2,gloss:.72,tag});
    }
    // Pastry domes, fruit bowl and breakfast mise-en-place sit on the stone cap.
    for(const [i,px] of [-1.78,-.92,.02].entries()){
      cyl(x+px,1.00,z,.31,.045,c.bronzeL,{gloss:.62,tag:'早餐'});
      taper(x+px,1.14,z,.27,.23,.27,c.glass,{mode:1,alpha:.28,gloss:.78,tag:'早餐'});
      for(let j=0;j<3;j++)ball(x+px+(j-1)*.12,1.07,z,
        .09,.055,.12,j%2?c.oatmeal:c.rose,{...MAT.cloth,mode:7,gloss:.05,tag:'早餐'});
      ball(x+px,1.29,z,.035,.035,.035,c.bronzeL,{gloss:.70,tag:'早餐'});
    }
    cyl(x+1.25,1.01,z,.34,.045,c.celadonL,{gloss:.34,tag:'水果'});
    for(let i=0;i<7;i++){
      const a=i/7*TAU;ball(x+1.25+Math.sin(a)*.18,1.11+(i%2)*.05,z+Math.cos(a)*.13,
        .11,.09,.11,i%3===0?c.rose:(i%3===1?c.green:c.oatmeal),{...MAT.cloth,mode:7,gloss:.10,tag:'水果'});
    }
    box(x+2.04,1.03,z,.48,.10,.62,c.walnutD,{...MAT.timber,mode:7,gloss:.29,tag:'餐具'});
    for(let i=0;i<5;i++)taper(x+1.88+i*.08,1.13,z,.055,.15,.055,c.white,
      {...MAT.stone,mode:7,gloss:.28,tag:'餐具'});
  }

  function coffeeStation(A,c,x,z,tag='咖啡机'){
    const {box,cyl,capsule,taper,ball,luminous}=A;
    box(x,.055,z,2.65,.11,.72,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.48,z,2.75,.84,.78,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,.93,z,2.86,.08,.84,c.limestoneL,{...MAT.stone,mode:7,gloss:.23,tag});
    box(x,1.27,z,1.02,.66,.56,c.ink,{...MAT.stone,mode:7,gloss:.32,tag});
    box(x,1.56,z-.18,.82,.22,.15,c.glassD,{hard:true,mode:1,glow:.035,tag});
    for(const s of [-1,1]){
      capsule(x+s*.22,1.02,z-.22,.028,.24,.028,c.bronzeL,{gloss:.70,tag});
      taper(x+s*.22,1.03,z-.31,.085,.12,.085,c.white,{...MAT.stone,mode:7,gloss:.28,tag:'咖啡杯'});
      cyl(x+s*.22,.96,z-.31,.105,.025,c.bronzeL,{gloss:.62,tag:'咖啡杯'});
    }
    cyl(x+.42,1.31,z+.15,.15,.20,c.celadonL,{gloss:.33,tag:'咖啡豆'});
    luminous(ball(x-.40,1.56,z-.27,.018,.018,.010,c.celadonL,
      {mode:1,tag}),.08,.22);
    for(let i=0;i<4;i++)taper(x+1.00+i*.17,1.08,z,.070,.14,.070,c.white,
      {...MAT.stone,mode:7,gloss:.28,tag:'咖啡杯'});
  }

  function laundryMachine(A,c,x,z,label='洗衣机'){
    const {box,cyl,ball,capsule}=A;
    box(x,.055,z,1.32,.11,1.06,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag:label});
    box(x,.89,z,1.40,1.66,1.14,c.white,{...MAT.stone,mode:7,gloss:.26,tag:label});
    box(x,1.47,z-.585,1.20,.31,.030,c.steel,{hard:true,gloss:.44,tag:label});
    cyl(x,.77,z-.595,.44,.08,c.bronzeD,{rx:Math.PI/2,gloss:.62,tag:label});
    cyl(x,.77,z-.640,.35,.025,c.glassD,
      {rx:Math.PI/2,mode:1,alpha:.68,gloss:.84,tag:label});
    ball(x-.10,.78,z-.663,.16,.13,.020,c.celadon,{mode:7,alpha:.65,tag:'衣物'});
    ball(x+.12,.72,z-.663,.18,.12,.020,c.silk,{mode:7,alpha:.65,tag:'衣物'});
    for(let i=0;i<3;i++)ball(x-.38+i*.20,1.48,z-.624,.035,.035,.020,
      i===0?c.lacquer:c.bronzeL,{mode:1,glow:i?0:.025,tag:label});
    capsule(x+.43,1.48,z-.630,.025,.18,.025,c.ink,{rz:Math.PI/2,tag:label});
  }

  function foldTable(A,c,x,z,w=2.80,yaw=0,tag='叠衣台'){
    const {box,capsule,cyl}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,.77,z,w,.15,1.05,c.walnut,{...MAT.timber,ry:yaw,mode:7,gloss:.31,tag});
    box(x,.87,z,w-.16,.035,.88,c.limestoneL,{...MAT.stone,ry:yaw,mode:7,gloss:.22,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const p=at(sx*w*.39,sz*.36);
      capsule(p[0],.38,p[1],.045,.76,.045,c.bronzeD,{tag});
      cyl(p[0],.035,p[1],.08,.07,c.bronzeD,{gloss:.58,tag});
    }
    for(let stack=0;stack<3;stack++)for(let i=0;i<3;i++){
      const p=at(-w*.30+stack*w*.30,0);
      box(p[0],.92+i*.075,p[1],w*.23,.07,.62,
        (stack+i)%3===0?c.celadonL:(stack%2?c.white:c.silkL),
        {...MAT.cloth,ry:yaw,mode:7,gloss:.02,tag:'叠好的衣物'});
    }
  }

  // Back-of-house shelving: a painted steel bay of open shelves stacked with folded bed linen.
  function linenRack(A,c,x,z,w=2.30,yaw=0,tag='布草间'){
    const {box,capsule}=A;
    for(const s of [-1,1])for(const t of [-1,1])
      capsule(x+s*w*.46,1.05,z+t*.26,.032,2.10,.032,c.steel,{ry:yaw,gloss:.44,tag});
    for(let i=0;i<5;i++){
      const y=.28+i*.44;
      box(x,y,z,w,.045,.58,c.steel,{ry:yaw,gloss:.40,tag});
      for(let j=0;j<3;j++){
        const px=x-w*.32+j*w*.32,n=2+((i*3+j)%3);
        for(let k=0;k<n;k++)box(px,y+.075+k*.085,z,w*.26,.08,.50,
          (i+j+k)%3===0?c.celadonL:((j+k)%2?c.white:c.silkL),
          {...MAT.cloth,ry:yaw,mode:7,gloss:.02,tag:'备用床品'});
      }
    }
    box(x,2.28,z,w+.08,.10,.62,c.steel,{ry:yaw,gloss:.42,tag});
  }

  // Housekeeping trolley: bagged linen, stacked towels and amenity trays on a pushed frame.
  function linenCart(A,c,x,z,yaw=0,tag='客房服务'){
    const {box,cyl,capsule,ball}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,.52,z,1.24,.62,.66,c.steel,{ry:yaw,gloss:.40,tag});
    box(x,.86,z,1.30,.06,.72,c.walnutL,{...MAT.timber,ry:yaw,mode:7,gloss:.30,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const p=at(sx*.50,sz*.26);
      capsule(p[0],.15,p[1],.030,.24,.030,c.bronzeD,{gloss:.52,tag});
      cyl(p[0],.045,p[1],.075,.09,c.ink,{rz:Math.PI/2,gloss:.34,tag});
    }
    for(const s of [-1,1]){
      const h=at(s*.68,0);
      capsule(h[0],.66,h[1],.026,1.02,.026,c.bronzeD,{gloss:.56,tag});
    }
    const bar=at(0,-.36);
    capsule(bar[0],1.14,bar[1],.026,1.30,.026,c.bronzeD,{rz:Math.PI/2,ry:yaw,gloss:.58,tag});
    for(let i=0;i<3;i++)box(x-.40+i*.40,1.00,z,.34,.22,.52,
      i%2?c.white:c.celadonL,{...MAT.cloth,ry:yaw,mode:7,gloss:.02,tag:'备用床品'});
    const bag=at(.44,.10);
    ball(bag[0],.60,bag[1],.30,.46,.30,c.silkL,{mode:15,gloss:.03,tag});
    capsule(bag[0],.86,bag[1],.030,.30,.030,c.bronzeD,{rz:Math.PI/2,ry:yaw,tag});
  }

  function yogaMat(A,c,x,z,colour,tag='瑜伽垫'){
    const {box,capsule,ball}=A;
    box(x,.035,z,.92,.055,2.24,colour,{...MAT.cloth,mode:7,gloss:.025,tag});
    // The rolled end stays in the textile colour. A bright bronze capsule looked like a loose
    // handrail across the mat from lateral views rather than a supported roll of fabric.
    capsule(x,.085,z-1.04,.065,.82,.065,colour,{rz:Math.PI/2,gloss:.035,tag});
    for(const s of [-1,1])ball(x+s*.29,.09,z-.02,.045,.045,.025,c.silkL,
      {mode:1,gloss:.025,tag:'定位标记'});
  }

  function thing(A,hz,x,z,focus,zh,en,note,reach=1.9){
    return A.thing(hz,x,1.25,z,zh,en,note,{tag:hz,focus,reach});
  }

  HotelFit.register('hotel7', A => {
    const c=colours(A);
    const {box,cyl,ball,capsule,taper,flat,glyphs,solid,luminous}=A;

    // Honest chase-camera volumes follow the actual partitions. The nested 703 bathroom is
    // registered first so it wins over the larger residence while the player is inside it.
    if(A.cameraRoom){
      A.cameraRoom('hotel7-bath703',7.48,10.62,-14.28,-9.30,2.55);
      A.cameraRoom('hotel7-bedroom703',1.44,7.48,-14.28,-9.30,2.70);
      A.cameraRoom('hotel7-room701',-13.56,-6.24,-14.55,-5.16,3.10);
      A.cameraRoom('hotel7-room702',-6.06,1.26,-14.55,-5.16,3.05);
      // The living/dining camera volume stops at the new bedroom wall. Bedroom and bath own their
      // own volumes above; keeping a containing rectangle here would let an ordinary living-room
      // orbit cross the very partition the camera contract is meant to describe.
      A.cameraRoom('hotel7-room703',1.44,10.76,-9.21,-5.16,3.20);
      A.cameraRoom('hotel7-cowork',-13.96,-6.39,5.80,14.55,3.00);
      A.cameraRoom('hotel7-laundry',14.89,17.46,7.75,14.55,2.60);
      // Breakfast and the quiet room are now enclosed on three sides; both rectangles are pulled
      // back to the inner faces of the partitions that were built to match them.
      A.cameraRoom('hotel7-breakfast',1.44,8.46,5.82,14.70,3.10);
      A.cameraRoom('hotel7-quiet',-6.14,1.26,5.82,14.70,3.00);
      // The corridor ends where its walls now end: the service door at x=-14.05 and the lift-lobby
      // threshold that continues 703's east partition at x=10.85.
      A.cameraRoom('hotel7-residence-corridor',-13.90,10.70,-4.95,5.60,3.75);
      A.cameraRoom('hotel7-lift-landing',11.00,17.60,-10.15,5.55,3.55);
      // Two rooms the plan never named. The corridor's west door had to lead somewhere, and the
      // fire stair had to stay reachable without the guest corridor bleeding into the shell.
      A.cameraRoom('hotel7-linen',-17.74,-13.82,-14.70,-10.80,2.45);
      A.cameraRoom('hotel7-service-lobby',-17.74,-14.05,-10.62,5.44,2.85);
    }

    // ---------------------------------------------------------------- arrival and circulation
    // Wall-to-wall residential hall carpet replaces the former narrow runner, twin long stripes
    // and dashed cross-bars, which read as a roadway. A quiet perimeter border defines one broad
    // room-like field; three local woven medallions identify the apartment doors without lanes.
    // ---------------------------------------------------------------- the corridor's own walls
    // The eleven camera volumes above used to be the only evidence these rooms existed. Each line
    // in this block is one of them given thickness, an opening and a collider. `crossPartition`
    // and `partition` each emit a box AND a matching `solid`; the openings emit a head and jambs
    // and no solid at all, which is the only reason a doorway is a doorway.
    //
    // North side of the residence corridor, x -6.39 → 11.13 at z=5.72. The cowork room's two
    // legs and 3.42 m entrance already occupy x -13.97 → -6.39 further down this file.
    crossWallGaps(A,c,-6.39,11.13,5.72,[
      [-5.20,-1.40,'安静阅读'],   // quiet room, 3.80 m clear
      [2.70,6.50,'早餐吧'],       // breakfast room, 3.80 m clear
      [8.70,10.30,'服务通道'],    // the corridor's service door — see the note below
    ],'公寓厅北墙');
    // This 1.60 m gap was cut for the old published serviceSpine [[16,5.1],[9,5.1],[9,10]], whose
    // second leg crossed here at x=9. Measured 2026-08-08: that spine never worked on this floor.
    // Its FIRST leg, running west along z=5.1, is stopped by this floor's own east wall below —
    // `sideWallGaps(...,10.85,-5.16,5.72,[[-5.16,-2.40,...]])` leaves x=10.85 sealed across
    // z -2.40..5.72, so a 0.30 m body walking west at z=5.1 is blocked at x 10.50..11.20 and the
    // corridor was never enterable from the service lift along that line. The doorway was built
    // for a polyline that was already blocked. `js/hotel.js` now publishes a measured route for
    // hotel7 that reaches [9,10] around the EAST end of this wall instead, so this opening is no
    // longer on the published spine — it is still on the real walk, which enters the corridor
    // from the lift lobby through the 电梯厅 gap and leaves north through here.
    // Quiet room / breakfast room party wall, and the breakfast room's east wall against the
    // back-of-house zone. Their west and north sides are the cowork partition and the shell.
    partition(A,c,1.35,5.72,14.78,'早餐吧西墙');
    partition(A,c,8.55,5.72,14.78,'早餐吧东墙');
    // West end of the corridor: a single 1.30 m service door onto the stair lobby. Without it the
    // corridor ran straight out into eight metres of undressed shell.
    sideWallGaps(A,c,-14.05,-5.24,5.72,[[-4.35,-3.05,'服务通道']],'公寓厅西墙');
    // East end: the lift-lobby threshold, continuing 703's east partition northward so the wall
    // plane is unbroken from the south facade to the corridor's north wall.
    sideWallGaps(A,c,10.85,-5.16,5.72,[[-5.16,-2.40,'电梯厅']],'公寓厅东墙');

    // Back-of-house at the west end. The stair lobby holds HotelCore's fire stair; the linen room
    // is entered from it. Everything west of x=-17.82 and north of z=5.52 is riser and plant and
    // is both walled and filled, so no standable pocket is left behind a wall.
    crossWallGaps(A,c,-17.98,-13.56,-10.70,[[-16.55,-15.45,'布草间']],'布草间墙');
    sealWall(A,c,-17.98,-17.82,-14.78,-8.80,'西侧结构墙');
    sealWall(A,c,-17.98,-17.82,-5.40,5.60,'西侧结构墙');
    sealWall(A,c,-17.98,-14.05,5.52,5.68,'西北结构墙');
    sealZone(A,-21.78,-17.82,-14.78,-8.80);
    sealZone(A,-21.78,-17.82,-5.40,5.60);
    sealZone(A,-21.78,-13.97,5.52,14.78);
    // Riser bay behind the lift core, and the plant bay south of it. The passenger bank's own
    // collider already covers z -10.00 → 2.62; these close the ends it never reached.
    sealWall(A,c,18.87,19.03,-14.78,14.78,'电梯井后墙');
    sealZone(A,19.03,21.78,-14.78,14.78);
    sealWall(A,c,11.13,18.87,-10.46,-10.30,'东南结构墙');
    sealZone(A,11.13,18.87,-14.78,-10.46);
    crossPartition(A,c,17.55,18.87,7.66,'洗衣房东墙');
    sealZone(A,17.63,18.87,7.58,14.78);

    const hall={x0:-13.97,x1:10.77,z0:-5.02,z1:5.52};
    flat((hall.x0+hall.x1)/2,.022,(hall.z0+hall.z1)/2,
      hall.x1-hall.x0,hall.z1-hall.z0,c.carpet,
      {...MAT.cloth,mode:7,gloss:.035,tag:'七楼长住公寓'});
    flat((hall.x0+hall.x1)/2,.026,hall.z0+.08,hall.x1-hall.x0-.18,.055,c.bronzeD,
      {gloss:.58,tag:'七楼长住公寓'});
    flat((hall.x0+hall.x1)/2,.026,hall.z1-.08,hall.x1-hall.x0-.18,.055,c.bronzeD,
      {gloss:.58,tag:'七楼长住公寓'});
    flat(hall.x0+.08,.026,(hall.z0+hall.z1)/2,.055,hall.z1-hall.z0-.18,c.bronzeD,
      {gloss:.58,tag:'七楼长住公寓'});
    flat(hall.x1-.08,.026,(hall.z0+hall.z1)/2,.055,hall.z1-hall.z0-.18,c.bronzeD,
      {gloss:.58,tag:'七楼长住公寓'});
    const hallCx=(hall.x0+hall.x1)/2,hallCz=(hall.z0+hall.z1)/2;
    cyl(hallCx,.028,hallCz,1.55,.014,c.bronzeD,{gloss:.58,tag:'公寓厅地毯'});
    cyl(hallCx,.034,hallCz,1.40,.014,c.oatmeal,{gloss:.12,tag:'公寓厅地毯'});
    cyl(hallCx,.040,hallCz,1.10,.012,c.celadon,{gloss:.24,tag:'公寓厅地毯'});
    cyl(hallCx,.046,hallCz,.48,.010,c.silkL,{gloss:.10,tag:'公寓厅地毯'});
    for(let i=0;i<8;i++)flat(hallCx,.051,hallCz,.055,1.78,c.bronzeL,
      {ry:i*Math.PI/8,gloss:.60,tag:'公寓厅地毯'});
    for(const [x,accent] of [[-9.75,c.celadon],[-2.25,c.silk],[6.15,c.celadon]]){
      cyl(x,.028,-3.70,.72,.014,c.bronzeD,{gloss:.62,tag:'公寓门厅地毯'});
      cyl(x,.034,-3.70,.60,.014,c.limestoneL,{gloss:.20,tag:'公寓门厅地毯'});
      cyl(x,.040,-3.70,.30,.012,accent,{gloss:.30,tag:'公寓门厅地毯'});
      for(let i=0;i<4;i++)flat(x,.045,-3.70,.045,.92,c.bronzeL,
        {ry:i*Math.PI/4,gloss:.62,tag:'公寓门厅地毯'});
    }
    plaque(A,c,18.01,3.66,-.20,Math.PI/2,'七楼长住公寓','7F  SERVICED RESIDENCES',2.62,c.jade);
    // Rounded inlay and pendant define the arrival without narrowing the shared landing.
    cyl(14.05,.026,-3.68,1.32,.018,c.bronzeD,{gloss:.66,tag:'电梯厅'});
    cyl(14.05,.034,-3.68,1.12,.018,c.limestoneL,{gloss:.23,tag:'电梯厅'});
    cyl(14.05,.042,-3.68,.72,.018,c.celadon,{gloss:.36,tag:'电梯厅'});
    for(let i=0;i<8;i++)flat(14.05,.048,-3.68,.065,1.86,c.bronzeL,
      {ry:i*Math.PI/4,gloss:.68,tag:'电梯厅'});
    pendant(A,c,14.05,-3.68,c.celadon,'电梯厅灯');
    for(const z of [-5.34,1.14]){
      cyl(17.94,2.13,z,.14,.055,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'电梯厅'});
      capsule(17.74,2.13,z,.027,.28,.027,c.bronze,{rz:Math.PI/2,gloss:.68,tag:'电梯厅'});
      luminous(ball(17.55,2.13,z,.11,.16,.11,c.warm,{mode:1,tag:'电梯厅'}),.04,.26);
    }
    // A low console and plant form a home-like welcome point, outside both lift routes.
    box(12.35,.055,-.95,2.20,.11,.62,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag:'迎宾台'});
    box(12.35,.43,-.95,2.32,.70,.68,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag:'迎宾台'});
    box(12.35,.82,-.95,2.42,.08,.74,c.limestoneL,{...MAT.stone,mode:7,gloss:.22,tag:'迎宾台'});
    solid(11.12,13.58,-1.34,-.56);
    plant(A,c,11.55,-1.95,.42,'迎宾绿植');
    for(const s of [-1,1]){
      box(12.35+s*.55,.43,-1.32,.96,.46,.026,s<0?c.celadon:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.26,tag:'迎宾台'});
      capsule(12.35+s*.55,.43,-1.347,.023,.21,.023,c.bronzeL,
        {rz:Math.PI/2,gloss:.72,tag:'迎宾台'});
    }

    // Warm residential corridor ceiling rhythm and wall art. Every light has a canopy and hanger.
    for(const x of [-11.5,-7.5,-3.5,.5,4.5,8.5]){
      box(x,4.06,-4.94,3.10,.12,.12,c.walnutD,{hard:true,gloss:.29,tag:'走廊天花'});
      box(x,4.06,-2.40,3.10,.12,.12,c.walnutD,{hard:true,gloss:.29,tag:'走廊天花'});
      box(x,4.06,-3.67,.12,.12,2.66,c.walnutD,{hard:true,gloss:.29,tag:'走廊天花'});
      pendant(A,c,x,-3.67,(Math.round(x)&1)?c.celadon:c.silk,'走廊灯');
    }
    // Shallow framed silk panels keep the public face finished between apartment portals.
    for(const [x,w,accent] of [[-12.85,1.10,c.celadonL],[-6.10,.72,c.silkL],[-5.15,.72,c.celadonL],[1.70,.54,c.silkL],[10.45,.35,c.celadonL]]){
      // The corridor face of the south wall is z=-5.08. These used to be centred at -5.095, i.e.
      // buried in the wall and protruding into the flats; they now stand proud on the public side.
      box(x,1.56,-5.060,w,2.34,.040,c.walnutD,{hard:true,gloss:.31,tag:'走廊墙饰'});
      box(x,1.56,-5.032,w-.15,2.16,.022,accent,{hard:true,mode:1,gloss:.045,tag:'走廊墙饰'});
      capsule(x,1.56,-5.010,.022,Math.max(.28,w-.30),.022,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'走廊墙饰'});
    }
    // The corridor's new north wall gets the same treatment on its piers, so the four metres
    // between the quiet-room and breakfast openings is a finished surface rather than bare plaster.
    for(const [x,w,accent] of [[-12.92,1.30,c.silkL],[-7.42,1.20,c.celadonL],[-5.80,.86,c.silkL],
      [.65,1.60,c.celadonL],[7.60,1.10,c.silkL]]){
      box(x,1.56,5.620,w,2.34,.040,c.walnutD,{hard:true,gloss:.31,tag:'走廊墙饰'});
      box(x,1.56,5.592,w-.15,2.16,.022,accent,{hard:true,mode:1,gloss:.045,tag:'走廊墙饰'});
      capsule(x,1.56,5.570,.022,Math.max(.28,w-.30),.022,c.bronzeL,
        {rz:Math.PI/2,gloss:.68,tag:'走廊墙饰'});
    }

    // ---------------------------------------------------------------- three south residences
    const rooms=[
      {x0:-13.65,x1:-6.15,door:-9.75,label:'七零一'},
      {x0:-6.15,x1:1.35,door:-2.25,label:'七零二'},
      {x0:1.35,x1:10.85,door:6.15,label:'七零三'},
    ];
    for(const r of rooms){
      flat((r.x0+r.x1)/2,.020,-9.82,r.x1-r.x0,9.35,c.limestoneL,
        {...MAT.stone,mode:7,gloss:.14,tag:r.label});
      wallWithDoor(A,c,r.x0,r.x1,-5.16,r.door,r.label);
      box((r.x0+r.x1)/2,.10,-14.70,r.x1-r.x0-.16,.20,.10,c.walnutD,
        {hard:true,gloss:.28,tag:r.label});
      box((r.x0+r.x1)/2,3.08,-14.70,r.x1-r.x0-.16,.14,.12,c.walnutD,
        {hard:true,gloss:.28,tag:r.label});
      skyline(A,c,(r.x0+r.x1)/2,-14.72,r.x1-r.x0-.60,`${r.label}景观`);
      curtains(A,c,(r.x0+r.x1)/2,-14.62,r.x1-r.x0-.98,`${r.label}窗帘`);
      pendant(A,c,(r.x0+r.x1)/2,-10.00,r.label==='七零三'?c.silk:c.celadon,`${r.label}吊灯`);
    }
    partition(A,c,-13.65,-14.78,-5.16,'七零一外墙');
    partition(A,c,-6.15,-14.55,-5.16,'七零一隔墙');
    partition(A,c,1.35,-14.55,-5.16,'七零二隔墙');
    partition(A,c,10.85,-14.55,-5.16,'七零三隔墙');

    // 701: a complete studio with sleep, work, galley and a relaxed welcome-tea corner.
    bed(A,c,-10.85,-11.20,2.25,c.celadon,'七零一睡眠区');
    nightstand(A,c,-12.55,-10.98,'七零一床头柜');nightstand(A,c,-9.18,-10.98,'七零一床头柜');
    solid(-12.05,-9.65,-12.38,-10.02);
    desk(A,c,-8.00,-7.20,1.65,0,'七零一书桌');
    chair(A,c,-8.00,-6.18,Math.PI,c.celadonL,'七零一办公椅');
    solid(-8.88,-7.12,-7.64,-6.76);
    kitchenette(A,c,-12.10,-6.10,2.35,0,'七零一厨房');
    solid(-13.33,-10.87,-6.52,-5.67);
    roundTable(A,c,-10.00,-7.45,.52,'欢迎茶');teaSet(A,c,-10.00,-7.45,.87,'欢迎茶');
    chair(A,c,-10.00,-6.43,Math.PI,c.silkL,'七零一茶椅');
    solid(-10.58,-9.42,-8.03,-6.87);
    thing(A,'七零一睡眠区',-10.85,-10.85,[-10.85,-9.40],
      '服务式公寓的床每天由客房部整理。','The serviced-residence bed is made up daily.',
      '睡眠区 is the sleeping area.',2.1);
    thing(A,'七零一书桌',-8.00,-7.20,[-8.00,-6.25],
      '书桌适合处理长期项目。','The writing desk is prepared for long projects.',
      '书桌 is a writing desk.',1.6);
    thing(A,'七零一厨房',-12.10,-6.10,[-10.70,-6.55],
      '小厨房有电磁炉、水槽和齐全的餐具。','The kitchenette has an induction hob, sink and tableware.',
      '厨房 is a kitchen.',1.7);
    thing(A,'欢迎茶',-10.00,-7.45,[-10.00,-6.40],
      '住店管家准备了欢迎茶。','The residence host has prepared welcome tea.',
      '欢迎茶 is welcome tea.',1.5);

    // 702: a softer studio with its own galley, work desk and layered window daybed.
    bed(A,c,-3.72,-10.75,2.10,c.silk,'七零二睡眠区');
    nightstand(A,c,-5.18,-10.58,'七零二床头柜');nightstand(A,c,-2.18,-10.58,'七零二床头柜');
    solid(-4.84,-2.60,-11.95,-9.56);
    daybed(A,c,-.15,-12.95,2.30,'窗边榻');
    solid(-1.40,1.10,-13.64,-12.24);
    desk(A,c,-.10,-7.25,1.55,0,'七零二书桌');chair(A,c,-.10,-6.22,Math.PI,c.silkL,'七零二办公椅');
    solid(-.93,.73,-7.66,-6.82);
    kitchenette(A,c,-4.48,-6.08,1.55,0,'七零二厨房');
    solid(-5.30,-3.66,-6.52,-5.66);
    thing(A,'七零二睡眠区',-3.72,-10.50,[-3.72,-9.25],
      '七零二是安静的长住单间。','Residence 702 is a quiet long-stay studio.',
      '单间 is a studio.',2.0);
    thing(A,'七零二书桌',-.10,-7.25,[-.10,-6.28],
      '桌面有笔记本电脑、电源和文具。','The desk has a laptop, power and stationery.',
      '书桌 is a writing desk.',1.55);
    thing(A,'七零二厨房',-4.48,-6.08,[-3.45,-6.60],
      '单间厨房可以准备简单的一餐。','The studio galley can prepare a simple meal.',
      '厨房 is a kitchen.',1.55);
    thing(A,'窗边榻',-.15,-12.95,[-.15,-11.82],
      '坐在窗边榻上看看城市。','Sit on the window daybed and watch the city.',
      '窗边榻 is a window daybed.',1.65);

    // 703: a larger one-bedroom-style residence with living, dining, kitchen and stone bath.
    bed(A,c,4.05,-11.50,2.45,c.celadonL,'七零三主卧');
    nightstand(A,c,2.42,-11.28,'七零三床头柜');nightstand(A,c,5.72,-11.28,'七零三床头柜');
    solid(2.76,5.36,-12.74,-10.25);
    compactBath(A,c,9.10,-11.55,3.10,4.45,'七零三浴室');
    // 703 is an actual one-bedroom residence: a north bedroom wall has a generous framed door,
    // while the bath is a separately enclosed wet room entered through its west wall.
    wallWithDoor(A,c,1.35,7.48,-9.30,4.05,'七零三卧室','BEDROOM');
    crossPartition(A,c,7.48,10.85,-9.30,'七零三浴室墙');
    wallXWithDoor(A,c,7.48,-14.70,-9.30,-11.30,'七零三浴室','BATHROOM');
    // Vanity and tub both receive measured collision footprints; the central door/aisle remains
    // wider than the 0.60 m player diameter.
    solid(7.70,9.26,-10.20,-9.40);
    solid(8.26,10.55,-14.00,-12.44);
    // A woven living-room rug sits below the furniture and keeps the residence from reading as a
    // row of pieces on bare stone. Flush bronze edging preserves the clear walking surface.
    flat(6.45,.027,-8.18,4.35,3.55,c.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'七零三起居室'});
    for(const z of [-9.92,-6.44])flat(6.45,.031,z,4.18,.035,c.bronzeD,
      {gloss:.58,tag:'七零三起居室'});
    // Pull the sofa slightly east and use a 2.40 m apartment sofa. Together with the kitchenette,
    // the former 2.75 m footprint left only 0.66 m of physical gap (0.06 m after the player's
    // radius), turning the furniture into a wall that sealed the bedroom and bathroom. The new
    // 1.25 m circulation bay keeps the living composition intact and gives the turn room to breathe.
    sofa(A,c,6.75,-7.48,2.40,0,c.celadon,'七零三起居室');
    solid(5.45,8.05,-8.18,-6.78);
    roundTable(A,c,9.35,-7.15,.70,'七零三餐桌');
    for(let i=0;i<3;i++){
      const a=i/3*TAU;chair(A,c,9.35+Math.sin(a)*1.25,-7.15+Math.cos(a)*1.25,
        a+Math.PI,i%2?c.celadonL:c.silkL,'七零三餐椅');
    }
    solid(8.58,10.12,-7.92,-6.38);
    kitchenette(A,c,3.00,-6.10,2.25,0,'七零三厨房');solid(1.80,4.20,-6.52,-5.66);
    // Rounded twin coffee tables and a supported reading lamp complete the living vignette.
    roundTable(A,c,6.10,-8.72,.48,'七零三茶几');teaSet(A,c,6.10,-8.72,.86,'七零三茶几');
    // The reading light occupies the bedroom-side corner. Keeping it out of the room centre gives
    // both the resident and the chase camera an unobstructed view across the living composition.
    cyl(2.30,.055,-8.70,.22,.11,c.bronzeD,{gloss:.60,tag:'落地灯'});
    capsule(2.30,1.14,-8.70,.035,2.18,.035,c.bronze,{gloss:.68,tag:'落地灯'});
    taper(2.30,2.28,-8.70,.38,.40,.38,c.silkL,{...MAT.cloth,mode:7,gloss:.04,tag:'落地灯'});
    luminous(ball(2.30,2.23,-8.70,.08,.10,.08,c.warm,{mode:1,tag:'落地灯'}),.035,.28);
    thing(A,'七零三主卧',4.05,-11.15,[4.05,-9.85],
      '较大的公寓有独立睡眠区。','The larger residence has a distinct sleeping area.',
      '主卧 is the principal bedroom.',2.1);
    thing(A,'七零三起居室',6.75,-7.48,[6.75,-8.75],
      '起居室适合会客或放松。','The living room is arranged for conversation and relaxation.',
      '起居室 is a living room.',1.75);
    thing(A,'七零三餐桌',9.35,-7.15,[9.35,-5.72],
      '三人餐桌让长住客人像在家一样用餐。','The three-seat table makes long stays feel residential.',
      '餐桌 is a dining table.',1.75);
    thing(A,'七零三厨房',3.00,-6.10,[4.45,-6.60],
      '公寓厨房配有水槽、电磁炉和储物柜。','The residence kitchen has a sink, induction hob and storage.',
      '厨房 is a kitchen.',1.65);
    thing(A,'七零三浴室',9.10,-11.55,[7.86,-11.30],
      '石材浴室配有浸泡缸和带照明的盥洗台。','The stone bathroom has a soaking tub and illuminated vanity.',
      '浴室 is a bathroom.',2.15);

    // ---------------------------------------------------------------- north shared amenities
    // Northwest cowork room. Front wall keeps a generous central opening off the guest spine.
    flat(-10.18,.022,10.29,7.57,8.98,c.carpet,{...MAT.cloth,mode:7,gloss:.035,tag:'联合办公'});
    box(-12.92,1.56,5.72,2.10,3.12,.16,c.plaster,{hard:true,tag:'联合办公墙'});
    solid(-13.97,-11.87,5.64,5.80);
    box(-7.42,1.56,5.72,2.05,3.12,.16,c.plaster,{hard:true,tag:'联合办公墙'});
    solid(-8.45,-6.39,5.64,5.80);
    box(-10.15,3.12,5.72,3.42,.32,.16,c.walnutD,{hard:true,tag:'联合办公门套'});
    plaque(A,c,-10.15,2.58,5.64,0,'联合办公','COWORK LOUNGE',2.80,c.jade);
    // Full side returns meet the north perimeter, turning the former stage-set facade into a real
    // enclosed cowork room. The 3.42 m opening in the south wall remains the intentional entry.
    partition(A,c,-14.05,5.72,14.78,'联合办公侧墙');
    partition(A,c,-6.30,5.72,14.78,'联合办公侧墙');
    plaque(A,c,-6.18,2.38,10.30,Math.PI/2,'联合办公','COWORK LOUNGE',2.75,c.jade);
    // Two dressed worktables, with solids kept to their real tops/chassis.
    for(const [x,z] of [[-11.50,8.15],[-8.50,10.70]]){
      desk(A,c,x,z,2.18,0,'共享办公桌');
      chair(A,c,x,z-.98,0,c.celadonL,'共享办公椅');
      chair(A,c,x,z+.98,Math.PI,c.silkL,'共享办公椅');
      solid(x-1.16,x+1.16,z-.42,z+.42);
      pendant(A,c,x,z,c.celadon,'办公吊灯');
    }
    phoneBooth(A,c,-12.85,12.45,'电话间');solid(-13.62,-12.08,11.78,13.13);
    printer(A,c,-8.25,13.40,'打印台');solid(-9.10,-7.40,13.00,13.80);
    plant(A,c,-6.85,7.10,.44,'办公绿植');
    thing(A,'共享办公桌',-11.50,8.15,[-11.50,7.18],
      '共享办公桌有电源、照明和稳定的网络。','The cowork table has power, task lighting and reliable internet.',
      '共享办公 is coworking.',1.60);
    thing(A,'电话间',-12.85,12.45,[-11.62,12.45],
      '隔音电话间适合长时间会议。','The acoustic phone booth is suitable for long calls.',
      '电话间 is a phone booth.',1.65);
    thing(A,'打印台',-8.25,13.40,[-8.25,12.43],
      '打印台备有纸张和办公用品。','The print station is stocked with paper and office supplies.',
      '打印 is printing.',1.50);

    // Quiet yoga and reading nook. It is deliberately open to the central guest spine.
    flat(-2.475,.024,10.29,7.49,8.98,c.limestoneL,
      {...MAT.stone,mode:7,gloss:.13,tag:'安静阅读瑜伽'});
    for(const x of [-4.15,-2.75])yogaMat(A,c,x,9.00,x< -3?c.celadon:c.silk,'瑜伽垫');
    // The shelf run is set 0.32 m west of its old centre: at 3.55 m wide it used to end inside the
    // new party wall with the breakfast room.
    bookshelf(A,c,-.62,13.75,3.55,0,'阅读书架');solid(-2.44,1.20,13.42,14.06);
    // Both reading chairs turn toward the shared tea table, so the nook reads as one
    // conversational grouping rather than two seats aimed past the table.
    chair(A,c,-3.68,12.25,.90,c.celadonL,'阅读椅');
    chair(A,c,-1.72,11.95,-.75,c.silkL,'阅读椅');
    roundTable(A,c,-2.72,13.02,.48,'阅读茶几');teaSet(A,c,-2.72,13.02,.86,'阅读茶几');
    pendant(A,c,-2.75,11.40,c.silk,'安静区吊灯');plant(A,c,.80,9.30,.44,'安静区绿植');
    // Wall-fixed identity graphic. The former freestanding board crossed the open threshold and
    // read as a large black slab from both the corridor and proof camera.
    // This banner sits on the face of HotelCore's north-wall identity panel (whose occupied face
    // is z=14.37). It articulates that shared panel instead of disappearing behind it.
    box(-4.05,2.72,14.34,2.65,.64,.025,c.walnutD,
      {hard:true,gloss:.31,tag:'安静阅读瑜伽'});
    box(-4.05,2.72,14.318,2.47,.48,.016,c.jade,
      {hard:true,mode:1,gloss:.20,tag:'安静阅读瑜伽'});
    glyphs(-4.05,2.78,14.292,Math.PI,'安静阅读瑜伽',
      {size:.115,gap:.019,color:c.white,mode:1,lift:.006,tag:'安静阅读瑜伽'});
    glyphs(-4.05,2.54,14.292,Math.PI,'QUIET ROOM',
      {size:.052,gap:.009,color:c.bronzeL,mode:1,lift:.006,tag:'安静阅读瑜伽'});
    thing(A,'瑜伽垫',-4.15,9.00,[-4.15,7.74],
      '在安静区做一组舒缓的瑜伽。','Do a gentle yoga sequence in the quiet room.',
      '瑜伽 is yoga.',1.60);
    thing(A,'阅读角',-2.72,12.60,[-3.68,12.25],
      '阅读角收藏了旅行、设计和北京文化类书籍。','The reading nook has books on travel, design and Beijing culture.',
      '阅读角 is a reading nook.',1.70);

    // North-center breakfast kitchen. Open sides keep the service route at x=9 completely clear.
    flat(4.95,.022,10.29,7.04,8.98,c.limestoneL,
      {...MAT.stone,mode:7,gloss:.17,tag:'早餐吧'});
    // Breakfast lettering is appliqued directly to the north wall; there is no signboard blade
    // hanging across the room or blank rear face above the island.
    box(4.65,2.72,14.34,3.65,.68,.025,c.walnutD,
      {hard:true,gloss:.31,tag:'早餐吧'});
    box(4.65,2.72,14.318,3.47,.52,.016,c.lacquer,
      {hard:true,mode:1,gloss:.24,tag:'早餐吧'});
    glyphs(4.65,2.81,14.292,Math.PI,'早餐吧',
      {size:.165,gap:.027,color:c.white,mode:1,lift:.006,tag:'早餐吧'});
    glyphs(4.65,2.55,14.292,Math.PI,'RESIDENT BREAKFAST',
      {size:.058,gap:.010,color:c.bronzeL,mode:1,lift:.006,tag:'早餐吧'});
    breakfastIsland(A,c,4.70,8.15,'早餐吧台');solid(1.92,7.48,7.52,8.78);
    coffeeStation(A,c,6.35,13.52,'咖啡机');solid(4.90,7.80,13.08,13.92);
    kitchenette(A,c,2.85,13.50,2.25,Math.PI,'共享厨房');solid(1.65,4.05,13.06,13.94);
    // The east pair moved 0.40 m west: its outer chair back reached x=8.41, and the room's new
    // east wall stands at 8.47.
    for(const [x,z] of [[3.10,11.15],[6.65,10.80]]){
      roundTable(A,c,x,z,.61,'早餐餐桌');solid(x-.68,x+.68,z-.68,z+.68);
      chair(A,c,x-1.00,z,Math.PI/2,c.celadonL,'早餐椅');
      chair(A,c,x+1.00,z,-Math.PI/2,c.silkL,'早餐椅');
    }
    pendant(A,c,4.70,8.15,c.lacquer,'早餐吊灯');
    plant(A,c,1.90,9.75,.46,'早餐区绿植');
    thing(A,'早餐吧台',4.70,8.15,[4.70,6.62],
      '住客早餐提供热粥、点心、水果和咖啡。','Resident breakfast includes congee, pastries, fruit and coffee.',
      '早餐 is breakfast.',1.85);
    thing(A,'咖啡机',6.35,13.52,[6.35,12.48],
      '咖啡机可以制作浓缩咖啡或热牛奶。','The machine prepares espresso or steamed milk.',
      '咖啡 is coffee.',1.55);
    thing(A,'共享厨房',2.85,13.50,[2.85,12.42],
      '共享厨房可以准备较完整的一餐。','The shared kitchen can prepare a more complete meal.',
      '共享厨房 is a shared kitchen.',1.60);

    // Guest laundry moves east of the public directory. Its former footprint enclosed the core
    // directory and the folding table physically overlapped that directory's collider. This slim
    // service room has four real boundaries, a 1.96 m south door and a clear east-side work aisle.
    flat(16.18,.022,11.22,2.75,7.02,c.tile,
      {...MAT.stone,mode:7,gloss:.15,tag:'住客洗衣房'});
    wallWithDoor(A,c,14.80,17.55,7.66,16.18,'住客洗衣房','GUEST LAUNDRY');
    partition(A,c,14.80,7.66,14.78,'洗衣房侧墙');
    partition(A,c,17.55,7.66,14.78,'洗衣房侧墙');
    // A finished identity panel turns the public west face into hotel wayfinding instead of a
    // blank service-room slab; it is only 12 cm deep and sits wholly on the existing wall line.
    plaque(A,c,14.68,2.38,10.85,Math.PI/2,'住客洗衣房','RESIDENT LAUNDRY',2.70,c.jade);
    laundryMachine(A,c,15.56,14.15,'洗衣机');
    laundryMachine(A,c,16.82,14.15,'烘干机');
    solid(14.82,17.55,13.55,14.78);
    foldTable(A,c,15.35,10.85,2.50,Math.PI/2,'叠衣台');
    solid(14.76,15.94,9.52,12.18);
    // Wall shelf, baskets and clock make the room operational rather than decorative.
    box(16.18,2.34,14.48,2.35,.12,.44,c.walnutL,{...MAT.timber,mode:7,gloss:.30,tag:'洗衣用品'});
    for(const x of [15.45,16.18,16.91]){
      box(x,2.52,14.30,.72,.34,.34,c.celadonL,{...MAT.cloth,mode:7,gloss:.04,tag:'洗衣篮'});
      for(const s of [-1,1])capsule(x+s*.28,2.68,14.30,.016,.24,.016,c.bronzeD,
        {rz:Math.PI/2,tag:'洗衣篮'});
    }
    cyl(17.40,2.55,10.85,.34,.060,c.bronzeD,{rz:Math.PI/2,gloss:.62,tag:'时钟'});
    cyl(17.35,2.55,10.85,.27,.025,c.white,{rz:Math.PI/2,gloss:.25,tag:'时钟'});
    capsule(17.31,2.55,10.85,.012,.16,.012,c.ink,{rz:Math.PI/2,ry:.6,tag:'时钟'});
    pendant(A,c,16.18,10.85,c.celadon,'洗衣房吊灯');
    thing(A,'洗衣机',15.56,14.15,[16.45,12.90],
      '住客可以使用前置式洗衣机。','Residents can use the front-loading washer.',
      '洗衣机 is a washing machine.',1.60);
    thing(A,'叠衣台',15.35,10.85,[16.35,10.85],
      '宽大的叠衣台备有篮子和干净的台面。','The folding table has baskets and a clean work surface.',
      '叠衣 means folding clothes.',1.65);

    // ---------------------------------------------------------------- west back-of-house
    // The corridor's new service door opens on this. HotelCore stands its fire stair in the west
    // wall here, so the published stair waypoint [-16.0,-7.1] finally has a room around it instead
    // of eight metres of undressed shell continuous with the guest corridor.
    flat(-15.90,.020,-2.58,3.62,15.98,c.tile,{...MAT.stone,mode:7,gloss:.15,tag:'服务通道'});
    flat(-15.78,.020,-12.76,4.00,3.94,c.tile,{...MAT.stone,mode:7,gloss:.15,tag:'布草间'});
    // Painted dado and skirt: a service route is finished harder than a guest corridor, and the
    // banding stops the two long walls reading as blank plaster.
    for(const x of [-14.16,-17.80]){
      box(x,1.04,-6.90,.035,.09,15.60,c.bronzeD,{hard:true,gloss:.52,tag:'服务通道'});
      box(x,.16,-6.90,.055,.32,15.60,c.walnutD,{hard:true,gloss:.26,tag:'服务通道'});
    }
    for(const z of [-12.60,-8.60,-4.60,-.60,3.40])
      luminous(box(-15.90,3.92,z,1.24,.07,.26,c.white,
        {hard:true,mode:1,tag:'服务通道'}),.030,.34);
    // Stair wayfinding on the lobby's east wall, opposite HotelCore's stair portal.
    glyphs(-14.19,2.44,-7.10,-Math.PI/2,'安全出口',
      {size:.125,gap:.022,color:c.celadonL,mode:1,lift:.006,tag:'安全出口'});
    glyphs(-14.19,2.14,-7.10,-Math.PI/2,'服务通道',
      {size:.090,gap:.016,color:c.bronzeL,mode:1,lift:.006,tag:'服务通道'});
    // Housekeeping notice board, kept flat on the wall so it never narrows the trolley route.
    box(-14.21,1.60,-3.05,.075,1.24,1.86,c.walnutD,{hard:true,gloss:.29,tag:'客房服务'});
    box(-14.26,1.60,-3.05,.030,1.08,1.68,c.silkL,{hard:true,mode:1,gloss:.05,tag:'客房服务'});
    for(let i=0;i<6;i++)
      box(-14.29,1.94-Math.floor(i/2)*.40,-3.44+(i%2)*.78,.014,.28,.50,
        i%3===0?c.celadonL:c.white,{hard:true,mode:1,gloss:.03,tag:'客房服务'});
    glyphs(-14.31,2.36,-3.05,-Math.PI/2,'客房服务',
      {size:.100,gap:.018,color:c.bronzeL,mode:1,lift:.006,tag:'客房服务'});
    // Linen room. Shelving on the south wall, two trolleys parked clear of the 1.10 m door.
    linenRack(A,c,-15.85,-14.38,3.30,0,'布草间');
    solid(-17.52,-14.18,-14.70,-14.08);
    linenCart(A,c,-16.90,-11.62,0,'客房服务');solid(-17.58,-16.22,-12.02,-11.22);
    linenCart(A,c,-14.60,-11.62,Math.PI,'客房服务');solid(-15.30,-13.90,-12.02,-11.22);
    // Hung east of the 1.10 m door leaf, clear of the opening it names.
    plaque(A,c,-14.62,2.28,-10.55,0,'布草间','LINEN ROOM',1.15,c.jade);
    thing(A,'布草间',-15.85,-13.30,[-15.85,-12.55],
      '布草间存放干净的床品和毛巾。','The linen room holds clean bed linen and towels.',
      '布草间 is a linen room.',1.80);
    // Approach from the open north side of the parked trolley pair. Their 0.92 m centre gap is
    // storage clearance, not a comfortable place to ask the player to stand.
    thing(A,'客房服务',-16.90,-11.62,[-15.90,-10.65],
      '客房服务车每天上楼补充布草。','The housekeeping trolley is restocked on the floor each day.',
      '客房服务 is housekeeping.',1.55);

    // Final shared-route wayfinding. The shallow pier sits parallel to the x=9 line and north of
    // where that spine's horizontal approach used to be drawn; its visible face and collision
    // footprint agree and it crosses no route segment.
    //
    // STALE PREMISE, KEPT DELIBERATELY. "the x=9 service spine" was the old published polyline,
    // and measurement on 2026-08-08 showed it was blocked on this floor — see the long note on
    // 服务通道 above. `js/hotel.js` now publishes hotel7's spine around the east end of the
    // corridor's north wall, so the published route no longer runs up x=9 past this face.
    // The pier is NOT orphaned: the real service walk still comes through the 电梯厅 gap into
    // the corridor and north through 服务通道 at x 8.70..10.30, which passes this face on its
    // readable (west) side. What is unproven is the polyline for that walk — deriving it needs a
    // flood probe, and the fleet was stood down for a frame-rate reading before one could run.
    box(9.72,1.70,7.10,.10,2.50,2.20,c.walnutD,{hard:true,gloss:.30,tag:'楼层索引'});
    solid(9.64,9.80,6.00,8.20);
    box(9.64,1.70,7.10,.024,2.26,1.94,c.ink,{hard:true,mode:1,gloss:.36,tag:'楼层索引'});
    glyphs(9.60,2.43,7.10,-Math.PI/2,'七楼长住公寓',
      {size:.105,gap:.018,color:c.bronzeL,mode:1,lift:.006,tag:'楼层索引'});
    glyphs(9.60,2.05,7.10,-Math.PI/2,'早餐吧  联合办公',
      {size:.085,gap:.014,color:c.silkL,mode:1,lift:.006,tag:'楼层索引'});
    glyphs(9.60,1.72,7.10,-Math.PI/2,'阅读瑜伽  洗衣房',
      {size:.085,gap:.014,color:c.celadonL,mode:1,lift:.006,tag:'楼层索引'});
    glyphs(9.60,1.22,7.10,-Math.PI/2,'服务梯',
      {size:.090,gap:.015,color:c.white,mode:1,lift:.006,tag:'楼层索引'});
    // Mounted east of the x=9 line so a body walking north up it reads the face rather than
    // squeezing past the pier. That still describes the real corridor walk through 服务通道; it
    // no longer describes the PUBLISHED serviceSpine, which since 2026-08-08 reaches [9,10] east
    // of the corridor entirely. If a later lane derives the corridor route and publishes it, this
    // pier is already on it and needs no move.
  });

  // -------------------------------------------------------------------------- local actions
  HotelUse.hotel7 ||= {};
  Object.assign(HotelUse.hotel7,{
    '七零一睡眠区':{zh:'在七零一休息',py:'zài qī líng yī xiūxi',en:'rest in residence 701',secs:4.1,mins:90,gain:{rest:34,mood:6},pose:{type:'lie',seatY:.59}},
    '七零一书桌':{zh:'处理长期工作',py:'chǔlǐ chángqī gōngzuò',en:'work on a long-term project',secs:4.0,mins:50,gain:{rest:-9,mood:2},pose:{type:'type',seatY:.50}},
    '七零一厨房':{zh:'在小厨房做饭',py:'zài xiǎo chúfáng zuòfàn',en:'cook in the kitchenette',secs:4.0,mins:35,gain:{food:28,rest:-4},pose:{type:'work'}},
    '欢迎茶':{zh:'喝欢迎茶',py:'hē huānyíng chá',en:'drink the welcome tea',secs:3.0,mins:15,gain:{rest:7,mood:6},pose:{type:'drink',seatY:.50}},
    '七零二睡眠区':{zh:'在七零二休息',py:'zài qī líng èr xiūxi',en:'rest in residence 702',secs:4.1,mins:90,gain:{rest:34,mood:6},pose:{type:'lie',seatY:.59}},
    '七零二书桌':{zh:'在七零二工作',py:'zài qī líng èr gōngzuò',en:'work at the 702 desk',secs:4.0,mins:45,gain:{rest:-8,mood:2},pose:{type:'type',seatY:.50}},
    '七零二厨房':{zh:'准备简单的一餐',py:'zhǔnbèi jiǎndān de yì cān',en:'prepare a simple meal',secs:3.8,mins:30,gain:{food:25},pose:{type:'work'}},
    '窗边榻':{zh:'坐在窗边',py:'zuò zài chuāngbiān',en:'sit by the window',secs:3.4,mins:25,gain:{rest:11,mood:8},pose:{type:'sit',seatY:.50}},
    '七零三主卧':{zh:'在七零三休息',py:'zài qī líng sān xiūxi',en:'rest in residence 703',secs:4.2,mins:105,gain:{rest:39,mood:7},pose:{type:'lie',seatY:.59}},
    '七零三起居室':{zh:'在起居室放松',py:'zài qǐjūshì fàngsōng',en:'relax in the living room',secs:3.4,mins:30,gain:{rest:14,mood:8},pose:{type:'sit',seatY:.50}},
    '七零三餐桌':{zh:'在公寓里用餐',py:'zài gōngyù lǐ yòngcān',en:'dine in the residence',secs:4.0,mins:40,gain:{food:33,mood:6},pose:{type:'eat',seatY:.50}},
    '七零三厨房':{zh:'在公寓厨房做饭',py:'zài gōngyù chúfáng zuòfàn',en:'cook in the residence kitchen',secs:4.0,mins:40,gain:{food:31,rest:-4},pose:{type:'work'}},
    '七零三浴室':{zh:'泡澡',py:'pào zǎo',en:'take a bath',secs:3.8,mins:35,gain:{clean:35,rest:12},pose:{type:'scrub'}},
    '共享办公桌':{zh:'在联合办公区工作',py:'zài liánhé bàngōng qū gōngzuò',en:'work in the cowork lounge',secs:4.0,mins:55,gain:{rest:-10,mood:3},pose:{type:'type',seatY:.50}},
    '电话间':{zh:'进行线上会议',py:'jìnxíng xiànshàng huìyì',en:'join an online meeting',secs:3.8,mins:45,gain:{rest:-7},pose:{type:'phone',seatY:.50}},
    '打印台':{zh:'打印文件',py:'dǎyìn wénjiàn',en:'print documents',secs:2.3,mins:5,gain:{},pose:{type:'work'}},
    '瑜伽垫':{zh:'做瑜伽',py:'zuò yújiā',en:'practise yoga',secs:4.0,mins:35,gain:{rest:12,mood:10,clean:-2},pose:{type:'stretch'}},
    '阅读角':{zh:'安静地阅读',py:'ānjìng de yuèdú',en:'read quietly',secs:3.6,mins:30,gain:{rest:9,mood:8},pose:{type:'read',seatY:.50}},
    '早餐吧台':{zh:'吃住客早餐',py:'chī zhùkè zǎocān',en:'eat the resident breakfast',secs:4.0,mins:35,gain:{food:36,mood:7},pose:{type:'eat',seatY:.50}},
    '咖啡机':{zh:'做一杯咖啡',py:'zuò yì bēi kāfēi',en:'make a coffee',secs:2.8,mins:8,gain:{rest:8,mood:4},pose:{type:'drink'}},
    '共享厨房':{zh:'使用共享厨房',py:'shǐyòng gòngxiǎng chúfáng',en:'use the shared kitchen',secs:4.0,mins:40,gain:{food:32},pose:{type:'work'}},
    '洗衣机':{zh:'洗衣服',py:'xǐ yīfu',en:'do the laundry',secs:3.4,mins:45,gain:{clean:7,rest:-3},pose:{type:'work'}},
    '叠衣台':{zh:'叠好衣服',py:'dié hǎo yīfu',en:'fold the laundry',secs:3.0,mins:12,gain:{clean:4,rest:-2},pose:{type:'work'}},
    '布草间':{zh:'取干净的床品',py:'qǔ gānjìng de chuángpǐn',en:'take clean bed linen',secs:2.6,mins:8,gain:{clean:5},pose:{type:'work'}},
    '客房服务':{zh:'补充客房服务车',py:'bǔchōng kèfáng fúwù chē',en:'restock the housekeeping trolley',secs:3.2,mins:15,gain:{rest:-3},pose:{type:'work'}},
  });

  // --------------------------------------------------------------------------- lived-in floor
  const staffLook=(seed,accent='#566f62')=>({skin:'#d7a57f',hair:'#29231f',hairStyle:'bun',
    top:'#efe9dd',pants:'#34383e',shoe:'#27292c',jacket:accent,scarf:'#9b7442',uniform:'staff',
    tall:.98,wide:.94,faceSeed:seed});
  const guestLook=(seed,top,style='short')=>({skin:['#d7a37d','#c7916b','#e0af87'][seed%3],
    hair:['#2b2420','#3a302a','#211c19'][seed%3],hairStyle:style,top,pants:'#3b444f',
    shoe:'#e8e0d3',collar:seed%2?'shirt':'crew',tall:.95+(seed%4)*.022,
    wide:.91+(seed%3)*.035,faceSeed:seed});

  // Floor-local residents receive stable shared bodies from CastCatalog; they do not borrow a
  // frozen named identity's explicit production assignment.
  const cast=[
      {hotelGuestId:'hotel7-host-xu-lan',hz:'住店管家',name:'许岚',py:'Xǔ Lán',
      place:'hotel7',gender:'female',ageBand:'adult',temper:'poised',
      look:staffLook(5701,'#526d60'),
      spots:[
        {h0:6.5,h1:11.2,at:[7.60,6.60],face:Math.PI,act:'hands'},
        {h0:11.2,h1:17.5,at:[13.20,6.28],face:Math.PI/2,act:'check'},
        {h0:17.5,h1:23.5,at:[13.05,-2.05],face:-Math.PI/2,act:'hands'},
      ],
      lines:[
        ['欢迎回家，请随时告诉我您需要什么。','Welcome home. Please tell me whenever you need anything.'],
        ['早餐每天早上供应，咖啡机全天可以使用。','Breakfast is served every morning, and the coffee machine is always available.'],
        ['住客洗衣房全天开放。','The guest laundry is open around the clock.'],
      ]},
    {hotelGuestId:'hotel7-resident-lin-qiao',hz:'长住客人',name:'林乔',py:'Lín Qiáo',
      place:'hotel7',gender:'female',ageBand:'adult',temper:'focused',seatY:.50,
      look:guestLook(5711,'#607a86','bob'),
      spots:[
        {h0:7.0,h1:9.0,at:[-10.00,-6.43],face:Math.PI,act:'drink'},
        {h0:9.0,h1:17.5,at:[-11.50,7.18],face:0,act:'desk'},
        {h0:17.5,h1:22.8,at:[-4.15,7.74],face:0,act:'stretch'},
      ],
      lines:[
        ['我住七零一，在这里做一个长期设计项目。','I am in 701 while working on a long design project.'],
        ['联合办公区很安静，网络也很稳定。','The cowork lounge is quiet and the internet is reliable.'],
      ]},
    {hotelGuestId:'hotel7-resident-du-wenhai',hz:'长住住客',name:'杜文海',py:'Dù Wénhǎi',
      place:'hotel7',gender:'male',ageBand:'adult',temper:'genial',seatY:.50,
      look:guestLook(5712,'#a06b56','short'),
      spots:[
        {h0:7.0,h1:10.5,at:[6.65,9.78],face:0,act:'eat'},
        {h0:10.5,h1:18.0,at:[-8.50,9.72],face:0,act:'desk'},
        {h0:18.0,h1:23.0,at:[-3.68,12.25],face:.90,act:'read'},
      ],
      lines:[
        ['我在北京住几个月，七楼比普通客房更像家。','I am in Beijing for several months; the seventh floor feels more like home.'],
        ['我常用共享厨房，也喜欢晚上的阅读角。','I often use the shared kitchen and like the reading nook in the evening.'],
      ]},
  ];
  for(const n of cast)
    if(!HotelCast.some(q=>q.hotelGuestId===n.hotelGuestId)) HotelCast.push(n);
})();
