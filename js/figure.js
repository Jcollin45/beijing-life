// Garments and features contributed by other files. See the call site at the end of `drawFigure`
// for what a builder is handed and why this exists — in short, so that more than one person can
// work on the wardrobe without all of them editing the same 1,200-line function.
const FigureFit = {};
// Builder failures are recoverable by design, but a broken garment must not emit once per figure
// per frame. Keep the warning state out of FigureFit itself so metadata can never be mistaken for
// another callable builder.
const FigureFitWarned = new Set();

// The figure rig: one body, many people.
//
// Everything that differs between two human beings in this game — build, colouring, hair,
// what they are wearing and carrying — arrives in a `look`, so the player and every
// neighbour in the hutong are drawn by this one function. It is kept in its own file for
// two reasons: it is the most-edited code in the project, and `studio.html` loads it on its
// own to draw a figure with no world, no game loop and no HUD around it, which is the only
// practical way to judge a face.
//
// Declarations here are deliberately left at script scope rather than wrapped in a module
// object: the game refers to `drawFigure`, `POSE`, `tint` and the rest by bare name, and
// classic scripts share one global lexical environment.


const BLACK = [0, 0, 0];
const SKIN = C('#e4b08d'), SKIND = C('#bf7f62'), HAIR = C('#69412f'),
      PANTS = C('#34465b'), SHOE = C('#e8e2d6'), SOLE = C('#aaa69f'),
      PACK = C('#b3603b'), PACKL = C('#cd7c4f'), STRAP = C('#4a352e'),
      // Webbing sits between the pack and the dark loop: in near-black it read as a slot
      // cut into the hoodie rather than as a strap lying on top of it.
      WEBB = C('#4e392f'),
      EYEWHITE = C('#f1eee7'), EYE = C('#547783'), MOUTH = C('#a85d58');

function tint(c, k) { return [clamp(c[0] * k, 0, 1), clamp(c[1] * k, 0, 1), clamp(c[2] * k, 0, 1)]; }
// Part of the way from one colour to another. Stubble is not a colour of its own — it is skin with
// a little hair in it — and so is the crease beside an old mouth.
function mixc(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
// 0 below 0, 1 above 1, and no corner at either end.
function smooth01(x) { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); }

// Cloth, now with a real weave on it. `mode: 7` already varies the surface procedurally and
// stays — the texture goes over the top of it, not instead of it.
//
// Two things about the numbers. `matScale` is 16 cm, so the weave repeats about three times
// across a chest: small enough to read as cloth, large enough not to alias into noise on
// somebody at the far end of a platform. `matAmt` is low because a garment's colour is how you
// recognise a person across a room — 王阿姨 is the one in the plum cardigan — and a texture
// allowed to move that colour costs more than it adds.
//
// The texture is resolved through a getter rather than being looked up once: this constant is
// built while the file loads, which is long before there is a GL context to make a texture in.
// `Assets.material` caches, so this is a map lookup per draw and not a re-upload.
const FABRIC = { gloss: 0.04, mode: 7,
                 get mat() {
                   return typeof Assets === 'undefined' ? null : Assets.material('fabric');
                 },
                 matScale: 0.16, matAmt: 0.26 },
      // Skin used to be deliberately flat, on the grounds that the honest fix was subsurface
      // scattering — a shader change, not a texture — and that a tiling cloth-scale photograph
      // stretched over a face reads as a rash. The second half of that is still true and there is
      // still no texture here. The first half has been done: mode 19 wraps each colour channel a
      // different distance past the terminator, which is what light actually does in tissue, so a
      // face now has a soft warm edge where it turns away from a lamp instead of a drawn line.
      SKINM = { gloss: 0.16, mode: 19 },
      // Low gloss on purpose: a tight highlight on one big hair sphere read as a bald patch.
      HAIRM = { gloss: 0.11 }, SHOEM = { gloss: 0.20 };

// A shaped torso, tapered proportions and capsule limbs keep the silhouette human.
// One body, many people. Everything that differs between two human beings in this game —
// build, colouring, hair, what they are wearing and carrying — arrives in `look`, so the
// player and every neighbour in the hutong are drawn by the same code.
// The wardrobe is a set of layers, and the only thing that makes it manageable is resolving
// which layer owns which part of the body *here*, once, rather than asking at every draw call.
// The arms and shoulders wear the coat if there is one; failing that the yoke, which is what
// makes a raglan tee or a two-tone jersey; failing that the shirt itself. Everything is
// optional and every default reproduces the plain shirt-and-trousers the cast started in, so
// an entry in the roster only names the pieces that make that person that person.
//
// The concept sheets organise that shared anatomy into six silhouette families. These are not
// six separate rigs: they are deliberately small changes to head-to-body ratio and, most of all,
// to the shoulder line. `wide` still owns the mass of the torso and limbs, while `shoulder`
// decides where the arms actually leave it. That distinction is what lets a rounded older adult
// have a full middle without the square shoulders of a worker, and lets a child keep a large head
// without looking like a scaled-down weightlifter.
const BODY_SILHOUETTE = {
  // These are anatomical relationships, not whole-body scales. `wide` still carries a person's
  // overall mass; the family decides where that mass sits. The old table changed only the arm
  // anchor, so a slim student and a stocky mechanic inherited the same upper arms, thighs,
  // pelvis, hands and feet — one action-figure body wearing differently sized shirts.
  youth:             { shoulder: 0.86, head: 1.040, arm: 0.86, leg: 0.87, hip: 0.90,
                       hand: 0.92, foot: 0.90 },
  'slim-adult':      { shoulder: 0.92, head: 1.005, arm: 0.91, leg: 0.92, hip: 0.95,
                       hand: 0.97, foot: 0.97 },
  'average-adult':   { shoulder: 0.95, head: 1.000, arm: 0.95, leg: 0.96, hip: 1.00,
                       hand: 1.00, foot: 0.98 },
  'broad-worker':    { shoulder: 0.98, head: 0.990, arm: 1.02, leg: 1.03, hip: 1.03,
                       hand: 1.03, foot: 1.01 },
  'rounded-older':   { shoulder: 0.90, head: 1.020, arm: 0.96, leg: 0.98, hip: 1.08,
                       hand: 0.99, foot: 0.98 },
  'wiry-older':      { shoulder: 0.91, head: 1.000, arm: 0.89, leg: 0.91, hip: 0.95,
                       hand: 0.96, foot: 0.96 },
};
function silhouetteOf(o, youth, age, wide, authoredWide) {
  if (o.silhouette && BODY_SILHOUETTE[o.silhouette]) return o.silhouette;
  const who = `${o.name || ''}|${o.hz || ''}|${o.job || ''}|${o.uniform || ''}`;
  if (youth >= 0.45 || (o.tall || 1) < 0.80 || who.includes('豆豆')) return 'youth';
  if (who.includes('王阿姨') || who.includes('李大妈')) return 'rounded-older';
  if (age >= 0.55) return wide >= 1 ? 'rounded-older' : 'wiry-older';
  // A strong shoulder line is the useful common read shared by the mechanic, keeper, cook and
  // manager in the sheets. The delivery rider remains slim: the insulated box and helmet, not
  // body mass, are the unmistakable shape in that design.
  if ((/(师傅|饲养员|厨师|维修|经理)/).test(who) || (authoredWide && wide >= 1.08))
    return 'broad-worker';
  if (wide <= 0.96 || youth > 0.18) return 'slim-adult';
  return 'average-adult';
}
function makeLook(o) {
  const skin = C(o.skin), top = C(o.top), shoe = C(o.shoe || '#e8e2d6');
  const youth = clamp(o.youth || 0, 0, 1);
  const tall = o.tall || 1;
  const authoredWide = o.wide !== undefined;
  // Generated builds used to run 0.94..1.14 and the upper end automatically selected the broad
  // worker family. The player happened to hash to the very widest value despite having no
  // authored build. Keep stable variation centred on an ordinary adult, and reserve the worker
  // family for a role or a deliberately authored width.
  const wide = authoredWide ? o.wide
    : 0.91 + ((o.faceSeed || 0) * 37 % 23) / 23 * 0.18;
  const age = clamp(o.age || 0, 0, 1);
  const silhouette = silhouetteOf(o, youth, age, wide, authoredWide);
  const bodyShape = BODY_SILHOUETTE[silhouette];
  const jacket = o.jacket && C(o.jacket), yoke = o.yoke && C(o.yoke);
  // A coat drawn by `fig-outer.js` rather than by this file — a padded jacket, a parka, a長大衣.
  // It is adopted here for the same reason `uniform` and `hz` were: `makeLook` returns a fixed
  // set of fields, so anything it has not been told about is dropped silently, and three separate
  // files had each ended up wrapping this function to smuggle their own keys past it. Three shims
  // around one function is not three files being careful, it is one function being wrong.
  //
  // `outer` joins the front of the chain that resolves `arm`, because whatever is outermost is
  // what the sleeves and the deltoids are made of — that is what makes a coat a coat rather than
  // a bib worn over shirtsleeves.
  // `outer` is either a kind ('parka', 'padded', 'trench'), a bare hex, or just `true`; the
  // colour may also come separately as `outerColor`. All four spellings appear in the roster.
  const outerHex = typeof o.outer === 'string' && o.outer[0] === '#' ? o.outer : null;
  const outer = o.outer ? C(o.outerColor || outerHex || '#3a4450') : null;
  const outerKind = !o.outer ? null
    : (typeof o.outer === 'string' && !outerHex) ? o.outer : 'coat';
  const arm = outer || jacket || yoke || top;
  const vest = o.vest && C(o.vest);
  // `skirt: true` cuts the trousers off at the waist in their own colour; a hex makes it a
  // garment of its own. Either way the legs below it are bare unless `legs` names a covering,
  // which is how tights and long socks get to exist without another flag.
  const skirt = o.skirt && C(o.skirt === true ? (o.pants || '#3a4048') : o.skirt);
  // `cap` predates the rest of the headwear and named a colour; `hat` names the kind. Either
  // one alone is enough, so an existing `cap:'#c8542f'` still means a peaked cap in that red.
  const hatC = (o.hatColor || o.cap) && C(o.hatColor || o.cap);
  const bagC = C(o.bagColor || '#7a5340');
  const badge = o.badge && C(o.badge === true ? '#eee9dc' : o.badge);
  // The daypack used to be a pair of module constants, which meant every pack in the country was
  // the same burnt orange: a cast of sixty-six people carrying one bag between them. Keyed off
  // the face seed so it varies across a crowd without a line of roster work, and seed 0 — the
  // player — keeps the orange it has always had, because that pack is how you find yourself.
  const packC = C(o.packColor
    || ['#b3603b', '#3d5a70', '#4a4e55', '#6d5f45', '#8a4550', '#3f6350'][(o.faceSeed || 0) % 6]);
  const pants = C(o.pants);
  // Chinese is the explicit default because this is a Chinese cast in a Chinese city. A profile
  // can still be named on a future authored visitor, but no roster row silently falls back to a
  // European-looking generic head.
  const faceProfile = o.faceProfile || 'chinese';
  const baseFace = castFaceOf(
    faceOf(o.faceSeed || 0, o.faceVary === undefined ? 1 : o.faceVary, o.face), faceProfile);
  // A child is not an adult model scaled toward the floor. The skull is proportionally larger,
  // the eyes occupy more of the face, and the nose, mouth and jaw are softer and smaller. Kept as
  // a blend so the same control can also describe a teenager without introducing a second rig.
  const youngFace = youth ? {
    ...baseFace,
    headW: baseFace.headW * (1 + .045 * youth),
    headH: baseFace.headH * (1 + .030 * youth),
    headD: baseFace.headD * (1 + .045 * youth),
    eyeX: baseFace.eyeX * (1 - .025 * youth),
    eyeW: baseFace.eyeW * (1 + .13 * youth),
    eyeH: baseFace.eyeH * (1 + .16 * youth),
    irisR: baseFace.irisR * (1 + .12 * youth),
    pupilR: baseFace.pupilR * (1 + .08 * youth),
    noseW: baseFace.noseW * (1 - .13 * youth),
    noseH: baseFace.noseH * (1 - .20 * youth),
    tipW: baseFace.tipW * (1 - .11 * youth),
    mouthW: baseFace.mouthW * (1 - .08 * youth),
    jawW: baseFace.jawW * (1 + .05 * youth),
    neckH: baseFace.neckH * (1 - .16 * youth),
    neckW: baseFace.neckW * (1 - .10 * youth),
  } : baseFace;
  return {
    // Build. Both of these were already plumbed and already varied across the roster, but the
    // adults sat inside 0.93–1.03 — a nine-centimetre spread across thirty people, which is
    // about a third of the real one. A crowd built like that reads as one person repeated.
    //
    // So an unset `wide` is no longer 1: it is derived from the face seed, which every person
    // already has and which is stable, so a given neighbour is always the same build without
    // anybody having to write a number for them. `wide: 1` explicitly still means exactly 1 —
    // the player and anyone deliberately set keeps what they were given.
    tall, wide,
    silhouette,
    // Absolute shoulder width multiplier, kept separate from torso mass. Procedural hands,
    // sleeves and anything held in them all inherit this same anchor in `drawFigure`.
    shoulder: wide * bodyShape.shoulder,
    armScale: wide * bodyShape.arm,
    legScale: wide * bodyShape.leg,
    hipScale: wide * bodyShape.hip,
    handScale: bodyShape.hand,
    footScale: bodyShape.foot,
    hairStyle: o.hairStyle || 'short',
    glasses: !!o.glasses,
    // Optional optician-owned appearance. Existing cast rows name only `glasses:true` and keep
    // the established charcoal oval; the player can carry one of six authored frame silhouettes
    // and its actual shop colour through the same look object.
    glassesColor: o.glassesColor
      ? (Array.isArray(o.glassesColor) ? o.glassesColor.slice(0, 3) : C(o.glassesColor)) : null,
    glassesShape: Number.isSafeInteger(o.glassesShape)
      ? Math.max(0, Math.min(5, o.glassesShape)) : 0,
    glassesTemporary: false,
    stoop: o.stoop || 0, youth,
    // Named cast members already have authored ratios and keep them. Generated people inherit
    // the restrained family default, enough to separate silhouettes without breaking one rig.
    headScale: o.headScale !== undefined ? o.headScale : bodyShape.head,
    // This person's own head. `faceSeed` picks one out of the crowd of possible faces, `face`
    // names any dimension outright, and with neither the shared default table is handed back
    // by reference — so nothing is allocated for a figure that does not ask for a face.
    F: youngFace,
    faceSeed: o.faceSeed || 0,
    faceProfile,
    // How old the face is, 0 to 1, and what is on it. Both are opt-in and both draw nothing at
    // all at zero: a cast where most people are neither old nor bearded costs exactly what it
    // costed before either existed, which is the only way to add detail to a crowd of sixty-six.
    age,
    // 'stubble' | 'moustache' | 'goatee' | 'full'
    beard: o.beard && o.beard !== 'none' ? o.beard : null,
    // A beard is never quite the colour of the hair above it — it is drier and it greys first.
    BEARD: tint(C(o.beardColor || o.hair), 0.92),
    pack: !!o.pack, bag: o.bag || (o.pack ? 'pack' : null),
    apron: o.apron && C(o.apron),
    // What job this person is dressed for, as an opaque token — 'mall-guard', 'metro-worker'.
    // Nothing in this file reads it: it exists so a roster entry can reach a `FigureFit` builder,
    // which is handed `lk` and otherwise has no way to tell one of sixty-four roles from another.
    //
    // Worth saying why it needs a line at all, since it looks like it should not. `makeLook`
    // returns a fixed set of fields rather than spreading `o`, so anything it has not been told
    // about is dropped here and never reaches `drawFigure` — quietly, with no error, which is the
    // same way `bag: 'crossbody'` went missing. A builder can infer a lot from `badge`, `apron`
    // and a repeated house colour, but inference is not a contract and those signals collide the
    // moment two roles share them. `uniformTrim` is the one colour a role usually needs beyond
    // the garments it already has: piping, epaulettes, a band on a cap.
    uniform: o.uniform || null,
    uniformTrim: o.uniformTrim && C(o.uniformTrim),
    // Who this is and what they do, carried through for the same reason. Without them a builder
    // that wanted to dress people by job had to wrap `makeLook` and then scan `NPCS` after
    // `initNPC` to rebuild a look→person map that existed here all along — a scan standing in for
    // a field, and one more private copy of something this function already had.
    name: o.name || null, hz: o.hz || null, job: o.job || null,
    // The outerwear file's own fields, carried natively rather than smuggled past this function.
    OUTER: outer, OUTERL: outer && tint(outer, 1.16), OUTERD: outer && tint(outer, 0.76),
    outerKind,
    OUTERLINING: o.outerLining && C(o.outerLining),
    outerHood: !!o.outerHood, collarUp: !!o.collarUp,
    cap: hatC, hat: hatC ? (o.hat || 'cap') : null,
    // How much of the arm the sleeve covers: 'long' to the wrist, 'half' to the elbow,
    // 'short' a t-shirt sleeve on the upper arm, 'none' a singlet with a bare shoulder.
    sleeve: o.sleeve || 'long',
    // 'crew' | 'shirt' | 'polo' | 'vneck' | 'turtle' | 'hood'
    collar: o.collar || 'crew',
    // Lips a shade warmer than the skin, not a red. Pushed further than this they read as
    // lipstick on every neighbour in the hutong, the men included.
    SKIN: skin, SKIND: tint(skin, 0.82), BROW: C(o.hair),
    LIP: [Math.min(1, skin[0] * 0.95), skin[1] * 0.74, skin[2] * 0.72],
    HAIR: C(o.hair), HAIRD: tint(C(o.hair), 0.72),
    // Almost every eye in this cast is dark brown, but dark brown is still not one paint chip.
    // Stable, restrained variation catches different highlights without turning an everyday
    // Beijing crowd into a fantasy palette.
    IRIS: C(o.iris || ['#241914', '#2b1e18', '#34231b', '#3b291f'][(o.faceSeed || 0) % 4]),
    TOP: top, TOPL: tint(top, 1.20), TOPD: tint(top, 0.76),
    ARM: arm, ARML: tint(arm, 1.20), ARMD: tint(arm, 0.76),
    JACK: jacket, JACKL: jacket && tint(jacket, 1.16), JACKD: jacket && tint(jacket, 0.76),
    VEST: vest, VESTD: vest && tint(vest, 0.78),
    SKIRT: skirt, SKIRTD: skirt && tint(skirt, 0.80),
    SCARF: o.scarf && C(o.scarf), SCARFD: o.scarf && tint(C(o.scarf), 0.80),
    BADGE: badge, BADGED: badge && tint(badge, 0.72),
    BAG: bagC, BAGD: tint(bagC, 0.72),
    PACK: packC, PACKL: tint(packC, 1.16), PACKD: tint(packC, 0.74),
    // What the legs themselves are: the trousers normally, and under a skirt whatever `legs`
    // names, or skin.
    LEG: skirt ? C(o.legs || o.skin) : pants,
    PANTS: pants, SHOE: shoe, SOLE: tint(shoe, 0.76),
  };
}
const EYEW = C('#f2efe8'), IRIS = C('#4a3428'), PUPIL = C('#14100e');
const HAIRM2 = { gloss: 0.13 }, LIPM = { gloss: 0.24 };

// Every dimension of the head, in head-local metres, in one table. A face is fifty numbers
// within a couple of millimetres of each other, and buried in the draw code as literals they
// could only be tuned by editing, reloading and squinting at a screenshot. Named and gathered
// here, `studio.html` can bind a slider to each one and the whole face can be dialled in by
// eye — which is the only way this kind of thing ever gets finished.
const FACE = {
  headW: 0.198, headH: 0.222, headD: 0.200, headZ: 0.020,
  // A smaller iris in a slightly smaller eye. At 18 mm across in a 38 mm eyeball the iris
  // filled everything the lids left, and both eyes read as black slits.
  eyeX: 0.040, eyeY: 0.014, eyeW: 0.033, eyeH: 0.025, eyeD: 0.027,
  // A human iris is about 11-12 mm across. The old 14 mm iris inside a lid opening only thirteen
  // millimetres high left almost no sclera and reduced both eyes to black beads in the game
  // camera. These dimensions keep the dark-brown eye colour while restoring a readable wet eye.
  irisR: 0.0115, irisOut: 0.010, pupilR: 0.0048,
  socketW: 0.042, socketH: 0.031, socketIn: 0.014,
  lidW: 0.043, lidH: 0.020, lidLift: 0.014,
  // Thin, short and close above the eye. Any heavier and the brow is the only thing anybody
  // sees on the face — two black slugs where the eyebrows should be. Sat at 0.038 with a 0.22
  // arch they floated a clear gap above the eye and read as raised, a face permanently mildly
  // surprised; dropped onto the brow and flattened they read as resting.
  browY: 0.033, browLen: 0.033, browThick: 0.007, browArch: 0.16,
  noseY: 0.022, noseW: 0.024, noseH: 0.072, noseIn: 0.008,
  tipY: -0.026, tipW: 0.030, tipD: 0.028,
  mouthY: -0.048, mouthW: 0.046, lipH: 0.013, smile: 0.003,
  chinY: -0.080, chinW: 0.048, jawY: -0.094, jawW: 0.050,
  earX: 0.080, earY: -0.014, earH: 0.052,
  // `hairGrow` is added to each of the head's three scales when drawing the hair shell, so a
  // head of hair is the skull plus a few millimetres all round.
  hairGrow: 0.004,
  neckY: 0.654, neckH: 0.104, neckW: 0.088, collarY: 0.618,
};

