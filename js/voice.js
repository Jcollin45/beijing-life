// 嗓子 — a voice you build rather than a voice you copy.
//
// This is a source-filter synthesiser for Mandarin. There is no recording anywhere in it: a voice
// here is about fifteen numbers, and every one of them is something you can hear. A glottal source
// makes the buzz, a bank of resonators makes it a vowel, a noise branch makes the consonants, and
// an F0 contour over each syllable makes the tone. Change the numbers and you have a different
// person — which is the whole point, and the reason this exists rather than a voice clone: nobody's
// likeness is in here to take.
//
// The model, in the order the sound travels:
//
//   glottal wave ──tilt──┐
//   breath noise ────────┼──▶ F1 F2 F3 F4 (+nasal) ──▶ mix ──▶ out
//   frication ───────────────────────── bandpass ────▶ mix
//
// Everything is planned in JS first as a list of 5 ms frames, then handed to WebAudio as one
// `setValueCurveAtTime` per parameter. That keeps the graph tiny — one oscillator, two noise
// sources, five filters — however long the utterance is, and it means the studio can draw exactly
// what it is about to hear.
const Voice = (() => {
  const STEP = 0.005;                     // seconds per planned frame

  // ---------------------------------------------------------------- what a voice is
  // These are the dials. Everything else in the file is fixed phonetics; this is the person.
  const DEFAULT = {
    f0:      196,   // the pitch you speak at, in Hz — the single biggest thing about a voice
    range:   1.0,   // how far the tones swing. Flat and clipped, or sing-song
    tract:   1.0,   // vocal tract length, as a divisor on every formant. Small = short = child
    tilt:    0.5,   // how bright the glottal buzz is before the mouth gets to it
    breath:  0.18,  // aspiration mixed in with the voicing — a whisper in the tone
    rough:   0.25,  // cycle-to-cycle wobble. A little is alive, a lot is old or tired
    creak:   0.35,  // extra wobble at the bottom of a third tone, which is where Mandarin creaks
    vibRate: 5.0,   // vibrato, which speech has very little of and singing has a lot
    vibDepth: 0.10,
    rate:    1.0,   // syllables per second, as a multiplier
    decline: 1.4,   // semitones the pitch drifts down over an utterance
    nasal:   0.30,  // how much of the nose is coupled in on m, n and ng
    press:   0.35,  // how hard the voice is pushed: raises the second formant's share
    gain:    0.85,
    dF:      [0, 0, 0, 0],   // per-formant nudges in percent, for the last 5% of a face
  };

  // ---------------------------------------------------------------- vowels
  // Formant targets in Hz for a reference adult woman, F1..F4, then divided by `tract`. These are
  // the ordinary published values for Mandarin monophthongs, rounded, and they are the reason a
  // vowel sounds like that vowel and not a different one.
  const V = {
    a:  [820, 1250, 2750, 3600],
    A:  [750, 1050, 2600, 3500],   // the backed a before -ng
    o:  [500,  800, 2650, 3400],
    E:  [500, 1300, 2550, 3400],   // e on its own — the ɤ of 的
    e:  [620, 1900, 2700, 3500],   // e in ie, üe
    y:  [480, 2100, 2800, 3550],   // the i-ward end of ei and ai
    i:  [300, 2350, 3050, 3700],
    // The two apical vowels, which are not the same vowel and were nearly the same numbers. What
    // separates them is the third formant: retroflexion drags F3 down towards F2 and that pairing
    // is the whole sound of it, while the vowel after z c s keeps an ordinary F3. Written with only
    // 150 Hz between their F3s, 是 and 四 were the same vowel with a different consonant on it.
    r:  [360, 1450, 2000, 3200],   // the i of zhi chi shi ri — retroflex, F3 down on top of F2
    z:  [350, 1600, 2600, 3400],   // the i of zi ci si — apical, F3 where it usually is
    u:  [330,  700, 2450, 3300],
    v:  [300, 1950, 2400, 3300],   // ü
    R:  [520, 1350, 1750, 3300],   // er — the low third formant is the whole of the rhotic
    s:  [500, 1450, 2500, 3400],   // the schwa of en, eng
    N:  [300, 1100, 2300, 3200],   // -n
    G:  [350,  900, 2300, 3200],   // -ng
    M:  [300,  900, 2200, 3100],   // m
  };
  // Bandwidths, which decide whether a resonance rings or just colours. Widened by breathiness.
  const BW = [70, 105, 150, 220];

  // ---------------------------------------------------------------- finals
  // Each final is a path through the vowel space: [key, when] with `when` a fraction of the voiced
  // part. Two entries is a monophthong held; three is a diphthong or a nasal coda.
  const FINALS = {
    a:    [['a', 0], ['a', 1]],
    o:    [['o', 0], ['o', 1]],
    e:    [['E', 0], ['E', 1]],
    ai:   [['a', 0], ['y', 1]],
    ei:   [['y', 0], ['i', 1]],
    ao:   [['a', 0], ['u', 1]],
    ou:   [['o', 0], ['u', 1]],
    an:   [['a', 0], ['a', .55], ['N', 1]],
    en:   [['s', 0], ['s', .50], ['N', 1]],
    ang:  [['A', 0], ['A', .55], ['G', 1]],
    eng:  [['s', 0], ['s', .50], ['G', 1]],
    ong:  [['o', 0], ['o', .45], ['G', 1]],
    er:   [['R', 0], ['R', 1]],
    i:    [['i', 0], ['i', 1]],
    ia:   [['i', 0], ['a', .38], ['a', 1]],
    ie:   [['i', 0], ['e', .40], ['e', 1]],
    iao:  [['i', 0], ['a', .42], ['u', 1]],
    iou:  [['i', 0], ['o', .45], ['u', 1]],
    ian:  [['i', 0], ['e', .40], ['N', 1]],
    in:   [['i', 0], ['i', .50], ['N', 1]],
    iang: [['i', 0], ['A', .42], ['G', 1]],
    ing:  [['i', 0], ['i', .50], ['G', 1]],
    iong: [['v', 0], ['o', .45], ['G', 1]],
    u:    [['u', 0], ['u', 1]],
    ua:   [['u', 0], ['a', .38], ['a', 1]],
    uo:   [['u', 0], ['o', .40], ['o', 1]],
    uai:  [['u', 0], ['a', .42], ['y', 1]],
    uei:  [['u', 0], ['y', .42], ['i', 1]],
    uan:  [['u', 0], ['a', .42], ['N', 1]],
    uen:  [['u', 0], ['s', .45], ['N', 1]],
    uang: [['u', 0], ['A', .42], ['G', 1]],
    ueng: [['u', 0], ['s', .45], ['G', 1]],
    v:    [['v', 0], ['v', 1]],
    ve:   [['v', 0], ['e', .40], ['e', 1]],
    van:  [['v', 0], ['e', .40], ['N', 1]],
    vn:   [['v', 0], ['v', .50], ['N', 1]],
    zi:   [['z', 0], ['z', 1]],
    ri:   [['r', 0], ['r', 1]],
  };

  // ---------------------------------------------------------------- initials
  // `locus` is where the second formant is pointing at the moment the consonant lets go, which is
  // most of what tells b from d from g. `nf`/`nq` are the noise band of a fricative, which is most
  // of what tells s from sh from x.
  const INITIALS = {
    '':   { type: 'none' },
    b:  { type: 'stop', locus: [380,  900], asp: 0 },
    p:  { type: 'stop', locus: [380,  900], asp: 1 },
    m:  { type: 'nasal', locus: [300, 900] },
    f:  { type: 'fric', nf: 2400, nq: 1.0, amp: .26 },
    d:  { type: 'stop', locus: [340, 1750], asp: 0 },
    t:  { type: 'stop', locus: [340, 1750], asp: 1 },
    n:  { type: 'nasal', locus: [300, 1400] },
    l:  { type: 'lat', locus: [340, 1080, 2650] },
    g:  { type: 'stop', locus: [300, 2000], asp: 0 },
    k:  { type: 'stop', locus: [300, 2000], asp: 1 },
    // `back` marks a fricative made behind the mouth rather than at the front of it, so its noise
    // is filtered by the tract instead of by one bandpass. Mandarin h is [x], at the velum.
    h:  { type: 'fric', nf: 1350, nq: .65, amp: .22, back: 1 },
    j:  { type: 'affr', nf: 4600, nq: 2.6, amp: .32, asp: 0 },
    q:  { type: 'affr', nf: 4600, nq: 2.6, amp: .32, asp: 1 },
    x:  { type: 'fric', nf: 4600, nq: 2.6, amp: .30 },
    zh: { type: 'affr', nf: 3000, nq: 1.9, amp: .33, asp: 0 },
    ch: { type: 'affr', nf: 3000, nq: 1.9, amp: .33, asp: 1 },
    sh: { type: 'fric', nf: 3000, nq: 1.9, amp: .31 },
    r:  { type: 'appr', locus: [360, 1400, 1700] },
    z:  { type: 'affr', nf: 6300, nq: 3.2, amp: .28, asp: 0 },
    c:  { type: 'affr', nf: 6300, nq: 3.2, amp: .28, asp: 1 },
    s:  { type: 'fric', nf: 6300, nq: 3.2, amp: .27 },
  };
  const INI_KEYS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
                    'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

  // ---------------------------------------------------------------- tones
  // Semitones away from the speaker's own pitch, across the voiced part of the syllable. This is
  // the one table that makes the output Mandarin rather than a language-shaped noise.
  const TONES = {
    1: [[0, 4.2], [1, 3.8]],                          // 阴平 — held high
    2: [[0, -1.0], [.32, -1.8], [1, 5.2]],            // 阳平 — dips, then climbs
    3: [[0, .2], [.38, -4.6], [.68, -4.2], [1, 1.4]], // 上声 — the low creaky one
    4: [[0, 5.6], [1, -4.6]],                         // 去声 — falls off a cliff
    5: [[0, 1.0], [1, -.6]],                          // 轻声 — short, and barely moves
  };

  // ---------------------------------------------------------------- pinyin
  // Written pinyin has three ways of saying the same syllable — tone marks, trailing digits, or
  // neither — and several spellings that exist only to avoid apostrophes. Both get normalised
  // here so the tables above can stay phonetic.
  const MARKS = {
    'ā':'a1','á':'a2','ǎ':'a3','à':'a4','a':'a',
    'ē':'e1','é':'e2','ě':'e3','è':'e4',
    'ī':'i1','í':'i2','ǐ':'i3','ì':'i4',
    'ō':'o1','ó':'o2','ǒ':'o3','ò':'o4',
    'ū':'u1','ú':'u2','ǔ':'u3','ù':'u4',
    'ǖ':'v1','ǘ':'v2','ǚ':'v3','ǜ':'v4','ü':'v',
    'ń':'n2','ň':'n3','ǹ':'n4','ḿ':'m2',
  };
  // Letters out, and a note of which letter each tone was written on. The position matters: a word
  // like zhōngguó carries two tones, and knowing that the first is on the ō and the second on the
  // ó is the only way to give each syllable the right one.
  function normalise(word) {
    let out = '';
    const tones = [];
    for (const ch of String(word).toLowerCase()) {
      const m = MARKS[ch];
      if (m) {
        if (m.length > 1) tones[out.length] = +m[1];
        out += m[0];
        continue;
      }
      if (ch >= '0' && ch <= '5') { tones[Math.max(0, out.length - 1)] = +ch; continue; }
      if (ch >= 'a' && ch <= 'z') out += ch;
    }
    return { letters: out, tones };
  }
  // Kept for the studio's readout and for anything that only wants one syllable.
  function stripMarks(word) {
    const { letters, tones } = normalise(word);
    return { syl: letters, tone: tones.find(t => t) || 5 };
  }
  // The spelling rules, undone: y and w are the glides i and u, ju/qu/xu is really jü, and iu/ui/un
  // are contractions of iou/uei/uen.
  // The spelling, undone. Returns null for anything that is not a syllable, which is what lets the
  // segmenter below take the longest run of letters that actually is one.
  function readSyllable(syl) {
    if (!syl) return null;
    let ini = '';
    for (const k of INI_KEYS) if (syl.startsWith(k)) { ini = k; break; }
    let fin = syl.slice(ini.length);
    if (!fin) return null;
    if (ini === 'y') {
      ini = '';
      fin = fin === 'i' ? 'i' : fin === 'u' ? 'v' : fin === 'in' ? 'in' : fin === 'ing' ? 'ing'
        : fin[0] === 'u' ? 'v' + fin.slice(1) : 'i' + fin;
      if (fin === 'ii') fin = 'i';
    } else if (ini === 'w') {
      ini = '';
      fin = fin === 'u' ? 'u' : 'u' + fin;
      if (fin === 'uu') fin = 'u';
    } else if ('jqx'.includes(ini) && fin[0] === 'u') {
      fin = 'v' + fin.slice(1);
    }
    if (fin === 'iu') fin = 'iou';
    if (fin === 'ui') fin = 'uei';
    if (fin === 'un') fin = 'jqx'.includes(ini) ? 'vn' : 'uen';
    if (fin === 'ue') fin = 've';
    if (fin === 'i') {
      if (['zh', 'ch', 'sh', 'r'].includes(ini)) fin = 'ri';
      else if (['z', 'c', 's'].includes(ini)) fin = 'zi';
    }
    // A retroflex or sibilant initial cannot take a front glide: shi is a syllable, siu is not.
    if (!FINALS[fin]) return null;
    return { ini, fin };
  }
  const MAXSYL = 7;
  function splitSyllable(syl) {
    const read = readSyllable(syl);
    if (read) return read;
    let ini = '';
    for (const k of INI_KEYS) if (syl.startsWith(k)) { ini = k; break; }
    let fin = syl.slice(ini.length);
    if (ini === 'y') {
      ini = '';
      fin = fin === 'i' ? 'i' : fin === 'u' ? 'v' : fin === 'in' ? 'in' : fin === 'ing' ? 'ing'
        : fin.startsWith('u') ? 'v' + fin.slice(1) : 'i' + fin;
      if (fin === 'ii') fin = 'i';
    } else if (ini === 'w') {
      ini = '';
      fin = fin === 'u' ? 'u' : 'u' + fin;
      if (fin === 'uu') fin = 'u';
    } else if ('jqx'.includes(ini) && fin[0] === 'u') {
      fin = 'v' + fin.slice(1);
    }
    if (fin === 'iu') fin = 'iou';
    if (fin === 'ui') fin = 'uei';
    if (fin === 'un') fin = ini && 'jqxy'.includes(ini) ? 'vn' : 'uen';
    if (fin === 'ue') fin = 've';
    if (fin === 'i') {
      if (['zh', 'ch', 'sh', 'r'].includes(ini)) fin = 'ri';
      else if (['z', 'c', 's'].includes(ini)) fin = 'zi';
    }
    if (!FINALS[fin]) fin = FINALS[fin.replace(/^[iuv]/, '')] ? fin.replace(/^[iuv]/, '') : 'a';
    return { ini, fin };
  }
  // ---------------------------------------------------------------- the characters between the words
  // A vocabulary list is made of things you can point at. Dialogue is mostly the other kind of
  // word — 这 那 是 的 了 吗 — and none of those are objects in a room, so none of them are in it.
  // Without a reading for them a spoken line comes out with holes in it: 这儿 read as two shrugs.
  //
  // So: the function words, the pronouns, the numbers, the common verbs. Whatever dictionary the
  // caller hands in still wins — this is only the floor. Characters with two readings are given
  // the one that turns up in speech, and 不 and 一 are left unsandhied because tone sandhi is a
  // sentence-level thing and this table is not the place to pretend otherwise.
  // The list was not guessed. `.voicegaps.js` counts every Chinese character in the source and says
  // which ones have no reading; this is that report, filled in, and running it again should come
  // back close to empty. Characters with two readings get the one that turns up in speech, and 不
  // and 一 are left unsandhied — tone sandhi is a sentence-level rule and does not belong in a
  // per-character table.
  const HAN = {
    // pronouns, particles, and the small words a sentence is mortared with
    我:'wǒ', 你:'nǐ', 您:'nín', 他:'tā', 她:'tā', 它:'tā', 们:'men', 谁:'shéi', 自:'zì', 己:'jǐ',
    这:'zhè', 那:'nà', 哪:'nǎ', 儿:'er', 个:'gè', 些:'xiē', 的:'de', 地:'de', 得:'de', 着:'zhe',
    是:'shì', 不:'bù', 没:'méi', 有:'yǒu', 在:'zài', 了:'le', 过:'guò', 已:'yǐ', 被:'bèi',
    吗:'ma', 呢:'ne', 吧:'ba', 啊:'a', 呀:'ya', 嗯:'en', 哦:'ó', 喂:'wèi', 咚:'dōng',
    什:'shén', 么:'me', 怎:'zěn', 样:'yàng', 为:'wèi', 因:'yīn', 所:'suǒ', 以:'yǐ', 而:'ér',
    和:'hé', 跟:'gēn', 就:'jiù', 也:'yě', 都:'dōu', 还:'hái', 再:'zài', 又:'yòu', 每:'měi',
    // how much, how many, how often
    一:'yī', 二:'èr', 两:'liǎng', 三:'sān', 四:'sì', 五:'wǔ', 六:'liù', 七:'qī', 八:'bā',
    九:'jiǔ', 十:'shí', 百:'bǎi', 千:'qiān', 万:'wàn', 零:'líng', 半:'bàn', 第:'dì', 粒:'lì',
    块:'kuài', 毛:'máo', 分:'fēn', 元:'yuán', 张:'zhāng', 位:'wèi', 次:'cì', 点:'diǎn',
    份:'fèn', 只:'zhī', 双:'shuāng', 件:'jiàn', 台:'tái', 类:'lèi', 免:'miǎn',
    // what things are like
    好:'hǎo', 坏:'huài', 大:'dà', 小:'xiǎo', 多:'duō', 少:'shǎo', 快:'kuài', 慢:'màn',
    新:'xīn', 旧:'jiù', 长:'cháng', 短:'duǎn', 高:'gāo', 低:'dī', 早:'zǎo', 晚:'wǎn',
    很:'hěn', 太:'tài', 真:'zhēn', 更:'gèng', 最:'zuì', 挺:'tǐng', 比:'bǐ', 常:'cháng',
    宜:'yí', 便:'biàn', 脆:'cuì', 舒:'shū', 重:'zhòng', 轻:'qīng', 极:'jí', 特:'tè',
    青:'qīng', 白:'bái', 平:'píng', 难:'nán', 迟:'chí', 幸:'xìng', 味:'wèi',
    // what people do
    要:'yào', 会:'huì', 能:'néng', 可:'kě', 想:'xiǎng', 该:'gāi', 必:'bì', 让:'ràng',
    说:'shuō', 讲:'jiǎng', 问:'wèn', 答:'dá', 听:'tīng', 看:'kàn', 见:'jiàn', 懂:'dǒng',
    来:'lái', 去:'qù', 到:'dào', 回:'huí', 走:'zǒu', 进:'jìn', 出:'chū', 返:'fǎn',
    给:'gěi', 把:'bǎ', 从:'cóng', 对:'duì', 用:'yòng', 推:'tuī', 抓:'zhuā', 扫:'sǎo',
    请:'qǐng', 谢:'xiè', 客:'kè', 气:'qì', 起:'qǐ', 麻:'má', 烦:'fán', 恭:'gōng',
    吃:'chī', 喝:'hē', 买:'mǎi', 卖:'mài', 找:'zhǎo', 等:'děng', 坐:'zuò', 站:'zhàn',
    开:'kāi', 关:'guān', 拿:'ná', 放:'fàng', 做:'zuò', 干:'gàn', 学:'xué', 教:'jiāo',
    知:'zhī', 道:'dào', 认:'rèn', 识:'shí', 觉:'jué', 喜:'xǐ', 欢:'huān', 活:'huó',
    行:'xíng', 成:'chéng', 完:'wán', 结:'jié', 始:'shǐ', 帮:'bāng', 检:'jiǎn', 值:'zhí',
    洗:'xǐ', 刷:'shuā', 打:'dǎ', 收:'shōu', 售:'shòu', 交:'jiāo', 换:'huàn', 倒:'dào',
    调:'tiáo', 跳:'tiào', 查:'chá', 记:'jì', 复:'fù', 习:'xí', 计:'jì', 划:'huà',
    止:'zhǐ', 吸:'xī', 禁:'jìn', 防:'fáng', 化:'huà', 传:'chuán', 领:'lǐng', 顾:'gù',
    // people
    人:'rén', 师:'shī', 傅:'fu', 姐:'jiě', 哥:'gē', 弟:'dì', 妹:'mèi', 爸:'bà', 妈:'mā',
    爷:'yé', 员:'yuán', 板:'bǎn', 同:'tóng', 友:'yǒu', 生:'shēng', 先:'xiān', 王:'wáng',
    陈:'chén', 服:'fú', 务:'wù', 子:'zi', 头:'tóu', 手:'shǒu', 口:'kǒu', 心:'xīn',
    体:'tǐ', 汗:'hàn',
    // when
    事:'shì', 天:'tiān', 年:'nián', 月:'yuè', 日:'rì', 号:'hào', 时:'shí', 候:'hòu',
    现:'xiàn', 今:'jīn', 明:'míng', 昨:'zuó', 班:'bān', 延:'yán', 误:'wù',
    // where, and what is in it
    门:'mén', 车:'chē', 路:'lù', 家:'jiā', 店:'diàn', 房:'fáng', 间:'jiān', 室:'shì',
    上:'shàng', 下:'xià', 里:'lǐ', 外:'wài', 前:'qián', 后:'hòu', 左:'zuǒ', 右:'yòu',
    边:'biān', 面:'miàn', 中:'zhōng', 国:'guó', 北:'běi', 京:'jīng', 城:'chéng', 区:'qū',
    公:'gōng', 园:'yuán', 铁:'tiě', 场:'chǎng', 市:'shì', 超:'chāo', 馆:'guǎn', 堂:'táng',
    火:'huǒ', 飞:'fēi', 机:'jī', 线:'xiàn', 图:'tú', 台:'tái', 亭:'tíng', 街:'jiē',
    胡:'hú', 柳:'liǔ', 海:'hǎi', 州:'zhōu', 华:'huá', 福:'fú', 联:'lián', 媒:'méi',
    纽:'niǔ', 约:'yuē', 曼:'màn', 谷:'gǔ', 汉:'hàn', 码:'mǎ', 砖:'zhuān', 风:'fēng',
    雨:'yǔ', 声:'shēng', 烟:'yān', 幕:'mù', 目:'mù', 状:'zhuàng', 态:'tài', 续:'xù',
    // things
    桌:'zhuō', 椅:'yǐ', 柜:'guì', 冰:'bīng', 箱:'xiāng', 厨:'chú', 池:'chí', 桶:'tǒng',
    餐:'cān', 菜:'cài', 饭:'fàn', 食:'shí', 袋:'dài', 窗:'chuāng', 座:'zuò', 篮:'lán',
    电:'diàn', 空:'kōng', 架:'jià', 物:'wù', 银:'yín', 息:'xī', 钱:'qián', 票:'piào',
    卡:'kǎ', 单:'dān', 安:'ān', 马:'mǎ', 衣:'yī', 球:'qiú', 词:'cí', 本:'běn',
    财:'cái',
    // ---- the tail of the report. Mostly signage, food and one-off lines, and mostly characters
    // that already appear inside a vocabulary word — but a character only readable as part of a
    // word is unreadable the moment somebody says it on its own, and a voice that stumbles once a
    // paragraph is a voice you stop trusting.
    周:'zhōu', 念:'niàn', 步:'bù', 证:'zhèng', 靠:'kào', 午:'wǔ', 热:'rè', 金:'jīn',
    掌:'zhǎng', 握:'wò', 纸:'zhǐ', 盘:'pán', 赢:'yíng', 页:'yè', 南:'nán', 扒:'pá',
    足:'zú', 迎:'yíng', 荫:'yīn', 斤:'jīn', 增:'zēng', 色:'sè', 入:'rù', 意:'yì',
    卫:'wèi', 降:'jiàng', 落:'luò', 牌:'pái', 首:'shǒu', 内:'nèi', 厚:'hòu', 德:'dé',
    博:'bó', 节:'jié', 腐:'fǔ', 烧:'shāo', 筋:'jīn', 香:'xiāng', 解:'jiě', 决:'jué',
    顿:'dùn', 胃:'wèi', 蒜:'suàn', 散:'sàn', 底:'dǐ', 镇:'zhèn', 甜:'tián', 直:'zhí',
    摊:'tān', 主:'zhǔ', 刚:'gāng', 搬:'bān', 排:'pái', 队:'duì', 卧:'wò', 许:'xǔ',
    廊:'láng', 祝:'zhù', 旅:'lǚ', 途:'tú', 愉:'yú', 星:'xīng', 继:'jì', 之:'zhī',
    赵:'zhào', 死:'sǐ', 林:'lín', 算:'suàn', 鲜:'xiān', 评:'píng', 汇:'huì', 确:'què',
    定:'dìng', 画:'huà', 质:'zhì', 提:'tí', 示:'shì', 拼:'pīn', 需:'xū', 稍:'shāo',
    淋:'lín', 肉:'ròu', 浴:'yù', 航:'háng', 牛:'niú', 方:'fāng', 包:'bāo', 信:'xìn',
    屏:'píng', 文:'wén', 告:'gào', 通:'tōng', 音:'yīn', 沙:'shā', 视:'shì', 部:'bù',
    杨:'yáng', 司:'sī', 垃:'lā', 圾:'jī', 石:'shí', 东:'dōng', 递:'dì', 正:'zhèng',
    布:'bù', 植:'zhí', 话:'huà', 李:'lǐ', 登:'dēng', 豆:'dòu', 西:'xī', 乘:'chéng',
    身:'shēn', 印:'yìn', 果:'guǒ', 户:'hù', 经:'jīng', 牙:'yá', 脑:'nǎo', 议:'yì',
    咖:'kā', 啡:'fēi', 办:'bàn', 睡:'shuì', 商:'shāng', 程:'chéng', 帘:'lián', 货:'huò',
    购:'gòu', 闸:'zhá', 背:'bèi', 停:'tíng', 课:'kè', 够:'gòu', 共:'gòng', 动:'dòng',
    充:'chōng', 全:'quán', 价:'jià', 蛋:'dàn', 补:'bǔ', 广:'guǎng', 帮:'bāng',
    // ---- everything the neighbours say. Until speech.js existed a character with no reading
    // behind it cost nothing, because nobody was reading any of it out loud; now it is a blank beat
    // in the middle of somebody's sentence. These were found by planning every line of every NPC
    // and asking which syllables came back unknown, then by clearing out the rest of the backlog
    // .voicegaps.js had been reporting, so that the next line written for anybody is already
    // pronounceable.
    往:'wǎng', 冷:'lěng', 瓶:'píng', 贵:'guì', 带:'dài', 播:'bō', 笔:'bǐ', 抽:'chōu',
    才:'cái', 取:'qǔ', 消:'xiāo', 男:'nán', 女:'nǜ', 趝:'tàng', 厅:'tīng', 总:'zǒng',
    操:'cāo', 翻:'fān', 清:'qīng', 准:'zhǔn', 末:'mò', 达:'dá', 坪:'píng', 插:'chā',
    液:'yè', 雾:'wù', 缭:'liáo', 绥:'rào', 折:'zhé', 向:'xiàng', 刘:'liú', 警:'jǐng',
    官:'guān', 或:'huò', 者:'zhě', 宝:'bǎo', 抬:'tái', 舱:'cāng', 应:'yīng', 饱:'bǎo',
    擦:'cā', 钥:'yào', 匙:'shi', 闻:'wén', 挤:'jǐ', 挑:'tiāo', 论:'lùn', 圈:'quān',
    吹:'chuī', 皱:'zhòu', 浑:'hún', 嫌:'xián', 输:'shū', 招:'zhāo', 遍:'biàn', 楚:'chǔ',
    罐:'guàn', 久:'jiǔ', 叉:'chā', 隔:'gé', 玻:'bō', 璃:'lí', 响:'xiǎng', 根:'gēn',
    辆:'liàng', 阶:'jiē', 晃:'huàng', 稳:'wěn', 然:'rán', 按:'àn', 扣:'kòu', 滴:'dī',
    截:'jié', 挂:'guà', 及:'jí', 远:'yuǎn', 隙:'xì', 嗓:'sǎng', 哑:'yǎ', 剩:'shèng',
    赶:'gǎn', 煎:'jiān', 饼:'bǐng', 资:'zī',
    // the photographer by the lake and the old lady with the sunflower seeds, who arrived after the
    // last sweep of this table
    照:'zhào', 挡:'dǎng', 笑:'xiào', 亮:'liàng', 田:'tián', 趁:'chèn',
    // and the ones that only ever had a reading as part of a longer word, which held up until
    // somebody said one of them on its own
    处:'chù', 税:'shuì', 托:'tuō', 运:'yùn', 利:'lì', 询:'xún', 助:'zhù', 饮:'yǐn',
    静:'jìng', 凉:'liáng', 棋:'qí', 勤:'qín', 理:'lǐ', 器:'qì', 酒:'jiǔ', 杯:'bēi',
    写:'xiě', 锻:'duàn', 炼:'liàn', 枕:'zhěn', 厕:'cè', 澡:'zǎo', 巾:'jīn', 镜:'jìng',
    休:'xiū', 爱:'ài', 专:'zhuān', 扶:'fú', 闭:'bì', 料:'liào', 费:'fèi', 字:'zì',
    孩:'hái', 加:'jiā', 期:'qī', 报:'bào', 表:'biǎo', 净:'jìng', 余:'yú', 额:'é',
    工:'gōng', 作:'zuò', 健:'jiàn', 材:'cái', 笼:'lóng', 狮:'shī', 肥:'féi', 皂:'zào',
    际:'jì', 鸡:'jī', 酱:'jiàng', 浇:'jiāo', 当:'dāng', 啤:'pí', 酸:'suān', 阿:'ā',
    姨:'yí', 情:'qíng', 格:'gé', 订:'dìng',
  };

  // Text in, syllables out. Chinese is looked up in whatever dictionary you hand it — the game's
  // own vocabulary list does the job — then in the character table above, and anything still
  // unknown is read as pinyin.
  // How long the voice stops at each mark. A comma in an announcement is not a comma in a novel:
  // it is the room being given time to let go of one phrase before the next one starts. Without it
  // the name of the station arrives on top of the tail of 前方到站 and neither is intelligible,
  // which is the whole reason real stations read them slowly and in pieces.
  const PAUSE = { '\uff0c': .20, ',': .20, '\u3001': .14, '\u3002': .30, '.': .30,
                  '\uff01': .30, '!': .30, '\uff1f': .30, '?': .30,
                  '\uff1a': .22, ':': .22, '\uff1b': .24, ';': .24, ' ': .10 };
  const SPLIT = /([\s,\uff0c\u3002\u3001!\uff01?\uff1f:\uff1a;\uff1b\u00b7"'()]+)/;
  function parse(text, dict) {
    const out = [];
    const push = word => {
      const parts = chunk(word);
      for (const part of parts) out.push(part);
      return parts;
    };
    // Split keeping the separators, so the punctuation can be spent as silence instead of thrown
    // away. With a capturing group every odd element of the result is what was between the words.
    const bits = String(text).split(SPLIT);
    for (let b = 0; b < bits.length; b++) {
      const raw = bits[b];
      if (!raw) continue;
      if (b % 2) {
        if (!out.length) continue;
        let hold = 0;
        for (const ch of raw) hold = Math.max(hold, PAUSE[ch] || 0);
        const last = out[out.length - 1];
        last.after = Math.max(last.after || 0, hold);
        continue;
      }
      if (/[\u3400-\u9fff]/.test(raw)) {
        for (const t of segment(raw, dict)) {
          if (t.py) {
            const parts = push(t.py);
            // A word's pinyin comes apart into as many syllables as the word has characters, nearly
            // always. Where it does, each syllable can be told which character it is, which is what
            // lets a check name the word that came out wrong rather than only the line.
            const chars = Array.from(t.hz);
            if (parts.length === chars.length) chars.forEach((ch, k) => { parts[k].hz = ch; });
          }
          // An unknown character still takes a beat. Better a syllable of the wrong colour than a
          // sentence that comes out a word short.
          else for (const ch of t.hz)
            out.push({ ini: '', fin: 'e', tone: 5, py: '?', hz: ch, unknown: ch });
        }
      } else push(raw);
    }
    return sandhi(out);
  }
  // Third tone sandhi. Two third tones in a row are not both third tones — everything but the last
  // one in the run rises instead, so 请走 is said qíng zǒu, not as the two-dip stumble the written
  // tones ask for. Of all the sandhi rules this is the one that can be applied without knowing
  // where the phrase boundaries are, and a pause is treated as the end of a run.
  //
  // `tone` keeps the tone as written, because that is how pinyin is spelled and how the studio
  // should show it. `say` is the tone actually used.
  function sandhi(sylls) {
    for (let i = 0; i < sylls.length; i++) {
      const s = sylls[i], next = sylls[i + 1];
      // read from `tone` and never from `say`, or the change cascades along the run
      s.say = (s.tone === 3 && next && next.tone === 3 && !s.after) ? 2 : s.tone;
    }
    return sylls;
  }
  const maxLenOf = new WeakMap();
  function segment(hz, dict) {
    const out = [];
    if (!dict) {
      for (const ch of hz) out.push({ hz: ch, py: HAN[ch] || '' });
      return out;
    }
    let max = maxLenOf.get(dict);
    if (!max) {
      max = 1;
      for (const k in dict) max = Math.max(max, k.length);
      maxLenOf.set(dict, max);
    }
    for (let i = 0; i < hz.length;) {
      let hit = null;
      for (let l = Math.min(max, hz.length - i); l > 0; l--) {
        const s = hz.substr(i, l);
        if (dict[s]) { hit = s; break; }
      }
      if (hit) { out.push({ hz: hit, py: dict[hit].py || dict[hit] }); i += hit.length; }
      else { out.push({ hz: hz[i], py: HAN[hz[i]] || '' }); i++; }
    }
    return out;
  }
  // One run of letters is often several syllables — pinyin is written 谢谢 as xièxie, one word, two
  // beats. Take the longest prefix that is really a syllable and go again.
  //
  // Longest-first is the whole trick. Splitting at the first consonant that looks like an initial
  // turns shi into s + hi, because h is an initial and i is a final and neither fact is relevant
  // once sh has already claimed the s.
  function chunk(word) {
    const { letters, tones } = normalise(word);
    const parts = [];
    let i = 0, guard = 0;
    while (i < letters.length && guard++ < 24) {
      let took = null, len = 0;
      for (let l = Math.min(MAXSYL, letters.length - i); l > 0; l--) {
        const read = readSyllable(letters.substr(i, l));
        if (read) { took = read; len = l; break; }
      }
      if (!took) { took = splitSyllable(letters.substr(i, 1)); len = 1; }
      // the tone written anywhere inside this syllable belongs to it
      let tone = 0;
      for (let k = i; k < i + len; k++) if (tones[k]) { tone = tones[k]; break; }
      // `py` is what was written; `ini`/`fin` are what gets synthesised. They differ on purpose —
      // wǒ is spelled with a w and pronounced with a u — and anything showing this to a human
      // should show the spelling, not the machinery.
      parts.push({ ...took, tone: tone || 5, py: letters.substr(i, len) });
      i += len;
    }
    return parts;
  }

  // ---------------------------------------------------------------- planning
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  function contour(pts, t) {
    for (let i = 1; i < pts.length; i++)
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
        const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
        return lerp(v0, v1, k * k * (3 - 2 * k));
      }
    return pts[pts.length - 1][1];
  }
  // Where the mouth is at fraction `t` through a final.
  function vowelAt(path, t) {
    let a = path[0], b = path[path.length - 1];
    for (let i = 1; i < path.length; i++)
      if (t <= path[i][1]) { a = path[i - 1]; b = path[i]; break; }
    const k = b[1] === a[1] ? 0 : clamp((t - a[1]) / (b[1] - a[1]), 0, 1);
    const A = V[a[0]], B = V[b[0]];
    const sm = k * k * (3 - 2 * k);
    return [0, 1, 2, 3].map(i => lerp(A[i], B[i], sm));
  }
  // How tall each formant stands, worked out from where all four of them are.
  //
  // This is the one thing a parallel formant bank cannot get right by guessing, and guessing is
  // what it was doing: four fixed shares, identical for every vowel. A vocal tract is not four
  // resonators side by side, it is four in series, and in series each formant's height falls out of
  // where the other three poles sit — the skirts of the lower resonances are most of what decides
  // how loud the upper ones come out. So evaluate the series response at each formant frequency and
  // hand the parallel branch that height, which is the standard way of making a parallel bank agree
  // with the cascade it is standing in for.
  //
  // The numbers are not a small correction. For /a/ the third formant belongs about 27 dB under the
  // first; the fixed shares had it 13 dB under, and 14 dB of surplus F3 on every vowel in the
  // language is most of what made these sound like a synthesiser rather than a mouth.
  //
  // Normalised to F1, because the absolute level is `gain`'s business and not this function's.
  function bankAmps(F, Q, into) {
    for (let i = 0; i < 4; i++) {
      let m = Q[i];                      // a resonator on its own peaks at its Q
      for (let j = 0; j < 4; j++) {
        if (j === i) continue;
        const r = F[i] / F[j], re = 1 - r * r, im = r / Q[j];
        m /= Math.sqrt(re * re + im * im);
      }
      into[i] = m;
    }
    const top = into[0] || 1e-9;
    for (let i = 0; i < 4; i++) into[i] /= top;
    return into;
  }
  // The vowel this consonant is about to turn into, which aspiration needs to know because it is
  // wearing that vowel's formants before the voicing arrives.
  function nextCore(steps, from) {
    for (let i = from + 1; i < steps.length; i++) if (steps[i].k === 'core') return steps[i];
    return null;
  }
  const isNasalKey = k => k === 'N' || k === 'G' || k === 'M';
  function nasalAt(path, t) {
    let a = path[0], b = path[path.length - 1];
    for (let i = 1; i < path.length; i++)
      if (t <= path[i][1]) { a = path[i - 1]; b = path[i]; break; }
    const k = b[1] === a[1] ? 0 : clamp((t - a[1]) / (b[1] - a[1]), 0, 1);
    return lerp(isNasalKey(a[0]) ? 1 : 0, isNasalKey(b[0]) ? 1 : 0, k);
  }

  // The whole utterance, as frames. Nothing here touches WebAudio, which is why the studio can
  // draw it and the tests can measure it.
  function plan(sylls, voice) {
    const v = { ...DEFAULT, ...voice };
    const R = 1 / clamp(v.rate, .35, 3);
    const steps = [], opens = [];
    sylls.forEach((sy, i) => {
      opens.push(steps.length);              // where this syllable starts, consonant and all
      const ini = INITIALS[sy.ini] || INITIALS[''];
      const fin = FINALS[sy.fin] || FINALS.a;
      const tone = sy.say || sy.tone;        // sandhi applied; sy.tone is still the spelling
      // Segment lengths, in seconds at rate 1. Together they come to about four and a half
      // syllables a second, which is ordinary conversational Mandarin; every preset then scales
      // the lot with its own `rate`.
      if (ini.type === 'stop') {
        steps.push({ k: 'hush', d: .038 * R });
        steps.push({ k: 'burst', d: .010, ini });
        steps.push({ k: 'asp', d: (ini.asp ? .062 : .014) * R, ini });
      } else if (ini.type === 'affr') {
        steps.push({ k: 'hush', d: .028 * R });
        steps.push({ k: 'fric', d: (ini.asp ? .092 : .058) * R, ini });
      } else if (ini.type === 'fric') {
        steps.push({ k: 'fric', d: .112 * R, ini });
      } else if (ini.type !== 'none') {
        steps.push({ k: 'sonor', d: (ini.type === 'nasal' ? .068 : .052) * R, ini });
      }
      // Mandarin tones are not all the same length, and the differences are big enough to hear.
      // The falling tone is the short one — it has run out of pitch to fall through — the dipping
      // third is much the longest, and the rising second sits a little over the level first.
      const held = tone === 5 ? .132 : tone === 3 ? .268
                 : tone === 4 ? .182 : tone === 2 ? .224 : .206;
      // And the last syllable of anything is drawn out. Without it a two-syllable station name
      // stops rather than finishes.
      const final = i === sylls.length - 1 ? 1.14 : 1;
      steps.push({ k: 'core', d: held * final * R, fin, ini, tone });
      // A pause asked for by punctuation is a pause, not a rate: talking faster does not make the
      // room let go of the last word any sooner, so `rate` scales the running gap and not this.
      if (i < sylls.length - 1)
        steps.push({ k: 'gap', d: Math.max(.020 * R, sy.after || 0) });
    });
    // Where each syllable's voiced part begins, so anything drawing this can put the tone number
    // over the pitch line it belongs to. Syllables are not the same length — a third tone runs
    // twice as long as a neutral one — so evenly spacing the labels puts them over the wrong notes.
    const at = [];
    let racc = 0;
    for (const s of steps) { at.push(racc); racc += s.d; }
    const marks = [];
    steps.forEach((s, i) => { if (s.k === 'core') marks.push(at[i]); });
    // And where each syllable begins and ends, the consonant included. `marks` is for drawing a
    // tone over the right note; this is for asking whether the syllable was audible at all, which
    // needs the whole of it and not just the voiced part.
    const spans = opens.map((s, i) => [at[s], i + 1 < opens.length ? at[opens[i + 1]] : racc]);
    const dur = Math.max(STEP * 2, steps.reduce((s, x) => s + x.d, 0) + .05);
    const n = Math.ceil(dur / STEP);
    const F = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    const Q = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    const A = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    const f0 = new Float32Array(n), amp = new Float32Array(n), nas = new Float32Array(n);
    const open = new Float32Array(n);            // how open the tract is, to anything at all
    const brA = new Float32Array(n), fA = new Float32Array(n);
    const fF = new Float32Array(n), fQ = new Float32Array(n);
    const Ff = [0, 0, 0, 0], Qq = [0, 0, 0, 0], amps = [0, 0, 0, 0];
    let si = 0, sAcc = 0;
    let lastF = [V.a[0] / v.tract, V.a[1] / v.tract, V.a[2] / v.tract, V.a[3] / v.tract];
    for (let i = 0; i < n; i++) {
      const t = i * STEP;
      while (si < steps.length - 1 && t >= sAcc + steps[si].d) { sAcc += steps[si].d; si++; }
      const s = steps[si];
      const lt = s.d <= 0 ? 1 : clamp((t - sAcc) / s.d, 0, 1);
      let Fi = lastF.slice(), nasal = 0, voiced = 0, noise = 0, aspir = 0, nF = 1200, nQ = 1;
      if (s.k === 'core') {
        Fi = vowelAt(s.fin, lt).map((x, k) => x / v.tract * (1 + (v.dF[k] || 0) / 100));
        nasal = nasalAt(s.fin, lt) * v.nasal;
        // The consonant's locus bleeds into the first fifth of the vowel. Without this every stop
        // is the same stop, because a burst on its own carries almost nothing.
        const loc = s.ini.locus;
        if (loc && lt < .20) {
          const k = 1 - lt / .20;
          for (let j = 0; j < loc.length; j++)
            Fi[j] = lerp(Fi[j], loc[j] / v.tract, k * .85);
        }
        const env = Math.min(1, lt / .10) * Math.min(1, (1 - lt) / .18 + .25);
        // The third tone creaks and thins where it bottoms out, which is audible and characteristic.
        const dip = s.tone === 3 ? 1 - .30 * Math.max(0, 1 - Math.abs(lt - .5) * 3.2) : 1;
        voiced = clamp(env, 0, 1) * dip;
        f0[i] = f0Hz(v, s.tone, lt, t, i, t / dur);
      } else if (s.k === 'sonor') {
        const loc = s.ini.locus;
        Fi = [0, 1, 2, 3].map(j => (loc && loc[j] ? loc[j] : V.s[j]) / v.tract);
        nasal = s.ini.type === 'nasal' ? v.nasal * 1.5 : 0;
        voiced = .62 * Math.min(1, lt / .25);
        f0[i] = f0Hz(v, (steps[si + 1] && steps[si + 1].tone) || 1, 0, t, i, t / dur);
      } else if (s.k === 'burst') {
        const loc = s.ini.locus || [400, 1500];
        noise = .55;
        nF = clamp(loc[1] / v.tract * 1.25, 400, 9000);
        nQ = .8;
      } else if (s.k === 'asp') {
        // Aspiration is noise made at the glottis, so it leaves through the whole tract and comes
        // out wearing the formants of the vowel about to be said. Sent straight to the output
        // through one bandpass, which is what this used to do, a pʰ is a click followed by a hiss
        // rather than the breathy first instant of the syllable it belongs to — and the aspirated
        // and unaspirated stops of Mandarin are the same consonant apart from this.
        const loc = s.ini.locus || [400, 1500];
        const nxt = nextCore(steps, si);
        if (nxt) Fi = vowelAt(nxt.fin, 0).map((x, k) => x / v.tract * (1 + (v.dF[k] || 0) / 100));
        for (let j = 0; j < Math.min(loc.length, 4); j++)
          Fi[j] = lerp(Fi[j], loc[j] / v.tract, .55);
        aspir = .60 * (s.ini.asp ? 1 : .30);
        noise = .10 * (s.ini.asp ? 1 : .5);         // a little front-cavity colour over the top
        nF = clamp(loc[1] / v.tract * 1.25, 400, 9000);
        nQ = 1.1;
      } else if (s.k === 'fric') {
        const shape = Math.min(1, lt / .12) * Math.min(1, (1 - lt) / .12 + .4);
        // Where the noise is made decides whether the mouth gets a say in it. s, sh, x and f are
        // made at the teeth or the lips, so only the little cavity in front of the constriction
        // resonates and a single bandpass is the whole of it. h is made back at the velum, with the
        // entire mouth in front of it, so it has to come out through the bank like a vowel — which
        // is why 火 and 胡 need it and 商 does not.
        if (s.ini.back) {
          const nxt = nextCore(steps, si);
          if (nxt) Fi = vowelAt(nxt.fin, 0).map((x, k) => x / v.tract * (1 + (v.dF[k] || 0) / 100));
          aspir = s.ini.amp * 2.4 * shape;
          noise = s.ini.amp * .45 * shape;
        } else {
          noise = s.ini.amp * (s.ini.asp ? 1.05 : 1) * shape;
        }
        nF = clamp(s.ini.nf / Math.sqrt(v.tract), 400, 11000);
        nQ = s.ini.nq;
      }
      lastF = Fi;
      for (let j = 0; j < 4; j++) {
        Ff[j] = clamp(Fi[j], 90, 11000);
        const bw = BW[j] * (1 + v.breath * .9) / Math.sqrt(v.tract);
        Qq[j] = clamp(Ff[j] / bw, .4, 26);
      }
      bankAmps(Ff, Qq, amps);
      // The tract is open to the buzz and to aspiration alike, because both are made at the glottis
      // and both leave through the mouth. Nasalising takes a little off it: the air is going out of
      // the nose branch instead.
      open[i] = (voiced + aspir * .9) * (1 - nasal * .30);
      for (let j = 0; j < 4; j++) {
        F[j][i] = Ff[j];
        Q[j][i] = Qq[j];
        // Not used to make the sound any more — the cascade decides how tall each formant is all by
        // itself. This is what it decides, kept so the studio can draw a formant faintly when it is
        // faint, which is the interesting half of what a vowel is doing.
        A[j][i] = amps[j] * open[i];
      }
      amp[i] = voiced;
      nas[i] = nasal * voiced;
      brA[i] = voiced * v.breath * .8 + aspir;
      fA[i] = noise;
      fF[i] = nF; fQ[i] = nQ;
      if (!f0[i]) f0[i] = v.f0;
    }
    return { dur: n * STEP, n, step: STEP, v, sylls, marks, spans,
             f0, amp, nas, brA, fA, fF, fQ, open, F, Q, A };
  }
  // Pitch at a moment: the tone's shape, plus vibrato, plus the wobble that stops it sounding
  // like a test tone. The wobble is deterministic so the same voice says the same word the same way.
  function f0Hz(v, tone, lt, t, i, through) {
    const st = contour(TONES[tone] || TONES[1], lt) * v.range;
    // Declination. Pitch drifts down across an utterance — the lungs empty and the speaker is not
    // fighting it — and the drift is not linear: most of it arrives at the end. Every syllable
    // starting from the same note is the difference between a sentence and a list of words, and it
    // is the single cheapest thing that can be done about a synthetic voice sounding like one.
    const k = clamp(through || 0, 0, 1);
    const drift = -(v.decline || 0) * (k * .45 + k * k * .55);
    const vib = Math.sin(t * v.vibRate * Math.PI * 2) * v.vibDepth;
    const creak = tone === 3 ? v.creak * Math.max(0, 1 - Math.abs(lt - .55) * 2.6) : 0;
    const wob = (hash(i) - .5) * (v.rough + creak) * 1.1;
    return clamp(v.f0 * Math.pow(2, (st + drift + vib + wob) / 12), 55, 900);
  }
  const hash = i => {
    let x = Math.imul(i + 0x9e37, 0x85ebca6b) ^ 0x27d4eb2d;
    x = Math.imul(x ^ (x >>> 15), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  // ---------------------------------------------------------------- rendering
  // The glottal wave. Harmonic amplitudes fall off as 1/n^p, and `tilt` is p: a dull voice loses
  // its upper harmonics at the source, a bright one keeps them, and no filter downstream can put
  // back what was never there.
  function glottis(ctx, v) {
    const N = 56, real = new Float32Array(N + 1), imag = new Float32Array(N + 1);
    // `press` lives here rather than on the formants. Pressing a voice makes the glottis snap shut
    // harder, which puts more energy in the upper harmonics at the source; it does not reach into
    // the mouth and turn up the third formant. It used to be applied as a tilt on the formant
    // amplitudes, which was the only place there was to put it while those were being guessed at.
    const p = 1.75 - clamp(v.tilt, 0, 1) * 1.05 - clamp(v.press, 0, 1) * .34;
    for (let k = 1; k <= N; k++)
      imag[k] = Math.pow(k, -p) * Math.exp(-k * v.f0 / 7000);
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }
  // Linear until it is nearly full scale, then it bends rather than breaks. Straight tanh would
  // work too, but normalised it lifts every quiet passage as well, and a voice should not get
  // louder in the middle just because the shaper is there.
  let SOFT = null;
  function softCurve() {
    if (SOFT) return SOFT;
    const n = 2048, knee = .70;
    SOFT = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
      SOFT[i] = x < 0 ? -y : y;
    }
    return SOFT;
  }
  function noiseBuffer(ctx, seconds) {
    const frames = Math.round(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 0x2545f491;
    for (let i = 0; i < frames; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      d[i] = seed / 2147483648 - 1;
    }
    return buf;
  }
  // Build the graph and hang every planned curve on it. One call, one utterance.
  function speak(ctx, dest, p, at = ctx.currentTime + .02) {
    const v = p.v, end = at + p.dur;
    const out = ctx.createGain();
    out.gain.value = v.gain * .62;
    // A soft knee on the way out, and the level backed off to sit under it. Four resonators summed
    // overshoot whatever you set the level to — an open vowel on a pressed voice easily doubles it
    // — and a synth that hard-clips the moment you turn a dial up is a synth you cannot explore.
    const shaper = ctx.createWaveShaper();
    shaper.curve = softCurve();
    shaper.oversample = '2x';
    out.connect(shaper); shaper.connect(dest);
    const bank = ctx.createGain();      // what the mouth resonates
    bank.gain.value = 1;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(glottis(ctx, v));
    const src = ctx.createGain(); src.gain.value = 0;
    osc.connect(src); src.connect(bank);
    const breath = ctx.createBufferSource();
    breath.buffer = noiseBuffer(ctx, Math.max(1, p.dur + .2));
    breath.loop = true;
    const brG = ctx.createGain(); brG.gain.value = 0;
    breath.connect(brG); brG.connect(bank);
    const fric = ctx.createBufferSource();
    fric.buffer = breath.buffer;
    fric.loop = true;
    const fbp = ctx.createBiquadFilter(); fbp.type = 'bandpass';
    const fG = ctx.createGain(); fG.gain.value = 0;
    fric.connect(fbp); fbp.connect(fG); fG.connect(out);
    const curve = (param, data, scale = 1) => {
      const a = scale === 1 ? data : data.map(x => x * scale);
      param.cancelScheduledValues(at);
      param.setValueCurveAtTime(a, at, p.dur);
    };
    curve(osc.frequency, p.f0);
    curve(src.gain, p.amp, .9);
    curve(brG.gain, p.brA, .5);
    curve(fG.gain, p.fA, .9);
    curve(fbp.frequency, p.fF);
    curve(fbp.Q, p.fQ);
    // The tract: four resonators in series, which is what a tract is.
    //
    // This was four bandpasses in parallel, and everything that was wrong with the vowels was wrong
    // because of that. Two things, both measured:
    //
    //   A bandpass falls away from its centre at 6 dB an octave, half the slope of a resonance in a
    //   tube, so four of them side by side fill in every valley between the formants with each
    //   other's skirts. /u/ came out with 26 dB too much energy at 1500 Hz, where a real /u/ has
    //   almost none, and was classified as the i of zi ci si. Five of ten vowels were.
    //
    //   And a bandpass rolls off *below* its centre too, which a resonance does not. With every
    //   formant above 300 Hz that took the fundamental out of the voice: the pitch tracker started
    //   reading these presets an octave high, because the octave was genuinely the loudest thing
    //   left in them.
    //
    // A lowpass biquad with a high Q is not a lowpass, it is a two-pole resonator: unity at DC, a
    // peak of Q at its corner, 12 dB an octave above. Four of those in series is the all-pole
    // transfer function of a vocal tract, exactly, and every parameter of it can still be automated.
    // Nothing has to decide how tall each formant stands any more — the series does, out of where
    // the poles are, which is how a mouth does it too.
    let node = bank;
    for (let j = 0; j < 4; j++) {
      const r = ctx.createBiquadFilter();
      r.type = 'lowpass';
      node.connect(r);
      node = r;
      curve(r.frequency, p.F[j]);
      curve(r.Q, p.Q[j]);
    }
    // And one more, fixed, standing in for the formants nobody models. A tract has a fifth and a
    // sixth resonance and they do not stop mattering just because they are not being tracked; four
    // resonators and then nothing falls away at 48 dB an octave above F4, and measured through the
    // station horn that cost 9 dB across the 2-4 kHz band, which is the band consonants live in.
    // One resonator up at 4.5 kHz puts the top back without touching what makes a vowel that vowel.
    const higher = ctx.createBiquadFilter();
    higher.type = 'lowpass';
    higher.frequency.value = 4500 / Math.max(.5, v.tract);
    higher.Q.value = 1.1;
    node.connect(higher);
    node = higher;
    // A cascade of resonators has a lot of gain at the first formant — the product of four Qs and
    // their skirts — so the level is taken back out here, and this gain doubles as the tract's own
    // envelope, which is how a stop stays a stop.
    const tract = ctx.createGain(); tract.gain.value = 0;
    node.connect(tract); tract.connect(out);
    curve(tract.gain, p.open, .36);
    // The nose: one low resonance that opens on m, n and ng and is shut the rest of the time.
    const nbp = ctx.createBiquadFilter();
    nbp.type = 'bandpass';
    nbp.frequency.value = 270 / Math.sqrt(v.tract);
    nbp.Q.value = 7;
    const nG = ctx.createGain(); nG.gain.value = 0;
    bank.connect(nbp); nbp.connect(nG); nG.connect(out);
    curve(nG.gain, p.nas, 2.2);
    osc.start(at); osc.stop(end + .05);
    breath.start(at); breath.stop(end + .05);
    fric.start(at); fric.stop(end + .05);
    return { out, until: end };
  }
  // The same graph, off the clock, for baking a clip.
  async function render(p, sampleRate = 44100) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Off(1, Math.ceil((p.dur + .2) * sampleRate), sampleRate);
    speak(ctx, ctx.destination, p, 0);
    return ctx.startRendering();
  }
  // 16-bit PCM, because that is what every tool on the far side of this will want.
  function wav(buffer) {
    const d = buffer.getChannelData(0), n = d.length;
    const b = new ArrayBuffer(44 + n * 2), view = new DataView(b);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, n * 2, true);
    let peak = 1e-6;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    const k = Math.min(1, .92 / peak);
    for (let i = 0; i < n; i++)
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * k)) * 32767, true);
    return new Blob([b], { type: 'audio/wav' });
  }

  // ---------------------------------------------------------------- a cast to start from
  // Voices that are only numbers. They are the people this game already has, and they are the
  // archetypes speech.js picks from when it works out what a neighbour sounds like — every actual
  // person in the game is one of these with their own height, age and seed applied on top.
  const PRESETS = {
    '大妈':   { f0: 168, range: 1.15, tract: .96, tilt: .40, breath: .12, rough: .42, creak: .55,
                rate: 1.12, nasal: .40, press: .55, vibDepth: .16, dF: [4, -3, 0, 0] },
    '老师':   { f0: 205, range: .92, tract: 1.02, tilt: .52, breath: .16, rough: .18, creak: .28,
                rate: .92, nasal: .26, press: .34, vibDepth: .08 },
    '学生':   { f0: 238, range: 1.10, tract: .92, tilt: .62, breath: .24, rough: .16, creak: .22,
                rate: 1.20, nasal: .28, press: .30, vibDepth: .12 },
    '服务员': { f0: 226, range: 1.05, tract: .94, tilt: .66, breath: .20, rough: .20, creak: .25,
                rate: 1.16, nasal: .38, press: .42, vibDepth: .10 },
    '售票员': { f0: 186, range: .74, tract: 1.00, tilt: .44, breath: .12, rough: .24, creak: .30,
                rate: 1.05, nasal: .24, press: .48, vibDepth: .05 },
    '地勤':   { f0: 214, range: .88, tract: .98, tilt: .58, breath: .22, rough: .14, creak: .20,
                rate: .96, nasal: .22, press: .30, vibDepth: .07 },
    '大爷':   { f0: 108, range: .90, tract: 1.16, tilt: .34, breath: .18, rough: .52, creak: .60,
                rate: .88, nasal: .34, press: .38, vibDepth: .14 },
    // ---- the men. `tract` is doing as much work here as `f0` is, and that is the whole point of
    // having both: a man's voice is not a woman's an octave down. The larynx sits lower, so every
    // formant comes down with it — take only the pitch and what you get is a woman speaking into a
    // barrel. Dropping f0 to 120 and leaving the tract at 1.0 is exactly that sound.
    '大叔':   { f0: 118, range: .88, tract: 1.14, tilt: .42, breath: .16, rough: .32, creak: .40,
                rate: 1.02, nasal: .30, press: .46, vibDepth: .09 },
    '小伙':   { f0: 138, range: 1.05, tract: 1.08, tilt: .58, breath: .18, rough: .18, creak: .22,
                rate: 1.18, nasal: .26, press: .34, vibDepth: .10 },
    '先生':   { f0: 124, range: .82, tract: 1.11, tilt: .48, breath: .13, rough: .15, creak: .24,
                rate: .94, nasal: .22, press: .30, vibDepth: .06 },
    '小孩':   { f0: 322, range: 1.30, tract: .78, tilt: .70, breath: .28, rough: .22, creak: .18,
                rate: 1.28, nasal: .34, press: .26, vibDepth: .18 },
    // The station announcer. Everything about her is deliberate and nothing is casual: the range
    // is wide because she over-articulates the tones, the roughness is near zero because she is
    // the same recording every time, and the rate is slow because the room she is played into
    // smears anything faster into mush.
    '广播':   { f0: 218, range: 1.22, tract: .97, tilt: .60, breath: .10, rough: .06, creak: .12,
                rate: .84, nasal: .20, press: .52, vibDepth: .04, vibRate: 4.4, gain: .95 },
  };

  const say = (ctx, dest, text, voice, dict, at) =>
    speak(ctx, dest, plan(parse(text, dict), voice), at);

  return { DEFAULT, PRESETS, TONES, V, FINALS, INITIALS, HAN,
           parse, splitSyllable, readSyllable, stripMarks, plan, speak, say, render, wav };
})();
if (typeof module !== 'undefined') module.exports = Voice;
