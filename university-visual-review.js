'use strict';

// GitHub-hosted university visual review. This script is intentionally independent of the local
// dot-file harness and live-game-boot-check.js: a disposable CI Chrome enters every authored
// university floor, captures a stable frame, and writes machine-readable scene metrics.
const {spawn}=require('child_process');
const crypto=require('crypto');
const fs=require('fs'),os=require('os'),path=require('path'),zlib=require('zlib');

const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
const GAME_URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const OUTPUT_ROOT=path.resolve(process.env.UNIVERSITY_REVIEW_DIR||'test-results/university-visuals');
const REVIEW_BUILDING=(process.env.UNIVERSITY_REVIEW_BUILDING||'').trim().toUpperCase();
const MERGE_MODE=process.env.UNIVERSITY_REVIEW_MERGE==='1';
const COMPARE_MODE=process.env.UNIVERSITY_REVIEW_COMPARE==='1';
const EXPECTED_SOURCE=(process.env.GITHUB_SHA||'').trim();
const BUILDING_IDS=['B01','B02','B03','B04','B05','B06','B07','B08'];
const CURATED_PROGRAMME_BUILDINGS=new Set(BUILDING_IDS);
const BUILDING_FLOORS={B01:5,B02:4,B03:1,B04:6,B05:4,B06:4,B07:3,B08:1};
const OUTPUT_DIR=MERGE_MODE?OUTPUT_ROOT:REVIEW_BUILDING?path.join(OUTPUT_ROOT,REVIEW_BUILDING):OUTPUT_ROOT;
const VIEWPORT={width:1024,height:640,deviceScaleFactor:1,mobile:false};
const CAPTURE_ATTEMPTS=2,CAPTURE_TIMEOUT_MS=75000,CAPTURE_SETTLE_MS=220,CAPTURE_RETRY_MS=750;
const MIN_REVIEW_FRONT=1.50,MIN_REVIEW_BACK=1.70,MIN_NEAR_FIXTURE_CLEARANCE=.60;
const REVIEW_BACK_OPTIONS=[3.6,3.2,2.8,2.4,2.0,1.7];
const REPORT_SCHEMA='chinesegame.university-visual-review-report/v2',
  ROW_SCHEMA='chinesegame.university-visual-review-row/v2',
  SHARD_OUTCOME_SCHEMA='chinesegame.university-visual-review-shard/v1',
  VERIFICATION_SCHEMA='chinesegame.university-visual-review-verification/v1';
const REVIEW_FACING_VALUES=new Set(['omnidirectional','local-negative-z','local-positive-z']);
const DEBUG_PORT=14000+Math.floor(Math.random()*10000),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let profile=null;
let chrome,socket,sequence=0,activeView=null;const pending=new Map(),runtimeErrors=[];

async function waitJson(url,tries=600){
  for(let i=0;i<tries;i++){
    try{const response=await fetch(url);if(response.ok)return response.json();}catch(_){}
    await sleep(100);
  }
  throw new Error(`Chrome DevTools did not start within ${tries/10}s`);
}

function send(method,params={},timeoutMs=180000){
  return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`${method} timed out`));},timeoutMs);
    pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}

async function evaluate(expression,timeoutMs=30000){
  const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},timeoutMs);
  if(response.exceptionDetails){
    const detail=response.exceptionDetails;
    throw new Error([detail.text,detail.exception&&detail.exception.description].filter(Boolean).join(' | '));
  }
  return response.result.value;
}

const PNG_CRC_TABLE=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){
  let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function pngCrc(buffer){let crc=0xffffffff;for(const byte of buffer)crc=PNG_CRC_TABLE[(crc^byte)&255]^(crc>>>8);
  return(crc^0xffffffff)>>>0;}
function pngStats(source,label=Buffer.isBuffer(source)?'PNG buffer':String(source),includeFingerprint=false){
  const png=Buffer.isBuffer(source)?source:fs.readFileSync(source),signature='89504e470d0a1a0a';
  if(png.subarray(0,8).toString('hex')!==signature)throw new Error(`${label}: invalid PNG signature`);
  let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0,ihdrCount=0,iendCount=0;const idat=[];
  while(offset+12<=png.length){
    const length=png.readUInt32BE(offset),end=offset+12+length;
    if(end>png.length)throw new Error(`${label}: truncated PNG chunk`);
    const type=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+length),
      declaredCrc=png.readUInt32BE(offset+8+length),actualCrc=pngCrc(png.subarray(offset+4,offset+8+length));
    if(declaredCrc!==actualCrc)throw new Error(`${label}: invalid PNG ${type} CRC`);
    if(type==='IHDR'){ihdrCount++;if(offset!==8||length!==13)throw new Error(`${label}: invalid PNG IHDR`);
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
    if(type==='IDAT')idat.push(data);
    if(type==='IEND'){iendCount++;if(length!==0||end!==png.length)throw new Error(`${label}: invalid PNG IEND`);offset=end;break;}
    offset=end;
  }
  if(ihdrCount!==1||iendCount!==1||!idat.length||offset!==png.length)
    throw new Error(`${label}: incomplete PNG chunk structure`);
  const bpp=colorType===6?4:colorType===2?3:0;
  if(!width||!height||bitDepth!==8||!bpp||interlace)throw new Error(`${label}: unsupported PNG format ${width}x${height}/${bitDepth}/${colorType}/${interlace}`);
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*bpp,recon=Buffer.alloc(stride*height);let src=0;
  if(raw.length!==height*(stride+1))throw new Error(`${label}: incomplete PNG image data`);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[src++],row=y*stride,prev=row-stride;
    if(filter<0||filter>4)throw new Error(`${label}: invalid PNG filter ${filter}`);
    for(let x=0;x<stride;x++){
      const value=raw[src++],a=x>=bpp?recon[row+x-bpp]:0,b=y?recon[prev+x]:0,c=y&&x>=bpp?recon[prev+x-bpp]:0;
      recon[row+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN))&255;
    }
  }
  let n=0,sum=0,sum2=0,min=255,max=0,adjacentTotal=0,adjacentCount=0,strongEdges=0;const bins=new Set(),
    lumaAt=(x,y)=>{const i=y*stride+x*bpp;return .2126*recon[i]+.7152*recon[i+1]+.0722*recon[i+2];};
  for(let y=0;y<height;y+=8)for(let x=0;x<width;x+=8){const i=y*stride+x*bpp,l=.2126*recon[i]+.7152*recon[i+1]+.0722*recon[i+2];
    n++;sum+=l;sum2+=l*l;min=Math.min(min,l);max=Math.max(max,l);bins.add(Math.floor(l/8));}
  for(let y=1;y<height-1;y+=4)for(let x=1;x<width-1;x+=4){const l=lumaAt(x,y),dx=Math.abs(l-lumaAt(x+1,y)),
      dy=Math.abs(l-lumaAt(x,y+1));adjacentTotal+=dx+dy;adjacentCount+=2;if(dx>60)strongEdges++;if(dy>60)strongEdges++;}
  const mean=sum/n,stddev=Math.sqrt(Math.max(0,sum2/n-mean*mean)),adjacentLumaMae=adjacentTotal/adjacentCount,
    strongEdgeFraction=strongEdges/adjacentCount,compressionRatio=png.length/(width*height*bpp);
  const result={width,height,samples:n,mean:+mean.toFixed(2),stddev:+stddev.toFixed(2),range:+(max-min).toFixed(2),
    luminanceBins:bins.size,adjacentLumaMae:+adjacentLumaMae.toFixed(2),strongEdgeFraction:+strongEdgeFraction.toFixed(4),
    compressionRatio:+compressionRatio.toFixed(3),healthy:n>1000&&stddev>=12&&max-min>=36&&bins.size>=12&&
      adjacentLumaMae<=15&&strongEdgeFraction<=.05&&compressionRatio<=.70};
  if(includeFingerprint){
    // A fixed native-frame thumbnail catches semantically duplicate entry/programme cameras even
    // when PNG encoding, animation noise or a single small prop keeps their byte hashes unique.
    result.visualFingerprint=[];
    for(let gy=0;gy<20;gy++)for(let gx=0;gx<32;gx++){
      const x=Math.min(width-1,Math.floor((gx+.5)*width/32)),y=Math.min(height-1,Math.floor((gy+.5)*height/20)),
        i=y*stride+x*bpp;
      result.visualFingerprint.push(recon[i],recon[i+1],recon[i+2]);
    }
    result.structureFingerprint=[];
    for(let gy=0;gy<20;gy++)for(let gx=0;gx<31;gx++){
      const left=(gy*32+gx)*3,right=left+3,
        leftLuma=.2126*result.visualFingerprint[left]+.7152*result.visualFingerprint[left+1]+.0722*result.visualFingerprint[left+2],
        rightLuma=.2126*result.visualFingerprint[right]+.7152*result.visualFingerprint[right+1]+.0722*result.visualFingerprint[right+2];
      result.structureFingerprint.push(leftLuma<rightLuma?1:0);
    }
  }
  return result;
}

function fingerprintMae(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return Infinity;
  let total=0;for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);return total/a.length;
}
function fingerprintHamming(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return 1;
  let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;return different/a.length;
}

async function capture(file){
  // Travel already waits for camera easing and material upload. Repeated full PNG encodes made
  // the software-WebGL runner spend minutes on images we discarded and could
  // eventually stall DevTools; one final surface capture is the actual review evidence.
  const target=path.join(OUTPUT_DIR,file),failures=[];
  for(let attempt=1;attempt<=CAPTURE_ATTEMPTS;attempt++){
    await sleep(attempt===1?CAPTURE_SETTLE_MS:CAPTURE_RETRY_MS*attempt);
    try{
      const shot=await send('Page.captureScreenshot',{
        format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true,
      },CAPTURE_TIMEOUT_MS);
      if(!shot||typeof shot.data!=='string'||shot.data.length<128)throw new Error('DevTools returned no PNG data');
      const png=Buffer.from(shot.data,'base64'),stats=pngStats(png,file);
      if(!stats.healthy)throw new Error(`blank or visually degenerate frame: ${JSON.stringify(stats)}`);
      fs.writeFileSync(target,png);
      if(attempt>1)console.warn(`${file}: screenshot recovered on attempt ${attempt}/${CAPTURE_ATTEMPTS}`);
      return stats;
    }catch(error){
      failures.push((error&&error.message||String(error)).slice(0,500));
      if(attempt<CAPTURE_ATTEMPTS)console.warn(
        `${file}: screenshot attempt ${attempt}/${CAPTURE_ATTEMPTS} failed; retrying: ${failures.at(-1)}`);
    }
  }
  throw new Error(`${file}: screenshot failed after ${CAPTURE_ATTEMPTS} bounded attempts (${failures.join(' | ')})`);
}

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function reviewRowKey(row){
  return `${row.buildingId||row.building}/F${row.level}/${row.suffix||row.mode}`;
}
function hasFiniteFields(value,fields){
  return !!value&&typeof value==='object'&&!Array.isArray(value)&&fields.every(field=>Number.isFinite(value[field]));
}
function validReviewBack(value){return Number.isFinite(value)&&REVIEW_BACK_OPTIONS.some(option=>Math.abs(value-option)<=.01);}
function validReviewPrerequisites(value){
  return !!value&&value.bodyControl===true&&value.uiClean===true&&value.fontReady===true&&value.fontCheck===true&&
    Number.isInteger(value.glyphVariants)&&value.glyphVariants>=6&&
    Number.isInteger(value.glyphCount)&&value.glyphCount>=8&&
    Number.isFinite(value.minGlyphInk)&&value.minGlyphInk>=40;
}
function validFocusEvidence(value,minimum){
  if(!value||!Array.isArray(value.focusFixtureIds)||value.focusFixtureIds.length<minimum||
    new Set(value.focusFixtureIds).size!==value.focusFixtureIds.length||!Array.isArray(value.focusEvidence)||
    value.focusEvidence.length!==value.focusFixtureIds.length)return false;
  const readablePrefabs=new Set(['PF-SCREEN','PF-DIRECTORY','PF-ROOM-SIGN','PF-EXIT-SIGN','PF-CHALKBOARD','PF-WHITEBOARD']);
  return value.focusEvidence.every((e,index)=>{const readable=e&&readablePrefabs.has(e.prefab);
    return e&&e.id===value.focusFixtureIds[index]&&typeof e.prefab==='string'&&e.prefab.startsWith('PF-')&&
    REVIEW_FACING_VALUES.has(e.reviewFacing)&&
    Number.isFinite(e.forward)&&e.forward>.35&&Number.isFinite(e.lateral)&&e.lateral>=0&&
    Number.isInteger(e.samples)&&e.samples>=3&&Number.isInteger(e.visibleSamples)&&
    e.visibleSamples>=3&&e.visibleSamples*100>=e.samples*(readable?55:35)&&e.visibleSamples<=e.samples&&
    Number.isInteger(e.innerSamples)&&e.innerSamples>=3&&
    e.innerSamples*100>=e.samples*(readable?35:20)&&
    e.innerSamples<=e.visibleSamples&&
    Number.isFinite(e.projectedWidth)&&e.projectedWidth>=(readable?.10:.055)&&
    Number.isFinite(e.projectedHeight)&&e.projectedHeight>=(readable?.07:.055)&&
    Number.isFinite(e.projectedArea)&&e.projectedArea>=(readable?.015:.008)&&
    Number.isFinite(e.faceOn)&&e.faceOn>=.50;});
}

