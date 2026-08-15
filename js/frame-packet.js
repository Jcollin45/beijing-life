'use strict';

// Renderer-neutral ownership for one resolved colour-pass command stream. The game still renders
// through WebGL today; this module is the boundary that lets a later backend prepare and validate
// the same immutable frame before either API submits it. It deliberately knows nothing about the
// DOM, WebGL, WebGPU, places, or asset loaders.
const FramePacket = (() => {
  const VERSION = 1, INSTANCE_FLOATS = 26;
  // The largest authored frame is comfortably below this. Keeping three sealed frames plus the
  // reusable arena bounded here prevents an authority experiment from retaining >100 MiB of
  // instance copies before meshes and textures are counted.
  const MAX_INSTANCES = 65536, MAX_FLOATS = MAX_INSTANCES * INSTANCE_FLOATS;
  const MAX_COMMANDS = 8192, MAX_PENDING_PACKETS = 3;
  const MAX_STRING = 128;
  const FORBIDDEN_KEYS = new Set(['__proto__','prototype','constructor']);

  const records = new Map();
  let arena = null, direct = null, used = 0, commands = [], header = null;
  let state = 'idle', reason = '', frameId = 0, latestId = 0;
  let frames = 0, seals = 0, aborts = 0, recoveries = 0, peakFloats = 0;
  let claims = 0, claimErrors = 0, releases = 0, consumes = 0, drops = 0;

  // The browser normally supplies same-realm objects, while the pure gate deliberately hands the
  // packet values across a VM boundary. A plain object's prototype is itself the root object
  // prototype in either case; branded host objects (Date, WebGLTexture, DOM nodes) have another
  // prototype level and remain rejected.
  const plain = value => {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || Object.getPrototypeOf(proto) === null;
  };
  const safeString = value => typeof value === 'string' && value.length > 0 &&
    value.length <= MAX_STRING;

  function freezeValue(value) {
    if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return value;
    for (const child of Object.values(value)) freezeValue(child);
    return Object.freeze(value);
  }

  const HEADER_KEYS=new Set(['vp','clear','eye','sun','sky','ground','skyA','skyB','indoor',
    'bulb','bulbOn','lights','white','expose','fog','deckY','glyphAssist','time','weather',
    'leaf','features']);
  const SUN_KEYS=new Set(['dir','color','amount']);
  const LIGHT_KEYS=new Set(['count','positions','colors','radii']);
  const FOG_KEYS=new Set(['near','density','color']);
  const FEATURE_KEYS=new Set(['shadow','post','ao','weatherParticles','transparent','additive']);
  function fields(value,allowed,label,optional=false){
    if(value===undefined&&optional)return Object.create(null);
    if(!plain(value))throw new Error('invalid '+label);
    const out=Object.create(null);
    for(const key of Object.keys(value)){
      if(!allowed.has(key)||FORBIDDEN_KEYS.has(key))throw new Error('invalid '+label+' field');
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||!Object.prototype.hasOwnProperty.call(descriptor,'value'))
        throw new Error('invalid '+label+' field');
      out[key]=descriptor.value;
    }
    return out;
  }
  function f32(value,fallback,label,min=-Infinity,max=Infinity){
    const number=value===undefined?fallback:Number(value),packed=Math.fround(number);
    if(!Number.isFinite(number)||!Number.isFinite(packed)||packed<min||packed>max)
      throw new Error('invalid '+label);
    return packed;
  }
  function bool(value,fallback,label){
    if(value===undefined)return fallback;
    if(typeof value!=='boolean')throw new Error('invalid '+label);
    return value;
  }
  function vector(value,length,fallback,label){
    const supplied=value!==undefined;
    value=supplied?value:fallback;
    const approved=Array.isArray(value)||ArrayBuffer.isView(value);
    if(!approved||!Number.isSafeInteger(Number(value.length))||value.length<length)
      throw new Error('invalid '+label);
    const out=new Array(length);
    for(let i=0;i<length;i++){
      const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
      if(!descriptor||!Object.prototype.hasOwnProperty.call(descriptor,'value'))
        throw new Error('invalid '+label);
      out[i]=f32(descriptor.value,0,label);
    }
    return Object.freeze(out);
  }
  function normalizeHeader(input){
    input=fields(input,HEADER_KEYS,'frame header');
    const out=Object.create(null),sun=fields(input.sun,SUN_KEYS,'sun',true),
      lights=fields(input.lights,LIGHT_KEYS,'lights',true),
      fog=fields(input.fog,FOG_KEYS,'fog',true),
      features=fields(input.features,FEATURE_KEYS,'features',true);
    out.vp=vector(input.vp,16,null,'view projection');
    out.clear=vector(input.clear,3,null,'clear colour');
    out.eye=vector(input.eye,3,[0,0,0],'eye');
    const sky=vector(input.sky,3,[.35,.40,.48],'sky');
    out.sun=freezeValue(Object.assign(Object.create(null),{
      dir:vector(sun.dir,3,[0,.7,.2],'sun direction'),
      color:vector(sun.color,3,[1,.95,.85],'sun colour'),
      amount:f32(sun.amount,0,'sun amount',0,16)}));
    out.sky=sky;out.ground=vector(input.ground,3,[.18,.14,.10],'ground');
    out.skyA=vector(input.skyA,3,sky,'sky zenith');
    out.skyB=vector(input.skyB,3,sky,'sky horizon');
    out.indoor=bool(input.indoor,false,'indoor flag');
    out.bulb=vector(input.bulb,3,[0,2,0],'bulb');
    out.bulbOn=f32(input.bulbOn,0,'bulb amount',0,16);
    const lightCount=f32(lights.count,0,'light count',0,8);
    if(!Number.isInteger(lightCount))throw new Error('invalid light count');
    const lightTriples=new Array(lightCount*3).fill(0),lightScalars=new Array(lightCount).fill(0);
    out.lights=freezeValue(Object.assign(Object.create(null),{count:lightCount,
      positions:vector(lights.positions,lightCount*3,lightTriples,'light positions'),
      colors:vector(lights.colors,lightCount*3,lightTriples,'light colours'),
      radii:vector(lights.radii,lightCount,lightScalars,'light radii')}));
    out.white=vector(input.white,3,[1,1,1],'white balance');
    out.expose=f32(input.expose,1,'exposure',0,16);
    out.fog=freezeValue(Object.assign(Object.create(null),{
      near:f32(fog.near,0,'fog near',0),density:f32(fog.density,0,'fog density',0),
      color:vector(fog.color,3,out.clear,'fog colour')}));
    out.deckY=f32(input.deckY,0,'deck height');
    out.glyphAssist=bool(input.glyphAssist,false,'glyph assist flag');
    out.time=f32(input.time,0,'frame time');
    out.weather=vector(input.weather,3,[0,0,0],'weather');
    out.leaf=vector(input.leaf,3,[1,1,1],'leaf tint');
    out.features=freezeValue(Object.assign(Object.create(null),{
      shadow:bool(features.shadow,false,'shadow feature'),
      post:bool(features.post,false,'post feature'),ao:bool(features.ao,false,'ao feature'),
      weatherParticles:bool(features.weatherParticles,false,'weather-particle feature'),
      transparent:bool(features.transparent,false,'transparent feature'),
      additive:bool(features.additive,false,'additive feature')}));
    return out;
  }

  function stop(why) {
    if(state==='stopped')return false;
    try{reason=String(why||'packet-invalid').slice(0,160);}
    catch(_){reason='packet-invalid';}
    state = 'aborted'; aborts++;
    return false;
  }

  function grow(need) {
    if (!Number.isSafeInteger(need) || need < 0 || need > MAX_FLOATS)
      throw new Error('packet arena limit exceeded');
    if (arena && arena.length >= need) return;
    let size = arena ? arena.length : INSTANCE_FLOATS * 256;
    while (size < need) size = Math.min(MAX_FLOATS, size * 2);
    if (size < need) throw new Error('packet arena limit exceeded');
    const next = new Float32Array(size);
    if (arena && used) next.set(arena.subarray(0, used));
    arena = next;
  }

  function begin(input) {
    if (state === 'open') aborts++;
    const hadFailure = state === 'aborted';
    if (state === 'stopped') return false;
    used = 0; commands = []; header = null; reason = '';
    state = 'open'; frameId++; frames++;
    try {
      header = normalizeHeader(input);
      header.version = VERSION; header.frameId = frameId;
      freezeValue(header);
      if (hadFailure) recoveries++;
      return frameId;
    } catch (err) { return stop(err && err.message || 'invalid-frame-header'); }
  }

  const MATERIAL_KEYS = new Set(['mode','round','bevel','doubleSided','textureId',
    'materialId','normalId','matScale','matAmount','normalAmount','depthWrite',
    'blend','cull','gloss','alpha','glow','rect']);
  const finite = (value,fallback,label,min=-Infinity,max=Infinity) =>
    f32(value,fallback,label,min,max);
  const resource = (value,label) => {
    if(value===undefined||value===null)return null;
    if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return value;
    throw new Error('invalid '+label);
  };
  function material(input) {
    input=fields(input,MATERIAL_KEYS,'packet material',true);
    const mode=finite(input.mode,0,'material mode',0,31);
    if(!Number.isInteger(mode))throw new Error('invalid material mode');
    const doubleSided=bool(input.doubleSided,false,'double-sided flag'),cull=input.cull===undefined
      ?(doubleSided?'none':'back'):input.cull;
    if(cull!=='back'&&cull!=='none'||doubleSided!==(cull==='none'))
      throw new Error('invalid material cull');
    const blend=input.blend===undefined?'opaque':input.blend;
    if(blend!=='opaque'&&blend!=='alpha'&&blend!=='additive')
      throw new Error('invalid material blend');
    const out=Object.create(null);
    Object.assign(out,{pass:'color',mode,
      round:finite(input.round,0,'material round',0,64),
      bevel:finite(input.bevel,0,'material bevel',0,64),doubleSided,cull,blend,
      depthWrite:bool(input.depthWrite,true,'depth-write flag'),
      textureId:resource(input.textureId,'texture id'),
      materialId:resource(input.materialId,'material id'),
      normalId:resource(input.normalId,'normal id'),
      matScale:finite(input.matScale,1,'material scale',1e-6,1024),
      matAmount:finite(input.matAmount,.7,'material amount',0,16),
      normalAmount:finite(input.normalAmount,1,'normal amount',0,16)});
    return Object.freeze(out);
  }

  function batch(mesh, data, count, inputMaterial) {
    if (state !== 'open') return -1;
    try {
      count = Number(count);
      if (!safeString(mesh) || !Number.isSafeInteger(count) || count < 1 ||
          count > MAX_INSTANCES || !data || data.length < count * INSTANCE_FLOATS)
        throw new Error('invalid instance command');
      if(commands.length>=MAX_COMMANDS)throw new Error('packet command limit exceeded');
      const resolvedMaterial=material(inputMaterial);
      if(resolvedMaterial.blend==='additive'&&!header.features.additive)
        throw new Error('undeclared additive command');
      if(resolvedMaterial.blend==='alpha'&&!header.features.transparent)
        throw new Error('undeclared transparent command');
      const floats = count * INSTANCE_FLOATS, firstFloat = used;
      grow(firstFloat + floats);
      let translucent=false;
      for (let i = 0; i < floats; i++) {
        const value = Number(data[i]);
        if (!Number.isFinite(value)) throw new Error('non-finite instance data');
        const packed = Math.fround(value);
        if (!Number.isFinite(packed)) throw new Error('instance data exceeds float32');
        arena[firstFloat + i] = packed;
        if(i%INSTANCE_FLOATS===20){
          if(packed<0||packed>1)throw new Error('invalid instance alpha');
          if(packed<1)translucent=true;
        }
      }
      // Contact-shadow coverage is generated by the shader at the quad edge. It remains an alpha
      // command when every authored instance alpha is one, unlike ordinary straight-alpha modes.
      const proceduralAlpha=resolvedMaterial.mode===2;
      if((translucent||proceduralAlpha)&&resolvedMaterial.blend==='opaque')
        throw new Error('undeclared transparent command');
      if(!translucent&&!proceduralAlpha&&resolvedMaterial.blend==='alpha')
        throw new Error('empty transparent command');
      const command = Object.freeze({kind:'instances',sequence:commands.length,mesh,
        firstFloat,count,direct:false,material:resolvedMaterial});
      commands.push(command); used += floats; peakFloats = Math.max(peakFloats, used);
      return command.sequence;
    } catch (err) { stop(err && err.message || 'invalid instance command'); return -1; }
  }

  function draw(mesh, model, color, inputMaterial = {}) {
    if (state !== 'open') return -1;
    try {
      const directMaterial=fields(inputMaterial,MATERIAL_KEYS,'packet material',true);
      if (!model || model.length < 16 || !color || color.length < 3)
        throw new Error('invalid direct command');
      if (!direct) direct = new Float32Array(INSTANCE_FLOATS);
      direct.fill(0);
      for (let i = 0; i < 16; i++) direct[i] = Number(model[i]);
      for (let i = 0; i < 3; i++) direct[16 + i] = Number(color[i]);
      direct[19]=f32(directMaterial.gloss,.12,'direct gloss');
      direct[20]=f32(directMaterial.alpha,1,'direct alpha',0,1);
      direct[21]=f32(directMaterial.glow,0,'direct glow');
      if (directMaterial.rect !== undefined) {
        const rect=vector(directMaterial.rect,4,null,'direct glyph rectangle');
        for (let i = 0; i < 4; i++) direct[22 + i] = rect[i];
      }
      const index = batch(mesh, direct, 1, directMaterial);
      if (index >= 0) commands[index] = Object.freeze({...commands[index],direct:true});
      return index;
    } catch (err) { stop(err && err.message || 'invalid direct command'); return -1; }
  }

  function seal(expectedFrameId = frameId) {
    if (state !== 'open') { stop('packet-not-open'); return null; }
    if (expectedFrameId !== frameId) { stop('stale-frame-id'); return null; }
    if(records.size>=MAX_PENDING_PACKETS){stop('pending packet limit exceeded');return null;}
    state = 'sealed'; seals++;
    Object.freeze(commands);
    // Keep the bytes private and detach them from the reusable build arena. A consumer receives a
    // copy through `read`, so neither an accidental write nor the next frame's arena reuse can
    // alter a packet that another backend is still preparing.
    const owned = arena ? arena.slice(0, used) : new Float32Array(0);
    const read = (firstFloat = 0, floatCount) => {
      try{firstFloat=Number(firstFloat);
        floatCount=floatCount===undefined?owned.length-firstFloat:Number(floatCount);}
      catch(_){return null;}
      if (!Number.isSafeInteger(firstFloat) || !Number.isSafeInteger(floatCount) ||
          firstFloat < 0 || floatCount < 0 || firstFloat + floatCount > owned.length)
        return null;
      return owned.slice(firstFloat, firstFloat + floatCount);
    };
    const packet = Object.freeze({version:VERSION,frameId,header,commands,
      instances:used / INSTANCE_FLOATS,floats:used,
      read});
    records.set(frameId,{packet,state:'sealed',backend:''});latestId=frameId;
    return packet;
  }

  function abort(why) { return stop(why || 'packet-aborted'); }
  const backendName=value=>value==='webgpu'||value==='webgl2'?value:null;
  const packetId=value=>{try{value=Number(value);}catch(_){return 0;}
    return Number.isSafeInteger(value)&&value>0?value:0;};
  function claim(id,backend){
    id=packetId(id);backend=backendName(backend);const record=records.get(id);
    if(!backend||!record||record.state!=='sealed'){claimErrors++;return null;}
    record.state='claimed';record.backend=backend;claims++;
    if(id===latestId&&state!=='open')state='claimed';
    return record.packet;
  }
  function release(id,backend){
    id=packetId(id);const record=records.get(id);
    if(!record||record.state!=='claimed'||record.backend!==backendName(backend))return false;
    record.state='sealed';record.backend='';releases++;
    if(id===latestId&&state!=='open')state='sealed';return true;
  }
  function consume(id,backend){
    id=packetId(id);const record=records.get(id);
    if(!record||record.state!=='claimed'||record.backend!==backendName(backend))return false;
    records.delete(id);consumes++;
    if(id===latestId){latestId=records.size?Math.max(...records.keys()):0;
      if(state!=='open')state='consumed';}
    return true;
  }
  function drop(id,why){
    id=packetId(id);const record=records.get(id);
    if(!record||record.state!=='sealed')return false;
    let dropReason;
    try{dropReason=String(why||'packet-dropped').slice(0,160);}catch(_){return false;}
    records.delete(id);drops++;
    reason=dropReason;
    if(id===latestId)latestId=records.size?Math.max(...records.keys()):0;
    if(state!=='open')state='aborted';return true;
  }
  function current(id=latestId) { const record=records.get(packetId(id));return record?record.packet:null; }
  function trim(){if(state==='open')return false;arena=null;direct=null;return true;}
  function dispose(){records.clear();arena=null;direct=null;used=0;commands=[];header=null;
    latestId=0;state='stopped';reason='disposed';return true;}
  function status() {
    const currentRecord=records.get(latestId),packet=currentRecord&&currentRecord.packet;
    const shownFloats=state==='open'?used:packet?packet.floats:0;
    return {version:VERSION,state,frameId,latestId,reason,
      commands:state==='open'?commands.length:packet?packet.commands.length:0,
      instances:shownFloats / INSTANCE_FLOATS,floats:shownFloats,capacity:arena ? arena.length : 0,
      peakFloats,pending:records.size,claimed:[...records.values()].filter(r=>r.state==='claimed').length,
      frames,seals,aborts,recoveries,claims,claimErrors,releases,consumes,drops};
  }

  return {VERSION,INSTANCE_FLOATS,begin,batch,draw,seal,abort,current,claim,release,consume,
    drop,trim,dispose,status};
})();
