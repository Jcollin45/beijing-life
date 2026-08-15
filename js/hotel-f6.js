// 京华大酒店 · 6F family guest floor
//
// This module owns the complete sixth-floor fit-out, its local actions and its three-person cast.
// HotelCore continues to own the measured shell, lift/stair landings and shared circulation route.
const Hotel6Fit = Object.freeze({ floor:'hotel6', api:1 });

(() => {
  try {
    Glyphs.need(
      '六楼家庭客房亲子连通房六零一六零二家庭套房六零六连通门大床儿童床浴室家庭客厅家庭影院' +
      '儿童阅读角玩具桌绘画台客用茶水间制冰机家政工作间客房服务绘本玩具欢迎家庭楼层请保持安静' +
      '布草间工程设备员通道电梯厅全出口备品毛巾被褥婴推车配柜阀井消防栓工具备件走廊安梯层号'
    );
  } catch (_) {}

  const TAU=Math.PI*2;
  const hours=mins=>((Number(mins)||0)/60)%24;
  const fixed=(p,r=2)=>{p.fixed=true;p.cx=p.ob.x;p.cy=p.ob.y;p.cz=p.ob.z;p.r=r;return p;};

  // gl.js builds a capsule as hemisphere / cylinder / hemisphere with each cap a QUARTER of the
  // height, scaled by sy — "capsules for people". A rod-shaped capsule therefore renders as two
  // long cones meeting a short band, and an upright one tapers to a point at the floor so it
  // looks balanced rather than stood. Columns, legs, balusters, stems, pipes and rails use `cyl`;
  // `capsule` is kept only for short rounded pulls, handles and taps.
  function palette(A) {
    return {
      plaster:A.C('#e7dfd1'), limestone:A.C('#d9cfbd'), limestoneL:A.C('#eee6d7'),
      walnut:A.C('#49352c'), walnutL:A.C('#745344'), walnutD:A.C('#302723'),
      bronze:A.C('#9a7340'), bronzeL:A.C('#c7a66c'), bronzeD:A.C('#59422d'),
      celadon:A.C('#89a797'), celadonL:A.C('#c5d3c8'), jade:A.C('#456d61'),
      coral:A.C('#b97468'), coralL:A.C('#dfb1a6'), lacquer:A.C('#91352e'),
      silk:A.C('#b8a08c'), silkL:A.C('#ded0bc'), ivory:A.C('#f6f0e5'),
      carpet:A.C('#665954'), carpetL:A.C('#8b776e'), ink:A.C('#272a2b'),
      blue:A.C('#53758a'), blueL:A.C('#9ab4bf'), glass:A.C('#90aab4'),
      night:A.C('#17242c'), warm:A.C('#ffe1a3'), green:A.C('#58735d'),
      red:A.C('#a84037'), white:A.C('#f7f2e9'), steel:A.C('#898f91'),
      yellow:A.C('#d5ad55'), toyBlue:A.C('#6f9bad'), toyGreen:A.C('#7fa48d'),
    };
  }

  // The tower's material kit. Numerically identical to the copies in js/hotel-f1.js and
  // js/hotel-public.js on purpose: build.js:329-331 keys batches on
  // (mat, matScale, matAmt, nrmAmt), so matching tuples let this floor's partitions batch with
  // the rest of the building instead of doubling the draw calls. Change one, change all.
  // Every name is already in EAGER_MATERIALS (js/assets.js:187), so none of it adds boot cost.
  const MAT = {
    stone:  { mat:'plaster',  matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',     matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',   matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete', matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };

  // A partition is two independent statements: geometry (centre + size) and collision (extents).
  // `hard:true` only selects the sharp-edged architectural mesh — build.js has never read it for
  // walking — so every wall leaf below pairs its box with an explicit `A.solid` footprint, and
  // every head/lintel deliberately carries no solid so the opening under it stays walkable.
  // Partitions run the full 3.16 m wall plus a 0.94 m transom to the 4.09 m ceiling soffit;
  // a room whose walls stop at head height is a screen, not a room.
  // One leaf runs the whole 4.10 m to the ceiling soffit; the skirting and cornice are single
  // bands that wrap both faces, so a partition costs the same three props it always did while
  // being finished on the side the neighbouring room sees.
  // Every leaf pairs its box with a `solid` AND a `blocker`. The blocker is not optional: every
  // surface in this engine is single-sided, so a wall with a collider and no camera blocker lets
  // the chase camera slide through it and shows the unlit back of the room behind. Floor 6 had
  // 0 blockers on 100+ partitions before this.
  function wall(A,c,x,z,w,d=0.16,tag='六楼隔墙') {
    Build.partition(0,4.10,(yc,hh,pf)=>A.box(x,yc,z,w,hh,d,c.plaster,{...MAT.stone,hard:true,tag,...pf}));
    A.box(x,.10,z,w,.20,d+.07,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
    A.box(x,3.10,z,w,.14,d+.07,c.walnutD,{...MAT.timber,hard:true,gloss:.30,tag,partition:true});
    A.solid(x-w*.5,x+w*.5,z-d*.58,z+d*.58);
    A.blocker(x-w*.5-.03,x+w*.5+.03,z-d*.58-.03,z+d*.58+.03,4.09);
  }

  function sideWall(A,c,x,z,d,tag='六楼隔墙') {
    Build.partition(0,4.10,(yc,hh,pf)=>A.box(x,yc,z,.16,hh,d,c.plaster,{...MAT.stone,hard:true,tag,...pf}));
    A.box(x,.10,z,.23,.20,d,c.walnutD,{...MAT.timber,hard:true,gloss:.28,tag});
    A.box(x,3.10,z,.23,.14,d,c.walnutD,{...MAT.timber,hard:true,gloss:.30,tag,partition:true});
    A.solid(x-.09,x+.09,z-d*.5,z+d*.5);
    A.blocker(x-.12,x+.12,z-d*.5-.03,z+d*.5+.03,4.09);
  }

  function wallSpan(A,c,x0,x1,z,tag='六楼隔墙') {
    if(x1-x0>.12) wall(A,c,(x0+x1)*.5,z,x1-x0,.16,tag);
  }

  function sideWallSpan(A,c,x,z0,z1,tag='六楼隔墙') {
    if(z1-z0>.12) sideWall(A,c,x,(z0+z1)*.5,z1-z0,tag);
  }

  // A cased opening in a north-south partition; the mirror of `roomFront`. The two wall leaves
  // and the two jambs each carry their own solid, so the measured clear width is
  // 2*(doorHalf-.04) and matches what the eye sees. The head and transom carry no solid.
  function sideFront(A,c,x,z0,z1,doorZ,tag,doorHalf=.59,cased=true) {
    const {box,solid}=A;
    sideWallSpan(A,c,x,z0,doorZ-doorHalf,tag);
    sideWallSpan(A,c,x,doorZ+doorHalf,z1,tag);
    if(!cased)return;
    for(const s of [-1,1]){
      const jz=doorZ+s*(doorHalf+.04);
      box(x,1.49,jz,.24,2.98,.16,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
      for(const q of [-1,1])box(x+q*.13,1.49,jz,.035,2.64,.09,c.bronze,
        {hard:true,gloss:.67,tag});
      solid(x-.12,x+.12,jz-.08,jz+.08);
    }
    box(x,3.02,doorZ,.24,.20,doorHalf*2+.18,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
    box(x,3.61,doorZ,.24,.98,doorHalf*2+.18,c.plaster,{...MAT.stone,hard:true,tag});
    box(x,.030,doorZ,.22,.055,doorHalf*2-.10,c.bronzeD,{hard:true,gloss:.58,tag});
  }

  // A real cased opening in a full-height partition. `side` is the wall through which the guest
  // enters; all other boundaries are supplied by the surrounding room shell. The 1.56 m clear
  // gap retains 0.96 m after the player's collision radius is applied.
  function wetRoomShell(A,c,x0,x1,z0,z1,side,doorAt,tag='浴室') {
    const {box,flat,glyphs}=A,gap=.78,wallX=side==='east'?x1:x0;
    wallSpan(A,c,x0,x1,z0,tag);
    sideWallSpan(A,c,wallX,z0,doorAt-gap,tag);
    sideWallSpan(A,c,wallX,doorAt+gap,z1,tag);
    for(const s of [-1,1]){
      box(wallX,1.48,doorAt+s*(gap+.045),.24,2.96,.13,c.walnutD,
        {hard:true,gloss:.31,tag});
      box(wallX+(side==='east'?-.13:.13),1.48,doorAt+s*(gap+.045),.035,2.64,.09,c.bronze,
        {hard:true,gloss:.67,tag});
      A.solid(wallX-.12,wallX+.12,doorAt+s*(gap+.045)-.065,doorAt+s*(gap+.045)+.065);
    }
    box(wallX,3.02,doorAt,.24,.20,gap*2+.25,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
    box(wallX,3.61,doorAt,.24,.98,gap*2+.25,c.plaster,{...MAT.stone,hard:true,tag});
    const faceX=wallX+(side==='east'?.14:-.14),yaw=side==='east'?-Math.PI/2:Math.PI/2;
    box(faceX,2.69,doorAt,.035,.32,.82,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.36,tag});
    glyphs(faceX+(side==='east'?-.025:.025),2.69,doorAt,yaw,'浴室',
      {size:.085,gap:.014,color:c.bronzeL,mode:1,lift:.005,tag});
    // `flat`'s w/d are world x/z and `ry` rotates them, so the old ry:90 laid this threshold
    // 1.48 m ACROSS the floor and 0.22 m along the opening — a bronze bar pointing into the
    // bedroom. Without the rotation it sits in the reveal, where a threshold belongs.
    flat(wallX,.030,doorAt,.22,gap*2-.08,c.bronzeD,{gloss:.58,tag:'浴室门槛'});
  }

  // Front wall for a named room. Only the two visible wall leaves collide; the cased opening and
  // its flush threshold remain genuinely traversable.
  function roomFront(A,c,x0,x1,z,doorX,tag,doorHalf=.84,cased=true) {
    const {box,flat}=A;
    wallSpan(A,c,x0,doorX-doorHalf,z,tag);
    wallSpan(A,c,doorX+doorHalf,x1,z,tag);
    if(!cased)return;
    for(const s of [-1,1]){
      const jx=doorX+s*(doorHalf+.04);
      box(jx,1.49,z,.16,2.98,.24,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
      for(const q of [-1,1])box(jx,1.49,z+q*.13,.09,2.64,.035,c.bronze,
        {hard:true,gloss:.67,tag});
      A.solid(jx-.08,jx+.08,z-.12,z+.12);
    }
    box(doorX,3.02,z,doorHalf*2+.18,.20,.24,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
    box(doorX,3.61,z,doorHalf*2+.18,.98,.24,c.plaster,{...MAT.stone,hard:true,tag});
    flat(doorX,.030,z,doorHalf*2-.10,.20,c.bronzeD,{gloss:.58,tag});
  }

  // A framed picture. `art` is what is actually ON the paper, and it is not optional: this used to
  // draw a bare silk field with two diagonal bronze rods across it, which renders as an unhung
  // blank canvas — nine of them, including the one tagged 家庭相册. Worse, floors 5, 6 and 8 all
  // showed the same blank-field-plus-diagonal motif side by side, which is exactly the sameness
  // HOTEL.md forbids. The family floor's register is folk paper-cut and family photographs; floor
  // 5 uses line prints of the city and floor 8 keeps its ink landscapes.
  //
  // `face` picks which side carries the artwork (+1 steps along (sin yaw, cos yaw), so +1 is the
  // north face of a yaw-0 panel and the east face of a yaw-pi/2 one). The other side keeps a plain
  // silk inset, which is what a real frame's back looks like and costs one prop instead of six.
  function framedPanel(A,c,x,y,z,w,h,fill=c.celadonL,tag='墙饰',yaw=0,art='cut',face=1,seed=0) {
    const {box,ball}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,y,z,w,h,.055,c.walnutD,{hard:true,ry:yaw,gloss:.31,tag});
    for(const side of [-1,1]){
      const f=at(0,side*.042);
      // mode 7 (woven fabric) with the cloth tuple, not mode 1. Emissive ignores the room's
      // light entirely, so the silk field rendered as a flat lit rectangle at any hour — the
      // "blank backlit canvas" reading this helper's comment was written to remove.
      box(f[0],y,f[1],w-.16,h-.16,.022,fill,
        {...MAT.cloth,hard:true,ry:yaw,mode:7,gloss:.05,tag});
    }
    // Everything below sits on the chosen face at v = face*0.062, one plane proud of the silk.
    // `glow` is kept per-call and is free per instance; the base mode is lit paper, not emissive.
    const mark=(u,dy,mw,mh,colour,glow=0)=>{
      const p=at(u,face*.062);
      box(p[0],y+dy,p[1],mw,mh,.014,colour,
        {...MAT.cloth,hard:true,ry:yaw,mode:7,glow,gloss:.05,tag});
    };
    if(art==='photos'){
      // Family album: three across, two down, each print a different warm tint.
      const tints=[c.silkL,c.coralL,c.celadonL,c.ivory,c.blueL,c.coralL];
      for(let i=0;i<6;i++)
        mark((i%3-1)*w*.29,(i<3?1:-1)*h*.19,w*.23,h*.28,tints[(i+seed)%tints.length]);
    } else {
      // 窗花: a paper-cut lattice star. One crossed pair of bars and four corner squares, all
      // axis-aligned in the frame's own plane, so it reads from the corridor at walking distance.
      const s=Math.min(w,h)*.34;
      mark(0,0,s*1.9,.055,c.lacquer);
      mark(0,0,.055,s*1.9,c.lacquer);
      for(const [su,sv] of [[-1,1],[1,1],[-1,-1],[1,-1]])
        mark(su*s*.62,sv*s*.62,s*.44,s*.44,seed%2?c.coral:c.lacquer);
    }
    const seal=at(w*.31,face*.073);
    ball(seal[0],y-h*.29,seal[1],.055,.055,.022,c.lacquer,
      {mode:1,glow:.018,tag});
  }

  // Shallow woven rosettes break up broad carpet/stone fields without turning circulation into
  // a lane diagram. Every piece stays at finish height and is deliberately non-colliding.
  function floorRosette(A,c,x,z,r=.62,yaw=0,tag='地面纹样',accent=c.celadon) {
    const {ball}=A;
    // Overlapping oval yarn shapes stay soft-edged at walking height; square diamonds read like
    // loose floor tiles from the chase camera and undermine the woven-carpet effect.
    ball(x,.030,z,r*.62,.013,r*.37,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.09,tag});
    ball(x,.033,z,r*.46,.013,r*.27,c.limestoneL,{...MAT.stone,ry:yaw,mode:7,gloss:.06,tag});
    for(let i=0;i<8;i++){
      const a=yaw+i/8*TAU;
      ball(x+Math.sin(a)*r*.47,.036,z+Math.cos(a)*r*.29,
        r*.145,.012,r*.085,i%2?accent:c.coral,
        {...MAT.cloth,mode:7,gloss:.06,tag});
    }
    ball(x,.038,z,r*.18,.014,r*.115,c.bronzeL,{mode:7,gloss:.16,tag});
  }

  function sign(A,c,x,y,z,yaw,hz,en,w=3.0,fill=c.jade) {
    const {box,glyphs,luminous}=A;
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,y,z,w,.92,.12,c.walnutD,{hard:true,ry:yaw,gloss:.34,tag:hz});
    for(const side of [-1,1]){
      // The face for `side` sits at +n*side, so it must LOOK along +n*side. A glyph quad at yaw
      // ψ faces (sin ψ, 0, cos ψ), which means the two faces are `yaw` and `yaw+π` — a rotation,
      // which is also what makes the lettering read the right way round from each side. The old
      // `-yaw` / `π-yaw` are reflections: they happen to land correctly at yaw=±π/2 and point
      // straight back into the board at yaw 0 and yaw π, which is why eight of this floor's ten
      // signs rendered as blank lit slabs.
      const syaw=side>0?yaw:yaw+Math.PI;
      const fx=x+nx*.073*side,fz=z+nz*.073*side;
      luminous(box(fx,y,fz,w-.15,.78,.024,fill,
        {hard:true,ry:syaw,mode:1,gloss:.09,tag:hz}),.018,.09);
      const gx=x+nx*.116*side,gz=z+nz*.116*side;
      glyphs(gx,y+.12,gz,syaw,hz,{size:Math.min(.17,(w-.42)/[...hz].length),
        gap:.024,color:c.white,mode:1,lift:.005,tag:hz});
      glyphs(gx,y-.17,gz,syaw,en,{size:.066,gap:.012,color:c.bronzeL,
        mode:1,lift:.005,tag:hz});
    }
  }

  function pendant(A,c,x,z,tag='灯',accent=c.celadon) {
    const {cyl,capsule,taper,ball,luminous}=A;
    cyl(x,4.23,z,.22,.12,c.walnutD,{gloss:.31,tag});
    cyl(x,4.10,z,.14,.08,c.bronzeD,{gloss:.64,tag});
    cyl(x,3.86,z,.024,.42,c.bronze,{gloss:.68,tag});
    taper(x,3.57,z,.24,.34,.24,c.silkL,{...MAT.cloth,mode:7,gloss:.03,tag});
    luminous(ball(x,3.55,z,.115,.145,.115,c.warm,{mode:1,tag}),.04,.28);
    cyl(x,3.38,z,.15,.055,accent,{gloss:.22,tag});
  }

  function sconce(A,c,x,y,z,yaw=0,tag='壁灯') {
    const {cyl,capsule,ball,luminous}=A;
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    cyl(x,y,z,.13,.05,c.bronzeD,{rx:Math.PI/2,ry:yaw,gloss:.63,tag});
    capsule(x+nx*.12,y,z+nz*.12,.026,.24,.026,c.bronze,
      {rx:Math.PI/2,ry:yaw,gloss:.68,tag});
    luminous(ball(x+nx*.25,y,z+nz*.25,.105,.15,.105,c.warm,{mode:1,tag}),.035,.24);
  }

  function skyline(A,c,x,z,w,tag='城市景观') {
    const {box,cyl,capsule,luminous}=A;
    box(x,1.80,z,w,2.55,.12,c.bronzeD,{hard:true,gloss:.55,tag});
    luminous(box(x,1.80,z-.070,w-.18,2.37,.024,c.night,
      {hard:true,mode:1,gloss:.78,tag}),.015,.07);
    const n=Math.max(7,Math.floor(w/.82));
    for(let i=0;i<n;i++){
      const bw=w/n*.66,bh=.32+((i*7+3)%7)*.15,px=x-w*.45+(i+.5)*w*.90/n;
      box(px,.61+bh*.5,z-.094,bw,bh,.016,i%4?c.ink:c.blue,
        {hard:true,mode:1,glow:i%5===1?.055:.012,tag});
      if(i%3===0)box(px,.70+bh*.58,z-.108,bw*.18,.045,.012,c.warm,
        {hard:true,mode:1,glow:.16,tag});
    }
    for(let i=0;i<=Math.floor(w/3);i++){
      const px=x-w*.43+i*w*.86/Math.max(1,Math.floor(w/3));
      cyl(px,1.80,z-.118,.018,2.16,c.bronzeL,{gloss:.68,tag});
    }
  }

  function curtains(A,c,x,z,w,tag='窗帘') {
    const {box,cyl,capsule}=A;
    box(x,3.48,z,w+.34,.15,.18,c.walnutD,{...MAT.timber,mode:7,gloss:.30,tag});
    cyl(x,3.35,z-.03,.035,w+.12,c.bronze,
      {rz:Math.PI/2,gloss:.69,tag});
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const px=x+side*(w*.28+i*.14);
      box(px,1.83,z-.04,.25,2.80,.085,side<0?c.coralL:c.silkL,
        {...MAT.cloth,mode:7,gloss:.025,tag});
      capsule(px,3.29,z-.04,.015,.13,.015,c.bronze,{gloss:.66,tag});
    }
  }

  // `label` is the room number on the plaque, and on this floor it is a real one — 601, 602, 606
  // are three of the eight doors js/stay.js issues keys for on hotel6. Parsed rather than passed
  // as a second argument so the three call sites below stay exactly as they were: the plaque and
  // the lock cannot disagree if they are the same string. A label that is not a number (a linen
  // store, a plant room) leaves the door ungated, which is what it should be.
  function door(A,c,x,z,label,tag='客房') {
    const {box,ball,capsule,glyphs,onTick}=A,parts=[];
    const room=/^\d{3,4}$/.test(String(label))?+label:0;
    const moving=p=>{fixed(p,3.5);p.ob=null;parts.push({p,m:p.m,out:new Float32Array(p.m)});return p;};
    for(const s of [-1,1]){
      box(x+s*.84,1.53,z,.14,3.06,.20,c.walnutD,{hard:true,gloss:.32,tag});
      box(x+s*.84,1.54,z-.115,.055,2.72,.035,c.bronze,
        {hard:true,gloss:.68,tag});
      A.solid(x+s*.84-.07,x+s*.84+.07,z-.10,z+.10);
    }
    box(x,3.03,z,1.82,.18,.20,c.walnutD,{hard:true,gloss:.32,tag});
    box(x,3.61,z,1.82,.98,.20,c.plaster,{...MAT.stone,hard:true,tag});
    box(x,.035,z,1.72,.07,.25,c.bronzeD,{hard:true,gloss:.68,tag});
    moving(box(x,1.50,z,1.52,2.74,.09,c.walnut,{...MAT.timber,mode:7,gloss:.34,tag}));
    moving(box(x,1.55,z-.062,1.27,2.32,.025,c.celadonL,
      {...MAT.cloth,hard:true,mode:7,gloss:.045,tag}));
    moving(box(x,1.55,z-.086,.52,.52,.020,c.bronzeL,
      {hard:true,rz:Math.PI/4,mode:1,gloss:.68,tag}));
    moving(ball(x,1.55,z-.103,.13,.13,.025,c.coral,{mode:1,gloss:.18,tag}));
    moving(capsule(x+.48,1.42,z-.105,.025,.28,.025,c.bronzeL,{gloss:.72,tag}));
    box(x,2.75,z-.112,.72,.29,.042,c.ink,{hard:true,gloss:.38,tag});
    glyphs(x,2.75,z-.139,Math.PI,label,{size:.105,gap:.018,color:c.bronzeL,
      mode:1,lift:.005,tag});
    let open=0,toldAt=-99;
    const MS=new Float32Array(16);
    onTick((t,body,mins,dt)=>{
      const bx=body&&Number.isFinite(body.x)?body.x:99;
      const bz=body&&Number.isFinite(body.z)?body.z:99;
      const near=Math.hypot(bx-x,bz-z)<2.15;
      // 房卡 (H106). Same rule and the same wording as the doors on 5F and 8F — `Stay.opensDoor`
      // owns it, this only asks. A refusal is a sentence and a corridor you can still walk down,
      // never a failure screen, and it is said once per approach rather than once per frame.
      let mine=true;
      if(room&&typeof Stay!=='undefined'&&Stay.opensDoor){
        try{ mine=Stay.opensDoor(A.floor,room); }catch(_){ mine=true; }
      }
      if(!near) toldAt=-99;
      else if(!mine&&t-toldAt>6&&typeof say==='function'){
        toldAt=t;
        const k=typeof Stay!=='undefined'&&Stay.key&&Stay.key();
        say(k&&!k.lost?`房卡开不了${room}房，您住${k.room}。`:`${room}房不是您的房间。`,
            k&&!k.lost?`The card will not open ${room} — your room is ${k.room}.`
                      :`Room ${room} is not yours.`);
      }
      const target=near&&mine?1:0;
      open+=(target-open)*(1-Math.exp(-dt*(target?6.5:3.7)));
      // One translation per frame for the whole leaf, into a reused scratch, writing each part's
      // own permanent matrix — see the note on the same pattern in js/hotel-guests.js.
      M.trans(1.32*open,0,0,MS);
      for(const q of parts)q.p.m=M.mul(MS,q.m,q.out);
    });
  }

  function connectingPortal(A,c,x,z,tag='连通门') {
    const {box,ball,capsule,glyphs}=A;
    for(const s of [-1,1]){
      box(x,1.51,z+s*.84,.20,3.02,.15,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
      box(x+s*.073,1.51,z+s*.84,.035,2.70,.06,c.bronze,
        {hard:true,gloss:.66,tag});
      A.solid(x-.10,x+.10,z+s*.84-.075,z+s*.84+.075);
    }
    box(x,3.03,z,0.20,.18,1.82,c.walnutD,{...MAT.timber,hard:true,gloss:.31,tag});
    box(x,3.61,z,0.20,.98,1.82,c.plaster,{...MAT.stone,hard:true,tag});
    // The paired leaves are permanently held against the jambs, making the connection legible
    // without creating a hidden blocker through the family circulation path.
    for(const s of [-1,1]){
      box(x+s*.08,1.46,z+s*.70,.08,2.65,.28,c.walnut,
        {...MAT.timber,mode:7,gloss:.34,tag});
      ball(x+s*.135,1.42,z+s*.55,.050,.050,.040,c.bronzeL,{gloss:.72,tag});
    }
    box(x-.13,2.72,z,.035,.30,.82,c.ink,{hard:true,mode:1,gloss:.36,tag});
    glyphs(x-.16,2.72,z,-Math.PI/2,'连通门',{size:.095,gap:.016,color:c.bronzeL,
      mode:1,lift:.005,tag});
  }

  function hotelBed(A,c,x,z,w=2.20,tag='大床',accent=c.celadon) {
    const {box,ball,capsule,cyl,shade}=A;
    for(const sx of [-1,1])for(const sz of [-1,1])
      cyl(x+sx*w*.39,.07,z+sz*.82,.085,.14,c.bronzeD,{gloss:.56,tag});
    box(x,.25,z,w,.40,2.12,c.walnutD,{...MAT.timber,mode:7,gloss:.27,tag});
    box(x,.48,z,w-.06,.18,2.05,c.silk,{...MAT.cloth,mode:7,gloss:.03,tag});
    box(x,.64,z-.02,w-.12,.26,1.98,c.white,{...MAT.stone,mode:7,gloss:.02,tag});
    box(x,.76,z-.20,w-.08,.18,1.40,accent,{...MAT.cloth,mode:7,gloss:.025,tag});
    cyl(x,.76,z-.84,.09,w-.12,c.white,{rz:Math.PI/2,gloss:.02,tag});
    box(x,1.31,z+.98,w+.28,1.70,.17,c.walnutD,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,1.31,z+.875,w+.04,1.47,.050,c.silkL,{...MAT.cloth,mode:7,gloss:.035,tag});
    for(const s of [-1,1]){
      box(x+s*w*.23,.88,z+.55,w*.40,.22,.46,c.white,{...MAT.stone,mode:7,gloss:.02,tag});
      ball(x+s*w*.23,1.32,z+.842,.042,.042,.022,c.bronzeL,{mode:1,tag});
    }
    box(x,1.92,z+.815,.30,.30,.030,c.bronzeL,
      {hard:true,rz:Math.PI/4,mode:1,gloss:.68,tag});
    ball(x,1.92,z+.790,.095,.095,.025,accent,{mode:1,gloss:.18,tag});
    shade(x,z,w+.18,2.32,.28);
    A.solid(x-w*.5-.05,x+w*.5+.05,z-1.10,z+1.10);
  }

  function childBed(A,c,x,z,tag='儿童床',accent=c.coralL) {
    const {box,ball,capsule,cyl,shade}=A;
    for(const sx of [-1,1])for(const sz of [-1,1])
      cyl(x+sx*.50,.07,z+sz*.79,.07,.14,c.bronzeD,{gloss:.56,tag});
    box(x,.25,z,1.35,.38,1.96,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    box(x,.48,z,1.28,.18,1.90,c.silk,{...MAT.cloth,mode:7,gloss:.03,tag});
    box(x,.63,z-.03,1.22,.24,1.82,c.white,{...MAT.stone,mode:7,gloss:.02,tag});
    box(x,.73,z-.24,1.24,.15,1.20,accent,{...MAT.cloth,mode:7,gloss:.025,tag});
    cyl(x,.72,z-.80,.075,1.22,c.white,{rz:Math.PI/2,gloss:.02,tag});
    box(x,1.08,z+.91,1.48,1.28,.14,c.walnutD,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,1.08,z+.825,1.25,1.06,.045,accent,{...MAT.cloth,mode:7,gloss:.035,tag});
    box(x,.85,z+.48,.82,.20,.42,c.white,{...MAT.stone,mode:7,gloss:.02,tag});
    // A cloud-shaped padded crest softens the silhouette while remaining tied to the headboard.
    for(const q of [[-.31,1.62,.24],[0,1.73,.31],[.33,1.60,.23]])
      ball(x+q[0],q[1],z+.79,q[2],q[2]*.72,.055,q[0]===0?c.celadonL:accent,
        {...MAT.cloth,mode:7,gloss:.025,tag});
    cyl(x,1.37,z+.77,.032,1.08,c.bronzeL,{rz:Math.PI/2,gloss:.67,tag});
    shade(x,z,1.55,2.16,.25);
    A.solid(x-.72,x+.72,z-1.02,z+1.03);
  }

  function bedside(A,c,x,z,tag='床头柜') {
    const {box,capsule,cyl,taper,ball,luminous}=A;
    box(x,.06,z,.60,.12,.52,c.walnutD,{gloss:.27,tag});
    box(x,.34,z,.66,.52,.58,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,.36,z-.302,.49,.27,.026,c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.05,tag});
    capsule(x,.37,z-.326,.022,.20,.022,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag});
    box(x,.64,z,.72,.07,.62,c.limestone,{...MAT.stone,mode:7,gloss:.18,tag});
    cyl(x,.69,z,.17,.07,c.bronzeD,{gloss:.63,tag});
    cyl(x,.91,z,.026,.42,c.bronze,{gloss:.68,tag});
    taper(x,1.18,z,.35,.38,.35,c.silkL,{...MAT.cloth,mode:7,gloss:.03,tag});
    luminous(ball(x,1.17,z,.075,.095,.075,c.warm,{mode:1,tag}),.025,.28);
    ball(x,1.41,z,.04,.04,.04,c.coral,{gloss:.24,tag});
    A.solid(x-.36,x+.36,z-.33,z+.33);
  }

  function bathroom(A,c,x,z,w=2.55,d=3.05,tag='浴室',compact=false) {
    const {box,cyl,capsule,ball,luminous,flat}=A;
    flat(x,.025,z,w,d,c.limestoneL,{...MAT.stone,mode:7,gloss:.18,tag});
    // Vanity and framed mirror.
    // Pull the vanity tight to the north wall and the bath toward the south wall. Their former
    // conservative colliders almost touched diagonally, turning the visible side aisles into
    // unreachable pockets even though the furniture itself left a clear passage.
    // 602's narrower shell uses a purpose-built compact arrangement. The vanity hugs the
    // northwest wall and the bath hugs the southeast wall, leaving a continuous S-shaped aisle:
    // 0.64 m beside the bath, 0.63 m between fixtures and 0.73 m beside the vanity after the
    // player's full 0.30 m collision radius is applied.
    const vShift=compact?.38:.12,vx=x-w*(compact?.255:.18),vz=z+d*.31+vShift;
    box(vx,.06,vz,w*(compact?.46:.54),.12,compact?.50:.64,c.walnutD,{gloss:.27,tag});
    box(vx,.41,vz,w*(compact?.50:.61),.66,compact?.55:.68,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(vx,.79,vz,w*(compact?.56:.68),.10,compact?.64:.76,c.limestone,{...MAT.stone,mode:7,gloss:.23,tag});
    cyl(vx,.86,z+d*.26+vShift,.23,.055,c.white,{gloss:.31,tag});
    capsule(vx,1.06,z+d*.40+vShift,.028,.31,.028,c.bronze,{gloss:.69,tag});
    box(vx,1.93,z+d*.49+vShift,w*(compact?.58:.70),1.52,.075,c.bronzeD,{hard:true,gloss:.63,tag});
    box(vx,1.93,z+d*.445+vShift,w*(compact?.49:.59),1.36,.025,c.night,
      {hard:true,mode:1,alpha:.75,gloss:.86,tag});
    for(const s of [-1,1]){
      const lx=vx+s*w*(compact?.35:.42);
      cyl(lx,1.93,z+d*.43+vShift,.08,.035,c.bronzeD,{rx:Math.PI/2,gloss:.62,tag});
      luminous(ball(lx,1.93,z+d*.33+vShift,.085,.13,.085,c.warm,{mode:1,tag}),.035,.23);
    }
    // Compact oval bath with water, rim, tap and a supported towel rail.
    const tx=x+w*(compact?.345:.22),tz=z-d*.21-(compact?.22:.12);
    box(tx,.08,tz,w*.47,.16,d*(compact?.34:.38),c.walnutD,{...MAT.timber,mode:7,gloss:.26,tag});
    box(tx,.34,tz,w*.53,.52,d*(compact?.38:.44),c.white,{...MAT.stone,mode:7,gloss:.28,tag});
    box(tx,.63,tz,w*.42,.08,d*(compact?.30:.34),c.celadonL,{...MAT.cloth,mode:7,gloss:.24,tag});
    box(tx,.615,tz,w*.35,.035,d*(compact?.23:.27),c.blueL,{hard:true,mode:1,alpha:.72,gloss:.78,tag});
    cyl(tx+w*.24,.92,tz+d*.13,.030,.35,c.bronze,{gloss:.70,tag});
    capsule(tx+w*.17,1.06,tz+d*.13,.030,.20,.030,c.bronze,
      {rz:Math.PI/2,gloss:.70,tag});
    cyl(x-w*.37,1.15,z-d*.34,.028,w*.32,c.bronze,
      {rz:Math.PI/2,gloss:.68,tag});
    box(x-w*.37,.91,z-d*.34,w*.25,.45,.06,c.white,{...MAT.stone,mode:7,gloss:.02,tag});
    // Collision follows the visible stone cap and tub apron instead of a coarse diagonal pair.
    A.solid(vx-w*(compact?.28:.34),vx+w*(compact?.28:.34),
      vz-(compact?.32:.38),vz+(compact?.32:.38));
    A.solid(tx-w*.27,tx+w*.27,tz-d*(compact?.185:.23),tz+d*(compact?.185:.23));
  }

  function armchair(A,c,x,z,yaw=0,tag='儿童阅读角',fill=c.celadonL) {
    const {box,cyl,ball,capsule,shade}=A;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,
      z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(x,.31,z,.78,.26,.74,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.27,tag});
    box(x,.50,z,.84,.22,.80,fill,{...MAT.cloth,ry:yaw,mode:7,gloss:.03,tag});
    // `yaw` is the sitter's look direction, matching NPC `face`.  Keep the backrest behind the
    // sitter (local -v); putting it at +v made every authored reading-chair heading look reversed.
    const bp=at(0,-.34);
    box(bp[0],.90,bp[1],.86,.84,.16,c.walnutD,{...MAT.timber,ry:yaw,mode:7,gloss:.29,tag});
    const bi=at(0,-.29);
    box(bi[0],.90,bi[1],.68,.64,.10,fill,{...MAT.cloth,ry:yaw,mode:7,gloss:.03,tag});
    for(const s of [-1,1]){
      const ap=at(s*.39,0);
      cyl(ap[0],.65,ap[1],.04,.48,c.walnut,{tag});
      ball(ap[0],.78,ap[1],.115,.10,.30,fill,{...MAT.cloth,ry:yaw,mode:7,gloss:.03,tag});
    }
    const crest=at(0,-.43);
    cyl(crest[0],1.29,crest[1],.030,.68,c.bronzeL,
      {rz:Math.PI/2,ry:yaw,gloss:.68,tag});
    shade(x,z,.95,.95,.22);
    A.solid(x-.43,x+.43,z-.43,z+.43);
  }

  function familySofa(A,c,x,z,tag='家庭客厅') {
    const {box,cyl,ball,capsule,shade}=A;
    box(x,.18,z,3.30,.30,1.08,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    box(x,.45,z,3.42,.32,1.16,c.silk,{...MAT.cloth,mode:7,gloss:.03,tag});
    // The coffee table is north of the sofa, so the back belongs on the south side and the three
    // seats face +z into the grouping.  This 180-degree correction preserves the exact footprint.
    box(x,.89,z-.42,3.46,.82,.22,c.walnutD,{...MAT.timber,mode:7,gloss:.30,tag});
    for(let i=0;i<3;i++){
      const px=x-1.10+i*1.10;
      box(px,.58,z,1.02,.24,.96,i===1?c.celadonL:c.silkL,{...MAT.cloth,mode:7,gloss:.025,tag});
      box(px,.94,z-.36,1.00,.60,.13,i===1?c.celadon:c.coralL,{...MAT.cloth,mode:7,gloss:.025,tag});
      ball(px,.96,z-.275,.04,.04,.025,c.bronzeL,{mode:1,tag});
    }
    for(const s of [-1,1]){
      ball(x+s*1.60,.67,z,.28,.32,.56,s<0?c.coralL:c.celadonL,
        {...MAT.cloth,mode:7,gloss:.025,tag});
      cyl(x+s*1.60,.36,z,.045,.44,c.walnutD,{tag});
    }
    cyl(x,.40,z+.54,.035,2.88,c.bronzeL,{rz:Math.PI/2,gloss:.67,tag});
    shade(x,z,3.65,1.45,.28);
    A.solid(x-1.73,x+1.73,z-.60,z+.60);
  }

  function roundTable(A,c,x,z,r=.70,tag='茶几') {
    const {cyl,capsule,shade}=A;
    cyl(x,.45,z,r,.10,c.walnutD,{gloss:.30,tag});
    cyl(x,.515,z,r*.86,.035,c.limestone,{gloss:.21,tag});
    cyl(x,.535,z,r*.36,.018,c.celadonL,{gloss:.34,tag});
    cyl(x,.25,z,.08,.40,c.bronzeD,{gloss:.60,tag});
    cyl(x,.035,z,r*.55,.07,c.bronzeD,{gloss:.58,tag});
    shade(x,z,r*2.15,r*2.15,.18);
    A.solid(x-r-.03,x+r+.03,z-r-.03,z+r+.03);
  }

  function television(A,c,x,y,z,tag='家庭影院') {
    const {box,cyl,capsule,ball,onTick}=A;
    box(x,.06,z,.72,.12,2.30,c.walnutD,{gloss:.27,tag});
    box(x,.36,z,.80,.58,2.48,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag});
    box(x,.67,z,.88,.08,2.60,c.limestone,{...MAT.stone,mode:7,gloss:.19,tag});
    for(const zz of [z-.70,z,z+.70]){
      box(x-.415,.36,zz,.025,.32,.52,c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.05,tag});
      capsule(x-.438,.36,zz,.018,.16,.018,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag});
    }
    cyl(x-.18,1.02,z,.045,.62,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag});
    box(x,y,z,0.15,1.55,2.52,c.walnutD,{...MAT.timber,mode:7,gloss:.34,tag});
    box(x-.087,y,z,.026,1.39,2.34,c.bronze,{hard:true,mode:1,gloss:.67,tag});
    const screen=box(x-.109,y,z,.014,1.28,2.20,c.blue,
      {hard:true,mode:1,glow:.07,tag});
    ball(x-.125,y-.62,z+.90,.018,.018,.018,c.warm,{mode:1,glow:.12,tag});
    onTick((t,body,mins)=>{
      const h=hours(mins),on=h>=16||h<9;
      screen.color=on?(Math.sin(t*.22)>0?c.blue:c.jade):c.ink;
      screen.glow=on?.08+.025*Math.sin(t*.8):.004;
    });
    A.solid(x-.46,x+.46,z-1.30,z+1.30);
  }

  function bookcase(A,c,x,z,w=6.4,tag='儿童阅读角') {
    const {box,capsule,glyphs}=A;
    box(x,.06,z,w,.12,.62,c.walnutD,{gloss:.27,tag});
    box(x,1.42,z,w,2.72,.56,c.walnut,{hard:true,gloss:.30,tag});
    box(x,2.82,z,w+.12,.13,.68,c.bronzeD,{mode:7,gloss:.61,tag});
    for(let i=0;i<=5;i++)box(x-w*.5+i*w/5,1.42,z-.30,.08,2.62,.58,c.walnutD,
      {hard:true,gloss:.30,tag});
    for(const y of [.42,1.08,1.74,2.40])box(x,y,z-.31,w-.12,.075,.59,
      y===2.40?c.bronzeD:c.walnutL,{...MAT.cloth,mode:7,gloss:.30,tag});
    const books=[c.coral,c.celadon,c.yellow,c.blue,c.silkL,c.lacquer];
    for(let bay=0;bay<5;bay++)for(let shelf=0;shelf<3;shelf++)for(let j=0;j<5;j++){
      const px=x-w*.40+bay*w*.20+(j-2)*.13,hh=.26+((bay+shelf+j)%3)*.055;
      box(px,.48+shelf*.66+hh*.5,z-.625,.10,hh,.20,books[(bay*2+shelf+j)%books.length],
        {...MAT.cloth,mode:7,gloss:.16,rz:(j%3-1)*.045,tag:'绘本'});
    }
    // Low child-height label rail, visibly tied to the central shelf.
    box(x,1.48,z-.655,2.05,.34,.035,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.35,tag});
    glyphs(x,1.48,z-.683,Math.PI,'儿童阅读角',{size:.12,gap:.020,color:c.bronzeL,
      mode:1,lift:.005,tag});
    for(const s of [-1,1])capsule(x+s*.90,1.48,z-.62,.022,.20,.022,c.bronze,
      {rx:Math.PI/2,gloss:.68,tag});
    A.solid(x-w*.5,x+w*.5,z-.68,z+.32);
  }

  function playTable(A,c,x,z,tag='玩具桌') {
    const {cyl,capsule,ball,box,onTick,shade}=A;
    cyl(x,.52,z,1.03,.14,c.walnutD,{gloss:.30,tag});
    cyl(x,.61,z,.91,.045,c.limestoneL,{gloss:.20,tag});
    cyl(x,.635,z,.72,.018,c.celadonL,{gloss:.30,tag});
    cyl(x,.29,z,.10,.46,c.bronzeD,{gloss:.58,tag});
    cyl(x,.035,z,.54,.07,c.bronzeD,{gloss:.57,tag});
    // Track ring, station and moving train are all supported on the play surface.
    for(let i=0;i<16;i++){
      const a=i/16*TAU;
      box(x+Math.sin(a)*.53,.675,z+Math.cos(a)*.53,.18,.026,.055,c.walnutD,
        {ry:a,hard:true,gloss:.30,tag});
    }
    box(x+.30,.71,z+.17,.28,.14,.22,c.coral,{...MAT.cloth,mode:7,gloss:.15,tag});
    const train=fixed(box(x,.72,z+.53,.29,.13,.15,c.toyBlue,{...MAT.cloth,mode:7,gloss:.20,tag}),2.2);
    onTick(t=>{
      const a=t*.40;
      train.m=M.trs(x+Math.sin(a)*.53,.72,z+Math.cos(a)*.53,a,.29,.13,.15);
    });
    for(let i=0;i<5;i++){
      const a=i/5*TAU,px=x+Math.sin(a)*1.42,pz=z+Math.cos(a)*1.42;
      cyl(px,.25,pz,.34,.12,i%2?c.coralL:c.celadonL,{gloss:.035,tag});
      cyl(px,.13,pz,.055,.25,c.walnutD,{tag});
      cyl(px,.035,pz,.25,.07,c.walnutD,{gloss:.28,tag});
    }
    shade(x,z,3.65,3.65,.26);
    A.solid(x-1.06,x+1.06,z-1.06,z+1.06);
  }

  function drawingTable(A,c,x,z,tag='绘画台') {
    const {box,capsule,cyl,shade}=A;
    box(x,.61,z,2.25,.13,.86,c.walnut,{...MAT.timber,mode:7,gloss:.30,tag});
    box(x,.685,z,2.08,.030,.69,c.limestoneL,{hard:true,gloss:.18,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cyl(x+sx*.92,.30,z+sz*.31,.040,.60,c.bronzeD,{tag});
      cyl(x+sx*.92,.035,z+sz*.31,.075,.07,c.bronzeD,{gloss:.58,tag});
    }
    // Paper pads, pencils and a grounded supply caddy sit on the top.
    for(const s of [-1,1]){
      box(x+s*.52,.715,z, .72,.025,.48,c.white,{ry:s*.08,hard:true,gloss:.04,tag});
      for(let i=0;i<4;i++)cyl(x+s*.52+(i-1.5)*.055,.745,z+.05,.009,.35,
        [c.coral,c.jade,c.yellow,c.blue][i],{rx:Math.PI/2,ry:s*.08,gloss:.30,tag});
    }
    box(x,.78,z-.27,.35,.18,.20,c.celadon,{...MAT.cloth,mode:7,gloss:.18,tag});
    shade(x,z,2.55,1.16,.22);
    A.solid(x-1.14,x+1.14,z-.46,z+.46);
  }

  function pantry(A,c) {
    const {box,cyl,ball,capsule,taper,glyphs,luminous}=A;
    // Fully backed walnut millwork along the north wall.
    box(3.25,.06,14.40,5.15,.12,.80,c.walnutD,{gloss:.27,tag:'客用茶水间'});
    box(3.25,1.48,14.55,5.30,2.82,.20,c.walnutD,{hard:true,gloss:.30,tag:'客用茶水间'});
    for(let i=0;i<4;i++){
      const px=1.48+i*1.18;
      box(px,1.82,14.39,1.03,1.00,.31,i%2?c.walnutL:c.celadon,
        {...MAT.cloth,mode:7,gloss:.24,tag:'客用茶水间'});
      box(px,1.82,14.21,.88,.76,.025,c.silkL,{...MAT.cloth,hard:true,mode:7,gloss:.05,tag:'客用茶水间'});
      capsule(px,1.45,14.18,.022,.18,.022,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag:'客用茶水间'});
    }
    box(3.25,.55,13.58,5.05,1.02,.72,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag:'客用茶水间'});
    box(3.25,1.09,13.58,5.18,.09,.80,c.limestone,{...MAT.stone,mode:7,gloss:.22,tag:'客用茶水间'});
    for(let i=0;i<4;i++){
      const px=1.60+i*1.10;
      box(px,.57,13.205,.96,.64,.025,i%2?c.celadonL:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.15,tag:'客用茶水间'});
      capsule(px,.57,13.18,.022,.20,.022,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag:'客用茶水间'});
    }
    // Sink, kettle, cups and tea tins are supported by the stone counter.
    cyl(2.25,1.13,13.55,.31,.045,c.steel,{gloss:.55,tag:'客用茶水间'});
    cyl(2.25,1.38,13.76,.030,.35,c.bronze,{gloss:.69,tag:'客用茶水间'});
    capsule(2.12,1.52,13.76,.030,.22,.030,c.bronze,{rz:Math.PI/2,gloss:.69,tag:'客用茶水间'});
    taper(3.35,1.28,13.55,.18,.25,.18,c.celadonL,{...MAT.cloth,mode:7,gloss:.32,tag:'客用茶水间'});
    capsule(3.58,1.31,13.55,.028,.26,.028,c.bronzeD,{rz:Math.PI/2,gloss:.64,tag:'客用茶水间'});
    for(let i=0;i<4;i++){
      cyl(4.05+i*.25,1.14,13.55,.095,.025,c.bronzeL,{gloss:.63,tag:'客用茶水间'});
      taper(4.05+i*.25,1.22,13.55,.068,.095,.068,c.white,{...MAT.stone,mode:7,gloss:.26,tag:'客用茶水间'});
    }
    for(let i=0;i<3;i++){
      cyl(1.35+i*.31,1.23,13.55,.11,.25,[c.coral,c.jade,c.yellow][i],{gloss:.24,tag:'客用茶水间'});
      cyl(1.35+i*.31,1.37,13.55,.08,.035,c.bronzeL,{gloss:.66,tag:'客用茶水间'});
    }
    box(3.25,2.94,14.29,2.52,.36,.05,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.36,tag:'客用茶水间'});
    glyphs(3.25,2.94,14.24,Math.PI,'客用茶水间',{size:.115,gap:.020,color:c.bronzeL,mode:1,lift:.005,tag:'客用茶水间'});
    for(const s of [-1,1])luminous(ball(3.25+s*2.05,2.94,14.20,.075,.075,.035,c.warm,
      {mode:1,tag:'客用茶水间'}),.03,.18);
    A.solid(.60,5.90,13.12,14.72);

    // Ice machine is an appliance, not a featureless cube: recessed dispensing bay, drip tray,
    // bucket, controls, hinges and toe-kick all articulate the footprint.
    // The wall-integrated chassis keeps its dispensing face at the original plane while extending
    // to the north wall; there is no decorative but body-width-inaccessible slot behind it.
    box(6.78,.06,13.87,1.38,.12,1.72,c.walnutD,{gloss:.27,tag:'制冰机'});
    box(6.78,1.15,13.87,1.46,2.18,1.66,c.steel,{gloss:.48,tag:'制冰机'});
    box(6.78,1.37,13.00,1.08,.70,.035,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.33,tag:'制冰机'});
    box(6.78,1.27,12.96,.76,.42,.03,c.night,{hard:true,mode:1,gloss:.58,tag:'制冰机'});
    box(6.78,.91,12.91,.92,.08,.55,c.steel,{gloss:.54,tag:'制冰机'});
    taper(6.78,1.02,12.85,.28,.34,.28,c.white,{...MAT.stone,mode:7,gloss:.26,tag:'冰桶'});
    cyl(6.78,1.25,12.85,.022,.46,c.bronzeD,{rz:Math.PI/2,gloss:.63,tag:'冰桶'});
    box(6.78,2.02,13.01,.92,.24,.035,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.36,tag:'制冰机'});
    luminous(ball(6.49,2.02,12.98,.045,.045,.020,c.jade,{mode:1,tag:'制冰机'}),.06,.15);
    for(let i=0;i<3;i++)ball(6.75+i*.17,2.02,12.98,.025,.025,.016,c.bronzeL,{mode:1,tag:'制冰机'});
    for(const s of [-1,1])cyl(6.78+s*.57,1.15,13.02,.018,.55,c.bronzeD,{gloss:.61,tag:'制冰机'});
    A.solid(6.02,7.54,12.74,14.72);
  }

  function housekeeping(A,c) {
    const {box,capsule,cyl,ball,glyphs}=A;
    // The satellite is a complete room north of the shared directory. A south-facing cased opening
    // joins the service spine; moving the boundary north removes the former directory/trolley
    // intersection while keeping the exact [9,10] route endpoint clear.
    roomFront(A,c,10.55,16.18,11.82,11.65,'家政工作间',.80,true);
    sideWallSpan(A,c,10.55,11.82,14.70,'家政工作间');
    sideWallSpan(A,c,16.18,11.82,14.70,'家政工作间');
    sign(A,c,11.65,2.64,11.70,0,'家政工作间','HOUSEKEEPING',2.02,c.celadon);
    // East-wall amenity cabinets with grounded plinth, shelves and labelled pull-out bins.
    box(15.68,.06,12.18,.78,.12,4.20,c.walnutD,{gloss:.27,tag:'家政工作间'});
    box(15.78,1.42,12.18,.55,2.72,4.32,c.walnut,{hard:true,gloss:.30,tag:'家政工作间'});
    box(15.43,2.80,12.18,.74,.13,4.42,c.bronzeD,{mode:7,gloss:.62,tag:'家政工作间'});
    for(let i=0;i<4;i++){
      const pz=10.66+i*1.02;
      box(15.41,.60,pz,.025,.66,.85,i%2?c.celadonL:c.silkL,
        {...MAT.cloth,hard:true,mode:7,gloss:.05,tag:'家政工作间'});
      box(15.41,1.62,pz,.025,.92,.85,i%2?c.walnutL:c.celadon,
        {...MAT.cloth,hard:true,mode:7,gloss:.18,tag:'家政工作间'});
      capsule(15.38,.59,pz,.022,.21,.022,c.bronzeL,{rx:Math.PI/2,gloss:.70,tag:'家政工作间'});
      capsule(15.38,1.62,pz,.022,.21,.022,c.bronzeL,{rx:Math.PI/2,gloss:.70,tag:'家政工作间'});
    }
    A.solid(15.34,16.20,9.98,14.42);

    // Open, bronze-framed service cart with visible linen, amenities and four caster assemblies.
    // Park the cart against the east amenity bank. It no longer narrows the doorway throat, and
    // its frame visibly closes the too-small slot that used to become an isolated collision pocket.
    const x=14.40,z=12.45,tag='客房服务';
    box(x,.23,z,1.38,.13,.80,c.walnutD,{...MAT.timber,mode:7,gloss:.28,tag});
    for(const y of [.38,.70,1.02])box(x,y,z,1.22,.075,.66,y===1.02?c.limestone:c.walnutL,
      {...MAT.cloth,mode:7,gloss:y===1.02?.19:.28,tag});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cyl(x+sx*.55,.65,z+sz*.27,.034,.78,c.bronzeD,{gloss:.67,tag});
      cyl(x+sx*.55,.09,z+sz*.27,.11,.08,c.ink,{rz:Math.PI/2,gloss:.22,tag});
      ball(x+sx*.55,.045,z+sz*.27,.045,.04,.045,c.steel,{gloss:.48,tag});
    }
    for(let row=0;row<2;row++)for(let i=0;i<3;i++)for(let j=0;j<2;j++)
      box(x-.34+i*.34,.45+row*.32+j*.075,z-.02,.29,.07,.48,
        (i+j+row)%3?c.white:c.celadonL,{...MAT.cloth,mode:7,gloss:.02,tag});
    for(const zz of [-.26,.26])cyl(x-.72,.87,z+zz,.038,.68,c.bronze,{gloss:.70,tag});
    cyl(x-.72,1.20,z,.038,.58,c.bronze,{rx:Math.PI/2,gloss:.70,tag});
    box(x+.74,.61,z,.34,.74,.64,c.silk,{...MAT.cloth,mode:7,gloss:.025,tag});
    box(x+.74,.99,z,.38,.08,.68,c.bronzeD,{mode:7,gloss:.59,tag});
    A.solid(x-.75,x+.93,z-.40,z+.40);

    // Counter for radios, amenity sorting and room-status checks.
    // A compact counter leaves a measured east-side aisle between the trolley and amenity wall.
    box(12.50,.06,14.32,2.90,.12,.74,c.walnutD,{gloss:.27,tag:'家政工作间'});
    box(12.50,.54,14.32,3.04,.90,.68,c.walnut,{...MAT.timber,mode:7,gloss:.31,tag:'家政工作间'});
    box(12.50,1.02,14.32,3.16,.08,.78,c.limestone,{...MAT.stone,mode:7,gloss:.20,tag:'家政工作间'});
    for(let i=0;i<3;i++){
      box(11.55+i*.85,.56,13.95,.72,.57,.025,i%2?c.celadonL:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.12,tag:'家政工作间'});
      capsule(11.55+i*.85,.56,13.92,.020,.18,.020,c.bronzeL,
        {rz:Math.PI/2,gloss:.70,tag:'家政工作间'});
    }
    for(let i=0;i<4;i++){
      cyl(11.45+i*.38,1.15,14.26,.09,.22,i%2?c.white:c.celadonL,{gloss:.25,tag:'家政工作间'});
      cyl(11.45+i*.38,1.28,14.26,.045,.04,c.bronzeL,{gloss:.65,tag:'家政工作间'});
    }
    box(13.75,1.18,14.27,.45,.25,.22,c.ink,{...MAT.stone,mode:7,gloss:.35,tag:'家政工作间'});
    capsule(13.75,1.42,14.33,.015,.25,.015,c.bronzeD,{gloss:.61,tag:'家政工作间'});
    A.solid(11.00,14.10,13.90,14.72);
  }

  // Back-of-house shelving: plinth, backing, uprights, four shelves and a bronze retaining rail.
  // `dir` is the side the bays open toward, so the same measured carcase serves the linen room,
  // the equipment store and the engineering room. Its footprint gets the matching solid, because
  // geometry alone has never stopped anybody.
  function shelfRun(A,c,x,z0,z1,dir,tag,stock) {
    const {box,cyl,capsule}=A;
    const n=Math.max(1,Math.round((z1-z0)/1.22)),L=(z1-z0)/n,cz=(z0+z1)*.5,D=z1-z0;
    const bx=x+dir*.31;
    box(bx,.06,cz,.62,.12,D,c.walnutD,{hard:true,gloss:.27,tag});
    box(x+dir*.05,1.42,cz,.10,2.72,D,c.walnut,{hard:true,gloss:.30,tag});
    box(bx,2.84,cz,.68,.13,D+.10,c.bronzeD,{hard:true,gloss:.60,tag});
    for(let i=0;i<=n;i++)box(bx,1.42,z0+i*L,.60,2.68,.07,c.walnutD,{hard:true,gloss:.30,tag});
    for(let i=0;i<n;i++){
      const mz=z0+(i+.5)*L;
      for(const y of [.42,1.06,1.70,2.34])
        box(bx,y,mz,.58,.065,L-.11,y===2.34?c.bronzeD:c.walnutL,{hard:true,gloss:.28,tag});
      cyl(x+dir*.61,1.06,mz,.017,L-.24,c.bronzeL,{rx:Math.PI/2,gloss:.68,tag});
      if(stock)stock(bx,mz,L,i);
    }
    A.solid(Math.min(x-.02,x+dir*.64),Math.max(x-.02,x+dir*.64),z0-.03,z1+.03);
  }

  // A wall-hung service cabinet: recessed dark reveal, two leaves, hinges, handle and a label.
  function servicePanel(A,c,x,y,z,yaw,w,h,label,tag) {
    const {box,capsule,ball,glyphs}=A;
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    box(x,y,z,w,h,.09,c.bronzeD,{hard:true,ry:yaw,gloss:.60,tag});
    box(x+nx*.055,y,z+nz*.055,w-.10,h-.10,.030,c.steel,{hard:true,ry:yaw,gloss:.52,tag});
    // The two leaves sit either side of the centre seam; putting both at the panel centre made
    // one an invisible duplicate of the other.
    for(const s of [-1,1]){
      const ux=Math.cos(yaw)*s*w*.24,uz=-Math.sin(yaw)*s*w*.24;
      box(x+nx*.075+ux,y,z+nz*.075+uz,w*.46,h-.16,.018,s<0?c.limestone:c.limestoneL,
        {hard:true,ry:yaw,gloss:.30,tag});
      for(const q of [-1,1])ball(x+nx*.085+ux*1.84,y+q*h*.34,
        z+nz*.085+uz*1.84,.022,.038,.022,c.bronzeL,{gloss:.68,tag});
    }
    capsule(x+nx*.10,y,z+nz*.10,.016,.20,.016,c.bronzeL,{rx:Math.PI/2,ry:yaw,gloss:.70,tag});
    box(x+nx*.088,y+h*.5-.10,z+nz*.088,w*.62,.12,.020,c.ink,{hard:true,ry:yaw,mode:1,gloss:.34,tag});
    glyphs(x+nx*.104,y+h*.5-.10,z+nz*.104,yaw,label,
      {size:.062,gap:.011,color:c.bronzeL,mode:1,lift:.005,tag});
  }

  // ------------------------------------------------------------------- fire-stair lobby (west end)
  function stairLobby(A,c) {
    const {box,cyl,ball,capsule,flat,glyphs,luminous}=A,tag='员工楼梯厅';
    flat(-15.98,.030,-4.40,3.62,9.74,c.limestone,{...MAT.stone,mode:7,gloss:.14,tag});
    for(const z of [-8.94,-.02])flat(-15.98,.035,z,3.34,.055,c.bronzeD,{gloss:.62,tag});
    for(const [z,a] of [[-6.30,.12],[-2.60,-.24]])
      floorRosette(A,c,-15.98,z,.52,a,'员工楼梯厅纹样',c.celadon);
    // Corridor-side wayfinding, clear of the 1.10 m door reveal.
    sign(A,c,-14.07,2.64,-1.00,-Math.PI/2,'员工楼梯厅','STAFF LOBBY',1.74,c.jade);
    glyphs(-14.34,2.18,.55,-Math.PI/2,'安全出口',{size:.10,gap:.018,color:c.bronzeL,
      mode:1,lift:.006,tag});
    glyphs(-14.34,1.86,.55,-Math.PI/2,'客用走廊',{size:.082,gap:.015,color:c.silkL,
      mode:1,lift:.006,tag});
    // Riser cupboard and hose cabinet, both hung on the sealed west face beside the stair.
    servicePanel(A,c,-17.80,1.52,-3.20,Math.PI/2,1.30,1.80,'配电柜',tag);
    servicePanel(A,c,-17.80,1.44,-1.15,Math.PI/2,.86,1.20,'消防栓',tag);
    box(-17.84,1.44,-1.15,.04,1.32,1.00,c.lacquer,{hard:true,gloss:.26,tag});
    // A staff bench with visible frame, seat rail and grounded feet, set against 601's flank —
    // the lobby's east boundary south of the corridor wall.
    box(-14.22,.42,-7.30,.52,.09,2.05,c.walnutL,{...MAT.timber,hard:true,mode:7,gloss:.30,tag});
    box(-14.22,.31,-7.30,.44,.07,1.88,c.walnutD,{...MAT.timber,hard:true,mode:7,gloss:.27,tag});
    for(const z of [-8.10,-6.50])for(const x of [-14.40,-14.04]){
      cyl(x,.21,z,.030,.42,c.bronzeD,{gloss:.62,tag});
      cyl(x,.035,z,.075,.07,c.bronzeD,{gloss:.58,tag});
    }
    A.solid(-14.52,-13.92,-8.36,-6.24);
    // Parked linen trolley, tucked against the sealed west face so the aisle stays open.
    box(-17.42,.24,-8.35,.72,.12,1.16,c.walnutD,{...MAT.timber,hard:true,mode:7,gloss:.28,tag:'员工楼梯厅车'});
    for(const y of [.40,.74])box(-17.42,y,-8.35,.66,.07,1.04,c.walnutL,
      {...MAT.timber,hard:true,mode:7,gloss:.28,tag:'员工楼梯厅车'});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cyl(-17.42+sx*.30,.50,-8.35+sz*.46,.030,.66,c.bronzeD,{gloss:.66,tag:'员工楼梯厅车'});
      cyl(-17.42+sx*.30,.085,-8.35+sz*.46,.09,.07,c.ink,{rz:Math.PI/2,gloss:.22,tag:'员工楼梯厅车'});
    }
    for(let i=0;i<4;i++)box(-17.42,.82+i*.085,-8.35,.56,.08,.86,
      i%2?c.white:c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.02,tag:'员工楼梯厅车'});
    A.solid(-17.82,-17.02,-8.98,-7.72);
    pendant(A,c,-15.98,-6.90,'员工楼梯厅灯',c.celadon);
    pendant(A,c,-15.98,-1.60,'员工楼梯厅灯',c.jade);
    for(const z of [-4.60,-.60])sconce(A,c,-14.28,2.16,z,Math.PI/2,'员工楼梯厅壁灯');
  }

  // ------------------------------------------------------------------------ linen room (west end)
  function linenRoom(A,c) {
    const {box,cyl,ball,capsule,flat,glyphs,luminous}=A,tag='布草间';
    flat(-15.87,.030,7.72,3.86,13.94,c.limestoneL,{...MAT.stone,mode:7,gloss:.16,tag});
    sign(A,c,-16.00,2.64,.44,Math.PI,'布草间','LINEN ROOM',1.94,c.celadon);
    const towels=(bx,mz,L,i)=>{
      for(let k=0;k<3;k++)
        box(bx-.15+k*.15,.66,mz,.13,.24,L*.62,
          (i+k)%3?c.white:c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.02,tag:'床品'});
      for(let k=0;k<2;k++)
        cyl(bx+.06,1.30,mz-L*.22+k*L*.44,.095,L*.30,
          k?c.silkL:c.white,{rx:Math.PI/2,gloss:.03,tag:'毛巾'});
      box(bx,1.90,mz,.30,.32,L*.58,i%2?c.celadonL:c.silkL,
        {...MAT.cloth,hard:true,mode:7,gloss:.025,tag:'被褥'});
      box(bx,2.52,mz,.44,.28,L*.52,i%2?c.walnutL:c.celadon,{...MAT.cloth,hard:true,mode:7,gloss:.20,tag});
    };
    // Everything hugs a wall. The room is 3.70 m wide and the door lands on its centreline, so
    // the two shelf banks and the counter are laid out to keep a continuous aisle of at least
    // 1.80 m clear from the doorway to the far end — measured, not assumed.
    shelfRun(A,c,-17.83,1.40,6.28,1,tag,towels);
    // The west bank starts at z 1.40, and the linen room's south wall stops the body at z 0.98,
    // which left a 0.64 x 0.16 m sliver of floor at z 1.02 (x -17.50 .. -17.02) that a body can
    // stand on and cannot reach — the whole of this floor's coverage 0.9999. Measured, not
    // guessed: flood fill from the lift landing at r 0.30 reported exactly those four cells.
    // The bank's plinth now runs down to the wall, which is what a built-in shelf does anyway,
    // and the matching solid makes the sliver not floor rather than unreachable floor.
    box(-17.52,.06,1.01,.62,.12,.80,c.walnutD,{hard:true,gloss:.27,tag});
    A.solid(-17.85,-17.19,.61,1.41);
    shelfRun(A,c,-17.83,7.60,13.90,1,tag,towels);
    shelfRun(A,c,-13.91,7.10,13.20,-1,tag,towels);
    // Sorting counter against the east flank, with a stone top, drawers and a folded-stock bay.
    box(-14.48,.06,2.70,.70,.12,1.72,c.walnutD,{hard:true,gloss:.27,tag});
    box(-14.48,.53,2.70,.76,.94,1.80,c.walnut,{...MAT.timber,hard:true,mode:7,gloss:.31,tag});
    box(-14.48,1.02,2.70,.86,.09,1.92,c.limestone,{...MAT.stone,hard:true,mode:7,gloss:.21,tag});
    for(let i=0;i<3;i++){
      box(-14.86,.56,2.10+i*.60,.025,.60,.50,i%2?c.celadonL:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.14,tag});
      capsule(-14.89,.56,2.10+i*.60,.019,.19,.019,c.bronzeL,{rx:Math.PI/2,gloss:.70,tag});
    }
    for(let i=0;i<4;i++)box(-14.48,1.16,2.06+i*.42,.60,.20,.36,
      i%2?c.white:c.silkL,{...MAT.cloth,hard:true,mode:7,gloss:.02,tag:'床品'});
    A.solid(-14.90,-14.13,1.78,3.62);
    // Two laundry hampers on visible casters, parked in the gap between the west shelf banks.
    for(const [hx,hz,col] of [[-17.30,6.94,c.celadon],[-16.40,6.94,c.coralL]]){
      cyl(hx,.52,hz,.40,.86,c.walnutD,{hard:true,gloss:.29,tag:'布草间'});
      cyl(hx,.97,hz,.43,.06,c.bronzeD,{gloss:.62,tag});
      ball(hx,1.02,hz,.36,.10,.36,col,{...MAT.cloth,mode:7,gloss:.02,tag:'床品'});
      for(const s of [-1,1])cyl(hx+s*.30,.055,hz,.075,.06,c.ink,{rz:Math.PI/2,gloss:.22,tag});
      A.solid(hx-.46,hx+.46,hz-.46,hz+.46);
    }
    // A stack of folding cots, the family floor's real reason for a room this size. It stands
    // against the east flank in the bay south of the east shelf bank, not across the aisle.
    for(let i=0;i<4;i++)box(-14.42,.22+i*.19,6.30,.86,.16,1.38,
      i%2?c.walnutL:c.walnut,{...MAT.cloth,hard:true,mode:7,gloss:.28,tag:'婴儿床'});
    for(const s of [-1,1])cyl(-14.42,.52,6.30+s*.64,.026,.82,c.bronzeD,
      {rz:Math.PI/2,gloss:.64,tag:'婴儿床'});
    box(-14.42,1.06,6.30,.76,.10,1.26,c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.025,tag:'婴儿床'});
    A.solid(-14.88,-13.96,5.58,7.02);
    glyphs(-14.92,1.42,6.30,-Math.PI/2,'婴儿床',{size:.095,gap:.017,color:c.bronzeL,
      mode:1,lift:.006,tag:'婴儿床'});
    pendant(A,c,-15.95,3.60,'布草间灯',c.celadon);
    pendant(A,c,-15.95,9.05,'布草间灯',c.jade);
    pendant(A,c,-15.95,13.30,'布草间灯',c.celadon);
  }

  // ------------------------------------------------- children's equipment store (lounge/pantry gap)
  function equipmentStore(A,c) {
    const {box,cyl,ball,capsule,flat,glyphs}=A,tag='儿童设备间';
    flat(-1.05,.030,10.02,2.06,9.32,c.limestoneL,{...MAT.stone,mode:7,gloss:.16,tag});
    sign(A,c,-1.05,2.64,5.06,Math.PI,'儿童设备间','FAMILY EQUIPMENT',1.98,c.coral);
    const kit=(bx,mz,L,i)=>{
      for(let k=0;k<2;k++)box(bx-.10+k*.22,.60,mz-L*.20+k*L*.36,.19,.24,L*.30,
        k?c.toyBlue:c.coralL,{...MAT.cloth,hard:true,mode:7,gloss:.14,tag});
      for(let k=0;k<3;k++)box(bx,1.22,mz-L*.28+k*L*.28,.46,.20,L*.20,
        [c.celadonL,c.silkL,c.toyGreen][k],{...MAT.cloth,hard:true,mode:7,gloss:.10,tag});
      box(bx,1.94,mz,.44,.34,L*.60,i%2?c.walnutL:c.celadon,{...MAT.cloth,hard:true,mode:7,gloss:.19,tag});
      box(bx,2.52,mz,.40,.26,L*.52,i%2?c.coralL:c.silkL,{...MAT.cloth,hard:true,mode:7,gloss:.10,tag});
    };
    // The store is only 2.14 m wide, so every piece stands on the west flank and the east half
    // stays a clean 1.50 m aisle from the door to the back wall.
    shelfRun(A,c,-2.12,6.10,9.60,1,tag,kit);
    shelfRun(A,c,-2.12,11.30,14.20,1,tag,kit);
    // Folded high chairs and a parked stroller fill the bay between the two shelf banks.
    for(let i=0;i<3;i++)box(-1.81,.30+i*.22,9.98,.62,.19,.62,
      i%2?c.walnutL:c.walnut,{...MAT.cloth,hard:true,mode:7,gloss:.28,tag});
    for(const s of [-1,1])cyl(-1.81,.52,9.98+s*.26,.024,.58,c.bronzeD,
      {rz:Math.PI/2,gloss:.64,tag});
    box(-1.79,.62,10.86,.60,.10,.52,c.celadon,{...MAT.cloth,hard:true,mode:7,gloss:.14,tag});
    box(-1.79,.98,11.02,.56,.62,.20,c.celadonL,{...MAT.cloth,hard:true,mode:7,gloss:.05,tag});
    cyl(-1.79,1.06,10.62,.026,.44,c.bronze,{rz:Math.PI/2,gloss:.68,tag});
    for(const s of [-1,1])for(const q of [-1,1])
      cyl(-1.79+s*.22,.10,10.86+q*.20,.09,.07,c.ink,{rz:Math.PI/2,gloss:.22,tag});
    A.solid(-2.14,-1.46,9.62,11.20);
    glyphs(-1.44,1.74,10.40,Math.PI/2,'客房备品',{size:.085,gap:.015,color:c.bronzeL,
      mode:1,lift:.006,tag});
    pendant(A,c,-1.05,7.90,'儿童设备间灯',c.coral);
    pendant(A,c,-1.05,12.60,'儿童设备间灯',c.celadon);
  }

  // ---------------------------------------------------- floor engineering room (south-east corner)
  function engineeringRoom(A,c) {
    const {box,cyl,ball,capsule,flat,glyphs,luminous,onTick}=A,tag='工程间';
    flat(14.60,.030,-10.95,5.96,7.57,c.limestone,{...MAT.stone,mode:7,gloss:.13,tag});
    for(const z of [-13.90,-7.80])flat(14.60,.035,z,5.60,.055,c.bronzeD,{gloss:.60,tag});
    sign(A,c,13.40,2.64,-6.90,0,'工程间','ENGINEERING',1.94,c.jade);
    // Distribution boards and valve risers on the two sealed flanks.
    for(let i=0;i<3;i++)
      servicePanel(A,c,17.58,1.62,-13.40+i*1.55,-Math.PI/2,1.28,1.94,
        ['配电柜','阀门井','备件'][i],tag);
    servicePanel(A,c,11.62,1.58,-8.10,Math.PI/2,1.20,1.86,'消防栓',tag);
    const spares=(bx,mz,L,i)=>{
      for(let k=0;k<3;k++)box(bx-.16+k*.16,.60,mz,.14,.24,L*.62,
        (i+k)%3?c.steel:c.bronzeD,{...MAT.cloth,hard:true,mode:7,gloss:.44,tag:'备件'});
      for(let k=0;k<3;k++)cyl(bx-.16+k*.15,1.26,mz,.055,L*.52,
        k%2?c.bronze:c.steel,{rx:Math.PI/2,gloss:.55,tag:'备件'});
      box(bx,1.92,mz,.46,.30,L*.58,i%2?c.walnutL:c.celadon,{...MAT.cloth,hard:true,mode:7,gloss:.20,tag});
      for(let k=0;k<3;k++)box(bx-.14+k*.15,2.46,mz,.13,.22,L*.44,
        [c.coral,c.yellow,c.jade][k],{...MAT.cloth,hard:true,mode:7,gloss:.16,tag:'备件'});
    };
    shelfRun(A,c,11.62,-14.30,-8.90,1,tag,spares);
    // Work bench with a tool board, vice and grounded frame.
    box(14.70,.06,-9.30,2.60,.12,.86,c.walnutD,{hard:true,gloss:.27,tag});
    box(14.70,.50,-9.30,2.74,.88,.80,c.walnut,{...MAT.timber,hard:true,mode:7,gloss:.30,tag});
    box(14.70,.99,-9.30,2.90,.10,.94,c.steel,{hard:true,gloss:.50,tag:'工具'});
    for(let i=0;i<3;i++){
      box(13.85+i*.85,.52,-9.70,.68,.56,.025,i%2?c.celadonL:c.walnutL,
        {...MAT.cloth,hard:true,mode:7,gloss:.14,tag});
      capsule(13.85+i*.85,.52,-9.73,.019,.19,.019,c.bronzeL,{rz:Math.PI/2,gloss:.70,tag});
    }
    box(15.72,1.14,-9.30,.26,.22,.26,c.bronzeD,{hard:true,gloss:.58,tag:'工具'});
    capsule(15.72,1.32,-9.30,.024,.30,.024,c.bronzeL,{rz:Math.PI/2,gloss:.68,tag:'工具'});
    box(14.70,1.86,-8.92,2.50,1.42,.055,c.ink,{...MAT.stone,hard:true,mode:7,gloss:.32,tag:'工具'});
    for(let i=0;i<6;i++){
      const px=13.72+ (i%3)*.98, py=1.44+Math.floor(i/3)*.62;
      capsule(px,py,-8.96,.017,.34,.017,[c.steel,c.bronze,c.bronzeL][i%3],
        {gloss:.56,tag:'工具'});
      cyl(px,py+.22,-8.96,.038,.03,c.bronzeD,{rz:Math.PI/2,gloss:.60,tag:'工具'});
    }
    glyphs(14.70,2.44,-8.98,Math.PI,'工具备件',{size:.095,gap:.017,color:c.bronzeL,
      mode:1,lift:.006,tag:'工具'});
    A.solid(13.24,16.16,-9.78,-8.82);
    // Pipe run and a live status board keep the room reading as plant, not storage.
    for(const [y,col] of [[3.30,c.bronze],[3.06,c.steel]])
      cyl(14.60,y,-11.90,.075,5.60,col,{rz:Math.PI/2,gloss:.58,tag});
    for(const x of [12.30,14.60,16.90])
      cyl(x,3.62,-11.90,.038,.66,c.bronzeD,{gloss:.60,tag});
    const board=box(13.05,1.62,-14.58,1.10,.72,.05,c.night,
      {hard:true,mode:1,gloss:.62,tag});
    box(13.05,1.62,-14.62,1.24,.86,.05,c.bronzeD,{hard:true,gloss:.60,tag});
    const lamps=[];
    for(let i=0;i<4;i++)lamps.push(luminous(ball(12.62+i*.29,1.34,-14.53,.038,.038,.020,
      i===3?c.coral:c.jade,{mode:1,tag}),.07,.16));
    glyphs(13.05,1.80,-14.53,0,'配电',{size:.088,gap:.016,color:c.bronzeL,
      mode:1,lift:.006,tag});
    onTick(t=>{
      board.glow=.05+.02*Math.sin(t*.6);
      for(let i=0;i<lamps.length;i++)
        lamps[i].glow=.05+.09*(.5+.5*Math.sin(t*(.7+i*.23)+i));
    });
    pendant(A,c,13.10,-11.60,'工程间灯',c.jade);
    pendant(A,c,16.10,-11.60,'工程间灯',c.celadon);
  }

  function thing(A,hz,x,z,zh,en,note,focus=[x,z],reach=1.8) {
    return A.thing(hz,x,1.30,z,zh,en,note,{tag:hz,focus,reach});
  }

  function fit6(A) {
    const c=palette(A);
    const {box,cyl,ball,capsule,flat,glyphs,solid,luminous,onTick}=A;

    // Camera volumes follow the actual partitions. Wet rooms are registered first so their
    // tighter chase distance wins over the containing bedroom at the doorway threshold.
    if(A.cameraRoom){
      A.cameraRoom('hotel6-bath601',-13.68,-9.72,-8.70,-5.34,2.45);
      A.cameraRoom('hotel6-bath602',-2.34,.14,-8.66,-5.34,2.35);
      A.cameraRoom('hotel6-bath606',.32,3.38,-8.66,-5.34,2.45);
      A.cameraRoom('hotel6-room601',-13.77,-7.45,-14.55,-5.25,3.15);
      A.cameraRoom('hotel6-room602',-7.35,.15,-14.55,-5.25,3.15);
      A.cameraRoom('hotel6-suite606',.25,10.77,-14.55,-5.25,3.35);
      A.cameraRoom('hotel6-family-lounge',-13.77,-2.25,5.28,14.55,3.35);
      A.cameraRoom('hotel6-guest-pantry',.19,7.86,7.39,14.55,2.85);
      A.cameraRoom('hotel6-housekeeping',10.64,16.09,11.91,14.55,2.75);
      A.cameraRoom('hotel6-service-corridor',8.14,16.10,5.28,11.72,3.25);
      A.cameraRoom('hotel6-linen-store',-17.82,-13.90,.68,14.70,2.70);
      A.cameraRoom('hotel6-equipment-store',-2.12,.02,5.30,14.70,2.30);
      A.cameraRoom('hotel6-engineering',11.58,17.62,-14.70,-7.13,3.05);
      A.cameraRoom('hotel6-stair-lobby',-17.82,-13.90,-9.32,.52,3.05);
      A.cameraRoom('hotel6-guest-corridor',-14.10,11.42,-5.09,5.14,4.05);
      A.cameraRoom('hotel6-lift-landing',11.58,17.70,-6.97,1.97,3.65);
    }

    // ================================================================ floor plate and partitions
    // The twelve camera rectangles above are built here as real construction. Every leaf is a
    // `box` for the eye plus an `A.solid` footprint for the body — `hard:true` is only a mesh
    // choice and has never stopped anybody. Heads, lintels and transoms over an opening carry no
    // solid, which is what keeps a doorway a doorway.
    //
    //   guest corridor   x -14.13 .. 11.41,  z -5.09 .. 5.14
    //   lift landing     x  11.59 .. 17.70,  z -6.97 .. 1.97
    //   service zone     north and east of the corridor, reaching the service lift at x 18.15
    //
    // The plate is 44 x 30 m — far larger than the authored programme — so its west and east
    // ends are what a real tower puts there: the stair core, the lift core and their risers.
    // Those bands are sealed fabric, not walkable floor, and are given wall faces on the side
    // the player can actually see.
    const CXW=-14.22, CXE=11.50, CZN=5.22, BOHW=-17.92;

    // Corridor west end: a solid terminus behind the arrival screen, with one staff door to the
    // fire-stair lobby. 1.10 m clear, measured after both jamb solids.
    sideFront(A,c,CXW,-5.25,5.30,-1.00,'员工楼梯厅',.59,true);
    wallSpan(A,c,-14.30,-13.74,-5.17,'家庭楼层');
    wallSpan(A,c,-14.30,-13.72,CZN,'家庭楼层');

    // Corridor north wall. West of the lounge it is already built; these close the two remaining
    // stretches — the children's equipment store and the housekeeping/service door at x=9, which
    // is exactly where the floor's service route turns north.
    roomFront(A,c,-2.28,.18,CZN,-1.05,'儿童设备间',.57,true);
    roomFront(A,c,7.87,11.58,CZN,9.00,'员工通道',.59,true);

    // Corridor east wall and its 2.20 m lift-lobby portal, centred on z=-3.70 so the authored
    // guest route from the landing runs straight through it.
    sideFront(A,c,CXE,-7.05,5.30,-3.70,'电梯厅',1.14,true);
    wallSpan(A,c,10.74,11.58,-5.17,'家庭套房');
    solid(10.74,11.58,-14.86,-5.09);
    A.blocker(10.70,11.62,-14.90,-5.05,3.90);

    // Lift landing: enclosed on all four sides. North door to the service lift and service
    // corridor, south door into the floor engineering room.
    roomFront(A,c,11.42,17.78,2.05,16.00,'员工通道',.59,true);
    roomFront(A,c,11.42,17.78,-7.05,13.40,'工程间',.59,true);

    // Floor engineering room, filling the south-east quarter beside the lift shafts.
    sideWallSpan(A,c,CXE,-14.86,-7.05,'工程间');
    sideWallSpan(A,c,17.70,-14.86,-7.05,'工程间');
    solid(17.62,21.90,-14.86,-7.05);
    solid(18.55,21.90,-7.05,14.86);
    A.blocker(17.58,21.94,-14.90,-7.01,3.90);
    A.blocker(18.51,21.94,-7.09,14.90,3.90);

    // Service corridor east wall; the 1.58 m gap left south of it is the service-lift approach.
    sideWallSpan(A,c,16.18,6.80,11.82,'员工通道');
    solid(16.26,18.62,6.80,14.86);
    A.blocker(16.22,18.66,6.76,14.90,3.90);

    // West end: fire-stair lobby, then the linen room north of it. The stair vestibule's own
    // opening (z -8.94 .. -5.26) is deliberately left unwalled so the red stair leaf still reads
    // from the lobby, and the stair landing at [-16,-7.1] stays a normal walk away.
    sideWallSpan(A,c,BOHW,-9.40,-8.94,'员工楼梯厅');
    sideWallSpan(A,c,BOHW,-5.26,.60,'员工楼梯厅');
    sideWallSpan(A,c,BOHW,.60,14.78,'布草间');
    wallSpan(A,c,-17.98,-13.82,-9.40,'员工楼梯厅');
    roomFront(A,c,-17.98,-14.14,.60,-16.00,'布草间',.55,true);
    solid(-21.90,-17.84,-14.86,14.86);
    solid(-21.90,-13.90,-14.86,-9.40);
    A.blocker(-21.94,-17.80,-14.90,14.90,3.90);
    A.blocker(-21.94,-13.86,-14.90,-9.36,3.90);

    // ---------------------------------------------------------------- residential arrival gallery
    // One broad, low-sheen woven field reads as hotel carpet rather than a narrow roadway. The
    // former bright parallel edge lines and dashed centre stripe are replaced by alternating
    // border knots and staggered cloud rosettes, so there is no lane-like direction marker.
    flat(-1.34,.023,-3.70,25.42,3.12,c.carpet,{...MAT.cloth,mode:7,gloss:.025,tag:'家庭客房地毯'});
    for(let i=0;i<11;i++){
      const x=-13.55+i*2.57,z=i%2?-2.36:-5.04;
      ball(x,.031,z,.18,.012,.105,i%3===0?c.coralL:c.celadonL,
        {...MAT.cloth,mode:7,gloss:.06,tag:'地毯织边'});
      for(const s of [-1,1])ball(x+s*.25,.034,z,.12,.012,.075,
        s<0?c.bronzeL:c.silkL,{...MAT.cloth,mode:7,gloss:.09,tag:'地毯织边'});
    }
    for(const [x,z,r,a] of [
      [-11.75,-3.82,.64,.04],[-7.15,-3.48,.58,.42],[-2.45,-3.88,.66,-.18],
      [2.35,-3.45,.60,.27],[7.05,-3.90,.66,-.34],[10.55,-3.50,.54,.15],
    ])floorRosette(A,c,x,z,r,a,'家庭客房地毯纹样',x<0?c.celadon:c.coralL);
    cyl(14.18,.018,-3.70,1.45,.018,c.bronzeD,{gloss:.68,tag:'六楼家庭客房'});
    cyl(14.18,.026,-3.70,1.23,.018,c.limestoneL,{gloss:.22,tag:'六楼家庭客房'});
    cyl(14.18,.034,-3.70,.80,.018,c.celadon,{gloss:.30,tag:'六楼家庭客房'});
    for(let i=0;i<8;i++)flat(14.18,.044,-3.70,.075,2.05,c.bronzeL,
      {ry:i*Math.PI/4,gloss:.68,tag:'六楼家庭客房'});
    sign(A,c,18.01,3.66,-.20,Math.PI/2,'六楼家庭客房','6F  FAMILY FLOOR',2.58,c.coral);

    // Joined ceiling coffers and supported pendants give the long hall a deliberate rhythm.
    for(const z of [-4.98,-2.42])box(-1.34,4.05,z,25.30,.13,.13,c.walnutD,
      {hard:true,gloss:.30,tag:'家庭客房'});
    for(const x of [-12,-7.6,-3.2,1.2,5.6,10.0]){
      box(x,4.05,-3.70,.13,.13,2.69,c.walnutD,{hard:true,gloss:.30,tag:'家庭客房'});
      pendant(A,c,x,-3.70,'走廊灯',x%2?c.coral:c.celadon);
    }
    pendant(A,c,14.18,-3.70,'电梯厅灯',c.celadon);
    for(const z of [-5.35,1.15])sconce(A,c,17.92,2.12,z,-Math.PI/2,'电梯厅壁灯');

    // South corridor wall segments leave three generous thresholds into real rooms. 601's entry
    // sits east of its enclosed wet room, creating a proper guest vestibule instead of opening the
    // public corridor directly into the bathroom.
    roomFront(A,c,-13.82,-7.40,-5.17,-8.45,'亲子连通房',.84,false);
    roomFront(A,c,-7.40,.20,-5.17,-4.20,'亲子连通房',.84,false);
    roomFront(A,c,.20,10.82,-5.17,4.90,'家庭套房',.84,false);
    door(A,c,-8.45,-5.17,'601','亲子连通房');
    door(A,c,-4.20,-5.17,'602','亲子连通房');
    door(A,c,4.90,-5.17,'606','家庭套房');
    for(const [i,x,w] of [[0,-11.55,3.82],[1,-6.22,1.76],[2,-1.57,2.88],[3,2.12,3.08],[4,8.29,4.28]])
      framedPanel(A,c,x,1.64,-5.045,w,2.18,i%2?c.coralL:c.celadonL,'家庭客房',0,'cut',1,i);
    // Corridor-side room-number plates. The old pair sat at z=-5.29 — behind the wall, on the
    // bedroom side — and faced +z, straight back into it, so no number has ever been readable
    // from the corridor. Board proud of the jamb, glyph offset the way it looks.
    for(const [x,label] of [[-8.45,'601'],[-4.20,'602'],[4.90,'606']]){
      box(x,2.78,-5.06,.66,.28,.04,c.ink,{hard:true,mode:1,gloss:.36,tag:'家庭客房'});
      glyphs(x,2.78,-5.02,0,label,{size:.115,gap:.020,color:c.bronzeL,
        mode:1,lift:.006,tag:'家庭客房'});
    }

    // Room enclosure and full-height dividing walls. The 601/602 divider retains a measured
    // 1.55 m connecting portal centered at z=-9.35.
    sideWall(A,c,-13.82,-9.92,9.50,'亲子连通房');
    sideWall(A,c,10.82,-9.92,9.50,'家庭套房');
    sideWall(A,c,.20,-9.92,9.50,'家庭套房');
    sideWall(A,c,-7.40,-12.40,4.40,'亲子连通房');
    sideWall(A,c,-7.40,-6.85,3.30,'亲子连通房');
    connectingPortal(A,c,-7.40,-9.35,'连通门');
    // Each camera wet-room volume now corresponds to real full-height partitions and one cased,
    // collision-free doorway. The room-front wall supplies the north side of every enclosure.
    wetRoomShell(A,c,-13.68,-9.72,-8.70,-5.34,'east',-6.34,'六零一浴室');
    wetRoomShell(A,c,-2.34,.14,-8.66,-5.34,'west',-7.45,'六零二浴室');
    wetRoomShell(A,c,.32,3.38,-8.66,-5.34,'east',-6.35,'六零六浴室');

    // Each room receives its own warm floor, perimeter millwork and framed Beijing view.
    const roomFields=[[-10.61,6.42],[-3.60,7.38],[5.51,10.42]];
    for(const [x,w] of roomFields){
      flat(x,.021,-9.92,w,9.48,c.limestoneL,
        {...MAT.stone,mode:7,gloss:.15,tag:'家庭客房'});
      box(x,.10,-14.68,w-.18,.20,.10,c.walnutD,{hard:true,gloss:.28,tag:'家庭客房'});
      box(x,3.09,-14.67,w-.18,.15,.12,c.walnutD,{hard:true,gloss:.29,tag:'家庭客房'});
      skyline(A,c,x,-14.73,w-.42,'家庭客房景观');
      curtains(A,c,x,-14.64,w-.78,'窗帘');
    }

    // 601: adult room of the connecting pair.
    hotelBed(A,c,-10.65,-11.30,2.20,'大床',c.celadon);
    bedside(A,c,-12.25,-11.05);bedside(A,c,-9.02,-11.05);
    bathroom(A,c,-11.45,-7.12,3.15,3.05,'浴室');
    // 601's album hangs on the 601/602 party wall at x -7.40, so the face the room sees is -x.
    framedPanel(A,c,-7.52,2.02,-7.18,1.35,1.42,c.silkL,'家庭相册',Math.PI/2,'photos',-1,0);
    thing(A,'亲子连通房',-8.45,-4.72,'六零一和六零二可以通过房内的连通门互相照应。',
      'Rooms 601 and 602 connect inside so a family can stay together.',
      '亲子 means parent and child; 连通房 means connecting rooms.',[-8.45,-4.05],1.65);
    thing(A,'大床',-10.65,-10.55,'大床使用柔软的分层床品和儿童友好的圆角床架。',
      'The king bed has layered linens and a family-safe upholstered frame.','大床 is a king bed.',[-10.65,-9.85],1.85);
    thing(A,'浴室',-11.45,-7.12,'家庭浴室备有防滑地面和儿童踏凳。',
      'The family bathroom has a slip-resistant floor and a child step.','浴室 is a bathroom.',[-9.85,-7.10],2.05);
    thing(A,'连通门',-7.40,-9.35,'连通门打开后，两间客房仍各有独立的入口和浴室。',
      'With the connecting door open, both rooms retain their own corridor entries.',
      '连通门 is a connecting door.',[-6.55,-9.35],1.75);

    // 602: twin children's room with a shared craft desk and gentle cloud-headboard silhouettes.
    childBed(A,c,-5.55,-11.40,'儿童床',c.coralL);
    childBed(A,c,-2.30,-11.40,'儿童床',c.celadonL);
    bedside(A,c,-3.93,-11.10,'共享床头柜');
    bathroom(A,c,-1.25,-7.12,2.00,2.84,'浴室',true);
    drawingTable(A,c,-4.45,-7.18,'绘画台');
    // Two rounded stools meet the table with child-height seats and broad stable feet.
    for(const x of [-5.20,-3.70]){
      cyl(x,.28,-8.08,.30,.12,x<-4.5?c.coralL:c.celadonL,{gloss:.035,tag:'绘画椅'});
      cyl(x,.14,-8.08,.055,.28,c.walnutD,{tag:'绘画椅'});
      cyl(x,.035,-8.08,.24,.07,c.walnutD,{gloss:.28,tag:'绘画椅'});
    }
    thing(A,'儿童床',-4.00,-10.85,'两张儿童床使用低床架、圆角软包和独立阅读灯。',
      'The two children’s beds use low frames, soft rounded upholstery and individual reading lights.',
      '儿童床 is a child-sized bed.',[-4.00,-9.75],2.05);
    thing(A,'绘画台',-4.45,-7.18,'绘画台准备了纸张、彩笔和收纳盒。',
      'The drawing table is stocked with paper, coloured pencils and a supply caddy.',
      '绘画 means drawing.',[-4.45,-6.03],1.80);

    // 606: a proper family suite, with sleeping and living zones rather than enlarged furniture.
    hotelBed(A,c,3.15,-11.65,2.38,'大床',c.coralL);
    bedside(A,c,1.45,-11.38);bedside(A,c,4.88,-11.38);
    childBed(A,c,8.35,-12.05,'儿童床',c.celadonL);
    bathroom(A,c,1.75,-7.08,2.70,3.02,'浴室');
    familySofa(A,c,7.45,-8.65,'家庭客厅');
    roundTable(A,c,7.45,-6.88,.68,'家庭客厅');
    television(A,c,10.42,1.90,-8.68,'家庭影院');
    framedPanel(A,c,5.85,2.05,-14.55,1.46,1.28,c.celadonL,'家庭套房',0,'photos',1,3);
    thing(A,'家庭套房',4.90,-4.72,'六零六家庭套房把主卧、儿童床和起居区放在同一个安静空间里。',
      'Suite 606 combines a main bedroom, child bed and living area in one calm family space.',
      '家庭套房 means family suite.',[4.90,-4.02],1.75);
    thing(A,'家庭客厅',7.45,-8.65,'一家人可以在起居区一起休息、聊天或吃点心。',
      'The family can relax, talk or share a snack in the living area.',
      '客厅 is a living room.',[7.45,-7.05],2.10);
    thing(A,'家庭影院',10.20,-8.68,'家庭影院提供儿童节目和晚间电影。',
      'The family cinema offers children’s programmes and evening films.',
      '影院 means cinema.',[8.95,-8.68],1.85);

    // ---------------------------------------------------------------- children’s reading/play lounge
    // An enclosed northwest room opens exactly onto the guest-spine waypoint at (-8,4).
    wall(A,c,-11.40,5.22,4.80,.16,'儿童阅读角');
    wall(A,c,-4.55,5.22,4.70,.16,'儿童阅读角');
    // Both flanks now run from the corridor wall to the north perimeter, so the lounge is closed
    // and the 2.14 m slot east of it becomes the children's equipment store rather than an alley.
    sideWallSpan(A,c,-13.82,5.14,14.78,'儿童阅读角');
    sideWallSpan(A,c,-2.20,5.14,14.78,'儿童设备间');
    box(-8.00,3.06,5.22,2.08,.20,.18,c.walnutD,{hard:true,gloss:.31,tag:'儿童阅读角'});
    box(-8.00,3.63,5.22,2.08,.94,.18,c.plaster,{hard:true,tag:'儿童阅读角'});
    sign(A,c,-8.00,2.66,5.13,0,'儿童阅读角','FAMILY LIBRARY',2.26,c.celadon);
    flat(-8.00,.021,9.90,11.45,9.25,c.carpetL,
      {...MAT.cloth,mode:7,gloss:.035,tag:'儿童阅读角'});
    // A celadon/coral cloud border is woven into the rug at floor level.
    for(let i=0;i<12;i++){
      const a=i/12*TAU;
      ball(-8+Math.sin(a)*4.40,.034,9.90+Math.cos(a)*3.38,.34,.018,.20,
        i%2?c.coralL:c.celadonL,{...MAT.cloth,mode:7,gloss:.04,tag:'儿童阅读角'});
    }
    bookcase(A,c,-5.80,14.34,6.45,'儿童阅读角');
    playTable(A,c,-9.25,9.25,'玩具桌');
    drawingTable(A,c,-5.30,7.70,'绘画台');
    // Both reading chairs toe in toward the round table instead of running parallel past it.
    armchair(A,c,-4.55,11.40,-Math.PI*5/6,'儿童阅读角',c.celadonL);
    armchair(A,c,-6.05,11.35, Math.PI*5/6,'儿童阅读角',c.coralL);
    roundTable(A,c,-5.30,10.05,.48,'儿童阅读角');
    // A ceiling-fixed story mobile gives the lounge a soft, animated focal point.
    cyl(-8.00,4.21,12.25,.20,.12,c.walnutD,{gloss:.30,tag:'绘本'});
    cyl(-8.00,3.76,12.25,.022,.78,c.bronzeD,{tag:'绘本'});
    cyl(-8.00,3.42,12.25,.022,2.15,c.bronze,
      {rz:Math.PI/2,gloss:.68,tag:'绘本'});
    const mobile=[];
    for(let i=0;i<7;i++){
      const a=i/7*TAU,px=-8+Math.sin(a)*.88,pz=12.25+Math.cos(a)*.36;
      cyl(px,3.10,pz,.012,.56,c.bronzeD,{tag:'绘本'});
      const p=fixed(ball(px,2.80,pz,.19,.13,.055,i%2?c.coralL:c.celadonL,
        {...MAT.cloth,mode:7,gloss:.035,tag:'绘本'}),2.6);
      mobile.push({p,m:p.m,a});
    }
    onTick(t=>{for(const q of mobile)q.p.m=M.mul(M.trans(
      Math.sin(t*.35+q.a)*.045,0,Math.cos(t*.31+q.a)*.024),q.m);});
    pendant(A,c,-8.00,7.15,'儿童阅读角灯',c.coral);
    pendant(A,c,-8.00,12.55,'儿童阅读角灯',c.celadon);
    thing(A,'儿童阅读角',-5.30,11.15,'儿童阅读角有低矮绘本架、软包阅读椅和安静的灯光。',
      'The children’s reading corner has low picture-book shelves, upholstered chairs and quiet lighting.',
      '阅读角 means reading corner.',[-5.30,10.70],1.95);
    thing(A,'玩具桌',-9.25,9.25,'圆形玩具桌上有一列会绕轨道行驶的小火车。',
      'A little train circles the track on the round play table.','玩具桌 is a play table.',[-8.05,9.25],1.95);

    // ---------------------------------------------------------------- guest pantry and service satellite
    flat(3.95,.021,10.95,8.10,7.35,c.limestoneL,
      {...MAT.stone,mode:7,gloss:.15,tag:'客用茶水间'});
    // The pantry is a true room: three internal partition sides meet the north perimeter, and its
    // single cased south opening remains wider than the player's body-radius clearance.
    roomFront(A,c,.10,7.95,7.30,3.30,'客用茶水间',.90,true);
    // The pantry flanks reach south to the corridor wall. Everything between them and the pantry
    // front is a genuine recess off the guest corridor, not a leak into the service zone.
    sideWallSpan(A,c,.10,5.14,14.78,'客用茶水间');
    sideWallSpan(A,c,7.95,5.14,14.78,'客用茶水间');
    // A broad limestone service-gallery field keeps x=9 clear from the lift to the exact [9,10]
    // route endpoint. Discrete rosettes replace the old transverse gold bars, which read as road
    // markings when seen down the corridor.
    flat(12.12,.020,8.49,7.78,6.22,c.limestone,
      {...MAT.stone,mode:7,gloss:.14,tag:'员工通道石材'});
    for(const [x,z,r,a,accent] of [
      [9.12,6.35,.49,.10,c.celadon],[13.52,7.40,.43,-.28,c.coralL],
      [9.04,9.18,.52,.36,c.coralL],[13.62,10.35,.46,-.08,c.celadon],
    ])floorRosette(A,c,x,z,r,a,'员工通道石材纹样',accent);
    sign(A,c,3.30,2.64,7.18,0,'客用茶水间','GUEST PANTRY',2.40,c.jade);
    pantry(A,c);
    thing(A,'客用茶水间',3.25,13.00,'客用茶水间全天提供热水、茶具和清洁杯具。',
      'The guest pantry provides hot water, tea ware and clean cups all day.',
      '茶水间 is a beverage pantry.',[3.25,12.15],1.85);
    thing(A,'制冰机',6.78,12.98,'把冰桶放在滴水盘上，就可以取冰。',
      'Place the bucket on the drip tray to collect ice.','制冰机 is an ice machine.',[6.78,12.15],1.70);

    flat(13.35,.021,12.08,5.45,5.15,c.carpet,
      {...MAT.cloth,mode:7,gloss:.034,tag:'家政工作间'});
    housekeeping(A,c);
    pendant(A,c,13.25,12.05,'家政工作间灯',c.celadon);
    thing(A,'家政工作间',11.65,12.10,'家政工作间负责补充儿童用品、浴巾和客房备品。',
      'The housekeeping satellite replenishes children’s amenities, towels and guest supplies.',
      '家政 means housekeeping.',[11.65,12.20],1.70);
    thing(A,'客房服务',14.40,12.45,'服务车停在工作间内，不会占用客用走廊。',
      'The service trolley parks inside the workroom instead of blocking the guest corridor.',
      '客房服务 means room service.',[13.15,12.45],1.85);

    // ---------------------------------------------------------------- back of house, west and east
    // The stair lobby, linen room, equipment store and engineering room are the four rooms the
    // partitions above created. Each is entered through one measured opening and each is
    // furnished, because HOTEL.md asks for a back of house that looks worked-in rather than
    // hidden. Their floors also cover the core's lift-landing rug where it runs past the new
    // walls, so no stone band crosses a partition.
    // The core's perimeter shell uses mode 14 and reads as an unlit slab from inside a room that
    // reaches it — HOTEL.md is explicit that no opening may expose shell. Every stretch of the
    // north wall that a room now looks at, and the engineering room's south wall, gets its own
    // plastered lining. These are finishes, not partitions, so they take no solid: the shell
    // behind them already stops the body.
    for(const [x,w,tag] of [[-15.86,3.92,'布草间'],[-8.01,11.46,'儿童阅读角'],
      [-1.05,2.14,'儿童设备间'],[4.03,7.69,'客用茶水间'],[9.25,2.44,'员工通道'],
      [13.37,5.47,'家政工作间']])
      box(x,2.05,14.73,w,4.10,.10,c.plaster,{...MAT.stone,hard:true,tag});
    box(14.60,2.05,-14.73,6.04,4.10,.10,c.plaster,{hard:true,tag:'工程间'});
    for(const z of [11.30,13.90])sconce(A,c,15.98,2.16,z,-Math.PI/2,'家政工作间壁灯');

    stairLobby(A,c);
    linenRoom(A,c);
    equipmentStore(A,c);
    engineeringRoom(A,c);
    flat(13.24,.030,3.65,3.30,3.24,c.limestone,{...MAT.stone,mode:7,gloss:.13,tag:'员工通道'});
    floorRosette(A,c,13.24,3.65,.46,.18,'员工通道纹样',c.celadon);
    sign(A,c,13.10,2.52,2.22,0,'员工通道','SERVICE ROUTE',1.86,c.jade);
    sign(A,c,9.00,2.64,5.06,Math.PI,'员工通道','STAFF ACCESS',1.66,c.jade);
    thing(A,'布草间',-15.90,2.40,'布草间存放床品、毛巾和折叠婴儿床。',
      'The linen room holds bed linen, towels and folding cots.',
      '布草间 is a hotel linen room.',[-15.90,3.35],1.90);
    thing(A,'儿童设备间',-1.60,7.90,'儿童设备间备有婴儿床、餐椅和推车。',
      'The equipment store keeps cots, high chairs and strollers ready.',
      '设备 means equipment.',[-1.05,7.90],1.85);
    thing(A,'工程间',14.70,-9.30,'工程间管理本层的配电、阀门和备件。',
      'The engineering room looks after this floor’s power, valves and spares.',
      '工程 means engineering.',[14.70,-10.30],1.95);

    // Corridor-mounted family-floor artwork and wayfinding complete otherwise blank wall bays.
    framedPanel(A,c,-14.10,2.05,-3.70,2.95,1.58,c.celadonL,'家庭楼层',Math.PI/2,'cut',1,5);
    // The west-end art is a freestanding arrival screen, so its posts and broad feet visibly
    // carry the frame instead of leaving a decorative plane hovering beside the stair route.
    for(const z of [-4.74,-2.66]){
      cyl(-14.10,.78,z,.036,1.56,c.walnutD,{gloss:.30,tag:'家庭楼层'});
      cyl(-14.10,.045,z,.17,.09,c.bronzeD,{gloss:.58,tag:'家庭楼层'});
    }
    solid(-14.20,-14.00,-5.22,-2.18);
    for(const x of [-11.2,-6.0])sconce(A,c,x,2.18,5.05,Math.PI,'家庭楼层壁灯');
    // The corridor end wall now stands at x=-14.22, so this greeting used to be buried inside
    // it and facing away. Lift it above the arrival screen, on the corridor face, looking east.
    glyphs(-14.10,3.30,-3.70,Math.PI/2,'欢迎家庭楼层',
      {size:.115,gap:.020,color:c.bronzeL,mode:1,lift:.006,tag:'家庭楼层'});

    // Day/night story lights: warm at bedtime, restrained during daytime. The fixture remains
    // attached to the bookshelf and the screen is only a glow/color state change.
    const quiet=luminous(box(-5.80,2.92,14.00,5.85,.030,.035,c.warm,
      {hard:true,mode:1,tag:'儿童阅读角'}),.018,.15);
    onTick((t,body,mins)=>{
      const h=hours(mins),bedtime=h>=19.5||h<7;
      quiet.glow=bedtime?.16:.018;
      quiet.color=bedtime?c.warm:c.celadonL;
    });
  }

  HotelFit.register('hotel6',fit6);

  Object.assign(HotelUse.hotel6,{
    '家庭套房':{zh:'参观家庭套房',py:'cānguān jiātíng tàofáng',en:'tour the family suite',secs:2.2,mins:5,gain:{mood:5},pose:{type:'walk'}},
    '亲子连通房':{zh:'参观亲子连通房',py:'cānguān qīnzǐ liántōngfáng',en:'tour the connecting family rooms',secs:2.2,mins:5,gain:{mood:4},pose:{type:'walk'}},
    '连通门':{zh:'查看连通门',py:'chákàn liántōngmén',en:'inspect the connecting door',secs:1.7,mins:2,gain:{},pose:{type:'check'}},
    '大床':{zh:'在大床上休息',py:'zài dàchuáng shàng xiūxi',en:'rest on the king bed',secs:4.1,mins:90,gain:{rest:34,mood:7},pose:{type:'lie',seatY:.60}},
    '儿童床':{zh:'整理儿童床',py:'zhěnglǐ értóngchuáng',en:'tidy the child bed',secs:2.8,mins:10,gain:{clean:4,mood:4},pose:{type:'work'}},
    '浴室':{zh:'使用家庭浴室',py:'shǐyòng jiātíng yùshì',en:'use the family bathroom',secs:3.6,mins:30,gain:{clean:34,rest:8},pose:{type:'scrub'}},
    '家庭客厅':{zh:'和家人一起休息',py:'hé jiārén yìqǐ xiūxi',en:'relax with the family',secs:3.5,mins:28,gain:{rest:13,mood:10},pose:{type:'sit',seatY:.50}},
    '家庭影院':{zh:'看家庭电影',py:'kàn jiātíng diànyǐng',en:'watch a family film',secs:4.0,mins:55,gain:{rest:9,mood:12},pose:{type:'sit',seatY:.50}},
    '儿童阅读角':{zh:'读一本绘本',py:'dú yì běn huìběn',en:'read a picture book',secs:3.4,mins:25,gain:{rest:8,mood:9},pose:{type:'read',seatY:.49}},
    '玩具桌':{zh:'玩轨道火车',py:'wán guǐdào huǒchē',en:'play with the model train',secs:3.2,mins:20,gain:{mood:11},pose:{type:'play',seatY:.38}},
    '绘画台':{zh:'画一幅画',py:'huà yì fú huà',en:'make a drawing',secs:3.5,mins:25,gain:{mood:10},pose:{type:'write',seatY:.45}},
    '客用茶水间':{zh:'泡一杯茶',py:'pào yì bēi chá',en:'make a cup of tea',secs:3.0,mins:12,gain:{rest:7,mood:5},pose:{type:'drink'}},
    '制冰机':{zh:'装一桶冰',py:'zhuāng yì tǒng bīng',en:'fill an ice bucket',secs:2.0,mins:4,gain:{},pose:{type:'reach'}},
    '家政工作间':{zh:'补充客房备品',py:'bǔchōng kèfáng bèipǐn',en:'restock guest amenities',secs:3.2,mins:15,gain:{rest:-4,clean:6},pose:{type:'work'}},
    '客房服务':{zh:'检查服务车',py:'jiǎnchá fúwù chē',en:'check the service trolley',secs:2.0,mins:4,gain:{},pose:{type:'check'}},
    '布草间':{zh:'整理床品',py:'zhěnglǐ chuángpǐn',en:'sort the bed linen',secs:3.0,mins:14,gain:{rest:-3,clean:6},pose:{type:'work'}},
    '儿童设备间':{zh:'取一张婴儿床',py:'qǔ yì zhāng yīng’érchuáng',en:'fetch a folding cot',secs:2.4,mins:6,gain:{},pose:{type:'reach'}},
    '工程间':{zh:'查看配电板',py:'chákàn pèidiànbǎn',en:'check the distribution board',secs:2.2,mins:6,gain:{},pose:{type:'check'}},
  });

  const staffLook=(seed,accent='#5d7567')=>({skin:'#d7a57f',hair:'#29231f',hairStyle:'bun',
    top:'#efe9dd',pants:'#34383e',shoe:'#27292c',jacket:accent,scarf:'#9b7442',uniform:'staff',
    tall:.98,wide:.94,faceSeed:seed});
  const guestLook=(seed,top,style='short',tall=.98)=>({skin:['#d7a37d','#c7916b','#e0af87'][seed%3],
    hair:['#2b2420','#3a302a','#211c19'][seed%3],hairStyle:style,top,pants:'#3b444f',
    shoe:'#e8e0d3',collar:seed%2?'shirt':'crew',tall,wide:tall<.9?.82:.96,faceSeed:seed});

  // These are floor-local people, not aliases of the frozen 82 named identities. Their stable
  // hotelGuestId lets CastCatalog choose and retain a compatible shared production body.
  const cast=[
    {hotelGuestId:'hotel6-family-attendant-liang-jing',hz:'家庭楼层服务员',name:'梁静',py:'Liáng Jìng',
      place:'hotel6',gender:'female',ageBand:'adult',temper:'poised',look:staffLook(5601,'#5b7869'),
      spots:[
        {h0:7,h1:11,at:[11.55,12.05],face:-Math.PI/2,act:'work',held:null},
        {h0:11,h1:18,at:[8.55,11.25],face:Math.PI,act:'check'},
        {h0:18,h1:23,at:[10.85,7.10],face:-Math.PI/2,act:'carry',held:'parcel'},
      ],
      lines:[
        ['您好，六楼的亲子连通房在南侧。','Hello. The connecting family rooms are on the south side.'],
        ['儿童阅读角的绘本每天都会整理。','The picture books in the children’s corner are sorted every day.'],
        ['需要儿童用品的话，我可以送到房间。','I can bring children’s amenities to your room.'],
      ]},
    {hotelGuestId:'hotel6-guest-gu-wenbo',hz:'家庭住客',name:'顾文博',py:'Gù Wénbó',
      place:'hotel6',gender:'male',ageBand:'adult',temper:'patient',seatY:.50,look:guestLook(5611,'#5c7182','short',1.0),
      spots:[
        {h0:7,h1:10,at:[7.45,-8.65],face:0,act:'sit',seatY:.70},
        {h0:10,h1:17,at:[-6.05,11.35],face:Math.PI*5/6,act:'read'},
        {h0:17,h1:23,at:[7.45,-8.65],face:0,act:'sit',seatY:.70},
      ],
      lines:[
        ['两个房间连在一起，照顾孩子很方便。','The two connected rooms make looking after the children easy.'],
        ['这里的阅读角很安静。','The reading corner is very calm.'],
      ]},
    {hotelGuestId:'hotel6-young-guest-gu-xiaohe',hz:'小住客',name:'顾晓禾',py:'Gù Xiǎohé',
      place:'hotel6',ageBand:'child',temper:'genial',seatY:.38,look:guestLook(5612,'#b66f64','bob',.82),
      spots:[
        {h0:7,h1:12,at:[-8.41,8.10],face:-Math.PI/5,act:'play',held:null},
        {h0:12,h1:18,at:[-4.55,11.40],face:-Math.PI*5/6,act:'read'},
        // This is the 75 cm mattress, not the 57 cm structural layer beneath it.
        {h0:18,h1:22.5,at:[8.35,-11.35],face:Math.PI,act:'sit',seatY:.75},
      ],
      lines:[
        ['小火车会一直绕着桌子跑。','The little train goes all the way around the table.'],
        ['我最喜欢窗边那本绘本。','My favourite picture book is the one by the window.'],
      ]},
  ];
  for(const n of cast)
    if(!HotelCast.some(q=>q.hotelGuestId===n.hotelGuestId)) HotelCast.push(n);
})();
