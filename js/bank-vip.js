// 贵宾室 — the VIP / wealth-management lounge.
//
// A quieter, warmer room off the main hall: sofas, a tea table, a wealth manager's desk. The
// vocabulary is 理财, 基金, 贵宾 — the register a branch uses with its better customers.
BankFit['vip'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,sign,doorPlate,desk,
    chair,bench,lowTable,potPlant,slatPanel,pendant,RX,RZ } = A;

  const VX0 = 8.40, VX1 = RX-.35, DOORZ=7.40;

  // A framed glazed salon begins beyond the teller wall.  Low walnut bases and almost-clear glass
  // let the richer room read from the hall while the 1.5 m doorway remains visibly open.
  for(const [z0,z1] of [[5.70,DOORZ-.75],[DOORZ+.75,RZ-.30]]) {
    const z=(z0+z1)/2,d=z1-z0;
    box(VX0,.57,z,.12,1.10,d,col.woodD,{hard:true,mode:6,gloss:.22,tag:'贵宾室'});
    box(VX0,2.16,z,.045,2.05,d-.05,col.glass,
      {hard:true,mode:1,alpha:.10,gloss:.92,tag:'贵宾室'});
    box(VX0,1.13,z,.08,.045,d,col.brass,{hard:true,gloss:.60,tag:'贵宾室'});
    box(VX0,3.19,z,.08,.055,d,col.black,{hard:true,gloss:.28,tag:'贵宾室'});
    for(let q=z0;q<=z1+.01;q+=1.55) box(VX0,2.16,Math.min(q,z1),.075,2.10,.055,col.black,
      {hard:true,gloss:.28,tag:'贵宾室'});
    solid(VX0-.07,VX0+.07,z0,z1);
  }
  for(const z of [DOORZ-.77,DOORZ+.77]) box(VX0,1.55,z,.12,3.05,.10,col.brass,
    {hard:true,gloss:.60,tag:'贵宾室'});
  box(VX0,3.13,DOORZ,.12,.10,1.62,col.brass,{hard:true,gloss:.60,tag:'贵宾室'});
  doorPlate(VX0-.05,2.84,DOORZ,Math.PI/2,'贵宾理财','贵宾室',col.redD);

  const cx=11.55;
  flat(cx,.015,7.78,5.55,3.58,col.fabricD,{mode:7,gloss:.035,tag:'贵宾室'});
  for(const z of [6.02,9.54]) flat(cx,.019,z,5.55,.045,col.brass,{gloss:.56,tag:'贵宾室'});
  pendant(cx,7.70,.23,'贵宾室灯');
  light(cx,2.65,7.70,[1.0,.76,.49],.22,4.4);

  bench(cx,6.72,3,0,'沙发',col.fabricL);
  lowTable(cx,7.72,1.35,.72,'茶几',0);
  cyl(cx-.20,.50,7.72,.075,.085,col.white,{gloss:.36,tag:'茶几'});
  cyl(cx+.03,.50,7.72,.10,.065,col.jade,{gloss:.28,tag:'茶几'});
  for(const x of [10.25,12.85]) chair(x,8.60,Math.PI,'椅子',col.fabric);

  // Adviser station and hospitality credenza occupy the deep edge, away from the conversation set.
  desk(13.55,9.30,1.48,.72,'桌子',0,col.woodL);
  chair(13.55,10.02,Math.PI,'理财经理椅',col.fabric);
  A.screen(13.25,1.08,9.12,0,.42,.28,'理财','桌子');
  box(9.12,.56,9.92,1.18,.92,.52,col.woodD,{round:.04,hard:true,mode:6,gloss:.22,tag:'茶水'});
  box(9.12,1.05,9.92,1.28,.10,.60,col.marble,{round:.035,hard:true,gloss:.23,tag:'茶水'});
  for(const x of [8.88,9.16,9.44]) cyl(x,1.14,9.92,.065,.09,col.white,{gloss:.30,tag:'茶水'});

  potPlant(14.65,6.45,.86);

  slatPanel(11.70,RZ-.22,6.25,2.48,0,'贵宾室',col.woodD);
  sign(11.70,2.82,RZ-.15,Math.PI,'贵宾理财室',col.redD,'贵宾室',.18);
  glyphs(11.70,2.48,RZ-.23,Math.PI,'PRIVATE BANKING',
    {size:.09,gap:.025,color:col.goldL,mode:1,glow:.02,lift:.010,tag:'贵宾室'});

  thing('理财', cx, 1.00, 7.72, '了解一下理财产品。',
    'Learn about our wealth-management products.',
    '理财 wealth management. 基金 fund. 产品 product.',
    {tag:'贵宾室',focus:[cx,8.72],reach:2.0});
  thing('贵宾', VX0-.10, 1.60, DOORZ, '贵宾室在这边。',
    'The VIP lounge is over here.',
    '贵宾 VIP / distinguished guest.',
    {tag:'贵宾室',focus:[VX0-.72,DOORZ],reach:1.7});
};
