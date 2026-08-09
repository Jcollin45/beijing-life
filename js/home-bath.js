// 卫生间 + 生活阳台 — the bathroom and laundry balcony in flat 202
//
// This room occupies x -1.40 .. 2.20, z -5.00 .. -2.20 on deck 2.  The doorway is the
// 80 cm opening in the north wall at x -0.60 .. 0.20.  Fixtures stay on the perimeter so the
// entrance, washbasin, toilet, shower and washing machine remain one continuous walkable route.
FlatFit['bath'] = A => {
  if (!A || typeof A.box !== 'function' || typeof A.th !== 'function') return;

  const { box, cyl, ball, taper, flat, wall } = A;
  const cap = A.cap || A.capsule;
  const C = A.C, M = A.M, PI = Math.PI;
  const Y = Number.isFinite(A.y0) ? A.y0 : 3.10;
  const X0 = -1.40, X1 = 2.20, Z0 = -5.00, Z1 = -2.20;
  const K = {
    floor:C('#bfc5bd'), grout:C('#98a09a'), tile:C('#dfe3e4'), tile2:C('#d3e2e2'),
    trim:C('#718d8a'), porcelain:C('#ece9de'), porcelainD:C('#ced2ce'),
    steel:C('#aeb5bb'), chrome:C('#c6d6dc'), steelD:C('#6e7475'),
    glass:C('#bcd6dd'), water:C('#bde4ee'), wood:C('#987153'), woodD:C('#684a37'),
    white:C('#e8ebe7'), cream:C('#e6ded0'), blue:C('#4d8298'), teal:C('#4d8a82'),
    red:C('#a44a35'), yellow:C('#d5ae4d'), green:C('#5c8a58'), pink:C('#c88391'),
    charcoal:C('#2e343b'), cloth:C('#78a3a3'), cloth2:C('#d59a72'), soil:C('#76583e'),
  };
  // ---------------------------------------------------------------- the material kit
  // A.MAT.tile arrives at matScale .34, and Tiles141 carries a 6x6 grid inside one repeat, so that
  // was six tiles per 34 cm: a 5.7 cm mosaic, a swimming pool rather than a flat.  Both scales
  // below are six domestic tile widths instead, and both were chosen so the grid lands where it
  // should.  Measured off the map rather than assumed: its grout sits on the repeat seam (dark
  // texel columns at 0, 85, 170, 256, 341, 426 and 511 of 512), which puts a grout line on every
  // world multiple of matScale/6.
  //   floor  GROUT*6 = 2.40 -> 40 cm tiles, so the drawn grout below, stepped on that same world
  //          grid, lands exactly on the texture's own grout instead of halfway between two of its
  //          tiles and doubling the density.
  //   wall   1.86 -> 31 cm tiles, smaller than the floor as domestic wall tile usually is, and
  //          the deck y of 3.10 is exactly ten of them, so the bottom course sits flush on the
  //          floor instead of starting the room on a cut.
  //
  // matAmt stays at or under the kit's .28 on both.  White tile has almost no headroom above it to
  // be seen in, and winding matAmt up to force its grout to show does not texture the surface, it
  // lifts it -- a muddier tile AND a brighter room.  The channel that can carry a joint on a
  // near-white surface is nrmAmt, because a grout line is a groove before it is a colour: it is
  // height, it costs no value, and it is why these two run above the kit's .30.
  const GROUT = .40;
  const FLOOR_T = { mat:'tile',   matScale:GROUT*6, matAmt:.28, nrmAmt:.88, gloss:.14 };
  const WALL_T  = { mat:'tile',   matScale:1.86,    matAmt:.24, nrmAmt:.80, gloss:.18 };
  // Fittings.  matScale is well under the kit's .55 on the small parts: a tap is 4 cm across, and
  // at .55 m per repeat the whole of it samples one nearly constant texel, which costs a uniform
  // and buys no detail.  RAIL keeps .55 for the long runs -- riser, rails, rack bars.
  const CHROME  = { mat:'metal',  matScale:.20, matAmt:.24, nrmAmt:.45 };
  const RAIL    = { mat:'metal',  matScale:.55, matAmt:.24, nrmAmt:.50 };
  // White enamel appliance: half the colour amount of a mid-tone fitting.  matAmt is detail, not
  // lift, and on an albedo this close to white it becomes lift first.  The height still reads.
  const ENAMEL  = { mat:'metal',  matScale:.68, matAmt:.12, nrmAmt:.26 };
  // The vanity carcass and the towels are the two surfaces in here that a person also sees in the
  // bedroom and the living room, so they come from FLAT_PALETTE (js/home-walls.js). The tile and
  // the chrome above stay local: they are wet-room surfaces and nothing else in the flat has them.
  const TIMBER  = { ...FLAT_PALETTE.timber };
  const CLOTH   = { ...FLAT_PALETTE.cloth };
  const TH = (hz,x,y,z,zh,en,note,fx,fz,reach=1.55) =>
    A.th(hz,x,y,z,zh,en,note,{ focus:[fx,fz], reach, tag:hz });
  const pivot = (x,y,z,R) => M && M.mul
    ? M.mul(M.trans(x,y,z),M.mul(R,M.trans(-x,-y,-z))) : null;

  // ---------------------------------------------------------------- wet-room shell
  // mode 9 is the street-pavement procedural: 62 cm slabs, per-slab tone and dirt in the joints,
  // every number of it hard-coded in the shader.  On a bathroom floor it was a third grid fighting
  // both the drawn grout and the texture's, so the floor is now plain shading plus the tile.
  flat((X0+X1)/2,Y+.014,(Z0+Z1)/2,X1-X0-.02,Z1-Z0-.02,K.floor,{ ...FLOOR_T });
  // Stepped on the world grid rather than off X0/Z0.  GROUT divides the triplanar repeat exactly,
  // so each of these lands on one of the texture's own grout lines and deepens it; started from
  // the room edge instead, every drawn line fell in the middle of a tile.
  for(let x=Math.ceil((X0+.05)/GROUT)*GROUT;x<X1-.05;x+=GROUT)
    flat(x,Y+.018,(Z0+Z1)/2,.013,Z1-Z0-.05,K.grout,{hard:true,gloss:.07});
  for(let z=Math.ceil((Z0+.05)/GROUT)*GROUT;z<Z1-.05;z+=GROUT)
    flat((X0+X1)/2,Y+.019,z,X1-X0-.05,.013,K.grout,{hard:true,gloss:.07});

  // Tile faces sit just inside the structural partitions.  Their alternating blue-green band is
  // a deliberate domestic finish, not a wall-sized grey panel that flattens the room.
  wall(X0+.066,Y+1.10,(Z0+Z1)/2,Z1-Z0-.08,2.20,PI/2,K.tile,WALL_T);
  wall(X1-.066,Y+1.10,(Z0+Z1)/2,Z1-Z0-.08,2.20,-PI/2,K.tile,WALL_T);
  // yaw 0, not PI.  `wall` stands its quad up facing +z and then yaws it, so PI aimed this face at
  // -z -- out through the building's south wall -- and back-face culling dropped it.  The entire
  // south end of the wet room was therefore reading as bare shell plaster with a timber skirting
  // along its foot.  Tiling it now covers that skirting, which is correct: a wet room is tiled to
  // the floor and has no timber anywhere near the shower.
  wall((X0+X1)/2,Y+1.10,Z0+.066,X1-X0-.08,2.20,0,K.tile,WALL_T);
  for(const [x,z,w,d] of [
    [X0+.073,(Z0+Z1)/2,.018,Z1-Z0-.12],
    [X1-.073,(Z0+Z1)/2,.018,Z1-Z0-.12],
    [(X0+X1)/2,Z0+.073,X1-X0-.12,.018],
  ]) box(x,Y+1.16,z,w,.095,d,K.trim,{hard:true,...WALL_T,gloss:.22});

  // A frosted ventilation window above the laundry end keeps the wet room bright without
  // pretending this narrow service balcony has a panoramic living-room view.
  const pane=box(1.46,Y+1.83,Z0+.105,1.18,.76,.030,K.glass,
    {hard:true,mode:1,alpha:.56,gloss:.72,tag: '窗户'});
  if(A.sky) A.sky(pane);
  for(const [x,y,w,h] of [[.84,1.83,.055,.86],[2.08,1.83,.055,.86],
                           [1.46,1.41,1.28,.055],[1.46,2.25,1.28,.055],
                           [1.46,1.83,.045,.76]])
    box(x,Y+y,Z0+.080,w,h,.045,K.white,{hard:true,...ENAMEL,gloss:.26});
  // A small enamel plaque gives the enclosed laundry end its own pickable identity.  Without a
  // prop carrying 阳台, the nearby vocabulary target could be approached but never clicked.
  box(1.84,Y+1.30,Z0+.125,.34,.16,.035,K.teal,
    {hard:true,...ENAMEL,matAmt:.20,gloss:.30,tag: '阳台'});
  if(A.glyph) A.glyph(1.84,Y+1.30,Z0+.102,PI,'阳台',
    {size:.062,gap:.016,color:K.white,gloss:.12,tag: '阳台'});

  // ---------------------------------------------------------------- 洗手池 vanity
  const VX=.76,VZ=-2.46;
  box(VX,Y+.41,VZ,.76,.78,.46,K.wood,{hard:true,mode:6,...TIMBER,gloss:.20,tag: '洗手池'});
  box(VX,Y+.49,VZ-.238,.68,.52,.028,K.woodD,{hard:true,mode:6,...TIMBER,gloss:.22,tag: '洗手池'});
  cap(VX-.22,Y+.49,VZ-.257,.025,.22,.025,K.chrome,{rz:PI/2,...CHROME,gloss:.62,tag: '洗手池'});
  box(VX,Y+.825,VZ,.82,.070,.52,K.porcelain,{hard:true,gloss:.46,tag: '洗手池'});
  ball(VX,Y+.842,VZ,.24,.080,.18,K.porcelainD,{gloss:.42,tag: '洗手池'});
  ball(VX,Y+.858,VZ,.19,.055,.135,C('#e8ebe7'),{gloss:.46,tag: '洗手池'});
  cyl(VX,Y+.865,VZ,.022,.025,K.steelD,{...CHROME,gloss:.60,tag: '洗手池'});
  cyl(VX,Y+.96,VZ-.19,.026,.22,K.chrome,{...CHROME,gloss:.70,tag: '洗手池'});
  cap(VX,Y+1.065,VZ-.12,.022,.17,.022,K.chrome,{rx:PI/2,...CHROME,gloss:.70,tag: '洗手池'});
  const tap=[
    cyl(VX,Y+.93,VZ-.03,.013,.16,K.water,{hard:true,mode:1,alpha:.45,tag: '洗手池'}),
    cyl(VX,Y+.858,VZ-.03,.058,.012,K.water,{hard:true,mode:1,alpha:.34,tag: '洗手池'}),
  ];
  if(A.fader) A.fader('tapB',tap,.58);
  A.stop(.35,1.18,-2.72,-2.20);
  A.shade(VX,VZ,.88,.62,.32);

  // 镜柜 — a mirror CABINET, not a mirror. What goes over a Chinese washbasin is 140 mm deep with
  // a mirrored door on it, and that is not decoration: it is where the toothbrush cup, the razor,
  // the plasters and the half-used box of 感冒药 live. A flat mirror on the wall means all of that
  // has to stand on an open shelf, which is a bathroom nobody has ever tidied.
  //
  // Four layers, and every one of them is set proud of the one behind by more than half its own
  // thickness so no two faces are coplanar — the carcass front lands at z -2.386, the door leaf
  // spans -2.417 .. -2.383 through it, and the glass -2.429 .. -2.411 through the leaf.
  box(VX,Y+1.53,-2.318,.80,.88,.136,K.woodD,{hard:true,mode:6,...TIMBER,gloss:.20});
  box(VX,Y+1.53,-2.318,.74,.13,.130,K.wood,{hard:true,mode:6,...TIMBER,gloss:.18});
  box(VX,Y+1.53,-2.400,.74,.82,.034,K.woodD,{hard:true,mode:6,...TIMBER,gloss:.22,tag: '卫生间镜子'});
  box(VX,Y+1.53,-2.420,.67,.75,.018,K.glass,
    {hard:true,mode:18,alpha:.35,gloss:.82,tag: '卫生间镜子'});
  // 392 — condensation. `fixt.steamShower` (js/game.js) already eases toward 1 while the water
  // runs, and js/world.js's `fader(name, items, max)` is the registry that owns "not there until
  // it is": it zeroes alpha at build, so with nothing driving the name the glass is exactly as it
  // was. Nothing in this file ticks — the fade is the loop's, once it reads the fixture.
  const steamFog = box(VX,Y+1.53,-2.428,.66,.74,.010,K.white,
    {hard:true,mode:1,alpha:0,glow:.05,gloss:.06,tag: '卫生间镜子'});
  if (A.fader) A.fader('steamShower', [steamFog], .58);
  cap(VX+.30,Y+1.53,-2.432,.011,.16,.011,K.chrome,{...CHROME,gloss:.62,tag: '卫生间镜子'});
  box(VX,Y+2.00,Z1-.15,.55,.055,.10,K.white,{hard:true,mode:1,glow:.14,tag: '卫生间灯'});
  A.light(VX,Y+1.92,-2.62,[1,.91,.78],.34,2.3);
  taper(1.05,Y+.94,VZ+.02,.105,.16,.105,K.white,{gloss:.36,tag: '牙刷'});
  for(const [dx,c,a] of [[-.022,K.blue,-.08],[.026,K.red,.10]]) {
    cap(1.05+dx,Y+1.08,VZ+.02,.010,.23,.010,c,{rz:a,gloss:.30,tag: '牙刷'});
    box(1.05+dx,Y+1.195,VZ+.02,.035,.040,.018,K.white,
      {hard:true,rz:a,gloss:.28,tag: '牙刷'});
  }
  ball(.48,Y+.886,VZ+.03,.090,.026,.065,K.porcelain,{gloss:.40});
  box(.48,Y+.912,VZ+.03,.095,.040,.065,K.cream,{hard:true,gloss:.18});
  A.shade(.48,VZ+.03,.22,.17,.24,Y+.866);
  A.shade(1.05,VZ+.02,.15,.15,.24,Y+.866);

  // ---------------------------------------------------------------- 马桶 toilet
  const TX=-1.04,TZ=-3.18;
  taper(TX,Y+.14,TZ,.36,.28,.44,K.porcelain,{gloss:.44,tag: '马桶'});
  ball(TX,Y+.32,TZ,.25,.15,.30,K.porcelain,{gloss:.44,tag: '马桶'});
  ball(TX,Y+.43,TZ,.245,.032,.30,K.porcelain,{gloss:.50,tag: '马桶'});
  ball(TX,Y+.425,TZ,.165,.026,.215,K.porcelainD,{gloss:.40,tag: '马桶'});
  const lid=[
    ball(TX,Y+.455,TZ,.25,.027,.305,K.white,{gloss:.48,tag: '马桶'}),
    ball(TX,Y+.469,TZ,.205,.020,.250,C('#e8ebe7'),{gloss:.42,tag: '马桶'}),
  ];
  if(A.mover&&M&&M.rotZ) A.mover('lid',lid,v=>pivot(TX-.23,Y+.45,TZ,M.rotZ(1.42*v)));
  box(-1.25,Y+.56,TZ,.25,.58,.48,K.porcelain,{hard:true,gloss:.45,tag: '马桶'});
  box(-1.25,Y+.87,TZ,.27,.055,.50,K.white,{hard:true,gloss:.48,tag: '马桶'});
  cyl(-1.25,Y+.905,TZ+.10,.038,.024,K.chrome,{...CHROME,gloss:.66,tag: '马桶'});
  A.stop(-1.40,-.70,-3.58,-2.78);
  A.shade(TX,TZ,.76,.88,.35);

  // Toilet paper on the reachable side and a tiny lidded waste bin beneath it.
  box(-1.32,Y+.83,-2.70,.045,.045,.16,K.steel,{hard:true,...CHROME,gloss:.58});
  cyl(-1.24,Y+.83,-2.70,.070,.13,K.white,{rz:PI/2,gloss:.18,tag: '卫生纸'});
  cyl(-1.24,Y+.83,-2.70,.024,.135,K.woodD,{rz:PI/2,gloss:.18,tag: '卫生纸'});
  box(-1.24,Y+.70,-2.635,.12,.18,.008,K.white,{hard:true,gloss:.16,tag: '卫生纸'});
  taper(-1.13,Y+.13,-3.72,.27,.26,.27,K.steelD,{...RAIL,gloss:.35});
  cyl(-1.13,Y+.271,-3.72,.14,.025,K.chrome,{...CHROME,gloss:.55});
  A.shade(-1.13,-3.72,.42,.42,.34);

  // ---------------------------------------------------------------- 淋浴 shower
  const SX=-.67,SZ=-4.48;
  box(SX,Y+.045,SZ,1.30,.075,.92,K.porcelain,{hard:true,gloss:.46,tag: '淋浴'});
  box(-.02,Y+1.00,SZ,.030,1.92,.92,K.glass,
    {hard:true,mode:18,alpha:.24,gloss:.80,tag: '淋浴'});
  box(-.02,Y+1.90,SZ,.050,.050,.96,K.chrome,{hard:true,...RAIL,gloss:.62,tag: '淋浴'});
  cyl(-1.27,Y+1.42,SZ,.025,1.18,K.chrome,{...RAIL,gloss:.68,tag: '淋浴'});
  cap(-1.16,Y+2.00,SZ,.022,.24,.022,K.chrome,{rz:PI/2,...CHROME,gloss:.68,tag: '淋浴'});
  taper(-1.02,Y+1.90,SZ,.18,.065,.18,K.chrome,{rz:-.48,...CHROME,gloss:.64,tag: '淋浴'});
  box(-1.28,Y+1.05,SZ-.25,.070,.19,.055,K.chrome,{hard:true,...CHROME,gloss:.64,tag: '淋浴'});
  cap(-1.24,Y+1.18,SZ-.25,.020,.17,.020,K.chrome,{rz:.42,...CHROME,gloss:.66,tag: '淋浴'});
  const shower=[
    cyl(-1.03,Y+1.00,SZ,.11,1.72,K.water,{hard:true,mode:1,alpha:.42,tag: '淋浴'}),
    cyl(-1.03,Y+.14,SZ,.22,.025,K.water,{hard:true,mode:1,alpha:.34,tag: '淋浴'}),
  ];
  if(A.fader) A.fader('shower',shower,.30);
  if(A.steam) A.steam('shower',[-.76,Y+.52,SZ],7,.13,1.32);
  A.stop(-1.40,.03,-5.00,-3.97);
  A.shade(SX,SZ,1.40,1.02,.28);

  // Shampoo shelf, towel rail and electric water heater.  The display's 42°C is large enough to
  // read from the doorway and explains the appliance before the vocabulary card is opened.
  box(-1.28,Y+.58,-4.00,.26,.025,.46,K.chrome,{hard:true,...RAIL,gloss:.58});
  for(const [z,c,h] of [[-4.14,K.blue,.25],[-3.93,K.pink,.20]]) {
    cyl(-1.20,Y+.58+h/2,z,.046,h,c,{gloss:.42,tag: '洗发水'});
    taper(-1.20,Y+.59+h,z,.085,.035,.085,c,{gloss:.40,tag: '洗发水'});
    cyl(-1.20,Y+.63+h,z,.022,.045,K.white,{gloss:.40,tag: '洗发水'});
  }
  cap(.36,Y+1.50,Z0+.14,.025,.78,.025,K.chrome,{rz:PI/2,...RAIL,gloss:.63});
  box(.36,Y+1.16,Z0+.20,.60,.58,.065,K.cloth,{mode:7,...CLOTH,gloss:.05,tag: '毛巾'});
  box(.36,Y+1.42,Z0+.18,.62,.09,.075,C('#91b8b5'),{mode:7,...CLOTH,gloss:.05,tag: '毛巾'});
  box(.65,Y+2.04,Z0+.20,.88,.46,.28,K.white,{hard:true,...ENAMEL,gloss:.30,tag: '热水器'});
  box(.65,Y+2.04,Z0+.052,.35,.19,.012,K.charcoal,{hard:true,...CHROME,matAmt:.18,gloss:.54,tag: '热水器'});
  if(A.glyph) A.glyph(.65,Y+2.04,Z0+.043,PI,'42°',{size:.080,color:C('#f08a54'),mode:1,glow:.14,tag: '热水器'});
  cyl(.25,Y+1.70,Z0+.19,.018,.30,K.chrome,{...CHROME,gloss:.62,tag: '热水器'});
  cyl(1.05,Y+1.70,Z0+.19,.018,.30,K.chrome,{...CHROME,gloss:.62,tag: '热水器'});

  // ---------------------------------------------------------------- 生活阳台 laundry end
  // The right-hand metre works as the service balcony: a front-loader, cleaning supplies and the
  // overhead rack used for air-drying.  It remains visually connected to the bathroom, as many
  // compact Beijing flats enclose this once-open balcony behind the same frosted outer window.
  const WX=1.72,WZ=-4.43;
  box(WX,Y+.43,WZ,.72,.86,.68,K.white,{hard:true,...ENAMEL,gloss:.28,tag: '洗衣机'});
  box(WX,Y+.43,WZ+.35,.66,.74,.025,K.porcelainD,{hard:true,...ENAMEL,matAmt:.16,gloss:.33,tag: '洗衣机'});
  cyl(WX,Y+.43,WZ+.37,.215,.045,K.steelD,{rx:PI/2,...CHROME,gloss:.56,tag: '洗衣机'});
  cyl(WX,Y+.43,WZ+.395,.175,.025,K.glass,{rx:PI/2,alpha:.52,gloss:.74,tag: '洗衣机'});
  box(WX,Y+.77,WZ+.39,.48,.085,.020,K.charcoal,{hard:true,...CHROME,matAmt:.18,gloss:.48,tag: '洗衣机'});
  cyl(WX+.24,Y+.77,WZ+.405,.035,.022,K.chrome,{rx:PI/2,...CHROME,gloss:.62,tag: '洗衣机'});
  A.stop(1.32,2.20,-4.82,-4.02);
  A.shade(WX,WZ,.82,.78,.32);

  // Pulley drying rack and an intentionally mismatched everyday wash: shirt, trousers, socks and
  // a red child's T-shirt.  They hang high enough never to become collision walls.
  for(const x of [1.38,2.02]) {
    cap(x,Y+2.36,-3.48,.012,.52,.012,K.steelD,{...RAIL,gloss:.55});
    cyl(x,Y+2.56,-3.48,.050,.040,K.chrome,{rx:PI/2,...CHROME,gloss:.62});
  }
  for(const z of [-3.58,-3.38])
    cap(1.70,Y+2.17,z,.015,.82,.015,K.chrome,{rz:PI/2,...RAIL,gloss:.62,tag: '晾衣架'});
  const clothes=[
    [1.40,-3.58,.38,.54,K.blue],[1.76,-3.58,.32,.60,K.charcoal],
    [2.02,-3.38,.26,.38,K.red],[1.47,-3.38,.18,.25,K.yellow],
  ];
  const wash=[];
  for(const [x,z,w,h,c] of clothes) {
    cap(x,Y+2.10,z,.009,.25,.009,K.steel,{rz:PI/2,...CHROME,gloss:.50,tag: '晾衣架'});
    wash.push(box(x,Y+1.79,z,w,h,.035,c,{mode:7,...CLOTH,gloss:.04,tag: '晾衣架'}));
  }
  // The washing dries. This was a static prop: clothes permanently on a rack, next to a machine
  // that says it is ready for the next load and can never be given one.
  //
  // Wet cloth is DARKER and it is a different colour temperature, not just dimmer — water fills
  // the weave and kills the diffuse scatter that makes dry cotton pale. So a single multiplier
  // per channel, biased so blue survives it best, run across the four garments.
  //
  // `p.color` is read per frame at js/gl.js:2854, so this is an assignment and nothing else — no
  // rebuild, no mover, and nothing per-frame. It is also why the base colours are COPIED rather
  // than mutated: build.js interns colours and `material()` tests membership of a Set of them, so
  // writing through `p.color` in place would repaint every other prop that shares the swatch.
  const washDry = wash.map(p => [p.color[0], p.color[1], p.color[2]]);
  FlatFit['bath'].dryReg = {
    wetness: 0,                       // 0 dry, 1 straight out of the drum
    dryAt: 0,                         // the in-game hour it should be dry by; game.js owns the clock
    set(w) {
      const k = Math.max(0, Math.min(1, w));
      this.wetness = k;
      for (let i = 0; i < wash.length; i++) {
        const b = washDry[i];
        wash[i].color = [b[0]*(1-.42*k), b[1]*(1-.38*k), b[2]*(1-.26*k)];
      }
    },
    wetten(hoursToDry) { this.dryAt = hoursToDry; this.set(1); },
    dry() { this.dryAt = 0; this.set(0); },
  };
  // Detergent, wash basin, mop and a pair of slippers kept dry beside the machine. Each carries
  // its own tag rather than the machine's: `pick` resolves a click to the nearest thing by focus,
  // so three objects sharing one tag meant clicking any of them opened the washing machine.
  cyl(1.50,Y+.975,WZ,.065,.23,K.teal,{gloss:.40,tag: '洗衣粉'});
  taper(1.50,Y+1.115,WZ,.11,.05,.11,K.teal,{gloss:.38,tag: '洗衣粉'});
  taper(1.83,Y+.935,WZ,.34,.15,.34,K.blue,{rx:PI,gloss:.26,tag: '盆'});
  // The mop's tip hung 95 mm above the tiles and the slippers 120 mm, which is the loudest
  // unfinished signal in the room.  The slippers were also .12 tall and .055 deep -- a pair of
  // upended plates -- so the two are swapped back, and `hard` goes with them: build.js reserves it
  // for trim, screens and machined panels, and a slipper is none of those.
  cap(2.08,Y+.705,-3.20,.025,1.38,.025,K.wood,{rz:-.12,...TIMBER,gloss:.18,tag: '拖把'});
  cyl(2.16,Y+.055,-3.20,.075,.10,K.steelD,{...CHROME,gloss:.34,tag: '拖把'});
  for(let i=0;i<9;i++)
    cap(2.15+(i%3-1)*.028,Y+.045,-3.20+((i/3|0)-1)*.030,.008,.11,.008,K.cream,
      {rz:(i%5-2)*.10,mode:7,...CLOTH,gloss:.05,tag: '拖把'});

  // ---------------------------------------------------------------- 地漏 the floor drain
  // The one fitting that explains the whole room: a Chinese bathroom is a wet room, the floor
  // falls to a drain, and that is why every surface in here is tiled and why the shower needs no
  // enclosure. Placed on the tile grid rather than beside it — GROUT*6 puts a grout line on every
  // world multiple of 0.40, so a drain at x 0.40, z -4.00 lands on an intersection instead of
  // cutting a tile in half, which is what a real one is set out to do.
  box(.40,Y+.010,-4.00,.130,.014,.130,K.steelD,{hard:true,...CHROME,gloss:.52,tag: '地漏'});
  box(.40,Y+.016,-4.00,.104,.010,.104,K.chrome,{hard:true,...CHROME,gloss:.66,tag: '地漏'});
  for(let i=0;i<4;i++)
    box(.40,Y+.021,-3.961-i*.026,.086,.006,.010,K.charcoal,{hard:true,gloss:.30,tag: '地漏'});
  A.shade(.40,-4.00,.22,.22,.22);

  // ---------------------------------------------------------------- 空调外机 the condensers
  // Three indoor 挂机 hang in this flat — 客厅, 主卧, 次卧 — and there was nothing anywhere they
  // could be connected to. The 冷凝 units go on the outside face of this room's outer wall, which
  // is where a Beijing block puts them: bracketed off the 生活阳台, stacked so the top one blows
  // clear of the bottom one, and visible in silhouette through the frosted pane at x 1.46.
  //
  // Outside the envelope on purpose (z beyond -5.00). They are not this flat's floor and cost it
  // no walkable area; they exist so the building has a back.
  for(const [ox,oy] of [[1.52,.62],[2.02,1.34]]) {
    box(ox,Y+oy,-5.30,.78,.56,.30,K.steelD,{hard:true,...RAIL,gloss:.30,tag: '外机'});
    box(ox,Y+oy,-5.452,.70,.48,.020,K.steel,{hard:true,...RAIL,gloss:.36,tag: '外机'});
    // The impeller is one dark disc, not blades. These stand outside the building behind a pane
    // of frosted glass — the only view of them is a silhouette, and three blades apiece would be
    // six props spent on detail that the frosting removes before it reaches the eye.
    cyl(ox,Y+oy,-5.462,.19,.020,K.charcoal,{rx:PI/2,gloss:.24,tag: '外机'});
    for(const s of [-1,1])
      cap(ox+s*.34,Y+oy-.34,-5.18,.020,.34,.020,K.steelD,{rz:PI/2-1.2,gloss:.30,tag: '外机'});
    cap(ox-.30,Y+oy+.16,-5.14,.018,.44,.018,K.white,{rz:1.35,mode:7,gloss:.14,tag: '外机'});
  }
  box(2.01,Y+.048,-3.08,.28,.055,.12,K.cloth2,{...CLOTH,ry:.12,tag: '拖鞋'});
  box(1.72,Y+.048,-3.12,.28,.055,.12,K.cloth2,{...CLOTH,ry:-.08,tag: '拖鞋'});
  A.shade(1.87,-3.10,.62,.30,.30);
  A.shade(2.05,-3.19,.20,.20,.24);
  // Contact shadow reads at any distance, where texture does not, so the two things standing on the
  // machine lid get one too.  A.shade takes the height as its last argument, so a shadow can land
  // on a lid rather than on the tiles 86 cm below it.
  A.shade(1.83,WZ,.42,.42,.26,Y+.866);
  A.shade(1.50,WZ,.17,.17,.24,Y+.866);

  box(.36,Y+2.50,-3.62,.88,.045,.30,K.white,{hard:true,mode:1,glow:.16,tag: '卫生间灯'});
  A.light(.36,Y+2.42,-3.62,[.90,.96,1],.46,3.0);

  // ---------------------------------------------------------------- learnable objects
  TH('洗手池',VX,Y+1.08,VZ,'洗手池旁边放着牙刷。','The toothbrushes are beside the washbasin.',
    '洗手池 xǐshǒuchí — literally the basin where you wash your hands.',.12,-2.90,1.60);
  TH('镜子',VX,Y+1.85,Z1-.16,'镜子擦得很干净。','The mirror has been wiped clean.',
    '镜子 jìngzi. 照镜子 means to look at yourself in a mirror. This one is the door of a ' +
    '镜柜 jìngguì, a mirror cabinet: the razor and the medicines live behind it.',.05,-2.95,1.65);
  TH('牙刷',1.05,Y+1.24,VZ,'杯子里有两把牙刷。','There are two toothbrushes in the cup.',
    '牙 tooth + 刷 brush; use the measure word 把 for a handled object.',.15,-2.90,1.55);
  TH('马桶',TX,Y+.82,TZ,'马桶盖平时要放下来。','The toilet lid should normally be left down.',
    '马桶 mǎtǒng is the fixture; 卫生间 is the room.',-.25,-3.17,1.60);
  TH('卫生纸',-1.23,Y+1.02,-2.70,'卫生纸在马桶旁边。','The toilet paper is beside the toilet.',
    '卫生 hygiene + 纸 paper. 手纸 is another everyday term.',-.30,-3.15,1.55);
  TH('淋浴',-1.03,Y+1.82,SZ,'淋浴的热水已经好了。','The shower water is hot and ready.',
    '淋浴 línyù is the shower; the everyday verb is 洗澡, to bathe.',.25,-4.05,1.70);
  TH('洗发水',-1.20,Y+.98,-4.04,'架子上有两瓶洗发水。','There are two bottles of shampoo on the shelf.',
    '洗 wash + 发 hair + 水 liquid: shampoo.',-.12,-3.72,1.65);
  TH('毛巾',.36,Y+1.58,Z0+.17,'毛巾洗好以后晾干。','The towel is hung up to dry after washing.',
    '毛巾 máojīn uses the measure word 条: 一条毛巾.',.42,-4.10,1.55);
  TH('热水器',.65,Y+2.29,Z0+.18,'热水器显示四十二度。','The water heater reads forty-two degrees.',
    '热 water-heating + 水 water + 器 appliance: the water heater.',.58,-4.12,1.95);
  TH('洗衣机',WX,Y+1.10,WZ,'洗衣机正在等下一桶衣服。','The washing machine is ready for the next load.',
    '洗衣 to wash clothes + 机 machine. 洗衣服 is the everyday verb.',1.05,-3.78,1.65);
  TH('晾衣架',1.70,Y+2.35,-3.48,'衣服都晾在架子上。','The clothes are drying on the rack.',
    '晾 means to air-dry; 晾衣架 is the overhead drying rack.',1.13,-3.40,1.70);
  TH('阳台',1.72,Y+1.55,-4.78,'小阳台改成了洗衣区。','The little balcony has become a laundry area.',
    '生活阳台 is a practical service balcony for washing and drying.',1.03,-3.80,1.85);
  TH('拖鞋',1.86,Y+.42,-3.10,'洗澡的拖鞋放在干的地方。','The shower slippers are kept somewhere dry.',
    '拖鞋 tuōxié are slippers; 拖 means to drag or trail.',1.30,-3.32,1.45);
  // Local matches for locally tagged fixtures keep same-tag picking inside this room.  Before
  // these existed, clicking the frosted bathroom pane opened the living-room window card, and
  // either bathroom light could resolve to a lamp on the other side of the flat.
  TH('窗户',1.46,Y+2.27,Z0+.12,'卫生间的窗户是磨砂玻璃。','The bathroom window is frosted glass.',
    '磨砂玻璃 obscures the view while still admitting daylight.',1.14,-4.08,1.90);
  TH('灯',.36,Y+2.55,-3.62,'卫生间的顶灯是冷白光。','The bathroom ceiling light is cool white.',
    '卫生间用白光，看得更清楚。',.30,-3.55,2.20);
  TH('灯',VX,Y+2.06,Z1-.15,'镜子上面的灯照得很均匀。','The light above the mirror is even.',
    '镜前灯 is a light mounted above or beside a mirror.',.05,-2.90,1.90);
  // The four objects the laundry end had built and never named. Each focus is one already proved
  // reachable by a neighbouring row rather than a fresh guess — .flatcheck.js measures every one
  // of these against the cells a 0.30 m body can stand in, and a card nobody can open is worse
  // than no card.
  TH('拖把',2.12,Y+.86,-3.20,'拖把靠在墙角，地还没拖。','The mop is propped in the corner; the floor is not done.',
    '拖 to drag + 把 handle. 拖地 tuō dì is to mop a floor — the same 拖 as in 拖鞋.',1.30,-3.32,1.60);
  TH('洗衣粉',1.50,Y+1.22,WZ,'洗衣粉快用完了。','The washing powder is nearly gone.',
    '洗衣 washing clothes + 粉 powder. 洗衣液 is the liquid; the powder is what is on the machine.',
    1.05,-3.78,1.75);
  TH('盆',1.83,Y+1.06,WZ,'盆是手洗小件用的。','The basin is for hand-washing small things.',
    '盆 pén — a basin. 洗脸盆 for your face, 洗衣盆 for washing by hand, and one 盆 does both.',
    1.05,-3.78,1.75);
  TH('地漏',.40,Y+.28,-4.00,'水都流到地漏里。','The water all runs to the floor drain.',
    '地 floor + 漏 to leak. Every Chinese bathroom has one, which is why the whole floor is tiled ' +
    'and why nobody here needs a shower tray.',.42,-3.60,1.60);
};
