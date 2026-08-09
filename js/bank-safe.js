// 保险箱 / 保管箱 — the safe deposit corridor.
//
// A back corridor of safe deposit boxes behind a small gate: rows of steel boxes in the -x wall,
// the thing a branch actually keeps for you. Lower light, steel everywhere — the room reads as
// "vault" without pretending to be one.
BankFit['safe'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,sign,doorPlate,
    partitionX,partitionZ,slatPanel,RX } = A;

  const SX = -RX + .58;
  // The doorway sits north of the final consultation pod.  Sharing z=3.0 with that adviser made
  // the safe-deposit sign appear to belong to the wealth desk and put a person in the doorway.
  const SZ0 = .55, SZ1 = 5.55, DOORZ = 4.65;

  // A complete secure alcove with one visible doorway; the old gate floated in an open hall.
  flat((SX-12.35)/2,.014,(SZ0+SZ1)/2,-12.35-SX,SZ1-SZ0,col.navyD,
    {mode:7,gloss:.04,tag:'保险箱'});
  partitionX(-12.35,SZ0,SZ1,[[DOORZ,1.50]],col.navyD,'保险箱');
  partitionZ(SZ0,SX,-12.35,[],col.navyD,'保险箱');
  partitionZ(SZ1,SX,-12.35,[],col.navyD,'保险箱');
  for(const z of [DOORZ-.77,DOORZ+.77])
    box(-12.30,1.34,z,.12,2.48,.10,col.brass,{hard:true,gloss:.58,tag:'保险箱'});
  box(-12.30,2.52,DOORZ,.12,.12,1.62,col.brass,{hard:true,gloss:.58,tag:'保险箱'});
  doorPlate(-12.26,2.90,DOORZ,Math.PI/2,'保管箱','保险箱',col.navy);

  // Lacquer-and-bronze safe-deposit wall, framed like a premium cabinet rather than raw grey mesh.
  box(SX,1.42,(SZ0+SZ1)/2,.34,2.55,SZ1-SZ0-.42,col.woodD,
    {hard:true,mode:6,gloss:.23,tag:'保险箱'});
  let n=0;
  for(let row=0;row<5;row++) for(let colI=0;colI<7;colI++) {
    const z = SZ0 + .38 + colI*((SZ1-SZ0-.76)/6);
    const y = .31 + row*.48;
    box(SX+.19,y+.20,z,.045,.39,.46,row%2?col.steelD:col.steel,
      {hard:true,mode:6,gloss:.34,tag:'保险箱'});
    box(SX+.218,y+.20,z-.225,.018,.39,.025,col.brass,
      {hard:true,gloss:.56,tag:'保险箱'});
    cyl(SX+.235,y+.28,z-.14,.022,.012,col.brass,{gloss:.62,rz:Math.PI/2,tag:'保险箱'});
    glyphs(SX+.238,y+.10,z+.05,Math.PI/2,String(101+n),
      {size:.055,gap:.018,color:col.wallL,mode:1,lift:.006,tag:'保险箱'});
    n++;
  }
  solid(SX-.20,SX+.30,SZ0+.16,SZ1-.16);

  // A small verification ledge just inside the doorway.
  box(-13.20,.52,DOORZ-.92,1.10,.82,.52,col.woodD,
    {round:.04,hard:true,mode:6,gloss:.22,tag:'保险箱'});
  box(-13.20,.96,DOORZ-.92,1.20,.10,.62,col.marble,
    {round:.035,hard:true,gloss:.24,tag:'保险箱'});
  box(-13.20,.80,DOORZ-1.20,.72,.035,.025,col.brass,{hard:true,gloss:.58,tag:'保险箱'});
  solid(-13.80,-12.60,DOORZ-1.23,DOORZ-.61);

  light(SX+1.65,2.70,(SZ0+SZ1)/2,[.82,.72,.55],.20,3.8);

  thing('保险箱', -12.35, 1.35, DOORZ, '这里可以租保管箱。',
    'You can rent a safe deposit box here.',
    '保险箱 / 保管箱 safe deposit box. 租 to rent.',
    {tag:'保险箱',focus:[-11.45,DOORZ],reach:1.8});
};
