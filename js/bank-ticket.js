// 取号机区 — the queue-ticket machines.
//
// The 拿号/叫号 system is the spine of a Chinese bank: you take a number, you wait, the screen
// calls you. This zone owns the machines and the big 叫号 display the counters read off.
BankFit['ticket'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,screen,sign,RZ } = A;

  const MZ = -RZ + 3.85;
  // Three compact kiosks terminate the west-side queue.  Their shared dark plinth and red identity
  // strip make one authored installation, not three steel refrigerators across the front door.
  flat(-6.8,.014,MZ,6.8,1.42,col.floorD,{mode:7,gloss:.07,tag:'取号机'});
  for(const s of [-1,1]) flat(-6.8+s*3.35,.018,MZ,.035,1.30,col.brass,
    {gloss:.55,tag:'取号机'});
  for(let i=0;i<3;i++) {
    const x = -8.8 + i*2.0;
    box(x,.10,MZ,.76,.16,.48,col.woodD,{hard:true,mode:6,tag:'取号机'});
    box(x,.70,MZ,.68,1.16,.40,col.navyD,
      {round:.055,hard:true,mode:6,gloss:.25,tag:'取号机'});
    box(x-.29,.73,MZ-.215,.055,1.05,.025,col.red,
      {hard:true,mode:6,gloss:.24,tag:'取号机'});
    box(x,1.31,MZ-.03,.72,.08,.46,col.marble,
      {round:.035,hard:true,gloss:.23,tag:'取号机'});
    A.screen(x, 1.04, MZ-.215, Math.PI, .50, .36, '取号', '取号机');
    box(x, .61, MZ-.225, .24, .055, .035, col.black, {hard:true,tag:'取号机'});
    box(x,.48,MZ-.23,.18,.09,.028,col.paper,{hard:true,mode:7,tag:'取号机'});
    cyl(x+.24, .65, MZ-.235, .035, .018, col.greenLed, {mode:1,glow:.28,tag:'取号机'});
    glyphs(x,1.50,MZ-.245,Math.PI,String(i+1),
      {size:.14,color:col.goldL,mode:1,glow:.02,lift:.010,tag:'取号机'});
    solid(x-.38,x+.38,MZ-.25,MZ+.25);
    // Each physical touchscreen is live.  A single hotspot at x=0 left both outside machines as
    // convincing props that could never issue a number.
    const machine=thing('取号机',x,1.40,MZ+.20,'请选择要办理的业务。',
      'Choose the service you need.',
      '取号 take a number. 业务 is a banking service.',
      {tag:'取号机',focus:[x,MZ-1.05],reach:1.7});
    machine.bankStation=i+1;
  }

  // The live call display is part of the teller feature wall at the far end of the arrival axis.
  // It can be read from every waiting seat without becoming a low black slab in the camera.
  const BZ = 5.215;
  box(0, 2.70, BZ, 4.70, .56, .09, col.black, {hard:true,gloss:.32,tag:'叫号'});
  box(0,2.70,BZ-.055,4.54,.42,.018,col.screen,
    {hard:true,mode:1,glow:.085,tag:'叫号'});
  for(const s of [-1,1]) box(s*2.37,2.70,BZ-.04,.045,.62,.08,col.brass,
    {hard:true,gloss:.60,tag:'叫号'});
  // The geometry cannot rewrite glyph meshes per ticket, so keep the fixed fascia truthful and
  // let the live interaction below read the player's actual number and destination.
  glyphs(-1.32, 2.72, BZ-.07, Math.PI, '当前叫号',
    {size:.18,gap:.05,color:col.goldL,mode:1,lift:.014,tag:'叫号'});
  glyphs( 1.28, 2.72, BZ-.07, Math.PI, '请看屏幕',
    {size:.12,gap:.035,color:col.wallL,mode:1,lift:.012,tag:'叫号'});
  thing('叫号', 0, 2.70, BZ-.15, '请看屏幕上的号码和柜台。',
    'Check the screen for your number and counter.',
    '叫号 to call a number. 柜台 counter; 号码 number.',
    {tag:'叫号',focus:[0,3.15],reach:2.4});
};
