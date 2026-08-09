// 内部办公区 — the back office.
//
// A glimpse of the staff side: desks, a break area, filing cabinets. Mostly seen through a door,
// not entered — it is there so the hall reads as a real workplace, not a stage set with no backstage.
BankFit['office'] = A => {
  const { box,cyl,capsule,flat,glyphs,solid,shade,glow,light,thing,col,sign,doorPlate,desk,
    chair,cabinet,partitionX,partitionZ,slatPanel,RX,RZ } = A;

  const OZ0=6.40,OZ1=RZ-.30,OX0=-RX+.30,OX1=-4.20;

  // Actually enclosed on both public edges.  Previously only the east edge existed, so the room
  // labelled "no admittance" could be entered freely around its missing south wall.
  partitionZ(OZ0,OX0,OX1,[],col.wallD,'内部');
  partitionX(OX1,OZ0,OZ1,[],col.wallD,'内部');
  box(-8.0,1.35,OZ0-.105,1.45,2.48,.06,col.woodD,
    {round:.035,hard:true,mode:6,gloss:.22,tag:'内部'});
  box(-8.0,1.54,OZ0-.145,.70,1.20,.018,col.glass,
    {hard:true,mode:1,alpha:.11,gloss:.92,tag:'内部'});
  for(const x of [-8.52,-7.48]) capsule(x,1.35,OZ0-.19,.023,.48,.023,col.brass,
    {gloss:.62,tag:'内部'});
  doorPlate(-8.0,2.78,OZ0-.15,Math.PI,'内部办公','内部',col.navy);

  flat((OX0+OX1)/2,.014,(OZ0+OZ1)/2,OX1-OX0,OZ1-OZ0,col.floorD,
    {mode:7,gloss:.06,tag:'内部'});
  light((OX0+OX1)/2,2.85,(OZ0+OZ1)/2,[.88,.82,.70],.19,4.4);

  desk(-13.55,8.15,1.45,.70,'桌子',0,col.wood);
  chair(-13.55,7.20,0,'椅子',col.fabric);
  box(-13.55,1.28,8.82,.42,.56,.26,col.navyD,{round:.06,mode:7,tag:'员工'});

  desk(-10.65,9.45,1.45,.70,'桌子',0,col.wood);
  chair(-10.65,8.50,0,'椅子',col.fabric);

  cabinet(-14.95,9.65,1.65,1.90,.44,'柜子',col.floorL,Math.PI/2);
  cabinet(-12.35,10.18,1.70,1.82,.44,'柜子',col.floorL,0);

  // Pinboard and a built-in water niche make the frosted office read as occupied from the hall.
  slatPanel(-5.05,8.55,2.45,2.10,Math.PI/2,'内部',col.woodD);
  box(-5.35,.78,9.90,.54,1.18,.48,col.woodD,{round:.04,hard:true,mode:6,tag:'内部'});
  cyl(-5.35,1.50,9.90,.14,.32,col.glass,{mode:1,alpha:.12,gloss:.92,tag:'内部'});
  box(-5.62,.57,9.78,.025,.075,.10,col.red,{hard:true,mode:1,glow:.05,tag:'内部'});
  box(-5.62,.57,10.02,.025,.075,.10,col.greenLed,{hard:true,mode:1,glow:.05,tag:'内部'});

  thing('内部', -8.0, 1.60, OZ0-.15, '内部办公区，闲人免进。',
    'Staff area, no entry.',
    '内部 inside/internal. 闲人免进 no admittance.',
    {tag:'内部',focus:[-8.0,OZ0-.95],reach:1.7});
};
