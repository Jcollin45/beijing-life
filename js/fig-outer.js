// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ------------------------------------------------------------------------------- outerwear
//
// Beijing has a real winter and the whole cast owned one jacket between them. So: the padded
// 羽绒服 that is most of what a Beijing pavement is wearing from November to March, a wool
// overcoat, a windbreaker, a suit, a hoodie worn open over a top, the buttoned 中山装 of an older
// man, and the blue cotton jacket of a 师傅.
//
// A look asks for one by name:
//
//   outer:       'puffer' | 'overcoat' | 'windbreak' | 'suit' | 'hoodie' | 'zhongshan' | 'work'
//   outerColor:  '#hex'  — the cloth. Falls back to `jacket`, then to `top`.
//   outerLining: '#hex'  — what shows down an open front and inside a hood.
//   outerHood:   true    — a hood, worn *down*, on the back. Never a shape on the head: the face
//                          is the whole reason this rig exists.
//   collarUp:    true    — the collar turned up round the neck instead of lying down on it.
//
// `outer` is worn *instead of* `jacket`, not on top of it. Both at once is two coats, and only
// the shirt underneath is guaranteed clearance — see `hd` below for the fudge that keeps the
// pair of them from z-fighting anyway.
//
// Three things shape everything here.
//
// **A coat is the body mesh again.** figure.js builds its jacket as the same `body` a few
// millimetres larger than the shirt, and that is the right trick — the mesh already has the
// chest, the waist and the sloping shoulders in it, and a coat built out of flat panels comes
// out as a board hung off the front of a man. Everything below is that shell plus its edges.
//
// **Nothing laid on the front guesses where the front is.** The shell is a curved surface whose
// depth changes by four centimetres between the waist and the collarbone, so a placket at a
// fixed z is sunk into the chest at one end and floating off it at the other, and wherever it
// grazes the surface the two faces are coplanar and the garment flickers as stripes. `front(y)`
// answers where the cloth actually is — as an ellipse in section, so a pocket 12 cm off the
// centre line knows it is on the turn of the chest — and `laid()` puts a zip, a lapel or a
// pocket welt on it with a guaranteed step. That is why the body mesh's profile is copied here.
//
// **The sleeves mostly belong to figure.js.** `makeLook` already resolves the arms and shoulders
// to the outermost layer there is — `arm = jacket || yoke || top` — so the shim at the bottom of
// this file adds `outer` to the front of that chain and the existing sleeves come out in the
// coat's colour for free, bending at the elbow because they are figure.js's own. Only a *padded*
// coat needs more than that, and it gets a second, fatter sleeve on the same shoulder and elbow
// frames, rebuilt here from `pose`. Hung off the torso instead it would stand still while the
// arm lifted, which is the one failure that shows up in every reach pose.

