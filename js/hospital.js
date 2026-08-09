// 北京市仁和医院 — a four-floor public hospital.
//
// Each playable floor is its own Lazy scene.  The building still reads and works as one place —
// every floor has the same lift, stair and directory core — but only the department the player is
// standing in is drawn.  That keeps a hospital this large cheaper than the mall while avoiding the
// mall/home-specific vertical-player machinery in game.js.
//
// Department files register one builder each in HospFit before game.js touches the Lazy scenes:
//
//   HospFit[1] = A => { ... };
//
// The shell owns the envelope, wayfinding core, shared furniture vocabulary and street contract.
// Floors own their clinical rooms and their cast.
const HospFit = {};
const HospitalCast = [];

// Street-side return point.  The hospital frontage is on the blank west-side civic block and faces
// east onto the main road.  street-hospital.js builds the other half of this threshold.
const HOSPITAL_OUT = { x: 24.35, z: 22.20, yaw: Math.PI / 2 };

const HOSPITAL_FLOORS = [
  { n:1, place:'hospital',  hz:'一楼', en:'ground floor', name:'门诊大厅 · 急诊' },
  { n:2, place:'hospital2', hz:'二楼', en:'second floor', name:'门诊科室 · 候诊' },
  { n:3, place:'hospital3', hz:'三楼', en:'third floor', name:'检查治疗 · 药房' },
  { n:4, place:'hospital4', hz:'四楼', en:'fourth floor', name:'住院病房 · 手术康复' },
];