// ---- one face per person.
//
// Everything above is a single table, and for a long time it was *the* face: every human being in
// this game — the grandmother on her stool, the mechanic, the child, sixty commuters — was drawn
// with the same skull, the same eyes and the same mouth, in different clothes. At conversational
// range that is the most artificial thing in the project, and no amount of wardrobe hides it.
//
// So a look may carry its own head. `faceOf` builds one by nudging each dimension a little way off
// the table, deterministically from a seed, which means a person's face is as stable as their name
// and costs nothing to store or draw: it is the same number of shapes, at slightly different sizes.
//
// Only genuinely facial dimensions are in here. The neck's height, the collar line and the depth
// the hair shell is grown by are structural — garments are placed against them — so they stay put,
// and a face is never varied so far that the features come off the skull, because every one of them
// is positioned against `surf`, the actual surface of *this* head.
const FACE_VARY = {
  headW: .045, headH: .050, headD: .040,
  eyeX: .055, eyeY: .090, eyeW: .075, eyeH: .090, irisR: .070,
  socketW: .060, socketH: .070, lidW: .045, lidH: .070, lidLift: .090,
  browY: .085, browLen: .110, browThick: .130, browArch: .300,
  noseY: .090, noseW: .110, noseH: .095, tipY: .080, tipW: .110, tipD: .110,
  mouthY: .055, mouthW: .095, lipH: .150, smile: .500,
  chinY: .045, chinW: .075, jawY: .035, jawW: .075,
  earX: .035, earY: .110, earH: .095,
  neckW: .055,
};
// mulberry32, so a face is reproducible from its seed and a person looks like themselves across
// a reload, a save, and a screenshot taken a week later.
function faceRand(seed) {
  let a = (seed >>> 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// `amount` scales the whole spread: 0 is the table itself, 1 is as far as any dimension is allowed
// to go, and over 1 is available to the studio because seeing a caricature is how you find out
// which dimension you are actually looking at. `over` wins over both, so a character can be given
// one deliberate feature — a heavy brow, a wide jaw — on top of an otherwise random face.
function faceOf(seed, amount = 1, over) {
  if (!seed && !over) return FACE;
  const F = { ...FACE };
  if (seed) {
    const r = faceRand(seed);
    for (const k in FACE_VARY) {
      // Triangular rather than flat: most faces are near the middle of the range and a few are
      // not, which is how a crowd of faces is actually distributed.
      const u = (r() + r() - 1) * FACE_VARY[k] * amount;
      F[k] = +(FACE[k] * (1 + u)).toFixed(5);
    }
  }
  if (over) for (const k in over) if (typeof over[k] === 'number') F[k] = over[k];
  return F;
}

// The whole playable cast is Chinese. `faceOf` still supplies the large person-to-person spread,
// but it starts from one restrained East Asian art-direction profile instead of the old generic
// head. This is a casting baseline, not an attempt to claim that nationality has one face: the
// seeded variation remains larger than every adjustment below, and authored `look.face` values
// still win. The changes are the broad reads that survive the game's simple close-up geometry —
// a slightly wider/flatter cranial mass, a lower nasal root with a broader tip, and less vertical
// lid exposure — while fig-face.js varies folds and bridge height independently for each person.
const CHINESE_CAST_PROFILE = {
  headW: 1.018, headD: 0.982,
  eyeH: 0.925, socketH: 0.955, lidH: 0.940, lidLift: 0.925,
  browArch: 0.900,
  noseW: 1.055, noseIn: 1.260, tipW: 1.070, tipD: 0.965,
  chinW: 1.018, jawW: 1.028,
};
function castFaceOf(base, profile) {
  if (profile !== 'chinese') return base;
  const F = { ...base };
  for (const k in CHINESE_CAST_PROFILE) F[k] = +(F[k] * CHINESE_CAST_PROFILE[k]).toFixed(5);
  return F;
}

// One skeleton, one persistent pose. Every channel eases toward whatever the body should be
// doing this frame at its own rate, so walk → sit → shower → walk is continuous: nothing
// snaps the instant the current action changes, and the gait still reads crisply.
const POSE = {
  rootDrop: 0, bob: 0, sway: 0, surge: 0, recline: 0,
  torsoPitch: 0, torsoYaw: 0, torsoRoll: 0, hipYaw: 0,
  thighL: 0, thighR: 0, kneeL: -0.035, kneeR: -0.035, ankleL: 0, ankleR: 0,
  shL: 0.07, shLz: -0.02, elbL: -0.16,
  shR: 0.07, shRz:  0.02, elbR: -0.16,
  // Forearm twist, the joint that decides which way a palm faces. The shoulder and elbow
  // between them use up every degree of freedom getting the hand to a place, so without this
  // the palm ends up wherever the arithmetic leaves it — edge-on to the switch it is
  // pressing, or turned over on the thigh it is resting on. The imported MPFB/Mixamo bind hand
  // is close to the thigh at rest. The old ±0.70 twist exposed the whole palm toward camera,
  // while exactly zero still left the generated MPFB hands a little too front-facing. A small
  // opposing turn settles the knuckles forward and the palms inward without locking either wrist.
  // Activities that need a turned palm author their own twist through armTo/activityPose.
  twL: 0.12, twR: -0.12,
  headYaw: 0, headPitch: 0,
  // A small procedural jaw opening. Speech does not have phoneme data, but a face whose lips
  // part on the cadence of the voice reads as speaking while a fixed mouth reads as a mannequin.
  // Kept as a pose channel so it settles with every other part of the body and harmlessly drops
  // out on a skinned rig that has no mouth morph target.
  mouth: 0,
  // How closed the fingers are, 0 open to 1 shut. An eased channel like the rest, so a hand
  // closes onto a handle over a moment rather than snapping shut on the frame it arrives.
  grip: 0.42,
};
// Settling time in seconds. Limbs driven by the gait stay quick or the stride would smear;
// posture, seat height and gaze take their time.
const TAU = {
  thighL:.045, thighR:.045, kneeL:.045, kneeR:.045, ankleL:.05, ankleR:.05,
  bob:.05, sway:.075, surge:.09, hipYaw:.07, torsoYaw:.085, torsoRoll:.11,
  shL:.06, shR:.06, shLz:.11, shRz:.11, elbL:.07, elbR:.07, twL:.10, twR:.10,
  rootDrop:.19, recline:.21, torsoPitch:.14, headYaw:.17, headPitch:.17, grip:.10,
  mouth:.035,
};

// ------------------------------------------------------------------------------- the walk
//
// A walk is convincing exactly as far as the planted foot stays where it was put, and
// everything below follows from that one rule.
//
// So the phase advances per *metre travelled* rather than per second, and the step length it
// is scaled to grows with speed the way a real one does. `strideRate` is the number the game
// and the neighbours integrate; the thigh swing below is derived from the same step length,
// which is what stops the two of them drifting apart into a moonwalk. The swing amplitude is
// the solution of "the foot's travel over the ground equals the ground actually covered",
// fitted across the speed range.
//
// `age` shortens the step, and it is the one age cue that has to live down here rather than in
// the pose: a shorter step is not a smaller thigh swing, it is a smaller thigh swing *and* a
// proportionally slower cadence, and the only thing that keeps those two agreeing is that both
// this and the swing amplitude in `gaitPose` are scaled by the same factor. An older neighbour
// therefore covers the ground at whatever speed the routine gives them, in more, smaller steps.
// Whoever integrates the phase has to pass the same age the pose is drawn with or the feet
// skate — which is why both of the game's two call sites take it.
const AGE_STEP = 0.22;
function stepLength(sp, age = 0) {
  const w = Math.min(1, sp), run = clamp(sp - 1, 0, 0.6);
  return (0.40 + 0.30 * w + 0.20 * run) * (1 - AGE_STEP * clamp(age, 0, 1));
}
function strideRate(sp, age) { return Math.PI / stepLength(sp, age); }   // radians of phase per metre

// Each leg also runs its own cycle. `u` is where a leg is in its own: 0 at heel strike,
// STANCE at toe-off, 1 back at the next heel strike.
const STANCE = 0.62;

// The hip's fore-aft sweep, which is the one curve that has to be right. Straight through
// stance, because the foot is nailed to the floor and the body crosses over it at a constant
// speed; a faster, smooth return through swing. A sine here spends the whole of stance
// accelerating and decelerating while the ground underneath does no such thing, and measured
// against the floor that mismatch came to sixty per cent of the distance travelled — which is
// the arithmetic behind every game character who appears to be wearing roller skates. This
// costs the same two multiplies and brings it under ten. Slopes are matched at both joins, so
// there is no corner; the swing overshoots each end a little, which is what a leg that has
// been thrown forward actually does.
function strideWave(u) {
  if (u < STANCE) return 1 - 2 * u / STANCE;
  const v = (u - STANCE) / (1 - STANCE), m = -2 * (1 - STANCE) / STANCE;
  const v2 = v * v, v3 = v2 * v;
  return -(2 * v3 - 3 * v2 + 1) + (v3 - 2 * v2 + v) * m + (-2 * v3 + 3 * v2) + (v3 - v2) * m;
}
// One or two things in a stride are events at a particular moment of it rather than sines
// spread across the whole of it. `bump` is a raised cosine centred on `at` and `wid` wide,
// wrapping round the cycle.
function bump(u, at, wid) {
  const d = ((u - at + 1.5) % 1) - 0.5, x = Math.abs(d) / wid;
  if (x >= 1) return 0;
  const c = Math.cos(x * Math.PI / 2);
  return c * c;
}

// Where the lowest part of a shoe sits, measured from the pelvis, given one leg's joint
// angles. Three planar rotations and no matrices: it runs four times per figure per frame,
// and it is what turns the rise and fall of the hips from a guessed sine into a consequence
// of where the legs actually are.
const LEG_HIP = 0.86, LEG_THIGH = 0.415, LEG_SHIN = 0.405;
// The sole is an ellipsoid; these are the two points on it that touch down — the back of the
// heel and the ball of the foot — which between them give the foot a rocker.
const SOLE_Y = -0.094, HEEL_Z = -0.015, TOE_Z = 0.210;
function soleHeight(thigh, knee, ankle, z) {
  knee = -knee;                                  // see `leg` below: a bent knee is negative
  const a = ankle - (thigh + knee), ca = Math.cos(a), sa = Math.sin(a);
  const y1 = SOLE_Y * ca - z * sa + 0.025 - LEG_SHIN, z1 = SOLE_Y * sa + z * ca;
  const ck = Math.cos(knee), sk = Math.sin(knee);
  const y2 = y1 * ck - z1 * sk + 0.018 - LEG_THIGH, z2 = y1 * sk + z1 * ck;
  return LEG_HIP + y2 * Math.cos(thigh) - z2 * Math.sin(thigh);
}
function lowestSole(thigh, knee, ankle) {
  return Math.min(soleHeight(thigh, knee, ankle, HEEL_Z),
                  soleHeight(thigh, knee, ankle, TOE_Z));
}
// Standing on both feet, knees at their rest bend: this is where the floor is.
const SOLE_REST = soleHeight(0, -0.035, 0, HEEL_Z);

// ------------------------------------------------------------------------- standing still
//
// The most-seen pose in the game and, until now, the deadest: five millimetres of bob and a
// slow lean, on every neighbour behind every counter, every passenger on every platform, and
// on the player any time their hand is off the stick. A crowd of those is a crowd of shop
// dummies however good the faces on them are.
//
// Nobody stands on two legs. They rest on one, and every ten seconds or so they change over;
// they breathe; and their head drifts off whatever it was pointed at and comes back. Those
// three things, and the fact that they are not in step with each other, are the whole of it.
//
// This owns `bob` — which is to say it owns where the floor is — because the weight shift
// moves the legs and the pelvis has to end up over whichever foot is lowest. Everything else
// it does is added to whatever the gait left behind and scaled by `k`, so a figure coming to
// a stop grows into standing over half a metre per second instead of switching to it.
//
// The free leg's knee softens rather than lifting. A knee a fifth of a radian off straight
// shortens the leg by four millimetres, which is well under the threshold at which a foot is
// visibly off the floor and is most of what separates a resting stance from a parade one.
// `kl` is the same thing for the legs alone, and it is separate for the same reason `gaitPose`
// keeps a narrow ramp for the stride and a wide one for everything above it: a resting stance
// moves the feet, and any of it laid over a walk — even a slow one — is a foot that slides.
function idlePose(p, now, seed = 0, k = 1, kl = k) {
  const t = now / 1000, sd = seed * 1.7;
  // Breathing. About fourteen a minute at rest, and deliberately never quite the rate of the
  // person standing next to you — two neighbours inhaling together is worse than neither.
  const air = Math.sin(t * (6.2832 / (3.9 + (seed % 5) * 0.23)) + sd);
  if (k > 0.004) {
    // Which foot the weight is on. `tanh` of a slow sine dwells at each end and crosses in
    // about a second, which is what a weight change is: an event. A plain sine slides
    // continuously between the two feet and reads as a person swaying, not resting.
    const wt = Math.tanh(Math.sin(t * 0.30 + sd) * 2.5) * k;   // +1 fully on the right foot
    const wl = wt * (kl / (k || 1));
    const fL = Math.max(0, wl), fR = Math.max(0, -wl);         // how free each leg is
    // The free leg gives: the knee breaks forward, the thigh comes with it, and the heel comes
    // off the floor so the foot is resting on the ball of itself. The loaded one straightens.
    //
    // The ankle is not decoration. A knee bent this far shortens the leg by nearly four
    // millimetres, and since the pelvis is dropped onto whichever shoe is lowest, that is four
    // millimetres of daylight under the free one — and if the ankle over-corrects it is four
    // millimetres under the *loaded* one instead, which is worse, because the loaded foot is
    // the one the eye is checking. 0.016 rad of toe-down holds the difference inside half a
    // millimetre across the whole shift, in both directions, and leaves the heel a little up.
    p.thighL += -0.052 * fL + 0.014 * fR;
    p.thighR += -0.052 * fR + 0.014 * fL;
    p.kneeL  += -0.150 * fL + 0.022 * fR;
    p.kneeR  += -0.150 * fR + 0.022 * fL;
    p.ankleL += 0.016 * fL;
    p.ankleR += 0.016 * fR;
    // The pelvis travels over the loaded foot and the chest counter-leans so the head stays
    // roughly where it was. That counter-lean is the whole of what makes this read as weight
    // rather than as somebody leaning sideways: negative sway is toward the left foot, and a
    // positive roll tips the top of the body the other way from it.
    p.sway      += wt * 0.030;
    p.torsoRoll += wt * 0.028;
    p.hipYaw    += wt * 0.020;
    p.torsoYaw  -= wt * 0.014;
    // Arms hang from the shoulders rather than out of them, so when the chest tilts they stay
    // vertical — and they arrive a beat after it does, because an arm is carried, not driven.
    const lag = Math.tanh(Math.sin(t * 0.30 + sd - 0.62) * 2.5) * k;
    p.shLz -= lag * 0.026; p.shRz -= lag * 0.026;
    // Nobody rests with two arms in the exact same solved angle. One hangs a little farther
    // forward with a softer elbow while the other settles closer to the hip; handedness is stable
    // per character, so a crowd does not alternate in sync as the weight-shift wave crosses zero.
    const hand = (Math.floor(Math.abs(seed) * 13) & 1) ? 1 : -1;
    p.shL += (hand < 0 ? -0.045 : -0.015) * k;
    p.shR += (hand > 0 ? -0.045 : -0.015) * k;
    p.elbL += (hand < 0 ? -0.040 : 0.020) * k;
    p.elbR += (hand > 0 ? -0.040 : 0.020) * k;
    // Two head drifts at rates that do not divide into each other, so it never visibly loops,
    // and a slow settle away from the hip being stood on — people turn off their loaded side.
    p.headYaw   += (Math.sin(t * 0.148 + sd) * 0.080
                  + Math.sin(t * 0.37 + sd * 2.1) * 0.028) * k - wt * 0.055;
    p.headPitch += (Math.sin(t * 0.19 + sd * 1.3) * 0.030 - 0.010) * k;
    // The chest opens on the way in, so the shoulders go out and back rather than the whole
    // body simply travelling up and down. Splay is a rotZ, so out is -z on the left and +z on
    // the right.
    p.shLz -= air * 0.009 * k; p.shRz += air * 0.009 * k;
    p.torsoPitch -= air * 0.005 * k;
  }
  // The floor is wherever the lower shoe is. Breath is added on top and never subtracted, so
  // a standing figure rises off the floor by four millimetres and settles back onto it rather
  // than sinking a wave's worth into it.
  p.bob = SOLE_REST - Math.min(lowestSole(p.thighL, p.kneeL, p.ankleL),
                               lowestSole(p.thighR, p.kneeR, p.ankleR))
        + (air * 0.5 + 0.5) * 0.0045 * k;
  return p;
}

// --------------------------------------------------------------------------- looking at you
//
// The channels have been here the whole time — `eyeYaw`, `eyePitch`, and a neck that turns —
// and nothing in this game has ever used them to look at the player. A neighbour whose eyes
// find you as you pass is worth more than anything on the clothes rail, because it is the one
// thing that says somebody is home.
//
// `yaw` and `pitch` are where the thing is relative to the way this person is already facing,
// in the same sense as `headYaw`/`headPitch`: positive pitch is downward. The eyes go first
// and go further, and the neck only covers what the eyes cannot reach — inside about fifteen
// degrees the head does not move at all, which is what makes a glance read as a glance rather
// than as a turn. `k` is how much of their attention is on it, and blending toward the target
// by it rather than easing over time means the caller can lay this over a wandering eye and
// get a fixation with the wander still on top of it.
const GAZE_DEAD = 0.26, GAZE_NECK = 0.92, GAZE_EYE = 0.44,
      GAZE_NECK_P = 0.30, GAZE_EYE_P = 0.22;
function lookAt(p, yaw, pitch, k = 1) {
  if (!(k > 0.001)) return p;
  const over = Math.abs(yaw) > GAZE_DEAD
    ? (Math.abs(yaw) - GAZE_DEAD) * Math.sign(yaw) : 0;
  const hy = clamp(over * 1.25, -GAZE_NECK, GAZE_NECK);
  const hp = clamp(pitch * 0.55, -GAZE_NECK_P, GAZE_NECK_P);
  p.headYaw = lerp(p.headYaw || 0, hy, k);
  p.headPitch = lerp(p.headPitch || 0, hp, k);
  p.eyeYaw = lerp(p.eyeYaw || 0, clamp(yaw - hy, -GAZE_EYE, GAZE_EYE), k);
  p.eyePitch = lerp(p.eyePitch || 0, clamp(pitch - hp, -GAZE_EYE_P, GAZE_EYE_P), k);
  return p;
}

// Walking, running and standing still are one continuous function of speed. Shared: the
// player and every neighbour in the hutong put one foot in front of the other the same way.
// `lk` is optional and is only ever read for `age`, `stoop` and `faceSeed`: a walk is a walk,
// but a seventy-year-old's is a different one from a courier's, and the difference is in here
// rather than in a second function because every term of it is a scaling of a term of this.
function gaitPose(p, sp, ph, turn, now, lk, motion) {
  const w = Math.min(1, sp), run = clamp(sp - 1, 0, 0.6);
  const age = lk ? clamp(lk.age || 0, 0, 1) : 0, stoop = lk ? lk.stoop || 0 : 0;
  // Who this is, for the idle below. A look brings its own face seed; without one — the studio,
  // a bare call — the phase stands in, which is per-person too and is at least never shared.
  const sd = lk ? (lk.faceSeed || 0) : (ph || 0);
  // Under a slow shuffle the gait folds away into a stand. The window is deliberately narrow:
  // scaling the stride down over a wide one is the very thing that makes feet skate.
  //
  // Nothing above the pelvis is under that constraint, though, and for a long time all of it
  // shared the same twelve hundredths of a metre per second — which is why a figure used to
  // click between standing and walking. `gw` is the same ramp taken over a speed you can
  // actually watch pass: the legs commit to a stride at once, and the arm swing, the forward
  // lean and the mannerisms of standing trade places over the next half metre per second.
  const g = smooth01(sp / 0.16), gw = smooth01(sp / 0.55), still = 1 - gw;
  const s = Math.sin(ph), c = Math.cos(ph);
  const bend = x => Math.pow(Math.max(0, x), 1.75);
  // Age, in the gait rather than only in the face. The step is shorter — see `stepLength`,
  // which must be scaled by the same factor or the feet skate — the foot is picked up less,
  // the push off the ball of it goes, and the trunk stops rotating. Together those are what
  // reads at thirty metres as somebody old, long before you can see that their hair is grey.
  const yr = 1 - AGE_STEP * age;

  // The left heel strikes at ph = -pi/2, where the left thigh is at its forward extreme, and
  // the left toe leaves at ph = +pi/2 where it is at its rearmost. Writing the knee and the
  // ankle against `u` rather than against a phase-shifted sine is not tidiness: the two of
  // them used to be about sixty degrees out, so the foot was lifting while the leg was still
  // swinging forward, and the body then crossed over a foot that was sliding backwards and
  // forwards under it.
  const uL = ((ph / (2 * Math.PI) + 0.25) % 1 + 1) % 1, uR = (uL + 0.5) % 1;
  // Swing amplitude solved so the sweep delivers exactly the step length above. Get this
  // wrong in either direction and the character walks over ground it is not covering.
  const swing = (0.298 + 0.245 * w + 0.165 * run) * g * yr;
  // The knee folds the leg up through mid-swing so the toe clears the floor. There is no
  // stance-phase dip: a real one exists, but it shortens the stance leg, and without a
  // pelvis that can list to make up the difference it just drags the planted foot along.
  const flex = (0.18 + 0.24 * w + 0.35 * run) * g * (1 - 0.30 * age);
  // Toe-off is a hard push off the ball of the foot at the end of stance; at heel strike the
  // toes only come up a little. They are not the same size, and a symmetric ankle is most of
  // what makes a walk read as a shuffle. Both are kept narrow so that neither is still moving
  // while the foot is flat — an ankle that turns under a planted foot is a foot that slides.
  // An old walk loses the push first: that is the whole difference between walking and
  // shuffling, and it is why a shuffle is slower without anybody moving their legs faster.
  const push = (0.10 + 0.20 * w + 0.25 * run) * g * (1 - 0.55 * age), lift = 0.18 * g;
  const leg = (u, side) => {
    p['thigh' + side] = -strideWave(u) * swing;
    p['knee' + side] = -(0.035 + 0.015 * g + flex * bump(u, 0.72, 0.30));
    p['ankle' + side] = push * bump(u, 0.57, 0.09) - lift * bump(u, 0.00, 0.08);
  };
  leg(uL, 'L'); leg(uR, 'R');

  // Weight goes over the stance foot, which is the left one around ph = 0. Without this the
  // body walks straight down the middle and the legs look bolted to a trolley. An old walk
  // takes a wider path over the same feet — a cautious base costs lateral travel, and it is
  // the one thing here that gets bigger with age rather than smaller.
  p.sway = -c * 0.032 * (1 + 0.35 * age) * g;
  p.hipYaw = -s * 0.10 * g * (1 - 0.45 * age);
  p.torsoYaw = s * 0.14 * gw * (1 - 0.55 * age);
  p.torsoRoll = clamp(-turn * 0.05, -0.16, 0.16) * gw;
  // Forward, and further forward the faster you go: you fall into a run, you do not sit back
  // from it. rotX tips the top of the torso toward +z, so this angle is positive.
  // `stoop` is already in the torso's own matrix, so it is not added here — what it does need
  // is the neck below, because a bent back with a level neck walks looking at the pavement.
  p.torsoPitch = (0.025 + 0.020 * w + 0.20 * run) * gw;

  // Arms swing against the legs and lag them a little, because an arm is thrown rather than
  // driven, and the elbow closes on the way forward and opens again on the way back. On `gw`
  // rather than `g`: the amplitude of an arm swing is not nailed to the floor the way a stride
  // is, and letting it come up over half a metre per second is most of what turns the moment
  // of setting off from a switch being thrown into somebody starting to walk.
  const as = Math.sin(ph - 0.22), aw = (0.50 + 0.30 * run) * gw * (1 - 0.40 * age);
  p.shL = -as * aw + 0.07 * still;
  p.shR =  as * aw + 0.07 * still;
  p.shLz = -0.03 - 0.040 * gw;
  p.shRz =  0.03 + 0.040 * gw;
  p.elbL = -(0.16 + 0.10 * gw + (0.30 + 0.34 * run) * gw * bend(-as));
  p.elbR = -(0.16 + 0.10 * gw + (0.30 + 0.34 * run) * gw * bend( as));

  // The head holds its line while the shoulders turn under it. People stabilise their gaze
  // when they walk, and a head that swings with the torso is the tell of a puppet. The neck
  // also undoes most of the stoop: somebody bent over lifts their chin to see where they are
  // going, and without that a stooped figure spends the entire game staring at their shoes.
  p.headYaw = -p.torsoYaw * 0.55;
  p.headPitch = -p.torsoPitch * 0.45 + 0.02 * gw - stoop * 0.62;
  p.grip = 0.42 + 0.06 * gw;        // compact relaxed hand, closing a little as the arms swing

  // Starting and stopping are changes of weight before they are changes of speed. The movement
  // loop supplies smoothed metres-per-second-squared here; keeping that measurement outside the
  // rig means this same gait can still be posed in the studio with no simulation behind it.
  // Positive is setting off: the chest falls into the next step while the pelvis and loose arms
  // lag a fraction behind. Negative is braking: the hips arrive first, the chest checks back and
  // the knees soften. `surge` is deliberately only a few centimetres. It is enough for the mass
  // to read without moving either planted shoe far enough to expose the trick.
  const accel = motion ? clamp(motion.accel || 0, -4.5, 4.5) / 4.5 : 0;
  const braking = Math.max(0, -accel), launching = Math.max(0, accel);
  p.surge -= launching * 0.018 * (0.35 + 0.65 * gw);
  p.surge += braking * 0.012 * (0.30 + 0.70 * gw);
  p.torsoPitch += launching * 0.105 * (0.25 + 0.75 * gw) - braking * 0.072;
  p.rootDrop += braking * 0.024 * (0.25 + 0.75 * gw);
  p.kneeL -= braking * 0.055; p.kneeR -= braking * 0.055;
  p.shL += accel * 0.055 * (0.35 + 0.65 * gw);
  p.shR += accel * 0.055 * (0.35 + 0.65 * gw);
  p.headPitch -= accel * 0.040;

  // A turn made from a stand is a pivot, not a sideways bank. The walking bank above is right
  // once there is momentum; below about half pace it made a person rotate on two locked legs.
  // Break the inside knee, wind the hips into the turn, let the shoulders and gaze lead it, then
  // let all of that disappear continuously as the ordinary cornering pose takes over.
  const pivot = clamp(turn / 2.8, -1, 1) * still;
  const pk = Math.abs(pivot);
  if (pk > 0.001) {
    p.rootDrop += pk * 0.022;
    p.hipYaw += pivot * 0.085;
    p.torsoYaw += pivot * 0.16;
    p.torsoRoll -= pivot * 0.025;
    p.headYaw += pivot * 0.24;
    if (pivot > 0) {
      p.thighR -= pk * 0.055; p.kneeR -= pk * 0.18; p.ankleR += pk * 0.055;
      p.shLz -= pk * 0.065;
    } else {
      p.thighL -= pk * 0.055; p.kneeL -= pk * 0.18; p.ankleL += pk * 0.055;
      p.shRz += pk * 0.065;
    }
  }

  // Stairs use the room's real change in floor height. Going up needs extra swing-leg clearance
  // and a forward chest; going down keeps both knees soft and lifts the arriving toes. This does
  // not invent a second gait or touch travel speed — it only adapts the shared walk to the slope
  // already being traversed, so the concept-sheet silhouettes remain the same people on steps.
  const climb = motion ? clamp(motion.climb || 0, -0.75, 0.75) / 0.75 : 0;
  const up = Math.max(0, climb), down = Math.max(0, -climb), stair = (up + down) * gw;
  if (stair > 0.002) {
    const clearL = bump(uL, 0.72, 0.34), clearR = bump(uR, 0.72, 0.34);
    p.kneeL -= (0.24 * up + 0.10 * down) * clearL;
    p.kneeR -= (0.24 * up + 0.10 * down) * clearR;
    p.thighL -= 0.075 * up * clearL; p.thighR -= 0.075 * up * clearR;
    p.ankleL -= 0.10 * down * bump(uL, 0.00, 0.13);
    p.ankleR -= 0.10 * down * bump(uR, 0.00, 0.13);
    p.kneeL -= 0.055 * down; p.kneeR -= 0.055 * down;
    p.torsoPitch += 0.12 * up + 0.045 * down;
    p.headPitch -= 0.055 * up;
    p.shLz -= stair * 0.025; p.shRz += stair * 0.025;
  }

  // And what the body is doing while it is not walking — including where the floor is, which
  // `idlePose` owns because the weight shift moves the legs it is measured from. The legs get
  // the narrow ramp and everything above them the wide one, for the reason given at the top.
  return idlePose(p, now, sd, still, 1 - g);
}

// ------------------------------------------------------------------------- reaching
//
// Put a hand on a particular place, rather than near it. Every pose that touches something —
// a switch, a door handle, a tap, a shelf — used to guess a shoulder angle from how high the
// thing was and hope, which is why hands went through cupboard doors and stopped short of
// light switches. The arm is a two-bone chain with the shoulder a rotZ(splay)·rotX(sh) joint
// on a limb hanging down local -Y and the elbow a rotX below it, so all three angles come out
// in closed form: aim the whole chain down the line to the target, bend the elbow by the law
// of cosines, then lift the shoulder by exactly the angle that bend took off the reach.
// The forearm and the hand are rigid with respect to each other, so the second bone of the
// chain runs all the way from the elbow to the middle of the palm and the solve is exact.
// The primitive rig's own arm, in metres at tall 1. These are the *default* bone lengths, not
// the only ones — see `armBones` and the `bones` argument below.
const ARM_UP = 0.292, ARM_LO = 0.353, ARM_REACH = ARM_UP + ARM_LO;
// The two bones for a given figure. Everything else in the pose system is an angle, and angles
// retarget onto any skeleton for free; this is the one place that cares about absolute size, so
// it is the one place that has to be told.
//
// `tall` alone covers the primitive figure, whose arm is these constants scaled. A skinned rig is
// a different body rather than a scaled one — Michelle's upper arm measures 0.242 against this
// rig's 0.292, 17% shorter, and the ratio between her two bones is not this ratio either — so a
// caller driving one passes her measured lengths instead. Ignoring that does not tilt the arm, it
// *misses*: the angles are solved for a chain of the wrong length, and the hand lands centimetres
// off the door handle, by more the further it reaches.
function armBones(lk) {
  const t = (lk && lk.tall) || 1;
  return { up: ARM_UP * t, lo: ARM_LO * t };
}
// `d` is from the shoulder to the target in the torso's own frame: +x to the figure's left as
// drawn, +y up, +z in front. Returns how far short of the target the hand ends up, so a pose
// can lean the body in when the arm alone cannot get there.
// `palm` is which way the hand should be turned — down by default, which is what a hand does
// when it lands on a thigh, a table or a handle. It is a hint, not a constraint: the palm
// faces across the forearm, never along it, so what actually gets used is whatever part of
// the hint the wrist can reach.
// `bones` is `{ up, lo }` in metres, or a number taken as a scale on the default arm. Omitted,
// it is the primitive rig at tall 1 — which is what every existing caller means, so this is
// backwards compatible, and it is also exactly the assumption that is wrong for a skinned
// character or a very tall or short one.
function armTo(p, side, dx, dy, dz, palm, bones) {
  const up = typeof bones === 'number' ? ARM_UP * bones : (bones && bones.up) || ARM_UP;
  const lo = typeof bones === 'number' ? ARM_LO * bones : (bones && bones.lo) || ARM_LO;
  const reach = up + lo;
  const want = Math.max(1e-3, Math.hypot(dx, dy, dz));
  const ux = dx / want, uy = dy / want, uz = dz / want;
  // Aim: the chain's direction is (cos(sh)sin(splay), -cos(sh)cos(splay), -sin(sh)).
  const aim = Math.asin(clamp(-uz, -1, 1));
  p['sh' + side + 'z'] = Math.atan2(ux, -uy);
  // Bend: an elbow neither locks straight nor folds shut, so the reach is clamped either side.
  const r = clamp(want, Math.abs(up - lo) + 0.06, reach - 0.012);
  const e = Math.acos(clamp((r * r - up * up - lo * lo)
    / (2 * up * lo), -1, 1));
  p['elb' + side] = -e;
  const shoulder = aim + Math.asin(clamp(lo * Math.sin(e) / r, -1, 1));
  p['sh' + side] = shoulder;
  // Roll the palm. The shoulder and elbow are both spent getting the hand to the right place,
  // so the twist is the only joint left that decides which way it is turned when it arrives —
  // and a hand that arrives edge-on is worse than one that misses. The palm looks along the
  // wrist frame's +z and the twist sweeps it through that frame's xz plane, so the answer is
  // just the hint resolved onto those two axes, taken here in torso space.
  const px = palm ? palm[0] : 0, py = palm ? palm[1] : -1, pz = palm ? palm[2] : 0;
  const splay = p['sh' + side + 'z'], se = shoulder + p['elb' + side];
  const cs = Math.cos(se), ss = Math.sin(se), cz = Math.cos(splay), sz = Math.sin(splay);
  p['tw' + side] = clamp(
    Math.atan2(px * cz + py * sz, px * ss * sz - py * ss * cz + pz * cs), -1.9, 1.9);
  return Math.max(0, want - reach);
}

// Eyes are what make a face alive: they blink on their own clock and never sit quite still.
// `rate` scales how often, not how long: a nervous person blinks more frequently, not more
// slowly, and stretching the closure instead reads as somebody falling asleep.
function blinkOf(now, seed, rate = 1) {
  const period = (3300 + (seed % 9) * 480) / (rate || 1);
  const clock = (now + seed * 977) / period, cycle = Math.floor(clock);
  const t = (clock - cycle) * period;
  // Eyelids close faster than they open and pause for a few milliseconds at full closure. A
  // sine was symmetrical and looked like the eye was being squeezed rather than blinked.
  const pulse = x => {
    if (x < 0 || x >= 182) return 0;
    if (x < 52) return smooth01(x / 52);
    if (x < 82) return 1;
    return 1 - smooth01((x - 82) / 100);
  };
  // Roughly one blink in five is followed by a smaller second one. Deterministic per person and
  // cycle, so a reload does not reshuffle a portrait and a whole crowd never doubles together.
  const h = Math.sin((cycle + 1) * 91.713 + seed * 17.17) * 43758.5453;
  const twice = h - Math.floor(h) < 0.21;
  return Math.max(pulse(t), twice ? pulse(t - 238) * 0.84 : 0);
}
// How much the eyes wander within the head. Scaled per person, this is the difference between
// somebody taking the street in and somebody who has stopped noticing it.
function saccade(now, seed, out, k = 1) {
  // Eyes fix on a point, jump, then fix again. Smooth sinusoids make them swim continuously.
  // The target is generated from a time cell, with only the first tenth of the next cell spent
  // crossing to it; a tiny tremor remains so a held look is not a painted pupil.
  const span = 1120 + (Math.abs(seed) % 7) * 83;
  const q = (now + seed * 613) / span, cell = Math.floor(q), u = q - cell;
  const rnd = (n, salt) => {
    const h = Math.sin((n + 1) * 127.1 + (seed + salt) * 311.7) * 43758.5453;
    return (h - Math.floor(h)) * 2 - 1;
  };
  const a = Math.min(1, smooth01(u / 0.11));
  const yaw = lerp(rnd(cell - 1, 3), rnd(cell, 3), a) * 0.115;
  const pitch = lerp(rnd(cell - 1, 9), rnd(cell, 9), a) * 0.055;
  out.eyeYaw = (yaw + Math.sin(now / 97 + seed) * 0.004) * k;
  out.eyePitch = (pitch + Math.sin(now / 131 + seed * 2) * 0.003) * k;
  return out;
}

// `lod`: 0 close enough for fingers and eyelashes, 1 mid, 2 a figure down the street.
// `lift` is how high the floor is where they are standing, in metres and not scaled by their
// height: everything in this game walks on a plane at zero except on the subway station's stairs,
// and somebody climbing those has to rise with the treads rather than wade up through them.
function drawFigure(pose, px, pz, yaw, lk, lod, holder, lift = 0) {
  const T = lk.tall, W = lk.wide, FRAME = lk.shoulder || W;
  const ARM = lk.armScale || W, LEGW = lk.legScale || W, HIPW = lk.hipScale || W;
  const YOUTH = lk.youth || 0, BODY = 1 - .22 * YOUTH;
  const HAND = (lk.handScale || 1) * (1 - .18 * YOUTH);
  const FOOT = (lk.footScale || 1) * (1 - .18 * YOUTH);
  // This person's head. Hoisted to the top of the draw because the neck, the collar and the
  // scarf are placed against it as well as the face is, and those come first.
  const F = lk.F || FACE;
  // The garment trim — lapels, collar wings, a scarf tail, the lumps of a perm, the seams on a
  // gilet — is what makes somebody a specific person at conversational range and is entirely
  // invisible at the far LOD, where it was still costing 13 draws a head on the tier the
  // crowds are drawn at. `trim` is the one test for all of it.
  const trim = lod < 2;
  // How much radius a `limb` still has at its far end, from the mesh that defines it. Every joint
  // below is sized `segmentWidth * TAPER`, which is the widest a joint can be without standing
  // proud of the segment feeding it — the peg-joint artefact, expressed once instead of six times.
  const TAPER = R.limbTaper || 0.66;
  // A 1.77 m adult now has an 85 cm hip-to-ankle chain instead of an 82 cm one, with the head
  // anchor shortened by the same amount below. Total height is unchanged; the figure simply no
  // longer has the long torso and short legs of a toy. The revised sum also lands the sole on the
  // floor rather than two centimetres through it.
  const HIP = 0.91 * T, THIGH = 0.430 * T, SHIN = 0.420 * T;
  // Pelvis: the body's weight shifts sideways onto the stance leg and the hips rotate with
  // the swinging one. Both are small, and both are what stop a walk reading as a shuffle.
  const root = M.mul(M.trans(px, (pose.bob - pose.rootDrop) * T + lift, pz),
    M.mul(M.rotY(yaw + pose.hipYaw), M.trans(pose.sway, 0, pose.surge || 0)));
  const shape = (name, parent, x, y, z, sx, sy, sz, color, mat = FABRIC) =>
    R.draw(name, M.mul(parent, M.mul(M.trans(x, y, z), M.scale(sx, sy, sz))), color, mat);

  // Sign conventions, because getting either of them backwards is not subtle and both were:
  // a *negative* thigh swings the leg forward, and a *negative* knee bends it — heel toward
  // the backside, the only way a knee goes. The knee is therefore applied negated. Every pose
  // in the game was written to that convention; the rig was the thing that disagreed, and
  // until this was flipped the swing leg quietly hyperextended through every stride and a
  // seated figure folded its shins up behind it.
  function leg(x, thigh, knee, ankle) {
    knee = -knee;
    const hip = M.mul(root, M.mul(M.trans(x * HIPW, HIP, 0), M.rotX(thigh)));
    // Tapered: heavy at the hip, narrowing into the knee, and the same again down the shin.
    shape('limb', hip, 0, -THIGH * 0.50, 0, 0.142 * LEGW, THIGH + 0.055,
      0.152 * LEGW, lk.LEG,
      lk.SKIRT ? SKINM : FABRIC);
    // The knee, sized off the thigh that feeds it rather than by hand.
    //
    // Measured, because it is the single thing that made this rig read as assembled from parts.
    // The `limb` mesh keeps `R.limbTaper` of its radius at the far end, so a thigh at 0.142 W
    // arrives at the knee 0.0469 wide. The knee ball was 0.0540 and the shin started at 0.0560 —
    // so the silhouette ran *in* to a waist and then *out* to a ball sitting on it, which is not
    // a knee, it is a peg joint. Every limb on the figure did it, at both ends.
    //
    // Hand-tuned numbers fixed it once and did not stay fixed: the elbow below was written the
    // same way and silently lost its `* W`, so on a broad build the forearm left it 21% wider and
    // the peg came straight back on thirteen of eighteen presets — invisible at the default build
    // where W is 1, which is where it was measured. Deriving the ball from the segment makes that
    // whole class of mistake unrepresentable, which is why the taper is now asked for rather than
    // written down. The shin then leaves the knee barely wider before tapering to a thin ankle, so
    // the outline is continuous from hip to foot and the calf is the only swell in it.
    const kn = M.mul(hip, M.mul(M.trans(0, -THIGH + 0.018, 0), M.rotX(knee)));
    shape('ball', kn, 0, 0.004, 0.008, 0.142 * LEGW * TAPER, 0.092,
      0.152 * LEGW * TAPER, lk.LEG,
      lk.SKIRT ? SKINM : FABRIC);
    shape('limb', kn, 0, -SHIN * 0.50, 0, 0.100 * LEGW, SHIN + 0.045,
      0.110 * LEGW, lk.LEG,
      lk.SKIRT ? SKINM : FABRIC);
    shape('ball', kn, 0, -SHIN + 0.030, 0.004, 0.072 * LEGW, 0.062,
      0.078 * LEGW, lk.SOLE, SHOEM);

    // A layered oval sneaker reads as a foot without returning to a box primitive. The ankle
    // keeps it level with the floor, then rolls through push-off and heel strike.
    const foot = M.mul(kn, M.mul(M.trans(0, -SHIN + 0.025, 0), M.rotX(ankle - (thigh + knee))));
    shape('ball', foot, 0, -0.035, 0.082 * FOOT, 0.140 * FOOT, 0.098, 0.260 * FOOT,
      lk.SHOE, SHOEM);
    shape('ball', foot, 0, -0.074, 0.084 * FOOT, 0.146 * FOOT, 0.048, 0.268 * FOOT,
      lk.SOLE, SHOEM);
    shape('ball', foot, 0, -0.020, 0.176 * FOOT, 0.130 * FOOT, 0.082, 0.120 * FOOT,
      lk.SHOE, SHOEM);
    // Toe cap, heel counter and a lace band. Each one is deliberately proud of the shell
    // beneath it, so the shoe reads as built from parts instead of as one smooth pebble.
    shape('ball', foot, 0, -0.046, 0.192 * FOOT, 0.126 * FOOT, 0.064, 0.090 * FOOT,
      lk.SOLE, SHOEM);
    shape('ball', foot, 0, -0.010, -0.016 * FOOT, 0.136 * FOOT, 0.092, 0.100 * FOOT,
      lk.SHOE, SHOEM);
    if (lod < 2) shape('capsule', foot, 0, 0.008, 0.064 * FOOT, 0.116 * FOOT, 0.026,
      0.028 * FOOT, lk.SOLE, SHOEM);
  }
  leg(-0.098, pose.thighL, pose.kneeL, pose.ankleL);
  leg( 0.098, pose.thighR, pose.kneeR, pose.ankleR);
  const BELOW = lk.SKIRT || lk.PANTS;
  shape('ball', root, 0, HIP - 0.015, 0, 0.31 * HIPW, 0.22, 0.20 * HIPW, BELOW);
  // Waistband: the one place trousers and shirt actually meet.
  shape('capsule', root, 0, HIP + 0.045, 0, 0.30 * HIPW, 0.055, 0.198 * HIPW, BELOW,
    { mode: 7, gloss: 0.06 });
  if (lk.SKIRT) {
    // Two stacked panels rather than the taper mesh: the taper's 0.36 top-to-bottom ratio is
    // far too flared to be a skirt — it comes out as a traffic cone — and a pair of soft boxes
    // with a generous round hangs like cloth and takes a hem. One panel and not two stacked to
    // fake an A-line flare: the step between the two was a hard ring at mid-thigh and the whole
    // thing came out segmented, like a barrel worn over the hips. What sets its depth is the
    // swinging thigh — at the hem, 0.30 below the hip, a thigh at a walking 0.35 rad has carried
    // its front face about 0.19 forward against a panel 0.12 W deep — so a fast walk still shows
    // a knee through the front. Hence the hem above the knee, and hence the skirts in the roster
    // going to people who mostly stand rather than to the ones who cross the map.
    shape('softBox', root, 0, HIP - 0.145, 0, 0.322 * W, 0.335, 0.238 * W, lk.SKIRT,
      { mode: 7, round: 0.100 });
    shape('capsule', root, 0, HIP - 0.300, 0, 0.326 * W, 0.020, 0.242 * W, lk.SKIRTD,
      { mode: 7 });
  }

  // Shoulders counter-rotate against the hips and bank into turns.
  const torso = M.mul(root, M.mul(M.trans(0, HIP, 0),
    M.mul(M.rotY(pose.torsoYaw), M.mul(M.rotZ(pose.torsoRoll),
      M.rotX(pose.recline + pose.torsoPitch + lk.stoop)))));

  if (lk.bag === 'shoulder') {
    // A satchel worn on the left hip with the strap across the chest — the bag most of this
    // city actually carries. Drawn before the torso so the strap passes under the shoulder
    // ball rather than floating off it.
    // Outboard of the arm and set back, not inside it.
    //
    // The satchel sat at x -0.238 with a 0.1125 half width, so it spanned -0.126 to -0.351. The
    // arm hangs from a shoulder at x 0.225 and is about 50 mm through, occupying roughly -0.175
    // to -0.275 — straight through the middle of the bag. From any angle the bag was *in* the
    // forearm rather than beside it, which is what a satchel on a hip must never be.
    //
    // -0.300 clears the arm's inner edge, and -0.062 in z puts it behind the arm line, which is
    // where a satchel pushed back off the hip actually rides when you are walking.
    // Behind the arm, not beside it. A satchel is worn on the body, so unlike the tote it cannot
    // move onto the wrist — and it cannot clear the arm sideways either: at 0.225 half-width it
    // overlaps the arm's x band from any position that still reads as "on the hip".
    //
    // So the clearance is taken in z. The arm hangs about 56 mm through, centred near z 0; the bag
    // is 60 mm deep. z -0.125 puts its front face at -0.065, 9 mm clear behind the arm's back
    // edge — which is also where a satchel actually sits once the strap has pulled it round.
    // Checked in both axes rather than one: the previous attempt cleared in x on paper and was
    // still inside the arm, because it was only ever measured along x.
    shape('softBox', torso, -0.250, 0.135, -0.125, 0.225, 0.235, 0.120, lk.BAG);
    if (trim) shape('softBox', torso, -0.250, 0.228, -0.073, 0.231, 0.080, 0.036, lk.BAGD);
    // From the left hip up over the right shoulder. The capsule runs along its own Y, so the
    // angle belongs in the model matrix; `rz` in the options object is not read by R.draw.
    // On the chest, not in it. At z 0.010 this ran up the middle of a trunk 0.12 deep — the strap
    // was inside the man for its whole length and only the bag and its hip flap were ever seen.
    R.draw('capsule', M.mul(torso, M.mul(M.trans(-0.055, 0.395, 0.120),
      M.mul(M.rotZ(-0.72), M.scale(0.030, 0.560, 0.026)))), lk.BAGD, FABRIC);
  } else if (lk.bag === 'tote') {
    // A cloth bag hanging off one hand's side of the body, and the loop of its handle. Light
    // enough that it swings with the torso rather than being strapped to it.
    // Carried at arm's length, in front of the hanging arm rather than through it. At x -0.250
    // and z 0.010 the bag's 0.1075 half width ran from -0.143 to -0.358 and the arm hangs at
    // -0.175 to -0.275, so the tote was drawn inside the forearm along its whole length. A tote
    // hangs from a hand, so out and *forward* is both the fix and the truth — the handle now
    // reaches up to where a hand actually is instead of into the elbow.
    // Drawn later, off the left wrist — see after the arms. A tote is carried in a hand, and
    // hanging it on the torso is what put it inside the forearm however far out it was slid: a
    // 0.215-wide bag beside a limb only 112 mm off the body cannot clear by moving sideways.
  } else if (lk.bag === 'delivery') {
    // The square insulated box is the courier's whole silhouette. A rounded daypack made him
    // look like a student in a helmet; the hinged lid, reflective band and broad harness make
    // this a working delivery pack even when the rider is seen through a half-open doorway.
    shape('softBox', torso, 0, 0.310, -0.240, 0.300, 0.430, 0.205, lk.BAG,
      { mode: 7, round: 0.035 });
    shape('softBox', torso, 0, 0.535, -0.240, 0.315, 0.070, 0.215, lk.BAGD,
      { mode: 7, round: 0.026 });
    // The livery panel and the reflective strip, on the back of the box rather than floating
    // behind it. Both were at z -0.452. The box is centred at -0.240 and 0.205 deep, so its back
    // face is at -0.3425 — these were hanging **11 cm out in open air**, invisible from directly
    // astern and unmistakable from any side angle, which is most of how a rider is ever seen.
    // -0.350 buries the inner face 2 mm into the box and stands the panel proud of it.
    shape('softBox', torso, 0, 0.305, -0.350, 0.238, 0.105, 0.018, lk.BADGE || C('#e7e0c8'),
      { mode: 1, round: 0.016 });
    shape('capsule', torso, 0, 0.157, -0.350, 0.246, 0.026, 0.020, lk.BAGD, FABRIC);
    for (const s of [-1, 1]) {
      R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.128, 0.585, -0.030),
        M.mul(M.rotX(Math.PI / 2), M.scale(0.042, 0.250, 0.030)))), WEBB, FABRIC);
      shape('capsule', torso, s * 0.137, 0.395, 0.130, 0.042, 0.355, 0.024, WEBB);
    }
  }
  if (lk.bag === 'pack') {
    // A daypack, not a trekking pack, carried clear of the back rather than sunk into it.
    const PK = lk.PACK || PACK, PKL = lk.PACKL || PACKL, PKD = lk.PACKD || PACK;
    shape('softBox', torso, 0, 0.295, -0.1955, 0.230, 0.345, 0.135, PK);
    for (const s of [-1, 1])
      shape('ball', torso, s * 0.104, 0.295, -0.194, 0.062, 0.320, 0.126, PK);
    shape('ball', torso, 0, 0.425, -0.196, 0.212, 0.110, 0.130, PKL);
    shape('softBox', torso, 0, 0.215, -0.272, 0.140, 0.115, 0.048, PKL);
    shape('capsule', torso, 0, 0.505, -0.196, 0.018, 0.085, 0.020, STRAP);
    // The zip across the lid and a stretch pocket on each flank. Without them the pack is a
    // rounded block in one colour, and from behind — which is the view of it the game spends
    // most of its time showing — that is all it ever was.
    R.draw('capsule', M.mul(torso, M.mul(M.trans(0, 0.372, -0.262),
      M.mul(M.rotZ(Math.PI / 2), M.scale(0.013, 0.205, 0.013)))), PKD, FABRIC);
    for (const s of [-1, 1]) {
      shape('softBox', torso, s * 0.136, 0.248, -0.196, 0.048, 0.175, 0.112, PKD);
      R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.150, 0.372, -0.196),
        M.mul(M.rotX(Math.PI / 2), M.scale(0.014, 0.115, 0.014)))), STRAP, FABRIC);
    }
    for (const s of [-1, 1]) {
      // Riding over the shoulder, then down the chest, so the pack is clearly worn. Thick and
      // in a light webbing colour these read as a pair of orange braces from the front.
      //
      // It has to ride *on* the shoulder. At 0.596 this capsule sat below the crown of the
      // trapezius and passed clean through it, so the only parts of it anybody ever saw were
      // its two end caps — a dark disc on the chest and another on the back, each with cloth
      // all the way round it. On the default character, from the front, that is a bullet hole
      // in each shoulder. Raised to sit tangent to the top of the shoulder and shortened, it
      // now shows along its length over the trapezius and runs out at each end where the
      // shoulder falls away, which is what a strap does.
      R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.126, 0.634, 0.000),
        M.mul(M.rotX(Math.PI / 2), M.scale(0.036, 0.205, 0.026)))), WEBB, FABRIC);
      // Out from 0.106 to 0.130. The chest surface here is 0.124, and with a coat over it 0.127,
      // so the strap's front face at 0.116 was behind the cloth along its whole length: it broke
      // the surface only where the chest curved away from it, which is why it read as a pair of
      // dark ovals rather than as webbing — the near-tangent failure the beard shell above
      // documents, and the same one the tousled locks have.
      shape('capsule', torso, s * 0.132, 0.400, 0.130, 0.038, 0.34, 0.020, WEBB);
    }
  }

  // The purpose-built body mesh supplies a waist, chest and sloping shoulders.
  //
  // TRUNK WIDTH, measured. At 0.50 W the mesh came out 40 cm across and 24 cm deep at the chest —
  // a width-to-depth ratio of 1.65 rising to 1.81 at the shoulder, against about 1.45 on a real
  // ribcage. That is the "flat-fronted slab": a trunk that is broadest exactly where it should be
  // roundest. Two further things followed from it, and both were worse than the flatness.
  //
  // There was no waist. The mesh's narrowest ring is its *hem*, and it widens monotonically from
  // there to the chest, so the pelvis ball below (0.155 half-width) was narrower than the shirt
  // above it and the body ran straight from armpit to thigh in one column.
  //
  // And the ribcage filled the whole bideltoid width. The arm pivots at 0.225 and the trunk
  // reached 0.201, leaving 24 mm for a deltoid to live in — so the shoulders could only ever be
  // balls perched on the corners of a barrel, which is exactly how they read.
  //
  // 0.44 puts the chest at 35 cm across against 23 cm deep (1.45, human), drops the hem to 26 cm
  // so the pelvis now flares 2 cm proud of it on each side — that step *is* the waist — and opens
  // up 5 cm each side for the deltoid to bridge. Nothing mounted on the front of the chest moves,
  // because none of it is placed against the trunk's width.
  //
  // The remaining half of the problem is the profile table itself and is not mine to change: see
  // makeBody in js/gl.js. It needs a genuine waist (a dip in rx around the middle rings) and a
  // shoulder that slopes rather than one that loses 19 cm of width in the top 3.7 cm and leaves a
  // shelf with a lip on it. The trapezius and deltoid below are currently covering that shelf.
  shape('body', torso, 0, 0.31 * BODY, 0, 0.440 * W, 0.62 * BODY, 0.48 * W, lk.TOP);

  if (lk.VEST) {
    // A gilet, a work tabard, a waistcoat. Built out of flat panels first, and a flat panel is
    // exactly what it looked like: a board hung off the chest, wider than the man behind it.
    // The body mesh a few millimetres larger has the chest and waist already, and the deltoids
    // drawn further down in the *sleeve's* colour cut the armholes back out of it — which is
    // the whole difference between a gilet and a jacket, and it costs nothing.
    shape('body', torso, 0, 0.312 * BODY, -0.002, 0.458 * W, 0.630 * BODY, 0.502 * W,
      lk.VEST);
    if (trim) {
      shape('capsule', torso, 0, 0.300 * BODY, 0.126, 0.012, 0.410 * BODY, 0.012, lk.VESTD,
        { mode: 7, gloss: 0.10 });
      shape('capsule', torso, 0, 0.046 * BODY, 0, 0.320 * W, 0.030 * BODY, 0.250 * W,
        lk.VESTD, { mode: 7 });
    }
  }
  if (lk.JACK) {
    // A gilet goes *over* a coat, never under one — a courier, a warehouseman and a guard all
    // wear the hi-vis outermost, because the whole point of it is to be the thing that is seen.
    // The rig had it the other way round and did it silently: the coat's shell is 0.462 W by
    // 0.505 W and the gilet's is 0.458 by 0.502, so the coat encloses it by 1.6 mm at the chest
    // and 0.8 mm in depth — everywhere, with no gap anywhere for it to show through. A figure in
    // both came out as a plain coat, and 快递员's orange survived only as the 12 mm zip capsule
    // standing proud down the front: one orange thread on a slate chest.
    //
    // So when a gilet is worn the coat stops being a torso and becomes what you can actually see
    // of a coat underneath one — sleeves, shoulders, collar and the hem below it. The sleeves and
    // deltoids already come from `lk.ARM`, which is the jacket whenever there is one, so they
    // need nothing here; what has to go is the shell and the two pieces of front trim that would
    // otherwise poke through the gilet. Both would: the lapels and the placket strip reach
    // z 0.130 against the gilet's front face at 0.1265, so at 3.5 mm proud they would read as a
    // pair of ridges moulded into the hi-vis.
    //
    // The hem ring stays. At 0.161 half-width against the gilet's 0.155 it stands 6 mm out at the
    // waist, which is the coat showing below the gilet — the one part of it you do still see.
    const under = !!lk.VEST;
    // The coat is the same torso a few millimetres bigger all round, so it sits *on* the shirt
    // rather than replacing it and the shirt shows down the opening. Steadier than building a
    // coat out of panels: the body mesh already has the shoulders and the waist in it.
    if (!under)
      shape('body', torso, 0, 0.312 * BODY, -0.002, 0.462 * W, 0.634 * BODY, 0.505 * W,
        lk.JACK);
    // Whatever is underneath, showing down the front. A gilet worn beneath wins over the shirt.
    // Kept narrow: run down to the waist at the full width of the opening and it came out as a
    // cream bib hanging off the man's neck, which is not what an open coat looks like. Skipped
    // when a scarf is worn — the scarf fills the opening, and the strip beside its hanging tail
    // read as a second, clashing stripe.
    if (!lk.SCARF && !under)
      shape('softBox', torso, 0, 0.392 * BODY, 0.120, 0.094, 0.320 * BODY, 0.020,
        lk.TOP,
        { mode: 7, round: 0.022 });
    // Lapels: a flat panel down each side of that opening, its inner edge along the shirt and its
    // top folded back toward the collar, so the two of them read as the front of a coat rather
    // than as a pair of pads on the chest — which is what they were, short and pill-round and set
    // out on the pectorals with a gap between them and the shirt. Flatter, longer, drawn in
    // against the opening and only just proud of the coat, they close the V instead.
    if (trim) {
      if (!under) for (const s of [-1, 1])
        R.draw('softBox', M.mul(torso, M.mul(M.trans(s * 0.086, 0.452 * BODY, 0.118),
          M.mul(M.rotZ(s * 0.22), M.scale(0.084, 0.330 * BODY, 0.024)))), lk.JACKD,
          { mode: 7, round: 0.010 });
      shape('capsule', torso, 0, 0.048 * BODY, 0, 0.322 * W, 0.032 * BODY, 0.252 * W,
        lk.JACKD, { mode: 7 });
    }
  }
  if (lk.apron) {
    // An apron is a bib, a skirt and the waist between them — not one board.
    //
    // It was a single softBox 0.360 W across and 0.560 BODY tall: as wide as the whole trunk and
    // running unbroken from the collarbone to the hip, 27 mm thick, with its front face standing
    // 2.4 cm off a chest that is only 1.5 cm proud of it to begin with. Nothing about that is
    // cloth. It is a signboard, and the neck strap under it was worse — parked at z 0.088 against
    // a chest surface at 0.114, it was *inside the man* and had never been visible at all.
    //
    // Cloth needs three things here and none of them cost much. A bib is narrow, about 26 cm, and
    // stops at the waist. The skirt below it is the wide part and hangs past the hips. And the
    // whole thing is tied on, which is what the neck loop and the waist band say — an apron that
    // is not visibly tied is an apron that is hanging on a hook.
    //
    // The two panels are the lod-2 read, so they stay at every distance and the count there is
    // unchanged at two. The loop and the tie are what you only see up close, so they are `trim`.
    // `round` has to stay *under* the panel's half-thickness. Set equal to it the flat face has
    // no area left, the normal there is degenerate and the middle of the apron renders as a dark
    // rounded patch — which is what the first version of this did.
    shape('softBox', torso, 0, 0.430 * BODY, 0.123, 0.260 * W, 0.250 * BODY, 0.026,
      lk.apron, { mode: 7, round: 0.009 });
    shape('softBox', torso, 0, 0.150 * BODY, 0.116, 0.310 * W, 0.330 * BODY, 0.032,
      lk.apron, { mode: 7, round: 0.012 });
    if (trim) {
      // The neck strap is a loop, so from the front it is two straps rising from the corners of
      // the bib to the neck — not the single horizontal bar this was, which read as a yoke laid
      // across the chest. And the old one sat at z 0.088 against a chest surface at 0.114: it
      // was inside the man, and had never once been visible.
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.0875 * W, 0.5975 * BODY, 0.104),
          M.mul(M.rotZ(s * 0.785), M.scale(0.026, 0.120 * BODY, 0.024)))), lk.apron, FABRIC);
      // The waist tie, round the body over the join between bib and skirt. Proud of the apron's
      // own front by 11 mm so it reads as a band rather than as a printed stripe, and kept in to
      // 0.155 at the sides so it does not reach across the gap to the arm as a floating stub.
      shape('capsule', torso, 0, 0.300 * BODY, 0, 0.310 * W, 0.026 * BODY, 0.290 * W,
        lk.apron, { mode: 7 });
    }
  }
  // Rounded deltoids bridge torso and sleeves, so they belong to whichever layer the sleeve
  // does — the coat, the yoke of a raglan tee, or the shirt. A singlet leaves them bare, and
  // then the only cloth on the shoulder is the strap.
  const bareArm = lk.sleeve === 'none';
  // The deltoid, and it has to do a real job rather than cap a corner.
  //
  // Measured, at the old numbers: the trunk's surface at the shoulder was 0.200 out and 0.119
  // deep, the arm pivots at 0.225 and is 0.060 deep, and the deltoid ball spanned x 0.061–0.236
  // at 0.103 deep. So it was *shallower than the trunk it sat against* — the chest's front
  // surface stood 16 mm proud of it — and it stopped 45 mm short of the arm's outer line. What
  // you saw was therefore a sphere half-sunk in a slab with a hard crease round it on one side
  // and a bare step down to a tube on the other: a pauldron and a peg, which is the single most
  // action-figure thing left on this rig.
  //
  // It now spans 0.060–0.271 against an arm whose outer edge is 0.281, so the outboard end runs
  // into the arm's own line instead of stopping beside it, and it is deep enough that the trunk
  // no longer cuts across it. The inboard end is buried well inside the chest, so there is no
  // seam there to see. The narrowed trunk above is what makes the room for this.
  for (const s of [-1, 1]) {
    if (bareArm) {
      shape('ball', torso, s * 0.170 * FRAME, 0.478 * BODY, -0.002, 0.154 * ARM,
        0.152 * BODY, 0.164 * ARM,
        lk.SKIN, SKINM);
      shape('softBox', torso, s * 0.118 * FRAME, 0.570 * BODY, -0.004, 0.058,
        0.034 * BODY, 0.190 * W, lk.ARML,
        { mode: 7, round: 0.014 });
    } else {
      shape('ball', torso, s * 0.170 * FRAME, 0.478 * BODY, -0.002, 0.160 * ARM,
        0.158 * BODY, 0.170 * ARM, lk.ARML);
    }
  }
  shape('ball', torso, 0, 0.545 * BODY, -0.008, 0.158 * W, 0.108 * BODY, 0.174 * W,
    lk.JACK ? lk.JACKL : lk.TOPL);
  // Trapezius: the slope from neck to shoulder, which is most of what reads as a real body
  // from behind. Without it the neck comes out of a flat shelf — and there is a literal shelf
  // to cover, because the body mesh sheds 19 cm of width in the top 3.7 cm of its height. Wider
  // and deeper than before so it reaches the deltoid's inboard end rather than stopping halfway
  // and leaving the shelf's lip showing between the two.
  for (const s of [-1, 1])
    shape('ball', torso, s * 0.082 * FRAME, 0.598 * BODY, -0.018, 0.135 * W,
      0.104 * BODY, 0.150 * W,
      lk.JACK ? lk.JACKL : lk.ARML);
  // Half-embedded placket and a hem, so the shirt reads as cloth with edges. Both are skipped
  // under an outer layer that has edges of its own — drawn anyway they show *through* the coat.
  //
  // Both were also placed against a chest that moves and a chest that had moved. The placket sat
  // at a fixed z 0.118 while the surface it is mounted on is `0.252 * 0.48 * W` deep, so it was
  // proud on a narrow build and *inside the body* on anything above about wide 0.98 — which is
  // most of the roster, since an unset `wide` seeds 0.94 to 1.14. In between it was coplanar,
  // which is a flicker waiting for a camera angle. The hem was simply 2 mm under the surface
  // along its whole length and had never been visible at all.
  //
  // Both now scale with the trunk and clear it by ~8 mm, which is the same rule as everything
  // else mounted on this body: measure the face of the thing you are sitting on, not its centre.
  // Same test as `ctx.over` below, and for the same reason — an `outer` coat covers this chest
  // just as a jacket does, and this file must not be the fourth one getting that answer wrong.
  if (!lk.JACK && !lk.VEST && !lk.OUTER && lk.collar !== 'vneck')
    shape('capsule', torso, 0, 0.305 * BODY, 0.1215 * W + 0.008, 0.014, 0.43 * BODY, 0.012,
      lk.TOPD, { gloss: 0.10, mode: 7 });
  if (!lk.JACK && !lk.OUTER)
    shape('capsule', torso, 0, 0.055 * BODY, 0, 0.316 * W, 0.030 * BODY, 0.250 * W, lk.TOPD,
      { mode: 7, gloss: 0.06 });

  // The base of the neck, where it becomes shoulder — and the reason the head used to look
  // plugged in rather than attached.
  //
  // Measured: the body mesh's neck opening is 55.4 mm across, the neck arrives at it 29 mm across,
  // and the 26 mm of difference was flat disc. Worse, the `limb` mesh keeps 66% of its radius at
  // its *far* end, so the neck was 44 mm under the jaw and 29 mm at the shoulders — tapering the
  // wrong way down its whole length. A real neck does the opposite: it is narrowest under the ear
  // and flares into the trapezius, and that flare is the whole of what reads as a join.
  //
  // So this is a fillet, sized off both things it has to meet rather than chosen: it is wider than
  // the opening at the plane of the opening, and has narrowed to the neck's own width by the time
  // it reaches the jawline, where it ends. Nothing above the fillet changes, and a collar drawn
  // over it hides it entirely — which is correct, because a collar is what hides a real one.
  shape('ball', torso, 0, 0.615 * BODY, 0.008,
    0.062 * W, 0.058 * BODY, 0.050 * W, lk.SKIN, SKINM);

  // Neck: short, and set slightly forward of the spine, with the collar high around it. Long
  // and wide, with the collar sitting low, the head read as a ball balanced on a length of pipe.
  shape('limb', torso, 0, F.neckY * BODY, 0.008, F.neckW, F.neckH * BODY,
    F.neckW + 0.004,
    lk.SKIN, SKINM);

  // ---- the neckline. Crew is the plain band the cast started in; the rest are most of what
  // separates a clerk from a labourer at fifteen metres, which is the distance this game is
  // usually looked at from.
  const col = lk.collar, NECKC = lk.JACK ? lk.JACKL : lk.TOPL;
  if (col !== 'vneck')
    shape('capsule', torso, 0, F.collarY * BODY, 0.004, 0.122, 0.042 * BODY, 0.126,
      NECKC, { mode: 7 });
  if (col === 'turtle')
    shape('limb', torso, 0, (F.collarY + 0.050) * BODY, 0.006, 0.116,
      0.100 * BODY, 0.120, lk.TOPL,
      { mode: 7 });
  if (col === 'vneck' && trim)
    // No band at all: two strips down from the collarbones to a point on the chest.
    for (const s of [-1, 1])
      R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.046, 0.548 * BODY, 0.100),
        M.mul(M.rotZ(s * 0.46), M.scale(0.022, 0.185 * BODY, 0.022)))), lk.TOPD,
        { mode: 7 });
  if ((col === 'shirt' || col === 'polo') && trim) {
    // A turned-down collar: a wing each side of the neck, splayed outward and tipped forward.
    // Tipped only slightly it lies flat and reads as two tabs stuck on sideways; it wants to
    // be turning down over the collarbone, which is most of the angle.
    const k = col === 'shirt' ? 1 : 0.80;
    for (const s of [-1, 1])
      R.draw('softBox', M.mul(torso, M.mul(M.trans(s * 0.062, (F.collarY + 0.004) * BODY, 0.052),
        M.mul(M.mul(M.rotY(s * -0.50), M.rotX(0.52)),
              M.scale(0.086 * k, 0.026 * BODY, 0.092 * k)))), NECKC,
        { mode: 7, round: 0.012 });
  }
  if (col === 'hood') {
    // The hood *down*, bunched behind the neck. Up it would hide the face, and the face is the
    // whole reason this rig exists.
    shape('ball', torso, 0, 0.605 * BODY, -0.118, 0.215, 0.175 * BODY, 0.160,
      lk.ARM, { mode: 7 });
    shape('capsule', torso, 0, 0.664 * BODY, -0.090, 0.148, 0.038 * BODY, 0.040,
      lk.ARMD, { mode: 7 });
  }
  if (lk.SCARF) {
    // Wound twice round the neck with a tail down the chest. Beijing, November onward.
    shape('capsule', torso, 0, (F.collarY + 0.020) * BODY, 0.004, 0.136,
      0.046 * BODY, 0.138, lk.SCARF,
      { mode: 7 });
    shape('capsule', torso, 0, (F.collarY - 0.026) * BODY, 0.004, 0.144,
      0.038 * BODY, 0.144, lk.SCARFD,
      { mode: 7 });
    // The tail, hanging down the front from the wrap, just off centre. With the coat's shirt
    // strip suppressed under the scarf it is the one vertical accent on the chest rather than one
    // of two competing stripes, which is what it was beside that strip.
    if (trim)
      shape('softBox', torso, -0.045, 0.430 * BODY, 0.128, 0.058, 0.235 * BODY,
        0.030, lk.SCARF,
        { mode: 7, round: 0.02 });
  }
  if (trim && lk.BADGE) {
    // A small enamel name plate gives shop and transport uniforms a readable job cue without
    // putting illegible text on a character-sized prop. It sits on whichever outer layer is worn.
    // Pulled in from 0.145: on the narrower trunk above, a plate reaching 0.198 hung 2.5 cm off
    // the edge of the chest and read as a badge pinned to the air beside him.
    shape('softBox', torso, 0.112 * W, 0.445 * BODY, 0.142, 0.105,
      0.056 * BODY, 0.016, lk.BADGE,
      { mode: 1, gloss: 0.28, round: 0.010 });
    shape('capsule', torso, 0.112 * W, 0.445 * BODY, 0.160, 0.060,
      0.009 * BODY, 0.008, lk.BADGED,
      { mode: 1, gloss: 0.20 });
  }

  // The arm chain, kept for the builders. Every garment worn on an arm — a sleeve badge, a cuff,
  // an epaulette, a watch — was rebuilding this chain out of `pose` and re-deriving the same six
  // constants by hand, which means six copies of numbers that live here and change here.
  const arms = {};
  function arm(x, sh, splay, elbow, twist) {
    const shoulder = M.mul(torso, M.mul(M.trans(x * FRAME, 0.495 * BODY, 0),
      M.mul(M.rotZ(splay), M.rotX(sh))));
    const upper = 0.31 * T, lower = 0.29 * T;
    // Where the sleeve stops. Rather than drawing a bare arm and covering it — which costs
    // three hidden draws per arm on every figure in a crowded street for the sake of the one
    // case in four — each segment is simply drawn in cloth or in skin, and a hem capsule is
    // added at the cut. A bare segment is a little narrower than a sleeved one, so the hem
    // stands proud of the arm instead of lying flush with it.
    const slv = lk.sleeve, sleeved = slv !== 'none', fore = slv === 'long';
    if (slv === 'short') {
      // A t-shirt sleeve: cloth over the top of the upper arm, skin the rest of the way down.
      const cut = upper * 0.46;
      shape('limb', shoulder, 0, -cut * 0.50, 0, 0.112 * ARM, cut + 0.055,
        0.120 * ARM, lk.ARM);
      shape('limb', shoulder, 0, -(cut + (upper - cut) * 0.50), 0, 0.100 * ARM,
        (upper - cut) + 0.045, 0.108 * ARM, lk.SKIN, SKINM);
      shape('capsule', shoulder, 0, -cut, 0, 0.118 * ARM, 0.016, 0.126 * ARM,
        lk.ARMD, { mode: 7 });
    } else {
      shape('limb', shoulder, 0, -upper * 0.50, 0, (sleeved ? 0.112 : 0.100) * ARM,
        upper + 0.045, (sleeved ? 0.120 : 0.108) * ARM,
        sleeved ? lk.ARM : lk.SKIN, sleeved ? FABRIC : SKINM);
    }
    const el = M.mul(shoulder, M.mul(M.trans(0, -upper + 0.018, 0), M.rotX(elbow)));
    // The elbow, sized the same way and for the same reason as the knee above — and this is the
    // one that proved the point. Written as bare literals it read `fore ? 0.076 : 0.068` with no
    // `* W` at all, while the upper arm above and the forearm below both had one. At the default
    // build that is invisible, which is where it was measured and signed off; on a broad build the
    // forearm left the elbow 21% wider than the joint and the peg came back on thirteen of the
    // eighteen presets.
    //
    // Derived from the segment above it, it cannot happen again. Which segment that is depends on
    // the sleeve: a t-shirt sleeve stops partway down, so what actually arrives at the elbow is
    // the bare skin below the cut, not the cloth above it. The forearm is still allowed to be a
    // little wider than the joint below it — that is the muscle belly, and it is the one place on
    // a limb where out-then-in is what an arm really does.
    const upW = sleeved && slv !== 'short' ? 0.112 : 0.100;
    const upD = sleeved && slv !== 'short' ? 0.120 : 0.108;
    shape('ball', el, 0, 0.010, 0, upW * ARM * TAPER, fore ? 0.074 : 0.068,
      upD * ARM * TAPER, fore ? lk.ARM : lk.SKIN, fore ? FABRIC : SKINM);
    shape('limb', el, 0, -lower * 0.50, 0, (fore ? 0.080 : 0.072) * ARM,
      lower + 0.040, (fore ? 0.088 : 0.078) * ARM,
      fore ? lk.ARM : lk.SKIN, fore ? FABRIC : SKINM);
    // Half sleeves end just above the elbow, so their hem goes on the upper arm's frame and
    // not the forearm's — on the forearm it would swing away from the arm as the elbow bends.
    if (slv === 'half')
      shape('capsule', shoulder, 0, -upper + 0.040, 0, 0.118 * ARM, 0.016,
        0.126 * ARM, lk.ARMD,
        { mode: 7 });
    // The forearm turns about its own length, which is what points the palm somewhere. The
    // sleeve is drawn before it, so only the hand rolls.
    const wrist = M.mul(el, M.mul(M.trans(0, -lower + 0.025, 0), M.rotY(twist || 0)));
    // Cuff, then the hand: a palm with real fingers rather than a mitten.
    if (fore) shape('capsule', wrist, 0, -0.005, 0, 0.096, 0.055, 0.104, lk.ARMD, { mode: 7 });
    // The palm. It was 70 mm across, 95 mm long and 52 mm thick — narrower than a hand and
    // half again as thick as one — and with the four fingers pitched 19 mm apart on a 17 mm
    // width they hung off it in a flat row with daylight between them. That is the flat paddle:
    // not a plate, in fact, but a *block* with combs on the end of it.
    //
    // 84 across, 92 long, 42 thick is a hand, and the round takes the box's edge off down to
    // the thickness so the rim is a curve rather than a chamfered corner.
    // It is now a purpose-built `hand` mesh rather than a rounded box, which is what finally
    // stops it being a paddle: the palm is dished, the knuckles dome, and the ball of the thumb
    // is a real mass instead of the corner of a box. It is also net cheaper — 243 fewer vertices
    // a hand than the box it replaces.
    //
    // Two things about it. It is handed, so the arm at negative x takes `hand` and the one at
    // positive x takes `handMirror`; using one for both puts the thumb ball on the wrong edge.
    // And the mesh fills only about 47% of its z box — the dish and the dome sit inside it — so
    // the depth scale is not the finished thickness. 0.047 renders 22 mm, which is a hand; the
    // 0.042 that read correctly on a box comes out at 19.7 mm here.
    shape(x < 0 ? 'hand' : 'handMirror', wrist, 0, -0.050 * HAND, 0.001,
      0.084 * HAND, 0.092 * HAND, 0.047 * HAND, lk.SKIN, SKINM);
    const grip = pose.grip || 0;
    if (lod === 0) {
      for (let f = 0; f < 4; f++) {
        // Distance from the middle of the hand: 0.5 for the two long fingers, 1.5 for the index
        // and the little one. Everything about a finger grades off this — a row of four
        // identical rods is most of why the old hand read as a garden fork.
        const cf = Math.abs(f - 1.5);
        // Not mirrored, and that is a decision rather than an oversight.
        //
        // The palm mesh above *is* handed, so mirroring this sweep looks like the obvious matching
        // fix — index next to the thumb on both hands. It was tried and it looked worse: the
        // fingers read as inverted. The reason is that the finger row is drawn in the *wrist*
        // frame, not the mesh's, and the wrist frames of the two arms are not themselves mirrored
        // — they are the same construction translated to ±x. So negating the sweep does not
        // reflect the row, it reverses the order along an axis that already pointed the same way.
        //
        // Leave it. If the handedness is ever genuinely wrong it wants fixing in the frame or the
        // mesh, not by flipping this offset — and it wants a close render of both hands side by
        // side to judge, which is the check that was skipped when the flip went in.
        const fx = (f - 1.5) * 0.021 * HAND;
        const len = (0.048 - cf * 0.005) * HAND;
        // The knuckles are not in a line. The middle pair stand furthest down the hand and
        // slightly proud of it, the outer pair sit back and higher, and the whole row arches —
        // which is what catches the light across the back of a hand.
        const kn = M.mul(wrist, M.mul(M.trans(fx, (-0.088 + (cf - 0.5) * 0.011) * HAND,
          0.004 - (cf - 0.5) * 0.007),
          M.mul(M.rotZ((f - 1.5) * 0.075), M.rotX(-0.55 - grip * (0.85 + cf * 0.12)))));
        // Fingers 19.5 mm across at a 21 mm pitch, so they touch. A relaxed hand has no gaps
        // in it, and gaps at this size read as a rake rather than as separate fingers.
        shape('capsule', kn, 0, -len * 0.5, 0, 0.0195 * HAND, len + 0.015 * HAND,
          0.0205 * HAND, lk.SKIN, SKINM);
        const tip = M.mul(kn, M.mul(M.trans(0, -len, 0),
          M.rotX(-0.50 - grip * (1.05 + cf * 0.15))));
        shape('capsule', tip, 0, -(0.021 - cf * 0.002) * HAND, 0, 0.0175 * HAND,
          (0.047 - cf * 0.006) * HAND, 0.0185 * HAND, lk.SKIN, SKINM);
      }
      // The thumb, off the front of the hand rather than the side of it. Its first segment is
      // the thenar — the pad at the base of the thumb is the thickest part of a hand and there
      // was nothing there at all, so the thumb grew straight out of a flat edge.
      const th = M.mul(wrist, M.mul(M.trans((x > 0 ? -1 : 1) * 0.030 * HAND,
        -0.054 * HAND, 0.020),
        M.mul(M.rotZ((x > 0 ? 1 : -1) * (0.60 - grip * 0.2)), M.rotX(-0.46 - grip * 0.5))));
      shape('capsule', th, 0, -0.024 * HAND, 0, 0.027 * HAND, 0.062 * HAND,
        0.030 * HAND, lk.SKIN, SKINM);
      shape('capsule', th, 0, -0.058 * HAND, 0.006, 0.019 * HAND, 0.042 * HAND,
        0.021 * HAND, lk.SKIN, SKINM);
    } else {
      shape('ball', wrist, 0, -0.112 * HAND, 0.004, 0.062 * HAND, 0.070 * HAND,
        0.052 * HAND, lk.SKIN, SKINM);
    }
    arms[x < 0 ? 'L' : 'R'] = { shoulder, elbow: el, wrist, upper, lower,
                                sleeved, fore, taper: TAPER };
    return wrist;
  }
  const wristL = arm(-0.202, pose.shL, pose.shLz, pose.elbL, pose.twL);
  const wristR = arm( 0.202, pose.shR, pose.shRz, pose.elbR, pose.twR);

  // 手提袋 the tote, hanging from the left hand.
  //
  // It used to be drawn on the torso with the rest of the bags, and that is why it looked like it
  // was being carried *in* the arm rather than by it: a 0.215-wide bag beside a limb 112 mm off
  // the body overlaps it whatever x you choose, and sliding it outboard only moved the overlap to
  // the arm's outer edge. Hung off the wrist there is nothing to overlap — the hand is the thing
  // holding it, so the bag is wherever the hand is, and it swings with the arm through a stride
  // for free instead of being pinned to a torso that does not swing the same way.
  //
  // Below the wrist by the handle's own length, so the loop reaches up into the fist rather than
  // the bag hanging off the fingertips. In the wrist's frame -y is down the arm.
  if (lk.bag === 'tote') {
    const drop = 0.150 * HAND;
    shape('softBox', wristL, 0, -drop - 0.145, 0.010, 0.215, 0.290, 0.105, lk.BAG, { mode: 7 });
    R.draw('capsule', M.mul(wristL, M.mul(M.trans(0, -drop + 0.025, 0.010),
      M.mul(M.rotZ(Math.PI / 2), M.scale(0.020, 0.150, 0.020)))), lk.BAGD, FABRIC);
  }
  if (holder) holder(shape, torso, wristL, wristR, pose);

  // ---------------------------------------------------------------- head
  const HS = lk.headScale || 1;
  const head = M.mul(torso, M.mul(M.trans(0, 0.750 * T, 0),
    M.mul(M.rotY(pose.headYaw), M.mul(M.rotX(pose.headPitch), M.scale(HS, HS, HS)))));
  // Head scale: half-extents come out at 0.084 wide, 0.115 tall, 0.092 deep, and every
  // feature below is placed against that ellipsoid — a face is mostly a question of
  // whether the eyes sit *in* the skull or on it.
  const HX = F.headW, HY = F.headH, HZ = F.headD, HC = F.headZ;
  shape('head', head, 0, -0.004, HC, HX, HY, HZ, lk.SKIN, SKINM);
  // Where the front of *this* head actually is at (x, y). Every feature is placed against it
  // rather than at a hand-picked depth: guessed depths put the eyes, brows and mouth 5 to 15 mm
  // inside the skull, and the face came out as a blank egg with a nose on it.
  //
  // It used to model the skull as an ellipsoid of half-extents (0.44, 0.50, 0.455) — which is
  // exactly what gl.js's `headSurface` reduces to if you delete every term that makes it a head.
  // The real mesh has a chin that projects, a jaw that narrows and shortens into it, a brow
  // ridge, a temple hollow and cheekbones, and the ellipsoid has none of them: measured against
  // the mesh it runs 2.4 mm inside at the eye, 1.2% inside at the jaw and 0.9% *outside* at the
  // mouth.
  //
  // Inside is the expensive direction to be wrong in. A feature placed at "surf minus a few
  // millimetres", against a surface that is itself millimetres under the skin, never breaks the
  // skin at all — and it fails silently, costing its draw call and drawing nothing. Three did:
  // the jaw shadow sat 10.8 mm inside, the jaw corner 10.2 mm and the philtrum 5.3 mm, on every
  // face in the game. One of those is the jaw corner, which is a third of the bone structure
  // added above to stop the face reading as an egg, and it had never once rendered.
  //
  // So this inverts `headSurface` rather than approximating it: solve for the direction on the
  // unit sphere whose surface point has the x and y we asked for, then evaluate the real z
  // there. The two couplings are weak — px depends on cx and on the jaw narrowing, py on cy and
  // on the brow bump — so three passes settle it well inside a tenth of a millimetre. This is a
  // transcription of gl.js's `headSurface`, and it has to stay one: if that function changes,
  // this changes with it or the features start sinking again.
  const surf = (x, y) => {
    const px = x / HX, py = (y + 0.004) / HY;
    let cy = py / 0.50, cx = 0, cz = 0;
    for (let i = 0; i < 3; i++) {
      const lo = Math.max(0, -cy);
      cx = px / (0.44 * (1 - 0.32 * lo * lo));
      cz = Math.sqrt(Math.max(0.09, 1 - cx * cx - cy * cy));
      cy = (py - 0.012 * Math.exp(-Math.pow((cy - 0.62) / 0.32, 2)) * cz) / 0.50;
    }
    const lo = Math.max(0, -cy), front = Math.max(0, cz);
    let pz = cz * 0.455 * (1 - 0.12 * lo * lo);
    if (pz > 0) pz += 0.055 * lo * lo * lo * (1 - Math.abs(px) * 1.2);
    else pz *= 1 + 0.09 * Math.max(0, cy) - 0.10 * lo;
    pz += 0.020 * Math.exp(-Math.pow((cy - 0.10) / 0.13, 2)) * front;
    pz -= 0.014 * Math.exp(-Math.pow((cy - 0.34) / 0.12, 2)) * Math.max(0, Math.abs(cx) - 0.55);
    pz += 0.016 * Math.exp(-Math.pow((cy + 0.10) / 0.14, 2)) * front
        * Math.max(0, Math.abs(cx) - 0.30);
    return HC + pz * HZ;
  };

  // Ears, set on the side of the skull rather than beyond it.
  for (const s of [-1, 1]) {
    shape('ball', head, s * F.earX, F.earY, -0.014, 0.022, F.earH, 0.034, lk.SKIND, SKINM);
    if (lod < 2) {
      shape('ball', head, s * (F.earX - 0.004), F.earY, -0.008, 0.014, F.earH * 0.62, 0.022,
        tint(lk.SKIND, 0.86), SKINM);
      shape('ball', head, s * (F.earX - 0.002), F.earY - 0.024, -0.012, 0.018, 0.024, 0.022,
        lk.SKIN, SKINM);
    }
  }
  // Nose: a bridge running down out of the brow, a tip proud of the face, and wings either
  // side of it. Depths come off `surf`, so the tip projects a real 13 mm and no more.
  // The bridge is 72 mm tall and was cleared against the surface at its *centre* only. The face
  // curves forward all the way down to the tip, so the surface at the bridge's lower end stands
  // several millimetres proud of the surface at its middle — and below the eyeline the bridge was
  // therefore inside the face. That is most of why the nose reads as an outline rather than a
  // form: only its top half was ever above the skin.
  //
  // Cleared against the lower end of its own span instead, which is the binding constraint; the
  // top then sits proud rather than flush, which is what a nasal root does anyway.
  // 0.18 of the span down, not 0.42. One ball cannot follow a curving face: clearing it against
  // the surface far enough down to free the lower half pushes the *whole* bridge out, and at 0.42
  // the top of it stood proud on the forehead as a pale ridge running up between the brows. This
  // is the compromise a single shape allows — the lower half breaks the skin, the root sits close.
  // Drawn at 0.72 of `noseH`, and dropped by the difference so the tip end stays put.
  //
  // The table's 72 mm is measured from a brow at 33 mm, so the bridge reached 25 mm *onto the
  // forehead*. That never showed while the shape was buried; bringing it out to fix the soft nose
  // traded one fault for a worse one — a pale ridge running up between the brows. The table is
  // left alone because `faceOf` varies from it; only the drawn extent changes.
  shape('ball', head, 0, F.noseY - F.noseH * 0.14,
    surf(0, F.noseY - F.noseH * 0.18) - F.noseIn,
    F.noseW, F.noseH * 0.72, 0.026, lk.SKIN, SKINM);
  shape('ball', head, 0, F.tipY, surf(0, F.tipY) - 0.002,
    F.tipW, F.tipW, F.tipD, lk.SKIN, SKINM);
  if (lod < 2) for (const s of [-1, 1])
    // The alar wing is skin, not a painted nostril. Drawing the whole 18 mm wing in the shadow
    // colour produced the two black dots visible on every otherwise blank face; fig-face.js adds
    // the actual openings on top, at their real six-millimetre scale.
    shape('ball', head, s * 0.022, F.tipY - 0.006, surf(0.022, F.tipY - 0.006) - 0.004,
      0.017, 0.019, 0.019, lk.SKIN, SKINM);
  if (YOUTH && lod < 2) for (const s of [-1, 1])
    shape('ball', head, s * 0.052, -0.031, surf(0.052, -0.031) + 0.002,
      0.030, 0.025, 0.012, mixc(lk.SKIN, C('#e98f82'), 0.18 * YOUTH), SKINM);

  const EX = F.eyeX, EY = F.eyeY;                   // eye centre, in head space

  // ---- 骨相 the bone under the face, at the nearest LOD only.
  //
  // Everything above this point is a feature *placed on* the skull — ears, nose, eyes, mouth —
  // and every one of them is carefully positioned against `surf`. What was missing is that the
  // skull itself has no planes. A head that is one smooth ellipsoid gives every feature the same
  // shading whatever angle the light comes from, and that is why the face read as an egg with
  // parts stuck to it however well the parts were made. Rendered straight on under a neutral key
  // it had no cheekbone, no brow and a nose you could only find by its outline.
  //
  // Three ridges fix most of it, and all three are things you can feel on your own face. They are
  // skin-coloured and they are not subtle shapes — they do not need to be, because what makes
  // them read is not their silhouette but that they turn the surface, and a turned surface catches
  // a different amount of light and occludes what sits under it.
  //
  // Gated to lod 0. A face is only ever looked at from conversation distance, and the crowd budget
  // is the thing this rig cannot afford to spend. Six more shapes on the nearest figure costs
  // nothing; six more on ninety of them would.
  //
  // The numbers, measured, because the ones that used to be written here stopped being true and
  // nobody noticed: a plain figure is **132 draws at lod 0 and 51 at lod 2**, not the ~100 and ~50
  // this comment claimed. lod 2 is the tier a hall full of people is drawn at, and a *plain* figure
  // is not what a hall is full of — the worst roster preset measures 70 there and a sample of
  // strangers averages 57, so a real crowd costs about 40% more than the figure everyone budgets
  // against. Budget against 57, not against 51.
  if (lod === 0) {
    for (const s of [-1, 1]) {
      // The brow ridge, and the one that matters most. An eye set in a flat plane is a bead lying
      // on a surface; an eye with bone above it sits in shade. The shade is not painted here —
      // once there is something standing proud above the socket, the renderer's own occlusion
      // term produces it. An earlier attempt to get the same effect by darkening the socket
      // colour was reverted with the note that at full strength the two of them read as bruises,
      // which is exactly what shading a shadow instead of casting one looks like.
      // Above the eyebrow line, not on it. The first version sat at browY - 0.006 with a 0.013
      // half-height, which put it from 0.014 to 0.040 — straight through an eye centred at
      // eyeY 0.014. It intersected the eyeball and the near eye rendered as a damaged crescent.
      // Wide and shallow, sitting just over the brow, is what a supraorbital ridge actually is.
      shape('ball', head, s * EX, F.browY + 0.006, surf(EX, F.browY) - 0.013,
        0.046, 0.010, 0.014, lk.SKIN, SKINM);
      // The cheekbone, wide and set under the outer corner of the eye. This is what gives the
      // middle of the face somewhere to catch light, and what puts a soft edge between the lit
      // plane of the cheek and the shaded plane below it.
      shape('ball', head, s * (EX + 0.012), EY - 0.030, surf(EX + 0.012, EY - 0.030) - 0.014,
        0.030, 0.022, 0.020, lk.SKIN, SKINM);
      // The jaw's corner, low and back toward the ear. Without it the head tapers straight from
      // cheek to chin and reads as young and soft on every character regardless of age.
      // Inset 0.009, not 0.026: the depth below is 0.024 full extent, so a 26 mm inset left this
      // 14 mm inside the skull. It is one of the three bone shapes added to stop the face reading
      // as an egg, and of the three it was the one that never drew.
      // `surf` sampled at the shape's own (x, y). It used to be read at 0.72·jawW and F.jawY while
      // the ball sat at 0.86·jawW and F.jawY + 0.020 — and the face narrows hard toward the jaw,
      // so the surface at 0.72 is well proud of the surface at 0.86. Placing against the wrong
      // point buried it by 10 mm, and no inset could have rescued that: the error was in *where*
      // the surface was measured, not how deep the shape sat below it.
      shape('ball', head, s * (F.jawW * 0.86), F.jawY + 0.020,
        surf(F.jawW * 0.86, F.jawY + 0.020) - 0.009,
        0.022, 0.026, 0.024, lk.SKIN, SKINM);
    }
  }

  if (lod < 2) {
    const b = pose.blink || 0, ez = surf(EX, EY);
    for (const s of [-1, 1]) {
      // Socket, eyeball, iris, pupil, catchlight — then a lid that sits *over* the top of
      // the iris, which is the single thing that stops an eye reading as a bead.
      // Barely darker than the skin. At the full shadow tone its own edge showed on the cheek
      // as a hard ring, and the two of them together read as bruises.
      shape('ball', head, s * EX, EY, ez - F.socketIn, F.socketW, F.socketH, 0.024,
        tint(lk.SKIN, 0.91), SKINM);
      shape('ball', head, s * EX, EY, ez - 0.005, F.eyeW, F.eyeH, F.eyeD, EYEW, { gloss: 0.30 });
      const gaze = M.mul(head, M.mul(M.trans(s * EX, EY, ez - 0.005),
        M.mul(M.rotY(pose.eyeYaw || 0), M.rotX(pose.eyePitch || 0))));
      shape('ball', gaze, 0, 0, F.irisOut, F.irisR, F.irisR, 0.008,
        lk.IRIS || IRIS, { gloss: 0.55 });
      shape('ball', gaze, 0, 0, F.irisOut + 0.003, F.pupilR, F.pupilR, 0.005,
        PUPIL, { gloss: 0.60 });
      if (lod === 0)
        shape('ball', gaze, s * 0.005, 0.006, F.irisOut + 0.005, 0.005, 0.005, 0.004,
          EYEW, { gloss: 0.50 });
      // Lids, skin over the ball: the upper one drops the whole way when blinking.
      shape('ball', head, s * EX, EY + F.lidLift - (F.lidLift + F.lidH * 0.58) * b, ez - 0.003,
        F.lidW, F.lidH + (F.lidLift + F.lidH * 0.58) * b, F.eyeD, lk.SKIN, SKINM);
      shape('ball', head, s * EX, EY - F.lidLift, ez - 0.005, F.lidW - 0.004, 0.017, 0.026,
        lk.SKIN, SKINM);
      if (lod === 0)                                  // lash line under the upper lid
        shape('ball', head, s * EX, EY + 0.007 - 0.030 * b, ez + 0.002,
          F.eyeW - 0.005, 0.005, 0.014, lk.HAIRD, HAIRM2);
      // Brow: short, arched, close above the eye, and standing clear of the forehead
      R.draw('capsule', M.mul(head,
        M.mul(M.trans(s * (EX + 0.002), F.browY, surf(EX, F.browY) - 0.002),
        M.mul(M.rotZ(Math.PI / 2 + s * F.browArch),
          M.scale(F.browThick - 0.003, F.browLen, F.browThick)))), lk.BROW, HAIRM2);
    }
    // ---- 胡子 facial hair, before the mouth so the lips sit on top of it. Nobody in this game
    // could grow any until now, which quietly made the whole cast one age as well as one sex: a
    // moustache and a grey stubble are two of the three or four things that read as "older man"
    // from across a room.
    //
    // Built as a shell round the lower face rather than as lumps on it. That is not a stylistic
    // choice, it is the only thing that works: an ellipsoid whose centre sits behind a convex
    // skull pokes only a sliver of itself through, and the first version of this — seven tidy
    // lumps along the jaw — rendered as a few dark seams and five clean-shaven men. This is the
    // trick the hair already uses: the skull again, a few millimetres bigger, cut down to the part
    // of it a beard grows on. Where the shell tapers inside the skull it simply stops showing,
    // which is what draws the beard's own edge.
    if (lk.beard) {
      const bd = lk.beard, stub = bd === 'stubble';
      // Stubble is not a beard's colour, it is skin with hair coming through it — but it has to be
      // mixed further toward the hair than looks right on paper. The shell stands a few
      // millimetres proud of a receding jaw, so it faces the key light more squarely than the
      // cheek beside it and renders brighter; at a third of the way to the hair it came out
      // *lighter* than the face it was growing on.
      const B = stub ? mixc(lk.SKIN, lk.BEARD, 0.58) : lk.BEARD;
      // On the head's own transform and its own scale, exactly like the hair — and like the hair,
      // never on a larger scale: a millimetre added here pushes the front of the surface out
      // further than the shell's whole displacement and puts a mask over the face.
      const mesh = bd === 'moustache' ? 'tache' : bd === 'goatee' ? 'goatee' : 'beard';
      shape(mesh, head, 0, -0.004, HC, HX, HY, HZ, B, HAIRM2);
    }

    // Mouth: an upper and lower lip with a shadow line between them, and the corners lifted a
    // little — the difference between a face at rest and a face that looks sullen. Each piece is
    // cleared against the surface at its own height; measuring the whole mouth at its centre had
    // buried the upper lip as the face curved forward toward the nose.
    const my = F.mouthY, mw = F.mouthW, open = smooth01(pose.mouth || 0);
    // With no phoneme morphs, the useful part of lip sync is simply that the mouth opens and
    // closes on the cadence of the voice. The oral cavity is a shallow shape just proud of the
    // face; the lips sit in front of it and separate by at most two centimetres. Moving only the
    // lower lip keeps the nose and philtrum stable and avoids the rubber-mask look of scaling the
    // whole mouth.
    const upperY = my + open * 0.002, lowerY = my - 0.017 - open * 0.018;
    const gapY = (upperY + lowerY) * 0.5, gapZ = surf(0, gapY);
    shape('ball', head, 0, gapY, gapZ - 0.004, mw * 0.82,
      0.005 + open * 0.027, 0.010, tint(lk.LIP, 0.36), { gloss: 0 });
    shape('ball', head, 0, upperY, surf(0, upperY + F.lipH * 0.5) - 0.007,
      mw, F.lipH, 0.022, lk.LIP, LIPM);
    shape('ball', head, 0, lowerY, surf(0, lowerY) - 0.009,
      mw - 0.005 + open * 0.002, F.lipH + 0.002, 0.021, lk.LIP, LIPM);
    for (const s of [-1, 1])
      shape('ball', head, s * (mw / 2), my + F.smile - open * 0.004,
        surf(mw / 2, my - open * 0.004) - 0.006,
        0.013, 0.011, 0.016, lk.LIP, LIPM);
    // The philtrum, and the mouth corners above it: both were inset by more than their own half
    // depth, so neither broke the skin. A 0.016 depth is a 0.008 half extent, and a 9 mm inset
    // buries it. These now stand ~2 mm proud, which on a feature this small is the whole of it.
    if (lod === 0)                                    // philtrum
      // Same correction as the jaw corner: the philtrum sits 17 mm above the mouth, where the
      // face has already curved forward, so it samples its own surface point.
      shape('ball', head, 0, my + 0.017, surf(0, my + 0.017) - 0.006,
        0.009, 0.019, 0.016, lk.SKIND, SKINM);
    // Chin, and the shadow under the jaw.
    //
    // The jaw shadow's inset was 0.036 against a 0.040 depth — and depth here is the full extent,
    // so its most proud point sat 16 mm *inside* the skull and it had never rendered on any face
    // in the game. Correcting `surf` did not save it: the inset alone was larger than the half
    // depth, so no surface function could have brought it out. It is now placed to break the skin
    // by about 3 mm, which is a shading tone under the jaw rather than a lump on it.
    shape('ball', head, 0, F.chinY, surf(0, F.chinY) - 0.014, F.chinW, 0.028, 0.030,
      lk.SKIN, SKINM);
    shape('ball', head, 0, F.jawY, surf(0, F.jawY) - 0.017, F.jawW, 0.024, 0.040,
      lk.SKIND, SKINM);

    // ---- 年纪 what age does to a face, which until now was nothing: a woman of eighty on her
    // stool and a student of nineteen had the same skin, and only the grey hair and the bend in
    // her back said otherwise. Three creases, and they are enough — the fold beside the mouth is
    // the one that reads at any distance, and the forehead is close-up only because at fifteen
    // metres it is thinner than a pixel and would do nothing but shimmer.
    if (lk.age > 0.01) {
      // A crease is a groove, and everything here is built out of shapes that stand *out* of the
      // surface. A tube lying on a cheek at skin colour with skin's own sheen on it is a raised
      // welt catching the key light — which is exactly how these first came out: five faces with
      // pale scratches on them. Two things fix it. It is sunk far enough into the head that only
      // the darkest sliver of it is above the surface, and it is matte, so the one thing a groove
      // never does — pick up a highlight along its length — it cannot do.
      // 0.46, not 0.80. A one-third cut in linear albedo is about a sixth of a stop once the
      // tonemapper has compressed it, so `tint(SKIND, 0.80)` renders at very nearly the value of
      // the cheek beside it — these creases were drawing, and were the same colour as the face.
      // Ageing a character is one of the few things this rig can do that reads at a distance, and
      // it was being spent on lines nobody could see.
      // 0.64. At 0.80 a crease rendered at very nearly the cheek's own value — a one-third cut in
      // linear albedo is about a sixth of a stop once the tonemapper has compressed it — so these
      // lines were drawing and were invisible. At 0.46, which is what the thinner creases in
      // fig-face.js use, this file's heavier geometry read as scratches scored into the face.
      // Same measurement, different shapes: the tone has to follow the width of the line it is on.
      const line = tint(lk.SKIND, 0.64), CREASE = { gloss: 0 };
      for (const s of [-1, 1]) {
        // The nasolabial fold, from beside the nose down past the corner of the mouth. The single
        // line that reads as age at any distance at all.
        R.draw('capsule', M.mul(head, M.mul(
          M.trans(s * 0.025, my + 0.021, surf(0.025, my + 0.021) - 0.010),
          M.mul(M.rotZ(s * 0.24), M.scale(0.006, 0.028 + 0.016 * lk.age, 0.006)))), line, CREASE);
        // And the pouch under the eye, which deepens rather than appears.
        shape('ball', head, s * EX, EY - F.lidLift - 0.009, surf(EX, EY) - 0.010,
          F.lidW * 0.90, 0.010 + 0.008 * lk.age, 0.019, tint(lk.SKIND, 0.88), CREASE);
      }
      if (lod === 0 && lk.age > 0.45)
        for (const [y, w] of [[0.050, 0.076], [0.064, 0.060]])
          R.draw('capsule', M.mul(head, M.mul(M.trans(0, y, surf(0, y) - 0.009),
            M.mul(M.rotZ(Math.PI / 2), M.scale(0.006, w, 0.006)))), line, CREASE);
    }
  } else {
    // Down the street the eyes are still what says this is a person, so they stay — as two
    // dark beads. Culling the whole face turned distant neighbours into mannequins.
    for (const s of [-1, 1])
      shape('ball', head, s * EX, EY, surf(EX, EY) - 0.006, 0.032, 0.028, 0.022,
        lk.IRIS || IRIS, { gloss: 0.40 });
  }

  // ---------------------------------------------------------------- hair
  // Hair is four overlapping pieces, not one shell, because no single ellipsoid can both
  // cover a forehead and leave a face. The crown takes the top, back and upper sides; the
  // front piece comes down over the forehead and its own lower edge, where it sinks back
  // inside the skull, *is* the hairline; the nape closes the back of the neck; the temples
  // fill in front of the ear.
  //
  // Getting this wrong is not subtle. Sized to hug the skull it was 20 mm short in z at the
  // forehead, so the head emerged through it from the crown forwards and all six of the cast
  // stood there with a monk's tonsure. Enlarged enough to reach the forehead on its own, the
  // same ellipsoid stood 50 mm off the back of the head instead.
  const hs = lk.hairStyle;
  if (hs !== 'bald') {
    // One shell, on the head's own transform and its own scale. `hairGrow` is a fraction of a
    // millimetre of extra body for a full head of hair; a buzz cut gets none.
    const grow = hs === 'buzz' ? 0 : F.hairGrow;
    shape('hair', head, 0, -0.004, F.headZ,
      F.headW + grow, F.headH + grow, F.headD + grow, lk.HAIR, HAIRM2);
    // No extra lump for a parting: a ball big enough to read as one cut a hard step across the
    // hair's silhouette, and the shell's own hairline is already the shape of a hairline.
    // The bun itself, and the band round it. Nothing else: the two balls that used to sweep
    // the hair back over each ear cut a hard stair-step across the silhouette, and the shell
    // already covers everything they were there to cover.
    if (hs === 'bun') {
      shape('ball', head, 0, 0.014, -0.112, 0.090, 0.086, 0.076, lk.HAIR, HAIRM2);
      shape('capsule', head, 0, 0.058, -0.096, 0.030, 0.060, 0.030, lk.HAIRD, HAIRM2);
    }
    if (hs === 'long') {
      shape('softBox', head, 0, -0.118, -0.058, 0.188, 0.290, 0.132, lk.HAIR,
        { ...HAIRM2, round: 0.06 });
      for (const s of [-1, 1])
        shape('capsule', head, s * 0.080, -0.096, 0.014, 0.048, 0.230, 0.052, lk.HAIR, HAIRM2);
    }
    if (hs === 'bob') {
      // Cut at the jaw, and square: the point of a bob is that it has a bottom edge, so it is
      // a box with a soft round rather than the long style's hanging mass.
      shape('softBox', head, 0, -0.056, -0.038, 0.198, 0.172, 0.152, lk.HAIR,
        { ...HAIRM2, round: 0.05 });
      for (const s of [-1, 1])
        shape('capsule', head, s * 0.086, -0.046, 0.012, 0.052, 0.132, 0.056, lk.HAIR, HAIRM2);
    }
    if (hs === 'ponytail') {
      // Gathered high at the back, with the band showing. The tail is swung back off the nape
      // through the model matrix, because a capsule only ever runs along its own Y.
      shape('ball', head, 0, -0.006, -0.106, 0.070, 0.062, 0.058, lk.HAIR, HAIRM2);
      shape('capsule', head, 0, -0.010, -0.110, 0.026, 0.052, 0.026, lk.HAIRD, HAIRM2);
      R.draw('hair', M.mul(head, M.mul(M.trans(0, -0.130, -0.132),
        M.mul(M.rotX(-0.22), M.scale(0.076, 0.260, 0.072)))), lk.HAIR, HAIRM2);
    }
    if (hs === 'braid') {
      // Three falling lumps, each smaller than the last. A braid is a shape that narrows, and
      // one tapered capsule does not read as plaited from any distance this game is played at.
      shape('ball', head, 0, -0.006, -0.104, 0.066, 0.058, 0.056, lk.HAIR, HAIRM2);
      const at = [[-0.092, -0.122, 0.070], [-0.166, -0.132, 0.060], [-0.232, -0.138, 0.048]];
      for (const [y, z, r] of trim ? at : at.slice(0, 1))
        shape('ball', head, 0, y, z, r, r * 0.86, r * 0.94, lk.HAIR, HAIRM2);
      if (trim)
        shape('capsule', head, 0, -0.268, -0.140, 0.024, 0.026, 0.024, lk.HAIRD, HAIRM2);
    }
    if (hs === 'perm') {
      // A tight permanent wave — the single most recognisable thing about a woman past sixty
      // in this city, and the reason the park's dancers read as themselves. Set as lumps round
      // the crown: the one shell scaled up only makes the head bigger. Four lumps instead of
      // seven at middle distance; at the far LOD the shell alone, which at that size is all
      // anybody could resolve anyway.
      const lumps = lod === 0 ? 7 : lod === 1 ? 4 : 0;
      for (let i = 0; i < lumps; i++) {
        const a = (i / lumps) * Math.PI * 2;
        shape('ball', head, Math.cos(a) * 0.086, 0.042 + Math.sin(a * 2) * 0.024,
          F.headZ + Math.sin(a) * 0.078 - 0.014, 0.084, 0.078, 0.084, lk.HAIR, HAIRM2);
      }
    }
    if (hs === 'tousled' && trim) {
      // Uneven, swept locks over the otherwise shared short-hair shell. These are deliberately
      // broad shapes rather than thin strands: at gameplay distance a few strong planes survive,
      // while individual hairs only shimmer and disappear.
      const locks = [
        [-0.054, 0.055, -0.58, 0.040, 0.073],
        [-0.018, 0.068, -0.24, 0.044, 0.082],
        [ 0.021, 0.066,  0.20, 0.043, 0.079],
        [ 0.056, 0.052,  0.52, 0.037, 0.067],
      ];
      // The former locks were centred 3-5 cm inside the forehead. Only their end caps broke
      // through the shell, leaving four dark circular dents across the crown. Lay broad, shallow
      // masses against the actual face surface instead: enough overlap to read as one swept cut,
      // and enough projection for the light to describe hair rather than holes in it.
      for (const [x, y, rz, sx, sy] of locks)
        R.draw('ball', M.mul(head, M.mul(M.trans(x, y, surf(x, y) + 0.004),
          M.mul(M.rotZ(rz), M.scale(sx, sy, 0.030)))), lk.HAIR, HAIRM2);
    }
  }
  if (lk.cap) {
    // Every crown here is wider than the hair shell underneath it. Sized to the skull instead,
    // the hair pokes out all round and the hat reads as a headband.
    const HC = lk.cap, HL = tint(HC, 1.10), HD = tint(HC, 0.88), HM = { gloss: 0.10 };
    // The peak of a cap sits *at the brow*, sloping down and forward from it. At eye height and
    // 80 mm proud it came out as an orange plank driven straight through the face. `rx` in the
    // options object does nothing — R.draw takes rotation only through the model matrix.
    const peak = (y, z, sx, sz, tilt) =>
      R.draw('softBox', M.mul(head, M.mul(M.trans(0, y, z),
        M.mul(M.rotX(tilt), M.scale(sx, 0.020, sz)))), HD, { gloss: 0.10, round: 0.02 });
    switch (lk.hat) {
      case 'flat':
        // A flat cap: the crown pulled down and *back* over a stubby peak. The name is the
        // whole of it — any height in the crown and it is a bowler.
        shape('ball', head, 0, 0.026, -0.022, 0.242, 0.112, 0.252, HC, HM);
        shape('ball', head, 0, 0.046, -0.004, 0.212, 0.070, 0.206, HL, HM);
        peak(0.028, 0.114, 0.168, 0.068, 0.40);
        break;
      case 'beanie':
        // Knitted, hugging the skull, with the brim rolled up round it.
        shape('ball', head, 0, 0.046, 0.004, 0.230, 0.212, 0.226, HC, { gloss: 0.06 });
        shape('capsule', head, 0, 0.024, 0.004, 0.124, 0.030, 0.122, HD, { mode: 7 });
        break;
      case 'sun':
        // A brim on a low crown — the hat that lives on a market stall and in the park at seven
        // in the morning. The brim is a disc, so it stays a disc from every angle. At 0.47 it
        // was a 47 cm dinner plate balanced on the head; a real one is nearer 38 across, and the
        // crown has to clear it. The brim rides at the temples, not at the brow: sat low at 0.034
        // the disc cut straight across the eyes, so it goes up to 0.072 with the crown above it
        // and the whole hat clears the face.
        shape('cyl', head, 0, 0.072, 0.004, 0.380, 0.016, 0.380, HC, { gloss: 0.08 });
        shape('ball', head, 0, 0.100, 0.004, 0.226, 0.150, 0.222, HC, HM);
        shape('capsule', head, 0, 0.080, 0.004, 0.122, 0.022, 0.120, HD, { mode: 7 });
        break;
      case 'visor':
        // A band and a peak and nothing over the top, so the hair still shows through.
        shape('capsule', head, 0, 0.062, 0.004, 0.118, 0.034, 0.118, HC, { mode: 7 });
        peak(0.062, 0.112, 0.172, 0.104, 0.22);
        break;
      case 'hard':
        // A helmet: one smooth shell with a lip, and a strap under the jaw. It has to cap the top
        // of the head, not wrap it — centred low at 0.056 the shell came all the way down to the
        // cheeks and read as a beret pushed back off the face, with the hair spilling out under
        // it. Raised and drawn a little smaller it sits on the crown, the lip rides the brow, and
        // the peak sits above that again.
        shape('ball', head, 0, 0.090, 0.004, 0.232, 0.176, 0.234, HC, { gloss: 0.34 });
        shape('capsule', head, 0, 0.052, 0.004, 0.128, 0.022, 0.128, HD, { gloss: 0.30 });
        peak(0.052, 0.120, 0.150, 0.070, 0.34);
        if (trim)
          for (const s of [-1, 1])
            shape('capsule', head, s * 0.082, -0.048, 0.004, 0.009, 0.062, 0.009, BLACK,
              { mode: 7 });
        break;
      default:
        shape('ball', head, 0, 0.040, 0.004, 0.234, 0.198, 0.228, HC, HM);
        shape('ball', head, 0, 0.092, 0.004, 0.196, 0.082, 0.192, HL, HM);
        peak(0.062, 0.112, 0.176, 0.108, 0.26);
        shape('capsule', head, 0, 0.128, 0.004, 0.024, 0.024, 0.024, HD, HM);
    }
  }
  if (lk.glasses) {
    // A pair of glasses is four dark pieces: a lens over each eye, an arm back to each ear, and a
    // bridge across the nose. Every one of them that is not axis-aligned carries its rotation in
    // the model matrix, because R.draw rotates through the matrix and nothing else — an `rx` in
    // the options object is read by no one. Built the old way, off that dead `rx`, the lenses lay
    // flat as two discs edge-on to the face and the whole pair smeared itself across the brow.
    const FR = lk.glassesColor || C('#2b2b2e'), FRM = { gloss: 0.45 };
    const frameShape = Number.isSafeInteger(lk.glassesShape)
      ? Math.max(0, Math.min(5, lk.glassesShape)) : 0;
    const gz = surf(F.eyeX, F.eyeY);
    // Sized off the eye it is worn over rather than in absolute millimetres, so a pair of glasses
    // fits whatever face it has been put on. A lens is a little wider than the eye and a little
    // taller — at 58 by 52 mm the first version of this covered the eyebrow as well and read as
    // goggles.
    let lw = F.eyeW + 0.016, lh = F.eyeH + 0.014;
    if (frameShape === 3) { const d = Math.max(lw, lh); lw = d * .96; lh = d; } // round wire
    if (frameShape === 4) { lw *= 1.07; lh *= .86; }                           // cat-eye
    if (frameShape === 5) { lw *= 1.08; lh *= 1.04; }                          // bold youth frame
    for (const s of [-1, 1]) {
      // The rim is a ring, so the eye behind it is genuinely unobstructed. Drawn as a filled disc
      // with the lens in front of it instead, the disc shows through the glass and a pair of
      // reading glasses comes out as a pair of sunglasses.
      if (frameShape === 1) {
        // A half-rim is its brow bar. Drawing a full ring and merely recolouring the lower half
        // would still read as the same frame at player scale.
        R.draw('capsule', M.mul(head, M.mul(
          M.trans(s * F.eyeX, F.eyeY + lh * .48, gz + .012),
          M.mul(M.rotZ(Math.PI / 2), M.scale(.007, lw * .88, .007)))), FR, FRM);
      } else if (frameShape !== 2) {
        // Rimless frames deliberately omit this piece; the lens edge, bridge and temples remain.
        R.draw('ring', M.mul(head, M.mul(M.trans(s * F.eyeX, F.eyeY, gz + 0.010),
          M.scale(lw + (frameShape === 5 ? .015 : .009),
                  lh + (frameShape === 5 ? .015 : .009), 0.050))), FR, FRM);
      }
      // And the glass: a cylinder stood on end — the right angle about x turns its axis from
      // vertical to straight out of the face, so it reads as a disc facing forward — left mostly
      // see-through, so what it does is catch the light rather than hide the eye.
      R.draw('cyl', M.mul(head, M.mul(M.trans(s * F.eyeX, F.eyeY, gz + 0.009),
        M.mul(M.rotX(Math.PI / 2), M.scale(lw, 0.002, lh)))), C('#bcd0d8'),
        { gloss: 0.62, alpha: 0.15 });
      // The arm, from the outer edge of the rim back past the temple to the top of the ear. It
      // stands a little off the skull, which is what the arms of a pair of glasses actually do.
      if (trim)
        R.draw('capsule', M.mul(head, M.mul(
          M.trans(s * (F.earX - 0.006), F.eyeY + 0.008, gz - 0.052),
          M.mul(M.rotX(Math.PI / 2), M.scale(0.007, 0.108, 0.007)))), FR, FRM);
      if (trim && frameShape === 4)
        R.draw('capsule', M.mul(head, M.mul(
          M.trans(s * (F.eyeX + lw * .38), F.eyeY + lh * .44, gz + .014),
          M.mul(M.rotZ(s * .62), M.scale(.008, lh * .72, .008)))), FR, FRM);
    }
    // The bridge, across the top of the nose between the two rims.
    if (trim)
      R.draw('capsule', M.mul(head, M.mul(M.trans(0, F.eyeY + 0.006, gz + 0.008),
        M.mul(M.rotZ(Math.PI / 2), M.scale(0.007, 2 * F.eyeX - lw, 0.007)))), FR, FRM);
  }

  // ---- everything else a person can be wearing, from the files that own it.
  //
  // This exists so that character work can be done by more than one pair of hands at a time.
  // Everything above is one 1,200-line function, and a garment is not separable from it: a collar
  // needs `torso`, a hat needs `head`, a shoe needs the foot frame, and all of them need `shape`,
  // `lk` and the LOD gate. Two authors editing this function at once is two authors editing the
  // same forty lines, which does not end well.
  //
  // So the frames and the toolkit are handed out instead. A file registers a builder in
  // `FigureFit` and is called here with everything it needs, in the same coordinate frames the
  // code above uses. Additive only: a builder adds a garment or a detail, it does not replace what
  // is already drawn, because the thing underneath is somebody else's file.
  //
  // Called last so a registered piece sits over the body, the sleeves and the face — which is what
  // a coat, a bag strap or a pair of glasses has to do. Each builder is wrapped, because a throw
  // in one person's jacket must not stop the rest of the cast being drawn.
  if (typeof FigureFit !== 'undefined') {
    // What is in here is the contract, and it has been too thin. Three separate builders were
    // each privately reconstructing something this function already knows — the arm chain, the
    // trunk's dimensions, which job a person holds — and a private copy of a shared number is a
    // bug with a delay on it: when the trunk went from 0.500 W to 0.440 W every panel placement
    // derived from the old figure silently moved off the body, and nothing said so. Anything a
    // builder would otherwise have to guess or copy belongs here.
    //
    // `arms` is the shoulder/elbow/wrist chain in the frames the sleeves were drawn in.
    // `shell` is where the trunk's surface actually is: the scales the body mesh was drawn at,
    // and `outer`, the same for the outermost layer this person is actually wearing — which is
    // what a chest panel has to sit against if it is not to sink into a coat or float off a shirt.
    // `taper` is `R.limbTaper`, so a builder sizing a joint gets it right by construction.
    const shellY = 0.62 * BODY, shellCY = 0.31 * BODY;
    const ctx = { shape, R, M, C, tint, mixc,
                  lk, F, pose, lod, trim, holder,
                  root, torso, head, W, T, BODY, HAND, FOOT, HIP, YOUTH,
                  arms, taper: TAPER,
                  // ---- the layer test, and it is the whole point of putting it here.
                  //
                  // Four files now draw on this torso — this one, fig-tops, fig-uniform,
                  // fig-outer — and until now each decided privately whether the chest was
                  // already covered. They did not agree, and could not: fig-tops asked
                  // `!lk.JACK`, which is false for a coat drawn by fig-outer and false for a
                  // uniform tunic, so its placket and chest pocket kept drawing underneath both
                  // and surfaced *through* them — a cream welt and a white line down a navy
                  // tunic, at every LOD.
                  //
                  // `over` is the one answer to that question. It names the outermost layer this
                  // person is actually wearing, or null for shirtsleeves. Anything mounted on
                  // the chest tests it: draw against `shell.outer` if you are the outer layer,
                  // and skip entirely if something else is. `outerBy` is how far that surface
                  // stands proud of the bare shirt, so a piece that must sit on top of whatever
                  // is there knows what it has to clear without knowing what it is clearing.
                  over: lk.OUTER ? 'outer' : lk.VEST ? 'vest' : lk.JACK ? 'jacket' : null,
                  outerBy: lk.OUTER ? 0.030 : lk.VEST ? 0.011 : lk.JACK ? 0.013 : 0,
                  shell: { cy: shellCY, sx: 0.440 * W, sy: shellY, sz: 0.48 * W,
                           outer: lk.VEST ? { cy: 0.312 * BODY, sx: 0.458 * W,
                                              sy: 0.630 * BODY, sz: 0.502 * W }
                                : lk.JACK ? { cy: 0.312 * BODY, sx: 0.462 * W,
                                              sy: 0.634 * BODY, sz: 0.505 * W }
                                : { cy: shellCY, sx: 0.440 * W, sy: shellY, sz: 0.48 * W } },
                  surf, FABRIC, SKINM, HAIRM, HAIRM2, SHOEM, LIPM };
    for (const k in FigureFit) {
      const fit = FigureFit[k];
      if (typeof fit !== 'function') continue;
      try { fit(ctx); }
      catch (e) {
        if (!FigureFitWarned.has(k)) {
          FigureFitWarned.add(k);
          console.error('FigureFit ' + k + ': ' + (e && e.message));
        }
      }
    }
  }
}

