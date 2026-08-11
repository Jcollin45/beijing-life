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
  ['M-FABRIC-SAND','sand woven textile','#c7b49b','fabric',7,.035],
  ['M-FABRIC-SAGE','sage woven textile','#789083','fabric',7,.035],
  ['M-CLINIC','white clinical laminate','#e5ece8','none',1,.32],
  ['M-CERAMIC','white sanitary ceramic','#edf0eb','none',1,.40],
  ['M-LAB-BLUE','laboratory cabinet blue','#577484','none',1,.22],
  ['M-SAFETY-YELLOW','safety yellow','#d6ad36','none',1,.18],
  ['M-SAFETY-RED','fire-safety red','#a83b30','none',1,.20],
  ['M-PLANT','interior foliage','#4f7440','foliage',15,.08],
].map(([id,label,color,texture,renderMode,gloss]) =>
  ({id,label,color,texture,renderMode,gloss}));

const prefabCatalog = [
  ['PF-WALL-RUN','architectural-layer',[1,.12,1],'centre','Panelized architectural assembly; floors receive recessed borders, ceiling rafts separated baffles, glazing frames and mullions, and vertical panels shadow joints or fabric pleats. Full dimensions come from the instance size.'],
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
  ['PF-SIDE-TABLE','side-table',[.55,.48,.55],'floor','Compact rounded top, recessed apron, four tapered legs and low steel stretcher.'],
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
  ['PF-SPEAKER','wall-speaker',[.42,.72,.28],'face-centre','Tapered loudspeaker cabinet, protective grille, twin drivers, status lamp and wall bracket.'],
  ['PF-ART-TABLE','art-table',[1.8,.78,.9],'floor','Washable table, four stools, cutting mat and supply caddy.'],
  ['PF-CCTV-DESK','security-console',[2.2,.82,.82],'floor','Desk, chair, four CCTV screens, radio and barrier controls.'],
  ['PF-KEY-CABINET','key-cabinet',[.72,1.05,.18],'face-centre','Lockable numbered key board.'],
  ['PF-COAT-RAIL','coat-hook-rail',[.90,.38,.12],'face-centre','Oak mounting rail with five individual brass double hooks and concealed wall brackets.'],
  ['PF-ELECTRICAL-CABINET','electrical-cabinet',[.58,1.15,.16],'face-centre','Recessed framed distribution cabinet with hinged door, breaker rows, warning plate and latch.'],
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
        'M-FABRIC-BLUE','south-facing ergonomic lecturer seating',{yaw:PI,facing:'south'}),
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
        'M-FABRIC-BLUE','west-facing student and visitor waiting',{yaw:-PI/2,facing:'west',size:[1.65,.84,.62]}),
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
        'M-WALL-WHITE','soft exterior daylight',{yaw:PI,size:[p.w,1.16,.025],collision:'none'}),
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
      fixture(`${id}/WINDOW/MULLION`,'powder-coated centre window mullion','PF-WALL-RUN',[cx,e+1.68,z+.058],
        'M-STEEL-DARK','real window framing between the two daylight panes',{size:[.07,1.24,.07],collision:'none'}),
      fixture(`${id}/WINDOW/CURTAIN-TRACK`,'recessed acoustic-curtain track','PF-WALL-RUN',[cx,e+2.335,z+.085],
        'M-STAINLESS','continuous track aligned with the window head',{size:[x1-x0-.36,.035,.045],collision:'none'}),
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
        {yaw:0,size:[5.15,1.30,.08],text:label||'大学课堂'}),
      fixture(`${id}/TEACHING/DATUM`,'oak teaching-wall head datum','PF-WALL-RUN',[cx,e+2.65,z1-.055],
        'M-OAK-DARK','human-scale teaching-wall head',{size:[5.62,.10,.055],collision:'none'}),
      fixture(`${id}/TEACHING/PODIUM`,'mobile lecturer podium','PF-TEACHER-PODIUM',[cx,e,z1-1.10],
        'M-WOOD-DESK','lecturer station with 1.20 m student clearance',{yaw:0,size:[1.18,1.12,.70]}),
      fixture(`${id}/TEACHING/CHAIR`,'lecturer chair','PF-CHAIR',[cx+1.18,e,z1-.64],
        'M-FABRIC-BLUE','south-facing lecturer seating outside the podium footprint',{yaw:PI,facing:'south'}),
      fixture(`${id}/TEACHING/SCREEN`,'side presentation monitor','PF-SCREEN',[x0+.055,e+1.58,z1-1.45],
        'M-SCREEN','presentation display clear of the teaching board',
        {yaw:-PI/2,size:[1.35,.78,.04],text:label||'课程资料 · COURSE',collision:'none'}),
      fixture(`${id}/TEACHING/PROJECTOR`,'ceiling projector','PF-PROJECTOR',[cx,e+2.72,-.55],
        'M-STEEL-DARK','projected teaching content',{yaw:0}),
      fixture(`${id}/TEACHING/CLOCK`,'classroom clock','PF-CLOCK',[cx+2.92,e+2.38,z1-.10],
        'M-WALL-WHITE','class timing',{yaw:0}),
      fixture(`${id}/TEACHING/COAT-RAIL`,'student coat and bag rail','PF-COAT-RAIL',[x1-.055,e+1.42,.95],
        'M-OAK','five brass hooks on the door-side wall, kept above the clear route',{yaw:PI/2,size:[1.10,.38,.12],collision:'none'}),
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
      fixture(`${id}/REFERENCE`,'slim course-reference shelf','PF-BOOKCASE',[x0+.22,e,-4.18],
        'M-OAK-DARK','shared readings and a small display of current coursework',{yaw:-PI/2,size:[.72,1.65,.32]}),
      fixture(`${id}/COURSE-BRIEF`,'course identity and lesson brief','PF-SCREEN',
        [x0+.85,e+1.58,b[3]-.085],'M-SCREEN',
        'floor-specific room identity, lesson title and learning outcomes beside the teaching board',
        {yaw:0,size:[1.35,.82,.05],text:`${label} · 课程重点`,collision:'none'}),
      ...plannedCeiling(id,e,b,xs,3900),
    ];
    let n=0;
    for(const [x,z] of positions){
      const k=pad(++n);
      out.push(
        fixture(`${id}/TABLE${k}`,'two-person student table','PF-MEETING-TABLE',[x,e,z],
          'M-WOOD-DESK',`${studentSeats}-seat classroom table layout`,{size:[1.40,.76,.64],yaw:0,columnAisle:.90,rowPitch:1.60}),
        fixture(`${id}/CHAIR${k}A`,'student chair A','PF-CHAIR',[x-.36,e,z-.58],
          'M-FABRIC-BLUE','north-facing student seat',{yaw:0,facing:'north'}),
        fixture(`${id}/CHAIR${k}B`,'student chair B','PF-CHAIR',[x+.36,e,z-.58],
          'M-FABRIC-BLUE','north-facing student seat',{yaw:0,facing:'north'}),
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
        'M-SCREEN','primary lecture presentation',{yaw:0,size:[3.35,1.62,.06],
          text:'现代文学 · 课堂讨论',collision:'none'}),
      fixture(`${id}/TEACHING/BOARD`,'lecture side whiteboard','PF-WHITEBOARD',[cx-2.65,e+1.60,z1-.085],
        'M-WHITEBOARD','supplementary lecture notes',{yaw:0,size:[1.65,1.15,.06]}),
      fixture(`${id}/TEACHING/PODIUM`,'lecture podium','PF-TEACHER-PODIUM',[cx,e,z1-1.10],
        'M-OAK-DARK','lecturer station',{yaw:0,size:[1.18,1.12,.70]}),
      fixture(`${id}/TEACHING/CHAIR`,'lecturer chair','PF-CHAIR',[cx+1.16,e,z1-.64],
        'M-FABRIC-BLUE','south-facing lecturer seating',{yaw:PI,facing:'south'}),
      fixture(`${id}/TEACHING/PROJECTOR`,'lecture projector','PF-PROJECTOR',[cx,e+2.72,-.60],
        'M-STEEL-DARK','presentation projection'),
      fixture(`${id}/TEACHING/CLOCK`,'lecture-room clock','PF-CLOCK',[cx+2.60,e+2.38,z1-.10],
        'M-WALL-WHITE','class timing',{yaw:0}),
      fixture(`${id}/TEACHING/COAT-RAIL`,'lecture-room coat and bag rail','PF-COAT-RAIL',[b[1]-.055,e+1.42,.85],
        'M-OAK','wall-mounted hooks kept above the protected side route',{yaw:PI/2,size:[1.10,.38,.12],collision:'none'}),
      ...plannedCeiling(id,e,b,[cx-2.2,cx,cx+2.2],3900),
    ];
    // Two seats are deliberately omitted at the west stair landing; the remaining 22-seat room
    // retains both three-row blocks and a 1.20 m centre aisle without compromising the second exit.
    const positions=[];
    for(const z of zs)for(const dx of relX)if(!(dx===relX[0]&&z<=zs[1]))positions.push([dx,z]);
    let n=0;
    for(const [dx,z] of positions)out.push(fixture(`${id}/SEAT${pad(++n)}`,'fixed lecture seat',
      'PF-LECTURE-SEAT',[x0+dx,e,z],'M-FABRIC-BLUE','22-seat north-facing lecture layout',{yaw:0,facing:'north',blockAisle:1.20,rowPitch:1.55}));
    return out;
  }

  function plannedComputerRoom(id,e,b,curtain,language=false) {
    const x0=b[0],cx=(b[0]+b[1])/2,z1=b[3],xs=[x0+1.45,x0+3.75,x0+6.05],zs=[-3.20,-1.65,-.10];
    const prefab=language?'PF-LANGUAGE-DESK':'PF-COMPUTER-DESK',
      instructorPrefab=language?'PF-LANGUAGE-DESK':'PF-CCTV-DESK',out=[
      ...plannedWindowWall(id,e,b,curtain),
      ...plannedDoorSideRoute(id,e,b,false),
      ...plannedTeachingWall(id,e,b,{board:'M-WHITEBOARD',label:language?'语言实验':'计算机教学',computer:true}),
      fixture(`${id}/TEACHING/INSTRUCTOR`,language?'language instructor workstation':'multi-monitor instructor demonstration console',
        instructorPrefab,[cx,e,z1-1.08],language?'M-WOOD-DESK':'M-OAK-DARK',
        language?'headset-equipped instructor station outside the student grid':
          'four-screen composed teaching console for live coding, comparison and projection outside the student grid',
        {yaw:PI,...(!language?{size:[1.85,.82,.78],displayCount:4}:{})}),
      fixture(`${id}/NETWORK`,'network and charging cabinet','PF-FILE-CABINET',[x0+.45,e,z1-1.18],
        'M-STEEL-DARK','locked network equipment',{yaw:-PI/2,size:[.78,1.35,.42]}),
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
      fixture(`${id}/REFERENCE-CADDY-L`,'shared seminar reference caddy','PF-TRAY-RACK',[cx-.72,e+.76,cz],
        'M-FABRIC-RED','multi-tier course readings and annotated handouts staged on the shared table',
        {size:[.48,.30,.28],collision:'none'}),
      fixture(`${id}/REFERENCE-CADDY-R`,'shared seminar reference caddy','PF-TRAY-RACK',[cx+.72,e+.76,cz],
        'M-LAB-BLUE','multi-tier group materials staged on the shared table',
        {size:[.48,.30,.28],collision:'none'}),
      fixture(`${id}/BOARD`,'seminar whiteboard','PF-WHITEBOARD',[cx,e+1.58,z1-.085],
        'M-WHITEBOARD','shared seminar notes',{yaw:0,size:[4.1,1.18,.06]}),
      fixture(`${id}/SCREEN`,'video seminar display','PF-SCREEN',[x0+.055,e+1.56,.75],
        'M-SCREEN','remote participation',
        {yaw:-PI/2,size:[1.35,.80,.04],text:'远程研讨 · HYBRID',collision:'none'}),
      fixture(`${id}/AGENDA`,'seminar agenda and evidence screen','PF-SCREEN',[x0+.72,e+1.58,z1-.085],
        'M-SCREEN','current readings, discussion sequence and hybrid-participation status',
        {yaw:0,size:[1.12,.78,.05],text:'文献 · 讨论 · 总结',collision:'none'}),
      fixture(`${id}/BOOK`,'seminar reference shelf','PF-BOOKCASE',[x0+.44,e,1.72],
        'M-OAK-DARK','course references',{yaw:-PI/2,size:[.78,1.72,.36]}),
      fixture(`${id}/COAT-RAIL`,'seminar coat and bag rail','PF-COAT-RAIL',[x1-.055,e+1.42,1.25],
        'M-OAK','wall-mounted hooks outside the door-side floor route',{yaw:PI/2,size:[1.10,.38,.12],collision:'none'}),
      ...plannedCeiling(id,e,b,[cx-2.2,cx,cx+2.2],3500),
    ];
    let n=0;
    for(const z of [cz-1.0,cz+1.0])for(const x of [cx-1.35,cx-.45,cx+.45,cx+1.35])out.push(
      fixture(`${id}/CHAIR${pad(++n)}`,'seminar chair','PF-CHAIR',[x,e,z],'M-FABRIC-BLUE','seminar seat',
        {yaw:z<cz?0:PI,facing:z<cz?'north':'south'}));
    out.push(fixture(`${id}/CHAIR${pad(++n)}`,'seminar end chair','PF-CHAIR',[cx-2.45,e,cz],
      'M-FABRIC-BLUE','seminar seat clear of door-side route',{yaw:PI/2,facing:'east'}));
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
        'M-FABRIC-BLUE','student consultation seat',{yaw:-PI/2,facing:'west'}),
      fixture(`${id}/VISITOR-R`,'east visitor chair','PF-CHAIR',[1.35,e,-.60],
        'M-FABRIC-BLUE','student consultation seat',{yaw:PI/2,facing:'east'}),
      fixture(`${id}/WAIT`,'tutorial waiting seats','PF-WAIT-CHAIRS',[-2.75,e,-3.30],
        'M-FABRIC-BLUE','east-facing waiting clear of the centre route',{yaw:PI/2,facing:'east',size:[1.55,.84,.62]}),
      fixture(`${id}/BOARD`,'tutorial whiteboard','PF-WHITEBOARD',[-1.90,e+1.55,b[3]-.08],
        'M-WHITEBOARD','worked examples and appointments',{yaw:0,size:[2.05,1.0,.06]}),
      fixture(`${id}/DISPLAY`,'tutorial booking display','PF-SCREEN',[1.90,e+1.55,b[3]-.08],
        'M-SCREEN','booking and remote tutorial status',
        {yaw:0,size:[2.05,1.0,.05],text:'答疑预约 · 可用',collision:'none'}),
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
        'M-WHITEBOARD','shared group notes',{yaw:-PI/2,size:[1.35,.92,.05]}),
      fixture(`${id}/BOARD-E`,'east collaboration display','PF-SCREEN',[b[1]-.055,e+1.55,1.72],
        'M-SCREEN','shared digital work',
        {yaw:PI/2,size:[1.35,.92,.05],text:'小组共享 · GROUP WORK',collision:'none'}),
      fixture(`${id}/BOOK`,'group-study reference shelf','PF-BOOKCASE',[b[0]+.22,e,2.42],
        'M-OAK-DARK','shared references',{yaw:-PI/2,size:[.82,1.72,.36]}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3600),
    ];
    let n=0;
    for(const z of zs)for(const [x,yaw,face] of [[-2.55,-PI/2,'west'],[2.55,PI/2,'east']])out.push(
      fixture(`${id}/DESK${pad(++n)}`,'perimeter study workstation','PF-DORM-DESK',[x,e,z],
        'M-WOOD-DESK','six-station group study with open centre',{yaw,facing:face}));
    return out;
  }

  function plannedPrepRoom(id,e,b,curtain) {
    const cx=(b[0]+b[1])/2,out=[
      ...plannedWindowWall(id,e,b,curtain),
      fixture(`${id}/RUNNER`,'1.20 m preparation-room route','PF-WALL-RUN',[cx,e+.012,-1.0],
        'M-VINYL','clear materials route from corridor',{size:[1.20,.02,7.45],collision:'none',clearWidth:1.20}),
      fixture(`${id}/KIT-DEMO-L`,'full microscope issue station','PF-MICROSCOPE',
        [-1.18,e,-2.05],'M-STEEL-DARK',
        'complete bench, stool, microscope, specimen tray and task light presented as one readable silhouette',
        {yaw:PI,size:[1.08,1.0,.84]}),
      fixture(`${id}/KIT-DEMO-R`,'full robotics issue station','PF-ROBOTICS',
        [1.18,e,-2.05],'M-LAB-BLUE',
        'complete bench, controller, robot model, tool board and extraction assembly presented as one readable silhouette',
        {yaw:PI,size:[1.08,1.0,.84]}),
      fixture(`${id}/KIT-CADDY-L`,'microscope specimen-and-lens caddy','PF-TRAY-RACK',[-2.75,e,-2.05],
        'M-LAB-BLUE','labelled specimen, lens and cleaning trays beside the microscope station',
        {yaw:PI,size:[.52,1.08,.42]}),
      fixture(`${id}/KIT-CADDY-R`,'robotics parts-and-tool caddy','PF-TRAY-RACK',[2.75,e,-2.05],
        'M-FABRIC-RED','colour-coded controller, sensor and tool trays beside the robotics station',
        {yaw:PI,size:[.52,1.08,.42]}),
      fixture(`${id}/SHELF-L`,'west labelled preparation shelf','PF-SHELF',[-2.95,e,-3.78],
        'M-STEEL','boxed course materials behind the demonstration stations',{yaw:-PI/2,size:[.90,1.80,.42]}),
      fixture(`${id}/SHELF-R`,'east labelled preparation shelf','PF-SHELF',[2.95,e,-3.78],
        'M-STEEL','boxed course materials behind the demonstration stations',{yaw:PI/2,size:[.90,1.80,.42]}),
      fixture(`${id}/BOARD`,'preparation schedule','PF-WHITEBOARD',[-1.90,e+1.55,b[3]-.08],
        'M-WHITEBOARD','room bookings and preparation status',{yaw:0,size:[2.05,1.0,.06]}),
      fixture(`${id}/KIT-STATUS`,'course-kit preparation status','PF-SCREEN',[1.90,e+1.55,b[3]-.08],
        'M-SCREEN','labelled teaching sets, collection times and readiness checks',
        {yaw:0,size:[2.05,1.0,.05],text:'课程材料 · 待领 / 已备  COURSE KITS',collision:'none'}),
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
        'M-SCREEN','office hours and department notices',
        {yaw:0,size:[2.05,.90,.05],text:'办公时间 · OFFICE HOURS',collision:'none'}),
      ...plannedCeiling(id,e,b,[-1.65,1.65],3500),
    ];
    let n=0;
    for(const z of [-2.40,.50])for(const [x,yaw,visitorX,visitorYaw,visitorFacing] of [
      [-2.40,-PI/2,-1.30,-PI/2,'west'],[2.40,PI/2,1.30,PI/2,'east'],
    ])out.push(
      fixture(`${id}/DESK${pad(++n)}`,'faculty workstation','PF-OFFICE-DESK',[x,e,z],
        'M-OAK','faculty workstation facing perimeter',{yaw}),
      fixture(`${id}/VISITOR${pad(n)}`,'faculty visitor chair','PF-CHAIR',[visitorX,e,z],
        'M-FABRIC-BLUE','student consultation chair',{yaw:visitorYaw,facing:visitorFacing}),
    );
    return out;
  }

  function plannedLobby(id,e,b,curtain) {
    return [
      fixture(`${id}/ENTRY-MAT`,'recessed entrance mat','PF-WALL-RUN',[0,e+.014,-4.52],
        'M-RUBBER','weather-protected entrance',{size:[2.95,.025,.78],collision:'none'}),
      fixture(`${id}/MAIN-ROUTE`,'1.20 m uninterrupted lobby route','PF-WALL-RUN',[0,e+.012,-1.0],
        'M-TERRAZZO','direct route between exterior and corridor doors',{size:[1.20,.02,7.75],collision:'none',clearWidth:1.20}),
      fixture(`${id}/RECEPTION`,'side-mounted accessible reception','PF-SERVICE-COUNTER',[2.78,e,0],
        'M-OAK','information without blocking the main route',{yaw:PI/2,size:[2.05,1.05,.72]}),
      fixture(`${id}/RECEPTION-CHAIR`,'reception staff chair','PF-CHAIR',[1.91,e,0],
        'M-FABRIC-BLUE','east-facing staffed service position outside the public entry route',
        {yaw:PI/2,facing:'east'}),
      fixture(`${id}/WAIT`,'side-mounted waiting seats','PF-WAIT-CHAIRS',[-2.72,e,-.40],
        'M-FABRIC-BLUE','east-facing waiting outside both door approaches',{yaw:PI/2,facing:'east',size:[1.55,.84,.62]}),
      fixture(`${id}/DIR`,'five-floor directory','PF-DIRECTORY',[-2.72,e,-2.75],
        'M-SCREEN','accessible floor and room wayfinding',{yaw:-PI/2,size:[.82,1.50,.10],text:'第一教学楼 · 1—5层'}),
      fixture(`${id}/KIOSK`,'classroom lookup kiosk','PF-SELF-CHECK',[2.65,e,-2.60],
        'M-SCREEN','room lookup and timetable',{yaw:PI/2}),
      fixture(`${id}/NEWS`,'teaching-block notice screen','PF-SCREEN',[b[1]-.055,e+1.55,-3.45],
        'M-SCREEN','room changes and university notices',
        {yaw:PI/2,size:[1.40,.84,.04],text:'教室变更 · 校园活动',collision:'none'}),
      fixture(`${id}/ARRIVAL-SERVICE`,'side-wall teaching-block welcome display','PF-SCREEN',
        [b[1]-.055,e+1.62,-1.45],'M-SCREEN',
        'large reception, accessible-service and room-finding identity viewed across the lobby with both doors outside the sightline',
        {yaw:PI/2,size:[2.75,1.08,.05],text:'第一教学楼 · 服务导览',collision:'none'}),
      fixture(`${id}/FEATURE-L`,'left lobby identity panel','PF-WALL-RUN',[-1.86,e+1.52,b[3]-.035],
        'M-OAK-DARK','frames the north corridor door',{size:[2.02,2.50,.035],collision:'none'}),
      fixture(`${id}/FEATURE-R`,'right lobby identity panel','PF-WALL-RUN',[1.86,e+1.52,b[3]-.035],
        'M-OAK-DARK','frames the north corridor door',{size:[2.02,2.50,.035],collision:'none'}),
      fixture(`${id}/WELCOME-L`,'university welcome sign','PF-ROOM-SIGN',[-1.86,e+1.76,b[3]-.07],
        'M-SCREEN','teaching-block identity',{yaw:0,size:[1.55,.34,.04],text:'北京文华大学'}),
      fixture(`${id}/WELCOME-R`,'building welcome sign','PF-ROOM-SIGN',[1.86,e+1.76,b[3]-.07],
        'M-SCREEN','teaching-block identity',{yaw:0,size:[1.55,.34,.04],text:'第一教学楼'}),
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
        'M-SCREEN','floor orientation',{yaw:0,size:[1.45,.38,.04],text:`${level}层 · FLOOR ${level}`}),
      fixture(`${prefix}/COR/NOTICE`,'floor teaching notice display','PF-SCREEN',
        [level===2?-4.0:-8.15,e+1.56,4.89],
        'M-SCREEN','room changes and teaching notices',
        {yaw:0,size:[2.10,.78,.04],text:'课程通知 · ROOM CHANGES',collision:'none'}),
      fixture(`${prefix}/COR/STUDENT-WORK`,'curated student-work pinboard','PF-WHITEBOARD',
        [level===4?2.50:6.10,e+1.56,4.89],
        'M-WHITEBOARD','one restrained display of current coursework',{yaw:0,size:[2.10,.78,.05],collision:'none'}),
      fixture(`${prefix}/COR-L1`,'corridor light west','PF-CEILING-LIGHT',[-6.5,e+2.76,4.02],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.45,.06,.28]}),
      fixture(`${prefix}/COR-L2`,'corridor light east','PF-CEILING-LIGHT',[6.5,e+2.76,4.02],
        'M-WALL-WHITE','corridor lighting',{temperatureK:3700,size:[1.45,.06,.28]}),
    ];
    if(level===2)out.push(
      fixture(`${prefix}/COR/ARRIVAL-HUMANITIES`,'tutorial-floor appointment directory','PF-DIRECTORY',
        [-8.90,e,4.02],'M-SCREEN',
        'a full-height face-on booking, room-status and course directory giving the second-floor arrival its own silhouette',
        {yaw:-PI/2,size:[1.42,1.86,.30],text:'答疑 · 201 / 202',collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-HUMANITIES-CLOCK`,'tutorial-floor class clock','PF-CLOCK',
        [-8.86,e+2.30,4.56],'M-WALL-WHITE','class-change time completing the face-on tutorial directory',
        {yaw:-PI/2,size:[.42,.42,.08],collision:'none'}),
    );
    if(level===3)out.push(
      fixture(`${prefix}/COR/ARRIVAL-DIGITAL`,'language-and-computing arrival display','PF-SCREEN',
        [5.80,e+1.58,4.02],'M-SCREEN',
        'a full face-on live timetable and workstation-status surface for the language and computing floor',
        {yaw:PI/2,size:[1.42,1.04,.05],text:'语言 · 数字教学',collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-DIGITAL-SPEAKER`,'language-floor monitor speaker','PF-SPEAKER',
        [5.76,e+1.50,3.34],'M-LAB-BLUE','left audio monitor completing the listening-and-speaking arrival assembly',
        {yaw:PI/2,size:[.30,.58,.20],collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-DIGITAL-SPEAKER-R`,'language-floor right monitor speaker','PF-SPEAKER',
        [5.76,e+1.50,4.70],'M-LAB-BLUE','right audio monitor completing the listening-and-speaking arrival assembly',
        {yaw:PI/2,size:[.30,.58,.20],collision:'none'}),
    );
    if(level===4)out.push(
      fixture(`${prefix}/COR/ARRIVAL-KITS`,'microscope course-kit issue rack','PF-TRAY-RACK',
        [8.36,e+.94,3.38],'M-LAB-BLUE',
        'face-on multi-tier lens, slide and specimen issue rack completing the fourth-floor arrival',
        {yaw:PI/2,size:[.46,.92,.28],collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-KITS-R`,'robotics course-kit issue rack','PF-TRAY-RACK',
        [8.36,e+.94,4.66],'M-FABRIC-RED',
        'face-on multi-tier controller, sensor and tool issue rack completing the fourth-floor arrival',
        {yaw:PI/2,size:[.46,.92,.28],collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-KITS-STATUS`,'course-kit issue status','PF-SCREEN',
        [8.40,e+1.68,4.02],'M-SCREEN','face-on collection times and ready-to-issue teaching sets',
        {yaw:PI/2,size:[1.16,.86,.05],text:'课程器材 · 已备',collision:'none'}),
    );
    if(level===5)out.push(
      fixture(`${prefix}/COR/ARRIVAL-SEMINAR`,'seminar-and-faculty arrival display','PF-SCREEN',
        [-4.50,e+1.58,4.02],'M-SCREEN',
        'face-on seminar schedule, faculty office hours and hybrid-room status for the fifth-floor arrival',
        {yaw:-PI/2,size:[1.42,1.02,.05],text:'研讨 · 教师办公',collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-SEMINAR-RAIL`,'seminar visitor coat rail','PF-COAT-RAIL',
        [-4.46,e+1.02,4.02],'M-OAK','face-on brass hooks below the seminar schedule',
        {yaw:-PI/2,size:[.92,.34,.12],collision:'none'}),
    );
    doorXs.forEach((x,i)=>out.push(fixture(`${prefix}/COR/SIGN${i+1}`,'room entrance sign','PF-ROOM-SIGN',
      [x+.70,e+1.60,3.055],'M-SCREEN','room identification',{yaw:PI,size:[.78,.28,.04],text:labels[i]})));
    for(const [i,x] of [-9,-3,3,9].entries())out.push(fixture(`${prefix}/COR/RAFT${i+1}`,'corridor acoustic raft','PF-WALL-RUN',
      [x,e+2.96,4.02],'M-ACOUSTIC','speech absorption in circulation',{size:[4.80,.045,1.28],collision:'none'}));
    return out;
  }

  // Upper-floor review arrivals step through the centre-room threshold and keep its hinged leaf
  // behind the camera.  Each room then supplies a face-on, programme-specific assembly instead of
  // repeating a long corridor shot: tutorial bookings, language collaboration, teaching kits and
  // faculty consultation all have visibly different silhouettes at the scale of the final frame.
  function plannedCentreArrival(prefix,e,level) {
    if(level===2)return[
      fixture(`${prefix}/CENTRE/ARRIVAL-TUTORIAL`,'tutorial booking and room-status directory','PF-DIRECTORY',
        [-1.55,e,-3.82],'M-SCREEN','face-on 201/202 tutorial appointments and available consultation slots',
        {yaw:PI,size:[1.25,1.78,.32],text:'201 / 202 · 教师答疑'}),
      fixture(`${prefix}/CENTRE/ARRIVAL-TUTORIAL-FOLIOS`,'tutorial question and reading folios','PF-TRAY-RACK',
        [-.70,e+.92,-3.78],'M-OAK','composed course-question cards and current tutorial reading beside the booking display',
        {yaw:PI,size:[.48,.84,.34],collision:'none'}),
    ];
    if(level===3)return[
      fixture(`${prefix}/CENTRE/ARRIVAL-COLLAB`,'language collaboration monitor','PF-SCREEN',
        [1.58,e+1.58,-3.86],'M-SCREEN','full face-on speaking, listening and group-work status for the language floor',
        {yaw:PI,size:[1.72,1.04,.20],text:'语言练习 · 小组共享',collision:'none'}),
      fixture(`${prefix}/CENTRE/ARRIVAL-COLLAB-SPEAKER`,'language collaboration monitor speaker','PF-SPEAKER',
        [.56,e+1.44,-3.82],'M-LAB-BLUE','composed audio monitor beside the language collaboration display',
        {yaw:PI,size:[.32,.60,.22],collision:'none'}),
      fixture(`${prefix}/CENTRE/ARRIVAL-COLLAB-SPEAKER-R`,'language collaboration right speaker','PF-SPEAKER',
        [2.60,e+1.44,-3.82],'M-LAB-BLUE','paired audio monitor completing the listening-workstation silhouette',
        {yaw:PI,size:[.32,.60,.22],collision:'none'}),
    ];
    if(level===4)return[
      fixture(`${prefix}/CENTRE/ARRIVAL-KIT-BACKDROP`,'microscope and robotics issue status','PF-SCREEN',
        [0,e+1.62,-4.70],'M-SCREEN','face-on backdrop identifying the two complete teaching-kit stations',
        {yaw:PI,size:[2.55,.94,.16],text:'显微镜 · 机器人 · 已备',collision:'none'}),
    ];
    return[
      fixture(`${prefix}/CENTRE/ARRIVAL-OFFICE`,'faculty consultation and seminar directory','PF-DIRECTORY',
        [-1.55,e,-3.82],'M-SCREEN','face-on faculty office hours, seminar rooms and consultation status',
        {yaw:PI,size:[1.25,1.78,.32],text:'研讨 · 教师办公'}),
      fixture(`${prefix}/CENTRE/ARRIVAL-OFFICE-FOLIOS`,'faculty consultation folio rack','PF-TRAY-RACK',
        [-.70,e+.92,-3.78],'M-OAK-DARK','seminar briefs and appointment slips beside the office-hours directory',
        {yaw:PI,size:[.48,.84,.34],collision:'none'}),
    ];
  }

  function plannedB01Stair(prefix,e,side) {
    const westSide=side==='W',x=westSide?-14.825:14.825,landingX=westSide?-13.50:13.50,
      outerX=westSide?-15.445:15.445,outerYaw=westSide?-PI/2:PI/2;
    return [
      fixture(`${prefix}/FIX`,westSide?'west protected stair':'east protected stair','PF-STAIR',[x,e,-2.1],
        'M-TERRAZZO','composed protected stair with tactile nosings and a clear internal landing',{size:[1.25,3.05,4.2]}),
      fixture(`${prefix}/LANDING`,'recessed protected-stair landing field','PF-WALL-RUN',[landingX,e+.012,-2.10],
        'M-RUBBER','slip-resistant landing kept clear between the flight and self-closing door',{size:[1.12,.02,1.70],collision:'none',clearWidth:1.12}),
      fixture(`${prefix}/IDENTITY`,'floor-colour stair identity panel','PF-WALL-RUN',[outerX,e+1.44,-2.10],
        'M-FABRIC-BLUE','durable acoustic lining on the protected stair outer wall',{size:[.035,2.45,2.20],collision:'none'}),
      fixture(`${prefix}/FLOOR-SIGN`,'protected-stair floor marker','PF-ROOM-SIGN',[outerX+(westSide?.025:-.025),e+1.72,-1.05],
        'M-SCREEN','stair identity and floor confirmation',{yaw:outerYaw,size:[.72,.34,.04],text:`${side==='W'?'西':'东'}楼梯`}),
      fixture(`${prefix}/LIGHT`,'protected-stair landing light','PF-CEILING-LIGHT',[landingX,e+2.76,-2.10],
        'M-WALL-WHITE','authored landing illumination independent of room-light ordering',{temperatureK:3600,size:[.78,.06,.42]}),
    ];
  }

  function plannedB01WestWC(prefix,e) {
    return [
      fixture(`${prefix}/FLOOR`,'anti-slip washroom floor field','PF-WALL-RUN',[-14.15,e+.012,3.0],
        'M-TILE-DARK','continuous sanitary floor finish',{size:[2.35,.02,3.55],collision:'none'}),
      fixture(`${prefix}/T`,'south-wall toilet','PF-TOILET',[-14.45,e,1.45],
        'M-CERAMIC','toilet with cistern against the south wall',{yaw:PI,facing:'north'}),
      fixture(`${prefix}/B`,'west-wall washbasin','PF-BASIN',[-15.15,e,2.75],
        'M-CERAMIC','hand washing with clear standing space',{yaw:-PI/2,facing:'east'}),
      fixture(`${prefix}/MIRROR`,'basin mirror','PF-DANCE-MIRROR',[-15.445,e+1.55,2.75],
        'M-GLASS','mirror aligned directly above the washbasin',{yaw:-PI/2,size:[.70,.72,.035]}),
      fixture(`${prefix}/C`,'west-wall cleaning cupboard','PF-CLEANING',[-15.15,e,4.35],
        'M-STEEL','janitorial storage outside the door approach',{yaw:-PI/2,size:[.80,2.05,.58]}),
      fixture(`${prefix}/LIGHT`,'washroom ceiling light','PF-CEILING-LIGHT',[-14.15,e+2.76,2.75],
        'M-WALL-WHITE','authored sanitary-room lighting',{temperatureK:4000,size:[.68,.06,.48]}),
    ];
  }

  function plannedB01LiftWC(prefix,e) {
    return [
      fixture(`${prefix}/LIFT`,'accessible lift','PF-LIFT',[14.72,e,4.05],
        'M-STEEL','accessible vertical circulation facing the west lobby approach',{yaw:PI/2,size:[1.45,2.45,1.55],levels:[1,2,3,4,5]}),
      fixture(`${prefix}/WC-FLOOR`,'accessible-WC anti-slip floor field','PF-WALL-RUN',[14.15,e+.012,1.80],
        'M-TILE-DARK','continuous sanitary floor finish south of the privacy screen',{size:[2.45,.02,1.45],collision:'none'}),
      fixture(`${prefix}/WC-PARTITION`,'accessible-WC privacy partition','PF-WALL-RUN',[14.60,e+1.38,2.78],
        'M-TILE-LIGHT','full-height privacy screen with a 0.95 m west opening',{size:[1.70,2.55,.08],collision:'none',openingWidth:.95}),
      fixture(`${prefix}/T`,'south-wall accessible toilet in east transfer bay','PF-TOILET',[14.75,e,1.55],
        'M-CERAMIC','accessible toilet with cistern against the south wall and transfer rails',{yaw:PI,facing:'north',grabRails:true}),
      fixture(`${prefix}/B`,'west-wall accessible basin','PF-BASIN',[13.15,e,1.55],
        'M-CERAMIC','accessible hand washing outside the toilet transfer side',{yaw:-PI/2,facing:'east'}),
      fixture(`${prefix}/MIRROR`,'accessible basin mirror','PF-DANCE-MIRROR',[12.845,e+1.55,1.55],
        'M-GLASS','mirror aligned above the accessible basin',{yaw:-PI/2,size:[.70,.72,.035]}),
      fixture(`${prefix}/WC-SIGN`,'accessible-WC identity sign','PF-ROOM-SIGN',[14.60,e+2.12,2.725],
        'M-SCREEN','sanitary-room identity on the privacy partition',{yaw:0,size:[.82,.28,.04],text:'无障碍卫生间 · WC'}),
      fixture(`${prefix}/WC-LIGHT`,'accessible-WC ceiling light','PF-CEILING-LIGHT',[14.15,e+2.76,1.80],
        'M-WALL-WHITE','authored sanitary-room lighting',{temperatureK:4000,size:[.68,.06,.48]}),
      fixture(`${prefix}/LOBBY-LIGHT`,'lift-lobby ceiling light','PF-CEILING-LIGHT',[14.15,e+2.76,4.05],
        'M-WALL-WHITE','authored lift waiting illumination',{temperatureK:3700,size:[.78,.06,.42]}),
    ];
  }

  function validatePlannedB01(building) {
    const floorStanding=new Set(['PF-STUDENT-DESK-2','PF-LECTURE-SEAT','PF-TEACHER-PODIUM','PF-CHAIR',
      'PF-COMPUTER-DESK','PF-LANGUAGE-DESK','PF-OFFICE-DESK','PF-DORM-DESK','PF-MEETING-TABLE',
      'PF-CCTV-DESK',
      'PF-SERVICE-COUNTER','PF-WAIT-CHAIRS','PF-DIRECTORY','PF-SELF-CHECK','PF-BOOKCASE',
      'PF-FILE-CABINET','PF-PREP-TABLE','PF-SHELF','PF-BIN','PF-PLANT','PF-STAIR','PF-LIFT',
      'PF-TOILET','PF-BASIN','PF-CLEANING','PF-WATER']);
    const semanticSeatPrefabs=new Set(['PF-CHAIR','PF-LECTURE-SEAT','PF-WAIT-CHAIRS','PF-BENCH']);
    // Seating yaw is a public authoring contract: yaw 0 faces +z, PI faces -z, +PI/2 faces +x,
    // and -PI/2 faces -x. Keep the assertion here so a renderer change cannot silently invert an
    // entire teaching layout again.
    const facingVectors={north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]};
    const seatVector=yaw=>[Math.sin(yaw||0),Math.cos(yaw||0)];
    const depthEnvelope={'PF-STUDENT-DESK-2':1.25,'PF-COMPUTER-DESK':1.35,'PF-LANGUAGE-DESK':1.35,
      'PF-OFFICE-DESK':1.45,'PF-DORM-DESK':1.05};
    const rect=f=>{
      let w=f.size[0],d=Math.max(f.size[2],depthEnvelope[f.prefab]||0);
      const quarter=((Math.round((f.yaw||0)/(PI/2))%2)+2)%2;if(quarter)[w,d]=[d,w];
      return {x0:f.at[0]-w/2,x1:f.at[0]+w/2,z0:f.at[2]-d/2,z1:f.at[2]+d/2,id:f.id};
    };
    const hit=(a,b,eps=.001)=>a.x1>b.x0+eps&&a.x0<b.x1-eps&&a.z1>b.z0+eps&&a.z0<b.z1-eps;
    const errors=[];let checked=0,overlaps=0,doorBlocks=0,routeBlocks=0,semanticSeatDirectionChecks=0;
    for(const f of building.floorsPlan)for(const room of f.rooms){
      for(const seat of (room.contents||[]).filter(o=>semanticSeatPrefabs.has(o.prefab))){
        const expected=facingVectors[seat.facing];semanticSeatDirectionChecks++;
        if(!expected)errors.push(`${seat.id}: semantic seat lacks north/south/east/west facing metadata`);
        else{
          const actual=seatVector(seat.yaw),vectorError=Math.hypot(actual[0]-expected[0],actual[1]-expected[1]);
          if(vectorError>.001)errors.push(`${seat.id}: yaw vector disagrees with facing ${seat.facing}`);
        }
      }
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
      doorApproachObstructions:doorBlocks,mainRouteObstructions:routeBlocks,semanticSeatDirectionChecks};
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
      if(key==='CENTRE'&&spec.level>1)contents.push(...plannedCentreArrival(prefix,e,spec.level));
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
      room(`${prefix}/STAIR-W`,'西安全楼梯',[-15.5,-12.8,-5,.8],'service',[],plannedB01Stair(`${prefix}/STAIR-W`,e,'W')),
      room(`${prefix}/WC-W`,'西侧卫生间',[-15.5,-12.8,1,5],'service',[],plannedB01WestWC(`${prefix}/WC-W`,e),
        {services:{mechanicalExtract:'concealed ceiling extract; no decorative equipment block'}}),
      room(`${prefix}/STAIR-E`,'东安全楼梯',[12.8,15.5,-5,.8],'service',[],plannedB01Stair(`${prefix}/STAIR-E`,e,'E')),
      room(`${prefix}/LIFT-E`,'电梯与无障碍卫生间',[12.8,15.5,1,5],'service',[],plannedB01LiftWC(`${prefix}/LIFT-E`,e),
        {services:{mechanicalExtract:'concealed WC extract behind the privacy partition'}}),
    );
    const shared=[
      ...safetySet(prefix,e,[-12.55,4.3],[0,3.35],spec.level,spec.level===1),
      fixture(`${prefix}/WATER`,'north-wall drinking-water station','PF-WATER',[12.4,e,5.25],'M-STEEL','student hydration in a recess beyond the 1.85 m corridor'),
      ...plannedCorridor(prefix,e,spec.level,spec.labels,floorAccents[spec.level-1]),
    ];
    const programmeReview=spec.level===1?{roomId:`${prefix}/WEST`,at:{x:-9.40,z:-.72,yaw:-PI/12},
      focusFixtureIds:[`${prefix}/WEST/TEACHING/DISPLAY`,`${prefix}/WEST/TEACHING/BOARD`]}:
      spec.level===2?{roomId:`${prefix}/WEST`,at:{x:-9.94,z:-.36,yaw:-PI/18},
        focusFixtureIds:[`${prefix}/WEST/COURSE-BRIEF`,`${prefix}/WEST/TEACHING/BOARD`]}:
      spec.level===3?{roomId:`${prefix}/EAST`,at:{x:8.42,z:-1.80,yaw:-11*PI/36},
        focusFixtureIds:[`${prefix}/EAST/WS05`,`${prefix}/EAST/TEACHING/BOARD`]}:
      spec.level===4?{roomId:`${prefix}/CENTRE`,at:{x:0,z:-1.60,yaw:PI},
        focusFixtureIds:[`${prefix}/CENTRE/KIT-DEMO-L`,`${prefix}/CENTRE/KIT-DEMO-R`]}:
      {roomId:`${prefix}/WEST`,at:{x:-7.10,z:.72,yaw:-11*PI/36},
        focusFixtureIds:[`${prefix}/WEST/AGENDA`,`${prefix}/WEST/BOARD`]};
    const entryReview=spec.level===1?null:spec.level===2?{zoneId:`${prefix}/CENTRE-ROUTE`,
      at:{x:0,z:-1.20,yaw:PI},body:'hidden',
      focusFixtureIds:[`${prefix}/CENTRE/ARRIVAL-TUTORIAL`,`${prefix}/CENTRE/ARRIVAL-TUTORIAL-FOLIOS`]}:
      spec.level===3?{zoneId:`${prefix}/CENTRE-ROUTE`,at:{x:0,z:-1.20,yaw:PI},body:'hidden',
        focusFixtureIds:[`${prefix}/CENTRE/ARRIVAL-COLLAB`,`${prefix}/CENTRE/ARRIVAL-COLLAB-SPEAKER`]}:
      spec.level===4?{zoneId:`${prefix}/CENTRE-ROUTE`,at:{x:0,z:-1.20,yaw:PI},body:'hidden',
        focusFixtureIds:[`${prefix}/CENTRE/KIT-DEMO-L`,`${prefix}/CENTRE/KIT-DEMO-R`,`${prefix}/CENTRE/ARRIVAL-KIT-BACKDROP`]}:
      {zoneId:`${prefix}/CENTRE-ROUTE`,at:{x:0,z:-1.20,yaw:PI},body:'hidden',
        focusFixtureIds:[`${prefix}/CENTRE/ARRIVAL-OFFICE`,`${prefix}/CENTRE/ARRIVAL-OFFICE-FOLIOS`]};
    floors.push(floor(spec.level,e,3.3,rooms,[
      {id:`${prefix}/CORRIDOR`,bounds:[-12.8,12.8,3.1,4.95],clearWidth:1.85,surface:'M-TERRAZZO'},
      ...(spec.level>1?[{id:`${prefix}/CENTRE-ROUTE`,bounds:[-.60,.60,-4.85,4.95],
        clearWidth:1.20,surface:'M-VINYL',roomMainRoute:true}]:[]),
      ...(spec.level===1?[{id:`${prefix}/ENTRY`,bounds:[-1.65,1.65,-5.5,3.1],clearWidth:3.3,surface:'M-TERRAZZO'}]:[]),
    ],shared,{occupancy:spec.level===5?45:spec.level===1?72:60,
      visualReview:{
        ...(spec.level===1?{entries:[{suffix:'entry',portalId:'B01/PUBLIC',focusRoomId:`${prefix}/CENTRE`,
          cameraZoneId:`${prefix}/CENTRE`,focusAt:{x:1.40,z:-.40,yaw:2*PI/3},body:'hidden',
          focusFixtureIds:[`${prefix}/CENTRE/ARRIVAL-SERVICE`]}]}:{}),
        programme:programmeReview,...(entryReview?{entry:entryReview}:{}),
      }}));
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

// Each internal window bay is a deliberately layered architectural assembly: translucent inner
// glazing, a durable oak sill, dark head trim and two slim plaster jambs.  The panels sit against
// the real room face and remain non-colliding; furniture still owns the usable floor clearance.
function b02WindowBays(prefix,e,side,points,options={}) {
  const out=[],west=side==='west',wallX=options.wallX??(west?-6.08:6.08);
  points.forEach((z,i)=>{
    const id=`${prefix}/BAY${pad(i+1)}`,purpose=options.purpose||
      'deep-set library daylight opening aligned with the exterior window rhythm';
    out.push(
      fixture(`${id}/GLASS`,'laminated internal window glazing','PF-WALL-RUN',
        [wallX,e+1.57,z],'M-GLASS',purpose,{size:[.035,1.48,1.62],collision:'none'}),
      fixture(`${id}/SILL`,'oak window sill','PF-WALL-RUN',
        [wallX+(west?.055:-.055),e+.79,z],'M-OAK','durable architectural sill and book ledge',
        {size:[.16,.065,1.78],collision:'none'}),
      fixture(`${id}/HEAD`,'dark oak window head reveal','PF-WALL-RUN',
        [wallX+(west?.025:-.025),e+2.34,z],'M-OAK-DARK','architectural head trim concealing the blind track',
        {size:[.09,.10,1.78],collision:'none'}),
      fixture(`${id}/JAMB-A`,'plaster window jamb','PF-WALL-RUN',
        [wallX,e+1.57,z-.84],'M-WALL-WARM','deep architectural window reveal',
        {size:[.08,1.58,.07],collision:'none'}),
      fixture(`${id}/JAMB-B`,'plaster window jamb','PF-WALL-RUN',
        [wallX,e+1.57,z+.84],'M-WALL-WARM','deep architectural window reveal',
        {size:[.08,1.58,.07],collision:'none'}),
    );
  });
  return out;
}

function b02StackRuns(prefix,e,xs,zs,label,material='M-OAK-DARK',size=[.9,2.05,2.8],options={}) {
  const out=[]; let n=0;
  const yaw=options.yaw||0,markerDx=-Math.sin(yaw)*(size[2]/2+.025),
    markerDz=-Math.cos(yaw)*(size[2]/2+.025);
  for(const z of zs) for(const x of xs) {
    const index=++n,id=`${prefix}/STACK${pad(index)}`;
    out.push(
      fixture(id,'human-scale double-sided library stack','PF-BOOKSTACK',[x,e,z],material,
        'classified collection with accessible parallel and cross aisles',
        {yaw,size,classification:`${label} ${index}`,minimumFaceAisle:1.2,minimumCrossAisle:1.2}),
      fixture(`${id}/MARKER`,'stack-end classification plate','PF-ROOM-SIGN',
        [x+markerDx,e+1.43,z+markerDz],'M-SCREEN',
        'eye-level shelf range and collection marker on the presented stack face',
        {yaw,text:`${label} · ${index}`,size:[Math.min(.58,size[0]*.72),.22,.035],collision:'none'}),
    );
  }
  return out;
}

function b02ReadingTables(prefix,e,points,options={}) {
  const out=[];
  points.forEach(([x,z,yaw=0],i)=>out.push(fixture(`${prefix}/TABLE${pad(i+1)}`,
    'four-seat library reading table','PF-READING-TABLE',[x,e,z],'M-OAK',
    options.purpose||'quiet reading with chair pull-back clearance',
    {yaw,size:[2.1,.78,1.05],tableLamp:true,accessible:i===0,pullBackClearance:.6})));
  (options.benches||[]).forEach(([x,z,yaw=0,facing,facesPoint],i)=>out.push(fixture(`${prefix}/BENCH${pad(i+1)}`,
    'upholstered window reading bench','PF-BENCH',[x,e,z],'M-FABRIC-BLUE',
    'daylit informal reading',{yaw,facing,facesPoint,size:[1.8,.84,.58]})));
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
        'M-FABRIC-BLUE','group-study seat',{yaw:PI/2,facing:'east',facesPoint:[4.85,z-.60]}),
      fixture(`${prefix}/${pod}/C2`,'group-study chair','PF-CHAIR',[4.05,e,z+.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:PI/2,facing:'east',facesPoint:[4.85,z+.60]}),
      fixture(`${prefix}/${pod}/C3`,'group-study chair','PF-CHAIR',[5.65,e,z-.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:-PI/2,facing:'west',facesPoint:[4.85,z-.60]}),
      fixture(`${prefix}/${pod}/C4`,'group-study chair','PF-CHAIR',[5.65,e,z+.60],
        'M-FABRIC-BLUE','group-study seat',{yaw:-PI/2,facing:'west',facesPoint:[4.85,z+.60]}),
      fixture(`${prefix}/${pod}/ACOUSTIC`,'group-study acoustic wall liner','PF-WALL-RUN',
        [6.045,e+1.48,z],'M-ACOUSTIC','genuine absorptive wall finish behind the writing surface',
        {size:[.045,2.15,2.45],collision:'none'}),
      fixture(`${prefix}/${pod}/BOARD`,'group-study whiteboard','PF-WHITEBOARD',
        [6.08,e+1.55,z],'M-WHITEBOARD','shared notes',{yaw:-PI/2,size:[1.65,.90,.05],collision:'none'}),
      b02WallSign(`${prefix}/${pod}/SIGN`,e,6.09,z,`小组学习 ${pod}`,-PI/2,1.35),
      ...b02Ceiling(`${prefix}/${pod}/CEILING`,e,[[4.85,z,1.65,.24]],3300,true),
    );
  }
  out.push(fixture(`${prefix}/PLANT`,'group-study planting','PF-PLANT',[5.70,e,5.45],
    'M-PLANT','restrained planting between acoustic study pods',{size:[.46,.92,.46]}));
  return out;
}

function buildB02() {
  const floors=[];
  const coreB=[1.1,6.15,-11.6,-5.35],wcB=[3.55,6.15,-3.85,-.9],
    remoteStairB=[-5.95,-3.15,7.0,11.35];
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
    room(`${prefix}/STAIR-NW`,'西北安全楼梯',remoteStairB,'service',[
      doorway(`${prefix}/STAIR-NW/D-APPROACH`,'east',[-3.15,e,7.80],1.10,`${prefix}/EGRESS-NW`),
    ],[
      fixture(`${prefix}/STAIR-NW/FIX`,'remote protected library stair','PF-STAIR',[-4.75,e,9.90],
        'M-TERRAZZO','independent north-west protected egress',{size:[1.85,3.0,2.35]}),
      fixture(`${prefix}/STAIR-NW/EXT`,'recessed fire extinguisher','PF-EXTINGUISHER',[-5.62,e,7.48],
        'M-SAFETY-RED','protected-stair first response fire safety',{size:[.34,.72,.16]}),
      fixture(`${prefix}/STAIR-NW/EXIT`,'illuminated protected-stair exit sign','PF-EXIT-SIGN',
        [-3.21,e+2.35,7.80],'M-SCREEN','mark the remote protected stair',{yaw:PI/2,text:'安全出口 EXIT',collision:'none'}),
      fixture(`${prefix}/STAIR-NW/EML`,'protected-stair emergency light','PF-EMERGENCY-LIGHT',
        [-4.75,e+2.42,8.68],'M-WALL-WHITE','battery lighting over the stair landing',{collision:'none'}),
      ...b02WindowBays(`${prefix}/STAIR-NW/WINDOW`,e,'west',[9.86],{
        wallX:-5.90,purpose:'fire-rated stair daylight glazing aligned with the west facade bay',
      }),
      ...b02Ceiling(`${prefix}/STAIR-NW/CEILING`,e,[[-4.75,8.15,1.15,.22]],3700,false),
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
        fixture(`${p}/LOBBY/RET`,'book-return kiosk','PF-SELF-CHECK',[-4.25,e,-1.95],
          'M-SCREEN','after-hours and staffed-hours returns kept on the south service side of the arrival',{yaw:PI}),
        fixture(`${p}/LOBBY/PORTAL-HEAD`,'oak entry portal head','PF-WALL-RUN',[-6.08,e+2.50,0],
          'M-OAK-DARK','genuine architectural head framing the glazed library entrance',
          {size:[.11,.16,4.05],collision:'none'}),
        fixture(`${p}/LOBBY/SIDELIGHT-S`,'south entry glass sidelight window','PF-WALL-RUN',[-6.075,e+1.38,-1.72],
          'M-GLASS','laminated architectural window sidelight beside the public doors',
          {size:[.035,2.12,.58],collision:'none'}),
        fixture(`${p}/LOBBY/SIDELIGHT-N`,'north entry glass sidelight window','PF-WALL-RUN',[-6.075,e+1.38,1.72],
          'M-GLASS','laminated architectural window sidelight beside the public doors',
          {size:[.035,2.12,.58],collision:'none'}),
        fixture(`${p}/LOBBY/ARRIVAL`,'library arrival and service display','PF-SCREEN',[-4.20,e+1.62,2.34],
          'M-SCREEN','large face-on north-wall library identity with both side doors, security gates, AED and returns outside the lens',
          {yaw:0,size:[2.40,1.10,.05],text:'图书馆 · 新书 · 借阅',collision:'none'}),
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
        fixture(`${p}/CIRC/BACKDROP`,'oak reader-services wall lining','PF-WALL-RUN',[.84,e+1.38,-2.15],
          'M-OAK-DARK','genuine timber wall finish behind the circulation workstation',
          {size:[.05,2.55,2.55],collision:'none'}),
        b02WallSign(`${p}/CIRC/SIGN`,e,.45,-4.46,'借还书处 · CIRCULATION',0,1.85),
        ...b02Ceiling(`${p}/CIRC/CEILING`,e,[[-.45,-2.15,1.55,.24]],3300,false),
      ]),
      room(`${p}/NEW`,'新书与综合阅览',[-6.15,.9,2.65,11.6],'library',[],[
        fixture(`${p}/NEW/FACEOUT`,'wide face-out new-book display','PF-BOOKCASE',[-1.70,e,10.90],
          'M-OAK','large north-wall new and recommended book workflow presented face-on without a shelf back in the camera foreground',
          {yaw:0,size:[2.35,1.50,.42]}),
        fixture(`${p}/NEW/FEATURED`,'compact featured-title bookcase','PF-BOOKCASE',[.28,e,10.90],
          'M-OAK-DARK','second composed face-out bay for staff picks and high-demand new titles',
          {yaw:0,size:[1.10,1.35,.42]}),
        fixture(`${p}/NEW/CATALOGUE`,'new-book catalogue and availability monitor','PF-SCREEN',[-1.70,e+2.20,11.54],
          'M-SCREEN','populated title-search, call-number and loan-status screen above the recommendation display',
          {yaw:0,size:[2.05,.70,.05],text:'新书 · 检索 · 可借',collision:'none'}),
        fixture(`${p}/NEW/RECOMMEND`,'staff recommendation and reservation rack','PF-TRAY-RACK',[-3.15,e+.88,10.90],
          'M-OAK-DARK','composed recommendation cards, reservation slips and featured slim volumes completing the browsing workflow',
          {yaw:0,size:[.46,.94,.36],collision:'none'}),
        fixture(`${p}/NEW/RECYCLE`,'paper recycling bin','PF-BIN',[-1.20,e,3.30],
          'M-STEEL-DARK','quietly located paper recycling beside the new-book display',{size:[.38,.62,.38]}),
        ...b02ReadingTables(`${p}/NEW/READ`,e,[[-1.00,9.65,0]],{
          purpose:'new-book browsing with full chair pull-back',
          benches:[],plant:[-1.20,6.40],
          sign:[-2.6,11.56,'新书阅览 · NEW BOOKS',PI,1.95],
        }),
        ...b02WindowBays(`${p}/NEW/WINDOWS`,e,'west',[3.35,6.45]),
        ...b02Ceiling(`${p}/NEW/STACK-LIGHTS`,e,[[-4.45,5.1,1.1,.24],[-1.95,5.1,1.1,.24]],3400,false),
      ]),
      room(`${p}/READ`,'无障碍阅览区',[1.7,6.15,1.0,11.6],'library',[],[
        ...b02ReadingTables(`${p}/READ`,e,[[4.65,3.30,0],[4.65,5.80,0]],{
          purpose:'accessible reading with 1.2 m approaches and chair pull-back',
          benches:[[5.75,10.65,-PI/2,'west',[4.65,10.65]]],
          sign:[6.11,3.8,'无障碍阅览 · ACCESSIBLE',-PI/2,1.95],
        }),
        fixture(`${p}/READ/MAG`,'screen-magnifier workstation','PF-COMPUTER-DESK',[2.75,e,10.80],
          'M-OAK','accessible screen magnification',{accessible:true,yaw:PI/2}),
        ...b02WindowBays(`${p}/READ/WINDOWS`,e,'east',[3.25,6.45]),
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
        ...b02WindowBays(`${p}/PROCESS/WINDOWS`,e,'west',[-9.95,-6.65]),
        b02WallSign(`${p}/PROCESS/SIGN`,e,-3.5,-11.55,'图书加工 · TECHNICAL SERVICES',PI,2.4),
        ...b02Ceiling(`${p}/PROCESS/CEILING`,e,[[-3.7,-7.2,1.8,.24],[-3.9,-10.4,1.8,.24]],3500,false),
      ]),
      ...coreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.2,rooms,[
      {id:`${p}/HALL`,bounds:[-2.25,3.4,-.8,2.55],clearWidth:2.0,surface:'M-TERRAZZO'},
      {id:`${p}/SERVICE-SPINE`,bounds:[1.1,3.4,-6.0,-.8],clearWidth:1.5,surface:'M-OAK'},
      {id:`${p}/NORTH-SPINE`,bounds:[1.7,3.4,2.4,8.55],clearWidth:1.7,surface:'M-OAK'},
      {id:`${p}/EGRESS-NW`,bounds:[-3.15,3.4,7.05,8.55],clearWidth:1.5,surface:'M-TERRAZZO'},
    ],[
      ...safetySet(p,e,[3.2,-3.8],[-5.6,0],level,true),
      b02WallSign(`${p}/HALL/SIGN`,e,3.36,1.7,'新书 · 阅览 · 借还书',-PI/2,1.8),
      ...b02Ceiling(`${p}/SPINE/CEILING`,e,[[2.25,-3.1,1.1,.22],[2.25,1.0,1.1,.22]],3400,false),
    ],{occupancy:92,visualReview:{
      entries:[{suffix:'entry',portalId:'B02/PUBLIC',focusRoomId:`${p}/LOBBY`,cameraZoneId:`${p}/LOBBY`,
        focusAt:{x:-4.15,z:1.20,yaw:-11*PI/60},body:'hidden',
        focusFixtureIds:[`${p}/LOBBY/ARRIVAL`]}],
      programme:{roomId:`${p}/NEW`,at:{x:-1.80,z:7.00,yaw:7*PI/36},
        focusFixtureIds:[`${p}/NEW/FACEOUT`,`${p}/NEW/CATALOGUE`]},
    }}));
  }

  // Floors 2–4: collection/reading rooms open from a true 1.50 m minimum quiet spine.
  for(const spec of [
    {level:2,south:'人文社科书库',north:'大阅览室',east:'小组学习室',kind:'humanities',
      spineAccent:'M-FABRIC-SAND',spineIdentity:'人文学科 · HUMANITIES'},
    {level:3,south:'科学期刊书库',north:'电子阅览室',east:'小组学习室',kind:'science',
      spineAccent:'M-LAB-BLUE',spineIdentity:'科学期刊 · DIGITAL JOURNALS'},
    {level:4,south:'特藏与档案',north:'安静阅览室',east:'馆员办公室',kind:'archive',
      spineAccent:'M-FABRIC-SAGE',spineIdentity:'特藏阅览 · SPECIAL COLLECTIONS'},
  ]) {
    const e=(spec.level-1)*3.2,p=`B02/F${spec.level}`;
    const identityZ=11.52,identityX=2.25,identityYaw=0,identityWallSize=[2.20,2.48,.055];
    const south=[-6.15,.9,-11.6,-.7],north=[-6.15,.9,-.45,11.6],east=[3.55,6.15,-.7,11.6];
    const southContents=[
      ...(spec.kind==='archive'?[fixture(`${p}/SOUTH/STACK01`,'west-wall special-collections bookcase',
        'PF-BOOKCASE',[-5.00,e,-6.65],'M-OAK-DARK',
        'compact side-wall secure holdings case outside the authored consultation sightline',
        {yaw:PI/2,size:[.48,1.78,2.10]})]:
        b02StackRuns(`${p}/SOUTH`,e,[-4.25,-1.55],[-9.0,-5.0],spec.south,'M-OAK-DARK',[.9,2.05,2.8])),
      fixture(`${p}/SOUTH/CART`,'collection reshelving cart','PF-SHELF',[.35,e,-10.62],
        'M-STEEL','book returns staged at the end of the collection run',{size:[.42,1.08,.64]}),
      ...b02WindowBays(`${p}/SOUTH/WINDOWS`,e,'west',[-9.95,-6.65,-3.35],{
        purpose:spec.kind==='archive'?'UV-filtered archive glazing within the exterior bay rhythm':
          'deep-set library daylight opening aligned with the exterior window rhythm',
      }),
      fixture(`${p}/SOUTH/IDENTITY`,'collection identity and subject display','PF-SCREEN',
        [-3.0,e+1.62,-11.52],'M-SCREEN',
        'composed floor-specific collection identity at the end of the measured stack runs',
        {yaw:PI,size:[2.75,1.02,.05],collision:'none',text:spec.kind==='humanities'?
          '文学 · 历史 · 哲学':spec.kind==='science'?'期刊 · 数据库 · 数据集':'特藏 · 档案 · 申请阅览'}),
      ...b02Ceiling(`${p}/SOUTH/CEILING`,e,[[-2.9,-9,1.2,.24],[-2.9,-5,1.2,.24]],3400,false),
    ];
    if(spec.kind==='humanities') southContents.push(
      ...b02ReadingTables(`${p}/SOUTH/BROWSE`,e,[[-.35,-1.42,0]],{
        purpose:'subject-browsing table with books and a banker lamp beyond the stack cross-aisle',
      }),
      fixture(`${p}/SOUTH/CATALOG`,'collection catalogue kiosk','PF-SELF-CHECK',[-5.65,e,-1.18],
        'M-SCREEN','shelf finding and catalogue search',{yaw:PI/2}),
    );
    if(spec.kind==='science') southContents.push(
      fixture(`${p}/SOUTH/DIGITAL-CONSOLE`,'four-screen digital-periodicals console','PF-CCTV-DESK',[-.35,e,-1.65],
        'M-OAK-DARK','composed multi-monitor access to databases, datasets and electronic journals',
        {yaw:0,size:[1.85,.82,.72],displayCount:4}),
      fixture(`${p}/SOUTH/SCAN`,'journal scan and discovery kiosk','PF-SELF-CHECK',[-5.65,e,-1.18],
        'M-SCREEN','scan print journals and open linked electronic holdings',{yaw:PI/2}),
      fixture(`${p}/SOUTH/DIGITAL-WALL`,'digital-journals discovery display','PF-SCREEN',[-3.0,e+1.62,-.75],
        'M-SCREEN','live database, dataset and electronic-journal discovery surface',
        {yaw:PI,size:[2.45,1.05,.05],text:'数据库 · 数据集 · 电子期刊',collision:'none'}),
    );
    if(spec.kind==='archive') southContents.push(
      ...b02ReadingTables(`${p}/SOUTH/SUPERVISED`,e,[[-.35,-1.42,0]],{
        purpose:'supervised special-collections consultation with books, lamp and full chair pull-back',
      }),
      fixture(`${p}/SOUTH/CTRL`,'wall-mounted archive environmental monitor','PF-SCREEN',[.84,e+1.58,-2.90],
        'M-SCREEN','temperature, humidity and UV status clear of the reading aisle',
        {yaw:-PI/2,size:[1.15,.72,.05],text:'20°C · 45% RH · UV FILTER',collision:'none'}),
      fixture(`${p}/SOUTH/VIEW`,'open supervised archive display table','PF-PREP-TABLE',[-3.0,e,-8.40],
        'M-OAK','open-leg consultation-height display with a stainless undershelf and unobstructed sightline',
        {yaw:0,size:[2.20,.82,.78]}),
      fixture(`${p}/SOUTH/VIEW-FOLIO-L`,'manuscript and map folio cradle','PF-TRAY-RACK',[-3.48,e+.82,-8.40],
        'M-FABRIC-SAND','tiered open manuscript, map and caption presentation on the archive display table',
        {yaw:PI,size:[.62,.34,.46],collision:'none'}),
      fixture(`${p}/SOUTH/VIEW-FOLIO-R`,'rare-book and request folio cradle','PF-TRAY-RACK',[-2.64,e+.82,-8.40],
        'M-OAK-DARK','tiered open rare-book, request slip and handling-support presentation',
        {yaw:PI,size:[.62,.34,.46],collision:'none'}),
      fixture(`${p}/SOUTH/HANDLING-CART`,'archive handling and support cart','PF-TRAY-RACK',[-4.55,e,-8.40],
        'M-FABRIC-SAGE','open multi-tier foam supports, weights, gloves and request slips beside the consultation table',
        {yaw:PI,size:[.58,1.10,.44]}),
      fixture(`${p}/SOUTH/REQUEST-KIOSK`,'supervised archive request kiosk','PF-SELF-CHECK',[-1.15,e,-8.40],
        'M-SCREEN','reader request, call-slip and handling acknowledgement beside the open display table',
        {yaw:PI,size:[.62,1.30,.46]}),
      fixture(`${p}/SOUTH/REQUEST-SCREEN`,'special-collections request display','PF-SCREEN',
        [-.72,e+1.62,-11.52],'M-SCREEN',
        'reader registration, handling rules and requested items beside the south-wall collection identity',
        {yaw:PI,size:[1.38,1.02,.05],text:'预约 · 阅览',collision:'none'}),
    );

    let northContents;
    if(spec.kind==='science') {
      const pcs=[[-4.60,5.40],[-.40,5.40],[-2.50,10.20],[-.40,9.00]];
      northContents=[
        ...pcs.map(([x,z],i)=>fixture(`${p}/NORTH/PC${pad(i+1)}`,'electronic reading workstation',
          'PF-COMPUTER-DESK',[x,e,z],'M-OAK','database, catalogue and journal access')),
        fixture(`${p}/NORTH/PRINT`,'print and scan station','PF-SELF-CHECK',[.35,e,11.15],
          'M-SCREEN','journal printing and scanning',{yaw:PI}),
        fixture(`${p}/NORTH/SCREEN`,'digital scholarship display','PF-SCREEN',[-3.0,e+1.62,11.55],
          'M-SCREEN','research support and digital collections',
          {yaw:PI,size:[2.6,1.25,.05],text:'数字学术 · 数据库 · 电子期刊',collision:'none'}),
        fixture(`${p}/NORTH/DATA-CONSOLE`,'digital-scholarship analysis console','PF-CCTV-DESK',
          [-2.65,e,2.20],'M-OAK-DARK',
          'four-screen composed console facing the south-wall workflow display for datasets, digital editions and collaborative comparison',
          {yaw:0,size:[1.65,.82,.54],displayCount:4}),
        fixture(`${p}/NORTH/DIGITAL-WORKFLOW`,'digital-journals analysis workflow display','PF-SCREEN',
          [-2.65,e+1.62,-.39],'M-SCREEN',
          'face-on database, dataset, scan and citation workflow behind the composed analysis console',
          {yaw:PI,size:[2.70,1.08,.05],text:'检索 · 数据 · 扫描 · 引用',collision:'none'}),
        ...b02WindowBays(`${p}/NORTH/WINDOWS`,e,'west',[3.25,6.40]),
        b02WallSign(`${p}/NORTH/SIGN`,e,-4.8,11.55,'电子阅览室 · DIGITAL READING',PI,2.0),
        ...b02Ceiling(`${p}/NORTH/CEILING`,e,[[-3.55,2.0,1.8,.24],[-3.55,5.4,1.8,.24],[-3.55,8.8,1.8,.24]],3500,false),
      ];
    } else {
      const tables=spec.kind==='humanities'?
        [[-4.35,2.20,0],[-1.0,2.20,0],[-4.35,5.60,0],[-1.0,5.60,0]]:
        [[-4.35,2.40,0],[-1.0,2.40,0],[-2.65,5.60,0]];
      northContents=b02ReadingTables(`${p}/NORTH`,e,tables,{
        purpose:spec.kind==='archive'?'silent supervised reading with chair pull-back':'quiet reading with chair pull-back',
        benches:[[-1.0,11.15,PI,'south',[-1.0,9.65]]],
        sign:[-3.2,11.55,spec.north,PI,2.0],clock:[.45,11.55,PI],
      });
      northContents.push(...b02WindowBays(`${p}/NORTH/WINDOWS`,e,'west',[3.25,6.40],{
        purpose:spec.kind==='archive'?'UV-filtered quiet-room glazing with deep oak reveals':
          'deep-set reading-room daylight opening aligned with the exterior window rhythm',
      }));
      if(spec.kind==='humanities')northContents.push(
        fixture(`${p}/NORTH/HUMANITIES-DISPLAY`,'humanities reading-room subject display','PF-SCREEN',
          [-3.0,e+1.62,-.39],'M-SCREEN',
          'current literature, history and philosophy reading lists facing the quiet tables',
          {yaw:PI,size:[2.65,1.05,.05],text:'文学 · 历史 · 哲学',collision:'none'}),
        fixture(`${p}/NORTH/HUMANITIES-FOLIOS-L`,'literature and history reading folios','PF-TRAY-RACK',
          [-4.35,e+.78,2.20],'M-FABRIC-SAND',
          'open multi-tier books, excerpts and source cards on the first humanities reading table',
          {yaw:PI,size:[.72,.30,.42],collision:'none'}),
        fixture(`${p}/NORTH/HUMANITIES-FOLIOS-R`,'philosophy and methods reading folios','PF-TRAY-RACK',
          [-1.0,e+.78,2.20],'M-OAK-DARK',
          'open multi-tier books, notes and reading-list cards on the second humanities reading table',
          {yaw:PI,size:[.72,.30,.42],collision:'none'}),
      );
    }

    const eastContents=spec.kind==='archive'?[
      fixture(`${p}/EAST/DESK`,'librarian workstation','PF-OFFICE-DESK',[4.85,e,2.0],
        'M-OAK','special-collections staff workstation',{yaw:PI/2,size:[1.4,.76,.70]}),
      fixture(`${p}/EAST/MEET`,'archive consultation table','PF-MEETING-TABLE',[4.85,e,7.70],
        'M-OAK','staff-supervised archive consultation',{yaw:PI/2,size:[1.8,.76,.80]}),
      fixture(`${p}/EAST/C1`,'consultation chair','PF-CHAIR',[4.0,e,7.70],
        'M-FABRIC-BLUE','archive consultation seat',{yaw:PI/2,facing:'east',facesPoint:[4.85,7.70]}),
      fixture(`${p}/EAST/C2`,'consultation chair','PF-CHAIR',[5.70,e,7.70],
        'M-FABRIC-BLUE','archive consultation seat',{yaw:-PI/2,facing:'west',facesPoint:[4.85,7.70]}),
      fixture(`${p}/EAST/FILES`,'secure archive files','PF-FILE-CABINET',[4.25,e,10.75],
        'M-STEEL-DARK','finding aids and request records'),
      fixture(`${p}/EAST/CASE`,'staff reference bookcase','PF-BOOKCASE',[5.55,e,10.75],
        'M-OAK-DARK','staff reference collection'),
      fixture(`${p}/EAST/PLANT`,'archive office plant','PF-PLANT',[5.68,e,3.80],
        'M-PLANT','restrained staff-area planting',{size:[.42,.88,.42]}),
      b02WallSign(`${p}/EAST/SIGN`,e,6.11,2.0,'馆员办公室',-PI/2,1.5),
      ...b02Ceiling(`${p}/EAST/CEILING`,e,[[4.85,2.0,1.3,.22],[4.85,7.7,1.4,.22]],3400,true),
    ]:b02GroupStudy(`${p}/EAST`,e);

    const spineArrival=spec.kind==='humanities'?[
      fixture(`${p}/SPINE/ARRIVAL-HUMANITIES`,'humanities floor arrival screen','PF-SCREEN',
        [identityX,e+1.34,identityZ-.035],'M-SCREEN',
        'literature, history and philosophy collection map composed into the acoustic arrival wall',
        {yaw:identityYaw,size:[2.02,1.02,.05],text:'文学 · 历史 · 哲学',collision:'none'}),
      fixture(`${p}/SPINE/ARRIVAL-HUMANITIES-FOLIOS`,'humanities new-reading folio rack','PF-TRAY-RACK',
        [3.02,e+.88,identityZ-.16],'M-FABRIC-SAND',
        'shallow multi-tier face-out books and reading lists completing the humanities arrival wall',
        {yaw:identityYaw,size:[.58,.72,.28],collision:'none'}),
    ]:spec.kind==='science'?[
      fixture(`${p}/SPINE/ARRIVAL-DIGITAL`,'digital-journals floor arrival screen','PF-SCREEN',
        [identityX,e+1.38,identityZ+.035],'M-SCREEN',
        'live database, dataset and electronic-journal availability composed into the arrival wall',
        {yaw:identityYaw,size:[1.72,1.02,.05],text:'期刊 · 数据库 · 数据集',collision:'none'}),
      fixture(`${p}/SPINE/ARRIVAL-DIGITAL-SPEAKER`,'digital-floor announcement speaker','PF-SPEAKER',
        [3.17,e+1.40,identityZ+.14],'M-LAB-BLUE','right wall-bracketed service and closing-time audio monitor',
        {yaw:identityYaw,size:[.30,.58,.20],collision:'none'}),
      fixture(`${p}/SPINE/ARRIVAL-DIGITAL-SPEAKER-L`,'digital-floor left monitor speaker','PF-SPEAKER',
        [1.34,e+1.40,identityZ+.14],'M-LAB-BLUE','left wall-bracketed service and closing-time audio monitor',
        {yaw:identityYaw,size:[.30,.58,.20],collision:'none'}),
    ]:[
      fixture(`${p}/SPINE/ARRIVAL-ARCHIVE`,'special-collections arrival screen','PF-SCREEN',
        [identityX,e+1.34,identityZ],'M-SCREEN',
        'reader registration, request status and handling guidance composed into the archive arrival wall',
        {yaw:identityYaw,size:[1.72,1.02,.05],text:'特藏 · 预约 · 阅览',collision:'none'}),
      fixture(`${p}/SPINE/ARRIVAL-ARCHIVE-KEYS`,'archive request-key cabinet','PF-KEY-CABINET',
        [3.15,e+1.42,identityZ-.14],'M-OAK-DARK','wall-mounted numbered request-key and reader-pass cabinet',
        {yaw:identityYaw,size:[.52,.82,.16],collision:'none'}),
      fixture(`${p}/SPINE/ARRIVAL-ARCHIVE-FOLIOS`,'archive request and handling folio rack','PF-TRAY-RACK',
        [1.34,e+.88,identityZ-.14],'M-FABRIC-SAGE',
        'shallow face-on request slips, gloves and handling supports completing the archive arrival',
        {yaw:identityYaw,size:[.48,.72,.26],collision:'none'}),
    ];

    const rooms=[
      room(`${p}/SOUTH`,spec.south,south,'library',[],southContents),
      room(`${p}/NORTH`,spec.north,north,'library',[],northContents,
        {legacySceneAlias:spec.level===2?'library':undefined}),
      room(`${p}/EAST`,spec.east,east,spec.kind==='archive'?'office':'library',[
        doorway(`${p}/EAST/D-SPINE`,'west',[3.55,e,spec.kind==='archive'?5.0:5.5],1.20,`${p}/SPINE`),
      ],eastContents),
      ...coreRooms(spec.level,e,p),
    ];
    const entryFocus=spec.kind==='humanities'?`${p}/SPINE/ARRIVAL-HUMANITIES`:
      spec.kind==='science'?`${p}/SPINE/ARRIVAL-DIGITAL`:`${p}/SPINE/ARRIVAL-ARCHIVE`;
    const entryPose={x:2.25,z:10.00,yaw:0};
    const entryReview={zoneId:`${p}/SPINE`,at:entryPose,body:'hidden',
      focusFixtureIds:spec.kind==='humanities'?[entryFocus,`${p}/SPINE/ARRIVAL-HUMANITIES-FOLIOS`]:
        spec.kind==='science'?[entryFocus,`${p}/SPINE/ARRIVAL-DIGITAL-SPEAKER`]:
          [entryFocus,`${p}/SPINE/ARRIVAL-ARCHIVE-KEYS`]};
    const programmeReview=spec.kind==='humanities'?
      {roomId:`${p}/NORTH`,at:{x:-2.65,z:3.80,yaw:PI},
        focusFixtureIds:[`${p}/NORTH/TABLE02`,`${p}/NORTH/HUMANITIES-DISPLAY`]}:
      spec.kind==='science'?{roomId:`${p}/NORTH`,at:{x:-2.65,z:4.00,yaw:PI},
        focusFixtureIds:[`${p}/NORTH/DATA-CONSOLE`,`${p}/NORTH/DIGITAL-WORKFLOW`]}:
      {roomId:`${p}/SOUTH`,at:{x:-3.00,z:-6.60,yaw:PI},
        focusFixtureIds:[`${p}/SOUTH/VIEW-FOLIO-L`,`${p}/SOUTH/VIEW-FOLIO-R`,`${p}/SOUTH/REQUEST-KIOSK`]};
    floors.push(floor(spec.level,e,3.2,rooms,[
      {id:`${p}/SPINE`,bounds:[1.1,3.4,-5.2,11.6],clearWidth:1.5,surface:'M-OAK'},
      {id:`${p}/EGRESS-NW`,bounds:[-3.15,3.4,7.05,8.55],clearWidth:1.5,surface:'M-TERRAZZO'},
    ],[
      ...safetySet(p,e,[3.2,-3.8],[3.35,0],spec.level,false),
      fixture(`${p}/WATER`,'water dispenser','PF-WATER',[.45,e,.35],
        'M-STEEL','visitor hydration'),
      fixture(`${p}/SPINE/RUNNER`,'quiet-spine floor runner','PF-WALL-RUN',[2.25,e+.014,3.2],
        'M-RUBBER','acoustic and visual route through the floor',{size:[1.35,.022,15.8],collision:'none'}),
      b02WallSign(`${p}/SPINE/SIGN`,e,3.36,1.5,`${spec.south} · ${spec.north} · ${spec.east}`,
        -PI/2,2.0),
      fixture(`${p}/SPINE/IDENTITY-WALL`,'floor-specific quiet-spine identity lining','PF-WALL-RUN',
        [identityX,e+1.42,identityZ],spec.spineAccent,
        'genuine acoustic wall finish making each upper library floor legible from its arrival spine',
        {size:identityWallSize,collision:'none'}),
      fixture(`${p}/SPINE/IDENTITY`,'floor-specific quiet-spine heading','PF-ROOM-SIGN',
        [identityX,e+2.34,identityZ],'M-SCREEN','concise collection heading above the composed arrival fixture',
        {yaw:identityYaw,size:[1.95,.30,.045],text:spec.spineIdentity,collision:'none'}),
      ...spineArrival,
      ...b02Ceiling(`${p}/SPINE/CEILING`,e,[[2.25,-2.8,1.05,.22],[2.25,3.2,1.05,.22],[2.25,9.0,1.05,.22]],3400,false),
    ],{occupancy:spec.level===4?48:72,visualReview:{
      entry:entryReview,
      programme:programmeReview,
    }}));
  }
  return {
    id:'B02',label:'图书馆',status:'partial-existing',centreCampus:[36.5,50],localBounds:[-6.5,6.5,-12,12],
    exteriorFootprint:{x0:30,x1:43,z0:38,z1:62},floors:4,floorHeight:3.2,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'50 + localZ'},
    portals:[{id:'B02/PUBLIC',campusAt:[30,50],campusReturn:[27.2,50,PI/2],localSpawn:[-5.0,0,0,PI/2],placeKey:'campus_b02_f1'},
      {id:'B02/LEGACY-READING',mapsTo:'B02/F2/NORTH',placeKey:'library',preserve:true}],
    facadeAlignment:{westTallWindows:{localX:-6.5,localZ:[-10,-6.7,-3.4,-.1,3.2,6.5,9.8]},serviceWindows:'east, north and south follow the 3.2 m exterior bay rule'},
    design:'A measured four-floor university library: clear security threshold and side-on reader-services desk; human-scale stacks with 1.20 m or wider face and cross aisles; a 1.50 m minimum quiet spine; reading tables oriented with full chair pull-back; daylit window benches; acoustically separated group pods; digital reading, silent special-collections reading and compact staff consultation areas; two remote protected stairs on every floor; wall-mounted signs and a restrained ceiling rhythm.',
    planningMetrics:{
      doorApproachDepth:1.35,quietSpineClearWidth:1.50,groundServiceSpineClearWidth:1.50,
      protectedStairsPerFloor:2,remoteStairCentreSeparation:20.82,remoteStairDoorClearWidth:1.10,
      remoteStairApproachWidth:1.50,remoteStairLandingDepth:1.35,
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
  const eastWindowBay=(id,z)=>[
    decor(`${id}/GLASS`,'east dining window glazing',[6.50,e+2.55,z],
      'M-GLASS',[.04,2.45,1.85],'facade-aligned safety glazing within a deep architectural window reveal'),
    decor(`${id}/JAMB-S`,'east window south jamb',[6.46,e+2.55,z-.97],
      'M-WALL-WARM',[.16,2.65,.08],'deep washable architectural window reveal'),
    decor(`${id}/JAMB-N`,'east window north jamb',[6.46,e+2.55,z+.97],
      'M-WALL-WARM',[.16,2.65,.08],'deep washable architectural window reveal'),
    decor(`${id}/HEAD`,'east window head reveal',[6.46,e+3.84,z],
      'M-WALL-WARM',[.16,.12,2.02],'architectural window head and shadow line'),
    decor(`${id}/SILL`,'sealed oak dining window sill',[6.40,e+1.28,z],
      'M-OAK',[.24,.10,2.02],'deep architectural sill aligned to the exterior dining window'),
  ];
  // Each dining group is a real 1.35 × .75 m table with chairs individually oriented toward it.
  // Two groups omit the north-east chair for a .90 × 1.20 m wheelchair position adjoining an aisle.
  const diningGroup=(id,x,z,accessible=false)=>{
    const out=[fixture(`${p}/DINING/${id}/TABLE`,accessible?'accessible four-place dining table':'four-place dining table',
      'PF-MEETING-TABLE',[x,e,z],'M-OAK','student dining',{size:[1.35,.76,.75],accessible}),
    fixture(`${p}/DINING/${id}/PENDANT`,'warm dining pendant','PF-PENDANT',[x,e+4.78,z],
      'M-BRASS','warm pool of light centred on the shared dining table',
      {temperatureK:3000,lumens:850,size:[.38,.34,.38]})];
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
      'M-SCREEN','prices, dishes and allergen information',{yaw:PI/2,size:[1.55,1.05,.05],
        text:'今日菜单 · 米饭 · 青菜 · 豆腐 · 红烧肉',collision:'none'}),
    fixture(`${p}/DINING/CLOCK`,'dining-hall clock','PF-CLOCK',[6.48,e+2.75,2.55],
      'M-WALL-WHITE','meal-service time',{yaw:-PI/2}),
    plate(`${p}/DINING/WELCOME`,'canteen entrance identity',[6.49,e+3.38,0],
      '学生食堂 · STUDENT CANTEEN','clear identity above the public entrance',{yaw:PI/2,size:[3.4,.42,.05]}),
    fixture(`${p}/DINING/WATER`,'filtered drinking-water station','PF-WATER',[6.12,e,8.30],
      'M-STAINLESS','refill point outside the dining and return aisles'),
    fixture(`${p}/DINING/PLANT`,'canteen threshold plant','PF-PLANT',[6.08,e,-8.30],
      'M-PLANT','restrained lived-in planting outside the south dining aisle',{size:[.42,.95,.42]}),
    decor(`${p}/DINING/FEATURE-WALL`,'south brick dining identity wall',[4.62,e+1.55,-8.84],
      'M-BRICK',[2.75,2.75,.06],'genuine durable architectural wall finish at the tray-collection end'),
    plate(`${p}/DINING/CLEAN-PLATE`,'food-waste campaign sign',[4.62,e+2.10,-8.80],
      '学生食堂 · CANTEEN','student-canteen identity on the brick dining wall',
      {yaw:PI,size:[2.25,.48,.05]}),
    plate(`${p}/DINING/SOUP-NOTE`,'daily soup notice',[4.70,e+1.72,8.80],
      '今日例汤 · DAILY SOUP','restrained daily-service notice at the dining-room north wall',
      {yaw:0,size:[1.75,.32,.05]}),
  );
  // Four composed exterior-aligned window bays, washable acoustic rafts and integrated linear
  // lights establish a repeatable facade/ceiling rhythm without decorative furniture blocks.
  for(const [i,z] of diningRows.entries()) dining.push(...eastWindowBay(`${p}/DINING/WINDOW${i+1}`,z));
  for(const [i,z] of diningRows.entries()) dining.push(
    decor(`${p}/DINING/RAFT${i+1}`,'washable perforated acoustic raft',[3.825,e+5.48,z],
      'M-ACOUSTIC',[4.65,.10,1.05],'absorb dining noise above one table row'),
    fixture(`${p}/DINING/L${i+1}`,'integrated linear dining light','PF-CEILING-LIGHT',
      [3.825,e+5.37,z],'M-WALL-WHITE','even table-row illumination',{temperatureK:3400,size:[4.15,.06,.24]}),
  );

  const serving=[];
  // Four bays use genuinely different composed silhouettes instead of recolouring one repeated
  // counter: a guarded steam-rice counter, an open induction range under a hood, a tall monitored
  // tofu refrigerator with a small pass, and an open-leg braise portioning table.  Every body stays
  // east of the 1.20 m staff aisle and west of the 1.50 m customer queue.
  const dishes=[
    {zh:'米饭',en:'RICE',operation:'蒸饭 · STEAM',z:-5.90,
      primary:['PF-SERVING-COUNTER','guarded steam-rice counter','M-OAK',[1.20,1.15,.86],
        'warm oak steam-rice bay with integral pans, utensils and a glazed guard']},
    {zh:'青菜',en:'GREENS',operation:'现炒 · WOK',z:-4.00,hood:true,
      primary:['PF-KITCHEN-RANGE','open induction greens range','M-STAINLESS',[1.30,.92,.82],
        'four-ring live-cook silhouette with controls and splashback for the vegetable bay'],
      sidecar:['PF-SERVING-COUNTER','compact guarded greens pass','M-WALL-GREEN',[.72,1.10,.70],1.10,
        'small green-laminate guarded pass for finished vegetable portions']},
    {zh:'豆腐',en:'TOFU',operation:'温控 · HOLD',z:-1.65,
      primary:['PF-SERVING-COUNTER','low monitored tofu cold-well','M-LAB-BLUE',[1.24,1.08,.78],
        'queue-facing chilled counter with three visible tofu, garnish and sauce pans beneath a glazed guard'],
      sidecar:['PF-TRAY-RACK','tofu bowl and condiment caddy','M-TILE-LIGHT',[.46,.78,.38],.92,
        'open bowl, condiment and allergen-card tiers beside the chilled tofu well']},
    {zh:'红烧肉',en:'BRAISED PORK',operation:'分切 · PORTION',z:.70,
      primary:['PF-PREP-TABLE','open braise carving and portioning table','M-OAK-DARK',[1.40,.90,.75],
        'open-leg dark-oak portioning table with stainless undershelf and a separate red board'],
      primaryExtra:{boardColor:'red'},
      sidecar:['PF-TRAY-RACK','braise bowl and serving-tool rack','M-FABRIC-RED',[.46,.76,.38],.95,
        'stacked bowls, portion ladles and clean service tools beside the open carving table']},
  ];
  const bayAccents=['M-OAK-DARK','M-WALL-GREEN','M-LAB-BLUE','M-FABRIC-RED'];
  const foodPresentations=[
    {label:'covered rice-pan and bowl bank',material:'M-SAFETY-YELLOW',at:[-.55,1.18,-5.90],size:[1.02,.46,.52],
      purpose:'three-tier composed rice-pan, bowl and paddle presentation on the guarded steam counter'},
    {label:'fresh-greens pan and garnish bank',material:'M-WALL-GREEN',at:[-.55,.96,-4.00],size:[1.02,.46,.52],
      purpose:'three-tier composed vegetable pan, garnish and utensil presentation on the induction range'},
    {label:'tofu portion and condiment bank',material:'M-WALL-WHITE',at:[-.55,1.12,-.81],size:[1.02,.46,.52],
      purpose:'three-tier composed tofu portion, condiment and allergen-card presentation on the chilled pass'},
    {label:'braise tray and carving-tool bank',material:'M-FABRIC-RED',at:[-.55,.94,.70],size:[1.02,.46,.52],
      purpose:'three-tier composed braise tray, carving board and portion-tool presentation on the open-leg table'},
  ];
  dishes.forEach(({zh,en,operation,z,primary,primaryExtra={},sidecar,hood},i)=>{
    const [primaryPrefab,primaryLabel,primaryMaterial,primarySize,primaryPurpose]=primary;
    const food=foodPresentations[i];
    serving.push(
      fixture(`${p}/SERVE/C${i+1}`,primaryLabel,primaryPrefab,[-.82,e,z],
        primaryMaterial,primaryPurpose,{yaw:-PI/2,size:primarySize,
          foodDisplay:{dish:zh,allergenCard:true,batchLabel:true},...primaryExtra}),
      fixture(`${p}/SERVE/C${i+1}-BAY-PLATE`,`${zh} queue-side serving-bay plate`,'PF-ROOM-SIGN',
        [-.36,e+.64,z],bayAccents[i],
        'colour-coded dish and bay number mounted directly on the working fixture',
        {yaw:-PI/2,size:[.72,.28,.04],text:`${i+2} · ${zh}`,collision:'none'}),
      fixture(`${p}/SERVE/C${i+1}-PRICE`,'guard-mounted dish and price display','PF-SCREEN',
        [-.32,e+1.55,z-.12],'M-SCREEN','dish identity, price, batch and allergen status directly on the queue-side face',
        {yaw:-PI/2,size:[.86,.34,.035],text:`${zh} ¥${i+2}`,collision:'none'}),
      fixture(`${p}/SERVE/C${i+1}-FOOD`,food.label,'PF-TRAY-RACK',
        [food.at[0],e+food.at[1],food.at[2]],food.material,food.purpose,
        {yaw:-PI/2,size:food.size,collision:'none',dish:zh,serviceState:'ready'}),
      decor(`${p}/SERVE/C${i+1}-MARK`,'numbered queue-stage floor inlay',[.86,e+.014,z],
        i%2?'M-FABRIC-RED':'M-LAB-BLUE',[.58,.02,.10],
        'architectural floor marker sequencing the tray-to-pickup queue'),
      ...(hood?[fixture(`${p}/SERVE/C${i+1}-HOOD`,'compact vegetable-bay extraction canopy','PF-HOOD',
        [-.82,e+4.42,z],'M-STAINLESS','localized extraction over the staff-controlled live induction range',
        {yaw:PI/2,size:[.90,.52,.86],collision:'none'})]:[]),
    );
    if(sidecar){
      const [sidePrefab,sideLabel,sideMaterial,sideSize,offset,sidePurpose]=sidecar;
      serving.push(fixture(`${p}/SERVE/C${i+1}-SIDECAR`,sideLabel,sidePrefab,[-.82,e,z+offset],
        sideMaterial,sidePurpose,{yaw:-PI/2,size:sideSize}));
    }
  });
  serving.push(
    fixture(`${p}/SERVE/RICE-HOLD`,'tall insulated rice holding cabinet','PF-FRIDGE',[-.77,e,-6.76],
      'M-STAINLESS','full-height composed heated holding appliance with monitored controls at the working south end of the rice bay',
      {yaw:0,size:[.84,2.40,.42],serviceState:'hot-hold',temperatureC:65}),
    fixture(`${p}/SERVE/MENU-SOUTH`,'rice and greens service menu','PF-SCREEN',[-2.57,e+3.12,-5.18],
      'M-SCREEN','large populated menu board above the rice and live-greens bays',
      {yaw:-PI/2,size:[3.55,.68,.05],text:'米饭 ¥2 · 青菜 ¥3',collision:'none'}),
    fixture(`${p}/SERVE/MENU-NORTH`,'tofu and braise service menu','PF-SCREEN',[-2.57,e+3.12,-.48],
      'M-SCREEN','large populated menu board above the tofu and braise bays',
      {yaw:-PI/2,size:[3.55,.68,.05],text:'豆腐 ¥4 · 红烧肉 ¥5',collision:'none'}),
    fixture(`${p}/SERVE/CASH`,'compact cashier station','PF-CASHIER',[-.96,e,2.40],
      'M-STAINLESS','student-card and mobile payment',{yaw:-PI/2,size:[1.0,1.05,.78]}),
    plate(`${p}/SERVE/CASH-SIGN`,'cashier sign',[-2.57,e+2.25,2.40],'6 · 收银 · CASHIER',
      'checkout identity',{yaw:-PI/2,size:[1.35,.31,.05]}),
    fixture(`${p}/SERVE/PICKUP`,'meal pickup counter','PF-SERVING-COUNTER',[-.96,e,5.15],
      'M-STAINLESS','completed-meal pickup beside the interaction anchor',{yaw:-PI/2,size:[1.2,1.15,.86]}),
    plate(`${p}/SERVE/PICKUP-SIGN`,'meal pickup sign',[-2.57,e+2.25,5.15],
      '7 · 取餐 · PICK UP','meal pickup identity',{yaw:-PI/2,size:[1.35,.31,.05]}),
    plate(`${p}/SERVE/STAFF-SIGN`,'servery staff-zone sign',[-2.57,e+3.15,-7.95],
      '员工入口 · STAFF','staff entry at the south end of the line',{yaw:-PI/2,size:[1.35,.3,.05]}),
    fixture(`${p}/SERVE/TODAY`,'today menu and service-hours screen','PF-SCREEN',[-1.35,e+2.85,-8.82],
      'M-SCREEN','daily menu, breakfast/lunch hours and campus-card notice',
      {yaw:PI,size:[2.15,.78,.05],text:'早餐 7–9 · 午餐 11–13:30',collision:'none'}),
    fixture(`${p}/SERVE/ALLERGEN`,'ingredient and allergen information screen','PF-SCREEN',[-1.35,e+2.75,5.82],
      'M-SCREEN','ingredient, vegetarian and common-allergen information before pickup',
      {yaw:0,size:[2.10,.66,.05],text:'素食 · 花生 · 牛奶 · 鸡蛋',collision:'none'}),
    fixture(`${p}/SERVE/PICKUP-UTENSILS`,'pickup utensil and napkin bank','PF-TRAY-RACK',
      [-.55,e+1.18,5.15],'M-STAINLESS',
      'composed multi-tier chopstick, spoon, napkin and condiment bank on the pickup counter',
      {yaw:-PI/2,size:[.64,.30,.38],collision:'none'}),
    decor(`${p}/SERVE/QUEUE-LINE`,'continuous queue direction line',[1.05,e+.014,-1.05],
      'M-SAFETY-YELLOW',[.08,.02,13.70],'single unobstructed guide from trays to pickup'),
    fixture(`${p}/SERVE/L1`,'south serving-line light','PF-CEILING-LIGHT',[-.96,e+5.34,-4.65],
      'M-WALL-WHITE','bright food presentation',{temperatureK:4000,size:[1.55,.06,.26]}),
    fixture(`${p}/SERVE/L2`,'north serving-line light','PF-CEILING-LIGHT',[-.96,e+5.34,2.35],
      'M-WALL-WHITE','cashier and pickup illumination',{temperatureK:4000,size:[1.55,.06,.26]}),
    fixture(`${p}/SERVE/L3`,'pickup task light','PF-CEILING-LIGHT',[-.96,e+5.34,5.12],
      'M-WALL-WHITE','bright final pickup and allergen-check illumination',
      {temperatureK:4100,size:[1.35,.06,.26]}),
  );

  const returns=[
    fixture(`${p}/RETURN/BELT`,'dish-return conveyor','PF-DISH-RETURN',[-.96,e,7.05],
      'M-STAINLESS','receive used trays before the dirty-side transfer',{yaw:PI/2,size:[1.9,1.15,.82]}),
    plate(`${p}/RETURN/SIGN`,'dish-return sign',[-2.57,e+2.35,7.05],
      '餐具回收 · DISH RETURN','return direction',{yaw:-PI/2,size:[2.0,.36,.05]}),
    fixture(`${p}/RETURN/BIN1`,'food-waste scrape bin','PF-BIN',[-.05,e,8.55],
      'M-SAFETY-YELLOW','food waste',{stream:'food waste'}),
    fixture(`${p}/RETURN/BIN2`,'other-waste bin','PF-BIN',[.45,e,8.55],
      'M-STEEL-DARK','other waste',{stream:'other waste'}),
    fixture(`${p}/RETURN/BIN3`,'recycling bin','PF-BIN',[.95,e,8.55],
      'M-LAB-BLUE','recyclable waste',{stream:'recycling'}),
    fixture(`${p}/RETURN/SORT-SCREEN`,'waste-sorting guidance screen','PF-SCREEN',[.28,e+2.30,8.82],
      'M-SCREEN','food waste, recycling and other-waste guidance before diners reach the bins',
      {yaw:0,size:[1.55,.62,.05],text:'厨余 · 可回收 · 其他  SORT WASTE',collision:'none'}),
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
    decor(`${p}/KITCHEN/HOT-SPLASH`,'hot-line tiled splash wall',[-6.50,e+1.18,.30],
      'M-TILE-LIGHT',[.05,1.72,3.35],'continuous washable architectural wall lining behind both wok ranges'),
    decor(`${p}/KITCHEN/PREP-SPLASH`,'clean-preparation tiled splash wall',[-2.70,e+1.18,1.38],
      'M-TILE-LIGHT',[.05,1.72,3.35],'continuous washable architectural wall lining behind colour-separated preparation'),
    plate(`${p}/KITCHEN/HOT-SIGN`,'hot-line sign',[-6.50,e+2.1,.35],
      '热厨 · HOT LINE','identify the contiguous wok line',{yaw:PI/2,size:[1.75,.32,.05]}),
    plate(`${p}/KITCHEN/PREP-SIGN`,'clean-preparation sign',[-2.70,e+2.1,1.35],
      '净菜 / 生食 · PREP','identify separated preparation tables',{yaw:-PI/2,size:[1.85,.32,.05]}),
    plate(`${p}/KITCHEN/HAND-SIGN`,'staff hand-hygiene sign',[-5.20,e+1.92,-1.46],
      '洗手消毒 · WASH HANDS','hand hygiene before staff enter clean preparation',{yaw:0,size:[1.55,.30,.05]}),
    fixture(`${p}/KITCHEN/PRODUCTION`,'batch and temperature-control screen','PF-SCREEN',[-3.65,e+2.30,4.62],
      'M-SCREEN','cooking batches, holding temperatures and clean-pass timing',
      {yaw:PI,size:[1.65,.68,.05],text:'批次 · 中心温度 · 出餐时间',collision:'none'}),
    fixture(`${p}/KITCHEN/CLOCK`,'kitchen production clock','PF-CLOCK',[-6.50,e+2.72,3.72],
      'M-WALL-WHITE','batch timing and service coordination',{yaw:PI/2,collision:'none'}),
    fixture(`${p}/KITCHEN/L1`,'hot-line ceiling panel','PF-CEILING-LIGHT',[-5.45,e+5.34,.35],
      'M-WALL-WHITE','high-rendering hot-line task lighting',{temperatureK:4300,size:[1.75,.06,.32]}),
    fixture(`${p}/KITCHEN/L2`,'clean-preparation ceiling panel','PF-CEILING-LIGHT',[-3.50,e+5.34,2.05],
      'M-WALL-WHITE','colour-accurate vegetable and protein preparation lighting',
      {temperatureK:4200,size:[1.55,.06,.32]}),
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
    decor(`${p}/DIRTY/SPLASH`,'pre-rinse tiled splash wall',[-2.70,e+1.22,5.55],
      'M-TILE-LIGHT',[.05,1.82,1.85],'continuous washable architectural wall lining behind pre-rinse'),
    plate(`${p}/DIRTY/SIGN`,'wash-up room sign',[-6.50,e+2.15,7.25],
      '洗消间 · WASH UP','identify the dirty wash-and-clean rack sequence',{yaw:PI/2,size:[1.65,.32,.05]}),
    fixture(`${p}/DIRTY/LOG`,'wash-and-sanitise verification screen','PF-SCREEN',[-4.10,e+2.30,8.82],
      'M-SCREEN','wash temperature, sanitiser concentration and rack-release log',
      {yaw:PI,size:[1.75,.62,.05],text:'清洗 · 消毒 · 放行  WASH LOG',collision:'none'}),
    fixture(`${p}/DIRTY/L1`,'pre-rinse ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,5.70],
      'M-WALL-WHITE','bright scrape and pre-rinse task lighting',{temperatureK:4300,size:[1.65,.06,.32]}),
    fixture(`${p}/DIRTY/L2`,'clean-rack ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,8.00],
      'M-WALL-WHITE','clean-rack inspection lighting',{temperatureK:4200,size:[1.65,.06,.32]}),
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
    fixture(`${p}/STORE/TEMP`,'cold-chain temperature screen','PF-SCREEN',[-3.70,e+2.25,-8.82],
      'M-SCREEN','live refrigerator/freezer temperatures and stock-rotation reminder',
      {yaw:0,size:[1.55,.60,.05],text:'冷藏 4°C · 冷冻 −18°C · 先进先出',collision:'none'}),
    fixture(`${p}/STORE/L1`,'dry-store ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,-7.55],
      'M-WALL-WHITE','dry-stock label and date inspection lighting',{temperatureK:4000,size:[1.55,.06,.30]}),
    fixture(`${p}/STORE/L2`,'cold-store ceiling panel','PF-CEILING-LIGHT',[-4.55,e+5.34,-5.55],
      'M-WALL-WHITE','cold-chain thermometer and seal inspection lighting',{temperatureK:4100,size:[1.40,.06,.30]}),
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
    fixture(`${p}/CHANGE/HOOKS`,'staff coat-hook rail','PF-COAT-RAIL',[-2.70,e+1.55,-3.15],
      'M-OAK','aprons and clean work coats',{yaw:-PI/2,size:[.90,.38,.12],collision:'none'}),
    decor(`${p}/CHANGE/MAT`,'changing-room floor mat',[-3.32,e+.014,-2.65],
      'M-RUBBER',[1.05,.02,1.25],'dry footwear-changing zone'),
    plate(`${p}/CHANGE/SIGN`,'staff changing sign',[-2.70,e+2.15,-3.15],
      '员工更衣 · STAFF','identify the clean staff transition',{yaw:-PI/2,size:[1.45,.3,.05]}),
    fixture(`${p}/CHANGE/L1`,'changing-room ceiling panel','PF-CEILING-LIGHT',[-3.35,e+5.34,-2.75],
      'M-WALL-WHITE','staff changing illumination',{temperatureK:3900,size:[1.0,.06,.28]}),
  ];
  const rooms=[
    room(`${p}/DINING`,'学生餐厅',diningB,'canteen',[
      // The ENTRY circulation plate already cuts the full 4.20 m facade opening and the building
      // portal supplies its glazed exterior door.  A second 4.20 m hinged room leaf created the
      // camera-height slab that hid the arriving player, so it is intentionally not duplicated.
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
    design:'A working 32-place campus canteen with a recognisable daily rhythm: eight correctly oriented four-place tables sit on a measured 1.20 m aisle grid beneath warm pendants and washable acoustic rafts; two tables reserve wheelchair bays; deep composed window bays follow the east facade; and restrained brick, oak, blue textile and bilingual daily-service graphics give the hall an authentic student identity. A numbered 1.50 m south-to-north queue progresses from trays through four unmistakable composed silhouettes—a guarded oak steam-rice counter, open stainless induction range beneath a hood, tall monitored tofu refrigerator with a pale pass, and open-leg dark-oak braise portioning table—to payment and pickup, while the north return feeds a physically separate dirty wash room. The west back-of-house maintains continuous storage, changing, clean-prep, hot-line and wash-up routes under colour-accurate task lighting, hygiene signage and live production/temperature boards.',
    interiorCharacter:{
      publicPalette:['sealed oak tables','muted blue/red upholstery','brick identity wall','brass warm-light accents'],
      facadeWindows:{bays:4,assembly:['safety glazing','deep washable jambs','head reveal','sealed oak sill']},
      lighting:{dining:'3000 K pendants plus 3400 K integrated raft lighting',servery:'3200 K food-display pendants plus 4000–4100 K task panels',backOfHouse:'4000–4300 K washable inspection/task panels'},
      servingBaySilhouettes:['guarded oak steam-rice counter','open induction range and extraction hood','tall monitored tofu refrigerator with pale guarded pass','open-leg dark-oak braise portioning table'],
      serviceGraphics:['daily menu and hours','numbered food-bay sequence','guard-mounted dish/price/batch labels','allergen legend','clean-plate campaign','waste-sorting guide'],
      livedInDetails:['filtered water refill','threshold plant','daily soup notice','batch/temperature boards','sanitation release log'],
    },
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
    ],shared,{occupancy:52,visualReview:{
      entries:[{suffix:'entry',portalId:'B03/PUBLIC',focusRoomId:`${p}/DINING`,cameraZoneId:`${p}/ENTRY`,
        focusAt:{x:6.10,z:-4.30,yaw:35*PI/36},body:'hidden',
        focusFixtureIds:[`${p}/DINING/CLEAN-PLATE`]}],
      programme:{roomId:`${p}/DINING`,at:{x:1.70,z:-5.30,yaw:-71*PI/180},
        focusFixtureIds:[`${p}/SERVE/C2`,`${p}/SERVE/C3`]},
    }})],
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
    fixture(`${prefix}/BENCH`,'dry changing bench','PF-BENCH',[x1-1.45,e,z1-.50],'M-OAK','dry changing and towel bench',
      {yaw:PI,facing:'south',size:[1.35,.72,.48]}),
    fixture(`${prefix}/LOCK`,'toiletry lockers','PF-LOCKERS',[x0+.35,e,z1-.95],'M-STEEL','resident wash kits',{yaw:PI/2,size:[1.20,1.75,.42]}),
    fixture(`${prefix}/WATER`,'recessed drinking-water station','PF-WATER',[x1-1.75,e,z0+1.55],'M-STEEL','resident hydration inside the washroom niche'),
    fixture(`${prefix}/MAT`,'wet-room anti-slip field','PF-WALL-RUN',[(x0+x1)/2,e+.018,(z0+z1)/2],'M-RUBBER','anti-slip wet-room floor inset',{size:[4.35,.025,2.85],collision:'none'}),
    fixture(`${prefix}/EX`,'extract fan','PF-AC',[x1-.45,e+2.4,z1-.18],'M-WALL-WHITE','wet-room extraction',{yaw:PI}),
    fixture(`${prefix}/LIGHT1`,'wet-room ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.65,z0+1.0],'M-WALL-WHITE','wet-room lighting',{temperatureK:4000,size:[.65,.06,.65]}),
    fixture(`${prefix}/LIGHT2`,'wet-room ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.65,z1-1.0],'M-WALL-WHITE','wet-room lighting',{temperatureK:4000,size:[.65,.06,.65]}),
  ];
}

function dormAccent(level) {
  return ['M-FABRIC-BLUE','M-WALL-GREEN','M-FABRIC-RED','M-OAK','M-BRASS','M-LAB-BLUE'][(level-1)%6];
}

function dormTextile(level) {
  return ['M-FABRIC-BLUE','M-FABRIC-SAGE','M-FABRIC-RED','M-FABRIC-SAND','M-FABRIC-BLUE','M-FABRIC-SAGE'][(level-1)%6];
}

function dormCorridorSet(prefix,e,level) {
  const identity=dormAccent(level),runnerMaterial=level===2||level===6?'M-FABRIC-BLUE':
    level===4?'M-RUBBER':dormTextile(level),floorStory=[
    '门厅、邮件与公共客厅 · ARRIVAL & COMMONS',
    '安静学习与新生宿舍 · QUIET STUDY',
    '社群、音乐与宿舍生活 · COMMUNITY',
    '阅读、植物与宿舍生活 · READING',
    '高年级交流与宿舍生活 · SENIOR COMMONS',
    '洗衣、自习与顶层宿舍 · LAUNDRY & STUDY',
  ][level-1],arrivalCopy=[
    '值班台 · 邮件 · 公共客厅',
    '安静时段 · 学习预约',
    '社群活动 · 音乐预约',
    '读书会 · 植物养护',
    '实习信息 · 毕业事务',
    '洗衣状态 · 顶层自习',
  ][level-1],arrivalNorth=level===1||level===2||level===4||level===6,
    // PF-SCREEN and PF-ROOM-SIGN present on local -Z.  A north end wall therefore faces the
    // corridor at yaw 0, while a south end wall faces it at PI; the previous values exposed the
    // blank backs of every authored residence-arrival display.
    arrivalZ=arrivalNorth?7.535:-7.535,arrivalYaw=arrivalNorth?0:PI,
    arrivalFaceZ=arrivalZ+(arrivalNorth?-.026:.026),
    // Keep the side notice on the solid wall segment behind the authored long-lens arrival
    // camera.  At z=0 it sat only about a metre in front of the real camera (the review `at`
    // point is the orbit focus, not the lens), so every floor was framed by a cropped blue card.
    noticeZ=arrivalNorth?-3.15:3.15,
    // These spans deliberately terminate before every dormitory, lift, washroom and protected-
    // stair opening.  A single continuous chest-height strip read as a rail through the doors.
    westBandSpans=[[-7.22,-6.35],[-5.15,-2.50],[-1.20,1.35],[2.75,4.05],[5.55,7.22]],
    eastBandSpans=[[-7.22,-4.85],[-3.95,-2.50],[-1.20,1.35],[2.75,4.40],[5.60,7.22]],
    segmentedBands=(side,x,spans)=>spans.map(([z0,z1],i)=>fixture(
      `${prefix}/COR/BAND-${side}-${pad(i+1)}`,`${side==='W'?'west':'east'} recessed wayfinding skirting segment`,
      'PF-WALL-RUN',[x,e+.72,(z0+z1)/2],identity,
      'thin floor identity inset with a clear termination before every real doorway',
      {size:[.022,.065,z1-z0],collision:'none',segmentedAtDoorways:true}));
  return [
    // One opaque body owns the runner.  The former pale sage/sand top over a separate dark
    // underlay produced a glassy double surface whose grout-like interference read through the
    // weave.  A single 24 mm matte inset sits fully above the 6 mm floor finish and cannot blend
    // with it; F2/F6 use dense blue textile and F4 uses genuinely opaque charcoal rubber.
    fixture(`${prefix}/COR/RUNNER`,'single-body matte acoustic corridor runner','PF-WALL-RUN',
      [0,e+.020,0],runnerMaterial,
      'one opaque recessed residential runner with no translucent or overlapping source layer',
      {size:[.92,.024,14.10],collision:'none',flushWithFinish:true,opaque:true}),
    ...segmentedBands('W',-1.105,westBandSpans),
    ...segmentedBands('E',1.105,eastBandSpans),
    fixture(`${prefix}/COR/FLOOR-SIGN`,'large floor marker','PF-ROOM-SIGN',[1.11,e+1.72,6.72],'M-SCREEN','floor identity',{yaw:PI/2,text:`${level}层 · FLOOR ${level}`,size:[.72,.34,.04]}),
    fixture(`${prefix}/COR/NOTICE`,'floor-specific resident notice board','PF-SCREEN',[-1.11,e+1.48,noticeZ],'M-SCREEN','compact floor programme display on a solid wall bay behind the authored arrival lens',{yaw:-PI/2,text:floorStory,size:[.92,.52,.035],collision:'none',hudSafe:true}),
    fixture(`${prefix}/COR/ART`,'corridor-end floor artwork','PF-SCREEN',[.965,e+1.45,6.72],'M-SCREEN','floor identity without narrowing the corridor',{yaw:PI/2,text:`宿舍 · ${level}层`,size:[.88,.62,.035],collision:'none'}),
    fixture(`${prefix}/COR/ARRIVAL-BACKDROP`,'floor-specific residential arrival backdrop','PF-WALL-RUN',
      [0,e+1.48,arrivalZ],identity,'panelized end-wall identity composed for the authored arrival direction',
      {size:[1.78,1.42,.035],collision:'none'}),
    fixture(`${prefix}/COR/ARRIVAL-SCREEN`,'floor-specific resident programme display','PF-SCREEN',
      [0,e+1.52,arrivalFaceZ],'M-SCREEN','a populated focal display within the persistent HUD-safe view',
      {yaw:arrivalYaw,text:arrivalCopy,size:[1.42,.52,.04],collision:'none',hudSafe:true}),
    fixture(`${prefix}/COR/ARRIVAL-FLOOR`,'arrival floor-number plate','PF-ROOM-SIGN',
      [-.50,e+2.02,arrivalFaceZ],'M-SCREEN','large floor number below the persistent top HUD',
      {yaw:arrivalYaw,text:`${level}F`,size:[.48,.24,.04],collision:'none',hudSafe:true}),
    fixture(`${prefix}/COR/ARRIVAL-STATUS`,'resident arrival status strip','PF-ROOM-SIGN',
      [.28,e+1.10,arrivalFaceZ],'M-SCREEN','short readable secondary status completing the end-wall composition',
      {yaw:arrivalYaw,text:level===6?'WASH · STUDY':'QUIET 22:30',size:[.82,.22,.04],collision:'none',hudSafe:true}),
    fixture(`${prefix}/COR/ARRIVAL-DATUM`,'lower arrival display datum','PF-WALL-RUN',
      [0,e+.78,arrivalFaceZ],dormTextile(level),'wall-mounted lower edge completing the arrival vignette',
      {size:[1.18,.07,.10],collision:'none'}),
    ...lightGrid(`${prefix}/COR`,e,[[0,-5.8],[0,-2.0],[0,2.0],[0,5.8]],3400),
  ];
}

function dormRemoteStair(level,e,p) {
  return room(`${p}/STAIR-SE`,'东南侧安全楼梯',[1.2,6.1,-7.6,-3.9],'service',[
    doorway(`${p}/STAIR-SE/TO-COR`,'west',[1.2,e,-4.40],.90,`${p}/CORRIDOR`,
      {operation:'self-closing',ratingMinutes:60,swing:'into-stair',hinge:'east'}),
  ],[
    fixture(`${p}/STAIR-SE/FIX`,'remote south-east protected stair','PF-STAIR',[3.65,e,-6.35],
      'M-TERRAZZO','independent 1.08 m dog-leg egress stair in a full former dormitory bay',
      {yaw:PI/2,size:[2.5,2.9,4.6],protected:true,remoteFrom:[-4.68,6.5]}),
    fixture(`${p}/STAIR-SE/ACCENT`,'south-east stair landing identity wall','PF-WALL-RUN',
      [1.255,e+1.42,-4.40],dormAccent(level),'protected-stair identity at the corridor approach',
      {size:[.035,2.45,1.55],collision:'none'}),
    fixture(`${p}/STAIR-SE/SIGN`,'south-east protected-stair floor sign','PF-ROOM-SIGN',
      [1.23,e+1.72,-4.40],'M-SCREEN','remote egress and floor identity',
      {yaw:PI/2,size:[.82,.34,.04],text:`东南楼梯 · ${level}层`}),
    fixture(`${p}/STAIR-SE/EXIT-SIGN`,'local protected-stair exit sign','PF-EXIT-SIGN',
      [1.255,e+2.35,-4.60],'M-SCREEN','marked return from the south-east stair to the residential corridor',
      {yaw:PI/2,text:'出口 EXIT'}),
    fixture(`${p}/STAIR-SE/EML`,'south-east stair emergency light','PF-EMERGENCY-LIGHT',
      [1.24,e+2.48,-5.20],'M-WALL-WHITE','battery-backed protected-stair lighting',{yaw:PI/2}),
    fixture(`${p}/STAIR-SE/LIGHT`,'south-east stair landing light','PF-CEILING-LIGHT',
      [2.00,e+2.64,-4.42],'M-WALL-WHITE','stair entry and landing lighting',
      {temperatureK:3500,size:[.78,.06,.48]}),
  ],{protectedStair:true,stairAnchor:[3.65,-6.35],remoteSeparation:15.31});
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
      fixture(`${p}/STAIR/ACCENT`,'stair landing color wall','PF-WALL-RUN',[-3.31,e+1.35,6.5],dormAccent(level),'residential stair identity',{size:[.035,2.35,1.85],collision:'none'}),
      fixture(`${p}/STAIR/EXIT-SIGN`,'local protected-stair exit sign','PF-EXIT-SIGN',[-3.35,e+2.35,4.75],'M-SCREEN','marked return from the north-west stair to the residential corridor',{yaw:-PI/2,text:'出口 EXIT'}),
      fixture(`${p}/STAIR/EML`,'north-west stair emergency light','PF-EMERGENCY-LIGHT',[-4.68,e+2.42,5.30],'M-WALL-WHITE','battery-backed light within the protected stair'),
      fixture(`${p}/STAIR/LIGHT`,'stair landing light','PF-CEILING-LIGHT',[-4.68,e+2.64,5.4],'M-WALL-WHITE','stair entry and landing lighting',{temperatureK:3500,size:[.78,.06,.48]})]),
    room(`${p}/LIFT`,'电梯',[-3.05,-1.2,4.2,7.6],'service',[
      doorway(`${p}/LIFT/TO-STAIR`,'west',[-3.05,e,4.75],1.0,`${p}/STAIR`),
      doorway(`${p}/LIFT/TO-COR`,'east',[-1.2,e,4.75],1.0,`${p}/CORRIDOR`),
    ],[
      fixture(`${p}/LIFT/FIX`,'accessible lift with waiting vestibule','PF-LIFT',[-2.12,e,6.55],'M-STEEL','accessible vertical circulation',{size:[1.55,2.45,1.55],levels:[1,2,3,4,5,6]}),
      fixture(`${p}/LIFT/ELEC`,'recessed floor electrical cabinet','PF-ELECTRICAL-CABINET',[-3.01,e+1.35,6.55],'M-STEEL-DARK','electrical distribution',{yaw:PI/2,size:[.58,1.15,.16],collision:'none'}),
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
      room(`${p}/LOBBY`,'门厅与值班台',west[1],'public',[
        doorway(`${p}/LOBBY/EXT`,'west',[-6.5,e,-1],2.6,'campus',{portal:true}),
        doorway(`${p}/LOBBY/TO-COR`,'east',[-1.2,e,-1.85],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LOBBY/MAT`,'deep entrance mat','PF-WALL-RUN',[-5.25,e+.018,-1],'M-RUBBER','weather-protected arrival',{size:[1.35,.025,1.8],collision:'none'}),
        fixture(`${p}/LOBBY/FEATURE`,'ribbed timber welcome wall','PF-WALL-RUN',[-2.65,e+1.35,-3.655],'M-OAK-DARK','warm residence identity in a lighter panelized bay',{size:[2.38,2.18,.035],collision:'none'}),
        fixture(`${p}/LOBBY/WELCOME`,'welcome-home sign','PF-ROOM-SIGN',[-2.65,e+1.82,-3.63],'M-SCREEN','residence welcome',{yaw:PI,text:'欢迎回家 · WELCOME HOME',size:[1.72,.34,.04]}),
        fixture(`${p}/LOBBY/DESK-MAIN`,'compact staffed residence duty module','PF-SERVICE-COUNTER',[-2.83,e,-3.12],
          'M-OAK','rounded staffed module with integrated terminal, scanner, privacy screen and concealed storage',
          {size:[1.18,.94,.60],text:'值班 · DUTY'}),
        fixture(`${p}/LOBBY/DESK-ACCESS`,'open-leg accessible duty-desk return','PF-MEETING-TABLE',[-1.64,e,-3.12],
          'M-OAK','seated visitor writing and transaction surface with genuine knee clearance',{size:[.74,.74,.54]}),
        fixture(`${p}/LOBBY/DESK-PRIVACY`,'laminated service privacy fin','PF-WALL-RUN',[-2.07,e+.64,-3.12],
          'M-GLASS','transparent privacy division between standing and accessible service modules',
          {size:[.035,.42,.48],collision:'none'}),
        fixture(`${p}/LOBBY/DESK-FRONT`,'duty-module front identity','PF-ROOM-SIGN',[-2.83,e+.53,-2.805],
          'M-SCREEN','short resident-service identity on the staffed module',
          {yaw:PI,text:'值班 · DUTY',size:[.88,.22,.035],collision:'none'}),
        fixture(`${p}/LOBBY/ACCESS-FRONT`,'accessible-return identity','PF-ROOM-SIGN',[-1.64,e+.48,-2.845],
          'M-SCREEN','clearly identifies the lower open-leg accessible position',
          {yaw:PI,text:'无障碍 · ACCESS',size:[.62,.18,.035],collision:'none'}),
        fixture(`${p}/LOBBY/TIMETABLE-BACK`,'woven residence information backing','PF-WALL-RUN',[-5.18,e+1.46,-3.655],
          'M-FABRIC-BLUE','matte acoustic backing that separates the live timetable from pale plaster',
          {size:[1.48,1.10,.035],collision:'none'}),
        fixture(`${p}/LOBBY/TIMETABLE`,'populated residence duty timetable','PF-SCREEN',[-5.18,e+1.46,-3.625],
          'M-SCREEN','today duty hours, parcel collection, repairs and quiet-hours guidance',
          {yaw:PI,text:'值班 14—22 · 邮件 18 · 报修',size:[1.18,.72,.035],collision:'none',hudSafe:true}),
        fixture(`${p}/LOBBY/BENCH`,'upholstered visitor bench','PF-BENCH',[-4.55,e,-3.10],'M-FABRIC-BLUE','resident and visitor waiting',
          {yaw:0,facing:'north',size:[1.50,.84,.58]}),
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
        fixture(`${p}/MAIL/BOARD`,'parcel-status board','PF-SCREEN',[3.6,e+1.55,-.055],'M-SCREEN','collection status and operating hours',{yaw:0,text:'邮件 · PARCEL COLLECTION',size:[1.8,.82,.045]}),
        ...lightGrid(`${p}/MAIL`,e,[[2.5,-1.8],[4.9,-1.8]],3500),
      ]),
      room(`${p}/LOUNGE-W`,'公共客厅',west[2],'dorm',[
        doorway(`${p}/LOUNGE-W/TO-COR`,'east',[-1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LOUNGE-W/RUG`,'woven lounge rug','PF-WALL-RUN',[-4.15,e+.018,2.05],'M-FABRIC-BLUE','defines social seating',{size:[2.75,.025,2.55],collision:'none'}),
        fixture(`${p}/LOUNGE-W/SOFA1`,'west-wall lounge sofa','PF-BENCH',[-5.65,e,1.7],'M-FABRIC-BLUE','resident social seating',
          {yaw:PI/2,facing:'east',size:[1.75,.84,.58]}),
        fixture(`${p}/LOUNGE-W/SOFA2`,'north-wall lounge sofa','PF-BENCH',[-4.05,e,3.48],'M-WALL-GREEN','resident social seating',
          {yaw:PI,facing:'south',size:[1.75,.84,.58]}),
        fixture(`${p}/LOUNGE-W/TABLE`,'low lounge table','PF-MEETING-TABLE',[-4.05,e,2.15],'M-OAK','shared tea and game table',{size:[1.25,.45,.68]}),
        fixture(`${p}/LOUNGE-W/TV`,'notice and television screen','PF-SCREEN',[-1.255,e+1.5,3.4],'M-SCREEN','resident information',{yaw:PI/2,text:'宿舍活动 · COMMONS'}),
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
        fixture(`${p}/LOUNGE-E/BOARD`,'shared planning board','PF-WHITEBOARD',[3.65,e+1.52,3.84],
          'M-WHITEBOARD','magnetic planning surface behind the separately authored live study cards',
          {yaw:0,size:[2.6,1.0,.05]}),
        fixture(`${p}/LOUNGE-E/BOARD-AGENDA`,'quiet-study agenda header','PF-ROOM-SIGN',[3.65,e+1.91,3.79],
          'M-SCREEN','programme header held inside the visible whiteboard field rather than above the camera crop',
          {yaw:0,size:[1.54,.25,.04],text:'自习 · STUDY PLAN',collision:'none',hudSafe:true}),
        ...[-.72,0,.72].map((dx,i)=>fixture(`${p}/LOUNGE-E/BOARD-TASK-${String.fromCharCode(65+i)}`,
          'populated quiet-study planning card','PF-ROOM-SIGN',[3.65+dx,e+1.50,3.77],
          'M-SCREEN','live tutoring, exam and group-booking card layered onto the planning wall',
          {yaw:0,size:[.58,.22,.035],collision:'none',
            text:['18:00 · TUTOR','EXAM · PLAN','GROUP · 4'][i],hudSafe:true})),
        fixture(`${p}/LOUNGE-E/BOARD-STATUS`,'quiet-study availability strip','PF-ROOM-SIGN',[3.65,e+1.20,3.78],
          'M-FABRIC-BLUE','short occupied/available status completing the planning wall below the task cards',
          {yaw:0,size:[1.42,.18,.035],collision:'none',text:'2 DESKS FREE · QUIET',hudSafe:true}),
        fixture(`${p}/LOUNGE-E/PLANT`,'study-room plant','PF-PLANT',[5.6,e,.55],'M-PLANT','quiet greenery'),
        ...lightGrid(`${p}/LOUNGE-E`,e,[[2.4,2.0],[4.8,2.0]],3500),
      ]),
      ...coreRooms(level,e,p),dormRemoteStair(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'},{id:`${p}/ENTRY`,bounds:[-6.5,-1.0,-2.15,.15],clearWidth:2.3,surface:'M-TERRAZZO'}],[...safetySet(p,e,[-3.15,4.4],[-5.8,-1],level,true),...dormCorridorSet(p,e,level)],{occupancy:22,
      visualReview:{
        entries:[{suffix:'entry',portalId:'B04/PUBLIC',focusRoomId:`${p}/LOBBY`,cameraZoneId:`${p}/ENTRY`,
          // This oblique duty-desk composition keeps the resolved eye and focus in the lobby/entry
          // overlap, so the hosted clearWall camera preserves the authored 1.70 m orbit exactly.
          focusAt:{x:-4.08,z:-2.16,yaw:2.80},body:'hidden',
          focusFixtureIds:[`${p}/LOBBY/DESK-MAIN`,`${p}/LOBBY/WELCOME`]}],
        // The separate quiet-study room gives F1 genuine programme evidence instead of a second
        // lobby angle.  Its south-centre lens looks through the desk aisle to a populated planning
        // wall; the west corridor leaf is more than fifty degrees outside the frustum.
        programme:{roomId:`${p}/LOUNGE-E`,at:{x:4.18,z:2.34,yaw:1.06},
          focusFixtureIds:[`${p}/LOUNGE-E/BOARD-AGENDA`,`${p}/LOUNGE-E/BOARD-TASK-B`,`${p}/LOUNGE-E/BOARD-STATUS`]},
      }}));
  }
  // Floors 2–5: six twin rooms each.
  for(let level=2;level<=5;level++) {
    const e=(level-1)*3,p=`B04/F${level}`,rooms=[];
    [...west.map((b,i)=>({b,side:'west',index:i})),...east.map((b,i)=>({b,side:'east',index:i+3}))].forEach((q,i)=>{
      if(i===3)return; // The former south-east twin room is now the remote protected stair.
      const number=level*100+i+1,id=`${p}/${number}`,doorX=q.side==='west'?-1.2:1.2;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[doorX,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(...coreRooms(level,e,p),dormRemoteStair(level,e,p));
    const programmeReview={
      // A slight plan-diagonal puts both the bed and the low desk inside the real 51.6-degree
      // vertical capture frustum.  The former orthogonal view left each desk focal point below
      // the 1024 x 640 image even though its horizontal cone test passed.
      2:{roomId:`${p}/201`,at:{x:-3.12,z:-6.06,yaw:-2.48},
        focusFixtureIds:[`${p}/201/BED1`,`${p}/201/DESK1`]},
      3:{roomId:`${p}/305`,at:{x:3.22,z:-2.16,yaw:2.50},
        focusFixtureIds:[`${p}/305/BED1`,`${p}/305/DESK1`]},
      4:{roomId:`${p}/402`,at:{x:-3.12,z:-2.16,yaw:-2.48},
        focusFixtureIds:[`${p}/402/BED1`,`${p}/402/DESK1`]},
      5:{roomId:`${p}/506`,at:{x:3.22,z:1.74,yaw:2.50},
        focusFixtureIds:[`${p}/506/BED1`,`${p}/506/DESK1`]},
    }[level];
    const entryReview={
      // Alternating end-wall frames keep the requested eye in the corridor semantic room and put
      // every rendered residence/protected-stair leaf outside the exact post-clearWall frustum.
      2:{zoneId:`${p}/CORRIDOR`,at:{x:-.18,z:5.82,yaw:-.26},focusFixtureIds:[`${p}/COR/ARRIVAL-SCREEN`]},
      3:{zoneId:`${p}/CORRIDOR`,at:{x:.18,z:-6.06,yaw:2.80},focusFixtureIds:[`${p}/COR/ARRIVAL-SCREEN`]},
      4:{zoneId:`${p}/CORRIDOR`,at:{x:-.18,z:5.82,yaw:-.26},focusFixtureIds:[`${p}/COR/ARRIVAL-SCREEN`]},
      5:{zoneId:`${p}/CORRIDOR`,at:{x:.18,z:-6.06,yaw:2.80},focusFixtureIds:[`${p}/COR/ARRIVAL-SCREEN`]},
    }[level];
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false),...dormCorridorSet(p,e,level)],{occupancy:26,
      visualReview:{entry:entryReview,programme:programmeReview}}));
  }
  // Floor 6: four rooms, laundry and study lounge.
  {
    const level=6,e=15,p='B04/F6',rooms=[];
    [...west.slice(0,2).map((b,i)=>({b,side:'west',i})),...east.slice(0,2).map((b,i)=>({b,side:'east',i:i+2}))].forEach((q,i)=>{
      if(i===2)return; // Maintain the same full-height south-east protected-stair stack.
      const number=601+i,id=`${p}/${number}`;
      rooms.push(room(id,`${number}双人宿舍`,q.b,'dorm',[doorway(`${id}/D`,q.side==='west'?'east':'west',[q.side==='west'?-1.2:1.2,e,(q.b[2]+q.b[3])/2],.92,`${p}/CORRIDOR`)],furnishDormRoom(id,e,q.b,q.side,false),{beds:2}));
    });
    rooms.push(
      room(`${p}/LAUNDRY`,'洗衣房',west[2],'service',[
        doorway(`${p}/LAUNDRY/TO-COR`,'east',[-1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/LAUNDRY/MAT`,'flush laundry anti-slip floor','PF-WALL-RUN',[-3.65,e+.004,2.05],
          'M-RUBBER','safe laundry work zone recessed into the room finish',{size:[4.35,.006,3.15],collision:'none',flushWithFinish:true}),
        ...[-5.4,-4.5,-3.6].map((x,i)=>fixture(`${p}/LAUNDRY/W${i+1}-BAY`,
          `washer ${i+1} blue-grey service bay`,'PF-WALL-RUN',[x,e+1.12,.235],i===1?'M-FABRIC-SAGE':'M-LAB-BLUE',
          'separate shadow-jointed wall bay that gives each service module a composed architectural surround',
          {size:[.78,2.10,.035],collision:'none'})),
        fixture(`${p}/LAUNDRY/W1`,'washer/dryer A','PF-LAUNDRY',[-5.4,e,.8],'M-STEEL','resident laundry',{yaw:PI}),
        fixture(`${p}/LAUNDRY/W2`,'washer/dryer B','PF-LAUNDRY',[-4.5,e,.8],'M-STEEL','resident laundry',{yaw:PI}),
        fixture(`${p}/LAUNDRY/W3`,'washer/dryer C','PF-LAUNDRY',[-3.6,e,.8],'M-STEEL','resident laundry',{yaw:PI}),
        ...[-5.4,-4.5,-3.6].map((x,i)=>fixture(`${p}/LAUNDRY/W${i+1}-LABEL`,
          `washer ${i+1} availability plate`,'PF-ROOM-SIGN',[x,e+1.48,1.175],'M-SCREEN',
          'short machine number and live state on the appliance face',
          {yaw:0,text:`0${i+1} · ${i===1?'18 MIN':'可用'}`,size:[.48,.17,.03],collision:'none',hudSafe:true})),
        fixture(`${p}/LAUNDRY/SINK`,'laundry sink','PF-SINK-DOUBLE',[-2.1,e,.65],'M-STAINLESS','hand washing laundry',{size:[.9,.92,.65]}),
        fixture(`${p}/LAUNDRY/TABLE`,'north-wall folding and sorting table','PF-PREP-TABLE',[-3.75,e,3.25],
          'M-STAINLESS','wide folding workflow visible across the room while preserving the entrance and machine-view aisle',
          {size:[1.30,.90,.65]}),
        fixture(`${p}/LAUNDRY/FOLD-IN`,'incoming laundry basket','PF-BIN',[-4.08,e+.90,3.25],
          'M-FABRIC-BLUE','shallow composed basket for clean items arriving at the folding table',
          {size:[.34,.12,.28],collision:'none'}),
        fixture(`${p}/LAUNDRY/FOLD-OUT`,'folded laundry basket','PF-BIN',[-3.42,e+.90,3.25],
          'M-FABRIC-SAGE','shallow composed basket for sorted items ready to collect',
          {size:[.34,.12,.28],collision:'none'}),
        fixture(`${p}/LAUNDRY/FOLD-LABEL`,'folding workflow label','PF-ROOM-SIGN',[-3.75,e+.68,2.915],
          'M-SCREEN','short visible fold, sort and collect instruction on the table front',
          {yaw:0,size:[.92,.18,.035],collision:'none',text:'FOLD · SORT · COLLECT',hudSafe:true}),
        fixture(`${p}/LAUNDRY/LOCK`,'laundry basket lockers','PF-LOCKERS',[-5.55,e,3.3],'M-FABRIC-BLUE','short-term laundry storage',{yaw:PI/2,size:[1.0,1.75,.45]}),
        fixture(`${p}/LAUNDRY/BENCH`,'laundry waiting bench','PF-BENCH',[-2.15,e,3.35],'M-OAK','wait while preserving the entrance and central machine-view aisle',
          {yaw:PI,facing:'south',size:[1.5,.84,.58]}),
        fixture(`${p}/LAUNDRY/STATUS-BACK`,'laundry status acoustic backing','PF-WALL-RUN',[-6.055,e+1.78,1.72],
          'M-OAK-DARK','deep west-wall status surround facing the wide room camera below the persistent HUD',
          {size:[.035,.86,1.95],collision:'none'}),
        fixture(`${p}/LAUNDRY/STATUS`,'live laundry status display','PF-SCREEN',[-6.015,e+1.78,1.72],
          'M-SCREEN','machine availability, cycle time and quiet-hours reminders visible with the full work room',
          {yaw:-PI/2,text:'01 可用 · 02 18 MIN · 03 可用',size:[1.58,.50,.04],collision:'none',hudSafe:true}),
        ...lightGrid(`${p}/LAUNDRY`,e,[[-4.8,2.0],[-2.6,2.0]],3500),
      ]),
      room(`${p}/STUDY`,'顶层自习室',east[2],'dorm',[
        doorway(`${p}/STUDY/TO-COR`,'west',[1.2,e,2.05],1.2,`${p}/CORRIDOR`),
      ],[
        fixture(`${p}/STUDY/RUG`,'top-floor study rug','PF-WALL-RUN',[3.65,e+.018,2.05],'M-FABRIC-BLUE','acoustic study zone',{size:[4.25,.025,3.1],collision:'none'}),
        ...Array.from({length:6},(_,i)=>fixture(`${p}/STUDY/D${i+1}`,'study desk','PF-DORM-DESK',
          [3.0+(i%2)*1.8,e,.75+Math.floor(i/2)*1.30],'M-WOOD-DESK','quiet study with measured chair clearance',{yaw:Math.floor(i/2)===2?PI:0})),
        fixture(`${p}/STUDY/BOARD`,'top-floor planning wall','PF-WHITEBOARD',[3.65,e+1.55,3.84],'M-WHITEBOARD','exam schedules and tutoring',{yaw:0,size:[2.8,1.05,.05]}),
        fixture(`${p}/STUDY/BOOK`,'top-floor reference shelf','PF-BOOKCASE',[5.72,e,3.22],'M-OAK-DARK','reference books',{yaw:-PI/2}),
        fixture(`${p}/STUDY/PLANT1`,'study plant','PF-PLANT',[1.65,e,3.3],'M-PLANT','quiet greenery'),
        ...lightGrid(`${p}/STUDY`,e,[[2.4,2.0],[4.8,2.0]],3500),
      ]),
      ...coreRooms(level,e,p),dormRemoteStair(level,e,p),
    );
    floors.push(floor(level,e,3.0,rooms,[{id:`${p}/CORRIDOR`,bounds:[-1.0,1.0,-7.6,7.6],clearWidth:2.0,surface:'M-VINYL'}],[...safetySet(p,e,[-3.15,4.4],[0,3.8],level,false),...dormCorridorSet(p,e,level)],{occupancy:22,
      visualReview:{
        entry:{zoneId:`${p}/CORRIDOR`,at:{x:-.18,z:5.82,yaw:-.26},
          focusFixtureIds:[`${p}/COR/ARRIVAL-SCREEN`]},
        // A shallow north-west bias keeps the west-wall status central while retaining the south
        // machine bank and the north folding/basket workflow as readable side contexts.  The fold
        // label is used as the authored focal target because it remains visible on the table front
        // at the wider room-section distance instead of pulling the camera toward the tabletop.
        programme:{roomId:`${p}/LAUNDRY`,at:{x:-4.44,z:2.22,yaw:-1.82},
          focusFixtureIds:[`${p}/LAUNDRY/STATUS`,`${p}/LAUNDRY/W2`,`${p}/LAUNDRY/FOLD-LABEL`]},
      }}));
  }
  return {
    id:'B04',label:'学生宿舍',status:'new-interior',centreCampus:[36.5,-1],localBounds:[-6.5,6.5,-8,8],
    exteriorFootprint:{x0:30,x1:43,z0:-9,z1:7},floors:6,floorHeight:3.0,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'-1 + localZ'},
    portals:[{id:'B04/PUBLIC',campusAt:[30,-2],campusReturn:[27.4,-2,PI/2],localSpawn:[-5.2,0,-1,PI/2],placeKey:'campus_dorm_f1'}],
    facadeAlignment:{
      westWindows:{localX:-6.5,localZ:[-6,-3,0,3,6],levels:[2,3,4,5,6]},
      eastServiceWindows:{localX:6.5,localZ:[-6.2,-3,.2,3.4,6.6],levels:[2,3,4,5,6]},
      groundAccessibleRoom:{exterior:'intentionally opaque west plinth; no false interior window'},
      entrance:{side:'west',localAt:[-6.5,-1],width:2.6}},
    design:'Six-floor, 48-bed student residence conceived as a warm lived-in home: upholstered blue headwalls, facade-aligned curtained windows in every upper twin room, layered bedside lighting, rugs and pinboards; an accessible ground-floor room whose interior honestly reflects the opaque masonry plinth; a timber-and-plant arrival lobby; continuous acoustic corridor runners and floor-color bands; properly furnished lounges, parcel room, washrooms, lift lobbies and top-floor laundry/study club. Life safety takes precedence over the former 60-bed target: the south-east twin bay is now a full-height, 1.08 m protected dog-leg stair, giving every level two independent 60-minute stairs whose anchors are 15.31 m apart.',
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
  const z=north?z1-.055:z0+.055,inside=north?-.026:.026,yaw=north?0:PI;
  const count=width>5?2:1,paneW=count===2?(width-.85)/2:width-.68;
  const xs=count===2?[cx-paneW/2-.10,cx+paneW/2+.10]:[cx],out=[];
  xs.forEach((x,i)=>out.push(
    fixture(`${prefix}/DAYLIGHT${i+1}`,'civic-office daylight panel','PF-SCREEN',[x,e+1.70,z],'M-SCREEN','campus daylight and civic outlook',{yaw,size:[paneW,1.18,.025],collision:'none'}),
    fixture(`${prefix}/GLASS${i+1}`,'laminated window face','PF-WALL-RUN',[x,e+1.70,z+inside],'M-GLASS','safe office glazing',{size:[paneW,1.18,.025],collision:'none'}),
  ));
  const edgeL=xs[0]-paneW/2,edgeR=xs[xs.length-1]+paneW/2;
  out.push(
    fixture(`${prefix}/WINDOW-SILL`,'oak display sill','PF-WALL-RUN',[cx,e+1.065,z+inside*1.7],'M-OAK','window ledge for civic objects',{size:[width-.36,.09,.14],collision:'none'}),
    fixture(`${prefix}/WINDOW-HEAD`,'dark-oak roller-blind pocket','PF-WALL-RUN',[cx,e+2.34,z+inside*1.7],'M-OAK-DARK','conceals the continuous daylight-control blind',{size:[width-.36,.075,.08],collision:'none'}),
    fixture(`${prefix}/WINDOW-JAMB-L`,'left plaster window jamb','PF-WALL-RUN',[edgeL,e+1.70,z+inside*1.25],'M-WALL-WARM','deep architectural window reveal',{size:[.07,1.28,.075],collision:'none'}),
    fixture(`${prefix}/WINDOW-JAMB-R`,'right plaster window jamb','PF-WALL-RUN',[edgeR,e+1.70,z+inside*1.25],'M-WALL-WARM','deep architectural window reveal',{size:[.07,1.28,.075],collision:'none'}),
    fixture(`${prefix}/BLIND-TRACK`,'slim brass blind pull track','PF-WALL-RUN',[cx,e+2.395,z+inside*1.82],'M-BRASS','restrained civic metal detail at the window head',{size:[width-.48,.025,.035],collision:'none'}),
  );
  if(count===2)out.push(fixture(`${prefix}/WINDOW-MULLION`,'powder-coated centre mullion','PF-WALL-RUN',
    [cx,e+1.70,z+inside*1.25],'M-STEEL-DARK','real architectural window framing between the two daylight panes',{size:[.07,1.28,.075],collision:'none'}));
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
    fixture(`${prefix}/WAIT1`,'service waiting bank A','PF-WAIT-CHAIRS',[cx,e,nearZ],'M-FABRIC-BLUE','three accessible-adjacent waiting seats',{yaw:south?PI:0,facing:south?'south':'north',size:[1.62,.84,.62]}),
    fixture(`${prefix}/WAIT2`,'service waiting bank B','PF-WAIT-CHAIRS',[cx,e,farZ],'M-FABRIC-BLUE','three waiting seats',{yaw:south?PI:0,facing:south?'south':'north',size:[1.62,.84,.62]}),
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
    fixture(`${prefix}/WAIT`,'upholstered reception waiting bank','PF-WAIT-CHAIRS',[x0+.55,e,-3.15],'M-FABRIC-BLUE','east-facing visitor waiting beside the clear route',{yaw:PI/2,facing:'east',size:[1.75,.84,.62]}),
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
    fixture(`${prefix}/WAIT-W`,'west waiting bank','PF-WAIT-CHAIRS',[x0+.46,e,z0+1.12],'M-FABRIC-BLUE','three east-facing visitor seats beside the clear approach',{yaw:PI/2,facing:'east',size:[1.65,.84,.62]}),
    fixture(`${prefix}/WAIT-E`,'east waiting bank','PF-WAIT-CHAIRS',[x1-.46,e,z1-1.08],'M-FABRIC-BLUE','three west-facing visitor seats',{yaw:-PI/2,facing:'west',size:[1.65,.84,.62]}),
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
    fixture(`${prefix}/GUEST-PRES`,'president visitor chair','PF-CHAIR',[2.22,e,-2.68],'M-FABRIC-RED','south-facing executive visitor seating',{yaw:PI,facing:'south'}),
    fixture(`${prefix}/GUEST-VICE`,'vice-president visitor chair','PF-CHAIR',[5.05,e,-2.68],'M-FABRIC-BLUE','south-facing executive visitor seating',{yaw:PI,facing:'south'}),
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

// ---------------------------------------------------------------- measured B05 room planning
// B05 is composed from door landings and routes first. Furniture is always a genuine composed
// prefab; simple wall-run slabs are reserved for floor finishes, wall datums and ceiling rafts.
function plannedB05Envelope(prefix,e,b,label,{accent='M-FABRIC-BLUE',temperature=3500,pendant=false,display=true,daylight=true}={}) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,north=z0>0;
  const corridorZ=north?z0+.035:z1-.035,yaw=north?0:PI,width=x1-x0,depth=z1-z0;
  const out=[
    ...(daylight?b05DaylightSet(`${prefix}/ARCH`,e,b):[]),
    fixture(`${prefix}/ARCH/LIGHT`,pendant?'civic pendant light':'linear office light',pendant?'PF-PENDANT':'PF-CEILING-LIGHT',
      [cx,e+(pendant?2.48:2.75),cz],pendant?'M-BRASS':'M-WALL-WHITE','even task and visitor lighting',{temperatureK:temperature,size:pendant?[.46,.30,.46]:[width>5?1.55:1.18,.06,.28]}),
    fixture(`${prefix}/ARCH/DATUM`,'corridor-side civic wall datum','PF-WALL-RUN',[cx,e+2.52,corridorZ],
      accent,'durable floor identity above the real doorway',{size:[width-.38,.12,.035],collision:'none'}),
    fixture(`${prefix}/ARCH/SIGN`,'bilingual room identity','PF-ROOM-SIGN',[x0+.68,e+2.22,corridorZ+(north?.025:-.025)],
      'M-SCREEN','room identification',{yaw,size:[1.18,.30,.04],text:label}),
  ];
  const raftXs=width>5?[cx-1.45,cx+1.45]:[cx];
  raftXs.forEach((x,i)=>out.push(fixture(`${prefix}/ARCH/CEILING${i+1}`,'aligned acoustic ceiling raft','PF-WALL-RUN',
    [x,e+2.86,cz],'M-ACOUSTIC','speech privacy in a measured ceiling bay rather than one blocky field',
    {size:[width>5?2.25:Math.max(1.65,width-.72),.045,Math.min(2.12,depth-1.10)],collision:'none'})));
  if(display)out.push(fixture(`${prefix}/ARCH/DISPLAY`,'department information display','PF-SCREEN',
    [x1-.025,e+1.52,cz],'M-SCREEN','appointments, status and civic information',{yaw:PI/2,size:[1.18,.72,.04],collision:'none',text:label}));
  return out;
}

function plannedB05Route(id,e,bounds,material='M-TERRAZZO',purpose='clear accessible route',width) {
  const [x0,x1,z0,z1]=bounds;
  return fixture(id,'concealed accessibility route datum','PF-WALL-RUN',[(x0+x1)/2,e-.032,(z0+z1)/2],material,
    `${purpose}; survey datum concealed below the continuous room finish so it cannot create decorative outline clutter`,
    {size:[x1-x0,.004,z1-z0],collision:'none',clearWidth:width||x1-x0,concealedBelowFinish:true});
}

function plannedB05Turn(id,e,centre,material='M-TERRAZZO') {
  return fixture(id,'concealed 1.50 m accessible turning datum','PF-WALL-RUN',[centre[0],e-.031,centre[1]],material,
    'unobstructed 1.50 m public turning circle recorded below the continuous finish, not drawn as a floor outline',
    {size:[1.50,.004,1.50],collision:'none',turningDiameter:1.50,concealedBelowFinish:true});
}

function plannedB05Monitor(id,e,at,yaw,text='SERVICE READY') {
  return fixture(id,'slim workstation monitor','PF-SCREEN',[at[0],e+.98,at[1]],'M-SCREEN',
    'populated digital university administration workflow',{yaw,size:[.38,.25,.035],collision:'none',text});
}

function plannedB05LobbyFacade(prefix,e,b) {
  const [x0,x1,z0]=b,cx=(x0+x1)/2,z=z0+.055,paneW=1.12,panes=[x0+.75,x1-.75],out=[];
  panes.forEach((x,i)=>out.push(
    fixture(`${prefix}/FACADE/DAYLIGHT${i+1}`,'ceremonial-lobby side window','PF-SCREEN',[x,e+1.70,z],
      'M-SCREEN','campus daylight flanking the university identity wall',{yaw:PI,size:[paneW,1.18,.025],collision:'none'}),
    fixture(`${prefix}/FACADE/GLASS${i+1}`,'laminated lobby glazing','PF-WALL-RUN',[x,e+1.70,z+.026],
      'M-GLASS','safe deep-set lobby glazing',{size:[paneW,1.18,.025],collision:'none'}),
    fixture(`${prefix}/FACADE/SILL${i+1}`,'oak lobby window sill','PF-WALL-RUN',[x,e+1.065,z+.052],
      'M-OAK','durable side-window ledge',{size:[paneW+.10,.09,.14],collision:'none'}),
    fixture(`${prefix}/FACADE/HEAD${i+1}`,'dark-oak lobby window head','PF-WALL-RUN',[x,e+2.34,z+.052],
      'M-OAK-DARK','roller-blind pocket and civic trim',{size:[paneW+.10,.075,.08],collision:'none'}),
  ));
  out.push(
    fixture(`${prefix}/FACADE/FEATURE`,'ribbed oak university identity wall','PF-WALL-RUN',[cx,e+1.50,z+.035],
      'M-OAK-DARK','solid ceremonial backdrop framed by real side windows',{size:[2.85,2.58,.055],collision:'none'}),
    fixture(`${prefix}/FACADE/INLAY`,'slim brass identity-wall inlay','PF-WALL-RUN',[cx,e+1.50,z+.072],
      'M-BRASS','restrained civic metal datum',{size:[2.22,.055,.025],collision:'none'}),
    fixture(`${prefix}/FACADE/WELCOME`,'university administration welcome','PF-ROOM-SIGN',[cx,e+1.88,z+.085],
      'M-SCREEN','institutional arrival identity',{yaw:PI,size:[2.30,.42,.04],text:'北京文华大学 · 行政楼'}),
  );
  return out;
}

function plannedB05Service(prefix,e,b,label) {
  const south=b[3]<0,turn=[-1.75,south?-3.25:3.25],counterZ=south?-4.70:4.70,staffZ=south?-5.30:5.30;
  const waitingZ=south?[-4.25,-3.45]:[4.25,3.45],routeBounds=south?[-2.35,-1.15,-3.25,-1.30]:[-2.35,-1.15,1.30,3.25];
  const workflow=label.includes('学生证')?'证件核验 · 拍照 · 制卡':
    label.includes('国际学生')?'签证 · 住宿 · 学籍咨询':'预约 · 材料 · 办理';
  const out=[
    plannedB05Route(`${prefix}/ROUTE`,e,routeBounds,'M-TERRAZZO','1.20 m route from corridor door to accessible service turn',1.20),
    plannedB05Turn(`${prefix}/TURN`,e,turn,'M-TERRAZZO'),
    fixture(`${prefix}/COUNTER`,'two-position accessible service counter','PF-SERVICE-COUNTER',[-2.75,e,counterZ],
      'M-OAK','registration and consultation at seated and standing heights',{yaw:south?PI:0,size:[2.0,1.05,.72],text:label}),
    fixture(`${prefix}/STAFF1`,'service officer chair 1','PF-CHAIR',[-3.25,e,staffZ],
      'M-FABRIC-BLUE','staff seated facing the public counter',{yaw:south?0:PI,facing:south?'north':'south'}),
    fixture(`${prefix}/STAFF2`,'service officer chair 2','PF-CHAIR',[-2.25,e,staffZ],
      'M-FABRIC-BLUE','staff seated facing the public counter',{yaw:south?0:PI,facing:south?'north':'south'}),
    ...waitingZ.map((z,i)=>fixture(`${prefix}/WAIT${i+1}`,'individual visitor chair','PF-CHAIR',[.16,e,z],
      'M-FABRIC-BLUE','west-facing visitor seat toward the staffed counter',{yaw:-PI/2,facing:'west'})),
    fixture(`${prefix}/KIOSK`,'appointment check-in kiosk','PF-SELF-CHECK',[.15,e,south?-2.35:2.35],
      'M-SCREEN','west-facing queue and appointment check-in',{yaw:PI/2}),
    fixture(`${prefix}/FORMS`,'multilingual forms display','PF-SCREEN',[.465,e+1.52,south?-4.95:4.95],
      'M-SCREEN','forms and service guidance',{yaw:PI/2,size:[1.05,.70,.04],collision:'none',text:label}),
    fixture(`${prefix}/WORKFLOW`,'service-specific workflow wall','PF-SCREEN',[-2.75,e+1.72,south?-5.545:5.545],
      'M-SCREEN','makes this public service unmistakable from the room threshold',
      {yaw:south?0:PI,size:[2.25,.62,.04],collision:'none',text:workflow}),
    plannedB05Monitor(`${prefix}/STAFF-MONITOR1`,e,[-3.25,counterZ],south?0:PI),
    plannedB05Monitor(`${prefix}/STAFF-MONITOR2`,e,[-2.25,counterZ],south?0:PI),
    fixture(`${prefix}/CLOCK`,'public-service clock','PF-CLOCK',[-3.975,e+2.25,south?-2.15:2.15],
      'M-WALL-WHITE','visible appointment timing from both staff positions',{yaw:-PI/2}),
    fixture(`${prefix}/BIN`,'service-point recycling bin','PF-BIN',[-3.62,e,south?-2.10:2.10],
      'M-STEEL','paper forms and confidential-waste separation'),
    ...plannedB05Envelope(prefix,e,b,label,{accent:'M-FABRIC-BLUE',temperature:3500,display:false}),
  ];
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:routeBounds,width:1.20}],
    turns:[{id:`${prefix}/TURN`,centre:turn,diameter:1.50}],servicePositions:2,visitorSeats:2,counterClearance:.90}};
}

function plannedB05Lobby(prefix,e,b) {
  const route=[3.05,4.25,-3.15,-1.30],turn=[3.65,-3.15],out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,'M-TERRAZZO','1.20 m route from corridor arrival to reception turn',1.20),
    plannedB05Turn(`${prefix}/TURN`,e,turn,'M-TERRAZZO'),
    fixture(`${prefix}/WAITING-RUG`,'single inset reception waiting rug','PF-WALL-RUN',[6.05,e+.012,-4.05],
      'M-FABRIC-BLUE','one coherent acoustic field beneath the linked waiting bank, outside the arrival route',
      {size:[1.0,.022,2.25],collision:'none'}),
    fixture(`${prefix}/COUNTER-MAIN`,'compact staffed reception module','PF-SERVICE-COUNTER',[1.75,e,-4.70],
      'M-OAK','rounded two-terminal visitor-triage module with storage',{yaw:PI,size:[1.38,1.02,.64],text:'总服务台 · RECEPTION'}),
    fixture(`${prefix}/COUNTER-ACCESS`,'lower accessible reception return','PF-SIDE-TABLE',[2.92,e,-4.70],
      'M-OAK','seated transaction and document-writing surface beside the staffed module',{size:[.72,.74,.58]}),
    fixture(`${prefix}/COUNTER-PRIVACY`,'laminated reception privacy fin','PF-WALL-RUN',[2.50,e+.64,-4.70],
      'M-GLASS','transparent privacy separation between standing and accessible service positions',
      {size:[.035,.44,.52],collision:'none'}),
    fixture(`${prefix}/STAFF1`,'reception officer chair 1','PF-CHAIR',[1.65,e,-5.25],
      'M-FABRIC-BLUE','staff seated facing arriving visitors',{yaw:0,facing:'north'}),
    fixture(`${prefix}/STAFF2`,'reception officer chair 2','PF-CHAIR',[2.87,e,-5.25],
      'M-FABRIC-BLUE','staff seated facing arriving visitors',{yaw:0,facing:'north'}),
    fixture(`${prefix}/WAIT-BANK`,'linked three-place reception waiting bank','PF-WAIT-CHAIRS',[6.12,e,-4.05],
      'M-FABRIC-BLUE','one composed west-facing waiting group along the daylight edge, outside arrival routes',
      {yaw:-PI/2,facing:'west'}),
    fixture(`${prefix}/DIRECTORY`,'four-floor administration directory','PF-DIRECTORY',[.79,e,-2.15],
      'M-SCREEN','east-facing accessible building wayfinding',{yaw:-PI/2,size:[.90,1.55,.10],text:'行政楼 · 1—4层'}),
    fixture(`${prefix}/KIOSK`,'visitor appointment kiosk','PF-SELF-CHECK',[6.12,e,-2.22],
      'M-SCREEN','west-facing appointments and queue tickets',{yaw:PI/2}),
    fixture(`${prefix}/QUEUE`,'reception queue and appointment display','PF-SCREEN',[6.555,e+1.55,-3.55],
      'M-SCREEN','visible reception triage, appointment numbers and international-student welcome',
      {yaw:PI/2,size:[1.55,.88,.04],collision:'none',text:'A012 · B007 · RECEPTION',hudSafe:true}),
    fixture(`${prefix}/PLANT`,'single lobby specimen plant','PF-PLANT',[5.42,e,-5.18],
      'M-PLANT','one deliberate biophilic arrival element'),
    fixture(`${prefix}/FLAG-BACKDROP`,'recessed ceremonial-flag niche','PF-WALL-RUN',[.725,e+1.72,-4.65],
      'M-OAK-DARK','shadow-jointed architectural niche grounding the textile and crest on the solid west wall',
      {size:[.035,1.68,1.36],collision:'none'}),
    fixture(`${prefix}/FLAG`,'university ceremonial flag','PF-FLAG',[.815,e+1.84,-4.65],
      'M-SAFETY-RED','deep-folded textile university identity in a composed oak niche, clear of the glazing',
      {yaw:-PI/2,size:[.86,.94,.16],collision:'none'}),
    fixture(`${prefix}/FLAG-CREST`,'university flag-niche crest','PF-ROOM-SIGN',[.825,e+1.12,-4.65],
      'M-BRASS','small institutional plaque completing the ceremonial textile vignette',
      {yaw:-PI/2,size:[.64,.22,.04],collision:'none',text:'文华 · WENHUA'}),
    plannedB05Monitor(`${prefix}/STAFF-MONITOR1`,e,[1.65,-4.70],0,'VISITOR CHECK-IN'),
    plannedB05Monitor(`${prefix}/STAFF-MONITOR2`,e,[2.87,-4.70],0,'ACCESSIBLE SERVICE'),
    ...plannedB05LobbyFacade(prefix,e,b),
    // QUEUE is the one purposeful east-wall display.  Suppress the generic envelope screen that
    // previously occupied the same wall plane from the opposite yaw and produced a blank panel.
    ...plannedB05Envelope(prefix,e,b,'入口门厅与总服务台',{accent:'M-OAK-DARK',temperature:3100,pendant:true,display:false,daylight:false}),
  ];
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    turns:[{id:`${prefix}/TURN`,centre:turn,diameter:1.50}],receptionPositions:2,visitorSeats:3,externalDoorKeepClear:3.20}};
}

function plannedB05Waiting(prefix,e,b) {
  const route=[1.65,2.85,1.30,2.65],turn=[2.25,2.65],out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,'M-TERRAZZO','1.20 m route from corridor to waiting-room turn',1.20),
    plannedB05Turn(`${prefix}/TURN`,e,turn,'M-TERRAZZO'),
    ...[3.85,4.65].flatMap((z,row)=>[
      fixture(`${prefix}/SIDE-W-${row+1}`,'west-side waiting chair','PF-CHAIR',[1.05,e,z],
        'M-FABRIC-BLUE','inward-facing visitor seat',{yaw:PI/2,facing:'east'}),
      fixture(`${prefix}/SIDE-E-${row+1}`,'east-side waiting chair','PF-CHAIR',[3.45,e,z],
        'M-FABRIC-BLUE','inward-facing visitor seat',{yaw:-PI/2,facing:'west'}),
    ]),
    fixture(`${prefix}/FORM-TABLE`,'accessible form-writing table','PF-MEETING-TABLE',[2.25,e,5.15],
      'M-OAK','forms and document review',{size:[1.20,.74,.55]}),
    fixture(`${prefix}/FORM-CHAIR1`,'form-writing chair 1','PF-CHAIR',[1.85,e,4.55],
      'M-FABRIC-BLUE','north-facing writing position',{yaw:0,facing:'north'}),
    fixture(`${prefix}/FORM-CHAIR2`,'form-writing chair 2','PF-CHAIR',[2.65,e,4.55],
      'M-FABRIC-BLUE','north-facing writing position',{yaw:0,facing:'north'}),
    fixture(`${prefix}/CLOCK`,'waiting-room clock','PF-CLOCK',[.725,e+2.25,5.05],
      'M-WALL-WHITE','queue and appointment timing',{yaw:-PI/2}),
    ...plannedB05Envelope(prefix,e,b,'等候与材料填写',{accent:'M-FABRIC-BLUE',temperature:3400}),
  ];
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    turns:[{id:`${prefix}/TURN`,centre:turn,diameter:1.50}],visitorSeats:4,writingSeats:2}};
}

function plannedB05Office(prefix,e,b,label,accent='M-FABRIC-BLUE') {
  const [x0,x1,z0,z1]=b,south=z1<0,wide=x1-x0>5,rows=south?[-4.55,-2.45]:[2.45,4.55];
  const route=wide?[3.05,4.25,z0,z1]:[-2.35,-1.15,z0,z1];
  const workflow=label.includes('财务')?'预算 · 报销 · 学费':label.includes('人事')?'招聘 · 合同 · 培训':
    label.includes('教务')?'课程 · 成绩 · 教室':label.includes('院系')?'院系联络 · 项目进度':'综合行政 · TASK BOARD';
  const sides=wide?[
    {desk:x0+.70,chair:x0+1.25,yaw:-PI/2,monitor:x0+.58,monitorYaw:-PI/2,face:'west'},
    {desk:x1-.40,chair:x1-.95,yaw:PI/2,monitor:x1-.28,monitorYaw:PI/2,face:'east'},
  ]:[
    {desk:x0+.70,chair:x0+1.25,yaw:-PI/2,monitor:x0+.58,monitorYaw:-PI/2,face:'west'},
    {desk:x1-.35,chair:x1-.90,yaw:PI/2,monitor:x1-.23,monitorYaw:PI/2,face:'east'},
  ];
  const out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,'M-VINYL','1.20 m central route serving every workstation',1.20),
    fixture(`${prefix}/FILES`,'department file cabinet','PF-FILE-CABINET',[x0+.38,e,south?z1-.22:z0+.22],
      'M-STEEL-DARK','labelled lockable records at the room perimeter',{yaw:south?0:PI,size:[.76,1.35,.40]}),
    fixture(`${prefix}/COAT-RAIL`,'staff coat and visitor-bag rail','PF-COAT-RAIL',[x0+.025,e+1.36,(z0+z1)/2],
      'M-OAK','wall-mounted hooks between the two workstation rows',{yaw:-PI/2,size:[1.0,.38,.12],collision:'none'}),
    fixture(`${prefix}/CLOCK`,'department office clock','PF-CLOCK',[x1-.55,e+2.24,south?z1-.07:z0+.07],
      'M-WALL-WHITE','shared appointment and meeting time',{yaw:south?0:PI}),
    fixture(`${prefix}/WORKFLOW`,'department workflow display','PF-SCREEN',[(x0+x1)/2,e+1.58,south?z0+.055:z1-.055],
      'M-SCREEN','department-specific work queue and service identity',
      {yaw:south?0:PI,size:[2.05,.78,.04],collision:'none',text:workflow}),
    ...plannedB05Envelope(prefix,e,b,label,{accent,temperature:3500}),
  ];
  let n=0;
  for(const z of rows)for(const side of sides){
    const k=pad(++n);
    out.push(
      fixture(`${prefix}/DESK${k}`,'oak administrative workstation','PF-MEETING-TABLE',[side.desk,e,z],
        'M-OAK','human-scale desk with a separate correctly oriented chair',{yaw:PI/2,size:[1.20,.74,.62],rowAisle:.90}),
      fixture(`${prefix}/CHAIR${k}`,'ergonomic staff chair','PF-CHAIR',[side.chair,e,z],
        'M-FABRIC-BLUE',`${side.face}-facing chair toward its desk`,{yaw:side.yaw,facing:side.face}),
      plannedB05Monitor(`${prefix}/MONITOR${k}`,e,[side.monitor,z],side.monitorYaw),
    );
  }
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    workAisles:[{id:'between desk rows',width:.90},{id:'central shared route',width:1.20}],staffStations:4,rowPitch:2.10}};
}

function plannedB05Meeting(prefix,e,b,label,{formal=false,narrow=false,training=false}={}) {
  const south=b[3]<0,cx=(b[0]+b[1])/2,turn=[cx,south?-2.55:2.60];
  const route=south?[cx-.60,cx+.60,-2.55,-1.30]:[cx-.60,cx+.60,1.30,2.60];
  const out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,formal?'M-FABRIC-RED':'M-VINYL','1.20 m route to an accessible meeting turn',1.20),
    plannedB05Turn(`${prefix}/TURN`,e,turn,formal?'M-FABRIC-RED':'M-VINYL'),
  ];
  if(narrow){
    out.push(fixture(`${prefix}/TABLE`,'four-person project table','PF-MEETING-TABLE',[cx,e,4.65],
      'M-OAK','compact meeting surface with correct chair setbacks',{size:[2.10,.76,.75]}));
    [[cx-.60,3.90,0,'north'],[cx+.60,3.90,0,'north'],[cx-.60,5.32,PI,'south'],[cx+.60,5.32,PI,'south']]
      .forEach(([x,z,yaw,face],i)=>out.push(fixture(`${prefix}/CHAIR${pad(i+1)}`,'project meeting chair','PF-CHAIR',[x,e,z],
        'M-FABRIC-BLUE',`${face}-facing chair toward the table`,{yaw,facing:face})));
  }else if(training){
    // Two open-leg workshop tables create a real central breakout aisle and a visibly different
    // silhouette from the single formal council table above.  Six chairs address the two islands.
    for(const [key,x] of [['A',cx-.80],['B',cx+.80]])out.push(
      fixture(`${prefix}/TABLE-${key}`,'mobile workshop table','PF-MEETING-TABLE',[x,e,-4.45],
        'M-OAK','open-leg collaborative island with a clear central breakout gap',{size:[1.10,.74,.72]}));
    const trainingSeats=[
      [cx-.80,-3.65,PI,'south'],[cx+.80,-3.65,PI,'south'],
      [cx-.80,-5.25,0,'north'],[cx+.80,-5.25,0,'north'],
      [cx-1.80,-4.45,PI/2,'east'],[cx+1.80,-4.45,-PI/2,'west'],
    ];
    trainingSeats.forEach(([x,z,yaw,face],i)=>out.push(fixture(`${prefix}/CHAIR${pad(i+1)}`,'mobile training chair','PF-CHAIR',[x,e,z],
      'M-FABRIC-BLUE',`${face}-facing workshop chair serving the paired table islands`,{yaw,facing:face})));
  }else{
    // A formal U-shaped governance table leaves an honest centre sightline to the crest and live
    // agenda.  It is materially and spatially distinct from F3's two loose workshop islands.
    out.push(
      fixture(`${prefix}/TABLE-W`,'west council table wing','PF-MEETING-TABLE',[cx-1.10,e,-4.48],
        'M-OAK-DARK','dark-oak longitudinal governance wing with brass-edged centre aisle',{size:[.72,.76,1.10]}),
      fixture(`${prefix}/TABLE-E`,'east council table wing','PF-MEETING-TABLE',[cx+1.10,e,-4.48],
        'M-OAK-DARK','dark-oak longitudinal governance wing with brass-edged centre aisle',{size:[.72,.76,1.10]}),
      fixture(`${prefix}/TABLE-BRIDGE`,'council agenda bridge','PF-MEETING-TABLE',[cx,e,-5.17],
        'M-OAK-DARK','connected dark-oak agenda bridge completing the U without reading as a separate gold bench',{size:[2.20,.76,.28]}),
    );
    const councilSeats=[
      [cx-1.10,-3.55,PI,'south'],[cx+1.10,-3.55,PI,'south'],
      [cx-1.90,-4.18,PI/2,'east'],[cx-1.90,-4.82,PI/2,'east'],
      [cx+1.90,-4.18,-PI/2,'west'],[cx+1.90,-4.82,-PI/2,'west'],
    ];
    councilSeats.forEach(([x,z,yaw,face],i)=>out.push(fixture(`${prefix}/CHAIR${pad(i+1)}`,'council chair','PF-CHAIR',[x,e,z],
      'M-FABRIC-RED',`${face}-facing governance chair around the single formal table`,{yaw,facing:face})));
  }
  out.push(
    fixture(`${prefix}/PRESENT`,'wall-mounted collaboration display','PF-SCREEN',[b[0]+.025,e+1.55,(b[2]+b[3])/2],
      'M-SCREEN',training?'training content and remote participation':'agenda and remote participation',
      {yaw:-PI/2,size:[1.28,.78,.04],collision:'none',text:training?'BREAKOUT · REVIEW':formal?'AGENDA · 04':'PROJECT REVIEW'}),
    fixture(`${prefix}/CLOCK`,'meeting-room clock','PF-CLOCK',[b[1]-.025,e+2.24,(b[2]+b[3])/2],
      'M-WALL-WHITE','agenda timekeeping visible from every seat',{yaw:PI/2}),
    fixture(`${prefix}/COAT-RAIL`,'meeting-room coat rail','PF-COAT-RAIL',[b[1]-.025,e+1.34,south?b[2]+.72:b[3]-.72],
      'M-OAK','wall-mounted visitor hooks outside the clear route',{yaw:PI/2,size:[1.0,.38,.12],collision:'none'}),
    ...plannedB05Envelope(prefix,e,b,label,{accent:formal?'M-BRASS':'M-FABRIC-BLUE',temperature:formal?3100:3500,
      pendant:formal,display:false,daylight:!(formal||training)}),
  );
  if(training)out.push(
    fixture(`${prefix}/TRAINING-BACKDROP`,'woven workshop presentation backing','PF-WALL-RUN',[cx,e+1.48,b[2]+.035],
      'M-FABRIC-BLUE','solid acoustic workshop end wall replacing the generic fake daylight panel',
      {size:[3.20,1.96,.035],collision:'none'}),
    fixture(`${prefix}/TRAINING-BOARD`,'training exercise board','PF-WHITEBOARD',[cx,e+1.50,b[2]+.065],
      'M-WHITEBOARD','workshop agenda, breakout tasks and learning outcomes',
      {yaw:PI,size:[2.34,.90,.05],collision:'none',text:'01 PRACTICE · 02 REVIEW'}),
    fixture(`${prefix}/TRAINING-SIGN`,'staff development identity','PF-ROOM-SIGN',[cx,e+1.98,b[2]+.085],
      'M-SCREEN','distinguishes the training floor from ordinary open offices',
      {yaw:PI,size:[1.64,.26,.04],collision:'none',text:'培训 · WORKSHOP',hudSafe:true}),
    ...[-.76,0,.76].map((dx,i)=>fixture(`${prefix}/TRAINING-TASK-${String.fromCharCode(65+i)}`,
      'populated workshop task card','PF-ROOM-SIGN',[cx+dx,e+1.48,b[2]+.115],
      'M-SCREEN','individual exercise card layered onto the presentation board instead of an empty white rectangle',
      {yaw:PI,size:[.58,.22,.035],collision:'none',text:['A · PRACTICE','B · REVIEW','C · NEXT'][i]})),
    fixture(`${prefix}/TRAINING-CART`,'mobile workshop materials cart','PF-SIDE-TABLE',[cx-1.80,e,-3.18],
      'M-OAK','open-leg mobile cart holding exercise cards outside the accessible route',{size:[.48,.62,.42]}),
    fixture(`${prefix}/TRAINING-CARDS`,'workshop exercise-card set','PF-ROOM-SIGN',[cx-1.80,e+.66,-3.18],
      'M-SCREEN','short task cards on the mobile workshop cart',{yaw:0,size:[.42,.16,.03],collision:'none',text:'A · B · C'}),
  );
  if(formal)out.push(
    fixture(`${prefix}/COUNCIL-BACKDROP`,'dark-oak council chamber backdrop','PF-WALL-RUN',[cx,e+1.48,b[2]+.035],
      'M-OAK-DARK','solid governance end wall with layered crest, agenda and flags',
      {size:[3.35,1.98,.04],collision:'none'}),
    fixture(`${prefix}/COUNCIL-CREST`,'university council crest','PF-ROOM-SIGN',[cx,e+1.78,b[2]+.085],
      'M-BRASS','formal council identity within the persistent HUD-safe frame',
      {yaw:PI,size:[1.88,.36,.04],collision:'none',text:'校务会议 · COUNCIL',hudSafe:true}),
    fixture(`${prefix}/COUNCIL-AGENDA`,'live council agenda display','PF-SCREEN',[cx,e+1.20,b[2]+.075],
      'M-SCREEN','active governance agenda below the crest and above the table sightline',
      {yaw:PI,size:[1.54,.40,.04],collision:'none',text:'01 BUDGET · 02 CAMPUS',hudSafe:true}),
    fixture(`${prefix}/COUNCIL-FLAG-W`,'council ceremonial flag west','PF-FLAG',[b[0]+.85,e+1.60,b[2]+.38],
      'M-SAFETY-RED','deep-folded formal council textile clear of the measured table and chair footprints',
      {yaw:PI,size:[.82,.68,.16],collision:'none'}),
    fixture(`${prefix}/COUNCIL-FLAG-E`,'council ceremonial flag east','PF-FLAG',[b[1]-.85,e+1.60,b[2]+.38],
      'M-FABRIC-BLUE','deep-folded contrasting university textile clear of the measured table and chair footprints',
      {yaw:PI,size:[.82,.68,.16],collision:'none'}),
  );
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    turns:[{id:`${prefix}/TURN`,centre:turn,diameter:1.50}],seats:narrow?4:6,tableChairSetback:narrow?.135:.19}};
}

function plannedB05Records(prefix,e,b,label,{heritage=false}={}) {
  const [x0,x1]=b,cx=(x0+x1)/2,route=[cx-.60,cx+.60,1.30,4.18],out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,heritage?'M-FABRIC-RED':'M-RUBBER','1.20 m central records retrieval aisle',1.20),
  ];
  let n=0;
  for(const x of [x0+.25,x1-.25])for(const z of [2.55,3.72,4.89]){
    const k=pad(++n),west=x<cx,innerX=x+(west?.225:-.225),yaw=west?-PI/2:PI/2;
    out.push(
      fixture(`${prefix}/FILE${k}`,heritage?'university-history archive cabinet':'secure records cabinet','PF-FILE-CABINET',[x,e,z],
        heritage?'M-OAK-DARK':west?'M-STEEL-DARK':'M-STEEL',
        'alternating articulated four-drawer range with a real shadow gap to the next cabinet',
        {yaw,size:[.72,1.48,.40]}),
      fixture(`${prefix}/FILE${k}-LABEL`,'archive range and retention label','PF-ROOM-SIGN',[innerX,e+1.02,z],
        'M-SCREEN','short range code mounted on the aisle face of the cabinet',
        {yaw,size:[.40,.17,.03],collision:'none',text:`${heritage?'H':'A'}-${k}`}),
    );
  }
  out.push(
    fixture(`${prefix}/RANGE-W`,'west archive range header','PF-ROOM-SIGN',[x0+.035,e+2.04,3.72],
      'M-SCREEN','intake-side cabinet family and retention range above the articulated drawer bank',
      {yaw:-PI/2,size:[1.16,.24,.035],collision:'none',text:heritage?'H01—H03 · HISTORY':'A01—A03 · INTAKE',hudSafe:true}),
    fixture(`${prefix}/RANGE-E`,'east archive range header','PF-ROOM-SIGN',[x1-.035,e+2.04,3.72],
      'M-SCREEN','release-side cabinet family and retention range above the articulated drawer bank',
      {yaw:PI/2,size:[1.16,.24,.035],collision:'none',text:heritage?'H04—H06 · SECURE':'A04—A06 · RELEASE',hudSafe:true}),
    fixture(`${prefix}/SCAN-BACKDROP`,'archive digitisation acoustic backing','PF-WALL-RUN',[cx,e+1.52,5.545],
      heritage?'M-OAK-DARK':'M-FABRIC-SAND','solid secure-room workstation backdrop replacing an implausible archive window',
      {size:[1.78,1.68,.035],collision:'none'}),
    fixture(`${prefix}/SCAN-STATUS`,'archive digitisation status board','PF-SCREEN',[cx,e+1.62,5.515],
      'M-SCREEN','active scan batch, retention class and environmental status',
      {yaw:0,size:[1.38,.54,.04],collision:'none',text:heritage?'校史 · DIGITISE':'SCAN · INDEX · STORE',hudSafe:true}),
    fixture(`${prefix}/SCAN-STEPS`,'archive scan workflow strip','PF-ROOM-SIGN',[cx,e+1.16,5.505],
      'M-FABRIC-BLUE','visible intake, scan and index sequence below the live status board',
      {yaw:0,size:[1.48,.22,.035],collision:'none',text:'INTAKE · SCAN · INDEX',hudSafe:true}),
    fixture(`${prefix}/SCAN-DESK`,'records digitisation desk','PF-MEETING-TABLE',[cx,e,5.08],
      'M-OAK','wide terminal scanning and metadata workstation',{size:[1.34,.74,.60]}),
    fixture(`${prefix}/SCAN-CHAIR`,'records staff chair','PF-CHAIR',[cx,e,4.37],
      'M-FABRIC-BLUE','north-facing chair toward the digitisation desk',{yaw:0,facing:'north'}),
    plannedB05Monitor(`${prefix}/SCAN-MONITOR`,e,[cx,5.02],0,'SCAN BATCH 24'),
    fixture(`${prefix}/SCAN-TRAY-IN`,'incoming archive document tray','PF-BIN',[cx-.36,e+.76,5.08],
      'M-OAK-DARK','composed shallow rim and body for the labelled intake batch',{size:[.34,.10,.26],collision:'none'}),
    fixture(`${prefix}/SCAN-TRAY-OUT`,'completed archive document tray','PF-BIN',[cx+.36,e+.76,5.08],
      'M-FABRIC-BLUE','composed shallow rim and body for the completed scan batch',{size:[.34,.10,.26],collision:'none'}),
    fixture(`${prefix}/ACCESS`,'archive access and environment display','PF-SCREEN',[x1-.025,e+1.52,3.45],
      'M-SCREEN','access log and environmental status',{yaw:PI/2,size:[1.18,.72,.04],collision:'none'}),
    ...plannedB05Envelope(prefix,e,b,label,{accent:heritage?'M-BRASS':'M-OAK-DARK',temperature:heritage?3200:3500,display:false,daylight:false}),
  );
  return {contents:out,planning:{workRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    workAisles:[{id:'central cabinet aisle',width:1.20}],cabinetCount:6,cabinetModuleGap:.45,digitisationStations:1,restricted:true}};
}

function plannedB05Executive(prefix,e,b) {
  const route=[3.05,4.25,-2.65,-1.30],turn=[3.65,-2.65],out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,'M-VINYL','1.20 m executive-suite visitor route',1.20),
    plannedB05Turn(`${prefix}/TURN`,e,turn,'M-VINYL'),
  ];
  const suites=[
    {key:'PRES',desk:1.55,staff:2.12,guest:.97,staffYaw:-PI/2,guestYaw:PI/2,accent:'M-FABRIC-RED',label:'校长'},
    {key:'VICE',desk:5.75,staff:5.18,guest:6.34,staffYaw:PI/2,guestYaw:-PI/2,accent:'M-FABRIC-BLUE',label:'副校长'},
  ];
  for(const s of suites)out.push(
    fixture(`${prefix}/${s.key}/DESK`,'executive oak workstation','PF-MEETING-TABLE',[s.desk,e,-4.45],
      'M-OAK-DARK','executive desk with separate staff and visitor chairs',{yaw:PI/2,size:[1.25,.76,.62]}),
    fixture(`${prefix}/${s.key}/STAFF`,'executive task chair','PF-CHAIR',[s.staff,e,-4.45],
      s.accent,'staff chair facing its desk',{yaw:s.staffYaw,facing:s.key==='PRES'?'west':'east'}),
    fixture(`${prefix}/${s.key}/GUEST`,'executive visitor chair','PF-CHAIR',[s.guest,e,-4.45],
      s.accent,'visitor chair facing the executive desk',{yaw:s.guestYaw,facing:s.key==='PRES'?'east':'west'}),
    plannedB05Monitor(`${prefix}/${s.key}/MONITOR`,e,[s.desk+(s.key==='PRES'?-.12:.12),-4.45],s.key==='PRES'?-PI/2:PI/2),
    fixture(`${prefix}/${s.key}/NAME`,'executive office identity','PF-ROOM-SIGN',[s.key==='PRES'?3.61:3.69,e+2.10,-4.60],
      'M-SCREEN','identity mounted on the correct side of the acoustic suite divider',
      {yaw:s.key==='PRES'?PI/2:-PI/2,size:[1.15,.30,.04],text:s.label}),
  );
  out.push(
    fixture(`${prefix}/PRIVACY-DIVIDER`,'full-height executive acoustic privacy partition','PF-WALL-RUN',[3.65,e+1.35,-4.55],
      'M-ACOUSTIC','architectural partition between the two executive work zones with a 1.65 m north opening',{size:[.08,2.55,1.90],collision:'none'}),
    fixture(`${prefix}/FILES`,'shared executive records cabinet','PF-FILE-CABINET',[6.34,e,-2.02],
      'M-OAK-DARK','secure shared executive records clear of the visitor route',{yaw:PI/2,size:[.78,1.35,.40]}),
    fixture(`${prefix}/CLOCK-PRES`,'president office clock','PF-CLOCK',[1.48,e+2.24,-1.37],
      'M-WALL-WHITE','executive appointment timing',{yaw:0}),
    fixture(`${prefix}/CLOCK-VICE`,'vice-president office clock','PF-CLOCK',[5.78,e+2.24,-1.37],
      'M-WALL-WHITE','executive appointment timing',{yaw:0}),
    ...plannedB05Envelope(prefix,e,b,'校长与副校长办公室',{accent:'M-BRASS',temperature:3200}),
  );
  return {contents:out,planning:{publicRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:1.20}],
    turns:[{id:`${prefix}/TURN`,centre:turn,diameter:1.50}],executiveStations:2,visitorSeats:2}};
}

function plannedB05Media(prefix,e,b) {
  const route=[1.80,2.70,1.30,4.12],out=[
    plannedB05Route(`${prefix}/ROUTE`,e,route,'M-VINYL','0.90 m work route between two media stations',.90),
  ];
  for(const [i,x] of [1.45,3.05].entries())out.push(
    fixture(`${prefix}/DESK${i+1}`,'translation and media workstation','PF-MEETING-TABLE',[x,e,5.15],
      'M-OAK','compact workstation with a separate correctly oriented chair',{size:[1.15,.74,.58]}),
    fixture(`${prefix}/CHAIR${i+1}`,'media staff chair','PF-CHAIR',[x,e,4.53],
      'M-FABRIC-BLUE','north-facing chair toward its desk',{yaw:0,facing:'north'}),
    plannedB05Monitor(`${prefix}/MONITOR${i+1}`,e,[x,5.10],0),
  );
  out.push(
    fixture(`${prefix}/REVIEW`,'bilingual media review display','PF-SCREEN',[3.775,e+1.52,3.35],
      'M-SCREEN','translation proofing and communications review',{yaw:PI/2,size:[1.18,.72,.04],collision:'none'}),
    fixture(`${prefix}/COAT-RAIL`,'media-team coat rail','PF-COAT-RAIL',[.725,e+1.36,3.32],
      'M-OAK','wall-mounted hooks outside the 0.90 m work route',{yaw:-PI/2,size:[.90,.38,.12],collision:'none'}),
    ...plannedB05Envelope(prefix,e,b,'宣传与翻译',{accent:'M-FABRIC-BLUE',temperature:3500,display:false}),
  );
  return {contents:out,planning:{workRoutes:[{id:`${prefix}/ROUTE`,bounds:route,width:.90}],
    workAisles:[{id:'central media aisle',width:.90}],staffStations:2,deskGap:.45}};
}

function plannedB05CoreRooms(level,e,p) {
  const stairW=room(`${p}/STAIR-W`,'西侧安全楼梯',[-6.6,-4.3,-5.6,-1.3],'service',[
    doorway(`${p}/STAIR-W/EXIT`,'west',[-7,e,-3.45],1.2,'campus-service',{emergencyOnly:true}),
    doorway(`${p}/STAIR-W/TO-COR`,'north',[-5.45,e,-1.3],1.2,`${p}/CORRIDOR`),
  ],[
    fixture(`${p}/STAIR-W/FIX`,'west protected stair','PF-STAIR',[-5.0,e,-4.075],
      'M-TERRAZZO','protected stair between two unobstructed 1.20 m landings',{size:[1.35,2.90,2.75]}),
    plannedB05Route(`${p}/STAIR-W/LANDING-N`,e,[-6.25,-4.65,-2.45,-1.30],'M-TILE-DARK','north stair landing',1.20),
    plannedB05Route(`${p}/STAIR-W/LANDING-W`,e,[-6.60,-5.85,-4.25,-2.65],'M-TILE-DARK','west stair discharge landing',1.20),
    fixture(`${p}/STAIR-W/SIGN`,'protected stair sign','PF-ROOM-SIGN',[-4.32,e+1.70,-2.0],
      'M-SCREEN','egress and floor identity',{yaw:PI/2,size:[.78,.30,.04],text:`西楼梯 · ${level}层`}),
    fixture(`${p}/STAIR-W/LIGHT`,'stair landing light','PF-CEILING-LIGHT',[-5.30,e+2.75,-3.45],
      'M-WALL-WHITE','protected stair lighting',{temperatureK:3900,size:[1.0,.06,.28]}),
  ],{programme:'protected stair',planning:{workAisles:[{id:'protected door landings',width:1.20}]}});

  const lift=room(`${p}/LIFT-WC`,'电梯与无障碍卫生间',[-6.6,-4.3,1.3,5.6],'service',[
    doorway(`${p}/LIFT-WC/TO-COR`,'south',[-5.45,e,1.3],1.2,`${p}/CORRIDOR`),
  ],[
    plannedB05Route(`${p}/LIFT-WC/ROUTE`,e,[-6.05,-4.85,1.30,3.10],'M-TILE-LIGHT','1.20 m lift approach',1.20),
    plannedB05Turn(`${p}/LIFT-WC/TURN`,e,[-5.45,3.10],'M-TILE-LIGHT'),
    fixture(`${p}/LIFT-WC/LIFT`,'accessible lift','PF-LIFT',[-5.95,e,4.75],
      'M-STEEL','four-floor accessible vertical circulation',{size:[1.30,2.45,1.55],levels:[1,2,3,4]}),
    fixture(`${p}/LIFT-WC/TOILET`,'north-wall accessible toilet','PF-TOILET',[-4.75,e,4.75],
      'M-CERAMIC','south-facing accessible sanitary fixture beside the lift',{yaw:0,facing:'south',grabRails:true}),
    fixture(`${p}/LIFT-WC/BASIN`,'side-wall accessible basin','PF-BASIN',[-4.525,e,3.75],
      'M-CERAMIC','hand washing clear of the turning circle',{yaw:PI/2}),
    fixture(`${p}/LIFT-WC/MIRROR`,'accessible lift mirror','PF-WALL-RUN',[-4.325,e+1.48,2.90],
      'M-GLASS','visibility while reversing from the lift',{size:[.035,1.25,.82],collision:'none'}),
    fixture(`${p}/LIFT-WC/SIGN`,'lift and accessible WC sign','PF-ROOM-SIGN',[-4.31,e+1.72,2.15],
      'M-SCREEN','lift and sanitary wayfinding',{yaw:PI/2,size:[.78,.30,.04],text:`电梯 · 无障碍卫生间 · ${level}层`}),
    fixture(`${p}/LIFT-WC/LIGHT`,'lift lobby light','PF-CEILING-LIGHT',[-5.45,e+2.75,3.10],
      'M-WALL-WHITE','accessible lift-lobby lighting',{temperatureK:3800,size:[1.0,.06,.28]}),
    fixture(`${p}/LIFT-WC/WC-LIGHT`,'accessible-WC ceiling light','PF-CEILING-LIGHT',[-4.78,e+2.75,4.78],
      'M-WALL-WHITE','separate sanitary task lighting within the combined service core',{temperatureK:4000,size:[.62,.06,.42]}),
  ],{programme:'lift and accessible WC',planning:{publicRoutes:[{id:`${p}/LIFT-WC/ROUTE`,bounds:[-6.05,-4.85,1.30,3.10],width:1.20}],
    turns:[{id:`${p}/LIFT-WC/TURN`,centre:[-5.45,3.10],diameter:1.50}]}});

  const stairE=room(`${p}/STAIR-E`,'东侧安全楼梯',[4.0,6.6,1.3,5.6],'service',[
    doorway(`${p}/STAIR-E/TO-COR`,'south',[5.3,e,1.3],1.2,`${p}/CORRIDOR`),
    doorway(`${p}/STAIR-E/EXIT`,'north',[5.3,e,6],1.2,'campus-service',{emergencyOnly:true}),
  ],[
    fixture(`${p}/STAIR-E/FIX`,'east protected stair','PF-STAIR',[5.3,e,3.65],
      'M-TERRAZZO','protected stair between two unobstructed 1.20 m landings',{size:[1.25,2.90,2.15]}),
    plannedB05Route(`${p}/STAIR-E/LANDING-S`,e,[4.50,6.10,1.30,2.45],'M-TILE-DARK','south stair landing',1.20),
    plannedB05Route(`${p}/STAIR-E/LANDING-N`,e,[4.50,6.10,4.85,5.60],'M-TILE-DARK','north stair discharge landing',1.20),
    fixture(`${p}/STAIR-E/SIGN`,'protected stair sign','PF-ROOM-SIGN',[4.02,e+1.70,3.65],
      'M-SCREEN','egress and floor identity',{yaw:-PI/2,size:[.78,.30,.04],text:`东楼梯 · ${level}层`}),
    fixture(`${p}/STAIR-E/LIGHT`,'stair landing light','PF-CEILING-LIGHT',[5.30,e+2.75,3.65],
      'M-WALL-WHITE','protected stair lighting',{temperatureK:3900,size:[1.0,.06,.28]}),
  ],{programme:'protected stair',planning:{workAisles:[{id:'protected door landings',width:1.20}]}});
  return [stairW,lift,stairE];
}

function plannedB05Corridor(prefix,e,level,labels) {
  const signs=[[-1.75,-1.075,PI,labels[0]],[3.65,-1.075,PI,labels[1]],[-1.75,1.075,0,labels[2]],[2.25,1.075,0,labels[3]]];
  const accent=['M-FABRIC-BLUE','M-OAK','M-FABRIC-BLUE','M-BRASS'][level-1];
  const floorProgramme=[
    '1F · STUDENT SERVICES',
    '2F · DEPARTMENTS',
    '3F · WORKSHOP',
    '4F · COUNCIL',
  ][level-1],arrivalEast=level>=2,arrivalX=arrivalEast?6.555:-6.555,
    arrivalFaceX=arrivalX+(arrivalEast?-.026:.026),arrivalYaw=arrivalEast?PI/2:-PI/2;
  const out=[
    // The circulation rectangle already renders the complete terrazzo floor.  A second full-size
    // PF-WALL-RUN added its automatic oak inset border, which appeared as two long raised trip
    // rails.  Do not duplicate that architectural finish here.
    fixture(`${prefix}/COR/DATUM-S`,'south corridor wall datum','PF-WALL-RUN',[0,e+2.48,-1.075],
      accent,'floor-specific civic identity',{size:[12.65,.12,.035],collision:'none'}),
    fixture(`${prefix}/COR/DATUM-N`,'north corridor wall datum','PF-WALL-RUN',[0,e+2.48,1.075],
      'M-OAK-DARK','continuous durable corridor head',{size:[12.65,.12,.035],collision:'none'}),
    fixture(`${prefix}/COR/FLOOR-SIGN`,'administration floor identity','PF-ROOM-SIGN',[5.25,e+1.72,1.07],
      'M-SCREEN','orientation from public entrance and lift',{yaw:0,size:[1.50,.38,.04],text:`行政楼 · ${level}层`}),
    fixture(`${prefix}/COR/NOTICE`,'single civic information display','PF-SCREEN',[-3.30,e+1.54,1.07],
      'M-SCREEN','services, meetings and floor-specific public notices',
      {yaw:0,size:[2.15,.78,.04],collision:'none',text:floorProgramme}),
    // The former tiny floor medallion used the same bordered prefab and read as a stray blue or
    // brass rectangular outline.  Programme identity now lives on the composed end-wall display.
    ...(level===1?[fixture(`${prefix}/COR/ENTRY-MAT`,'flush east entrance mat','PF-WALL-RUN',[6.12,e-.006,0],
      'M-RUBBER','ground-floor weather-protected arrival mat recessed exactly to finish height',
      {size:[.82,.012,1.80],collision:'none',flushWithFinish:true})]:[]),
    ...[-3.8,.6,4.9].map((x,i)=>fixture(`${prefix}/COR/LIGHT${i+1}`,'linear corridor light','PF-CEILING-LIGHT',[x,e+2.75,0],
      'M-WALL-WHITE','even public circulation lighting',{temperatureK:3500,size:[1.25,.06,.28]})),
    ...[-3.8,.6,4.9].map((x,i)=>fixture(`${prefix}/COR/RAFT${i+1}`,'aligned corridor acoustic raft','PF-WALL-RUN',[x,e+2.86,0],
      'M-ACOUSTIC','speech privacy along the public route',{size:[3.55,.045,1.48],collision:'none'})),
    ...(level>1?[
      fixture(`${prefix}/COR/ARRIVAL-BACKDROP`,'floor-specific civic arrival backdrop','PF-WALL-RUN',
        [arrivalX,e+1.48,0],accent,'panelized corridor-end composition aligned to the authored arrival direction',
        {size:[.035,1.42,1.72],collision:'none'}),
      fixture(`${prefix}/COR/ARRIVAL-SCREEN`,'floor-specific civic programme display','PF-SCREEN',
        [arrivalFaceX,e+1.52,0],'M-SCREEN','short department, workshop or council focal display in the HUD-safe view',
        {yaw:arrivalYaw,size:[1.36,.50,.04],collision:'none',text:floorProgramme,hudSafe:true}),
      fixture(`${prefix}/COR/ARRIVAL-FLOOR`,'civic arrival floor-number plate','PF-ROOM-SIGN',
        [arrivalFaceX,e+2.00,-.50],'M-SCREEN','large floor number below the persistent top HUD',
        {yaw:arrivalYaw,size:[.48,.24,.04],collision:'none',text:`${level}F`,hudSafe:true}),
      fixture(`${prefix}/COR/ARRIVAL-DATUM`,'civic lower arrival datum','PF-WALL-RUN',
        [arrivalFaceX,e+.78,0],level===4?'M-BRASS':'M-OAK',
        'wall-mounted lower edge completing the civic arrival composition',{size:[.10,.07,1.16],collision:'none'}),
    ]:[]),
  ];
  signs.forEach(([x,z,yaw,text],i)=>out.push(fixture(`${prefix}/COR/SIGN${i+1}`,'compact bilingual room lintel','PF-ROOM-SIGN',
    [x,e+2.28,z],'M-SCREEN','centred above the real doorway so the corridor frame cannot crop a projecting side card',
    {yaw,size:[.72,.22,.035],text,collision:'none'})));
  return out;
}

function plannedB05SafetySet(prefix,e,level,includeAED=false) {
  const out=safetySet(prefix,e,[-4.15,-1.015],[5.8,0],level,includeAED).map(item=>{
    if(item.id.endsWith('/SAFE-EXT'))return {...item,
      label:'wall-mounted corridor fire extinguisher',at:[-4.15,e+.62,-1.245],yaw:PI,collision:'none',size:[.32,.76,.16],
      purpose:'raised extinguisher body mounted inside a dark recessed cabinet, never standing on the corridor floor'};
    if(item.id.endsWith('/SAFE-ALM'))return {...item,at:[-3.58,e+1.25,-1.255],yaw:0,
      purpose:'wall-mounted manual call point grouped with the recessed fire cabinet'};
    if(item.id.endsWith('/SAFE-EML'))return {...item,at:[-4.15,e+2.35,-1.255],yaw:0,
      purpose:'wall-mounted battery light above the recessed fire cabinet'};
    if(item.id.endsWith('/SAFE-DIR'))return {...item,at:[-4.78,e+1.58,-1.255],yaw:0,
      purpose:'wall-mounted floor directory clear of the corridor route'};
    return item;
  });
  out.push(
    fixture(`${prefix}/SAFE-EXT-REVEAL`,'recessed fire-cabinet shadow box','PF-WALL-RUN',[-4.15,e+1.00,-1.275],
      'M-STEEL-DARK','dark wall-mounted recess fully framing the elevated extinguisher body',
      {size:[.54,1.02,.025],collision:'none'}),
    fixture(`${prefix}/SAFE-EXT-LABEL`,'fire-cabinet bilingual label','PF-ROOM-SIGN',[-4.15,e+1.58,-1.235],
      'M-SCREEN','short identification immediately above the recessed cabinet',
      {yaw:PI,size:[.58,.18,.035],text:'灭火器 · FIRE',collision:'none'}),
  );
  return out;
}

function validatePlannedB05(building) {
  const EPS=.055,physical=f=>prefabById[f.prefab]&&prefabById[f.prefab].anchor==='floor'&&f.collision!=='none'&&
    f.size[1]>.20&&!['PF-EXTINGUISHER','PF-BIN'].includes(f.prefab);
  const semanticSeatPrefabs=new Set(['PF-CHAIR','PF-LECTURE-SEAT','PF-WAIT-CHAIRS','PF-BENCH']);
  // Renderer-independent seat contract: yaw 0 -> +z, PI -> -z, +PI/2 -> +x, -PI/2 -> -x.
  // `facing` is mandatory for every semantic seat so the plan validates direction as a vector,
  // rather than accidentally depending on whichever side a chair mesh currently calls its front.
  const facingVectors={north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]};
  const seatVector=yaw=>[Math.sin(yaw||0),Math.cos(yaw||0)];
  const rect=f=>{let w=f.size[0],d=f.size[2];const q=((Math.round((f.yaw||0)/(PI/2))%2)+2)%2;if(q)[w,d]=[d,w];
    return {id:f.id,f,x0:f.at[0]-w/2,x1:f.at[0]+w/2,z0:f.at[2]-d/2,z1:f.at[2]+d/2};};
  const pen=(a,b)=>Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>EPS&&Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0)>EPS;
  const doorZone=d=>{
    const along=d.width/2+.20,depth=1.15,x=d.at[0],z=d.at[2];
    if(d.side==='east')return {x0:x-depth,x1:x,z0:z-along,z1:z+along};
    if(d.side==='west')return {x0:x,x1:x+depth,z0:z-along,z1:z+along};
    if(d.side==='north')return {x0:x-along,x1:x+along,z0:z-depth,z1:z};
    return {x0:x-along,x1:x+along,z0:z,z1:z+depth};
  };
  const errors=[];let checked=0,doors=0,routes=0,turns=0,overlaps=0,publicMin=Infinity,workMin=Infinity,
    semanticSeatDirectionChecks=0;
  for(const f of building.floorsPlan){
    const floorObjects=[];
    for(const room of f.rooms){
      for(const seat of (room.contents||[]).filter(o=>semanticSeatPrefabs.has(o.prefab))){
        const expected=facingVectors[seat.facing];semanticSeatDirectionChecks++;
        if(!expected)errors.push(`${seat.id}: semantic seat lacks north/south/east/west facing metadata`);
        else{
          const actual=seatVector(seat.yaw),vectorError=Math.hypot(actual[0]-expected[0],actual[1]-expected[1]);
          if(vectorError>.001)errors.push(`${seat.id}: yaw vector disagrees with facing ${seat.facing}`);
        }
      }
      const rs=(room.contents||[]).filter(physical).map(rect);checked+=rs.length;floorObjects.push(...rs);
      for(const r of rs)if(r.x0<room.bounds[0]-.01||r.x1>room.bounds[1]+.01||r.z0<room.bounds[2]-.01||r.z1>room.bounds[3]+.01)
        errors.push(`${r.id}: outside ${room.id}`);
      for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++)if(pen(rs[i],rs[j])){
        overlaps++;errors.push(`${room.id}: overlap ${rs[i].id} / ${rs[j].id}`);
      }
      for(const d of room.doors||[])for(const r of rs)if(pen(r,doorZone(d))){doors++;errors.push(`${r.id}: blocks ${d.id}`);}
      const planning=room.planning||{};
      for(const route of [...(planning.publicRoutes||[]),...(planning.workRoutes||[])]){
        const zone={x0:route.bounds[0],x1:route.bounds[1],z0:route.bounds[2],z1:route.bounds[3]};
        const isPublic=(planning.publicRoutes||[]).includes(route);if(isPublic)publicMin=Math.min(publicMin,route.width);else workMin=Math.min(workMin,route.width);
        if(route.width<(isPublic?1.20:.90)-.001)errors.push(`${route.id}: route width ${route.width}`);
        for(const r of rs)if(pen(r,zone)){routes++;errors.push(`${r.id}: blocks ${route.id}`);}
      }
      for(const aisle of planning.workAisles||[]){workMin=Math.min(workMin,aisle.width);if(aisle.width<.90-.001)errors.push(`${room.id}: ${aisle.id} below 0.90 m`);}
      for(const turn of planning.turns||[]){
        turns++;if(turn.diameter<1.50-.001)errors.push(`${turn.id}: turning diameter ${turn.diameter}`);
        const radius=turn.diameter/2;
        for(const r of rs){const dx=Math.max(r.x0-turn.centre[0],0,turn.centre[0]-r.x1),dz=Math.max(r.z0-turn.centre[1],0,turn.centre[1]-r.z1);
          if(Math.hypot(dx,dz)<radius-EPS)errors.push(`${r.id}: blocks ${turn.id}`);}
      }
    }
    const shared=(f.sharedObjects||[]).filter(physical).map(rect);checked+=shared.length;floorObjects.push(...shared);
    for(const route of f.circulation||[]){const zone={x0:route.bounds[0],x1:route.bounds[1],z0:route.bounds[2],z1:route.bounds[3]};
      publicMin=Math.min(publicMin,route.clearWidth);for(const r of floorObjects)if(pen(r,zone)){routes++;errors.push(`${r.id}: blocks ${route.id}`);}}
  }
  if(errors.length)throw new Error(`B05 measured-plan validation failed (${errors.length}):\n${errors.slice(0,40).join('\n')}`);
  return {physicalFixturesChecked:checked,containmentFailures:0,doorApproachObstructions:doors,routeObstructions:routes,
    unintendedFootprintOverlaps:overlaps,accessibleTurningCirclesChecked:turns,publicRouteMinimum:r3(publicMin),
    workAisleMinimum:r3(workMin),semanticSeatDirectionChecks};
}

function buildB05() {
  // B05's long brown "floor rails" were not runner fixtures: they were the generic dark-oak
  // partition skirtings seen nearly edge-on along both sides of the 2.20 m corridor.  Building-
  // local finish keys keep the same floors/walls/acoustics while blending that skirting into the
  // plaster; authored civic datums and door leaves retain the intended oak identity above it.
  finishSets['b05-public']={...finishSets.public,trim:'M-WALL-WARM'};
  finishSets['b05-office']={...finishSets.office,trim:'M-WALL-WARM'};
  const floors=[];
  const A=[-4.0,.5,-5.6,-1.3],B=[.7,6.6,-5.6,-1.3],C=[-4.0,.5,1.3,5.6],D=[.7,3.8,1.3,5.6];
  const specs=[
    {level:1,rooms:[
      ['A','学生证与注册',A,'service',b=>plannedB05Service('B05/F1/A',0,b,'学生证 · 注册')],
      ['B','入口门厅与总服务台',B,'lobby',b=>plannedB05Lobby('B05/F1/B',0,b)],
      ['C','国际学生咨询',C,'service',b=>plannedB05Service('B05/F1/C',0,b,'国际学生咨询')],
      ['D','等候与材料填写',D,'public',b=>plannedB05Waiting('B05/F1/D',0,b)],
    ]},
    {level:2,rooms:[
      ['A','财务处',A,'office',b=>plannedB05Office('B05/F2/A',3.1,b,'财务处','M-FABRIC-RED')],
      ['B','人事处',B,'office',b=>plannedB05Office('B05/F2/B',3.1,b,'人事处','M-FABRIC-BLUE')],
      ['C','教务处',C,'office',b=>plannedB05Office('B05/F2/C',3.1,b,'教务处','M-OAK')],
      ['D','档案室',D,'service',b=>plannedB05Records('B05/F2/D',3.1,b,'档案室')],
    ]},
    {level:3,rooms:[
      ['A','培训室',A,'office',b=>plannedB05Meeting('B05/F3/A',6.2,b,'培训室',{training:true})],
      ['B','综合行政办公室',B,'office',b=>plannedB05Office('B05/F3/B',6.2,b,'综合行政办公室','M-FABRIC-BLUE')],
      ['C','院系联络办公室',C,'office',b=>plannedB05Office('B05/F3/C',6.2,b,'院系联络办公室','M-OAK')],
      ['D','国际项目会议室',D,'office',b=>plannedB05Meeting('B05/F3/D',6.2,b,'国际项目会议室',{narrow:true})],
    ]},
    {level:4,rooms:[
      ['A','校务会议室',A,'office',b=>plannedB05Meeting('B05/F4/A',9.3,b,'校务会议室',{formal:true})],
      ['B','校长与副校长办公室',B,'office',b=>plannedB05Executive('B05/F4/B',9.3,b)],
      ['C','校史与机要档案',C,'service',b=>plannedB05Records('B05/F4/C',9.3,b,'校史与机要档案',{heritage:true})],
      ['D','宣传与翻译',D,'office',b=>plannedB05Media('B05/F4/D',9.3,b)],
    ]},
  ];
  const reviewByLevel={
    1:{
      entries:[{suffix:'entry',portalId:'B05/PUBLIC',focusRoomId:'B05/F1/B',cameraZoneId:'B05/F1/B',
        focusAt:{x:4.04,z:-4.18,yaw:1.60},body:'hidden',
        focusFixtureIds:['B05/F1/B/KIOSK','B05/F1/B/WAIT-BANK']}],
      programme:{roomId:'B05/F1/B',at:{x:3.62,z:-3.28,yaw:-2.46},
        focusFixtureIds:['B05/F1/B/COUNTER-MAIN','B05/F1/B/COUNTER-ACCESS']},
    },
    2:{
      entry:{zoneId:'B05/F2/CORRIDOR',at:{x:4.78,z:-.28,yaw:1.96},
        focusFixtureIds:['B05/F2/COR/ARRIVAL-SCREEN']},
      programme:{roomId:'B05/F2/D',at:{x:2.40,z:3.60,yaw:-.58},
        focusFixtureIds:['B05/F2/D/SCAN-STATUS','B05/F2/D/SCAN-STEPS','B05/F2/D/FILE02']},
    },
    3:{
      entry:{zoneId:'B05/F3/CORRIDOR',at:{x:4.78,z:-.28,yaw:1.96},
        focusFixtureIds:['B05/F3/COR/ARRIVAL-SCREEN']},
      programme:{roomId:'B05/F3/A',at:{x:-2.04,z:-3.64,yaw:-3.61},
        focusFixtureIds:['B05/F3/A/TRAINING-SIGN','B05/F3/A/TRAINING-TASK-B']},
    },
    4:{
      entry:{zoneId:'B05/F4/CORRIDOR',at:{x:4.78,z:-.28,yaw:1.96},
        focusFixtureIds:['B05/F4/COR/ARRIVAL-SCREEN']},
      programme:{roomId:'B05/F4/A',at:{x:-1.45,z:-3.45,yaw:-2.98},
        focusFixtureIds:['B05/F4/A/COUNCIL-CREST','B05/F4/A/COUNCIL-AGENDA']},
    },
  };
  for(const spec of specs) {
    const e=(spec.level-1)*3.1,p=`B05/F${spec.level}`,rooms=[];
    for(const [key,label,b,kind,make] of spec.rooms) {
      const corridorSide=b[3]<0?'north':'south';
      const corridorZ=corridorSide==='north'?b[3]:b[2];
      const doors=[doorway(`${p}/${key}/D`,corridorSide,[(b[0]+b[1])/2,e,corridorZ],1.0,`${p}/CORRIDOR`)];
      if(spec.level===1&&key==='B') doors.push(doorway(`${p}/${key}/EXT`,'east',[7,e,0],3.2,'campus',{portal:true}));
      const plan=make(b);
      const finish=(kind==='lobby'||kind==='public')?'b05-public':'b05-office';
      rooms.push(room(`${p}/${key}`,label,b,finish,doors,plan.contents,
        {programme:kind,planning:plan.planning}));
    }
    rooms.push(...plannedB05CoreRooms(spec.level,e,p));
    const shared=[
      ...plannedB05SafetySet(p,e,spec.level,spec.level===1),
      ...plannedB05Corridor(p,e,spec.level,spec.rooms.map(r=>r[1])),
    ];
    floors.push(floor(spec.level,e,3.1,rooms,[{id:`${p}/CORRIDOR`,bounds:[-6.6,6.6,-1.1,1.1],clearWidth:2.2,surface:'M-TERRAZZO'}],shared,
      {occupancy:spec.level===1?70:45,visualReview:reviewByLevel[spec.level]}));
  }
  const building={
    id:'B05',label:'行政楼 · 国际学生中心',status:'new-interior',centreCampus:[-36,30],localBounds:[-7,7,-6,6],
    exteriorFootprint:{x0:-43,x1:-29,z0:24,z1:36},floors:4,floorHeight:3.1,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-36 + localX',worldZ:'30 + localZ'},
    portals:[{id:'B05/PUBLIC',campusAt:[-29,30],campusReturn:[-26.6,30,-PI/2],localSpawn:[5.6,0,0,-PI/2],placeKey:'campus_admin_f1'}],
    facadeChanges:[{id:'B05/EXIT-W','instruction':'Add a 1.20 m protected-stair discharge on west wall at campus (-43,26.55).'},
      {id:'B05/EXIT-N','instruction':'Add a 1.20 m protected-stair discharge on north wall at campus (-30.7,36).'}],
    facadeAlignment:{eastWindows:{localX:7,localZ:[-4.5,-1.5,1.5,4.5]},entrance:{side:'east',localAt:[7,0],width:3.2}},
    design:'A measured four-floor civic university administration building planned from movement outward. Every public room has a 1.20 m route and every service or lift area has a clear 1.50 m turn; desk rows retain 0.90 m work aisles. Rounded composed oak desks, separately oriented chairs, real service counters, filing cabinets and meeting tables replace generic block grids. Deep-set framed windows, split acoustic ceiling rafts, coherent linear and pendant lighting, terrazzo thresholds, quiet vinyl, dark oak and restrained brass datums form a calm civic palette. Staff monitors, files, clocks, coat rails and a single ceremonial arrival wall add credible use without freestanding decorative clutter.',
    planningMetrics:{publicRouteMinimum:1.20,workAisleMinimum:.90,corridorClearWidth:2.20,doorApproachDepth:1.15,
      accessibleTurningDiameter:1.50,publicServiceCounters:3,departmentWorkstations:20,recordsCabinets:12,
      meetingSeats:16,executiveWorkstations:2,protectedStairDoorLandings:1.20,
      authoredLuminairesPerFloor:11,rendererNearestLightSelectionCap:8},
    floorsPlan:floors,
  };
  building.planningMetrics.validation=validatePlannedB05(building);
  return building;
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
  rows.forEach(([x,z,w=3.0,d=.22],i)=>out.push(
    b06Decor(`${prefix}/SERVICE${pad(i+1)}`,'slender laboratory service rail',
      [x,e+3.31,z],accent,[w,.075,d],'aligned overhead power, data and isolated piped services'),
    fixture(`${prefix}/LIGHT${pad(i+1)}`,'sealed high-CRI laboratory light','PF-CEILING-LIGHT',
      [x,e+3.22,z],'M-WALL-WHITE','shadow-controlled task lighting aligned to the work surface',
      {temperatureK,lumens:3000,size:[Math.min(2.25,w*.72),.055,.22],collision:'none'}),
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

function b06ClearZone(id,e,x,z,w,d,label,purpose,material='M-SAFETY-YELLOW') {
  return b06Decor(id,label,[x,e+.016,z],material,[w,.022,d],purpose,{opacity:.72});
}

// Deep-set laboratory windows are assembled as real wall layers rather than a single glass
// rectangle: laminated inner glazing, a cleanable stainless sill, a colored blind/service head
// and two plaster jambs.  They are non-blocking architectural pieces aligned to the exterior
// facade rhythm, so equipment, doors and measured working aisles keep their authored footprints.
function b06WindowBays(prefix,e,b,side,points,accent='M-LAB-BLUE') {
  const [x0,x1]=b,west=side==='west',x=west?x0+.035:x1-.035,inward=west?1:-1,out=[];
  points.forEach((z,i)=>{
    const id=`${prefix}/WINDOW${pad(i+1)}`;
    out.push(
      b06Decor(`${id}/GLASS`,'laminated laboratory window glazing',[x,e+1.88,z],
        'M-GLASS',[.045,1.56,1.20],'deep-set daylight window aligned to the science-building facade'),
      b06Decor(`${id}/SILL`,'cleanable stainless window sill',[x+inward*.065,e+1.075,z],
        'M-STAINLESS',[.18,.105,1.34],'durable laboratory window sill and inner reveal'),
      b06Decor(`${id}/HEAD`,'color-coded window blind head',[x+inward*.035,e+2.70,z],
        accent,[.11,.12,1.36],'integrated window blind pocket and laboratory identity head'),
      b06Decor(`${id}/JAMB-A`,'plaster laboratory window jamb',[x,e+1.89,z-.66],
        'M-WALL-WHITE',[.08,1.76,.10],'deep architectural window reveal'),
      b06Decor(`${id}/JAMB-B`,'plaster laboratory window jamb',[x,e+1.89,z+.66],
        'M-WALL-WHITE',[.08,1.76,.10],'deep architectural window reveal'),
    );
  });
  return out;
}

// Each science room receives one coherent architectural kit: a cleanable wall datum, a visible
// services trunk, ribbed sealed ceiling fields and only the facade windows appropriate to its
// programme.  PF-WALL-RUN is deliberately limited here to genuine fixed construction.
function b06Architecture(prefix,e,b,accent='M-LAB-BLUE',options={}) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0,out=[];
  if(options.wallDatum!==false)out.push(
    b06Decor(`${prefix}/ARCH/WALL-DATUM`,'washable laboratory wall datum',[cx,e+1.02,z1-.04],
      'M-CLINIC',[w-.50,.46,.055],'continuous cleanable wall protection behind fixed services'),
  );
  if(options.serviceTrunk!==false)out.push(
    b06Decor(`${prefix}/ARCH/SERVICE-TRUNK`,'color-coded wall services trunk',[cx,e+2.82,z1-.065],
      accent,[w-.64,.13,.11],'fixed power, data and isolated-services wall rail'),
  );
  if(d>7.2) {
    const fieldD=(d-1.12)/2;
    out.push(
      b06Decor(`${prefix}/ARCH/CEILING-S`,'sealed south laboratory ceiling field',
        [cx,e+3.49,z0+.34+fieldD/2],'M-WALL-WHITE',[w-.62,.055,fieldD],
        'ribbed cleanable ceiling field aligned to laboratory work zones'),
      b06Decor(`${prefix}/ARCH/CEILING-N`,'sealed north laboratory ceiling field',
        [cx,e+3.49,z1-.34-fieldD/2],'M-WALL-WHITE',[w-.62,.055,fieldD],
        'ribbed cleanable ceiling field aligned to laboratory work zones'),
    );
  } else {
    out.push(b06Decor(`${prefix}/ARCH/CEILING`,'sealed laboratory ceiling field',
      [cx,e+3.49,cz],'M-WALL-WHITE',[w-.62,.055,d-.68],
      'ribbed cleanable ceiling field aligned to laboratory work zones'));
  }
  if(options.windows)out.push(...b06WindowBays(`${prefix}/ARCH`,e,b,options.windows.side,
    options.windows.points,accent));
  return out;
}

function b06ExtractHeader(id,e,at,size,accent='M-SAFETY-YELLOW') {
  return b06Decor(id,'laboratory extract canopy and riser header',[at[0],e+3.03,at[1]],
    accent,size,'fixed architectural extraction canopy connecting contained equipment to roof risers');
}

// Keep the composed PF-FUME-HOOD collision body, then articulate the safety-critical silhouette
// with an independently readable glass sash, steel frame, services/control strip and roof duct.
// Every added piece is fixed non-colliding equipment trim, not freestanding slab furniture.
function b06ComposedFumeHood(prefix,e,at,yaw,label,purpose,accent='M-SAFETY-YELLOW') {
  // A prefab's visible face is its local -Z face.  Use that actual rotated front vector so the
  // sash, controls and service rail sit in the room instead of being buried behind the body.
  const [x,z]=at,nx=-Math.sin(yaw),nz=-Math.cos(yaw),tx=Math.cos(yaw),tz=-Math.sin(yaw),
    front=[x+nx*.465,z+nz*.465];
  return [
    fixture(`${prefix}/BODY`,label,'PF-FUME-HOOD',[x,e,z],'M-STAINLESS',purpose,{yaw}),
    b06Decor(`${prefix}/SASH`,'laminated vertical fume-hood sash',[front[0],e+1.48,front[1]],
      'M-GLASS',[1.18,.72,.035],'recognizable transparent containment sash with a visible work opening',{yaw}),
    b06Decor(`${prefix}/SASH-RAIL`,'dark sash handle and lower airfoil',[front[0],e+1.10,front[1]+.004],
      'M-STEEL-DARK',[1.24,.075,.055],'continuous sash handle and aerodynamic lower rail',{yaw}),
    b06Decor(`${prefix}/FRAME-L`,'left fume-hood jamb',
      [front[0]-tx*.63,e+1.48,front[1]-tz*.63],'M-STEEL-DARK',[.065,.86,.065],'sealed sash frame',{yaw}),
    b06Decor(`${prefix}/FRAME-R`,'right fume-hood jamb',
      [front[0]+tx*.63,e+1.48,front[1]+tz*.63],'M-STEEL-DARK',[.065,.86,.065],'sealed sash frame',{yaw}),
    b06Decor(`${prefix}/PLENUM`,'fume-hood extraction plenum',[x-nx*.16,e+2.38,z-nz*.16],
      'M-STEEL-DARK',[1.28,.24,.48],'tapered visual header linking the chamber to extraction',{yaw}),
    b06Decor(`${prefix}/DUCT`,'vertical fume extract duct',[x-nx*.18,e+2.78,z-nz*.18],
      'M-STEEL',[.34,.70,.34],'visible dedicated extract riser above the containment plenum'),
    b06Sign(`${prefix}/CONTROL`,'hood airflow and service control',
      [front[0]+tx*.50,e+.97,front[1]+tz*.50],'风速',
      'airflow status, emergency purge and isolated service controls',{yaw,size:[.42,.18,.035]}),
    b06Decor(`${prefix}/SERVICE`,'fixed color-coded hood service rail',[front[0],e+.83,front[1]],
      accent,[1.18,.07,.055],'architectural gas, vacuum and electrical service rail',{yaw}),
  ];
}

// The upper science-floor landing is necessarily a long clear route, but it must not look like
// the same empty corridor three times.  Each floor therefore ends in a real, wall-mounted
// programme vignette: contained chemistry services, paired cell-imaging displays, or robotics
// telemetry.  Every piece is non-blocking fixed equipment outside the measured walking field.
function b06UpperArrival(p,e,level) {
  if(level===2)return [
    // A front-facing east-wall service bay uses the full depth of the landing.  The status screen,
    // real containment sash, extract riser and spill cabinet now read together in one uncropped
    // chemistry composition instead of being seen edge-on along an empty corridor.
    b06Decor(`${p}/ARRIVAL/BACKDROP`,'chemistry arrival service-bay wall',[7.055,e+1.48,-1.00],
      'M-STEEL-DARK',[.055,2.50,1.88],'fixed east-wall chemistry service bay integrating extract, status and spill response'),
    b06Sign(`${p}/ARRIVAL/IDENTITY`,'chemistry-floor identity header',[7.015,e+2.58,-1.02],
      '2F · 化学通风','full chemistry-floor identity above the composed service bay',
      {yaw:PI/2,size:[1.52,.27,.04]}),
    fixture(`${p}/ENTRY-DISPLAY`,'chemistry hood and room-status display','PF-SCREEN',[7.015,e+1.64,-1.48],
      'M-SCREEN','live fume-hood airflow, room availability and eye-wash readiness',
      {yaw:PI/2,size:[.86,.70,.04],collision:'none',text:'通风 · READY'}),
    b06Decor(`${p}/ARRIVAL/SASH`,'framed chemistry containment sash',[7.005,e+1.35,-.43],
      'M-GLASS',[.035,1.10,.88],'east-wall training sash demonstrating safe hood working height'),
    b06Decor(`${p}/ARRIVAL/SASH-L`,'south chemistry sash jamb',[6.985,e+1.35,-.89],
      'M-STAINLESS',[.075,1.24,.065],'fixed architectural sash jamb'),
    b06Decor(`${p}/ARRIVAL/SASH-R`,'north chemistry sash jamb',[6.985,e+1.35,.03],
      'M-STAINLESS',[.075,1.24,.065],'fixed architectural sash jamb'),
    b06Decor(`${p}/ARRIVAL/DUCT`,'architectural chemistry extract duct riser',[6.90,e+2.44,-.08],
      'M-STAINLESS',[.24,.82,.24],'fixed architectural extraction duct rising above the training sash'),
    b06Decor(`${p}/ARRIVAL/CANOPY`,'chemistry extract service canopy',[6.91,e+2.78,-.43],
      'M-STAINLESS',[.24,.16,1.14],'horizontal architectural extract canopy completing the chemistry service bay'),
    fixture(`${p}/ARRIVAL/SPILL`,'chemistry spill-response cabinet','PF-FIRST-AID',[6.93,e+1.02,-1.82],
      'M-SAFETY-YELLOW','clearly marked spill kit at the chemistry landing',
      {yaw:PI/2,size:[.46,.58,.18],collision:'none'}),
  ];
  if(level===3)return [
    // F3 is a stacked imaging gallery: paired live views sit above a glazed teaching-slide case,
    // making the life-science landing spatially distinct from the chemistry service bay.
    b06Decor(`${p}/ARRIVAL/BACKDROP`,'stacked cell-imaging gallery wall',[7.055,e+1.48,-1.00],
      'M-WALL-GREEN',[.055,2.50,1.88],'fixed east-wall life-science gallery grouping live imaging and specimen workflow'),
    b06Sign(`${p}/ARRIVAL/IDENTITY`,'life-science floor identity header',[7.015,e+2.58,-1.00],
      '3F · 细胞成像','full life-science identity above the paired imaging gallery',
      {yaw:PI/2,size:[1.48,.27,.04]}),
    fixture(`${p}/ENTRY-DISPLAY`,'live cell-imaging arrival display','PF-SCREEN',[7.015,e+1.78,-1.48],
      'M-SCREEN','live teaching microscope mosaics and laboratory availability',
      {yaw:PI/2,size:[.88,.68,.04],collision:'none',text:'细胞 · LIVE'}),
    fixture(`${p}/ARRIVAL/CELL-ATLAS`,'cell morphology atlas display','PF-SCREEN',[7.015,e+1.62,-.43],
      'M-SCREEN','paired annotated bright-field and fluorescence specimen views',
      {yaw:PI/2,size:[.76,.58,.04],collision:'none',text:'图谱 · ATLAS'}),
    b06Decor(`${p}/ARRIVAL/SPECIMEN-GLASS`,'glazed teaching-slide case',[6.995,e+.89,-.98],
      'M-GLASS',[.04,.42,1.48],'framed architectural glazing protecting labelled teaching-slide carriers'),
    b06Decor(`${p}/ARRIVAL/SPECIMEN-SILL`,'teaching-slide gallery sill',[6.91,e+.64,-.98],
      'M-STAINLESS',[.20,.08,1.56],'fixed architectural sill beneath the glazed teaching-slide case'),
    b06Decor(`${p}/ARRIVAL/GREEN-RAIL`,'life-science data gallery rail',[6.92,e+2.68,-1.00],
      'M-WALL-GREEN',[.14,.12,1.68],'integrated clean power and imaging-data rail above the stacked gallery'),
  ];
  return [
    // F4 becomes a shallow machine-vision command portal at the east end, with a real multipart
    // robotics demonstrator beneath two telemetry displays.  It no longer reads as a dark tunnel.
    b06Decor(`${p}/ARRIVAL/BACKDROP`,'robotics telemetry arrival wall',[7.055,e+1.48,-1.00],
      'M-STEEL-DARK',[.055,2.50,1.88],'fixed innovation-floor wall grouping robot state, vision and safe motion limits'),
    b06Sign(`${p}/ARRIVAL/IDENTITY`,'robotics-floor identity header',[7.015,e+2.57,-1.00],
      '4F · 机器人','full innovation-floor identity above the machine-vision portal',
      {yaw:PI/2,size:[1.42,.27,.04]}),
    fixture(`${p}/ENTRY-DISPLAY`,'robotics and AI arrival display','PF-SCREEN',[7.015,e+1.83,-1.48],
      'M-SCREEN','robot-cell state, machine vision and AI laboratory availability',
      {yaw:PI/2,size:[.84,.70,.04],collision:'none',text:'ROBOT · READY'}),
    fixture(`${p}/ARRIVAL/VISION`,'machine-vision diagnostic display','PF-SCREEN',[7.015,e+1.63,-.43],
      'M-SCREEN','camera calibration target, safety envelope and inference status',
      {yaw:PI/2,size:[.66,.56,.04],collision:'none',text:'VISION · SAFE'}),
    b06Decor(`${p}/ARRIVAL/GATE-S`,'south machine-vision checkpoint jamb',[6.88,e+1.38,-1.91],
      'M-STEEL-DARK',[.20,2.48,.16],'fixed south architectural jamb of the robotics checkpoint frame'),
    b06Decor(`${p}/ARRIVAL/GATE-N`,'north machine-vision checkpoint jamb',[6.88,e+1.38,-.09],
      'M-STEEL-DARK',[.20,2.48,.16],'fixed north architectural jamb of the robotics checkpoint frame'),
    b06Decor(`${p}/ARRIVAL/GATE-HEAD`,'machine-vision checkpoint head',[6.88,e+2.68,-1.00],
      'M-SAFETY-YELLOW',[.20,.18,1.98],'fixed architectural head tying the two robotics checkpoint jambs together'),
    fixture(`${p}/ARRIVAL/ROBOT-DEMO`,'wall-bay robot and vision demonstrator','PF-ROBOTICS',[6.58,e+.15,-.98],
      'M-LAB-BLUE','multipart robot, tool board and machine-vision demonstrator beneath the telemetry displays',
      {yaw:PI/2,size:[.72,.68,.36],collision:'none'}),
    b06Decor(`${p}/ARRIVAL/TOOL-RAIL`,'robot end-effector display rail',[6.86,e+.80,-.38],
      'M-STAINLESS',[.16,.16,.62],'fixed rail carrying interchangeable gripper and vision-tool silhouettes'),
    b06Decor(`${p}/ARRIVAL/POWER`,'robot-cell isolated power rail',[6.92,e+2.58,-1.00],
      'M-SAFETY-YELLOW',[.12,.12,1.70],'integrated isolated power, data and emergency-stop identity'),
  ];
}

function b06CoreRooms(level,e,p) {
  const sw=[-7.1,-4.4,-10.6,-6.3],ne=[1.1,7.1,4.7,10.6];
  return [
    room(`${p}/STAIR-SW`,'西南安全楼梯',sw,'service',[
      doorway(`${p}/STAIR-SW/EXIT`,'west',[-7.5,e,-8.45],1.2,'campus-service',{emergencyOnly:true}),
      doorway(`${p}/STAIR-SW/TO-WS`,'north',[-6.5,e,-6.3],1.2,`${p}/WS`),
    ],[
      fixture(`${p}/STAIR-SW/FIX`,'compact protected dog-leg stair','PF-STAIR',[-5.2,e,-8.85],
        'M-TERRAZZO','secondary egress with clear north and west landings',{size:[1.55,3.3,2.25]}),
      fixture(`${p}/STAIR-SW/CLEAN`,'recessed cleaning cupboard','PF-CLEANING',[-6.55,e,-10.12],
        'M-STEEL','janitorial storage outside both stair landings',{size:[.72,2.0,.54]}),
      b06Decor(`${p}/STAIR-SW/STRIPE`,'high-contrast stair threshold',[-7.0,e+.02,-8.45],
        'M-SAFETY-YELLOW',[.18,.025,2.3],'visual and tactile egress warning'),
      b06Sign(`${p}/STAIR-SW/SIGN`,'southwest stair identity',[-4.45,e+1.65,-8.45],
        `西南楼梯 · SW STAIR · ${level}F`,'protected-egress wayfinding',{yaw:-PI/2,size:[1.9,.34,.05]}),
      fixture(`${p}/STAIR-SW/LIGHT`,'sealed protected-stair ceiling light','PF-CEILING-LIGHT',[-5.35,e+3.20,-8.45],
        'M-WALL-WHITE','authored landing illumination inside the southwest protected stair',
        {temperatureK:4000,lumens:1700,size:[.72,.055,.42],collision:'none'}),
      fixture(`${p}/STAIR-SW/EMERGENCY`,'battery-backed protected-stair light','PF-EMERGENCY-LIGHT',[-4.52,e+2.38,-7.10],
        'M-WALL-WHITE','emergency illumination at the protected approach door',{yaw:-PI/2,collision:'none'}),
    ]),
    room(`${p}/CORE-NE`,'玻璃楼梯 · 电梯 · 卫生间',ne,'service',[
      doorway(`${p}/CORE-NE/D-COR`,'west',[1.1,e,5.70],1.2,`${p}/CORRIDOR`),
    ],[
      fixture(`${p}/CORE-NE/STAIR`,'glass-tower protected stair','PF-STAIR',[5.25,e,8.35],
        'M-TERRAZZO','primary protected egress with an unobstructed west landing',{size:[2.25,3.3,4.15]}),
      fixture(`${p}/CORE-NE/LIFT`,'accessible lift','PF-LIFT',[2.15,e,9.25],
        'M-STEEL','accessible vertical circulation',{size:[1.65,2.45,1.55],levels:[1,2,3,4]}),
      fixture(`${p}/CORE-NE/T1`,'accessible toilet','PF-TOILET',[2.15,e,7.10],
        'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
      fixture(`${p}/CORE-NE/B1`,'washbasin','PF-BASIN',[3.25,e,5.35],
        'M-CERAMIC','hand washing'),
      fixture(`${p}/CORE-NE/ELEC`,'floor services cabinet','PF-FILE-CABINET',[6.55,e,5.25],
        'M-STEEL-DARK','electrical and laboratory services',{size:[.65,1.8,.35]}),
      b06Decor(`${p}/CORE-NE/WC-SCREEN`,'washroom privacy return',[3.68,e+1.35,5.55],
        'M-WALL-WARM',[.06,2.55,1.35],'architectural privacy screen beside the washbasin'),
      b06Decor(`${p}/CORE-NE/GLASS`,'full-height glass stair-tower reveal',[7.04,e+1.72,7.7],
        'M-GLASS',[.05,3.15,4.75],'daylight and a visible science-building stair'),
      b06Decor(`${p}/CORE-NE/BLUE`,'blue lift-and-stair portal',[1.16,e+1.62,8.4],
        'M-LAB-BLUE',[.06,2.85,3.7],'vertical circulation identity'),
      b06Sign(`${p}/CORE-NE/LEVEL`,'large floor marker',[1.12,e+2.65,6.2],
        `${level}层 · SCIENCE ${level}F`,'lift and stair floor confirmation',{yaw:PI/2,size:[1.9,.4,.05]}),
      fixture(`${p}/CORE-NE/LIGHT`,'sealed lift-and-stair core ceiling light','PF-CEILING-LIGHT',[4.15,e+3.20,7.65],
        'M-WALL-WHITE','authored illumination inside the northeast lift and protected-stair core',
        {temperatureK:4000,lumens:2100,size:[1.10,.055,.42],collision:'none'}),
    ]),
  ];
}

// Wave-two science rooms are planned as individual work environments rather than a shared
// furniture grid.  Every floor object below has a measured declared footprint; continuous items
// are composed prefabs, while simple PF-WALL-RUN pieces are reserved for genuine architectural
// floor inlays, glazing rails and overhead service rails.
function b06v2Identity(prefix,e,b,label,accent='M-LAB-BLUE') {
  const [x0,x1,,z1]=b,cx=(x0+x1)/2;
  return [
    fixture(`${prefix}/BOARD`,'laboratory teaching and procedure board','PF-WHITEBOARD',
      [cx,e+1.72,z1-.07],'M-WHITEBOARD','procedures, live data and pre-lab briefing',
      {yaw:PI,size:[3.25,1.18,.06],collision:'none'}),
    ...b06RoomFront(prefix,e,b,label,accent),
  ];
}

function b06v2WetTeaching(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    ...b06v2Identity(prefix,e,b,'普通教学实验室 · WET LAB'),
    fixture(`${prefix}/ISLAND`,'four-position wet-lab island','PF-LAB-BENCH',[cx,e,cz],
      'M-LAB-BLUE','standing practical work with a 1.50 m clear aisle at each end',{size:[3.0,.92,.90]}),
    fixture(`${prefix}/WALL-BENCH`,'wet-lab service bench','PF-LAB-BENCH',[cx-.05,e,z1-.45],
      'M-STAINLESS','balances, glassware and low-risk preparation',{size:[2.1,.92,.68]}),
    fixture(`${prefix}/SINK`,'dedicated wet-lab sink','PF-LAB-SINK',[x0+1.25,e,z1-.45],
      'M-STAINLESS','glassware and equipment washing'),
    fixture(`${prefix}/PPE`,'lab-coat and goggle lockers','PF-LOCKERS',[x0+.28,e,z1-1.80],
      'M-LAB-BLUE','PPE at the controlled threshold',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'eyewash and emergency shower','PF-EYEWASH',[x1-.45,e,z1-.55],
      'M-SAFETY-YELLOW','emergency decontamination with a dedicated clear approach',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z1-.55,1.20,1.20,
      'eyewash clear floor','unobstructed emergency-shower and eyewash approach'),
    fixture(`${prefix}/WASTE`,'segregated wet-lab waste','PF-BIN',[x1-.48,e,z0+.55],
      'M-STEEL','glass, general and controlled waste streams'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,cz,3.05],[cx-.05,z1-.45,2.15]],4300),
  ];
}

function b06v2Prep(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'准备、收货与安全储藏 · PREP','M-LAB-BLUE'),
    fixture(`${prefix}/CLEAN`,'serviced clean preparation island','PF-LAB-BENCH',[cx+.05,e,z0+4.00],
      'M-STAINLESS','clean glassware and teaching-set preparation with drawers, service rail and task fittings',
      {size:[2.5,.92,.82]}),
    fixture(`${prefix}/DIRTY`,'receiving wash-and-breakdown island','PF-SINK-DOUBLE',[cx+.05,e,z1-2.60],
      'M-STAINLESS','recognizable twin-bowl equipment wash, incoming inspection and breakdown station',
      {size:[2.4,.92,.82]}),
    fixture(`${prefix}/SINK`,'double preparation sink','PF-SINK-DOUBLE',[x0+.70,e,z1-1.20],
      'M-STAINLESS','equipment washing',{yaw:-PI/2}),
    fixture(`${prefix}/FRIDGE`,'preparation refrigerator','PF-MED-FRIDGE',[x1-.45,e,z1-.80],
      'M-CLINIC','short-term reagent and sample holding'),
    fixture(`${prefix}/CART`,'receiving cart','PF-SHELF',[x0+.28,e,z0+2.60],
      'M-STEEL','incoming consumables and teaching sets',{yaw:-PI/2,size:[.65,1.15,.42]}),
    fixture(`${prefix}/STORE`,'glazed clean-equipment cabinet','PF-CLINIC-CABINET',[x0+.28,e,z1-3.45],
      'M-CLINIC','sealed clean glassware, drying trays and consumables in a composed storage cabinet',
      {yaw:-PI/2,size:[2.1,2.0,.45]}),
    fixture(`${prefix}/PPE`,'preparation-room PPE lockers','PF-LOCKERS',[x0+.28,e,(z0+z1)/2],
      'M-LAB-BLUE','coats, gloves and receiving PPE',{yaw:-PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'preparation eyewash','PF-EYEWASH',[x1-.45,e,z0+.80],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z0+.80,1.20,1.20,
      'preparation eyewash clear floor','unobstructed emergency eyewash approach'),
    b06ClearZone(`${prefix}/CLEAN-ZONE`,e,cx+.05,z0+4.00,3.0,1.30,
      'clean preparation floor field','clean workflow identity','M-EPOXY'),
    b06ClearZone(`${prefix}/DIRTY-ZONE`,e,cx,z1-2.60,3.0,1.30,
      'receiving floor field','receiving and wash workflow','M-TILE-DARK'),
    b06Sign(`${prefix}/FLOW`,'clean and receiving workflow sign',[cx,e+1.65,z1-.07],
      '清洁 ← · 清洗 →','preparation-room workflow',{yaw:0,size:[2.3,.32,.05]}),
    b06Sign(`${prefix}/CLEAN-LABEL`,'clean preparation island identity',[cx+.05,e+1.20,z0+4.00],
      '清洁准备','labels the clean set-up island in the review composition',
      {yaw:0,size:[.92,.22,.04]}),
    b06Sign(`${prefix}/RECEIVE-LABEL`,'receiving and wash island identity',[cx+.05,e+1.20,z1-2.60],
      '收货清洗','labels the dirty receiving stream in the review composition',
      {yaw:0,size:[.92,.22,.04]}),
    fixture(`${prefix}/BATCH-BOARD`,'receiving batch and clean-set status board','PF-SCREEN',
      [x1-.035,e+1.55,z1-4.00],'M-SCREEN','delivery checks, wash status and prepared teaching sets',
      {yaw:PI/2,size:[1.10,.72,.04],collision:'none',text:'收货 · 套件'}),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx+.05,z0+4.00,2.65],[cx+.05,z1-2.60,2.65]],4300),
  ];
}

function b06v2SafetyStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    ...b06RoomFront(prefix,e,b,'安全培训与展示 · SAFETY DEMO','M-SAFETY-YELLOW'),
    fixture(`${prefix}/SCREEN`,'large safety demonstration display','PF-SCREEN',[cx,e+1.72,z1-.06],
      'M-SCREEN','hazard induction and close-up demonstrations',{yaw:PI,size:[3.5,1.65,.05],collision:'none'}),
    fixture(`${prefix}/DEMO`,'instructor safety demonstration bench','PF-LAB-BENCH',[cx+.50,e,z1-.90],
      'M-LAB-BLUE','contained instructor-led demonstrations',{size:[2.8,.92,.85]}),
    fixture(`${prefix}/PODIUM`,'science teaching podium','PF-TEACHER-PODIUM',[x1-.65,e,z1-2.05],
      'M-STEEL-DARK','demonstration controls and emergency cutoff'),
    fixture(`${prefix}/PPE`,'visitor PPE lockers','PF-LOCKERS',[x1-.28,e,z0+.90],
      'M-LAB-BLUE','visitor coats and goggles',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'training eyewash and shower','PF-EYEWASH',[x0+.45,e,z0+.70],
      'M-SAFETY-YELLOW','hands-on emergency-equipment induction',{yaw:PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x0+1.40,z0+.70,1.20,1.20,
      'training shower clear floor','unobstructed hands-on emergency-equipment zone'),
  ];
  let n=0;
  for(const z of [z0+2.40,z0+4.80]) for(const x of [x0+1.75,x1-1.55])
    out.push(fixture(`${prefix}/SEAT${pad(++n)}`,'spaced safety-induction chair','PF-LECTURE-SEAT',
      [x,e,z],n%2?'M-FABRIC-BLUE':'M-FABRIC-RED','induction seat with 1.20 m side aisles'));
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+2.4,3.4],[cx,z0+4.8,3.4],[cx+.5,z1-.9,2.8]],4000,'M-SAFETY-YELLOW'));
  return out;
}

function b06v2Lobby(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'科学门厅 · SCIENCE LOBBY','M-LAB-BLUE'),
    fixture(`${prefix}/DESK`,'compact composed science reception counter','PF-SERVICE-COUNTER',[x1-1.42,e,z1-.95],
      'M-LAB-BLUE','arrival, visitor PPE and laboratory access',{size:[1.15,1.00,.52]}),
    fixture(`${prefix}/DIR`,'four-floor science directory','PF-DIRECTORY',[x1-.38,e,2.25],
      'M-SCREEN','laboratory wayfinding',{yaw:-PI/2,text:'安全 · 化学 · 生物 · 创新'}),
    fixture(`${prefix}/DEMO`,'student prototype showcase','PF-ROBOTICS',[x0+1.30,e,z1-.82],
      'M-STEEL-DARK','visible student-built robot and sensor prototype',{size:[1.0,.86,.56]}),
    fixture(`${prefix}/STATUS`,'science lobby access and laboratory-status display','PF-SCREEN',[cx,e+1.46,z1-.09],
      'M-SCREEN','visitor check-in, floor access and current laboratory availability',
      {yaw:0,size:[1.62,.70,.05],text:'访客 · 实验室',collision:'none'}),
    fixture(`${prefix}/BENCH`,'science lobby waiting bench','PF-BENCH',[x0+1.90,e,z0+.80],
      'M-FABRIC-BLUE','visitor and student waiting clear of the exterior-door approach',
      {yaw:0,facing:'north',facesPoint:[x0+1.90,z1],size:[1.45,.84,.52]}),
    fixture(`${prefix}/PLANT`,'science lobby specimen plant','PF-PLANT',[x1-1.85,e,z0+.90],
      'M-PLANT','biophilic contrast to technical finishes'),
    fixture(`${prefix}/AED`,'public AED','PF-AED',[x1-.08,e+1.25,z1-1.90],
      'M-SAFETY-RED','public defibrillator',{yaw:-PI/2,collision:'none'}),
    b06Decor(`${prefix}/WELCOME`,'architectural blue reception datum',[cx,e+1.55,z1-.045],
      'M-LAB-BLUE',[4.7,2.72,.055],'science-building arrival wall'),
    b06Sign(`${prefix}/WELCOME-SIGN`,'science and innovation identity',[cx,e+2.04,z1-.08],
      '科学创新楼','primary science-building identity',{yaw:0,size:[2.40,.32,.05]}),
    b06Decor(`${prefix}/SHOWCASE/GLASS-FRONT`,'fixed prototype-showcase glazing wall',[x0+1.30,e+1.04,z1-.94],
      'M-GLASS',[1.22,1.34,.045],'architectural glazed exhibition niche around the student prototype'),
    b06Decor(`${prefix}/SHOWCASE/GLASS-WEST`,'fixed prototype-showcase glazing jamb',[x0+.74,e+1.04,z1-.63],
      'M-GLASS',[.045,1.34,.64],'architectural glazed exhibition niche side jamb'),
    b06Decor(`${prefix}/SHOWCASE/GLASS-EAST`,'fixed prototype-showcase glazing jamb',[x0+1.86,e+1.04,z1-.63],
      'M-GLASS',[.045,1.34,.64],'architectural glazed exhibition niche side jamb'),
    b06Decor(`${prefix}/INLAY`,'brass circuit floor inlay',[cx,e+.016,z0+.52],
      'M-BRASS',[3.9,.022,.07],'arrival axis inspired by a circuit trace'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx+.3,z1-.85,2.1],[cx+.3,z0+.45,2.0]],3800),
  ];
}

function b06v2Analytical(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    ...b06v2Identity(prefix,e,b,'分析化学 · ANALYTICAL','M-SAFETY-YELLOW'),
    fixture(`${prefix}/ISLAND`,'analytical preparation island','PF-LAB-BENCH',[cx,e,cz],
      'M-LAB-BLUE','sample preparation with 1.45 m hood-side clearance',{size:[3.0,.92,.90]}),
    ...b06ComposedFumeHood(`${prefix}/HOOD`,e,[cx,z0+.60],0,'analytical fume hood',
      'contained standards and solvent preparation','M-SAFETY-YELLOW'),
    fixture(`${prefix}/SPECTROMETER`,'spectrometry control station','PF-COMPUTER-DESK',[x0+1.75,e,z1-.45],
      'M-STEEL-DARK','spectrometer control and analysis',{size:[1.25,.76,.68]}),
    fixture(`${prefix}/CHROM`,'chromatography control station','PF-COMPUTER-DESK',[x0+3.30,e,z1-.45],
      'M-STEEL-DARK','chromatography control and analysis',{size:[1.25,.76,.68]}),
    fixture(`${prefix}/REAGENT`,'contained analytical reagent cabinet','PF-FILE-CABINET',[x1-.45,e,z0+.55],
      'M-SAFETY-YELLOW','small-volume compatible standards',{size:[.80,1.55,.48]}),
    fixture(`${prefix}/PPE`,'analytical PPE lockers','PF-LOCKERS',[x0+.28,e,z1-1.65],
      'M-LAB-BLUE','coats, goggles and gloves',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'analytical eyewash and shower','PF-EYEWASH',[x1-.45,e,z1-.55],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z1-.55,1.20,1.20,
      'analytical eyewash clear floor','unobstructed emergency decontamination approach'),
    b06Sign(`${prefix}/METHODS`,'analytical methods sign',[cx,e+2.40,z1-.10],
      '光谱 · 色谱 · 质量分析','analytical methods',{yaw:PI,size:[2.6,.34,.05]}),
    b06ExtractHeader(`${prefix}/HOOD-EXTRACT`,e,[cx,z0+.30],[1.92,.30,.44],'M-SAFETY-YELLOW'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,cz,3.05],[cx,z0+.60,1.55],[cx-.25,z1-.45,3.0]],4400,'M-SAFETY-YELLOW'),
  ];
}

function b06v2Organic(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    ...b06v2Identity(prefix,e,b,'有机化学 · ORGANIC','M-SAFETY-YELLOW'),
    fixture(`${prefix}/ISLAND-A`,'organic synthesis island A','PF-LAB-BENCH',[cx+.60,e,z0+3.90],
      'M-LAB-BLUE','assembly and observation with a 1.48 m hood-side aisle',{size:[2.4,.92,.90]}),
    fixture(`${prefix}/ISLAND-B`,'organic work-up and glassware-wash island','PF-SINK-DOUBLE',
      [cx+.45,e,z1-2.45],'M-STAINLESS',
      'recognizable twin-bowl work-up, quench and glassware-wash station with a clear opposing-bench aisle',
      {size:[2.3,.92,.78]}),
    fixture(`${prefix}/GLASSWARE-A`,'clamped reaction-glassware staging rack','PF-TRAY-RACK',
      [cx+.60,e+.94,z0+3.90],'M-STEEL-DARK',
      'raised multi-tier rack of labelled flasks, clamps and clean reaction vessels on synthesis island A',
      {yaw:0,size:[.72,.48,.34],collision:'none'}),
    fixture(`${prefix}/GLASSWARE-B`,'draining glassware and quench-tool rack','PF-TRAY-RACK',
      [cx+.45,e+.94,z1-2.45],'M-STAINLESS',
      'raised draining rack and separated quench tools immediately above the twin-bowl work-up sink',
      {yaw:PI,size:[.64,.46,.32],collision:'none'}),
    ...b06ComposedFumeHood(`${prefix}/HOOD-A`,e,[x0+.48,z0+1.05],-PI/2,'solvent dispensing fume hood',
      'contained solvent dispensing and measured addition','M-SAFETY-YELLOW'),
    ...b06ComposedFumeHood(`${prefix}/HOOD-B`,e,[x0+.48,(z0+z1)/2],-PI/2,'organic synthesis fume hood',
      'contained synthesis, reflux and inert-atmosphere work','M-SAFETY-YELLOW'),
    ...b06ComposedFumeHood(`${prefix}/HOOD-C`,e,[x0+.48,z1-1.05],-PI/2,'work-up fume hood',
      'contained extraction, evaporation and quench work','M-SAFETY-YELLOW'),
    fixture(`${prefix}/HOOD-B/APPARATUS`,'clamped reflux and condenser apparatus','PF-TRAY-RACK',
      [x0+.96,e+.86,(z0+z1)/2],'M-STEEL-DARK',
      'multipart reaction vessels, condenser support and labelled service connections visibly contained behind the synthesis sash',
      {yaw:-PI/2,size:[.38,.52,.28],collision:'none'}),
    fixture(`${prefix}/HOOD-C/APPARATUS`,'separating and rotary-work-up apparatus','PF-TRAY-RACK',
      [x0+.96,e+.86,z1-1.05],'M-STAINLESS',
      'multipart draining glassware, clamps and quench tools visibly contained behind the work-up sash',
      {yaw:-PI/2,size:[.38,.50,.28],collision:'none'}),
    fixture(`${prefix}/FLAMMABLE`,'flammable-solvent cabinet','PF-FILE-CABINET',[x1-.45,e,z1-3.60],
      'M-SAFETY-YELLOW','compatible solvent storage',{yaw:PI/2,size:[.85,1.55,.48]}),
    fixture(`${prefix}/PPE`,'organic-lab PPE lockers','PF-LOCKERS',[x1-.28,e,z1-1.00],
      'M-LAB-BLUE','coats, goggles and gloves',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'organic-lab eyewash and shower','PF-EYEWASH',[x1-.45,e,z0+.80],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z0+.80,1.20,1.20,
      'organic-lab eyewash clear floor','unobstructed emergency decontamination approach'),
    b06Sign(`${prefix}/SYNTHESIS-FLOW`,'organic synthesis workflow wall',[x1-.035,e+1.62,(z0+z1)/2],
      '称量 → 合成 → 后处理','distinguishes the three contained hood operations and work-up island',
      {yaw:-PI/2,size:[1.95,.30,.05]}),
    b06ExtractHeader(`${prefix}/HOOD-EXTRACT`,e,[x0+.16,(z0+z1)/2],[.30,.30,(z1-z0)-1.0],'M-SAFETY-YELLOW'),
  ];
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,[[cx+.60,z0+3.90,2.45],[cx+.45,z1-2.45,2.45],
    [x0+.48,(z0+z1)/2,3.2]],4300,'M-SAFETY-YELLOW'));
  return out;
}

function b06v2Foundation(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'基础化学 · FOUNDATION','M-SAFETY-YELLOW'),
    fixture(`${prefix}/SCREEN`,'foundation experiment display','PF-SCREEN',[cx,e+1.72,z1-.06],
      'M-SCREEN','live titration and reaction demonstration',{yaw:PI,size:[3.1,1.45,.05],collision:'none'}),
    fixture(`${prefix}/ISLAND-A`,'foundation chemistry island A','PF-LAB-BENCH',[cx,e,z0+1.90],
      'M-LAB-BLUE','standing introductory practical work',{size:[2.4,.92,.90]}),
    fixture(`${prefix}/ISLAND-B`,'foundation chemistry island B','PF-LAB-BENCH',[cx,e,z1-1.80],
      'M-LAB-BLUE','standing introductory practical work',{size:[2.4,.92,.90]}),
    ...b06ComposedFumeHood(`${prefix}/HOOD`,e,[x1-.48,(z0+z1)/2],PI/2,'foundation demonstration fume hood',
      'contained instructor demonstration','M-SAFETY-YELLOW'),
    fixture(`${prefix}/PPE`,'foundation-lab PPE lockers','PF-LOCKERS',[x1-.28,e,z1-.80],
      'M-LAB-BLUE','student coats and goggles',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'foundation eyewash and shower','PF-EYEWASH',[x1-.45,e,z0+.70],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z0+.70,1.20,1.20,
      'foundation eyewash clear floor','unobstructed emergency decontamination approach'),
    fixture(`${prefix}/WASTE`,'segregated chemistry waste','PF-BIN',[x0+.45,e,z1-.55],
      'M-SAFETY-YELLOW','controlled introductory-lab waste'),
    b06ExtractHeader(`${prefix}/HOOD-EXTRACT`,e,[x1-.16,(z0+z1)/2],[.30,.30,2.20],'M-SAFETY-YELLOW'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+1.90,2.45],[cx,z1-1.80,2.45],[x1-.48,(z0+z1)/2,2.0]],4300,'M-SAFETY-YELLOW'),
  ];
}

function b06v2ChemicalStore(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,contents=[
    ...b06RoomFront(prefix,e,b,'化学品分类储藏 · CHEMICAL STORE','M-SAFETY-YELLOW'),
  ];
  const types=[['FLAM','flammable-liquid cabinet','M-SAFETY-YELLOW'],['ACID','acid cabinet','M-LAB-BLUE'],
    ['OX','oxidizer cabinet','M-WALL-GREEN'],['TOX','toxic-material cabinet','M-STEEL-DARK']];
  types.forEach(([id,label,material],i)=>contents.push(fixture(`${prefix}/${id}`,label,'PF-FILE-CABINET',
    [x0+.90+i*1.20,e,z1-.40],material,'locked compatible chemical segregation',{size:[.85,1.85,.55]})));
  contents.push(
    fixture(`${prefix}/SECONDARY`,'secondary-containment shelving','PF-SHELF',[x1-.30,e,z0+2.00],
      'M-STEEL','sealed trays for small compatible containers',{yaw:PI/2,size:[1.35,2.0,.50]}),
    fixture(`${prefix}/SPILL`,'spill-response cabinet','PF-FIRST-AID',[x1-.08,e+1.20,z0+.55],
      'M-SAFETY-YELLOW','spill-response PPE and absorbent',{yaw:-PI/2,collision:'none'}),
    b06ClearZone(`${prefix}/CURB`,e,cx,z0+.38,4.5,.16,'chemical-store containment curb',
      'architectural secondary-containment threshold'),
    b06Sign(`${prefix}/COMPAT`,'chemical compatibility sign',[cx,e+2.35,z1-.06],
      '易燃 · 腐蚀 · 氧化剂 · 有毒','chemical segregation and compatibility',{yaw:PI,size:[3.2,.36,.05]}),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z1-.85,4.3],[x1-.55,z0+1.7,1.7]],4200,'M-SAFETY-YELLOW'),
  );
  return contents;
}

function b06v2Biology(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    ...b06v2Identity(prefix,e,b,'生物教学 · BIOLOGY','M-WALL-GREEN'),
    fixture(`${prefix}/ISLAND`,'biology teaching island','PF-LAB-BENCH',[cx,e,cz],
      'M-CLINIC','standing specimen and cell practical work',{size:[3.0,.92,.90]}),
    fixture(`${prefix}/WALL-BENCH`,'clean biology service bench','PF-LAB-BENCH',[cx-.05,e,z1-.45],
      'M-CLINIC','clean preparation and staining',{size:[2.1,.92,.68]}),
    fixture(`${prefix}/SINK`,'biology hand and equipment sink','PF-LAB-SINK',[x0+1.25,e,z1-.45],
      'M-STAINLESS','hand and equipment washing'),
    fixture(`${prefix}/FRIDGE`,'teaching sample refrigerator','PF-MED-FRIDGE',[x1-.45,e,z0+.55],
      'M-CLINIC','chilled teaching samples'),
    fixture(`${prefix}/FREEZER`,'teaching sample freezer','PF-FREEZER',[x1-1.50,e,z0+.55],
      'M-STAINLESS','frozen teaching specimens'),
    fixture(`${prefix}/PPE`,'biology PPE lockers','PF-LOCKERS',[x0+.28,e,z1-1.80],
      'M-WALL-GREEN','coats, gloves and eye protection',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'biology eyewash and shower','PF-EYEWASH',[x1-.45,e,z1-.55],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z1-.55,1.20,1.20,
      'biology eyewash clear floor','unobstructed emergency decontamination approach'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,cz,3.05],[cx-.05,z1-.45,2.15]],4200,'M-WALL-GREEN'),
  ];
}

function b06v2Microscopy(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    ...b06RoomFront(prefix,e,b,'显微镜与细胞 · MICROSCOPY','M-STEEL-DARK'),
    fixture(`${prefix}/SCREEN`,'live microscope image wall','PF-SCREEN',[cx,e+1.72,z1-.06],
      'M-SCREEN','shared digital specimen view',{yaw:0,size:[3.0,1.5,.05],collision:'none',text:'细胞成像'}),
    b06Sign(`${prefix}/MODES`,'microscopy modes and sample workflow',[cx,e+2.60,z1-.09],
      '明场 · 荧光 · 相差','makes the imaging programme readable above the shared image wall',
      {yaw:0,size:[2.30,.28,.05]}),
    fixture(`${prefix}/HANDWASH`,'microscopy handwash','PF-HANDWASH',[x1-.45,e,z0+.65],
      'M-STAINLESS','clean entry hand hygiene'),
    fixture(`${prefix}/PPE`,'microscopy coat lockers','PF-LOCKERS',[x0+.28,e,(z0+z1)/2],
      'M-STEEL-DARK','coats and low-lint covers',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/SLIDES`,'prepared-slide archive','PF-FILE-CABINET',[x0+.55,e,z1-.55],
      'M-STEEL-DARK','indexed teaching slides',{size:[.85,1.45,.48]}),
    fixture(`${prefix}/IMAGE`,'digital imaging workstation','PF-COMPUTER-DESK',[x1-.75,e,z1-.65],
      'M-STEEL-DARK','image capture and annotation',{size:[1.15,.76,.68]}),
  ];
  const stations=[
    [x0+1.80,z0+1.60,0,'bright-field teaching microscope','M-CLINIC'],
    [x1-1.80,z0+1.60,PI,'phase-contrast teaching microscope','M-LAB-BLUE'],
    [x0+1.80,(z0+z1)/2,PI/2,'shielded fluorescence microscope','M-STEEL-DARK'],
    [x0+1.80,z1-1.80,0,'live-cell imaging microscope','M-WALL-GREEN'],
    [x1-1.80,z1-1.80,PI,'digital slide-scanning microscope','M-SCREEN'],
  ];
  stations.forEach(([x,z,yaw,label,material],i)=>out.push(
    fixture(`${prefix}/MIC${pad(i+1)}`,label,'PF-MICROSCOPE',[x,e,z],material,
      'distinct imaging mode with 1.20 m side and lateral aisles',{yaw,size:[1.20,.92,.72]}),
    b06Sign(`${prefix}/MIC${pad(i+1)}/MODE`,'microscope mode plate',[x,e+1.08,z],
      ['明场','相差','荧光','活细胞','切片扫描'][i],'individual imaging-mode identification',
      {yaw,size:[.52,.18,.035]}),
  ));
  out.push(...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+1.60,4.0],[x0+1.8,(z0+z1)/2,1.4],
    [cx,z1-1.80,4.0]],3600,'M-STEEL-DARK'));
  return out;
}

function b06v2Microbiology(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06v2Identity(prefix,e,b,'微生物 · MICROBIOLOGY','M-WALL-GREEN'),
    fixture(`${prefix}/ISLAND-A`,'microbiology clean-work island A','PF-LAB-BENCH',[cx,e,z0+1.90],
      'M-CLINIC','aseptic preparation and observation',{size:[2.6,.92,.82]}),
    fixture(`${prefix}/ISLAND-B`,'microbiology clean-work island B','PF-LAB-BENCH',[cx,e,z1-1.80],
      'M-CLINIC','contained teaching-culture handling',{size:[2.6,.92,.82]}),
    ...b06ComposedFumeHood(`${prefix}/BSC`,e,[x1-.48,(z0+z1)/2],PI/2,'class-II biological safety cabinet',
      'contained aseptic teaching work','M-WALL-GREEN'),
    fixture(`${prefix}/HANDWASH`,'dedicated microbiology handwash','PF-HANDWASH',[x0+1.75,e,z1-2.70],
      'M-STAINLESS','controlled-entry hand hygiene'),
    fixture(`${prefix}/INCUBATOR`,'contained culture incubator','PF-FILE-CABINET',[x1-.50,e,z0+2.60],
      'M-CLINIC','sealed teaching cultures',{size:[.82,1.65,.52]}),
    fixture(`${prefix}/FRIDGE`,'microbiology sample refrigerator','PF-MED-FRIDGE',[x1-.50,e,z1-2.80],
      'M-CLINIC','short-term teaching samples'),
    fixture(`${prefix}/PPE`,'microbiology PPE lockers','PF-LOCKERS',[x1-.28,e,z1-.80],
      'M-WALL-GREEN','coats, gloves and eye protection',{yaw:PI/2,size:[1.15,1.9,.48]}),
    fixture(`${prefix}/EYE`,'microbiology eyewash and shower','PF-EYEWASH',[x1-.45,e,z0+.70],
      'M-SAFETY-YELLOW','emergency decontamination',{yaw:-PI/2}),
    b06ClearZone(`${prefix}/EYE-CLEAR`,e,x1-1.40,z0+.70,1.20,1.20,
      'microbiology eyewash clear floor','unobstructed emergency decontamination approach'),
    fixture(`${prefix}/WASTE`,'biohazard waste station','PF-BIN',[x0+.45,e,z0+.55],
      'M-SAFETY-YELLOW','controlled microbiology waste'),
    b06Sign(`${prefix}/PRACTICE`,'aseptic-practice sign',[cx,e+2.40,z1-.10],
      '无菌操作 · 受控培养','aseptic workflow and culture control',{yaw:PI,size:[2.7,.34,.05]}),
    b06ExtractHeader(`${prefix}/BSC-EXTRACT`,e,[x1-.16,(z0+z1)/2],[.30,.30,2.20],'M-WALL-GREEN'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+1.90,2.65],[cx,z1-1.80,2.65],
      [x1-.48,(z0+z1)/2,2.0]],4100,'M-WALL-GREEN'),
  ];
}

function b06v2ColdRoom(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'冷藏与样品 · SAMPLE COLD ROOM','M-SCREEN'),
    fixture(`${prefix}/FRIDGE-A`,'4°C sample refrigerator','PF-MED-FRIDGE',[x1-.45,e,z0+.70],
      'M-CLINIC','chilled samples'),
    fixture(`${prefix}/FREEZER`,'−20°C sample freezer','PF-FREEZER',[x1-.45,e,z0+2.00],
      'M-STAINLESS','frozen samples'),
    fixture(`${prefix}/FRIDGE-B`,'teaching sample refrigerator','PF-MED-FRIDGE',[x1-.45,e,z1-.65],
      'M-CLINIC','teaching sample chain'),
    fixture(`${prefix}/PREP`,'sealed sample preparation bench','PF-PREP-TABLE',[cx+.20,e,z1-.80],
      'M-STAINLESS','labeling and sealed sample transfer',{size:[1.6,.90,.70]}),
    fixture(`${prefix}/SHELF`,'sealed sample shelving','PF-SHELF',[cx-.10,e,z0+.35],
      'M-STEEL','sealed sample carriers and cool boxes',{size:[2.0,2.0,.48]}),
    fixture(`${prefix}/MONITOR`,'cold-chain environmental monitor','PF-DIRECTORY',[x0+.10,e+1.45,z1-.65],
      'M-SCREEN','temperature, access and alarm status',{yaw:PI/2,text:'4°C · −20°C · 样品追踪',collision:'none'}),
    b06Sign(`${prefix}/CHAIN`,'sample-chain sign',[cx,e+2.40,z1-.08],
      '样品链 · SAMPLE CHAIN','cold-chain workflow',{yaw:PI,size:[2.4,.32,.05]}),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx+.2,z1-.80,1.8],[x1-.45,z0+2.0,2.5]],4000,'M-SCREEN'),
  ];
}

function b06v2Physics(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  return [
    ...b06v2Identity(prefix,e,b,'物理与电子 · PHYSICS','M-STEEL-DARK'),
    fixture(`${prefix}/OPTICS-BENCH`,'vibration-controlled optics bench','PF-LAB-BENCH',[cx,e,cz],
      'M-STEEL-DARK','aligned optics, mechanics and sensor experiments',{size:[3.2,.92,.80]}),
    fixture(`${prefix}/SCOPE-A`,'oscilloscope workstation A','PF-COMPUTER-DESK',[x0+1.70,e,z1-.45],
      'M-STEEL-DARK','electronic measurement and data capture',{size:[1.30,.76,.68]}),
    fixture(`${prefix}/SCOPE-B`,'oscilloscope workstation B','PF-COMPUTER-DESK',[x0+3.60,e,z1-.45],
      'M-STEEL-DARK','electronic measurement and data capture',{size:[1.30,.76,.68]}),
    fixture(`${prefix}/APPARATUS`,'physics apparatus shelving','PF-SHELF',[cx-.10,e,z0+.48],
      'M-STEEL','optics, mechanics and electrical kits',{size:[2.0,2.0,.48]}),
    fixture(`${prefix}/ISOLATE`,'electrical isolation cabinet','PF-FILE-CABINET',[x1-.45,e,z0+.50],
      'M-SAFETY-YELLOW','lockout and isolated electrical supplies',{size:[.80,1.55,.48]}),
    fixture(`${prefix}/PPE`,'physics safety-equipment lockers','PF-LOCKERS',[x0+.28,e,z1-1.65],
      'M-STEEL-DARK','eye protection and experiment shields',{yaw:PI/2,size:[1.15,1.9,.48]}),
    b06ClearZone(`${prefix}/OPTICS-AXIS`,e,cx,cz,.14,3.35,'optics alignment floor datum',
      'architectural alignment datum for optics experiments','M-STEEL-DARK'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,cz,3.25],[cx-.25,z1-.45,3.2]],4000,'M-STEEL-DARK'),
  ];
}

function b06v2Robotics(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'机器人制作 · ROBOTICS','M-STEEL-DARK'),
    fixture(`${prefix}/CAD-WALL`,'robot CAD and digital-twin review wall','PF-SCREEN',[cx,e+1.72,z1-.06],
      'M-SCREEN','large unmistakable robot CAD, ROS telemetry and digital-twin display',
      {yaw:0,size:[3.25,1.48,.05],text:'机器人设计',collision:'none'}),
    fixture(`${prefix}/MAKER`,'electronics fabrication and soldering bench','PF-LAB-BENCH',[cx,e,z0+4.00],
      'M-OAK','component assembly, solder extraction and sensor integration on a composed serviced bench',
      {size:[2.55,.92,.82]}),
    fixture(`${prefix}/ARM-CELL`,'articulated robot-arm integration cell','PF-ROBOTICS',[cx-.10,e,z1-2.80],
      'M-STEEL-DARK','guarded articulated-arm assembly, calibration and machine-vision integration',
      {size:[2.15,.92,.90]}),
    b06Decor(`${prefix}/ARM-CELL/GUARD-W`,'robot-cell west safety glazing',[cx-1.22,e+1.00,z1-2.80],
      'M-GLASS',[.045,1.70,1.34],'transparent guarding that gives the articulated-arm cell a readable enclosure'),
    b06Decor(`${prefix}/ARM-CELL/GUARD-E`,'robot-cell east safety glazing',[cx+1.02,e+1.00,z1-2.80],
      'M-GLASS',[.045,1.70,1.34],'transparent guarding that gives the articulated-arm cell a readable enclosure'),
    b06Sign(`${prefix}/ARM-CELL/LABEL`,'articulated arm cell identity',[cx-.10,e+1.55,z1-2.80],
      '机械臂 · 校准','distinguishes the guarded arm cell from fabrication furniture',
      {yaw:0,size:[1.12,.22,.04]}),
    fixture(`${prefix}/ROVER`,'mobile robot test rover and docking bench','PF-ROBOTICS',[cx,e,z0+1.22],
      'M-LAB-BLUE','compact wheeled-robot dock inside the marked autonomous test field',
      {yaw:PI/2,size:[1.18,.72,.68]}),
    fixture(`${prefix}/TEST-CONSOLE`,'robot test-field safety console','PF-COMPUTER-DESK',[x1-.72,e,z0+1.22],
      'M-STEEL-DARK','emergency stop, telemetry and motion-test control',{yaw:PI/2,size:[1.20,.76,.66]}),
    fixture(`${prefix}/TOOLS-A`,'robot telemetry and machine-status wall','PF-SCREEN',
      [x1-.035,e+1.68,z0+3.70],'M-SCREEN','live robot state, ROS diagnostics, arm limits and test status',
      {yaw:-PI/2,size:[1.65,1.0,.05],text:'机器人状态',collision:'none'}),
    fixture(`${prefix}/TOOLS-B`,'glazed maker materials cabinet','PF-CLINIC-CABINET',[x0+.28,e,z1-2.40],
      'M-LAB-BLUE','organized filament, electronics stock, robot components and battery-safe trays',
      {yaw:-PI/2,size:[1.35,1.9,.45]}),
    fixture(`${prefix}/CAD-A`,'CAD workstation A','PF-COMPUTER-DESK',[x0+2.00,e,z1-.55],
      'M-STEEL-DARK','mechanical CAD and robot design',{size:[1.35,.76,.68]}),
    fixture(`${prefix}/CAD-B`,'simulation and digital-twin workstation','PF-COMPUTER-DESK',[x0+3.90,e,z1-.55],
      'M-LAB-BLUE','ROS simulation, digital twin and machine control',{size:[1.15,.76,.68]}),
    fixture(`${prefix}/PARTS`,'lockable parts lockers','PF-LOCKERS',[x1-.28,e,z1-1.10],
      'M-LAB-BLUE','motors, batteries and controlled components',{yaw:PI/2,size:[1.2,1.9,.48]}),
    b06ClearZone(`${prefix}/TEST`,e,cx+.10,z0+1.20,3.0,2.00,'robot calibration floor',
      'unobstructed mobile-robot test and demonstration zone','M-RUBBER'),
    b06Decor(`${prefix}/TEST/CENTRELINE`,'mobile-robot test-field centreline',[cx+.10,e+.020,z0+1.20],
      'M-SAFETY-YELLOW',[.07,.024,1.72],'high-contrast autonomous navigation centreline'),
    b06Decor(`${prefix}/TEST/CROSSLINE`,'mobile-robot calibration crossline',[cx+.10,e+.021,z0+1.20],
      'M-SAFETY-YELLOW',[2.72,.024,.07],'high-contrast odometry and sensor calibration crossline'),
    b06Sign(`${prefix}/TEST/LABEL`,'mobile robot test-field identity',[x1-.04,e+1.32,z0+1.95],
      '移动机器人测试','marks the clear rover test area and emergency-stop console',
      {yaw:-PI/2,size:[1.18,.22,.04]}),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+4.0,2.45],[cx,z1-2.60,2.45],
      [cx-.05,z1-.55,3.2]],4000,'M-STEEL-DARK'),
  ];
}

function b06v2AIStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2,out=[
    ...b06RoomFront(prefix,e,b,'数据与人工智能 · AI LAB','M-STEEL-DARK'),
    fixture(`${prefix}/WALL`,'collaborative data display','PF-SCREEN',[cx,e+1.72,z1-.06],
      'M-SCREEN','shared model, simulation and sensor visualization',{yaw:PI,size:[3.5,1.60,.05],collision:'none'}),
  ];
  let n=0;
  for(const [z,xs] of [[z0+1.40,[x0+1.80,x1-1.80]],[(z0+z1)/2,[x1-1.80]],
    [z1-1.40,[x0+1.80,x1-1.80]]]) for(const x of xs)
    out.push(fixture(`${prefix}/PC${pad(++n)}`,'AI development workstation','PF-COMPUTER-DESK',
      [x,e,z],'M-STEEL-DARK','machine-learning development and visualization',{size:[1.20,.76,.72]}));
  out.push(
    fixture(`${prefix}/SERVER-A`,'edge-compute cabinet A','PF-FILE-CABINET',[x1-.50,e,z0+3.15],
      'M-STEEL-DARK','local robotics and AI compute',{size:[.78,2.0,.55]}),
    fixture(`${prefix}/SERVER-B`,'edge-compute cabinet B','PF-FILE-CABINET',[x1-.50,e,z1-2.80],
      'M-STEEL-DARK','local robotics and AI compute',{size:[.78,2.0,.55]}),
    b06ClearZone(`${prefix}/DEMO`,e,cx,z1-.55,2.8,.75,'AI sensor demonstration floor',
      'unobstructed standing sensor and autonomous-system demonstration zone','M-RUBBER'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx,z0+1.40,4.0],[cx,(z0+z1)/2,4.0],[cx,z1-1.40,4.0]],4000,'M-STEEL-DARK'),
  );
  return out;
}

function b06v2ResearchStudio(prefix,e,b) {
  const [x0,x1,z0,z1]=b,cx=(x0+x1)/2;
  return [
    ...b06RoomFront(prefix,e,b,'研究办公室 · RESEARCH','M-OAK-DARK'),
    fixture(`${prefix}/D1`,'principal-investigator workstation','PF-OFFICE-DESK',[x0+2.00,e,z1-.55],
      'M-OAK-DARK','research supervision and analysis',{size:[1.35,.76,.70]}),
    fixture(`${prefix}/D2`,'research-assistant workstation','PF-OFFICE-DESK',[x0+4.10,e,z1-.55],
      'M-OAK-DARK','project documentation and analysis',{size:[1.35,.76,.70]}),
    fixture(`${prefix}/MEET`,'compact project-review table','PF-MEETING-TABLE',[x1-2.30,e,z0+.85],
      'M-OAK','prototype and research review',{size:[1.8,.76,.80]}),
    fixture(`${prefix}/C1`,'project-review chair A','PF-CHAIR',[x1-3.55,e,z0+.85],
      'M-FABRIC-BLUE','project review seat',{yaw:PI/2,facing:'east',facesPoint:[x1-2.30,z0+.85]}),
    fixture(`${prefix}/C2`,'project-review chair B','PF-CHAIR',[x1-1.05,e,z0+.85],
      'M-FABRIC-BLUE','project review seat',{yaw:-PI/2,facing:'west',facesPoint:[x1-2.30,z0+.85]}),
    fixture(`${prefix}/DISPLAY`,'research milestone display','PF-SCREEN',[x1-.05,e+1.65,(z0+z1)/2],
      'M-SCREEN','experiments, grants and prototype milestones',{yaw:-PI/2,size:[1.8,1.15,.05],collision:'none'}),
    fixture(`${prefix}/FILES`,'contained project files','PF-FILE-CABINET',[x0+.50,e,z0+.50],
      'M-STEEL-DARK','project records and controlled notebooks',{size:[.80,1.45,.48]}),
    fixture(`${prefix}/PLANT`,'research-office plant','PF-PLANT',[x1-.45,e,z1-.55],
      'M-PLANT','biophilic research-office focal point'),
    ...b06LabCeiling(`${prefix}/CEILING`,e,[[cx-.95,z1-.55,2.8],[x1-2.30,z0+.85,2.0]],3500,'M-OAK-DARK'),
  ];
}

function buildB06() {
  const floors=[];
  const westS=[-7.1,-1.1,-6.1,-.2],westN=[-7.1,-1.1,.2,10.6],eastS=[1.1,7.1,-10.6,-2.2],eastM=[1.1,7.1,.2,4.5];
  const specs=[
    {level:1,title:'科学展示与安全入门',accent:'M-LAB-BLUE',rooms:[
      ['WS','普通教学实验室',westS,'general',b=>b06v2WetTeaching('B06/F1/WS',0,b),{windows:{side:'west',points:[-5.5]}}],
      ['WN','准备、收货与安全储藏',westN,'prep',b=>b06v2Prep('B06/F1/WN',0,b),{windows:{side:'west',points:[1.5]}}],
      ['ES','安全培训与展示',eastS,'classroom',b=>b06v2SafetyStudio('B06/F1/ES',0,b)],
      ['EM','门厅与门禁',eastM,'lobby',b=>b06v2Lobby('B06/F1/EM',0,b),{wallDatum:false,serviceTrunk:false}],
    ]},
    {level:2,title:'化学分析与合成',accent:'M-SAFETY-YELLOW',rooms:[
      ['WS','分析化学实验室',westS,'chemistry',b=>b06v2Analytical('B06/F2/WS',3.65,b),{windows:{side:'west',points:[-5.5]}}],
      ['WN','有机化学教学实验室',westN,'chemistry',b=>b06v2Organic('B06/F2/WN',3.65,b)],
      ['ES','基础化学实验室',eastS,'chemistry',b=>b06v2Foundation('B06/F2/ES',3.65,b)],
      ['EM','化学品分类储藏',eastM,'store',b=>b06v2ChemicalStore('B06/F2/EM',3.65,b)],
    ]},
    {level:3,title:'生命科学与显微成像',accent:'M-WALL-GREEN',rooms:[
      ['WS','生物教学实验室',westS,'biology',b=>b06v2Biology('B06/F3/WS',7.3,b),{windows:{side:'west',points:[-5.5]}}],
      ['WN','显微镜与细胞实验室',westN,'microscopy',b=>b06v2Microscopy('B06/F3/WN',7.3,b)],
      ['ES','微生物实验室',eastS,'biology',b=>b06v2Microbiology('B06/F3/ES',7.3,b)],
      ['EM','冷藏与样品室',eastM,'cold',b=>b06v2ColdRoom('B06/F3/EM',7.3,b)],
    ]},
    {level:4,title:'物理、机器人与人工智能',accent:'M-STEEL-DARK',rooms:[
      ['WS','物理与电子实验室',westS,'physics',b=>b06v2Physics('B06/F4/WS',10.95,b),{windows:{side:'west',points:[-5.5]}}],
      ['WN','机器人与制作实验室',westN,'robotics',b=>b06v2Robotics('B06/F4/WN',10.95,b),{windows:{side:'west',points:[5.0]}}],
      ['ES','数据与人工智能实验室',eastS,'computer',b=>b06v2AIStudio('B06/F4/ES',10.95,b),{windows:{side:'east',points:[-9.0]}}],
      ['EM','研究办公室与项目评审',eastM,'seminar',b=>b06v2ResearchStudio('B06/F4/EM',10.95,b)],
    ]},
  ];
  for(const spec of specs) {
    const e=(spec.level-1)*3.65,p=`B06/F${spec.level}`,rooms=[];
    for(const [key,label,b,kind,make,architecture={}] of spec.rooms) {
      const doorSide=key.startsWith('W')?'east':'west',doorX=key.startsWith('W')?-1.1:1.1;
      const doors=[doorway(`${p}/${key}/D`,doorSide,[doorX,e,(b[2]+b[3])/2],kind==='chemistry'||kind==='biology'||kind==='general'?1.5:1.0,`${p}/CORRIDOR`)];
      if(key==='WS') doors.push(doorway(`${p}/${key}/TO-STAIR`,'south',[-6.5,e,b[2]],1.2,`${p}/STAIR-SW`));
      if(spec.level===1&&key==='EM') doors.push(doorway(`${p}/${key}/EXT`,'east',[7.5,e,-1],3.2,'campus',{portal:true}));
      const contents=[...make(b),...b06Architecture(`${p}/${key}`,e,b,spec.accent,architecture)];
      rooms.push(room(`${p}/${key}`,label,b,kind==='lobby'?'public':kind==='computer'||kind==='seminar'||kind==='classroom'?'classroom':'lab',doors,contents,{programme:kind,staffControlled:kind==='store'||kind==='prep'||kind==='cold'}));
    }
    rooms.push(...b06CoreRooms(spec.level,e,p));
    const shared=[
      ...safetySet(p,e,[-4.2,-6.0],[6.2,-1],spec.level,spec.level===1),
      ...[-8.5,-4.5,0,4.0].map((z,i)=>fixture(`${p}/COR-EXT${i+1}`,'wall-mounted corridor extinguisher','PF-EXTINGUISHER',[-.82,e+1.18,z],'M-SAFETY-RED','laboratory corridor fire safety',{yaw:PI/2,collision:'none'})),
      ...[-8,-4,0,4,8].map((z,i)=>fixture(`${p}/COR-L${i+1}`,'sealed corridor light','PF-CEILING-LIGHT',[0,e+3.25,z],'M-WALL-WHITE','laboratory corridor lighting',{temperatureK:4200,size:[.9,.06,.24]})),
      fixture(`${p}/CUTOFF`,'floor emergency services cutoff','PF-ALARM',[.78,e+1.25,-1.2],'M-SAFETY-YELLOW','laboratory gas/electric isolation',{text:'紧急关闭'}),
      fixture(`${p}/FIRST`,'floor first-aid cabinet','PF-FIRST-AID',[.78,e+1.25,1.2],'M-CLINIC','laboratory first aid'),
      b06Decor(`${p}/COR-SERVICE`,'continuous corridor services canopy',[0,e+3.33,0],
        spec.accent,[1.34,.09,20.1],'color-coded laboratory services and floor identity'),
      b06Decor(`${p}/COR-DATA`,'brass corridor data line',[0,e+.018,0],
        spec.level===1?'M-BRASS':spec.accent,[.08,.022,19.6],'continuous navigation line between laboratories'),
      b06Sign(`${p}/FLOOR-TITLE`,'science floor programme sign',[.84,e+2.15,3.15],
        `${spec.level}层 · ${['','安全','化学','生物','机器人'][spec.level]}`,
        'large floor and programme confirmation',{yaw:-PI/2,size:[1.55,.34,.05]}),
      b06Sign(`${p}/FLOOR-TITLE-SOUTH`,'paired science floor programme sign',[-.84,e+2.15,-3.15],
        `${spec.level}层 · ${['','安全','化学','生物','机器人'][spec.level]}`,
        'paired programme confirmation for south-facing upper-floor arrivals',
        {yaw:PI/2,size:[1.55,.34,.05]}),
      ...(spec.level>1?b06UpperArrival(p,e,spec.level):[]),
      b06Decor(`${p}/COR-GLASS`,'glazed science display ribbon',[.86,e+1.45,6.0],
        'M-GLASS',[.045,2.45,2.5],'corridor views to active science and the glass stair tower'),
      ...(spec.level===1?[
        b06Decor(`${p}/ENTRY-CIRCUIT`,'brass circuit-trace arrival floor',[4.4,e+.018,-1.0],
          'M-BRASS',[4.8,.022,.07],'guides the campus arrival into reception'),
      ]:[]),
    ];
    const reviewByLevel={
      1:{
        entries:[{suffix:'entry',portalId:'B06/PUBLIC',focusRoomId:`${p}/EM`,cameraZoneId:`${p}/EM`,
          focusAt:{x:4.10,z:2.78,yaw:0},body:'hidden',
          focusFixtureIds:[`${p}/EM/WELCOME-SIGN`,`${p}/EM/STATUS`,`${p}/EM/DESK`,`${p}/EM/DEMO`]}],
        programme:{roomId:`${p}/WN`,at:{x:-5.30,z:4.38,yaw:-.09},
          focusFixtureIds:[`${p}/WN/CLEAN`,`${p}/WN/DIRTY`]},
      },
      2:{
        entry:{zoneId:`${p}/ENTRY`,at:{x:4.65,z:-1.00,yaw:PI/2},body:'hidden',
          focusFixtureIds:[`${p}/ARRIVAL/IDENTITY`,`${p}/ENTRY-DISPLAY`,`${p}/ARRIVAL/SPILL`]},
        programme:{roomId:`${p}/WN`,at:{x:-5.20,z:3.50,yaw:-.90},
          focusFixtureIds:[`${p}/WN/HOOD-B/BODY`,`${p}/WN/HOOD-C/BODY`,`${p}/WN/HOOD-C/APPARATUS`]},
      },
      3:{
        entry:{zoneId:`${p}/ENTRY`,at:{x:4.65,z:-1.00,yaw:PI/2},body:'hidden',
          focusFixtureIds:[`${p}/ARRIVAL/IDENTITY`,`${p}/ENTRY-DISPLAY`,`${p}/ARRIVAL/CELL-ATLAS`]},
        programme:{roomId:`${p}/WN`,at:{x:-4.10,z:7.00,yaw:0},
          focusFixtureIds:[`${p}/WN/SCREEN`,`${p}/WN/MIC04`,`${p}/WN/MIC05`]},
      },
      4:{
        entry:{zoneId:`${p}/ENTRY`,at:{x:4.65,z:-1.00,yaw:PI/2},body:'hidden',
          focusFixtureIds:[`${p}/ARRIVAL/IDENTITY`,`${p}/ENTRY-DISPLAY`,`${p}/ARRIVAL/ROBOT-DEMO`]},
        programme:{roomId:`${p}/WN`,at:{x:-2.50,z:6.80,yaw:-.40},
          focusFixtureIds:[`${p}/WN/ARM-CELL`,`${p}/WN/CAD-WALL`]},
      },
    }[spec.level];
    floors.push(floor(spec.level,e,3.65,rooms,[{id:`${p}/CORRIDOR`,bounds:[-.9,.9,-10.6,10.6],clearWidth:1.8,surface:'M-EPOXY'},{id:`${p}/ENTRY`,bounds:[.9,7.5,-2.0,.1],clearWidth:2.1,surface:'M-TERRAZZO'}],shared,{occupancy:spec.level===1?65:55,
      visualReview:reviewByLevel}));
  }
  return {
    id:'B06',label:'科学与创新楼（实验楼）',status:'new-interior',centreCampus:[-35.5,51],localBounds:[-7.5,7.5,-11,11],
    exteriorFootprint:{x0:-43,x1:-28,z0:40,z1:62},floors:4,floorHeight:3.65,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'-35.5 + localX',worldZ:'51 + localZ'},
    portals:[{id:'B06/PUBLIC',campusAt:[-28,50],campusReturn:[-25.5,50,-PI/2],localSpawn:[6.0,0,-1,-PI/2],placeKey:'campus_science_f1'}],
    facadeChanges:[{id:'B06/EXIT-SW','instruction':'Add a 1.20 m protected-stair discharge on west wall at campus (-43,42.55).'}],
    facadeAlignment:{eastWindows:{localX:7.5,localZ:[-9,-5.5,-2,1.5,5,8.5]},glassStairTower:{campusBounds:[-28.6,-27.55,55,60],mapsTo:'B06/*/CORE-NE'},roofExhaustRisers:[[-40.5,58.5],[-38.5,58.5],[-36.5,58.5],[-34.5,58.5],[-32.5,58.5],[-30.5,58.5]]},
    design:'A visibly layered four-floor science building: a fixed glazed prototype niche and composed reception establish the showcase lobby; wet teaching and clean/dirty preparation zones lead to distinct analytical, organic and foundation chemistry laboratories with visible roof-riser extraction headers; biology, microbiology and controlled-light microscopy suites sit below physics, robotics/maker, AI and glazed research spaces. Deep facade-aligned laboratory windows, washable wall datums, color-coded service trunks, ribbed sealed ceiling fields, high-CRI work lights, protected-core luminaires, observation glazing, PPE thresholds, plants and bilingual programme signs form one coherent technical architecture without filler blocks.',
    planningMetrics:{
      doorApproachDepth:1.35,corridorClearWidth:1.80,entryRouteClearWidth:2.10,
      lobbyTurningCircle:{centre:[2.90,2.30],diameter:1.50},
      emergencyDecontamination:{clearZones:8,clearWidth:1.20,clearDepth:1.20},
      equipmentDepths:{islandBench:[.82,.90],wallBench:.68,preparationIsland:.80,fumeHood:.88},
      workingAisles:{wetLabIslandEnds:1.50,wetLabIslandToWallBench:1.71,
        analyticalHoodToIsland:1.46,organicHoodToIsland:1.48,organicDoorBuffer:1.23,
        foundationIslandEnds:1.80,microscopyMinimum:1.20,robotTestToBench:1.25,
        aiDeskLateral:1.20,aiDoorSideRoute:1.20},
      architecturalLayers:{deepWindowBays:7,hoodExtractionHeaders:4,sealedCeilingFields:24,
        washableWallDatums:15,colorCodedServiceTrunks:15},
      authoredCoreLights:{southwestProtectedStairs:4,northeastLiftStairCores:4},
    },
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
  return b07Decor(id,'suspended acoustic ceiling raft',[x,e+2.78,z],material,[w,.10,d],
    'lower reverberation and visually organize the room ceiling');
}

function b07FacadeWindow(id,e,side,axis,identity,extra={}) {
  const vertical=side==='west'||side==='east',span=extra.span||1.75,height=extra.height||1.45,
    atY=e+(extra.atY||1.35),edge=side==='west'?-6.06:side==='east'?6.06:side==='south'?-5.06:5.06,
    at=vertical?[edge,atY,axis]:[axis,atY,edge],size=vertical?[.05,height,span]:[span,height,.05];
  const out=[b07Decor(`${id}/GLAZING`,`${identity} facade-aligned window glazing`,at,'M-GLASS',size,
    `composed architectural daylight bay aligned with the ${side} exterior window rhythm`,
    {facadeSide:side,facadeAxis:axis,daylight:true})];
  if(extra.privacy){
    const filmHeight=extra.filmHeight||Math.min(.78,height*.58),filmY=e+(extra.filmY||.98),
      filmEdge=side==='west'?-6.015:side==='east'?6.015:side==='south'?-5.015:5.015,
      filmAt=vertical?[filmEdge,filmY,axis]:[axis,filmY,filmEdge],
      filmSize=vertical?[.025,filmHeight,span-.10]:[span-.10,filmHeight,.025];
    out.push(b07Decor(`${id}/PRIVACY-FILM`,`${identity} window privacy film`,filmAt,'M-GLASS',filmSize,
      'frosted architectural lower window layer preserving daylight without compromising privacy',
      {facadeSide:side,frosted:true,privacy:true}));
  }
  return out;
}

function b07Pendant(id,e,x,z,purpose,material='M-BRASS',temperatureK=3000,lumens=780) {
  return fixture(id,'warm suspended room light','PF-PENDANT',[x,e+2.56,z],material,purpose,
    {temperatureK,lumens,size:[.34,.28,.34]});
}

function b07TaskLight(id,e,x,z,purpose,temperatureK=4000,w=.82,d=.24) {
  return fixture(id,'localized ceiling task light','PF-CEILING-LIGHT',[x,e+2.75,z],
    'M-WALL-WHITE',purpose,{temperatureK,lumens:1900,size:[w,.06,d]});
}

function b07CoreRooms(level,e,p) {
  return [
    room(`${p}/STAIR-S`,'南安全楼梯',[3.8,6.1,-5.1,-2.6],'service',[
      doorway(`${p}/STAIR-S/TO-LIFT`,'north',[4.95,e,-2.6],1.2,`${p}/LIFT`,{fireRated:true}),
    ],[
      fixture(`${p}/STAIR-S/FIX`,'south protected stair','PF-STAIR',[4.95,e,-3.95],
        'M-TERRAZZO','student-centre protected egress stair',{size:[1.8,2.8,2.0],collision:'none'}),
      b07Decor(`${p}/STAIR-S/STRIPE`,'high-contrast stair approach strip',[4.95,e+.018,-2.72],
        'M-SAFETY-YELLOW',[1.85,.025,.14],'tactile and visual warning at the protected stair'),
      b07Sign(`${p}/STAIR-S/SIGN`,'south stair identification',[3.86,e+1.55,-3.85],
        `南楼梯 · STAIR S · ${level}F`,'protected-egress wayfinding',{yaw:PI/2,size:[1.75,.34,.05]}),
      fixture(`${p}/STAIR-S/LIGHT`,'south stair emergency light','PF-EMERGENCY-LIGHT',
        [5.72,e+2.35,-3.95],'M-WALL-WHITE','protected-stair emergency illumination',{yaw:-PI/2}),
      b07TaskLight(`${p}/STAIR-S/GENERAL`,e,4.95,-3.95,
        'continuous general illumination across both protected-stair landings',4000,1.05,.30),
      ...(level>1?[
        ...b07FacadeWindow(`${p}/STAIR-S/WINDOW-E`,e,'east',-3.70,'south stair'),
        ...b07FacadeWindow(`${p}/STAIR-S/WINDOW-S`,e,'south',4.90,'south stair'),
      ]:[]),
    ]),
    room(`${p}/LIFT`,'电梯与防火前室',[3.8,6.1,-2.4,.8],'service',[
      doorway(`${p}/LIFT/TO-COR`,'west',[3.8,e,-.65],1.2,`${p}/DUAL-COR`,{fireRated:true}),
      doorway(`${p}/LIFT/TO-STAIR-S`,'south',[4.95,e,-2.4],1.2,`${p}/STAIR-S`,{fireRated:true}),
      doorway(`${p}/LIFT/TO-STAIR-N`,'north',[4.95,e,.8],1.2,`${p}/STAIR-N`,{fireRated:true}),
    ],[
      fixture(`${p}/LIFT/FIX`,'accessible lift','PF-LIFT',[5.18,e,-.72],
        'M-STEEL','accessible vertical circulation with a clear lobby turning area',
        {size:[1.65,2.45,1.45],levels:[1,2,3],collision:'none'}),
      fixture(`${p}/LIFT/DIR`,'split-use directory','PF-DIRECTORY',[5.92,e,-2.0],
        'M-SCREEN','activity-centre and clinic wayfinding',
        {yaw:-PI/2,size:[.7,1.5,.1],text:'活动 ↓ · 校医 ↑',collision:'none'}),
      b07Decor(`${p}/LIFT/PORTAL`,'charcoal lift portal surround',[4.9,e+1.28,-2.30],
        'M-STEEL-DARK',[1.95,2.5,.05],'make the accessible lift immediately legible'),
      b07Decor(`${p}/LIFT/TURN`,'accessible lift turning field',[4.62,e+.018,.02],
        'M-BRASS',[1.5,.025,1.5],'keep the full lift-lobby wheelchair turn clear'),
      b07Sign(`${p}/LIFT/FLOOR`,'lift floor marker',[4.9,e+1.83,-2.255],
        `${level}层 · FLOOR ${level}`,'large floor confirmation at the lift',{yaw:0,size:[1.2,.36,.05]}),
      fixture(`${p}/LIFT/LIGHT`,'lift-lobby ceiling light','PF-CEILING-LIGHT',[4.72,e+2.75,-.45],
        'M-WALL-WHITE','even accessible-lobby illumination',{temperatureK:3800,size:[1.2,.06,.32]}),
      ...(level>1?b07FacadeWindow(`${p}/LIFT/WINDOW-E`,e,'east',-.50,'lift lobby') : []),
    ]),
    room(`${p}/STAIR-N`,'北安全楼梯',[3.8,6.1,1.0,5.1],'service',[
      doorway(`${p}/STAIR-N/TO-LIFT`,'south',[4.95,e,1.0],1.2,`${p}/LIFT`,{fireRated:true}),
    ],[
      fixture(`${p}/STAIR-N/FIX`,'north protected stair','PF-STAIR',[4.95,e,3.25],
        'M-TERRAZZO','clinic protected egress stair',{size:[1.8,2.8,3.15],collision:'none'}),
      fixture(`${p}/STAIR-N/ELEC`,'recessed floor electrical cabinet','PF-ELECTRICAL-CABINET',
        [6.00,e+1.25,4.45],'M-STEEL-DARK','floor electrical distribution',{yaw:-PI/2,collision:'none'}),
      b07Decor(`${p}/STAIR-N/STRIPE`,'high-contrast stair approach strip',[4.95,e+.018,1.12],
        'M-SAFETY-YELLOW',[1.85,.025,.14],'tactile and visual warning at the protected stair'),
      b07Sign(`${p}/STAIR-N/SIGN`,'north stair identification',[3.86,e+1.55,3.05],
        `北楼梯 · STAIR N · ${level}F`,'protected-egress wayfinding',{yaw:PI/2,size:[1.75,.34,.05]}),
      fixture(`${p}/STAIR-N/LIGHT`,'north stair emergency light','PF-EMERGENCY-LIGHT',
        [5.72,e+2.35,3.25],'M-WALL-WHITE','protected-stair emergency illumination',{yaw:-PI/2}),
      b07TaskLight(`${p}/STAIR-N/GENERAL`,e,4.95,3.25,
        'continuous general illumination across both clinic protected-stair landings',4000,1.05,.30),
      ...(level>1?[
        ...b07FacadeWindow(`${p}/STAIR-N/WINDOW-E`,e,'east',2.70,'north stair'),
        ...b07FacadeWindow(`${p}/STAIR-N/WINDOW-N`,e,'north',4.90,'north stair'),
      ]:[]),
    ]),
  ];
}

function buildB07() {
  const floors=[];
  const corridorLayer=(p,e,studentLabel,clinicLabel,options={})=>{
    const signX=options.signX??-1.70,signSize=options.signSize||[2.25,.32,.05],
      studentSignYaw=options.signYaw??PI,clinicSignYaw=options.signYaw??0;
    return [
    b07Decor(`${p}/COR/FLOOR`,'dual-identity terrazzo and vinyl corridor field',[-.15,e+.012,0],
      'M-TERRAZZO',[7.9,.018,1.30],'continuous 1.30 metre public route between the protected core and programme rooms'),
    b07Decor(`${p}/COR/SC-LINE`,'blue student-activity wayfinding line',[-.15,e+.024,-.48],
      'M-FABRIC-BLUE',[7.9,.025,.10],'student-side route identity'),
    b07Decor(`${p}/COR/CL-LINE`,'green clinic wayfinding line',[-.15,e+.026,.48],
      'M-WALL-GREEN',[7.9,.027,.10],'clinic-side route identity'),
    b07Sign(`${p}/COR/SC-SIGN`,'student-side corridor sign',[signX,e+1.82,-.61],studentLabel,
      'student programme confirmation',{yaw:studentSignYaw,size:signSize}),
    b07Sign(`${p}/COR/CL-SIGN`,'clinic-side corridor sign',[signX,e+1.82,.61],clinicLabel,
      'clinic programme confirmation',{yaw:clinicSignYaw,size:signSize}),
    b07Raft(`${p}/COR/RAFT-W`,e,-2.45,0,2.75,.72,'M-OAK'),
    b07Raft(`${p}/COR/RAFT-E`,e,.85,0,2.75,.72,'M-WALL-GREEN'),
    b07Pendant(`${p}/COR/STUDENT-GLOW`,e,-2.45,-.34,
      'warm low-glare identity light over the student-side route','M-BRASS',3000,620),
    fixture(`${p}/COR/SOUND-MASK`,'clinic corridor sound-masking speaker','PF-SPEAKER',
      [-.35,e+2.20,.59],'M-WALL-GREEN','low-level sound masking at the confidential clinic boundary',
      {yaw:0,size:[.30,.52,.22],collision:'none'}),
    ...lightGrid(`${p}/COR`,e,[[-2.35,0],[.85,0]],3800),
    ];
  };

  // Ground floor: two genuinely separate arrivals meet only at the protected central corridor.
  {
    const level=1,e=0,p='B07/F1';
    const rooms=[
      room(`${p}/SC-LOBBY`,'学生活动中心门厅',[-6.1,-2.0,-3.05,-.75],'public',[
        doorway(`${p}/SC-LOBBY/EXT`,'west',[-6.5,e,-1.5],2.2,'campus',{portal:true}),
        doorway(`${p}/SC-LOBBY/TO-COR`,'north',[-2.65,e,-.75],1.2,`${p}/DUAL-COR`),
        doorway(`${p}/SC-LOBBY/TO-COMMONS`,'south',[-2.65,e,-3.05],1.0,`${p}/SC-COMMONS`),
      ],[
        fixture(`${p}/SC-LOBBY/DESK`,'compact club check-in podium','PF-TEACHER-PODIUM',
          [-3.80,e,-2.70],'M-OAK','staffed club check-in and room booking clear of the arrival sightline',
          {yaw:0,size:[.72,1.00,.45]}),
        fixture(`${p}/SC-LOBBY/DIR`,'wall-mounted activity directory','PF-SCREEN',[-2.035,e+1.43,-2.18],
          'M-SCREEN','club, rehearsal, media and project wayfinding',
          {yaw:PI/2,size:[.78,.72,.05],text:'社团 · 排练',collision:'none'}),
        b07Decor(`${p}/SC-LOBBY/FEATURE`,'brick student-hub identity wall',[-2.015,e+1.43,-1.90],
          'M-BRICK',[.06,2.55,1.45],'durable east-wall arrival backdrop centred between the two internal door leaves'),
        b07Sign(`${p}/SC-LOBBY/WELCOME`,'student-centre welcome sign',[-2.035,e+1.95,-1.90],
          '学生活动中心','student entrance identity',{yaw:PI/2,size:[1.35,.38,.05]}),
        fixture(`${p}/SC-LOBBY/TODAY`,'live club-room schedule','PF-SCREEN',[-2.035,e+1.43,-1.62],
          'M-SCREEN','today’s room bookings, open clubs and event start times',
          {yaw:PI/2,size:[.78,.72,.05],text:'今日 · 18:00',collision:'none'}),
        b07Decor(`${p}/SC-LOBBY/RUG`,'blue acoustic arrival inset',[-4.65,e+.018,-1.00],
          'M-FABRIC-BLUE',[1.70,.025,.90],'quiet flush architectural floor finish along the clear registration approach'),
        b07Raft(`${p}/SC-LOBBY/RAFT`,e,-4.30,-1.85,3.10,1.20),
        b07Pendant(`${p}/SC-LOBBY/PENDANT-DESK`,e,-3.80,-2.70,
          'warm staffed-registration light that distinguishes the student arrival'),
        b07Pendant(`${p}/SC-LOBBY/PENDANT-WAIT`,e,-4.65,-1.00,
          'warm domestic-scale arrival light balancing the staffed registration counter','M-BRASS',3000,620),
        ...lightGrid(`${p}/SC-LOBBY`,e,[[-4.30,-1.85]],3500),
      ],{capacity:8}),
      room(`${p}/SC-COMMONS`,'社团公共区',[-6.1,-.8,-5.1,-3.25],'activity',[
        doorway(`${p}/SC-COMMONS/TO-LOBBY`,'north',[-2.65,e,-3.25],1.0,`${p}/SC-LOBBY`),
      ],[
        fixture(`${p}/SC-COMMONS/T1`,'west four-place club table','PF-CANTEEN-TABLE',[-4.15,e,-4.25],
          'M-OAK','club sign-up and collaborative planning',{size:[1.35,.76,1.20]}),
        fixture(`${p}/SC-COMMONS/T2`,'east two-place club table','PF-MEETING-TABLE',[-1.40,e,-4.25],
          'M-OAK','student project discussion',{size:[1.0,.76,.65]}),
        fixture(`${p}/SC-COMMONS/T2-CN`,'east table north chair','PF-CHAIR',[-1.40,e,-3.70],
          'M-FABRIC-BLUE','club discussion seat facing south to the table',{yaw:PI}),
        fixture(`${p}/SC-COMMONS/T2-CS`,'east table south chair','PF-CHAIR',[-1.40,e,-4.80],
          'M-FABRIC-RED','club discussion seat facing north to the table',{yaw:0}),
        fixture(`${p}/SC-COMMONS/CUBBIES`,'labelled club-project lockers','PF-LOCKERS',[-5.35,e,-4.84],
          'M-STEEL-DARK','secure active-club materials',{size:[1.0,1.85,.36]}),
        fixture(`${p}/SC-COMMONS/MURAL`,'club calendar and work display','PF-SCREEN',[-.835,e+1.55,-4.25],
          'M-SCREEN','live club calendar and student work',{yaw:-PI/2,size:[1.55,1.0,.05],text:'社团周 · CLUB WEEK'}),
        b07Decor(`${p}/SC-COMMONS/WALL`,'brick club pin-up wall',[-.815,e+1.43,-4.25],
          'M-BRICK',[.06,2.52,1.70],'durable architectural pin-up backdrop'),
        ...b07FacadeWindow(`${p}/SC-COMMONS/WINDOW-W`,e,'west',-4.10,'student commons',
          {span:1.28,height:2.05,atY:1.50}),
        b07Raft(`${p}/SC-COMMONS/RAFT-W`,e,-4.15,-4.25,1.45,1.10),
        b07Raft(`${p}/SC-COMMONS/RAFT-E`,e,-1.40,-4.25,1.10,1.10),
        b07Pendant(`${p}/SC-COMMONS/PENDANT-W`,e,-4.15,-4.25,
          'warm club-table light for sign-up and informal conversation'),
        b07Pendant(`${p}/SC-COMMONS/PENDANT-E`,e,-1.40,-4.25,
          'warm project-table light for student collaboration','M-BRASS',3100,700),
        ...lightGrid(`${p}/SC-COMMONS`,e,[[-4.15,-4.25],[-1.40,-4.25]],3400),
      ],{capacity:6}),
      room(`${p}/SC-OFFICE`,'学生会办公室',[-1.8,1.6,-3.05,-.75],'office',[
        doorway(`${p}/SC-OFFICE/TO-COR`,'north',[.70,e,-.75],1.0,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/SC-OFFICE/DESK1`,'student-union casework desk','PF-OFFICE-DESK',[-1.10,e,-2.62],
          'M-OAK','student representation and casework',{size:[1.20,.76,.65]}),
        fixture(`${p}/SC-OFFICE/DESK2`,'club-finance workstation','PF-OFFICE-DESK',[.55,e,-2.62],
          'M-OAK','club finance and communications',{size:[1.20,.76,.65]}),
        fixture(`${p}/SC-OFFICE/FILES`,'secure committee files','PF-FILE-CABINET',[-1.45,e,-1.10],
          'M-STEEL','election, committee and finance records',{size:[.60,1.25,.38]}),
        fixture(`${p}/SC-OFFICE/BOARD`,'committee planning board','PF-WHITEBOARD',[-.10,e+1.55,-2.98],
          'M-WHITEBOARD','minutes, elections and event planning',{yaw:0,size:[2.20,.90,.05]}),
        b07Decor(`${p}/SC-OFFICE/RUG`,'quiet committee office floor inset',[-.25,e+.018,-2.35],
          'M-RUBBER',[2.45,.025,1.15],'acoustic architectural floor finish'),
        b07Sign(`${p}/SC-OFFICE/TITLE`,'student-union room title',[-.10,e+2.20,-2.98],
          '学生会 · STUDENT UNION','committee-office identity',{yaw:0,size:[2.0,.32,.05]}),
        b07Raft(`${p}/SC-OFFICE/RAFT`,e,-.10,-2.10,2.65,1.10),
        b07TaskLight(`${p}/SC-OFFICE/TASK-W`,e,-1.10,-2.55,
          'localized low-glare light above student-union casework',3700,.72,.22),
        b07TaskLight(`${p}/SC-OFFICE/TASK-E`,e,.55,-2.55,
          'localized low-glare light above club-finance work',3700,.72,.22),
        ...lightGrid(`${p}/SC-OFFICE`,e,[[-.10,-2.10]],3500),
      ],{capacity:4}),
      room(`${p}/SC-MULTI`,'多功能活动室',[1.8,3.6,-5.1,-.75],'activity',[
        doorway(`${p}/SC-MULTI/TO-COR`,'north',[2.70,e,-.75],1.2,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/SC-MULTI/TABLE`,'compact folding activity table','PF-MEETING-TABLE',[2.70,e,-3.30],
          'M-OAK','small club meeting and event preparation',{size:[1.0,.76,.65]}),
        fixture(`${p}/SC-MULTI/C1`,'north-west event chair','PF-CHAIR',[2.40,e,-2.72],
          'M-FABRIC-BLUE','movable activity seat angled toward the table centre',
          {yaw:r3(Math.atan2(.30,-.58))}),
        fixture(`${p}/SC-MULTI/C2`,'north-east event chair','PF-CHAIR',[3.00,e,-2.72],
          'M-FABRIC-BLUE','movable activity seat angled toward the table centre',
          {yaw:r3(Math.atan2(-.30,-.58))}),
        fixture(`${p}/SC-MULTI/C3`,'south-west event chair','PF-CHAIR',[2.40,e,-3.88],
          'M-FABRIC-RED','movable activity seat angled toward the table centre',
          {yaw:r3(Math.atan2(.30,.58))}),
        fixture(`${p}/SC-MULTI/C4`,'south-east event chair','PF-CHAIR',[3.00,e,-3.88],
          'M-FABRIC-BLUE','movable activity seat angled toward the table centre',
          {yaw:r3(Math.atan2(-.30,.58))}),
        fixture(`${p}/SC-MULTI/STORE`,'activity equipment shelf','PF-SHELF',[1.99,e,-4.62],
          'M-STEEL','presentation kits and folded event equipment',{yaw:PI/2,size:[.80,1.90,.36]}),
        fixture(`${p}/SC-MULTI/SCREEN`,'multipurpose presentation screen','PF-SCREEN',[2.70,e+1.55,-5.02],
          'M-SCREEN','film, briefing and club presentation',{yaw:0,size:[1.55,1.0,.05]}),
        fixture(`${p}/SC-MULTI/PROJECTOR`,'ceiling presentation projector','PF-PROJECTOR',[2.70,e+2.38,-1.30],
          'M-STEEL-DARK','room presentation system',{yaw:PI}),
        b07Decor(`${p}/SC-MULTI/ACOUSTIC`,'blue acoustic wall lining',[1.86,e+1.45,-2.85],
          'M-FABRIC-BLUE',[.05,2.5,3.45],'architectural speech and rehearsal absorption'),
        b07Sign(`${p}/SC-MULTI/SIGN`,'multipurpose room sign',[2.70,e+1.75,-.81],
          '多功能室 · FLEX ROOM','bookable-room identity',{yaw:PI,size:[1.55,.3,.05]}),
        b07Raft(`${p}/SC-MULTI/RAFT`,e,2.70,-3.10,1.42,2.45),
        b07TaskLight(`${p}/SC-MULTI/TASK-N`,e,2.70,-2.05,
          'dimmable event setup and presentation lighting',3700,.78,.26),
        b07TaskLight(`${p}/SC-MULTI/TASK-S`,e,2.70,-4.25,
          'dimmable activity-table and equipment lighting',3700,.78,.26),
        ...lightGrid(`${p}/SC-MULTI`,e,[[2.70,-3.10]],3600),
      ],{capacity:5,accessible:true}),
      room(`${p}/CL-WAIT`,'校医院候诊',[-6.1,-2.2,.75,5.1],'clinic',[
        doorway(`${p}/CL-WAIT/EXT`,'west',[-6.5,e,2.5],2.2,'campus',{portal:true}),
        doorway(`${p}/CL-WAIT/TO-COR`,'south',[-2.80,e,.75],1.2,`${p}/DUAL-COR`),
        doorway(`${p}/CL-WAIT/TO-TREAT`,'east',[-2.20,e,3.80],1.1,`${p}/CL-TREAT`),
      ],[
        fixture(`${p}/CL-WAIT/REC`,'accessible clinic registration counter','PF-SERVICE-COUNTER',[-5.05,e,4.05],
          'M-CLINIC','private registration and triage against the clinical dashboard wall',
          {yaw:0,size:[.90,1.00,.58],accessible:true}),
        fixture(`${p}/CL-WAIT/W-S`,'south three-place waiting row','PF-WAIT-CHAIRS',[-4.75,e,.97],
          'M-FABRIC-BLUE','short patient waiting',{size:[1.65,.84,.42]}),
        fixture(`${p}/CL-WAIT/W-N`,'north three-place waiting row','PF-WAIT-CHAIRS',[-3.10,e,4.85],
          'M-FABRIC-BLUE','patient waiting',{yaw:PI,size:[1.65,.84,.42]}),
        fixture(`${p}/CL-WAIT/WATER`,'patient water station','PF-WATER',[-5.80,e,4.68],
          'M-STEEL','patient hydration'),
        fixture(`${p}/CL-WAIT/DIR`,'wall-mounted clinic directory','PF-SCREEN',[-5.55,e+1.50,4.98],
          'M-SCREEN','registration, examination, treatment and pharmacy wayfinding',
          {yaw:0,size:[.78,1.10,.05],text:'挂号 · 诊室 · 药房',collision:'none'}),
        fixture(`${p}/CL-WAIT/QUEUE`,'privacy-preserving queue display','PF-SCREEN',[-3.02,e+1.60,5.015],
          'M-SCREEN','queue number without patient names',{yaw:0,size:[1.15,.78,.05],text:'A12'}),
        fixture(`${p}/CL-WAIT/AED`,'clinic AED','PF-AED',[-2.28,e+1.2,1.15],
          'M-SAFETY-RED','public defibrillator',{yaw:-PI/2}),
        b07Decor(`${p}/CL-WAIT/ACCESS`,'wheelchair waiting and turning field',[-4.10,e+.018,3.55],
          'M-LAB-BLUE',[1.50,.025,1.50],'full accessible waiting and turning position'),
        b07Decor(`${p}/CL-WAIT/WALL`,'pale-green clinic identity wall',[-4.15,e+1.43,5.02],
          'M-WALL-GREEN',[3.35,2.52,.06],'calm washable architectural backdrop'),
        b07Decor(`${p}/CL-WAIT/DASHBOARD-S`,'pale-green clinic dashboard wall',[-2.235,e+1.43,2.00],
          'M-WALL-GREEN',[.05,2.52,2.40],
          'washable architectural identity layer behind registration, anonymous queue status and public AED'),
        b07Decor(`${p}/CL-WAIT/DASHBOARD-N`,'pale-green clinic clock wall',[-2.235,e+1.43,4.70],
          'M-WALL-GREEN',[.05,2.52,.65],
          'washable architectural identity layer north of the treatment-room doorway'),
        ...b07FacadeWindow(`${p}/CL-WAIT/WINDOW-W`,e,'west',4.50,'clinic waiting',
          {span:1.28,height:2.05,atY:1.50,privacy:true,filmHeight:.95,filmY:1.02}),
        b07Sign(`${p}/CL-WAIT/WELCOME`,'clinic welcome sign',[-4.35,e+1.95,5.015],
          '校医院','clinic arrival identity',{yaw:0,size:[1.55,.36,.05]}),
        fixture(`${p}/CL-WAIT/STATUS`,'wide anonymous clinic status display','PF-SCREEN',[-4.35,e+1.62,5.015],
          'M-SCREEN','wide queue, triage readiness and estimated-wait overview without patient names',
          {yaw:0,size:[1.52,.74,.05],text:'A12 · 可分诊',collision:'none'}),
        fixture(`${p}/CL-WAIT/CLOCK`,'quiet clinic waiting clock','PF-CLOCK',[-2.27,e+2.35,4.45],
          'M-WALL-WHITE','reassuring appointment and waiting-time reference',{yaw:-PI/2,collision:'none'}),
        b07Sign(`${p}/CL-WAIT/TRIAGE-SIGN`,'registration and triage wall marker',[-3.02,e+2.30,4.98],
          '挂号 · 分诊','make the first clinical action unmistakable from the waiting room',
          {yaw:0,size:[1.35,.29,.04]}),
        fixture(`${p}/CL-WAIT/MAGAZINES`,'patient information side table','PF-SIDE-TABLE',[-5.00,e,1.75],
          'M-OAK','health leaflets, tissues and a water cup within reach of the waiting row',
          {size:[.46,.48,.46]}),
        fixture(`${p}/CL-WAIT/PLANT`,'clinic waiting plant','PF-PLANT',[-5.80,e,4.10],
          'M-PLANT','calm biophilic landmark clear of registration and accessible turning routes',
          {size:[.46,1.05,.46]}),
        b07Raft(`${p}/CL-WAIT/RAFT-S`,e,-3.65,1.20,1.75,.90,'M-WALL-GREEN'),
        b07Raft(`${p}/CL-WAIT/RAFT-N`,e,-4.20,4.10,2.70,.90,'M-WALL-GREEN'),
        b07Pendant(`${p}/CL-WAIT/PENDANT-S`,e,-3.65,1.30,
          'soft low-glare waiting light outside clinical task zones','M-BRASS',3200,560),
        b07Pendant(`${p}/CL-WAIT/PENDANT-N`,e,-4.20,4.05,
          'soft low-glare waiting light beside the privacy-protected facade bay','M-BRASS',3200,560),
        ...lightGrid(`${p}/CL-WAIT`,e,[[-4.75,1.30],[-4.20,4.05]],3900),
      ],{capacity:8,accessible:true}),
      room(`${p}/CL-EXAM`,'校医诊室',[-2.0,1.55,.75,2.55],'clinic',[
        doorway(`${p}/CL-EXAM/TO-COR`,'south',[-.30,e,.75],1.0,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/CL-EXAM/COUCH`,'compact clinical examination couch','PF-EXAM-COUCH',[.35,e,2.22],
          'M-CLINIC','patient examination',{size:[1.75,.78,.56]}),
        fixture(`${p}/CL-EXAM/DESK`,'clinician documentation desk','PF-OFFICE-DESK',[-1.45,e,2.18],
          'M-CLINIC','clinical notes and private consultation',{size:[.90,.76,.55]}),
        fixture(`${p}/CL-EXAM/CAB`,'clean clinical supply cabinet','PF-CLINIC-CABINET',[1.25,e,1.08],
          'M-CLINIC','sealed examination supplies',{size:[.58,1.75,.38]}),
        fixture(`${p}/CL-EXAM/SINK`,'clinical handwash basin','PF-HANDWASH',[1.25,e,1.65],
          'M-STAINLESS','hand hygiene between patients'),
        b07Decor(`${p}/CL-EXAM/CURTAIN`,'washable ceiling-track privacy curtain',[-.72,e+1.32,2.18],
          'M-ACOUSTIC',[.04,2.28,1.36],'architectural privacy screen between desk and couch'),
        fixture(`${p}/CL-EXAM/VITALS`,'vital-sign display','PF-SCREEN',[1.48,e+1.55,2.18],
          'M-SCREEN','blood pressure, temperature and pulse',{yaw:-PI/2,size:[.72,.52,.04],text:'生命体征 · VITALS'}),
        b07Sign(`${p}/CL-EXAM/HAND-SIGN`,'clinical hand-hygiene sign',[1.48,e+2.08,1.48],
          '洗手 · HAND HYGIENE','hand-hygiene reminder',{yaw:-PI/2,size:[.82,.25,.04]}),
        b07Raft(`${p}/CL-EXAM/RAFT`,e,-.20,1.70,2.55,1.05,'M-WALL-GREEN'),
        b07TaskLight(`${p}/CL-EXAM/TASK-COUCH`,e,.55,2.08,
          'high-rendering examination light centred on the couch',4300,.82,.28),
        b07TaskLight(`${p}/CL-EXAM/TASK-DESK`,e,-1.28,2.05,
          'lower-glare consultation and clinical-notes light',3700,.66,.22),
        ...lightGrid(`${p}/CL-EXAM`,e,[[-.20,1.70]],4200),
      ],{capacity:3}),
      room(`${p}/CL-TREAT`,'治疗与观察',[-2.0,1.55,2.75,5.1],'clinic',[
        doorway(`${p}/CL-TREAT/TO-WAIT`,'west',[-2.0,e,3.80],1.1,`${p}/CL-WAIT`),
      ],[
        fixture(`${p}/CL-TREAT/COUCH`,'treatment and observation couch','PF-EXAM-COUCH',[1.12,e,3.90],
          'M-CLINIC','minor treatment and short observation',{yaw:PI/2,size:[1.75,.78,.60]}),
        fixture(`${p}/CL-TREAT/CHAIR`,'companion observation chair','PF-CHAIR',[.05,e,3.90],
          'M-FABRIC-BLUE','companion or seated patient facing the treatment couch',{yaw:PI/2}),
        fixture(`${p}/CL-TREAT/SINK`,'treatment handwash basin','PF-HANDWASH',[-.30,e,3.00],
          'M-STAINLESS','clinical hand hygiene'),
        fixture(`${p}/CL-TREAT/CAB`,'treatment supply cabinet','PF-CLINIC-CABINET',[-.30,e,4.78],
          'M-CLINIC','dressings and sealed treatment supplies',{size:[.68,1.85,.40]}),
        fixture(`${p}/CL-TREAT/FIRST`,'wall first-aid cabinet','PF-FIRST-AID',[-1.90,e+1.20,4.75],
          'M-CLINIC','urgent treatment supplies',{yaw:PI/2}),
        b07Decor(`${p}/CL-TREAT/SCREEN`,'frosted treatment privacy screen',[.58,e+1.25,3.90],
          'M-GLASS',[.04,2.20,1.80],'architectural visual privacy around the couch'),
        fixture(`${p}/CL-TREAT/MON`,'observation status display','PF-SCREEN',[-.25,e+1.62,5.02],
          'M-SCREEN','observation status',{yaw:PI,size:[.82,.48,.04],text:'治疗观察'}),
        b07Raft(`${p}/CL-TREAT/RAFT`,e,.25,3.90,2.25,1.30,'M-WALL-GREEN'),
        b07TaskLight(`${p}/CL-TREAT/TASK`,e,.92,3.90,
          'high-rendering minor-treatment light above the couch',4300,.82,.28),
        b07Pendant(`${p}/CL-TREAT/CALM`,e,-.55,4.05,
          'dimmable low-stress observation light used outside procedures','M-BRASS',3200,480),
        ...lightGrid(`${p}/CL-TREAT`,e,[[.25,3.90]],4200),
      ],{capacity:3}),
      room(`${p}/CL-PHARM`,'校内药房',[1.75,3.6,.75,5.1],'clinic',[
        doorway(`${p}/CL-PHARM/TO-COR`,'south',[2.65,e,.75],1.2,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/CL-PHARM/COUNTER`,'composed dispensing counter','PF-PHARMACY',[2.65,e,2.35],
          'M-CLINIC','private medicine dispensing',{size:[1.40,1.05,.65]}),
        fixture(`${p}/CL-PHARM/FRIDGE`,'locked medicine refrigerator','PF-MED-FRIDGE',[3.18,e,4.62],
          'M-CLINIC','temperature-controlled medicine',{size:[.60,1.80,.60]}),
        fixture(`${p}/CL-PHARM/S1`,'north medicine shelving','PF-SHELF',[2.10,e,4.75],
          'M-CLINIC','labelled locked medicine stock',{size:[.55,1.85,.36]}),
        fixture(`${p}/CL-PHARM/S2`,'east medicine shelving','PF-SHELF',[3.34,e,3.48],
          'M-CLINIC','dispensing stock by category',{yaw:PI/2,size:[.95,1.85,.36]}),
        b07Decor(`${p}/CL-PHARM/WALL`,'washable pale-green pharmacy wall',[3.52,e+1.42,3.35],
          'M-WALL-GREEN',[.05,2.50,3.20],'architectural pharmacy identity wall'),
        b07Decor(`${p}/CL-PHARM/PRIVACY-LINE`,'pharmacy privacy floor line',[2.65,e+.018,1.94],
          'M-SAFETY-YELLOW',[1.50,.025,.12],'one-metre conversation setback'),
        fixture(`${p}/CL-PHARM/TEMP`,'medicine temperature and dispensing log','PF-SCREEN',[1.79,e+1.62,4.12],
          'M-SCREEN','fridge temperature, stock checks and anonymous dispensing status',
          {yaw:PI/2,size:[.90,.58,.04],text:'药品温度 · 库存复核',collision:'none'}),
        b07Sign(`${p}/CL-PHARM/HEADER`,'pharmacy header',[2.65,e+2.15,.82],
          '药房 · PHARMACY','dispensing counter identity',{yaw:0,size:[1.65,.36,.05]}),
        b07Raft(`${p}/CL-PHARM/RAFT`,e,2.65,3.20,1.40,2.50,'M-WALL-GREEN'),
        b07TaskLight(`${p}/CL-PHARM/TASK-COUNTER`,e,2.65,2.35,
          'colour-accurate prescription-check light over the dispensing counter',4300,.78,.26),
        b07TaskLight(`${p}/CL-PHARM/TASK-STOCK`,e,2.75,4.35,
          'sealed-stock label and medicine-fridge inspection light',4200,.78,.26),
        ...lightGrid(`${p}/CL-PHARM`,e,[[2.65,3.15]],4200),
      ],{capacity:3}),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/DUAL-COR`,bounds:[-6.1,3.8,-.65,.65],clearWidth:1.30,surface:'M-TERRAZZO'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[-5.80,-1.50],level,true),
      fixture(`${p}/FIRE-SEP`,'self-closing clinic fire-separation door','PF-DOOR-SINGLE',[3.70,e,0],
        'M-STEEL','protected separation before the shared lift lobby',{yaw:0,selfClosing:true}),
      ...corridorLayer(p,e,'活动 ↓','校医 ↑'),
    ],{occupancy:54,visualReview:{
      entries:[
        {suffix:'entry',portalId:'B07/STUDENT',focusRoomId:`${p}/SC-COMMONS`,cameraZoneId:`${p}/SC-COMMONS`,
          focusAt:{x:-2.15,z:-4.60,yaw:1.535},body:'hidden',
          focusFixtureIds:[`${p}/SC-COMMONS/MURAL`,`${p}/SC-COMMONS/T2`]},
        {suffix:'clinic-entry',portalId:'B07/CLINIC',focusRoomId:`${p}/CL-WAIT`,cameraZoneId:`${p}/CL-WAIT`,
          focusAt:{x:-4.70,z:3.45,yaw:.06},body:'hidden',
          focusFixtureIds:[`${p}/CL-WAIT/STATUS`,`${p}/CL-WAIT/WELCOME`]},
      ],
      programme:{roomId:`${p}/CL-WAIT`,at:{x:-4.70,z:3.45,yaw:.06},
        focusFixtureIds:[`${p}/CL-WAIT/REC`,`${p}/CL-WAIT/STATUS`,`${p}/CL-WAIT/WELCOME`]},
    }}));
  }

  // Floor 2: an open rehearsal studio south; a buffered, confidential care suite north.
  {
    const level=2,e=3,p='B07/F2';
    const rooms=[
      room(`${p}/DANCE`,'舞蹈与排练室',[-6.1,3.6,-5.1,-1.1],'activity',[
        doorway(`${p}/DANCE/TO-COR-W`,'north',[-3.20,e,-1.1],1.2,`${p}/DUAL-COR`,
          {operation:'sliding-pocket',pocketSide:'west',reviewOpen:true,
            designIntent:'permanently open recessed studio arrival pocket; no exposed panel in the shared landing'}),
        doorway(`${p}/DANCE/TO-COR-E`,'north',[2.70,e,-1.1],1.2,`${p}/DUAL-COR`,
          {operation:'sliding-pocket',pocketSide:'east',reviewOpen:true,
            designIntent:'permanently open recessed studio arrival pocket; no exposed panel in the shared landing'}),
      ],[
        fixture(`${p}/DANCE/M1`,'east dance mirror and barre A','PF-DANCE-MIRROR',[3.52,e+1.45,-4.12],
          'M-GLASS','south safety-backed rehearsal mirror and continuous timber barre',
          {yaw:PI/2,size:[1.55,2.0,.04],collision:'none'}),
        fixture(`${p}/DANCE/M2`,'east dance mirror and barre B','PF-DANCE-MIRROR',[3.52,e+1.45,-2.43],
          'M-GLASS','north safety-backed rehearsal mirror and continuous timber barre',
          {yaw:PI/2,size:[1.55,2.0,.04],collision:'none'}),
        fixture(`${p}/DANCE/AUDIO`,'rehearsal audio-control workstation','PF-COMPUTER-DESK',[-5.40,e,-4.62],
          'M-STEEL-DARK','music playback and recording',{size:[.90,.90,.50]}),
        fixture(`${p}/DANCE/MATS`,'rolled-mat storage rack','PF-SHELF',[-5.72,e,-1.88],
          'M-STEEL','exercise mats and stretching aids',{yaw:PI/2,size:[1.0,1.85,.40]}),
        fixture(`${p}/DANCE/BENCH`,'rehearsal change bench','PF-BENCH',[1.80,e,-4.65],
          'M-FABRIC-BLUE','shoe changes, bags and breaks',{size:[1.60,.84,.50]}),
        fixture(`${p}/DANCE/WATER`,'rehearsal water station','PF-WATER',[3.10,e,-4.62],
          'M-STEEL','student hydration'),
        fixture(`${p}/DANCE/SPEAKER-W`,'west rehearsal loudspeaker','PF-SPEAKER',[-6.02,e+2.05,-2.35],
          'M-STEEL-DARK','distributed rehearsal audio',{yaw:PI/2,size:[.50,.82,.32],collision:'none'}),
        fixture(`${p}/DANCE/SPEAKER-E`,'east rehearsal loudspeaker','PF-SPEAKER',[3.52,e+2.05,-4.55],
          'M-STEEL-DARK','distributed rehearsal audio',{yaw:-PI/2,size:[.36,.58,.24],collision:'none'}),
        fixture(`${p}/DANCE/CLOCK`,'rehearsal wall clock','PF-CLOCK',[-6.02,e+2.35,-3.70],
          'M-WALL-WHITE','rehearsal timing',{yaw:PI/2}),
        fixture(`${p}/DANCE/COAT-RAIL`,'rehearsal bag and coat rail','PF-COAT-RAIL',[-.55,e+1.42,-1.16],
          'M-OAK','composed wall rail for jackets and light rehearsal bags',{yaw:PI,collision:'none'}),
        b07Decor(`${p}/DANCE/FLOOR`,'sprung oak dance floor',[-1.05,e+.018,-3.25],
          'M-OAK',[7.70,.025,2.65],'resilient architectural rehearsal floor with clear movement perimeter'),
        ...[-3.35,-2.20,-1.05,.10,1.25].map((x,i)=>b07Decor(
          `${p}/DANCE/SPACING-${pad(i+1)}`,'rehearsal spacing floor marker',[x,e+.034,-3.25],
          'M-BRASS',[.16,.018,.045],
          'small flush formation reference that preserves the visual continuity of the sprung oak floor')),
        b07Decor(`${p}/DANCE/ACOUSTIC-W`,'blue acoustic south-wall panel',[-3.10,e+1.43,-5.02],
          'M-FABRIC-BLUE',[1.25,2.50,.06],'architectural sound absorption between facade window bays'),
        b07Decor(`${p}/DANCE/ACOUSTIC-C`,'blue acoustic south-wall panel',[.10,e+1.43,-5.02],
          'M-FABRIC-BLUE',[1.25,2.50,.06],'architectural sound absorption between facade window bays'),
        b07Decor(`${p}/DANCE/ACOUSTIC-E`,'blue acoustic south-wall panel',[3.05,e+1.43,-5.02],
          'M-FABRIC-BLUE',[.80,2.50,.06],'architectural sound absorption beside the east facade window bay'),
        ...b07FacadeWindow(`${p}/DANCE/WINDOW-W`,e,'west',-3.70,'dance studio'),
        ...b07FacadeWindow(`${p}/DANCE/WINDOW-S1`,e,'south',-4.70,'dance studio'),
        ...b07FacadeWindow(`${p}/DANCE/WINDOW-S2`,e,'south',-1.50,'dance studio'),
        ...b07FacadeWindow(`${p}/DANCE/WINDOW-S3`,e,'south',1.70,'dance studio'),
        b07Sign(`${p}/DANCE/TITLE`,'dance studio title',[-3.20,e+2.05,-4.98],
          '舞蹈排练室','rehearsal-room identity',{yaw:0,size:[2.25,.36,.05]}),
        b07Sign(`${p}/DANCE/ETIQUETTE`,'rehearsal etiquette sign',[.10,e+2.12,-1.16],
          '换鞋 · 补水','shoe change, hydration and clear-floor reminder',
          {yaw:PI,size:[2.0,.30,.05]}),
        b07Raft(`${p}/DANCE/RAFT-W`,e,-3.65,-3.15,2.20,1.0),
        b07Raft(`${p}/DANCE/RAFT-C`,e,-.85,-3.15,2.20,1.0),
        b07Raft(`${p}/DANCE/RAFT-E`,e,1.95,-3.15,2.20,1.0),
        b07TaskLight(`${p}/DANCE/WALL-WASH-W`,e,-3.85,-4.62,
          'dimmable warm wall wash for informal rehearsal and performances',3400,1.0,.20),
        b07TaskLight(`${p}/DANCE/WALL-WASH-E`,e,1.95,-4.62,
          'dimmable warm wall wash for informal rehearsal and performances',3400,1.0,.20),
        ...lightGrid(`${p}/DANCE`,e,[[-3.50,-3.15],[-.50,-3.15],[2.45,-3.15]],3800),
      ],{capacity:20,accessible:true}),
      room(`${p}/SC-WC`,'活动中心无障碍卫生间',[-6.1,-3.8,-.9,.8],'service',[
        doorway(`${p}/SC-WC/TO-COR`,'east',[-3.8,e,0],1.0,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/SC-WC/T`,'accessible toilet','PF-TOILET',[-5.72,e,-.48],
          'M-CERAMIC','accessible sanitary fixture',{grabRails:true}),
        fixture(`${p}/SC-WC/B`,'accessible washbasin','PF-BASIN',[-5.72,e,.48],
          'M-CERAMIC','wheelchair-height hand washing'),
        b07Decor(`${p}/SC-WC/TURN`,'accessible turning-circle floor field',[-4.60,e+.018,0],
          'M-LAB-BLUE',[1.50,.025,1.50],'full wheelchair turning zone connected to the door'),
        b07Decor(`${p}/SC-WC/RAIL`,'contrasting wall-mounted grab rail',[-6.02,e+.88,-.48],
          'M-SAFETY-YELLOW',[.05,.06,.70],'architectural transfer support'),
        b07Decor(`${p}/SC-WC/MIRROR`,'accessible washbasin mirror',[-5.72,e+1.55,.76],
          'M-GLASS',[.82,.82,.04],'wall-mounted accessible mirror'),
        ...b07FacadeWindow(`${p}/SC-WC/WINDOW-W`,e,'west',.30,'accessible washroom',
          {privacy:true,filmHeight:.88,filmY:1.10}),
        b07Sign(`${p}/SC-WC/SIGN`,'accessible WC sign',[-4.45,e+1.62,.76],
          '无障碍卫生间 · ACCESSIBLE WC','facility identification',{yaw:PI,size:[1.15,.28,.04]}),
        ...lightGrid(`${p}/SC-WC`,e,[[-4.85,0]],4100),
      ],{accessible:true}),
      room(`${p}/COUNSEL1`,'心理咨询一',[-6.1,-3.2,1.1,5.1],'clinic',[
        doorway(`${p}/COUNSEL1/TO-SUITE`,'east',[-3.2,e,1.72],1.0,`${p}/COUNSEL-SUITE`),
      ],[
        fixture(`${p}/COUNSEL1/CHAIR-A`,'west counselling lounge chair','PF-CHAIR',[-5.35,e,3.25],
          'M-FABRIC-BLUE','private face-to-face counselling',{yaw:PI/2}),
        fixture(`${p}/COUNSEL1/CHAIR-B`,'east counselling lounge chair','PF-CHAIR',[-3.95,e,3.25],
          'M-FABRIC-BLUE','private face-to-face counselling',{yaw:-PI/2}),
        fixture(`${p}/COUNSEL1/TABLE`,'composed counselling side table','PF-SIDE-TABLE',[-4.65,e,3.25],
          'M-OAK','tissues, water and grounding objects'),
        fixture(`${p}/COUNSEL1/DESK`,'counsellor documentation desk','PF-OFFICE-DESK',[-5.15,e,4.62],
          'M-OAK','confidential notes and follow-up',{size:[1.15,.76,.58]}),
        fixture(`${p}/COUNSEL1/FILES`,'locked counselling files','PF-FILE-CABINET',[-3.60,e,4.65],
          'M-STEEL-DARK','confidential counselling records',{size:[.58,1.20,.38]}),
        fixture(`${p}/COUNSEL1/PLANT`,'calming counselling plant','PF-PLANT',[-5.75,e,1.55],
          'M-PLANT','biophilic privacy-room element',{size:[.42,.95,.42]}),
        fixture(`${p}/COUNSEL1/SOUND-MASK`,'counselling sound-masking speaker','PF-SPEAKER',[-6.02,e+2.18,2.55],
          'M-WALL-GREEN','very-low-level sound masking at the confidential room perimeter',
          {yaw:PI/2,size:[.28,.46,.20],collision:'none'}),
        b07Decor(`${p}/COUNSEL1/RUG`,'soft counselling floor inset',[-4.65,e+.018,3.25],
          'M-RUBBER',[2.20,.025,1.40],'quiet domestic-scale architectural floor finish'),
        b07Decor(`${p}/COUNSEL1/PANEL`,'green acoustic confidentiality wall',[-6.02,e+1.45,3.70],
          'M-WALL-GREEN',[.05,1.65,1.70],'architectural acoustic privacy lining away from the daylight bay'),
        ...b07FacadeWindow(`${p}/COUNSEL1/WINDOW-N`,e,'north',-4.70,'counselling room',
          {privacy:true,filmHeight:.82,filmY:1.05}),
        b07Sign(`${p}/COUNSEL1/PRIVACY`,'confidentiality sign',[-3.24,e+2.22,4.15],
          '安心倾听 · CONFIDENTIAL','privacy reassurance',{yaw:-PI/2,size:[1.45,.28,.04]}),
        b07Raft(`${p}/COUNSEL1/RAFT`,e,-4.65,3.35,2.15,1.15,'M-WALL-GREEN'),
        b07Pendant(`${p}/COUNSEL1/PENDANT`,e,-4.65,3.25,
          'soft domestic-scale light over tissues, water and grounding objects','M-BRASS',3000,430),
        b07TaskLight(`${p}/COUNSEL1/DESK-LIGHT`,e,-5.15,4.55,
          'localized confidential-notes light with low glare toward the conversation area',3500,.68,.22),
        ...lightGrid(`${p}/COUNSEL1`,e,[[-4.65,3.35]],3400),
      ],{capacity:3}),
      room(`${p}/COUNSEL2`,'心理咨询二与私密前室',[-3.0,-.1,1.1,5.1],'clinic',[
        doorway(`${p}/COUNSEL2/TO-COR`,'south',[-.70,e,1.1],1.0,`${p}/COUNSEL-SUITE`),
        doorway(`${p}/COUNSEL2/TO-C1`,'west',[-3.0,e,1.72],1.0,`${p}/COUNSEL1`),
      ],[
        fixture(`${p}/COUNSEL2/CHAIR-A`,'west counselling lounge chair','PF-CHAIR',[-2.25,e,3.35],
          'M-FABRIC-RED','private face-to-face counselling',{yaw:PI/2}),
        fixture(`${p}/COUNSEL2/CHAIR-B`,'east counselling lounge chair','PF-CHAIR',[-.85,e,3.35],
          'M-FABRIC-RED','private face-to-face counselling',{yaw:-PI/2}),
        fixture(`${p}/COUNSEL2/TABLE`,'composed counselling side table','PF-SIDE-TABLE',[-1.55,e,3.35],
          'M-OAK','tissues, water and grounding objects'),
        fixture(`${p}/COUNSEL2/DESK`,'counsellor documentation desk','PF-OFFICE-DESK',[-2.15,e,4.62],
          'M-OAK','confidential notes and follow-up',{size:[1.15,.76,.58]}),
        fixture(`${p}/COUNSEL2/FILES`,'locked counselling files','PF-FILE-CABINET',[-.55,e,4.65],
          'M-STEEL-DARK','confidential counselling records',{size:[.58,1.20,.38]}),
        fixture(`${p}/COUNSEL2/SOUND-MASK`,'counselling sound-masking speaker','PF-SPEAKER',[-.14,e+2.18,2.62],
          'M-WALL-GREEN','very-low-level sound masking at the confidential room perimeter',
          {yaw:-PI/2,size:[.28,.46,.20],collision:'none'}),
        b07Decor(`${p}/COUNSEL2/VESTIBULE`,'acoustic privacy vestibule floor field',[-1.55,e+.018,1.70],
          'M-VINYL',[2.70,.025,1.20],'clear 1.20 metre privacy-buffered route to both counselling rooms'),
        b07Decor(`${p}/COUNSEL2/SCREEN`,'acoustic privacy screen',[-1.55,e+1.20,2.42],
          'M-WALL-GREEN',[2.65,2.10,.05],'architectural separation between circulation and counselling'),
        b07Decor(`${p}/COUNSEL2/RUG`,'soft counselling floor inset',[-1.55,e+.018,3.35],
          'M-RUBBER',[2.20,.025,1.30],'quiet domestic-scale architectural floor finish'),
        ...b07FacadeWindow(`${p}/COUNSEL2/WINDOW-N`,e,'north',-1.50,'counselling room',
          {privacy:true,filmHeight:.82,filmY:1.05}),
        b07Sign(`${p}/COUNSEL2/PRIVACY`,'confidentiality sign',[-.14,e+2.22,4.18],
          '缓慢呼吸 · BREATHE','privacy reassurance',{yaw:-PI/2,size:[1.35,.28,.04]}),
        b07Raft(`${p}/COUNSEL2/RAFT`,e,-1.55,3.45,2.15,1.10,'M-WALL-GREEN'),
        b07Pendant(`${p}/COUNSEL2/PENDANT`,e,-1.55,3.35,
          'soft domestic-scale light over tissues, water and grounding objects','M-BRASS',3000,430),
        b07TaskLight(`${p}/COUNSEL2/DESK-LIGHT`,e,-2.15,4.55,
          'localized confidential-notes light with low glare toward the conversation area',3500,.68,.22),
        ...lightGrid(`${p}/COUNSEL2`,e,[[-1.55,3.45]],3400),
      ],{capacity:3}),
      room(`${p}/OBSERVE`,'治疗观察室',[.1,3.6,1.1,5.1],'clinic',[
        doorway(`${p}/OBSERVE/TO-COR`,'south',[1.85,e,1.1],1.2,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/OBSERVE/C1`,'west observation couch','PF-EXAM-COUCH',[.65,e,3.75],
          'M-CLINIC','short clinical observation',{yaw:PI/2}),
        fixture(`${p}/OBSERVE/C2`,'east observation couch','PF-EXAM-COUCH',[3.00,e,3.75],
          'M-CLINIC','short clinical observation',{yaw:PI/2}),
        fixture(`${p}/OBSERVE/SINK`,'observation-room handwash','PF-HANDWASH',[.45,e,1.55],
          'M-STAINLESS','hand hygiene at the clean threshold'),
        fixture(`${p}/OBSERVE/CAB`,'observation supply cabinet','PF-CLINIC-CABINET',[3.25,e,1.55],
          'M-CLINIC','sealed vital-sign and dressing supplies',{size:[.58,1.75,.40]}),
        fixture(`${p}/OBSERVE/TROLLEY`,'mobile observation trolley','PF-FILE-CABINET',[.48,e,2.35],
          'M-STAINLESS','vital-sign equipment',{size:[.52,.85,.40]}),
        b07Decor(`${p}/OBSERVE/DIVIDER`,'frosted observation divider',[1.85,e+1.25,3.75],
          'M-GLASS',[.04,2.20,2.05],'architectural visual privacy between couches'),
        fixture(`${p}/OBSERVE/MON1`,'west observation display','PF-SCREEN',[.16,e+1.62,4.18],
          'M-SCREEN','non-identifying patient status',{yaw:PI/2,size:[.72,.48,.04],text:'观察 A'}),
        fixture(`${p}/OBSERVE/MON2`,'east observation display','PF-SCREEN',[3.54,e+1.62,4.18],
          'M-SCREEN','non-identifying patient status',{yaw:-PI/2,size:[.72,.48,.04],text:'观察 B'}),
        ...b07FacadeWindow(`${p}/OBSERVE/WINDOW-N`,e,'north',1.70,'observation room',
          {privacy:true,filmHeight:.88,filmY:1.08}),
        b07Raft(`${p}/OBSERVE/RAFT-W`,e,.65,3.75,1.15,2.15,'M-WALL-GREEN'),
        b07Raft(`${p}/OBSERVE/RAFT-E`,e,3.00,3.75,1.15,2.15,'M-WALL-GREEN'),
        b07Pendant(`${p}/OBSERVE/CALM`,e,1.85,2.25,
          'dimmable low-stress light for quiet observation between clinical checks','M-BRASS',3200,450),
        ...lightGrid(`${p}/OBSERVE`,e,[[.65,3.75],[3.00,3.75]],4200),
      ],{capacity:4}),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/DUAL-COR`,bounds:[-3.8,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},
      {id:`${p}/COUNSEL-SUITE`,bounds:[-3.0,-.1,1.10,2.30],clearWidth:1.20,surface:'M-VINYL'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false),
      fixture(`${p}/FIRE-SEP`,'self-closing care-suite fire door','PF-DOOR-SINGLE',[3.70,e,0],
        'M-STEEL','protected separation before the shared lift lobby',{yaw:0,selfClosing:true}),
      ...corridorLayer(p,e,'舞蹈 ↓','咨询 ↑'),
    ],{occupancy:36,visualReview:{
      entry:{zoneId:`${p}/DANCE`,at:{x:-3.20,z:-3.65,yaw:PI},body:'evidence',
        focusFixtureIds:[`${p}/DANCE/TITLE`]},
      programme:{roomId:`${p}/DANCE`,at:{x:-2.00,z:-3.70,yaw:1.40},
        focusFixtureIds:[`${p}/DANCE/M1`,`${p}/DANCE/M2`,`${p}/DANCE/BENCH`]},
    }}));
  }

  // Floor 3: production and making south; health learning, administration and staff respite north.
  {
    const level=3,e=6,p='B07/F3';
    const rooms=[
      room(`${p}/MEDIA`,'学生媒体室',[-6.1,-1.4,-5.1,-1.1],'activity',[
        doorway(`${p}/MEDIA/TO-COR`,'north',[-2.10,e,-1.1],1.2,`${p}/DUAL-COR`,
          {operation:'sliding-pocket',pocketSide:'west',reviewOpen:true,
            designIntent:'permanently open recessed media-room arrival pocket; no exposed panel in the shared landing'}),
      ],[
        fixture(`${p}/MEDIA/PC1`,'editing workstation A','PF-COMPUTER-DESK',[-5.30,e,-4.62],
          'M-OAK','audio and video editing'),
        fixture(`${p}/MEDIA/PC2`,'editing workstation B','PF-COMPUTER-DESK',[-3.75,e,-4.62],
          'M-OAK','audio and video editing'),
        fixture(`${p}/MEDIA/PC3`,'editing workstation C','PF-COMPUTER-DESK',[-2.20,e,-4.62],
          'M-OAK','colour and sound finishing'),
        fixture(`${p}/MEDIA/PC4`,'ingest and archive workstation','PF-COMPUTER-DESK',[-5.72,e,-2.20],
          'M-STEEL-DARK','media ingest and archive',{yaw:PI/2}),
        fixture(`${p}/MEDIA/RACK`,'camera and microphone shelving','PF-SHELF',[-5.55,e,-1.30],
          'M-STEEL','checked-out camera, audio and lighting kits',{yaw:PI,size:[.85,1.85,.40]}),
        fixture(`${p}/MEDIA/REVIEW-C1`,'edit-review chair A','PF-CHAIR',[-3.30,e,-3.35],
          'M-FABRIC-BLUE','group edit review facing the east display',{yaw:PI/2}),
        fixture(`${p}/MEDIA/REVIEW-C2`,'edit-review chair B','PF-CHAIR',[-3.30,e,-2.65],
          'M-FABRIC-BLUE','group edit review facing the east display',{yaw:PI/2}),
        fixture(`${p}/MEDIA/REVIEW`,'large edit-review display','PF-SCREEN',[-1.48,e+1.55,-3.20],
          'M-SCREEN','group review, colour and sound checks',{yaw:-PI/2,size:[1.65,1.05,.05],text:'学生媒体 · MEDIA LAB'}),
        fixture(`${p}/MEDIA/REVIEW-SPK-A`,'left edit-review monitor speaker','PF-SPEAKER',[-1.48,e+2.05,-4.30],
          'M-STEEL-DARK','composed near-field playback for group edit review',
          {yaw:-PI/2,size:[.30,.52,.22],collision:'none'}),
        fixture(`${p}/MEDIA/REVIEW-SPK-B`,'right edit-review monitor speaker','PF-SPEAKER',[-1.48,e+2.05,-2.10],
          'M-STEEL-DARK','composed near-field playback for group edit review',
          {yaw:-PI/2,size:[.30,.52,.22],collision:'none'}),
        fixture(`${p}/MEDIA/BOARD`,'production planning board','PF-WHITEBOARD',[-2.60,e+1.45,-5.02],
          'M-WHITEBOARD','shot lists, edit notes and publishing calendar',{yaw:0,size:[1.80,.90,.05]}),
        b07Decor(`${p}/MEDIA/ACOUSTIC-S`,'charcoal acoustic south wall',[-2.60,e+1.42,-5.04],
          'M-STEEL-DARK',[2.10,2.50,.05],'architectural edit-room sound absorption beside the facade bay'),
        b07Decor(`${p}/MEDIA/ACOUSTIC-W`,'blue acoustic west wall',[-6.02,e+1.45,-1.78],
          'M-FABRIC-BLUE',[.05,2.35,1.05],'architectural reverberation control clear of the daylight bay'),
        ...b07FacadeWindow(`${p}/MEDIA/WINDOW-W`,e,'west',-3.70,'student media room'),
        ...b07FacadeWindow(`${p}/MEDIA/WINDOW-S`,e,'south',-4.70,'student media room'),
        b07Sign(`${p}/MEDIA/ON-AIR`,'media production status sign',[-4.85,e+2.20,-1.16],
          '录制中 · ON AIR','live recording and quiet-entry status',{yaw:PI,size:[1.35,.28,.04]}),
        b07Raft(`${p}/MEDIA/RAFT-W`,e,-4.90,-3.15,1.75,2.55),
        b07Raft(`${p}/MEDIA/RAFT-E`,e,-2.65,-3.15,1.75,2.55),
        b07TaskLight(`${p}/MEDIA/REVIEW-LIGHT`,e,-2.15,-3.20,
          'low-glare edit-review light with controlled screen reflections',3400,.72,.20),
        ...lightGrid(`${p}/MEDIA`,e,[[-4.90,-3.10],[-2.65,-3.10]],3600),
      ],{capacity:7}),
      room(`${p}/PROJECT`,'社团项目室',[-1.2,3.6,-5.1,-1.1],'activity',[
        doorway(`${p}/PROJECT/TO-COR`,'north',[2.70,e,-1.1],1.2,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/PROJECT/T1`,'west club project table','PF-ART-TABLE',[-.10,e,-3.70],
          'M-OAK','model-making and club fabrication',{size:[1.50,.78,.75]}),
        fixture(`${p}/PROJECT/T2`,'east club project table','PF-ART-TABLE',[2.10,e,-3.70],
          'M-OAK','model-making and club fabrication',{size:[1.50,.78,.75]}),
        fixture(`${p}/PROJECT/C1`,'west north project chair','PF-CHAIR',[-.10,e,-3.00],
          'M-FABRIC-BLUE','project work facing south to the west table',{yaw:PI}),
        fixture(`${p}/PROJECT/C2`,'west south project chair','PF-CHAIR',[-.10,e,-4.40],
          'M-FABRIC-BLUE','project work facing north to the west table',{yaw:0}),
        fixture(`${p}/PROJECT/C3`,'east north project chair','PF-CHAIR',[2.10,e,-3.00],
          'M-FABRIC-RED','project work facing south to the east table',{yaw:PI}),
        fixture(`${p}/PROJECT/C4`,'east south project chair','PF-CHAIR',[2.10,e,-4.40],
          'M-FABRIC-BLUE','project work facing north to the east table',{yaw:0}),
        fixture(`${p}/PROJECT/LOCK`,'club project locker bank','PF-LOCKERS',[3.30,e,-4.45],
          'M-STEEL','secure works in progress',{yaw:-PI/2,size:[1.20,1.90,.36]}),
        fixture(`${p}/PROJECT/SHELF`,'prototype display shelf','PF-SHELF',[-.92,e,-2.75],
          'M-STEEL-DARK','completed prototypes and materials',{yaw:PI/2,size:[.85,1.85,.38]}),
        fixture(`${p}/PROJECT/BOARD`,'maker planning whiteboard','PF-WHITEBOARD',[1.15,e+1.48,-1.18],
          'M-WHITEBOARD','club briefs, measurements and task board',{yaw:PI,size:[2.7,.92,.05]}),
        b07Decor(`${p}/PROJECT/FLOOR-GRID`,'maker safety floor grid',[1.05,e+.018,-3.70],
          'M-SAFETY-YELLOW',[3.70,.025,.10],'architectural separation between two making bays'),
        b07Decor(`${p}/PROJECT/WALL-W`,'oak maker pin-up wall',[-.20,e+1.45,-5.02],
          'M-OAK',[1.00,2.50,.05],'architectural project-review backdrop beside the facade bay'),
        b07Decor(`${p}/PROJECT/WALL-E`,'oak maker pin-up wall',[3.12,e+1.45,-5.02],
          'M-OAK',[.62,2.50,.05],'architectural project-review backdrop beside the facade bay'),
        ...b07FacadeWindow(`${p}/PROJECT/WINDOW-S`,e,'south',1.70,'student project room'),
        b07Raft(`${p}/PROJECT/RAFT-W`,e,-.10,-3.70,1.70,2.20),
        b07Raft(`${p}/PROJECT/RAFT-E`,e,2.10,-3.70,1.70,2.20),
        b07Pendant(`${p}/PROJECT/PENDANT-W`,e,-.10,-3.70,
          'warm high-colour-rendering light over the west project table','M-BRASS',3300,780),
        b07Pendant(`${p}/PROJECT/PENDANT-E`,e,2.10,-3.70,
          'warm high-colour-rendering light over the east project table','M-BRASS',3300,780),
        ...lightGrid(`${p}/PROJECT`,e,[[-.10,-3.70],[2.10,-3.70]],3800),
      ],{capacity:6,accessible:true}),
      room(`${p}/HEALTH`,'健康教育室',[-6.1,-.8,1.1,5.1],'clinic',[
        doorway(`${p}/HEALTH/TO-COR`,'south',[-1.55,e,1.1],1.2,`${p}/DUAL-COR`,
          {operation:'sliding-pocket',pocketSide:'west',reviewOpen:true,
            designIntent:'permanently open recessed health-training arrival pocket; no exposed panel in the shared landing'}),
      ],[
        fixture(`${p}/HEALTH/D1`,'health-learning desk pair A','PF-STUDENT-DESK-2',[-5.15,e,4.55],
          'M-WOOD-DESK','CPR, prevention and wellbeing learning'),
        fixture(`${p}/HEALTH/D2`,'health-learning desk pair B','PF-STUDENT-DESK-2',[-3.65,e,4.55],
          'M-WOOD-DESK','CPR, prevention and wellbeing learning'),
        fixture(`${p}/HEALTH/DEMO`,'adult CPR manikin practice couch','PF-EXAM-COUCH',[-2.55,e,3.25],
          'M-CLINIC','adult airway, chest-compression and recovery-position practice with a dedicated trainer',
          {yaw:PI/2,size:[1.75,.78,.68],trainingManikin:true}),
        fixture(`${p}/HEALTH/SCREEN`,'health education display','PF-SCREEN',[-.86,e+1.78,3.25],
          'M-SCREEN','step-by-step airway, chest-compression, AED pad and recovery-position teaching',
          {yaw:PI/2,size:[2.15,1.08,.05],text:'心肺复苏',collision:'none'}),
        fixture(`${p}/HEALTH/AED-TRAINER`,'CPR and AED training cabinet','PF-AED',[-.88,e+1.05,2.15],
          'M-CLINIC','clearly marked non-emergency trainer for practical health education',
          {yaw:PI/2,size:[.58,.68,.18],trainingUnit:true,collision:'none'}),
        fixture(`${p}/HEALTH/FIRST-AID-KIT`,'bandaging and first-aid teaching cabinet','PF-FIRST-AID',
          [-.88,e+1.05,4.72],'M-CLINIC','dressings, triangular bandages, gloves and airway masks for supervised practice',
          {yaw:PI/2,size:[.58,.68,.20],collision:'none'}),
        fixture(`${p}/HEALTH/ANATOMY`,'airway and cardiopulmonary anatomy display','PF-SCREEN',
          [-4.70,e+1.58,5.02],'M-SCREEN','paired airway, heart and recovery-position diagrams above the student workstations',
          {yaw:0,size:[1.35,.72,.05],text:'气道 · 心肺',collision:'none'}),
        fixture(`${p}/HEALTH/DEMO-STOOL`,'health educator rolling stool','PF-STOOL',[-1.35,e,4.55],
          'M-STEEL','mobile instructor seat beside the manikin without blocking the demonstration sightline'),
        b07Decor(`${p}/HEALTH/TEACHING-WALL`,'pale-green health-demonstration wall',[-.835,e+1.43,3.20],
          'M-WALL-GREEN',[.05,2.50,3.60],
          'washable architectural teaching datum tying together the screen, CPR kit and AED trainer'),
        b07Decor(`${p}/HEALTH/ACCESS`,'accessible learning and turning field',[-1.55,e+.018,2.70],
          'M-LAB-BLUE',[1.50,.025,1.50],'wheelchair learning position with a full turn'),
        ...b07FacadeWindow(`${p}/HEALTH/WINDOW-W`,e,'west',4.50,'health education room'),
        ...b07FacadeWindow(`${p}/HEALTH/WINDOW-N1`,e,'north',-4.70,'health education room',
          {privacy:true,filmHeight:.60,filmY:.88}),
        ...b07FacadeWindow(`${p}/HEALTH/WINDOW-N2`,e,'north',-1.50,'health education room',
          {privacy:true,filmHeight:.60,filmY:.88}),
        b07Raft(`${p}/HEALTH/RAFT-W`,e,-4.60,3.35,1.65,2.45,'M-WALL-GREEN'),
        b07Raft(`${p}/HEALTH/RAFT-E`,e,-2.60,3.35,1.65,2.45,'M-WALL-GREEN'),
        b07TaskLight(`${p}/HEALTH/DEMO-LIGHT`,e,-2.15,3.25,
          'high-rendering demonstration light for CPR and first-aid teaching',4200,.82,.28),
        ...lightGrid(`${p}/HEALTH`,e,[[-4.60,3.35],[-2.60,3.35]],4000),
      ],{capacity:9,accessible:true}),
      room(`${p}/ADMIN`,'校医院办公室',[-.6,1.7,1.1,5.1],'office',[
        doorway(`${p}/ADMIN/TO-COR`,'south',[.55,e,1.1],1.0,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/ADMIN/DESK`,'clinic administration desk','PF-OFFICE-DESK',[.50,e,4.55],
          'M-OAK','rota, referrals and service administration',{size:[1.20,.76,.65]}),
        fixture(`${p}/ADMIN/VISITOR`,'private consultation chair','PF-CHAIR',[.50,e,3.62],
          'M-FABRIC-BLUE','staff and student consultation facing the administration desk',{yaw:0}),
        fixture(`${p}/ADMIN/RECORDS`,'locked clinic records cabinet','PF-FILE-CABINET',[1.35,e,2.90],
          'M-STEEL-DARK','confidential clinic administration records',{size:[.58,1.25,.38]}),
        fixture(`${p}/ADMIN/CASE`,'clinic policy bookcase','PF-BOOKCASE',[-.25,e,2.90],
          'M-OAK-DARK','care standards and service manuals',{size:[.58,1.65,.36]}),
        fixture(`${p}/ADMIN/PLANT`,'clinic-office plant','PF-PLANT',[1.38,e,4.72],
          'M-PLANT','soft private administration room',{size:[.42,.95,.42]}),
        fixture(`${p}/ADMIN/BOARD`,'clinic administration board','PF-WHITEBOARD',[.55,e+1.48,5.02],
          'M-WHITEBOARD','staff rota and non-confidential service notices',{yaw:PI,size:[1.70,.78,.04]}),
        b07Decor(`${p}/ADMIN/RUG`,'quiet clinic-office floor inset',[.55,e+.018,3.85],
          'M-RUBBER',[1.70,.025,1.60],'soft architectural floor finish'),
        b07Decor(`${p}/ADMIN/ACOUSTIC`,'clinic administration confidentiality wall',[1.66,e+1.42,3.55],
          'M-WALL-GREEN',[.05,2.35,2.40],'architectural acoustic lining between administration and staff respite'),
        b07Sign(`${p}/ADMIN/PRIVACY`,'records privacy sign',[.55,e+2.25,4.98],
          '医务办公室 · PRIVATE','clinic-office privacy notice',{yaw:PI,size:[1.60,.28,.04]}),
        b07Raft(`${p}/ADMIN/RAFT`,e,.55,3.75,1.75,1.45,'M-WALL-GREEN'),
        b07TaskLight(`${p}/ADMIN/DESK-LIGHT`,e,.50,4.45,
          'localized confidential-records and referral task light',3700,.68,.22),
        ...lightGrid(`${p}/ADMIN`,e,[[.55,3.75]],3700),
      ],{capacity:3}),
      room(`${p}/STAFF`,'医务人员休息与储藏',[1.9,3.6,1.1,5.1],'clinic',[
        doorway(`${p}/STAFF/TO-COR`,'south',[2.75,e,1.1],1.0,`${p}/DUAL-COR`),
      ],[
        fixture(`${p}/STAFF/BENCH`,'staff decompression bench','PF-BENCH',[2.55,e,3.60],
          'M-FABRIC-BLUE','short staff rest and handover',{size:[1.00,.84,.50]}),
        fixture(`${p}/STAFF/TABLE`,'composed staff tea table','PF-SIDE-TABLE',[2.55,e,4.38],
          'M-OAK','tea and handover notes',{size:[.45,.48,.45]}),
        fixture(`${p}/STAFF/LOCK`,'staff clothing lockers','PF-LOCKERS',[3.35,e,4.20],
          'M-STEEL','separate staff clothing and personal storage',{yaw:-PI/2,size:[1.20,1.90,.36]}),
        fixture(`${p}/STAFF/WATER`,'staff water station','PF-WATER',[2.15,e,2.78],
          'M-STEEL','staff hydration'),
        fixture(`${p}/STAFF/PLANT`,'staff-room plant','PF-PLANT',[3.28,e,2.78],
          'M-PLANT','biophilic staff respite element',{size:[.42,.92,.42]}),
        fixture(`${p}/STAFF/NOTICE`,'staff handover board','PF-WHITEBOARD',[3.52,e+1.48,3.10],
          'M-WHITEBOARD','rota, handover and wellbeing notes',{yaw:-PI/2,size:[1.20,.75,.04]}),
        b07Decor(`${p}/STAFF/RUG`,'staff respite floor inset',[2.55,e+.018,3.75],
          'M-RUBBER',[1.20,.025,1.65],'quiet architectural floor finish'),
        b07Sign(`${p}/STAFF/SIGN`,'staff-room sign',[2.75,e+2.20,5.02],
          '医务人员 · STAFF','restricted staff-zone identity',{yaw:PI,size:[1.45,.28,.04]}),
        b07Raft(`${p}/STAFF/RAFT`,e,2.75,3.55,1.25,2.25,'M-WALL-GREEN'),
        b07Pendant(`${p}/STAFF/PENDANT`,e,2.55,4.38,
          'warm decompression light above tea and handover notes','M-BRASS',3000,430),
        ...lightGrid(`${p}/STAFF`,e,[[2.75,3.55]],3900),
      ],{capacity:3}),
      ...b07CoreRooms(level,e,p),
    ];
    floors.push(floor(level,e,3.0,rooms,[
      {id:`${p}/DUAL-COR`,bounds:[-3.8,3.8,-1.0,1.0],clearWidth:2.0,surface:'M-TERRAZZO'},
    ],[
      ...safetySet(p,e,[3.55,-2.45],[3.55,-1],level,false),
      fixture(`${p}/FIRE-SEP`,'self-closing clinic fire-separation door','PF-DOOR-SINGLE',[3.70,e,0],
        'M-STEEL','protected separation before the shared lift lobby',{yaw:0,selfClosing:true}),
      ...corridorLayer(p,e,'媒体 ↓','健康 ↑',
        {signX:-1.20,signSize:[1.45,.30,.05],signYaw:-PI/2}),
      ...b07FacadeWindow(`${p}/COR/WINDOW-W`,e,'west',.30,'shared upper-floor landing'),
    ],{occupancy:36,visualReview:{
      entry:{zoneId:`${p}/DUAL-COR`,at:{x:-1.85,z:-.55,yaw:-1.58},body:'hidden',
        focusFixtureIds:[`${p}/COR/SC-SIGN`,`${p}/COR/CL-SIGN`]},
      programme:{roomId:`${p}/HEALTH`,at:{x:-3.90,z:2.10,yaw:1.30},
        focusFixtureIds:[`${p}/HEALTH/SCREEN`,`${p}/HEALTH/AED-TRAINER`,`${p}/HEALTH/DEMO`]},
    }}));
  }
  return {
    id:'B07',label:'学生活动中心 · 校医院',status:'new-interior',centreCampus:[36.5,28.5],localBounds:[-6.5,6.5,-5.5,5.5],
    exteriorFootprint:{x0:30,x1:43,z0:23,z1:34},floors:3,floorHeight:3.0,wallThickness:.24,partitionThickness:.12,
    localToCampus:{worldX:'36.5 + localX',worldZ:'28.5 + localZ'},
    portals:[
      {id:'B07/STUDENT',campusAt:[30,27],campusReturn:[27.4,27,PI/2],localSpawn:[-5.2,0,-1.5,PI/2],placeKey:'campus_student_f1'},
      {id:'B07/CLINIC',campusAt:[30,31],campusReturn:[27.4,31,PI/2],localSpawn:[-5.2,0,2.5,PI/2],placeKey:'campus_clinic_f1'},
    ],
    facadeAlignment:{
      studentDoor:{side:'west',localAt:[-6.5,-1.5],width:2.2},
      clinicDoor:{side:'west',localAt:[-6.5,2.5],width:2.2},
      groundWestGlazing:[{room:'F1/SC-COMMONS',localZ:-4.10,span:1.28,height:2.05},{room:'F1/CL-WAIT',localZ:4.50,span:1.28,height:2.05,privacy:'frosted lower layer'}],
      upperWindowRhythm:{westZ:[-3.70,.30,4.50],southNorthX:[-4.70,-1.50,1.70,4.90],eastCoreZ:[-3.70,-.50,2.70]},
      clinicPrivacyTreatment:'All counselling, observation and health-learning facade bays retain daylight with a frosted lower architectural layer.',
      fireSeparation:{localZ:0,ratingMinutes:60},
    },
    design:'A measured split-use student and health hub with two unmistakable but compatible identities. Warm 3000–3400 K pendants, oak, brick, blue textile, live club schedules, visible project work, correctly segmented safety mirrors and barres, floor formation marks, studio-care details and composed media/rehearsal equipment animate the south student-centre rooms. North of the protected threshold, pale green ceilings, clinical laminate, hand-hygiene stations, privacy glazing, sound masking, acoustic confidentiality layers, dimmable counselling light, a grouped health-demonstration screen/CPR/AED wall and calm bilingual wayfinding create a quieter health setting. Interior glazing now follows the exact ground and upper exterior window rhythm, with frosted lower layers only where privacy requires them. Both identities meet only at a protected, self-closing core threshold; the two external arrivals, north and south stairs, accessible lift and colour-coded routes remain legible on every floor.',
    interiorCharacter:{
      student:{palette:['sealed oak','brick','muted blue/red textile','brass warm-light accents'],lighting:'warm pendants layered below 3400–3800 K ceiling task light',details:['live club schedule','project display and lockers','segmented safety-mirror/barre wall','studio formation marks and care rail','near-field media review speakers','maker-table pendants']},
      clinic:{palette:['pale green','clinical laminate','quiet oak','frosted safety glazing'],lighting:'3200 K calm/dimmable light separated from 3900–4300 K clinical task light',privacy:['frosted lower facade layers','sound masking','acoustic wall and ceiling fields','anonymous queue/status displays','locked records and medicine storage'],education:['grouped health-teaching display','CPR and first-aid cabinet','clearly marked AED trainer']},
      sharedCore:{materials:['terrazzo','oak student-side raft','green clinic-side raft','charcoal protected portals'],lighting:'3800–4000 K general and emergency coverage in every enclosed core room'},
    },
    planningMetrics:{
      publicRoutes:{groundDualIdentity:1.30,upperShared:2.0,counsellingPrivacyVestibule:1.20},
      accessibleTurns:{liftLobbies:1.50,studentWC:1.50,clinicWaiting:1.50,healthEducation:1.50},
      doors:{studentEntrance:2.20,clinicEntrance:2.20,programmeMinimum:1.0,protectedCore:1.20},
      privacy:{pharmacySetback:1.0,counsellingBuffer:1.20,observationAisle:1.63},
      clinicalWorkflow:['separate clinic entry','private registration','exam handwash','treatment handwash','observation clean threshold','locked pharmacy'],
      studentWorkflow:['club check-in','commons','flex events','dance rehearsal','media production','project making'],
      facadeDaylight:{groundAlignedBays:2,upperProgrammeBays:15,upperProtectedCoreBays:10,privacyLayers:7},
      lightingLayers:{studentWarmPendantZones:9,clinicCalmPendantZones:7,localizedTaskZones:16,authoredCoreGeneralLights:9},
      floorOccupancy:{F1:54,F2:36,F3:36},
    },
    floorsPlan:floors,
  };
}

function buildB08() {
  const e=0,p='B08/F1',workB=[-2.82,1.15,-2.4,2.4],wcB=[1.35,2.7,-2.4,-.25],entryB=[1.35,2.7,-.05,2.4];
  const rooms=[
    room(`${p}/WORK`,'门卫值班室',workB,'security',[
      doorway(`${p}/WORK/TO-CLEAR`,'east',[1.15,e,1.55],1.2,`${p}/CLEAR`,
        {operation:'hinged',swing:'into-work',hinge:'south',swingArcClear:true}),
    ],[
      fixture(`${p}/WORK/FEATURE`,'north timber command-wall datum','PF-WALL-RUN',[-.55,e+1.45,2.33],'M-OAK-DARK','architectural wall datum on the solid north wall behind the surveillance display',{size:[2.75,2.78,.06],collision:'none'}),
      fixture(`${p}/WORK/CCTV-WALL`,'north live campus surveillance header','PF-SCREEN',[-.55,e+2.42,2.285],
        'M-SCREEN','short live-CCTV and incident-state header above the four unmistakable camera feeds',
        {yaw:0,size:[2.35,.30,.035],text:'CCTV · LIVE',collision:'none'}),
      fixture(`${p}/WORK/CCTV-CAM01`,'west-gate live camera feed','PF-SCREEN',[-1.18,e+1.83,2.28],
        'M-SCREEN','live west-gate surveillance image with camera number and recording state',
        {yaw:0,size:[1.08,.48,.035],text:'CAM 01',collision:'none'}),
      fixture(`${p}/WORK/CCTV-CAM02`,'library-walk live camera feed','PF-SCREEN',[.08,e+1.83,2.28],
        'M-SCREEN','live library-walk surveillance image with camera number and recording state',
        {yaw:0,size:[1.08,.48,.035],text:'CAM 02',collision:'none'}),
      fixture(`${p}/WORK/CCTV-CAM03`,'student-centre live camera feed','PF-SCREEN',[-1.18,e+1.25,2.28],
        'M-SCREEN','live student-centre surveillance image with camera number and recording state',
        {yaw:0,size:[1.08,.48,.035],text:'CAM 03',collision:'none'}),
      fixture(`${p}/WORK/CCTV-CAM04`,'science-entry live camera feed','PF-SCREEN',[.08,e+1.25,2.28],
        'M-SCREEN','live science-entry surveillance image with camera number and recording state',
        {yaw:0,size:[1.08,.48,.035],text:'CAM 04',collision:'none'}),
      fixture(`${p}/WORK/ACOUSTIC-L`,'left woven acoustic reveal','PF-WALL-RUN',[-2.08,e+1.72,2.29],'M-FABRIC-SAND','softens radio and intercom reflections beside the north surveillance wall',{size:[.24,1.58,.035],collision:'none'}),
      fixture(`${p}/WORK/ACOUSTIC-R`,'right woven acoustic reveal','PF-WALL-RUN',[.98,e+1.72,2.29],'M-FABRIC-SAGE','softens radio and intercom reflections beside the north surveillance wall',{size:[.24,1.58,.035],collision:'none'}),
      fixture(`${p}/WORK/CONSOLE`,'four-monitor security console','PF-CCTV-DESK',[-.60,e,.30],'M-OAK-DARK','north-facing CCTV, radio, intercom and barrier controls',{yaw:0,size:[1.68,.82,.72],preserveExteriorSilhouetteAtCampus:[8.8,-9.4]}),
      fixture(`${p}/WORK/CHAIR`,'ergonomic shift chair','PF-CHAIR',[-.60,e,-.65],'M-FABRIC-BLUE','north-facing staffed command position aligned to all four desk monitors',{yaw:0,facing:'north',facesFixture:`${p}/WORK/CONSOLE`}),
      fixture(`${p}/WORK/RUG`,'acoustic command-zone floor inset','PF-WALL-RUN',[-.60,e+.016,-.18],'M-RUBBER','flush acoustic floor finish beneath console and chair',{size:[2.25,.025,2.00],collision:'none'}),
      fixture(`${p}/WORK/KEYS`,'controlled key and visitor-badge cabinet','PF-KEY-CABINET',[1.08,e+1.42,0],'M-STEEL-DARK','guard-controlled campus keys and issued visitor badges',{yaw:PI/2,size:[.62,.84,.14]}),
      fixture(`${p}/WORK/COUNTER`,'glazed visitor-service counter','PF-SERVICE-COUNTER',[-2.56,e,.20],'M-OAK','visitor log, ID check and badge issue at the preserved west window',{yaw:-PI/2,size:[1.30,1.05,.44],staffAisle:.90}),
      fixture(`${p}/WORK/WINDOW`,'west visitor transaction glazing','PF-WALL-RUN',[-2.815,e+1.80,.20],'M-GLASS','security glazing centred exactly on the preserved exterior guard window',{size:[.035,1.10,1.60],collision:'none'}),
      fixture(`${p}/WORK/WINDOW-BAR`,'visitor window pass ledge','PF-WALL-RUN',[-2.785,e+1.15,.20],'M-BRASS','architectural transaction ledge below the protected pass opening',{size:[.06,.06,1.40],collision:'none'}),
      fixture(`${p}/WORK/PARCEL`,'labelled parcel shelf','PF-SHELF',[-2.62,e,1.65],'M-STEEL','temporary visitor parcels and lost property',{yaw:-PI/2,size:[.90,1.75,.38]}),
      fixture(`${p}/WORK/NOTICE`,'shift briefing and emergency map','PF-WHITEBOARD',[-2.36,e+1.55,2.335],'M-WHITEBOARD','compact shift notes and emergency map beside the north command datum',{yaw:0,size:[.70,.78,.04]}),
      fixture(`${p}/WORK/FIRST`,'first-aid cabinet','PF-FIRST-AID',[1.08,e+1.25,-.55],'M-CLINIC','first aid at the staffed perimeter',{yaw:PI/2}),
      fixture(`${p}/WORK/WATER`,'thermos and water station','PF-WATER',[-2.58,e,-1.75],'M-STEEL','guard drinks in the southwest service bay',{yaw:-PI/2}),
      fixture(`${p}/WORK/LOCK`,'guard locker bank','PF-LOCKERS',[-2.57,e,-1.00],'M-STEEL-DARK','guard clothing and cleaning kit consolidated in the west service bay between drinking water and the visitor counter',{yaw:-PI/2,size:[.90,1.9,.42]}),
      fixture(`${p}/WORK/CLOCK`,'wall clock','PF-CLOCK',[-2.785,e+2.45,-1.55],'M-WALL-WHITE','shift time on the solid west-wall service bay',{yaw:-PI/2}),
      fixture(`${p}/WORK/AC`,'wall air conditioner','PF-AC',[1.08,e+2.48,-1.35],'M-WALL-WHITE','guardhouse climate unit on the solid east wall above the locker bank and clear of glazing',{yaw:PI/2}),
      fixture(`${p}/WORK/PENDANT`,'visitor-counter pendant','PF-PENDANT',[-2.52,e+2.72,.20],'M-BRASS','warm task light centred over the public service point',{temperatureK:3000}),
      ...lightGrid(`${p}/WORK`,e,[[-.75,1.15],[.35,-.75]],3500),
    ]),
    room(`${p}/WC`,'值班卫生间',wcB,'service',[
      doorway(`${p}/WC/TO-ENTRY`,'north',[2.05,e,-.25],.90,`${p}/ENTRY`,
        {operation:'sliding-pocket',pocketSide:'east',swingArcClear:true}),
    ],[
      fixture(`${p}/WC/T`,'side-wall compact toilet','PF-TOILET',[2.40,e,-1.85],'M-CERAMIC','west-facing staff sanitary fixture with a clear use zone',{yaw:PI/2,facing:'west'}),
      fixture(`${p}/WC/B`,'south-wall compact washbasin','PF-BASIN',[1.62,e,-2.20],'M-CERAMIC','hand washing outside the toilet use zone',{yaw:PI,size:[.42,.86,.35],facing:'south'}),
      fixture(`${p}/WC/MIRROR`,'framed basin mirror','PF-DANCE-MIRROR',[1.62,e+1.55,-2.365],'M-GLASS','mirror centred directly above the washbasin',{yaw:PI,size:[.70,.72,.035]}),
      fixture(`${p}/WC/MAT`,'anti-slip washroom floor field','PF-WALL-RUN',[1.86,e+.014,-1.58],'M-TILE-DARK','flush dry standing floor between basin, toilet and door',{size:[.82,.02,.70],collision:'none'}),
      fixture(`${p}/WC/SIGN`,'staff WC sign','PF-ROOM-SIGN',[2.05,e+1.92,-.22],'M-SCREEN','identify the compact staff washroom',{yaw:0,size:[.82,.26,.04],text:'卫生间'}),
      ...lightGrid(`${p}/WC`,e,[[2.05,-1.65]],4000),
    ],{services:{mechanicalExtract:'concealed ceiling extract, 10 air changes/hour; no decorative grille object'}}),
    room(`${p}/ENTRY`,'员工入口与储物',entryB,'security',[
      doorway(`${p}/ENTRY/EXT`,'north',[1.8,e,2.7],.95,'campus',
        {portal:true,operation:'hinged',swing:'outward',hinge:'east',swingArcClear:true}),
      doorway(`${p}/ENTRY/TO-CLEAR`,'west',[1.35,e,1.55],1.2,`${p}/CLEAR`,
        {operation:'hinged',swing:'into-entry',hinge:'south',swingArcClear:true}),
      doorway(`${p}/ENTRY/TO-WC`,'south',[2.05,e,-.05],.90,`${p}/WC`,
        {operation:'sliding-pocket',pocketSide:'east',swingArcClear:true}),
    ],[
      fixture(`${p}/ENTRY/MAT`,'recessed ribbed entry mat','PF-WALL-RUN',[2.02,e+.02,1.85],'M-RUBBER','clean and slip-resistant entry',{size:[1.05,.04,1.45],collision:'none'}),
      fixture(`${p}/ENTRY/GLASS-S`,'south work-door sidelight','PF-WALL-RUN',[1.315,e+1.42,.45],'M-GLASS','architectural security glazing south of the work-room door',{size:[.035,2.65,.75],collision:'none'}),
      fixture(`${p}/ENTRY/GLASS-N`,'north work-door sidelight','PF-WALL-RUN',[1.315,e+1.42,2.28],'M-GLASS','slender architectural security glazing beside the door vision panel',{size:[.035,2.65,.20],collision:'none'}),
      fixture(`${p}/ENTRY/SIGN`,'security room identity blade','PF-ROOM-SIGN',[2.655,e+2.12,1.58],'M-SCREEN','staff entrance identity',{yaw:PI/2,text:'值班室',size:[.82,.28,.04]}),
      fixture(`${p}/ENTRY/ACCESS`,'wall-mounted staff access terminal','PF-SCREEN',[2.665,e+1.28,2.08],'M-SCREEN','staff credential check and shift check-in',{yaw:PI/2,size:[.36,.28,.04],collision:'none'}),
      fixture(`${p}/ENTRY/BADGES`,'secure staff credential cabinet','PF-KEY-CABINET',[2.655,e+1.38,.95],'M-STEEL-DARK','spare staff passes and emergency access cards',{yaw:PI/2,size:[.50,.75,.12]}),
      fixture(`${p}/ENTRY/LIGHT`,'vestibule ceiling light','PF-CEILING-LIGHT',[2.02,e+2.75,1.30],'M-WALL-WHITE','bright safe arrival',{temperatureK:3500,lumens:1600,size:[.70,.06,.28]}),
    ]),
  ];
  return {
    id:'B08',label:'门卫 · 访客室',status:'new-interior',centreCampus:[9.4,-9.7],localBounds:[-3,3,-2.7,2.7],
    exteriorFootprint:{x0:6.4,x1:12.4,z0:-12.4,z1:-7},floors:1,floorHeight:3.2,wallThickness:.18,partitionThickness:.10,
    localToCampus:{worldX:'9.4 + localX',worldZ:'-9.7 + localZ'},
    portals:[{id:'B08/STAFF',campusAt:[11.2,-7],campusReturn:[11.2,-5.8,PI],localSpawn:[1.8,0,1.65,PI],placeKey:'campus_security'}],
    facadeChanges:[{id:'B08/DOOR-N','instruction':'Add a 0.95 m north-facing staff door centred at campus (11.2,-7.0); preserve the west service window at (6.4,-9.5).'}],
    facadeAlignment:{westServiceWindow:{localX:-3,localZ:.2,interiorGlazingLocal:[-2.815,.2],counterLocal:[-2.56,.2]},
      southWindow:{localZ:-2.7,exteriorGlazingCampus:[9.4,-12.43],interiorGlazingLocal:[0,-2.365],width:2.4,height:1.3},
      preservedDeskSilhouetteCampus:[8.8,-9.4],consoleLocal:[-.6,.3]},
    design:'A compact 24-hour security pavilion with an exterior-only visitor transaction and a separate controlled staff entrance. The preserved west window aligns exactly with a shallow composed service counter, protected pass ledge and guard-controlled badge cabinet; visitors never enter the secure workroom. The fully revealed south window has an aligned interior glazing assembly, sill, head and jambs, while the command feature moves to the solid north wall. The detailed four-screen console retains the exterior desk silhouette and its north-facing chair directly addresses both desk monitors and the command display without blocking daylight. Clear glazed sidelights preserve views to the staff vestibule. Woven acoustic reveals flank the live surveillance wall, while perimeter bays keep parcels, uniforms, first aid and drinks away from displays. The compact WC uses a pocket door, side-wall toilet and correctly paired south-wall basin and mirror. Oak wall cladding, blue/sage/sand textiles, dark steel, brass and a real acoustic ceiling form one disciplined material system.',
    operationalClearances:{entryRoute:.95,workDoorApproach:1.15,wcDoorApproach:1.15,consoleChairGap:.35,
      visitorCounterStaffAisle:.90,visitorWindowFrameEachSide:.15,wcDoorLandingBuffer:.09,
      resolvedArrivalLocal:[1.80,.45],resolvedArrivalRoom:'ENTRY',programmeOccupancy:4},
    visitorWorkflow:{mode:'exterior transaction; visitor remains outside the secure pavilion',steps:[
      {order:1,atCampus:[6.4,-9.5],action:'visitor presents identification through the west security window'},
      {order:2,atLocal:[-2.56,.2],action:'guard logs visit and issues a controlled badge at the pass ledge'},
      {order:3,atLocal:[-2.4,1.65],action:'oversize parcel or retained item moves to the labelled secure shelf'},
      {order:4,atLocal:[1.08,0],action:'badge is reconciled in the guard-controlled key cabinet on return'},
    ],guardSightlines:{seatedEyeLocal:[-.60,-.65],facing:'north',consoleLocal:[-.60,.30],visitorWindowLocal:[-2.815,.2],entryDoorVisionLocal:[1.315,2.13]}},
    floorsPlan:[floor(1,0,3.2,rooms,[{id:`${p}/CLEAR`,bounds:[.95,1.4,-.1,2.4],clearWidth:.95,surface:'M-TILE-DARK'}],[
      fixture(`${p}/WORK/SOUTH-WINDOW/GLASS`,'south facade interior glazing','PF-WALL-RUN',
        [0,e+1.72,-2.365],'M-GLASS','transparent interior glazing aligned exactly with the full exterior south window',{size:[2.40,1.30,.035],collision:'none',facadeWindow:'south'}),
      fixture(`${p}/WORK/SOUTH-WINDOW/SILL`,'south window architectural sill','PF-WALL-RUN',
        [0,e+1.035,-2.345],'M-OAK','continuous interior sill beneath the south glazing reveal',{size:[2.55,.10,.10],collision:'none'}),
      fixture(`${p}/WORK/SOUTH-WINDOW/HEAD`,'south window architectural head','PF-WALL-RUN',
        [0,e+2.42,-2.345],'M-OAK-DARK','continuous shadow head above the south glazing reveal',{size:[2.55,.10,.10],collision:'none'}),
      fixture(`${p}/WORK/SOUTH-WINDOW/JAMB-W`,'south window west architectural jamb','PF-WALL-RUN',
        [-1.26,e+1.72,-2.345],'M-OAK-DARK','slender framed west jamb outside the clear glazing span',{size:[.10,1.52,.10],collision:'none'}),
      fixture(`${p}/WORK/SOUTH-WINDOW/JAMB-E`,'south window east architectural jamb','PF-WALL-RUN',
        [1.26,e+1.72,-2.345],'M-OAK-DARK','slender framed east jamb outside the clear glazing span',{size:[.10,1.52,.10],collision:'none'}),
      fixture(`${p}/SAFE-EXT`,'recessed fire extinguisher cabinet','PF-EXTINGUISHER',
        [2.655,e,.35],'M-SAFETY-RED','single first-response extinguisher recessed on the vestibule east wall, clear of glazing and egress',{yaw:PI/2}),
      fixture(`${p}/SAFE-ALM`,'fire alarm call point','PF-ALARM',
        [1.105,e+1.25,-1.15],'M-SAFETY-RED','manual alarm on the staffed east wall',{yaw:PI/2}),
      fixture(`${p}/SAFE-EXS`,'illuminated staff-exit sign','PF-EXIT-SIGN',
        [1.8,e+2.35,2.38],'M-SCREEN','egress marking over the only exterior staff door',{yaw:0,text:'出口 EXIT'}),
      fixture(`${p}/SAFE-EML`,'vestibule emergency light','PF-EMERGENCY-LIGHT',
        [2.655,e+2.42,2.18],'M-WALL-WHITE','battery lighting on the vestibule east wall',{yaw:PI/2}),
      fixture(`${p}/CEILING-RAFT`,'perforated acoustic command-room ceiling raft','PF-WALL-RUN',[-.60,e+2.93,1.15],
        'M-ACOUSTIC','genuine speech-absorbing ceiling field aligned over the staffed command zone',
        {size:[2.10,.045,1.55],collision:'none'}),
      fixture(`${p}/BRAND`,'university security crest wall','PF-ROOM-SIGN',[-2.63,e+2.38,1.72],'M-BRASS','institutional identity at the visitor window',{yaw:-PI/2,size:[1.30,.30,.04],text:'校园安全'}),
    ],{occupancy:4,visualReview:{
      entries:[{suffix:'entry',portalId:'B08/STAFF',focusRoomId:`${p}/WORK`,cameraZoneId:`${p}/WORK`,
        focusAt:{x:-1.95,z:-.25,yaw:-.10},body:'hidden',
        focusFixtureIds:[`${p}/WORK/CCTV-CAM01`,`${p}/WORK/CCTV-CAM04`,`${p}/WORK/COUNTER`]}],
      programme:{roomId:`${p}/WORK`,at:{x:-1.95,z:-.25,yaw:-.10},
        focusFixtureIds:[`${p}/WORK/CCTV-CAM01`,`${p}/WORK/CCTV-CAM02`,`${p}/WORK/CCTV-CAM03`,`${p}/WORK/CCTV-CAM04`]},
    }})],
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

function completeStairSafety() {
  let added=0;
  const distance=(a,b)=>Math.hypot(a.at[0]-b.at[0],a.at[2]-b.at[2]);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  for(const building of buildings) for(const f of building.floorsPlan) for(const room of f.rooms) {
    for(const stair of room.contents.filter(q=>q.prefab==='PF-STAIR')) {
      const all=()=>f.rooms.flatMap(r=>r.contents).concat(f.sharedObjects||[]);
      const door=[...(room.doors||[])].sort((a,b)=>
        Math.hypot(a.at[0]-stair.at[0],a.at[2]-stair.at[2])-
        Math.hypot(b.at[0]-stair.at[0],b.at[2]-stair.at[2]))[0];
      if(!door)throw new Error(`${stair.id}: protected stair has no authored door`);
      const vertical=door.side==='east'||door.side==='west';
      const inwardX=door.side==='east'?-.07:door.side==='west'?.07:0;
      const inwardZ=door.side==='north'?-.07:door.side==='south'?.07:0;
      const x=door.at[0]+inwardX,z=door.at[2]+inwardZ;
      const yaw=door.side==='north'?0:door.side==='south'?PI:door.side==='east'?-PI/2:PI/2;
      const y=f.elevation+Math.min(2.35,f.height-.45);
      if(!all().some(q=>q.prefab==='PF-EXIT-SIGN'&&distance(q,stair)<=3.0)) {
        room.contents.push(fixture(`${stair.id}/LOCAL-EXIT`,'protected-stair exit sign','PF-EXIT-SIGN',
          [x,y,z],'M-SCREEN','illuminated bilingual marking at this individual protected-stair door',
          {yaw,text:'安全出口 · EXIT',collision:'none'}));
        added++;
      }
      if(!all().some(q=>q.prefab==='PF-EMERGENCY-LIGHT'&&distance(q,stair)<=3.0)) {
        const ex=vertical?x:clamp(x+.55,room.bounds[0]+.25,room.bounds[1]-.25);
        const ez=vertical?clamp(z+.55,room.bounds[2]+.25,room.bounds[3]-.25):z;
        room.contents.push(fixture(`${stair.id}/LOCAL-EMERGENCY`,'protected-stair emergency light','PF-EMERGENCY-LIGHT',
          [ex,y+.12,ez],'M-WALL-WHITE','battery-backed light at this individual protected-stair door',
          {yaw,collision:'none'}));
        added++;
      }
    }
  }
  return added;
}

const normalizedCirculationCount=normalizeCirculationBounds();
const autoCompletedDoorCount=completeCirculationDoors();
const completedStairSafetyFixtureCount=completeStairSafety();

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
    {placeKey:'classroom',mapsTo:'B01/F2/WEST',instruction:'Keep the key and return point as the 12-seat university seminar alias; retain its measured 1.50 m row pitch, 1.80 m centre aisle, real stool SEAT_AT and dedicated teacher chair.'},
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
        const prefab=prefabById[q.prefab];
        if(!prefab) errors.push(`${q.id}: missing prefab ${q.prefab}`);
        if(!materialIds.has(q.material)) errors.push(`${q.id}: missing material ${q.material}`);
        if(!Array.isArray(q.at)||q.at.length!==3||q.at.some(v=>!Number.isFinite(v))) errors.push(`${q.id}: invalid at`);
        if(!Array.isArray(q.size)||q.size.length!==3||q.size.some(v=>!Number.isFinite(v)||v<=0)) errors.push(`${q.id}: invalid size`);
        if(!Number.isFinite(q.yaw)) errors.push(`${q.id}: invalid yaw`);
        if(!['prefab-default','none'].includes(q.collision)) errors.push(`${q.id}: invalid collision ${q.collision}`);
        if(q.at[0]<bx0-.5||q.at[0]>bx1+.5||q.at[2]<bz0-.5||q.at[2]>bz1+.5) errors.push(`${q.id}: anchor outside ${b.id} local envelope`);
        if(prefab&&Array.isArray(q.size)&&q.size.length===3) {
          const floorAnchored=prefab.anchor==='floor'||prefab.anchor==='threshold';
          const lowY=floorAnchored?q.at[1]:q.at[1]-q.size[1]/2;
          const highY=floorAnchored?q.at[1]+q.size[1]:q.at[1]+q.size[1]/2;
          if(lowY<f.elevation-.08||highY>f.elevation+f.height+.12)
            errors.push(`${q.id}: vertical envelope ${r3(lowY)}..${r3(highY)} leaves floor ${f.elevation}..${r3(f.elevation+f.height)}`);
        }
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
  completedStairSafetyFixtures:completedStairSafetyFixtureCount,
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
  const level=Number((prefix.match(/\/F(\d+)\//)||[])[1])||1,identity=dormTextile(level),
    secondary=['M-FABRIC-SAND','M-FABRIC-BLUE','M-FABRIC-RED','M-WALL-GREEN','M-BRASS','M-LAB-BLUE'][level-1],
    roomStory=['无障碍生活','安静学习','社群与音乐','阅读与植物','高年级交流','顶层学习'][level-1],
    lifeBoard=['入住支援 · 报修','安静时段 · STUDY PLAN','社群活动 · MUSIC','读书会 · PLANT CARE','实习 · GRADUATION','顶层自习 · LAUNDRY'][level-1],
    rugMaterial=['M-RUBBER','M-FABRIC-BLUE','M-FABRIC-RED','M-WALL-GREEN','M-OAK','M-LAB-BLUE'][level-1];
  // Beds run from the external wall toward the room, with a desk beyond each foot and a built-in
  // wardrobe beside the corridor wall.  This leaves a genuine 1.2 m centre entry lane instead of
  // the old mirrored furniture rows, whose beds and wardrobes intersected by almost half a metre.
  const bedX=side==='west'?x0+1.12:x1-1.12;
  const deskX=side==='west'?x0+3.10:x1-3.10;
  const wardrobeX=side==='west'?x1-.38:x0+.38;
  const innerWall=side==='west'?x1-.035:x0+.035,outerWall=side==='west'?x0+.035:x1-.035;
  const zRows=[z0+.62,z1-.62],bedYaw=side==='west'?0:PI,deskYaw=side==='west'?0:PI;
  const out=[];
  // Match the real exterior bays instead of centring a generic fake window in every room.  The
  // ground-floor west plinth is opaque, so the accessible room receives an interior identity
  // panel rather than glazing that does not exist outside.
  const facadeBays=side==='west'?[-6,-3,0,3,6]:[-6.2,-3,.2,3.4,6.6];
  const usableBays=facadeBays.filter(z=>z>=z0+.45&&z<=z1-.45);
  const windowZ=usableBays.sort((a,b)=>Math.abs(a-cz)-Math.abs(b-cz))[0];
  const hasFacadeWindow=level>1&&Number.isFinite(windowZ);
  const windowSpan=hasFacadeWindow?Math.max(.72,Math.min(1.24,2*Math.min(windowZ-z0,z1-windowZ)-.10)):0;
  const curtainOffset=windowSpan*.36,curtainSpan=Math.min(.20,windowSpan*.18),
    focalBase=hasFacadeWindow?windowZ:cz,
    focalDirection=focalBase>cz+.15?-1:focalBase<cz-.15?1:(level%2?1:-1),
    focalZ=Math.max(z0+.50,Math.min(z1-.50,focalBase+focalDirection*1.18));
  for(const [i,z] of [[1,zRows[0]],[2,zRows[1]]]) {
    out.push(
      fixture(`${prefix}/BED${i}`,'single bed','PF-BED',[bedX,e,z],i===1?identity:secondary,'student sleeping',{yaw:bedYaw,size:accessible?[2.0,.58,1.02]:undefined}),
      fixture(`${prefix}/DESK${i}`,'study desk','PF-DORM-DESK',[deskX,e,z],'M-WOOD-DESK','personal study with pull-back space',{yaw:deskYaw}),
      fixture(`${prefix}/WARD${i}`,'built-in wardrobe','PF-WARDROBE',[wardrobeX,e,z],'M-OAK-DARK','personal clothing storage',{yaw:PI/2,size:[.90,2.15,.56]}),
      fixture(`${prefix}/HEAD${i}`,'upholstered bed headboard','PF-WALL-RUN',[bedX,e+.82,i===1?z0+.035:z1-.035],
        i===1?identity:secondary,'individual acoustic headboard',{size:[2.08,1.35,.035],collision:'none'}),
      fixture(`${prefix}/PIN${i}`,'personal study pinboard','PF-WALL-RUN',[deskX,e+1.55,i===1?z0+.04:z1-.04],
        i===1?'M-OAK':dormAccent(level),'photos, timetable and floor-specific study notes',{size:[1.18,.72,.035],collision:'none'}),
      fixture(`${prefix}/PIN${i}-CARD`,'resident study card','PF-ROOM-SIGN',[deskX+(i===1?-.22:.22),e+1.55,i===1?z0+.066:z1-.066],
        'M-SCREEN','short populated study or residence note layered over the pinboard',
        {yaw:i===1?PI:0,text:i===1?'本周 · WEEK':'安静 · QUIET',size:[.52,.22,.03],collision:'none'}),
      fixture(`${prefix}/PEND${i}`,'bedside pendant','PF-PENDANT',[bedX,e+2.43,z],'M-OAK','warm individual bedside light',{temperatureK:2900,size:[.30,.22,.30]}),
    );
  }
  if(hasFacadeWindow) out.push(
    fixture(`${prefix}/WINDOW-DAYLIGHT`,'facade-aligned residence daylight panel','PF-SCREEN',
      [outerWall+(side==='west'?.004:-.004),e+1.72,windowZ],'M-SCREEN','campus daylight behind a real framed glazing layer',
      {yaw:side==='west'?-PI/2:PI/2,size:[windowSpan,1.22,.025],collision:'none'}),
    fixture(`${prefix}/WINDOW`,'facade-aligned residence window','PF-WALL-RUN',
      [outerWall+(side==='west'?.018:-.018),e+1.72,windowZ],'M-GLASS','daylight aligned to the constructed exterior bay',
      {size:[.035,1.22,windowSpan],collision:'none',facadeBayLocalZ:windowZ}),
    fixture(`${prefix}/WINDOW-SILL`,'oak window reveal and sill','PF-WALL-RUN',
      [outerWall+(side==='west'?.042:-.042),e+1.08,windowZ],'M-OAK','deep interior sill aligned to the facade glazing',
      {size:[.075,.10,windowSpan+.14],collision:'none'}),
    fixture(`${prefix}/WINDOW-HEAD`,'dark-oak residence window head','PF-WALL-RUN',
      [outerWall+(side==='west'?.044:-.044),e+2.38,windowZ],'M-OAK-DARK','deep head reveal and concealed curtain track',
      {size:[.075,.09,windowSpan+.18],collision:'none'}),
    fixture(`${prefix}/WINDOW-JAMB-A`,'residence window jamb A','PF-WALL-RUN',
      [outerWall+(side==='west'?.043:-.043),e+1.72,windowZ-windowSpan/2-.035],'M-WALL-WARM','deep plaster glazing reveal',
      {size:[.075,1.30,.07],collision:'none'}),
    fixture(`${prefix}/WINDOW-JAMB-B`,'residence window jamb B','PF-WALL-RUN',
      [outerWall+(side==='west'?.043:-.043),e+1.72,windowZ+windowSpan/2+.035],'M-WALL-WARM','deep plaster glazing reveal',
      {size:[.075,1.30,.07],collision:'none'}),
    ...[-1,1].flatMap(sideSign=>[-1,0,1].map(pleat=>fixture(
      `${prefix}/CURTAIN-${sideSign<0?'L':'R'}-${pleat<0?'A':pleat>0?'C':'B'}`,'triple-pleat woven residence curtain','PF-WALL-RUN',
      [outerWall+(side==='west'?(.060+(pleat+1)*.025):-(.060+(pleat+1)*.025)),e+1.57,
        windowZ+sideSign*curtainOffset+pleat*curtainSpan*.24],
      pleat===0?identity:'M-FABRIC-SAND','three staggered textile folds with a narrow floor-colour centre pleat and real shadow depth',
      {size:[.045,1.48,curtainSpan*.44],collision:'none'}))),
    ...[-1,1].map(sideSign=>fixture(`${prefix}/CURTAIN-${sideSign<0?'L':'R'}-TIE`,
      'brass curtain tieback','PF-WALL-RUN',[outerWall+(side==='west'?.124:-.124),e+1.52,windowZ+sideSign*curtainOffset],
      'M-BRASS','small wall-side tieback gathering the layered curtain pleats',{size:[.055,.055,curtainSpan*.72],collision:'none'})),
    fixture(`${prefix}/CURTAIN-ROD`,'slim curtain rod','PF-WALL-RUN',
      [outerWall+(side==='west'?.082:-.082),e+2.31,windowZ],'M-BRASS','continuous rod tying the four curtain pleats together',
      {size:[.05,.035,windowSpan+.26],collision:'none'}),
  );
  else out.push(fixture(`${prefix}/OPAQUE-WALL`,'ground-floor residence identity wall panel','PF-WALL-RUN',
    [outerWall+(side==='west'?.025:-.025),e+1.52,cz],identity,
    'warm internal wall datum on the intentionally opaque ground-floor masonry facade',
    {size:[.045,1.35,1.45],collision:'none'}));
  out.push(
    fixture(`${prefix}/BEDSIDE`,'shared bedside table','PF-SIDE-TABLE',[bedX,e,cz],'M-OAK','shared lamp, book and charging drawer',{size:[.52,.48,.52]}),
    fixture(`${prefix}/RUG`,'floor-specific woven room rug','PF-WALL-RUN',[(x0+x1)/2,e+.018,cz],rugMaterial,'quiet shared centre zone and distinct residential identity',{size:[1.25,.025,1.35],collision:'none'}),
    fixture(`${prefix}/LIFE-BACKDROP`,'resident life-board textile backing','PF-WALL-RUN',
      [outerWall+(side==='west'?.028:-.028),e+1.48,focalZ],rugMaterial,
      'panelized floor-specific backing beside rather than over the facade window',
      {size:[.035,1.18,.98],collision:'none'}),
    fixture(`${prefix}/LIFE-BOARD`,'populated floor-specific resident life board','PF-SCREEN',
      [outerWall+(side==='west'?.060:-.060),e+1.46,focalZ],'M-SCREEN',
      'visible study, community, reading, senior or top-floor programme from the authored room camera',
      {yaw:side==='west'?-PI/2:PI/2,text:lifeBoard,size:[.76,.48,.04],collision:'none',hudSafe:true}),
    fixture(`${prefix}/STORY`,'resident room identity plate','PF-ROOM-SIGN',
      [outerWall+(side==='west'?.062:-.062),e+2.02,focalZ],'M-SCREEN','floor identity below the persistent HUD, completing the multi-part resident life board',
      {yaw:side==='west'?-PI/2:PI/2,text:`${level}F · ${roomStory}`,size:[.72,.22,.035],collision:'none',hudSafe:true}),
    fixture(`${prefix}/LIFE-DATUM`,'resident life-board reading rail','PF-WALL-RUN',
      [outerWall+(side==='west'?.068:-.068),e+.92,focalZ],'M-BRASS','slender lower edge completing the board without a floating rectangle',
      {size:[.06,.035,.78],collision:'none'}),
    fixture(`${prefix}/AC`,'wall air conditioner','PF-AC',[innerWall,e+2.35,cz],'M-WALL-WHITE','room cooling above the entrance',{yaw:side==='west'?-PI/2:PI/2}),
    fixture(`${prefix}/BIN`,'waste bin','PF-BIN',[deskX,e,z1-.32],'M-STEEL','room waste'),
    fixture(`${prefix}/LIGHT`,'ceiling light','PF-CEILING-LIGHT',[(x0+x1)/2,e+2.68,cz],'M-WALL-WHITE','room lighting',{temperatureK:3200,lumens:1800,size:[.65,.06,.65]}),
    fixture(`${prefix}/SIGN`,'compact lintel-height room number plate','PF-ROOM-SIGN',
      [side==='west'?x1-.06:x0+.06,e+2.18,cz+.72],'M-SCREEN',
      'room identification beside the real doorway and outside the authored room camera foreground',
      {yaw:side==='west'?PI/2:-PI/2,text:prefix.split('/').pop(),size:[.58,.20,.035]}),
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
