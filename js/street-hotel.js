// 京华大酒店 — the dominant north anchor of the Business District.
//
// The procedural far-side parade remains useful urban fabric, but from z=14.6 northward this
// district gives it a real destination: a landscaped arrival court, extended boulevard, deep
// porte-cochere and an offset 86 m hotel tower. The playable entrance faces west.

(() => {
  'use strict';
  // 前台 is written on the reception counter seen through the doors (below) and was declared by
  // nobody here — it rendered on characters other hotel modules had asked for. Declare what this
  // module writes; a borrowed glyph is a sign that goes blank when an unrelated file changes.
  try{Glyphs.need('京华大酒店酒店入口礼宾落客出租车停车行李车欢迎光临宴会客房中餐云端前台无障碍后勤车辆');}catch(_){}

  const lit=[],lamps=[],pools=[],doors=[],taxiGroups=[],trolleyParts=[],warning=[],sways=[];
  let last=0,lastNight=-1,doorOpen=0,nightOn=0;
  const remember=(p,day=.01,night=.22)=>{p.glow=day;lit.push({p,day,night});return p;};
  // Planting that answers the day's wind instead of standing rigid through a gale. Build spheres
  // tightly contain each resting crown, so the small world-space sway owns a dynamic cull centre.
  const moveDynamic=(p,m)=>{p.m=m;p.cx=m[12];p.cy=m[13];p.cz=m[14];};
  const sway=(p,amp)=>{p.dynamic=true;sways.push({p,m0:p.m,amp,ph:sways.length*1.37});return p;};

  StreetFit['hotel']=S=>{
    const p0=S.props.length;
    const {box,cyl,ball,taper,flat,glyphs,cap,blocker,shade,glow,thing,light,C,G,col}=S;
    const capsule=cap;
    // FX=41.60 is the procedural parade behind this site; its signboards project to x=41.26.
    // Keeping the hotel face at 41.10 puts a complete weather skin in front of those legacy props
    // while retaining 3.50 m from road edge to door.
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
    // street.js already owns the continuous 188 m carriageway beneath this parcel. Hotel details
    // begin with paint and paving so a second depth-writing road sheet cannot fight the base road.
    // Lane edge/centre marks and a hotel crossing at the south end.
    for(const x of [S.RD0+.30,(S.RD0+S.RD1)/2,S.RD1-.30])
      for(let z=15.0;z<Z1;z+=4.4)flat(x,.010,z,.07,2.25,x===(S.RD0+S.RD1)/2?C('#d4b448'):white,{gloss:.20,tag:'道路'});
    for(let x=S.RD0+.55;x<S.RD1-.25;x+=.68)flat(x,.014,16.20,.42,3.05,white,{gloss:.22,tag:'人行横道'});
    // The former hotel-only taxi strip consumed the pavement: at x=37.83 its 1.80 m body ended
    // at x=38.73, only 45 cm from HOTEL_OUT.  The drop lane now occupies the carriageway's eastern
    // lane and a continuous 3.65 m pedestrian court runs from kerb to facade.
    flat(39.31,.014,MID,3.42,Z1-Z0+.5,limestoneL,{mode:7,gloss:.17,...PAVE,tag:'酒店前庭'});
    flat(35.92,.018,MID,2.55,Z1-Z0-1.0,C('#3d4041'),{mode:7,gloss:.11,mat:'concrete',matScale:2.6,matAmt:.12,tag:'落客区'});
    for(let z=17;z<47;z+=3.8)flat(36.00,.022,z,.07,1.85,bronzeL,{gloss:.34,tag:'落客区'});
    // Tactile route into the lobby.
    flat(39.36,.026,ENT,3.48,.32,C('#c09a2e'),{gloss:.14,tag:'无障碍'});
    for(let i=0;i<9;i++)for(const dz of [-.11,.11])cyl(39.92+i*.08,.040,ENT+dz,.019,.010,C('#b48b20'),{tag:'无障碍'});

    // This is the extension consumed by street.js when it seals its zones. It overlaps the old
    // far pavement at z 12.8..13.5 and is consequently walkable without a teleport.
    // A 1.25 m overlap with the base road keeps 35 cm of shared centre band at the strict
    // r=.45 control envelope.  The paving already continues beneath this seam.
    S.HOTEL_ZONE={id:'hotel-forecourt',x0:37.62,x1:40.82,z0:12.25,z1:48.25,light:[39.35,5.2,ENT]};

    // ---------------------------------------------------------------- three-part podium / garden seams / transparent arrival
    // This is one hotel, not one extrusion.  An 8.2 m banquet wing, a recessed glass lobby and a
    // taller north wing are separated by two 2.1 m open-air garden seams.  Their fronts and roof
    // lines deliberately disagree, so the boulevard reads as composed architecture rather than
    // a single beige block with a window texture.
    const SF=41.10,NF=41.12;
    box(51.25,6.25,18.75,20.30,12.50,8.20,limestone,
      {hard:true,mode:14,gloss:.16,...PLASTER,...TAG});                 // banquet 14.65..22.85
    // The north podium is seen square-on from the hospital's public court.  Its former single
    // 19.8 x 15.4 x 14.5 m extrusion turned that view into a beige end wall with a 4 x 3 window
    // spreadsheet.  Three connected programmes now carry different faces, heights and rooflines:
    // a public bar, a recessed stair/service lantern, and a lower loading bar.  Their shared rear
    // structure stays inside the original parcel and the conservative blocker below is unchanged.
    const NP={x0:NF,x1:60.92,z0:34.00,z1:40.15,h:14.20};
    const NC={x0:41.92,x1:59.95,z0:39.95,z1:42.95,h:17.80};
    const NS={x0:41.48,x1:60.20,z0:42.75,z1:48.50,h:11.30};
    const northMass=(q,color)=>{
      box((q.x0+q.x1)/2,q.h/2,(q.z0+q.z1)/2,q.x1-q.x0,q.h,q.z1-q.z0,color,
        {hard:true,mode:14,gloss:.16,...PLASTER,...TAG});
      box((q.x0+q.x1)/2,q.h+.11,(q.z0+q.z1)/2,
        q.x1-q.x0+.12,.22,q.z1-q.z0+.14,bronzeD,
        {hard:true,gloss:.58,...TAG});
    };
    northMass(NP,limestoneL);
    northMass(NC,C('#5d686d'));
    northMass(NS,limestoneD);
    // Deep upper shoulders meet the set-back N1/N2 guest bars.  They replace the old full-width
    // 24 cm scenery screen, so the upper windows belong to real returned volumes rather than a
    // floating facade card.
    box(42.435,18.85,37.20,2.63,6.70,5.90,limestoneD,
      {hard:true,mode:14,gloss:.17,...PLASTER,...TAG});
    box(43.60,18.70,45.55,2.90,6.40,5.20,C('#858b8b'),
      {hard:true,mode:14,gloss:.17,...PLASTER,...TAG});
    box(42.435,22.26,37.20,2.83,.22,6.10,bronzeD,{hard:true,gloss:.60,...TAG});
    box(43.60,22.01,45.55,3.10,.22,5.40,bronzeD,{hard:true,gloss:.60,...TAG});
    // N2 starts above the service roof.  Keep that four-metre transfer terrace open, but show how
    // the suite bar is carried: two slim beam lines and paired bronze columns, not a hovering mass
    // or another opaque infill storey. The recessed stair core supports its south end.
    for(const z of [43.12,47.78])
      box(52.55,15.18,z,14.65,.42,.24,bronzeD,{hard:true,gloss:.58,...TAG});
    for(const x of [45.55,50.20,54.85,59.20]){
      for(const z of [43.12,47.78])
        box(x,13.28,z,.24,3.80,.24,bronzeD,{hard:true,gloss:.58,...TAG});
      box(x,15.04,45.45,.24,.34,4.90,bronze,{hard:true,gloss:.60,...TAG});
    }
    for(const [x,z] of [[47.65,44.10],[52.45,46.90],[57.15,44.05]]){
      taper(x,11.58,z,.62,.46,.62,bronzeD,{gloss:.44,tag:'绿化'});
      sway(ball(x,12.08,z,.38,.30,.38,green,{mode:15,gloss:.10,tag:'绿化'}),.028);
    }
    blocker(SF,61.40,14.65,22.85,12.7);
    blocker(NF,60.92,34.00,48.50,15.6);

    // Banquet wing: broad public rooms, deep piers and a planted roof terrace.
    for(const z of [16.10,18.75,21.40]){
      box(SF-.04,2.84,z,.16,4.62,2.18,glassD,{hard:true,gloss:.25,...TAG});
      remember(box(SF-.13,2.84,z,.035,4.30,1.89,glassWarm,
        {hard:true,mode:1,alpha:.70,gloss:G.glass,...TAG}),.012,((z*10|0)%3)?.20:.07);
      for(const sz of [-1,1])box(SF-.20,2.86,z+sz*1.08,.22,5.18,.20,bronzeD,{hard:true,gloss:.58,...TAG});
    }
    box(SF-.10,5.42,18.75,.24,.24,8.08,bronze,{hard:true,gloss:.62,...TAG});
    for(const y of [7.15,9.85])for(const z of [16.25,19.00,21.45]){
      box(SF-.04,y,z,.13,1.68,1.84,glassD,{hard:true,gloss:.22,...TAG});
      remember(box(SF-.12,y,z,.030,1.43,1.60,glass,
        {hard:true,mode:1,gloss:G.glass,...TAG}),.006,((y*7+z*5|0)%4)?.13:.035);
    }
    box(51.25,12.62,18.75,20.72,.24,8.62,bronzeD,{hard:true,gloss:.58,...TAG});
    // A shallow roof screen masks the former parade's uppermost metre before the guest wing takes
    // over; it also gives the banquet terrace a believable protected edge.
    box(SF-.02,17.27,18.75,.24,9.30,8.12,limestoneD,{hard:true,gloss:.18,...PLASTER,...TAG});
    for(const y of [14.55,18.35])for(const z of [16.15,18.75,21.35]){
      box(SF-.16,y,z,.10,2.30,1.82,glassD,{hard:true,gloss:.23,...TAG});
      remember(box(SF-.22,y,z,.028,2.05,1.56,glass,
        {hard:true,mode:1,gloss:G.glass,...TAG}),.005,((y*6+z*7|0)%4)?.12:.03);
    }
    for(const z of [16.0,19.1,21.6]){
      taper(43.00,12.95,z,.72,.50,.72,bronzeD,{gloss:.44,tag:'绿化'});
      sway(ball(43.00,13.42,z,.44,.34,.44,green,{mode:15,gloss:.10,tag:'绿化'}),.035);
    }

    // North public/service wing: irregular grouped openings follow those three programmes.  The
    // tint/night values are deterministic and deliberately mixed; not every room in a hotel is
    // occupied, and a whole elevation must never switch on as one yellow spreadsheet.
    const northBay=(face,y,z,h,w,tint,night,panes=1,tag=TAG)=>{
      box(face-.04,y,z,.13,h+.24,w+.24,glassD,{hard:true,gloss:.23,...tag});
      const p=box(face-.12,y,z,.030,h,w,tint,
        {hard:true,mode:1,alpha:.72,gloss:G.glass,...tag});
      remember(p,.006,night);
      for(let i=1;i<panes;i++)box(face-.145,y,z-w/2+w*i/panes,.025,h-.10,.045,bronzeD,
        {hard:true,gloss:.56,...tag});
      box(face-.155,y-h/2-.08,z,.14,.08,w+.30,limestoneL,
        {hard:true,gloss:.18,...tag});
    };
    const northReturn=(edge,side,y,x,h,w,tint,night,panes=1,tag=TAG)=>{
      box(x,y,edge+side*.04,w+.24,h+.24,.13,glassD,{hard:true,gloss:.23,...tag});
      const p=box(x,y,edge+side*.12,w,h,.030,tint,
        {hard:true,mode:1,alpha:.72,gloss:G.glass,...tag});
      remember(p,.006,night);
      for(let i=1;i<panes;i++)box(x-w/2+w*i/panes,y,edge+side*.145,.045,h-.10,.025,bronzeD,
        {hard:true,gloss:.56,...tag});
      box(x,y-h/2-.08,edge+side*.155,w+.30,.08,.14,limestoneL,
        {hard:true,gloss:.18,...tag});
    };

    // Public meeting rooms: a tall ground floor, then offset two/three-bay neighbourhoods.
    for(const [z,w,tint,night,panes] of [
      [35.30,1.92,glassWarm,.16,2],[37.66,1.34,glass,.045,1],[39.22,1.02,glass,.075,1]
    ]) northBay(NP.x0,2.90,z,4.30,w,tint,night,panes);
    box(NP.x0-.08,5.46,37.08,.22,.20,5.86,bronzeD,{hard:true,gloss:.60,...TAG});
    for(const [y,bays] of [
      [7.32,[[35.18,1.18,glass,.04,1],[37.20,1.56,glassWarm,.18,2],[39.18,.82,glass,.055,1]]],
      [10.48,[[35.62,1.62,glassWarm,.14,2],[38.36,1.32,glass,.04,1]]],
      [13.08,[[35.08,.84,glass,.035,1],[37.10,1.42,glass,.075,2],[39.28,.70,glassWarm,.12,1]]]
    ]) for(const [z,w,tint,night,panes] of bays)
      northBay(NP.x0,y,z,1.46,w,tint,night,panes);
    // The garden-side return combines public glazing with a screened service half. It is visible
    // from the hotel approach and must not expose the 19 m depth as an anonymous end wall.
    for(const [y,bays] of [
      [2.90,[[43.25,2.08,glassWarm,.15,2],[46.18,1.46,glass,.04,1],[48.55,.94,glass,.07,1]]],
      [7.34,[[43.55,1.22,glass,.04,1],[46.25,1.72,glassWarm,.14,2]]],
      [10.55,[[44.18,1.62,glass,.055,2],[48.10,1.16,glass,.035,1]]]
    ]) for(const [x,w,tint,night,panes] of bays)
      northReturn(NP.z0,-1,y,x,y<4?4.28:1.46,w,tint,night,panes);
    box(50.25,6.92,NP.z0-.10,.20,13.30,.16,bronzeD,{hard:true,gloss:.58,...TAG});
    for(let x=51.30;x<=59.20;x+=.72)
      box(x,6.50,NP.z0-.105,.075,11.80,.15,x%1.4<.5?bronze:bronzeD,
        {hard:true,gloss:.58,...TAG});

    // Recessed circulation lantern: one continuous dark reveal with clearly separated landings,
    // paired mullions and a staff door. Its narrow vertical rhythm is intentionally unlike rooms.
    box(NC.x0+.02,8.76,41.45,.10,16.86,2.52,glassD,{hard:true,gloss:.24,...TAG});
    for(const [y,h,tint,night] of [
      [1.55,2.42,glassD,.16],[4.72,2.52,glass,.08],[7.95,2.62,glassD,.045],
      [11.24,2.56,glassWarm,.17],[14.48,2.54,glass,.07],[16.62,1.18,glassD,.035]
    ]) northBay(NC.x0,y,41.45,h,2.18,tint,night,2);
    for(const y of [2.92,6.28,9.62,12.86,15.88])
      box(NC.x0-.17,y,41.45,.18,.13,2.40,bronzeD,{hard:true,gloss:.58,...TAG});
    for(const z of [40.72,42.18])
      box(NC.x0-.18,8.70,z,.16,16.50,.08,bronze,{hard:true,gloss:.60,...TAG});

    // Lower service bar: sparse offices, a louvred plant bay and a genuinely separate loading end.
    northBay(NS.x0,2.76,43.70,3.86,1.42,glass,.055,1);
    northBay(NS.x0,2.76,45.35,3.86,.86,glassWarm,.13,1);
    for(const [y,z,w,tint,night] of [
      [6.42,43.55,1.08,glass,.04],[6.76,45.28,.72,glass,.075],
      [9.32,44.18,1.46,glassWarm,.12]
    ]) northBay(NS.x0,y,z,1.34,w,tint,night,1);
    box(NS.x0-.12,7.45,47.08,.12,5.72,1.46,steel,{hard:true,gloss:.38,tag:'后勤'});
    for(let i=0;i<12;i++)box(NS.x0-.20,5.08+i*.42,47.08,.055,.055,1.20,
      i%4?bronzeD:bronze,{hard:true,gloss:.54,tag:'后勤'});
    box(NS.x0-.13,2.18,46.85,.16,3.78,2.16,bronzeD,{hard:true,gloss:.44,tag:'后勤'});
    for(const z of [46.28,47.42])box(NS.x0-.23,2.08,z,.04,3.32,.76,steel,
      {hard:true,gloss:.40,tag:'后勤'});
    // A returned head plate carries the service identity between the door and louvre. The former
    // glyph run occupied their 21–31 cm air gap and sat almost 30 cm off the service-bar mass.
    box(NS.x0-.13,4.28,46.85,.26,.36,1.72,bronzeD,
      {hard:true,mode:1,gloss:.46,tag:'后勤'});
    glyphs(NS.x0-.29,4.28,46.85,-Math.PI/2,'酒店后勤',
      {size:.17,gap:.045,color:white,mode:1,lift:.008,tag:'后勤'});
    // Loading-yard return: vertical plant screens at the west end, then two uneven office groups.
    for(let x=42.20;x<=48.40;x+=.62)
      box(x,5.80,NS.z1+.105,.075,9.60,.15,x%1.2<.5?bronze:bronzeD,
        {hard:true,gloss:.58,tag:'后勤'});
    box(49.10,5.70,NS.z1+.10,.20,10.50,.16,bronzeD,{hard:true,gloss:.58,tag:'后勤'});
    for(const [y,bays] of [
      [2.72,[[51.20,1.44,glass,.045,1],[54.22,1.86,glassWarm,.13,2],[57.42,1.10,glass,.035,1]]],
      [6.45,[[51.82,1.12,glass,.075,1],[55.18,1.54,glass,.04,2],[58.15,.72,glassWarm,.11,1]]],
      [9.25,[[53.05,1.66,glassWarm,.12,2],[57.25,1.20,glass,.035,1]]]
    ]) for(const [x,w,tint,night,panes] of bays)
      northReturn(NS.z1,1,y,x,y<4?3.72:1.32,w,tint,night,panes,{tag:'后勤'});

    // The two deep upper shoulders connect to N1/N2 and keep their lower tower floors occupied
    // without restoring a full-width screen. Groups shift between rows and most panes stay dark.
    for(const [y,bays] of [
      [17.25,[[35.35,1.20,glass,.04,1],[37.45,1.54,glassWarm,.14,2],[39.25,.76,glass,.035,1]]],
      [20.32,[[35.80,1.54,glassWarm,.12,2],[38.62,1.18,glass,.045,1]]]
    ]) for(const [z,w,tint,night,panes] of bays)
      northBay(NP.x0,y,z,1.82,w,tint,night,panes);
    for(const [y,bays] of [
      [17.22,[[43.72,1.14,glass,.04,1],[46.18,1.48,glassWarm,.13,2]]],
      [20.18,[[44.22,1.56,glass,.07,2],[47.15,.70,glassWarm,.11,1]]]
    ]) for(const [z,w,tint,night,panes] of bays)
      northBay(42.15,y,z,1.78,w,tint,night,panes);

    // Garden seams remain visually and physically open from the forecourt; a low rear link keeps
    // the operational programme credible without closing either breathing slot.
    for(const z of [23.92,32.95]){
      flat(43.25,.020,z,3.20,1.52,stone,{mode:7,gloss:.14,...PAVE,tag:'绿化'});
      // A deep garden screen hides the old shop fascia at x=41.40 while preserving a visibly
      // recessed, landscaped slot between the hotel volumes.
      box(FACE-.01,2.78,z,.22,5.56,1.92,walnut,{hard:true,gloss:.26,tag:'绿化'});
      for(let dz=-.72;dz<=.72;dz+=.24)box(FACE-.15,2.78,z+dz,.06,4.92,.055,bronze,
        {hard:true,gloss:.60,tag:'绿化'});
      taper(43.75,.34,z,.90,.68,.90,bronzeD,{gloss:.46,tag:'绿化'});
      for(let i=0;i<4;i++)sway(ball(43.75+(i%2?-.23:.20),.84+(i%3)*.15,z+(i-1.5)*.19,.38,.31,.38,
        i%2?green:greenL,{mode:15,gloss:.10,tag:'绿化'}),.045);
    }
    box(48.90,2.10,23.92,9.80,4.20,1.20,limestoneD,{hard:true,gloss:.17,...TAG});
    box(49.40,2.20,32.95,10.80,4.40,1.20,limestoneD,{hard:true,gloss:.17,...TAG});

    // Deep lobby behind genuinely moving automatic leaves. Reception, art and a luggage trolley
    // remain visible through the opening from the street.
    flat(45.82,.020,ENT,9.44,6.80,limestoneL,{mode:7,gloss:.19,...PAVE,tag:'门'});
    box(45.82,6.48,ENT,9.44,.28,6.80,bronzeD,{hard:true,gloss:.58,tag:'门'});
    for(const s of [-1,1]){
      const z=ENT+s*3.36;
      box(45.82,3.25,z,9.44,6.45,.12,glassD,{hard:true,gloss:.26,tag:'门'});
      remember(box(45.82,3.25,z-s*.065,9.09,6.10,.030,glass,
        {hard:true,mode:1,alpha:.34,gloss:G.glass,tag:'门'}),.006,.065);
    }
    box(50.42,2.36,ENT,.18,4.72,6.72,walnut,{hard:true,mode:6,gloss:.27,tag:'门'});
    // Warm light is local cove and art light, not a luminous full-wall billboard.
    for(const z of [ENT-2.78,ENT+2.78])remember(box(50.30,2.34,z,.035,4.20,.72,warm,
      {hard:true,mode:1,tag:'门'}),.018,.18);
    for(let y=.48;y<4.40;y+=.62)box(50.20,y,ENT,.035,.045,6.20,bronzeD,{hard:true,gloss:.54,tag:'门'});
    // Monumental ink art beyond the vestibule, offset from the actual path.
    box(50.06,2.38,ENT+1.72,.035,2.92,2.36,white,{hard:true,mode:1,tag:'门'});
    for(let i=0;i<6;i++)capsule(50.02,1.35+i*.35,ENT+1.72+(i%2?-.42:.30),.025,.72,.025,ink,
      {rx:Math.PI/2,tag:'门'});
    // Reception counter and bell desk read through the door as real lobby depth.
    box(47.65,.62,ENT-1.88,1.35,1.12,2.56,limestone,{hard:true,gloss:.22,tag:'前台'});
    box(47.28,1.20,ENT-1.88,.12,.18,2.38,bronze,{hard:true,gloss:.64,tag:'前台'});
    glyphs(47.16,1.44,ENT-1.88,-Math.PI/2,'前台',{size:.16,gap:.035,color:walnut,mode:1,lift:.008,tag:'前台'});
    // A warm centrepiece and two pendant groups make the lobby read after dark without turning the
    // whole rear wall emissive again.
    remember(box(50.27,2.45,ENT-.35,.034,2.85,1.72,limestoneL,
      {hard:true,mode:1,gloss:.20,tag:'门'}),.012,.17);
    for(const z of [ENT-1.72,ENT+1.62]){
      capsule(45.30,4.84,z,.035,.54,.035,bronzeD,{tag:'门'});
      remember(ball(45.30,4.45,z,.18,.14,.18,warm,{mode:1,tag:'门'}),.025,.44);
      const lm=light(44.85,4.20,z,[1,.73,.42],.46,6.4);lm.on=false;lamps.push(lm);
    }
    // Side curtain walls make the lobby a legible transparent connector between solid wings.
    for(const z of [25.42,26.88,29.92,31.38]){
      box(FACE-.04,2.80,z,.14,5.10,1.22,glassD,{hard:true,gloss:.28,tag:'门'});
      remember(box(FACE-.13,2.80,z,.032,4.76,1.00,glass,
        {hard:true,mode:1,alpha:.38,gloss:G.glass,tag:'门'}),.008,.075);
    }
    for(const s of [-1,1]){
      const p=box(FACE-.30,1.66,ENT+s*.72,.055,3.18,1.36,glass,
        {hard:true,mode:1,alpha:.40,gloss:G.glass,tag:'门'});
      p.ob=null;p.fixed=true;p.cx=FACE-.30;p.cy=1.66;p.cz=ENT+s*.72;p.r=2.24;
      doors.push({p,s,m0:p.m});
      box(FACE-.23,1.66,ENT+s*1.55,.12,3.28,.12,bronze,{hard:true,gloss:.68,tag:'门'});
    }
    flat(FACE-.78,.024,ENT,1.50,4.20,ink,{mode:7,gloss:.08,tag:'门'});
    blocker(50.25,53.05,25.0,31.8,6.9);
    // Six-storey atrium veil: thin, articulated, and only as wide as the lobby. It prevents the
    // legacy parade's upper flats from ghosting through the entrance while keeping the two guest
    // bars visually separate.
    box(FACE+.10,14.00,ENT,.30,15.00,6.55,glassD,{hard:true,gloss:.24,...TAG});
    for(const y of [8.10,11.25,14.40,17.55,20.70])for(const z of [26.38,28.40,30.42])
      remember(box(FACE-.08,y,z,.035,2.35,1.60,glass,
        {hard:true,mode:1,alpha:.55,gloss:G.glass,...TAG}),.006,((y*9+z*6|0)%4)?.13:.035);
    for(const z of [25.16,27.39,29.41,31.64])box(FACE-.13,14.00,z,.18,15.20,.10,bronzeD,
      {hard:true,gloss:.60,...TAG});
    for(const y of [6.55,9.67,12.79,15.91,19.03,21.50])box(FACE-.14,y,ENT,.20,.12,6.80,bronze,
      {hard:true,gloss:.60,...TAG});

    // ---------------------------------------------------------------- porte-cochere and arrival ritual
    // A 13 m slab used to span both landscape bays and make the whole foreground feel indoors.
    // The new canopy covers the central guest route only; two kerb columns leave 3.2 m clear at
    // the player line and the lobby's transparent connector is visible beyond it.
    box(39.18,5.58,ENT,4.78,.30,8.72,limestoneL,{hard:true,gloss:.18,tag:'酒店入口'});
    box(39.18,5.39,ENT,4.58,.08,8.44,bronzeD,{hard:true,gloss:.58,tag:'酒店入口'});
    remember(box(39.18,5.33,ENT,4.34,.035,8.10,warm,
      {hard:true,mode:1,glow:.08,tag:'酒店入口'}),.04,.34);
    // Flush downlights illuminate the paving without adding another line of poles or planters.
    for(const x of [37.82,39.42,40.62])for(const z of [ENT-2.78,ENT+2.78]){
      remember(cyl(x,5.18,z,.085,.025,warm,{mode:1,tag:'酒店入口'}),.018,.48);
    }
    for(const z of [ENT-2.28,ENT+2.28]){
      const lm=light(39.32,4.96,z,[1,.77,.48],.42,5.2);lm.on=false;lamps.push(lm);
    }
    // Only the road edge needs free-standing supports. The building end bears on its headwall.
    for(const z of [ENT-3.82,ENT+3.82]){const x=36.98;
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
    // The identity is on the lobby headwall, squarely in the guest's view, with a proper bilingual
    // hierarchy rather than a small floating plaque.
    box(FACE-.15,4.78,ENT,.20,.78,5.05,walnut,{hard:true,gloss:.32,tag:'酒店入口'});
    glyphs(FACE-.28,4.91,ENT,-Math.PI/2,'京华大酒店',
      {size:.45,gap:.12,color:bronzeL,mode:1,glow:.18,lift:.012,tag:'酒店入口'});
    glyphs(FACE-.29,4.55,ENT,-Math.PI/2,'JINGHUA GRAND HOTEL',
      {size:.12,gap:.030,color:white,mode:1,glow:.055,lift:.012,tag:'酒店入口'});

    // Asymmetric arrival landscape: a low stone water piece to the south and a loose ginkgo grove
    // north of the canopy.  Nothing is mirrored across the player's sightline.
    box(40.48,.25,23.25,1.10,.34,1.04,limestoneD,{hard:true,gloss:.18,tag:'绿化'});
    flat(40.48,.43,23.25,.86,.70,C('#486d73'),{mode:1,gloss:.62,tag:'绿化'});
    for(const z of [22.98,23.29,23.54])capsule(40.48,.66,z,.025,.25,.025,bronzeL,{rz:Math.PI/2,tag:'绿化'});
    for(const [x,z,h] of [[40.64,33.75,1.70],[40.68,35.45,1.45]]){
      taper(x,.38,z,.76,.72,.76,bronzeD,{gloss:.46,tag:'银杏'});
      cyl(x,1.34,z,.12,h,bronze,{gloss:.32,tag:'银杏'});
      for(let i=0;i<5;i++)sway(ball(x+(i%2?-.27:.24),2.08+(i%3)*.20,z+(i-2)*.16,.43,.31,.39,
        i%2?green:greenL,{mode:15,gloss:.10,tag:'银杏'}),.095);
    }
    // Bell stand and trolley are inside the glazed lobby, visible but outside the forecourt route.
    box(42.55,.68,ENT-2.36,.82,1.20,.52,walnut,{hard:true,gloss:.28,tag:'礼宾部'});
    glyphs(42.43,1.15,ENT-2.36,-Math.PI/2,'礼宾',{size:.12,gap:.025,color:bronzeL,mode:1,lift:.007,tag:'礼宾部'});
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
    trolleyParts.push(...trolley(42.60,ENT+2.42));

    // ---------------------------------------------------------------- offset guest wings / glazed circulation spine
    // South guestrooms rise from the banquet wing but stop lower; the north bar is set 0.65 m
    // farther east and carries the suites. A narrow glazed spine joins them across a six-metre
    // recess. This produces three silhouettes and two visible slots in place of the old 18 x 56 x
    // 26 m tower cuboid.
    const S1={cx:51.55,face:42.85,z:16.65,w:17.40,h:49.60,d:4.50,y:37.30,top:62.10};
    const S2={cx:52.50,face:44.10,z:21.45,w:16.80,h:42.60,d:4.70,y:33.80,top:55.10};
    const N1={cx:52.35,face:43.75,z:37.25,w:17.20,h:44.00,d:6.00,y:37.50,top:59.50};
    const N2={cx:53.25,face:45.05,z:44.25,w:16.40,h:54.40,d:7.80,y:42.60,top:69.80};
    for(const [q,c] of [[S1,limestone],[S2,limestoneL],[N1,limestone],[N2,limestoneL]])
      box(q.cx,q.y,q.z,q.w,q.h,q.d,c,{hard:true,mode:14,gloss:.15,...PLASTER,...TAG});
    // The central spine is visibly recessed from both bars. Its glass begins at y=16, so paired
    // transfer beams and six columns carry that datum to grade inside the existing blocker. The
    // structure stays visible through the slots without entering any playable route.
    for(const z of [26.15,32.25]){
      box(54.10,15.82,z,12.40,.36,.30,steel,
        {hard:true,gloss:.42,tag:'酒店连廊'});
      for(const x of [49.00,54.10,59.20])
        box(x,7.91,z,.30,15.82,.30,steel,
          {hard:true,gloss:.40,tag:'酒店连廊'});
    }
    // A bronze curtain-wall grid returns
    // across both slot elevations instead of leaving two forty-eight-metre sheets of blank glass.
    // Mullions meet the glass weather line; floor plates project a further 5 cm so their crossings
    // are deliberate joinery rather than coplanar, depth-fighting decals.
    box(54.10,40.05,29.20,12.40,48.10,6.55,glassD,
      {hard:true,mode:14,gloss:.26,...TAG});
    const spineFace=6.55/2;
    for(const side of [-1,1]){
      const mullionZ=29.20+side*(spineFace+.055);
      for(const x of [49.65,52.62,55.58,58.55])
        box(x,40.05,mullionZ,.14,45.20,.11,bronzeD,
          {hard:true,gloss:.58,tag:'酒店连廊'});
      const plateZ=29.20+side*(spineFace+.080);
      for(const y of [21.20,29.08,36.96,44.84,52.72,60.60])
        box(54.10,y,plateZ,11.74,.12,.16,bronze,
          {hard:true,gloss:.62,tag:'酒店连廊'});
    }
    box(54.10,64.24,29.20,12.78,.28,6.92,bronzeD,
      {hard:true,gloss:.60,...TAG});
    // A compact screened smoke-extract/plant enclosure gives the glazed link a believable roof
    // termination and sits wholly on the coping rather than floating above it.
    box(54.10,64.76,29.20,3.60,.76,2.30,bronzeD,
      {hard:true,gloss:.48,tag:'酒店设备层'});
    for(const side of [-1,1])for(const y of [64.53,64.76,64.99])
      box(54.10,y,29.20+side*1.18,3.12,.055,.075,bronzeL,
        {hard:true,gloss:.58,tag:'酒店设备层'});
    blocker(S1.face,S1.face+S1.w,S1.z-S1.d/2,S1.z+S1.d/2,S1.top+.4);
    blocker(S2.face,S2.face+S2.w,S2.z-S2.d/2,S2.z+S2.d/2,S2.top+.4);
    blocker(N1.face,N1.face+N1.w,N1.z-N1.d/2,N1.z+N1.d/2,N1.top+.4);
    blocker(N2.face,N2.face+N2.w,N2.z-N2.d/2,N2.z+N2.d/2,N2.top+.4);
    blocker(47.90,60.30,25.93,32.48,64.4);

    // Front room windows are recessed and grouped into two- and three-bay neighbourhoods by
    // projecting bronze fins. Deterministic occupancy avoids an evenly lit spreadsheet.
    const roomGlass=(x,y,z,w,h,seed)=>{
      const warmRoom=((seed*37+11)%7)<4;
      // Stable incomplete occupancy: a hotel with every room lit reads as a spreadsheet.
      const nightRoom=seed%9===0?0:(warmRoom?.20+((seed%3)*.035):.055);
      return remember(box(x-.035,y,z,.030,h-.20,w-.18,warmRoom?glassWarm:glass,
        {hard:true,mode:1,gloss:G.glass,...TAG}),.006,nightRoom);
    };
    const pane=(x,y,z,w,h,seed)=>{
      box(x+.04,y,z,.11,h,w,glassD,{hard:true,gloss:.24,...TAG});
      return roomGlass(x,y,z,w,h,seed);
    };
    let seed=0;
    // S1: a slim high bar with tall, narrow room openings.
    for(let y=24.00;y<=59.40;y+=3.12){
      box(S1.face-.04,y,S1.z,.11,2.04,S1.d-.22,glassD,{hard:true,gloss:.24,...TAG});
      for(const z of [15.25,16.70,18.15])roomGlass(S1.face-.08,y,z,1.04,1.92,seed++);
    }
    for(const z of [14.48,18.82])box(S1.face-.20,42.00,z,.22,39.40,.18,bronzeD,{hard:true,gloss:.56,...TAG});
    for(let y=26.00;y<=58.20;y+=9.36)box(S1.face-.25,y,S1.z,.38,.16,4.16,bronze,{hard:true,gloss:.60,...TAG});

    // S2: a lower garden wing with paired projecting room bays and three private terraces.
    for(let y=24.00;y<=52.00;y+=3.12){
      box(S2.face-.06,y,S2.z,.11,1.84,S2.d-.22,glassD,{hard:true,gloss:.24,...TAG});
      for(const z of [20.00,21.45,22.90])roomGlass(S2.face-.10,y,z,1.08,1.70,seed++);
    }
    for(const y of [28.70,38.06,47.42])for(const z of [20.35,22.55]){
      box(S2.face-.30,y-.93,z,.58,.14,1.28,limestoneD,{hard:true,gloss:.18,...TAG});
      box(S2.face-.58,y-.42,z,.12,.86,1.14,bronzeD,{hard:true,gloss:.60,...TAG});
    }
    for(const z of [19.16,23.74])box(S2.face-.18,38.00,z,.20,32.40,.16,bronze,{hard:true,gloss:.58,...TAG});

    // N1: wider wellness rooms behind calm three-bay frames.
    for(let y=24.55;y<=57.50;y+=3.12){
      box(N1.face-.04,y,N1.z,.11,2.04,N1.d-.22,glassD,{hard:true,gloss:.24,...TAG});
      for(const z of [35.10,36.55,38.00,39.45])roomGlass(N1.face-.08,y,z,1.06,1.90,seed++);
    }
    for(let y=26.0;y<=56.5;y+=6.24)box(N1.face-.23,y,N1.z,.38,.13,5.55,bronzeD,{hard:true,gloss:.57,...TAG});
    for(const z of [34.34,40.16])box(N1.face-.18,41.0,z,.20,35.50,.16,bronze,{hard:true,gloss:.58,...TAG});

    // N2: the tall suite bar uses broader paired windows and deeper bronze verticals.
    for(let y=24.55;y<=67.10;y+=3.12){
      box(N2.face-.04,y,N2.z,.11,1.88,N2.d-.24,glassD,{hard:true,gloss:.24,...TAG});
      for(const z of [41.40,43.25,45.10,46.95])roomGlass(N2.face-.08,y,z,1.34,1.72,seed++);
    }
    for(const z of [40.42,44.18,48.08])box(N2.face-.22,46.00,z,.24,45.90,.20,bronzeD,{hard:true,gloss:.58,...TAG});
    for(let y=27.2;y<=64.6;y+=9.36)box(N2.face-.25,y,N2.z,.40,.16,7.25,bronze,{hard:true,gloss:.60,...TAG});

    // Recessed circulation spine: paired vertical curtain-wall slots and opaque service floors.
    for(const z of [27.08,29.18,31.28]){
      box(47.80,39.90,z,.13,46.20,1.55,bronzeD,{hard:true,gloss:.58,...TAG});
      remember(box(47.70,39.90,z,.032,45.65,1.28,glass,
        {hard:true,mode:1,alpha:.60,gloss:G.glass,...TAG}),.006,.12+((z*7|0)%3)*.025);
    }
    for(let y=18.0;y<63.3;y+=3.10)box(47.67,y,29.18,.12,.11,6.05,bronze,{hard:true,gloss:.60,...TAG});

    // Return windows on every exposed end stop the offset bars reading as stage flats.
    const returnWindows=(q,side)=>{
      for(let y=25.3;y<=q.top-2.2;y+=9.36)
        for(let x=q.face+2.2;x<q.face+q.w-1.2;x+=5.25){
          const z=q.z+side*q.d/2;
          box(x,y,z,2.48,1.72,.11,glassD,{hard:true,gloss:.23,...TAG});
          remember(box(x,y,z+side*.07,2.20,1.47,.03,glass,
            {hard:true,mode:1,gloss:G.glass,...TAG}),.005,((x*7+y*3|0)%5)?.11:.03);
        }
    };
    // Only genuinely exposed outer ends get windows; the paired bars meet at their inner seams.
    returnWindows(S1,-1);returnWindows(S2,1);returnWindows(N1,-1);returnWindows(N2,1);

    // Three real setback terraces: the lower south wing is planted, the high south bar carries
    // screened plant, and N1 becomes the suite bar's garden terrace.
    for(const z of [S2.z-S2.d/2+.10,S2.z+S2.d/2-.10])
      box(S2.cx,S2.top+.25,z,S2.w+.25,.50,.18,bronzeD,{hard:true,gloss:.58,...TAG});
    box(S2.face-.10,S2.top+.25,S2.z,.18,.50,S2.d,bronzeD,{hard:true,gloss:.58,...TAG});
    for(const z of [20.0,21.5,22.8]){
      taper(S2.face+1.25,S2.top+.18,z,.72,.52,.72,bronzeD,{gloss:.44,tag:'绿化'});
      sway(ball(S2.face+1.25,S2.top+.78,z,.42,.35,.42,greenL,{mode:15,gloss:.10,tag:'绿化'}),.035);
    }
    for(const z of [S1.z-S1.d/2+.10,S1.z+S1.d/2-.10])
      box(S1.cx,S1.top+.25,z,S1.w+.22,.50,.18,bronzeD,{hard:true,gloss:.58,...TAG});
    box(S1.face-.10,S1.top+.25,S1.z,.18,.50,S1.d,bronzeD,{hard:true,gloss:.58,...TAG});
    box(57.10,S1.top+1.30,S1.z,5.80,2.45,2.70,walnut,{hard:true,mode:14,gloss:.27,...TAG});

    for(const z of [N1.z-N1.d/2+.10,N1.z+N1.d/2-.10])
      box(N1.cx,N1.top+.25,z,N1.w+.25,.50,.18,bronzeD,{hard:true,gloss:.58,...TAG});
    box(N1.face-.10,N1.top+.25,N1.z,.18,.50,N1.d,bronzeD,{hard:true,gloss:.58,...TAG});
    for(const z of [35.1,37.3,39.4]){
      taper(N1.face+1.30,N1.top+.18,z,.76,.52,.76,bronzeD,{gloss:.44,tag:'绿化'});
      sway(ball(N1.face+1.30,N1.top+.80,z,.44,.36,.44,green,{mode:15,gloss:.10,tag:'绿化'}),.035);
    }

    // N2 alone carries the two-storey suite lounge and compact celadon roof lantern.
    box(53.55,74.45,N2.z,12.80,9.30,6.45,limestone,
      {hard:true,mode:14,gloss:.15,...PLASTER,...TAG});
    blocker(47.15,59.95,N2.z-3.23,N2.z+3.23,79.3);
    for(let y=71.65;y<=77.15;y+=2.75)for(const z of [42.00,44.25,46.50])pane(47.07,y,z,1.58,1.86,seed++);
    box(53.55,79.25,N2.z,13.30,.30,6.95,bronzeD,{hard:true,gloss:.62,...TAG});
    remember(box(54.45,82.15,N2.z,7.20,5.50,5.20,celadon,
      {hard:true,mode:1,alpha:.60,gloss:G.glass,...TAG}),.014,.30);
    for(const z of [42.25,44.25,46.25]){
      box(54.45,85.12,z,8.20,.28,.28,bronzeD,{hard:true,gloss:.64,...TAG});
      for(const x of [50.75,58.15])box(x,82.15,z,.26,6.20,.26,bronze,{hard:true,gloss:.66,...TAG});
    }
    box(54.45,85.35,N2.z,8.80,.30,5.80,bronzeL,{hard:true,gloss:.66,...TAG});

    // A vertical identity blade marks the lower south bar from the long street approach.
    box(S1.face-.32,39.20,14.72,.38,30.0,1.18,walnut,{hard:true,gloss:.30,...TAG});
    glyphs(S1.face-.57,40.40,14.72,-Math.PI/2,'京华大酒店',
      {size:1.05,gap:.34,vertical:true,color:bronzeL,mode:1,glow:.13,lift:.016,tag:'京华大酒店'});
    glyphs(S1.face-.60,31.40,14.72,-Math.PI/2,'JINGHUA',
      {size:.28,gap:.08,vertical:true,color:white,mode:1,glow:.06,lift:.016,tag:'京华大酒店'});

    // Roof beacons sit outboard of the cap, visible from below, and remain night-gated in tick().
    for(const [x,ax] of [[49.15,49.45],[59.75,59.45]])for(const z of [41.70,46.80]){
      cyl(ax,85.35,z,.06,.60,bronzeD,{rz:Math.PI/2,gloss:.58,tag:'航空灯'});
      warning.push(ball(x,85.35,z,.27,.27,.27,red,{mode:1,glow:.06,tag:'航空灯'}));
    }

    // ---------------------------------------------------------------- arrivals in motion
    function taxi(z0,paint,phase){
      const arr=[];const x=35.92;const add=p=>{p.ob=null;p.fixed=true;p.cx=x;p.cy=.8;p.cz=MID;p.r=19;arr.push({p,m0:p.m});return p;};
      const plate=C('#245da8');
      // A single low rounded hull bridges the upper tyre arcs. Three lower fillers stop before the
      // wheels, so their gaps are real arches; shallow shoulder pieces above remain integrated in
      // the same envelope rather than forming a stack of boxes or a row of ellipsoid sausages.
      const SOFT={round:.022,gloss:.58,tag:'出租车'};
      add(box(x,.66,z0-.08,1.78,.44,3.96,paint,SOFT));
      for(const [z,d] of [[z0+1.91,.46],[z0,1.48],[z0-1.91,.44]])
        add(box(x,.39,z,1.68,.18,d,paint,{round:.018,gloss:.54,tag:'出租车'}));
      add(box(x,.89,z0-.18,1.78,.16,2.88,paint,{round:.018,gloss:.61,tag:'出租车'}));
      add(box(x,.86,z0+1.54,1.72,.17,.78,paint,{round:.016,gloss:.60,tag:'出租车'}));
      add(box(x,.87,z0-1.60,1.68,.17,.60,paint,{round:.016,gloss:.58,tag:'出租车'}));
      add(box(x,.64,z0+2.08,1.60,.20,.18,paint,{round:.018,gloss:.55,tag:'出租车'}));
      add(box(x,.63,z0-2.09,1.56,.20,.17,paint,{round:.018,gloss:.53,tag:'出租车'}));

      // Body-colour arch lips make the fenders read around each tyre while preserving the open
      // centres and lower sidewalls. They are thin tangent segments, never opaque wheel discs.
      for(const sx of [-1,1])for(const wz of [z0+1.30,z0-1.30])for(let k=0;k<5;k++){
        const a=(k+.5)*Math.PI/5,r=.355,chord=2*r*Math.sin(Math.PI/10)*1.04;
        add(capsule(x+sx*.895,.33+Math.sin(a)*r,wz+Math.cos(a)*r,.022,chord,.022,paint,
          {rx:-a,gloss:.55,tag:'出租车'}));
      }

      // Professional glazing is trapezoidal and individually framed. The two side panes are thin
      // vertical frusta; the raked windscreen and backlight sit between them, while small painted
      // A/B/C pillars stay inside the body/roof silhouette. There is no hidden cabin pill or cage.
      add(box(x,1.515,z0-.18,1.70,.11,1.80,paint,
        {round:.016,gloss:.60,tag:'出租车'}));
      add(taper(x,1.27,z0+.84,1.34,.45,.035,glass,
        {rx:-.34,gloss:.84,tag:'出租车'}));
      add(taper(x,1.25,z0-1.04,1.26,.42,.035,glass,
        {rx:.39,gloss:.84,tag:'出租车'}));
      for(const sx of [-1,1]){
        const side=x+sx*.855;
        add(taper(side,1.275,z0+.37,.035,.43,.72,glass,
          {gloss:.84,tag:'出租车'}));
        add(taper(side,1.265,z0-.47,.035,.41,.68,glass,
          {gloss:.84,tag:'出租车'}));
        add(box(side,1.27,z0+.79,.050,.49,.085,paint,
          {rx:-.34,round:.010,gloss:.52,tag:'出租车'}));
        add(box(side,1.26,z0-.05,.050,.47,.080,paint,
          {round:.010,gloss:.50,tag:'出租车'}));
        add(box(side,1.26,z0-.91,.050,.46,.085,paint,
          {rx:.39,round:.010,gloss:.52,tag:'出租车'}));
        add(box(side,1.055,z0-.06,.050,.055,1.72,paint,
          {round:.010,gloss:.50,tag:'出租车'}));
        // Recessed shut lines, flush handles and compact mirrors stay within the 2.10 m envelope.
        for(const dz of [.10,-.72])add(box(x+sx*.900,.79,z0+dz,.018,.50,.020,ink,
          {hard:true,gloss:.22,tag:'出租车'}));
        for(const dz of [.30,-.51])add(box(x+sx*.905,.92,z0+dz,.018,.035,.20,bronzeL,
          {hard:true,gloss:.52,tag:'出租车'}));
        add(capsule(x+sx*.885,1.10,z0+.62,.018,.15,.018,ink,
          {rz:Math.PI/2,gloss:.34,tag:'出租车'}));
        add(taper(x+sx*.965,1.105,z0+.62,.15,.10,.22,ink,
          {rz:sx>0?-Math.PI/2:Math.PI/2,gloss:.52,tag:'出租车'}));
        add(box(x+sx*1.018,1.105,z0+.62,.014,.060,.14,glass,
          {hard:true,gloss:.84,tag:'出租车'}));
      }

      // The end furniture is narrow and inset: horizontal lamps, a modest lower grille and blue
      // plates on the painted fascia. Nothing reads as cartoon eyes, a mouth or a square bumper.
      add(box(x,.54,z0+2.185,.68,.12,.025,glassD,
        {round:.010,gloss:.30,tag:'出租车'}));
      for(const sx of [-1,1])for(const y of [.51,.56,.61])
        add(box(x+sx*.11,y,z0+2.202,.18,.012,.016,steel,
          {hard:true,gloss:.46,tag:'出租车'}));
      // Head and tail lamps belong to the night application like every other emitter out here.
      // They used to carry a fixed `glow`, so a taxi under the canopy at two in the afternoon had
      // its lights on and the crown's beacons flashed over a blue sky — the one class of emitter
      // `_applyNight` did not reach.
      for(const sx of [-1,1]){
        remember(add(box(x+sx*.55,.78,z0+2.185,.30,.075,.025,warm,
          {round:.010,mode:1,tag:'出租车'})),.012,.30);
        remember(add(box(x+sx*.56,.80,z0-2.185,.31,.085,.025,red,
          {round:.010,mode:1,tag:'出租车'})),.010,.24);
      }
      add(box(x,.51,z0+2.205,.46,.14,.022,plate,{hard:true,gloss:.26,tag:'出租车'}));
      add(box(x,.51,z0-2.175,.46,.14,.022,plate,{hard:true,gloss:.26,tag:'出租车'}));
      // The supported roof sign is a small tapered lamp, not another wide roof brick.
      add(box(x,1.625,z0-.18,.48,.075,.26,ink,{gloss:.28,tag:'出租车'}));
      remember(add(taper(x,1.725,z0-.18,.44,.16,.23,warm,{mode:1,tag:'出租车'})),.06,.34);

      // Four correctly scaled tyres sit at a 1.68 m track. Dark inset centres and three slim spokes
      // keep the near-side pair visually open in the exact cross-road view.
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const wx=x+sx*.84,wz=z0+sz*1.30,face=x+sx*.965;
        add(cyl(wx,.33,wz,.32,.20,ink,{rz:Math.PI/2,gloss:.14,tag:'出租车'}));
        add(cyl(x+sx*.950,.33,wz,.205,.030,steel,{rz:Math.PI/2,gloss:.48,tag:'出租车'}));
        add(cyl(x+sx*.970,.33,wz,.142,.022,ink,{rz:Math.PI/2,gloss:.12,tag:'出租车'}));
        for(let k=0;k<3;k++)add(box(face,.33,wz,.026,.29,.045,steel,
          {hard:true,rx:k*Math.PI/3,gloss:.52,tag:'出租车'}));
        add(cyl(x+sx*.984,.33,wz,.060,.026,steel,{rz:Math.PI/2,gloss:.54,tag:'出租车'}));
      }
      taxiGroups.push({arr,z0,phase});
    }
    // The shared traffic district already supplies a live, signal-aware Beijing taxi on this road.
    // Do not instantiate a second hotel-only car: even one permanently dominated the transparent
    // lobby and narrowed the arrival court in normal cameras.  The marked drop lane, taxi stand and
    // luggage service remain operational scenery; an empty bay between arrivals is the honest,
    // breathable state and avoids duplicating the road fleet's movement/vehicle contract.

    // Warm court lamps bookend the arrival lane. A third mast at z=38.3 stood directly through
    // the across-road entrance elevation; the canopy and facade already light that central bay,
    // so keeping it structurally open matters more than repeating another pole.
    for(const z of [18.2,46.0]){
      cyl(38.02,2.70,z,.075,5.40,bronzeD,{gloss:.54,tag:'路灯'});
      box(38.02,5.32,z,.68,.14,.28,bronze,{hard:true,gloss:.64,tag:'路灯'});
      const lm=light(38.55,5.08,z,[1,.78,.48],.54,7.5);lm.on=false;lamps.push(lm);
      pools.push({g:glow(M.trs(38.65,.032,z,0,3.0,1,5.8),warm,0),a:.20});
    }
    // Open, double-sided taxi marker. The former 2.25 m bronze backing slab had identity only on
    // its west face and became a blank wall from the cycle track. Two slim posts and suspended
    // rails preserve the marked bay while keeping the forecourt and every reverse view porous.
    for(const dz of [-.30,.30])
      cyl(38.04,1.12,16.0+dz,.028,2.04,bronzeD,{gloss:.58,tag:'出租车'});
    for(const y of [.67,2.05])
      box(38.04,y,16.0,.07,.09,.68,bronze,{hard:true,gloss:.62,tag:'出租车'});
    box(38.04,1.58,16.0,.055,.56,.07,bronzeD,{hard:true,gloss:.56,tag:'出租车'});
    glyphs(37.96,1.55,16.0,-Math.PI/2,'出租车',
      {size:.13,gap:.025,color:white,mode:1,lift:.008,tag:'出租车'});
    glyphs(38.12,1.55,16.0, Math.PI/2,'出租车',
      {size:.13,gap:.025,color:white,mode:1,lift:.008,tag:'出租车'});
    // Loose north-edge planters finish the service wing without forming another repeated avenue.
    for(const [x,z,s] of [[40.70,38.8,.82],[39.88,42.2,.68],[40.62,45.2,.78]]){
      taper(x,.34,z,s,.68,s,limestoneD,{gloss:.18,tag:'绿化'});
      for(let i=0;i<4;i++)sway(ball(x+(i%2?-.18:.22),.82+(i%3)*.16,z+(i-1.5)*.18,.35,.31,.35,
        i%2?green:greenL,{mode:15,gloss:.10,tag:'绿化'}),.042);
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
    shade(39.2,ENT,4.8,8.9,.25);
    shade(52.5,19.3,18.6,10.5,.24);shade(53.2,41.3,18.4,15.0,.25);

    const applyNight=k=>{
      nightOn=k?1:0;
      for(const q of lit)q.p.glow=k?q.night:q.day;
      for(const l of lamps)l.on=!!k;
      for(const q of pools)q.g.a=k?q.a:0;
    };
    StreetFit['hotel']._applyNight=applyNight;
    StreetFit['hotel'].OUT=HOTEL_OUT;
    StreetFit['hotel'].state={entrance:{open:0,near:false},taxis:[],tower:{height:85.62,windows:lit.length}};
    StreetFit['hotel'].propCount=S.props.length-p0;
  };

  StreetFit['hotel'].tick=(t,body,mins)=>{
    const dt=last?Math.min(.20,Math.max(0,t-last)):0;last=t;
    const px=body&&Number.isFinite(body.x)?body.x:99,pz=body&&Number.isFinite(body.z)?body.z:99;
    // Apply the clock edge before any emitter is evaluated.  The old order updated `nightOn`
    // after the beacon loop, leaving the first night frame dark and allowing the first daylight
    // frame to flash red with yesterday's state.  The scene-level daylight pass and this authored
    // district state now change on the same frame in both directions.
    if(mins!==undefined){const h=(mins/60)%24,night=h<6.2||h>=18.4?1:0;
      if(night!==lastNight){lastNight=night;const fn=StreetFit['hotel']&&StreetFit['hotel']._applyNight;if(fn)fn(night);}}
    const near=Math.abs(px-HOTEL_OUT.x)<3.1&&Math.abs(pz-HOTEL_OUT.z)<3.55;
    const target=near?1:0;
    doorOpen+=(target-doorOpen)*(1-Math.exp(-dt*(target?7.0:4.2)));
    if(Math.abs(target-doorOpen)<.001)doorOpen=target;
    for(const q of doors)q.p.m=M.mul(M.trans(0,0,q.s*.86*doorOpen),q.m0);

    // The hotel taxi circulates only while the hotel end of the street is plausibly in range. Its
    // parts share a translation; broad fixed cull spheres cover the complete lane.
    if(Math.hypot(px-39,pz-31)<75){
      for(const g of taxiGroups){
        const u=(t*.62+g.phase)%36;
        // A continuous slow arrival replaces the old discontinuous 3.5 m jump at the end of the
        // dwell band: approach normally, creep past the doors, then recover speed to the north.
        let z=u<11?15.0+u:u<17?26.0+(u-11)*.18:27.08+(u-17)*(20.12/19);
        const dz=z-g.z0;
        for(const q of g.arr)q.p.m=M.mul(M.trans(0,0,dz),q.m0);
      }
      // The display trolley makes a small bell-desk nudge inside the lobby. It no longer tries to
      // animate through the exterior pedestrian route, which is reserved for guests and luggage
      // movements authored by the interior floor.
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
        for(const q of sways)moveDynamic(q.p,M.mul(
          M.trans(q.amp*amt*Math.sin(t*rate+q.ph),0,q.amp*amt*.42*Math.sin(t*.71+q.ph*1.7)),q.m0));
      }
    }
    // Aircraft beacons alternate rather than flash in perfect unison — and, like every other
    // emitter out here, they belong to the night application. They used to carry a fixed pair of
    // levels, so the crown strobed red over a midday sky; `_applyNight` never reached them because
    // their glow is rewritten each frame rather than set once by `remember`.
    const beaconHi=nightOn?.95:0, beaconLo=nightOn?.06:0;
    for(let i=0;i<warning.length;i++)
      warning[i].glow=((Math.floor(t*1.4)+i)%4===0)?beaconHi:beaconLo;

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