const HospitalCore = (() => {
  const RX = 17, RZ = 12, H = 4.10;

  const col = {
    white:C('#eef2ef'), warm:C('#f8f4e8'), wall:C('#e5ebe7'), wallD:C('#cbd6d1'),
    teal:C('#2f817c'), tealD:C('#1e5f5b'), tealL:C('#7bc5bc'),
    blue:C('#327ba8'), blueD:C('#225878'), blueL:C('#9bc7dd'),
    green:C('#3c8b68'), greenL:C('#a9d6bd'), red:C('#b43d35'), redD:C('#7e2925'),
    orange:C('#d67a2c'), yellow:C('#e3bd4b'),
    floor:C('#d9ded9'), floorD:C('#bcc5c0'), tile:C('#e8ece8'),
    steel:C('#9aa5a8'), steelD:C('#5d696d'), glass:C('#8eb9c6'),
    ink:C('#253036'), inkL:C('#59656a'), screen:C('#17394b'),
    wood:C('#9a7451'), woodD:C('#6e5037'), fabric:C('#6e9ca8'),
    bed:C('#d9edf0'), rail:C('#d9e0e2'), black:C('#171d20'),
  };
  const FLOOR_COL = [null, col.red, col.blue, col.green, col.orange];

  function makeFloor(lazyName, floorNo) {
    return Lazy(lazyName, () => {
      const B = Build.scene({ wood:new Set([col.wood, col.woodD]), fabricGloss:.035 });
      const { box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,light,thing } = B;
      const lit = [], screens = [], floorTicks = [], privacyDoors = [], cameraRooms = [];
      // Floor files can hang small, hospital-only routines here without teaching the global game
      // loop about every ward door and clinical round.  The state object is also returned on the
      // finished scene, which gives the audit harness a read-only way to inspect those routines.
      const hospitalState = {};
      const fc = FLOOR_COL[floorNo];

      const tagOpt = (tag, o={}) => tag ? { ...o, tag } : o;
      const luminous = (p, k=.35) => {
        lit.push({ p, g0:p.glow || 0, k });
        return p;
      };
      const liveScreen = (p, phase=0) => {
        screens.push({ p, g0:p.glow || .08, phase });
        return luminous(p, .24);
      };

      // Public-hospital walls are working surfaces, not blank plaster boxes.  A washable lower
      // field, coved skirting, rounded impact rail and protected jambs run with every partition.
      // They are deliberately shallow visual layers with no colliders, so beds and wheelchairs
      // keep the exact clear widths established by the floor plans.
      const wallLower=C('#dce6e2');
      const wallRail=[null,C('#d8aaa7'),C('#a9cde0'),C('#acd4c0'),C('#e6c38d')][floorNo];
      function dressWallZ(z,a,b,tag,sides=[-1,1],guards=[false,false]) {
        const w=b-a;
        if(w<.38) return;
        const opt=tagOpt(tag), mid=(a+b)/2;
        for(const side of sides) {
          box(mid,.48,z+side*.108,w-.05,.78,.025,wallLower,
            {hard:true,gloss:.12,...opt});
          box(mid,.075,z+side*.132,w,.15,.045,col.steelD,
            {hard:true,gloss:.24,...opt});
          capsule(mid,.98,z+side*.145,.050,Math.max(.18,w-.16),.060,wallRail,
            {rz:Math.PI/2,gloss:.27,...opt});
          const ends=[];
          if(guards[0]) ends.push(a+.055);
          if(guards[1]) ends.push(b-.055);
          for(const x of ends)
            capsule(x,1.18,z+side*.145,.038,2.16,.038,col.rail,
              {gloss:.42,...opt});
        }
      }
      function dressWallX(x,a,b,tag,sides=[-1,1],guards=[false,false]) {
        const w=b-a;
        if(w<.38) return;
        const opt=tagOpt(tag), mid=(a+b)/2;
        for(const side of sides) {
          box(x+side*.108,.48,mid,.025,.78,w-.05,wallLower,
            {hard:true,gloss:.12,...opt});
          box(x+side*.132,.075,mid,.045,.15,w,col.steelD,
            {hard:true,gloss:.24,...opt});
          capsule(x+side*.145,.98,mid,.050,Math.max(.18,w-.16),.060,wallRail,
            {rx:Math.PI/2,gloss:.27,...opt});
          const ends=[];
          if(guards[0]) ends.push(a+.055);
          if(guards[1]) ends.push(b-.055);
          for(const z of ends)
            capsule(x+side*.145,1.18,z,.038,2.16,.038,col.rail,
              {gloss:.42,...opt});
        }
      }

      // A partition with one or more full-height openings.  The lintel is restored over each door,
      // so a corridor never looks as though somebody cut a four-metre slot out of its ceiling.
      function partitionZ(z, x0, x1, openings=[], color=col.wall, tag, dressSides) {
        const cuts = openings.map(o => Array.isArray(o) ? o : [o,1.3])
          .map(([c,w]) => [Math.max(x0,c-w/2),Math.min(x1,c+w/2)])
          .sort((a,b)=>a[0]-b[0]);
        let at=x0;
        for(const [a,b] of cuts) {
          if(a>at+.02) {
            box((at+a)/2,H/2,z,a-at,H,.18,color,{hard:true,mat:'plaster',matScale:2.4,matAmt:.12,...tagOpt(tag)});
            solid(at,a,z-.09,z+.09);
            dressWallZ(z,at,a,tag,dressSides,[at>x0+.02,true]);
          }
          box((a+b)/2,3.35,z,b-a,H-2.60,.18,color,{hard:true,...tagOpt(tag)});
          at=Math.max(at,b);
        }
        if(at<x1-.02) {
          box((at+x1)/2,H/2,z,x1-at,H,.18,color,{hard:true,mat:'plaster',matScale:2.4,matAmt:.12,...tagOpt(tag)});
          solid(at,x1,z-.09,z+.09);
          dressWallZ(z,at,x1,tag,dressSides,[at>x0+.02,false]);
        }
      }
      function partitionX(x, z0, z1, openings=[], color=col.wall, tag, dressSides) {
        const cuts = openings.map(o => Array.isArray(o) ? o : [o,1.3])
          .map(([c,w]) => [Math.max(z0,c-w/2),Math.min(z1,c+w/2)])
          .sort((a,b)=>a[0]-b[0]);
        let at=z0;
        for(const [a,b] of cuts) {
          if(a>at+.02) {
            box(x,H/2,(at+a)/2,.18,H,a-at,color,{hard:true,mat:'plaster',matScale:2.4,matAmt:.12,...tagOpt(tag)});
            solid(x-.09,x+.09,at,a);
            dressWallX(x,at,a,tag,dressSides,[at>z0+.02,true]);
          }
          box(x,3.35,(a+b)/2,.18,H-2.60,b-a,color,{hard:true,...tagOpt(tag)});
          at=Math.max(at,b);
        }
        if(at<z1-.02) {
          box(x,H/2,(at+z1)/2,.18,H,z1-at,color,{hard:true,mat:'plaster',matScale:2.4,matAmt:.12,...tagOpt(tag)});
          solid(x-.09,x+.09,at,z1);
          dressWallX(x,at,z1,tag,dressSides,[at>z0+.02,false]);
        }
      }

      // Anything a department needs to move registers with the floor's existing scene tick.  The
      // callback receives wall-clock seconds, the player, the in-game clock and a bounded delta.
      // Keeping this local matters: hospital scenes are lazy and an unvisited floor should have no
      // timer of its own running behind the rest of Beijing.
      function onTick(fn) {
        if(typeof fn==='function') floorTicks.push(fn);
        return fn;
      }

      // Clinical rooms opt into a doorway camera assist by describing their walkable footprint
      // and one useful point to face.  The global camera only consumes this when the player first
      // crosses the threshold; it never keeps steering once they are inside, so dragging to look
      // around still belongs entirely to the player.  A small release margin prevents a body
      // standing on the sill from repeatedly re-triggering the same turn.
      function cameraRoom(id,x0,x1,z0,z1,focusX,focusZ) {
        const q={id,x0:Math.min(x0,x1),x1:Math.max(x0,x1),
          z0:Math.min(z0,z1),z1:Math.max(z0,z1),focus:[focusX,focusZ]};
        cameraRooms.push(q);
        return q;
      }
      function cameraAssistAt(x,z,previousId) {
        const previous=previousId&&cameraRooms.find(q=>q.id===previousId);
        if(previous&&x>=previous.x0-.22&&x<=previous.x1+.22&&
            z>=previous.z0-.22&&z<=previous.z1+.22) return previous;
        let best=null, area=Infinity;
        for(const q of cameraRooms) {
          if(x<q.x0||x>q.x1||z<q.z0||z>q.z1) continue;
          const a=(q.x1-q.x0)*(q.z1-q.z0);
          if(a<area) { best=q; area=a; }
        }
        return best;
      }

      // A two-leaf sliding privacy door for inpatient rooms.  The opening stays physically clear:
      // these leaves are visual, automatic doors rather than stale colliders which could trap the
      // player when a doctor begins a round.  Each leaf is built in its fully-open wall pocket, so
      // Build.finish records a useful cull sphere before the matrices start moving.
      function privacyDoorZ(x,z,w=1.60,tag='病房门',color=fc) {
        const gap=.035, leafW=(w-gap)/2, slide=leafW;
        const moving=[];
        const keep=(p,side)=>{
          // Picking uses the immutable construction-time oriented box.  A moving door with that
          // stale box would be selectable in its old pocket, so it deliberately contributes no
          // pick geometry; the labelled room plate remains the interaction target.
          p.ob=null;
          moving.push({p,side,m0:p.m});
          return p;
        };
        for(const side of [-1,1]) {
          const closed=x+side*(gap/2+leafW/2);
          const open=closed+side*slide;
          keep(box(open,1.31,z,leafW,2.52,.060,color,
            {hard:true,gloss:.20,...tagOpt(tag)}),side);
          // A glazed observation pane, coloured safety stripe and proper pull handle stop the
          // moving leaf reading as one more blank rectangle in the wall.
          keep(box(open,1.68,z-.036,leafW-.15,.70,.018,col.glass,
            {hard:true,mode:1,alpha:.38,gloss:.50,...tagOpt(tag)}),side);
          keep(box(open,2.22,z-.040,leafW-.08,.075,.020,col.white,
            {hard:true,mode:1,...tagOpt(tag)}),side);
          keep(capsule(open-side*.21,1.17,z-.070,.030,.44,.030,col.steelD,
            {gloss:.48,...tagOpt(tag)}),side);
        }
        let openness=1, target=1;
        const door={
          tag, parts:moving.map(q=>q.p),
          setOpen(v){ target=v?1:0; },
          get open(){ return openness; },
          get targetOpen(){ return target; },
          snapshot(){ return {tag,open:+openness.toFixed(3),targetOpen:target}; },
        };
        onTick((t,body,clock,dt)=>{
          const k=1-Math.exp(-Math.max(0,dt)*7.0);
          openness+=(target-openness)*k;
          if(Math.abs(target-openness)<.001) openness=target;
          for(const q of moving) {
            const dx=-q.side*slide*(1-openness);
            q.p.m=M.mul(M.trans(dx,0,0),q.m0);
          }
        });
        privacyDoors.push(door);
        return door;
      }

      function sign(x,y,z,yaw,text,color=fc,tag=text,size=.22) {
        const span=Math.max(1.35,[...text].length*(size+.07)+.40);
        const alongX=Math.abs(Math.sin(yaw))<.5;
        const p=box(x,y,z,alongX?span:.07,.48,alongX?.07:span,color,
          {hard:true,mode:1,glow:.025,...tagOpt(tag)});
        luminous(p,.30);
        glyphs(x,y,z,yaw,text,{size,gap:.07,color:col.white,mode:1,lift:.045,tag});
        // Overhead boards are read while approaching from either direction.  Drawing the reverse
        // face prevents the coloured rectangles seen from the back from looking like blank signs.
        glyphs(x,y,z,yaw+Math.PI,text,
          {size,gap:.07,color:col.white,mode:1,lift:.045,tag});
        return p;
      }
      function doorPlate(x,y,z,yaw,text,tag=text,color=fc) {
        const alongX=Math.abs(Math.sin(yaw))<.5;
        box(x,y,z,alongX?1.44:.055,.44,alongX?.055:1.44,color,
          {hard:true,mode:1,glow:.018,...tagOpt(tag)});
        glyphs(x,y,z,yaw,text,{size:.185,gap:.055,color:col.white,mode:1,lift:.036,tag});
        glyphs(x,y,z,yaw+Math.PI,text,
          {size:.185,gap:.055,color:col.white,mode:1,lift:.036,tag});
      }
      // A matte, readable wall infographic.  The three numbered steps communicate at walking
      // distance; the smaller subtitle carries the useful sentence once the player comes closer.
      // `yaw` points out from the wall toward the reader, matching glyphs().
      function infoPanel(x,y,z,yaw,w,h,
                         {title,subtitle='',steps=[],color=fc,tag=title,motif='medical'}={}) {
        const nx=Math.sin(yaw), nz=Math.cos(yaw), ux=Math.cos(yaw), uz=-Math.sin(yaw);
        const at=(u=0,d=0)=>[x+ux*u+nx*d,z+uz*u+nz*d];
        const slab=(u,v,sw,sh,sd,c,o={})=>{
          const [px,pz]=at(u,0);
          return box(px,y+v,pz,sw,sh,sd,c,{hard:true,ry:yaw,...tagOpt(tag,o)});
        };
        const write=(u,v,text,size,c=col.ink)=>{
          const [px,pz]=at(u,.045);
          glyphs(px,y+v,pz,yaw,text,
            {size,gap:size*.26,color:c,mode:1,lift:.010,tag});
        };
        const stroke=(u,v,len,angle,c=col.white,th=.042)=>{
          const [px,pz]=at(u,.047);
          box(px,y+v,pz,len,th,.020,c,
            {hard:true,ry:yaw,rz:angle,mode:1,...tagOpt(tag)});
        };
        slab(0,0,w,h,.065,col.warm,{gloss:.13});
        slab(0,h/2-.19,w-.10,.34,.072,color,{mode:1,glow:.008});
        // Thin frame and a white medical cross anchor the board before any characters resolve.
        slab(0,h/2-.035,w,.07,.082,col.wallD,{gloss:.22});
        slab(0,-h/2+.035,w,.07,.082,col.wallD,{gloss:.22});
        slab(-w/2+.035,0,.07,h,.082,col.wallD,{gloss:.22});
        slab( w/2-.035,0,.07,h,.082,col.wallD,{gloss:.22});
        slab(-w/2+.34,h/2-.19,.30,.075,.082,col.white,{mode:1});
        slab(-w/2+.34,h/2-.19,.075,.26,.082,col.white,{mode:1});
        // A small motif makes each board feel commissioned for its department without competing
        // with the copy: Beijing roof tiers, a pulse trace, or two ginkgo-like leaves.
        const hasMotif=motif!=='medical' && w>=2.75;
        const decoU=w/2-.48, decoV=h/2-.19;
        if(hasMotif && motif==='beijing') {
          stroke(decoU,decoV-.09,.82,0);
          stroke(decoU-.20,decoV,.45,-.18);
          stroke(decoU+.20,decoV,.45,.18);
          stroke(decoU,decoV+.08,.48,0);
          stroke(decoU,decoV-.02,.05,Math.PI/2,col.white,.035);
        } else if(hasMotif && motif==='pulse') {
          stroke(decoU-.25,decoV,.25,0);
          stroke(decoU-.08,decoV+.035,.20,.55);
          stroke(decoU+.03,decoV-.005,.22,-.92);
          stroke(decoU+.17,decoV+.015,.18,.35);
          stroke(decoU+.31,decoV,.18,0);
        } else if(hasMotif && motif==='leaf') {
          for(const [u,a] of [[decoU-.12,-.62],[decoU+.12,.62]]) {
            const [px,pz]=at(u,.047);
            ball(px,y+decoV,pz,.15,.055,.018,col.white,
              {ry:yaw,rz:a,mode:1,...tagOpt(tag)});
          }
          stroke(decoU,decoV-.03,.30,Math.PI/2,col.white,.030);
        }
        const titleRoom=hasMotif?w-1.70:w-.95;
        write(hasMotif?-.10:.18,h/2-.19,title,
          Math.min(.225,titleRoom/(Math.max(1,[...title].length)*1.28)),col.white);
        if(subtitle)
          write(0,.13,subtitle,Math.min(.135,(w-.42)/(Math.max(1,[...subtitle].length)*1.28)),col.ink);
        const shown=steps.slice(0,3), n=shown.length;
        shown.forEach((label,i)=>{
          const u=n===1?0:(i-(n-1)/2)*w*.29;
          const [px,pz]=at(u,.052);
          if(Math.abs(Math.sin(yaw))<.5)
            ball(px,y-.23,pz,.19,.19,.026,color,{mode:1,gloss:.16,...tagOpt(tag)});
          else
            ball(px,y-.23,pz,.026,.19,.19,color,{mode:1,gloss:.16,...tagOpt(tag)});
          write(u,-.23,String(i+1),.145,col.ink);
          write(u,-.56,label,Math.min(.13,(w*.24)/(Math.max(1,[...label].length)*1.28)),col.ink);
          if(i<n-1) write(u+w*.145,-.23,'→',.16,color);
        });
      }
      function screen(x,y,z,yaw,w,h,text,tag=text,color=col.screen) {
        const alongX=Math.abs(Math.sin(yaw))<.5;
        const nx=Math.sin(yaw), nz=Math.cos(yaw);
        box(x,y,z,alongX?w:.08,h,alongX?.08:w,col.black,{hard:true,gloss:.30,...tagOpt(tag)});
        const face=dir=>box(x+nx*.050*dir,y,z+nz*.050*dir,
          alongX?w-.12:.018,h-.12,alongX?.018:w-.12,color,
          {hard:true,mode:1,glow:.08,...tagOpt(tag)});
        const p=face(1), back=face(-1);
        liveScreen(p,(x+z)*.17);
        liveScreen(back,(x+z)*.17+.6);
        if(text) {
          const opt={size:Math.min(.19,h*.32),gap:.055,color:col.white,mode:1,lift:.061,tag};
          glyphs(x,y,z,yaw,text,opt);
          glyphs(x,y,z,yaw+Math.PI,text,opt);
        }
        return p;
      }
      function counter(x,z,w=3.2,d=.72,tag='服务台',color=col.teal,y=.53) {
        // Radiused worktop, recessed public face and a tube foot rail replace the three stacked
        // rectangular slabs that made every reception point look like the same shipping crate.
        box(x,y,z,w,1.06,d,color,{round:.11,hard:true,gloss:.18,...tagOpt(tag)});
        box(x,y+.02,z-d*.505,w-.28,.70,.035,col.wallD,
          {round:.065,hard:true,mode:1,alpha:.52,...tagOpt(tag)});
        box(x,y*2+.055,z,w+.12,.11,d+.12,col.white,
          {round:.055,hard:true,gloss:.22,...tagOpt(tag)});
        box(x,.10,z,w+.18,.20,d+.16,col.wallD,
          {round:.055,hard:true,...tagOpt(tag)});
        capsule(x,.31,z-d*.56,.030,Math.max(.40,w-.44),.030,col.steelD,
          {rz:Math.PI/2,gloss:.44,...tagOpt(tag)});
        for(const s of [-1,1])
          capsule(x+s*(w/2-.24),.24,z-d*.56,.025,.22,.025,col.steelD,
            {gloss:.44,...tagOpt(tag)});
        solid(x-w/2,x+w/2,z-d/2,z+d/2);
      }
      function desk(x,z,w=1.55,d=.72,tag='诊桌',yaw=0,color=col.wood) {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,.73,z,swap?d:w,.10,swap?w:d,color,
          {round:.055,hard:true,gloss:.20,...tagOpt(tag)});
        for(const sx of [-1,1]) for(const sz of [-1,1])
          capsule(x+(swap?sz*d*.38:sx*w*.38),.36,z+(swap?sx*w*.38:sz*d*.38),
            .035,.72,.035,col.steelD,{gloss:.44,...tagOpt(tag)});
        // Cable grommet and slim under-desk modesty panel are small details, but their shadows make
        // the open tube legs read as a manufactured workstation rather than loose supports.
        cyl(x+(swap?0:w*.30),.795,z+(swap?w*.30:0),.055,.020,col.black,
          {gloss:.16,...tagOpt(tag)});
        box(x,.45,z,swap?.035:w*.72,.38,swap?w*.72:.035,col.wallD,
          {round:.025,hard:true,alpha:.72,mode:7,...tagOpt(tag)});
        solid(x-(swap?d:w)/2,x+(swap?d:w)/2,z-(swap?w:d)/2,z+(swap?w:d)/2);
      }
      // One moulded clinic chair.  The previous seat and back were two broad cuboids on two
      // square posts, which made every waiting bank look like blocks placed beside one another.
      // A shallow oval pan, narrower shoulder back and round tube frame read as mass-produced
      // hospital seating while staying within the game's low-poly primitive vocabulary.
      // `linked` omits the individual legs so bench() can give the row one shared undercarriage.
      function chair(x,z,yaw=0,tag='椅子',color=col.fabric,linked=false) {
        const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
        const at=(side,fore)=>[x+r[0]*side+f[0]*fore,z+r[1]*side+f[1]*fore];
        const opt=tagOpt(tag);

        // A dark rolled rim remains visible beneath the upholstered, elliptical seat pan.
        box(x,.425,z,.50,.065,.50,col.steelD,{round:.07,gloss:.30,...opt});
        ball(x,.468,z,.275,.057,.265,color,{mode:7,gloss:.045,ry:yaw,...opt});

        // Twin back stays disappear into a deliberately narrower, gently reclined moulded pad.
        for(const side of [-.17,.17]) {
          const [sx,sz]=at(side,-.215);
          capsule(sx,.625,sz,.032,.405,.032,col.steelD,{gloss:.42,...opt});
        }
        const [bx,bz]=at(0,-.275);
        ball(bx,.795,bz,.225,.295,.052,color,{mode:7,gloss:.045,ry:yaw,rx:-.07,...opt});

        if(!linked) {
          // Four round legs instead of the old two-post silhouette; the rear pair sit under the
          // back stays, so the frame reads as one manufactured object from oblique views.
          for(const side of [-.19,.19]) for(const fore of [-.17,.17]) {
            const [lx,lz]=at(side,fore);
            capsule(lx,.225,lz,.036,.445,.036,col.steelD,{gloss:.42,...opt});
            cyl(lx,.025,lz,.045,.025,col.black,{gloss:.18,...opt});
          }
        }
      }
      function bench(x,z,n=4,yaw=0,tag='候诊椅',color=col.fabric) {
        const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
        const at=(side,fore=0)=>[x+r[0]*side+f[0]*fore,z+r[1]*side+f[1]*fore];
        const opt=tagOpt(tag);
        for(let i=0;i<n;i++)
          chair(x+r[0]*(i-(n-1)/2)*.62,z+r[1]*(i-(n-1)/2)*.62,yaw,tag,color,true);

        // A continuous steel beam and two T-feet make this a real linked waiting bank instead
        // of a row of unrelated dining chairs.  Infusion seats get an arm division at every
        // place; ordinary waiting banks keep only their end arms for a calmer silhouette.
        const span=(n-1)*.62+.50;
        capsule(x,.315,z,.052,span,.052,col.steelD,{rz:Math.PI/2,ry:yaw,gloss:.44,...opt});
        const support=(n-1)*.62*.36;
        for(const u of support ? [-support,support] : [0]) {
          const [px,pz]=at(u);
          capsule(px,.205,pz,.045,.34,.045,col.steelD,{gloss:.44,...opt});
          capsule(px,.045,pz,.042,.48,.042,col.steelD,
            {rx:Math.PI/2,ry:yaw,gloss:.44,...opt});
          for(const fore of [-.235,.235]) {
            const [fx,fz]=at(u,fore);
            cyl(fx,.025,fz,.045,.022,col.black,{gloss:.18,...opt});
          }
        }
        const armSlots=tag==='输液椅' ? Array.from({length:n+1},(_,i)=>i) : [0,n];
        for(const i of armSlots) {
          const u=(i-n/2)*.62;
          const [ax,az]=at(u,-.015);
          capsule(ax,.555,az,.025,.245,.025,col.steelD,{gloss:.44,...opt});
          capsule(ax,.675,az,.030,.30,.030,col.steelD,
            {rx:Math.PI/2,ry:yaw,gloss:.44,...opt});
        }
        const w=n*.62;
        if(Math.abs(r[0])>.5) solid(x-w/2,x+w/2,z-.30,z+.30);
        else solid(x-.30,x+.30,z-w/2,z+w/2);
      }
      function cabinet(x,z,w=1.8,h=1.8,d=.42,tag='柜子',color=col.white,yaw=0) {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,h/2,z,swap?d:w,h,swap?w:d,color,
          {round:.055,hard:true,gloss:.16,...tagOpt(tag)});
        for(let i=1;i<4;i++)
          box(x,h*i/4,z,swap?d+.018:w-.08,.035,swap?w-.08:d+.018,col.wallD,{hard:true,...tagOpt(tag)});
        // Twin inset fronts and tactile handles keep cabinets legible beside walls of the same
        // colour.  The details stay visual-only, preserving the original collision footprint.
        const nx=Math.sin(yaw),nz=Math.cos(yaw),ux=Math.cos(yaw),uz=-Math.sin(yaw);
        for(const s of [-1,1]) {
          const px=x+ux*s*w*.235+nx*(d/2+.018), pz=z+uz*s*w*.235+nz*(d/2+.018);
          box(px,h*.53,pz,w*.43,h*.76,.026,col.warm,
            {round:.035,hard:true,ry:yaw,mode:1,alpha:.48,...tagOpt(tag)});
          capsule(px-ux*s*w*.12,h*.56,pz-uz*s*w*.12,.018,.24,.018,col.steelD,
            {ry:yaw,gloss:.48,...tagOpt(tag)});
        }
        solid(x-(swap?d:w)/2,x+(swap?d:w)/2,z-(swap?w:d)/2,z+(swap?w:d)/2);
      }
      function examBed(x,z,yaw=0,tag='检查床',color=col.bed) {
        const f=[Math.sin(yaw),Math.cos(yaw)], r=[Math.cos(yaw),-Math.sin(yaw)];
        const at=(side,long)=>[x+r[0]*side+f[0]*long,z+r[1]*side+f[1]*long];
        const opt=tagOpt(tag);

        // Tubular perimeter and cross-members replace the single steel slab under the mattress.
        for(const side of [-.31,.31]) {
          const [px,pz]=at(side,0);
          capsule(px,.625,pz,.050,2.06,.050,col.steelD,
            {rx:Math.PI/2,ry:yaw,gloss:.46,...opt});
        }
        for(const long of [-.77,.77]) {
          const [px,pz]=at(0,long);
          capsule(px,.625,pz,.045,.66,.045,col.steelD,
            {rz:Math.PI/2,ry:yaw,gloss:.46,...opt});
        }

        // A compact wheeled lifting base and crossed supports give the bed believable daylight
        // beneath it.  The wheel discs turn with the bed, rather than remaining world-aligned.
        capsule(x,.12,z,.080,1.18,.080,col.steelD,
          {rx:Math.PI/2,ry:yaw,gloss:.45,...opt});
        for(const side of [-.24,.24]) for(const tilt of [-.66,.66]) {
          const [px,pz]=at(side,0);
          capsule(px,.385,pz,.046,.76,.046,col.steel,
            {ry:yaw,rx:tilt,gloss:.42,...opt});
        }
        for(const long of [-.52,.52]) for(const side of [-.27,.27]) {
          const [wx,wz]=at(side,long);
          capsule(wx,.165,wz,.026,.18,.026,col.steelD,{gloss:.44,...opt});
          cyl(wx,.082,wz,.078,.045,col.black,{rz:Math.PI/2,ry:yaw,gloss:.25,...opt});
          cyl(wx,.082,wz,.040,.052,col.steel,{rz:Math.PI/2,ry:yaw,gloss:.42,...opt});
        }

        // Three mattress sections break the long rectangular loaf into an adjustable clinical
        // couch.  A true ellipsoid pillow supplies the softest silhouette on the bed.
        for(const [long,len,tilt] of [[-.67,.62,-.075],[-.05,.56,0],[.59,.70,.025]]) {
          const [mx,mz]=at(0,long);
          ball(mx,.805,mz,.36,.085,len/2,color,
            {mode:7,ry:yaw,rx:tilt,gloss:.035,...opt});
        }
        const [px,pz]=at(0,-.79);
        ball(px,.935,pz,.285,.070,.215,col.white,{mode:7,ry:yaw,gloss:.03,...opt});

        // Shaped end boards and folding tube rails identify this as a mobile hospital bed rather
        // than a domestic divan.  The rail leaves the patient's shoulder and foot approaches open.
        for(const long of [-1.04,1.04]) {
          const head=long<0, top=head?1.06:.92;
          const [ex,ez]=at(0,long);
          // Open tube handles keep the end readable without hiding the patient behind a white
          // panel.  The inset plastic guard is taller at the head and deliberately low at foot.
          for(const side of [-.28,.28]) {
            const [tx,tz]=at(side,long);
            capsule(tx,(top+.64)/2,tz,.030,top-.64,.030,col.rail,{gloss:.48,...opt});
          }
          capsule(ex,top,ez,.032,.58,.032,col.rail,
            {rz:Math.PI/2,ry:yaw,gloss:.48,...opt});
          taper(ex,head?.84:.76,ez,head?.46:.40,head?.22:.13,.060,col.blueL,
            {ry:yaw,gloss:.20,...opt});
        }
        for(const side of [-.41,.41]) {
          const [gx,gz]=at(side,.12);
          capsule(gx,1.015,gz,.033,1.25,.033,col.rail,
            {rx:Math.PI/2,ry:yaw,gloss:.48,...opt});
          for(const long of [-.36,.48]) {
            const [sx,sz]=at(side,long);
            capsule(sx,.885,sz,.028,.27,.028,col.rail,{gloss:.48,...opt});
          }
        }

        const hx=Math.abs(f[0])*1.10+Math.abs(r[0])*.45;
        const hz=Math.abs(f[1])*1.10+Math.abs(r[1])*.45;
        solid(x-hx,x+hx,z-hz,z+hz);
      }
      function sink(x,z,yaw=0,tag='洗手池') {
        const swap=Math.abs(Math.sin(yaw))>.5;
        box(x,.84,z,swap?.58:.90,.18,swap?.90:.58,col.white,{round:.10,gloss:.28,...tagOpt(tag)});
        box(x,.55,z,swap?.46:.72,.58,swap?.72:.46,col.wallD,{hard:true,...tagOpt(tag)});
        capsule(x,.98,z, .025,.34,.025,col.steelD,{rx:Math.PI/2,gloss:.50,...tagOpt(tag)});
        solid(x-(swap?.32:.48),x+(swap?.32:.48),z-(swap?.48:.32),z+(swap?.48:.32));
      }
      function ivStand(x,z,tag='输液架') {
        cyl(x,.92,z,.027,1.84,col.steelD,{gloss:.48,...tagOpt(tag)});
        capsule(x,1.79,z,.025,.54,.025,col.steelD,{rz:Math.PI/2,gloss:.48,...tagOpt(tag)});
        for(const s of [-1,1]) capsule(x+s*.24,1.67,z,.018,.22,.018,col.steelD,{gloss:.48,...tagOpt(tag)});
        for(let i=0;i<4;i++) {
          const a=i*Math.PI/2;
          capsule(x+Math.sin(a)*.15,.08,z+Math.cos(a)*.15,.018,.32,.018,col.steelD,{rx:Math.PI/2,ry:a,...tagOpt(tag)});
          cyl(x+Math.sin(a)*.29,.045,z+Math.cos(a)*.29,.045,.035,col.black,{...tagOpt(tag)});
        }
      }
      function cart(x,z,tag='治疗车',color=col.steel) {
        for(const y of [.34,.74,.98]) box(x,y,z,1.05,.07,.54,color,{hard:true,gloss:.34,...tagOpt(tag)});
        for(const sx of [-1,1]) for(const sz of [-1,1]) {
          box(x+sx*.44,.48,z+sz*.20,.045,.90,.045,col.steelD,{hard:true,...tagOpt(tag)});
          cyl(x+sx*.44,.07,z+sz*.20,.065,.035,col.black,{rx:Math.PI/2,...tagOpt(tag)});
        }
        solid(x-.55,x+.55,z-.30,z+.30);
      }
      function curtainBay(x,z,w=3.0,d=2.5,tag='帘子',color=col.tealL) {
        for(const sx of [-1,1]) for(const sz of [-1,1])
          cyl(x+sx*w/2,.02,z+sz*d/2,.025,2.35,col.steelD,{...tagOpt(tag)});
        for(const side of [-1,1])
          box(x+side*w/2,1.18,z,.035,2.25,d,color,{hard:true,mode:7,alpha:.68,...tagOpt(tag)});
      }

      // ---------------------------------------------------------------- envelope
      flat(0,.002,0,RX*2,RZ*2,col.floor,{mat:'tile',matScale:.66,matAmt:.42,gloss:.16});
      box(0,H+.08,0,RX*2+.30,.16,RZ*2+.30,col.white,{hard:true,gloss:.10});
      // perimeter walls; on 1F the street door is a true opening rather than painted glass
      partitionZ(RZ,-RX,RX,[],col.wall,'外墙',[-1]);
      partitionX(-RX,-RZ,RZ,[],col.wall,'外墙',[1]);
      partitionX(RX,-RZ,RZ,[],col.wall,'外墙',[-1]);
      partitionZ(-RZ,-RX,RX,floorNo===1?[[0,4.4]]:[],col.wall,'外墙',[1]);
      blocker(-RX-.2,RX+.2,-RZ-.2,-RZ+.2,H+.5);
      blocker(-RX-.2,RX+.2,RZ-.2,RZ+.2,H+.5);
      blocker(-RX-.2,-RX+.2,-RZ,RZ,H+.5);
      blocker(RX-.2,RX+.2,-RZ,RZ,H+.5);

      if(floorNo===1) {
        // The exterior seen when the main automatic doors part.  Street and hospital are separate
        // render scenes, so this portal-sized continuation prevents an open entrance from exposing
        // a clear-colour void while keeping the existing exit trigger and collision authoritative.
        flat(0,.004,-RZ-1.75,12.0,3.50,col.floorD,
          {mat:'paving',matScale:1.15,matAmt:.25,gloss:.10,tag:'门外'});
        for(let x=-5.0;x<=5.0;x+=1.0)
          flat(x,.010,-RZ-1.35,.42,2.20,col.yellow,{mode:1,alpha:.34,tag:'门外'});
        box(0,.11,-RZ-3.48,12.0,.22,.18,col.steelD,{hard:true,gloss:.22,tag:'门外'});
        flat(0,.001,-RZ-5.75,22.0,4.50,col.black,
          {mat:'concrete',matScale:2.9,matAmt:.15,gloss:.13,tag:'门外'});
        for(let x=-9;x<=9;x+=4.5)
          flat(x,.010,-RZ-5.75,1.8,.10,col.yellow,{mode:1,alpha:.66,tag:'门外'});
        // The far streetscape: a low municipal block with varied glazing rather than a single
        // backdrop card.  The opening only subtends four metres, but a wider set survives camera
        // orbit without its edge ever entering frame.
        box(0,3.75,-RZ-8.45,24.0,7.50,.36,col.wallD,
          {hard:true,mat:'plaster',matScale:2.8,matAmt:.12,tag:'门外'});
        box(0,.55,-RZ-8.22,24.2,1.10,.18,col.blueD,{hard:true,tag:'门外'});
        for(let x=-9.0;x<=9.0;x+=3.0) {
          box(x,2.12,-RZ-8.22,2.15,2.65,.08,col.black,{hard:true,gloss:.22,tag:'门外'});
          luminous(box(x,2.12,-RZ-8.16,1.95,2.45,.025,col.glass,
            {hard:true,mode:1,alpha:.42,gloss:.46,tag:'门外'}),.30);
        }
        // Forecourt rail, tree and a waiting taxi give the view depth cues and recognizable scale.
        for(const x of [-5.2,-3.5,3.5,5.2])
          cyl(x,.55,-RZ-2.78,.035,1.10,col.steelD,{gloss:.38,tag:'门外'});
        for(const x of [-4.35,4.35])
          capsule(x,1.02,-RZ-2.78,.030,1.70,.030,col.steel,
            {rz:Math.PI/2,gloss:.38,tag:'门外'});
        cyl(5.55,1.02,-RZ-1.75,.12,2.04,col.woodD,{gloss:.17,tag:'门外'});
        ball(5.55,2.30,-RZ-1.75,.80,.72,.80,col.green,{mode:15,gloss:.09,tag:'门外'});
        box(-4.4,.62,-RZ-5.20,3.55,.72,1.58,col.blue,
          {hard:true,round:.16,mode:7,gloss:.25,tag:'门外'});
        for(const x of [-5.55,-3.25]) cyl(x,.31,-RZ-5.20,.31,.12,col.black,
          {rx:Math.PI/2,gloss:.16,tag:'门外'});
      }

      // A coloured datum and numbered door plates make the four scenes visibly one institution.
      for(const x of [-12,-6,0,6,12]) flat(x,.018,0,1.10,RZ*2-.8,fc,{alpha:.12,mode:1,gloss:.05});
      box(0,.48,-RZ+.12,RX*2-.7,.12,.06,fc,{hard:true,mode:1,alpha:.84});

      // Even public-hospital illumination: clinical white panels in a measured grid, each with a
      // modest real light.  Four are enough for shading; the emissive panels carry the rest.
      for(let xi=-12;xi<=12;xi+=6) for(let zi=-9;zi<=9;zi+=6) {
        const lp=luminous(box(xi,H-.14,zi,2.0,.055,.44,col.warm,{hard:true,mode:1,glow:.08}),.16);
        if((xi+12)%12===0 && (zi+9)%12===0) light(xi,H-.28,zi,[.91,.96,.94],.42,7.5);
      }

      // ---------------------------------------------------------------- shared vertical core
      // Two real sliding lift leaves and their call panel, in the same position on every floor.
      // The floor chooser already performs the trip in game.js; this shared assembly supplies the
      // missing physical feedback.  Approaching calls the car, opens the leaves and lights the
      // current-floor buttons; walking away lets them close again.  Door leaves are visual rather
      // than colliders so an animation can never trap the player against the east perimeter wall.
      const LX=RX-.22,LZ=-8.05;
      const liftZ=LZ-1.05, liftParts=[];
      box(LX+.045,1.30,liftZ,.055,2.48,1.72,col.black,{hard:true,gloss:.08,tag:'电梯'});
      luminous(box(LX+.012,2.17,liftZ,.025,.46,1.50,col.warm,
        {hard:true,mode:1,glow:.035,tag:'电梯'}),.15);
      // Brushed jambs, header and sill frame the opening even when the leaves are fully apart.
      for(const s of [-1,1]) box(LX-.035,1.30,liftZ+s*.91,.11,2.68,.12,col.steelD,
        {hard:true,gloss:.46,tag:'电梯'});
      box(LX-.035,2.62,liftZ,.11,.14,1.94,col.steelD,{hard:true,gloss:.46,tag:'电梯'});
      box(LX-.035,.055,liftZ,.11,.11,1.94,col.steelD,{hard:true,gloss:.46,tag:'电梯'});
      for(const s of [-1,1]) {
        const p=box(LX-.080,1.30,liftZ+s*.46,.065,2.44,.86,col.steel,
          {hard:true,gloss:.42,tag:'电梯'});
        p.ob=null;
        // Narrow safety glass, edge gasket and warning stripe break up each metal leaf.
        const glass=box(LX-.118,1.64,liftZ+s*.46,.018,.64,.19,col.glass,
          {hard:true,mode:1,alpha:.28,gloss:.52,tag:'电梯'});
        glass.ob=null;
        const stripe=box(LX-.122,.78,liftZ+s*.46,.016,.055,.70,fc,
          {hard:true,mode:1,alpha:.82,tag:'电梯'});
        stripe.ob=null;
        liftParts.push({p,s,m0:p.m},{p:glass,s,m0:glass.m},{p:stripe,s,m0:stripe.m});
      }
      box(LX-.13,2.93,LZ-1.05,.08,.42,.76,col.black,{hard:true,tag:'电梯'});
      const ind=liveScreen(box(LX-.185,2.93,LZ-1.05,.035,.30,.62,col.screen,{hard:true,mode:1,glow:.10,tag:'电梯'}),.4);
      glyphs(LX-.22,2.93,LZ-1.05,-Math.PI/2,String(floorNo),{size:.22,color:col.white,mode:1,lift:.012,tag:'电梯'});
      glyphs(LX-.225,2.73,LZ-1.05,-Math.PI/2,'F',{size:.095,color:col.tealL,mode:1,lift:.012,tag:'电梯'});
      // Direction arrows and four illuminated floor confirmations.
      for(const [sy,dir] of [[3.18,1],[2.68,-1]]) {
        capsule(LX-.222,sy,liftZ+dir*.12,.018,.21,.018,dir>0?col.green:col.blue,
          {rz:dir*.70,ry:Math.PI/2,mode:1,glow:.06,tag:'电梯'});
        capsule(LX-.222,sy,liftZ-dir*.12,.018,.21,.018,dir>0?col.green:col.blue,
          {rz:-dir*.70,ry:Math.PI/2,mode:1,glow:.06,tag:'电梯'});
      }
      box(LX-.16,1.20,LZ+.10,.07,.52,.22,col.steelD,{hard:true,gloss:.36,tag:'电梯'});
      cyl(LX-.22,1.32,LZ+.10,.055,.025,fc,{rz:Math.PI/2,mode:1,glow:.08,tag:'电梯'});
      for(let i=0;i<4;i++) {
        const p=liveScreen(cyl(LX-.205,1.04+i*.13,LZ+.10,.025,.014,
          i+1===floorNo?fc:col.wallD,{rz:Math.PI/2,mode:1,glow:i+1===floorNo?.09:.015,tag:'电梯'}),i*.72);
      }
      let liftOpen=0, liftTarget=0;
      hospitalState.lift={floor:floorNo,open:0,called:false};
      onTick((t,body,clock,dt)=>{
        const bx=body&&Number.isFinite(body.x)?body.x:0;
        const bz=body&&Number.isFinite(body.z)?body.z:0;
        const near=Math.hypot(bx-(LX-1.30),bz-liftZ)<2.55;
        liftTarget=near?1:0;
        const k=1-Math.exp(-Math.max(0,dt)*5.8);
        liftOpen+=(liftTarget-liftOpen)*k;
        if(Math.abs(liftTarget-liftOpen)<.002) liftOpen=liftTarget;
        for(const q of liftParts)
          q.p.m=M.mul(M.trans(0,0,q.s*.72*liftOpen),q.m0);
        hospitalState.lift.open=+liftOpen.toFixed(3);
        hospitalState.lift.called=near;
      });
      thing('电梯',LX-.28,1.40,LZ-1.05,'电梯口的牌子写着一楼到四楼。',
        'Call the lift, then choose any of the hospital\'s four floors.',
        '电梯 is a lift. 按楼层 means choose a floor.',{tag:'电梯',focus:[RX-2.0,LZ-1.05],reach:2.2}).hospitalFloor=floorNo;

      // The enclosed fire stair at the opposite end of the same cross-corridor.
      const SX=-RX+.22,SZ=-8.05;
      box(SX,1.30,SZ,.12,2.60,1.65,col.wallD,{hard:true,tag:'楼梯'});
      box(SX+.075,1.30,SZ,.07,2.40,1.42,col.redD,{hard:true,gloss:.22,tag:'楼梯'});
      glyphs(SX+.13,1.62,SZ,Math.PI/2,'楼梯',{size:.23,gap:.08,color:col.white,mode:1,lift:.012,tag:'楼梯'});
      glyphs(SX+.13,1.18,SZ,Math.PI/2,'安全出口',{size:.105,gap:.025,color:col.white,mode:1,lift:.012,tag:'楼梯'});
      thing('楼梯',SX+.18,1.40,SZ,'安全楼梯通到每一层。','The fire stairs reach every floor.',
        '楼 floor + 梯 ladder/stairs. 安全出口 means emergency exit.',
        {tag:'楼梯',focus:[-RX+2.0,SZ],reach:2.2}).hospitalFloor=floorNo;

      // Floor directory: Chinese hospitals navigate by department first and number second.
      box(11.75,1.70,-10.45,.10,2.66,3.10,col.wallD,{hard:true,tag:'楼层索引'});
      luminous(box(11.68,1.70,-10.45,.055,2.52,2.96,col.warm,{hard:true,mode:1,glow:.025,tag:'楼层索引'}),.24);
      glyphs(11.62,2.66,-10.45,-Math.PI/2,'楼层索引',{size:.15,gap:.045,color:col.ink,mode:1,lift:.012,tag:'楼层索引'});
      HOSPITAL_FLOORS.forEach((f,i)=>{
        const y=2.25-i*.50;
        box(11.60,y,-11.46+i*.65,.03,.32,.54,i+1===floorNo?fc:col.wallD,{hard:true,mode:1,tag:'楼层索引'});
        glyphs(11.56,y,-11.46+i*.65,-Math.PI/2,String(i+1),{size:.17,color:i+1===floorNo?col.white:col.ink,mode:1,lift:.010,tag:'楼层索引'});
      });
      thing('楼层索引',11.60,1.70,-10.45,
        '一楼挂号急诊，二楼门诊，三楼检查治疗，四楼住院康复。',
        'Registration and emergency on 1F; clinics on 2F; tests and treatment on 3F; wards and rehabilitation on 4F.',
        '索引 is an index. In a hospital, first find the 科室 department and then the floor.',
        {tag:'楼层索引',focus:[10.20,-10.45],reach:2.1});

      // Hand-cleaning point by the vertical core, functional on every floor.
      box(8.55,.94,-10.55,.32,.62,.30,col.white,{hard:true,tag:'洗手液'});
      box(8.55,1.30,-10.55,.18,.16,.18,col.tealL,{hard:true,mode:1,tag:'洗手液'});
      box(8.55,1.44,-10.55,.06,.18,.06,col.steelD,{hard:true,tag:'洗手液'});
      thing('洗手液',8.55,1.10,-10.55,'进医院先洗手。','Clean your hands when you enter the hospital.',
        '洗手液 is liquid hand soap/sanitiser.',{tag:'洗手液',focus:[8.55,-9.75],reach:1.4});

      if(floorNo===1) {
        // The entrance reads as a vestibule, not a hole in the wall: two automatic glass leaves,
        // warning dots, floor mat and the red municipal-hospital name over the threshold.
        const entranceParts=[];
        const entranceSlide=1.48;
        const entrancePart=(p,s)=>{
          // Build the leaf at the outer end of its travel and give the culler one sphere covering
          // the complete sweep.  Animated matrices do not rebuild Build.finish's packed cull
          // arrays, so leaving the ordinary construction-time bounds here would make a closing
          // leaf disappear at a grazing camera angle.
          p.ob=null;
          p.fixed=true;
          p.cx=s*(1.08+entranceSlide*.50); p.cy=p.m[13]; p.cz=-RZ+.06;
          p.r=Math.max(1.65,.5*Math.hypot(1.94,2.56,.10)+entranceSlide*.55);
          entranceParts.push({p,s,m0:p.m});
          return p;
        };
        for(const s of [-1,1]) {
          const openX=s*(1.08+entranceSlide);
          entrancePart(box(openX,1.32,-RZ+.08,1.94,2.56,.045,col.glass,
            {hard:true,mode:1,alpha:.38,gloss:.50,tag:'门'}),s);
          // Safety dots travel with their own leaf instead of floating in the opening after the
          // glass moves.  Their spacing mirrors across the centreline on the right-hand leaf.
          for(let i=0;i<4;i++) entrancePart(cyl(openX+s*(-.48+i*.32),1.08,-RZ+.035,
            .035,.018,col.white,{rx:Math.PI/2,mode:1,alpha:.78,tag:'门'}),s);
        }
        let entranceOpen=1, entranceTarget=1;
        hospitalState.entrance={open:1,near:true};
        onTick((t,body,clock,dt)=>{
          const bx=body&&Number.isFinite(body.x)?body.x:99;
          const bz=body&&Number.isFinite(body.z)?body.z:99;
          // A broad vestibule sensor lets wheelchairs and stretchers approach off-centre.  The
          // hysteresis keeps a player paused on the mat from making the leaves chatter.
          const wasNear=!!hospitalState.entrance.near;
          const near=Math.abs(bx)<(wasNear?3.35:2.85) && Math.abs(bz+RZ)<(wasNear?3.45:3.0);
          entranceTarget=near?1:0;
          const k=1-Math.exp(-Math.max(0,dt)*(entranceTarget?6.6:4.2));
          entranceOpen+=(entranceTarget-entranceOpen)*k;
          if(Math.abs(entranceTarget-entranceOpen)<.001) entranceOpen=entranceTarget;
          for(const q of entranceParts)
            q.p.m=M.mul(M.trans(-q.s*entranceSlide*(1-entranceOpen),0,0),q.m0);
          hospitalState.entrance.open=+entranceOpen.toFixed(3);
          hospitalState.entrance.near=near;
        });
        flat(0,.026,-10.82,4.20,1.45,col.tealD,{mode:7,gloss:.06,tag:'门'});
        sign(0,3.47,-RZ+.04,0,'北京市仁和医院',col.red,'门',.255);
        glyphs(0,3.12,-RZ+.01,0,'门诊 · 急诊',{size:.14,gap:.05,color:col.ink,mode:1,lift:.012,tag:'门'});
        thing('门',0,1.45,-RZ+.05,'自动门外就是医院门前的主路。',
          'The automatic doors lead back to the main road.',
          '门诊 is outpatient care; 急诊 is emergency care.',
          {tag:'门',focus:[0,-10.55],reach:2.2}).exit={place:'street',at:HOSPITAL_OUT};
      }

      // The floor builder gets the scene primitives plus a measured, shared furniture library.
      const A = {
        B,box,cyl,ball,capsule,taper,flat,glyphs,solid,blocker,shade,glow,light,thing,
        RX,RZ,H,floor:floorNo,meta:HOSPITAL_FLOORS[floorNo-1],C,col,fc,
        luminous,liveScreen,partitionZ,partitionX,sign,doorPlate,infoPanel,screen,counter,desk,
        chair,bench,cabinet,examBed,sink,ivStand,cart,curtainBay,
        onTick,privacyDoorZ,cameraRoom,state:hospitalState,
      };
      const fit=HospFit[floorNo];
      if(typeof fit==='function') fit(A);
      else console.error('Hospital floor '+floorNo+' has no HospFit builder');

      let nightK=0, lastTick=0;
      function setNight(k) {
        nightK=k*k*(3-2*k);
        for(const q of lit) q.p.glow=q.g0+nightK*q.k*.18;
      }
      function tick(t,body,clock) {
        for(const q of screens) q.p.glow=q.g0+(.5+.5*Math.sin(t*1.7+q.phase))*.045+nightK*.06;
        // A tab returning from the background can advance wall time by minutes.  Doors should
        // finish their half-second glide, not teleport or integrate a huge stale delta.
        const dt=lastTick?Math.min(.20,Math.max(0,t-lastTick)):0;
        lastTick=t;
        for(const fn of floorTicks) fn(t,body,clock,dt);
      }

      const title=HOSPITAL_FLOORS[floorNo-1];
      return B.finish({
        setNight,tick,OUT:HOSPITAL_OUT,floor:floorNo,
        hospitalState,hospitalDoors:privacyDoors,cameraRooms,cameraAssistAt,
        RX,RZ,H,
        WIN:{x:RX-.2,y:2.0,z:0,hw:1.0,hh:1.8},
        label:'医院', labelK:`北京市仁和医院 · ${title.hz} ${title.name}`,
        indoor:true,cutaway:true,winOn:false,near:.06,far:72,expose:1.18,
        // The hospital is a 34-by-24-metre white shell. At the ordinary room amount the contact
        // pass samples the opposite wall and lays a translucent copy of the whole floor over the
        // image; a light amount keeps bed/chair contact without turning the depth map into decor.
        aoRadius:.32,aoAmt:.06,bloom:.76,
        camera:{pitch:.30,dist:5.1,lookY:1.15},
        spawn:floorNo===1
          ? {x:0,z:-9.65,yaw:0}
          : {x:RX-2.45,z:-8.05,yaw:Math.PI},
        zones:[{id:'hospital'+floorNo,x0:-RX+.25,x1:RX-.25,z0:-RZ+.25,z1:RZ-.25,
                light:[0,H-.45,0]}],
        roomAt(){return this.zones[0];},
      });
    });
  }

  return { makeFloor,RX,RZ,H,OUT:HOSPITAL_OUT,FLOORS:HOSPITAL_FLOORS };
})();

const Hospital  = HospitalCore.makeFloor('Hospital', 1);
const Hospital2 = HospitalCore.makeFloor('Hospital2',2);
const Hospital3 = HospitalCore.makeFloor('Hospital3',3);
const Hospital4 = HospitalCore.makeFloor('Hospital4',4);
