// 等候区 — the waiting area.
//
// The benches where customers sit watching the 叫号 board. This is where you spend the most real
// time in a bank, and it earns the sitting system. Two bench runs flanking a low table with
// magazines and a water dispenser.
BankFit['waiting'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,bench,lowTable,potPlant } = A;

  const WZ = -.10;

  // Two tailored seating islands face the teller wall.  Each has its own bordered rug and end
  // table, while the bronze-edged arrival runner remains completely unobstructed between them.
  for(const x of [-3.25,3.25]) {
    flat(x,.014,WZ,3.25,2.30,col.fabricD,{mode:7,gloss:.035,tag:'等候'});
    flat(x,.018,WZ-1.12,3.25,.045,col.brass,{gloss:.52,tag:'等候'});
    flat(x,.018,WZ+1.12,3.25,.045,col.brass,{gloss:.52,tag:'等候'});
    bench(x,WZ,3,0,'等候椅',x<0?col.fabric:col.fabricL);
  }

  for(const x of [-5.35,5.35]) lowTable(x,WZ+.30,1.05,.66,'茶几',0);
  for(const x of [-5.55,-5.25,5.15,5.45]) box(x,.50,WZ+.30,.24,.018,.17,
    x<0?col.red:col.navy,{hard:true,mode:7,rz:(x%1)*.08,tag:'等候'});
  cyl(5.62,.52,WZ+.30,.055,.08,col.white,{gloss:.25,tag:'等候'});

  // A low hospitality credenza with a glass carafe keeps this useful station below the sightline.
  box(-6.70,.39,WZ+.72,.72,.66,.72,col.woodD,
    {round:.04,hard:true,mode:6,gloss:.20,tag:'等候'});
  box(-6.70,.75,WZ+.72,.82,.10,.82,col.marble,
    {round:.035,hard:true,gloss:.23,tag:'等候'});
  cyl(-6.70,1.06,WZ+.72,.16,.52,col.glass,
    {mode:1,alpha:.11,gloss:.92,tag:'等候'});
  cyl(-6.70,.81,WZ+.72,.17,.055,col.brass,{gloss:.58,tag:'等候'});
  box(-6.38,.88,WZ+.60,.035,.055,.10,col.red,{hard:true,mode:1,glow:.08,tag:'等候'});
  box(-6.38,.88,WZ+.84,.035,.055,.10,col.greenLed,{hard:true,mode:1,glow:.08,tag:'等候'});

  potPlant(6.70,WZ+.72,.76);

  thing('等候', 0, .60, WZ, '请坐，等叫号。',
    'Please sit and wait to be called.',
    '等候 to wait. 请坐 please sit.',
    {tag:'等候',focus:[0,WZ+1.05],reach:2.1});
};
