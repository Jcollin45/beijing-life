// 营业柜台 — the teller counter row.
//
// The heart of the hall: a run of marble counters behind glass, each with its number, a till, a
// card reader, and a small tray for ID and cash. This is where 存款/取款/转账 actually happen, and
// where the numbers-under-pressure vocabulary the bank exists to teach is spoken.
BankFit['counters'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,counter,screen,doorPlate,
    chair,stanchion,queueBelt,slatPanel } = A;

  const CZ = 4.0;
  const NUM = ['1','2','3','4','5'];    // five counters, one closed (the 4th)
  const span = 2.6;
  const x0 = -(NUM.length-1)*span/2;

  // One teller architecture spans the room: recessed walnut bays in an ink-blue wall, bronze
  // reveals, one bilingual identity line and the live call display authored by bank-ticket.js.
  box(0,1.76,5.36,14.25,3.18,.18,col.navyD,
    {hard:true,mode:6,gloss:.18,tag:'柜台'});
  solid(-7.13,7.13,5.27,5.45);
  box(0,3.31,5.245,14.25,.16,.10,col.redD,{hard:true,mode:6,gloss:.24,tag:'柜台'});
  box(0,3.18,5.22,14.05,.035,.04,col.brass,{hard:true,gloss:.62,tag:'柜台'});
  glyphs(-4.82,3.43,5.19,Math.PI,'现金服务',{size:.155,gap:.04,color:col.wallL,mode:1,glow:.02,lift:.012,tag:'柜台'});
  glyphs( 4.72,3.43,5.19,Math.PI,'CASH · TELLER',{size:.105,gap:.028,color:col.goldL,mode:1,glow:.02,lift:.012,tag:'柜台'});
  for(let i=0;i<NUM.length;i++) {
    const x=x0+i*span;
    box(x,1.63,5.245,2.38,2.62,.045,i===3?col.redD:col.woodD,
      {hard:true,mode:6,gloss:.22,tag:'柜台'});
    for(let k=-4;k<=4;k++) box(x+k*.245,1.63,5.205,.035,2.48,.025,
      i===3?col.red:col.woodL,{hard:true,mode:6,gloss:.20,tag:'柜台'});
    for(const s of [-1,1]) box(x+s*1.22,1.65,5.19,.045,2.68,.055,col.brass,
      {hard:true,gloss:.58,tag:'柜台'});
  }

  for(let i=0;i<NUM.length;i++) {
    const x = x0 + i*span;
    const closed = (i===3);
    counter(x, CZ, 2.20, .70, '柜台', col.marble);
    // Station numbers live on the wall elevation, aligned with the bays.
    doorPlate(x,2.22,5.19,Math.PI,NUM[i]+'号','柜台',closed?col.red:col.navy);
    if(closed) {
      doorPlate(x, 1.28, CZ-.40, Math.PI, '暂停服务', '柜台', col.redD);
      continue;
    }
    // the till and card reader on the counter
    box(x-.42,1.07,CZ-.16,.30,.16,.24,col.inkL,{round:.025,hard:true,gloss:.24,tag:'柜台'});
    box(x-.42,1.16,CZ-.285,.22,.11,.018,col.screenOn,{hard:true,mode:1,glow:.10,tag:'柜台'});
    box(x+.08,1.05,CZ-.18,.12,.10,.08,col.black,{round:.02,hard:true,gloss:.30,tag:'柜台'});
    // the pass-through tray for ID / cash
    box(x+.50,1.02,CZ-.08,.30,.055,.36,col.steelD,{round:.025,hard:true,gloss:.34,tag:'柜台'});
    flat(x+.50,1.055,CZ-.08,.24,.30,col.marbleD,{mode:7,tag:'柜台'});
    chair(x,4.77,Math.PI,'柜员椅',col.fabricD);
    // Live tellers are registered through BankCast.  Primitive busts here doubled their bodies
    // and stayed frozen while the real staff breathed and worked behind the same glass.
  }

  // Two short belted guides define the waiting line without barricading the central runner.
  for(const x of [-6.85,6.85]) {
    stanchion(x,CZ-1.75); stanchion(x,CZ-1.00);
    queueBelt(x,CZ-1.75,x,CZ-1.00);
  }

  const counter3=thing('柜台', x0+span*2, 1.20, CZ-.78, '请到三号柜台办理。',
    'Please go to counter three.',
    '柜台 counter. 办理 to handle/transact.',
    {tag:'柜台',focus:[x0+span*2,CZ-1.05],reach:1.9});
  counter3.bankStation=3;
  const counter5=thing('柜台', x0+span*4, 1.20, CZ-.78, '五号柜台也可以办理现金业务。',
    'Counter five also handles cash transactions.',
    '柜台 counter. 现金业务 cash service.',
    {tag:'柜台',focus:[x0+span*4,CZ-1.05],reach:1.8});
  counter5.bankStation=5;
  const deposit=thing('存款', x0, 1.30, CZ-.40, '我要存款。',
    'I want to make a deposit.',
    '存款 deposit (存 to save/put in, 款 money). 取款 is to withdraw.',
    {tag:'柜台',focus:[x0,CZ-1.05],reach:1.8});
  deposit.bankStation=1;
  const withdraw=thing('取款', x0+span, 1.30, CZ-.40, '我要取一千块。',
    'I want to withdraw one thousand kuai.',
    '取款 withdraw. 千 thousand; 一千 is 1000.',
    {tag:'柜台',focus:[x0+span,CZ-1.05],reach:1.8});
  withdraw.bankStation=2;
};