function expectedReviewViews(plan){
  const invalidPrefabs=(plan.prefabCatalog||[]).filter(prefab=>!REVIEW_FACING_VALUES.has(prefab.reviewFacing));
  if(invalidPrefabs.length)throw new Error(`canonical prefab reviewFacing is invalid: ${invalidPrefabs.map(row=>row.id).join(',')}`);
  const prefix={B01:'b01',B02:'b02',B04:'dorm',B05:'admin',B06:'science',B07:'student'},out=new Map(),
    facingByPrefab=new Map((plan.prefabCatalog||[]).map(prefab=>[prefab.id,prefab.reviewFacing])),
    placeKey=(building,level)=>building==='B03'?'campus_canteen':building==='B08'?'campus_security':
      `campus_${prefix[building]}_f${level}`,
    sameAt=(actual,expected)=>actual==null||expected==null?actual===expected:
      Number.isFinite(actual.x)&&Number.isFinite(actual.z)&&Number.isFinite(actual.yaw)&&
      Math.abs(actual.x-expected.x)<=.0051&&Math.abs(actual.z-expected.z)<=.0051&&
      Math.abs(Math.atan2(Math.sin(actual.yaw-expected.yaw),Math.cos(actual.yaw-expected.yaw)))<=1e-8;
  for(const building of plan.buildings||[])for(const floor of building.floorsPlan||[]){
    const invalidOverrides=(floor.rooms||[]).flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])
      .filter(fixture=>fixture.reviewFacing!==undefined&&!REVIEW_FACING_VALUES.has(fixture.reviewFacing));
    if(invalidOverrides.length)throw new Error(`canonical fixture reviewFacing is invalid: ${invalidOverrides.map(row=>row.id).join(',')}`);
    const fixtures=new Map((floor.rooms||[]).flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])
      .map(fixture=>[fixture.id,fixture])),place=placeKey(building.id,floor.level),programme=floor.visualReview&&floor.visualReview.programme,
      portal=floor.level===1&&(building.portals||[]).find(row=>row&&row.localSpawn),
      entry=floor.level===1?floor.visualReview&&Array.isArray(floor.visualReview.entries)&&
        floor.visualReview.entries.find(row=>row&&row.suffix==='entry'&&portal&&row.portalId===portal.id):
        floor.visualReview&&floor.visualReview.entry;
    out.set(`${building.id}/F${floor.level}/programme`,{building:building.id,level:floor.level,mode:'programme',
      suffix:'programme',place,portal:floor.level===1&&portal?portal.id:null,
      at:floor.level===1&&portal?{x:portal.localSpawn[0],z:portal.localSpawn[2],yaw:portal.localSpawn[3]}:null,
      authored:programme,fixtures,roomId:programme&&programme.roomId,pose:programme&&programme.at,
      focusFixtureIds:programme&&programme.focusFixtureIds,body:'hidden',facingByPrefab});
    out.set(`${building.id}/F${floor.level}/entry`,{building:building.id,level:floor.level,mode:'entry',suffix:'entry',place,
      portal:floor.level===1&&portal?portal.id:null,
      at:floor.level===1&&portal?{x:portal.localSpawn[0],z:portal.localSpawn[2],yaw:portal.localSpawn[3]}:null,
      authored:entry,fixtures,roomId:entry&&(entry.focusRoomId||entry.zoneId),pose:entry&&(entry.focusAt||entry.at),
      focusRoomId:entry&&entry.focusRoomId,cameraZoneId:entry&&(entry.cameraZoneId||entry.zoneId),
      focusFixtureIds:entry&&entry.focusFixtureIds,body:entry&&entry.body||'hidden',facingByPrefab});
    if(building.id==='B07'&&floor.level===1){
      const clinicPortal=(building.portals||[]).find(row=>row&&row.id==='B07/CLINIC'),
        clinic=floor.visualReview&&Array.isArray(floor.visualReview.entries)&&
          floor.visualReview.entries.find(row=>row&&row.suffix==='clinic-entry'&&row.portalId==='B07/CLINIC');
      out.set('B07/F1/clinic-entry',{building:'B07',level:1,mode:'entry',suffix:'clinic-entry',
        place:clinicPortal&&clinicPortal.placeKey,portal:clinicPortal&&clinicPortal.id,
        at:clinicPortal&&{x:clinicPortal.localSpawn[0],z:clinicPortal.localSpawn[2],yaw:clinicPortal.localSpawn[3]},
        authored:clinic,fixtures,roomId:clinic&&clinic.focusRoomId,pose:clinic&&clinic.focusAt,
        focusRoomId:clinic&&clinic.focusRoomId,cameraZoneId:clinic&&clinic.cameraZoneId,
        focusFixtureIds:clinic&&clinic.focusFixtureIds,body:clinic&&clinic.body||'hidden',facingByPrefab});
    }
  }
  return{views:out,sameAt};
}

function validateCanonicalRow(row,expected,sameAt){
  const defects=[],key=reviewRowKey(row),camera=row.mode==='programme'?row.reviewAt:row.entryReviewAt;
  if(!expected){defects.push(`${key}: no canonical authored view`);return defects;}
  if(row.schema!==ROW_SCHEMA)defects.push(`${key}: row schema ${JSON.stringify(row.schema)} is not ${ROW_SCHEMA}`);
  if(row.building!==expected.building||row.buildingId!==expected.building||row.level!==expected.level||
    row.mode!==expected.mode||row.suffix!==expected.suffix)defects.push(`${key}: row identity differs from canonical view`);
  if(row.place!==expected.place||row.portal!==expected.portal||!sameAt(row.at,expected.at))
    defects.push(`${key}: place, portal or arrival spawn differs from canonical view`);
  if(!expected.authored||!sameAt(camera,expected.pose))defects.push(`${key}: authored camera pose differs from canonical blueprint`);
  if(!camera||camera.authored!==true||!Array.isArray(camera.focusFixtureIds)||
    !Array.isArray(expected.focusFixtureIds)||camera.focusFixtureIds.length!==expected.focusFixtureIds.length||
    camera.focusFixtureIds.some((id,index)=>id!==expected.focusFixtureIds[index]))
    defects.push(`${key}: focus fixture ids differ from canonical blueprint`);
  if(row.bodyPolicy!==expected.body||row.bodyVisible!==(expected.body==='evidence'))
    defects.push(`${key}: body policy differs from canonical blueprint`);
  if(row.mode==='programme'){
    if(row.reviewRoom!==expected.roomId)defects.push(`${key}: programme room differs from canonical blueprint`);
  }else if(!camera||camera.entryZone!==expected.cameraZoneId||expected.level===1&&
    (camera.focusRoom!==expected.focusRoomId||camera.cameraZone!==expected.cameraZoneId))
    defects.push(`${key}: entry room or camera zone differs from canonical blueprint`);
  if(camera&&Array.isArray(camera.focusEvidence))for(const evidence of camera.focusEvidence){
    const fixture=expected.fixtures.get(evidence.id);
    if(!fixture||evidence.prefab!==fixture.prefab){defects.push(`${key}: focus evidence prefab is not canonical for ${evidence.id}`);continue;}
    if(Number.isFinite(evidence.projectedWidth)&&Number.isFinite(evidence.projectedHeight)&&
      Number.isFinite(evidence.projectedArea)&&Math.abs(evidence.projectedArea-evidence.projectedWidth*evidence.projectedHeight)>.004)
      defects.push(`${key}: projected focus area is internally inconsistent for ${evidence.id}`);
    if(camera&&Number.isFinite(camera.cameraBack)){
      const cameraX=camera.x-Math.sin(camera.yaw)*camera.cameraBack,
        cameraZ=camera.z-Math.cos(camera.yaw)*camera.cameraBack,dx=fixture.at[0]-cameraX,dz=fixture.at[2]-cameraZ,
        forward=dx*Math.sin(camera.yaw)+dz*Math.cos(camera.yaw),
        lateral=Math.abs(dx*Math.cos(camera.yaw)-dz*Math.sin(camera.yaw));
      if(!Number.isFinite(evidence.forward)||Math.abs(evidence.forward-forward)>.06||
        !Number.isFinite(evidence.lateral)||Math.abs(evidence.lateral-lateral)>.06)
        defects.push(`${key}: focus evidence geometry is inconsistent for ${evidence.id}`);
      const reviewFacing=fixture.reviewFacing||expected.facingByPrefab&&expected.facingByPrefab.get(fixture.prefab),
        facingSign=reviewFacing==='local-positive-z'?1:reviewFacing==='local-negative-z'?-1:0;
      if(evidence.reviewFacing!==reviewFacing)defects.push(`${key}: focus facing metadata is inconsistent for ${evidence.id}`);
      if(facingSign){const toCamera=[cameraX-fixture.at[0],cameraZ-fixture.at[2]],distance=Math.hypot(...toCamera)||1,
          faceOn=Math.max(0,(toCamera[0]*facingSign*Math.sin(fixture.yaw||0)+
            toCamera[1]*facingSign*Math.cos(fixture.yaw||0))/distance);
        if(!Number.isFinite(evidence.faceOn)||Math.abs(evidence.faceOn-faceOn)>.03)
          defects.push(`${key}: focus face angle is inconsistent for ${evidence.id}`);
      }else if(reviewFacing==='omnidirectional'&&evidence.faceOn!==1)
        defects.push(`${key}: omnidirectional focus must report neutral face angle for ${evidence.id}`);
      else if(!REVIEW_FACING_VALUES.has(reviewFacing))defects.push(`${key}: focus facing metadata is invalid for ${evidence.id}`);
    }
  }
  return defects;
}

