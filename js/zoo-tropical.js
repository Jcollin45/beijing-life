// 热带馆 — the expansion's greenhouse is a separate, deliberately humid indoor scene.
//
// Geometry comes straight from ZOO-EXPANSION-BLUEPRINT.json.  The outdoor building and this
// interior therefore share one door contract and one revision instead of two hand-maintained
// approximations.  Local coordinates are metres: x runs west/east and z south/north.
const ZooTropical = Lazy('ZooTropical', () => {
  const plan = typeof ZOO_BLUEPRINT !== 'undefined' ? ZOO_BLUEPRINT : null;
  const building = plan && plan.buildings &&
    plan.buildings.find(b => b.id === 'B08-tropical-house');
  if (!building || !building.scene)
    throw new Error('ZooTropical: revision-2 B08 scene is missing');
  const S = building.scene;

  const col = {
    floor: C('#786f61'), floorD: C('#5e594f'), path: C('#a9a18f'), pathD: C('#8c8577'),
    brick: C('#8f4d3d'), brickD: C('#6d392f'), mortar: C('#bba88d'),
    steel: C('#42544f'), steelL: C('#71847d'), glass: C('#8eb9b1'), sky: C('#b9d7ce'),
    leaf: C('#387044'), leafD: C('#245534'), leafL: C('#5f985b'), fern: C('#4b8750'),
    trunk: C('#66503a'), vine: C('#537a3f'), soil: C('#5b4937'), sand: C('#b4a078'),
    water: C('#315f64'), waterL: C('#4d8585'), waterD: C('#233f47'),
    rock: C('#686a64'), rockL: C('#888b82'), rockD: C('#4f514d'),
    white: C('#eee9dc'), cream: C('#dfd5ba'), charcoal: C('#252c2b'),
    gold: C('#d1a943'), orange: C('#d47833'), red: C('#a43e33'), teal: C('#2c7774'),
    blue: C('#3b6f91'), purple: C('#755a8e'), pink: C('#ca6d8c'),
    croc: C('#536b42'), crocD: C('#3c5034'), fish: C('#778b9c'), fishL: C('#a9c0c9'),
    snake: C('#8a7540'), lizard: C('#4f8052'), bat: C('#3d3438'),
  };
  const B = Build.scene({ fabricGloss: .04 });
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade,
          glow, light, thing } = B;
  const H = S.height;
  const bounds = S.localBounds;
  const movers = [], lit = [], waterGlows = [];
  const tagged = (id, tag, extra = {}) => ({ blueprintId: id, tag, ...extra });
  const markThing = (th, id) => { th.blueprintId = id; return th; };
  function moving(p, id, phase, amp = .15) {
    p.blueprintId = id;
    const sx = Math.hypot(p.m[0], p.m[1], p.m[2]);
    const sy = Math.hypot(p.m[4], p.m[5], p.m[6]);
    const sz = Math.hypot(p.m[8], p.m[9], p.m[10]);
    p.fixed = true; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    p.r = .5 * Math.hypot(sx, sy, sz) + amp + .15;
    movers.push({ p, x: p.cx, y: p.cy, z: p.cz, phase, amp });
    return p;
  }
  function rectFlat(id, r, color, opt = {}) {
    return flat((r[0] + r[1]) / 2, opt.y === undefined ? .008 : opt.y,
      (r[2] + r[3]) / 2, r[1] - r[0], r[3] - r[2], color,
      { hard: true, blueprintId: id, ...opt });
  }
  function rectSolid(r) { return solid(r[0], r[1], r[2], r[3]); }

  function wallRun(w) {
    const len = w.range[1] - w.range[0], mid = (w.range[0] + w.range[1]) / 2;
    const vertical = w.axis === 'z'; // range is z, so the wall lies on a constant x
    const cx = vertical ? w.at : mid, cz = vertical ? mid : w.at;
    const sx = vertical ? w.thickness : len, sz = vertical ? len : w.thickness;
    // A masonry plinth protects the greenhouse glass from feet and service carts.
    box(cx, .30, cz, sx, .60, sz, col.brick,
      { hard: true, blueprintId: w.id + '/G01', mat:'brick', matScale:.62, matAmt:.34 });
    box(cx, (H + .60) / 2, cz, sx * (vertical ? .62 : 1), H - .60,
      sz * (vertical ? 1 : .62), col.glass,
      { hard: true, blueprintId: w.id + '/G02', mode:1, alpha:.34, gloss:.82 });
    // Steel uprights make each long run legible as a greenhouse rather than a tinted wall.
    const n = Math.max(1, Math.ceil(len / 2.25));
    for (let i = 0; i <= n; i++) {
      const q = w.range[0] + len * i / n;
      box(vertical ? w.at : q, H / 2, vertical ? q : w.at,
        vertical ? .10 : .10, H, vertical ? .10 : .10, col.steel,
        { hard:true, blueprintId:w.id + '/G' + String(i + 3).padStart(2,'0'), gloss:.48 });
    }
    if (w.bodySolid) {
      if (vertical) solid(w.at - w.thickness / 2, w.at + w.thickness / 2,
        w.range[0], w.range[1]);
      else solid(w.range[0], w.range[1], w.at - w.thickness / 2, w.at + w.thickness / 2);
    }
    if (vertical) blocker(w.at - w.thickness, w.at + w.thickness,
      w.range[0], w.range[1], w.cameraBlockerTop);
    else blocker(w.range[0], w.range[1], w.at - w.thickness, w.at + w.thickness,
      w.cameraBlockerTop);
  }

  function lowGlass(r, side, tag, id) {
    let x, z, sx, sz;
    if (side === 'z1' || side === 'z0') {
      z = side === 'z1' ? r[3] : r[2]; x = (r[0] + r[1]) / 2;
      sx = r[1] - r[0]; sz = .10;
    } else {
      x = side === 'x1' ? r[1] : r[0]; z = (r[2] + r[3]) / 2;
      sx = .10; sz = r[3] - r[2];
    }
    box(x, .32, z, sx, .64, sz, col.brickD,
      { hard:true, blueprintId:id + '/G01', tag, mat:'brick', matScale:.5, matAmt:.30 });
    box(x, 1.28, z, sx, 1.28, sz, col.glass,
      { hard:true, blueprintId:id + '/G02', tag, mode:1, alpha:.30, gloss:.85 });
    const n = Math.max(2, Math.round((sx + sz) / 1.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      box(sx > sz ? r[0] + (r[1] - r[0]) * t : x, 1.15,
        sz > sx ? r[2] + (r[3] - r[2]) * t : z, .055, 2.0, .055, col.steel,
        { hard:true, blueprintId:id + '/G' + String(i + 3).padStart(2,'0'), tag, gloss:.48 });
    }
  }

  function butterflyAirlockSide(x, r, start) {
    const gateZ=5.8, half=.75;
    const runs=[[r[2],gateZ-half],[gateZ+half,r[3]]];
    let part=start;
    for(const [z0,z1] of runs) {
      const z=(z0+z1)/2, d=z1-z0;
      box(x,.32,z,.10,.64,d,col.brickD,
        tagged('T04-butterfly/G'+String(part++).padStart(2,'0'),'蝴蝶',
          {hard:true,mat:'brick',matScale:.5,matAmt:.30}));
      box(x,1.28,z,.08,1.28,d,col.glass,
        tagged('T04-butterfly/G'+String(part++).padStart(2,'0'),'蝴蝶',
          {hard:true,mode:1,alpha:.30,gloss:.85}));
      solid(x-.05,x+.05,z0,z1);
    }
    box(x,2.12,gateZ,.10,.18,half*2,col.steel,
      tagged('T04-butterfly/G'+String(start+8).padStart(2,'0'),'蝴蝶',
        {hard:true,gloss:.48}));
  }

  function board(st, color) {
    const [x, y, z] = st.position, focus = st.focus;
    const dx = focus[0] - x, dz = focus[1] - z;
    const yaw = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) :
      (dz > 0 ? 0 : Math.PI);
    box(x, y, z, 1.25, .72, .08, color,
      { hard:true, ry:yaw, tag:st.hz, blueprintId:st.id + '/G01', gloss:.24 });
    glyphs(x, y + .08, z, yaw, st.hz,
      { size:.18, gap:.045, color:col.white, mode:1, tag:st.hz });
    const th = thing(st.hz, x, y, z,
      '看看' + st.hz + '，再读一读介绍牌。',
      'Look at the ' + st.hz + ' and read its interpretation panel.',
      '热带馆的展牌把动物名称和栖息环境放在一起。',
      { focus:st.focus, reach:st.reach });
    markThing(th, st.id);
  }

  function bench(o) {
    const [x,,z] = o.at, ry = o.faceYaw || 0;
    const s = Math.sin(ry), c = Math.cos(ry);
    let part = 1;
    for (let i = -2; i <= 2; i++)
      box(x, .48 + i * .07, z - c * i * .025, 1.65, .07, .14, col.trunk,
        tagged(o.id + '/G' + String(part++).padStart(2,'0'), '长椅',
          { hard:true, ry, mat:'wood', matScale:.48, matAmt:.36 }));
    for (const q of [-.68,.68])
      box(x + c * q, .24, z - s * q, .08, .48, .08, col.steel,
        tagged(o.id + '/G' + String(part++).padStart(2,'0'), '长椅', { hard:true, ry }));
    // Stand on the quiet outer side of each niche. The old front focus coincided with TO07's
    // inflated bin body at the west bench; this one remains inside the niche's actor inset.
    const fx = x - s * .48, fz = z - c * .48;
    const th=markThing(thing('长椅', x, .72, z, '在温室的长椅上休息一会儿。',
      'Rest on the greenhouse bench for a moment.',
      '长椅 is a long public bench.', { focus:[fx,fz], reach:1.9 }), 'TH-' + o.id);
    th.seat={at:[x,z],yaw:ry,seatY:.48};th.stand=[fx,fz];
    const hx=Math.abs(Math.cos(ry))*.86+Math.abs(Math.sin(ry))*.12;
    const hz=Math.abs(Math.sin(ry))*.86+Math.abs(Math.cos(ry))*.12;
    solid(x-hx,x+hx,z-hz,z+hz);
  }

  function buildShell() {
    rectFlat('TROP-GROUND', [bounds.x0,bounds.x1,bounds.z0,bounds.z1], col.floor,
      { y:0, mode:9, gloss:.10, mat:'paving', matScale:.75, matAmt:.25 });
    for (const p of S.paths)
      rectFlat(p.id, p.rect, p.id === 'TP06-atrium' ? col.pathD : col.path,
        { mode:9, gloss:.13, mat:'paving', matScale:.62, matAmt:.30 });
    for (const p of S.restNiches) rectFlat(p.id, p.rect, col.pathD,
      { mode:9, gloss:.12, mat:'paving', matScale:.55, matAmt:.27 });
    for (const p of S.staffPaths) rectFlat(p.id, p.rect, col.floorD,
      { mode:9, gloss:.10, mat:'paving', matScale:.85, matAmt:.22 });
    for (const w of S.outerWalls) wallRun(w);

    // Steel greenhouse roof, translucent enough that the indoor lighting still reads.
    flat(0, H, 0, bounds.x1 - bounds.x0, bounds.z1 - bounds.z0, col.sky,
      { blueprintId:'TR01-roof-glass', mode:1, alpha:.24, gloss:.88 });
    let roofBeam = 1;
    for (let x = -12; x <= 12; x += 2)
      box(x, H - .06, 0, .075, .12, 20, col.steel,
        { hard:true, blueprintId:'TR02/G' + String(roofBeam++).padStart(2,'0'), gloss:.52 });
    roofBeam = 1;
    for (let z = -9; z <= 9; z += 3)
      box(0, H - .08, z, 26, .10, .075, col.steelL,
        { hard:true, blueprintId:'TR03/G' + String(roofBeam++).padStart(2,'0'), gloss:.52 });
    // Warm/cool alternating grow lights keep the foliage dimensional after sunset.
    for (const [x,z,c] of [[-6,-6,[.85,.95,.78]],[6,-6,[.72,.90,1]],[-6,6,[.85,.95,.78]],
                            [6,6,[.72,.90,1]],[0,0,[1,.84,.62]]]) {
      box(x,H-.25,z,1.1,.08,.16,col.white,{hard:true,mode:1,glow:.12});
      light(x,H-.45,z,c,.86,6.2);
    }
  }

  function buildHabitats() {
    for (const room of S.rooms) {
      const r = room.rect;
      if (room.id === 'T00-lobby') continue;
      if (room.id === 'T06-atrium') {
        rectFlat(room.id + '/G00', r, col.soil, { mode:17, gloss:.06 });
        continue;
      }
      const ground = room.id === 'T01-crocodile' || room.id === 'T02-river-aquarium' ?
        col.waterD : room.id === 'T04-butterfly' ? col.leafD : col.soil;
      rectFlat(room.id + '/G00', r, ground,
        { mode: room.id === 'T01-crocodile' || room.id === 'T02-river-aquarium' ? 16 : 17,
          gloss: room.id === 'T01-crocodile' || room.id === 'T02-river-aquarium' ? .72 : .07 });
      if (room.id === 'T04-butterfly') {
        // A true west-to-east walk-through exhibit: two 1.5 m airlock cuts, solid glass only
        // beside them, and no full-room collider. The route zone below overlaps both public loops.
        butterflyAirlockSide(r[0],r,1);
        butterflyAirlockSide(r[1],r,5);
        continue;
      }
      const f = room.publicFocus;
      let side = 'z0';
      if (f[0] < r[0]) side='x0'; else if (f[0] > r[1]) side='x1';
      else if (f[1] > r[3]) side='z1';
      lowGlass(r, side, room.species && room.species[0], room.id);
      rectSolid(r);
      blocker(r[0],r[1],r[2],r[3],2.8);
    }

    // T01 扬子鳄: a low, broad silhouette on a mud shelf with a tapered tail.
    flat(-5.1,.025,-5.7,4.0,1.25,col.mud || col.soil,{mode:17,gloss:.05});
    moving(ball(-5.1,.34,-5.45,1.45,.25,.42,col.croc,
      tagged('T01-crocodile/G10','扬子鳄',{gloss:.08})), 'T01-crocodile/G10', 0, .05);
    moving(box(-5.1,.30,-4.82,1.70,.20,.62,col.crocD,
      tagged('T01-crocodile/G11','扬子鳄',{hard:true,gloss:.08})), 'T01-crocodile/G11', 0, .05);
    moving(taper(-5.1,.32,-6.75,.45,.28,2.15,col.crocD,
      tagged('T01-crocodile/G12','扬子鳄',{rx:Math.PI/2,gloss:.06})), 'T01-crocodile/G12', 0, .05);
    let crocPart=13;
    for (const x of [-5.55,-4.65]) for (const z of [-5.25,-5.75])
      moving(capsule(x,.23,z,.55,.12,.14,col.crocD,{rz:Math.PI/2,tag:'扬子鳄'}),
        'T01-crocodile/G'+String(crocPart++).padStart(2,'0'),0,.05);
    for (const x of [-5.42,-4.78]) moving(ball(x,.48,-4.58,.035,.035,.035,col.gold,{tag:'扬子鳄'}),
      'T01-crocodile/G'+String(crocPart++).padStart(2,'0'),0,.05);

    // T02 长江水族: three sturgeon at different depths and a moving school of small fish.
    for (let i=0;i<3;i++) {
      const x=3.2+i*1.55, y=.55+i*.32, z=-5.6+(i%2)*.9;
      moving(capsule(x,y,z,.95,.25,.30,col.fish,
        tagged('T02-river-aquarium/G' + String(10+i).padStart(2,'0'),'中华鲟',
          {rz:Math.PI/2,gloss:.42})),
        'T02-river-aquarium/G'+String(10+i).padStart(2,'0'), i*.9, .22);
      moving(taper(x-.62,y,z,.45,.23,.08,col.fishD || col.waterD,{rz:Math.PI/2,tag:'中华鲟'}),
        'T02-river-aquarium/G'+String(13+i).padStart(2,'0'),i*.9,.22);
      moving(taper(x+.55,y,z,.22,.12,.34,col.fishL,{rz:-Math.PI/2,tag:'中华鲟'}),
        'T02-river-aquarium/G'+String(16+i).padStart(2,'0'),i*.9,.22);
    }
    for (let i=0;i<9;i++) {
      const x=2.5+(i%5)*.85, y=.35+(i%3)*.34, z=-7.4+Math.floor(i/5)*1.1;
      moving(ball(x,y,z,.20,.075,.08,i%2?col.gold:col.fishL,
        tagged('T02-river-aquarium/G'+String(20+i).padStart(2,'0'),'中华鲟',{gloss:.48})),
        'T02-river-aquarium/G'+String(20+i).padStart(2,'0'), i*.61, .32);
    }

    // T03 reptiles: a coiled snake beneath a branch and a low lizard on a warm rock.
    for (let i=0;i<13;i++) {
      const a=i/13*Math.PI*2, rad=.62-i*.025;
      ball(-6.1+Math.cos(a)*rad,.22+i*.012,5.7+Math.sin(a)*rad,
        .25,.10,.18,i%2?col.snake:col.gold,
        tagged('T03-reptile/G'+String(10+i).padStart(2,'0'),'蛇',{gloss:.12}));
    }
    capsule(-6.0,.95,6.4,.13,3.8,.13,col.trunk,
      tagged('T03-reptile/G23','蛇',{rx:Math.PI/2,rz:.18}));
    ball(-3.8,.24,5.5,.70,.20,.28,col.lizard,tagged('T03-reptile/G24','蜥蜴'));
    let reptilePart=25;
    for (const s of [-1,1]) for (const z of [-.32,.32])
      capsule(-3.8+s*.58,.18,5.5+z,.48,.09,.10,col.lizard,
        tagged('T03-reptile/G'+String(reptilePart++).padStart(2,'0'),'蜥蜴',
          { rz:Math.PI/2+s*.24,ry:z }));
    taper(-4.7,.24,5.5,.90,.18,.16,col.lizard,
      tagged('T03-reptile/G29','蜥蜴',{rz:Math.PI/2}));
    rocks(-3.8,6.7,'T03-reptile',30);

    // T04 walk-through butterfly greenhouse. Only the butterflies move; the foliage uses mode 15.
    for (let i=0;i<15;i++) {
      const x=2.6+(i%5)*.82, y=.7+(i%4)*.62, z=3.8+Math.floor(i/5)*1.45;
      const cc=[col.orange,col.pink,col.blue,col.gold][i%4];
      const phase=i*.47;
      const base=20+i*3;
      const body=moving(capsule(x,y,z,.05,.18,.05,col.charcoal,
        tagged('T04-butterfly/G'+String(base).padStart(2,'0'),'蝴蝶',{rz:.3})),
        'T04-butterfly/G'+String(base).padStart(2,'0'), phase, .40);
      const wl=moving(ball(x-.10,y,z,.13,.035,.16,cc,{tag:'蝴蝶',mode:1,alpha:.88,ry:.5}),
        'T04-butterfly/G'+String(base+1).padStart(2,'0'),phase,.40);
      const wr=moving(ball(x+.10,y,z,.13,.035,.16,cc,{tag:'蝴蝶',mode:1,alpha:.88,ry:-.5}),
        'T04-butterfly/G'+String(base+2).padStart(2,'0'),phase,.40);
      body.flutter = true;
      wl.flutter = wr.flutter = true;
    }
    for (const [x,z] of [[3,4.2],[5.2,5.1],[3.4,7.2],[6.1,7.5]]) tropicalPlant(x,z,2.0);

    // T05 fruit bats hang in a dim mesh volume.
    for (let i=0;i<5;i++) {
      const x=9.55+(i%2)*1.05, y=4.7-(i%3)*.38, z=3.6+(i%3)*.72;
      const base=20+i*3;
      moving(ball(x,y,z,.18,.12,.12,col.bat,
        tagged('T05-nocturnal/G'+String(base).padStart(2,'0'),'果蝠')),
        'T05-nocturnal/G'+String(base).padStart(2,'0'), i*.72, .18);
      for (const s of [-1,1])
        moving(taper(x+s*.34,y,z,.34,.035,.30,col.bat,{rz:s*.16,tag:'果蝠'}),
          'T05-nocturnal/G'+String(base+(s<0?1:2)).padStart(2,'0'),i*.72,.18);
    }
    box(10.25,2.75,4.5,2.45,5.45,2.95,col.charcoal,
      { hard:true,blueprintId:'T05-mesh',tag:'果蝠',mode:1,alpha:.16,gloss:.15 });
  }

  function rocks(x,z,id,start=1) {
    for (let i=0;i<4;i++) {
      const a=i*1.8, r=.25+i*.08;
      ball(x+Math.cos(a)*.48,.16+r*.25,z+Math.sin(a)*.40,r,r*.55,r*.8,
        i%2?col.rock:col.rockL,
        {blueprintId:id+'/G'+String(start+i).padStart(2,'0'),gloss:.05});
    }
  }
  function tropicalPlant(x,z,h) {
    capsule(x,h*.35,z,.10,h*.70,.10,col.trunk,{gloss:.14});
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7;
      capsule(x+Math.sin(a)*.32,h*.70,z+Math.cos(a)*.32,.25,h*.46,.12,
        i%2?col.leaf:col.leafL,{mode:15,ry:a,rz:Math.sin(a)*.72,gloss:.10});
    }
  }

  function buildObjects() {
    for (const o of S.objects) {
      const [x,y,z]=o.at;
      if (o.type === 'desk') {
        box(x,.58,z,1.65,1.0,.70,col.trunk,{hard:true,ry:o.yaw,...tagged(o.id,'服务台'),mat:'wood',matScale:.7,matAmt:.34});
        box(x,.86,z,1.85,.10,.82,col.cream,{hard:true,ry:o.yaw,tag:'服务台'});
        glyphs(x,.76,z-.43,o.yaw,'服务台',{size:.14,color:col.red,mode:1,tag:'服务台'});
        markThing(thing('服务台',x,.9,z,'在服务台领取热带馆导览。','Pick up a Tropical House guide.',
          '服务台 is an information desk.',{focus:[-10,.40],reach:2}), 'TH-'+o.id);
        solid(x-1.0,x+1.0,z-.45,z+.45);
      } else if (o.type === 'map-board') {
        for(const s of [-1,1]) cyl(x,.82,z+s*.62,.05,1.64,col.steel,{tag:'导游图'});
        box(x,1.55,z, .10,1.75,1.55,col.teal,{hard:true,tag:'导游图',blueprintId:o.id});
        glyphs(x-.06,2.12,z,o.yaw,'热带馆导游图',{size:.14,color:col.white,mode:1,tag:'导游图'});
        const yaw=o.yaw||0,nx=Math.sin(yaw),nz=Math.cos(yaw),tx=Math.cos(yaw),tz=-Math.sin(yaw);
        const point=(u,v,d=.064)=>[x+tx*u+nx*d,v,z+tz*u+nz*d];
        const panel=point(0,1.48,.058);
        box(panel[0],panel[1],panel[2],1.25,.94,.014,col.cream,
          {hard:true,ry:yaw,tag:'导游图',mode:1,gloss:.10});
        const bw=bounds.x1-bounds.x0,bd=bounds.z1-bounds.z0,sx=.044,sy=.039;
        const mapU=wx=>(wx-(bounds.x0+bounds.x1)/2)*sx;
        const mapY=wz=>1.48+(wz-(bounds.z0+bounds.z1)/2)*sy;
        const mapRect=(r,fill,d=.070)=>{
          const q=point(mapU((r[0]+r[1])/2),mapY((r[2]+r[3])/2),d);
          return box(q[0],q[1],q[2],Math.max(.018,(r[1]-r[0])*sx),
            Math.max(.014,(r[3]-r[2])*sy),.012,fill,
            {hard:true,ry:yaw,tag:'导游图',mode:1,gloss:.08});
        };
        S.paths.forEach(p=>mapRect(p.rect,col.pathD,.071));
        const roomColor={T00:col.gold,T01:col.croc,T02:col.blue,T03:col.orange,
          T04:col.pink,T05:col.purple,T06:col.leaf};
        const roomLabel={T00:'入口',T01:'鳄',T02:'鲟',T03:'蛇',T04:'蝶',T05:'蝠',T06:'中庭'};
        S.rooms.forEach(room=>{
          const stem=room.id.slice(0,3),q=mapRect(room.rect,roomColor[stem]||col.leaf,.074);
          const p=point(mapU((room.rect[0]+room.rect[1])/2),
            mapY((room.rect[2]+room.rect[3])/2),.082);
          glyphs(p[0],p[1],p[2],yaw,roomLabel[stem]||room.label,
            {size:stem==='T06'?.043:.050,gap:.004,color:col.white,mode:1,tag:'导游图'});
        });
        const here=point(mapU(S.spawn.at[0]),mapY(S.spawn.at[1]),.086);
        ball(here[0],here[1],here[2],.045,.045,.018,col.red,{tag:'导游图',mode:1,gloss:.16});
        const out=point(mapU(S.exit.at[0]),mapY(S.exit.at[1]),.086);
        box(out[0],out[1],out[2],.075,.055,.016,col.orange,
          {hard:true,ry:yaw,tag:'导游图',mode:1});
        const north=point(.48,1.91,.083);
        glyphs(north[0],north[1],north[2],yaw,'北',{size:.065,gap:0,color:col.red,mode:1,tag:'导游图'});
        const legend=point(-.33,1.02,.083);
        glyphs(legend[0],legend[1],legend[2],yaw,'红点:您在这里  橙色:出口',
          {size:.045,gap:.002,color:col.charcoal,mode:1,tag:'导游图'});
        markThing(thing('导游图',x,1.6,z,'看看热带馆导游图。','Look at the Tropical House map.',
          '六个展区围绕雨林中庭。',{focus:[-9.1,-2.2],reach:2.1}), 'TH-'+o.id);
      } else if (o.type === 'waterfall') {
        const sc=o.scale;
        box(x,y,z,sc[0],sc[1],sc[2],col.rockD,{hard:true,blueprintId:o.id});
        for(let i=0;i<7;i++) moving(box(x+(i-3)*.20,y,z-.34, .15,sc[1]*.90,.035,col.waterL,
          {hard:true,mode:1,alpha:.66,glow:.03}),
          o.id+'/G'+String(i+1).padStart(2,'0'),i*.4,.05);
        waterGlows.push(glow(M.trs(x,.025,z-.75,0,2.4,1,1.8),col.waterL,.22,false));
      } else if (o.type === 'tropical-tree') {
        capsule(x,o.height*.38,z,.22,o.height*.76,.22,col.trunk,{blueprintId:o.id,gloss:.14});
        for(let i=0;i<12;i++) {
          const a=i*2.399, r=.8+(i%3)*.32;
          ball(x+Math.cos(a)*r,o.height*(.72+(i%3)*.08),z+Math.sin(a)*r,
            .78,.46,.78,i%3?col.leaf:col.leafL,{mode:15,gloss:.10});
        }
        solid(x-.32,x+.32,z-.32,z+.32);
        shade(x,z,3.6,3.6,.28);
      } else if (o.type === 'bench') bench(o);
      else if (o.type === 'bin') {
        cyl(x,.34,z,.23,.68,col.steel,{blueprintId:o.id,tag:'垃圾桶',gloss:.34});
        cyl(x,.70,z,.25,.08,col.charcoal,{tag:'垃圾桶'});
        markThing(thing('垃圾桶',x,.75,z,'把垃圾扔进垃圾桶。','Put the rubbish in the bin.',
          '垃圾桶 is a rubbish bin.',{focus:[x+.8,z],reach:1.7}),'TH-'+o.id);
        solid(x-.22,x+.22,z-.22,z+.22);
      } else if (o.type === 'lit-sign') {
        box(x,y,z,1.45,.45,.08,col.green || col.teal,{hard:true,ry:o.yaw,blueprintId:o.id,tag:'出口',mode:1,glow:.14});
        glyphs(x,y,z,o.yaw,'出口',{size:.22,color:col.white,mode:1,glow:.08,tag:'出口'});
      }
    }

    // The waterfall's receiving pool and the planted atrium are the visual centre of the loop.
    flat(0,.018,6.8,3.4,2.6,col.water,{mode:16,gloss:.82,blueprintId:'T06-pool'});
    rocks(-.75,6.9,'T06-atrium',20); rocks(.85,6.5,'T06-atrium',24);
    for(const [x,z,h] of [[-.6,-6.7,2.6],[.65,-4.8,2.2],[-.55,-1.5,2.8],[.55,2.2,2.3]])
      tropicalPlant(x,z,h);

    const ex=S.exit;
    const exitThing=thing('出口',ex.at[0],2.4,ex.at[1], '从出口回到动物园。',
      'Return to the zoo through the exit.', '出口 means exit.',
      {focus:[-11.2,ex.at[1]],reach:2.0});
    exitThing.blueprintId='TH-'+ex.door;
    exitThing.exit={place:ex.destination,at:{x:ex.arrival[0],z:ex.arrival[1],yaw:ex.yaw}};

    const main=thing('入口',-12.75,2.0,0,'这里是热带馆入口。','This is the Tropical House entrance.',
      '入口 means entrance.',{focus:[-11.5,0],reach:1.8});
    main.blueprintId='TH-trop-main';
    for(let i=0;i<S.speciesThings.length;i++)
      board(S.speciesThings[i],[col.red,col.blue,col.gold,col.teal,col.orange,col.purple][i%6]);
  }

  buildShell();
  buildHabitats();
  buildObjects();
  if (typeof ZooArt === 'undefined')
    throw new Error('ZooTropical: ZooArt orchestrator is missing');
  const artStats=ZooArt.buildTropical(B,{plan,scene:S});
  if (typeof ZooContents === 'undefined')
    throw new Error('ZooTropical: ZooContents compiler is missing');
  const contentsStats=ZooContents.buildTropical(B,
    typeof ZOO_CONTENTS_BLUEPRINT !== 'undefined' ? ZOO_CONTENTS_BLUEPRINT : null,plan);

  function tick(t) {
    for (let i=0;i<movers.length;i++) {
      const q=movers[i], a=t*.65+q.phase;
      q.p.m[12]=q.x+Math.sin(a*.83)*q.amp;
      q.p.m[13]=q.y+Math.sin(a*1.37)*q.amp*(q.p.flutter? .65:.18);
      q.p.m[14]=q.z+Math.cos(a)*q.amp*(q.p.flutter? .75:.25);
      q.p.cx=q.p.m[12]; q.p.cy=q.p.m[13]; q.p.cz=q.p.m[14];
    }
  }
  function setNight(k) {
    const n=.25+.75*k;
    for(const p of lit) p.glow=.08+n*.22;
    for(const g of waterGlows) g.a=.12+n*.16;
  }
  const walk = [...S.paths, ...S.restNiches].map(p => ({
    id:p.id, x0:p.rect[0], x1:p.rect[1], z0:p.rect[2], z1:p.rect[3],
    light:[0,H-.5,0], wet:1.35,
  }));
  walk.push({id:'T04-butterfly-walk-through',x0:1,x1:9,z0:3,z1:8.5,
    light:[4.5,H-.5,5.8],wet:1.55});
  const rooms=S.rooms;
  const scene=B.finish({
    tick,setNight,RX:13,RZ:10,H,OUT:{x:S.exit.arrival[0],z:S.exit.arrival[1],yaw:S.exit.yaw},
    label:'热带馆',labelK:'热带馆 · Tropical House',indoor:true,cutaway:false,
    near:.12,far:85,fogNear:18,fogD:.018,expose:.58,spawn:{x:S.spawn.at[0],z:S.spawn.at[1],yaw:S.spawn.yaw},
    zones:walk,
    roomAt(x,z) {
      for(const r of rooms) if(x>=r.rect[0]&&x<=r.rect[1]&&z>=r.rect[2]&&z<=r.rect[3])
        return {id:r.id,label:r.label,x0:r.rect[0],x1:r.rect[1],z0:r.rect[2],z1:r.rect[3],wet:1.4};
      return walk.find(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)||walk[0];
    },
  });
  scene.contentsStats=contentsStats;
  scene.artStats=artStats;
  return scene;
});
