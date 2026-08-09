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
  const [x0,x1,z0,z1]=b,cz=(z0+z1)/2,outer=side==='west'?x0+.95:x1-.95,inner=side==='west'?x1-.75:x0+.75;
  const bedYaw=side==='west'?PI/2:-PI/2,deskYaw=side==='west'?-PI/2:PI/2;
  const out=[];
  for(const [i,z] of [[1,cz-1.02],[2,cz+1.02]]) {
    out.push(
      fixture(`${prefix}/BED${i}`,'single bed','PF-BED',[outer,e,z],'M-OAK','student sleeping',{yaw:bedYaw,size:accessible?[2.0,.58,1.0]:undefined}),
      fixture(`${prefix}/DESK${i}`,'study desk','PF-DORM-DESK',[inner,e,z],'M-WOOD-DESK','personal study',{yaw:deskYaw}),
      fixture(`${prefix}/WARD${i}`,'wardrobe','PF-WARDROBE',[side==='west'?x0+.62:x1-.62,e,cz+(i===1?-.38:.38)],'M-OAK-DARK','personal clothing storage',{yaw:bedYaw}),
    );
  }
  out.push(
    fixture(`${prefix}/SHOES`,'shoe rack','PF-SHOE-RACK',[inner,e,z0+.38],'M-OAK-DARK','shoes at room entry',{yaw:deskYaw}),
    fixture(`${prefix}/AC`,'wall air conditioner','PF-AC',[outer,e+2.35,cz],'M-WALL-WHITE','room cooling',{yaw:side==='west'?PI/2:-PI/2}),
    fixture(`${prefix}/BIN`,'waste bin','PF-BIN',[inner,e,z1-.42],'M-STEEL','room waste'),
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

const existingInteriorAudit = [
  {
    buildingId:'B01',status:'partial-representative-room',placeKey:'classroom',source:'js/classroom.js',
    bounds:[-4.6,4.6,-4.0,4.0],height:2.9,returnToCampus:{x:-3,z:47.2,yaw:0},
    exactGroups:[
      {label:'two-seat student desks',count:6,anchors:[[-1.6,.6],[1.6,.6],[-1.6,-.6],[1.6,-.6],[-1.6,-1.8],[1.6,-1.8]]},
      {label:'student seats',count:12,rule:'two stools are included at x=desk.x±0.36, z=desk.z-0.46'},
      {label:'board assembly',count:1,anchor:[0,1.7,3.79],size:[5.4,1.5,.18]},
      {label:'teacher podium',count:1,anchor:[0,0,2.7],size:[1.2,1.34,.68]},
      {label:'ceiling light rows',count:2,anchors:[[-1.6,2.86,0],[1.6,2.86,0]]},
      {label:'bookcase/book run',count:1,anchor:[-4.46,0,0],notes:'four shelves plus 18 deterministic books'},
      {label:'support objects',count:12,notes:'projector, screen, teacher computer, clock, flag, class sign, timetable, three backpacks, plant, broom set and bin'},
    ],
    defects:['The room plate says 高三二班 (Senior 3, Class 2), so it is not yet a university classroom.','The source comment says four desk rows but only three are built.','SEAT_AT points into the centre aisle rather than a stool.','The promised teacher chair is absent and the stated three bookcases resolve to one shallow shelf.'],
    gap:'Only one 9.2 × 8.0 m classroom exists; no lobby, corridor, stairs, lift, toilets or other four floors are represented.'
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
  {buildingId:'B05',status:'none',gap:'Exterior entrance and service interaction only; no offices, waiting area, records, stairs, lift or interior props.'},
  {buildingId:'B06',status:'none',gap:'Exterior entrance/stair-tower skin only; no walkable labs, safety equipment, stairs, lift or interior props.'},
  {buildingId:'B07',status:'none',gap:'Two exterior doors and window silhouettes only; no activity-centre or clinic rooms.'},
  {buildingId:'B08',status:'none',gap:'Exterior guardhouse shell/window only; no walkable interior and no exterior door portal.'},
];

function buildB01() {
  const floors=[];
  // Two exact 9.2 × 8.0 m modules preserve the current classroom scene without scaling. The
  // central 6.4 m band aligns with the four exterior entrance leaves and holds shared programmes.
  const west=[-12.6,-3.4,-5.0,3.0],centre=[-3.2,3.2,-5.0,3.0],east=[3.4,12.6,-5.0,3.0];
  const levels=[
    {level:1,left:'lecture',middle:'lobby',right:'standard',labels:['101阶梯教室','门厅与导览','102无障碍教室']},
    {level:2,left:'standard',middle:'tutorial',right:'standard',labels:['201教室','教师答疑室','202教室']},
    {level:3,left:'language',middle:'study',right:'computer',labels:['301语言实验室','小组学习区','302计算机教室']},
    {level:4,left:'standard',middle:'prep',right:'standard',labels:['401教室','教学准备室','402教室']},
    {level:5,left:'seminar',middle:'office',right:'computer',labels:['501研讨室','教师办公室','502计算机教室']},
  ];
  for(const spec of levels) {
    const e=(spec.level-1)*3.3,prefix=`B01/F${spec.level}`,rooms=[];
    [[west,spec.left,'WEST'],[centre,spec.middle,'CENTRE'],[east,spec.right,'EAST']].forEach(([b,type,key],i)=>{
      const id=`${prefix}/${key}`,label=spec.labels[i];
      let contents=[];
      if(type==='standard') contents=standardClassroom(id,e,b,label,4,3);
      else if(type==='lecture') contents=lectureRoom(id,e,b);
      else if(type==='language') contents=computerRoom(id,e,b,true);
      else if(type==='computer') contents=computerRoom(id,e,b,false);
      else if(type==='seminar') contents=seminarRoom(id,e,b);
      else if(type==='office') contents=officeRoom(id,e,b,4,label);
      else if(type==='prep') contents=[...officeRoom(id,e,b,2,label),...bookStackField(`${id}/REF`,e,[b[0]+.3,b[1]-.3,b[2]+.2,b[3]-2.4],2,1)];
      else if(type==='tutorial') contents=officeRoom(id,e,b,2,label);
      else if(type==='study') contents=[
        ...Array.from({length:8},(_,j)=>fixture(`${id}/DESK${pad(j+1)}`,'group-study desk','PF-DORM-DESK',[b[0]+1.15+(j%2)*3.7,e,b[2]+1.0+Math.floor(j/2)*1.6],'M-WOOD-DESK','student group study',{yaw:0})),
        fixture(`${id}/BOARD`,'group-study whiteboard','PF-WHITEBOARD',[(b[0]+b[1])/2,e+1.55,b[3]-.08],'M-WHITEBOARD','shared notes',{yaw:PI}),
      ];
      else if(type==='lobby') contents=[
        fixture(`${id}/DIR`,'teaching block directory','PF-DIRECTORY',[b[0]+1.0,e,b[2]+1.0],'M-SCREEN','whole-building wayfinding',{text:'第一教学楼 · 1—5层'}),
        fixture(`${id}/DESK`,'information desk','PF-SERVICE-COUNTER',[(b[0]+b[1])/2,e,b[3]-1.0],'M-OAK','visitor and class assistance',{yaw:PI}),
        fixture(`${id}/BENCH1`,'lobby bench','PF-BENCH',[b[1]-1.0,e,b[2]+1.1],'M-OAK','waiting'),
        fixture(`${id}/BENCH2`,'lobby bench','PF-BENCH',[b[1]-1.0,e,b[2]+2.3],'M-OAK','waiting'),
        fixture(`${id}/PLANT`,'lobby plant','PF-PLANT',[b[0]+.55,e,b[3]-.55],'M-PLANT','arrival planting'),
        ...lightGrid(id,e,[[(b[0]+b[1])/2,b[2]+1.4],[(b[0]+b[1])/2,b[3]-1.4]],3500),
      ];
      const moduleDoorX=key==='WEST'?-4.6:key==='EAST'?11.4:0;
      const doors=[doorway(`${id}/D1`,'north',[moduleDoorX,e,b[3]],1.05,`${prefix}/CORRIDOR`)];
      if(spec.level===1&&key==='CENTRE') doors.push(doorway(`${id}/D-EXT`,'south',[0,e,-5.5],3.2,'campus',{portal:true}));
      rooms.push(room(id,label,b,type==='lobby'?'public':['office','prep','tutorial'].includes(type)?'office':'classroom',doors,contents,{programme:type,legacySceneAlias:spec.level===2&&key==='WEST'?'classroom':undefined}));
    });
    rooms.push(
      room(`${prefix}/STAIR-W`,'西安全楼梯',[-15.5,-12.8,-5,.8],'service',[],[
        fixture(`${prefix}/STAIR-W/FIX`,'west protected stair','PF-STAIR',[-14.15,e,-2.1],'M-TERRAZZO','secondary egress',{size:[2.35,3.05,5.2]})]),
      room(`${prefix}/WC-W`,'西侧卫生间',[-15.5,-12.8,1,5],'service',[],[
        fixture(`${prefix}/WC-W/T`,'toilet','PF-TOILET',[-14.75,e,1.8],'M-CERAMIC','sanitary fixture'),
        fixture(`${prefix}/WC-W/B`,'washbasin','PF-BASIN',[-13.35,e,4.35],'M-CERAMIC','hand washing'),
        fixture(`${prefix}/WC-W/C`,'cleaning cupboard','PF-CLEANING',[-14.8,e,4.3],'M-STEEL','janitorial storage'),
      ]),
      room(`${prefix}/STAIR-E`,'东安全楼梯',[12.8,15.5,-5,.8],'service',[],[
        fixture(`${prefix}/STAIR-E/FIX`,'east protected stair','PF-STAIR',[14.15,e,-2.1],'M-TERRAZZO','primary egress',{size:[2.35,3.05,5.2]})]),
      room(`${prefix}/LIFT-E`,'电梯与无障碍卫生间',[12.8,15.5,1,5],'service',[],[
        fixture(`${prefix}/LIFT-E/LIFT`,'accessible lift','PF-LIFT',[13.65,e,2.0],'M-STEEL','accessible vertical circulation',{size:[1.45,2.45,1.55],levels:[1,2,3,4,5]}),
        fixture(`${prefix}/LIFT-E/T`,'accessible toilet','PF-TOILET',[14.75,e,4.2],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
        fixture(`${prefix}/LIFT-E/B`,'accessible basin','PF-BASIN',[13.4,e,4.35],'M-CERAMIC','accessible hand washing'),
      ]),
    );
    const shared=[
      ...safetySet(prefix,e,[-12.55,4.3],[0,3.35],spec.level,spec.level===1),
      fixture(`${prefix}/WATER`,'drinking-water station','PF-WATER',[12.4,e,4.3],'M-STEEL','student hydration'),
      fixture(`${prefix}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-7,e+2.75,3.75],'M-WALL-WHITE','corridor lighting',{temperatureK:3800}),
      fixture(`${prefix}/COR-L2`,'corridor light centre','PF-CEILING-LIGHT',[0,e+2.75,3.75],'M-WALL-WHITE','corridor lighting',{temperatureK:3800}),
      fixture(`${prefix}/COR-L3`,'corridor light east','PF-CEILING-LIGHT',[7,e+2.75,3.75],'M-WALL-WHITE','corridor lighting',{temperatureK:3800}),
    ];
    floors.push(floor(spec.level,e,3.3,rooms,[
      {id:`${prefix}/CORRIDOR`,bounds:[-12.8,12.8,3.1,4.95],clearWidth:1.85,surface:'M-TERRAZZO'},
      ...(spec.level===1?[{id:`${prefix}/ENTRY`,bounds:[-1.65,1.65,-5.5,3.1],clearWidth:3.3,surface:'M-TERRAZZO'}]:[]),
    ],shared,{occupancy:spec.level===5?45:spec.level===1?72:60}));
  }
  return {
    id:'B01',label:'第一教学楼',status:'partial-existing',centreCampus:[-3,57.5],localBounds:[-16,16,-5.5,5.5],
    exteriorFootprint:{x0:-19,x1:13,z0:52,z1:63},floors:5,floorHeight:3.3,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-3 + localX',worldZ:'57.5 + localZ'},
    portals:[{id:'B01/PUBLIC',campusAt:[-3,52],campusReturn:[-3,47.2,0],localSpawn:[0,0,-4.25,0],placeKey:'campus_b01_f1'},
      {id:'B01/LEGACY-CLASSROOM',mapsTo:'B01/F2/WEST',placeKey:'classroom',preserve:true}],
    facadeAlignment:{southWindows:{x:[-14,-10,-6,-2,2,6,10,14],localZ:-5.5},northServiceWindows:'start 1.8 m from corner; pitch 3.2 m',levels:[2,3,4,5]},
    design:'Practical public teaching block: warm plaster, terrazzo corridors, beech classrooms, blue wayfinding and red institutional accents.',
    floorsPlan:floors,
  };
}

function buildB02() {
  const floors=[];
  const coreB=[3.55,6.15,-11.6,-5.35],wcB=[3.55,6.15,-5.15,-1.0];
  const coreRooms=(level,e,prefix)=>[
    room(`${prefix}/CORE`,'楼梯与电梯',coreB,'service',[],verticalCore(`${prefix}/CORE`,e,coreB,level,4,true)),
    room(`${prefix}/WC`,'卫生间',wcB,'service',[],[
      fixture(`${prefix}/WC/T1`,'accessible toilet','PF-TOILET',[4.35,e,-4.2],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${prefix}/WC/T2`,'toilet','PF-TOILET',[5.55,e,-4.2],'M-CERAMIC','sanitary fixture'),
      fixture(`${prefix}/WC/B1`,'washbasin','PF-BASIN',[4.35,e,-1.55],'M-CERAMIC','hand washing'),
      fixture(`${prefix}/WC/CLEAN`,'cleaning cupboard','PF-CLEANING',[5.65,e,-1.65],'M-STEEL','janitorial storage'),
    ]),
  ];
  // Floor 1 — arrival, circulation, new books and public services.
  {
    const level=1,e=0,p='B02/F1',rooms=[
      room(`${p}/LOBBY`,'入口与安检',[-6.15,-2.25,-2.4,2.4],'public',[
        doorway(`${p}/LOBBY/EXT`,'west',[-6.5,e,0],2.4,'campus',{portal:true}),
        doorway(`${p}/LOBBY/IN`,'east',[-2.25,e,0],1.8,`${p}/HALL`),
      ],[
        fixture(`${p}/LOBBY/G1`,'library security gate','PF-SECURITY-GATE',[-5.1,e,-.55],'M-GLASS','entry security'),
        fixture(`${p}/LOBBY/G2`,'library security gate','PF-SECURITY-GATE',[-5.1,e,.55],'M-GLASS','entry security'),
        fixture(`${p}/LOBBY/DIR`,'library directory','PF-DIRECTORY',[-3.0,e,-1.45],'M-SCREEN','four-floor wayfinding',{text:'图书馆 1—4层'}),
        fixture(`${p}/LOBBY/RET`,'book-return cabinet','PF-SELF-CHECK',[-3.0,e,1.45],'M-SCREEN','after-hours returns'),
        ...lightGrid(`${p}/LOBBY`,e,[[-4.3,0]],3300),
      ]),
      room(`${p}/CIRC`,'借还书处',[-2.05,1.45,-4.5,.55],'library',[],[
        fixture(`${p}/CIRC/DESK`,'circulation desk','PF-CIRC-DESK',[-.3,e,-3.4],'M-OAK-DARK','borrowing and returns',{yaw:0}),
        fixture(`${p}/CIRC/K1`,'self-check kiosk','PF-SELF-CHECK',[-1.45,e,-.2],'M-SCREEN','self-service borrowing'),
        fixture(`${p}/CIRC/K2`,'self-check kiosk','PF-SELF-CHECK',[-.65,e,-.2],'M-SCREEN','self-service borrowing'),
        fixture(`${p}/CIRC/AED`,'public AED','PF-AED',[1.2,e+1.2,-.2],'M-SAFETY-RED','public defibrillator'),
        ...lightGrid(`${p}/CIRC`,e,[[-.3,-2.0]],3300),
      ]),
      room(`${p}/NEW`,'新书与综合阅览',[-6.15,1.45,2.65,11.6],'library',[],[
        ...bookStackField(`${p}/NEW`,e,[-5.8,-.2,3.0,8.0],2,2),
        ...readingRoom(`${p}/NEW/READ`,e,[-5.8,1.1,8.15,11.25],2),
      ]),
      room(`${p}/READ`,'无障碍阅览区',[1.7,6.15,1.0,11.6],'library',[],[
        ...readingRoom(`${p}/READ`,e,[1.95,5.9,1.3,8.7],3),
        fixture(`${p}/READ/MAG`,'screen magnifier workstation','PF-COMPUTER-DESK',[4.0,e,10.3],'M-OAK','accessible screen magnification',{accessible:true}),
      ]),
      room(`${p}/PROCESS`,'图书加工与办公室',[-6.15,3.35,-11.6,-4.75],'office',[],[
        ...officeRoom(`${p}/PROCESS`,e,[-5.8,-1.0,-11.25,-5.1],3,'图书加工'),
        fixture(`${p}/PROCESS/SHELF1`,'processing shelf','PF-SHELF',[.1,e,-10.7],'M-STEEL','incoming books'),
        fixture(`${p}/PROCESS/SHELF2`,'processing shelf','PF-SHELF',[1.25,e,-10.7],'M-STEEL','catalogued books'),
      ]),
      ...coreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.2,rooms,[{id:`${p}/HALL`,bounds:[-2.25,3.35,-.8,2.55],clearWidth:2.0,surface:'M-TERRAZZO'}],[...safetySet(p,e,[3.2,-5.0],[-5.6,0],level,true)],{occupancy:110}));
  }
  // Floors 2–4 use the same vertical core and a quiet central spine.
  for(const spec of [
    {level:2,south:'人文社科书库',north:'大阅览室',east:'小组学习室',kind:'humanities'},
    {level:3,south:'科学期刊书库',north:'电子阅览室',east:'小组学习室',kind:'science'},
    {level:4,south:'特藏与档案',north:'安静阅览室',east:'馆员办公室',kind:'archive'},
  ]) {
    const e=(spec.level-1)*3.2,p=`B02/F${spec.level}`,south=[-6.15,3.3,-11.6,-.7],north=[-6.15,3.3,-.45,11.6],east=[3.5,6.15,-.7,11.6];
    let southContents=bookStackField(`${p}/SOUTH`,e,[-5.8,2.9,-11.2,-1.1],3,3);
    if(spec.kind==='archive') southContents=[
      ...Array.from({length:8},(_,i)=>fixture(`${p}/SOUTH/ARCH${pad(i+1)}`,'mobile archive stack','PF-BOOKSTACK',[-4.8+(i%2)*4.6,e,-9.8+Math.floor(i/2)*2.4],'M-STEEL-DARK','controlled archive storage',{size:[1.0,2.2,2.2]})),
      fixture(`${p}/SOUTH/CTRL`,'archive environmental panel','PF-DIRECTORY',[2.5,e,-1.5],'M-SCREEN','temperature and humidity status'),
    ];
    let northContents=spec.kind==='science'?
      [...Array.from({length:12},(_,i)=>fixture(`${p}/NORTH/PC${pad(i+1)}`,'electronic reading workstation','PF-COMPUTER-DESK',[-4.7+(i%3)*3.0,e,1.2+Math.floor(i/3)*2.5],'M-OAK','catalogue and journal access',{yaw:0})),...lightGrid(`${p}/NORTH`,e,[[-3.5,3],[0,3],[-3.5,8],[0,8]],3500)]:
      readingRoom(`${p}/NORTH`,e,north,spec.kind==='humanities'?4:3);
    const eastContents=spec.kind==='archive'?officeRoom(`${p}/EAST`,e,east,2,spec.east):[
      ...seminarRoom(`${p}/EAST/G1`,e,[3.65,6.0,-.5,5.2]),
      ...seminarRoom(`${p}/EAST/G2`,e,[3.65,6.0,5.4,11.3]),
    ];
    const rooms=[
      room(`${p}/SOUTH`,spec.south,south,'library',[],southContents),
      room(`${p}/NORTH`,spec.north,north,'library',[],northContents,{legacySceneAlias:spec.level===2?'library':undefined}),
      room(`${p}/EAST`,spec.east,east,spec.kind==='archive'?'office':'library',[],eastContents),
      ...coreRooms(spec.level,e,p),
    ];
    floors.push(floor(spec.level,e,3.2,rooms,[{id:`${p}/SPINE`,bounds:[3.3,3.55,-5.2,11.6],clearWidth:2.0,surface:'M-OAK'}],[...safetySet(p,e,[3.2,-5],[3.4,0],spec.level,false),fixture(`${p}/WATER`,'water dispenser','PF-WATER',[3.1,e,1.0],'M-STEEL','visitor hydration')],{occupancy:spec.level===4?55:90}));
  }
  return {
    id:'B02',label:'图书馆',status:'partial-existing',centreCampus:[36.5,50],localBounds:[-6.5,6.5,-12,12],
    exteriorFootprint:{x0:30,x1:43,z0:38,z1:62},floors:4,floorHeight:3.2,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'50 + localZ'},
    portals:[{id:'B02/PUBLIC',campusAt:[30,50],campusReturn:[27.2,50,PI/2],localSpawn:[-5.0,0,0,PI/2],placeKey:'campus_b02_f1'},
      {id:'B02/LEGACY-READING',mapsTo:'B02/F2/NORTH',placeKey:'library',preserve:true}],
    facadeAlignment:{westTallWindows:{localX:-6.5,localZ:[-10,-6.7,-3.4,-.1,3.2,6.5,9.8]},serviceWindows:'east, north and south follow the 3.2 m exterior bay rule'},
    design:'Quiet four-floor library: oak, warm plaster, green reading lamps, blue directories, tall stacks and controlled acoustic finishes.',
    floorsPlan:floors,
  };
}

