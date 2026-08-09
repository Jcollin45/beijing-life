#!/usr/bin/env node
'use strict';

// Authored source for the complete Beijing Wenhua University interior blueprint.
// The generated JSON is the machine-readable construction contract; the generated Markdown is the
// human review copy. Coordinates are metres in each building's local frame unless stated otherwise.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const JSON_OUT = path.join(ROOT, 'UNIVERSITY-INTERIORS-BLUEPRINT.json');
const MD_OUT = path.join(ROOT, 'UNIVERSITY-INTERIORS-BLUEPRINT.md');
const PI = Math.PI;
const r3 = n => Math.round(n * 1000) / 1000;
const pad = (n, w = 2) => String(n).padStart(w, '0');

const materials = [
  ['M-TERRAZZO','warm grey terrazzo','#b9b4aa','terrazzo',9,.16],
  ['M-TILE-LIGHT','light porcelain tile','#d7d2c8','tile',9,.18],
  ['M-TILE-DARK','charcoal anti-slip tile','#666b6e','tile',9,.12],
  ['M-VINYL','quiet warm-grey resilient floor','#aaa69d','none',9,.08],
  ['M-OAK','sealed oak','#8b6847','wood',3,.22],
  ['M-OAK-DARK','dark stained oak','#5d4530','wood',3,.20],
  ['M-RUBBER','sports/acoustic rubber','#59636a','none',9,.06],
  ['M-EPOXY','pale laboratory epoxy','#b7c1bf','none',9,.20],
  ['M-KITCHEN-EPOXY','red-brown non-slip kitchen epoxy','#8c6254','none',9,.10],
  ['M-WALL-WARM','warm washable plaster','#e5dfd2','plaster',4,.08],
  ['M-WALL-WHITE','cool washable plaster','#e7e8e4','plaster',4,.08],
  ['M-WALL-GREEN','clinic pale green wall','#c9d8cd','plaster',4,.08],
  ['M-BRICK','interior red brick accent','#9b5546','brick',11,.08],
  ['M-ACOUSTIC','perforated acoustic panel','#c9c1b4','none',6,.06],
  ['M-GLASS','laminated safety glass','#91adb7','glass',1,.82],
  ['M-STEEL','powder-coated steel','#7f898f','steel',1,.55],
  ['M-STEEL-DARK','dark steel','#41494f','steel',1,.48],
  ['M-BRASS','satin brass','#b08a4a','metal',1,.46],
  ['M-STAINLESS','food/clinical stainless steel','#b8c0c3','steel',1,.66],
  ['M-WOOD-DESK','beech classroom furniture','#bc9168','wood',3,.20],
  ['M-BOARD-GREEN','green chalkboard','#2f5d4a','none',1,.06],
  ['M-WHITEBOARD','white enamel board','#ecece7','none',1,.28],
  ['M-SCREEN','lit information screen','#3d6f91','none',1,.20],
  ['M-FABRIC-BLUE','blue upholstery','#476887','fabric',7,.04],
  ['M-FABRIC-RED','muted red upholstery','#8c4e43','fabric',7,.04],
  ['M-CLINIC','white clinical laminate','#e5ece8','none',1,.32],
  ['M-CERAMIC','white sanitary ceramic','#edf0eb','none',1,.40],
  ['M-LAB-BLUE','laboratory cabinet blue','#577484','none',1,.22],
  ['M-SAFETY-YELLOW','safety yellow','#d6ad36','none',1,.18],
  ['M-SAFETY-RED','fire-safety red','#a83b30','none',1,.20],
  ['M-PLANT','interior foliage','#4f7440','foliage',15,.08],
].map(([id,label,color,texture,renderMode,gloss]) =>
  ({id,label,color,texture,renderMode,gloss}));

const prefabCatalog = [
  ['PF-WALL-RUN','wall-run',[1,.12,1],'centre','Partition box; full dimensions come from instance size.'],
  ['PF-DOOR-SINGLE','door-single',[.98,2.12,.08],'threshold','Painted leaf, frame, lever, vision panel and swing metadata.'],
  ['PF-DOOR-DOUBLE','door-double',[1.8,2.22,.10],'threshold','Two glazed leaves, frame, pull rails and clear-opening metadata.'],
  ['PF-EXIT-SIGN','exit-sign',[.48,.22,.06],'face-centre','Green bilingual EXIT/出口 face with low emissive glow.'],
  ['PF-ROOM-SIGN','room-sign',[.46,.24,.04],'face-centre','Blue bilingual room plate; instance supplies text.'],
  ['PF-DIRECTORY','directory-screen',[1.2,1.7,.10],'floor','Freestanding or wall directory with floor map and accessible route.'],
  ['PF-CEILING-LIGHT','ceiling-panel',[1.2,.06,.28],'ceiling-centre','LED panel, diffuser and real point-light anchors.'],
  ['PF-PENDANT','pendant-light',[.42,.30,.42],'ceiling-centre','Shade, warm emitter and suspension stem.'],
  ['PF-EMERGENCY-LIGHT','emergency-light',[.32,.12,.10],'face-centre','Battery emergency luminaire.'],
  ['PF-ALARM','fire-alarm',[.16,.24,.08],'face-centre','Manual call point and audible beacon.'],
  ['PF-EXTINGUISHER','extinguisher-cabinet',[.42,.72,.18],'floor','Recessed red cabinet, extinguisher bottle and label.'],
  ['PF-AED','aed-cabinet',[.52,.58,.18],'face-centre','Public AED cabinet, green light and bilingual label.'],
  ['PF-FIRST-AID','first-aid-cabinet',[.52,.68,.20],'face-centre','Lockable first-aid cabinet with marked cross.'],
  ['PF-STAIR','stair-flight',[2.5,3.0,4.8],'floor','Two-flight stair, landing, 1.10 m rails and tactile nosings.'],
  ['PF-LIFT','lift-car',[1.7,2.45,1.7],'floor','Accessible lift car, doors, panel, handrail and floor display.'],
  ['PF-BENCH','bench',[1.8,.84,.58],'floor','Four-leg bench with back and two seat positions.'],
  ['PF-CHAIR','chair',[.46,.84,.48],'floor','Seat, back and four legs; instance yaw is seated facing.'],
  ['PF-STOOL','lab-stool',[.38,.56,.38],'floor','Height-adjustable round stool and five-foot base.'],
  ['PF-WAIT-CHAIRS','waiting-chair-bank',[1.9,.84,.62],'floor','Three linked seats on steel beam.'],
  ['PF-STUDENT-DESK-2','two-seat-student-desk',[1.4,.78,.82],'floor','Desk top, skirt, four legs, two stools, book and pencil case.'],
  ['PF-LECTURE-SEAT','lecture-seat',[.58,.88,.82],'floor','Fixed padded seat with folding writing tablet.'],
  ['PF-TEACHER-PODIUM','teacher-podium',[1.25,1.18,.72],'floor','Lectern, worktop, lockable cabinet and cable grommet.'],
  ['PF-COMPUTER-DESK','computer-workstation',[1.2,.76,.72],'floor','Desk, ergonomic chair, monitor, keyboard, mouse and under-desk tower.'],
  ['PF-LANGUAGE-DESK','language-workstation',[1.1,.76,.72],'floor','Computer workstation plus headset, microphone and divider.'],
  ['PF-CHALKBOARD','chalkboard',[5.4,1.5,.10],'face-centre','Green board, wood frame, chalk tray, chalk and lesson glyph layer.'],
  ['PF-WHITEBOARD','whiteboard',[3.2,1.2,.08],'face-centre','Magnetic board, marker tray and four marker blocks.'],
  ['PF-PROJECTOR','ceiling-projector',[.32,.18,.42],'ceiling-centre','Projector body, mount, lens and low-glow emitter.'],
  ['PF-SCREEN','projection-screen',[2.4,1.5,.06],'face-centre','Roll case, matte screen and lower weight bar.'],
  ['PF-CLOCK','wall-clock',[.46,.46,.06],'face-centre','Dial, 12 marks and animated hour/minute hands.'],
  ['PF-FLAG','wall-flag',[.72,.48,.04],'face-centre','Red fabric panel with gold hanging bar.'],
  ['PF-BOOKCASE','bookcase',[.9,2.0,.38],'floor','Five shelves, deterministic mixed books and label strip.'],
  ['PF-BOOKSTACK','double-book-stack',[1.0,2.2,3.0],'floor','Two-sided six-shelf stack with end classification panel and books.'],
  ['PF-READING-TABLE','four-seat-reading-table',[2.4,.80,1.35],'floor','Oak table, four chairs, baize inlay, books and banker lamp.'],
  ['PF-CIRC-DESK','circulation-desk',[2.8,1.05,.9],'floor','Accessible return section, computer, scanner, task lamp and sign.'],
  ['PF-SELF-CHECK','self-check-kiosk',[.52,1.35,.50],'floor','Touchscreen, RFID pad, receipt slot and status lamp.'],
  ['PF-SECURITY-GATE','library-security-gate',[.16,1.65,.62],'floor','Transparent RFID gate leaf with status light.'],
  ['PF-SHELF','storage-shelf',[1.0,2.0,.48],'floor','Five powder-coated shelves and labelled contents blocks.'],
  ['PF-FILE-CABINET','file-cabinet',[.9,1.35,.48],'floor','Lockable four-drawer cabinet with label holders.'],
  ['PF-OFFICE-DESK','office-workstation',[1.5,.76,.75],'floor','Desk, task chair, monitor, keyboard, phone and drawer pedestal.'],
  ['PF-MEETING-TABLE','meeting-table',[2.8,.76,1.15],'floor','Cable-managed table; chairs are separate exact instances.'],
  ['PF-SERVICE-COUNTER','service-counter',[2.4,1.05,.82],'floor','Accessible counter section, two terminals and privacy screen.'],
  ['PF-CANTEEN-TABLE','four-seat-canteen-table',[1.45,.76,1.15],'floor','Laminate table with four fixed stools.'],
  ['PF-TRAY-RACK','tray-rack',[.72,1.25,.52],'floor','Tray shelves, chopstick cups and sanitizer dispenser.'],
  ['PF-SERVING-COUNTER','heated-serving-counter',[2.0,1.15,.86],'floor','Stainless counter, three food pans, sneeze guard and menu plate.'],
  ['PF-CASHIER','cashier-station',[1.25,1.05,.78],'floor','Counter, POS screen, scanner and payment sign.'],
  ['PF-DISH-RETURN','dish-return',[2.0,1.15,.82],'floor','Tray aperture, belt, scrape bin and return sign.'],
  ['PF-KITCHEN-RANGE','commercial-range',[1.8,.92,.82],'floor','Two wok rings, controls, splashback and gas-isolation label.'],
  ['PF-HOOD','extract-hood',[2.2,.72,1.05],'ceiling-centre','Stainless canopy, baffles, light and suppression nozzles.'],
  ['PF-PREP-TABLE','prep-table',[1.8,.9,.75],'floor','Stainless worktop, undershelf and colour-coded boards.'],
  ['PF-SINK-DOUBLE','double-sink',[1.4,.92,.72],'floor','Two stainless bowls, taps, drainboard and splashback.'],
  ['PF-FRIDGE','upright-fridge',[.82,2.0,.82],'floor','Two-door refrigerator, thermometer and ventilation grille.'],
  ['PF-FREEZER','upright-freezer',[.82,2.0,.82],'floor','Lockable freezer, thermometer and ventilation grille.'],
  ['PF-HANDWASH','handwash-basin',[.52,.88,.42],'floor','Basin, sensor tap, soap, towel unit and splashback.'],
  ['PF-WATER','water-dispenser',[.42,1.2,.42],'floor','Hot/cold dispenser, bottle and cup rack.'],
  ['PF-BIN','waste-bin',[.42,.68,.42],'floor','Lidded bin with stream label.'],
  ['PF-PLANT','potted-plant',[.58,1.35,.58],'floor','Weighted pot, soil and deterministic foliage cluster.'],
  ['PF-BED','single-bed',[2.0,.58,.92],'floor','Frame, mattress, pillow, sheet and folded quilt.'],
  ['PF-DORM-DESK','dorm-study-desk',[1.05,.76,.58],'floor','Desk, chair, task lamp, books and power strip.'],
  ['PF-WARDROBE','wardrobe',[.9,2.15,.6],'floor','Two-door wardrobe, handles, top locker and clothes rail.'],
  ['PF-SHOE-RACK','shoe-rack',[.8,.55,.32],'floor','Three shelves with deterministic shoe pairs.'],
  ['PF-AC','indoor-ac-unit',[.82,.28,.22],'face-centre','Wall split-unit body, grille and status lamp.'],
  ['PF-LAUNDRY','washer-dryer',[.68,1.75,.72],'floor','Stacked washer/dryer with doors and control panels.'],
  ['PF-LOCKERS','locker-bank',[1.8,1.9,.5],'floor','Six ventilated steel lockers with number plates.'],
  ['PF-LAB-BENCH','laboratory-bench',[2.4,.92,.82],'floor','Chemical-resistant worktop, cabinets, service taps and sockets.'],
  ['PF-FUME-HOOD','fume-hood',[1.5,2.35,.88],'floor','Sash, work chamber, extraction plenum and service controls.'],
  ['PF-LAB-SINK','laboratory-sink',[.8,.92,.65],'floor','Chemical-resistant sink, gooseneck tap and drying pegs.'],
  ['PF-EYEWASH','eyewash-shower',[.65,2.25,.65],'floor','Twin eyewash heads, pull shower and floor drain.'],
  ['PF-MICROSCOPE','microscope-station',[1.2,.92,.72],'floor','Bench, stool, microscope, task light and specimen tray.'],
  ['PF-ROBOTICS','robotics-bench',[2.0,.92,.9],'floor','Work bench, tool board, solder extraction and robot model.'],
  ['PF-EXAM-COUCH','exam-couch',[1.95,.78,.72],'floor','Adjustable couch, paper roll, step and privacy curtain track.'],
  ['PF-CLINIC-CABINET','clinical-cabinet',[.8,2.0,.45],'floor','Lockable clinical storage with labelled trays.'],
  ['PF-MED-FRIDGE','medicine-fridge',[.68,1.85,.68],'floor','Lockable monitored refrigerator.'],
  ['PF-PHARMACY','pharmacy-counter',[2.0,1.05,.72],'floor','Dispensing counter, privacy screen, terminal and medicine drawers.'],
  ['PF-DANCE-MIRROR','dance-mirror',[3.2,2.0,.04],'face-centre','Safety-backed mirror with timber barre.'],
  ['PF-MUSIC-RACK','music-storage',[1.2,1.8,.48],'floor','Instrument cubbies and labelled cases.'],
  ['PF-ART-TABLE','art-table',[1.8,.78,.9],'floor','Washable table, four stools, cutting mat and supply caddy.'],
  ['PF-CCTV-DESK','security-console',[2.2,.82,.82],'floor','Desk, chair, six CCTV screens, radio and barrier controls.'],
  ['PF-KEY-CABINET','key-cabinet',[.72,1.05,.18],'face-centre','Lockable numbered key board.'],
  ['PF-TOILET','toilet',[.72,.78,.55],'floor','Pan, cistern, seat and grab-rail option.'],
  ['PF-SHOWER','shower-cubicle',[.95,2.15,.95],'floor','Non-slip tray, tiled partitions, curtain, mixer and hooks.'],
  ['PF-BASIN','washbasin',[.62,.88,.45],'floor','Basin, tap, soap, mirror and hand dryer.'],
  ['PF-CLEANING','cleaning-cupboard',[.8,2.05,.58],'floor','Mop sink, shelves, hooks, warning signs and folded cart.'],
].map(([id,label,size,anchor,design]) => ({id,label,size,anchor,design}));

const prefabById = Object.fromEntries(prefabCatalog.map(p => [p.id,p]));
const materialIds = new Set(materials.map(m => m.id));

const finishSets = {
  classroom:{floor:'M-TILE-LIGHT',wall:'M-WALL-WARM',ceiling:'M-WALL-WHITE',trim:'M-OAK-DARK',temperatureK:4000,acoustic:'NRC 0.70 ceiling; felt pads on movable furniture'},
  library:{floor:'M-OAK',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-OAK-DARK',temperatureK:3300,acoustic:'NRC 0.80 ceiling and fabric chair pads'},
  public:{floor:'M-TERRAZZO',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-OAK-DARK',temperatureK:3500,acoustic:'NRC 0.65 ceiling'},
  canteen:{floor:'M-TILE-LIGHT',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-TILE-DARK',temperatureK:3500,acoustic:'washable perforated ceiling rafts'},
  kitchen:{floor:'M-KITCHEN-EPOXY',wall:'M-TILE-LIGHT',ceiling:'M-WALL-WHITE',trim:'M-STAINLESS',temperatureK:4200,acoustic:'washable kitchen ceiling'},
  dorm:{floor:'M-VINYL',wall:'M-WALL-WARM',ceiling:'M-WALL-WHITE',trim:'M-OAK-DARK',temperatureK:3200,acoustic:'resilient underlay; seals at room doors'},
  office:{floor:'M-VINYL',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-OAK-DARK',temperatureK:3500,acoustic:'NRC 0.75 ceiling and fabric task chairs'},
  lab:{floor:'M-EPOXY',wall:'M-WALL-WHITE',ceiling:'M-WALL-WHITE',trim:'M-LAB-BLUE',temperatureK:4200,acoustic:'cleanable acoustic ceiling outside hood zones'},
  clinic:{floor:'M-VINYL',wall:'M-WALL-GREEN',ceiling:'M-WALL-WHITE',trim:'M-CLINIC',temperatureK:4000,acoustic:'clinical acoustic ceiling; privacy seals'},
  activity:{floor:'M-RUBBER',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-OAK',temperatureK:3500,acoustic:'NRC 0.85 ceiling and wall panels'},
  security:{floor:'M-TILE-DARK',wall:'M-WALL-WARM',ceiling:'M-ACOUSTIC',trim:'M-STEEL-DARK',temperatureK:3500,acoustic:'NRC 0.70 ceiling'},
  service:{floor:'M-TILE-DARK',wall:'M-WALL-WHITE',ceiling:'M-WALL-WHITE',trim:'M-STEEL',temperatureK:4000,acoustic:'none required'},
};

function fixture(id,label,prefab,at,material,purpose,extra={}) {
  const p=prefabById[prefab];
  if(!p) throw new Error(`unknown prefab ${prefab} for ${id}`);
  return {id,label,prefab,at:at.map(r3),size:(extra.size||p.size).map(r3),material,collision:extra.collision||'prefab-default',purpose,yaw:r3(extra.yaw||0),...extra,size:(extra.size||p.size).map(r3)};
}

function doorway(id,side,at,width,destination,extra={}) {
  return {id,side,at:at.map(r3),width:r3(width),clearHeight:extra.clearHeight||2.1,destination,...extra};
}

function room(id,label,bounds,finish,doors=[],contents=[],extra={}) {
  return {id,label,bounds:bounds.map(r3),finish,doors,contents,...extra};
}

function floor(level,elevation,height,rooms,circulation,sharedObjects,extra={}) {
  return {level,elevation:r3(elevation),height:r3(height),rooms,circulation,sharedObjects,...extra};
}

function lightGrid(prefix,elevation,points,temperatureK=4000) {
  return points.map(([x,z],i)=>fixture(`${prefix}/L${pad(i+1)}`,'ceiling light','PF-CEILING-LIGHT',
    [x,elevation+2.75,z],'M-WALL-WHITE','general illumination',{temperatureK,lumens:2600}));
}

function safetySet(prefix,elevation,stairAt,exitAt,level,includeAED=false) {
  const out=[
    fixture(`${prefix}/SAFE-EXT`,'fire extinguisher','PF-EXTINGUISHER',[stairAt[0],elevation,stairAt[1]],'M-SAFETY-RED','first-response fire safety'),
    fixture(`${prefix}/SAFE-ALM`,'fire alarm call point','PF-ALARM',[stairAt[0]+.35,elevation+1.25,stairAt[1]],'M-SAFETY-RED','manual alarm'),
    fixture(`${prefix}/SAFE-EXS`,'illuminated exit sign','PF-EXIT-SIGN',[exitAt[0],elevation+2.35,exitAt[1]],'M-SCREEN','egress marking',{text:'出口 EXIT'}),
    fixture(`${prefix}/SAFE-EML`,'emergency light','PF-EMERGENCY-LIGHT',[stairAt[0],elevation+2.35,stairAt[1]+.35],'M-WALL-WHITE','battery egress lighting'),
    fixture(`${prefix}/SAFE-DIR`,'floor directory','PF-ROOM-SIGN',[stairAt[0]-.35,elevation+1.55,stairAt[1]],'M-SCREEN','floor identification',{text:`${level}层 FLOOR ${level}`}),
  ];
  if(includeAED) out.push(fixture(`${prefix}/SAFE-AED`,'public AED','PF-AED',[exitAt[0]+.7,elevation+1.25,exitAt[1]],'M-SAFETY-RED','public defibrillator'));
  return out;
}

function standardClassroom(prefix,e,b,label='标准教室',rows=4,cols=3) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  const out=[
    fixture(`${prefix}/BOARD`,'green teaching board','PF-CHALKBOARD',[cx,e+1.65,z1-.08],'M-BOARD-GREEN','primary teaching surface',{yaw:PI,text:'今天学什么 · 上课了'}),
    fixture(`${prefix}/PODIUM`,'teacher podium','PF-TEACHER-PODIUM',[cx,e,z1-1.02],'M-WOOD-DESK','teacher station',{yaw:PI}),
    fixture(`${prefix}/SCREEN`,'roll-down projection screen','PF-SCREEN',[cx-1.8,e+2.15,z1-.13],'M-WALL-WHITE','projected lesson content',{yaw:PI}),
    fixture(`${prefix}/PROJECTOR`,'ceiling projector','PF-PROJECTOR',[cx,e+2.72,z0+1.05],'M-STEEL-DARK','classroom projection',{yaw:0}),
    fixture(`${prefix}/CLOCK`,'wall clock','PF-CLOCK',[x1-.42,e+2.45,z1-.10],'M-WALL-WHITE','timekeeping',{yaw:PI}),
    fixture(`${prefix}/FLAG`,'national flag','PF-FLAG',[x0+.48,e+2.25,z1-.10],'M-SAFETY-RED','classroom civic display',{yaw:PI}),
    fixture(`${prefix}/CASE`,'class bookcase','PF-BOOKCASE',[x0+.52,e,z0+.65],'M-OAK-DARK','shared books and supplies',{yaw:PI/2}),
    fixture(`${prefix}/BIN`,'waste bin','PF-BIN',[x0+.62,e,z0+1.55],'M-STEEL','classroom waste'),
    fixture(`${prefix}/SIGN`,'class timetable','PF-ROOM-SIGN',[x1-.45,e+1.55,z1-.10],'M-SCREEN','class identity and timetable',{yaw:PI,text:label}),
  ];
  const xs=Array.from({length:cols},(_,i)=>x0+1.35+i*((x1-x0-2.7)/(Math.max(1,cols-1))));
  const zs=Array.from({length:rows},(_,i)=>z0+1.35+i*1.22);
  let n=0;
  for(const z of zs) for(const x of xs) out.push(fixture(`${prefix}/DESK${pad(++n)}`,'two-seat student desk','PF-STUDENT-DESK-2',[x,e,z],'M-WOOD-DESK','student seat pair',{yaw:0}));
  out.push(...lightGrid(prefix,e,[[cx-2.1,z0+1.6],[cx+2.1,z0+1.6],[cx-2.1,z0+4.2],[cx+2.1,z0+4.2]],4000));
  return out;
}

function lectureRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    fixture(`${prefix}/BOARD`,'lecture whiteboard','PF-WHITEBOARD',[cx,e+1.65,z1-.08],'M-WHITEBOARD','lecture notes',{yaw:PI}),
    fixture(`${prefix}/PODIUM`,'lecturer podium','PF-TEACHER-PODIUM',[cx,e,z1-1.0],'M-OAK-DARK','lecturer station',{yaw:PI}),
    fixture(`${prefix}/SCREEN`,'projection screen','PF-SCREEN',[cx,e+1.75,z1-.13],'M-WALL-WHITE','presentation display',{yaw:PI,size:[3.4,1.9,.06]}),
    fixture(`${prefix}/PROJECTOR`,'ceiling projector','PF-PROJECTOR',[cx,e+2.75,z0+1.0],'M-STEEL-DARK','presentation projection'),
  ];
  let n=0;
  for(const z of [z0+1.0,z0+2.15,z0+3.3,z0+4.45]) for(const x of [x0+1.0,x0+2.25,x0+3.5,x0+4.75,x0+6.0])
    if(x<x1-.45) out.push(fixture(`${prefix}/SEAT${pad(++n)}`,'lecture seat','PF-LECTURE-SEAT',[x,e,z],'M-FABRIC-BLUE','fixed student seat',{yaw:0}));
  out.push(...lightGrid(prefix,e,[[cx-2,z0+1.7],[cx+2,z0+1.7],[cx-2,z0+4.5],[cx+2,z0+4.5]],4000));
  return out;
}

function computerRoom(prefix,e,b,language=false) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,p=language?'PF-LANGUAGE-DESK':'PF-COMPUTER-DESK',out=[
    fixture(`${prefix}/BOARD`,language?'language lesson display':'computer lab whiteboard','PF-WHITEBOARD',[cx,e+1.65,z1-.08],'M-WHITEBOARD','teaching display',{yaw:PI}),
    fixture(`${prefix}/PODIUM`,'instructor workstation','PF-COMPUTER-DESK',[cx,e,z1-1.0],'M-WOOD-DESK','instructor computer',{yaw:PI}),
    fixture(`${prefix}/NET`,'network cabinet','PF-FILE-CABINET',[x0+.5,e,z0+.55],'M-STEEL-DARK','locked network equipment'),
  ];
  let n=0;
  for(const z of [z0+1.1,z0+2.45,z0+3.8,z0+5.15]) for(const x of [x0+1.25,cx,x1-1.25])
    out.push(fixture(`${prefix}/WS${pad(++n)}`,language?'language workstation':'computer workstation',p,[x,e,z],'M-WOOD-DESK',language?'listening and speaking practice':'student computing',{yaw:0}));
  out.push(...lightGrid(prefix,e,[[cx-2,z0+1.6],[cx+2,z0+1.6],[cx-2,z0+4.4],[cx+2,z0+4.4]],4000));
  return out;
}

function seminarRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const width=x1-x0,depth=z1-z0,tableWidth=Math.min(4.2,width-.7),tableDepth=Math.min(1.2,depth-1.4);
  const chairCount=Math.min(4,Math.max(2,Math.floor((tableWidth+.2)/.9)));
  const chairXs=Array.from({length:chairCount},(_,i)=>cx-tableWidth/2+.35+i*((tableWidth-.7)/(chairCount-1)));
  const chairZOffset=Math.min(1.0,depth/2-.3);
  const out=[
    fixture(`${prefix}/TABLE`,'seminar table','PF-MEETING-TABLE',[cx,e,cz],'M-OAK','seminar work surface',{size:[tableWidth,.76,tableDepth]}),
    fixture(`${prefix}/BOARD`,'seminar whiteboard','PF-WHITEBOARD',[cx,e+1.55,z1-.08],'M-WHITEBOARD','group notes',{yaw:PI}),
    fixture(`${prefix}/SCREEN`,'video conference screen','PF-SCREEN',[x1-.08,e+1.55,cz],'M-SCREEN','remote seminar link',{yaw:-PI/2,size:[1.4,.9,.06]}),
  ];
  let n=0;
  for(const x of chairXs) for(const z of [cz-chairZOffset,cz+chairZOffset])
    out.push(fixture(`${prefix}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',{yaw:z<cz?0:PI}));
  if(width>=4.0) {
    const sideOffset=Math.min(2.55,width/2-.3);
    for(const [x,z,yaw] of [[cx-sideOffset,cz,PI/2],[cx+sideOffset,cz,-PI/2]]) out.push(fixture(`${prefix}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',{yaw}));
  }
  const lightOffset=Math.min(1.8,width/2-.35);
  out.push(...lightGrid(prefix,e,[[cx-lightOffset,cz],[cx+lightOffset,cz]],3500));
  return out;
}

function officeRoom(prefix,e,b,desks=2,label='办公室') {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[];
  const positions=desks===1?[[cx,cz]]:desks===2?[[x0+1.35,cz],[x1-1.35,cz]]:
    [[x0+1.25,z0+1.15],[x1-1.25,z0+1.15],[x0+1.25,z1-1.15],[x1-1.25,z1-1.15]];
  positions.slice(0,desks).forEach(([x,z],i)=>out.push(fixture(`${prefix}/DESK${pad(i+1)}`,'office workstation','PF-OFFICE-DESK',[x,e,z],'M-OAK','staff workstation',{yaw:i%2?PI:0})));
  out.push(
    fixture(`${prefix}/FILES`,'file cabinet','PF-FILE-CABINET',[x0+.55,e,z1-.6],'M-STEEL','secure records'),
    fixture(`${prefix}/CASE`,'reference bookcase','PF-BOOKCASE',[x1-.5,e,z1-.55],'M-OAK-DARK','reference material'),
    fixture(`${prefix}/SIGN`,'room sign','PF-ROOM-SIGN',[x1-.08,e+1.5,z0+.55],'M-SCREEN','room identification',{yaw:-PI/2,text:label}),
    fixture(`${prefix}/PLANT`,'office plant','PF-PLANT',[x1-.5,e,z0+.55],'M-PLANT','interior planting'),
    ...lightGrid(prefix,e,[[cx,cz]],3500),
  );
  return out;
}

const existingInteriorAudit = [
  {
    buildingId:'B01',status:'polished-representative-room',placeKey:'classroom',source:'js/classroom.js',
    bounds:[-4.6,4.6,-4.0,4.0],height:2.9,returnToCampus:{x:-3,z:47.2,yaw:0},
    exactGroups:[
      {label:'two-seat student desks',count:6,anchors:[[-1.6,.55],[1.6,.55],[-1.6,-.95],[1.6,-.95],[-1.6,-2.45],[1.6,-2.45]],notes:'1.50 m row pitch; 1.80 m centre aisle; 0.91 m rear clearance'},
      {label:'student seats',count:12,rule:'two stools are included at x=desk.x±0.36, z=desk.z-0.46; seats face the +z teaching wall'},
      {label:'board assembly',count:1,anchor:[0,1.7,3.79],size:[5.4,1.5,.18]},
      {label:'teacher podium',count:1,anchor:[0,0,2.7],size:[1.2,1.34,.68]},
      {label:'teacher chair',count:1,anchor:[1.05,0,3.38]},
      {label:'ceiling light rows',count:2,anchors:[[-1.6,2.86,0],[1.6,2.86,0]]},
      {label:'acoustic ceiling islands',count:5,anchors:[[-3.28,2.805,0],[0,2.805,-2.25],[0,2.805,0],[0,2.805,2.25],[3.28,2.805,0]]},
      {label:'bookcase bays',count:3,anchors:[[-4.46,-2.42],[-4.46,0],[-4.46,2.42]],notes:'five shelves per bay plus 45 deterministic books'},
      {label:'support objects',count:14,notes:'projector, screen, teacher computer, clock, flag, class sign, timetable, three backpacks, plant, broom set, bin, collaboration wall and coat rail'},
    ],
    defects:[],
    gap:'The hand-built scene remains a polished 9.2 × 8.0 m seminar alias for B01/F2/WEST; the complete lobby, corridors, stairs, lift, toilets and all five floors are supplied by B01 floorsPlan.'
  },
  {
    buildingId:'B02',status:'partial-representative-room',placeKey:'library',source:'js/library.js',
    bounds:[-6.0,6.0,-5.5,5.5],height:4.8,returnToCampus:{x:27.2,z:50,yaw:PI/2},
    exactGroups:[
      {label:'reading tables',count:3,anchors:[[0,-.8],[0,1.6],[0,4.0]],notes:'each includes four chairs, banker lamp, books, notebook and pencil'},
      {label:'circulation desk',count:1,anchor:[-2.4,0,-4.7],notes:'computer, lamp and borrow/return sign'},
      {label:'side-wall book stacks',count:4,anchors:[[-5.9,-3],[-5.9,3],[5.9,-3],[5.9,3]],notes:'seven shelves each plus deterministic books'},
      {label:'ceiling light rows',count:3,anchors:[[-2.4,4.76,0],[0,4.76,0],[2.4,4.76,0]]},
      {label:'support objects',count:7,notes:'exit door, globe, clock, four sill plants and one large corner plant'},
    ],
    defects:['The 4.8 m room height conflicts with the exterior 3.2 m floor pitch unless it is declared double-height.','Reading-table legs extend beyond the authored tabletop width.','Shelf carcasses and horizontal shelves do not share the same z extent.','Exported window half-extents are written as full dimensions and the window normal is ambiguous.'],
    gap:'Only one 12 × 11 m grand reading room exists; no security lobby, full stacks, group rooms, archives, toilets, stairs, lift or other floors are represented.'
  },
  {buildingId:'B03',status:'none',gap:'Exterior opening and silhouettes only; no room, portal or interior props.'},
  {buildingId:'B04',status:'none',gap:'Exterior entrance and parcel lockers only; no lobby, bedrooms, washrooms, stairs, lift or interior props.'},
  {buildingId:'B05',status:'generated-complete',gap:'The exterior previously exposed only an entrance/service interaction; B05 floorsPlan now supplies a complete four-floor civic administration interior with public services, departments, meeting and executive suites, protected stairs, accessible lift/WC and secure records.'},
  {buildingId:'B06',status:'none',gap:'Exterior entrance/stair-tower skin only; no walkable labs, safety equipment, stairs, lift or interior props.'},
  {buildingId:'B07',status:'none',gap:'Two exterior doors and window silhouettes only; no activity-centre or clinic rooms.'},
  {buildingId:'B08',status:'none',gap:'Exterior guardhouse shell/window only; no walkable interior and no exterior door portal.'},
];

function buildB01() {
  const floors=[];
  // Two exact 9.2 × 8.0 m modules preserve the current classroom scene without scaling. The
  // central 6.4 m band aligns with the four exterior entrance leaves and holds shared programmes.
  const west=[-12.6,-3.4,-5.0,3.0],centre=[-3.2,3.2,-5.0,3.0],east=[3.4,12.6,-5.0,3.0];
  const cxOf=b=>(b[0]+b[1])/2;
  const withoutCeilingLights=contents=>contents.filter(o=>o.prefab!=='PF-CEILING-LIGHT');

  // B01 uses a deliberate eight-light room budget on a typical floor.  The renderer promotes
  // only ten ceiling fixtures to live lights, so this leaves two real corridor lights instead of
  // spending the whole budget in the first two classrooms and leaving the public route dark.
  function b01RoomLights(id,e,b,type) {
    const cx=cxOf(b),wide=b[1]-b[0]>8;
    const points=wide?[[cx-2.2,b[2]+2.0],[cx+2.2,b[2]+2.0],[cx,b[3]-2.0]]:
      [[cx,b[2]+2.0],[cx,b[3]-2.0]];
    const temperature=['computer','language'].includes(type)?4200:
      ['office','tutorial','prep','seminar'].includes(type)?3500:type==='lobby'?3400:3900;
    return lightGrid(`${id}/LIGHT`,e,points,temperature);
  }

  // The exterior shell is intentionally opaque in the shared renderer.  A shallow sky-lit panel,
  // laminated glass face and proper mullions make each south wall read as the window ribbon that
  // exists on the campus facade, without changing the shell or any collision boundary.
  function b01DaylightWall(id,e,b,isEntrance=false) {
    const cx=cxOf(b),z=b[2]+.055;
    const panels=isEntrance?
      [{x:cx-2.42,w:1.18},{x:cx+2.42,w:1.18}]:
      [{x:cx-(b[1]-b[0]>8?2.05:1.18),w:b[1]-b[0]>8?3.62:2.08},
       {x:cx+(b[1]-b[0]>8?2.05:1.18),w:b[1]-b[0]>8?3.62:2.08}];
    const out=[];
    for(const [i,p] of panels.entries()) out.push(
      fixture(`${id}/DAYLIGHT${i+1}`,'campus daylight panel','PF-SCREEN',[p.x,e+1.72,z],'M-SCREEN','daylight and campus outlook',{size:[p.w,1.22,.025],collision:'none'}),
      fixture(`${id}/GLASS${i+1}`,'laminated window face','PF-WALL-RUN',[p.x,e+1.72,z+.026],'M-GLASS','safe interior glazing',{size:[p.w,1.22,.025],collision:'none'}),
    );
    if(isEntrance) {
      out.push(
        fixture(`${id}/PORTAL-HEAD`,'oak entrance portal head','PF-WALL-RUN',[cx,e+2.48,z+.035],'M-OAK-DARK','frames the public entrance',{size:[3.58,.16,.08],collision:'none'}),
        fixture(`${id}/PORTAL-JAMB-L`,'oak entrance portal jamb','PF-WALL-RUN',[cx-1.72,e+1.25,z+.035],'M-OAK-DARK','frames the public entrance',{size:[.16,2.5,.08],collision:'none'}),
        fixture(`${id}/PORTAL-JAMB-R`,'oak entrance portal jamb','PF-WALL-RUN',[cx+1.72,e+1.25,z+.035],'M-OAK-DARK','frames the public entrance',{size:[.16,2.5,.08],collision:'none'}),
      );
    } else {
      out.push(
        fixture(`${id}/WINDOW-SILL`,'continuous oak window sill','PF-WALL-RUN',[cx,e+1.075,z+.05],'M-OAK','window sill and display ledge',{size:[b[1]-b[0]-.42,.09,.15],collision:'none'}),
        fixture(`${id}/WINDOW-HEAD`,'dark window head rail','PF-WALL-RUN',[cx,e+2.365,z+.05],'M-STEEL-DARK','window head and blind pocket',{size:[b[1]-b[0]-.42,.09,.12],collision:'none'}),
        fixture(`${id}/WINDOW-MULLION`,'central window mullion','PF-WALL-RUN',[cx,e+1.72,z+.05],'M-STEEL-DARK','window framing',{size:[.075,1.32,.08],collision:'none'}),
      );
    }
    return out;
  }

  function b01RoomArchitecture(id,e,b,type,key,label) {
    const cx=cxOf(b),wide=b[1]-b[0]>8,out=[...b01DaylightWall(id,e,b,type==='lobby')];
    const raftXs=wide?[cx-2.55,cx,cx+2.55]:[cx-1.55,cx+1.55];
    for(const [i,x] of raftXs.entries()) out.push(fixture(`${id}/RAFT${i+1}`,'acoustic ceiling raft','PF-WALL-RUN',
      [x,e+2.98,-1.0],'M-ACOUSTIC','absorbs speech and visually orders the ceiling',{size:[2.08,.045,5.45],collision:'none'}));

    if(['standard','lecture','computer','language','seminar'].includes(type)) out.push(
      fixture(`${id}/TEACHING-WALL`,'full-width acoustic teaching wall','PF-WALL-RUN',[cx,e+1.55,b[3]-.025],
        'M-ACOUSTIC','calm high-performance teaching wall',{size:[b[1]-b[0]-.26,2.48,.035],collision:'none'}),
      fixture(`${id}/TEACHING-CAP`,'oak teaching-wall cap','PF-WALL-RUN',[cx,e+2.77,b[3]-.052],
        'M-OAK-DARK','warm datum above teaching surface',{size:[b[1]-b[0]-.26,.13,.055],collision:'none'}),
    );
    if(['standard','lecture'].includes(type)) out.push(
      fixture(`${id}/TEACHER-CHAIR`,'upholstered lecturer chair','PF-CHAIR',[cx+1.18,e,b[3]-.62],
        'M-FABRIC-BLUE','ergonomic lecturer seating',{yaw:0}),
    );
    if(type!=='lobby'&&!['computer','language'].includes(type)) out.push(
      fixture(`${id}/DAYLIGHT-PLANT`,'teaching-room plant','PF-PLANT',[b[1]-.5,e,b[2]+.52],
        'M-PLANT','softens the daylight corner'),
    );
    if(['office','tutorial','prep','study'].includes(type)) out.push(
      fixture(`${id}/COLLAB-DISPLAY`,'shared work display','PF-SCREEN',[b[1]-.06,e+1.58,-.25],
        'M-SCREEN','appointments, room status and shared work',{yaw:-PI/2,size:[1.35,.78,.04],collision:'none'}),
    );
    return out;
  }

  function b01Lobby(id,e,b) {
    const cx=cxOf(b);
    return [
      fixture(`${id}/ENTRY-MAT`,'recessed entrance mat','PF-WALL-RUN',[cx,e+.014,b[2]+.52],
        'M-RUBBER','weather-protected arrival',{size:[3.0,.025,.9],collision:'none'}),
      fixture(`${id}/RUNNER`,'arrival wayfinding runner','PF-WALL-RUN',[cx,e+.012,-1.72],
        'M-RUBBER','direct visual route to reception',{size:[1.16,.02,5.2],collision:'none'}),
      fixture(`${id}/FEATURE-WALL`,'ribbed oak welcome wall','PF-WALL-RUN',[cx,e+1.48,b[3]-.035],
        'M-OAK-DARK','teaching-block identity',{size:[5.92,2.68,.045],collision:'none'}),
      fixture(`${id}/FEATURE-INLAY`,'blue welcome-wall inlay','PF-WALL-RUN',[cx,e+1.72,b[3]-.07],
        'M-SCREEN','university wayfinding colour',{size:[3.95,1.32,.035],collision:'none'}),
      fixture(`${id}/WELCOME`,'teaching-block welcome sign','PF-ROOM-SIGN',[cx,e+2.16,b[3]-.10],
        'M-SCREEN','university and building identity',{yaw:PI,size:[3.45,.42,.04],text:'北京文华大学 · 第一教学楼'}),
      fixture(`${id}/DESK`,'information and accessibility desk','PF-SERVICE-COUNTER',[cx,e,b[3]-1.30],
        'M-OAK','visitor, timetable and accessible assistance',{yaw:PI,size:[2.2,1.05,.82]}),
      fixture(`${id}/DIR`,'five-floor teaching directory','PF-DIRECTORY',[b[0]+.56,e,-.45],
        'M-SCREEN','whole-building wayfinding',{yaw:-PI/2,size:[.92,1.62,.10],text:'第一教学楼 · 1—5层'}),
      fixture(`${id}/WAIT`,'upholstered lobby waiting seats','PF-WAIT-CHAIRS',[b[1]-.54,e,-.35],
        'M-FABRIC-BLUE','student and visitor waiting',{yaw:PI/2,size:[1.65,.84,.62]}),
      fixture(`${id}/NEWS`,'campus teaching news display','PF-SCREEN',[b[1]-.055,e+1.58,1.30],
        'M-SCREEN','room changes and university events',{yaw:-PI/2,size:[1.35,.84,.04],collision:'none'}),
      fixture(`${id}/FLAG`,'university ceremonial flag','PF-FLAG',[b[0]+.62,e+1.95,b[3]-.105],
        'M-SAFETY-RED','institutional identity',{yaw:PI}),
      fixture(`${id}/CLOCK`,'lobby clock','PF-CLOCK',[b[1]-.62,e+2.26,b[3]-.11],
        'M-WALL-WHITE','class-change time',{yaw:PI}),
      fixture(`${id}/PLANT-L`,'large lobby plant','PF-PLANT',[b[0]+.54,e,b[3]-.58],
        'M-PLANT','arrival planting'),
      fixture(`${id}/PLANT-R`,'large lobby plant','PF-PLANT',[b[1]-.54,e,b[3]-.58],
        'M-PLANT','arrival planting'),
      ...b01DaylightWall(id,e,b,true),
      ...b01RoomLights(id,e,b,'lobby'),
      ...[-1.55,1.55].map((x,i)=>fixture(`${id}/RAFT${i+1}`,'acoustic lobby ceiling raft','PF-WALL-RUN',
        [x,e+2.98,-1.0],'M-ACOUSTIC','softens the public arrival',{size:[2.45,.045,5.45],collision:'none'})),
    ];
  }

  function b01CorridorObjects(prefix,e,level,labels) {
    const doorXs=[-4.6,0,11.4],segments=[[-12.55,-5.25],[-3.95,-.65],[.65,10.75],[12.05,12.55]];
    const out=[
      fixture(`${prefix}/COR/RUNNER`,'quiet corridor runner','PF-WALL-RUN',[0,e+.014,4.02],
        'M-RUBBER','centres the public circulation route',{size:[24.7,.025,.62],collision:'none'}),
      fixture(`${prefix}/COR/NORTH-BAND`,'continuous oak corridor datum','PF-WALL-RUN',[0,e+1.12,4.915],
        'M-OAK-DARK','warm durable corridor identity',{size:[25.15,.18,.035],collision:'none'}),
      fixture(`${prefix}/COR/FLOOR`,'large floor identity','PF-ROOM-SIGN',[0,e+1.72,4.89],
        'M-SCREEN','orientation from the central landing',{yaw:PI,size:[1.5,.42,.04],text:`${level}层 · FLOOR ${level}`}),
      fixture(`${prefix}/COR/NOTICE-W`,'west teaching notice display','PF-SCREEN',[-8.25,e+1.62,4.89],
        'M-SCREEN','lectures, deadlines and room changes',{yaw:PI,size:[2.35,.86,.04],collision:'none'}),
      fixture(`${prefix}/COR/NOTICE-E`,'east teaching notice display','PF-SCREEN',[5.55,e+1.62,4.89],
        'M-SCREEN','student work and academic events',{yaw:PI,size:[2.35,.86,.04],collision:'none'}),
      fixture(`${prefix}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-6.5,e+2.75,4.0],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.5,.06,.30]}),
      fixture(`${prefix}/COR-L2`,'corridor light east','PF-CEILING-LIGHT',[6.5,e+2.75,4.0],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.5,.06,.30]}),
    ];
    segments.forEach(([a,b],i)=>out.push(fixture(`${prefix}/COR/SOUTH-BAND${i+1}`,'blue room-side wayfinding band','PF-WALL-RUN',
      [(a+b)/2,e+1.12,3.075],'M-FABRIC-BLUE','links teaching-room entrances',{size:[b-a,.18,.035],collision:'none'})));
    doorXs.forEach((x,i)=>out.push(fixture(`${prefix}/COR/ROOM-SIGN${i+1}`,'bilingual room entrance sign','PF-ROOM-SIGN',
      [x+.72,e+1.62,3.055],'M-SCREEN','room identification from the corridor',{yaw:0,size:[.72,.30,.04],text:labels[i]})));
    for(const [i,x] of [-9,-3,3,9].entries()) out.push(fixture(`${prefix}/COR/RAFT${i+1}`,'corridor acoustic raft','PF-WALL-RUN',
      [x,e+2.98,4.02],'M-ACOUSTIC','quiet speech-friendly circulation',{size:[4.9,.045,1.28],collision:'none'}));
    return out;
  }

  // ---------------------------------------------------------------- measured B01 room planning
  // These plan-specific composers replace the generic grids above.  Coordinates are derived from
  // clear routes first: 2.30 m beside every side-room door, 1.20 m through every centre room,
  // 0.90 m between desk columns, and a protected teaching zone in front of the first row.
  const floorAccents=['M-FABRIC-BLUE','M-OAK','M-LAB-BLUE','M-FABRIC-RED','M-OAK-DARK'];
  const floorCurtains=['M-FABRIC-BLUE','M-FABRIC-BLUE','M-FABRIC-BLUE','M-FABRIC-RED','M-FABRIC-BLUE'];

  function plannedWindowWall(id,e,b,curtain='M-FABRIC-BLUE',entrance=false) {
    const [x0,x1,z0]=b,cx=(x0+x1)/2,z=z0+.055,out=[];
    const panes=entrance?
      [{x:cx-2.45,w:1.12},{x:cx+2.45,w:1.12}]:
      [{x:cx-(x1-x0>8?2.04:1.42),w:x1-x0>8?3.62:2.55},
       {x:cx+(x1-x0>8?2.04:1.42),w:x1-x0>8?3.62:2.55}];
    for(const [i,p] of panes.entries()) out.push(
      fixture(`${id}/WINDOW/DAY${i+1}`,'recessed daylight reveal','PF-SCREEN',[p.x,e+1.68,z],
        'M-WALL-WHITE','soft exterior daylight',{size:[p.w,1.16,.025],collision:'none'}),
      fixture(`${id}/WINDOW/GLASS${i+1}`,'laminated classroom window','PF-WALL-RUN',[p.x,e+1.68,z+.026],
        'M-GLASS','safe campus-facing glazing',{size:[p.w,1.16,.025],collision:'none'}),
      fixture(`${id}/WINDOW/SILL${i+1}`,'oak window sill','PF-WALL-RUN',[p.x,e+1.065,z+.055],
        'M-OAK','durable display sill',{size:[p.w+.08,.09,.14],collision:'none'}),
    );
    if(entrance) out.push(
      fixture(`${id}/WINDOW/PORTAL-HEAD`,'entrance portal head','PF-WALL-RUN',[cx,e+2.48,z+.04],
        'M-OAK-DARK','frames the 3.20 m clear entrance',{size:[3.58,.15,.08],collision:'none'}),
      fixture(`${id}/WINDOW/PORTAL-L`,'entrance portal left jamb','PF-WALL-RUN',[cx-1.72,e+1.25,z+.04],
        'M-OAK-DARK','frames the 3.20 m clear entrance',{size:[.14,2.5,.08],collision:'none'}),
      fixture(`${id}/WINDOW/PORTAL-R`,'entrance portal right jamb','PF-WALL-RUN',[cx+1.72,e+1.25,z+.04],
        'M-OAK-DARK','frames the 3.20 m clear entrance',{size:[.14,2.5,.08],collision:'none'}),
      fixture(`${id}/WINDOW/CURTAIN-L`,'left acoustic entrance curtain','PF-WALL-RUN',[x0+.22,e+1.66,z+.065],
        curtain,'softens the glazed entrance edge',{size:[.28,1.32,.055],collision:'none'}),
      fixture(`${id}/WINDOW/CURTAIN-R`,'right acoustic entrance curtain','PF-WALL-RUN',[x1-.22,e+1.66,z+.065],
        curtain,'softens the glazed entrance edge',{size:[.28,1.32,.055],collision:'none'}),
    );
    else out.push(
      fixture(`${id}/WINDOW/HEAD`,'continuous blind pocket','PF-WALL-RUN',[cx,e+2.31,z+.055],
        'M-STEEL-DARK','roller blind and window head',{size:[x1-x0-.42,.08,.10],collision:'none'}),
      fixture(`${id}/WINDOW/CURTAIN-L`,'left acoustic curtain','PF-WALL-RUN',[x0+.28,e+1.68,z+.065],
        curtain,'daylight control and acoustic absorption',{size:[.30,1.36,.055],collision:'none'}),
      fixture(`${id}/WINDOW/CURTAIN-R`,'right acoustic curtain','PF-WALL-RUN',[x1-.28,e+1.68,z+.065],
        curtain,'daylight control and acoustic absorption',{size:[.30,1.36,.055],collision:'none'}),
    );
    return out;
  }

  function plannedCeiling(id,e,b,xs,temperature=3900) {
    const cz=-1.35,out=[];
    xs.forEach((x,i)=>out.push(
      fixture(`${id}/CEILING/RAFT${i+1}`,'aligned acoustic ceiling raft','PF-WALL-RUN',[x,e+2.96,cz],
        'M-ACOUSTIC','absorbs teaching speech without floating below the ceiling',{size:[1.45,.045,4.65],collision:'none'}),
      fixture(`${id}/CEILING/LIGHT${i+1}`,'linear classroom light','PF-CEILING-LIGHT',[x,e+2.76,cz],
        'M-WALL-WHITE','even light over the occupied zone',{temperatureK:temperature,size:[1.20,.06,.28]}),
    ));
    return out;
  }

  function plannedDoorSideRoute(id,e,b,accessible=false) {
    const x=b[1]-1.15,out=[fixture(`${id}/ROUTE`,'2.30 m door-side circulation route','PF-WALL-RUN',
      [x,e+.012,-1.0],'M-VINYL','clear route from corridor door to rear of room',{size:[1.12,.02,7.45],collision:'none',clearWidth:2.30})];
    if(accessible)out.push(fixture(`${id}/WHEELCHAIR-BAY`,'wheelchair teaching bay marker','PF-WALL-RUN',
      [x,e+.016,-.15],'M-FABRIC-BLUE','1.50 m turning and companion-seat bay',{size:[1.35,.022,1.50],collision:'none',turningDiameter:1.50}));
    return out;
  }

  function plannedTeachingWall(id,e,b,{board='M-BOARD-GREEN',label='',computer=false}={}) {
    const [x0,x1,,z1]=b,cx=(x0+x1)/2;
    return [
      fixture(`${id}/TEACHING/BACK`,'acoustic teaching-wall field','PF-WALL-RUN',[cx,e+1.66,z1-.025],
        'M-ACOUSTIC','absorptive backing aligned clear of the door',{size:[5.55,1.82,.035],collision:'none'}),
      fixture(`${id}/TEACHING/BOARD`,computer?'digital teaching whiteboard':'framed teaching board',
        computer?'PF-WHITEBOARD':'PF-CHALKBOARD',[cx,e+1.63,z1-.085],board,'primary teaching surface',
        {yaw:PI,size:[5.15,1.30,.08],text:label||'大学课堂'}),
      fixture(`${id}/TEACHING/DATUM`,'oak teaching-wall head datum','PF-WALL-RUN',[cx,e+2.65,z1-.055],
        'M-OAK-DARK','human-scale teaching-wall head',{size:[5.62,.10,.055],collision:'none'}),
      fixture(`${id}/TEACHING/PODIUM`,'mobile lecturer podium','PF-TEACHER-PODIUM',[cx,e,z1-1.10],
        'M-WOOD-DESK','lecturer station with 1.20 m student clearance',{yaw:PI,size:[1.18,1.12,.70]}),
      fixture(`${id}/TEACHING/CHAIR`,'lecturer chair','PF-CHAIR',[cx+1.18,e,z1-.64],
        'M-FABRIC-BLUE','lecturer seating outside the podium footprint',{yaw:0}),
      fixture(`${id}/TEACHING/SCREEN`,'side presentation monitor','PF-SCREEN',[x0+.055,e+1.58,z1-1.45],
        'M-SCREEN','presentation display clear of the teaching board',{yaw:PI/2,size:[1.35,.78,.04],collision:'none'}),
      fixture(`${id}/TEACHING/PROJECTOR`,'ceiling projector','PF-PROJECTOR',[cx,e+2.72,-.55],
        'M-STEEL-DARK','projected teaching content',{yaw:0}),
      fixture(`${id}/TEACHING/CLOCK`,'classroom clock','PF-CLOCK',[cx+2.92,e+2.38,z1-.10],
        'M-WALL-WHITE','class timing',{yaw:PI}),
      fixture(`${id}/TEACHING/BIN`,'teaching-room waste bin','PF-BIN',[x0+.44,e,z1-.52],
        'M-STEEL','waste and recycling'),
    ];
  }

  function plannedStandardClassroom(id,e,b,label,curtain,accessible=false) {
    const x0=b[0],xs=[x0+1.60,x0+3.90,x0+6.20],zs=[-3.28,-1.68,-.08];
    // The west modules also connect to the protected stair. Omitting the middle-row table beside
    // that door creates a genuine 1.15 m landing instead of asking students to squeeze past a desk.
    const positions=[];
    for(const z of zs)for(const x of xs)if(!(x0<0&&x===xs[0]&&z===zs[1]))positions.push([x,z]);
    const studentSeats=positions.length*2,out=[
      ...plannedWindowWall(id,e,b,curtain),
      ...plannedDoorSideRoute(id,e,b,accessible),
      ...plannedTeachingWall(id,e,b,{label}),
      ...plannedCeiling(id,e,b,xs,3900),
    ];
    let n=0;
    for(const [x,z] of positions){
      const k=pad(++n);
      out.push(
        fixture(`${id}/TABLE${k}`,'two-person student table','PF-MEETING-TABLE',[x,e,z],
          'M-WOOD-DESK',`${studentSeats}-seat classroom table layout`,{size:[1.40,.76,.64],yaw:0,columnAisle:.90,rowPitch:1.60}),
        fixture(`${id}/CHAIR${k}A`,'student chair A','PF-CHAIR',[x-.36,e,z-.58],
          'M-FABRIC-BLUE','north-facing student seat',{yaw:PI,facing:'north'}),
        fixture(`${id}/CHAIR${k}B`,'student chair B','PF-CHAIR',[x+.36,e,z-.58],
          'M-FABRIC-BLUE','north-facing student seat',{yaw:PI,facing:'north'}),
      );
    }
    return out;
  }

  function plannedLectureRoom(id,e,b,curtain) {
    const x0=b[0],cx=(b[0]+b[1])/2,z1=b[3];
    const relX=[.84,1.46,2.08,2.70,4.48,5.10,5.72,6.34],zs=[-3.20,-1.65,-.10],out=[
      ...plannedWindowWall(id,e,b,curtain),
      ...plannedDoorSideRoute(id,e,b,true),
      fixture(`${id}/CENTRE-AISLE`,'1.20 m lecture-room centre aisle','PF-WALL-RUN',
        [x0+3.59,e+.012,-1.65],'M-VINYL','accessible aisle between seat blocks',{size:[1.20,.02,5.35],collision:'none',clearWidth:1.20}),
      fixture(`${id}/TEACHING/BACK`,'lecture-room acoustic teaching wall','PF-WALL-RUN',[cx,e+1.66,z1-.025],
        'M-ACOUSTIC','absorptive lecture backdrop',{size:[5.55,1.82,.035],collision:'none'}),
      fixture(`${id}/TEACHING/DISPLAY`,'large lecture display','PF-SCREEN',[cx,e+1.66,z1-.085],
        'M-SCREEN','primary lecture presentation',{yaw:PI,size:[3.35,1.62,.06],collision:'none'}),
      fixture(`${id}/TEACHING/BOARD`,'lecture side whiteboard','PF-WHITEBOARD',[cx-2.65,e+1.60,z1-.085],
        'M-WHITEBOARD','supplementary lecture notes',{yaw:PI,size:[1.65,1.15,.06]}),
      fixture(`${id}/TEACHING/PODIUM`,'lecture podium','PF-TEACHER-PODIUM',[cx,e,z1-1.10],
        'M-OAK-DARK','lecturer station',{yaw:PI,size:[1.18,1.12,.70]}),
      fixture(`${id}/TEACHING/CHAIR`,'lecturer chair','PF-CHAIR',[cx+1.16,e,z1-.64],
        'M-FABRIC-BLUE','lecturer seating',{yaw:0}),
      fixture(`${id}/TEACHING/PROJECTOR`,'lecture projector','PF-PROJECTOR',[cx,e+2.72,-.60],
        'M-STEEL-DARK','presentation projection'),
      ...plannedCeiling(id,e,b,[cx-2.2,cx,cx+2.2],3900),
    ];
    // Two seats are deliberately omitted at the west stair landing; the remaining 22-seat room
    // retains both three-row blocks and a 1.20 m centre aisle without compromising the second exit.
    const positions=[];
    for(const z of zs)for(const dx of relX)if(!(dx===relX[0]&&z<=zs[1]))positions.push([dx,z]);
    let n=0;
    for(const [dx,z] of positions)out.push(fixture(`${id}/SEAT${pad(++n)}`,'fixed lecture seat',
      'PF-LECTURE-SEAT',[x0+dx,e,z],'M-FABRIC-BLUE','22-seat lecture layout',{yaw:PI,facing:'north',blockAisle:1.20,rowPitch:1.55}));
    return out;
  }

  function plannedComputerRoom(id,e,b,curtain,language=false) {
    const x0=b[0],cx=(b[0]+b[1])/2,z1=b[3],xs=[x0+1.45,x0+3.75,x0+6.05],zs=[-3.20,-1.65,-.10];
    const prefab=language?'PF-LANGUAGE-DESK':'PF-COMPUTER-DESK',out=[
      ...plannedWindowWall(id,e,b,curtain),
      ...plannedDoorSideRoute(id,e,b,false),
      ...plannedTeachingWall(id,e,b,{board:'M-WHITEBOARD',label:language?'语言实验':'计算机教学',computer:true}),
      fixture(`${id}/TEACHING/INSTRUCTOR`,'instructor workstation','PF-COMPUTER-DESK',[cx,e,z1-1.08],
        'M-WOOD-DESK','instructor computer outside the student grid',{yaw:PI}),
      fixture(`${id}/NETWORK`,'network and charging cabinet','PF-FILE-CABINET',[x0+.45,e,z1-1.18],
        'M-STEEL-DARK','locked network equipment',{yaw:PI/2,size:[.78,1.35,.42]}),
      ...plannedCeiling(id,e,b,xs,4200),
    ];
    // The computer instructor station replaces the mobile podium/lecturer chair from the shared
    // teaching-wall set so the front zone contains one workstation, not three overlapping pieces.
    const remove=new Set([`${id}/TEACHING/PODIUM`,`${id}/TEACHING/CHAIR`]);
    const compact=out.filter(o=>!remove.has(o.id));
    // The west language laboratory has a second protected-stair door. Its two landing-adjacent
    // stations are omitted, leaving seven usable stations and a clear emergency approach.
    const positions=[];
    for(const z of zs)for(const x of xs)if(!(language&&x===xs[0]&&z<=zs[1]))positions.push([x,z]);
    let n=0;
    for(const [x,z] of positions)compact.push(fixture(`${id}/WS${pad(++n)}`,language?'language workstation':'computer workstation',
      prefab,[x,e,z],'M-WOOD-DESK',`${positions.length}-station teaching lab`,{yaw:0,facing:'north',columnAisle:1.10,rowPitch:1.55}));
    xs.forEach((x,i)=>compact.push(fixture(`${id}/CABLE${i+1}`,'flush floor cable raceway','PF-WALL-RUN',
      [x,e+.012,-1.65],'M-STEEL-DARK','safe managed power and data route',{size:[.07,.018,4.75],collision:'none'})));
    return compact;
  }

  function plannedSeminarRoom(id,e,b,curtain) {
    const [x0,x1,,z1]=b,cx=(x0+x1)/2,cz=-1.0,out=[
      ...plannedWindowWall(id,e,b,curtain),
      ...plannedDoorSideRoute(id,e,b,false),
      fixture(`${id}/TABLE`,'seminar table','PF-MEETING-TABLE',[cx,e,cz],
        'M-OAK','nine-seat seminar work surface',{size:[4.0,.76,1.10]}),
      fixture(`${id}/BOARD`,'seminar whiteboard','PF-WHITEBOARD',[cx,e+1.58,z1-.085],
        'M-WHITEBOARD','shared seminar notes',{yaw:PI,size:[4.1,1.18,.06]}),
      fixture(`${id}/SCREEN`,'video seminar display','PF-SCREEN',[x0+.055,e+1.56,.75],
        'M-SCREEN','remote participation',{yaw:PI/2,size:[1.35,.80,.04],collision:'none'}),
      fixture(`${id}/BOOK`,'seminar reference shelf','PF-BOOKCASE',[x0+.44,e,1.72],
        'M-OAK-DARK','course references',{yaw:PI/2,size:[.78,1.72,.36]}),
      ...plannedCeiling(id,e,b,[cx-2.2,cx,cx+2.2],3500),
    ];
    let n=0;
    for(const z of [cz-1.0,cz+1.0])for(const x of [cx-1.35,cx-.45,cx+.45,cx+1.35])out.push(
      fixture(`${id}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',
        {yaw:z<cz?PI:0,facing:z<cz?'north':'south'}));
    out.push(fixture(`${id}/CHAIR${pad(++n)}`,'seminar end chair','PF-CHAIR',[cx-2.45,e,cz],
      'M-FABRIC-BLUE','seminar seat clear of door-side route',{yaw:-PI/2,facing:'east'}));
    return out;
  }

  function plannedTutorialRoom(id,e,b,curtain) {
    const cx=(b[0]+b[1])/2,out=[
      ...plannedWindowWall(id,e,b,curtain),
      fixture(`${id}/RUNNER`,'1.20 m consultation-room route','PF-WALL-RUN',[cx,e+.012,-1.0],
        'M-VINYL','clear centre route from door',{size:[1.20,.02,7.45],collision:'none',clearWidth:1.20}),
      fixture(`${id}/DESK-L`,'west tutorial workstation','PF-OFFICE-DESK',[-2.45,e,-.60],
        'M-OAK','one-to-one staff workstation',{yaw:PI/2}),
      fixture(`${id}/DESK-R`,'east tutorial workstation','PF-OFFICE-DESK',[2.45,e,-.60],
        'M-OAK','one-to-one staff workstation',{yaw:-PI/2}),
      fixture(`${id}/VISITOR-L`,'west visitor chair','PF-CHAIR',[-1.35,e,-.60],
        'M-FABRIC-BLUE','student consultation seat',{yaw:PI/2,facing:'west'}),
      fixture(`${id}/VISITOR-R`,'east visitor chair','PF-CHAIR',[1.35,e,-.60],
        'M-FABRIC-BLUE','student consultation seat',{yaw:-PI/2,facing:'east'}),
      fixture(`${id}/WAIT`,'tutorial waiting seats','PF-WAIT-CHAIRS',[-2.75,e,-3.30],
        'M-FABRIC-BLUE','waiting clear of centre route',{yaw:PI/2,size:[1.55,.84,.62]}),
      fixture(`${id}/BOARD`,'tutorial whiteboard','PF-WHITEBOARD',[-1.90,e+1.55,b[3]-.08],
        'M-WHITEBOARD','worked examples and appointments',{yaw:PI,size:[2.05,1.0,.06]}),
      fixture(`${id}/DISPLAY`,'tutorial booking display','PF-SCREEN',[1.90,e+1.55,b[3]-.08],
        'M-SCREEN','booking and remote tutorial status',{yaw:PI,size:[2.05,1.0,.05],collision:'none'}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3500),
    ];
    return out;
  }

  function plannedStudyRoom(id,e,b,curtain) {
    const cx=(b[0]+b[1])/2,zs=[-3.30,-1.40,.50],out=[
      ...plannedWindowWall(id,e,b,curtain),
      fixture(`${id}/RUNNER`,'1.20 m group-study route','PF-WALL-RUN',[cx,e+.012,-1.0],
        'M-VINYL','clear centre route through study room',{size:[1.20,.02,7.45],collision:'none',clearWidth:1.20}),
      fixture(`${id}/BOARD-W`,'west collaboration display','PF-WHITEBOARD',[b[0]+.055,e+1.55,1.72],
        'M-WHITEBOARD','shared group notes',{yaw:PI/2,size:[1.35,.92,.05]}),
      fixture(`${id}/BOARD-E`,'east collaboration display','PF-SCREEN',[b[1]-.055,e+1.55,1.72],
        'M-SCREEN','shared digital work',{yaw:-PI/2,size:[1.35,.92,.05],collision:'none'}),
      fixture(`${id}/BOOK`,'group-study reference shelf','PF-BOOKCASE',[b[0]+.48,e,2.42],
        'M-OAK-DARK','shared references',{size:[.82,1.72,.36]}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3600),
    ];
    let n=0;
    for(const z of zs)for(const [x,yaw,face] of [[-2.55,PI/2,'west'],[2.55,-PI/2,'east']])out.push(
      fixture(`${id}/DESK${pad(++n)}`,'perimeter study workstation','PF-DORM-DESK',[x,e,z],
        'M-WOOD-DESK','six-station group study with open centre',{yaw,facing:face}));
    return out;
  }

  function plannedPrepRoom(id,e,b,curtain) {
    const cx=(b[0]+b[1])/2,out=[
      ...plannedWindowWall(id,e,b,curtain),
      fixture(`${id}/RUNNER`,'1.20 m preparation-room route','PF-WALL-RUN',[cx,e+.012,-1.0],
        'M-VINYL','clear materials route from corridor',{size:[1.20,.02,7.45],collision:'none',clearWidth:1.20}),
      fixture(`${id}/TABLE-L`,'west preparation table','PF-PREP-TABLE',[-2.35,e,-.70],
        'M-OAK','teaching material preparation',{yaw:PI/2,size:[1.8,.84,.75]}),
      fixture(`${id}/TABLE-R`,'east preparation table','PF-PREP-TABLE',[2.35,e,-.70],
        'M-OAK','teaching material preparation',{yaw:-PI/2,size:[1.8,.84,.75]}),
      ...[[-2.72,PI/2],[2.72,-PI/2]].flatMap(([x,yaw],side)=>[-3.10,1.55].map((z,i)=>
        fixture(`${id}/SHELF-${side+1}-${i+1}`,'labelled preparation shelf','PF-SHELF',[x,e,z],
          'M-STEEL','course materials and equipment',{yaw,size:[.90,1.80,.42]}))),
      fixture(`${id}/BOARD`,'preparation schedule','PF-WHITEBOARD',[-1.90,e+1.55,b[3]-.08],
        'M-WHITEBOARD','room bookings and preparation status',{yaw:PI,size:[2.05,1.0,.06]}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3700),
    ];
    return out;
  }

  function plannedOfficeRoom(id,e,b,curtain) {
    const cx=(b[0]+b[1])/2,out=[
      ...plannedWindowWall(id,e,b,curtain),
      fixture(`${id}/RUNNER`,'1.20 m faculty-office route','PF-WALL-RUN',[cx,e+.012,-1.0],
        'M-VINYL','clear centre route to every desk',{size:[1.20,.02,7.45],collision:'none',clearWidth:1.20}),
      fixture(`${id}/FILES-L`,'west faculty file cabinet','PF-FILE-CABINET',[-2.65,e,2.38],
        'M-STEEL','secure faculty records',{size:[.80,1.35,.44]}),
      fixture(`${id}/FILES-R`,'east faculty file cabinet','PF-FILE-CABINET',[2.65,e,2.38],
        'M-STEEL','secure faculty records',{size:[.80,1.35,.44]}),
      fixture(`${id}/DISPLAY-L`,'faculty notice display','PF-SCREEN',[-1.90,e+1.55,b[3]-.08],
        'M-SCREEN','office hours and department notices',{yaw:PI,size:[2.05,.90,.05],collision:'none'}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3500),
    ];
    let n=0;
    for(const z of [-2.40,.50])for(const [x,yaw,visitorX,visitorYaw] of [
      [-2.40,PI/2,-1.30,PI/2],[2.40,-PI/2,1.30,-PI/2],
    ])out.push(
      fixture(`${id}/DESK${pad(++n)}`,'faculty workstation','PF-OFFICE-DESK',[x,e,z],
        'M-OAK','faculty workstation facing perimeter',{yaw}),
      fixture(`${id}/VISITOR${pad(n)}`,'faculty visitor chair','PF-CHAIR',[visitorX,e,z],
        'M-FABRIC-BLUE','student consultation chair',{yaw:visitorYaw}),
    );
    return out;
  }

  function plannedLobby(id,e,b,curtain) {
    return [
      fixture(`${id}/ENTRY-MAT`,'recessed entrance mat','PF-WALL-RUN',[0,e+.014,-4.52],
        'M-RUBBER','weather-protected entrance',{size:[2.95,.025,.78],collision:'none'}),
      fixture(`${id}/MAIN-ROUTE`,'1.20 m uninterrupted lobby route','PF-WALL-RUN',[0,e+.012,-1.0],
        'M-TERRAZZO','direct route between exterior and corridor doors',{size:[1.20,.02,7.75],collision:'none',clearWidth:1.20}),
      fixture(`${id}/RECEPTION`,'side-mounted accessible reception','PF-SERVICE-COUNTER',[2.55,e,0],
        'M-OAK','information without blocking the main route',{yaw:PI/2,size:[2.05,1.05,.72]}),
      fixture(`${id}/WAIT`,'side-mounted waiting seats','PF-WAIT-CHAIRS',[-2.72,e,-.40],
        'M-FABRIC-BLUE','waiting outside both door approaches',{yaw:PI/2,size:[1.55,.84,.62]}),
      fixture(`${id}/DIR`,'five-floor directory','PF-DIRECTORY',[-2.72,e,-2.75],
        'M-SCREEN','accessible floor and room wayfinding',{yaw:PI/2,size:[.82,1.50,.10],text:'第一教学楼 · 1—5层'}),
      fixture(`${id}/KIOSK`,'classroom lookup kiosk','PF-SELF-CHECK',[2.65,e,-2.60],
        'M-SCREEN','room lookup and timetable',{yaw:-PI/2}),
      fixture(`${id}/NEWS`,'teaching-block notice screen','PF-SCREEN',[b[1]-.055,e+1.55,-3.45],
        'M-SCREEN','room changes and university notices',{yaw:-PI/2,size:[1.40,.84,.04],collision:'none'}),
      fixture(`${id}/FEATURE-L`,'left lobby identity panel','PF-WALL-RUN',[-1.86,e+1.52,b[3]-.035],
        'M-OAK-DARK','frames the north corridor door',{size:[2.02,2.50,.035],collision:'none'}),
      fixture(`${id}/FEATURE-R`,'right lobby identity panel','PF-WALL-RUN',[1.86,e+1.52,b[3]-.035],
        'M-OAK-DARK','frames the north corridor door',{size:[2.02,2.50,.035],collision:'none'}),
      fixture(`${id}/WELCOME-L`,'university welcome sign','PF-ROOM-SIGN',[-1.86,e+1.76,b[3]-.07],
        'M-SCREEN','teaching-block identity',{yaw:PI,size:[1.55,.34,.04],text:'北京文华大学'}),
      fixture(`${id}/WELCOME-R`,'building welcome sign','PF-ROOM-SIGN',[1.86,e+1.76,b[3]-.07],
        'M-SCREEN','teaching-block identity',{yaw:PI,size:[1.55,.34,.04],text:'第一教学楼'}),
      fixture(`${id}/PLANT`,'lobby corner plant','PF-PLANT',[-2.65,e,2.30],
        'M-PLANT','softens the waiting side'),
      ...plannedWindowWall(id,e,b,curtain,true),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3400),
    ];
  }

  function plannedCorridor(prefix,e,level,labels,accent) {
    const doorXs=[-4.6,0,11.4],out=[
      fixture(`${prefix}/COR/RUNNER`,'1.20 m corridor guidance strip','PF-WALL-RUN',[0,e+.014,4.02],
        'M-RUBBER','continuous accessible guidance route',{size:[24.75,.025,.62],collision:'none',clearWidth:1.85}),
      fixture(`${prefix}/COR/DATUM-S`,'south corridor head datum','PF-WALL-RUN',[0,e+2.45,3.075],
        accent,'floor-specific identity above door heads',{size:[25.15,.12,.035],collision:'none'}),
      fixture(`${prefix}/COR/DATUM-N`,'north corridor head datum','PF-WALL-RUN',[0,e+2.45,4.915],
        'M-OAK-DARK','durable corridor head datum',{size:[25.15,.12,.035],collision:'none'}),
      fixture(`${prefix}/COR/FLOOR`,'large floor identity','PF-ROOM-SIGN',[0,e+1.70,4.89],
        'M-SCREEN','floor orientation',{yaw:PI,size:[1.45,.38,.04],text:`${level}层 · FLOOR ${level}`}),
      fixture(`${prefix}/COR/NOTICE`,'floor teaching notice display','PF-SCREEN',[-8.15,e+1.56,4.89],
        'M-SCREEN','room changes and teaching notices',{yaw:PI,size:[2.10,.78,.04],collision:'none'}),
      fixture(`${prefix}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-6.5,e+2.76,4.02],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.45,.06,.28]}),
      fixture(`${prefix}/COR-L2`,'corridor light east','PF-CEILING-LIGHT',[6.5,e+2.76,4.02],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.45,.06,.28]}),
    ];
    doorXs.forEach((x,i)=>out.push(fixture(`${prefix}/COR/SIGN${i+1}`,'room entrance sign','PF-ROOM-SIGN',
      [x+.70,e+1.60,3.055],'M-SCREEN','room identification',{yaw:0,size:[.78,.28,.04],text:labels[i]})));
    for(const [i,x] of [-9,-3,3,9].entries())out.push(fixture(`${prefix}/COR/RAFT${i+1}`,'corridor acoustic raft','PF-WALL-RUN',
      [x,e+2.96,4.02],'M-ACOUSTIC','speech absorption in circulation',{size:[4.80,.045,1.28],collision:'none'}));
    return out;
  }

  function validatePlannedB01(building) {
    const floorStanding=new Set(['PF-STUDENT-DESK-2','PF-LECTURE-SEAT','PF-TEACHER-PODIUM','PF-CHAIR',
      'PF-COMPUTER-DESK','PF-LANGUAGE-DESK','PF-OFFICE-DESK','PF-DORM-DESK','PF-MEETING-TABLE',
      'PF-SERVICE-COUNTER','PF-WAIT-CHAIRS','PF-DIRECTORY','PF-SELF-CHECK','PF-BOOKCASE',
      'PF-FILE-CABINET','PF-PREP-TABLE','PF-SHELF','PF-BIN','PF-PLANT','PF-STAIR','PF-LIFT',
      'PF-TOILET','PF-BASIN','PF-CLEANING','PF-WATER']);
    const depthEnvelope={'PF-STUDENT-DESK-2':1.25,'PF-COMPUTER-DESK':1.35,'PF-LANGUAGE-DESK':1.35,
      'PF-OFFICE-DESK':1.45,'PF-DORM-DESK':1.05};
    const rect=f=>{
      let w=f.size[0],d=Math.max(f.size[2],depthEnvelope[f.prefab]||0);
      const quarter=((Math.round((f.yaw||0)/(PI/2))%2)+2)%2;if(quarter)[w,d]=[d,w];
      return {x0:f.at[0]-w/2,x1:f.at[0]+w/2,z0:f.at[2]-d/2,z1:f.at[2]+d/2,id:f.id};
    };
    const hit=(a,b,eps=.001)=>a.x1>b.x0+eps&&a.x0<b.x1-eps&&a.z1>b.z0+eps&&a.z0<b.z1-eps;
    const errors=[];let checked=0,overlaps=0,doorBlocks=0,routeBlocks=0;
    for(const f of building.floorsPlan)for(const room of f.rooms){
      const objects=(room.contents||[]).filter(o=>floorStanding.has(o.prefab)),rs=objects.map(rect);checked+=rs.length;
      for(const r of rs)if(r.x0<room.bounds[0]-.01||r.x1>room.bounds[1]+.01||r.z0<room.bounds[2]-.01||r.z1>room.bounds[3]+.01)
        errors.push(`${r.id}: floor fixture outside room`);
      for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++)if(hit(rs[i],rs[j])){
        overlaps++;errors.push(`${room.id}: unintended overlap ${rs[i].id} / ${rs[j].id}`);
      }
      for(const d of room.doors){
        const vertical=d.side==='east'||d.side==='west',half=d.width/2+.60,depth=1.35;
        const zone=vertical?{x0:d.at[0]-depth,x1:d.at[0]+depth,z0:d.at[2]-half,z1:d.at[2]+half}:
          {x0:d.at[0]-half,x1:d.at[0]+half,z0:d.at[2]-depth,z1:d.at[2]+depth};
        for(const r of rs)if(hit(r,zone)){doorBlocks++;errors.push(`${r.id}: obstructs ${d.id} approach`);}
      }
      const key=room.id.split('/').pop();
      if(['WEST','CENTRE','EAST'].includes(key)){
        const route=key==='CENTRE'?{x0:-.60,x1:.60,z0:room.bounds[2],z1:room.bounds[3]}:
          {x0:room.bounds[1]-2.30,x1:room.bounds[1],z0:room.bounds[2],z1:room.bounds[3]};
        for(const r of rs)if(hit(r,route)){routeBlocks++;errors.push(`${r.id}: obstructs authored main route`);}
      }
      if(room.programme==='lobby'){
        const turn={x0:-.75,x1:.75,z0:-2.95,z1:-1.45};
        for(const r of rs)if(hit(r,turn)){routeBlocks++;errors.push(`${r.id}: obstructs 1.50 m lobby turning circle`);}
      }
    }
    if(errors.length)throw new Error(`B01 measured-plan validation failed (${errors.length}):\n${errors.slice(0,24).join('\n')}`);
    return {floorStandingFixturesChecked:checked,containmentFailures:0,unintendedFootprintOverlaps:overlaps,
      doorApproachObstructions:doorBlocks,mainRouteObstructions:routeBlocks};
  }

  const levels=[
    {level:1,left:'lecture',middle:'lobby',right:'standard',labels:['101阶梯教室','门厅与导览','102无障碍教室']},
    {level:2,left:'standard',middle:'tutorial',right:'standard',labels:['201教室','教师答疑室','202教室']},
    {level:3,left:'language',middle:'study',right:'computer',labels:['301语言实验室','小组学习区','302计算机教室']},
    {level:4,left:'standard',middle:'prep',right:'standard',labels:['401教室','教学准备室','402教室']},
    {level:5,left:'seminar',middle:'office',right:'computer',labels:['501研讨室','教师办公室','502计算机教室']},
  ];
  for(const spec of levels) {
    const e=(spec.level-1)*3.3,prefix=`B01/F${spec.level}`,rooms=[],curtain=floorCurtains[spec.level-1];
    [[west,spec.left,'WEST'],[centre,spec.middle,'CENTRE'],[east,spec.right,'EAST']].forEach(([b,type,key],i)=>{
      const id=`${prefix}/${key}`,label=spec.labels[i];
      let contents=[];
      if(type==='standard') contents=plannedStandardClassroom(id,e,b,label,curtain,spec.level===1&&key==='EAST');
      else if(type==='lecture') contents=plannedLectureRoom(id,e,b,curtain);
      else if(type==='language') contents=plannedComputerRoom(id,e,b,curtain,true);
      else if(type==='computer') contents=plannedComputerRoom(id,e,b,curtain,false);
      else if(type==='seminar') contents=plannedSeminarRoom(id,e,b,curtain);
      else if(type==='office') contents=plannedOfficeRoom(id,e,b,curtain);
      else if(type==='prep') contents=plannedPrepRoom(id,e,b,curtain);
      else if(type==='tutorial') contents=plannedTutorialRoom(id,e,b,curtain);
      else if(type==='study') contents=plannedStudyRoom(id,e,b,curtain);
      else if(type==='lobby') contents=plannedLobby(id,e,b,curtain);
      const moduleDoorX=key==='WEST'?-4.6:key==='EAST'?11.4:0;
      const doors=[doorway(`${id}/D1`,'north',[moduleDoorX,e,b[3]],1.05,`${prefix}/CORRIDOR`)];
      if(spec.level===1&&key==='CENTRE') doors.push(doorway(`${id}/D-EXT`,'south',[0,e,-5.5],3.2,'campus',{portal:true}));
      rooms.push(room(id,label,b,type==='lobby'?'public':['office','prep','tutorial'].includes(type)?'office':'classroom',doors,contents,{
        programme:type,legacySceneAlias:spec.level===2&&key==='WEST'?'classroom':undefined,
        planning:type==='standard'?{studentSeats:key==='WEST'?16:18,crossAisles:.90,doorSideRoute:2.30,protectedStairLanding:key==='WEST'?1.15:undefined,teacherClearance:1.31,rearClearance:.90,wheelchairBays:spec.level===1&&key==='EAST'?2:0}:
          type==='lecture'?{studentSeats:22,centreAisle:1.20,doorSideRoute:2.57,protectedStairLanding:1.15,teacherClearance:1.23}:
          ['computer','language'].includes(type)?{studentStations:type==='language'?7:9,columnAisles:1.10,doorSideRoute:2.55,protectedStairLanding:type==='language'?1.15:undefined,teacherClearance:1.30}:
          type==='lobby'?{mainRoute:1.20,turningCircle:{centre:[0,-2.20],diameter:1.50}}:
          key==='CENTRE'?{mainRoute:1.20}:type==='seminar'?{seats:9,doorSideRoute:2.60}:undefined,
      }));
    });
    rooms.push(
      room(`${prefix}/STAIR-W`,'西安全楼梯',[-15.5,-12.8,-5,.8],'service',[],[
        fixture(`${prefix}/STAIR-W/FIX`,'west protected stair','PF-STAIR',[-14.825,e,-2.1],'M-TERRAZZO','1.20 m stair flight with a clear east landing',{size:[1.25,3.05,4.2]})]),
      room(`${prefix}/WC-W`,'西侧卫生间',[-15.5,-12.8,1,5],'service',[],[
        fixture(`${prefix}/WC-W/T`,'toilet','PF-TOILET',[-14.9,e,1.7],'M-CERAMIC','sanitary fixture'),
        fixture(`${prefix}/WC-W/B`,'washbasin','PF-BASIN',[-14.9,e,3.0],'M-CERAMIC','hand washing'),
        fixture(`${prefix}/WC-W/C`,'cleaning cupboard','PF-CLEANING',[-14.9,e,4.35],'M-STEEL','janitorial storage'),
      ]),
      room(`${prefix}/STAIR-E`,'东安全楼梯',[12.8,15.5,-5,.8],'service',[],[
        fixture(`${prefix}/STAIR-E/FIX`,'east protected stair','PF-STAIR',[14.825,e,-2.1],'M-TERRAZZO','1.20 m stair flight with a clear west landing',{size:[1.25,3.05,4.2]})]),
      room(`${prefix}/LIFT-E`,'电梯与无障碍卫生间',[12.8,15.5,1,5],'service',[],[
        fixture(`${prefix}/LIFT-E/LIFT`,'accessible lift','PF-LIFT',[13.65,e,2.0],'M-STEEL','accessible vertical circulation',{size:[1.45,2.45,1.55],levels:[1,2,3,4,5]}),
        fixture(`${prefix}/LIFT-E/T`,'accessible toilet','PF-TOILET',[14.75,e,4.25],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
        fixture(`${prefix}/LIFT-E/B`,'accessible basin','PF-BASIN',[14.75,e,3.15],'M-CERAMIC','accessible hand washing'),
      ]),
    );
    const shared=[
      ...safetySet(prefix,e,[-12.55,4.3],[0,3.35],spec.level,spec.level===1),
      fixture(`${prefix}/WATER`,'north-wall drinking-water station','PF-WATER',[12.4,e,5.25],'M-STEEL','student hydration in a recess beyond the 1.85 m corridor'),
      ...plannedCorridor(prefix,e,spec.level,spec.labels,floorAccents[spec.level-1]),
    ];
    floors.push(floor(spec.level,e,3.3,rooms,[
      {id:`${prefix}/CORRIDOR`,bounds:[-12.8,12.8,3.1,4.95],clearWidth:1.85,surface:'M-TERRAZZO'},
      ...(spec.level===1?[{id:`${prefix}/ENTRY`,bounds:[-1.65,1.65,-5.5,3.1],clearWidth:3.3,surface:'M-TERRAZZO'}]:[]),
    ],shared,{occupancy:spec.level===5?45:spec.level===1?72:60}));
  }
  const building={
    id:'B01',label:'第一教学楼',status:'partial-existing',centreCampus:[-3,57.5],localBounds:[-16,16,-5.5,5.5],
    exteriorFootprint:{x0:-19,x1:13,z0:52,z1:63},floors:5,floorHeight:3.3,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-3 + localX',worldZ:'57.5 + localZ'},
    portals:[{id:'B01/PUBLIC',campusAt:[-3,52],campusReturn:[-3,47.2,0],localSpawn:[0,0,-4.25,0],placeKey:'campus_b01_f1'},
      {id:'B01/LEGACY-CLASSROOM',mapsTo:'B01/F2/WEST',placeKey:'classroom',preserve:true}],
    facadeAlignment:{southWindows:{x:[-14,-10,-6,-2,2,6,10,14],localZ:-5.5},northServiceWindows:'start 1.8 m from corner; pitch 3.2 m',levels:[2,3,4,5]},
    design:'A measured university teaching block planned from circulation outward: 1.20 m primary routes, 0.90 m cross-aisles, clear 1.15 m protected-stair landings, restrained 16–18-seat classrooms, a two-block 22-seat lecture room, seven- to nine-station computing rooms, aligned acoustic ceiling zones, operable curtain-and-window bands and distinct floor identities without freestanding corridor clutter.',
    planningMetrics:{
      primaryRouteMinimum:1.20,secondaryAisleMinimum:.90,corridorClearWidth:1.85,doorApproachDepth:1.35,
      sideRoomDoorRoute:2.30,protectedStairLanding:1.15,lobbyTurningCircle:{centre:[0,-2.20],diameter:1.50},standardClassroom:{studentSeats:{west:16,east:18},deskColumns:3,deskRows:3,columnAisles:.90,rowPitch:1.60,rearClearance:.90,teacherClearance:1.31},
      lectureRoom:{studentSeats:22,seatBlocks:2,centreAisle:1.20,doorSideRoute:2.57},
      computerRoom:{studentStations:9,columnAisles:1.10,doorSideRoute:2.55},
      languageRoom:{studentStations:7,columnAisles:1.10,doorSideRoute:2.55},
    },
    floorsPlan:floors,
  };
  building.planningMetrics.validation=validatePlannedB01(building);
  return building;
}

// B02 uses sparse, measured library furniture.  The helpers encode the clearance assumptions
// used by the focused geometry check: 0.90 m stack bodies, at least 1.20 m between stack faces,
// compact four-seat tables with chairs on the long sides, and ceiling elements only over occupied
// zones.  Signs are mounted on actual room faces; there are no freestanding decorative walls.
function b02Ceiling(prefix,e,points,temperatureK=3300,cloud=false) {
  const out=[];
  points.forEach(([x,z,w=1.2,d=.28],i)=>{
    if(cloud) out.push(fixture(`${prefix}/CLOUD${pad(i+1)}`,'shallow acoustic ceiling cloud',
      'PF-WALL-RUN',[x,e+2.92,z],'M-ACOUSTIC','quiet-zone acoustic absorption',
      {size:[Math.max(2.35,w+.35),.05,1.12],collision:'none'}));
    out.push(fixture(`${prefix}/LIGHT${pad(i+1)}`,'warm linear library light','PF-CEILING-LIGHT',
      [x,e+2.84,z],'M-WALL-WHITE','even library illumination',
      {size:[w,.055,d],temperatureK,lumens:cloud?2200:2600,collision:'none'}));
  });
  return out;
}

function b02WallSign(id,e,x,z,text,yaw=0,width=1.8) {
  return fixture(id,'wall-mounted bilingual library sign','PF-ROOM-SIGN',[x,e+1.62,z],
    'M-SCREEN','room identity and collection wayfinding',
    {text,yaw,size:[width,.30,.045],collision:'none'});
}

function b02StackRuns(prefix,e,xs,zs,label,material='M-OAK-DARK',size=[.9,2.05,2.8]) {
  const out=[]; let n=0;
  for(const z of zs) for(const x of xs) out.push(fixture(`${prefix}/STACK${pad(++n)}`,
    'human-scale double-sided library stack','PF-BOOKSTACK',[x,e,z],material,
    'classified collection with accessible parallel and cross aisles',
    {size,classification:`${label} ${n}`,minimumFaceAisle:1.2,minimumCrossAisle:1.2}));
  return out;
}

function b02ReadingTables(prefix,e,points,options={}) {
  const out=[];
  points.forEach(([x,z,yaw=0],i)=>out.push(fixture(`${prefix}/TABLE${pad(i+1)}`,
    'four-seat library reading table','PF-READING-TABLE',[x,e,z],'M-OAK',
    options.purpose||'quiet reading with chair pull-back clearance',
    {yaw,size:[2.1,.78,1.05],tableLamp:true,accessible:i===0,pullBackClearance:.6})));
  (options.benches||[]).forEach(([x,z,yaw=0],i)=>out.push(fixture(`${prefix}/BENCH${pad(i+1)}`,
    'upholstered window reading bench','PF-BENCH',[x,e,z],'M-FABRIC-BLUE',
    'daylit informal reading',{yaw,size:[1.8,.84,.58]})));
  if(options.plant) out.push(fixture(`${prefix}/PLANT`,'reading-room plant','PF-PLANT',
    [options.plant[0],e,options.plant[1]],'M-PLANT','quiet-zone planting'));
  if(options.sign) out.push(b02WallSign(`${prefix}/SIGN`,e,...options.sign));
  if(options.clock) out.push(fixture(`${prefix}/CLOCK`,'reading-room clock','PF-CLOCK',
    [options.clock[0],e+2.48,options.clock[1]],'M-WALL-WHITE','quiet timekeeping',
    {yaw:options.clock[2]||0,collision:'none'}));
  out.push(...b02Ceiling(`${prefix}/CEILING`,e,points.map(([x,z])=>[x,z,1.9,.24]),3200,true));
  return out;
}

function b02GroupStudy(prefix,e) {
  const out=[];
  for(const [pod,z] of [['A',2.15],['B',8.75]]) {
    out.push(
      fixture(`${prefix}/${pod}/TABLE`,'four-person group-study table','PF-MEETING-TABLE',
        [4.85,e,z],'M-OAK','collaborative study surface',{yaw:PI/2,size:[2.2,.76,.9]}),
      fixture(`${prefix}/${pod}/C1`,'group-study chair','PF-CHAIR',[4.05,e,z-.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:PI/2}),
      fixture(`${prefix}/${pod}/C2`,'group-study chair','PF-CHAIR',[4.05,e,z+.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:PI/2}),
      fixture(`${prefix}/${pod}/C3`,'group-study chair','PF-CHAIR',[5.65,e,z-.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:-PI/2}),
      fixture(`${prefix}/${pod}/C4`,'group-study chair','PF-CHAIR',[5.65,e,z+.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:-PI/2}),
      fixture(`${prefix}/${pod}/BOARD`,'group-study whiteboard','PF-WHITEBOARD',
        [6.08,e+1.55,z],'M-WHITEBOARD','shared notes',{yaw:-PI/2,size:[1.65,.90,.05],collision:'none'}),
      b02WallSign(`${prefix}/${pod}/SIGN`,e,6.09,z,`小组学习 ${pod}`,-PI/2,1.35),
      ...b02Ceiling(`${prefix}/${pod}/CEILING`,e,[[4.85,z,1.65,.24]],3300,true),
    );
  }
  return out;
}

function buildB02() {
  const floors=[];
  const coreB=[1.1,6.15,-11.6,-5.35],wcB=[3.55,6.15,-3.85,-.9];
  const coreRooms=(level,e,prefix)=>[
    room(`${prefix}/CORE`,'楼梯与电梯',coreB,'service',[],[
      fixture(`${prefix}/CORE/STAIR`,'protected library stair','PF-STAIR',[4.8,e,-8.6],
        'M-TERRAZZO','protected vertical egress',{size:[2.05,3.0,4.0]}),
      fixture(`${prefix}/CORE/LIFT`,'accessible library lift','PF-LIFT',[2.2,e,-9.2],
        'M-STEEL','accessible vertical circulation',{size:[1.65,2.45,1.55],levels:[1,2,3,4]}),
      fixture(`${prefix}/CORE/ELEC`,'electrical cabinet','PF-FILE-CABINET',[5.62,e,-11.12],
        'M-STEEL-DARK','floor electrical distribution',{size:[.65,1.7,.30]}),
      fixture(`${prefix}/CORE/CLEAN`,'cleaning cupboard','PF-CLEANING',[2.0,e,-11.12],
        'M-STEEL','janitorial storage',{size:[.75,1.9,.55]}),
      b02WallSign(`${prefix}/CORE/LEVEL`,e,4.85,-5.39,`图书馆 ${level}层`,0,1.55),
      ...b02Ceiling(`${prefix}/CORE/CEILING`,e,[[2.2,-6.25,1.25,.24]],3500,false),
    ]),
    room(`${prefix}/WC`,'卫生间',wcB,'service',[],[
      fixture(`${prefix}/WC/T1`,'accessible toilet','PF-TOILET',[5.50,e,-1.45],
        'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${prefix}/WC/T2`,'toilet','PF-TOILET',[5.50,e,-2.45],
        'M-CERAMIC','sanitary fixture'),
      fixture(`${prefix}/WC/B1`,'washbasin','PF-BASIN',[4.20,e,-1.20],
        'M-CERAMIC','hand washing'),
      fixture(`${prefix}/WC/CLEAN`,'cleaning cupboard','PF-CLEANING',[5.50,e,-3.40],
        'M-STEEL','janitorial storage',{size:[.72,1.9,.52]}),
      ...b02Ceiling(`${prefix}/WC/CEILING`,e,[[4.85,-2.45,1.2,.24]],3800,false),
    ]),
  ];

  // Floor 1: a clear security threshold, side-on service desk, new books and accessible reading.
  {
    const level=1,e=0,p='B02/F1';
    const rooms=[
      room(`${p}/LOBBY`,'入口与安检',[-6.15,-2.25,-2.4,2.4],'public',[
        doorway(`${p}/LOBBY/EXT`,'west',[-6.5,e,0],2.4,'campus',{portal:true}),
        doorway(`${p}/LOBBY/IN`,'east',[-2.25,e,0],1.8,`${p}/HALL`),
      ],[
        fixture(`${p}/LOBBY/MAT`,'recessed entry mat','PF-WALL-RUN',[-4.55,e+.018,0],
          'M-RUBBER','weather and dirt control',{size:[2.7,.025,1.35],collision:'none'}),
        fixture(`${p}/LOBBY/G1`,'library security gate','PF-SECURITY-GATE',[-5.05,e,-.85],
          'M-GLASS','entry security',{collision:'none'}),
        fixture(`${p}/LOBBY/G2`,'library security gate','PF-SECURITY-GATE',[-5.05,e,.85],
          'M-GLASS','entry security',{collision:'none'}),
        fixture(`${p}/LOBBY/DIR`,'four-floor library directory','PF-DIRECTORY',[-3.0,e,-1.95],
          'M-SCREEN','accessible library wayfinding',{text:'1 服务 · 2 人文 · 3 数字 · 4 特藏'}),
        fixture(`${p}/LOBBY/RET`,'book-return kiosk','PF-SELF-CHECK',[-2.75,e,1.95],
          'M-SCREEN','after-hours and staffed-hours returns',{yaw:PI}),
        fixture(`${p}/LOBBY/BENCH`,'arrival bench','PF-BENCH',[-4.50,e,1.95],
          'M-FABRIC-BLUE','waiting and bag organization'),
        fixture(`${p}/LOBBY/PLANT`,'arrival plant','PF-PLANT',[-5.65,e,-1.85],
          'M-PLANT','welcoming entry planting'),
        b02WallSign(`${p}/LOBBY/SIGN`,e,-2.29,-1.72,'图书馆 · LIBRARY',PI/2,1.55),
        ...b02Ceiling(`${p}/LOBBY/CEILING`,e,[[-4.25,0,2.25,.24]],3200,true),
      ]),
      room(`${p}/CIRC`,'借还书处',[-2.05,.9,-4.5,.55],'library',[
        doorway(`${p}/CIRC/D-HALL`,'north',[-.60,e,.55],1.2,`${p}/HALL`),
      ],[
        fixture(`${p}/CIRC/DESK`,'accessible circulation desk','PF-CIRC-DESK',[.64,e,-2.15],
          'M-OAK-DARK','borrowing, returns and reader help',{yaw:PI/2,size:[2.2,1.0,.52]}),
        fixture(`${p}/CIRC/K1`,'self-check kiosk A','PF-SELF-CHECK',[-1.75,e,-1.55],
          'M-SCREEN','self-service borrowing',{yaw:PI/2}),
        fixture(`${p}/CIRC/K2`,'self-check kiosk B','PF-SELF-CHECK',[-1.75,e,-2.35],
          'M-SCREEN','self-service borrowing',{yaw:PI/2}),
        fixture(`${p}/CIRC/RETURN`,'returned-book cart','PF-SHELF',[-1.775,e,-3.65],
          'M-STEEL','returned-book staging',{yaw:PI/2,size:[.40,1.15,.55]}),
        fixture(`${p}/CIRC/AED`,'public AED','PF-AED',[-2.0,e+1.25,-.25],
          'M-SAFETY-RED','public defibrillator',{yaw:PI/2,collision:'none'}),
        b02WallSign(`${p}/CIRC/SIGN`,e,.45,-4.46,'借还书处 · CIRCULATION',0,1.85),
        ...b02Ceiling(`${p}/CIRC/CEILING`,e,[[-.45,-2.15,1.55,.24]],3300,false),
      ]),
      room(`${p}/NEW`,'新书与综合阅览',[-6.15,.9,2.65,11.6],'library',[],[
        ...b02StackRuns(`${p}/NEW`,e,[-4.45,-1.95],[5.1],'新书与期刊','M-OAK-DARK',[.9,2.0,2.4]),
        fixture(`${p}/NEW/FACEOUT`,'face-out new-book display','PF-BOOKCASE',[.45,e,5.1],
          'M-OAK','new and recommended books',{size:[.55,1.25,2.0]}),
        ...b02ReadingTables(`${p}/NEW/READ`,e,[[-2.60,9.25,0]],{
          purpose:'new-book browsing with full chair pull-back',
          benches:[[-5.0,11.15,0],[-.20,11.15,0]],plant:[.45,8.15],
          sign:[-2.6,11.56,'新书阅览 · NEW BOOKS',PI,1.95],
        }),
        ...b02Ceiling(`${p}/NEW/STACK-LIGHTS`,e,[[-4.45,5.1,1.1,.24],[-1.95,5.1,1.1,.24]],3400,false),
      ]),
      room(`${p}/READ`,'无障碍阅览区',[1.7,6.15,1.0,11.6],'library',[],[
        ...b02ReadingTables(`${p}/READ`,e,[[4.10,4.45,0],[4.10,8.30,0]],{
          purpose:'accessible reading with 1.2 m approaches and chair pull-back',
          benches:[[5.75,10.65,PI/2]],
          sign:[6.11,3.8,'无障碍阅览 · ACCESSIBLE',-PI/2,1.95],
        }),
        fixture(`${p}/READ/MAG`,'screen-magnifier workstation','PF-COMPUTER-DESK',[2.75,e,10.80],
          'M-OAK','accessible screen magnification',{accessible:true,yaw:PI/2}),
        ...b02Ceiling(`${p}/READ/MAG-LIGHT`,e,[[2.75,10.8,1.1,.22]],3400,false),
      ]),
      room(`${p}/PROCESS`,'图书加工与办公室',[-6.15,.9,-11.6,-4.75],'office',[],[
        fixture(`${p}/PROCESS/D1`,'cataloguing workstation A','PF-OFFICE-DESK',[-4.9,e,-10.65],
          'M-OAK','cataloguing and acquisitions',{size:[1.35,.76,.70]}),
        fixture(`${p}/PROCESS/D2`,'cataloguing workstation B','PF-OFFICE-DESK',[-2.9,e,-10.65],
          'M-OAK','cataloguing and acquisitions',{size:[1.35,.76,.70]}),
        fixture(`${p}/PROCESS/D3`,'digital catalogue workstation','PF-COMPUTER-DESK',[-.75,e,-10.65],
          'M-OAK','metadata and digital collections'),
        fixture(`${p}/PROCESS/SORT`,'book processing table','PF-MEETING-TABLE',[-3.7,e,-7.20],
          'M-OAK','repair, labeling and sorting',{size:[2.2,.76,.90]}),
        fixture(`${p}/PROCESS/CART`,'incoming-book cart','PF-SHELF',[-5.65,e,-5.50],
          'M-STEEL','incoming books',{size:[.72,1.20,.45]}),
        fixture(`${p}/PROCESS/SHELF`,'processing supply shelf','PF-SHELF',[-5.75,e,-8.35],
          'M-STEEL','covers, labels and repair supplies',{size:[.55,1.75,1.45]}),
        b02WallSign(`${p}/PROCESS/SIGN`,e,-3.5,-11.55,'图书加工 · TECHNICAL SERVICES',PI,2.4),
        ...b02Ceiling(`${p}/PROCESS/CEILING`,e,[[-3.7,-7.2,1.8,.24],[-3.9,-10.4,1.8,.24]],3500,false),
      ]),
      ...coreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.2,rooms,[
      {id:`${p}/HALL`,bounds:[-2.25,3.4,-.8,2.55],clearWidth:2.0,surface:'M-TERRAZZO'},
      {id:`${p}/SERVICE-SPINE`,bounds:[1.1,3.4,-6.0,-.8],clearWidth:1.5,surface:'M-OAK'},
    ],[
      ...safetySet(p,e,[3.2,-3.8],[-5.6,0],level,true),
      b02WallSign(`${p}/HALL/SIGN`,e,3.36,1.7,'新书 · 阅览 · 借还书',-PI/2,1.8),
      ...b02Ceiling(`${p}/SPINE/CEILING`,e,[[2.25,-3.1,1.1,.22],[2.25,1.0,1.1,.22]],3400,false),
    ],{occupancy:92}));
  }

  // Floors 2–4: collection/reading rooms open from a true 1.50 m minimum quiet spine.
  for(const spec of [
    {level:2,south:'人文社科书库',north:'大阅览室',east:'小组学习室',kind:'humanities'},
    {level:3,south:'科学期刊书库',north:'电子阅览室',east:'小组学习室',kind:'science'},
    {level:4,south:'特藏与档案',north:'安静阅览室',east:'馆员办公室',kind:'archive'},
  ]) {
    const e=(spec.level-1)*3.2,p=`B02/F${spec.level}`;
    const south=[-6.15,.9,-11.6,-.7],north=[-6.15,.9,-.45,11.6],east=[3.55,6.15,-.7,11.6];
    const southContents=[
      ...b02StackRuns(`${p}/SOUTH`,e,[-4.25,-1.55],[-9.0,-5.0],spec.south,
        spec.kind==='archive'?'M-STEEL-DARK':'M-OAK-DARK',spec.kind==='archive'?[.85,2.05,2.8]:[.9,2.05,2.8]),
      b02WallSign(`${p}/SOUTH/SIGN`,e,-3.0,-11.55,spec.south,0,2.1),
      ...b02Ceiling(`${p}/SOUTH/CEILING`,e,[[-2.9,-9,1.2,.24],[-2.9,-5,1.2,.24]],3400,false),
    ];
    if(spec.kind==='humanities') southContents.push(
      fixture(`${p}/SOUTH/CATALOG`,'collection catalogue kiosk','PF-SELF-CHECK',[.35,e,-1.25],
        'M-SCREEN','shelf finding and catalogue search',{yaw:PI}),
    );
    if(spec.kind==='science') southContents.push(
      fixture(`${p}/SOUTH/DISPLAY`,'current-periodicals display','PF-SHELF',[-3.0,e,-1.25],
        'M-OAK','face-out current journals',{size:[2.2,1.05,.60]}),
    );
    if(spec.kind==='archive') southContents.push(
      fixture(`${p}/SOUTH/CTRL`,'archive environmental monitor','PF-DIRECTORY',[.25,e,-1.25],
        'M-SCREEN','temperature and humidity status',{text:'20°C · 45% RH'}),
      fixture(`${p}/SOUTH/VIEW`,'special-collections display case','PF-SHELF',[-3.0,e,-1.25],
        'M-GLASS','rotating rare-book exhibit',{size:[2.2,1.05,.65]}),
    );

    let northContents;
    if(spec.kind==='science') {
      const pcs=[[-4.60,2.0],[-2.50,2.0],[-.40,2.0],[-4.60,5.4],[-2.50,5.4],
        [-4.60,8.8],[-2.50,8.8],[-.40,8.8]];
      northContents=[
        ...pcs.map(([x,z],i)=>fixture(`${p}/NORTH/PC${pad(i+1)}`,'electronic reading workstation',
          'PF-COMPUTER-DESK',[x,e,z],'M-OAK','database, catalogue and journal access')),
        fixture(`${p}/NORTH/PRINT`,'print and scan station','PF-SELF-CHECK',[.35,e,10.65],
          'M-SCREEN','journal printing and scanning',{yaw:PI}),
        fixture(`${p}/NORTH/SCREEN`,'digital scholarship display','PF-SCREEN',[-3.0,e+1.62,11.55],
          'M-SCREEN','research support and digital collections',{yaw:PI,size:[2.6,1.25,.05],collision:'none'}),
        b02WallSign(`${p}/NORTH/SIGN`,e,-4.8,11.55,'电子阅览室 · DIGITAL READING',PI,2.0),
        ...b02Ceiling(`${p}/NORTH/CEILING`,e,[[-3.55,2.0,1.8,.24],[-3.55,5.4,1.8,.24],[-3.55,8.8,1.8,.24]],3500,false),
      ];
    } else {
      const tables=spec.kind==='humanities'?
        [[-4.35,2.20,0],[-1.0,2.20,0],[-4.35,8.40,0],[-1.0,8.40,0]]:
        [[-4.35,2.40,0],[-1.0,2.40,0],[-2.65,8.40,0]];
      northContents=b02ReadingTables(`${p}/NORTH`,e,tables,{
        purpose:spec.kind==='archive'?'silent supervised reading with chair pull-back':'quiet reading with chair pull-back',
        benches:[[-4.35,11.15,0],[-1.0,11.15,0]],
        sign:[-3.2,11.55,spec.north,PI,2.0],clock:[.45,11.55,PI],
      });
    }

    const eastContents=spec.kind==='archive'?[
      fixture(`${p}/EAST/DESK`,'librarian workstation','PF-OFFICE-DESK',[4.85,e,2.0],
        'M-OAK','special-collections staff workstation',{yaw:PI/2,size:[1.4,.76,.70]}),
      fixture(`${p}/EAST/MEET`,'archive consultation table','PF-MEETING-TABLE',[4.85,e,7.70],
        'M-OAK','staff-supervised archive consultation',{yaw:PI/2,size:[1.8,.76,.80]}),
      fixture(`${p}/EAST/C1`,'consultation chair','PF-CHAIR',[4.0,e,7.70],
        'M-FABRIC-BLUE','archive consultation seat',{yaw:PI/2}),
      fixture(`${p}/EAST/C2`,'consultation chair','PF-CHAIR',[5.70,e,7.70],
        'M-FABRIC-BLUE','archive consultation seat',{yaw:-PI/2}),
      fixture(`${p}/EAST/FILES`,'secure archive files','PF-FILE-CABINET',[4.25,e,10.75],
        'M-STEEL-DARK','finding aids and request records'),
      fixture(`${p}/EAST/CASE`,'staff reference bookcase','PF-BOOKCASE',[5.55,e,10.75],
        'M-OAK-DARK','staff reference collection'),
      b02WallSign(`${p}/EAST/SIGN`,e,6.11,2.0,'馆员办公室',-PI/2,1.5),
      ...b02Ceiling(`${p}/EAST/CEILING`,e,[[4.85,2.0,1.3,.22],[4.85,7.7,1.4,.22]],3400,true),
    ]:b02GroupStudy(`${p}/EAST`,e);

    const rooms=[
      room(`${p}/SOUTH`,spec.south,south,'library',[],southContents),
      room(`${p}/NORTH`,spec.north,north,'library',[],northContents,
        {legacySceneAlias:spec.level===2?'library':undefined}),
      room(`${p}/EAST`,spec.east,east,spec.kind==='archive'?'office':'library',[],eastContents),
      ...coreRooms(spec.level,e,p),
    ];
    floors.push(floor(spec.level,e,3.2,rooms,[{
      id:`${p}/SPINE`,bounds:[1.1,3.4,-5.2,11.6],clearWidth:1.5,surface:'M-OAK',
    }],[
      ...safetySet(p,e,[3.2,-3.8],[3.35,0],spec.level,false),
      fixture(`${p}/WATER`,'water dispenser','PF-WATER',[.45,e,.35],
        'M-STEEL','visitor hydration'),
      fixture(`${p}/SPINE/RUNNER`,'quiet-spine floor runner','PF-WALL-RUN',[2.25,e+.014,3.2],
        'M-RUBBER','acoustic and visual route through the floor',{size:[1.35,.022,15.8],collision:'none'}),
      b02WallSign(`${p}/SPINE/SIGN`,e,3.36,1.5,`${spec.south} · ${spec.north} · ${spec.east}`,
        -PI/2,2.0),
      ...b02Ceiling(`${p}/SPINE/CEILING`,e,[[2.25,-2.8,1.05,.22],[2.25,3.2,1.05,.22],[2.25,9.0,1.05,.22]],3400,false),
    ],{occupancy:spec.level===4?48:72}));
  }
  return {
    id:'B02',label:'图书馆',status:'partial-existing',centreCampus:[36.5,50],localBounds:[-6.5,6.5,-12,12],
    exteriorFootprint:{x0:30,x1:43,z0:38,z1:62},floors:4,floorHeight:3.2,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'50 + localZ'},
    portals:[{id:'B02/PUBLIC',campusAt:[30,50],campusReturn:[27.2,50,PI/2],localSpawn:[-5.0,0,0,PI/2],placeKey:'campus_b02_f1'},
      {id:'B02/LEGACY-READING',mapsTo:'B02/F2/NORTH',placeKey:'library',preserve:true}],
    facadeAlignment:{westTallWindows:{localX:-6.5,localZ:[-10,-6.7,-3.4,-.1,3.2,6.5,9.8]},serviceWindows:'east, north and south follow the 3.2 m exterior bay rule'},
    design:'A measured four-floor university library: clear security threshold and side-on reader-services desk; human-scale stacks with 1.20 m or wider face and cross aisles; a 1.50 m minimum quiet spine; reading tables oriented with full chair pull-back; daylit window benches; acoustically separated group pods; digital reading, silent special-collections reading and compact staff consultation areas; wall-mounted signs and a restrained ceiling rhythm.',
    planningMetrics:{
      doorApproachDepth:1.35,quietSpineClearWidth:1.50,groundServiceSpineClearWidth:1.50,
      securityGateNominalLane:1.08,chairPullBack:0.60,readingTableSideAisle:1.25,
      groundNewBooks:{stackFaceAisle:1.60,minimumPerimeterCrossAisle:1.25},
      upperCollections:{standardStackFaceAisle:1.80,archiveStackFaceAisle:1.85,crossAisle:1.20},
    },
    floorsPlan:floors,
  };
}

function buildB03() {
  const e=0,p='B03/F1';
  const diningB=[.2,6.6,-8.9,8.9],serveB=[-2.65,0,-8.9,5.9],returnB=[-2.65,1.15,6.1,8.9],
    kitchenB=[-6.6,-2.65,-1.5,4.7],dirtyB=[-6.6,-2.65,4.7,8.9],
    storeB=[-6.6,-2.65,-8.9,-5.0],wcB=[-6.6,-4.45,-5.0,-1.5],changeB=[-4.45,-2.65,-5.0,-1.5];
  const decor=(id,label,at,material,size,purpose,extra={})=>fixture(id,label,'PF-WALL-RUN',at,
    material,purpose,{size,collision:'none',...extra});
  const plate=(id,label,at,text,purpose,extra={})=>fixture(id,label,'PF-ROOM-SIGN',at,
    'M-SCREEN',purpose,{text,size:[1.55,.32,.05],collision:'none',...extra});
  // Each dining group is a real 1.35 × .75 m table with chairs individually oriented toward it.
  // Two groups omit the north-east chair for a .90 × 1.20 m wheelchair position adjoining an aisle.
  const diningGroup=(id,x,z,accessible=false)=>{
    const out=[fixture(`${p}/DINING/${id}/TABLE`,accessible?'accessible four-place dining table':'four-place dining table',
      'PF-MEETING-TABLE',[x,e,z],'M-OAK','student dining',{size:[1.35,.76,.75],accessible})];
    let seat=0;
    for(const side of [-1,1]) for(const dx of [-.36,.36]) {
      if(accessible&&side===1&&dx>.3) continue;
      out.push(fixture(`${p}/DINING/${id}/C${pad(++seat)}`,'dining chair','PF-CHAIR',
        [x+dx,e,z+side*.72],seat%4===0?'M-FABRIC-RED':'M-FABRIC-BLUE','student dining seat',
        {yaw:side<0?0:PI}));
    }
    if(accessible) out.push(decor(`${p}/DINING/${id}/WHEELCHAIR`,'wheelchair dining bay',
      [x+.36,e+.014,z+.72],'M-LAB-BLUE',[.78,.02,.92],
      'reserved wheelchair position with the cross-aisle as manoeuvring space',{accessible:true,clearBay:[.9,1.2]}));
    return out;
  };
  const diningRows=[-6.70,-3.50,3.50,6.70];
  const dining=[];
  let n=0;
  for(const z of diningRows) for(const x of [2.55,5.10]) {
    const accessible=x>5&&Math.abs(z)===3.50;
    dining.push(...diningGroup(`T${pad(++n)}`,x,z,accessible));
  }
  dining.push(
    fixture(`${p}/DINING/TRAY`,'tray, chopstick and sanitizer rack','PF-TRAY-RACK',[2.15,e,-8.40],
      'M-STAINLESS','collect a tray and utensils before the south queue start'),
    decor(`${p}/DINING/ENTRY-MAT`,'recessed ribbed entrance mat',[5.72,e+.018,0],
      'M-TILE-DARK',[1.50,.025,3.70],'clean slip-resistant arrival threshold'),
    fixture(`${p}/DINING/MENU`,'wall-mounted daily menu','PF-SCREEN',[6.48,e+2.15,-2.55],
      'M-SCREEN','prices, dishes and allergen information',{yaw:-PI/2,size:[1.55,1.05,.05],
        text:'今日菜单 · 米饭 · 青菜 · 豆腐 · 红烧肉',collision:'none'}),
    fixture(`${p}/DINING/CLOCK`,'dining-hall clock','PF-CLOCK',[6.48,e+2.75,2.55],
      'M-WALL-WHITE','meal-service time',{yaw:-PI/2}),
    plate(`${p}/DINING/WELCOME`,'canteen entrance identity',[6.49,e+3.38,0],
      '学生食堂 · STUDENT CANTEEN','clear identity above the public entrance',{yaw:PI/2,size:[3.4,.42,.05]}),
  );
  // Four exterior-aligned panes, four washable acoustic rafts and one integrated linear light per
  // table row make a repeatable ceiling/window rhythm without decorative box stacks.
  for(const [i,z] of diningRows.entries()) dining.push(
    decor(`${p}/DINING/WINDOW${i+1}`,'east dining window',[6.50,e+2.55,z],
      'M-GLASS',[.04,2.45,1.85],'daylight panel aligned with the canteen facade',{yaw:0}),
  );
  for(const [i,z] of diningRows.entries()) dining.push(
    decor(`${p}/DINING/RAFT${i+1}`,'washable perforated acoustic raft',[3.825,e+5.48,z],
      'M-ACOUSTIC',[4.65,.10,1.05],'absorb dining noise above one table row'),
    fixture(`${p}/DINING/L${i+1}`,'integrated linear dining light','PF-CEILING-LIGHT',
      [3.825,e+5.37,z],'M-WALL-WHITE','even table-row illumination',{temperatureK:3400,size:[4.15,.06,.24]}),
  );

  const serving=[];
  const dishes=[
    ['米饭','RICE',-6.35],['青菜','GREENS',-4.00],['豆腐','TOFU',-1.65],['红烧肉','BRAISED PORK',.70],
  ];
  dishes.forEach(([zh,en,z],i)=>{
    serving.push(
      fixture(`${p}/SERVE/C${i+1}`,`${zh} serving counter`,'PF-SERVING-COUNTER',[-.82,e,z],
        'M-STAINLESS',`${en.toLowerCase()} service bay with integral pans and sneeze guard`,{yaw:PI/2}),
      plate(`${p}/SERVE/C${i+1}-SIGN`,`${zh} menu sign`,[-2.57,e+2.25,z],`${zh} · ${en}`,
        'one readable sign per serving bay',{yaw:PI/2,size:[1.55,.31,.05]}),
    );
  });
  serving.push(
    fixture(`${p}/SERVE/CASH`,'compact cashier station','PF-CASHIER',[-.96,e,2.40],
      'M-STAINLESS','student-card and mobile payment',{yaw:PI/2,size:[1.0,1.05,.78]}),
    plate(`${p}/SERVE/CASH-SIGN`,'cashier sign',[-2.57,e+2.25,2.40],'收银 · CASHIER',
      'checkout identity',{yaw:PI/2,size:[1.35,.31,.05]}),
    fixture(`${p}/SERVE/PICKUP`,'meal pickup counter','PF-SERVING-COUNTER',[-.96,e,5.15],
      'M-STAINLESS','completed-meal pickup beside the interaction anchor',{yaw:PI/2,size:[1.2,1.15,.86]}),
    plate(`${p}/SERVE/PICKUP-SIGN`,'meal pickup sign',[-2.57,e+2.25,5.15],
      '取餐 · PICK UP','meal pickup identity',{yaw:PI/2,size:[1.35,.31,.05]}),
    plate(`${p}/SERVE/STAFF-SIGN`,'servery staff-zone sign',[-2.57,e+3.15,-7.95],
      '员工入口 · STAFF','staff entry at the south end of the line',{yaw:PI/2,size:[1.35,.3,.05]}),
    decor(`${p}/SERVE/QUEUE-LINE`,'continuous queue direction line',[1.05,e+.014,-1.05],
      'M-SAFETY-YELLOW',[.08,.02,13.70],'single unobstructed guide from trays to pickup'),
    fixture(`${p}/SERVE/L1`,'south serving-line light','PF-CEILING-LIGHT',[-.96,e+5.34,-4.65],
      'M-WALL-WHITE','bright food presentation',{temperatureK:4000,size:[1.55,.06,.26]}),
    fixture(`${p}/SERVE/L2`,'north serving-line light','PF-CEILING-LIGHT',[-.96,e+5.34,2.35],
      'M-WALL-WHITE','cashier and pickup illumination',{temperatureK:4000,size:[1.55,.06,.26]}),
  );

  const returns=[
    fixture(`${p}/RETURN/BELT`,'dish-return conveyor','PF-DISH-RETURN',[-.96,e,7.05],
      'M-STAINLESS','receive used trays before the dirty-side transfer',{yaw:PI/2,size:[1.9,1.15,.82]}),
    plate(`${p}/RETURN/SIGN`,'dish-return sign',[-2.57,e+2.35,7.05],
      '餐具回收 · DISH RETURN','return direction',{yaw:PI/2,size:[2.0,.36,.05]}),
    fixture(`${p}/RETURN/BIN1`,'food-waste scrape bin','PF-BIN',[-.05,e,8.55],
      'M-SAFETY-YELLOW','food waste',{stream:'food waste'}),
    fixture(`${p}/RETURN/BIN2`,'other-waste bin','PF-BIN',[.45,e,8.55],
      'M-STEEL-DARK','other waste',{stream:'other waste'}),
    fixture(`${p}/RETURN/BIN3`,'recycling bin','PF-BIN',[.95,e,8.55],
      'M-LAB-BLUE','recyclable waste',{stream:'recycling'}),
    decor(`${p}/RETURN/FLOW`,'return-route floor line',[1.03,e+.014,7.25],
      'M-LAB-BLUE',[.08,.02,2.45],'guide diners from the north aisle to tray return'),
    fixture(`${p}/RETURN/L1`,'dish-return ceiling panel','PF-CEILING-LIGHT',[-.96,e+5.34,7.10],
      'M-WALL-WHITE','bright return bay',{temperatureK:4100,size:[1.5,.06,.28]}),
  ];
  const kitchen=[
    fixture(`${p}/KITCHEN/RANGE1`,'commercial wok range A','PF-KITCHEN-RANGE',[-6.05,e,-.50],
      'M-STAINLESS','hot cooking',{yaw:PI/2,size:[1.55,.92,.82]}),
    fixture(`${p}/KITCHEN/RANGE2`,'commercial wok range B','PF-KITCHEN-RANGE',[-6.05,e,1.10],
      'M-STAINLESS','hot cooking',{yaw:PI/2,size:[1.55,.92,.82]}),
    fixture(`${p}/KITCHEN/HOOD1`,'extract hood A','PF-HOOD',[-6.05,e+4.55,-.50],
      'M-STAINLESS','cooking extraction',{yaw:PI/2,size:[1.75,.68,1.0]}),
    fixture(`${p}/KITCHEN/HOOD2`,'extract hood B','PF-HOOD',[-6.05,e+4.55,1.10],
      'M-STAINLESS','cooking extraction',{yaw:PI/2,size:[1.75,.68,1.0]}),
    fixture(`${p}/KITCHEN/PREP1`,'vegetable preparation table','PF-PREP-TABLE',[-3.15,e,.65],
      'M-STAINLESS','clean vegetable preparation',{yaw:PI/2,size:[1.5,.9,.72],boardColor:'green'}),
    fixture(`${p}/KITCHEN/PREP2`,'protein preparation table','PF-PREP-TABLE',[-3.15,e,2.15],
      'M-STAINLESS','separate protein preparation',{yaw:PI/2,size:[1.5,.9,.72],boardColor:'red'}),
    fixture(`${p}/KITCHEN/HAND`,'staff handwash basin','PF-HANDWASH',[-5.20,e,-1.42],
      'M-STAINLESS','hand washing before clean preparation',{yaw:0}),
    fixture(`${p}/KITCHEN/FIRE`,'wet-chemical extinguisher','PF-EXTINGUISHER',[-2.72,e,1.4],
      'M-SAFETY-RED','commercial-kitchen fire safety',{agent:'wet chemical'}),
    decor(`${p}/KITCHEN/FLOOR-DRAIN`,'linear kitchen floor drain',[-4.55,e+.01,2.72],
      'M-STAINLESS',[1.75,.02,.12],'wash-down drainage'),
    plate(`${p}/KITCHEN/HOT-SIGN`,'hot-line sign',[-6.50,e+2.1,.35],
      '热厨 · HOT LINE','identify the contiguous wok line',{yaw:PI/2,size:[1.75,.32,.05]}),
    plate(`${p}/KITCHEN/PREP-SIGN`,'clean-preparation sign',[-2.70,e+2.1,1.35],
      '净菜 / 生食 · PREP','identify separated preparation tables',{yaw:-PI/2,size:[1.85,.32,.05]}),
    fixture(`${p}/KITCHEN/L1`,'clean-kitchen ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,1.0],
      'M-WALL-WHITE','hot-line and prep task lighting',{temperatureK:4200,size:[2.0,.06,.32]}),
  ];
  const dirty=[
    fixture(`${p}/DIRTY/SINK`,'double pre-rinse sink','PF-SINK-DOUBLE',[-3.10,e,5.55],
      'M-STAINLESS','scrape and pre-rinse returned dishes',{yaw:PI/2}),
    fixture(`${p}/DIRTY/LANDING`,'dirty-dish landing table','PF-PREP-TABLE',[-3.10,e,7.05],
      'M-STAINLESS','receive trays from the return aperture',{yaw:PI/2,size:[1.2,.9,.72]}),
    fixture(`${p}/DIRTY/RACK1`,'clean-dish rack A','PF-SHELF',[-6.15,e,6.70],
      'M-STEEL','air-dry clean dishes',{yaw:PI/2,size:[1.1,1.8,.42]}),
    fixture(`${p}/DIRTY/RACK2`,'clean-dish rack B','PF-SHELF',[-6.15,e,8.10],
      'M-STEEL','stage clean trays for return to service',{yaw:PI/2,size:[1.1,1.8,.42]}),
    decor(`${p}/DIRTY/DRAIN`,'wash-up floor drain',[-4.55,e+.01,6.25],
      'M-STAINLESS',[1.7,.02,.12],'dirty-room wash-down drainage'),
    plate(`${p}/DIRTY/SIGN`,'wash-up room sign',[-6.50,e+2.15,7.25],
      '洗消间 · WASH UP','identify the dirty wash-and-clean rack sequence',{yaw:PI/2,size:[1.65,.32,.05]}),
    fixture(`${p}/DIRTY/L1`,'wash-up ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,6.55],
      'M-WALL-WHITE','pre-rinse and clean-rack task lighting',{temperatureK:4300,size:[2.0,.06,.32]}),
  ];
  const stores=[
    fixture(`${p}/STORE/FRIDGE`,'upright refrigerator','PF-FRIDGE',[-6.05,e,-5.50],
      'M-STAINLESS','chilled ingredients'),
    fixture(`${p}/STORE/FREEZER`,'upright freezer','PF-FREEZER',[-5.05,e,-5.50],
      'M-STAINLESS','frozen ingredients'),
    fixture(`${p}/STORE/SHELF1`,'dry-store shelf A','PF-SHELF',[-6.15,e,-8.10],
      'M-STEEL','sealed dry ingredients',{yaw:PI/2}),
    fixture(`${p}/STORE/SHELF2`,'dry-store shelf B','PF-SHELF',[-6.15,e,-6.75],
      'M-STEEL','dated dry ingredients',{yaw:PI/2}),
    plate(`${p}/STORE/COLD-SIGN`,'cold-storage sign',[-6.50,e+2.12,-5.55],
      '冷藏 / 冷冻 · COLD','identify chilled and frozen storage',{yaw:PI/2,size:[1.7,.32,.05]}),
    plate(`${p}/STORE/DRY-SIGN`,'dry-store sign',[-6.50,e+2.12,-7.55],
      '干货 · DRY STORE','identify dry ingredient shelving',{yaw:PI/2,size:[1.55,.32,.05]}),
    fixture(`${p}/STORE/L1`,'store ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,-7.15],
      'M-WALL-WHITE','cold and dry-stock inspection lighting',{temperatureK:4000,size:[1.8,.06,.30]}),
  ];
  const wc=[
    fixture(`${p}/WC/TOILET`,'accessible staff toilet','PF-TOILET',[-5.95,e,-4.40],
      'M-CERAMIC','staff sanitary fixture',{grabRails:true}),
    fixture(`${p}/WC/BASIN`,'staff washbasin','PF-BASIN',[-4.90,e,-4.40],
      'M-CERAMIC','staff hand washing'),
    decor(`${p}/WC/TURN`,'accessible turning zone',[-5.45,e+.014,-2.70],
      'M-LAB-BLUE',[1.50,.02,1.50],'keep a full wheelchair turning zone clear',{accessible:true}),
    decor(`${p}/WC/RAIL`,'contrasting toilet grab rail',[-6.48,e+.9,-4.38],
      'M-SAFETY-YELLOW',[.05,.06,.72],'transfer support at the toilet'),
    decor(`${p}/WC/MIRROR`,'washroom mirror',[-4.90,e+1.55,-4.95],
      'M-GLASS',[.82,.82,.04],'mirror above the basin'),
    plate(`${p}/WC/SIGN`,'staff WC sign',[-6.50,e+2.1,-2.15],
      '员工卫生间 · STAFF WC','accessible staff washroom identity',{yaw:PI/2,size:[1.55,.3,.05]}),
    fixture(`${p}/WC/L1`,'washroom ceiling panel','PF-CEILING-LIGHT',[-5.45,e+5.34,-3.05],
      'M-WALL-WHITE','washroom illumination',{temperatureK:4000,size:[1.2,.06,.30]}),
  ];
  const change=[
    fixture(`${p}/CHANGE/LOCKERS`,'recessed staff locker bank','PF-LOCKERS',[-4.25,e,-4.20],
      'M-STEEL-DARK','separate staff clothing from food preparation',{yaw:PI/2,size:[1.4,1.9,.40]}),
    decor(`${p}/CHANGE/HOOKS`,'staff coat-hook rail',[-2.70,e+1.55,-3.15],
      'M-OAK',[.05,.12,1.15],'aprons and clean work coats'),
    decor(`${p}/CHANGE/MAT`,'changing-room floor mat',[-3.32,e+.014,-2.65],
      'M-RUBBER',[1.05,.02,1.25],'dry footwear-changing zone'),
    plate(`${p}/CHANGE/SIGN`,'staff changing sign',[-2.70,e+2.15,-3.15],
      '员工更衣 · STAFF','identify the clean staff transition',{yaw:-PI/2,size:[1.45,.3,.05]}),
    fixture(`${p}/CHANGE/L1`,'changing-room ceiling panel','PF-CEILING-LIGHT',[-3.35,e+5.34,-2.75],
      'M-WALL-WHITE','staff changing illumination',{temperatureK:3900,size:[1.0,.06,.28]}),
  ];
  const rooms=[
    room(`${p}/DINING`,'学生餐厅',diningB,'canteen',[
      doorway(`${p}/DINING/EXT`,'east',[7,e,0],4.2,'campus',{portal:true}),
      doorway(`${p}/DINING/EXIT-S`,'south',[.35,e,-9.5],1.5,'campus',{emergencyOnly:true}),
      doorway(`${p}/DINING/QUEUE`,'west',[.2,e,-7.85],1.2,`${p}/QUEUE-SPINE`,{designIntent:'south queue entry'}),
    ],dining,{capacity:32,fixedSeats:30,wheelchairPlaces:2}),
    room(`${p}/SERVE`,'售饭区',serveB,'kitchen',[
      doorway(`${p}/SERVE/STORE`,'west',[-2.65,e,-8.20],.9,`${p}/SERVICE-ENTRY`,{staffOnly:true}),
      doorway(`${p}/SERVE/CLEAN-PASS`,'west',[-2.65,e,3.725],.95,`${p}/CLEAN-PASS`,{staffOnly:true}),
    ],serving,{staffOnly:true}),
    room(`${p}/RETURN`,'餐具回收',returnB,'kitchen',[
      doorway(`${p}/RETURN/STAFF`,'west',[-2.65,e,8.45],.8,`${p}/DISH-STAFF`,{staffOnly:true}),
    ],returns),
    room(`${p}/KITCHEN`,'净菜与热厨',kitchenB,'kitchen',[
      doorway(`${p}/KITCHEN/SERVICE`,'west',[-7,e,3],1.2,'campus-service'),
      doorway(`${p}/KITCHEN/CLEAN-PASS`,'east',[-2.65,e,3.725],.95,`${p}/CLEAN-PASS`,{staffOnly:true}),
      doorway(`${p}/KITCHEN/CHANGE`,'south',[-3.55,e,-1.5],1.2,`${p}/BOH-CLEAN`,{staffOnly:true}),
      doorway(`${p}/KITCHEN/WASH`,'north',[-5.40,e,4.7],1.2,`${p}/DIRTY`,{staffOnly:true}),
    ],kitchen,{staffOnly:true,workflow:'clean preparation → hot line → clean pass → serving bays'}),
    room(`${p}/DIRTY`,'餐具洗消间',dirtyB,'kitchen',[
      doorway(`${p}/DIRTY/KITCHEN`,'south',[-5.40,e,4.7],1.2,`${p}/KITCHEN`,{staffOnly:true}),
      doorway(`${p}/DIRTY/RETURN`,'east',[-2.65,e,8.45],.8,`${p}/DISH-STAFF`,{staffOnly:true}),
    ],dirty,{staffOnly:true,workflow:'return aperture → dirty landing → pre-rinse → clean racks → kitchen'}),
    room(`${p}/STORE`,'冷藏与干货储藏',storeB,'service',[
      doorway(`${p}/STORE/SERVICE`,'east',[-2.65,e,-8.20],.9,`${p}/SERVICE-ENTRY`,{staffOnly:true}),
      doorway(`${p}/STORE/CHANGE`,'north',[-3.25,e,-5.0],1.2,`${p}/BOH-CLEAN`,{staffOnly:true}),
    ],stores,{staffOnly:true}),
    room(`${p}/WC`,'员工卫生间',wcB,'service',[
      doorway(`${p}/WC/CHANGE`,'east',[-4.45,e,-2.60],1.0,`${p}/BOH-CLEAN`,{staffOnly:true}),
    ],wc,{staffOnly:true,accessible:true}),
    room(`${p}/CHANGE`,'员工更衣与清洁通道',changeB,'service',[
      doorway(`${p}/CHANGE/STORE`,'south',[-3.25,e,-5.0],1.2,`${p}/BOH-CLEAN`,{staffOnly:true}),
      doorway(`${p}/CHANGE/KITCHEN`,'north',[-3.55,e,-1.5],1.2,`${p}/BOH-CLEAN`,{staffOnly:true}),
      doorway(`${p}/CHANGE/WC`,'west',[-4.45,e,-2.60],1.0,`${p}/BOH-CLEAN`,{staffOnly:true}),
    ],change,{staffOnly:true}),
  ];
  const shared=[...safetySet(p,e,[6.25,2.75],[5.6,0],1,false),
    fixture(`${p}/AED`,'public AED','PF-AED',[6.42,e+1.25,2.75],
      'M-SAFETY-RED','public defibrillator beside the entrance',{yaw:-PI/2}),
    fixture(`${p}/EXIT-REAR`,'rear exit sign','PF-EXIT-SIGN',[-6.55,e+2.35,3],'M-SCREEN','service egress',{text:'安全出口'}),
    fixture(`${p}/EXIT-SOUTH`,'south emergency exit sign','PF-EXIT-SIGN',[.35,e+2.35,-8.85],'M-SCREEN','public secondary egress',{text:'安全出口'}),
  ];
  return {
    id:'B03',label:'学生食堂',status:'new-interior',centreCampus:[-36,2.5],localBounds:[-7,7,-9.5,9.5],
    exteriorFootprint:{x0:-43,x1:-29,z0:-7,z1:12},floors:1,floorHeight:5.8,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-36 + localX',worldZ:'2.5 + localZ'},
    portals:[{id:'B03/PUBLIC',campusAt:[-29,2.5],campusReturn:[-26.6,2.5,-PI/2],localSpawn:[5.6,0,0,-PI/2],placeKey:'campus_canteen'}],
    facadeChanges:[{id:'B03/EXIT-S','instruction':'Add a 1.50 m south emergency exit at campus (-35.65,-7.0); do not use the obstructed west delivery-screen gap as the public second exit.'}],
    facadeAlignment:{publicOpening:{side:'east',localAt:[7,0],width:4.2},deliveryDoor:{side:'west',localAt:[-7,3],width:2.1}},
    design:'A working 32-place canteen rather than a decorative hall: eight correctly oriented four-place tables sit on a measured 1.20 m aisle grid, two tables reserve wheelchair bays, a 1.50 m south-to-north queue serves four staffed food bays, and the north return feeds a physically separate dirty wash room. The west back-of-house maintains continuous storage, changing, clean-prep, hot-line and wash-up routes under washable task lighting; four facade-aligned dining windows and perforated ceiling rafts keep the public room bright and acoustically controlled.',
    operationalClearances:{
      seating:{tables:8,fixedChairs:30,wheelchairPlaces:2,totalPlaces:32,tableSize:[1.35,.76,.75],groupFootprint:[1.35,1.92]},
      dining:{betweenColumns:1.20,betweenRows:1.28,outerWall:1.24,entryDoorApproachGap:.24},
      service:{customerQueue:1.50,staffAisle:1.20,counterBackClearance:1.26,bayGap:.35,bays:4},
      backOfHouse:{cleanKitchenAisle:1.95,dirtyWashAisle:2.10,storeAisle:2.20,staffWCTurning:1.50},
      workflows:{clean:['store','changing clean route','vegetable/protein prep','hot line','clean pass','serving'],
        dirty:['public dish return','dirty landing','pre-rinse','clean racks','kitchen return']},
    },
    floorsPlan:[floor(1,0,5.8,rooms,[
      {id:`${p}/QUEUE-SPINE`,bounds:[-.35,1.15,-7.90,5.85],clearWidth:1.50,surface:'M-TILE-LIGHT'},
      {id:`${p}/ENTRY`,bounds:[.20,7,-2.42,2.42],clearWidth:2.40,surface:'M-TERRAZZO'},
      {id:`${p}/EGRESS-S`,bounds:[-.40,1.45,-9.5,-8.0],clearWidth:1.50,surface:'M-TERRAZZO'},
      {id:`${p}/DINING-AISLE`,bounds:[3.225,4.425,-7.60,7.60],clearWidth:1.20,surface:'M-TILE-LIGHT'},
      {id:`${p}/DINING-CROSS-S`,bounds:[1.15,6.30,-5.72,-4.48],clearWidth:1.20,surface:'M-TILE-LIGHT'},
      {id:`${p}/DINING-CROSS-N`,bounds:[1.15,6.30,4.48,5.72],clearWidth:1.20,surface:'M-TILE-LIGHT'},
      {id:`${p}/RETURN-LANE`,bounds:[-.35,1.15,6.10,8.25],clearWidth:1.50,surface:'M-TILE-LIGHT'},
      {id:`${p}/SERVE-STAFF`,bounds:[-2.60,-1.40,-8.65,5.75],clearWidth:1.20,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/SERVICE-ENTRY`,bounds:[-3.25,-1.40,-8.65,-7.75],clearWidth:.90,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/CLEAN-PASS`,bounds:[-3.25,-1.40,3.25,4.20],clearWidth:.95,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/DISH-STAFF`,bounds:[-3.25,-1.40,8.00,8.90],clearWidth:.80,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/BOH-CLEAN`,bounds:[-3.95,-2.75,-5.0,-.15],clearWidth:1.20,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/KITCHEN-AISLE`,bounds:[-5.55,-3.60,-1.20,2.75],clearWidth:1.95,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/WASH-AISLE`,bounds:[-5.65,-3.55,5.00,8.50],clearWidth:2.10,surface:'M-KITCHEN-EPOXY'},
      {id:`${p}/STORE-AISLE`,bounds:[-5.60,-3.40,-8.50,-5.95],clearWidth:2.20,surface:'M-TILE-DARK'},
      {id:`${p}/WC-TURN`,bounds:[-6.20,-4.70,-3.45,-1.95],clearWidth:1.50,surface:'M-TILE-DARK'},
    ],shared,{occupancy:52})],
  };
}

function dormWashRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b;
  return [
    fixture(`${prefix}/T1`,'screened toilet A','PF-TOILET',[x0+1.55,e,z0+.52],'M-CERAMIC','shared toilet'),
    fixture(`${prefix}/T2`,'screened toilet B','PF-TOILET',[x0+2.50,e,z0+.52],'M-CERAMIC','shared toilet'),
    fixture(`${prefix}/T-DIV`,'toilet privacy divider','PF-WALL-RUN',[x0+2.02,e+1.05,z0+.48],'M-TILE-LIGHT','privacy between toilet bays',{size:[.055,2.0,1.0],collision:'none'}),
    fixture(`${prefix}/S1`,'shower A','PF-SHOWER',[x1-.80,e,z0+.65],'M-CERAMIC','shared shower'),
    fixture(`${prefix}/S2`,'shower B','PF-SHOWER',[x1-.80,e,z0+1.80],'M-CERAMIC','shared shower'),
    fixture(`${prefix}/B1`,'washbasin A','PF-BASIN',[x0+1.35,e,z1-.32],'M-CERAMIC','hand washing'),
    fixture(`${prefix}/B2`,'washbasin B','PF-BASIN',[x0+2.35,e,z1-.32],'M-CERAMIC','hand washing'),
    fixture(`${prefix}/MIRROR`,'full-width washroom mirror','PF-WALL-RUN',[x0+1.85,e+1.62,z1-.035],'M-GLASS','mirror above shared basins',{size:[1.90,.92,.035],collision:'none'}),
    fixture(`${prefix}/BENCH`,'dry changing bench','PF-BENCH',[x1-1.45,e,z1-.50],'M-OAK','dry changing and towel bench',{size:[1.35,.72,.48]}),
    fixture(`${prefix}/LOCK`,'toiletry lockers','PF-LOCKERS',[x0+.35,e,z1-.95],'M-STEEL','resident wash kits',{yaw:PI/2,size:[1.20,1.75,.42]}),
    fixture(`${prefix}/WATER`,'recessed drinking-water station','PF-WATER',[x1-1.75,e,z0+1.55],'M-STEEL','resident hydration inside the washroom niche'),
    fixture(`${prefix}/MAT`,'wet-room anti-slip field','PF-WALL-RUN',[(x0+x1)/2,e+.018,(z0+z1)/2],'M-RUBBER','anti-slip wet-room floor inset',{size:[4.35,.025,2.85],collision:'none'}),
    fixture(`${prefix}/EX`,'extract fan','PF-AC',[x1-.45,e+2.4,z1-.18],'M-WALL-WHITE','wet-room extraction',{yaw:PI}),
    fixture(`${prefix}/LIGHT1`,'wet-room ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.65,z0+1.0],'M-WALL-WHITE','wet-room lighting',{temperatureK:4000,size:[.65,.06,.65]}),
    fixture(`${prefix}/LIGHT2`,'wet-room ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.65,z1-1.0],'M-WALL-WHITE','wet-room lighting',{temperatureK:4000,size:[.65,.06,.65]}),
  ];
}

function dormCorridorSet(prefix,e,level) {
  return [
    fixture(`${prefix}/COR/RUNNER`,'acoustic corridor runner','PF-WALL-RUN',[0,e+.018,0],'M-RUBBER','quiet residential circulation',{size:[1.12,.025,14.35],collision:'none'}),
    fixture(`${prefix}/COR/BAND-W`,'west wayfinding band','PF-WALL-RUN',[-1.105,e+1.18,0],'M-FABRIC-BLUE','continuous floor identity',{size:[.035,.18,14.45],collision:'none'}),
    fixture(`${prefix}/COR/BAND-E`,'east wayfinding band','PF-WALL-RUN',[1.105,e+1.18,0],'M-FABRIC-BLUE','continuous floor identity',{size:[.035,.18,14.45],collision:'none'}),
    fixture(`${prefix}/COR/FLOOR-SIGN`,'large floor marker','PF-ROOM-SIGN',[1.11,e+1.72,6.72],'M-SCREEN','floor identity',{yaw:-PI/2,text:`${level}层 · FLOOR ${level}`,size:[.72,.34,.04]}),
    fixture(`${prefix}/COR/NOTICE`,'resident notice board','PF-SCREEN',[-1.11,e+1.55,2.9],'M-SCREEN','resident events and notices',{yaw:PI/2,text:'宿舍通知 · RESIDENT NEWS',size:[1.55,.82,.045]}),
    fixture(`${prefix}/COR/ART`,'corridor-end floor artwork','PF-SCREEN',[.965,e+1.45,6.72],'M-SCREEN','floor identity without narrowing the corridor',{yaw:-PI/2,text:`宿舍 · ${level}层`,size:[.88,.62,.035],collision:'none'}),
    ...lightGrid(`${prefix}/COR`,e,[[0,-5.8],[0,-2.0],[0,2.0],[0,5.8]],3400),
  ];
}

function buildB04() {
  const floors=[];
  const west=[[-6.1,-1.2,-7.6,-3.9],[-6.1,-1.2,-3.7,0],[-6.1,-1.2,.2,3.9]],
    east=[[1.2,6.1,-7.6,-3.9],[1.2,6.1,-3.7,0],[1.2,6.1,.2,3.9]];
  const coreRooms=(level,e,p)=>[
    room(`${p}/STAIR`,'楼梯',[-6.1,-3.25,4.2,7.6],'service',[
      doorway(`${p}/STAIR/TO-LIFT`,'east',[-3.25,e,4.75],1.0,`${p}/LIFT`)
    ],[
      fixture(`${p}/STAIR/FIX`,'enclosed stair with clear entry landing','PF-STAIR',[-4.68,e,6.5],'M-TERRAZZO','secondary egress',{size:[2.35,2.8,2.0]}),
      fixture(`${p}/STAIR/ACCENT`,'stair landing color wall','PF-WALL-RUN',[-3.31,e+1.35,6.5],'M-FABRIC-BLUE','residential stair identity',{size:[.035,2.35,1.85],collision:'none'}),
      fixture(`${p}/STAIR/LIGHT`,'stair landing light','PF-CEILING-LIGHT',[-4.68,e+2.64,5.4],'M-WALL-WHITE','stair entry and landing lighting',{temperatureK:3500,size:[.78,.06,.48]})]),
    room(`${p}/LIFT`,'电梯',[-3.05,-1.2,4.2,7.6],'service',[
      doorway(`${p}/LIFT/TO-STAIR`,'west',[-3.05,e,4.75],1.0,`${p}/STAIR`),
      doorway(`${p}/LIFT/TO-COR`,'east',[-1.2,e,4.75],1.0,`${p}/CORRIDOR`),
    ],[
      fixture(`${p}/LIFT/FIX`,'accessible lift with waiting vestibule','PF-LIFT',[-2.12,e,6.55],'M-STEEL','accessible vertical circulation',{size:[1.55,2.45,1.55],levels:[1,2,3,4,5,6]}),
      fixture(`${p}/LIFT/ELEC`,'recessed floor electrical cabinet','PF-WALL-RUN',[-3.01,e+1.35,6.55],'M-STEEL-DARK','electrical distribution',{size:[.035,1.55,.58],collision:'none'}),
      fixture(`${p}/LIFT/MIRROR`,'lift-vestibule mirror','PF-WALL-RUN',[-3.0,e+1.52,5.25],'M-GLASS','last-look mirror',{yaw:PI/2,size:[.035,1.45,.72],collision:'none'}),
      fixture(`${p}/LIFT/LIGHT`,'lift-vestibule light','PF-CEILING-LIGHT',[-2.12,e+2.64,5.25],'M-WALL-WHITE','lift waiting lighting',{temperatureK:3400,size:[.72,.06,.42]}),
    ]),
    room(`${p}/WASH`,'公共盥洗室',[1.2,6.1,4.2,7.6],'service',[
      doorway(`${p}/WASH/TO-COR`,'west',[1.2,e,5.0],1.0,`${p}/CORRIDOR`)
    ],dormWashRoom(`${p}/WASH`,e,[1.2,6.1,4.2,7.6])),
  ];
  // Ground floor.
  {
    const level=1,e=0,p='B04/F1',rooms=[];
    rooms.push(
      room(`${p}/A01`,'101无障碍宿舍',west[0],'dorm',[doorway(`${p}/A01/D`,'east',[-1.2,e,-5.75],1.0,`${p}/CORRIDOR`)],furnishDormRoom(`${p}/A01`,e,west[0],'west',true),{beds:2,accessible:true}),
      room(`${p}/A02`,'102无障碍宿舍',east[0],'dorm',[doorway(`${p}/A02/D`,'west',[1.2,e,-5.75],1.0,`${p}/CORRIDOR`)],furnishDormRoom(`${p}/A02`,e,east[0],'east',true),{beds:2,accessible:true}),
      room(`${p}/LOBBY`,'门厅与值班台',west[1],'public',[
        doorway(`${p}/LOBBY/EXT`,'west',[-6.5,e,-1],2.6,'campus',{portal:true}),
        doorway(`${p}/LOBBY/TO-COR`,'east',[-1.2,e,-1.85],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LOBBY/MAT`,'deep entrance mat','PF-WALL-RUN',[-5.25,e+.018,-1],'M-RUBBER','weather-protected arrival',{size:[1.35,.025,1.8],collision:'none'}),
        fixture(`${p}/LOBBY/FEATURE`,'timber welcome wall','PF-WALL-RUN',[-2.65,e+1.35,-3.655],'M-OAK-DARK','warm residence identity',{size:[2.75,2.38,.035],collision:'none'}),
        fixture(`${p}/LOBBY/WELCOME`,'welcome-home sign','PF-ROOM-SIGN',[-2.65,e+1.76,-3.63],'M-SCREEN','residence welcome',{text:'欢迎回家 · WELCOME HOME',size:[1.9,.34,.04]}),
        fixture(`${p}/LOBBY/DESK`,'accessible residence duty desk','PF-SERVICE-COUNTER',[-2.65,e,-3.15],'M-OAK','resident assistance',{size:[2.0,1.05,.72]}),
        fixture(`${p}/LOBBY/DIR`,'wall-mounted residence directory','PF-SCREEN',[-5.45,e+1.55,-3.655],'M-SCREEN','rooms and accessible route',{text:'学生宿舍 1—6层',size:[1.25,.82,.035],collision:'none'}),
        fixture(`${p}/LOBBY/BENCH`,'upholstered visitor bench','PF-BENCH',[-4.55,e,-3.10],'M-FABRIC-BLUE','resident and visitor waiting',{size:[1.50,.84,.58]}),
        fixture(`${p}/LOBBY/PLANT1`,'waiting-area plant','PF-PLANT',[-5.75,e,-3.35],'M-PLANT','arrival greenery'),
        fixture(`${p}/LOBBY/AED`,'public AED','PF-AED',[-1.35,e+1.2,-3.2],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
        fixture(`${p}/LOBBY/PEND1`,'warm lobby pendant','PF-PENDANT',[-3.15,e+2.48,-1.15],'M-OAK','warm arrival lighting',{temperatureK:3000}),
        fixture(`${p}/LOBBY/PEND2`,'warm lobby pendant','PF-PENDANT',[-4.65,e+2.48,-1.15],'M-OAK','warm arrival lighting',{temperatureK:3000}),
        ...lightGrid(`${p}/LOBBY`,e,[[-3.7,-2.45]],3300),
      ]),
      room(`${p}/MAIL`,'邮件与管理员室',east[1],'office',[
        doorway(`${p}/MAIL/TO-COR`,'west',[1.2,e,-1.85],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/MAIL/LOCK`,'full-height resident mail wall','PF-LOCKERS',[5.82,e,-1.85],'M-STEEL','resident mail',{yaw:-PI/2,size:[2.5,1.9,.46]}),
        fixture(`${p}/MAIL/PARCEL`,'smart parcel locker wall','PF-LOCKERS',[4.0,e,-3.38],'M-FABRIC-BLUE','oversize parcel collection',{size:[2.4,1.9,.5]}),
        fixture(`${p}/MAIL/KIOSK`,'parcel collection kiosk','PF-SELF-CHECK',[2.0,e,-3.2],'M-SCREEN','resident parcel lookup'),
        fixture(`${p}/MAIL/COUNTER`,'parcel sorting counter','PF-PREP-TABLE',[4.45,e,-1.65],'M-OAK','parcel sorting and handover',{size:[1.35,.86,.62]}),
        fixture(`${p}/MAIL/OFFICE`,'administrator workstation','PF-OFFICE-DESK',[3.1,e,-.62],'M-WOOD-DESK','secure mail administration',{yaw:PI}),
        fixture(`${p}/MAIL/FILES`,'secure resident files','PF-FILE-CABINET',[5.0,e,-.4],'M-STEEL-DARK','protected mail and resident records',{yaw:PI}),
        fixture(`${p}/MAIL/PLANT`,'mail-room plant','PF-PLANT',[2.0,e,-.4],'M-PLANT','softens the staff work corner'),
        fixture(`${p}/MAIL/BOARD`,'parcel-status board','PF-SCREEN',[3.6,e+1.55,-.055],'M-SCREEN','collection status and operating hours',{yaw:PI,text:'邮件 · PARCEL COLLECTION',size:[1.8,.82,.045]}),
        ...lightGrid(`${p}/MAIL`,e,[[2.5,-1.8],[4.9,-1.8]],3500),
      ]),
      room(`${p}/LOUNGE-W`,'公共客厅',west[2],'dorm',[
        doorway(`${p}/LOUNGE-W/TO-COR`,'east',[-1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LOUNGE-W/RUG`,'woven lounge rug','PF-WALL-RUN',[-4.15,e+.018,2.05],'M-FABRIC-BLUE','defines social seating',{size:[2.75,.025,2.55],collision:'none'}),
        fixture(`${p}/LOUNGE-W/SOFA1`,'west-wall lounge sofa','PF-BENCH',[-5.65,e,1.7],'M-FABRIC-BLUE','resident social seating',{yaw:PI/2,size:[1.75,.84,.58]}),
        fixture(`${p}/LOUNGE-W/SOFA2`,'north-wall lounge sofa','PF-BENCH',[-4.05,e,3.48],'M-WALL-GREEN','resident social seating',{size:[1.75,.84,.58]}),
        fixture(`${p}/LOUNGE-W/TABLE`,'low lounge table','PF-MEETING-TABLE',[-4.05,e,2.15],'M-OAK','shared tea and game table',{size:[1.25,.45,.68]}),
        fixture(`${p}/LOUNGE-W/TV`,'notice and television screen','PF-SCREEN',[-1.255,e+1.5,3.4],'M-SCREEN','resident information',{yaw:-PI/2}),
        fixture(`${p}/LOUNGE-W/BOOK`,'lounge bookcase','PF-BOOKCASE',[-5.72,e,3.35],'M-OAK-DARK','books and board games',{yaw:PI/2}),
        fixture(`${p}/LOUNGE-W/PLANT`,'lounge plant','PF-PLANT',[-1.7,e,.65],'M-PLANT','social-space greenery'),
        fixture(`${p}/LOUNGE-W/PEND`,'lounge pendant','PF-PENDANT',[-4.05,e+2.45,2.15],'M-OAK','warm social lighting',{temperatureK:2900}),
      ]),
      room(`${p}/LOUNGE-E`,'自习室',east[2],'dorm',[
        doorway(`${p}/LOUNGE-E/TO-COR`,'west',[1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LOUNGE-E/RUG`,'quiet-study rug','PF-WALL-RUN',[3.65,e+.018,2.0],'M-RUBBER','acoustic study zone',{size:[3.9,.025,2.8],collision:'none'}),
        ...[[3.0,1.0,0],[4.75,1.0,0],[3.0,3.1,PI],[4.75,3.1,PI]].map(([x,z,yaw],i)=>
          fixture(`${p}/LOUNGE-E/D${i+1}`,'study workstation','PF-DORM-DESK',[x,e,z],'M-WOOD-DESK','shared study with pull-back clearance',{yaw})),
        fixture(`${p}/LOUNGE-E/BOOK`,'shared bookcase','PF-BOOKCASE',[5.72,e,2.0],'M-OAK-DARK','shared books',{yaw:-PI/2}),
        fixture(`${p}/LOUNGE-E/BOARD`,'shared planning board','PF-WHITEBOARD',[3.65,e+1.52,3.84],'M-WHITEBOARD','study plans and tutoring notes',{yaw:PI,size:[2.6,1.0,.05]}),
        fixture(`${p}/LOUNGE-E/PLANT`,'study-room plant','PF-PLANT',[5.6,e,.55],'M-PLANT','quiet greenery'),
        ...lightGrid(`${p}/LOUNGE-E`,e,[[2.4,2.0],[4.8,2.0]],3500),
      ]),
      ...coreRooms(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'},{id:`${p}/ENTRY`,bounds:[-6.5,-1.0,-2.15,.15],clearWidth:2.3,surface:'M-TERRAZZO'}],[...safetySet(p,e,[-3.15,4.4],[-5.8,-1],level,true),...dormCorridorSet(p,e,level)],{occupancy:24}));
  }
  // Floors 2–5: six twin rooms each.
  for(let level=2;level<=5;level++) {
    const e=(level-1)*3,p=`B04/F${level}`,rooms=[];
    [...west.map((b,i)=>({b,side:'west',index:i})),...east.map((b,i)=>({b,side:'east',index:i+3}))].forEach((q,i)=>{
      const number=level*100+i+1,id=`${p}/${number}`,doorX=q.side==='west'?-1.2:1.2;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[doorX,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(...coreRooms(level,e,p));
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false),...dormCorridorSet(p,e,level)],{occupancy:28}));
  }
  // Floor 6: four rooms, laundry and study lounge.
  {
    const level=6,e=15,p='B04/F6',rooms=[];
    [...west.slice(0,2).map((b,i)=>({b,side:'west',i})),...east.slice(0,2).map((b,i)=>({b,side:'east',i:i+2}))].forEach((q,i)=>{
      const number=601+i,id=`${p}/${number}`;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[q.side==='west'?-1.2:1.2,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(
      room(`${p}/LAUNDRY`,'洗衣房',west[2],'service',[
        doorway(`${p}/LAUNDRY/TO-COR`,'east',[-1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LAUNDRY/MAT`,'laundry anti-slip floor','PF-WALL-RUN',[-3.65,e+.018,2.05],'M-RUBBER','safe laundry work zone',{size:[4.35,.025,3.15],collision:'none'}),
        fixture(`${p}/LAUNDRY/W1`,'washer/dryer A','PF-LAUNDRY',[-5.4,e,.8],'M-STEEL','resident laundry'),
        fixture(`${p}/LAUNDRY/W2`,'washer/dryer B','PF-LAUNDRY',[-4.5,e,.8],'M-STEEL','resident laundry'),
        fixture(`${p}/LAUNDRY/W3`,'washer/dryer C','PF-LAUNDRY',[-3.6,e,.8],'M-STEEL','resident laundry'),
        fixture(`${p}/LAUNDRY/SINK`,'laundry sink','PF-SINK-DOUBLE',[-2.1,e,.65],'M-STAINLESS','hand washing laundry',{size:[.9,.92,.65]}),
        fixture(`${p}/LAUNDRY/TABLE`,'folding table','PF-PREP-TABLE',[-3.8,e,2.8],'M-STAINLESS','folding clothes'),
        fixture(`${p}/LAUNDRY/LOCK`,'laundry basket lockers','PF-LOCKERS',[-5.55,e,3.3],'M-FABRIC-BLUE','short-term laundry storage',{yaw:PI/2,size:[1.0,1.75,.45]}),
        fixture(`${p}/LAUNDRY/BENCH`,'laundry waiting bench','PF-BENCH',[-2.0,e,3.15],'M-OAK','wait and fold clothes',{yaw:PI,size:[1.5,.84,.58]}),
        ...lightGrid(`${p}/LAUNDRY`,e,[[-4.8,2.0],[-2.6,2.0]],3800),
      ]),
      room(`${p}/STUDY`,'顶层自习室',east[2],'dorm',[
        doorway(`${p}/STUDY/TO-COR`,'west',[1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/STUDY/RUG`,'top-floor study rug','PF-WALL-RUN',[3.65,e+.018,2.05],'M-FABRIC-BLUE','acoustic study zone',{size:[4.25,.025,3.1],collision:'none'}),
        ...Array.from({length:6},(_,i)=>fixture(`${p}/STUDY/D${i+1}`,'study desk','PF-DORM-DESK',
          [3.0+(i%2)*1.8,e,.75+Math.floor(i/2)*1.30],'M-WOOD-DESK','quiet study with measured chair clearance',{yaw:Math.floor(i/2)===2?PI:0})),
        fixture(`${p}/STUDY/BOARD`,'top-floor planning wall','PF-WHITEBOARD',[3.65,e+1.55,3.84],'M-WHITEBOARD','exam schedules and tutoring',{yaw:PI,size:[2.8,1.05,.05]}),
        fixture(`${p}/STUDY/BOOK`,'top-floor reference shelf','PF-BOOKCASE',[5.72,e,3.22],'M-OAK-DARK','reference books',{yaw:-PI/2}),
        fixture(`${p}/STUDY/PLANT1`,'study plant','PF-PLANT',[1.65,e,3.3],'M-PLANT','quiet greenery'),
        ...lightGrid(`${p}/STUDY`,e,[[2.4,2.0],[4.8,2.0]],3500),
      ]),
      ...coreRooms(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false),...dormCorridorSet(p,e,level)],{occupancy:24}));
  }
  return {
    id:'B04',label:'学生宿舍',status:'new-interior',centreCampus:[36.5,-1],localBounds:[-6.5,6.5,-8,8],
    exteriorFootprint:{x0:30,x1:43,z0:-9,z1:7},floors:6,floorHeight:3.0,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'-1 + localZ'},
    portals:[{id:'B04/PUBLIC',campusAt:[30,-2],campusReturn:[27.4,-2,PI/2],localSpawn:[-5.2,0,-1,PI/2],placeKey:'campus_dorm_f1'}],
    facadeAlignment:{westWindows:{localX:-6.5,localZ:[-6,-3,0,3,6]},entrance:{side:'west',localAt:[-6.5,-1],width:2.6}},
    design:'Six-floor, 60-bed student residence conceived as a warm lived-in home: upholstered blue headwalls, large curtained windows, layered bedside lighting, rugs and pinboards in every twin room; a timber-and-plant arrival lobby; continuous acoustic corridor runners and floor-color bands; properly furnished lounges, parcel room, washrooms, lift lobbies and top-floor laundry/study club.',
    floorsPlan:floors,
  };
}

function b05CoreRooms(level,e,p) {
  return [
    room(`${p}/STAIR-W`,'西侧安全楼梯',[-6.6,-4.3,-5.6,-1.3],'service',[
      doorway(`${p}/STAIR-W/EXIT`,'west',[-7,e,-3.45],1.2,'campus-service',{emergencyOnly:true})
    ],[
      fixture(`${p}/STAIR-W/FIX`,'west protected stair','PF-STAIR',[-5.45,e,-3.45],'M-TERRAZZO','secondary protected egress',{size:[2.0,2.9,3.8]}),
      fixture(`${p}/STAIR-W/ACCENT`,'brick stair-landing feature','PF-WALL-RUN',[-4.335,e+1.42,-3.45],'M-BRICK','civic stair identity',{size:[.035,2.45,2.85],collision:'none'}),
      fixture(`${p}/STAIR-W/SIGN`,'protected-stair floor sign','PF-ROOM-SIGN',[-4.31,e+1.72,-3.45],'M-SCREEN','egress and floor identity',{yaw:-PI/2,size:[.72,.34,.04],text:`西楼梯 · ${level}层`}),
      fixture(`${p}/STAIR-W/COVE`,'stair landing light panel','PF-SCREEN',[-4.32,e+2.48,-3.45],'M-SCREEN','low-energy landing glow',{yaw:-PI/2,size:[1.6,.16,.035],collision:'none'}),
    ]),
    room(`${p}/LIFT-WC`,'电梯与卫生间',[-6.6,-4.3,1.3,5.6],'service',[],[
      fixture(`${p}/LIFT-WC/LIFT`,'accessible lift','PF-LIFT',[-5.55,e,2.45],'M-STEEL','accessible vertical circulation',{size:[1.55,2.45,1.55],levels:[1,2,3,4]}),
      fixture(`${p}/LIFT-WC/T1`,'accessible toilet','PF-TOILET',[-5.0,e,4.6],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${p}/LIFT-WC/B1`,'washbasin','PF-BASIN',[-6.0,e,4.75],'M-CERAMIC','hand washing'),
      fixture(`${p}/LIFT-WC/MIRROR`,'lift-lobby mirror','PF-WALL-RUN',[-4.335,e+1.48,2.45],'M-GLASS','accessible lift waiting mirror',{size:[.035,1.35,1.15],collision:'none'}),
      fixture(`${p}/LIFT-WC/FLOOR`,'lift-lobby floor marker','PF-ROOM-SIGN',[-4.31,e+1.70,3.62],'M-SCREEN','lift and accessible toilet identification',{yaw:-PI/2,size:[.68,.34,.04],text:`电梯 · ${level}层`}),
      fixture(`${p}/LIFT-WC/ACCENT`,'oak lift-lobby wall','PF-WALL-RUN',[-4.34,e+1.18,3.62],'M-OAK-DARK','warm lift-lobby identity',{size:[.035,2.05,1.35],collision:'none'}),
    ]),
    room(`${p}/STAIR-E`,'东侧安全楼梯',[4.0,6.6,1.3,5.6],'service',[
      doorway(`${p}/STAIR-E/EXIT`,'north',[5.3,e,6],1.2,'campus-service',{emergencyOnly:true})
    ],[
      fixture(`${p}/STAIR-E/FIX`,'east protected stair','PF-STAIR',[5.3,e,3.45],'M-TERRAZZO','primary protected egress',{size:[2.2,2.9,3.8]}),
      fixture(`${p}/STAIR-E/CLEAN`,'cleaning cupboard','PF-CLEANING',[4.35,e,5.0],'M-STEEL','janitorial storage'),
      fixture(`${p}/STAIR-E/ACCENT`,'oak stair-landing feature','PF-WALL-RUN',[4.035,e+1.42,3.45],'M-OAK-DARK','primary stair identity',{size:[.035,2.45,2.65],collision:'none'}),
      fixture(`${p}/STAIR-E/SIGN`,'primary stair floor sign','PF-ROOM-SIGN',[4.01,e+1.72,3.45],'M-SCREEN','egress and floor identity',{yaw:PI/2,size:[.72,.34,.04],text:`东楼梯 · ${level}层`}),
      fixture(`${p}/STAIR-E/COVE`,'stair landing light panel','PF-SCREEN',[4.02,e+2.48,3.45],'M-SCREEN','low-energy landing glow',{yaw:PI/2,size:[1.55,.16,.035],collision:'none'}),
    ]),
  ];
}

function b05DaylightSet(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,width=x1-x0,north=z0>0;
  const z=north?z1-.055:z0+.055,inside=north?-.026:.026,yaw=north?PI:0;
  const count=width>5?2:1,paneW=count===2?(width-.85)/2:width-.68;
  const xs=count===2?[cx-paneW/2-.10,cx+paneW/2+.10]:[cx],out=[];
  xs.forEach((x,i)=>out.push(
    fixture(`${prefix}/DAYLIGHT${i+1}`,'civic-office daylight panel','PF-SCREEN',[x,e+1.70,z],'M-SCREEN','campus daylight and civic outlook',{yaw,size:[paneW,1.18,.025],collision:'none'}),
    fixture(`${prefix}/GLASS${i+1}`,'laminated window face','PF-WALL-RUN',[x,e+1.70,z+inside],'M-GLASS','safe office glazing',{size:[paneW,1.18,.025],collision:'none'}),
  ));
  out.push(
    fixture(`${prefix}/WINDOW-SILL`,'oak display sill','PF-WALL-RUN',[cx,e+1.065,z+inside*1.7],'M-OAK','window ledge for civic objects',{size:[width-.36,.09,.14],collision:'none'}),
    fixture(`${prefix}/WINDOW-HEAD`,'brass window head datum','PF-WALL-RUN',[cx,e+2.34,z+inside*1.7],'M-BRASS','formal window framing',{size:[width-.36,.075,.08],collision:'none'}),
  );
  return out;
}

function b05CeilingSet(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,width=x1-x0;
  const xs=width>5?[cx-1.85,cx,cx+1.85]:[cx-1.0,cx+1.0];
  return xs.map((x,i)=>fixture(`${prefix}/RAFT${i+1}`,'perforated acoustic ceiling raft','PF-WALL-RUN',
    [x,e+2.84,cz],'M-ACOUSTIC','speech privacy and ceiling rhythm',{size:[1.52,.045,3.18],collision:'none'}));
}

function b05ServiceRoom(prefix,e,b,label) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,south=z1<0;
  const counterZ=south?z0+1.05:z1-1.05,nearZ=south?z1-.62:z0+.62,farZ=south?z1-1.62:z0+1.62;
  const face=south?0:PI,sideYaw=south?-PI/2:PI/2,wallZ=south?z0+.035:z1-.035;
  return [
    fixture(`${prefix}/RUG`,'service-zone acoustic inset','PF-WALL-RUN',[cx,e+.014,cz],'M-VINYL','quiet accessible service floor',{size:[3.55,.025,3.45],collision:'none'}),
    fixture(`${prefix}/COUNTER`,'accessible student service counter','PF-SERVICE-COUNTER',[cx,e,counterZ],'M-OAK','face-to-face accessible service',{yaw:face,size:[2.35,1.05,.82],text:label}),
    fixture(`${prefix}/WAIT1`,'service waiting bank A','PF-WAIT-CHAIRS',[cx,e,nearZ],'M-FABRIC-BLUE','three accessible-adjacent waiting seats',{yaw:face,size:[1.62,.84,.62]}),
    fixture(`${prefix}/WAIT2`,'service waiting bank B','PF-WAIT-CHAIRS',[cx,e,farZ],'M-FABRIC-BLUE','three waiting seats',{yaw:face,size:[1.62,.84,.62]}),
    fixture(`${prefix}/FILES`,'secure service files','PF-FILE-CABINET',[x0+.48,e,counterZ],'M-STEEL-DARK','protected student records',{yaw:sideYaw,size:[.82,1.45,.44]}),
    fixture(`${prefix}/KIOSK`,'service check-in kiosk','PF-SELF-CHECK',[x1-.52,e,nearZ],'M-SCREEN','appointment and queue check-in',{yaw:sideYaw}),
    fixture(`${prefix}/DIR`,'service information display','PF-DIRECTORY',[x0+.52,e,nearZ],'M-SCREEN','forms, languages and accessible route',{yaw:-sideYaw,size:[.76,1.48,.10],text:label}),
    fixture(`${prefix}/IDENTITY-BAND`,'oak service identity band','PF-WALL-RUN',[cx,e+2.47,wallZ],'M-OAK-DARK','department identity above service position',{size:[x1-x0-.38,.18,.045],collision:'none'}),
    fixture(`${prefix}/IDENTITY`,'bilingual department sign','PF-ROOM-SIGN',[cx,e+2.47,wallZ+(south?.03:-.03)],'M-SCREEN','service identity',{yaw:south?0:PI,size:[2.15,.30,.04],text:label}),
    fixture(`${prefix}/PLANT`,'service-room plant','PF-PLANT',[x1-.46,e,counterZ],'M-PLANT','welcoming civic service greenery'),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
    ...lightGrid(prefix,e,[[cx-1.3,cz],[cx+1.3,cz]],3500),
  ];
}

function b05DepartmentLayer(prefix,e,b,label,accent='M-FABRIC-BLUE') {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    fixture(`${prefix}/AISLE`,'quiet central office runner','PF-WALL-RUN',[cx,e+.014,cz],'M-RUBBER','organises shared workstations',{size:[.82,.025,2.75],collision:'none'}),
    fixture(`${prefix}/ART-BACK`,'framed department artwork','PF-WALL-RUN',[x0+.045,e+1.58,cz],accent,'department colour and civic artwork',{size:[.035,1.08,1.52],collision:'none'}),
    fixture(`${prefix}/ART`,'department mission display','PF-SCREEN',[x0+.022,e+1.58,cz],'M-SCREEN','department remit and student information',{yaw:PI/2,size:[1.25,.82,.035],collision:'none',text:label}),
    fixture(`${prefix}/PLATE`,'department identity plate','PF-ROOM-SIGN',[x0+.02,e+2.25,cz],'M-SCREEN','bilingual department identification',{yaw:PI/2,size:[1.15,.28,.04],text:label}),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
  ];
}

function b05MeetingLayer(prefix,e,b,label,{formal=false,pendant=false,daylight=true}={}) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,wallZ=z1-.035;
  const out=[
    fixture(`${prefix}/RUG`,'meeting-room woven inset','PF-WALL-RUN',[cx,e+.014,cz],formal?'M-FABRIC-RED':'M-FABRIC-BLUE','centres the meeting table',{size:[x1-x0-.5,.025,2.65],collision:'none'}),
    fixture(`${prefix}/FEATURE`,'acoustic meeting feature wall','PF-WALL-RUN',[cx,e+1.54,wallZ],formal?'M-OAK-DARK':'M-ACOUSTIC','formal presentation backdrop',{size:[x1-x0-.24,2.46,.035],collision:'none'}),
    fixture(`${prefix}/BRASS-DATUM`,'meeting-room brass datum','PF-WALL-RUN',[cx,e+2.58,wallZ-.025],'M-BRASS','civic detailing',{size:[x1-x0-.30,.08,.05],collision:'none'}),
    fixture(`${prefix}/NAME`,'meeting-room identity','PF-ROOM-SIGN',[x0+.48,e+2.28,wallZ-.045],'M-SCREEN','room identity',{yaw:PI,size:[1.45,.30,.04],text:label}),
    fixture(`${prefix}/PLANT`,'meeting-room plant','PF-PLANT',[x0+.45,e,z0+.48],'M-PLANT','softens formal meeting space'),
    ...b05CeilingSet(prefix,e,b),
  ];
  if(daylight)out.push(...b05DaylightSet(prefix,e,b));
  if(x1-x0>4)out.push(fixture(`${prefix}/CREDENZA`,'meeting-room reference credenza','PF-BOOKCASE',[x1-.48,e,z0+.50],'M-OAK-DARK','meeting papers and reference volumes',{yaw:-PI/2,size:[.82,1.45,.38]}));
  if(formal)out.push(
    fixture(`${prefix}/CREST`,'university crest panel','PF-ROOM-SIGN',[cx,e+2.17,wallZ-.055],'M-SCREEN','university governance identity',{yaw:PI,size:[1.65,.36,.04],text:'北京文华大学 · 校务'}),
    fixture(`${prefix}/FLAG`,'governance-room flag','PF-FLAG',[x1-.48,e+2.18,wallZ-.055],'M-SAFETY-RED','formal university identity',{yaw:PI}),
  );
  if(pendant)out.push(fixture(`${prefix}/PEND`,'brass meeting pendant','PF-PENDANT',[cx,e+2.48,cz],'M-BRASS','warm light over the meeting table',{temperatureK:3100,size:[.48,.32,.48]}));
  return out;
}

function b05RecordsRoom(prefix,e,b,{heritage=false}={}) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[
    fixture(`${prefix}/FLOOR`,'secure records floor inset','PF-WALL-RUN',[cx,e+.014,cz],heritage?'M-FABRIC-RED':'M-RUBBER','quiet secure records route',{size:[x1-x0-.35,.025,z1-z0-.35],collision:'none'}),
  ];
  const zs=[z0+.72,cz,z1-1.18];
  let n=0;
  for(const x of [x0+.36,x1-.36])for(const z of zs)out.push(fixture(`${prefix}/FILE${pad(++n)}`,
    heritage?'university-history archive cabinet':'secure records cabinet','PF-FILE-CABINET',[x,e,z],heritage?'M-OAK-DARK':'M-STEEL-DARK',
    heritage?'protected university-history collection':'protected university records',{yaw:x<cx?PI/2:-PI/2,size:[.88,1.78,.48]}));
  out.push(
    fixture(`${prefix}/SCAN`,'records digitisation workstation','PF-COMPUTER-DESK',[cx,e,z1-.67],'M-OAK','scanning and metadata entry',{yaw:0,size:[1.18,.76,.68]}),
    fixture(`${prefix}/TABLE`,'records consultation table','PF-MEETING-TABLE',[cx,e,z0+1.10],heritage?'M-OAK-DARK':'M-OAK','controlled document review',{size:[1.35,.74,.72]}),
    fixture(`${prefix}/STATUS`,'archive environmental and access display','PF-SCREEN',[x1-.025,e+1.55,cz],'M-SCREEN','temperature, access and retrieval status',{yaw:-PI/2,size:[1.20,.76,.04],collision:'none'}),
    fixture(`${prefix}/SIGN`,'restricted records sign','PF-ROOM-SIGN',[x1-.02,e+2.23,cz],'M-SCREEN','secure-room identity',{yaw:-PI/2,size:[.92,.30,.04],text:heritage?'校史档案 · RESTRICTED':'档案室 · RECORDS'}),
    fixture(`${prefix}/PLANT`,'archive reading plant','PF-PLANT',[x0+.48,e,z1-.48],'M-PLANT','softens the supervised consultation point'),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
    ...lightGrid(prefix,e,[[cx,cz]],3500),
  );
  if(heritage)out.push(
    fixture(`${prefix}/HERITAGE`,'illuminated university-history display','PF-SCREEN',[cx,e+2.16,z1-.075],'M-SCREEN','timeline, founders and university milestones',{yaw:PI,size:[2.25,.42,.04],collision:'none'}),
  );
  return out;
}

function b05Lobby(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    fixture(`${prefix}/THRESHOLD`,'internal lobby threshold mat','PF-WALL-RUN',[cx,e+.014,z1-.38],'M-RUBBER','weather and acoustic transition',{size:[2.2,.025,.64],collision:'none'}),
    fixture(`${prefix}/RUNNER`,'ceremonial arrival runner','PF-WALL-RUN',[cx,e+.012,-3.0],'M-FABRIC-BLUE','direct route from lobby door to reception',{size:[1.08,.02,2.7],collision:'none'}),
    fixture(`${prefix}/STONE-WALL`,'terrazzo ceremonial feature wall','PF-WALL-RUN',[cx,e+1.47,z0+.035],'M-TERRAZZO','durable civic arrival backdrop',{size:[x1-x0-.34,2.68,.04],collision:'none'}),
    fixture(`${prefix}/OAK-INLAY`,'ribbed oak welcome-wall inlay','PF-WALL-RUN',[cx,e+1.67,z0+.067],'M-OAK-DARK','warm university identity',{size:[3.95,1.48,.035],collision:'none'}),
    fixture(`${prefix}/BRASS-L`,'left brass feature trim','PF-WALL-RUN',[cx-2.18,e+1.48,z0+.086],'M-BRASS','ceremonial wall detailing',{size:[.055,2.48,.045],collision:'none'}),
    fixture(`${prefix}/BRASS-R`,'right brass feature trim','PF-WALL-RUN',[cx+2.18,e+1.48,z0+.086],'M-BRASS','ceremonial wall detailing',{size:[.055,2.48,.045],collision:'none'}),
    fixture(`${prefix}/WELCOME`,'administration-building welcome','PF-ROOM-SIGN',[cx,e+2.16,z0+.10],'M-SCREEN','university and building identity',{yaw:0,size:[3.3,.42,.04],text:'北京文华大学 · 行政楼'}),
    fixture(`${prefix}/INTERNATIONAL`,'international student centre sign','PF-ROOM-SIGN',[cx,e+1.72,z0+.10],'M-SCREEN','multilingual service identity',{yaw:0,size:[2.75,.30,.04],text:'国际学生中心 · INTERNATIONAL'}),
    fixture(`${prefix}/COUNTER`,'main accessible reception counter','PF-SERVICE-COUNTER',[cx,e,z0+1.48],'M-OAK','arrival, triage and accessible assistance',{yaw:0,size:[2.75,1.05,.84]}),
    fixture(`${prefix}/DIR`,'administration directory','PF-DIRECTORY',[x1-.52,e,z1-.88],'M-SCREEN','four-floor accessible wayfinding',{yaw:-PI/2,size:[.85,1.55,.10],text:'行政楼 · 国际学生中心'}),
    fixture(`${prefix}/TICKET`,'queue and appointment kiosk','PF-SELF-CHECK',[x0+.55,e,z1-.70],'M-SCREEN','service queue tickets and appointments',{yaw:PI/2}),
    fixture(`${prefix}/WAIT`,'upholstered reception waiting bank','PF-WAIT-CHAIRS',[x0+.55,e,-3.15],'M-FABRIC-BLUE','visitor waiting beside the clear route',{yaw:PI/2,size:[1.75,.84,.62]}),
    fixture(`${prefix}/NEWS`,'administration news display','PF-SCREEN',[x1-.055,e+1.56,-3.60],'M-SCREEN','deadlines, closures and university news',{yaw:-PI/2,size:[1.55,.90,.04],collision:'none'}),
    fixture(`${prefix}/AED`,'public AED','PF-AED',[x1-.16,e+1.20,z1-.38],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
    fixture(`${prefix}/FLAG`,'university ceremonial flag','PF-FLAG',[x0+.62,e+2.18,z0+.11],'M-SAFETY-RED','institutional identity',{yaw:0}),
    fixture(`${prefix}/CLOCK`,'public-service clock','PF-CLOCK',[x1-.62,e+2.28,z0+.11],'M-WALL-WHITE','appointment and class-change time',{yaw:0}),
    fixture(`${prefix}/PLANT-L`,'left lobby plant','PF-PLANT',[x0+.53,e,z0+.56],'M-PLANT','ceremonial arrival greenery'),
    fixture(`${prefix}/PLANT-R`,'right lobby plant','PF-PLANT',[x1-.53,e,z0+.56],'M-PLANT','ceremonial arrival greenery'),
    fixture(`${prefix}/PEND-L`,'left brass lobby pendant','PF-PENDANT',[cx-1.15,e+2.46,-3.22],'M-BRASS','warm layered reception lighting',{temperatureK:3000}),
    fixture(`${prefix}/PEND-R`,'right brass lobby pendant','PF-PENDANT',[cx+1.15,e+2.46,-3.22],'M-BRASS','warm layered reception lighting',{temperatureK:3000}),
    ...b05CeilingSet(prefix,e,b),
  ];
}

function b05WaitingRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    fixture(`${prefix}/RUG`,'visitor waiting rug','PF-WALL-RUN',[cx,e+.014,cz],'M-FABRIC-BLUE','defines a calm waiting zone',{size:[2.55,.025,3.55],collision:'none'}),
    fixture(`${prefix}/WAIT-W`,'west waiting bank','PF-WAIT-CHAIRS',[x0+.46,e,z0+1.12],'M-FABRIC-BLUE','three visitor seats beside clear approach',{yaw:PI/2,size:[1.65,.84,.62]}),
    fixture(`${prefix}/WAIT-E`,'east waiting bank','PF-WAIT-CHAIRS',[x1-.46,e,z1-1.08],'M-FABRIC-BLUE','three visitor seats',{yaw:-PI/2,size:[1.65,.84,.62]}),
    fixture(`${prefix}/TABLE`,'accessible form-writing table','PF-MEETING-TABLE',[cx,e,cz],'M-OAK','complete and review forms',{size:[1.35,.76,.76]}),
    fixture(`${prefix}/DISPLAY`,'forms and service-status display','PF-SCREEN',[x1-.025,e+1.55,cz],'M-SCREEN','forms, wait times and multilingual help',{yaw:-PI/2,size:[1.30,.82,.04],collision:'none'}),
    fixture(`${prefix}/WATER`,'visitor water dispenser','PF-WATER',[x1-.43,e,z0+.48],'M-STEEL','visitor hydration'),
    fixture(`${prefix}/PLANT`,'waiting-room plant','PF-PLANT',[x0+.48,e,z1-.46],'M-PLANT','calm public waiting greenery'),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
    ...lightGrid(prefix,e,[[cx,cz]],3400),
  ];
}

function b05ExecutiveLayer(prefix,e,b) {
  const cx=(b[0]+b[1])/2,cz=(b[2]+b[3])/2;
  return [
    fixture(`${prefix}/RUG-PRES`,'president office rug','PF-WALL-RUN',[2.22,e+.014,cz],'M-FABRIC-RED','formal executive work zone',{size:[2.25,.025,2.55],collision:'none'}),
    fixture(`${prefix}/RUG-VICE`,'vice-president office rug','PF-WALL-RUN',[5.05,e+.014,cz],'M-FABRIC-BLUE','executive work zone',{size:[2.20,.025,2.55],collision:'none'}),
    fixture(`${prefix}/DIV-S`,'executive privacy partition south','PF-WALL-RUN',[3.65,e+1.34,-4.72],'M-OAK-DARK','privacy between executive offices',{size:[.06,2.56,1.36],collision:'none'}),
    fixture(`${prefix}/DIV-N`,'executive privacy partition north','PF-WALL-RUN',[3.65,e+1.34,-2.18],'M-OAK-DARK','privacy between executive offices',{size:[.06,2.56,1.36],collision:'none'}),
    fixture(`${prefix}/DIV-HEAD`,'glazed executive partition transom','PF-WALL-RUN',[3.65,e+2.53,cz],'M-GLASS','daylight across executive suite',{size:[.06,.28,3.82],collision:'none'}),
    fixture(`${prefix}/GUEST-PRES`,'president visitor chair','PF-CHAIR',[2.22,e,-2.68],'M-FABRIC-RED','executive visitor seating',{yaw:0}),
    fixture(`${prefix}/GUEST-VICE`,'vice-president visitor chair','PF-CHAIR',[5.05,e,-2.68],'M-FABRIC-BLUE','executive visitor seating',{yaw:0}),
    fixture(`${prefix}/ART`,'executive civic-art display','PF-SCREEN',[b[1]-.025,e+1.60,cz],'M-SCREEN','university strategy and civic artwork',{yaw:-PI/2,size:[1.55,.92,.04],collision:'none'}),
    fixture(`${prefix}/BRASS`,'executive suite brass datum','PF-WALL-RUN',[cx,e+2.55,b[2]+.075],'M-BRASS','formal executive detailing',{size:[b[1]-b[0]-.35,.08,.05],collision:'none'}),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
  ];
}

function b05CompactMediaOffice(prefix,e,b) {
  const cx=(b[0]+b[1])/2,cz=(b[2]+b[3])/2;
  return [
    fixture(`${prefix}/DESK1`,'translation workstation','PF-OFFICE-DESK',[cx,e,b[2]+1.14],'M-OAK','translation and copy preparation',{yaw:0}),
    fixture(`${prefix}/DESK2`,'communications workstation','PF-OFFICE-DESK',[cx,e,b[3]-1.10],'M-OAK','media and university communications',{yaw:PI}),
    fixture(`${prefix}/FILES`,'communications file cabinet','PF-FILE-CABINET',[b[1]-.42,e,cz],'M-STEEL','approved communications records',{yaw:-PI/2,size:[.82,1.35,.44]}),
    fixture(`${prefix}/BOOK`,'style and language reference shelf','PF-BOOKCASE',[b[0]+.42,e,cz],'M-OAK-DARK','translation and brand references',{yaw:PI/2,size:[.82,1.75,.38]}),
    fixture(`${prefix}/MEDIA`,'media review screen','PF-SCREEN',[b[1]-.025,e+1.55,cz],'M-SCREEN','bilingual proofing and media review',{yaw:-PI/2,size:[1.28,.80,.04],collision:'none'}),
    fixture(`${prefix}/PLANT`,'communications office plant','PF-PLANT',[b[0]+.46,e,b[3]-.45],'M-PLANT','office greenery'),
    ...b05DaylightSet(prefix,e,b),
    ...b05CeilingSet(prefix,e,b),
    ...lightGrid(prefix,e,[[cx,cz]],3500),
  ];
}

function b05CorridorSet(prefix,e,level,labels) {
  const signs=[[-1.75,-1.22,0,labels[0]],[3.65,-1.22,0,labels[1]],[-1.75,1.22,PI,labels[2]],[2.25,1.22,PI,labels[3]]];
  const out=[
    fixture(`${prefix}/COR/RUNNER`,'administration corridor runner','PF-WALL-RUN',[0,e+.014,0],'M-RUBBER','quiet accessible civic route',{size:[12.65,.025,.62],collision:'none'}),
    fixture(`${prefix}/COR/COVE-S`,'south oak corridor datum','PF-WALL-RUN',[0,e+2.45,-1.085],'M-OAK-DARK','continuous civic corridor identity',{size:[12.7,.12,.035],collision:'none'}),
    fixture(`${prefix}/COR/COVE-N`,'north oak corridor datum','PF-WALL-RUN',[0,e+2.45,1.085],'M-OAK-DARK','continuous civic corridor identity',{size:[12.7,.12,.035],collision:'none'}),
    fixture(`${prefix}/COR/FLOOR`,'large administration floor marker','PF-ROOM-SIGN',[5.42,e+1.73,1.075],'M-SCREEN','orientation from the public entrance and lift',{yaw:PI,size:[1.55,.40,.04],text:`行政楼 · ${level}层`}),
    fixture(`${prefix}/COR/ART-W`,'west civic-art display','PF-SCREEN',[-3.35,e+1.56,1.075],'M-SCREEN','university people and public mission',{yaw:PI,size:[1.90,.80,.04],collision:'none'}),
    fixture(`${prefix}/COR/ART-C`,'central governance display','PF-SCREEN',[.35,e+1.56,-1.075],'M-SCREEN','services, governance and meeting schedule',{yaw:0,size:[1.55,.80,.04],collision:'none'}),
    fixture(`${prefix}/COR/ENTRY-MAT`,'east entrance mat','PF-WALL-RUN',[6.18,e+.016,0],'M-RUBBER','weather-protected public entry',{size:[1.28,.028,1.55],collision:'none'}),
    fixture(`${prefix}/COR/ENTRY-SIGN`,'public-entry welcome sign','PF-ROOM-SIGN',[5.42,e+1.66,-1.07],'M-SCREEN','points to reception and student services',{yaw:0,size:[1.68,.34,.04],text:'欢迎 · RECEPTION ←'}),
    fixture(`${prefix}/COR/PORTAL-JAMB-N`,'north oak entrance jamb','PF-WALL-RUN',[6.88,e+1.25,.84],'M-OAK-DARK','frames the public entrance',{size:[.08,2.50,.12],collision:'none'}),
    fixture(`${prefix}/COR/PORTAL-JAMB-S`,'south oak entrance jamb','PF-WALL-RUN',[6.88,e+1.25,-.84],'M-OAK-DARK','frames the public entrance',{size:[.08,2.50,.12],collision:'none'}),
    fixture(`${prefix}/COR/PORTAL-HEAD`,'oak entrance portal head','PF-WALL-RUN',[6.88,e+2.48,0],'M-OAK-DARK','frames the public entrance',{size:[.08,.14,1.78],collision:'none'}),
    fixture(`${prefix}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-3.5,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
    fixture(`${prefix}/COR-L2`,'corridor light centre','PF-CEILING-LIGHT',[1.0,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
    fixture(`${prefix}/COR-L3`,'corridor light entry','PF-CEILING-LIGHT',[5.0,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
  ];
  signs.forEach(([x,z,yaw,text],i)=>out.push(fixture(`${prefix}/COR/ROOM-SIGN${i+1}`,'bilingual administration room sign','PF-ROOM-SIGN',
    [x+.62,e+1.60,z],'M-SCREEN','room identity from the corridor',{yaw,size:[.86,.30,.04],text})));
  for(const [i,x] of [-4.75,-1.6,1.55,4.70].entries())out.push(fixture(`${prefix}/COR/RAFT${i+1}`,'corridor acoustic ceiling raft','PF-WALL-RUN',
    [x,e+2.84,0],'M-ACOUSTIC','speech privacy in public circulation',{size:[2.65,.045,1.55],collision:'none'}));
  return out;
}

function buildB05() {
  const floors=[];
  const A=[-4.0,.5,-5.6,-1.3],B=[.7,6.6,-5.6,-1.3],C=[-4.0,.5,1.3,5.6],D=[.7,3.8,1.3,5.6];
  const specs=[
    {level:1,rooms:[
      ['A','学生证与注册',A,'service',b=>b05ServiceRoom('B05/F1/A',0,b,'学生证 · 注册')],
      ['B','入口门厅与总服务台',B,'lobby',b=>b05Lobby('B05/F1/B',0,b)],
      ['C','国际学生咨询',C,'service',b=>b05ServiceRoom('B05/F1/C',0,b,'国际学生咨询')],
      ['D','等候与材料填写',D,'public',b=>b05WaitingRoom('B05/F1/D',0,b)],
    ]},
    {level:2,rooms:[
      ['A','财务处',A,'office',b=>[...officeRoom('B05/F2/A',3.1,b,4,'财务处'),...b05DepartmentLayer('B05/F2/A',3.1,b,'财务处','M-FABRIC-RED')]],
      ['B','人事处',B,'office',b=>[...officeRoom('B05/F2/B',3.1,b,4,'人事处'),...b05DepartmentLayer('B05/F2/B',3.1,b,'人事处','M-FABRIC-BLUE')]],
      ['C','教务处',C,'office',b=>[...officeRoom('B05/F2/C',3.1,b,4,'教务处'),...b05DepartmentLayer('B05/F2/C',3.1,b,'教务处','M-OAK')]],
      ['D','档案室',D,'service',b=>b05RecordsRoom('B05/F2/D',3.1,b)],
    ]},
    {level:3,rooms:[
      ['A','培训室',A,'office',b=>[...seminarRoom('B05/F3/A',6.2,b),...b05MeetingLayer('B05/F3/A',6.2,b,'培训室',{pendant:true})]],
      ['B','综合行政办公室',B,'office',b=>[...officeRoom('B05/F3/B',6.2,b,4,'综合行政'),...b05DepartmentLayer('B05/F3/B',6.2,b,'综合行政','M-FABRIC-BLUE')]],
      ['C','院系联络办公室',C,'office',b=>[...officeRoom('B05/F3/C',6.2,b,4,'院系联络'),...b05DepartmentLayer('B05/F3/C',6.2,b,'院系联络','M-OAK')]],
      ['D','国际项目会议室',D,'office',b=>[...seminarRoom('B05/F3/D',6.2,b),...b05MeetingLayer('B05/F3/D',6.2,b,'国际项目会议室',{daylight:false})]],
    ]},
    {level:4,rooms:[
      ['A','校务会议室',A,'office',b=>[...seminarRoom('B05/F4/A',9.3,b),...b05MeetingLayer('B05/F4/A',9.3,b,'校务会议室',{formal:true,pendant:true})]],
      ['B','校长与副校长办公室',B,'office',b=>[
        ...officeRoom('B05/F4/B/PRES',9.3,[.9,3.55,-5.35,-1.55],1,'校长办公室'),
        ...officeRoom('B05/F4/B/VICE',9.3,[3.75,6.35,-5.35,-1.55],1,'副校长办公室'),
        ...b05ExecutiveLayer('B05/F4/B',9.3,b),
      ]],
      ['C','校史与机要档案',C,'service',b=>b05RecordsRoom('B05/F4/C',9.3,b,{heritage:true})],
      ['D','宣传与翻译',D,'office',b=>b05CompactMediaOffice('B05/F4/D',9.3,b)],
    ]},
  ];
  for(const spec of specs) {
    const e=(spec.level-1)*3.1,p=`B05/F${spec.level}`,rooms=[];
    for(const [key,label,b,kind,make] of spec.rooms) {
      const corridorSide=b[3]<0?'north':'south';
      const corridorZ=corridorSide==='north'?b[3]:b[2];
      const doors=[doorway(`${p}/${key}/D`,corridorSide,[(b[0]+b[1])/2,e,corridorZ],1.0,`${p}/CORRIDOR`)];
      if(spec.level===1&&key==='B') doors.push(doorway(`${p}/${key}/EXT`,'east',[7,e,0],3.2,'campus',{portal:true}));
      rooms.push(room(`${p}/${key}`,label,b,kind==='service'?'office':kind==='lobby'?'public':'office',doors,make(b),{programme:kind}));
    }
    rooms.push(...b05CoreRooms(spec.level,e,p));
    const shared=[
      ...safetySet(p,e,[-4.15,-.75],[5.8,0],spec.level,spec.level===1),
      ...b05CorridorSet(p,e,spec.level,spec.rooms.map(r=>r[1])),
    ];
    floors.push(floor(spec.level,e,3.1,rooms,[{id:`${p}/CORRIDOR`,bounds:[-6.6,6.6,-1.1,1.1],clearWidth:2.2,surface:'M-TERRAZZO'}],shared,{occupancy:spec.level===1?70:45}));
  }
  return {
    id:'B05',label:'行政楼 · 国际学生中心',status:'new-interior',centreCampus:[-36,30],localBounds:[-7,7,-6,6],
    exteriorFootprint:{x0:-43,x1:-29,z0:24,z1:36},floors:4,floorHeight:3.1,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-36 + localX',worldZ:'30 + localZ'},
    portals:[{id:'B05/PUBLIC',campusAt:[-29,30],campusReturn:[-26.6,30,-PI/2],localSpawn:[5.6,0,0,-PI/2],placeKey:'campus_admin_f1'}],
    facadeChanges:[{id:'B05/EXIT-W','instruction':'Add a 1.20 m protected-stair discharge on west wall at campus (-43,26.55).'},
      {id:'B05/EXIT-N','instruction':'Add a 1.20 m protected-stair discharge on north wall at campus (-30.7,36).'}],
    facadeAlignment:{eastWindows:{localX:7,localZ:[-4.5,-1.5,1.5,4.5]},entrance:{side:'east',localAt:[7,0],width:3.2}},
    design:'A polished four-floor civic university interior: a terrazzo, oak and brass ceremonial reception; accessible student and international services; quiet department offices with daylight, acoustic rafts and department art; formal training and international meeting rooms; and a distinguished governance floor with executive suite, council room and illuminated university-history archive. Continuous blue bilingual wayfinding, protected stairs and clear accessible circulation unify every level.',
    floorsPlan:floors,
  };
}

function b06Decor(id,label,at,material,size,purpose,extra={}) {
  return fixture(id,label,'PF-WALL-RUN',at,material,purpose,{size,collision:'none',...extra});
}

function b06Sign(id,label,at,text,purpose,extra={}) {
  return fixture(id,label,'PF-ROOM-SIGN',at,'M-SCREEN',purpose,
    {text,size:[1.75,.34,.05],collision:'none',...extra});
}

function b06LabCeiling(prefix,e,rows,temperatureK=4200,accent='M-LAB-BLUE') {
  const out=[];
  rows.forEach(([x,z,w=4.6,d=.62],i)=>out.push(
    b06Decor(`${prefix}/SERVICE${pad(i+1)}`,'color-coded laboratory service spine',
      [x,e+3.30,z],accent,[w,.10,d],'overhead power, data and piped-service organization'),
    fixture(`${prefix}/LIGHT${pad(i+1)}`,'sealed high-CRI laboratory light','PF-CEILING-LIGHT',
      [x,e+3.22,z],'M-WALL-WHITE','shadow-controlled laboratory lighting',
      {temperatureK,lumens:3200,size:[Math.min(2.6,w*.62),.06,.28]}),
  ));
  return out;
}

function b06RoomFront(prefix,e,b,text,accent='M-LAB-BLUE') {
  const [x0,x1,z0,z1]=b,west=x1<0,x=west?x1-.035:x0+.035,z=z0+.92,yaw=west?-PI/2:PI/2;
  return [
    b06Decor(`${prefix}/OBS-GLASS`,'glazed corridor observation panel',[x,e+1.62,z],
      'M-GLASS',[.045,2.62,1.44],'safe views into active science teaching'),
    b06Decor(`${prefix}/OBS-RAIL`,'observation-panel safety rail',[x+(west?-.018:.018),e+.62,z],
      accent,[.065,.10,1.52],'color-coded laboratory identity and glazing protection'),
    b06Sign(`${prefix}/ROOM-SIGN`,'bilingual laboratory identity',[x,e+2.68,z+1.05],text,
      'room identity and hazard-controlled wayfinding',{yaw,size:[2.0,.36,.05]}),
  ];
}

function b06CoreRooms(level,e,p) {
  const sw=[-7.1,-4.4,-10.6,-6.3],ne=[1.1,7.1,4.7,10.6];
  return [
    room(`${p}/STAIR-SW`,'西南安全楼梯',sw,'service',[doorway(`${p}/STAIR-SW/EXIT`,'west',[-7.5,e,-8.45],1.2,'campus-service',{emergencyOnly:true})],[
      fixture(`${p}/STAIR-SW/FIX`,'southwest protected stair','PF-STAIR',[-5.75,e,-8.45],'M-TERRAZZO','secondary egress',{size:[2.4,3.3,3.8]}),
      fixture(`${p}/STAIR-SW/CLEAN`,'cleaning cupboard','PF-CLEANING',[-4.75,e,-6.8],'M-STEEL','janitorial storage'),
      b06Decor(`${p}/STAIR-SW/STRIPE`,'high-contrast stair threshold',[-7.0,e+.02,-8.45],
        'M-SAFETY-YELLOW',[.18,.025,2.3],'visual and tactile egress warning'),
      b06Sign(`${p}/STAIR-SW/SIGN`,'southwest stair identity',[-4.45,e+1.65,-8.45],
        `西南楼梯 · SW STAIR · ${level}F`,'protected-egress wayfinding',{yaw:-PI/2,size:[1.9,.34,.05]}),
    ]),
    room(`${p}/CORE-NE`,'玻璃楼梯 · 电梯 · 卫生间',ne,'service',[],[
      fixture(`${p}/CORE-NE/STAIR`,'glass-tower protected stair','PF-STAIR',[5.1,e,7.65],'M-TERRAZZO','primary protected egress',{size:[3.2,3.3,5.2]}),
      fixture(`${p}/CORE-NE/LIFT`,'accessible lift','PF-LIFT',[2.15,e,8.9],'M-STEEL','accessible vertical circulation',{levels:[1,2,3,4]}),
      fixture(`${p}/CORE-NE/T1`,'accessible toilet','PF-TOILET',[2.2,e,6.0],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${p}/CORE-NE/B1`,'washbasin','PF-BASIN',[3.25,e,5.45],'M-CERAMIC','hand washing'),
      fixture(`${p}/CORE-NE/ELEC`,'floor services cabinet','PF-FILE-CABINET',[6.55,e,10.1],'M-STEEL-DARK','electrical and laboratory services',{size:[.65,1.8,.35]}),
      b06Decor(`${p}/CORE-NE/GLASS`,'full-height glass stair-tower reveal',[7.04,e+1.72,7.7],
        'M-GLASS',[.05,3.15,4.75],'daylight and a visible science-building stair'),
      b06Decor(`${p}/CORE-NE/BLUE`,'blue lift-and-stair portal',[1.16,e+1.62,8.4],
        'M-LAB-BLUE',[.06,2.85,3.7],'vertical circulation identity'),
      b06Sign(`${p}/CORE-NE/LEVEL`,'large floor marker',[1.12,e+2.65,6.2],
        `${level}层 · SCIENCE ${level}F`,'lift and stair floor confirmation',{yaw:PI/2,size:[1.9,.4,.05]}),
    ]),
  ];
}

function scienceSupportRoom(prefix,e,b,kind) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[];
  if(kind==='lobby') out.push(
    fixture(`${prefix}/DESK`,'science reception desk','PF-SERVICE-COUNTER',[cx,e,z0+1.2],'M-LAB-BLUE','arrival and lab access',{yaw:0}),
    fixture(`${prefix}/DIR`,'science building directory','PF-DIRECTORY',[x1-.65,e,z1-.8],'M-SCREEN','laboratory wayfinding',{text:'科学与创新楼 · 实验楼'}),
    fixture(`${prefix}/CASE1`,'innovation display case','PF-BOOKCASE',[x0+.55,e,z1-.8],'M-GLASS','student innovation display',{size:[1.2,1.7,.55]}),
    fixture(`${prefix}/CASE2`,'innovation display case','PF-BOOKCASE',[x0+.55,e,z1-2.2],'M-GLASS','student innovation display',{size:[1.2,1.7,.55]}),
    fixture(`${prefix}/AED`,'public AED','PF-AED',[x1-.15,e+1.2,z0+.65],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
  );
  else if(kind==='prep') out.push(
    fixture(`${prefix}/P1`,'preparation table A','PF-PREP-TABLE',[cx-1.6,e,cz-1.6],'M-STAINLESS','laboratory preparation'),
    fixture(`${prefix}/P2`,'preparation table B','PF-PREP-TABLE',[cx+1.6,e,cz-1.6],'M-STAINLESS','laboratory preparation'),
    fixture(`${prefix}/SINK`,'double preparation sink','PF-SINK-DOUBLE',[x0+.65,e,z1-.9],'M-STAINLESS','equipment washing',{yaw:PI/2}),
    fixture(`${prefix}/FRIDGE`,'laboratory refrigerator','PF-MED-FRIDGE',[x1-.55,e,z1-.55],'M-CLINIC','samples and reagents'),
    fixture(`${prefix}/SHELF1`,'preparation shelf A','PF-SHELF',[x0+.6,e,z0+.65],'M-STEEL','laboratory supplies'),
    fixture(`${prefix}/SHELF2`,'preparation shelf B','PF-SHELF',[x1-.6,e,z0+.65],'M-STEEL','laboratory supplies'),
  );
  else if(kind==='store') out.push(
    fixture(`${prefix}/CAB1`,'flammable-material cabinet','PF-FILE-CABINET',[x0+.65,e,z0+.7],'M-SAFETY-YELLOW','segregated flammable storage',{size:[.9,1.9,.6]}),
    fixture(`${prefix}/CAB2`,'corrosives cabinet','PF-FILE-CABINET',[x0+1.8,e,z0+.7],'M-LAB-BLUE','segregated corrosives storage',{size:[.9,1.9,.6]}),
    fixture(`${prefix}/SHELF1`,'locked laboratory shelf A','PF-SHELF',[x1-.55,e,z0+1.0],'M-STEEL','controlled supplies',{yaw:-PI/2}),
    fixture(`${prefix}/SHELF2`,'locked laboratory shelf B','PF-SHELF',[x1-.55,e,z0+2.2],'M-STEEL','controlled supplies',{yaw:-PI/2}),
    fixture(`${prefix}/SPILL`,'spill-response cabinet','PF-FIRST-AID',[x0+.15,e+1.2,z1-.65],'M-SAFETY-YELLOW','spill response',{yaw:PI/2}),
  );
  else if(kind==='cold') out.push(
    fixture(`${prefix}/F1`,'sample refrigerator','PF-MED-FRIDGE',[x0+.6,e,z0+.6],'M-CLINIC','chilled samples'),
    fixture(`${prefix}/F2`,'sample freezer','PF-FREEZER',[x0+1.55,e,z0+.6],'M-STAINLESS','frozen samples'),
    fixture(`${prefix}/P1`,'sample preparation table','PF-PREP-TABLE',[cx,e,cz],'M-STAINLESS','sample handling'),
    fixture(`${prefix}/S1`,'sample shelving','PF-SHELF',[x1-.55,e,z1-.7],'M-STEEL','sealed sample storage'),
  );
  if(kind==='lobby') out.push(
    b06Decor(`${prefix}/WELCOME`,'blue science welcome wall',[cx,e+1.55,z1-.055],
      'M-LAB-BLUE',[4.7,2.75,.06],'strong arrival backdrop for the science building'),
    b06Sign(`${prefix}/WELCOME-SIGN`,'science and innovation identity',[cx,e+2.35,z1-.09],
      '科学与创新楼 · SCIENCE & INNOVATION','primary bilingual building identity',{yaw:PI,size:[3.8,.46,.05]}),
    b06Decor(`${prefix}/INLAY`,'brass circuit floor inlay',[cx,e+.018,cz],
      'M-BRASS',[4.6,.022,.08],'arrival axis inspired by a circuit trace'),
    fixture(`${prefix}/BENCH`,'science lobby waiting bench','PF-BENCH',[x1-1.35,e,z1-.62],
      'M-FABRIC-BLUE','visitor and student waiting',{size:[1.85,.46,.58]}),
    fixture(`${prefix}/PLANT`,'science lobby specimen plant','PF-PLANT',[x1-.48,e,z0+.48],
      'M-PLANT','biophilic contrast to technical finishes'),
    fixture(`${prefix}/DEMO`,'student prototype showcase','PF-ROBOTICS',[x0+1.35,e,z1-.72],
      'M-STEEL-DARK','visible student-built robot and prototype display',{size:[1.6,.92,.72]}),
  );
  if(kind==='prep') out.push(
    b06Decor(`${prefix}/CLEAN-ZONE`,'clean preparation floor zone',[cx-1.65,e+.018,cz+1.4],
      'M-EPOXY',[2.6,.022,3.2],'clean preparation workflow',{opacity:.72}),
    b06Decor(`${prefix}/DIRTY-ZONE`,'receiving and wash floor zone',[cx+1.65,e+.018,cz-1.4],
      'M-TILE-DARK',[2.6,.022,3.2],'dirty receiving and wash workflow',{opacity:.72}),
    fixture(`${prefix}/CART`,'receiving cart','PF-SHELF',[x1-.65,e,z0+2.1],
      'M-STEEL','incoming equipment and consumables',{size:[.85,1.15,.52]}),
    b06Sign(`${prefix}/FLOW`,'clean/dirty workflow sign',[cx,e+1.6,z1-.07],
      '清洁准备 ←  ·  清洗收货 →','preparation-room workflow',{yaw:PI,size:[2.7,.34,.05]}),
  );
  if(kind==='store') out.push(
    b06Decor(`${prefix}/CAGE`,'glazed locked chemical-store screen',[cx,e+1.5,z1-.10],
      'M-GLASS',[4.7,2.7,.06],'visible but access-controlled chemical segregation'),
    b06Decor(`${prefix}/HAZARD-BAND`,'yellow chemical hazard band',[cx,e+.72,z1-.14],
      'M-SAFETY-YELLOW',[4.7,.14,.08],'continuous chemical-store warning'),
    b06Sign(`${prefix}/HAZARD-SIGN`,'chemical segregation sign',[cx,e+2.4,z1-.16],
      '易燃 · 腐蚀 · 氧化剂分区','chemical compatibility and storage warning',{yaw:PI,size:[2.8,.36,.05]}),
  );
  if(kind==='cold') out.push(
    fixture(`${prefix}/MONITOR`,'sample-room environmental monitor','PF-DIRECTORY',[x1-.55,e,z0+.65],
      'M-SCREEN','temperature, freezer and access status',{text:'4°C · −20°C · 样品追踪',collision:'none'}),
    b06Decor(`${prefix}/COLD-BAND`,'cool-blue sample-room identity band',[cx,e+2.55,z1-.08],
      'M-LAB-BLUE',[4.8,.32,.06],'cold-room identity and service concealment'),
    b06Sign(`${prefix}/COLD-SIGN`,'sample-chain sign',[cx,e+2.55,z1-.11],
      '样品链 · SAMPLE CHAIN','cold-chain workflow',{yaw:PI,size:[2.4,.3,.05]}),
  );
  out.push(...b06RoomFront(prefix,e,b,kind==='lobby'?'科学门厅':kind==='prep'?'准备与收货':kind==='store'?'化学品储藏':'样品冷藏',
    kind==='cold'?'M-SCREEN':'M-LAB-BLUE'));
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,[[cx-1.55,cz,2.4,.62],[cx+1.55,cz,2.4,.62]],4200));
  return out;
}

function b06LabRoom(prefix,e,b,kind,label,variant=kind) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,depth=z1-z0;
  const prefab=kind==='robotics'?'PF-ROBOTICS':kind==='microscopy'?'PF-MICROSCOPE':'PF-LAB-BENCH';
  const material=kind==='robotics'||kind==='physics'?'M-STEEL-DARK':kind==='biology'||kind==='microscopy'?'M-CLINIC':'M-LAB-BLUE';
  const rows=depth<7?[z0+1.75,z1-1.75]:[z0+1.75,cz,z1-1.75],out=[
    fixture(`${prefix}/BOARD`,'interactive laboratory teaching board','PF-WHITEBOARD',[cx,e+1.7,z1-.08],
      'M-WHITEBOARD','procedures, live data and teaching notes',{yaw:PI,size:[3.9,1.25,.08]}),
    fixture(`${prefix}/PPE`,'PPE and lab-coat lockers','PF-LOCKERS',[x0+.68,e,z0+.48],
      'M-LAB-BLUE','coats, goggles and gloves',{size:[1.25,1.9,.5]}),
    fixture(`${prefix}/EYE`,'eyewash and safety shower','PF-EYEWASH',[x1-.58,e,z0+.52],
      'M-SAFETY-YELLOW','emergency decontamination'),
    fixture(`${prefix}/SINK`,'laboratory sink','PF-LAB-SINK',[x0+.52,e,z1-.62],
      'M-STAINLESS','hand and equipment washing',{yaw:PI/2}),
    fixture(`${prefix}/WASTE`,'segregated laboratory waste','PF-BIN',[x1-.48,e,z1-.48],
      kind==='chemistry'?'M-SAFETY-YELLOW':'M-STEEL','controlled laboratory waste stream'),
    b06Decor(`${prefix}/PPE-ZONE`,'PPE threshold floor zone',[cx,e+.018,z0+.52],
      'M-LAB-BLUE',[3.2,.022,.78],'clear gowning and emergency-equipment threshold'),
    ...b06RoomFront(prefix,e,b,label,material),
  ];
  let n=0;
  for(const z of rows) for(const x of [cx-1.55,cx+1.55]) {
    out.push(fixture(`${prefix}/BENCH${pad(++n)}`,kind==='robotics'?'robotics and fabrication bench':
      kind==='microscopy'?'digital microscope station':`${kind} laboratory island`,prefab,[x,e,z],material,
      `${kind} practical work`,{yaw:0,size:kind==='microscopy'?[1.35,.92,.76]:undefined}));
    if(!['robotics','microscopy'].includes(kind)) out.push(fixture(`${prefix}/STOOL${pad(n)}`,
      'height-adjustable laboratory stool','PF-STOOL',[x,e,z-.69],'M-STEEL','student practical-work seat'));
  }
  if(kind==='chemistry') out.push(
    fixture(`${prefix}/HOOD1`,'variable-air-volume fume hood','PF-FUME-HOOD',[x0+.70,e,z0+2.0],
      'M-STAINLESS','contained chemical work',{yaw:PI/2}),
    fixture(`${prefix}/HOOD2`,'variable-air-volume fume hood','PF-FUME-HOOD',[x0+.70,e,z1-2.0],
      'M-STAINLESS','contained chemical work',{yaw:PI/2}),
    fixture(`${prefix}/REAGENT`,'working reagent cabinet','PF-FILE-CABINET',[x1-.62,e,z1-1.25],
      'M-SAFETY-YELLOW','small-volume compatible reagents',{size:[.85,1.5,.48]}),
    b06Decor(`${prefix}/GAS-RAIL`,'yellow piped-gas service rail',[cx,e+2.72,z1-.10],
      'M-SAFETY-YELLOW',[4.5,.12,.08],'visible isolated chemistry services'),
  );
  if(variant==='analytical') out.push(
    fixture(`${prefix}/INSTRUMENT1`,'spectrometry workstation','PF-COMPUTER-DESK',[x1-1.18,e,z1-.72],
      'M-STEEL-DARK','instrument control and analytical data'),
    fixture(`${prefix}/INSTRUMENT2`,'chromatography workstation','PF-COMPUTER-DESK',[x1-2.58,e,z1-.72],
      'M-STEEL-DARK','instrument control and analytical data'),
    b06Sign(`${prefix}/METHODS`,'analytical methods display',[cx,e+2.35,z1-.12],
      '光谱 · 色谱 · 质量分析','analytical chemistry methods',{yaw:PI,size:[2.7,.34,.05]}),
  );
  if(variant==='organic') out.push(
    fixture(`${prefix}/HOOD3`,'organic synthesis fume hood','PF-FUME-HOOD',[x0+.70,e,cz],
      'M-STAINLESS','contained organic synthesis',{yaw:PI/2}),
    fixture(`${prefix}/FLAMMABLE`,'flammable-solvent cabinet','PF-FILE-CABINET',[x1-.62,e,z1-2.25],
      'M-SAFETY-YELLOW','compatible solvent storage',{size:[.85,1.5,.48]}),
    b06Decor(`${prefix}/AMBER-BAND`,'amber organic-lab service band',[cx,e+2.48,z1-.11],
      'M-BRASS',[4.5,.12,.08],'organic chemistry identity and exhaust coordination'),
  );
  if(variant==='foundation') out.push(
    fixture(`${prefix}/DEMO-SCREEN`,'foundation experiment display','PF-SCREEN',[cx,e+1.85,z1-.07],
      'M-SCREEN','live titration and reaction demonstration',{yaw:PI,size:[2.7,1.3,.06]}),
    fixture(`${prefix}/MODEL-SHELF`,'molecular model shelf','PF-SHELF',[x1-.55,e,z1-2.35],
      'M-LAB-BLUE','molecular kits and introductory apparatus'),
  );
  if(kind==='biology') out.push(
    fixture(`${prefix}/FRIDGE`,'sample refrigerator','PF-MED-FRIDGE',[x1-.55,e,z1-1.2],
      'M-CLINIC','temperature-controlled samples'),
    fixture(`${prefix}/FREEZER`,'teaching sample freezer','PF-FREEZER',[x1-.55,e,z1-2.15],
      'M-STAINLESS','frozen teaching specimens'),
    b06Decor(`${prefix}/BIO-RAIL`,'green biological-services rail',[cx,e+2.72,z1-.10],
      'M-WALL-GREEN',[4.5,.12,.08],'biology floor identity and clean service route'),
  );
  if(variant==='microbiology') out.push(
    fixture(`${prefix}/HANDWASH`,'dedicated microbiology handwash','PF-HANDWASH',[x1-.55,e,z0+1.45],
      'M-STAINLESS','controlled entry hand hygiene'),
    fixture(`${prefix}/CULTURE`,'culture incubation cabinet','PF-FILE-CABINET',[x1-1.45,e,z1-1.15],
      'M-CLINIC','contained teaching cultures',{size:[.82,1.65,.52]}),
    b06Sign(`${prefix}/BIOLEVEL`,'microbiology practice sign',[cx,e+2.35,z1-.13],
      '无菌操作 · 受控培养','aseptic workflow and culture control',{yaw:PI,size:[2.7,.34,.05]}),
  );
  if(kind==='microscopy') out.push(
    fixture(`${prefix}/IMAGE`,'live microscope image wall','PF-SCREEN',[cx,e+1.75,z1-.07],
      'M-SCREEN','shared digital specimen view',{yaw:PI,size:[3.0,1.55,.06]}),
    fixture(`${prefix}/SPECIMEN`,'prepared-slide archive','PF-FILE-CABINET',[x1-.55,e,z1-1.1],
      'M-STEEL-DARK','indexed teaching slides',{size:[.9,1.45,.5]}),
    b06Decor(`${prefix}/DIM-BAND`,'dimmable dark microscopy wall band',[cx,e+2.72,z1-.11],
      'M-STEEL-DARK',[4.6,.20,.08],'glare control and microscopy identity'),
  );
  if(kind==='physics') out.push(
    fixture(`${prefix}/APPARATUS`,'physics apparatus shelving','PF-SHELF',[x1-.55,e,z1-1.25],
      'M-STEEL','optics, mechanics and electrical kits'),
    fixture(`${prefix}/DATA`,'instrument data workstation','PF-COMPUTER-DESK',[x1-1.15,e,z0+.75],
      'M-STEEL-DARK','oscilloscope and sensor data capture'),
    b06Decor(`${prefix}/OPTICS`,'dark optics demonstration strip',[cx,e+.02,cz],
      'M-STEEL-DARK',[.16,.025,depth-2.1],'aligned optics and mechanics demonstration axis'),
  );
  if(kind==='robotics') out.push(
    fixture(`${prefix}/CAD`,'CAD and machine-control workstation','PF-COMPUTER-DESK',[x1-1.15,e,z1-.85],
      'M-STEEL-DARK','robot design and fabrication control'),
    fixture(`${prefix}/TOOLS`,'maker tool and material rack','PF-SHELF',[x0+.58,e,z1-.75],
      'M-STEEL','hand tools, filament and electronics'),
    b06Decor(`${prefix}/TEST-MAT`,'robot test and calibration floor',[cx,e+.018,cz],
      'M-RUBBER',[3.1,.022,2.6],'safe mobile-robot demonstration zone'),
    b06Decor(`${prefix}/TOOL-WALL`,'blue maker tool wall',[cx,e+1.55,z1-.075],
      'M-LAB-BLUE',[4.2,2.55,.06],'visible organized fabrication tools'),
  );
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,rows.map(z=>[cx,z,4.7,.62]),
    kind==='microscopy'?3600:kind==='robotics'?4000:4300,material));
  return out;
}

function b06SafetyStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    fixture(`${prefix}/SCREEN`,'large safety demonstration screen','PF-SCREEN',[cx,e+1.7,z1-.07],
      'M-SCREEN','hazard induction and live demonstrations',{yaw:PI,size:[3.8,1.8,.06]}),
    fixture(`${prefix}/DEMO`,'instructor demonstration bench','PF-LAB-BENCH',[cx,e,z1-1.15],
      'M-LAB-BLUE','safe instructor-led laboratory demonstrations',{size:[3.0,.92,.85]}),
    fixture(`${prefix}/PODIUM`,'science teaching podium','PF-TEACHER-PODIUM',[x0+1.0,e,z1-1.15],
      'M-STEEL-DARK','safety induction controls'),
    fixture(`${prefix}/PPE`,'visitor PPE lockers','PF-LOCKERS',[x1-.65,e,z0+.6],
      'M-LAB-BLUE','goggles and visitor lab coats',{size:[1.2,1.9,.5]}),
    fixture(`${prefix}/EYE`,'training eyewash and shower','PF-EYEWASH',[x0+.55,e,z0+.6],
      'M-SAFETY-YELLOW','hands-on emergency-equipment induction'),
    ...b06RoomFront(prefix,e,b,'安全培训 · SAFETY DEMO','M-SAFETY-YELLOW'),
  ];
  let n=0;
  for(const z of [z0+2.1,z0+3.65,z0+5.2]) for(const x of [x0+1.35,cx,x1-1.35])
    out.push(fixture(`${prefix}/SEAT${pad(++n)}`,'safety induction seat','PF-LECTURE-SEAT',[x,e,z],
      n%3===0?'M-FABRIC-RED':'M-FABRIC-BLUE','student safety induction seat'));
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+2.8,4.8,.68],[cx,z0+5.55,4.8,.68]],4000,'M-SAFETY-YELLOW'));
  return out;
}

function b06AIStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,
    out=[...b06RoomFront(prefix,e,b,'数据与人工智能 · AI LAB','M-STEEL-DARK')];
  let n=0;
  for(const z of [z0+1.35,z0+3.05,z1-3.05,z1-1.35]) for(const x of [x0+1.15,cx,x1-1.15])
    out.push(fixture(`${prefix}/PC${pad(++n)}`,'AI development workstation','PF-COMPUTER-DESK',[x,e,z],
      'M-STEEL-DARK','machine-learning development and visualization'));
  out.push(
    fixture(`${prefix}/WALL`,'collaborative data display','PF-SCREEN',[cx,e+1.72,z1-.07],
      'M-SCREEN','shared model and sensor visualization',{yaw:PI,size:[3.5,1.65,.06]}),
    fixture(`${prefix}/SERVER1`,'edge-compute cabinet A','PF-FILE-CABINET',[x1-.55,e,z1-.65],
      'M-STEEL-DARK','local robotics and AI compute',{size:[.78,2.0,.55]}),
    fixture(`${prefix}/SERVER2`,'edge-compute cabinet B','PF-FILE-CABINET',[x1-1.42,e,z1-.65],
      'M-STEEL-DARK','local robotics and AI compute',{size:[.78,2.0,.55]}),
    b06Decor(`${prefix}/DEMO-ZONE`,'interactive AI demonstration floor',[cx,e+.018,z1-1.15],
      'M-RUBBER',[3.1,.022,1.2],'sensor and autonomous-system demonstrations'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+2.1,4.8,.62],[cx,cz,4.8,.62],[cx,z1-2.1,4.8,.62]],4000,'M-STEEL-DARK'),
  );
  return out;
}

function b06ResearchStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[
    fixture(`${prefix}/D1`,'principal investigator workstation','PF-OFFICE-DESK',[x0+1.25,e,z1-.72],
      'M-OAK-DARK','research supervision and analysis',{size:[1.35,.76,.7]}),
    fixture(`${prefix}/D2`,'research assistant workstation','PF-OFFICE-DESK',[x0+3.0,e,z1-.72],
      'M-OAK-DARK','project documentation and analysis',{size:[1.35,.76,.7]}),
    fixture(`${prefix}/MEET`,'project review table','PF-MEETING-TABLE',[x1-1.65,e,z0+1.05],
      'M-OAK','six-person prototype and research review',{size:[2.4,.76,1.0]}),
    ...Array.from({length:4},(_,i)=>fixture(`${prefix}/C${i+1}`,'research meeting chair','PF-CHAIR',
      [x1-2.5+(i%2)*1.7,e,z0+.35+Math.floor(i/2)*1.5],'M-FABRIC-BLUE','project meeting seat',{yaw:i<2?0:PI})),
    b06Decor(`${prefix}/DIVIDER`,'partial glazed research divider',[x1-2.0,e+1.45,z0+2.25],
      'M-GLASS',[3.7,2.55,.06],'separates focused desks from project discussion while sharing daylight'),
    fixture(`${prefix}/DISPLAY`,'research milestone display','PF-SCREEN',[x1-.07,e+1.65,cz],
      'M-SCREEN','grants, experiments and prototype milestones',{yaw:-PI/2,size:[1.8,1.15,.06]}),
    fixture(`${prefix}/PLANT`,'research office plant','PF-PLANT',[x1-.48,e,z1-.48],'M-PLANT','softens the project office'),
    ...b06RoomFront(prefix,e,b,'研究办公室 · RESEARCH','M-OAK-DARK'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx-1.5,cz,2.2,.65],[cx+1.5,cz,2.2,.65]],3500,'M-OAK-DARK'),
  ];
  return out;
}

function buildB06() {
  const floors=[];
  const westS=[-7.1,-1.1,-6.1,-.2],westN=[-7.1,-1.1,.2,10.6],eastS=[1.1,7.1,-10.6,-2.2],eastM=[1.1,7.1,.2,4.5];
  const specs=[
    {level:1,title:'科学展示与安全入门',accent:'M-LAB-BLUE',rooms:[
      ['WS','普通教学实验室',westS,'general',b=>b06LabRoom('B06/F1/WS',0,b,'general','普通教学实验室 · WET LAB')],
      ['WN','准备、收货与安全储藏',westN,'prep',b=>scienceSupportRoom('B06/F1/WN',0,b,'prep')],
      ['ES','安全培训与展示',eastS,'classroom',b=>b06SafetyStudio('B06/F1/ES',0,b)],
      ['EM','门厅与门禁',eastM,'lobby',b=>scienceSupportRoom('B06/F1/EM',0,b,'lobby')],
    ]},
    {level:2,title:'化学分析与合成',accent:'M-SAFETY-YELLOW',rooms:[
      ['WS','分析化学实验室',westS,'chemistry',b=>b06LabRoom('B06/F2/WS',3.65,b,'chemistry','分析化学 · ANALYTICAL','analytical')],
      ['WN','有机化学教学实验室',westN,'chemistry',b=>b06LabRoom('B06/F2/WN',3.65,b,'chemistry','有机化学 · ORGANIC','organic')],
      ['ES','基础化学实验室',eastS,'chemistry',b=>b06LabRoom('B06/F2/ES',3.65,b,'chemistry','基础化学 · FOUNDATION','foundation')],
      ['EM','化学品分类储藏',eastM,'store',b=>scienceSupportRoom('B06/F2/EM',3.65,b,'store')],
    ]},
    {level:3,title:'生命科学与显微成像',accent:'M-WALL-GREEN',rooms:[
      ['WS','生物教学实验室',westS,'biology',b=>b06LabRoom('B06/F3/WS',7.3,b,'biology','生物教学 · BIOLOGY')],
      ['WN','显微镜与细胞实验室',westN,'microscopy',b=>b06LabRoom('B06/F3/WN',7.3,b,'microscopy','显微与细胞 · MICROSCOPY')],
      ['ES','微生物实验室',eastS,'biology',b=>b06LabRoom('B06/F3/ES',7.3,b,'biology','微生物 · MICROBIOLOGY','microbiology')],
      ['EM','冷藏与样品室',eastM,'cold',b=>scienceSupportRoom('B06/F3/EM',7.3,b,'cold')],
    ]},
    {level:4,title:'物理、机器人与人工智能',accent:'M-STEEL-DARK',rooms:[
      ['WS','物理与电子实验室',westS,'physics',b=>b06LabRoom('B06/F4/WS',10.95,b,'physics','物理与电子 · PHYSICS')],
      ['WN','机器人与制作实验室',westN,'robotics',b=>b06LabRoom('B06/F4/WN',10.95,b,'robotics','机器人制作 · ROBOTICS')],
      ['ES','数据与人工智能实验室',eastS,'computer',b=>b06AIStudio('B06/F4/ES',10.95,b)],
      ['EM','研究办公室与项目评审',eastM,'seminar',b=>b06ResearchStudio('B06/F4/EM',10.95,b)],
    ]},
  ];
  for(const spec of specs) {
    const e=(spec.level-1)*3.65,p=`B06/F${spec.level}`,rooms=[];
    for(const [key,label,b,kind,make] of spec.rooms) {
      const doorSide=key.startsWith('W')?'east':'west',doorX=key.startsWith('W')?-1.1:1.1;
      const doors=[doorway(`${p}/${key}/D`,doorSide,[doorX,e,(b[2]+b[3])/2],kind==='chemistry'||kind==='biology'||kind==='general'?1.5:1.0,`${p}/CORRIDOR`)];
      if(spec.level===1&&key==='EM') doors.push(doorway(`${p}/${key}/EXT`,'east',[7.5,e,-1],3.2,'campus',{portal:true}));
      rooms.push(room(`${p}/${key}`,label,b,kind==='lobby'?'public':kind==='computer'||kind==='seminar'||kind==='classroom'?'classroom':'lab',doors,make(b),{programme:kind,staffControlled:kind==='store'||kind==='prep'||kind==='cold'}));
    }
    rooms.push(...b06CoreRooms(spec.level,e,p));
    const shared=[
      ...safetySet(p,e,[-4.2,-6.0],[6.2,-1],spec.level,spec.level===1),
      ...[-8.5,-4.5,0,4.0].map((z,i)=>fixture(`${p}/COR-EXT${i+1}`,'corridor extinguisher','PF-EXTINGUISHER',[-.78,e,z],'M-SAFETY-RED','laboratory corridor fire safety',{yaw:PI/2})),
      ...[-8,-4,0,4,8].map((z,i)=>fixture(`${p}/COR-L${i+1}`,'sealed corridor light','PF-CEILING-LIGHT',[0,e+3.25,z],'M-WALL-WHITE','laboratory corridor lighting',{temperatureK:4200,size:[.9,.06,.24]})),
      fixture(`${p}/CUTOFF`,'floor emergency services cutoff','PF-ALARM',[.78,e+1.25,-1.2],'M-SAFETY-YELLOW','laboratory gas/electric isolation',{text:'紧急关闭'}),
      fixture(`${p}/FIRST`,'floor first-aid cabinet','PF-FIRST-AID',[.78,e+1.25,1.2],'M-CLINIC','laboratory first aid'),
      b06Decor(`${p}/COR-SERVICE`,'continuous corridor services canopy',[0,e+3.33,0],
        spec.accent,[1.34,.09,20.1],'color-coded laboratory services and floor identity'),
      b06Decor(`${p}/COR-DATA`,'brass corridor data line',[0,e+.018,0],
        spec.level===1?'M-BRASS':spec.accent,[.08,.022,19.6],'continuous navigation line between laboratories'),
      b06Sign(`${p}/FLOOR-TITLE`,'science floor programme sign',[.84,e+2.15,3.15],
        `${spec.level}层 · ${spec.title}`,'large floor and programme confirmation',{yaw:-PI/2,size:[2.8,.38,.05]}),
      b06Decor(`${p}/COR-GLASS`,'glazed science display ribbon',[.86,e+1.45,6.0],
        'M-GLASS',[.045,2.45,2.5],'corridor views to active science and the glass stair tower'),
      ...(spec.level===1?[
        b06Sign(`${p}/ENTRY-WELCOME`,'main science arrival sign',[4.4,e+2.28,.08],
          '科学与创新楼 · SCIENCE & INNOVATION','arrival landmark from the campus',{yaw:0,size:[3.9,.48,.05]}),
        b06Decor(`${p}/ENTRY-CIRCUIT`,'brass circuit-trace arrival floor',[4.4,e+.018,-1.0],
          'M-BRASS',[4.8,.022,.07],'guides the campus arrival into reception'),
      ]:[]),
    ];
    floors.push(floor(spec.level,e,3.65,rooms,[{id:`${p}/CORRIDOR`,bounds:[-.9,.9,-10.6,10.6],clearWidth:1.8,surface:'M-EPOXY'},{id:`${p}/ENTRY`,bounds:[.9,7.5,-2.0,.1],clearWidth:2.1,surface:'M-TERRAZZO'}],shared,{occupancy:spec.level===1?65:55}));
  }
  return {
    id:'B06',label:'科学与创新楼（实验楼）',status:'new-interior',centreCampus:[-35.5,51],localBounds:[-7.5,7.5,-11,11],
    exteriorFootprint:{x0:-43,x1:-28,z0:40,z1:62},floors:4,floorHeight:3.65,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-35.5 + localX',worldZ:'51 + localZ'},
    portals:[{id:'B06/PUBLIC',campusAt:[-28,50],campusReturn:[-25.5,50,-PI/2],localSpawn:[6.0,0,-1,-PI/2],placeKey:'campus_science_f1'}],
    facadeChanges:[{id:'B06/EXIT-SW','instruction':'Add a 1.20 m protected-stair discharge on west wall at campus (-43,42.55).'}],
    facadeAlignment:{eastWindows:{localX:7.5,localZ:[-9,-5.5,-2,1.5,5,8.5]},glassStairTower:{campusBounds:[-28.6,-27.55,55,60],mapsTo:'B06/*/CORE-NE'},roofExhaustRisers:[[-40.5,58.5],[-38.5,58.5],[-36.5,58.5],[-34.5,58.5],[-32.5,58.5],[-30.5,58.5]]},
    design:'A visibly layered four-floor science building: prototype showcase lobby and safety-demonstration studio; wet teaching and clean/dirty preparation zones; distinct analytical, organic and foundation chemistry laboratories with fume extraction; biology, microbiology and dimmable microscopy suites; physics, robotics/maker and AI studios; glazed research offices; color-coded service canopies, high-CRI task lighting, observation glazing, PPE thresholds, plants, bilingual programme signs and believable controlled support rooms.',
    floorsPlan:floors,
  };
}

function b07Decor(id,label,at,material,size,purpose,extra={}) {
  return fixture(id,label,'PF-WALL-RUN',at,material,purpose,{size,collision:'none',...extra});
}

function b07Sign(id,label,at,text,purpose,extra={}) {
  return fixture(id,label,'PF-ROOM-SIGN',at,'M-SCREEN',purpose,
    {text,size:[1.5,.32,.05],collision:'none',...extra});
}

function b07Raft(id,e,x,z,w,d,material='M-ACOUSTIC') {
  return b07Decor(id,'suspended acoustic ceiling raft',[x,e+2.87,z],material,[w,.10,d],
    'lower reverberation and visually organize the room ceiling');
}

function b07CoreRooms(level,e,p) {
  return [
    room(`${p}/STAIR-S`,'南安全楼梯',[3.8,6.1,-5.1,-2.6],'service',[],[
      fixture(`${p}/STAIR-S/FIX`,'south protected stair','PF-STAIR',[4.95,e,-3.85],'M-TERRAZZO','student-centre egress',{size:[2.0,2.8,2.2]}),
      fixture(`${p}/STAIR-S/STORE`,'event/cleaning store','PF-CLEANING',[5.65,e,-4.7],'M-STEEL','floor service storage'),
      b07Decor(`${p}/STAIR-S/STRIPE`,'high-contrast stair approach strip',[4.95,e+.018,-2.72],
        'M-SAFETY-YELLOW',[1.85,.025,.14],'tactile and visual warning at the protected stair'),
      b07Sign(`${p}/STAIR-S/SIGN`,'south stair identification',[3.86,e+1.55,-3.85],
        `南楼梯 · STAIR S · ${level}F`,'protected-egress wayfinding',{yaw:PI/2,size:[1.75,.34,.05]}),
    ]),
    room(`${p}/LIFT`,'电梯与防火前室',[3.8,6.1,-2.4,.8],'service',[],[
      fixture(`${p}/LIFT/FIX`,'accessible lift','PF-LIFT',[4.9,e,-.8],'M-STEEL','accessible vertical circulation',{size:[1.8,2.45,1.65],levels:[1,2,3]}),
      fixture(`${p}/LIFT/DIR`,'split-use directory','PF-DIRECTORY',[5.75,e,-2.0],'M-SCREEN','activity-centre and clinic wayfinding',{size:[.7,1.5,.1],text:'活动中心 ↓ · 校医院 ↑'}),
      b07Decor(`${p}/LIFT/PORTAL`,'charcoal lift portal surround',[4.9,e+1.28,-2.30],
        'M-STEEL-DARK',[1.95,2.5,.05],'make the accessible lift immediately legible'),
      b07Decor(`${p}/LIFT/TACTILE`,'lift tactile waiting strip',[4.9,e+.018,-1.94],
        'M-BRASS',[1.8,.025,.18],'high-contrast tactile lift approach'),
      b07Sign(`${p}/LIFT/FLOOR`,'lift floor marker',[4.9,e+1.83,-2.255],
        `${level}层 · FLOOR ${level}`,'large floor confirmation at the lift',{yaw:0,size:[1.2,.36,.05]}),
    ]),
    room(`${p}/STAIR-N`,'北安全楼梯',[3.8,6.1,1.0,5.1],'service',[],[
      fixture(`${p}/STAIR-N/FIX`,'north protected stair','PF-STAIR',[4.95,e,3.05],'M-TERRAZZO','clinic egress',{size:[2.0,2.8,3.6]}),
      fixture(`${p}/STAIR-N/ELEC`,'floor electrical cabinet','PF-FILE-CABINET',[5.6,e,4.6],'M-STEEL-DARK','floor electrical distribution',{size:[.6,1.7,.3]}),
      b07Decor(`${p}/STAIR-N/STRIPE`,'high-contrast stair approach strip',[4.95,e+.018,1.12],
        'M-SAFETY-YELLOW',[1.85,.025,.14],'tactile and visual warning at the protected stair'),
      b07Sign(`${p}/STAIR-N/SIGN`,'north stair identification',[3.86,e+1.55,3.05],
        `北楼梯 · STAIR N · ${level}F`,'protected-egress wayfinding',{yaw:PI/2,size:[1.75,.34,.05]}),
    ]),
  ];
}

function buildB07() {
  const floors=[];
  // Ground: separate public entrances, shared protected core, no casual cross-traffic through clinic.
  {
    const level=1,e=0,p='B07/F1';
    const rooms=[
      room(`${p}/SC-LOBBY`,'学生活动中心门厅',[-6.1,-2.0,-3.05,-.75],'public',[
        doorway(`${p}/SC-LOBBY/EXT`,'west',[-6.5,e,-1.5],2.2,'campus',{portal:true})
      ],[
        fixture(`${p}/SC-LOBBY/DESK`,'club registration counter','PF-SERVICE-COUNTER',[-3.0,e,-2.35],'M-OAK','club registration',{yaw:PI}),
        fixture(`${p}/SC-LOBBY/WAIT`,'lobby waiting chairs','PF-WAIT-CHAIRS',[-4.85,e,-1.15],'M-FABRIC-BLUE','student waiting',{yaw:PI}),
        fixture(`${p}/SC-LOBBY/DIR`,'activity directory','PF-DIRECTORY',[-5.55,e,-2.45],'M-SCREEN','activity wayfinding',{text:'社团 · 排练 · 媒体 · 项目'}),
        b07Decor(`${p}/SC-LOBBY/FEATURE`,'brick-and-blue welcome feature wall',[-2.07,e+1.43,-1.55],
          'M-BRICK',[.06,2.55,1.65],'strong arrival focal point from the student entrance'),
        b07Sign(`${p}/SC-LOBBY/WELCOME`,'student-centre welcome sign',[-2.025,e+1.88,-1.55],
          '学生活动中心 · STUDENT HUB','immediate bilingual building identity',{yaw:-PI/2,size:[2.4,.42,.05]}),
        b07Sign(`${p}/SC-LOBBY/CHECKIN`,'club check-in sign',[-3.0,e+2.18,-2.96],
          '社团服务 · CLUB CHECK-IN','identify the staffed registration point',{yaw:0,size:[1.75,.32,.05]}),
        b07Decor(`${p}/SC-LOBBY/RUG`,'blue acoustic welcome rug',[-4.65,e+.018,-1.78],
          'M-FABRIC-BLUE',[1.7,.025,1.28],'soft student-lounge threshold'),
        b07Decor(`${p}/SC-LOBBY/FLOOR-LINE`,'student-centre blue floor line',[-4.05,e+.022,-2.96],
          'M-FABRIC-BLUE',[3.75,.028,.12],'lead arrivals toward registration and the activity rooms'),
        fixture(`${p}/SC-LOBBY/PLANT`,'welcome plant','PF-PLANT',[-2.38,e,-2.65],'M-PLANT','green student-centre arrival marker',{size:[.48,1.12,.48]}),
        b07Raft(`${p}/SC-LOBBY/RAFT`,e,-4.05,-1.9,3.45,1.28),
        ...lightGrid(`${p}/SC-LOBBY`,e,[[-4.0,-1.6]],3500),
      ]),
      room(`${p}/SC-COMMONS`,'社团公共区',[-6.1,-.8,-5.1,-3.25],'activity',[],[
        fixture(`${p}/SC-COMMONS/T1`,'club table A','PF-ART-TABLE',[-4.8,e,-4.2],'M-OAK','club sign-up and projects'),
        fixture(`${p}/SC-COMMONS/T2`,'club table B','PF-ART-TABLE',[-2.7,e,-4.2],'M-OAK','club sign-up and projects'),
        fixture(`${p}/SC-COMMONS/NOTICE`,'club notice display','PF-SCREEN',[-1.0,e+1.45,-4.2],'M-SCREEN','club announcements',{yaw:-PI/2,size:[1.4,.9,.06]}),
        fixture(`${p}/SC-COMMONS/CUBBIES`,'club-project cubbies','PF-LOCKERS',[-5.72,e,-3.62],
          'M-STEEL-DARK','labelled storage for active clubs',{yaw:PI/2,size:[1.1,1.9,.45]}),
        fixture(`${p}/SC-COMMONS/PLANT`,'club commons plant','PF-PLANT',[-1.27,e,-4.72],
          'M-PLANT','soften the project commons',{size:[.46,1.0,.46]}),
        b07Decor(`${p}/SC-COMMONS/FEATURE`,'club-week brick feature wall',[-3.45,e+1.43,-5.02],
          'M-BRICK',[4.8,2.52,.06],'durable pin-up backdrop for club activity'),
        fixture(`${p}/SC-COMMONS/MURAL`,'club-week digital mural','PF-SCREEN',[-3.45,e+1.55,-4.975],
          'M-SCREEN','live club calendar and student work',{yaw:0,size:[2.85,1.05,.05],text:'社团周 · CLUB WEEK'}),
        b07Sign(`${p}/SC-COMMONS/STORAGE-SIGN`,'project-storage sign',[-5.67,e+2.12,-3.35],
          '社团物资 · CLUB GEAR','identify shared club storage',{yaw:PI,size:[1.4,.3,.05]}),
        b07Raft(`${p}/SC-COMMONS/RAFT-W`,e,-4.8,-4.2,1.75,1.08),
        b07Raft(`${p}/SC-COMMONS/RAFT-E`,e,-2.7,-4.2,1.75,1.08),
        fixture(`${p}/SC-COMMONS/PEND`,'warm commons pendant','PF-PENDANT',[-3.75,e+2.64,-4.2],
          'M-BRASS','warm shared-project lighting',{temperatureK:3200,size:[.48,.28,.48]}),
      ]),
      room(`${p}/SC-OFFICE`,'学生会办公室',[-1.8,1.6,-3.05,-.75],'office',[],[
        fixture(`${p}/SC-OFFICE/DESK01`,'student-union workstation A','PF-OFFICE-DESK',[-1.0,e,-2.12],
          'M-OAK','student representation and casework',{yaw:0}),
        fixture(`${p}/SC-OFFICE/DESK02`,'student-union workstation B','PF-OFFICE-DESK',[.82,e,-2.12],
          'M-OAK','club finance and communications',{yaw:0}),
        fixture(`${p}/SC-OFFICE/FILES`,'secure student-union files','PF-FILE-CABINET',[-1.25,e,-1.12],
          'M-STEEL','secure committee and finance records'),
        fixture(`${p}/SC-OFFICE/CASE`,'student-union reference case','PF-BOOKCASE',[1.18,e,-1.15],
          'M-OAK-DARK','constitution, minutes and event binders'),
        fixture(`${p}/SC-OFFICE/PLANT`,'student-union plant','PF-PLANT',[1.2,e,-2.67],
          'M-PLANT','lived-in committee office',{size:[.42,.95,.42]}),
        b07Decor(`${p}/SC-OFFICE/FEATURE`,'blue felt committee pin-up wall',[-.10,e+1.5,-2.98],
          'M-FABRIC-BLUE',[2.6,1.05,.05],'election notices, minutes and event plans'),
        b07Sign(`${p}/SC-OFFICE/TITLE`,'student-union title',[-.10,e+2.15,-2.94],
          '学生会 · STUDENT UNION','room identity and committee welcome',{yaw:0,size:[2.1,.34,.05]}),
        b07Decor(`${p}/SC-OFFICE/RUG`,'committee office rug',[-.10,e+.018,-1.98],
          'M-RUBBER',[2.0,.025,1.15],'quiet shared work zone'),
        ...lightGrid(`${p}/SC-OFFICE`,e,[[-.1,-1.9]],3500),
      ]),
      room(`${p}/SC-MULTI`,'多功能活动室',[1.8,3.6,-5.1,-.75],'activity',[],[
        fixture(`${p}/SC-MULTI/TABLE`,'parked folding activity table','PF-MEETING-TABLE',[2.70,e,-4.48],
          'M-OAK','deployable small-meeting and event table',{size:[1.35,.76,.65]}),
        ...Array.from({length:6},(_,i)=>fixture(`${p}/SC-MULTI/C${i+1}`,'stacking event chair','PF-CHAIR',
          [i%2?3.33:2.07,e,-3.65+Math.floor(i/2)*1.05],'M-FABRIC-BLUE','movable event seat',{yaw:PI})),
        fixture(`${p}/SC-MULTI/STORE`,'activity equipment shelf','PF-SHELF',[1.98,e,-4.65],
          'M-STEEL','event equipment and stacked presentation kits',{yaw:PI/2,size:[.85,1.9,.42]}),
        fixture(`${p}/SC-MULTI/SCREEN`,'multipurpose presentation screen','PF-SCREEN',[2.70,e+1.55,-5.02],
          'M-SCREEN','film, briefing and club presentation display',{yaw:0,size:[1.55,1.0,.05]}),
        fixture(`${p}/SC-MULTI/BOARD`,'event planning whiteboard','PF-WHITEBOARD',[3.52,e+1.5,-1.75],
          'M-WHITEBOARD','rehearsal cues and event plans',{yaw:-PI/2,size:[1.2,.85,.05]}),
        fixture(`${p}/SC-MULTI/PROJECTOR`,'ceiling presentation projector','PF-PROJECTOR',[2.70,e+2.73,-1.18],
          'M-STEEL-DARK','multipurpose projection',{yaw:PI}),
        b07Decor(`${p}/SC-MULTI/ACOUSTIC`,'blue acoustic event wall',[1.86,e+1.45,-2.85],
          'M-FABRIC-BLUE',[.05,2.5,3.45],'control speech and rehearsal reverberation'),
        b07Sign(`${p}/SC-MULTI/SIGN`,'multipurpose room sign',[2.70,e+1.78,-.81],
          '多功能室 · FLEX ROOM','identify the bookable activity room',{yaw:PI,size:[1.55,.3,.05]}),
        b07Raft(`${p}/SC-MULTI/RAFT`,e,2.70,-2.75,1.45,2.6),
        ...lightGrid(`${p}/SC-MULTI`,e,[[2.70,-2.65]],3600),
      ]),
      room(`${p}/CL-WAIT`,'校医院候诊',[-6.1,-2.2,.75,5.1],'clinic',[
        doorway(`${p}/CL-WAIT/EXT`,'west',[-6.5,e,2.5],2.2,'campus',{portal:true})
      ],[
        fixture(`${p}/CL-WAIT/REC`,'clinic registration counter','PF-SERVICE-COUNTER',[-3.25,e,1.3],'M-CLINIC','clinic registration',{yaw:0}),
        fixture(`${p}/CL-WAIT/W1`,'waiting chairs A','PF-WAIT-CHAIRS',[-5.0,e,1.45],'M-FABRIC-BLUE','patient waiting',{yaw:0}),
        fixture(`${p}/CL-WAIT/W2`,'waiting chairs B','PF-WAIT-CHAIRS',[-5.0,e,3.0],'M-FABRIC-BLUE','patient waiting',{yaw:PI}),
        fixture(`${p}/CL-WAIT/WATER`,'water dispenser','PF-WATER',[-2.75,e,4.55],'M-STEEL','patient hydration'),
        fixture(`${p}/CL-WAIT/AED`,'clinic AED','PF-AED',[-2.35,e+1.2,.65],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
        fixture(`${p}/CL-WAIT/DIR`,'clinic directory','PF-DIRECTORY',[-5.55,e,4.45],'M-SCREEN','clinic route',{text:'挂号 · 诊室 · 治疗 · 药房'}),
        b07Decor(`${p}/CL-WAIT/FEATURE`,'oak-and-green clinic identity wall',[-2.27,e+1.43,2.50],
          'M-OAK',[.06,2.52,1.65],'calm arrival focal point from the clinic entrance'),
        b07Sign(`${p}/CL-WAIT/WELCOME`,'clinic welcome sign',[-2.225,e+1.9,2.50],
          '校医院 · CAMPUS CLINIC','immediate bilingual clinic identity',{yaw:-PI/2,size:[2.3,.42,.05]}),
        b07Decor(`${p}/CL-WAIT/REC-BACK`,'pale-green reception backdrop',[-3.25,e+1.35,.82],
          'M-WALL-GREEN',[2.1,2.25,.05],'warm clinical backdrop behind registration'),
        b07Sign(`${p}/CL-WAIT/REGISTER`,'registration sign',[-3.25,e+2.14,.86],
          '挂号 · REGISTER','identify the accessible registration counter',{yaw:0,size:[1.65,.34,.05]}),
        fixture(`${p}/CL-WAIT/QUEUE`,'clinic queue display','PF-SCREEN',[-2.28,e+1.58,3.72],
          'M-SCREEN','private queue number and estimated wait',{yaw:-PI/2,size:[1.2,.8,.05],text:'请按号候诊 · WAIT FOR NUMBER'}),
        fixture(`${p}/CL-WAIT/CLOCK`,'clinic waiting clock','PF-CLOCK',[-2.29,e+2.45,4.35],
          'M-WALL-WHITE','patient timekeeping',{yaw:-PI/2}),
        fixture(`${p}/CL-WAIT/PLANT`,'clinic waiting plant','PF-PLANT',[-3.15,e,4.55],
          'M-PLANT','calming biophilic waiting-room element',{size:[.45,1.0,.45]}),
        b07Decor(`${p}/CL-WAIT/ACCESS`,'accessible waiting bay marker',[-3.82,e+.018,3.72],
          'M-LAB-BLUE',[1.12,.025,1.12],'keep a wheelchair waiting position clear'),
        b07Sign(`${p}/CL-WAIT/ACCESS-SIGN`,'accessible waiting sign',[-3.82,e+.035,3.72],
          '无障碍候诊','mark the wheelchair waiting bay',{size:[.72,.03,.42]}),
        b07Raft(`${p}/CL-WAIT/RAFT-W`,e,-4.85,1.55,1.85,1.05,'M-WALL-GREEN'),
        b07Raft(`${p}/CL-WAIT/RAFT-N`,e,-4.15,3.75,2.9,1.05,'M-WALL-GREEN'),
        ...lightGrid(`${p}/CL-WAIT`,e,[[-4.8,1.55],[-4.15,3.75]],3900),
      ]),
      room(`${p}/CL-EXAM`,'校医诊室',[-2.0,1.55,.75,2.55],'clinic',[],[
        fixture(`${p}/CL-EXAM/COUCH`,'examination couch','PF-EXAM-COUCH',[-.4,e,1.6],'M-CLINIC','patient examination',{yaw:PI/2}),
        fixture(`${p}/CL-EXAM/DESK`,'clinician workstation','PF-OFFICE-DESK',[-1.3,e,1.1],'M-CLINIC','clinical notes',{size:[1.15,.76,.65]}),
        fixture(`${p}/CL-EXAM/CAB`,'clinical cabinet','PF-CLINIC-CABINET',[1.1,e,1.1],'M-CLINIC','exam supplies'),
        fixture(`${p}/CL-EXAM/SINK`,'clinical handwash','PF-HANDWASH',[1.1,e,2.1],'M-STAINLESS','clinical hand washing'),
        b07Decor(`${p}/CL-EXAM/CURTAIN`,'washable privacy curtain',[.47,e+1.3,1.62],
          'M-ACOUSTIC',[.04,2.28,1.45],'shield the examination couch from the doorway'),
        fixture(`${p}/CL-EXAM/VITALS`,'vital-sign display','PF-SCREEN',[1.48,e+1.55,1.58],
          'M-SCREEN','record blood pressure, temperature and pulse',{yaw:-PI/2,size:[.75,.55,.04],text:'生命体征 · VITALS'}),
        b07Sign(`${p}/CL-EXAM/HAND-SIGN`,'clinical hand-hygiene sign',[1.48,e+1.95,2.14],
          '洗手 · HAND HYGIENE','hand-hygiene reminder',{yaw:-PI/2,size:[.82,.25,.04]}),
        b07Raft(`${p}/CL-EXAM/RAFT`,e,-.20,1.65,2.5,1.2,'M-WALL-GREEN'),
        ...lightGrid(`${p}/CL-EXAM`,e,[[-.2,1.65]],4100),
      ]),
      room(`${p}/CL-TREAT`,'治疗与观察',[-2.0,1.55,2.75,5.1],'clinic',[],[
        fixture(`${p}/CL-TREAT/C1`,'treatment couch A','PF-EXAM-COUCH',[-1.15,e,3.8],'M-CLINIC','short treatment',{yaw:PI/2}),
        fixture(`${p}/CL-TREAT/C2`,'treatment couch B','PF-EXAM-COUCH',[.65,e,3.8],'M-CLINIC','short observation',{yaw:PI/2}),
        fixture(`${p}/CL-TREAT/CAB`,'treatment cabinet','PF-CLINIC-CABINET',[1.1,e,4.65],'M-CLINIC','treatment supplies'),
        fixture(`${p}/CL-TREAT/FIRST`,'first-aid cabinet','PF-FIRST-AID',[-1.85,e+1.2,4.65],'M-CLINIC','clinic first aid',{yaw:PI/2}),
        b07Decor(`${p}/CL-TREAT/DIVIDER`,'frosted privacy divider',[-.25,e+1.25,3.82],
          'M-GLASS',[.04,2.2,1.65],'provide visual privacy between treatment couches'),
        fixture(`${p}/CL-TREAT/MON1`,'treatment status display A','PF-SCREEN',[-1.15,e+1.62,5.02],
          'M-SCREEN','patient observation status',{yaw:PI,size:[.72,.48,.04],text:'观察 1'}),
        fixture(`${p}/CL-TREAT/MON2`,'treatment status display B','PF-SCREEN',[.65,e+1.62,5.02],
          'M-SCREEN','patient observation status',{yaw:PI,size:[.72,.48,.04],text:'观察 2'}),
        b07Sign(`${p}/CL-TREAT/SIGN`,'treatment-zone sign',[-.20,e+2.18,5.02],
          '治疗与观察 · TREATMENT','clinical zone identity',{yaw:PI,size:[1.85,.30,.04]}),
        b07Raft(`${p}/CL-TREAT/RAFT`,e,-.20,3.9,2.55,1.3,'M-WALL-GREEN'),
        ...lightGrid(`${p}/CL-TREAT`,e,[[-.2,3.9]],4100),
      ]),
      room(`${p}/CL-PHARM`,'校内药房',[1.75,3.6,.75,5.1],'clinic',[],[
        fixture(`${p}/CL-PHARM/COUNTER`,'pharmacy counter','PF-PHARMACY',[2.65,e,1.25],'M-CLINIC','medicine dispensing',{yaw:0}),
        fixture(`${p}/CL-PHARM/FRIDGE`,'medicine refrigerator','PF-MED-FRIDGE',[3.15,e,4.45],'M-CLINIC','temperature-controlled medicine'),
        fixture(`${p}/CL-PHARM/S1`,'medicine shelving A','PF-SHELF',[2.0,e,4.55],'M-CLINIC','locked medicine storage'),
        fixture(`${p}/CL-PHARM/S2`,'medicine shelving B','PF-SHELF',[3.25,e,3.25],'M-CLINIC','locked medicine storage',{yaw:-PI/2}),
        b07Decor(`${p}/CL-PHARM/FEATURE`,'pale-green pharmacy feature wall',[3.52,e+1.42,3.2],
          'M-WALL-GREEN',[.05,2.5,3.35],'visually unify dispensing and locked storage'),
        b07Sign(`${p}/CL-PHARM/HEADER`,'pharmacy header',[2.65,e+2.15,.82],
          '药房 · PHARMACY','identify the dispensing counter',{yaw:0,size:[1.65,.36,.05]}),
        b07Sign(`${p}/CL-PHARM/PRIVACY`,'pharmacy privacy sign',[2.65,e+.05,2.08],
          '请在黄线后等候','keep the dispensing conversation private',{size:[1.25,.03,.22]}),
        b07Decor(`${p}/CL-PHARM/QUEUE-LINE`,'pharmacy privacy line',[2.65,e+.018,2.08],
          'M-SAFETY-YELLOW',[1.55,.025,.12],'privacy setback at the dispensing counter'),
        b07Decor(`${p}/CL-PHARM/STOCK-A`,'labelled medicine stock A',[2.0,e+1.22,4.44],
          'M-LAB-BLUE',[.48,.16,.26],'visible organized pharmacy stock'),
        b07Decor(`${p}/CL-PHARM/STOCK-B`,'labelled medicine stock B',[2.0,e+1.48,4.44],
          'M-WALL-WHITE',[.48,.16,.26],'visible organized pharmacy stock'),
        b07Raft(`${p}/CL-PHARM/RAFT`,e,2.65,2.85,1.45,2.6,'M-WALL-GREEN'),
        ...lightGrid(`${p}/CL-PHARM`,e,[[2.65,2.7]],4100),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/SC-ROUTE`,bounds:[-6.1,3.8,-.65,.65],clearWidth:1.3,surface:'M-TERRAZZO'},
      {id:`${p}/CL-ROUTE`,bounds:[-6.1,3.8,-.65,.65],clearWidth:1.3,surface:'M-VINYL'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[-5.8,-1.5],level,true),
      fixture(`${p}/FIRE-SEP`,'clinic fire-separation door','PF-DOOR-SINGLE',[3.7,e,0],
        'M-STEEL','separates clinic and activity-centre routes',{yaw:0,selfClosing:true}),
      b07Decor(`${p}/SC-WAYLINE`,'blue activity-centre route line',[-1.1,e+.018,-.48],
        'M-FABRIC-BLUE',[9.2,.025,.10],'continuous student-centre wayfinding'),
      b07Decor(`${p}/CL-WAYLINE`,'green clinic route line',[-1.1,e+.021,.48],
        'M-WALL-GREEN',[9.2,.027,.10],'continuous clinic wayfinding'),
      b07Sign(`${p}/SC-WAYFIND`,'activity-centre route sign',[-1.9,e+1.82,-.61],
        '活动中心 ↓ · STUDENT HUB','south-side destination confirmation',{yaw:PI,size:[2.25,.32,.05]}),
      b07Sign(`${p}/CL-WAYFIND`,'clinic route sign',[-1.9,e+1.82,.61],
        '校医院 ↑ · CLINIC','north-side destination confirmation',{yaw:0,size:[1.9,.32,.05]}),
      b07Raft(`${p}/COR-RAFT`,e,-.25,0,5.8,.72,'M-OAK'),
      ...lightGrid(`${p}/COR`,e,[[.6,0]],3700),
    ],{occupancy:70}));
  }
  // Floor 2 — rehearsal and counselling/treatment.
  {
    const level=2,e=3,p='B07/F2',rooms=[
      room(`${p}/DANCE`,'舞蹈与排练室',[-6.1,3.6,-5.1,-1.1],'activity',[],[
        fixture(`${p}/DANCE/M1`,'mirror and barre A','PF-DANCE-MIRROR',[3.5,e+1.45,-3.6],'M-GLASS','dance rehearsal',{yaw:-PI/2}),
        fixture(`${p}/DANCE/M2`,'mirror and barre B','PF-DANCE-MIRROR',[3.5,e+1.45,-1.8],'M-GLASS','dance rehearsal',{yaw:-PI/2}),
        fixture(`${p}/DANCE/AUDIO`,'audio console','PF-COMPUTER-DESK',[-5.3,e,-4.4],'M-STEEL-DARK','rehearsal audio',{size:[.9,1.1,.5]}),
        fixture(`${p}/DANCE/MATS`,'exercise mat storage','PF-SHELF',[-5.55,e,-1.65],'M-STEEL','exercise mats',{yaw:PI/2}),
        fixture(`${p}/DANCE/BENCH`,'rehearsal change bench','PF-BENCH',[2.45,e,-4.55],
          'M-FABRIC-BLUE','shoes, bags and rehearsal breaks',{yaw:PI}),
        fixture(`${p}/DANCE/WATER`,'rehearsal water station','PF-WATER',[2.98,e,-1.55],
          'M-STEEL','student hydration'),
        fixture(`${p}/DANCE/CLOCK`,'rehearsal wall clock','PF-CLOCK',[-5.98,e+2.35,-3.15],
          'M-WALL-WHITE','rehearsal timing',{yaw:PI/2}),
        b07Decor(`${p}/DANCE/FLOOR`,'sprung oak dance-floor inset',[-1.25,e+.018,-3.10],
          'M-OAK',[7.25,.025,3.10],'warm resilient rehearsal floor and visual room centre'),
        b07Decor(`${p}/DANCE/FEATURE`,'blue acoustic rehearsal wall',[-1.25,e+1.43,-5.02],
          'M-FABRIC-BLUE',[7.15,2.5,.06],'absorb rehearsal sound and frame the studio identity'),
        b07Sign(`${p}/DANCE/TITLE`,'dance studio title',[-1.25,e+2.1,-4.98],
          '舞蹈排练 · DANCE STUDIO','large rehearsal-room identity',{yaw:0,size:[2.25,.36,.05]}),
        b07Decor(`${p}/DANCE/SPEAKER-W`,'rehearsal speaker A',[-5.95,e+2.1,-2.0],
          'M-STEEL-DARK',[.16,.52,.34],'distributed rehearsal audio'),
        b07Decor(`${p}/DANCE/SPEAKER-E`,'rehearsal speaker B',[3.45,e+2.1,-4.45],
          'M-STEEL-DARK',[.16,.52,.34],'distributed rehearsal audio'),
        b07Raft(`${p}/DANCE/RAFT-W`,e,-3.65,-3.1,2.2,1.0),
        b07Raft(`${p}/DANCE/RAFT-C`,e,-.85,-3.1,2.2,1.0),
        b07Raft(`${p}/DANCE/RAFT-E`,e,1.95,-3.1,2.2,1.0),
        ...lightGrid(`${p}/DANCE`,e,[[-3.5,-3],[-.5,-3],[2.5,-3]],3800),
      ]),
      room(`${p}/SC-WC`,'活动中心卫生间',[-6.1,-3.8,-.9,.8],'service',[],[
        fixture(`${p}/SC-WC/T`,'accessible toilet','PF-TOILET',[-5.3,e,-.1],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
        fixture(`${p}/SC-WC/B`,'washbasin','PF-BASIN',[-4.25,e,-.1],'M-CERAMIC','hand washing'),
        b07Decor(`${p}/SC-WC/TURN`,'accessible turning-circle floor marker',[-4.95,e+.018,-.05],
          'M-LAB-BLUE',[1.5,.025,1.5],'keep the required wheelchair turning space legible'),
        b07Decor(`${p}/SC-WC/RAIL`,'contrasting grab rail',[-5.72,e+.88,-.78],
          'M-SAFETY-YELLOW',[.7,.06,.06],'high-contrast toilet support'),
        b07Decor(`${p}/SC-WC/MIRROR`,'full-width washbasin mirror',[-4.25,e+1.55,.72],
          'M-GLASS',[1.05,.85,.04],'accessible grooming mirror'),
        b07Sign(`${p}/SC-WC/SIGN`,'accessible WC sign',[-5.95,e+1.62,.35],
          '无障碍卫生间 · ACCESSIBLE WC','accessible facility identification',{yaw:PI/2,size:[1.65,.28,.04]}),
        ...lightGrid(`${p}/SC-WC`,e,[[-4.9,-.05]],4100),
      ]),
      room(`${p}/COUNSEL1`,'心理咨询一',[-6.1,-3.2,1.1,5.1],'clinic',[],[
        ...officeRoom(`${p}/COUNSEL1`,e,[-5.9,-3.4,1.3,4.9],1,'心理咨询一'),
        fixture(`${p}/COUNSEL1/CHAIR-A`,'counselling lounge chair A','PF-CHAIR',[-5.62,e,2.05],
          'M-FABRIC-BLUE','private face-to-face counselling',{yaw:PI/2}),
        fixture(`${p}/COUNSEL1/CHAIR-B`,'counselling lounge chair B','PF-CHAIR',[-3.68,e,2.05],
          'M-FABRIC-BLUE','private face-to-face counselling',{yaw:-PI/2}),
        b07Decor(`${p}/COUNSEL1/TABLE`,'small counselling side table',[-4.65,e+.35,2.05],
          'M-OAK',[.48,.42,.48],'tissues, water and grounding objects'),
        b07Decor(`${p}/COUNSEL1/RUG`,'soft counselling rug',[-4.65,e+.018,3.05],
          'M-RUBBER',[2.1,.025,2.65],'quiet domestic-scale counselling zone'),
        b07Decor(`${p}/COUNSEL1/PANEL`,'felt confidentiality panel',[-4.65,e+1.45,5.02],
          'M-WALL-GREEN',[2.25,1.65,.05],'soft private room backdrop'),
        b07Sign(`${p}/COUNSEL1/PRIVACY`,'confidentiality sign',[-4.65,e+2.25,4.98],
          '安心倾听 · CONFIDENTIAL','calm confidentiality reassurance',{yaw:PI,size:[1.65,.28,.04]}),
        b07Raft(`${p}/COUNSEL1/RAFT`,e,-4.65,3.2,2.15,1.15,'M-WALL-GREEN'),
      ]),
      room(`${p}/COUNSEL2`,'心理咨询二',[-3.0,-.1,1.1,5.1],'clinic',[],[
        ...officeRoom(`${p}/COUNSEL2`,e,[-2.8,-.3,1.3,4.9],1,'心理咨询二'),
        fixture(`${p}/COUNSEL2/CHAIR-A`,'counselling lounge chair A','PF-CHAIR',[-2.52,e,2.05],
          'M-FABRIC-RED','private face-to-face counselling',{yaw:PI/2}),
        fixture(`${p}/COUNSEL2/CHAIR-B`,'counselling lounge chair B','PF-CHAIR',[-.58,e,2.05],
          'M-FABRIC-RED','private face-to-face counselling',{yaw:-PI/2}),
        b07Decor(`${p}/COUNSEL2/TABLE`,'small counselling side table',[-1.55,e+.35,2.05],
          'M-OAK',[.48,.42,.48],'tissues, water and grounding objects'),
        b07Decor(`${p}/COUNSEL2/RUG`,'soft counselling rug',[-1.55,e+.018,3.05],
          'M-RUBBER',[2.1,.025,2.65],'quiet domestic-scale counselling zone'),
        b07Decor(`${p}/COUNSEL2/PANEL`,'felt confidentiality panel',[-1.55,e+1.45,5.02],
          'M-WALL-GREEN',[2.25,1.65,.05],'soft private room backdrop'),
        b07Sign(`${p}/COUNSEL2/PRIVACY`,'confidentiality sign',[-1.55,e+2.25,4.98],
          '缓慢呼吸 · BREATHE','calm counselling-room reassurance',{yaw:PI,size:[1.45,.28,.04]}),
        b07Raft(`${p}/COUNSEL2/RAFT`,e,-1.55,3.2,2.15,1.15,'M-WALL-GREEN'),
      ]),
      room(`${p}/OBSERVE`,'治疗观察室',[.1,3.6,1.1,5.1],'clinic',[],[
        fixture(`${p}/OBSERVE/C1`,'observation couch A','PF-EXAM-COUCH',[1.0,e,3.0],'M-CLINIC','short observation',{yaw:0}),
        fixture(`${p}/OBSERVE/C2`,'observation couch B','PF-EXAM-COUCH',[2.7,e,3.0],'M-CLINIC','short observation',{yaw:0}),
        fixture(`${p}/OBSERVE/CAB`,'observation cabinet','PF-CLINIC-CABINET',[3.1,e,4.6],'M-CLINIC','observation supplies'),
        fixture(`${p}/OBSERVE/SINK`,'clinical handwash','PF-HANDWASH',[.55,e,4.65],'M-STAINLESS','clinical hand washing'),
        fixture(`${p}/OBSERVE/TROLLEY`,'mobile observation trolley','PF-FILE-CABINET',[.55,e,1.65],
          'M-STAINLESS','vital-sign and dressing supplies',{size:[.55,.9,.45]}),
        b07Decor(`${p}/OBSERVE/DIVIDER`,'frosted observation divider',[1.85,e+1.25,3.0],
          'M-GLASS',[.04,2.2,2.45],'privacy between observation couches'),
        fixture(`${p}/OBSERVE/MON1`,'observation display A','PF-SCREEN',[1.0,e+1.62,5.02],
          'M-SCREEN','patient observation status',{yaw:PI,size:[.72,.48,.04],text:'观察 A'}),
        fixture(`${p}/OBSERVE/MON2`,'observation display B','PF-SCREEN',[2.7,e+1.62,5.02],
          'M-SCREEN','patient observation status',{yaw:PI,size:[.72,.48,.04],text:'观察 B'}),
        b07Sign(`${p}/OBSERVE/SIGN`,'observation-room title',[1.85,e+2.25,5.02],
          '治疗观察 · OBSERVATION','clinical zone identity',{yaw:PI,size:[1.75,.3,.04]}),
        b07Raft(`${p}/OBSERVE/RAFT-W`,e,1.0,3.0,1.25,2.2,'M-WALL-GREEN'),
        b07Raft(`${p}/OBSERVE/RAFT-E`,e,2.7,3.0,1.25,2.2,'M-WALL-GREEN'),
        ...lightGrid(`${p}/OBSERVE`,e,[[1.0,3.0],[2.7,3.0]],4100),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/SC-COR`,bounds:[-6.1,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},
      {id:`${p}/CL-COR`,bounds:[-6.1,3.8,.85,1.1],clearWidth:1.2,surface:'M-VINYL'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false),
      b07Decor(`${p}/SC-WAYLINE`,'blue rehearsal route line',[-1.1,e+.018,-.65],
        'M-FABRIC-BLUE',[9.2,.025,.10],'second-floor activity-centre wayfinding'),
      b07Decor(`${p}/CL-WAYLINE`,'green counselling route line',[-1.1,e+.021,.92],
        'M-WALL-GREEN',[9.2,.027,.10],'second-floor clinic wayfinding'),
      b07Sign(`${p}/SC-WAYFIND`,'dance route sign',[-1.85,e+1.82,-.95],
        '舞蹈排练 ↓ · DANCE','south-side destination confirmation',{yaw:PI,size:[1.75,.3,.05]}),
      b07Sign(`${p}/CL-WAYFIND`,'counselling route sign',[-1.85,e+1.82,1.04],
        '心理咨询 ↑ · COUNSELLING','north-side destination confirmation',{yaw:0,size:[2.15,.3,.05]}),
      b07Raft(`${p}/COR-RAFT-W`,e,-3.5,0,3.2,.72,'M-OAK'),
      b07Raft(`${p}/COR-RAFT-E`,e,.6,0,3.2,.72,'M-OAK'),
      ...lightGrid(`${p}/COR`,e,[[-2.2,0],[1.7,0]],3800),
    ],{occupancy:55}));
  }
  // Floor 3 — media/project rooms and health education/administration.
  {
    const level=3,e=6,p='B07/F3',rooms=[
      room(`${p}/MEDIA`,'学生媒体室',[-6.1,-1.4,-5.1,-1.1],'activity',[],[
        ...Array.from({length:4},(_,i)=>fixture(`${p}/MEDIA/PC${i+1}`,'media editing workstation','PF-COMPUTER-DESK',[-5.1+(i%2)*2.4,e,-4.1+Math.floor(i/2)*1.8],'M-OAK','audio/video editing',{yaw:0})),
        fixture(`${p}/MEDIA/RACK`,'media equipment shelf','PF-SHELF',[-5.55,e,-1.55],'M-STEEL','cameras and microphones',{yaw:PI/2}),
        fixture(`${p}/MEDIA/REVIEW`,'large edit-review display','PF-SCREEN',[-1.48,e+1.55,-3.25],
          'M-SCREEN','group review, colour and sound checks',{yaw:-PI/2,size:[1.65,1.05,.05],text:'学生媒体 · MEDIA LAB'}),
        fixture(`${p}/MEDIA/WHITEBOARD`,'production planning board','PF-WHITEBOARD',[-3.75,e+1.45,-5.02],
          'M-WHITEBOARD','shot lists, edit notes and publishing calendar',{yaw:0,size:[2.35,.9,.05]}),
        fixture(`${p}/MEDIA/PLANT`,'media-room plant','PF-PLANT',[-1.85,e,-4.62],
          'M-PLANT','soften the equipment-heavy editing room',{size:[.45,1.0,.45]}),
        b07Decor(`${p}/MEDIA/FEATURE`,'charcoal acoustic edit wall',[-3.75,e+1.42,-5.04],
          'M-STEEL-DARK',[4.15,2.5,.05],'cinema-like media-room backdrop'),
        b07Decor(`${p}/MEDIA/PANEL-W`,'blue acoustic panel A',[-6.02,e+1.45,-3.35],
          'M-FABRIC-BLUE',[.05,2.35,1.35],'control editing-room reverberation'),
        b07Decor(`${p}/MEDIA/PANEL-E`,'blue acoustic panel B',[-1.48,e+1.45,-1.85],
          'M-FABRIC-BLUE',[.05,2.35,1.0],'control editing-room reverberation'),
        b07Sign(`${p}/MEDIA/GEAR-SIGN`,'equipment check-out sign',[-5.98,e+2.16,-1.6],
          '器材借用 · GEAR','label camera and microphone storage',{yaw:PI/2,size:[1.25,.28,.04]}),
        b07Raft(`${p}/MEDIA/RAFT-W`,e,-4.9,-3.1,1.75,2.6),
        b07Raft(`${p}/MEDIA/RAFT-E`,e,-2.65,-3.1,1.75,2.6),
        ...lightGrid(`${p}/MEDIA`,e,[[-4.9,-3.0],[-2.65,-3.0]],3600),
      ]),
      room(`${p}/PROJECT`,'社团项目室',[-1.2,3.6,-5.1,-1.1],'activity',[],[
        fixture(`${p}/PROJECT/T1`,'project table A','PF-ART-TABLE',[-.1,e,-3.2],'M-OAK','club making'),
        fixture(`${p}/PROJECT/T2`,'project table B','PF-ART-TABLE',[2.2,e,-3.2],'M-OAK','club making'),
        fixture(`${p}/PROJECT/LOCK`,'project locker bank','PF-LOCKERS',[3.15,e,-4.55],'M-STEEL','club project storage',{yaw:-PI/2}),
        fixture(`${p}/PROJECT/SHELF`,'prototype display shelf','PF-SHELF',[-.78,e,-4.55],
          'M-STEEL-DARK','works in progress and completed prototypes',{yaw:PI/2,size:[.9,1.85,.42]}),
        fixture(`${p}/PROJECT/BOARD`,'maker planning whiteboard','PF-WHITEBOARD',[1.15,e+1.48,-1.18],
          'M-WHITEBOARD','club briefs, measurements and task board',{yaw:PI,size:[2.7,.92,.05]}),
        fixture(`${p}/PROJECT/PLANT`,'project-room plant','PF-PLANT',[3.15,e,-1.55],
          'M-PLANT','soften the club maker room',{size:[.44,.95,.44]}),
        b07Decor(`${p}/PROJECT/TOOLWALL`,'oak maker tool wall',[1.15,e+1.45,-5.02],
          'M-OAK',[3.55,2.5,.05],'organized hand tools and project templates'),
        b07Sign(`${p}/PROJECT/TITLE`,'club-project title',[1.15,e+2.15,-4.98],
          '社团项目 · PROJECT STUDIO','maker-room identity',{yaw:0,size:[2.05,.34,.05]}),
        b07Decor(`${p}/PROJECT/GRID`,'project floor work grid',[1.05,e+.018,-3.2],
          'M-SAFETY-YELLOW',[3.7,.025,.10],'organize safe making zones'),
        b07Raft(`${p}/PROJECT/RAFT-W`,e,-.1,-3.2,1.75,2.5),
        b07Raft(`${p}/PROJECT/RAFT-E`,e,2.2,-3.2,1.75,2.5),
        ...lightGrid(`${p}/PROJECT`,e,[[-.1,-3.2],[2.2,-3.2]],3700),
      ]),
      room(`${p}/HEALTH`,'健康教育室',[-6.1,-.8,1.1,5.1],'clinic',[],[
        ...seminarRoom(`${p}/HEALTH`,e,[-5.9,-1.0,1.3,4.9]),
        fixture(`${p}/HEALTH/DEMO`,'health-demonstration cabinet','PF-FIRST-AID',[-5.72,e+1.12,4.55],
          'M-CLINIC','CPR, first-aid and prevention teaching aids',{yaw:PI/2}),
        fixture(`${p}/HEALTH/INFO`,'health education display','PF-SCREEN',[-6.02,e+1.55,3.2],
          'M-SCREEN','campus health campaigns and interactive lessons',{yaw:PI/2,size:[1.55,.95,.05],text:'健康教育 · HEALTH EDUCATION'}),
        fixture(`${p}/HEALTH/PLANT`,'health-class plant','PF-PLANT',[-1.35,e,4.45],
          'M-PLANT','calm biophilic teaching-room corner',{size:[.48,1.05,.48]}),
        b07Decor(`${p}/HEALTH/FEATURE`,'pale-green health feature wall',[-3.45,e+1.42,5.02],
          'M-WALL-GREEN',[4.65,2.5,.05],'calm teaching-room identity and health campaign backdrop'),
        b07Decor(`${p}/HEALTH/ACCESS`,'accessible seminar position marker',[-1.52,e+.018,1.72],
          'M-LAB-BLUE',[1.05,.025,1.15],'keep an accessible seminar position clear'),
        b07Sign(`${p}/HEALTH/ACCESS-SIGN`,'accessible seminar marker',[-1.52,e+.04,1.72],
          '无障碍席位','identify the accessible learning position',{size:[.7,.03,.36]}),
        b07Raft(`${p}/HEALTH/RAFT-W`,e,-4.6,3.1,1.65,2.65,'M-WALL-GREEN'),
        b07Raft(`${p}/HEALTH/RAFT-E`,e,-2.35,3.1,1.65,2.65,'M-WALL-GREEN'),
      ]),
      room(`${p}/ADMIN`,'校医院办公室',[-.6,1.7,1.1,5.1],'office',[],[
        ...officeRoom(`${p}/ADMIN`,e,[-.4,1.5,1.3,4.9],1,'校医院办公室'),
        fixture(`${p}/ADMIN/VISITOR`,'visitor chair','PF-CHAIR',[-.05,e,2.0],
          'M-FABRIC-BLUE','private staff consultation',{yaw:0}),
        fixture(`${p}/ADMIN/RECORDS`,'additional locked records','PF-FILE-CABINET',[1.2,e,4.15],
          'M-STEEL-DARK','confidential clinic administration records',{size:[.72,1.25,.42]}),
        b07Decor(`${p}/ADMIN/RUG`,'quiet clinic-office rug',[.55,e+.018,3.05],
          'M-RUBBER',[1.65,.025,2.45],'soft administrative work zone'),
        b07Decor(`${p}/ADMIN/FEATURE`,'green administrative pin-up wall',[.55,e+1.45,5.02],
          'M-WALL-GREEN',[1.85,1.55,.05],'staff rota, service notices and care standards'),
        b07Sign(`${p}/ADMIN/PRIVACY`,'records privacy sign',[.55,e+2.25,4.98],
          '医务办公室 · PRIVATE','clinic-office identity and privacy notice',{yaw:PI,size:[1.6,.28,.04]}),
        b07Raft(`${p}/ADMIN/RAFT`,e,.55,3.05,1.75,1.15,'M-WALL-GREEN'),
      ]),
      room(`${p}/STAFF`,'医务人员休息与储藏',[1.9,3.6,1.1,5.1],'clinic',[],[
        fixture(`${p}/STAFF/BENCH`,'staff bench','PF-BENCH',[2.75,e,2.0],'M-FABRIC-BLUE','staff rest'),
        fixture(`${p}/STAFF/LOCK`,'staff lockers','PF-LOCKERS',[3.1,e,4.45],'M-STEEL','staff clothing',{yaw:-PI/2,size:[1.2,1.9,.5]}),
        fixture(`${p}/STAFF/WATER`,'staff water dispenser','PF-WATER',[2.15,e,4.55],'M-STEEL','staff drinks'),
        fixture(`${p}/STAFF/PLANT`,'staff-room plant','PF-PLANT',[2.18,e,1.55],
          'M-PLANT','soften the staff decompression room',{size:[.42,.92,.42]}),
        b07Decor(`${p}/STAFF/TABLE`,'small staff tea table',[2.75,e+.34,3.1],
          'M-OAK',[.75,.42,.5],'tea, handover notes and short breaks'),
        fixture(`${p}/STAFF/NOTICE`,'staff handover board','PF-WHITEBOARD',[3.52,e+1.48,3.15],
          'M-WHITEBOARD','rota, handover and wellbeing notes',{yaw:-PI/2,size:[1.2,.75,.04]}),
        b07Sign(`${p}/STAFF/SIGN`,'staff-room sign',[2.75,e+2.2,5.02],
          '医务人员 · STAFF','restricted staff-zone identity',{yaw:PI,size:[1.45,.28,.04]}),
        b07Decor(`${p}/STAFF/RUG`,'staff rest rug',[2.75,e+.018,2.0],
          'M-RUBBER',[1.25,.025,1.35],'quiet staff decompression zone'),
        b07Raft(`${p}/STAFF/RAFT`,e,2.75,2.9,1.25,2.5,'M-WALL-GREEN'),
        ...lightGrid(`${p}/STAFF`,e,[[2.75,2.9]],3900),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/SC-COR`,bounds:[-6.1,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},
      {id:`${p}/CL-COR`,bounds:[-6.1,3.8,.85,1.1],clearWidth:1.2,surface:'M-VINYL'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false),
      b07Decor(`${p}/SC-WAYLINE`,'blue media route line',[-1.1,e+.018,-.65],
        'M-FABRIC-BLUE',[9.2,.025,.10],'third-floor student-centre wayfinding'),
      b07Decor(`${p}/CL-WAYLINE`,'green health route line',[-1.1,e+.021,.92],
        'M-WALL-GREEN',[9.2,.027,.10],'third-floor clinic wayfinding'),
      b07Sign(`${p}/SC-WAYFIND`,'media and project route sign',[-1.85,e+1.82,-.95],
        '媒体 · 项目 ↓ · MEDIA + PROJECT','south-side destination confirmation',{yaw:PI,size:[2.45,.3,.05]}),
      b07Sign(`${p}/CL-WAYFIND`,'health route sign',[-1.85,e+1.82,1.04],
        '健康教育 ↑ · HEALTH','north-side destination confirmation',{yaw:0,size:[1.95,.3,.05]}),
      b07Raft(`${p}/COR-RAFT-W`,e,-3.5,0,3.2,.72,'M-OAK'),
      b07Raft(`${p}/COR-RAFT-E`,e,.6,0,3.2,.72,'M-OAK'),
      ...lightGrid(`${p}/COR`,e,[[-2.2,0],[1.7,0]],3800),
    ],{occupancy:48}));
  }
  return {
    id:'B07',label:'学生活动中心 · 校医院',status:'new-interior',centreCampus:[36.5,28.5],localBounds:[-6.5,6.5,-5.5,5.5],
    exteriorFootprint:{x0:30,x1:43,z0:23,z1:34},floors:3,floorHeight:3.0,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'28.5 + localZ'},
    portals:[
      {id:'B07/STUDENT',campusAt:[30,27],campusReturn:[27.4,27,PI/2],localSpawn:[-5.2,0,-1.5,PI/2],placeKey:'campus_student_f1'},
      {id:'B07/CLINIC',campusAt:[30,31],campusReturn:[27.4,31,PI/2],localSpawn:[-5.2,0,2.5,PI/2],placeKey:'campus_clinic_f1'},
    ],
    facadeAlignment:{studentDoor:{side:'west',localAt:[-6.5,-1.5],width:2.2},clinicDoor:{side:'west',localAt:[-6.5,2.5],width:2.2},fireSeparation:{localZ:0,ratingMinutes:60}},
    design:'A polished split-use student and health hub: lively blue felt, oak, brick, project displays and warm acoustic rafts animate the south student-centre rooms, while pale green ceilings, clinical laminate, privacy screens and calm bilingual wayfinding distinguish the north clinic. Both identities meet only at the protected lift and stairs, with tactile approaches and a continuous colour-coded route on every floor.',
    floorsPlan:floors,
  };
}

function buildB08() {
  const e=0,p='B08/F1',workB=[-2.7,1.15,-2.4,2.4],wcB=[1.35,2.7,-2.4,-.25],entryB=[1.35,2.7,-.05,2.4];
  const rooms=[
    room(`${p}/WORK`,'门卫值班室',workB,'security',[],[
      fixture(`${p}/WORK/FEATURE`,'timber command feature wall','PF-WALL-RUN',[-.75,e+1.45,-2.33],'M-OAK-DARK','warm visual anchor behind the command position',{size:[3.45,2.78,.06],collision:'none'}),
      fixture(`${p}/WORK/CCTV-WALL`,'live campus surveillance wall','PF-SCREEN',[-.75,e+1.78,-2.285],'M-SCREEN','twelve-camera campus overview and incident status',{size:[2.75,1.18,.035],text:'校园安全 · CAMPUS SECURITY'}),
      fixture(`${p}/WORK/CONSOLE`,'curved four-monitor security console','PF-CCTV-DESK',[-.55,e,.25],'M-OAK-DARK','CCTV, radio, intercom and barrier controls',{yaw:PI,preserveExteriorSilhouetteAtCampus:[8.8,-9.4]}),
      fixture(`${p}/WORK/CHAIR`,'ergonomic shift chair','PF-CHAIR',[-.55,e,1.05],'M-FABRIC-BLUE','comfortable staffed command position',{yaw:PI}),
      fixture(`${p}/WORK/RUG`,'acoustic command-zone rug','PF-WALL-RUN',[-.55,e+.016,.35],'M-RUBBER','softens the staffed work zone',{size:[2.55,.025,2.05],collision:'none'}),
      fixture(`${p}/WORK/KEYS`,'key cabinet','PF-KEY-CABINET',[1.0,e+1.35,1.6],'M-STEEL-DARK','controlled keys',{yaw:-PI/2}),
      fixture(`${p}/WORK/COUNTER`,'glazed visitor-service counter','PF-SERVICE-COUNTER',[-2.35,e,-.55],'M-OAK','visitor log, ID check and badge issue at the preserved west window',{yaw:PI/2,size:[1.45,1.05,.7]}),
      fixture(`${p}/WORK/WINDOW`,'west visitor transaction window','PF-WALL-RUN',[-2.665,e+1.72,-.55],'M-GLASS','daylit service opening aligned to the exterior guard window',{size:[.035,1.35,1.75],collision:'none'}),
      fixture(`${p}/WORK/WINDOW-BAR`,'visitor window privacy rail','PF-WALL-RUN',[-2.63,e+1.15,-.55],'M-BRASS','protective rail and transaction ledge',{size:[.06,.06,1.55],collision:'none'}),
      fixture(`${p}/WORK/PARCEL`,'labelled parcel shelf','PF-SHELF',[-2.25,e,1.65],'M-STEEL','temporary visitor parcels and lost property',{yaw:PI/2}),
      fixture(`${p}/WORK/NOTICE`,'shift briefing and emergency map','PF-WHITEBOARD',[-2.64,e+1.75,.8],'M-WHITEBOARD','shift notes, emergency contacts and patrol map',{yaw:PI/2,size:[1.15,.9,.04]}),
      fixture(`${p}/WORK/FIRST`,'first-aid cabinet','PF-FIRST-AID',[1.0,e+1.25,-1.65],'M-CLINIC','first aid',{yaw:-PI/2}),
      fixture(`${p}/WORK/EXT`,'fire extinguisher','PF-EXTINGUISHER',[.85,e,-2.0],'M-SAFETY-RED','fire safety'),
      fixture(`${p}/WORK/WATER`,'thermos and water station','PF-WATER',[-1.8,e,-1.75],'M-STEEL','guard drinks'),
      fixture(`${p}/WORK/LOCK`,'guard locker bank','PF-LOCKERS',[.15,e,-1.95],'M-STEEL-DARK','guard clothing',{size:[1.2,1.9,.5]}),
      fixture(`${p}/WORK/CLOCK`,'wall clock','PF-CLOCK',[0,e+2.45,-2.3],'M-WALL-WHITE','shift time',{yaw:0}),
      fixture(`${p}/WORK/AC`,'wall air conditioner','PF-AC',[-2.5,e+2.45,.8],'M-WALL-WHITE','guardhouse climate',{yaw:PI/2}),
      fixture(`${p}/WORK/PLANT`,'low-maintenance command-room plant','PF-PLANT',[.65,e,1.75],'M-PLANT','softens the secure workspace',{size:[.48,1.05,.48]}),
      fixture(`${p}/WORK/PENDANT`,'visitor-counter pendant','PF-PENDANT',[-2.0,e+2.72,-.55],'M-BRASS','warm task light at public service point',{temperatureK:3000}),
      ...lightGrid(`${p}/WORK`,e,[[-1.25,.65],[.25,.65]],3500),
    ]),
    room(`${p}/WC`,'值班卫生间与清洁柜',wcB,'service',[],[
      fixture(`${p}/WC/T`,'compact toilet','PF-TOILET',[2.0,e,-1.65],'M-CERAMIC','staff sanitary fixture'),
      fixture(`${p}/WC/B`,'compact basin','PF-BASIN',[2.25,e,-.65],'M-CERAMIC','hand washing',{size:[.5,.86,.38]}),
      fixture(`${p}/WC/CLEAN`,'cleaning cupboard','PF-CLEANING',[1.62,e,-.55],'M-STEEL','cleaning equipment',{size:[.55,1.9,.45]}),
      fixture(`${p}/WC/MIRROR`,'illuminated washroom mirror','PF-DANCE-MIRROR',[2.665,e+1.55,-.72],'M-GLASS','bright mirror over the compact basin',{yaw:-PI/2,size:[.78,.72,.035]}),
      fixture(`${p}/WC/DRYER`,'wall hand dryer','PF-WALL-RUN',[2.66,e+1.1,-1.15],'M-WALL-WHITE','hands-free drying',{yaw:-PI/2,size:[.05,.34,.25]}),
      fixture(`${p}/WC/MAT`,'anti-slip washroom floor field','PF-WALL-RUN',[2.02,e+.014,-1.25],'M-RUBBER','safe dry standing zone',{size:[1.1,.02,1.65],collision:'none'}),
      fixture(`${p}/WC/VENT`,'quiet extract grille','PF-WALL-RUN',[2.25,e+2.78,-2.28],'M-STEEL','washroom ventilation',{size:[.48,.04,.22],collision:'none'}),
      ...lightGrid(`${p}/WC`,e,[[2.05,-1.35]],4000),
    ]),
    room(`${p}/ENTRY`,'员工入口与储物',entryB,'security',[
      doorway(`${p}/ENTRY/EXT`,'north',[1.8,e,2.7],.95,'campus',{portal:true})
    ],[
      fixture(`${p}/ENTRY/MAT`,'recessed ribbed entry mat','PF-WALL-RUN',[1.92,e+.02,1.9],'M-RUBBER','clean and slip-resistant entry',{size:[1.05,.04,1.25],collision:'none'}),
      fixture(`${p}/ENTRY/GLASS`,'glazed secure vestibule screen','PF-WALL-RUN',[1.315,e+1.42,1.15],'M-GLASS','separates the staff vestibule while preserving sightlines',{size:[.035,2.65,2.25],collision:'none'}),
      fixture(`${p}/ENTRY/SIGN`,'security room identity blade','PF-ROOM-SIGN',[1.37,e+1.68,1.82],'M-SCREEN','staff entrance identity',{yaw:PI/2,text:'门卫 · SECURITY'}),
      fixture(`${p}/ENTRY/ACCESS`,'staff access and badge terminal','PF-SELF-CHECK',[1.6,e,.45],'M-SCREEN','staff access, visitor badge return and shift check-in',{size:[.42,1.2,.38]}),
      fixture(`${p}/ENTRY/COAT`,'coat and equipment locker','PF-LOCKERS',[2.3,e,.5],'M-STEEL-DARK','visitor badges and coats',{size:[.8,1.9,.45]}),
      fixture(`${p}/ENTRY/BENCH`,'compact boot-changing bench','PF-BENCH',[2.38,e,1.45],'M-OAK','change footwear and set down equipment',{yaw:PI/2,size:[.82,.72,.42]}),
      fixture(`${p}/ENTRY/UMBRELLA`,'umbrella and wet-gear stand','PF-BIN',[2.4,e,2.15],'M-STEEL','wet-weather equipment storage',{size:[.28,.58,.28]}),
      fixture(`${p}/ENTRY/LIGHT`,'vestibule ceiling light','PF-CEILING-LIGHT',[1.95,e+2.75,1.4],'M-WALL-WHITE','bright safe arrival',{temperatureK:3500,lumens:1600,size:[.7,.06,.28]}),
    ]),
  ];
  return {
    id:'B08',label:'门卫 · 访客室',status:'new-interior',centreCampus:[9.4,-9.7],localBounds:[-3,3,-2.7,2.7],
    exteriorFootprint:{x0:6.4,x1:12.4,z0:-12.4,z1:-7},floors:1,floorHeight:3.2,wallThickness:.18,partitionThickness:.10,
    localToCampus:{worldX:'9.4 + localX',worldZ:'-9.7 + localZ'},
    portals:[{id:'B08/STAFF',campusAt:[11.2,-7],campusReturn:[11.2,-5.8,PI],localSpawn:[1.8,0,1.65,PI],placeKey:'campus_security'}],
    facadeChanges:[{id:'B08/DOOR-N','instruction':'Add a 0.95 m north-facing staff door centred at campus (11.2,-7.0); preserve the west service window at (6.4,-9.5).'}],
    facadeAlignment:{westServiceWindow:{localX:-3,localZ:.2},southWindow:{localZ:-2.7},preservedDeskSilhouetteCampus:[8.8,-9.4]},
    design:'A compact but credible 24-hour security pavilion: a timber-backed command wall with live surveillance, preserved glazed visitor counter, ergonomic shift station, secure badge vestibule, disciplined storage and a fully finished staff washroom. Warm oak and brass soften the dark anti-slip security palette while blue displays maintain a clear university identity.',
    floorsPlan:[floor(1,0,3.2,rooms,[{id:`${p}/CLEAR`,bounds:[.95,1.4,-.1,2.4],clearWidth:.95,surface:'M-TILE-DARK'}],[
      ...safetySet(p,e,[.8,-2],[1.8,2.4],1,false),
      fixture(`${p}/CEILING-SLAT1`,'oak ceiling raft west','PF-WALL-RUN',[-1.35,e+2.93,.55],'M-OAK-DARK','warm acoustic ceiling datum',{size:[1.05,.08,2.65],collision:'none'}),
      fixture(`${p}/CEILING-SLAT2`,'oak ceiling raft centre','PF-WALL-RUN',[-.15,e+2.93,.55],'M-OAK-DARK','warm acoustic ceiling datum',{size:[1.05,.08,2.65],collision:'none'}),
      fixture(`${p}/BRAND`,'university security crest wall','PF-ROOM-SIGN',[-2.63,e+2.38,1.72],'M-BRASS','institutional identity at the visitor window',{yaw:PI/2,text:'北京文华大学 · 校园安全'}),
    ],{occupancy:4})],
  };
}

const buildings=[buildB01(),buildB02(),buildB03(),buildB04(),buildB05(),buildB06(),buildB07(),buildB08()];

// Complete the authored circulation graph before publishing the blueprint.  Most programme
// rooms already carry a deliberate corridor door; compact service cores and open public zones
// are authored as rectangles first, so this pass adds the missing, deterministic connection at
// the nearest genuine shared edge.  Paired room doors receive matching centres on both faces.
// The result is stored in JSON (rather than guessed by the renderer), keeping documentation,
// collision openings and playable geometry on one source of truth.
const oppositeSide={west:'east',east:'west',south:'north',north:'south'};
function routeFace(bounds,target,tolerance=.45) {
  const [x0,x1,z0,z1]=bounds,[a,b,c,d]=target,candidates=[];
  const overlap=(u0,u1,v0,v1)=>[Math.max(u0,v0),Math.min(u1,v1)];
  const add=(side,gap,extension,span,fixed)=>{
    const length=span[1]-span[0];
    if(gap<=tolerance&&extension>=-.001&&length>=.75)
      candidates.push({side,gap,extension,length,centre:(span[0]+span[1])/2,fixed,
        score:gap*100-extension*12-length});
  };
  add('east',Math.max(0,a-x1),b-x1,overlap(z0,z1,c,d),x1);
  add('west',Math.max(0,x0-b),x0-a,overlap(z0,z1,c,d),x0);
  add('north',Math.max(0,c-z1),d-z1,overlap(x0,x1,a,b),z1);
  add('south',Math.max(0,z0-d),z0-c,overlap(x0,x1,a,b),z0);
  return candidates.sort((u,v)=>u.score-v.score)[0]||null;
}

function roomFace(a,b,tolerance=.45) {
  const [ax0,ax1,az0,az1]=a,[bx0,bx1,bz0,bz1]=b,candidates=[];
  const overlap=(u0,u1,v0,v1)=>[Math.max(u0,v0),Math.min(u1,v1)];
  const add=(side,gap,span,fixed,otherFixed)=>{
    const length=span[1]-span[0];
    if(gap>=-.001&&gap<=tolerance&&length>=.9)
      candidates.push({side,gap,length,centre:(span[0]+span[1])/2,fixed,otherFixed,
        score:gap*100-length});
  };
  if(bx0>=ax1-tolerance)add('east',bx0-ax1,overlap(az0,az1,bz0,bz1),ax1,bx0);
  if(bx1<=ax0+tolerance)add('west',ax0-bx1,overlap(az0,az1,bz0,bz1),ax0,bx1);
  if(bz0>=az1-tolerance)add('north',bz0-az1,overlap(ax0,ax1,bx0,bx1),az1,bz0);
  if(bz1<=az0+tolerance)add('south',az0-bz1,overlap(ax0,ax1,bx0,bx1),az0,bz1);
  return candidates.sort((u,v)=>u.score-v.score)[0]||null;
}

function completeCirculationDoors() {
  let added=0;
  for(const building of buildings) for(const f of building.floorsPlan) {
    const rooms=new Map(f.rooms.map(r=>[r.id,r])),routes=new Map((f.circulation||[]).map(r=>[r.id,r]));
    const connected=new Set(),links=[];
    const isInterior=d=>!d.portal&&!['campus','campus-service'].includes(d.destination);
    const addRouteDoor=(room,route,face)=>{
      const at=face.side==='east'||face.side==='west'?
        [face.fixed,f.elevation,face.centre]:[face.centre,f.elevation,face.fixed];
      room.doors.push(doorway(`${room.id}/D-AUTO-${String(room.doors.length+1).padStart(2,'0')}`,
        face.side,at,1.2,route.id,{autoCompleted:true,designIntent:'direct connection to authored circulation'}));
      connected.add(room.id); added++;
    };
    const addPair=(left,right,face)=>{
      const atA=face.side==='east'||face.side==='west'?
        [face.fixed,f.elevation,face.centre]:[face.centre,f.elevation,face.fixed];
      const atB=face.side==='east'||face.side==='west'?
        [face.otherFixed,f.elevation,face.centre]:[face.centre,f.elevation,face.otherFixed];
      left.doors.push(doorway(`${left.id}/D-AUTO-${String(left.doors.length+1).padStart(2,'0')}`,
        face.side,atA,1.2,right.id,{autoCompleted:true,designIntent:'paired connection between adjacent programme rooms'}));
      right.doors.push(doorway(`${right.id}/D-AUTO-${String(right.doors.length+1).padStart(2,'0')}`,
        oppositeSide[face.side],atB,1.2,left.id,{autoCompleted:true,designIntent:'paired connection between adjacent programme rooms'}));
      added+=2;
    };

    // Respect every authored route/room connection first.
    for(const room of f.rooms) for(const d of room.doors.filter(isInterior)) {
      if(routes.has(d.destination))connected.add(room.id);
      else if(rooms.has(d.destination))links.push([room.id,d.destination]);
    }

    // Add a direct door where an authored circulation rectangle meets a currently unconnected
    // room boundary.  This also cuts the thin through-routes used by the library and clinic.
    for(const room of f.rooms) if(!connected.has(room.id)) {
      const candidates=[];
      for(const route of routes.values()) {
        const face=routeFace(room.bounds,route.bounds);
        if(face)candidates.push({route,face});
      }
      candidates.sort((u,v)=>u.face.score-v.face.score);
      if(candidates[0])addRouteDoor(room,candidates[0].route,candidates[0].face);
    }

    // Propagate existing room-to-room links from the route-connected set.
    let changed=true;
    while(changed){changed=false;for(const [a,b] of links){
      if(connected.has(a)&&!connected.has(b)){connected.add(b);changed=true;}
      if(connected.has(b)&&!connected.has(a)){connected.add(a);changed=true;}
    }}

    // Join any remaining service/core room to the nearest connected neighbour with a paired
    // doorway.  Every current campus plate is a rectilinear programme, so a 0.45 m adjacency
    // tolerance covers its deliberately drawn partition/service gaps without inventing corridors.
    while(connected.size<f.rooms.length) {
      let best=null;
      for(const room of f.rooms) if(!connected.has(room.id)) for(const target of f.rooms) if(connected.has(target.id)) {
        const face=roomFace(room.bounds,target.bounds);
        if(face&&(!best||face.score<best.face.score))best={room,target,face};
      }
      if(!best) {
        const missing=f.rooms.filter(r=>!connected.has(r.id)).map(r=>r.id).join(', ');
        throw new Error(`${building.id}/F${f.level}: cannot complete circulation doors for ${missing}`);
      }
      addPair(best.room,best.target,best.face);
      connected.add(best.room.id);
    }
  }
  return added;
}

function normalizeCirculationBounds() {
  let corrected=0;
  for(const building of buildings) for(const f of building.floorsPlan) for(const route of f.circulation||[]) {
    const [x0,x1,z0,z1]=route.bounds,w=x1-x0,d=z1-z0,clear=route.clearWidth||Math.min(w,d);
    if(w<=d&&w+1e-6<clear) {
      const cx=(x0+x1)/2; route.authoredCentrelineBounds=[...route.bounds];
      route.bounds=[r3(cx-clear/2),r3(cx+clear/2),z0,z1]; route.boundsCorrectedToClearWidth=true; corrected++;
    } else if(d<w&&d+1e-6<clear) {
      const cz=(z0+z1)/2; route.authoredCentrelineBounds=[...route.bounds];
      route.bounds=[x0,x1,r3(cz-clear/2),r3(cz+clear/2)]; route.boundsCorrectedToClearWidth=true; corrected++;
    }
  }
  return corrected;
}

const normalizedCirculationCount=normalizeCirculationBounds();
const autoCompletedDoorCount=completeCirculationDoors();

const implementationContract={
  sceneModel:'Each floor is an independent lazy indoor scene with its deck at local y=0. Blueprint y values remain absolute building metadata; subtract floor.elevation when constructing an individual floor scene.',
  transform:{
    worldX:'originX + localX*cos(theta) + localZ*sin(theta)',
    worldZ:'originZ - localX*sin(theta) + localZ*cos(theta)',
    worldY:'floorBaseY + localY',
    worldYaw:'normalize(localYaw + theta)',
    note:'All eight building records use theta=0 because local +x/+z follows campus +x/+z. A renderer may choose another scene orientation only if it applies the full transform to every opening and return point.'
  },
  primitiveRule:'Build.scene box() and flat() use centre coordinates and full dimensions. A model y is its floor anchor. Prefab anchor semantics are in prefabCatalog.',
  collisionRule:'Visible meshes never imply collision. Instantiate one body solid per fixture whose collision is body/prefab-default; wall runs and stair/lift shells need matching camera blockers. Never create one collider per book, chair leg or glyph.',
  accessibility:[
    {id:'ACC-B01',instruction:'Add a 1:12 ramp, 1.50 m clear, beside the B01 steps from campus grade to the entrance landing; tactile route must reach the ramp landing.'},
    {id:'ACC-B02',instruction:'Add a 1:12 ramp, 1.50 m clear, beside the B02 west steps without blocking the bicycle hoops.'},
    {id:'ACC-ALL',instruction:'Keep 1.20 m clear public routes, 1.50 m turning circles at lifts/accessible WCs, 0.90 m clear doors, lever hardware, high-contrast nosings and bilingual/tactile room signs.'},
  ],
  fireLifeSafety:[
    'Every occupied upper floor has two independent protected stairs; lift is not counted as an exit.',
    'Every floor has explicit exit signs, emergency lights, alarm call point and extinguisher. Higher-risk rooms add their own equipment.',
    'Clinic and activity-centre routes are separated by a 60-minute self-closing fire door.',
    'Canteen public egress uses the east main door and new south exit; the obstructed west delivery gap is service-only.',
    'Science lab doors, storage controls and safety fixtures are gameplay geometry only; a real laboratory would still require licensed engineering and code review.'
  ],
  implementationFiles:[
    {file:'js/campus-interior-core.js',owns:'all 28 data-driven floor scenes, shared materials/prefabs, shells, partitions, fixtures, lighting, collisions, portals and lift/stair travel'},
    {file:'js/campus-academic.js',owns:'B01/B02 exterior entry portals'},
    {file:'js/campus-west.js',owns:'B03/B05/B06 exterior entry portals'},
    {file:'js/campus-east.js',owns:'B04/B07 exterior entry portals'},
    {file:'js/campus-boundary.js',owns:'B08 guardhouse entry portal'},
    {file:'js/classroom.js',owns:'corrected legacy university seminar scene'},
    {file:'js/library.js',owns:'corrected legacy detailed reading-room scene'},
    {file:'index.html + js/game.js + js/data.js',owns:'blueprint loading, place registration, preview deep links and shared interactions'},
  ],
  legacyAliases:[
    {placeKey:'classroom',mapsTo:'B01/F2/WEST',instruction:'Keep the key and return point; replace high-school signage, add fourth row or explicitly cap at 12 seats, fix SEAT_AT and teacher chair.'},
    {placeKey:'library',mapsTo:'B02/F2/NORTH',instruction:'Keep the key and return point while the full library is introduced; fix table/shelf geometry and window metadata.'},
  ],
  implementedBuildOrder:['shared floor/prefab shell','B03 and B08 single-floor proof scenes','B04/B05/B06/B07 floor families','B01/B02 legacy-preserving expansion','portal wiring and exterior facade cuts','collision, interaction and performance validation'],
};

const nonInteriorStructures=[
  {id:'CAMPUS-GATES',label:'historic and side gates',decision:'No interior: non-occupiable civic structures.'},
  {id:'METRO-MOUTH',label:'大学城 metro entrance',decision:'Already connects to the separate Metro place; no campus-building interior is missing.'},
  {id:'PRINT-KIOSK',label:'printing kiosk',decision:'Counter-sized exterior equipment kiosk; intentionally non-enterable.'},
  {id:'BASKETBALL-COURT',label:'compact basketball court',decision:'Outdoor facility, not a building. Keep its 2.4 m northwest gate clear; optional scoreboard at campus (36,2.15,16.82).'},
];

function allFixtures(building) {
  const out=[];
  for(const f of building.floorsPlan) {
    for(const r of f.rooms) for(const q of r.contents) out.push({building:building.id,floor:f.level,room:r.id,...q});
    for(const q of f.sharedObjects) out.push({building:building.id,floor:f.level,room:null,...q});
  }
  return out;
}

function validate() {
  const ids=new Set(),errors=[];
  for(const b of buildings) {
    if(b.floorsPlan.length!==b.floors) errors.push(`${b.id}: floorsPlan length ${b.floorsPlan.length} != floors ${b.floors}`);
    const [bx0,bx1,bz0,bz1]=b.localBounds;
    for(const f of b.floorsPlan) {
      if(f.elevation<0||f.elevation>=b.floors*b.floorHeight+.001) errors.push(`${b.id}/F${f.level}: invalid elevation`);
      for(const r of f.rooms) {
        const [x0,x1,z0,z1]=r.bounds;
        if(!(x0<x1&&z0<z1)) errors.push(`${r.id}: invalid bounds`);
        if(x0<bx0-.001||x1>bx1+.001||z0<bz0-.001||z1>bz1+.001) errors.push(`${r.id}: room leaves building local bounds`);
      }
      for(const q of [...f.rooms.flatMap(r=>r.contents),...f.sharedObjects]) {
        if(ids.has(q.id)) errors.push(`duplicate fixture id ${q.id}`); else ids.add(q.id);
        if(!prefabById[q.prefab]) errors.push(`${q.id}: missing prefab ${q.prefab}`);
        if(!materialIds.has(q.material)) errors.push(`${q.id}: missing material ${q.material}`);
        if(!Array.isArray(q.at)||q.at.length!==3||q.at.some(v=>!Number.isFinite(v))) errors.push(`${q.id}: invalid at`);
        if(q.at[0]<bx0-.5||q.at[0]>bx1+.5||q.at[2]<bz0-.5||q.at[2]>bz1+.5) errors.push(`${q.id}: anchor outside ${b.id} local envelope`);
      }
      const safety=f.sharedObjects.map(q=>q.prefab);
      for(const required of ['PF-EXTINGUISHER','PF-ALARM','PF-EXIT-SIGN','PF-EMERGENCY-LIGHT'])
        if(!safety.includes(required)) errors.push(`${b.id}/F${f.level}: missing shared ${required}`);
    }
  }
  if(errors.length) throw new Error(`University interior blueprint validation failed:\n${errors.join('\n')}`);
}

validate();

const totals={
  buildings:buildings.length,
  floors:buildings.reduce((n,b)=>n+b.floorsPlan.length,0),
  rooms:buildings.reduce((n,b)=>n+b.floorsPlan.reduce((m,f)=>m+f.rooms.length,0),0),
  fixtureInstances:buildings.reduce((n,b)=>n+allFixtures(b).length,0),
  beds:buildings.reduce((n,b)=>n+allFixtures(b).filter(q=>q.prefab==='PF-BED').length,0),
  studentSeatPairs:buildings.reduce((n,b)=>n+allFixtures(b).filter(q=>q.prefab==='PF-STUDENT-DESK-2').length,0),
  labBenches:buildings.reduce((n,b)=>n+allFixtures(b).filter(q=>['PF-LAB-BENCH','PF-MICROSCOPE','PF-ROBOTICS'].includes(q.prefab)).length,0),
  autoCompletedDoors:autoCompletedDoorCount,
  normalizedCirculationRoutes:normalizedCirculationCount,
};

const blueprint={
  meta:{schema:'chinesegame.university-interiors/v1',title:'北京文华大学 · complete interior construction blueprint',blueprintVersion:2,exteriorLayoutVersion:2,buildStatus:'implemented',units:'metres',generatedFrom:'tools/generate-university-interiors-blueprint.js',sourceOfTruth:'JSON',canonicalGeometryHash:null},
  coordinateContract:{axis:{x:'+x east',z:'+z north',y:'+y up'},yaw:{'0':'+z north','PI/2':'+x east','PI':'-z south','-PI/2':'-x west'},rectangleOrder:['x0','x1','z0','z1'],objectPoint:['x','y','z'],precision:{plan:.01,vertical:.001},playerRadius:.30},
  audit:{checkedSources:['UNIVERSITY-BLUEPRINT.md','js/campus-academic.js','js/campus-west.js','js/campus-east.js','js/campus-boundary.js','js/classroom.js','js/library.js','js/data.js','js/game.js'],existingInteriorAudit,nonInteriorStructures},
  totals,materials,prefabCatalog,finishSets,buildings,implementationContract,
};

const hashInput=JSON.stringify({...blueprint,meta:{...blueprint.meta,canonicalGeometryHash:null}});
blueprint.meta.canonicalGeometryHash=crypto.createHash('sha256').update(hashInput).digest('hex');

function mdTable(headers,rows) {
  return `| ${headers.join(' | ')} |\n| ${headers.map(()=> '---').join(' | ')} |\n`+
    rows.map(row=>`| ${row.map(v=>String(v).replace(/\|/g,'\\|')).join(' | ')} |`).join('\n');
}

function fmtBounds(b) { return `x[${b[0]}, ${b[1]}] z[${b[2]}, ${b[3]}]`; }
function fixtureCount(f) { return f.rooms.reduce((n,r)=>n+r.contents.length,0)+f.sharedObjects.length; }

function makeMarkdown() {
  const out=[];
  out.push('# 北京文华大学 · complete interior construction blueprint','',
    'This is the implemented, construction-grade interior companion to `UNIVERSITY-BLUEPRINT.md`. The exterior campus layout stays fixed. This blueprint audits every occupiable campus building, preserves the two existing place keys, and defines every floor, room, door, major fixture, safety object, coordinate, finish, portal and build rule used by the runtime.','',
    'The machine-readable source of truth is [`UNIVERSITY-INTERIORS-BLUEPRINT.json`](UNIVERSITY-INTERIORS-BLUEPRINT.json). Re-run `node tools/generate-university-interiors-blueprint.js` after any authored change. If prose and JSON disagree, use the JSON and regenerate this file.','',
    `Blueprint version **${blueprint.meta.blueprintVersion}** · exterior layout **${blueprint.meta.exteriorLayoutVersion}** · canonical hash \`${blueprint.meta.canonicalGeometryHash}\`.`,''
  );
  out.push('## 1. Audit result','',
    'Before this construction pass, only two university interiors existed, and both were single representative rooms. B03–B08 were opaque exterior masses with decorative doors/windows and no registered indoor place. The metro mouth already connected to Metro and is not part of this interior scope.','',
    mdTable(['Building','Current state','What is missing'],existingInteriorAudit.map(a=>[a.buildingId,a.status,a.gap])),''
  );
  out.push('### Existing-room corrections required','');
  for(const a of existingInteriorAudit.filter(a=>a.defects)) {
    out.push(`**${a.buildingId} · ${a.placeKey}**`,'',...a.defects.map(v=>`- ${v}`),'');
  }
  out.push('## 2. Coordinate and construction contract','',
    '- Coordinates are metres. In every building-local plan, `+x` is campus east, `+z` is campus north and `+y` is up.',
    '- Room rectangles are `[x0,x1,z0,z1]`. Fixture points are `[x,y,z]`. `box()` dimensions are full dimensions.',
    '- Each building publishes its exact local-to-campus transform. Upper floors should be separate indoor scenes with their deck reset to local `y=0`; the JSON keeps absolute building y metadata.',
    '- Prefabs are deterministic composite objects. An instance coordinate plus the prefab component design is the exhaustive object instruction; builders must not invent filler.',
    '- Every visible solid needs one deliberate collision footprint. Glyphs, chair legs, books and decorative subparts do not get individual colliders.',''
  );
  out.push('## 3. Scope and totals','',mdTable(['Quantity','Count'],Object.entries(totals).map(([k,v])=>[k,v])),''
  );
  out.push('## 4. Building summary','',mdTable(['ID','Building','Floors','Local envelope','Current / planned'],buildings.map(b=>[b.id,b.label,b.floors,fmtBounds(b.localBounds),b.status])),''
  );
  for(const b of buildings) {
    out.push(`## ${b.id} · ${b.label}`,'',b.design,'',
      `Exterior footprint: \`x[${b.exteriorFootprint.x0},${b.exteriorFootprint.x1}] z[${b.exteriorFootprint.z0},${b.exteriorFootprint.z1}]\`. Local envelope: \`${fmtBounds(b.localBounds)}\`. Transform: \`${b.localToCampus.worldX}\`, \`${b.localToCampus.worldZ}\`.`,''
    );
    out.push('### Portals','',mdTable(['Portal','Campus anchor','Campus return','Local spawn','Place key'],b.portals.map(p=>[
      p.id,p.campusAt?JSON.stringify(p.campusAt):p.mapsTo||'—',p.campusReturn?JSON.stringify(p.campusReturn):'—',p.localSpawn?JSON.stringify(p.localSpawn):'—',p.placeKey
    ])),''
    );
    if(b.facadeChanges?.length) out.push('### Required facade cuts','',...b.facadeChanges.map(q=>`- **${q.id}:** ${q.instruction}`),'');
    out.push('### Floor and room schedule','');
    for(const f of b.floorsPlan) {
      out.push(`#### Floor ${f.level} · elevation ${f.elevation} m · ${fixtureCount(f)} fixture instances`,'',
        mdTable(['Room ID','Label','Exact clear bounds','Finish','Fixtures','Doors'],f.rooms.map(r=>[
          r.id,r.label,fmtBounds(r.bounds),r.finish,r.contents.length,r.doors.map(d=>`${d.side} ${JSON.stringify(d.at)} w${d.width} → ${d.destination}`).join('<br>')||'—'
        ])),'',
        'Circulation: '+f.circulation.map(c=>`\`${c.id}\` ${fmtBounds(c.bounds)}, clear ${c.clearWidth} m`).join('; ')+'.',''
      );
    }
    out.push('The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.','');
  }
  out.push('## 13. Material and finish schedule','',mdTable(['ID','Label','Colour','Texture','Gloss'],materials.map(m=>[m.id,m.label,m.color,m.texture,m.gloss])),''
  );
  out.push('## 14. Prefab schedule','',
    'Prefab anchors are part of the coordinate contract. Each instance in JSON supplies an exact anchor, size, yaw and material; the design below defines its component parts.','',
    mdTable(['ID','Label','Default size','Anchor','Component design'],prefabCatalog.map(p=>[p.id,p.label,p.size.join(' × '),p.anchor,p.design])),''
  );
  out.push('## 15. Accessibility and life safety','',...implementationContract.accessibility.map(q=>`- **${q.id}:** ${q.instruction}`),'',...implementationContract.fireLifeSafety.map(q=>`- ${q}`),'');
  out.push('## 16. Runtime implementation','',mdTable(['File','Ownership'],implementationContract.implementationFiles.map(q=>[q.file,q.owns])),'',
    'Implemented in this order: '+implementationContract.implementedBuildOrder.map((q,i)=>`${i+1}. ${q}`).join(' → ')+'.','',
    'Acceptance requires reciprocal portals, legal spawns outside collision, floor switching, two protected exits on occupied upper floors, accessible routes, room light isolation, collision/camera blockers, day/night rendering, save compatibility, and normal boot/place/static checks.',''
  );
  return out.join('\n');
}

fs.writeFileSync(JSON_OUT,JSON.stringify(blueprint,null,2)+'\n');
fs.writeFileSync(MD_OUT,makeMarkdown().trimEnd()+'\n');
console.log(`wrote ${path.basename(JSON_OUT)} and ${path.basename(MD_OUT)}`);
console.log(JSON.stringify(totals));
console.log(`sha256 ${blueprint.meta.canonicalGeometryHash}`);
function serviceOffice(prefix,e,b,label,waiting=6) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[
    fixture(`${prefix}/COUNTER`,'student service counter','PF-SERVICE-COUNTER',[cx,e,z1-1.0],'M-OAK','face-to-face service',{yaw:PI,text:label}),
    fixture(`${prefix}/FILES`,'secure file cabinet','PF-FILE-CABINET',[x0+.55,e,z1-.55],'M-STEEL','service records'),
    fixture(`${prefix}/DIR`,'service directory','PF-DIRECTORY',[x1-.65,e,z0+.7],'M-SCREEN','queue and service information',{text:label}),
  ];
  let n=0;
  for(const z of [z0+1.0,z0+2.0]) for(const x of [x0+1.2,x0+3.3]) if(n<waiting/3)
    out.push(fixture(`${prefix}/WAIT${pad(++n)}`,'three-seat waiting bank','PF-WAIT-CHAIRS',[x,e,z],'M-FABRIC-BLUE','waiting seats',{yaw:0}));
  out.push(...lightGrid(prefix,e,[[cx-1.5,cz],[cx+1.5,cz]],3500));
  return out;
}

function furnishDormRoom(prefix,e,b,side='west',accessible=false) {
  const [x0,x1,z0,z1]=b,cz=(z0+z1)/2;
  // Beds run from the external wall toward the room, with a desk beyond each foot and a built-in
  // wardrobe beside the corridor wall.  This leaves a genuine 1.2 m centre entry lane instead of
  // the old mirrored furniture rows, whose beds and wardrobes intersected by almost half a metre.
  const bedX=side==='west'?x0+1.12:x1-1.12;
  const deskX=side==='west'?x0+3.10:x1-3.10;
  const wardrobeX=side==='west'?x1-.38:x0+.38;
  const innerWall=side==='west'?x1-.035:x0+.035,outerWall=side==='west'?x0+.035:x1-.035;
  const zRows=[z0+.62,z1-.62],bedYaw=side==='west'?0:PI,deskYaw=side==='west'?0:PI;
  const out=[];
  for(const [i,z] of [[1,zRows[0]],[2,zRows[1]]]) {
    out.push(
      fixture(`${prefix}/BED${i}`,'single bed','PF-BED',[bedX,e,z],i===1?'M-FABRIC-BLUE':'M-WALL-GREEN','student sleeping',{yaw:bedYaw,size:accessible?[2.0,.58,1.02]:undefined}),
      fixture(`${prefix}/DESK${i}`,'study desk','PF-DORM-DESK',[deskX,e,z],'M-WOOD-DESK','personal study with pull-back space',{yaw:deskYaw}),
      fixture(`${prefix}/WARD${i}`,'built-in wardrobe','PF-WARDROBE',[wardrobeX,e,z],'M-OAK-DARK','personal clothing storage',{yaw:PI/2,size:[.90,2.15,.56]}),
      fixture(`${prefix}/HEAD${i}`,'upholstered bed headboard','PF-WALL-RUN',[bedX,e+.82,i===1?z0+.035:z1-.035],
        i===1?'M-FABRIC-BLUE':'M-WALL-GREEN','individual acoustic headboard',{size:[2.08,1.35,.035],collision:'none'}),
      fixture(`${prefix}/PIN${i}`,'personal study pinboard','PF-WALL-RUN',[deskX,e+1.55,i===1?z0+.04:z1-.04],
        'M-OAK','photos, timetable and study notes',{size:[1.18,.72,.035],collision:'none'}),
      fixture(`${prefix}/PEND${i}`,'bedside pendant','PF-PENDANT',[bedX,e+2.43,z],'M-OAK','warm individual bedside light',{temperatureK:2900,size:[.30,.22,.30]}),
    );
  }
  out.push(
    fixture(`${prefix}/WINDOW`,'large residence window','PF-WALL-RUN',[outerWall+(side==='west'?.018:-.018),e+1.72,cz],'M-GLASS','daylight and campus view',{size:[.035,1.22,1.72],collision:'none'}),
    fixture(`${prefix}/CURTAIN1`,'window curtain A','PF-WALL-RUN',[outerWall+(side==='west'?.035:-.035),e+1.55,cz-1.06],'M-WALL-WARM','soft window dressing',{size:[.045,1.55,.30],collision:'none'}),
    fixture(`${prefix}/CURTAIN2`,'window curtain B','PF-WALL-RUN',[outerWall+(side==='west'?.035:-.035),e+1.55,cz+1.06],'M-WALL-WARM','soft window dressing',{size:[.045,1.55,.30],collision:'none'}),
    fixture(`${prefix}/RUG`,'woven room rug','PF-WALL-RUN',[(x0+x1)/2,e+.018,cz],'M-RUBBER','quiet shared centre zone',{size:[1.25,.025,1.35],collision:'none'}),
    fixture(`${prefix}/PLANT`,'student room plant','PF-PLANT',[bedX,e,cz],'M-PLANT','personal greenery',{size:[.48,1.0,.48]}),
    fixture(`${prefix}/AC`,'wall air conditioner','PF-AC',[innerWall,e+2.35,cz],'M-WALL-WHITE','room cooling above the entrance',{yaw:side==='west'?-PI/2:PI/2}),
    fixture(`${prefix}/BIN`,'waste bin','PF-BIN',[deskX,e,z1-.32],'M-STEEL','room waste'),
    fixture(`${prefix}/LIGHT`,'ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.68,cz],'M-WALL-WHITE','room lighting',{temperatureK:3200,lumens:1800,size:[.65,.06,.65]}),
    fixture(`${prefix}/SIGN`,'room number plate','PF-ROOM-SIGN',[side==='west'?x1-.06:x0+.06,e+1.55,z0+.4],'M-SCREEN','room identification',{yaw:side==='west'?-PI/2:PI/2,text:prefix.split('/').pop()}),
  );
  return out;
}

function labRoom(prefix,e,b,kind='general') {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[
    fixture(`${prefix}/BOARD`,'lab teaching whiteboard','PF-WHITEBOARD',[cx,e+1.65,z1-.08],'M-WHITEBOARD','lab instructions',{yaw:PI}),
    fixture(`${prefix}/PPE`,'PPE storage','PF-LOCKERS',[x0+.95,e,z0+.55],'M-LAB-BLUE','coats, goggles and gloves',{size:[1.2,1.9,.5]}),
    fixture(`${prefix}/EYE`,'eyewash and safety shower','PF-EYEWASH',[x1-.7,e,z0+.7],'M-SAFETY-YELLOW','emergency decontamination'),
    fixture(`${prefix}/SINK`,'laboratory sink','PF-LAB-SINK',[x0+.55,e,z1-.75],'M-STAINLESS','hand and equipment washing',{yaw:PI/2}),
  ];
  const benchPrefab=kind==='robotics'?'PF-ROBOTICS':kind==='microscopy'?'PF-MICROSCOPE':'PF-LAB-BENCH';
  let n=0;
  for(const z of [z0+2.0,cz,z1-2.0]) for(const x of [cx-1.55,cx+1.55]) {
    out.push(fixture(`${prefix}/BENCH${pad(++n)}`,kind==='robotics'?'robotics bench':kind==='microscopy'?'microscope station':'laboratory bench',benchPrefab,[x,e,z],kind==='robotics'?'M-STEEL':'M-LAB-BLUE',`${kind} practical work`,{yaw:0}));
    if(kind!=='robotics'&&kind!=='microscopy') out.push(fixture(`${prefix}/STOOL${pad(n)}`,'laboratory stool','PF-STOOL',[x,e,z-.72],'M-STEEL','student lab seat',{yaw:0}));
  }
  if(kind==='chemistry') for(const [i,z] of [[1,z0+2.0],[2,z1-2.0]]) out.push(fixture(`${prefix}/HOOD${i}`,'fume hood','PF-FUME-HOOD',[x0+.72,e,z],'M-STAINLESS','contained chemical work',{yaw:PI/2}));
  if(kind==='biology') out.push(fixture(`${prefix}/FRIDGE`,'sample refrigerator','PF-MED-FRIDGE',[x1-.55,e,z1-.55],'M-CLINIC','temperature-controlled samples'));
  if(kind==='physics') out.push(fixture(`${prefix}/STORE`,'apparatus shelving','PF-SHELF',[x1-.55,e,z1-.65],'M-STEEL','physics apparatus'));
  out.push(...lightGrid(prefix,e,[[cx-1.7,z0+1.4],[cx+1.7,z0+1.4],[cx-1.7,cz],[cx+1.7,cz],[cx-1.7,z1-1.4],[cx+1.7,z1-1.4]],4200));
  return out;
}

function readingRoom(prefix,e,b,tables=3) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[];
  const zs=Array.from({length:tables},(_,i)=>z0+1.7+i*((z1-z0-3.4)/(Math.max(1,tables-1))));
  zs.forEach((z,i)=>out.push(fixture(`${prefix}/TABLE${pad(i+1)}`,'four-seat reading table','PF-READING-TABLE',[cx,e,z],'M-OAK','quiet reading and study')));
  out.push(
    fixture(`${prefix}/CLOCK`,'reading room clock','PF-CLOCK',[cx,e+2.55,z1-.08],'M-WALL-WHITE','timekeeping',{yaw:PI}),
    fixture(`${prefix}/PLANT`,'reading room plant','PF-PLANT',[x1-.5,e,z1-.55],'M-PLANT','interior planting'),
    ...lightGrid(prefix,e,[[cx-2,cz],[cx+2,cz]],3300),
  );
  return out;
}

function bookStackField(prefix,e,b,cols=2,rows=3) {
  const [x0,x1,z0,z1]=b,out=[];
  let n=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    const x=x0+1.0+c*((x1-x0-2)/(Math.max(1,cols-1))),z=z0+1.8+r*((z1-z0-3.6)/(Math.max(1,rows-1)));
    out.push(fixture(`${prefix}/STACK${pad(++n)}`,'double-sided book stack','PF-BOOKSTACK',[x,e,z],'M-OAK-DARK','classified books',{yaw:0}));
  }
  out.push(...lightGrid(prefix,e,[[x0+1.2,(z0+z1)/2],[(x0+x1)/2,(z0+z1)/2],[x1-1.2,(z0+z1)/2]],3300));
  return out;
}

function verticalCore(prefix,e,b,level,maxLevel,withLift=true) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[];
  if(level<maxLevel) out.push(fixture(`${prefix}/STAIR`,'enclosed stair flight','PF-STAIR',[cx,e,cz],'M-TERRAZZO','vertical egress',{size:[Math.min(2.5,x1-x0-.3),3.0,Math.min(4.8,z1-z0-.3)]}));
  if(withLift) out.push(fixture(`${prefix}/LIFT`,'accessible lift','PF-LIFT',[cx,e,z0+1.05],'M-STEEL','accessible vertical travel',{levels:Array.from({length:maxLevel},(_,i)=>i+1)}));
  out.push(
    fixture(`${prefix}/ELEC`,'electrical cabinet','PF-FILE-CABINET',[x1-.45,e,z1-.55],'M-STEEL-DARK','floor electrical distribution',{size:[.65,1.7,.3]}),
    fixture(`${prefix}/CLEAN`,'cleaning cupboard','PF-CLEANING',[x0+.48,e,z1-.58],'M-STEEL','janitorial storage'),
  );
  return out;
}
