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
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,out=[
    fixture(`${prefix}/TABLE`,'seminar table','PF-MEETING-TABLE',[cx,e,cz],'M-OAK','seminar work surface',{size:[4.2,.76,1.2]}),
    fixture(`${prefix}/BOARD`,'seminar whiteboard','PF-WHITEBOARD',[cx,e+1.55,z1-.08],'M-WHITEBOARD','group notes',{yaw:PI}),
    fixture(`${prefix}/SCREEN`,'video conference screen','PF-SCREEN',[x1-.08,e+1.55,cz],'M-SCREEN','remote seminar link',{yaw:-PI/2,size:[1.4,.9,.06]}),
  ];
  let n=0;
  for(const x of [cx-1.5,cx-.5,cx+.5,cx+1.5]) for(const z of [cz-1.0,cz+1.0])
    out.push(fixture(`${prefix}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',{yaw:z<cz?0:PI}));
  for(const [x,z,yaw] of [[cx-2.55,cz,PI/2],[cx+2.55,cz,-PI/2]]) out.push(fixture(`${prefix}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',{yaw}));
  out.push(...lightGrid(prefix,e,[[cx-1.8,cz],[cx+1.8,cz]],3500));
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