// Wrapped, like the other wardrobe files, so that studio.html and index.html can both carry a
// script tag for it and a second copy re-registers the builder instead of throwing on a
// re-declared name — which is a blank studio and no clue why.
(function () {

// The `body` mesh's own profile, from `makeBody` in js/gl.js: half-width and half-depth at each
// ring, bottom to top, in the mesh's own units. Duplicated here rather than derived because a
// coat *is* that mesh scaled up, and every edge on it — a ring round the waist, a zip down the
// chest, a lapel, a pocket — has to sit on the surface within a millimetre or two. If that mesh's
// waist or shoulder is ever reshaped this table has to move with it; nothing else here does.
const OUTER_PROF = [
  [-.50, .300, .230], [-.46, .335, .250], [-.38, .345, .255], [-.26, .340, .250],
  [-.12, .345, .250], [ .02, .360, .255], [ .16, .385, .258], [ .28, .400, .252],
  [ .37, .402, .238], [ .44, .368, .212], [ .48, .285, .168], [ .50, .175, .112],
];
// Filled rather than returned: this is asked a dozen times per coat per frame and a crowd in
// January is twenty coats, so it does not get to allocate a pair of numbers each time.
const OUTER_PR = [0, 0];
function outerProfAt(py) {
  const n = OUTER_PROF.length;
  if (py <= OUTER_PROF[0][0]) { OUTER_PR[0] = OUTER_PROF[0][1]; OUTER_PR[1] = OUTER_PROF[0][2]; return; }
  for (let i = 1; i < n; i++) {
    const b = OUTER_PROF[i];
    if (py <= b[0]) {
      const a = OUTER_PROF[i - 1], u = (py - a[0]) / (b[0] - a[0]);
      OUTER_PR[0] = a[1] + (b[1] - a[1]) * u;
      OUTER_PR[1] = a[2] + (b[2] - a[2]) * u;
      return;
    }
  }
  OUTER_PR[0] = OUTER_PROF[n - 1][1]; OUTER_PR[1] = OUTER_PROF[n - 1][2];
}

// Cloth. `FABRIC` is the material and it is the right one — same weave, same 16 cm scale, same
// restraint about moving a garment's colour. What differs between a nylon shell and a wool coat
// is the sheen and how much of the weave you can see, so these are FABRIC with two numbers
// changed and its texture still resolved through the same lazy getter, because this file is
// parsed long before there is a GL context to make a texture in. Built once per (sheen, corner)
// pair and cached: seven garments share three of them.
const OUTER_MATS = {};
function outerCloth(FABRIC, gloss, round, amt) {
  const key = gloss + ':' + round;
  return OUTER_MATS[key] || (OUTER_MATS[key] = {
    mode: 7, gloss, round, matScale: 0.16, matAmt: amt,
    get mat() { return FABRIC.mat; },
  });
}

// One row per garment. `hem` is where the cloth stops, in torso-frame metres below the hip;
// `pad` is how far the shell stands off the shirt, which is the whole difference between a
// windbreaker and a duvet with sleeves. Everything else names a behaviour implemented below.
const OUTER_KIND = {
  // 羽绒服. Thick, quilted in horizontal channels, zipped, a high padded collar and a hem you
  // could not tuck in. The one garment on this list that has to read from across a road.
  puffer:    { hem: -0.115, pad: 0.026, gloss: 0.17, weave: 0.14, collar: 'stand',
               front: 'zip', pocket: 'slash', quilt: 3, sleeve: 1, band: 1 },
  // 大衣. Long enough to need its own hem below the waist, which is the only garment here that
  // swings — see `swing`. Notch lapels, two buttons, flap pockets.
  // Sleeveless in the sense that matters here: wool over a shirt is barely thicker than the
  // shirt, so it uses figure.js's own sleeve — already in the coat's colour, already bending at
  // the elbow — rather than paying eight draws for a second one that looks the same.
  overcoat:  { hem: -0.205, pad: 0.017, gloss: 0.05, weave: 0.30, collar: 'notch',
               front: 'button', buttons: 2, pocket: 'flap', skirt: 1, crease: 1 },
  // 冲锋衣. A thin shell: stand collar, centre zip, a drawcord at the waist, zipped pockets.
  windbreak: { hem: -0.055, pad: 0.014, gloss: 0.22, weave: 0.12, collar: 'stand',
               front: 'zip', pocket: 'zip', cord: 1 },
  // A suit jacket. Lapels that actually sit: rolled back at the top, drawn in against the
  // opening rather than set out on the pectorals as a pair of pads.
  suit:      { hem: -0.035, pad: 0.013, gloss: 0.08, weave: 0.22, collar: 'notch',
               front: 'open', buttons: 2, pocket: 'welt' },
  // A hoodie worn open over whatever is underneath, with the hood down on the back.
  hoodie:    { hem: -0.035, pad: 0.017, gloss: 0.04, weave: 0.32, collar: 'none',
               front: 'open', pocket: 'kanga', hood: 1, cord: 1 },
  // 中山装. Buttoned to the throat on a low stand collar, four patch pockets with flaps. The
  // silhouette is the point: no opening, no lapel, nothing of the shirt showing anywhere.
  zhongshan: { hem: -0.075, pad: 0.014, gloss: 0.06, weave: 0.26, collar: 'mao',
               front: 'button', buttons: 4, pocket: 'patch4' },
  // The blue cotton jacket of a 师傅 — a mechanic, a porter, a man on a market stall. Plain
  // turn-down collar, three buttons, two big patch pockets at the hip, and creases.
  work:      { hem: -0.045, pad: 0.014, gloss: 0.05, weave: 0.34, collar: 'fold',
               front: 'button', buttons: 3, pocket: 'patch2', crease: 1 },
};

FigureFit['outer'] = ctx => {
  // Before anything is unpacked: most of a hutong is not wearing a coat, and this is called once
  // per figure per frame for every one of them.
  const lk = ctx.lk;
  const K = lk.outer && OUTER_KIND[lk.outer];
  if (!K) return;
  const { shape, R, M, tint, F, pose, lod, trim, torso, W, T, BODY, FABRIC } = ctx;
  // `trim` is figure.js's one gate for everything invisible at crowd distance and it gates the
  // lapels, the quilting, the zips and the pockets here too. `fine` is a second tier inside this
  // file for the things that are already small at conversational range — buttons, cuffs, creases
  // — so lod 1 gets a coat with edges without paying for its stitching.
  const fine = lod < 1;

  const OUT = lk.OUTER || lk.JACK || lk.TOP;
  const OUTL = lk.OUTERL || tint(OUT, 1.15);
  const OUTD = lk.OUTERD || tint(OUT, 0.74);
  const LIN = lk.OUTERLIN || tint(OUT, 0.58);
  // What shows down an open front: a gilet worn beneath wins over the shirt, as it does for
  // figure.js's own jacket.
  const UNDER = lk.VEST || lk.TOP;
  const CLOTH = outerCloth(FABRIC, K.gloss, 0, K.weave);
  const PANEL = outerCloth(FABRIC, K.gloss, 0.012, K.weave);

  // ---- the shell.
  //
  // Placed by its top and its hem rather than by a centre and a height, because the two ends
  // want different things: the shoulder seam is the same on every coat in the list and the hem
  // is most of what tells them apart. A long coat stops at the waist here and hangs the rest of
  // itself off a swinging frame further down.
  const top = 0.634 * BODY;
  const cut = K.skirt ? -0.055 : K.hem;
  const sy = top - cut, cy = (top + cut) / 2;
  const hw = 0.201 * W + K.pad * 0.85;
  // 0.1238 W is the shirt's own half-depth at the chest (0.258 of the body mesh at figure.js's
  // 0.48 W). The extra centimetre when a jacket is *also* worn is not tidiness: figure.js's
  // lapels sit at a flat z of 0.130 whatever the build, so on a narrow figure they poke through
  // a coat sized off W alone and the two garments stripe against each other.
  const hd = 0.1238 * W + K.pad + (lk.JACK ? 0.011 : 0);
  const sx = hw / 0.402, sd = hd / 0.258;
  shape('body', torso, 0, cy, -0.002, sx, sy, sd, OUT, CLOTH);

  // Where the shell's surface actually is. The chest is an *ellipse* in section as well as a
  // curve in profile, so a pocket set 13 cm off the centre line is a good two centimetres
  // shallower than the middle of the chest is — place it at the centre line's depth and it hangs
  // in the air beside the coat, which is exactly what the first version of this did.
  const halfW = y => { outerProfAt((y - cy) / sy); return OUTER_PR[0] * sx; };
  // The shell's surface at a point on the chest: how far forward the cloth is there, and which
  // way it faces. Both come out of the same ellipse. A chest is not a plane — a pocket 12 cm off
  // the centre line is two centimetres shallower than the middle of the chest *and* turned a good
  // twenty degrees away from straight ahead — and a flat panel placed without the turn has its
  // outer edge hanging in the air and its inner edge buried in the coat, which is a patch pocket
  // floating off a man's hip. Returned through two variables because this is called five or six
  // times per garment per frame and a January crowd is twenty coats.
  let SZ = 0, SYAW = 0;
  const surfAt = (y, x) => {
    outerProfAt((y - cy) / sy);
    const a = OUTER_PR[0] * sx, b = OUTER_PR[1] * sd;
    // Capped short of the side of the body: at the very edge the normal turns through a right
    // angle over a couple of millimetres and a pocket placed there flips onto the man's flank.
    const u = Math.min(0.94, Math.abs(x) / a), c = Math.sqrt(1 - u * u);
    SZ = b * c - 0.002;
    SYAW = Math.atan2(Math.sign(x) * u / a, c / b);
  };
  const front = (y, x) => { surfAt(y, x || 0); return SZ; };

  // A piece laid flat on the front of the coat — a zip, a button placket, a lapel, a pocket welt,
  // a crease. Two things have to be right or it flickers.
  //
  // Straight between two heights it is a chord across a convex chest: it stands off at the ends
  // and sinks in through the middle, and wherever it grazes the cloth the two faces are coplanar
  // and the whole thing strobes as stripes down the man's front. So it is pushed out by its own
  // sag as well as by `step`, and tilted onto the profile.
  //
  // And it is placed on the *tangent plane* at its own centre rather than at some fixed depth.
  // A tangent plane to a convex surface lies entirely outside that surface, so every corner of
  // the piece clears by at least `step` however wide it is and however far it is rolled — which
  // is why nothing here has to declare how far sideways it reaches.
  const laid = (mesh, y0, y1, x, roll, w, d, col, mat, grow = 0, step = 0.011) => {
    const ym = (y0 + y1) / 2;
    surfAt(y0, x); const zA = SZ;
    surfAt(y1, x); const zB = SZ;
    surfAt(ym, x); const zM = SZ, yaw = SYAW;
    const off = step + Math.max(0, zM - (zA + zB) / 2);
    const dy = y1 - y0, dz = zB - zA;
    R.draw(mesh, M.mul(torso, M.mul(
        M.trans(x + off * Math.sin(yaw), ym, zM - (zM - (zA + zB) / 2) + off * Math.cos(yaw)),
        M.mul(M.mul(M.mul(M.rotY(yaw), M.rotZ(roll)), M.rotX(Math.atan2(dz, dy))),
          M.scale(w, Math.hypot(dy, dz) + grow, d)))), col, mat);
  };

  // ---- how the cloth moves.
  //
  // A hem trails back as somebody walks off and rocks against the hips, and both fall out of the
  // pose that is already there rather than out of any state this file keeps. `torsoPitch` is the
  // one channel that tracks speed and nothing else — 0 standing still, .045 at a walk, .245 at a
  // run — and `sway` is the weight going over the stance foot. Both are already eased by the
  // pose smoother, so the hem starts and stops moving smoothly for free.
  //
  // Sign: rotX tips the top of a frame toward +z and +z is forward (a *negative* thigh swings
  // the leg forward, and the knee hangs below the hip), so a positive angle carries a hem that
  // hangs *below* its pivot backward — which is both the trail and the gravity that keeps a coat
  // vertical while the torso leans into the walk. One term does both.
  const gait = Math.min(1, Math.max(0, (pose.torsoPitch - 0.008) / 0.045));
  const swingX = 0.115 * gait;
  const swingZ = Math.max(-0.12, Math.min(0.12, -pose.sway * 1.7));

  // ---- the hem.
  //
  // The body mesh runs in to 0.300 of its width at the bottom, which on a short coat pulls the
  // hem into the hips like a peplum. The band is the fix as well as the detail: as wide as the
  // coat is at the waist, in the shade that every other hem and cuff on this rig uses, so the
  // silhouette goes straight down to a visible edge and stops.
  if (K.skirt) {
    // A long coat below the waist, on its own frame so it can swing. Kept as one soft panel with
    // a generous corner rather than a second body mesh: what matters down here is that it hangs
    // and that the swinging thigh stays inside it.
    const pivot = cut + 0.020;
    const hemFrame = M.mul(torso, M.mul(M.trans(0, pivot, 0),
      M.mul(M.rotX(swingX), M.rotZ(swingZ))));
    const drop = pivot - K.hem;
    // The `taper` mesh and not a soft box: a box down there is a slab with corners hung off the
    // hips, which is what this was, and the taper is a cone frustum that flares the way a heavy
    // coat does. Its top ring is 0.72 of its bottom, and the two flare figures below are chosen
    // so that ring lands on the shell's own waist — off by a centimetre either way and the coat
    // steps in or out where the two meet.
    //
    // The depth is not styling. At 0.20 below the hip a thigh swung to a walking 0.35 rad has
    // carried its own front face about 0.15 forward on an average build, and a panel shallower
    // than that shows a knee through the front of the coat on every stride — the arithmetic that
    // keeps this game's skirts on people who stand rather than on people who cross the map. The
    // trail-back above buys another two centimetres at speed, which is when it is needed.
    const flareW = 0.211 * W + K.pad, flareD = 0.158 * W + K.pad;
    R.draw('taper', M.mul(hemFrame, M.mul(M.trans(0, (0.030 - drop) / 2, -0.002),
      M.scale(2 * flareW, drop + 0.030, 2 * flareD))), OUT, CLOTH);
    R.draw('capsule', M.mul(hemFrame, M.mul(M.trans(0, -drop + 0.016, -0.002),
      M.scale(2 * flareW * 1.02, 0.042, 2 * flareD * 1.02))), OUTD, CLOTH);
  } else {
    // Short coats do not get a frame of their own — the shell holds the shoulders and cannot
    // rotate — but the band can still lag, and a hem edging back as somebody walks off is most
    // of what "the coat has weight" looks like from behind.
    const hy = K.hem + 0.014;
    const bw = Math.max(halfW(hy), hw * 0.90), bd = Math.max(front(hy), hd * 0.90);
    shape('capsule', torso, 0, hy, -0.002 - 0.022 * gait,
      2 * bw, K.band ? 0.046 : 0.036, 2 * bd, OUTD, CLOTH);
  }

  // ---- quilting.
  //
  // Horizontal channels are what makes a 羽绒服 a 羽绒服 rather than a smooth blue tube, and a
  // ring taking its two radii from the shell's own profile sits *on* the coat at every height
  // instead of cutting into the waist and floating off the chest. Four per cent proud is about a
  // centimetre at the chest: enough to catch a highlight, not enough to read as ribbing. Stopped
  // below the armhole, where the ring would otherwise reach the deltoid.
  //
  // A cylinder and not a capsule, which is what these were. A capsule's cap is a hemisphere and
  // scaled to a 6 cm ring it is a very flat dome, so it leaves the shell almost tangentially and
  // the pair of surfaces run within a fraction of a millimetre of each other for a centimetre and
  // a half — which is z-fighting, and it showed up as a sawtooth along the top of every channel.
  // A cylinder's cap is a disc: it cuts the shell at a right angle and the channel has an edge.
  if (trim && K.quilt) {
    const q0 = K.hem + 0.080, q1 = 0.415 * BODY;
    for (let i = 0; i < K.quilt; i++) {
      const y = q0 + (q1 - q0) * (K.quilt > 1 ? i / (K.quilt - 1) : 0.5);
      shape('cyl', torso, 0, y, -0.002,
        2 * halfW(y) * 1.04, 0.058, 2 * front(y) * 1.04,
        i & 1 ? OUT : OUTL, CLOTH);
    }
  }

  // ---- the front.
  const openBot = K.hem + 0.045;
  if (K.front === 'zip') {
    // A zip runs the whole way to the collar and is the only vertical accent on the coat, so it
    // is drawn in the dark shade and kept narrow. Under a scarf it is invisible anyway.
    if (trim) laid('capsule', openBot, 0.600 * BODY, 0, 0, 0.020, 0.030, OUTD, CLOTH);
  } else if (K.front === 'open') {
    // Worn open. There is no hole in the shell — there is a strip of whatever is underneath laid
    // proud of it, with the coat's own front edges standing proud of *that*, which is what an
    // open coat reads as. Narrow on purpose: run the under-layer down to the waist at the full
    // width of the opening and it comes out as a bib hanging off the man's neck. Skipped under a
    // scarf, which fills the opening on its own — beside it the strip is a second clashing line.
    // Kept to the chest, not run to the hem. figure.js's own version of this stops at the
    // sternum for a reason: taken all the way down it stops being a shirt showing through an
    // opening and becomes a cream bib hanging off the man's neck, which is what this was.
    if (!lk.SCARF)
      laid('softBox', 0.250 * BODY, 0.552 * BODY, 0, 0, 0.070, 0.024, UNDER, PANEL);
    // The coat's own front edges, one each side of that — and *edges*, not panels. Wide ones in
    // the coat's own colour were two boards bolted to a man's chest with a bib between them:
    // there is nothing for the eye to read as an opening, because a panel the colour of the coat
    // standing two centimetres off the coat is just more coat. A narrow strip in the dark shade
    // is a hem, and a hem down each side of a gap is what an open coat actually looks like.
    //
    // Rolled so they splay at the top and meet at the bottom: an opening is a V. With the sign
    // the other way round they close over the shirt at the collarbone and open out at the hem,
    // which puts a cream wedge on the man's stomach and reads as an apron.
    //
    // Only *slightly*, though, and only as far up as there is an opening to edge. On a suit the
    // lapels make the V and these stop at the lapel break underneath them; on a hoodie there is
    // no lapel and the zip is very nearly vertical, so at a suit's rake and a suit's length the
    // two of them ran shoulder to hip across a pale coat and read as a pair of braces.
    if (trim)
      for (const s of [-1, 1])
        laid('capsule', K.hem + 0.070, (K.collar === 'notch' ? 0.400 : 0.520) * BODY,
          s * 0.050, s * -0.06, 0.038, 0.024, OUTD, CLOTH, 0, 0.013);
  } else {
    // Buttoned through: one placket down the centre and the buttons on it. 中山装 and a work
    // jacket both close to the throat, so the placket runs all the way to the collar and is
    // lifted a shade so the fold catches light. An overcoat's does neither — it stops at the
    // lapel break, because above that the lapel *is* the front of the coat, and it stays the
    // coat's own colour, because a pale band up the middle of a wool overcoat reads as a stripe
    // painted on rather than as an edge of cloth.
    if (trim)
      laid('softBox', openBot, K.collar === 'notch' ? 0.400 * BODY : 0.585 * BODY, 0, 0,
        0.054, 0.022, K.collar === 'notch' ? OUT : OUTL, PANEL);
    if (fine) {
      const b0 = openBot + 0.055, b1 = 0.540 * BODY;
      for (let i = 0; i < K.buttons; i++) {
        const y = b1 - (b1 - b0) * (K.buttons === 1 ? 0 : i / (K.buttons - 1));
        shape('ball', torso, 0, y, front(y) + 0.030, 0.026, 0.026, 0.016, OUTD, CLOTH);
      }
    }
  }

  // ---- lapels.
  //
  // The pads-on-the-pectorals failure is worth stating because it is what these were: short,
  // pill-round, set out on the chest with a gap between them and the shirt. A lapel that sits is
  // long, flat, drawn *in* against the opening, and rolled back at the top: `laid` puts it on the
  // chest's tangent plane and the extra rotX takes its top edge back toward the collarbone, so
  // the pair of them close the V instead of hovering over it.
  if (trim && K.collar === 'notch') {
    const y0 = 0.345 * BODY, y1 = 0.588 * BODY, ym = (y0 + y1) / 2;
    for (const s of [-1, 1]) {
      const x = s * 0.077;
      surfAt(y0, x); const zA = SZ;
      surfAt(y1, x); const zB = SZ;
      surfAt(ym, x); const zM = SZ, yaw = SYAW;
      const off = 0.019 + Math.max(0, zM - (zA + zB) / 2);
      // The roll back is the whole difference between a lapel and a rectangle stuck on a chest,
      // and it is a *further* 0.17 on top of whatever the profile is already doing here.
      const ang = Math.atan2(zB - zA, y1 - y0) - 0.17;
      R.draw('softBox', M.mul(torso, M.mul(
          M.trans(x + off * Math.sin(yaw), ym, (zA + zB) / 2 + off * Math.cos(yaw)),
          M.mul(M.mul(M.mul(M.rotY(yaw + s * -0.16), M.rotZ(s * 0.20)), M.rotX(ang)),
            M.scale(0.098, Math.hypot(y1 - y0, zB - zA), 0.026)))), OUTD, PANEL);
    }
  }

  // ---- the collar.
  //
  // Two behaviours, and `collarUp` moves any of them to the first. A collar turned up is a
  // funnel round the neck: the `taper` mesh flipped end for end, so it is narrow where it meets
  // the coat and open at the top. Its inner radius has to clear the scarf as well as the neck —
  // a scarf on this rig is 0.069 across the wrap — or a coat and a scarf together stripe.
  const stand = K.collar === 'stand' || lk.collarUp;
  const cyN = F.collarY * BODY;
  if (stand) {
    // Height is the thing to get wrong here. Two centimetres taller than this and the collar is
    // over the jaw and up to the mouth — which a 羽绒服 genuinely does on a cold morning, and
    // which is also the whole face gone on a rig that exists to show faces.
    R.draw('taper', M.mul(torso, M.mul(M.trans(0, cyN + 0.034 * BODY, 0.004),
      M.mul(M.rotX(Math.PI), M.scale(0.238, 0.126 * BODY, 0.246)))), OUT, CLOTH);
    // The lip: a padded collar has a rolled edge at the top, and without it the funnel ends in a
    // flat disc and reads as a cardboard tube round the man's neck.
    if (trim)
      R.draw('capsule', M.mul(torso, M.mul(M.trans(0, cyN + 0.090 * BODY, 0.004),
        M.scale(0.244, 0.034, 0.252))), OUTD, CLOTH);
  } else if (K.collar === 'mao') {
    // 中山装: a low, straight stand collar closed at the throat. A cylinder, because its top and
    // bottom edges are meant to be crisp — a capsule here rounds them off into a neck roll.
    R.draw('cyl', M.mul(torso, M.mul(M.trans(0, cyN + 0.030 * BODY, 0.004),
      M.scale(0.208, 0.088 * BODY, 0.216))), OUT, CLOTH);
  } else if (K.collar !== 'none') {
    // Turned down, over the collarbone. A band round the back of the neck, and — on a coat that
    // has no lapel to carry the front — a wing each side, splayed outward and tipped well
    // forward: tipped only slightly a collar lies flat and reads as two tabs stuck on sideways,
    // and most of the angle is it turning down. On a notch lapel the lapel *is* the front of the
    // collar, so the wings would be a third layer on the same collarbone.
    R.draw('capsule', M.mul(torso, M.mul(M.trans(0, cyN + 0.006, 0.004),
      M.scale(0.176, 0.048 * BODY, 0.184))), OUT, CLOTH);
    if (trim && K.collar === 'fold')
      for (const s of [-1, 1])
        R.draw('softBox', M.mul(torso, M.mul(M.trans(s * 0.078, cyN - 0.004, 0.062),
          M.mul(M.mul(M.rotY(s * -0.46), M.rotX(0.58)),
            M.scale(0.104, 0.030 * BODY, 0.112)))), OUTD, PANEL);
  }

  // ---- the hood, down.
  //
  // On the back of the neck, not on the head. Bigger and set lower than the one figure.js draws
  // for `collar: 'hood'`, so a hoodie worn *under* a coat still shows one bunched hood and not
  // two. Kept above y 0.47 so it sits over a daypack's lid rather than inside it, which is also
  // where a real hood ends up once the straps are on.
  if (K.hood || lk.outerHood) {
    shape('ball', torso, 0, 0.598 * BODY, -0.142, 0.272, 0.226 * BODY, 0.196, OUT, CLOTH);
    if (trim)
      shape('capsule', torso, 0, 0.686 * BODY, -0.092, 0.196, 0.046 * BODY, 0.056, LIN, CLOTH);
  }

  // ---- pockets.
  if (trim) {
    if (K.pocket === 'slash' || K.pocket === 'zip') {
      // Hand-warmer pockets, raked back the way a hand goes into one.
      const y0 = K.hem + 0.075, y1 = K.hem + 0.180;
      for (const s of [-1, 1])
        laid('capsule', y0, y1, s * 0.118, s * 0.60,
          K.pocket === 'zip' ? 0.020 : 0.030, 0.026, OUTD, CLOTH);
    } else if (K.pocket === 'flap' || K.pocket === 'patch2') {
      const y = K.hem + (K.pocket === 'flap' ? 0.145 : 0.115);
      for (const s of [-1, 1])
        laid('softBox', y - 0.052, y + 0.052, s * 0.112, 0, 0.124, 0.024,
          K.pocket === 'flap' ? OUTD : OUT, PANEL);
    } else if (K.pocket === 'patch4') {
      // Two on the chest, two at the hip: the four patch pockets are the 中山装, more than the
      // collar is. The upper pair are smaller, which is what stops them reading as a bib.
      for (const [y, w, h] of [[0.436 * BODY, 0.104, 0.092], [K.hem + 0.132, 0.126, 0.112]])
        for (const s of [-1, 1])
          laid('softBox', y - h / 2, y + h / 2, s * (w * 0.50 + 0.046), 0, w, 0.022,
            OUT, PANEL);
    } else if (K.pocket === 'welt') {
      // A suit's pockets are slits, not bags: two thin welts at the hip and one on the breast.
      for (const s of [-1, 1])
        laid('capsule', K.hem + 0.118, K.hem + 0.136, s * 0.108, 0, 0.126, 0.018,
          OUTD, CLOTH, 0.026);
      if (fine)
        laid('capsule', 0.452 * BODY, 0.464 * BODY, -0.102, 0, 0.074, 0.014,
          OUTD, CLOTH, 0.016);
    } else if (K.pocket === 'kanga') {
      // One pouch across the front. Two-thirds of the chest wide, not the whole of it — at full
      // width there is no coat left either side of it and the hoodie reads as a bib.
      laid('softBox', K.hem + 0.062, K.hem + 0.158, 0, 0, 0.190, 0.022, tint(OUT, 0.86), PANEL);
    }
  }

  // ---- a drawcord at the waist, and creases.
  if (trim && K.cord) {
    const y = K.hem + 0.055;
    shape('capsule', torso, 0, y, -0.002, 2 * halfW(y) * 1.02, 0.026, 2 * front(y) * 1.02,
      OUTD, CLOTH);
  }
  if (fine && K.crease) {
    // Two short diagonals where a coat actually creases: out of the hip, toward the opposite
    // shoulder. Nothing on this rig folds, and two lines in the shade the hems already use are
    // most of the difference between wool and painted plastic at conversational range.
    for (const s of [-1, 1])
      laid('capsule', K.hem + 0.125, K.hem + 0.205, s * 0.100, s * 0.72, 0.020, 0.018,
        OUTD, CLOTH, 0.040, 0.009);
  }

  // ---- padded sleeves.
  //
  // Only for the coats thick enough that figure.js's own sleeve, already in the coat's colour,
  // is visibly too thin for it. Built on the shoulder and elbow frames the rig builds — same
  // 0.495 BODY pivot, same 0.31 T upper arm, same 0.018 elbow inset — because a sleeve hung off
  // the torso stands still while the arm lifts and tears open at the shoulder in every reach.
  // The cap is a ball centred on the shoulder *joint*, so it turns about itself and covers the
  // deltoid at any arm angle rather than sliding off it.
  if (trim && K.sleeve) {
    const upper = 0.31 * T, lower = 0.29 * T, g = K.pad * 1.15;
    for (const [x, sh, splay, elb] of [[-0.225, pose.shL, pose.shLz, pose.elbL],
                                       [ 0.225, pose.shR, pose.shRz, pose.elbR]]) {
      const sho = M.mul(torso, M.mul(M.trans(x * W, 0.495 * BODY, 0),
        M.mul(M.rotZ(splay), M.rotX(sh))));
      // Drawn inboard of the joint, not on it. The shoulder frame already sits 0.225 W out and
      // figure.js's deltoid is another ball at 0.148 W, so a cap centred on the pivot puts a
      // third bulge outboard of both and the man comes out in American football pads. Pulled in,
      // it fills the gap between the shell and the sleeve instead, which is the job.
      shape('ball', sho, -Math.sign(x) * 0.030, 0.006, -0.004,
        0.150 * W + g, 0.172 * BODY + g * 0.7, 0.188 * W + g, OUTL, CLOTH);
      shape('limb', sho, 0, -upper * 0.50, 0, 0.112 * W + g, upper + 0.045, 0.120 * W + g,
        OUT, CLOTH);
      const el = M.mul(sho, M.mul(M.trans(0, -upper + 0.018, 0), M.rotX(elb)));
      // A padded sleeve tapers: it is thickest at the shoulder and comes in to a cuff, and at a
      // constant thickness the whole way down both arms read as bolsters.
      shape('limb', el, 0, -lower * 0.50, 0, 0.082 * W + g * 0.55, lower + 0.040,
        0.090 * W + g * 0.55, OUT, CLOTH);
      // The cuff, at the wrist, standing proud of the sleeve it closes.
      if (fine)
        shape('capsule', el, 0, -lower + 0.026, 0, 0.098 * W + g * 0.55, 0.032,
          0.106 * W + g * 0.55, OUTD, CLOTH);
    }
  }
};

// ---------------------------------------------------------------------------------- the shim
//
// `makeLook` builds a look out of an explicit list of keys, so a garment key it has never heard
// of is dropped on the way in and never reaches `drawFigure` — which means a file like this one
// cannot be asked for anything. Until the five keys at the top of this file are adopted there,
// this carries exactly those across, and does the two things that belong in `makeLook` rather
// than in a draw loop: resolves the colour once, where every other colour in a look is resolved,
// and puts the coat at the front of the `jacket || yoke || top` chain that already decides which
// layer owns the arms and the shoulders — so the sleeves come out in the coat's colour and bend
// at the elbow without this file drawing them.
//
// Wrapped rather than edited because js/figure.js has one owner and it is not this file. It is
// idempotent, it adds keys and changes nothing when `outer` is absent, and it calls through, so
// it chains with the same wrapper in js/fig-uniform.js and js/fig-acc.js in whatever order
// index.html happens to load them — each one only ever adds its own fields. Later wins on a
// shared field, which is why `ARM` is set here and not defended: a uniform loaded after this one
// is allowed to take the sleeves off a coat.
//
// **This is a shim: it wants deleting.** The ask on js/figure.js is `outer`, `outerColor`,
// `outerLining`, `outerHood` and `collarUp` in `makeLook`, with `outer` joining the front of the
// `jacket || yoke || top` chain that resolves `arm` — the body of the function below is the whole
// change. Three files are now queued behind the same one-line ask.
if (typeof makeLook === 'function' && !makeLook.__outer) {
  const base = makeLook;
  const wrapped = function (o) {
    const lk = base(o);
    const kind = o && o.outer;
    if (kind && kind !== 'none' && OUTER_KIND[kind]) {
      const c = C(o.outerColor || o.jacket || o.top);
      lk.outer = kind;
      lk.OUTER = c; lk.OUTERL = tint(c, 1.15); lk.OUTERD = tint(c, 0.74);
      lk.OUTERLIN = o.outerLining ? C(o.outerLining) : tint(c, 0.58);
      lk.outerHood = !!o.outerHood;
      lk.collarUp = !!o.collarUp;
      lk.ARM = c; lk.ARML = tint(c, 1.20); lk.ARMD = tint(c, 0.76);
    }
    return lk;
  };
  wrapped.__outer = 1;
  // Through `globalThis` and inside a try, as the other two do: a bare assignment is the same
  // thing on a writable global, but says less and throws rather than degrades if the binding is
  // ever frozen. A coat that loses its keys is a coat that does not draw; that is survivable.
  try { globalThis.makeLook = wrapped; } catch (e) { /* frozen global: no outerwear, no crash */ }
}

})();