// =============================================================== 动物 the animal rig
//
// The zoo needed things that live in it, and the honest options were a second animation system or
// this. This is the same system: an animal is a row in the NPC roster like anybody else, so it gets
// hours, spots, a temperament, walking, turning to face you, LOD, a shadow and a label for free,
// and the only thing it does not share with a person is the skeleton underneath.
//
// Which it cannot share. `drawFigure` is a biped from the hips up: two legs, a waistband, a collar,
// a face built out of `FACE`. A panda driven through it is a person in a costume — that is the one
// outcome worth avoiding, and it is worth avoiding by writing a second rig rather than by bending
// the first. So everything below mirrors the human rig's structure deliberately: `APOSE` to `POSE`,
// `ATAU` to `TAU`, `animalPose` to `gaitPose`, `drawAnimal` to `drawFigure`. Anybody who can read
// one can read the other, and game.js picks between them on a single `n.animal` field.
//
// Three body plans cover a zoo. `quad` is four legs and a horizontal spine, which is the panda, the
// tiger, the elephant and the giraffe — they differ by a table of measurements, not by code. `ape`
// is the same skeleton carried in a crouch with a long tail and hands that reach the ground, which
// is the macaques on the hill. `upright` is a standing bird: a body on two short legs with flippers
// or wings, which is the penguins and the peacock.

