// Stable casting for ambient people. Every selectable id below is one of the project's 82
// Chinese/East Asian production rigs; test mannequins and third-party sample avatars are never
// candidates. Authored NPCs keep their explicit rig through note(), while otherwise anonymous
// figures share a small per-place pool so character streaming remains inside its frame budget.
var CastCatalog = (() => {
  'use strict';

  const words = s => Object.freeze(s.trim().split(/\s+/).filter(Boolean));
  const RAW_IDS = words(`
    xiaochen wang_ayi doudou li_shifu xiaoyu xiao_xu wang_manager lu_apo
    xiaolin_cashier xiaozhao_coworker xiaozhou_student li_dama chen_zookeeper
    xiaozhou_courier supermarket_owner xiaomei_flight_attendant wang_rail_clerk
    lao_ma_grill liu_security_officer lao_qiu_tea_server
    diner-shifu-wang-shifu campus-teacher-chen-laoshi campus-student-xiao-li
    airport-gate-agent-xiao-zhao bund-photographer-lao-zhou
    chengdu-ear-cleaner-liu-shifu airport-ticket-clerk-chen-jie
    mall-floor-guide-lin-xiaoyu mall-security-zhao-shifu
    mall-food-cashier-zhou-kexin mall-jewelry-sales-chen-meiqi
    mall-jewelry-guide-gao-zhiyuan mall-jewelry-cashier-wang-lijuan mall-wang-xue
    mall-fashion-guide-chen-jia mall-digital-repair-chen-shifu
    mall-digital-guide-li-siyuan mall-optometrist-shen-jing
    mall-optical-guide-he-yutong mall-optical-cashier-ma-lijuan
    mall-flower-guide-he-mei mall-flower-cashier-su-qing
    mall-cafe-owner-fang-qiming mall-cafe-cashier-su-xiaoman
    mall-dessert-clerk-wang-xiaoman mall-dessert-clerk-he-jianing
    mall-dessert-cashier-chen-zimo mall-cinema-ticket-he-yaqin
    mall-cinema-cashier-lu-jiaying mall-cinema-security-zheng-shifu
    hospital2-doctor-wang-ning hospital2-doctor-zhao-mingyuan
    hospital2-doctor-liu-yue hospital2-doctor-chen-jie
    hospital2-doctor-zhang-lei hospital2-nurse-sun-xiaomei
    hospital2-professor-zhou hospital2-patient-gao-ayi hotel-doorman-gao-ying
    hotel-front-desk-lin-ruo hotel-tea-master-su-wan hotel2-host-ye-qing
    hotel2-chef-deng-shifu hotel2-runner-fang-yu
    hotel3-banquet-manager-tang hotel3-wedding-advisor-zhao-ning
    hotel3-banquet-server-xu-cheng hotel5-room-attendant-luo-xiaoyan
    hotel8-butler-xu hotel10-lounge-server-lin-ning
    hotel11-suite-butler-han-lina hotel12-sky-server-gao-shu
    hotelb1-laundry-zhou-xiulan hotelb1-engineer-ma-jianguo
    hotelb1-security-sun-wei hotelb1-housekeeping-wang-min
    hotel4-spa-reception-shen-ya hotel4-therapist-tang-li
    hotel4-lifeguard-du-hai hotel4-trainer-chen-xiao
    hotel-concierge-zhou-libin hotel-front-manager-shen
  `);
  const IDS = Object.freeze([...RAW_IDS]);
  const ALLOWED = new Set(IDS);

  const set = s => new Set(words(s));
  const FEMALE = set(`
    wang_ayi xiaoyu lu_apo xiaolin_cashier xiaozhao_coworker li_dama
    xiaomei_flight_attendant campus-student-xiao-li airport-gate-agent-xiao-zhao
    airport-ticket-clerk-chen-jie mall-floor-guide-lin-xiaoyu
    mall-food-cashier-zhou-kexin mall-jewelry-sales-chen-meiqi
    mall-jewelry-cashier-wang-lijuan mall-wang-xue mall-fashion-guide-chen-jia
    mall-optometrist-shen-jing mall-optical-guide-he-yutong
    mall-optical-cashier-ma-lijuan mall-flower-guide-he-mei
    mall-flower-cashier-su-qing mall-cafe-cashier-su-xiaoman
    mall-dessert-clerk-wang-xiaoman mall-dessert-clerk-he-jianing
    mall-cinema-ticket-he-yaqin mall-cinema-cashier-lu-jiaying
    hospital2-doctor-liu-yue hospital2-doctor-chen-jie
    hospital2-nurse-sun-xiaomei hospital2-patient-gao-ayi
    hotel-front-desk-lin-ruo hotel-tea-master-su-wan hotel2-host-ye-qing
    hotel3-wedding-advisor-zhao-ning hotel5-room-attendant-luo-xiaoyan
    hotel10-lounge-server-lin-ning hotel11-suite-butler-han-lina
    hotel12-sky-server-gao-shu hotelb1-laundry-zhou-xiulan
    hotelb1-housekeeping-wang-min hotel4-spa-reception-shen-ya
    hotel4-therapist-tang-li
  `);
  const MALE = set(`
    xiaochen doudou li_shifu xiao_xu wang_manager xiaozhou_student chen_zookeeper
    xiaozhou_courier supermarket_owner wang_rail_clerk lao_ma_grill
    liu_security_officer lao_qiu_tea_server diner-shifu-wang-shifu
    campus-teacher-chen-laoshi bund-photographer-lao-zhou
    chengdu-ear-cleaner-liu-shifu mall-security-zhao-shifu
    mall-jewelry-guide-gao-zhiyuan mall-digital-repair-chen-shifu
    mall-digital-guide-li-siyuan mall-cafe-owner-fang-qiming
    mall-dessert-cashier-chen-zimo mall-cinema-security-zheng-shifu
    hospital2-doctor-wang-ning hospital2-doctor-zhao-mingyuan
    hospital2-doctor-zhang-lei hospital2-professor-zhou hotel-doorman-gao-ying
    hotel2-chef-deng-shifu hotel2-runner-fang-yu hotel3-banquet-manager-tang
    hotel3-banquet-server-xu-cheng hotel8-butler-xu
    hotelb1-engineer-ma-jianguo hotelb1-security-sun-wei
    hotel4-lifeguard-du-hai hotel4-trainer-chen-xiao
    hotel-concierge-zhou-libin hotel-front-manager-shen
  `);
  const CHILD = set('doudou');
  const YOUNG = set(`
    xiaochen xiaoyu xiao_xu xiaolin_cashier xiaozhao_coworker xiaozhou_student
    xiaozhou_courier xiaomei_flight_attendant campus-student-xiao-li
    airport-gate-agent-xiao-zhao mall-floor-guide-lin-xiaoyu
    mall-food-cashier-zhou-kexin mall-jewelry-sales-chen-meiqi
    mall-jewelry-guide-gao-zhiyuan mall-fashion-guide-chen-jia
    mall-digital-guide-li-siyuan mall-optical-guide-he-yutong
    mall-flower-cashier-su-qing mall-cafe-cashier-su-xiaoman
    mall-dessert-clerk-wang-xiaoman mall-dessert-clerk-he-jianing
    mall-dessert-cashier-chen-zimo mall-cinema-cashier-lu-jiaying
    hotel-doorman-gao-ying hotel-front-desk-lin-ruo hotel2-host-ye-qing
    hotel2-runner-fang-yu hotel3-wedding-advisor-zhao-ning
    hotel3-banquet-server-xu-cheng hotel10-lounge-server-lin-ning
    hotel12-sky-server-gao-shu hotel4-spa-reception-shen-ya
    hotel4-lifeguard-du-hai hotel4-trainer-chen-xiao
  `);
  const MATURE = set(`
    wang_ayi li_shifu wang_manager chen_zookeeper supermarket_owner wang_rail_clerk
    lao_ma_grill liu_security_officer diner-shifu-wang-shifu
    campus-teacher-chen-laoshi chengdu-ear-cleaner-liu-shifu
    mall-security-zhao-shifu mall-digital-repair-chen-shifu
    mall-cafe-owner-fang-qiming mall-cinema-security-zheng-shifu
    hospital2-doctor-zhao-mingyuan hotel2-chef-deng-shifu
    hotel3-banquet-manager-tang hotel8-butler-xu hotelb1-laundry-zhou-xiulan
    hotelb1-engineer-ma-jianguo hotelb1-security-sun-wei hotel-front-manager-shen
  `);
  const SENIOR = set(`
    lu_apo li_dama lao_qiu_tea_server bund-photographer-lao-zhou
    hospital2-professor-zhou hospital2-patient-gao-ayi
  `);

  const BASE_PLACE = Object.freeze({
    xiaochen:'street', wang_ayi:'street', doudou:'street', li_shifu:'street',
    xiaoyu:'diner', xiao_xu:'airport', wang_manager:'office', lu_apo:'bund',
    xiaolin_cashier:'shop', xiaozhao_coworker:'office', xiaozhou_student:'campus',
    li_dama:'park', chen_zookeeper:'zoo', xiaozhou_courier:'home',
    supermarket_owner:'street', xiaomei_flight_attendant:'cabin',
    wang_rail_clerk:'rail', lao_ma_grill:'nightmarket',
    liu_security_officer:'airport', lao_qiu_tea_server:'chengdu'
  });
  const cleanPlace = value => String(value || 'world').trim().toLowerCase() || 'world';
  function homePlace(id) {
    if (BASE_PLACE[id]) return BASE_PLACE[id];
    const m = id.match(/^(hospital2|hotelb1|hotel\d+|hotel|mall|airport|campus|bund|chengdu|diner)-/);
    return cleanPlace(m ? m[1] : 'world');
  }

  function roleGroup(value) {
    const s = String(value || '').toLowerCase();
    if (/(doctor|nurse|patient|professor|optomet|therap|医生|护士|患者|教授|验光|理疗)/.test(s)) return 'medical';
    if (/(security|engineer|repair|lifeguard|zookeeper|安检|保安|警官|工程|维修|救生|饲养)/.test(s)) return 'security';
    if (/(teacher|student|老师|教师|导师|学生)/.test(s)) return 'education';
    if (/(airport|rail|flight|courier|gate-agent|ticket-clerk|地勤|登机|铁路|空乘|快递)/.test(s)) return 'transit';
    if (/(chef|cafe|dessert|diner|grill|tea|banquet|food|餐|厨|茶|摊|咖啡|甜品|传菜)/.test(s)) return 'food';
    if (/(hotel|doorman|butler|host|reception|attendant|concierge|门童|前台|管家|客房|礼宾|水疗)/.test(s)) return 'hospitality';
    if (/(cashier|guide|sales|owner|clerk|flower|收银|导购|售货|店员|老板|售票)/.test(s)) return 'retail';
    if (/(worker|manager|cleaner|师傅|经理|主管)/.test(s)) return 'work';
    return 'civilian';
  }
  const META = Object.freeze(Object.fromEntries(IDS.map(id => [id, Object.freeze({
    id, place:homePlace(id), gender:FEMALE.has(id) ? 'female' : 'male',
    age:CHILD.has(id) ? 'child' : SENIOR.has(id) ? 'senior' :
      MATURE.has(id) ? 'mature' : YOUNG.has(id) ? 'young' : 'adult',
    role:roleGroup(id)
  })])));

  // Eight streamed ambient identities are enough to stop a crowd looking cloned without loading
  // dozens of full texture sets. Mall uses only its own cast: its other 15 authored workers may
  // also be present, so the complete location remains at 23 identities, below the 28-rig limit.
  const MALL_AMBIENT = words(`
    mall-floor-guide-lin-xiaoyu mall-security-zhao-shifu
    mall-food-cashier-zhou-kexin mall-jewelry-guide-gao-zhiyuan
    mall-digital-repair-chen-shifu mall-optometrist-shen-jing
    mall-cafe-owner-fang-qiming mall-dessert-clerk-he-jianing
  `);
  // Order matters here, and it did not used to. A hotel floor takes its own rigs first and then
  // tops up from this list *in order*, so a list that begins with three women handed hotelB1 a
  // pool of three female faces and one male for a night shift of three men and one woman, and two
  // officers were cast against their declared sex. Alternating puts a usable pair at the front of
  // every short top-up. 豆豆 stays last: a child is a plausible hotel guest and an implausible
  // everything else, and he is only reached by a floor that needs all eight.
  const HOTEL_AMBIENT = words(`
    hotel-concierge-zhou-libin hotel-front-desk-lin-ruo
    hotel-front-manager-shen hotel2-host-ye-qing
    campus-teacher-chen-laoshi hotel-tea-master-su-wan
    hotel-doorman-gao-ying doudou
  `);
  const FILLERS = words(`
    xiaochen xiaoyu li_shifu wang_ayi doudou lu_apo
    liu_security_officer hospital2-doctor-liu-yue
    hotel-doorman-gao-ying hotel-front-desk-lin-ruo
  `);
  const AMBIENT_SIZE = 8, DEFAULT_CAP = 10;
  const CAPS = Object.freeze({ mall:28 });
  const ownedCache = new Map(), ambientCache = new Map();
  function ownedRigs(place) {
    const p = cleanPlace(place);
    if (!ownedCache.has(p)) ownedCache.set(p, Object.freeze(IDS.filter(id => META[id].place === p)));
    return [...ownedCache.get(p)];
  }
  function ambientRigs(place) {
    const p = cleanPlace(place);
    if (!ambientCache.has(p)) {
      const owned = ownedRigs(p);
      const out = p === 'mall' ? [...MALL_AMBIENT] : owned.slice(0, AMBIENT_SIZE);
      // A hotel floor tops up from the hotel's own staff before it reaches the generic fillers.
      // The old rule only used HOTEL_AMBIENT when a floor owned NO rig of its own, so hotel12 —
      // which owns exactly one, its sky server — filled the other seven places from FILLERS and
      // cast its rooftop restaurant out of a street child, a grandmother and an airport security
      // officer. Every anonymous person on floor 12 resolved to `xiaochen` or `xiaoyu`.
      if (p.startsWith('hotel'))
        for (const id of HOTEL_AMBIENT)
          if (out.length < AMBIENT_SIZE && !out.includes(id)) out.push(id);
      for (const id of FILLERS) if (out.length < AMBIENT_SIZE && !out.includes(id)) out.push(id);
      ambientCache.set(p, Object.freeze(out));
    }
    return [...ambientCache.get(p)];
  }
  const cap = place => CAPS[cleanPlace(place)] || DEFAULT_CAP;

  function hash(text) {
    let h = 0x811c9dc5;
    text = String(text);
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function token(value) {
    return String(value == null ? '' : value).normalize('NFKC').trim().toLowerCase()
      .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function pointToken(a) {
    if (!a) return '';
    // A waypoint is commonly the raw array `[x, z]`. Arrays also expose an `at()` method; treating
    // that function as an authored `{ at:[x,z] }` field erased every patrol coordinate and made
    // otherwise unrelated anonymous walkers resolve to the same cast identity.
    if (!Array.isArray(a)) {
      if (a.at) a = a.at;
      else if (a.pos) a = a.pos;
      else if (a.position) a = a.position;
    }
    const x = Array.isArray(a) ? a[0] : a.x;
    const z = Array.isArray(a) ? (a.length > 2 ? a[2] : a[1]) : a.z;
    if (!Number.isFinite(+x) || !Number.isFinite(+z)) return '';
    return `${Math.round(+x * 100) / 100},${Math.round(+z * 100) / 100}`;
  }
  function positionToken(n) {
    if (!n) return '';
    // Lazy crowds do not have x/z until game.js has initialised them. Their authored first seat,
    // spot or route point is nevertheless permanent, unlike their eventual position in NPCS.
    // Including the deck also distinguishes identical shop coordinates on stacked mall floors.
    const seat = n.seat && (typeof n.seat === 'string' || typeof n.seat === 'number')
      ? `seat-${token(n.seat)}` : pointToken(n.seat);
    const at = pointToken(n.pos || n.position || n.at)
      || pointToken(n.spots && n.spots[0])
      || pointToken(n.patrol && n.patrol[0])
      || pointToken(n)
      || seat;
    return at ? `${n.mallFloor || n.floor || 1}@${at}` : seat;
  }
  function stableKey(n, stableIndexHint) {
    n = n || {};
    if (n.castKey) {
      const supplied = String(n.castKey);
      return supplied.startsWith('cast:') ? supplied : `cast:${token(supplied)}`;
    }
    const place = cleanPlace(n.place || n.room || n.scene);
    const id = n.npcId || n.hotelGuestId || n.personId || n.id || n.key || '';
    const name = n.name || n.py || n.hz || n.title || n.job || n.role || '';
    const look = n.look || {};
    // A caller's array index is only a final legacy fallback. Lazy rooms are allowed to build in
    // any order, so an index supplied by game.js must never overrule the person's own id, face,
    // seat, route or explicit seed. Otherwise visiting the cabin before the station can recast the
    // same passenger as a different person even though nothing about that passenger changed.
    const hint = n.stableIndex !== undefined ? `stable-${n.stableIndex}` :
      look.faceSeed !== undefined ? `face-${look.faceSeed}` :
      n.seed !== undefined ? `seed-${n.seed}` :
      positionToken(n) || (stableIndexHint !== undefined ? `legacy-${stableIndexHint}` : '');
    const readable = token([id, name, hint].filter(v => v !== '').join('-')) || 'anonymous';
    const fingerprint = hash([place, id, name, hint, positionToken(n)].join('|')).toString(36);
    return `cast:${place}:${readable}:${fingerprint}`;
  }

  function requested(n) {
    n = n || {};
    const look = n.look || {};
    const roleText = [n.role, n.job, n.title, n.hz, n.action, n.uniform].filter(Boolean).join('|');
    const gs = String(n.gender || n.sex || look.gender || '').toLowerCase();
    let gender = /female|woman|girl|女/.test(gs) ? 'female' : /male|man|boy|男/.test(gs) ? 'male' : null;
    if (!gender && /(阿姨|大妈|阿婆|奶奶|女士|小姐|姐姐|妈妈|护士|空乘)/.test(roleText)) gender = 'female';
    if (!gender && /(师傅|大爷|爷爷|先生|叔叔|门童|保安)/.test(roleText)) gender = 'male';
    let age = String(n.ageBand || n.age_group || '').toLowerCase() || null;
    if (!/^(child|young|adult|mature|senior)$/.test(age || '')) age = null;
    if (!age && /(孩子|儿童|小孩|child|kid)/i.test(roleText)) age = 'child';
    if (!age && /(阿婆|奶奶|爷爷|老人|senior|elder)/i.test(roleText)) age = 'senior';
    const av = n.age !== undefined ? +n.age : look.age !== undefined ? +look.age : NaN;
    const youth = n.youth !== undefined ? +n.youth : look.youth !== undefined ? +look.youth : 0;
    if (!age && youth >= .35) age = 'child';
    if (!age && Number.isFinite(av)) age = av > 1
      ? av < 13 ? 'child' : av < 27 ? 'young' : av < 55 ? 'adult' : av < 70 ? 'mature' : 'senior'
      : av >= .76 ? 'senior' : av >= .56 ? 'mature' : av > 0 && av <= .34 ? 'young' : 'adult';
    let role = roleGroup(roleText);
    if (role === 'civilian' && cleanPlace(n.place || n.room || n.scene).startsWith('hotel') &&
        /(服务员|接待|前台)/.test(roleText)) role = 'hospitality';
    return { gender, age, role, roleText };
  }
  const AGE_RANK = Object.freeze({ child:0, young:1, adult:2, mature:3, senior:4 });
  function compatibility(meta, want) {
    let cost = want.gender && meta.gender !== want.gender ? 24 : 0;
    if (want.age) {
      const d = Math.abs(AGE_RANK[want.age] - AGE_RANK[meta.age]);
      cost += d * (want.age === 'child' || meta.age === 'child' ? 18 : 3);
    }
    if (want.role !== 'civilian' && meta.role !== want.role)
      cost += meta.role === 'civilian' ? 1.5 : 5;
    return cost;
  }

  // Assignment history only breaks equally compatible choices. The cast key still owns the
  // deterministic base score, and stableIndexHint makes the proximity penalty spatial/list based
  // instead of dependent on frame timing.
  const assignments = new Map(), usage = new Map(), badExplicit = [];
  function state(place) {
    const p = cleanPlace(place);
    if (!usage.has(p)) usage.set(p, { recent:[], rigs:new Map(), keys:new Set(), claimed:new Set() });
    return usage.get(p);
  }
  function numericHint(hint) {
    const n = typeof hint === 'number' ? hint : /^-?\d+(?:\.\d+)?$/.test(String(hint)) ? +hint : NaN;
    return Number.isFinite(n) ? n : null;
  }
  // Seeded once per hotel place, before the first anonymous assignment there. game.js casts NPCS
  // in list order, and js/hotel-service.js pushes two floor-local staff *before* its main roster
  // block — so by the time 马建国 registered his explicit rig, 何磊 had already been handed it and
  // the two named engineers on B1 shared one face. Reading the roster's own explicit rigs up front
  // removes the ordering dependency instead of relying on who happens to be initialised first.
  function seedClaims(s, place) {
    if (s.seeded) return;
    s.seeded = true;
    const rows = typeof HotelCast !== 'undefined' && Array.isArray(HotelCast) ? HotelCast : [];
    for (const row of rows)
      if (row && row.rig && ALLOWED.has(row.rig) &&
          cleanPlace(row.place || row.room || row.scene) === place) s.claimed.add(row.rig);
  }
  function remember(record) {
    const s = state(record.place);
    s.keys.add(record.castKey);
    if (record.explicit) s.claimed.add(record.rig);
    s.rigs.set(record.rig, (s.rigs.get(record.rig) || 0) + 1);
    s.recent.push(record);
    if (s.recent.length > 16) s.recent.shift();
    assignments.set(record.castKey, record);
  }
  function nearCost(s, rig, hint) {
    let cost = 0;
    for (let i = s.recent.length - 1, rank = 1; i >= 0 && rank <= 8; i--, rank++) {
      const r = s.recent[i];
      if (r.rig !== rig) continue;
      const h = numericHint(hint), rh = numericHint(r.hint);
      const distance = h !== null && rh !== null ? Math.abs(h - rh) : rank;
      if (distance <= 6) cost += (7 - distance) * 40;
    }
    return cost;
  }
  function result(record) {
    return { rig:record.rig, castKey:record.castKey, tint:!record.explicit };
  }

  function note(n, stableIndexHint) {
    if (!n || !n.rig) return null;
    const place = cleanPlace(n.place || n.room || n.scene);
    const castKey = stableKey(n, stableIndexHint);
    if (!ALLOWED.has(n.rig)) {
      badExplicit.push({ place, castKey, rig:n.rig });
      return null;
    }
    const prior = assignments.get(castKey);
    if (prior && prior.rig === n.rig) return result(prior);
    const record = { rig:n.rig, castKey, place, hint:stableIndexHint, explicit:true };
    remember(record);
    return result(record);
  }
  function register(value, stableIndexHint) {
    return Array.isArray(value) ? value.map((n, i) => note(n, i)).filter(Boolean)
                                : note(value, stableIndexHint);
  }
  function assign(n, stableIndexHint) {
    n = n || {};
    if (n.rig) return note(n, stableIndexHint);
    const place = cleanPlace(n.place || n.room || n.scene);
    const castKey = stableKey(n, stableIndexHint);
    const prior = assignments.get(castKey);
    if (prior) return result(prior);
    const s = state(place), want = requested(n), live = new Set(s.rigs.keys());
    if (place.startsWith('hotel')) seedClaims(s, place);
    let candidates = ambientRigs(place);
    // A face that belongs to somebody with a name is not also worn by the stranger at the next
    // table. On hotel12 the ambient pool is the floor's one owned rig plus seven borrowed from the
    // hotel, and the owned rig is the sky server's — so an anonymous terrace diner was being cast
    // as a second 高舒, sitting eight metres from the first one during the same dinner service.
    // Scoped to the hotel: the mall's pool is deliberately its own workers' faces (see
    // MALL_AMBIENT above) and reusing them there is the authored intent, not a defect.
    if (place.startsWith('hotel') && s.claimed.size) {
      const free = candidates.filter(id => !s.claimed.has(id));
      if (free.length) candidates = free;
    }
    if (live.size >= cap(place)) {
      const resident = candidates.filter(id => live.has(id));
      if (resident.length) candidates = resident;
    }
    let best = candidates[0], bestCost = Infinity;
    for (const id of candidates) {
      const cost = compatibility(META[id], want) + nearCost(s, id, stableIndexHint)
        + (s.rigs.get(id) || 0) * .12 + hash(`${castKey}|${id}`) / 0xffffffff;
      if (cost < bestCost) { best = id; bestCost = cost; }
    }
    const record = { rig:best, castKey, place, hint:stableIndexHint, explicit:false };
    remember(record);
    return result(record);
  }

  function pool(placeOrPerson, person) {
    const n = typeof placeOrPerson === 'object' ? placeOrPerson : (person || { place:placeOrPerson });
    const place = cleanPlace(n.place || placeOrPerson), want = requested(n);
    return ambientRigs(place).sort((a, b) => compatibility(META[a], want) - compatibility(META[b], want)
      || hash(`${stableKey(n, 0)}|${a}`) - hash(`${stableKey(n, 0)}|${b}`));
  }
  function beginPlace(place) {
    const s = state(place);
    s.recent.length = 0;
    return ambientRigs(place);
  }
  function clear(place) {
    if (place === undefined) { assignments.clear(); usage.clear(); badExplicit.length = 0; return; }
    const p = cleanPlace(place);
    usage.delete(p);
    for (const [key, row] of assignments) if (row.place === p) assignments.delete(key);
    for (let i = badExplicit.length - 1; i >= 0; i--) if (badExplicit[i].place === p) badExplicit.splice(i, 1);
  }
  function inspect(place) {
    if (place === undefined) {
      const places = [...new Set(IDS.map(id => META[id].place).concat([...usage.keys()]))].sort();
      return { count:IDS.length, ids:[...IDS], places:Object.fromEntries(places.map(p => [p, inspect(p)])) };
    }
    const p = cleanPlace(place), s = usage.get(p);
    return {
      place:p, cap:cap(p), owned:ownedRigs(p), ambient:ambientRigs(p),
      assigned:s ? [...s.keys].length : 0,
      activeRigs:s ? [...s.rigs.keys()].sort() : [],
      recent:s ? s.recent.map(r => ({ rig:r.rig, castKey:r.castKey, explicit:r.explicit })) : []
    };
  }
  function validate(options) {
    options = options || {};
    const issues = [], duplicates = RAW_IDS.filter((id, i) => RAW_IDS.indexOf(id) !== i);
    if (IDS.length !== 82) issues.push(`catalog has ${IDS.length} rigs; expected 82`);
    if (duplicates.length) issues.push(`duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
    const unsexed = IDS.filter(id => !FEMALE.has(id) && !MALE.has(id));
    const both = IDS.filter(id => FEMALE.has(id) && MALE.has(id));
    if (unsexed.length) issues.push(`missing demographic metadata: ${unsexed.join(', ')}`);
    if (both.length) issues.push(`conflicting demographic metadata: ${both.join(', ')}`);
    let unavailable = [];
    if (typeof Assets !== 'undefined' && Assets && typeof Assets.rigNames === 'function') {
      const available = new Set(Assets.rigNames());
      unavailable = IDS.filter(id => !available.has(id));
      if (unavailable.length) issues.push(`not in Assets.RIGS: ${unavailable.join(', ')}`);
    }
    const places = [...new Set(IDS.map(id => META[id].place).concat([...usage.keys()]))];
    for (const p of places) {
      const ambient = ambientRigs(p), total = new Set([...ownedRigs(p), ...ambient]);
      if (ambient.length > AMBIENT_SIZE) issues.push(`${p} ambient pool exceeds ${AMBIENT_SIZE}`);
      if (total.size > cap(p)) issues.push(`${p} catalog pool ${total.size} exceeds cap ${cap(p)}`);
      const active = usage.get(p);
      if (active && active.rigs.size > cap(p)) issues.push(`${p} active rigs ${active.rigs.size} exceeds cap ${cap(p)}`);
    }
    if (MALL_AMBIENT.some(id => META[id].place !== 'mall')) issues.push('mall ambient pool contains a non-mall identity');
    if (badExplicit.length) issues.push(`${badExplicit.length} explicit rig note(s) are outside the production catalog`);
    const report = { ok:issues.length === 0, count:IDS.length, issues, unavailable,
      invalidExplicit:badExplicit.map(x => ({...x})), mall:inspect('mall') };
    if (!report.ok && options.throwOnError) throw new Error(issues.join('; '));
    return report;
  }

  // ---------------------------------------------------------------- the hotel roster
  //
  // HotelCast rows are pushed by eleven different modules and every one of them carries a floor
  // key in `place`. None of them historically carried a department, so anything that wanted to ask
  // "who is on tonight, and for which department" had to re-derive it from a Chinese job title —
  // which is exactly the remodelling HOTEL.md:97 asks to be made unnecessary.
  //
  // An explicit `dept` on the row wins. Everything else is inferred from the title, most specific
  // first: 水疗接待员 is spa and not front office, even though it contains 接待. A row that is a
  // guest rather than a member of staff resolves to null on purpose and is counted separately.
  const DEPT_BY_TITLE = [
    ['spa', /水疗|理疗|救生|健身|更衣|泳池/],
    ['laundry', /洗衣|布草房/],
    ['engineering', /工程|机电|维修/],
    ['security', /保安|安保|监控/],
    ['banqueting', /宴会|婚礼|会议|商务中心/],
    ['concierge', /礼宾|门童|行李|代客/],
    ['housekeeping', /客房|布草|收货|管家|清洁|楼层服务/],
    ['food-beverage', /餐|厨|茶|吧|酒廊|传菜|备餐|迎宾|服务员|零点/],
    ['front-office', /前台|前厅|大堂|接待/],
  ];
  const GUEST_TITLE = /客人|住客|游客|员工|访客|家属/;
  function deptOf(row) {
    if (row.dept) return String(row.dept);
    const text = [row.hz, row.role, row.job, row.title].filter(Boolean).join('');
    if (!text) return null;
    for (const [key, re] of DEPT_BY_TITLE) if (re.test(text)) return key;
    return null;
  }
  function hotelRoster() {
    const rows = typeof HotelCast !== 'undefined' && Array.isArray(HotelCast) ? HotelCast : [];
    const departments = typeof HOTEL_DEPARTMENTS !== 'undefined' ? HOTEL_DEPARTMENTS : [];
    const floors = typeof HOTEL_FLOORS !== 'undefined' ? HOTEL_FLOORS : [];
    const floorOf = Object.fromEntries(floors.map(f =>
      [f.key, { key:f.key, display:f.display, level:f.level, order:f.order, hz:f.hz }]));
    const byDepartment = Object.fromEntries(departments.map(d => [d.key, []]));
    const byFloor = {}, unresolved = [];
    let staff = 0, guests = 0;
    for (const row of rows) {
      const place = cleanPlace(row.place || row.room || row.scene);
      const isGuest = !row.name && GUEST_TITLE.test(String(row.hz || ''));
      const dept = isGuest ? null : deptOf(row);
      const entry = {
        hz:row.hz || null, name:row.name || null, py:row.py || null,
        place, floor:floorOf[row.place] || null, department:dept,
        rig:row.rig || null, named:!!row.name, temper:row.temper || null,
        lines:(row.lines || []).length,
        // The hours this person is anywhere at all, as the union of their spot windows. A window
        // written past 24 wraps past midnight; it is reported as authored rather than normalised,
        // because that is the form `npcAwake` reads.
        hours:(row.spots || []).map(s => [s.h0, s.h1]),
      };
      (byFloor[place] = byFloor[place] || []).push(entry);
      if (isGuest) { guests++; continue; }
      staff++;
      if (dept && byDepartment[dept]) byDepartment[dept].push(entry);
      else unresolved.push(entry);
    }
    return {
      count:rows.length, staff, guests, byDepartment, byFloor, unresolved,
      // What a future shift system would have to fill in. A department with no named character is
      // the H188 gap; a floor with nobody on it is a room the player can be alone in all day.
      gaps:{
        departments:departments.filter(d => !(byDepartment[d.key] || []).some(e => e.named))
          .map(d => d.key),
        floors:floors.filter(f => !(byFloor[cleanPlace(f.key)] || []).length).map(f => f.key),
      },
    };
  }

  const api = Object.freeze({
    assign, note, register, key:stableKey, pool, ambientRigs, ownedRigs, beginPlace,
    clear, inspect, validate, cap, has:id => ALLOWED.has(id), ids:() => [...IDS],
    meta:id => META[id] ? {...META[id]} : null,
    hotelRoster, department:deptOf
  });
  if (typeof globalThis !== 'undefined') globalThis.CastCatalog = api;
  return api;
})();
