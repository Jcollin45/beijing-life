// 业务 desk — the account-opening / consultation desks.
//
// The open desks where a customer sits with an account manager to 开户, 办卡, or buy a product.
// Warm wood, two chairs facing a desk, a computer, a card reader. The vocabulary here is forms and
// ID — 身份证, 开户, 手机号 — the documented S15 bureaucracy gap.
BankFit['desks'] = A => {
  const { box,cyl,flat,glyphs,solid,shade,glow,light,thing,col,desk,sign,doorPlate,
    chair,slatPanel,pendant } = A;

  const DX = -9.55;                      // west-side consultation gallery
  const NUM = 3;
  const span = 3.0;
  const z0 = -(NUM-1)*span/2;

  for(let i=0;i<NUM;i++) {
    const z = z0 + i*span, label=['开户','办卡','理财'][i];
    slatPanel(DX-1.72,z,2.22,2.24,Math.PI/2,'开户',i===1?col.redD:col.woodD);
    desk(DX,z,1.66,.74,'开户',-Math.PI/2,col.wood);
    A.screen(DX-.28,1.08,z-.25,Math.PI/2,.42,.28,label,'开户');
    box(DX-.08,.84,z+.30,.20,.055,.18,col.inkL,
      {round:.025,hard:true,gloss:.26,tag:'开户'});
    box(DX+.16,.84,z+.30,.16,.025,.12,col.paper,{hard:true,mode:7,tag:'开户'});
    chair(DX+1.34,z,-Math.PI/2,'椅子',i===2?col.fabricL:col.fabric);
    chair(DX-.80,z,Math.PI/2,'职员椅',col.fabricD);
    doorPlate(DX-1.62,2.00,z,Math.PI/2,label,'开户',i===1?col.red:col.navy);
    pendant(DX-.15,z,.16,'开户灯');
  }

  sign(DX-1.72,2.82,z0+span,Math.PI/2,'个人业务 · PERSONAL',col.red,'开户',.145);

  thing('开户', DX+.34, 1.20, z0, '我要开户。',
    'I want to open an account.',
    '开户 to open an account. 账户 is an account.',
    {tag:'开户',focus:[DX+1.72,z0],reach:1.9});
  thing('身份证', DX+.20, 1.00, z0, '请出示身份证。',
    'Please show your ID card.',
    '身份证 ID card. 出示 to show/present.',
    {tag:'开户',focus:[DX+1.65,z0],reach:1.8});
  const cardDesk=thing('卡', DX+.34, 1.10, z0+span, '这里办理银行卡业务。',
    'Bank-card services are handled here.',
    '银行卡 bank card. 办卡 to apply for a card.',
    {tag:'开户',focus:[DX+1.72,z0+span],reach:1.9});
  cardDesk.bankUse='cardDesk';
  thing('理财', DX+.34, 1.10, z0+span*2, '先了解风险，再选择理财产品。',
    'Understand the risk before choosing an investment product.',
    '理财产品 wealth-management product. 风险 risk.',
    {tag:'开户',focus:[DX+1.72,z0+span*2],reach:1.9});
};
