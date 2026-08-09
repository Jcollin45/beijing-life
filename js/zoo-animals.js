// Animal profiles added by the zoo expansion. They deliberately extend the shared procedural rig
// instead of placing static animal-shaped props in the scene: outdoor animals keep the same gait,
// LOD, schedule, gaze and action contract as the original seven species.
const ZooAnimals = (() => {
  const quad = (base, patch) => ({ ...ANIMALS[base], ...patch, plan:'quad' });
  const bird = patch => ({ ...ANIMALS.peacock, ...patch, plan:'upright', fan:0, crest:false });
  const ape = patch => ({ ...ANIMALS.monkey, ...patch, plan:'ape' });

  const profiles = {
    otter: quad('tiger', {
      hip:.23, sho:.25, len:.54, barrel:[.25,.25,.67], legU:.13, legL:.10, legW:.065,
      neck:.15, neckRise:.02, head:[.18,.16,.21], muzzle:[.11,.075,.13], ear:'round', earR:.045,
      tail:.48, tailDroop:.18, stripes:0, ruff:.16, swing:.38, flex:.72, step:.34,
      coat:'#76533a', dark:'#493326', foot:'#3e2d24', eye:'#17110e', belly:'#b18a66', muz:'#a87855'
    }),
    hippo: quad('elephant', {
      hip:.74, sho:.78, len:1.18, barrel:[1.02,.88,1.42], legU:.40, legL:.32, legW:.29,
      neck:.20, neckRise:.02, head:[.62,.52,.70], muzzle:[.48,.32,.48], ear:'round', earR:.075,
      tail:.24, tailDroop:.38, trunk:0, tusk:0, columns:true, swing:.15, flex:.16, step:.72,
      coat:'#7c6b69', dark:'#514746', foot:'#665957', eye:'#241d1c', belly:'#8d7772', muz:'#9b7e78'
    }),
    flamingo: bird({
      hip:.82, body:[.20,.34,.22], head:[.085,.09,.10], neck:.62, beak:.16,
      legU:.44, legL:.38, legW:.025, flipper:.30, roll:.10, step:.42,
      coat:'#df7d88', dark:'#7c3f4c', foot:'#7f5c62', eye:'#171214', belly:'#ef9da4', muz:'#252126', bib:'#f0a3a7'
    }),
    crane: bird({
      hip:.92, body:[.24,.42,.26], head:[.09,.10,.10], neck:.76, beak:.17,
      legU:.49, legL:.42, legW:.027, flipper:.40, roll:.08, step:.48, crest:true,
      coat:'#deddd8', dark:'#252a2f', foot:'#4c4947', eye:'#171312', belly:'#f0eee7', muz:'#b49963', bib:'#a63731'
    }),
    takin: quad('giraffe', {
      hip:.88, sho:.96, len:.92, barrel:[.72,.80,1.12], legU:.48, legL:.40, legW:.18,
      neck:.40, neckRise:.22, head:[.30,.31,.39], muzzle:[.21,.17,.22], ear:'leaf', earR:.13,
      horns:true, patches:0, mane:true, tail:.32, tailDroop:.48, swing:.27, flex:.38, step:.64,
      coat:'#a48c62', dark:'#4a4031', foot:'#342f28', eye:'#201813', belly:'#b9a27a', muz:'#78684e'
    }),
    snowLeopard: quad('tiger', {
      hip:.53, sho:.56, len:.78, barrel:[.39,.43,.88], legU:.30, legL:.25, legW:.12,
      neck:.23, neckRise:.05, head:[.27,.25,.31], muzzle:[.17,.13,.18], ear:'round', earR:.09,
      tail:.96, tailDroop:.56, stripes:11, ruff:.34, coat:'#c4c0b6', dark:'#54565b',
      foot:'#ada99f', eye:'#7d8b70', belly:'#dfdcd4', muz:'#e2ded5'
    }),
    redPanda: quad('panda', {
      hip:.30, sho:.32, len:.46, barrel:[.35,.34,.58], legU:.17, legL:.14, legW:.09,
      neck:.16, neckRise:.18, head:[.23,.21,.23], muzzle:[.13,.09,.13], ear:'round', earR:.085,
      tail:.62, tailDroop:.34, tailRings:7, ruff:.42, coat:'#a84e2f', dark:'#302523',
      legs:'#302523', foot:'#211b1a', eye:'#151110', belly:'#5e332b', muz:'#e6d8c8'
    }),
    swan: bird({
      hip:.35, body:[.34,.46,.48], head:[.10,.11,.12], neck:.70, beak:.16,
      legU:.18, legL:.14, legW:.04, flipper:.48, roll:.08, step:.32,
      coat:'#e7e5dc', dark:'#292d31', foot:'#4d4540', eye:'#15120f', belly:'#f3f1e9', muz:'#d8842d', bib:'#ece9df'
    }),
    mandarinDuck: bird({
      hip:.23, body:[.24,.31,.34], head:[.105,.11,.12], neck:.20, beak:.105,
      legU:.12, legL:.09, legW:.035, flipper:.31, roll:.12, step:.27, crest:true,
      coat:'#99633d', dark:'#283b38', foot:'#b26743', eye:'#15110e', belly:'#d8c69a', muz:'#b83f2e', bib:'#285a56'
    }),
    goat: quad('giraffe', {
      hip:.58, sho:.64, len:.64, barrel:[.46,.53,.78], legU:.33, legL:.28, legW:.10,
      neck:.34, neckRise:.25, head:[.23,.22,.31], muzzle:[.16,.12,.18], ear:'leaf', earR:.13,
      horns:true, patches:0, mane:false, tail:.16, tailDroop:-.20, swing:.31, flex:.48, step:.48,
      coat:'#d8d0bb', dark:'#685f50', foot:'#38352f', eye:'#201813', belly:'#e8e1d2', muz:'#b9aa91'
    }),
    rabbit: quad('panda', {
      hip:.22, sho:.23, len:.34, barrel:[.29,.31,.42], legU:.18, legL:.15, legW:.075,
      neck:.10, neckRise:.28, head:[.19,.20,.19], muzzle:[.10,.075,.10], ear:'leaf', earR:.25,
      tail:.10, tailDroop:-.65, ruff:.38, swing:.38, flex:.74, step:.31,
      coat:'#b5a58f', dark:'#6c6052', foot:'#8c7e6c', eye:'#211815', belly:'#d9d0c1', muz:'#d0c4b2'
    }),
    goldenMonkey: ape({
      hip:.36, sho:.34, len:.39, barrel:[.27,.31,.43], legU:.19, legL:.16, legW:.078,
      neck:.09, neckRise:.32, head:[.19,.18,.19], muzzle:[.105,.078,.105], ear:'round', earR:.05,
      tail:.72, tailDroop:-.95, face:'#7189a0', ruff:.52, coat:'#c9913f', dark:'#684824',
      foot:'#483321', eye:'#18120d', belly:'#deb56f', muz:'#7791aa'
    }),
    zebra: quad('giraffe', {
      hip:1.24, sho:1.36, len:1.02, barrel:[.64,.78,1.20], legU:.70, legL:.58, legW:.15,
      neck:.72, neckRise:.58, head:[.27,.29,.43], muzzle:[.19,.15,.24], ear:'leaf', earR:.17,
      horns:false, patches:0, stripes:15, mane:true, tail:.52, tailDroop:.78,
      coat:'#e2ddd0', dark:'#29282a', foot:'#28272a', eye:'#171311', belly:'#efebe1', muz:'#b9b1a3'
    }),
    antelope: quad('giraffe', {
      hip:.93, sho:1.02, len:.82, barrel:[.47,.60,.92], legU:.52, legL:.43, legW:.10,
      neck:.55, neckRise:.54, head:[.22,.23,.34], muzzle:[.15,.11,.18], ear:'leaf', earR:.14,
      horns:true, patches:0, mane:false, tail:.22, tailDroop:.35, swing:.34, flex:.45, step:.68,
      coat:'#b7864f', dark:'#4e3929', foot:'#2d2924', eye:'#1b1510', belly:'#e0c597', muz:'#caa775'
    }),
    rhino: quad('elephant', {
      hip:1.18, sho:1.28, len:1.38, barrel:[1.05,1.18,1.58], legU:.62, legL:.50, legW:.34,
      neck:.32, neckRise:.10, head:[.66,.58,.80], muzzle:[.48,.30,.48], ear:'leaf', earR:.11,
      tail:.48, tailDroop:.72, trunk:0, tusk:.42, columns:true, folds:true, swing:.16, flex:.18, step:.86,
      coat:'#89877f', dark:'#66645e', foot:'#73716a', eye:'#2a241f', belly:'#939188', muz:'#85837b'
    }),
    lion: quad('tiger', {
      hip:.72, sho:.78, len:.92, barrel:[.50,.57,1.04], legU:.39, legL:.32, legW:.14,
      neck:.31, neckRise:.10, head:[.34,.32,.38], muzzle:[.21,.16,.22], ear:'round', earR:.095,
      tail:.86, tailDroop:.82, stripes:0, mane:true, ruff:.72, swing:.32, flex:.56, step:.72,
      coat:'#b68a4f', dark:'#65462c', foot:'#98713f', eye:'#7b6a2e', belly:'#d4b47e', muz:'#d7bd8e'
    }),
  };

  const speciesProfile = Object.freeze({
    '水獭':'otter', '河马':'hippo', '火烈鸟':'flamingo', '丹顶鹤':'crane', '羚牛':'takin',
    '雪豹':'snowLeopard', '小熊猫':'redPanda', '天鹅':'swan', '鸳鸯':'mandarinDuck',
    '山羊':'goat', '兔子':'rabbit', '金丝猴':'goldenMonkey', '亚洲象':'elephant',
    '斑马':'zebra', '羚羊':'antelope', '长颈鹿':'giraffe', '犀牛':'rhino', '狮子':'lion'
  });

  Object.assign(ANIMALS, profiles);
  return Object.freeze({ profiles:Object.freeze(profiles), speciesProfile });
})();
