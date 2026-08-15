// 青禾银行 — a fictional municipal bank branch.
//
// A single-floor street-level banking hall. Chinese city-centre branches are wide, low, and busy:
// a door off the street, a queue-ticket machine, a row of counters behind glass, a lobby of ATMs,
// a desk where you open an account, and a safe deposit corridor at the back. The vocabulary is the
// reason it exists — numbers under pressure, forms, ID, an account, a card — and it is the
// documented next building after the hospital (BIG-UPDATES.md N2: "银行. Numbers under pressure,
// forms, ID, an account.").
//
// Mirrors the hospital's proven shape (js/hospital.js): a shell factory owns the envelope, the
// shared furniture vocabulary, and the street contract; zone files register one builder each in
// BankFit before game.js touches the Lazy scene:
//
//   BankFit['atms'] = A => { ... };
//
// The shell owns the envelope, wayfinding, shared furniture, and the street door. Zone files own
// their counters, machines, and cast. A single Lazy scene, not a multi-floor stack — a branch is
// one big room, and splitting it across decks would invent vertical-player machinery it does not need.
const BankFit = {};
const BankCast = [];

// Street-side return point. It sits in the open turning pocket just north of the branch, beyond
// the bus shelter's z=-8.20 end and still 2.73 m inside the west kerb. Facing west keeps the
// outdoor camera east of the player, looking back at the complete address instead of forcing the
// eye into the corner block's camera blocker. street-bank.js owns the matching threshold.
const BANK_OUT = { x: 24.77, z: -7.45, yaw: -Math.PI / 2 };