// ---- the sizes, in metres, because animals do not scale off one another.
//
// A human roster says `tall: 0.95` and means "a bit shorter than the reference person", which works
// because every person in the game is within 20% of every other. An elephant is four times a
// macaque, so there is no reference animal to be a fraction of and every dimension here is what it
// actually is. Read them as the beast standing square: `hip` and `sho` are the heights of the two
// joints the legs hang from, `len` is the distance between those two pairs of legs, and the barrel
// is drawn to fill the space between.
//
// The measurements are real ones, rounded. An Asian elephant stands 2.7 m at the shoulder and a
// rhesus macaque 0.5 m at the back, and the reason to keep that ratio honest is that the enclosures
// in zoo.js are built to human scale around them — a panda you have to look up at is not a panda.
const ANIMALS = {
  // 大熊猫. Short thick legs, a deep barrel and almost no neck: the whole animal is a sack. The
  // black is not trim, it is four limbs, a shoulder band, two ears and two eye patches, and getting
  // that pattern right matters more than any amount of shape — it is how a panda is recognised.
  panda: { plan: 'quad', hip: .48, sho: .50, len: .62, barrel: [.62, .60, .86],
           legU: .26, legL: .20, legW: .19, neck: .16, neckRise: .30, head: [.34, .30, .34],
           muzzle: [.17, .13, .18], ear: 'round', earR: .13, tail: .11, tailDroop: .5,
           claws: true, ruff: .34,
           swing: .30, flex: .55, step: .52, gloss: .07, mode: 7,
           coat: '#eee9dd', dark: '#241f1f', legs: '#241f1f', foot: '#1b1717', eye: '#171310',
           belly: '#e2dccc', muz: '#efeadf' },
  // 老虎. Long, low and level, which is the opposite of the panda in every measurement. The head
  // sits forward of the shoulders rather than over them, and the tail is nearly as long as the body.
  tiger: { plan: 'quad', hip: .62, sho: .66, len: .90, barrel: [.44, .50, 1.02],
           legU: .34, legL: .28, legW: .132, neck: .26, neckRise: .05, head: [.31, .28, .35],
           muzzle: [.19, .15, .21], ear: 'round', earR: .105, tail: .90, tailDroop: .85,
           stripes: 13, claws: true, ruff: .28, tailRings: 7,
           swing: .34, flex: .62, step: .68, gloss: .10, mode: 7,
           coat: '#c8792c', dark: '#241a14', foot: '#b76f28', eye: '#a8862c',
           belly: '#e8dcc4', muz: '#e8dcc4' },
  // 大象. The one animal here whose legs are columns rather than levers — they barely bend, which is
  // why `flex` is a fifth of the tiger's, and a swinging elephant leg is the single most common way
  // to make one look like a cartoon. No muzzle: on an elephant the trunk is the face.
  elephant: { plan: 'quad', hip: 1.66, sho: 1.76, len: 1.50, barrel: [1.32, 1.52, 1.72],
           legU: .88, legL: .74, legW: .46, neck: .30, neckRise: .18, head: [.95, .92, .84],
           ear: 'fan', earR: .66, tail: .92, tailDroop: 1.15,
           trunk: 1.70, tusk: .55, nails: true, folds: true, tuft: true, columns: true,
           swing: .17, flex: .13, step: 1.05, gloss: .09, mode: 4,
           coat: '#8d8981', dark: '#6d6a63', foot: '#7c7972', eye: '#3b3229',
           belly: '#84817a', muz: '#8d8981' },
  // 长颈鹿. Everything is the neck: 2 m of it at 69° off the horizontal, which puts the head five
  // metres up and makes the giraffe the one animal in the zoo you can see from the gate.
  giraffe: { plan: 'quad', hip: 2.34, sho: 2.60, len: 1.30, barrel: [.86, 1.14, 1.42],
           legU: 1.30, legL: 1.16, legW: .21, neck: 2.05, neckRise: 1.20, head: [.32, .34, .54],
           muzzle: [.23, .19, .27], ear: 'leaf', earR: .21, tail: .90, tailDroop: 1.25,
           horns: true, patches: 26, hoof: true, tuft: true, mane: true,
           swing: .26, flex: .34, step: 1.15, gloss: .11, mode: 7,
           coat: '#d8a95e', dark: '#7c4a22', foot: '#6f4520', eye: '#241a12',
           belly: '#e8d6ae', muz: '#c9a878' },
  // 猴子. A macaque on all fours is a quadruped with its hips higher than its shoulders and its
  // forelimbs as long as its hind ones, which is what makes the crouch read as an ape rather than
  // as a small dog. The tail carries most of the character and none of the weight.
  monkey: { plan: 'ape', hip: .32, sho: .30, len: .36, barrel: [.24, .27, .40],
           legU: .17, legL: .14, legW: .075, neck: .08, neckRise: .30, head: [.18, .16, .18],
           muzzle: [.100, .075, .105], ear: 'round', earR: .048, tail: .62, tailDroop: -1.10,
           face: '#c98f74', hands: true, ruff: .40,
           swing: .40, flex: .85, step: .34, gloss: .09, mode: 7,
           coat: '#9a7b52', dark: '#5c452c', foot: '#4a3826', eye: '#1d1611',
           belly: '#c3a583', muz: '#c08d72' },
  // 企鹅. No quadruped anywhere in it: a barrel stood on end, two feet under the front of it, two
  // flippers that never fold, and a walk that is a rock from side to side rather than a stride.
  penguin: { plan: 'upright', hip: .22, body: [.28, .46, .27], head: [.155, .165, .155],
           neck: .14, beak: .105, legU: .11, legL: .08, legW: .055, flipper: .34,
           swing: .16, flex: .22, step: .26, roll: .30, gloss: .16, mode: 7,
           coat: '#2b3038', dark: '#1a1e24', foot: '#3a3229', eye: '#12100e',
           belly: '#eae6dc', muz: '#d8a63a', bib: '#e0b93c' },
  // 孔雀. The same standing-bird plan with the tail turned into a fan, which is the whole reason
  // there is a peacock in the aviary at all.
  peacock: { plan: 'upright', hip: .30, body: [.23, .38, .25], head: [.105, .115, .105],
           neck: .32, beak: .085, legU: .17, legL: .13, legW: .030, flipper: .24,
           fan: .95, crest: true, swing: .20, flex: .30, step: .30, roll: .14,
           gloss: .26, mode: 7,
           coat: '#1d5f7a', dark: '#123f52', foot: '#8a8378', eye: '#0e1416',
           belly: '#17506a', muz: '#c4b48a', bib: '#2f8ea8' },
};
// Every measurement above is a *full* dimension in metres — the width of the barrel, not its
// half-width. `R.draw` takes a scale, and a scale is a size: the human rig's pelvis is written
// `0.31 * W` and it is 31 cm across. Read as half-extents the first time, this table produced a
// zoo of correctly-proportioned animals at half scale standing on stick legs, which looks like a
// rendering bug and is arithmetic.
//
// The corollary is the one to keep hold of, because it bit second and separately: anything placed
// *on the surface* of one of these masses is at **half** the dimension, not all of it. A giraffe's
// patches at `bw * .96` sit at 83 cm from a spine whose body is 43 cm to the skin, so they hang in
// the air beside the animal like a swarm. Sizes are whole, offsets to a surface are halved.

