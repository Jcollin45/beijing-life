// 自助取款机 — the ATM lobby.
//
// A self-service bank of ATMs along the +x wall, open all hours. This is the zone that teaches
// 卡, 密码, 余额, 转账 at the machine, and it is the part of a branch you use most.
BankFit['atms'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,screen,sign,doorPlate,RX,RZ } = A;

  const AX = RX - .92;                   // four recessed bays in the east wall
  const NUM = 4;
  const z0 = -3.0;

  // One dark self-service room: a continuous stone floor field, deep navy wall and bronze-edged
  // canopy.  Machines are equipment inside this architecture, not grey cabinets standing alone.
  flat(RX-2.20,.014,0,3.55,9.20,col.navyD,{mode:7,gloss:.045,tag:'取款机'});
  flat(RX-3.96,.018,0,.055,8.25,col.brass,{gloss:.58,tag:'取款机'});
  box(RX-.32,1.58,0,.52,2.95,8.85,col.navyD,
    {hard:true,mode:6,gloss:.18,tag:'取款机'});
  box(RX-.74,3.08,0,1.25,.16,8.92,col.woodD,
    {hard:true,mode:6,gloss:.23,tag:'取款机'});
  box(RX-1.38,2.98,0,.035,.035,8.78,col.brass,
    {hard:true,gloss:.62,tag:'取款机'});

  for(let i=0;i<NUM;i++) {
    const z = z0 + i*2.0;
    box(AX,1.39,z,.78,2.30,1.55,col.black,
      {round:.045,hard:true,gloss:.34,tag:'取款机'});
    box(AX-.41,1.40,z,.08,2.12,1.40,col.steelD,
      {hard:true,gloss:.34,tag:'取款机'});
    box(AX-.47,1.39,z,.035,1.98,1.27,col.navy,
      {hard:true,gloss:.34,tag:'取款机'});
    A.screen(AX-.50,1.63,z,-Math.PI/2,.58,.42,'密码','取款机');
    box(AX-.53,1.23,z-.37,.035,.055,.27,col.black,{hard:true,tag:'取款机'});
    box(AX-.53,1.04,z+.24,.035,.065,.38,col.black,{hard:true,tag:'取款机'});
    box(AX-.55,1.045,z+.24,.018,.025,.30,col.greenLed,
      {hard:true,mode:1,glow:.22,tag:'取款机'});
    box(AX-.53,.86,z-.08,.035,.045,.24,col.black,{hard:true,tag:'取款机'});
    box(AX-.57,.44,z,.08,.50,1.05,col.woodD,{hard:true,mode:6,gloss:.20,tag:'取款机'});
    glyphs(AX-.575,2.46,z,-Math.PI/2,'ATM '+String(i+1),
      {size:.105,gap:.025,color:col.goldL,mode:1,lift:.010,tag:'取款机'});
    solid(AX-.48,AX+.42,z-.58,z+.58);
    // One interaction per cabinet: the old single focus at z=0 could not reach the end machines.
    const atm=thing('取款机',AX-1.0,1.30,z,'请插入银行卡。',
      'Insert your bank card.',
      '密码 PIN/password. 余额 balance. 转账 transfer.',
      {tag:'取款机',focus:[RX-2.65,z],reach:1.8});
    atm.bankStation=i+1;
  }

  // Dark privacy blades establish the individual bays without the old oversized hoods.
  for(const z of [-4.08,-2.0,0,2.0,4.08])
    box(RX-1.35,1.36,z,1.55,2.38,.075,col.woodD,
      {round:.025,hard:true,mode:6,gloss:.22,tag:'取款机'});

  sign(RX-1.39,3.23,0,-Math.PI/2,'24 小时自助银行',col.red,'取款机',.175);
  glyphs(RX-1.43,2.90,0,-Math.PI/2,'24H SELF SERVICE',
    {size:.085,gap:.024,color:col.goldL,mode:1,lift:.010,tag:'取款机'});
  doorPlate(RX-.64,2.60,-RZ+5.65,-Math.PI/2,'自动取款机','取款机',col.navy);

  thing('卡', AX-.52, 1.04, -1.0, '插入银行卡。',
    'Insert your bank card.',
    '卡 card. 银行卡 bank card. 刷卡 to swipe.',
    {tag:'取款机',focus:[RX-2.65,-1.0],reach:1.7});
};
