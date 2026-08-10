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
const EXPECTED_SOURCE=(process.env.GITHUB_SHA||'').trim();
const BUILDING_IDS=['B01','B02','B03','B04','B05','B06','B07','B08'];
const CURATED_PROGRAMME_BUILDINGS=new Set(BUILDING_IDS);
const BUILDING_FLOORS={B01:5,B02:4,B03:1,B04:6,B05:4,B06:4,B07:3,B08:1};
const OUTPUT_DIR=MERGE_MODE?OUTPUT_ROOT:REVIEW_BUILDING?path.join(OUTPUT_ROOT,REVIEW_BUILDING):OUTPUT_ROOT;
const VIEWPORT={width:1024,height:640,deviceScaleFactor:1,mobile:false};
const CAPTURE_ATTEMPTS=2,CAPTURE_TIMEOUT_MS=75000,CAPTURE_SETTLE_MS=220,CAPTURE_RETRY_MS=750;
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

function pngStats(source,label=Buffer.isBuffer(source)?'PNG buffer':String(source)){
  const png=Buffer.isBuffer(source)?source:fs.readFileSync(source),signature='89504e470d0a1a0a';
  if(png.subarray(0,8).toString('hex')!==signature)throw new Error(`${label}: invalid PNG signature`);
  let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0;const idat=[];
  while(offset+12<=png.length){
    const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
    if(type==='IDAT')idat.push(data);offset+=12+length;if(type==='IEND')break;
  }
  const bpp=colorType===6?4:colorType===2?3:0;
  if(!width||!height||bitDepth!==8||!bpp||interlace)throw new Error(`${label}: unsupported PNG format ${width}x${height}/${bitDepth}/${colorType}/${interlace}`);
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*bpp,recon=Buffer.alloc(stride*height);let src=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[src++],row=y*stride,prev=row-stride;
    for(let x=0;x<stride;x++){
      const value=raw[src++],a=x>=bpp?recon[row+x-bpp]:0,b=y?recon[prev+x]:0,c=y&&x>=bpp?recon[prev+x-bpp]:0;
      recon[row+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN))&255;
    }
  }
  let n=0,sum=0,sum2=0,min=255,max=0;const bins=new Set();
  for(let y=0;y<height;y+=8)for(let x=0;x<width;x+=8){const i=y*stride+x*bpp,l=.2126*recon[i]+.7152*recon[i+1]+.0722*recon[i+2];
    n++;sum+=l;sum2+=l*l;min=Math.min(min,l);max=Math.max(max,l);bins.add(Math.floor(l/8));}
  const mean=sum/n,stddev=Math.sqrt(Math.max(0,sum2/n-mean*mean));
  return{width,height,samples:n,mean:+mean.toFixed(2),stddev:+stddev.toFixed(2),range:+(max-min).toFixed(2),luminanceBins:bins.size,
    healthy:n>1000&&stddev>=12&&max-min>=36&&bins.size>=12};
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
function validReviewPrerequisites(value){
  return !!value&&value.bodyControl===true&&value.fontReady===true&&value.fontCheck===true&&
    Number.isInteger(value.glyphVariants)&&value.glyphVariants>=6&&
    Number.isInteger(value.glyphCount)&&value.glyphCount>=8&&
    Number.isFinite(value.minGlyphInk)&&value.minGlyphInk>=40;
}
function validFocusEvidence(value,minimum){
  if(!value||!Array.isArray(value.focusFixtureIds)||value.focusFixtureIds.length<minimum||
    new Set(value.focusFixtureIds).size!==value.focusFixtureIds.length||!Array.isArray(value.focusEvidence)||
    value.focusEvidence.length!==value.focusFixtureIds.length)return false;
  return value.focusEvidence.every((e,index)=>e&&e.id===value.focusFixtureIds[index]&&
    Number.isFinite(e.forward)&&e.forward>.35&&Number.isFinite(e.lateral)&&e.lateral>=0);
}