function buildB03() {
  const e=0,p='B03/F1';
  const diningB=[.2,6.6,-8.9,8.9],serveB=[-1.6,0,-8.9,5.4],returnB=[-1.6,0,5.6,8.9],
    kitchenB=[-6.6,-1.8,-1.5,8.9],storeB=[-6.6,-1.8,-8.9,-1.7];
  const dining=[];
  let n=0;
  for(const z of [-7.35,-4.45,-1.55,1.55,4.45,7.35]) for(const x of [2.0,4.75])
    dining.push(fixture(`${p}/DINING/T${pad(++n)}`,'four-seat dining table','PF-CANTEEN-TABLE',[x,e,z],'M-WOOD-DESK','student dining'));
  dining.push(
    fixture(`${p}/DINING/TRAY`,'tray and chopstick rack','PF-TRAY-RACK',[5.9,e,-2.1],'M-STAINLESS','collect trays and utensils'),
    fixture(`${p}/DINING/WASH`,'public handwash basin','PF-HANDWASH',[5.95,e,2.25],'M-CERAMIC','hand washing before meals',{yaw:-PI/2}),
    fixture(`${p}/DINING/WATER`,'hot-water dispenser','PF-WATER',[5.95,e,3.2],'M-STAINLESS','drinking water'),
    fixture(`${p}/DINING/BIN1`,'mixed waste bin','PF-BIN',[.7,e,8.15],'M-STEEL','waste sorting',{stream:'other waste'}),
    fixture(`${p}/DINING/BIN2`,'food waste bin','PF-BIN',[1.2,e,8.15],'M-STEEL','waste sorting',{stream:'food waste'}),
    fixture(`${p}/DINING/MENU`,'illuminated menu directory','PF-DIRECTORY',[5.85,e,-3.3],'M-SCREEN','daily menu and allergen information',{text:'米饭 ¥1 · 青菜 ¥3 · 豆腐 ¥4 · 红烧肉 ¥8'}),
    ...lightGrid(`${p}/DINING`,e,[[1.8,-6],[4.8,-6],[1.8,-2],[4.8,-2],[1.8,2],[4.8,2],[1.8,6],[4.8,6]],3500),
  );
  const serving=[];
  const dishes=[['米饭','rice'],['青菜','vegetables'],['豆腐','tofu'],['红烧肉','braised pork']];
  dishes.forEach(([zh,en],i)=>serving.push(fixture(`${p}/SERVE/C${i+1}`,`${zh} serving counter`,'PF-SERVING-COUNTER',[-.8,e,-7.7+i*2.55],'M-STAINLESS',`${en} service`,{yaw:PI/2,text:`${zh} ${en}`})));
  serving.push(
    fixture(`${p}/SERVE/CASH`,'cashier station','PF-CASHIER',[-.8,e,3.95],'M-STAINLESS','payment and student-card checkout',{yaw:PI/2}),
    fixture(`${p}/SERVE/RAIL1`,'queue rail A','PF-WALL-RUN',[-.05,e+.45,-4.4],'M-STEEL','single serving queue',{size:[.08,.9,7.5],collision:'body'}),
    fixture(`${p}/SERVE/RAIL2`,'queue rail B','PF-WALL-RUN',[-1.55,e+.45,-4.4],'M-STEEL','single serving queue',{size:[.08,.9,7.5],collision:'body'}),
    ...lightGrid(`${p}/SERVE`,e,[[-.8,-6],[-.8,-2],[-.8,2]],3800),
  );
  const returns=[
    fixture(`${p}/RETURN/BELT`,'dish-return conveyor','PF-DISH-RETURN',[-.8,e,7.15],'M-STAINLESS','return used trays',{yaw:PI/2}),
    fixture(`${p}/RETURN/SIGN`,'dish-return sign','PF-ROOM-SIGN',[-.1,e+1.75,7.15],'M-SCREEN','return direction',{yaw:-PI/2,text:'餐具回收 · DISH RETURN'}),
    fixture(`${p}/RETURN/BIN`,'food scrape bin','PF-BIN',[-.55,e,8.35],'M-STEEL','food waste'),
  ];
  const kitchen=[
    fixture(`${p}/KITCHEN/RANGE1`,'commercial wok range A','PF-KITCHEN-RANGE',[-5.7,e,.1],'M-STAINLESS','hot cooking',{yaw:PI/2}),
    fixture(`${p}/KITCHEN/RANGE2`,'commercial wok range B','PF-KITCHEN-RANGE',[-5.7,e,2.1],'M-STAINLESS','hot cooking',{yaw:PI/2}),
    fixture(`${p}/KITCHEN/HOOD1`,'extract hood A','PF-HOOD',[-5.7,e+3.8,.1],'M-STAINLESS','cooking extraction',{yaw:PI/2}),
    fixture(`${p}/KITCHEN/HOOD2`,'extract hood B','PF-HOOD',[-5.7,e+3.8,2.1],'M-STAINLESS','cooking extraction',{yaw:PI/2}),
    fixture(`${p}/KITCHEN/PREP1`,'vegetable preparation table','PF-PREP-TABLE',[-3.7,e,.2],'M-STAINLESS','vegetable preparation',{yaw:0}),
    fixture(`${p}/KITCHEN/PREP2`,'protein preparation table','PF-PREP-TABLE',[-3.7,e,2.5],'M-STAINLESS','separate protein preparation',{yaw:0}),
    fixture(`${p}/KITCHEN/SINK`,'double pot sink','PF-SINK-DOUBLE',[-5.55,e,5.0],'M-STAINLESS','pot washing',{yaw:PI/2}),
    fixture(`${p}/KITCHEN/HAND`,'staff handwash basin','PF-HANDWASH',[-2.25,e,7.9],'M-STAINLESS','staff hand washing',{yaw:-PI/2}),
    fixture(`${p}/KITCHEN/RICE`,'rice cooker bank','PF-PREP-TABLE',[-3.6,e,7.3],'M-STAINLESS','rice preparation',{size:[1.6,.9,.7],appliances:3}),
    fixture(`${p}/KITCHEN/FIRE`,'wet-chemical extinguisher','PF-EXTINGUISHER',[-2.15,e,6.7],'M-SAFETY-RED','commercial-kitchen fire safety',{agent:'wet chemical'}),
    fixture(`${p}/KITCHEN/FLOOR-DRAIN`,'linear floor drain','PF-WALL-RUN',[-4.3,e+.01,4.0],'M-STAINLESS','wash-down drainage',{size:[3.6,.02,.16],collision:'none'}),
    ...lightGrid(`${p}/KITCHEN`,e,[[-5,1],[-3.1,1],[-5,4.5],[-3.1,4.5],[-4.1,7.5]],4200),
  ];
  const stores=[
    fixture(`${p}/STORE/FRIDGE`,'upright refrigerator','PF-FRIDGE',[-5.9,e,-7.8],'M-STAINLESS','chilled ingredients'),
    fixture(`${p}/STORE/FREEZER`,'upright freezer','PF-FREEZER',[-4.9,e,-7.8],'M-STAINLESS','frozen ingredients'),
    fixture(`${p}/STORE/SHELF1`,'dry store shelf A','PF-SHELF',[-5.95,e,-4.9],'M-STEEL','dry ingredients',{yaw:PI/2}),
    fixture(`${p}/STORE/SHELF2`,'dry store shelf B','PF-SHELF',[-5.95,e,-3.7],'M-STEEL','dry ingredients',{yaw:PI/2}),
    fixture(`${p}/STORE/LOCK`,'staff locker bank','PF-LOCKERS',[-3.15,e,-8.2],'M-STEEL-DARK','staff clothing'),
    fixture(`${p}/STORE/BENCH`,'changing bench','PF-BENCH',[-3.8,e,-6.6],'M-OAK','staff changing'),
    fixture(`${p}/STORE/CLEAN`,'cleaning cupboard','PF-CLEANING',[-2.25,e,-2.35],'M-STEEL','food-area cleaning equipment'),
    ...lightGrid(`${p}/STORE`,e,[[-4.2,-5.2]],4000),
  ];
  const rooms=[
    room(`${p}/DINING`,'学生餐厅',diningB,'canteen',[
      doorway(`${p}/DINING/EXT`,'east',[7,e,0],4.2,'campus',{portal:true}),
      doorway(`${p}/DINING/EXIT-S`,'south',[.35,e,-9.5],1.5,'campus',{emergencyOnly:true}),
    ],dining,{capacity:48}),
    room(`${p}/SERVE`,'售饭区',serveB,'kitchen',[],serving),
    room(`${p}/RETURN`,'餐具回收',returnB,'kitchen',[],returns),
    room(`${p}/KITCHEN`,'后厨',kitchenB,'kitchen',[doorway(`${p}/KITCHEN/SERVICE`,'west',[-7,e,3],1.2,'campus-service')],kitchen,{staffOnly:true}),
    room(`${p}/STORE`,'储藏与员工更衣',storeB,'service',[],stores,{staffOnly:true}),
  ];
  const shared=[...safetySet(p,e,[5.8,7.9],[5.8,0],1,true),
    fixture(`${p}/EXIT-REAR`,'rear exit sign','PF-EXIT-SIGN',[-6.55,e+2.35,3],'M-SCREEN','service egress',{text:'安全出口'}),
    fixture(`${p}/EXIT-SOUTH`,'south emergency exit sign','PF-EXIT-SIGN',[.35,e+2.35,-8.85],'M-SCREEN','public secondary egress',{text:'安全出口'}),
    fixture(`${p}/CLOCK`,'canteen wall clock','PF-CLOCK',[6.45,e+2.5,0],'M-WALL-WHITE','meal-service time',{yaw:-PI/2}),
  ];
  return {
    id:'B03',label:'学生食堂',status:'new-interior',centreCampus:[-36,2.5],localBounds:[-7,7,-9.5,9.5],
    exteriorFootprint:{x0:-43,x1:-29,z0:-7,z1:12},floors:1,floorHeight:5.8,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-36 + localX',worldZ:'2.5 + localZ'},
    portals:[{id:'B03/PUBLIC',campusAt:[-29,2.5],campusReturn:[-26.6,2.5,-PI/2],localSpawn:[5.6,0,0,-PI/2],placeKey:'campus_canteen'}],
    facadeChanges:[{id:'B03/EXIT-S','instruction':'Add a 1.50 m south emergency exit at campus (-35.65,-7.0); do not use the obstructed west delivery-screen gap as the public second exit.'}],
    facadeAlignment:{publicOpening:{side:'east',localAt:[7,0],width:4.2},deliveryDoor:{side:'west',localAt:[-7,3],width:2.1}},
    design:'One-floor, 48-seat student canteen with a visible four-dish line, cheap practical furniture, washable finishes and a completely separated west-side kitchen/service flow.',
    floorsPlan:[floor(1,0,5.8,rooms,[{id:`${p}/QUEUE`,bounds:[.05,1.1,-8.5,5.2],clearWidth:1.05,surface:'M-TILE-LIGHT'},{id:`${p}/ENTRY`,bounds:[4.8,7,-2.2,2.2],clearWidth:2.2,surface:'M-TERRAZZO'}],shared,{occupancy:65})],
  };
}

function dormWashRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b;
  return [
    fixture(`${prefix}/T1`,'toilet A','PF-TOILET',[x0+.7,e,z0+.8],'M-CERAMIC','shared toilet'),
    fixture(`${prefix}/T2`,'toilet B','PF-TOILET',[x0+1.65,e,z0+.8],'M-CERAMIC','shared toilet'),
    fixture(`${prefix}/S1`,'shower A','PF-SHOWER',[x1-1.65,e,z1-.65],'M-CERAMIC','shared shower'),
    fixture(`${prefix}/S2`,'shower B','PF-SHOWER',[x1-.65,e,z1-.65],'M-CERAMIC','shared shower'),
    fixture(`${prefix}/B1`,'washbasin A','PF-BASIN',[x0+.75,e,z1-.55],'M-CERAMIC','hand washing'),
    fixture(`${prefix}/B2`,'washbasin B','PF-BASIN',[x0+1.75,e,z1-.55],'M-CERAMIC','hand washing'),
    fixture(`${prefix}/EX`,'extract fan','PF-AC',[x1-.45,e+2.4,z0+.2],'M-WALL-WHITE','wet-room extraction',{yaw:PI}),
    fixture(`${prefix}/LIGHT`,'wet-room ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.65,(z0+z1)/2],'M-WALL-WHITE','wet-room lighting',{temperatureK:4000,size:[.65,.06,.65]}),
  ];
}

