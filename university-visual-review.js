'use strict';

// GitHub-hosted university visual review. This script is intentionally independent of the local
// dot-file harness and live-game-boot-check.js: a disposable CI Chrome enters every authored
// university floor, captures a stable frame, and writes machine-readable scene metrics.
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),zlib=require('zlib');

const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
const GAME_URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const OUTPUT_DIR=path.resolve(process.env.UNIVERSITY_REVIEW_DIR||'test-results/university-visuals');
const VIEWPORT={width:1152,height:720,deviceScaleFactor:1,mobile:false};
const CAPTURE_ATTEMPTS=3,CAPTURE_TIMEOUT_MS=25000,CAPTURE_SETTLE_MS=220,CAPTURE_RETRY_MS=450;
const DEBUG_PORT=14000+Math.floor(Math.random()*10000),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'beijing-life-university-review-'));
let chrome,socket,sequence=0;const pending=new Map(),runtimeErrors=[];

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
  // Travel already waits for camera easing and material upload. Encoding three additional full
  // PNGs per view made the software-WebGL runner spend minutes on images we discarded and could
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

async function main(){
  fs.mkdirSync(OUTPUT_DIR,{recursive:true});
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
    const out=[];
    for(const b of CampusInteriors.plan.buildings)for(const f of b.floorsPlan){
      const portal=f.level===1?b.portals.find(p=>p.localSpawn&&CampusInteriors.places[p.placeKey]):null;
      const base={building:b.id,level:f.level,place:CampusInteriors.placeKey(b.id,f.level),portal:portal&&portal.id,
        at:portal?{x:portal.localSpawn[0],z:portal.localSpawn[2],yaw:portal.localSpawn[3]}:null};
      out.push({...base,mode:'entry',suffix:'entry'});
      out.push({...base,mode:'programme',suffix:'programme'});
    }
    const clinic=CampusInteriors.plan.buildings.find(b=>b.id==='B07').portals.find(p=>p.id==='B07/CLINIC');
    out.push({building:'B07',level:1,place:'campus_clinic_f1',portal:clinic.id,
      at:{x:clinic.localSpawn[0],z:clinic.localSpawn[2],yaw:clinic.localSpawn[3]},mode:'entry',suffix:'clinic-entry'});
    return out;
  })()`);

  const report=[];
  for(const view of views){
    console.log(`[${report.length+1}/${views.length}] ${view.building}/F${view.level}/${view.suffix}`);
    const result=await evaluate(`(async()=>{try{
      const at=${JSON.stringify(view.at)},mode=${JSON.stringify(view.mode)};
      window.__game.setPlace(${JSON.stringify(view.place)},at||undefined);
      await new Promise(resolve=>setTimeout(resolve,900));const scene=window.__game.scene(),state=window.__game.state();
      let reviewRoom=null,reviewAt=null;
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
        lights:scene.lights.length,zones:scene.zones.length,spawn:scene.spawn,reviewRoom,reviewAt};
    }catch(error){return{ok:false,error:error.stack||error.message};}})()`,45000);
    if(!result.ok||result.buildingId!==view.building||result.level!==view.level||
      (view.mode==='programme'&&(!result.reviewRoom||!result.reviewAt)))
      throw new Error(`university view failed: ${JSON.stringify({view,result})}`);
    const suffix=view.suffix?`-${view.suffix}`:'',file=`${view.building}-F${view.level}${suffix}.png`;
    const image=await capture(file);
    if(!image.healthy)throw new Error(`${file}: screenshot is blank or visually degenerate: ${JSON.stringify(image)}`);
    report.push({...view,...result,file,image});
    fs.writeFileSync(path.join(OUTPUT_DIR,'report.json'),JSON.stringify({
      source:process.env.GITHUB_SHA||'local',complete:false,views:report.length,report,
      errors:runtimeErrors.slice(0,20),
    },null,2)+'\n');
  }
  const errors=runtimeErrors.filter(text=>!/favicon|autoplay|Download the React/i.test(text));
  const output={source:process.env.GITHUB_SHA||'local',complete:true,views:report.length,report,errors:errors.slice(0,20)};
  fs.writeFileSync(path.join(OUTPUT_DIR,'report.json'),JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({views:report.length,buildings:[...new Set(report.map(r=>r.buildingId))],
    floors:[...new Set(report.map(r=>`${r.buildingId}/F${r.level}`))].length,
    maxProps:report.reduce((a,b)=>a.props>b.props?a:b),errors:errors.length},null,2));
  if(errors.length)throw new Error(`runtime errors: ${errors.join(' || ')}`);
  socket.close();
}

main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;}).finally(async()=>{
  if(chrome){chrome.kill('SIGTERM');await sleep(500);if(chrome.exitCode===null)chrome.kill('SIGKILL');}
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3});}catch(_){}
});