// The animal skeleton, and its resting values. Four legs are named the way a vet names them — `fl`
// is the fore-left, `hr` the hind-right — because "leg 3" is unreadable the moment a footfall
// sequence is involved, and a footfall sequence is the whole of a quadruped walk.
const APOSE = {
  bob: 0, sway: 0, roll: 0,
  spinePitch: 0, spineYaw: 0,
  // How far the whole body has sunk toward the ground, in metres before scale. This is what makes
  // sitting and lying down possible at all: the legs fold, and the barrel has to come down with
  // them or the animal folds its legs in mid-air.
  rootDrop: 0, spread: 0,
  // What the forelimbs are doing that is not walking. `paw` raises them toward the mouth — a panda
  // holding a stem of bamboo, a macaque holding anything at all — and `reach` puts them up on
  // something, which is how an animal stands at a rail or a rock.
  paw: 0, reach: 0,
  // per leg: the swing at the top joint, and the bend at the middle one
  fl: 0, flk: 0, fr: 0, frk: 0, hl: 0, hlk: 0, hr: 0, hrk: 0,
  neck: 0, neckYaw: 0, head: 0, headYaw: 0,
  tail: 0, tailYaw: 0, ear: 0, jaw: 0,
  // 开屏, 0 shut to 1 fully spread. Its own channel because a peacock's tail is not always up —
  // the whole of the 孔雀 action is standing at the rail waiting for it, and a fan that is
  // permanently open turns that from a wait into a still life.
  fan: 0,
  blink: 0, sleep: 0, eyeYaw: 0, eyePitch: 0,
  // Quadruped head lift. Elephants also reuse larger values as an action-only trunk-extension
  // control; keeping it separate from `neck` lets those motions layer over idle drift.
  alert: 0,
};
const ATAU = {
  fl: .045, fr: .045, hl: .045, hr: .045, flk: .05, frk: .05, hlk: .05, hrk: .05,
  bob: .05, sway: .08, roll: .09, spinePitch: .16, spineYaw: .10,
  neck: .20, neckYaw: .22, head: .16, headYaw: .18, tail: .13, tailYaw: .15,
  ear: .10, jaw: .09, alert: .30, fan: 1.10, sleep: .24,
  // Posture settles slowly. An animal that snaps from standing to lying in a frame reads as a
  // glitch; over three quarters of a second it reads as an animal deciding to lie down.
  rootDrop: .55, spread: .34, paw: .28, reach: .34,
};

