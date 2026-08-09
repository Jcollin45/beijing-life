// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ---------------------------------------------------------------- 五官 the close-up face
//
// figure.js builds the face's *masses*: a skull with a brow ridge, a cheekbone and a jaw corner on
// it, eyes with lids and lashes, a nose in three pieces, two lips, a chin. What it does not build
// is the small stuff that turns those masses into a particular person, and at conversational range
// the small stuff is most of what somebody looks like. This file is that layer and nothing else —
// nostrils, the ridge down the nose, the crease over an eyelid, the edge of a lip, and some of
// what fifty years does to all of them.
//
// Four things shape every decision in here, and three of them were learned the hard way.
//
// **A feature here is one millimetre proud, and `surf` is wrong by four.** figure.js places
// everything against `surf`, which models the skull as the plain ellipsoid the head mesh is built
// from. The head mesh is not that ellipsoid: `makeHead` in gl.js adds a frontal bulge, a brow,
// cheekbones, a temple hollow, a projecting chin and a jaw taper on top of it, and the difference
// is +4 mm across the middle of the face, −1 mm at the mouth and as much as −30 mm at the corner
// of the jaw. Four millimetres is nothing to figure.js, whose features are centimetres deep. It is
// everything to a crease. Placed against `surf`, the line beside the nose was buried out of sight
// while the line beside the nostril — twenty millimetres lower, where the error changes sign —
// stood off the cheek as a fat pale tube. `hsurf` below solves the actual mesh, and everything
// here is placed against that. (`.figcheck.js` section 3 checks it: nothing in this file is on the
// buried list, and figure.js's own philtrum, jaw shadow, jaw corner and mouth corner all are.)
//
// **A tone that looks dark on paper is not dark on screen.** Colours are authored in sRGB and the
// frame is tonemapped and encoded back to sRGB, so cutting the linear albedo by a third comes out
// as about a sixth of a stop. At `tint(SKIND, 0.80)` — what the age creases in figure.js use — a
// three-millimetre crease is *the same tone as the cheek it lies on*; rendered, the first set of
// these read as faint pale scratches, because the only thing distinguishing them was the extra
// light their own curvature caught. This matters more here than anywhere else in the rig, because
// skin is lit through mode 19, a per-channel wrap that deliberately softens the terminator. That
// wrap is right for skin and it is why a cheek reads as flesh — and it is also why a feature made
// of *form* alone disappears. The nose already projects a true 13 mm and under a flat key you
// cannot find it. So the dark shapes do the work here: a value break survives the wrap and a
// change of surface angle does not.
//
// **The nose is already a shape standing off the skull**, so even a corrected skull surface is the
// wrong thing to place a nostril against. `nsurf` is the surface of the nose figure.js actually
// drew — bridge, tip and both wings, whichever is furthest forward.
//
// **Faces vary.** `faceOf` in figure.js varies every *dimension*. What it cannot vary is which
// features a face **has**: a double lid or a single one, a fold at the inner corner, a high bridge
// or a low one. Those are switches rather than sizes, so they are drawn here from the same
// `faceSeed` — as stable as the rest of the person, and free to store.
//
// ---- what is not here, and why
//
// Nine draws at lod 0 for a plain face, and that is the whole budget: `.figcheck.js` puts the
// ceiling at 128 and the rig without this file is 119. Every one of the nine had to earn its place
// against the others, so a cupid's bow (two beads), a separate recess at each corner of the mouth,
// a cleft chin and a separate fold at the inner corner of the eye were all built, measured and cut
// again. The fold survives as a modifier — it narrows the crease and pushes it outward, which is
// what an epicanthic fold does to one — at no cost in draws. If the ceiling is ever argued up,
// those are the four to spend it on, in that order.
FigureFit['face'] = ctx => {
  // Nearest tier only. `lod0` is 2 to 4.5 metres depending on the quality preset — conversation
  // distance and no further — and past it a nostril is under a pixel and a lid crease is less than
  // one. The crowd is drawn at lod 2 and must not pay a single draw for any of this.
  if (ctx.lod !== 0) return;
  const { shape, R, M, tint, lk, F, pose, head, YOUTH, surf, SKINM } = ctx;

  // ---- who this face belongs to.
  //
  // One integer in, a stable stream out. The seed is folded with the channel index rather than
  // used raw, so seed 0 — the player, and anyone who never asked for a particular face — gets a
  // definite set of features rather than a degenerate one.
  const rnd = k => {
    let a = (Math.imul(lk.faceSeed | 0, 0x9E3779B1) + Math.imul(k + 1, 0x85EBCA77)) >>> 0;
    a ^= a >>> 15; a = Math.imul(a, 0x2C1B3C6D); a ^= a >>> 13;
    a = Math.imul(a, 0x297A2D39); a ^= a >>> 16;
    return (a >>> 0) / 4294967296;
  };
  // A double eyelid or a single one, and how much fold there is at the inner corner. Between them
  // these do more than anything else here to stop a street of people looking related, and neither
  // is a size, so no amount of varying `F` was ever going to produce them.
  const chinese = lk.faceProfile === 'chinese';
  const dbl = rnd(0) < (chinese ? 0.50 : 0.54);
  // Keep a wide natural range. The Chinese cast baseline raises the floor of the inner-corner
  // fold rather than forcing a single eye type across the whole street.
  const epi = chinese ? clamp(0.10 + rnd(1) * 1.08, 0.10, 1)
                      : clamp(rnd(1) * 1.5 - 0.24, 0, 1);
  // How far the dorsum stands off the bridge. A child's barely does, which is a good part of why a
  // child's face is a child's face.
  const bridge = (chinese ? 0.52 + rnd(2) * 0.73 : 0.60 + rnd(2) * 0.95)
               * (1 - 0.50 * YOUTH);
  const flare = (chinese ? 0.92 + rnd(3) * 0.38 : 0.86 + rnd(3) * 0.40)
              * (1 - 0.08 * YOUTH);                            // nostrils
  const age = lk.age || 0;

  // A beard is a shell standing about 5 mm off the skull, drawn before this file runs, and all
  // four kinds carry a moustache. Anything added underneath is added *inside* it: the first pass
  // put a jowl and an under-lip line straight through a full beard, which reads as patches shaved
  // into it. So the lower face is skipped by however much of it the beard covers — and skipping it
  // gives the draws back, which is why a bearded face costs less here rather than more.
  const bd = lk.beard;
  const upOK = !bd;                                  // upper lip — every beard has a moustache
  const lowOK = !bd || bd === 'moustache';           // lower lip and the line under it
  const jawOK = !bd || bd === 'moustache';           // jowls and marionette lines

  const EX = F.eyeX, EY = F.eyeY;
  const SKIN = lk.SKIN, SKIND = lk.SKIND;
  const MATTE = { gloss: 0 };
  // Two tones, because these are two different things: a crease is a loss of light in skin, and a
  // nostril is an opening. Even the opening stops well short of black. Partly because pure black
  // nostrils read as holes drilled in a mask, and partly for a reason that is not aesthetic at
  // all — the specular term is *added* rather than scaled by the albedo, so the darker a surface
  // is the more a highlight dominates it. At a fifth of the shadow tone these still take a faint
  // sheen at the rim, which is what a nostril does; much darker and each one had a white
  // bead sitting in the middle of it.
  const LINE = tint(SKIND, 0.46), HOLE = tint(SKIND, 0.34);

  // ================================================================ the surfaces
  //
  // ---- the head mesh, solved.
  //
  // `makeHead` builds its vertices as headSurface(cx, cy, cz) over the unit sphere, scaled by the
  // head's three dimensions. Going the other way — given a point (x, y) on the front of the face,
  // where is the surface — has no closed form, because the brow term moves y and the jaw taper
  // moves x. Three fixed-point steps from the ellipsoid's own answer bring it inside a tenth of a
  // millimetre, an order of magnitude finer than anything here needs. Copied from gl.js rather
  // than imported because it lives in a closure; if the head is ever reshaped this moves with it,
  // and `.figcheck.js` keeps its own copy honest against `surf` for exactly this reason.
  const HX = F.headW, HY = F.headH, HZ = F.headD;
  const HA = 0.44 * HX, HB = 0.50 * HY;
  const bump = (v, c, w) => { const t = (v - c) / w; return Math.exp(-t * t); };
  const hsurf = (x, y) => {
    let cx = x / HA, cy = (y + 0.004) / HB, pz = 0;
    for (let i = 0; i < 4; i++) {
      const rr = Math.hypot(cx, cy);
      if (rr > 0.995) { cx *= 0.995 / rr; cy *= 0.995 / rr; }
      const cz = Math.sqrt(Math.max(1e-4, 1 - cx * cx - cy * cy));
      const low = Math.max(0, -cy), l2 = low * low;
      const px = cx * 0.44 * (1 - 0.32 * l2);
      const py = cy * 0.50 + 0.012 * bump(cy, 0.62, 0.32) * cz;
      pz = cz * 0.455 * (1 - 0.12 * l2)
         + 0.055 * l2 * low * (1 - Math.abs(px) * 1.2)
         + 0.020 * bump(cy, 0.10, 0.13) * cz
         - 0.014 * bump(cy, 0.34, 0.12) * Math.max(0, Math.abs(cx) - 0.55)
         + 0.016 * bump(cy, -0.10, 0.14) * cz * Math.max(0, Math.abs(cx) - 0.30);
      if (i === 3) break;
      cx -= (px * HX - x) / HA;
      cy -= (py * HY - 0.004 - y) / HB;
    }
    return pz * HZ + F.headZ;
  };

  // ---- the nose, the lid and the lips figure.js drew, as surfaces.
  //
  // Rebuilt from the same `F` and the same `surf` those draws used, so they track a varied face
  // exactly. The literals — the bridge's 13 mm half-depth, the wings' 22 mm offset and their
  // 9/10/10 half-extents — are the ones figure.js writes inline rather than keeping in `F`.
  const brZ = surf(0, F.noseY) - F.noseIn, brA = F.noseW * 0.5, brB = F.noseH * 0.5, brD = 0.013;
  const tpZ = surf(0, F.tipY) - 0.002, tpA = F.tipW * 0.5, tpD = F.tipD * 0.5;
  const wgX = 0.022, wgY = F.tipY - 0.006, wgZ = surf(wgX, wgY) - 0.004;
  const cap = (k, z, d) => k > 0 ? z + d * Math.sqrt(k) : -9;
  const nsurf = (x, y) => Math.max(
    hsurf(x, y),
    cap(1 - (x / brA) ** 2 - ((y - F.noseY) / brB) ** 2, brZ, brD),
    cap(1 - (x / tpA) ** 2 - ((y - F.tipY) / tpA) ** 2, tpZ, tpD),
    cap(1 - ((Math.abs(x) - wgX) / 0.009) ** 2 - ((y - wgY) / 0.010) ** 2, wgZ, 0.010));

  const ez = surf(EX, EY);
  const blink = pose.blink || 0;
  const fall = (F.lidLift + F.lidH * 0.58) * blink;
  const lidY = EY + F.lidLift - fall, lidZ = ez - 0.003, lidB = (F.lidH + fall) * 0.5;
  const my = F.mouthY, mw = F.mouthW, mz = surf(0, my);
  const upZ = mz - 0.007, lloZ = mz - 0.011, lloY = my - 0.017, lloB = (F.lipH + 0.002) * 0.5;
  // The front of an ellipsoid figure.js drew, at a point inside its footprint.
  const face = (z, d, dx, ax, dy, ay) => {
    const k = 1 - (dx / ax) ** 2 - (dy / ay) ** 2;
    return z + (k > 0 ? d * Math.sqrt(k) : 0);
  };

  // ---- the two ways a line is laid on this face.
  //
  // `sliver` is a narrow ellipsoid sunk into whatever it lies on until only `out` of it is above
  // the surface, so what shows is a thin line that thins further and vanishes at both ends. `d`,
  // its half-depth, is what makes it follow a curved feature: matched to the curvature underneath,
  // the sliver keeps the same width the whole way along. Its visible width is 2·w·√(2·out/d), which
  // is worth knowing — at out = 1.5 mm on a 20 mm-deep, 6 mm-wide shape that is a 3 mm line, and
  // the whole operating range is one millimetre wide either side of that.
  const sliver = (x, y, w, h, d, base, out, col, mat = MATTE) =>
    shape('ball', head, x, y, base + out - d, w, h, d * 2, col, mat);
  // `along` is the same thing for a line that is not vertical, and it is a *ball* rather than a
  // capsule so that it still tapers out at both ends. Anchored at its own midpoint: the face is
  // convex, so a straight shape through two points on it dips below the surface in between, and
  // one through the middle rides above it at the ends — but a crease that fades at both ends is
  // what a crease looks like, and a crease with a bead on each end is not.
  //
  // Two rotations and no more: swing about z for the sideways lean, then pitch about x for the
  // fall. Applied in that order — rotZ innermost, so it happens first — they do not fight, and the
  // closed form is exact for every direction including the horizontal ones, where the obvious
  // atan2 chain degenerates.
  const along = (zf, x0, y0, x1, y1, w, d, lift, col, mesh = 'ball') => {
    let dx = x1 - x0, dy = y1 - y0, dz = zf(x1, y1) - zf(x0, y0);
    const L = Math.hypot(dx, dy, dz);
    if (!(L > 1e-6)) return;
    // Point it upward first. An ellipsoid has no near end and no far one, so the direction that
    // runs down the face and the one that runs up it are the same shape — but only one of them
    // leaves the pitch inside a quarter turn. Taken as it came, a line running downward pitched by
    // nearly a half turn, which rolled the shape's depth axis over to point *into* the head: the
    // groove beside the nose ended up 20 mm thick front to back and 6 mm deep, and vanished.
    if (dy < 0) { dx = -dx; dy = -dy; dz = -dz; }
    const rs = M.mul(M.rotX(Math.atan2(dz, dy)),
      M.mul(M.rotZ(-Math.asin(clamp(dx / L, -1, 1))), M.scale(w, L, d)));
    // How far the oriented shape actually reaches in +z, read off its own matrix rather than
    // assumed to be half its depth. Once a shape is tilted its length contributes to its reach as
    // well, and the difference runs to 3 mm — three times the whole operating range of a crease.
    R.draw(mesh, M.mul(head, M.mul(
      M.trans((x0 + x1) * 0.5, (y0 + y1) * 0.5,
              zf((x0 + x1) * 0.5, (y0 + y1) * 0.5) + lift
              - 0.5 * Math.hypot(rs[2], rs[6], rs[10])), rs)), col, MATTE);
  };

  // ================================================================ 鼻子 the nose
  //
  // The weakest thing on the face before this file existed: an outline on an egg. Not because it
  // was small — the tip projects a true 13 mm — but because it had no dorsum, no openings and no
  // edge where it meets the cheek, so under a flat key there was nothing on it anywhere for the
  // light to break against.

  // The dorsum: the narrow ridge of bone and cartilage down the middle of the bridge, and the
  // reason a nose has a lit side and a shaded side at all.
  //
  // One ellipsoid, not the three stacked balls this started as and not a capsule. A capsule is a
  // straight segment and the bridge is curved, so a ridge laid along it either sinks in the middle
  // or stands off both ends, measured at 3 to 5 mm either way. Sharing the bridge's own centre and
  // pinched narrow, it stands the same amount proud all the way down and tapers into the glabella
  // above and the tip below, which is what a nose does.
  //
  // Cleared against the whole length of the bridge rather than against its midpoint, because what
  // it has to clear is not the bridge. figure.js sinks the bridge 8 mm into the ellipsoid `surf`
  // describes, and the real head's frontal bulge stands 4 mm proud of that same ellipsoid — so
  // over the lower half of the bridge the *skull* is in front of the nose, and figure.js's bridge
  // is simply inside the face. Cleared by its centre alone, the ridge vanished from the eyeline
  // down and stood on the forehead above, which is a fair description of what a nose is not.
  {
    const dD = brD * 0.96, dB = F.noseH * 0.30, dY = F.noseY - F.noseH * 0.12;
    let cz = -9;
    for (let i = -3; i <= 3; i++) {
      const y = dY + i * dB * 0.30, t = 1 - ((y - dY) / dB) ** 2;
      if (t <= 0.02) continue;
      const need = Math.max(hsurf(0, y), cap(1 - ((y - F.noseY) / brB) ** 2, brZ, brD))
                 + 0.0030 * bridge;
      cz = Math.max(cz, need - dD * Math.sqrt(t));
    }
    shape('ball', head, 0, dY, cz, F.noseW * 0.50, dB * 2, dD * 2, SKIN, { gloss: 0.21, mode: 19 });
  }

  // The side of the nose, in one line per side: the nasofacial groove beside the bridge running on
  // into the crease around the wing, which is one continuous fold on a real face and was two
  // separate shapes here until the budget said otherwise. This is the value break the subsurface
  // wrap will not give — the dorsum provides the form, this provides the edge, and on a face lit
  // flat from the front neither was enough alone.
  //
  // Drawn against `nsurf` and not the skull: its lower half lies over the wing of the nostril,
  // which stands 5 mm proud of the cheek beside it.
  for (const s of [-1, 1])
    along(nsurf, s * (brA + 0.0060), F.noseY - 0.008, s * (wgX + 0.0092), F.tipY - 0.011,
      0.0062, 0.0200, 0.0019, LINE);

  // The nostrils.
  //
  // Placed by direction on the tip's own ellipsoid rather than in absolute millimetres, so they
  // stay on the nose whatever `faceOf` did to its width and depth: down, out, and forward by
  // whatever is left over. They keep a little forward projection on purpose — a nostril tucked
  // purely under the tip is invisible from anywhere but below, and this game's camera is at eye
  // height — so what carries them is tone rather than the opening being a real hole. Rotated so
  // the outer end lifts, which is the shape a nostril presents from the front. Matte, and that is
  // not a preference: the specular term is *added* rather than scaled by the albedo, so on a
  // surface this dark even the weak broad highlight of `gloss: 0.05` is the brightest thing in the
  // opening — each nostril came out as a dark ring with a white bead sitting in it.
  //
  // Sunk along the tip's outward normal and not straight back in z. Sunk in z, the middle of each
  // opening lay behind the tip and the tip's lit skin showed through it: two dark rings with
  // bright centres, which is a pair of piercings rather than a nose.
  const nu = 0.56, nv = -0.66, nw = Math.sqrt(Math.max(0.04, 1 - nu * nu - nv * nv));
  const nx = nu * tpA, ny = nv * tpA, nz = nw * tpD;
  const nl = Math.hypot(nx, ny, nz) || 1;
  const ux = nx / nl, uy = ny / nl, uz = nz / nl;
  const na = 0.0062 * flare, nb = 0.0030 * flare, nc = 0.0048 * flare;
  // Sunk by however much of itself lies along that normal, less the millimetre and a bit that is
  // meant to show. Sunk by a fixed distance instead, the opening was a millimetre deep on one face
  // and gone on the next — the nostril's reach along a diagonal is a function of all three of its
  // radii and of where `faceOf` happened to put the tip, and it moves by a factor of two across
  // the roster.
  const sink = Math.hypot(na * ux, nb * uy, nc * uz) - 0.0013;
  for (const s of [-1, 1])
    R.draw('ball', M.mul(head, M.mul(
      M.trans(s * (nx - ux * sink), F.tipY + ny - uy * sink, tpZ + nz - uz * sink),
      M.mul(M.rotZ(s * 0.34), M.scale(na * 2, nb * 2, nc * 2)))), HOLE, MATTE);

  // ================================================================ 眼睛 the eyes
  //
  // One draw per eye, and which one it is says more about a person than anything else in this
  // file. A double lid gets the crease; a single lid gets the fullness that sits where the crease
  // would have been — because a monolid is not a double lid with the line left off, it is a fuller
  // lid, and drawing nothing at all was the version that made half the cast look unfinished.
  for (const s of [-1, 1]) {
    if (dbl) {
      // Measured *down* from the lid rather than up from the eye. figure.js's upper lid reaches
      // from the pupil to above the eyebrow, so a crease placed a fraction of the way up from the
      // eye landed on the brow bone with the whole lid still below it. It sits on the lid, so it
      // follows the lid down through a blink instead of staying printed on the forehead.
      //
      // The fold at the inner corner is spent here rather than on a shape of its own: what an
      // epicanthic fold does to a crease is hide its inner end, so a strong one narrows the crease
      // and carries it outward, and a face with one reads differently for nothing.
      const cy = lidY - F.lidH * 0.34;
      sliver(s * (EX + F.eyeW * 0.13 * epi), cy, F.lidW * (0.86 - 0.30 * epi), 0.0052,
        F.eyeD * 0.5, face(lidZ, F.eyeD * 0.5, 0, 1, cy - lidY, lidB), 0.0016, LINE,
        { gloss: 0.04 });
    } else {
      // Skin over skin: all this does is round the surface where the crease would be. A strong
      // fold at the inner corner pulls the same mass inward and down over the caruncle.
      //
      // Held below the eyebrow line. On the widest lids in the roster it drifted a couple of
      // millimetres above it, which is both wrong — the fullness of a single lid is on the lid,
      // not on the brow bone — and enough to put it in front of `.figcheck.js`'s rule that
      // nothing at or above the brow may sit over the top of the eyeball.
      const fy = Math.min(lidY + F.lidH * (0.24 - 0.10 * epi), F.browY - 0.0025);
      shape('ball', head, s * (EX - F.eyeW * 0.10 * epi), fy,
        lidZ - 0.0040, F.lidW * (0.94 + 0.10 * epi), F.lidH * 0.82, F.eyeD * 0.92, SKIN, SKINM);
    }
  }

  // ================================================================ 嘴 the mouth
  //
  // Two flat lozenges with a line between them, before this. What they were missing is that a lip
  // is a volume with an edge, and two draws buy both edges: the vermilion border along the top,
  // which is a ridge and catches light, and the labiomental groove along the bottom, which is a
  // fold and does not.
  if (upOK) {
    // Cleared against the skull as well as against the lip, because the top edge of figure.js's
    // upper lip is *inside* the face: the lip's front falls to 2.7 mm behind the skull by the time
    // it reaches its own upper edge, which is most of why the mouth reads as a small flat lozenge
    // rather than as lips. So the border is what actually draws the top of the mouth.
    // Sat *on* the lip it read as nothing, because the only thing it had to contrast with there
    // was the lip. It goes a little above the lip's own top edge instead, so what it draws is the
    // boundary between lip and skin — and being an ellipsoid, its silhouette against the skin is a
    // shallow arc, which is a cupid's bow for free.
    const vy = my + F.lipH * 0.46;
    const vz = Math.max(face(upZ, 0.011, 0, mw * 0.5, vy - my, F.lipH * 0.5), hsurf(0, vy));
    shape('ball', head, 0, vy, vz + 0.0018 - 0.0090,
      mw * 0.98, 0.0092, 0.0180, tint(lk.LIP, 1.04), { gloss: 0.30 });
  }
  if (lowOK) {
    // Sunk into the lip rather than laid on the skull below it: the skull has already fallen 14 mm
    // back by the chin, so a line drawn down there is a line on something nobody can see.
    const gy = my - 0.0245;
    sliver(0, gy, mw * 0.64, 0.0058, 0.0080,
      face(lloZ, 0.0105, 0, (mw - 0.005) * 0.5, gy - lloY, lloB), 0.0024, LINE);
  }

  // ================================================================ 年纪 what age does
  //
  // figure.js has three creases and stops there. Three creases is a young face with lines drawn on
  // it; what actually reads as sixty is that the tissue has moved — the lid hoods over the outer
  // corner, the jaw loses its edge — and that the fan at the eye arrives long before either.
  //
  // All of it is off at age 0, so a cast where most people are not old costs exactly what it cost
  // before any of this existed.
  if (age > 0.22) {
    const A = smooth01(age);
    // Crow's feet. The earliest line on anybody's face and the one that reads from furthest away.
    const cx = EX + F.eyeW * 0.54, cy = EY + 0.001, len = 0.010 + 0.011 * A;
    for (const s of [-1, 1])
      along(hsurf, s * cx, cy, s * (cx + len * 0.93), cy + len * 0.37, 0.0042, 0.0130, 0.0016, LINE);
    // The hood: an upper lid that has lost its crease and come down over the outer third. The
    // single strongest thing separating a face of sixty from the same face at thirty, and it is a
    // mass rather than a line, which is why no number of creases was going to do it.
    if (age > 0.34) for (const s of [-1, 1])
      shape('ball', head, s * (EX + F.eyeW * 0.20), lidY + F.lidH * (0.40 - 0.32 * A),
        lidZ - 0.0038, F.lidW * 0.68, F.lidH * (0.54 + 0.34 * A), F.eyeD * 0.90, SKIN, SKINM);
    // The marionette line, from the corner of the mouth toward the jaw. It continues the
    // nasolabial fold figure.js already draws, which stops dead at the mouth.
    if (age > 0.38 && jawOK) for (const s of [-1, 1])
      along(hsurf, s * (mw * 0.5 + 0.003), my + F.smile - 0.007,
        s * (mw * 0.5 + 0.011), my - 0.028 - 0.008 * A, 0.0044, 0.0130, 0.0016, LINE);
    // And the jowl that line is the upper edge of: the pad of cheek come down over the jawline.
    // Skin over skin — its whole job is to break the straight taper from cheekbone to chin, and it
    // only works at all because the line above gives it a top.
    if (age > 0.50 && jawOK) for (const s of [-1, 1]) {
      const jx = F.jawW * 0.84, jy = F.jawY + 0.028;
      shape('ball', head, s * jx, jy, hsurf(jx, jy) + 0.0020 - 0.0105,
        0.0250, 0.0190 + 0.0090 * A, 0.0210, SKIN, SKINM);
    }
  }
};
