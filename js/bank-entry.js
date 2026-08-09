// 入口区 — the entrance lobby.
//
// Registers into BankFit (declared at the top of js/bank.js). The first thing a customer walks into:
// a doormat, a 发财树 for luck, the queue-ticket machine's first sign, and a security guard. The
// vocabulary here is the threshold of the whole building — 进门, 取号, 排队.
BankFit['entry'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,sign,doorPlate,potPlant,
    stanchion,queueBelt,slatPanel,RZ,RX } = A;

  // The lobby stretches from the door (-z) to the ticket zone. Two luck-plants flank the door,
  // a guard's post sits to one side, and a stanchion line starts the queue.
  potPlant(-5.4,-RZ+1.75,.90);
  potPlant( 5.4,-RZ+1.75,.90);

  // Forms are built into the west wall as one small writing credenza instead of another loose box
  // in the arrival path.
  slatPanel(-RX+.18,-RZ+2.55,2.7,1.90,Math.PI/2,'单子',col.woodD);
  box(-RX+.58,.64,-RZ+2.55,.68,1.04,1.65,col.woodD,
    {round:.05,hard:true,mode:6,gloss:.22,tag:'单子'});
  box(-RX+.93,1.18,-RZ+2.55,.82,.10,1.78,col.marble,
    {round:.035,hard:true,gloss:.23,tag:'单子'});
  box(-RX+.92,.91,-RZ+2.55,.035,.42,1.42,col.redD,{hard:true,mode:6,tag:'单子'});
  for(let i=0;i<3;i++) box(-RX+.99,1.255,-RZ+2.95-i*.38,.34,.018,.25,col.paper,
    {hard:true,mode:7,rz:(i-1)*.035,tag:'单子'});
  glyphs(-RX+.995,1.55,-RZ+2.55,Math.PI/2,'业务表单',
    {size:.12,gap:.035,color:col.goldL,mode:1,lift:.010,tag:'单子'});
  solid(-RX+.20,-RX+1.02,-RZ+1.68,-RZ+3.42);
  thing('单子', -RX+1.00, 1.35, -RZ+2.55, '先填一张存款单。',
    'Fill in a deposit slip first.',
    '单子 is a form/slip. 存款单 deposit slip, 取款单 withdrawal slip.',
    {tag:'单子',focus:[-RX+2.15,-RZ+2.55],reach:1.7});

  // A belted two-lane queue lives entirely west of the dark arrival runner.  The centre two metres
  // from the door to the tellers remain visually and physically clear.
  const posts=[[-9.4,-RZ+2.0],[-6.9,-RZ+2.0],[-4.4,-RZ+2.0],
               [-9.4,-RZ+2.85],[-4.4,-RZ+2.85]];
  for(const [x,z] of posts) stanchion(x,z);
  queueBelt(-9.4,-RZ+2.0,-6.9,-RZ+2.0);
  queueBelt(-6.9,-RZ+2.0,-4.4,-RZ+2.0);
  queueBelt(-9.4,-RZ+2.85,-4.4,-RZ+2.85);
  queueBelt(-9.4,-RZ+2.0,-9.4,-RZ+2.85);
  thing('排队', -6.9, 1.0, -RZ+2.4, '请大家排队取号。',
    'Please queue and take a number.',
    '排队 to queue. 取号 to take a number.',
    {tag:'排队',focus:[-6.9,-RZ+3.45],reach:2.2});

  // Wall-mounted wayfinding at the two edges; no floating blades collide over the aisle.
  sign(-RX+.16, 2.78, -RZ+5.6, Math.PI/2, '取号 · 个人业务 →', col.navy, '指示', .145);
  sign( RX-.16, 2.78, -RZ+5.6,-Math.PI/2, '← 24H 自动银行', col.navy, '指示', .145);
};
