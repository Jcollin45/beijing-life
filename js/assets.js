// Models from outside this repo, and the one thing in the project that is not built out of
// boxes. Everything else in this game is described in code: a chair is nine primitives with
// their dimensions written down. That runs out at anything moulded — a bottle neck, a car
// panel, a plant — because the fifteen primitives cannot make those shapes at all.
//
// So a prop can now be a downloaded mesh instead. `assets/models/` holds CC0 glTF from Poly
// Haven; a scene says `model('chinese_stool', x, y, z)` beside its `box` and `cyl` calls and
// the rest of the pipeline — culling, the shadow pass, the cutaway, picking — does not know
// the difference, because by the time it sees one it is just another named mesh.
//
// ---------------------------------------------------------------- why this file loads first
//
// Scenes are built *synchronously*: `Lazy` builds a room the moment anything touches it, and
// five rooms are touched while game.js is still running. A model arrives over the network. So
// the geometry has to be in memory before the game's scripts run at all, which is why
// index.html loads this one on its own and waits for `preload()` before appending the rest.
//
// It deliberately has no dependencies — not even `M` or `R`. It cannot: it runs before them.
// Parsing produces plain arrays, and those arrays are handed to WebGL later, on first use,
// once there is a GL context to hand them to.
const Assets = (() => {
  const BASE = 'assets/models/';

  // What is available to the runtime, and where it lives. Poly Haven ships a .gltf, a .bin beside
  // it and its textures in a subfolder; the loader follows the URIs rather than assuming that
  // shape. Legally attributed reference sources may remain staged on disk without appearing here.
  const MANIFEST = {
    chinese_stool:            'chinese_stool/chinese_stool_1k.gltf',
    chinese_tea_table:        'chinese_tea_table/chinese_tea_table_1k.gltf',
    chinese_armchair:         'chinese_armchair/chinese_armchair_1k.gltf',
    metal_stool_01:           'metal_stool_01/metal_stool_01_1k.gltf',
    folding_wooden_stool:     'folding_wooden_stool/folding_wooden_stool_1k.gltf',
    plastic_monobloc_chair:   'plastic_monobloc_chair_01/plastic_monobloc_chair_01_1k.gltf',
    green_chair_01:           'GreenChair_01/GreenChair_01_1k.gltf',
    classic_nightstand_01:    'ClassicNightstand_01/ClassicNightstand_01_1k.gltf',
    arm_chair_01:             'ArmChair_01/ArmChair_01_1k.gltf',
    potted_plant_01:          'potted_plant_01/potted_plant_01_1k.gltf',
    potted_plant_02:          'potted_plant_02/potted_plant_02_1k.gltf',
    pachira:                  'pachira_aquatica_01/pachira_aquatica_01_1k.gltf',
    wall_clock:               'wall_clock/wall_clock_1k.gltf',
    ceiling_fan:              'ceiling_fan/ceiling_fan_1k.gltf',
    exterior_aircon_unit:     'exterior_aircon_unit/exterior_aircon_unit_1k.gltf',
    steel_frame_shelves:      'steel_frame_shelves_01/steel_frame_shelves_01_1k.gltf',
    electric_stove:           'electric_stove/electric_stove_1k.gltf',
    wooden_cutting_board:     'wooden_cutting_board/wooden_cutting_board_1k.gltf',

    // Not Poly Haven. These entries are CC BY from Sketchfab, reworked to the same shape as
    // everything above — see assets/models/ATTRIBUTION.md, which carries the credit line the
    // licence requires and lists what was changed. Anything CC BY added here must go in there
    // too, or the build ships out of compliance.
    //
    // `Wok_01` is the one entry with no textures at all: its two materials are plain PBR values,
    // so the loader falls back to `baseColorFactor`. That is why its `model()` calls pass an
    // explicit colour and gloss rather than relying on a map.
    // The wok ships as two files, not one. Its lid is a separate mesh because the kitchen rests a
    // spatula inside the open pan, and because 做饭 will want to lift it the way `potlid` already
    // lifts the soup pot's. A single glTF would have welded it shut.
    wok:                      'Wok_01/Wok_01_1k.gltf',
    wok_lid:                  'Wok_01_lid/Wok_01_lid_1k.gltf',
  };

  // Tiling surface materials, for the walls, floors and roofs that are built out of primitives
  // and have no usable UVs. These are read triplanar in world space, so they need no unwrapping
  // and tile at a real size in metres — which is why one entry can dress a four-metre wall and
  // a four-centimetre block without either looking wrong.
  //
  // Only the colour map is loaded. The normal and roughness maps are on disk beside it and are
  // what Phase 3's lighting will want; loading them now would triple the memory for no visible
  // gain, because nothing yet reads them.
  // What is actually *in* each photograph, which is the number `matScale` depends on and the
  // one thing no amount of shader work can tell you. A map is one repeat; if that repeat holds
  // six tiles, then matScale 0.78 gives 13 cm tiles and matScale 0.30 gives a 5 cm mosaic.
  //
  // Measured off the images by the people who used them, after each of them first got it wrong:
  //
  //   tile      ~6 tiles per repeat   -> 0.78 for a 13 cm wall tile, not the 0.30 I guessed
  //   paving    5 cm setts            -> a concourse floor comes out cobbled; use concrete
  //   plaster   trowel swirls         -> 0.60-0.65 indoors; at 2.4 a swirl is a metre wide
  //   brick     standard courses      -> 0.90 is a real course height
  //   metal     near-featureless      -> contributes no pattern at any scale, only brightness
  //   steel     corrugated ribs       -> 0.28-0.60 reads as ribbed cladding
  //
  // The lesson is duller than it sounds: `matScale` is not a taste setting. It is the size of
  // the real thing in the photograph, and it has one right answer per surface.
  const MATBASE = 'assets/textures/';
  const MATERIALS = {
    wood:      'Wood095/Wood095_1K-JPG_Color.jpg',
    concrete:  'Concrete034/Concrete034_1K-JPG_Color.jpg',
    brick:     'Bricks104/Bricks104_1K-JPG_Color.jpg',
    tile:      'Tiles141/Tiles141_1K-JPG_Color.jpg',
    plaster:   'PaintedPlaster017/PaintedPlaster017_1K-JPG_Color.jpg',
    asphalt:   'Road007/Road007_1K-JPG_Color.jpg',
    fabric:    'Fabric081C/Fabric081C_1K-JPG_Color.jpg',
    metal:     'Metal049A/Metal049A_1K-JPG_Color.jpg',
    steel:     'CorrugatedSteel009/CorrugatedSteel009_1K-JPG_Color.jpg',
    rooftile:  'RoofingTiles013A/RoofingTiles013A_1K-JPG_Color.jpg',
    paving:    'PavingStones138/PavingStones138_1K-JPG_Color.jpg',
  };
  const matImg = {};                         // name -> ImageBitmap
  const matTex = {};                         // name -> GL texture, made on first use
  const matNrmImg = {}, matNrmTex = {};      // and the same for their normal maps
  const matMean = {};                        // name -> mean linear luminance, measured at load

  // ImageBitmap owns decoded pixel memory outside the ordinary JavaScript heap. Once R.texture
  // has synchronously copied those pixels into WebGL, retaining the bitmap keeps a second complete
  // copy of the material alive for the rest of the session. The eleven eager colour/normal pairs
  // are 16 MiB decoded even after their deliberately small 512 px repack; the seven unique
  // textured runtime models add another 22 MiB. Close only after a successful upload, and
  // clear the owning slot at that instant so no later code mistakes a released bitmap for retry data.
  function releaseBitmap(owner, key) {
    const bmp = owner[key];
    if (!bmp) return;
    if (typeof bmp.close === 'function') bmp.close();
    delete owner[key];
  }

  // Static model geometry has a single authoritative GPU copy after upload. Build.model keeps
  // only the stable uploaded descriptors plus the model bounds below, and WebGL context restore
  // reloads the page rather than rebuilding buffers in place. Drop the parsed vertex/index copy
  // only after every part has uploaded successfully; a thrown/partial upload must retain it so
  // the existing retry path can register the model again.
  function releaseStaticGeometry(model) {
    for (const part of model && model.parts || []) {
      part.pos = null; part.nor = null; part.uv = null; part.idx = null;
    }
  }

  // ---------------------------------------------------------------- how bright a material is
  //
  // The shader divides a sampled texel by a fixed 0.22 — nominally mid grey — and multiplies the
  // surface by the result, on the promise that a material adds variation and leaves the colour
  // the scene chose alone. That promise only holds if the photograph actually averages 0.22.
  //
  // None of them do. Four separate people working on different rooms measured these maps and
  // each independently discovered their walls getting brighter rather than textured, then wrote
  // their own private correction table to cancel it. Metal is the worst: near-white, and almost
  // featureless, so it contributes no pattern and a large lift.
  //
  // So the mean is measured here, once, from the actual pixels, and every scene can have the
  // real number instead of a guess. Nothing reads it yet — swapping the shader's 0.22 for this
  // changes every textured surface in the game, which is a deliberate re-tune and not something
  // to slip in underneath work that is already in flight.
  function measureMean(bmp) {
    try {
      const N = 64;                          // plenty for a mean; avoids decoding a whole 512²
      const cv = new OffscreenCanvas(N, N);
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(bmp, 0, 0, N, N);
      const d = cx.getImageData(0, 0, N, N).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) {
        // sRGB -> linear, then Rec.709 luminance, because that is the space the shader works in.
        const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        sum += 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
      }
      return sum / (d.length / 4);
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- what is fetched at boot
  //
  // Only what the game actually places. The first version of this preloaded everything in both
  // tables — 15 models and 11 materials, each with a colour and a normal map, about 73 MB — and
  // it broke the game: all of it is fetched and decoded to bitmaps *before* the first game
  // script runs, so the page took long enough that two of the test harnesses gave up waiting
  // and reported the dev server down.
  //
  // That is not a harness quirk, it is the real constraint arriving early. The whole game is
  // 2.4 MB; a boot that blocks on 73 MB of offline-render-grade textures is not something a
  // player on a real connection would tolerate either.
  //
  // So these two lists are the contract: a scene may only name what is listed here, and adding
  // to them is a deliberate act with a cost attached. Once Phase 4 converts whole rooms this
  // has to become per-room loading against the boot overlay — a room's assets fetched when the
  // room is first entered — because a single eager list does not scale to eighteen of them.
  // Which room uses what. Declared here rather than in the scene files, and that is forced: a
  // scene file loads *after* this one, so a declaration living there could not be read in time
  // to fetch anything before the five rooms that build during game.js are built.
  //
  // Keeping it in one table has turned out to be the right shape anyway. The cost of the asset
  // library is a single thing you can look at, rather than eighteen decisions spread across
  // eighteen files that only add up when it is too late.
  const ROOMS = {
    Diner: ['chinese_stool', 'wall_clock'],
    // Night Market reuses Diner's boot-resident stool mesh and maps. Declaring the ownership here
    // costs no additional fetch or residency, while retaining the market's exact native fallback.
    NightMarket: ['chinese_stool'],
    // The 336 KB curved chair is streamed only when the station is first entered and replaces
    // dozens of block-built seat/back/leg primitives across the occupied rooms. `wall_clock` is
    // already boot-loaded for Diner, so reusing it here adds no fetch while removing a ring made
    // from dozens of micro-primitives.
    FireStation: ['plastic_monobloc_chair', 'wall_clock'],
    // Only the 34 standalone clinic/desk chairs use this shared moulded model. The 101 linked
    // waiting-bank seats remain native so their authored common beam and legs are not duplicated.
    Hospital: ['plastic_monobloc_chair'], Hospital2: ['plastic_monobloc_chair'],
    Hospital3: ['plastic_monobloc_chair'], Hospital4: ['plastic_monobloc_chair'],
    // Formal visitor, meeting and reading chairs on the legal floor share the existing Chinese
    // armchair. Its workstation task chairs deliberately remain native and visually distinct.
    Office3: ['chinese_armchair'],
    // Seventy 2-/4-top food-court seats share the resident moulded chair; the twelve tightly
    // pitched six-top seats remain native. Mall itself stays room-streamed rather than boot-loaded.
    Mall: ['plastic_monobloc_chair'],
    // B01/F1 and F2 reuse the same moulded shell for their well-spaced classroom and lecture seats.
    // Compact waiting banks and F2's desk-integrated task chairs remain native.
    CampusInteriorB01F1: ['plastic_monobloc_chair'],
    CampusInteriorB01F2: ['plastic_monobloc_chair'],
    // F7 reuses the same room-streamed Chinese chair as F9. Sixteen one-part instances replace
    // 208 block-built chair pieces without adding another unique texture or mesh allocation.
    Hotel7: ['chinese_armchair'],
    // Eleven guest-room bedside cabinets share one compact CC0 PBR nightstand. These floors also
    // reuse the already-proven Chinese armchair for their guest seating; lamps, shadows and
    // interactions stay native.
    Hotel5: ['classic_nightstand_01', 'chinese_armchair'],
    Hotel8: ['classic_nightstand_01', 'chinese_armchair'],
    Hotel11: ['classic_nightstand_01', 'chinese_armchair'],
    // Hotel F9 repeats this compact CC0 chair twenty-four times. Streaming one shared mesh and
    // three 512 px PBR maps when the floor is first entered replaces hundreds of chair
    // primitives without adding anything to boot; the authored procedural chair remains the
    // final fallback if loading or upload fails.
    Hotel9: ['chinese_armchair'],
    // Hotel F10's thirteen club chairs share one compact CC0 armchair, while its guest-room chairs
    // reuse the Chinese armchair. Both stream only on first arrival and retain authored fallbacks.
    Hotel10: ['arm_chair_01', 'chinese_armchair'],
    // Thirty-two terrace/private-dining chairs share one carved dark-wood/celadon PBR source;
    // guest-room chairs reuse the Chinese armchair. Both stream only on first arrival and retain
    // their authored fallbacks.
    Hotel12: ['green_chair_01', 'chinese_armchair'],
    // Flat 202's wok is the only downloaded kitchen appliance. Its 44 KB geometry is declared
    // here because World is in BOOT_ROOMS. The rice cooker beside it is now code-native geometry:
    // the separately staged licensed source stays on disk with its legal attribution, but is
    // deliberately absent from this runtime catalogue so its real-brand texture cannot load.
    //
    // 'wok_lid' is deliberately NOT declared. It exists in the manifest above and nothing places
    // it — js/home-kitchen.js:309 says so outright, the spatula rests in the open pan — so
    // declaring it would be 76 KB of boot fetched for a mesh that is never drawn. Item 472 asserts
    // that every mesh a home module PLACES is declared, which is the right direction; the reverse
    // is not owed.
    World: ['wok'],
    // ---- five declarations deleted 2026-08-08 (APARTMENT-TODO item 412), and this note is the
    // record of what they were, because "nothing places it" is a fact about today's scenes and a
    // scene may want one of them back tomorrow. Re-declaring is one line; the cost is below.
    //
    // A sweep of every literal `model('name'` call in js/ finds exactly EIGHT non-TRELLIS names
    // placed anywhere in the game — `chinese_stool`, `wall_clock`,
    // `plastic_monobloc_chair`, `chinese_armchair`, `green_chair_01`,
    // `classic_nightstand_01`, `arm_chair_01`, and `wok`. Nothing else in the catalogue is placed
    // by a scene.
    //
    // These five were declared and never placed, so every one of them was fetched, decoded and
    // held in memory for a mesh no frame ever drew:
    //   potted_plant_02      2,124 KB  (World  — BOOT, blocked the first game script)
    //   exterior_aircon_unit 1,356 KB  (Street — BOOT)
    //   ceiling_fan            640 KB  (Diner  — BOOT)
    //   potted_plant_01      5,612 KB  (Office — formerly title-background traffic)
    //   steel_frame_shelves    ~1 MB   (Shop   — formerly title-background traffic)
    //
    // BOOT saving, which is the number that matters because `preload()` is awaited before the
    // first game script runs: eager was 5,268 KB across seven names, of which 4,120 KB (78%) was
    // these three. Removing the branded cooker's 588 KB fetch takes it to about 560 KB across
    // three names, a 9.4x cut to the blocking fetch.
    //
    // Street/Shop/Office keys are gone entirely rather than left empty: `ROOMS[r] || []` in
    // preload/roomReady/loadRoom already handles a room with no models, and `BOOT_ROOMS` names
    // 'Street' with no matching key exactly as it already names 'Zoo' and 'Metro'.
  };
  // ---------------------------------------------------------------- per-deck loading (item 414)
  //
  // The header above says the eager list "has to become per-room loading … a single eager list
  // does not scale to eighteen of them". 十八号楼 is twelve storeys inside one `home` scene, so it
  // is that problem arriving early: twelve deck modules, any of which may want its own props.
  //
  // The rule, and it is the whole gate: **a deck's models are never eager.** `home` is not in
  // BOOT_ROOMS, the tower is built behind the title screen, and a lift ride is a 7.5 s window —
  // long enough to fetch a 1 K glTF several times over. So a deck declares here, `loadDeck(n)` is
  // awaited by whatever moves the player (js/world.js `goFloor`), and nothing a deck wants can
  // ever reach `preload()`.
  //
  // Empty on purpose. No floor module places a `model()` today; this is the gate that has to exist
  // *before* one does, so that the first floor to want a mesh has somewhere to put it that is not
  // the boot list. Adding a row costs a fetch on first arrival at that floor and nothing at boot.
  const DECK_ROOMS = {};
  // The rooms built during boot, whose models therefore cannot arrive late (game.js:PLACES).
  const BOOT_ROOMS = ['World', 'Street', 'Diner', 'Metro'];

  // Materials are all fetched at boot and always will be: the eleven of them together are
  // 740 KB after repacking, which is less than one of the models. There is nothing to stream.
  const EAGER_MATERIALS = Object.keys(MATERIALS);

  // Skinned characters. The first twenty are the maintained Chinese cast/body families; the older
  // entries remain conformance fixtures for skeleton shapes and accessor layouts the loader sees.
  const RIGBASE = 'assets/rigs/';
  // Found by bending a knee and looking — see the RIG-axis probes in .audit.js. Z twists the
  // limbs sideways on this skeleton; X strides.
  const RIG_AXIS = { man: { bend: 'x', sign: 1 } };
  const RIGS = {
    // MPFB 2.0.17 + official MakeHuman system/community packs. Photographed Asian skins,
    // separately textured game pieces and the 52-bone Mixamo rig, exported without compression
    // or morphs. CC-BY wardrobe attribution is recorded in the character design brief.
    // See tools/characters/build_mpfb_character.py for the reproducible source build.
    xiaochen: 'XiaoChen.lod.glb',
    wang_ayi: 'WangAyi.lod.glb',
    doudou: 'Doudou.lod.glb',
    li_shifu: 'LiShifu.lod.glb',
    xiaoyu: 'Xiaoyu.lod.glb',
    xiao_xu: 'XiaoXu.lod.glb',
    wang_manager: 'WangManager.lod.glb',
    lu_apo: 'LuApo.lod.glb',
    xiaolin_cashier: 'XiaolinCashier.lod.glb',
    xiaozhao_coworker: 'XiaozhaoCoworker.lod.glb',
    xiaozhou_student: 'XiaozhouStudent.lod.glb',
    li_dama: 'LiDama.lod.glb',
    chen_zookeeper: 'ChenZookeeper.lod.glb',
    xiaozhou_courier: 'XiaozhouCourier.lod.glb',
    supermarket_owner: 'SupermarketOwner.lod.glb',
    xiaomei_flight_attendant: 'XiaomeiFlightAttendant.lod.glb',
    wang_rail_clerk: 'WangRailClerk.lod.glb',
    lao_ma_grill: 'LaoMaGrill.lod.glb',
    liu_security_officer: 'LiuSecurityOfficer.lod.glb',
    lao_qiu_tea_server: 'LaoQiuTeaServer.lod.glb',
    // Roster-driven production cast. These stable keys are also written directly on the matching
    // runtime NPC rows, so loading a lighter tier never changes which person the player sees.
    'diner-shifu-wang-shifu': 'DinerShifuWangShifu.lod.glb',
    'campus-teacher-chen-laoshi': 'CampusTeacherChenLaoshi.lod.glb',
    'campus-student-xiao-li': 'CampusStudentXiaoLi.lod.glb',
    'airport-gate-agent-xiao-zhao': 'AirportGateAgentXiaoZhao.lod.glb',
    'bund-photographer-lao-zhou': 'BundPhotographerLaoZhou.lod.glb',
    'chengdu-ear-cleaner-liu-shifu': 'ChengduEarCleanerLiuShifu.lod.glb',
    'airport-ticket-clerk-chen-jie': 'AirportTicketClerkChenJie.lod.glb',
    'mall-floor-guide-lin-xiaoyu': 'MallFloorGuideLinXiaoyu.lod.glb',
    'mall-security-zhao-shifu': 'MallSecurityZhaoShifu.lod.glb',
    'mall-food-cashier-zhou-kexin': 'MallFoodCashierZhouKexin.lod.glb',
    'mall-jewelry-sales-chen-meiqi': 'MallJewelrySalesChenMeiqi.lod.glb',
    'mall-jewelry-guide-gao-zhiyuan': 'MallJewelryGuideGaoZhiyuan.lod.glb',
    'mall-jewelry-cashier-wang-lijuan': 'MallJewelryCashierWangLijuan.lod.glb',
    'mall-wang-xue': 'MallWangXue.lod.glb',
    'mall-fashion-guide-chen-jia': 'MallFashionGuideChenJia.lod.glb',
    'mall-digital-repair-chen-shifu': 'MallDigitalRepairChenShifu.lod.glb',
    'mall-digital-guide-li-siyuan': 'MallDigitalGuideLiSiyuan.lod.glb',
    'mall-optometrist-shen-jing': 'MallOptometristShenJing.lod.glb',
    'mall-optical-guide-he-yutong': 'MallOpticalGuideHeYutong.lod.glb',
    'mall-optical-cashier-ma-lijuan': 'MallOpticalCashierMaLijuan.lod.glb',
    'mall-flower-guide-he-mei': 'MallFlowerGuideHeMei.lod.glb',
    'mall-flower-cashier-su-qing': 'MallFlowerCashierSuQing.lod.glb',
    'mall-cafe-owner-fang-qiming': 'MallCafeOwnerFangQiming.lod.glb',
    'mall-cafe-cashier-su-xiaoman': 'MallCafeCashierSuXiaoman.lod.glb',
    'mall-dessert-clerk-wang-xiaoman': 'MallDessertClerkWangXiaoman.lod.glb',
    'mall-dessert-clerk-he-jianing': 'MallDessertClerkHeJianing.lod.glb',
    'mall-dessert-cashier-chen-zimo': 'MallDessertCashierChenZimo.lod.glb',
    'mall-cinema-ticket-he-yaqin': 'MallCinemaTicketHeYaqin.lod.glb',
    'mall-cinema-cashier-lu-jiaying': 'MallCinemaCashierLuJiaying.lod.glb',
    'mall-cinema-security-zheng-shifu': 'MallCinemaSecurityZhengShifu.lod.glb',
    'hospital2-doctor-wang-ning': 'Hospital2DoctorWangNing.lod.glb',
    'hospital2-doctor-zhao-mingyuan': 'Hospital2DoctorZhaoMingyuan.lod.glb',
    'hospital2-doctor-liu-yue': 'Hospital2DoctorLiuYue.lod.glb',
    'hospital2-doctor-chen-jie': 'Hospital2DoctorChenJie.lod.glb',
    'hospital2-doctor-zhang-lei': 'Hospital2DoctorZhangLei.lod.glb',
    'hospital2-professor-zhou': 'Hospital2ProfessorZhou.lod.glb',
    'hospital2-nurse-sun-xiaomei': 'Hospital2NurseSunXiaomei.lod.glb',
    'hospital2-patient-gao-ayi': 'Hospital2PatientGaoAyi.lod.glb',
    'hotel-doorman-gao-ying': 'HotelDoormanGaoYing.lod.glb',
    'hotel-front-desk-lin-ruo': 'HotelFrontDeskLinRuo.lod.glb',
    'hotel-tea-master-su-wan': 'HotelTeaMasterSuWan.lod.glb',
    'hotel2-host-ye-qing': 'Hotel2HostYeQing.lod.glb',
    'hotel2-chef-deng-shifu': 'Hotel2ChefDengShifu.lod.glb',
    'hotel2-runner-fang-yu': 'Hotel2RunnerFangYu.lod.glb',
    'hotel3-banquet-manager-tang': 'Hotel3BanquetManagerTang.lod.glb',
    'hotel3-wedding-advisor-zhao-ning': 'Hotel3WeddingAdvisorZhaoNing.lod.glb',
    'hotel3-banquet-server-xu-cheng': 'Hotel3BanquetServerXuCheng.lod.glb',
    'hotel5-room-attendant-luo-xiaoyan': 'Hotel5RoomAttendantLuoXiaoyan.lod.glb',
    'hotel8-butler-xu': 'Hotel8ButlerXu.lod.glb',
    'hotel10-lounge-server-lin-ning': 'Hotel10LoungeServerLinNing.lod.glb',
    'hotel11-suite-butler-han-lina': 'Hotel11SuiteButlerHanLina.lod.glb',
    'hotel12-sky-server-gao-shu': 'Hotel12SkyServerGaoShu.lod.glb',
    'hotelb1-laundry-zhou-xiulan': 'Hotelb1LaundryZhouXiulan.lod.glb',
    'hotelb1-engineer-ma-jianguo': 'Hotelb1EngineerMaJianguo.lod.glb',
    'hotelb1-security-sun-wei': 'Hotelb1SecuritySunWei.lod.glb',
    'hotelb1-housekeeping-wang-min': 'Hotelb1HousekeepingWangMin.lod.glb',
    'hotel4-spa-reception-shen-ya': 'Hotel4SpaReceptionShenYa.lod.glb',
    'hotel4-therapist-tang-li': 'Hotel4TherapistTangLi.lod.glb',
    'hotel4-lifeguard-du-hai': 'Hotel4LifeguardDuHai.lod.glb',
    'hotel4-trainer-chen-xiao': 'Hotel4TrainerChenXiao.lod.glb',
    'hotel-concierge-zhou-libin': 'HotelConciergeZhouLibin.lod.glb',
    'hotel-front-manager-shen': 'HotelFrontManagerShen.lod.glb',
    // A clothed, textured human on a full Mixamo skeleton — the thing this whole skinning path was
    // built for and the one asset it never had. 49 joints, every role in rig.js's Mixamo map
    // matched on the first try, two textures, four baked animations we do not use because the
    // game's own gaitPose drives it.
    //
    // From the three.js example models rather than from Mixamo directly: Mixamo itself refuses
    // without an Adobe login, and this is the same class of asset sitting in a public repository.
    // Check its licence before this ships — three.js hosts models under several, and "reachable"
    // is not "clearable".
    // A civilian woman in ordinary clothes on a full Mixamo skeleton — 65 joints, four textures,
    // every role matched. This is the first asset in the project that is actually a *person* the
    // game could cast, rather than a test fixture.
    michelle: 'Michelle.glb',
    // A Ready Player Me avatar: 67 joints, standard humanoid naming, 19 textures. Roles all match
    // even though the bones carry no `mixamorig:` prefix, because the suffixes are the same.
    rpm: 'readyplayer.me.glb',
    // Sci-fi soldier. Kept only as the fixture that proved the pipeline — it exposed the
    // interleaved-accessor bug and the T-pose arm offset. Nothing in this game should cast it.
    soldier: 'Soldier.glb',
    // The grey Mixamo mannequin. 67 joints, which is over MAXBONES (56) — it will not upload until
    // that budget grows, and it is kept here as a note rather than as a usable rig.
    xbot:   'Xbot.glb',
    man:    'CesiumMan.glb',
    figure: 'RiggedFigure.glb',
    simple: 'RiggedSimple.glb',
  };

  // name -> { parts: [{ pos, nor, uv, idx, color, tex }], lo, hi, cy, r }
  const parsed = {};
  const uploaded = {};                       // name -> [{ mesh, color }], filled on first draw
  const inflight = {};                       // room -> promise, so a prefetch is never doubled
  let failures = [];

  // ---------------------------------------------------------------- glTF, the parts we use
  //
  // Not a general reader. It handles exactly what these files contain: indexed triangles,
  // tightly packed POSITION / NORMAL / TEXCOORD_0, a node tree, and one material per
  // primitive. It does not do animation, skins, sparse accessors or Draco, and it should stay
  // that way — the moment it grows those it becomes a library to maintain.
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
                 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  // DataView getters by typed-array name, for the strided read below. glTF's component types map
  // one-to-one onto these six.
  const DVGET = { Int8Array: 'getInt8', Uint8Array: 'getUint8', Int16Array: 'getInt16',
                  Uint16Array: 'getUint16', Uint32Array: 'getUint32', Float32Array: 'getFloat32' };

  function readAccessor(g, bins, i) {
    const a = g.accessors[i];
    const n = NUM[a.type], Ctor = COMP[a.componentType];
    if (a.bufferView === undefined) return new Ctor(a.count * n);   // all zeroes, per spec
    const bv = g.bufferViews[a.bufferView];
    const buf = bins[bv.buffer];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    // Interleaved buffer views, which this used to refuse.
    //
    // The old comment here said a strided copy would be "a slow path that is never exercised and
    // therefore never known to work", and that was true of the sample rigs: CesiumMan and the two
    // Rigged* files are all tightly packed. It stopped being true the moment a real character
    // arrived — the Mixamo humans pack position, normal, uv, joints and weights into one strided
    // view, which is what an exporter does when it is optimising for upload, so refusing it means
    // refusing most downloadable characters.
    //
    // A typed array cannot view strided memory, so this is an element-by-element copy through a
    // DataView. It runs once per attribute at load time and never again, which is the right place
    // to be slow. Little-endian throughout, as glTF requires.
    if (bv.byteStride && bv.byteStride !== n * Ctor.BYTES_PER_ELEMENT) {
      const get = DVGET[Ctor.name];
      if (!get) throw new Error('interleaved accessor ' + i + ': no reader for ' + Ctor.name);
      const dv = new DataView(buf), out = new Ctor(a.count * n);
      const bpe = Ctor.BYTES_PER_ELEMENT, stride = bv.byteStride;
      for (let e = 0; e < a.count; e++) {
        const base = off + e * stride;
        for (let c = 0; c < n; c++) out[e * n + c] = dv[get](base + c * bpe, true);
      }
      return out;
    }
    return new Ctor(buf, off, a.count * n);
  }

  // Column-major, matching M and GLSL — but written here rather than borrowed, because math.js
  // has not loaded yet and this file must not wait for it.
  function mulMat(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }

  // A node carries either a baked matrix or a translation/rotation/scale triple. glTF's matrix
  // is column-major, which is this project's layout too, so it passes straight through.
  function nodeMatrix(n) {
    if (n.matrix) return new Float32Array(n.matrix);
    const t = n.translation || [0, 0, 0], s = n.scale || [1, 1, 1];
    const q = n.rotation || [0, 0, 0, 1];
    const [x, y, z, w] = q;
    const r = [
      1 - 2 * (y * y + z * z), 2 * (x * y + z * w),     2 * (x * z - y * w),
      2 * (x * y - z * w),     1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
      2 * (x * z + y * w),     2 * (y * z - x * w),     1 - 2 * (x * x + y * y),
    ];
    const o = new Float32Array(16);
    for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[c * 4 + k] = r[c * 3 + k] * s[c];
    o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1;
    return o;
  }

  // ---------------------------------------------------------------- one model
  //
  // Primitives are merged by material. A stove arrives as nineteen meshes and would otherwise
  // be nineteen draw calls every frame, twice — which is the cost this renderer is already
  // most short of. Merging by material keeps one draw per distinct surface, which is also the
  // grouping the texture work will need.
  function assemble(g, bins) {
    const groups = new Map();                 // material index -> arrays
    const IDENT = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

    const walk = (idx, parent) => {
      const node = g.nodes[idx];
      const world = mulMat(parent, nodeMatrix(node));
      if (node.mesh !== undefined) {
        for (const prim of g.meshes[node.mesh].primitives) {
          if (prim.mode !== undefined && prim.mode !== 4) continue;   // triangles only
          const key = prim.material === undefined ? -1 : prim.material;
          let G = groups.get(key);
          if (!G) groups.set(key, G = { pos: [], nor: [], uv: [], idx: [], n: 0 });

          const P = readAccessor(g, bins, prim.attributes.POSITION);
          const N = prim.attributes.NORMAL !== undefined
            ? readAccessor(g, bins, prim.attributes.NORMAL) : null;
          const T = prim.attributes.TEXCOORD_0 !== undefined
            ? readAccessor(g, bins, prim.attributes.TEXCOORD_0) : null;
          const I = prim.indices !== undefined ? readAccessor(g, bins, prim.indices) : null;
          const count = P.length / 3;

          for (let v = 0; v < count; v++) {
            const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
            G.pos.push(world[0] * x + world[4] * y + world[8]  * z + world[12],
                       world[1] * x + world[5] * y + world[9]  * z + world[13],
                       world[2] * x + world[6] * y + world[10] * z + world[14]);
            // Normals take the rotation but not the translation, and are renormalised because
            // a scaled node would otherwise hand the shader a non-unit normal and light the
            // prop wrongly. Non-uniform scale would want the inverse transpose; none of these
            // assets has any, and a wrong normal here would be visible immediately.
            let nx = 0, ny = 1, nz = 0;
            if (N) {
              const a = N[v * 3], b = N[v * 3 + 1], c = N[v * 3 + 2];
              nx = world[0] * a + world[4] * b + world[8]  * c;
              ny = world[1] * a + world[5] * b + world[9]  * c;
              nz = world[2] * a + world[6] * b + world[10] * c;
              const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
            }
            G.nor.push(nx, ny, nz);
            G.uv.push(T ? T[v * 2] : 0, T ? T[v * 2 + 1] : 0);
          }
          if (I) for (let k = 0; k < I.length; k++) G.idx.push(G.n + I[k]);
          else for (let k = 0; k < count; k++) G.idx.push(G.n + k);
          G.n += count;
        }
      }
      for (const c of node.children || []) walk(c, world);
    };

    const roots = (g.scenes && g.scenes[g.scene || 0].nodes) || g.nodes.map((_, i) => i);
    for (const r of roots) walk(r, IDENT);

    // Bounds are measured off the transformed vertices rather than taken from the accessor
    // min/max, which are in the mesh's own space and wrong the moment a node moves it. The
    // draw loop culls on this, so a wrong figure here makes props vanish or linger.
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const parts = [];
    for (const [mat, G] of groups) {
      for (let i = 0; i < G.pos.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (G.pos[i + k] < lo[k]) lo[k] = G.pos[i + k];
          if (G.pos[i + k] > hi[k]) hi[k] = G.pos[i + k];
        }
      const m = mat >= 0 && g.materials ? g.materials[mat] : null;
      const pbr = m && m.pbrMetallicRoughness;
      const bc = (pbr && pbr.baseColorFactor) || [0.8, 0.8, 0.8, 1];
      // Where the colour actually lives. A photographed asset carries white in its base colour
      // factor and everything else in the map, so without this a model is a pale ghost.
      const imgUri = ref => {
        if (!ref || !g.textures) return null;
        const t = g.textures[ref.index];
        if (!t || t.source === undefined || !g.images || !g.images[t.source]) return null;
        return g.images[t.source].uri || null;
      };
      const armUri = imgUri(pbr && pbr.metallicRoughnessTexture);
      parts.push({
        pos: new Float32Array(G.pos), nor: new Float32Array(G.nor),
        uv: new Float32Array(G.uv), idx: new Uint32Array(G.idx),
        // Keep the real submitted work beside the geometry. Static scene budgets cannot infer a
        // downloaded mesh's cost from its generated name, and treating every glTF part as a
        // 36-index box would let a high-poly replacement pass unnoticed.
        indexCount: G.idx.length,
        color: [bc[0], bc[1], bc[2]],
        uri: imgUri(pbr && pbr.baseColorTexture), img: null, tex: null,
        nrmUri: imgUri(m && m.normalTexture), nrmImg: null, nrm: null,
        // glTF packs ambient occlusion, roughness and metalness into one image (R/G/B).
        // Build does not need a new prop field for it: the renderer associates this image with an
        // existing surface texture below, which already follows every downloaded model through
        // the draw and batch paths. Factors remain separate because glTF applies them on top of
        // the sampled channels rather than baking them into the bitmap.
        armUri, armImg: null,
        // Older Poly Haven exports name a genuine AO/rough/metal packing `_arm`; a few plant
        // exports instead point glTF's metallicRoughness slot at a grayscale `_rough` image.
        // Sampling red as AO from the latter would paint its roughness into its indirect light.
        armAO: !!(armUri && /_arm(?:_|\.)/i.test(armUri)),
        roughness: pbr && pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1,
        metallic: pbr && pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1,
      });
    }
    if (!parts.length) throw new Error('no triangles');
    return { parts, lo, hi };
  }

  // ---------------------------------------------------------------- rigs
  //
  // A skinned character, which is a different animal from the props above. A prop is geometry
  // with a matrix; a character is geometry bound to a skeleton, where every vertex names up to
  // four bones and how much each of them owns it. The mesh is authored once in a rest pose and
  // bent into every other pose by the bones, so shoulders and elbows deform instead of being
  // the seam between two capsules — which is the ceiling the primitive rig cannot get past.
  //
  // Kept separate from `one()` deliberately. Merging primitives by material is right for a
  // stove and wrong for a character: a skinned primitive carries joint indices into its own
  // skin, and merging two of them silently reassigns half the vertices to the wrong bones.
  const rigs = {};
  // rig name -> { promise, controller, generation, cancelled }. Generation makes a completion
  // harmless after the player has already left its room: a fetch can win a race with abort(), but
  // it still cannot publish an off-place body or upload it into a new scene.
  const rigInflight = {};
  const rigPins = new Set();                 // every authored identity belonging to this place
  let nextRigGeneration = 0;
  const MIB = 1024 * 1024;
  const RIG_LIMITS = Object.freeze({
    gpuSoftBytes:320*MIB, gpuHardBytes:384*MIB,
    cpuSoftBytes:96*MIB, cpuHardBytes:128*MIB,
    maxResidents:28, minIdleMs:12000,
  });
  const rigNow = () => typeof performance !== 'undefined' && performance.now
    ? performance.now() : Date.now();
  const abortError = () => { const e=new Error('rig load cancelled'); e.name='AbortError'; return e; };

  function rigCpuBytes(r) {
    if (!r) return 0;
    let bytes=0;
    const arrays=new Set(), bitmaps=new Set(), blobs=new Set();
    const addArray=a=>{ if(a&&ArrayBuffer.isView(a)&&!arrays.has(a)){arrays.add(a);bytes+=a.byteLength;} };
    const addBitmap=b=>{
      if(!b||bitmaps.has(b)) return;
      bitmaps.add(b); bytes+=Math.max(0,(Number(b.width)||0)*(Number(b.height)||0)*4);
    };
    const addBlob=b=>{if(b&&typeof b.size==='number'&&!blobs.has(b)){blobs.add(b);bytes+=b.size;}};
    addArray(r.parent); addArray(r._out);
    for(const a of r.local||[]) addArray(a);
    for(const a of r.ibm||[]) addArray(a);
    for(const a of r._world||[]) addArray(a);
    for(const p of r.parts||[]) {
      addArray(p.pos); addArray(p.nor); addArray(p.uv); addArray(p.joint);
      addArray(p.weight); addArray(p.idx); addBitmap(p.img);
    }
    if(r.imageBlobs)for(const blob of r.imageBlobs.values())addBlob(blob);
    return bytes;
  }

  function rigGpuBytes(r) {
    if (!r || typeof R === 'undefined') return 0;
    let bytes=0;
    const meshes=new Set(), textures=new Set();
    if(r.meshIds) for(const id of r.meshIds) if(id&&!meshes.has(id)) {
      meshes.add(id); bytes+=typeof R.meshBytes==='function'?R.meshBytes(id):0;
    }
    for(const tier of Object.values(r.uploadedByLod||{})) for(const p of tier||[]) {
      if(p.mesh&&!meshes.has(p.mesh)) {
        meshes.add(p.mesh); bytes+=typeof R.meshBytes==='function'?R.meshBytes(p.mesh):(p.meshBytes||0);
      }
      if(p.tex&&!textures.has(p.tex)) {
        textures.add(p.tex); bytes+=typeof R.textureBytes==='function'?R.textureBytes(p.tex):(p.textureBytes||0);
      }
    }
    // A decoded rig can own uploaded textures before a tier cache is installed if an exception
    // interrupts upload. Include that edge in the report and dispose it exactly once below.
    if(r.textureByImage) for(const t of r.textureByImage.values()) if(t&&!textures.has(t)) {
      textures.add(t); bytes+=typeof R.textureBytes==='function'?R.textureBytes(t):0;
    }
    return bytes;
  }

  // Release a built rig that was never published (normally an aborted stale load). No WebGL
  // handles exist in this path; closing each shared bitmap once is the deterministic part.
  function releaseRigCpu(r) {
    if(!r) return;
    const closed=new Set();
    for(const p of r.parts||[]) {
      if(p.img&&!closed.has(p.img)) {
        closed.add(p.img); if(typeof p.img.close==='function') p.img.close();
      }
      p.img=p.tex=null; p.pos=p.nor=p.uv=p.joint=p.weight=p.idx=null;
    }
    if(r.textureByImage) r.textureByImage.clear();
    if(r.imageBlobs)r.imageBlobs.clear();
    if(r.previewImageInfo)r.previewImageInfo.clear();
    if(r.previewDemandByLod)r.previewDemandByLod.clear();
    r.previewCancelled=true;
    if(r.previewInflight)r.previewInflight.clear();
    if(r.previewRetryAt)r.previewRetryAt.clear();
    if(r.meshIds) r.meshIds.clear();
    r.parts=[]; r.joints=[]; r.parent=null; r.local=[]; r.ibm=[]; r.names=[];
    r.skins=[]; r.dropped=[]; r.lods=[]; r.axis=null;
    r.textureByImage=null; r.meshIds=null;r.imageBlobs=null;r.previewImageInfo=null;
    r.previewDemandByLod=null;
    r.previewInflight=r.previewRetryAt=null;
    r._world=r._out=r._zones=r._roles=r._order=null;
  }

  // .glb is one file: a 12-byte header then length-tagged chunks, JSON first and the binary
  // buffer second. The models above are .gltf with the buffer beside them; the rigs are .glb,
  // so both shapes have to be read.
  function parseGLB(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a glb');
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      off += 8;
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, len)));
      else if (type === 0x004E4942) bin = buf.slice(off, off + len);
      off += len + (len % 4 ? 4 - len % 4 : 0);
    }
    if (!json) throw new Error('glb has no json chunk');
    return { json, bin };
  }

  function previewMipBytes(source){
    let w=Math.max(1,Number(source&&source.width)||0)|0,
      h=Math.max(1,Number(source&&source.height)||0)|0,bytes=0;
    for(;;){bytes+=w*h*4;if(w===1&&h===1)return bytes;
      w=Math.max(1,w>>1);h=Math.max(1,h>>1);}
  }

  // A 4x4 identity, fresh each call: these end up stored per joint and must not alias.
  const ident4 = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

  async function rig(name, path, signal) {
    // Character files are rebuilt in place while their stable manifest names stay the same.
    // Bypass the HTTP cache so a reload cannot keep yesterday's GLB behind today's scripts.
    const { json: g, bin } = parseGLB(await (await fetch(RIGBASE + path,
      { cache: 'no-store', signal })).arrayBuffer());
    if(signal&&signal.aborted) throw abortError();
    const bins = [bin];
    if (!g.skins || !g.skins.length) throw new Error('no skin');

    // ------------------------------------------------------------ more than one skin in a file
    //
    // This used to take `g.skins[0]` and then collect skinned primitives from the whole node
    // tree, which is two decisions that only agree when a file has exactly one skin. A glTF
    // primitive's JOINTS_0 holds indices into *its own node's skin*, not into the file, so a
    // primitive under skin[1] had its joint numbers read against skin[0]'s list and came out
    // bound to whatever bones happened to sit at those positions.
    //
    // Soldier.glb is the case in the repository: skin[0] is the 49-joint body, skin[1] is a
    // two-joint skin for the helmet visor holding Neck and Head. The visor's joint 0 and 1 mean
    // Neck and Head; read against skin[0] they mean Hips and Spine. So the visor was skinned to
    // the pelvis.
    //
    // It was invisible, and worth understanding why, because the same trap will swallow the next
    // asset. In the *bind* pose every joint's skinning matrix — world times inverse bind — is the
    // same matrix, the one that converts the mesh's authoring space into the scene's. So every
    // wrong bone gives exactly the right answer, and the bind-pose render that "proved the
    // pipeline" could not have failed. The error only appears once two joints differ, i.e. once
    // the character is posed. Measured on Soldier with a pitch through the spine: the body's head
    // sits at y 1.285-1.567 and the visor floats at y 1.556-1.671, off the top of the skull.
    //
    // The fix is a union rather than a per-skin build, and that choice is forced by the consumer:
    // Rig.draw passes ONE bone array to every part of a character, so a rig with two independent
    // bone arrays could not be drawn without a change in rig.js, which this file does not own.
    // A union costs nothing here — the skins of a real character overlap almost completely, and
    // Soldier's union is 49 joints, exactly what skin[0] was. Each primitive keeps a remap table
    // from its own skin's numbering into the union, applied once at load.
    //
    // Pass one only finds the primitives and the skins they use; the joint list cannot be built
    // until it is known which skins are in play.
    const found = [];                          // { prim, skin, lod } in draw order
    const usedSkins = [];
    const walk = (idx) => {
      const node = g.nodes[idx];
      if (node.mesh !== undefined && node.skin !== undefined && g.skins[node.skin]) {
        // A packed character carries decimated copies of the same authored body.  The export
        // writes the tier both as an extra and into the node name so the file remains readable
        // in tools that discard custom properties.  Ordinary one-mesh rigs are LOD0.
        const namedLod = /^LOD([012])__/.exec(node.name || '');
        const extraLod = node.extras && Number(node.extras.game_lod);
        const lod = Number.isInteger(extraLod) && extraLod >= 0 && extraLod <= 2
          ? extraLod : namedLod ? +namedLod[1] : 0;
        for (const prim of g.meshes[node.mesh].primitives) {
          if (prim.mode !== undefined && prim.mode !== 4) continue;
          const A = prim.attributes;
          if (A.JOINTS_0 === undefined || A.WEIGHTS_0 === undefined) continue;
          found.push({ prim, skin: node.skin, lod });
          if (usedSkins.indexOf(node.skin) < 0) usedSkins.push(node.skin);
        }
      }
      for (const c of node.children || []) walk(c);
    };
    const roots = (g.scenes && g.scenes[g.scene || 0].nodes) || g.nodes.map((_, i) => i);
    for (const r of roots) walk(r);
    if (!found.length) throw new Error('no skinned primitives');
    usedSkins.sort((a, b) => a - b);

    // The union, seeded with the lowest-numbered skin in its own order so that a single-skin file
    // — which is all of them but Soldier — produces exactly the joint list it produced before.
    const joints = [], ibm = [];
    const jointSlot = new Map();               // glTF node index -> slot in the shader's bone array
    const remap = {};                          // skin index -> Int32Array, its joint list -> slots
    const dropped = [];
    for (const s of usedSkins) {
      const sk = g.skins[s];
      const flat = sk.inverseBindMatrices !== undefined
        ? readAccessor(g, bins, sk.inverseBindMatrices) : null;
      const mine = j => flat ? flat.slice(j * 16, j * 16 + 16) : ident4();
      // A node shared between two skins must carry the same inverse bind matrix in both, or one
      // bone array cannot serve both and the union is not a legal simplification. It does agree
      // in practice — an inverse bind matrix is a property of where the node was when the mesh
      // was bound, so two skins over one skeleton derive it from the same place, and Soldier's
      // two shared joints match to the bit. But "in practice" is what the skin[0] bug was, so
      // it is checked, and a skin that disagrees loses its primitives instead of drawing them
      // wrong. Never the first skin: that one is the character.
      let clash = null;
      for (let j = 0; j < sk.joints.length && !clash; j++) {
        const have = jointSlot.has(sk.joints[j]) ? ibm[jointSlot.get(sk.joints[j])] : null;
        if (!have) continue;
        const m = mine(j);
        for (let k = 0; k < 16; k++)
          if (Math.abs(have[k] - m[k]) > 1e-4) { clash = g.nodes[sk.joints[j]].name || ('node' + sk.joints[j]); break; }
      }
      if (clash && s !== usedSkins[0]) {
        dropped.push('skin ' + s + ' (' + (sk.name || '?') + '): inverse bind matrix for ' + clash
                     + ' disagrees with the body skin, cannot share one bone array');
        continue;
      }
      const table = new Int32Array(sk.joints.length);
      for (let j = 0; j < sk.joints.length; j++) {
        const nd = sk.joints[j];
        if (!jointSlot.has(nd)) { jointSlot.set(nd, joints.length); joints.push(nd); ibm.push(mine(j)); }
        table[j] = jointSlot.get(nd);
      }
      remap[s] = table;
    }

    // What the renderer can actually hold. drawSkinned clamps to its own MAXBONES with a
    // Math.min and says nothing, so a skeleton one bone over the budget does not fail — it draws
    // with the tail of the skeleton missing, which reads as a character whose hands or feet are
    // welded to the origin. Better to refuse it here: loadRig catches, failures() names it, and
    // the caller falls back to the primitive figure, which is a correct picture of a person.
    // Guarded on R existing at all because this file is allowed to run before gl.js does.
    const budget = typeof R !== 'undefined' && R.skinning ? R.skinning.maxBones : 0;
    if (budget && joints.length > budget)
      throw new Error(joints.length + ' joints, over the renderer\'s ' + budget + '-bone budget');

    // The skeleton, as plain data: a parent index and a local rest transform per joint. This is
    // what a pose is applied to — the game's own gaitPose already produces exactly these joint
    // rotations, so it can drive this directly rather than being thrown away with the old rig.
    const parent = new Int32Array(joints.length).fill(-1);
    for (let i = 0; i < g.nodes.length; i++)
      for (const c of g.nodes[i].children || []) {
        const s = jointSlot.get(c);
        if (s !== undefined) parent[s] = jointSlot.has(i) ? jointSlot.get(i) : -1;
      }
    // Transforms above the skeleton, folded into the root joint.
    //
    // A skeleton usually does not sit at the top of the scene. CesiumMan's hangs under two plain
    // nodes: `Z_UP`, which is the Z-up-to-Y-up correction, and `Armature`, a quarter turn. Those
    // are not joints, so a parent array built only from joint-to-joint links records the root
    // joint's parent as -1 and loses both — and the character renders lying on its side at the
    // wrong scale, which is exactly what it did.
    //
    // So the tree is walked from the scene roots carrying the accumulated transform, and the
    // first joint on each branch takes what was above it into its own local matrix. Everything
    // below inherits it through the normal parent chain.
    const prefix = new Map();
    const collect = (idx, acc, underJoint) => {
      const node = g.nodes[idx];
      const isJoint = jointSlot.has(idx);
      if (isJoint && !underJoint) prefix.set(jointSlot.get(idx), acc);
      const next = isJoint || underJoint ? null : mulMat(acc, nodeMatrix(node));
      for (const c of node.children || []) collect(c, next, isJoint || underJoint);
    };
    const IDENT4 = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    for (const r of roots) collect(r, IDENT4, false);
    const local = joints.map((n, i) => {
      const m = nodeMatrix(g.nodes[n]);
      const pre = prefix.get(i);
      return pre ? mulMat(pre, m) : m;
    });

    // ------------------------------------------------------------ pass two: the geometry
    //
    // Now that the union exists, each primitive's joint indices can be moved into it. Textures
    // are gathered by glTF *image* index rather than per part, because parts share them: both of
    // Soldier's materials name the same diffuse map, and the two eyes of the Ready Player Me
    // avatar are one material drawn twice. Decoding each image once turns those into one
    // ImageBitmap and, in uploadRig below, one GPU texture.
    const parts = [];
    const blobs = new Map();                   // glTF image index -> Blob, decoded once below
    for (const { prim, skin: si, lod } of found) {
      if (!remap[si]) continue;                // a skin dropped above; its reason is in `dropped`
      const A = prim.attributes;
      const P = readAccessor(g, bins, A.POSITION);
      const N = A.NORMAL !== undefined ? readAccessor(g, bins, A.NORMAL) : null;
      const T = A.TEXCOORD_0 !== undefined ? readAccessor(g, bins, A.TEXCOORD_0) : null;
      const J = readAccessor(g, bins, A.JOINTS_0);
      const W = readAccessor(g, bins, A.WEIGHTS_0);
      const I = prim.indices !== undefined ? readAccessor(g, bins, prim.indices) : null;
      const n = P.length / 3;
      // Joints arrive as bytes or shorts and weights as floats; the attribute buffers are
      // float either way, because one vertex format for everything is worth more than the
      // few kilobytes a packed one would save on a handful of characters. The index that goes
      // in is the union slot, not the file's — that translation is the whole point of the pass.
      // An index past the end of its own skin's list is a corrupt file; it is given zero weight
      // rather than slot 0, so a bad vertex disappears instead of being dragged to the hips.
      const tbl = remap[si];
      const jf = new Float32Array(n * 4), wf = new Float32Array(n * 4);
      for (let i = 0; i < n * 4; i++) {
        const j = J[i];
        if (j >= 0 && j < tbl.length) { jf[i] = tbl[j]; wf[i] = W[i]; }
      }
      // The character's own texture. In a .glb the image is not a file beside the model —
      // it is a slice of the binary chunk, named by bufferView rather than by URI, which is
      // why the prop loader's URI path finds nothing here. A .glb may still point out of
      // itself with a URI, so both are handled; anything else leaves the part untextured and
      // wearing the flat colour its caller passes, which is a fallback and not a failure.
      let imgIx = null, alphaCutoff = 0;
      const mat = prim.material !== undefined && g.materials ? g.materials[prim.material] : null;
      const pbr = mat && mat.pbrMetallicRoughness;
      const materialName = String((mat && mat.name) || '').toLowerCase();
      // The shared scene shader uses masked transparency for character hair, brows and eyes.
      // Sorting six independently skinned BLEND parts every frame would be both slower and less
      // stable; a low coverage threshold preserves the fine edge pixels without black cards.
      if (mat && mat.alphaMode === 'MASK') alphaCutoff = mat.alphaCutoff === undefined ? 0.5 : mat.alphaCutoff;
      else if (mat && mat.alphaMode === 'BLEND') {
        // One threshold is visibly wrong for three very different cutouts. Hair needs enough of
        // a clip to remove the sparse black dots below the hairline; eyebrows need a softer edge;
        // the eye sheet only needs its unused background gone. Names are stable MPFB material
        // identities, not character names, so every preset gets the same correction.
        alphaCutoff = /hair|short\d|bob\d|braid|ponytail|afro|long\d/.test(materialName) ? 0.20
                    : /eyebrow/.test(materialName) ? 0.12
                    : /eye|low-poly|high-poly/.test(materialName) ? 0.025 : 0.08;
      }
      const bct = pbr && pbr.baseColorTexture;
      if (bct && g.textures && g.images) {
        const src = g.textures[bct.index];
        const im = src && src.source !== undefined ? g.images[src.source] : null;
        if (im && !blobs.has(src.source)) {
          if (im.bufferView !== undefined) {
            const bv = g.bufferViews[im.bufferView];
            blobs.set(src.source,
              new Blob([new Uint8Array(bins[bv.buffer], bv.byteOffset || 0, bv.byteLength)],
                       { type: im.mimeType || 'image/png' }));
          } else if (im.uri) {
            blobs.set(src.source, im.uri);     // fetched below; a string rather than a Blob
          }
        }
        if (im && blobs.has(src.source)) imgIx = src.source;
      }
      parts.push({
        pos: new Float32Array(P), nor: N ? new Float32Array(N) : new Float32Array(n * 3),
        uv: T ? new Float32Array(T) : new Float32Array(n * 2),
        joint: jf, weight: wf, imgIx, img: null, tex: null, alphaCutoff,
        materialName, lod, doubleSided: !!(mat && mat.doubleSided),
        roughness: pbr && pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 0.84,
        idx: I ? new Uint32Array(I) : new Uint32Array(Array.from({ length: n }, (_, k) => k)),
      });
    }
    if (!parts.length) throw new Error('no skinned primitives survived skin selection');

    const bitmaps = new Map();
    // ImageBitmaps still close immediately after WebGL upload. An opt-in WebGPU session retains
    // only the compressed source Blob so an owner evicted from the smaller comparison cache can
    // be decoded again without refetching the GLB or keeping decoded pixels alive.
    const keepImageBlobs=typeof WebGPUPreview!=='undefined'&&WebGPUPreview.requested;
    const imageBlobs=keepImageBlobs?new Map():null;
    const dir = RIGBASE + path.replace(/[^/]+$/, '');
    await Promise.all([...blobs].map(async ([ix, b]) => {
      try {
        const blob = typeof b === 'string'
          ? await (await fetch(dir + b, { cache: 'no-store', signal })).blob() : b;
        if(imageBlobs)imageBlobs.set(ix,blob);
        bitmaps.set(ix, await createImageBitmap(blob));
      } catch (e) { if(!(signal&&signal.aborted)) { /* a character without its map still has a body */ } }
    }));
    if(signal&&signal.aborted) {
      for(const bmp of bitmaps.values()) if(bmp&&typeof bmp.close==='function') bmp.close();
      throw abortError();
    }
    for (const p of parts) if (p.imgIx !== null) p.img = bitmaps.get(p.imgIx) || null;
    const previewImageInfo=keepImageBlobs?new Map():null;
    if(previewImageInfo)for(const p of parts)
      if(p.imgIx!==null&&p.img&&!previewImageInfo.has(p.imgIx))
        previewImageInfo.set(p.imgIx,previewMipBytes(p.img));

    const built = { name, parts, joints, parent, local, ibm, bones: joints.length,imageBlobs,
                    previewImageInfo,previewDemandByLod:keepImageBlobs?new Map():null,
                    lods: [...new Set(parts.map(p => p.lod))].sort((a, b) => a - b),
                    // Which local axis bends a limb on this skeleton. A property of the asset,
                    // not of the poses: a downloaded rig's bones point wherever the artist left
                    // them, and the only way to know is to bend one and look.
                    axis: RIG_AXIS[name] || { bend: 'x', sign: 1 },
                    names: joints.map(n => g.nodes[n].name || ('joint' + n)),
                    // What the union was made of, so a wrong character can be diagnosed without
                    // reopening the file: which skins went in, and any that were refused.
                    skins: usedSkins.slice(), dropped,
                    textures: parts.filter(p => p.img).length + '/' + parts.length + ' parts' };
    return built;
  }

  // ---------------------------------------------------------------- loading
  async function one(name, path) {
    const base = BASE + path.replace(/[^/]+$/, '');
    const g = await (await fetch(BASE + path)).json();
    const bins = [];
    for (const b of g.buffers) {
      if (!b.uri) throw new Error('glb-embedded buffer');
      bins.push(await (await fetch(base + b.uri)).arrayBuffer());
    }
    const built = assemble(g, bins);
    built.name = name;
    // The albedo maps, decoded now and uploaded later. A part whose image will not load keeps
    // its flat base colour rather than taking the whole model down with it.
    const grab = async u => {
      try { return await createImageBitmap(await (await fetch(base + u)).blob()); }
      catch (e) { return null; }
    };
    await Promise.all(built.parts.map(async p => {
      if (p.uri) p.img = await grab(p.uri);
      if (p.nrmUri) p.nrmImg = await grab(p.nrmUri);
      if (p.armUri) p.armImg = await grab(p.armUri);
    }));
    // Where the model sits relative to its own origin. Poly Haven stands things on y=0, so
    // this is normally 0 — but a model whose origin is at its centre would sink into the floor
    // without it, and a scene should not have to know which is which.
    built.foot = built.lo[1];
    built.r = 0.5 * Math.hypot(built.hi[0] - built.lo[0],
                               built.hi[1] - built.lo[1],
                               built.hi[2] - built.lo[2]);
    built.mid = [(built.lo[0] + built.hi[0]) / 2,
                 (built.lo[1] + built.hi[1]) / 2,
                 (built.lo[2] + built.hi[2]) / 2];
    parsed[name] = built;
    return built;
  }

  // ---------------------------------------------------------------- static-model residency ledger
  // This is accounting only, not an eviction policy. Static props live in `parsed` for the life of
  // the page today, but keeping their real ownership and byte costs in one report makes a future
  // room/deck release policy measurable before it becomes destructive. Rigs and tiling materials
  // have separate stores/reports and are deliberately absent here.
  function modelCpuStats(model) {
    let typedArrayBytes = 0, decodedBitmapBytes = 0;
    const arrays = new Set(), bitmaps = new Set();
    const addArray = value => {
      if (!value || !ArrayBuffer.isView(value) || arrays.has(value)) return;
      arrays.add(value); typedArrayBytes += value.byteLength;
    };
    const addBitmap = value => {
      if (!value || bitmaps.has(value)) return;
      bitmaps.add(value);
      decodedBitmapBytes += Math.max(0,
        (Number(value.width) || 0) * (Number(value.height) || 0) * 4);
    };
    for (const part of model && model.parts || []) {
      addArray(part.pos); addArray(part.nor); addArray(part.uv); addArray(part.idx);
      addBitmap(part.img); addBitmap(part.nrmImg); addBitmap(part.armImg);
    }
    return { typedArrayBytes, decodedBitmapBytes };
  }

  function modelGpuStats(parts) {
    let meshBytes = 0, textureBytes = 0;
    const meshes = new Set(), textures = new Set();
    if (typeof R === 'undefined') return { meshBytes, textureBytes };
    for (const part of parts || []) {
      if (part.mesh && !meshes.has(part.mesh)) {
        meshes.add(part.mesh);
        meshBytes += typeof R.meshBytes === 'function'
          ? R.meshBytes(part.mesh) : (part.meshBytes || 0);
      }
      for (const texture of [part.tex, part.nrm]) {
        if (!texture || textures.has(texture)) continue;
        textures.add(texture);
        textureBytes += typeof R.textureBytes === 'function'
          ? R.textureBytes(texture) : (part.textureBytes || 0);
      }
    }
    return { meshBytes, textureBytes };
  }

  function modelOwnership(name) {
    const rooms = Object.keys(ROOMS).filter(room => (ROOMS[room] || []).includes(name)).sort();
    const decks = Object.keys(DECK_ROOMS).filter(deck => (DECK_ROOMS[deck] || []).includes(name))
      .map(deck => Number.isFinite(Number(deck)) ? Number(deck) : deck)
      .sort((a, b) => typeof a === 'number' && typeof b === 'number'
        ? a - b : String(a).localeCompare(String(b)));
    const bootRooms = rooms.filter(room => BOOT_ROOMS.includes(room));
    return { rooms, decks, bootRooms };
  }

  function resourceStats() {
    const models = Object.keys(MANIFEST).sort().map(name => {
      const model = parsed[name] || null, uploadedParts = uploaded[name] || null;
      const cpu = modelCpuStats(model), gpu = modelGpuStats(uploadedParts);
      const partCount = model ? model.parts.length : 0;
      const indexCount = model ? model.parts.reduce((sum, part) =>
        sum + (part.indexCount === undefined ? (part.idx ? part.idx.length : 0) : part.indexCount), 0) : 0;
      return {
        name, manifestPath: MANIFEST[name], parsed: !!model, uploaded: !!uploadedParts,
        partCount, indexCount,
        cpuTypedArrayBytes: cpu.typedArrayBytes,
        decodedBitmapBytes: cpu.decodedBitmapBytes,
        cpuBytes: cpu.typedArrayBytes + cpu.decodedBitmapBytes,
        gpuMeshBytes: gpu.meshBytes, gpuTextureBytes: gpu.textureBytes,
        gpuBytes: gpu.meshBytes + gpu.textureBytes,
        ownership: modelOwnership(name),
      };
    });
    const totals = {
      models: models.length,
      parsedModels: models.filter(row => row.parsed).length,
      uploadedModels: models.filter(row => row.uploaded).length,
      partCount: 0, indexCount: 0,
      cpuTypedArrayBytes: 0, decodedBitmapBytes: 0, cpuBytes: 0,
      gpuMeshBytes: 0, gpuTextureBytes: 0, gpuBytes: 0,
    };
    for (const row of models) for (const key of [
      'partCount', 'indexCount', 'cpuTypedArrayBytes', 'decodedBitmapBytes', 'cpuBytes',
      'gpuMeshBytes', 'gpuTextureBytes', 'gpuBytes',
    ]) totals[key] += row[key];
    return { totals, models };
  }

  // ---- how much of a frame may be spent handing meshes and textures to WebGL.
  //
  // A rig tier used to be uploaded entirely inside whichever frame first needed the person: one
  // R.skinMesh per part plus a texImage2D and a generateMipmap per image (gl.js:3333), all
  // synchronous. The hitch log has caught that directly — `wallMs 86, tex 6, mesh 6` on a cold
  // walk into the mall — and it is the same shape as the settle hitches STATE.md is hunting.
  //
  // ponytail: the frame boundary is inferred from a 2 ms gap between uploads. This file has no
  // frame counter and deliberately no dependencies (see the header), and the loop runs at vsync,
  // so consecutive frames are ~16 ms apart while parts within one frame are microseconds apart.
  // Swap in a real frame number if one ever reaches here.
  const UPLOAD_MS = 4;
  let uploadSpent = 0, uploadLast = 0;
  const uploadClock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  function uploadBudgetLeft() {
    const t = uploadClock();
    if (t - uploadLast > 2) uploadSpent = 0;
    uploadLast = t;
    return uploadSpent < UPLOAD_MS;
  }
  function uploadCharge(t0) {
    const t = uploadClock();
    uploadSpent += t - t0;
    uploadLast = t;
  }

  const PREVIEW_RETRY_MS=1000;
  const rigPreviewOwner=r=>String(r&&r.name||'')+'@'+String(r&&r.generation||0);
  function previewDemandForRig(r,lod){
    if(!r||!r.previewImageInfo||!r.previewDemandByLod)return null;lod=Number(lod);
    const cache=r.previewDemandByLod||(r.previewDemandByLod=new Map());
    if(cache.has(lod))return cache.get(lod);
    let meshBytes=0,supported=true,partCount=0;
    const textures=[],seenImages=new Set();
    for(const p of r.parts||[]){
      if((p.lod||0)!==lod)continue;partCount++;
      let maxIndex=0;
      for(let i=0;i<p.idx.length;i++)if(p.idx[i]>maxIndex)maxIndex=p.idx[i];
      meshBytes+=(p.pos.length+p.nor.length+p.uv.length+p.joint.length+p.weight.length)*4+
        p.idx.length*(maxIndex>65535?4:2);
      const id=p.imgIx;
      if(id===null||id===undefined||!r.previewImageInfo||!r.previewImageInfo.has(id)){
        supported=false;continue;
      }
      if(!seenImages.has(id)){
        seenImages.add(id);textures.push({id,bytes:r.previewImageInfo.get(id)});
      }
    }
    if(!partCount||partCount>9||!meshBytes||!textures.length||textures.length>9)supported=false;
    const demand={owner:rigPreviewOwner(r),lod,meshBytes,textures,supported};
    cache.set(lod,demand);return demand;
  }
  function rigPreviewManifest(r,lod,sources){
    if(!r||!Array.isArray(r.parts))return null;
    const meshes=[],textures=[],seenTextures=new Set();
    for(let i=0;i<r.parts.length;i++){
      const p=r.parts[i];
      if((p.lod||0)!==lod)continue;
      meshes.push({key:'rig:'+r.name+':lod'+lod+'#'+i,
        pos:p.pos,nor:p.nor,uv:p.uv,joint:p.joint,weight:p.weight,idx:p.idx});
      if(!p.tex)return null;
      if(seenTextures.has(p.tex))continue;
      const imageKey=p.imgIx===null||p.imgIx===undefined?'part'+i:p.imgIx;
      const source=sources&&sources.get(imageKey)||p.img;
      if(!source)return null;
      seenTextures.add(p.tex);textures.push({key:p.tex,id:imageKey,source});
    }
    return meshes.length&&textures.length?{meshes,textures}:null;
  }
  function captureRigPreview(r,lod,sources){
    if(!r||r.previewCancelled||typeof R==='undefined'||
        typeof R.captureSkinBundle!=='function')return false;
    if(typeof R.skinBundleState==='function'){
      const state=R.skinBundleState(rigPreviewOwner(r),lod);
      if(state==='ready')return true;
      // A decode can finish after its rig has left the current visible working set. That is a
      // deferral, not a failed upload: do not leave the one-second failure backoff behind or a
      // character that immediately re-enters view flashes through WebGL for no useful reason.
      if(state!=='missing'){
        if(state==='deferred'&&r.previewRetryAt)r.previewRetryAt.delete(lod);
        return false;
      }
    }
    const manifest=rigPreviewManifest(r,lod,sources);
    if(!manifest)return false;
    const ok=!!R.captureSkinBundle(rigPreviewOwner(r),lod,manifest);
    const retries=r.previewRetryAt||(r.previewRetryAt=new Map());
    if(ok)retries.delete(lod);else retries.set(lod,rigNow()+PREVIEW_RETRY_MS);
    return ok;
  }
  function ensureRigPreview(r,lod){
    if(!r||r.previewCancelled||!r.imageBlobs||typeof R==='undefined'||
        typeof R.skinBundleState!=='function'||typeof createImageBitmap!=='function')return false;
    const owner=rigPreviewOwner(r),state=R.skinBundleState(owner,lod);
    if(state==='ready')return true;
    if(state!=='missing')return false;
    const retries=r.previewRetryAt||(r.previewRetryAt=new Map());
    if((retries.get(lod)||0)>rigNow())return false;
    const inflight=r.previewInflight||(r.previewInflight=new Map());
    if(inflight.has(lod))return false;
    const generation=r.generation;
    retries.set(lod,rigNow()+PREVIEW_RETRY_MS);
    const task=(async()=>{
      const decoded=new Map();
      try{
        const keys=[];
        for(let i=0;i<r.parts.length;i++){
          const p=r.parts[i];if((p.lod||0)!==lod||!p.tex)continue;
          const key=p.imgIx===null||p.imgIx===undefined?'part'+i:p.imgIx;
          if(!decoded.has(key)&&!keys.includes(key))keys.push(key);
        }
        let decodeError=null;
        await Promise.all(keys.map(async key=>{
          try{
            const blob=r.imageBlobs&&r.imageBlobs.get(key);
            if(!blob)throw new Error('skin preview source unavailable');
            decoded.set(key,await createImageBitmap(blob));
          }catch(err){if(!decodeError)decodeError=err;}
        }));
        // Await every sibling even after one fails: each successful bitmap must reach the finally
        // below, including a decode that completed later than the first rejection.
        if(decodeError)throw decodeError;
        if(r.previewCancelled||rigs[r.name]!==r||r.generation!==generation)return false;
        return captureRigPreview(r,lod,decoded);
      }catch(_){return false;}
      finally{
        for(const bitmap of decoded.values())if(bitmap&&typeof bitmap.close==='function')
          {try{bitmap.close();}catch(_) {}}
      }
    })();
    inflight.set(lod,task);
    task.finally(()=>{if(r.previewInflight&&r.previewInflight.get(lod)===task)
      r.previewInflight.delete(lod);});
    return false;
  }

  function disposeRig(name) {
    const r=rigs[name];
    if(!r || rigPins.has(name) || rigInflight[name]) return false;
    r.previewCancelled=true;
    if(typeof R!=='undefined'&&typeof R.releaseSkinBundle==='function')
      {try{R.releaseSkinBundle(rigPreviewOwner(r));}catch(_) {}}
    const meshes=new Set(), textures=new Set(), closed=new Set();
    if(r.meshIds) for(const id of r.meshIds) if(id) meshes.add(id);
    for(const tier of Object.values(r.uploadedByLod||{})) for(const p of tier||[]) {
      if(p.mesh) meshes.add(p.mesh);
      if(p.tex) textures.add(p.tex);
    }
    if(r.textureByImage) for(const t of r.textureByImage.values()) if(t) textures.add(t);
    for(const p of r.parts||[]) {
      if(p.tex) textures.add(p.tex);
      if(p.img&&!closed.has(p.img)) {
        closed.add(p.img); if(typeof p.img.close==='function') p.img.close();
      }
    }
    if(typeof R!=='undefined') {
      if(typeof R.deleteMesh==='function') for(const id of meshes) R.deleteMesh(id);
      if(typeof R.deleteTexture==='function') for(const tex of textures) R.deleteTexture(tex);
    }
    delete rigs[name];
    releaseRigCpu(r);
    r.uploaded=null; r.uploadedByLod=null;
    return true;
  }

  function rigMemoryReport() {
    const now=rigNow();
    const rows=Object.keys(rigs).sort().map(name=>{
      const r=rigs[name], cpuBytes=rigCpuBytes(r), gpuBytes=rigGpuBytes(r);
      const last=r.lastTouchAt===undefined ? (r.loadedAt===undefined?now:r.loadedAt) : r.lastTouchAt;
      return { name, generation:r.generation||0, pinned:rigPins.has(name),
        inflight:!!rigInflight[name], cpuBytes, gpuBytes,
        idleMs:Math.max(0,now-last),
        lastTouchAt:last, lastTouchFrame:r.lastTouchFrame||0,
        uploadedLods:Object.keys(r.uploadedByLod||{}).map(Number).sort((a,b)=>a-b) };
    });
    const cpuBytes=rows.reduce((n,r)=>n+r.cpuBytes,0);
    const gpuBytes=rows.reduce((n,r)=>n+r.gpuBytes,0);
    return { residents:rows.length, pinned:rows.filter(r=>r.pinned).length,
      inflight:Object.keys(rigInflight).length, cpuBytes, gpuBytes,
      limits:{...RIG_LIMITS}, rigs:rows };
  }

  function trimRigs(options={}) {
    const limit={...RIG_LIMITS,...options};
    const now=rigNow(), evicted=[];
    let report=rigMemoryReport();
    const overSoft=()=>report.gpuBytes>limit.gpuSoftBytes ||
      report.cpuBytes>limit.cpuSoftBytes || report.residents>limit.maxResidents;
    const overHard=()=>report.gpuBytes>limit.gpuHardBytes || report.cpuBytes>limit.cpuHardBytes;
    const candidates=report.rigs.filter(r=>!r.pinned&&!r.inflight)
      .sort((a,b)=>a.lastTouchAt-b.lastTouchAt || a.lastTouchFrame-b.lastTouchFrame ||
        (a.name<b.name?-1:a.name>b.name?1:0));
    for(const row of candidates) {
      if(!overSoft()) break;
      // The grace avoids a doorway oscillation evicting and fetching the same people over and
      // over. Hard pressure is different: staying under the browser/driver cliff wins immediately.
      if(!overHard() && now-row.lastTouchAt<limit.minIdleMs) continue;
      if(disposeRig(row.name)) { evicted.push(row.name); report=rigMemoryReport(); }
    }
    return {...report, evicted,
      pressure:{ gpuSoft:report.gpuBytes>limit.gpuSoftBytes,
        gpuHard:report.gpuBytes>limit.gpuHardBytes,
        cpuSoft:report.cpuBytes>limit.cpuSoftBytes,
        cpuHard:report.cpuBytes>limit.cpuHardBytes,
        residents:report.residents>limit.maxResidents } };
  }

  return {
    // Called by index.html before any of the game's own scripts are appended. A model that
    // fails to load is not fatal: it is recorded, `get` returns null for it, and `Build.model`
    // falls back to whatever the scene said to draw instead. A missing chair should not be a
    // black screen.
    async preload(names, mats) {
      // Only what the rooms built during boot need. Every other room loads through setPlace's
      // demand gate, which keeps this blocking list small however large the catalogue gets.
      const want = names ||
        [...new Set(BOOT_ROOMS.flatMap(r => ROOMS[r] || []))].filter(n => MANIFEST[n]);
      failures = [];
      await Promise.all([
        ...want.map(n => one(n, MANIFEST[n])
          .catch(e => { failures.push(n + ': ' + e.message); })),
        ...(mats || EAGER_MATERIALS).map(async n => {
          try {
            const blob = await (await fetch(MATBASE + MATERIALS[n])).blob();
            matImg[n] = await createImageBitmap(blob);
            matMean[n] = measureMean(matImg[n]);
          } catch (e) { failures.push('material ' + n + ': ' + e.message); }
          // ambientCG names the OpenGL-convention normal beside the colour map. DX is there
          // too and is the same map with green flipped; taking the wrong one lights every
          // surface as though the light were on the other side, which is subtle and awful.
          try {
            const nu = MATERIALS[n].replace('_Color.jpg', '_NormalGL.jpg');
            matNrmImg[n] = await createImageBitmap(await (await fetch(MATBASE + nu)).blob());
          } catch (e) { /* a material without relief is still a material */ }
        }),
      ]);
      return { loaded: Object.keys(parsed).length,
               materials: Object.keys(matImg).length, failed: failures.slice() };
    },

    // A tiling material, uploaded on first use for the same reason the meshes are: parsing
    // happens before there is a GL context. Returns null if it never loaded, and a scene that
    // gets null simply keeps the flat colour it had.
    material(name) {
      if (matTex[name]) return matTex[name];
      if (!matImg[name]) return null;
      // The shader uses this measured mean to add surface variation without changing the
      // brightness the scene authored. The old fixed 0.22 reference made pale photographs such
      // as metal and tile lift already-white interiors by more than fourfold.
      const texture = R.texture(matImg[name], {
        mean: matMean[name] || 0.22,
        // The opt-in WebGPU comparison mirrors this colour sheet; materialNormal below publishes
        // the matching NormalGL sheet so mode 0 can retain the same three-axis whiteout relief.
        preview:'tiling',
      });
      matTex[name] = texture;
      releaseBitmap(matImg, name);
      return texture;
    },
    materialNormal(name) {
      if (matNrmTex[name]) return matNrmTex[name];
      if (!matNrmImg[name]) return null;
      const texture = R.texture(matNrmImg[name], { preview:'tiling-normal' });
      matNrmTex[name] = texture;
      releaseBitmap(matNrmImg, name);
      return texture;
    },
    materials: () => Object.keys(MATERIALS),
    // The measured mean linear luminance of a material's colour map, and what the shader's
    // fixed 0.22 divisor therefore does to anything wearing it. `lift` above 1 means the
    // surface gets brighter rather than merely textured.
    materialMean: name => matMean[name],
    materialLift: name => (matMean[name] ? matMean[name] / 0.22 : null),
    materialReport() {
      return Object.keys(MATERIALS).map(n => ({
        name: n, mean: matMean[n], lift: matMean[n] ? +(matMean[n] / 0.22).toFixed(2) : null,
      })).sort((a, b) => (b.lift || 0) - (a.lift || 0));
    },

    get: name => parsed[name] || null,
    failures: () => failures.slice(),
    names: () => Object.keys(MANIFEST),
    resourceStats,

    // ---------------------------------------------------------------- rigs
    //
    // Loaded on demand rather than at boot: there is exactly one character mesh so far and it
    // is a test dummy, and a rig is the sort of thing that will be swapped repeatedly before
    // anybody is happy with it. `RIGS` is a manifest like MANIFEST, pointing at .glb.
    loadRig(name) {
      if (rigs[name]) { rigs[name].lastTouchAt=rigNow(); return Promise.resolve(rigs[name]); }
      if (rigInflight[name]&&!rigInflight[name].cancelled) return rigInflight[name].promise;
      const path = RIGS[name];
      if (!path) return Promise.resolve(null);
      const entry={ generation:++nextRigGeneration, cancelled:false,
        controller:typeof AbortController!=='undefined'?new AbortController():null, promise:null };
      const signal=entry.controller&&entry.controller.signal;
      entry.promise=rig(name,path,signal).then(built=>{
        if(entry.cancelled || rigInflight[name]!==entry) { releaseRigCpu(built); return null; }
        const at=rigNow();
        built.generation=entry.generation; built.loadedAt=at; built.lastTouchAt=at;
        built.lastTouchFrame=0; rigs[name]=built;
        return built;
      }).catch(e=>{
        if(!entry.cancelled&&(!e||e.name!=='AbortError'))
          failures.push('rig '+name+': '+(e&&e.message||e));
        return null;
      }).finally(()=>{ if(rigInflight[name]===entry) delete rigInflight[name]; });
      rigInflight[name]=entry;
      return entry.promise;
    },
    cancelRigLoad(name) {
      const entry=rigInflight[name];
      if(!entry) return false;
      entry.cancelled=true;
      if(entry.controller) entry.controller.abort();
      return true;
    },
    rig: name => rigs[name] || null,
    rigPreviewDemand(name,lod) {
      const r=rigs[name];return r?previewDemandForRig(r,lod):null;
    },
    rigNames: () => Object.keys(RIGS),
    touchRig(name, frame) {
      const r=rigs[name]; if(!r) return false;
      r.lastTouchAt=rigNow();
      if(frame!==undefined) r.lastTouchFrame=frame;
      return true;
    },
    pinRigs(names) {
      rigPins.clear();
      if(names) for(const name of names) if(name) rigPins.add(name);
      return [...rigPins].sort();
    },
    disposeRig,
    trimRigs,
    rigMemoryReport,
    rigLimits: () => ({...RIG_LIMITS}),

    // Hand a rig's geometry to WebGL. Separate from upload() because a skinned mesh carries two
    // extra attributes and must not be merged with anything.
    // `opt.whole` ignores the frame budget and uploads the tier in one call. It exists for the
    // offline harnesses, which ask for three tiers inside one page evaluation and are measuring
    // identity and materials rather than frame pacing. Nothing in the game may pass it: doing so
    // is exactly the burst this budget exists to break up.
    uploadRig(name, wantedLod = 0, opt) {
      const r = rigs[name];
      if (!r) return null;
      const lods = r.lods && r.lods.length ? r.lods : [0];
      // Pick the closest tier the file actually contains.  This keeps every older GLB working:
      // requesting its far tier simply returns its one authored mesh, never a different person.
      let lod = lods[0];
      for (const candidate of lods)
        if (Math.abs(candidate - wantedLod) < Math.abs(lod - wantedLod)) lod = candidate;
      const cached = r.uploadedByLod || (r.uploadedByLod = {});
      if (cached[lod]) {
        // WebGL owns this tier for the rig's lifetime. WebGPU's bounded preview cache may have
        // evicted it, so rehydrate that exact generation/LOD from retained compressed sources.
        if(r.imageBlobs)ensureRigPreview(r,lod);
        return cached[lod];
      }
      // Spread across frames on the UPLOAD_MS budget above. Until the tier is whole this returns
      // null, which `draw` at rig.js:892 already handles by falling back to the procedural figure
      // — "a correct picture of a person" — rather than by drawing half a body.
      const partial = r.uploadPartial || (r.uploadPartial = {});
      const done = r.uploadDone || (r.uploadDone = {});
      const out = partial[lod] || (partial[lod] = []);
      const seen = done[lod] || (done[lod] = new Set());
      // One GPU texture per source image, not per part. A ten-part avatar whose two eyes share a
      // material would otherwise upload that sheet twice, and Soldier's body and visor materials
      // both name the same diffuse map.
      // Shared across all tiers: three meshes, one identity texture in GPU memory.
      const byImage = r.textureByImage || (r.textureByImage = new Map());
      for (let i = 0; i < r.parts.length; i++) {
        const p = r.parts[i];
        if ((p.lod || 0) !== lod || seen.has(i)) continue;
        if (!(opt && opt.whole) && !uploadBudgetLeft()) return null;
        const spentFrom = uploadClock();
        const id = 'rig:' + name + ':lod' + lod + '#' + i;
        const mesh=R.skinMesh(id,p.pos,p.nor,p.uv,p.joint,p.weight,p.idx,
          r.imageBlobs?{preview:'bundle'}:undefined);
        (r.meshIds||(r.meshIds=new Set())).add(id);
        // Clamped: a character's UVs are one fixed layout on one sheet, and wrapping would drag
        // a neighbouring island's pixels across a seam in the middle of a face.
        const key = p.imgIx === null || p.imgIx === undefined ? 'part' + i : p.imgIx;
        if (!p.tex && byImage.has(key)) p.tex = byImage.get(key);
        else if (p.img && !p.tex) {
          byImage.set(key,R.texture(p.img,r.imageBlobs
            ?{clamp:true,preview:'skin-bundle'}:{clamp:true}));
          p.tex = byImage.get(key);
        }
        // Imported people need the same surface vocabulary as the procedural cast. Skin uses the
        // shader's wrapped, per-channel light transport (mode 19); wet eyes get a tight highlight;
        // woven clothes stay broad and matte. The source roughness remains the fallback for a new
        // material whose name we do not know yet.
        const n = p.materialName || '';
        const skin = /(?:^|\.)body(?:\.|$)|skin/.test(n);
        const gloss = /eyebrow/.test(n) ? 0.08
                    : /eye|low-poly|high-poly/.test(n) ? 0.76
                    : /hair|short\d|bob\d|braid|ponytail|afro|long\d/.test(n) ? 0.30
                    : skin ? 0.28
                    : /shoe/.test(n) ? 0.38
                    : Math.max(0.08, Math.min(0.46, 1 - p.roughness));
        out.push({ mesh: id, tex: p.tex,
          meshBytes:mesh&&mesh.bytes||0,
          textureBytes:p.tex&&typeof R.textureBytes==='function'?R.textureBytes(p.tex):0,
          alphaCutoff: p.alphaCutoff || 0,
          doubleSided: !!(p.doubleSided && p.alphaCutoff > 0),
          gloss, mode: skin ? 19 : 0 });
        seen.add(i);
        uploadCharge(spentFrom);
      }
      // Every tier has the same material parts, so its first upload has uploaded every source
      // image.  Share those handles with the other tiers and release the decoded CPU bitmaps;
      // otherwise visiting a busy floor can retain tens of megabytes per resident twice.
      // Publish the complete WebGL tier first, then offer the corresponding WebGPU owner/LOD as
      // one transaction while the decoded images are still live. Offscreen preloads are simply
      // ignored by the preview; a later visible cached-tier draw rehydrates from imageBlobs.
      if (lod === 0) r.uploaded = out;
      delete partial[lod]; delete done[lod];
      cached[lod] = out;
      if(r.imageBlobs)captureRigPreview(r,lod,null);
      const closed = new Set();
      r.parts.forEach((p, i) => {
        const key = p.imgIx === null || p.imgIx === undefined ? 'part' + i : p.imgIx;
        if (!p.tex && byImage.has(key)) p.tex = byImage.get(key);
        if (p.img && !closed.has(p.img)) {
          closed.add(p.img); if (typeof p.img.close === 'function') p.img.close();
        }
        p.img = null;
      });
      return out;
    },

    // ---------------------------------------------------------------- rooms, after boot
    //
    // A room's models, fetched on demand. Repeated calls for the same room share one promise,
    // so a prefetch already in flight is never started twice.
    roomReady(room) {
      return (ROOMS[room] || []).every(n => !MANIFEST[n] || parsed[n]);
    },
    loadRoom(room) {
      if (inflight[room]) return inflight[room];
      const want = (ROOMS[room] || []).filter(n => MANIFEST[n] && !parsed[n]);
      if (!want.length) return Promise.resolve();
      return (inflight[room] = Promise.all(want.map(n => one(n, MANIFEST[n])
        .catch(e => { failures.push(n + ': ' + e.message); }))).then(() => {}));
    },

    // A deck's models, fetched when the lift is asked for that floor (APARTMENT-TODO item 414).
    // Same promise-sharing as loadRoom. Returns a resolved promise for every deck today, because
    // DECK_ROOMS is empty on purpose — see the table.
    deckReady(n) {
      return (DECK_ROOMS[n] || []).every(x => !MANIFEST[x] || parsed[x]);
    },
    loadDeck(n) {
      const key = 'deck' + n;
      if (inflight[key]) return inflight[key];
      const want = (DECK_ROOMS[n] || []).filter(x => MANIFEST[x] && !parsed[x]);
      if (!want.length) return Promise.resolve();
      return (inflight[key] = Promise.all(want.map(x => one(x, MANIFEST[x])
        .catch(e => { failures.push(x + ': ' + e.message); }))).then(() => {}));
    },

    // Compatibility prefetch, deliberately scoped to one Lazy room key. A no-argument call is a
    // no-op: expanding every ROOMS/DECK_ROOMS declaration here made the title screen download and
    // retain the whole catalogue. Normal travel uses the same loadRoom path through setPlace.
    warm(room) {
      return room === undefined ? Promise.resolve() : this.loadRoom(room);
    },

    // Hands the geometry to WebGL, once, on first use. Registration is deferred because
    // parsing happens before there is a GL context to register with.
    upload(name) {
      if (uploaded[name]) return uploaded[name];
      const m = parsed[name];
      if (!m) return null;
      const out = [];
      m.parts.forEach((p, i) => {
        const id = 'gltf:' + name + '#' + i;
        R.mesh(id, p.pos, p.nor, p.uv, p.idx);
        // Clamped, not repeated: a model's UVs are a fixed layout on one sheet, and wrapping
        // one would drag a neighbouring island's pixels across a seam.
        const armOpt = { arm: p.armImg, armAO: p.armAO,
          roughness: p.roughness, metallic: p.metallic };
        // Prefer the normal texture as the metadata carrier. A future base-textured material with
        // ARM but no normal can attach that private companion to its albedo in WebGL; textureless
        // constant-colour materials (including the wall-clock glass) have no carrier to upload.
        if (p.img && !p.tex) {
          p.tex = R.texture(p.img, { clamp: true, preview:'albedo',
            ...(p.nrmImg ? {} : armOpt) });
        }
        // Also covers a successful earlier/partial upload whose decoded source survived an
        // interrupted caller. Once the handle exists the GPU copy is authoritative.
        if (p.tex) releaseBitmap(p, 'img');
        if (p.tex && !p.nrmImg) releaseBitmap(p, 'armImg');
        if (p.nrmImg && !p.nrm) p.nrm = R.texture(p.nrmImg, {
          clamp: true, preview:'pbr', ...armOpt,
        });
        if (p.nrm) {
          releaseBitmap(p, 'nrmImg');
          releaseBitmap(p, 'armImg');
        }
        // A textureless material cannot use a packed surface map in the current shader. Do not
        // retain a decoded image forever merely because there was no carrier to upload it with.
        if (!p.img && !p.nrmImg) releaseBitmap(p, 'armImg');
        out.push({ mesh: id, color: p.color, tex: p.tex, nrm: p.nrm,
          indexCount: p.indexCount || p.idx.length });
      });
      // Publish the complete descriptor set before releasing its redundant CPU source. Nothing
      // is released on the throwing path above, so a partial texture or mesh upload can retry.
      uploaded[name] = out;
      releaseStaticGeometry(m);
      return out;
    },
  };
})();