function buildB04() {
  const floors=[];
  const west=[[-6.1,-1.2,-7.6,-3.9],[-6.1,-1.2,-3.7,0],[-6.1,-1.2,.2,3.9]],
    east=[[1.2,6.1,-7.6,-3.9],[1.2,6.1,-3.7,0],[1.2,6.1,.2,3.9]];
  const coreRooms=(level,e,p)=>[
    room(`${p}/STAIR`,'楼梯',[-6.1,-3.25,4.2,7.6],'service',[],[
      fixture(`${p}/STAIR/FIX`,'enclosed stair','PF-STAIR',[-4.68,e,5.9],'M-TERRAZZO','secondary egress',{size:[2.55,2.8,3.0]})]),
    room(`${p}/LIFT`,'电梯',[-3.05,-1.2,4.2,7.6],'service',[],[
      fixture(`${p}/LIFT/FIX`,'accessible lift','PF-LIFT',[-2.12,e,5.65],'M-STEEL','accessible vertical circulation',{size:[1.55,2.45,1.55],levels:[1,2,3,4,5,6]}),
      fixture(`${p}/LIFT/ELEC`,'floor electrical cabinet','PF-FILE-CABINET',[-2.1,e,7.05],'M-STEEL-DARK','electrical distribution',{size:[.65,1.7,.3]}),
    ]),
    room(`${p}/WASH`,'公共盥洗室',[1.2,6.1,4.2,7.6],'service',[],dormWashRoom(`${p}/WASH`,e,[1.2,6.1,4.2,7.6])),
  ];
  // Ground floor.
  {
    const level=1,e=0,p='B04/F1',rooms=[];
    rooms.push(
      room(`${p}/A01`,'101无障碍宿舍',west[0],'dorm',[doorway(`${p}/A01/D`,'east',[-1.2,e,-5.75],1.0,`${p}/CORRIDOR`)],furnishDormRoom(`${p}/A01`,e,west[0],'west',true),{beds:2,accessible:true}),
      room(`${p}/A02`,'102无障碍宿舍',east[0],'dorm',[doorway(`${p}/A02/D`,'west',[1.2,e,-5.75],1.0,`${p}/CORRIDOR`)],furnishDormRoom(`${p}/A02`,e,east[0],'east',true),{beds:2,accessible:true}),
      room(`${p}/LOBBY`,'门厅与值班台',west[1],'public',[doorway(`${p}/LOBBY/EXT`,'west',[-6.5,e,-1],2.6,'campus',{portal:true})],[
        fixture(`${p}/LOBBY/DESK`,'residence duty desk','PF-SERVICE-COUNTER',[-2.3,e,-1.9],'M-OAK','resident assistance',{yaw:PI/2}),
        fixture(`${p}/LOBBY/DIR`,'residence directory','PF-DIRECTORY',[-5.3,e,-3.1],'M-SCREEN','rooms and resident rules',{text:'学生宿舍 1—6层'}),
        fixture(`${p}/LOBBY/BENCH`,'lobby bench','PF-BENCH',[-3.8,e,-3.05],'M-OAK','visitor waiting',{yaw:0}),
        fixture(`${p}/LOBBY/AED`,'public AED','PF-AED',[-1.35,e+1.2,-3.2],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
        ...lightGrid(`${p}/LOBBY`,e,[[-3.7,-1.8]],3300),
      ]),
      room(`${p}/MAIL`,'邮件与管理员室',east[1],'office',[],[
        fixture(`${p}/MAIL/LOCK`,'interior mail locker bank','PF-LOCKERS',[5.65,e,-1.85],'M-STEEL','resident mail',{yaw:-PI/2,size:[2.6,1.9,.5]}),
        ...officeRoom(`${p}/MAIL/OFFICE`,e,[1.45,4.7,-3.45,-.25],1,'宿舍管理员'),
      ]),
      room(`${p}/LOUNGE-W`,'公共客厅',west[2],'dorm',[],[
        fixture(`${p}/LOUNGE-W/SOFA1`,'lounge bench','PF-BENCH',[-5.2,e,1.0],'M-FABRIC-BLUE','resident social seating',{yaw:PI/2}),
        fixture(`${p}/LOUNGE-W/SOFA2`,'lounge bench','PF-BENCH',[-2.2,e,2.9],'M-FABRIC-BLUE','resident social seating',{yaw:-PI/2}),
        fixture(`${p}/LOUNGE-W/TABLE`,'lounge table','PF-MEETING-TABLE',[-3.7,e,2.0],'M-OAK','shared table',{size:[1.2,.45,.7]}),
        fixture(`${p}/LOUNGE-W/TV`,'notice and television screen','PF-SCREEN',[-1.3,e+1.5,2.0],'M-SCREEN','resident information',{yaw:-PI/2}),
      ]),
      room(`${p}/LOUNGE-E`,'自习室',east[2],'dorm',[],[
        ...Array.from({length:4},(_,i)=>fixture(`${p}/LOUNGE-E/D${i+1}`,'study workstation','PF-DORM-DESK',[2.2+(i%2)*2.5,e,1.1+Math.floor(i/2)*1.8],'M-WOOD-DESK','shared study',{yaw:0})),
        fixture(`${p}/LOUNGE-E/BOOK`,'shared bookcase','PF-BOOKCASE',[5.55,e,3.2],'M-OAK-DARK','shared books',{yaw:-PI/2}),
      ]),
      ...coreRooms(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'},{id:`${p}/ENTRY`,bounds:[-6.5,-1.0,-2.15,.15],clearWidth:2.3,surface:'M-TERRAZZO'}],[...safetySet(p,e,[-3.15,4.4],[-5.8,-1],level,true)],{occupancy:24}));
  }
  // Floors 2–5: six twin rooms each.
  for(let level=2;level<=5;level++) {
    const e=(level-1)*3,p=`B04/F${level}`,rooms=[];
    [...west.map((b,i)=>({b,side:'west',index:i})),...east.map((b,i)=>({b,side:'east',index:i+3}))].forEach((q,i)=>{
      const number=level*100+i+1,id=`${p}/${number}`,doorX=q.side==='west'?-1.2:1.2;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[doorX,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(...coreRooms(level,e,p));
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false),fixture(`${p}/WATER`,'water dispenser','PF-WATER',[.65,e,3.5],'M-STEEL','resident hydration')],{occupancy:28}));
  }
  // Floor 6: four rooms, laundry and study lounge.
  {
    const level=6,e=15,p='B04/F6',rooms=[];
    [...west.slice(0,2).map((b,i)=>({b,side:'west',i})),...east.slice(0,2).map((b,i)=>({b,side:'east',i:i+2}))].forEach((q,i)=>{
      const number=601+i,id=`${p}/${number}`;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[q.side==='west'?-1.2:1.2,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(
      room(`${p}/LAUNDRY`,'洗衣房',west[2],'service',[],[
        fixture(`${p}/LAUNDRY/W1`,'washer/dryer A','PF-LAUNDRY',[-5.4,e,.8],'M-STEEL','resident laundry'),
        fixture(`${p}/LAUNDRY/W2`,'washer/dryer B','PF-LAUNDRY',[-4.5,e,.8],'M-STEEL','resident laundry'),
        fixture(`${p}/LAUNDRY/SINK`,'laundry sink','PF-SINK-DOUBLE',[-2.1,e,1.0],'M-STAINLESS','hand washing laundry',{size:[.9,.92,.65]}),
        fixture(`${p}/LAUNDRY/TABLE`,'folding table','PF-PREP-TABLE',[-3.8,e,2.8],'M-STAINLESS','folding clothes'),
      ]),
      room(`${p}/STUDY`,'顶层自习室',east[2],'dorm',[],[
        ...Array.from({length:6},(_,i)=>fixture(`${p}/STUDY/D${i+1}`,'study desk','PF-DORM-DESK',[2.0+(i%2)*2.8,e,.75+Math.floor(i/2)*1.35],'M-WOOD-DESK','quiet study',{yaw:0})),
      ]),
      ...coreRooms(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false)],{occupancy:24}));
  }
  return {
    id:'B04',label:'学生宿舍',status:'new-interior',centreCampus:[36.5,-1],localBounds:[-6.5,6.5,-8,8],
    exteriorFootprint:{x0:30,x1:43,z0:-9,z1:7},floors:6,floorHeight:3.0,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'-1 + localZ'},
    portals:[{id:'B04/PUBLIC',campusAt:[30,-2],campusReturn:[27.4,-2,PI/2],localSpawn:[-5.2,0,-1,PI/2],placeKey:'campus_dorm_f1'}],
    facadeAlignment:{westWindows:{localX:-6.5,localZ:[-6,-3,0,3,6]},entrance:{side:'west',localAt:[-6.5,-1],width:2.6}},
    design:'Six-floor, 60-bed student residence with twin rooms, shared washrooms, resident lounges, top-floor laundry/study space and a staffed ground lobby.',
    floorsPlan:floors,
  };
}

function b05CoreRooms(level,e,p) {
  return [
    room(`${p}/STAIR-W`,'西侧安全楼梯',[-6.6,-4.3,-5.6,-1.3],'service',[
      doorway(`${p}/STAIR-W/EXIT`,'west',[-7,e,-3.45],1.2,'campus-service',{emergencyOnly:true})
    ],[fixture(`${p}/STAIR-W/FIX`,'west protected stair','PF-STAIR',[-5.45,e,-3.45],'M-TERRAZZO','secondary protected egress',{size:[2.0,2.9,3.8]})]),
    room(`${p}/LIFT-WC`,'电梯与卫生间',[-6.6,-4.3,1.3,5.6],'service',[],[
      fixture(`${p}/LIFT-WC/LIFT`,'accessible lift','PF-LIFT',[-5.55,e,2.45],'M-STEEL','accessible vertical circulation',{size:[1.55,2.45,1.55],levels:[1,2,3,4]}),
      fixture(`${p}/LIFT-WC/T1`,'accessible toilet','PF-TOILET',[-5.0,e,4.6],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${p}/LIFT-WC/B1`,'washbasin','PF-BASIN',[-6.0,e,4.75],'M-CERAMIC','hand washing'),
    ]),
    room(`${p}/STAIR-E`,'东侧安全楼梯',[4.0,6.6,1.3,5.6],'service',[
      doorway(`${p}/STAIR-E/EXIT`,'north',[5.3,e,6],1.2,'campus-service',{emergencyOnly:true})
    ],[
      fixture(`${p}/STAIR-E/FIX`,'east protected stair','PF-STAIR',[5.3,e,3.45],'M-TERRAZZO','primary protected egress',{size:[2.2,2.9,3.8]}),
      fixture(`${p}/STAIR-E/CLEAN`,'cleaning cupboard','PF-CLEANING',[4.35,e,5.0],'M-STEEL','janitorial storage'),
    ]),
  ];
}

function buildB05() {
  const floors=[];
  const A=[-4.0,.5,-5.6,-1.3],B=[.7,6.6,-5.6,-1.3],C=[-4.0,.5,1.3,5.6],D=[.7,3.8,1.3,5.6];
  const specs=[
    {level:1,rooms:[
      ['A','学生证与注册',A,'service',b=>serviceOffice('B05/F1/A',0,b,'学生证 · 注册',6)],
      ['B','入口门厅与总服务台',B,'lobby',b=>[
        fixture('B05/F1/B/COUNTER','main reception counter','PF-SERVICE-COUNTER',[4.5,0,-2.1],'M-OAK','arrival and queue triage',{yaw:PI}),
        fixture('B05/F1/B/DIR','administration directory','PF-DIRECTORY',[5.8,0,-4.65],'M-SCREEN','four-floor wayfinding',{text:'行政楼 · 国际学生中心'}),
        fixture('B05/F1/B/TICKET','queue ticket kiosk','PF-SELF-CHECK',[1.4,0,-4.5],'M-SCREEN','service queue tickets'),
        fixture('B05/F1/B/BENCH','waiting bench','PF-WAIT-CHAIRS',[2.3,0,-2.0],'M-FABRIC-BLUE','waiting seats',{yaw:PI}),
        fixture('B05/F1/B/AED','public AED','PF-AED',[6.25,1.2,-1.65],'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
        ...lightGrid('B05/F1/B',0,[[2.4,-3.5],[5,-3.5]],3500),
      ]],
      ['C','国际学生咨询',C,'service',b=>serviceOffice('B05/F1/C',0,b,'国际学生咨询',6)],
      ['D','等候与材料填写',D,'public',b=>[
        fixture('B05/F1/D/WAIT1','waiting chairs','PF-WAIT-CHAIRS',[1.7,0,2.2],'M-FABRIC-BLUE','waiting seats',{yaw:0}),
        fixture('B05/F1/D/WAIT2','waiting chairs','PF-WAIT-CHAIRS',[2.8,0,4.7],'M-FABRIC-BLUE','waiting seats',{yaw:PI}),
        fixture('B05/F1/D/TABLE','form-writing table','PF-MEETING-TABLE',[2.25,0,3.45],'M-OAK','complete forms',{size:[1.5,.76,.8]}),
        fixture('B05/F1/D/WATER','water dispenser','PF-WATER',[3.35,0,5.0],'M-STEEL','visitor hydration'),
      ]],
    ]},
    {level:2,rooms:[
      ['A','财务处',A,'office',b=>officeRoom('B05/F2/A',3.1,b,4,'财务处')],
      ['B','人事处',B,'office',b=>officeRoom('B05/F2/B',3.1,b,4,'人事处')],
      ['C','教务处',C,'office',b=>officeRoom('B05/F2/C',3.1,b,4,'教务处')],
      ['D','档案室',D,'service',b=>[
        ...Array.from({length:6},(_,i)=>fixture(`B05/F2/D/FILE${pad(i+1)}`,'records cabinet','PF-FILE-CABINET',[1.3+(i%2)*1.8,3.1,2.0+Math.floor(i/2)*1.45],'M-STEEL','secure university records',{yaw:0})),
        fixture('B05/F2/D/SCAN','records scanning station','PF-COMPUTER-DESK',[2.3,3.1,5.0],'M-OAK','records digitization',{yaw:PI}),
      ]],
    ]},
    {level:3,rooms:[
      ['A','培训室',A,'office',b=>seminarRoom('B05/F3/A',6.2,b)],
      ['B','综合行政办公室',B,'office',b=>officeRoom('B05/F3/B',6.2,b,4,'综合行政')],
      ['C','院系联络办公室',C,'office',b=>officeRoom('B05/F3/C',6.2,b,4,'院系联络')],
      ['D','国际项目会议室',D,'office',b=>seminarRoom('B05/F3/D',6.2,b)],
    ]},
    {level:4,rooms:[
      ['A','校务会议室',A,'office',b=>seminarRoom('B05/F4/A',9.3,b)],
      ['B','校长与副校长办公室',B,'office',b=>[
        ...officeRoom('B05/F4/B/PRES',9.3,[.9,3.55,-5.35,-1.55],1,'校长办公室'),
        ...officeRoom('B05/F4/B/VICE',9.3,[3.75,6.35,-5.35,-1.55],1,'副校长办公室'),
      ]],
      ['C','校史与机要档案',C,'service',b=>[
        ...Array.from({length:6},(_,i)=>fixture(`B05/F4/C/ARCH${pad(i+1)}`,'archive cabinet','PF-FILE-CABINET',[-3.4+(i%2)*2.6,9.3,2.0+Math.floor(i/2)*1.4],'M-STEEL-DARK','restricted archive',{size:[1.0,1.9,.55]})),
      ]],
      ['D','宣传与翻译',D,'office',b=>officeRoom('B05/F4/D',9.3,b,2,'宣传与翻译')],
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
      fixture(`${p}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-3.5,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
      fixture(`${p}/COR-L2`,'corridor light east','PF-CEILING-LIGHT',[1.0,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
      fixture(`${p}/COR-L3`,'corridor light entry','PF-CEILING-LIGHT',[5.0,e+2.75,0],'M-WALL-WHITE','corridor lighting',{temperatureK:3500}),
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
    design:'Four-floor administration building with accessible student services at grade, ordinary university offices above, two protected stairs, blue bilingual wayfinding and secure records rooms.',
    floorsPlan:floors,
  };
}

function b06CoreRooms(level,e,p) {
  const sw=[-7.1,-4.4,-10.6,-6.3],ne=[1.1,7.1,4.7,10.6];
  return [
    room(`${p}/STAIR-SW`,'西南安全楼梯',sw,'service',[doorway(`${p}/STAIR-SW/EXIT`,'west',[-7.5,e,-8.45],1.2,'campus-service',{emergencyOnly:true})],[
      fixture(`${p}/STAIR-SW/FIX`,'southwest protected stair','PF-STAIR',[-5.75,e,-8.45],'M-TERRAZZO','secondary egress',{size:[2.4,3.3,3.8]}),
      fixture(`${p}/STAIR-SW/CLEAN`,'cleaning cupboard','PF-CLEANING',[-4.75,e,-6.8],'M-STEEL','janitorial storage'),
    ]),
    room(`${p}/CORE-NE`,'玻璃楼梯 · 电梯 · 卫生间',ne,'service',[],[
      fixture(`${p}/CORE-NE/STAIR`,'glass-tower protected stair','PF-STAIR',[5.1,e,7.65],'M-TERRAZZO','primary protected egress',{size:[3.2,3.3,5.2]}),
      fixture(`${p}/CORE-NE/LIFT`,'accessible lift','PF-LIFT',[2.15,e,8.9],'M-STEEL','accessible vertical circulation',{levels:[1,2,3,4]}),
      fixture(`${p}/CORE-NE/T1`,'accessible toilet','PF-TOILET',[2.2,e,6.0],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${p}/CORE-NE/B1`,'washbasin','PF-BASIN',[3.25,e,5.45],'M-CERAMIC','hand washing'),
      fixture(`${p}/CORE-NE/ELEC`,'floor services cabinet','PF-FILE-CABINET',[6.55,e,10.1],'M-STEEL-DARK','electrical and laboratory services',{size:[.65,1.8,.35]}),
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
  out.push(...lightGrid(prefix,e,[[cx-1.6,cz],[cx+1.6,cz]],4200));
  return out;
}

function buildB06() {
  const floors=[];
  const westS=[-7.1,-1.1,-6.1,-.2],westN=[-7.1,-1.1,.2,10.6],eastS=[1.1,7.1,-10.6,-2.2],eastM=[1.1,7.1,.2,4.5];
  const specs=[
    {level:1,rooms:[
      ['WS','普通教学实验室',westS,'general',b=>labRoom('B06/F1/WS',0,b,'general')],
      ['WN','准备、收货与安全储藏',westN,'prep',b=>scienceSupportRoom('B06/F1/WN',0,b,'prep')],
      ['ES','安全培训与展示',eastS,'classroom',b=>lectureRoom('B06/F1/ES',0,b)],
      ['EM','门厅与门禁',eastM,'lobby',b=>scienceSupportRoom('B06/F1/EM',0,b,'lobby')],
    ]},
    {level:2,rooms:[
      ['WS','分析化学实验室',westS,'chemistry',b=>labRoom('B06/F2/WS',3.65,b,'chemistry')],
      ['WN','有机化学教学实验室',westN,'chemistry',b=>labRoom('B06/F2/WN',3.65,b,'chemistry')],
      ['ES','基础化学实验室',eastS,'chemistry',b=>labRoom('B06/F2/ES',3.65,b,'chemistry')],
      ['EM','化学品分类储藏',eastM,'store',b=>scienceSupportRoom('B06/F2/EM',3.65,b,'store')],
    ]},
    {level:3,rooms:[
      ['WS','生物教学实验室',westS,'biology',b=>labRoom('B06/F3/WS',7.3,b,'biology')],
      ['WN','显微镜与细胞实验室',westN,'microscopy',b=>labRoom('B06/F3/WN',7.3,b,'microscopy')],
      ['ES','微生物实验室',eastS,'biology',b=>labRoom('B06/F3/ES',7.3,b,'biology')],
      ['EM','冷藏与样品室',eastM,'cold',b=>scienceSupportRoom('B06/F3/EM',7.3,b,'cold')],
    ]},
    {level:4,rooms:[
      ['WS','物理与电子实验室',westS,'physics',b=>labRoom('B06/F4/WS',10.95,b,'physics')],
      ['WN','机器人与制作实验室',westN,'robotics',b=>labRoom('B06/F4/WN',10.95,b,'robotics')],
      ['ES','数据与人工智能实验室',eastS,'computer',b=>computerRoom('B06/F4/ES',10.95,b,false)],
      ['EM','创新项目会议室',eastM,'seminar',b=>seminarRoom('B06/F4/EM',10.95,b)],
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
    design:'Four-floor teaching and innovation laboratory with sealed epoxy floors, visible color-coded services, two protected stairs, lift, explicit PPE/safety fixtures and controlled preparation/storage rooms.',
    floorsPlan:floors,
  };
}

function b07CoreRooms(level,e,p) {
  return [
    room(`${p}/STAIR-S`,'南安全楼梯',[3.8,6.1,-5.1,-2.6],'service',[],[
      fixture(`${p}/STAIR-S/FIX`,'south protected stair','PF-STAIR',[4.95,e,-3.85],'M-TERRAZZO','student-centre egress',{size:[2.0,2.8,2.2]}),
      fixture(`${p}/STAIR-S/STORE`,'event/cleaning store','PF-CLEANING',[5.65,e,-4.7],'M-STEEL','floor service storage'),
    ]),
    room(`${p}/LIFT`,'电梯与防火前室',[3.8,6.1,-2.4,.8],'service',[],[
      fixture(`${p}/LIFT/FIX`,'accessible lift','PF-LIFT',[4.9,e,-.8],'M-STEEL','accessible vertical circulation',{size:[1.8,2.45,1.65],levels:[1,2,3]}),
      fixture(`${p}/LIFT/DIR`,'split-use directory','PF-DIRECTORY',[5.75,e,-2.0],'M-SCREEN','activity-centre and clinic wayfinding',{size:[.7,1.5,.1],text:'活动中心 ↓ · 校医院 ↑'}),
    ]),
    room(`${p}/STAIR-N`,'北安全楼梯',[3.8,6.1,1.0,5.1],'service',[],[
      fixture(`${p}/STAIR-N/FIX`,'north protected stair','PF-STAIR',[4.95,e,3.05],'M-TERRAZZO','clinic egress',{size:[2.0,2.8,3.6]}),
      fixture(`${p}/STAIR-N/ELEC`,'floor electrical cabinet','PF-FILE-CABINET',[5.6,e,4.6],'M-STEEL-DARK','floor electrical distribution',{size:[.6,1.7,.3]}),
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
        ...lightGrid(`${p}/SC-LOBBY`,e,[[-4.0,-1.6]],3500),
      ]),
      room(`${p}/SC-COMMONS`,'社团公共区',[-6.1,-.8,-5.1,-3.25],'activity',[],[
        fixture(`${p}/SC-COMMONS/T1`,'club table A','PF-ART-TABLE',[-4.8,e,-4.2],'M-OAK','club sign-up and projects'),
        fixture(`${p}/SC-COMMONS/T2`,'club table B','PF-ART-TABLE',[-2.7,e,-4.2],'M-OAK','club sign-up and projects'),
        fixture(`${p}/SC-COMMONS/NOTICE`,'club notice display','PF-SCREEN',[-1.0,e+1.45,-4.2],'M-SCREEN','club announcements',{yaw:-PI/2,size:[1.4,.9,.06]}),
      ]),
      room(`${p}/SC-OFFICE`,'学生会办公室',[-1.8,1.6,-3.05,-.75],'office',[],officeRoom(`${p}/SC-OFFICE`,e,[-1.65,1.45,-2.9,-.9],2,'学生会办公室')),
      room(`${p}/SC-MULTI`,'多功能活动室',[1.8,3.6,-5.1,-.75],'activity',[],[
        fixture(`${p}/SC-MULTI/TABLE`,'folding activity table','PF-MEETING-TABLE',[2.7,e,-2.7],'M-OAK','small meetings and events',{size:[1.5,.76,.9]}),
        ...Array.from({length:6},(_,i)=>fixture(`${p}/SC-MULTI/C${i+1}`,'stacking chair','PF-CHAIR',[2.05+(i%2)*1.3,e,-4.3+Math.floor(i/2)*1.55],'M-FABRIC-BLUE','movable event seat',{yaw:0})),
        fixture(`${p}/SC-MULTI/STORE`,'activity equipment shelf','PF-SHELF',[3.15,e,-4.65],'M-STEEL','event equipment',{yaw:-PI/2}),
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
      ]),
      room(`${p}/CL-EXAM`,'校医诊室',[-2.0,1.55,.75,2.55],'clinic',[],[
        fixture(`${p}/CL-EXAM/COUCH`,'examination couch','PF-EXAM-COUCH',[-.4,e,1.6],'M-CLINIC','patient examination',{yaw:PI/2}),
        fixture(`${p}/CL-EXAM/DESK`,'clinician workstation','PF-OFFICE-DESK',[-1.3,e,1.1],'M-CLINIC','clinical notes',{size:[1.15,.76,.65]}),
        fixture(`${p}/CL-EXAM/CAB`,'clinical cabinet','PF-CLINIC-CABINET',[1.1,e,1.1],'M-CLINIC','exam supplies'),
        fixture(`${p}/CL-EXAM/SINK`,'clinical handwash','PF-HANDWASH',[1.1,e,2.1],'M-STAINLESS','clinical hand washing'),
      ]),
      room(`${p}/CL-TREAT`,'治疗与观察',[-2.0,1.55,2.75,5.1],'clinic',[],[
        fixture(`${p}/CL-TREAT/C1`,'treatment couch A','PF-EXAM-COUCH',[-1.15,e,3.8],'M-CLINIC','short treatment',{yaw:PI/2}),
        fixture(`${p}/CL-TREAT/C2`,'treatment couch B','PF-EXAM-COUCH',[.65,e,3.8],'M-CLINIC','short observation',{yaw:PI/2}),
        fixture(`${p}/CL-TREAT/CAB`,'treatment cabinet','PF-CLINIC-CABINET',[1.1,e,4.65],'M-CLINIC','treatment supplies'),
        fixture(`${p}/CL-TREAT/FIRST`,'first-aid cabinet','PF-FIRST-AID',[-1.85,e+1.2,4.65],'M-CLINIC','clinic first aid',{yaw:PI/2}),
      ]),
      room(`${p}/CL-PHARM`,'校内药房',[1.75,3.6,.75,5.1],'clinic',[],[
        fixture(`${p}/CL-PHARM/COUNTER`,'pharmacy counter','PF-PHARMACY',[2.65,e,1.25],'M-CLINIC','medicine dispensing',{yaw:0}),
        fixture(`${p}/CL-PHARM/FRIDGE`,'medicine refrigerator','PF-MED-FRIDGE',[3.15,e,4.45],'M-CLINIC','temperature-controlled medicine'),
        fixture(`${p}/CL-PHARM/S1`,'medicine shelving A','PF-SHELF',[2.0,e,4.55],'M-CLINIC','locked medicine storage'),
        fixture(`${p}/CL-PHARM/S2`,'medicine shelving B','PF-SHELF',[3.25,e,3.25],'M-CLINIC','locked medicine storage',{yaw:-PI/2}),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/SC-ROUTE`,bounds:[-6.1,3.8,-.65,.65],clearWidth:1.3,surface:'M-TERRAZZO'},{id:`${p}/CL-ROUTE`,bounds:[-6.1,3.8,-.65,.65],clearWidth:1.3,surface:'M-VINYL'}],[...safetySet(p,e,[3.55,-2.45],[-5.8,-1.5],level,true),fixture(`${p}/FIRE-SEP`,'clinic fire-separation door','PF-DOOR-SINGLE',[3.7,e,0],'M-STEEL','separates clinic and activity-centre routes',{yaw:0,selfClosing:true})],{occupancy:70}));
  }
  // Floor 2 — rehearsal and counselling/treatment.
  {
    const level=2,e=3,p='B07/F2',rooms=[
      room(`${p}/DANCE`,'舞蹈与排练室',[-6.1,3.6,-5.1,-1.1],'activity',[],[
        fixture(`${p}/DANCE/M1`,'mirror and barre A','PF-DANCE-MIRROR',[3.5,e+1.45,-3.6],'M-GLASS','dance rehearsal',{yaw:-PI/2}),
        fixture(`${p}/DANCE/M2`,'mirror and barre B','PF-DANCE-MIRROR',[3.5,e+1.45,-1.8],'M-GLASS','dance rehearsal',{yaw:-PI/2}),
        fixture(`${p}/DANCE/AUDIO`,'audio console','PF-COMPUTER-DESK',[-5.3,e,-4.4],'M-STEEL-DARK','rehearsal audio',{size:[.9,1.1,.5]}),
        fixture(`${p}/DANCE/MATS`,'exercise mat storage','PF-SHELF',[-5.55,e,-1.65],'M-STEEL','exercise mats',{yaw:PI/2}),
        ...lightGrid(`${p}/DANCE`,e,[[-3.5,-3],[-.5,-3],[2.5,-3]],3800),
      ]),
      room(`${p}/SC-WC`,'活动中心卫生间',[-6.1,-3.8,-.9,.8],'service',[],[
        fixture(`${p}/SC-WC/T`,'accessible toilet','PF-TOILET',[-5.3,e,-.1],'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
        fixture(`${p}/SC-WC/B`,'washbasin','PF-BASIN',[-4.25,e,-.1],'M-CERAMIC','hand washing'),
      ]),
      room(`${p}/COUNSEL1`,'心理咨询一',[-6.1,-3.2,1.1,5.1],'clinic',[],officeRoom(`${p}/COUNSEL1`,e,[-5.9,-3.4,1.3,4.9],1,'心理咨询一')),
      room(`${p}/COUNSEL2`,'心理咨询二',[-3.0,-.1,1.1,5.1],'clinic',[],officeRoom(`${p}/COUNSEL2`,e,[-2.8,-.3,1.3,4.9],1,'心理咨询二')),
      room(`${p}/OBSERVE`,'治疗观察室',[.1,3.6,1.1,5.1],'clinic',[],[
        fixture(`${p}/OBSERVE/C1`,'observation couch A','PF-EXAM-COUCH',[1.0,e,3.0],'M-CLINIC','short observation',{yaw:0}),
        fixture(`${p}/OBSERVE/C2`,'observation couch B','PF-EXAM-COUCH',[2.7,e,3.0],'M-CLINIC','short observation',{yaw:0}),
        fixture(`${p}/OBSERVE/CAB`,'observation cabinet','PF-CLINIC-CABINET',[3.1,e,4.6],'M-CLINIC','observation supplies'),
        fixture(`${p}/OBSERVE/SINK`,'clinical handwash','PF-HANDWASH',[.55,e,4.65],'M-STAINLESS','clinical hand washing'),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/SC-COR`,bounds:[-6.1,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},{id:`${p}/CL-COR`,bounds:[-6.1,3.8,.85,1.1],clearWidth:1.2,surface:'M-VINYL'}],[...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false)],{occupancy:55}));
  }
  // Floor 3 — media/project rooms and health education/administration.
  {
    const level=3,e=6,p='B07/F3',rooms=[
      room(`${p}/MEDIA`,'学生媒体室',[-6.1,-1.4,-5.1,-1.1],'activity',[],[
        ...Array.from({length:4},(_,i)=>fixture(`${p}/MEDIA/PC${i+1}`,'media editing workstation','PF-COMPUTER-DESK',[-5.1+(i%2)*2.4,e,-4.1+Math.floor(i/2)*1.8],'M-OAK','audio/video editing',{yaw:0})),
        fixture(`${p}/MEDIA/RACK`,'media equipment shelf','PF-SHELF',[-5.55,e,-1.55],'M-STEEL','cameras and microphones',{yaw:PI/2}),
      ]),
      room(`${p}/PROJECT`,'社团项目室',[-1.2,3.6,-5.1,-1.1],'activity',[],[
        fixture(`${p}/PROJECT/T1`,'project table A','PF-ART-TABLE',[-.1,e,-3.2],'M-OAK','club making'),
        fixture(`${p}/PROJECT/T2`,'project table B','PF-ART-TABLE',[2.2,e,-3.2],'M-OAK','club making'),
        fixture(`${p}/PROJECT/LOCK`,'project locker bank','PF-LOCKERS',[3.15,e,-4.55],'M-STEEL','club project storage',{yaw:-PI/2}),
      ]),
      room(`${p}/HEALTH`,'健康教育室',[-6.1,-.8,1.1,5.1],'clinic',[],seminarRoom(`${p}/HEALTH`,e,[-5.9,-1.0,1.3,4.9])),
      room(`${p}/ADMIN`,'校医院办公室',[-.6,1.7,1.1,5.1],'office',[],officeRoom(`${p}/ADMIN`,e,[-.4,1.5,1.3,4.9],1,'校医院办公室')),
      room(`${p}/STAFF`,'医务人员休息与储藏',[1.9,3.6,1.1,5.1],'clinic',[],[
        fixture(`${p}/STAFF/BENCH`,'staff bench','PF-BENCH',[2.75,e,2.0],'M-FABRIC-BLUE','staff rest'),
        fixture(`${p}/STAFF/LOCK`,'staff lockers','PF-LOCKERS',[3.1,e,4.45],'M-STEEL','staff clothing',{yaw:-PI/2,size:[1.2,1.9,.5]}),
        fixture(`${p}/STAFF/WATER`,'staff water dispenser','PF-WATER',[2.15,e,4.55],'M-STEEL','staff drinks'),
      ]),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/SC-COR`,bounds:[-6.1,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},{id:`${p}/CL-COR`,bounds:[-6.1,3.8,.85,1.1],clearWidth:1.2,surface:'M-VINYL'}],[...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false)],{occupancy:48}));
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
    design:'One shared shell with two legible identities: blue/teal flexible student rooms to the south and a quiet green clinical suite to the north, separated by rated construction and sharing only the protected core.',
    floorsPlan:floors,
  };
}

function buildB08() {
  const e=0,p='B08/F1',workB=[-2.7,1.15,-2.4,2.4],wcB=[1.35,2.7,-2.4,-.25],entryB=[1.35,2.7,-.05,2.4];
  const rooms=[
    room(`${p}/WORK`,'门卫值班室',workB,'security',[],[
      fixture(`${p}/WORK/CONSOLE`,'security console','PF-CCTV-DESK',[-.6,e,.3],'M-OAK-DARK','CCTV, radio and gate controls',{yaw:PI,preserveExteriorSilhouetteAtCampus:[8.8,-9.4]}),
      fixture(`${p}/WORK/KEYS`,'key cabinet','PF-KEY-CABINET',[1.0,e+1.35,1.6],'M-STEEL-DARK','controlled keys',{yaw:-PI/2}),
      fixture(`${p}/WORK/COUNTER`,'visitor counter','PF-SERVICE-COUNTER',[-2.35,e,-.7],'M-OAK','visitor log and badge issue',{yaw:PI/2,size:[1.3,1.05,.7]}),
      fixture(`${p}/WORK/PARCEL`,'parcel shelf','PF-SHELF',[-2.25,e,1.65],'M-STEEL','temporary visitor parcels',{yaw:PI/2}),
      fixture(`${p}/WORK/FIRST`,'first-aid cabinet','PF-FIRST-AID',[1.0,e+1.25,-1.65],'M-CLINIC','first aid',{yaw:-PI/2}),
      fixture(`${p}/WORK/EXT`,'fire extinguisher','PF-EXTINGUISHER',[.85,e,-2.0],'M-SAFETY-RED','fire safety'),
      fixture(`${p}/WORK/WATER`,'thermos and water station','PF-WATER',[-1.8,e,-1.75],'M-STEEL','guard drinks'),
      fixture(`${p}/WORK/LOCK`,'guard locker bank','PF-LOCKERS',[.15,e,-1.95],'M-STEEL-DARK','guard clothing',{size:[1.2,1.9,.5]}),
      fixture(`${p}/WORK/CLOCK`,'wall clock','PF-CLOCK',[0,e+2.45,-2.3],'M-WALL-WHITE','shift time',{yaw:0}),
      fixture(`${p}/WORK/AC`,'wall air conditioner','PF-AC',[-2.5,e+2.45,.8],'M-WALL-WHITE','guardhouse climate',{yaw:PI/2}),
      ...lightGrid(`${p}/WORK`,e,[[-.7,0]],3500),
    ]),
    room(`${p}/WC`,'值班卫生间与清洁柜',wcB,'service',[],[
      fixture(`${p}/WC/T`,'compact toilet','PF-TOILET',[2.0,e,-1.65],'M-CERAMIC','staff sanitary fixture'),
      fixture(`${p}/WC/B`,'compact basin','PF-BASIN',[2.25,e,-.65],'M-CERAMIC','hand washing',{size:[.5,.86,.38]}),
      fixture(`${p}/WC/CLEAN`,'cleaning cupboard','PF-CLEANING',[1.62,e,-.55],'M-STEEL','cleaning equipment',{size:[.55,1.9,.45]}),
    ]),
    room(`${p}/ENTRY`,'员工入口与储物',entryB,'security',[
      doorway(`${p}/ENTRY/EXT`,'north',[1.8,e,2.7],.95,'campus',{portal:true})
    ],[
      fixture(`${p}/ENTRY/MAT`,'entry mat','PF-WALL-RUN',[1.95,e+.02,1.8],'M-RUBBER','clean entry',{size:[1.0,.04,1.2],collision:'none'}),
      fixture(`${p}/ENTRY/SIGN`,'security room sign','PF-ROOM-SIGN',[1.4,e+1.5,1.8],'M-SCREEN','staff entrance identity',{yaw:PI/2,text:'门卫 · STAFF'}),
      fixture(`${p}/ENTRY/COAT`,'coat and equipment locker','PF-LOCKERS',[2.3,e,.5],'M-STEEL-DARK','visitor badges and coats',{size:[.8,1.9,.45]}),
    ]),
  ];
  return {
    id:'B08',label:'门卫 · 访客室',status:'new-interior',centreCampus:[9.4,-9.7],localBounds:[-3,3,-2.7,2.7],
    exteriorFootprint:{x0:6.4,x1:12.4,z0:-12.4,z1:-7},floors:1,floorHeight:3.2,wallThickness:.18,partitionThickness:.10,
    localToCampus:{worldX:'9.4 + localX',worldZ:'-9.7 + localZ'},
    portals:[{id:'B08/STAFF',campusAt:[11.2,-7],campusReturn:[11.2,-5.8,PI],localSpawn:[1.8,0,1.65,PI],placeKey:'campus_security'}],
    facadeChanges:[{id:'B08/DOOR-N','instruction':'Add a 0.95 m north-facing staff door centred at campus (11.2,-7.0); preserve the west service window at (6.4,-9.5).'}],
    facadeAlignment:{westServiceWindow:{localX:-3,localZ:.2},southWindow:{localZ:-2.7},preservedDeskSilhouetteCampus:[8.8,-9.4]},
    design:'Compact, practical guardhouse: dark anti-slip floor, warm plaster, one preserved guard console, full visitor-control equipment and a screened staff WC/store.',
    floorsPlan:[floor(1,0,3.2,rooms,[{id:`${p}/CLEAR`,bounds:[.95,1.4,-.1,2.4],clearWidth:.95,surface:'M-TILE-DARK'}],[...safetySet(p,e,[.8,-2],[1.8,2.4],1,false)],{occupancy:4})],
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
fs.writeFileSync(MD_OUT,makeMarkdown()+'\n');
console.log(`wrote ${path.basename(JSON_OUT)} and ${path.basename(MD_OUT)}`);
console.log(JSON.stringify(totals));
console.log(`sha256 ${blueprint.meta.canonicalGeometryHash}`);
