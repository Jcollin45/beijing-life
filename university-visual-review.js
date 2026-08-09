'use strict';

// GitHub-hosted university visual review. This script is intentionally independent of the local
// dot-file harness and live-game-boot-check.js: a disposable CI Chrome enters every authored
// university floor, captures a stable frame, and writes machine-readable scene metrics.
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),zlib=require('zlib');

const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
const GAME_URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const OUTPUT_ROOT=path.resolve(process.env.UNIVERSITY_REVIEW_DIR||'test-results/university-visuals');
const REVIEW_BUILDING=(process.env.UNIVERSITY_REVIEW_BUILDING||'').trim().toUpperCase();
const MERGE_MODE=process.env.UNIVERSITY_REVIEW_MERGE==='1';
const EXPECTED_SOURCE=(process.env.GITHUB_SHA||'').trim();
const BUILDING_IDS=['B01','B02','B03','B04','B05','B06','B07','B08'];
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

function mergeReviewOutputs(){
  if(REVIEW_BUILDING)throw new Error('UNIVERSITY_REVIEW_MERGE cannot be combined with UNIVERSITY_REVIEW_BUILDING');
  fs.mkdirSync(OUTPUT_ROOT,{recursive:true});
  writeJson(path.join(OUTPUT_ROOT,'report.json'),{
    source:'merge-pending',complete:false,views:0,report:[],errors:[],shards:[],
  });
  const defects=[],fatalErrors=[],shards=[],rows=[],captures=[],sources=new Set(),
    validatedKeys=new Set(),validatedFiles=new Set();
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
      if(shardKeys.has(key)){defects.push(`${building}: duplicate row ${key}`);valid=false;}else shardKeys.add(key);
      if(typeof row.file!=='string'||path.basename(row.file)!==row.file||row.file!==expectedFile){
        defects.push(`${building}: capture filename ${JSON.stringify(row.file)} does not match ${expectedFile}`);continue;
      }
      if(suffix==='programme'&&
        (typeof row.reviewRoom!=='string'||!row.reviewRoom.trim()||!hasFiniteFields(row.reviewAt,['x','z','yaw']))){
        defects.push(`${building}: programme evidence missing reviewRoom or reviewAt for ${key}`);valid=false;
      }
      if((suffix==='clinic-entry'||suffix==='entry'&&rowLevel===1)&&
        (!hasFiniteFields(row.entryReviewAt,['x','z','yaw','inward','lateral','cameraBack'])||
          row.entryReviewAt.inward<0||row.entryReviewAt.cameraBack<=0)){
        defects.push(`${building}: portal entry evidence missing entryReviewAt for ${key}`);valid=false;
      }
      const captureFile=path.join(shardDir,row.file);
      if(!fs.existsSync(captureFile)){defects.push(`${building}: missing ${row.file}`);continue;}
      try{
        const stats=pngStats(captureFile);
        if(!stats.healthy){defects.push(`${building}: unhealthy ${row.file}`);valid=false;}
        if(stats.width!==VIEWPORT.width||stats.height!==VIEWPORT.height){
          defects.push(`${building}: ${row.file} is ${stats.width}x${stats.height}, expected ${VIEWPORT.width}x${VIEWPORT.height}`);
          valid=false;
        }
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
      const at=${JSON.stringify(view.at)},mode=${JSON.stringify(view.mode)};
      window.__game.setPlace(${JSON.stringify(view.place)},at||undefined);
      await new Promise(resolve=>setTimeout(resolve,900));const scene=window.__game.scene(),state=window.__game.state();
      let reviewRoom=null,reviewAt=null,entryReviewAt=null;
      if(mode==='entry'&&at){
        const building=CampusInteriors.plan.buildings.find(b=>b.id===scene.buildingId),bounds=building.localBounds,
          yaw=at.yaw,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),
          radius=.32,ox=window.__game.P.x,oz=window.__game.P.z,
          back=Math.min(3.60,((scene.camera&&scene.camera.dist)||window.__game.CAM.dist||4.4)*
            Math.cos((scene.camera&&scene.camera.pitch)??window.__game.CAM.pitch??.34)-.20),
          free=(x,z)=>x>=bounds[0]+radius&&x<=bounds[1]-radius&&z>=bounds[2]+radius&&z<=bounds[3]-radius&&
            !scene.solids.some(s=>!s.open&&x>s.x0-radius&&x<s.x1+radius&&z>s.z0-radius&&z<s.z1+radius),
          pathFree=(lateral,d)=>{const sign=Math.sign(lateral),span=Math.abs(lateral);
            for(let q=0;q<=span;q+=.12)if(!free(ox+rx*sign*q,oz+rz*sign*q))return false;
            const lx=ox+rx*lateral,lz=oz+rz*lateral;
            for(let q=0;q<=d;q+=.12)if(!free(lx+fx*q,lz+fz*q))return false;return true;},
          cameraFree=(x,z)=>{const rx=x-fx*back,rz=z-fz*back;
            if(rx<bounds[0]+.18||rx>bounds[1]-.18||rz<bounds[2]+.18||rz>bounds[3]-.18)return false;
            const blocked=(px,pz)=>scene.blockers.some(s=>px>s.x0-.08&&px<s.x1+.08&&pz>s.z0-.08&&pz<s.z1+.08);
            for(let q=0;q<=back;q+=.12)if(blocked(x-fx*q,z-fz*q))return false;return true;};
        let chosen=null;const limit=Math.hypot(bounds[1]-bounds[0],bounds[3]-bounds[2]),
          lanes=[0,-.36,.36,-.72,.72,-1.08,1.08,-1.44,1.44];
        for(const lateral of lanes){
          const lx=ox+rx*lateral,lz=oz+rz*lateral;
          for(let d=0;d<=limit;d+=.12){const x=lx+fx*d,z=lz+fz*d;
            if(pathFree(lateral,d)&&free(x,z)&&cameraFree(x,z)){chosen=[x,z,d,lateral];break;}}
          if(chosen)break;
        }
        if(!chosen)throw new Error('entry camera could not find clear inward framing for '+scene.buildingId);
        const [x,z,d,lateral]=chosen;window.__game.P.x=x;window.__game.P.z=z;window.__game.P.yaw=yaw;
        window.__game.CAM.fx=x;window.__game.CAM.fz=z;window.__game.CAM.yaw=window.__game.CAM.tYaw=yaw;
        window.__game.CAM.slide=window.__game.CAM.rise=0;
        entryReviewAt={x:+x.toFixed(2),z:+z.toFixed(2),yaw,inward:+d.toFixed(2),
          lateral:+lateral.toFixed(2),cameraBack:+back.toFixed(2)};
        await new Promise(resolve=>setTimeout(resolve,650));
      }
      if(mode==='programme'){
        const rooms=[...(scene.blueprintFloor.rooms||[])].filter(r=>r.finish!=='service')
          .sort((a,b)=>(b.bounds[1]-b.bounds[0])*(b.bounds[3]-b.bounds[2])-
            (a.bounds[1]-a.bounds[0])*(a.bounds[3]-a.bounds[2]));
        const room=rooms[0]||scene.blueprintFloor.rooms[0],b=room.bounds,
          wide=b[1]-b[0]>=b[3]-b[2],ideal=wide?[b[0]+(b[1]-b[0])*.28,(b[2]+b[3])/2]:[(b[0]+b[1])/2,b[2]+(b[3]-b[2])*.28],
          yaw=wide?Math.PI/2:0,free=(x,z)=>!scene.solids.some(s=>!s.open&&x>s.x0-.30&&x<s.x1+.30&&z>s.z0-.30&&z<s.z1+.30);
        const candidates=[];
        for(let z=b[2]+.42;z<=b[3]-.42;z+=.20)for(let x=b[0]+.42;x<=b[1]-.42;x+=.20)
          if(free(x,z))candidates.push([x,z,(x-ideal[0])**2+(z-ideal[1])**2]);
        candidates.sort((a,b)=>a[2]-b[2]);
        if(candidates.length){
          const [x,z]=candidates[0];window.__game.P.x=x;window.__game.P.z=z;window.__game.P.yaw=yaw;
          window.__game.CAM.yaw=yaw;reviewRoom=room.id;reviewAt={x:+x.toFixed(2),z:+z.toFixed(2),yaw};
          await new Promise(resolve=>setTimeout(resolve,650));
        }
      }
      return{ok:true,place:state.place,buildingId:scene.buildingId,level:scene.blueprintFloor&&scene.blueprintFloor.level,
        props:scene.props.length,solids:scene.solids.length,blockers:scene.blockers.length,things:scene.things.length,
        lights:scene.lights.length,zones:scene.zones.length,spawn:scene.spawn,reviewRoom,reviewAt,entryReviewAt};
    }catch(error){return{ok:false,error:error.stack||error.message};}})()`,45000);
    if(!result.ok||result.buildingId!==view.building||result.level!==view.level||
      (view.mode==='programme'&&(!result.reviewRoom||!result.reviewAt))||
      (view.mode==='entry'&&view.at&&!result.entryReviewAt))
      throw new Error(`university view failed: ${JSON.stringify({view,result})}`);
    const suffix=view.suffix?`-${view.suffix}`:'',file=`${view.building}-F${view.level}${suffix}.png`;
    const image=await capture(file);
    if(!image.healthy)throw new Error(`${file}: screenshot is blank or visually degenerate: ${JSON.stringify(image)}`);
    report.push({...view,...result,file,image});
    writeJson(path.join(OUTPUT_DIR,'report.json'),{
      source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
      complete:false,views:report.length,report,
      errors:runtimeErrors.slice(0,20),
    });
  }
  const errors=runtimeErrors.filter(text=>!/favicon|autoplay|Download the React/i.test(text));
  const output={source:process.env.GITHUB_SHA||'local',building:REVIEW_BUILDING||null,expectedViews:views.length,
    complete:true,views:report.length,report,errors:errors.slice(0,20)};
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