function mergeReviewOutputs(){
  if(REVIEW_BUILDING)throw new Error('UNIVERSITY_REVIEW_MERGE cannot be combined with UNIVERSITY_REVIEW_BUILDING');
  fs.mkdirSync(OUTPUT_ROOT,{recursive:true});
  writeJson(path.join(OUTPUT_ROOT,'report.json'),{
    source:'merge-pending',complete:false,views:0,report:[],errors:[],shards:[],
  });
  const defects=[],fatalErrors=[],shards=[],rows=[],captures=[],sources=new Set(),
    validatedKeys=new Set(),validatedFiles=new Set(),validatedDigests=new Map();
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
    const shardDir=path.join(OUTPUT_ROOT,building),reportFile=path.join(shardDir,'report.json');
    if(!fs.existsSync(reportFile)){defects.push(`${building}: missing report.json`);continue;}
    let shard;
    try{shard=readJson(reportFile);}catch(error){defects.push(`${building}: invalid report.json: ${error.message}`);continue;}
    const shardRows=Array.isArray(shard.report)?shard.report:[];
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
        expectedFile=`${building}-F${rowLevel}-${suffix}.png`,metricFields=['props','solids','lights'],
        invalidMetrics=metricFields.filter(field=>!Number.isFinite(row[field])||row[field]<0);
      let valid=row.ok===true&&row.buildingId===building&&knownBuilding&&rowBuilding===building&&validLevel&&
        validSuffix&&row.mode===expectedMode&&!invalidMetrics.length;
      if(row.ok!==true)defects.push(`${building}: row ${key} is not marked ok`);
      if(row.buildingId!==building)defects.push(`${building}: buildingId ${JSON.stringify(row.buildingId)} does not match shard for ${key}`);
      if(!knownBuilding)defects.push(`${building}: unknown row building ${JSON.stringify(rowBuilding)}`);
      if(rowBuilding!==building)defects.push(`${building}: foreign row ${key}`);
      if(!validLevel)defects.push(`${building}: invalid level ${JSON.stringify(rowLevel)} for ${JSON.stringify(rowBuilding)}`);
      if(!validSuffix)defects.push(`${building}: invalid suffix ${JSON.stringify(suffix)} for ${key}`);
      if(row.mode!==expectedMode)defects.push(`${building}: mode ${JSON.stringify(row.mode)} does not match suffix ${JSON.stringify(suffix)} for ${key}`);
      if(invalidMetrics.length)defects.push(`${building}: row ${key} has invalid ${invalidMetrics.join(', ')} count(s)`);
      const prerequisites=row.reviewPrerequisites,prerequisiteFields=[
        'bodyControl','fontReady','fontCheck','glyphVariants','glyphCount','minGlyphInk'];
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
        row.reviewAt.cameraBack<=0||row.reviewAt.frontDepth<.72||typeof row.reviewAt.authored!=='boolean'||
        CURATED_PROGRAMME_BUILDINGS.has(building)&&row.reviewAt.authored!==true||!validFocusEvidence(row.reviewAt,2))){
        defects.push(`${building}: programme camera evidence is incomplete for ${key}`);valid=false;
      }
      const requiresAuthoredGround=rowLevel===1;
      if((suffix==='clinic-entry'||suffix==='entry')&&
        (!hasFiniteFields(row.entryReviewAt,['x','z','yaw','inward','lateral','cameraBack'])||
          row.entryReviewAt.inward<0||row.entryReviewAt.cameraBack<=0||
          !Number.isFinite(row.entryReviewAt.frontDepth)||row.entryReviewAt.frontDepth<.72||
          typeof row.entryReviewAt.authored!=='boolean'||
          (rowLevel>1||requiresAuthoredGround)&&row.entryReviewAt.authored!==true||
          !validFocusEvidence(row.entryReviewAt,1)||
          requiresAuthoredGround&&(
            typeof row.entryReviewAt.focusRoom!=='string'||!row.entryReviewAt.focusRoom.trim()||
            typeof row.entryReviewAt.cameraZone!=='string'||!row.entryReviewAt.cameraZone.trim()))){
        defects.push(`${building}: arrival evidence missing entryReviewAt for ${key}`);valid=false;
      }
      const captureFile=path.join(shardDir,row.file);
      if(!fs.existsSync(captureFile)){defects.push(`${building}: missing ${row.file}`);continue;}
      try{
        const png=fs.readFileSync(captureFile),stats=pngStats(png,captureFile),
          digest=crypto.createHash('sha256').update(png).digest('hex'),duplicate=validatedDigests.get(digest);
        if(!stats.healthy){defects.push(`${building}: unhealthy ${row.file}`);valid=false;}
        if(stats.width!==VIEWPORT.width||stats.height!==VIEWPORT.height){
          defects.push(`${building}: ${row.file} is ${stats.width}x${stats.height}, expected ${VIEWPORT.width}x${VIEWPORT.height}`);
          valid=false;
        }
        if(duplicate){defects.push(`${building}: ${row.file} duplicates PNG bytes from ${duplicate}`);valid=false;}
        else if(valid){row.captureSha256=digest;validatedDigests.set(digest,row.file);}
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
    const suffixes=new Set(rows.filter(r=>`${r.buildingId||r.building}/F${r.level}`===floor).map(r=>r.suffix));
    if(!suffixes.has('entry')||!suffixes.has('programme'))defects.push(`${floor}: missing entry or programme view`);
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
      source:sources.size===1?[...sources][0]:'merge-partial',complete:false,views:rows.length,
      report:rows,errors:defects,shards,
    });
    throw new Error(`university review merge validation failed: ${defects.slice(0,30).join(' | ')}`);
  }

  const output={source:[...sources][0],complete:true,views:rows.length,report:rows,errors:[],shards};
  writeJson(path.join(OUTPUT_ROOT,'report.json'),output);
  for(const name of ['fatal-error.json','fatal-errors.json']){
    const file=path.join(OUTPUT_ROOT,name);if(fs.existsSync(file))fs.rmSync(file,{force:true});
  }
  console.log(JSON.stringify({merge:true,complete:true,views:rows.length,buildings:buildings.size,floors:floors.size,errors:0},null,2));
}

