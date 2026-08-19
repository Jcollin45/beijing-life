// Compact WebGL2 renderer for a cohesive rounded low-poly apartment.
// A small shared mesh library keeps silhouettes consistent: hard boxes for architecture,
// rounded boxes for furniture, capsules for people, and tapered forms for shades/pots.
const R = (() => {
  const MAX_FOLIAGE_WIND = Math.fround(1.05 * 1.17);
  let gl, prog, U = {}, meshes = {}, proj = M.ident(), view = M.ident(), vp = new Float32Array(16);
  let room = [3.5, 2.72, 2.75];
  // The world y of the floor you are standing on. Zero everywhere except the twelve-floor block,
  // where the shading has to be measured from the deck rather than from the ground: see `openness`
  // and the mode 4 plaster, both of which were reading world height and so gave every floor above
  // the second no contact darkening and a saturated wall gradient.
  let deckY = 0;
  const bulb = new Float32Array([0, 2.4, -0.2]);
  let bulbOn = 1;
  // The opening daylight comes through, used to shape the sunbeam. `winPos`/`winHalf` are the
  // *active* one — whichever the shader is shading this frame — and `winN`/`winU` are its plane:
  // the outward normal, and the horizontal axis of the rectangle. Both are computed on the CPU so
  // nothing crosses or normalises per fragment.
  let winPos = [-0.55, 1.45, -2.67], winHalf = [0.84, 0.60];
  let winN = [0, 0, -1], winU = [-1, 0, 0];
  // How far the curtains are open. 1 is drawn back, 0 is closed: it scales the shaft to nothing
  // and takes the diffuse daylight fill down with it, so a closed curtain darkens the room
  // instead of leaving a sunbeam lying on the floor in front of it.
  let winShade = 1;
  // Every opening registered for the scene currently loaded. Twelve storeys used to share one
  // `winPos`, set once from `World.WIN`, so a north bedroom on the eleventh floor took the same
  // noon shaft as the south living room on the second — there was literally one window in the
  // engine. A room registers its own with `addWindow`, and the renderer shades whichever is
  // nearest the eye.
  //
  // One shaft is shaded, not N. A loop over every window in a building is per-fragment cost in
  // the main lighting pass for a benefit nobody can see: the player stands in one room at a
  // time, and the sun only ever comes through one wall of it. Selection is the cheap half of
  // the problem and it is the half that was actually wrong.
  //
  // Empty means "use the single window above", which is what every caller written before this
  // registry existed gets, unchanged.
  const WINDOWS = [];
  // Daylight: direction, colour and strength. Driven by the in-game clock.
  let sun = [-0.16, 0.46, -1.0], sunCol = [1.00, 0.94, 0.84], sunAmt = 1.55;
  let skyCol = [0.35, 0.39, 0.48], groundCol = [0.20, 0.14, 0.10];
  // The actual dome endpoints are separate from ambient sky light. Glass reflects these two
  // colours, so they belong to the frame rather than to the optional outdoor dome draw: retained
  // batches and interiors otherwise inherit zero or whatever outdoor place happened to run last.
  let skyZenith = [0.55, 0.70, 0.84], skyHorizon = [0.87, 0.89, 0.85];
  const moonSky = new Float32Array(3);
  // Indoors the room shades itself and the window shapes the sun. Outdoors neither applies,
  // and distance haze takes over instead.
  let indoor = 1, winOn = 1, fogNear = 0, fogD = 0, fogCol = [0.5, 0.5, 0.5], now = 0;
  let expose = 1;
  // Neutral unless a scene asks for a grade. Kept as three linear multipliers rather than a
  // colour-temperature number so art direction can correct green fluorescent interiors as well
  // as warm/cool light. setEnv accepts `white` or `whiteBalance`; old callers remain neutral.
  const whiteBal = new Float32Array([1, 1, 1]);
  // [wet, snow], and the season's tint on every leaf. Neutral until the game says otherwise, so a
  // harness that never sets them renders exactly what it always did.
  const weather = new Float32Array([0, 0, 0]);
  const leafTint = new Float32Array([1, 1, 1]);
  let atlas = null;                     // the glyph sheet, the only texture in the game
  // Sun shadows. A depth-only pass from the sun's point of view, then one comparison per
  // fragment in the main pass. Outdoors only: indoors the room is a closed box and the window
  // beam already shapes the sunlight, and a map fitted to a 7 m room would only fight it.
  const SMAP = 1536;
  let smapSize = SMAP, renderScale = 1;
  // High/Medium may spend a few atlas ALU instructions preserving designated concourse signs.
  // Low/Basic keep the old glyph result exactly; the quality ladder owns the switch.
  let glyphAssist = 0;
  let sprog = null, sU = {}, sFbo = null, sDepth = null;
  // The instanced pair and whether they are usable. `instOK` false is a working game.
  let iprog = null, iU = {}, siprog = null, siU = {};
  let instOK = false, instFail = '';
  // The canvas's CSS size, kept by a ResizeObserver rather than read from layout. See `cssSize`.
  let cssW = 0, cssH = 0, cssObs = null;
  const cssSizeOut = [0, 0];
  let maxTargetSize = 4096, renderPixelBudget = 3200000;
  function targetPixelBudget() {
    const coarse = typeof matchMedia === 'function' && matchMedia('(any-pointer:coarse)').matches;
    const memory = typeof navigator !== 'undefined' ? Number(navigator.deviceMemory) : 0;
    if ((memory > 0 && memory <= 4)) return 1800000;
    return coarse ? 2200000 : 3200000;
  }
  // The skinned program. Same rule: unavailable is a game without characters, not a black screen.
  let kprog = null, kU = {};
  let skinOK = false, skinFail = '';
  // A second skinned program draws many copies of one rig/LOD in one call per material part.
  // It is deliberately independent from kprog: a driver or shader failure here only gives up the
  // crowd optimisation. Named characters still go through the direct skinned path above and do
  // not disappear or change identity.
  let kiprog = null, kiU = {};
  let skinInstOK = false, skinInstFail = '';
  let skinInstFrameReady = false;
  let skinInstMaxTexture = 0, skinInstVertexTextures = 0;
  let skinInstFrameStats = { groups:0, calls:0, instances:0 };
  let skinInstTotalStats = { groups:0, calls:0, instances:0 };
  // The skinned shader's scene uniforms are frame state, not character or material state. They
  // are uploaded on the first authored person in a frame and remain valid for every one after it.
  let skinFrameReady = false, skinCharacterOpen = false, webgpuDirectSkin = null;
  const SKIN_UNIT_SCALE = new Float32Array([1, 1, 1]);
  // Kept from begin(), because the skinned program is only bound while a character is being
  // drawn and so is not present for the once-a-frame uniform upload the other two get.
  let lastEye = [0, 0, 0];
  const lightVP = new Float32Array(16);
  let shadowOn = 0, pass = 0, shadowPx = [0.04, 1 / SMAP], shadowReady = false;
  let canvasW = 0, canvasH = 0;
  let castMax = 6.5;                    // nothing centred above this height casts a shadow
  const box = [0, 0, 6.5, 24];          // the light's box: cx, cz, caster height, half extent
  const sc = new Float32Array(3);
  // Texture anisotropy is optional even in WebGL2. When present it is the inexpensive fix for
  // floor, road and sign textures turning to mush at the shallow angles this third-person camera
  // sees most often; when absent every texture keeps ordinary trilinear filtering.
  let anisoExt = null, maxAniso = 1, surfaceAniso = 4;

  // How far the geometry buffer's packed distance reaches, in metres. Interpolated into both the
  // scene shader that writes it and the post shader that reads it, because a mismatch between the
  // two is silent and total: every occlusion sample would be measured against a different ruler
  // than the one it was written on. It was previously the same literal typed into both, under a
  // comment asking whoever came next to keep them equal.
  const GEOM_FAR_M = 64.0;
  const VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  layout(location=2) in vec2 aUv;
  uniform mat4 uProj, uView, uModel;
  uniform vec3 uScale;
  uniform float uRound;
  // The mode and the clock, so foliage can move in the wind. Everything else ignores both.
  // Explicit highp: an int uniform defaults to highp in a vertex shader and mediump in a
  // fragment one, and a shared uniform whose precision differs between the two will not link.
  uniform highp int uMode;
  uniform float uTime;
  // Shared with the fragment shader, and only .z is read here: how hard it is blowing. A canopy in
  // a gale has to move like one or the rain slanting past it reads as a screensaver over a photo.
  uniform vec3 uWeather;
  out vec3 vN; out vec3 vW; out vec2 vUv; out vec3 vL;
  void main(){
    vec3 pos = aPos, nor = aNor;
    // 风 wind, for foliage only. The whole cluster is moved together rather than the vertices
    // being bent, which is right for a mesh this size — a canopy sphere is a mass of leaves, and a
    // mass of leaves moves as one. The phase comes off the cluster's own place in the world, so no
    // two move together and a row of trees does not pulse like a heartbeat.
    if (uMode == 15) {
      float ph = uModel[3].x * 0.9 + uModel[3].z * 1.3;
      // Wind speeds the sway up as well as widening it. A tree that swings further but just as
      // slowly reads as heavier, not windier — a gust is quick, and it is the rate that says so.
      float gust = uWeather.z;
      float t = uTime * 0.00085 * (1.0 + gust * 1.5);
      // Two frequencies: a slow lean, and a faster shiver on top of it.
      vec2 w = vec2(sin(t + ph) * 0.62 + sin(t * 2.7 + ph * 1.7) * 0.38,
                    cos(t * 0.85 + ph) * 0.62 + cos(t * 3.1 + ph * 2.3) * 0.38);
      pos.xz += w * (0.055 + gust * 0.16) / max(0.35, length(vec2(uScale.x, uScale.z)) * 0.5);
    }
    // Rounded box. The mesh stores a flat corner coordinate in [-1,1] and the unit
    // direction the surface bulges in, so the corner radius can be resolved here in
    // metres. Baking it into the mesh made the radius proportional to the object, which
    // turned a two-metre wardrobe into a bar of soap and left a coaster razor sharp.
    if (uRound > 0.0) {
      vec3 r = min(vec3(uRound) / max(uScale, vec3(1e-3)), vec3(0.34));
      pos = aPos * (vec3(0.5) - r) + aNor * r;
      // Gradient of the local ellipsoid, so the world normal comes out spherical once
      // the inverse-transpose below has undone the non-uniform scale.
      nor = normalize(aNor / max(r, vec3(1e-4)));
    }
    vec4 w = uModel * vec4(pos, 1.0);
    vW = w.xyz;
    // Correct under non-uniform scales. This is what keeps rounded furniture and
    // capsule limbs lit like curved objects instead of faceted, stretched spheres.
    // Every model transform in this renderer is TRS (translation · rotation · scale), never a
    // shear.  For an orthogonal basis the inverse-transpose is simply each basis column divided
    // by its squared length.  Writing that directly is exactly equivalent for our transforms and
    // avoids asking every vertex of a busy street to evaluate a general 3x3 matrix inverse.
    vec3 mb0 = uModel[0].xyz, mb1 = uModel[1].xyz, mb2 = uModel[2].xyz;
    vec3 modelScale2 = max(uScale * uScale, vec3(1e-8));
    mat3 normalModel = mat3(
      mb0 / modelScale2.x,
      mb1 / modelScale2.y,
      mb2 / modelScale2.z);
    vN = normalize(normalModel * nor);
    vUv = aUv;
    vL = pos;
    gl_Position = uProj * uView * w;
  }`;

  // ---------------------------------------------------------------- instanced drawing
  //
  // Every prop in this game is its own draw call: a VAO bind, ten-odd uniform uploads and a
  // drawElements, twice over because the shadow map is a second pass. The mall is 4,976 props,
  // so that is about twenty thousand draw calls a frame to put four thousand boxes on screen,
  // and it is the single largest cost in the renderer.
  //
  // The instanced path draws one batch of identical-material props in one call instead. What
  // has to be the same across a batch is whatever the shader reads as a uniform — the mesh, the
  // mode, the corner radius, the bevel and any bound textures. What varies per prop becomes a
  // vertex attribute: its matrix, its colour, and the three scalars that change constantly
  // (gloss, alpha, glow).
  //
  // The fragment shader is not rewritten for this. It is the same source with three uniform
  // declarations turned into varyings of the same names — GLSL does not care that something
  // called uColor arrives from the vertex stage — so the seven hundred lines below stay
  // byte-identical between the two programs and cannot drift apart.
  const VS_I = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  layout(location=2) in vec2 aUv;
  layout(location=3) in mat4 iModel;      // takes locations 3,4,5,6
  layout(location=7) in vec3 iColor;
  layout(location=8) in vec3 iParam;      // gloss, alpha, glow
  // The character this instance is, as a cell in the glyph atlas: u, v, du, dv. Zero width means
  // "not a glyph", which is every other prop in the game. Per instance rather than a uniform
  // because that is the whole reason writing can batch at all: a shop board is a dozen separate
  // quads that differ in nothing but which cell of the sheet they sample, and as a uniform that
  // put every character in the city in its own draw call — 978 of them a frame on the street.
  layout(location=9) in vec4 iRect;
  uniform mat4 uProj, uView;
  uniform float uRound;
  uniform highp int uMode;
  uniform float uTime;
  uniform vec3 uWeather;
  out vec3 vN; out vec3 vW; out vec2 vUv; out vec3 vL;
  out vec3 uColor; out vec3 uScale;
  out float uAlpha; out float uGlow; out float uGloss;
  out vec4 vRect;
  void main(){
    vRect = iRect;
    // Scale is measured off the instance matrix rather than sent separately. It is the length
    // of each basis column, it is needed by the rounding below and by the fragment shader, and
    // recovering it here saves an attribute and any chance of the two disagreeing.
    vec3 mb0 = iModel[0].xyz, mb1 = iModel[1].xyz, mb2 = iModel[2].xyz;
    vec3 scale2 = max(vec3(dot(mb0, mb0), dot(mb1, mb1), dot(mb2, mb2)), vec3(1e-8));
    uScale = sqrt(scale2);
    uColor = iColor; uGloss = iParam.x; uAlpha = iParam.y; uGlow = iParam.z;
    vec3 pos = aPos, nor = aNor;
    if (uMode == 15) {
      float ph = iModel[3].x * 0.9 + iModel[3].z * 1.3;
      float gust = uWeather.z;
      float t = uTime * 0.00085 * (1.0 + gust * 1.5);
      vec2 w = vec2(sin(t + ph) * 0.62 + sin(t * 2.7 + ph * 1.7) * 0.38,
                    cos(t * 0.85 + ph) * 0.62 + cos(t * 3.1 + ph * 2.3) * 0.38);
      pos.xz += w * (0.055 + gust * 0.16) / max(0.35, length(vec2(uScale.x, uScale.z)) * 0.5);
    }
    if (uRound > 0.0) {
      vec3 r = min(vec3(uRound) / max(uScale, vec3(1e-3)), vec3(0.34));
      pos = aPos * (vec3(0.5) - r) + aNor * r;
      nor = normalize(aNor / max(r, vec3(1e-4)));
    }
    vec4 w = iModel * vec4(pos, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(mb0 / scale2.x, mb1 / scale2.y, mb2 / scale2.z) * nor);
    vUv = aUv;
    vL = pos;
    gl_Position = uProj * uView * w;
  }`;

  // ---------------------------------------------------------------- skinned characters
  //
  // A vertex bound to bones instead of to one matrix. Each one names up to four joints and how
  // much of it each owns, and the four are blended — which is the whole point: at a shoulder the
  // vertices between the arm and the chest are part-owned by both, so the surface bends there
  // instead of being the seam between two capsules. That seam is the ceiling the primitive rig
  // cannot get past, at any amount of tuning.
  //
  // 48 bones. GL ES 3.0 only guarantees 256 vertex uniform vectors and a mat4 is four of them,
  // so 64 bones would be 256 on its own and leave nothing for the view matrices. 48 leaves
  // comfortable room and covers any humanoid short of individually articulated fingers.
  // 48 was chosen when the only skinned asset in the project was CesiumMan, which has 19 joints.
  // A real character skeleton is bigger: the Mixamo rig every downloadable human uses comes in at
  // 49 once the fingers are counted, so 48 missed a usable character by exactly one bone.
  //
  // The ceiling is the vertex uniform budget, not taste. Each bone is a mat4, which is four vec4
  // slots, and GL ES 3.0 only guarantees 256 vec4s to a vertex shader. 56 bones is 224 of them,
  // which leaves room for the matrices and the per-frame block; 64 would be 256 exactly and would
  // leave none, so it is not the free upgrade it looks like.
  // 48 was sized for CesiumMan's 19 joints; 56 was sized for the first real character's 49. Both
  // were too small for the next asset, because a full Mixamo skeleton *with fingers* is 65–67 and
  // fingers are most of it. 72 covers every humanoid I have found.
  //
  // The ceiling is the vertex uniform budget: a bone is a mat4, which is four vec4 slots, and GL
  // ES 3.0 only *guarantees* 256 of them. 72 bones is 288, over that guarantee — but the guarantee
  // is a floor, not the hardware, and every desktop GPU reports far more. If a machine ever does
  // refuse, it refuses loudly: the skinned program fails to link, `R.skinning.error` says so, and
  // Rig.draw returns false so callers fall back to the primitive figure. That is the right failure
  // for something only a handful of characters use.
  const MAXBONES = 72;
  const SKIN_VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  layout(location=2) in vec2 aUv;
  layout(location=3) in vec4 aJoint;
  layout(location=4) in vec4 aWeight;
  uniform mat4 uProj, uView, uModel;
  uniform vec3 uScale;
  uniform mat4 uBones[${MAXBONES}];
  out vec3 vN; out vec3 vW; out vec2 vUv; out vec3 vL;
  void main(){
    // The weights are authored to sum to 1; a mesh whose do not would come out shrunk toward
    // the origin, which is a distinctive and memorable way for a character to be wrong.
    mat4 sk = uBones[int(aJoint.x)] * aWeight.x
            + uBones[int(aJoint.y)] * aWeight.y
            + uBones[int(aJoint.z)] * aWeight.z
            + uBones[int(aJoint.w)] * aWeight.w;
    vec4 sp = sk * vec4(aPos, 1.0);
    // Normals take the skin's rotation but not its translation. The inverse transpose is applied
    // for the model matrix only; a bone matrix with non-uniform scale in it would want the same
    // treatment, and no humanoid rig has one.
    vec3 sn = mat3(sk) * aNor;
    vec4 w = uModel * sp;
    vW = w.xyz;
    vec3 mb0 = uModel[0].xyz, mb1 = uModel[1].xyz, mb2 = uModel[2].xyz;
    vec3 modelScale2 = max(uScale * uScale, vec3(1e-8));
    mat3 normalModel = mat3(
      mb0 / modelScale2.x,
      mb1 / modelScale2.y,
      mb2 / modelScale2.z);
    vN = normalize(normalModel * sn);
    vUv = aUv;
    vL = sp.xyz;
    gl_Position = uProj * uView * w;
  }`;

  // The crowd form of the skinned vertex shader. A uniform bone array makes every character a
  // separate draw because uniforms cannot vary by instance. Here every instance occupies one row
  // of an RGBA32F texture: four texels are the four columns of one mat4, and gl_InstanceID selects
  // the row. The model matrix and colour remain ordinary instance attributes. This keeps every
  // vertex, weight, face, hairstyle and garment from the authored LOD; it changes only how the
  // already-computed pose matrices reach the GPU.
  const SKIN_INST_VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  layout(location=2) in vec2 aUv;
  layout(location=3) in vec4 aJoint;
  layout(location=4) in vec4 aWeight;
  layout(location=5) in mat4 iModel;      // locations 5,6,7,8
  layout(location=9) in vec3 iColor;
  uniform mat4 uProj, uView;
  uniform highp sampler2D uBoneTex;
  out vec3 vN; out vec3 vW; out vec2 vUv; out vec3 vL;
  out vec3 uColor; out vec3 uScale;

  mat4 instanceBone(float jointIndex) {
    int x = int(jointIndex + 0.5) * 4;
    int y = gl_InstanceID;
    return mat4(texelFetch(uBoneTex, ivec2(x,     y), 0),
                texelFetch(uBoneTex, ivec2(x + 1, y), 0),
                texelFetch(uBoneTex, ivec2(x + 2, y), 0),
                texelFetch(uBoneTex, ivec2(x + 3, y), 0));
  }

  void main(){
    mat4 sk = instanceBone(aJoint.x) * aWeight.x
            + instanceBone(aJoint.y) * aWeight.y
            + instanceBone(aJoint.z) * aWeight.z
            + instanceBone(aJoint.w) * aWeight.w;
    vec4 sp = sk * vec4(aPos, 1.0);
    vec3 sn = mat3(sk) * aNor;
    vec4 w = iModel * sp;
    vW = w.xyz;
    vec3 mb0 = iModel[0].xyz, mb1 = iModel[1].xyz, mb2 = iModel[2].xyz;
    vec3 modelScale2 = max(vec3(dot(mb0, mb0), dot(mb1, mb1), dot(mb2, mb2)), vec3(1e-8));
    uScale = sqrt(modelScale2);
    uColor = iColor;
    mat3 normalModel = mat3(
      mb0 / modelScale2.x,
      mb1 / modelScale2.y,
      mb2 / modelScale2.z);
    vN = normalize(normalModel * sn);
    vUv = aUv;
    vL = sp.xyz;
    gl_Position = uProj * uView * w;
  }`;

  // The depth pass, instanced. Same silhouette resolution as the visible one — a shadow cast by
  // a different shape than the one you can see is worse than no shadow at all.
  const DEPTH_VS_I = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  layout(location=3) in mat4 iModel;
  uniform mat4 uProj, uView;
  uniform float uRound;
  void main(){
    vec3 scale = vec3(length(iModel[0].xyz), length(iModel[1].xyz), length(iModel[2].xyz));
    vec3 pos = aPos;
    if (uRound > 0.0) {
      vec3 r = min(vec3(uRound) / max(scale, vec3(1e-3)), vec3(0.34));
      pos = aPos * (vec3(0.5) - r) + aNor * r;
    }
    gl_Position = uProj * uView * iModel * vec4(pos, 1.0);
  }`;

  // uMode: 0 lit, 1 emissive, 2 contact shadow, 3 floorboards, 4 plaster, 5 light pool,
  //        6 wood, 7 woven fabric, 8 window sunpatch, 9 paving slabs, 10 asphalt,
  //        11 grey brick, 12 sky dome, 13 roof tiles, 14 render concrete, 15 foliage,
  //        16 water, 17 grass, 18 glass, 19 skin.
  const FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec3 vW; in vec2 vUv; in vec3 vL;
  uniform vec3 uColor, uEye, uScale, uRoom, uBulb, uWhite;
  uniform float uDeckY;
  // Local lights. Until now a room had exactly one — uBulb, the lamp overhead — and every
  // other light in the game was painted on: an emissive panel to look bright and a glow decal
  // on the floor to fake the pool under it. That reads at a glance and falls apart the moment
  // anything stands near it, because nothing in the room is actually being lit.
  //
  // (No backticks anywhere in this string. It is a JS template literal, and one inside a
  // comment ends the shader source mid-declaration — which is a syntax error reported against
  // whatever identifier happens to follow, forty lines from the thing that caused it.)
  //
  // Eight is a deliberate ceiling rather than a clustered renderer. A room here has a handful
  // of lights that matter — three pendants over three tables, a strip under a hood, the case in
  // the counter — and eight covers that with a plain loop and no spatial structure to build,
  // debug or keep correct. When a room genuinely needs more than eight, that is the moment to
  // write the froxel grid, and not before.
  #define MAXL 8
  uniform int uNL;
  uniform vec3 uLPos[MAXL];
  uniform vec3 uLCol[MAXL];    // colour premultiplied by intensity
  uniform float uLRad[MAXL];   // where it falls to nothing
  uniform vec3 uSun, uSunCol, uSky, uGround;
  uniform vec3 uWinPos; uniform vec2 uWinHalf;
  // The active window's plane: outward normal, and the horizontal axis of the opening. Supplied
  // rather than derived so the fragment shader does no cross product and no normalize. Defaults
  // (0,0,-1) and (-1,0,0) reproduce the z-plane window this shader had before there was a
  // registry, bit for bit. uWinShade is the curtain: 1 open, 0 drawn.
  uniform vec3 uWinN, uWinU; uniform float uWinShade;
  uniform vec3 uFogCol, uSkyA, uSkyB;
  uniform highp int uMode;
  uniform float uAlpha, uGlow, uGloss, uBevel, uBulbOn, uSunAmt, uGlyphAssist;
  // What the weather is doing to every surface in the world, as three numbers: how wet it is, how
  // much snow has settled, and how hard it is blowing. They are here rather than baked into each
  // prop's colour because a street does not get wet prop by prop — the rain falls on all of it at
  // once, and a scene's props are built once at load and never rebuilt again. uLeaf is the season,
  // for the same reason: one tint over every canopy in the game turns July into October without
  // anybody having to touch a tree.
  uniform vec3 uWeather;
  uniform vec3 uLeaf;
  uniform float uIndoor, uWinOn, uFogNear, uFogD, uTime, uExpose;
  // Decals. uTexOn switches them on, uTexRect picks one cell out of the atlas. Red carries crisp
  // ink and green a slightly wider edge mask. The ink still takes uColor and is lit like
  // everything else, which lets one sheet serve gold characters on red paper and black ones on
  // a white shop board alike; the extra channel only keys pale writing against busy backgrounds.
  uniform sampler2D uTex;
  uniform float uTexOn;
  uniform vec4 uTexRect;
  // Surface texture, which is a different thing from the decal atlas above. Two ways in:
  //   1 — a downloaded model's own albedo map, read through the UVs that came with it.
  //   2 — a tiling material (brick, concrete, wood) read triplanar in world space, for the
  //       walls and floors built out of primitives, which have no UVs worth using: a box's
  //       are 0..1 per face, so one texture would stretch across a four-metre wall and repeat
  //       forty times on a four-centimetre block.
  uniform sampler2D uMat;
  uniform float uMatOn;      // 0 off · 1 model albedo · 2 triplanar
  uniform float uMatCut;     // alpha-test threshold for hair, brows and other cutout materials
  uniform float uMatScale;   // metres per tile, mode 2
  uniform float uMatAmt;     // how far the tiling texture is allowed to move the colour
  uniform float uMatMean;    // measured linear mean, so a texture adds detail rather than lift
  // The height in the surface, which is the difference between a photograph of brick and
  // something that reads as brick. Same two modes as uMatOn, on its own unit.
  uniform sampler2D uNrm;
  uniform float uNrmOn;
  uniform float uNrmAmt;
  // glTF's packed occlusion/roughness/metal map. It travels with the normal texture on the JS
  // side, so downloaded models gain their authored response without changing Build's prop API.
  uniform sampler2D uArm;
  uniform float uArmOn, uRoughness, uMetallic;
  // Sun shadows. uShadowPx is (world metres per texel, one texel in uv).
  uniform highp sampler2DShadow uShadow;
  uniform mat4 uLightVP;
  uniform float uShadowOn;
  uniform vec2 uShadowPx;
  layout(location = 0) out vec4 frag;
  // How much of this pixel is a light rather than merely a lit thing. The post chain blooms this
  // and nothing else, which is the whole difference between the lanterns glowing and the street
  // going soft. Thresholding the finished picture instead does not work, and the metro concourse
  // is the proof: white tile under a lit ceiling sits at nine tenths of full scale, so a threshold
  // low enough to catch a ceiling lamp catches the entire room and the upgrade arrives as fog. A
  // fragment knows whether it is a light. The image it ends up in does not.
  layout(location = 1) out vec4 fragLight;
  // How far this pixel is from the eye, packed to sixteen bits, so the post chain can work out
  // what is tucked into a corner and darken it. The alpha of this output is not a colour: it is
  // whether this draw is allowed to write here at all, and it is load-bearing — see below.
  layout(location = 2) out vec4 fragGeom;
  // The range the packed distance covers. Written from GEOM_FAR_M on the JS side, which the post
  // shader is written from too, because these two agreeing is not optional: measure an occlusion
  // sample against a different ruler than it was written on and the whole map is wrong. It used to
  // be the same literal typed into both files under a comment asking the reader to keep them equal.
  const float GEOM_FAR = ${GEOM_FAR_M.toFixed(1)};

  // The second coefficient must not sit near a multiple of 2π. At 289.1 it was 0.07 rad off
  // 46·2π, so sin() barely moved as the second argument changed and every noise() in here
  // came out as stripes instead of blobs — visible as corduroy on pavements, plaster, wood
  // and cloth alike.
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  // Exact sRGB transfer functions. The former pow(2.2) approximation made the bottom quarter of
  // the range too dark, which is precisely where indoor shadow colour and skin live.
  vec3 srgb2lin(vec3 c){
    c = max(c, 0.0);
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(hi, lo, step(c, vec3(0.04045)));
  }
  vec3 lin2srgb(vec3 c){
    c = max(c, 0.0);
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(hi, lo, step(c, vec3(0.0031308)));
  }
  // ACES fitted shoulder, with a small amount of highlight desaturation and headroom deliberately
  // left below display white. The old per-channel clamp reached 1.0 on strong local lights, so a
  // white airport wall and the lamp lighting it became the same featureless value. This curve is
  // still cheap enough for the fallback path where post-processing is disabled.
  vec3 tonemap(vec3 x){
    x = max(x * uWhite, 0.0);
    vec3 y = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    y = max(y, 0.0) * 0.965;
    float peak = max(y.r, max(y.g, y.b));
    float lum = dot(y, vec3(0.2126, 0.7152, 0.0722));
    y = mix(y, vec3(lum), smoothstep(0.78, 1.02, peak) * 0.12);
    return clamp(y, 0.0, 0.985);
  }

  // Beijing haze. Low view rays collect denser horizon smog, while raised silhouettes fade
  // toward the cooler zenith. One flat fog colour made tower tops, tree crowns and street-level
  // facades collapse into the same grey plane instead of giving the district aerial depth.
  vec3 haze(vec3 c, vec3 p){
    if (uFogD <= 0.0) return c;
    vec3 ray = p - uEye;
    float viewD = length(ray);
    float d = max(0.0, viewD - uFogNear);
    float lift = clamp((ray.y + 0.50) * 0.09, 0.0, 0.72);
    vec3 fog = mix(uFogCol, uSkyA, lift);
    return mix(c, fog, 1.0 - exp(-d * uFogD));
  }

  float openness(vec3 p, vec3 n){
    if (uIndoor < 0.5) {
      // Outdoors there is no ceiling to close in the sky. What is left is how much of the
      // hemisphere a surface faces, plus grime and bounce shadow low down at street level.
      return mix(0.74, 1.0, 0.5 + 0.5 * n.y) * mix(0.66, 1.0, smoothstep(0.0, 1.5, p.y));
    }
    // Height above the FLOOR OF THIS DECK, not above world zero. In a twelve-storey building the
    // difference is the whole effect: on deck 7 the floor is at y 18.6, so max(p.y, 0.0) is 18.6
    // at skirting level, the smoothstep below saturates, and nothing on that floor gets any contact
    // darkening at all. Every floor above the second read flatter than the lobby.
    // NB no backticks in this comment on purpose - the whole shader is one JS template literal.
    float toFloor = max(p.y - uDeckY, 0.0);
    float toCeiling = max(uRoom.y - p.y, 0.0);
    float toWall = min(uRoom.x - abs(p.x), uRoom.z - abs(p.z));
    float a = mix(0.47, 1.0, smoothstep(0.0, 0.62, toFloor));
    a *= mix(0.76, 1.0, smoothstep(0.0, 0.45, toCeiling));
    a *= mix(0.60, 1.0, smoothstep(0.0, 0.72, max(toWall, 0.0)));
    a *= mix(0.83, 1.0, 0.5 + 0.5 * n.y);
    return a;
  }

  // How much direct sun reaches this point: walk from it toward the sun until it crosses
  // the plane of the window, then test the opening. One window and no occluders, which for
  // a single-room apartment is the whole story — and it puts a correctly shaped, correctly
  // moving shaft of light on the floor, the bed and the walls alike, which a flat decal
  // pasted on the floorboards can never do.
  //
  // The plane is uWinN/uWinU rather than a hard-coded z. That is what lets a north room and a
  // south room in the same building light differently: the old form solved (uWinPos.z - p.z)/s.z
  // and rejected any sun with s.z >= 0, so an opening in the +z wall — or in either x wall —
  // could not cast at all, whatever position it was given. With uWinN = (0,0,-1) and
  // uWinU = (-1,0,0) every line below is arithmetically the line it replaces.
  float beam(vec3 p){
    vec3 s = normalize(uSun);
    float d = dot(s, uWinN);
    if (d < 1e-3) return 0.0;                          // sun not on the window's side
    float t = dot(uWinPos - p, uWinN) / d;
    if (t < 0.0) return 0.0;
    vec3 h = (p + s * t) - uWinPos;
    vec2 q = vec2(dot(h, uWinU), h.y);
    vec2 e = abs(q) - uWinHalf;
    float rect = (1.0 - smoothstep(-0.04, 0.05, e.x))
               * (1.0 - smoothstep(-0.04, 0.05, e.y));
    // the sash bars between the panes, which are what make it read as a window
    float bars = min(smoothstep(0.020, 0.055, abs(q.x)),
                     smoothstep(0.020, 0.055, abs(q.y)));
    return rect * mix(0.34, 1.0, bars);
  }

  // How much of the sun reaches this point, from the depth map. Returns 1 where there is no
  // map, outside it, or beyond its far plane, so the worst a miss can do is full sunlight.
  float sunVisible(vec3 p, vec3 n){
    if (uShadowOn < 0.5) return 1.0;
    // Offset along the surface normal before looking up, rather than biasing the depth. Depth
    // bias alone either leaves acne on every sloping roof or lifts the shadow off the foot of
    // whatever casts it; a normal offset of a texel or two does neither.
    vec4 lp = uLightVP * vec4(p + n * uShadowPx.x * 1.8, 1.0);
    vec3 q = lp.xyz / lp.w * 0.5 + 0.5;
    if (q.z > 1.0) return 1.0;
    float s = 0.0;
    // Four taps on the diagonals. Each is already bilinear-filtered against the depth
    // comparison by the hardware, so four of them read like a sixteen-tap kernel.
    vec2 e = vec2(uShadowPx.y * 1.1);
    s += texture(uShadow, vec3(q.xy + vec2(-e.x, -e.y), q.z));
    s += texture(uShadow, vec3(q.xy + vec2( e.x, -e.y), q.z));
    s += texture(uShadow, vec3(q.xy + vec2(-e.x,  e.y), q.z));
    s += texture(uShadow, vec3(q.xy + vec2( e.x,  e.y), q.z));
    s *= 0.25;
    // Feather the edge of the map, or the boundary of the lit area reads as a hard line drawn
    // across the street as you walk.
    vec2 d = abs(q.xy * 2.0 - 1.0);
    float fade = 1.0 - smoothstep(0.80, 1.0, max(d.x, d.y));
    return mix(1.0, s, fade);
  }

  float edgeDist(){
    vec3 e = (vec3(0.5) - abs(vL)) * uScale;
    float mn = min(e.x, min(e.y, e.z));
    float mx = max(e.x, max(e.y, e.z));
    return e.x + e.y + e.z - mn - mx;
  }

  // A tangent frame recovered from screen-space derivatives, rather than one shipped down from
  // the vertex stage. None of these models carries a TANGENT attribute — Poly Haven's glTF has
  // position, normal and one UV set and nothing else — so the alternative was generating
  // tangents at load time for every asset. This costs a handful of instructions per fragment
  // and no memory, and it works for any mesh that arrives, including ones added later.
  vec3 perturbUV(vec3 N, vec3 p, vec2 uv, vec3 t) {
    vec3 dp1 = dFdx(p), dp2 = dFdy(p);
    vec2 du1 = dFdx(uv), du2 = dFdy(uv);
    vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
    vec3 T = dp2p * du1.x + dp1p * du2.x;
    vec3 B = dp2p * du1.y + dp1p * du2.y;
    float inv = inversesqrt(max(dot(T, T), dot(B, B)) + 1e-8);
    return normalize(mat3(T * inv, B * inv, N) * t);
  }

  void main(){
    // Decal coverage, resolved before anything else so a glyph writes no depth where there is
    // no ink. Without the discard the transparent corners of every character would punch a
    // square hole in whatever is behind the sign.
    float cov = 1.0;
    float glyphInk = 1.0;
    float glyphEdge = 0.0;
    float glyphBright = 0.0;
    if (uTexOn > 0.5) {
      // A small negative bias keeps dense Chinese strokes on the sharper mip for one more metre.
      // The atlas has a black gutter around every cell, so this cannot borrow a neighbour. Red and
      // green arrive in the same filtered lookup: red is ink, green is the wider edge mask.
      // A negative cell height is Build's zero-cost role bit for a primary Han sign. UVs use its
      // magnitude, so unclassified text is identical. The assist rises only through the 8-15 m
      // concourse-reading band and tapers before a word is too small to resolve; close signs do
      // not gain stroke weight. Low/Basic send zero through uGlyphAssist.
      float stableRole = uTexRect.w < 0.0 ? 1.0 : 0.0;
      float signDistance = length(uEye - vW);
      float stableBand = uGlyphAssist * stableRole * smoothstep(7.0, 9.0, signDistance)
        * (1.0 - smoothstep(16.0, 21.0, signDistance));
      vec2 glyphSpan = vec2(uTexRect.z, abs(uTexRect.w));
      vec4 glyphMask = texture(uTex, uTexRect.xy + vUv * glyphSpan, -0.28);
      glyphInk = smoothstep(mix(0.14, 0.10, stableBand),
                            mix(0.58, 0.52, stableBand), glyphMask.r);
      float broad = smoothstep(0.08, 0.56, glyphMask.g);
      // The green channel is the atlas's existing wider mask. At distance, a restrained fraction
      // fills red strokes that trilinear sampling would otherwise erase between pixels. No extra
      // sample, atlas, buffer field or batch is introduced.
      glyphInk = max(glyphInk, broad * stableBand * 0.16);
      glyphBright = smoothstep(0.16, 0.68,
        dot(srgb2lin(uColor), vec3(0.2126, 0.7152, 0.0722)));
      // Dark print on a light fare table needs no extra weight. Bright flight-board and shop-sign
      // text gets a restrained dark keyline, strongest where the broad mask contains no real ink.
      glyphEdge = max(0.0, broad - glyphInk) * mix(0.055, 0.32, glyphBright);
      cov = max(glyphInk, glyphEdge);
      if (cov < 0.012) discard;
    }
    // Hair cards and eyebrows in authored characters carry their silhouette in the albedo
    // texture's alpha channel. Resolve that before writing the geometry buffer as well as the
    // colour buffer, or the invisible rectangle around every strand still occludes the face and
    // casts a dark card-shaped halo in screen-space AO. The same lookup is reused for colour
    // below, so opaque model materials do not pay for a second texture fetch.
    vec4 surfaceMap = vec4(1.0);
    if (uMatOn > 0.5 && uMatOn < 1.5) {
      surfaceMap = texture(uMat, vUv);
      if (uMatCut > 0.0 && surfaceMap.a < uMatCut) discard;
    }
    // Nothing is a light until it says so, and nothing is geometry until it says so. Written here,
    // once, because there are a dozen ways out of this function and an output that some of them
    // never touch is undefined down those paths.
    fragLight = vec4(0.0, 0.0, 0.0, uAlpha * cov);
    // A decal is not geometry. The contact shadows, the light pools and the sun patches all lie on
    // a floor that has already written itself here, and letting them blend their own distance over
    // the top of it would put a soft dent in the occlusion wherever one of them landed.
    float gsolid = (uAlpha > 0.985 && uTexOn < 0.5 &&
      uMode != 2 && uMode != 5 && uMode != 8) ? 1.0 : 0.0;
    float gz = clamp(length(vW - uEye) / GEOM_FAR, 0.0, 1.0);
    fragGeom = vec4(floor(gz * 255.0) / 255.0, fract(gz * 255.0), 0.0, gsolid);
    // ---- the contact shadow, and why this was the wrong shape for eight rooms.
    //
    // This used to be length(vUv - 0.5) * 2.0 — a RADIAL distance — faded by (1-d)². On a
    // rectangular patch that is zero at every edge midpoint and already negative at the corners,
    // so the only part of the quad carrying any shadow was the disc inscribed in it. A patch sized
    // to an object's own footprint therefore had **no alpha at all where its legs came down**.
    //
    // Measured on the deck 4 ping-pong table before this changed: a 2.90 × 1.70 m patch put its
    // four feet at r = sqrt((1.18/1.45)² + (0.60/0.85)²) = 1.08 — past the support entirely, so
    // literally zero. The mahjong table's legs landed at r = 0.89 (0.4% of the authored alpha),
    // its chairs at r = 0.94 (0.09%), a plant pot's rim at r = 0.70 (9%). Every one of them drew a
    // smudge under its own centre, where nothing touches the floor, and nothing under the parts
    // that do. That is most of why furniture across the whole game read as floating, and it is not
    // a per-room authoring fault: no size of radial patch can ground a corner-legged object,
    // because oversizing it until the corners fall inside is also what throws the alpha away.
    //
    // The fix is the shape this file already uses twice. Modes 5 and 8 measure abs(vUv - 0.5)
    // per axis and roll off with smoothstep — a box with a flat core, which is the right footprint
    // for a rectangular patch. Mode 2 was the only one of the three doing it radially.
    //
    // Full strength out to 45% of each half-extent, then a soft edge. Centre alpha is unchanged,
    // so every authored alpha still means what its author measured it to mean; what changes is
    // the shadow now reaches the corners instead of vanishing before the edge.
    if (uMode == 2) {
      vec2 q = abs(vUv - 0.5) * 2.0;
      float f = (1.0 - smoothstep(0.45, 1.0, q.x)) * (1.0 - smoothstep(0.45, 1.0, q.y));
      frag = vec4(0.0, 0.0, 0.0, uAlpha * f);
      return;
    }
    if (uMode == 5) {
      vec2 q = abs(vUv - 0.5) * 2.0;
      float f = (1.0 - smoothstep(0.35, 1.0, q.x)) * (1.0 - smoothstep(0.25, 1.0, q.y));
      frag = vec4(uColor * f * uAlpha, 1.0);
      fragLight = vec4(uColor * f * uAlpha, 1.0);
      return;
    }
    // Sunlight through a window, as opposed to the soft bloom of a lamp: a defined patch
    // with a shadow line where the sash bar between the two panes crosses it.
    if (uMode == 8) {
      vec2 q = abs(vUv - 0.5) * 2.0;
      float f = (1.0 - smoothstep(0.70, 1.0, q.x)) * (1.0 - smoothstep(0.58, 1.0, q.y));
      f *= 1.0 - 0.42 * (1.0 - smoothstep(0.010, 0.055, abs(vUv.x - 0.5)));
      frag = vec4(uColor * f * uAlpha, 1.0);
      fragLight = vec4(uColor * f * uAlpha * 0.55, 1.0);
      return;
    }
    // The sky, drawn as a dome around the eye. Colours are authored ready for display, so
    // only the sun disc needs taming on the way out.
    if (uMode == 12) {
      vec3 d = normalize(vW - uEye);
      vec3 c = mix(uSkyB, uSkyA, pow(clamp(d.y, 0.0, 1.0), 0.55));
      // Smog piles up at the horizon and takes the colour of whatever the sun is doing.
      float band = exp(-max(d.y, 0.0) * 6.5);
      c = mix(c, mix(uSkyB, uSunCol, 0.30), band * 0.60);
      vec3 s = normalize(uSun);
      float sd = max(dot(d, s), 0.0);
      c += uSunCol * pow(sd, 1500.0) * 2.4 * uSunAmt;          // the disc itself
      c += uSunCol * pow(sd, 8.0) * 0.14 * uSunAmt;            // and its bloom through the haze

      // ---- 夜空 the night sky, which until now was a dark gradient and nothing else. A city has
      // few enough stars that a handful is honest and a planetarium is not, so these are sparse,
      // dimmed toward the horizon where the smog is, and put out entirely by cloud and by dawn.
      float night = 1.0 - smoothstep(0.06, 0.52, uSunAmt);
      float moonLit = 0.0;
      if (night > 0.002) {
        // Fixed to the sky rather than to the screen: the cell is indexed by the *direction* of
        // the ray, so a star stays where it is while the camera turns. In screen space they would
        // swim, which is the one thing that would give the whole trick away.
        vec2 sph = vec2(atan(d.z, d.x) * 0.15915494, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989);
        vec2 g = sph * 232.0;
        vec2 id = floor(g), fr = fract(g);
        float h = hash(id);
        if (h > 0.9715) {
          // Somewhere inside its own cell, so they are not on a lattice.
          vec2 at = vec2(hash(id + 3.71), hash(id + 9.13));
          float star = 1.0 - smoothstep(0.0, 0.14, length(fr - at));
          // Air is never still, and a star that does not move reads as a dead pixel.
          float tw = 0.62 + 0.38 * sin(uTime * 0.0021 + h * 91.0);
          // Cooler or warmer by star, and thinned out toward the horizon haze.
          vec3 tint = mix(vec3(0.80, 0.87, 1.0), vec3(1.0, 0.92, 0.80), hash(id + 21.5));
          float lo = smoothstep(0.02, 0.30, d.y);
          float mag = star * tw * lo * night * (0.35 + (h - 0.9715) * 20.0);
          c += tint * mag;
          moonLit += mag * 0.30;
        }
        // The moon, opposite the sun and a little higher, because that is where it is for most of
        // a night and getting it exactly right is worth nothing to anybody standing on the Bund.
        vec3 md = normalize(vec3(-s.x, abs(s.y) * 0.55 + 0.42, -s.z));
        float mc = max(dot(d, md), 0.0);
        float disc = smoothstep(0.99955, 0.99975, mc);
        // A gibbous face: the limb away from the sun falls off, which is the whole reason a moon
        // reads as a sphere and not as a hole punched in the sky.
        vec3 across = normalize(md - s * dot(md, s));
        float phase = 0.42 + 0.58 * smoothstep(-0.0009, 0.0011, dot(d - md, across));
        vec3 moon = vec3(0.94, 0.94, 0.90) * (0.55 + 0.45 * phase);
        c += moon * disc * night * 1.35;
        c += vec3(0.72, 0.76, 0.86) * pow(mc, 1400.0) * 0.30 * night;   // its halo in the haze
        moonLit += disc * night * 1.2 + pow(mc, 1400.0) * 0.25 * night;
      }
      // Cloud banks, flattened toward the horizon the way real ones foreshorten.
      vec2 q = d.xz / max(abs(d.y) + 0.14, 0.14) * 0.72 + vec2(uTime * 0.004, 0.0);
      float cl = noise(q) * 0.52 + noise(q * 2.3) * 0.29 + noise(q * 5.3) * 0.19;
      // Held up off the horizon, and smaller. Foreshortened to nothing down there the banks become
      // half a dozen enormous soft blobs — and everything the haze mixes toward the sky comes out
      // mottled with them, which at the Bund is the entire far bank of the river.
      cl = smoothstep(0.52, 0.92, cl) * smoothstep(0.06, 0.36, d.y);
      vec3 cloud = mix(vec3(0.90, 0.90, 0.92), uSunCol, 0.40) * (0.34 + 0.70 * uSunAmt);
      c = mix(c, cloud, cl * 0.78);
      c = c / (1.0 + max(c - 1.0, 0.0));                       // soft knee, no clipped disc
      frag = vec4(c + (hash(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
      // What of the sky is a light, and it is *not* "the bright parts of the sky". Thresholding the
      // finished colour looked right at night and washed the whole picture out at two in the
      // afternoon: an overcast sky is bright edge to edge, so it all passed the threshold and the
      // bloom came back as milk poured over the frame. The sun is a light. The moon is a light. The
      // sky is merely bright, so it is measured from the disc terms directly instead.
      fragLight = vec4(uSunCol * (pow(sd, 1500.0) * 2.0 + pow(sd, 10.0) * 0.10) * uSunAmt
                       + vec3(0.86, 0.89, 0.96) * moonLit, 1.0);
      return;
    }

    vec3 base = srgb2lin(uColor);
    if (uTexOn > 0.5) {
      // The edge is coverage, not coloured ink. Fade it toward near-black while the centre keeps
      // the authored sign colour; the packed mask therefore improves contrast without changing
      // the palette or turning every label into glowing outlined type.
      float inkShare = clamp(glyphInk / max(cov, 0.001), 0.0, 1.0);
      base = mix(base * mix(0.10, 0.025, glyphBright), base, inkShare);
    }
    // A model's albedo map *is* its colour — a photographed asset carries white in its base
    // colour factor and everything else in the map, so this replaces rather than tints.
    //
    // A tiling material is the opposite: the scene already decided that this wall is sage
    // green, and that decision is art direction worth keeping. So mode 2 divides the texture
    // by mid grey and multiplies, which leaves the chosen colour where it was and lets only
    // the variation through. A wall stops being flat without ceasing to be the colour it was
    // picked to be.
    if (uMatOn > 0.5) {
      if (uMatOn > 1.5) {
        vec3 an = abs(normalize(vN));
        vec3 bw = an / max(an.x + an.y + an.z, 1e-4);
        vec3 t = srgb2lin(texture(uMat, vW.zy / uMatScale).rgb) * bw.x
               + srgb2lin(texture(uMat, vW.xz / uMatScale).rgb) * bw.y
               + srgb2lin(texture(uMat, vW.xy / uMatScale).rgb) * bw.z;
        // Divide by this photograph's actual mean rather than an imaginary universal mid-grey.
        // The material then contributes contrast and grain while leaving the scene's chosen paint
        // colour at the same average brightness. This is especially important for white tile and
        // plaster, whose source maps average well over twice the old 0.22 constant.
        base *= mix(vec3(1.0), t / max(uMatMean, 0.015), uMatAmt);
      } else {
        base *= srgb2lin(surfaceMap.rgb);
      }
    }
    // Imported glTF material response. With no packed map these collapse exactly to the old
    // gloss-only semantics. The map's channels follow glTF/ambientCG convention: R occlusion,
    // G roughness, B metalness. AO is reserved for indirect light below; applying it to direct
    // lamps would bake a second, incorrect shadow into the model.
    float materialAO = 1.0;
    float materialRoughness = clamp(1.0 - uGloss, 0.055, 1.0);
    float metalness = 0.0;
    if (uArmOn > 0.5) {
      vec3 arm = texture(uArm, vUv).rgb;
      // uArmOn is 2 for a true AO/rough/metal packing and 1 for glTFs that carry only roughness
      // in this slot. Treating a grayscale roughness map as occlusion darkens the whole asset.
      if (uArmOn > 1.5) materialAO = mix(1.0, arm.r, 0.72);
      materialRoughness = clamp(arm.g * uRoughness, 0.055, 1.0);
      metalness = clamp(arm.b * uMetallic, 0.0, 1.0);
    }
    // The geometric normal, and somewhere for a material to bend it. Water is the reason: ripples
    // are a normal, not a colour, and the lighting below reads the normal well after these blocks.
    vec3 gn = normalize(vN);
    vec3 nBend = vec3(0.0);
    if (uMode == 3) {
      float plank = floor(vW.z * 3.1);
      float longGrain = noise(vec2(vW.x * 18.0, plank * 5.7));
      float fineGrain = noise(vec2(vW.x * 56.0, vW.z * 2.1));
      base *= 0.79 + longGrain * 0.25 + fineGrain * 0.08;
      float seam = smoothstep(0.0, 0.05, abs(fract(vW.z * 3.1) - 0.5) - 0.435);
      float butt = smoothstep(0.0, 0.05, abs(fract(vW.x * 0.42 + plank * 0.37) - 0.5) - 0.47);
      base *= 1.0 - max(seam, butt) * 0.43;
    }
    if (uMode == 4) {
      // The vertical term is deck-relative. At 18–34 m the hash argument is large enough that the
      // noise degenerates into broad diagonal bands across a two-metre panel instead of grain.
      vec2 pw = vec2(vW.x, vW.y - uDeckY), pz = vec2(vW.z, vW.y - uDeckY);
      float n = noise(pw * 34.0) * 0.5 + noise(pz * 61.0) * 0.5;
      base *= 0.95 + n * 0.10;
      base *= 0.90 + 0.14 * smoothstep(0.0, 2.4, vW.y - uDeckY);
    }
    if (uMode == 6) {
      // Subtle directional grain, enough to distinguish wood from flat brown plastic.
      float bands = noise(vec2((vL.x + vL.z) * 34.0, vL.y * 5.0));
      float pores = noise(vec2(vW.x * 23.0 + vW.z * 17.0, (vW.y - uDeckY) * 31.0));
      base *= 0.84 + bands * 0.20 + pores * 0.06;
    }
    if (uMode == 7) {
      // Fine woven variation; intentionally quiet so upholstery still reads at room scale.
      float weave = noise(vW.xy * 72.0) * 0.5 + noise(vW.zy * 79.0) * 0.5;
      base *= 0.91 + weave * 0.13;
    }
    if (uMode == 9) {
      // Pavement: metre-ish slabs, each laid a slightly different shade, with dirt in the
      // joints. A street reads as a street mostly through its ground.
      vec2 g = vW.xz / 0.62;
      vec2 f = abs(fract(g) - 0.5);
      // Both directions of joint are computed separately. Taking max() of the two distances
      // first collapses the grid into corduroy at grazing angles, which is what a pavement
      // seen down the length of an alley always is.
      float jx = smoothstep(0.435, 0.496, f.x);
      float jz = smoothstep(0.435, 0.496, f.y);
      base *= 0.80 + 0.40 * hash(floor(g) + 0.5);         // slab-to-slab tone
      base *= 0.90 + noise(vW.xz * 3.1) * 0.17;
      base *= mix(1.0, 0.56, max(jx, jz));
    }
    if (uMode == 15) {
      // 树叶 foliage. Every tree in this game is a handful of spheres, and painted in one flat
      // green each that is exactly what they read as: balloons on a stick, with the seam of the
      // sphere showing down the middle of every one. Three things fix it and none of them costs
      // a texture.
      //
      // First, break the flat green with noise in *world* space — so it runs across the cluster
      // boundaries instead of stopping at them, which is what hides the seams. Two octaves at
      // very different scales: one for masses of leaf, one for individual leaves.
      float mass = noise(vW.xz * 1.7 + vW.y * 0.9);
      float leaf = noise(vW.xz * 21.0) * 0.6 + noise(vec2(vW.y * 26.0, vW.x * 19.0)) * 0.4;
      base *= 0.74 + mass * 0.30 + leaf * 0.22;
      // Second, tint each tree slightly differently. The seed is the cluster's own position, so
      // it is stable, and it moves both the hue and the depth of the green: a row of street trees
      // in one green is a wallpaper pattern, and it was.
      float who = hash(floor(vW.xz * 0.35 + 0.5));
      base *= mix(vec3(0.88, 1.05, 0.82), vec3(1.10, 0.98, 0.78), who);
      // 季节 the season, on top of the per-tree variation rather than instead of it, so an autumn
      // row of trees still turns at slightly different rates the way a real one does. The seed is
      // the same cluster hash, so a tree that is a little yellow in July is the first to go in
      // September.
      base *= mix(uLeaf, uLeaf * vec3(1.06, 0.94, 0.86), who);
      // Third, leaves are lit from the sky and shaded underneath far more than a solid would be,
      // because the mass above them is in the way. This is what gives a canopy its depth.
      base *= 0.62 + 0.46 * smoothstep(-0.7, 0.9, gn.y);
    }
    if (uMode == 16) {
      // 水 water. Both bodies of water in this game — the lake in the park and the Huangpu at the
      // Bund — were flat matte planes painted a water colour, which is the one thing water never
      // is. What reads as water is not its colour but that its surface is moving, and a moving
      // surface is a *normal*, so most of this is spent bending one.
      vec2 p = vW.xz;
      float t = uTime * 0.001;
      // Two crossing wave trains at angles that do not divide into each other, so the pattern
      // never resolves into a grid, plus a slow drift of finer chop over the top.
      float a1 = sin(p.x * 1.9 + p.y * 0.7 + t * 1.35);
      float a2 = sin(p.x * -1.1 + p.y * 2.3 + t * 0.95);
      float chop = noise(p * 3.7 + vec2(t * 0.42, -t * 0.31)) - 0.5;
      // Ripples tilt the surface: the derivative of the waves, not their height.
      nBend = vec3(cos(p.x * 1.9 + p.y * 0.7 + t * 1.35) * 1.9
                 - cos(p.x * -1.1 + p.y * 2.3 + t * 0.95) * 1.1,
                   0.0,
                   cos(p.x * 1.9 + p.y * 0.7 + t * 1.35) * 0.7
                 + cos(p.x * -1.1 + p.y * 2.3 + t * 0.95) * 2.3) * 0.055
              + vec3(chop, 0.0, chop) * 0.22;
      // Deeper water is darker, and the troughs of the swell darker than the crests.
      base *= 0.90 + (a1 + a2) * 0.045 + chop * 0.16;
      // Looking straight down you see into it; at a grazing angle you see the sky on it, which is
      // the whole reason a lake reads as a lake from the bank.
      float graze = 1.0 - abs(normalize(uEye - vW).y);
      base = mix(base, base * 0.62 + uSky * 0.55, pow(clamp(graze, 0.0, 1.0), 3.2) * 0.72);
    }
    if (uMode == 17) {
      // 草 grass. It was one flat green across the whole park, which at the size of that lawn is
      // a billiard table. Clumps at two scales, a mown unevenness under them, and a fine break-up
      // that only shows when you are standing on it.
      float clump = noise(vW.xz * 2.3) * 0.58 + noise(vW.xz * 8.1) * 0.42;
      base *= 0.78 + clump * 0.36;
      base *= 0.95 + noise(vW.xz * 41.0) * 0.11;
      // Grass is never one colour: some of it is dry. Yellower where the clumps are thin.
      base *= mix(vec3(0.94, 1.02, 0.86), vec3(1.06, 1.0, 0.80), 1.0 - clump);
    }
    if (uMode == 18) {
      // 玻璃 glass. Windows across the hutong and the towers opposite were flat pale quads, which
      // is why every building read as a model of a building. Glass is dark — you are looking into
      // an unlit room — and what makes it glass is the sky sitting on top of that darkness, hard
      // at a grazing angle and hardly at all straight on.
      base *= 0.34;
      // A pane is not perfectly flat and old glass least of all, so the reflection wobbles.
      base *= 0.88 + noise(vW.xy * 5.3 + vW.z * 2.1) * 0.22;
      float fres = pow(1.0 - abs(dot(gn, normalize(uEye - vW))), 3.4);
      base += srgb2lin(mix(uSky, uSunCol, 0.22)) * (0.16 + 0.72 * fres);
    }
    // Water and window glass are smooth even when a caller omitted gloss. Authored gloss can
    // still make them smoother, while a wet road continues to take over later through wetK.
    if (uMode == 16) materialRoughness = min(materialRoughness, 0.055);
    if (uMode == 18) materialRoughness = min(materialRoughness, 0.12);
    if (uMode == 10) {
      // Asphalt: coarse aggregate plus long-wear patches down the wheel tracks.
      float n = noise(vW.xz * 30.0) * 0.55 + noise(vW.xz * 110.0) * 0.45;
      base *= 0.80 + n * 0.34;
      base *= 0.94 + 0.12 * noise(vW.xz * vec2(0.5, 3.0));
    }
    if (uMode == 11) {
      // 青砖 grey brick in running bond. Courses come off world Y so a wall is coursed
      // correctly however long it is, and the joint is paler than the brick, not darker.
      float course = floor(vW.y / 0.076);
      float u = (vW.x + vW.z) / 0.245 + mod(course, 2.0) * 0.5;
      vec2 f = vec2(abs(fract(u) - 0.5), abs(fract(vW.y / 0.076) - 0.5));
      float face = (1.0 - smoothstep(0.40, 0.485, f.x))
                 * (1.0 - smoothstep(0.32, 0.455, f.y));
      base *= 0.82 + 0.32 * hash(vec2(floor(u), course));
      base = mix(base * 1.34, base, face);
      base *= 0.93 + 0.13 * noise(vW.xy * 5.0) + 0.06 * noise(vW.xz * 21.0);
      // rain streaking down from the coping
      base *= 1.0 - 0.10 * noise(vec2((vW.x + vW.z) * 9.0, vW.y * 0.4));
    }
    if (uMode == 13) {
      // Barrel roof tiles, laid in rows running down the slope. Measured along the slab's
      // own length rather than world axes, so a roof pitched any which way still corrugates
      // across the ridge instead of diagonally.
      // Fine and low contrast. At a third of a metre and 36% swing it read as corrugated
      // steel sheeting, which is the one thing a courtyard roof must not look like.
      float across = vL.x * uScale.x, down = vL.z * uScale.z;
      // One roll per 24 cm: a pale crown, then a dark seam where the next pan laps under it.
      // The seam is what separates tile from sheeting — corrugated steel has a symmetrical
      // wave, a tiled roof has a shadow line on one side of every roll.
      float u = fract(across / 0.24);
      base *= 0.94 + 0.13 * sin(u * 6.2832);
      base *= 1.0 - 0.20 * (1.0 - smoothstep(0.0, 0.16, min(u, 1.0 - u)));
      // per-roll tone, so twenty rolls are not twenty copies of one roll
      base *= 0.93 + 0.14 * hash(vec2(floor(across / 0.24), 3.0));
      // and the courses stepping down the slope
      base *= 1.0 - 0.11 * (1.0 - smoothstep(0.0, 0.05, abs(fract(down * 2.6) - 0.5) - 0.40));
      base *= 0.93 + 0.12 * noise(vec2(across * 2.2, down * 2.8));
    }
    if (uMode == 14) {
      // Painted render on a 1980s block: broad patchiness, damp at the bottom of the wall.
      base *= 0.90 + noise(vW.xy * 1.7) * 0.16 + noise(vW.xz * 9.0) * 0.07;
      base *= mix(0.80, 1.0, smoothstep(0.0, 1.8, vW.y));
    }

    if (uMode == 1) {
      // 玻璃 glass sheen, for the emissive panes only — they are drawn with a high gloss, where a
      // lit sign or a paper lantern is not, so the gloss is the signal that this is a window.
      // Without it a pane is one flat tint of sky across its whole face and reads as a pale
      // panel; what makes it glass is that the sky sits on it hard at a grazing angle and hardly
      // at all straight on, where you see into the unlit room instead.
      if (uGloss > 0.6) {
        vec3 gn = normalize(vN);
        vec3 vv = normalize(uEye - vW);
        float fres = pow(1.0 - max(dot(gn, vv), 0.0), 3.5);
        vec3 rd = reflect(-vv, gn);
        vec3 sky = srgb2lin(mix(uSkyB, uSkyA, clamp(rd.y * 0.6 + 0.4, 0.0, 1.0)));
        // Only by day: the pane's own colour is already a lit room after dark, and the night sky
        // has nothing to add to it. The day factor fades the whole effect out as the sun goes.
        float day = clamp(uSunAmt, 0.0, 1.0);
        // ...but only a pane that can see the sky is entitled to reflect it. This had no indoor
        // guard, and a shopfront on level three of an enclosed shopping centre was picking up the
        // full outdoor sky at 0.65 of its brightness. You look along mall glazing at very shallow
        // angles almost all of the time, so fres saturates across huge areas of the frame: every
        // shop interior seen from the concourse, the food court seen down its length, and the
        // gallery seen past its balustrade were all behind a pale sky-coloured wash. It read as an
        // unexplained haze and it had been in every interior shot of the building.
        //
        // Indoors the pane is looking at the room, so the sky term is cut to a quarter rather than
        // removed — glass still needs something on it at a grazing angle or it reads as a flat
        // panel, which is the failure the sheen was added to fix in the first place.
        float env = mix(1.0, 0.25, uIndoor);
        base = base * (1.0 - 0.16 * day * env) + sky * (0.10 + 0.55 * fres) * day * env;
        // and a gentle top-to-bottom fall so the pane is not one even wash
        base *= 0.95 + 0.10 * clamp(vW.y * 0.16, 0.0, 1.0);
      }
      frag = vec4(haze(lin2srgb(tonemap(base * (1.0 + uGlow * 3.0))), vW), uAlpha * cov);
      // What this hands the glow pass, and the last piece of the doubled-room outline.
      //
      // The old baseline was a flat 0.42 *whatever the glow was*, so anything drawn in this mode
      // emitted light. But this mode is not only for lights — it is the cheap unlit shade, and it
      // is what a ceiling, a daytime window pane, a sign plate and a painted panel are all drawn
      // with. Every bright flat surface in the game was therefore a lamp: the ceiling of the flat
      // washed its own blurred image down the wall below it, the panes did it to the facades
      // outside, and what you saw on the plaster was a soft photograph of the room.
      //
      // A surface with no glow on it is not emitting anything. Scaled by the glow alone, so lamps,
      // signs and lit windows keep their halo and the ceiling stops pretending to be one.
      fragLight = vec4(frag.rgb * min(1.6, uGlow * 2.6) * cov, uAlpha * cov);
      return;
    }

    // ---- 天气 what the weather has done to this surface.
    //
    // Two effects, and between them they are most of why a rainy street reads as rainy at all.
    // Neither is a particle: the drops in the air are drawn by weather.js, and they are the part
    // people think of, but a street with rain falling on a bone-dry pavement looks like a bug. The
    // ground is where the weather actually shows.
    //
    // Wet: the surface darkens, because water fills the pores and stops them scattering, and it
    // goes glossy, because the film on top is a mirror. Applied to the ground materials and to the
    // roofs — not to cloth, not to the inside of a room, and not to anything with a canopy over it,
    // which is a limitation worth knowing about: an awning does not keep the pavement under it dry.
    //
    // Snow: settles on whatever faces the sky and nowhere else, which is the only rule that matters.
    // A flat roof goes white, a wall does not, and the join between them does it gradually because
    // that is what a corner of a roof looks like under two centimetres of snow.
    float wetK = 0.0;
    bool outdoorGround = uIndoor < 0.5 &&
      (uMode == 9 || uMode == 10 || uMode == 11 || uMode == 13 || uMode == 14 || uMode == 15);
    if (outdoorGround && (uWeather.x > 0.002 || uWeather.y > 0.002)) {
      float up = smoothstep(0.30, 0.86, gn.y);
      // Puddles pool where the ground is lowest and stay off the crown of the road. There is no
      // height field to consult, so this is noise — but noise in world space, so a puddle stays
      // put while you walk round it instead of swimming with the camera.
      float pool = smoothstep(0.42, 0.78, noise(vW.xz * 0.42) * 0.7 + noise(vW.xz * 1.9) * 0.3);
      float wet = uWeather.x * mix(0.45, 1.0, up) * (0.62 + 0.55 * pool);
      base *= mix(1.0, 0.58, wet);
      wetK = wet * 0.86;
      // Snow does not fall on foliage the way it falls on a pavement — it sits in the canopy in
      // patches — so the leaves get a lighter, blotchier covering off the same noise.
      float blotch = uMode == 15 ? 0.35 + 0.65 * noise(vW.xz * 6.0 + vW.y * 3.0) : 1.0;
      float lay = uWeather.y * smoothstep(0.42, 0.92, gn.y) * blotch;
      base = mix(base, vec3(0.82, 0.85, 0.92), lay);
      wetK = mix(wetK, 0.10, lay);            // settled snow is matte, not a mirror
    }

    vec3 n = normalize(vN + nBend);
    // Surface relief. The triplanar branch uses the whiteout blend — each plane's tangent-space
    // xy is added onto the geometric normal rather than replacing it — which is stable across
    // the seams where two planes meet and does not need a per-axis handedness fix.
    if (uNrmOn > 0.5) {
      if (uNrmOn > 1.5) {
        vec3 an = abs(n);
        vec3 bw = an / max(an.x + an.y + an.z, 1e-4);
        vec3 tx = texture(uNrm, vW.zy / uMatScale).xyz * 2.0 - 1.0;
        vec3 ty = texture(uNrm, vW.xz / uMatScale).xyz * 2.0 - 1.0;
        vec3 tz = texture(uNrm, vW.xy / uMatScale).xyz * 2.0 - 1.0;
        vec3 add = vec3(0.0, tx.y, tx.x) * bw.x
                 + vec3(ty.x, 0.0, ty.y) * bw.y
                 + vec3(tz.x, tz.y, 0.0) * bw.z;
        n = normalize(n + add * uNrmAmt);
      } else {
        vec3 t = texture(uNrm, vUv).xyz * 2.0 - 1.0;
        t.xy *= uNrmAmt;
        n = perturbUV(n, vW, vUv, normalize(t));
      }
    }
    vec3 v = normalize(uEye - vW);

    vec3 kDir = normalize(uSun);
    vec3 kCol = uSunCol * uSunAmt;
    float kd = max(dot(n, kDir), 0.0);
    // Outdoors the sun is wrapped a little past the terminator. Beijing daylight is hazy
    // enough that nothing is ever lit by the disc alone, and without the wrap a pitched roof
    // came out as one silver slope and one near-black one — the sunlit side clipping white
    // while the shaded side kept only ambient, which read as brown sheet metal rather than
    // grey tile. The divisor keeps the fully lit side where it already was.
    if (uIndoor < 0.5) kd = max(dot(n, kDir) + 0.34, 0.0) / 1.34;
    // Cast shadows. Applied to the sun term only: the sky still lights whatever the sun cannot
    // reach, which is why a shadow in the street is blue and not black.
    float shadow = sunVisible(vW, n);
    kd *= shadow;

    // 皮肤 skin. Every other material in this shader is opaque: light arrives, some of it comes
    // back, none of it goes in. Skin is the one surface in the game where that is visibly wrong,
    // and it is most of why a face made of the same shading as a wall reads as painted plastic
    // whatever colour it is given.
    //
    // Light does go into skin — a millimetre or two — scatters around, and leaves somewhere else.
    // The cheap and honest way to say that is a *per-channel* wrap: red penetrates deepest and so
    // keeps lighting the surface furthest past the angle where it has turned away from the light,
    // green less far, blue barely at all. That one substitution buys both of the cues an actual
    // subsurface solve is bought for — a terminator that is soft rather than a hard edge, and a
    // terminator that goes warm — with no blur pass, no second render target and no thickness map.
    //
    // The warmth is worth being precise about, because it is the part that looks like a trick and
    // is not: nothing here tints anything red. Red is simply the only channel still receiving
    // light in the band where the other two have already fallen to zero, so the colour appears on
    // its own, in the right place, and only in the width the wrap gives it.
    //
    // Applied to every light in the room and not just the sun. Most people in this game are
    // indoors under a bulb or a shop's own fittings, so skin lit only by the sun term would be
    // skin that behaves correctly in the one place it is least often seen.
    bool sss = uMode == 19;
    // How far past the terminator each channel keeps receiving light. Measured against the render,
    // not chosen: at the first values tried (0.62/0.34/0.20) a surface side-on to the lamp still
    // got 38% of full red, which is enough extra light across the whole shaded half of a face to
    // flatten the cheekbone and the brow out of it — the face went soft, which is the right
    // direction, and also went shapeless, which is not. These put that figure at 22%, so the
    // warmth sits in a band at the terminator instead of washing the entire dark side.
    const vec3 sssW = vec3(0.28, 0.12, 0.06);
    // The wrap, as a reusable term: given a light direction, how much of each channel this
    // surface receives. For everything that is not skin it collapses to the ordinary N.L the
    // rest of the shader has always used, so nothing else changes by a bit.
    #define WRAP(L) (sss ? max(vec3(dot(n, (L))) + sssW, 0.0) / (1.0 + sssW) \
                        : vec3(max(dot(n, (L)), 0.0)))
    float shaft = 1.0;
    // Whatever the window does to the sun term has to reach the skin term as well, so it is
    // accumulated rather than multiplied straight onto kd — the two have to stay in step, and
    // the version of this that did not was skin that ignored the shaft it was standing in.
    float winK = 1.0;
    if (uWinOn > 0.5) {
      // Haze with distance from the window wall. Gentle, because the beam test does the
      // real work of deciding where sunlight reaches.
      winK = mix(0.70, 1.0, smoothstep(-uRoom.z, uRoom.z * 0.8, -vW.z));
      // Daylight splits into the part that comes straight through the opening and the
      // diffuse sky filling the rest of the room. Weighting the two, rather than adding the
      // beam on top of a full-strength directional term, is what lets the shaft read at
      // all: the tonemapper compresses the top end, so contrast has to come from the
      // shadow side. Outdoors there is nothing between the surface and the sun, so this is
      // skipped entirely.
      // The curtain multiplies the shaft away and takes the room's daylight fill down with it.
      // Both halves matter: killing only the shaft leaves the room as bright as it was with the
      // curtains open, which is the version of this that reads as a bug.
      shaft = beam(vW) * uWinShade;
      winK *= mix(0.54, 1.52, shaft) * mix(0.62, 1.0, uWinShade);
      kd *= winK;
    }
    // Not WRAP() unconditionally: kd has already had the outdoor haze wrap folded into it above,
    // and rebuilding the non-skin case from N.L here would quietly drop it from every surface in
    // the game that stands outdoors.
    vec3 kdv = sss ? WRAP(kDir) * shadow * winK : vec3(kd);

    vec3 bVec = uBulb - vW;
    float bDist = length(bVec);
    vec3 bDir = bVec / max(bDist, 0.001);
    float bFall = (2.8 / (1.0 + bDist * bDist)) * uBulbOn;
    float bd = max(dot(n, bDir), 0.0) * bFall;
    vec3 bdv = WRAP(bDir) * bFall;
    vec3 bCol = vec3(1.00, 0.75, 0.43);

    // Gloss remains the public authoring control; a glTF roughness map simply supplies a more
    // detailed version of it. Rain is a film over the material and therefore wins via max().
    float gloss = max(1.0 - materialRoughness, wetK);
    float sh = mix(12.0, 190.0, gloss);
    vec3 dielectricF0 = vec3(0.025 + gloss * 0.075);
    vec3 specF0 = mix(dielectricF0, max(base, vec3(0.025)), metalness);

    // The room's own lights. Inverse-square, which is what light does, with a soft cutoff at
    // the declared radius on top of it: physical falloff alone never quite reaches zero, so a
    // pendant over one table would keep adding a little to the far wall and eight of them would
    // wash the whole room flat. The radius is where a light stops being this light's business.
    // Diffuse and specular are accumulated together. Previously these lights illuminated a
    // polished checkout counter and a cloth chair identically; only the one legacy ceiling bulb
    // could leave a highlight. A normalized, deliberately bounded Blinn lobe gives each of the
    // existing gloss/roughness values a readable response without the fireflies a full GGX tail
    // can produce in this eight-bit forward target.
    vec3 lSum = vec3(0.0), lSpec = vec3(0.0);
    for (int i = 0; i < MAXL; i++) {
      if (i >= uNL) break;
      vec3 d = uLPos[i] - vW;
      float dist = length(d);
      vec3 dir = d / max(dist, 0.001);
      float r = max(uLRad[i], 0.001);
      // GLSL leaves smoothstep undefined when edge0 is greater than edge1. Express the same
      // descending shoulder with ordered edges so point-light falloff is identical across GPUs.
      float att = (1.0 / (1.0 + (dist * dist) / (r * r)))
                * (1.0 - smoothstep(r * 0.55, r * 2.4, dist));
      lSum += uLCol[i] * WRAP(dir) * att;
      float nl = max(dot(n, dir), 0.0);
      // The renderer's 0.12 default is intentionally matte. Skip the expensive lobe there; real
      // roughness maps, authored polished props, glass and wet surfaces all clear this threshold.
      if (nl > 0.0 && gloss > 0.14 && att > 0.003) {
        vec3 h = normalize(dir + v);
        float nh = max(dot(n, h), 0.0);
        float vh = max(dot(v, h), 0.0);
        vec3 fres = specF0 + (1.0 - specF0) * pow(1.0 - vh, 5.0);
        float lobe = pow(nh, sh) * mix(0.25, 1.20, gloss) * nl;
        lSpec += uLCol[i] * fres * lobe * att;
      }
    }

    // Three-way ambient: sky from above, warm bounce off the floorboards from below, and a
    // dimmer band at the horizon. Bounce light is what stops undersides going flat black.
    float ao = openness(vW, n) * materialAO;
    float up = clamp(n.y, 0.0, 1.0), down = clamp(-n.y, 0.0, 1.0);
    vec3 amb = (uSky * up * 1.14 + uGround * down * 1.14
                + mix(uSky, uGround, 0.5) * (1.0 - up - down) * 1.02) * ao;
    // Indoors these values stand for the slice of sky a single window admits. Outdoors the
    // whole dome is the light source, which is why a dawn street lit on the indoor figures
    // silhouetted into a black trench under a bright sky.
    if (uIndoor < 0.5) amb *= 2.1;
    // ...and indoors that slice arrives from ONE DIRECTION, which the term above does not say.
    // On any vertical surface up and down are both zero, so all that survives is the horizon
    // band -- a single value with no dependence on which way the wall faces. Every wall in every
    // interior in this game was therefore lit identically: two partitions at right angles came
    // out as the same paint value and read as one folded plane. Measured off the live build,
    // 2026-08-19, the flat's entry corridor sat at sd 0.1245 with 91% of the frame inside a
    // single 0.4-wide luminance window and nothing at all in the top two or bottom two bands.
    //
    // A room is lit through an opening, not by a uniform shell. The wall facing the window is
    // the brightest surface in it; the wall the window is IN is the darkest, because it is
    // backlit. uWinN is that opening's outward normal -- already selected per frame for the
    // nearest window and already uploaded -- so the whole correction is one dot product.
    // The window wall's inward normal is -uWinN and the wall opposite it is +uWinN, which is
    // why the dot is taken against uWinN and not against its negation.
    //
    // Mean-preserving by construction: mix(0.80, 1.16, x) averages 0.98 over normals spread
    // evenly in x, so this adds separation without lifting or crushing a room that art
    // direction has already valued. Drawn curtains keep part of the split rather than all of
    // it, because a curtain diffuses the daylight it admits, it does not make it isotropic.
    if (uIndoor > 0.5 && uWinOn > 0.5) {
      float dirAmb = mix(0.80, 1.16, 0.5 + 0.5 * dot(n, uWinN));
      amb *= mix(1.0, dirAmb, mix(0.45, 1.0, uWinShade));
    }
    // Metals reflect their coloured base and carry very little coloured diffuse response. The
    // factor stops short of zero to suit the stylised renderer and keep dark metal readable.
    vec3 diffuseBase = base * (1.0 - metalness * 0.86);
    vec3 lit = diffuseBase * (amb + kCol * kdv + bCol * bdv + lSum) + lSpec;

    // Rim light: a thin bright edge where the surface turns away, which separates one
    // rounded object from the next without needing real shadows.
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.4);
    lit += base * rim * ao * (0.14 + 0.55 * max(uSunAmt * 0.35, 0.22))
           * mix(uSky, uSunCol, 0.45) * (0.35 + 0.65 * up);

    // Imported PBR surfaces carry real roughness/metalness maps, so give those pixels a cheap
    // two-colour environment reflection. The branch is uniform per draw: procedural geometry
    // keeps its existing lighting path, while curved wood, upholstery and metal no longer fall
    // flat between direct highlights. No cubemap, sampler, pass or extra uniform is involved.
    if (uArmOn > 0.5) {
      vec3 envRay = reflect(-v, n);
      vec3 envCol = mix(uGround, uSky, clamp(envRay.y * 0.5 + 0.5, 0.0, 1.0));
      vec3 envF = specF0 + (1.0 - specF0) * rim;
      float envGain = mix(0.045, 0.20, gloss) * ao;
      lit += envCol * envF * envGain;
    }

    // Wet ground takes over the gloss rather than adding to it: asphalt is authored nearly matte
    // and stays matte in the dry, and what a soaked road does is become the shiniest thing in the
    // frame. max() rather than a sum, so a surface that was already glossy does not go to chrome.
    vec3 hK = normalize(kDir + v), hB = normalize(bDir + v);
    float sp = pow(max(dot(n, hK), 0.0), sh) * kd * (0.35 + 0.65 * shaft)
             + pow(max(dot(n, hB), 0.0), sh) * bd * 0.6;
    vec3 directSpec = mix(vec3(0.020 + gloss * 0.30), max(base, vec3(0.025)), metalness);
    lit += directSpec * sp * mix(kCol, bCol, 0.35);
    // And the sky in it. The specular highlight above is the sun and the bulb; what makes a wet
    // road at night look wet is not either of those, it is the whole sky and every lit window
    // smeared down it. A grazing-angle fresnel against the sky gradient is the cheap half of that,
    // and it is the half that works at any hour: at noon it is a pale sheen, at nine in the evening
    // it is the orange the horizon is.
    if (wetK > 0.002) {
      vec3 rd = reflect(-v, n);
      vec3 skyRef = srgb2lin(mix(uSkyB, uSkyA, clamp(rd.y * 0.7 + 0.3, 0.0, 1.0)));
      float fres = 0.10 + 0.90 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
      lit = mix(lit, lit * 0.72 + skyRef * 0.55, wetK * fres);
    }
    // Water and unlit glazing also reflect the environment when it is dry. Their procedural
    // colour above provides depth/tint; this view-dependent term is what makes the reflection
    // move over the surface as the player walks. Indoor glass receives only a restrained room-
    // coloured sheen instead of the outdoor sky wash that once veiled entire mall interiors.
    if (uMode == 16 || uMode == 18) {
      vec3 rd = reflect(-v, n);
      vec3 skyRef = srgb2lin(mix(uSkyB, uSkyA, clamp(rd.y * 0.65 + 0.35, 0.0, 1.0)));
      float f0 = uMode == 16 ? 0.020 : 0.040;
      float fres = f0 + (1.0 - f0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);
      float env = uMode == 18 ? mix(0.92, 0.24, uIndoor) : 0.86;
      lit = mix(lit, lit * 0.72 + skyRef * (uMode == 16 ? 0.82 : 0.62), fres * env);
    }

    if (uBevel > 0.0) {
      float w = min(uBevel, 0.34 * min(uScale.x, min(uScale.y, uScale.z)));
      float d = edgeDist();
      float crease = 1.0 - smoothstep(0.0, w, d);
      lit *= mix(1.0, 0.76, crease * 0.82);
      lit += base * (1.0 - smoothstep(w, w * 2.1, d)) * 0.14 * (0.4 + 0.6 * max(n.y, 0.0));
    }

    lit += base * uGlow * 2.4;
    lit *= mix(1.06, 1.0, smoothstep(0.4, 3.0, length(uEye - vW)));
    // Outdoors the sun is unobstructed and the sky is unoccluded, so the same light values
    // that read well through a window blow the street out. One exposure stop per place.
    lit *= uExpose;
    // A little ordered noise before quantising: large soft gradients across a wall or the
    // floor otherwise show visible steps.
    vec3 outc = haze(lin2srgb(tonemap(lit)), vW);
    outc += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    // 透光 a leaf is thin, so with the sun behind it some of it comes through. Only for foliage,
    // and only away from the sun's own side, which is where the effect actually lives — it is most
    // of what makes a canopy look lit rather than painted.
    if (uMode == 15) {
      float through = pow(max(0.0, dot(normalize(uEye - vW), -normalize(uSun))), 2.6);
      outc += lin2srgb(base * uSunCol) * through * 0.42 * uSunAmt;
      // And the same from the bulb, which a houseplant across the room from a lamp needs as much as
      // a street tree needs it from the sun. Without it every leaf indoors after dark went matte and
      // the plant by the window read as plastic. Falls off with distance, like the bulb itself does.
      if (uBulbOn > 0.5) {
        vec3 bd = uBulb - vW;
        float bl = length(bd);
        float bthr = pow(max(0.0, dot(normalize(uEye - vW), -bd / max(bl, 0.001))), 2.2);
        outc += lin2srgb(base * vec3(1.00, 0.93, 0.80)) * bthr * 0.30
                / (1.0 + bl * bl * 0.55);
      }
    }
    frag = vec4(outc, uAlpha * cov);
    if (uGlow > 0.001) fragLight = vec4(outc * min(1.5, uGlow * 2.0) * cov, uAlpha * cov);
  }`;

  // The instanced fragment shader, which is the one above with three of its uniforms arriving
  // from the vertex stage instead. Derived by replacement rather than written out again, on
  // purpose: two copies of seven hundred lines of shading would be two copies to keep in step,
  // and the first divergence between them would show up as a room that is subtly lit wrong in
  // whichever half of the props happened to batch.
  //
  // If either declaration below is edited, these two replacements stop matching and the
  // derivation throws.
  //
  // THAT GUARD IS NOT ENOUGH, and this is worth spelling out because it has already cost the game
  // a 15x draw-call regression once. The guard only fires when a search string stops *matching*.
  // Adding a uniform to the block below and updating the search string to suit — which is the
  // natural way to add one — leaves the guard perfectly happy while quietly deleting the new
  // declaration from the instanced shader, because the replacement text is written out by hand
  // and does not know about it. FS_I then fails to compile, instOK goes false, and every prop in
  // the game goes back to its own draw call: the street from 424 calls a frame to 15,698, the
  // shopping centre to 25,384. Nothing looks wrong. It is simply six times slower.
  //
  // So: ANY UNIFORM ADDED TO EITHER BLOCK MUST BE ADDED TO ITS REPLACEMENT TOO — as a uniform if
  // it stays one, as an `in` if it is becoming per-instance. The only three that become `in` are
  // the ones the instance buffer actually carries (colour, gloss, alpha, glow, and the scale the
  // vertex stage derives); everything else is still a uniform and must be written through.
  // `.bootcheck.js` fails the build if this program does not link, which is the backstop.
  const FS_I = (() => {
    const a = 'uniform vec3 uColor, uEye, uScale, uRoom, uBulb, uWhite;\n  uniform float uDeckY;';
    const b = 'uniform float uAlpha, uGlow, uGloss, uBevel, uBulbOn, uSunAmt, uGlyphAssist;';
    // The decal cell, which is per instance here and a uniform in the plain shader. Written as
    // two #defines rather than by editing the body: every use of uTexOn and uTexRect below is
    // then identical in both shaders, which is the invariant this whole derivation exists to
    // keep. A zero-width cell is how an instance says it is not a glyph.
    const c = '  uniform float uTexOn;\n  uniform vec4 uTexRect;';
    if (FS.indexOf(a) < 0 || FS.indexOf(b) < 0 || FS.indexOf(c) < 0)
      throw new Error('gl.js: the instanced shader can no longer be derived from FS');
    return FS
      .replace(a, 'uniform vec3 uEye, uRoom, uBulb, uWhite;\n  uniform float uDeckY;\n' +
                  '  in vec3 uColor; in vec3 uScale;')
      .replace(b, 'uniform float uBevel, uBulbOn, uSunAmt, uGlyphAssist;\n' +
                  '  in float uAlpha; in float uGlow; in float uGloss;')
      .replace(c, '  in vec4 vRect;\n' +
                  '  #define uTexRect vRect\n' +
                  '  #define uTexOn (vRect.z > 0.0 ? 1.0 : 0.0)');
  })();

  // The skinned-instance fragment shader differs from the direct skinned shader only in the two
  // values that genuinely vary inside one draw: colour and model scale. Derive it from FS for the
  // same reason FS_I is derived above — skin, cloth, fog, weather and lighting must not drift into
  // a subtly different look merely because several people share a rig.
  const FS_KI = (() => {
    const a = 'uniform vec3 uColor, uEye, uScale, uRoom, uBulb, uWhite;\n  uniform float uDeckY;';
    if (FS.indexOf(a) < 0)
      throw new Error('gl.js: the skinned-instance shader can no longer be derived from FS');
    return FS.replace(a, 'uniform vec3 uEye, uRoom, uBulb, uWhite;\n  uniform float uDeckY;\n' +
                         '  in vec3 uColor; in vec3 uScale;');
  })();

  // The depth pass writes nothing but depth, so it needs no fragment work at all. It shares the
  // vertex shader with the main program, which matters: a rounded box's silhouette is resolved
  // in the vertex stage, and a shadow cast by a different silhouette than the one you can see
  // is worse than no shadow.
  const DEPTH_FS = `#version 300 es
  precision highp float;
  void main(){}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function mesh(pos, nor, uv, idx) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // The buffer handles are kept, not just the VAO built from them. A VAO records one fixed
    // set of bindings, so the instanced path cannot reuse this one — it needs its own, with the
    // instance buffer attached alongside these three. Without the handles that VAO could only
    // be built by uploading the geometry a second time.
    const keep = {};
    const buf = (data, loc, n, key) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      // The primitives below hand in plain arrays; a loaded model hands in the Float32Array it
      // already sliced out of a .bin, and re-wrapping that would copy a megabyte for nothing.
      gl.bufferData(gl.ARRAY_BUFFER,
        data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
      keep[key] = b;
    };
    buf(pos, 0, 3, 'pos'); buf(nor, 1, 3, 'nor'); buf(uv, 2, 2, 'uv');
    // Index width. Everything built in this file is far under 65 536 vertices and stays 16-bit;
    // a downloaded model can exceed it once its primitives are merged, and drawing a 32-bit
    // index buffer as UNSIGNED_SHORT silently renders confetti. The width is measured off the
    // largest index rather than assumed, and carried on the mesh so `draw` uses the right one.
    let type = gl.UNSIGNED_SHORT, data;
    if (idx instanceof Uint32Array) {
      let max = 0;
      for (let i = 0; i < idx.length; i++) if (idx[i] > max) max = idx[i];
      if (max > 65535) { type = gl.UNSIGNED_INT; data = idx; }
      else data = new Uint16Array(idx);
    } else data = idx instanceof Uint16Array ? idx : new Uint16Array(idx);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const out = { vao, count: idx.length, type, bPos: keep.pos, bNor: keep.nor, bUv: keep.uv, ib,
      // The driver may add alignment of its own, but these are the bytes this renderer asked it
      // to allocate. Keeping the number beside the handles makes deletion and memory reports
      // deterministic instead of trying to infer allocation sizes from a VAO later.
      bytes: (pos.byteLength || pos.length * 4) + (nor.byteLength || nor.length * 4) +
             (uv.byteLength || uv.length * 4) + data.byteLength };
    // The WebGPU pilot shares the real mesh authoring stream instead of rebuilding a second set
    // of primitives. Keep these CPU arrays only long enough to hand them across; the pilot either
    // uploads them asynchronously or discards them, and ordinary WebGL sessions never retain them.
    if (typeof WebGPUPreview !== 'undefined' && WebGPUPreview.requested)
      out.webgpuSource = { pos, nor, uv, idx:data };
    return out;
  }

  function previewMesh(name, made) {
    const source = made && made.webgpuSource;
    if (source && typeof WebGPUPreview !== 'undefined')
      WebGPUPreview.captureMesh(name, source.pos, source.nor, source.idx, source.uv);
    if (made) delete made.webgpuSource;
    return made;
  }

  // Each face as [outward normal, in-plane axis for the grid's x, in-plane axis for its y].
  const FACES = [
    [[1,0,0], [0,0,1], [0,1,0]], [[-1,0,0], [0,0,-1], [0,1,0]],
    [[0,1,0], [1,0,0], [0,0,-1]], [[0,-1,0], [1,0,0], [0,0,1]],
    [[0,0,1], [-1,0,0], [0,1,0]], [[0,0,-1], [1,0,0], [0,1,0]],
  ];
  // Whether a face's two in-plane axes form a right-handed set with its outward normal. Four
  // of the six above do not, so a grid wound the same way for every face comes out inside-out
  // on those four and back-face culling silently eats them: boxes rendered as open shells,
  // showing a top and a rim with the scene visible straight through the sides.
  const faceFlip = ([nz, ax, ay]) =>
    (ax[1]*ay[2] - ax[2]*ay[1]) * nz[0] +
    (ax[2]*ay[0] - ax[0]*ay[2]) * nz[1] +
    (ax[0]*ay[1] - ax[1]*ay[0]) * nz[2] < 0;

  function makeBox() {
    const p = [], n = [], u = [], i = [];
    for (const f of FACES) {
      const [nz, ax, ay] = f, b = p.length / 3;
      for (const [sx, sy] of [[-1,-1], [1,-1], [1,1], [-1,1]]) {
        p.push((nz[0] + ax[0]*sx + ay[0]*sy)*0.5,
               (nz[1] + ax[1]*sx + ay[1]*sy)*0.5,
               (nz[2] + ax[2]*sx + ay[2]*sy)*0.5);
        n.push(...nz); u.push((sx+1)/2, (sy+1)/2);
      }
      if (faceFlip(f)) i.push(b,b+2,b+1, b,b+3,b+2);
      else i.push(b,b+1,b+2, b,b+2,b+3);
    }
    return mesh(p,n,u,i);
  }

  // Rounded box, resolved in the vertex shader. Each vertex carries a flat corner
  // coordinate (each component -1, 0 or +1) and the unit direction the surface bulges in;
  // the shader turns the pair into a surface point for whatever radius the draw asks for.
  //
  // The parameter along each in-face axis runs -1 .. 1. The middle half is the flat part
  // of the face and needs no subdivision, because all the shading detail is per-fragment.
  // The outer quarter on each side is the quarter-turn around the edge, and that is where
  // every sample goes: too few there and a rounded edge reads as a flat chamfer.
  function makeRoundedBox() {
    const p = [], n = [], u = [], i = [];
    // flat coord, then how far round the edge arc (0 = on the face, 1 = fully turned)
    const SEG = [[-1, 1], [-1, 0.72], [-1, 0.42], [-1, 0.18], [-1, 0], [1, 0],
                 [1, 0.18], [1, 0.42], [1, 0.72], [1, 1]];
    const N = SEG.length;
    for (const f of FACES) {
      const [nz, ax, ay] = f, b = p.length / 3;
      const flip = faceFlip(f);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const [fx, tx] = SEG[x], [fy, ty] = SEG[y];
        const ca = Math.cos(tx * Math.PI / 2), sa = Math.sin(tx * Math.PI / 2) * fx;
        const cb = Math.cos(ty * Math.PI / 2), sb = Math.sin(ty * Math.PI / 2) * fy;
        let dx = nz[0]*ca*cb + ax[0]*sa + ay[0]*sb;
        let dy = nz[1]*ca*cb + ax[1]*sa + ay[1]*sb;
        let dz = nz[2]*ca*cb + ax[2]*sa + ay[2]*sb;
        const len = Math.hypot(dx,dy,dz) || 1;
        dx/=len; dy/=len; dz/=len;
        p.push(nz[0] + ax[0]*fx + ay[0]*fy,
               nz[1] + ax[1]*fx + ay[1]*fy,
               nz[2] + ax[2]*fx + ay[2]*fy);
        n.push(dx,dy,dz); u.push(x/(N-1), y/(N-1));
      }
      for (let y = 0; y < N-1; y++) for (let x = 0; x < N-1; x++) {
        const a = b + y*N + x, d = a + N;
        if (flip) i.push(a,d+1,a+1, a,d,d+1);
        else i.push(a,a+1,d+1, a,d+1,d);
      }
    }
    return mesh(p,n,u,i);
  }

  function makeCyl(seg = 28) {
    const p = [], n = [], u = [], i = [];
    for (let s = 0; s <= seg; s++) {
      const a = s/seg*Math.PI*2, cx = Math.cos(a), cz = Math.sin(a);
      p.push(cx*.5,-.5,cz*.5, cx*.5,.5,cz*.5);
      n.push(cx,0,cz, cx,0,cz); u.push(s/seg,0,s/seg,1);
      if (s < seg) { const b=s*2; i.push(b,b+1,b+3,b,b+3,b+2); }
    }
    for (const y of [.5,-.5]) {
      const c=p.length/3; p.push(0,y,0); n.push(0,Math.sign(y),0); u.push(.5,.5);
      for (let s=0;s<=seg;s++) {
        const a=s/seg*Math.PI*2;
        p.push(Math.cos(a)*.5,y,Math.sin(a)*.5); n.push(0,Math.sign(y),0);
        u.push(Math.cos(a)*.5+.5,Math.sin(a)*.5+.5);
        if (s<seg) y>0 ? i.push(c,c+s+1,c+s+2) : i.push(c,c+s+2,c+s+1);
      }
    }
    return mesh(p,n,u,i);
  }

  function makeSphere(seg = 20, ring = 12) {
    const p=[],n=[],u=[],i=[];
    for (let y=0;y<=ring;y++) {
      const phi=y/ring*Math.PI, sy=Math.cos(phi), r=Math.sin(phi);
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2, px=Math.cos(th)*r, pz=Math.sin(th)*r;
        p.push(px*.5,sy*.5,pz*.5); n.push(px,sy,pz); u.push(x/seg,y/ring);
      }
    }
    for (let y=0;y<ring;y++) for (let x=0;x<seg;x++) {
      const a=y*(seg+1)+x,b=a+seg+1; i.push(a,b,a+1,a+1,b,b+1);
    }
    return mesh(p,n,u,i);
  }

  // Capsule along local Y. It replaces visible ball joints with one continuous limb.
  function makeCapsule(seg = 20, hemi = 5) {
    const p=[],n=[],u=[],i=[], rings=[];
    for (let k=0;k<=hemi;k++) {
      const phi=-Math.PI/2 + k/hemi*Math.PI/2;
      rings.push({ y:-.25 + Math.sin(phi)*.25, r:Math.cos(phi)*.5,
                   ny:Math.sin(phi), nr:Math.cos(phi) });
    }
    rings.push({ y:.25, r:.5, ny:0, nr:1 });
    for (let k=1;k<=hemi;k++) {
      const phi=k/hemi*Math.PI/2;
      rings.push({ y:.25 + Math.sin(phi)*.25, r:Math.cos(phi)*.5,
                   ny:Math.sin(phi), nr:Math.cos(phi) });
    }
    for (let y=0;y<rings.length;y++) {
      const rg=rings[y];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2,c=Math.cos(th),s=Math.sin(th);
        p.push(c*rg.r,rg.y,s*rg.r); n.push(c*rg.nr,rg.ny,s*rg.nr); u.push(x/seg,y/(rings.length-1));
      }
    }
    for (let y=0;y<rings.length-1;y++) for (let x=0;x<seg;x++) {
      const a=y*(seg+1)+x,b=a+seg+1; i.push(a,b,a+1,a+1,b,b+1);
    }
    return mesh(p,n,u,i);
  }

  // A ring, lying in the XY plane so it faces the camera down +Z with no rotation needed. Its
  // outer diameter is 1 like every other primitive here, so a scale is still a size in metres.
  //
  // It exists because a hole cannot be faked. A spectacle rim drawn as a filled disc with a
  // see-through lens in front of it shows the disc *through* the lens, and a pair of reading
  // glasses comes out as a pair of sunglasses; the eye behind has to be actually unobstructed.
  // `tube` is the thickness of the ring as a fraction of its outer radius.
  function makeRing(seg = 26, tubeSeg = 8, tube = 0.15) {
    const p=[],n=[],u=[],i=[];
    const r = 0.5 * tube, R = 0.5 - r;
    for (let a=0;a<=seg;a++) {
      const th=a/seg*Math.PI*2, cx=Math.cos(th), cy=Math.sin(th);
      for (let b=0;b<=tubeSeg;b++) {
        const ph=b/tubeSeg*Math.PI*2, cb=Math.cos(ph), sb=Math.sin(ph);
        // Out from the ring's centre line, and around the tube: in-plane by cos, out of plane by sin.
        p.push(cx*(R+r*cb), cy*(R+r*cb), sb*r);
        n.push(cx*cb, cy*cb, sb);
        u.push(a/seg, b/tubeSeg);
      }
    }
    for (let a=0;a<seg;a++) for (let b=0;b<tubeSeg;b++) {
      const q=a*(tubeSeg+1)+b, w=q+tubeSeg+1;
      i.push(q,w,q+1,q+1,w,w+1);
    }
    return mesh(p,n,u,i);
  }

  // How much radius a limb has left at its far end. Exported on the renderer as `limbTaper`,
  // because it is not the mesh's private business: every joint in figure.js has to be sized to
  // the segment feeding it, and a joint wider than its segment is an action-figure peg. The
  // number was written out by hand at each of those call sites, so the mesh could not be
  // retuned without six separate arithmetic errors waiting to happen.
  const LIMB_TAPER = 0.66;

  // A limb, not a sausage: the same capsule silhouette but tapering toward the far end, so a
  // thigh thins into the knee and a forearm into the wrist. `k` is the radius left at y=-0.5.
  //
  // The taper was linear, which is a lathe, not a limb — every thigh, upper arm and calf in the
  // game was a truncated cone with a dome on each end, and a cone is exactly the shape the eye
  // reads as turned wood. So the shaft carries a belly: thickest a little above its middle,
  // where the muscle actually is. The belly term is *exactly* zero at both ends of the shaft, so
  // the two end radii are still 0.5 and 0.5k to the last decimal and every joint sized against
  // them stays correct — this change needs nothing from figure.js.
  //
  // The normals were wrong twice over and both showed. The shaft carried a hand-written -0.22
  // where its own slope is -0.34, and the end caps are ellipsoids of revolution — half as tall
  // as they are wide — shaded as though they were hemispheres, which is a quarter of the whole
  // limb lit at the wrong angle. Both now come off the surface: analytic on the caps, central
  // differences along the shaft, and central differences across the two junctions, which turns
  // the hard crease where a dome met a cone into the roll it should always have been.
  function makeLimb(seg = 18, hemi = 4, k = LIMB_TAPER) {
    const p=[],n=[],u=[],i=[], rings=[];
    const BELLY = .026;
    // t runs 0 at the narrow end to 1 at the wide one. sin(pi*t^1.25) peaks at t = 0.574 —
    // above the middle, which is where a muscle belly sits — and vanishes at both ends.
    const rad = t => .5*(k + (1-k)*t) + BELLY*Math.sin(Math.PI*Math.pow(t,1.25));
    // The far cap is the small one and spends most of its life inside a joint, so it gets one
    // ring fewer than the near cap and pays for the shaft rings the belly needs to exist.
    const lo = hemi - 1;
    for (let s=0;s<=lo;s++) {
      const phi=-Math.PI/2 + s/lo*Math.PI/2;
      // Semi-axes .5k across and .25k along, so the normal is (cos/a, sin/b): twice the tilt
      // per degree that a sphere would give.
      rings.push({ y:-.25 + Math.sin(phi)*.25*k, r:Math.cos(phi)*.5*k,
                   nr:Math.cos(phi), ny:2*Math.sin(phi), fix:s<lo });
    }
    for (let s=1;s<4;s++) rings.push({ y:-.25 + s/4*.5, r:rad(s/4), fix:false });
    rings.push({ y:.25, r:rad(1), fix:false });
    for (let s=1;s<=hemi;s++) {
      const phi=s/hemi*Math.PI/2;
      rings.push({ y:.25 + Math.sin(phi)*.25, r:Math.cos(phi)*.5,
                   nr:Math.cos(phi), ny:2*Math.sin(phi), fix:true });
    }
    for (let q=0;q<rings.length;q++) {
      const rg=rings[q]; if (rg.fix) continue;
      const a=rings[Math.max(0,q-1)], b=rings[Math.min(rings.length-1,q+1)];
      rg.nr=1; rg.ny=-(b.r-a.r)/(b.y-a.y);
    }
    for (let y=0;y<rings.length;y++) {
      const rg=rings[y];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2,c=Math.cos(th),s=Math.sin(th);
        const l=Math.hypot(rg.nr,rg.ny)||1;
        p.push(c*rg.r,rg.y,s*rg.r); n.push(c*rg.nr/l,rg.ny/l,s*rg.nr/l); u.push(x/seg,y/(rings.length-1));
      }
    }
    for (let y=0;y<rings.length-1;y++) for (let x=0;x<seg;x++) {
      const a=y*(seg+1)+x,b=a+seg+1; i.push(a,b,a+1,a+1,b,b+1);
    }
    return mesh(p,n,u,i);
  }

  // A head, rather than a ball with a face painted on it: cranium, brow ridge, cheekbones,
  // a jaw that narrows to a chin, and a fuller occiput. Normals come from the surface itself,
  // so the light breaks over the brow and along the jawline the way it does on a face.
  // The head's surface as a function of a point on the unit sphere. Factored out because the
  // hair shell below has to sit on this exact surface: a shell built from an ellipsoid instead
  // could not be made to both cover a forehead and leave a face, since scaling an ellipsoid up
  // moves its front as much as its top, and every attempt landed either as a wig over the eyes
  // or as a hairline halfway back over the crown.
  function headSurface(cx, cy, cz) {
    let px=cx*.44, py=cy*.50, pz=cz*.455;
    const low=Math.max(0,-cy);                         // 0 at the eyeline, 1 under the chin
    const front=Math.max(0,cz);
    // jaw narrows and shortens into the chin
    px*=1-.32*low*low; pz*=1-.12*low*low;
    // chin projects; the nape flattens and the back of the skull stays full
    if (pz>0) pz+=.055*low*low*low*(1-Math.abs(px)*1.2);
    else pz*=1+.09*Math.max(0,cy)-.10*low;
    // brow ridge, a shallow temple hollow, and cheekbones
    py+= .012*Math.exp(-Math.pow((cy-.62)/.32,2))*front;
    pz+= .020*Math.exp(-Math.pow((cy-.10)/.13,2))*front;
    pz-= .014*Math.exp(-Math.pow((cy-.34)/.12,2))*Math.max(0,Math.abs(cx)-.55);
    pz+= .016*Math.exp(-Math.pow((cy+.10)/.14,2))*front*Math.max(0,Math.abs(cx)-.30);
    return [px,py,pz];
  }

  // Turn a ring × seg grid of surface points into a mesh, taking normals from the surface
  // itself so light breaks over a brow or a hairline the way it does on the real thing.
  function shellFromGrid(grid, seg, ring) {
    const p=[],n=[],u=[],i=[];
    for (let j=0;j<=ring;j++) for (let x=0;x<=seg;x++) {
      const c=grid[j][x];
      const a=grid[Math.max(0,j-1)][x], b=grid[Math.min(ring,j+1)][x];
      const l=grid[j][(x-1+seg)%seg], r=grid[j][(x+1)%seg];
      const du=[r[0]-l[0],r[1]-l[1],r[2]-l[2]], dv=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
      let nx=du[1]*dv[2]-du[2]*dv[1], ny=du[2]*dv[0]-du[0]*dv[2], nz=du[0]*dv[1]-du[1]*dv[0];
      const len=Math.hypot(nx,ny,nz)||1;
      // poles have no usable tangent frame; fall back to the axis
      if (j===0||j===ring) { nx=0; ny=j===0?1:-1; nz=0; }
      else { nx/=-len; ny/=-len; nz/=-len; }
      p.push(c[0],c[1],c[2]); n.push(nx,ny,nz); u.push(x/seg,j/ring);
    }
    for (let j=0;j<ring;j++) for (let x=0;x<seg;x++) {
      const a=j*(seg+1)+x,b=a+seg+1; i.push(a,b,a+1,a+1,b,b+1);
    }
    return mesh(p,n,u,i);
  }

  function makeHead(seg = 30, ring = 24) {
    const grid=[];
    for (let j=0;j<=ring;j++) {
      const phi=j/ring*Math.PI, cy=Math.cos(phi), sr=Math.sin(phi), row=[];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2;
        row.push(headSurface(Math.sin(th)*sr, cy, Math.cos(th)*sr));
      }
      grid.push(row);
    }
    return shellFromGrid(grid, seg, ring);
  }

  // Hair, drawn on the same transform as the head. It stands a few millimetres proud of the
  // skull above the hairline and sinks inside it below, so the hairline is simply where the
  // two surfaces cross — low at the nape and the sideburns, high across the forehead. Because
  // it is the head's own surface displaced along its normal, it can never float off the back
  // of the skull or cut across the face.
  // Much finer than the head, because the hairline is a *contour* across this surface rather
  // than a feature of it. A ring at this radius is about 5 mm of arc, so unless the transition
  // spans several rings the silhouette of the hairline is a staircase with one step per ring —
  // which is exactly how it looked at the head's own 30 × 24, sharp step or soft.
  function makeHair(seg = 48, ring = 64) {
    const grid=[];
    for (let j=0;j<=ring;j++) {
      const phi=j/ring*Math.PI, cy=Math.cos(phi), sr=Math.sin(phi), row=[];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2, cx=Math.sin(th)*sr, cz=Math.cos(th)*sr;
        const s=headSurface(cx,cy,cz), front=Math.max(0,cz);
        // How high hair grows at this bearing. Rising steeply toward the face is what puts a
        // hairline two centimetres above the brow instead of down between the eyes.
        const line=-.60+1.70*Math.pow(front,1.6);
        // Spread over four or five rings, so the shell curves down through the skull's surface
        // instead of stepping through it.
        const t=(cy-(line-.14))/.18;
        const h=t<=0?0:t>=1?1:t*t*(3-2*t);
        // Uniform thickness above the hairline, well inside the skull below it. The tuck has to
        // be deep, and the shell has to be drawn on the head's own scale and never a larger
        // one: adding even a millimetre to the scale pushes the front of the surface out
        // further than any of this displacement, which put a black helmet over all six faces.
        const d=.036*h-.035*(1-h);
        row.push([s[0]+cx*d, s[1]+cy*d, s[2]+cz*d]);
      }
      grid.push(row);
    }
    return shellFromGrid(grid, seg, ring);
  }

  // A beard, on the same transform and the same scale as the head, and built the same way the
  // hair is: the skull's own surface pushed a few millimetres out along its normal where hair
  // grows and tucked well inside it where it does not, so the beard's edge is simply where the two
  // surfaces cross. Nothing else works. `headSurface` is not an ellipsoid — the chin projects up
  // to 55 thousandths past one and the cheekbones stand out too — so a beard assembled out of
  // balls placed against an ellipsoid approximation of the face renders *inside* the jaw, which
  // is exactly what the first two attempts at this did: a row of men, clean-shaven, with a few
  // dark seams along the chin where the lumps broke the surface.
  //
  // `chin` is how much of the lower face is covered: 0 is a moustache alone, 1 is a full beard up
  // the cheeks. The lip strip is always there, because every one of these has hair above the lip.
  function makeBeard(seg = 48, ring = 64, up = 1) {
    const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const grid=[];
    for (let j=0;j<=ring;j++) {
      const phi=j/ring*Math.PI, cy=Math.cos(phi), sr=Math.sin(phi), row=[];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2, cx=Math.sin(th)*sr, cz=Math.cos(th)*sr;
        const s=headSurface(cx,cy,cz), front=Math.max(0,cz);
        // Where the beard line runs at this bearing: just above the lip in the middle of the face
        // and rising toward the ear, which is the line a beard actually keeps. `up` lowers the
        // whole line, so a goatee is this same shell with the cheeks left out.
        //
        // It has to move the *line* and not the displacement. Scaling the coverage down instead
        // was the first version of this, and at anything under about 0.7 it made the shell's
        // displacement negative everywhere — a goatee tucked entirely inside the head, invisible.
        // The rise toward the ear is scaled by `up` as well, or a goatee climbs the jaw to the
        // ears and is a full beard with a gap in it.
        const line = -.30 + .26 * up * Math.max(0, Math.abs(cx) - .25)
                     - .75 * Math.max(0, .15 - front) - (1 - up) * .40;
        // A wide transition, because the shell has to *curve* down through the skull rather than
        // step through it: a narrow band is a cliff, and a cliff catches the key light broadside
        // and reads as a pale stripe across the jaw.
        let h = up <= 0 ? 0 : sm((line - cy) / .22);
        // The moustache, which every one of these has: a band above the lip, on the front of the
        // face, no wider than the mouth. By bearing rather than by height, or it reaches the ears.
        const mo = sm(1 - Math.abs(cy + .335) / .105) * sm((front - .55) / .30)
                 * sm(1.6 - Math.abs(cx) / .26);
        h = Math.max(h, mo);
        // Uniform thickness where it grows, well inside the skull where it does not — the same
        // tuck the hair uses, and for the same reason.
        const d=.026*h-.038*(1-h);
        row.push([s[0]+cx*d, s[1]+cy*d, s[2]+cz*d]);
      }
      grid.push(row);
    }
    return shellFromGrid(grid, seg, ring);
  }

  // A hand, rather than a paddle.
  //
  // figure.js builds the fingers and the thumb out of capsules on their own frames, and has to:
  // they bend. But the palm those hang off was a rounded box, and a rounded box is as thick at
  // the wrist as it is at the knuckles, dead flat on the palm, square across the metacarpal
  // heads and the same object seen from either side. That is a mitten, and no amount of finger
  // work rescues it.
  //
  // This is the palm alone, in the same unit box the box occupied: +y at the wrist, -y at the
  // knuckle line, +z the palm and -z the back of the hand. Four things a slab has not got. It
  // narrows into the wrist. It is thickest across the middle and thinnest across the knuckles.
  // The palm side is dished and the back of the hand is domed over the metacarpal heads. And
  // both ends roll over instead of stopping, so the forearm sits *into* the wrist end and the
  // fingers leave a rolled edge rather than a cut one.
  //
  // It is also cheaper than what it replaces: 357 vertices against the rounded box's 600, and
  // 640 triangles against 972, because none of it is spent on corners that are not there.
  //
  // `side` is +1 for a hand whose thumb lies toward +x — the arm at negative x in figure.js —
  // and -1 for its mirror. The ball of the thumb is the only part that cares, and it is the
  // part that most makes a hand read as a hand from the back, so both are built.
  function makeHand(seg = 20, ring = 16, side = 1) {
    const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const grid=[];
    for (let j=0;j<=ring;j++) {
      // Cosine spacing: the rings crowd into the two rolled ends, where the surface actually
      // turns, and thin out across the flat of the palm, where it does not.
      const t=(1-Math.cos(Math.PI*j/ring))/2, py=.5-t;
      const hw=.390 + .170*t - .030*t*t;        // widens all the way out to the knuckles
      const hd=.195 + .135*t - .160*t*t;        // thickest across the middle, thinnest at both ends
      // The two rolls, as quarter ellipses in t. Both ends have to close to a point or the
      // shell has a hole in it, so this is the shape that decides whether they close as a dome
      // or as a spike.
      const TW=.13, TK=.78;
      const a=t/TW, b=(1-t)/(1-TK);
      const cap = t<TW ? Math.sqrt(Math.max(0,a*(2-a)))
                : t>TK ? Math.sqrt(Math.max(0,b*(2-b))) : 1;
      const rx=hw*cap, rz=hd*cap;
      // Where the palm is hollow, where the knuckles stand proud, where the thumb muscle sits.
      // Every one of these has to reach zero at t = 0 and t = 1: at the two poles all seg+1
      // vertices are the same point, and anything that moves them by different amounts tears
      // the shell open there.
      const dish  = .052 * sm((t-.06)/.30) * sm((.94-t)/.22);
      const knuck = .050 * Math.exp(-Math.pow((t-.80)/.12,2)) * sm((.98-t)/.10);
      const mound = Math.exp(-Math.pow((t-.40)/.30,2));
      const row=[];
      for (let x=0;x<=seg;x++) {
        const th=x/seg*Math.PI*2;
        // A superellipse, not an ellipse. A palm is a slab with rounded edges; an ellipse
        // spends all of its curvature on the two edges and leaves the broad faces flat, which
        // is the other half of why the old palm shaded like a paddle.
        const ax=Math.sin(th), az=Math.cos(th), E=.74;    // 2/n, for n = 2.7
        const ux=Math.sign(ax)*Math.pow(Math.abs(ax),E);
        const uz=Math.sign(az)*Math.pow(Math.abs(az),E);
        const px=ux*rx, front=Math.max(0,uz), back=Math.max(0,-uz);
        const w=ux*cap;                          // across the palm: -1 at one edge, +1 at the other
        let pz=uz*rz;
        pz -= dish  * front * Math.exp(-Math.pow(w/.62,2));   // the hollow of the palm
        pz -= knuck * back  * (1 - .45*w*w);                  // the metacarpal heads
        pz += .044  * mound * front * sm(( w-.06)/.50);       // ball of the thumb
        pz += .020  * mound * front * sm((-w-.18)/.46);       // and the smaller one opposite it
        row.push([px,py,pz]);
      }
      grid.push(row);
    }
    // Mirroring by negating x alone turns every triangle inside out and back-face culling eats
    // the hand. Reversing each ring instead walks the same surface the other way round, which
    // negates x and leaves the winding — and so the normals shellFromGrid derives — intact.
    if (side<0) for (const row of grid) row.reverse();
    return shellFromGrid(grid, seg, ring);
  }

  // The torso: the most visible surface on every person in the game, and the one that most
  // decided they looked assembled rather than grown.
  //
  // The table this replaces claimed a waist, a chest and sloping shoulders, and it did have all
  // three — in width. In *depth* it held rz between .238 and .258 over the entire torso: a three
  // per cent variation against eighteen per cent across. So from the side there was no waist, no
  // chest and no seat, just a board of constant thickness, and at figure.js's 0.50 W by 0.48 W
  // the chest came out 1.55 times as wide as it was deep and the shoulders 1.76, where a clothed
  // chest is nearer 1.40. That ratio is the whole slab: an ellipse that wide turns its normal
  // only twenty degrees over the first half of the chest, so the entire front is one flat field
  // of light with a hard rim down each side, which is what a slab looks like and what a body
  // does not.
  //
  // Four numbers a ring now, not three, and fourteen rings rather than twelve. `e` is the new
  // one: it makes the section an egg rather than an ellipse, so the front reaches rz*(1+e) and
  // the back rz*(1-e) while both flanks still meet at z = 0. It is a multiple of sin^2, so it is
  // smooth all the way round and costs no crease down the side where the arms hang.
  //
  // Two things constrain this table hard, and they are why the numbers look conservative.
  //
  // The *front* line, zc + rz*(1+e), may not move. figure.js mounts a dozen things at fixed z on
  // the chest — lapels, a zip, the strip down an open coat, a badge, pack webbing — and the
  // lapels clear the coat shell by three millimetres. Push the front out by more than that and
  // every one of them is buried inside the garment; pull it in and they stand off it like
  // shelves. So the front is held within four thousandths of where it was at every height
  // anything is mounted, and all of the new depth is taken out of the back, where nothing is
  // mounted and where a backpack hides the overlap anyway.
  //
  // The *width* is not mine. figure.js has just taken the trunk from 0.50 W to 0.440 W, which is
  // most of the aspect-ratio fix; rx here keeps its old maximum of about .402 so that change
  // still means what its author intended, and only redistributes it — a deeper dip at the waist,
  // a fuller hip crest where the old table sagged.
  //
  // What is left over is shape, which is the part a scale cannot supply: rz goes .246 at the
  // waist against .267 at the chest and .270 at the seat, where it used to hold .250 to .258
  // across the whole torso. Nine per cent of depth waist against two. That is the slab.
  // Hoisted out of `makeBody` so it can be read rather than copied.
  //
  // Three separate wardrobe files ended up holding their own transcription of this table, because
  // placing a flat piece on a curved torso needs `rx(y)` and `rz(y)` and there was no way to ask
  // for them. That is not a theoretical cost: when this profile was retuned and the trunk narrowed
  // from 0.500 W to 0.440 W, every panel placement in one of those files was silently invalidated
  // and had to be re-synced by hand. A fourth private copy was about to be written for the same
  // reason, which is what this export exists to prevent.
  //
  // Exposed through `R.profile('body')`, which hands back a copy — a caller that mutates its own
  // rings must not reshape everybody in the game.
  //  y      rx     rz      e
  const BODY_PROFILE = [
      [-.500, .300, .212, -.019],   // underside of the hem
      [-.452, .334, .250, -.048],   // the hem. rx here is held at the old table's value to the
      [-.380, .346, .270, -.067],   // millimetre: figure.js bands the hem at 0.300 W, which sat
                                    // flush against it, and widening the trunk swallows the band.
                                    // seat: the fullest point behind
      [-.290, .354, .268, -.060],   // hip crest, where the old table sagged instead
      [-.180, .344, .258, -.031],
      [-.060, .332, .246,  .016],   // waist, narrowest in both directions at once
      [ .060, .352, .255,  .012],   // lower ribs
      [ .175, .384, .267, -.019],   // chest
      [ .275, .399, .265, -.042],   // and the shoulder blades behind it
      [ .350, .404, .255, -.043],   // widest, level with the armpit
      [ .412, .384, .234, -.035],   // the shoulder starts to fall here, not at .44
      [ .458, .330, .196, -.020],   // over the trapezius
      [ .484, .238, .150,  .010],
    [ .500, .126, .086,  .030],   // neck opening
  ];

  function makeBody(seg = 26) {
    const profile = BODY_PROFILE;
    const p=[],n=[],u=[],i=[], rings=profile.length;
    for (let y=0;y<rings;y++) {
      const [py,rx,rz,e]=profile[y];
      const lo=profile[Math.max(0,y-1)], hi=profile[Math.min(rings-1,y+1)];
      // Central differences rather than written-out slopes, so the normals follow the table:
      // retune a ring above and the light over it follows, instead of the body shading as facets.
      const dy=hi[0]-lo[0];
      const drx=(hi[1]-lo[1])/dy;
      const drz=(hi[2]-lo[2])/dy, dre=(hi[2]*hi[3]-lo[2]*lo[3])/dy;
      for (let x=0;x<=seg;x++) {
        const a=x/seg*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
        p.push(c*rx, py, rz*s + rz*e*s*s);
        // dP/da x dP/dy for exactly the surface above, turned to point out of it.
        const C=rz*c*(1+2*e*s), F=drz*s + dre*s*s;
        const nx=C, ny=-(C*drx*c + rx*s*F), nz=rx*s;
        const l=Math.hypot(nx,ny,nz)||1;
        n.push(nx/l,ny/l,nz/l); u.push(x/seg,y/(rings-1));
      }
    }
    for (let y=0;y<rings-1;y++) for (let x=0;x<seg;x++) {
      const a=y*(seg+1)+x,b=a+seg+1;
      i.push(a,b,a+1,a+1,b,b+1);
    }
    // The two ends stay flat discs. The top one is the neck opening, and it used to be .175
    // across — a hand's breadth of plate around a neck a third that wide, which is the shelf
    // with a lip on it. At .126 the collar covers it, and closing it further than that turns
    // the last centimetre of the shoulder into a spike, which is worse than a shelf.
    for (const [ri,sign] of [[0,-1],[rings-1,1]]) {
      const [py,rx,rz,e]=profile[ri], c0=p.length/3;
      p.push(0,py,0); n.push(0,sign,0); u.push(.5,.5);
      for (let x=0;x<=seg;x++) {
        const a=x/seg*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
        p.push(ca*rx, py, rz*sa + rz*e*sa*sa); n.push(0,sign,0); u.push(ca*.5+.5,sa*.5+.5);
        if(x<seg) sign>0 ? i.push(c0,c0+x+1,c0+x+2) : i.push(c0,c0+x+2,c0+x+1);
      }
    }
    return mesh(p,n,u,i);
  }

  // A closed tapered cylinder: lampshades, plant pots, bins and small vessels.
  function makeTaper(seg = 28, top = 0.36) {
    const p=[],n=[],u=[],i=[], slope=.5-top;
    for (let s=0;s<=seg;s++) {
      const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a), l=Math.hypot(1,slope);
      p.push(c*.5,-.5,z*.5, c*top,.5,z*top);
      n.push(c/l,slope/l,z/l, c/l,slope/l,z/l); u.push(s/seg,0,s/seg,1);
      if (s<seg) { const b=s*2; i.push(b,b+1,b+3,b,b+3,b+2); }
    }
    for (const [y,r,sign] of [[-.5,.5,-1],[.5,top,1]]) {
      const c0=p.length/3; p.push(0,y,0); n.push(0,sign,0); u.push(.5,.5);
      for (let s=0;s<=seg;s++) {
        const a=s/seg*Math.PI*2;
        p.push(Math.cos(a)*r,y,Math.sin(a)*r); n.push(0,sign,0); u.push(Math.cos(a)*.5+.5,Math.sin(a)*.5+.5);
        if (s<seg) sign>0 ? i.push(c0,c0+s+1,c0+s+2) : i.push(c0,c0+s+2,c0+s+1);
      }
    }
    return mesh(p,n,u,i);
  }

  function makeQuad() {
    return mesh([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5],
                [0,1,0,0,1,0,0,1,0,0,1,0],
                [0,0,1,0,1,1,0,1],[0,2,1,0,3,2]);
  }

  // ---------------------------------------------------------------- the post chain
  //
  // Until now this renderer painted straight at the screen, one pass, and everything the picture
  // was going to be it had to be by the time a triangle left the fragment shader. That is why the
  // night streets never looked lit: a neon sign is a quad the colour of neon, and a bright quad
  // next to a dark wall is a bright quad. What makes a light read as a light is what it does to the
  // air and the lens in front of it — it bleeds into what is around it — and there is nowhere in a
  // single forward pass to do that, because a fragment cannot know about its neighbours.
  //
  // So the scene now goes into a texture first, and the last thing that happens each frame is:
  //
  //   scene ─▶ [resolve] ─▶ bright pass ─▶ blur H ─▶ blur V ─▶ blur H ─▶ blur V ─┐
  //         └──────────────────────────────────────────────────────────── + ◀────┘ ─▶ screen
  //
  // Two things about it are not optional. The scene target is *multisampled* and blitted down,
  // because this context was created with antialiasing on and drawing into a plain texture instead
  // would have quietly traded every smooth edge in the game for a glow — a bad bargain nobody
  // asked for. And the whole chain is gated on the quality ladder, so the two lowest tiers, which
  // exist for machines already struggling, do not pay for it.
  let postWant = 1, postOn = 0, postFail = '';
  let msFbo = null, msCol = null, msDep = null;      // where the scene is drawn, multisampled
  let msLit = null, msGeo = null;                    // what of it is a light, and how far away
  let reFbo = null, reTex = null;                    // all three resolved down to textures
  let liFbo = null, liTex = null;
  let geFbo = null, geTex = null;
  const aFbo = [null, null], aTex = [null, null];    // the occlusion, ping-pong, half size
  let aoWant = 0, aoAmt = 0.55, aoRadius = 0.42;
  // A canvas size that has been asked for but not acted on yet — see `resize`.
  let pendW = 0, pendH = 0, pendAt = 0;
  const bFbo = [null, null], bTex = [null, null];    // ping-pong, half size
  // The post target has three colour attachments at High (picture, light mask and geometry) plus
  // depth. Four samples multiplied every fragment across all four attachments and made the
  // antialias buffer more expensive than the scene it was smoothing. Two samples retain true
  // edge antialiasing while halving that bandwidth; character meshes/textures and render scale
  // are untouched.
  const POST_MSAA_CAP = 2;
  let pW = 0, pH = 0, bW = 0, bH = 0, msaa = POST_MSAA_CAP;
  let ppProg = null, ppU = {}, ppVao = null;
  let bloomAmt = 0.85, bloomCut = 0.985, vigAmt = 0.30;
  // A per-scene multiplier on the bloom, the way aoRadius is a per-scene crease width. The bright
  // pass is already correct — it bleeds the light mask the scene pass wrote and not merely bright
  // surfaces — so the amount is not a threshold problem to be fixed globally. It is a *density*
  // problem: how much of the frame is emitter. A flat has a ceiling lamp and a phone screen; the
  // shopping centre has lit troughs down three decks, a cove in every one of eighteen shopfronts,
  // downlight grids, fascia signs and LED strips, and looking along the length of it puts hundreds
  // of them into a few hundred pixels. Blurred together at that density they stop being lamps and
  // become a white sheet over everything past about fifteen metres. Scenes that are mostly emitter
  // say so; everything else is unaffected at 1.
  let bloomScale = 1;

  const PP_VS = `#version 300 es
  // One triangle over the whole screen, with no buffer behind it: three vertex ids are enough to
  // place it, which saves a mesh, a bind and any chance of it going out of step with the pass.
  out vec2 vUv;
  void main(){
    vec2 p = vec2(float((gl_VertexID & 1) << 2), float((gl_VertexID & 2) << 1));
    vUv = p * 0.5;
    gl_Position = vec4(p - 1.0, 0.0, 1.0);
  }`;

  const PP_FS = `#version 300 es
  precision mediump float;
  uniform sampler2D uSrc, uBloom, uAoMap;
  uniform vec2 uTexel, uDir, uAoProj;
  uniform float uPass, uAmt, uVig, uCut, uAoAmt, uAoOn, uHaze;
  in vec2 vUv;
  out vec4 frag;
  // The same range the scene shader packed with — one definition, see GEOM_FAR_M.
  const float GEOM_FAR = ${GEOM_FAR_M.toFixed(1)};
  // Metres from the eye, out of the two bytes the scene pass packed them into.
  float dist(vec2 uv) {
    vec4 g = texture(uSrc, uv);
    return (g.r + g.g / 255.0) * GEOM_FAR;
  }
  // The same unpack off the other unit, for the pass that has the occlusion on uSrc and needs the
  // geometry as well.
  float distB(vec2 uv) {
    vec4 g = texture(uBloom, uv);
    return (g.r + g.g / 255.0) * GEOM_FAR;
  }
  vec3 srgb2lin(vec3 c){
    c = max(c, 0.0);
    return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92,
               step(c, vec3(0.04045)));
  }
  vec3 lin2srgb(vec3 c){
    c = max(c, 0.0);
    return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92,
               step(c, vec3(0.0031308)));
  }
  void main(){
    // ---- 0: what is bright enough to bleed, which is what the scene pass said was a light.
    // uSrc is the light mask the scene pass wrote, uBloom the scene itself.
    if (uPass < 0.5) {
      vec3 lit = srgb2lin(texture(uSrc, vUv).rgb);
      vec3 c = texture(uBloom, vUv).rgb;
      // Almost all of it is the lights. The small term off the picture is for the handful of
      // places that really are blown out — the sun on wet stone, a white wall at noon — where a
      // little haze is what the eye expects and its absence reads as flat.
      //
      // It has to stay a handful. At a 0.94 cut and 0.30 of the picture this let a *diffuse white
      // wall* into the glow, and indoors that is every surface there is: a tiled bathroom, a
      // laminate worktop, a painted ceiling all cleared it, so the blur came back carrying a
      // recognisable half-transparent copy of the room and laid it over the frame — through the
      // walls, through a closed door. Two rooms at once, and it was the bloom the whole time.
      //
      // A brightly lit matte surface is not a light. The cut sits where only genuinely clipped
      // pixels reach it, the weight is halved, and uHaze knocks it down again indoors, where
      // there is no sun on wet stone to justify it and nothing far enough away to need air.
      float l = max(max(c.r, c.g), c.b);
      frag = vec4(lit + srgb2lin(c) * smoothstep(uCut, min(1.0, uCut + 0.045), l)
                  * 0.15 * uHaze, 1.0);
      return;
    }
    // ---- 1: a five-tap gaussian, run twice in each direction.
    // The taps sit between texels so each fetch is two texels averaged by the sampler — nine
    // texels of blur for five reads, which is where the whole pass gets to be cheap.
    if (uPass > 0.5 && uPass < 1.5) {
      vec2 o1 = uDir * uTexel * 1.3846154;
      vec2 o2 = uDir * uTexel * 3.2307692;
      vec3 s = texture(uSrc, vUv).rgb * 0.2270270;
      s += (texture(uSrc, vUv + o1).rgb + texture(uSrc, vUv - o1).rgb) * 0.3162162;
      s += (texture(uSrc, vUv + o2).rgb + texture(uSrc, vUv - o2).rgb) * 0.0702703;
      frag = vec4(s, 1.0);
      return;
    }
    // ---- 4: the occlusion blur. The same five taps as pass 1, but it will not cross a
    // silhouette.
    //
    // Running the occlusion through the ordinary gaussian was the doubled-room outline. That blur
    // is depth-blind, so the darkening computed *between the books on a shelf* bled sideways out
    // of the shelf and onto the wall two metres behind it — and the same for the counter, the
    // fridge, the bathroom fittings. Every object left a soft dark copy of itself on whatever was
    // behind it, and a room full of objects came out with a ghost of the room hanging on its
    // walls. Nine texels at half size is eighteen pixels of bleed in each direction, twice per
    // axis, which is how far a shelf could reach.
    //
    // Weighting each tap by how near its depth is to the centre's keeps occlusion on the surface
    // that generated it. Contact darkening still crosses the *contact* — those two surfaces are
    // at the same depth, which is what makes it a contact.
    if (uPass > 3.5) {
      float dc = distB(vUv);
      float sum = texture(uSrc, vUv).r * 0.2270270, wsum = 0.2270270;
      for (int i = 1; i <= 2; i++) {
        vec2 o = uDir * uTexel * (i == 1 ? 1.3846154 : 3.2307692);
        float w0 = (i == 1 ? 0.3162162 : 0.0702703);
        for (int k = 0; k < 2; k++) {
          vec2 uv = vUv + (k == 0 ? o : -o);
          float w = w0 * exp(-abs(distB(uv) - dc) * 9.0);
          sum += texture(uSrc, uv).r * w;
          wsum += w;
        }
      }
      frag = vec4(vec3(sum / wsum), 1.0);
      return;
    }
    // ---- 3: how boxed in each pixel is.
    //
    // Nothing in this game darkened where two surfaces met. A stool stood on a tiled floor with the
    // same light on the floor under it as three metres away, so it read as a sticker of a stool, and
    // the interiors — evenly lit, no shadow map indoors — came out flat as a plan drawing. This is
    // the cheapest honest fix: for each pixel, look at a ring of its neighbours and count how many
    // of them are *nearer* to the eye than it is. A pixel in the open has none. A pixel in the
    // corner of a room, or in the gap under a bench, has half of them.
    //
    // Distance only, no normals. A normal would give a better estimate and cost another attachment
    // to carry, and the difference on shapes this soft is not worth the bandwidth — but the plane a
    // pixel sits on can be had for nothing from the depth gradient, and without it this measures
    // the wrong thing entirely. See below.
    if (uPass > 2.5) {
      float d0 = dist(vUv);
      // The sky wrote nothing here, and nothing is not in a corner.
      if (d0 >= GEOM_FAR * 0.995) { frag = vec4(1.0); return; }
      // A ring whose radius is a fixed size in *metres*, so a corner does not stop being a corner
      // as you walk toward it — which is exactly what a radius fixed in pixels would do.
      vec2 r = uAoProj / max(0.35, d0);
      // The plane this pixel sits on, taken from the depth gradient, which costs nothing.
      //
      // Comparing neighbours against the *centre's own depth* makes every surface seen at a
      // grazing angle occlude itself: half of any ring laid on a floor is nearer than its middle,
      // and at 0.14 m of falloff a floorboard three metres out clears that on its own. So every
      // floor and every obliquely-seen wall in the game came out at something like half occlusion
      // — an even grey veil laid over a third of the frame, which is what read as a second room
      // showing through the first. Measured against what the surface itself would be at that
      // offset, only what genuinely stands proud of the plane counts.
      vec2 grad = vec2(dFdx(d0), dFdy(d0)) / max(uTexel, vec2(1e-6));
      // A silhouette has an enormous gradient across it and must not be extrapolated off one, but
      // the ceiling has to be well clear of what a real surface reaches: a wall or a floor seen
      // close to edge-on runs to tens of metres of depth across the frame, and clamping those back
      // leaves them predicting themselves too flat and occluding themselves with the difference —
      // which is the same grey veil, just fainter. Over-extrapolating at a silhouette can only
      // *reduce* the count, which is the harmless direction.
      // The ceiling on that gradient has to grow with distance, and this is the whole of the AO
      // ghost that showed on every upper floor and on the roof.
      //
      // Depth-per-pixel across a surface seen edge-on scales with how far away the surface is: two
      // metres of wall at arm's length and thirty-four metres of facade seen from the roof are the
      // same geometry and produce wildly different gradients. A flat ceiling of 110 was tuned in a
      // 3.5 m room. On a deck whose visible depth runs to 45 m every obliquely-seen surface hit it,
      // got its plane predicted too flat, stood proud of that prediction and occluded itself with
      // the difference — an even grey veil, which is what read as a blurred second copy of the room
      // laid over the ceiling and the far walls.
      //
      // Measured independently by two floor agents: R.setAO(false) removed it and changed nothing
      // else, and zeroing every emitter and every glyph glow in the scene changed nothing at all.
      //
      // Taken as a max against the old value, so nothing inside about four metres changes at all
      // and the tuning this was given in a small room is kept exactly. Beyond that it relaxes — and
      // relaxing can only ever *reduce* the count at a genuine silhouette, which the note above
      // records as the harmless direction.
      // (No backticks anywhere in here: the whole shader is one JS template literal.)
      float gm = length(grad);
      float gmMax = max(110.0, 26.0 * d0);
      if (gm > gmMax) grad *= gmMax / gm;
      // Turned by a per-pixel angle, so eight samples cover more than eight directions and what is
      // left reads as fine grain rather than as eight spokes. The blur afterwards clears it up.
      float a = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;
      float ca = cos(a), sa = sin(a);
      float occ = 0.0;
      for (int i = 0; i < 8; i++) {
        float t = (float(i) + 0.5) * 0.7853982;
        vec2 dir = vec2(cos(t) * ca - sin(t) * sa, cos(t) * sa + sin(t) * ca);
        // Two rings: one tight against the surface for the crease, one out for the wider shading.
        for (int k = 1; k <= 2; k++) {
          vec2 off = dir * r * float(k) * 0.62;
          float di = dist(vUv + off);
          // Nearer than the plane by a little is a crease. Nearer by a lot is a different object
          // altogether, and counting that is what puts a dark halo around every foreground
          // silhouette. The small bias is there so that flatness reads as flat.
          float diff = (d0 + dot(grad, off)) - di;
          // 0.65 m counted a bookshelf standing half a metre off a wall as a crease in that wall,
          // and drew it a soft dark outline on the plaster behind it — every object in the room
          // wearing a halo. A crease is a much more local thing than that.
          occ += clamp((diff - 0.015) / 0.12, 0.0, 1.0) * step(diff, 0.26)
                 * (k == 1 ? 0.62 : 0.38);
        }
      }
      frag = vec4(vec3(1.0 - clamp(occ / 8.0, 0.0, 1.0)), 1.0);
      return;
    }
    // ---- 2: back together.
    // The occlusion multiplies the picture; the bloom is added after it, because light spilling
    // through the air in front of a dark corner is not itself in the corner.
    vec3 c = srgb2lin(texture(uSrc, vUv).rgb);
    if (uAoOn > 0.5) {
      float contact = clamp(1.0 - texture(uAoMap, vUv).r, 0.0, 1.0);
      // Trim the bilateral blur's faint grey tail while strengthening true contact cores.
      // Zero, half and full occlusion stay fixed, so uAoAmt remains the authored strength cap.
      contact = contact * contact * (3.0 - 2.0 * contact);
      c *= 1.0 - contact * uAoAmt;
    }
    // Bloom was extracted and blurred in linear light. A screen-style composite lets it lift a
    // dark wall around a lamp while asymptotically approaching display white on an already-bright
    // airport or hospital wall; gamma-space addition was the milky veil over those interiors.
    vec3 bloom = texture(uBloom, vUv).rgb * uAmt;
    c = 1.0 - (1.0 - clamp(c, 0.0, 1.0)) * exp(-bloom * 0.90);
    // A vignette, which is not a filter but a lens: without it a bright sky arrives at the corners
    // of the frame at full strength and the picture has no centre to it.
    vec2 q = vUv - 0.5;
    c *= 1.0 - uVig * dot(q, q) * 1.55;
    // And a dither, the same trick the sky uses. Eight bits of a dark gradient is where banding
    // lives, and the blur has just made a great many dark gradients.
    float d = fract(sin(dot(gl_FragCoord.xy, vec2(127.1, 311.7))) * 43758.5453);
    frag = vec4(lin2srgb(c) + (d - 0.5) / 255.0, 1.0);
  }`;

  const PP_UNIFORMS = ['uSrc', 'uBloom', 'uAoMap', 'uTexel', 'uDir', 'uPass', 'uAmt', 'uVig',
                       'uCut', 'uAoAmt', 'uAoProj', 'uAoOn', 'uHaze'];

  // A post chain that will not build has to leave a game running without one. `compile` throws, so
  // without this the first bad line in the post shader takes the whole renderer down with it and the
  // player gets a black screen instead of a picture with no glow on it.
  function postInit() {
    ppProg = gl.createProgram();
    // The link failure below was already handled. A *compile* failure was not: `compile` throws, so
    // one bad line in the post fragment shader propagated out of init and took the whole renderer
    // with it — and what the player got for a mistake in the glow pass was a black screen and a
    // boot overlay, rather than a game with no glow in it. Same landing as a failed link.
    try {
      gl.attachShader(ppProg, compile(gl.VERTEX_SHADER, PP_VS));
      gl.attachShader(ppProg, compile(gl.FRAGMENT_SHADER, PP_FS));
    } catch (e) {
      postFail = 'post shader: ' + (e && e.message ? e.message : e);
      ppProg = null;
      return;
    }
    gl.linkProgram(ppProg);
    if (!gl.getProgramParameter(ppProg, gl.LINK_STATUS)) {
      postFail = 'post shader: ' + gl.getProgramInfoLog(ppProg);
      ppProg = null;
      return;
    }
    for (const k of PP_UNIFORMS) ppU[k] = gl.getUniformLocation(ppProg, k);
    // A vertex array with nothing in it. Drawing with no attributes still needs one bound.
    ppVao = gl.createVertexArray();
    msaa = Math.max(1, Math.min(POST_MSAA_CAP, gl.getParameter(gl.MAX_SAMPLES) || 1));
  }

  const PP_SCRATCH = 7;                  // a unit nothing else in this file uses
  const MAT_UNIT = 6;                    // surface textures: model albedo and tiling materials
  const NRM_UNIT = 5;                    // their normal maps
  // Bone palettes occupy this unit only during forward scene drawing. The post chain later
  // reuses unit 3 for bloom/geometry, after every character draw has finished.
  const BONE_UNIT = 3;
  // Unit 4 belongs to the post chain only after scene drawing has finished, so the forward pass
  // can use it for imported glTF ARM maps without increasing the context's unit requirement.
  const ARM_UNIT = 4;
  // Per-texture information that callers do not need to carry through every prop. A tiling
  // albedo remembers its measured luminance; a model normal remembers its companion ARM map.
  const surfaceInfo = new WeakMap();
  // WebGLTexture does not expose its storage size. Record the exact RGBA8 mip chain requested by
  // texture() while the source dimensions are still available. The map is also the ownership
  // ledger used by deleteTexture; entries disappear at the same instant as their GL handles.
  const textureResources = new Map();
  // A public surface handle can own a private packed AO/roughness/metalness companion. Keep byte
  // reporting and deletion on the same ownership walk so the residency ledger cannot count only
  // the carrier while deleteTexture releases both GPU allocations.
  const ownedSurfaceTextures = texture => {
    const info = texture && surfaceInfo.get(texture);
    const arm = info && info.arm && info.arm !== texture ? info.arm : null;
    return arm ? [texture, arm] : [texture];
  };
  function mipBytes(source) {
    let w = Math.max(1, Number(source && (source.width || source.videoWidth)) || 1) | 0;
    let h = Math.max(1, Number(source && (source.height || source.videoHeight)) || 1) | 0;
    let bytes = 0;
    for (;;) {
      bytes += w * h * 4;
      if (w === 1 && h === 1) break;
      w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
    }
    return bytes;
  }
  const contextAlive = () => !!(gl && (!gl.isContextLost || !gl.isContextLost()));
  // ---------------------------------------------------------------- instance storage
  //
  // One buffer, refilled per batch per frame, and one VAO per mesh that reads from it. The
  // alternative — a static buffer per batch, built once — sounds cheaper and is not usable
  // here: which props are visible changes every time the camera moves, and a static buffer
  // would have to draw the ones behind you as well. Rewriting the visible subset costs a
  // memcpy per prop and saves a draw call per prop, which is a trade worth making every time.
  //
  // 26 floats per instance: a mat4, a colour, (gloss, alpha, glow), and the glyph atlas cell
  // (u, v, du, dv) — zero width for everything that is not a character on a sign.
  const INST_FLOATS = 26, INST_BYTES = INST_FLOATS * 4;
  let instBuf = null, instCap = 0;

  function instReserve(n) {
    if (!instBuf) instBuf = gl.createBuffer();
    if (n <= instCap) return;
    instCap = Math.max(512, n * 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instCap * INST_BYTES, gl.DYNAMIC_DRAW);
  }
  // The mesh's own three attributes plus the instance buffer's seven locations, with a divisor of
  // 1 on the latter so they advance once per prop instead of once per vertex. `makeInstVAO` also
  // serves retained Mall batches: the geometry is shared, while each fully static batch owns one
  // small instance buffer and VAO whose contents survive unchanged frames.
  function makeInstVAO(name,instanceBuffer) {
    const m = meshes[name];
    if (!m || !m.bPos) return null;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const at = (b, loc, n) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    at(m.bPos, 0, 3); at(m.bNor, 1, 3); at(m.bUv, 2, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(3 + i);
      gl.vertexAttribPointer(3 + i, 4, gl.FLOAT, false, INST_BYTES, i * 16);
      gl.vertexAttribDivisor(3 + i, 1);
    }
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 3, gl.FLOAT, false, INST_BYTES, 64);
    gl.vertexAttribDivisor(7, 1);
    gl.enableVertexAttribArray(8);
    gl.vertexAttribPointer(8, 3, gl.FLOAT, false, INST_BYTES, 76);
    gl.vertexAttribDivisor(8, 1);
    // The glyph atlas cell. Read by the instanced fragment shader through #define uTexRect, and
    // ignored by the depth program, which declares only the matrix.
    gl.enableVertexAttribArray(9);
    gl.vertexAttribPointer(9, 4, gl.FLOAT, false, INST_BYTES, 88);
    gl.vertexAttribDivisor(9, 1);
    gl.bindVertexArray(null);
    return vao;
  }
  // Shared live path, used by moving batches, character collection and every non-Mall scene.
  function instVAO(name) {
    const m=meshes[name];
    if(!m||!m.bPos)return null;
    if(m.ivao)return m.ivao;
    instReserve(512);
    return (m.ivao=makeInstVAO(name,instBuf));
  }

  let residentInstBuffers=0,residentInstBytes=0;
  function residentInst(name,data,count,owner) {
    const m=meshes[name];
    if(!m||!m.bPos)return null;
    let s=owner._residentInst;
    if(!s) {
      s=owner._residentInst={buf:gl.createBuffer(),vao:null,mesh:null,version:-1,count:0,bytes:0};
      residentInstBuffers++;
    }
    // Asset meshes can be evicted and registered again under the same name. Rebuild only the VAO
    // in that case; the retained instance buffer and its accounting remain valid.
    if(!s.vao||s.mesh!==m) {
      if(s.vao)gl.deleteVertexArray(s.vao);
      s.vao=makeInstVAO(name,s.buf);s.mesh=m;
    }
    const version=owner._instanceVersion||0;
    if(s.version!==version||s.count!==count) {
      gl.bindBuffer(gl.ARRAY_BUFFER,s.buf);
      const floats=count*INST_FLOATS;
      gl.bufferData(gl.ARRAY_BUFFER,
        floats===data.length?data:data.subarray(0,floats),gl.STATIC_DRAW);
      const bytes=floats*4;
      residentInstBytes+=bytes-s.bytes;s.bytes=bytes;
      s.version=version;s.count=count;
    }
    return s.vao;
  }

  // ---------------------------------------------------------------- skinned instance storage
  // One model buffer and one colour buffer are shared by every skinned mesh. A rig's material
  // parts all use the same models, so those matrices go up once per group; only the small colour
  // buffer changes between a face, shirt and shoes. Each mesh keeps only a VAO describing how its
  // five vertex streams and these two shared instance streams fit together.
  let skinModelBuf = null, skinColorBuf = null, skinInstCap = 0;
  let skinColorScratch = new Float32Array(0);
  let skinBoneTex = null, skinBoneW = 0, skinBoneH = 0;

  function skinInstanceReserve(n) {
    if (!skinModelBuf) skinModelBuf = gl.createBuffer();
    if (!skinColorBuf) skinColorBuf = gl.createBuffer();
    if (n <= skinInstCap) return;
    skinInstCap = Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, n))));
    gl.bindBuffer(gl.ARRAY_BUFFER, skinModelBuf);
    gl.bufferData(gl.ARRAY_BUFFER, skinInstCap * 16 * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, skinColorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, skinInstCap * 3 * 4, gl.DYNAMIC_DRAW);
  }

  function skinInstVAO(name) {
    const m = meshes[name];
    if (!m || !m.skinned || !m.bPos || !m.bJoint) return null;
    if (m.kivao) return m.kivao;
    skinInstanceReserve(16);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const at = (b, loc, n) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    at(m.bPos, 0, 3); at(m.bNor, 1, 3); at(m.bUv, 2, 2);
    at(m.bJoint, 3, 4); at(m.bWeight, 4, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.bindBuffer(gl.ARRAY_BUFFER, skinModelBuf);
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(5 + i);
      gl.vertexAttribPointer(5 + i, 4, gl.FLOAT, false, 64, i * 16);
      gl.vertexAttribDivisor(5 + i, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, skinColorBuf);
    gl.enableVertexAttribArray(9);
    gl.vertexAttribPointer(9, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(9, 1);
    gl.bindVertexArray(null);
    return (m.kivao = vao);
  }

  function skinBoneReserve(boneCount, count) {
    const w = boneCount * 4;
    if (!skinInstOK || boneCount < 1 || count < 1 || w > skinInstMaxTexture ||
        count > skinInstMaxTexture) return false;
    if (!skinBoneTex) {
      skinBoneTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + BONE_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, skinBoneTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.activeTexture(gl.TEXTURE0 + BONE_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, skinBoneTex);
    }
    if (skinBoneW !== w || count > skinBoneH) {
      skinBoneW = w;
      skinBoneH = Math.min(skinInstMaxTexture,
        Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, count)))));
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, skinBoneW, skinBoneH, 0,
        gl.RGBA, gl.FLOAT, null);
    }
    gl.activeTexture(gl.TEXTURE0);
    return true;
  }

  // Which registered opening this frame's daylight comes through, by squared distance to the eye.
  // Cached on the eye position because frameU runs once per program and there are two of them,
  // and because a standing player re-picks the same window for as long as they stand there.
  //
  // With fewer than two windows registered there is nothing to choose and the loop never runs, so
  // every scene in the game that has not adopted the registry pays exactly nothing for it.
  let pickEye = [1e30, 1e30, 1e30], picked = null;

  // One opening, normalised into what the shader wants. The horizontal axis of the rectangle is
  // cross(up, n) — every window in this game is vertical, so up is always +y and the tangent is
  // never degenerate unless somebody asks for a skylight, which the beam test could not shade
  // anyway. Its sign does not matter: the shader takes abs(q).
  // Which wall of the current room an opening at (x, z) is set into.
  //
  // The five-argument `setWindow` is the pre-registry signature and it hardcoded an outward
  // normal of -z, which its own contract says it does. The trouble is the callers: `js/game.js`
  // spreads `scene.WIN` into that form at line 15368 and at line 7, so a room that declares its
  // own `n` never gets it. `js/library.js:480` declares `n: [0,0,1]` — the exact inverse of the
  // default — and its daylight has therefore been cast through the opposite wall; `js/cabin.js`
  // puts its window at `x: -RX`, an x wall, and got a z normal, which is not even the right axis.
  // Only `js/world.js:301` escapes, because it passes the array form.
  //
  // Fixing it at the two call sites means editing `js/game.js`, which is contended. It does not
  // need editing: every one of these declarations is authored against the room box that
  // `setRoom` has just been handed on the line above (`z: -RZ + .06`, `z: RZ - .03`, `x: RX - .08`,
  // `x: -RX`), so the wall is recoverable from the geometry. Nearest face wins.
  //
  // The 0.40 m gate is what makes this safe rather than clever. `setRoom` is only called when the
  // place declares RX, so `room` can be the previous place's box — in which case no face is near
  // and the documented -z fallback stands, exactly as today. Half a metre is further than any
  // window in the game is set back from its own wall (the largest is 0.20 m) and far short of any
  // room's half-width.
  function wallNormal(x, z) {
    const near = [[Math.abs(-room[0] - x), [-1, 0, 0]],
                  [Math.abs( room[0] - x), [ 1, 0, 0]],
                  [Math.abs(-room[2] - z), [ 0, 0, -1]],
                  [Math.abs( room[2] - z), [ 0, 0,  1]]];
    near.sort((a, b) => a[0] - b[0]);
    return near[0][0] <= 0.40 ? near[0][1] : [0, 0, -1];
  }

  function addWin(w) {
    const nx = w.n ? w.n[0] : 0, ny = w.n ? w.n[1] : 0, nz = w.n ? w.n[2] : -1;
    const nl = Math.hypot(nx, ny, nz) || 1;
    const n = [nx / nl, ny / nl, nz / nl];
    let ux = n[2], uz = -n[0];                         // cross([0,1,0], n); the y term is always 0
    const ul = Math.hypot(ux, uz);
    if (ul < 1e-4) { ux = 1; uz = 0; }                 // a skylight; give it something finite
    else { ux /= ul; uz /= ul; }
    WINDOWS.push({ p: [w.x, w.y, w.z], h: [w.hw, w.hh], n, u: [ux, 0, uz],
                   shade: w.shade === undefined ? 1 : w.shade });
    picked = null; pickEye[0] = 1e30;
    // A registry of one is the same thing as the single window, so the legacy uniforms track it
    // and a scene that registers exactly one room's opening needs no other call.
    if (WINDOWS.length === 1) {
      const a = WINDOWS[0];
      winPos = a.p.slice(); winHalf = a.h.slice(); winN = a.n.slice(); winU = a.u.slice();
    }
  }

  function pickWindow(eye) {
    if (WINDOWS.length < 2) { picked = WINDOWS[0] || null; return picked; }
    if (picked && eye[0] === pickEye[0] && eye[1] === pickEye[1] && eye[2] === pickEye[2]) return picked;
    let best = WINDOWS[0], bd = Infinity;
    for (let i = 0; i < WINDOWS.length; i++) {
      const p = WINDOWS[i].p;
      const dx = p[0] - eye[0], dy = p[1] - eye[1], dz = p[2] - eye[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = WINDOWS[i]; }
    }
    pickEye[0] = eye[0]; pickEye[1] = eye[1]; pickEye[2] = eye[2];
    return (picked = best);
  }

  // Every uniform that belongs to the frame rather than the prop, applied to whichever program
  // is asked for. Both read the same fragment shader, so both need all of it.
  function frameU(P, Uu, eye) {
    gl.useProgram(P);
    gl.uniformMatrix4fv(Uu.uProj,false,proj); gl.uniformMatrix4fv(Uu.uView,false,view);
    gl.uniform3fv(Uu.uEye,eye); gl.uniform3fv(Uu.uRoom,room); gl.uniform3fv(Uu.uBulb,bulb);
    if (Uu.uDeckY) gl.uniform1f(Uu.uDeckY, deckY);
    gl.uniform1f(Uu.uBulbOn,bulbOn);
    gl.uniform1i(Uu.uNL,lightN);
    if (lightN) {
      // WebGL2's source-range overload uploads directly from the fixed buffers. Creating three
      // subarray views here allocated six short-lived objects per frame when both programs ran.
      gl.uniform3fv(Uu.uLPos,lightPos,0,lightN*3);
      gl.uniform3fv(Uu.uLCol,lightCol,0,lightN*3);
      gl.uniform1fv(Uu.uLRad,lightRad,0,lightN);
    }
    gl.uniform3fv(Uu.uSun,sun); gl.uniform3fv(Uu.uSunCol,sunCol);
    gl.uniform1f(Uu.uSunAmt,sunAmt);
    gl.uniform3fv(Uu.uSky,skyCol); gl.uniform3fv(Uu.uGround,groundCol);
    gl.uniform3fv(Uu.uSkyA,skyZenith); gl.uniform3fv(Uu.uSkyB,skyHorizon);
    const aw = pickWindow(eye);
    gl.uniform3fv(Uu.uWinPos, aw ? aw.p : winPos); gl.uniform2fv(Uu.uWinHalf, aw ? aw.h : winHalf);
    gl.uniform3fv(Uu.uWinN, aw ? aw.n : winN); gl.uniform3fv(Uu.uWinU, aw ? aw.u : winU);
    gl.uniform1f(Uu.uWinShade, (aw ? aw.shade : 1) * winShade);
    gl.uniform1f(Uu.uIndoor,indoor); gl.uniform1f(Uu.uWinOn,winOn);
    gl.uniform1f(Uu.uFogNear,fogNear); gl.uniform1f(Uu.uFogD,fogD);
    gl.uniform3fv(Uu.uFogCol,fogCol); gl.uniform1f(Uu.uTime,now);
    gl.uniform1f(Uu.uGlyphAssist,glyphAssist);
    gl.uniform1f(Uu.uExpose,expose);
    gl.uniform3fv(Uu.uWhite,whiteBal);
    gl.uniform3fv(Uu.uWeather,weather); gl.uniform3fv(Uu.uLeaf,leafTint);
    gl.uniformMatrix4fv(Uu.uLightVP,false,lightVP);
    gl.uniform1f(Uu.uShadowOn,shadowOn);
    gl.uniform2fv(Uu.uShadowPx,shadowPx);
  }

  // Must match MAXL in the fragment shader. Kept as flat arrays and uploaded once a frame
  // rather than rebuilt per draw: the lights are the room's, not the prop's.
  // ---------------------------------------------------------------- collected drawing
  //
  // Props are batched at scene build: their matrices never change, so the grouping is worked out
  // once and reused. A figure cannot work that way. Its matrices are computed every frame from
  // the pose, and a person is fifty to a hundred draws — a limb, a sleeve, a lapel, an eyelid —
  // so twenty people in a room is well over a thousand draw calls a frame that no precomputed
  // list can help with.
  //
  // But those thousand draws are drawn from a very small set: every figure in the room asks for
  // the same limb with the same cloth, the same head with the same skin. So the batching is done
  // by *collecting* instead of precomputing. Between beginCollect and endCollect, draw() files
  // each call into a bucket keyed on everything the shader reads as a uniform, and the flush
  // turns each bucket into one instanced call.
  //
  // It is intercepted here rather than in figure.js on purpose: that file makes about fifty
  // direct draw calls on top of the ones going through its own shape() helper, and the player,
  // the animals and anything anybody is carrying all come through the same door. Doing it at the
  // renderer covers every one of them without figure.js knowing this exists.
  const COL = new Map();
  let collecting = false;
  let collected = { calls: 0, items: 0 };
  // A scene submits dozens (and in the mall, hundreds) of instanced batches consecutively. The
  // original path switched to the instanced program and back to the plain one for every batch,
  // even though nothing plain was drawn between them. That was more than three hundred program
  // switches in a typical frame. These small brackets keep the appropriate instanced program
  // bound for a run and restore the caller's program once at its end.
  let batchOpen = false;
  function batchBegin() {
    if (!instOK || batchOpen) return false;
    batchOpen = true;
    gl.useProgram(pass === 1 ? siprog : iprog);
    return true;
  }
  function batchEnd() {
    if (!batchOpen) return;
    batchOpen = false;
    gl.bindVertexArray(null);
    gl.useProgram(pass === 1 ? sprog : prog);
  }

  function collectPush(name, model, color, opt) {
    // Everything below is a uniform, so it cannot vary inside one instanced call.
    const key = name + '|' + (opt.mode || 0) + '|' + (opt.round === undefined ? 'd' : opt.round) +
      '|' + (opt.bevel === undefined ? 'd' : opt.bevel) + '|' + (opt.tex ? texKey(opt.tex) : 0) +
      '|' + (opt.mat ? texKey(opt.mat) : 0) + '|' + (opt.nrm ? texKey(opt.nrm) : 0) +
      '|' + (opt.matScale || 0) + '|' + (opt.matAmt === undefined ? 'd' : opt.matAmt) +
      '|' + (opt.nrmAmt === undefined ? 'd' : opt.nrmAmt);
    let b = COL.get(key);
    if (!b) COL.set(key, b = { mesh: name, opt,
      data: new Float32Array(INST_FLOATS * 64), n: 0 });
    const o = b.n * INST_FLOATS;
    if (o + INST_FLOATS > b.data.length) {
      const bigger = new Float32Array(b.data.length * 2);
      bigger.set(b.data); b.data = bigger;
    }
    const d = b.data;
    for (let i = 0; i < 16; i++) d[o + i] = model[i];
    d[o + 16] = color[0]; d[o + 17] = color[1]; d[o + 18] = color[2];
    d[o + 19] = opt.gloss === undefined ? 0.12 : opt.gloss;
    d[o + 20] = opt.alpha === undefined ? 1 : opt.alpha;
    d[o + 21] = opt.glow || 0;
    // Nobody's face is a character on a sign. The glyph cell has to be written even though it is
    // always zero here, because this buffer is reused frame after frame and a stale non-zero
    // width left by an earlier occupant makes the fragment shader sample the glyph atlas for a
    // cheekbone — which discards most of it and paints the rest solid.
    d[o + 22] = 0; d[o + 23] = 0; d[o + 24] = 0; d[o + 25] = 0;
    b.n++;
  }
  // Stable ids for GL texture objects so a key can be a string.
  const texIds = new WeakMap(); let texSeq = 0;
  const texKey = t => texIds.get(t) || (texIds.set(t, ++texSeq), texSeq);

  // What is currently bound on the material unit, so an unchanged texture is not re-bound.
  // Every other place that touches this unit must keep it honest — see drawBatch and texture()
  // below — because a stale value here means a *skipped* bind, which draws the last texture
  // onto the wrong thing and is far worse than a redundant one.
  let boundMat = null;
  let boundArm = null;
  const armUniformState = new WeakMap();
  const textureMean = t => {
    const i = t && surfaceInfo.get(t);
    return i && i.mean ? i.mean : 0.22;
  };
  // A texture slot holds either an uploaded GL texture or nothing. Anything else is a caller
  // mistake, and until now the two bind sites below trusted truthiness — so one prop whose
  // `mat` was still the *name* of a material (js/build.js keeps the string until `resolveMats`
  // can upload it) threw `bindTexture: parameter 2 is not of type 'WebGLTexture'` on the first
  // frame and took the whole game down to the load-failure card. js/assets.js already states the
  // contract for a material that is not ready — "a scene that gets null simply keeps the flat
  // colour it had" — so honour it here instead of trusting the caller.
  const asTex = t => (t && typeof WebGLTexture !== 'undefined' && t instanceof WebGLTexture) ? t : null;

  // Renderer-neutral identity exists only in an explicit WebGPU session: index.html does not even
  // load the registry for the default WebGL route. Keep every access guarded so the production
  // renderer performs no lookup or allocation, and so a partial preview deployment cannot turn a
  // successful WebGL upload into a game failure.
  let previewDepthWrite=true,previewAdditive=false,previewCullNone=false;
  const renderResourceId = handle => {
    if(!handle||typeof RenderResources==='undefined'||
        typeof RenderResources.id!=='function')return 0;
    try{return RenderResources.id(handle)||0;}catch(_){return 0;}
  };
  const ordinaryPreviewKind = kind => kind==='albedo'||kind==='pbr'||kind==='tiling'||
    kind==='tiling-normal';
  function claimRenderTexture(handle,kind){
    if(!ordinaryPreviewKind(kind)||typeof RenderResources==='undefined'||
        typeof RenderResources.claim!=='function')return 0;
    try{return RenderResources.claim(handle,'texture','ordinary:'+kind)||0;}catch(_){return 0;}
  }
  function retireRenderTexture(handle){
    if(!handle||typeof RenderResources==='undefined'||
        typeof RenderResources.retire!=='function')return 0;
    try{return RenderResources.retire(handle)||0;}catch(_){return 0;}
  }
  // This is the sole temporary compatibility boundary while Build still carries WebGLTexture
  // objects. WebGPU receives only positive ids. If a texture was never published or has already
  // retired, skip the optional mirror rather than accidentally drawing an untextured prop.
  function previewDrawOptions(opt){
    try{
      const out={...opt};
      for(const slot of ['tex','mat','nrm']){
        const handle=asTex(opt[slot]);
        if(!handle)continue;
        const id=renderResourceId(handle);
        if(!id)return null;
        out[slot]=id;
      }
      out.previewDepthWrite=previewDepthWrite;
      out.previewAdditive=previewAdditive;
      out.previewCull=previewCullNone?'none':'back';
      return out;
    }catch(_){return null;}
  }

  // An opt-in renderer-neutral mirror. This records only after WebGL has submitted each ordinary
  // colour command, then hands the immutable packet straight back to WebGL at present(). It is
  // evidence for a later authority switch, not the switch itself: shadows, skin palettes and the
  // post graph are intentionally reported as out-of-band until they have packet contracts too.
  let framePacketId=0,framePacketDepthWrite=true,framePacketAdditive=false,
    framePacketCullNone=false;
  let framePacketFrame={mode:'off',scope:'ordinary-color',authority:'webgl2',frameId:0,
    outcome:'idle',reason:'',commands:0,batches:0,direct:0,instances:0,floats:0,
    omitted:[],features:{}};
  const framePacketRequested=()=>typeof WebGPUPreview!=='undefined'&&
    WebGPUPreview.packetRecordRequested&&typeof FramePacket!=='undefined';
  function framePacketOmit(reason){
    if(!framePacketId||!reason||framePacketFrame.omitted.includes(reason)||
        framePacketFrame.omitted.length>=12)return;
    framePacketFrame.omitted.push(reason);
  }
  function framePacketState(){
    let neutral=null;
    try{if(typeof FramePacket!=='undefined')neutral=FramePacket.status();}catch(_){}
    return {...framePacketFrame,omitted:framePacketFrame.omitted.slice(),
      features:{...framePacketFrame.features},neutral};
  }
  function beginFramePacket(clear,eye){
    if(!framePacketRequested())return false;
    framePacketDepthWrite=true;framePacketAdditive=false;framePacketCullNone=false;
    // The packet owns the ordinary colour stream only. A shadow pass is reported separately in
    // `omitted`; declaring it here would falsely imply its depth commands were packet-owned.
    const features={shadow:false,post:!!postOn,
      ao:!!(postOn&&aoWant&&geFbo&&aFbo[0]),
      weatherParticles:!indoor&&!!(weather[0]||weather[1]||weather[2]),
      transparent:true,additive:true};
    framePacketFrame={mode:'record',scope:'ordinary-color',authority:'webgl2',frameId:0,
      outcome:'aborted',reason:'',commands:0,batches:0,direct:0,instances:0,floats:0,
      omitted:[],features};
    try{
      framePacketId=FramePacket.begin({vp,clear,eye,
        sun:{dir:sun,color:sunCol,amount:sunAmt},sky:skyCol,ground:groundCol,
        skyA:skyZenith,skyB:skyHorizon,indoor:!!indoor,bulb,bulbOn,
        lights:{count:lightN,positions:lightPos,colors:lightCol,radii:lightRad},
        white:whiteBal,expose,fog:{near:fogNear,density:fogD,color:fogCol},
        deckY,glyphAssist:!!glyphAssist,time:now,weather,leaf:leafTint,features})||0;
      framePacketFrame.frameId=framePacketId;
      framePacketFrame.outcome=framePacketId?'open':'aborted';
      if(!framePacketId)framePacketFrame.reason=FramePacket.status().reason||'packet-begin-failed';
      return !!framePacketId;
    }catch(err){
      framePacketId=0;framePacketFrame.reason=String(err&&err.message||'packet-begin-failed').slice(0,160);
      try{FramePacket.abort(framePacketFrame.reason);}catch(_){}
      return false;
    }
  }
  function framePacketResource(value,slot){
    if(value===undefined||value===null)return null;
    const handle=asTex(value);
    if(!handle)throw new Error('unresolved-'+slot);
    const id=renderResourceId(handle);
    if(!id)throw new Error('unresolved-'+slot+'-id');
    return id;
  }
  function framePacketMaterial(name,opt,alpha){
    const textureId=framePacketResource(opt.tex,'texture'),
      materialId=framePacketResource(opt.mat,'material'),
      normalId=framePacketResource(opt.nrm,'normal');
    if(textureId&&materialId)throw new Error('conflicting-surface-resources');
    if(normalId&&!textureId&&!materialId)throw new Error('orphan-normal-resource');
    const mode=Number(opt.mode||0),soft=name==='softBox',
      bevelMode=mode===0||mode===3||mode===4||mode===6||mode===7,
      cull=framePacketCullNone?'none':'back';
    return {mode,
      round:soft?(opt.round===undefined?(mode===7?.055:.022):opt.round):0,
      bevel:name==='box'&&bevelMode?(opt.bevel===undefined?.013:opt.bevel):0,
      doubleSided:cull==='none',cull,
      textureId,materialId,normalId,
      matScale:opt.matScale||1,matAmount:opt.matAmt===undefined?.7:opt.matAmt,
      normalAmount:opt.nrmAmt===undefined?1:opt.nrmAmt,
      depthWrite:framePacketDepthWrite,
      // Mode 2 has procedural edge coverage even when every authored instance alpha is one, so its
      // blend state is a material fact rather than something that can be inferred from the payload.
      blend:framePacketAdditive?'additive':mode===2||alpha<1?'alpha':'opaque'};
  }
  function framePacketFailed(err){
    const reason=String(err&&err.message||'packet-command-failed').slice(0,160);
    framePacketFrame.outcome='aborted';framePacketFrame.reason=reason;
    framePacketOmit(reason);
    try{FramePacket.abort(reason);}catch(_){}
  }
  function recordFramePacketBatch(name,data,count,opt){
    if(!framePacketId||FramePacket.status().state!=='open')return false;
    try{
      let alpha=1;
      for(let i=0;i<count;i++)if(Number(data[i*26+20])<1){alpha=Number(data[i*26+20]);break;}
      const sequence=FramePacket.batch(name,data,count,framePacketMaterial(name,opt,alpha));
      if(sequence<0)throw new Error(FramePacket.status().reason||'packet-batch-rejected');
      framePacketFrame.commands++;framePacketFrame.batches++;
      framePacketFrame.instances+=count;framePacketFrame.floats+=count*26;
      return true;
    }catch(err){framePacketFailed(err);return false;}
  }
  function recordFramePacketDraw(name,model,color,opt){
    if(!framePacketId||FramePacket.status().state!=='open')return false;
    try{
      const alpha=opt.alpha===undefined?1:Number(opt.alpha),
        material=framePacketMaterial(name,opt,alpha);
      material.gloss=opt.gloss===undefined?.12:opt.gloss;
      material.alpha=alpha;material.glow=opt.glow||0;
      if(opt.rect!==undefined&&opt.rect!==null)material.rect=opt.rect;
      const sequence=FramePacket.draw(name,model,color,material);
      if(sequence<0)throw new Error(FramePacket.status().reason||'packet-draw-rejected');
      framePacketFrame.commands++;framePacketFrame.direct++;
      framePacketFrame.instances++;framePacketFrame.floats+=26;
      return true;
    }catch(err){framePacketFailed(err);return false;}
  }
  function finishFramePacket(){
    if(!framePacketId)return false;
    const id=framePacketId;framePacketId=0;
    try{
      if(FramePacket.status().state!=='open'){
        framePacketFrame.outcome='aborted';
        framePacketFrame.reason=FramePacket.status().reason||framePacketFrame.reason||'packet-not-open';
        return false;
      }
      const packet=FramePacket.seal(id);
      if(!packet)throw new Error(FramePacket.status().reason||'packet-seal-failed');
      framePacketFrame.commands=packet.commands.length;
      framePacketFrame.direct=packet.commands.filter(command=>command.direct).length;
      framePacketFrame.batches=packet.commands.length-framePacketFrame.direct;
      framePacketFrame.instances=packet.instances;framePacketFrame.floats=packet.floats;
      // Resolve the complete immutable ordinary stream while it is still the registry's current
      // sealed packet. This canary is deliberately disposable: it submits nothing, suppresses no
      // GL work, and is isolated from packet ownership so even an unexpected preview exception
      // cannot strand a sealed record before WebGL claims and consumes it below.
      if(typeof WebGPUPreview!=='undefined'&&
          typeof WebGPUPreview.preparePacket==='function'){
        let prepared=null;
        try{prepared=WebGPUPreview.preparePacket(packet);}catch(_){}
        if(prepared&&typeof WebGPUPreview.discardPreparedPacket==='function')
          try{WebGPUPreview.discardPreparedPacket(prepared);}catch(_){}
      }
      if(FramePacket.claim(id,'webgl2')!==packet){
        FramePacket.drop(id,'packet-claim-failed');throw new Error('packet-claim-failed');
      }
      if(!FramePacket.consume(id,'webgl2')){
        FramePacket.release(id,'webgl2');FramePacket.drop(id,'packet-consume-failed');
        throw new Error('packet-consume-failed');
      }
      framePacketFrame.outcome='mirrored';framePacketFrame.reason='';
      return true;
    }catch(err){framePacketFailed(err);return false;}
  }

  function bindArm(Uu, surfaceTexture) {
    const i = surfaceTexture && surfaceInfo.get(surfaceTexture);
    if (!i || !i.arm) {
      if (armUniformState.get(Uu) !== null) {
        gl.uniform1f(Uu.uArmOn, 0);
        gl.uniform1f(Uu.uRoughness, 1);
        gl.uniform1f(Uu.uMetallic, 1);
        armUniformState.set(Uu, null);
      }
      return;
    }
    // Always bind rather than cache: the post pass intentionally reuses unit 4 for AO, so what
    // was here at the end of the last scene draw is not what is here at the next frame's start.
    if (boundArm !== i.arm) {
      gl.activeTexture(gl.TEXTURE0 + ARM_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, i.arm);
      boundArm = i.arm;
      gl.activeTexture(gl.TEXTURE0);
    }
    if (armUniformState.get(Uu) !== i) {
      gl.uniform1f(Uu.uArmOn, i.armAO ? 2 : 1);
      gl.uniform1f(Uu.uRoughness, i.roughness);
      gl.uniform1f(Uu.uMetallic, i.metallic);
      armUniformState.set(Uu, i);
    }
  }
  function applyAnisotropy(target, requested) {
    if (!anisoExt || maxAniso <= 1) return;
    const value = Number.isFinite(requested) ? requested : surfaceAniso;
    gl.texParameterf(target, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(maxAniso, Math.max(1, value)));
  }
  const MAXLIGHTS = 8;
  const lightPos = new Float32Array(MAXLIGHTS * 3);
  const lightCol = new Float32Array(MAXLIGHTS * 3);
  const lightRad = new Float32Array(MAXLIGHTS);
  let lightN = 0;
  function tex(w, h) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + PP_SCRATCH);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // Release the complete post chain as one ownership unit. A low quality tier does not merely
  // stop drawing bloom/AO: it is the memory-pressure fallback too, so retaining the old high-DPI
  // multisample targets there defeats half of the tier. At 2560x1440 the colour/light/depth pair,
  // resolves and blur targets occupy tens of megabytes even with AO disabled. Deleting a texture
  // while it is still bound only marks it for deletion, so clear the post units first and restore
  // the atlas/unit-0 invariant the forward renderer expects.
  function dropPostTargets() {
    if (!gl) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    for (const unit of [2, 3, 4, PP_SCRATCH]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    boundArm = null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    for (const f of [msFbo, reFbo, liFbo, geFbo, ...bFbo, ...aFbo])
      if (f) gl.deleteFramebuffer(f);
    for (const r of [msCol, msLit, msGeo, msDep]) if (r) gl.deleteRenderbuffer(r);
    for (const t of [reTex, liTex, geTex, ...bTex, ...aTex]) if (t) gl.deleteTexture(t);
    msFbo = reFbo = liFbo = geFbo = null;
    msCol = msLit = msGeo = msDep = null;
    reTex = liTex = geTex = null;
    for (let i = 0; i < 2; i++) {
      bFbo[i] = bTex[i] = aFbo[i] = aTex[i] = null;
    }
    pW = pH = bW = bH = 0;
    postOn = 0;
  }
  // Every one of these buffers is freshly allocated storage, and freshly allocated storage holds
  // whatever the driver last had in that memory. Nothing here is supposed to be read before it is
  // written, but "supposed to" is doing a lot of work in a chain of six targets at three sizes: the
  // frame after a rebuild came out with a soft, structured ghost of something else laid over the
  // whole picture, and this rebuild happens in ordinary play every time the quality ladder changes
  // a level or the window is resized. Cleared to what each buffer means when it means nothing:
  // black for light and glow, white for occlusion — white is *unoccluded* — and far away for the
  // distance map, so an unwritten pixel can never read as something standing right in front.
  function clearPostTargets() {
    for (const f of [reFbo, liFbo, bFbo[0], bFbo[1]]) {
      if (!f) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    for (const f of [aFbo[0], aFbo[1]]) {
      if (!f) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (geFbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, geFbo);
      gl.clearColor(1, 1, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // What the chain's completeness depends on, apart from its size: which attachments exist, and how
  // many samples they carry. Both are quality-tier decisions, not size ones.
  const postShapeNow = () => aoWant + '|' + msaa;
  // The shape that has been built and validated. '' until one has.
  let postShape = '';
  // The largest area the chain has ever successfully held, in pixels. Growing past it is the only
  // place a re-specification can meet GL_OUT_OF_MEMORY; see postResize.
  let postPeakPx = 0;
  // The same chain at a different size. Only the storage behind the attachments changes, so nothing
  // is created, nothing is deleted, and no framebuffer is re-assembled — which means completeness
  // cannot have changed either, and the eight `checkFramebufferStatus` calls the full build makes
  // can be skipped. That matters far more than the allocation does: each of those is a synchronous
  // round trip to the GPU process, measured at 0.6-0.9 ms in the zoo and 9.7-16.4 ms in the street,
  // against under 0.2 ms for every allocation in the whole rebuild put together. Not deleting the
  // old storage also means the driver is never asked to retire a buffer the display pipeline may
  // still be holding.
  //
  // Size cannot make a complete framebuffer incomplete here: `resize` has already clamped both
  // dimensions to the driver's own limit and to the device pixel budget before calling in, and the
  // half-size buffers are smaller again. A shape change — AO switching on or off, or a different
  // sample count — does not come through this path; `postSize` sends that to the full build.
  function postResize(w, h) {
    pW = w; pH = h; bW = Math.max(1, w >> 1); bH = Math.max(1, h >> 1);
    for (const rb of [msCol, msLit, msGeo]) {
      if (!rb) continue;
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.RGBA8, w, h);
    }
    if (msDep) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, msDep);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.DEPTH_COMPONENT24, w, h);
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    // Filtering and wrap live on the texture object and survive a re-specification, so only the
    // image itself is replaced. geTex is RGBA8/NEAREST like the rest; see the full build.
    gl.activeTexture(gl.TEXTURE0 + PP_SCRATCH);
    for (const [t, tw, th] of [[reTex, w, h], [liTex, w, h], [geTex, w, h],
                               [bTex[0], bW, bH], [bTex[1], bW, bH],
                               [aTex[0], bW, bH], [aTex[1], bW, bH]]) {
      if (!t) continue;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    // Unit 0 is the glyph atlas and it is expected to stay bound for the life of the program.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    // This path never re-assembles a framebuffer, so nothing is ever asked whether it is complete —
    // which is what makes it cheap, and which also means a failed allocation would go unnoticed and
    // render black, the thing this file calls a far worse bug than no bloom. The dimension clamps in
    // `resize` rule out an illegal size; they cannot rule out GL_OUT_OF_MEMORY at a legal one. So
    // ask, once, and only while growing past every size the chain has already held: a size the
    // driver has found room for before is not where memory runs out, and the ladder spends its life
    // moving between sizes it has already used. Failure is handed back to the full build rather than
    // handled here — that is the only code in this file that knows how to give up properly.
    const px = w * h;
    if (px > postPeakPx && gl.getError() === gl.OUT_OF_MEMORY) return false;
    if (px > postPeakPx) postPeakPx = px;
    clearPostTargets();
    postOn = postWant ? 1 : 0;
    return true;
  }
  // Everything the chain needs at this size, rebuilt when the window changes. Any of it failing
  // turns the chain off rather than leaving a half-built one: a broken post pass is a black screen,
  // which is a far worse bug than no bloom.
  function postSize(w, h) {
    if (!ppProg || postFail) return false;
    if (msFbo && pW === w && pH === h) return true;
    // Same attachments, same samples, different size: re-specify the storage rather than tearing
    // the whole graph down and building an identical one. See postResize.
    if (msFbo && postShape && postShape === postShapeNow() && postResize(w, h)) return true;
    dropPostTargets();
    pW = w; pH = h; bW = Math.max(1, w >> 1); bH = Math.max(1, h >> 1);
    // the scene, multisampled, so the antialiasing this context was made for survives the detour
    msCol = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msCol);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.RGBA8, w, h);
    // the same again for the light mask, which has to match it in size and samples to share a
    // framebuffer with it
    msLit = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msLit);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.RGBA8, w, h);
    msDep = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msDep);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.DEPTH_COMPONENT24, w, h);
    msFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msCol);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, msLit);
    const bufs = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1];
    // The distance map is only allocated when the occlusion is wanted: it is a third full-size
    // multisampled buffer, and paying for it on a tier that is not going to read it would be the
    // most expensive way in this file to achieve nothing.
    if (aoWant) {
      msGeo = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, msGeo);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa, gl.RGBA8, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.RENDERBUFFER, msGeo);
      bufs.push(gl.COLOR_ATTACHMENT2);
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDep);
    gl.drawBuffers(bufs);
    let ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    // resolved, and the two half-size buffers the blur bounces between
    reTex = tex(w, h);
    reFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, reFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reTex, 0);
    ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    liTex = tex(w, h);
    liFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, liFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, liTex, 0);
    ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    for (let i = 0; i < 2; i++) {
      bTex[i] = tex(bW, bH);
      bFbo[i] = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bTex[i], 0);
      ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    if (aoWant) {
      // The distance map, resolved. Nearest filtering: averaging two packed distances averages the
      // *bytes*, and the low byte wrapping past 255 next to the high byte changing gives a reading
      // half a metre out along every silhouette in the frame.
      geTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + PP_SCRATCH);
      gl.bindTexture(gl.TEXTURE_2D, geTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
                            [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      geFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, geFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, geTex, 0);
      ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      for (let i = 0; i < 2; i++) {
        aTex[i] = tex(bW, bH);
        aFbo[i] = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, aFbo[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, aTex[i], 0);
        ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      }
    }
    // Freshly allocated storage holds whatever the driver last had in that memory; see
    // clearPostTargets for what each buffer is cleared to and the ghost it was hiding.
    clearPostTargets();
    // Unit 0 is the glyph atlas and it is expected to stay bound for the life of the program.
    gl.activeTexture(gl.TEXTURE0 + PP_SCRATCH);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    // Validated at this shape and this size, so a later change of size alone can go through
    // postResize, and this size is now one the driver has proved it has room for.
    postShape = ok ? postShapeNow() : '';
    if (ok && w * h > postPeakPx) postPeakPx = w * h;
    if (!ok) {
      postFail = 'the post framebuffers would not build';
      dropPostTargets();
    }
    // Live from here, not from the next begin(): the shadow pass runs before begin and puts the
    // target back itself, so on the very first frame it has to know where the scene is going.
    postOn = ok && postWant ? 1 : 0;
    return ok;
  }
  function ppDraw(pass, dirX, dirY, texelW, texelH) {
    gl.uniform1f(ppU.uPass, pass);
    gl.uniform2f(ppU.uDir, dirX, dirY);
    gl.uniform2f(ppU.uTexel, 1 / texelW, 1 / texelH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const UNIFORMS = ['uProj','uView','uModel','uColor','uMode','uAlpha','uGlow',
                    'uEye','uScale','uRoom','uBulb','uWhite','uDeckY','uGloss','uBevel','uBulbOn',
                    'uRound','uSun','uSunCol','uSunAmt','uGlyphAssist','uSky','uGround',
                    'uWinPos','uWinHalf','uWinN','uWinU','uWinShade',
                    'uIndoor','uWinOn','uFogNear','uFogD',
                    'uFogCol','uSkyA','uSkyB','uTime','uExpose','uWeather','uLeaf',
                    'uTex','uTexOn','uTexRect','uMat','uMatOn','uMatCut','uMatScale','uMatAmt','uMatMean',
                    'uNrm','uNrmOn','uNrmAmt','uArm','uArmOn','uRoughness','uMetallic',
                    'uNL','uLPos','uLCol','uLRad',
                    'uShadow','uLightVP','uShadowOn','uShadowPx'];

  // Set up one authored character, then draw each of its material parts without re-uploading the
  // same view, lights, model matrix and 52-bone palette between every pair of shoes and eyebrows.
  // A production rig currently has eight material parts; doing this work once rather than eight
  // times is important when a mall floor contains a couple of dozen distinct people.
  function skinBegin(model, bones, previewMeta) {
    if (!skinOK || skinCharacterOpen || !bones) return false;
    framePacketOmit('skinned-direct-out-of-band');
    gl.useProgram(kprog);
    if (!skinFrameReady) {
      frameU(kprog, kU, lastEye);
      skinFrameReady = true;
    }
    const n = Math.min(bones.length / 16, MAXBONES) | 0;
    gl.uniformMatrix4fv(kU.uModel, false, model);
    gl.uniformMatrix4fv(kU.uBones, false, bones.subarray(0, n * 16));
    gl.uniform3fv(kU.uScale, SKIN_UNIT_SCALE);
    gl.uniform1f(kU.uBevel, 0);
    gl.uniform1f(kU.uRound, 0);
    gl.uniform1f(kU.uTexOn, 0);
    gl.uniform1f(kU.uMatMean, 0.22);
    gl.uniform1f(kU.uNrmOn, 0);
    bindArm(kU, null);
    skinCharacterOpen = true;
    webgpuDirectSkin=null;
    if(typeof WebGPUPreview!=='undefined'&&WebGPUPreview.requested){
      try{webgpuDirectSkin={model,bones,boneCount:n,parts:[],valid:true,meta:previewMeta};}catch(_){
        webgpuDirectSkin=null;
        if(typeof WebGPUPreview.invalidateSkinFrame==='function')
          WebGPUPreview.invalidateSkinFrame('skin-direct-begin');
      }
    }
    return true;
  }

  function skinPart(name, color, opt = {}) {
    if (!skinCharacterOpen) return false;
    const m = meshes[name];
    if (!m || !m.skinned) {
      if(webgpuDirectSkin)webgpuDirectSkin.valid=false;
      return false;
    }
    gl.uniform3fv(kU.uColor, color);
    gl.uniform1i(kU.uMode, opt.mode || 0);
    gl.uniform1f(kU.uAlpha, opt.alpha === undefined ? 1 : opt.alpha);
    gl.uniform1f(kU.uGlow, opt.glow || 0);
    gl.uniform1f(kU.uGloss, opt.gloss === undefined ? .16 : opt.gloss);
    // asTex, not opt.tex. build.js keeps `mat`/`tex` as the material's *name* until Assets can
    // hand back an uploaded texture, and resolveMats only runs on arrival at a place — so on any
    // frame a prop's texture slot can still be a string. A string is truthy, and
    // bindTexture(TEXTURE_2D, "metal") throws and takes the whole game to the load-failure card.
    // The two unskinned paths have guarded this since the bug was first found; these two skinned
    // ones did not, which is a race that only shows when a figure is drawn during that window.
    const kTex = asTex(opt.tex);
    if (kTex) {
      if (boundMat !== kTex) {
        gl.activeTexture(gl.TEXTURE0 + MAT_UNIT);
        gl.bindTexture(gl.TEXTURE_2D, kTex);
        boundMat = kTex;
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.uniform1f(kU.uMatOn, 1);
    } else gl.uniform1f(kU.uMatOn, 0);
    gl.uniform1f(kU.uMatCut, opt.cutout || 0);
    gl.bindVertexArray(m.vao);
    const restoreCull = !!opt.doubleSided && gl.isEnabled(gl.CULL_FACE);
    if (restoreCull) gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, m.count, m.type, 0);
    if (restoreCull) gl.enable(gl.CULL_FACE);
    if(webgpuDirectSkin){
      try{webgpuDirectSkin.parts.push({mesh:name,color,opt});}
      catch(_){webgpuDirectSkin.valid=false;}
    }
    return true;
  }

  function skinEnd() {
    if (!skinCharacterOpen) return;
    const preview=webgpuDirectSkin;webgpuDirectSkin=null;
    skinCharacterOpen = false;
    gl.bindVertexArray(null);
    gl.useProgram(prog);
    if(preview&&preview.valid&&preview.parts.length&&typeof WebGPUPreview!=='undefined'){
      try{
        const palette=preview.bones.subarray
          ?preview.bones.subarray(0,preview.boneCount*16)
          :Array.prototype.slice.call(preview.bones,0,preview.boneCount*16);
        WebGPUPreview.captureSkinnedGroup(preview.parts,preview.model,palette,
          preview.boneCount,1,preview.meta);
      }catch(_){if(typeof WebGPUPreview.invalidateSkinFrame==='function')
        WebGPUPreview.invalidateSkinFrame('skin-direct-capture');}
    }else if(preview&&!preview.valid&&typeof WebGPUPreview!=='undefined'&&
      typeof WebGPUPreview.invalidateSkinFrame==='function'){
      WebGPUPreview.invalidateSkinFrame('skin-direct-incomplete');
    }
  }

  // Draw one exact rig/LOD shared by `count` people. `parts` contains `{mesh,color,opt}` records;
  // model matrices are 16 floats per person and the bone palette is boneCount*16 floats per
  // person. A colour may be one RGB triplet or a flat RGB array with one triplet per instance.
  // Returning zero is a hard promise that no partial character was submitted, so Rig can safely
  // use its direct path for every member of the group.
  function skinMany(parts, models, bones, boneCount, count, previewMeta) {
    count |= 0; boneCount |= 0;
    if (!skinInstOK || skinCharacterOpen || !parts || !parts.length || count < 1 ||
        !models || models.length < count * 16 || !bones || bones.length < count * boneCount * 16)
      return 0;
    // Validate every material mesh before drawing the first. Rendering a shirt and then finding
    // the face was disposed would make a direct fallback draw the shirt twice and still leave a
    // visibly broken person.
    for (const p of parts) {
      const m = meshes[p.mesh];
      if (!m || !m.skinned || !skinInstVAO(p.mesh)) return 0;
    }
    if (!skinBoneReserve(boneCount, count)) return 0;

    let calls = 0;
    gl.useProgram(kiprog);
    try {
      if (!skinInstFrameReady) {
        frameU(kiprog, kiU, lastEye);
        skinInstFrameReady = true;
      }
      skinInstanceReserve(count);
      gl.bindBuffer(gl.ARRAY_BUFFER, skinModelBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, models, 0, count * 16);
      gl.activeTexture(gl.TEXTURE0 + BONE_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, skinBoneTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, boneCount * 4, count,
        gl.RGBA, gl.FLOAT, bones);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(kiU.uBevel, 0);
      gl.uniform1f(kiU.uRound, 0);
      gl.uniform1f(kiU.uTexOn, 0);
      gl.uniform1f(kiU.uMatMean, 0.22);
      gl.uniform1f(kiU.uNrmOn, 0);
      bindArm(kiU, null);

      for (const p of parts) {
        const m = meshes[p.mesh], opt = p.opt || {}, c = p.color || [1, 1, 1];
        let colors;
        if (ArrayBuffer.isView(c) && c.length >= count * 3) colors = c;
        else {
          const need = count * 3;
          if (skinColorScratch.length < need) skinColorScratch = new Float32Array(
            Math.max(48, 2 ** Math.ceil(Math.log2(need))));
          const r = Number(c[0]) || 0, g = Number(c[1]) || 0, b = Number(c[2]) || 0;
          for (let i = 0; i < need; i += 3) {
            skinColorScratch[i] = r; skinColorScratch[i + 1] = g; skinColorScratch[i + 2] = b;
          }
          colors = skinColorScratch;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, skinColorBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors, 0, count * 3);
        gl.uniform1i(kiU.uMode, opt.mode || 0);
        gl.uniform1f(kiU.uAlpha, opt.alpha === undefined ? 1 : opt.alpha);
        gl.uniform1f(kiU.uGlow, opt.glow || 0);
        gl.uniform1f(kiU.uGloss, opt.gloss === undefined ? .16 : opt.gloss);
        // Same guard as the non-instanced skinned path above, and for the same reason: a texture
        // slot that is still a material name must bind nothing rather than throw.
        const kiTex = asTex(opt.tex);
        if (kiTex) {
          if (boundMat !== kiTex) {
            gl.activeTexture(gl.TEXTURE0 + MAT_UNIT);
            gl.bindTexture(gl.TEXTURE_2D, kiTex);
            boundMat = kiTex;
            gl.activeTexture(gl.TEXTURE0);
          }
          gl.uniform1f(kiU.uMatOn, 1);
        } else gl.uniform1f(kiU.uMatOn, 0);
        gl.uniform1f(kiU.uMatCut, opt.cutout || 0);
        bindArm(kiU, opt.nrm || opt.tex);
        gl.bindVertexArray(m.kivao);
        const restoreCull = !!opt.doubleSided && gl.isEnabled(gl.CULL_FACE);
        if (restoreCull) gl.disable(gl.CULL_FACE);
        gl.drawElementsInstanced(gl.TRIANGLES, m.count, m.type, 0, count);
        if (restoreCull) gl.enable(gl.CULL_FACE);
        calls++;
      }
    } finally {
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(prog);
    }
    if (!calls) return 0;
    framePacketOmit('skinned-instanced-out-of-band');
    skinInstFrameStats.groups++;
    skinInstFrameStats.calls += calls;
    skinInstFrameStats.instances += count;
    skinInstTotalStats.groups++;
    skinInstTotalStats.calls += calls;
    skinInstTotalStats.instances += count;
    if(typeof WebGPUPreview!=='undefined'&&WebGPUPreview.requested){
      try{WebGPUPreview.captureSkinnedGroup(parts,models,bones,boneCount,count,previewMeta);}catch(_){
        if(typeof WebGPUPreview.invalidateSkinFrame==='function')
          WebGPUPreview.invalidateSkinFrame('skin-instanced-capture');
      }
    }
    return count;
  }

  return {
    get gl(){ return gl; },
    resourceId(handle){ return renderResourceId(handle); },
    get framePacketStats(){ return framePacketState(); },
    init(canvas){
      // high-performance asks a dual-GPU laptop for the discrete part rather than the integrated
      // one it defaults to; preserveDrawingBuffer keeps the frame readable after the swap, which is
      // what a screenshot needs. Neither costs anything on a machine with one GPU.
      gl=canvas.getContext('webgl2',{antialias:true,alpha:false,
        powerPreference:'high-performance',preserveDrawingBuffer:true});
      if(!gl){
        document.body.innerHTML='<p style="padding:40px;font:16px sans-serif;color:#fff">This browser has no WebGL2.</p>';
        throw new Error('no webgl2');
      }
      anisoExt = gl.getExtension('EXT_texture_filter_anisotropic') ||
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
        gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
      maxAniso = anisoExt
        ? Math.max(1, gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1) : 1;
      skinInstMaxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
      maxTargetSize = Math.max(1024, Math.min(skinInstMaxTexture || 4096,
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096));
      renderPixelBudget = targetPixelBudget();
      skinInstVertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0;
      // A GPU context is not forever. A laptop switching graphics chips, a driver reset, a tab
      // left in the background too long — any of them takes the context away, and every buffer,
      // texture and shader in it with them. Unhandled, that is a canvas that quietly stops
      // updating or fills with garbage while the game carries on running behind it, which reads
      // as "it renders badly sometimes" and is cured only by a reload nobody knew to do.
      //
      // Calling preventDefault is what makes the browser willing to give a context back at all;
      // restoring means rebuilding every mesh and texture, so the honest move is to say what
      // happened and start again cleanly.
      canvas.addEventListener('webglcontextlost',function(e){
        e.preventDefault();
        const b=document.getElementById('boot'),w=document.getElementById('bootWhat');
        if(w) w.textContent='The graphics context was lost — usually the GPU resetting or the '
          +'tab being in the background a long time. Reloading rebuilds it.';
        if(b) b.className='on';
      },false);
      canvas.addEventListener('webglcontextrestored',function(){ location.reload(); },false);
      prog=gl.createProgram();
      gl.attachShader(prog,compile(gl.VERTEX_SHADER,VS));
      gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FS));
      gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      for(const k of UNIFORMS) U[k]=gl.getUniformLocation(prog,k);
      meshes.box=previewMesh('box',makeBox());
      meshes.softBox=previewMesh('softBox',makeRoundedBox());
      meshes.cyl=previewMesh('cyl',makeCyl());
      meshes.ball=previewMesh('ball',makeSphere());
      meshes.capsule=previewMesh('capsule',makeCapsule());
      meshes.ring=previewMesh('ring',makeRing());
      meshes.body=previewMesh('body',makeBody());
      meshes.limb=previewMesh('limb',makeLimb());
      // Two of them: the arm at negative x in figure.js takes `hand`, the one at positive x
      // takes `handMirror`. Using one for both puts the ball of the thumb on the wrong edge of
      // one hand, which is subtle but wrong; using `hand` alone is still far better than a box.
      meshes.hand=previewMesh('hand',makeHand(20,16,1));
      meshes.handMirror=previewMesh('handMirror',makeHand(20,16,-1));
      meshes.head=previewMesh('head',makeHead());
      meshes.hair=previewMesh('hair',makeHair());
      // Three beards rather than one scaled one: how much of the cheek is covered is a contour
      // across the surface, not a size, so it cannot be had from a scale the way a hat's can.
      meshes.beard=previewMesh('beard',makeBeard(48,64,1));
      meshes.goatee=previewMesh('goatee',makeBeard(48,64,.30));
      meshes.tache=previewMesh('tache',makeBeard(48,64,0));
      meshes.taper=previewMesh('taper',makeTaper());
      meshes.quad=previewMesh('quad',makeQuad());
      postInit();
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      // One texture unit, one atlas, bound for the life of the program. A single sheet of
      // glyphs is the only texture in the game, so there is nothing to swap.
      gl.uniform1i(U.uTex,0);
      // Unit 6: surface textures. Units 0 and 1 are the glyph atlas and the shadow map, 2-4
      // belong to the post chain and 7 is its scratch, so this is the one that is free.
      gl.uniform1i(U.uMat,MAT_UNIT);
      gl.uniform1f(U.uMatOn,0);
      gl.uniform1f(U.uMatCut,0);
      gl.uniform1f(U.uMatScale,1);
      gl.uniform1f(U.uMatAmt,1);
      gl.uniform1f(U.uMatMean,0.22);
      gl.uniform1i(U.uNrm,NRM_UNIT);
      gl.uniform1f(U.uNrmOn,0);
      gl.uniform1f(U.uNrmAmt,1);
      gl.uniform1i(U.uArm,ARM_UNIT);
      gl.uniform1f(U.uArmOn,0);
      gl.uniform1f(U.uRoughness,1);
      gl.uniform1f(U.uMetallic,1);
      gl.uniform1f(U.uTexOn,0);
      // ---- the shadow pass: the same vertex shader, no fragment work, into a depth texture
      sprog=gl.createProgram();
      gl.attachShader(sprog,compile(gl.VERTEX_SHADER,VS));
      gl.attachShader(sprog,compile(gl.FRAGMENT_SHADER,DEPTH_FS));
      gl.linkProgram(sprog);
      if(!gl.getProgramParameter(sprog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(sprog));
      for(const k of ['uProj','uView','uModel','uScale','uRound'])
        sU[k]=gl.getUniformLocation(sprog,k);
      // ---- the instanced pair, for batched props. Built after the two above so that a driver
      // that will not compile them leaves a working renderer behind: `inst` stays null, every
      // batch falls through to the one-prop-at-a-time path, and the game is slower rather than
      // absent. Instancing is an optimisation and it is allowed to be unavailable.
      try {
        iprog=gl.createProgram();
        gl.attachShader(iprog,compile(gl.VERTEX_SHADER,VS_I));
        gl.attachShader(iprog,compile(gl.FRAGMENT_SHADER,FS_I));
        gl.linkProgram(iprog);
        if(!gl.getProgramParameter(iprog,gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(iprog));
        for(const k of UNIFORMS) iU[k]=gl.getUniformLocation(iprog,k);
        siprog=gl.createProgram();
        gl.attachShader(siprog,compile(gl.VERTEX_SHADER,DEPTH_VS_I));
        gl.attachShader(siprog,compile(gl.FRAGMENT_SHADER,DEPTH_FS));
        gl.linkProgram(siprog);
        if(!gl.getProgramParameter(siprog,gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(siprog));
        for(const k of ['uProj','uView','uRound']) siU[k]=gl.getUniformLocation(siprog,k);
        gl.useProgram(iprog);
        gl.uniform1i(iU.uTex,0); gl.uniform1i(iU.uShadow,1);
        gl.uniform1i(iU.uMat,MAT_UNIT); gl.uniform1i(iU.uNrm,NRM_UNIT);
        gl.uniform1i(iU.uArm,ARM_UNIT); gl.uniform1f(iU.uArmOn,0);
        gl.uniform1f(iU.uMatCut,0);
        gl.uniform1f(iU.uMatMean,0.22);
        gl.useProgram(prog);
        instOK=true;
      } catch(e) {
        instFail=String(e.message||e); iprog=siprog=null; instOK=false;
        gl.useProgram(prog);
        // Loud, and on purpose. Instanced drawing is core WebGL2 — there is no such thing as a
        // machine that runs the rest of this renderer and cannot do it — so a failure here is
        // always a mistake in our own shader, never a capability gap. The game still runs
        // without it, which is exactly the danger: it runs, it looks right, and it draws the
        // street with fifteen thousand calls a frame instead of four hundred. Nothing about the
        // picture says so. This line is the only thing that does, and .bootcheck.js reads it.
        console.error('gl.js: INSTANCED PROGRAM FAILED TO BUILD — every prop is now its own '
          + 'draw call. This is a shader bug, not a slow machine.\n' + instFail);
      }
      // ---- the skinned program. Same fragment shader as the plain one, so a character is lit,
      // fogged, shadowed and graded by exactly the same code as the room it is standing in.
      try {
        kprog=gl.createProgram();
        gl.attachShader(kprog,compile(gl.VERTEX_SHADER,SKIN_VS));
        gl.attachShader(kprog,compile(gl.FRAGMENT_SHADER,FS));
        gl.linkProgram(kprog);
        if(!gl.getProgramParameter(kprog,gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(kprog));
        for(const k of UNIFORMS) kU[k]=gl.getUniformLocation(kprog,k);
        kU.uBones=gl.getUniformLocation(kprog,'uBones');
        gl.useProgram(kprog);
        gl.uniform1i(kU.uTex,0); gl.uniform1i(kU.uShadow,1);
        gl.uniform1i(kU.uMat,MAT_UNIT); gl.uniform1i(kU.uNrm,NRM_UNIT);
        gl.uniform1i(kU.uArm,ARM_UNIT); gl.uniform1f(kU.uArmOn,0);
        gl.uniform1f(kU.uMatCut,0);
        gl.uniform1f(kU.uMatMean,0.22);
        gl.useProgram(prog);
        skinOK=true;
      } catch(e) {
        skinFail=String(e.message||e); kprog=null; skinOK=false;
        gl.useProgram(prog);
      }
      // ---- GPU-skinned instancing. The direct program above remains authoritative and usable
      // if this optional crowd path cannot build. WebGL2 guarantees vertex texture sampling, so
      // a link failure is almost certainly a shader regression and is reported as loudly as the
      // prop-instancing failure rather than silently turning a 60 Hz crowd into hundreds of draws.
      try {
        if (skinInstVertexTextures < 1)
          throw new Error('no vertex texture image units reported');
        if (skinInstMaxTexture < MAXBONES * 4)
          throw new Error('MAX_TEXTURE_SIZE ' + skinInstMaxTexture +
            ' cannot hold a ' + MAXBONES + '-bone palette row');
        kiprog=gl.createProgram();
        gl.attachShader(kiprog,compile(gl.VERTEX_SHADER,SKIN_INST_VS));
        gl.attachShader(kiprog,compile(gl.FRAGMENT_SHADER,FS_KI));
        gl.linkProgram(kiprog);
        if(!gl.getProgramParameter(kiprog,gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(kiprog));
        for(const k of UNIFORMS) kiU[k]=gl.getUniformLocation(kiprog,k);
        kiU.uBoneTex=gl.getUniformLocation(kiprog,'uBoneTex');
        gl.useProgram(kiprog);
        gl.uniform1i(kiU.uTex,0); gl.uniform1i(kiU.uShadow,1);
        gl.uniform1i(kiU.uBoneTex,BONE_UNIT);
        gl.uniform1i(kiU.uMat,MAT_UNIT); gl.uniform1i(kiU.uNrm,NRM_UNIT);
        gl.uniform1i(kiU.uArm,ARM_UNIT); gl.uniform1f(kiU.uArmOn,0);
        gl.uniform1f(kiU.uMatCut,0);
        gl.uniform1f(kiU.uMatMean,0.22);
        gl.useProgram(prog);
        skinInstOK=true;
      } catch(e) {
        skinInstFail=String(e.message||e); kiprog=null; skinInstOK=false;
        gl.useProgram(prog);
        console.error('gl.js: GPU-SKINNED INSTANCE PROGRAM FAILED TO BUILD — shared-rig crowds '
          + 'will use direct character draws.\n' + skinInstFail);
      }
      sDepth=gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D,sDepth);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,SMAP,SMAP,0,
        gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
      // LINEAR on a depth texture in comparison mode is the hardware doing a 2x2 PCF for free.
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
      sFbo=gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER,sFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,sDepth,0);
      // Depth only, no colour. Without saying so the draw buffer still points at a colour
      // attachment that does not exist, the framebuffer is incomplete, the pass writes nothing,
      // and the shader then compares against an undefined texture — which reads as everything
      // in the world being in shadow at once.
      gl.drawBuffers([gl.NONE]);
      shadowReady=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if(!shadowReady) console.warn('shadow map unavailable; falling back to no cast shadows');
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(prog);
      gl.uniform1i(U.uShadow,1);
      gl.uniform1f(U.uShadowOn,0);
      atlas=gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,atlas);
      // A single opaque pixel until a real atlas arrives, so an untextured world is unaffected
      // and a stray decal is merely a solid rectangle rather than a GL error.
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
        new Uint8Array([255,255,255,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return gl;
    },
    // Hand over the glyph sheet, once it has been drawn. Mipmapped, because a shop sign forty
    // metres down the road is a couple of pixels per character and without them it sparkles.
    setAtlas(source){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,atlas);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      applyAnisotropy(gl.TEXTURE_2D, 4);
      if(typeof WebGPUPreview!=='undefined')WebGPUPreview.captureAtlas(source);
    },
    // Register geometry from outside this file under a name `draw` can ask for. The fifteen
    // primitives below are built at init; a downloaded model is handed over here instead, on
    // first use, and from that point the two are indistinguishable to the rest of the renderer.
    // Re-registering a name is ignored rather than leaking a second VAO for it.
    mesh(name,pos,nor,uv,idx){
      if (meshes[name]) return meshes[name];
      return (meshes[name]=previewMesh(name,mesh(pos,nor,uv,idx)));
    },
    hasMesh(name){ return !!meshes[name]; },
    get skinning(){ return {
      ok: skinOK, error: skinFail, maxBones: MAXBONES,
      instanced: skinInstOK, instancedError: skinInstFail,
      maxTextureSize: skinInstMaxTexture, vertexTextureUnits: skinInstVertexTextures,
      instancedStats: {
        frame: { ...skinInstFrameStats }, total: { ...skinInstTotalStats }
      }
    }; },
    // Renderer-neutral residency seam for authored characters. WebGL owns the authoritative
    // handles above; every call here is contained so a missing/lost optional preview can never
    // change its upload, draw or disposal result.
    wantSkinBundles(entries){
      if(typeof WebGPUPreview==='undefined'||!WebGPUPreview.requested||
          typeof WebGPUPreview.wantSkinBundles!=='function')return 0;
      try{return WebGPUPreview.wantSkinBundles(entries);}catch(_){return 0;}
    },
    captureSkinBundle(owner,lod,bundle){
      if(typeof WebGPUPreview==='undefined'||!WebGPUPreview.requested||
          typeof WebGPUPreview.captureSkinBundle!=='function')return false;
      try{return WebGPUPreview.captureSkinBundle(owner,lod,bundle);}catch(_){
        if(typeof WebGPUPreview.invalidateSkinFrame==='function')
          WebGPUPreview.invalidateSkinFrame('skin-bundle-forward');
        return false;
      }
    },
    releaseSkinBundle(owner){
      if(typeof WebGPUPreview==='undefined'||typeof WebGPUPreview.releaseSkinBundle!=='function')
        return false;
      try{return WebGPUPreview.releaseSkinBundle(owner);}catch(_){return false;}
    },
    skinBundleState(owner,lod){
      if(typeof WebGPUPreview==='undefined'||typeof WebGPUPreview.skinBundleState!=='function')
        return'disabled';
      try{return WebGPUPreview.skinBundleState(owner,lod);}catch(_){return'disabled';}
    },
    skinBundleReady(owner,lod){
      if(typeof WebGPUPreview==='undefined'||typeof WebGPUPreview.skinBundleReady!=='function')
        return false;
      try{return WebGPUPreview.skinBundleReady(owner,lod);}catch(_){return false;}
    },
    // Skinned geometry: the usual three attributes plus a joint index set and a weight set.
    skinMesh(name,pos,nor,uv,joint,weight,idx,previewOpt){
      if (meshes[name]) return meshes[name];
      const vao=gl.createVertexArray();
      gl.bindVertexArray(vao);
      const keep={};
      const buf=(data,loc,n,key)=>{
        const b=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,b);
        gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),
          gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0);
        keep[key]=b;
      };
      buf(pos,0,3,'pos'); buf(nor,1,3,'nor'); buf(uv,2,2,'uv');
      buf(joint,3,4,'joint'); buf(weight,4,4,'weight');
      let type=gl.UNSIGNED_SHORT,data;
      if (idx instanceof Uint32Array) {
        let max=0; for(let i=0;i<idx.length;i++) if(idx[i]>max) max=idx[i];
        if (max>65535){ type=gl.UNSIGNED_INT; data=idx; } else data=new Uint16Array(idx);
      } else data=idx instanceof Uint16Array?idx:new Uint16Array(idx);
      const ib=gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data,gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const out={ vao, count: idx.length, type, skinned:true,
        bPos:keep.pos, bNor:keep.nor, bUv:keep.uv, bJoint:keep.joint,
        bWeight:keep.weight, ib,
        bytes:(pos.byteLength || pos.length*4) + (nor.byteLength || nor.length*4) +
              (uv.byteLength || uv.length*4) + (joint.byteLength || joint.length*4) +
              (weight.byteLength || weight.length*4) + data.byteLength };
      meshes[name]=out;
      // Mirror only the completed WebGL ownership unit. The opt-in path is contained so a rejected
      // budget or a failed WebGPU device can never turn successful authoritative registration into
      // a loader failure.
      if((!previewOpt||previewOpt.preview!=='bundle')&&
          typeof WebGPUPreview!=='undefined'&&WebGPUPreview.requested){
        try{WebGPUPreview.captureSkinMesh(name,pos,nor,uv,joint,weight,data);}catch(_){}
      }
      return out;
    },
    // Imported character meshes are streamable resources, unlike the renderer's permanent
    // primitive library. A VAO does not own the buffers it points at, so every one of the six
    // handles retained by skinMesh has to be deleted explicitly. The registry entry is removed
    // even after a context loss; the browser has already discarded the GPU objects in that case
    // and keeping their JavaScript wrappers would only make the accounting lie.
    deleteMesh(name){
      const m=meshes[name];
      if(!m) return false;
      if(contextAlive()){
        if(m.kivao) gl.deleteVertexArray(m.kivao);
        if(m.ivao) gl.deleteVertexArray(m.ivao);
        if(m.vao) gl.deleteVertexArray(m.vao);
        const seen=new Set();
        for(const b of [m.bPos,m.bNor,m.bUv,m.bJoint,m.bWeight,m.ib])
          if(b&&!seen.has(b)){ seen.add(b); gl.deleteBuffer(b); }
      }
      delete meshes[name];
      if(typeof WebGPUPreview!=='undefined'){
        try{WebGPUPreview.releaseMesh(name);}catch(_){}
      }
      return true;
    },
    deleteTexture(texture){
      if(!texture) return false;
      // A glTF surface may be two WebGL textures presented as one handle: the visible albedo or
      // normal map, plus the packed AO/roughness/metalness map associated with it by texture().
      // The companion is deliberately private, so deleting the public carrier must delete the
      // complete ownership unit. Previously it removed only `texture`; the ARM handle remained in
      // both the driver and textureResources forever, even though no caller could reach it again.
      const owned=ownedSurfaceTextures(texture);
      const known=owned.some(t=>textureResources.has(t) || surfaceInfo.has(t) ||
        boundMat===t || boundArm===t);
      if(!known) return false;
      // Snapshot the id, then make the generation unresolvable before either backend destroys
      // storage. releaseTexture deliberately accepts the now-retired id; the object fallback is
      // solely for the pre-existing authored-skin seam, which is not part of this migration.
      const resourceId=renderResourceId(texture);
      retireRenderTexture(texture);
      if(typeof WebGPUPreview!=='undefined'&&typeof WebGPUPreview.releaseTexture==='function'){
        try{WebGPUPreview.releaseTexture(resourceId||texture);}catch(_){}
      }
      if(contextAlive()){
        if(owned.includes(boundMat)){
          gl.activeTexture(gl.TEXTURE0+MAT_UNIT); gl.bindTexture(gl.TEXTURE_2D,null);
          gl.activeTexture(gl.TEXTURE0);
        }
        if(owned.includes(boundArm)){
          gl.activeTexture(gl.TEXTURE0+ARM_UNIT); gl.bindTexture(gl.TEXTURE_2D,null);
          gl.activeTexture(gl.TEXTURE0);
        }
        for(const t of owned) gl.deleteTexture(t);
      }
      if(owned.includes(boundMat)) boundMat=null;
      if(owned.includes(boundArm)) boundArm=null;
      for(const t of owned){
        surfaceInfo.delete(t); textureResources.delete(t); texIds.delete(t);
      }
      return true;
    },
    meshBytes(name){ const m=meshes[name]; return m ? (m.bytes || 0) : 0; },
    textureBytes(texture){
      return texture ? ownedSurfaceTextures(texture)
        .reduce((bytes,t)=>bytes+(textureResources.get(t)||0),0) : 0;
    },
    get resourceStats(){
      const all=Object.values(meshes), textures=[...textureResources.values()];
      return {
        meshes:all.length, skinnedMeshes:all.filter(m=>m.skinned).length,
        skinnedInstanceVaos:all.filter(m=>m.kivao).length,
        meshBytes:all.reduce((n,m)=>n+(m.bytes||0),0),
        textures:textures.length, textureBytes:textures.reduce((n,b)=>n+b,0),
        residentInstanceBuffers:residentInstBuffers,residentInstanceBytes:residentInstBytes,
      };
    },
    // One character. `bones` is a flat Float32Array of 16 floats per joint, already the full
    // skinning matrix (world joint transform times inverse bind), which is the caller's job
    // because that is where the pose lives. The three-part API lets Rig draw every material in
    // one setup; drawSkinned remains as the compatible one-part convenience path.
    beginSkinned(model, bones, previewMeta){ return skinBegin(model, bones, previewMeta); },
    drawSkinnedPart(name, color, opt){ return skinPart(name, color, opt); },
    endSkinned(){ skinEnd(); },
    drawSkinned(name,model,color,bones,opt={}){
      if (!skinBegin(model, bones)) return false;
      let drew = false;
      try { drew = skinPart(name, color, opt); }
      finally { skinEnd(); }
      return drew;
    },
    // One exact rig/LOD, many poses and placements. `parts` is an array of
    // `{mesh,color,opt}` records. Returns the number of complete people submitted, or zero so the
    // caller can use drawSkinned without guessing whether a partial group reached the GPU.
    drawSkinnedMany(parts,models,bones,boneCount,count,previewMeta){
      return skinMany(parts,models,bones,boneCount,count,previewMeta);
    },
    // Whether the instanced programs built, and why not if they did not. Read by the harnesses
    // so a driver that silently falls back is visible in a report rather than only in a frame
    // time nobody is looking at.
    get instancing(){ return { ok: instOK, error: instFail }; },
    // Bracket anything drawn per-frame from many similar pieces — the figures, above all — and
    // it comes out as one call per distinct material instead of one per piece. A no-op when the
    // instanced programs did not build, so the same code path works on a driver without them.
    beginCollect(){
      if (!instOK) return;
      collecting = true;
      for (const b of COL.values()) b.n = 0;   // buffers are kept and refilled, not reallocated
    },
    endCollect(){
      if (!collecting) return 0;
      collecting = false;
      let calls = 0, items = 0;
      const opened = batchBegin();
      try {
        for (const b of COL.values()) {
          if (!b.n) continue;
          this.drawBatch(b.mesh, b.data, b.n, b.opt);
          calls++; items += b.n;
        }
      } finally { if (opened) batchEnd(); }
      collected = { calls, items };
      return calls;
    },
    get collectStats(){ return collected; },
    // Keep the instanced shader bound across a scene's prebuilt batch run. Calls outside an
    // explicit bracket retain the old self-contained behaviour.
    beginBatches(){ return batchBegin(); },
    endBatches(){ batchEnd(); },
    // One batch of identical-material props in one call. `data` holds `count` instances of
    // 26 floats (mat4, colour, gloss/alpha/glow, then the glyph cell) and is the caller's, refilled
    // each frame with whatever survived culling.
    //
    // Main pass only, deliberately. The shadow pass still draws prop by prop: it is a second
    // set of batches keyed on a different visibility test, and doing one half at a time means
    // any mistake here shows up as wrong shading rather than wrong shading *and* wrong shadows.
    //
    // Returns how many it drew, so the caller can tell batched from unbatched work apart.
    drawBatch(name,data,count,opt={},resident=null){
      if(!instOK||!count) return 0;
      const m=meshes[name]; if(!m) return 0;
      // A retained owner is supplied only for a complete static opaque Mall batch. Its packed
      // bytes remain in one batch-owned VBO until the camera/cutaway/atlas revision changes. Every
      // moving or partially dynamic batch keeps the shared upload path below.
      const retained=pass!==1&&resident;
      const vao=retained?residentInst(name,data,count,resident):instVAO(name);
      if(!vao)return 0;
      if(!retained)instReserve(count);
      const mode=opt.mode||0;
      // The depth pass wants the silhouette and nothing else, so it needs only the corner
      // radius — the same value the visible pass uses, because a shadow cast by a different
      // shape than the one on screen is worse than no shadow. The instance stride is the same
      // 26 floats either way; the colour, the three scalars and the glyph cell are not read.
      if(pass===1){
        if (!batchOpen) gl.useProgram(siprog);
        gl.uniform1f(siU.uRound,name!=='softBox'?0
          :opt.round===undefined?(mode===7?.055:.022):opt.round);
        gl.bindBuffer(gl.ARRAY_BUFFER,instBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,data,0,count*INST_FLOATS);
        gl.bindVertexArray(vao);
        gl.drawElementsInstanced(gl.TRIANGLES,m.count,m.type,0,count);
        if (!batchOpen) {
          gl.bindVertexArray(null);
          gl.useProgram(sprog);
        }
        return count;
      }
      if (!batchOpen) gl.useProgram(iprog);
      gl.uniform1i(iU.uMode,mode);
      gl.uniform1f(iU.uRound,name!=='softBox'?0
        :opt.round===undefined?(mode===7?.055:.022):opt.round);
      const bevelMode=mode===0||mode===3||mode===4||mode===6||mode===7;
      gl.uniform1f(iU.uBevel,name==='box'&&bevelMode?(opt.bevel===undefined?.013:opt.bevel):0);
      const iAlbedo=asTex(opt.tex), iSurf=asTex(opt.mat), iNrm=asTex(opt.nrm);
      if(iAlbedo||iSurf){
        const want = iAlbedo || iSurf;
        if (boundMat !== want) {
          gl.activeTexture(gl.TEXTURE0+MAT_UNIT);
          gl.bindTexture(gl.TEXTURE_2D,want);
          boundMat=want;                    // keep the per-draw cache truthful
        }
        gl.uniform1f(iU.uMatOn,iAlbedo?1:2);
        gl.uniform1f(iU.uMatMean,iSurf?textureMean(iSurf):0.22);
        if(!iAlbedo){
          gl.uniform1f(iU.uMatScale,opt.matScale||1);
          gl.uniform1f(iU.uMatAmt,opt.matAmt===undefined?.7:opt.matAmt);
        }
        if(iNrm){
          gl.activeTexture(gl.TEXTURE0+NRM_UNIT);
          gl.bindTexture(gl.TEXTURE_2D,iNrm);
          gl.uniform1f(iU.uNrmOn,iAlbedo?1:2);
          gl.uniform1f(iU.uNrmAmt,opt.nrmAmt===undefined?1:opt.nrmAmt);
        } else gl.uniform1f(iU.uNrmOn,0);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.uniform1f(iU.uMatOn,0); gl.uniform1f(iU.uNrmOn,0);
        gl.uniform1f(iU.uMatMean,0.22);
      }
      bindArm(iU,iNrm||iAlbedo);
      if(!retained) {
        gl.bindBuffer(gl.ARRAY_BUFFER,instBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,data,0,count*INST_FLOATS);
      }
      gl.bindVertexArray(vao);
      gl.drawElementsInstanced(gl.TRIANGLES,m.count,m.type,0,count);
      if (!batchOpen) {
        gl.bindVertexArray(null);
        gl.useProgram(prog);                // everything after this expects the plain program
      }
      // Packet ownership is intentionally recorded only after the authoritative GL submission.
      // A malformed experimental command can abort its packet, never the frame already on screen.
      if(framePacketId)recordFramePacketBatch(name,data,count,opt);
      // Opt-in only: mirror the exact post-cull instance payload into the WebGPU comparison
      // renderer. WebGL has already drawn the authoritative frame, so an unavailable adapter,
      // an unfinished async device, or a rejected material is simply a no-op here.
      if (typeof WebGPUPreview !== 'undefined'&&WebGPUPreview.requested){
        const previewOpt=previewDrawOptions(opt);
        if(previewOpt)WebGPUPreview.captureBatch(name,data,count,previewOpt);
      }
      return count;
    },
    // A surface texture — a model's albedo map, or a tiling material. Mipmapped, because these
    // are seen at every distance from a hand's width to the end of the street, and repeating
    // by default, because a tiling material is the main reason this exists.
    texture(source,o={}){
      const made=[];
      const upload=(src,unit)=>{
        const t=gl.createTexture();
        made.push([t,unit]);
        gl.activeTexture(gl.TEXTURE0+unit);
        gl.bindTexture(gl.TEXTURE_2D,t);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        const w=o.clamp?gl.CLAMP_TO_EDGE:gl.REPEAT;
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
        applyAnisotropy(gl.TEXTURE_2D, o.anisotropy);
        textureResources.set(t,mipBytes(src));
        return t;
      };
      try {
        const t=upload(source,MAT_UNIT), info={};
        if(o.mean) info.mean=o.mean;
        if(o.arm){
          info.arm=upload(o.arm,ARM_UNIT);
          info.armAO=!!o.armAO;
          info.roughness=o.roughness===undefined?1:o.roughness;
          info.metallic=o.metallic===undefined?1:o.metallic;
        }
        if(info.mean||info.arm) surfaceInfo.set(t,info);
        gl.activeTexture(gl.TEXTURE0);
        boundMat=t;                          // this unit now holds the texture just built
        // Only reviewed static-model maps and eager tiling sheets cross the comparison seam.
        // Publish after the complete WebGL carrier + private ARM transaction and its binding state
        // have succeeded. ARM never receives an id: it remains a child of this carrier generation.
        if(ordinaryPreviewKind(o.preview)&&typeof WebGPUPreview!=='undefined'&&
            WebGPUPreview.requested){
          const resourceId=claimRenderTexture(t,o.preview);
          if(resourceId){
            try{WebGPUPreview.captureTexture(resourceId,source,{clamp:!!o.clamp,kind:o.preview,
                arm:o.arm||null,armAO:!!o.armAO,roughness:o.roughness,metallic:o.metallic,
                mean:o.mean});}catch(_){}
          }
        }else if(o.preview==='skin'&&typeof WebGPUPreview!=='undefined'&&
            WebGPUPreview.requested){
          // Authored-character identity remains object-keyed until its separate owner/tier
          // migration. Do not claim it in the ordinary resource registry.
          try{WebGPUPreview.captureTexture(t,source,{clamp:!!o.clamp,kind:'skin'});}catch(_){}
        }
        return t;
      } catch(e) {
        // Uploading the optional companion can fail after the carrier already owns storage. Treat
        // the pair transactionally: neither handle is usable to the caller until both succeeded.
        // Clear the units as well as deleting the handles, or the bind caches describe textures
        // different from the ones the context actually has selected on a retry.
        for(const [t,unit] of made){
          gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,null);
          gl.deleteTexture(t); surfaceInfo.delete(t); textureResources.delete(t); texIds.delete(t);
        }
        boundMat=boundArm=null;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,atlas);
        throw e;
      }
    },
    setRoom(rx,h,rz){ room=[rx,h,rz]; },
    // The floor plane of the current deck, for the height-dependent shading. Absolute world y.
    setDeck(y){ deckY = Number.isFinite(y) ? y : 0; },
    // The scene's daylight openings. Three forms, and the five-argument one is what every caller
    // written before the registry uses — it still means "this place has one window", and it now
    // says so by clearing the registry rather than by there being nowhere else to put one.
    //
    //   R.setWindow(x, y, z, hw, hh)     one window, facing whichever wall of the current room
    //                                    it is set into — see `wallNormal`, and note this used to
    //                                    be -z unconditionally, which was wrong for any room whose
    //                                    window is not in its -z wall.
    //   R.setWindow({x,y,z,hw,hh,n,shade})        one window, declaration and all.
    //   R.setWindow([{x,y,z,hw,hh,n,shade}, …])   the whole scene's openings at once.
    //   R.addWindow(x, y, z, hw, hh, n)  one more, for a room that builds itself.
    //
    // `n` is the outward normal as [nx,ny,nz] — the direction daylight travels coming in. Omit it
    // and the window faces -z, which is where every window in the game faced when there was only
    // one of them. `shade` is that window's own curtain, 1 open.
    setWindow(x,y,z,hw,hh){
      WINDOWS.length = 0; picked = null; pickEye[0] = 1e30;
      if (Array.isArray(x)) { for (const w of x) addWin(w); return; }
      // A caller holding the whole declaration can hand it over whole and keep its own `n`.
      if (x && typeof x === 'object') { addWin(x); return; }
      winPos=[x,y,z]; winHalf=[hw,hh];
      const n = wallNormal(x, z);
      winN = n; winU = [n[2], 0, -n[0]];   // cross([0,1,0], n); the y term is always 0
    },
    addWindow(x,y,z,hw,hh,n){
      addWin((x && typeof x === 'object') ? x : { x, y, z, hw, hh, n });
    },
    clearWindows(){ WINDOWS.length = 0; picked = null; pickEye[0] = 1e30; },
    // The curtains, for the whole scene. 1 is drawn back, 0 is closed. A window registered with
    // its own `shade` multiplies with this, so one room's curtains and a building-wide blackout
    // are the same mechanism.
    setWinShade(v){ winShade = v === undefined ? 1 : Math.max(0, Math.min(1, v)); },
    // Which world we are standing in. Indoors: room shading, window-shaped sun, no haze.
    // Outdoors: open sky, unobstructed sun, and everything distant lost to smog.
    setEnv(o){
      indoor=o.indoor?1:0; winOn=o.winOn?1:0;
      // A 42 cm sampling ring is a sensible corner in a street and half a table leg in a 3.5 m
      // room. One fixed radius served both, so interiors were sampling well past the surfaces they
      // were meant to be creasing. Indoors it comes in, unless the place asks for something else.
      aoRadius = o.aoRadius !== undefined ? o.aoRadius : (o.indoor ? 0.26 : 0.42);
      // How hard that crease is pressed, which until now no place could say — only how wide it
      // was. Radius and strength are not interchangeable, and a room can need one without the
      // other: the shopping centre is 46 m by 36 with a 13.6 m ceiling and pale plaster on every
      // surface, so even at a 13 cm ring the occlusion comes back as a broad, low-frequency wash
      // rather than as corners. Multiplied over cream at 0.55 that is not a shadow, it is fog —
      // the whole food court read as though seen through smoke, and it hid a z-fighting sign
      // board for long enough that nobody found it.
      //
      // Default unchanged, so every other room in the game renders exactly as it did.
      aoAmt = o.aoAmt !== undefined ? o.aoAmt : 0.55;
      fogNear=o.fogNear||0; fogD=o.fogD||0; fogCol=o.fogCol||fogCol;
      bloomScale=o.bloom!==undefined?o.bloom:1;
      expose=o.expose===undefined?1:o.expose;
      const wb=o.whiteBalance||o.white;
      for (let i = 0; i < 3; i++) {
        const v = wb && wb.length >= 3 ? wb[i] : 1;
        whiteBal[i] = Number.isFinite(v) ? Math.max(0.5, Math.min(1.5, v)) : 1;
      }
    },
    setTime(ms){ now=ms; },
    // How wet the ground is and how much snow is lying, both 0 to 1, and what colour the leaves
    // are this month. Set once a frame by the game; every surface in the world reads them.
    setWeather(wet,snow,wind){
      weather[0]=wet||0;weather[1]=snow||0;
      weather[2]=Number.isFinite(wind)?Math.max(0,Math.min(MAX_FOLIAGE_WIND,wind)):0;
    },
    setLeaf(c){ leafTint[0]=c[0]; leafTint[1]=c[1]; leafTint[2]=c[2]; },
    setBulb(x,y,z,on){ bulb[0]=x; bulb[1]=y; bulb[2]=z; bulbOn=on===undefined?1:on; },
    // The room's local lights, replaced wholesale each time. `list` is [{x,y,z,col:[r,g,b],
    // power,radius}]. Anything past the eighth is dropped rather than silently wrapping, and
    // the caller is expected to have sorted by what matters — see game.js, which keeps the
    // nearest ones to the camera.
    setLights(list,gain=1){
      const n=Math.min(list?list.length:0,MAXLIGHTS);
      const k=Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):0;
      lightN=n;
      for(let i=0;i<n;i++){
        const L=list[i], c=L.col||[1,.86,.66], p=L.power===undefined?1:L.power;
        lightPos[i*3]=L.x; lightPos[i*3+1]=L.y; lightPos[i*3+2]=L.z;
        lightCol[i*3]=c[0]*p*k; lightCol[i*3+1]=c[1]*p*k; lightCol[i*3+2]=c[2]*p*k;
        lightRad[i]=L.radius===undefined?2.2:L.radius;
      }
    },
    // dir need not be normalised; the shader does that.
    setDaylight(dir,col,amt,sky,ground,moon,zenith,horizon){
      sun=dir; sunCol=col; sunAmt=amt; groundCol=ground;
      skyZenith=zenith||sky; skyHorizon=horizon||sky;
      // The moon is drawn in the sky with a phase and a glow, and until now contributed nothing to
      // what anything on the ground was lit by: a clear full-moon night shaded exactly as dark as an
      // overcast new-moon one. A small cool lift on the sky term, which is where a night sky's light
      // actually comes from. Scaled by phase, so it goes away when the moon does.
      const m = moon === undefined ? 0 : moon;
      if (m > 0.001) {
        moonSky[0] = sky[0] + 0.055 * m;
        moonSky[1] = sky[1] + 0.060 * m;
        moonSky[2] = sky[2] + 0.075 * m;
        skyCol = moonSky;
      } else skyCol = sky;
    },
    get sunAmount(){ return sunAmt; },
    // Resolution scale. The canvas keeps its CSS size and the browser stretches a smaller
    // buffer up to it, which costs a little sharpness and gives back fill rate roughly with the
    // square of the number — the cheapest frame there is to buy back on a slow machine.
    setRenderScale(k){ renderScale=Math.max(0.5,Math.min(1,k)); },
    setGlyphAssist(v){ glyphAssist = v > 0 ? 1 : 0; },
    // Shallow-angle surface clarity follows the quality ladder without allocating another image.
    // The extension and its hardware maximum are optional; trilinear mipmaps remain the fallback.
    setAnisotropy(v){
      const next=Number.isFinite(v)?Math.max(1,v):1;
      if(next===surfaceAniso)return;
      surfaceAniso=next;
      if(!gl||!anisoExt||maxAniso<=1)return;
      gl.activeTexture(gl.TEXTURE0+MAT_UNIT);
      for(const texture of textureResources.keys()){
        gl.bindTexture(gl.TEXTURE_2D,texture);
        applyAnisotropy(gl.TEXTURE_2D,surfaceAniso);
      }
      // The material unit no longer contains the handle described by the binding cache. ARM's
      // unit was not touched, but clearing both caches keeps the next complete material bind honest.
      gl.bindTexture(gl.TEXTURE_2D,null);
      boundMat=boundArm=null;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,atlas);
    },
    // Resize the depth map, or turn it off entirely with 0.
    setShadowSize(px){
      if (px===smapSize) return;
      smapSize=px;
      shadowReady=false;
      if (!px) {
        // Basic quality is also the low-memory tier. Leaving the previous 1280/1024/768 square
        // depth image allocated saved draw time but not a byte of GPU memory. Keep the handle and
        // attachment stable, replacing only its storage with the smallest legal depth image; a
        // later quality increase expands the same texture through the ordinary path below.
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D,sDepth);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1,1,0,
          gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
        gl.activeTexture(gl.TEXTURE0);
        return;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D,sDepth);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,px,px,0,
        gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,sFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,sDepth,0);
      gl.drawBuffers([gl.NONE]);
      shadowReady=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    },
    // The canvas's size in CSS pixels, cached — and this is a performance fix, not tidying.
    //
    // `clientWidth` is a layout-forcing read. The game writes to the DOM every frame: every
    // discovery label in the room gets a left, a top and an opacity, which in the shopping centre
    // is a couple of hundred elements. Those writes invalidate layout; the very next read of
    // `clientWidth` — here, and in the label loop, and in `cursorRay` under the per-frame pick —
    // makes the browser stop and recompute the whole document synchronously before it can answer.
    // Four such reads a frame, each after a few hundred writes, and the frame is paying for four
    // full reflows of a document with nine hundred absolutely-positioned elements in it.
    //
    // A ResizeObserver answers the same question with no reflow at all: it is delivered after
    // layout has happened anyway, so reading it is free. `devicePixelRatio` is not covered by it
    // — dragging the window to a different display changes that without changing the CSS size —
    // so that is still read every frame, which is fine because it does not touch layout.
    cssSize(canvas){
      if (!cssObs) {
        cssW = canvas.clientWidth; cssH = canvas.clientHeight;
        if (typeof ResizeObserver !== 'undefined') {
          cssObs = new ResizeObserver(es => {
            const r = es[es.length - 1] && es[es.length - 1].contentRect;
            if (r) { cssW = r.width; cssH = r.height; }
          });
          cssObs.observe(canvas);
        } else cssObs = true;      // no observer here; fall back to reading every frame
      } else if (cssObs === true) { cssW = canvas.clientWidth; cssH = canvas.clientHeight; }
      cssSizeOut[0] = cssW; cssSizeOut[1] = cssH;
      return cssSizeOut;
    },
    get cssW(){ return cssW; },
    get cssH(){ return cssH; },
    resize(canvas){
      const dpr=Math.min(devicePixelRatio||1,2)*renderScale;
      this.cssSize(canvas);
      // A hidden/minimised canvas can report zero CSS extent for a ResizeObserver sample. WebGL
      // does not have a useful zero-sized render target: attempting to rebuild the post chain at
      // 0x0 marks it failed for the rest of the session, and a zero aspect makes M.persp infinite.
      let w=Math.max(1,(cssW*dpr)|0),h=Math.max(1,(cssH*dpr)|0);
      // The post graph owns several full-size multisample/resolve targets. Bound the complete
      // allocation by both the driver's actual limits and a device-aware pixel budget so a large
      // Retina window cannot turn a quality setting into a context-loss event.
      const budget=renderPixelBudget;
      const fit=Math.min(1,maxTargetSize/w,maxTargetSize/h,Math.sqrt(budget/(w*h)));
      if(fit<1){w=Math.max(1,(w*fit)|0);h=Math.max(1,(h*fit)|0);}
      // Settled before it is acted on. This is called every frame, and a new size tears down and
      // rebuilds six render targets at three sizes — so dragging a window edge rebuilt the entire
      // post chain sixty times a second for as long as the drag lasted, and the frames in between
      // are the ones that come out wrong. The picture stretches for a sixth of a second instead,
      // which nobody has ever noticed, and the rebuild happens once when the hand stops moving.
      if (canvas.width !== w || canvas.height !== h) {
        const t = now;
        if (pendW !== w || pendH !== h) { pendW = w; pendH = h; pendAt = t; }
        // First sizing has to be immediate or there is nothing to draw into at all.
        if (!canvasW || t - pendAt > 150) {
          canvas.width = w; canvas.height = h;
          pendW = pendH = 0;
        }
      } else pendW = pendH = 0;
      canvasW=canvas.width; canvasH=canvas.height;
      gl.viewport(0,0,canvas.width,canvas.height);
      // Not while a canvas size is still settling. A quality tier moving up turns the chain back
      // on and flips AO in the same call, both of which ask for a rebuild immediately — but the
      // canvas size that tier wants is pending for another 150 ms, so that rebuild would be made
      // at a size already known to be wrong and thrown away when the real one lands. Every upward
      // tier change was building the whole graph twice. The cost of waiting is that the frames in
      // between draw without bloom, in the middle of a quality change the player is watching
      // happen anyway.
      if (postWant && !postFail && !pendW) postSize(canvas.width, canvas.height);
      return Math.max(1,cssW)/Math.max(1,cssH);
    },
    // Resolve the scene, bleed the bright parts of it into the air, and put the result on screen.
    // Called once at the end of a frame, after everything else has been drawn. Returns whether it
    // did anything, which is how a caller can tell the chain is off rather than broken.
    present(){
      // Even with the post chain disabled, the ordinary colour stream has ended and its diagnostic
      // ownership must be consumed. Otherwise Basic quality would leak one pending packet a frame.
      finishFramePacket();
      if (!postOn) return false;
      // Down from multisampled to textures the shader can read: the picture, and the map of what
      // in it is a light. One blit each, and each one has to say which attachment it is reading.
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, reFbo);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.blitFramebuffer(0,0,pW,pH, 0,0,pW,pH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, liFbo);
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.blitFramebuffer(0,0,pW,pH, 0,0,pW,pH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      const withAo = aoWant && geFbo && aFbo[0];
      if (withAo) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, geFbo);
        gl.readBuffer(gl.COLOR_ATTACHMENT2);
        gl.blitFramebuffer(0,0,pW,pH, 0,0,pW,pH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // None of the scene's state belongs in a full-screen pass: depth would reject it, culling is
      // meaningless for one triangle, and blending would mix it with whatever it is replacing.
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      gl.useProgram(ppProg);
      gl.bindVertexArray(ppVao);
      gl.uniform1i(ppU.uSrc, 2); gl.uniform1i(ppU.uBloom, 3); gl.uniform1i(ppU.uAoMap, 4);
      gl.uniform1f(ppU.uAmt, bloomAmt * bloomScale); gl.uniform1f(ppU.uVig, vigAmt);
      gl.uniform1f(ppU.uCut, bloomCut);
      // Indoors the picture contributes next to nothing to the glow: see the extract pass. Lamps
      // are unaffected either way — their glow arrives through the light mask, not through this.
      gl.uniform1f(ppU.uHaze, indoor ? 0.10 : 1.0);
      gl.uniform1f(ppU.uAoAmt, aoAmt);
      gl.uniform1f(ppU.uAoOn, withAo ? 1 : 0);
      // The ring's radius in metres, turned into a screen-space one. Divided by the pixel's own
      // distance in the shader, which is what keeps a corner the same corner at any range.
      gl.uniform2f(ppU.uAoProj, aoRadius * 0.5 * pH / pW, aoRadius * 0.5);

      // ---- how boxed in everything is, at half size, then blurred so the sampling grain goes
      if (withAo) {
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, geTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aFbo[0]);
        gl.viewport(0,0,bW,bH);
        ppDraw(3,0,0,bW,bH);
        // The geometry stays bound on unit 3 through the blur: pass 4 needs the depth to know
        // where the silhouettes are, and unit 2 is carrying the occlusion itself. The bloom
        // extract below rebinds unit 3 to the picture, so nothing leaks out of here.
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, geTex);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, aTex[0]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aFbo[1]);
        ppDraw(4,1,0,bW,bH);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, aTex[1]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aFbo[0]);
        ppDraw(4,0,1,bW,bH);
      }
      // ---- what is bright enough to bleed, at half size: the light mask, and a little of the
      // picture where it is genuinely blown out
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, liTex);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, reTex);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[0]);
      gl.viewport(0,0,bW,bH);
      ppDraw(0,0,0,bW,bH);
      // ---- and blurred, twice each way. The second pair steps twice as far, which is a much
      // wider glow than five more taps would buy at the same price.
      for (const step of [1, 2]) {
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bTex[0]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[1]);
        ppDraw(1, step, 0, bW, bH);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bTex[1]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[0]);
        ppDraw(1, 0, step, bW, bH);
      }
      // ---- back together, on screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0,0,canvasW,canvasH);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, reTex);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, bTex[0]);
      if (withAo) { gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, aTex[0]); }
      ppDraw(2,0,0,canvasW,canvasH);
      // Put back everything the scene expects to find, including the texture unit the shadow map
      // lives on: leaving TEXTURE3 selected made the next frame bind the shadow map over the top
      // of the bloom buffer, which looks like the shadows failing rather than the post pass.
      // AO shares unit 4 with ARM materials. It must be unbound before the next frame renders back
      // into aTex[0]; sampling a texture while it is also the draw attachment is a WebGL feedback
      // loop. That rejected both AO writes with INVALID_OPERATION and left contact darkening frozen
      // on its first frame even though the colour pass continued normally.
      if (withAo) { gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, null); }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);      // the invariant the glyphs rely on
      boundArm = null;                          // post used unit 4 for AO; force next ARM bind
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enable(gl.BLEND);
      gl.useProgram(prog);
      return true;
    },
    // On or off, and how strong. The ladder turns it off on the two tiers that exist for machines
    // already short of frames.
    setPost(on, amount, vignette){
      postWant = on ? 1 : 0;
      if (amount !== undefined) bloomAmt = amount;
      if (vignette !== undefined) vigAmt = vignette;
      // R.resize runs once every frame and builds against the final quality tuple. Deferring the
      // enabled case until there avoids allocating a bloom-only target and immediately replacing
      // it when setAO runs a few lines later. The disabled case is immediate because its purpose is
      // to return the high-tier render-target memory now, not after another frame.
      if (!postWant) dropPostTargets();
    },
    // Contact darkening. Its own control because it costs its own buffer: a third full-size
    // multisampled attachment, which is the most expensive thing the post chain asks for.
    setAO(on, amount, radius){
      const was = aoWant;
      aoWant = on ? 1 : 0;
      if (amount !== undefined) aoAmt = amount;
      if (radius !== undefined) aoRadius = radius;
      // The attachment is allocated or thrown away, so the next resize must rebuild. Do not build
      // here: the quality callback sets post and AO consecutively, and one final allocation is both
      // cheaper and less failure-prone than two full target graphs back-to-back.
      if (was !== aoWant) pW = 0;
    },
    get ao(){ return { on: !!(aoWant && geFbo), amount: aoAmt, radius: aoRadius }; },
    get post(){ return { on: !!postOn, want: !!postWant, samples: msaa,
                         size: [pW, pH], bloom: bloomAmt, vignette: vigAmt,
                         error: postFail }; },
    begin(p,v,eye,sky){
      proj=p;view=v;M.mul(proj,view,vp);
      // Into the offscreen target if the chain is running, and straight at the screen if it is
      // not. `present` is what puts it on screen in the first case, and a no-op in the second, so
      // a caller that has never heard of any of this still draws.
      postOn = postWant && !postFail && msFbo ? 1 : 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, postOn ? msFbo : null);
      gl.viewport(0,0,canvasW,canvasH);
      gl.clearColor(sky[0],sky[1],sky[2],1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      // The distance attachment gets its own clear, and it is not tidying — it is the ghost bug.
      //
      // Two things conspire. `gsolid` (see the scene shader) is the *alpha* fragGeom writes, and
      // blending is on for the whole MRT: a fragment with gsolid 0 — every decal, every
      // transparent surface, every textured decal — therefore leaves whatever was already in this
      // buffer completely untouched. And the clear above paints the sky colour into it, which is
      // a real, near reading in metres rather than "nothing is here", so the AO pass's
      // `d0 >= GEOM_FAR * 0.995` sky test never fires either.
      //
      // The result the owner saw: spin the camera in the 书房 and the bookshelf and the bedroom
      // furniture smear across the plaster under the certificates. Those pixels are covered only
      // by decal writes, so they kept the *previous* frame's distances, taken from the previous
      // camera angle, and the AO blur painted that stale geometry onto the current wall.
      //
      // [1,1,0,0] is the two bytes of GEOM_FAR — "nothing here, as far away as this buffer can
      // say" — with alpha 0 so a decal that lands on it still blends against far rather than
      // against a surface. On a tile-based GPU this folds into the tile load action; measured
      // cost in the flat is below the noise floor of .fpscheck.js.
      if (postOn && msGeo) gl.clearBufferfv(gl.COLOR, 2, [1, 1, 0, 0]);
      // The same frame state on both programs. Sharing one fragment shader means they read the
      // same forty uniforms, and a value set on one and forgotten on the other is a batch lit
      // by yesterday's sun — so this is written once and applied to each rather than typed out
      // twice and left to drift.
      lastEye = eye;
      batchOpen = false;
      skinFrameReady = false;
      skinInstFrameReady = false;
      skinInstFrameStats = { groups:0, calls:0, instances:0 };
      skinCharacterOpen = false;
      webgpuDirectSkin = null;
      frameU(prog,U,eye);
      if (instOK) frameU(iprog,iU,eye);
      gl.useProgram(prog);
      previewDepthWrite=true;previewAdditive=false;previewCullNone=false;
      if(typeof WebGPUPreview!=='undefined'&&WebGPUPreview.packetRecordRequested)
        beginFramePacket(sky,eye);
      // The opt-in WebGPU comparison consumes the renderer's already-resolved environment here,
      // after room/light selection and camera setup. Keeping this beside frameU prevents a second
      // approximate lighting state from drifting in game.js, while ordinary WebGL sessions pay
      // only the guarded branch.
      if (typeof WebGPUPreview !== 'undefined' && WebGPUPreview.requested)
        WebGPUPreview.beginFrame(vp,sky,{ dir:sun, color:sunCol, amount:sunAmt,
          sky:skyCol, ground:groundCol, skyA:skyZenith, skyB:skyHorizon, eye, indoor, bulb, bulbOn,
          lightPos, lightCol, lightRad, lightCount:lightN,
          expose, white:whiteBal, fogNear, fogD, fogColor:fogCol, glyphAssist, deckY,
          time:now, weather, leaf:leafTint });
    },
    // Render the sun's view of the world into the depth map. The caller paints the same scene
    // it is about to paint for real; `R.shadowPass` is true while that is happening so props
    // that cannot sensibly cast are skipped.
    //
    // The light box is centred on the player and snapped to whole texels. Without the snap the
    // map slides by a fraction of a texel every frame and every shadow edge in the street
    // crawls, which is far more noticeable than the shadows themselves.
    beginShadow(cx, cz, half, top, cast){
      if (!shadowReady) { this.noShadow(); return false; }
      castMax = cast === undefined ? 6.5 : cast;
      const s = sun, l = Math.hypot(s[0], s[1], s[2]) || 1;
      let dx = s[0] / l, dy = s[1] / l, dz = s[2] / l;
      // A sun directly overhead leaves lookAt with no horizontal reference and it comes out NaN.
      if (Math.hypot(dx, dz) < 0.08) { dx += 0.08; dz -= 0.05; }
      const texel = half * 2 / smapSize;
      const px = Math.round(cx / texel) * texel, pz = Math.round(cz / texel) * texel;
      const reach = half * 2.6 + (top || 20);
      const view = M.lookAt([px + dx * reach, dy * reach, pz + dz * reach], [px, 0, pz]);
      M.mul(M.ortho(-half, half, -half, half, 0.5, reach * 2.2), view, lightVP);
      shadowPx = [texel, 1 / smapSize];
      // Handed back to the caller so it can cull the depth pass against the light instead of
      // the camera: centre x, centre z, the caster height cap, and the half extent.
      box[0] = px; box[1] = pz; box[2] = castMax; box[3] = half;
      shadowOn = 1; pass = 1;
      gl.useProgram(sprog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sFbo);
      gl.viewport(0, 0, smapSize, smapSize);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(sU.uProj, false, lightVP);
      gl.uniformMatrix4fv(sU.uView, false, M.ident());
      // The instanced depth program needs the same light view. Set here rather than per batch:
      // it changes once a frame, and a batch drawn against a stale one casts its shadow where
      // the sun was last frame.
      if (instOK) {
        gl.useProgram(siprog);
        gl.uniformMatrix4fv(siU.uProj, false, lightVP);
        gl.uniformMatrix4fv(siU.uView, false, M.ident());
        gl.useProgram(sprog);
      }
      framePacketOmit('shadow-pass-out-of-band');
      return true;
    },
    endShadow(canvas){
      pass = 0;
      // Back to wherever the scene is being drawn — which is the offscreen target when the post
      // chain is running, and the screen when it is not.
      gl.bindFramebuffer(gl.FRAMEBUFFER, postOn ? msFbo : null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      // The light matrix is only known once the pass has been set up, and the frame's other
      // uniforms went up before that, so these three are (re)sent here rather than in begin().
      // Sending them from begin() alone left the first frame sampling an identity matrix.
      gl.uniformMatrix4fv(U.uLightVP, false, lightVP);
      gl.uniform1f(U.uShadowOn, shadowOn);
      gl.uniform2fv(U.uShadowPx, shadowPx);
    },
    // Indoors there is nothing to cast into: the window beam already does that job.
    noShadow(){ shadowOn = 0; gl.uniform1f(U.uShadowOn, 0); },
    get shadowPass(){ return pass === 1; },
    get lightBox(){ return pass === 1 ? box : null; },
    // Whether the last frame actually had a sun casting into a depth map, which is what decides
    // if the painted-on contact shadows are still needed.
    get shadowsCast(){ return shadowOn === 1; },
    // For the screenshot harness: the light's matrix, so a known world point can be projected
    // by hand and checked against what the shader thinks it is looking up.
    debugLight(){
      return { lightVP: Array.from(lightVP), shadowPx, shadowOn, shadowReady,
               sun: Array.from(sun) };
    },
    get vp(){ return vp; },
    // What fraction of its radius the `limb` mesh has left at its far end. A joint ball placed
    // where one limb feeds the next should be sized `segmentWidth * R.limbTaper` across, and no
    // wider: a joint wider than the segment feeding it is an action-figure peg, and it is the
    // one shape no amount of work on the segments themselves can hide.
    limbTaper: LIMB_TAPER,
    // The ring table a procedural mesh was built from, so a garment can be placed against the
    // body's real surface instead of against a transcription of it. Rings are `[y, rx, rz, e]` in
    // mesh-local units: y from -0.5 to 0.5, rx and rz the half-extents at that height, and e the
    // egg term — the front of the section reaches rz*(1+e) and the back rz*(1-e).
    //
    // Returns a copy. Three wardrobe files were each keeping their own transcription of this, and
    // when the profile was last retuned one of them had every panel placement silently invalidated
    // until it was re-synced by hand. Handing out the live array would trade that for something
    // worse: one file's edit reshaping the whole cast.
    profile(name){ return name === 'body' ? BODY_PROFILE.map(r => r.slice()) : null; },
    draw(name,model,color,opt={}){
      const m=meshes[name]; if(!m) return;
      sc[0]=Math.hypot(model[0],model[1],model[2]);
      sc[1]=Math.hypot(model[4],model[5],model[6]);
      sc[2]=Math.hypot(model[8],model[9],model[10]);
      const mode=opt.mode||0;
      if (pass===1) {
        // Nothing that is not a solid object casts a shadow: lit panels and glowing signs
        // (mode 1), the fake contact shadows and light pools (2, 5, 8), the sky (12), anything
        // see-through, and the characters written on signs — a couplet casting its own text
        // onto the gate behind it would be absurd.
        if (mode===1||mode===2||mode===5||mode===8||mode===12||opt.rect||
            (opt.alpha!==undefined&&opt.alpha<0.92)) return;
        // Only street-level things cast. This is a deliberate choice, not a shortcut: the sun
        // in this world sits on the same side as the six-storey block, which at forty degrees
        // of elevation throws a twenty-metre shadow straight across the hutong and puts the
        // entire alley in shade all day. Correct, and the wrong picture. Capping the caster
        // height keeps the sunlight on the paving and still gets the shadows that read —
        // under the trees and awnings, off the courtyard roofs, beside the cars and the people.
        if (model[13] > castMax) return;
        // Collected only after every one of the depth pass's own exclusions above has had its
        // say, so a batched figure casts exactly the shadow an unbatched one would.
        if (collecting) return collectPush(name, model, color, opt);
        gl.bindVertexArray(m.vao);
        gl.uniformMatrix4fv(sU.uModel,false,model);
        gl.uniform3fv(sU.uScale,sc);
        gl.uniform1f(sU.uRound,name!=='softBox'?0
          :opt.round===undefined?(mode===7?.055:.022):opt.round);
        gl.drawElements(gl.TRIANGLES,m.count,m.type,0);
        return;
      }
      // A glyph carries its own atlas cell, which is a uniform, so it would be a batch of one.
      // Everything else goes in the bucket.
      if (collecting && !opt.rect) return collectPush(name, model, color, opt);
      gl.bindVertexArray(m.vao); gl.uniformMatrix4fv(U.uModel,false,model);
      gl.uniform3fv(U.uColor,color); gl.uniform3fv(U.uScale,sc); gl.uniform1i(U.uMode,mode);
      gl.uniform1f(U.uAlpha,opt.alpha===undefined?1:opt.alpha);
      gl.uniform1f(U.uGlow,opt.glow||0); gl.uniform1f(U.uGloss,opt.gloss===undefined?.12:opt.gloss);
      const bevelMode=mode===0||mode===3||mode===4||mode===6||mode===7;
      gl.uniform1f(U.uBevel,name==='box'&&bevelMode?(opt.bevel===undefined?.013:opt.bevel):0);
      // Corner radius in metres. Woven fabric defaults softer: cushions, mattresses and
      // bedding are the one family that should still look inflated.
      gl.uniform1f(U.uRound,name!=='softBox'?0
        :opt.round===undefined?(mode===7?.055:.022):opt.round);
      // `rect` is the cell of the atlas to use: [u, v, du, dv].
      if (opt.rect) { gl.uniform1f(U.uTexOn,1); gl.uniform4fv(U.uTexRect,opt.rect); }
      else gl.uniform1f(U.uTexOn,0);
      // `tex` is a model's own albedo map; `mat` is a tiling surface texture. Both land on the
      // same unit, and the active unit is put back to 0 afterwards because everything else in
      // this file assumes the glyph atlas is the one selected.
      const pAlbedo=asTex(opt.tex), pSurf=asTex(opt.mat), pNrm=asTex(opt.nrm);
      if (pAlbedo || pSurf) {
        // Bound only when it actually changes. A dressed figure asks for the same cloth texture
        // on twenty-odd garment draws and there may be twenty people in the room, so this is
        // several hundred redundant binds a frame otherwise. Cheap per call, not free.
        const want = pAlbedo||pSurf;
        if (want !== boundMat) {
          gl.activeTexture(gl.TEXTURE0+MAT_UNIT);
          gl.bindTexture(gl.TEXTURE_2D,want);
          boundMat = want;
        }
        gl.uniform1f(U.uMatOn,pAlbedo?1:2);
        gl.uniform1f(U.uMatMean,pSurf?textureMean(pSurf):0.22);
        if (!pAlbedo) {
          gl.uniform1f(U.uMatScale,opt.matScale||1);
          gl.uniform1f(U.uMatAmt,opt.matAmt===undefined?.7:opt.matAmt);
        }
        if (pNrm) {
          gl.activeTexture(gl.TEXTURE0+NRM_UNIT);
          gl.bindTexture(gl.TEXTURE_2D,pNrm);
          gl.uniform1f(U.uNrmOn,pAlbedo?1:2);
          gl.uniform1f(U.uNrmAmt,opt.nrmAmt===undefined?1:opt.nrmAmt);
        } else gl.uniform1f(U.uNrmOn,0);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.uniform1f(U.uMatOn,0); gl.uniform1f(U.uNrmOn,0);
        gl.uniform1f(U.uMatMean,0.22);
      }
      bindArm(U,pNrm||pAlbedo);
      gl.drawElements(gl.TRIANGLES,m.count,m.type,0);
      if(framePacketId)recordFramePacketDraw(name,model,color,opt);
      // The WebGPU comparison mirrors one-off main-pass draws as well as retained batches. This
      // sits after the authoritative WebGL submission and outside the shadow branch above, so a
      // rejected optional material can neither hide the WebGL prop nor duplicate its shadow.
      if(typeof WebGPUPreview!=='undefined'&&WebGPUPreview.requested){
        const previewOpt=previewDrawOptions(opt);
        if(previewOpt)WebGPUPreview.captureDraw(name,model,color,previewOpt);
      }
    },
    // Sky, drawn first as a sphere around the eye with depth off, so everything else simply
    // paints over it. Culling has to go too: we are looking at it from the inside.
    dome(eye,zenith,horizon){
      gl.uniform3fv(U.uSkyA,zenith); gl.uniform3fv(U.uSkyB,horizon);
      const packetActive=!!framePacketId;
      previewDepthWrite=false;previewCullNone=true;
      if(packetActive){
        framePacketDepthWrite=false;framePacketCullNone=true;
        // The strict direct mode-12 ball contract makes disabled depth testing intrinsic to this
        // command. The packet's mode/cull/depth-write tuple therefore reconstructs it without a
        // generic depth-test field or an out-of-band omission.
      }
      gl.depthMask(false); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      this.draw('ball',M.mul(M.trans(eye[0],eye[1],eye[2]),M.scale(760,760,760)),
        horizon,{ mode:12,gloss:0 });
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.depthMask(true);
      previewDepthWrite=true;previewCullNone=false;
      if(packetActive){framePacketDepthWrite=true;framePacketCullNone=false;}
    },
    depthMask(on){
      previewDepthWrite=!!on;
      if(framePacketId)framePacketDepthWrite=!!on;gl.depthMask(on);
    },
    additive(on){
      previewAdditive=!!on;
      if(framePacketId)framePacketAdditive=!!on;
      gl.blendFunc(gl.SRC_ALPHA,on?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
    },
  };
})();

function C(hex){
  const v=parseInt(hex.slice(1),16);
  return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];
}