const BankCore = (() => {
  // The public hall needs enough volume for a real ceiling datum, integrated wayfinding and a
  // teller canopy.  The old 3 m shell forced the signs into the ceiling and made a 32 m-wide room
  // feel like a basement. RX/RZ/H feed R.setRoom.
  const RX = 16.0, RZ = 11.0, H = 3.65;

  const col = {
    floor:C('#bdb5a9'), floorD:C('#756f68'), floorL:C('#d7d0c5'),
    wall:C('#ddd6ca'), wallD:C('#aaa198'), wallL:C('#f0e9de'),
    ceil:C('#cfc7bb'),
    // Restrained civic red, ink blue and bronze form the identity.  Red is an accent now, not a
    // room full of luminous slabs; the walnut and charcoal give pale stone something to sit on.
    red:C('#9f352e'), redD:C('#632721'), redL:C('#c35b50'),
    gold:C('#b18842'), goldL:C('#d7b66d'),
    navy:C('#263b46'), navyD:C('#18262e'),
    marble:C('#c9c1b6'), marbleD:C('#918a81'),
    steel:C('#879195'), steelD:C('#4d585d'), chrome:C('#b9c0c1'),
    wood:C('#76543e'), woodD:C('#3c2c25'), woodL:C('#9b7557'),
    glass:C('#89afba'), glassLit:C('#aacbd1'),
    screen:C('#102b35'), screenOn:C('#72c7b6'),
    black:C('#171c1f'), ink:C('#22292d'), inkL:C('#596369'),
    paper:C('#eee6d7'), white:C('#f5efe4'), yellow:C('#c49a42'), brass:C('#a47c3e'),
    greenLed:C('#4fd68c'), redLed:C('#c8452f'),
    fabric:C('#647275'), fabricD:C('#414e52'), fabricL:C('#a88f7b'),
    plant:C('#3d654d'), plantL:C('#668269'), jade:C('#4f776b'), warm:C('#f0c987'),
  };

  // The colour each zone signs its furniture in, so the eight read as one institution.
  const ZONE_COL = {
    entry: col.red, ticket: col.gold, counters: col.navy, desks: col.wood,
    atms: col.navy, safe: col.steelD, vip: col.redD, office: col.woodD,
  };

  function makeHall(lazyName) {
    return Lazy(lazyName, () => {
      const B = Build.scene({ wood:new Set([col.wood, col.woodD, col.woodL]), fabricGloss:.05 });
      const { box,cyl,ball,capsule,taper,flat,wall,glyphs,solid,blocker,shade,glow,light,thing } = B;
      const lit = [], screens = [], entranceLeaves = [], cameraLenses = [];

      const tagOpt = (tag, o={}) => tag ? { ...o, tag } : o;
      const luminous = (p, k=.3) => { lit.push({ p, g0:p.glow||0, k }); return p; };
      const liveScreen = (p, phase=0) => {
        screens.push({ p, g0:p.glow||.08, phase });
        return luminous(p, .22);
      };

      // ---------------------------------------------------------------- partition helpers
      // Same idiom as hospital.js: a wall with one or more openings, lintel restored over each door.
      function partitionZ(z, x0, x1, openings=[], color=col.wall, tag) {
        const cuts = openings.map(o => Array.isArray(o) ? o : [o,1.3])
          .map(([c,w]) => [Math.max(x0,c-w/2),Math.min(x1,c+w/2)])
          .sort((a,b)=>a[0]-b[0]);
        let at=x0;
        for(const [a,b] of cuts) {
          if(a>at+.02) {
            box((at+a)/2,H/2,z,a-at,H,.18,color,{hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
            solid(at,a,z-.09,z+.09);
          }
          // lintel over the opening, so the ceiling is not slit open along every door
          box((a+b)/2,2.40+(H-2.40)/2,z,b-a,H-2.40,.18,color,{hard:true,...tagOpt(tag)});
          at=Math.max(at,b);
        }
        if(at<x1-.02) {
          box((at+x1)/2,H/2,z,x1-at,H,.18,color,{hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
          solid(at,x1,z-.09,z+.09);
        }
      }
      function partitionX(x, z0, z1, openings=[], color=col.wall, tag) {
        const cuts = openings.map(o => Array.isArray(o) ? o : [o,1.3])
          .map(([c,w]) => [Math.max(z0,c-w/2),Math.min(z1,c+w/2)])
          .sort((a,b)=>a[0]-b[0]);
        let at=z0;
        for(const [a,b] of cuts) {
          if(a>at+.02) {
            box(x,H/2,(at+a)/2,.18,H,a-at,color,{hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
            solid(x-.09,x+.09,at,a);
          }
          box(x,2.40,(a+b)/2,.18,H-2.40,b-a,color,{hard:true,...tagOpt(tag)});
          at=Math.max(at,b);
        }
        if(at<z1-.02) {
          box(x,H/2,(at+z1)/2,.18,H,z1-at,color,{hard:true,mat:'plaster',matScale:.62,matAmt:.12,...tagOpt(tag)});
          solid(x-.09,x+.09,at,z1);
        }
      }

      // ---------------------------------------------------------------- shared furniture
      // Dimensional wayfinding: a matte institutional face, bronze rails and warm lettering.  The
      // old helper made every label a glowing coloured rectangle, so stacked signs looked like
      // loose UI panels instead of part of the architecture.
      function sign(x,y,z,yaw,text,color=col.red,tag=text,size=.20) {
        const span=Math.max(1.20,[...text].length*(size+.07)+.36);
        const alongX=Math.abs(Math.sin(yaw))<.5;
        const nx=Math.sin(yaw),nz=Math.cos(yaw);
        box(x,y-.015,z,alongX?span+.10:.09,.38,alongX?.09:span+.10,col.black,
          {hard:true,gloss:.18,...tagOpt(tag)});
        const p=box(x,y,z,alongX?span:.065,.32,alongX?.065:span,color,
          {hard:true,mode:6,gloss:.25,...tagOpt(tag)});
        for(const sy of [-1,1]) box(x,y+sy*.18,z,alongX?span+.06:.026,.026,
          alongX?.026:span+.06,col.brass,{hard:true,gloss:.62,...tagOpt(tag)});
        glyphs(x+nx*.045,y+.005,z+nz*.045,yaw,text,
          {size,gap:.055,color:col.wallL,mode:1,glow:.025,lift:.014,tag});
        return p;
      }
      function doorPlate(x,y,z,yaw,text,tag=text,color=col.navy) {
        const alongX=Math.abs(Math.sin(yaw))<.5;
        const nx=Math.sin(yaw),nz=Math.cos(yaw);
        box(x,y,z,alongX?1.36:.065,.34,alongX?.065:1.36,col.black,
          {hard:true,gloss:.18,...tagOpt(tag)});
        box(x,y,z,alongX?1.28:.072,.28,alongX?.072:1.28,color,
          {hard:true,mode:6,gloss:.24,...tagOpt(tag)});
        box(x,y-.165,z,alongX?1.36:.026,.025,alongX?.026:1.36,col.brass,
          {hard:true,gloss:.58,...tagOpt(tag)});
        glyphs(x+nx*.046,y,z+nz*.046,yaw,text,
          {size:.145,gap:.045,color:col.wallL,mode:1,glow:.02,lift:.012,tag});
      }
      // A live screen: black glass, a lit panel, optional glyph content. Used for ATMs, the
      // queue display, rate boards. The same idiom as hospital.js `screen()`.
      function screen(x,y,z,yaw,w,h,text,tag=text,color=col.screen) {
        const alongX=Math.abs(Math.sin(yaw))<.5;
        const nx=Math.sin(yaw),nz=Math.cos(yaw);
        box(x,y,z,alongX?w:.07,h,alongX?.07:w,col.black,{hard:true,gloss:.30,...tagOpt(tag)});
        const p=box(x,y,z,alongX?w-.10:.04,h-.10,alongX?.04:w-.10,color,
          {hard:true,mode:1,glow:.08,...tagOpt(tag)});
        liveScreen(p,(x+z)*.17);
        if(text) glyphs(x+nx*.045,y,z+nz*.045,yaw,text,
          {size:Math.min(.17,h*.32),gap:.05,color:col.wallL,mode:1,lift:.012,tag});
        return p;
      }
      // A low civic-service counter: charcoal carcass, recessed walnut fluting, bronze reveal and
      // a pale stone worktop.  Barely-there high-gloss glazing is framed as glazing; it no longer
      // becomes a milky luminous wall in front of the teller.
      function counter(x,z,w=3.0,d=.72,tag='柜台',color=col.marble,y=.54) {
        box(x,.49,z,w,.82,d,col.navyD,{round:.06,hard:true,mode:6,gloss:.24,...tagOpt(tag)});
        box(x,.11,z,w+.10,.18,d+.10,col.woodD,{hard:true,mode:6,...tagOpt(tag)});
        box(x,.52,z-d*.515,w-.16,.54,.035,col.woodD,{hard:true,mode:6,...tagOpt(tag)});
        const flutes=Math.max(4,Math.round(w/.28));
        for(let i=0;i<flutes;i++) box(x-w/2+(i+.5)*w/flutes,.52,z-d*.545,.035,.56,.025,
          col.brass,{hard:true,gloss:.48,...tagOpt(tag)});
        box(x,.83,z-d*.555,w-.14,.025,.025,col.brass,{hard:true,gloss:.62,...tagOpt(tag)});
        box(x,.94,z,w+.14,.12,d+.14,color,
          {round:.035,hard:true,gloss:.24,mat:'plaster',matScale:1.4,matAmt:.14,...tagOpt(tag)});
        box(x,.875,z-d*.58,w+.02,.035,.045,col.goldL,{hard:true,gloss:.58,...tagOpt(tag)});

        const gap=.68, paneW=Math.max(.34,(w-gap)/2-.06), glassZ=z-d/2+.055;
        for(const s of [-1,1]) {
          const gx=x+s*(gap/2+paneW/2+.03);
          box(gx,1.50,glassZ,paneW,.88,.018,col.glass,
            {hard:true,mode:1,alpha:.11,gloss:.92,...tagOpt(tag)});
        }
        for(const gx of [x-w/2+.025,x-gap/2,x+gap/2,x+w/2-.025])
          box(gx,1.50,glassZ,.035,.94,.045,col.black,{hard:true,gloss:.32,...tagOpt(tag)});
        box(x,1.98,glassZ,w,.055,.065,col.black,{hard:true,gloss:.34,...tagOpt(tag)});
        solid(x-w/2,x+w/2,z-d/2,z+d/2);
        shade(x,z,w+.22,d+.65,.22);
      }
      // A writing desk: warm wood, the place a customer fills in a form. Lower than a counter.
      function desk(x,z,w=1.50,d=.70,tag='桌子',yaw=0,color=col.wood) {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,.73,z,swap?d:w,.12,swap?w:d,color,{round:.04,hard:true,mode:6,gloss:.26,...tagOpt(tag)});
        box(x,.42,z,swap?d*.72:w*.72,.56,swap?w*.82:d*.82,col.woodD,
          {hard:true,mode:6,gloss:.20,...tagOpt(tag)});
        const nx=Math.sin(yaw), nz=Math.cos(yaw);
        box(x-nx*(d/2+.018),.46,z-nz*(d/2+.018),swap?.025:w-.22,.42,
          swap?w-.22:.025,col.redD,{hard:true,mode:6,...tagOpt(tag)});
        box(x-nx*(d/2+.04),.66,z-nz*(d/2+.04),swap?.025:w-.16,.025,
          swap?w-.16:.025,col.brass,{hard:true,gloss:.58,...tagOpt(tag)});
        for(const sx of [-1,1]) for(const sz of [-1,1])
          box(x+(swap?sz*d*.37:sx*w*.37),.35,z+(swap?sx*w*.37:sz*d*.37),.06,.70,.06,col.brass,{hard:true,gloss:.45,...tagOpt(tag)});
        solid(x-(swap?d:w)/2,x+(swap?d:w)/2,z-(swap?w:d)/2,z+(swap?w:d)/2);
        shade(x,z,swap?d+.25:w+.25,swap?w+.25:d+.25,.18);
      }
      // Upholstered visitor chair with a shaped shell and warm-metal feet.
      function chair(x,z,yaw=0,tag='椅子',color=col.fabric) {
        const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
        box(x,.45,z,.68,.18,.62,color,{round:.10,mode:7,gloss:.04,ry:yaw,...tagOpt(tag)});
        box(x-f[0]*.28,.75,z-f[1]*.28,.68,.58,.16,color,
          {round:.10,mode:7,gloss:.04,ry:yaw,...tagOpt(tag)});
        for(const s of [-1,1]) {
          const ax=x+r[0]*s*.33, az=z+r[1]*s*.33;
          box(ax,.58,az,.10,.28,.58,color,{round:.06,mode:7,gloss:.04,ry:yaw,...tagOpt(tag)});
        }
        for(const sx of [-1,1]) for(const sz of [-1,1]) {
          const px=x+r[0]*sx*.27+f[0]*sz*.22,pz=z+r[1]*sx*.27+f[1]*sz*.22;
          taper(px,.16,pz,.055,.30,.045,col.woodD,{gloss:.28,...tagOpt(tag)});
          cyl(px,.025,pz,.065,.025,col.brass,{gloss:.58,...tagOpt(tag)});
        }
        shade(x,z,.82,.76,.18);
      }
      function bench(x,z,n=4,yaw=0,tag='等候椅',color=col.fabric) {
        const r=[Math.cos(yaw),-Math.sin(yaw)], f=[Math.sin(yaw),Math.cos(yaw)], w=n*.66;
        const alongX=Math.abs(r[0])>.5;
        box(x,.45,z,alongX?w:.70,.18,alongX?.70:w,color,
          {round:.10,mode:7,gloss:.04,ry:yaw,...tagOpt(tag)});
        box(x-f[0]*.31,.75,z-f[1]*.31,alongX?w:.16,.58,alongX?.16:w,color,
          {round:.09,mode:7,gloss:.04,ry:yaw,...tagOpt(tag)});
        for(let i=1;i<n;i++) {
          const u=-w/2+i*w/n, px=x+r[0]*u, pz=z+r[1]*u;
          box(px,.48,pz,alongX?.025:.57,.11,alongX?.57:.025,col.fabricD,
            {hard:true,ry:yaw,...tagOpt(tag)});
        }
        for(const s of [-1,1]) {
          const ax=x+r[0]*s*(w/2-.08),az=z+r[1]*s*(w/2-.08);
          box(ax,.59,az,alongX?.12:.64,.30,alongX?.64:.12,color,
            {round:.06,mode:7,ry:yaw,...tagOpt(tag)});
          for(const q of [-1,1]) {
            const lx=ax+f[0]*q*.22,lz=az+f[1]*q*.22;
            taper(lx,.16,lz,.055,.30,.045,col.woodD,{gloss:.28,...tagOpt(tag)});
            cyl(lx,.025,lz,.065,.025,col.brass,{gloss:.58,...tagOpt(tag)});
          }
        }
        if(alongX) solid(x-w/2,x+w/2,z-.35,z+.35);
        else solid(x-.35,x+.35,z-w/2,z+w/2);
        shade(x,z,alongX?w+.25:.95,alongX?.95:w+.25,.18);
      }
      function lowTable(x,z,w=1.2,d=.68,tag='茶几',yaw=0) {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,.43,z,swap?d:w,.10,swap?w:d,col.wood,{round:.04,hard:true,mode:6,gloss:.29,...tagOpt(tag)});
        for(const s of [-1,1]) box(x+(swap?0:s*(w/2-.12)),.21,z+(swap?s*(w/2-.12):0),
          swap?d-.10:.065,.42,swap?.065:d-.10,col.brass,{hard:true,gloss:.56,...tagOpt(tag)});
        solid(x-(swap?d:w)/2,x+(swap?d:w)/2,z-(swap?w:d)/2,z+(swap?w:d)/2);
      }
      // A potted 发财树 — a real trunk and clustered canopy rather than upright green capsules.
      function potPlant(x,z,s=1,tag='发财树') {
        taper(x,.25*s,z,.34*s,.48*s,.27*s,col.floorD,{hard:true,gloss:.22,...tagOpt(tag)});
        cyl(x,.61*s,z,.075*s,.82*s,col.woodD,{gloss:.18,...tagOpt(tag)});
        for(let i=0;i<8;i++) {
          const a=i*2.399, r=(.22+.07*(i%3))*s, yy=(.90+.11*(i%3))*s;
          capsule(x+Math.cos(a)*r*.45,yy-.14*s,z+Math.sin(a)*r*.45,.035*s,.42*s,.035*s,
            col.woodD,{ry:a,rz:(i%2?1:-1)*.38,gloss:.16,...tagOpt(tag)});
          ball(x+Math.cos(a)*r,yy,z+Math.sin(a)*r,.30*s,.16*s,.22*s,
            i%2?col.plant:col.plantL,{mode:15,ry:a,gloss:.08,...tagOpt(tag)});
        }
      }
      // A security camera dome on the ceiling. Banks read as banks partly because you are watched.
      function cameraDome(x,z) {
        box(x,H-.06,z,.30,.06,.30,col.wallD,{hard:true,gloss:.20});
        cyl(x,H-.10,z,.07,.06,col.ink,{gloss:.40});
        const p=cyl(x,H-.11,z+.025,.04,.02,col.steelD,{gloss:.50});
        cameraLenses.push({p,x0:x,z0:z+.025,phase:cameraLenses.length*1.73});
      }
      // A queue-management stanchion: post + retractable belt. What makes a bank lobby a bank lobby.
      function stanchion(x,z,tag='排队') {
        cyl(x,.48,z,.032,.96,col.black,{gloss:.40,...tagOpt(tag)});
        cyl(x,.98,z,.065,.075,col.brass,{gloss:.62,...tagOpt(tag)});
        cyl(x,.035,z,.11,.055,col.steelD,{gloss:.42,...tagOpt(tag)});
      }
      function queueBelt(x0,z0,x1,z1,tag='排队') {
        const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx);
        box((x0+x1)/2,.93,(z0+z1)/2,len,.055,.026,col.redD,
          {hard:true,ry:yaw,mode:6,gloss:.18,...tagOpt(tag)});
      }
      function slatPanel(x,z,w=3.0,h=2.2,yaw=0,tag='木饰面',color=col.woodD) {
        const alongX=Math.abs(Math.sin(yaw))<.5, r=[Math.cos(yaw),-Math.sin(yaw)];
        box(x,h/2+.28,z,alongX?w:.055,h,alongX?.055:w,col.black,
          {hard:true,mode:6,gloss:.16,...tagOpt(tag)});
        const n=Math.max(5,Math.floor(w/.20));
        for(let i=0;i<n;i++) {
          const u=-w/2+(i+.5)*w/n,px=x+r[0]*u,pz=z+r[1]*u;
          box(px,h/2+.28,pz,alongX?.085:.075,h-.08,alongX?.075:.085,color,
            {hard:true,mode:6,gloss:.24,ry:yaw,...tagOpt(tag)});
        }
        box(x,.285,z,alongX?w+.08:.08,.035,alongX?.08:w+.08,col.brass,
          {hard:true,gloss:.60,...tagOpt(tag)});
      }
      function pendant(x,z,r=.22,tag='灯') {
        cyl(x,H-.08,z,.10,.045,col.brass,{gloss:.58,...tagOpt(tag)});
        capsule(x,H-.42,z,.018,.64,.018,col.black,{gloss:.25,...tagOpt(tag)});
        taper(x,H-.78,z,r*1.45,.28,r*1.05,col.brass,{gloss:.54,...tagOpt(tag)});
        const p=ball(x,H-.91,z,r*.55,r*.55,r*.55,col.warm,{mode:1,glow:.16,...tagOpt(tag)});
        luminous(p,.10); light(x,H-.94,z,[1,.78,.52],.16,3.0);
      }
      function cabinet(x,z,w=1.6,h=1.8,d=.42,tag='柜子',color=col.wallD,yaw=0) {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,h/2,z,swap?d:w,h,swap?w:d,color,{hard:true,mode:6,gloss:.20,ry:yaw,...tagOpt(tag)});
        for(const s of [-1,1]) {
          const r=[Math.cos(yaw),-Math.sin(yaw)],u=s*w*.245,px=x+r[0]*u,pz=z+r[1]*u;
          box(px,h/2,pz,swap?d+.018:w*.48-.025,h-.10,swap?w*.48-.025:d+.018,col.floorL,
            {hard:true,mode:6,gloss:.18,ry:yaw,...tagOpt(tag)});
        }
        box(x,.11,z,swap?d+.08:w+.08,.18,swap?w+.08:d+.08,col.woodD,{hard:true,ry:yaw,...tagOpt(tag)});
        for(const s of [-1,1]) {
          const r=[Math.cos(yaw),-Math.sin(yaw)],u=s*.10;
          capsule(x+r[0]*u,h*.56,z+r[1]*u,.018,.16,.018,col.brass,{gloss:.60,...tagOpt(tag)});
        }
      }

      // ---------------------------------------------------------------- envelope
      // Honed stone, a charcoal arrival runner and bronze hairlines establish one uninterrupted
      // route from the street to the teller wall.  These large planes replace the former sea of
      // equally pale tile with a clear foreground, middle ground and destination.
      flat(0,.002,0,RX*2,RZ*2,col.floor,{mat:'concrete',matScale:1.60,matAmt:.20,gloss:.10});
      flat(0,.009,-4.15,3.90,12.70,col.navyD,{mode:7,gloss:.045,tag:'营业厅'});
      for(const s of [-1,1]) flat(s*1.98,.013,-4.15,.055,12.58,col.brass,
        {gloss:.62,tag:'营业厅'});
      // A four-sided stone border and a narrow bronze reveal give the oversized plan an edge.
      for(const [px,pz,pw,pd] of [
        [0,RZ-.38,RX*2,.52],[0,-RZ+.38,RX*2,.52],
        [-RX+.38,0,.52,RZ*2],[RX-.38,0,.52,RZ*2],
      ]) flat(px,.007,pz,pw,pd,col.floorD,{mat:'concrete',matScale:1.60,matAmt:.18,gloss:.09});
      for(const [px,pz,pw,pd] of [[0,RZ-.69,RX*2-1.3,.035],[0,-RZ+.69,RX*2-1.3,.035]])
        flat(px,.012,pz,pw,pd,col.brass,{gloss:.56});

      // Warm acoustic ceiling with three authored rafts: arrival, public service and tellers.
      box(0,H+.08,0,RX*2+.30,.16,RZ*2+.30,col.ceil,{hard:true,gloss:.06});
      box(0,H-.035,-8.05,6.4,.13,2.25,col.navyD,{hard:true,mode:6,gloss:.17,tag:'入口天花'});
      box(0,H-.035,-2.05,10.6,.13,2.05,col.woodD,{hard:true,mode:6,gloss:.20,tag:'大厅天花'});
      box(0,H-.035,3.35,14.2,.13,2.35,col.woodD,{hard:true,mode:6,gloss:.20,tag:'柜台天花'});
      for(const s of [-1,1]) box(s*6.95,H-.11,3.35,.055,.20,2.26,col.brass,
        {hard:true,gloss:.55,tag:'柜台天花'});
      // perimeter walls; the street door is a real opening on the -z wall (entrance side)
      partitionZ(RZ,-RX,RX,[],col.wall,'外墙');
      partitionZ(-RZ,-RX,RX,[[0,3.6]],col.wall,'外墙');   // the entrance opening
      partitionX(-RX,-RZ,RZ,[],col.wall,'外墙');
      partitionX(RX,-RZ,RZ,[],col.wall,'外墙');
      // A low charcoal datum, walnut pilasters and bronze chair rail stop the perimeter from
      // reading as one unmodelled white box.  They are finish layers, not extra collision walls.
      for(const sx of [-1,1]) {
        box(sx*(RX-.105),.66,0,.035,1.26,RZ*2-1.1,col.navyD,{hard:true,mode:6,gloss:.17,tag:'墙裙'});
        box(sx*(RX-.13),1.31,0,.028,.035,RZ*2-1.1,col.brass,{hard:true,gloss:.58,tag:'墙裙'});
        for(let z=-8;z<=8;z+=4)
          box(sx*(RX-.145),2.38,z,.045,2.02,.12,col.woodD,{hard:true,mode:6,gloss:.22,tag:'墙板'});
      }
      box(0,.65,RZ-.105,RX*2-1.1,1.24,.035,col.navyD,{hard:true,mode:6,gloss:.17,tag:'墙裙'});
      box(0,1.30,RZ-.13,RX*2-1.1,.035,.028,col.brass,{hard:true,gloss:.58,tag:'墙裙'});
      // shopfront glazing either side of the door, so the street reads through the -z wall
      for(const gx of [-4.2,4.2]) {
        box(gx,1.62,-RZ+.04,4.0,2.86,.025,col.glass,
          {hard:true,mode:1,alpha:.11,gloss:.92,tag:'门'});
        for(const x of [gx-2.0,gx,gx+2.0]) box(x,1.62,-RZ+.015,.045,2.92,.065,col.black,
          {hard:true,gloss:.30,tag:'门'});
        box(gx,3.05,-RZ+.015,4.08,.055,.07,col.brass,{hard:true,gloss:.58,tag:'门'});
      }
      blocker(-RX-.2,RX+.2,-RZ-.2,-RZ+.2,H+.5);
      blocker(-RX-.2,RX+.2,RZ-.2,RZ+.2,H+.5);
      blocker(-RX-.2,-RX+.2,-RZ,RZ,H+.5);
      blocker(RX-.2,RX+.2,-RZ,RZ,H+.5);

      // What the automatic entrance opens onto.  The street is a separate scene, so without a
      // small portal set the leaves slid apart onto the renderer's clear colour.  These few
      // low-cost planes continue the business-district pavement, road and opposite shop row far
      // enough to fill every view through the 3.6 m opening; the fixed threshold blocker still
      // owns collision and the named door still performs the actual scene change.
      flat(0,.004,-RZ-1.65,11.0,3.30,col.floorD,
        {mat:'paving',matScale:1.1,matAmt:.26,gloss:.11,tag:'门外'});
      box(0,.10,-RZ-3.32,11.0,.20,.16,col.steelD,{hard:true,gloss:.22,tag:'门外'});
      flat(0,.001,-RZ-5.55,20.0,4.40,col.ink,
        {mat:'concrete',matScale:2.8,matAmt:.15,gloss:.14,tag:'门外'});
      for(let x=-8;x<=8;x+=4)
        flat(x,.010,-RZ-5.55,1.55,.09,col.gold,{mode:1,alpha:.72,tag:'门外'});
      box(0,3.45,-RZ-8.10,22.0,6.90,.34,col.wallD,
        {hard:true,mat:'plaster',matScale:.62,matAmt:.12,tag:'门外'});
      box(0,.52,-RZ-7.90,22.2,1.04,.20,col.navyD,{hard:true,tag:'门外'});
      for(let x=-8.0;x<=8.0;x+=3.2) {
        box(x,2.04,-RZ-7.90,2.35,2.46,.08,col.black,{hard:true,gloss:.24,tag:'门外'});
        luminous(box(x,2.04,-RZ-7.84,2.15,2.26,.025,col.glass,
          {hard:true,mode:1,alpha:.44,gloss:.46,tag:'门外'}),.34);
      }
      // A pavement tree and parked scooter break the portal's straight horizontal layers, so it
      // reads as a real street rather than a painted theatre flat.
      cyl(4.25,.92,-RZ-1.72,.11,1.84,col.woodD,{gloss:.18,tag:'门外'});
      ball(4.25,2.05,-RZ-1.72,.72,.66,.72,col.plant,{mode:15,gloss:.10,tag:'门外'});
      for(const x of [-3.6,-2.95]) cyl(x,.31,-RZ-2.25,.24,.08,col.black,
        {rx:Math.PI/2,gloss:.16,tag:'门外'});
      capsule(-3.28,.54,-RZ-2.25,.035,.82,.035,col.red,
        {rz:Math.PI/2,gloss:.30,tag:'门外'});

      // ---------------------------------------------------------------- illumination
      // Six deliberate pools replace twenty overlapping flood lights.  The luminous slots tell
      // you where light comes from; the real lights are weak enough to preserve material colour.
      const hallLights=[[-1.35,-8.05,2.10,.26],[1.35,-8.05,2.10,.26],
        [-3.15,-2.05,2.55,.25],[3.15,-2.05,2.55,.25],
        [-3.60,3.35,2.75,.28],[3.60,3.35,2.75,.28]];
      for(const [lx,lz,len,power] of hallLights) {
        const p=box(lx,H-.115,lz,len,.035,.085,col.warm,{hard:true,mode:1,glow:.22,tag:'灯'});
        luminous(p,.10); light(lx,H-.25,lz,[1.0,.84,.65],power,5.2);
      }
      // Quiet side-wall washes keep the consultation and ATM edges legible without flattening
      // the whole room.
      for(const sx of [-1,1]) light(sx*11.3,H-.38,-.25,[.83,.88,.88],.18,4.3);
      // Camera domes at the four corners and over the counters — the surveillance read.
      for(const [cx,cz] of [[-RX+1.5,-RZ+1.5],[RX-1.5,-RZ+1.5],[-RX+1.5,RZ-1.5],[RX-1.5,RZ-1.5]])
        cameraDome(cx,cz);

      // ---------------------------------------------------------------- the bank's own signage
      // The red municipal-bank name over the entrance, inside, so it reads from the door as well.
      sign(0,3.16,-RZ+.10,0,'青禾银行',col.red,'门',.255);
      glyphs(0,2.84,-RZ+.06,0,'QINGHE BANK · 营业厅',
        {size:.090,gap:.026,color:col.goldL,mode:1,glow:.02,lift:.012,tag:'门'});

      // ---------------------------------------------------------------- the street door
      // Two automatic glass leaves, a floor mat, the threshold. The .exit hands control back to the
      // street, the same pharmacy.js / hospital.js contract.
      for(const s of [-1,1]) {
        const p=box(s*0.90,1.32,-RZ+.08,1.70,2.56,.045,col.glass,
          {hard:true,mode:1,alpha:.12,gloss:.92,tag:'门'});
        entranceLeaves.push({p,s,x0:s*.90,obx0:p.ob.x});
        // Sliding changes the centre by less than a metre. Give the fixed cull sphere enough
        // room for both end positions so a half-open leaf cannot blink at the edge of frame.
        p.fixed=true; p.cx=p.m[12]; p.cy=p.m[13]; p.cz=p.m[14]; p.r=1.75;
        box(s*1.74,1.32,-RZ+.055,.045,2.62,.065,col.black,{hard:true,gloss:.30,tag:'门'});
        capsule(s*.18,1.30,-RZ+.15,.025,.52,.025,col.brass,{gloss:.62,tag:'门'});
      }
      flat(0,.020,-RZ+.70,3.40,1.20,col.redD,{mode:7,gloss:.06,tag:'门'});
      thing('门',0,1.45,-RZ+.05,'自动门外就是马路。',
        'The automatic doors lead back to the road.',
        '门 is a door. 出门 means go out.',
        {tag:'门',focus:[0,-RZ+.95],reach:2.2}).exit={place:'street',at:BANK_OUT};

      // ---------------------------------------------------------------- the floor builder
      const A = {
        B,box,cyl,ball,capsule,taper,flat,wall,glyphs,solid,blocker,shade,glow,light,thing,
        RX,RZ,H,col, ZONE:ZONE_COL,
        luminous,liveScreen,partitionZ,partitionX,sign,doorPlate,screen,counter,desk,
        chair,bench,lowTable,potPlant,stanchion,queueBelt,slatPanel,pendant,cabinet,cameraDome,
      };
      for(const k in BankFit) {
        if(typeof BankFit[k]==='function') {
          try { BankFit[k](A); }
          catch(e){ console.error('BankFit '+k+': '+(e&&e.message)); }
        }
      }

      let nightK=0;
      function setNight(k) {
        nightK=k*k*(3-2*k);
        for(const q of lit) q.p.glow=q.g0+nightK*q.k*.18;
      }
      function tick(t,body) {
        for(const q of screens) q.p.glow=q.g0+(.5+.5*Math.sin(t*1.5+q.phase))*.04+nightK*.06;
        // The street leaves are visual only; the opening and its exit trigger remain fixed.
        // Driving the slide directly from proximity makes it deterministic after a paused tab.
        const dx=body?body.x:99, dz=body?body.z-(-RZ+.65):99;
        let open=1-Math.min(1,Math.hypot(dx,dz)/2.15);
        open=open*open*(3-2*open);
        for(const d of entranceLeaves) {
          const x=d.x0+d.s*.78*open, p=d.p;
          p.m[12]=x; p.cx=x;
          if(p.ob) p.ob.x=d.obx0+d.s*.78*open;
        }
        // Tiny independent PTZ sweeps keep the surveillance domes alive without turning them
        // into a distracting synchronized display.
        for(const q of cameraLenses) {
          const a=t*.34+q.phase, p=q.p;
          p.m[12]=q.x0+Math.sin(a)*.025;
          p.m[14]=q.z0+Math.cos(a*.83)*.018;
          p.cx=p.m[12]; p.cz=p.m[14];
        }
      }

      return B.finish({
        setNight,tick,OUT:BANK_OUT,
        RX,RZ,H,
        WIN:{x:0,y:1.60,z:-RZ+.06,hw:3.4,hh:1.30},
        label:'银行', labelK:'青禾银行 · 营业厅',
        indoor:true,cutaway:true,winOn:false,near:.06,far:60,expose:.98,
        // The previous .74 AO strength projected a blurred second copy of this 32x22 m room over
        // its own walls.  Comparable large interiors use roughly .06; subtle contact depth is all
        // this bright public hall needs.
        aoRadius:.30,aoAmt:.07,bloom:.40,
        camera:{pitch:.25,dist:5.35,lookY:1.22},
        // Four metres inside the threshold gives the third-person camera room behind the player.
        // At the old 1.6 m inset, clearWall correctly parked the eye against the entrance wall and
        // the backpack filled the entire first view of the redesigned hall.
        spawn:{x:0,z:-RZ+4.00,yaw:0},
        zones:[{id:'bank',x0:-RX+.25,x1:RX-.25,z0:-RZ+.25,z1:RZ-.25,
                light:[0,H-.40,0]}],
        // The rebuilt middle is intentionally open, so the regular orbit can finally show the
        // architecture.  Only someone pressed directly against a perimeter wall needs a short cap.
        roomAt(x,z){
          const room=this.zones[0];
          const edge=Math.min(RX-Math.abs(x),RZ-Math.abs(z));
          room.near=Math.abs(x)>6.5?3.70:(edge<.85?3.15:0);
          return room;
        },
      });
    });
  }

  return { makeHall,RX,RZ,H,OUT:BANK_OUT };
})();

const Bank = BankCore.makeHall('Bank');

// A branch full of service furniture needs people at the service positions.  These are static
// roster stations rather than patrols because the generic walker does not know about the glass
// counter line or the specialist partitions.  They still breathe, look, type and work through the
// ordinary figure system, and their hours line up with the staffed-service gate in game.js.
BankCast.push(
  { hz:'保安', name:'韩师傅', py:'Hán Shīfu', place:'bank', temper:'alert',
    look:{skin:'#c38a64',hair:'#211d1b',hairStyle:'crop',top:'#263f56',pants:'#25333f',
      shoe:'#202529',uniform:'guard',tall:1.03,faceSeed:9101},
    spots:[{h0:0,h1:24,at:[4.2,-8.45],face:Math.PI,act:'hands'}],
    lines:[
      ['办柜台业务先取号，再坐下等叫号。','For a teller service, take a number and wait for it to be called.'],
      ['自动取款机二十四小时都可以用。','The cash machines are available twenty-four hours a day.'],
    ] },

  { hz:'大堂经理', place:'bank', temper:'patient',
    look:{skin:'#d9aa82',hair:'#2f2723',hairStyle:'bob',top:'#344b58',pants:'#293941',
      shoe:'#252a2e',collar:'shirt',uniform:'staff',tall:.96,faceSeed:9110},
    spots:[{h0:9,h1:17,at:[-10.35,-3.0],face:Math.PI/2,act:'desk'}] },
  { hz:'大堂经理', place:'bank', temper:'steady',
    look:{skin:'#c78d67',hair:'#241f1c',hairStyle:'tie',top:'#3d5360',pants:'#2b3a43',
      shoe:'#272c31',collar:'shirt',uniform:'staff',tall:.94,faceSeed:9111},
    spots:[{h0:9,h1:17,at:[-10.35,0],face:Math.PI/2,act:'desk'}] },
  { hz:'大堂经理', place:'bank', temper:'focused',
    look:{skin:'#e4b58e',hair:'#3b302a',hairStyle:'bun',top:'#344d59',pants:'#2c3c45',
      shoe:'#252a2e',collar:'shirt',uniform:'staff',tall:.98,faceSeed:9112},
    spots:[{h0:9,h1:17,at:[-10.35,3.0],face:Math.PI/2,act:'desk'}] },

  { hz:'柜员', place:'bank', temper:'focused',
    look:{skin:'#d7a37c',hair:'#29221f',hairStyle:'bob',top:'#36505d',pants:'#293b45',
      shoe:'#262b30',uniform:'staff',tall:.95,faceSeed:9120},
    spots:[{h0:9,h1:17,at:[-5.2,4.77],face:Math.PI,act:'desk'}] },
  { hz:'柜员', place:'bank', temper:'patient',
    look:{skin:'#bd815d',hair:'#201c1a',hairStyle:'crop',top:'#3a5260',pants:'#2a3b44',
      shoe:'#24292d',uniform:'staff',glasses:true,tall:1.02,faceSeed:9121},
    spots:[{h0:9,h1:17,at:[-2.6,4.77],face:Math.PI,act:'desk'}] },
  { hz:'柜员', place:'bank', temper:'steady',
    look:{skin:'#e4b58d',hair:'#332925',hairStyle:'tie',top:'#354e5a',pants:'#2c3c45',
      shoe:'#272c30',uniform:'staff',tall:.94,faceSeed:9122},
    spots:[{h0:9,h1:17,at:[0,4.77],face:Math.PI,act:'desk'}] },
  { hz:'柜员', place:'bank', temper:'brisk',
    look:{skin:'#ca936e',hair:'#2b2420',hairStyle:'short',top:'#3b5360',pants:'#2a3a43',
      shoe:'#252a2f',uniform:'staff',tall:1.01,faceSeed:9123},
    spots:[{h0:9,h1:17,at:[5.2,4.77],face:Math.PI,act:'desk'}] },

  { hz:'顾客', place:'bank', temper:'patient', seatY:.47,
    look:{skin:'#d1a078',hair:'#4a4039',hairStyle:'short',top:'#7f8b92',pants:'#444c55',
      shoe:'#2b3034',jacket:'#596875',age:.48,faceSeed:9130},
    spots:[{h0:9,h1:17,at:[-3.25,-.10],face:0,act:'sit'}] },
  { hz:'顾客', place:'bank', temper:'bored', seatY:.47,
    look:{skin:'#e3b58d',hair:'#2d2521',hairStyle:'ponytail',top:'#a76a5d',pants:'#414a55',
      shoe:'#ece4d7',bag:'shoulder',bagColor:'#5f4b3c',tall:.95,faceSeed:9131},
    spots:[{h0:9,h1:17,at:[3.25,-.10],face:0,act:'phone'}] },
  { hz:'理财经理', place:'bank', temper:'steady',
    look:{skin:'#c88f69',hair:'#25201d',hairStyle:'short',top:'#344d59',pants:'#293943',
      shoe:'#24292e',collar:'shirt',uniform:'staff',glasses:true,tall:1.00,faceSeed:9140},
    spots:[{h0:9,h1:17,at:[13.55,10.02],face:Math.PI,act:'desk'}] }
);