function mergeReviewOutputs(){
  if(REVIEW_BUILDING)throw new Error('UNIVERSITY_REVIEW_MERGE cannot be combined with UNIVERSITY_REVIEW_BUILDING');
  fs.mkdirSync(OUTPUT_ROOT,{recursive:true});
  writeJson(path.join(OUTPUT_ROOT,'report.json'),{
    schema:REPORT_SCHEMA,source:'merge-pending',complete:false,views:0,report:[],errors:[],shards:[],
  });
  const defects=[],fatalErrors=[],shards=[],rows=[],captures=[],sources=new Set(),
    validatedKeys=new Set(),validatedFiles=new Set(),validatedDigests=new Map(),visualFingerprints=new Map(),
    canonicalFile=path.join(__dirname,'UNIVERSITY-INTERIORS-BLUEPRINT.json'),
    expectedRun=process.env.GITHUB_SERVER_URL&&process.env.GITHUB_REPOSITORY&&process.env.GITHUB_RUN_ID?
      `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null,
    expectedAttempt=process.env.GITHUB_RUN_ATTEMPT?Number(process.env.GITHUB_RUN_ATTEMPT):null;
  let canonicalViews=new Map(),sameCanonicalAt=()=>false;
  try{
    const canonical=readJson(canonicalFile),expected=expectedReviewViews(canonical);
    if(!canonical||!canonical.meta||canonical.meta.schema!=='chinesegame.university-interiors/v1')
      throw new Error('unexpected canonical blueprint schema');
    canonicalViews=expected.views;sameCanonicalAt=expected.sameAt;
    if(canonicalViews.size!==57)throw new Error(`canonical authored views ${canonicalViews.size}/57`);
  }catch(error){defects.push(`canonical review binding failed: ${error.message}`);}
  for(const building of BUILDING_IDS){
    const shardDir=path.join(OUTPUT_ROOT,building),fatalFile=path.join(shardDir,'fatal-error.json');
    if(fs.existsSync(fatalFile)){
      try{
        const fatal=readJson(fatalFile);
        fatalErrors.push({building,source:fatal.source||'unknown',view:fatal.view||null,
          message:fatal.message||'unknown failure',stack:fatal.stack||''});
      }catch(error){fatalErrors.push({building,source:'unknown',view:null,
        message:`unreadable fatal-error.json: ${error.message}`,stack:''});}
    }
  }
  if(fatalErrors.length)writeJson(path.join(OUTPUT_ROOT,'fatal-errors.json'),{
    complete:false,fatalErrors,
  });

  for(const building of BUILDING_IDS){
    const shardDir=path.join(OUTPUT_ROOT,building),reportFile=path.join(shardDir,'report.json'),
      outcomeFile=path.join(shardDir,'shard.json');
    let outcome=null;
    try{outcome=readJson(outcomeFile);}catch(error){defects.push(`${building}: missing or invalid shard.json: ${error.message}`);}
    if(outcome){
      if(outcome.schema!==SHARD_OUTCOME_SCHEMA||outcome.building!==building||outcome.source!==EXPECTED_SOURCE||
        outcome.captureOutcome!=='success'||!Number.isInteger(outcome.attempt)||outcome.attempt<1||
        Number.isInteger(expectedAttempt)&&outcome.attempt!==expectedAttempt||
        typeof outcome.workflowRun!=='string'||!/^https:\/\//.test(outcome.workflowRun)||
        expectedRun&&outcome.workflowRun!==expectedRun)
        defects.push(`${building}: shard outcome is not bound to the successful current workflow run`);
    }
    if(!fs.existsSync(reportFile)){defects.push(`${building}: missing report.json`);continue;}
    let shard;
    try{shard=readJson(reportFile);}catch(error){defects.push(`${building}: invalid report.json: ${error.message}`);continue;}
    const shardRows=Array.isArray(shard.report)?shard.report:[];
    if(shard.schema!==REPORT_SCHEMA)defects.push(`${building}: report schema ${JSON.stringify(shard.schema)} is not ${REPORT_SCHEMA}`);
    if(shard.complete!==true)defects.push(`${building}: shard is not complete`);
    if(shard.building!==building)defects.push(`${building}: report building is ${JSON.stringify(shard.building)}`);
    if(!Array.isArray(shard.errors))defects.push(`${building}: errors is not an array`);
    else if(shard.errors.length)defects.push(`${building}: ${shard.errors.length} runtime error(s)`);
    if(shard.views!==shardRows.length)defects.push(`${building}: views ${shard.views}/${shardRows.length}`);
    if(shard.expectedViews!==shardRows.length)defects.push(`${building}: expectedViews ${shard.expectedViews}/${shardRows.length}`);
    if(!validReviewPrerequisites(shard.reviewPrerequisites))
      defects.push(`${building}: shard capture prerequisites are not proven`);
    const requiredViews=BUILDING_FLOORS[building]*2+(building==='B07'?1:0);
    if(shardRows.length!==requiredViews)defects.push(`${building}: shard views ${shardRows.length}/${requiredViews}`);
    if(shard.source){
      sources.add(shard.source);
      if(EXPECTED_SOURCE&&shard.source!==EXPECTED_SOURCE)
        defects.push(`${building}: source SHA ${shard.source} does not match ${EXPECTED_SOURCE}`);
    }else defects.push(`${building}: missing source SHA`);
    const shardKeys=new Set();
    for(const row of shardRows){
      if(!row||typeof row!=='object'||Array.isArray(row)){
        defects.push(`${building}: shard row is not an object`);continue;
      }
      const rowBuilding=row.buildingId||row.building,rowLevel=row.level,suffix=row.suffix,key=reviewRowKey(row),
        knownBuilding=BUILDING_IDS.includes(rowBuilding),validLevel=Number.isInteger(rowLevel)&&knownBuilding&&
          rowLevel>=1&&rowLevel<=BUILDING_FLOORS[rowBuilding],
        validSuffix=suffix==='entry'||suffix==='programme'||
          suffix==='clinic-entry'&&rowBuilding==='B07'&&rowLevel===1,
        expectedMode=suffix==='programme'?'programme':validSuffix?'entry':null,
        expectedFile=`${building}-F${rowLevel}-${suffix}.png`,metricFields=['props','solids','blockers','things','lights','zones'],
        invalidMetrics=metricFields.filter(field=>!Number.isFinite(row[field])||row[field]<0);
      let valid=row.ok===true&&row.buildingId===building&&knownBuilding&&rowBuilding===building&&validLevel&&
        validSuffix&&row.mode===expectedMode&&!invalidMetrics.length;
      const canonicalDefects=validateCanonicalRow(row,canonicalViews.get(key),sameCanonicalAt);
      if(canonicalDefects.length){defects.push(...canonicalDefects.map(defect=>`${building}: ${defect}`));valid=false;}
      if(row.ok!==true)defects.push(`${building}: row ${key} is not marked ok`);
      if(row.buildingId!==building)defects.push(`${building}: buildingId ${JSON.stringify(row.buildingId)} does not match shard for ${key}`);
      if(!knownBuilding)defects.push(`${building}: unknown row building ${JSON.stringify(rowBuilding)}`);
      if(rowBuilding!==building)defects.push(`${building}: foreign row ${key}`);
      if(!validLevel)defects.push(`${building}: invalid level ${JSON.stringify(rowLevel)} for ${JSON.stringify(rowBuilding)}`);
      if(!validSuffix)defects.push(`${building}: invalid suffix ${JSON.stringify(suffix)} for ${key}`);
      if(row.mode!==expectedMode)defects.push(`${building}: mode ${JSON.stringify(row.mode)} does not match suffix ${JSON.stringify(suffix)} for ${key}`);
      if(invalidMetrics.length)defects.push(`${building}: row ${key} has invalid ${invalidMetrics.join(', ')} count(s)`);
      const prerequisites=row.reviewPrerequisites,prerequisiteFields=[
        'bodyControl','uiClean','fontReady','fontCheck','glyphVariants','glyphCount','minGlyphInk'];
      if(!validReviewPrerequisites(prerequisites)){
        defects.push(`${building}: capture prerequisites are not proven for ${key}`);valid=false;
      }
      if(validReviewPrerequisites(shard.reviewPrerequisites)&&prerequisiteFields.some(field=>
        prerequisites[field]!==shard.reviewPrerequisites[field])){
        defects.push(`${building}: row and shard capture prerequisites differ for ${key}`);valid=false;
      }
      const expectedBodyVisible=key==='B07/F2/entry';
      if(row.bodyVisible!==expectedBodyVisible){
        defects.push(`${building}: player-body evidence mode is wrong for ${key}`);valid=false;
      }
      if(row.bodyPolicy!==(expectedBodyVisible?'evidence':'hidden')){
        defects.push(`${building}: player-body policy is wrong for ${key}`);valid=false;
      }
      if(shardKeys.has(key)){defects.push(`${building}: duplicate row ${key}`);valid=false;}else shardKeys.add(key);
      if(typeof row.file!=='string'||path.basename(row.file)!==row.file||row.file!==expectedFile){
        defects.push(`${building}: capture filename ${JSON.stringify(row.file)} does not match ${expectedFile}`);continue;
      }
      if(suffix==='programme'&&(
        typeof row.reviewRoom!=='string'||!row.reviewRoom.trim()||
        !hasFiniteFields(row.reviewAt,['x','z','yaw','cameraBack','frontDepth'])||
        !validReviewBack(row.reviewAt.cameraBack)||row.reviewAt.cameraBack<MIN_REVIEW_BACK||
        row.reviewAt.frontDepth<MIN_REVIEW_FRONT||typeof row.reviewAt.authored!=='boolean'||
        CURATED_PROGRAMME_BUILDINGS.has(building)&&row.reviewAt.authored!==true||!validFocusEvidence(row.reviewAt,2))){
        defects.push(`${building}: programme camera evidence is incomplete for ${key}`);valid=false;
      }
      const requiresAuthoredGround=rowLevel===1;
      if((suffix==='clinic-entry'||suffix==='entry')&&
        (!hasFiniteFields(row.entryReviewAt,['x','z','yaw','inward','lateral','cameraBack'])||
          row.entryReviewAt.inward<0||!validReviewBack(row.entryReviewAt.cameraBack)||
          row.entryReviewAt.cameraBack<MIN_REVIEW_BACK||
          !Number.isFinite(row.entryReviewAt.frontDepth)||row.entryReviewAt.frontDepth<MIN_REVIEW_FRONT||
          typeof row.entryReviewAt.authored!=='boolean'||
          (rowLevel>1||requiresAuthoredGround)&&row.entryReviewAt.authored!==true||
          !validFocusEvidence(row.entryReviewAt,1)||
          requiresAuthoredGround&&(
            typeof row.entryReviewAt.focusRoom!=='string'||!row.entryReviewAt.focusRoom.trim()||
            typeof row.entryReviewAt.cameraZone!=='string'||!row.entryReviewAt.cameraZone.trim()))){
        defects.push(`${building}: arrival evidence missing entryReviewAt for ${key}`);valid=false;
      }
      if(key==='B06/F1/entry'){
        const proof=row.movementProof;
        if(!proof||proof.radius!==.30||proof.step!==.01||proof.accepted!==815||proof.expected!==815||
          proof.maxError!==0||!Array.isArray(proof.start)||proof.start.length!==2||
          Math.hypot(proof.start[0]-2.4,proof.start[1]+1)>1e-8||
          !hasFiniteFields(row.spawn,['x','z'])||
          Math.hypot(row.spawn.x-proof.start[0],row.spawn.z-proof.start[1])>1e-8||
          !Array.isArray(proof.final)||proof.final.length!==2||
          Math.hypot(proof.final[0]-2.4,proof.final[1]-2.35)>1e-8){
          defects.push(`${building}: science-lab threshold traversal proof is incomplete for ${key}`);valid=false;
        }
      }
      const captureFile=path.join(shardDir,row.file);
      if(!fs.existsSync(captureFile)){defects.push(`${building}: missing ${row.file}`);continue;}
      try{
        const png=fs.readFileSync(captureFile),stats=pngStats(png,captureFile,true),
          fingerprint={visual:stats.visualFingerprint,structure:stats.structureFingerprint},
          digest=crypto.createHash('sha256').update(png).digest('hex'),duplicate=validatedDigests.get(digest);
        delete stats.visualFingerprint;delete stats.structureFingerprint;
        if(!stats.healthy){defects.push(`${building}: unhealthy ${row.file}`);valid=false;}
        const declared=row.image,imageFields=['width','height','samples','mean','stddev','range','luminanceBins',
          'adjacentLumaMae','strongEdgeFraction','compressionRatio','healthy'];
        if(!declared||imageFields.some(field=>declared[field]!==stats[field])){
          defects.push(`${building}: declared image metrics differ from ${row.file}`);valid=false;
        }
        if(stats.width!==VIEWPORT.width||stats.height!==VIEWPORT.height){
          defects.push(`${building}: ${row.file} is ${stats.width}x${stats.height}, expected ${VIEWPORT.width}x${VIEWPORT.height}`);
          valid=false;
        }
        if(duplicate){defects.push(`${building}: ${row.file} duplicates PNG bytes from ${duplicate}`);valid=false;}
        else if(valid){row.captureSha256=digest;validatedDigests.set(digest,row.file);visualFingerprints.set(key,fingerprint);}
      }catch(error){defects.push(`${building}: invalid ${row.file}: ${error.message}`);valid=false;}
      if(validatedKeys.has(key)){defects.push(`${building}: duplicate merged row ${key}`);valid=false;}
      if(validatedFiles.has(row.file)){defects.push(`${building}: duplicate capture filename ${row.file}`);valid=false;}
      if(valid){
        validatedKeys.add(key);validatedFiles.add(row.file);
        rows.push(row);captures.push({source:captureFile,file:row.file});
      }
    }
    shards.push({building,complete:shard.complete===true,views:shardRows.length,errors:Array.isArray(shard.errors)?shard.errors.length:null});
  }

  const keys=rows.map(reviewRowKey),uniqueKeys=new Set(keys),buildings=new Set(rows.map(r=>r.buildingId||r.building)),
    floors=new Set(rows.map(r=>`${r.buildingId||r.building}/F${r.level}`)),files=new Set(captures.map(c=>c.file));
  if(rows.length!==57||uniqueKeys.size!==57)defects.push(`merged views ${rows.length}/57, unique ${uniqueKeys.size}/57`);
  if(buildings.size!==8||BUILDING_IDS.some(id=>!buildings.has(id)))defects.push(`merged buildings ${[...buildings].sort().join(',')||'none'}`);
  if(floors.size!==28)defects.push(`merged floors ${floors.size}/28`);
  if(files.size!==57)defects.push(`capture filenames ${files.size}/57 unique`);
  if(validatedDigests.size!==57)defects.push(`capture PNG digests ${validatedDigests.size}/57 unique`);
  if(sources.size!==1)defects.push(`source SHAs ${[...sources].join(',')||'none'}`);
  if(EXPECTED_SOURCE&&(sources.size!==1||[...sources][0]!==EXPECTED_SOURCE))
    defects.push(`merged source SHA ${sources.size===1?[...sources][0]:'not unique'} does not match ${EXPECTED_SOURCE}`);
  for(const floor of floors){
    const floorRows=rows.filter(r=>`${r.buildingId||r.building}/F${r.level}`===floor),
      suffixes=new Set(floorRows.map(r=>r.suffix));
    if(!suffixes.has('entry')||!suffixes.has('programme'))defects.push(`${floor}: missing entry or programme view`);
    for(let i=0;i<floorRows.length;i++)for(let j=i+1;j<floorRows.length;j++){
      const a=floorRows[i],b=floorRows[j],pa=a.mode==='programme'?a.reviewAt:a.entryReviewAt,
        pb=b.mode==='programme'?b.reviewAt:b.entryReviewAt,
        poseDelta=pa&&pb?Math.hypot(pa.x-pb.x,pa.z-pb.z):Infinity,
        yawDelta=pa&&pb?Math.abs(Math.atan2(Math.sin(pa.yaw-pb.yaw),Math.cos(pa.yaw-pb.yaw))):Infinity,
        mae=fingerprintMae(visualFingerprints.get(reviewRowKey(a))?.visual,visualFingerprints.get(reviewRowKey(b))?.visual);
      if(poseDelta<.75&&yawDelta<.20)
        defects.push(`${floor}: ${a.suffix} and ${b.suffix} reuse a materially equivalent authored composition`);
      if(mae<3)
        defects.push(`${floor}: ${a.suffix} and ${b.suffix} are perceptually duplicate captures (MAE ${mae.toFixed(2)}/255)`);
    }
  }
  // Floor identity must survive color and copy changes. A grayscale horizontal-gradient hash
  // rejects the old pattern of reusing one dead-end corridor or resident-room silhouette on every
  // storey while still allowing a cohesive material palette across the building.
  for(const building of BUILDING_IDS){
    for(const [mode,minimum,label] of [['entry',.08,'arrival'],['programme',.14,'programme']]){
      const comparable=rows.filter(row=>(row.buildingId||row.building)===building&&row.mode===mode);
      for(let i=0;i<comparable.length;i++)for(let j=i+1;j<comparable.length;j++){
        const a=comparable[i],b=comparable[j];if(a.level===b.level)continue;
        const distance=fingerprintHamming(visualFingerprints.get(reviewRowKey(a))?.structure,
          visualFingerprints.get(reviewRowKey(b))?.structure);
        if(distance<minimum)defects.push(`${building}: ${a.suffix}/F${a.level} and ${b.suffix}/F${b.level} reuse the same ${label} structure (dHash ${(distance*100).toFixed(1)}%)`);
      }
    }
  }
  const clinicRows=rows.filter(r=>(r.buildingId||r.building)==='B07'&&r.level===1&&r.suffix==='clinic-entry');
  if(clinicRows.length!==1)defects.push(`B07 clinic-entry views ${clinicRows.length}/1`);
  if(fatalErrors.length)defects.push(`${fatalErrors.length} shard fatal-error file(s)`);
  const order=new Map(BUILDING_IDS.map((id,index)=>[id,index])),suffixOrder={entry:0,programme:1,'clinic-entry':2};
  rows.sort((a,b)=>order.get(a.buildingId||a.building)-order.get(b.buildingId||b.building)||
    a.level-b.level||(suffixOrder[a.suffix]??9)-(suffixOrder[b.suffix]??9));
  for(const capture of captures){
    try{fs.copyFileSync(capture.source,path.join(OUTPUT_ROOT,capture.file));}
    catch(error){defects.push(`could not aggregate ${capture.file}: ${error.message}`);}
  }
  if(defects.length){
    writeJson(path.join(OUTPUT_ROOT,'report.json'),{
      schema:REPORT_SCHEMA,source:sources.size===1?[...sources][0]:'merge-partial',complete:false,views:rows.length,
      report:rows,errors:defects,shards,
    });
    throw new Error(`university review merge validation failed: ${defects.slice(0,30).join(' | ')}`);
  }

  const output={schema:REPORT_SCHEMA,source:[...sources][0],complete:true,views:rows.length,report:rows,errors:[],shards};
  writeJson(path.join(OUTPUT_ROOT,'report.json'),output);
  for(const name of ['fatal-error.json','fatal-errors.json']){
    const file=path.join(OUTPUT_ROOT,name);if(fs.existsSync(file))fs.rmSync(file,{force:true});
  }
  console.log(JSON.stringify({merge:true,complete:true,views:rows.length,buildings:buildings.size,floors:floors.size,errors:0},null,2));
}

function compareIndependentReviewOutputs(){
  const primaryRoot=path.resolve(process.env.UNIVERSITY_REVIEW_PRIMARY_DIR||OUTPUT_ROOT),
    verificationRoot=path.resolve(process.env.UNIVERSITY_REVIEW_VERIFICATION_DIR||'test-results/university-verification'),
    primary=readJson(path.join(primaryRoot,'report.json')),
    verification=readJson(path.join(verificationRoot,'report.json')),defects=[],rows=[];
  if(primary.schema!==REPORT_SCHEMA||verification.schema!==REPORT_SCHEMA||primary.complete!==true||verification.complete!==true)
    defects.push('primary and independent verification reports must both be complete v2 reports');
  if(primary.source!==verification.source||EXPECTED_SOURCE&&primary.source!==EXPECTED_SOURCE)
    defects.push(`independent verification source mismatch ${primary.source}/${verification.source}/${EXPECTED_SOURCE||'unset'}`);
  const primaryRows=new Map((primary.report||[]).map(row=>[reviewRowKey(row),row])),
    verificationRows=new Map((verification.report||[]).map(row=>[reviewRowKey(row),row]));
  if(primaryRows.size!==57||verificationRows.size!==57)defects.push(`independent review rows ${primaryRows.size}/57 and ${verificationRows.size}/57`);
  const stripCapture=row=>{const copy=JSON.parse(JSON.stringify(row));delete copy.image;delete copy.captureSha256;return copy;};
  for(const [key,row] of primaryRows){const other=verificationRows.get(key);
    if(!other){defects.push(`${key}: missing independent recapture`);continue;}
    if(JSON.stringify(stripCapture(row))!==JSON.stringify(stripCapture(other)))
      defects.push(`${key}: independent live scene/camera evidence differs`);
    const primaryFile=path.join(primaryRoot,row.file),verificationFile=path.join(verificationRoot,other.file);
    try{
      const a=pngStats(primaryFile,primaryFile,true),b=pngStats(verificationFile,verificationFile,true),
        mae=fingerprintMae(a.visualFingerprint,b.visualFingerprint),
        structureDistance=fingerprintHamming(a.structureFingerprint,b.structureFingerprint),
        primarySha256=crypto.createHash('sha256').update(fs.readFileSync(primaryFile)).digest('hex'),
        verificationSha256=crypto.createHash('sha256').update(fs.readFileSync(verificationFile)).digest('hex');
      if(!a.healthy||!b.healthy||a.width!==VIEWPORT.width||b.width!==VIEWPORT.width||
        a.height!==VIEWPORT.height||b.height!==VIEWPORT.height)
        defects.push(`${key}: independent recapture is unhealthy or not native size`);
      if(mae>8||structureDistance>.20)
        defects.push(`${key}: primary pixels disagree with independent Chrome recapture (MAE ${mae.toFixed(2)}, dHash ${(structureDistance*100).toFixed(1)}%)`);
      rows.push({key,file:row.file,mae:+mae.toFixed(3),structureDistance:+structureDistance.toFixed(4),
        primarySha256,verificationSha256});
    }catch(error){defects.push(`${key}: independent pixel comparison failed: ${error.message}`);}
  }
  for(const key of verificationRows.keys())if(!primaryRows.has(key))defects.push(`${key}: unexpected independent recapture`);
  const output={schema:VERIFICATION_SCHEMA,source:primary.source,complete:defects.length===0,views:rows.length,
    thresholds:{visualMaeMaximum:8,structureDistanceMaximum:.20},rows,errors:defects};
  writeJson(path.join(primaryRoot,'verification.json'),output);
  if(defects.length)throw new Error(`independent university recapture failed: ${defects.slice(0,20).join(' | ')}`);
  console.log(JSON.stringify({compare:true,complete:true,views:rows.length,maxMae:Math.max(...rows.map(row=>row.mae)),
    maxStructureDistance:Math.max(...rows.map(row=>row.structureDistance))},null,2));
}

async function main(){
  if(COMPARE_MODE)return compareIndependentReviewOutputs();
  if(MERGE_MODE)return mergeReviewOutputs();
  if(REVIEW_BUILDING&&!BUILDING_IDS.includes(REVIEW_BUILDING))
    throw new Error(`UNIVERSITY_REVIEW_BUILDING must be one of ${BUILDING_IDS.join(', ')}`);
  fs.mkdirSync(OUTPUT_DIR,{recursive:true});
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'beijing-life-university-review-'));
  chrome=spawn(CHROME,['--headless=new','--no-first-run','--disable-default-apps','--mute-audio',
    '--autoplay-policy=no-user-gesture-required','--enable-webgl','--ignore-gpu-blocklist',
    '--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader',`--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,`--window-size=${VIEWPORT.width},${VIEWPORT.height}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let chromeError='';chrome.stderr.on('data',chunk=>{chromeError+=chunk;});
  const tabs=await waitJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`),tab=tabs.find(q=>q.type==='page');
  if(!tab)throw new Error('Chrome opened no page target');
  socket=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);
      message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);return;}
    if(message.method==='Runtime.exceptionThrown'){
      const d=message.params.exceptionDetails;runtimeErrors.push([d.text,d.exception&&(d.exception.description||d.exception.value)].filter(Boolean).join(' | '));
    }
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error'){
      const text=(message.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ');
      if(text)runtimeErrors.push(`console.error: ${text}`);
    }
    if(message.method==='Log.entryAdded'&&/error/i.test(message.params.entry.level||'')){
      const entry=message.params.entry;if(!/favicon/i.test(`${entry.url||''}${entry.text||''}`))runtimeErrors.push(entry.text);
    }
  });

  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride',VIEWPORT);
  await send('Page.navigate',{url:GAME_URL});
  let ready=null;
  for(let i=0;i<900;i++){
    ready=await evaluate(`(()=>{const boot=document.getElementById('boot'),start=document.getElementById('start');return{
      game:!!window.__game,bootOn:!!(boot&&boot.classList.contains('on')),startDisabled:!!(start&&start.disabled),
      bootWhat:(document.getElementById('bootWhat')||{}).textContent||''};})()`).catch(error=>({error:error.message}));
    if(ready.game&&!ready.bootOn&&!ready.startDisabled)break;await sleep(100);
  }
  if(!ready||!ready.game||ready.bootOn||ready.startDisabled)
    throw new Error(`game did not become playable: ${JSON.stringify(ready)}\n${chromeError.slice(-1600)}`);
  await evaluate(`(()=>{document.getElementById('start').click();return true;})()`);await sleep(1600);
  const reviewPrerequisites=await evaluate(`(async()=>{
    if(!window.__game||typeof window.__game.showBody!=='function')
      throw new Error('screenshot harness cannot hide the player body');
    window.__game.showBody(false);
    let reviewStyle=document.getElementById('university-review-clean-ui');
    const reviewUi=['hud','flightStatus','needs','goals','map','keys','touchControls','labels','prompt','doing','toast'];
    if(!reviewStyle){reviewStyle=document.createElement('style');reviewStyle.id='university-review-clean-ui';
      reviewStyle.textContent=reviewUi.map(id=>'#'+id).join(',')+'{display:none!important}';document.head.appendChild(reviewStyle);}
    const uiClean=reviewUi.every(id=>{
      const el=document.getElementById(id);return !!el&&getComputedStyle(el).display==='none';});
    if(!document.fonts)throw new Error('FontFaceSet API is unavailable');
    const probe='大学食堂医院图书馆校';
    await document.fonts.load('36px "Noto Sans CJK SC"',probe);
    await document.fonts.ready;
    const fontCheck=document.fonts.check('36px "Noto Sans CJK SC"',probe),canvas=document.createElement('canvas');
    canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true}),signatures=[],inks=[];
    ctx.font='36px "Noto Sans CJK SC"';ctx.textBaseline='top';ctx.fillStyle='#000';
    for(const glyph of probe){
      ctx.clearRect(0,0,64,64);ctx.fillText(glyph,8,6);const data=ctx.getImageData(0,0,64,64).data;
      let hash=2166136261,ink=0;
      for(let i=3;i<data.length;i+=4)if(data[i]){ink++;hash=Math.imul(hash^data[i],16777619);}
      signatures.push((hash>>>0).toString(16));inks.push(ink);
    }
    return{bodyControl:true,uiClean,fontReady:document.fonts.status==='loaded',fontCheck,
      glyphCount:probe.length,glyphVariants:new Set(signatures).size,minGlyphInk:Math.min(...inks)};
  })()`);
  if(!reviewPrerequisites.bodyControl||!reviewPrerequisites.uiClean||!reviewPrerequisites.fontReady||!reviewPrerequisites.fontCheck||
    reviewPrerequisites.glyphCount<8||reviewPrerequisites.glyphVariants<6||reviewPrerequisites.minGlyphInk<40)
    throw new Error(`university capture prerequisites failed: ${JSON.stringify(reviewPrerequisites)}`);

  const views=await evaluate(`(()=>{
    const out=[],selected=${JSON.stringify(REVIEW_BUILDING||null)};
    for(const b of CampusInteriors.plan.buildings)for(const f of b.floorsPlan){
      if(selected&&b.id!==selected)continue;
      const portal=f.level===1?b.portals.find(p=>p.localSpawn&&CampusInteriors.places[p.placeKey]):null;
      const base={building:b.id,level:f.level,place:CampusInteriors.placeKey(b.id,f.level),portal:portal&&portal.id,
        at:portal?{x:portal.localSpawn[0],z:portal.localSpawn[2],yaw:portal.localSpawn[3]}:null};
      out.push({...base,mode:'entry',suffix:'entry'});
      out.push({...base,mode:'programme',suffix:'programme'});
    }
    if(!selected||selected==='B07'){
      const clinic=CampusInteriors.plan.buildings.find(b=>b.id==='B07').portals.find(p=>p.id==='B07/CLINIC');
      out.push({building:'B07',level:1,place:'campus_clinic_f1',portal:clinic.id,
        at:{x:clinic.localSpawn[0],z:clinic.localSpawn[2],yaw:clinic.localSpawn[3]},mode:'entry',suffix:'clinic-entry'});
    }
    return out;
  })()`);
  const expectedViews=REVIEW_BUILDING?BUILDING_FLOORS[REVIEW_BUILDING]*2+(REVIEW_BUILDING==='B07'?1:0):57;
  if(views.length!==expectedViews||REVIEW_BUILDING&&views.some(view=>view.building!==REVIEW_BUILDING))
    throw new Error(`invalid university review shard ${REVIEW_BUILDING||'ALL'}: ${views.length} view(s)`);

  const report=[];
  for(const view of views){
    activeView=view;
    console.log(`[${report.length+1}/${views.length}] ${view.building}/F${view.level}/${view.suffix}`);
    const result=await evaluate(`(async()=>{try{
      const at=${JSON.stringify(view.at)},mode=${JSON.stringify(view.mode)},suffix=${JSON.stringify(view.suffix)},
        portalId=${JSON.stringify(view.portal)};let bodyVisible=false,bodyPolicy='hidden';
      window.__game.showBody(false);
      window.__game.setPlace(${JSON.stringify(view.place)},at||undefined);
      await new Promise(resolve=>setTimeout(resolve,900));const scene=window.__game.scene(),state=window.__game.state(),
        floor=scene.blueprintFloor,building=CampusInteriors.plan.buildings.find(b=>b.id===scene.buildingId),
        bounds=building.localBounds,radius=.32,backOptions=[3.6,3.2,2.8,2.4,2.0,1.7,1.4],
        reviewFov=.90,reviewAspect=1.6,reviewPitch=.28,reviewTanY=Math.tan(reviewFov/2),
        reviewTanX=reviewTanY*reviewAspect,reviewCosPitch=Math.cos(reviewPitch),reviewSinPitch=Math.sin(reviewPitch);
      const inside=(b,x,z,pad=0)=>x>=b[0]+pad&&x<=b[1]-pad&&z>=b[2]+pad&&z<=b[3]-pad,
        free=(x,z,pad=radius)=>inside(bounds,x,z,pad)&&
          !scene.solids.some(s=>!s.open&&x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad),
        fixtures=new Map((floor.rooms||[]).flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])
          .map(fixture=>[fixture.id,fixture])),
        ownerCache=new Map(),fixtureOwnerId=tag=>{if(typeof tag!=='string')return null;
          if(ownerCache.has(tag))return ownerCache.get(tag);if(fixtures.has(tag)){ownerCache.set(tag,tag);return tag;}let owner=null;
          for(const id of fixtures.keys())if(tag.startsWith(id+'/')&&(!owner||id.length>owner.length))owner=id;
          ownerCache.set(tag,owner);return owner;},
        propBelongs=(tag,fixtureId)=>fixtureOwnerId(tag)===fixtureId,
        prefabs=new Map(CampusInteriors.plan.prefabCatalog.map(spec=>[spec.id,spec])),
        transformReview=(m,x,y,z)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],
          m[2]*x+m[6]*y+m[10]*z+m[14]],
        reviewCamera=(x,z,yaw,back)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw);return{
          eye:[x-fx*back,1.15+Math.tan(reviewPitch)*back,z-fz*back],
          forward:[fx*reviewCosPitch,-reviewSinPitch,fz*reviewCosPitch],
          right:[-Math.cos(yaw),0,Math.sin(yaw)],up:[reviewSinPitch*fx,reviewCosPitch,reviewSinPitch*fz]};},
        cameraBlockLimitReview=(origin,dir,maxDistance)=>{let limit=maxDistance;
          for(const blocker of scene.blockers||[]){let t0=0,t1=maxDistance,hit=true,
              pad=blocker.pad===undefined?.4:blocker.pad;
            for(const [axis,lo,hi] of [[0,blocker.x0-pad,blocker.x1+pad],[2,blocker.z0-pad,blocker.z1+pad]]){
              if(Math.abs(dir[axis])<1e-5){if(origin[axis]<lo||origin[axis]>hi){hit=false;break;}continue;}
              let a=(lo-origin[axis])/dir[axis],b=(hi-origin[axis])/dir[axis];if(a>b)[a,b]=[b,a];
              t0=Math.max(t0,a);t1=Math.min(t1,b);if(t1<t0){hit=false;break;}}
            const eyeY=origin[1]+dir[1]*t0;
            if(hit&&t0>.2&&eyeY<blocker.top&&(blocker.bot===undefined||eyeY>=blocker.bot))
              limit=Math.min(limit,t0-.05);}return limit;},
        cameraStable=(x,z,yaw,back)=>{const requested=back/reviewCosPitch,target=[x,1.15,z],
            dir=[-Math.sin(yaw)*reviewCosPitch,reviewSinPitch,-Math.cos(yaw)*reviewCosPitch],
            cameraRoom=scene.roomAt&&scene.roomAt(x,z,null,true);
          if(!cameraRoom)return false;const endpoint=[target[0]+dir[0]*requested,target[2]+dir[2]*requested];
          if(endpoint[0]<cameraRoom.x0+.02||endpoint[0]>cameraRoom.x1-.02||
            endpoint[1]<cameraRoom.z0+.02||endpoint[1]>cameraRoom.z1-.02)return false;
          let distance=Math.min(requested,cameraRoom.near||12);
          if(cameraRoom.id==='lift')distance=Math.min(distance,2.30);
          else if((cameraRoom.near||12)>=3){for(const [axis,lo,hi] of
            [[0,cameraRoom.x0,cameraRoom.x1],[2,cameraRoom.z0,cameraRoom.z1]]){
              if(Math.abs(dir[axis])<1e-4)continue;const sign=dir[axis]>0?1:-1,wall=sign>0?hi:lo,
                inner=(wall-sign*.52-target[axis])/dir[axis],outer=(wall+sign*.18-target[axis])/dir[axis];
              if(inner>0&&distance>inner&&distance<outer)distance=inner;}}
          if(cameraRoom.ceil!==undefined&&dir[1]>1e-4)
            distance=Math.min(distance,Math.max((cameraRoom.ceil-target[1])/dir[1],.85));
          return Math.abs(distance-requested)<=1e-6&&
            cameraBlockLimitReview(target,dir,requested)>=requested-.005;},
        resolvedReviewCamera=()=>{const eye=Array.from(window.__game.eye),cam=window.__game.CAM,
            canvas=document.querySelector('canvas'),rect=canvas&&canvas.getBoundingClientRect?canvas.getBoundingClientRect():null,
            // R.resize builds the projection from the canvas CSS content extent. The backing
            // buffer is independently render-scaled and integer-rounded (for example 921x576 at
            // 0.90 quality), so its ratio is not the lens ratio and must not certify the camera.
            aspect=rect&&rect.height?rect.width/rect.height:canvas&&canvas.clientHeight?
              canvas.clientWidth/canvas.clientHeight:window.innerWidth/window.innerHeight,
            target=[cam.fx,cam.lookY,cam.fz],delta=[target[0]-eye[0],target[1]-eye[1],target[2]-eye[2]],
            length=Math.hypot(...delta)||1,forward=delta.map(v=>v/length),horizontal=Math.hypot(forward[0],forward[2])||1,
            right=[-forward[2]/horizontal,0,forward[0]/horizontal],
            up=[right[1]*forward[2]-right[2]*forward[1],right[2]*forward[0]-right[0]*forward[2],
              right[0]*forward[1]-right[1]*forward[0]];
          return{eye,forward,right,up,yaw:Math.atan2(forward[0],forward[2]),
            horizontalBack:Math.hypot(target[0]-eye[0],target[2]-eye[2]),fov:cam.fov,aspect};},
        requireResolvedCamera=(x,z,yaw,back)=>{const expected=reviewCamera(x,z,yaw,back),actual=resolvedReviewCamera(),
            eyeDelta=Math.hypot(actual.eye[0]-expected.eye[0],actual.eye[1]-expected.eye[1],actual.eye[2]-expected.eye[2]),
            directionDot=actual.forward[0]*expected.forward[0]+actual.forward[1]*expected.forward[1]+actual.forward[2]*expected.forward[2];
          if(eyeDelta>.025||directionDot<.9999||Math.abs(actual.fov-reviewFov)>.001||
            Math.abs(actual.aspect-reviewAspect)>.001)
            throw new Error('resolved review camera differs from authored orbit/lens: eye '+eyeDelta.toFixed(3)+
              'm dot '+directionDot.toFixed(5)+' fov '+actual.fov.toFixed(4)+' aspect '+actual.aspect.toFixed(4));
          return actual;},
        reviewProject=(camera,point)=>{const delta=[point[0]-camera.eye[0],point[1]-camera.eye[1],point[2]-camera.eye[2]],
            dot=axis=>delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2],forward=dot(camera.forward);
          if(forward<=.05)return{inside:false,forward};const horizontal=dot(camera.right),vertical=dot(camera.up);
          const nx=horizontal/(forward*reviewTanX),ny=vertical/(forward*reviewTanY);
          return{inside:Math.abs(nx)<=1&&Math.abs(ny)<=1,forward,horizontal,vertical,nx,ny};},
        cubeVertices=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],
          [-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
        boxTriangles=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],
          [3,2,6],[3,6,7],[0,3,7],[0,7,4],[1,5,6],[1,6,2]],
        propVertices=prop=>cubeVertices.map(vertex=>transformReview(prop.m,...vertex)),
        pointInProp=(prop,point)=>{const m=prop.m,delta=[point[0]-m[12],point[1]-m[13],point[2]-m[14]];
          for(const offset of [0,4,8]){const axis=[m[offset],m[offset+1],m[offset+2]],
              length2=axis[0]*axis[0]+axis[1]*axis[1]+axis[2]*axis[2];
            if(length2<1e-12||Math.abs((delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2])/length2)>.500001)
              return false;}return true;},
        rayProp=(origin,target,prop)=>{const local=point=>{const delta=[point[0]-prop.m[12],point[1]-prop.m[13],point[2]-prop.m[14]],out=[];
            for(const offset of [0,4,8]){const axis=[prop.m[offset],prop.m[offset+1],prop.m[offset+2]],
                length2=axis[0]*axis[0]+axis[1]*axis[1]+axis[2]*axis[2];
              if(length2<1e-12)return null;out.push((delta[0]*axis[0]+delta[1]*axis[1]+delta[2]*axis[2])/length2);}
            return out;},a=local(origin),b=local(target);if(!a||!b)return false;let lo=0,hi=1;
          for(let axis=0;axis<3;axis++){const delta=b[axis]-a[axis];
            if(Math.abs(delta)<1e-10){if(a[axis]<=-.5||a[axis]>=.5)return false;continue;}
            let near=(-.5-a[axis])/delta,far=(.5-a[axis])/delta;if(near>far)[near,far]=[far,near];
            lo=Math.max(lo,near);hi=Math.min(hi,far);if(lo>=hi)return false;}
          return Math.max(lo,.002)<Math.min(hi,.985);},
        clipTriangle=(camera,triangle)=>{const dot=(point,axis)=>(point[0]-camera.eye[0])*axis[0]+
              (point[1]-camera.eye[1])*axis[1]+(point[2]-camera.eye[2])*axis[2],
            planes=[point=>dot(point,camera.forward)-.05,
              point=>dot(point,camera.forward)*reviewTanX-dot(point,camera.right),
              point=>dot(point,camera.forward)*reviewTanX+dot(point,camera.right),
              point=>dot(point,camera.forward)*reviewTanY-dot(point,camera.up),
              point=>dot(point,camera.forward)*reviewTanY+dot(point,camera.up)];
          let polygon=triangle;for(const plane of planes){if(!polygon.length)break;const clipped=[];
            let previous=polygon[polygon.length-1],dp=plane(previous);for(const current of polygon){const dc=plane(current),
                previousInside=dp>=-1e-9,currentInside=dc>=-1e-9;
              if(previousInside!==currentInside){const t=dp/(dp-dc);clipped.push([
                previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t,
                previous[2]+(current[2]-previous[2])*t]);}
              if(currentInside)clipped.push(current);previous=current;dp=dc;}polygon=clipped;}return polygon;},
        clipPolygonPlane=(polygon,plane)=>{if(!polygon.length)return polygon;const clipped=[];
          let previous=polygon[polygon.length-1],dp=plane(previous);for(const current of polygon){const dc=plane(current),
              previousInside=dp>=-1e-9,currentInside=dc>=-1e-9;
            if(previousInside!==currentInside){const t=dp/(dp-dc);clipped.push([
              previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t,
              previous[2]+(current[2]-previous[2])*t]);}
            if(currentInside)clipped.push(current);previous=current;dp=dc;}return clipped;},
        fixtureSpan=fixture=>{const anchor=(prefabs.get(fixture.prefab)||{}).anchor||'floor',
            y=fixture.at[1]-floor.elevation,h=fixture.size[1];
          return anchor==='floor'?[y,y+h]:[y-h/2,y+h/2];},
        renderedBounds=new Map(),renderedBound=fixture=>{if(renderedBounds.has(fixture.id))return renderedBounds.get(fixture.id);
          let [bottom,top]=fixtureSpan(fixture),x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
          for(const solid of scene.solids.filter(s=>s.fixtureId===fixture.id)){
            x0=Math.min(x0,solid.x0);x1=Math.max(x1,solid.x1);z0=Math.min(z0,solid.z0);z1=Math.max(z1,solid.z1);}
          for(const prop of scene.props.filter(prop=>propBelongs(prop.tag,fixture.id)&&prop.m&&prop.mesh!=='quad')){const m=prop.m,
              radius=.5*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]));
            bottom=Math.min(bottom,m[13]-radius);top=Math.max(top,m[13]+radius);
            for(const point of propVertices(prop)){x0=Math.min(x0,point[0]);x1=Math.max(x1,point[0]);
              z0=Math.min(z0,point[2]);z1=Math.max(z1,point[2]);}}
          const bound={x0,x1,z0,z1,bottom,top};renderedBounds.set(fixture.id,bound);return bound;},
        rayBox=(origin,target,box)=>{const delta=[target[0]-origin[0],target[2]-origin[2]];let lo=0,hi=1;
          for(const [o,v,min,max] of [[origin[0],delta[0],box.x0,box.x1],[origin[2],delta[1],box.z0,box.z1]]){
            if(Math.abs(v)<1e-9){if(o<=min||o>=max)return null;}
            else{let a=(min-o)/v,b=(max-o)/v;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>=hi)return null;}}
          return[lo,hi];},
        lineOfSight=(origin,target,excludeFixtureId,architecturalOnly=false)=>{for(const solid of scene.solids){
            if(solid.open||solid.fixtureId===excludeFixtureId||architecturalOnly&&solid.fixtureId)continue;
            // A public portal's rendered panel occupies the visual wall plane inside the wider
            // shell walking proxy. The containing proxy cannot hide its own marked door surface;
            // an earlier architectural solid on the ray still can.
            if(architecturalOnly&&target[0]>=solid.x0-.01&&target[0]<=solid.x1+.01&&
              target[2]>=solid.z0-.01&&target[2]<=solid.z1+.01)continue;
            const fixture=solid.fixtureId&&fixtures.get(solid.fixtureId),rendered=fixture&&renderedBound(fixture),
              hit=rayBox(origin,target,rendered||solid);if(!hit)continue;
            const lo=Math.max(hit[0],.002),hi=Math.min(hit[1],.985);if(lo>=hi)continue;
            let bottom=0,top=scene.H||Math.max(2.75,floor.height-.18);
            if(rendered){bottom=rendered.bottom;top=rendered.top;}
            const dy=target[1]-origin[1],y0=origin[1]+dy*lo,y1=origin[1]+dy*hi;
            if(Math.min(y0,y1)<top-.01&&Math.max(y0,y1)>bottom+.01)return false;}
          if(!architecturalOnly)for(const prop of scene.props||[]){
            if(!prop||!prop.m||prop.mesh==='quad'||propBelongs(prop.tag,excludeFixtureId)||
              prop.alpha!==undefined&&prop.alpha<.55)continue;
            if(rayProp(origin,target,prop))return false;}
          return true;},
        architecturalSolidBlocksPoint=(solid,origin,target)=>{if(!solid||solid.open||solid.fixtureId)return false;
          if(target[0]>=solid.x0-.01&&target[0]<=solid.x1+.01&&
            target[2]>=solid.z0-.01&&target[2]<=solid.z1+.01)return false;
          const hit=rayBox(origin,target,solid);if(!hit)return false;
          const lo=Math.max(hit[0],.002),hi=Math.min(hit[1],.985);if(lo>=hi)return false;
          const bottom=solid.bot===undefined?0:solid.bot,
            top=solid.top===undefined?(scene.H||3):solid.top,dy=target[1]-origin[1],
            y0=origin[1]+dy*lo,y1=origin[1]+dy*hi;
          return Math.min(y0,y1)<top-.01&&Math.max(y0,y1)>bottom+.01;},
        polygonArchitecturallyOccluded=(origin,polygon)=>{const centroid=polygon.reduce((sum,point)=>[
            sum[0]+point[0]/polygon.length,sum[1]+point[1]/polygon.length,
            sum[2]+point[2]/polygon.length],[0,0,0]),samples=[centroid,...polygon];
          for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];
            samples.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}
          return scene.solids.some(solid=>samples.every(point=>
            architecturalSolidBlocksPoint(solid,origin,point)));},
        polygonOpaquelyOccluded=(origin,polygon,excludeFixtureId)=>{const centroid=polygon.reduce((sum,point)=>[
            sum[0]+point[0]/polygon.length,sum[1]+point[1]/polygon.length,
            sum[2]+point[2]/polygon.length],[0,0,0]),samples=[centroid,...polygon];
          for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];
            samples.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]);}
          if(scene.solids.some(solid=>samples.every(point=>
            architecturalSolidBlocksPoint(solid,origin,point))))return true;
          return scene.props.some(prop=>prop&&prop.m&&prop.mesh!=='quad'&&
            fixtureOwnerId(prop.tag)!==excludeFixtureId&&(prop.alpha===undefined||prop.alpha>=.55)&&
            samples.every(point=>rayProp(origin,point,prop)));},
        bodyOccludes=(origin,target,x,z,radius=.42,height=1.85)=>{const dx=target[0]-origin[0],
            dz=target[2]-origin[2],ox=origin[0]-x,oz=origin[2]-z,a=dx*dx+dz*dz,
            b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-radius*radius;
          if(a<1e-10)return c<=0&&Math.min(origin[1],target[1])<=height&&Math.max(origin[1],target[1])>=0;
          const discriminant=b*b-4*a*c;if(discriminant<0)return false;const root=Math.sqrt(discriminant),
            lo=Math.max(.002,(-b-root)/(2*a)),hi=Math.min(.985,(-b+root)/(2*a));if(lo>hi)return false;
          const y0=origin[1]+(target[1]-origin[1])*lo,y1=origin[1]+(target[1]-origin[1])*hi;
          return Math.min(y0,y1)<=height&&Math.max(y0,y1)>=0;},
        doorSamples=scene.props.filter(prop=>prop.doorLeaf===true).map(prop=>{const vertices=propVertices(prop),
          xs=vertices.map(point=>point[0]),zs=vertices.map(point=>point[2]);return{
            leaf:{id:prop.tag||'untagged-door-leaf'},prop,vertices,
            aabb:{x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)}};}),
        sightBlocked=(x,z,pad=.055,excludeFixtureId=null)=>scene.blockers.some(s=>x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
          scene.solids.some(s=>s.fixtureId!==excludeFixtureId&&!s.open&&x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
          // Exact rendered markers are complete/cardinality-checked offline. Source aliases can
          // describe duplicate panels intentionally suppressed by reciprocal-opening dedup.
          doorSamples.some(({aabb})=>x>aabb.x0-pad&&x<aabb.x1+pad&&z>aabb.z0-pad&&z<aabb.z1+pad),
        rearClear=(x,z,yaw,back)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw),cx=x-fx*back,cz=z-fz*back;
          if(!inside(bounds,cx,cz,.18)||!cameraStable(x,z,yaw,back))return false;
          for(let q=.12;q<=back;q+=.10)if(sightBlocked(x-fx*q,z-fz*q))return false;return true;},
        frontDepth=(x,z,yaw,roomBounds)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw);let depth=0;
          for(let q=.04;q<=6;q+=.04){const px=x+fx*q,pz=z+fz*q;
            if(!inside(roomBounds,px,pz,.10)||sightBlocked(px,pz,.025))break;depth=q;}return depth;},
        foregroundDoor=(x,z,yaw,back,camera=reviewCamera(x,z,yaw,back))=>{
          for(const {leaf,prop,vertices} of doorSamples){if(!prop||!prop.m)continue;
            if(pointInProp(prop,camera.eye))return leaf;
            for(const indices of boxTriangles){const polygon=clipTriangle(camera,indices.map(i=>vertices[i]));
              if(!polygon.length)continue;
              if(!polygonArchitecturallyOccluded(camera.eye,polygon))return leaf;}}
          return null;},
        cameraFixtureIntrusion=(camera)=>{for(const prop of scene.props){
          const owner=prop&&fixtureOwnerId(prop.tag);
          if(!prop||!prop.m||prop.mesh==='quad'||(prop.alpha!==undefined&&prop.alpha<.55)||!owner)continue;
          const vertices=propVertices(prop),ys=vertices.map(point=>point[1]);
          if(Math.max(...ys)<.24||Math.min(...ys)>(scene.H||Math.max(2.75,floor.height-.18))-.18)continue;
          if(pointInProp(prop,camera.eye))return{fixtureId:owner,forward:0};
          for(const indices of boxTriangles){let polygon=clipTriangle(camera,indices.map(i=>vertices[i]));
            polygon=clipPolygonPlane(polygon,point=>${MIN_NEAR_FIXTURE_CLEARANCE}-reviewProject(camera,point).forward);
            if(polygon.length&&!polygonOpaquelyOccluded(camera.eye,polygon,owner)){
              const forward=Math.min(...polygon.map(point=>reviewProject(camera,point).forward));
              return{fixtureId:owner,forward};
            }}
          }return null;},
        focusEvidence=(ids,x,z,yaw,back,minimum,camera=reviewCamera(x,z,yaw,back),bodyEvidence=false)=>{if(!Array.isArray(ids)||ids.length<minimum)
            throw new Error('review requires '+minimum+' explicit focus fixture(s)');
          if(new Set(ids).size!==ids.length)throw new Error('review focus fixtures contain duplicate ids');
          yaw=camera.yaw===undefined?yaw:camera.yaw;
          const anchorOf=fixture=>(prefabs.get(fixture.prefab)||{}).anchor||'floor',
            sightY=fixture=>/centre/.test(anchorOf(fixture))?fixture.at[1]:
              fixture.at[1]+Math.min(fixture.size[1]*.65,1.35),fx=Math.sin(yaw),fz=Math.cos(yaw),
            rx=Math.cos(yaw),rz=-Math.sin(yaw),cameraX=camera.eye[0],cameraZ=camera.eye[2],evidence=[];
          for(const id of ids){const fixture=fixtures.get(id);if(!fixture||!fixture.at)
              throw new Error('review focus fixture does not exist: '+id);
            const dx=fixture.at[0]-cameraX,dz=fixture.at[2]-cameraZ,distance=Math.hypot(dx,dz),
              forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz),
              point=[fixture.at[0],sightY(fixture)-floor.elevation,fixture.at[2]];
            if(forward<=.35||lateral>forward*.58+.12||!reviewProject(camera,point).inside)
              throw new Error('review focus fixture is outside camera frustum: '+id);
            if(!lineOfSight(camera.eye,point,id))throw new Error('review focus fixture is occluded: '+id);
            if(bodyEvidence&&bodyOccludes(camera.eye,point,x,z))
              throw new Error('review focus fixture is occluded by evidence body: '+id);
            const parts=scene.props.filter(prop=>propBelongs(prop.tag,id)&&prop.m&&prop.mesh!=='quad'),
              readable=new Set(['PF-SCREEN','PF-DIRECTORY','PF-ROOM-SIGN','PF-EXIT-SIGN','PF-CHALKBOARD','PF-WHITEBOARD'])
                .has(fixture.prefab),reviewFacing=fixture.reviewFacing||(prefabs.get(fixture.prefab)||{}).reviewFacing,
              facingSign=reviewFacing==='local-positive-z'?1:reviewFacing==='local-negative-z'?-1:0;
            let samples=0,visibleSamples=0,innerSamples=0,minNx=Infinity,maxNx=-Infinity,minNy=Infinity,maxNy=-Infinity;
            for(const prop of parts)for(const u of [-.5,0,.5])for(const v of [-.5,0,.5])for(const w of [-.5,0,.5]){
              samples++;const sample=transformReview(prop.m,u,v,w),projected=reviewProject(camera,sample);if(!projected.inside||
                !lineOfSight(camera.eye,sample,id)||bodyEvidence&&bodyOccludes(camera.eye,sample,x,z))continue;
              visibleSamples++;minNx=Math.min(minNx,projected.nx);maxNx=Math.max(maxNx,projected.nx);
              minNy=Math.min(minNy,projected.ny);maxNy=Math.max(maxNy,projected.ny);
              if(Math.abs(projected.nx)<=.88&&Math.abs(projected.ny)<=.78)innerSamples++;}
            const projectedWidth=visibleSamples?maxNx-minNx:0,projectedHeight=visibleSamples?maxNy-minNy:0,
              projectedArea=projectedWidth*projectedHeight,toCamera=[cameraX-fixture.at[0],cameraZ-fixture.at[2]],
              planarDistance=Math.hypot(...toCamera)||1,faceOn=facingSign?Math.max(0,
                (toCamera[0]*facingSign*Math.sin(fixture.yaw||0)+
                  toCamera[1]*facingSign*Math.cos(fixture.yaw||0))/planarDistance):1,
              minWidth=readable?.10:.055,minHeight=readable?.07:.055,minArea=readable?.015:.008,
              minVisiblePercent=readable?55:35,minInnerPercent=readable?35:20;
            if(faceOn<.50)throw new Error('review focus fixture faces away from camera: '+id+' '+faceOn.toFixed(3));
            if(!parts.length||visibleSamples<3||visibleSamples*100<samples*minVisiblePercent||
              innerSamples<3||innerSamples*100<samples*minInnerPercent||
              projectedWidth<minWidth||projectedHeight<minHeight||projectedArea<minArea)
              throw new Error('review focus fixture is materially cropped: '+id+' '+visibleSamples+'/'+samples);
            evidence.push({id,prefab:fixture.prefab,reviewFacing,forward:+forward.toFixed(2),lateral:+lateral.toFixed(2),visibleSamples,samples,innerSamples,
              projectedWidth:+projectedWidth.toFixed(3),projectedHeight:+projectedHeight.toFixed(3),
              projectedArea:+projectedArea.toFixed(3),faceOn:+faceOn.toFixed(3)});
          }
          return evidence;},
        applyReviewCamera=(x,z,yaw,back)=>{const cam=window.__game.CAM,pitch=.28;
          window.__game.P.x=x;window.__game.P.z=z;window.__game.P.yaw=yaw;
          cam.fx=x;cam.fz=z;cam.yaw=cam.tYaw=yaw;cam.pitch=cam.tPitch=pitch;
          cam.dist=cam.tDist=back/Math.cos(pitch);cam.lookY=1.15;cam.slide=cam.rise=0;
          cam.fov=reviewFov;};
      let reviewWalkPoints=null;
      const connectedTo=(targetX,targetZ,tolerance=.24)=>{const playerRadius=.30;if(!reviewWalkPoints){const step=.20,
          [bx0,bx1,bz0,bz1]=bounds,width=Math.floor((bx1-bx0)/step)+1,
          height=Math.floor((bz1-bz0)/step)+1,blocked=new Uint8Array(width*height),
          seen=new Uint8Array(width*height),index=(ix,iz)=>iz*width+ix;
        for(let iz=0;iz<height;iz++)for(let ix=0;ix<width;ix++){const px=bx0+ix*step,pz=bz0+iz*step;
          blocked[index(ix,iz)]=scene.solids.some(s=>!s.open&&px>s.x0-playerRadius&&px<s.x1+playerRadius&&
            pz>s.z0-playerRadius&&pz<s.z1+playerRadius)?1:0;}
        let sx=0,sz=0,best=null;
        for(let iz=0;iz<height;iz++)for(let ix=0;ix<width;ix++)if(!blocked[index(ix,iz)]){
          const score=(bx0+ix*step-scene.spawn.x)**2+(bz0+iz*step-scene.spawn.z)**2;
          if(!best||score<best[2])best=[ix,iz,score];}
        if(!best)return false;[sx,sz]=best;
        const queue=[[sx,sz]];seen[index(sx,sz)]=1;reviewWalkPoints=[];
        for(let cursor=0;cursor<queue.length;cursor++){const [ix,iz]=queue[cursor],px=bx0+ix*step,pz=bz0+iz*step;
          reviewWalkPoints.push([px,pz]);
          for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=ix+dx,nz=iz+dz;
            if(nx<0||nz<0||nx>=width||nz>=height)continue;const key=index(nx,nz);
            if(blocked[key]||seen[key])continue;const tx=bx0+nx*step,tz=bz0+nz*step,
              moved=scene.clampMove(px,pz,tx,tz,playerRadius);
            if(Math.abs(moved[0]-tx)>.011||Math.abs(moved[1]-tz)>.011)continue;
            seen[key]=1;queue.push([nx,nz]);}}}
        return reviewWalkPoints.some(([px,pz])=>{if(Math.hypot(px-targetX,pz-targetZ)>tolerance)return false;
          const moved=scene.clampMove(px,pz,targetX,targetZ,playerRadius);
          return Math.abs(moved[0]-targetX)<=.011&&Math.abs(moved[1]-targetZ)<=.011;});};
      let reviewRoom=null,reviewAt=null,entryReviewAt=null,movementProof=null;
      if(mode==='entry'&&at){
        const yaw=at.yaw,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),
          ox=window.__game.P.x,oz=window.__game.P.z,zones=[...(floor.rooms||[]),...(floor.circulation||[])],
          authoredEntries=floor.visualReview&&Array.isArray(floor.visualReview.entries)?floor.visualReview.entries:[],
          authored=authoredEntries.find(q=>q&&q.suffix===suffix&&q.portalId===portalId),
          entryZone=zones.filter(q=>inside(q.bounds,ox,oz,-.08))
            .sort((a,b)=>(a.bounds[1]-a.bounds[0])*(a.bounds[3]-a.bounds[2])-
              (b.bounds[1]-b.bounds[0])*(b.bounds[3]-b.bounds[2]))[0];
        if(authored){
          const focusRoom=(floor.rooms||[]).find(q=>q.id===authored.focusRoomId),
            cameraZone=zones.find(q=>q.id===authored.cameraZoneId),pose=authored.focusAt||{},
            x=pose.x,z=pose.z,reviewYaw=pose.yaw;
          if(!focusRoom)throw new Error('authored ground arrival focus room does not exist: '+authored.focusRoomId);
          if(!cameraZone)throw new Error('authored ground arrival camera zone does not exist: '+authored.cameraZoneId);
          if(![x,z,reviewYaw].every(Number.isFinite)||!inside(focusRoom.bounds,x,z,radius)||!free(x,z))
            throw new Error('authored ground arrival focus is not body-clear inside '+focusRoom.id);
          if(!connectedTo(ox,oz,.32))throw new Error('authored ground portal arrival is disconnected from the live floor: '+portalId);
          if(!connectedTo(x,z))throw new Error('authored ground arrival is not connected to the live spawn in '+focusRoom.id);
          const back=backOptions.find(q=>inside(cameraZone.bounds,x-Math.sin(reviewYaw)*q,z-Math.cos(reviewYaw)*q,.18)&&
              rearClear(x,z,reviewYaw,q))||0,front=frontDepth(x,z,reviewYaw,focusRoom.bounds);
          if(!back)throw new Error('authored ground arrival has no clear camera in '+cameraZone.id);
          if(back<${MIN_REVIEW_BACK})throw new Error('authored ground arrival camera back is less than ${MIN_REVIEW_BACK.toFixed(2)}m in '+cameraZone.id);
          if(front<${MIN_REVIEW_FRONT})throw new Error('authored ground arrival faces less than ${MIN_REVIEW_FRONT.toFixed(2)}m of '+focusRoom.id);
          if(authored.body!=='hidden'&&authored.body!=='evidence')
            throw new Error('authored ground arrival requires explicit hidden/evidence body policy');
          bodyVisible=authored.body==='evidence';bodyPolicy=authored.body;
          applyReviewCamera(x,z,reviewYaw,back);
          await new Promise(resolve=>setTimeout(resolve,800));
          const actual=requireResolvedCamera(x,z,reviewYaw,back),resolvedFront=frontDepth(x,z,actual.yaw,focusRoom.bounds),
            door=foregroundDoor(x,z,reviewYaw,back,actual),
            intrusion=cameraFixtureIntrusion(actual),focus=focusEvidence(authored.focusFixtureIds,x,z,reviewYaw,back,1,actual);
          if(actual.horizontalBack<${MIN_REVIEW_BACK})
            throw new Error('resolved ground arrival camera back is less than ${MIN_REVIEW_BACK.toFixed(2)}m in '+cameraZone.id);
          if(resolvedFront<${MIN_REVIEW_FRONT})
            throw new Error('resolved ground arrival faces less than ${MIN_REVIEW_FRONT.toFixed(2)}m of '+focusRoom.id);
          if(door)throw new Error('authored ground arrival has a foreground door leaf: '+door.id);
          if(intrusion)throw new Error('authored ground arrival has near-camera fixture: '+intrusion.fixtureId);
          entryReviewAt={x:+x.toFixed(2),z:+z.toFixed(2),yaw:reviewYaw,inward:0,lateral:0,
            cameraBack:+actual.horizontalBack.toFixed(2),frontDepth:+resolvedFront.toFixed(2),entryZone:cameraZone.id,
            focusRoom:focusRoom.id,cameraZone:cameraZone.id,authored:true,
            focusFixtureIds:[...authored.focusFixtureIds],focusEvidence:focus};
        }else{
        if(!entryZone)throw new Error('portal threshold has no authored entry zone for '+scene.buildingId);
        const staysInZone=(x,z,pad=.04)=>inside(entryZone.bounds,x,z,pad),
          entryCameraBack=(x,z,yaw)=>backOptions.find(back=>{
            const cx=x-Math.sin(yaw)*back,cz=z-Math.cos(yaw)*back;
            return staysInZone(cx,cz,.18)&&rearClear(x,z,yaw,back);
          })||0,
          pathFree=(lateral,d)=>{const sign=Math.sign(lateral),span=Math.abs(lateral);
            for(let q=.12;q<=span;q+=.10){const x=ox+rx*sign*q,z=oz+rz*sign*q;if(!staysInZone(x,z)||!free(x,z))return false;}
            const lx=ox+rx*lateral,lz=oz+rz*lateral;
            for(let q=.12;q<=d;q+=.10){const x=lx+fx*q,z=lz+fz*q;if(!staysInZone(x,z)||!free(x,z))return false;}return true;};
        const candidates=[],limit=Math.hypot(entryZone.bounds[1]-entryZone.bounds[0],entryZone.bounds[3]-entryZone.bounds[2]),
          lanes=[0,-.36,.36,-.72,.72,-1.08,1.08,-1.44,1.44];
        for(const lateral of lanes){const lx=ox+rx*lateral,lz=oz+rz*lateral;
          for(let d=.24;d<=limit;d+=.12){const x=lx+fx*d,z=lz+fz*d,back=entryCameraBack(x,z,yaw);
            const front=frontDepth(x,z,yaw,entryZone.bounds);
            if(pathFree(lateral,d)&&free(x,z)&&staysInZone(x,z,radius)&&back&&front>=.72)
              candidates.push({x,z,d,lateral,back,front,score:Math.abs(d-1.2)+Math.abs(lateral)*.55-back*.12});}}
        candidates.sort((a,b)=>a.score-b.score);const chosen=candidates[0];
        if(!chosen)throw new Error('entry camera could not find a clear frame inside '+entryZone.id);
        applyReviewCamera(chosen.x,chosen.z,yaw,chosen.back);
        await new Promise(resolve=>setTimeout(resolve,800));
        const actual=requireResolvedCamera(chosen.x,chosen.z,yaw,chosen.back),
          resolvedFront=frontDepth(chosen.x,chosen.z,actual.yaw,entryZone.bounds),
          door=foregroundDoor(chosen.x,chosen.z,yaw,chosen.back,actual);
        if(resolvedFront<.72)throw new Error('resolved fallback entry has insufficient front depth in '+entryZone.id);
        if(door)throw new Error('fallback entry has a foreground door leaf: '+door.id);
        entryReviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw,inward:+chosen.d.toFixed(2),
          lateral:+chosen.lateral.toFixed(2),cameraBack:+actual.horizontalBack.toFixed(2),frontDepth:+resolvedFront.toFixed(2),
          entryZone:entryZone.id,authored:false};
        }
      }
      if(mode==='entry'&&!at){
        const ox=window.__game.P.x,oz=window.__game.P.z,zones=[...(floor.circulation||[]),...(floor.rooms||[])],
          authored=floor.visualReview&&floor.visualReview.entry,
          spawnZone=zones.filter(q=>inside(q.bounds,ox,oz,-.08))
            .sort((a,b)=>(a.bounds[1]-a.bounds[0])*(a.bounds[3]-a.bounds[2])-
              (b.bounds[1]-b.bounds[0])*(b.bounds[3]-b.bounds[2]))[0],
          entryZone=authored?zones.find(q=>q.id===authored.zoneId):spawnZone;
        if(!entryZone)throw new Error('upper-floor arrival has no authored zone for '+scene.buildingId+'/F'+floor.level);
        const candidates=[],offsets=[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3],[.6,0],[-.6,0],[0,.6],[0,-.6]],
          yaws=[window.__game.P.yaw,0,Math.PI/2,Math.PI,-Math.PI/2],moveClear=(x,z)=>{
            const distance=Math.hypot(x-ox,z-oz),steps=Math.max(1,Math.ceil(distance/.10));
            for(let i=1;i<=steps;i++){const q=i/steps,px=ox+(x-ox)*q,pz=oz+(z-oz)*q;
              if(!inside(entryZone.bounds,px,pz,.04)||!free(px,pz))return false;}return true;};
        const zoneCameraBack=(x,z,yaw)=>backOptions.find(back=>{
          const cx=x-Math.sin(yaw)*back,cz=z-Math.cos(yaw)*back;
          return inside(entryZone.bounds,cx,cz,.18)&&rearClear(x,z,yaw,back);
        })||0;
        if(authored){
          const pose=authored.at||{},x=pose.x,z=pose.z,yaw=pose.yaw,back=zoneCameraBack(x,z,yaw),
            front=frontDepth(x,z,yaw,entryZone.bounds);
          if(![x,z,yaw].every(Number.isFinite)||!inside(entryZone.bounds,x,z,radius)||!free(x,z)||
            !connectedTo(x,z)||!back||back<${MIN_REVIEW_BACK}||front<${MIN_REVIEW_FRONT})
            throw new Error('authored upper-floor arrival is not clear in '+entryZone.id);
          candidates.push({x,z,yaw,back,front,move:Math.hypot(x-ox,z-oz),score:1e6,
            focusFixtureIds:[...authored.focusFixtureIds]});
        }else for(const [dx,dz] of offsets){const x=ox+dx,z=oz+dz;
          if(!inside(entryZone.bounds,x,z,radius)||!free(x,z)||!moveClear(x,z))continue;
          for(const yaw of yaws){const back=zoneCameraBack(x,z,yaw),front=frontDepth(x,z,yaw,entryZone.bounds);
            if(back&&front>=.72)candidates.push({x,z,yaw,back,front,move:Math.hypot(dx,dz),
              score:front*2.2+back*.35-Math.hypot(dx,dz)*.40});}}
        candidates.sort((a,b)=>b.score-a.score);const chosen=candidates[0];
        if(!chosen)throw new Error('upper-floor arrival camera could not frame '+entryZone.id);
        applyReviewCamera(chosen.x,chosen.z,chosen.yaw,chosen.back);
        await new Promise(resolve=>setTimeout(resolve,800));
        const actual=requireResolvedCamera(chosen.x,chosen.z,chosen.yaw,chosen.back),
          resolvedFront=frontDepth(chosen.x,chosen.z,actual.yaw,entryZone.bounds),
          door=foregroundDoor(chosen.x,chosen.z,chosen.yaw,chosen.back,actual),
          intrusion=cameraFixtureIntrusion(actual),
          focus=authored?focusEvidence(authored.focusFixtureIds,chosen.x,chosen.z,chosen.yaw,chosen.back,1,actual,
            authored.body==='evidence'):[];
        if(authored&&actual.horizontalBack<${MIN_REVIEW_BACK})
          throw new Error('resolved upper-floor arrival camera back is less than ${MIN_REVIEW_BACK.toFixed(2)}m in '+entryZone.id);
        if(resolvedFront<(authored?${MIN_REVIEW_FRONT}:.72))
          throw new Error('resolved upper-floor arrival has insufficient front depth in '+entryZone.id);
        if(door)throw new Error('authored upper-floor arrival has a foreground door leaf: '+door.id);
        if(authored&&intrusion)throw new Error('authored upper-floor arrival has near-camera fixture: '+intrusion.fixtureId);
        entryReviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw:chosen.yaw,inward:0,
          lateral:+chosen.move.toFixed(2),cameraBack:+actual.horizontalBack.toFixed(2),entryZone:entryZone.id,
          frontDepth:+resolvedFront.toFixed(2),authored:!!authored,
          focusFixtureIds:authored?[...authored.focusFixtureIds]:[],focusEvidence:focus};
        if(authored){
          if(authored.body!==undefined&&authored.body!=='hidden'&&authored.body!=='evidence')
            throw new Error('authored upper-floor arrival has invalid body policy');
          bodyVisible=authored.body==='evidence';bodyPolicy=bodyVisible?'evidence':'hidden';
        }
      }
      if(mode==='programme'){
        const authored=floor.visualReview&&floor.visualReview.programme,rooms=[...(floor.rooms||[])].filter(r=>r.finish!=='service')
          .sort((a,b)=>(b.bounds[1]-b.bounds[0])*(b.bounds[3]-b.bounds[2])-
            (a.bounds[1]-a.bounds[0])*(a.bounds[3]-a.bounds[2]));
        let chosen=null,room=null;
        if(authored){
          room=(floor.rooms||[]).find(r=>r.id===authored.roomId);
          if(!room)throw new Error('authored programme room does not exist: '+authored.roomId);
          const pose=authored.at||{},x=pose.x,z=pose.z,yaw=pose.yaw;
          if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(yaw)||!inside(room.bounds,x,z,radius)||!free(x,z))
            throw new Error('authored programme pose is not body-clear inside '+room.id);
          if(!connectedTo(x,z))throw new Error('authored programme pose is not connected to the live spawn in '+room.id);
          const back=backOptions.find(q=>inside(room.bounds,x-Math.sin(yaw)*q,z-Math.cos(yaw)*q,.18)&&
            rearClear(x,z,yaw,q))||0,front=frontDepth(x,z,yaw,room.bounds);
          if(!back)throw new Error('authored programme pose has no clear rear-camera sightline in '+room.id);
          if(back<${MIN_REVIEW_BACK})throw new Error('authored programme camera back is less than ${MIN_REVIEW_BACK.toFixed(2)}m in '+room.id);
          if(front<${MIN_REVIEW_FRONT})throw new Error('authored programme pose faces less than ${MIN_REVIEW_FRONT.toFixed(2)}m of '+room.id);
          chosen={x,z,yaw,back,front,authored:true,focusFixtureIds:[...authored.focusFixtureIds]};
        }else{
          room=rooms[0]||floor.rooms[0];if(!room)throw new Error('floor has no programme room');
          const b=room.bounds,candidates=[],yaws=[0,Math.PI/2,Math.PI,-Math.PI/2];
          for(let z=b[2]+.40;z<=b[3]-.40;z+=.20)for(let x=b[0]+.40;x<=b[1]-.40;x+=.20){
            if(!free(x,z)||!inside(b,x,z,radius))continue;
            for(const yaw of yaws){const back=backOptions.find(q=>inside(b,x-Math.sin(yaw)*q,z-Math.cos(yaw)*q,.18)&&
                rearClear(x,z,yaw,q))||0,front=frontDepth(x,z,yaw,b);
              if(back&&front>=.72)candidates.push({x,z,yaw,back,front,authored:false,
                score:front*2.2+back*.35-Math.hypot(x-(b[0]+b[1])/2,z-(b[2]+b[3])/2)*.08});}}
          candidates.sort((a,b)=>b.score-a.score);chosen=candidates[0];
          if(!chosen)throw new Error('programme camera could not frame '+room.id);
        }
        applyReviewCamera(chosen.x,chosen.z,chosen.yaw,chosen.back);reviewRoom=room.id;
        await new Promise(resolve=>setTimeout(resolve,800));
        const actual=requireResolvedCamera(chosen.x,chosen.z,chosen.yaw,chosen.back),
          resolvedFront=frontDepth(chosen.x,chosen.z,actual.yaw,room.bounds),
          door=foregroundDoor(chosen.x,chosen.z,chosen.yaw,chosen.back,actual),
          intrusion=cameraFixtureIntrusion(actual),
          focus=chosen.authored?focusEvidence(chosen.focusFixtureIds,chosen.x,chosen.z,chosen.yaw,chosen.back,2,actual):[];
        if(chosen.authored&&actual.horizontalBack<${MIN_REVIEW_BACK})
          throw new Error('resolved programme camera back is less than ${MIN_REVIEW_BACK.toFixed(2)}m in '+room.id);
        if(resolvedFront<(chosen.authored?${MIN_REVIEW_FRONT}:.72))
          throw new Error('resolved programme pose has insufficient front depth in '+room.id);
        if(door)throw new Error('authored programme pose has a foreground door leaf in '+room.id+': '+door.id);
        if(chosen.authored&&intrusion)throw new Error('authored programme pose has near-camera fixture in '+room.id+': '+intrusion.fixtureId);
        reviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw:chosen.yaw,
          cameraBack:+actual.horizontalBack.toFixed(2),frontDepth:+resolvedFront.toFixed(2),authored:chosen.authored,
          focusFixtureIds:chosen.focusFixtureIds||[],focusEvidence:focus};
      }
      if(scene.buildingId==='B06'&&floor.level===1&&mode==='entry'&&suffix==='entry'){
        const start=[scene.spawn.x,scene.spawn.z],waypoints=[start,[0,-1],[0,2.35],[2.4,2.35]],radius=.30,step=.01;
        if(Math.hypot(start[0]-2.4,start[1]+1)>1e-8)
          throw new Error('science-lab live spawn moved away from the proved entrance route: '+JSON.stringify(start));
        let position=[...start],accepted=0,expected=0,maxError=0;
        for(let segment=1;segment<waypoints.length;segment++){
          const start=waypoints[segment-1],end=waypoints[segment],distance=Math.hypot(end[0]-start[0],end[1]-start[1]),
            steps=Math.round(distance/step);expected+=steps;
          for(let index=1;index<=steps;index++){
            const target=[start[0]+(end[0]-start[0])*index/steps,start[1]+(end[1]-start[1])*index/steps],
              moved=scene.clampMove(position[0],position[1],target[0],target[1],radius),
              error=Math.hypot(moved[0]-target[0],moved[1]-target[1]);
            maxError=Math.max(maxError,error);if(error<=1e-8)accepted++;position=moved;
          }
        }
        movementProof={radius,step,start:start.map(value=>+value.toFixed(12)),accepted,expected,maxError:+maxError.toFixed(12),
          final:position.map(value=>+value.toFixed(12))};
        if(accepted!==815||expected!==815||maxError>1e-8||Math.hypot(position[0]-2.4,position[1]-2.35)>1e-8)
          throw new Error('science-lab threshold traversal failed: '+JSON.stringify(movementProof));
      }
      window.__game.showBody(bodyVisible);
      await new Promise(resolve=>setTimeout(resolve,350));
      return{ok:true,place:state.place,buildingId:scene.buildingId,level:scene.blueprintFloor&&scene.blueprintFloor.level,
        props:scene.props.length,solids:scene.solids.length,blockers:scene.blockers.length,things:scene.things.length,
        lights:scene.lights.length,zones:scene.zones.length,spawn:scene.spawn,bodyVisible,bodyPolicy,
        reviewRoom,reviewAt,entryReviewAt,movementProof};
    // Dense upper floors can spend more than 45 seconds constructing under GitHub's software
    // WebGL runner. Keep the same bounded three-minute DevTools allowance used by other calls so
    // a slow, valid scene reaches the visual gates instead of being misreported as a design fault.
    }catch(error){return{ok:false,error:error.stack||error.message};}})()`,180000);
    if(!result.ok||result.buildingId!==view.building||result.level!==view.level||
      (view.mode==='programme'&&(!result.reviewRoom||!result.reviewAt))||
      (view.mode==='entry'&&!result.entryReviewAt))
      throw new Error(`university view failed: ${JSON.stringify({view,result})}`);
    const suffix=view.suffix?`-${view.suffix}`:'',file=`${view.building}-F${view.level}${suffix}.png`;
    const image=await capture(file);
    if(!image.healthy)throw new Error(`${file}: screenshot is blank or visually degenerate: ${JSON.stringify(image)}`);
    report.push({schema:ROW_SCHEMA,...view,...result,reviewPrerequisites,file,image});
    writeJson(path.join(OUTPUT_DIR,'report.json'),{
      schema:REPORT_SCHEMA,
      source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
      complete:false,views:report.length,reviewPrerequisites,report,
      errors:runtimeErrors.slice(0,20),
    });
  }
  const errors=runtimeErrors.filter(text=>!/favicon|autoplay|Download the React/i.test(text));
  const output={schema:REPORT_SCHEMA,source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
    complete:true,views:report.length,reviewPrerequisites,report,errors:errors.slice(0,20)};
  writeJson(path.join(OUTPUT_DIR,'report.json'),output);
  const priorFatal=path.join(OUTPUT_DIR,'fatal-error.json');if(fs.existsSync(priorFatal))fs.rmSync(priorFatal,{force:true});
  console.log(JSON.stringify({views:report.length,buildings:[...new Set(report.map(r=>r.buildingId))],
    floors:[...new Set(report.map(r=>`${r.buildingId}/F${r.level}`))].length,
    maxProps:report.reduce((a,b)=>a.props>b.props?a:b),errors:errors.length},null,2));
  if(errors.length)throw new Error(`runtime errors: ${errors.join(' || ')}`);
  socket.close();
}

if(require.main===module)main().catch(error=>{
  try{
    fs.mkdirSync(OUTPUT_DIR,{recursive:true});
    writeJson(path.join(OUTPUT_DIR,'fatal-error.json'),{
      schema:REPORT_SCHEMA,source:process.env.GITHUB_SHA||'local',building:MERGE_MODE?'MERGE':activeView&&activeView.building||REVIEW_BUILDING||'ALL',
      view:activeView,message:error&&error.message||String(error),stack:error&&error.stack||String(error),
    });
  }catch(writeError){console.error(`could not persist fatal-error.json: ${writeError.message}`);}
  console.error(error.stack||error.message);process.exitCode=1;
}).finally(async()=>{
  if(chrome){chrome.kill('SIGTERM');await sleep(500);if(chrome.exitCode===null)chrome.kill('SIGKILL');}
  if(profile)try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3});}catch(_){}
});

module.exports={pngStats,fingerprintMae,fingerprintHamming,validFocusEvidence,expectedReviewViews,
  validateCanonicalRow,compareIndependentReviewOutputs,REPORT_SCHEMA,ROW_SCHEMA,SHARD_OUTCOME_SCHEMA,VERIFICATION_SCHEMA};
