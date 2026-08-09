// The two deliberately moving campus landmarks: ceremonial flag and breakfast-cart steam.
CampusFits.register('life', 60, kit => {
  const {box,cyl,ball,capsule,solid,shade,thing,col,G,S,held,litten,dynamic} = kit;
  const flagPanels=[],steam=[];

  // Flagpole and 1.4 m plinth at the exact ceremonial-axis coordinate.
  const FX=-3,FZ=6.5;
  cyl(FX,4.20,FZ,.09,8.40,col.white,{gloss:.30});
  box(FX,.22,FZ,1.40,.44,1.40,held(col.stoneL,S.stone),
    {hard:true,gloss:G.matte,...S.stone});
  solid(-3.8,-2.2,5.7,7.3);
  const flagW=1.10/3;
  for(let i=0;i<3;i++){
    const p=box(FX+.03+(i+.5)*flagW,7.70,FZ,flagW+.006,.72,.04,col.red,
      {hard:true,mode:7,gloss:G.fabric,dynamic:true});
    dynamic(p,FX+.58,7.70,FZ,.78);
    flagPanels.push({p,w:flagW,h:.72,d:.04,phase:i*.73});
  }

  // O03 jianbing cart at (-26,-3.5), facing its customer focus to the east.
  const CX=-26,CZ=-3.5,T={tag:'煎饼'};
  box(CX,.92,CZ,2.20,.10,1,held(col.steel,S.steel),
    {...T,hard:true,gloss:.40,...S.steel});
  box(CX,.68,CZ,2,.46,.86,held(col.steelD,S.steel),
    {...T,hard:true,gloss:.34,...S.steel});
  for(const [ox,oz] of [[-1,-.4],[1,-.4],[-1,.4],[1,.4]])
    cyl(CX+ox,.34,CZ+oz,.09,.68,col.charcoal,{...T,gloss:.30});
  cyl(CX,.34,CZ+.60,.26,.06,col.charcoal,{...T,rx:Math.PI/2,gloss:.30});
  box(CX-.55,1,CZ,.72,.04,.72,col.charcoal,{...T,hard:true,mode:1,gloss:.30});
  cyl(CX-.55,1.03,CZ,.30,.02,C('#e8d8b0'),{...T,hard:true,mode:7,gloss:.20});
  ball(CX-.40,1.05,CZ+.12,.07,.04,.07,C('#f0e6c8'),{...T,mode:7,gloss:.20});
  cyl(CX+.50,1.08,CZ-.30,.16,.30,col.white,{...T,hard:true,gloss:.26});
  for(let i=0;i<3;i++){
    const p=ball(CX-.55+(i-1)*.14,1.12+i*.22,CZ,.20-i*.03,.16-i*.04,.20-i*.03,
      C('#eeece4'),{mode:1,alpha:.18-i*.05,dynamic:true});
    dynamic(p,CX-.55+(i-1)*.14,1.12+i*.22,CZ,.36);
    p.sx0=p.m[0];p.sy0=p.m[5];p.sz0=p.m[10];
    steam.push({p,x:CX-.55+(i-1)*.14,y0:1.12+i*.22,z:CZ,ph:i*.9});
  }
  for(const [ox,oy] of [[-1.2,2.3],[1.2,2.3],[-1.2,2.62],[1.2,2.62]])
    capsule(CX+ox,oy/2,CZ+.80,.03,oy,.03,col.steelD,{...T,gloss:.34});
  // Five broad alternating canopy panels keep the same 2.60 m awning footprint and striped read.
  const awningN=5,awningW=2.60/awningN;
  for(let i=0;i<awningN;i++) box(CX-1.30+(i+.5)*awningW,2.46,CZ+.20,awningW+.006,.08,1.50,
    i%2?col.cream:col.red,{...T,hard:true,rx:-.26,gloss:.24});
  box(CX,2.10,CZ+.95,2.60,.22,.07,col.redD,{...T,hard:true,gloss:.24});
  for(let i=0;i<5;i++) ball(CX-1.20+i*.60,1.98,CZ+.95,.13,.07,.04,col.redD,{...T,gloss:.24});
  box(CX+1.22,2,CZ,.14,.56,.90,col.redD,{...T,hard:true,gloss:.26});
  for(const g of kit.glyphs(CX+1.30,2,CZ,Math.PI/2,'煎饼',
    {tag:'煎饼',size:.22,gap:.06,color:col.goldL,mode:1})) litten(g,.5);
  // Customer-side folding shelf is flush with, and fully covered by, the exact cart solid.
  const shelfX=CX+.80;
  box(shelfX,.72,CZ,1,.06,.60,col.trunkL,{...T,hard:true,gloss:G.wood});
  for(const [ox,oz] of [[-.4,-.24],[.4,-.24],[-.4,.24],[.4,.24]])
    capsule(shelfX+ox,.36,CZ+oz,.03,.72,.03,col.steelD,{...T,gloss:.34});
  solid(-27.25,-24.70,-4.20,-2.80); shade(CX,CZ,3.2,2.2,.30);
  thing('煎饼',CX,2,CZ,'一个煎饼，加蛋，四块。','One jianbing, with an egg. Four kuai.',
    '煎 to pan-fry + 饼 flatbread. The cheapest hot breakfast on campus.',
    {focus:[-24.2,-3.5],reach:2.0});

  function tick(t) {
    for(const q of steam){
      const u=(t*.22+q.ph)%1,spread=1+u*.9;
      q.p.m[13]=q.y0+u*.55; q.p.alpha=(1-u)*.18;
      q.p.m[0]=q.p.sx0*spread; q.p.m[5]=q.p.sy0*spread*.8; q.p.m[10]=q.p.sz0*spread;
      q.p.cx=q.x;q.p.cy=q.y0+u*.55;q.p.cz=q.z;
    }
    const wind=typeof Weather!=='undefined'&&Weather.now?Weather.now.wind:.18;
    let x=FX+.03,z=FZ;
    for(let i=0;i<flagPanels.length;i++){
      const q=flagPanels[i];
      const a=Math.sin(t*(1.02+i*.07)+q.phase)*(.018+wind*(.055+i*.018))+
        Math.sin(t*2.17+q.phase*1.8)*(.005+wind*.009);
      const c=Math.cos(a),s=Math.sin(a),m=q.p.m;
      m[0]=c*q.w;m[1]=0;m[2]=-s*q.w;m[3]=0;
      m[4]=0;m[5]=q.h;m[6]=0;m[7]=0;
      m[8]=s*q.d;m[9]=0;m[10]=c*q.d;m[11]=0;
      m[12]=x+c*q.w*.5;m[13]=7.70;m[14]=z-s*q.w*.5;m[15]=1;
      q.p.cx=FX+.58;q.p.cy=7.70;q.p.cz=FZ;
      x+=c*q.w;z-=s*q.w;
    }
  }
  return {tick};
});
