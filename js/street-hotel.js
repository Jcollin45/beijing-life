// 京华大酒店 — the dominant north anchor of the Business District.
//
// The procedural far-side parade remains useful urban fabric, but from z=14.6 northward this
// district gives it a real destination: a landscaped arrival court, extended boulevard, deep
// porte-cochere and a stepped 92 m hotel tower. The playable entrance faces west.

(() => {
  'use strict';
  // 前台 is written on the reception counter seen through the doors (below) and was declared by
  // nobody here — it rendered on characters other hotel modules had asked for. Declare what this
  // module writes; a borrowed glyph is a sign that goes blank when an unrelated file changes.
  try{Glyphs.need('京华大酒店酒店入口礼宾落客出租车停车行李车欢迎光临宴会客房中餐云端前台');}catch(_){}

  const lit=[],lamps=[],pools=[],doors=[],taxiGroups=[],trolleyParts=[],warning=[],sways=[];
  let last=0,lastNight=-1,doorOpen=0,nightOn=0;
  const remember=(p,day=.01,night=.22)=>{p.glow=day;lit.push({p,day,night});return p;};
  // Planting that answers the day's wind instead of standing rigid through a gale. Cull bounds are
  // left at their construction values on purpose: the travel is ~0.1 m inside a crown of radius
  // 0.33–0.48, so the resting sphere still contains every swayed pose and nothing has to be pinned.
  const sway=(p,amp)=>{sways.push({p,m0:p.m,amp,ph:sways.length*1.37});return p;};

  StreetFit['hotel']=S=>{
    const p0=S.props.length;
    const {box,cyl,ball,taper,flat,glyphs,cap,blocker,shade,glow,thing,light,C,G,col}=S;
    const capsule=cap;
    const FACE=41.10,ENT=28.40,Z0=14.55,Z1=48.65,MID=(Z0+Z1)/2;
    const TAG={tag:'京华大酒店'};
    const limestone=C('#c9bda9'),limestoneL=C('#ded3c1'),limestoneD=C('#9f927f');
    const bronze=C('#9b7441'),bronzeL=C('#c9a35d'),bronzeD=C('#5c432b');
    const walnut=C('#47342b'),lacquer=C('#8f3029'),red=C('#b2382f');
    const glass=C('#7693a0'),glassD=C('#1e303a'),glassWarm=C('#d5a96e');
    const ink=C('#222527'),warm=C('#ffe1a6'),white=C('#f5eddf'),celadon=C('#789a89');
    const green=C('#4f7258'),greenL=C('#698b69'),stone=C('#898175'),asphalt=C('#454646');
    const steel=C('#8b9295');
    const PAVE={mat:'paving',matScale:1.0,matAmt:.26};
    const PLASTER={mat:'plaster',matScale:2.9,matAmt:.12};

    // ---------------------------------------------------------------- boulevard and reachable forecourt
    // The old road ended at z=13.5. This continuation is visual road only; the player's safe
    // route stays on the east court and overlaps the original road zone at the corner.
    flat((S.RD0+S.RD1)/2,.004,(13.50+Z1)/2,S.RD1-S.RD0,Z1-13.50,asphalt,
      {mode:7,gloss:.10,mat:'concrete',matScale:2.8,matAmt:.13,tag:'道路'});
    // Lane edge/centre marks and a hotel crossing at the south end.
    for(const x of [S.RD0+.30,(S.RD0+S.RD1)/2,S.RD1-.30])
      for(let z=15.0;z<Z1;z+=4.4)flat(x,.010,z,.07,2.25,x===(S.RD0+S.RD1)/2?C('#d4b448'):white,{gloss:.20,tag:'道路'});
    for(let x=S.RD0+.55;x<S.RD1-.25;x+=.68)flat(x,.014,16.20,.42,3.05,white,{gloss:.22,tag:'人行横道'});
    // Hotel-side paving and a separate charcoal drop-off lane. The clear walking spine is
    // x=39.0..40.5; canopies, taxis and sculpture all stay out of it physically.
    flat(39.28,.014,MID,3.64,Z1-Z0+.5,limestoneL,{mode:7,gloss:.17,...PAVE,tag:'酒店前庭'});
    flat(37.85,.018,MID,1.16,Z1-Z0-1.0,stone,{mode:7,gloss:.13,...PAVE,tag:'落客区'});
    for(let z=17;z<47;z+=3.6)flat(37.85,.022,z,.06,1.75,bronzeL,{gloss:.34,tag:'落客区'});
    // Tactile route into the lobby.
    flat(39.45,.026,ENT,3.10,.32,C('#c09a2e'),{gloss:.14,tag:'无障碍'});
    for(let i=0;i<7;i++)for(const dz of [-.11,.11])cyl(40.05+i*.08,.040,ENT+dz,.019,.010,C('#b48b20'),{tag:'无障碍'});

    // This is the extension consumed by street.js when it seals its zones. It overlaps the old
    // far pavement at z 12.8..13.5 and is consequently walkable without a teleport.
    S.HOTEL_ZONE={id:'hotel-forecourt',x0:37.35,x1:40.92,z0:12.78,z1:48.25,light:[39.4,5.2,ENT]};

    // ---------------------------------------------------------------- podium: base / frame / transparent arrival
    // An opaque skin buries the anonymous shop parade rather than leaving its windows visible
    // through the new architecture.
    box(51.35,7.80,MID,20.50,15.60,Z1-Z0,limestone,
      {hard:true,mode:14,gloss:.16,...PLASTER,...TAG});
    box(FACE+.05,.55,MID,.22,1.10,Z1-Z0+.35,limestoneD,{hard:true,gloss:.18,...TAG});
    blocker(FACE,62,Z0,Z1,16.0);
    // Strong three-storey podium rhythm: tall public glazing, limestone middle, bronze cornice.
    const publicBays=[17.0,20.4,23.8,33.0,36.4,39.8,43.2,46.3];
    for(const z of publicBays){
      box(FACE-.05,3.05,z,.12,4.70,2.45,glassD,{hard:true,gloss:.28,...TAG});
      remember(box(FACE-.12,3.05,z,.035,4.42,2.18,glass,
        {hard:true,mode:1,alpha:.72,gloss:G.glass,...TAG}),.018,.18+((z*7|0)%3)*.055);
      box(FACE-.15,5.42,z,.18,.12,2.56,bronze,{hard:true,gloss:.64,...TAG});
    }
    for(const y of [7.2,10.6]){
      for(let z=16.6;z<47.4;z+=3.25){
        box(FACE-.04,y,z,.10,1.85,2.38,glassD,{hard:true,gloss:.24,...TAG});
        remember(box(FACE-.10,y,z,.030,1.62,2.12,glassWarm,
          {hard:true,mode:1,gloss:G.glass,...TAG}),.008,((y*3+z*5|0)%4)?.19:.045);
      }
    }
    box(FACE-.08,12.50,MID,.22,.36,Z1-Z0+.15,bronzeD,{hard:true,gloss:.62,...TAG});
    box(FACE-.15,14.00,MID,.18,2.45,Z1-Z0-.9,walnut,{hard:true,gloss:.30,...TAG});
    glyphs(FACE-.27,14.06,MID,-Math.PI/2,'京华大酒店',
      {size:.78,gap:.19,color:bronzeL,mode:1,glow:.10,lift:.012,tag:'京华大酒店'});
    glyphs(FACE-.29,13.25,MID,-Math.PI/2,'JINGHUA GRAND HOTEL',
      {size:.20,gap:.045,color:white,mode:1,glow:.05,lift:.012,tag:'京华大酒店'});

    // Deep lobby behind genuinely moving automatic leaves. Reception, art and a luggage trolley
    // remain visible through the opening from the street.
    flat(43.05,.020,ENT,4.20,7.60,limestoneL,{mode:7,gloss:.19,...PAVE,tag:'门'});
    box(45.08,2.18,ENT,.10,4.10,7.30,walnut,{hard:true,mode:6,gloss:.30,tag:'门'});
    remember(box(44.96,2.24,ENT,.035,3.82,6.95,warm,{hard:true,mode:1,tag:'门'}),.04,.24);
    // Monumental ink art beyond the vestibule, offset from the actual path.
    box(44.86,2.28,ENT+1.85,.035,2.80,2.25,white,{hard:true,mode:1,tag:'门'});
    for(let i=0;i<6;i++)capsule(44.82,1.35+i*.35,ENT+1.85+(i%2?-.42:.30),.025,.72,.025,ink,
      {rx:Math.PI/2,tag:'门'});
    // Reception counter and bell desk read through the door as real lobby depth.
    box(44.05,.62,ENT-1.80,1.35,1.12,2.70,limestone,{hard:true,gloss:.22,tag:'前台'});
    box(43.82,1.20,ENT-1.80,.12,.18,2.52,bronze,{hard:true,gloss:.64,tag:'前台'});
    glyphs(43.70,1.44,ENT-1.80,-Math.PI/2,'前台',{size:.16,gap:.035,color:walnut,mode:1,lift:.008,tag:'前台'});
    for(const s of [-1,1]){
      const p=box(FACE-.30,1.58,ENT+s*.72,.055,3.02,1.36,glass,
        {hard:true,mode:1,alpha:.40,gloss:G.glass,tag:'门'});
      p.ob=null;p.fixed=true;p.cx=FACE-.30;p.cy=1.58;p.cz=ENT+s*.72;p.r=2.15;
      doors.push({p,s,m0:p.m});
      box(FACE-.23,1.58,ENT+s*1.55,.12,3.12,.12,bronze,{hard:true,gloss:.68,tag:'门'});
    }
    flat(FACE-.78,.024,ENT,1.50,4.10,ink,{mode:7,gloss:.08,tag:'门'});

    // ---------------------------------------------------------------- porte-cochere and arrival ritual
    box(38.60,5.48,ENT,5.60,.30,13.0,limestoneL,{hard:true,gloss:.18,tag:'酒店入口'});
    box(38.60,5.29,ENT,5.40,.08,12.72,bronzeD,{hard:true,gloss:.58,tag:'酒店入口'});
    remember(box(38.60,5.23,ENT,5.15,.035,12.35,warm,
      {hard:true,mode:1,glow:.08,tag:'酒店入口'}),.04,.34);
    // Columns kept at court edges: nothing interrupts the centred path and outward audit view.
    for(const x of [36.10,40.78])for(const z of [ENT-5.75,ENT+5.75]){
      box(x,2.66,z,.48,5.32,.48,limestoneD,{hard:true,gloss:.20,tag:'酒店入口'});
      box(x,.16,z,.92,.32,.92,limestoneD,{hard:true,gloss:.22,tag:'酒店入口'});
      box(x,.40,z,.70,.18,.70,bronzeD,{hard:true,gloss:.58,tag:'酒店入口'});
      box(x,4.62,z,.60,.18,.60,bronzeD,{hard:true,gloss:.58,tag:'酒店入口'});
      box(x,5.12,z,.88,.22,.88,bronze,{hard:true,gloss:.64,tag:'酒店入口'});
      // A pair of stepped bracket arms visibly carries the canopy into each capital.
      for(const s of [-1,1]){
        box(x,4.92,z+s*.44,.58,.16,.72,bronze,{hard:true,gloss:.62,tag:'酒店入口'});
        box(x,5.05,z+s*.70,.76,.13,.48,bronzeL,{hard:true,gloss:.66,tag:'酒店入口'});
      }
    }
    // The name belongs on the west fascia, where a guest actually approaches it.  The earlier
    // lettering sat under the middle of the 5.6 m canopy: it was physically present but read as a
    // few washed-out pixels behind the taxi.  A walnut blade with bronze Chinese and quiet English
    // now establishes the porte-cochere before the transparent doors beyond it.
    box(35.72,5.40,ENT,.16,.86,8.65,walnut,{hard:true,gloss:.32,tag:'酒店入口'});
    glyphs(35.62,5.55,ENT,-Math.PI/2,'京华大酒店',
      {size:.50,gap:.13,color:bronzeL,mode:1,glow:.18,lift:.012,tag:'酒店入口'});
    glyphs(35.61,5.18,ENT,-Math.PI/2,'JINGHUA GRAND HOTEL',
      {size:.115,gap:.028,color:white,mode:1,glow:.055,lift:.012,tag:'酒店入口'});
    // Abstract guardian forms: recognisably paired protectors without theme-park lion copies.
    for(const s of [-1,1]){
      const z=ENT+s*3.85;
      box(40.10,.28,z,1.05,.42,1.05,limestoneD,{hard:true,gloss:.18,tag:'门神'});
      taper(40.10,.85,z,.76,1.18,.76,limestone,{ry:s*.18,gloss:.15,tag:'门神'});
      ball(40.10,1.55,z,.38,.43,.38,limestoneL,{mode:9,gloss:.14,tag:'门神'});
      // Ginkgo planters behind, framing rather than blocking them.
      taper(39.65,.40,z+s*1.20,.95,.80,.95,bronzeD,{gloss:.48,tag:'银杏'});
      cyl(39.65,1.28,z+s*1.20,.13,1.76,bronze,{gloss:.32,tag:'银杏'});
      for(let i=0;i<5;i++)sway(ball(39.65+(i%2?-.30:.26),2.05+(i%3)*.22,z+s*1.20+(i-2)*.18,.48,.34,.42,
        i%2?green:greenL,{mode:15,gloss:.10,tag:'银杏'}),.105);
    }
    // Bell stand, luggage trolley and a clear visual workplace seam.
    box(40.22,.68,ENT-2.55,.82,1.20,.52,walnut,{hard:true,gloss:.28,tag:'礼宾部'});
    glyphs(40.16,1.15,ENT-2.55,-Math.PI/2,'礼宾',{size:.12,gap:.025,color:bronzeL,mode:1,lift:.007,tag:'礼宾部'});
    const trolley=(x,z)=>{
      const arr=[];const add=p=>{p.ob=null;p.fixed=true;p.cx=x;p.cy=1;p.cz=z;p.r=2.1;arr.push({p,m0:p.m});return p;};
      add(box(x,.55,z,1.12,.12,1.65,bronze,{hard:true,gloss:.68,tag:'行李车'}));
      for(const s of [-1,1])add(capsule(x+s*.48,1.18,z-.62,.055,1.46,.055,bronze,{gloss:.68,tag:'行李车'}));
      add(capsule(x,1.88,z-.62,.055,1.06,.055,bronze,{rz:Math.PI/2,gloss:.68,tag:'行李车'}));
      for(const sx of [-1,1])for(const sz of [-1,1])add(cyl(x+sx*.42,.18,z+sz*.58,.12,.10,ink,{rz:Math.PI/2,tag:'行李车'}));
      // A finished case moves with the trolley: shell, inset front, seams, corner guards, handle
      // and wheels.  The original lone box was not registered with `add`, so the frame rolled away
      // while its luggage stayed behind — a literal floating-object failure.
      add(box(x,.86,z,.68,.48,.76,lacquer,{gloss:.38,tag:'行李车'}));
      add(box(x-.35,.86,z,.025,.34,.60,red,{hard:true,gloss:.34,tag:'行李车'}));
      for(const sy of [-1,1])add(box(x-.37,.86+sy*.17,z,.025,.035,.58,bronzeL,
        {hard:true,gloss:.62,tag:'行李车'}));
      for(const sz of [-1,1])add(box(x-.37,.86,z+sz*.29,.025,.34,.04,bronzeL,
        {hard:true,gloss:.62,tag:'行李车'}));
      add(capsule(x,1.23,z,.035,.32,.035,bronzeD,{rz:Math.PI/2,gloss:.58,tag:'行李车'}));
      for(const sz of [-1,1])add(cyl(x,.56,z+sz*.25,.055,.06,ink,{rz:Math.PI/2,tag:'行李车'}));
      return arr;
    };
    trolleyParts.push(...trolley(40.15,ENT+2.55));

    // ---------------------------------------------------------------- stepped tower: three setbacks and bronze crown
    // Lower tower begins two metres behind the podium face; successive stages pull back again.
    box(52.15,43.0,MID,18.10,56.0,25.6,limestone,
      {hard:true,mode:14,gloss:.15,...PLASTER,...TAG});                    // 15..71
    box(53.15,74.0,MID,15.30,6.0,21.2,limestoneL,
      {hard:true,mode:14,gloss:.15,...PLASTER,...TAG});                    // 71..77
    box(54.20,80.5,MID,12.30,7.0,17.4,limestone,
      {hard:true,mode:14,gloss:.15,...PLASTER,...TAG});                    // 77..84
    blocker(42.9,61.3,MID-13.0,MID+13.0,84.5);

    // Front window bays, recessed and individually occupied. Deterministic variation avoids one
    // lit spreadsheet while adding no RNG coupling to the rest of Street.
    const pane=(x,y,z,w,h,seed)=>{
      box(x+.04,y,z,.11,h,w,glassD,{hard:true,gloss:.24,...TAG});
      const warmRoom=((seed*37+11)%7)<4;
      return remember(box(x-.035,y,z,.030,h-.20,w-.18,warmRoom?glassWarm:glass,
        {hard:true,mode:1,gloss:G.glass,...TAG}),.006,warmRoom?.20+((seed%3)*.035):.055);
    };
    let seed=0;
    for(let y=18.2;y<=68.2;y+=3.08)for(let z=MID-10.9;z<=MID+10.9;z+=3.12)pane(43.05,y,z,2.32,1.72,seed++);
    // Limestone bands give human scale and emphasize the lower setback.
    for(let y=19.7;y<=70;y+=6.16)box(42.96,y,MID,.18,.12,25.0,bronzeD,{hard:true,gloss:.52,...TAG});
    // Side returns, fewer panes but enough to keep the approach silhouette three-dimensional.
    for(const side of [-1,1])for(let y=18.2;y<=68.2;y+=3.08)for(let x=45.2;x<=59.2;x+=3.45){
      const z=MID+side*12.84;
      box(x,y,z,2.45,1.72,.10,glassD,{hard:true,gloss:.24,...TAG});
      remember(box(x,y,z+side*.065,2.24,1.50,.03,glass,
        {hard:true,mode:1,gloss:G.glass,...TAG}),.005,((x*7+y*3|0)%5)?.12:.035);
    }
    // Upper-stage windows are taller and calmer: executive lounge and suites behind the setback.
    for(let y=73;y<=82.2;y+=3.0)for(let z=MID-7.2;z<=MID+7.2;z+=3.0)pane(y<77?45.45:48.0,y,z,2.18,1.86,seed++);

    // A vertical bilingual identity blade on the tower shoulder, legible from the hutong axis.
    box(42.72,45.0,MID-11.35,.36,34.0,2.35,walnut,{hard:true,gloss:.30,...TAG});
    glyphs(42.48,46.0,MID-11.35,-Math.PI/2,'京华大酒店',
      {size:1.28,gap:.42,vertical:true,color:bronzeL,mode:1,glow:.13,lift:.016,tag:'京华大酒店'});
    glyphs(42.45,34.0,MID-11.35,-Math.PI/2,'JINGHUA',
      {size:.34,gap:.10,vertical:true,color:white,mode:1,glow:.06,lift:.016,tag:'京华大酒店'});

    // Modern dougong/bracket crown: vertical pavilion rhythm, layered cantilevers and no fake roof.
    for(const z of [MID-8.0,MID-5.3,MID-2.65,MID,MID+2.65,MID+5.3,MID+8.0]){
      box(54.2,87.0,z,12.85,.34,.28,bronzeD,{hard:true,gloss:.64,...TAG});
      box(48.25,88.7,z,.34,8.0,.34,bronze,{hard:true,gloss:.66,...TAG});
      box(60.15,88.7,z,.34,8.0,.34,bronze,{hard:true,gloss:.66,...TAG});
      for(const x of [49.2,59.2])capsule(x,90.4,z,.16,2.65,.16,bronzeL,{rz:Math.PI/2,gloss:.68,...TAG});
    }
    box(54.2,84.5,MID,13.5,.42,18.2,bronzeD,{hard:true,gloss:.62,...TAG});
    box(54.2,92.6,MID,14.2,.32,18.8,bronzeL,{hard:true,gloss:.66,...TAG});
    // Celadon-glass roof lantern and four aircraft lights make the crown live at night.
    remember(box(54.2,90.0,MID,6.8,5.0,7.4,celadon,{hard:true,mode:1,alpha:.62,gloss:G.glass,...TAG}),.015,.32);
    // Obstruction lights. Two things were wrong with these and only the second one is obvious.
    //
    // They were r=0.14, about four pixels on HT-EXT-night's 84 m architectural lens and nothing at
    // all from the hutong — so r=0.30, with a brighter peak set night-gated in the tick.
    //
    // And they stood at y 93.05 on top of the 14.2 x 18.8 m bronze cap at y 92.6, inboard of its
    // rim on every side. Every camera that can see this building is below it. Looking up at a
    // table you do not see what is on the table: the cap occluded all four of them from the whole
    // city, which is why cropping the crown out of the night render showed bare sky where they
    // should have been. They now sit level with the rim and 0.5 m outboard of it, each on a short
    // bronze arm that springs from the cap edge, so the light itself clears the plate from below.
    for(const [x,ax] of [[46.60,46.90],[61.80,61.50]])for(const z of [MID-8.2,MID+8.2]){
      cyl(ax,92.60,z,.06,.60,bronzeD,{rz:Math.PI/2,gloss:.58,tag:'航空灯'});
      warning.push(ball(x,92.60,z,.30,.30,.30,red,{mode:1,glow:.06,tag:'航空灯'}));
    }

    // ---------------------------------------------------------------- arrivals in motion
    function taxi(z0,paint,phase){
      const arr=[];const x=37.83;const add=p=>{p.ob=null;p.fixed=true;p.cx=x;p.cy=.8;p.cz=MID;p.r=20;arr.push({p,m0:p.m});return p;};
      // Overlapping hull, shoulder caps and a framed glasshouse retain the economical procedural
      // style without exposing the old two-box placeholder silhouette.
      add(box(x,.36,z0,1.72,.30,3.82,ink,{gloss:.18,tag:'出租车'}));
      add(box(x,.64,z0,1.80,.66,3.72,paint,{gloss:.48,tag:'出租车'}));
      add(ball(x,.91,z0+1.28,.82,.17,.62,paint,{mode:7,gloss:.48,tag:'出租车'}));
      add(ball(x,.88,z0-1.35,.80,.15,.52,paint,{mode:7,gloss:.48,tag:'出租车'}));
      add(box(x,1.12,z0-.16,1.56,.68,1.92,glassD,{gloss:.68,tag:'出租车'}));
      add(box(x,1.48,z0-.16,1.50,.12,1.72,paint,{gloss:.52,tag:'出租车'}));
      add(box(x,1.15,z0+.78,1.42,.48,.055,glass,{hard:true,rx:-.30,gloss:.84,tag:'出租车'}));
      add(box(x,1.15,z0-1.10,1.38,.44,.055,glass,{hard:true,rx:.36,gloss:.84,tag:'出租车'}));
      for(const sx of [-1,1]){
        for(const z of [z0+.34,z0-.61])add(box(x+sx*.79,1.16,z,.035,.46,.70,glass,
          {hard:true,gloss:.82,tag:'出租车'}));
        add(box(x+sx*.81,1.16,z0-.14,.025,.56,.10,ink,{hard:true,gloss:.24,tag:'出租车'}));
        add(box(x+sx*.84,.91,z0+.30,.020,.035,.30,bronzeL,{hard:true,gloss:.56,tag:'出租车'}));
        add(box(x+sx*.84,.91,z0-.58,.020,.035,.30,bronzeL,{hard:true,gloss:.56,tag:'出租车'}));
        add(capsule(x+sx*.88,1.08,z0+.86,.035,.25,.035,ink,{rx:Math.PI/2,tag:'出租车'}));
        add(ball(x+sx*.98,1.09,z0+.85,.13,.075,.17,ink,{mode:7,gloss:.54,tag:'出租车'}));
      }
      // Bumpers bite into the hull; lamps and plates are inset into those assemblies.
      add(box(x,.61,z0+1.91,1.60,.28,.14,ink,{hard:true,gloss:.36,tag:'出租车'}));
      add(box(x,.61,z0-1.91,1.56,.28,.14,ink,{hard:true,gloss:.36,tag:'出租车'}));
      // Head and tail lamps belong to the night application like every other emitter out here.
      // They used to carry a fixed `glow`, so a taxi under the canopy at two in the afternoon had
      // its lights on and the crown's beacons flashed over a blue sky — the one class of emitter
      // `_applyNight` did not reach.
      for(const sx of [-1,1]){
        remember(add(box(x+sx*.56,.79,z0+1.94,.42,.11,.035,warm,{hard:true,mode:1,tag:'出租车'})),.012,.30);
        remember(add(box(x+sx*.56,.80,z0-1.94,.40,.12,.035,red,{hard:true,mode:1,tag:'出租车'})),.010,.24);
      }
      add(box(x,.54,z0+1.97,.48,.14,.025,C('#2e7a45'),{hard:true,gloss:.26,tag:'出租车'}));
      add(box(x,.54,z0-1.97,.48,.14,.025,C('#1f4f8f'),{hard:true,gloss:.26,tag:'出租车'}));
      // Roof lamp is supported by a dark foot and carries a warm emissive lens.
      add(box(x,1.53,z0-.14,.58,.08,.34,ink,{hard:true,gloss:.28,tag:'出租车'}));
      remember(add(box(x,1.61,z0-.14,.52,.16,.28,warm,{mode:1,tag:'出租车'})),.06,.34);
      for(const sx of [-1,1])for(const sz of [-1,1]){
        add(cyl(x+sx*.72,.32,z0+sz*1.23,.29,.16,ink,{rz:Math.PI/2,gloss:.16,tag:'出租车'}));
        add(cyl(x+sx*.81,.32,z0+sz*1.23,.17,.025,steel,{rz:Math.PI/2,gloss:.46,tag:'出租车'}));
      }
      taxiGroups.push({arr,z0,phase});
    }
    taxi(18.0,lacquer,0);taxi(41.0,C('#315d78'),17.0);

    // Warm court lamps, planters and taxi queue sign. All stay against the road edge.
    for(const z of [18.2,39.0,46.0]){
      cyl(38.65,2.70,z,.075,5.40,bronzeD,{gloss:.54,tag:'路灯'});
      box(38.65,5.32,z,.68,.14,.28,bronze,{hard:true,gloss:.64,tag:'路灯'});
      const lm=light(39.05,5.08,z,[1,.78,.48],.54,7.5);lm.on=false;lamps.push(lm);
      pools.push({g:glow(M.trs(39.15,.032,z,0,3.0,1,5.8),warm,0),a:.20});
    }
    box(38.70,1.25,16.0,.24,2.25,.82,bronzeD,{hard:true,gloss:.58,tag:'出租车'});
    glyphs(38.55,1.55,16.0,-Math.PI/2,'出租车',{size:.13,gap:.025,color:white,mode:1,lift:.008,tag:'出租车'});
    for(const z of [20.5,36.4,44.5]){
      taper(40.30,.34,z,.92,.68,.92,limestoneD,{gloss:.18,tag:'绿化'});
      for(let i=0;i<4;i++)sway(ball(40.30+(i%2?-.20:.24),.82+(i%3)*.16,z+(i-1.5)*.20,.38,.33,.38,
        i%2?green:greenL,{mode:15,gloss:.10,tag:'绿化'}),.045);
    }

    // The real threshold. HOTEL_OUT is clear paving under the canopy, not inside a taxi or planter.
    const door=thing('京华大酒店',FACE-.55,2.20,ENT,
      '京华大酒店是商务区最高的建筑。',
      'Jinghua Grand Hotel is the Business District\'s tallest building.',
      '酒店 hotel. 京华 is an old poetic name associated with the capital.',
      {tag:'京华大酒店',focus:[HOTEL_OUT.x,HOTEL_OUT.z],reach:2.65});
    // Read the arrival point rather than repeat it. This and floor 1's own `spawn` are the two
    // live sites; HOTEL_CORE.entrance.inside published a third, different number that nothing read.
    door.exit={place:'hotel',
      at:{x:HOTEL_CORE.entrance.inside[0],z:HOTEL_CORE.entrance.inside[1],yaw:0}};
    S.HOTEL_OUT=HOTEL_OUT;
    shade(39.1,ENT,4.0,13.6,.26);shade(52,MID,21,35,.26);

    const applyNight=k=>{
      nightOn=k?1:0;
      for(const q of lit)q.p.glow=k?q.night:q.day;
      for(const l of lamps)l.on=!!k;
      for(const q of pools)q.g.a=k?q.a:0;
    };
    StreetFit['hotel']._applyNight=applyNight;
    StreetFit['hotel'].OUT=HOTEL_OUT;
    StreetFit['hotel'].state={entrance:{open:0,near:false},taxis:[],tower:{height:93.05,windows:lit.length}};
    StreetFit['hotel'].propCount=S.props.length-p0;
  };

  StreetFit['hotel'].tick=(t,body,mins)=>{
    const dt=last?Math.min(.20,Math.max(0,t-last)):0;last=t;
    const px=body&&Number.isFinite(body.x)?body.x:99,pz=body&&Number.isFinite(body.z)?body.z:99;
    const near=Math.abs(px-HOTEL_OUT.x)<3.1&&Math.abs(pz-HOTEL_OUT.z)<3.55;
    const target=near?1:0;
    doorOpen+=(target-doorOpen)*(1-Math.exp(-dt*(target?7.0:4.2)));
    if(Math.abs(target-doorOpen)<.001)doorOpen=target;
    for(const q of doors)q.p.m=M.mul(M.trans(0,0,q.s*.86*doorOpen),q.m0);

    // Two taxis circulate only while the hotel end of the street is plausibly in range. Their
    // parts share a translation; broad fixed cull spheres cover the complete lane.
    if(Math.hypot(px-39,pz-31)<75){
      for(const g of taxiGroups){
        const u=(t*.62+g.phase)%38;
        // Ease through a four-second lobby dwell without stopping the other cab.
        let z=14.8+u;
        if(z>26.0&&z<30.8)z=26.0+(z-26.0)*.28;
        const dz=z-g.z0;
        for(const q of g.arr)q.p.m=M.mul(M.trans(0,0,dz),q.m0);
      }
      // The trolley nudges rather than tours. H059 wants a route and the forecourt has nowhere to
      // put one: measured, the clear corridor between the taxi envelope (x ≤ 38.73) and the ginkgo
      // planters (x ≥ 39.18) is 0.45 m against a trolley 1.12 m wide, and along z the gap between
      // the north planter (ends 30.08) and the north guardian (starts 31.73) is 1.65 m against a
      // trolley 1.65 m deep — a single legal centre point, which is where it stands. The old ±0.35
      // amplitude therefore drove it 0.30 m through the planter's stonework twice a cycle. A real
      // bell round needs the guardian/ginkgo line re-planned; until then it stays inside its slot.
      const slide=.10*Math.sin(t*.55);
      for(const q of trolleyParts)q.p.m=M.mul(M.trans(0,0,slide),q.m0);

      // Wind moves the planting, read off the shared Weather rather than rolled here. `wet` needs
      // no equivalent: game.js:12731 already hands the renderer the day's ground wetness for every
      // outdoor scene, so the forecourt paving darkens in rain through the same path as the street.
      if(sways.length){
        const W=typeof Weather!=='undefined'&&Weather.now?Weather.now:null;
        const wind=W&&Number.isFinite(W.wind)?W.wind:.25;
        const gust=W&&Number.isFinite(W.gust)?W.gust:0;
        const amt=.30+wind*.70+gust*.35, rate=1.05+wind*1.30;
        for(const q of sways)q.p.m=M.mul(
          M.trans(q.amp*amt*Math.sin(t*rate+q.ph),0,q.amp*amt*.42*Math.sin(t*.71+q.ph*1.7)),q.m0);
      }
    }
    // Aircraft beacons alternate rather than flash in perfect unison — and, like every other
    // emitter out here, they belong to the night application. They used to carry a fixed pair of
    // levels, so the crown strobed red over a midday sky; `_applyNight` never reached them because
    // their glow is rewritten each frame rather than set once by `remember`.
    const beaconHi=nightOn?.95:.10, beaconLo=nightOn?.06:.02;
    for(let i=0;i<warning.length;i++)
      warning[i].glow=((Math.floor(t*1.4)+i)%4===0)?beaconHi:beaconLo;

    if(mins!==undefined){const h=(mins/60)%24,night=h<6.2||h>=18.4?1:0;
      if(night!==lastNight){lastNight=night;const fn=StreetFit['hotel']&&StreetFit['hotel']._applyNight;if(fn)fn(night);}}
    const st=StreetFit['hotel']&&StreetFit['hotel'].state;
    if(st){st.entrance={open:+doorOpen.toFixed(3),near};st.taxis=taxiGroups.map(g=>({phase:g.phase}));}
  };

  // ------------------------------------------------------------------------------ H191 · 行李
  //
  // A bell porter who moves luggage on a ROUTE instead of standing at a spot. The route is the one
  // a bell porter actually walks: in at the vestibule, west along the front of the lobby to the
  // trolley and the bag store beside the concierge desk, back east across the arrival aisle and up
  // to the lift landing, then round again.
  //
  // Spots rather than `patrol`, and that is the whole design decision here. `npcTarget`
  // (js/game.js:4171) clears `carrying` before it reads a patrol leg, so a patrolling figure
  // physically cannot hold anything — a bell porter with empty hands is not moving luggage. A spot
  // list keeps `held`, and a spot change makes the body WALK to the next point (js/game.js:5251),
  // so this is a real circuit with a case in it. Forty-five minutes a leg, seven legs a lap, and
  // he is off the floor between ten at night and seven.
  //
  // Every point is measured against floor 1's own colliders rather than placed by eye. The two
  // that matter in this band are the concierge desk (x -12.55..-8.25, z -13.24..-12.20) and the
  // reception counter (x 5.50..13.40, z -13.34..-12.02), both from hotel-public.js:395/523; the
  // lift bank starts at x 17.70 and the fire stair ends at x -17.84, so the last stop at 15.30 and
  // the west stop at -14.20 are both clear, and nothing on the lap is nearer than 0.9 m to a
  // collider. The whole route runs at z -11.30..-5.60 — north of both counters and south of the
  // tea salon's chair solids, which start at z 6.93.
  const bellStops = [
    { at:[ 1.60,-11.30], face:Math.PI,     act:'carry', held:'parcel' },   // just inside the doors
    { at:[-6.00,-11.10], face:-Math.PI/2,  act:'carry', held:'parcel' },
    { at:[-14.20,-11.10],face:Math.PI,     act:'work',  held:null },       // the trolley and store
    { at:[-6.00,-10.60], face:Math.PI/2,   act:'carry', held:'parcel' },
    { at:[ 3.50,-10.20], face:Math.PI/2,   act:'carry', held:'parcel' },
    { at:[11.00, -8.20], face:Math.PI/2,   act:'carry', held:'parcel' },
    { at:[15.30, -5.60], face:Math.PI/2,   act:'wait',  held:null },       // handing over at the lift
  ];
  const bellSpots = [];
  for (let i = 0; i < 20; i++) {
    const s = bellStops[i % bellStops.length];
    bellSpots.push({ h0:7 + i * .75, h1:7 + (i + 1) * .75,
                     at:s.at.slice(), face:s.face, act:s.act, held:s.held });
  }

  // A small foundational cast: later floor modules add their own guests and department teams.
  HotelCast.push(
    {hz:'行李员',name:'邵峰',py:'Shào Fēng',gender:'male',ageBand:'young',place:'hotel',
      dept:'concierge',temper:'brisk',speed:1.06,
      look:{skin:'#c78f65',hair:'#221d1b',hairStyle:'short',top:'#eee5d7',pants:'#2a2c31',shoe:'#252529',
            jacket:'#5c302d',hatColor:'#5c302d',tall:1.01,wide:1.00,faceSeed:455},
      spots:bellSpots,
      lines:[['行李我送到房间，您先去前台。','I will take the bags up; please go to the desk.'],
             ['大件先寄存，牌子给您。','Large items go into the store — here is your tag.'],
             ['行李车走这条线，不穿大堂中间。','The trolley keeps to this line and never crosses the middle of the lobby.']]},
    {hz:'礼宾员',name:'周礼宾',py:'Zhōu lǐbīn',place:'hotel',rig:'hotel-concierge-zhou-libin',temper:'poised',
      look:{skin:'#d6a477',hair:'#252424',hairStyle:'part',top:'#eee7dc',pants:'#292a2d',shoe:'#272629',
            jacket:'#5c302d',tie:'#b28a48',tall:1.03,wide:.98,faceSeed:451},
      // The public-floor fit-out places the concierge desk against the south wall.  Stand behind
      // its actual centre bay, clear of the counter collider, rather than in the arrival aisle.
      //
      // H189, the half this row owed. The note that used to stand here said "a real shift pattern
      // (a different night person) is a cast-lane change" — this IS the cast lane, and it has been
      // made. He works 06:00-22:00 and then goes home; 梁越 below has the desk overnight and 邱蔓
      // the concierge station, so the person you meet at three in the morning is not the person
      // you met at three in the afternoon.
      //
      // The station still does not move: that x/z is the one measured point known to clear
      // hotel-public.js's counter collider and this module cannot see that fit-out's millwork to
      // pick a second. The gesture changes through the day instead.
      spots:[{h0:6,h1:11,at:[-10.40,-13.58],face:0,act:'wait'},
             {h0:11,h1:16,at:[-10.40,-13.58],face:0,act:'check'},
             {h0:16,h1:22,at:[-10.40,-13.58],face:0,act:'wait'}],
      lines:[['欢迎光临京华大酒店。','Welcome to Jinghua Grand Hotel.'],
             ['需要我帮您拿行李吗？','May I help you with your luggage?'],
             ['客梯在大堂东侧。','The passenger lifts are on the east side of the lobby.']]},
    {hz:'前台经理',name:'沈经理',py:'Shěn jīnglǐ',place:'hotel',rig:'hotel-front-manager-shen',temper:'focused',
      look:{skin:'#e0b18a',hair:'#312a27',hairStyle:'bob',top:'#efe8dc',pants:'#313138',shoe:'#29282b',
            jacket:'#58433b',scarf:'#8e302a',tall:.99,wide:.95,faceSeed:452},
      // The manager now occupies the western reception terminal; the former water-court spot
      // looked like an unattended front desk and put a working pose in the middle of the lobby.
      // A front-office manager is a day job — 07:00 to 22:00, then off. See 梁越 below.
      spots:[{h0:7,h1:12,at:[8.35,-13.58],face:0,act:'work',held:null},
             {h0:12,h1:17,at:[8.35,-13.58],face:0,act:'check',held:null},
             {h0:17,h1:22,at:[8.35,-13.58],face:0,act:'phone',held:null}],
      lines:[['您好，请问有预订吗？','Good afternoon. Do you have a reservation?'],
             ['行政酒廊在十楼。','The executive lounge is on the tenth floor.'],
             ['夜里前台是梁越，有事找他。','Liang Yue has the desk overnight; ask him if you need anything.']]},

    // ---------------------------------------------------------------------------- H189 · nights
    //
    // The night person is not the day person. Two new rows, both awake only while the day shift is
    // not, both standing in a reception bay this module already knows is clear of the counter
    // collider: the third check-in terminal at x 12.55 (hotel-public.js:477 puts the counter at
    // receptionX 9.45, 7.65 m wide, so 12.55 is inside its east end and 2.0 m clear of 林若 at
    // 10.55), and the concierge station the day concierge vacates at ten.
    //
    // A window that ends after midnight is written past 24 — `npcAwake` (js/game.js:3997) wraps on
    // exactly that convention, and the two forms have to agree or a night porter is on the desk at
    // four in the afternoon.
    //
    // STILL OPEN AND NOT THIS LANE'S FILE: 前台接待员 林若 is `{h0:0,h1:24}` at
    // js/hotel-public.js:2081 — one receptionist for all twenty-four hours. She is the day face of
    // the desk and should end at 22:00 the way her manager now does. That is a one-line change to a
    // module lane 6 owns; it is reported rather than reached into.
    {hz:'夜班前台',name:'梁越',py:'Liáng Yuè',gender:'male',ageBand:'adult',place:'hotel',
      dept:'front-office',temper:'even',
      look:{skin:'#cb9a70',hair:'#241f1d',hairStyle:'short',top:'#efe8dc',pants:'#313138',shoe:'#29282b',
            jacket:'#4b3a38',tie:'#9c7a44',tall:1.02,wide:.97,faceSeed:453},
      spots:[{h0:22,h1:26,at:[12.55,-13.58],face:0,act:'work',held:null},
             {h0:2,h1:7,at:[12.55,-13.58],face:0,act:'check',held:null}],
      lines:[['夜里也能办入住，我给您开房卡。','We check guests in overnight too; I will make up your key.'],
             ['白班七点接，沈经理那时候到。','The day shift starts at seven, when Manager Shen comes in.'],
             ['这个点儿餐厅都关了，客房服务还有。','The restaurants are shut at this hour; room service is not.']]},
    {hz:'夜班礼宾',name:'邱蔓',py:'Qiū Màn',gender:'female',ageBand:'young',place:'hotel',
      dept:'concierge',temper:'calm',
      look:{skin:'#e0b189',hair:'#2d2320',hairStyle:'bun',top:'#eee7dc',pants:'#2b2c30',shoe:'#272629',
            jacket:'#5c302d',scarf:'#b28a48',tall:.97,wide:.94,faceSeed:454},
      spots:[{h0:22,h1:26,at:[-10.40,-13.58],face:0,act:'hands'},
             {h0:2,h1:6,at:[-10.40,-13.58],face:0,act:'wait'}],
      lines:[['夜里叫车要等一会儿，我先帮您问。','A car takes a little longer at night; let me call ahead.'],
             ['行李可以先寄存，早上再取。','Leave your bags with us and collect them in the morning.']]}
  );
})();