// ---- the walk.
//
// A quadruped at a walk puts its feet down one at a time, and the order is not the one you would
// guess: hind foot, then the fore foot on the *same* side, then across to the other hind. That is
// the lateral-sequence walk, it is what almost every mammal does below a trot, and it is the whole
// difference between an animal walking and a table sliding. Getting it wrong reads instantly as a
// pantomime horse, which is two people who have not agreed on the order either.
//
// The offsets are therefore quarter-cycles in that sequence, and the same `strideWave` and `bump`
// the human gait is built out of do the rest: the wave swings the limb, the bump lifts and folds it
// through the part of the cycle its foot is off the ground.
const FOOTFALL = { hl: 0, fl: .25, hr: .50, fr: .75 };

// `alert` is passed in rather than read back off `p`, because `p` is the *target* the game eases
// toward and is rebuilt from `APOSE` every frame — reading it here would always see the resting 0
// and the animal would never once look up at you.
function animalPose(p, sp, ph, turn, now, A, alert = 0) {
  const g = smooth01(sp / 0.12), still = 1 - g;
  p.alert = alert;
  const swing = A.swing * g, flex = A.flex * g;
  for (const k in FOOTFALL) {
    const u = ((ph / (2 * Math.PI) + FOOTFALL[k]) % 1 + 1) % 1;
    p[k] = strideWave(u) * swing;
    // The middle joint folds only while the foot is in the air. `bump` centred at 0.62 of the
    // cycle puts the fold in the swing phase, which is where a leg shortens itself to clear the
    // ground — fold it during stance instead and the animal walks on its knees.
    p[k + 'k'] = bump(u, .62, .34) * flex;
  }
  // The barrel rises and falls twice per cycle, because two feet leave the ground per cycle. The
  // sway is once, and it is what a body does over the diagonal it is balanced on.
  p.bob = -Math.cos(ph * 2) * A.legU * .035 * g;
  p.sway = Math.sin(ph) * A.legW * .55 * g;
  // An upright bird advances by rocking over each planted foot. Its table value is the authored
  // waddle angle itself (.30 rad for the penguin, .14 for the peacock), not a multiplier on the
  // quadruped's tiny five-degree breathing roll. Treating it as a multiplier made both birds glide
  // almost rigidly; mammals keep the restrained spine roll they had before.
  p.roll = Math.sin(ph) * g * (A.plan === 'upright' ? (A.roll || .14) : .05 * (A.roll || 1));
  // Idle. An animal standing still is never still: it breathes, its head drifts, its tail goes and
  // its ears move, and the ears are the cheapest of the four by a long way.
  // Every animal carries a stable identity seed. Offset all idle clocks here—not only the rarer
  // action layer—so a panda, tiger, elephant and flock of birds breathe, look and move their
  // tails as individuals instead of performing one synchronized mechanical loop.
  const t = now / 1000 + (A.seed || 0) * .37;
  const br = Math.sin(t * (A.plan === 'upright' ? 1.5 : 0.9)) * .5 + .5;
  p.spinePitch = still * br * .022;
  p.neck = still * (Math.sin(t * .43) * .07 - .02) + alert * -.34;
  p.neckYaw = still * Math.sin(t * .31) * .12;
  p.head = still * Math.sin(t * .67) * .09 + alert * -.18;
  p.headYaw = still * Math.sin(t * .52) * .16;
  // The tail swings against the walk and idles on its own clock, and never stops doing either.
  p.tail = Math.sin(ph * .5) * .16 * g + Math.sin(t * 1.1) * .10;
  p.tailYaw = Math.sin(ph) * .22 * g + Math.sin(t * .83) * .16 - turn * .10;
  // An ear flick is a soft, occasional gesture. The old square-wave threshold jumped instantly
  // between 0 and .30 radians; because every animal also shared one seed, the whole zoo snapped
  // at once. A raised-cosine pulse has no discontinuity and the seeded clock keeps individuals
  // out of phase.
  const earCycle = ((t * .13) % 1 + 1) % 1;
  p.ear = Math.sin(t * 1.1) * .055 + bump(earCycle, .40, .08) * .22;
  p.jaw = Math.max(0, Math.sin(t * 2.3)) * .10 * still;
  // Open for roughly a fifth of a slow cycle, on this bird's own phase, so two peacocks in one
  // aviary are never doing it at the same moment.
  p.fan = A.fan ? smooth01((Math.sin(t / 9 + A.seed) - .48) * 4.5) * (1 - g * .6) : 0;
  p.spineYaw = clamp(-turn * .14, -.24, .24);
  return p;
}