async function main(){
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
    return{bodyControl:true,fontReady:document.fonts.status==='loaded',fontCheck,
      glyphCount:probe.length,glyphVariants:new Set(signatures).size,minGlyphInk:Math.min(...inks)};
  })()`);
  if(!reviewPrerequisites.bodyControl||!reviewPrerequisites.fontReady||!reviewPrerequisites.fontCheck||
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
        bounds=building.localBounds,radius=.32,backOptions=[3.6,3.2,2.8,2.4,2.0,1.7,1.4];
      const inside=(b,x,z,pad=0)=>x>=b[0]+pad&&x<=b[1]-pad&&z>=b[2]+pad&&z<=b[3]-pad,
        free=(x,z,pad=radius)=>inside(bounds,x,z,pad)&&
          !scene.solids.some(s=>!s.open&&x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad),
        doorLeaves=(floor.rooms||[]).flatMap(room=>(room.doors||[]).map(door=>{
          const vertical=door.side==='west'||door.side==='east',w=door.width||.9,dx=door.at[0],dz=door.at[2],
            a=50*Math.PI/180,hx=vertical?dx:dx-w/2,hz=vertical?dz-w/2:dz;
          let vx,vz;
          if(door.side==='west'){vx=Math.sin(a);vz=Math.cos(a);}
          else if(door.side==='east'){vx=-Math.sin(a);vz=Math.cos(a);}
          else if(door.side==='south'){vx=Math.cos(a);vz=Math.sin(a);}
          else{vx=Math.cos(a);vz=-Math.sin(a);}
          const cx=hx+vx*w*.39,cz=hz+vz*w*.39,yaw=Math.atan2(-vz,vx),c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw)),
            ex=c*w*.39+s*.04,ez=s*w*.39+c*.04;
          return{x0:cx-ex,x1:cx+ex,z0:cz-ez,z1:cz+ez};
        })),
        sightBlocked=(x,z,pad=.055,excludeFixtureId=null)=>scene.blockers.some(s=>x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
          scene.solids.some(s=>s.fixtureId!==excludeFixtureId&&!s.open&&x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad)||
          doorLeaves.some(s=>x>s.x0-pad&&x<s.x1+pad&&z>s.z0-pad&&z<s.z1+pad),
        rearClear=(x,z,yaw,back)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw),cx=x-fx*back,cz=z-fz*back;
          if(!inside(bounds,cx,cz,.18))return false;
          for(let q=.12;q<=back;q+=.10)if(sightBlocked(x-fx*q,z-fz*q))return false;return true;},
        frontDepth=(x,z,yaw,roomBounds)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw);let depth=0;
          for(let q=.16;q<=6;q+=.12){const px=x+fx*q,pz=z+fz*q;
            if(!inside(roomBounds,px,pz,.10)||sightBlocked(px,pz,.025))break;depth=q;}return depth;},
        foregroundDoor=(x,z,yaw,back)=>{const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),
          cameraX=x-fx*back,cameraZ=z-fz*back;
          return doorLeaves.find(leaf=>{const cx=(leaf.x0+leaf.x1)/2,cz=(leaf.z0+leaf.z1)/2,dx=cx-cameraX,dz=cz-cameraZ,
            forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz),radius=Math.hypot(leaf.x1-leaf.x0,leaf.z1-leaf.z0)/2;
            return forward>.08&&forward<2.10&&lateral-radius<.18+forward*.52;})||null;},
        focusEvidence=(ids,x,z,yaw,back,minimum)=>{if(!Array.isArray(ids)||ids.length<minimum)
            throw new Error('review requires '+minimum+' explicit focus fixture(s)');
          if(new Set(ids).size!==ids.length)throw new Error('review focus fixtures contain duplicate ids');
          const fixtures=new Map((floor.rooms||[]).flatMap(room=>room.contents||[]).concat(floor.sharedObjects||[])
              .map(fixture=>[fixture.id,fixture])),prefabs=new Map(CampusInteriors.plan.prefabCatalog.map(spec=>[spec.id,spec])),
            anchorOf=fixture=>(prefabs.get(fixture.prefab)||{}).anchor||'floor',
            topOf=fixture=>fixture.at[1]+fixture.size[1]*(/centre/.test(anchorOf(fixture))?.5:1),
            sightY=fixture=>/centre/.test(anchorOf(fixture))?fixture.at[1]:
              fixture.at[1]+Math.min(fixture.size[1]*.65,1.35),fx=Math.sin(yaw),fz=Math.cos(yaw),
            rx=Math.cos(yaw),rz=-Math.sin(yaw),cameraX=x-fx*back,cameraZ=z-fz*back,cameraY=floor.elevation+1.15,evidence=[];
          for(const id of ids){const fixture=fixtures.get(id);if(!fixture||!fixture.at)
              throw new Error('review focus fixture does not exist: '+id);
            const dx=fixture.at[0]-cameraX,dz=fixture.at[2]-cameraZ,distance=Math.hypot(dx,dz),
              forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz);
            if(forward<=.35||lateral>forward*.58+.12)throw new Error('review focus fixture is outside camera cone: '+id);
            for(let q=.18;q<distance-.28;q+=.12){const progress=q/distance,px=cameraX+dx*progress,pz=cameraZ+dz*progress,
                rayY=cameraY+(sightY(fixture)-cameraY)*progress;
              if(scene.blockers.some(s=>s.top>=rayY-.06&&px>s.x0-.025&&px<s.x1+.025&&pz>s.z0-.025&&pz<s.z1+.025)||
                scene.solids.some(s=>{if(s.fixtureId===id||s.open||!(px>s.x0-.025&&px<s.x1+.025&&pz>s.z0-.025&&pz<s.z1+.025))return false;
                  const obstacle=fixtures.get(s.fixtureId);return !obstacle||topOf(obstacle)>=rayY-.06;})||
                doorLeaves.some(s=>px>s.x0-.025&&px<s.x1+.025&&pz>s.z0-.025&&pz<s.z1+.025))
                throw new Error('review focus fixture is occluded: '+id);}
            evidence.push({id,forward:+forward.toFixed(2),lateral:+lateral.toFixed(2)});
          }
          return evidence;},
        applyReviewCamera=(x,z,yaw,back)=>{const cam=window.__game.CAM,pitch=.28;
          window.__game.P.x=x;window.__game.P.z=z;window.__game.P.yaw=yaw;
          cam.fx=x;cam.fz=z;cam.yaw=cam.tYaw=yaw;cam.pitch=cam.tPitch=pitch;
          cam.dist=cam.tDist=back/Math.cos(pitch);cam.lookY=1.15;cam.slide=cam.rise=0;};
      let reviewRoom=null,reviewAt=null,entryReviewAt=null;
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
          const back=backOptions.find(q=>inside(cameraZone.bounds,x-Math.sin(reviewYaw)*q,z-Math.cos(reviewYaw)*q,.18)&&
              rearClear(x,z,reviewYaw,q))||0,front=frontDepth(x,z,reviewYaw,focusRoom.bounds);
          if(!back)throw new Error('authored ground arrival has no clear camera in '+cameraZone.id);
          if(front<.72)throw new Error('authored ground arrival faces less than 0.72m of '+focusRoom.id);
          if(foregroundDoor(x,z,reviewYaw,back))throw new Error('authored ground arrival has a foreground door leaf');
          const focus=focusEvidence(authored.focusFixtureIds,x,z,reviewYaw,back,1);
          if(authored.body!=='hidden'&&authored.body!=='evidence')
            throw new Error('authored ground arrival requires explicit hidden/evidence body policy');
          bodyVisible=authored.body==='evidence';bodyPolicy=authored.body;
          applyReviewCamera(x,z,reviewYaw,back);
          entryReviewAt={x:+x.toFixed(2),z:+z.toFixed(2),yaw:reviewYaw,inward:0,lateral:0,
            cameraBack:+back.toFixed(2),frontDepth:+front.toFixed(2),entryZone:cameraZone.id,
            focusRoom:focusRoom.id,cameraZone:cameraZone.id,authored:true,
            focusFixtureIds:[...authored.focusFixtureIds],focusEvidence:focus};
          await new Promise(resolve=>setTimeout(resolve,800));
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
        entryReviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw,inward:+chosen.d.toFixed(2),
          lateral:+chosen.lateral.toFixed(2),cameraBack:+chosen.back.toFixed(2),frontDepth:+chosen.front.toFixed(2),
          entryZone:entryZone.id,authored:false};
        await new Promise(resolve=>setTimeout(resolve,800));
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
            !moveClear(x,z)||!back||front<.72)throw new Error('authored upper-floor arrival is not clear in '+entryZone.id);
          if(foregroundDoor(x,z,yaw,back))throw new Error('authored upper-floor arrival has a foreground door leaf');
          candidates.push({x,z,yaw,back,front,move:Math.hypot(x-ox,z-oz),score:1e6,
            focus:focusEvidence(authored.focusFixtureIds,x,z,yaw,back,1)});
        }else for(const [dx,dz] of offsets){const x=ox+dx,z=oz+dz;
          if(!inside(entryZone.bounds,x,z,radius)||!free(x,z)||!moveClear(x,z))continue;
          for(const yaw of yaws){const back=zoneCameraBack(x,z,yaw),front=frontDepth(x,z,yaw,entryZone.bounds);
            if(back&&front>=.72)candidates.push({x,z,yaw,back,front,move:Math.hypot(dx,dz),
              score:front*2.2+back*.35-Math.hypot(dx,dz)*.40});}}
        candidates.sort((a,b)=>b.score-a.score);const chosen=candidates[0];
        if(!chosen)throw new Error('upper-floor arrival camera could not frame '+entryZone.id);
        applyReviewCamera(chosen.x,chosen.z,chosen.yaw,chosen.back);
        entryReviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw:chosen.yaw,inward:0,
          lateral:+chosen.move.toFixed(2),cameraBack:+chosen.back.toFixed(2),entryZone:entryZone.id,
          frontDepth:+chosen.front.toFixed(2),authored:!!authored,
          focusFixtureIds:authored?[...authored.focusFixtureIds]:[],focusEvidence:chosen.focus||[]};
        if(authored){
          if(authored.body!==undefined&&authored.body!=='hidden'&&authored.body!=='evidence')
            throw new Error('authored upper-floor arrival has invalid body policy');
          bodyVisible=authored.body==='evidence';bodyPolicy=bodyVisible?'evidence':'hidden';
        }
        await new Promise(resolve=>setTimeout(resolve,800));
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
          const back=backOptions.find(q=>inside(room.bounds,x-Math.sin(yaw)*q,z-Math.cos(yaw)*q,.18)&&
            rearClear(x,z,yaw,q))||0,front=frontDepth(x,z,yaw,room.bounds);
          if(!back)throw new Error('authored programme pose has no clear rear-camera sightline in '+room.id);
          if(front<.72)throw new Error('authored programme pose faces less than 0.72m of '+room.id);
          if(foregroundDoor(x,z,yaw,back))throw new Error('authored programme pose has a foreground door leaf in '+room.id);
          chosen={x,z,yaw,back,front,authored:true,focusFixtureIds:[...authored.focusFixtureIds],
            focusEvidence:focusEvidence(authored.focusFixtureIds,x,z,yaw,back,2)};
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
        reviewAt={x:+chosen.x.toFixed(2),z:+chosen.z.toFixed(2),yaw:chosen.yaw,
          cameraBack:+chosen.back.toFixed(2),frontDepth:+chosen.front.toFixed(2),authored:chosen.authored,
          focusFixtureIds:chosen.focusFixtureIds||[],focusEvidence:chosen.focusEvidence||[]};
        await new Promise(resolve=>setTimeout(resolve,800));
      }
      window.__game.showBody(bodyVisible);
      await new Promise(resolve=>setTimeout(resolve,350));
      return{ok:true,place:state.place,buildingId:scene.buildingId,level:scene.blueprintFloor&&scene.blueprintFloor.level,
        props:scene.props.length,solids:scene.solids.length,blockers:scene.blockers.length,things:scene.things.length,
        lights:scene.lights.length,zones:scene.zones.length,spawn:scene.spawn,bodyVisible,bodyPolicy,
        reviewRoom,reviewAt,entryReviewAt};
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
    report.push({...view,...result,reviewPrerequisites,file,image});
    writeJson(path.join(OUTPUT_DIR,'report.json'),{
      source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
      complete:false,views:report.length,reviewPrerequisites,report,
      errors:runtimeErrors.slice(0,20),
    });
  }
  const errors=runtimeErrors.filter(text=>!/favicon|autoplay|Download the React/i.test(text));
  const output={source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
    complete:true,views:report.length,reviewPrerequisites,report,errors:errors.slice(0,20)};
  writeJson(path.join(OUTPUT_DIR,'report.json'),output);
  const priorFatal=path.join(OUTPUT_DIR,'fatal-error.json');if(fs.existsSync(priorFatal))fs.rmSync(priorFatal,{force:true});
  console.log(JSON.stringify({views:report.length,buildings:[...new Set(report.map(r=>r.buildingId))],
    floors:[...new Set(report.map(r=>`${r.buildingId}/F${r.level}`))].length,
    maxProps:report.reduce((a,b)=>a.props>b.props?a:b),errors:errors.length},null,2));
  if(errors.length)throw new Error(`runtime errors: ${errors.join(' || ')}`);
  socket.close();
}

main().catch(error=>{
  try{
    fs.mkdirSync(OUTPUT_DIR,{recursive:true});
    writeJson(path.join(OUTPUT_DIR,'fatal-error.json'),{
      source:process.env.GITHUB_SHA||'local',building:MERGE_MODE?'MERGE':activeView&&activeView.building||REVIEW_BUILDING||'ALL',
      view:activeView,message:error&&error.message||String(error),stack:error&&error.stack||String(error),
    });
  }catch(writeError){console.error(`could not persist fatal-error.json: ${writeError.message}`);}
  console.error(error.stack||error.message);process.exitCode=1;
}).finally(async()=>{
  if(chrome){chrome.kill('SIGTERM');await sleep(500);if(chrome.exitCode===null)chrome.kill('SIGKILL');}
  if(profile)try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3});}catch(_){}
});
