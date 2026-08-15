// Opt-in WebGPU comparison renderer.
//
// This is deliberately not the production renderer yet. `?renderer=webgpu` mirrors the exact
// post-cull instance stream used by WebGL into a second canvas and shows that result on the right
// half of the screen. WebGL keeps drawing the complete game underneath, so an unsupported browser,
// an async setup failure, or a lost WebGPU device removes only the comparison layer.
const WebGPUPreview = (() => {
  const params = typeof location === 'undefined' || typeof URLSearchParams === 'undefined'
    ? null : new URLSearchParams(location.search);
  const requested = !!params && params.get('renderer') === 'webgpu';
  // Packet recording deliberately has a second opt-in. It copies the already post-cull instance
  // stream so it can prove ownership/order before either backend is allowed to become primary;
  // the ordinary comparison URL should not pay that CPU/memory cost yet.
  const packetRecordRequested = requested && params.get('framePacket') === 'record';
  const fullView = !!params && params.get('webgpuView') === 'full';
  const INSTANCE_FLOATS = 26, INSTANCE_BYTES = INSTANCE_FLOATS * 4;
  const TEXTURE_BUDGET = 64 * 1024 * 1024, MAX_TEXTURE_DIMENSION = 8192;
  // Authored people are streamed independently from the permanent environment catalogue. Keeping
  // both pools separate means a crowded room cannot evict the walls around it (or vice versa).
  const SKIN_TEXTURE_BUDGET = 16 * 1024 * 1024, SKIN_MESH_BUDGET = 6 * 1024 * 1024,
    SKIN_PALETTE_BUDGET = 4 * 1024 * 1024,
    MAX_SKIN_BONES = 72, MAX_SKIN_INSTANCES = 32, MAX_SKIN_PARTS = 9;
  const GLYPH_CELL=72,GLYPH_GUTTER=5,GLYPH_PITCH=82,GLYPH_COLS=16,
    GLYPH_CAPACITY=240,GLYPH_ROWS=Math.ceil(GLYPH_CAPACITY/GLYPH_COLS),
    GLYPH_WIDTH=GLYPH_COLS*GLYPH_PITCH,GLYPH_HEIGHT=GLYPH_ROWS*GLYPH_PITCH;
  // Packet recording covers both glyph roles and the real authored scene peak (757 cells). Its
  // private RGBA8 cache is separate from the 240-cell shared legacy preview atlas and grows
  // only to the exact packet row count, up to this explicit record-mode ceiling.
  const PACKET_GLYPH_CAPACITY=768,PACKET_GLYPH_ROWS=48,
    PACKET_GLYPH_MAX_HEIGHT=PACKET_GLYPH_ROWS*GLYPH_PITCH;
  // Every field is a vec4 (or a matrix/array made from vec4s), so the JS and WGSL layouts stay
  // identical without implementation-specific uniform padding: 33 vec4s, 528 bytes.
  const FRAME_FLOATS = 132, FRAME_BYTES = FRAME_FLOATS * 4;
  const pendingMeshes = new Map(), meshes = new Map(),
    pendingSkinMeshes = new Map(), skinMeshes = new Map();
  // Authored-character resources are admitted as an asset-generation transaction. Each tier owns
  // exact mesh/texture sets; identical texture keys are reference-shared by that owner's LODs. The
  // reverse maps keep hot draw lookup unchanged while eviction/disposal operate on whole owners.
  const skinOwners=new Map(),skinMeshOwners=new Map(),skinTextureOwners=new Map(),
    skinWanted=new Map(),skinWantedPlans=new Map();
  // Ordinary surfaces use renderer-neutral positive ids exclusively. Authored-character keys stay
  // in their isolated owner/tier system for now; keeping the maps separate prevents a migration
  // from creating a mixed WebGLTexture/id key domain.
  const pendingTextures = new Map(), textures = new Map(),
    pendingSkinTextures = new Map(), skinTextures = new Map(), pbrMaterials = new Set(),
    tilingMaterials = new Set();
  let state = requested ? 'pending' : 'disabled', reason = '', message = '';
  let adapter = null, adapterInfo = null, device = null, context = null, format = '';
  let canvas = null, badge = null, divider = null, pipeline = null, bevelPipeline = null,
    domePipeline = null,
    mode0AlphaPipeline = null, mode0BevelAlphaPipeline = null,
    mode1Pipeline = null, mode1AlphaPipeline = null, mode2Pipeline = null,
    mode5Pipeline = null, mode8Pipeline = null, mode4Pipeline = null,
    mode6Pipeline = null, mode6BevelPipeline = null, mode9Pipeline = null,
    mode10Pipeline = null, mode13Pipeline = null,
    mode7Pipeline = null, mode7AlphaPipeline = null, mode7BevelPipeline = null,
    mode7BevelAlphaPipeline = null, mode11Pipeline = null,
    mode14Pipeline = null,
    foliagePipeline = null,
    glyphPipeline = null, glyphMode1Pipeline = null, glyphMode1AlphaPipeline = null,
    texturedPipeline = null, pbrPipeline = null, tilingPipeline = null,
    tilingBevelPipeline = null, tilingMode0ColorPipeline = null,
    tilingMode0BevelColorPipeline = null,
    tilingMode1Pipeline = null, tilingMode1AlphaPipeline = null,
    tilingMode3Pipeline = null, tilingMode3BevelPipeline = null,
    tilingMode4Pipeline = null, tilingMode4AlphaPipeline = null,
    tilingMode4BevelPipeline = null, tilingMode4ColorPipeline = null,
    tilingMode6Pipeline = null, tilingMode6BevelPipeline = null,
    tilingMode7Pipeline = null, tilingMode7BevelPipeline = null,
    tilingMode9Pipeline = null, tilingMode9ColorPipeline = null,
    tilingMode10Pipeline = null, tilingMode11Pipeline = null,
    tilingMode14Pipeline = null, tilingMode15Pipeline = null,
    skinPipeline = null, skinDoublePipeline = null,
    frameLayout = null, surfaceLayout = null, pbrLayout = null,
    tilingLayout = null, tilingNormalLayout = null, skinPaletteLayout = null,
    uniformBuffer = null, bindGroup = null,
    surfaceClamp = null, surfaceRepeat = null, mipPipeline = null, mipSampler = null,
    instanceBuffer = null, instanceCapacity = 0,
    skinInstanceBuffer = null, skinInstanceCapacity = 0,
    skinPaletteBuffer = null, skinPaletteCapacity = 0, skinPaletteBindGroup = null,
    skinInstanceUsedBytes = 0, skinPaletteUsedBytes = 0, depth = null,
    depthW = 0, depthH = 0, startPromise = null, generation = 0, layerShown = false;
  let glyphSource=null,glyphSourceWidth=0,glyphSourceHeight=0,glyphScene='',
    glyphCanvas=null,glyphContext=null,glyphTexture=null,glyphBindGroup=null,
    glyphBytes=0,glyphDirty=false,glyphSourceVersion=0,glyphEpoch=0;
  const glyphCells=new Map();
  let frameOpen = false, staging = new Float32Array(INSTANCE_FLOATS * 2048), used = 0,
    draws = [], skinGroups = [], clear = [0.08, 0.10, 0.13], size = [0, 0];
  let ordinaryCoverageBlocked=false,ordinaryExpectedDraws=0,ordinaryFallbackReason='',
    ordinaryFailedSequence=-1,ordinaryFrameStats={draws:0,instances:0};
  // A packet canary owns at most one private, CPU-complete preparation. The token handed across
  // the GL seam contains no GPU handles or bytes; the complete plan remains inside this module and
  // is discarded immediately while WebGL is authoritative. `ordinaryRevision` invalidates a
  // future retained token before an ordinary mesh/texture generation can be destroyed underneath.
  let preparedPacketToken=null,preparedPacketPlan=null,packetGlyphCache=null,ordinaryRevision=0;
  const packetPrepareTotals={attempts:0,successes:0,rejections:0,discards:0};
  const packetGlyphTotals={hits:0,builds:0,destroys:0};
  let packetPrepareLast={outcome:'idle',frameId:0,reason:'',failedSequence:-1,
    commands:0,instances:0,floats:0,meshes:0,resources:0,materials:0,
    glyphCommands:0,glyphInstances:0,glyphCells:0,glyphPositive:0,glyphNegative:0,
    glyphRewriteHash:0};
  let skinCoverageBlocked=false,skinExpectedGroups=0,skinFallbackReason='',
    skinFrameEpoch=0,skinPreflightBlocked=false,skinPreflightMeshBytes=0,
    skinPreflightTextureBytes=0;
  const directData = new Float32Array(INSTANCE_FLOATS);
  const frameData = new Float32Array(FRAME_FLOATS);
  // Lazily allocated only after an opt-in frame accepts a complete authored character.
  let skinInstanceStaging=null,skinPaletteStaging=null;
  const stats = { frames:0, submits:0, draws:0, instances:0, errors:0,
    textureRejections:0,glyphUploads:0,glyphDraws:0,glyphInstances:0,glyphRejections:0,
    glyphFiltered:0,glyphSceneResets:0,directDraws:0,ordinaryCoverageFallbacks:0,
    skinTextureRejections:0,skinMeshRejections:0,skinGroupRejections:0,
    skinCoverageFallbacks:0,skinBundleCommits:0,skinBundleRejections:0,
    skinBundleRollbacks:0,skinOwnerEvictions:0,skinTierEvictions:0 };
  let skinFrameStats={groups:0,parts:0,instances:0,directGroups:0,directParts:0,
    directInstances:0,instancedGroups:0,instancedParts:0,instancedInstances:0};
  const skinTotalStats={groups:0,parts:0,instances:0,directGroups:0,directParts:0,
    directInstances:0,instancedGroups:0,instancedParts:0,instancedInstances:0};

  const WGSL = `
struct Light {
  posRad: vec4<f32>,
  color: vec4<f32>,
};
struct Frame {
  vp: mat4x4<f32>,
  sun: vec4<f32>,
  sunColor: vec4<f32>,
  sky: vec4<f32>,
  ground: vec4<f32>,
  eyeIndoor: vec4<f32>,
  bulb: vec4<f32>,
  whiteExpose: vec4<f32>,
  fog: vec4<f32>,
  fogParams: vec4<f32>,
  skyA: vec4<f32>,
  skyB: vec4<f32>,
  weatherTime: vec4<f32>,
  leaf: vec4<f32>,
  lights: array<Light, 8>,
};
@group(0) @binding(0) var<uniform> frame: Frame;

struct VertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) m0: vec4<f32>,
  @location(4) m1: vec4<f32>,
  @location(5) m2: vec4<f32>,
  @location(6) m3: vec4<f32>,
  @location(7) color: vec3<f32>,
  @location(8) param: vec3<f32>,
  @location(9) aux: vec4<f32>,
};
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) color: vec3<f32>,
  @location(2) gloss: f32,
  @location(3) world: vec3<f32>,
  @location(4) uv: vec2<f32>,
  @location(5) glow: f32,
  @location(6) @interpolate(flat) tiling: vec4<f32>,
  @location(7) local: vec3<f32>,
  @location(8) @interpolate(flat) scaleBevel: vec4<f32>,
  @location(9) @interpolate(flat) glyphRect: vec4<f32>,
};

@group(1) @binding(0) var surfaceSampler: sampler;
@group(1) @binding(1) var surfaceMap: texture_2d<f32>;
@group(1) @binding(2) var normalMap: texture_2d<f32>;
@group(1) @binding(3) var armMap: texture_2d<f32>;
struct PbrParams { factors: vec4<f32>, };
@group(1) @binding(4) var<uniform> pbr: PbrParams;
struct TilingParams { factors: vec4<f32>, };
@group(1) @binding(5) var<uniform> tiling: TilingParams;

fn vertexOut(input: VertexIn, foliage: bool) -> VertexOut {
  let model = mat4x4<f32>(input.m0, input.m1, input.m2, input.m3);
  let b0 = input.m0.xyz;
  let b1 = input.m1.xyz;
  let b2 = input.m2.xyz;
  let scale2 = max(vec3<f32>(dot(b0,b0), dot(b1,b1), dot(b2,b2)), vec3<f32>(1e-8));
  var localPosition = input.position;
  var localNormal = input.normal;
  if (foliage) {
    let phase = input.m3.x * 0.9 + input.m3.z * 1.3;
    let gust = frame.weatherTime.z;
    let time = frame.weatherTime.w * 0.00085 * (1.0 + gust * 1.5);
    let wind = vec2<f32>(
      sin(time + phase) * 0.62 + sin(time * 2.7 + phase * 1.7) * 0.38,
      cos(time * 0.85 + phase) * 0.62 + cos(time * 3.1 + phase * 2.3) * 0.38);
    let scale = sqrt(scale2);
    let sway = wind * (0.055 + gust * 0.16) /
      max(0.35, length(vec2<f32>(scale.x, scale.z)) * 0.5);
    localPosition = vec3<f32>(localPosition.x + sway.x, localPosition.y,
      localPosition.z + sway.y);
  }
  // WebGL applies rounding after wind and rebuilds from the authored position. Preserve that
  // ordering: a rounded foliage primitive keeps its rounded silhouette and intentionally does
  // not sway, while the ordinary canopy meshes above retain the complete wind displacement.
  if (input.aux.z <= 0.0 && input.aux.x > 0.0) {
    let scale = sqrt(scale2);
    let radius = min(vec3<f32>(input.aux.x) / max(scale, vec3<f32>(1e-3)), vec3<f32>(0.34));
    localPosition = input.position * (vec3<f32>(0.5) - radius) + input.normal * radius;
    localNormal = normalize(input.normal / max(radius, vec3<f32>(1e-4)));
  }
  let world = model * vec4<f32>(localPosition, 1.0);
  let normalModel = mat3x3<f32>(b0 / scale2.x, b1 / scale2.y, b2 / scale2.z);
  var clip = frame.vp * world;
  // The shared camera matrix is OpenGL (-w..w depth); WebGPU clip depth is 0..w.
  clip.z = (clip.z + clip.w) * 0.5;
  var out: VertexOut;
  out.position = clip;
  out.normal = normalize(normalModel * localNormal);
  out.color = input.color;
  out.gloss = input.param.x;
  out.world = world.xyz;
  out.uv = input.uv;
  out.glow = input.param.z;
  out.tiling = vec4<f32>(input.aux.y,input.aux.w,max(-input.aux.z,0.0),input.param.y);
  out.local = localPosition;
  out.scaleBevel = vec4<f32>(sqrt(scale2),max(-input.aux.x,0.0));
  out.glyphRect = input.aux;
  return out;
}
@vertex fn vs(input: VertexIn) -> VertexOut { return vertexOut(input, false); }
@vertex fn vsFoliage(input: VertexIn) -> VertexOut { return vertexOut(input, true); }

fn srgbToLinear(c0: vec3<f32>) -> vec3<f32> {
  let c = max(c0, vec3<f32>(0.0));
  let lo = c / 12.92;
  let hi = pow((c + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4));
  return select(hi, lo, c <= vec3<f32>(0.04045));
}
fn linearToSrgb(c0: vec3<f32>) -> vec3<f32> {
  let c = max(c0, vec3<f32>(0.0));
  let lo = c * 12.92;
  let hi = 1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}
fn hash2(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p,vec2<f32>(127.1,311.7)))*43758.5453);
}
fn noise2(p0: vec2<f32>) -> f32 {
  let cell=floor(p0);
  var f=fract(p0);
  f=f*f*(vec2<f32>(3.0)-2.0*f);
  return mix(mix(hash2(cell),hash2(cell+vec2<f32>(1.0,0.0)),f.x),
    mix(hash2(cell+vec2<f32>(0.0,1.0)),hash2(cell+vec2<f32>(1.0,1.0)),f.x),f.y);
}
fn tonemap(c0: vec3<f32>) -> vec3<f32> {
  let c = max(c0 * frame.whiteExpose.xyz, vec3<f32>(0.0));
  var y = (c * (2.51 * c + vec3<f32>(0.03))) /
    (c * (2.43 * c + vec3<f32>(0.59)) + vec3<f32>(0.14));
  y = max(y, vec3<f32>(0.0)) * 0.965;
  let peak = max(y.r, max(y.g, y.b));
  let lum = dot(y, vec3<f32>(0.2126, 0.7152, 0.0722));
  y = mix(y, vec3<f32>(lum), smoothstep(0.78, 1.02, peak) * 0.12);
  return clamp(y, vec3<f32>(0.0), vec3<f32>(0.985));
}
fn haze(c: vec3<f32>, p: vec3<f32>) -> vec3<f32> {
  if (frame.fog.w <= 0.0) { return c; }
  let ray = p - frame.eyeIndoor.xyz;
  let viewD = length(ray);
  let d = max(0.0, viewD - frame.fogParams.x);
  let lift = smoothstep(-0.08, 0.32, ray.y / max(viewD, 0.001));
  let fogTop = mix(frame.fog.xyz, frame.sky.xyz, 0.72);
  let fogColor = mix(frame.fog.xyz, fogTop, lift);
  let density = mix(1.08, 0.86, lift);
  return mix(c, fogColor, 1.0 - exp(-d * frame.fog.w * density));
}

// The shipped glTFs carry UVs but no tangent attribute. Recover the same tangent frame as the
// WebGL path from fragment derivatives, avoiding a second tangent-generation copy of every mesh.
fn perturbUV(N: vec3<f32>, pos: vec3<f32>, uv: vec2<f32>, tangentNormal: vec3<f32>) -> vec3<f32> {
  let dp1 = dpdx(pos);
  let dp2 = dpdy(pos);
  let du1 = dpdx(uv);
  let du2 = dpdy(uv);
  let dp2p = cross(dp2, N);
  let dp1p = cross(N, dp1);
  let T = dp2p * du1.x + dp1p * du2.x;
  let B = dp2p * du1.y + dp1p * du2.y;
  let inv = inverseSqrt(max(dot(T,T), dot(B,B)) + 1e-8);
  return normalize(mat3x3<f32>(T * inv, B * inv, N) * tangentNormal);
}

fn shadeMaterial(input: VertexOut, base: vec3<f32>, surfaceNormal: vec3<f32>, materialAO: f32,
         materialRoughness: f32, metalness: f32, pbrOn: f32, bevel: f32, wetK: f32,
         foliage: bool) -> vec4<f32> {
  let n = normalize(surfaceNormal);
  let eye = frame.eyeIndoor.xyz;
  let view = normalize(eye - input.world);
  let indoor = frame.eyeIndoor.w;
  let sunDir = normalize(frame.sun.xyz);
  var sunFacing = max(dot(n, sunDir), 0.0);
  if (indoor < 0.5) { sunFacing = max(dot(n, sunDir) + 0.34, 0.0) / 1.34; }
  let sunColor = frame.sunColor.xyz * frame.sun.w;
  let up = clamp(n.y, 0.0, 1.0);
  let down = clamp(-n.y, 0.0, 1.0);
  var ambient = frame.sky.xyz * up * 1.14 + frame.ground.xyz * down * 1.14
    + mix(frame.sky.xyz, frame.ground.xyz, 0.5) * (1.0 - up - down) * 1.02;
  if (indoor < 0.5) { ambient *= 2.1; }
  ambient *= materialAO;
  let diffuseBase = base * (1.0 - metalness * 0.86);
  var lit = diffuseBase * (ambient + sunColor * sunFacing);

  let gloss = max(clamp(1.0 - materialRoughness, 0.0, 1.0), wetK);
  let shininess = mix(12.0, 190.0, gloss);
  let dielectricF0 = vec3<f32>(0.025 + gloss * 0.075);
  let specF0 = mix(dielectricF0, max(base, vec3<f32>(0.025)), metalness);
  var localSpec = vec3<f32>(0.0);

  let bulbVec = frame.bulb.xyz - input.world;
  let bulbDist = length(bulbVec);
  let bulbDir = bulbVec / max(bulbDist, 0.001);
  let bulbFall = (2.8 / (1.0 + bulbDist * bulbDist)) * frame.bulb.w;
  let bulbFacing = max(dot(n, bulbDir), 0.0);
  let bulbColor = vec3<f32>(1.0, 0.75, 0.43);
  lit += diffuseBase * bulbColor * bulbFacing * bulbFall;

  for (var i = 0u; i < 8u; i++) {
    if (f32(i) >= frame.ground.w) { break; }
    let posRad = frame.lights[i].posRad;
    let delta = posRad.xyz - input.world;
    let dist = length(delta);
    let dir = delta / max(dist, 0.001);
    let radius = max(posRad.w, 0.001);
    let att = (1.0 / (1.0 + (dist * dist) / (radius * radius)))
      * (1.0 - smoothstep(radius * 0.55, radius * 2.4, dist));
    let facing = max(dot(n, dir), 0.0);
    let color = frame.lights[i].color.xyz;
    lit += diffuseBase * color * facing * att;
    if (gloss > 0.14 && facing > 0.0 && att > 0.003) {
      let halfDir = normalize(dir + view);
      let nh = max(dot(n, halfDir), 0.0);
      let vh = max(dot(view, halfDir), 0.0);
      let fresnel = specF0 + (vec3<f32>(1.0) - specF0) * pow(1.0 - vh, 5.0);
      let lobe = pow(nh, shininess) * mix(0.25, 1.20, gloss) * facing;
      localSpec += color * fresnel * lobe * att;
    }
  }
  lit += localSpec;

  let sunHalf = normalize(sunDir + view);
  let bulbHalf = normalize(bulbDir + view);
  let directSpec = mix(vec3<f32>(0.020 + gloss * 0.30), max(base, vec3<f32>(0.025)), metalness);
  let directLobe = pow(max(dot(n, sunHalf), 0.0), shininess) * sunFacing
    + pow(max(dot(n, bulbHalf), 0.0), shininess) * bulbFacing * bulbFall * 0.6;
  lit += directSpec * directLobe * mix(sunColor, bulbColor, 0.35);

  let rim = pow(1.0 - max(dot(n, view), 0.0), 3.4);
  lit += base * rim * materialAO * (0.14 + 0.55 * max(frame.sun.w * 0.35, 0.22))
    * mix(frame.sky.xyz, frame.sunColor.xyz, 0.45) * (0.35 + 0.65 * up);
  if (pbrOn > 0.5) {
    let envRay = reflect(-view, n);
    let envColor = mix(frame.ground.xyz, frame.sky.xyz,
      clamp(envRay.y * 0.5 + 0.5, 0.0, 1.0));
    let envF = specF0 + (vec3<f32>(1.0) - specF0) * rim;
    let envGain = mix(0.045, 0.20, gloss) * materialAO;
    lit += envColor * envF * envGain;
  }
  if (wetK > 0.002) {
    let reflected = reflect(-view, n);
    let skyReflection = srgbToLinear(mix(frame.skyB.xyz, frame.skyA.xyz,
      clamp(reflected.y * 0.7 + 0.3, 0.0, 1.0)));
    let fresnel = 0.10 + 0.90 * pow(1.0 - max(dot(n, view), 0.0), 4.0);
    lit = mix(lit, lit * 0.72 + skyReflection * 0.55, wetK * fresnel);
  }
  if (bevel > 0.0) {
    let scale=input.scaleBevel.xyz;
    let width=min(bevel,0.34*min(scale.x,min(scale.y,scale.z)));
    let edge=(vec3<f32>(0.5)-abs(input.local))*scale;
    let nearest=min(edge.x,min(edge.y,edge.z));
    let farthest=max(edge.x,max(edge.y,edge.z));
    let distance=edge.x+edge.y+edge.z-nearest-farthest;
    let crease=1.0-smoothstep(0.0,width,distance);
    lit*=mix(1.0,0.76,crease*0.82);
    lit+=base*(1.0-smoothstep(width,width*2.1,distance))*0.14*
      (0.4+0.6*max(n.y,0.0));
  }
  lit += base * input.glow * 2.4;
  lit *= mix(1.06, 1.0, smoothstep(0.4, 3.0, length(eye - input.world)));
  lit *= frame.whiteExpose.w;
  var outColor = haze(linearToSrgb(tonemap(max(lit, vec3<f32>(0.0)))), input.world);
  if (foliage) {
    let through = pow(max(0.0, dot(view, -sunDir)), 2.6);
    outColor += linearToSrgb(base * frame.sunColor.xyz) * through * 0.42 * frame.sun.w;
    if (frame.bulb.w > 0.5) {
      let bulbThrough = pow(max(0.0, dot(view, -bulbDir)), 2.2);
      outColor += linearToSrgb(base * vec3<f32>(1.00, 0.93, 0.80)) * bulbThrough * 0.30 /
        (1.0 + bulbDist * bulbDist * 0.55);
    }
  }
  return vec4<f32>(outColor, 1.0);
}
fn shade(input: VertexOut, base: vec3<f32>, surfaceNormal: vec3<f32>, materialAO: f32,
         materialRoughness: f32, metalness: f32, pbrOn: f32, bevel: f32) -> vec4<f32> {
  return shadeMaterial(input,base,surfaceNormal,materialAO,materialRoughness,metalness,pbrOn,
    bevel,0.0,false);
}
@fragment fn fs(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input, srgbToLinear(input.color), input.normal, 1.0,
    clamp(1.0 - input.gloss, 0.055, 1.0), 0.0, 0.0, 0.0);
}
@fragment fn fsMode0Alpha(input: VertexOut) -> @location(0) vec4<f32> {
  let shaded=shade(input,srgbToLinear(input.color),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
  return vec4<f32>(shaded.rgb,input.tiling.w);
}
@fragment fn fsBevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input, srgbToLinear(input.color), input.normal, 1.0,
    clamp(1.0 - input.gloss, 0.055, 1.0), 0.0, 0.0, input.scaleBevel.w);
}
@fragment fn fsMode0BevelAlpha(input: VertexOut) -> @location(0) vec4<f32> {
  let shaded=shade(input,srgbToLinear(input.color),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
  return vec4<f32>(shaded.rgb,input.tiling.w);
}
fn wovenBase(input: VertexOut, base: vec3<f32>) -> vec3<f32> {
  let weave=noise2(input.world.xy*72.0)*0.5+noise2(input.world.zy*79.0)*0.5;
  return base*(0.91+weave*0.13);
}
fn woodBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let bands=noise2(vec2<f32>((input.local.x+input.local.z)*34.0,input.local.y*5.0));
  let pores=noise2(vec2<f32>(input.world.x*23.0+input.world.z*17.0,
    (input.world.y-frame.fogParams.z)*31.0));
  base*=0.84+bands*0.20+pores*0.06;
  return base;
}
@fragment fn fsMode6(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,woodBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsMode6Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,woodBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsMode7(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,wovenBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsMode7Alpha(input: VertexOut) -> @location(0) vec4<f32> {
  let shaded=shade(input,wovenBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
  return vec4<f32>(shaded.rgb,input.tiling.w);
}
@fragment fn fsMode7Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,wovenBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsMode7BevelAlpha(input: VertexOut) -> @location(0) vec4<f32> {
  let shaded=shade(input,wovenBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
  return vec4<f32>(shaded.rgb,input.tiling.w);
}
fn mode1Base(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  if(input.gloss>0.6){
    let gn=normalize(input.normal);
    let view=normalize(frame.eyeIndoor.xyz-input.world);
    let fresnel=pow(1.0-max(dot(gn,view),0.0),3.5);
    let reflected=reflect(-view,gn);
    let sky=srgbToLinear(mix(frame.skyB.xyz,frame.skyA.xyz,
      clamp(reflected.y*0.6+0.4,0.0,1.0)));
    let day=clamp(frame.sun.w,0.0,1.0);
    let environment=mix(1.0,0.25,frame.eyeIndoor.w);
    base=base*(1.0-0.16*day*environment)
      +sky*(0.10+0.55*fresnel)*day*environment;
    base*=0.95+0.10*clamp(input.world.y*0.16,0.0,1.0);
  }
  return base;
}
@fragment fn fsMode1(input: VertexOut) -> @location(0) vec4<f32> {
  let emissive = mode1Base(input,srgbToLinear(input.color)) * (1.0 + input.glow * 3.0);
  let outColor = haze(linearToSrgb(tonemap(emissive)), input.world);
  return vec4<f32>(outColor, input.tiling.w);
}
@fragment fn fsMode2(input: VertexOut) -> @location(0) vec4<f32> {
  let q=abs(input.uv-vec2<f32>(0.5))*2.0;
  let f=(1.0-smoothstep(0.45,1.0,q.x))*(1.0-smoothstep(0.45,1.0,q.y));
  return vec4<f32>(0.0,0.0,0.0,input.tiling.w*f);
}
@fragment fn fsMode5(input: VertexOut) -> @location(0) vec4<f32> {
  let q=abs(input.uv-vec2<f32>(0.5))*2.0;
  let f=(1.0-smoothstep(0.35,1.0,q.x))*(1.0-smoothstep(0.25,1.0,q.y));
  return vec4<f32>(input.color*f*input.tiling.w,1.0);
}
@fragment fn fsMode8(input: VertexOut) -> @location(0) vec4<f32> {
  let q=abs(input.uv-vec2<f32>(0.5))*2.0;
  var f=(1.0-smoothstep(0.70,1.0,q.x))*(1.0-smoothstep(0.58,1.0,q.y));
  f*=1.0-0.42*(1.0-smoothstep(0.010,0.055,abs(input.uv.x-0.5)));
  return vec4<f32>(input.color*f*input.tiling.w,1.0);
}
@fragment fn fsMode12(input: VertexOut) -> @location(0) vec4<f32> {
  let d=normalize(input.world-frame.eyeIndoor.xyz);
  var c=mix(frame.skyB.xyz,frame.skyA.xyz,pow(clamp(d.y,0.0,1.0),0.55));
  let band=exp(-max(d.y,0.0)*6.5);
  c=mix(c,mix(frame.skyB.xyz,frame.sunColor.xyz,0.30),band*0.60);
  let s=normalize(frame.sun.xyz);
  let sd=max(dot(d,s),0.0);
  c+=frame.sunColor.xyz*pow(sd,1500.0)*2.4*frame.sun.w;
  c+=frame.sunColor.xyz*pow(sd,8.0)*0.14*frame.sun.w;
  let night=1.0-smoothstep(0.06,0.52,frame.sun.w);
  if(night>0.002){
    let sph=vec2<f32>(atan2(d.z,d.x)*0.15915494,
      asin(clamp(d.y,-1.0,1.0))*0.31830989);
    let g=sph*232.0;
    let id=floor(g);
    let fr=fract(g);
    let h=hash2(id);
    if(h>0.9715){
      let at=vec2<f32>(hash2(id+vec2<f32>(3.71)),hash2(id+vec2<f32>(9.13)));
      let star=1.0-smoothstep(0.0,0.14,length(fr-at));
      let tw=0.62+0.38*sin(frame.weatherTime.w*0.0021+h*91.0);
      let tint=mix(vec3<f32>(0.80,0.87,1.0),vec3<f32>(1.0,0.92,0.80),
        hash2(id+vec2<f32>(21.5)));
      let lo=smoothstep(0.02,0.30,d.y);
      let mag=star*tw*lo*night*(0.35+(h-0.9715)*20.0);
      c+=tint*mag;
    }
    let md=normalize(vec3<f32>(-s.x,abs(s.y)*0.55+0.42,-s.z));
    let mc=max(dot(d,md),0.0);
    let disc=smoothstep(0.99955,0.99975,mc);
    let across=normalize(md-s*dot(md,s));
    let phase=0.42+0.58*smoothstep(-0.0009,0.0011,dot(d-md,across));
    let moon=vec3<f32>(0.94,0.94,0.90)*(0.55+0.45*phase);
    c+=moon*disc*night*1.35;
    c+=vec3<f32>(0.72,0.76,0.86)*pow(mc,1400.0)*0.30*night;
  }
  let q=d.xz/max(abs(d.y)+0.14,0.14)*0.72+
    vec2<f32>(frame.weatherTime.w*0.004,0.0);
  var cl=noise2(q)*0.52+noise2(q*2.3)*0.29+noise2(q*5.3)*0.19;
  cl=smoothstep(0.52,0.92,cl)*smoothstep(0.06,0.36,d.y);
  let cloud=mix(vec3<f32>(0.90,0.90,0.92),frame.sunColor.xyz,0.40)*
    (0.34+0.70*frame.sun.w);
  c=mix(c,cloud,cl*0.78);
  c=c/(vec3<f32>(1.0)+max(c-vec3<f32>(1.0),vec3<f32>(0.0)));
  let grain=(hash2(input.position.xy)-0.5)/255.0;
  return vec4<f32>(c+vec3<f32>(grain),1.0);
}
struct GlyphSample { cov: f32, ink: f32, edge: f32, bright: f32, };
fn glyphSample(input: VertexOut) -> GlyphSample {
  let role=select(0.0,1.0,input.glyphRect.w<0.0);
  let distance=length(frame.eyeIndoor.xyz-input.world);
  let stable=frame.fogParams.y*role*smoothstep(7.0,9.0,distance)*
    (1.0-smoothstep(16.0,21.0,distance));
  let span=vec2<f32>(input.glyphRect.z,abs(input.glyphRect.w));
  let mask=textureSampleBias(surfaceMap,surfaceSampler,
    input.glyphRect.xy+input.uv*span,-0.28);
  var ink=smoothstep(mix(0.14,0.10,stable),mix(0.58,0.52,stable),mask.r);
  let broad=smoothstep(0.08,0.56,mask.g);
  ink=max(ink,broad*stable*0.16);
  let bright=smoothstep(0.16,0.68,
    dot(srgbToLinear(input.color),vec3<f32>(0.2126,0.7152,0.0722)));
  let edge=max(0.0,broad-ink)*mix(0.055,0.32,bright);
  return GlyphSample(max(ink,edge),ink,edge,bright);
}
fn glyphBase(input: VertexOut,g: GlyphSample) -> vec3<f32> {
  let base=srgbToLinear(input.color);
  let share=clamp(g.ink/max(g.cov,0.001),0.0,1.0);
  return mix(base*mix(0.10,0.025,g.bright),base,share);
}
@fragment fn fsGlyph(input: VertexOut) -> @location(0) vec4<f32> {
  let g=glyphSample(input);if(g.cov<0.012){discard;}
  let shaded=shade(input,glyphBase(input,g),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
  return vec4<f32>(shaded.rgb,g.cov);
}
@fragment fn fsGlyphMode1(input: VertexOut) -> @location(0) vec4<f32> {
  let g=glyphSample(input);if(g.cov<0.012){discard;}
  let emissive=glyphBase(input,g)*(1.0+input.glow*3.0);
  return vec4<f32>(haze(linearToSrgb(tonemap(emissive)),input.world),g.cov);
}
@fragment fn fsGlyphMode1Alpha(input: VertexOut) -> @location(0) vec4<f32> {
  let g=glyphSample(input);if(g.cov<0.012){discard;}
  let emissive=glyphBase(input,g)*(1.0+input.glow*3.0);
  return vec4<f32>(haze(linearToSrgb(tonemap(emissive)),input.world),
    g.cov*input.tiling.w);
}
fn tilingBase(input: VertexOut) -> vec3<f32> {
  let n = abs(normalize(input.normal));
  let weight = n / max(n.x + n.y + n.z, 1e-4);
  let scale = max(input.tiling.x, 1e-3);
  let sampled = srgbToLinear(textureSample(surfaceMap,surfaceSampler,input.world.zy/scale).rgb)*weight.x
    + srgbToLinear(textureSample(surfaceMap,surfaceSampler,input.world.xz/scale).rgb)*weight.y
    + srgbToLinear(textureSample(surfaceMap,surfaceSampler,input.world.xy/scale).rgb)*weight.z;
  let detail = mix(vec3<f32>(1.0),sampled/max(tiling.factors.x,0.015),input.tiling.y);
  return srgbToLinear(input.color)*detail;
}
fn tilingSurfaceNormal(input: VertexOut) -> vec3<f32> {
  let n=normalize(input.normal);
  let weight=abs(n)/max(abs(n.x)+abs(n.y)+abs(n.z),1e-4);
  let scale=max(input.tiling.x,1e-3);
  let tx=textureSample(normalMap,surfaceSampler,input.world.zy/scale).xyz*2.0-1.0;
  let ty=textureSample(normalMap,surfaceSampler,input.world.xz/scale).xyz*2.0-1.0;
  let tz=textureSample(normalMap,surfaceSampler,input.world.xy/scale).xyz*2.0-1.0;
  let add=vec3<f32>(0.0,tx.y,tx.x)*weight.x+vec3<f32>(ty.x,0.0,ty.y)*weight.y
    +vec3<f32>(tz.x,tz.y,0.0)*weight.z;
  return normalize(n+add*input.tiling.z);
}
fn floorboardBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let plank=floor(input.world.z*3.1);
  let longGrain=noise2(vec2<f32>(input.world.x*18.0,plank*5.7));
  let fineGrain=noise2(vec2<f32>(input.world.x*56.0,input.world.z*2.1));
  base*=0.79+longGrain*0.25+fineGrain*0.08;
  let seam=smoothstep(0.0,0.05,abs(fract(input.world.z*3.1)-0.5)-0.435);
  let butt=smoothstep(0.0,0.05,
    abs(fract(input.world.x*0.42+plank*0.37)-0.5)-0.47);
  base*=1.0-max(seam,butt)*0.43;
  return base;
}
fn plasterBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let relY=input.world.y-frame.fogParams.z;
  let pw=vec2<f32>(input.world.x,relY);
  let pz=vec2<f32>(input.world.z,relY);
  let n=noise2(pw*34.0)*0.5+noise2(pz*61.0)*0.5;
  base*=0.95+n*0.10;
  base*=0.90+0.14*smoothstep(0.0,2.4,relY);
  return base;
}
fn pavingBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let grid=input.world.xz/0.62;
  let cell=abs(fract(grid)-vec2<f32>(0.5));
  let jointX=smoothstep(0.435,0.496,cell.x);
  let jointZ=smoothstep(0.435,0.496,cell.y);
  base*=0.80+0.40*hash2(floor(grid)+vec2<f32>(0.5));
  base*=0.90+noise2(input.world.xz*3.1)*0.17;
  base*=mix(1.0,0.56,max(jointX,jointZ));
  return base;
}
fn asphaltBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let aggregate=noise2(input.world.xz*30.0)*0.55+
    noise2(input.world.xz*110.0)*0.45;
  base*=0.80+aggregate*0.34;
  base*=0.94+0.12*noise2(input.world.xz*vec2<f32>(0.5,3.0));
  return base;
}
fn roofTileBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let across=input.local.x*input.scaleBevel.x;
  let down=input.local.z*input.scaleBevel.z;
  let tile=fract(across/0.24);
  base*=0.94+0.13*sin(tile*6.2832);
  base*=1.0-0.20*(1.0-smoothstep(0.0,0.16,min(tile,1.0-tile)));
  base*=0.93+0.14*hash2(vec2<f32>(floor(across/0.24),3.0));
  base*=1.0-0.11*(1.0-smoothstep(0.0,0.05,
    abs(fract(down*2.6)-0.5)-0.40));
  base*=0.93+0.12*noise2(vec2<f32>(across*2.2,down*2.8));
  return base;
}
fn paintedRenderBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  base*=0.90+noise2(input.world.xy*1.7)*0.16+noise2(input.world.xz*9.0)*0.07;
  base*=mix(0.80,1.0,smoothstep(0.0,1.8,input.world.y));
  return base;
}
fn greyBrickBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let course=floor(input.world.y/0.076);
  let stagger=course-floor(course/2.0)*2.0;
  let brickU=(input.world.x+input.world.z)/0.245+stagger*0.5;
  let cell=vec2<f32>(abs(fract(brickU)-0.5),
    abs(fract(input.world.y/0.076)-0.5));
  let face=(1.0-smoothstep(0.40,0.485,cell.x))*
    (1.0-smoothstep(0.32,0.455,cell.y));
  base*=0.82+0.32*hash2(vec2<f32>(floor(brickU),course));
  base=mix(base*1.34,base,face);
  base*=0.93+0.13*noise2(input.world.xy*5.0)+
    0.06*noise2(input.world.xz*21.0);
  base*=1.0-0.10*noise2(vec2<f32>(
    (input.world.x+input.world.z)*9.0,input.world.y*0.4));
  return base;
}
fn foliageBase(input: VertexOut, base0: vec3<f32>) -> vec3<f32> {
  var base=base0;
  let geometricNormal=normalize(input.normal);
  let mass=noise2(input.world.xz*1.7+vec2<f32>(input.world.y*0.9));
  let leafNoise=noise2(input.world.xz*21.0)*0.6+
    noise2(vec2<f32>(input.world.y*26.0,input.world.x*19.0))*0.4;
  base*=0.74+mass*0.30+leafNoise*0.22;
  let who=hash2(floor(input.world.xz*0.35+vec2<f32>(0.5)));
  base*=mix(vec3<f32>(0.88,1.05,0.82),vec3<f32>(1.10,0.98,0.78),who);
  base*=mix(frame.leaf.xyz,frame.leaf.xyz*vec3<f32>(1.06,0.94,0.86),who);
  base*=0.62+0.46*smoothstep(-0.7,0.9,geometricNormal.y);
  return base;
}
struct WeatherSurface { base: vec3<f32>, wetK: f32, };
fn weatherSurface(input: VertexOut, base0: vec3<f32>, foliageSnow: bool) -> WeatherSurface {
  var base=base0;
  var wetK=0.0;
  let geometricNormal=normalize(input.normal);
  if(frame.eyeIndoor.w<0.5&&(frame.weatherTime.x>0.002||frame.weatherTime.y>0.002)){
    let up=smoothstep(0.30,0.86,geometricNormal.y);
    let pool=smoothstep(0.42,0.78,noise2(input.world.xz*0.42)*0.7+
      noise2(input.world.xz*1.9)*0.3);
    let wet=frame.weatherTime.x*mix(0.45,1.0,up)*(0.62+0.55*pool);
    base*=mix(1.0,0.58,wet);
    wetK=wet*0.86;
    var blotch=1.0;
    if(foliageSnow){
      blotch=0.35+0.65*noise2(
        input.world.xz*6.0+vec2<f32>(input.world.y*3.0));
    }
    let lay=frame.weatherTime.y*smoothstep(0.42,0.92,geometricNormal.y)*blotch;
    base=mix(base,vec3<f32>(0.82,0.85,0.92),lay);
    wetK=mix(wetK,0.10,lay);
  }
  return WeatherSurface(base,wetK);
}
fn foliageSurface(input: VertexOut, base0: vec3<f32>) -> WeatherSurface {
  return weatherSurface(input,foliageBase(input,base0),true);
}
fn foliageShade(input: VertexOut, surface: WeatherSurface,
                 surfaceNormal: vec3<f32>) -> vec4<f32> {
  return shadeMaterial(input,surface.base,surfaceNormal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0,surface.wetK,true);
}
@fragment fn fsMode15(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=foliageSurface(input,srgbToLinear(input.color));
  let surfaceNormal=input.normal;
  return foliageShade(input,surface,surfaceNormal);
}
@fragment fn fsTilingMode15(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=foliageSurface(input,tilingBase(input));
  let surfaceNormal=tilingSurfaceNormal(input);
  return foliageShade(input,surface,surfaceNormal);
}
fn weatherShade(input: VertexOut, surface: WeatherSurface,
                surfaceNormal: vec3<f32>) -> vec4<f32> {
  return shadeMaterial(input,surface.base,surfaceNormal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0,surface.wetK,false);
}
@fragment fn fsMode14(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,
    paintedRenderBase(input,srgbToLinear(input.color)),false);
  return weatherShade(input,surface,input.normal);
}
@fragment fn fsTilingMode14(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,paintedRenderBase(input,tilingBase(input)),false);
  return weatherShade(input,surface,tilingSurfaceNormal(input));
}
@fragment fn fsMode11(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,
    greyBrickBase(input,srgbToLinear(input.color)),false);
  let surfaceNormal=input.normal;
  return weatherShade(input,surface,surfaceNormal);
}
@fragment fn fsTilingMode11(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,greyBrickBase(input,tilingBase(input)),false);
  let surfaceNormal=tilingSurfaceNormal(input);
  return weatherShade(input,surface,surfaceNormal);
}
@fragment fn fsMode4(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,plasterBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode3(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,floorboardBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode3Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,floorboardBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsTilingMode4(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,plasterBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode4Alpha(input: VertexOut) -> @location(0) vec4<f32> {
  let shaded=shade(input,plasterBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
  return vec4<f32>(shaded.rgb,input.tiling.w);
}
@fragment fn fsTilingMode4Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,plasterBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsTilingMode4Color(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,plasterBase(input,tilingBase(input)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode6(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,woodBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode6Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,woodBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsMode9(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,pavingBase(input,srgbToLinear(input.color)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode9(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,pavingBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode9Color(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,pavingBase(input,tilingBase(input)),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsMode10(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,
    asphaltBase(input,srgbToLinear(input.color)),false);
  return weatherShade(input,surface,input.normal);
}
@fragment fn fsTilingMode10(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,asphaltBase(input,tilingBase(input)),false);
  return weatherShade(input,surface,tilingSurfaceNormal(input));
}
@fragment fn fsMode13(input: VertexOut) -> @location(0) vec4<f32> {
  let surface=weatherSurface(input,
    roofTileBase(input,srgbToLinear(input.color)),false);
  return weatherShade(input,surface,input.normal);
}
@fragment fn fsTiling(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,tilingBase(input),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingBevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,tilingBase(input),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsTilingMode0Color(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,tilingBase(input),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode0BevelColor(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,tilingBase(input),input.normal,1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsTilingMode7(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,wovenBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,0.0);
}
@fragment fn fsTilingMode7Bevel(input: VertexOut) -> @location(0) vec4<f32> {
  return shade(input,wovenBase(input,tilingBase(input)),tilingSurfaceNormal(input),1.0,
    clamp(1.0-input.gloss,0.055,1.0),0.0,0.0,input.scaleBevel.w);
}
@fragment fn fsTilingMode1(input: VertexOut) -> @location(0) vec4<f32> {
  let emissive=mode1Base(input,tilingBase(input))*(1.0+input.glow*3.0);
  let outColor=haze(linearToSrgb(tonemap(emissive)),input.world);
  return vec4<f32>(outColor,input.tiling.w);
}
@fragment fn fsTextured(input: VertexOut) -> @location(0) vec4<f32> {
  let albedo = textureSample(surfaceMap, surfaceSampler, input.uv).rgb;
  return shade(input, srgbToLinear(input.color) * srgbToLinear(albedo), input.normal, 1.0,
    clamp(1.0 - input.gloss, 0.055, 1.0), 0.0, 0.0, 0.0);
}
@fragment fn fsPbr(input: VertexOut) -> @location(0) vec4<f32> {
  let albedo = textureSample(surfaceMap, surfaceSampler, input.uv).rgb;
  var tangentNormal = textureSample(normalMap, surfaceSampler, input.uv).xyz * 2.0 - 1.0;
  tangentNormal = vec3<f32>(tangentNormal.xy * pbr.factors.w, tangentNormal.z);
  let normal = perturbUV(normalize(input.normal), input.world, input.uv, normalize(tangentNormal));
  let arm = textureSample(armMap, surfaceSampler, input.uv).rgb;
  var ao = 1.0;
  if (pbr.factors.z > 1.5) { ao = mix(1.0, arm.r, 0.72); }
  let roughness = clamp(arm.g * pbr.factors.x, 0.055, 1.0);
  let metalness = clamp(arm.b * pbr.factors.y, 0.0, 1.0);
  return shade(input, srgbToLinear(input.color) * srgbToLinear(albedo), normal, ao,
    roughness, metalness, 1.0, 0.0);
}

// Authored characters retain the renderer's existing 26-float instance record at locations
// 5..11. aux.x names the person's fixed 72-matrix row in the one frame palette upload; aux.y is
// alpha cutoff and aux.z is the reviewed material mode (ordinary zero or skin nineteen).
struct SkinVertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) joints: vec4<f32>,
  @location(4) weights: vec4<f32>,
  @location(5) m0: vec4<f32>,
  @location(6) m1: vec4<f32>,
  @location(7) m2: vec4<f32>,
  @location(8) m3: vec4<f32>,
  @location(9) color: vec3<f32>,
  @location(10) param: vec3<f32>,
  @location(11) aux: vec4<f32>,
};
struct SkinVertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) world: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec3<f32>,
  @location(4) param: vec3<f32>,
  @location(5) @interpolate(flat) aux: vec4<f32>,
};
@group(2) @binding(0) var<storage, read> skinPalette: array<mat4x4<f32>>;

fn skinBone(person: u32, joint: f32) -> mat4x4<f32> {
  return skinPalette[person * 72u + u32(joint + 0.5)];
}
@vertex fn vsSkin(input: SkinVertexIn) -> SkinVertexOut {
  let person = u32(input.aux.x + 0.5);
  let sk = skinBone(person,input.joints.x) * input.weights.x
    + skinBone(person,input.joints.y) * input.weights.y
    + skinBone(person,input.joints.z) * input.weights.z
    + skinBone(person,input.joints.w) * input.weights.w;
  let skinnedPosition = sk * vec4<f32>(input.position,1.0);
  let skinnedNormal = mat3x3<f32>(sk[0].xyz,sk[1].xyz,sk[2].xyz) * input.normal;
  let model = mat4x4<f32>(input.m0,input.m1,input.m2,input.m3);
  let b0=input.m0.xyz; let b1=input.m1.xyz; let b2=input.m2.xyz;
  let scale2=max(vec3<f32>(dot(b0,b0),dot(b1,b1),dot(b2,b2)),vec3<f32>(1e-8));
  let normalModel=mat3x3<f32>(b0/scale2.x,b1/scale2.y,b2/scale2.z);
  let world=model*skinnedPosition;
  var clip=frame.vp*world;
  clip.z=(clip.z+clip.w)*0.5;
  var out: SkinVertexOut;
  out.position=clip; out.normal=normalize(normalModel*skinnedNormal); out.world=world.xyz;
  out.uv=input.uv; out.color=input.color; out.param=input.param; out.aux=input.aux;
  return out;
}

fn skinWrap(n: vec3<f32>, lightDir: vec3<f32>, enabled: bool) -> vec3<f32> {
  let ordinary=vec3<f32>(max(dot(n,lightDir),0.0));
  let width=vec3<f32>(0.28,0.12,0.06);
  let wrapped=max(vec3<f32>(dot(n,lightDir))+width,vec3<f32>(0.0))/(vec3<f32>(1.0)+width);
  return select(ordinary,wrapped,enabled);
}
@fragment fn fsSkin(input: SkinVertexOut) -> @location(0) vec4<f32> {
  let sample=textureSample(surfaceMap,surfaceSampler,input.uv);
  if(input.aux.y>0.0&&sample.a<input.aux.y){discard;}
  let base=srgbToLinear(input.color)*srgbToLinear(sample.rgb);
  let n=normalize(input.normal); let view=normalize(frame.eyeIndoor.xyz-input.world);
  let skin=input.aux.z>18.5;
  let sunDir=normalize(frame.sun.xyz); let sunColor=frame.sunColor.xyz*frame.sun.w;
  var scalarSun=max(dot(n,sunDir),0.0);
  if(frame.eyeIndoor.w<0.5){scalarSun=max(dot(n,sunDir)+0.34,0.0)/1.34;}
  let sunDiffuse=select(vec3<f32>(scalarSun),skinWrap(n,sunDir,true),skin);
  let up=clamp(n.y,0.0,1.0); let down=clamp(-n.y,0.0,1.0);
  var ambient=frame.sky.xyz*up*1.14+frame.ground.xyz*down*1.14
    +mix(frame.sky.xyz,frame.ground.xyz,0.5)*(1.0-up-down)*1.02;
  if(frame.eyeIndoor.w<0.5){ambient*=2.1;}
  var lit=base*(ambient+sunColor*sunDiffuse);
  let bulbVec=frame.bulb.xyz-input.world; let bulbDist=length(bulbVec);
  let bulbDir=bulbVec/max(bulbDist,0.001);
  let bulbFall=(2.8/(1.0+bulbDist*bulbDist))*frame.bulb.w;
  let bulbColor=vec3<f32>(1.0,0.75,0.43);
  lit+=base*bulbColor*skinWrap(n,bulbDir,skin)*bulbFall;
  let gloss=clamp(input.param.x,0.0,1.0); let shininess=mix(12.0,190.0,gloss);
  let specF0=vec3<f32>(0.025+gloss*0.075);
  var localSpec=vec3<f32>(0.0);
  for(var i=0u;i<8u;i++){
    if(f32(i)>=frame.ground.w){break;}
    let posRad=frame.lights[i].posRad; let delta=posRad.xyz-input.world;
    let distance=length(delta); let direction=delta/max(distance,0.001);
    let radius=max(posRad.w,0.001);
    let attenuation=(1.0/(1.0+(distance*distance)/(radius*radius)))
      *(1.0-smoothstep(radius*0.55,radius*2.4,distance));
    let lightColor=frame.lights[i].color.xyz;
    lit+=base*lightColor*skinWrap(n,direction,skin)*attenuation;
    let facing=max(dot(n,direction),0.0);
    if(gloss>0.14&&facing>0.0&&attenuation>0.003){
      let halfDir=normalize(direction+view); let nh=max(dot(n,halfDir),0.0);
      let vh=max(dot(view,halfDir),0.0);
      let fresnel=specF0+(vec3<f32>(1.0)-specF0)*pow(1.0-vh,5.0);
      let lobe=pow(nh,shininess)*mix(0.25,1.20,gloss)*facing;
      localSpec+=lightColor*fresnel*lobe*attenuation;
    }
  }
  lit+=localSpec;
  let bulbFacing=max(dot(n,bulbDir),0.0);
  let sunHalf=normalize(sunDir+view); let bulbHalf=normalize(bulbDir+view);
  let directLobe=pow(max(dot(n,sunHalf),0.0),shininess)*scalarSun
    +pow(max(dot(n,bulbHalf),0.0),shininess)*bulbFacing*bulbFall*0.6;
  lit+=vec3<f32>(0.020+gloss*0.30)*directLobe*mix(sunColor,bulbColor,0.35);
  let rim=pow(1.0-max(dot(n,view),0.0),3.4);
  lit+=base*rim*(0.14+0.55*max(frame.sun.w*0.35,0.22))
    *mix(frame.sky.xyz,frame.sunColor.xyz,0.45)*(0.35+0.65*up);
  lit+=base*input.param.z*2.4;
  lit*=mix(1.06,1.0,smoothstep(0.4,3.0,length(frame.eyeIndoor.xyz-input.world)));
  lit*=frame.whiteExpose.w;
  return vec4<f32>(haze(linearToSrgb(tonemap(max(lit,vec3<f32>(0.0)))),input.world),1.0);
}`;

  // Mips are generated in encoded texture space, matching WebGL's RGBA upload/generateMipmap
  // path. Albedo is decoded once in the material shader; normal and ARM values remain data.
  const MIP_WGSL = `
@group(0) @binding(0) var mipSampler: sampler;
@group(0) @binding(1) var mipSource: texture_2d<f32>;
struct MipOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i: u32) -> MipOut {
  var p = array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  var out: MipOut; out.position=vec4<f32>(p[i],0.0,1.0);
  out.uv=vec2<f32>(p[i].x*0.5+0.5,0.5-p[i].y*0.5); return out;
}
@fragment fn fs(input: MipOut) -> @location(0) vec4<f32> {
  return textureSample(mipSource,mipSampler,input.uv);
}`;

  function bounded(v, n = 240) { return String(v || '').slice(0, n); }
  const ordinaryResourceId = value => Number.isSafeInteger(value)&&value>0?value:0;
  function ordinaryResourceLive(resourceId){
    if(!ordinaryResourceId(resourceId)||typeof RenderResources==='undefined'||
        typeof RenderResources.live!=='function')return false;
    try{return RenderResources.live(resourceId,'texture')===true;}catch(_){return false;}
  }
  const ordinaryTexture = resourceId => ordinaryResourceLive(resourceId)
    ?textures.get(resourceId)||null:null;
  function mipByteSize(width,height){
    let bytes=0,w=Math.max(1,width|0),h=Math.max(1,height|0);
    for(;;){bytes+=w*h*4;if(w===1&&h===1)return bytes;
      w=Math.max(1,w>>1);h=Math.max(1,h>>1);}
  }
  const GLYPH_TEXTURE_BYTES=mipByteSize(GLYPH_WIDTH,GLYPH_HEIGHT),
    NON_GLYPH_TEXTURE_BUDGET=TEXTURE_BUDGET-GLYPH_TEXTURE_BYTES,
    PACKET_GLYPH_PIXEL_BUDGET=GLYPH_WIDTH*PACKET_GLYPH_MAX_HEIGHT*4,
    PACKET_GLYPH_TEXTURE_BUDGET=mipByteSize(GLYPH_WIDTH,PACKET_GLYPH_MAX_HEIGHT);
  const gpuTextureCount=()=>[...textures.values()]
    .reduce((count,record)=>count+1+(record.armTexture?1:0),glyphTexture?1:0);
  const gpuTextureBytes=()=>[...textures.values()]
    .reduce((bytes,record)=>bytes+(record.bytes||0),glyphBytes);
  const recordTextureBytes=record=>(record&&record.plannedBytes)||0;
  const pendingTextureBytes=()=>[...pendingTextures.values()]
    .reduce((bytes,record)=>bytes+recordTextureBytes(record),0);
  const skinTextureBytes=()=>[...skinTextures.values()]
    .reduce((bytes,record)=>bytes+(record.bytes||0),0);
  const pendingSkinTextureBytes=()=>[...pendingSkinTextures.values()]
    .reduce((bytes,record)=>bytes+recordTextureBytes(record),0);
  const skinMeshBytes=()=>[...skinMeshes.values()].reduce((bytes,record)=>bytes+record.bytes,0);
  const pendingSkinMeshBytes=()=>[...pendingSkinMeshes.values()]
    .reduce((bytes,record)=>bytes+record.bytes,0);
  function sourceSize(source){
    return [Math.max(1,Number(source&&source.width)||0),Math.max(1,Number(source&&source.height)||0)];
  }
  function plannedTextureBytes(source,arm){
    const [w,h]=sourceSize(source);let bytes=mipByteSize(w,h);
    if(arm){const [aw,ah]=sourceSize(arm);bytes+=mipByteSize(aw,ah);}
    return bytes;
  }
  function textureFits(source,arm){
    const limit=Math.min(MAX_TEXTURE_DIMENSION,
      device&&device.limits&&device.limits.maxTextureDimension2D||MAX_TEXTURE_DIMENSION);
    return [source,arm].filter(Boolean).every(image=>{
      const [w,h]=sourceSize(image);return w<=limit&&h<=limit;
    });
  }
  function rejectTexture(resourceId,record){
    const pending=pendingTextures.get(resourceId);
    if(pending){dropSnapshot(pending);pendingTextures.delete(resourceId);}
    stats.textureRejections++;return false;
  }
  function rejectSkinTexture(key){
    const pending=pendingSkinTextures.get(key);
    if(pending){dropSnapshot(pending);pendingSkinTextures.delete(key);}
    stats.skinTextureRejections++;return false;
  }
  function rejectSkinMesh(name){
    pendingSkinMeshes.delete(name);stats.skinMeshRejections++;return false;
  }
  function destroySkinMeshRecord(record){
    if(!record)return;
    for(const buffer of [record.pos,record.nor,record.uv,record.joint,record.weight,record.idx])
      if(buffer&&buffer.destroy){try{buffer.destroy();}catch(_) {}}
  }
  function destroySkinTextureRecord(record){
    if(record&&record.texture&&record.texture.destroy){try{record.texture.destroy();}catch(_) {}}
  }
  const validSkinOwner=owner=>typeof owner==='string'&&owner.length>0&&owner.length<=160;
  const validSkinLod=lod=>Number.isInteger(Number(lod))&&Number(lod)>=0&&Number(lod)<=2;
  const validSkinBytes=bytes=>Number.isSafeInteger(Number(bytes))&&Number(bytes)>0&&
    Number(bytes)<=1024*1024*1024;
  const skinImageId=id=>typeof id==='number'&&Number.isSafeInteger(id)&&id>=0?'n:'+id:
    typeof id==='string'&&id.length>0&&id.length<=96?'s:'+id:null;
  const skinTierWanted=(owner,lod)=>{
    const tiers=skinWanted.get(owner);return !!tiers&&tiers.has(Number(lod));
  };
  function skinBundleReady(owner,lod){
    const record=skinOwners.get(owner),tier=record&&record.tiers.get(Number(lod));
    if(!record||!tier||!tier.meshes.size||!tier.textures.size)return false;
    for(const key of tier.textures)if(!skinTextures.has(key))return false;
    for(const key of tier.meshes)if(!skinMeshes.has(key))return false;
    return true;
  }
  function skinBundleState(owner,lod){
    if(!requested)return'disabled';
    if(state==='pending'||state==='probing')return'waiting';
    if(state!=='ready')return'disabled';
    if(skinBundleReady(owner,lod))return'ready';
    if(frameOpen&&(skinPreflightBlocked||!skinTierWanted(owner,lod)))return'deferred';
    return'missing';
  }
  function wantSkinBundles(entries){
    if(!requested||state!=='ready'||!frameOpen||!Array.isArray(entries))return 0;
    if(skinPreflightBlocked)return 0;
    const plans=new Map();
    for(const [owner,record] of skinWantedPlans){
      const copy={textures:new Map(record.textures),tiers:new Map()};
      for(const [lod,tier] of record.tiers)
        copy.tiers.set(lod,{meshBytes:tier.meshBytes,textureIds:new Set(tier.textureIds)});
      plans.set(owner,copy);
    }
    let accepted=0,invalid=entries.length>256;
    for(const entry of entries){
      if(invalid)break;
      const owner=entry&&entry.owner,lod=Number(entry&&entry.lod),meshBytes=Number(entry&&entry.meshBytes),
        textures=entry&&entry.textures;
      if(!entry||entry.supported!==true||!validSkinOwner(owner)||!validSkinLod(lod)||
          !validSkinBytes(meshBytes)||!Array.isArray(textures)||
          !textures.length||textures.length>MAX_SKIN_PARTS){invalid=true;break;}
      let plan=plans.get(owner);
      if(!plan)plans.set(owner,plan={textures:new Map(),tiers:new Map()});
      const textureIds=new Set();
      for(const texture of textures){
        const id=skinImageId(texture&&texture.id),bytes=Number(texture&&texture.bytes);
        if(!id||textureIds.has(id)||!validSkinBytes(bytes))
          {invalid=true;break;}
        textureIds.add(id);
        const known=plan.textures.get(id);
        if(known!==undefined&&known!==bytes){invalid=true;break;}
        plan.textures.set(id,bytes);
      }
      if(invalid)break;
      const known=plan.tiers.get(lod);
      if(known){
        if(known.meshBytes!==meshBytes||known.textureIds.size!==textureIds.size||
            [...textureIds].some(id=>!known.textureIds.has(id))){invalid=true;break;}
      }else{plan.tiers.set(lod,{meshBytes,textureIds});accepted++;}
    }
    let meshBytes=0,textureBytes=0;
    for(const plan of plans.values()){
      for(const tier of plan.tiers.values())meshBytes+=tier.meshBytes;
      for(const bytes of plan.textures.values())textureBytes+=bytes;
    }
    for(const [key,record] of skinMeshes)if(!skinMeshOwners.has(key))meshBytes+=record.bytes||0;
    for(const [key,record] of skinTextures)if(!skinTextureOwners.has(key))textureBytes+=record.bytes||0;
    skinPreflightMeshBytes=meshBytes;skinPreflightTextureBytes=textureBytes;
    if(invalid||meshBytes>SKIN_MESH_BUDGET||textureBytes>SKIN_TEXTURE_BUDGET){
      skinPreflightBlocked=true;
      invalidateSkinFrame(invalid?'skin-working-set-invalid':'skin-working-set-over-budget');
      return 0;
    }
    skinWantedPlans.clear();skinWanted.clear();
    for(const [owner,plan] of plans){
      skinWantedPlans.set(owner,plan);skinWanted.set(owner,new Set(plan.tiers.keys()));
      const record=skinOwners.get(owner);
      if(record){record.lastUsedFrame=skinFrameEpoch;
        for(const lod of plan.tiers.keys()){
          const tier=record.tiers.get(lod);if(tier)tier.lastUsedFrame=skinFrameEpoch;
        }
      }
    }
    return accepted;
  }
  function dropSkinTier(owner,lod,evicted=false){
    const record=skinOwners.get(owner),tier=record&&record.tiers.get(Number(lod));
    if(!tier)return false;
    for(const key of tier.meshes){
      const owned=skinMeshOwners.get(key);
      if(owned&&owned.owner===owner&&owned.lod===Number(lod)){
        destroySkinMeshRecord(skinMeshes.get(key));skinMeshes.delete(key);skinMeshOwners.delete(key);
      }
      pendingSkinMeshes.delete(key);
    }
    record.tiers.delete(Number(lod));
    for(const key of tier.textures){
      let shared=false;
      for(const other of record.tiers.values())if(other.textures.has(key)){shared=true;break;}
      if(shared)continue;
      if(skinTextureOwners.get(key)===owner){
        destroySkinTextureRecord(skinTextures.get(key));skinTextures.delete(key);
        skinTextureOwners.delete(key);
      }
      const pending=pendingSkinTextures.get(key);
      if(pending){dropSnapshot(pending);pendingSkinTextures.delete(key);}
      record.textures.delete(key);
    }
    if(evicted)stats.skinTierEvictions++;
    return true;
  }
  function dropSkinOwner(owner,evicted=false){
    const record=skinOwners.get(owner);
    if(!record)return false;
    for(const lod of [...record.tiers.keys()])dropSkinTier(owner,lod,false);
    for(const key of record.textures){
      if(skinTextureOwners.get(key)===owner){
        destroySkinTextureRecord(skinTextures.get(key));skinTextures.delete(key);
        skinTextureOwners.delete(key);
      }
      const pending=pendingSkinTextures.get(key);
      if(pending){dropSnapshot(pending);pendingSkinTextures.delete(key);}
    }
    skinOwners.delete(owner);
    if(evicted)stats.skinOwnerEvictions++;
    return true;
  }
  function releaseSkinBundle(owner){
    if(!validSkinOwner(owner))return false;
    const released=dropSkinOwner(owner,false);skinWanted.delete(owner);skinWantedPlans.delete(owner);
    return released;
  }
  function removeLayer() {
    if (context && context.unconfigure) { try { context.unconfigure(); } catch (_) {} }
    for (const el of [canvas, badge, divider]) if (el && el.remove){try{el.remove();}catch(_) {}}
    canvas = badge = divider = null; context = null; layerShown = false;
  }
  function showLayer(show){
    const opacity=show?'1':'0';
    if(canvas)canvas.style.opacity=opacity;
    if(badge)badge.style.opacity=opacity;
    if(divider)divider.style.opacity=opacity;
    layerShown=!!show;
  }
  function resetOrdinaryFrameState(){
    ordinaryCoverageBlocked=false;ordinaryExpectedDraws=0;ordinaryFallbackReason='';
    ordinaryFailedSequence=-1;ordinaryFrameStats={draws:0,instances:0};
  }
  function fallbackOrdinaryFrame(why,sequence=-1){
    ordinaryCoverageBlocked=true;
    ordinaryFallbackReason=String(why||'ordinary-mirror-incomplete').slice(0,96);
    ordinaryFailedSequence=Number.isInteger(sequence)?sequence:-1;
    ordinaryFrameStats={draws:0,instances:0};stats.ordinaryCoverageFallbacks++;
    draws.length=0;skinGroups.length=0;used=0;
    skinInstanceUsedBytes=skinPaletteUsedBytes=0;showLayer(false);return false;
  }
  // WebGL is authoritative while this renderer is a preview. If its optional mirror loses an
  // authored character anywhere between culling and submission, hide the entire comparison
  // frame so the complete WebGL picture underneath remains visible. Keeping this public and
  // exception-safe lets the WebGL bracket report failures that occur before a group reaches us.
  function invalidateSkinFrame(why='skin-mirror-incomplete'){
    // `present()` closes frame admission before it re-resolves resource handles, so a release
    // race discovered there must still be able to invalidate the frame being assembled.
    if(!requested||state!=='ready')return false;
    skinCoverageBlocked=true;
    if(!skinFallbackReason)skinFallbackReason=String(why||'skin-mirror-incomplete').slice(0,96);
    return true;
  }
  function dropSnapshot(record) {
    for(const source of [record&&record.source,record&&record.armRecord&&record.armRecord.source]){
      if(source && typeof source.width==='number' && typeof source.height==='number'){
        try { source.width=0; source.height=0; } catch (_) {}
      }
    }
  }
  function destroyPacketGlyphCache(){
    const cache=packetGlyphCache;if(!cache)return false;packetGlyphCache=null;
    if(cache.texture&&cache.texture.destroy){try{cache.texture.destroy();}catch(_) {}}
    if(cache.pixels&&cache.pixels.fill){try{cache.pixels.fill(0);}catch(_) {}}
    packetGlyphTotals.destroys++;return true;
  }
  function discardPreparedPacket(token=preparedPacketToken){
    if(!token||token!==preparedPacketToken)return false;
    const plan=preparedPacketPlan;let released=false;
    try{
      released=!!plan&&typeof FramePacket!=='undefined'&&
        FramePacket.current(plan.frameId)===plan.packet&&
        FramePacket.release(plan.frameId,'webgpu')===true;
    }catch(_){}
    // Release renderer-neutral ownership before dropping the only private plan that proves which
    // packet was claimed. The stable FramePacket implementation makes this exact release succeed;
    // clearing afterwards also keeps teardown bounded if diagnostics have been externally altered.
    preparedPacketToken=preparedPacketPlan=null;packetPrepareTotals.discards++;return released;
  }
  function invalidatePreparedPacket(){
    ordinaryRevision++;
    if(preparedPacketToken)discardPreparedPacket(preparedPacketToken);
  }
  function invalidatePacketGlyphState(){
    invalidatePreparedPacket();destroyPacketGlyphCache();
  }
  function releaseGpu(destroyDevice) {
    invalidatePreparedPacket();
    destroyPacketGlyphCache();
    for (const m of meshes.values()) for (const b of [m.pos,m.nor,m.uv,m.idx])
      if (b && b.destroy) { try { b.destroy(); } catch (_) {} }
    meshes.clear(); pendingMeshes.clear();
    for(const m of skinMeshes.values())destroySkinMeshRecord(m);
    skinMeshes.clear();pendingSkinMeshes.clear();
    for(const record of pendingTextures.values()) dropSnapshot(record);
    pendingTextures.clear();
    for(const record of pendingSkinTextures.values())dropSnapshot(record);
    pendingSkinTextures.clear();
    for(const material of pbrMaterials)
      if(material.buffer&&material.buffer.destroy){try{material.buffer.destroy();}catch(_) {}}
    pbrMaterials.clear();
    tilingMaterials.clear();
    for(const record of textures.values()){
      for(const texture of [record.texture,record.armTexture])
        if(texture&&texture.destroy){try{texture.destroy();}catch(_) {}}
      if(record.meanBuffer&&record.meanBuffer.destroy)
        {try{record.meanBuffer.destroy();}catch(_) {}}
    }
    textures.clear();
    for(const record of skinTextures.values())destroySkinTextureRecord(record);
    skinTextures.clear();
    skinOwners.clear();skinMeshOwners.clear();skinTextureOwners.clear();skinWanted.clear();
    skinWantedPlans.clear();
    if(glyphTexture&&glyphTexture.destroy){try{glyphTexture.destroy();}catch(_) {}}
    glyphTexture=glyphBindGroup=null;glyphBytes=0;glyphDirty=false;glyphCells.clear();
    glyphSource=null;glyphSourceWidth=glyphSourceHeight=0;glyphScene='';
    glyphSourceVersion=glyphEpoch=0;
    if(glyphCanvas){try{glyphCanvas.width=0;glyphCanvas.height=0;}catch(_) {}}
    glyphCanvas=glyphContext=null;
    for (const b of [instanceBuffer,skinInstanceBuffer,skinPaletteBuffer,uniformBuffer,depth])
      if (b && b.destroy) { try { b.destroy(); } catch (_) {} }
    const oldDevice=device;
    device=adapter=pipeline=bevelPipeline=domePipeline=
      mode0AlphaPipeline=mode0BevelAlphaPipeline=
      mode1Pipeline=mode1AlphaPipeline=mode2Pipeline=
      mode5Pipeline=mode8Pipeline=mode4Pipeline=
      mode6Pipeline=mode6BevelPipeline=mode9Pipeline=mode10Pipeline=mode13Pipeline=
      mode7Pipeline=mode7AlphaPipeline=mode7BevelPipeline=mode7BevelAlphaPipeline=
      mode11Pipeline=mode14Pipeline=foliagePipeline=
      glyphPipeline=glyphMode1Pipeline=glyphMode1AlphaPipeline=
      texturedPipeline=pbrPipeline=tilingPipeline=tilingBevelPipeline=
      tilingMode0ColorPipeline=tilingMode0BevelColorPipeline=tilingMode1Pipeline=
      tilingMode1AlphaPipeline=
      tilingMode3Pipeline=tilingMode3BevelPipeline=
      tilingMode4Pipeline=tilingMode4AlphaPipeline=tilingMode4BevelPipeline=
      tilingMode4ColorPipeline=
      tilingMode6Pipeline=tilingMode6BevelPipeline=
      tilingMode7Pipeline=tilingMode7BevelPipeline=tilingMode9Pipeline=
      tilingMode9ColorPipeline=tilingMode10Pipeline=tilingMode11Pipeline=
      tilingMode14Pipeline=tilingMode15Pipeline=
      skinPipeline=skinDoublePipeline=
      frameLayout=surfaceLayout=
      pbrLayout=tilingLayout=tilingNormalLayout=skinPaletteLayout=bindGroup=
      skinPaletteBindGroup=instanceBuffer=skinInstanceBuffer=skinPaletteBuffer=
      uniformBuffer=depth=mipPipeline=mipSampler=surfaceClamp=surfaceRepeat=null;
    instanceCapacity=skinInstanceCapacity=skinPaletteCapacity=skinInstanceUsedBytes=
      skinPaletteUsedBytes=depthW=depthH=0;
    skinInstanceStaging=skinPaletteStaging=null;
    if (destroyDevice && oldDevice && oldDevice.destroy) { try { oldDevice.destroy(); } catch (_) {} }
  }
  function demote(next, why, err) {
    generation++;                         // stale adapter/device promises may not revive the layer
    state = next; reason = bounded(why, 80); message = bounded(err && (err.message || err));
    stats.errors++;
    frameOpen = false; draws.length = 0; skinGroups.length=0; used = 0;
    resetOrdinaryFrameState();
    skinCoverageBlocked=false;skinExpectedGroups=0;skinFallbackReason='';
    skinPreflightBlocked=false;skinPreflightMeshBytes=skinPreflightTextureBytes=0;
    skinFrameStats={groups:0,parts:0,instances:0,directGroups:0,directParts:0,
      directInstances:0,instancedGroups:0,instancedParts:0,instancedInstances:0};
    if (staging.length > INSTANCE_FLOATS * 2048)
      staging = new Float32Array(INSTANCE_FLOATS * 2048);
    // A terminal fallback must not retain the copied primitive catalogue. WebGL continues to own
    // the live meshes; these arrays existed only to bridge the adapter's asynchronous startup.
    releaseGpu(next !== 'lost');
    removeLayer();
    return false;
  }
  function ensureLayer() {
    if (canvas || typeof document === 'undefined') return;
    const source = document.getElementById('cv');
    canvas = document.createElement('canvas');
    canvas.id = 'webgpuPreview'; canvas.setAttribute('aria-hidden','true');
    canvas.dataset.renderer='webgpu-preview'; canvas.dataset.state='probing';
    Object.assign(canvas.style, { position:'fixed', inset:'0', width:'100%', height:'100%',
      pointerEvents:'none', zIndex:'0', opacity:'0',
      clipPath:fullView ? 'none' : 'inset(0 0 0 50%)' });
    if (source && source.insertAdjacentElement) source.insertAdjacentElement('afterend',canvas);
    else document.body.appendChild(canvas);
    badge = document.createElement('div');
    badge.id = 'webgpuPreviewBadge'; badge.textContent = fullView
      ? 'WEBGPU PREVIEW · SURFACE MATERIALS' : 'WEBGL  |  WEBGPU SURFACES';
    Object.assign(badge.style, { position:'fixed', left:fullView ? '50%' : '50%', bottom:'12px',
      transform:'translateX(-50%)', zIndex:'3', pointerEvents:'none', opacity:'0',
      padding:'6px 10px', border:'1px solid rgba(255,255,255,.22)', borderRadius:'999px',
      background:'rgba(7,9,12,.76)', color:'#eef4f1', font:'600 10px system-ui,sans-serif',
      letterSpacing:'.08em' });
    document.body.appendChild(badge);
    if (!fullView) {
      divider = document.createElement('div');
      Object.assign(divider.style, { position:'fixed', left:'50%', top:'0', bottom:'0', width:'1px',
        zIndex:'1', pointerEvents:'none', opacity:'0', background:'rgba(255,255,255,.42)' });
      document.body.appendChild(divider);
    }
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context unavailable');
  }
  function uploadBuffer(data, usage) {
    const bytes = data.byteLength, alloc = Math.max(4, (bytes + 3) & ~3);
    let buffer=null;
    try{
      buffer=device.createBuffer({ size:alloc, usage, mappedAtCreation:true });
      new Uint8Array(buffer.getMappedRange()).set(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      buffer.unmap();return buffer;
    }catch(err){
      if(buffer&&buffer.destroy){try{buffer.destroy();}catch(_) {}}
      throw err;
    }
  }
  function uploadMesh(name, source) {
    if (!device || meshes.has(name)) return;
    try {
      const pos = source.pos instanceof Float32Array ? source.pos : new Float32Array(source.pos);
      const nor = source.nor instanceof Float32Array ? source.nor : new Float32Array(source.nor);
      const uv = source.uv instanceof Float32Array ? source.uv : source.uv
        ? new Float32Array(source.uv) : new Float32Array(pos.length/3*2);
      let idx;
      if (source.idx instanceof Uint32Array || source.idx instanceof Uint16Array) idx = source.idx;
      else {
        let max = 0; for (const q of source.idx) if (q > max) max = q;
        idx = max > 65535 ? new Uint32Array(source.idx) : new Uint16Array(source.idx);
      }
      meshes.set(name, {
        pos:uploadBuffer(pos, GPUBufferUsage.VERTEX),
        nor:uploadBuffer(nor, GPUBufferUsage.VERTEX),
        uv:uploadBuffer(uv, GPUBufferUsage.VERTEX),
        idx:uploadBuffer(idx, GPUBufferUsage.INDEX), count:idx.length,
        format:idx instanceof Uint32Array ? 'uint32' : 'uint16',
      });
      pendingMeshes.delete(name);
    } catch (err) { demote('failed','mesh-upload',err); }
  }
  function arrayData(value,length){
    return !!value&&Number.isInteger(Number(value.length))&&value.length===length;
  }
  function finiteArray(value,length){
    if(!arrayData(value,length))return false;
    for(let i=0;i<length;i++)if(!Number.isFinite(Number(value[i])))return false;
    return true;
  }
  function prepareSkinMesh(pos,nor,uv,joint,weight,idx){
    const posLength=Number(pos&&pos.length)||0,vertexCount=posLength/3;
    if(!Number.isInteger(vertexCount)||vertexCount<1||!finiteArray(pos,posLength)||
        !finiteArray(nor,posLength)||!finiteArray(uv,vertexCount*2)||
        !finiteArray(joint,vertexCount*4)||!finiteArray(weight,vertexCount*4)||
        !idx||!Number.isInteger(Number(idx.length))||idx.length<3||idx.length%3!==0)return null;
    let maxJoint=0,maxIndex=0;
    for(let v=0;v<vertexCount;v++){
      let sum=0;
      for(let k=0;k<4;k++){
        const q=v*4+k,j=Number(joint[q]),w=Number(weight[q]);
        if(!Number.isInteger(j)||j<0||j>=MAX_SKIN_BONES||w<0)return null;
        maxJoint=Math.max(maxJoint,j);sum+=w;
      }
      if(!Number.isFinite(sum)||Math.abs(sum-1)>1e-3)return null;
    }
    for(let i=0;i<idx.length;i++){
      const q=Number(idx[i]);if(!Number.isInteger(q)||q<0||q>=vertexCount)return null;
      maxIndex=Math.max(maxIndex,q);
    }
    const out={pos:pos instanceof Float32Array?pos.slice():new Float32Array(pos),
      nor:nor instanceof Float32Array?nor.slice():new Float32Array(nor),
      uv:uv instanceof Float32Array?uv.slice():new Float32Array(uv),
      joint:joint instanceof Float32Array?joint.slice():new Float32Array(joint),
      weight:weight instanceof Float32Array?weight.slice():new Float32Array(weight),
      idx:maxIndex>65535?(idx instanceof Uint32Array?idx.slice():new Uint32Array(idx)):
        (idx instanceof Uint16Array?idx.slice():new Uint16Array(idx)),maxJoint};
    out.bytes=out.pos.byteLength+out.nor.byteLength+out.uv.byteLength+out.joint.byteLength+
      out.weight.byteLength+out.idx.byteLength;
    return out;
  }
  function makeSkinMeshRecord(source){
    if(!device)throw new Error('WebGPU skin mesh device unavailable');
    const made=[];
    try{
      const make=(data,usage)=>{const buffer=uploadBuffer(data,usage);made.push(buffer);return buffer;};
      const record={pos:make(source.pos,GPUBufferUsage.VERTEX),
        nor:make(source.nor,GPUBufferUsage.VERTEX),uv:make(source.uv,GPUBufferUsage.VERTEX),
        joint:make(source.joint,GPUBufferUsage.VERTEX),
        weight:make(source.weight,GPUBufferUsage.VERTEX),
        idx:make(source.idx,GPUBufferUsage.INDEX),count:source.idx.length,
        format:source.idx instanceof Uint32Array?'uint32':'uint16',
        maxJoint:source.maxJoint,bytes:source.bytes};
      return record;
    }catch(err){
      for(const buffer of made)if(buffer&&buffer.destroy){try{buffer.destroy();}catch(_) {}}
      throw err;
    }
  }
  function uploadSkinMesh(name,source){
    if(!device||skinMeshes.has(name))return false;
    try{
      skinMeshes.set(name,makeSkinMeshRecord(source));pendingSkinMeshes.delete(name);return true;
    }catch(err){return demote('failed','skin-mesh-upload',err);}
  }
  function makeSnapshot(source) {
    const width=Math.max(1,Number(source&&source.width)||0),
      height=Math.max(1,Number(source&&source.height)||0);
    const copy=typeof OffscreenCanvas==='function' ? new OffscreenCanvas(width,height)
      : document.createElement('canvas');
    copy.width=width; copy.height=height;
    const two=copy.getContext('2d');
    if(!two) throw new Error('2D snapshot context unavailable');
    two.drawImage(source,0,0,width,height);
    return {source:copy,width,height};
  }
  function writeTextureImage(texture,source,width,height,levels,label){
    device.queue.copyExternalImageToTexture({source,flipY:false},{texture},{width,height});
    if(levels<=1)return;
    const encoder=device.createCommandEncoder({label:'WebGPU '+label+' mip chain'});
    for(let level=1;level<levels;level++){
      const group=device.createBindGroup({layout:mipPipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:mipSampler},
        {binding:1,resource:texture.createView({baseMipLevel:level-1,mipLevelCount:1})},
      ]});
      const pass=encoder.beginRenderPass({colorAttachments:[{
        view:texture.createView({baseMipLevel:level,mipLevelCount:1}),
        loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0},
      }]});
      pass.setPipeline(mipPipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }
  function uploadImage(source,widthHint,heightHint,label) {
      const width=Math.max(1,widthHint||Number(source&&source.width)||0),
        height=Math.max(1,heightHint||Number(source&&source.height)||0),
        levels=1+Math.floor(Math.log2(Math.max(width,height)));
      let texture=null;
      try{
        texture=device.createTexture({size:[width,height],mipLevelCount:levels,format:'rgba8unorm',
          usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|
            GPUTextureUsage.RENDER_ATTACHMENT});
        writeTextureImage(texture,source,width,height,levels,label);
        return {texture,width,height,levels,bytes:mipByteSize(width,height)};
      }catch(err){
        if(texture&&texture.destroy){try{texture.destroy();}catch(_) {}}
        throw err;
      }
  }
  function uploadTexture(resourceId,record) {
    if(!device||textures.has(resourceId)) return false;
    // A pending source may outlive its WebGL carrier while adapter negotiation is in flight. Drop
    // it before creating any WebGPU object; a retired generation is never allowed to revive.
    if(!ordinaryResourceLive(resourceId))return rejectTexture(resourceId,record);
    let main=null, arm=null, meanBuffer=null;
    try{
      if(!textureFits(record.source,record.armRecord&&record.armRecord.source))
        return rejectTexture(resourceId,record);
      main=uploadImage(record.source,record.width,record.height,
        record.kind==='pbr'||record.kind==='tiling-normal'?'normal':'albedo');
      const sampler=record.clamp?surfaceClamp:surfaceRepeat;
      if(record.kind==='pbr'){
        const armRecord=record.armRecord;
        if(!armRecord||!armRecord.source)throw new Error('PBR surface is missing its ARM map');
        arm=uploadImage(armRecord.source,armRecord.width,armRecord.height,'ARM');
        textures.set(resourceId,{kind:'pbr',texture:main.texture,armTexture:arm.texture,sampler,
          width:main.width,height:main.height,levels:main.levels,
          bytes:main.bytes+arm.bytes,armAO:!!record.armAO,
          roughness:Number.isFinite(record.roughness)?record.roughness:1,
          metallic:Number.isFinite(record.metallic)?record.metallic:1});
      }else if(record.kind==='tiling'){
        const mean=Number(record.mean);
        if(!Number.isFinite(mean)||mean<=0)throw new Error('Tiling material has no valid mean');
        meanBuffer=device.createBuffer({size:16,
          usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
        device.queue.writeBuffer(meanBuffer,0,new Float32Array([mean,0,0,0]));
        const tilingGroup=device.createBindGroup({layout:tilingLayout,entries:[
          {binding:0,resource:sampler},{binding:1,resource:main.texture.createView()},
          {binding:5,resource:{buffer:meanBuffer}},
        ]});
        textures.set(resourceId,{kind:'tiling',texture:main.texture,bindGroup:tilingGroup,sampler,
          meanBuffer,mean,width:main.width,height:main.height,levels:main.levels,bytes:main.bytes});
      }else if(record.kind==='tiling-normal'){
        textures.set(resourceId,{kind:'tiling-normal',texture:main.texture,sampler,
          width:main.width,height:main.height,levels:main.levels,bytes:main.bytes});
      }else{
        const surfaceGroup=device.createBindGroup({layout:surfaceLayout,entries:[
          {binding:0,resource:sampler},{binding:1,resource:main.texture.createView()},
        ]});
        textures.set(resourceId,{kind:'albedo',texture:main.texture,bindGroup:surfaceGroup,sampler,
          width:main.width,height:main.height,levels:main.levels,bytes:main.bytes});
      }
      const pending=pendingTextures.get(resourceId); if(pending)dropSnapshot(pending);
      pendingTextures.delete(resourceId);
      return true;
    }catch(err){
      for(const made of [main,arm])if(made&&made.texture&&made.texture.destroy)
        {try{made.texture.destroy();}catch(_) {}}
      if(meanBuffer&&meanBuffer.destroy){try{meanBuffer.destroy();}catch(_) {}}
      return demote('failed','texture-upload',err);
    }
  }
  function makeSkinTextureRecord(record){
    if(!device)throw new Error('WebGPU skin texture device unavailable');
    let made=null;
    try{
      if(!textureFits(record.source,null))throw new Error('skinned albedo exceeds texture limits');
      made=uploadImage(record.source,record.width,record.height,'skinned albedo');
      const bindGroup=device.createBindGroup({layout:surfaceLayout,entries:[
        {binding:0,resource:surfaceClamp},{binding:1,resource:made.texture.createView()},
      ]});
      return {kind:'skin',texture:made.texture,bindGroup,sampler:surfaceClamp,
        width:made.width,height:made.height,levels:made.levels,bytes:made.bytes};
    }catch(err){
      if(made&&made.texture&&made.texture.destroy){try{made.texture.destroy();}catch(_) {}}
      throw err;
    }
  }
  function uploadSkinTexture(key,record){
    if(!device||skinTextures.has(key))return false;
    try{
      if(!textureFits(record.source,null))return rejectSkinTexture(key);
      skinTextures.set(key,makeSkinTextureRecord(record));
      const pending=pendingSkinTextures.get(key);if(pending)dropSnapshot(pending);
      pendingSkinTextures.delete(key);return true;
    }catch(err){return demote('failed','skin-texture-upload',err);}
  }
  function captureSkinTexture(key,source){
    if(!key||ordinaryResourceId(key)||!source||skinTextures.has(key)||
        pendingSkinTextures.has(key))return false;
    try{
      const width=Number(source.width),height=Number(source.height);
      if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1)
        return rejectSkinTexture(key);
      if(!textureFits(source,null))return rejectSkinTexture(key);
      const plannedBytes=plannedTextureBytes(source,null);
      if(skinTextureBytes()+pendingSkinTextureBytes()+plannedBytes>SKIN_TEXTURE_BUDGET)
        return rejectSkinTexture(key);
      const record={kind:'skin',clamp:true,plannedBytes};
      if(state==='ready')return uploadSkinTexture(key,{source,...record});
      if(state!=='pending'&&state!=='probing')return false;
      pendingSkinTextures.set(key,{...makeSnapshot(source),...record});
      if(state==='pending')void start();
      return true;
    }catch(err){return demote('failed','skin-texture-capture',err);}
  }
  function captureTexture(key,source,opt={}){
    if(!requested||!source)return false;
    if(opt.kind==='skin')return captureSkinTexture(key,source);
    const resourceId=ordinaryResourceId(key);
    if(!resourceId||!ordinaryResourceLive(resourceId)||textures.has(resourceId)||
        pendingTextures.has(resourceId))return false;
    try{
      const kind=opt.kind==='pbr'?'pbr':opt.kind==='tiling'?'tiling':
        opt.kind==='tiling-normal'?'tiling-normal':'albedo';
      if(kind==='pbr'&&!opt.arm)return false;
      // An ARM companion without a normal map is a different material contract, not an albedo
      // texture with optional decoration. WebGL can own that pair, but this bounded preview has no
      // matching shader/layout yet; reject before snapshotting or charging the texture budget so a
      // future caller cannot silently lose roughness/metalness while appearing supported.
      if(kind==='albedo'&&opt.arm)return rejectTexture(resourceId,null);
      if(kind==='tiling'&&(!Number.isFinite(Number(opt.mean))||Number(opt.mean)<=0))return false;
      if(!textureFits(source,opt.arm))return rejectTexture(resourceId,null);
      const plannedBytes=plannedTextureBytes(source,opt.arm);
      // Primary Han is a correctness surface, not an optional material companion. Reserve its
      // fixed atlas before ordinary textures so traversal order cannot erase every Chinese sign.
      if(gpuTextureBytes()+pendingTextureBytes()+plannedBytes>NON_GLYPH_TEXTURE_BUDGET)
        return rejectTexture(resourceId,null);
      const common={kind,clamp:!!opt.clamp,armAO:!!opt.armAO,
        roughness:opt.roughness,metallic:opt.metallic,mean:opt.mean,plannedBytes};
      if(state==='ready')return uploadTexture(resourceId,{source,
        armRecord:opt.arm?{source:opt.arm}:null,...common});
      if(state!=='pending'&&state!=='probing')return false;
      pendingTextures.set(resourceId,{...makeSnapshot(source),
        armRecord:opt.arm?makeSnapshot(opt.arm):null,...common});
      if(state==='pending')void start();
      return true;
    }catch(err){return demote('failed','texture-capture',err);}
  }
  function clearGlyphCells(){
    glyphCells.clear();glyphDirty=false;glyphEpoch++;
    if(glyphContext){
      glyphContext.globalCompositeOperation='source-over';glyphContext.fillStyle='#000';
      glyphContext.fillRect(0,0,GLYPH_WIDTH,GLYPH_HEIGHT);
    }
  }
  function redrawGlyphCells(){
    if(!glyphCells.size){glyphDirty=false;return;}
    ensureGlyphCanvas();
    glyphContext.globalCompositeOperation='source-over';glyphContext.fillStyle='#000';
    glyphContext.fillRect(0,0,GLYPH_WIDTH,GLYPH_HEIGHT);
    let drawn=0;
    for(const [key,cell] of [...glyphCells]){
      const sx=cell.sourceCol*GLYPH_PITCH,sy=cell.sourceRow*GLYPH_PITCH;
      if(sx+GLYPH_PITCH>glyphSourceWidth||sy+GLYPH_PITCH>glyphSourceHeight){
        glyphCells.delete(key);continue;
      }
      glyphContext.drawImage(glyphSource,sx,sy,GLYPH_PITCH,GLYPH_PITCH,
        cell.destX,cell.destY,GLYPH_PITCH,GLYPH_PITCH);drawn++;
    }
    glyphDirty=drawn>0;
  }
  function captureAtlas(source){
    if(!requested||!source||
        (state!=='pending'&&state!=='probing'&&state!=='ready'))return false;
    try{
      const width=Math.max(1,Number(source.width)||0),height=Math.max(1,Number(source.height)||0);
      if(width!==GLYPH_WIDTH||height<GLYPH_PITCH||height%GLYPH_PITCH!==0)return false;
      invalidatePacketGlyphState();
      const changed=source!==glyphSource||width!==glyphSourceWidth||height<glyphSourceHeight;
      glyphSource=source;glyphSourceWidth=width;glyphSourceHeight=height;
      glyphSourceVersion++;
      if(changed)clearGlyphCells();else redrawGlyphCells();
      return true;
    }catch(err){return demote('failed','glyph-source',err);}
  }
  function setScene(token){
    if(!requested||(state!=='pending'&&state!=='probing'&&state!=='ready'))return false;
    try{
      const next=bounded(token,80);if(next===glyphScene)return false;
      invalidatePacketGlyphState();
      glyphScene=next;stats.glyphSceneResets++;clearGlyphCells();return true;
    }catch(err){return demote('failed','glyph-scene',err);}
  }
  function releaseOrdinaryTexture(resourceId){
    if(pendingTextures.has(resourceId)||textures.has(resourceId))invalidatePreparedPacket();
    let released=false;
    const pending=pendingTextures.get(resourceId);
    if(pending){dropSnapshot(pending);pendingTextures.delete(resourceId);released=true;}
    const record=textures.get(resourceId);
    if(record){
      for(const material of [...pbrMaterials])
        if(material.baseKey===resourceId||material.pbrKey===resourceId){
        if(material.buffer&&material.buffer.destroy){try{material.buffer.destroy();}catch(_) {}}
        pbrMaterials.delete(material);
      }
      for(const material of [...tilingMaterials])
        if(material.baseKey===resourceId||material.normalKey===resourceId)
          tilingMaterials.delete(material);
      for(const texture of [record.texture,record.armTexture])
        if(texture&&texture.destroy){try{texture.destroy();}catch(_) {}}
      if(record.meanBuffer&&record.meanBuffer.destroy)
        {try{record.meanBuffer.destroy();}catch(_) {}}
      textures.delete(resourceId);released=true;
    }
    return released;
  }
  function releaseSkinTexture(key){
    let released=false;
    const pendingSkin=pendingSkinTextures.get(key);
    if(pendingSkin){dropSnapshot(pendingSkin);pendingSkinTextures.delete(key);released=true;}
    const skin=skinTextures.get(key);
    if(skin){destroySkinTextureRecord(skin);skinTextures.delete(key);
      skinTextureOwners.delete(key);released=true;}
    return released;
  }
  function releaseTexture(key){
    const resourceId=ordinaryResourceId(key);
    // Numeric ids and existing authored-character keys are intentionally disjoint domains. In
    // particular, an ordinary release runs after registry retirement, so it validates shape but
    // must not require the id still to be live in order to destroy its WebGPU storage.
    return resourceId?releaseOrdinaryTexture(resourceId):releaseSkinTexture(key);
  }
  function createPipeline() {
    const module = device.createShaderModule({ label:'Beijing Life WebGPU pilot', code:WGSL });
    frameLayout=device.createBindGroupLayout({entries:[{binding:0,
      visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
    surfaceLayout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
      {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    ]});
    pbrLayout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
      {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:4,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    ]});
    tilingLayout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
      {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:5,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    ]});
    tilingNormalLayout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
      {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:5,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    ]});
    skinPaletteLayout=device.createBindGroupLayout({entries:[{binding:0,
      visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
    const baseLayout=device.createPipelineLayout({bindGroupLayouts:[frameLayout]});
    const texturedLayout=device.createPipelineLayout({bindGroupLayouts:[frameLayout,surfaceLayout]});
    const pbrPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[frameLayout,pbrLayout]});
    const tilingPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[frameLayout,tilingNormalLayout]});
    const tilingMode1Layout=device.createPipelineLayout({bindGroupLayouts:[frameLayout,tilingLayout]});
    const skinLayout=device.createPipelineLayout({
      bindGroupLayouts:[frameLayout,surfaceLayout,skinPaletteLayout]});
    const vertex={ module, entryPoint:'vs', buffers:[
      { arrayStride:12, attributes:[{shaderLocation:0,offset:0,format:'float32x3'}] },
      { arrayStride:12, attributes:[{shaderLocation:1,offset:0,format:'float32x3'}] },
      { arrayStride:8, attributes:[{shaderLocation:2,offset:0,format:'float32x2'}] },
      { arrayStride:INSTANCE_BYTES, stepMode:'instance', attributes:[
        {shaderLocation:3,offset:0,format:'float32x4'},
        {shaderLocation:4,offset:16,format:'float32x4'},
        {shaderLocation:5,offset:32,format:'float32x4'},
        {shaderLocation:6,offset:48,format:'float32x4'},
        {shaderLocation:7,offset:64,format:'float32x3'},
        {shaderLocation:8,offset:76,format:'float32x3'},
        {shaderLocation:9,offset:88,format:'float32x4'},
      ]},
    ]};
    const common={vertex,primitive:{topology:'triangle-list',frontFace:'ccw',cullMode:'back'},
      depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}};
    const foliageCommon={...common,vertex:{...vertex,entryPoint:'vsFoliage'}};
    const skinVertex={module,entryPoint:'vsSkin',buffers:[
      {arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]},
      {arrayStride:12,attributes:[{shaderLocation:1,offset:0,format:'float32x3'}]},
      {arrayStride:8,attributes:[{shaderLocation:2,offset:0,format:'float32x2'}]},
      {arrayStride:16,attributes:[{shaderLocation:3,offset:0,format:'float32x4'}]},
      {arrayStride:16,attributes:[{shaderLocation:4,offset:0,format:'float32x4'}]},
      {arrayStride:INSTANCE_BYTES,stepMode:'instance',attributes:[
        {shaderLocation:5,offset:0,format:'float32x4'},
        {shaderLocation:6,offset:16,format:'float32x4'},
        {shaderLocation:7,offset:32,format:'float32x4'},
        {shaderLocation:8,offset:48,format:'float32x4'},
        {shaderLocation:9,offset:64,format:'float32x3'},
        {shaderLocation:10,offset:76,format:'float32x3'},
        {shaderLocation:11,offset:88,format:'float32x4'},
      ]},
    ]};
    const skinCommon={vertex:skinVertex,
      primitive:{topology:'triangle-list',frontFace:'ccw',cullMode:'back'},
      depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'},
      fragment:{module,entryPoint:'fsSkin',targets:[{format}]}};
    pipeline = device.createRenderPipeline({
      label:'opaque instance preview',layout:baseLayout,
      ...common,
      fragment:{ module, entryPoint:'fs', targets:[{format}] },
    });
    bevelPipeline=device.createRenderPipeline({
      label:'default box-bevel preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsBevel',targets:[{format}]},
    });
    domePipeline=device.createRenderPipeline({
      label:'outdoor sky dome preview',layout:baseLayout,
      ...common,
      primitive:{...common.primitive,cullMode:'none'},
      depthStencil:{...common.depthStencil,depthWriteEnabled:false,depthCompare:'always'},
      fragment:{module,entryPoint:'fsMode12',targets:[{format}]},
    });
    const alphaTarget={format,blend:{
      color:{operation:'add',srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha'},
      alpha:{operation:'add',srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha'},
    }};
    mode0AlphaPipeline=device.createRenderPipeline({
      label:'default straight-alpha preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode0Alpha',targets:[alphaTarget]},
    });
    mode0BevelAlphaPipeline=device.createRenderPipeline({
      label:'default box-bevel straight-alpha preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode0BevelAlpha',targets:[alphaTarget]},
    });
    const additiveTarget={format,blend:{
      color:{operation:'add',srcFactor:'src-alpha',dstFactor:'one'},
      alpha:{operation:'add',srcFactor:'src-alpha',dstFactor:'one'},
    }};
    mode1Pipeline=device.createRenderPipeline({
      label:'mode-1 color preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode1',targets:[{format}]},
    });
    mode1AlphaPipeline=device.createRenderPipeline({
      label:'mode-1 straight-alpha preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode1',targets:[alphaTarget]},
    });
    mode2Pipeline=device.createRenderPipeline({
      label:'contact shadow preview',layout:baseLayout,
      ...common,depthStencil:{...common.depthStencil,depthWriteEnabled:false},
      fragment:{module,entryPoint:'fsMode2',targets:[alphaTarget]},
    });
    mode5Pipeline=device.createRenderPipeline({
      label:'additive light-pool preview',layout:baseLayout,
      ...common,depthStencil:{...common.depthStencil,depthWriteEnabled:false},
      fragment:{module,entryPoint:'fsMode5',targets:[additiveTarget]},
    });
    mode8Pipeline=device.createRenderPipeline({
      label:'additive window-patch preview',layout:baseLayout,
      ...common,depthStencil:{...common.depthStencil,depthWriteEnabled:false},
      fragment:{module,entryPoint:'fsMode8',targets:[additiveTarget]},
    });
    mode4Pipeline=device.createRenderPipeline({
      label:'plaster material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode4',targets:[{format}]},
    });
    mode6Pipeline=device.createRenderPipeline({
      label:'wood material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode6',targets:[{format}]},
    });
    mode6BevelPipeline=device.createRenderPipeline({
      label:'wood box-bevel preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode6Bevel',targets:[{format}]},
    });
    mode9Pipeline=device.createRenderPipeline({
      label:'paving material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode9',targets:[{format}]},
    });
    mode10Pipeline=device.createRenderPipeline({
      label:'asphalt material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode10',targets:[{format}]},
    });
    mode13Pipeline=device.createRenderPipeline({
      label:'roof tile material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode13',targets:[{format}]},
    });
    mode11Pipeline=device.createRenderPipeline({
      label:'grey brick preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode11',targets:[{format}]},
    });
    mode14Pipeline=device.createRenderPipeline({
      label:'painted render preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode14',targets:[{format}]},
    });
    foliagePipeline=device.createRenderPipeline({
      label:'foliage preview',layout:baseLayout,
      ...foliageCommon,
      fragment:{module,entryPoint:'fsMode15',targets:[{format}]},
    });
    const glyphTarget={format,blend:{
      color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha'},
      alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},
    }};
    glyphPipeline=device.createRenderPipeline({
      label:'primary-Han glyph preview',layout:texturedLayout,
      ...common,fragment:{module,entryPoint:'fsGlyph',targets:[glyphTarget]},
    });
    glyphMode1Pipeline=device.createRenderPipeline({
      label:'primary-Han emissive glyph preview',layout:texturedLayout,
      ...common,fragment:{module,entryPoint:'fsGlyphMode1',targets:[glyphTarget]},
    });
    glyphMode1AlphaPipeline=device.createRenderPipeline({
      label:'full-role mode-1 straight-alpha glyph preview',layout:texturedLayout,
      ...common,fragment:{module,entryPoint:'fsGlyphMode1Alpha',targets:[alphaTarget]},
    });
    mode7Pipeline=device.createRenderPipeline({
      label:'woven material preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode7',targets:[{format}]},
    });
    mode7AlphaPipeline=device.createRenderPipeline({
      label:'woven straight-alpha preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode7Alpha',targets:[alphaTarget]},
    });
    mode7BevelPipeline=device.createRenderPipeline({
      label:'woven box-bevel preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode7Bevel',targets:[{format}]},
    });
    mode7BevelAlphaPipeline=device.createRenderPipeline({
      label:'woven box-bevel straight-alpha preview',layout:baseLayout,
      ...common,
      fragment:{module,entryPoint:'fsMode7BevelAlpha',targets:[alphaTarget]},
    });
    texturedPipeline=device.createRenderPipeline({
      label:'base-color instance preview',layout:texturedLayout,
      ...common,
      fragment:{module,entryPoint:'fsTextured',targets:[{format}]},
    });
    pbrPipeline=device.createRenderPipeline({
      label:'PBR instance preview',layout:pbrPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsPbr',targets:[{format}]},
    });
    tilingPipeline=device.createRenderPipeline({
      label:'triplanar material preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTiling',targets:[{format}]},
    });
    tilingBevelPipeline=device.createRenderPipeline({
      label:'triplanar box-bevel preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingBevel',targets:[{format}]},
    });
    tilingMode0ColorPipeline=device.createRenderPipeline({
      label:'default color-only triplanar preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode0Color',targets:[{format}]},
    });
    tilingMode0BevelColorPipeline=device.createRenderPipeline({
      label:'default box-bevel color-only triplanar preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode0BevelColor',targets:[{format}]},
    });
    tilingMode1Pipeline=device.createRenderPipeline({
      label:'mode-1 triplanar preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode1',targets:[{format}]},
    });
    tilingMode1AlphaPipeline=device.createRenderPipeline({
      label:'mode-1 triplanar straight-alpha preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode1',targets:[alphaTarget]},
    });
    tilingMode3Pipeline=device.createRenderPipeline({
      label:'floorboard triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode3',targets:[{format}]},
    });
    tilingMode3BevelPipeline=device.createRenderPipeline({
      label:'floorboard triplanar box-bevel preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode3Bevel',targets:[{format}]},
    });
    tilingMode4Pipeline=device.createRenderPipeline({
      label:'plaster triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode4',targets:[{format}]},
    });
    tilingMode4AlphaPipeline=device.createRenderPipeline({
      label:'plaster triplanar straight-alpha preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode4Alpha',targets:[alphaTarget]},
    });
    tilingMode4BevelPipeline=device.createRenderPipeline({
      label:'plaster triplanar box-bevel preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode4Bevel',targets:[{format}]},
    });
    tilingMode4ColorPipeline=device.createRenderPipeline({
      label:'plaster color-only triplanar preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode4Color',targets:[{format}]},
    });
    tilingMode6Pipeline=device.createRenderPipeline({
      label:'wood triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode6',targets:[{format}]},
    });
    tilingMode6BevelPipeline=device.createRenderPipeline({
      label:'wood triplanar box-bevel preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode6Bevel',targets:[{format}]},
    });
    tilingMode7Pipeline=device.createRenderPipeline({
      label:'woven triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode7',targets:[{format}]},
    });
    tilingMode7BevelPipeline=device.createRenderPipeline({
      label:'woven triplanar box-bevel preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode7Bevel',targets:[{format}]},
    });
    tilingMode9Pipeline=device.createRenderPipeline({
      label:'paving triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode9',targets:[{format}]},
    });
    tilingMode9ColorPipeline=device.createRenderPipeline({
      label:'paving color-only triplanar preview',layout:tilingMode1Layout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode9Color',targets:[{format}]},
    });
    tilingMode10Pipeline=device.createRenderPipeline({
      label:'asphalt triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode10',targets:[{format}]},
    });
    tilingMode11Pipeline=device.createRenderPipeline({
      label:'grey brick triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode11',targets:[{format}]},
    });
    tilingMode14Pipeline=device.createRenderPipeline({
      label:'painted render triplanar preview',layout:tilingPipelineLayout,
      ...common,
      fragment:{module,entryPoint:'fsTilingMode14',targets:[{format}]},
    });
    tilingMode15Pipeline=device.createRenderPipeline({
      label:'foliage triplanar preview',layout:tilingPipelineLayout,
      ...foliageCommon,
      fragment:{module,entryPoint:'fsTilingMode15',targets:[{format}]},
    });
    skinPipeline=device.createRenderPipeline({label:'skinned character preview',layout:skinLayout,
      ...skinCommon});
    skinDoublePipeline=device.createRenderPipeline({label:'double-sided skinned character preview',
      layout:skinLayout,...skinCommon,primitive:{...skinCommon.primitive,cullMode:'none'}});
    surfaceClamp=device.createSampler({addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',
      minFilter:'linear',magFilter:'linear',mipmapFilter:'linear',maxAnisotropy:4});
    surfaceRepeat=device.createSampler({addressModeU:'repeat',addressModeV:'repeat',
      minFilter:'linear',magFilter:'linear',mipmapFilter:'linear',maxAnisotropy:4});
    const mipModule=device.createShaderModule({label:'WebGPU albedo mip generator',code:MIP_WGSL});
    mipPipeline=device.createRenderPipeline({label:'encoded albedo mips',layout:'auto',
      vertex:{module:mipModule,entryPoint:'vs'},
      fragment:{module:mipModule,entryPoint:'fs',targets:[{format:'rgba8unorm'}]},
      primitive:{topology:'triangle-list'}});
    mipSampler=device.createSampler({minFilter:'linear',magFilter:'linear'});
    uniformBuffer = device.createBuffer({ size:FRAME_BYTES,
      usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    bindGroup = device.createBindGroup({ layout:frameLayout,
      entries:[{ binding:0, resource:{buffer:uniformBuffer} }] });
  }
  function withProbeTimeout(promise, label) {
    if (typeof setTimeout !== 'function') return promise;
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' timed out')), 12000);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
  async function start() {
    if (!requested) return status();
    if (startPromise) return startPromise;
    const mine = ++generation;
    state = 'probing';
    startPromise = (async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.gpu)
          return demote('unsupported','navigator.gpu','WebGPU is not available in this browser');
        const foundAdapter = await withProbeTimeout(
          navigator.gpu.requestAdapter({powerPreference:'high-performance'}),'WebGPU adapter');
        if (mine !== generation) return false;
        if (!foundAdapter) return demote('unsupported','adapter','No WebGPU adapter was returned');
        const info = foundAdapter.info || {};
        adapterInfo = { vendor:bounded(info.vendor,80), architecture:bounded(info.architecture,80),
          device:bounded(info.device,80), description:bounded(info.description,120) };
        const deviceRequest=foundAdapter.requestDevice();
        // Promise.race cannot cancel a native request. If the timeout wins, destroy a device that
        // resolves later instead of leaking an orphaned queue after the preview has fallen back.
        let abandonedDevice=false,lateDeviceDestroyed=false;
        const destroyLate=late=>{
          if((abandonedDevice||mine!==generation)&&!lateDeviceDestroyed&&late&&late.destroy){
            lateDeviceDestroyed=true;try{late.destroy();}catch(_) {}
          }
        };
        deviceRequest.then(destroyLate,()=>{});
        let foundDevice;
        try{foundDevice=await withProbeTimeout(deviceRequest,'WebGPU device');}
        catch(err){abandonedDevice=true;deviceRequest.then(destroyLate,()=>{});throw err;}
        if (mine !== generation) { if (foundDevice.destroy) foundDevice.destroy(); return false; }
        adapter=foundAdapter; device=foundDevice;
        device.lost.then(infoLost => {
          if (mine === generation && state !== 'stopped') demote('lost','device-lost',infoLost.message);
        });
        device.addEventListener('uncapturederror', ev => {
          if (mine === generation && state === 'ready')
            demote('failed','uncaptured-error',ev && ev.error);
        });
        ensureLayer();
        format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode:'opaque' });
        createPipeline();
        state = 'ready'; reason = message = '';
        if(canvas)canvas.dataset.state='ready';
        for (const [name, source] of pendingMeshes) {
          if (state !== 'ready') break;
          uploadMesh(name,source);
        }
        for(const [name,source] of pendingSkinMeshes){
          if(state!=='ready')break;
          uploadSkinMesh(name,source);
        }
        for(const [key, record] of pendingTextures){
          if(state!=='ready')break;
          uploadTexture(key,record);
        }
        for(const [key,record] of pendingSkinTextures){
          if(state!=='ready')break;
          uploadSkinTexture(key,record);
        }
        return status();
      } catch (err) { return demote('failed','initialization',err); }
    })();
    return startPromise;
  }
  function captureMesh(name,pos,nor,idx,uv) {
    if (!requested || !name || meshes.has(name) || pendingMeshes.has(name)) return false;
    try {
      if (state === 'ready') {
        uploadMesh(name,{pos,nor,idx,uv});
        return meshes.has(name);
      }
      if (state !== 'pending' && state !== 'probing') return false;
      // Opt-in sessions may reach this while requestAdapter is pending. Own the arrays until
      // upload; `gl.js` can then release its temporary hand-off immediately.
      let indexCopy;
      if (idx instanceof Uint32Array || idx instanceof Uint16Array) indexCopy=idx.slice();
      else {
        let max=0; for(const q of idx) if(q>max)max=q;
        indexCopy=max>65535?new Uint32Array(idx):new Uint16Array(idx);
      }
      pendingMeshes.set(name, { pos:pos instanceof Float32Array ? pos.slice() : new Float32Array(pos),
        nor:nor instanceof Float32Array ? nor.slice() : new Float32Array(nor),
        idx:indexCopy,
        uv:uv instanceof Float32Array ? uv.slice() : uv ? new Float32Array(uv)
          : new Float32Array((pos.length/3)*2) });
      if (state === 'pending') void start();
      return true;
    } catch (err) {
      // This path is called inline from authoritative WebGL mesh registration. The optional
      // comparison may disappear; it must never make the real renderer's registration fail.
      return demote('failed','mesh-capture',err);
    }
  }
  function captureSkinMesh(name,pos,nor,uv,joint,weight,idx){
    if(!requested||!name||meshes.has(name)||pendingMeshes.has(name)||skinMeshes.has(name)||
        pendingSkinMeshes.has(name))return false;
    try{
      if(state!=='ready'&&state!=='pending'&&state!=='probing')return false;
      const source=prepareSkinMesh(pos,nor,uv,joint,weight,idx);
      if(!source)return rejectSkinMesh(name);
      if(skinMeshBytes()+pendingSkinMeshBytes()+source.bytes>SKIN_MESH_BUDGET)
        return rejectSkinMesh(name);
      if(state==='ready')return uploadSkinMesh(name,source);
      pendingSkinMeshes.set(name,source);
      if(state==='pending')void start();
      return true;
    }catch(err){return demote('failed','skin-mesh-capture',err);}
  }
  function protectedSkinTextureBytes(){
    let bytes=0;
    for(const [key,record] of skinTextures){
      const owner=skinTextureOwners.get(key);
      if(!owner){bytes+=record.bytes||0;continue;}
      const wanted=skinWanted.get(owner),owned=skinOwners.get(owner);
      if(!wanted||!owned)continue;
      for(const lod of wanted){
        const tier=owned.tiers.get(lod);
        if(tier&&tier.textures.has(key)){bytes+=record.bytes||0;break;}
      }
    }
    return bytes;
  }
  function protectedSkinMeshBytes(){
    let bytes=0;
    for(const [key,record] of skinMeshes){
      const owned=skinMeshOwners.get(key);
      if(!owned||skinTierWanted(owned.owner,owned.lod))bytes+=record.bytes||0;
    }
    return bytes;
  }
  const skinLru=(a,b)=>a.lastUsedFrame-b.lastUsedFrame||
    (a.key<b.key?-1:a.key>b.key?1:0);
  function reserveSkinBundle(textureBytes,meshBytes){
    // Prove the protected current-frame union fits before evicting anything. This prevents an
    // over-budget crowd from churning last frame's useful cache merely because its groups were
    // encountered in a different traversal order.
    if(protectedSkinTextureBytes()+textureBytes>SKIN_TEXTURE_BUDGET||
        protectedSkinMeshBytes()+meshBytes>SKIN_MESH_BUDGET)return false;
    if(skinTextureBytes()+textureBytes>SKIN_TEXTURE_BUDGET||
        skinMeshBytes()+meshBytes>SKIN_MESH_BUDGET){
      // A wholly cold owner is cheaper to reacquire than making a visible owner oscillate between
      // near/far meshes. Evict inactive generations first, then unused sibling LODs only if needed.
      const owners=[];
      for(const [owner,record] of skinOwners)if(!skinWanted.has(owner))
        owners.push({owner,lastUsedFrame:record.lastUsedFrame||0,key:owner});
      owners.sort(skinLru);
      for(const candidate of owners){
        if(skinTextureBytes()+textureBytes<=SKIN_TEXTURE_BUDGET&&
            skinMeshBytes()+meshBytes<=SKIN_MESH_BUDGET)break;
        dropSkinOwner(candidate.owner,true);
      }
    }
    if(skinTextureBytes()+textureBytes>SKIN_TEXTURE_BUDGET||
        skinMeshBytes()+meshBytes>SKIN_MESH_BUDGET){
      const tiers=[];
      for(const [owner,record] of skinOwners){
        if(!skinWanted.has(owner))continue;
        for(const [lod,tier] of record.tiers)if(!skinTierWanted(owner,lod))
          tiers.push({owner,lod,lastUsedFrame:tier.lastUsedFrame||0,key:owner+'|'+lod});
      }
      tiers.sort(skinLru);
      for(const tier of tiers){
        if(skinTextureBytes()+textureBytes<=SKIN_TEXTURE_BUDGET&&
            skinMeshBytes()+meshBytes<=SKIN_MESH_BUDGET)break;
        dropSkinTier(tier.owner,tier.lod,true);
      }
    }
    return skinTextureBytes()+textureBytes<=SKIN_TEXTURE_BUDGET&&
      skinMeshBytes()+meshBytes<=SKIN_MESH_BUDGET;
  }
  // Commit one exact rig generation/LOD as a resource transaction. Assets keeps the authoritative
  // CPU arrays and compressed image Blobs; this function retains only GPU handles and ownership
  // keys. Nothing becomes drawable until every mesh and texture in the requested tier exists.
  function captureSkinBundle(owner,lod,bundle){
    lod=Number(lod);
    if(!requested||state!=='ready'||!device||!validSkinOwner(owner)||!validSkinLod(lod)||
        !skinTierWanted(owner,lod))return false;
    if(skinPreflightBlocked)return false;
    if(skinBundleReady(owner,lod))return true;
    const reject=why=>{stats.skinBundleRejections++;invalidateSkinFrame(why);return false;};
    const plannedOwner=skinWantedPlans.get(owner),plannedTier=plannedOwner&&plannedOwner.tiers.get(lod);
    if(!plannedOwner||!plannedTier)return reject('skin-bundle-unplanned');
    if(!bundle||!Array.isArray(bundle.meshes)||!Array.isArray(bundle.textures)||
        !bundle.meshes.length||!bundle.textures.length||
        bundle.meshes.length>MAX_SKIN_PARTS||bundle.textures.length>MAX_SKIN_PARTS)
      return reject('skin-bundle-shape');
    const preparedMeshes=new Map(),preparedTextures=new Map(),bundleTextureIds=new Set();
    try{
      for(const item of bundle.meshes){
        const key=item&&item.key;
        if(!key||preparedMeshes.has(key))return reject('skin-bundle-mesh-key');
        const owned=skinMeshOwners.get(key);
        if((owned&&(owned.owner!==owner||owned.lod!==lod))||
            (skinMeshes.has(key)&&!owned))return reject('skin-bundle-mesh-owner');
        if(skinMeshes.has(key)){preparedMeshes.set(key,null);continue;}
        const source=prepareSkinMesh(item.pos,item.nor,item.uv,item.joint,item.weight,item.idx);
        if(!source)return reject('skin-bundle-mesh-invalid');
        preparedMeshes.set(key,source);
      }
      for(const item of bundle.textures){
        const key=item&&item.key,source=item&&item.source,id=skinImageId(item&&item.id);
        if(!key||!source||!id||preparedTextures.has(key)||bundleTextureIds.has(id)||
            !plannedTier.textureIds.has(id))return reject('skin-bundle-texture-key');
        const owned=skinTextureOwners.get(key);
        if((owned&&owned!==owner)||(skinTextures.has(key)&&!owned))
          return reject('skin-bundle-texture-owner');
        const width=Number(source.width),height=Number(source.height);
        if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||
            !textureFits(source,null))return reject('skin-bundle-texture-invalid');
        const plannedBytes=mipByteSize(width,height);
        if(plannedOwner.textures.get(id)!==plannedBytes)
          return reject('skin-bundle-texture-estimate');
        bundleTextureIds.add(id);preparedTextures.set(key,{source,width,height,plannedBytes,id,
          missing:!skinTextures.has(key)});
      }
      if(bundleTextureIds.size!==plannedTier.textureIds.size)return reject('skin-bundle-textures');
    }catch(_){return reject('skin-bundle-validation');}
    let addMeshBytes=0,bundleMeshBytes=0,addTextureBytes=0;
    for(const [key,source] of preparedMeshes){
      const bytes=source?source.bytes:(skinMeshes.get(key)&&skinMeshes.get(key).bytes)||0;
      bundleMeshBytes+=bytes;if(source)addMeshBytes+=bytes;
    }
    if(bundleMeshBytes!==plannedTier.meshBytes)return reject('skin-bundle-mesh-estimate');
    // Reserving mesh space may evict an older inactive LOD of this same owner. If that tier was
    // the last reference to an incoming shared texture, its byte cost becomes part of this
    // transaction and the next pass reserves again. Missingness only grows before publication,
    // so at most one pass per incoming texture reaches a stable bounded working set.
    let reservationStable=false;
    for(let pass=0;pass<=preparedTextures.size;pass++){
      addTextureBytes=0;
      for(const source of preparedTextures.values())if(source.missing)
        addTextureBytes+=source.plannedBytes;
      if(!reserveSkinBundle(addTextureBytes,addMeshBytes))
        return reject('skin-bundle-over-budget');
      let changed=false;
      for(const [key,source] of preparedTextures){
        const missing=!skinTextures.has(key);
        if(missing!==source.missing){source.missing=missing;changed=true;}
      }
      if(!changed){reservationStable=true;break;}
    }
    if(!reservationStable)return reject('skin-bundle-reservation');
    const madeMeshes=new Map(),madeTextures=new Map(),addedTierMeshes=[],addedTierTextures=[],
      addedOwnerTextures=[];
    let record=null,tier=null,tierCreated=false;
    try{
      for(const [key,source] of preparedMeshes)if(source)
        madeMeshes.set(key,makeSkinMeshRecord(source));
      for(const [key,source] of preparedTextures)if(source.missing)
        madeTextures.set(key,makeSkinTextureRecord(source));
      record=skinOwners.get(owner);
      if(!record){skinOwners.set(owner,record={owner,textures:new Set(),tiers:new Map(),
        lastUsedFrame:skinFrameEpoch});}
      tier=record.tiers.get(lod);
      if(!tier){record.tiers.set(lod,tier={meshes:new Set(),textures:new Set(),
        lastUsedFrame:skinFrameEpoch});tierCreated=true;}
      for(const [key,mesh] of madeMeshes){skinMeshes.set(key,mesh);
        skinMeshOwners.set(key,{owner,lod});}
      for(const [key,texture] of madeTextures){skinTextures.set(key,texture);
        skinTextureOwners.set(key,owner);}
      for(const key of preparedMeshes.keys())if(!tier.meshes.has(key)){
        tier.meshes.add(key);addedTierMeshes.push(key);
      }
      for(const key of preparedTextures.keys()){
        if(!tier.textures.has(key)){tier.textures.add(key);addedTierTextures.push(key);}
        if(!record.textures.has(key)){record.textures.add(key);addedOwnerTextures.push(key);}
      }
      record.lastUsedFrame=tier.lastUsedFrame=skinFrameEpoch;
      if(!skinBundleReady(owner,lod))throw new Error('skin bundle did not publish completely');
      stats.skinBundleCommits++;return true;
    }catch(_){
      for(const made of madeMeshes.values())destroySkinMeshRecord(made);
      for(const made of madeTextures.values())destroySkinTextureRecord(made);
      // A throw after publication is exceptionally defensive; remove only handles created by this
      // transaction so an older complete tier owned by the same generation remains coherent.
      for(const key of madeMeshes.keys()){skinMeshes.delete(key);skinMeshOwners.delete(key);}
      for(const key of madeTextures.keys()){skinTextures.delete(key);skinTextureOwners.delete(key);}
      record=record||skinOwners.get(owner);tier=tier||(record&&record.tiers.get(lod));
      if(tier){
        for(const key of addedTierMeshes)tier.meshes.delete(key);
        for(const key of addedTierTextures)tier.textures.delete(key);
        if(tierCreated&&!tier.meshes.size&&!tier.textures.size)record.tiers.delete(lod);
      }
      if(record){
        for(const key of addedOwnerTextures){
          let shared=false;
          for(const other of record.tiers.values())if(other.textures.has(key)){shared=true;break;}
          if(!shared)record.textures.delete(key);
        }
        if(!record.tiers.size&&!record.textures.size)skinOwners.delete(owner);
      }
      stats.skinBundleRollbacks++;return reject('skin-bundle-rollback');
    }
  }
  function releaseMesh(name){
    let released=false;
    if(pendingMeshes.has(name)||meshes.has(name))invalidatePreparedPacket();
    if(pendingMeshes.delete(name))released=true;
    const ordinary=meshes.get(name);
    if(ordinary){for(const b of [ordinary.pos,ordinary.nor,ordinary.uv,ordinary.idx])
      if(b&&b.destroy){try{b.destroy();}catch(_) {}}
      meshes.delete(name);released=true;}
    if(pendingSkinMeshes.delete(name))released=true;
    const skin=skinMeshes.get(name);
    if(skin){destroySkinMeshRecord(skin);skinMeshes.delete(name);
      skinMeshOwners.delete(name);released=true;}
    return released;
  }
  function beginFrame(vp,sky,light={}) {
    if (!requested) return false;
    if (state === 'pending') void start();
    if (state !== 'ready' || !device || !vp) return false;
    try {
      frameOpen = true; used = 0; draws.length = 0; skinGroups.length=0;
      resetOrdinaryFrameState();
      skinWanted.clear();skinWantedPlans.clear();
      skinPreflightBlocked=false;skinPreflightMeshBytes=skinPreflightTextureBytes=0;
      skinCoverageBlocked=false;skinExpectedGroups=0;skinFallbackReason='';
      skinInstanceUsedBytes=skinPaletteUsedBytes=0;
      skinFrameStats={groups:0,parts:0,instances:0,directGroups:0,directParts:0,
        directInstances:0,instancedGroups:0,instancedParts:0,instancedInstances:0};
      clear = Array.isArray(sky) || ArrayBuffer.isView(sky) ? sky : clear;
      const u = frameData; u.fill(0); u.set(vp,0);
      const dir=light.dir||[0,.7,.2], col=light.color||[1,.95,.85],
        top=light.sky||[.35,.40,.48], bottom=light.ground||[.18,.14,.10];
      u.set([dir[0],dir[1],dir[2],Number(light.amount)||0],16);
      u.set([col[0],col[1],col[2],0],20); u.set([top[0],top[1],top[2],0],24);
      const count=Math.max(0,Math.min(8,Number(light.lightCount)||0));
      u.set([bottom[0],bottom[1],bottom[2],count],28);
      const eye=light.eye||[0,0,0], bulb=light.bulb||[0,2,0], white=light.white||[1,1,1],
        fog=light.fogColor||sky||[0,0,0];
      u.set([eye[0],eye[1],eye[2],light.indoor?1:0],32);
      u.set([bulb[0],bulb[1],bulb[2],Number(light.bulbOn)||0],36);
      u.set([white[0],white[1],white[2],Number.isFinite(light.expose)?light.expose:1],40);
      u.set([fog[0],fog[1],fog[2],Math.max(0,Number(light.fogD)||0)],44);
      u.set([Math.max(0,Number(light.fogNear)||0),light.glyphAssist?1:0,
        Number.isFinite(light.deckY)?light.deckY:0,0],48);
      const skyA=light.skyA||top,skyB=light.skyB||top;
      u.set([skyA[0],skyA[1],skyA[2],0],52);
      u.set([skyB[0],skyB[1],skyB[2],0],56);
      const weather=light.weather||[0,0,0],leaf=light.leaf||[1,1,1];
      u.set([weather[0],weather[1],weather[2],
        Number.isFinite(light.time)?light.time:0],60);
      u.set([leaf[0],leaf[1],leaf[2],0],64);
      const positions=light.lightPos, colors=light.lightCol, radii=light.lightRad;
      for(let i=0;i<count;i++){
        const at=68+i*8, p=i*3;
        u.set([positions[p],positions[p+1],positions[p+2],radii[i]],at);
        u.set([colors[p],colors[p+1],colors[p+2],0],at+4);
      }
      device.queue.writeBuffer(uniformBuffer,0,u);
      skinFrameEpoch++;
      return true;
    } catch (err) {
      return demote('failed','frame-begin',err);
    }
  }
  function growStaging(need) {
    if (need <= staging.length) return;
    const next = new Float32Array(Math.max(need,staging.length*2)); next.set(staging); staging=next;
  }
  function ensureGlyphCanvas(){
    if(glyphCanvas)return true;
    glyphCanvas=typeof OffscreenCanvas==='function'
      ?new OffscreenCanvas(GLYPH_WIDTH,GLYPH_HEIGHT):document.createElement('canvas');
    glyphCanvas.width=GLYPH_WIDTH;glyphCanvas.height=GLYPH_HEIGHT;
    glyphContext=glyphCanvas.getContext('2d');
    if(!glyphContext)throw new Error('compact glyph atlas has no 2D context');
    glyphContext.globalCompositeOperation='source-over';glyphContext.fillStyle='#000';
    glyphContext.fillRect(0,0,GLYPH_WIDTH,GLYPH_HEIGHT);return true;
  }
  function glyphCell(rect){
    if(!glyphSource||!rect||rect.length<4)return null;
    const u=Number(rect[0]),v=Number(rect[1]),du=Number(rect[2]),dv=Number(rect[3]);
    if(![u,v,du,dv].every(Number.isFinite)||du<=0||dv>=0)return null;
    const px=u*glyphSourceWidth-GLYPH_GUTTER,py=v*glyphSourceHeight-GLYPH_GUTTER,
      col=Math.round(px/GLYPH_PITCH),row=Math.round(py/GLYPH_PITCH);
    if(Math.abs(px-col*GLYPH_PITCH)>.5||Math.abs(py-row*GLYPH_PITCH)>.5||
        Math.abs(du*glyphSourceWidth-GLYPH_CELL)>.5||
        Math.abs(Math.abs(dv)*glyphSourceHeight-GLYPH_CELL)>.5||
        col<0||col>=GLYPH_COLS||row<0||(row+1)*GLYPH_PITCH>glyphSourceHeight){
      stats.glyphRejections++;return null;
    }
    const key=row*GLYPH_COLS+col,known=glyphCells.get(key);if(known)return known;
    if(glyphCells.size>=GLYPH_CAPACITY){stats.glyphRejections++;return null;}
    ensureGlyphCanvas();
    const slot=glyphCells.size,dx=(slot%GLYPH_COLS)*GLYPH_PITCH,
      dy=((slot/GLYPH_COLS)|0)*GLYPH_PITCH;
    glyphContext.drawImage(glyphSource,col*GLYPH_PITCH,row*GLYPH_PITCH,
      GLYPH_PITCH,GLYPH_PITCH,
      dx,dy,GLYPH_PITCH,GLYPH_PITCH);
    const cell={rect:[(dx+GLYPH_GUTTER)/GLYPH_WIDTH,(dy+GLYPH_GUTTER)/GLYPH_HEIGHT,
      GLYPH_CELL/GLYPH_WIDTH,-GLYPH_CELL/GLYPH_HEIGHT],sourceCol:col,sourceRow:row,
      destX:dx,destY:dy};
    glyphCells.set(key,cell);glyphDirty=true;return cell;
  }
  function uploadGlyphAtlas(){
    if(!glyphDirty)return !!glyphBindGroup;
    try{
      ensureGlyphCanvas();
      if(!glyphTexture){
        if(gpuTextureBytes()+pendingTextureBytes()+GLYPH_TEXTURE_BYTES>TEXTURE_BUDGET){
          stats.glyphRejections++;return false;
        }
        const made=uploadImage(glyphCanvas,GLYPH_WIDTH,GLYPH_HEIGHT,'primary Han glyph');
        glyphTexture=made.texture;glyphBytes=made.bytes;
        glyphBindGroup=device.createBindGroup({layout:surfaceLayout,entries:[
          {binding:0,resource:surfaceClamp},{binding:1,resource:glyphTexture.createView()},
        ]});
      }else{
        const levels=1+Math.floor(Math.log2(Math.max(GLYPH_WIDTH,GLYPH_HEIGHT)));
        writeTextureImage(glyphTexture,glyphCanvas,GLYPH_WIDTH,GLYPH_HEIGHT,levels,
          'primary Han glyph');
      }
      glyphDirty=false;stats.glyphUploads++;return true;
    }catch(err){return demote('failed','glyph-upload',err);}
  }
  function captureGlyphBatch(name,data,count,opt,mode){
    let sawGlyph=false,sawAlpha=false;
    for(let i=0;i<count;i++){
      const o=i*INSTANCE_FLOATS;
      if(Number(data[o+24])!==0)sawGlyph=true;
      if(Number(data[o+20])<1)sawAlpha=true;
    }
    if(!sawGlyph)return null;
    if(name!=='quad'||(mode!==0&&mode!==1)||opt.tex||opt.mat||opt.nrm||
        opt.doubleSided){stats.glyphRejections++;return false;}
    // This one translucent glyph class is command-coherent in the authored stream. Validate its
    // complete source role/material contract before growing staging or copying a single atlas
    // cell: a positive-glow tail or one malformed member must remain wholly in WebGL, never turn
    // into a filtered WebGPU subset. The compact cache key ignores role, while the rewritten
    // height below preserves that role's source sign.
    const alphaMode1=mode===1&&sawAlpha;
    if(alphaMode1){
      const round=opt.round===undefined?0:Number(opt.round),
        bevel=opt.bevel===undefined?0:Number(opt.bevel),
        snapshot={width:glyphSourceWidth,height:glyphSourceHeight},
        futureKeys=new Set(glyphCells.keys());
      if(!Number.isFinite(round)||round!==0||!Number.isFinite(bevel)||bevel!==0||
          !glyphSource||snapshot.width!==GLYPH_WIDTH||snapshot.height<GLYPH_PITCH||
          snapshot.height%GLYPH_PITCH!==0){stats.glyphRejections++;return false;}
      for(let i=0;i<count;i++){
        const o=i*INSTANCE_FLOATS,gloss=Number(data[o+19]),alpha=Number(data[o+20]),
          glow=Number(data[o+21]),u=Number(data[o+22]),v=Number(data[o+23]),
          width=Number(data[o+24]),height=Number(data[o+25]),
          cell=packetGlyphSourceCell(u,v,width,height,snapshot);
        if(!Number.isFinite(gloss)||gloss>.6||!Number.isFinite(alpha)||alpha<0||alpha>=1||
            !Number.isFinite(glow)||glow!==0||!cell){
          stats.glyphRejections++;return false;
        }
        futureKeys.add(cell.key);
      }
      if(futureKeys.size>GLYPH_CAPACITY){stats.glyphRejections++;return false;}
      const at=used;growStaging(at+count*INSTANCE_FLOATS);
      for(let i=0;i<count;i++){
        const o=i*INSTANCE_FLOATS,height=Number(data[o+25]),
          cell=glyphCell([data[o+22],data[o+23],data[o+24],-Math.abs(height)]),
          q=at+i*INSTANCE_FLOATS;
        if(!cell)throw new Error('preflighted glyph cell unavailable');
        for(let k=0;k<INSTANCE_FLOATS;k++)staging[q+k]=data[o+k];
        staging[q+22]=cell.rect[0];staging[q+23]=cell.rect[1];
        staging[q+24]=cell.rect[2];staging[q+25]=(height<0?-1:1)*Math.abs(cell.rect[3]);
      }
      used+=count*INSTANCE_FLOATS;
      draws.push({name,count,offset:at*4,glyph:true,mode,blend:'alpha',glyphEpoch});
      ordinaryExpectedDraws=draws.length;return true;
    }
    const at=used;growStaging(at+count*INSTANCE_FLOATS);let selected=0;
    for(let i=0;i<count;i++){
      const o=i*INSTANCE_FLOATS,gloss=Number(data[o+19]),alpha=Number(data[o+20]),
        glow=Number(data[o+21]),u=Number(data[o+22]),v=Number(data[o+23]),
        width=Number(data[o+24]),height=Number(data[o+25]);
      if(!Number.isFinite(gloss)||!Number.isFinite(alpha)||!Number.isFinite(glow)||
          !Number.isFinite(u)||!Number.isFinite(v)||!Number.isFinite(width)||
          !Number.isFinite(height)){
        stats.glyphRejections++;continue;
      }
      if(!(width>0&&height<0&&alpha===1)||(mode===1&&gloss>.6)){
        stats.glyphFiltered++;continue;
      }
      const cell=glyphCell([u,v,width,height]);if(!cell)continue;
      const q=at+selected*INSTANCE_FLOATS;
      for(let k=0;k<INSTANCE_FLOATS;k++)staging[q+k]=data[o+k];
      staging[q+22]=cell.rect[0];staging[q+23]=cell.rect[1];
      staging[q+24]=cell.rect[2];staging[q+25]=cell.rect[3];selected++;
    }
    if(!selected)return false;
    used+=selected*INSTANCE_FLOATS;
    draws.push({name,count:selected,offset:at*4,glyph:true,mode,blend:'opaque',glyphEpoch});
    ordinaryExpectedDraws=draws.length;return true;
  }
  function pbrMaterial(baseKey,pbrKey,normalAmount,fresh=null){
    const amount=Number.isFinite(normalAmount)?normalAmount:1;
    if(!ordinaryResourceLive(baseKey)||!ordinaryResourceLive(pbrKey))return null;
    for(const material of pbrMaterials)
      if(material.baseKey===baseKey&&material.pbrKey===pbrKey&&material.normalAmount===amount)
        return material;
    if(fresh)for(const material of fresh)
      if(material.baseKey===baseKey&&material.pbrKey===pbrKey&&material.normalAmount===amount)
        return material;
    const base=ordinaryTexture(baseKey),surface=ordinaryTexture(pbrKey);
    if(!base||base.kind!=='albedo'||!surface||surface.kind!=='pbr'||!surface.armTexture)return null;
    const material=makePacketPbr(baseKey,pbrKey,amount,base,surface);
    if(fresh)fresh.push(material);else pbrMaterials.add(material);return material;
  }
  function tilingMaterial(baseKey,normalKey,fresh=null){
    if(!ordinaryResourceLive(baseKey)||!ordinaryResourceLive(normalKey))return null;
    for(const material of tilingMaterials)
      if(material.baseKey===baseKey&&material.normalKey===normalKey)return material;
    if(fresh)for(const material of fresh)
      if(material.baseKey===baseKey&&material.normalKey===normalKey)return material;
    const base=ordinaryTexture(baseKey),normal=ordinaryTexture(normalKey);
    if(!base||base.kind!=='tiling'||!normal||normal.kind!=='tiling-normal'||!base.meanBuffer)
      return null;
    const material=makePacketTiling(baseKey,normalKey,base,normal);
    if(fresh)fresh.push(material);else tilingMaterials.add(material);return material;
  }
  // One selector serves the legacy comparison stream and the sealed-packet canary. Keeping the
  // reviewed material matrix in one place prevents a prepare-success claim from choosing a
  // different shader than the preview would use for the same resolved command.
  function ordinaryPipeline(draw,base,tiled,material,tiledMaterial){
    return draw.dome&&draw.mode===12?domePipeline
      :draw.glyph?(draw.mode===1
      ?(draw.blend==='alpha'?glyphMode1AlphaPipeline:glyphMode1Pipeline):glyphPipeline)
      :draw.mode===0&&draw.blend==='alpha'
        ?(!base&&!tiled&&!material&&!tiledMaterial
          ?(draw.bevel?mode0BevelAlphaPipeline:mode0AlphaPipeline):null)
      :draw.mode===0&&tiled&&!base&&!material&&!tiledMaterial
        ?(draw.bevel?tilingMode0BevelColorPipeline:tilingMode0ColorPipeline)
      :draw.mode===2?mode2Pipeline
      :draw.mode===5?mode5Pipeline
      :draw.mode===8?mode8Pipeline
      :draw.mode===1?(draw.blend==='alpha'
        ?(tiled?tilingMode1AlphaPipeline:mode1AlphaPipeline)
        :(tiled?tilingMode1Pipeline:mode1Pipeline))
      :draw.mode===3?(draw.bevel?tilingMode3BevelPipeline:tilingMode3Pipeline)
      :draw.mode===4?(tiled
        ?(tiledMaterial
          ?(draw.blend==='alpha'?tilingMode4AlphaPipeline:
            draw.bevel?tilingMode4BevelPipeline:tilingMode4Pipeline)
          :tilingMode4ColorPipeline)
        :mode4Pipeline)
      :draw.mode===6?(tiledMaterial
        ?(draw.bevel?tilingMode6BevelPipeline:tilingMode6Pipeline)
        :(draw.bevel?mode6BevelPipeline:mode6Pipeline))
      :draw.mode===9?(tiled
        ?(tiledMaterial?tilingMode9Pipeline:tilingMode9ColorPipeline)
        :mode9Pipeline)
      :draw.mode===10?(tiledMaterial?tilingMode10Pipeline:
        !base&&!tiled&&!material?mode10Pipeline:null)
      :draw.mode===11?(tiledMaterial?tilingMode11Pipeline:!tiled?mode11Pipeline:null)
      :draw.mode===13?(!base&&!tiled&&!material&&!tiledMaterial?mode13Pipeline:null)
      :draw.mode===14?(tiledMaterial?tilingMode14Pipeline:!tiled?mode14Pipeline:null)
      :draw.mode===15?(tiledMaterial?tilingMode15Pipeline:foliagePipeline)
      :draw.mode===7?(draw.blend==='alpha'
        ?(!tiled&&!tiledMaterial?(draw.bevel?mode7BevelAlphaPipeline:mode7AlphaPipeline):null)
        :tiledMaterial?(draw.bevel?tilingMode7BevelPipeline:tilingMode7Pipeline)
        :(draw.bevel?mode7BevelPipeline:mode7Pipeline))
      :tiledMaterial?(draw.bevel?tilingBevelPipeline:tilingPipeline)
      :material?pbrPipeline:base?texturedPipeline:draw.bevel?bevelPipeline:pipeline;
  }
  function packetFrameUniforms(header){
    const u=new Float32Array(FRAME_FLOATS);u.set(header.vp,0);
    const sun=header.sun,lights=header.lights,fog=header.fog;
    u.set([sun.dir[0],sun.dir[1],sun.dir[2],sun.amount],16);
    u.set([sun.color[0],sun.color[1],sun.color[2],0],20);
    u.set([header.sky[0],header.sky[1],header.sky[2],0],24);
    u.set([header.ground[0],header.ground[1],header.ground[2],lights.count],28);
    u.set([header.eye[0],header.eye[1],header.eye[2],header.indoor?1:0],32);
    u.set([header.bulb[0],header.bulb[1],header.bulb[2],header.bulbOn],36);
    u.set([header.white[0],header.white[1],header.white[2],header.expose],40);
    u.set([fog.color[0],fog.color[1],fog.color[2],fog.density],44);
    u.set([fog.near,header.glyphAssist?1:0,header.deckY,0],48);
    u.set([header.skyA[0],header.skyA[1],header.skyA[2],0],52);
    u.set([header.skyB[0],header.skyB[1],header.skyB[2],0],56);
    u.set([header.weather[0],header.weather[1],header.weather[2],header.time],60);
    u.set([header.leaf[0],header.leaf[1],header.leaf[2],0],64);
    for(let i=0;i<lights.count;i++){
      const at=68+i*8,p=i*3;
      u.set([lights.positions[p],lights.positions[p+1],lights.positions[p+2],lights.radii[i]],at);
      u.set([lights.colors[p],lights.colors[p+1],lights.colors[p+2],0],at+4);
    }
    return u;
  }
  const domeF32Equal=(left,right)=>Math.fround(Number(left))===Math.fround(Number(right));
  function domeInstanceMatches(data,at,eye,skyB){
    if(!data||data.length<at+INSTANCE_FLOATS||!eye||eye.length<3||!skyB||skyB.length<3)
      return false;
    for(let i=0;i<16;i++){
      const expected=i===0||i===5||i===10?760:i===15?1:
        i===12?eye[0]:i===13?eye[1]:i===14?eye[2]:0;
      if(!domeF32Equal(data[at+i],expected))return false;
    }
    for(let i=0;i<3;i++)if(!domeF32Equal(data[at+16+i],skyB[i]))return false;
    return domeF32Equal(data[at+19],0)&&domeF32Equal(data[at+20],1)&&
      domeF32Equal(data[at+21],0)&&domeF32Equal(data[at+22],0)&&
      domeF32Equal(data[at+23],0)&&domeF32Equal(data[at+24],0)&&
      domeF32Equal(data[at+25],0);
  }
  function makePacketPbr(baseKey,pbrKey,amount,base,surface){
    let buffer=null;
    try{
      buffer=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM,mappedAtCreation:true});
      new Float32Array(buffer.getMappedRange()).set([
        surface.roughness,surface.metallic,surface.armAO?2:1,amount]);
      buffer.unmap();
      const bindGroup=device.createBindGroup({layout:pbrLayout,entries:[
        {binding:0,resource:base.sampler},{binding:1,resource:base.texture.createView()},
        {binding:2,resource:surface.texture.createView()},
        {binding:3,resource:surface.armTexture.createView()},
        {binding:4,resource:{buffer}},
      ]});
      return {baseKey,pbrKey,normalAmount:amount,buffer,bindGroup};
    }catch(err){
      if(buffer&&buffer.destroy){try{buffer.destroy();}catch(_) {}}
      throw err;
    }
  }
  function makePacketTiling(baseKey,normalKey,base,normal){
    const bindGroup=device.createBindGroup({layout:tilingNormalLayout,entries:[
      {binding:0,resource:base.sampler},{binding:1,resource:base.texture.createView()},
      {binding:2,resource:normal.texture.createView()},
      {binding:5,resource:{buffer:base.meanBuffer}},
    ]});
    return {baseKey,normalKey,bindGroup};
  }
  function packetGlyphSourceCell(u,v,du,dv,snapshot){
    if(![u,v,du,dv].every(Number.isFinite)||du<=0||dv===0)return null;
    const px=u*snapshot.width-GLYPH_GUTTER,py=v*snapshot.height-GLYPH_GUTTER,
      col=Math.round(px/GLYPH_PITCH),row=Math.round(py/GLYPH_PITCH);
    if(Math.abs(px-col*GLYPH_PITCH)>.5||Math.abs(py-row*GLYPH_PITCH)>.5||
        Math.abs(du*snapshot.width-GLYPH_CELL)>.5||
        Math.abs(Math.abs(dv)*snapshot.height-GLYPH_CELL)>.5||
        col<0||col>=GLYPH_COLS||row<0||(row+1)*GLYPH_PITCH>snapshot.height)return null;
    return {key:row*GLYPH_COLS+col,col,row};
  }
  function packetGlyphCacheMatches(snapshot,cellsKey){
    const cache=packetGlyphCache;
    return !!cache&&cache.generation===snapshot.generation&&cache.source===snapshot.source&&
      cache.sourceVersion===snapshot.sourceVersion&&cache.epoch===snapshot.epoch&&
      cache.scene===snapshot.scene&&cache.sourceWidth===snapshot.width&&
      cache.sourceHeight===snapshot.height&&cache.cellsKey===cellsKey;
  }
  function acquirePacketGlyphCache(snapshot,cells){
    const cellsKey=cells.map(cell=>cell.key).join(',');
    if(packetGlyphCacheMatches(snapshot,cellsKey)){
      packetGlyphTotals.hits++;return packetGlyphCache;
    }
    destroyPacketGlyphCache();
    const rows=Math.ceil(cells.length/GLYPH_COLS),width=GLYPH_WIDTH,
      height=rows*GLYPH_PITCH,levels=1+Math.floor(Math.log2(Math.max(width,height))),
      pixelBytes=width*height*4,bytes=mipByteSize(width,height);
    if(!cells.length||cells.length>PACKET_GLYPH_CAPACITY||
        height>PACKET_GLYPH_MAX_HEIGHT||pixelBytes>PACKET_GLYPH_PIXEL_BUDGET||
        bytes>PACKET_GLYPH_TEXTURE_BUDGET)throw new Error('glyph-cache-budget');
    let privateCanvas=null,pixels=null,texture=null;
    try{
      privateCanvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):
        document.createElement('canvas');
      privateCanvas.width=width;privateCanvas.height=height;
      const two=privateCanvas.getContext('2d');
      if(!two||typeof two.getImageData!=='function')throw new Error('glyph-pixels-unavailable');
      two.globalCompositeOperation='source-over';two.fillStyle='#000';
      two.fillRect(0,0,width,height);
      const mapping=new Map();
      for(let slot=0;slot<cells.length;slot++){
        const cell=cells[slot],dx=(slot%GLYPH_COLS)*GLYPH_PITCH,
          dy=((slot/GLYPH_COLS)|0)*GLYPH_PITCH;
        two.drawImage(snapshot.source,cell.col*GLYPH_PITCH,cell.row*GLYPH_PITCH,
          GLYPH_PITCH,GLYPH_PITCH,dx,dy,GLYPH_PITCH,GLYPH_PITCH);
        mapping.set(cell.key,slot);
      }
      const image=two.getImageData(0,0,width,height),raw=image&&image.data;
      if(!raw||raw.length!==pixelBytes)throw new Error('glyph-pixels-invalid');
      pixels=new Uint8Array(pixelBytes);pixels.set(raw);
      privateCanvas.width=privateCanvas.height=0;privateCanvas=null;
      texture=device.createTexture({label:'packet glyph atlas',size:[width,height],
        mipLevelCount:levels,format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|
          GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
      const bindGroup=device.createBindGroup({layout:surfaceLayout,entries:[
        {binding:0,resource:surfaceClamp},{binding:1,resource:texture.createView()},
      ]});
      packetGlyphCache={generation:snapshot.generation,source:snapshot.source,
        sourceVersion:snapshot.sourceVersion,epoch:snapshot.epoch,scene:snapshot.scene,
        sourceWidth:snapshot.width,sourceHeight:snapshot.height,cellsKey,
        cells:cells.length,width,height,levels,pixelBytes,bytes,pixels,texture,bindGroup,
        mapping,uploadPending:true,gpuReady:false};
      packetGlyphTotals.builds++;return packetGlyphCache;
    }catch(err){
      if(privateCanvas){try{privateCanvas.width=privateCanvas.height=0;}catch(_) {}}
      if(texture&&texture.destroy){try{texture.destroy();}catch(_) {}}
      if(pixels&&pixels.fill){try{pixels.fill(0);}catch(_) {}}
      throw err;
    }
  }
  function packetGlyphHash(hash,value){
    const scaled=Math.round(Math.fround(value)*0x100000)|0;
    return Math.imul((hash^scaled)>>>0,16777619)>>>0;
  }
  // Resolve the complete legacy ordinary mirror before target allocation or a presentation-time
  // queue write. Newly derived groups stay transaction-local until every later command and the
  // shared glyph atlas are ready, so one released resource cannot leave a partially cached or
  // partially visible comparison frame.
  function resolveOrdinaryFrame(){
    const freshPbr=[],freshTiling=[],resolved=[];let published=false,
      hasGlyph=false,glyphSequence=-1,instances=0;
    const rollback=()=>{
      if(published)return;
      for(const material of freshPbr)
        if(material.buffer&&material.buffer.destroy){try{material.buffer.destroy();}catch(_) {}}
      freshPbr.length=freshTiling.length=0;
    };
    const reject=(reason,sequence)=>{rollback();return {ok:false,reason,sequence};};
    try{
      ordinaryExpectedDraws=draws.length;
      for(let sequence=0;sequence<draws.length;sequence++){
        const draw=draws[sequence],meshRecord=meshes.get(draw.name);
        if(!meshRecord)return reject('ordinary-mesh-unavailable',sequence);
        if(draw.glyph){
          if(draw.glyphEpoch!==glyphEpoch)return reject('ordinary-glyph-stale',sequence);
          const want=ordinaryPipeline(draw,null,null,null,null);
          if(!want)return reject('ordinary-pipeline-unavailable',sequence);
          if(!hasGlyph)glyphSequence=sequence;
          hasGlyph=true;instances+=draw.count;
          resolved.push({draw,meshRecord,pipeline:want,surface:null});continue;
        }
        const base=draw.surfaceKey&&ordinaryTexture(draw.surfaceKey),
          tiled=draw.tilingKey&&ordinaryTexture(draw.tilingKey),
          pbrSurface=draw.pbrKey&&ordinaryTexture(draw.pbrKey),
          tilingNormal=draw.tilingNormalKey&&ordinaryTexture(draw.tilingNormalKey);
        if(draw.surfaceKey&&(!base||base.kind!=='albedo')||
            draw.tilingKey&&(!tiled||tiled.kind!=='tiling')||
            draw.pbrKey&&(!pbrSurface||pbrSurface.kind!=='pbr'||!pbrSurface.armTexture)||
            draw.tilingNormalKey&&(!tilingNormal||tilingNormal.kind!=='tiling-normal'))
          return reject('ordinary-texture-unavailable',sequence);
        const material=draw.pbrKey
            ?pbrMaterial(draw.surfaceKey,draw.pbrKey,draw.normalAmount,freshPbr):null,
          tiledMaterial=draw.tilingNormalKey
            ?tilingMaterial(draw.tilingKey,draw.tilingNormalKey,freshTiling):null;
        if(draw.pbrKey&&!material||draw.tilingNormalKey&&!tiledMaterial)
          return reject('ordinary-material-unavailable',sequence);
        const want=ordinaryPipeline(draw,base,tiled,material,tiledMaterial),
          surface=tiledMaterial||material||tiled||base||null;
        if(!want)return reject('ordinary-pipeline-unavailable',sequence);
        if(surface&&!surface.bindGroup)return reject('ordinary-material-unavailable',sequence);
        instances+=draw.count;
        resolved.push({draw,meshRecord,pipeline:want,surface});
      }
      return {ok:true,draws:resolved,hasGlyph,glyphSequence,instances,
        rollback,
        publish(){if(published)return false;
          for(const material of freshPbr)pbrMaterials.add(material);
          for(const material of freshTiling)tilingMaterials.add(material);
          published=true;return true;},
        resolveGlyph(){if(!hasGlyph)return true;
          if(!glyphBindGroup)return false;
          for(const entry of resolved)if(entry.draw.glyph)entry.surface=glyphBindGroup;
          return true;}};
    }catch(err){rollback();throw err;}
  }
  function packetPrepareStatus(){
    const glyph=packetGlyphCache,plans=preparedPacketPlan&&preparedPacketPlan.draws||[];
    let glyphPreparedPlans=0,glyphBoundPlans=0;
    for(const plan of plans)if(plan.glyph){glyphPreparedPlans++;
      if(glyph&&plan.bindGroup===glyph.bindGroup)glyphBoundPlans++;}
    return {mode:packetRecordRequested?'canary':'off',
      scope:'ordinary-opaque-mode12-dome-mode13-roof-tile-box-mode10-asphalt-quad-mode0-color-only-tiling-mode0-alpha-default-mode1-alpha-mode2-contact-mode4-alpha-plaster-mode5-8-additive-mode7-alpha-woven-full-role-glyph-mode1-alpha-glyph',
      authority:'webgl2',
      ...packetPrepareLast,pending:preparedPacketToken?1:0,...packetPrepareTotals,
      glyphCapacity:PACKET_GLYPH_CAPACITY,glyphFormat:'rgba8unorm',
      glyphBudgetScope:'record-mode-private-cache',
      glyphPixelBudget:PACKET_GLYPH_PIXEL_BUDGET,
      glyphTextureBudget:PACKET_GLYPH_TEXTURE_BUDGET,
      glyphCacheResident:!!glyph,glyphCacheCells:glyph?glyph.cells:0,
      glyphCacheSize:glyph?[glyph.width,glyph.height]:[0,0],
      glyphCachePixelBytes:glyph?glyph.pixelBytes:0,glyphCacheBytes:glyph?glyph.bytes:0,
      glyphUploadPending:!!glyph&&glyph.uploadPending===true,glyphGpuReady:!!glyph&&glyph.gpuReady===true,
      glyphPreparedPlans,glyphBoundPlans,
      glyphCacheHits:packetGlyphTotals.hits,glyphCacheBuilds:packetGlyphTotals.builds,
      glyphCacheDestroys:packetGlyphTotals.destroys,
      canaryQueueWrites:0,canarySubmits:0};
  }
  // Synchronously prove that one complete immutable ordinary stream can resolve. This is not a
  // submission path: it never reaches the queue, swap-chain canvas context, target allocator,
  // legacy glyph canvas/staging, draw arrays, or shared instance arena. WebGL claims and consumes
  // the packet immediately afterwards.
  function preparePacket(packet){
    if(!packetRecordRequested)return null;
    if(preparedPacketToken)discardPreparedPacket(preparedPacketToken);
    packetPrepareTotals.attempts++;
    let frameId=0,failedSequence=-1,resolvedCommands=0,resolvedInstances=0,
      phase='packet-invalid',instanceData=null,uniforms=null,claimed=false,
      glyphCommands=0,glyphInstances=0,glyphPositive=0,glyphNegative=0,glyphRewriteHash=0;
    const meshRecords=new Map(),resourceRecords=new Map(),derivedRecords=new Set(),
      glyphCells=new Map(),freshPbr=[],freshTiling=[],validated=[],drawPlans=[];
    const reject=(why,sequence=failedSequence)=>{const error=new Error(why);
      error.packetReason=why;error.packetSequence=sequence;throw error;};
    const rollback=()=>{
      for(const material of freshPbr){pbrMaterials.delete(material);
        if(material.buffer&&material.buffer.destroy){try{material.buffer.destroy();}catch(_) {}}}
      for(const material of freshTiling)tilingMaterials.delete(material);
    };
    try{
      if(state!=='ready'||!device)reject('backend-not-ready');
      if(typeof FramePacket==='undefined'||!packet||typeof packet!=='object')
        reject('packet-untrusted');
      frameId=Number(packet.frameId);
      if(!Number.isSafeInteger(frameId)||frameId<1||FramePacket.current(frameId)!==packet)
        reject('packet-untrusted');
      if(packet.version!==FramePacket.VERSION||packet.version!==1)
        reject('packet-version');
      if(!Array.isArray(packet.commands)||!Number.isSafeInteger(packet.floats)||packet.floats<0||
          !Number.isSafeInteger(packet.instances)||packet.instances<0||
          typeof packet.read!=='function')reject('packet-shape');
      phase='packet-claim';
      if(FramePacket.claim(frameId,'webgpu')!==packet)reject('packet-claimed');
      claimed=true;
      phase='packet-read';instanceData=packet.read(0,packet.floats);
      if(!(instanceData instanceof Float32Array)||instanceData.length!==packet.floats)
        reject('packet-read');
      phase='packet-header';uniforms=packetFrameUniforms(packet.header);
      const startGeneration=generation,startRevision=ordinaryRevision,
        glyphSnapshot={source:glyphSource,width:glyphSourceWidth,height:glyphSourceHeight,
          sourceVersion:glyphSourceVersion,epoch:glyphEpoch,scene:glyphScene,
          generation:startGeneration};
      let nextFloat=0,totalInstances=0;
      // Pass one is pure packet/schema validation. In particular it does not resolve a GPU map,
      // derive a bind group, touch either legacy glyph canvas, or allocate the packet cache. A
      // late malformed command therefore rejects before an earlier valid command creates native
      // state. Glyph and plain commands may coexist, but one command may never mix their records.
      for(let sequence=0;sequence<packet.commands.length;sequence++){
        failedSequence=sequence;phase='command-invalid';
        const command=packet.commands[sequence],material=command&&command.material;
        if(!command||command.kind!=='instances'||command.sequence!==sequence||!material||
            !Number.isSafeInteger(command.firstFloat)||command.firstFloat!==nextFloat||
            !Number.isSafeInteger(command.count)||command.count<1)
          reject('command-shape',sequence);
        const floats=command.count*INSTANCE_FLOATS;
        if(nextFloat+floats>instanceData.length)reject('command-range',sequence);
        if(material.pass!=='color'||(material.blend!=='opaque'&&material.blend!=='alpha'&&
            material.blend!=='additive'))
          reject('unsupported-blend',sequence);
        const mode=material.mode,dome=mode===12;
        if(!dome&&mode!==0&&mode!==1&&mode!==2&&mode!==3&&mode!==4&&mode!==5&&mode!==6&&mode!==7&&
            mode!==8&&mode!==9&&mode!==10&&mode!==11&&mode!==13&&mode!==14&&mode!==15)
          reject('unsupported-mode',sequence);
        const contactShadow=mode===2,additiveGlow=mode===5||mode===8,
          depthReadOnly=contactShadow||additiveGlow;
        const surfaceKey=material.textureId||0,tilingKey=material.materialId||0,
          normalKey=material.normalId||0;
        if(dome){
          if(sequence!==0||command.firstFloat!==0||command.direct!==true||command.count!==1||
              command.mesh!=='ball'||packet.header.indoor!==false||
              material.blend!=='opaque'||material.depthWrite!==false||
              material.cull!=='none'||material.doubleSided!==true||
              surfaceKey||tilingKey||normalKey||material.round!==0||material.bevel!==0||
              !domeF32Equal(material.matScale,1)||!domeF32Equal(material.matAmount,.7)||
              !domeF32Equal(material.normalAmount,1)||
              !domeInstanceMatches(instanceData,nextFloat,packet.header.eye,packet.header.skyB))
            reject('dome-contract',sequence);
        }else{
          if(material.depthWrite!==(depthReadOnly?false:true))
            reject('unsupported-depth-write',sequence);
          if(material.cull!=='back'||material.doubleSided!==false)
            reject('unsupported-cull',sequence);
        }
        if(surfaceKey&&tilingKey)reject('material-contract',sequence);
        if(normalKey&&!surfaceKey&&!tilingKey)reject('material-contract',sequence);
        const alphaBlend=material.blend==='alpha',additiveBlend=material.blend==='additive';
        let commandGlyphs=0,commandPlain=0,commandAlpha=0;
        for(let i=0;i<command.count;i++){
          const at=nextFloat+i*INSTANCE_FLOATS,
            instanceGloss=instanceData[at+19],alpha=instanceData[at+20],
            instanceGlow=instanceData[at+21];
          if(!Number.isFinite(alpha)||alpha<0||alpha>1)reject('invalid-alpha',sequence);
          if(mode===10&&(alpha!==1||instanceData[at+21]!==0))
            reject('mode10-quad-contract',sequence);
          if(mode===13&&(!Number.isFinite(instanceGloss)||alpha!==1||instanceGlow!==0))
            reject('mode13-box-contract',sequence);
          if(alpha<1)commandAlpha++;
          const du=instanceData[at+24];
          if(mode===10&&(instanceData[at+22]!==0||instanceData[at+23]!==0||du!==0||
              instanceData[at+25]!==0))reject('mode10-quad-contract',sequence);
          if(mode===13&&(instanceData[at+22]!==0||instanceData[at+23]!==0||du!==0||
              instanceData[at+25]!==0))reject('mode13-box-contract',sequence);
          if(du===0){commandPlain++;continue;}
          if(contactShadow)reject('contact-shadow-contract',sequence);
          if(additiveGlow)reject('additive-glow-contract',sequence);
          const cell=packetGlyphSourceCell(instanceData[at+22],instanceData[at+23],du,
            instanceData[at+25],glyphSnapshot);
          if(!glyphSnapshot.source||glyphSnapshot.width!==GLYPH_WIDTH||
              glyphSnapshot.height<GLYPH_PITCH||
              glyphSnapshot.height%GLYPH_PITCH!==0)reject('glyph-source-unavailable',sequence);
          if(!cell)reject('glyph-rect-invalid',sequence);
          const glyphGloss=instanceData[at+19],glyphGlow=instanceData[at+21];
          if(!Number.isFinite(glyphGloss)||!Number.isFinite(glyphGlow))
            reject('glyph-material-contract',sequence);
          if(mode===1&&glyphGloss>.6)reject('glyph-gloss',sequence);
          if(mode===1&&alphaBlend&&(alpha>=1||glyphGlow!==0))
            reject('alpha-glyph-contract',sequence);
          commandGlyphs++;glyphInstances++;
          if(instanceData[at+25]<0)glyphNegative++;else glyphPositive++;
          if(!glyphCells.has(cell.key)){
            glyphCells.set(cell.key,cell);
            if(glyphCells.size>PACKET_GLYPH_CAPACITY)reject('glyph-capacity',sequence);
          }
        }
        if(additiveGlow&&!additiveBlend)reject('additive-glow-blend',sequence);
        if(additiveBlend&&!additiveGlow)reject('unsupported-blend',sequence);
        if(commandAlpha&&!alphaBlend&&!additiveBlend)reject('unsupported-alpha',sequence);
        if(!commandAlpha&&alphaBlend&&!contactShadow)reject('empty-alpha-command',sequence);
        if(alphaBlend&&mode!==0&&mode!==1&&mode!==2&&mode!==4&&mode!==7)
          reject('unsupported-alpha-mode',sequence);
        if(contactShadow&&!alphaBlend)reject('contact-shadow-blend',sequence);
        if(commandGlyphs&&commandPlain)reject('mixed-glyph-plain',sequence);
        const glyph=commandGlyphs>0,soft=command.mesh==='softBox',bevel=material.bevel>0,
          usesTilingNormal=!!tilingKey&&!!normalKey&&mode!==1,
          colorOnlyTiling=!!tilingKey&&!normalKey&&(mode===0||mode===4||mode===9),
          colorOnlyMode0=mode===0&&!alphaBlend&&colorOnlyTiling,
          alphaDefault=mode===0&&alphaBlend,alphaPlaster=mode===4&&alphaBlend,
          alphaWoven=mode===7&&alphaBlend;
        if(dome){
          // The exact synthetic sky wrapper was validated above. Generic mode-12 authoring
          // deliberately remains outside this renderer boundary.
        }else if(mode===10){
          const plain=!surfaceKey&&!tilingKey&&!normalKey,
            completeTiling=!surfaceKey&&!!tilingKey&&!!normalKey&&usesTilingNormal;
          if(glyph||command.mesh!=='quad'||!plain&&!completeTiling||
              material.round!==0||material.bevel!==0||
              plain&&(!domeF32Equal(material.matScale,1)||
                !domeF32Equal(material.matAmount,.7)||
                !domeF32Equal(material.normalAmount,1)))
            reject('mode10-quad-contract',sequence);
        }else if(mode===13){
          if(command.direct!==false||glyph||command.mesh!=='box'||surfaceKey||tilingKey||
              normalKey||material.blend!=='opaque'||material.round!==0||material.bevel!==0||
              !domeF32Equal(material.matScale,1)||
              !domeF32Equal(material.matAmount,.7)||
              !domeF32Equal(material.normalAmount,1))
            reject('mode13-box-contract',sequence);
        }else if(alphaDefault){
          const defaultShape=command.mesh==='box'||command.mesh==='ball'||soft||
              command.mesh==='quad'||command.mesh==='capsule'||command.mesh==='taper'||
              command.mesh==='cyl',radius=Math.fround(material.round),
            reviewedRadius=soft&&(radius===Math.fround(.035)||radius===Math.fround(.040)||
              radius===Math.fround(.045)||radius===Math.fround(.080)||
              radius===Math.fround(.180)),
            wantBevel=command.mesh==='box'?Math.fround(.013):0;
          if(command.direct!==true||command.count!==1||glyph||!defaultShape||
              surfaceKey||tilingKey||normalKey||soft&&!reviewedRadius||!soft&&radius!==0||
              Math.fround(material.bevel)!==wantBevel)
            reject('alpha-default-contract',sequence);
        }else if(colorOnlyMode0){
          const reviewedShape=command.mesh==='box'||command.mesh==='quad'||command.mesh==='cyl',
            wantBevel=command.mesh==='box'?Math.fround(.013):0;
          if(glyph||!reviewedShape||surfaceKey||!tilingKey||normalKey||
              material.round!==0||Math.fround(material.bevel)!==wantBevel||
              Math.fround(material.normalAmount)!==Math.fround(1))
            reject('mode0-color-only-contract',sequence);
        }else if(contactShadow){
          if(glyph||command.mesh!=='quad'||surfaceKey||tilingKey||normalKey||
              material.round!==0||material.bevel!==0)
            reject('contact-shadow-contract',sequence);
        }else if(additiveGlow){
          if(glyph||command.mesh!=='quad'||surfaceKey||tilingKey||normalKey||
              material.round!==0||material.bevel!==0)
            reject('additive-glow-contract',sequence);
        }else if(alphaPlaster){
          const radius=Math.fround(material.round),reviewedRadius=soft&&
            (radius===Math.fround(.006)||radius===Math.fround(.008)||
             radius===Math.fround(.009)||radius===Math.fround(.010));
          if(command.direct!==true||command.count!==1||glyph||
              command.mesh!=='ball'&&!soft||surfaceKey||!usesTilingNormal||
              material.bevel!==0||soft&&!reviewedRadius||!soft&&radius!==0||
              Math.fround(material.matScale)!==Math.fround(.62)||
              Math.fround(material.matAmount)!==Math.fround(.008)||
              Math.fround(material.normalAmount)!==Math.fround(1))
            reject('alpha-plaster-contract',sequence);
        }else if(alphaWoven){
          const wovenShape=command.mesh==='box'||command.mesh==='ball'||soft||
            command.mesh==='quad'||command.mesh==='capsule'||command.mesh==='taper'||
            command.mesh==='cyl',wantRound=soft?Math.fround(.055):0,
            wantBevel=command.mesh==='box'?Math.fround(.013):0;
          if(command.direct!==true||command.count!==1||glyph||!wovenShape||
              surfaceKey||tilingKey||normalKey||
              Math.fround(material.round)!==wantRound||
              Math.fround(material.bevel)!==wantBevel)
            reject('alpha-woven-contract',sequence);
        }else if(glyph){
          if(alphaBlend&&(mode!==1||commandAlpha!==command.count))
            reject('alpha-glyph-contract',sequence);
          if(command.mesh!=='quad'||(mode!==0&&mode!==1)||surfaceKey||tilingKey||normalKey||
              material.round!==0||material.bevel!==0)
            reject('glyph-material-contract',sequence);
          glyphCommands++;
        }else{
          if(soft?!(material.round>0):material.round!==0)reject('round-contract',sequence);
          if(bevel&&mode!==0&&mode!==3&&mode!==4&&mode!==6&&mode!==7)
            reject('material-contract',sequence);
          if(command.mesh!=='box'&&bevel||surfaceKey&&mode!==0||surfaceKey&&(soft||bevel))
            reject('material-contract',sequence);
          if(mode===3&&!usesTilingNormal||
              (mode===0||mode===6||mode===7||mode===11||mode===14||mode===15)&&
                tilingKey&&!usesTilingNormal||
              mode===4&&bevel&&!usesTilingNormal||
              tilingKey&&!usesTilingNormal&&mode!==1&&!colorOnlyTiling)
            reject('material-contract',sequence);
        }
        validated.push({sequence,command,material,mode,dome,glyph,soft,bevel,alphaBlend,surfaceKey,tilingKey,
          normalKey,usesTilingNormal,firstFloat:nextFloat});
        nextFloat+=floats;totalInstances+=command.count;resolvedCommands++;
        resolvedInstances=totalInstances;
      }
      failedSequence=-1;
      if(nextFloat!==instanceData.length||totalInstances!==packet.instances)
        reject('packet-totals');
      // Pass two resolves every ordinary generation and pipeline, still without deriving native
      // materials or building packet glyph storage. All handles must survive this complete pass.
      for(const item of validated){
        failedSequence=item.sequence;phase='resource-validation';
        const {command,material,mode,glyph,surfaceKey,tilingKey,normalKey}=item,
          mesh=meshes.get(command.mesh);
        if(!mesh)reject('mesh-unavailable',item.sequence);
        meshRecords.set(command.mesh,mesh);item.mesh=mesh;
        if(glyph){
          const draw={mode,bevel:false,glyph:true,blend:material.blend},
            want=ordinaryPipeline(draw,null,null,null,null);
          if(!want)reject('pipeline-unavailable',item.sequence);
          drawPlans.push({sequence:item.sequence,offset:item.firstFloat*4,count:command.count,
            meshRecord:mesh,pipeline:want,surface:null,glyph:true,item});continue;
        }
        const base=surfaceKey?ordinaryTexture(surfaceKey):null,
          tiled=tilingKey?ordinaryTexture(tilingKey):null,
          normal=normalKey?ordinaryTexture(normalKey):null;
        if(surfaceKey&&!base||tilingKey&&!tiled||normalKey&&!normal)
          reject('resource-unavailable',item.sequence);
        if(base&&base.kind!=='albedo'||tiled&&tiled.kind!=='tiling'||
            base&&normal&&normal.kind!=='pbr'||tiled&&normal&&normal.kind!=='tiling-normal'||
            normal&&normal.kind==='pbr'&&!normal.armTexture||tiled&&normal&&!tiled.meanBuffer)
          reject('resource-kind',item.sequence);
        for(const [key,record] of [[surfaceKey,base],[tilingKey,tiled],[normalKey,normal]])
          if(key)resourceRecords.set(key,record);
        item.base=base;item.tiled=tiled;item.normal=normal;
        const needsPbr=!!base&&!!normal,needsTiling=item.usesTilingNormal,
          draw={mode,dome:item.dome,bevel:item.bevel,glyph:false,blend:material.blend},
          want=ordinaryPipeline(draw,base,tiled,needsPbr?true:null,needsTiling?true:null);
        if(!want)reject('pipeline-unavailable',item.sequence);
        drawPlans.push({sequence:item.sequence,offset:item.firstFloat*4,count:command.count,
          meshRecord:mesh,pipeline:want,surface:needsPbr||needsTiling?null:tiled||base||null,
          glyph:false,item});
      }
      if(generation!==startGeneration||ordinaryRevision!==startRevision||
          FramePacket.current(frameId)!==packet)reject('packet-stale');
      for(const [name,record] of meshRecords)if(meshes.get(name)!==record)reject('packet-stale');
      for(const [key,record] of resourceRecords)if(ordinaryTexture(key)!==record)
        reject('packet-stale');
      if(glyphCommands&&(glyphSource!==glyphSnapshot.source||
          glyphSourceVersion!==glyphSnapshot.sourceVersion||glyphEpoch!==glyphSnapshot.epoch||
          glyphScene!==glyphSnapshot.scene))reject('glyph-source-stale');
      // Only now, after both complete validation passes, may private derived/native state exist.
      const stagedPbr=(baseKey,pbrKey,amount,base,surface)=>{
        for(const material of pbrMaterials)
          if(material.baseKey===baseKey&&material.pbrKey===pbrKey&&
              material.normalAmount===amount)return material;
        for(const material of freshPbr)
          if(material.baseKey===baseKey&&material.pbrKey===pbrKey&&
              material.normalAmount===amount)return material;
        phase='native-material';const made=makePacketPbr(baseKey,pbrKey,amount,base,surface);
        freshPbr.push(made);return made;
      };
      const stagedTiling=(baseKey,normalKey,base,normal)=>{
        for(const material of tilingMaterials)
          if(material.baseKey===baseKey&&material.normalKey===normalKey)return material;
        for(const material of freshTiling)
          if(material.baseKey===baseKey&&material.normalKey===normalKey)return material;
        phase='native-material';const made=makePacketTiling(baseKey,normalKey,base,normal);
        freshTiling.push(made);return made;
      };
      for(const plan of drawPlans){
        const item=plan.item;if(item.glyph)continue;
        for(let i=0;i<item.command.count;i++){
          const at=item.firstFloat+i*INSTANCE_FLOATS;
          instanceData[at+22]=item.soft?item.material.round:item.bevel?-item.material.bevel:0;
          instanceData[at+23]=item.tiled?item.material.matScale:0;
          instanceData[at+24]=item.usesTilingNormal?-item.material.normalAmount:0;
          instanceData[at+25]=item.tiled?item.material.matAmount:0;
        }
        const pbr=item.base&&item.normal?stagedPbr(item.surfaceKey,item.normalKey,
            item.material.normalAmount,item.base,item.normal):null,
          tiledMaterial=item.usesTilingNormal?stagedTiling(item.tilingKey,item.normalKey,
            item.tiled,item.normal):null,
          draw={mode:item.mode,dome:item.dome,bevel:item.bevel,glyph:false,
            blend:item.material.blend};
        plan.pipeline=ordinaryPipeline(draw,item.base,item.tiled,pbr,tiledMaterial);
        plan.surface=pbr||tiledMaterial||item.tiled||item.base||null;
        if(pbr)derivedRecords.add(pbr);if(tiledMaterial)derivedRecords.add(tiledMaterial);
      }
      let glyphCache=null;
      if(glyphCommands){
        phase='glyph-cache';
        const cells=[...glyphCells.values()].sort((a,b)=>a.key-b.key);
        glyphCache=acquirePacketGlyphCache(glyphSnapshot,cells);
        glyphRewriteHash=2166136261;
        for(const item of validated)if(item.glyph){
          for(let i=0;i<item.command.count;i++){
            const at=item.firstFloat+i*INSTANCE_FLOATS,
              cell=packetGlyphSourceCell(instanceData[at+22],instanceData[at+23],
                instanceData[at+24],instanceData[at+25],glyphSnapshot),
              slot=cell&&glyphCache.mapping.get(cell.key);
            if(!Number.isInteger(slot))reject('glyph-cache-map',item.sequence);
            const height=glyphCache.height,sign=instanceData[at+25]<0?-1:1;
            instanceData[at+22]=((slot%GLYPH_COLS)*GLYPH_PITCH+GLYPH_GUTTER)/GLYPH_WIDTH;
            instanceData[at+23]=(((slot/GLYPH_COLS)|0)*GLYPH_PITCH+GLYPH_GUTTER)/height;
            instanceData[at+24]=GLYPH_CELL/GLYPH_WIDTH;
            instanceData[at+25]=sign*GLYPH_CELL/height;
            for(let k=22;k<26;k++)glyphRewriteHash=packetGlyphHash(glyphRewriteHash,
              instanceData[at+k]);
          }
        }
        for(const plan of drawPlans)if(plan.glyph)plan.bindGroup=glyphCache.bindGroup;
      }
      for(const plan of drawPlans)if(!plan.glyph)
        plan.bindGroup=plan.surface?plan.surface.bindGroup:null;
      const token=Object.freeze(Object.assign(Object.create(null),{frameId}));
      const finalDrawPlans=drawPlans.map(plan=>Object.freeze({sequence:plan.sequence,
        offset:plan.offset,count:plan.count,meshRecord:plan.meshRecord,pipeline:plan.pipeline,
        glyph:plan.glyph,bindGroup:plan.bindGroup}));
      const plan=Object.freeze({frameId,generation:startGeneration,revision:startRevision,
        packet,clear:Object.freeze(packet.header.clear.slice()),uniforms,instanceData,
        draws:Object.freeze(finalDrawPlans),glyphCache,glyphUploadPending:!!glyphCache});
      phase='material-publish';
      for(const material of freshPbr)pbrMaterials.add(material);
      for(const material of freshTiling)tilingMaterials.add(material);
      preparedPacketToken=token;preparedPacketPlan=plan;packetPrepareTotals.successes++;
      packetPrepareLast={outcome:'prepared',frameId,reason:'',failedSequence:-1,
        commands:finalDrawPlans.length,instances:totalInstances,floats:instanceData.length,
        meshes:meshRecords.size,resources:resourceRecords.size,materials:derivedRecords.size,
        glyphCommands,glyphInstances,glyphCells:glyphCells.size,glyphPositive,glyphNegative,
        glyphRewriteHash};
      return token;
    }catch(err){
      if(claimed){try{FramePacket.release(frameId,'webgpu');}catch(_){}claimed=false;}
      rollback();destroyPacketGlyphCache();packetPrepareTotals.rejections++;
      const why=String(err&&err.packetReason||phase||'packet-prepare-failed').slice(0,96),
        sequence=Number.isInteger(err&&err.packetSequence)?err.packetSequence:failedSequence;
      packetPrepareLast={outcome:'rejected',frameId,reason:why,failedSequence:sequence,
        commands:resolvedCommands,instances:resolvedInstances,
        floats:instanceData&&instanceData.length||0,meshes:meshRecords.size,
        resources:resourceRecords.size,materials:derivedRecords.size,
        glyphCommands,glyphInstances,glyphCells:glyphCells.size,glyphPositive,glyphNegative,
        glyphRewriteHash:0};
      preparedPacketToken=preparedPacketPlan=null;return null;
    }
  }
  function captureBatch(name,data,count,opt={},direct=false) {
    if (state !== 'ready' || !frameOpen || !count || !data ||
        data.length < count*INSTANCE_FLOATS || !meshes.has(name)) return false;
    try {
      // Keep the port deliberately narrow: ordinary opaque batches, mode-1 straight alpha,
      // the strict outdoor dome, depth-tested contact shadows, additive light pools/window
      // patches, asphalt, wood, woven upholstery, paving, grey brick, painted render, foliage, and
      // reviewed static glTF PBR.
      // Only the reviewed zero-glow mode-1 alpha glyph class crosses this seam; positive-glow
      // glyphs, other blended modes, and the remaining procedural materials stay in WebGL.
      const mode=Number(opt.mode)||0,roofTile=mode===13,
        depthWrite=opt.previewDepthWrite===undefined?true:opt.previewDepthWrite,
        additive=opt.previewAdditive===undefined?false:opt.previewAdditive,
        cull=opt.previewCull===undefined?'back':opt.previewCull;
      const domeResult=captureDome(name,data,count,opt,direct,depthWrite,additive,cull);
      if(domeResult!==null)return domeResult;
      const contactShadow=mode===2,additiveGlow=mode===5||mode===8,
        depthReadOnly=contactShadow||additiveGlow;
      if(depthWrite!==(depthReadOnly?false:true)||additive!==additiveGlow||cull!=='back')
        return false;
      const glyphResult=captureGlyphBatch(name,data,count,opt,mode);
      if(glyphResult!==null)return glyphResult;
      // Mode 2 creates alpha in the fragment falloff even if every authored instance alpha is one.
      let alphaBlend=contactShadow;
      for (let i=0;i<count;i++) {
        const o=i*INSTANCE_FLOATS;
        const gloss=Number(data[o+19]),alpha=Number(data[o+20]),glow=Number(data[o+21]),
          glyphWidth=Number(data[o+24]);
        if(!Number.isFinite(gloss)||!Number.isFinite(alpha)||!Number.isFinite(glow)||
            !Number.isFinite(glyphWidth)||alpha<0||alpha>1||glyphWidth!==0)return false;
        if(mode===10&&(alpha!==1||glow!==0))return false;
        if(roofTile&&(alpha!==1||glow!==0||data[o+22]!==0||data[o+23]!==0||
            data[o+24]!==0||data[o+25]!==0))return false;
        if(alpha<1)alphaBlend=true;
      }
      if(alphaBlend&&mode!==0&&mode!==1&&mode!==2&&mode!==4&&mode!==7&&!additiveGlow)
        return false;
      // WebGL deliberately treats a deferred material name as no texture. Campus can retain that
      // name in a sealed foliage batch until its assets resolve, so mirror the same flat-colour
      // result. An unknown object handle remains a real missing GPU resource and fails closed.
      const unresolvedFoliageMat=mode===15&&typeof opt.mat==='string',
        surfaceKey=opt.tex?ordinaryResourceId(opt.tex):0,
        materialKey=unresolvedFoliageMat||!opt.mat?0:ordinaryResourceId(opt.mat),
        normalKey=opt.nrm?ordinaryResourceId(opt.nrm):0;
      // Ordinary slots cross this API as ids only. Resolve them through the registry before
      // touching a GPU map so a missing, malformed, or retired generation cannot degrade into an
      // apparently valid flat-colour draw.
      if((opt.tex&&!surfaceKey)||(opt.mat&&!unresolvedFoliageMat&&!materialKey)||
          (opt.nrm&&!normalKey))return false;
      const surface=surfaceKey&&ordinaryTexture(surfaceKey),
        tiled=materialKey&&ordinaryTexture(materialKey),
        normalSurface=normalKey&&ordinaryTexture(normalKey),
        tilingNormal=materialKey&&normalSurface,
        mode34=mode===3||mode===4,
        colorOnlyMode0=mode===0&&!!tiled&&opt.nrm===null,
        colorOnlyMode4=mode===4&&!!tiled&&opt.nrm===null,
        colorOnlyMode9=mode===9&&!!tiled&&opt.nrm===null,
        hasTilingNormal=!!tiled&&mode!==1&&!colorOnlyMode0&&!colorOnlyMode4&&!colorOnlyMode9;
      const softBox=name==='softBox';
      if ((mode !== 0 && mode !== 1 && mode !== 2 && mode !== 3 && mode !== 4 && mode !== 5 &&
          mode !== 6 && mode !== 7 && mode !== 8 && mode !== 9 && mode !== 10 && mode !== 11 && mode !== 13 && mode !== 14 &&
          mode !== 15) ||
          (opt.tex&&opt.mat) ||
          (opt.tex&&(!surface||surface.kind!=='albedo')) ||
          (materialKey&&(!tiled||tiled.kind!=='tiling')) ||
          (normalKey&&!normalSurface) ||
          (surfaceKey&&normalKey&&normalSurface.kind!=='pbr') ||
          (materialKey&&normalKey&&normalSurface.kind!=='tiling-normal') ||
          (materialKey&&hasTilingNormal&&!tilingNormal) ||
          (!opt.tex&&!materialKey&&opt.nrm) || opt.rect || opt.doubleSided) return false;
      if(contactShadow||additiveGlow){
        const proceduralRound=opt.round===undefined?0:Number(opt.round),
          proceduralBevel=opt.bevel===undefined?0:Number(opt.bevel);
        if(name!=='quad'||surfaceKey||materialKey||normalKey||
            !Number.isFinite(proceduralRound)||proceduralRound!==0||
            !Number.isFinite(proceduralBevel)||proceduralBevel!==0)return false;
      }
      if(mode===10){
        const asphaltRound=opt.round===undefined?0:Number(opt.round),
          asphaltBevel=opt.bevel===undefined?0:Number(opt.bevel),
          plain=!surfaceKey&&!materialKey&&!normalKey,
          completeTiling=!surfaceKey&&!!materialKey&&!!normalKey&&hasTilingNormal;
        if(name!=='quad'||opt.ch||!plain&&!completeTiling||
            !Number.isFinite(asphaltRound)||asphaltRound!==0||
            !Number.isFinite(asphaltBevel)||asphaltBevel!==0||
            plain&&(opt.matScale!==undefined||opt.matAmt!==undefined||opt.nrmAmt!==undefined))
          return false;
      }
      if(roofTile){
        if(direct||name!=='box'||opt.ch||surfaceKey||materialKey||normalKey||
            opt.round!==undefined||opt.bevel!==undefined||opt.matScale!==undefined||
            opt.matAmt!==undefined||opt.nrmAmt!==undefined)return false;
      }
      if ((mode===1||mode===6||mode===7||mode===9||mode===10||mode===11||mode===13||mode===14||mode===15||mode34) && opt.tex)
        return false;
      if(mode===3&&!tiled)return false;
      if (softBox && opt.tex) return false;
      const softRound=softBox
        ? (opt.round===undefined?(mode===7?.055:.022):Number(opt.round)) : 0;
      if (softBox && (!Number.isFinite(softRound) || softRound<=0)) return false;
      const bevelValue=name==='box'&&(mode===0||mode===3||mode===4||mode===6||mode===7)
        ?(opt.bevel===undefined?.013:Number(opt.bevel)):0;
      if(!Number.isFinite(bevelValue)||bevelValue<0||(bevelValue>0&&opt.tex))return false;
      if(mode===4&&bevelValue>0&&(!tiled||colorOnlyMode4))return false;
      const matScale=tiled?(opt.matScale===undefined?1:Number(opt.matScale)):0;
      const matAmount=tiled?(opt.matAmt===undefined?.7:Number(opt.matAmt)):0;
      const tilingNormalAmount=hasTilingNormal
        ?(opt.nrmAmt===undefined?1:Number(opt.nrmAmt)):0;
      if(tiled&&(!Number.isFinite(matScale)||matScale<=0||!Number.isFinite(matAmount)||
          !Number.isFinite(tilingNormalAmount)||tilingNormalAmount<0))return false;
      const alphaDefault=mode===0&&alphaBlend;
      if(alphaDefault){
        const defaultShape=name==='box'||name==='ball'||softBox||name==='quad'||
            name==='capsule'||name==='taper'||name==='cyl',
          authoredRound=opt.round===undefined?0:Number(opt.round),
          authoredBevel=opt.bevel===undefined?(name==='box'?.013:0):Number(opt.bevel),
          reviewedRadius=softBox&&
            (Math.fround(softRound)===Math.fround(.035)||
             Math.fround(softRound)===Math.fround(.040)||
             Math.fround(softRound)===Math.fround(.045)||
             Math.fround(softRound)===Math.fround(.080)||
             Math.fround(softRound)===Math.fround(.180)),
          wantBevel=name==='box'?Math.fround(.013):0;
        if(!direct||count!==1||!defaultShape||surfaceKey||materialKey||normalKey||opt.ch||
            !Number.isFinite(authoredRound)||softBox&&!reviewedRadius||
            !softBox&&authoredRound!==0||!Number.isFinite(authoredBevel)||
            Math.fround(authoredBevel)!==wantBevel||Math.fround(bevelValue)!==wantBevel)
          return false;
      }
      if(colorOnlyMode0){
        const reviewedShape=name==='box'||name==='quad'||name==='cyl',
          authoredRound=opt.round===undefined?0:Number(opt.round),
          authoredBevel=opt.bevel===undefined?(name==='box'?.013:0):Number(opt.bevel),
          normalAux=opt.nrmAmt===undefined?1:Number(opt.nrmAmt),
          wantBevel=name==='box'?Math.fround(.013):0;
        if(!reviewedShape||surfaceKey||!materialKey||normalKey||opt.ch||
            !Number.isFinite(authoredRound)||authoredRound!==0||
            !Number.isFinite(authoredBevel)||Math.fround(authoredBevel)!==wantBevel||
            Math.fround(bevelValue)!==wantBevel||!Number.isFinite(normalAux)||
            Math.fround(normalAux)!==Math.fround(1))return false;
      }
      const alphaPlaster=mode===4&&alphaBlend;
      if(alphaPlaster){
        const authoredRound=opt.round===undefined?0:Number(opt.round),
          authoredBevel=opt.bevel===undefined?0:Number(opt.bevel),
          reviewedRadius=softBox&&
            (Math.fround(authoredRound)===Math.fround(.006)||
             Math.fround(authoredRound)===Math.fround(.008)||
             Math.fround(authoredRound)===Math.fround(.009)||
             Math.fround(authoredRound)===Math.fround(.010));
        if(!direct||count!==1||name!=='ball'&&!softBox||surfaceKey||!tiled||!tilingNormal||
            opt.ch||
            colorOnlyMode4||!Number.isFinite(authoredRound)||!Number.isFinite(authoredBevel)||
            authoredBevel!==0||softBox&&!reviewedRadius||!softBox&&authoredRound!==0||
            Math.fround(matScale)!==Math.fround(.62)||
            Math.fround(matAmount)!==Math.fround(.008)||
            Math.fround(tilingNormalAmount)!==Math.fround(1))return false;
      }
      const alphaWoven=mode===7&&alphaBlend;
      if(alphaWoven){
        const wovenShape=name==='box'||name==='ball'||softBox||name==='quad'||
            name==='capsule'||name==='taper'||name==='cyl',
          authoredBevel=opt.bevel===undefined?(name==='box'?.013:0):Number(opt.bevel),
          wantBevel=name==='box'?Math.fround(.013):0;
        if(!direct||count!==1||!wovenShape||surfaceKey||materialKey||normalKey||opt.ch||
            softBox&&Math.fround(softRound)!==Math.fround(.055)||
            !Number.isFinite(authoredBevel)||Math.fround(authoredBevel)!==wantBevel||
            Math.fround(bevelValue)!==wantBevel)return false;
      }
      const floats=count*INSTANCE_FLOATS, at=used; growStaging(at+floats);
      if (data.subarray) staging.set(data.subarray(0,floats),at);
      else for (let i=0;i<floats;i++) staging[at+i]=data[i];
      // Non-glyph records leave rect.x stale in the shared WebGL scratch array. WebGPU owns this
      // copy, so clear it for every ordinary mesh and use it only as the exact soft-box radius.
      for (let i=0;i<count;i++) {
        const q=at+i*INSTANCE_FLOATS;
        // Positive aux.x is a SoftBox radius; negative aux.x is a hard-box fragment bevel.
        // Glyphs are rejected above, so the shared atlas field is unambiguous in this path.
        staging[q+22]=softRound||(bevelValue>0?-bevelValue:0);
        staging[q+23]=matScale;
        staging[q+24]=-tilingNormalAmount;
        staging[q+25]=matAmount;
      }
      // Retain keys, never GPU records. A room can release a texture after culling but before
      // presentation; present() re-resolves the complete stream and hides the whole preview frame
      // if any generation vanished.
      used+=floats; draws.push({name,count,offset:at*4,surfaceKey:surfaceKey||null,
        tilingKey:materialKey||null,tilingNormalKey:hasTilingNormal?normalKey:null,
        tilingColorOnly:colorOnlyMode0||colorOnlyMode4||colorOnlyMode9,
        pbrKey:mode===0&&surfaceKey&&normalKey||null,
        normalAmount:opt.nrmAmt,bevel:bevelValue>0,mode,
        blend:additiveGlow?'additive':alphaBlend?'alpha':'opaque'});
      ordinaryExpectedDraws=draws.length;
      return true;
    } catch (err) {
      // Culling/batching has already completed in WebGL. A hostile view or allocation failure in
      // this optional copy must demote the pilot rather than abort the authoritative colour pass.
      return demote('failed','batch-capture',err);
    }
  }
  function captureDome(name,data,count,opt,direct,depthWrite,additive,cull){
    if((Number(opt.mode)||0)!==12)return null;
    const round=opt.round===undefined?0:Number(opt.round),
      bevel=opt.bevel===undefined?0:Number(opt.bevel);
    if(name!=='ball'||count!==1||direct!==true||draws.length!==0||frameData[35]!==0||
        depthWrite!==false||additive!==false||cull!=='none'||
        opt.tex!==undefined||opt.mat!==undefined||opt.nrm!==undefined||
        opt.rect!==undefined||opt.ch!==undefined||opt.doubleSided!==undefined||
        opt.matScale!==undefined||opt.matAmt!==undefined||opt.nrmAmt!==undefined||
        !Number.isFinite(round)||round!==0||!Number.isFinite(bevel)||bevel!==0||
        !domeInstanceMatches(data,0,frameData.subarray(32,35),frameData.subarray(56,59)))
      return false;
    const at=used;growStaging(at+INSTANCE_FLOATS);
    if(data.subarray)staging.set(data.subarray(0,INSTANCE_FLOATS),at);
    else for(let i=0;i<INSTANCE_FLOATS;i++)staging[at+i]=data[i];
    for(let i=22;i<26;i++)staging[at+i]=0;
    used+=INSTANCE_FLOATS;
    draws.push({name,count:1,offset:at*4,dome:true,mode:12,bevel:false,glyph:false,
      surfaceKey:null,tilingKey:null,tilingNormalKey:null,pbrKey:null,blend:'opaque'});
    ordinaryExpectedDraws=draws.length;return true;
  }
  // R.draw is the authoritative one-off path for large floors, unique fixtures, and glyphs that
  // cannot join a retained batch. Mirror its exact inputs into the same 26-float contract instead
  // of maintaining a second material renderer. The fixed scratch is copied by captureBatch before
  // this function returns, so successive WebGL draws cannot mutate a queued WebGPU instance.
  function captureDraw(name,model,color,opt={}) {
    if(state!=='ready'||!frameOpen||!model||model.length<16||!color||color.length<3)return false;
    try{
      directData.fill(0);
      for(let i=0;i<16;i++){
        const value=Number(model[i]);if(!Number.isFinite(value))return false;directData[i]=value;
      }
      for(let i=0;i<3;i++){
        const value=Number(color[i]);if(!Number.isFinite(value))return false;directData[16+i]=value;
      }
      directData[19]=opt.gloss===undefined?.12:Number(opt.gloss);
      directData[20]=opt.alpha===undefined?1:Number(opt.alpha);
      directData[21]=opt.glow===undefined?0:Number(opt.glow);
      if(opt.rect){
        if(opt.rect.length<4)return false;
        for(let i=0;i<4;i++)directData[22+i]=Number(opt.rect[i]);
      }
      const accepted=captureBatch(name,directData,1,opt,true);
      if(accepted)stats.directDraws++;
      return accepted;
    }catch(err){return demote('failed','draw-capture',err);}
  }
  function captureSkinnedGroup(parts,models,palettes,boneCount,count,meta){
    if(!requested)return 0;
    if(state==='ready'&&frameOpen)skinExpectedGroups++;
    const reject=()=>{stats.skinGroupRejections++;
      invalidateSkinFrame('skin-group-rejected');return 0;};
    count=Number(count);boneCount=Number(boneCount);
    if(state!=='ready'||!frameOpen||!Number.isInteger(count)||count<1||
        count>MAX_SKIN_INSTANCES||!Number.isInteger(boneCount)||boneCount<1||
        boneCount>MAX_SKIN_BONES||!Array.isArray(parts)||parts.length<1||
        parts.length>MAX_SKIN_PARTS)return reject();
    const owner=meta&&meta.owner,lod=Number(meta&&meta.lod),owned=meta!==undefined&&meta!==null;
    if(owned&&(!validSkinOwner(owner)||!validSkinLod(lod)||!skinTierWanted(owner,lod)||
        !skinBundleReady(owner,lod)))return reject();
    const modelFloats=count*16,paletteFloats=count*boneCount*16;
    if(!finiteArray(models,modelFloats)||!finiteArray(palettes,paletteFloats)){
      return reject();
    }
    const reviewed=[];
    for(const part of parts){
      const opt=part&&part.opt||{},mesh=part&&skinMeshes.get(part.mesh),texture=skinTextures.get(opt.tex);
      const mode=opt.mode===undefined?0:Number(opt.mode),
        gloss=opt.gloss===undefined?.16:Number(opt.gloss),
        alpha=opt.alpha===undefined?1:Number(opt.alpha),
        glow=opt.glow===undefined?0:Number(opt.glow),
        cutout=opt.cutout===undefined?0:Number(opt.cutout),color=part&&part.color;
      const perInstance=!!color&&Number(color.length)>=count*3,colorLength=perInstance?count*3:3;
      const meshOwner=part&&skinMeshOwners.get(part.mesh),textureOwner=skinTextureOwners.get(opt.tex);
      if(!part||!part.mesh||!mesh||mesh.maxJoint>=boneCount||!opt.tex||!texture||
          (owned&&(!meshOwner||meshOwner.owner!==owner||meshOwner.lod!==lod||
            textureOwner!==owner))||
          (mode!==0&&mode!==19)||![gloss,alpha,glow,cutout].every(Number.isFinite)||
          gloss<0||gloss>1||alpha<1||alpha>1||glow<0||cutout<0||cutout>1||
          !finiteArray(color,colorLength)||opt.mat||opt.nrm||opt.rect){
        return reject();
      }
      reviewed.push({mesh:part.mesh,texture:opt.tex,mode,gloss,alpha,glow,cutout,
        doubleSided:!!opt.doubleSided,color,perInstance});
    }
    const queuedPeople=skinGroups.reduce((n,group)=>n+group.count,0);
    if((queuedPeople+count)*MAX_SKIN_BONES*16*4>SKIN_PALETTE_BUDGET){
      return reject();
    }
    try{
      const padded=new Float32Array(count*MAX_SKIN_BONES*16),instanceParts=[];
      for(let person=0;person<count;person++){
        const row=person*MAX_SKIN_BONES*16;
        for(let bone=0;bone<MAX_SKIN_BONES;bone++){
          const at=row+bone*16;padded[at]=padded[at+5]=padded[at+10]=padded[at+15]=1;
        }
        const from=person*boneCount*16;
        padded.set(palettes.subarray?palettes.subarray(from,from+boneCount*16):
          Array.prototype.slice.call(palettes,from,from+boneCount*16),row);
      }
      for(const part of reviewed){
        const data=new Float32Array(count*INSTANCE_FLOATS);
        for(let person=0;person<count;person++){
          const at=person*INSTANCE_FLOATS,modelAt=person*16,colorAt=part.perInstance?person*3:0;
          for(let i=0;i<16;i++)data[at+i]=models[modelAt+i];
          data[at+16]=part.color[colorAt];data[at+17]=part.color[colorAt+1];
          data[at+18]=part.color[colorAt+2];data[at+19]=part.gloss;data[at+20]=part.alpha;
          data[at+21]=part.glow;data[at+22]=person;data[at+23]=part.cutout;
          data[at+24]=part.mode;
        }
        instanceParts.push({mesh:part.mesh,texture:part.texture,
          doubleSided:part.doubleSided,data});
      }
      skinGroups.push({parts:instanceParts,palettes:padded,boneCount,count,
        owner:owned?owner:null,lod:owned?lod:null});return count;
    }catch(err){return demote('failed','skin-group-capture',err)?count:0;}
  }
  function ensureTargets(w,h) {
    w=Math.max(1,Math.floor(w)); h=Math.max(1,Math.floor(h));
    if (size[0]===w && size[1]===h && depth) return;
    size=[w,h]; canvas.width=w; canvas.height=h;
    if (depth) depth.destroy();
    depth=device.createTexture({ size:[w,h], format:'depth24plus',
      usage:GPUTextureUsage.RENDER_ATTACHMENT });
    depthW=w; depthH=h;
  }
  function ensureInstanceBuffer(bytes) {
    if (instanceBuffer && bytes <= instanceCapacity) return;
    if (instanceBuffer) instanceBuffer.destroy();
    instanceCapacity=Math.max(4096,1<<Math.ceil(Math.log2(Math.max(4,bytes))));
    instanceBuffer=device.createBuffer({ size:instanceCapacity,
      usage:GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  }
  function ensureSkinStaging(instanceFloats,paletteFloats){
    if(!skinInstanceStaging||instanceFloats>skinInstanceStaging.length)
      skinInstanceStaging=new Float32Array(Math.max(instanceFloats,
        skinInstanceStaging?skinInstanceStaging.length*2:INSTANCE_FLOATS*64));
    if(!skinPaletteStaging||paletteFloats>skinPaletteStaging.length)
      skinPaletteStaging=new Float32Array(Math.max(paletteFloats,
        skinPaletteStaging?skinPaletteStaging.length*2:MAX_SKIN_BONES*16*32));
  }
  function ensureSkinBuffers(instanceBytes,paletteBytes){
    if(!skinInstanceBuffer||instanceBytes>skinInstanceCapacity){
      if(skinInstanceBuffer)skinInstanceBuffer.destroy();
      skinInstanceCapacity=Math.max(4096,1<<Math.ceil(Math.log2(Math.max(4,instanceBytes))));
      skinInstanceBuffer=device.createBuffer({size:skinInstanceCapacity,
        usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
    }
    if(!skinPaletteBuffer||paletteBytes>skinPaletteCapacity){
      if(skinPaletteBuffer)skinPaletteBuffer.destroy();
      skinPaletteCapacity=Math.max(4096,1<<Math.ceil(Math.log2(Math.max(4,paletteBytes))));
      skinPaletteBuffer=device.createBuffer({size:skinPaletteCapacity,
        usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      skinPaletteBindGroup=device.createBindGroup({layout:skinPaletteLayout,
        entries:[{binding:0,resource:{buffer:skinPaletteBuffer}}]});
    }
  }
  function present(width,height) {
    if (state !== 'ready' || !frameOpen || !device || !context) {
      if(layerShown)showLayer(false);
      return false;
    }
    frameOpen=false;
    try {
      // A comparison frame is useful only when it contains every authored person WebGL drew.
      // Resource pressure is allowed to reject a whole rig, but showing the rest of WebGPU's
      // scene around that missing person would turn a safe fallback into a misleading picture.
      // Hide the optional layer for this frame and reveal the complete authoritative WebGL canvas.
      if(skinCoverageBlocked){
        stats.skinCoverageFallbacks++;draws.length=0;skinGroups.length=0;used=0;
        skinInstanceUsedBytes=skinPaletteUsedBytes=0;showLayer(false);return false;
      }
      // Resolve every ownership key in a character before recording its first material part. A rig
      // disposed between culling and presentation therefore disappears as one whole person, never
      // as a face without clothes or clothes without a face. This happens before *any* queue write
      // or target rebuild so a release race leaves no WebGPU work behind for the fallback frame.
      const resolvedSkin=[];
      let skinPeople=0;
      for(const group of skinGroups){
        const parts=[];
        for(const part of group.parts){
          const mesh=skinMeshes.get(part.mesh),texture=skinTextures.get(part.texture);
          const meshOwner=skinMeshOwners.get(part.mesh),textureOwner=skinTextureOwners.get(part.texture);
          if(!mesh||!texture||(group.owner&&(!meshOwner||meshOwner.owner!==group.owner||
              meshOwner.lod!==group.lod||textureOwner!==group.owner))){parts.length=0;break;}
          parts.push({...part,meshRecord:mesh,textureRecord:texture});
        }
        if(parts.length!==group.parts.length){
          stats.skinGroupRejections++;invalidateSkinFrame('skin-resource-released');break;
        }
        resolvedSkin.push({...group,parts,paletteBase:skinPeople});
        skinPeople+=group.count;
      }
      if(skinCoverageBlocked){
        stats.skinCoverageFallbacks++;draws.length=0;skinGroups.length=0;used=0;
        skinInstanceUsedBytes=skinPaletteUsedBytes=0;showLayer(false);return false;
      }
      const resolvedOrdinary=resolveOrdinaryFrame();
      if(!resolvedOrdinary.ok)
        return fallbackOrdinaryFrame(resolvedOrdinary.reason,resolvedOrdinary.sequence);
      let glyphReady=!!glyphBindGroup;
      if(resolvedOrdinary.hasGlyph&&glyphDirty)glyphReady=uploadGlyphAtlas();
      if(!glyphReady&&resolvedOrdinary.hasGlyph){
        resolvedOrdinary.rollback();
        if(state!=='ready'||!device){showLayer(false);return false;}
        return fallbackOrdinaryFrame('ordinary-glyph-unavailable',
          resolvedOrdinary.glyphSequence);
      }
      if(!resolvedOrdinary.resolveGlyph()){
        resolvedOrdinary.rollback();
        return fallbackOrdinaryFrame('ordinary-glyph-unavailable',
          resolvedOrdinary.glyphSequence);
      }
      resolvedOrdinary.publish();
      ensureTargets(width,height); ensureInstanceBuffer(used*4);
      if (used) device.queue.writeBuffer(instanceBuffer,0,staging.buffer,0,used*4);
      if(state!=='ready'||!device){showLayer(false);return false;}
      const skinInstanceFloats=resolvedSkin.reduce((n,g)=>n+g.count*g.parts.length*INSTANCE_FLOATS,0),
        skinPaletteFloats=skinPeople*MAX_SKIN_BONES*16;
      ensureSkinStaging(skinInstanceFloats,skinPaletteFloats);
      let skinInstanceUsed=0;
      for(const group of resolvedSkin){
        skinPaletteStaging.set(group.palettes,group.paletteBase*MAX_SKIN_BONES*16);
        for(const part of group.parts){
          const at=skinInstanceUsed;
          skinInstanceStaging.set(part.data,at);
          for(let person=0;person<group.count;person++)
            skinInstanceStaging[at+person*INSTANCE_FLOATS+22]=group.paletteBase+person;
          part.instanceOffset=at*4;skinInstanceUsed+=group.count*INSTANCE_FLOATS;
        }
      }
      if(resolvedSkin.length){
        ensureSkinBuffers(skinInstanceUsed*4,skinPaletteFloats*4);
        device.queue.writeBuffer(skinInstanceBuffer,0,skinInstanceStaging.buffer,0,skinInstanceUsed*4);
        // Exactly one fixed-row palette transfer per frame, however many rig groups/materials draw.
        device.queue.writeBuffer(skinPaletteBuffer,0,skinPaletteStaging.buffer,0,skinPaletteFloats*4);
      }
      skinInstanceUsedBytes=skinInstanceUsed*4;skinPaletteUsedBytes=skinPaletteFloats*4;
      const encoder=device.createCommandEncoder({label:'WebGPU comparison frame'});
      const pass=encoder.beginRenderPass({
        colorAttachments:[{view:context.getCurrentTexture().createView(),
          clearValue:{r:Number(clear[0])||0,g:Number(clear[1])||0,b:Number(clear[2])||0,a:1},
          loadOp:'clear',storeOp:'store'}],
        depthStencilAttachment:{view:depth.createView(),depthClearValue:1,
          depthLoadOp:'clear',depthStoreOp:'discard'},
      });
      // CSS still clips the comparison canvas for exact full-frame alignment. Scissoring the draw
      // too avoids shading the hidden left half; only target memory remains full size.
      if (!fullView) {
        const left=Math.floor(size[0]/2);
        pass.setScissorRect(left,0,size[0]-left,size[1]);
      }
      let frameInstances=0, frameDraws=0,frameGlyphInstances=0,frameGlyphDraws=0;
      let activePipeline=null, activeSurface=null;
      for (const entry of resolvedOrdinary.draws) {
        const d=entry.draw,m=entry.meshRecord,want=entry.pipeline,surface=entry.surface;
        if(activePipeline!==want){pass.setPipeline(want);pass.setBindGroup(0,bindGroup);
          activePipeline=want;activeSurface=null;}
        if(surface&&activeSurface!==surface){pass.setBindGroup(1,d.glyph?surface:surface.bindGroup);
          activeSurface=surface;}
        pass.setVertexBuffer(0,m.pos); pass.setVertexBuffer(1,m.nor);pass.setVertexBuffer(2,m.uv);
        pass.setVertexBuffer(3,instanceBuffer,d.offset,d.count*INSTANCE_BYTES);
        pass.setIndexBuffer(m.idx,m.format); pass.drawIndexed(m.count,d.count);
        frameDraws++; frameInstances+=d.count;
        if(d.glyph){frameGlyphDraws++;frameGlyphInstances+=d.count;}
      }
      for(const group of resolvedSkin){
        for(const part of group.parts){
          const want=part.doubleSided?skinDoublePipeline:skinPipeline;
          if(activePipeline!==want){pass.setPipeline(want);pass.setBindGroup(0,bindGroup);
            pass.setBindGroup(2,skinPaletteBindGroup);activePipeline=want;activeSurface=null;}
          if(activeSurface!==part.textureRecord){pass.setBindGroup(1,part.textureRecord.bindGroup);
            activeSurface=part.textureRecord;}
          const m=part.meshRecord;
          pass.setVertexBuffer(0,m.pos);pass.setVertexBuffer(1,m.nor);pass.setVertexBuffer(2,m.uv);
          pass.setVertexBuffer(3,m.joint);pass.setVertexBuffer(4,m.weight);
          pass.setVertexBuffer(5,skinInstanceBuffer,part.instanceOffset,
            group.count*INSTANCE_BYTES);
          pass.setIndexBuffer(m.idx,m.format);pass.drawIndexed(m.count,group.count);
          frameDraws++;frameInstances+=group.count;
        }
        const direct=group.count===1,prefix=direct?'direct':'instanced';
        skinFrameStats.groups++;skinFrameStats.parts+=group.parts.length;
        skinFrameStats.instances+=group.count;
        skinFrameStats[prefix+'Groups']++;skinFrameStats[prefix+'Parts']+=group.parts.length;
        skinFrameStats[prefix+'Instances']+=group.count;
      }
      pass.end(); device.queue.submit([encoder.finish()]);
      ordinaryFrameStats={draws:resolvedOrdinary.draws.length,
        instances:resolvedOrdinary.instances};
      stats.frames++; stats.submits++; stats.draws+=frameDraws; stats.instances+=frameInstances;
      stats.glyphDraws+=frameGlyphDraws;stats.glyphInstances+=frameGlyphInstances;
      for(const key of Object.keys(skinTotalStats))skinTotalStats[key]+=skinFrameStats[key];
      // These attributes are QA breadcrumbs, not a telemetry bus. Updating them twice a second
      // keeps the browser probe useful without forcing style/DOM work into every measured frame.
      if(canvas && (stats.frames===1 || stats.frames%30===0)) {
        canvas.dataset.state='ready'; canvas.dataset.frames=String(stats.frames);
        canvas.dataset.draws=String(stats.draws); canvas.dataset.instances=String(stats.instances);
        canvas.dataset.meshes=String(meshes.size);
        canvas.dataset.textures=String(gpuTextureCount());
        canvas.dataset.materials=String(pbrMaterials.size);
      }
      if (!layerShown) showLayer(true);
      skinGroups.length=0;
      return true;
    } catch (err) { return demote('failed','present',err); }
  }
  function status() {
    let packet={mode:packetRecordRequested?'record':'off',scope:'ordinary-color',authority:'webgl2'};
    try{
      if(typeof R!=='undefined'&&R&&R.framePacketStats)packet=R.framePacketStats;
    }catch(_){/* R is loaded after this optional module; diagnostics stay bounded meanwhile. */}
    packet={...packet,prepare:packetPrepareStatus()};
    return { requested, packetRecordRequested,
      primary:'webgl2', backend:state==='ready'?'webgpu-preview':'webgl2',
      state, reason, message, view:fullView?'full':'split', adapter:adapterInfo&&{...adapterInfo},
      packet,
      size:size.slice(), meshes:meshes.size, pendingMeshes:pendingMeshes.size,
      textures:textures.size,gpuTextures:gpuTextureCount(),textureBytes:gpuTextureBytes(),
      textureBudget:TEXTURE_BUDGET,nonGlyphTextureBudget:NON_GLYPH_TEXTURE_BUDGET,
      pendingTextureBytes:pendingTextureBytes(),
      textureRejections:stats.textureRejections,
      tilingTextures:[...textures.values()].filter(record=>record.kind==='tiling').length,
      tilingMaterials:tilingMaterials.size,pbrMaterials:pbrMaterials.size,
      glyphScene,glyphCells:glyphCells.size,glyphCapacity:GLYPH_CAPACITY,
      glyphPolicy:'full-role-opaque-plus-zero-glow-mode1-alpha',
      domePolicy:'strict-direct-outdoor-ball-depth-always',
      mode10Policy:'opaque-quad-plain-or-tiling-normal',
      mode13Policy:'retained-opaque-box-plain',
      glyphSourceSize:[glyphSourceWidth,glyphSourceHeight],glyphSourceVersion,glyphEpoch,
      glyphAtlasSize:[GLYPH_WIDTH,GLYPH_HEIGHT],glyphAtlasBytes:GLYPH_TEXTURE_BYTES,
      glyphBytes,glyphUploads:stats.glyphUploads,glyphDraws:stats.glyphDraws,
      glyphInstances:stats.glyphInstances,glyphRejections:stats.glyphRejections,
      glyphFiltered:stats.glyphFiltered,glyphSceneResets:stats.glyphSceneResets,
      pendingTextures:pendingTextures.size,
      ordinary:{scope:'accepted-opaque-mode12-dome-mode13-roof-tile-box-mode10-asphalt-quad-mode0-color-only-tiling-mode0-alpha-default-mode1-alpha-mode2-contact-mode4-alpha-plaster-mode5-8-additive-mode7-alpha-woven-mode1-alpha-glyph-mirror',
        expectedDraws:ordinaryExpectedDraws,
        coverageBlocked:ordinaryCoverageBlocked,
        coverage:ordinaryCoverageBlocked?'webgl-fallback':'accepted-stream-complete',
        fallbackReason:ordinaryFallbackReason,failedSequence:ordinaryFailedSequence,
        coverageFallbacks:stats.ordinaryCoverageFallbacks,
        frame:{...ordinaryFrameStats}},
      skin:{maxBones:MAX_SKIN_BONES,maxInstancesPerGroup:MAX_SKIN_INSTANCES,
        maxPartsPerGroup:MAX_SKIN_PARTS,
        textureBudget:SKIN_TEXTURE_BUDGET,textureBytes:skinTextureBytes(),
        pendingTextureBytes:pendingSkinTextureBytes(),textures:skinTextures.size,
        pendingTextures:pendingSkinTextures.size,textureRejections:stats.skinTextureRejections,
        meshBudget:SKIN_MESH_BUDGET,meshBytes:skinMeshBytes(),
        pendingMeshBytes:pendingSkinMeshBytes(),meshes:skinMeshes.size,
        pendingMeshes:pendingSkinMeshes.size,meshRejections:stats.skinMeshRejections,
        paletteBudget:SKIN_PALETTE_BUDGET,paletteBytes:skinPaletteUsedBytes,
        paletteCapacity:skinPaletteCapacity,instanceBytes:skinInstanceUsedBytes,
        instanceCapacity:skinInstanceCapacity,
        groupRejections:stats.skinGroupRejections,
        owners:skinOwners.size,
        readyTiers:[...skinOwners.values()].reduce((n,record)=>n+record.tiers.size,0),
        wantedOwners:skinWanted.size,
        wantedTiers:[...skinWanted.values()].reduce((n,tiers)=>n+tiers.size,0),
        frameEpoch:skinFrameEpoch,preflightBlocked:skinPreflightBlocked,
        preflightMeshBytes:skinPreflightMeshBytes,
        preflightTextureBytes:skinPreflightTextureBytes,
        bundleCommits:stats.skinBundleCommits,bundleRejections:stats.skinBundleRejections,
        bundleRollbacks:stats.skinBundleRollbacks,ownerEvictions:stats.skinOwnerEvictions,
        tierEvictions:stats.skinTierEvictions,
        expectedGroups:skinExpectedGroups,coverageBlocked:skinCoverageBlocked,
        coverage:skinCoverageBlocked?'webgl-fallback':'complete',
        fallbackReason:skinFallbackReason,coverageFallbacks:stats.skinCoverageFallbacks,
        pipelines:{backCull:!!skinPipeline,doubleSided:!!skinDoublePipeline},
        frame:{...skinFrameStats},total:{...skinTotalStats}},
      frames:stats.frames, submits:stats.submits, draws:stats.draws,
      instances:stats.instances,directDraws:stats.directDraws,errors:stats.errors };
  }
  function dispose() {
    generation++; state='stopped'; reason='disposed'; frameOpen=false;
    draws.length=0;skinGroups.length=0;used=0;
    resetOrdinaryFrameState();
    skinCoverageBlocked=false;skinExpectedGroups=0;skinFallbackReason='';
    skinPreflightBlocked=false;skinPreflightMeshBytes=skinPreflightTextureBytes=0;
    skinFrameStats={groups:0,parts:0,instances:0,directGroups:0,directParts:0,
      directInstances:0,instancedGroups:0,instancedParts:0,instancedInstances:0};
    if (staging.length > INSTANCE_FLOATS * 2048)
      staging = new Float32Array(INSTANCE_FLOATS * 2048);
    skinInstanceStaging=skinPaletteStaging=null;
    releaseGpu(true); removeLayer();
    return true;
  }

  if (requested) void start();
  return { requested, packetRecordRequested,
    captureMesh, captureSkinMesh, releaseMesh, captureTexture, releaseTexture,
    captureAtlas, setScene,beginFrame,captureBatch,captureDraw,captureSkinnedGroup,
    wantSkinBundles,captureSkinBundle,releaseSkinBundle,skinBundleReady,skinBundleState,
    invalidateSkinFrame,preparePacket,discardPreparedPacket,
    present,status,dispose };
})();