// ---- what it is doing.
//
// The animal counterpart of `activityPose`, and it sits in the same place in the pipeline: the gait
// runs first and this is laid over the top of it, so an animal that is asked to graze while it is
// still walking blends between the two instead of snapping.
//
// This is most of the difference between a zoo and a set of models on a lawn. Seven species standing
// in seven boxes is a diorama however good the models are; the same seven eating, drinking, sleeping,
// grooming and displaying is somewhere you stop and watch. Every act here is one an animal in a real
// enclosure spends its day doing, which is also why they are worth the words in the dictionary —
// 吃, 喝, 睡觉, 爬, 游泳 are all visible in this room.
//
// `k` is how much of the act to apply, so the caller can fade it in as the animal comes to a stop.
function animalAct(p, act, now, seed, A, k = 1) {
  if (!act || k <= 0.001) return p;
  const t = now / 1000 + seed * 0.37;
  const L = A.legU + A.legL;                 // how far the body can drop before it is on the floor
  const bird = A.plan === 'upright', ape = A.plan === 'ape';
  // Blend one channel toward a value. Everything below goes through it, so a partly-applied act is
  // a partly-applied pose rather than a fight between two of them.
  const to = (key, v) => { p[key] += (v - p[key]) * k; };
  // Both forelegs, or both hind legs, to one attitude. Four separate assignments per act is how a
  // rig ends up with one leg left behind in a stride.
  const fore = (sw, bd) => { to('fl', sw); to('fr', sw); to('flk', bd); to('frk', bd); };
  const hind = (sw, bd) => { to('hl', sw); to('hr', sw); to('hlk', bd); to('hrk', bd); };

  switch (act) {
    // 吃草 head down to the ground, jaw working. The barrel pitches nose-down and the rump comes
    // up with it, which is what a grazing animal's outline actually is.
    case 'graze':
      if (A.trunk) {
        // An elephant eats with its trunk. Lowering the whole short neck by the giraffe amount
        // buried the face in the chest; keep the head readable and straighten the trunk to forage.
        to('rootDrop', .08); to('neck', .48); to('head', .08); to('spinePitch', .22);
        to('alert', 4.65 + Math.sin(t * .72) * .16);
        to('neckYaw', Math.sin(t * .46) * .16); to('jaw', .03);
        to('ear', Math.sin(t * 1.35) * .14);
      } else if (bird) {
        // Ground birds peck in quick head bobs while the body stays upright. The generic mammal
        // graze left the peacock holding one long, motionless bow.
        const peck = smooth01(Math.sin(t * 5.2) * .5 + .5);
        to('neck', 1.75 + peck * .25); to('head', .24 + peck * .12);
        to('spinePitch', .025); to('jaw', .08 + peck * .18);
        to('headYaw', Math.sin(t * .83) * .24);
      } else if (A.kind === 'tiger') {
        // The tiger is scenting the ground, not eating it: low nose, scanning head, closed jaw.
        to('neck', .76); to('head', .34); to('spinePitch', .055); to('jaw', .04);
        to('neckYaw', Math.sin(t * .54) * .30);
        to('headYaw', Math.sin(t * .91) * .16);
        to('tail', .18 + Math.sin(t * 1.18) * .30);
      } else if (A.kind === 'giraffe') {
        // A two-metre neck needs a much larger angular fold than a panda's short one. Open the
        // stance laterally and settle the body so the muzzle arrives at grass height while all four
        // hoof volumes still meet the floor.
        to('spread', .42); to('rootDrop', L * .087);
        fore(-.06, .14); hind(.04, .12);
        to('neck', 2.35); to('head', .32); to('spinePitch', .08);
        to('jaw', .34 + Math.sin(t * 4.2) * .22);
        to('neckYaw', Math.sin(t * .5) * .18);
        to('tail', Math.sin(t * 1.3) * .22);
      } else {
        to('neck', A.neck > 1 ? 1.08 : .95); to('head', .52); to('spinePitch', .10);
        to('jaw', .34 + Math.sin(t * 4.2) * .22);
        to('neckYaw', Math.sin(t * .5) * .18);
        to('tail', Math.sin(t * 1.3) * .22);
      }
      break;
    // 吃树叶 the opposite: head up into a tree or a feeding rack. The giraffe's whole reason for
    // being the shape it is.
    case 'browse':
      // The rack is below a giraffe's full resting height. A moderate forward fold places its
      // muzzle at the 3.5 m browse deck instead of reaching above the roofline.
      to('neck', 1.00 + Math.sin(t * .48) * .035);
      to('head', -.20 + Math.sin(t * .71) * .045); to('spinePitch', -.04);
      to('jaw', .30 + Math.sin(t * 3.6) * .24);
      to('neckYaw', Math.sin(t * .42) * .22);
      to('headYaw', Math.sin(t * .63) * .14);
      break;
    // 喝水 head to the water. A tall animal has to splay its forelegs to get down to it, which is
    // the single most characteristic thing a giraffe ever does.
    case 'drink':
      if (A.trunk) {
        // Keep the elephant upright and send the trunk down to the wallow. A giraffe-style neck
        // fold made the trunk curl back into the brisket instead of reaching the water.
        to('rootDrop', .12); to('neck', .60); to('head', 0);
        to('spinePitch', .30); to('jaw', 0);
        // `alert` straightens the seven-segment trunk. This larger action-only target is what lets
        // its tip reach the wallow; ordinary player-alert values remain in the 0..1 range.
        to('alert', 5.30 + Math.sin(t * .62) * .08);
        to('neckYaw', Math.sin(t * .38) * .12);
        to('ear', Math.sin(t * 1.10) * .12);
      } else {
        to('neck', 1.22); to('head', .52); to('spinePitch', .13);
        to('jaw', .12 + Math.sin(t * 2.0) * .10);
        if (A.neck > 1.0) {
          // Long legs spread laterally, not fore-and-aft. Lower the root only by the vertical
          // length lost to that angle, keeping all four hoof volumes on the floor.
          to('spread', .58); to('rootDrop', L * .164);
          fore(-.08, .16); hind(.06, .14);
          to('neck', 2.55); to('head', .30);
        }
      }
      break;
    // 坐 up on the haunches, forelegs straight, body tipped back. A panda eats like this and a
    // macaque sits like this all day.
    case 'sit':
      if (ape) {
        to('rootDrop', L * .30); hind(1.25, 1.58); fore(-.08, .34);
        // A macaque sits with its ribcage upright over the haunches. The quadruped default only
        // tipped it twenty degrees and left it lying like a small dog with all four feet forward.
        to('spinePitch', -.58); to('neck', .12); to('head', .42);
        to('tail', .52 + Math.sin(t * .74) * .12);
      } else if (A.kind === 'panda') {
        to('rootDrop', L * .42); hind(1.20, 1.54); fore(-.08, .20);
        to('spinePitch', -.28); to('neck', -.04); to('tail', .24);
      } else {
        // A cat sits over folded haunches with straight forelegs, rather than reclining like a bear.
        to('rootDrop', L * .34); hind(1.08, 1.42); fore(-.04, .12);
        to('spinePitch', -.12); to('neck', -.04);
        to('tail', .48 + Math.sin(t * .82) * .18);
      }
      break;
    // 睡觉 flat out. The legs fold under and the head comes round onto the flank, which is the
    // shape a sleeping cat makes and nothing else does.
    case 'lie':
      // Fold paws into their own volume at floor height. The deeper root drop previously buried
      // both forepaws while leaving the hind feet visibly suspended above the ground.
      to('rootDrop', L * .70); fore(1.42, 1.68); hind(.80, .90);
      to('spinePitch', .04); to('spineYaw', .12);
      to('neck', A.kind === 'tiger' ? .52 : .44);
      to('head', A.kind === 'tiger' ? .38 : .30);
      to('headYaw', A.kind === 'tiger' ? -.94 : -.68);
      if (A.kind === 'tiger') to('tail', .58 + Math.sin(t * .56) * .15);
      else to('roll', .10);
      to('jaw', 0); to('ear', .04); to('sleep', 1);
      // breathing, which is the only thing moving on a sleeping animal and therefore all of it
      to('bob', Math.sin(t * .85) * A.legW * .10);
      to('blink', 1);
      break;
    // 吃竹子 sitting and holding something up to the mouth. The forelegs come off the ground and
    // in toward the chest, and the head comes down to meet them.
    case 'eat':
      to('rootDrop', L * .40);
      hind(1.15, 1.45);
      // Alternate the paws by a few degrees so this reads as manipulating bamboo, not holding an
      // invisible steering wheel. `paw` supplies the shared lift; these channels add the asymmetry.
      to('fl', -1.05 + Math.sin(t * 1.1) * .16);
      to('fr', -1.05 - Math.sin(t * 1.1) * .16);
      to('flk', 1.30 + Math.sin(t * 1.1) * .08);
      to('frk', 1.30 - Math.sin(t * 1.1) * .08);
      to('paw', 1);
      to('spinePitch', -.22);
      to('neck', .30); to('head', .34);
      to('headYaw', Math.sin(t * .72) * .10);
      to('jaw', .40 + Math.sin(t * 5.0) * .26);
      break;
    // 梳毛 sitting and picking through the fur, which is what a macaque does when it is not
    // stealing something.
    case 'groom':
      {
        const hand = Math.sin(t * 2.15);
        to('rootDrop', L * .27); hind(1.18, 1.50);
        to('fl', -.36 + hand * .28); to('fr', -.36 - hand * .28);
        to('flk', 1.02 + hand * .10); to('frk', 1.02 - hand * .10);
        to('paw', .64);
        to('spinePitch', -.56); to('spineYaw', hand * .12);
        to('neck', .36); to('head', .54); to('headYaw', -hand * .48);
        to('tail', .56 + Math.sin(t * .68) * .16);
      }
      break;
    // 爬 up on a rock or a rail: the forelegs go up and the animal rocks back onto its hind ones.
    case 'climb':
      to('reach', .88);
      // `reach` already rotates both arms upward in the renderer. The former -1.25 here added on
      // top of it and folded the hands behind the face; a smaller authored reach leaves paws on
      // the visible rail/rock and the hind feet pushing underneath.
      fore(-.38, .58);
      if (ape) {
        to('hl', .16); to('hr', .44); to('hlk', .48); to('hrk', .72);
        to('sway', Math.sin(t * .82) * A.legW * .34);
      } else hind(.26, .46);
      to('rootDrop', -L * .035); to('spinePitch', -.34);
      to('neck', -.26); to('head', -.18);
      to('tail', -.42 + Math.sin(t * 1.4) * .24);
      break;
    // 游泳 low and level in the water, feet paddling. The body sinks until only the top of it is
    // above the surface — the pool's own quad is at a fixed height, so this is a drop, not a float.
    case 'swim':
      if (bird) {
        // Lay the penguin into a shallow forward dive. At .34 rad it still stood like a person in
        // chest-deep water; roughly one radian gives the unmistakable torpedo silhouette while the
        // same flipper channels become a paired underwater stroke.
        to('rootDrop', A.hip * .70); to('spinePitch', .94);
        to('neck', -.20); to('head', -.18);
        fore(Math.sin(t * 3.8) * .64, .24);
        to('roll', Math.sin(t * 1.7) * .16);
        to('neckYaw', Math.sin(t * .72) * .16);
      } else {
        to('rootDrop', L * .70); to('spinePitch', .34);
        to('neck', -.42); to('head', -.16);
        fore(Math.sin(t * 3.1) * .55, .40); hind(Math.sin(t * 3.1 + 3.14) * .55, .40);
        to('roll', Math.sin(t * 1.6) * .10);
        to('neckYaw', Math.sin(t * .7) * .24);
      }
      break;
    // 开屏 the display, held open and turned slowly from side to side so the fan catches the light.
    case 'display':
      to('fan', 1);
      to('spineYaw', Math.sin(t * .45) * .55);
      to('spinePitch', -.08); to('roll', Math.sin(t * .62) * .025);
      to('neck', -.20); to('head', -.14);
      to('headYaw', Math.sin(t * .9) * .30);
      break;
    // 理毛 a bird turning its head back into its own flank.
    case 'preen':
      {
        // Pick a stable flank per bird so a group does not mirror the same mechanical loop.
        const side = seed % 2 ? 1 : -1;
        to('neck', .60); to('head', .44);
        to('headYaw', side * (1.38 + Math.sin(t * 1.7) * .24));
        to('spineYaw', side * .08); to('roll', side * .075 + Math.sin(t * .8) * .025);
        to(side > 0 ? 'fr' : 'fl', -.16); to(side > 0 ? 'fl' : 'fr', .04);
      }
      to('jaw', .30 + Math.sin(t * 6.0) * .28);
      break;
    // 洗澡 an elephant throwing dust over its own back. The trunk does the work, and `alert` is
    // what curls it — negative here so it rolls up and over rather than reaching forward.
    case 'dust':
      // Curl and release the trunk instead of holding one frozen hook above the forehead. Ear
      // flaps and a slow weight transfer sell the throw without any dust-particle geometry.
      to('alert', -1.20 - Math.sin(t * 1.35) * .30);
      to('neck', -.14); to('headYaw', Math.sin(t * .62) * .46);
      to('spinePitch', -.05); to('roll', Math.sin(t * .70) * .035);
      to('ear', .18 + Math.abs(Math.sin(t * 2.55)) * .42);
      to('fr', -.10 + Math.sin(t * .86) * .10);
      to('tail', Math.sin(t * 1.1) * .30);
      break;
    // 站着 explicitly doing nothing, but doing it awake: the default when a spot names no act.
    default:
      break;
  }
  return p;
}

// ---- the colours.
//
// The animal equivalent of `makeLook`, and deliberately much smaller than it: an animal is not
// wearing anything, so there is no layer resolution to do. What it does do is derive the shading
// tones once — every coat needs a lighter and a darker version of itself for the top of the back
// and the underside of the belly — rather than tinting inside the draw at sixty frames a second.
function makeAnimal(kind, o = {}) {
  const A = ANIMALS[kind];
  if (!A) throw new Error('no such animal: ' + kind);
  const hex = k => C(o[k] || A[k]);
  const coat = hex('coat');
  const S = o.scale || 1;
  // How tall it stands and how much floor it covers. Neither is used by the rig — both are for the
  // game around it: `tall` is where the walk-up label floats and `foot` is how wide a shadow it
  // throws. An elephant and a penguin need very different answers to both, and reading them off
  // `look.tall` the way the human roster does would give a 3 m elephant a person's shadow.
  const tall = A.plan === 'upright' ? (A.hip + A.body[1] + A.neck + A.head[1]) * S
                                    : (A.sho + A.barrel[1] * .55
                                       + A.neck * Math.sin(A.neckRise) + A.head[1]) * S;
  const foot = A.plan === 'upright' ? A.body[0] * 2.2 * S
                                    : (A.len + A.barrel[2] * .70) * .80 * S;
  return {
    ...A, kind, tall, foot,
    // A cub is the adult at four fifths, which is as much as this rig needs to know about growing
    // up: it is the difference between the panda enclosure holding two pandas and it holding a
    // family, and the second one is a zoo.
    S,
    COAT: coat, COATL: tint(coat, 1.14), COATD: tint(coat, 0.78),
    // Legs are their own colour or the coat's. It is one field, and without it a panda is a white
    // bear: the black on a panda is four limbs and a shoulder band, and the limbs are most of it.
    LEG: o.legs || A.legs ? hex('legs') : coat,
    LEGD: tint(o.legs || A.legs ? hex('legs') : coat, 0.82),
    DARK: hex('dark'), FOOT: hex('foot'), EYE: hex('eye'),
    BELLY: hex('belly'), MUZ: hex('muz'), BIB: o.bib || A.bib ? hex('bib') : null,
    seed: o.seed || 7,
  };
}

