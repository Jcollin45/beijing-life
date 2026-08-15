// 北京新天地 — a three-level city shopping centre in the 商务区.
//
// The building is one room 46 by 36 metres, with a rectangular void cut through both upper decks so
// that from anywhere on the concourse you can look up and see where you have not been yet. Three
// things make it a mall rather than a menu:
//
//   * the shops are rooms. Every tenant is a walk-in space behind its own shopfront, with a floor,
//     a lit ceiling, side partitions, a back wall and fittings you stand among. The opening in the
//     middle of the glass is a real gap in the collision, so you go inside.
//   * the levels are floors. Two escalator banks at opposite ends of the void carry the body, and
//     the route to level three deliberately crosses the second-floor bridge over the atrium.
//   * the middle is worth standing in. Fountain, sky-lit void, hanging banners, a glass lift that
//     actually moves, and a crowd walking all three decks.
//
//   一楼  jewellery, fashion, shoes, digital, optician, flowers, café, bakery, pet shop,
//         restaurant, and the children's carousel in the open — ten units and the play court
//   二楼  beauty, books, sport, home, toys, desserts — a full ring plus the bridge
//   三楼  food court, cinema, arcade — the top floor everything smells of, as it should be
//
// That list is checked, not remembered: `TENANTS` below names every unit `shop()` actually builds
// and on which deck, and the room refuses to be built quietly if a tenant file has not registered.
// Two things above are in the description and deliberately not in `TENANTS`, because they are not
// `shop()` units and have no tenant file to miss: the carousel on one, and the food court on three
// — which is a hall of stalls this file builds inline, not a shopfront. Eighteen units, therefore,
// on a floor list that reads as twenty.
// ---------------------------------------------------------------- tenant fit-outs, per file
//
// A shop's interior is a `fit(A)` callback, and eighteen of them in this file is both a lot of
// lines and a lot of contention: one person can work on the bookshop at a time, because the
// bakery is in the same file.
//
// So a tenant may instead be authored in `js/mall-<name>.js`, which registers itself here under
// its `kind`. `shop()` prefers a registered fit over its inline one, so the version in this file
// stays as the fallback and the room still builds if a tenant file is missing, empty or a stub.
//
// That fallback used to be silent, which made it the opposite of a safety net: a module that threw
// halfway down, or was renamed, or never got into index.html, produced a mall that looked finished
// and was quietly showing the 2023 inline stand-in instead. `checkTenants()` below names the
// eighteen that must be there and shouts about any that are not — see `TENANTS`.
//
// Declared outside the Lazy body on purpose: this file is evaluated when it loads, the tenant
// files load after it, and the room is not built until somebody walks into it — by which time
// every one of them has registered. That is also why the check runs at build time and not here:
// here, none of them have registered yet.
const MallFit = {};

// Tenant fit-outs may opt into physical motion without owning the mall's frame loop.  The room
// calls these only while their floor and part of the building are relevant, so a fish tank or a
// toy railway does not cost anything while the player is two decks away.  Declared beside
// MallFit for the same load-order reason: tenant files register while they load, then the lazy
// room seals the list when it is first entered.
const MallFitTick = [];

// The people a tenant employs and the people shopping in it, declared by that tenant.
//
// This exists to keep eighteen shops out of one file. The mall's own crowd is written inline in
// game.js as a single `NPCS.push(...)` call — which is correct for a crowd that belongs to the
// building, and wrong the moment each shop wants its own staff, because eighteen authors editing
// one argument list is eighteen chances to break the game for everybody. A shop pushes its people
// here instead, in its own file, and game.js folds this into the roster once before the world is
// built. Same trick as MallFit above, same reason.
//
// An entry is an ordinary NPCS row and every field they take works here:
//
//   { hz, name, py, place:'mall', mallFloor: 1|2|3, temper,
//     look: { ... },                         // makeLook's wardrobe, as in js/data.js
//     spots: [{ h0, h1, at:[x,z], face, act }],   // staff: where they stand, and when
//     lines: [[zh, en], ...] }                    // what they say when you talk to them
//
//   { hz:'顾客', place:'mall', mallFloor, look, patrol:[[x,z], ...], speed }   // a shopper
//
// `at` and `patrol` are in the mall's own world coordinates, not the shop's (a, b) frame — a
// tenant that thinks in (a, b) has to convert, because these are people in a building rather than
// props in a unit, and a shopper's route usually leaves the shop.
const MallCast = [];

// Floor two is a working retail level, not five fitted showrooms with nobody in them. Each tenant
// gets one member of staff in a measured clear pocket and one shopper in its open customer lane.
// They are deliberately anonymous crowd entries: named, conversational tenant staff live in their
// own modules, while these figures provide occupancy without pretending to be a dialogue stop.
MallCast.push(
  {hz:'店员',place:'mall',mallFloor:2,temper:'brisk',
    look:{skin:'#ddb086',hair:'#2c2420',hairStyle:'bob',top:'#7b465f',pants:'#343b46',shoe:'#292e34',collar:'shirt',tall:.95,faceSeed:6201},
    spots:[{h0:10,h1:22,at:[-21.25,-9.65],face:Math.PI/2,act:'vend'}]},
  {hz:'顾客',place:'mall',mallFloor:2,temper:'steady',
    look:{skin:'#c89066',hair:'#211b18',hairStyle:'short',top:'#d3c4ad',pants:'#444b55',shoe:'#ece4d7',bag:'tote',bagColor:'#9b704a',tall:1.02,faceSeed:6202},
    spots:[{h0:10,h1:22,at:[-19.45,-5.25],face:-Math.PI/2,act:'browse'}]},
  {hz:'店员',place:'mall',mallFloor:2,temper:'patient',
    look:{skin:'#edbf98',hair:'#3a302a',hairStyle:'ponytail',top:'#4e6879',pants:'#353d47',shoe:'#252b31',collar:'polo',tall:.93,faceSeed:6203},
    spots:[{h0:10,h1:22,at:[-20.70,5.00],face:Math.PI/2,act:'shelve'}]},
  {hz:'顾客',place:'mall',mallFloor:2,temper:'bored',
    look:{skin:'#b97f57',hair:'#1d1917',hairStyle:'buzz',top:'#7d765e',pants:'#303844',shoe:'#e7dfd0',glasses:true,tall:1.07,wide:1.04,faceSeed:6204},
    spots:[{h0:10,h1:22,at:[-19.50,7.30],face:-Math.PI/2,act:'read'}]},
  {hz:'店员',place:'mall',mallFloor:2,temper:'eager',
    look:{skin:'#d5a078',hair:'#261f1c',hairStyle:'tousled',top:'#365f6d',pants:'#29333f',shoe:'#f0e7d8',collar:'crew',sleeve:'short',tall:1.04,faceSeed:6205},
    spots:[{h0:10,h1:22,at:[20.70,-9.85],face:-Math.PI/2,act:'vend'}]},
  {hz:'顾客',place:'mall',mallFloor:2,temper:'eager',
    look:{skin:'#e5b58d',hair:'#332925',hairStyle:'bun',top:'#b25b45',pants:'#424a55',shoe:'#292f35',pack:true,packColor:'#3e5d50',tall:.94,faceSeed:6206},
    spots:[{h0:10,h1:22,at:[19.45,-5.20],face:Math.PI/2,act:'browse'}]},
  {hz:'店员',place:'mall',mallFloor:2,temper:'genial',
    look:{skin:'#c58d64',hair:'#2d2521',hairStyle:'short',top:'#8a765e',pants:'#39414a',shoe:'#282d32',collar:'turtle',tall:1.01,faceSeed:6207},
    spots:[{h0:10,h1:22,at:[21.30,2.62],face:-Math.PI/2,act:'wait'}]},
  {hz:'顾客',place:'mall',mallFloor:2,temper:'patient',
    look:{skin:'#efc19a',hair:'#29221f',hairStyle:'bob',top:'#879489',pants:'#4b4a53',shoe:'#eee6d8',collar:'vneck',tall:.92,faceSeed:6208},
    spots:[{h0:10,h1:22,at:[19.45,7.60],face:Math.PI/2,act:'browse'}]},
  {hz:'店员',place:'mall',mallFloor:2,temper:'genial',
    look:{skin:'#d9aa81',hair:'#251f1c',hairStyle:'ponytail',top:'#c0644c',pants:'#3b4350',shoe:'#2a3036',apron:'#e7d55a',tall:.96,faceSeed:6209},
    spots:[{h0:10,h1:22,at:[-14.40,-16.25],face:0,act:'vend'}]},
  {hz:'顾客',place:'mall',mallFloor:2,temper:'eager',
    look:{skin:'#c68e66',hair:'#2a221e',hairStyle:'short',top:'#4f7793',pants:'#3e4652',shoe:'#f0cb55',hat:'cap',hatColor:'#b94e43',tall:.78,youth:.75,faceSeed:6210},
    spots:[{h0:10,h1:22,at:[-12.20,-14.45],face:Math.PI,act:'browse'}]}
);

// The north atrium pad is live at three points in the day. These are the same regulars coming
// back for a class, a runway crowd and the evening light show, so five people create three scenes
// without leaving duplicate dormant figures in the roster. Every foot point sits in the audited
// collision-free core x ±1.10, z 4.50–6.90 and faces south toward the fountain and entrance.
[
  {at:[ 0.00,6.55],look:{skin:'#c88e66',hair:'#211a18',hairStyle:'ponytail',top:'#d64b45',pants:'#273447',shoe:'#f2eee5',collar:'polo',tall:1.01,faceSeed:6401}},
  {at:[-.80,5.75],look:{skin:'#e2b18a',hair:'#302722',hairStyle:'bob',top:'#457f74',pants:'#3b4350',shoe:'#efe7d9',tall:.94,faceSeed:6402}},
  {at:[ .00,5.75],look:{skin:'#b97f58',hair:'#211b18',hairStyle:'short',top:'#e3b84b',pants:'#323945',shoe:'#252a30',tall:1.05,faceSeed:6403}},
  {at:[ .80,5.75],look:{skin:'#efc19a',hair:'#3b302b',hairStyle:'bun',top:'#7a5aa6',pants:'#454953',shoe:'#f2eadc',tall:.92,faceSeed:6404}},
  {at:[-.40,4.85],look:{skin:'#d5a078',hair:'#261f1b',hairStyle:'tousled',top:'#4e7394',pants:'#353c47',shoe:'#f0c953',tall:.98,faceSeed:6405}},
  {at:[ .40,4.85],look:{skin:'#dca983',hair:'#2b2320',hairStyle:'buzz',top:'#bd5a47',pants:'#414852',shoe:'#e9e1d4',tall:1.03,faceSeed:6406}},
].forEach((q,i)=>MallCast.push({
  hz:i?'顾客':'教练',place:'mall',mallFloor:1,temper:i?'eager':'brisk',look:q.look,
  spots:[
    {h0:10,h1:10.75,at:q.at,face:Math.PI,act:'stretch'},
    {h0:14,h1:14.75,at:q.at,face:Math.PI,act:i%2?'dance':'browse'},
    {h0:19,h1:19.75,at:q.at,face:Math.PI,act:'dance'},
  ],
}));

const Mall = Lazy('Mall', () => {
  const col = {
    // The grade the reference photographs of these places actually have: cream polished stone
    // underfoot, warm-white plaster, and a grout line only a shade off the slab it separates.
    // The old table was a cool grey — #dedbd2 floor on #aaa8a2 grout — and under one directional
    // lamp with no bounce that came out as wet concrete with a dark grid ruled across it. Every
    // large surface here has been walked two or three steps up the warm side and one step lighter,
    // which is the whole difference between "shopping centre at ten in the morning" and "car park".
    floor:C('#ddd3c2'), floor2:C('#d2c7b5'), inlay:C('#b9ac98'), grout:C('#c3b6a3'),
    wall:C('#dfd5c7'), hallCeil:C('#d2c7b7'), white:C('#f4eee4'), charcoal:C('#252b31'),
    black:C('#111519'), steel:C('#aeb7bd'), steelD:C('#6e7981'), glass:C('#9fc2d3'),
    gold:C('#d8ad48'), goldL:C('#f3d47b'), red:C('#b83f35'), redD:C('#792923'),
    jade:C('#388477'), jadeL:C('#79c4b1'), blue:C('#2b6c9e'), blueL:C('#62a5cc'),
    violet:C('#71538e'), pink:C('#d2748d'), orange:C('#d77935'), yellow:C('#e2b83e'),
    wood:C('#997451'), woodD:C('#5c4635'), fabric:C('#907b69'), green:C('#47764d'),
    greenL:C('#71a867'), water:C('#56a8c7'), screen:C('#15283e'), cream:C('#eee2cc'),
    soffit:C('#e7e1d4'), carpet:C('#8d6f68'), carpetB:C('#4c5a68'), carpetG:C('#5d7364'),
    bark:C('#6b563f'),
    // Food court professional palette: sophisticated accent colors with good contrast
    fcTeal:C('#4a8f7f'), fcMauve:C('#7d6b8f'), fcWarmGray:C('#9d8d7d'), fcCoral:C('#c97359'),
    fcSage:C('#6b8367'), fcCharcoal:C('#3a3f45'), fcCreamBG:C('#f5f0e8'),
    // The shopfit palette: warm neutral walls, matte black trim, pale stone underfoot and one
    // warm white for every light in the ceiling. Tenant colour is used sparingly against these.
    shopWall:C('#e3dbc9'),shopCeil:C('#f0ebdf'), trim:C('#2f3236'), stone:C('#e5decc'), stoneD:C('#cec6b2'),
    mat:C('#3b3f44'), warm:C('#ffeccd'),
  };
  const B = Build.scene({ wood:new Set([col.wood,col.woodD,col.bark]), fabricGloss:.04 });
  const { box,cyl,ball,capsule,taper,wall,flat,glyphs,solid,shade,glow,thing } = B;

  // ---------------------------------------------------------------- surface materials
  // Triplanar tiling grain, spread into the existing shading modes rather than replacing them:
  // `mode:9` still says "paving slabs" and the material puts stone inside it. Every value is
  // named once here for two reasons. The palette above was chosen deliberately and `matAmt` is
  // how far a texture may drag it, so one number governs the whole building instead of eleven
  // guesses; and build.js batches on (mesh, mode, radius, textures, matScale, matAmt), so two
  // surfaces that agree on all of that are one instanced draw call rather than two. Nine
  // entries, used two hundred times, is nine extra batches in a room of ten thousand props.
  //
  // matScale is one repeat in metres. `paving` is deliberately absent here: that photograph is
  // made of five-centimetre setts and turned the polished concourse into a cobbled street. The
  // shell already authors its three-metre slab joints as geometry, so a restrained concrete grain
  // supplies the stone variation without drawing a second, contradictory joint pattern. Shop
  // floors use the existing tile map at a large repeat; wall tile remains hand-sized.
  // `nrm:null` is a deliberate opt-out, not an oversight. A tiling material costs three texture
  // fetches for the albedo and three more for the relief, per fragment, and this is the heaviest
  // room in the game: the concourse plate, three deck plates, four forty-six-metre walls and
  // every shop lining together cover most of any frame taken in here. Those get the grain and
  // skip the bump — a polished floor and a flat plaster wall have almost no relief to show at
  // the distances they are seen from, and dropping it halves the cost of the surfaces that fill
  // the screen. Everything you stand close to keeps both.
  const MAT = {
    stone:   {mat:'concrete', matScale:1.85, matAmt:.15, nrm:null}, // concourse and deck plates
    slab:    {mat:'concrete', matScale:1.15, matAmt:.16, nrmAmt:.24}, // solid stone props
    shopTile:{mat:'tile',     matScale:1.20, matAmt:.17, nrm:null}, // large-format shop flooring
    plaster: {mat:'plaster',  matScale:.62,  matAmt:.12, nrm:null}, // walls, soffits, columns
    metal:   {mat:'metal',    matScale:.50,  matAmt:.30, nrmAmt:.30}, // rails, escalator skirts, lift frames
    tile:    {mat:'tile',     matScale:.34,  matAmt:.30},  // toilets and the food-court stalls
    timber:  {mat:'wood',     matScale:.90,  matAmt:.30},  // shopfit joinery and benches
    cloth:   {mat:'fabric',   matScale:.55,  matAmt:.32},  // carpet, upholstery, the play mat
    cast:    {mat:'concrete', matScale:1.20, matAmt:.26, nrmAmt:.30}, // the fountain's cast stone
  };
  const SKY_DAY=C('#b9ced8'), SKY_NIGHT=C('#17243a');
  const WEATHER_SKY={
    clear:SKY_DAY,cloud:C('#aebbc1'),overcast:C('#a6afb3'),rain:C('#8497a1'),
    storm:C('#687784'),snow:C('#d8dfe2'),fog:C('#c8ccca'),wind:C('#aabcc3'),sand:C('#bea873'),
  };
  const SEASON_STYLE={
    spring:{banner:[C('#a34b55'),C('#6e5484')],text:['春日新装','花漾生活'],card:C('#d9909a'),ch:'春',pad:C('#d3c9b8')},
    summer:{banner:[C('#27737a'),C('#477fa0')],text:['清凉一夏','夏日活力'],card:C('#6fb8bb'),ch:'夏',pad:C('#bdced0')},
    autumn:{banner:[C('#9a5a32'),C('#765067')],text:['金秋新选','月满中庭'],card:C('#d5a54f'),ch:'秋',pad:C('#d1c09e')},
    winter:{banner:[C('#354b68'),C('#7c3d4b')],text:['冬日暖意','岁末新礼'],card:C('#91aabd'),ch:'冬',pad:C('#c6ccd0')},
  };
  // `nrmAmt` on the two above, and why. It defaults to 1, which is the whole relief of the
  // photograph applied to a primitive that has none — and on a large, nearly flat, nearly
  // horizontal surface that is not texture, it is a grey-brown cloud. The fountain kerb is the
  // case that proved it: a 6.3 m cream limestone ring measured rgb(102,87,68) across half its
  // width, three shades darker and much browner than the #e2dac7 it is painted, because
  // Concrete034's normal map was tipping the top annulus away from every light in the room by up
  // to forty degrees. matAmt cannot do that — at .26 the darkest a colour map can push a surface
  // is ×0.74 — so the colour was never the suspect it looked like. .30 keeps the grain and loses
  // the cloud. Anything here that reads as ambient occlusion baked into a flat plane is this.

  // ---------------------------------------------------------------- the shell
  const RX=23, RZ=18, H=13.6;
  const D=4.8, DW=3.0;             // shop depth, and the width of the gap you walk in through
  const VX=7.5, VZ=9.5;            // the void through the upper decks
  const DECK=[0,0,4.12,8.24];      // 4.12 is in old save files and in the crowd's lift — keep it
  // The daylight model shapes an interior's sun through exactly one window. This one is the real
  // north frontage: twenty-three metres of glass, which is what the hall is actually lit through.
  const WIN={x:0,y:3.6,z:-RZ+.05,hw:11.5,hh:4.4};
  // Back onto 新天地步行街. 北京新天地 moved off the far building line and onto the lane's NORTH
  // frontage at z -5.80 (js/street-lane.js); this used to step you out at (39.05, -9.20), which is
  // now a stretch of ordinary parade with the lane's mouth beside it. 2.55 m out into the lane,
  // facing -z — away from the shop. The 出口 sign inside still says 商务区 and still should: the
  // lane opens off it.
  const OUT={x:46.60,z:-8.35,yaw:Math.PI};
  // Every list the frame loop walks. Each one is here because something in it moves, lights up or
  // is rewritten by `tick`; a list that stops being any of those has to go, not be left empty for
  // the loop to walk over four hundred times a minute.
  const lit=[], jets=[], steps=[], handrailMarks=[], leds=[], carousel=[], carouselBulbs=[],
        flags=[], lifts=[], liftIndicators=[], entranceDoors=[], fount=[], waterfalls=[], steamRigs=[],
        eventParts=[], eventLamps=[], eventBoardLabels=[], seasonBannerGlyphs=[], seasonCards=[],
        weatherVisuals=[], shopClosures=[], shopLights=[], poweredDisplays=[],
        publicLights=[], shopAreas=[], shopPortals=[], portalProps=[], shopWindowRoutes=[],
        windParts=[], afterHoursVisuals=[],
        reflectionProxies=[], directoryDots=[], directoryEventParts=[];
  // A small daily programme gives the atrium three visibly different lives without inventing a
  // second room. Times are fixed and printed on the real hanging board built below. `eventAt`
  // returns the current event or the next one (wrapping to tomorrow) so gameplay, visuals and the
  // schedule drawer always answer with the same name and time.
  const EVENT_PROGRAMS={
    fitness:{key:'fitness',short:'健身',hz:'晨间健身课',py:'chénjiān jiànshēnkè',en:'morning fitness class'},
    fashion:{key:'fashion',short:'时装',hz:'新装时尚秀',py:'xīnzhuāng shíshàng xiù',en:'new-season fashion show'},
    lights:{key:'lights',short:'灯光',hz:'音乐灯光秀',py:'yīnyuè dēngguāng xiù',en:'music and light show'},
    ...MallEvents.PROGRAMS,
  };
  const EVENT_SLOTS=[10*60,14*60,19*60];
  // Monday through Sunday.  Reordering the same three retained kits gives the atrium five real
  // daily programmes without another prop or actor.  Saturday deliberately keeps fitness at ten,
  // matching the dated PA announcement; every other consumer reads the same table below.
  const EVENT_WEEK=MallEvents.WEEK.map(day=>[...day]);
  const EVENT_SCHEDULES=EVENT_WEEK.map(order=>order.map((key,i)=>{
    const start=EVENT_SLOTS[i];
    return {...EVENT_PROGRAMS[key],start,end:start+45,
      clock:`${String(Math.floor(start/60)).padStart(2,'0')}:00`};
  }));
  function eventsForWeekday(wd=weekdayNow()) {
    const i=wd<0?0:((Number(wd)||0)%7+7)%7;
    return EVENT_SCHEDULES[i];
  }
  function eventsToday() { return eventsForWeekday(); }
  // Backward-compatible Monday view for old pure harnesses. Runtime/UI/board use eventsToday().
  const EVENTS=EVENT_SCHEDULES[0];
  function eventAt(minutes) {
    const now=((Number(minutes)||0)%1440+1440)%1440;
    const today=eventsToday();
    const live=today.find(e=>now>=e.start&&now<e.end);
    if (live) {
      const edge=Math.min(1,(now-live.start)/1.5,(live.end-now)/1.5);
      const mix=clamp(edge,0,1); return {...live,active:true,wait:0,
        progress:clamp((now-live.start)/(live.end-live.start),0,1),mix:mix*mix*(3-2*mix)};
    }
    let next=today.find(e=>e.start>now),wait;
    if (next) wait=next.start-now;
    else {
      const wd=weekdayNow(); next=eventsForWeekday(wd<0?0:wd+1)[0];
      wait=1440-now+next.start;
    }
    return {...next,active:false,wait:Math.round(wait),progress:0,mix:0};
  }
  // Attendance has a wider window than the show itself.  Six existing shoppers peel away from
  // their routes over twelve minutes before curtain, then leave the pad in reverse over ten
  // minutes afterwards.  Keeping this separate from eventAt preserves the public board's promise
  // that an inactive query names the *next* programme, while the cast gets the previous event long
  // enough to walk out instead of disappearing at the closing minute.
  function eventFlowAt(minutes) {
    const now=((Number(minutes)||0)%1440+1440)%1440;
    const today=eventsToday();
    const live=today.find(e=>now>=e.start&&now<e.end);
    if(live) return {...live,phase:'live',attendance:6,progress:clamp((now-live.start)/(live.end-live.start),0,1)};
    const ingress=today.find(e=>now>=e.start-12&&now<e.start);
    if(ingress) {
      const p=clamp((now-(ingress.start-12))/12,0,1);
      return {...ingress,phase:'ingress',attendance:Math.min(6,Math.floor(p*7)),progress:0};
    }
    const egress=today.find(e=>now>=e.end&&now<e.end+10);
    if(egress) {
      const p=clamp((now-egress.end)/10,0,1);
      return {...egress,phase:'egress',attendance:Math.max(0,6-Math.floor(p*7)),progress:1};
    }
    return {key:null,phase:'idle',attendance:0,progress:0};
  }
  // Every chair the food court builds, in world coordinates, with the way it is turned. The chairs
  // are placed off a hash of the table's own position, so their positions cannot be worked out from
  // outside — and a food court with eighty-two chairs and nobody on any of them is the one thing
  // that made the hall read as a furniture showroom. game.js seats its diners off this list, which
  // means a diner is always on a chair that actually exists, however the layout is rearranged.
  const foodSeats=[], foodStaff=[], foodTableStates=[], foodCounterEmitters=[],
        foodCounterLights=[], foodPendantFixtures=[], exteriorArrivalParts=[],
        exteriorWetSilhouettes=[], publicClutterParts=[], publicClutterClusters=[];
  let basinGlow=null, exteriorSky=null;
  // The main renderer can retain packed instance records for the thousands of props that never
  // change.  Motion and lighting are the two exceptions.  `_instDynamic` means some field changes
  // at display rate; `_instNight` means only setNight() can change it, so one generation counter
  // refreshes all of those records without walking them on every otherwise identical frame.
  // `portal` is a retained-instance generation, just like `night`: it advances only when a
  // shutter crosses the fully-closed culling boundary. Camera-cell changes already invalidate the
  // renderer's packed survivors; this one covers a stationary camera while the clock closes or
  // reopens a tenant.
  const instanceState={night:0,portal:0};
  const dynamicVisual=(...ps)=>{
    for(const p of ps.flat()) if(p) p._instDynamic=true;
    return ps.length===1?ps[0]:ps;
  };
  // Three authored reflection cues, tied to the fixtures they imply rather than to the camera.
  // They are retained quads, not a second render pass; the quality ladder only changes their
  // contribution, with Basic removing them and Low retaining a single faint geometric read.
  const reflectionProxy=(p,high=.16,medium=.10,low=.035)=>{
    if(!p)return p;
    dynamicVisual(p);p.alpha=.001;p.glow=.001;
    reflectionProxies.push({p,high,medium,low});return p;
  };
  // Rain is read from the shared weather clock but represented with retained geometry: a few
  // streaks on the entrance glass and a sheen on the mat are enough to connect the atrium to the
  // street outside without adding a particle system to the most expensive room in the game.
  const weatherVisual=(ps,channel='wet',base=.001,amount=.30,glowAmt=0)=>{
    // Glyph helpers return arrays. Flatten the complete retained group so a warning's letters are
    // driven individually; retaining their array wrapper left the dry-day text visible in mid-air.
    for(const p of [ps].flat(Infinity)) if(p) {
      dynamicVisual(p); p.alpha=base;
      weatherVisuals.push({p,channel,base,amount,glowAmt,glow0:p.glow||0});
    }
    return ps;
  };
  const afterHoursVisual=(ps,alpha=.92,glowAmt=0)=>{
    for(const p of [ps].flat()) if(p) {
      dynamicVisual(p); p.alpha=.001;
      afterHoursVisuals.push({p,alpha,glowAmt,glow0:p.glow||0});
    }
    return ps;
  };
  let lastTick=0, lastMinutes=0, nightK=0, playerFloor=1, entranceOpen=0,
      lastWeatherWet=-1, lastWeatherRain=-1,lastWeatherMist=-1,
      lastShopMinutes=-1, lastDirectoryMinute=-1,lastFoodTableMinute=-1,
      lastEventWeekday=-2,afterHoursK=0,foodTableTransitions=0,foodTableWrites=0,
      lastWeatherKind='clear',lastWeatherAmt=0,lastWeatherCloud=0,lastWeatherFog=0,lastWeatherLay=0,
      lastWeatherWind=.14,windRested=false,lastSeasonDecor='',seasonEventPad=null,
      cleanerBeacon=null,cleanerRig=null,activeTenantMotions=0,lastFoodTableProfile=null,
      lastReflectionTier='',lastEventVisualSignature='',eventVisualTransitions=0,eventVisualWrites=0,
      weatherVisualTransitions=0,weatherVisualWrites=0,shopVisualTransitions=0,
      handrailReducedRested=false,handrailVisualWrites=0,tenantSkippedMotions=0;
  const litten=(p,k=1)=>{
    if(p) {
      p._instNight=true;
      p._mallLitK=k;
      if(p.glow0===undefined)p.glow0=p.glow||0;
    }
    lit.push({p,k});return p;
  };
  // Build.finish packs cull spheres once.  Animated pieces therefore need a sphere that covers
  // their whole route rather than the small primitive's spawn point.  Marking it fixed makes the
  // packed value deliberate and prevents a carousel horse, lift car or looping tread vanishing
  // when it moves beyond that first frame.
  const boundMotion=(p,x,y,z,r)=>{
    if(!p) return p;
    p._instDynamic=true;
    p.fixed=true; p.cx=x; p.cy=y; p.cz=z; p.r=r;
    return p;
  };
  // A column of steam: N additive pale puffs that rise, spread and fade on a loop. Each puff is
  // an unlit ball whose matrix/alpha the tick loop rewrites every frame (see the steamRigs loop).
  // Patterned on diner.js's steamRigs and nightmarket's steam(): the matrix is rebuilt from a
  // per-puff phase so the column breathes instead of blinking.
  const makePuffs=(n=5)=>{
    const out=[];
    for(let i=0;i<n;i++)
      out.push({phase:i/n, p:ball(0,-9,0,.14,.14,.14,C('#f2f6f8'),{mode:1,tag:'steam'})});
    return out;
  };

  // Walkable decks per level. Level one is the whole plate and lives in `zones`, where Build's own
  // clampMove finds it. Two and three are rings; the bridge and the landing make the ring a route.
  const UPPER={
    2:[{x0:-RX+.4,x1:-VX,z0:-RZ+.4,z1:RZ-.4}, {x0:VX,x1:RX-.4,z0:-RZ+.4,z1:RZ-.4},
       {x0:-RX+.4,x1:RX-.4,z0:-RZ+.4,z1:-VZ}, {x0:-RX+.4,x1:RX-.4,z0:VZ,z1:RZ-.4},
       // The bridge overlaps the wings it joins. Zones that only touch at a shared edge cannot be
       // walked between: the clamp keeps a body inside the zones it is already in, and a foot on
       // the boundary is in neither of them by half its own radius.
       {x0:-VX-1.4,x1:VX+1.4,z0:-3.95,z1:3.95}],
    3:[{x0:-RX+.4,x1:-VX,z0:-RZ+.4,z1:RZ-.4}, {x0:VX,x1:RX-.4,z0:-RZ+.4,z1:RZ-.4},
       {x0:-RX+.4,x1:RX-.4,z0:-RZ+.4,z1:-VZ}, {x0:-RX+.4,x1:RX-.4,z0:VZ,z1:RZ-.4},
       {x0:-VX-1.4,x1:VX+1.4,z0:-2.20,z1:2.20},
       {x0:2.40,x1:VX,z0:8.90,z1:VZ+1.4}],
  };
  const UPPER_BLOCKS={2:[],3:[]};
  const blockUp=(f,x0,x1,z0,z1)=>UPPER_BLOCKS[f].push({x0,x1,z0,z1});
  // One call that blocks on whichever level the thing is on, so a shop fitting is written once.
  const stop=(f,x0,x1,z0,z1)=>f===1?solid(x0,x1,z0,z1):blockUp(f,x0,x1,z0,z1);

  // ---------------------------------------------------------------- parts
  function planter(x,z,s=.80,y0=0,tree=false,flower=null) {
    taper(x,y0+.26,z,s,.52,s,col.charcoal,{gloss:.22});
    box(x,y0+.50,z,s*.92,.06,s*.92,col.bark,{gloss:.1});
    if(tree) {
      // A trunk that tapers, and a crown made of many small masses rather than a few huge ones.
      // Seven spheres of half-metre radius overlap into three visible lobes and read as a lollipop;
      // fourteen smaller ones spread on the golden angle, at four different heights and radii,
      // give a canopy with an outline that is not a circle. Same idea, twice the pieces, and it
      // stops being the thing your eye names as "three balls on a stick".
      taper(x,y0+.92,z,.135,1.00,.135,col.bark,{gloss:.10});
      capsule(x,y0+1.72,z,.072,.72,.072,col.bark,{gloss:.10});
      for(let i=0;i<14;i++) {
        const a=i*2.3999, r=.26+((i*7)%5)*.085, rr=.28+((i*11)%4)*.075;
        ball(x+Math.sin(a)*r,y0+1.98+((i*5)%6)*.155,z+Math.cos(a)*r,
          rr,rr*.86,rr,i%2?col.green:col.greenL,{mode:15,gloss:.10});
      }
    } else {
      for(let i=0;i<10;i++) {
        const a=i*2.3999, r=s*(.16+((i*7)%4)*.07), rr=.19+((i*5)%4)*.055;
        ball(x+Math.sin(a)*r,y0+.64+((i*3)%4)*.085,z+Math.cos(a)*r,
          rr,rr*1.1,rr,i%2?col.green:col.greenL,{mode:15,gloss:.12});
      }
      // Flowering colour on the foliage, for the planters a real concourse puts beside its benches
      // — the one thing the all-green shrub lacks. A scattering of small blooms in one hue per pot,
      // riding just above the leaves so they read as flowers and not as a second bush.
      if(flower) for(let i=0;i<8;i++) {
        const a=i*2.3999+.6, r=s*(.10+((i*7)%4)*.06);
        ball(x+Math.sin(a)*r,y0+.78+((i*3)%3)*.07,z+Math.cos(a)*r,
          .075,.075,.075,flower,{mode:7,gloss:.18});
      }
    }
    // A square shadow under a round planter shows its corners. Kept small and faint enough that
    // what lands outside the pot does not read as a stain on the floor.
    shade(x,z,s*1.7,s*1.7,.16,y0+.02);
    return [x-s*.55,x+s*.55,z-s*.55,z+s*.55];
  }
  // A sightline planter for the arrival floor.  The old trees beside information and at the
  // carousel approach carried two-metre spherical crowns; in the views that matter those crowns
  // hid the directory, a shopfront or half the ride.  This keeps the exact same pot footprint and
  // therefore the exact same collision rectangle, but trades the opaque crown for layered grasses
  // and a few flowers that top out below eye level.
  function lowPlanter(x,z,s=.88,y0=0,flower=col.jadeL) {
    taper(x,y0+.25,z,s,.50,s,col.charcoal,{gloss:.22,tag:'绿植'});
    box(x,y0+.49,z,s*.91,.055,s*.91,col.bark,{gloss:.10,tag:'绿植'});
    for(let i=0;i<13;i++) {
      const a=i*2.3999, r=s*(.10+((i*7)%5)*.055), h=.28+((i*11)%5)*.075;
      const px=x+Math.sin(a)*r, pz=z+Math.cos(a)*r;
      capsule(px,y0+.58+h*.48,pz,.030,h,.030,i%3?col.green:C('#6f9275'),
        {gloss:.08,tag:'绿植'});
      if(i%3===0) ball(px,y0+.60+h,pz,.065,.055,.065,flower,
        {mode:15,gloss:.12,tag:'绿植'});
    }
    shade(x,z,s*1.7,s*1.7,.16,y0+.02);
    // Deliberately identical to planter(..., s): the route/collision contract does not change.
    return [x-s*.55,x+s*.55,z-s*.55,z+s*.55];
  }
  // `flip` puts the backrest on the other side, which decides which way the person on it is looking.
  // Without it the back was always at +.25, so every 'z' bench in the building faced -x and every
  // 'x' bench faced -z — fine on one side of the void and backwards on the other. Half the level-two
  // gallery was seated with its back to the atrium, under a comment saying the seats face the void.
  function bench(x,z,along='x',y0=0,tag='休息区',flip=false) {
    const ew=along==='z', bk=flip?-.25:.25;
    box(x,y0+.50,z,ew?.62:1.60,.18,ew?1.60:.62,col.wood,{gloss:.20,tag,...MAT.timber});
    box(x+(ew?bk:0),y0+.88,z+(ew?0:bk),ew?.13:1.60,.64,ew?1.60:.13,col.fabric,
      {round:.10,mode:7,tag,...MAT.cloth});
    for(const s of [-1,1]) box(x+s*(ew?0:.66),y0+.25,z+s*(ew?.64:0),.10,.50,.10,col.steelD,
      {gloss:.45,...MAT.metal});
    // Contact shadows render after opaque geometry with depth writes disabled, but still depth-test.
    // At +20 mm this was exactly coplanar with the two arrival seating fields and sat below the
    // level-two rugs, producing the reported under-bench crawl. +30 mm clears both by at least 6 mm.
    shade(x,z,ew?.9:1.9,ew?1.9:.9,.22,y0+.030);
    return [x-(ew?.5:.9),x+(ew?.5:.9),z-(ew?.9:.5),z+(ew?.9:.5)];
  }
  // A dress form, and what makes one read as a figure rather than a post is the waist. A cylinder
  // with a ball on top is a bollard; a torso that comes in at the middle and out again at the hip,
  // on a slim stand with a plate under it, is a shop mannequin — which is a shape everybody knows
  // well enough to notice being wrong.
  function mannequin(x,z,c,ry,y0=0,tag='服装店') {
    cyl(x,y0+.02,z,.26,.04,col.steelD,{gloss:.55,tag});                       // floor plate
    cyl(x,y0+.34,z,.035,.64,col.steelD,{gloss:.5,tag});                       // stem
    // Ellipsoids, not cones. `taper` narrows to a point, so a torso stacked out of three of them
    // comes out as a pagoda of discs; three ovals with the middle one smaller gives the waist,
    // which is the only part of this shape anybody actually reads.
    // Overlapping enough to be one body. Spheres that only just touch read as a snowman, and the
    // separate shoulder balls that used to sit on top read as ears — a dress form has its
    // shoulders in the chest, so the chest is simply the widest part and there is nothing bolted
    // to it.
    ball(x,y0+1.00,z,.168,.27,.116,c,{ry,mode:7,gloss:.07,tag});              // hips
    ball(x,y0+1.24,z,.140,.20,.100,c,{ry,mode:7,gloss:.07,tag});              // waist, drawn in
    ball(x,y0+1.48,z,.215,.24,.140,c,{ry,mode:7,gloss:.07,tag});              // chest and shoulder
    cyl(x,y0+1.68,z,.048,.13,col.cream,{gloss:.16,tag});                      // neck, no head

  }
  // Seat colours a long way down from where they were. Four fully saturated hues cycling round
  // every table turned a food court of twenty tables into a bag of sweets; these are the same four
  // hues with the sugar taken out, which still reads as "cheerful moulded plastic seating" without
  // being the loudest thing in the building.
  const SEATC=[C('#c98a52'),C('#6f9c86'),C('#5f83a6'),C('#b57d8c')];
  // Everything on this table is decided by where the table is, so it is the same every time the
  // room is built and different from its neighbour.
  const rnd=(x,z,n)=>{const v=Math.sin(x*12.9898+z*78.233+n*37.719)*43758.5453;return v-Math.floor(v);};
  const FOOD_TABLE_COLORS={
    occupied:[C('#8d5f45'),col.cream,col.goldL],
    dirty:[C('#665147'),C('#8a755f'),C('#d3c5aa')],
    cleared:[col.jadeL,C('#d8ece5'),col.white],
  };
  function table(x,z,y0=0,tag='美食广场',seats=4,r=.50,seatC=SEATC) {
    cyl(x,y0+.40,z,.07,.76,col.steelD,{gloss:.55});
    cyl(x,y0+.79,z,r,.06,col.wood,{gloss:.24,tag});
    for(let i=0;i<seats;i++) {
      // Chairs are not on a protractor. A little swing either way, a little in and out, and one
      // in six pushed right back from the table the way somebody leaves it when they stand up.
      const out=rnd(x,z,i)<.17;
      const a=i*Math.PI*2/seats+.4+(rnd(x,z,i+9)-.5)*.34;
      const rad=.86+(rnd(x,z,i+3)-.5)*.13+(out?.26:0);
      const sx=x+Math.sin(a)*rad, sz=z+Math.cos(a)*rad, cc=seatC[i%seatC.length];
      // The pan top is y0+.50, and the chair sits at angle `a` out from the table, so somebody on
      // it is turned back towards the middle — a+π. The ones pushed right back are left out: they
      // are the chairs somebody has stood up from, and putting a diner on one seats them a third of
      // a metre from their own food.
      if(!out) foodSeats.push({x:sx,z:sz,yaw:a+Math.PI,y0,tag});
      const nativeChair=()=>{
        box(sx,y0+.44,sz,.44,.12,.44,cc,{ry:a,gloss:.18,tag});
        // The back goes on the far side of the seat from the table. It used to be offset by
        // -sin/-cos, which is *towards* the centre — so the backrest sat between the seat and the
        // table and every chair in the building had its back to the food.
        box(sx+Math.sin(a)*.20,y0+.70,sz+Math.cos(a)*.20,.44,.50,.10,cc,{ry:a,mode:7,round:.06,tag});
        for(const [ox,oz] of [[-.16,-.16],[.16,-.16],[-.16,.16],[.16,.16]])
          box(sx+ox*Math.cos(a)+oz*Math.sin(a),y0+.19,sz-ox*Math.sin(a)+oz*Math.cos(a),
            .045,.38,.045,col.steelD,{gloss:.4});
      };
      // The seventy 2-/4-top seats share the streamed moulded chair already used in hospitals.
      // Keep the twelve compact six-top seats native: the larger model would overlap at that pitch.
      if(tag==='美食广场'&&seats!==6)
        B.modelOr('plastic_monobloc_chair',sx,y0,sz,1.05,
          {ry:a+Math.PI,color:cc,gloss:.18,tag},nativeChair);
      else nativeChair();
    }
    // What is on the table. A food court where every table is bare reads as a furniture showroom,
    // and one where every table is fully laid reads as a photograph taken before opening — so
    // about half of them carry something, and what they carry is a meal in progress: a tray, a
    // bowl with something in it, a cup, chopsticks laid across the rim.
    const top=y0+.82, use=rnd(x,z,1);
    if(tag==='美食广场') {
      // Three retained, opaque pieces tell all three table stories without rebuilding props:
      // meal tray/bowl/chopsticks; used tray/cup/napkin; folded cloth/spray/status tab. Only their
      // precomputed matrices and colours change on a minute/profile transition. All 23 tables use
      // the same two dynamic draw signatures (hard box + cylinder), and no alpha sheet or callback.
      const tray=box(x-.11,top+.018,z,.32,.035,.24,FOOD_TABLE_COLORS.occupied[0],
        {ry:.12,hard:true,gloss:.28,tag});
      const vessel=cyl(x+.08,top+.062,z-.04,.085,.075,FOOD_TABLE_COLORS.occupied[1],
        {gloss:.30,tag});
      const token=box(x+.08,top+.11,z+.09,.23,.012,.018,FOOD_TABLE_COLORS.occupied[2],
        {ry:-.22,hard:true,gloss:.24,tag});
      const parts=[tray,vessel,token];
      parts.forEach((p,i)=>{
        p._mallFoodTablePart=true;p.mallFoodTableIndex=foodTableStates.length;p.mallFoodPart=i;
        boundMotion(dynamicVisual(p),x,top+.07,z,r+.48);
      });
      const variants={
        occupied:{
          m:[M.trs(x-.11,top+.018,z,.12,.32,.035,.24),
             M.trs(x+.08,top+.062,z-.04,0,.17,.075,.17),
             M.trs(x+.08,top+.11,z+.09,-.22,.23,.012,.018)],
          colors:FOOD_TABLE_COLORS.occupied,
        },
        dirty:{
          m:[M.trs(x+.10,top+.018,z-.04,-.28,.34,.030,.25),
             M.trs(x-.11,top+.074,z+.06,0,.09,.11,.09),
             M.trs(x+.15,top+.032,z+.10,.34,.11,.018,.09)],
          colors:FOOD_TABLE_COLORS.dirty,
        },
        cleared:{
          m:[M.trs(x-.08,top+.018,z+.06,.32,.24,.025,.17),
             M.trs(x+.12,top+.070,z-.05,0,.07,.10,.07),
             M.trs(x+.12,top+.022,z+.08,-.10,.15,.018,.055)],
          colors:FOOD_TABLE_COLORS.cleared,
        },
      };
      foodTableStates.push({index:foodTableStates.length,x,z,parts,variants,state:null,transitions:0});
    } else if(use>.46) {
      const n=use>.82?2:1;
      for(let k=0;k<n;k++) {
        const a=rnd(x,z,20+k)*Math.PI*2, d=r*(.34+rnd(x,z,30+k)*.24);
        const px=x+Math.sin(a)*d, pz=z+Math.cos(a)*d, w=rnd(x,z,40+k);
        if(w<.40) {                                     // a tray with a bowl and chopsticks on it
          box(px,top+.012,pz,.36,.024,.27,C('#8d5f45'),{ry:a,gloss:.30,round:.02,tag});
          cyl(px,top+.06,pz,.088,.07,col.cream,{gloss:.30,tag});
          cyl(px,top+.085,pz,.072,.02,C('#c9a06a'),{gloss:.22,tag});
          for(const o of [-.018,.018])
            capsule(px+Math.cos(a)*.10+o*Math.sin(a),top+.10,pz-Math.sin(a)*.10+o*Math.cos(a),
              .006,.22,.006,col.cream,{rz:Math.PI/2,ry:a,gloss:.3,tag});
        } else if(w<.72) {                              // a bowl of noodles, no tray
          cyl(px,top+.055,pz,.105,.09,col.white,{gloss:.32,tag});
          cyl(px,top+.088,pz,.088,.02,C('#d8b071'),{gloss:.24,tag});
          capsule(px+.10,top+.12,pz,.006,.24,.006,col.cream,{rz:Math.PI/2,ry:a+.5,gloss:.3,tag});
        } else if(w<.90) {                              // a paper cup, lid on
          cyl(px,top+.055,pz,.042,.11,col.cream,{gloss:.28,tag});
          cyl(px,top+.115,pz,.046,.014,C('#5a4636'),{gloss:.34,tag});
        } else {                                        // somebody has left their phone on it
          box(px,top+.008,pz,.075,.012,.145,col.trim,{ry:a,gloss:.42,tag});
        }
      }
    }
    shade(x,z,2.1,2.1,.22,y0+.02);
    return [x-1.15,x+1.15,z-1.15,z+1.15];
  }
  // Ten authored still-life clusters make the landlord space feel used without turning the floor
  // into procedural litter.  Each cluster is exactly three retained opaque props and lives either
  // on a seat or inside furniture's already-blocked footprint, so none changes a route.  The four
  // small vocabularies cover the mundane objects people actually set down while shopping.
  function publicClutter(x,z,y0,kind,ry=0,floor=1) {
    const ps=[], keep=p=>{ps.push(p);publicClutterParts.push(p);return p;};
    const tag='公共随手物';
    if(kind==='cup') {
      keep(cyl(x,y0+.065,z,.045,.13,col.cream,{gloss:.24,tag}));
      keep(cyl(x,y0+.134,z,.050,.008,col.charcoal,{gloss:.30,tag}));
      keep(box(x+.105,y0+.005,z+.025,.16,.010,.13,col.white,
        {ry:ry-.18,hard:true,gloss:.06,tag}));
    } else if(kind==='phone') {
      keep(box(x,y0+.009,z,.145,.018,.075,col.trim,{ry,hard:true,gloss:.44,tag}));
      keep(box(x,y0+.021,z,.119,.008,.054,col.screen,{ry,hard:true,mode:1,glow:.012,tag}));
      keep(box(x+.115,y0+.026,z-.065,.075,.052,.055,col.cream,
        {ry:ry+.22,round:.018,gloss:.20,tag}));
    } else if(kind==='parcel') {
      keep(box(x,y0+.11,z,.36,.22,.26,C('#c9aa79'),{ry,hard:true,gloss:.08,tag}));
      keep(box(x,y0+.225,z,.038,.009,.272,C('#e8d6ad'),{ry,hard:true,gloss:.08,tag}));
      keep(box(x,y0+.230,z,.17,.010,.085,col.white,{ry,hard:true,gloss:.06,tag}));
    } else { // a soft resting shopping bag with two short handles
      keep(box(x,y0+.19,z,.34,.38,.17,C('#8e5261'),{ry,round:.035,mode:7,gloss:.06,tag}));
      for(const o of [-.085,.085]) keep(capsule(x+o,y0+.47,z,.015,.32,.015,col.cream,
        {rz:o<0?-.20:.20,gloss:.22,tag}));
    }
    publicClutterClusters.push({kind,x,z,y:y0,floor,parts:ps.length});
    return ps;
  }
  // 购物车 a shopping cart, of the nested-wire kind every supermarket and mall concourse runs on.
  // Same vocabulary as the airport trolley but a different silhouette: a wire basket on four
  // casters, a child-seat flap folded up at the back, and a handlebar you push from behind. `ry`
  // orients it; carts in a corral all face the same way. `box` here is (cx,cy_center,cz, sx,sy,sz),
  // so each rail names its own centre height and thickness — that is what was wrong with the first
  // version, which reused the height as the centre and drew every rail flat on the floor.
  function cart(x,z,ry=0) {
    const W=.30, L=.46;                             // half-width, half-length of the basket
    const c=Math.cos(ry), s=Math.sin(ry);
    // A part placed at local (cx,cz) and rotated to face `ry`. `box` is (cx,cy_center,cz, sx,sy,sz);
    // each rail names its own centre height and thickness.
    const r=(sx,sy,sz,cx,cy,cz)=>box(x+(c*cx-s*cz),cy,z+(s*cx+c*cz),sx,sy,sz,col.steel,{ry,hard:true,gloss:.40,tag:'购物车'});
    r(.02,.04,2*L, 0,.04,0);                         // floor runner, lengthwise
    r(2*W,.03,.02, 0,.04, L); r(2*W,.03,.02, 0,.04,-L);   // floor rails across, front + back
    r(2*W,.03,.02, 0,.56, L); r(2*W,.03,.02, 0,.56,-L);   // rim rails across, front + back
    r(.02,.30,.02, W,.30, L); r(.02,.30,.02,-W,.30, L);   // front uprights (full height)
    r(.02,.30,.02, W,.30,-L); r(.02,.30,.02,-W,.30,-L);   // back uprights
    r(.02,.30,2*L, W,.30,0); r(.02,.30,2*L,-W,.30,0);     // side rails, full height
    // The child-seat flap and the handlebar, both behind the back rim.
    r(.46,.02,.40, 0,.76,-(L+.06));
    r(2*W,.02,.02, 0,1.04,-(L+.18));
    r(.02,.30,.02, W,1.04,-(L+.18)); r(.02,.30,.02,-W,1.04,-(L+.18));  // handle risers
    // Four caster wheels, just clear of the floor.
    for(const [lx,lz] of [[W-.05,L-.20],[W-.05,-L+.20],[-W+.05,L-.20],[-W+.05,-L+.20]])
      cyl(x+(c*lx-s*lz),.07,z+(s*lx+c*lz),.065,.05,col.black,{ry,rz:Math.PI/2,gloss:.24,tag:'购物车'});
    shade(x,z,.9,.7,.20);
    return [x-.5,x+.5,z-.6,z+.6];
  }
  // 购物篮 a hand basket, the plastic kind stacked by a shopfront for shoppers who did not take a
  // cart. Drawn as one basket with a handle, optionally as a short stack.
  function basket(x,z,ry=0,stack=1) {
    for(let i=0;i<stack;i++) {
      const y=.30+i*.40;
      box(x,y,z,.44,.34,.30,col.red,{ry,round:.04,gloss:.22,tag:'购物篮'});
      // A lighter inner liner reads as the hollow of the basket rather than a solid block.
      box(x,y+.02,z,.38,.30,.26,C('#d98a82'),{ry,mode:7,tag:'购物篮'});
      if(i===stack-1) {                              // only the top one has its handle up
        capsule(x,y+.30,z,.018,.40,.018,col.steel,{ry,rz:Math.PI/2,gloss:.4,tag:'购物篮'});
      }
    }
    shade(x,z,.7,.6,.18);
    return [x-.4,x+.4,z-.4,z+.4];
  }
  // A deck slab is a floor from above and a ceiling from below. Without the soffit the eye on the
  // concourse looks straight through the gallery it is standing under: every surface is one-sided.
  function slab(x,z,w,d,y) {
    flat(x,y,z,w,d,col.floor2,{mode:0,gloss:.38,...MAT.stone});
    // The quad underneath is the lit soffit plane and stays flat: mode:1 is emissive, and a
    // material on an emitter is grain on a light fitting.  The structural core is recessed 5 mm
    // from both finish faces; touching the floor/soffit planes exactly makes their draw batches
    // fight for the same depth across every upper deck.
    B.props.push({mesh:'quad',color:col.soffit,mode:1,alpha:1,
      m:M.mul(M.trans(x,y-.34,z),M.mul(M.rotZ(Math.PI),M.scale(w,1,d)))});
    box(x,y-.17,z,w,.33,d,col.white,{hard:true,gloss:.16,...MAT.plaster});
  }
  // The edge of an upper deck, seen from the floor below — which, from anywhere on the concourse,
  // is most of what an upper deck *is*. A slab on its own presents 34 cm of white lip and then
  // sky; a real void edge is a fascia band hung off the slab with a shadow gap where it meets the
  // structure, a trim line across it and a continuous cove light along the bottom. That lit line
  // is the thing that draws the shape of the atrium in the air, and this building had no version
  // of it at all.
  //
  // `out` is the way the band faces: +1 or -1 along x for a run along z, and the reverse for a
  // run along x. It has to be given rather than inferred, because the two kinds of edge in here
  // face opposite ways — the void perimeter looks inward toward the middle, and the bridge that
  // crosses the void looks outward from it.
  // One gold line round a void is a trim; two is a racing stripe. The balustrade shoe above the
  // slab is already `col.gold`, so the band across the fascia is a bronze two steps down from it —
  // near enough to belong to the same building, dark enough to read as a joint rather than as a
  // second rail.
  const FASC=C('#e7e0d0'), FBAND=C('#8f7a4c'), FREV=C('#3b4046');
  function fascia(x,z,len,axis,y,out) {
    const ew=axis==='z';
    // (offset from the slab edge to the band's own centre, thickness, centre height, height)
    const put=(off,th,yc,h,c,opt={})=>box(x+(ew?off*out:0),yc,z+(ew?0:off*out),
      ew?th:len,h,ew?len:th,c,{hard:true,...opt});
    put(-.055,.12,y-.66,.62,FASC,{gloss:.18,glow:.015,...MAT.plaster}); // band, 5 mm proud of the slab
    put(-.105,.05,y-.355,.05,FREV,{gloss:.10});                    // shadow gap under the slab
    put(-.005,.055,y-.50,.075,FBAND,{gloss:.52});                  // trim line across it
    // The cove along the bottom, and it is deliberately dim for its size. This is a hundred
    // metres of emitter per deck facing straight at the concourse, and the glow pass is additive:
    // at the .30-odd every other fitting in the building carries, two of these turned the whole
    // upper half of the atrium shot into milk. A long strip needs a fraction of the glow a small
    // one does, for the same brightness on the eye.
    litten(put(-.030,.10,y-1.00,.07,C('#fff4de'),{mode:1,glow:.09}),.35);
  }
  function balustrade(x,z,len,axis,y,out=0) {
    const ew=axis==='z';
    box(x,y+.54,z,ew?.10:len,1.02,ew?len:.10,col.glass,{hard:true,mode:1,alpha:.36,gloss:.86,tag:'栏杆'});
    // No `metal` on either of these any more. Metal049A is near-featureless — it contributes no
    // pattern at any scale, only brightness — and the shader normalises a material by a fixed
    // 0.22 rather than by its own mean, so all a 12 cm shoe got out of it was a lift of about
    // ×1.6 that tonemapped #d8ad48 into a flat yellow-green. Measured on the bridge shot: the
    // rail came back rgb(191,182,93), greener than the gold it is painted and the single most
    // saturated thing in the building. Off the material it is the colour it was chosen to be.
    box(x,y+.05,z,ew?.16:len,.12,ew?len:.16,col.gold,{hard:true,gloss:.58,tag:'栏杆'});
    capsule(x,y+1.07,z,.055,len,.055,col.steelD,{[ew?'rx':'rz']:Math.PI/2,gloss:.54,tag:'栏杆'});
    // Posts. Frameless glass is a real detail but it is not what reads from thirty metres — what
    // reads is the rhythm, and without it a nineteen-metre run of 36%-alpha glass is a faint
    // smear under a yellow line. Set just behind the pane on the deck side, so nothing pokes out
    // over the void.
    const n=Math.max(1,Math.round(len/2.35));
    for(let i=0;i<=n;i++) {
      const t=-len/2+len*i/n, o=-out*.085;
      capsule(x+(ew?o:t),y+.55,z+(ew?t:o),.032,1.04,.032,col.steelD,{gloss:.50,tag:'栏杆'});
    }
    if(out) fascia(x,z,len,axis,y,out);
  }
  // Rail with the landings left out of it — a rail across a landing makes a route look impassable.
  function railRun(axis,fixed,from,to,y,gaps=[],out=0) {
    const cuts=[from]; for(const [a,b] of gaps) cuts.push(a,b); cuts.push(to);
    for(let i=0;i<cuts.length;i+=2) {
      const a=cuts[i], b=cuts[i+1];
      if(b-a<.4) continue;
      if(axis==='x') balustrade((a+b)/2,fixed,b-a,'x',y,out); else balustrade(fixed,(a+b)/2,b-a,'z',y,out);
    }
  }
  // A column on the void edge, from the floor it stands on to the soffit above it. Base, shaft,
  // neck and capital: four pieces, which is the difference between a column and a 46 cm white box
  // stood on end. The ground floor had none at all — seven of these on each upper deck and
  // nothing underneath any of them, so from the concourse both galleries were held up by air.
  const COLZ=[-15,-11.5,-6.5,0,6.5,11.5,15];
  // The two places a ground-floor column would land inside something that is already standing
  // there: the carousel's canopy on the west run (its 5.18 m crown is centred at x -10.1, z 10.6,
  // so it swallows the column at -8.5, 11.5), and on the east the restaurant, whose unit spans
  // x 6.5…15.1 over the column at 8.5, 15. That east one used to be named as the pet shop's
  // frontage and no longer is: the two south tenants were moved west as a pair to open up the
  // lift approach, which left the pet shop at x -2.7…5.9 and put the restaurant on this column.
  const colSkip=(x,z,f)=>f===1&&((x<0&&z===11.5)||(x>0&&z===15));
  function column(x,z,y,f) {
    const top=(f<3?DECK[f+1]-.34:H)-DECK[f], sx=Math.sign(x)||1;
    box(x,y+.10,z,.62,.20,.62,col.stoneD,{hard:true,gloss:.30});                       // base
    box(x,y+top/2,z,.46,top-.40,.46,col.white,{hard:true,gloss:.22,...MAT.plaster});   // shaft
    box(x,y+top-.235,z,.50,.06,.50,col.stoneD,{hard:true,gloss:.20});                  // neck line
    box(x,y+top-.10,z,.66,.20,.66,col.cream,{hard:true,gloss:.20,...MAT.plaster});     // capital
    // A wall-washer on the void face of each one, which is where a mall of this kind actually
    // hangs the light that lands on its own gallery floor.
    box(x+sx*.30,y+top-.62,z,.10,.10,.30,col.steelD,{hard:true,gloss:.45});
    litten(cyl(x+sx*.40,y+top-.70,z,.15,.06,C('#fff2da'),{mode:1,glow:.16}),.40);
    stop(f,x-.33,x+.33,z-.33,z+.33);
    if(f===1) shade(x,z,.95,.95,.20);
  }
  // The ceiling of a covered gallery. What was here was a lit bar hung across the middle of each
  // aisle in mid-air and a line of bare glowing discs beside it — fittings with no ceiling to be
  // fitted into, under thirty-five metres of soffit that read as one unbroken white plane. A mall
  // gallery has a dropped raft down the length of the aisle with the downlights recessed in its
  // face and a cove along each of its long edges, and that is both what carries the light and
  // what gives the ceiling a direction to run in.
  function ceilRaft(axis,x,z,len,w,ys) {
    const ew=axis==='z', dim=a=>ew?[a,len]:[len,a];
    const d0=dim(w), dc=dim(.11);
    // Same self-lit as the slab it hangs off. A raft is a downward-facing plane, so the only
    // ambient it gets is the warm bounce off the floor — without a little of its own it comes out
    // a good deal browner than the soffit either side of it, and the ceiling reads dirty.
    box(x,ys-.11,z,d0[0],.22,d0[1],col.hallCeil,{hard:true,gloss:.12,...MAT.plaster});
    for(const s of [-1,1]) {
      const ox=ew?s*(w/2-.055):0, oz=ew?0:s*(w/2-.055);
      litten(box(x+ox,ys-.245,z+oz,dc[0],.06,dc[1],C('#fff6e6'),{hard:true,mode:1,glow:.12}),.40);
    }
    const n=Math.max(3,Math.round(len/3.2));
    for(let i=0;i<n;i++) {
      const t=-len/2+len*(i+.5)/n;
      const dx=ew?x:x+t, dz=ew?z+t:z;
      cyl(dx,ys-.20,dz,.245,.07,col.stoneD,{gloss:.26});                    // housing, recessed in
      litten(cyl(dx,ys-.245,dz,.185,.055,C('#fff2da'),{mode:1,glow:.20}),.42);
    }
  }

  // Public-life safety fixtures are authored as small, readable clusters instead of a texture
  // pasted over the ceiling.  Two clusters per floor keep them visible in a wide aisle view while
  // staying at the scale of real detectors, sprinkler heads and alarm beacons.  All fittings are
  // above 2.7 m and use retained geometry only: there is no new light candidate or tick callback.
  function publicSafety(f,ys) {
    const fy=DECK[f];
    for(const s of [-1,1]) {
      const x=s*14.2, z=s*5.8;
      cyl(x,ys-.255,z,.135,.055,col.white,{gloss:.22,tag:'消防设施'});       // smoke detector
      capsule(x,ys-.36,z,.018,.16,.018,col.steelD,{gloss:.55,tag:'消防设施'});
      ball(x,ys-.455,z,.047,.032,.047,col.redD,{gloss:.48,tag:'消防设施'}); // sprinkler head
      litten(box(s*(VX+1.34),fy+3.04,z,.075,.18,.18,col.red,
        {hard:true,mode:1,glow:.12,tag:'消防设施'}),.20);                    // alarm beacon
    }
  }

  // Four low-profile blades per deck form one continuous route vocabulary.  The upper decks lead
  // to the downward escalator route; the ground floor continues to the only public exterior exit.
  // A jade edge remains legible at the basic quality tier and after tenant lighting shuts down.
  function egressBlade(f,x,z,route) {
    const y=DECK[f]+3.08;
    capsule(x,y+.34,z,.014,.52,.014,col.steelD,{gloss:.48,tag:'安全出口'});
    box(x,y,z,1.82,.38,.075,col.charcoal,{hard:true,gloss:.25,tag:'安全出口'});
    litten(box(x,y-.15,z-.046,1.62,.035,.018,col.jadeL,
      {hard:true,mode:1,glow:.10,tag:'安全出口'}),.24);
    for(const [oz,yaw] of [[-.046,Math.PI],[.046,0]])
      glyphs(x,y+.035,z+oz,yaw,route,
        {size:.105,gap:.033,color:col.white,mode:1,glow:.07,tag:'安全出口'});
  }

  // One combined hose/extinguisher cabinet and one evacuation-map plate on each atrium side of
  // every floor.  Together with the twelve route blades this is exactly 24 public safety signs.
  function firePoint(f,s) {
    const x=s*(VX+1.33),y=DECK[f],z=0,yaw=s<0?Math.PI/2:-Math.PI/2,face=x-s*.075;
    box(x,y+1.18,z,.15,1.08,.62,col.redD,{hard:true,gloss:.26,tag:'消防设施'});
    box(face,y+1.19,z,.022,.82,.44,C('#3b2022'),
      {hard:true,mode:1,alpha:.82,gloss:.50,tag:'消防设施'});
    glyphs(face-s*.014,y+1.55,z,yaw,'消防栓 · 灭火器',
      {size:.067,gap:.018,color:col.white,mode:1,glow:.035,tag:'消防设施'});
    box(x,y+2.20,z,.13,.62,.78,col.cream,{hard:true,gloss:.18,tag:'疏散图'});
    glyphs(face-s*.010,y+2.35,z,yaw,'疏散图',
      {size:.072,gap:.020,color:col.redD,mode:1,glow:.020,tag:'疏散图'});
    for(let i=-1;i<=1;i++) box(face-s*.012,y+2.13,z+i*.17,.012,.035,.11,
      [col.jade,col.goldL,col.red][i+1],{hard:true,mode:1,glow:.025,tag:'疏散图'});
  }

  // Three short, slightly offset rubs describe a direction of travel without turning a whole
  // floor bay grey.  Five authored zones use this helper (15 tiny retained decals total).
  function trafficScuffs(x,y,z,yaw=0) {
    for(let i=-1;i<=1;i++) flat(x+i*.22,y+.006,z+(i%2)*.08,.12,.58,C('#a99f90'),
      {ry:yaw,mode:1,alpha:.12,gloss:.08,tag:'地面磨痕'});
  }

  // ---------------------------------------------------------------- the tenant manifest
  // Every unit the building has, the deck it is on, and the file that fits it out. This is the
  // list the floor summary at the top of this file is written from, so the two cannot drift.
  //
  // It is also an assertion. `shop()` falls back to the inline fit when nothing is registered,
  // which is the right behaviour for a half-written tenant and the wrong behaviour for a broken
  // one: a module that throws on load, or is renamed, or never reaches index.html, leaves a shop
  // that still builds, still has a sign over it and is quietly three years out of date. Nobody
  // notices, because nothing says anything. So the eighteen are named here and checked once, when
  // the room is built — the first moment at which every tenant file has had its chance to run.
  const TENANTS=[
    ['珠宝店',1,'mall-jewel'],   ['服装店',1,'mall-fashion'], ['鞋店',1,'mall-shoes'],
    ['电子产品',1,'mall-digital'],['眼镜店',1,'mall-optical'], ['花店',1,'mall-flowers'],
    ['咖啡店',1,'mall-coffee'],  ['面包店',1,'mall-bakery'],  ['宠物店',1,'mall-pets'],
    ['餐厅',1,'mall-restaurant'],
    ['美妆店',2,'mall-beauty'],  ['书店',2,'mall-books'],     ['运动店',2,'mall-sport'],
    ['家居店',2,'mall-home'],    ['玩具店',2,'mall-toys'],    ['甜品店',2,'mall-dessert'],
    ['电影院',3,'mall-cinema'],  ['游戏厅',3,'mall-arcade'],
  ];
  // Real opening hours give the building a fourth visual state. Most retail closes before the
  // entertainment floor; food opens earlier or stays later. One shared retained shutter reads
  // this table, so the eighteen tenant modules need no duplicate clock or moving geometry.
  const SHOP_HOURS={
    '咖啡店':[7,22], '面包店':[7,21], '餐厅':[10,23.5], '甜品店':[10,23],
    '电影院':[10,24], '游戏厅':[10,24], '宠物店':[9,20.5], '花店':[8.5,21],
  };
  // Fascia lamps share one physical fitting but not one white point.  The palette is deliberately
  // restrained—warm food/jewellery, clean optical/digital, gentle green floral, cooler sport and
  // entertainment—so adjacent thresholds separate without adding a nineteenth light.  A tenant
  // may override its own value through the same colon registry used for windows and glass.
  const TENANT_LIGHT={
    '珠宝店':[1.00,.84,.64], '服装店':[1.00,.91,.82], '鞋店':[1.00,.88,.74],
    '电子产品':[.72,.84,1.00], '眼镜店':[.84,.96,1.00], '花店':[.80,1.00,.84],
    '咖啡店':[1.00,.78,.58], '面包店':[1.00,.82,.62], '宠物店':[.88,.96,1.00],
    '餐厅':[1.00,.76,.54], '美妆店':[1.00,.82,.88], '书店':[1.00,.88,.72],
    '运动店':[.76,.88,1.00], '家居店':[1.00,.86,.68], '玩具店':[1.00,.90,.68],
    '甜品店':[1.00,.80,.86], '电影院':[.72,.78,1.00], '游戏厅':[.86,.66,1.00],
  };
  const CLOSED_RED=C('#6b302f');
  const tenantLightColor=kind=>{
    const spec=typeof MallFit!=='undefined'&&MallFit[kind+':light'];
    return spec&&Array.isArray(spec.color)?spec.color:TENANT_LIGHT[kind]||[1.00,.93,.79];
  };
  const clockMinute=minutes=>((Number(minutes)||0)%1440+1440)%1440;
  const ease01=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  // One public phase vocabulary for directories, lighting, staff, shutters and cleaning. `late`
  // is deliberately not after-hours: the restaurant, cinema and arcade still trade then.
  const tradingPhase=minutes=>{
    const m=clockMinute(minutes);
    if(m<6.5*60) return {key:'overnight',m};
    if(m<10*60) return {key:'pre-open',m};
    if(m<20.5*60) return {key:'open',m};
    if(m<22.5*60) return {key:'closing',m};
    return {key:'late',m};
  };
  // A tenant adds its own opening and closing boundary without inventing a second set of words.
  // The final twenty minutes is the physical shutter travel; the preceding hour is the stable
  // closing phase in which signage and staff can change without the door already being shut.
  const shopTradingPhase=(minutes,hours)=>{
    const m=clockMinute(minutes),open=hours[0]*60,close=hours[1]*60,fade=20;
    if(m<open) return {key:m>=open-60?'pre-open':'overnight',closed:1,m,open,close};
    if(m<open+fade)
      return {key:'pre-open',closed:1-ease01((m-open)/fade),m,open,close};
    if(m<close-60) return {key:'open',closed:0,m,open,close};
    if(m<close-fade) return {key:'closing',closed:0,m,open,close};
    if(m<close) return {key:'late',closed:ease01((m-(close-fade))/fade),m,open,close};
    return {key:'overnight',closed:1,m,open,close};
  };
  const closedMix=(minutes,hours)=>shopTradingPhase(minutes,hours).closed;
  // Cleaning begins only after the final midnight venues close, is fully established by 00:30,
  // and clears before the seven-o'clock café opens. It is zero throughout the live late phase.
  const cleanerMix=minutes=>{
    const m=clockMinute(minutes);
    if(m<30) return ease01(m/30);
    if(m<6.5*60) return 1;
    if(m<7*60) return ease01((7*60-m)/30);
    return 0;
  };
  // One deterministic table profile, shared by the visible parts and diagnostics. Lunch is busy,
  // quiet hours are mostly clear, and the eight dirty late tables fall monotonically to zero as
  // the existing overnight cleaner comes on from midnight to 00:30. `applyFoodTableStates` calls
  // this only when the whole minute changes, never from an unguarded display-rate loop.
  const foodTableProfileAt=value=>{
    const m=clockMinute(value),total=foodTableStates.length||23;
    let key='quiet',occupied=4,dirty=3,rotation=Math.floor(m/30)%total;
    if(m<30) {
      key='cleaning';occupied=0;dirty=Math.round(8*(1-cleanerMix(m)));rotation=0;
    } else if(m<7*60) {
      key='overnight';occupied=0;dirty=0;rotation=0;
    } else if(m<11.5*60) {
      key='quiet';occupied=4;dirty=2;
    } else if(m<14*60) {
      key='lunch';occupied=13;dirty=6;
    } else if(m<18*60) {
      key='quiet';occupied=4;dirty=3;
    } else if(m<22*60) {
      key='evening';occupied=7;dirty=5;
    } else {
      key='closing';occupied=0;dirty=8;
    }
    occupied=Math.min(total,occupied);dirty=Math.min(total-occupied,dirty);
    return {key,total,occupied,dirty,cleared:total-occupied-dirty,rotation};
  };
  const foodTableStateAt=(index,value,profile=foodTableProfileAt(value))=>{
    const rank=((index+profile.rotation)%profile.total+profile.total)%profile.total;
    return rank<profile.occupied?'occupied':rank<profile.occupied+profile.dirty?'dirty':'cleared';
  };
  const applyFoodTableStates=value=>{
    const minute=Math.floor(clockMinute(value));
    if(minute===lastFoodTableMinute)return 0;
    lastFoodTableMinute=minute;
    const profile=foodTableProfileAt(minute);
    let writes=0;
    for(const q of foodTableStates) {
      const state=foodTableStateAt(q.index,minute,profile);
      if(state===q.state)continue;
      const variant=q.variants[state];
      for(let i=0;i<q.parts.length;i++) {
        q.parts[i].m=variant.m[i];q.parts[i].color=variant.colors[i];writes+=2;
      }
      q.state=state;q.transitions++;foodTableTransitions++;
    }
    foodTableWrites+=writes;lastFoodTableProfile=profile;
    return writes;
  };
  const ownShopLight=(l,kind,hours)=>{
    if(!l)return l;
    l.mallShop=kind;l.mallHours=hours;l.mallBasePower=l.power;
    shopLights.push(l);return l;
  };
  const ownPublicLight=(l,role='decorative')=>{
    if(!l)return l;
    l.mallPublic=role;l.mallBasePower=l.power;
    publicLights.push(l);return l;
  };
  // Screens are explicit equipment, not "anything with glow".  A tenant or public fixture hands
  // over the exact retained faces it owns and the hours they trade.  On the closing edge we keep
  // each prop's actual colour reference, glow and alpha, replace them with one prebuilt dark state,
  // and restore those exact values on the opening edge.  Nothing is allocated or rewritten while
  // the clock remains on the same side of that edge.
  const DISPLAY_OFF=C('#080b0f'), DISPLAY_DIM=C('#12202a');
  const displayInHours=(minutes,hours)=>{
    const m=clockMinute(minutes),open=hours[0]*60,close=hours[1]*60;
    return m>=open&&m<close;
  };
  const ownPoweredDisplay=(ps,owner,hours,opt={})=>{
    const parts=[],seen=new Set();
    const add=p=>{
      if(!p||seen.has(p))return;
      // A physical face has one power owner.  Re-registering it would make restoration order
      // ambiguous, so the first explicit owner wins and the duplicate is ignored.
      if(p._mallPower)return;
      seen.add(p);
      parts.push({p,color:null,glow:undefined,alpha:undefined});
    };
    for(const p of [ps].flat(Infinity))add(p);
    const q={owner,id:opt.id||'display',hours,parts,active:true,phase:'on',transitions:0,
      essential:!!opt.essential,offColor:opt.offColor||(opt.essential?DISPLAY_DIM:DISPLAY_OFF),
      offGlow:opt.offGlow===undefined?(opt.essential?.012:0):opt.offGlow,
      offAlpha:opt.offAlpha,
      // A retained animation may have advanced its logical state while the hardware was off.
      // `restore` is an opening-edge hook for that one case; it never runs in the steady state.
      restore:typeof opt.restore==='function'?opt.restore:null};
    for(const s of parts) {
      s.p._mallPower=q;
      // Power changes are clock generations, not display-rate animation.  Static faces join the
      // retained generation list; already-dynamic faces remain in their existing upload path.
      s.p._instNight=true;
    }
    if(parts.length)poweredDisplays.push(q);
    return q;
  };
  const updateDisplayPower=minutes=>{
    let changed=0;
    for(const q of poweredDisplays) {
      const active=displayInHours(minutes,q.hours);
      q.phase=active?'on':'off';
      if(active===q.active)continue;
      q.active=active;q.transitions++;changed++;
      for(const s of q.parts) {
        const p=s.p;
        if(active) {
          p.color=s.color;p.glow=s.glow;p.alpha=s.alpha;
          // A powered-down face is excluded from setNight(), so reopening after an overnight
          // lighting change must catch up once rather than restore yesterday's dusk contribution.
          if(p._mallLitK!==undefined)
            p.glow=(p.glow0===undefined?(p.glow0=s.glow||0):p.glow0)+nightK*p._mallLitK*.30;
        } else {
          s.color=p.color;s.glow=p.glow;s.alpha=p.alpha;
          p.color=q.offColor;p.glow=q.offGlow;
          if(q.offAlpha!==undefined)p.alpha=q.offAlpha;
        }
      }
      if(active&&q.restore)q.restore(minutes,q);
    }
    // game.js already refreshes `_instNight` faces on this generation. One increment repacks every
    // transitioned screen exactly once, without promoting static kiosks to per-frame uploads.
    if(changed)instanceState.night++;
    return changed;
  };
  let tenantMissing=[];
  function checkTenants() {
    tenantMissing=TENANTS.filter(t=>typeof MallFit[t[0]]!=='function')
                         .map(t=>`${t[0]} (js/${t[2]}.js, ${t[1]}F)`);
    if(tenantMissing.length)
      // Loud on purpose. Checked rather than assumed, because "every harness watches console" is
      // exactly the sort of claim that rots: .bootcheck.js (line 66) and .fpscheck.js (line 108)
      // subscribe to `Runtime.consoleAPICalled` and will surface this. **.audit.js does not** — it
      // listens only for `Log.entryAdded` and `Runtime.exceptionThrown`, and a console.error raises
      // neither, so a render audit stays green with a tenant missing. The machine-readable route is
      // the one to assert on: `motionState().fitsMissing` and `tenants().missing`, both exported.
      console.error(`mall: ${tenantMissing.length} of ${TENANTS.length} tenant fit-outs did not `+
        `register with MallFit and fell back to the inline stand-in — ${tenantMissing.join(', ')}`);
    return tenantMissing;
  }

  // One route resolver for every storefront.  Tenant-owned colon keys win, including an explicit
  // `false`/null opt-out; an inline spec remains a compatibility fallback for an unregistered
  // tenant, and only a genuinely unowned window reaches the shell's generic merchandise.  The
  // serialisable route rows recorded by shop() are exported below so a harness can prove that all
  // authored tenants resolved through their own module instead of inferring it from the picture.
  function resolveShopWindow(kind,inline) {
    const key=kind+':win';
    const colon=typeof MallFit!=='undefined'
      &&Object.prototype.hasOwnProperty.call(MallFit,key);
    if(colon) {
      const registered=MallFit[key];
      return {kind,key,owner:'colon',fn:typeof registered==='function'?registered:null,
        bare:typeof registered!=='function'};
    }
    if(typeof inline==='function')
      return {kind,key,owner:'spec',fn:inline,bare:false};
    return {kind,key,owner:'generic',fn:null,bare:false};
  }

  // ---------------------------------------------------------------- shops you can walk into
  // Local frame per wall: `a` is depth measured inward from the outside wall, `b` runs along it.
  // The shop occupies a ∈ [0, D]; its shopfront stands at a = D and the concourse is beyond that.
  //
  // `yaw` is the way a face on this wall has to be turned to be *read*: a glyph quad's normal is
  // (sin yaw, cos yaw), so it must point back into the building. Getting this the wrong way round
  // does not draw the sign backwards — it draws nothing at all, because the quad is single-sided,
  // and the shop then has a blank fascia over its door.
  const SIDE={
    W:{n:[ 1,0],t:[0, 1],yaw: Math.PI/2,base:[-RX,0],ew:true},
    E:{n:[-1,0],t:[0, 1],yaw:-Math.PI/2,base:[ RX,0],ew:true},
    N:{n:[0, 1],t:[1, 0],yaw:0,         base:[0,-RZ],ew:false},
    S:{n:[0,-1],t:[1, 0],yaw:Math.PI,   base:[0, RZ],ew:false},
  };
  function shop(side,u,len,o) {
    const S=SIDE[side], f=o.floor||1, y0=DECK[f], tag=o.kind, acc=o.accent,
      shopHours=SHOP_HOURS[o.kind]||[9.5,21.5];
    const at=(a,b)=>[S.base[0]+S.n[0]*a+S.t[0]*(u+b), S.base[1]+S.n[1]*a+S.t[1]*(u+b)];
    const dim=(a,b)=>S.ew?[a,b]:[b,a];
    const put=(a,b,w,dp,h,y,c,opt={})=>{ const p=at(a,b),d=dim(w,dp);
      return box(p[0],y0+y,p[1],d[0],h,d[1],c,{tag,...opt}); };
    const rect=(a0,a1,b0,b1)=>{ const p=at(a0,b0),q=at(a1,b1);
      return [Math.min(p[0],q[0]),Math.max(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[1],q[1])]; };

    // ---- where this unit actually stops, which is not always where `len` says.
    //
    // Two rows of shops that meet at a corner both claim the same square metres: the *depth* of one
    // row runs straight through the *length* of the other, and 4.8 m of it. One of the two has to
    // give way, and it has to be the row whose length is long enough to spare it. `cut` is how much
    // comes off each end of this unit, in metres, in its own `b`.
    //
    // What deliberately does NOT move is the tenant frame. `u` and `len` still define b = 0 and the
    // ±len/2 that every fit-out, every hotspot and every MallCast row for this shop is written in —
    // those are world coordinates in somebody else's file and a shifted origin would silently move
    // eleven people into a counter. Only the shell's own floor, ceiling, partitions, coves, fascia,
    // glazing bays and colliders stop earlier. Absent, `cut` is [0,0] and a unit is built end to
    // end exactly as it always was.
    const cut=o.cut||[0,0];
    const bW=-len/2+(cut[0]||0), bE=len/2-(cut[1]||0);   // the two ends
    const bM=(bW+bE)/2, bL=bE-bW;                        // the middle of what is built, and its span
    const endB=s=>s<0?bW:bE;
    // One exact tenant footprint is enough to connect the independent NPC roster back to this
    // unit's real trading hours.  Public routes stop well before these rectangles, so a concourse
    // shopper is never mistaken for a tenant customer; a staff member who steps within a shop keeps
    // the resolved owner in game.js even if avoidance nudges them towards the doorway later.
    const area=rect(0,D,bW,bE);
    shopAreas.push({kind:o.kind,floor:f,hours:shopHours,x0:area[0],x1:area[1],z0:area[2],z1:area[3]});
    // A portal owns only the deep fit-out authored by the tenant module.  The landlord shell is
    // built before the module runs, and the window route is built below before it as well, so a
    // start/end range around `chosen(api)` can mark the eligible interior without ever touching
    // the fascia, glazing, doorway reveal, shutter, window display, threshold, floor or ceiling.
    //
    // Store the full shopfront aperture, not just the three-metre walk-in doorway.  Its two side
    // bays are transparent even when the centre shutter is down; an oblique ray through either
    // bay must therefore keep the interior behind it.  The runtime uses this local frame to ask
    // where an eye-to-prop segment crosses that aperture, one shop at a time — never by deck.
    const portalFront=at(D,0);
    const portal={id:shopPortals.length,kind:o.kind,floor:f,hours:shopHours,
      x:portalFront[0],z:portalFront[1],nx:S.n[0],nz:S.n[1],tx:S.t[0],tz:S.t[1],
      b0:bW,b1:bE,door0:-DW/2,door1:DW/2,y0,y1:y0+3.62,
      x0:area[0],x1:area[1],z0:area[2],z1:area[3],candidates:0,closure:null,closed:false};
    shopPortals.push(portal);
    // The door, the back feature panel with the tenant's name on it, the fascia lettering and the
    // portal reveal all stay on b = 0 whatever is trimmed: the walk-in gap is a hole in the
    // collision that saves and fit-outs both depend on, and the name over it is what the tenant's
    // own file aligns its board to.

    // ---- shopfront glazing, per tenant.
    //
    // Both numbers were hardcoded at the values below, which are the building's house glass: nearly
    // clear, and glossy enough to carry the fascia's reflection. That is right for fifteen tenants
    // and a straitjacket for the ones it is not right for — a jeweller wanting a smoked screen, a
    // café wanting its glass to disappear. A tenant asks for something else either on its spec here
    // (`glassAlpha`, `glassGloss`) or from its own file, through `MallFit['<kind>:glass']`, so a
    // module can own the whole of its own front. Anything not given keeps the house value, so no
    // shop changes appearance unless it opts in.
    const GLASS_ALPHA=.24, GLASS_GLOSS=.92;
    const gsp=(typeof MallFit!=='undefined'&&MallFit[o.kind+':glass'])||null;
    const glassAlpha=o.glassAlpha!==undefined?o.glassAlpha
      :(gsp&&gsp.alpha!==undefined?gsp.alpha:GLASS_ALPHA);
    const glassGloss=o.glassGloss!==undefined?o.glassGloss
      :(gsp&&gsp.gloss!==undefined?gsp.gloss:GLASS_GLOSS);

    // ---- who dresses the window, and how a tenant declines to.
    //
    // The window is built by the shell, before the fit-out runs, because the glass in front of it
    // is built here too — so a tenant file cannot reach it from `fit`. It reaches it here instead,
    // through `MallFit['<kind>:win']`: the same colon convention js/mall-jewel.js already uses, and
    // one that can never collide with a shop kind, so the `MallFit[o.kind]` lookup for the fit-out
    // never finds a window by accident. An old inline `o.win` still works as a compatibility
    // fallback, but an authored colon route owns the window whenever both are present.
    //
    // Three states, because a shop window has three honest answers and until now it had two:
    //
    //   nothing registered   the shell dresses it from WINGOODS, as every undressed window has
    //   a function           the tenant dresses it
    //   `false` (or null)    the tenant has decided the window is bare, and the shell keeps out
    //
    // The third is the new one. A tenant that wants an empty lit case, a full-height graphic or a
    // roller shutter had no way to say so: it could only *add* to the shell's two plinths of
    // generic goods, never remove them, so a jeweller's window had face cream in it and a shop
    // that wanted nothing in its window got two cartons. Registering `false` is the opt-out, and a
    // tenant that registers nothing at all gets exactly the display it got before.
    const winRoute=resolveShopWindow(o.kind,o.win);
    const winFn=winRoute.fn, winBare=winRoute.bare;
    shopWindowRoutes.push({kind:winRoute.kind,key:winRoute.key,
      owner:winRoute.owner,bare:winRoute.bare});

    // ---- the shell, built to one design language so eighteen tenants read as one building.
    //
    // A shop looks designed rather than assembled when three things are true: the floor has an
    // edge, the walls have a top and a bottom, and the light comes from more than one place. So
    // every tenant gets a stone floor with a darker border and a threshold at the door, a skirting
    // and a valance on the walls, and four layers of light — a bright ceiling plane, a warm cove
    // round the perimeter, downlights on a grid, and spots washing the back wall. The tenant's own
    // colour is then worth something, because it is the only saturated thing in the room.
    const wallC=col.shopWall, trimC=col.trim;
    const fp=at(D/2,bM), fd=dim(D-.30,bL-.30);
    flat(fp[0],y0+.015,fp[1],fd[0],fd[1],col.stone,{mode:0,gloss:.34,glow:.015,...MAT.shopTile});
    const bp=at(D/2,bM), bd=dim(D-.9,bL-.9);
    // The inner field is either carpet or a smaller stone. Both now say so in the surface as
    // well as in the shading mode: a woven mode with no weave in it is a flat colour with a name.
    flat(bp[0],y0+.02,bp[1],bd[0],bd[1],o.carpet||col.stoneD,
      // Mode 9 is the outdoor 62 cm paving grid. Stone tenant floors use ordinary lit shading;
      // their material map supplies the surface character without projecting street joints indoors.
      {mode:o.carpet?7:0,gloss:o.carpet?.06:.30,...(o.carpet?MAT.cloth:MAT.shopTile)});
    // Threshold: the band of dark stone across the opening that says where the shop begins.
    put(D-.42,0,.62,DW+.5,.012,.022,col.trim,{hard:true,gloss:.45});
    put(D-.95,0,.50,DW-.2,.014,.024,col.mat,{hard:true,gloss:.08,...MAT.cloth});  // entrance mat
    // Walls: skirting, wall, valance. The back wall is the building's own, so only its lining
    // is drawn here; the two sides are partitions between neighbours.
    for(const s of [-1,1]) {
      // Tenant partitions remain tenant partitions. The public lift landing is on the shaft's
      // west face, clear of the florist, so no shop wall needs a misleading lift-shaped hole.
      const e=endB(s);
      put(D/2,e,D,.16,3.55,1.78,wallC,{hard:true,gloss:.10,...MAT.plaster});
      put(D/2-.04,e-s*.10,D-.1,.05,.16,.08,trimC,{hard:true,gloss:.24});
      put(D/2-.04,e-s*.10,D-.1,.05,.05,3.44,col.stoneD,{hard:true,gloss:.18});
      // A lightbox on each partition. The back wall gets a feature panel, a name and two framed
      // graphics; the sides got a skirting and a valance and then two and a half metres of nothing
      // between them, which is most of what the eye sees standing in the doorway of a shop this
      // shallow. Same three pieces as the back wall's frames, turned through ninety degrees, so
      // there is one vocabulary in the room rather than two. Hung at 1.40–2.70: above the counters
      // and rails the tenants stand against these walls, below the valance.
      if(bL>=5.0) {
        put(2.30,e-s*.13,1.34,.08,1.30,2.05,trimC,{hard:true,gloss:.22});
        litten(put(2.30,e-s*.185,1.20,.03,1.16,2.05,acc,
          {hard:true,mode:1,alpha:.55,glow:.07}),.35);
        put(2.30,e-s*.195,1.20,.02,.14,1.62,col.cream,{hard:true,mode:1,alpha:.85,gloss:.2});
      }
    }
    // The back wall reads at four metres because the cove and the downlights above it put light
    // on it, not because it makes its own. It used to carry `glow`, and so did the side walls and
    // the ceiling — the three biggest surfaces in the room, all of them emitting a little. The
    // result was a shop with no gradient anywhere in it: every wall the same value top to bottom,
    // corners that did not darken, and a white box that no amount of fittings could make solid.
    // Lighting a room is done with lights. These are surfaces.
    put(.16,bM,.10,bL-.34,3.50,1.75,wallC,{hard:true,gloss:.10,...MAT.plaster});
    put(.24,bM,.06,bL-.34,.16,.08,trimC,{hard:true,gloss:.24});
    put(.24,bM,.06,bL-.34,.05,3.44,col.stoneD,{hard:true,gloss:.18});
    // Back wall elevation: a slatted timber feature panel in the middle with the name on it, and
    // a framed, softly lit graphic either side. Restraint here is what reads as a real shopfit.
    // Stays on b = 0 with the door and the name, not on the middle of what is built: a tenant's
    // own file aligns its board and its lighting to this panel, and those are numbers in another
    // file. The third term never binds on an untrimmed unit (len*.42 < len-.6 for anything over a
    // metre long); it is there so a deep trim can never leave the panel hanging past an end.
    const fw=Math.min(len*.42,4.6,bL-.6);
    put(.30,0,.10,fw,2.50,1.70,col.woodD,{hard:true,gloss:.16,...MAT.timber});
    const fins=Math.max(6,Math.round(fw/.30));
    for(let i=0;i<fins;i++)
      put(.36,-fw/2+.15+i*((fw-.30)/(fins-1)),.07,.075,2.42,1.70,col.wood,
        {hard:true,gloss:.22,...MAT.timber});
    litten(put(.34,0,.03,fw-.30,.10,2.98,col.warm,{hard:true,mode:1,glow:.26}),.6);
    const bw=at(.42,0);
    glyphs(bw[0],y0+1.95,bw[1],S.yaw,o.name,
      {size:.26,gap:.09,color:col.goldL,mode:1,glow:.16,tag});
    for(const s of [-1,1]) {
      const b=s*(fw/2+Math.min(1.5,(len-fw)/4)+.25);
      // Against the ends that are actually built, not the nominal ones: on a trimmed unit the
      // outboard graphic would otherwise be hung on a piece of wall that is no longer there.
      if(b-.7<bW+.3||b+.7>bE-.3) continue;
      put(.30,b,.08,1.16,1.62,1.86,trimC,{hard:true,gloss:.22});
      litten(put(.35,b,.03,1.02,1.48,1.90,acc,{hard:true,mode:1,alpha:.55,glow:.07}),.35);
      put(.36,b,.02,1.02,.16,1.24,col.cream,{hard:true,mode:1,alpha:.85,gloss:.2});
    }
    // Ceiling: plane, perimeter cove, downlight grid, and spots aimed at the feature wall.
    put(D/2,bM,D-.30,bL-.30,.16,3.62,col.shopCeil,{hard:true,gloss:.10,glow:.01,...MAT.plaster});
    litten(put(.34,bM,.10,bL-.9,.06,3.46,col.warm,{hard:true,mode:1,glow:.30}),.7);
    for(const s of [-1,1]) litten(put(D/2,endB(s)-s*.22,D-1.0,.10,.06,3.46,col.warm,
      {hard:true,mode:1,glow:.24}),.5);
    const cols=Math.max(2,Math.round((bL-1.2)/1.7));
    for(let i=0;i<cols;i++) for(const a of [1.35,3.05]) {
      const b=bM-(bL-1.6)/2+i*((bL-1.6)/(cols-1||1));
      const [dx,dz]=at(a,b);
      litten(cyl(dx,y0+3.50,dz,.16,.05,col.warm,{mode:1,glow:.28}),.55);
    }
    // No light pool on the shop floor. A glow in this renderer is a soft sprite rather than a
    // decal, and one per shop hanging at deck height fogged the whole upper level white: the
    // ceiling fittings above already carry the lit look, at no cost to what you can see.
    for(let i=0;i<Math.max(2,cols-1);i++) {
      const b=bM-(bL-2.4)/2+i*((bL-2.4)/(Math.max(2,cols-1)-1||1));
      // The lens used to be built at a .86 — behind the .87–1.03 housing in this frame, where
      // depth runs outward — so all that showed of it was 3 cm poking under the bottom. From the
      // concourse each spot was a matte-black 16 cm cube hanging off a white ceiling with no light
      // on it anywhere, four of them a shop, and they were the highest-contrast thing in the room.
      // A ceiling spot wears its lens underneath. Sat flush under the housing it reads as a lit
      // fitting from the door, from the aisle and from the deck above.
      put(.95,b,.13,.13,.12,3.30,trimC,{hard:true,gloss:.3});
      // Full 16 cm footprint, not 13: set 1.5 cm in on every side it was a sliver you could only
      // see from directly underneath, and from the door the fitting was still a black cube. Flush
      // with the housing's faces, it gives the box a lit band along its bottom edge from any angle
      // in the room.
      litten(put(.95,b,.16,.16,.06,3.21,col.warm,{hard:true,mode:1,glow:.34}),.7);
    }
    // The window is dressed by the tenant through the same frame as the rest of the shop, but it
    // is built before the fittings are, because the glass in front of it is built here too.
    const winApi={at,dim,put,y0,yaw:S.yaw,tag,acc,
      cyl:(a,b,y,r,h,c,oo={})=>{const p=at(a,b);return cyl(p[0],y0+y,p[1],r,h,c,{tag,...oo});},
      ball:(a,b,y,rx,ry,rz,c,oo={})=>{const p=at(a,b);return ball(p[0],y0+y,p[1],rx,ry,rz,c,{tag,...oo});},
      taper:(a,b,y,sx,sy,sz,c,oo={})=>{const p=at(a,b);return taper(p[0],y0+y,p[1],sx,sy,sz,c,{tag,...oo});},
      cap:(a,b,y,sx,sy,sz,c,oo={})=>{const p=at(a,b);return capsule(p[0],y0+y,p[1],sx,sy,sz,c,{tag,...oo});},
      mannequin:(a,b,c)=>{const p=at(a,b);mannequin(p[0],p[1],c,S.yaw,y0+.46,tag);}};
    // ---- shopfront: stall riser, glazing in slim bays, fascia with a shadow gap, and the sign.
    // Everything here stacks outward towards the concourse — fascia, then band, then lettering —
    // because the shop is read from the outside and whatever is furthest out is what you see.
    put(D+.08,bM,.30,bL,.62,4.10,trimC,{hard:true,gloss:.26});                 // fascia
    put(D+.22,bM,.06,bL-.10,.05,3.74,col.black,{hard:true,gloss:.1});          // shadow gap
    litten(put(D+.25,bM,.08,bL-.40,.50,3.42,acc,{hard:true,mode:1,glow:.14}),.5);
    put(D+.28,bM,.03,bL-.40,.035,3.15,col.goldL,{hard:true,mode:1,gloss:.4});  // hairline under it
    const sp=at(D+.31,0);
    glyphs(sp[0],y0+3.44,sp[1],S.yaw,o.name,{size:.30,gap:.10,color:col.white,mode:1,glow:.20,tag});
    glyphs(sp[0],y0+3.06,sp[1],S.yaw,o.brand,{size:.115,gap:.04,color:col.goldL,mode:1,glow:.09,tag});
    // Level one is the arrival floor, so its doors get a common portal reveal: graphite jambs,
    // one fine bronze edge and a shallow lintel below the tenant colour.  It gives the ground
    // storefronts a stronger pedestrian scale without changing their 3 m openings, glass panes,
    // security pedestals or any collider. Upper levels deliberately keep their lighter gallery
    // treatment.
    if(f===1) {
      for(const s of [-1,1]) {
        put(D+.30,s*(DW/2+.055),.11,.11,2.86,1.54,FREV,{hard:true,gloss:.30});
        litten(put(D+.365,s*(DW/2+.055),.025,.045,2.62,1.54,FBAND,
          {hard:true,mode:1,glow:.055}),.16);
      }
      put(D+.30,0,.11,DW+.22,.13,2.985,FREV,{hard:true,gloss:.30});
    }
    // Level two is the mall's curated retail/gallery deck.  A small common plaque and a pair of
    // brass jamb lines make its six otherwise very different tenants read as one collection from
    // across the atrium, without changing the opening, glazing or collision inherited from the
    // shop shell.  They sit proud of the fascia, so the tenant colour remains the largest field.
    if(f===2) {
      const badgeB=bW+.58, bp=at(D+.34,badgeB);
      put(D+.32,badgeB,.07,.66,.42,2.75,col.charcoal,{hard:true,gloss:.30});
      put(D+.355,badgeB,.025,.54,.045,2.54,col.jadeL,{hard:true,mode:1,glow:.10});
      glyphs(bp[0],y0+2.78,bp[1],S.yaw,'2F',
        {size:.145,gap:.045,color:col.goldL,mode:1,glow:.12,tag});
      for(const s of [-1,1])
        litten(put(D+.30,endB(s)-s*.13,.055,.055,2.88,1.68,col.goldL,
          {hard:true,mode:1,glow:.055}),.18);
    }
    // Level three is one destination rather than a second retail ring: food, film and games share
    // a dark-lacquer-and-brass portal language.  The tenant colour still owns the fascia, while a
    // compact 3F seal and two warm jamb lines make the cinema and arcade read as members of the
    // same entertainment floor when seen across the void.  Everything sits proud of the existing
    // shell and outside the three-metre opening, so neither glazing nor circulation changes.
    if(f===3) {
      const badgeB=bW+.62, bp=at(D+.35,badgeB);
      put(D+.325,badgeB,.075,.72,.50,2.73,C('#4a2022'),{hard:true,gloss:.28});
      put(D+.365,badgeB,.025,.56,.055,2.49,C('#c69a50'),{hard:true,mode:1,glow:.065});
      glyphs(bp[0],y0+2.78,bp[1],S.yaw,'3F',
        {size:.165,gap:.045,color:C('#f0d8a0'),mode:1,glow:.095,tag});
      for(const s of [-1,1]) {
        put(D+.305,s*(DW/2+.07),.10,.10,2.92,1.60,C('#2a2728'),{hard:true,gloss:.30});
        litten(put(D+.365,s*(DW/2+.07),.024,.035,2.62,1.60,C('#d5b46f'),
          {hard:true,mode:1,glow:.050}),.14);
      }
      put(D+.305,0,.10,DW+.24,.12,3.01,C('#2a2728'),{hard:true,gloss:.30});
      // The landlord fascia has a 62 cm black crown over the tenant-colour band.  On this floor it
      // becomes useful shared identity rather than an empty strip, kept small and brass so the
      // cinema / arcade names below remain the first words read from the concourse.
      const cp=at(D+.315,0);
      glyphs(cp[0],y0+4.10,cp[1],S.yaw,'三楼 · 食 · 影 · 玩',
        {size:.135,gap:.042,color:C('#d6b46f'),mode:1,glow:.050,tag});
      put(D+.31,bM,.022,bL-.72,.028,4.36,C('#8d6a38'),{hard:true,mode:1,glow:.025});
    }
    // The sign band above already looks lit; this makes it light something. One warm lamp hung
    // just outside the glass at fascia height, which is where the light in a mall aisle actually
    // comes from — the fascia and the paving in front of each tenant, not a bulb in the ceiling
    // thirteen metres up. Eighteen of these across three decks and only the eight nearest the eye
    // reach the shader, so standing in front of a shopfront is lit by that shopfront.
    const lp=at(D+.60,0);
    ownShopLight(B.light(lp[0],y0+3.10,lp[1],tenantLightColor(tag),.50,2.7),tag,shopHours);
    // The slim housing is architectural and remains by day. Behind the glass, one corrugated
    // retained panel and its bottom rail fade down after this trade closes. The shutter sits seven
    // centimetres behind the glazing and in front of the display, avoiding coplanar shimmer while
    // leaving the three-metre doorway and every collider unchanged.
    put(D-.10,bM,.16,bL-.16,.20,3.02,col.charcoal,{hard:true,gloss:.30,tag:'闭店卷帘'});
    const shutter=put(D-.10,bM,.045,bL-.22,2.52,1.66,C('#565d63'),
      {hard:true,alpha:.001,gloss:.30,mat:'steel',matScale:.44,matAmt:.20,tag:'闭店卷帘'});
    const shutterRail=put(D-.115,bM,.075,bL-.18,.12,.39,col.steelD,
      {hard:true,alpha:.001,gloss:.52,tag:'闭店卷帘'});
    // These two now travel, so their fixed cull sphere covers the full 2.52 m descent before
    // Build.finish packs it. `closed` is kept as authored geometry and copied only when the game
    // clock crosses a visible phase step; no matrix is rebuilt while time is standing still.
    const shutterAt=at(D-.10,bM),shutterClosed=shutter.m.slice(),railClosed=shutterRail.m.slice();
    const shutterBound=Math.hypot((bL-.18)*.5,1.36)+.15;
    boundMotion(shutter,shutterAt[0],y0+1.66,shutterAt[1],shutterBound);
    boundMotion(shutterRail,shutterAt[0],y0+1.66,shutterAt[1],shutterBound);
    const closure={kind:o.kind,hours:shopHours,
      parts:[shutter,shutterRail],shutter,shutterRail,shutterClosed,railClosed,
      top:shutterClosed[13]+Math.abs(shutterClosed[5])*.5,height:Math.abs(shutterClosed[5])};
    closure.portal=portal;portal.closure=closure;
    shopClosures.push(closure);
    for(const s of [-1,1]) {
      // The two flanks of glass, each running from the edge of the 3 m opening to the end of the
      // unit *as built*. Measured per side rather than once, because a trimmed unit is no longer
      // symmetrical about its door: on an untrimmed one both are (len-DW)/2, exactly as before.
      const c0=s*DW/2, c1=endB(s);
      const half=Math.abs(c1-c0), panes=Math.max(2,Math.round(half/1.5));
      // Window display: a raised platform behind the glass, lit from above.
      put(D-.62,(c0+c1)/2,1.05,half-.30,.34,.17,col.woodD,{hard:true,gloss:.24,...MAT.timber});
      litten(put(D-.30,(c0+c1)/2,.10,half-.50,.08,3.30,col.warm,{hard:true,mode:1,glow:.30}),.6);
      put(D-.02,(c0+c1)/2,.14,half-.06,.42,.21,col.stoneD,
        {hard:true,gloss:.30,...MAT.slab});                                         // stall riser
      // and what stands on the platform, which is the only part of a shop most people ever see.
      // The window is the only part of a shop most people ever see, and until now a tenant that
      // had not dressed its own put a plinth in the glass with a single rounded cube of accent
      // colour on it. Eighteen shops, thirty-six cubes, none of them anything at all. A window
      // shows what the shop sells, so the shell asks the tenant's own trade what to stand there.
      //
      // Three answers, not two, because a shop window has three honest ones. See `winFn` above.
      if(winFn) winFn(winApi,(c0+c1)/2,s); else if(!winBare) {
        const g=GOODS[WINGOODS[o.kind]]||GOODS.box;
        for(const k of [-1,1]) {
          const bb=(c0+c1)/2+k*(half*.22);
          put(D-.62,bb,.44,.44,.46,.45,col.stone,{hard:true,gloss:.36,...MAT.slab}); // plinth
          put(D-.62,bb,.46,.46,.03,.69,col.trim,{hard:true,gloss:.44});           // plinth top edge
          for(let j=0;j<3;j++)
            g(winApi,D-.62,bb-.14+j*.14,.70,[acc,col.cream,col.stone][j%3]);
        }
      }
      for(let i=0;i<panes;i++) {
        const b=c0+(c1-c0)*((i+.5)/panes);
        litten(put(D-.02,b,.045,(half/panes)-.09,2.72,1.78,col.glass,
          {hard:true,mode:1,alpha:glassAlpha,gloss:glassGloss}),.10);
        if(i) put(D-.03,c0+(c1-c0)*(i/panes),.075,.075,2.72,1.78,trimC,{hard:true,gloss:.5});
      }
      put(D-.04,c0,.11,.11,3.02,1.60,col.steelD,{hard:true,gloss:.55});
      put(D-.04,c1,.11,.11,3.02,1.60,col.steelD,{hard:true,gloss:.55});
      // Security pedestal at the opening, the small detail every real shop has. Slim, dark and
      // right on the threshold, or it reads as a column standing in the middle of the doorway.
      put(D-.20,c0*.94,.12,.16,1.42,.71,col.trim,{hard:true,gloss:.40});
      litten(put(D-.20,c0*.94,.05,.06,.05,1.36,col.jadeL,{hard:true,mode:1,glow:.2}),.3);
    }
    // One faint fingertip whorl per tenant, deliberately close to the opening and absent from wide
    // views.  It is a single glyph-sized decal, not a glass-sized grime sheet (18 props total).
    const smearB=bE>1.76?1.62:bW< -1.76?-1.62:0, smearAt=at(D+.016,smearB);
    glyphs(smearAt[0],y0+1.46,smearAt[1],S.yaw,'◎',
      {size:.095,color:C('#e7e2d7'),mode:1,alpha:.12,glow:.003,tag:'玻璃指印'});
    // One shared hours/status plaque beside every opening.  The hours are immutable truthful copy;
    // one retained line changes colour with the same phase object that moves this unit's shutter.
    const plaqueB=bE>1.92?1.80:-1.80, plaqueAt=at(D+.055,plaqueB);
    put(D+.045,plaqueB,.075,.62,.54,1.30,col.charcoal,{hard:true,gloss:.28,tag:'营业时间'});
    const hoursLabel=`${clock(Math.round(shopHours[0]*60))}–${clock(Math.round(shopHours[1]*60))}`;
    glyphs(plaqueAt[0],y0+1.39,plaqueAt[1],S.yaw,hoursLabel,
      {size:.052,gap:.014,color:col.white,mode:1,glow:.030,tag:'营业时间'});
    const status=put(D+.087,plaqueB,.018,.48,.052,1.09,CLOSED_RED.slice(),
      {hard:true,mode:1,glow:.018,tag:'营业时间'});
    dynamicVisual(status);closure.status=status;
    // Collision: the glass blocks, the opening does not, and neighbours are kept apart.
    for(const s of [-1,1]) {
      const e=endB(s);
      const r=rect(D-.35,D+.15,s*DW/2,e); stop(f,r[0],r[1],r[2],r[3]);
      // 0.20 m deep whatever the wall in front of it is doing. The clamp is a destination test,
      // not a swept one, so this has to stay comfortably wider than the 0.1434 m the body can
      // cover in one frame — see the note in the agent brief about tunnelling thin partitions.
      const q=rect(.10,D,e-s*.10,e+s*.10); stop(f,q[0],q[1],q[2],q[3]);
    }
    if(f>1) { const back=rect(-.1,.45,bW,bE); blockUp(f,back[0],back[1],back[2],back[3]); }
    // Somewhere to hang the tenant's own label from, out in the concourse.
    const th=(hz,a,b,zh,en,note,reach=1.6,y=1.5)=>{
      const p=at(a,b), fo=at(a+ (a<D?1.15:-1.15),b);
      const t=thing(hz,p[0],y0+y,p[1],zh,en,note,{focus:[fo[0],fo[1]],reach});
      t.mallFloor=f; t.mallShop=tag; return t;
    };
    // Round shapes and furniture in the shop's own frame, so a shelf of jars or a table of four
    // reads the same whichever of the four walls the tenant is on.
    const api={at,dim,put,rect,th,y0,yaw:S.yaw,tag,acc,f,len,
      // Generated tenant fixtures use the same local (a,b,y) frame as every authored helper.
      // Only their visible mesh is optional: the callback retains the tenant's exact procedural
      // fallback, while stops and Things stay in the tenant module outside this branch.
      modelOr:(name,a,b,y,s,o={},fallback)=>{const p=at(a,b);
        return B.modelOr(name,p[0],y0+y,p[1],s,
          {...o,ry:S.yaw+(o.ry||0),tag:o.tag||tag},fallback);},
      stop:(a0,a1,b0,b1)=>{const r=rect(a0,a1,b0,b1);stop(f,r[0],r[1],r[2],r[3]);},
      block:(r)=>stop(f,r[0],r[1],r[2],r[3]),
      // (a, b, y, r, h, colour, opts) and friends — depth, offset, height, then the shape's own.
      cyl:(a,b,y,r,h,c,o={})=>{const p=at(a,b);return cyl(p[0],y0+y,p[1],r,h,c,{tag,...o});},
      ball:(a,b,y,rx,ry,rz,c,o={})=>{const p=at(a,b);return ball(p[0],y0+y,p[1],rx,ry,rz,c,{tag,...o});},
      cap:(a,b,y,sx,sy,sz,c,o={})=>{const p=at(a,b);return capsule(p[0],y0+y,p[1],sx,sy,sz,c,{tag,...o});},
      taper:(a,b,y,sx,sy,sz,c,o={})=>{const p=at(a,b);return taper(p[0],y0+y,p[1],sx,sy,sz,c,{tag,...o});},
      table:(a,b,seats=4,r=.50)=>{const p=at(a,b);
        const bd=table(p[0],p[1],y0,tag,seats,r); stop(f,bd[0],bd[1],bd[2],bd[3]); return bd;},
      glyph:(a,b,y,t,opt={})=>{const p=at(a,b);
        return glyphs(p[0],y0+y,p[1],opt.back?S.yaw+Math.PI:S.yaw,t,
          {size:.2,gap:.06,color:col.white,mode:1,tag,...opt});}};
    // The millwork, hung on the api so a fit-out authored in another file can reach it. These
    // take the api as their first argument already, so this is only a binding.
    // A shop lights itself. Eight lights reach the shader and the nearest to the camera win, so
    // a tenant declaring two or three of its own is safe: standing inside a shop, that shop's
    // lights are the near ones and the concourse's are not.
    api.light=(a,b,y,c,power,radius)=>{const p=at(a,b);
      return ownShopLight(B.light(p[0],y0+y,p[1],c,power,radius),tag,shopHours);};
    api.rail=(a,b,len,cs,tag2,y)=>rail(api,a,b,len,cs,tag2,y);
    api.island=(a,b,w,dp,fill)=>island(api,a,b,w,dp,fill);
    api.counter=(a,b,w,dp,c,till)=>counter(api,a,b,w,dp,c,till);
    // A tenant's animation joins the mall's one clock and is culled twice: first by floor, then by
    // distance from the middle of the unit.  The callback receives absolute seconds, a durable
    // numeric state object for diagnostics, the player, game minutes and the room's night mix.
    // Absolute time means a distant machine can simply resume at the right phase after being
    // skipped; there is no hidden per-frame accumulator to catch up.
    api.motion=(name,fn,opt={})=>{
      const c=at(D/2,0), q={name:`${tag}:${name}`,fn,state:{},floor:f,x:c[0],z:c[1],
        far:opt.far===undefined?24:opt.far,always:!!opt.always};
      MallFitTick.push(q); return q.state;
    };
    // Mark a moving primitive before Build.finish packs its cull sphere.  Coordinates are in the
    // tenant frame, just like every other fit-out helper, and y is measured from its own deck.
    api.dynamic=(p,a,b,y,r)=>{
      const c=at(a,b); return boundMotion(p,c[0],y0+y,c[1],r);
    };
    // A glow/alpha/colour animation does not need a larger cull sphere, but it does need to opt
    // out of the renderer's retained static instance record. Tenant fit-outs use this beside
    // motion() for screens, indicators and marquee lamps whose transforms never move.
    api.dynamicVisual=(...ps)=>dynamicVisual(...ps);
    // Explicit retained device ownership.  The returned controller is stable for the whole visit;
    // a tenant callback can skip its screen writes while `active` is false, preventing a closed
    // attract loop from fighting the one-off power transition.
    api.powerDisplay=(ps,opt={})=>ownPoweredDisplay(ps,tag,shopHours,opt);
    // Steam is shared mall machinery rather than eighteen copies of the same tick loop.  Source
    // options let a coffee wand make a short intermittent curl while a stockpot makes a tall,
    // steady plume, all from the same bounded pool of puffs.
    api.steam=(a,b,y,opt={})=>{
      const c=at(a,b), n=Math.max(2,Math.min(8,opt.n||5));
      const r={x:c[0],y:y0+y,z:c[1],puffs:makePuffs(n),speed:opt.speed||.16,
        height:opt.height||.55,spread:opt.spread||.22,alpha:opt.alpha||.55,
        phase:opt.phase||0,cycle:opt.cycle===undefined?1:opt.cycle,
        duty:opt.duty===undefined?1:clamp(opt.duty,.1,1)};
      r.puffs.forEach(q=>boundMotion(q.p,r.x,r.y+r.height*.5,r.z,r.height+r.spread));
      steamRigs.push(r); return r;
    };
    // A tenant file wins over the inline fit; see MallFit at the top of this file. A registered
    // entry that is null or not a function falls through, so a stub file is harmless.
    const ext=typeof MallFit!=='undefined'?MallFit[o.kind]:null;
    const chosen=typeof ext==='function'?ext:o.fit;
    if(chosen) {
      const first=B.props.length;
      chosen(api);
      for(let i=first;i<B.props.length;i++) {
        const p=B.props[i];
        p._mallPortal=portal.id;
        portalProps.push(p);
      }
      portal.candidates=B.props.length-first;
    }
    return api;
  }
  // ---------------------------------------------------------------- shop millwork
  // The pieces every tenant is fitted out of, written in the shop's own frame. One counter, one
  // island, one shelving system and one rail, used across all eighteen units: that repetition is
  // what makes a row of different shops look like one architect's work and not eighteen sketches.
  //
  // Everything shares three heights — 0.15 plinth, 0.90 working top, 2.20 top of joinery — and a
  // matte black trim line, so a shop the player walks into always has the same bones under it.
  function counter(A,a,b,w,dp,c=col.woodD,till=true) {
    // The first counter in a shop is its till. Choosing something off a rail only puts it in your
    // hands; this is where it becomes yours, which is the same two steps the supermarket uses.
    if(till&&!A.hasTill) {
      A.hasTill=true;
      A.put(a,b+w/2-.02,dp+.16,.30,.26,1.24,col.trim,{hard:true,gloss:.3,tag:'收银台'});
      // Labels, screen and interaction all belong on the customer face (+a). They used to sit on
      // the staff face, while the hotspot was pushed through the shopfront into the concourse.
      A.glyph(a+dp/2+.03,b,1.16,'收银台',{size:.13,gap:.04,color:col.goldL,glow:.12,tag:'收银台'});
      const t=A.th('收银台',a+dp/2-.75,b,'这个多少钱？','How much is this one?',
        '收银 to take payment + 台 counter.',1.7,1.2);
      t.mallShop=A.tag;
    }
    // The body takes the grain of whatever it is made of: timber for the joinery colours, the
    // small stone slab for the painted and stone-faced ones. `c` is the tenant's choice.
    A.put(a,b,dp,w,.78,.51,c,{hard:true,gloss:.22,
      ...((c===col.woodD||c===col.wood)?MAT.timber:MAT.plaster)});   // body
    A.put(a,b,dp-.10,w-.14,.16,.10,col.trim,{hard:true,gloss:.3});   // recessed plinth
    A.put(a,b,dp+.10,w+.12,.08,.94,col.stone,{hard:true,gloss:.42,...MAT.slab}); // stone top
    litten(A.put(a+dp/2+.02,b,.03,w-.30,.05,.60,col.warm,{hard:true,mode:1,glow:.18}),.4);
    if(till) {
      A.put(a-.12,b+w/2-.55,.30,.42,.26,1.11,col.trim,{hard:true,gloss:.35});
      const tillScreen=litten(A.put(a+.055,b+w/2-.55,.04,.34,.20,1.24,col.screen,
        {hard:true,mode:1,glow:.16}),.35);
      A.powerDisplay(tillScreen,{id:'till'});
      A.put(a-.05,b-w/2+.45,.22,.30,.10,1.03,col.steel,{hard:true,gloss:.5});
    }
    A.stop(a-dp/2,a+dp/2,b-w/2,b+w/2);
  }
  // Backlit wall shelving: a recessed bay, slim shelves, a glowing back and goods standing on it.
  //
  // Depth runs outward: `a` is measured from the back wall towards the concourse, so the shelves
  // and the goods sit at a *larger* a than the carcass behind them. Built the other way round the
  // whole bay hides its own contents and a bookshop reads as a black slab.
  function shelfWall(A,a,b,w,rows,cols,cs,tag,h=2.30,kind='box') {
    A.put(a,b,.30,w,h,1.24,col.woodD,{hard:true,gloss:.18,...MAT.timber});
    litten(A.put(a+.14,b,.04,w-.16,h-.16,1.24,C('#f0e6d2'),{hard:true,mode:1,glow:.07}),.45);
    A.put(a+.20,b,.16,w,.10,1.24+h/2-.05,col.trim,{hard:true,gloss:.24});
    A.put(a+.20,b,.16,w,.10,1.24-h/2+.02,col.trim,{hard:true,gloss:.24});
    for(let i=0;i<rows;i++) {
      const y=1.24-h/2+.30+i*((h-.5)/Math.max(1,rows-1));
      A.put(a+.20,b,.30,w-.06,.045,y,col.wood,{hard:true,gloss:.22,tag,...MAT.timber});
      // Goods stand in runs, not one every half metre: a shelf with gaps between single objects
      // reads as a museum case, and a shop is meant to look stocked.
      //
      // Books are the exception and get filled edge to edge. A bookshelf is the one fixture where
      // the goods are the surface — you do not see the shelf between them — so clusters of four
      // with a metre of empty timber between clusters read as a shop that has sold out. They run
      // the whole length now, with the odd gap where somebody has taken one out.
      if(kind==='book') {
        const step=.052, n2=Math.max(4,Math.floor((w-.34)/step));
        for(let k=0;k<n2;k++) {
          const bb=b-w/2+.17+k*step;
          if(((k*7+i*5)%23)===0) continue;                 // a gap, where one has been lifted out
          GOODS.book(A,a+.22,bb,y+.025,cs[(i+k)%cs.length]);
        }
      } else {
        const pitch=(w-.6)/Math.max(1,cols-1), run=kind==='jar'||kind==='bottle'?3:2;
        for(let k=0;k<cols;k++) for(let j=0;j<run;j++)
          (GOODS[kind]||GOODS.box)(A,a+.22,
            b-w/2+.30+k*pitch+(j-(run-1)/2)*.15,y+.025,
            cs[(i+k+j)%cs.length]);
      }
    }
    A.stop(a-.20,a+.36,b-w/2,b+w/2);
  }
  // ---- the goods themselves.
  // A shop is only as convincing as the thing on its shelf, and a thing on a shelf is three or four
  // primitives, not one: a shoe is a sole and an upper, a bottle is a body and a neck and a cap, a
  // book is a spine that leans. These are all written in the shop's own frame, so the same shelf
  // reads correctly on any of the four walls.
  const GOODS={
    // (A, depth, along, height-of-the-surface, colour)
    box(A,a,b,y,c) {                                    // a carton, with a label band
      const w=.20+((b*7|0)%3)*.05, h=.26+((b*11|0)%3)*.06;
      A.put(a,b,w,w*1.15,h,y+h/2,c,{round:.02,mode:7});
      A.put(a-.005,b,w*.5,w*1.2,h*.34,y+h*.62,col.cream,{hard:true,mode:7});
    },
    bottle(A,a,b,y,c) {                                 // body, shoulder, neck, cap
      A.cyl(a,b,y+.13,.062,.26,c,{gloss:.55});
      A.taper(a,b,y+.30,.124,.08,.124,c,{gloss:.55});
      A.cyl(a,b,y+.37,.022,.09,c,{gloss:.6});
      A.cyl(a,b,y+.43,.030,.045,col.trim,{gloss:.5});
    },
    stack(A,a,b,y,c) {                                  // three or four books lying flat
      const n=3+((b*7|0)%2);
      for(let i=0;i<n;i++)
        A.put(a+((i%2)*.012),b,.22-(i*.008),.17,.035,y+.02+i*.038,
          [c,col.cream,col.blue,col.red][i%4],{hard:true,mode:7});
    },
    book(A,a,b,y,c) {                                   // a spine, occasionally leaning
      const h=.24+((b*13|0)%3)*.05, lean=((b*17|0)%5===0)?.22:0;
      A.put(a,b,.16,.045,h,y+h/2,c,{hard:true,mode:7,rz:lean});
      A.put(a-.02,b,.02,.05,h*.9,y+h/2,col.cream,{hard:true,mode:7,rz:lean});
    },
    shoe(A,a,b,y,c) {                                   // sole, upper, heel, toe
      A.put(a,b,.30,.13,.035,y+.02,col.trim,{hard:true,gloss:.3});
      A.put(a-.02,b,.22,.12,.10,y+.09,c,{round:.05,mode:7});
      A.put(a+.09,b,.10,.12,.055,y+.06,c,{round:.03,mode:7});
      A.put(a-.11,b,.07,.11,.15,y+.11,c,{round:.04,mode:7});
    },
    cup(A,a,b,y,c) {                                    // cup, lid, sleeve
      A.taper(a,b,y+.06,.11,.13,.11,col.cream,{gloss:.3});
      A.cyl(a,b,y+.14,.062,.03,col.trim,{gloss:.4});
      A.put(a,b,.13,.13,.05,y+.06,c,{round:.02,mode:7});
    },
    plush(A,a,b,y,c) {                                  // body, head, two ears
      A.ball(a,b,y+.10,.11,.10,.10,c,{mode:7});
      A.ball(a,b,y+.24,.085,.085,.085,c,{mode:7});
      for(const s of [-1,1]) A.ball(a,b+s*.06,y+.31,.035,.045,.035,c,{mode:7});
    },
    bread(A,a,b,y,c) {                                  // a bun with a scored top
      A.ball(a,b,y+.055,.10,.07,.08,c,{mode:7,gloss:.16});
      A.put(a,b,.03,.09,.012,y+.11,col.cream,{hard:true,mode:7});
    },
    phone(A,a,b,y,c) {                                  // a handset on a small stand
      // Depth runs outward, so the lit face has to be at a *larger* a than the body. It was at a
      // smaller one, which put every phone's screen behind its own back panel: the demo tables in
      // the digital shop were rows of dark grey nubs and had been for as long as they existed.
      A.put(a+.03,b,.05,.09,.02,y+.01,c,{hard:true,gloss:.3});          // stand foot
      A.put(a+.01,b,.05,.05,.05,y+.04,col.steelD,{hard:true,gloss:.5}); // stand neck
      A.put(a,b,.055,.082,.165,y+.11,col.trim,{hard:true,gloss:.4,rz:.16});
      A.put(a+.030,b,.012,.068,.148,y+.11,col.screen,{hard:true,mode:1,glow:.14,rz:.16});
      A.put(a+.037,b,.008,.050,.030,y+.155,col.cream,{hard:true,mode:1,glow:.06,rz:.16});
    },
    glasses(A,a,b,y,c) {                                // two lenses, a bridge, two arms
      for(const s of [-1,1]) {
        A.put(a,b+s*.055,.02,.075,.055,y+.10,c,{hard:true,gloss:.4});
        A.put(a+.05,b+s*.05,.10,.012,.012,y+.10,c,{hard:true,gloss:.4});
      }
      A.put(a,b,.02,.035,.012,y+.10,c,{hard:true,gloss:.4});
      A.put(a,b,.05,.16,.05,y+.02,col.stone,{hard:true,gloss:.3});
    },
    jar(A,a,b,y,c) {                                    // a cosmetics pot
      A.cyl(a,b,y+.05,.055,.10,c,{gloss:.5});
      A.cyl(a,b,y+.11,.058,.03,col.goldL,{gloss:.7});
    },
  };
  // What each trade puts in its window, when it has not dressed the window itself.
  const WINGOODS={'服装店':'stack','鞋店':'shoe','珠宝店':'jar','电子产品':'phone','眼镜店':'glasses',
    '花店':'bottle','咖啡店':'cup','面包店':'bread','宠物店':'plush','餐厅':'cup','书店':'book',
    '美妆店':'jar','运动店':'shoe','家居店':'box','玩具店':'plush','甜品店':'bread'};

  // A free-standing display island: timber plinth, stone top, and whatever the shop sells on it.
  function island(A,a,b,w,dp,fill) {
    A.put(a,b,dp,w,.72,.51,col.wood,{hard:true,gloss:.24,...MAT.timber});
    A.put(a,b,dp-.12,w-.14,.14,.09,col.trim,{hard:true,gloss:.3});
    A.put(a,b,dp+.08,w+.10,.07,.88,col.stone,{hard:true,gloss:.40,...MAT.slab});
    if(fill) fill(.95);
    A.stop(a-dp/2,a+dp/2,b-w/2,b+w/2);
  }
  // A rail of clothes: the tube, the hangers on it, and garments of slightly different lengths.
  function rail(A,a,b,len,cs,tag='衣服',y=1.62) {
    for(const s of [-1,1]) {
      A.cap(a,b+s*len/2,y/2,.032,y,.032,col.trim,{gloss:.45});
      A.put(a,b+s*len/2,.44,.20,.05,.06,col.trim,{hard:true,gloss:.35});     // foot
    }
    A.cap(a,b,y,.028,len,.028,col.steelD,{rx:Math.PI/2,gloss:.55,tag});
    // A garment on a hanger, and the difference between this and a coloured box is four things:
    // it is narrow at the shoulder and wide at the hem, it is not perfectly vertical, no two hang
    // at the same height, and the hanger it is on is visible above it. A rail of identical upright
    // slabs at one height reads as a shelf of books every time.
    const n=Math.max(4,Math.round(len/.19));
    for(let i=0;i<n;i++) {
      const bb=-len/2+.12+i*((len-.24)/(n-1)), c=cs[i%cs.length];
      const drop=.80+((i*7)%4)*.11;                 // jackets, shirts and coats, not a uniform
      const tilt=(((i*13)%5)-2)*.035;               // nothing on a real rail hangs plumb
      const o={mode:7,tag,rz:tilt};
      A.cap(a,b+bb,y-.05,.016,.12,.016,col.steel,{tag});                     // the hook
      A.put(a,b+bb,.25,.17,.045,y-.12,col.steel,{hard:true,gloss:.4,tag});   // hanger bar
      // Shoulders, then the body falling away from them and widening to the hem.
      A.put(a,b+bb,.23,.115,.10,y-.19,c,{...o,round:.05});
      A.taper(a,b+bb,y-.24-drop/2,.235,drop,.125,c,{...o,gloss:.10});
      // A sleeve down the front face, which is what tells you it is clothing at all.
      A.cap(a+.10,b+bb,y-.30-drop*.28,.030,drop*.52,.030,c,{...o,gloss:.09});
    }
    A.stop(a-.32,a+.32,b-len/2-.1,b+len/2+.1);
  }
  // Shoes, bags, phones — small goods on an angled riser, which is how they are really shown.
  function riser(A,a,b,w,tiers,cs,tag,kind='shoe') {
    A.put(a,b,.70,w,.14,.20,col.woodD,{hard:true,gloss:.24,...MAT.timber});
    for(let t=0;t<tiers;t++) {
      A.put(a-.05-t*.14,b,.42,w-.08,.06,.34+t*.30,col.stone,{hard:true,gloss:.35,...MAT.slab});
      const n=Math.max(2,Math.round(w/.66));
      for(let i=0;i<n;i++) {
        const bb=-w/2+.33+i*((w-.66)/Math.max(1,n-1));
        (GOODS[kind]||GOODS.shoe)(A,a-.05-t*.14,b+bb,.37+t*.30,cs[(i+t)%cs.length]);
      }
    }
    A.stop(a-.45,a+.45,b-w/2,b+w/2);
  }

  // ---------------------------------------------------------------- what is on at the cinema
  // A day's programme, fixed at build time so the board is real text, with one lamp per row that
  // follows the clock. The film you get when you buy a ticket is whatever is on next.
  const clock=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const FILMS=[
    // Invented, not real. Nothing in this building carries a real title, brand or logo, and the
    // same six are restated on the cinema's own board in js/mall-cinema.js — board, box-office
    // picker and diary line all have to name the same programme.
    ['海上明月','Moon Over the Water',112],['星海列车','The Starsea Express',126],
    ['雪山信使','The Snow Courier',104],['北门胡同','Beimen Lane',98],
    ['长夜灯火','Lights in the Long Night',118],['风筝与海','The Kite and the Sea',95],
  ];
  const SHOWS=[10*60+15,11*60+50,13*60+30,15*60+10,16*60+50,18*60+30,20*60+10,21*60+50]
    .map((at,i)=>({at,film:FILMS[i%FILMS.length][0],en:FILMS[i%FILMS.length][1],
                   mins:FILMS[i%FILMS.length][2],lamp:null}));
  let showIdx=0;
  // The next screening from a given minute of the day, wrapping to tomorrow's first show after the
  // last one has started. `wait` is what the box office would tell you.
  function nextShow(minutes) {
    const now=((minutes%1440)+1440)%1440;
    let best=SHOWS[0], wait=SHOWS[0].at+1440-now, idx=0;
    SHOWS.forEach((s,i)=>{ const w=s.at-now; if(w>=-15&&w<wait){wait=w;best=s;idx=i;} });
    return {...best,wait:Math.max(0,Math.round(wait)),idx,
            running:wait<0, clock:clock(best.at)};
  }
  function setClock(minutes) {
    const n=nextShow(minutes);
    if(n.idx===showIdx) return;
    showIdx=n.idx;
    SHOWS.forEach((s,i)=>{
      if(!s.lamp)return;
      const glow=s.lamp.glow0=i===showIdx?.42:.04;
      // The programme keeps advancing while its board is powered down, but the dark retained
      // face must not be overwritten. The opening-edge restore hook applies this cached target.
      if(!s.lamp._mallPower||s.lamp._mallPower.active)s.lamp.glow=glow;
    });
  }

  // ---------------------------------------------------------------- escalators
  const BANKS={
    a:{xUp:-4.60,xDn:-3.40,zBot:-9.00,zTop:-3.82,lo:1,hi:2},
    b:{xUp: 3.40,xDn: 4.60,zBot: 3.82,zTop: 9.00,lo:2,hi:3},
  };
  for(const k in BANKS) {
    const b=BANKS[k];
    b.yBot=DECK[b.lo]; b.yTop=DECK[b.hi];
    b.run=b.zTop-b.zBot; b.rise=b.yTop-b.yBot;
    b.len=Math.hypot(b.run,b.rise); b.ang=Math.atan2(b.rise,b.run);
  }
  function buildEscalator(bank) {
    const zc=(bank.zBot+bank.zTop)/2, yc=(bank.yBot+bank.yTop)/2;
    for(const lane of [{x:bank.xUp,dir:1},{x:bank.xDn,dir:-1}]) {
      lane.bank=bank;
      // No `metal` on the skirt or the comb plates. See the note on the balustrade shoe: the map
      // is near-featureless, so at this size all it did was lift #6e7981 steel to something close
      // to white — the two things in this hall that ought to read as brushed metal were the
      // palest objects in the frame.
      box(lane.x,yc-.26,zc,.86,.30,bank.len,col.steelD,
        {rx:-bank.ang,hard:true,gloss:.52,tag:'扶梯'});
      for(const s of [-1,1]) {
        box(lane.x+s*.44,yc+.33,zc,.055,1.02,bank.len,col.glass,
          {rx:-bank.ang,hard:true,mode:1,alpha:.32,gloss:.84,tag:'扶梯'});
        // rotX takes the capsule's long axis from +y to +z; the rest of the angle is the pitch.
        capsule(lane.x+s*.44,yc+.81,zc,.060,bank.len+.24,.060,col.black,
          {rx:Math.PI/2-bank.ang,gloss:.45,tag:'扶梯'});
        // A restrained moving seam on each handrail makes its direction legible before the player
        // steps on.  Four warm markers per rail are enough to show travel; they are details on a
        // physical belt, not another sign blinking in the concourse.
        for(let i=0;i<4;i++) {
          const p=ball(lane.x+s*.44,bank.yBot+.96,bank.zBot,.045,.045,.045,col.goldL,
            {mode:1,glow:.08,tag:'扶梯'});
          boundMotion(p,lane.x,yc+.80,zc,bank.len*.62+1.0);
          handrailMarks.push({p,lane,bank,side:s,phase:i/4});
        }
      }
      for(const [zz,yy,dz] of [[bank.zBot-.32,bank.yBot,.30],[bank.zTop+.32,bank.yTop,-.30]]) {
        box(lane.x,yy+.06,zz,.80,.12,.64,col.steel,{hard:true,gloss:.60,tag:'扶梯'});
        litten(box(lane.x,yy+.13,zz+dz,.74,.02,.05,col.goldL,{hard:true,mode:1,glow:.14,tag:'扶梯'}),.25);
        // The landing reads before the moving tread begins: a tactile approach strip and the two
        // rounded housings into which the handrails disappear.  These sit outside the ride bounds.
        flat(lane.x,yy+.024,zz-dz,.76,.30,C('#c2a04f'),
          {mode:0,gloss:.24,tag:'扶梯触觉带',...MAT.stone});
        for(const s of [-1,1]) box(lane.x+s*.44,yy+.30,zz+dz*.38,.20,.46,.34,col.steelD,
          {round:.07,mode:7,gloss:.48,tag:'扶梯入口'});
        glyphs(lane.x,yy+.54,zz-dz*.23,dz>0?Math.PI:0,lane.dir>0?'↑':'↓',
          {size:.18,color:col.goldL,mode:1,glow:.075,tag:'扶梯入口'});
      }
      for(let i=0;i<20;i++) {
        const p=box(lane.x,bank.yBot+.18,bank.zBot,.70,.12,.38,col.charcoal,
          {hard:true,gloss:.28,tag:'扶梯'});
        const edge=litten(box(lane.x,bank.yBot+.25,bank.zBot,.65,.025,.038,col.goldL,
          {hard:true,mode:1,glow:.10,tag:'扶梯'}),.16);
        boundMotion(p,lane.x,yc,zc,bank.len*.62+1.0);
        boundMotion(edge,lane.x,yc,zc,bank.len*.62+1.0);
        steps.push({p,edge,lane,bank,phase:i/20});
      }
    }
    box((bank.xUp+bank.xDn)/2,yc-.64,zc,2.60,.30,bank.len,col.soffit,
      {rx:-bank.ang,hard:true,gloss:.14,...MAT.plaster});
    // One lamp at each comb plate. The landings are where a body arrives and leaves, and they
    // are the two feet of floor in this building that always have somebody standing on them.
    ownPublicLight(B.light((bank.xUp+bank.xDn)/2,bank.yBot+1.40,bank.zBot-.70,
      [1.00,0.93,0.80],.45,2.5),'route');
    ownPublicLight(B.light((bank.xUp+bank.xDn)/2,bank.yTop+1.40,bank.zTop+.70,
      [1.00,0.93,0.80],.45,2.5),'route');
    trafficScuffs((bank.xUp+bank.xDn)/2,bank.yBot,bank.zBot-.88,0);
    // Underside lighting, the detail that tells you an escalator is a lit object at night.
    // These three sit on the soffit, which is a sloping plane, so spacing them has to run *along*
    // the slope: 1.6 m of pure z at a fixed y walks off it by 1.6·tan(ang) — 1.27 m on this bank —
    // and the upper strip came out a metre above the soffit, straight through the step run. Seen
    // from the foot of the flight it was a pale yellow band cutting the treads in half, with a
    // second one hanging in the air below the bottom landing. Step the offset along the incline.
    for(let i=-1;i<=1;i++) litten(box((bank.xUp+bank.xDn)/2,
      yc-.80+i*1.6*Math.sin(bank.ang),zc+i*1.6*Math.cos(bank.ang),2.3,.04,.5,
      col.goldL,{rx:-bank.ang,hard:true,mode:1,glow:.10}),.5);
  }
  function stepAt(bank,u) {
    if(u<.80) {
      const r=u/.80;
      const show=clamp(Math.min(u/.025,(.80-u)/.025),0,1);
      return {y:bank.yBot+.18+r*(bank.rise-.10),z:bank.zBot+r*bank.run,show};
    }
    const r=(u-.80)/.20;
    return {y:bank.yBot-.10,z:bank.zTop-r*bank.run,show:0};
  }
  // A real escalator accelerates gently at the comb plate, runs at one speed, then eases out.
  function rideProgress(u) {
    u=clamp(u,0,1); const a=.11;
    if(u<a) { const r=u/a; return a*(2*r*r-r*r*r); }
    if(u>1-a) { const r=(1-u)/a; return 1-a*(2*r*r-r*r*r); }
    return u;
  }
  function escalatorPose(dir,u,bankId='a') {
    const bank=BANKS[bankId]||BANKS.a, s=rideProgress(u);
    const APR=.46, LAND=1.30, up=dir==='up';
    const d0=up?APR:LAND, d2=up?LAND:APR, d1=bank.len, total=d0+d1+d2, d=s*total;
    const x=up?bank.xUp:bank.xDn, yaw=up?0:Math.PI;
    if(up) {
      if(d<d0) return {x,z:lerp(bank.zBot-APR,bank.zBot,d/d0),lift:bank.yBot,yaw};
      if(d<d0+d1) { const r=(d-d0)/d1;
        return {x,z:lerp(bank.zBot,bank.zTop,r),lift:lerp(bank.yBot,bank.yTop,r),yaw}; }
      const r=clamp((d-d0-d1)/d2,0,1);
      return {x,z:lerp(bank.zTop,bank.zTop+LAND,r),lift:bank.yTop,yaw};
    }
    if(d<d0) return {x,z:lerp(bank.zTop+LAND,bank.zTop,d/d0),lift:bank.yTop,yaw};
    if(d<d0+d1) { const r=(d-d0)/d1;
      return {x,z:lerp(bank.zTop,bank.zBot,r),lift:lerp(bank.yTop,bank.yBot,r),yaw}; }
    const r=clamp((d-d0-d1)/d2,0,1);
    return {x,z:lerp(bank.zBot,bank.zBot-APR,r),lift:bank.yBot,yaw};
  }
  function rideFloor(bankId,dir,finished) {
    const b=BANKS[bankId]||BANKS.a;
    return dir==='up' ? (finished?b.hi:b.lo) : (finished?b.lo:b.hi);
  }

  // ---------------------------------------------------------------- the shell and the atrium
  function build() {
    // A little self-lit in the floor, the walls and the deck soffits. Not a fix for anything —
    // the hall reads correctly without it — but a mall's surfaces are washed by so much fitted
    // lighting that a completely unlit floor under a deck looks like a power cut.
    // Indoor polished stone must not use mode 9: that shader is an outdoor pavement treatment
    // with a fixed 62 cm, high-contrast joint grid.  The shell already authors calm three-metre
    // joints below, so mode 9 put two unrelated grids on the same floor and produced the reported
    // flicker / checkerboard at walking angles.  Mode 0 keeps ordinary lighting and the subtle
    // triplanar stone grain, while the real large-format joint geometry remains the only pattern.
    flat(0,0,0,RX*2,RZ*2,col.floor,{mode:0,gloss:.44,...MAT.stone});
    // A darker band of stone along all four shopfront lines, with a thin accent laid inside it.
    // A concourse floor is not one field of paving — it is an aisle with an edge, and the edge is
    // what tells you where the walking is and where the shops start. Laid at 6 and 8 mm so they
    // step clear of each other and of the grout, whose tops stay at 11–12 mm. Nothing needs
    // trimming where these run under a tenant: the outer shop floor is at 15 mm and therefore
    // clears every joint instead of sharing or crossing its depth.
    for(const s of [-1,1]) {
      flat(s*(RX-D-.90),.006,0,1.40,RZ*2,col.inlay,{mode:0,gloss:.40,...MAT.stone});
      flat(0,.006,s*(RZ-D-.90),RX*2,1.40,col.inlay,{mode:0,gloss:.40,...MAT.stone});
      flat(s*(RX-D-1.62),.008,0,.16,RZ*2,col.grout,{mode:0,gloss:.46,...MAT.stone});
      flat(0,.008,s*(RZ-D-1.62),RX*2,.16,col.grout,{mode:0,gloss:.46,...MAT.stone});
    }
    for(let x=-RX+1.5;x<RX;x+=3) box(x,.004,0,.020,.014,RZ*2,col.grout,{hard:true,gloss:.15});
    for(let z=-RZ+1.5;z<RZ;z+=3) box(0,.005,z,RX*2,.014,.020,col.grout,{hard:true,gloss:.15});
    // A stone inlay ring under the void: the floor pattern that tells you where the middle is.
    //
    // These are discs, not rings — the renderer has no annulus — so they only read as concentric
    // bands if each smaller one is drawn on top of the last. They used to go smallest first and
    // all at the same height, which means the 7.85 m disc covered the other three and the four of
    // them z-fought over the same plane: what appeared on the floor was a single fifteen-metre
    // tan blot around the fountain, and it was the largest thing on the ground floor.
    for(let i=0;i<4;i++) {
      const r=7.85-i*.55;
      // Two stones a shade apart, both close to the floor they sit in. The old pair (#b9b2a4 on
      // #c8c5bd, against a #dedbd2 floor) was dark enough that the medallion read as a wet brown
      // ring round the fountain rather than as a change of paving.
      // These are 15.7 m across and used to be 6 mm thick — a scale ratio of 1300:1 on a cylinder,
      // which skews the mesh normals badly enough that the top face shades as though it points
      // sideways. What that produced was a dark brown ring with a teal sheen over it, fifteen
      // metres wide, lying in the middle of the ground floor and reading as a stain around the
      // fountain. It survived being blamed on a contact shadow, a water glow and the stone colour
      // in turn, because it was none of them.
      //
      // Measured: at 6 mm the pixel was rgb(112,98,82) and the floor under it rgb(221,221,217); at
      // 90 mm the same pixel came back rgb(221,221,218). 50 mm is thick enough to shade correctly
      // and still read as an inlay, and the 4 mm steps between rings stop them z-fighting.
      //
      // Worth remembering for any other flat disc in this codebase: `flat()` is the helper for
      // ground planes, and a very thin `cyl` is not a substitute for it.
      //
      // The last shade of it was not thickness at all. The floor these lie in carries glow .05 and
      // they carried none, so a stone half a step darker than the paving landed a good deal more
      // than half a step darker on screen. Same self-lit as the plate they are set into.
      cyl(0,.010+i*.004,-6.5,r,.05,i%2?C('#cfc4b2'):C('#d8cebe'),{mode:7,gloss:.14});
    }
    B.props.push({mesh:'quad',color:col.hallCeil,mode:1,alpha:1,
      m:M.mul(M.trans(0,H,0),M.mul(M.rotZ(Math.PI),M.scale(RX*2,1,RZ*2)))});
    // Coffers, so the ceiling of a 46-metre room is not one flat plane.
    for(let x=-RX+4;x<RX-2;x+=6) for(let z=-RZ+4;z<RZ-2;z+=6)
      box(x,H-.22,z,5.2,.20,5.2,col.white,{hard:true,gloss:.16,...MAT.plaster});
    // mode:4 is already the plaster shading; the material is the trowel in it. At 2.4 m a repeat
    // is bigger than anything you stand next to, so it never turns into a pattern on a wall this
    // size — which is the failure a small matScale gives you on a surface forty metres long.
    wall(0,H/2, RZ,RX*2,H,Math.PI,col.wall,{mode:4,...MAT.plaster});
    // The north face is glass from the floor to 6.1 m.  A full plaster wall used to stand behind
    // it, so an opening entrance revealed the wall it was drawn on.  Keep only the opaque band
    // over the glazing; the lightweight streetscape below supplies real depth through the panes
    // and through the automatic doors.
    wall(0,(H+6.1)/2,-RZ,RX*2,H-6.1,0,col.wall,{mode:4,...MAT.plaster});
    wall(-RX,H/2,0,RZ*2,H, Math.PI/2,col.wall,{mode:4,...MAT.plaster});
    wall( RX,H/2,0,RZ*2,H,-Math.PI/2,col.wall,{mode:4,...MAT.plaster});
    solid(-RX,RX,RZ-.30,RZ+.3); solid(-RX,-RX+.30,-RZ,RZ); solid(RX-.30,RX,-RZ,RZ);

    // Skylight over the void, its trusses, and the pool of daylight it drops the full height.
    for(let i=-4;i<=4;i++) {
      litten(box(i*1.62,H-.18,0,1.42,.10,VZ*2-1.4,C('#e8eff2'),{hard:true,mode:1,glow:.22}),.16);
      capsule(i*1.62+.81,H-.10,0,.05,VZ*2-1.2,.05,col.steelD,{rx:Math.PI/2,gloss:.5});
    }
    for(let i=-2;i<=2;i++)
      capsule(0,H-.34,i*3.6,.07,VX*2,.07,col.steelD,{rz:Math.PI/2,gloss:.45});
    glow(M.trs(0,.03,0,0,VX*2.3,1,VZ*2.1),C('#fff0d3'),.055,true);
    // A narrow fixed-world smear sits below the real skylight axis. It suggests one bright mullion
    // reflected in polished stone without mirroring geometry or following the camera.
    reflectionProxy(flat(0,.036,.35,6.20,.28,C('#e5efeb'),
      {ry:.08,mode:1,alpha:.001,glow:.001,tag:'反射提示'}),.15,.09,.025);
    // Hanging lamp spheres down the void, the one thing that gives the middle any scale at night.
    for(const [x,z] of [[-4.2,-6.4],[4.2,-6.4],[-4.2,6.4],[4.2,6.4],[0,0]]) {
      capsule(x,H-2.2,z,.02,4.0,.02,col.steelD,{gloss:.4});
      // The glow pass is additive and this is the only emitter in the building shaped like a
      // sphere, so it concentrates where a strip spreads: at .34 the halo was a 0.9 m ball
      // wearing a two-metre white flare, and in three of the upper-deck views — the void, the
      // cinema front, the arcade — it was the brightest thing in the frame with the subject
      // behind it. .16 is where every other fitting in here sits, and litten still takes it to
      // .43 after dark, which is when these are meant to be doing the work.
      litten(ball(x,H-4.3,z,.46,.46,.46,C('#fff0cf'),{mode:1,glow:.16,alpha:.94}),.9);
    }

    // ---- outside the north face.  The mall is its own scene, so the street it opens onto must
    // exist here too: pavement, road, crossing, tree line and a restrained office frontage.  It
    // is not reachable (the exit transfers scenes at the threshold), but it prevents automatic
    // doors from opening onto a wall, black void or clipped shell.
    // The backdrop sits beyond every building. Without it, the strip of sky over the roofs was the
    // renderer's black clear colour — the doorway technically opened onto geometry but still read
    // as a hole cut in the scene. Its colour follows the mall's day/night mix in setNight().
    exteriorSky=box(0,9.0,-RZ-13.2,RX*2+16,18.0,.18,SKY_DAY.slice(),
      {hard:true,mode:1,glow:.055,tag:'室外'});
    exteriorSky._instNight=true;
    flat(0,.008,-RZ-2.0,RX*2,4.0,C('#c8c4ba'),{mode:9,gloss:.24,...MAT.stone});
    flat(0,.003,-RZ-5.8,RX*2,3.6,C('#343a40'),{mode:10,gloss:.16});
    // Kerb and lane line make the exterior read as a street in section, not three unrelated flat
    // strips. They are outside the transfer line and carry no collision.
    box(0,.10,-RZ-3.92,RX*2,.20,.18,C('#b6b0a3'),{hard:true,gloss:.22,...MAT.cast});
    for(const x of [-16,-10,-4,4,10,16])
      box(x,.018,-RZ-6.15,2.4,.018,.09,C('#d9c979'),{hard:true,mode:1,glow:.018});
    for(let i=-3;i<=3;i++) flat(i*.52,.010,-RZ-5.4,.28,2.20,col.cream,{mode:1,glow:.015});
    for(const x of [-9.2,9.2]) {
      cyl(x,.54,-RZ-2.05,.11,1.08,col.bark,{gloss:.12});
      for(let i=0;i<7;i++) {
        const a=i*2.3999;
        const p=ball(x+Math.sin(a)*.28,1.45+(i%3)*.15,-RZ-2.05+Math.cos(a)*.28,
          .34,.30,.34,i%2?col.green:col.greenL,{mode:15,gloss:.08});
        if(i===6) {
          dynamicVisual(p);windParts.push({p,x:p.m[12],y:p.m[13],z:p.m[14],
            sx:.34,sy:.30,sz:.34,phase:x*.17,kind:'tree'});
        }
      }
    }
    for(let i=-3;i<=3;i++) {
      const x=i*6.4, h=5.8+((i*7+20)%4)*1.25, c=i%2?C('#56636d'):C('#65727c');
      box(x,h/2,-RZ-9.2,5.8,h,.90,c,{hard:true,gloss:.16,...MAT.cast});
      for(let r=0;r<4;r++) for(let k=-2;k<=2;k++)
        litten(box(x+k*.86,.78+r*1.14,-RZ-8.735,.46,.48,.025,
          (r+k+i)%3?C('#91a7b4'):C('#dfc47e'),{hard:true,mode:1,glow:.035}),.28);
    }
    // Two slim street lamps bracket the view without standing in the central crossing. They give
    // the pavement a human scale and a second depth plane between the door and the office wall.
    for(const x of [-4.4,4.4]) {
      capsule(x,1.54,-RZ-2.6,.045,1.48,.045,col.steelD,{gloss:.48,tag:'室外'});
      capsule(x,2.92,-RZ-2.6,.035,.42,.035,col.steelD,{rz:Math.PI/2,gloss:.48,tag:'室外'});
      litten(ball(x+(x<0?.34:-.34),2.92,-RZ-2.6,.13,.10,.13,C('#fff0c8'),
        {mode:1,glow:.13,tag:'室外'}),.32);
    }

    // Wet-day life beyond the doors. Four umbrella pedestrians and two parked bicycle silhouettes
    // make the exterior feel inhabited without sending an actor rig or pathfinder outside the mall.
    // They are deliberately broad, low-detail shapes seen through the entrance glazing: 24 retained
    // primitives total, no light, collider, thing, cast row or frame-motion callback. The existing
    // weather transition owns their alpha, so dry frames pay no visible overdraw and an unchanged
    // wet state performs no writes. Keep all six outside the central zebra / automatic-door axis.
    const wetExteriorGroup=(kind,index,parts)=>{
      const id=`${kind}-${index}`;
      for(const p of parts) {
        p.mallWetLife=id;p.mallWetKind=kind;
        boundMotion(p,p.ob.x,p.ob.y,p.ob.z,1.45);
      }
      weatherVisual(parts,'wet',.001,.82,0);
      exteriorWetSilhouettes.push({id,kind,parts});
    };
    [
      [-15.7,-RZ-1.72,col.redD],[-8.15,-RZ-2.72,col.blue],
      [7.55,-RZ-2.50,col.jade],[15.35,-RZ-1.82,col.violet],
    ].forEach(([x,z,umbrella],i)=>{
      const body=C(i%2?'#3d4b54':'#4b4d50'), lean=i%2?.055:-.045;
      wetExteriorGroup('pedestrian',i,[
        capsule(x,.84,z,.22,1.08,.22,body,{rz:lean,mode:7,alpha:.001,gloss:.07,tag:'雨天入口'}),
        ball(x+lean*.8,1.50,z,.145,.145,.145,C('#8d7567'),{mode:7,alpha:.001,gloss:.06,tag:'雨天入口'}),
        capsule(x-.06,1.55,z,.025,.82,.025,col.steelD,
          {rz:lean*.35,mode:7,alpha:.001,gloss:.30,tag:'雨天入口'}),
        taper(x-.06,1.90,z,1.12,.22,1.12,umbrella,
          {mode:7,alpha:.001,gloss:.13,tag:'雨天入口'}),
      ]);
    });
    [[-18.15,-RZ-2.78,.08],[18.05,-RZ-2.58,-.07]].forEach(([x,z,tilt],i)=>{
      const wheel=C('#273038'),frame=i?col.jade:col.redD;
      wetExteriorGroup('cycle',i,[
        cyl(x-.40,.43,z,.25,.055,wheel,{rx:Math.PI/2,mode:7,alpha:.001,gloss:.10,tag:'雨天入口'}),
        cyl(x+.40,.43,z,.25,.055,wheel,{rx:Math.PI/2,mode:7,alpha:.001,gloss:.10,tag:'雨天入口'}),
        capsule(x,.57,z,.035,.72,.035,frame,
          {rz:Math.PI/2+tilt,mode:7,alpha:.001,gloss:.22,tag:'雨天入口'}),
        capsule(x,.70,z,.030,.58,.030,frame,
          {rz:-.72+tilt,mode:7,alpha:.001,gloss:.22,tag:'雨天入口'}),
      ]);
    });

    // A compact transport / drop-off sequence gives the view through the entrance three useful
    // scales before the office frontage: bollards at the near kerb, a sheltered neighbourhood
    // loop stop on the pavement, and painted short-stay markings in the road.  Every part remains
    // north of the transfer threshold and is retained opaque geometry: no collider, light, alpha
    // animation or frame callback is added to the mall's most expensive view.  Keep the complete
    // arrival kit under its explicit 35-prop allowance (currently 34, including six glyph tiles).
    const exteriorPart=(ps)=>{
      for(const p of [ps].flat()) if(p) exteriorArrivalParts.push(p);
      return ps;
    };
    const STOP_X=-11.35, STOP_Z=-RZ-2.30;
    exteriorPart(flat(STOP_X,.017,STOP_Z,4.65,1.54,C('#aaa69c'),
      {mode:9,gloss:.18,...MAT.stone,tag:'室外到达'}));
    for(const x of [STOP_X-1.88,STOP_X+1.88]) exteriorPart(
      capsule(x,1.34,STOP_Z+.56,.055,2.48,.055,col.steelD,
        {gloss:.46,tag:'室外到达'}));
    exteriorPart(box(STOP_X,2.60,STOP_Z,4.42,.16,1.62,C('#5d6c70'),
      {hard:true,round:.035,gloss:.24,...MAT.cast,tag:'室外到达'}));
    exteriorPart(box(STOP_X,2.36,STOP_Z+.775,4.08,.32,.055,col.jade,
      {hard:true,round:.025,gloss:.28,tag:'室外到达'}));
    exteriorPart(glyphs(STOP_X,2.36,STOP_Z+.808,Math.PI,'环线站',
      {size:.17,gap:.055,color:col.white,mode:1,glow:.035,tag:'室外到达'}));
    exteriorPart(box(STOP_X,1.32,STOP_Z-.64,3.92,2.34,.045,col.glass,
      {hard:true,mode:1,alpha:.33,gloss:.74,tag:'室外到达'}));
    exteriorPart(box(STOP_X,.66,STOP_Z-.26,2.72,.16,.50,C('#6f7370'),
      {hard:true,round:.045,gloss:.16,...MAT.cast,tag:'室外到达'}));
    exteriorPart(box(STOP_X,1.02,STOP_Z-.48,2.72,.58,.13,C('#777b76'),
      {hard:true,round:.045,gloss:.14,...MAT.cast,tag:'室外到达'}));
    for(const x of [STOP_X-1.05,STOP_X+1.05]) exteriorPart(
      box(x,.36,STOP_Z-.26,.11,.56,.34,col.steelD,
        {hard:true,gloss:.38,tag:'室外到达'}));
    exteriorPart(box(STOP_X+1.52,1.34,STOP_Z-.60,.68,1.36,.055,C('#e4e0d5'),
      {hard:true,round:.025,gloss:.20,tag:'室外到达'}));
    for(let i=0;i<3;i++) exteriorPart(box(STOP_X+1.52,1.60-i*.27,STOP_Z-.632,
      .46,.035,.014,i===0?col.jade:C('#89908c'),
      {hard:true,mode:1,glow:i===0?.018:0,tag:'室外到达'}));

    // The central crossing remains completely open: these four knee-height bollards only protect
    // the glass-side kerb, well outside the automatic-door / zebra sightline.
    for(const x of [-6.25,-4.80,4.80,6.25]) exteriorPart(
      cyl(x,.40,-RZ-1.18,.095,.80,col.charcoal,
        {mode:7,gloss:.34,tag:'室外到达'}));

    const DROP_X=9.65, DROP_Z=-RZ-5.02;
    exteriorPart(flat(DROP_X,.012,-RZ-3.87,6.10,.15,C('#dfc957'),
      {mode:1,glow:.018,tag:'室外到达'}));
    for(const x of [DROP_X-2.05,DROP_X,DROP_X+2.05]) exteriorPart(
      flat(x,.014,DROP_Z,1.12,.10,C('#dfc957'),{mode:1,glow:.016,tag:'室外到达'}));
    for(const x of [DROP_X-1.80,DROP_X-.60,DROP_X+.60,DROP_X+1.80]) exteriorPart(
      flat(x,.015,DROP_Z+.48,.10,.72,C('#dfc957'),
        {ry:x<DROP_X?-.46:.46,mode:1,glow:.014,tag:'室外到达'}));
    exteriorPart(capsule(DROP_X+2.68,1.00,-RZ-3.38,.045,1.80,.045,col.steelD,
      {gloss:.44,tag:'室外到达'}));
    exteriorPart(box(DROP_X+2.68,1.78,-RZ-3.38,.88,.78,.08,col.blue,
      {hard:true,round:.055,gloss:.22,tag:'室外到达'}));
    exteriorPart(glyphs(DROP_X+2.68,1.78,-RZ-3.425,0,'临停区',
      {size:.13,gap:.035,color:col.white,mode:1,glow:.035,tag:'室外到达'}));

    // ---- north face: double-height glazing and the way out.
    for(let i=-8;i<=8;i++) {
      if(i===0) continue;                       // the physical opening between the sliding leaves
      const x=i*1.42;
      litten(box(x,3.05,-RZ+.10,1.30,5.55,.045,col.glass,{hard:true,mode:1,alpha:.42,gloss:.82,tag:'出口'}),.18);
      box(x-.70,3.05,-RZ+.14,.08,5.75,.12,col.steelD,{hard:true,gloss:.52,tag:'出口'});
    }
    box(0,6.35,-RZ+.15,20.0,.86,.18,col.charcoal,{hard:true,gloss:.28});
    glyphs(0,6.35,-RZ+.255,0,'北京新天地',{size:.58,gap:.20,color:col.goldL,mode:1,glow:.24,tag:'出口'});
    for(const s of [-1,1]) {
      const p=box(s*.73,1.45,-RZ+.27,1.34,2.80,.07,col.glass,
        {hard:true,mode:1,alpha:.48,gloss:.82,tag:'出口'});
      const handle=capsule(s*.16,1.40,-RZ+.36,.028,.54,.028,col.goldL,{gloss:.62,tag:'出口'});
      const decal=litten(box(s*.73,1.15,-RZ+.315,.58,.065,.018,C('#d9eee9'),
        {hard:true,mode:1,alpha:.78,glow:.045,tag:'出口'}),.12);
      const smear=glyphs(s*.73,1.64,-RZ+.315,0,'◎',
        {size:.11,color:C('#e7e2d7'),mode:1,alpha:.15,glow:.003,tag:'玻璃指印'})[0];
      boundMotion(p,0,1.45,-RZ+.27,2.45);
      boundMotion(handle,0,1.45,-RZ+.36,2.45);
      boundMotion(decal,0,1.15,-RZ+.315,2.45);
      boundMotion(smear,0,1.64,-RZ+.315,2.45);
      entranceDoors.push({p,handle,decal,smear,side:s});
    }
    box(0,3.05,-RZ+.30,1.10,.24,.18,col.charcoal,{hard:true,gloss:.30,tag:'出口'});
    litten(box(0,3.04,-RZ+.40,.36,.08,.03,col.jadeL,
      {hard:true,mode:1,glow:.12,tag:'出口'}),.35);                 // motion sensor
    const exit=thing('出口',0,2.65,-RZ+.40,'从这里出去就是商务区。','The Business District is outside.',
      '出口 is the way out; 入口 is the way in.',{focus:[0,-RZ+1.20],reach:2.0});
    exit.exit={place:'street',at:OUT};
    solid(-RX,-1.60,-RZ-.1,-RZ+.34); solid(1.60,RX,-RZ-.1,-RZ+.34);

    // Arrival threshold. A woven runner takes the customer from the leaves to the open atrium;
    // warm timber slats above it repeat the same direction, while the illuminated fascia at the
    // end says where this level begins. Every piece is visual: the original opening, exit focus
    // and two wall solids remain untouched.
    flat(0,.022,-RZ+2.45,3.42,4.62,C('#6f7777'),{mode:7,gloss:.06,...MAT.cloth});
    trafficScuffs(0,.022,-RZ+3.15,0);
    for(const s of [-1,1])
      box(s*1.74,.030,-RZ+2.45,.045,.025,4.62,FBAND,{hard:true,gloss:.48});
    // One weather-responsive runner sheen sits a full 6 mm above the scuffs. Two nearly coplanar
    // translucent fields used to overlap the whole mat and could sort differently at walking
    // angles. This retained layer wakes only when `Weather.now.wet` changes and returns to its
    // effectively invisible dry alpha.
    weatherVisual(flat(0,.034,-RZ+2.45,3.02,4.18,C('#60777e'),
      {mode:7,gloss:.58,alpha:.001,tag:'雨天入口'}),'wet',.001,.21,.025);
    for(let i=0;i<8;i++) {
      const left=i%2?-1:1,x=left*(.18+.04*(i%3)),z=-RZ+.78+i*.43;
      weatherVisual(flat(x,.040,z,.105,.235,C('#263433'),
        {ry:left*.16,mode:7,gloss:.08,alpha:.001,tag:'湿脚印'}),'wet',.001,.28,0);
    }
    weatherVisual(flat(-3.7,.018,-RZ-1.15,2.45,.78,C('#7894a0'),
      {mode:7,gloss:.68,alpha:.001,tag:'雨天入口'}),'wet',.001,.24,.025);
    weatherVisual(flat(2.9,.019,-RZ-1.55,1.90,.62,C('#7894a0'),
      {mode:7,gloss:.68,alpha:.001,tag:'雨天入口'}),'wet',.001,.21,.025);
    // Rain on the outer face of the north glass. Slim static streaks have the visual read of rain
    // from inside, yet cost no simulation and no per-frame matrix work.
    for(let i=0;i<8;i++) {
      const x=-10.5+i*3.0, y=.80+((i*7)%8)*.56, h=.34+((i*5)%5)*.09;
      weatherVisual(box(x,y,-RZ+.065,.018,h,.014,C('#dceef3'),
        {hard:true,mode:1,alpha:.001,glow:.015,tag:'雨天入口'}),'rain',.001,.34,.035);
    }
    // Condensation belongs at cold mullions, not across the view. Eight hand-width vertical veils
    // stay on the fixed side glazing, leaving the automatic-door opening and pane centres clear.
    for(const x of [-10.8,-8.0,-5.2,-2.4,2.4,5.2,8.0,10.8])
      weatherVisual(box(x,2.10,-RZ+.058,.075,2.25,.012,C('#dfe8e8'),
        {hard:true,mode:1,alpha:.001,glow:.008,tag:'冷凝玻璃'}),'mist',.001,.17,.010);

    // Umbrella sleeves are the practical detail that turns a wet entrance into a mall entrance.
    // It sits outside the runner and bench sightline, with a small rack of loan umbrellas beside
    // the bag dispenser. Nothing names a real operator or brand.
    const UX=-4.75, UZ=-RZ+2.00;
    cyl(UX,.07,UZ,.48,.14,col.charcoal,{mode:7,gloss:.26,tag:'雨伞套'});
    capsule(UX,.93,UZ,.045,1.58,.045,col.steelD,{gloss:.52,tag:'雨伞套'});
    box(UX,1.52,UZ,.82,.64,.22,col.jade,{hard:true,round:.05,gloss:.24,tag:'雨伞套'});
    box(UX,1.33,UZ-.125,.46,.15,.025,C('#d8edf0'),{hard:true,mode:1,glow:.045,tag:'雨伞套'});
    glyphs(UX,1.65,UZ-.125,Math.PI,'雨伞套',
      {size:.105,gap:.030,color:col.white,mode:1,glow:.04,tag:'雨伞套'});
    // Nested bag sleeves and three collapsed umbrellas make the use obvious at gameplay distance.
    for(let i=0;i<5;i++) box(UX-.25+i*.125,1.18,UZ-.14,.085,.30,.018,C('#cfe4e8'),
      {hard:true,mode:1,alpha:.62,gloss:.40,tag:'雨伞套'});
    for(let i=0;i<3;i++) {
      const x=UX+.62+i*.16, z=UZ+.04+(i%2)*.10;
      capsule(x,.60,z,.025,1.05,.025,col.steelD,{rz:(i-1)*.08,gloss:.55,tag:'雨伞'});
      taper(x,.25,z,.13,.42,.075,[col.redD,col.blue,col.jade][i],{gloss:.16,tag:'雨伞'});
      const tip=ball(x,.12,z,.055,.055,.055,col.goldL,{gloss:.44,tag:'雨伞'});
      dynamicVisual(tip);windParts.push({p:tip,x,y:.12,z,sx:.055,sy:.055,sz:.055,
        phase:i*1.7,kind:'umbrella'});
    }
    solid(UX-.58,UX+1.18,UZ-.55,UZ+.55);
    // The compound on the machine is still its pick tag, while the learnable headword is the
    // existing 雨伞 entry.  Registering 雨伞套 as the headword left this rainy-day fixture outside
    // the dictionary and could break the near-object prompt at the main entrance.
    thing('雨伞',UX,1.62,UZ-.15,'下雨天先给雨伞套上袋子。','Bag your umbrella on rainy days.',
      '雨伞 umbrella + 套 sleeve.',{tag:'雨伞套',focus:[UX,UZ+1.15],reach:1.7});

    // A compact A-frame warning appears with the wet floor. It is translucent when inactive just
    // like the event kit below, so the dry-day entrance stays uncluttered.
    const WX=4.65, WZ=-RZ+2.05;
    weatherVisual([
      box(WX,.46,WZ-.12,.48,.78,.045,col.yellow,
        {hard:true,rx:.16,alpha:.001,gloss:.20,tag:'小心地滑'}),
      box(WX,.46,WZ+.12,.48,.78,.045,col.yellow,
        {hard:true,rx:-.16,alpha:.001,gloss:.20,tag:'小心地滑'}),
      glyphs(WX,.53,WZ-.15,Math.PI,'小心',
        {size:.080,gap:.022,color:col.charcoal,mode:1,tag:'小心地滑'}),
    ],'wet',.001,.92,0);
    for(let i=-7;i<=7;i++)
      box(i*.48,3.59,-RZ+2.65,.105,.11,4.70,i%2?col.woodD:C('#a37c4e'),
        {hard:true,gloss:.18,...MAT.timber});
    for(const s of [-1,1])
      litten(box(s*3.58,3.54,-RZ+2.65,.07,.055,4.52,C('#fff1d0'),
        {hard:true,mode:1,glow:.085}),.26);

    // The fascia occupies the blank band at the end of the entrance canopy. It is deliberately
    // narrow and matte so the fountain remains the arrival view's focal point. The reverse face
    // guides people back to the automatic doors.
    box(0,3.42,-VZ-.19,6.90,.46,.105,col.charcoal,{hard:true,gloss:.24});
    litten(box(0,3.13,-VZ-.245,6.45,.040,.025,FBAND,{hard:true,mode:1,glow:.060}),.17);
    glyphs(0,3.40,-VZ-.255,Math.PI,'一层 · 欢迎',
      {size:.18,gap:.060,color:col.white,mode:1,glow:.08,tag:'楼层导览'});
    glyphs(0,3.23,-VZ-.255,Math.PI,'ARRIVAL · SERVICES',
      {size:.072,gap:.025,color:col.goldL,mode:1,glow:.04,tag:'楼层导览'});
    glyphs(0,3.45,-VZ-.125,0,'出口  EXIT',
      {size:.17,gap:.055,color:col.white,mode:1,glow:.065,tag:'出口'});

    // ---- the upper decks.
    for(const f of [2,3]) {
      const y=DECK[f], bz=f===2?3.95:2.20, A=BANKS.a, Bk=BANKS.b;
      for(const s of [-1,1]) {
        slab(s*(RX+VX)/2,0,RX-VX,RZ*2,y);
        slab(0,s*(RZ+VZ)/2,VX*2,RZ-VZ,y);
        // The long void edge, with the bridge junction cut out of it. This used to be one
        // unbroken nineteen-metre pane, and the bridge joins the wing at exactly this line — so
        // there was a glass wall standing across the middle of the only route between them. It
        // did not block anybody (a balustrade has no collider) which is precisely why it went
        // unnoticed: you walked through a sheet of glass every time you crossed the atrium.
        railRun('z',s*VX,-VZ,VZ,y,[[-bz,bz]],-s);
      }
      // The void perimeter faces in toward the middle; the bridge faces out from it. Hence the
      // signs: `out` is which way the fascia below the rail is meant to be read from.
      railRun('x',-VZ,-VX,VX,y,[], 1);
      railRun('x', VZ,-VX,VX,y, f===3?[[2.30,VX]]:[],-1);
      slab(0,0,VX*2,bz*2,y);
      railRun('x',-bz,-VX,VX,y, f===2?[[A.xUp-.72,A.xDn+.72]]:[],-1);
      railRun('x', bz,-VX,VX,y, f===2?[[Bk.xUp-.72,Bk.xDn+.72]]:[], 1);
      if(f===3) for(let i=-2;i<=2;i++)
        litten(box(i*2.6,y+.02,0,2.3,.02,3.6,col.glass,{hard:true,mode:1,alpha:.28,gloss:.92,tag:'天桥'}),.1);
      for(const s of [-1,1]) for(const z of COLZ) {
        if(colSkip(s*(VX+1.0),z,f)) continue;
        column(s*(VX+1.0),z,y,f);
      }
    }
    // The ground floor's own columns, on the same grid as the two decks above so the building
    // stands on something. `column` puts the collider in.
    for(const s of [-1,1]) for(const z of COLZ) {
      if(colSkip(s*(VX+1.0),z,1)) continue;
      column(s*(VX+1.0),z,0,1);
    }
    // Lighting the covered galleries. The renderer gives an interior one lamp and shapes its
    // daylight through one window, so the perimeter of a hall this size — every metre of it under
    // a deck — has neither. These rafts are the fittings that would really be there, and they run
    // the length of each aisle on all three levels: they are what the covered half of the
    // building is lit by, and what its ceiling is made of.
    // Both runs stop at the *other* side's shopfront line. The old strips did not: the north and
    // south ones sat at ±13.75, which is 55 cm inside the north and south shops, above their own
    // ceilings, lighting the top of a partition nobody can see.
    for(const f of [1,2,3]) {
      const ys=(f===3?H:DECK[f+1])-.34;
      const fy=DECK[f];
      for(const s of [-1,1]) {
        ceilRaft('z',s*14.2,0,(RZ-D)*2-.6,2.40,ys);
        ceilRaft('x',0,s*11.35,VX*2-.9,2.30,ys);
        // Three column-grid joints break each long gallery into maintainable structural bays. The
        // floor line is lifted 6 mm; its matching ceiling line sits below the raft, so neither is
        // coplanar with a large quad and both stay aligned to real columns at z -11.5, 0, 11.5.
        for(const z of [-11.5,0,11.5]) {
          flat(s*14.2,fy+.006,z,3.05,.018,C('#908b82'),
            {mode:1,alpha:.20,gloss:.12,tag:'伸缩缝'});
          box(s*14.2,ys-.258,z,2.22,.014,.022,col.steelD,
            {hard:true,gloss:.24,tag:'伸缩缝'});
        }
      }
      publicSafety(f,ys);
      firePoint(f,-1);firePoint(f,1);
      const down=f===1?'↓ 出口  EXIT':'↓ 扶梯 · EXIT';
      egressBlade(f,-14.2,-6.0,down); egressBlade(f,14.2,-6.0,down);
      egressBlade(f,-14.2, 6.0,down); egressBlade(f,14.2, 6.0,down);
    }
    // Wayfinding. A shopping centre tells you where you are about every twenty metres, and this
    // one told you once, at the directory by the information desk. These are the blades that hang
    // over an aisle: a dark panel on two drop rods under the gallery raft, lettered on both faces
    // because you meet them from either end, with the tenant's own colour as a bar under the type.
    // Ground floor only — the upper decks already carry their fascia signs.
    for(const [x,z,t,c] of [[-14.2,-4.0,'服装 珠宝',col.gold],[14.2,-4.0,'数码 眼镜',col.blueL],
                            [-14.2, 6.5,'鞋店 乐园',col.orange],[14.2, 6.5,'鲜花 餐厅',col.jadeL]]) {
      const yb=DECK[2]-.34-.58;                    // hung just under the raft, well over a head
      for(const s of [-1,1]) capsule(x,yb+.34,z+s*.46,.013,.58,.013,col.steelD,{gloss:.5});
      box(x,yb,z,.08,.38,1.42,col.charcoal,{hard:true,gloss:.28});
      for(const s of [-1,1]) {
        litten(box(x+s*.045,yb-.14,z,.02,.045,1.18,c,{hard:true,mode:1,glow:.10}),.3);
        glyphs(x+s*.05,yb+.04,z,s*Math.PI/2,t,
          {size:.21,gap:.07,color:col.white,mode:1,glow:.06});
      }
    }
    // The lip of floor between the upper escalator's comb plate and the gallery it delivers you to.
    //
    // It stops at z 9.48 rather than 9.55. `slab` lays a zero-thickness quad at exactly the deck
    // height, and the gallery slab behind it starts at z 9.50 — so at the old 0.70 depth the two
    // overlapped by five centimetres at identical y. Two coplanar quads have nothing to separate
    // them in the depth buffer, so which one wins is decided by rounding and changes as the camera
    // moves: a 5 m strip of floor at the top of the escalator that flickers when you walk.
    slab(4.95,9.165,5.10,.63,DECK[3]);
    balustrade(2.42,9.20,.70,'z',DECK[3],-1);
    balustrade(7.45,9.20,.70,'z',DECK[3], 1);
    for(const z of [-13.5,13.5])
      litten(box(0,H-.16,z,VX*2+4,.10,2.4,col.white,{hard:true,mode:1,glow:.24}),.4);

    buildEscalator(BANKS.a); buildEscalator(BANKS.b);
    // Ground-floor escalator apron and a sign in the otherwise unused gap between the two lanes.
    // The tread banks, use focus and their collision envelope are unchanged.
    const A1=BANKS.a, A1X=(A1.xUp+A1.xDn)/2;
    flat(A1X,.022,A1.zBot-.54,2.74,1.02,C('#cec7b8'),{mode:0,gloss:.28,...MAT.stone});
    for(const s of [-1,1]) box(A1X+s*1.35,.030,A1.zBot-.54,.040,.022,.92,FBAND,
      {hard:true,gloss:.50});
    box(A1X,.78,A1.zBot-.32,.25,1.32,.34,col.charcoal,{hard:true,gloss:.30,tag:'扶梯'});
    litten(box(A1X,.84,A1.zBot-.505,.19,.70,.025,col.jade,
      {hard:true,mode:1,glow:.08,tag:'扶梯'}),.22);
    glyphs(A1X,1.03,A1.zBot-.525,Math.PI,'2F ↑',
      {size:.115,gap:.035,color:col.white,mode:1,glow:.07,tag:'扶梯'});
    glyphs(A1X,.70,A1.zBot-.525,Math.PI,'一层',
      {size:.095,gap:.030,color:col.goldL,mode:1,glow:.045,tag:'扶梯'});
    solid(BANKS.a.xUp-.78,BANKS.a.xDn+.78,BANKS.a.zBot+.12,BANKS.a.zTop+.7);
    blockUp(2,BANKS.b.xUp-.78,BANKS.b.xDn+.78,BANKS.b.zBot+.12,BANKS.b.zTop+1.0);
    blockUp(3,BANKS.b.xUp-.78,BANKS.b.xDn+.78,BANKS.b.zBot-1.0,BANKS.b.zTop-.12);
    blockUp(2,BANKS.a.xUp-.78,BANKS.a.xDn+.78,BANKS.a.zTop-1.3,BANKS.a.zTop+.06);
    [['a','up',  1,BANKS.a.xUp,BANKS.a.zBot-.80,'站稳扶好，扶梯上二楼。','Hold on — this escalator goes up to level two.'],
     ['a','down',2,BANKS.a.xDn,BANKS.a.zTop+1.60,'这边的扶梯下到一楼。','This escalator goes down to level one.'],
     ['b','up',  2,BANKS.b.xUp,BANKS.b.zBot-.80,'再上一层就是美食广场。','One more level up is the food court.'],
     ['b','down',3,BANKS.b.xDn,BANKS.b.zTop+1.60,'坐这个扶梯回二楼。','Take this escalator back to level two.'],
    ].forEach(([bank,dir,fl,x,z,zh,en])=>{
      const focus=bank==='a'&&dir==='down'?[-4.25,-1.90]
        :bank==='b'&&dir==='up'?[4.40,2.30]:[x,z];
      const th=thing('扶梯',x,DECK[fl]+1.25,z,zh,en,'扶梯 is an escalator; 电梯 is a lift.',
        {focus,reach:1.65});
      th.mallFloor=fl; th.mallDir=dir; th.mallBank=bank;
    });

    // Before a single unit is built, and only here: this is the first instant at which every
    // js/mall-*.js has had its chance to register. Earlier is too early, later is after the shell
    // has already silently stood in for whatever is missing.
    checkTenants();
    buildLift();
    buildToilets();
    buildAtrium();
    buildGround();
    buildSecond();
    buildThird();
  }

  // A glass lift in a glass shaft, and a car that really rides between the three levels.
  function buildLift() {
    const LX=RX-2.4, LZ=14.2;
    for(let f=1;f<=3;f++) {
      const y=DECK[f];
      const LPX=LX-1.66;
      for(const s of [-1,1]) box(LX+s*1.45,y+1.70,LZ,.16,3.25,1.70,col.steel,
        {hard:true,gloss:.62,tag:'电梯',...MAT.metal});
      box(LX,y+1.60,LZ-1.05,3.05,3.15,.12,col.glass,{hard:true,mode:1,alpha:.30,gloss:.9,tag:'电梯'});

      // The public landing is on the west face of the shaft. The former north-facing landing sat
      // behind the florist's south partition on level one, so reaching it meant walking through a
      // shop wall. This face opens directly onto the common gallery on every level.
      flat(LX-2.65,y+.021,LZ,2.15,3.55,C('#cfc8b8'),{mode:0,gloss:.28,tag:'电梯',...MAT.stone});
      // A single high-contrast tactile field marks the door line.  The darker open rectangle is a
      // 1.2 m clear waiting zone—not a collider—so the route harness can assert the same space that
      // the floor treatment communicates to a player.
      flat(LX-3.06,y+.026,LZ,1.14,2.34,C('#c1a350'),
        {mode:0,gloss:.22,tag:'电梯触觉带',...MAT.stone});
      if(f===1) trafficScuffs(LX-3.82,y,LZ,Math.PI/2);
      for(const [dx,dz,w,d] of [[-3.46,0,.045,2.76],[-2.02,0,.045,2.76],
                                [-2.74,-1.38,1.48,.045],[-2.74,1.38,1.48,.045]])
        box(LX+dx,y+.033,LZ+dz,w,.018,d,col.jade,
          {hard:true,mode:1,glow:.025,tag:'无障碍等候区'});
      for(const s of [-1,1]) box(LX-2.65,y+.030,LZ+s*1.72,2.04,.022,.045,FBAND,
        {hard:true,gloss:.50,tag:'电梯'});
      for(const s of [-1,1]) {
        box(LPX,y+1.46,LZ+s*1.22,.16,2.84,.15,col.steelD,
          {hard:true,gloss:.54,tag:'电梯',...MAT.metal});
        box(LPX-.075,y+1.44,LZ+s*.61,.055,2.62,1.12,
          s<0?C('#aeb6b8'):C('#9fa9ac'),
          {hard:true,gloss:.50,tag:'电梯',...MAT.metal});
        for(const k of [-1,1]) box(LPX-.108,y+1.44,LZ+s*.61+k*.34,.022,2.48,.018,
          C('#d1d5d3'),{hard:true,mode:1,alpha:.34,gloss:.65,tag:'电梯'});
      }
      box(LPX-.115,y+1.44,LZ,.030,2.62,.026,col.charcoal,
        {hard:true,gloss:.28,tag:'电梯'});
      if(f===1) {
        // One raked highlight belongs to the brushed landing doors themselves. A world-space wall
        // quad cannot lag or invert with the camera the way a screen-space reflection proxy can.
        reflectionProxy(wall(LPX-.171,y+1.54,LZ-.43,.11,1.74,-Math.PI/2,C('#dce5e2'),
          {mode:1,alpha:.001,glow:.001,tag:'反射提示'}),.13,.075,.022);
      }
      box(LPX-.105,y+.145,LZ,.035,.12,2.22,col.steelD,
        {hard:true,gloss:.42,tag:'电梯',...MAT.metal});
      box(LPX,y+2.91,LZ,.16,.20,2.58,col.steelD,
        {hard:true,gloss:.48,tag:'电梯',...MAT.metal});
      box(LPX-.09,y+3.10,LZ,.08,.44,2.46,col.charcoal,{hard:true,gloss:.28,tag:'电梯'});
      litten(box(LPX-.135,y+2.86,LZ,.025,.045,2.12,col.jade,
        {hard:true,mode:1,glow:.075,tag:'电梯'}),.22);
      glyphs(LPX-.145,y+3.15,LZ,-Math.PI/2,`${f}F · 电梯`,
        {size:.18,gap:.052,color:col.white,mode:1,glow:.075,tag:'电梯'});
      glyphs(LPX-.145,y+2.90,LZ,-Math.PI/2,'LIFT · 选楼层',
        {size:.085,gap:.028,color:col.goldL,mode:1,glow:.04,tag:'电梯'});
      litten(box(LPX-.145,y+2.73,LZ,.025,.16,.44,col.screen,
        {hard:true,mode:1,glow:.14,tag:'电梯'}),.30);
      glyphs(LPX-.158,y+2.735,LZ,-Math.PI/2,String(f),
        {size:.085,gap:.030,color:col.white,mode:1,glow:.08,tag:'电梯'});
      const up=glyphs(LPX-.159,y+2.79,LZ-.12,-Math.PI/2,'↑',
        {size:.070,color:col.jadeL,mode:1,glow:.02,alpha:.10,tag:'电梯'})[0];
      const down=glyphs(LPX-.159,y+2.68,LZ-.12,-Math.PI/2,'↓',
        {size:.070,color:col.goldL,mode:1,glow:.02,alpha:.10,tag:'电梯'})[0];
      dynamicVisual(up,down);liftIndicators.push({floor:f,up,down});

      // The call/selector panel is reachable from the same common landing rectangle.
      box(LPX-.10,y+1.56,LZ+1.48,.08,.78,.24,col.charcoal,
        {hard:true,gloss:.34,tag:'电梯'});
      litten(box(LPX-.145,y+1.78,LZ+1.48,.025,.21,.15,col.screen,
        {hard:true,mode:1,glow:.14,tag:'电梯'}),.32);
      glyphs(LPX-.155,y+1.78,LZ+1.48,-Math.PI/2,String(f),
        {size:.12,color:col.white,mode:1,glow:.08,tag:'电梯'});
      for(let i=0;i<3;i++) cyl(LPX-.15,y+1.47-i*.18,LZ+1.48,.035,.025,
        i===f-1?col.jadeL:col.goldL,{rz:Math.PI/2,mode:1,glow:.06,tag:'电梯'});

      // A floor-specific schematic opposite the call panel.  It is deliberately retained copy:
      // every destination comes from the fixed tenant manifest/vertical layout and the current
      // node is this exact landing, so the map cannot disagree with a moving player marker.
      const mapZ=LZ-1.48,zone=f===1?'零售 · 咖啡 · 餐厅'
        :f===2?'美妆 · 书店 · 运动 · 家居':'电影 · 游戏 · 美食';
      box(LPX-.10,y+1.55,mapZ,.08,1.62,1.02,col.charcoal,
        {hard:true,gloss:.27,tag:'楼层地图'});
      litten(box(LPX-.145,y+1.55,mapZ,.022,1.46,.88,C('#173c4d'),
        {hard:true,mode:1,glow:.07,tag:'楼层地图'}),.18);
      glyphs(LPX-.160,y+2.08,mapZ,-Math.PI/2,`${f}F · 你在这里`,
        {size:.070,gap:.019,color:col.goldL,mode:1,glow:.045,tag:'楼层地图'});
      glyphs(LPX-.160,y+1.77,mapZ,-Math.PI/2,'● 电梯 · ← 洗手间',
        {size:.052,gap:.014,color:col.white,mode:1,glow:.025,tag:'楼层地图'});
      glyphs(LPX-.160,y+1.50,mapZ,-Math.PI/2,f===1?'↓ 出口':'↓ 扶梯 · 出口',
        {size:.057,gap:.016,color:col.jadeL,mode:1,glow:.035,tag:'楼层地图'});
      glyphs(LPX-.160,y+1.18,mapZ,-Math.PI/2,zone,
        {size:.043,gap:.012,color:col.white,mode:1,glow:.020,tag:'楼层地图'});
      for(let i=-1;i<=1;i++) box(LPX-.158,y+1.35+i*.20,mapZ-.30+i*.30,.012,.025,.22,
        [col.jade,col.goldL,col.redD][i+1],{hard:true,mode:1,glow:.020,tag:'楼层地图'});

      const th=thing('电梯',LPX,y+1.70,LZ,'请选择楼层。','Choose a floor.',
        '电 electricity + 梯 ladder.',{focus:[LX-2.9,LZ],reach:2.1});
      th.mallFloor=f;
      stop(f,LX-1.7,LX+1.7,LZ-1.3,LZ+1.5);
      ownPublicLight(B.light(LX-1.9,y+2.85,LZ,[0.72,1.00,.90],.36,2.2),'route');
    }
    // Shaft and car.
    for(const s of [-1,1]) box(LX+s*1.42,H/2,LZ+.6,.14,H,1.5,col.steel,
      {hard:true,gloss:.55,...MAT.metal});
    const car=box(LX,1.15,LZ,2.55,2.30,2.10,col.glass,{hard:true,mode:1,alpha:.26,gloss:.92});
    const floorPan=box(LX,.04,LZ,2.55,.14,2.10,col.charcoal,{hard:true,gloss:.4});
    const roof=litten(box(LX,2.30,LZ,2.55,.16,2.10,col.cream,{hard:true,mode:1,glow:.22}),.6);
    const liftMid=DECK[3]/2+1.15;
    boundMotion(car,LX,liftMid,LZ,5.35);
    boundMotion(floorPan,LX,liftMid,LZ,5.35);
    boundMotion(roof,LX,liftMid,LZ,5.35);
    lifts.push({car,floorPan,roof,x:LX,z:LZ});
  }

  function buildToilets() {
    // This block used to stand at x RX-1.6, z 8.4 — 2.60 x 4.20 x 3.35 m of tiled wall, on all
    // three decks, *inside two shops*. On deck one that is shop('E',8.6,8.0), the florist, whose
    // back wall, stepped bank, both side stands and own name were all built through it; on deck two
    // it is shop('E',6.4,10.0), the home store. Worse than the geometry was `stop`, which sealed
    // x 20.05–23 by z 6.2–10.6 solid, so the heart of both units could not be walked into at all.
    // A camera standing in the florist's doorway saw one flat field of wall tile and nothing else.
    //
    // The east wall cannot hold it: 电子产品 (10.5 m), 眼镜店 (7.6), 花店 (8.0) and the lift shaft
    // at z 13.2–15.3 leave no 4.2 m run anywhere along it. The south end of the *west* wall is the
    // one stretch free on all three decks — 鞋店 ends at z 13.4, 书店 at 11.4 and level three has no
    // west tenant — so the block is there now, mirrored: doors, sign, label and collider all face
    // +x, into the room, and the collider runs back to the west wall instead of the east one.
    const TX=-RX+1.6, TZ=15.7;
    for(let f=1;f<=3;f++) {
      const y=DECK[f];
      // Wall tile on the toilet block, which is the one thing in a mall that is always tiled.
      box(TX,y+1.70,TZ,2.60,3.35,4.20,col.cream,{hard:true,gloss:.18,tag:'洗手间',...MAT.tile});
      box(TX+1.32,y+1.15,TZ-1.0,.10,2.30,1.40,col.woodD,{hard:true,gloss:.24,tag:'洗手间',...MAT.timber});
      box(TX+1.32,y+1.15,TZ+1.0,.10,2.30,1.40,col.woodD,{hard:true,gloss:.24,tag:'洗手间',...MAT.timber});
      litten(box(TX+1.40,y+2.72,TZ,.06,.50,1.30,col.jade,{hard:true,mode:1,glow:.18,tag:'洗手间'}),.5);
      glyphs(TX+1.47,y+2.72,TZ,Math.PI/2,'洗手间',{size:.24,gap:.07,color:col.white,mode:1,tag:'洗手间'});
      const th=thing('洗手间',TX+1.5,y+1.40,TZ,'洗手间在西侧走廊南端。','The toilets are at the south end of the west gallery.',
        '洗手 wash hands + 间 room.',{focus:f===1?[-17.05,15.75]:[TX+2.9,TZ],reach:2.1});
      th.mallFloor=f;
      stop(f,-RX,TX+1.35,TZ-2.2,TZ+2.2);
    }
  }

  // The middle: fountain, kiosk, seating, information, and the banners hanging over it all.
  function buildAtrium() {
    const FX=0, FZ=-6.5;
    // Dynamic banner glyphs still need atlas cells reserved at build time.
    if(typeof Glyphs!=='undefined'&&Glyphs.need)
      Glyphs.need(Object.values(SEASON_STYLE).flatMap(s=>[...s.text,s.ch]).join(''));
    // A tiered fountain, which is what was wanted here all along. What stood in this spot was an
    // abstract kinetic piece — a one-metre gold sphere with five discs revolving in the air above
    // it — and at mall scale it read as a giant lemon on a post with rings floating off it. The
    // shape everybody recognises is a stack of shallow bowls, each spilling into the one below.
    //
    // Basin first, and in stone rather than the near-black inlay and charcoal it had: those two
    // rings are what made the pool read as a ring of mud around the water.
    // Stone, and it is cream limestone rather than the grey-brown it was. The old kerb (#bdb6a8)
    // and basin wall (#8d9aa2) were three steps darker and a step cooler than the floor they stand
    // in, so under this renderer's single lamp the whole pool read as a brown ring with grey
    // water in it — a municipal planter, not the lit centrepiece of a bright hall.
    // Cast stone, not paving: a fountain is carved and poured, so the grain it wants is the
    // fine one in `concrete` at a scale wider than the kerb is deep — enough to stop six metres
    // of cylinder being one flat cream, not enough to turn a rim into a pattern.
    // ---- how this stack is ordered, which is the whole of why it used to read as a puddle of mud.
    //
    // There is no annulus in this renderer, so every ring here is a solid disc and each one hides
    // whatever is under it out to its own radius. That gives one rule: going inward, each piece
    // must sit *higher* than the one that surrounds it. The old profile broke it — the kerb lip
    // was a 3.16 m disc with its top at .39 and the pool lining a 2.80 m disc topping out at .37 —
    // so the lip covered the lining completely and what you were looking at across the whole
    // basin was six metres of cast stone with a faint film over it. The blue pool the comment
    // below describes has been in the file, invisible, the entire time. Confirmed by painting the
    // three rings magenta / green / blue and taking the shot: the "water" came back green.
    //
    // The second thing is `glow`. Every large surface in this hall carries a little self-lit —
    // the floor .05, the walls .04, the deck soffits .04 — because a mall is washed with fitted
    // light this renderer has no way to bounce. The fountain carried none, so its horizontal
    // faces sat two stops under the paving they stand in and came out brown: the kerb lip
    // measured rgb(102,87,68) against a #d0c7b2 albedo. It is stone in the same room as that
    // floor and it is lit the same way.
    const FSTONE=C('#e2dac7'), FRIM=C('#d0c7b2');
    const ST={gloss:.36,glow:.05,tag:'喷泉',...MAT.cast};
    cyl(FX,.17,FZ,3.14,.34,FSTONE,{...ST,gloss:.32});             // kerb wall,  top .34
    cyl(FX,.33,FZ,3.20,.18,FRIM,{...ST,gloss:.42});               // coping,     top .42
    cyl(FX,.36,FZ,2.98,.32,C('#dbd3c0'),{...ST,gloss:.38});       // upstand,    top .52
    // The pool lining. This is the surface you actually read the water's colour off — the water
    // itself is a translucent slab standing on it — and it was #31485a, which is the colour of a
    // canal. A lit basin is a pale tank with light in it, so the lining is a bright pool blue and
    // carries a little glow of its own: that, and nothing else, is what "lit from within" means
    // here. It is genuinely an emitter (there are lamps under this water), not a painted panel.
    litten(cyl(FX,.38,FZ,2.88,.16,C('#3d8ba6'),{mode:1,glow:.07,gloss:.5,tag:'喷泉'}),.5);  // top .46
    cyl(FX,.45,FZ,2.86,.10,C('#a8dbe4'),{mode:1,alpha:.46,gloss:.62,tag:'喷泉'});  // water, top .50
    // One broken highlight across the actual water plane, aligned to the skylight rather than the
    // eye. It is deliberately a short smear, not a duplicate circular sheet over the whole basin.
    reflectionProxy(flat(FX-.28,.506,FZ+.22,1.82,.11,C('#e2f7f6'),
      {ry:.31,mode:1,alpha:.001,glow:.001,tag:'反射提示'}),.20,.12,.035);
    // Submerged uplights round the inside of the kerb: eight lenses proud of the lining, which is
    // the fitting every lit basin has and the reason the water glows rather than reflects.
    for(let k=0;k<8;k++) {
      const a=k*Math.PI/4+.39;
      litten(cyl(FX+Math.sin(a)*2.44,.485,FZ+Math.cos(a)*2.44,.15,.06,C('#cdf2ff'),
        {mode:1,glow:.20,tag:'喷泉'}),.55);
    }
    // Pedestal, then two bowls. Each bowl is a shallow dish with a proud rim and a film of water
    // standing in it — the rim is what catches the light and says "bowl" from thirty metres. Same
    // rule as the basin: the rim ring is wider than the dish, so it has to sit lower than it, or
    // it covers the bowl it is meant to edge — which is exactly what it was doing, and why every
    // bowl in every shot had a tan ring round a grey middle.
    taper(FX,.78,FZ,.52,.62,.52,FSTONE,ST);
    for(const [y,r] of [[1.10,1.34],[1.74,.82]]) {
      cyl(FX,y-.01,FZ,r+.06,.14,FRIM,{...ST,gloss:.46});         // rim ring,  top y+.06
      cyl(FX,y,FZ,r,.16,FSTONE,ST);                              // dish,      top y+.08
      // A lit band tucked under the rim's overhang. A tiered fountain lit from within is lit
      // tier by tier, and this is the piece that makes each bowl read as a lamp at night and as
      // a bright edge by day. Sat under the rim so the light source itself is never in frame.
      litten(cyl(FX,y-.13,FZ,r+.03,.08,C('#bfeaf6'),{mode:1,glow:.16,tag:'喷泉'}),.7);
      cyl(FX,y+.12,FZ,r-.10,.10,C('#9adcea'),{mode:1,alpha:.44,gloss:.60,tag:'喷泉'});
      // The sheet of water going over the rim, all the way round. Thin, faint and vertical: this
      // is the thing that makes a fountain look like it is running rather than switched off.
      for(let k=0;k<18;k++) {
        const a=k*Math.PI/9;
        const p=capsule(FX+Math.sin(a)*(r+.07),y-.20,FZ+Math.cos(a)*(r+.07),.020,.30,.020,
          col.water,{mode:1,alpha:.34,gloss:.9,tag:'喷泉'});
        dynamicVisual(p); waterfalls.push({p,phase:k/18+y});
      }
    }
    cyl(FX,1.52,FZ,.24,.52,FSTONE,ST);                            // stem between bowls
    ball(FX,1.98,FZ,.14,.14,.14,FRIM,{...ST,gloss:.44});          // finial
    capsule(FX,2.24,FZ,.030,.46,.030,col.water,{mode:1,alpha:.42,gloss:.9,tag:'喷泉'});
    for(let i=0;i<20;i++) {
      const a=i*Math.PI/10, x=FX+Math.sin(a)*1.9, z=FZ+Math.cos(a)*1.9;
      // A private colour array per jet: this jet's colour is retinted at night to carry the basin
      // light upward, and a colour shared with the rest of the scene (col.water) would be corrupted
      // by that. By day this is identical to col.water.
      const jc=[col.water[0],col.water[1],col.water[2]];
      const p=capsule(x,.78,z,.017,.62,.017,jc,
        {mode:1,alpha:.30,rz:Math.sin(a)*.30,rx:Math.cos(a)*.30,tag:'喷泉'});
      dynamicVisual(p); jets.push({p,x,z,a});
      // A coloured uplight at the foot of every jet. By day both parts are dark and the water
      // stays the colour of water, so the daylight shots are untouched; after dark it is the ring
      // of coloured spots in the basin that every real plaza fountain is lit by, and the jets
      // carry that colour up with them. Each light carries its own hue, so the ring reads as
      // colour moving around the fountain rather than as one wash.
      //
      // Two parts. A flat disc sits just above the water surface so it is visible over the basin
      // rim (a light held below the water reads, under additive blending, as the water colour
      // darkening it to nothing). And a tall thin beam rises from it past the rim to the jet's
      // height, which is the shape that reads as uplighting from across the atrium — the one
      // thing a fountain lit from below is never without. The glow pass is additive, so an off
      // light (a 0) contributes nothing: it can never darken the basin the way an opaque disc
      // held at "invisible" would.
      // Kept small. A glow quad (mode 5) falls off separately in u and v, so it is a rounded
      // rectangle rather than a disc: at half a metre across with the alpha the night show was
      // using, twenty of them read as coloured postage stamps lying on the water. Under 40 cm
      // the plateau never appears and what is left is the soft spot it is meant to be.
      const lamp=glow(M.trs(x,.545,z,0,.38,1,.38),C('#000000'),0);
      const beam=glow(M.trs(x,1.35,z,0,.20,1,.20),C('#000000'),0);
      fount.push({lamp,beam, i});
    }
    // A water-coloured glow lying on the floor. At 6.4 it reached two and a half metres past the
    // kerb on every side, so the tiles around the fountain read as a shallow teal pond with a
    // brown tidemark where it met the stone inlay. Kept inside the basin, where the water is.
    basinGlow=glow(M.trs(FX,.52,FZ,0,3.0,1,3.0),[col.water[0],col.water[1],col.water[2]],.05);
    // And two real lights, because there really are lamps under this water. The emissive lining
    // and the eight submerged lenses are what a lit basin looks like; these are what it does —
    // the kerb, the paving for two metres around it and the underside of the lower bowl all pick
    // up a cool edge that no amount of glow on the water itself would ever have given them.
    // Height matters more than power here. Level with the water at .60 the lamp grazed the kerb
    // top — dot(n, dir) is near zero when the light and the surface are the same height — and the
    // one horizontal ring the whole fountain is read by got nothing. Lifted to just under the
    // lower dish it looks *down* on the kerb, the paving outside it and the bench in front, which
    // is the pool of cool light a lit basin puts on the floor around itself.
    ownPublicLight(B.light(FX,1.52,FZ,[0.62,0.88,1.00],.62,3.0),'decorative');
    ownPublicLight(B.light(FX,1.86,FZ,[0.70,0.92,1.00],.42,2.2),'decorative');
    solid(FX-3.2,FX+3.2,FZ-3.2,FZ+3.2);
    // The basin is a 6.3 m circle and this used to be a 6.9 m square at .34: its corners stuck
    // out past the stone on all four sides and read as a ring of dirt round the pool.
    shade(FX,FZ,5.9,5.9,.09);
    // A restrained brass datum around the fountain ties it to the arrival runner without making
    // another giant disc. Sixteen flush studs describe the plaza ring; four short inlays point to
    // entrance, retail, play and services. They carry no height/collision and leave the broad pale
    // paving — the useful visual calm in the arrival camera — intact.
    for(let i=0;i<16;i++) {
      const a=i*Math.PI/8;
      cyl(FX+Math.sin(a)*4.18,.026,FZ+Math.cos(a)*4.18,.065,.032,FBAND,
        {gloss:.56,tag:'中庭'});
    }
    for(const s of [-1,1]) {
      box(FX+s*4.55,.027,FZ,1.02,.018,.055,FBAND,{hard:true,gloss:.50,tag:'中庭'});
      box(FX,.027,FZ+s*4.55,.055,.018,1.02,FBAND,{hard:true,gloss:.50,tag:'中庭'});
    }
    thing('喷泉',FX,2.05,FZ,'喷泉在商场正中间。','The fountain is right in the middle of the mall.',
      '喷 to spray + 泉 spring.',{focus:[FX,FZ-3.6],reach:2.6});

    // Information desk, the directory beside it and the beacon above.
    const IX=-11.4, IZ=-11.9;
    flat(IX,.021,IZ+.40,4.65,3.05,C('#d6d0c2'),{mode:0,gloss:.28,...MAT.stone});
    box(IX,.52,IZ,3.80,1.04,1.25,col.white,{round:.22,gloss:.28,tag:'服务台'});
    box(IX,.31,IZ-.06,3.46,.55,1.10,col.charcoal,{round:.18,gloss:.25,tag:'服务台'});
    box(IX,.92,IZ+.62,3.46,.30,.08,col.jade,{hard:true,mode:1,glow:.12,tag:'服务台'});
    // The desk faces south into the concourse; yaw 0 is the readable face on a north-wall object.
    // It used to be pi and the word was visible only from behind the counter.
    glyphs(IX,.97,IZ+.68,0,'服务台',{size:.26,gap:.08,color:col.white,mode:1,tag:'服务台'});
    for(let i=-7;i<=7;i++)
      box(IX+i*.205,.43,IZ+.575,.055,.50,.035,i%2?col.woodD:C('#a47d51'),
        {hard:true,gloss:.18,tag:'服务台',...MAT.timber});
    litten(box(IX,.145,IZ+.605,3.20,.035,.035,col.goldL,
      {hard:true,mode:1,glow:.065,tag:'服务台'}),.18);
    const infoScreen=box(IX,1.36,IZ-.24,.76,.50,.06,col.screen,
      {hard:true,mode:1,glow:.18,tag:'服务台'});
    ownPoweredDisplay(infoScreen,'服务台',[6.5,24],
      {id:'information',essential:true,offColor:DISPLAY_DIM,offGlow:.018});
    box(IX,1.05,IZ-.24,.12,.35,.12,col.steelD,{hard:true,gloss:.48,tag:'服务台'});
    box(IX,1.02,IZ+.18,.76,.035,.26,col.steel,{hard:true,gloss:.42,tag:'服务台'});
    // Keep the beacon under the level-two slab. Its old 4.35 m disc and glyph visibly passed
    // through the 4.12 m deck above the information pavilion.
    capsule(IX,2.10,IZ,.03,2.00,.03,col.steelD,{gloss:.48,...MAT.metal});
    litten(cyl(IX,3.17,IZ,.50,.11,col.jade,{rx:Math.PI/2,mode:1,glow:.24}),.55);
    // A shallow suspended canopy turns the counter, screen and beacon into one services pavilion.
    // Its four hairline drops sit behind the public face and add no collider.
    box(IX,2.70,IZ-.04,4.34,.14,1.68,col.hallCeil,{hard:true,gloss:.14,glow:.015,...MAT.plaster});
    box(IX,2.59,IZ+.78,4.10,.12,.08,col.woodD,{hard:true,gloss:.22,...MAT.timber});
    litten(box(IX,2.50,IZ+.80,3.74,.055,.035,C('#fff1d2'),
      {hard:true,mode:1,glow:.105}),.30);
    for(const sx of [-1,1]) capsule(IX+sx*1.78,3.36,IZ-.48,.025,1.32,.025,col.steelD,
      {gloss:.46,tag:'服务台'});
    glyphs(IX,2.64,IZ+.835,0,'服务中心  ·  WELCOME',
      {size:.135,gap:.043,color:col.goldL,mode:1,glow:.07,tag:'服务台'});
    // The desk is a landmark you are meant to find from across the hall, so it is lit twice: a
    // warm one over the counter for the face of whoever is behind it, and the jade beacon's own
    // colour spilling onto the ceiling soffit above.
    ownPublicLight(B.light(IX,1.70,IZ+.40,[1.00,0.94,0.80],.45,2.4),'service');
    ownPublicLight(B.light(IX,3.05,IZ,[0.55,1.00,0.90],.40,2.3),'service');
    shade(IX,IZ,4.10,1.62,.18);
    glyphs(IX,3.17,IZ+.07,Math.PI,'i',{size:.42,color:col.white,mode:1,glow:.14});
    solid(IX-2.0,IX+2.0,IZ-.8,IZ+.8);
    thing('服务台',IX,1.30,IZ+.80,'请问美食广场在几楼？','Excuse me, which floor is the food court on?',
      '服务 service + 台 counter.',{focus:[IX,IZ+1.95],reach:2.1});

    // The passport lives where a visitor would actually collect one: open on the public edge of
    // the information desk, with its own small acrylic sign and a focus offset from 问路. It adds
    // no collider—the counter already owns the physical footprint beneath it.
    const PX=IX+1.12, PZ=IZ+.61;
    box(PX,1.095,PZ,.66,.055,.44,col.redD,{hard:true,mode:7,gloss:.18,tag:'集章册'});
    box(PX,1.135,PZ-.02,.56,.018,.34,col.cream,{hard:true,mode:7,gloss:.12,tag:'集章册'});
    box(PX,1.40,PZ+.04,.72,.46,.035,col.charcoal,{hard:true,gloss:.26,tag:'集章册'});
    litten(box(PX,1.40,PZ+.065,.62,.36,.016,col.red,
      {hard:true,mode:1,glow:.10,tag:'集章册'}),.24);
    glyphs(PX,1.40,PZ+.085,0,'集章册',{size:.125,gap:.035,color:col.white,mode:1,glow:.055,tag:'集章册'});
    const passport=thing('集章册',PX,1.42,PZ,'在这里领取商场集章册。','Pick up the mall stamp passport here.',
      '集 to collect + 章 stamp + 册 booklet.',{focus:[PX,IZ+1.95],reach:1.8});
    passport.mallPassport=true;

    // The directory stands beside the desk, not in a doorway. It used to sit at x -14.9, and the
    // café behind it is shop('N',-14.5,...) — whose walk-in gap is the 3 m centred on -14.5, so a
    // 1.7 m board at -14.9 was parked squarely in the middle of the café's entrance. From the
    // concourse it read as a hoarding across the shopfront. Moved east of the information desk
    // (which spans -13.3 to -9.5) into the blank stretch of wall beyond it.
    const MX=-8.4;
    // A structural column stands at the centre of this footprint. Instead of hiding one wide
    // screen behind it, the directory is now a pair of narrow wings that make the column their
    // spine. All visible parts remain inside the old 1.9 m solid and the thing/focus stay put.
    box(MX,3.51,IZ,1.72,.48,.24,col.charcoal,{hard:true,gloss:.30,tag:'商场地图'});
    const directoryPower=[];
    directoryPower.push(litten(box(MX,3.51,IZ+.13,1.48,.38,.035,col.jade,
      {hard:true,mode:1,glow:.105,tag:'商场地图'}),.28));
    glyphs(MX,3.62,IZ+.16,0,'楼层导览',
      {size:.105,gap:.030,color:col.white,mode:1,glow:.055,tag:'商场地图'});
    // The lower header line is live but never rebuilt: four retained strings share its position,
    // and only the current event is visible.  Likewise, every manifest row owns one status dot.
    // The tick loop changes those records on whole-minute boundaries only.
    [['none','当前 · 无活动'],['fitness','当前 · 健身'],
     ['fashion','当前 · 时装'],['lights','当前 · 灯光']].forEach(([key,label])=>{
      const parts=glyphs(MX,3.40,IZ+.16,0,label,
        {size:.052,gap:.016,color:col.goldL,mode:1,glow:.035,alpha:.001,tag:'商场地图'});
      dynamicVisual(parts); directoryEventParts.push({key,parts});
    });
    const wings=[MX-.55,MX+.55], manifestRows=TENANTS.map(([kind,floor])=>({kind,floor}));
    for(let w=0;w<2;w++) {
      const x=wings[w];
      box(x,2.04,IZ,.72,2.70,.20,col.charcoal,{hard:true,gloss:.30,tag:'商场地图'});
      directoryPower.push(litten(box(x,2.04,IZ+.115,.62,2.52,.035,C('#193a54'),
        {hard:true,mode:1,glow:.085,tag:'商场地图'}),.24));
      manifestRows.slice(w*9,w*9+9).forEach(({kind,floor},i)=>{
        const yy=3.13-i*.275, c=[col.blue,col.jade,col.orange][floor-1];
        glyphs(x-.025,yy,IZ+.16,0,`${floor}F ${kind}`,
          {size:.044,gap:.012,color:col.white,mode:1,glow:.025,tag:'商场地图'});
        const dot=box(x+.270,yy,IZ+.145,.044,.044,.018,CLOSED_RED.slice(),
          {hard:true,mode:1,glow:.025,tag:'商场地图'});
        dynamicVisual(dot); directoryDots.push({kind,floor,hours:SHOP_HOURS[kind]||[9.5,21.5],p:dot,c});
      });
    }
    // A slim illuminated strip on the column face joins the two wings into one designed object.
    litten(box(MX,2.18,IZ+.18,.105,2.74,.035,col.goldL,
      {hard:true,mode:1,glow:.07,tag:'商场地图'}),.18);
    ownPoweredDisplay(directoryPower,'商场地图',[6.5,24],
      {id:'directory-backlights',essential:true,offColor:DISPLAY_DIM,offGlow:.012});
    solid(MX-.95,MX+.95,IZ-.3,IZ+.3);
    thing('商场地图',MX,3.45,IZ+.22,'地图上写着每一层有什么。','The directory says what is on each floor.',
      '导览 is a visitor guide.',{focus:[MX,IZ+1.5],reach:2.1});

    // Cash machine and vending machine, by the doors where they always are.
    const AX=12.4;
    box(AX,1.20,-RZ+1.00,1.45,2.40,.75,col.charcoal,{hard:true,gloss:.30,tag:'取款机'});
    const atmScreen=litten(box(AX,1.62,-RZ+.63,.84,.66,.05,col.screen,
      {hard:true,mode:1,glow:.20,tag:'取款机'}),.45);
    ownPoweredDisplay(atmScreen,'取款机',[6.5,24],
      {id:'atm',essential:true,offColor:DISPLAY_DIM,offGlow:.010});
    box(AX,1.14,-RZ+.61,.66,.30,.06,col.steel,{hard:true,gloss:.5,tag:'取款机'});
    glyphs(AX,2.25,-RZ+.61,0,'取款机',{size:.18,gap:.05,color:col.goldL,mode:1,glow:.12,tag:'取款机'});
    thing('取款机',AX,1.72,-RZ+.62,'先去取款机取点钱。','Get some cash out first.',
      '取款 withdraw money + 机 machine.',{focus:[AX,-RZ+1.95],reach:1.7});
    const VX2=14.6;
    box(VX2,1.08,-RZ+.95,1.30,2.16,.66,col.red,{hard:true,gloss:.28,tag:'自动售货机'});
    const vendingScreen=litten(box(VX2,1.30,-RZ+.60,1.00,1.36,.05,col.screen,
      {hard:true,mode:1,glow:.14,tag:'自动售货机'}),.4);
    ownPoweredDisplay(vendingScreen,'自动售货机',[6.5,24],{id:'vending'});
    for(let i=0;i<9;i++) cyl(VX2-.36+(i%3)*.36,1.78-((i/3)|0)*.42,-RZ+.58,.078,.25,
      [col.jadeL,col.orange,col.blueL][i%3],{gloss:.5,tag:'自动售货机'});
    thing('自动售货机',VX2,1.78,-RZ+.60,'自动售货机里有饮料。','There are drinks in the vending machine.',
      '自动 automatic + 售货 selling goods + 机 machine.',{focus:[VX2,-RZ+1.85],reach:1.7});
    solid(AX-1.1,VX2+.9,-RZ,-RZ+1.45);
    // The cart corral, by the doors where they always end up. A nested row of four shopping carts
    // and a stack of hand baskets beside them — the first thing you pass on the way in and the last
    // loose fixture a real concourse is ever without. The `thing` is on the front cart, which is the
    // one a player would actually reach for.
    for(let i=0;i<4;i++) {
      const cx=AX-2.4, cz=-RZ+1.6+i*.66;
      const b=cart(cx,cz,Math.PI/2); solid(b[0],b[1],b[2],b[3]);
    }
    const bk=basket(AX-3.5,-RZ+1.6,0,3); solid(bk[0],bk[1],bk[2],bk[3]);
    thing('购物车',AX-2.4,1.20,-RZ+1.6,'推一辆购物车吧。','Take a shopping cart.',
      '购物 shopping + 车 vehicle/cart.',{focus:[AX-2.4,-RZ+2.6],reach:1.9});
    thing('购物篮',AX-3.5,1.20,-RZ+1.6,'拿个购物篮，方便拿东西。','Grab a basket — easier to carry things.',
      '购物 shopping + 篮 basket.',{focus:[AX-3.5,-RZ+2.6],reach:1.7});

    // Milk-tea kiosk, standing free in the concourse the way the good ones do.
    const TX=-5.6, TZ=6.2;
    box(TX,1.10,TZ,3.00,2.20,2.00,col.jade,{round:.14,gloss:.26,tag:'奶茶'});
    box(TX,1.30,TZ-1.12,2.50,.95,.12,col.white,{hard:true,gloss:.4,tag:'奶茶'});
    const kioskSign=litten(box(TX,2.48,TZ-1.06,2.70,.58,.09,col.jadeL,
      {hard:true,mode:1,glow:.24}),.65);
    const kioskWord=glyphs(TX,2.48,TZ-1.14,Math.PI,'奶茶',
      {size:.30,gap:.10,color:col.white,mode:1,glow:.12,tag:'奶茶'});
    ownPoweredDisplay([kioskSign,kioskWord],'奶茶',[10,22],{id:'concourse-kiosk'});
    for(let i=0;i<6;i++) cyl(TX-.95+i*.38,1.92,TZ-1.02,.09,.32,
      [col.cream,col.wood,col.pink][i%3],{gloss:.4,tag:'奶茶'});
    box(TX+1.05,1.55,TZ-.60,.44,.70,.44,col.steel,{hard:true,gloss:.6,tag:'奶茶',...MAT.metal});
    shade(TX,TZ,3.15,2.18,.20);
    solid(TX-1.6,TX+1.6,TZ-1.15,TZ+1.15);
    // A free-standing kiosk in the middle of a concourse is lit by its own sign and nothing else.
    ownPublicLight(B.light(TX,2.35,TZ-1.35,[0.66,1.00,0.90],.48,2.5),'decorative');
    thing('奶茶',TX,2.00,TZ-1.30,'一杯珍珠奶茶，少糖。','One bubble tea, less sugar.',
      '奶 milk + 茶 tea.',{focus:[TX,TZ-2.4],reach:1.8});

    // The event pad occupies the audited clear north-atrium pocket x ±1.35, z 4.20–7.20 and
    // never calls solid(), so routes and patrols are unchanged. A single 2.70 × 3.00 m sheet here
    // stayed opaque even between events; from the nearby north camera its hard boundary filled the
    // foreground and read as a broken floor/reflection. Four 55 mm, mutually disjoint inlay strips
    // preserve the seasonal event footprint without laying another broad face over polished stone.
    seasonEventPad=[
      flat(0,.020,4.2275,2.70,.055,SEASON_STYLE.spring.pad,
        {mode:0,gloss:.28,tag:'中庭活动',...MAT.slab}),
      flat(0,.020,7.1725,2.70,.055,SEASON_STYLE.spring.pad,
        {mode:0,gloss:.28,tag:'中庭活动',...MAT.slab}),
      flat(-1.3225,.020,5.70,.055,2.89,SEASON_STYLE.spring.pad,
        {mode:0,gloss:.28,tag:'中庭活动',...MAT.slab}),
      flat(1.3225,.020,5.70,.055,2.89,SEASON_STYLE.spring.pad,
        {mode:0,gloss:.28,tag:'中庭活动',...MAT.slab}),
    ];
    seasonEventPad.forEach(dynamicVisual);
    const eventPart=(key,p,a=.62,g=.10,phase=0,stage=null,chase=false)=>{
      dynamicVisual(p); p.alpha=.001; p.glow=.01;
      // Retained diagnostics let the pure event gate prove that only authored lamp accents pulse;
      // they do not add render state, callbacks or per-frame allocation.
      p.mallEventKey=key;p.mallEventStage=stage;p.mallEventChase=!!chase;
      eventParts.push({key,p,a,g,phase,stage,chase}); return p;
    };
    const matAt=[[-.80,5.75],[0,5.75],[.80,5.75],[-.40,4.85],[.40,4.85],[0,6.55]];
    matAt.forEach(([x,z],i)=>eventPart('fitness',
      box(x,.030,z,.56,.012,.84,[col.jade,col.orange,col.blue,col.pink][i%4],
        {hard:true,mode:1,alpha:.001,glow:.02,tag:'中庭活动'}),.54,.10,i*.7));
    eventPart('fashion',box(0,.032,5.70,1.24,.012,2.88,C('#d9b66c'),
      {hard:true,mode:1,alpha:.001,glow:.02,tag:'中庭活动'}),.46,.13,0);
    for(const x of [-.67,.67]) eventPart('fashion',box(x,.035,5.70,.055,.012,2.92,col.red,
      {hard:true,mode:1,alpha:.001,glow:.04,tag:'中庭活动'}),.78,.20,x);
    for(let i=0;i<14;i++) {
      const a=i/14*Math.PI*2, x=Math.sin(a)*1.08, z=5.70+Math.cos(a)*1.26;
      eventPart('lights',cyl(x,.040,z,.065,.025,[col.pink,col.blueL,col.goldL,col.jadeL][i%4],
        {mode:1,alpha:.001,glow:.04,tag:'中庭活动'}),.78,.28,i*.55,null,true);
    }
    // Each programme now has a focal object rather than only a different floor graphic. The kit
    // shares the same small footprint and retained visibility mechanism as the mats above: one
    // arrangement fades up while the other two remain dormant, so no route or collision changes.
    // Fitness: a low coach step, bottle station and compact weight rack.
    eventPart('fitness',box(0,.085,6.52,.76,.14,.50,col.jade,
      {hard:true,alpha:.001,gloss:.20,tag:'中庭活动'}),.82,.08);
    for(const x of [-.55,.55]) eventPart('fitness',capsule(x,.66,6.88,.026,1.05,.026,col.steelD,
      {alpha:.001,gloss:.48,tag:'中庭活动'}),.86,.04,x);
    eventPart('fitness',capsule(0,1.16,6.88,.026,1.10,.026,col.steelD,
      {rz:Math.PI/2,alpha:.001,gloss:.48,tag:'中庭活动'}),.86,.04);
    for(let i=0;i<4;i++) eventPart('fitness',cyl(-.42+i*.28,.27,6.88,.105,.055,
      [col.blue,col.orange,col.jade,col.pink][i],{rx:Math.PI/2,alpha:.001,gloss:.24,tag:'中庭活动'}),.84,.05,i);
    for(let i=0;i<3;i++) eventPart('fitness',cyl(.72+i*.13,.15,6.38,.038,.26,
      [col.blueL,col.orange,col.jadeL][i],{alpha:.001,gloss:.44,tag:'中庭活动'}),.88,.06,i);

    // Fashion: a raised champagne runway, far-edge campaign frame and restrained footlights. The
    // first wall stood at z 6.91, only 1.49 m from the north event camera; two translucent slabs
    // swallowed the cast and atrium. Narrow banners now sit behind the models at the far edge.
    eventPart('fashion',box(0,.075,5.68,1.20,.10,2.84,C('#caa65f'),
      {hard:true,alpha:.001,gloss:.32,tag:'中庭活动'}),.72,.10);
    for(const x of [-.88,.88]) eventPart('fashion',box(x,.92,4.255,.30,1.50,.07,
      x<0?col.redD:col.violet,{round:.035,alpha:.001,gloss:.18,tag:'中庭活动'}),.94,.08,x);
    for(const x of [-1.08,1.08]) eventPart('fashion',capsule(x,1.20,4.255,.035,2.16,.035,col.gold,
      {alpha:.001,gloss:.56,tag:'中庭活动'}),.96,.09,x);
    eventPart('fashion',capsule(0,2.27,4.255,.035,2.16,.035,col.gold,
      {rz:Math.PI/2,alpha:.001,gloss:.56,tag:'中庭活动'}),.96,.09);
    for(let i=0;i<6;i++) eventPart('fashion',cyl((i%2?1:-1)*.72,.12,4.55+(i>>1)*.74,.07,.04,col.warm,
      {mode:1,alpha:.001,glow:.05,tag:'中庭活动'}),.92,.22,i*.65);
    // Backstage cue tower: start / middle / final each owns one retained lens.  It is readable in
    // the runway shots and advances from the same event progress as the models, so it cannot tell
    // a different story from the people on the catwalk.
    eventPart('fashion',box(-1.10,.43,5.00,.18,.56,.055,col.charcoal,
      {hard:true,alpha:.001,gloss:.20,tag:'中庭活动'}),.90,.025);
    [col.red,col.goldL,col.jadeL].forEach((c,i)=>
      eventPart('fashion',cyl(-1.10,.24+i*.19,5.035,.055,.022,c,
        {rx:Math.PI/2,mode:1,alpha:.001,glow:.04,tag:'中庭活动'}),.96,.24,i*.2,i));

    // Evening light show: the operator is at z 6.02, so the desk belongs south of them and the
    // speaker/truss line belongs at the far edge. The former kit put every large solid north of the
    // operator, where it became a dark full-frame wall. Only the coloured lenses and floor dots
    // opt into the chase; structural hardware stays solid while the beat advances.
    eventPart('lights',box(0,.40,5.55,1.20,.64,.38,col.charcoal,
      {round:.045,alpha:.001,gloss:.24,tag:'中庭活动'}),.96,.035);
    eventPart('lights',box(0,.78,5.755,.82,.20,.035,col.screen,
      {hard:true,mode:1,alpha:.001,glow:.06,tag:'中庭活动'}),.94,.20);
    for(const x of [-1.02,1.02]) {
      eventPart('lights',box(x,.48,4.52,.32,.88,.30,col.charcoal,
        {round:.035,alpha:.001,gloss:.18,tag:'中庭活动'}),.96,.035,x);
      eventPart('lights',capsule(x<0?-1.14:1.14,1.30,4.255,.035,2.20,.035,col.steelD,
        {alpha:.001,gloss:.52,tag:'中庭活动'}),.96,.05,x);
    }
    eventPart('lights',capsule(0,2.38,4.255,.035,2.26,.035,col.steelD,
      {rz:Math.PI/2,alpha:.001,gloss:.52,tag:'中庭活动'}),.96,.05);
    for(let i=0;i<4;i++) eventPart('lights',cyl(-.66+i*.44,2.26,4.30,.10,.13,
      [col.pink,col.blueL,col.goldL,col.jadeL][i],{rx:Math.PI/2,mode:1,alpha:.001,glow:.06,tag:'中庭活动'}),.94,.34,i*.8,null,true);
    // Five modular templates share the exact same retained footprint/controller as the original
    // three heroes. Their descriptors are data in mall-events.js: no template is permitted to add
    // a collider, light, callback or actor, and the same six shoppers fill the audience roles.
    for(const key of MallEvents.KEYS) for(const d of MallEvents.layout(key)) {
      const o={hard:d.hard,mode:d.mode,alpha:.001,glow:.01,tag:'中庭活动'};
      if(d.gloss!==undefined)o.gloss=d.gloss;
      if(d.round!==undefined)o.round=d.round;
      if(d.bevel!==undefined)o.bevel=d.bevel;
      if(d.rx)o.rx=d.rx;if(d.ry)o.ry=d.ry;if(d.rz)o.rz=d.rz;
      let part;
      if(d.shape==='box')part=box(d.x,d.y,d.z,d.sx,d.sy,d.sz,C(d.color),o);
      else if(d.shape==='cyl')part=cyl(d.x,d.y,d.z,d.r,d.h,C(d.color),o);
      else if(d.shape==='capsule')part=capsule(d.x,d.y,d.z,d.sx,d.sy,d.sz,C(d.color),o);
      else part=taper(d.x,d.y,d.z,d.sx,d.sy,d.sz,C(d.color),o);
      part.mallEventTemplate=key;part.mallEventRole=d.role;
      eventPart(key,part,d.a,d.g,d.phase||0,d.stage===undefined?null:d.stage);
    }
    // Schedule board, hung high enough to walk under and readable on the approach from the doors.
    for(const x of [-1.08,1.08]) capsule(x,3.83,7.14,.014,.58,.014,col.steelD,
      {gloss:.48,tag:'中庭活动'});
    box(0,3.40,7.14,2.60,.78,.055,col.charcoal,{hard:true,gloss:.28,tag:'中庭活动'});
    glyphs(0,3.58,7.105,Math.PI,'中庭活动',{size:.145,gap:.042,color:col.white,mode:1,glow:.075,tag:'中庭活动'});
    // Two tiny season cards reuse the programme board and therefore add no floor footprint.
    for(const x of [-1.10,1.10]) {
      const plate=box(x,3.56,7.085,.24,.27,.018,SEASON_STYLE.spring.card,
        {hard:true,mode:1,glow:.045,tag:'中庭活动'});
      const parts=glyphs(x,3.56,7.058,Math.PI,'春',
        {size:.135,color:col.white,mode:1,glow:.05,tag:'中庭活动'});
      dynamicVisual(plate);parts.forEach(dynamicVisual);seasonCards.push({plate,parts});
    }
    const eventRows=[[-.84,'10:00',0],[0,'14:00',1],[.84,'19:00',2]],todayEvents=eventsToday();
    eventRows.forEach(([x,tm,slot])=>{
      const e=todayEvents[slot];
      glyphs(x,3.30,7.105,Math.PI,tm,{size:.075,gap:.020,color:col.goldL,mode:1,glow:.045,tag:'中庭活动'});
      const parts=glyphs(x,3.12,7.105,Math.PI,e.short,
        {size:.085,gap:.025,color:col.white,mode:1,glow:.035,tag:'中庭活动'});
      parts.forEach(dynamicVisual);eventBoardLabels.push({slot,key:e.key,parts});
      const p=cyl(x,2.97,7.09,.045,.025,col.jadeL,{rx:Math.PI/2,mode:1,glow:.025,tag:'中庭活动'});
      dynamicVisual(p); eventLamps.push({key:e.key,p,slot});
    });
    const eventThing=thing('中庭活动',0,1.35,5.70,'看看今天中庭有什么活动。','See what is happening in the atrium today.',
      '中庭 atrium + 活动 event.',{focus:[0,4.05],reach:2.2});
    eventThing.mallEvent=true;

    // Overnight cleaning gives the closed building a job rather than leaving it frozen. This
    // compact ride-on scrubber is retained geometry, fades in with the shutters, and neither moves
    // nor collides — far cheaper than another rig or patrol in an already dense scene.
    const CX=-6.75, CZ=-4.55, cleaner=[];
    cleaner.push(box(CX,.46,CZ,1.32,.70,1.05,C('#4d7f78'),
      {round:.18,alpha:.001,gloss:.25,tag:'清洁车'}));
    cleaner.push(ball(CX-.24,.78,CZ+.08,.48,.50,.42,C('#82b2aa'),
      {alpha:.001,gloss:.22,tag:'清洁车'}));
    cleaner.push(box(CX+.36,.88,CZ+.12,.46,.32,.44,col.charcoal,
      {round:.08,alpha:.001,gloss:.16,tag:'清洁车'}));
    cleaner.push(capsule(CX+.48,1.18,CZ-.18,.025,.52,.025,col.steelD,
      {rz:.24,alpha:.001,gloss:.50,tag:'清洁车'}));
    cleaner.push(capsule(CX+.67,1.28,CZ-.25,.025,.34,.025,col.charcoal,
      {rx:Math.PI/2,alpha:.001,gloss:.34,tag:'清洁车'}));
    for(const x of [CX-.42,CX+.42]) for(const z of [CZ-.42,CZ+.42])
      cleaner.push(cyl(x,.24,z,.14,.11,col.charcoal,
        {rz:Math.PI/2,alpha:.001,gloss:.24,tag:'清洁车'}));
    cleaner.push(cyl(CX,.105,CZ-.52,.43,.055,C('#5f7780'),
      {alpha:.001,gloss:.22,tag:'清洁车'}));
    cleanerBeacon=ball(CX-.40,1.23,CZ+.08,.09,.075,.09,col.orange,
      {mode:1,alpha:.001,glow:.01,tag:'清洁车'});
    cleaner.push(cleanerBeacon);
    afterHoursVisual(cleaner,.94);
    const cleanSheen=flat(CX+1.55,.022,CZ,1.85,1.05,C('#829ba2'),
      {mode:7,gloss:.62,alpha:.001,tag:'清洁车'});
    afterHoursVisual(cleanSheen,.13,.015);
    const cleanerAll=[...cleaner,cleanSheen];
    cleanerAll.forEach(p=>boundMotion(p,CX,.75,CZ,6.35));
    cleanerRig={parts:cleanerAll.map(p=>({p,base:p.m.slice()})),cx:CX,cz:CZ,
      x:CX,z:CZ,moving:false,reduced:false};

    // Seating, trees and the banners overhead.
    // The two arrival zones used to be solid 2.55 × 1.65 m pale sheets. Although intentional,
    // their hard rectangular fills appeared to be floor patches directly under the benches. Keep
    // the exact zone extents as four 55 mm, non-overlapping stone-inlay strips instead: the zones
    // still read, the centre aisle stays clear, and no broad face sits beneath a contact shadow.
    for(const x of [-3,3]) {
      for(const z of [-13.3975,-11.8025])
        flat(x,.020,z,2.55,.055,col.inlay,{mode:0,gloss:.27,...MAT.stone});
      for(const sx of [-1,1])
        flat(x+sx*1.2475,.020,-12.6,.055,1.54,col.inlay,{mode:0,gloss:.27,...MAT.stone});
    }
    for(const [x,z,al] of [[-3.0,-12.6,'x'],[3.0,-12.6,'x'],[-3.4,-1.0,'z'],[3.4,-1.0,'z'],
                           [-2.2,10.0,'x'],[2.2,10.0,'x'],[10.6,-2.0,'z'],[-10.6,-2.0,'z']]) {
      // Same rule as the gallery above: turn each one to face the middle of the concourse, which
      // is where the fountain is and the only thing down here worth sitting and looking at.
      const b=bench(x,z,al,0,'休息区',al==='z'?x<0:z<0); solid(b[0],b[1],b[2],b[3]);
    }
    // Ground-floor still lifes sit on, or directly inside, the existing bench footprints.
    publicClutter(-3.52,-12.55,.02,'bag',0,1);
    publicClutter( 3.00,-12.63,.60,'cup',.25,1);
    publicClutter(-3.40,  -.75,.60,'phone',-.25,1);
    publicClutter(10.55, -2.35,.02,'parcel',.12,1);
    thing('休息区',3.0,1.15,-11.8,'逛累了可以在这里坐一会儿。','You can sit here when shopping gets tiring.',
      '休息 rest + 区 area.',{focus:[3.0,-11.4],reach:2.0});
    // The atrium's shrub planters now flower, each in its own hue — the concourse is the one place
    // a mall puts colour at ground level, and a row of identical green bushes read as a car park's
    // hedge. Trees stay green; the six shrubs take pink, orange, violet, yellow, blue, cream.
    const FCOL=[col.pink,col.orange,col.violet,col.yellow,col.blueL,col.cream];
    const shrub=[[ -17.2,-13.4],[17.2,-13.4],[-17.2,12.6],[17.2,12.6],[9.6,-9.0],[-9.6,-9.0],[-2.0,-1.2]];
    for(const [x,z,tree] of [[-8.8,-12.9,1],[8.8,-12.9,1],[-17.2,-13.4,0],[17.2,-13.4,0],
                             [-17.2,12.6,0],[17.2,12.6,0],[-9.2,1.6,1],[9.2,1.6,1],
                             [9.6,-9.0,0],[-9.6,-9.0,0],[9.6,10.4,1],[-2.0,-1.2,0]]) {
      let fc=null;
      if(!tree){ const si=shrub.findIndex(s=>s[0]===x&&s[1]===z); if(si>=0) fc=FCOL[si%FCOL.length]; }
      // Preserve the original .88 m planter footprint/collider while opening the critical views:
      // both entrance trees, the two retail-edge trees and the information-side shrub become
      // porous low planting. The south-east tree still anchors the lift corner.
      const open=(z===-12.9)||(z===1.6)||(z===-9.0);
      const p=open?lowPlanter(x,z,.88,0,fc||col.jadeL):planter(x,z,.88,0,!!tree,fc);
      solid(p[0],p[1],p[2],p[3]);
    }
    for(const s of [-1,1]) {
      const side=s<0?0:1;
      const bn=box(s*5.4,H-1.55,-6.5,3.40,2.40,.06,SEASON_STYLE.spring.banner[side],{hard:true,mode:7});
      dynamicVisual(bn); flags.push({p:bn,x:s*5.4,y:H-1.55,z:-6.5,w:3.40,h:2.40,phase:s});
      // These hang through all three decks, so both faces are genuine public viewpoints.  The
      // original lettering existed only on the north face; from the 3F journey they were two huge
      // blank colour fields directly in front of the arcade.  Mirror the same campaign on the
      // south face without changing the banner geometry or its motion.
      for(const [oz,yaw] of [[-.061,Math.PI],[.061,0]]) {
        const parts=glyphs(s*5.4,H-1.10,-6.5+oz,yaw,SEASON_STYLE.spring.text[side],
          {size:.28,gap:.08,color:col.goldL,mode:1,glow:.12});
        parts.forEach(dynamicVisual);seasonBannerGlyphs.push({side,parts});
        glyphs(s*5.4,H-1.95,-6.5+oz,yaw,'新天地',
          {size:.22,gap:.06,color:col.white,mode:1,glow:.08});
      }
    }
  }

  // ---------------------------------------------------------------- level one
  function buildGround() {
    // ---- west wall: jewellery, fashion, shoes.
    shop('W',-12.6,8.0,{kind:'珠宝店',name:'金瑞珠宝',brand:'JINRUI JEWELLERY',accent:col.gold,
      carpet:col.carpetB,
      // The window, from the tenant's own file. `MallFit['珠宝店:win']` is now read by `shop()`
      // itself for every unit, so this line is only kept as documentation of where the geometry
      // lives — js/mall-jewel.js — and is redundant with the shell's own lookup. Removing it
      // would change nothing; leave it or delete it with the next visit to that file.
      win(Wi,b,side){ const w=MallFit['珠宝店:win']; if(w) w(Wi,b,side); },
      fit(A){
        counter(A,1.5,-2.2,4.0,.80,col.charcoal); counter(A,1.5,2.2,4.0,.80,col.charcoal);
        for(const b of [-2.2,2.2]) for(let i=0;i<5;i++) {
          litten(A.put(1.5,b-1.5+i*.75,.62,.62,.03,1.06,col.cream,{hard:true,mode:1,glow:.16,tag:'项链'}),.4);
          A.taper(1.5,b-1.5+i*.75,1.20,.20,.24,.20,col.trim,{gloss:.2,tag:'项链'});
          for(let k=0;k<7;k++) {
            const t=(k-3)/3;
            A.ball(1.48,b-1.5+i*.75+t*.075,1.16-Math.cos(t*1.4)*.045,.018,.018,.018,
              k===3?col.goldL:col.white,{gloss:.8,tag:'项链'});
          }
        }
        shelfWall(A,.55,0,5.2,3,5,[col.goldL,col.white,col.cream],'珠宝店',2.30,'jar');
        A.th('珠宝店',D+.35,0,'这条项链多少钱？','How much is this necklace?','珠宝 jewellery + 店 shop.',2.2,2.5);
        A.th('项链',1.9,-2.2,'金的还是银的？','Gold or silver?','项 neck + 链 chain.',1.6,1.2);
      }});
    shop('W',-2.2,10.0,{kind:'服装店',name:'悦己时装',brand:'YUEJI FASHION',accent:col.redD,
      carpet:C('#b8a89a'),
      fit(A){
        // Two rails against the side walls, a folding island in the middle, and the fitting rooms
        // and mirror at the back — the standard plan of every clothes shop there has ever been.
        rail(A,1.15,-3.4,3.0,[col.blue,col.pink,col.cream,col.jade,col.redD,col.violet]);
        rail(A,1.15, 3.4,3.0,[col.cream,col.jade,col.blue,col.redD,col.pink,col.gold]);
        rail(A,3.55,-3.4,2.4,[col.charcoal,col.blue,col.cream,col.fabric]);
        island(A,2.45,.2,2.60,1.20,(top)=>{
          // Folded clothes are a stack of thin things, not one thick thing. Three or four leaves
          // with a little offset between them, each with the pale crease along its front edge that
          // a folded garment has — which is the whole difference between a jumper and a brick.
          for(let i=0;i<3;i++) for(let k=0;k<3;k++) {
            const a0=2.45+(k-1)*.34, b0=.2-.9+i*.9;
            const cc=[col.cream,col.blue,col.pink,col.jade,col.fabric][(i*3+k)%5];
            const leaves=3+((i+k)%2);
            for(let j=0;j<leaves;j++) {
              const skew=((j*7+i*3)%3-1)*.014, ty=top+.03+j*.042;
              A.put(a0+skew,b0+skew*.6,.30-j*.006,.60-j*.012,.038,ty,cc,
                {mode:7,round:.02,tag:'衣服',ry:((j*5+k)%3-1)*.02});
              A.put(a0+skew+.146,b0+skew*.6,.012,.58-j*.012,.030,ty,tint(cc,1.10),
                {mode:7,tag:'衣服',ry:((j*5+k)%3-1)*.02});
            }
          }
        });
        // A low platform of mannequins under its own spotlight, facing the door.
        A.put(3.30,4.10,1.30,2.40,.18,.09,col.woodD,{hard:true,gloss:.26});
        for(let i=0;i<3;i++) {
          const p=A.at(3.30+(i-1)*.42,4.10+(i-1)*.72);
          mannequin(p[0],p[1],[col.redD,col.cream,col.jade][i],A.yaw,A.y0+.18,'服装店');
        }
        A.stop(2.7,3.9,3.0,5.2);
        counter(A,.95,-1.0,2.60,.85,col.woodD);
        // Fitting rooms: a timber frame, pleated curtains, a number on each, and a bench inside.
        for(let i=0;i<3;i++) {
          const b=-3.0+i*1.45;
          A.put(.80,b,1.30,1.42,2.42,1.21,col.woodD,{hard:true,gloss:.18,tag:'试衣间'});
          A.put(.72,b,1.10,1.16,2.20,1.18,C('#2b2f35'),{hard:true,gloss:.10,tag:'试衣间'});
          litten(A.put(.30,b,.05,1.00,.06,2.20,col.warm,{hard:true,mode:1,glow:.20,tag:'试衣间'}),.4);
          A.put(.55,b,.10,1.02,.12,.48,col.fabric,{mode:7,round:.06,tag:'试衣间'});   // bench inside
          // The curtain hangs across the front of the cubicle, in pleats, half drawn back.
          for(let k=0;k<7;k++)
            A.put(1.40,b-.52+k*.175,.13,.16,2.14,1.10,k%2?col.redD:C('#8e3730'),
              {mode:7,round:.05,tag:'试衣间'});
          A.cap(1.44,b,2.26,.025,1.34,.025,col.steelD,{rx:Math.PI/2,gloss:.5,tag:'试衣间'});
          A.put(1.47,b,.06,.30,.22,2.42,col.trim,{hard:true,gloss:.3,tag:'试衣间'});
          A.glyph(1.51,b,2.42,String(i+1),{size:.16,color:col.goldL,glow:.14,tag:'试衣间'});
          A.stop(.20,1.5,b-.72,b+.72);
        }
        // Full-height mirror in a slim frame, where you stand when you come out of one.
        A.put(1.55,3.9,.10,1.34,2.30,1.20,col.trim,{hard:true,gloss:.3,tag:'镜子'});
        A.put(1.48,3.9,.06,1.16,2.14,1.20,col.glass,{hard:true,mode:1,alpha:.62,gloss:.95,tag:'镜子'});
        litten(A.put(1.42,3.9,.03,1.00,1.98,1.20,col.white,{hard:true,mode:1,glow:.09,tag:'镜子'}),.3);
        A.stop(1.3,1.7,3.2,4.6);
        A.th('服装店',D+.35,0,'这件外套可以试穿吗？','Can I try this coat on?',
          '服装 is clothing; 试穿 means to try clothes on.',2.2,2.5);
        A.th('衣服',2.0,-3.4,'先看看颜色和尺码。','Look at the colours and sizes first.','衣服 means clothes.',1.8,1.5);
        A.th('试衣间',1.9,-1.55,'试衣间现在空着。','The fitting room is free now.',
          '试 to try + 衣 clothes + 间 room.',1.9,1.4);
        A.th('镜子',2.3,3.9,'穿上以后照照镜子。','Check the mirror after putting it on.',
          '照镜子 means to look in a mirror.',1.8,1.6);
      }});
    // 千里 from 千里之行，始于足下 — a journey of a thousand li begins with a single step. Keeps the
    // walking pun the old name had, from a Laozi line rather than from a company: 步步高 is a real
    // Chinese electronics firm, and the no-real-brands rule is absolute in both languages. The same
    // four characters stay in the Spring Festival couplets in js/home-*.js (万事如意步步高), which
    // are the classical idiom the company was named after and not a trademark use.
    shop('W',9.2,8.4,{kind:'鞋店',name:'千里鞋城',brand:'QIANLI SHOES',accent:col.jade,
      // The tenant owns its window through MallFit['鞋店:win']; an absent module falls through to
      // the shell's generic display through the shared resolver.
      carpet:col.carpetG,fit(A){
        shelfWall(A,.55,0,6.4,4,7,[col.white,col.red,col.blue,col.charcoal,col.goldL],'鞋',2.30,'shoe');
        for(const b of [-2.4,2.4])
          riser(A,2.4,b,2.20,3,[col.white,col.red,col.blue,col.charcoal,col.goldL],'鞋','shoe');
        for(let i=0;i<3;i++) {
          A.put(3.7,-2.8+i*1.9,.70,.70,.42,.22,col.fabric,{round:.12,gloss:.12});
          A.stop(3.4,4.0,-3.2+i*1.9,-2.4+i*1.9);
        }
        counter(A,1.9,3.2,2.4,.85,col.woodD);
        A.th('鞋店',D+.35,0,'这双鞋有没有大一号的？','Do these shoes come a size bigger?',
          '鞋 shoe + 店 shop.',2.2,2.5);
        A.th('鞋',2.4,-2.4,'试试这双，走两步。','Try these on and take a few steps.','鞋 means shoes.',1.7,1.1);
      }});

    // ---- east wall: digital, optician, flowers.
    shop('E',-11.0,10.5,{kind:'电子产品',name:'未来数码',brand:'FUTURE DIGITAL',accent:col.blue,
      carpet:col.carpetB,fit(A){
        // A wall of live screens, then demo tables down the middle of the room.
        // A television is a bezel, a panel and something on the panel. These were one emissive
        // rectangle each — six flat blue slabs floating on a white wall, with no frame to give
        // them a size and nothing on them to say they were switched on rather than painted.
        for(let i=0;i<6;i++) {
          const b=-4.0+i*1.6;
          A.put(.40,b,.08,1.44,.95,2.20,col.trim,{hard:true,gloss:.34,tag:'电子产品'});   // bezel
          A.put(.44,b,.04,1.31,.82,2.20,C('#101820'),{hard:true,gloss:.30,tag:'电子产品'}); // dark panel
          const p=litten(A.put(.47,b,.02,1.24,.75,2.20,col.screen,
            {hard:true,mode:1,glow:.15,tag:'电子产品'}),.4);
          dynamicVisual(p); leds.push({p,phase:i*.9});
          // Something playing: a bright band across the middle and a darker one below it, which at
          // this distance is the difference between a screen and a blue rectangle.
          A.put(.49,b,.012,1.06,.20,2.30,C('#9fd8ef'),{hard:true,mode:1,glow:.10,tag:'电子产品'});
          A.put(.49,b,.012,.78,.12,2.06,C('#2b6d92'),{hard:true,mode:1,glow:.06,tag:'电子产品'});
          A.put(.42,b,.05,.22,.10,1.70,col.steelD,{hard:true,gloss:.5,tag:'电子产品'});    // wall bracket
        }
        for(let i=0;i<4;i++) {
          const b=-3.6+i*2.4;
          A.put(2.3,b,1.05,1.90,.12,.80,col.white,{gloss:.26,tag:'电子产品'});
          for(let k=0;k<3;k++) GOODS.phone(A,2.3,b-.55+k*.55,.86,col.steelD);
          A.put(2.3,b,.20,.36,.30,.95,col.steelD,{hard:true,gloss:.5,tag:'电子产品'});
          const p=litten(A.put(2.3,b,.05,.70,.44,1.28,col.screen,{hard:true,mode:1,glow:.2,tag:'电子产品'}),.35);
          dynamicVisual(p); leds.push({p,phase:i*1.3});
          A.stop(1.7,2.9,b-1.0,b+1.0);
        }
        counter(A,3.9,-3.2,3.2,.90,col.charcoal);
        A.th('电子产品',D+.35,0,'这台手机有新的摄像头。','This phone has a new camera.',
          '电子 electronic + 产品 product.',2.2,2.5);
        A.th('手机',2.9,-3.6,'可以试试手机的相机。','You can test the phone camera.',
          '手机 literally means hand machine.',1.6,1.2);
        A.th('耳机',2.9,-1.2,'戴上耳机听一首歌。','Put on the headphones and hear a song.',
          '耳 ear + 机 machine.',1.6,1.2);
        A.th('游戏机',2.9,1.2,'这台游戏机可以免费试玩。','This console has a free demo.',
          '游戏 game + 机 machine.',1.6,1.2);
      }});
    shop('E',-.5,7.6,{kind:'眼镜店',name:'明视眼镜',brand:'MINGSHI OPTICAL',accent:col.jadeL,
      carpet:col.carpetG,fit(A){
        for(let r=0;r<4;r++) {
          A.put(.50,0,.30,6.6,.05,.95+r*.50,col.steel,{hard:true,gloss:.5,tag:'眼镜'});
          for(let i=0;i<8;i++)
            GOODS.glasses(A,.46,-3.0+i*.86,.95+r*.50,[col.charcoal,col.gold,col.red,col.blue][(i+r)%4]);
        }
        counter(A,2.0,1.6,3.0,.95,col.cream);
        A.put(3.3,-2.4,1.10,1.20,.90,.46,col.white,{gloss:.3,tag:'眼镜'});
        A.put(3.3,-2.4,.50,.60,.70,1.20,col.charcoal,{hard:true,gloss:.4,tag:'眼镜'});
        A.stop(2.9,3.7,-3.0,-1.8);
        A.th('眼镜店',D+.35,0,'我想配一副新眼镜。','I would like a new pair of glasses.',
          '眼 eye + 镜 lens.',2.2,2.5);
        A.th('眼镜',1.1,0,'这副眼镜试戴一下。','Try this pair on.','眼镜 means glasses.',1.7,1.3);
      }});
    shop('E',8.6,8.0,{kind:'花店',name:'四季花坊',brand:'SIJI FLOWERS',accent:col.pink,
      // MallFit['花店:win'] owns the display before this fallback fit is asked to build the room.
      carpet:col.carpetG,fit(A){
        for(let i=0;i<12;i++) {
          const a=.9+((i/4)|0)*1.35, b=-2.9+(i%4)*1.9;
          A.taper(a,b,.36,.50,.72,.50,col.cream,{gloss:.2,tag:'花'});
          const [fx,fz]=A.at(a,b);
          for(let k=0;k<7;k++) ball(fx+Math.sin(k*2.1)*.20,A.y0+.92+(k%3)*.13,fz+Math.cos(k*2.1)*.20,
            .12,.14,.12,[col.pink,col.yellow,col.red,col.white,col.violet][(i+k)%5],
            {mode:15,gloss:.12,tag:'花'});
        }
        A.stop(.6,3.8,-3.4,3.4);
        counter(A,4.0,2.6,2.4,.80,col.woodD);
        A.th('花店',D+.35,0,'买一束花送给朋友。','Buy a bunch of flowers for a friend.',
          '花 flower + 店 shop.',2.2,2.5);
        A.th('花',4.2,-2.2,'这些花今天早上刚到。','These flowers arrived this morning.',
          '花 means flower.',1.7,1.2);
      }});

    // ---- north wall, either side of the doors: a café and a bakery.
    //
    // The café is cut 0.72 m short at its west end, and this is the north-west corner being sorted
    // out rather than a stylistic choice. Measured:
    //
    //   咖啡店 is shop('N',-14.5,8.6)  → x -18.80 … -10.20, z -18.00 … -13.20
    //   珠宝店 is shop('W',-12.6,8.0)  → x -23.00 … -18.20, z -16.60 …  -8.60
    //
    // 0.60 m of plan claimed twice, over 3.40 m — and what stood in it was not a rounding error.
    // The café's west party wall, 0.16 m thick and 3.55 m tall, ran at x -18.88…-18.72 from the
    // north wall to z -13.20, which put 3.25 m of it *inside the jewellers' shop*, half a metre
    // behind their own window and straight through their window display platform (x -19.35…-18.30).
    // Both floor plates were also drawn in the same 0.30 × 3.10 m at the same two heights, .015 and
    // .020, which is a z-fight in the corner. js/mall-coffee.js reported this and correctly refused
    // to work around it: the overlap is the shell's.
    //
    // 0.72 is the measured answer, not a round number. It puts the party wall at x -18.16…-18.00,
    // which is the whole of the gap that corner has: the jewellers' stall riser ends at x -18.15,
    // the west face of their lit fascia band is at x -17.99, and the wall is 0.16 m thick. Every
    // piece of their shopfront re-measured against it rather than taken on trust:
    //
    //   window platform  x -19.345…-18.295   clear
    //   jamb posts       x -18.295 …-18.185   25.0 mm
    //   mullions         x -18.2675…-18.1925  32.5 mm
    //   glass panes      x -18.2425…-18.1975  37.5 mm
    //   stall riser      x -18.29  …-18.15    −10.0 mm — the wall's west centimetre is inside it
    //   lit fascia band  x -17.99  …-17.91    10.0 mm
    //
    // The riser is the one that does not clear and cannot: 0.16 m of wall in a 0.16 m gap has no
    // slack, and taking the cut to 0.73 to free it would land the wall's west face exactly on the
    // riser's east face — two coplanar quads with the same normal, which is the flicker documented
    // at the escalator lip earlier in this file. A centimetre buried in an opaque box draws
    // nothing; a coplanar pair draws wrongly. What did have to be clean is: the two floor plates no
    // longer touch (the café's stops at x -17.93, theirs at -18.35), and the café's fascia now dies
    // 0.11 m inside the jewellers' at the corner, which is a mitre rather than a z-fight.
    //
    // One residual, recorded rather than hidden: the café's own valance strip (y 3.415…3.465, its
    // east face at x -17.955) passes 35 mm through the jewellers' lit fascia band over
    // z -16.40…-13.29. It is interior to that band on every side, so none of it is drawn.
    //
    // The tenant frame does not move, so nothing in js/mall-coffee.js or its eleven MallCast rows
    // shifts by a millimetre. What that file does have to do — reported, not worked around from
    // here, because it is not this file's to edit — is stop its back bar (b -4.10) and the west end
    // of its counter (b -4.04) at b -3.66, the inner face of the new wall. The back bar's overhang
    // ends up in the dead corner behind the wall and cannot be seen; the counter's does not.
    //
    // Still outstanding as of this pass, measured off the built scene rather than off that file's
    // source: props tagged 咖啡店 reach x -18.28 over z -16.39…-15.73 at y 0.98…1.56, which is
    // 0.12 m past the party wall's west face and straight through the jewellers' glass panes at
    // x -18.2425…-18.1975. Nothing in this file can fix that; it is the tenant's counter run.
    shop('N',-14.5,8.6,{kind:'咖啡店',name:'一间咖啡',brand:'ONE ROOM COFFEE',accent:col.woodD,
      cut:[.72,0],
      carpet:col.carpet,fit(A){
        counter(A,1.6,-1.4,4.6,.95,col.woodD);
        A.put(1.6,1.9,.70,.70,.55,1.30,col.steel,{hard:true,gloss:.62,tag:'咖啡'});
        for(let i=0;i<6;i++) GOODS.cup(A,1.35,-3.2+i*.6,1.05,[col.jade,col.wood,col.red][i%3]);
        shelfWall(A,.55,1.0,4.0,3,4,[col.cream,col.wood,col.jade],'咖啡店',2.30,'cup');
        for(const b of [-2.6,.6,3.2]) { const t=table(...A.at(3.5,b),A.y0,'咖啡店',3,.44);
          A.stop(2.9,4.1,b-1.0,b+1.0); }
        A.th('咖啡店',D+.35,0,'来一杯热的美式。','A hot americano, please.','咖啡 coffee + 店 shop.',2.2,2.5);
        A.th('咖啡',2.4,-1.4,'这里的咖啡比机场便宜。','The coffee here is cheaper than at the airport.',
          '咖啡 is a loan word — you can hear the English in it.',1.7,1.3);
      }});
    shop('N',14.0,8.0,{kind:'面包店',name:'麦香面包',brand:'MAIXIANG BAKERY',accent:col.yellow,
      carpet:col.cream,fit(A){
        for(let r=0;r<3;r++) {
          A.put(.60,0,.44,6.2,.06,.72+r*.62,col.wood,{hard:true,gloss:.22,tag:'面包'});
          for(let i=0;i<9;i++) GOODS.bread(A,.60,-2.8+i*.7,.75+r*.62,
            [col.wood,col.cream,col.woodD][(i+r)%3]);
        }
        A.stop(.4,.9,-3.2,3.2);
        counter(A,2.6,1.8,3.2,.90,col.cream);
        for(let i=0;i<8;i++) A.put(2.6,-.2+((i%4)*.34),.24,.30,.20,1.14,
          [col.orange,col.pink,col.yellow,col.cream][i%4],{mode:7,round:.05,tag:'面包'});
        for(const b of [-2.8]) { table(...A.at(3.6,b),A.y0,'面包店',3,.42); A.stop(3.0,4.2,b-1.0,b+1.0); }
        A.th('面包店',D+.35,0,'刚出炉的面包最香。','Bread straight from the oven smells best.',
          '面包 bread + 店 shop.',2.2,2.5);
        A.th('面包',1.3,0,'要两个牛角包。','Two croissants, please.','面 flour + 包 bun.',1.7,1.3);
      }});

    // ---- south wall: the pet shop, and the children's carousel in the open.
    shop('S',1.6,8.6,{kind:'宠物店',name:'宠爱宠物',brand:'CHONGAI PETS',accent:col.jadeL,
      // MallFit['宠物店:win'] owns the puppies; an absent module uses the shared generic fallback.
      carpet:col.carpetG,fit(A){
        for(let i=0;i<5;i++) {
          const b=-3.2+i*1.6;
          A.put(.90,b,1.10,1.40,1.50,.76,col.cream,{gloss:.2,tag:'小狗'});
          A.put(.36,b,.06,1.30,1.30,.80,col.glass,{hard:true,mode:1,alpha:.34,gloss:.9,tag:'小狗'});
          const [dx,dz]=A.at(.95,b), c=[col.cream,col.wood,col.white,col.charcoal,col.fabric][i];
          ball(dx,A.y0+.66,dz,.27,.23,.35,c,{mode:7,gloss:.1,tag:'小狗'});
          ball(dx,A.y0+.92,dz-.22*SIDE.S.n[1],.18,.18,.18,c,{mode:7,gloss:.1,tag:'小狗'});
        }
        A.stop(.5,1.6,-4.1,4.1);
        shelfWall(A,2.4,3.4,2.6,3,3,[col.orange,col.jade,col.blue],'宠物店',2.30,'box');
        counter(A,3.6,-2.6,2.6,.85,col.wood);
        A.th('宠物店',D+.35,0,'橱窗里有五只小狗。','There are five puppies in the window.',
          '宠物 pet + 店 shop.',2.2,2.5);
        A.th('小狗',2.0,0,'那只小狗一直看着你。','That puppy keeps looking at you.',
          '小 small + 狗 dog.',1.8,1.2);
      }});
    // A small sit-down restaurant beside the play area: an open kitchen pass, a lit menu board,
    // eight tables and a till. Somewhere to actually have lunch without leaving the building.
    // The two south tenants move west as a pair, preserving their party-wall gap while giving the
    // public lift a 3.8 m approach instead of a blind 1.4 m slot behind the restaurant.
    shop('S',10.8,8.6,{kind:'餐厅',name:'湘满楼',brand:'XIANGMAN RESTAURANT',accent:col.red,
      // MallFit['餐厅:win'] supplies the food models through the same route as every other tenant.
      carpet:C('#7a4a3e'),fit(A){
        // The pass, with the kitchen behind it and dishes waiting under the heat lamps.
        A.put(.75,-.6,1.30,5.60,1.10,.55,col.steel,{hard:true,gloss:.55,tag:'餐厅'});
        A.put(.75,-.6,1.30,5.60,.10,1.14,col.cream,{gloss:.35,tag:'餐厅'});
        for(let i=0;i<6;i++) A.cyl(.75,-3.0+i*1.0,1.24,.16,.10,col.white,{gloss:.3,tag:'餐厅'});
        for(let i=0;i<3;i++) litten(A.put(.75,-2.4+i*1.8,.30,.30,.10,1.85,col.orange,
          {hard:true,mode:1,glow:.24,tag:'餐厅'}),.5);
        for(let i=0;i<4;i++) A.put(.42,-3.2+i*1.9,.90,1.60,1.90,.95,col.steel,
          {hard:true,gloss:.48,tag:'餐厅'});
        A.stop(.3,1.1,-3.6,3.2);
        // Menu board over the pass, and a till by the door.
        // A backlit menu board, not a slab of charcoal. Unlit and 5.2 m wide it spanned the entire
        // shopfront and read from the concourse as a black void hanging over the dining room —
        // the darkest thing in the building, in the middle of the brightest wall. Every menu board
        // in every restaurant of this kind is a lit box, so this one is too: a warm panel behind,
        // a dark frame around it, and the prices sitting on light rather than in front of it.
        // Depth runs outward here: a larger `a` is nearer the concourse. The frame goes behind the
        // lit panel, not in front of it, or the frame is all anybody ever sees.
        A.put(.95,-.6,.10,5.20,1.34,2.55,col.trim,{hard:true,gloss:.26,tag:'菜单'});
        litten(A.put(1.01,-.6,.04,4.96,1.12,2.55,C('#f1dfbd'),
          {hard:true,mode:1,glow:.15,tag:'菜单'}),.55);
        ['牛肉面  22','麻婆豆腐  28','宫保鸡丁  32','米饭  3'].forEach((t,i)=>
          A.glyph(1.05,-2.6+(i%2)*3.0,2.95-((i/2)|0)*.52,t,
            {size:.19,gap:.05,color:i%2?C('#8d2f26'):col.trim,glow:.02,tag:'菜单'}));
        counter(A,2.0,3.4,2.4,.90,col.woodD);
        // Tables: four twos along the glass and two fours at the back.
        for(const b of [-3.2,-1.4,.4,2.2]) A.table(3.7,b,2,.44);
        A.table(2.6,-2.6,4,.56); A.table(2.6,.8,4,.56);
        for(let i=0;i<3;i++) litten(A.put(2.6,-3.4+i*3.0,.24,.24,.24,2.70,col.goldL,
          {hard:true,mode:1,glow:.22}),.6);
        A.th('餐厅',D+.35,0,'两位，靠窗可以吗？','Table for two — by the window?',
          '餐 meal + 厅 hall.',2.2,2.5);
        A.th('菜单',1.9,-.6,'菜单上有拼音。','The menu has pinyin on it.',
          '菜 dish + 单 list.',1.8,2.0);
      }});
    const KX=-12.0;
    const CX=KX+1.9, CZ=10.6;
    // Children's-court backdrop. This ground-floor stretch of the south wall has no tenant, and
    // was a white field from floor to ceiling behind the carousel. A low, warm feature wall and a
    // jade identity panel give the play zone an edge while stopping below the level-two slab.
    box(CX,1.78,RZ-.18,12.2,3.44,.20,C('#eadfce'),
      {hard:true,gloss:.13,tag:'儿童乐园',...MAT.plaster});
    box(CX,1.76,RZ-.305,6.70,2.72,.075,C('#285f62'),
      {hard:true,gloss:.20,tag:'儿童乐园'});
    for(let i=-8;i<=8;i++)
      box(CX+i*.36,1.75,RZ-.355,.055,2.56,.035,i%2?col.woodD:C('#b98c54'),
        {hard:true,gloss:.20,tag:'儿童乐园',...MAT.timber});
    litten(box(CX,3.19,RZ-.365,6.15,.055,.028,col.goldL,
      {hard:true,mode:1,glow:.075,tag:'儿童乐园'}),.22);
    glyphs(CX,2.34,RZ-.39,Math.PI,'童趣天地',
      {size:.33,gap:.11,color:col.white,mode:1,glow:.10,tag:'儿童乐园'});
    glyphs(CX,1.84,RZ-.39,Math.PI,'CHILDREN\'S COURT',
      {size:.105,gap:.036,color:col.goldL,mode:1,glow:.045,tag:'儿童乐园'});
    // Cloud-like coloured medallions keep the long wings from becoming blank leftovers.
    for(const s of [-1,1]) for(let i=0;i<4;i++)
      ball(CX+s*(4.15+i*.55),1.22+(i%2)*.48,RZ-.43,.20+(i%2)*.06,.20+(i%2)*.06,.07,
        [col.orange,col.pink,col.blueL,col.yellow][i],{mode:7,gloss:.12,tag:'儿童乐园'});
    ownPublicLight(B.light(CX,2.65,RZ-1.0,[1.00,.86,.66],.42,3.0),'decorative');

    // A ceiling rhythm over the play court and a calmer two-layer floor field. The old single
    // saturated blue rectangle made every loose toy look like it was floating on a pool.
    for(let i=-5;i<=5;i++) {
      // The carousel roof occupies the middle of the court; beams stop either side instead of
      // passing through its canopy.
      if(Math.abs(i*.92)<3.1) continue;
      box(CX+i*.92,3.70,11.25,.13,.10,5.55,i%2?col.woodD:C('#a98359'),
        {hard:true,gloss:.16,...MAT.timber});
    }
    flat(KX,.025,10.9,12.0,5.20,C('#789fa3'),{mode:7,gloss:.045,...MAT.cloth});
    cyl(CX,.046,CZ,3.34,.070,C('#b8cfca'),{mode:7,gloss:.055,...MAT.cloth});
    for(const s of [-1,1])
      box(KX+s*6.0,.055,10.9,.055,.030,5.18,col.goldL,{hard:true,gloss:.40});
    for(const [x,z,c] of [[KX-4.4,9.0,col.red],[KX-2.6,12.2,col.yellow],[KX-.4,9.0,col.jade],
                          [KX+4.6,12.4,col.orange],[KX+4.8,8.8,col.pink]]) {
      ball(x,.36,z,.46,.36,.46,c,{gloss:.12,tag:'儿童乐园'});
      capsule(x,.70,z,.07,.62,.07,col.steelD,{gloss:.44,tag:'儿童乐园'});
    }
    box(KX-4.6,.62,13.6,4.20,.20,.44,col.wood,{gloss:.20,tag:'儿童乐园'});
    // Carousel base: a dark plinth, warm deck and coloured drum are stacked concentrically, so the
    // horses belong to one machine instead of orbiting above a bare cream disc.
    cyl(CX,.14,CZ,2.80,.28,col.woodD,{gloss:.28,tag:'旋转木马',...MAT.timber});
    cyl(CX,.23,CZ,2.70,.32,C('#a84a3e'),{gloss:.24,tag:'旋转木马',...MAT.slab});
    cyl(CX,.36,CZ,2.52,.18,col.cream,{gloss:.28,tag:'旋转木马',...MAT.slab});
    cyl(CX,.77,CZ,.52,.92,C('#2f6f6c'),{gloss:.30,tag:'旋转木马'});
    cyl(CX,.40,CZ,.58,.12,col.gold,{gloss:.58,tag:'旋转木马'});
    cyl(CX,1.90,CZ,.18,3.48,col.gold,{gloss:.55,tag:'旋转木马',...MAT.metal});
    // Twelve quiet bulbs and inset panels articulate the rotating deck edge.
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      litten(ball(CX+Math.sin(a)*2.61,.43,CZ+Math.cos(a)*2.61,.055,.055,.055,col.goldL,
        {mode:1,glow:.12,tag:'旋转木马'}),.26);
      box(CX+Math.sin(a)*2.705,.23,CZ+Math.cos(a)*2.705,.34,.15,.055,
        i%2?C('#7d342e'):C('#315f61'),{ry:a,hard:true,gloss:.22,tag:'旋转木马'});
    }
    // Layered Chinese pavilion crown: a smaller roof, gold rim, pale soffit and scalloped valance.
    // Four of the valance panels carry 福, a motif rather than another flashing advertisement.
    taper(CX,3.20,CZ,5.18,.90,5.18,C('#a63d32'),{mode:7,tag:'旋转木马'});
    cyl(CX,2.96,CZ,2.66,.10,col.gold,{gloss:.56,tag:'旋转木马'});
    cyl(CX,2.925,CZ,2.50,.08,col.cream,{gloss:.24,tag:'旋转木马'});
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6, x=CX+Math.sin(a)*2.53, z=CZ+Math.cos(a)*2.53;
      box(x,2.91,z,1.22,.28,.10,i%2?C('#8f332d'):C('#c45143'),
        {ry:a,hard:true,gloss:.20,tag:'旋转木马'});
      if(i%3===0) glyphs(CX+Math.sin(a)*2.595,2.91,CZ+Math.cos(a)*2.595,a,'福',
        {size:.18,color:col.goldL,mode:1,glow:.055,tag:'旋转木马'});
    }
    taper(CX,3.48,CZ,.78,.28,.78,col.gold,{mode:7,gloss:.45,tag:'旋转木马'});
    ball(CX,3.64,CZ,.09,.09,.09,col.redD,{mode:7,gloss:.24,tag:'旋转木马'});
    for(let i=0;i<12;i++) {
      const p=litten(ball(CX+Math.sin(i*.524)*2.60,2.76,CZ+Math.cos(i*.524)*2.60,
        .075,.075,.075,col.goldL,{mode:1,glow:.36,tag:'旋转木马'}),.7);
      dynamicVisual(p); carouselBulbs.push({p,phase:i/12});
    }
    // Twelve bulbs round a canopy are a fairground light, so they are given one to cast: warm,
    // under the canopy, where it reaches the horses, the platform and the mat around it.
    ownPublicLight(B.light(CX,2.80,CZ,[1.00,0.90,0.66],.55,3.0),'decorative');
    // 旋转木马 is "revolving wooden horses", and there were no horses on it: each mount was a
    // rounded box with a ball stuck on the end, which from ten metres read as a coloured blob
    // going round. A horse is legs, a barrel, a neck that rises, a head at an angle and a tail —
    // and the legs are what sell it, because they are the part that says which way it is facing.
    //
    // Each part carries its offset in the mount's own frame: `f` outward along the radius (which
    // is the way these face), `l` across it, `u` up. The tick places them all through one path, so
    // a horse can have nine pieces without the animation knowing anything about horses.
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3, c=[col.white,col.cream,col.pink][i%3];
      const mane=tint(c,.62), tack=[col.redD,col.blue,col.jade][i%3];
      const mk=(f,u,l,sx,sy,sz,cc,o={})=>{
        const p=box(CX,1.0,CZ,sx,sy,sz,cc,{round:.06,mode:7,tag:'旋转木马',...o});
        boundMotion(p,CX,1.40,CZ,3.25);
        return {p,f,u,l,sx,sy,sz};
      };
      const parts=[
        mk(0,0,0,.40,.44,.98,c),                       // barrel
        mk(.30,.24,0,.30,.30,.46,c),                   // shoulder
        mk(.50,.44,0,.22,.40,.26,c),                   // neck, rising
        mk(.66,.62,0,.19,.19,.42,c),                   // head, reaching forward
        mk(.80,.60,0,.10,.10,.16,mane),                // muzzle
        mk(.44,.60,0,.10,.26,.20,mane),                // mane
        mk(-.50,.22,0,.12,.30,.16,mane),               // tail
        mk(0,.28,0,.34,.10,.40,tack),                  // saddle
        mk(.30,-.36,.15,.09,.44,.09,c), mk(.30,-.36,-.15,.09,.44,.09,c),   // forelegs
        mk(-.32,-.36,.15,.09,.44,.09,c), mk(-.32,-.36,-.15,.09,.44,.09,c), // hind legs
      ];
      const pole=capsule(CX,1.60,CZ,.03,1.90,.03,col.gold,{gloss:.65,tag:'旋转木马'});
      boundMotion(pole,CX,1.80,CZ,3.25);
      carousel.push({parts,
                     pole,
                     a,r:1.95,cx:CX,cz:CZ});
    }
    solid(CX-2.8,CX+2.8,CZ-2.8,CZ+2.8);
    solid(KX-6.2,KX-3.6,13.3,RZ);
    thing('儿童乐园',KX-3.6,1.45,10.2,'孩子们在儿童乐园玩。','The children are playing in the play area.',
      '儿童 children + 乐园 playground.',{focus:[KX-3.6,7.6],reach:2.4});
    thing('旋转木马',CX,2.55,CZ,'旋转木马转起来了。','The carousel is going round.',
      '旋转 to spin + 木马 wooden horse.',{focus:[CX,CZ-3.3],reach:2.6});
  }

  // ---------------------------------------------------------------- level two
  function buildSecond() {
    const y=DECK[2];
    shop('W',-6.0,10.0,{kind:'美妆店',floor:2,name:'云裳美妆',brand:'YUNSHANG BEAUTY',accent:col.pink,
      carpet:col.carpet,fit(A){
        // Lit mirrors along the back and two islands of testers.
        for(let i=0;i<3;i++) {
          A.put(.45,-3.2+i*3.2,.08,1.60,1.90,1.62,col.glass,{hard:true,mode:1,alpha:.66,gloss:.92,tag:'镜子'});
          litten(A.put(.52,-3.2+i*3.2,.03,1.40,1.70,1.62,col.white,{hard:true,mode:1,glow:.14,tag:'镜子'}),.4);
          A.put(.95,-3.2+i*3.2,.60,1.70,.10,.98,col.white,{gloss:.3,tag:'口红'});
          A.stop(.6,1.3,-3.9+i*3.2,-2.5+i*3.2);
        }
        for(let i=0;i<14;i++) {
          A.cyl(.95,-4.0+i*.62,1.16,.028,.16,i%2?col.red:col.pink,{gloss:.55,tag:'口红'});
          A.cyl(.95,-4.0+i*.62,1.29,.031,.10,col.goldL,{gloss:.7,tag:'口红'});
        }
        counter(A,2.6,-2.8,3.4,.95,col.white);
        for(let i=0;i<8;i++) GOODS.bottle(A,2.6,-4.2+i*.42,.98,
          [col.goldL,col.blueL,col.pink,col.cream][i%4]);
        A.put(3.6,2.6,1.30,2.60,.95,.48,col.pink,{gloss:.3,tag:'香水'});
        A.stop(3.0,4.2,1.3,3.9);
        A.th('美妆店',D+.35,0,'这个颜色适合我吗？','Does this colour suit me?','美妆 beauty + 店 shop.',2.2,2.5);
        A.th('镜子',1.6,0,'镜子旁边的灯很亮。','The lights around the mirror are very bright.',
          '照镜子 means to look in a mirror.',1.7,1.5);
        A.th('口红',1.7,-3.2,'这里有很多口红可以试。','There are lots of lipsticks to try here.',
          '口 mouth + 红 red.',1.7,1.2);
        A.th('香水',3.3,-2.8,'先闻一下这瓶香水。','Smell this perfume first.','香 fragrant + 水 water.',1.7,1.3);
      }});
    shop('W',6.4,10.0,{kind:'书店',floor:2,name:'墨香书店',brand:'MOXIANG BOOKS',accent:col.blue,
      carpet:col.carpetB,fit(A){
        shelfWall(A,.55,-2.6,4.4,5,6,[col.red,col.blue,col.jade,col.gold,col.cream],'书',2.30,'book');
        shelfWall(A,.55,2.8,4.0,5,5,[col.violet,col.cream,col.blue,col.red],'杂志',2.30,'book');
        // Free-standing stacks, and a reading corner with a coffee counter.
        for(const b of [-3.0,-.6,1.8]) {
          A.put(2.4,b,1.00,1.80,.90,.46,col.wood,{gloss:.24,tag:'书'});
          for(let i=0;i<3;i++) GOODS.stack(A,2.4,b-.55+i*.55,.90,
            [col.blue,col.red,col.jade][i]);
          A.stop(1.9,2.9,b-.95,b+.95);
        }
        counter(A,3.9,3.6,2.4,.85,col.charcoal);
        A.cyl(3.9,3.0,1.14,.13,.22,col.white,{gloss:.3,tag:'咖啡'});
        for(const b of [-3.4,-1.0]) { table(...A.at(3.9,b),A.y0,'书店',3,.42); A.stop(3.3,4.5,b-1.0,b+1.0); }
        A.th('书店',D+.35,0,'书店里很安静。','It is quiet inside the bookshop.','书 book + 店 shop.',2.2,2.5);
        A.th('书',1.5,-2.6,'先读几页再决定。','Read a few pages before deciding.','书 means book.',1.7,1.4);
        A.th('杂志',1.5,2.8,'新杂志刚刚送到。','The new magazines just arrived.','杂 mixed + 志 record.',1.7,1.4);
        A.th('咖啡',3.9,2.4,'书店里也能买咖啡。','The bookshop also sells coffee.','咖啡 is a loan word.',1.6,1.3);
      }});
    shop('E',-6.0,10.0,{kind:'运动店',floor:2,name:'腾跃运动',brand:'TENGYUE SPORT',accent:col.red,
      carpet:col.carpetB,fit(A){
        for(let r=0;r<4;r++) for(let i=0;i<8;i++)
          A.put(.50,-3.4+i*.98,.42,.30,.22,.80+r*.52,
            [col.red,col.blue,col.white,col.goldL][(i+r)%4],{round:.07,mode:7,tag:'运动鞋'});
        A.stop(.4,.8,-4.0,4.0);
        for(let i=0;i<6;i++) A.ball(1.9,-3.6+i*.52,.20,.20,.20,.20,
          [col.orange,col.blue,col.red][i%3],{gloss:.14,tag:'篮球'});
        A.put(1.9,-3.6,1.30,3.40,.20,.10,col.wood,{gloss:.2,tag:'篮球'});
        // Two treadmills facing the window, which is where a real shop puts them.
        for(const b of [1.4,3.0]) {
          A.put(2.6,b,1.50,.86,.14,.30,col.charcoal,{round:.10,gloss:.18,tag:'跑步机'});
          A.put(2.6,b,1.26,.70,.06,.48,col.black,{hard:true,gloss:.12,tag:'跑步机'});
          for(const s of [-1,1]) A.cap(3.2,b+s*.36,1.03,.035,.96,.035,col.steelD,
            {rz:-.18,gloss:.55,tag:'跑步机'});
          litten(A.put(3.4,b,.06,.58,.32,1.40,col.screen,{hard:true,mode:1,glow:.2,tag:'跑步机'}),.35);
          A.stop(2.1,3.5,b-.6,b+.6);
        }
        counter(A,4.0,-3.0,2.6,.85,col.charcoal);
        A.th('运动店',D+.35,0,'运动鞋正在打折。','The trainers are on sale.','运动 sport + 店 shop.',2.2,2.5);
        A.th('运动鞋',1.2,0,'可以试穿新款运动鞋。','You can try the new trainers.','运动鞋 are sports shoes.',1.7,1.4);
        A.th('篮球',2.5,-3.6,'这个篮球手感不错。','This basketball has a good feel.','篮 basket + 球 ball.',1.6,1.0);
        A.th('跑步机',1.9,2.2,'可以在跑步机上试跑。','You can test the treadmill.','跑步 running + 机 machine.',1.8,1.3);
      }});
    shop('E',6.4,10.0,{kind:'家居店',floor:2,name:'原木家居',brand:'ORIGIN HOME',accent:col.wood,
      carpet:col.carpet,fit(A){
        // A room set: sofa, rug, lamp, low table — the way a furniture shop actually shows things.
        const [rx,rz]=A.at(2.4,-2.4);
        flat(rx,A.y0+.03,rz,3.0,3.0,col.carpetB,{mode:7,gloss:.05,...MAT.cloth});
        A.put(1.5,-2.4,.86,2.20,.44,.52,col.fabric,{round:.18,mode:7,tag:'沙发'});
        A.put(1.15,-2.4,.22,2.20,.66,.92,col.fabric,{round:.16,mode:7,tag:'沙发'});
        for(const s of [-1,1]) A.put(1.5,-2.4+s*1.05,.86,.18,.46,.72,col.woodD,{round:.08,tag:'沙发'});
        A.put(3.1,-2.4,.90,1.30,.12,.44,col.wood,{gloss:.26,tag:'家具'});
        A.cap(1.4,-.9,.94,.035,.88,.035,col.steelD,{gloss:.52,tag:'台灯'});
        litten(A.taper(1.4,-.9,1.44,.36,.40,.20,col.cream,{mode:1,glow:.18,tag:'台灯'}),.45);
        A.stop(1.0,3.4,-3.6,-1.2);
        // Shelving, a dining set and a material table.
        shelfWall(A,.55,2.6,4.6,4,5,[col.wood,col.cream,col.jade,col.fabric],'家具',2.30,'box');
        table(...A.at(2.6,2.6),A.y0,'家具',4,.56); A.stop(2.0,3.2,1.8,3.4);
        counter(A,4.0,-4.0,2.4,.85,col.woodD);
        A.put(3.9,.4,1.20,1.20,.12,.78,col.wood,{gloss:.24,tag:'家具'});
        for(let i=0;i<5;i++) A.put(3.9,.4,.14,.22,.24,.94+i*.0,
          [col.wood,col.woodD,col.cream,col.fabric,col.jade][i],{mode:7,tag:'家具'});
        A.th('家居店',D+.35,0,'里面有很舒服的沙发。','There are very comfortable sofas inside.',
          '家居 home living + 店 shop.',2.2,2.5);
        A.th('沙发',2.6,-2.4,'坐一下试试软不软。','Sit down and see how soft it is.','沙发 is another loan word.',1.7,1.2);
        A.th('台灯',2.2,-.9,'这盏台灯有三种亮度。','This desk lamp has three brightness settings.',
          '台 table + 灯 lamp.',1.5,1.3);
        A.th('家具',1.5,2.6,'可以比较不同的木料。','You can compare the different wood samples.',
          '家 home + 具 implement.',1.7,1.3);
      }});
    shop('N',-11.0,9.0,{kind:'玩具店',floor:2,name:'欢乐玩具',brand:'HAPPY TOYS',accent:col.yellow,
      carpet:col.carpetG,fit(A){
        shelfWall(A,.55,0,7.0,4,8,[col.red,col.blue,col.jade,col.yellow,col.violet,col.orange],'玩具',2.30,'plush');
        for(const b of [-2.4,0,2.4]) {
          A.put(2.3,b,1.20,1.60,.80,.41,col.wood,{gloss:.22,tag:'玩具'});
          for(let i=0;i<4;i++) {
            if(i%2) GOODS.plush(A,2.3,b-.6+i*.4,.88,[col.pink,col.goldL,col.blueL][i%3]);
            else GOODS.box(A,2.3,b-.6+i*.4,.88,[col.red,col.blue,col.jade,col.yellow][i]);
          }
          A.stop(1.7,2.9,b-.9,b+.9);
        }
        counter(A,3.9,-3.2,2.6,.85,col.yellow);
        A.th('玩具店',D+.35,0,'小朋友都不想走。','None of the children want to leave.',
          '玩具 toy + 店 shop.',2.2,2.5);
        A.th('玩具',1.5,0,'这个玩具会唱歌。','This toy sings.','玩 play + 具 implement.',1.7,1.3);
      }});
    shop('S',6.0,9.0,{kind:'甜品店',floor:2,name:'半糖甜品',brand:'HALF SUGAR DESSERT',accent:col.pink,
      carpet:col.cream,fit(A){
        counter(A,1.5,-2.0,4.4,1.00,col.white);
        litten(A.put(1.5,-2.0,.06,4.20,.60,1.42,col.glass,{hard:true,mode:1,alpha:.4,gloss:.9,tag:'甜品'}),.3);
        for(let i=0;i<10;i++) {
          const c=[col.pink,col.cream,col.yellow,col.jadeL][i%4];
          A.cyl(1.5,-3.9+i*.42,1.06,.115,.11,c,{gloss:.28,tag:'甜品'});
          A.cyl(1.5,-3.9+i*.42,1.13,.118,.03,col.cream,{gloss:.35,tag:'甜品'});
          A.ball(1.5,-3.9+i*.42,1.17,.035,.035,.035,col.red,{mode:7,tag:'甜品'});
        }
        shelfWall(A,.55,2.6,3.4,3,4,[col.pink,col.cream,col.yellow],'甜品',2.30,'cup');
        for(const b of [-3.0,-.4,2.2]) { table(...A.at(3.6,b),A.y0,'甜品店',3,.44); A.stop(3.0,4.2,b-1.0,b+1.0); }
        A.th('甜品店',D+.35,0,'这家的芒果班戟很有名。','Their mango pancakes are famous.',
          '甜 sweet + 品 item.',2.2,2.5);
        A.th('甜品',2.4,-2.0,'甜品吃一半就够了。','Half a dessert is plenty.','甜品 is a dessert.',1.7,1.3);
      }});

    // ---- the second floor's own architectural identity.
    // The tenant fit-outs are deliberately individual; the shared gallery between them needs to
    // be the opposite.  Muted jade, ink and aged brass repeat in the floor, rail glass, soffit and
    // wayfinding so this deck reads as one curated retail level from across the void.  Everything
    // below is either flush with a surface, fixed overhead, or inside an existing bench footprint:
    // no new blockUp() call is needed and the saved circulation / escalator routes stay identical.
    const L2={
      ink:C('#293b3d'), jade:C('#4f8f86'), jadeL:C('#9fc8bd'), mist:C('#d9e3dd'),
      rose:C('#a96f7f'), brass:C('#a88d55'), rug:C('#7b8e88'), ivory:C('#eee8da')
    };

    // A bridge runner gives the crossing a beginning and an end; the broken perimeter line beside
    // the glass makes the rectangular void legible without painting over a landing or shop floor.
    flat(0,y+.021,0,13.55,2.70,L2.mist,{mode:0,gloss:.30,glow:.035,...MAT.stone});
    for(const z of [-1.42,1.42])
      flat(0,y+.026,z,13.78,.075,L2.jade,{mode:1,gloss:.38,glow:.035});
    for(const x of [-5.4,-2.7,0,2.7,5.4])
      flat(x,y+.028,0,.045,2.54,L2.brass,{mode:1,gloss:.46,glow:.02});
    for(const s of [-1,1]) {
      for(const z of [-6.72,6.72]) {
        flat(s*(VX+.43),y+.022,z,.14,5.12,L2.jade,{mode:1,gloss:.34,glow:.025});
        flat(s*(VX+.56),y+.024,z,.035,5.12,L2.brass,{mode:1,gloss:.44,glow:.018});
      }
      flat(0,y+.022,s*(VZ+.44),14.72,.14,L2.jade,{mode:1,gloss:.34,glow:.025});
      flat(0,y+.024,s*(VZ+.57),14.72,.035,L2.brass,{mode:1,gloss:.44,glow:.018});
    }

    // A jade safety datum on the level-two glass.  It follows the same cuts as railRun(), so the
    // escalator openings stay visually open rather than acquiring a stripe across thin air.
    const railStripeZ=(x,a,b)=>box(x,y+.67,(a+b)/2,.028,.055,b-a,L2.jadeL,
      {hard:true,mode:1,alpha:.62,glow:.035,tag:'栏杆'});
    const railStripeX=(z,a,b)=>box((a+b)/2,y+.67,z,b-a,.055,.028,L2.jadeL,
      {hard:true,mode:1,alpha:.62,glow:.035,tag:'栏杆'});
    for(const s of [-1,1]) {
      railStripeZ(s*VX,-VZ,-3.98); railStripeZ(s*VX,3.98,VZ);
    }
    railStripeX(-VZ,-VX,VX); railStripeX(VZ,-VX,VX);
    railStripeX(-3.95,-VX,BANKS.a.xUp-.72);
    railStripeX(-3.95,BANKS.a.xDn+.72,VX);
    railStripeX( 3.95,-VX,BANKS.b.xUp-.72);
    railStripeX( 3.95,BANKS.b.xDn+.72,VX);

    // The underside of level three is the ceiling and fascia of level two.  These slim editorial
    // panels turn the blank band caught by the bridge camera into useful level identity, and they
    // are lettered on the face that actually looks into the void.
    const fasciaPanelZ=(z,face,title,sub,accent)=>{
      box(0,y+3.46,z,6.80,.43,.035,L2.ink,{hard:true,gloss:.26});
      const zz=z+face*.025, yaw=face>0?0:Math.PI;
      glyphs(0,y+3.52,zz,yaw,title,{size:.19,gap:.055,color:L2.ivory,mode:1,glow:.09});
      glyphs(0,y+3.30,zz,yaw,sub,{size:.075,gap:.028,color:L2.jadeL,mode:1,glow:.055});
      box(0,y+3.225,zz,6.15,.026,.018,accent,{hard:true,mode:1,glow:.065});
    };
    fasciaPanelZ(-VZ+.075, 1,'二楼 · 生活美学','TOYS  BOOKS  BEAUTY',L2.rose);
    fasciaPanelZ( VZ-.075,-1,'二楼 · 新品艺廊','SPORT  HOME  DESSERT',L2.jade);
    const fasciaPanelX=(x,face,z,title,accent)=>{
      box(x,y+3.46,z,.035,.43,2.45,L2.ink,{hard:true,gloss:.26});
      const xx=x+face*.025, yaw=face>0?Math.PI/2:-Math.PI/2;
      glyphs(xx,y+3.48,z,yaw,title,{size:.17,gap:.055,color:L2.ivory,mode:1,glow:.085});
      box(xx,y+3.225,z,.018,.026,2.05,accent,{hard:true,mode:1,glow:.06});
    };
    fasciaPanelX(-VX+.075, 1, 6.55,'设计精选',L2.rose);
    fasciaPanelX( VX-.075,-1,-6.55,'本季新品',L2.jade);

    // A light canopy repeats across the bridge.  It stays just below the existing level-three
    // soffit, leaving more than three metres of headroom, and frames one two-sided hanging marker
    // that can be read from either retail wing.
    for(const x of [-6,-3,0,3,6]) {
      box(x,y+3.59,0,.10,.12,6.35,L2.ink,{hard:true,gloss:.28,...MAT.metal});
      litten(box(x,y+3.505,0,.052,.025,5.80,col.warm,
        {hard:true,mode:1,glow:.105}),.28);
      for(const z of [-1.65,1.65])
        litten(cyl(x,y+3.47,z,.105,.035,col.warm,{mode:1,glow:.16}),.30);
    }
    for(const z of [-1.05,1.05])
      capsule(0,y+3.43,z,.018,.48,.018,col.steelD,{gloss:.50,...MAT.metal});
    box(0,y+2.94,0,.10,.56,2.76,L2.ink,{hard:true,gloss:.30});
    for(const face of [-1,1]) {
      const xx=face*.064, yaw=face>0?Math.PI/2:-Math.PI/2;
      glyphs(xx,y+3.03,0,yaw,'二楼 · 生活艺廊',
        {size:.175,gap:.05,color:L2.ivory,mode:1,glow:.10});
      glyphs(xx,y+2.79,0,yaw,'CURATED LIVING',
        {size:.075,gap:.025,color:L2.jadeL,mode:1,glow:.06});
      box(xx,y+2.67,0,.018,.026,2.34,L2.brass,{hard:true,mode:1,glow:.06});
    }

    // The 2.4 m service gaps between the paired west/east tenants used to terminate in blank
    // plaster.  A wall-mounted level marker turns each into a useful visual pause while leaving
    // the entire recess walkable and keeping both shop doorways exactly as built.
    const gapMarker=(x,face,title,accent)=>{
      box(x,y+1.78,.20,.055,3.02,1.70,L2.ink,{hard:true,gloss:.22,...MAT.plaster});
      const xx=x+face*.035, yaw=face>0?Math.PI/2:-Math.PI/2;
      box(xx,y+1.78,.20,.018,2.70,1.42,C('#354b4d'),{hard:true,gloss:.18});
      glyphs(xx,y+2.17,.20,yaw,'2F',{size:.40,gap:.08,color:col.goldL,mode:1,glow:.13});
      glyphs(xx,y+1.66,.20,yaw,title,{size:.135,gap:.045,color:L2.ivory,mode:1,glow:.075});
      for(const z of [-.55,0,.55])
        box(xx,y+1.25,z+.20,.018,.10,.28,z?L2.jadeL:accent,
          {hard:true,mode:1,glow:.045});
    };
    gapMarker(-RX+.075, 1,'阅读 · 美妆',L2.rose);
    gapMarker( RX-.075,-1,'运动 · 家居',L2.jade);

    // Upholstery, a narrow rug inlay and an illuminated seat-edge convert the existing benches
    // into small lounge nodes.  The old 1.02 x 1.98 m full cloth face sat only 6 mm below the
    // contact shadow and read as a pale translucent sheet under the seat.  Four 55 mm strips keep
    // the exact same outer footprint but leave the broad centre on the stable deck finish; the
    // end strips span the full width and the side strips stop between them, so no faces overlap.
    // All additions remain inside bench()'s returned footprint, so its long-lived collision
    // rectangle is still the exact navigation contract.
    const l2Bench=(x,z,along,flip,accent)=>{
      const ew=along==='z', bk=flip?-.25:.25, front=-bk;
      const rw=ew?1.02:1.98, rd=ew?1.98:1.02, re=.055;
      for(const dz of [-1,1])
        flat(x,y+.024,z+dz*(rd*.5-re*.5),rw,re,L2.rug,
          {mode:7,gloss:.045,...MAT.cloth});
      for(const sx of [-1,1])
        flat(x+sx*(rw*.5-re*.5),y+.024,z,re,rd-re*2,L2.rug,
          {mode:7,gloss:.045,...MAT.cloth});
      const bd=bench(x,z,along,y,'休息区',flip);
      for(const s of [-1,1]) {
        if(ew) box(x+bk*.74,y+.70,z+s*.36,.12,.28,.34,s>0?accent:L2.ivory,
          {round:.06,mode:7,gloss:.05,tag:'休息区',...MAT.cloth});
        else box(x+s*.36,y+.70,z+bk*.74,.34,.28,.12,s>0?accent:L2.ivory,
          {round:.06,mode:7,gloss:.05,tag:'休息区',...MAT.cloth});
      }
      if(ew) box(x+front*.29,y+.50,z,.025,.045,1.18,accent,
        {hard:true,mode:1,glow:.045,tag:'休息区'});
      else box(x,y+.50,z+front*.29,1.18,.045,.025,accent,
        {hard:true,mode:1,glow:.045,tag:'休息区'});
      return bd;
    };

    // The bridge: seats, planters and the best view in the building.
    for(const s of [-1,1]) {
      const b=l2Bench(s*4.6,0,'z',s<0,s<0?L2.rose:L2.jadeL);
      blockUp(2,b[0],b[1],b[2],b[3]);
      const p=planter(s*6.2,-2.6,.74,y); blockUp(2,p[0],p[1],p[2],p[3]);
      const q=planter(s*6.2,2.6,.74,y); blockUp(2,q[0],q[1],q[2],q[3]);
    }
    // And the rest of the gallery, which had nothing on it at all. Floor one carries eight benches
    // and twelve planters; this deck had two benches and four planters, both on the bridge, so the
    // whole ring between the shops and the void read as an empty white corridor — the one place in
    // the building where you can see the greatest length of floor at once, and nothing standing on
    // any of it. Seats face the void, because that is what there is to look at from up here.
    for(const [x,z,al] of [[-VX-1.7,-5.0,'z'],[-VX-1.7,4.4,'z'],[VX+1.7,-5.0,'z'],[VX+1.7,4.4,'z'],
                           [-4.2,-VZ-1.8,'x'],[4.2,-VZ-1.8,'x'],[-4.2,VZ+1.8,'x'],[4.2,VZ+1.8,'x']]) {
      // The void is the middle, so "facing it" is +x on the west run and +z on the south run, and
      // both of those are the flipped back. Four of these eight used to look at a shopfront wall.
      const flip=al==='z'?x<0:z<0;
      const accent=((Math.round(Math.abs(x+z)*10))%2)?L2.rose:L2.jadeL;
      const b=l2Bench(x,z,al,flip,accent); blockUp(2,b[0],b[1],b[2],b[3]);
    }
    publicClutter(-4.60,  .28,y+.60,'phone',0,2);
    publicClutter( 4.58, -.35,y+.03,'bag',0,2);
    publicClutter(-VX-1.72,-5.25,y+.03,'parcel',0,2);
    for(const [x,z,tr] of [[-VX-1.9,-.4,2],[VX+1.9,-.4,2],[-VX-1.9,8.2,0],[VX+1.9,8.2,0],
                           [-8.6,-VZ-1.9,0],[8.6,-VZ-1.9,0],[-8.6,VZ+1.9,1],[8.6,VZ+1.9,1]]) {
      const p=tr===2?lowPlanter(x,z,.78,y):planter(x,z,.78,y,!!tr);
      blockUp(2,p[0],p[1],p[2],p[3]);
    }
    const br=thing('天桥',0,y+1.25,-2.4,'从天桥上能看见整个中庭。','You can see the whole atrium from the bridge.',
      '天 sky + 桥 bridge.',{focus:[0,-1.4],reach:2.3});
    br.mallFloor=2;
    const two=thing('二楼',-VX-1.6,y+1.40,0,'二楼是一整圈商店。','The second floor is a whole ring of shops.',
      '二楼 means the second floor.',{focus:[-VX-2.4,0],reach:2.3});
    two.mallFloor=2;
    for(const [x,z,front,back,c] of [
      [-VX-2.4,-12.0,'美妆 · 书店','美妆 · 书店',col.pink],
      [ VX+2.4,-12.0,'运动 · 家居','运动 · 家居',col.red],
      [-VX-2.4, 12.0,'玩具 · 甜品','玩具 · 甜品',col.yellow],
      [ VX+2.4, 12.0,'洗手间 ← · 电梯 →','电梯 ← · 洗手间 →',col.jade],
    ]) {
      for(const sx of [-1,1])
        capsule(x+sx*1.22,y+3.55,z,.014,.34,.014,col.steelD,{gloss:.50,...MAT.metal});
      box(x,y+3.15,z,3.2,.64,.10,col.charcoal,{hard:true,gloss:.26});
      // Both faces are real viewing directions.  The old glyph sat on the north side but faced
      // south, embedded behind its own panel; from the approach used by the toy-store camera the
      // board was a featureless black crop.  Put each legend on the face whose normal it follows.
      glyphs(x,y+3.15,z+.061,0,front,{size:.20,gap:.05,color:col.white,mode:1,glow:.08});
      glyphs(x,y+3.15,z-.061,Math.PI,back,{size:.20,gap:.05,color:col.white,mode:1,glow:.08});
      litten(box(x,y+2.78,z,3.0,.06,.05,c,{hard:true,mode:1,glow:.26}),.5);
    }

    // The two escalator banks meet this floor at opposite ends. These compact, two-sided blades
    // say which way each flight goes before somebody steps onto the wrong lane.
    for(const [x,z,label,accent] of [
      [BANKS.a.xDn+1.45,BANKS.a.zTop+.70,'1F ↓',L2.rose],
      [BANKS.b.xUp-1.45,BANKS.b.zBot-.70,'3F ↑',L2.jadeL],
    ]) {
      box(x,y+2.12,z,1.34,.50,.08,L2.ink,{hard:true,gloss:.26,tag:'扶梯'});
      litten(box(x,y+1.84,z,1.18,.035,.06,accent,
        {hard:true,mode:1,glow:.075,tag:'扶梯'}),.20);
      for(const [oz,yaw] of [[-.05,Math.PI],[.05,0]])
        glyphs(x,y+2.13,z+oz,yaw,label,
          {size:.20,gap:.055,color:L2.ivory,mode:1,glow:.085,tag:'扶梯'});
    }
    // Hanging banners over the gallery, suspended from the underside of the deck above. The ground
    // floor has two big ones over the atrium; without something equivalent up here the upper gallery
    // reads as a bare corridor with nothing overhead, which is the one thing every real mall deck is
    // not. Smaller than the atrium banners (the deck ceiling is lower) and pitched toward the void
    // so they are seen from across the floor, not just from directly underneath.
    const HB2=DECK[3]-.85;
    for(const [x,z,t,c] of [[-VX,-6,'新品上市',col.pink],[VX,6,'会员八折',col.blue]]) {
      const bn=box(x,HB2,z,2.40,1.70,.06,c,{hard:true,mode:7});
      dynamicVisual(bn); flags.push({p:bn,x,y:HB2,z,w:2.40,h:1.70,phase:x});
      for(const [oz,yaw] of [[-.06,Math.PI],[.06,0]]) {
        glyphs(x,HB2+.34,z+oz,yaw,t,{size:.22,gap:.06,color:col.goldL,mode:1,glow:.12});
        glyphs(x,HB2-.42,z+oz,yaw,'新天地',{size:.16,gap:.05,color:col.white,mode:1,glow:.08});
      }
    }
  }

  // ---------------------------------------------------------------- level three
  function buildThird() {
    const y=DECK[3];
    // The top floor is a destination rather than another retail ring.  Its common palette is the
    // restrained Beijing one used by good contemporary hospitality interiors: dark ink, walnut,
    // oxblood lacquer, brushed brass and celadon.  Tenant neon and stall colours remain local
    // accents; these are the calm architectural surfaces that let food, film and games coexist.
    const L3={
      ink:C('#242528'), ink2:C('#303236'), lacquer:C('#72272a'), lacquerL:C('#973438'),
      walnut:C('#725237'), walnutD:C('#4d392c'), brass:C('#b88b48'), brassL:C('#dec17f'),
      celadon:C('#86a79a'), celadonD:C('#496f65'), ivory:C('#f0e7d7'),
      plum:C('#4a303d'), arcade:C('#27364b'), rug:C('#c9bca6'),
    };

    // ---- arrival from the upper escalator.  The landing previously ended in the same pale slab as
    // every other deck, so arriving on 3F gave no clue that this was the entertainment floor. A
    // stone medallion, a double-sided suspended marker and a slim directory make the moment legible
    // from the moving tread, while keeping the entire saved landing and both comb plates untouched.
    // The two larger colours are real borders, not full opaque quads hidden under the next one.
    // This removes broad 4 mm overlaps while preserving the medallion's exact outer silhouette.
    for(const sx of [-1,1])
      flat(4.0+sx*2.6125,y+.026,10.58,.225,1.72,L3.rug,
        {mode:0,gloss:.32,tag:'三楼导视',...MAT.slab});
    for(const sz of [-1,1])
      flat(4.0,y+.026,10.58+sz*.765,5.00,.19,L3.rug,
        {mode:0,gloss:.32,tag:'三楼导视',...MAT.slab});
    for(const sx of [-1,1])
      flat(4.0+sx*2.39,y+.030,10.58,.22,1.34,L3.ink,
        {mode:0,gloss:.27,tag:'三楼导视',...MAT.slab});
    for(const sz of [-1,1])
      flat(4.0,y+.030,10.58+sz*.59,4.56,.16,L3.ink,
        {mode:0,gloss:.27,tag:'三楼导视',...MAT.slab});
    flat(4.0,y+.034,10.58,4.56,1.02,L3.lacquer,{mode:0,gloss:.30,tag:'三楼导视',...MAT.slab});
    for(const x of [2.10,2.65,5.35,5.90])
      box(x,y+.041,10.58,.055,.016,.82,L3.brass,{hard:true,mode:1,glow:.025,tag:'三楼导视'});

    const AY=y+4.29, AZ=9.72, AX=4.0, AW=5.35;
    box(AX,AY,AZ,AW,.92,.12,L3.ink,{hard:true,gloss:.24,tag:'三楼导视'});
    box(AX,AY+.43,AZ-.068,AW-.18,.035,.025,L3.brass,{hard:true,mode:1,glow:.045,tag:'三楼导视'});
    box(AX,AY-.43,AZ-.068,AW-.18,.035,.025,L3.brass,{hard:true,mode:1,glow:.045,tag:'三楼导视'});
    for(const sx of [-1,1]) {
      capsule(AX+sx*(AW/2-.38),(AY+.46+H)/2,AZ,.016,H-AY-.46,.016,col.steelD,
        {gloss:.50,tag:'三楼导视'});
      box(AX+sx*(AW/2-.34),AY,AZ-.075,.34,.62,.025,sx<0?L3.lacquerL:L3.celadonD,
        {hard:true,mode:1,glow:.045,tag:'三楼导视'});
    }
    for(const [oz,yaw] of [[-.075,Math.PI],[.075,0]]) {
      glyphs(AX,AY+.14,AZ+oz,yaw,'三楼 · 食 · 影 · 玩',
        {size:.225,gap:.070,color:L3.ivory,mode:1,glow:.075,tag:'三楼导视'});
      glyphs(AX,AY-.20,AZ+oz,yaw,'EAT  ·  FILM  ·  PLAY',
        {size:.082,gap:.026,color:L3.brassL,mode:1,glow:.040,tag:'三楼导视'});
    }

    // A directory on the inside edge of the east ring, clear of the landing route.  Its narrow
    // section is deliberate: from the escalator it reads as a vertical seal, from either side it
    // carries actual directions, and it never becomes another black wall in a long camera view.
    const DX=8.36, DZ=10.68;
    box(DX,y+1.52,DZ,.24,3.04,1.44,L3.ink,{hard:true,gloss:.25,tag:'三楼导视'});
    box(DX-.14,y+1.52,DZ,.035,2.82,1.23,L3.lacquer,{hard:true,mode:1,glow:.035,tag:'三楼导视'});
    box(DX+.14,y+1.52,DZ,.035,2.82,1.23,L3.celadonD,{hard:true,mode:1,glow:.035,tag:'三楼导视'});
    for(const [xx,yaw] of [[DX-.165,-Math.PI/2],[DX+.165,Math.PI/2]]) {
      glyphs(xx,y+2.47,DZ,yaw,'3F',{size:.34,gap:.08,color:L3.brassL,mode:1,glow:.10,tag:'三楼导视'});
      glyphs(xx,y+1.83,DZ,yaw,'美食 →',{size:.145,gap:.045,color:L3.ivory,mode:1,glow:.045,tag:'三楼导视'});
      glyphs(xx,y+1.47,DZ,yaw,'电影 ←',{size:.145,gap:.045,color:L3.ivory,mode:1,glow:.045,tag:'三楼导视'});
      glyphs(xx,y+1.11,DZ,yaw,'游戏 ↑',{size:.145,gap:.045,color:L3.ivory,mode:1,glow:.045,tag:'三楼导视'});
    }
    blockUp(3,DX-.22,DX+.22,DZ-.78,DZ+.78);

    // ---- a ceiling hierarchy.  A walnut-and-brass lattice gives the glass bridge a top and a
    // human scale; repeated cross-beams over the food hall turn its twenty-five-metre run into five
    // dining bays.  The lines emit only a hair of warm light—large glowing planes are intentionally
    // avoided—while the existing pendants continue to light individual tables.
    for(const z of [-1.54,1.54]) {
      box(0,y+4.72,z,12.90,.11,.13,L3.walnutD,{hard:true,gloss:.22,tag:'三楼顶棚',...MAT.timber});
      litten(box(0,y+4.645,z,12.35,.026,.035,L3.brassL,
        {hard:true,mode:1,glow:.040,tag:'三楼顶棚'}),.10);
    }
    for(const x of [-5.6,-2.8,0,2.8,5.6])
      box(x,y+4.72,0,.10,.11,3.18,L3.walnut,{hard:true,gloss:.22,tag:'三楼顶棚',...MAT.timber});

    for(const z of [-10,-5,0,5,10]) {
      box(15.25,y+4.75,z,12.80,.12,.16,L3.walnutD,{hard:true,gloss:.22,tag:'美食广场',...MAT.timber});
      litten(box(15.25,y+4.67,z,10.90,.025,.040,L3.brassL,
        {hard:true,mode:1,glow:.040,tag:'美食广场'}),.10);
    }
    for(const x of [9.10,15.25,20.65])
      box(x,y+4.77,0,.13,.10,24.60,x===15.25?L3.walnut:L3.ink2,
        {hard:true,gloss:.22,tag:'美食广场',...MAT.timber});

    // The food-hall threshold is visible square-on from the bridge.  It is a shallow overhead blade,
    // not a pair of posts across the entrance, so the rail gap, tables and circulation remain open.
    const FX3=8.16, FY3=y+3.54;
    box(FX3,FY3,0,.12,.78,5.40,L3.ink,{hard:true,gloss:.24,tag:'美食广场'});
    for(const [xx,yaw] of [[FX3-.072,-Math.PI/2],[FX3+.072,Math.PI/2]]) {
      glyphs(xx,FY3+.10,0,yaw,'京味食集',{size:.255,gap:.09,color:L3.ivory,mode:1,glow:.075,tag:'美食广场'});
      glyphs(xx,FY3-.22,0,yaw,'BEIJING FOOD HALL',{size:.078,gap:.026,color:L3.brassL,mode:1,glow:.035,tag:'美食广场'});
    }
    for(const z of [-2.42,2.42]) capsule(FX3,(FY3+.39+H)/2,z,.015,H-FY3-.39,.015,col.steelD,
      {gloss:.50,tag:'美食广场'});

    // Dark approach carpets make the two entertainment anchors announce themselves before their
    // glazing starts: cinema in plum and brass, arcade in midnight blue with two restrained neon
    // seams.  They are decorative surface layers only and stop short of both shop thresholds.
    flat(-2.0,y+.028,11.72,5.60,2.04,L3.plum,{mode:7,gloss:.055,tag:'电影院',...MAT.cloth});
    for(const x of [-4.42,.42]) box(x,y+.038,11.72,.045,.018,1.72,L3.brass,
      {hard:true,mode:1,glow:.025,tag:'电影院'});
    flat(-4.0,y+.028,-11.72,5.60,2.04,L3.arcade,{mode:7,gloss:.055,tag:'游戏厅',...MAT.cloth});
    box(-4.0,y+.038,-12.52,4.95,.018,.045,C('#b44877'),{hard:true,mode:1,glow:.050,tag:'游戏厅'});
    box(-4.0,y+.038,-10.92,4.95,.018,.045,C('#3b9eb4'),{hard:true,mode:1,glow:.050,tag:'游戏厅'});

    // Food court down the east wing: five open kitchens and a field of tables under the skylight.
    // Each stall's colour is the field its sign is lit on, and the lettering on all five is white —
    // so 兰州牛肉面 on col.cream was white on off-white and could not be read at all. It had never
    // been looked at: no camera in the audit faced these counters until NJ-stalls. Lanzhou noodle
    // shops are green and white anyway, which is the contrast this needs.
    // Each stall carries its own menu now, three dishes and what they cost.
    //
    // This is the piece that was missing culturally rather than graphically. A 美食广场 stall is
    // not a name over a hole — it is a lit board of dishes and prices, and the board is most of
    // what you look at while you decide. Without one these five read as generic counters that
    // happened to be labelled, which is exactly the "unprofessional" of a food court with nothing
    // written on it.
    //
    // It is also the densest run of readable Chinese anywhere in the building, and every line is
    // the register a learner actually needs: a dish, a number, a 元 sign. Prices are the ones
    // these dishes cost in a Beijing mall — a bowl of 牛肉面 at 22 and a hotpot at 58 is the
    // spread that makes the board worth reading rather than five identical numbers.
    // Keep the last counter clear of the lift landing.  The old 5.6 m rhythm put the bubble-tea
    // stall at z 11.4; its 4.6 m blocked footprint then ran to z 13.7, straight across the lift's
    // south glass at z 13.15 and over the saved call focus at [20.6, 11.6].  A slightly tighter
    // five-metre rhythm retains every kitchen and leaves a real 3.8 m arrival bay before the lift.
    const STALL_Z=[-13,-8,-3,2,7];
    // The board is gameplay data, not decoration. Mall is lazy-built after data.js has loaded, so
    // the same dish objects that the order conversation charges can paint these five menu boards.
    // A price can no longer change in one place while the wall keeps quoting the old one.
    const menuFor=key=>MALL_FOOD[key].items.map(i=>`${i.hz} ¥${i.price}`);
    const stalls=[
      ['川味小馆',   col.red,   menuFor('川味小馆')],
      ['兰州牛肉面', col.green, menuFor('面馆')],
      ['重庆火锅',   col.orange,menuFor('火锅')],
      ['粤式烧腊',   col.wood,  menuFor('烧腊')],
      ['首品奶茶',   col.jade,  menuFor('奶茶')],
    ];
    const foodMenuParts=[];
    const foodMenuPart=p=>{if(p)foodMenuParts.push(p);return p;};
    stalls.forEach(([name,c,menu],i)=>{
      const z=STALL_Z[i];
      const counterEmitter=(p,role)=>{
        if(p){p.mallFoodCounter=i;p.mallFoodRole=role;foodCounterEmitters.push(p);}
        return p;
      };
      // The shell, and why it is four pieces instead of one.
      //
      // It used to be a single solid box 2.60 m deep from x 20.35 back to 22.95, and everything
      // this stall owns behind the counter — the cook, the steamer tower, the stockpot, the
      // hanging ducks, the drinks fridge, the lit backdrop, the whole kitchen — was built at
      // x 21.1–22.4, which is *inside* that box. None of it had ever been drawn. The room is at
      // −x here (the counters face the tables, the wall is at RX=23), so every prop placed at
      // `cx + something` or at `kx` was buried, and NJ-stalls showed exactly what that leaves:
      // a bare stone counter in front of a blank cream wall. That is the "empty behind the
      // counter" complaint, and it was not that the kitchens were missing — they were walled in.
      //
      // A serving hatch is a hole, so the shell is now built round one: two piers at the sides,
      // a soffit over the top down to the bottom of the fascia, and a back wall. The opening runs
      // z ±1.90 and from the deck up to y+1.97, with the counter standing in it.
      for(const s of [-1,1])                                                  // the piers between stalls
        box(RX-1.35,y+1.75,z+s*2.10,2.60,3.45,.40,col.cream,{hard:true,gloss:.20,tag:'美食广场',...MAT.tile});
      // The soffit over the hatch. Its underside is y+1.965, five millimetres below the bottom of
      // the fascia board at y+1.97, and the fascia stands 13 cm proud of it — nothing coplanar.
      box(RX-1.35,y+2.72,z,2.60,1.51,4.60,col.cream,{hard:true,gloss:.20,tag:'美食广场',...MAT.tile});
      box(RX-0.25,y+.99,z,.50,1.93,4.60,col.stoneD,{hard:true,gloss:.18,tag:'美食广场',...MAT.tile}); // back wall
      // The fascia used to be a single 2.35 m panel of near-black across the whole front, and from
      // the tables that is exactly what it looked like: a hole in the wall with a lit sign over it.
      // A food stall is mostly *opening* — the bright, steamy, cluttered gap you order through —
      // so the dark is now only a band at the top, and everything below it is lit.
      // The fascia board, and why it now stands at RX-2.72 rather than RX-2.55.
      //
      // It was a 0.20 m deep box centred at RX-2.55, which puts its front face at exactly RX-2.65
      // — the same plane as the front of the stall shell, itself 2.60 deep centred at RX-1.35. Two
      // coplanar visible faces, so the depth buffer had nothing to choose between them and a 1.3 m
      // dark board rendered as a thin bar of horizontal cream-and-charcoal stripes. Every menu line
      // written on it landed on bare cream instead.
      //
      // It had survived because the AO haze over this wing washed the whole fascia pale enough
      // that the striping read as glare. Turning AO off to chase the haze is what exposed it.
      box(RX-2.72,y+2.62,z,.12,1.30,4.20,col.charcoal,{hard:true,gloss:.26,tag:'美食广场'});
      // The name band sits at the top of the fascia rather than across the middle of it, because
      // the middle is now the menu. That is the order every one of these boards is laid out in:
      // who you are, then what you sell, then what it costs.
      // Stacked forward off the board in 1–2 cm steps, front to back: name glyphs, colour band,
      // fascia, shell. Nothing shares a plane with anything, which is the whole lesson above.
      litten(box(RX-2.83,y+2.96,z,.08,.50,3.90,c,{hard:true,mode:1,glow:.20,tag:'美食广场'}),.55);
      glyphs(RX-2.89,y+2.96,z,-Math.PI/2,name,{size:.235,gap:.075,color:col.white,mode:1,tag:'美食广场'});
      // 菜单 the menu itself, on the dark of the fascia under the name. Three lines at .22 apart
      // puts the last one at y+2.02, which clears the bottom of the fascia at y+1.97 — below that
      // the letters would hang over the serving opening and be read against the lit kitchen.
      //
      // The first line is gold and the other two white: a stall leads with one dish, and a board
      // where every line shouts equally is a board nobody reads. Glow is .10 — these are letters
      // on a lit sign, not lights themselves, and five boards of bright text twenty metres long is
      // how the top of this room turned into a milky haze the last time something here emitted.
      (menu||[]).forEach((line,r)=>
        glyphs(RX-2.80,y+2.52-r*.215,z,-Math.PI/2,line,
          {size:.132,gap:.044,color:r===0?col.goldL:col.white,mode:1,glow:.10,tag:'美食广场'}));
      // A valance awning pitched out over the fascia, in the stall's own sign colour. Without it
      // the roofline of all five stalls is one flat line the whole length of the wing; a short
      // tilted flap above each sign breaks that line five times and shades the name from above the
      // way a real food-stall valance does. rx tips it forward toward the room.
      box(RX-2.60,y+3.42,z,.34,.06,4.30,c,{rx:.42,hard:true,gloss:.16,tag:'美食广场'});
      box(RX-2.74,y+3.40,z,.04,.04,4.40,col.goldL,{rx:.42,hard:true,mode:1,glow:.10,tag:'美食广场'});
      // The lit opening itself, warm and set back, so there is somewhere for the steam to come from.
      // This is the back of the stall seen through the serving opening, and it was a 1.9 x 3.9 m
      // panel of near-white at glow .13 with a night boost on top — five of them in a row, which
      // is a continuous emissive wall twenty metres long. From the tables the entire upper half of
      // the food court was a milky haze: the menu boards, the heat lamps and the kitchen behind
      // every counter were in there and none of them could be seen. A kitchen is a dim place with
      // bright things in it, so the backdrop goes down to a warm shadow and the lit objects in
      // front of it — sign, lamps, board, trays — are left to do the lighting.
      // It sat at RX-1.55, which is 1.1 m *in front of* the back of a shell that had no hole in it
      // — so it was buried like everything else. It is now the wall the kitchen stands against,
      // 20 cm proud of the structural back wall, and it is the thing you see between the steamer
      // and the duck rail when you look into the hatch.
      litten(box(RX-0.55,y+1.55,z,.10,1.90,3.90,C('#8a7358'),{hard:true,mode:1,glow:.04,tag:'美食广场'}),.2);
      // Counter: a stone top at serving height, the glass sneeze screen over it, and the food.
      // Counter apron in tile and worktop in nothing at all.
      //
      // Both were MAT.slab, which is paving at a 0.72 m repeat. On an apron 0.92 m tall that is a
      // little over one stone across its whole height, so what rendered was a food counter faced
      // in crazy paving — the single most unprofessional thing in the room, and visible from every
      // table. MAT's own comment has always said tile is for "toilets and the food-court stalls";
      // this is the surface it was describing. At a 0.34 m repeat the tiles are hand-sized.
      //
      // The worktop keeps its stone colour and takes no material: it is 9 cm thick and 4.16 m long,
      // and any repeat laid across that reads as a pattern rather than as a surface. A serving
      // counter is a solid slab with a wipe-clean sheen, which is gloss, not texture.
      box(RX-2.90,y+.46,z,.86,.92,4.10,col.stoneD,{hard:true,gloss:.24,tag:'美食广场',...MAT.tile});
      box(RX-2.90,y+.95,z,.94,.09,4.16,col.stone,{hard:true,gloss:.46,tag:'美食广场'});
      // The sneeze screen was at RX-2.78 — 12 cm *behind* the middle of the food, on the kitchen
      // side of it, which is the one place a sneeze guard cannot be. It now stands over the front
      // lip of the counter on two short posts, between the customer and the trays, and it is a
      // 0.58 m band rather than a 0.86 m sheet: a metre of translucent glass down twenty metres of
      // counter is a veil over the whole wing, and the food is what this view is for.
      // Two side panels leave a real service gap in the middle.  The old single 3.9 m sheet
      // wrote one transparent depth curtain across the whole hatch: dishes remained visible
      // because they sit in front of it, while the cook directly behind it disappeared.  That
      // was visually empty and operationally backwards — the place where a bowl is handed over
      // is precisely where a sneeze guard has to stop.  Four posts frame the two short panes and
      // the 1.1 m opening keeps the cook, their hands and the pass legible from the queue.
      for(const o of [-1.92,-.55,.55,1.92])
        cyl(RX-3.15,y+1.14,z+o,.014,.34,col.steelD,{gloss:.55,tag:'美食广场'});
      for(const o of [-1.235,1.235])
        box(RX-3.15,y+1.60,z+o,.04,.58,1.37,col.glass,
          {hard:true,mode:1,alpha:.20,gloss:.80,tag:'美食广场'});
      // Gastronorm trays of food in the counter. These used to be a .05 m coloured panel laid in
      // a steel frame, which from the tables read as four flat rectangles — not as food. Real food
      // has volume, sheen and identifiable pieces: a pile, a glaze, things sitting in broth. Each
      // cuisine now gets its own display, built from the same primitives but in the shapes the eye
      // parses as that dish. cx is the counter top centre, just inside the sneeze screen.
      const FX=RX-2.92;
      // a steel pan with a rolled rim — the shared vessel all five cuisines serve out of.
      const pan=(pz,sx,sz)=>{
        box(FX,y+1.02,pz,sx,.08,sz,col.steel,{hard:true,gloss:.55,tag:'美食广场'});
        box(FX,y+1.055,pz,sx+.03,.012,sz+.03,col.steelD,{hard:true,gloss:.6,tag:'美食广场'});
      };
      if(i===0) {
        // 川味小馆 — a red-oil mapo pan and a green-strips greens pan, plus two bowls of ready
        // portions. Mapo reads as a dark-red oil pool with pale tofu cubes standing in it; the
        // gloss on the oil is what says "wet and hot".
        pan(z-.8,.66,.72);
        box(FX,y+1.04,z-.8,.60,.045,.66,C('#7a2a1c'),{hard:true,gloss:.55,tag:'美食广场'});   // red oil base
        for(let r=0;r<3;r++) for(let cc=0;cc<3;cc++)                                      // tofu cubes
          box(FX-.20+cc*.20,y+1.10,z-1.00+r*.20,.08,.06,.08,C('#f0e8d4'),{hard:true,gloss:.30,tag:'美食广场'});
        for(let s=0;s<5;s++)                                                              // scallion flecks
          ball(FX-.18+s*.09,y+1.105,z-.55+s*.06,.022,.022,.022,C('#3e6b2a'),{hard:true,gloss:.3,tag:'美食广场'});
        pan(z+.6,.66,.72);
        box(FX,y+1.04,z+.6,.60,.04,.66,C('#4d6e3a'),{hard:true,gloss:.40,tag:'美食广场'});   // stir-fried greens
        for(let s=0;s<6;s++)                                                              // green strips
          box(FX-.20+(s%3)*.20,y+1.07,z+.40+Math.floor(s/3)*.30,.04,.025,.20,C('#6f9a4e'),{ry:Math.PI/2,hard:true,gloss:.32,tag:'美食广场'});
        // two ready bowls, on the counter in front
        for(const bz of [z-1.4,z+1.4]) {
          cyl(FX,y+1.00,bz,.12,.08,C('#f2ece0'),{gloss:.30,tag:'美食广场'});
          cyl(FX,y+1.05,bz,.11,.03,C('#9e3a26'),{gloss:.45,tag:'美食广场'});                 // red braised meat
        }
      } else if(i===1) {
        // 兰州牛肉面 — a big bowl of noodle soup per pan: a pale broth with a tangle of yellow
        // noodles standing up out of it, slices of beef and a scatter of scallion. The noodle
        // tangle is what reads as "noodles" — without it the pan is just yellow water.
        for(const pz of [z-1.0,z+0.1,z+1.2]) {
          pan(pz,.56,.66);
          cyl(FX,y+1.05,pz,.24,.05,C('#d8b06a'),{gloss:.40,tag:'美食广场'});                 // pale broth
          for(let n=0;n<8;n++){                                                            // noodle tangle
            const a=n/8*Math.PI*2;
            capsule(FX+Math.cos(a)*.06,y+1.13,pz+Math.sin(a)*.06,.008,.20,.008,C('#e8c878'),
              {rx:a*1.3,ry:a,gloss:.30,tag:'美食广场'});
          }
          for(let s=0;s<3;s++)                                                             // beef slices
            box(FX-.10+s*.10,y+1.10,pz-.12+(s%2)*.18,.08,.02,.12,C('#8a4628'),{hard:true,gloss:.4,tag:'美食广场'});
          for(let s=0;s<4;s++)                                                             // scallion
            ball(FX-.12+s*.08,y+1.115,pz+.06+(s%2)*.10,.018,.018,.018,C('#3e6b2a'),{hard:true,gloss:.3,tag:'美食广场'});
        }
      } else if(i===2) {
        // 重庆火锅 — the chafing dishes. Two wide shallow pans, one the red-oil spicy side and one
        // the clear bone-broth side, with things cooking in them: mushroom caps, lotus root discs,
        // tofu puffs. The divider pot is the hero on the counter (see the branch below); these are
        // the served portions keeping warm.
        pan(z-.7,.66,.72);
        box(FX,y+1.04,z-.7,.60,.05,.66,C('#9a2a1e'),{hard:true,gloss:.60,tag:'美食广场'});    // red oil
        for(let s=0;s<5;s++)                                                               // chilli pods floating
          ball(FX-.18+s*.09,y+1.09,z-.6+(s%2)*.2,.028,.02,.028,C('#5a1a12'),{hard:true,gloss:.5,tag:'美食广场'});
        pan(z+.7,.66,.72);
        box(FX,y+1.04,z+.7,.60,.05,.66,C('#c8a868'),{hard:true,gloss:.42,tag:'美食广场'});   // clear broth
        for(let s=0;s<4;s++)                                                               // tofu puffs
          box(FX-.18+s*.12,y+1.09,z+.55+(s%2)*.18,.08,.06,.08,C('#e8d49a'),{hard:true,gloss:.3,tag:'美食广场'});
        for(let s=0;s<3;s++)                                                               // mushroom caps
          cyl(FX-.10+s*.10,y+1.10,z+.85,.05,.025,C('#8a6a4a'),{hard:true,gloss:.3,tag:'美食广场'});
      } else if(i===3) {
        // 粤式烧腊 — the roast-meat counter: a chopping block with a row of sliced char-siu and
        // roast duck laid out, plus a pan of glistening siu yuk (crispy pork). The sheen is what
        // says "roast" — everything here is glossed high.
        pan(z,.70,.80);
        box(FX,y+1.04,z,.64,.05,.74,C('#b06a2a'),{hard:true,gloss:.55,tag:'美食广场'});       // roast base, glazed
        for(let s=0;s<5;s++)                                                               // char-siu slices
          box(FX-.22+s*.11,y+1.10,z-.12,.06,.04,.40,C('#c83a2a'),{hard:true,gloss:.5,tag:'美食广场'});
        for(let s=0;s<4;s++)                                                               // duck pieces
          box(FX-.15+s*.10,y+1.10,z+.25,.07,.04,.20,C('#8a4a1a'),{hard:true,gloss:.5,tag:'美食广场'});
        // a whole roast duck laid on the block, the centrepiece
        taper(FX,y+1.12,z+1.3,.18,.10,.18,C('#9a5e26'),{rx:Math.PI/2,hard:true,gloss:.5,tag:'美食广场'});
        cyl(FX,y+1.14,z+1.12,.10,.06,C('#7a4622'),{hard:true,gloss:.45,tag:'美食广场'});
      } else {
        // 首品奶茶 — bubble tea counter: cups of finished tea standing in a row with the black
        // tapioca pearls visible through them, plus a pan of dry pearls. The pearl dots at the
        // bottom of each cup are what reads as "bubble tea" — without them it is just cups of milk.
        for(const cz2 of [z-1.1,z-.1,z+.9,z+1.6]) {
          cyl(FX,y+1.04,cz2,.11,.30,C('#e8d8b0'),{hard:true,mode:1,alpha:.45,gloss:.6,tag:'美食广场'}); // clear cup
          cyl(FX,y+1.00,cz2,.10,.04,C('#3a2a1a'),{hard:true,gloss:.3,tag:'美食广场'});        // pearl bed
          for(let s=0;s<5;s++)                                                             // individual pearls
            ball(FX-.06+s*.03,y+1.01,cz2-.04+(s%2)*.08,.012,.012,.012,C('#1a1208'),{hard:true,gloss:.4,tag:'美食广场'});
          cyl(FX,y+1.21,cz2,.105,.04,C('#d8b0c8'),{hard:true,gloss:.4,tag:'美食广场'});      // tea/milk top
          cyl(FX,y+1.24,cz2,.115,.03,C('#f0e6d0'),{hard:true,gloss:.3,tag:'美食广场'});      // domed lid
          capsule(FX,y+1.32,cz2,.008,.16,.008,C('#f0e6d0'),{rx:Math.PI/2,gloss:.3,tag:'美食广场'}); // fat straw
        }
        // dry tapioca pearls in a pan
        pan(z+.3,.40,.40);
        for(let s=0;s<10;s++)
          ball(FX-.10+(s%5)*.05,y+1.08,z+.1+Math.floor(s/5)*.15,.012,.012,.012,C('#2a1a0a'),{hard:true,gloss:.4,tag:'美食广场'});
      }
      // Heat lamps over the pass. Two warm bars is all it takes to say the food is hot.
      for(const o of [-1.1,1.1])
        counterEmitter(litten(cyl(RX-2.60,y+2.06,z+o,.045,1.30,C('#ffb15e'),
          {rx:Math.PI/2,mode:1,glow:.30,tag:'美食广场'}),.5),'heat');
      // The heat lamps are the brightest thing on this wing and the reason the trays and the
      // stone counter in front of them look hot. One orange lamp per stall, over the pass.
      const counterLight=ownPublicLight(
        B.light(RX-2.75,y+1.95,z,[1.00,0.78,0.48],.55,2.8),'decorative');
      counterLight.mallFoodCounter=i;foodCounterLights.push(counterLight);
      // Behind the counter: a lit menu board with rows on it, and the shape of a kitchen.
      foodMenuPart(counterEmitter(litten(box(RX-1.0,y+2.70,z,.06,.90,3.60,col.screen,
        {hard:true,mode:1,glow:.16,tag:'美食广场'}),.4),'menu'));
      for(let k=0;k<4;k++)
        foodMenuPart(box(RX-1.06,y+2.96-k*.22,z-.2,.02,.10,2.60-k*.30,
          [col.goldL,col.white,col.white,col.cream][k],
          {hard:true,mode:1,glow:.10,tag:'美食广场'}));
      // --- Per-cuisine identity. Five identical counters with different sign colours was the whole
      // reason the wing read as a row of blocks: a 川菜 stall and a noodle stall and a roast-meat
      // stall do not look alike, and the single most recognisable thing about each one is the shape
      // of the kit you cook it on. Each branch adds one hero prop on the counter and the silhouette
      // of the kitchen behind the hatch, so the five stalls read as five kitchens, not five boxes.
      // cx is the counter-top centre; kx is the middle of the kitchen behind the hatch.
      // Steam sources (sx,sz) are picked up by the rig further down.
      //
      // THE COUNTER IS ONLY 0.94 m DEEP: its worktop runs x 19.63 to 20.57, and the shell's hatch
      // jamb is at 20.35. So `cx + 1.45` is not "along the counter", it is 1.45 m *into the wall*.
      // Every hero prop here was written that way — the split hotpot, the stockpot, the chopping
      // block, the finished bubble tea, both condiment pots — and all of them were inside solid
      // geometry. They are all within ±0.2 m of cx now, which is the only place a thing can stand
      // on this counter and be seen. When adding to this counter: x ∈ [19.9, 20.45], vary z.
      const cx=RX-2.86, kx=RX-1.30;
      // A condiment cluster on every counter — chopstick pot + a bottle — the one piece of clutter
      // a food stall is never without, and the thing that breaks the bare stone top at the rail end.
      cyl(cx+.14,y+1.10,z-1.55,.10,.16,col.charcoal,{hard:true,gloss:.3,tag:'美食广场'});
      for(let s=0;s<6;s++) cyl(cx+.14+Math.cos(s)*.04,y+1.19,z-1.55+Math.sin(s)*.04,.008,.06,col.cream,{tag:'美食广场'});
      cyl(cx+.16,y+1.09,z+1.35,.055,.16,C('#8a4b2a'),{hard:true,gloss:.4,tag:'美食广场'});
      if(i===0) {
        // 川味小馆 — a bamboo steamer tower and a wok. The steamer is three stacked baskets (the
        // unmistakable ribbed bamboo cylinders of every dim-sum and 川菜 kitchen) and the wok is an
        // inverted taper with a rolled rim and red oil, the dish this region cooks in.
        for(let s=0;s<3;s++)
          cyl(kx,y+1.00+s*.30,z+.4,.30,.30,C('#cdb079'),{hard:true,gloss:.12,tag:'美食广场'});
        cyl(kx,y+1.92,z+.4,.30,.04,C('#b8975c'),{hard:true,gloss:.18,tag:'美食广场'});
        // wok on the counter, off to the side of the trays
        taper(cx+.02,y+1.0,z+1.4,.26,.16,.26,C('#3a3a3e'),{rx:Math.PI,hard:true,gloss:.5,tag:'美食广场'});
        cyl(cx+.02,y+1.06,z+1.4,.27,.03,C('#1f1f22'),{hard:true,gloss:.45,tag:'美食广场'});
        cyl(cx+.02,y+1.05,z+1.4,.21,.025,C('#9e3a26'),{hard:true,gloss:.42,tag:'美食广场'});
        steamRigs.push({x:cx+.02,y:y+1.05,z:z+1.4,puffs:makePuffs(4)});
      } else if(i===1) {
        // 兰州牛肉面 — a pale noodle board with skeins hanging off it, and the big stockpot the
        // broth is kept hot in. The board is what every pull-a-noodle stall fronts the counter
        // with; the stockpot is where the steam comes from.
        // 1.30 deep, not 1.40: at 1.40 the board's back face landed at 22.40, the same plane as the
        // front of the lit backdrop, and the two would have striped against each other.
        box(kx+.05,y+1.30,z+.4,1.30,.04,2.20,C('#e8dcc2'),{hard:true,gloss:.16,tag:'美食广场'});
        box(kx-.01,y+1.16,z-.6,.10,.30,.20,C('#cdb079'),{hard:true,gloss:.14,tag:'美食广场'});
        box(kx-.01,y+1.16,z+1.4,.10,.30,.20,C('#cdb079'),{hard:true,gloss:.14,tag:'美食广场'});
        // hanging noodle skeins — pale thin capsules dangling from the board's underside
        for(let s=0;s<5;s++){
          const sz=z-.6+s*.65;
          capsule(kx-.14,y+1.05,sz,.02,.36,.02,C('#f0e4c6'),{rx:Math.PI/2,tag:'美食广场'});
        }
        // the stockpot
        cyl(cx+.04,y+1.10,z-.6,.24,.36,col.steelD,{hard:true,gloss:.4,tag:'美食广场'});
        cyl(cx+.04,y+1.30,z-.6,.26,.04,col.steel,{hard:true,gloss:.5,tag:'美食广场'});
        cyl(cx+.04,y+1.27,z-.6,.20,.02,C('#4a3a2a'),{hard:true,gloss:.3,tag:'美食广场'});
        steamRigs.push({x:cx+.04,y:y+1.28,z:z-.6,puffs:makePuffs(5)});
      } else if(i===2) {
        // 重庆火锅 — the split pot is the hero: a wide shallow vessel divided down the middle into
        // a red-oil side and a clear side, which is the shape everyone recognises as 火锅. Sat on
        // the counter in front of the sneeze screen so it is the first thing the eye lands on.
        taper(cx+.02,y+1.02,z+.2,.42,.14,.42,C('#2a2a2e'),{rx:Math.PI,hard:true,gloss:.4,tag:'美食广场'});
        cyl(cx+.02,y+1.08,z+.2,.40,.03,C('#1c1c1f'),{hard:true,gloss:.4,tag:'美食广场'});
        box(cx+.02,y+1.09,z+.2,.025,.02,.84,col.steel,{hard:true,gloss:.6,tag:'美食广场'});  // divider
        // red oil half (+z) and clear broth half (−z)
        cyl(cx+.02,y+1.085,z+.62,.27,.02,C('#a83224'),{hard:true,gloss:.5,tag:'美食广场'});
        cyl(cx+.02,y+1.085,z-.22,.27,.02,C('#d8b56a'),{hard:true,gloss:.5,tag:'美食广场'});
        steamRigs.push({x:cx+.02,y:y+1.09,z:z+.2,puffs:makePuffs(6)});
      } else if(i===3) {
        // 粤式烧腊 — hanging roast row. The whole identity of a 烧腊 stall is golden ducks and
        // strips of char-siu hung on steel hooks off a rail behind the hatch; nothing else reads
        // as Cantonese roast as instantly as that silhouette.
        // The rail was 1.70 m long *in x* while the four ducks were spread along z, so it ran back
        // into the wall at right angles to the row it was supposed to carry. It runs along z now,
        // and it hangs in the front of the hatch rather than deep in the kitchen: a 烧腊 stall puts
        // its ducks in the window, and at y+2.30 they were above the hatch head (y+1.97) and behind
        // the soffit. The row now sits between y+1.28 and y+1.86, which is the band you actually
        // see over the counter.
        box(RX-2.52,y+1.90,z,.06,.06,2.80,col.steelD,{hard:true,gloss:.4,tag:'美食广场'});  // rail
        for(let s=0;s<4;s++){
          const rz=z-1.20+s*.80;
          capsule(RX-2.52,y+1.84,rz,.012,.14,.012,col.steelD,{gloss:.4,tag:'美食广场'});      // hook
          // the body — a roast duck in golden-brown, hung head-down
          taper(RX-2.52,y+1.50,rz,.15,.28,.15,C('#9a5e2a'),{hard:true,gloss:.28,tag:'美食广场'});
          cyl(RX-2.52,y+1.70,rz,.12,.04,C('#7a4622'),{hard:true,gloss:.3,tag:'美食广场'});
          // a strip of 叉烧 hung between the ducks, darker and flatter
          if(s<3) box(RX-2.52,y+1.52,rz+.40,.05,.42,.13,C('#a8342a'),{hard:true,gloss:.42,tag:'美食广场'});
        }
        // a chopping block on the counter with a cleaver resting on it
        box(cx+.06,y+1.04,z+.2,.50,.10,.40,C('#a37b48'),{hard:true,gloss:.16,tag:'美食广场'});
        box(cx+.06,y+1.11,z+.2,.36,.02,.06,col.steel,{hard:true,gloss:.5,ry:.3,tag:'美食广场'});
      } else {
        // 首品奶茶 — a tall glass drinks fridge behind the counter with a lit interior and a grid
        // of coloured bottles, and a finished bubble-tea cup on the counter. The fridge glow is
        // the cold blue that sets this stall apart from the four warm kitchens beside it.
        // The cabinet was one solid 1.20 m box with its lit glass door and all twelve bottles built
        // *inside* it — the door at kx+.04 and the bottles at kx+.02 are both 0.6 m in from the
        // front face, so what drew was a plain white block. A display fridge has to be hollow: a
        // carcass at the back, two jambs, a head, and the lit door across the front of the gap the
        // bottles stand in.
        // Kept under the hatch head at y+1.97: everything above that line is behind the soffit and
        // would only be drawing inside solid geometry.
        box(kx+.36,y+.98,z,.48,1.96,2.20,C('#e8eee6'),{hard:true,gloss:.34,tag:'美食广场'});   // carcass
        for(const s of [-1,1])                                                                 // jambs
          box(kx-.16,y+.98,z+s*1.02,.56,1.96,.16,C('#e8eee6'),{hard:true,gloss:.34,tag:'美食广场'});
        box(kx-.16,y+1.90,z,.56,.12,2.20,C('#e8eee6'),{hard:true,gloss:.34,tag:'美食广场'});    // head
        box(kx-.16,y+.14,z,.56,.28,2.20,col.steelD,{hard:true,gloss:.4,tag:'美食广场'});        // plinth
        // bottle grid: 3 rows x 4 cols, coloured by row, standing on wire shelves in the gap
        const BC=[C('#c83a4a'),C('#e0a93e'),C('#5a9a6e')];
        for(let r=0;r<3;r++) {
          box(kx-.16,y+.62+r*.40,z,.52,.02,2.00,col.steel,{hard:true,gloss:.5,tag:'美食广场'});
          for(let cc=0;cc<4;cc++)
            cyl(kx-.16,y+.78+r*.40,z-1.05+cc*.70,.055,.30,BC[r],{hard:true,gloss:.5,tag:'美食广场'});
        }
        // The lit door, across the front of the cabinet. A fridge is a cold light box and this is
        // the one cool thing in twenty metres of warm kitchen — but it is 3.2 m² of glass, and the
        // run of five emissive backdrops that once hazed this whole wing was made of exactly this
        // mistake, so it sits at the bottom of the large-area band.
        litten(box(kx-.46,y+.98,z,.04,1.72,1.88,col.glass,{hard:true,mode:1,alpha:.22,gloss:.8,glow:.05,tag:'美食广场'}),.4);
        // the bubble-tea cup on the counter
        cyl(cx+.10,y+1.18,z+.4,.11,.30,C('#e8d8b0'),{hard:true,mode:1,alpha:.5,gloss:.6,tag:'美食广场'});
        cyl(cx+.10,y+1.10,z+.4,.10,.04,C('#3a2a1a'),{hard:true,tag:'美食广场'});  // pearls
        cyl(cx+.10,y+1.35,z+.4,.115,.06,C('#f0e6d0'),{hard:true,gloss:.3,tag:'美食广场'});  // domed lid
      }
      // The generic stainless prep bench behind. It was 1.80 m tall — a cabinet, not a bench, and
      // it stood right in the middle of the hatch, so now that you can see through the hatch it
      // would have hidden the kitchen it was meant to furnish. Waist height, with an under-shelf.
      box(kx-.62,y+.44,z-1.05,.96,.88,.76,col.steel,{hard:true,gloss:.5,tag:'美食广场'});
      box(kx-.62,y+.90,z-1.05,1.02,.05,.82,col.steelD,{hard:true,gloss:.6,tag:'美食广场'});
      // A stack of red melamine trays on it — the thing you carry your bowl away on, and the piece
      // of a Chinese food court that is red in every photograph of one.
      for(let s=0;s<5;s++)
        box(kx-.62,y+.95+s*.035,z-1.05,.42,.03,.56,C('#b8392c'),{hard:true,gloss:.34,tag:'美食广场'});
      blockUp(3,RX-3.3,RX,z-2.3,z+2.3);
    });
    ownPoweredDisplay(foodMenuParts,'美食广场',[10,23],{id:'foodcourt-menus'});
    // A cook behind every counter. A row of stalls with nobody in them reads as a display kitchen
    // after closing; the one thing that makes a food court feel open and working is the people
    // behind the hatches. These are real NPCs — pushed into MallCast the same way the nightmarket
    // vendors and the diner waitress are — so they get the standing counter animation for free
    // (act:'vend' reaches out over the pass on a sine; act:'work' bends over the bench). Each is
    // held at one spot, facing the room, so they never wander off and leave a stall empty.
    const CHEFS=[
      // 川味小馆 — a Sichuan cook, dark-red apron, handing bowls over the pass
      { look:{ skin:'#c69066',hair:'#26201d',hairStyle:'short',top:'#f0e8da',pants:'#3a3f46',
               shoe:'#2f3338',sleeve:'short',collar:'shirt',apron:'#8a2e22',hatColor:'#f0e8da',
               tall:1.02,wide:1.04,age:0.40,faceSeed:71 },
        act:'vend', zh:['麻辣的，小心烫。','Spicy — careful, it is hot.'],
                py:['Málà de, xiǎoxīn tàng.'] },
      // 兰州牛肉面 — a noodle puller, white cap, bent over the board pulling la-mian
      { look:{ skin:'#b07e54',hair:'#15110f',hairStyle:'short',top:'#e6eef0',pants:'#33383e',
               shoe:'#2c3036',sleeve:'short',collar:'shirt',apron:'#3c4750',hatColor:'#eee9dc',
               tall:0.98,wide:1.08,age:0.52,faceSeed:104 },
        act:'work', held:null, zh:['牛肉面，二细还是毛细？','Beef noodles — second-fine, or hair-fine?'],
                py:['Niúròumiàn, èrxì háishì máoxì?'] },
      // 重庆火锅 — a hotpot chef, orange apron, tending the split pot
      { look:{ skin:'#ca9468',hair:'#241d18',hairStyle:'short',top:'#efe7d6',pants:'#3a3f46',
               shoe:'#30343a',sleeve:'short',collar:'shirt',apron:'#b8501e',hatColor:'#efe7d6',
               tall:1.04,wide:1.06,age:0.44,faceSeed:212 },
        act:'work', held:null, zh:['鸳鸯锅好了，小心烫。','The split pot is ready — mind the heat.'],
                py:['Yuānyāngguō hǎo le, xiǎoxīn tàng.'] },
      // 粤式烧腊 — a roast-meat carver, striped apron, chopping at the block
      { look:{ skin:'#a8744e',hair:'#1c1612',hairStyle:'short',top:'#dcd4c2',pants:'#33383e',
               shoe:'#2b2f35',sleeve:'short',collar:'shirt',apron:'#4a3a2a',
               tall:1.06,wide:1.10,age:0.58,faceSeed:305 },
        act:'work', held:null, zh:['烧鸭还是叉烧？','Roast duck, or char-siu?'],
                py:['Shāoyā háishì chāshāo?'] },
      // 首品奶茶 — a young bubble-tea server, green apron, handing cups over the counter
      { look:{ skin:'#d6a578',hair:'#2a1d14',hairStyle:'long',top:'#f4eede',pants:'#3a3f46',
               shoe:'#33373d',sleeve:'short',collar:'shirt',apron:'#3e7d6a',
               tall:0.96,wide:0.98,youth:0.5,faceSeed:418 },
        act:'vend', zh:['少糖还是半糖？','Less sugar, or half?'],
                py:['Shǎo táng háishì bàn táng?'] },
    ];
    // 欢迎光临 is the line. Chinese counter staff greet you before you have said anything, and then
    // tell you how to pay — which in a Beijing mall is a phone at a QR card, never cash. Every cook
    // opens with the greeting, says their own dish, and closes on the till card standing beside them.
    const GREET=[
      ['欢迎光临！今天想吃点什么？','Welcome! What would you like today?'],
      ['里边请，面现拉的。','Come on in — the noodles are pulled to order.'],
      ['欢迎光临，两位还是一位？','Welcome — for two, or just one?'],
      ['随便看看，都是刚出炉的。','Have a look — it has all just come out.'],
      ['欢迎光临，会员第二杯半价。','Welcome — second cup half price for members.'],
    ];
    const PAY=[
      ['扫码点餐，手机支付就行。','Scan to order — paying by phone is fine.'],
      ['一卡通也能刷，充值处在那边。','The stored-value card works too — top up over there.'],
      ['扫这个码，付完把小票给我。','Scan this code, then show me the receipt.'],
      ['打包还是堂食？打包多两块。','Takeaway or eating in? Takeaway is two kuai more.'],
      ['扫码关注，加送一份小料。','Follow us on the code and the topping is free.'],
    ];
    CHEFS.forEach((c,i)=>{
      const z=STALL_Z[i];                   // the same z each stall is built at
      // These are created during Mall's lazy build, after game.js has already folded the static
      // MallCast roster. Export them separately so the on-build hook can register them immediately.
      foodStaff.push({
        hz:'厨师', name:'', py:(c.py||[''])[0], place:'mall', mallFloor:3, temper:'busy',
        look:c.look,
        // x was RX-1.85 (21.15), which is inside the noodle board and the prep bench, and `face`
        // was Math.PI. A figure's yaw here points along (sin, cos) — the same convention `table()`
        // seats its diners with — so Math.PI is −z: all five cooks were standing side-on, looking
        // down the wing at each other's stalls rather than out at the queue. −π/2 is −x, which is
        // the room. RX-2.30 is 13 cm behind the worktop's rear edge: enough working clearance to
        // keep their legs behind the apron, but close enough that their upper bodies occupy the
        // central service opening instead of vanishing into the kitchen scenery.
        spots:[{ h0:10, h1:22, at:[RX-2.30,z], face:-Math.PI/2, act:c.act }],
        lines:[ GREET[i], c.zh, PAY[i] ],
      });
    });
    const t3=(hz,x,z,zh,en,note,reach=1.7,yy=1.3)=>{
      const th=thing(hz,x,y+yy,z,zh,en,note,{focus:[x<0?x+1.5:x-1.5,z],reach});
      th.mallFloor=3; return th;
    };
    const foodThing=t3('美食广场',RX-3.1,-2.6,'美食广场什么都有。','The food court has a little of everything.',
      '美食 good food + 广场 public square.',2.4,2.7);
    foodThing.foodHall=true;
    const foodThings=[
      t3('川味小馆',RX-3.1,STALL_Z[0],'麻辣鲜香。','Spicy, aromatic Sichuan flavors.','川 Sichuan + 味 flavor.'),
      t3('面馆',RX-3.1,STALL_Z[1],'来一碗牛肉面。','A bowl of beef noodles, please.','面 noodles + 馆 eatery.'),
      t3('火锅',RX-3.1,STALL_Z[2],'火锅两个人吃才好吃。','Hot pot is best with two people.','火 fire + 锅 pot.'),
      t3('烧腊',RX-3.1,STALL_Z[3],'粤式烧腊。','Cantonese roast meats.','烧 roasted + 腊 cured.'),
      t3('奶茶',RX-3.1,STALL_Z[4],'首品奶茶的珍珠最有嚼劲。','Shoupin bubble tea has the chewiest pearls.','奶 milk + 茶 tea.'),
    ];
    ['川味小馆','面馆','火锅','烧腊','奶茶'].forEach((vendor,i)=>{foodThings[i].foodVendor=vendor;});
    // The hanging direction totem over the head of the gangway. A food court is where the
    // wayfinding earns its keep — three destinations share one wing (the kitchens east, the cinema
    // south, the toilets west) and a sign hung in the air at the junction is how every real mall
    // answers that question without making you read a map. Patterned on airport gantry(): a flat
    // panel suspended from the ceiling on two thin cables, double-sided so it reads from either
    // approach, and static (no `flags` entry) so the rows stay where the arrows point.
    {
      const GX=15.5, GZ=-2.6, GY=y+4.4, GW=3.0, GH=1.70;
      box(GX,GY,GZ,GW,GH,.10,col.fcCharcoal,{hard:true,gloss:.28,tag:'美食广场'});
      litten(box(GX,GY,GZ,.04,GH-.24,GW-.24,col.fcTeal,{hard:true,mode:1,glow:.12,tag:'美食广场'}),.40);
      for(const s of [-1,1])                 // the two steel cables up to the ceiling (H=13.6)
        capsule(GX+s*(GW/2-.34),(GY+GH/2+H)/2,GZ,.016,H-GY-GH/2,.016,col.steel,{gloss:.50,tag:'美食广场'});
      const faces=[
        {oz:-.08,yaw:Math.PI,rows:['美食广场 →','电影院 ↑','洗手间 ↑']},
        {oz: .08,yaw:0,      rows:['← 美食广场','电影院 ↓','洗手间 ↓']},
      ];
      faces.forEach(face=>face.rows.forEach((zh,i)=>{
        const ry=GY+GH/2-.34-i*.46;
        for(const g of glyphs(GX,ry,GZ+face.oz,face.yaw,zh,
          {size:.235,gap:.07,color:C('#faf7f0'),mode:1,tag:'美食广场'})) litten(g,.90);
      }));
      // a small 3F tag in the top-right corner of the panel, the way every directory totem is dated
      // to the floor it stands on.
      for(const yaw of [Math.PI,0])
        glyphs(GX+GW/2-.42,GY+GH/2-.22,GZ+(yaw?-.08:.08),yaw,'3F',
          {size:.20,gap:.04,color:col.goldL,mode:1,tag:'美食广场'});
    }
    // The seating. This was three columns by seven rows of one table, every table the same size at
    // the same pitch, and from the doorway it read as a furniture showroom rather than as somewhere
    // to eat: twenty-one identical discs on a grid you could see the whole of at once, with an
    // unbroken run of chairs from one end of the hall to the other.
    //
    // What a real food court has instead is *zones*, and the thing that makes them is the gangway.
    // A clear route runs from the escalator down the middle of the hall to the stalls, and the
    // tables are grouped either side of it in the three sizes these places actually own: two-tops
    // along the rail where you sit alone with a tray, four-tops in the body of the room, and a
    // couple of six-tops at the far end for the families the carousel downstairs is full of.
    // Nothing is on a grid pitch — the clusters are set out by hand, and being able to see the
    // floor between them is what stops the room reading as storage.
    //
    // x runs from about 8.6 (the void rail) to 19.6 (the stall counters); the gangway is the strip
    // around x 15.5 and is left clear the whole length. The stall-side row is held at x ≤ 17.5 so
    // a pushed-back chair (which reaches ~1.12 m from the table centre) stays clear of the counter
    // front at x ≈ 19.16 — the old row at x 18.3–19.0 had chairs intersecting the counters.
    const TABLES=[
      // two-tops along the void rail, turned so the tray faces the atrium
      [ 9.5,-11.6, 2,.40],[ 9.4, -8.6, 2,.40],[ 9.6, -5.4, 2,.40],
      [ 9.4, -2.2, 2,.40],[ 9.6,  1.0, 2,.40],[ 9.4,  4.2, 2,.40],[ 9.5,  7.4, 2,.40],
      // the body of the room: four-tops in loose clusters, not rows
      [12.4,-11.0, 4,.52],[12.8, -8.2, 4,.52],[12.2, -5.6, 4,.52],
      [12.9, -2.6, 4,.52],[12.3,  0.2, 4,.52],[12.8,  2.9, 4,.52],[12.2,  5.6, 4,.52],
      [13.0,  8.4, 4,.52],
      [17.5,-10.2, 4,.52],[17.6, -7.0, 4,.52],[17.4, -3.6, 4,.52],
      [17.6,  3.4, 4,.52],[17.4,  6.6, 4,.52],[17.6,  9.4, 4,.52],
      // six-tops at the south end, pulled west of the dedicated lift approach
      [13.0, 11.8, 6,.72],[16.4, 11.6, 6,.72],
    ];
    for(const [tx,tz,n,r] of TABLES) {
      // Four chair colours, warm-led. The comment that used to sit here described "a warm yellow
      // with a leaf green" and the code under it passed fcTeal and fcSage — two greens a shade
      // apart. Eighty-two chairs in one mint colour is the single loudest thing in this room and
      // it reads as a school canteen: a food hall gets its life from the seating being mixed,
      // because the tenants fitted it at different times and nobody ever re-chairs the whole floor.
      //
      // The palette to draw from was already here and unused — six fc* entries defined together
      // and only the two matching greens ever referenced. Coral and yellow lead because a Chinese
      // food court is a warm room: red and gold on every stall sign, wood tops, and the cool
      // colours used sparingly as relief rather than as the ground.
      const b=table(tx,tz,y,'美食广场',n,r,[col.fcCoral,col.yellow,col.fcTeal,col.fcMauve]);
      blockUp(3,b[0],b[1],b[2],b[3]);
    }
    // Eating moves the player into a real chair rather than leaving a seated pose in the gangway.
    const mealSeat=foodSeats.find(s=>s.tag==='美食广场'&&Math.abs(s.y0-y)<.01);
    if(mealSeat) foodThing.seat={at:[mealSeat.x,mealSeat.z],yaw:mealSeat.yaw,seatY:.50};
    // Pendant lamps over the tables. The whole seating field was lit only by the zone ceiling and
    // the distant stall heat-lamps, so every table read as the same flat slab — a warm pool on the
    // wood top, the thing the diner has been doing since its first build, is what makes a food court
    // feel occupied instead of like a furniture showroom after hours. Cloned from diner.js pendant():
    // cord + enamel shade + emissive bulb disc + one real point light.
    // Ceiling is H (13.6); the shade hangs at table-top + ~1.8 m so the bulb is in frame at a seat.
    const fcPendant=(px,pz,index)=>{
      const top=y+2.80;
      const cord=capsule(px,(H+top)/2,pz,.009,H-top,.009,col.charcoal,
        {gloss:.30,tag:'美食广场'});                                                        // flex cord
      const shadePart=taper(px,top,pz,.30,.14,.30,C('#efe9dd'),
        {gloss:.34,tag:'美食广场'});                                                        // enamel shade
      // These used to bloom into white globes from the atrium and bleach the whole level. The
      // shade and the real point light now do the visual work; the bulb itself is only a readable
      // disc. The old 2.4 m square additive pool was visible as rectangular fog on High and was
      // redundant with this point light, so it is deliberately absent at every tier.
      const bulb=litten(cyl(px,top-.09,pz,.085,.04,C('#ffd89c'),
        {mode:1,glow:.30,tag:'美食广场'}),.65);
      const light=ownPublicLight(
        B.light(px,top-.18,pz,[1.00,0.82,0.58],.48,2.2),'decorative');
      for(const p of [cord,shadePart,bulb]){p.mallFoodPendant=index;}
      light.mallFoodPendant=index;
      foodPendantFixtures.push({index,parts:[cord,shadePart,bulb],light});
    };
    // Hung over every third table down the two rows so the pools of light read as a rhythm down the
    // hall, not as a uniform grid of bulbs. Each is the nearest light to its table, so the 8-light
    // budget (ranked by distance to the eye) keeps these and drops the far stall lamps.
    [[9.5,-8.6],[9.6,-2.2],[9.4,4.2],[12.8,-8.2],[12.3,0.2],[12.8,2.9],
     [17.5,-10.2],[17.4,-3.6],[17.6,3.4],[13.0,11.8],[16.4,11.6]]
      .forEach(([px,pz],index)=>fcPendant(px,pz,index));
    // The gangway, laid in a darker stone so the route to the counters reads from the doorway. A
    // food court where the floor is one unbroken white tile has no way of telling you where to walk.
    // Four border strips replace the old lower 2.60 × 25 m rectangle. The pale centre is now the
    // only full field, so 54 m² of opaque stone no longer sits only 2 mm above another opaque slab.
    for(const sx of [-1,1])
      flat(15.5+sx*1.20,y+.022,0,.20,25.0,col.stoneD,
        {mode:0,gloss:.28,tag:'美食广场',...MAT.slab});
    for(const sz of [-1,1])
      flat(15.5,y+.022,sz*12.40,2.20,.20,col.stoneD,
        {mode:0,gloss:.28,tag:'美食广场',...MAT.slab});
    flat(15.5,y+.024,0,2.20,24.6,C('#cfc7b6'),{mode:0,gloss:.30,tag:'美食广场',...MAT.slab});
    trafficScuffs(15.5,y,6.7,0);
    // Bins and a tray-return stand at the end of the gangway, which is the one piece of furniture
    // every food court has and no food court photograph ever includes.
    for(const bz of [-9.0,4.0]) {
      box(15.5,y+.46,bz,1.30,.92,.62,col.charcoal,{hard:true,gloss:.22,tag:'美食广场'});
      box(15.5,y+.94,bz,1.36,.06,.68,col.steel,{hard:true,gloss:.5,tag:'美食广场'});
      for(const o of [-.34,.34])
        box(15.5+o,y+.95,bz,.30,.05,.30,col.black,{hard:true,gloss:.3,tag:'美食广场'});
      // A tray station needs to say what it is from both directions. The header sits directly over
      // the existing carcass, so it adds information without adding another obstacle to the aisle.
      box(15.5,y+1.28,bz,1.24,.50,.12,col.fcCharcoal,{hard:true,gloss:.26,tag:'退餐盘'});
      box(15.5,y+1.50,bz,1.08,.04,.14,col.fcCoral,{hard:true,mode:1,glow:.08,tag:'退餐盘'});
      for(const [oz,yaw] of [[-.07,Math.PI],[.07,0]]) {
        glyphs(15.5,y+1.30,bz+oz,yaw,'退餐盘',{size:.155,gap:.050,color:col.white,mode:1,glow:.05,tag:'退餐盘'});
        glyphs(15.5,y+1.10,bz+oz,yaw,'请分类投放',{size:.090,gap:.030,color:col.goldL,mode:1,glow:.03,tag:'退餐盘'});
      }
      blockUp(3,15.5-.7,15.5+.7,bz-.35,bz+.35);
    }
    // Potted plants down the gangway, in the gaps between the table clusters. A food court with a
    // clear aisle of stone reads as a corridor, which it is not — a low bush every few metres,
    // set to the side of the walk line so a tray still gets through, is what softens the hall and
    // what the reference photograph has at every gap between its tables.
    for(const pz of [-10.4,-6.4,-2.6,1.4,5.4,9.2]) {
      // Offset off the gangway centre (x 15.5) toward the rail (−x) so diners walking to a stall
      // pass on the stall side of the planter, not through the plant.
      const px=14.55;
      const fp=planter(px,pz,.48,y,false,null);
      blockUp(3,fp[0],fp[1],fp[2],fp[3]);
    }
    // A pair of larger planters framing the head of the gangway, by the void rail, where the hall
    // opens off the escalator bridge — the photo's greenery is densest at the entrance.
    for(const [px,pz,s] of [[9.2,-13.0,.64],[9.2,13.0,.64]]) {
      const fp=planter(px,pz,s,y,false,null);
      blockUp(3,fp[0],fp[1],fp[2],fp[3]);
    }

    // ---- 星光电影院. A lobby across the south wing, with the auditorium itself behind the doors
    // at its west end: box office, showtimes board that keeps up with the clock, popcorn, posters,
    // then a raked room with a lit screen you can actually sit down in front of.
    shop('S',-2.0,17.0,{kind:'电影院',floor:3,name:'星光电影院',brand:'STARLIGHT CINEMA',accent:col.redD,
      carpet:col.carpet,fit(A){
        counter(A,2.2,-3.0,4.4,1.00,col.charcoal);
        litten(A.put(2.2,-3.0,.06,4.20,.52,1.44,col.screen,{hard:true,mode:1,glow:.2,tag:'电影院'}),.5);
        A.glyph(2.05,-3.0,2.05,'售票',{size:.26,color:col.goldL,glow:.18,tag:'电影院'});
        // Posters, each with its own colour and a lit surround.
        // A film poster is a dark image with a title block under it in a lit frame — not a sheet of
        // saturated colour. These were a single emissive panel each, and the white title band that
        // was meant to sit on top was built at a *smaller* depth than the panel: on this wall a
        // larger `a` is nearer the concourse, so the band was behind the poster and had never once
        // been visible. Everything is stacked front-to-back properly now.
        for(let i=0;i<4;i++) {
          const b=1.4+i*2.6, cc=[col.blue,col.red,col.violet,col.jade][i];
          A.put(.42,b,.10,2.04,2.74,1.70,col.trim,{hard:true,gloss:.30,tag:'电影院'});        // frame
          litten(A.put(.46,b,.05,1.86,2.54,1.70,tint(cc,.60),
            {hard:true,mode:1,glow:.09,tag:'电影院'}),.25);                                   // lit face
          A.put(.49,b,.02,1.66,1.54,2.06,tint(cc,.34),{hard:true,mode:1,glow:.04,tag:'电影院'}); // artwork
          A.put(.51,b,.02,1.34,.20,1.16,col.cream,{hard:true,mode:1,tag:'电影院'});            // title block
          for(let k=0;k<3;k++)                                                                 // credits
            A.put(.51,b,.015,1.02-k*.20,.045,.94-k*.11,col.stone,{hard:true,mode:1,tag:'电影院'});
        }
        A.stop(.3,.7,.4,8.4);
        // Popcorn counter.
        counter(A,2.2,4.6,4.0,1.00,col.red);
        litten(A.put(2.2,3.9,.55,1.30,.72,1.50,col.goldL,{hard:true,mode:1,glow:.24,tag:'爆米花'}),.6);
        for(let i=0;i<14;i++) A.ball(2.2+Math.sin(i*1.7)*.45,3.9+Math.cos(i*1.7)*.20,
          1.82+((i%3)*.05),.055,.055,.055,col.cream,{mode:7,tag:'爆米花'});
        for(let i=0;i<4;i++) A.taper(2.2,5.4+i*.34,1.42,.24,.42,.24,col.red,{mode:7,tag:'爆米花'});
        // The showtimes board. Every row is built once; the lamp beside the next screening is what
        // moves, so a board that changes through the day costs one glow per row and no rebuilding.
        A.put(1.05,-7.4,.22,5.60,2.60,2.10,col.black,{hard:true,gloss:.24,tag:'排片表'});
        A.glyph(.92,-7.4,3.10,'今日排片',{size:.26,gap:.08,color:col.goldL,glow:.16,tag:'排片表'});
        SHOWS.forEach((s,i)=>{
          const b=-7.4, y=2.52-i*.46;
          A.glyph(.90,b-2.10,y,clock(s.at),{size:.20,gap:.055,color:col.goldL,glow:.08,tag:'排片表'});
          A.glyph(.90,b+.70,y,s.film,{size:.20,gap:.055,color:col.white,glow:.05,tag:'排片表'});
          s.lamp=dynamicVisual(litten(A.put(.88,b-2.62,.05,.16,.16,2.52-i*.46,col.red,
            {hard:true,mode:1,glow:.04,tag:'排片表'}),.3));
        });
        A.th('排片表',1.6,-7.4,'看看几点有电影。','See what time the films are on.',
          '排片 the programme + 表 table.',2.0,2.2);
        A.th('电影院',D+.35,1.0,'今晚有一部新电影。','There is a new film on tonight.',
          '电影 film + 院 venue.',2.4,2.6);
        A.th('爆米花',3.4,4.6,'看电影要买爆米花。','A film needs popcorn.',
          '爆 to burst + 米 rice + 花 flower.',1.8,1.4);
      }});
    buildAuditorium();

    // The arcade takes the north wing, all neon and noise.
    shop('N',-4.0,15.0,{kind:'游戏厅',floor:3,name:'电玩城',brand:'NEON ARCADE',accent:col.violet,
      carpet:col.carpetB,fit(A){
        for(let i=0;i<12;i++) {
          const b=-6.4+(i%6)*2.6, a=1.4+((i/6)|0)*2.0;
          A.put(a,b,1.00,.78,1.76,.90,[col.blue,col.red,col.violet,col.jade][i%4],
            {round:.10,gloss:.24,tag:'游戏厅'});
          litten(A.put(a-.42,b,.05,.76,.62,1.30,col.screen,{hard:true,mode:1,glow:.22,tag:'游戏厅'}),.22);
          // Thirty-six of these, four centimetres each. A glow in this renderer is an additive
          // sprite, not a decal, so what matters is how many there are rather than how big: at
          // glow .36 with a night boost on top they turned the whole floor into a beige fog and
          // nothing behind them could be seen at all. They keep their colour and lose the bloom.
          for(let k=0;k<3;k++) A.put(a-.44,b-.18+k*.18,.04,.04,.04,.68,
            [col.red,col.yellow,col.jade][k],{mode:1,glow:.14,tag:'游戏厅'});
          A.stop(a-.6,a+.6,b-.55,b+.55);
        }
        for(let i=0;i<4;i++) {
          const b=3.2+i*1.5;
          A.put(3.4,b,1.05,1.15,1.25,.63,col.pink,{round:.08,gloss:.26,tag:'娃娃机'});
          A.put(3.4,b,1.05,1.15,.72,1.60,col.glass,{hard:true,mode:1,alpha:.32,gloss:.9,tag:'娃娃机'});
          for(let k=0;k<5;k++) A.ball(3.4-.3+(k%3)*.3,b-.2+((k/3)|0)*.3,1.36,.12,.12,.12,
            [col.yellow,col.jadeL,col.blueL,col.cream,col.orange][k],{mode:7,tag:'娃娃机'});
          litten(A.put(3.4,b,1.20,1.20,.18,2.02,col.violet,{hard:true,mode:1,glow:.20,tag:'娃娃机'}),.22);
          A.stop(2.7,4.1,b-.7,b+.7);
        }
        // Neon on the back wall, because that is what an arcade is made of.
        for(let i=0;i<6;i++) litten(A.put(.30,-6.0+i*2.4,.05,1.80,.10,2.60+((i%2)*.4),
          [col.pink,col.blueL,col.jadeL][i%3],{hard:true,mode:1,glow:.30}),.30);
        // Two of the six neon runs are given real colour to throw, at either end of the wall, so
        // the cabinets in front of them are pink on one side and blue on the other. Six lamps
        // here would only average back to white, which is the opposite of what neon does.
        for(const [b,c] of [[-4.8,[1.00,0.45,0.62]],[4.8,[0.42,0.68,1.00]]]) {
          const p=A.at(.6,b); ownPublicLight(B.light(p[0],A.y0+2.60,p[1],c,.45,2.8),'decorative');
        }
        A.th('游戏厅',D+.35,0,'游戏厅里全是灯和声音。','The arcade is all lights and sound.',
          '游戏 game + 厅 hall.',2.4,2.6);
        A.th('娃娃机',2.2,4.0,'再试一次就能夹到。','One more go and you will get it.',
          '娃娃 doll + 机 machine.',1.8,1.4);
      }});

    // ---- 亲子休息区.  The west shoulder between the arcade and the window gallery was only a
    // route past repeated benches.  This low family room gives the top floor a place for a parent
    // to wait while a child plays without borrowing the arcade's visual noise: celadon upholstery,
    // an oxblood lattice screen and a small siheyuan block table.  It stays west of x -12.2, leaving
    // the full inner circulation lane to the arcade and the atrium untouched.
    const QX=-15.25, QZ=-10.82;
    // A woven border around one centre field avoids two full carpets competing four millimetres
    // apart. Floor cloth also uses restrained relief so its normal map cannot sparkle edge-on.
    for(const sx of [-1,1])
      flat(QX+sx*2.65,y+.030,QZ,.25,3.28,L3.rug,
        {mode:7,gloss:.05,tag:'休息区',...MAT.cloth,nrmAmt:.16});
    for(const sz of [-1,1])
      flat(QX,y+.030,QZ+sz*1.525,5.05,.23,L3.rug,
        {mode:7,gloss:.05,tag:'休息区',...MAT.cloth,nrmAmt:.16});
    flat(QX,y+.034,QZ,5.05,2.82,C('#8c7769'),
      {mode:7,gloss:.05,tag:'休息区',...MAT.cloth,nrmAmt:.16});
    for(const sx of [-1,1]) box(QX+sx*2.48,y+.045,QZ,.055,.018,2.66,L3.brass,
      {hard:true,mode:1,glow:.025,tag:'休息区'});

    // A shallow lattice back rather than a solid wall: it gives the lounge an address while the
    // arcade glow and ceiling remain visible through it in the background.
    for(const sx of [-1,1])
      box(QX+sx*2.49,y+1.16,QZ-1.43,.12,2.18,.12,L3.walnutD,{hard:true,gloss:.22,tag:'休息区',...MAT.timber});
    for(const sy of [-1,1])
      box(QX,y+1.16+sy*1.03,QZ-1.43,5.10,.12,.12,L3.walnutD,{hard:true,gloss:.22,tag:'休息区',...MAT.timber});
    for(let i=-4;i<=4;i++) {
      box(QX+i*.52,y+1.16,QZ-1.35,.045,1.68,.035,L3.walnut,{hard:true,gloss:.24,tag:'休息区',...MAT.timber});
      if(i<4) box(QX+i*.52+.26,y+.76+(Math.abs(i)%2)*.40,QZ-1.34,.48,.045,.035,L3.brass,
        {ry:(i%2?-.35:.35),hard:true,gloss:.38,tag:'休息区'});
    }
    box(QX,y+2.05,QZ-1.30,3.65,.44,.06,L3.ink,{hard:true,gloss:.24,tag:'休息区'});
    glyphs(QX,y+2.10,QZ-1.255,0,'亲子休息区',{size:.205,gap:.065,color:L3.ivory,mode:1,glow:.060,tag:'休息区'});
    glyphs(QX,y+1.84,QZ-1.255,0,'FAMILY LOUNGE',{size:.075,gap:.025,color:L3.brassL,mode:1,glow:.030,tag:'休息区'});

    // Two-seat banquette, with loose cushions rather than another run of landlord benches.
    box(QX-1.25,y+.25,QZ-.73,2.18,.46,.70,L3.walnutD,{round:.10,mode:7,gloss:.08,tag:'休息区',...MAT.cloth});
    box(QX-1.25,y+.50,QZ-.68,2.02,.18,.64,L3.celadon,{round:.11,mode:7,gloss:.06,tag:'休息区',...MAT.cloth});
    box(QX-1.25,y+.91,QZ-1.03,2.04,.76,.17,L3.celadonD,{round:.10,mode:7,gloss:.06,tag:'休息区',...MAT.cloth});
    for(const [dx,c] of [[-.55,L3.ivory],[.05,L3.lacquerL],[.58,L3.brassL]])
      box(QX-1.25+dx,y+.87,QZ-.91,.42,.40,.13,c,{round:.08,mode:7,gloss:.05,tag:'休息区',...MAT.cloth});
    blockUp(3,QX-2.40,QX-.10,QZ-1.22,QZ-.26);

    // A low play table carries a tiny courtyard: four grey-brick wings around a red gate, with
    // loose roof and tree pieces a child can move.  At walking distance it reads as blocks, while
    // the square plan and gate quietly keep the Beijing identity local and specific.
    const PX=QX+1.20, PZ=QZ+.26;
    box(PX,y+.27,PZ,1.38,.46,1.18,L3.walnut,{round:.12,gloss:.20,tag:'休息区',...MAT.timber});
    box(PX,y+.53,PZ,1.30,.08,1.10,L3.ivory,{hard:true,gloss:.28,tag:'休息区'});
    const BRICK=C('#8c8d89'), ROOF=C('#4c555b');
    for(const [dx,dz,w,d] of [[-.40,0,.25,.72],[.40,0,.25,.72],[0,-.32,.56,.20],[0,.32,.56,.20]])
      box(PX+dx,y+.64,PZ+dz,w,.18,d,BRICK,{hard:true,gloss:.15,tag:'休息区'});
    box(PX,y+.68,PZ-.43,.24,.26,.08,L3.lacquerL,{hard:true,gloss:.24,tag:'休息区'});
    for(const dx of [-.40,.40]) box(PX+dx,y+.75,PZ,.30,.08,.78,ROOF,{rz:dx<0?-.18:.18,hard:true,gloss:.16,tag:'休息区'});
    ball(PX+.05,y+.70,PZ+.02,.10,.10,.10,col.greenL,{mode:15,gloss:.10,tag:'休息区'});
    blockUp(3,PX-.78,PX+.78,PZ-.68,PZ+.68);

    // Three soft poufs at the table—small, rounded and deliberately asymmetrical—plus one warm
    // pendant cluster.  Their footprints are blocked individually so the family corner never turns
    // into invisible collision across the rug.
    for(const [sx,sz,c] of [[-.10,.96,L3.lacquerL],[.94,.72,L3.celadon],[-.86,.75,L3.brassL]]) {
      ball(PX+sx,y+.23,PZ+sz,.34,.23,.34,c,{mode:7,gloss:.05,tag:'休息区',...MAT.cloth});
      blockUp(3,PX+sx-.33,PX+sx+.33,PZ+sz-.33,PZ+sz+.33);
    }
    for(const [dx,c] of [[-1.1,L3.lacquerL],[0,L3.ivory],[1.1,L3.celadon]]) {
      capsule(QX+dx,(H+y+3.52)/2,QZ-.05,.010,H-y-3.52,.010,col.charcoal,{gloss:.30,tag:'休息区'});
      taper(QX+dx,y+3.48,QZ-.05,.24,.42,.24,c,{gloss:.24,tag:'休息区'});
      litten(cyl(QX+dx,y+3.26,QZ-.05,.075,.035,C('#ffe0a8'),{mode:1,glow:.16,tag:'休息区'}),.35);
    }
    ownPublicLight(B.light(QX,y+3.05,QZ-.05,[1.00,.82,.60],.42,3.2),'decorative');
    const family=thing('休息区',QX,y+1.80,QZ,'这里有亲子休息区，可以坐一会儿。',
      'This is the family lounge — we can sit for a while.','亲子 means parent and child.',
      {focus:[-12.55,-11.55],reach:3.1});
    family.mallFloor=3;
    family.seat={at:[QX-1.25,QZ-.68],yaw:0,seatY:.59};
    publicClutter(QX-1.05,QZ-.72,y+.62,'bag',0,3);

    // West wing: the quiet side — a glazed wall over the street, benches and planting.
    for(let i=-4;i<=1;i++) {
      litten(box(-RX+.14,y+1.85,i*3.6,.05,3.40,3.30,col.glass,{hard:true,mode:1,alpha:.28,gloss:.88}),.1);
      box(-RX+.18,y+1.85,i*3.6+1.65,.10,3.50,.12,col.steelD,{hard:true,gloss:.5});
    }
    for(const z of [-12.0,-8.4,-4.8,-1.2,2.4]) {
      const b=bench(-RX+1.5,z,'z',y); blockUp(3,b[0],b[1],b[2],b[3]);
      const p=planter(-RX+3.2,z+2.2,.80,y,true); blockUp(3,p[0],p[1],p[2],p[3]);
      // A flowering pot beside each bench — the one spot of colour on this otherwise green-and-glass
      // gallery. Each takes a different hue so the row reads as a mixed border, not as five of the
      // same plant stamped down it.
      const fc=[col.pink,col.orange,col.violet,col.yellow,col.blueL][[ -12.0,-8.4,-4.8,-1.2,2.4].indexOf(z)];
      const fp=planter(-RX+3.2,z-2.2,.62,y,false,fc); blockUp(3,fp[0],fp[1],fp[2],fp[3]);
    }
    publicClutter(-RX+1.50,-8.55,y+.60,'cup',.10,3);
    publicClutter(-RX+1.48,-4.45,y+.60,'phone',-.15,3);
    // Three illuminated Beijing shadowboxes turn the quiet gallery into a small civic art walk.
    // They are only 12 cm proud of the existing window line and have no collider, so the bench
    // route and the view remain exactly as they were while the formerly blank wall gains a story.
    const GALLERY_ART=[
      [-10.2,'京城晨光',C('#325a70'),C('#d49a4c')],
      [ -3.0,'中轴之美',C('#553342'),C('#d6b867')],
      [  4.2,'古都新貌',C('#31564d'),C('#d48358')],
    ];
    for(const [gz,title,sky,sun] of GALLERY_ART) {
      const gx=-RX+.36;
      box(gx,y+2.12,gz,.12,1.74,2.40,col.charcoal,{hard:true,gloss:.22,tag:'北京城市画廊'});
      litten(box(gx+.07,y+2.12,gz,.025,1.52,2.16,sky,{hard:true,mode:1,glow:.035,tag:'北京城市画廊'}),.10);
      // Sun, staggered roofline and a gold horizon: a legible Beijing silhouette at walking speed.
      ball(gx+.09,y+2.46,gz-.62,.025,.15,.15,sun,{hard:true,mode:1,glow:.08,tag:'北京城市画廊'});
      for(let k=0;k<7;k++) {
        const h=.18+((k*5)%4)*.09;
        box(gx+.095,y+1.62+h/2,gz-.72+k*.24,.022,h,.18,C('#172126'),{hard:true,mode:1,tag:'北京城市画廊'});
      }
      box(gx+.10,y+1.60,gz,.022,.035,1.72,col.goldL,{hard:true,mode:1,glow:.06,tag:'北京城市画廊'});
      glyphs(gx+.105,y+2.76,gz,Math.PI/2,title,{size:.145,gap:.046,color:col.cream,mode:1,glow:.06,tag:'北京城市画廊'});
    }
    const art=thing('北京城市画廊',-RX+.55,y+2.10,-3.0,'这组画表现北京从古都到现代城市的变化。',
      'These panels show Beijing growing from the old capital into a modern city.',
      '京城 is a literary name for the capital.',{focus:[-RX+1.35,-3.0],reach:1.8});
    art.mallFloor=3;
    const rest=thing('休息区',-RX+2.4,y+1.20,0,'这边安静，可以坐着看外面。',
      'It is quiet on this side — you can sit and watch the street.',
      '休息 rest + 区 area.',{focus:[-RX+3.3,0],reach:2.1});
    rest.mallFloor=3;
    rest.seat={at:[-RX+1.5,-1.2],yaw:-Math.PI/2,seatY:.59};
    const three=thing('三楼',-VX-1.6,y+1.40,-3.5,'三楼是美食广场和电影院。',
      'The third floor is the food court and the cinema.',
      '三楼 means the third floor.',{focus:[-VX-2.4,-3.5],reach:2.3});
    three.mallFloor=3;
    const br3=thing('天桥',0,y+1.25,1.6,'脚下是玻璃的，往下看有点吓人。',
      'The floor here is glass — looking down is a little frightening.',
      '天 sky + 桥 bridge.',{focus:[0,.7],reach:2.1});
    br3.mallFloor=3;
    for(const f of [2,3]) for(const s of [-1,1]) {
      const yy=DECK[f];
      box(s*(VX-.35),yy+2.70,-.6,.06,1.40,1.20,s<0?col.redD:col.jade,{hard:true,mode:1,glow:.10});
      glyphs(s*(VX-.35)-s*.04,yy+2.78,-.6,s<0?-Math.PI/2:Math.PI/2,f===2?'2F':'3F',
        {size:.36,gap:.08,color:col.white,mode:1,glow:.12});
    }
    // Banners over the food-court end of the deck, hanging from the main ceiling. The third floor is
    // the entertainment level and the one a mall advertises hardest, so these carry the floor's three
    // draws — food, film, games — rather than a generic sale.
    const HB3=H-1.2;
    for(const [x,z,t,sub,c] of [
      [-VX,6,'食','京味食集',L3.lacquer],
      [ VX,6,'影 · 玩','电影 · 街机',L3.celadonD],
    ]) {
      // The old 2.4 m orange/violet sheets were blank from half the ring and hid entire tenant
      // fronts in the overview.  These slimmer lacquer/celadon seals keep the useful moving fabric
      // but carry a real legend on both viewing faces, with brass hems that match the 3F architecture.
      const BW=1.46, BH=1.72;
      const bn=box(x,HB3,z,BW,BH,.06,c,{hard:true,mode:7});
      dynamicVisual(bn); flags.push({p:bn,x,y:HB3,z,w:BW,h:BH,phase:x>0?1:0});
      for(const [oz,yaw] of [[-.071,Math.PI],[.071,0]]) {
        glyphs(x,HB3+.30,z+oz,yaw,t,{size:.235,gap:.07,color:L3.brassL,mode:1,glow:.080,tag:'三楼导视'});
        glyphs(x,HB3-.25,z+oz,yaw,sub,{size:.095,gap:.030,color:L3.ivory,mode:1,glow:.035,tag:'三楼导视'});
      }
      for(const sy of [-1,1])
        box(x,HB3+sy*(BH/2-.10),z,BW-.14,.035,.08,L3.brass,
          {hard:true,mode:1,glow:.035,tag:'三楼导视'});
    }
  }
  // 一号厅 — the auditorium, in the south-west corner of level three behind the lobby. A dark room
  // with a lit screen at one end and six raked rows facing it, entered off the west gallery. The
  // rows are solid and the centre aisle is not, which is how you end up sitting in the middle of
  // the room instead of walking through the seats.
  function buildAuditorium() {
    const y=DECK[3], X0=-22.6, X1=-11.6, Z0=7.0, Z1=17.6;
    const cx=(X0+X1)/2;
    const projectionParts=[];
    const projectionPart=p=>{
      for(const q of [p].flat(Infinity))if(q)projectionParts.push(q);
      return p;
    };
    flat(cx,y+.03,(Z0+Z1)/2,X1-X0-.3,Z1-Z0-.3,C('#4a2226'),{mode:7,gloss:.05,...MAT.cloth});
    box(cx,y+3.95,(Z0+Z1)/2,X1-X0,.20,Z1-Z0,C('#241a1c'),{hard:true,gloss:.08});
    // Walls: the east partition, and the north wall with the doorway cut out of it.
    box(X1,y+1.95,(Z0+Z1)/2,.24,3.90,Z1-Z0,C('#3a2a2c'),{hard:true,gloss:.10});
    for(const [a,b] of [[X0,-18.4],[-15.8,X1]])
      box((a+b)/2,y+1.95,Z0,b-a,3.90,.24,C('#3a2a2c'),{hard:true,gloss:.10});
    blockUp(3,X0,-18.4,Z0-.2,Z0+.2); blockUp(3,-15.8,X1,Z0-.2,Z0+.2);
    blockUp(3,X1-.25,X1+.25,Z0,Z1);
    box(-17.1,y+3.35,Z0,2.60,.90,.26,col.redD,{hard:true,gloss:.24,tag:'电影院'});
    glyphs(-17.1,y+3.35,Z0-.15,Math.PI,'一号厅',{size:.24,gap:.07,color:col.goldL,mode:1,glow:.16,tag:'电影院'});
    litten(box(-15.4,y+2.95,Z0+.20,.44,.24,.06,col.greenL,{hard:true,mode:1,glow:.30}),.4);
    // The screen, in a black surround, with the house lights down. It used to be one nearly-white
    // emissive slab; from every seat it clipped to white and looked like a missing texture. The
    // projection now has a dark picture, a sunset, a Beijing roofline and an actual film title.
    box(cx,y+2.35,Z1-.30,X1-X0-1.0,4.30,.30,col.black,{hard:true,gloss:.10,tag:'银幕'});
    const scr=projectionPart(litten(box(cx,y+2.35,Z1-.50,X1-X0-1.8,3.60,.10,C('#14283b'),
      {hard:true,mode:1,glow:.075,tag:'银幕'}),.18));
    dynamicVisual(scr); leds.push({p:scr,phase:.7});
    const PZ=Z1-.555;
    projectionPart(box(cx,y+1.48,PZ,X1-X0-2.0,1.18,.025,C('#75402e'),
      {hard:true,mode:1,glow:.025,tag:'银幕'}));
    projectionPart(ball(cx-2.90,y+2.78,PZ-.018,.34,.34,.025,C('#d86642'),
      {hard:true,mode:1,glow:.13,tag:'银幕'}));
    // Low, uneven blocks read as Beijing's modern skyline; the stepped centre roof gives it a
    // recognisable traditional anchor without turning the film frame into a diagram.
    for(let k=0;k<13;k++) {
      const h=.28+((k*7)%5)*.13, sx=cx-4.15+k*.69;
      projectionPart(box(sx,y+1.14+h/2,PZ-.025,.52,h,.025,C('#09131c'),
        {hard:true,mode:1,tag:'银幕'}));
      if(k%3===1) projectionPart(box(sx,y+1.22+h*.58,PZ-.04,.08,.04,.018,C('#d5b56c'),
        {hard:true,mode:1,glow:.07,tag:'银幕'}));
    }
    projectionPart(box(cx,y+1.72,PZ-.035,2.20,.10,.025,C('#120d0d'),
      {hard:true,mode:1,tag:'银幕'}));
    projectionPart(box(cx,y+1.82,PZ-.035,1.55,.10,.025,col.redD,
      {hard:true,mode:1,tag:'银幕'}));
    projectionPart(box(cx,y+1.91,PZ-.035,1.12,.09,.025,C('#120d0d'),
      {hard:true,mode:1,tag:'银幕'}));
    for(let k=-2;k<=2;k++) projectionPart(box(cx+k*.28,y+1.48,PZ-.04,.07,.50,.018,
      C('#100c0c'),{hard:true,mode:1,tag:'银幕'}));
    projectionPart(glyphs(cx,y+3.02,PZ-.045,Math.PI,'北京之夜',
      {size:.31,gap:.10,color:col.cream,mode:1,glow:.10,tag:'银幕'}));
    projectionPart(glyphs(cx,y+2.60,PZ-.045,Math.PI,'一座城 · 一段故事',
      {size:.125,gap:.045,color:col.goldL,mode:1,glow:.06,tag:'银幕'}));
    // Projector at the rear of the room: housing, ceiling drop, warm status lamp and the glass
    // lens aimed at the picture.  The display already changes luminance through `leds`; this is
    // the physical source that makes the screen read as a projection rather than a giant TV.
    capsule(cx,y+3.70,Z0+.82,.025,.42,.025,col.steelD,{gloss:.52,tag:'放映机'});
    box(cx,y+3.43,Z0+.82,.62,.28,.72,col.charcoal,{hard:true,gloss:.30,tag:'放映机',...MAT.metal});
    cyl(cx,y+3.43,Z0+1.20,.085,.10,col.steelD,{rx:Math.PI/2,gloss:.62,tag:'放映机'});
    projectionPart(litten(cyl(cx,y+3.43,Z0+1.26,.052,.045,C('#d8e7ff'),
      {rx:Math.PI/2,mode:1,glow:.16,tag:'放映机'}),.28));
    projectionPart(litten(box(cx-.20,y+3.49,Z0+1.19,.045,.035,.02,col.red,
      {hard:true,mode:1,glow:.12,tag:'放映机'}),.22));
    ownPoweredDisplay(projectionParts,'电影院',[10,24],{id:'auditorium-projection'});
    // In a dark room the screen is the only light there is, and everything in front of it should
    // be lit by it — the front rows, the aisle, the carpet. Cool and weak, which is what a
    // picture throwing light back into an auditorium actually looks like.
    ownPublicLight(B.light(cx,y+2.35,Z1-1.60,[0.72,0.80,0.94],.50,3.0),'decorative');
    blockUp(3,X0,X1,Z1-1.0,Z1);
    // Side acoustic panels, speakers and low amber sconces make the side walls read as a fitted
    // auditorium rather than an empty dark shell.
    for(let i=0;i<5;i++) {
      const pz=9.0+i*1.58;
      box(X1-.14,y+2.05,pz,.04,2.60,1.05,C(i%2?'#291a20':'#342025'),{hard:true,mode:7,gloss:.06,tag:'电影院'});
      box(X1-.17,y+2.05,pz,.025,2.28,.035,col.brass||col.gold,{hard:true,gloss:.45,tag:'电影院'});
    }
    for(const sx of [X0+.65,X1-.65]) {
      box(sx,y+3.10,Z1-.72,.48,.72,.34,C('#111419'),{hard:true,gloss:.16,tag:'电影院'});
      box(sx,y+3.10,Z1-.53,.28,.43,.04,C('#252b32'),{hard:true,gloss:.22,tag:'电影院'});
    }
    for(const s of [-1,1]) for(let i=0;i<4;i++)
      litten(box(cx+s*(X1-X0)/2*.98,y+2.30,10.0+i*2.4,.10,.34,.34,C('#e8b06a'),
        {hard:true,mode:1,glow:.16}),.36);
    for(let i=0;i<6;i++) litten(cyl(cx-3.6+i*1.45,y+3.80,11.5,.13,.05,col.cream,
      {mode:1,glow:.14}),.3);
    // Six rows, rising away from the screen, in two blocks either side of the aisle.
    for(let r=0;r<6;r++) {
      const z=15.6-r*1.20, rise=r*.18;
      for(const [bx0,bx1] of [[-21.9,-18.3],[-16.1,-12.4]]) {
        box((bx0+bx1)/2,y+rise/2,z,bx1-bx0,rise+.06,1.20,C('#2f2124'),{hard:true,gloss:.12});
        const n=Math.round((bx1-bx0)/.72), left=bx0<-17;
        for(let i=0;i<n;i++) {
          const sx=bx0+.36+i*((bx1-bx0-.72)/(n-1));
          // Layered ellipsoids give the cushion a waterfall edge and the back a padded shoulder,
          // replacing the old pair of square boxes. The dark shell and headrest keep a real seat
          // silhouette, while the cup rings make the arm ends useful rather than ornamental blocks.
          box(sx,y+rise+.39,z,.58,.15,.56,C('#2a1d21'),{round:.18,mode:7,tag:'座位'});
          ball(sx,y+rise+.47,z-.01,.29,.105,.27,col.redD,{mode:7,gloss:.10,tag:'座位'});
          box(sx,y+rise+.67,z-.31,.54,.64,.11,C('#321e24'),{round:.18,mode:7,tag:'座位'});
          ball(sx,y+rise+.76,z-.34,.28,.34,.075,col.red,{mode:7,gloss:.08,tag:'座位'});
          ball(sx,y+rise+1.01,z-.36,.20,.10,.07,col.redD,{mode:7,gloss:.08,tag:'座位'});
          for(const s of [-1,1]) {
            box(sx+s*.33,y+rise+.52,z,.07,.14,.46,C('#3b2b2e'),{round:.06,mode:7,tag:'座位'});
            cyl(sx+s*.33,y+rise+.61,z-.12,.065,.025,C('#111216'),{gloss:.35,tag:'座位'});
            cyl(sx+s*.33,y+rise+.625,z-.12,.042,.010,col.steelD,{gloss:.55,tag:'座位'});
          }
          // Every seat is its own thing, numbered the way a Chinese cinema numbers them: 排 is the
          // row counting from the screen, 座 is the seat counting from the west wall across both
          // blocks. There was one 座位 for the whole room before, so a ticket could not name
          // anywhere in particular and 电影票 tells you which one is yours was a promise the room
          // could not keep. The aeroplane already works this way — see cabinSeat.
          const num=(left?0:n)+i+1;
          const st=thing('座位',sx,y+rise+.62,z,`我的座位是${r+1}排${num}座。`,
            `My seat is row ${r+1}, seat ${num}.`,
            '座位 is a seat; 电影票 tells you which one is yours.',
            {focus:[sx,z-1.05],reach:1.5});
          st.mallFloor=3; st.mallSeat=`${r+1}排${num}座`;
          st.seat={at:[sx,z],yaw:0,seatY:.47+rise};
        }
      }
      // Aisle-edge lamps and a small row numeral on each riser: enough light to find a seat after
      // the film starts, kept wholly inside the existing clear centre aisle.
      for(const ax of [-18.12,-16.28])
        litten(box(ax,y+rise+.10,z-.54,.20,.08,.035,C('#e4a65e'),{hard:true,mode:1,glow:.12,tag:'电影院'}),.28);
      glyphs(-17.20,y+rise+.11,z-.605,Math.PI,`${r+1}排`,{size:.075,gap:.024,color:col.goldL,mode:1,glow:.04,tag:'电影院'});
      blockUp(3,-21.9,-18.3,z-.62,z+.62); blockUp(3,-16.1,-12.4,z-.62,z+.62);
    }
    const screen=thing('银幕',cx,y+2.35,Z1-.70,'银幕真大，坐后面也看得清。',
      'The screen is huge — you can see it clearly even from the back.',
      '银 silver + 幕 curtain.',{focus:[-17.2,15.0],reach:2.6});
    screen.mallFloor=3;
  }
  build();
  // Every steam source is known now, including those registered by external tenant files during
  // build().  Their puffs spawn below the world and travel upward at runtime, so their packed cull
  // sphere must be placed at the source rather than at that hidden construction position.
  steamRigs.forEach(r=>r.puffs.forEach(q=>{
    if(!q.p.fixed) boundMotion(q.p,r.x,r.y+(r.height||.55)*.5,r.z,(r.height||.55)+(r.spread||.22));
  }));
  // Anything built without a floor of its own belongs to the concourse. Saying so matters now that
  // there are decks directly above it: the north gallery otherwise puts you within arm's reach of
  // the ground-floor exit doors, four metres below your feet.
  B.things.forEach(t=>{ if(!t.mallFloor) t.mallFloor=1; });

  // ---------------------------------------------------------------- collision on the upper decks
  function upperClamp(px,pz,x,z,r,floor) {
    const f=UPPER[floor]?floor:2;
    const zones=UPPER[f], blocks=UPPER_BLOCKS[f];
    const here=zones.filter(q=>px>=q.x0&&px<=q.x1&&pz>=q.z0&&pz<=q.z1);
    let bd=Infinity,bx=x,bz=z;
    for(const q of (here.length?here:zones)) {
      const cx=clamp(x,q.x0+r,q.x1-r),cz=clamp(z,q.z0+r,q.z1-r);
      const d=(cx-x)**2+(cz-z)**2;
      if(d<bd){bd=d;bx=cx;bz=cz;}
    }
    for(const s of blocks) if(bx>s.x0-r&&bx<s.x1+r&&bz>s.z0-r&&bz<s.z1+r) {
      const dl=bx-(s.x0-r),dr=(s.x1+r)-bx,db=bz-(s.z0-r),df=(s.z1+r)-bz;
      const mn=Math.min(dl,dr,db,df);
      if(mn===dl) bx=s.x0-r; else if(mn===dr) bx=s.x1+r;
      else if(mn===db) bz=s.z0-r; else bz=s.z1+r;
    }
    return [bx,bz];
  }

  // ---------------------------------------------------------------- life
  function applyExteriorGrade() {
    if(!exteriorSky)return;
    const target=WEATHER_SKY[lastWeatherKind]||SKY_DAY;
    const weatherK=clamp(Math.max(lastWeatherAmt,lastWeatherCloud*.82,lastWeatherFog*.90,
      lastWeatherLay*.72),0,1);
    for(let i=0;i<3;i++) {
      const day=lerp(SKY_DAY[i],target[i],weatherK);
      exteriorSky.color[i]=lerp(day,SKY_NIGHT[i],nightK);
    }
    exteriorSky.glow=.055-nightK*.035;
  }
  function applySeasonDecor(key) {
    key=SEASON_STYLE[key]?key:'spring';
    if(key===lastSeasonDecor)return;
    lastSeasonDecor=key;
    const style=SEASON_STYLE[key];
    flags.slice(0,2).forEach((f,i)=>{f.p.color=style.banner[i];});
    seasonBannerGlyphs.forEach(q=>{
      const chars=[...Glyphs.need(style.text[q.side])];
      q.parts.forEach((p,i)=>{p.ch=chars[i]||' ';});
    });
    seasonCards.forEach(q=>{q.plate.color=style.card;q.parts.forEach(p=>{p.ch=style.ch;});});
    if(seasonEventPad)seasonEventPad.forEach(p=>{p.color=style.pad;});
  }
  function setNight(k) {
    const next=k*k*(3-2*k);
    // Game time normally stands still while the player walks. Rewriting every lamp with the same
    // value each frame both burns CPU here and invalidates retained instance records for no visual
    // change. The first call still runs so a newly built scene is fully synchronised.
    if(instanceState.night&&Math.abs(next-nightK)<1e-6)return;
    nightK=next; instanceState.night++;
    for(const q of lit) {
      if(q.p._mallPower&&!q.p._mallPower.active)continue;
      q.p.glow=(q.p.glow0===undefined?(q.p.glow0=q.p.glow||0):q.p.glow0)+nightK*q.k*.30;
    }
    applyExteriorGrade();
  }
  // The fountain show's palette. A constant, so it is built once with the scene rather than rebuilt
  // as six fresh arrays on every frame of every day — it was inside tick(), where the day branch
  // allocated it and then never read it. Two call sites below share this one.
  const HUE=[[0.86,0.12,0.62],[0.20,0.55,0.95],[0.95,0.78,0.18],[0.58,0.30,0.90],[0.20,0.85,0.60]];
  function tick(t,P,minutes) {
    const dt=lastTick?clamp(t-lastTick,0,.10):0;
    lastTick=t;
    // The cinema board follows the game clock, not the wall clock: one lamp moves down the list as
    // the day goes on, and the ticket you buy is for whatever is on next.
    if(typeof minutes==='number') { setClock(minutes); lastMinutes=minutes; }
    const wx=(typeof Weather!=='undefined'&&Weather.now)?Weather.now:null;
    applySeasonDecor(wx&&wx.season&&wx.season.key||'spring');
    const reducedMotion=!!(typeof window!=='undefined'&&window.MotionSafety&&
      window.MotionSafety.reduced&&window.MotionSafety.reduced());
    const reflectionTier=typeof Perf!=='undefined'&&Perf.q&&Perf.q.en||'high';
    if(reflectionTier!==lastReflectionTier) {
      lastReflectionTier=reflectionTier;
      reflectionProxies.forEach(q=>{
        const amount=reflectionTier==='basic'?0:reflectionTier==='low'?q.low:
          reflectionTier==='medium'?q.medium:q.high;
        q.p.alpha=.001+amount;q.p.glow=.001+amount*.16;
      });
    }
    const wet=wx?clamp(Number(wx.wet)||0,0,1):0;
    const rain=wx&&(wx.kind==='rain'||wx.kind==='storm')?clamp(Number(wx.amt)||0,0,1):0;
    const weatherKind=wx&&wx.kind||'clear',weatherAmt=wx?clamp(Number(wx.amt)||0,0,1):0,
      weatherCloud=wx?clamp(Number(wx.cloud)||0,0,1):0,
      weatherFog=wx?clamp(Number(wx.fog)||0,0,1):0,
      weatherLay=wx?clamp(Number(wx.lay)||0,0,1):0;
    lastWeatherWind=wx?clamp(Number(wx.wind)||0,0,1.1):.14;
    const mist=clamp(Math.max(weatherFog,weatherKind==='storm'?weatherAmt*.78:0,
      weatherKind==='snow'?weatherAmt*.58:0),0,1);
    // Retained instances only need repacking when weather actually moves. The common case — game
    // time standing still while the player walks — performs two comparisons and no prop writes.
    if(Math.abs(wet-lastWeatherWet)>.005||Math.abs(rain-lastWeatherRain)>.005||
       Math.abs(mist-lastWeatherMist)>.005) {
      lastWeatherWet=wet; lastWeatherRain=rain;lastWeatherMist=mist;
      weatherVisualTransitions++;weatherVisualWrites+=weatherVisuals.length*2;
      weatherVisuals.forEach(q=>{
        const k=q.channel==='rain'?rain:q.channel==='mist'?mist:wet;
        q.p.alpha=q.base+q.amount*k;
        q.p.glow=q.glow0+q.glowAmt*k;
      });
    }
    if(weatherKind!==lastWeatherKind||Math.abs(weatherAmt-lastWeatherAmt)>.005||
       Math.abs(weatherCloud-lastWeatherCloud)>.005||Math.abs(weatherFog-lastWeatherFog)>.005||
       Math.abs(weatherLay-lastWeatherLay)>.005) {
      lastWeatherKind=weatherKind;lastWeatherAmt=weatherAmt;lastWeatherCloud=weatherCloud;
      lastWeatherFog=weatherFog;lastWeatherLay=weatherLay;applyExteriorGrade();
    }
    const clock=typeof minutes==='number'?minutes:lastMinutes;
    const directoryMinute=Math.floor(clockMinute(clock));
    applyFoodTableStates(clock);
    const eventWeekday=weekdayNow();
    if(directoryMinute!==lastDirectoryMinute||eventWeekday!==lastEventWeekday) {
      lastDirectoryMinute=directoryMinute;
      lastEventWeekday=eventWeekday;
      const todayEvents=eventsToday();
      eventBoardLabels.forEach(q=>{
        const e=todayEvents[q.slot];
        if(q.key===e.key)return;
        q.key=e.key;
        const chars=[...Glyphs.need(e.short)];
        q.parts.forEach((p,i)=>{p.ch=chars[i]||' ';});
      });
      eventLamps.forEach(q=>{if(q.slot!==undefined)q.key=todayEvents[q.slot].key;});
      directoryDots.forEach(q=>{
        const phase=shopTradingPhase(clock,q.hours), open=1-phase.closed;
        const c=open>.98?q.c:open>.02?col.goldL:CLOSED_RED;
        q.p.color[0]=c[0];q.p.color[1]=c[1];q.p.color[2]=c[2];
        q.p.glow=open>.98?.085:open>.02?.055:.018;
        q.open=open;q.phase=phase.key;
      });
      const e=eventAt(clock),eventKey=e.active?e.key:'none';
      directoryEventParts.forEach(q=>q.parts.forEach(p=>{
        p.alpha=q.key===eventKey?.98:.001;
        p.glow=q.key===eventKey?.055:.001;
      }));
    }
    if(Math.abs(clock-lastShopMinutes)>.05) {
      lastShopMinutes=clock;
      shopVisualTransitions++;
      shopClosures.forEach(q=>{
        const phase=shopTradingPhase(clock,q.hours),k=phase.closed;
        q.mix=k;q.phase=phase.key;
        const fullyClosed=k>=.985;
        if(q.portal&&q.portal.closed!==fullyClosed) {
          q.portal.closed=fullyClosed;
          instanceState.portal++;
        }
        const travel=ease01(k),h=Math.max(.001,q.height*travel);
        q.shutter.m=q.shutterClosed.slice();
        q.shutter.m[5]=Math.sign(q.shutterClosed[5]||1)*h;
        q.shutter.m[13]=q.top-h*.5;
        q.shutterRail.m=q.railClosed.slice();
        q.shutterRail.m[13]=q.top-h-.01;
        q.shutter.alpha=.001+travel*.94;
        q.shutterRail.alpha=.001+travel*.98;
        if(q.status) {
          const c=phase.closed>.98?CLOSED_RED:phase.closed>.02?col.goldL:col.jadeL;
          q.status.color[0]=c[0];q.status.color[1]=c[1];q.status.color[2]=c[2];
          q.status.glow=phase.closed>.98?.018:phase.closed>.02?.060:.090;
        }
      });
      shopLights.forEach(l=>{
        const phase=shopTradingPhase(clock,l.mallHours),open=1-phase.closed;
        l.mallPhase=phase.key;l.mallOpen=open;
        l.power=l.mallBasePower*(.15+.85*open);
        // Fully closed tenant lights cannot consume one of the renderer's eight submitted slots.
        // During the twenty-minute descent they dim continuously; adjacent and public lamps are
        // not in this ownership list and remain untouched.
        l.on=phase.closed<.98;
      });
      updateDisplayPower(clock);
      const publicPhase=tradingPhase(clock),overnight=publicPhase.key==='overnight';
      publicLights.forEach(l=>{
        const essential=l.mallPublic==='route'||l.mallPublic==='service';
        l.mallPhase=publicPhase.key;
        l.power=l.mallBasePower*(overnight?(essential?.70:.08):1);
        // Decorative lamps leave the submitted pool overnight; the retained fixtures and their
        // low emissive accents stay visible, while route/service lamps retain usable illumination.
        l.on=!overnight||essential;
      });
      afterHoursK=cleanerMix(clock);
      afterHoursVisuals.forEach(q=>{
        q.p.alpha=.001+afterHoursK*q.alpha;
        q.p.glow=q.glow0+afterHoursK*q.glowAmt;
      });
    }
    if(cleanerBeacon&&afterHoursK>.01)
      cleanerBeacon.glow=.02+afterHoursK*(reducedMotion?.19:(.14+.10*(.5+.5*Math.sin(t*3.2))));
    if(cleanerRig) {
      const moving=afterHoursK>.01&&!reducedMotion;
      if(moving) {
        const a=t*.105,dx=Math.sin(a)*.58,dz=Math.sin(a*2)*5.05;
        const T=M.trans(dx,0,dz);
        cleanerRig.parts.forEach(q=>{q.p.m=M.mul(T,q.base);});
        cleanerRig.x=cleanerRig.cx+dx;cleanerRig.z=cleanerRig.cz+dz;
        cleanerRig.moving=true;cleanerRig.reduced=false;
      } else if(cleanerRig.moving||cleanerRig.reduced!==reducedMotion) {
        cleanerRig.parts.forEach(q=>{q.p.m=q.base.slice();});
        cleanerRig.x=cleanerRig.cx;cleanerRig.z=cleanerRig.cz;
        cleanerRig.moving=false;cleanerRig.reduced=reducedMotion;
      }
    }
    const atriumEvent=eventAt(minutes);
    const liveEvent=atriumEvent.active?atriumEvent.key:null;
    const lightGroup=Math.floor(t*.55)%3;
    const eventStage=Math.min(2,Math.floor(atriumEvent.progress*3));
    // Most frames have no live event. The old loop still rewrote every hidden mat, lamp, banner
    // and focal prop on all of those frames. A signature over the only values that can change the
    // retained output makes dormant/frozen state free; the light show keeps its three-beat chase,
    // while reduced motion deliberately removes that time-varying component. Absolute time and
    // clock-derived progress mean re-entry resumes at the correct phase without catch-up state.
    const eventPulse=liveEvent==='lights'&&!reducedMotion?lightGroup:-1;
    const eventSignature=[atriumEvent.key,liveEvent||'none',Math.round(atriumEvent.mix*1000),
      eventStage,eventPulse,reducedMotion?1:0].join('|');
    if(eventSignature!==lastEventVisualSignature) {
      lastEventVisualSignature=eventSignature;eventVisualTransitions++;
      eventParts.forEach(q=>{
        const on=q.key===liveEvent?atriumEvent.mix:0;
        const group=((Math.floor(Math.abs(q.phase||0)*10)%3)+3)%3;
        const beat=q.key==='lights'&&q.chase?(reducedMotion?.72:(group===lightGroup?1:.42)):1;
        const cue=q.stage===null||q.stage===undefined||q.stage===eventStage?1:.035;
        q.p.alpha=.001+on*q.a*beat*cue;
        q.p.glow=.01+on*q.g*beat*cue;
      });
      eventLamps.forEach(q=>{
        const active=q.key===liveEvent, next=!liveEvent&&q.key===atriumEvent.key;
        q.p.alpha=active ? .95 : next ? .62 : .30;
        q.p.glow=.025+(active ? atriumEvent.mix*.28 : next ? .09 : 0);
      });
      eventVisualWrites+=eventParts.length*2+eventLamps.length*2;
    }
    jets.forEach((j,i)=>{
      const pulse=.82+Math.sin(t*2.1+i*.7)*.16;
      j.p.alpha=.20+pulse*.14;
      j.p.m=M.mul(M.trans(j.x,.72+(pulse-.8)*.14,j.z),
        M.mul(M.rotZ(Math.sin(j.a)*.30),M.mul(M.rotX(Math.cos(j.a)*.30),M.scale(.017,.62*pulse,.017))));
      j.p.cx=j.x;j.p.cy=.78;j.p.cz=j.z;
    });
    // The fountain's night show. By day (nightK 0) every jet is plain water and the basin lamps are
    // off, so the daylight shots are exactly as they were. As the room darkens the lamps come up and
    // each one takes a colour that walks the spectrum: the lamp at jet i is at hue (t*.06 + i/20),
    // so the ring is always a full colour wheel turning slowly round the fountain. The jets take a
    // softer version of their lamp's hue, which is what makes the water look lit from below rather
    // than painted. `nightK` gates both the brightness and how far the colour has saturated, so the
    // show fades in with the dusk instead of snapping on at lights-out.
    const showK=Math.max(nightK,liveEvent==='lights'?atriumEvent.mix:0);
    for(const {lamp,beam,i} of fount) {
      if(showK<.02){
        // Day: lamps off, jets plain water. Restoring both keeps a dusk→dawn clock reversal from
        // leaving last night's tint frozen in the jets.
        lamp.a=0; beam.a=0;
        const j0=jets[i];
        j0.p.color[0]=col.water[0]; j0.p.color[1]=col.water[1]; j0.p.color[2]=col.water[2];
        continue;
      }
      const c=HUE[(Math.floor(t*.06+i/20*HUE.length)+i)%HUE.length];
      const sat=showK;
      lamp.color[0]=c[0]*sat+col.water[0]*(1-sat);
      lamp.color[1]=c[1]*sat+col.water[1]*(1-sat);
      lamp.color[2]=c[2]*sat+col.water[2]*(1-sat);
      beam.color[0]=lamp.color[0]; beam.color[1]=lamp.color[1]; beam.color[2]=lamp.color[2];
      const throb=.30+.24*Math.sin(t*1.3+i*.9);
      lamp.a=showK*(.26+throb*.24);
      // The beam is fainter — it is a shaft of the same light rising through the jet, not a second
      // source. Tall and slim so it clears the basin rim without washing the whole fountain out.
      beam.a=showK*(.12+throb*.10);
      // Tint the jet rising above this lamp toward the same colour, more faintly — the water is
      // carrying the light up, not being dyed. jets[i] corresponds to fount[i] one-to-one.
      const j=jets[i];
      const s=showK*.55;
      j.p.color[0]=c[0]*s+col.water[0]*(1-s);
      j.p.color[1]=c[1]*s+col.water[1]*(1-s);
      j.p.color[2]=c[2]*s+col.water[2]*(1-s);
    }
    // The basin as a whole takes a slow wash of its own — a different hue from any single jet, so
    // the water reads as lit water rather than as twenty separate spots. By day this is the plain
    // teal pool it always was.
    if(basinGlow) {
      if(showK<.02){
        basinGlow.color[0]=col.water[0]; basinGlow.color[1]=col.water[1]; basinGlow.color[2]=col.water[2];
        basinGlow.a=.05;
      } else {
        const c=HUE[(Math.floor(t*.04)+3)%HUE.length];
        basinGlow.color[0]=c[0]*showK+col.water[0]*(1-showK);
        basinGlow.color[1]=c[1]*showK+col.water[1]*(1-showK);
        basinGlow.color[2]=c[2]*showK+col.water[2]*(1-showK);
        basinGlow.a=.05+showK*.18;
      }
    }
    // A sheet of water is continuous; a gentle traveling highlight around each bowl gives that
    // motion without translating thirty-six transparent primitives or changing their collision.
    waterfalls.forEach((w,i)=>{
      const travel=.5+.5*Math.sin(t*3.0+w.phase*8.0+i*.37);
      w.p.alpha=.24+travel*.18;
    });
    leds.forEach(l=>{
      if(l.p._mallPower&&!l.p._mallPower.active)return;
      l.p.glow=.12+(.5+.5*Math.sin(t*1.8+l.phase))*.22+nightK*.16;
    });
    carouselBulbs.forEach((b,i)=>{
      const chase=((t*.55+b.phase)%1+1)%1;
      const head=Math.max(0,1-Math.abs(chase-.16)*7.0);
      b.p.glow=.20+head*.28+nightK*.14;
    });
    carousel.forEach((h,i)=>{
      const a=h.a+t*.34, x=h.cx+Math.sin(a)*h.r, z=h.cz+Math.cos(a)*h.r;
      // Hooves near the deck at the bottom of the bob. The platform top is y .32 and the legs
      // hang .58 below the barrel, so a base much over 1.0 leaves the horses wading in air.
      const bob=Math.sin(t*1.7+i*1.05)*.19, base=1.02+bob;
      // Outward along the radius, and across it. One path for every piece of the horse.
      const sa=Math.sin(a), ca=Math.cos(a);
      for(const q of h.parts) {
        const px=x+sa*q.f+ca*q.l, pz=z+ca*q.f-sa*q.l, py=base+q.u;
        q.p.m=M.trs(px,py,pz,a,q.sx,q.sy,q.sz);
        q.p.cx=px;q.p.cy=py;q.p.cz=pz;
      }
      h.pole.m=M.trs(x,2.10,z,0,.03,1.90,.03);
      h.pole.cx=x;h.pole.cy=2.10;h.pole.cz=z;
    });
    const reduced=reducedMotion;
    const windK=reduced?0:clamp((lastWeatherWind-.14)/.86,0,1);
    if(windK>.001) {
      windRested=false;
      flags.forEach(f=>{
        const sw=Math.sin(t*(.45+windK*.75)+f.phase)*.055*windK;
        f.p.m=M.mul(M.trans(f.x,f.y,f.z),M.mul(M.rotZ(sw),M.scale(f.w,f.h,.06)));
      });
      windParts.forEach(q=>{
        const a=Math.sin(t*(q.kind==='tree'?1.1:1.7)+q.phase)*windK;
        const d=(q.kind==='tree'?.075:.035)*a;
        q.p.m=M.trs(q.x+d,q.y+(q.kind==='umbrella'?Math.abs(d)*.20:0),q.z+d*.28,0,
          q.sx,q.sy,q.sz);
      });
    } else if(!windRested) {
      windRested=true;
      flags.forEach(f=>{f.p.m=M.trs(f.x,f.y,f.z,0,f.w,f.h,.06);});
      windParts.forEach(q=>{q.p.m=M.trs(q.x,q.y,q.z,0,q.sx,q.sy,q.sz);});
    }
    // Steam off the hot counters. Each rig is a source point with N puffs; a puff's `u` runs 0→1
    // around the loop at its own phase offset, and its height/spread/alpha all follow `u` so the
    // column rises and thins the way real steam does, not as a synchronous blink. The hall is a
    // bright atrium (unlike the enclosed diner), so the puffs run hotter than the diner's and peak
    // high in alpha or they read as nothing against the day-lit back wall.
    steamRigs.forEach(r=>{
      r.puffs.forEach((pf,idx)=>{
        const raw=((pf.phase+(r.phase||0)+t*(r.speed||.16))%1+1)%1;
        const duty=r.duty===undefined?1:r.duty, on=raw<duty, u=on?raw/duty:0;
        const spread=r.spread||.22, height=r.height||.55;
        const drift=Math.sin(u*5.5+idx*2.1)*spread*.28*u; // a little curl as it rises
        const yy=r.y+u*height, sc=.06+u*spread, a=on?Math.sin(u*Math.PI)*(r.alpha||.55):0;
        pf.p.m=M.trs(r.x+drift,yy,r.z+drift*.7,0,sc,sc,sc);
        pf.p.cx=r.x+drift; pf.p.cy=yy; pf.p.cz=r.z+drift*.7;
        pf.p.alpha=a;
      });
    });
    // The lift car works its way up and down the shaft, pausing at each level.
    lifts.forEach(L=>{
      const cyc=(t*.055)%1, stop3=Math.floor(cyc*6)%6;
      const seq=[0,DECK[2],DECK[2],DECK[3],DECK[3],0];
      const from=seq[stop3], to=seq[(stop3+1)%6];
      const u=clamp((cyc*6-stop3)*1.35-.15,0,1), e=u*u*(3-2*u);
      const yy=lerp(from,to,e);
      const dir=to>from?1:to<from?-1:0;
      L.floor=yy<DECK[2]*.5?1:yy<(DECK[2]+DECK[3])*.5?2:3;
      L.direction=dir;
      L.car.m=M.trs(L.x,yy+1.15,L.z,0,2.55,2.30,2.10);
      L.car.cx=L.x;L.car.cy=yy+1.15;L.car.cz=L.z;
      L.floorPan.m=M.trs(L.x,yy+.04,L.z,0,2.55,.14,2.10);
      L.floorPan.cx=L.x;L.floorPan.cy=yy+.04;L.floorPan.cz=L.z;
      L.roof.m=M.trs(L.x,yy+2.30,L.z,0,2.55,.16,2.10);
      L.roof.cx=L.x;L.roof.cy=yy+2.30;L.roof.cz=L.z;
      liftIndicators.forEach(q=>{
        q.up.alpha=dir>0?.96:.10;q.up.glow=dir>0?.12:.02;
        q.down.alpha=dir<0?.96:.10;q.down.glow=dir<0?.12:.02;
      });
    });
    steps.forEach(s=>{
      const u=((s.phase+t*.105*s.lane.dir)%1+1)%1, q=stepAt(s.bank,u);
      s.p.m=M.trs(s.lane.x,q.y,q.z,0,.70,.12,.38);
      s.p.cx=s.lane.x;s.p.cy=q.y;s.p.cz=q.z;s.p.alpha=.04+q.show*.96;
      s.edge.m=M.trs(s.lane.x,q.y+.07,q.z-.16,0,.65,.025,.038);
      s.edge.cx=s.lane.x;s.edge.cy=q.y+.07;s.edge.cz=q.z-.16;s.edge.alpha=.03+q.show*.97;
    });
    if(!reduced||!handrailReducedRested) {
      handrailMarks.forEach(h=>{
        // Reduced motion parks the four markers at their authored phase. The route stays coloured
        // and legible, but the bright beads no longer chase the handrail; ordinary mode resumes
        // from absolute time on the next frame, with no accumulated phase to catch up.
        const u=reduced?h.phase:((h.phase+t*.105*h.lane.dir)%1+1)%1, q=stepAt(h.bank,u);
        const x=h.lane.x+h.side*.44, y=q.y+.78;
        h.p.m=M.trs(x,y,q.z,0,.09,.09,.09);
        h.p.cx=x; h.p.cy=y; h.p.cz=q.z;
        h.p.alpha=.02+q.show*.82;
        h.p.glow=.04+q.show*(.08+nightK*.08);
      });
      handrailVisualWrites+=handrailMarks.length*5;
      handrailReducedRested=reduced;
    }
    // The entrance opens while somebody approaches on the ground floor and closes after they
    // leave the sensor zone.  Collision already reserves the full opening, so this changes only
    // the two leaves and handles; the transfer hotspot and its focus remain exactly where saves
    // and interactions expect them.  The streetscape outside is real scene geometry, not a dark
    // backing plane revealed by the opening.
    const doorWants=playerFloor===1&&P&&typeof P.x==='number'&&Math.abs(P.x)<3.4&&P.z<-13.6;
    entranceOpen=clamp(entranceOpen+(doorWants?1:-1)*dt*2.5,0,1);
    const doorEase=entranceOpen*entranceOpen*(3-2*entranceOpen);
    entranceDoors.forEach(d=>{
      const x=d.side*(.73+.74*doorEase);
      d.p.m=M.trs(x,1.45,-RZ+.27,0,1.34,2.80,.07);
      d.handle.m=M.trs(d.side*(.16+.74*doorEase),1.40,-RZ+.36,0,.028,.54,.028);
      d.decal.m=M.trs(x,1.15,-RZ+.315,0,.58,.065,.018);
      d.smear.m[12]=x;
    });
    // Tenant callbacks are intentionally last among visual systems: all of them receive the same
    // absolute clock and current lighting mix, while their update cost disappears off-floor or
    // beyond their own conservative range.
    activeTenantMotions=0;
    tenantSkippedMotions=0;
    for(const q of MallFitTick) {
      const near=!P||typeof P.x!=='number'||((P.x-q.x)**2+(P.z-q.z)**2<=q.far*q.far);
      if(q.always||(q.floor===playerFloor&&near)) {
        q.fn(t,q.state,P,minutes,nightK); activeTenantMotions++;
      } else tenantSkippedMotions++;
    }
    // The loudspeaker, on the same contract the platform uses: the room decides when it has
    // something to say and hands game.js a key, and game.js hands that to the horn. Time comes in
    // as the frame clock, so this is real seconds and does not race the day/night clock.
    //
    // The first one waits a while. Walking through a door and being talked at immediately reads as
    // a trigger rather than as a building, and the door cue is already playing at that moment.
    if (paAt === 0) paAt = t + PA_FIRST;
    if (t >= paAt) {
      paAt = t + PA_EVERY;
      // Not `NOTICE_ORDER[paTurn++ % …]` any more: two of the nine are dated and only true on one
      // weekday. See NOTICE_DAY.
      const key = nextNotice();
      if (key) return 'mall:' + key;
    }
  }

  // Lighting. The renderer gives an interior one lamp, which is enough for a flat and nowhere near
  // enough for a hall 46 metres across: fixing it to the middle left the far corners black, and
  // pinning it to the nearest of a grid of sixteen points still left a shopfront seven metres from
  // its own lamp in the dark. So the lamp rides above the body, on the deck the body is standing
  // on. Nobody can see where a light in a ceiling of coffers and downlights is coming from, and
  // every corner of the building is now somewhere you can actually see.
  const ROOM={id:'atrium',x0:-RX,x1:RX,z0:-RZ,z1:RZ,light:[0,3.6,0],bulb:.42};

  // ---------------------------------------------------------------- 商场广播 what the mall says
  // A shopping centre talks to you constantly and about almost nothing, and that is exactly what
  // makes it worth putting in a game about learning a language: the sentences are short, the
  // register never changes, and the same twenty words come round again every few minutes until you
  // have them. A boarding call you have to understand or miss a plane is one kind of listening
  // practice. This is the other kind — the kind you overhear.
  //
  // Three sorts of thing get said, because three sorts of thing get said in a real mall:
  //
  //   open:  a shop that is not open yet. Retail announces arrivals months ahead, and this is the
  //          register a Beijing mall in this decade actually announces them in — a flagship in
  //          Shanghai, another off 三里屯, which is the address every brand in the country wants.
  //
  //          Every brand and every mall named here is invented, and has to stay that way. This
  //          block previously advertised two real trademarked companies and two real developments
  //          by name, in both the Chinese and the English, and the lines were baked to voice, so
  //          the building said them out loud. 三里屯 and 静安 are kept because they are districts —
  //          geography, not anybody's mark.
  //   promo: price and product. 万家惠 is a cheap supermarket and trades on being cheap, so its
  //          announcements are about numbers, which is the most useful thing a beginner can be made
  //          to listen to over and over. It has no unit in the building yet, so every line about it
  //          is future tense: a mall that promises a shop it does not have is a mall that lies to
  //          the player, and the PA is meant to be the one thing here you can trust.
  //   event: the mall as something other than shops. Classes, a run club, a wellness floor — the
  //          announcements that tell you a mall here is where people spend a Saturday.
  //
  // Keyed the way `Airport.NOTICES` is, because `.dumplines.js` reads both the same way and the
  // bake turns each value into a clip without anybody writing the line down twice.
  const NOTICES = {
    'open:yd:sh':  '各位顾客请注意，瑜伽品牌云动全新旗舰店即将入驻上海静安云汇中心，敬请期待。',
    'open:yd:bj':  '云动北京三里屯新光里旗舰店本月开业，开业当天前一百位顾客可获赠精美礼品。',
    'open:soon':   '本商场三楼新店即将开业，装修期间给您带来不便，敬请谅解。',
    'open:mkt':    '万家惠超市即将进驻本商场二楼，开业时间请留意店内公告。',
    'promo:price': '万家惠超市开业当天特价商品九块九起，数量有限，先到先得。',
    'promo:drop':  '各位顾客，万家惠超市开业当天设有新品试吃，欢迎前来。',
    'event:class': '本周六上午十点，商场中庭举办免费健身课程，欢迎大家报名参加。',
    'event:run':   '跑步俱乐部每周三晚上七点在一楼大门集合，欢迎新朋友加入。',
    'event:well':  '三楼健康生活体验区正在筹备中，开放后可以免费体验体质测试和瑜伽课程。',
  };
  // The English, for the notice that goes up on screen beside the voice. The airport does without
  // one because a boarding call is a thing you act on and the game can tell whether you understood
  // it by whether you got on the plane. Nothing here is actionable, so an announcement you did not
  // follow teaches nothing at all unless it is glossed.
  const NOTICE_EN = {
    'open:yd:sh':  'Attention shoppers: the yoga brand Yundong will soon open a new flagship at Shanghai Jing’an Yunhui Centre. Watch this space.',
    'open:yd:bj':  'Yundong’s Beijing Sanlitun Xinguangli flagship opens this month. The first hundred customers on opening day receive a gift.',
    'open:soon':   'A new shop on the third floor opens shortly. We apologise for the disruption while the work is finished.',
    'open:mkt':    'Wanjiahui supermarket will open on the second floor of this centre. Watch in store for the opening date.',
    'promo:price': 'On Wanjiahui’s opening day, specials start at 9.9 yuan, while stocks last.',
    'promo:drop':  'Shoppers: there will be tasting of the new lines at Wanjiahui on opening day. Do come along.',
    'event:class': 'This Saturday at ten in the morning there is a free fitness class in the atrium. Everyone is welcome to sign up.',
    'event:run':   'The running club meets at seven on Wednesday evenings by the ground-floor doors. New members welcome.',
    'event:well':  'The healthy-living area on the third floor is being fitted out. When it opens there will be free fitness testing and yoga classes.',
  };
  // The order they come round in. Deliberately not random: a mall loops a playlist of announcements,
  // and a learner who hears the same nine in the same order is a learner who starts predicting the
  // next one, which is the point at which they have stopped translating and started listening.
  const NOTICE_ORDER = ['open:mkt', 'event:class', 'open:yd:sh', 'promo:price', 'event:run',
                        'open:yd:bj', 'promo:drop', 'event:well', 'open:soon'];
  // Two of the nine name a day of the week and until now both played on all seven of them. A mall
  // that announces 本周六 on a Tuesday is not a building talking, it is a tape loop; and for a
  // learner it is worse than untidy, because 本周六 and 每周三 are the two phrases in this whole
  // set whose meaning is supposed to be picked up from the day it is said on.
  //
  // The calendar is the game's own. `day` in game.js is a bare counter starting at 1, and
  // js/career.js is what turns it into a week: `Career.weekday(day).i` is 0 for Monday through 6
  // for Sunday, the same function that decides whether the office is open. The day reaches this
  // file through Weather, which game.js hands `day` on every frame and which keeps it on
  // `Weather.now.day` — a scene's `tick` is given the minute of the day and not the day, so this
  // is the shortest honest route to the real calendar rather than a second counter of our own.
  const NOTICE_DAY = { 'event:class': 5, 'event:run': 2 };      // 星期六, 星期三
  // -1 means "no calendar available, do not gate". Both lookups are guarded so that with either
  // module absent the loudspeaker keeps talking exactly as it did before rather than going quiet.
  function weekdayNow() {
    const d = (typeof Weather !== 'undefined' && Weather.now && Number(Weather.now.day)) || 0;
    if (!d || typeof Career === 'undefined' || !Career.weekday) return -1;
    return Career.weekday(d).i;
  }
  // The next announcement that is true today. Nothing is dropped from the loop and nothing is
  // reordered: `paTurn` still walks NOTICE_ORDER one step per announcement, and a dated line is
  // simply stepped over on the days it would be a lie. So the run club is what you hear on a
  // Wednesday, and on a Thursday you hear the line that follows it.
  function nextNotice() {
    const wd = weekdayNow();
    for (let i = 0; i < NOTICE_ORDER.length; i++) {
      const key = NOTICE_ORDER[paTurn++ % NOTICE_ORDER.length];
      const on = NOTICE_DAY[key];
      if (on === undefined || wd < 0 || wd === on) return key;
    }
    return null;   // unreachable while seven of the nine are ungated. A guard, not a case.
  }
  // Roughly one announcement every two minutes of real time, which is about the rate a mall
  // actually talks and slow enough that the record is what you are mostly listening to.
  const PA_FIRST = 26, PA_EVERY = 118;
  let paAt = 0, paTurn = 0;

  // ---------------------------------------------------------------- 广告 the adverts
  // Not the same thing as the announcements above, and they do not sound the same either. An
  // announcement is the building talking about itself — where a class is, when a shop opens. An
  // advert is somebody selling you something, and in Chinese as in English that means a shorter
  // sentence, a brand name in it, a number, and an imperative at the end. Putting both in the mall
  // is most of what makes it sound like a mall rather than a station with shops in it.
  //
  // These play in the gap at the end of a record, which is where radio and shopping centres have
  // always put them, and it is a good gap for a learner too: nothing else is competing, the
  // sentence is four seconds long, and the same six come round often enough to be learnable.
  const ADS = {
    'ad:mkt':    '万家惠，天天低价。二楼万家惠超市即将开业，好货不贵，敬请期待。',
    'ad:yd':     '云动，即将登陆三里屯新光里。瑜伽服、运动装，开业当天八折。',
    'ad:cinema': '三楼电影院，今日新片上映。学生凭证件半价，请到售票处购票。',
    'ad:food':   '美食广场，五家风味餐厅任您选择。中午十二点前用餐，饮料免费。',
    'ad:books':  '书店春季书展开始了。中文书籍买二送一，二楼书店等您来。',
    'ad:arcade': '游戏厅新机到店，充值一百送二十。三楼游戏厅，欢迎体验。',
  };
  const AD_EN = {
    'ad:mkt':    'Wanjiahui — low prices every day. Wanjiahui supermarket opens soon on the second floor: good things, not dear. Watch this space.',
    'ad:yd':     'Yundong, arriving soon at Sanlitun Xinguangli. Yoga wear and sportswear, twenty per cent off on opening day.',
    'ad:cinema': 'Third-floor cinema, new releases showing today. Students half price with ID — buy at the ticket desk.',
    'ad:food':   'The food court: five kitchens to choose from. Eat before noon and your drink is free.',
    'ad:books':  'The bookshop\u2019s spring book fair has started. Chinese books, buy two get one free, second floor.',
    'ad:arcade': 'New machines at the arcade. Top up a hundred and get twenty free. Third floor — come and try.',
  };
  const AD_ORDER = ['ad:mkt', 'ad:cinema', 'ad:yd', 'ad:food', 'ad:arcade', 'ad:books'];
  let adTurn = 0;
  // The next advert, and which one that is depends only on how many have played. Deliberately not
  // random and deliberately not tied to the song: a shop's advertising is a loop, and hearing the
  // sixth one and knowing the first is coming back is the point at which a learner has the set.
  function nextAd() {
    const key = AD_ORDER[adTurn++ % AD_ORDER.length];
    return { key, zh: ADS[key], en: AD_EN[key] };
  }

  function shopAt(f,x,z) {
    const q=shopAreas.find(a=>a.floor===(Number(f)||1)&&x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1);
    return q&&{kind:q.kind,floor:q.floor,hours:q.hours.slice(),
      bounds:[q.x0,q.x1,q.z0,q.z1]};
  }

  // ---------------------------------------------------------------- conservative shop portals
  // Reason codes stay numeric in the hot path. They become named, serialisable counts only when a
  // diagnostic asks for the completed frame. Code zero is deliberately a candidate that remains
  // visible; unmarked shell/window props never enter the counter at all.
  const PORTAL_REASON=['visible','closed-door','off-angle-side','off-angle-height'];
  const emptyPortalCounts=reuse=>{
    const q=reuse||{candidate:0,hidden:0,visible:0,
      reasons:new Uint32Array(PORTAL_REASON.length-1),shops:new Uint32Array(shopPortals.length*6)};
    q.candidate=0;q.hidden=0;q.visible=0;q.reasons.fill(0);q.shops.fill(0);return q;
  };
  const mergePortalCounts=(into,from)=>{
    if(!from)return into;
    into.candidate+=from.candidate;into.hidden+=from.hidden;into.visible+=from.visible;
    for(let i=0;i<into.reasons.length;i++)into.reasons[i]+=from.reasons[i];
    for(let i=0;i<into.shops.length;i++)into.shops[i]+=from.shops[i];
    return into;
  };
  // Classify one marked primitive against one padded storefront aperture. `eye` is the resolved
  // render eye, not the player: camera collision and orbiting are therefore represented exactly.
  // A whole shop is never rejected by floor or distance. Each deep prop must prove that its own
  // eye ray misses the opening, or crosses the opaque centre shutter while that shutter is down.
  const classifyPortalProp=(p,eye,closed)=>{
    const id=p&&p._mallPortal;
    if(!Number.isInteger(id)||!shopPortals[id]||!eye)return 0;
    const q=shopPortals[id],ex=Number(eye[0]),ey=Number(eye[1]),ez=Number(eye[2]);
    if(!Number.isFinite(ex)||!Number.isFinite(ey)||!Number.isFinite(ez))return 0;
    // From inside this exact unit, keep everything — including after closing. A player caught by
    // the clock must not watch the shop hollow out around them.
    if(ey>=q.y0-.55&&ey<=q.y1+.65&&ex>=q.x0-.40&&ex<=q.x1+.40&&
       ez>=q.z0-.40&&ez<=q.z1+.40)return 0;
    const erx=ex-q.x,erz=ez-q.z,eyeDepth=erx*q.nx+erz*q.nz;
    // Both points are on the interior side of the frontage plane. There is no safe aperture
    // inference in that configuration, so retain it.
    if(eyeDepth<=.18)return 0;
    const px=Number(p.cx),py=Number(p.cy),pz=Number(p.cz),r=Math.max(0,Number(p.r)||0);
    if(!Number.isFinite(px)||!Number.isFinite(py)||!Number.isFinite(pz))return 0;
    const prx=px-q.x,prz=pz-q.z,propDepth=prx*q.nx+prz*q.nz;
    // Only clearly deep fit-out participates. Anything at the portal, or whose conservative
    // sphere reaches it, stays to protect silhouettes and animated parts with wide motion bounds.
    if(propDepth>=-.55||propDepth+r>=-.42)return 0;
    const den=eyeDepth-propDepth;
    if(den<=1e-5)return 0;
    const t=eyeDepth/den;
    if(t<=0||t>=1)return 0;
    const eyeB=erx*q.tx+erz*q.tz,propB=prx*q.tx+prz*q.tz;
    const crossB=eyeB+(propB-eyeB)*t,crossY=ey+(py-ey)*t;
    // Full-width glass is the aperture. The generous radius-aware border is larger than the
    // renderer's eight-centimetre visibility cache cell, so a retained prop is already restored
    // before it can reach an edge; there is no grazing-angle pop.
    const sidePad=.52+Math.min(.58,r*.28),heightPad=.42+Math.min(.42,r*.20);
    if(crossB<q.b0-sidePad||crossB>q.b1+sidePad)return 2;
    if(crossY<q.y0-heightPad||crossY>q.y1+heightPad)return 3;
    if(closed&&closed[id]) {
      // Closing is not a blanket rejection. The two flanking bays remain transparent, so only a
      // ray comfortably inside the opaque three-metre centre shutter may disappear. Edge rays
      // stay visible to cover the jamb, shutter tolerance and a prop's own bounding radius.
      const doorPad=.20+Math.min(.28,r*.16),bottom=q.y0+.38+heightPad*.30,
        top=q.y0+3.00-heightPad*.30;
      if(crossB>q.door0+doorPad&&crossB<q.door1-doorPad&&crossY>bottom&&crossY<top)
        return 1;
    }
    return 0;
  };
  const countPortalProp=(stats,p,code)=>{
    const id=p&&p._mallPortal;
    if(!Number.isInteger(id)||!shopPortals[id])return false;
    stats.candidate++;
    const o=id*6;stats.shops[o]++;
    if(code) {
      stats.hidden++;stats.reasons[code-1]++;stats.shops[o+1]++;
      stats.shops[o+2+code]++;
    } else {stats.visible++;stats.shops[o+2]++;}
    return code!==0;
  };
  let portalCullEnabled=true;
  const portalReport=stats=>({
    enabled:portalCullEnabled,inventory:portalProps.length,
    candidate:stats.candidate,hidden:stats.hidden,visible:stats.visible,
    reasons:{'closed-door':stats.reasons[0],'off-angle-side':stats.reasons[1],
      'off-angle-height':stats.reasons[2]},
    shops:shopPortals.map((q,id)=>{const o=id*6;return {kind:q.kind,floor:q.floor,
      inventory:q.candidates,candidate:stats.shops[o],hidden:stats.shops[o+1],
      visible:stats.shops[o+2],reasons:{'closed-door':stats.shops[o+3],
        'off-angle-side':stats.shops[o+4],'off-angle-height':stats.shops[o+5]}};}),
  });
  const runtimePortalCounts=emptyPortalCounts(),runtimePortalClosed=new Uint8Array(shopPortals.length),
    runtimePortalEye=[0,0,0];
  let lastPortalCounts=runtimePortalCounts;
  // Reused once per colour frame: no controller/report/typed-array allocation in the render loop.
  // Batch-local count blocks are retained on their packed batch and reset in place on rebuild.
  const runtimePortalFrame={version:0,total:runtimePortalCounts,
    empty:emptyPortalCounts,
    test(p,stats=runtimePortalCounts){return countPortalProp(stats,p,
      portalCullEnabled?classifyPortalProp(p,runtimePortalEye,runtimePortalClosed):0);},
    merge(stats){mergePortalCounts(runtimePortalCounts,stats);},
    finish(){lastPortalCounts=runtimePortalCounts;return runtimePortalCounts;}};
  const portalCull={
    // Called only for the colour pass. Batch-local counts are retained beside retained instance
    // data, then merged here even on a cache reuse; loose transparent props record directly.
    begin(eye){
      runtimePortalEye[0]=eye[0];runtimePortalEye[1]=eye[1];runtimePortalEye[2]=eye[2];
      shopPortals.forEach((q,i)=>{runtimePortalClosed[i]=q.closed?1:0;});
      emptyPortalCounts(runtimePortalCounts);
      runtimePortalFrame.version=instanceState.portal;
      return runtimePortalFrame;
    },
    // Deterministic VM/source tests use the same classifier over the full marked inventory. This
    // deliberately does not pretend to be a frustum count; the runtime report above is the exact
    // post-frustum candidate/submission count for the most recently painted frame.
    audit(eye,minutes=lastMinutes){
      const closed=new Uint8Array(shopPortals.length);
      shopPortals.forEach((q,i)=>{closed[i]=shopTradingPhase(minutes,q.hours).closed>=.985?1:0;});
      const stats=emptyPortalCounts();
      for(const p of portalProps)countPortalProp(stats,p,
        portalCullEnabled?classifyPortalProp(p,eye,closed):0);
      return portalReport(stats);
    },
    classify(p,eye,minutes=lastMinutes){
      const closed=new Uint8Array(shopPortals.length);
      shopPortals.forEach((q,i)=>{closed[i]=shopTradingPhase(minutes,q.hours).closed>=.985?1:0;});
      const id=p&&p._mallPortal;
      return !Number.isInteger(id)?'not-candidate':PORTAL_REASON[
        portalCullEnabled?classifyPortalProp(p,eye,closed):0];
    },
    // Test/debug-only A/B switch for the five frozen portal truth cameras. Toggling advances the
    // retained generation, so the next frame really repacks on/off instead of reusing the other
    // side's survivors. Production starts enabled and never touches this method.
    setEnabled(value){
      const next=value!==false;
      if(next!==portalCullEnabled){portalCullEnabled=next;instanceState.portal++;}
      return portalCullEnabled;
    },
    report:()=>portalReport(lastPortalCounts),
    metadata:()=>shopPortals.map(q=>({kind:q.kind,floor:q.floor,hours:q.hours.slice(),
      aperture:[q.x,q.z,q.b0,q.b1,q.y0,q.y1],normal:[q.nx,q.nz],tangent:[q.tx,q.tz],
      doorway:[q.door0,q.door1],inventory:q.candidates})),
  };

  function displayPowerState() {
    let parts=0,off=0,essential=0,transitions=0;
    for(const q of poweredDisplays) {
      parts+=q.parts.length;if(!q.active)off++;if(q.essential)essential++;
      transitions+=q.transitions;
    }
    return {groups:poweredDisplays.length,parts,off,essential,transitions,
      owners:poweredDisplays.map(q=>({owner:q.owner,id:q.id,parts:q.parts.length,
        phase:q.phase,essential:q.essential}))};
  }

  // A small, serialisable view of the motion layer for regression tests and the performance HUD.
  // It exposes phases and counts, never thousands of prop objects or matrices.
  function motionState() {
    const tenant={};
    for(const q of MallFitTick) tenant[q.name]={...q.state};
    const tableStates={occupied:0,dirty:0,cleared:0};
    for(const q of foodTableStates) if(tableStates[q.state]!==undefined)tableStates[q.state]++;
    const tableProfile=lastFoodTableProfile||foodTableProfileAt(lastMinutes);
    const phase=tradingPhase(lastMinutes);
    const phaseCounts={};
    for(const q of shopClosures) phaseCounts[q.phase||shopTradingPhase(lastMinutes,q.hours).key]=
      (phaseCounts[q.phase||shopTradingPhase(lastMinutes,q.hours).key]||0)+1;
    return {time:lastTick,floor:playerFloor,night:nightK,jets:jets.length,
      waterfalls:waterfalls.length,carouselMounts:carousel.length,escalatorSteps:steps.length,
      handrailMarks:handrailMarks.length,lifts:lifts.length,entranceOpen,
      liftState:lifts[0]?{floor:lifts[0].floor||1,direction:lifts[0].direction||0,
                          indicators:liftIndicators.length}:null,
      event:{...eventAt(lastMinutes),flow:eventFlowAt(lastMinutes),parts:eventParts.length},
      season:{key:lastSeasonDecor,banners:Math.min(2,flags.length),cards:seasonCards.length,
              pad:!!seasonEventPad},
      exterior:{arrivalParts:exteriorArrivalParts.length,arrivalBudget:35,
                wetSilhouettes:exteriorWetSilhouettes.length,
                wetParts:exteriorWetSilhouettes.reduce((n,q)=>n+q.parts.length,0),
                wetVisible:exteriorWetSilhouettes.filter(q=>q.parts.some(p=>p.alpha>.05)).length},
      reflections:{parts:reflectionProxies.length,tier:lastReflectionTier,
                   active:reflectionProxies.filter(q=>q.p.alpha>.01).length},
      clutter:{clusters:publicClutterClusters.length,parts:publicClutterParts.length,budget:36,
               kinds:[...new Set(publicClutterClusters.map(q=>q.kind))].sort()},
      weather:{kind:lastWeatherKind,amount:lastWeatherAmt,cloud:lastWeatherCloud,fog:lastWeatherFog,
               snow:lastWeatherLay,wet:lastWeatherWet,rain:lastWeatherRain,mist:lastWeatherMist,
               wind:lastWeatherWind,windParts:windParts.length,parts:weatherVisuals.length},
      shops:{closures:shopClosures.length,closed:shopClosures.filter(q=>(q.mix||0)>.5).length,
             phase:phase.key,phases:phaseCounts,afterHours:afterHoursK,
             cleaningParts:afterHoursVisuals.length,lights:shopLights.length,
             lightsOn:shopLights.filter(l=>l.on!==false).length,
             plaques:shopClosures.filter(q=>q.status).length},
      devices:displayPowerState(),
      foodTables:{...tableProfile,states:tableStates,parts:foodTableStates.length*3,
                  transitions:foodTableTransitions,writes:foodTableWrites,
                  minute:lastFoodTableMinute},
      foodLighting:{counters:new Set(foodCounterEmitters.map(p=>p.mallFoodCounter)).size,
                    counterEmitters:foodCounterEmitters.length,counterLights:foodCounterLights.length,
                    pendants:foodPendantFixtures.length,
                    pendantParts:foodPendantFixtures.reduce((n,q)=>n+q.parts.length,0),
                    pendantLights:foodPendantFixtures.filter(q=>q.light).length,
                    additivePendantPools:0},
      guards:{event:{signature:lastEventVisualSignature,transitions:eventVisualTransitions,
                     writes:eventVisualWrites},
              weather:{transitions:weatherVisualTransitions,writes:weatherVisualWrites},
              shops:{transitions:shopVisualTransitions},
              tenants:{active:activeTenantMotions,skipped:tenantSkippedMotions},
              reduced:{on:!!(typeof window!=='undefined'&&window.MotionSafety&&
                window.MotionSafety.reduced&&window.MotionSafety.reduced()),
                windRested,handrailRested:handrailReducedRested,
                handrailWrites:handrailVisualWrites,
                cleanerRested:!cleanerRig||!cleanerRig.moving}},
      cleaner:cleanerRig&&{parts:cleanerRig.parts.length,x:+cleanerRig.x.toFixed(2),
        z:+cleanerRig.z.toFixed(2),moving:cleanerRig.moving,reduced:cleanerRig.reduced},
      directory:{entries:directoryDots.length,open:directoryDots.filter(q=>(q.open||0)>.5).length,
                 event:(eventAt(lastMinutes).active?eventAt(lastMinutes).key:'none'),
                 minute:lastDirectoryMinute},
      publicLights:{total:publicLights.length,on:publicLights.filter(l=>l.on!==false).length,
                    route:publicLights.filter(l=>l.mallPublic==='route').length,
                    service:publicLights.filter(l=>l.mallPublic==='service').length,
                    decorative:publicLights.filter(l=>l.mallPublic==='decorative').length},
      portals:portalCull.report(),
      shopAreas:shopAreas.length,
      steamSources:steamRigs.length,
      tenantRegistered:MallFitTick.length,tenantActive:activeTenantMotions,tenant,
      // The registration audit, beside the motion counts because this is the object every mall
      // harness already reads. `fitsExpected` is the manifest; `fitsMissing` is empty or it is a
      // bug report naming the file that did not load.
      fitsExpected:TENANTS.length,fitsMissing:tenantMissing.slice()};
  }

  return B.finish({setNight,tick,escalatorPose,rideFloor,clampUpper:upperClamp,instanceState,
    nextShow,setClock,SHOWS,EVENTS,EVENT_PROGRAMS,EVENT_WEEK,eventsForWeekday,eventsToday,
    eventAt,eventFlowAt,SHOP_HOURS,TENANT_LIGHT,tenantLightColor,
    tradingPhase,shopTradingPhase,cleanerMix,foodTableProfileAt,foodTableStateAt,
    shopAt,displayPowerState,portalCull,
    windowOwnership:()=>shopWindowRoutes.map(q=>({...q})),
    NOTICES, NOTICE_EN, NOTICE_ORDER,
    // Which announcements only hold on one weekday, what the room thinks today is, and the picker
    // itself. All three exported so a harness can assert the gate directly — drive `Weather` to a
    // Wednesday and call `nextNotice()` twenty times — rather than sitting through forty minutes of
    // PA to see whether 本周六 comes round on a Tuesday.
    NOTICE_DAY, weekdayNow, nextNotice,
    ADS, AD_EN, AD_ORDER, nextAd,
    foodSeats,foodStaff,motionState,
    // The tenant manifest and whether it is satisfied, for a harness that wants to fail a build
    // rather than read a console line. `missing` is empty in a healthy tree.
    tenants:()=>({expected:TENANTS.map(t=>t[0]),floors:TENANTS.map(t=>t[1]),
                  missing:tenantMissing.slice()}),
    level:()=>playerFloor, setFloor:n=>{playerFloor=n>=3?3:n===2?2:1;},
    deckY:f=>DECK[f]||0, banks:BANKS, RX,RZ,H,WIN,OUT,
    label:'购物中心',labelK:'购物中心 · shopping mall',indoor:true,
    // The AO radius is in *screen* units, not world ones, so what it costs in metres depends on how
    // far away the geometry is. Every other indoor scene here is a room you can cross in four
    // paces, and the 0.26 indoor default is tuned for those; this is a hall 46 by 36 with a far
    // plane at 85, so the same radius reached across metres of wall and resolved as soft grey
    // blotches a table wide on every flat surface in the building. They read as dirt, or as cloud,
    // and they were in every interior shot — switching AO off in NI2-noao removes them completely,
    // which is what identified them. Small enough here to sit in the corners, where AO belongs.
    cutaway:true,near:.06,far:85,expose:1.08,aoRadius:.13,aoAmt:.32,bloom:.40,
    camera:{dist:6.25,pitch:.22,lookY:1.42},spawn:{x:0,z:-RZ+2.2,yaw:0},
    zones:[{id:'atrium',x0:-RX,x1:RX,z0:-RZ,z1:RZ,light:[0,H-1.4,-.4]}],
    // What the camera has over its head, and how much room it has behind you.
    //
    // Every other interior in this game can let the orbit camera rise straight out through the
    // ceiling, because every surface is single-sided: the ceiling simply stops being drawn and you
    // look down into the room. This building is the exception, and it is the exception twice over.
    //
    //   * The thing above your head on levels one and two is not a ceiling plane, it is the *deck
    //     slab* of the floor above — a solid box with a soffit, a lighting trough under it at
    //     -0.42 and a gallery on top. An eye rising into that does not reveal the room, it fills
    //     the frame with the underneath of a floor, and on the way there it passes through the
    //     trough. So the orbit is given a real ceiling to stop at, per deck.
    //
    //   * A shop unit is 4.8 m deep. The concourse orbit is 6.25 m. Walk into a shop and the
    //     camera is not in the shop at all — it is out in the mall behind the shopfront, or buried
    //     in a party wall, and panning swings it through both. So the further in you stand, the
    //     closer it comes: a smooth function of position, because a step change here is exactly
    //     the jolt that makes a camera feel broken.
    //
    // Both are plain numbers on the room record and both are optional; game.js applies them if a
    // room offers them and behaves as it always did if it does not.
    roomAt(x,z) {
      ROOM.light[0]=clamp(x,-RX+1,RX-1);
      ROOM.light[1]=DECK[playerFloor]+(playerFloor===1?3.5:3.4);
      ROOM.light[2]=clamp(z,-RZ+1,RZ-1);
      // Clear of the soffit and of the lit trough slung under it. On the top deck the shell's own
      // ceiling and its downlights are the limit instead.
      ROOM.ceil = playerFloor>=3 ? H-.50 : DECK[playerFloor+1]-.55;
      // How far in from the nearest perimeter wall you are standing. The shops line all four
      // sides, each running from the wall to D inward, so this is also "how deep into a shop am
      // I" without needing to know which shop it is.
      const into = Math.min(RX-Math.abs(x), RZ-Math.abs(z));
      ROOM.near = into < D ? 1.85 + into*.40 : 0;   // 0 means "no limit, use the room's own"
      return ROOM;
    }
  });
});