// `lod` follows the human rig exactly: 0 is close enough for eyes and ear detail, 1 is mid, 2 is an
// animal across the enclosure. The pattern work — a tiger's stripes, a giraffe's patches — is the
// first thing to go, because it is a couple of dozen draws that resolve to a smear past ten metres.
function drawAnimal(pose, px, pz, yaw, A, lod, lift = 0) {
  const S = A.S, trim = lod < 2, fine = lod < 1;
  const FUR = { gloss: A.gloss, mode: A.mode };
  const SKINF = { gloss: A.gloss * 1.6 };
  // `rootDrop` is in the animal's own metres and lowers everything: the legs fold and the barrel
  // comes down to meet them. Without it, `sit` and `lie` fold the legs and leave the body hanging
  // where it was, which is an animal doing yoga in mid-air.
  const root = M.mul(M.trans(px, lift + (pose.bob - pose.rootDrop) * S, pz),
    M.mul(M.rotY(yaw + pose.spineYaw), M.mul(M.rotZ(pose.roll), M.trans(pose.sway * S, 0, 0))));
  const shape = (name, parent, x, y, z, sx, sy, sz, color, mat = FUR) =>
    R.draw(name, M.mul(parent, M.mul(M.trans(x * S, y * S, z * S),
      M.scale(sx * S, sy * S, sz * S))), color, mat);
  // A shape that has to carry a rotation of its own. `R.draw` reads the model matrix and nothing
  // else — an `rx` in the options object is read by no one, which is a mistake this project has
  // made once per rig — so every angle below is composed into the matrix.
  const turned = (name, parent, x, y, z, rot, sx, sy, sz, color, mat = FUR) =>
    R.draw(name, M.mul(parent, M.mul(M.trans(x * S, y * S, z * S),
      M.mul(rot, M.scale(sx * S, sy * S, sz * S)))), color, mat);

  // ---------------------------------------------------------------- the head
  // Shared by all three plans, because a muzzle, two eyes and a pair of ears are the same problem
  // whether they are on top of a neck or on the front of a bird. `frame` arrives already placed and
  // already pointed; everything here is in head-local metres with +z out through the nose.
  function head(frame) {
    const [hw, hh, hd] = A.head;
    // The skull is three masses, not one ball. A single ellipsoid is a jellybean from every angle;
    // a cranium, a narrower brow in front of it and a pair of cheeks either side is the difference
    // between a head and a lump, and it costs three draws.
    shape('ball', frame, 0, 0, -hd * .06, hw, hh, hd, A.COAT);
    if (trim) {
      shape('ball', frame, 0, hh * .14, hd * .16, hw * .82, hh * .74, hd * .74, A.COAT);
      // cheeks, which is where the width of a face actually lives
      for (const s of [-1, 1])
        // Coat-coloured, always. Painted cream on the tiger to suggest its pale cheeks, the two
        // of them plus the cream muzzle between them made one big pale mass across the whole lower
        // face, and what the animal read as from the side was a skull.
        shape('ball', frame, s * hw * .34, -hh * .14, hd * .10,
          hw * .48, hh * .52, hd * .58, A.COAT);
    }
    if (A.muzzle) {
      const [mw, mh, md] = A.muzzle;
      // Forward and a little down. A muzzle on the centre line of the skull reads as a snout
      // growing out of the forehead, which is a crocodile.
      shape('ball', frame, 0, -hh * .16, hd * .42, mw, mh, md, A.MUZ, SKINF);
      // The nose pad, and the two nostrils in it. Nostrils are four millimetres across and they
      // are worth drawing: a face with a blank nose reads as a toy, and this is the closest the
      // player ever gets to one of these animals.
      const nz = hd * .42 + md * .46;
      shape('ball', frame, 0, -hh * .19, nz, mw * .52, mh * .48, mw * .42, A.DARK, { gloss: .34 });
      if (fine)
        for (const s of [-1, 1])
          shape('ball', frame, s * mw * .16, -hh * .20, nz + mw * .16,
            mw * .11, mh * .12, mw * .06, tint(A.DARK, .55), { gloss: .20 });
      // The mouth line, and the jaw that opens it. Only worth drawing close up, where it is the
      // difference between an animal and a soft toy.
      if (fine)
        turned('capsule', frame, 0, -hh * .28 - pose.jaw * mh * .5, hd * .40,
          M.rotZ(Math.PI / 2), mw * .30, mw * 1.05, mw * .30, A.DARK, { gloss: .22 });
      // A brow ridge over each eye. On a tiger and a macaque this is most of the expression, and
      // on everything else it stops the forehead reading as a bald dome.
      if (fine)
        for (const s of [-1, 1])
          turned('ball', frame, s * hw * .30, hh * .30, hd * .26, M.rotZ(-s * .26),
            hw * .30, hh * .11, hd * .22, A.COATD, FUR);
    }
    // 面部 the bare skin of a macaque's face: a pink mask round the eyes and muzzle that stops at
    // the fur line. It is the one thing that makes a monkey read as a monkey rather than as a
    // small brown quadruped, and it is a single shape.
    if (A.face && trim)
      shape('ball', frame, 0, hh * .04, hd * .34, hw * .74, hh * .78, hd * .52,
        C(A.face), { gloss: .20 });
    // 颊毛 the cheek ruff. A tiger's flares out sideways below the ears, a panda's is the round
    // white cheek under the eye patch, a macaque's frames the face. Two broad overlapping tufts a
    // side carry that outline without turning the jaw into a string of beads at normal camera
    // distance. They also cost half as many draws as the old four-small-balls version.
    if (A.ruff && trim)
      for (const s of [-1, 1])
        for (let i = 0; i < 2; i++) {
          const u = i;
          // Down the jawline and tucked into the cheek. The lower tuft narrows and turns farther,
          // giving the outside edge a taper instead of four separate circular bumps.
          turned('ball', frame, s * hw * (.36 + u * .045), hh * (-.08 - u * .22),
            hd * (.08 - u * .12), M.rotZ(s * (.34 + u * .34)),
            hw * A.ruff * (.76 - u * .14), hh * A.ruff * (.56 - u * .06),
            hd * A.ruff * .48,
            i % 2 ? A.COAT : A.COATL, FUR);
        }
    if (A.trunk) {
      // 鼻子. Seven tapering segments on an arc, each hung off the last, so the trunk curls
      // instead of hinging: a trunk built as two long cones is a fire hose, and the one thing
      // everybody knows about an elephant is the shape of this.
      let f = M.mul(frame, M.mul(M.trans(0, -A.head[1] * .22 * S, A.head[2] * .45 * S),
        M.rotX(-.30)));
      const N = 7;
      for (let i = 0; i < N; i++) {
        const k = 1 - i / N * .62, seg = A.trunk / N;
        // The curl tightens toward the tip and the whole thing lifts a little when the animal is
        // alert, which is the one gesture an elephant has that nothing else does.
        const bend = .12 + i * .085 - pose.alert * .09 + Math.sin(Date.now() / 900 + i) * .012;
        f = M.mul(f, M.rotX(bend));
        R.draw('limb', M.mul(f, M.mul(M.trans(0, -seg * .5 * S, 0),
          M.scale(A.head[0] * .34 * k * S, seg * 1.06 * S, A.head[0] * .34 * k * S))),
          i > 4 ? A.COATD : A.COAT, FUR);
        f = M.mul(f, M.trans(0, -seg * S, 0));
      }
      // 皱纹 the rings down a trunk. An elephant's trunk is not a smooth cone — it is ringed all the
      // way along, and at this scale the rings are the only thing that separates it from a hose.
      if (A.folds && trim) {
        let g2 = M.mul(frame, M.mul(M.trans(0, -A.head[1] * .22 * S, A.head[2] * .45 * S),
          M.rotX(-.30)));
        const N2 = 7;
        for (let i = 0; i < N2; i++) {
          const k = 1 - i / N2 * .62, seg = A.trunk / N2;
          const bend = .12 + i * .085 - pose.alert * .09;
          g2 = M.mul(g2, M.rotX(bend));
          for (let j = 0; j < 2; j++)
            R.draw('ball', M.mul(g2, M.mul(M.trans(0, -seg * (.28 + j * .44) * S, 0),
              M.scale(A.head[0] * .36 * k * S, seg * .055 * S, A.head[0] * .36 * k * S))),
              A.COATD, FUR);
          g2 = M.mul(g2, M.trans(0, -seg * S, 0));
        }
      }
      if (A.tusk && trim)
        for (const s of [-1, 1])
          turned('limb', frame, s * A.head[0] * .22, -A.head[1] * .18, A.head[2] * .34,
            M.mul(M.rotX(-.62), M.rotZ(s * .18)), .052, A.tusk, .052, C('#e6ddc6'),
            { gloss: .30 });
    }
    if (A.beak) {
      // A bird's whole face is the beak, so it is two tapers meeting rather than one: an upper
      // that comes off the skull and a shorter lower one under it that the jaw channel opens. Keep
      // both narrow enough to read as a beak: the former near-head-width pair made the penguin look
      // as though it had two yellow bowls strapped round its face.
      turned('taper', frame, 0, -A.head[1] * .06, A.head[2] * .34, M.rotX(Math.PI / 2 + .10),
        A.head[0] * .58, A.beak, A.head[1] * .36, A.MUZ, { gloss: .30 });
      turned('taper', frame, 0, -A.head[1] * .18 - pose.jaw * .02, A.head[2] * .32,
        M.rotX(Math.PI / 2 + .26), A.head[0] * .48, A.beak * .66, A.head[1] * .20,
        tint(A.MUZ, .84), { gloss: .30 });
    }
    if (A.crest && trim)
      // The three-feather crest a peahen has as well, which is the fastest way to say "this is a
      // bird and not a duck" from across the aviary.
      for (let i = -1; i <= 1; i++) {
        turned('capsule', frame, i * A.head[0] * .16, A.head[1] * .55, A.head[2] * .05,
          M.rotZ(i * .22), .008, A.head[1] * .95, .008, A.DARK, { gloss: .30 });
        shape('ball', frame, i * A.head[0] * .24, A.head[1] * 1.02, A.head[2] * .05,
          .022, .030, .010, A.COATL, { gloss: .34 });
      }
    // ---- ears
    const ea = pose.ear;
    if (A.ear === 'round')
      for (const s of [-1, 1])
        turned('ball', frame, s * (hw * .42), hh * .40, -hd * .06, M.rotZ(s * (.22 + ea * .30)),
          A.earR, A.earR, A.earR * .40, A.kind === 'panda' ? A.DARK : A.COATD, FUR);
    else if (A.ear === 'fan')
      // An elephant's ear is the largest single surface on the animal and it never stops moving.
      // Hung off the back of the skull rather than the side: on the side they read as wings.
      for (const s of [-1, 1])
        turned('softBox', frame, s * (hw * .44), -hh * .10, -hd * .16,
          M.mul(M.rotY(s * (.42 + ea * .34)), M.rotZ(s * .10)),
          A.earR * .12, A.earR * 1.02, A.earR * 1.30, A.COATD,
          // Thin, wider than tall and generously rounded. The former metre-high portrait slabs
          // hid most of the head from the viewing rail; this keeps the broad Asian-elephant fan
          // while restoring the forehead, eyes and tusks to the silhouette.
          { gloss: A.gloss, round: .34 });
    else if (A.ear === 'leaf')
      for (const s of [-1, 1])
        turned('ball', frame, s * (hw * .46), hh * .28, -hd * .07,
          M.rotZ(s * (.72 + ea * .34)), A.earR * .30, A.earR, A.earR * .58, A.COATD, FUR);
    if (A.horns && trim)
      // 角. Ossicones, which are not horns: short, blunt, furred, and finished with a dark knob.
      for (const s of [-1, 1]) {
        // `limb` is centred on its origin. Centre the stem halfway above the skull; placing its
        // origin at the hairline left a visible air gap between the stem and the tip ball.
        turned('limb', frame, s * hw * .22, hh * .44 + .075, -hd * .02, M.rotZ(s * .16),
          .034, .17, .034, A.COATD, FUR);
        shape('ball', frame, s * hw * .26, hh * .44 + .15, -hd * .02, .046, .042, .046,
          A.DARK, FUR);
      }
    // ---- eyes. Two dark beads set into the side of the skull, not the front of it: forward-facing
    // eyes are a primate and a predator, and putting them there is what turned the first giraffe
    // into a cartoon. The tiger and the macaque genuinely have them forward, so `eyeFwd` moves them.
    if (trim) {
      const fwd = A.plan === 'ape' || A.kind === 'tiger' || A.beak ? .40 : .24;
      // `game.js` refreshes the ordinary blink channel after action posing. Sleep therefore owns
      // a separate eased lid target, so a lying tiger does not reopen its eyes every frame.
      const open = 1 - clamp(Math.max(pose.blink, pose.sleep || 0), 0, 1);
      for (const s of [-1, 1]) {
        const ex = s * hw * (A.beak ? .40 : .43), ez = hd * fwd, ey = hh * .13;
        if (A.kind === 'panda' && trim)
          // The patch, which is bigger than the eye by a factor of four and set at an angle. It is
          // the single most recognisable thing on the animal.
          turned('ball', frame, ex * .94, ey - hh * .02, ez * .90, M.rotZ(s * .42),
            hw * .40, hh * .34, hd * .22, A.DARK, FUR);
        shape('ball', frame, ex, ey, ez, hw * .13, hh * .12 * open + .002, hd * .10, A.EYE,
          { gloss: .52 });
        if (fine && open > .3)
          shape('ball', frame, ex + s * .004, ey + hh * .04, ez + hd * .05,
            hw * .045, hh * .040, hd * .030, C('#f2efe8'), { gloss: .60 });
      }
    }
  }

  // ---------------------------------------------------------------- 四条腿 the legs
  // Three segments and a foot. The middle joint's fold direction is the whole reason a foreleg and
  // a hind leg look different from one another: a foreleg's elbow folds *backward* and a hind leg's
  // stifle folds *forward*, and an animal built with all four the same way is a toy horse. `dir`
  // carries that, and it is the only difference between the two calls.
  function limb(parent, x, y, z, swing, bend, dir, U, L, w, foot, side) {
    // `spread` is normally zero. A drinking/grazing giraffe uses it to open its exceptionally long
    // legs sideways; trying to fake the same silhouette with opposite X-axis swings sent one hoof
    // a metre forward and the other behind like a split rather than a stable drinking stance.
    const splay = (pose.spread || 0) * side;
    const top = M.mul(parent, M.mul(M.trans(x * S, y * S, z * S),
      M.mul(M.rotZ(splay), M.rotX(swing))));
    // Elephants carry their weight on near-columnar limbs. Feeding their measurements through the
    // generic cat/bear taper produced four bulbous thighs above narrow shins — especially obvious
    // from the public rail — so the same segment count uses a restrained, species-authored profile.
    const column = !!A.columns;
    const segmentMesh = column ? 'capsule' : 'limb';
    // The shoulder or haunch the limb comes out of. Without it a leg is a stick pushed into the
    // side of a barrel; a mammal's limb emerges from a mass of muscle and that mass is visible
    // from every angle the player ever sees the animal from.
    if (trim)
      R.draw('ball', M.mul(top, M.mul(M.trans(0, -U * .16 * S, 0),
        M.scale(w * (column ? 1.30 : 1.75) * S, U * (column ? .64 : .78) * S,
          w * (column ? 1.38 : 1.85) * S))), A.COAT, FUR);
    R.draw(segmentMesh, M.mul(top, M.mul(M.trans(0, -U * .5 * S, 0),
      M.scale(w * (column ? 1.00 : 1.15) * S, (U + w * (column ? .28 : .5)) * S,
        w * (column ? 1.00 : 1.15) * S))), A.LEG, FUR);
    const mid = M.mul(top, M.mul(M.trans(0, -U * S, 0), M.rotX(bend * dir)));
    R.draw(segmentMesh, M.mul(mid, M.mul(M.trans(0, -L * .5 * S, 0),
      M.scale(w * (column ? .92 : .86) * S, (L + w * (column ? .25 : .4)) * S,
        w * (column ? .92 : .86) * S))), A.LEG, FUR);
    // The joint itself, so the two segments meet in something instead of intersecting.
    if (trim)
      R.draw('ball', M.mul(mid, M.scale(w * (column ? .88 : .95) * S,
        w * (column ? .82 : .95) * S, w * (column ? .88 : .95) * S)), A.LEGD, FUR);
    // Leg markings: a tiger's are ringed and a giraffe's carry the patches down onto the limb.
    // Both stop the legs reading as four plain tubes under a patterned body, which is the thing
    // that makes an animal look half-finished.
    if (A.stripes && trim)
      for (let i = 0; i < 3; i++)
        turned('ball', mid, 0, -L * (.20 + i * .28), 0, M.rotZ(.10),
          w * .95, L * .045, w * .95, A.DARK, FUR);
    if (A.patches && trim)
      for (let i = 0; i < 2; i++)
        turned('ball', top, 0, -U * (.30 + i * .40), w * .30, M.rotX(.2),
          w * .80, U * .16, w * .40, A.DARK, FUR);
    const f = M.mul(mid, M.trans(0, -L * S, 0));
    // The foot. A paw and a hoof are different animals: a cat's is a soft pad with toes on the
    // front of it, an elephant's is a column with nails round the rim, and a giraffe's is a
    // cloven hoof. One ellipsoid served all three and read as a slipper.
    R.draw('ball', M.mul(f, M.mul(M.trans(0, 0, w * (column ? .18 : .30) * S),
      M.scale(w * (column ? 1.08 : 1.05) * S, w * (column ? .50 : .72) * S,
        w * (column ? 1.14 : 1.45) * S))), foot, FUR);
    if (!trim) return f;
    if (A.hoof) {
      // cloven: two dark blocks at the toe with a split between them
      for (const s of [-1, 1])
        R.draw('ball', M.mul(f, M.mul(M.trans(s * w * .30 * S, -w * .12 * S, w * .82 * S),
          M.scale(w * .46 * S, w * .52 * S, w * .70 * S))), A.DARK, { gloss: .26 });
    } else if (A.nails) {
      // an elephant's toenails: a row of pale crescents round the front of the column
      for (let i = -2; i <= 2; i++)
        R.draw('ball', M.mul(f, M.mul(
          M.trans(i * w * .25 * S, -w * .22 * S,
            (w * .70 - Math.abs(i) * w * .10) * S),
          M.scale(w * .21 * S, w * .17 * S, w * .12 * S))), C('#cfc7b4'), { gloss: .28 });
    } else {
      // toes: three or four pads across the front of the paw
      for (let i = -1; i <= 1; i++)
        R.draw('ball', M.mul(f, M.mul(M.trans(i * w * .34 * S, -w * .10 * S, w * .92 * S),
          M.scale(w * .30 * S, w * .34 * S, w * .34 * S))), foot, FUR);
      // and claws on the ones that have them, which is every predator in this zoo
      if (fine && A.claws)
        for (let i = -1; i <= 1; i++)
          R.draw('ball', M.mul(f, M.mul(M.trans(i * w * .34 * S, -w * .16 * S, w * 1.16 * S),
            M.scale(w * .10 * S, w * .10 * S, w * .20 * S))), C('#d8d2c4'), { gloss: .34 });
    }
    return f;
  }

  if (A.plan === 'quad' || A.plan === 'ape') {
    const [bw, bh, bl] = A.barrel;
    const hz = -A.len / 2, fz = A.len / 2;
    // Legs hang off the world-upright root rather than off the pitched spine. The spine's pitch is
    // a breath and a stretch — a couple of degrees — and hanging the legs from it means an animal
    // that inhales lifts its own feet off the floor.
    // `paw` and `reach` lift the forelegs off the ground — holding a stem of bamboo up to the
    // mouth, or standing up against a rock. Both are added to the swing the gait already asked
    // for rather than replacing it, so an animal that is still coasting to a stop keeps walking
    // out of the stride it is in.
    const fLift = -(pose.paw * 1.15 + pose.reach * 1.30);
    limb(root, -bw * .34, A.sho, fz, pose.fl + fLift, pose.flk, -1,
      A.legU, A.legL, A.legW, A.FOOT, -1);
    limb(root,  bw * .34, A.sho, fz, pose.fr + fLift, pose.frk, -1,
      A.legU, A.legL, A.legW, A.FOOT, 1);
    limb(root, -bw * .36, A.hip, hz, pose.hl, pose.hlk,  1,
      A.legU, A.legL, A.legW, A.FOOT, -1);
    limb(root,  bw * .36, A.hip, hz, pose.hr, pose.hrk,  1,
      A.legU, A.legL, A.legW, A.FOOT, 1);

    // The barrel. Pitched about the hip so an animal that lowers its head lifts its rump, which is
    // what a grazing quadruped does and what a bear does going up a slope.
    const midY = (A.hip + A.sho) / 2 + bh * .28;
    const spine = M.mul(root, M.mul(M.trans(0, midY * S, 0), M.rotX(pose.spinePitch)));
    // Three masses, not one: chest, belly, haunch. One ellipsoid the length of the animal is a
    // zeppelin, and the taper from a deep chest back to a narrower hip is most of what makes a
    // cat a cat.
    shape('ball', spine, 0, (A.sho - A.hip) * .30, bl * .30, bw * 1.03, bh * 1.00, bl * .62,
      A.COAT);
    shape('ball', spine, 0, 0, 0, bw * 1.06, bh * .98, bl * .70, A.COAT);
    shape('ball', spine, 0, (A.hip - A.sho) * .18, -bl * .34, bw * .95, bh * .92, bl * .58,
      A.COAT);
    // The underside, a shade paler on everything that has one. Countershading is not decoration —
    // it is the reason a real animal reads as solid instead of as a flat cut-out.
    if (trim)
      shape('ball', spine, 0, -bh * .40, -bl * .04, bw * .84, bh * .34, bl * .80, A.BELLY);
    // 熊猫's shoulder band: the black saddle over the forelegs that joins the two front limbs
    // across the back. Without it the black legs read as four socks.
    if (A.kind === 'panda')
      // Raised and shortened. Centred low and nearly the full height of the barrel it painted the
      // whole belly black as well, and a panda's underside is white — the band is a saddle over the
      // shoulders that comes down round the forelegs, and it stops there.
      shape('ball', spine, 0, bh * .22, bl * .30, bw * 1.09, bh * .80, bl * .30, A.DARK);
    // 老虎's stripes, and 长颈鹿's patches. Both are flattened shapes laid on the barrel a
    // millimetre proud of it, and both are the first thing `lod` throws away.
    if (A.stripes && trim)
      // 斑纹. Markings lying on the two flanks and over the spine, not slices through the animal.
      // Built as one box per stripe the width and height of the body's whole cross-section, eleven
      // of them 3 cm thick down a 58 cm barrel merged into a single opaque black block with a
      // tiger's head and legs sticking out of it — the shape was right and the animal was wearing a
      // crate. A stripe is a surface, so it goes on the surface: thin radially, long the way the
      // marking actually runs.
      // Narrow and short of the spine. Nearly full-height blades every 5 cm came out as a black
      // mane down the animal's back: a tiger is an orange animal with dark markings on it, and the
      // moment the markings cover more than about a fifth of the flank it stops being one.
      // Broad and alternating long/short, which is what a tiger's flank actually looks like.
      // Fifteen thin full-height bars at an even pitch came out as a comb: a row of identical
      // black teeth hanging off the spine and past the belly, more barcode than animal.
      for (let i = 0; i < A.stripes; i++) {
        const t = (i / (A.stripes - 1) - .5) * 1.52;
        const long = i % 2 ? 1 : .66;               // real stripes are not all the same length
        for (const s2 of [-1, 1])
          turned('ball', spine, s2 * bw * .40, -bh * .02 - bh * (1 - long) * .10, bl * t * .55,
            M.rotZ(s2 * (.14 + t * .40)),
            bw * .15, bh * .60 * long, bl * .026, A.DARK, FUR);
        // every third one carries over the back, which is what joins the two sides into one animal
        if (i % 3 === 1)
          turned('ball', spine, 0, bh * .38, bl * t * .55, M.rotX(t * .28),
            bw * .68, bh * .11, bl * .034, A.DARK, FUR);
      }
    if (A.patches && trim)
      for (let i = 0; i < A.patches; i++) {
        // A deterministic scatter over the barrel. `rnd` here is the same integer hash the scenes
        // use, seeded off the animal, so one giraffe's markings are its own and stay put.
        let q = (A.seed + i * 2654435761) >>> 0;
        const r = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        const a = r() * Math.PI * 2, v = (r() - .5) * 1.7;
        // Big and only slightly proud. Thin radial plates read as scabs at any distance; what a
        // giraffe actually has is large blocks of colour with thin pale lines between them, and at
        // this scale the way to get that is overlapping patches most of the size of the gaps.
        shape('ball', spine, Math.sin(a) * bw * .34, Math.cos(a) * bh * .32, bl * v * .46,
          bw * .34, bh * .34, bl * .19, A.DARK, FUR);
      }

    // ---- 脖子 the neck and the head on it. Two segments, so it curves.
    // `neckRise` is an angle off the *horizontal* — 0.05 for a tiger carrying its head level in
    // front of its shoulders, 1.20 for a giraffe holding it almost straight up. The limb it rotates
    // is built along +y, which is already vertical, so the rotation that has to be applied is the
    // complement: `π/2 − rise`. Applied as `−rise` it read the number as a tilt from vertical
    // instead, which put the tiger's head above its shoulders and left the giraffe's neck sticking
    // straight out in front of it like a plank — two metres of it, perfectly level with the back.
    const nBase = M.mul(spine, M.mul(M.trans(0, bh * .44 * S, bl * .44 * S),
      M.mul(M.rotY(pose.neckYaw), M.rotX(Math.PI / 2 - A.neckRise + pose.neck))));
    // Narrower than it was. At `bw * .52` a tiger's neck was as wide as its head, and a head sitting
    // on a column of its own width has no neck at all — it reads as a bucket with ears.
    const nw = bw * (A.plan === 'ape' ? .50 : .36);
    // Segmented, so a long neck can taper along its length and carry markings down it. One `limb`
    // the whole way was fine for a tiger's 26 cm and hopeless for a giraffe's two metres, where the
    // taper and the pattern are most of what you are looking at.
    const NS = A.neckSegs || 1;
    for (let i = 0; i < NS; i++) {
      const u0 = i / NS, u1 = (i + 1) / NS;
      const k = 1 - u0 * .38;                       // thins toward the head
      R.draw('limb', M.mul(nBase, M.mul(M.trans(0, A.neck * (u0 + u1) * .5 * S, 0),
        M.scale(nw * k * S, A.neck / NS * 1.06 * S, nw * k * S))), A.COAT, FUR);
      // A giraffe's neck is the most heavily patched part of it, and it was the one part with no
      // markings at all — which is why the animal read as a plain yellow crane from any distance.
      // Plain shapes, not radially-turned ones. Squashed along a radius the patches came out as a
      // ring of thin collars round the base of the neck and nothing above it; a giraffe's markings
      // are big and they tile the whole hide, so what reads at any distance is size, not thinness.
      if (A.patches && trim)
        for (let j = 0; j < 5; j++) {
          const a2 = (i * 5 + j) * 2.399, u = u0 + (j + .5) / 5 / NS;
          shape('ball', nBase, Math.sin(a2) * nw * k * .34, A.neck * u, Math.cos(a2) * nw * k * .34,
            nw * k * .62, A.neck / NS * .30, nw * k * .62, A.DARK, FUR);
        }
    }
    if (A.mane && trim)
      // The mane, which runs the whole length and is the only thing that reads on a neck this long
      // from the far side of the paddock.
      for (let i = 0; i < 14; i++)
        R.draw('capsule', M.mul(nBase, M.mul(M.trans(0, A.neck * (.06 + i * .068) * S,
          -nw * (1 - i * .026) * .46 * S),
          M.scale(.024 * S, .11 * S, .055 * S))), A.DARK, FUR);
    // And the head undoes most of that again, because an animal carries its head level whatever
    // its neck is doing: a giraffe reaching up does not point its nose at the sky.
    const hFrame = M.mul(nBase, M.mul(M.trans(0, A.neck * S, 0),
      M.mul(M.rotY(pose.headYaw + pose.eyeYaw),
        M.rotX(-(Math.PI / 2 - A.neckRise) * .86 + pose.head))));
    head(hFrame);

    // ---- 尾巴 the tail. Hung off the haunch, drooping by its own amount, swinging on two axes.
    if (A.tail > .02) {
      const tBase = M.mul(spine, M.mul(M.trans(0, bh * .24 * S, -bl * .48 * S),
        M.mul(M.rotY(pose.tailYaw), M.rotX(A.tailDroop + pose.tail))));
      const N = A.tail > .4 ? 4 : 2;
      let f = tBase;
      for (let i = 0; i < N; i++) {
        const seg = A.tail / N, k = 1 - i / N * .45;
        R.draw('limb', M.mul(f, M.mul(M.trans(0, -seg * .5 * S, 0),
          M.scale(A.legW * .62 * k * S, seg * 1.05 * S, A.legW * .62 * k * S))),
          A.tailRings && i % 2 ? A.DARK : A.COAT, FUR);
        f = M.mul(f, M.mul(M.trans(0, -seg * S, 0), M.rotX(pose.tail * .5 + .10)));
      }
      // The tuft an elephant and a giraffe both finish with, and a tiger does not.
      if (A.tuft)
        R.draw('ball', M.mul(f, M.scale(A.legW * .52 * S, A.legW * .90 * S, A.legW * .52 * S)),
          A.DARK, FUR);
    }
  }

  if (A.plan === 'upright') {
    // A standing bird. The body is one tapering mass stood on end with the two legs under the front
    // third of it — under the middle, which is where they look like they should go, the bird sits
    // back on its heels and reads as a bowling pin.
    const [bw, bh, bd] = A.body;
    // Centred so the bottom of the body comes down past the hip joint: at `bh * .82` the barrel
    // floated a hand's width clear of its own legs, which on a penguin is very obvious indeed.
    const body = M.mul(root, M.mul(M.trans(0, (A.hip + bh * .40) * S, 0),
      M.rotX(pose.spinePitch + .10)));
    shape('ball', body, 0, 0, 0, bw, bh, bd, A.COAT);
    shape('ball', body, 0, -bh * .34, bd * .16, bw * .90, bh * .52, bd * .92, A.COAT);
    // The white front, which on a penguin is the entire animal from the front.
    if (trim)
      shape('ball', body, 0, -bh * .06, bd * .26, bw * .80, bh * .84, bd * .58, A.BELLY);
    // ---- 翅膀 flippers. They hang and they never fold: a penguin's flipper has no elbow, and the
    // swing is the whole arm rocking from the shoulder against the walk.
    for (const s of [-1, 1]) {
      const a = s * (.20 + (s > 0 ? pose.fr : pose.fl) * 1.4);
      turned('softBox', body, s * bw * .46, -bh * .10, 0, M.mul(M.rotZ(a), M.rotX(-.10)),
        bw * .26, A.flipper, bd * .52, A.COATD, { gloss: A.gloss, round: .05 });
    }
    // ---- 尾羽 the tail, and the fan if this one has one.
    if (A.fan && trim && pose.fan > .02) {
      // 开屏. Twenty-two feathers on a half-circle behind the bird, each a long flat spine with an
      // eye on the end. Each blade is built along its own +y and then swung round by `rotZ`, which
      // is the whole trick: composed the other way — `rotZ(a)` after an `rotX(PI/2)` that had
      // already laid the blade along z — every one of the twenty-two came out on the same axis and
      // the fan drew itself as a single feather. It is the kind of bug that looks like nothing
      // rendering at all.
      //
      // Leaning back by .35 rad rather than .85: at the steeper angle the fan lay down behind the
      // bird and read from the front as a puddle.
      const fanF = M.mul(body, M.mul(M.trans(0, -bh * .30 * S, -bd * .46 * S), M.rotX(-.35)));
      const EYE1 = C('#1c6f4a'), EYE2 = C('#2b2f6b');
      for (let i = 0; i < 22; i++) {
        const a = (i / 21 - .5) * Math.PI * 1.02;
        // Folding shut shortens the blades rather than closing the angle, so a shut tail is a
        // bundle of quills behind the bird instead of a fan edge-on to you.
        const len = A.fan * (.72 + Math.cos(a) * .28) * pose.fan;
        const rot = M.rotZ(a);
        R.draw('softBox', M.mul(fanF, M.mul(rot, M.mul(M.trans(0, len * .5 * S, 0),
          M.scale(.030 * S, len * S, .012 * S)))), i % 2 ? A.COATL : A.COAT,
          { gloss: .30, round: .010 });
        if (!fine) continue;
        R.draw('ball', M.mul(fanF, M.mul(rot, M.mul(M.trans(0, len * S, .005 * S),
          M.scale(.100 * S, .076 * S, .012 * S)))), EYE1, { gloss: .34 });
        R.draw('ball', M.mul(fanF, M.mul(rot, M.mul(M.trans(0, len * S, .010 * S),
          M.scale(.052 * S, .040 * S, .010 * S)))), EYE2, { gloss: .40 });
      }
    } else if (A.fan && trim) {
      // A peacock is still a peacock with the fan shut. One long, low train replaces the generic
      // penguin-sized tail and keeps the species readable through all of its grazing/preening day;
      // it is the same single draw the short tail used, only an authored silhouette.
      turned('softBox', body, 0, -bh * .38, -bd * .50, M.rotX(.94),
        bw * .68, A.fan * .84, bd * .14, A.COATD,
        { gloss: A.gloss, round: .035 });
    } else if (trim) {
      turned('softBox', body, 0, -bh * .42, -bd * .50, M.rotX(.70),
        bw * .60, bh * .52, bd * .18, A.COATD, { gloss: A.gloss, round: .04 });
    }
    // ---- legs. Short, set forward, and the reason the walk is a rock rather than a stride: the
    // roll channel does most of the work and the legs barely move at all.
    for (const s of [-1, 1])
      limb(root, s * bw * .26, A.hip, bd * .18, s > 0 ? pose.fr : pose.fl,
        s > 0 ? pose.frk : pose.flk, -1, A.legU, A.legL, A.legW, A.FOOT);
    // ---- neck and head. The neck rises out of the shoulders and the head sits forward of it.
    const nBase = M.mul(body, M.mul(M.trans(0, bh * .44 * S, bd * .10 * S),
      M.mul(M.rotY(pose.neckYaw), M.rotX(pose.neck * 1.4 - .10))));
    R.draw('limb', M.mul(nBase, M.mul(M.trans(0, A.neck * .5 * S, 0),
      M.scale(bw * .58 * S, A.neck * 1.06 * S, bw * .58 * S))), A.COAT, FUR);
    if (A.BIB && trim)
      // The yellow flash down the side of an emperor penguin's neck, and the peacock's brighter
      // throat. One shape, and it is the only thing that distinguishes the two silhouettes.
      R.draw('ball', M.mul(nBase, M.mul(M.trans(0, A.neck * .34 * S, bw * .26 * S),
        M.scale(bw * .48 * S, A.neck * .40 * S, bw * .34 * S))), A.BIB, { gloss: .22 });
    head(M.mul(nBase, M.mul(M.trans(0, A.neck * S, 0),
      M.mul(M.rotY(pose.headYaw + pose.eyeYaw), M.rotX(pose.head + .10)))));
  }
}
