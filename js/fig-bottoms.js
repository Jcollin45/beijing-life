// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ============================================================ 裤子 · 裙子 · 鞋 the bottom half
//
// What the rig had below the waist was one trouser and one shoe. The trouser is not really a
// garment at all — it is the leg limb drawn in `lk.PANTS`, so a pair of trousers has no hem, no
// break, no width and no length; and the shoe is a five-part oval sneaker that all sixty-six
// people wear, recoloured. Stand a crowd on a pavement and everybody's legs are the same legs.
// That is the most repetitive thing left in the cast, because legs are half a standing figure and
// the half nearest the camera when somebody walks past you.
//
// Everything here is *additive*: the leg limbs and the sneaker keep being drawn by figure.js and
// this file cannot stop them. So a garment here is either something that stands outside what is
// already there — a wide leg over a slim one, a boot shaft up a shin, a cuff bunched on a shoe —
// or, where a cut has to *remove* trouser, a sleeve of skin laid over the part of the leg the
// trouser no longer reaches. That second trick is what makes shorts and cropped trousers possible
// without touching js/figure.js, and it is honest geometry rather than a dodge: the leg limb has
// no cloth thickness of its own, so a bare shin drawn 4 mm outside it reads as a shin and not as
// a swelling. It is still the expensive way round, and the note at the foot of this file says
// what one line in `makeLook` would buy.
//
// ---------------------------------------------------------------- how somebody gets dressed
//
// `makeLook` returns a fixed set of keys and drops everything else, so there is no way today for
// a roster entry to say `trouser: 'wide'`. Rather than give one new silhouette to everybody, the
// cut is *derived* — the way figure.js already derives a rucksack colour, and for the same stated
// reason: a stable hash of what is already this person's, their face seed, the colour of their
// trousers and shoes, their height and their build. It costs no roster work, it is the same
// person after a reload, and it spreads across a crowd. `lk.trouser` and `lk.footwear` win over
// it outright if they are ever present, so the day figure.js passes those through, the roster is
// in charge and nothing in here has to change.

// A trouser is cloth and a shoe is not. FABRIC — mode 7 plus the woven photograph — is right for
// trousers, for a skirt and for a cloth shoe's upper; leather wants a tighter highlight and no
// weave, and a rubber sole wants neither. These are new surfaces rather than corrections to
// FABRIC, which is doing its job. `round` rides along with them because the vertex shader resolves
// a rounded box's corner radius in metres: 5.5 cm is right for a garment and turns a shoe into a
// bar of soap, so a shoe-sized radius belongs with the shoe-sized surface.
//
// The radii are near the shader's ceiling on purpose, and finding that out cost a pass. It clamps
// a corner radius to 0.34 of each axis, and anything well short of that leaves a flat plateau
// across the middle of every face: the first shoes out of this file were bricks, and they were
// bricks because 2.6 cm of rounding on a 17 cm box still leaves seventy per cent of the top dead
// flat. Near the ceiling a rounded box is a last instead — soft everywhere, and still wider than
// the ellipsoids it has to swallow, because it keeps its full half-extent at the middle of each
// face where an ellipsoid keeps its. Not *at* the ceiling, though: pushed the whole way, the box
// narrows so far at its own corners that the sneaker's toe cap comes back out through the front
// of it. These are the largest radii that still swallow it.
const BOOT_LEATHER = { gloss: 0.46, round: 0.048 };
const BOOT_RUBBER = { gloss: 0.11, round: 0.028 };
// Bare skin, where a sandal or a slipper leaves the foot showing. SKINM with a shoe-sized corner
// on it, copied from the real thing rather than restated, so it keeps mode 19's subsurface wrap:
// a bare heel lit like a painted block beside a face lit like skin is worse than no sandal.
const BOOT_SKIN = Object.assign({}, typeof SKINM === 'undefined' ? { gloss: 0.16, mode: 19 }
  : SKINM, { round: 0.052 });
// A cloth shoe. Not FABRIC, for the corner radius above and for one other reason: the fabric
// photograph tiles at 16 cm, so across a 25 cm shoe it repeats once and a half and contributes
// nothing you could see. What reads at that size is mode 7's own weave, which is all this asks
// for.
const BOOT_CLOTH = { gloss: 0.06, mode: 7, round: 0.056 };

// One person's cut, worked out once and remembered. A WeakMap and not a field on `lk`: the look
// object belongs to figure.js, more than one harness compares two of them key for key, and a
// cache written into one would make two identical people differ by which had been drawn already.
const CUT = new WeakMap();

// mulberry32 again — the same generator faces are built with, so a cut is as reproducible as a
// face. faceSeed is not enough on its own: game.js gives every neighbour one, but the studio's
// presets and anybody written by hand without one all share seed 0, and a crowd keyed on that is
// the very thing this file exists to fix. The colours and the build carry the rest.
function bottomRand(lk) {
  let a = (Math.imul((lk.faceSeed | 0) + 1, 2654435761) >>> 0) + 0x9e3779b9;
  const eat = v => {
    a = (a ^ (Math.round((v || 0) * 65535) >>> 0)) >>> 0;
    a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) >>> 0;
  };
  const P = lk.PANTS || [0, 0, 0], S = lk.SHOE || [0, 0, 0];
  eat(P[0]); eat(P[1]); eat(P[2]); eat(S[0]); eat(S[1]); eat(S[2]);
  eat(lk.tall); eat(lk.wide);
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick out of a table of [name, weight]. Weights rather than thresholds so the mix reads as what
// a street looks like: mostly long trousers, a good number of cropped ones, wide legs and shorts
// on fewer people, and every one of them a real sight rather than a costume.
function weighted(r, table) {
  let total = 0;
  for (let i = 0; i < table.length; i++) total += Math.max(0, table[i][1]);
  let x = r() * total;
  for (let i = 0; i < table.length; i++) {
    x -= Math.max(0, table[i][1]);
    if (x < 0) return table[i][0];
  }
  return table[table.length - 1][0];
}

function cutOf(lk) {
  let c = CUT.get(lk);
  if (c) return c;
  const r = bottomRand(lk);
  const youth = lk.youth || 0, age = lk.age || 0;

  // Length and width. A child is in shorts far more often than an adult, which is simply true of
  // a Beijing summer, and nobody is in shorts *and* a wide leg, because those are two answers to
  // the same question.
  const trouser = weighted(r, [
    ['long', 0.54 - youth * 0.30],
    ['crop', 0.19],
    ['wide', 0.12],
    ['short', 0.09 + youth * 0.42],
  ]);
  // Detail on top of the cut: a turn-up on anything with a hem to turn up, a pressed line on
  // anything long enough to hold one. Both are trim and neither survives to the crowd tier.
  const turnup = trouser !== 'short' && r() < 0.22;
  const pleat = (trouser === 'long' || trouser === 'wide') && r() < 0.22;

  // Footwear. The slipper is the interesting one: interiors here are slipper-wearing and the game
  // has a flat in it, but nothing in the context object says which side of a doorway this person
  // is standing on, so it cannot be chosen by where they are. Until it can it goes to the oldest
  // of the cast, who are the people you actually do see in them on a hutong pavement. Sandals go
  // the other way, to the young.
  const footwear = weighted(r, [
    ['sneaker', 0.34],
    ['leather', 0.22 - youth * 0.14],
    ['cloth', 0.15 + age * 0.10],
    ['boot', 0.10],
    ['sandal', 0.09 + youth * 0.06 - age * 0.05],
    ['slipper', age > 0.60 ? 0.10 : 0.01],
  ]);

  c = {
    trouser: lk.trouser || trouser,
    footwear: lk.footwear || footwear,
    turnup, pleat,
    // How far this person's trousers break over the shoe and how freely their skirt swings. Small
    // per-person constants, because no two people's cloth hangs the same way.
    breaks: 0.55 + r() * 0.75,
    sweep: 0.85 + r() * 0.35,
    // Derived colours, resolved once here rather than allocating three arrays per leg per frame.
    PANTSD: tint(lk.PANTS || [0, 0, 0], 0.84),
    SHOED: tint(lk.SHOE || [0, 0, 0], 0.84),
    // 千层底: the pale layered sole a 布鞋 is recognised by across a courtyard. Every other sole
    // here is the rubber the rig already derives from the shoe colour.
    PALE: mixc(lk.SOLE || [0, 0, 0], [0.88, 0.86, 0.79], 0.78),
  };
  CUT.set(lk, c);
  return c;
}

FigureFit['bottoms'] = C => {
  const { shape, R, M, lk, pose, lod, trim, root, W, T, HIP, FOOT, FABRIC, SKINM } = C;
  if (!lk || !lk.PANTS) return;
  const cut = cutOf(lk);
  const F = FOOT, PANTS = lk.PANTS, PANTSD = cut.PANTSD;
  // The three numbers figure.js builds a leg out of. Repeated here rather than guessed: a garment
  // placed against a leg has to be placed against *this* leg, and if these ever move, everything
  // in this file moves with them or hangs in the air.
  const THIGH = 0.415 * T, SHIN = 0.405 * T;

  // ---------------------------------------------------------------- 裙子 the skirt
  //
  // The panel figure.js draws is a soft box, and the two things it is not are deep enough to
  // survive a stride and alive. One shape fixes both: a fuller panel *outside* the existing one,
  // hung off a frame that lags the body.
  //
  // The stride arithmetic is the one written down in figure.js. At the hem a walking thigh has
  // carried its front face about 0.19 forward, against a panel 0.119 W deep, which is why a fast
  // walk shows a knee through the front and why skirts went to people who mostly stand. This
  // panel is 0.152 W deep. That does not close the gap — nothing short of a flare will, and a
  // flare needs a taper mesh gentler than the 0.36 one, see the note at the end — but it moves
  // the failure from a brisk walk to a full stride.
  //
  // The lag is what makes it cloth rather than a lampshade. A skirt is not welded to a pelvis: it
  // keeps the direction the body was going a moment ago. So it counter-rotates against the hip
  // yaw, rolls away from the weight shift, and kicks forward with whichever leg is swinging. All
  // three come out of the pose that is already there, so they cost nothing and can never disagree
  // with the walk.
  if (lk.SKIRT) {
    // Clamped, and the clamp is not taste. This panel is 3.2 cm outside the one it has to hide,
    // so 0.075 rad is exactly how far it can lean before the hem, 0.32 m down, has travelled that
    // 3.2 cm and the panel underneath comes out through the front of it. Without the clamp a
    // seated figure is the failure case rather than a walking one: both thighs are up at -1.4
    // together, they do not cancel the way a stride's do, and the skirt would swing fifty degrees.
    const kick = clamp(-(pose.thighL + pose.thighR) * 0.26 * cut.sweep, -0.050, 0.050);
    const roll = clamp(-(pose.sway || 0) * 1.35 * cut.sweep, -0.030, 0.030);
    const lag = clamp(-(pose.hipYaw || 0) * 0.45, -0.050, 0.050);
    const hang = M.mul(root, M.mul(M.trans(0, HIP, 0),
      M.mul(M.rotY(lag), M.mul(M.rotZ(roll), M.rotX(kick)))));
    shape('softBox', hang, 0, -0.148, 0, 0.366 * W, 0.352, 0.300 * W, lk.SKIRT,
      { mode: 7, round: 0.130 });
    // The hem, a shade darker and standing just proud, so the skirt ends on a line instead of on
    // a rounded edge that takes the key light like a bar of soap.
    if (trim)
      shape('capsule', hang, 0, -0.318, 0, 0.372 * W, 0.026, 0.306 * W, lk.SKIRTD, { mode: 7 });
    // Pleats: two down the front and one on each hip. Four and not eight — this is the cheapest
    // place on a figure to spend a draw badly, and a skirt reads as pleated from the front pair.
    if (lod === 0) {
      for (const s of [-1, 1]) {
        R.draw('capsule', M.mul(hang, M.mul(M.trans(s * 0.064 * W, -0.168, 0.148 * W),
          M.scale(0.020 * W, 0.300, 0.026 * W))), lk.SKIRTD, { mode: 7 });
        R.draw('capsule', M.mul(hang, M.mul(M.trans(s * 0.176 * W, -0.168, 0.026 * W),
          M.scale(0.026 * W, 0.300, 0.020 * W))), lk.SKIRTD, { mode: 7 });
      }
    }
  }

  // The seat of a pair of shorts. Drawn once rather than per leg, because two columns coming off
  // the hips leave a step where they meet the pelvis and this is the piece that covers it. Off at
  // the crowd tier, where the crotch of a pair of shorts is well under a pixel.
  const wearsTrousers = !lk.SKIRT;
  if (wearsTrousers && cut.trouser === 'short' && lod < 2)
    shape('ball', root, 0, HIP - 0.035, 0, 0.330 * W, 0.235, 0.222 * W, PANTS, FABRIC);

  // ---------------------------------------------------------------- one leg
  //
  // The frames, rebuilt exactly as `leg` builds them in figure.js — sign convention included,
  // which is the part that is not obvious and which the comment there is emphatic about: a
  // negative thigh swings forward, a negative knee bends, and the knee is applied negated. Get it
  // wrong and a turn-up sits on the wrong side of a knee, but only while walking.
  function oneLeg(x, thigh, knee0, ankle) {
    const knee = -knee0;
    const hip = M.mul(root, M.mul(M.trans(x * W, HIP, 0), M.rotX(thigh)));
    const kn = M.mul(hip, M.mul(M.trans(0, -THIGH + 0.018, 0), M.rotX(knee)));
    const foot = M.mul(kn, M.mul(M.trans(0, -SHIN + 0.025, 0), M.rotX(ankle - (thigh + knee))));

    // ------------------------------------------------------------ 裤 the trouser
    // `cloth` is whether there is still trouser over the knee, which decides whether this leg
    // gets a crease behind it.
    let cloth = wearsTrousers;
    if (wearsTrousers) {
      if (cut.trouser === 'crop') {
        // Cropped at the calf — the summer trouser half this city is in, and the cheapest of
        // these to draw, because only the bottom of the shin has to stop being trouser. The bare
        // ankle is one capsule 5 mm outside the limb, ending inside the shoe collar; what shows
        // between the hem and the shoe is narrower than the trouser above it, which is the whole
        // read of a crop.
        shape('capsule', kn, 0, -SHIN + 0.108, 0.002, 0.090 * W, 0.172, 0.098 * W,
          lk.SKIN, SKINM);
        if (trim)
          shape('capsule', kn, 0, -SHIN + 0.178, 0, 0.106 * W, 0.030, 0.114 * W,
            cut.turnup ? PANTSD : PANTS, FABRIC);
      } else if (cut.trouser === 'short') {
        // Shorts to the knee — 五分裤, and what every child in this game should have been in.
        // A straight column off the hip with a flat bottom face: the leg passes through that
        // face, and what is left of it around the leg *is* the hem. A hem for nothing.
        shape('cyl', hip, 0, -0.215, 0, 0.156 * W, 0.335, 0.162 * W, PANTS, FABRIC);
        // Knee and shin, bare. The shin sleeve is the shin limb's own shape 8% larger, so the
        // calf below a pair of shorts is a calf and not a length of pipe; the knee is the knee
        // ball the same way. The knee goes at the crowd tier, where it is a band three pixels
        // deep, and the shin stays, because a bare leg is a value the eye reads at any distance.
        if (lod < 2) shape('ball', kn, 0, 0.004, 0.008, 0.104 * W, 0.100, 0.110 * W,
          lk.SKIN, SKINM);
        shape('limb', kn, 0, -SHIN * 0.50, 0, 0.112 * W, SHIN + 0.045, 0.124 * W,
          lk.SKIN, SKINM);
        cloth = false;
      } else if (cut.trouser === 'wide') {
        // A wide leg is a column and not a taper — that is the whole difference, and it is why
        // these are a cylinder and a capsule rather than the `limb` mesh. The thigh is the capsule
        // so its top dome sinks into the seat instead of ending on a flat ring at the hip crease;
        // the shin is the cylinder so the hem ends on a line, which is what a wide trouser has and
        // a tapered one does not.
        // The shin is the half that says "wide", so it is the half the crowd tier keeps.
        if (lod < 2)
          shape('capsule', hip, 0, -0.175, 0, 0.164 * W, THIGH + 0.13, 0.172 * W, PANTS, FABRIC);
        shape('cyl', kn, 0, -SHIN * 0.5 + 0.020, 0, 0.150 * W, SHIN + 0.020, 0.158 * W,
          PANTS, FABRIC);
        if (lod === 0 && cut.turnup)
          shape('capsule', kn, 0, -SHIN + 0.044, 0, 0.174 * W, 0.038, 0.182 * W, PANTSD, FABRIC);
      } else if (trim) {
        // ---- the break.
        //
        // A trouser does not stop in mid-air above a shoe: it lands on it, and the cloth stacks up
        // where it lands. How far it stacks is not a constant — the hem rides up the shin as the
        // foot comes up at heel strike and drops onto the laces at toe-off — so it is read off the
        // ankle joint, which is the only thing in the pose that knows.
        const roll = Math.max(-1, Math.min(1, ankle * 4.5));
        const drop = (0.008 + 0.011 * roll) * cut.breaks;
        const fold = 0.062 + 0.028 * Math.max(0, roll) * cut.breaks;
        shape('softBox', kn, 0, -SHIN + 0.096 - drop, 0.006,
          0.100 * W, fold, 0.112 * W, PANTS, { mode: 7, round: 0.026 });
        if (cut.turnup)
          shape('capsule', kn, 0, -SHIN + 0.132, 0.002, 0.104 * W, 0.032, 0.116 * W,
            PANTSD, FABRIC);
      }

      // ---- a pressed line, and a crease behind the knee.
      //
      // The two things cloth does that this rig has never done. The pressed line runs the length
      // of the thigh and is tipped to follow its taper, so it lies almost flush at the hip and
      // stands about 3 mm proud toward the knee: half-buried in a darker tone it reads as a
      // crease rather than as a cord laid on the leg. The other one is the opposite — it exists
      // only while the joint is closed, it is *behind* the knee where trouser cloth is pushed into
      // a roll, and it grows with the bend. Which is why a seated figure has one and a standing
      // figure does not, and why sitting down finally does something to what a person is wearing.
      if (lod === 0 && cut.pleat)
        R.draw('capsule', M.mul(hip, M.mul(M.trans(0, -THIGH * 0.45, 0.056 * W),
          M.mul(M.rotX(0.075), M.scale(0.018 * W, THIGH * 0.72, 0.016 * W)))), PANTSD, FABRIC);
      if (lod === 0 && cloth) {
        const bend = Math.abs(knee) - 0.24;
        if (bend > 0.03) {
          const g = Math.min(0.034, 0.010 + bend * 0.026);
          const back = cut.trouser === 'wide' ? 0.088 * W : 0.058 * W;
          R.draw('capsule', M.mul(kn, M.mul(M.trans(0, 0.014, -back),
            M.mul(M.rotZ(Math.PI / 2), M.scale(g, 0.150 * W, g)))), PANTSD, FABRIC);
        }
      }
    }

    // ------------------------------------------------------------ 鞋 the footwear
    //
    // The sneaker underneath is five ellipsoids and cannot be removed, so a shoe of another kind
    // is a shell that swallows it. Rounded *boxes*, not more ellipsoids: covering an ellipsoid
    // with an ellipsoid of similar proportions needs so much margin that the result is a clown
    // shoe, whereas a rounded box holds its width along its whole length and clears the sneaker
    // with 8 mm to spare. A shoe is a box with the corners taken off in any case — that is what a
    // last is — and because `round` is resolved in metres in the vertex shader, the same three
    // shapes give a hard-edged brogue and a soft cloth slipper.
    //
    // Everything below y = -0.052 in the foot frame is the sneaker's own sole ellipsoid, which is
    // a sole in any style, so the shell only has to cover what is above that line.
    const kind = cut.footwear;
    if (kind !== 'sneaker') {
      // At the crowd tier none of this is visible: a brogue and a trainer are the same forty
      // pixels. Only the boot survives, because a shaft up a shin is a silhouette.
      const near = lod < 2;
      const sandal = kind === 'sandal', slipper = kind === 'slipper';
      const soft = kind === 'cloth' || slipper ? BOOT_CLOTH : BOOT_LEATHER;

      if (near) {
        // The quarter and heel. Skin for a sandal or a slipper, because the back of the foot is
        // bare in both and the sneaker's heel counter has to stop being a heel counter.
        shape('softBox', foot, 0, -0.019, 0.014 * F, 0.178 * F, 0.132, 0.200 * F,
          sandal || slipper ? lk.SKIN : lk.SHOE, sandal || slipper ? BOOT_SKIN : soft);
        // The vamp and toe. A slipper's is the entire shoe: a mule is a vamp and nothing else.
        shape('softBox', foot, 0, -0.027, 0.160 * F, 0.166 * F, 0.116, 0.215 * F,
          sandal ? lk.SKIN : lk.SHOE, sandal ? BOOT_SKIN : soft);
        // The sole. Two millimetres wider than the upper and no more, and the upper is carried
        // 2 cm further down than it needs to be so that only about 15 mm of this shows: the first
        // pass left 4 cm of it standing out and every shoe in the cast was up on a plinth.
        shape('softBox', foot, 0, -0.078, 0.093 * F, 0.180 * F, 0.044, 0.320 * F,
          kind === 'cloth' ? cut.PALE : lk.SOLE, BOOT_RUBBER);
      }

      if (kind === 'boot') {
        // The shaft, on the shin and not on the foot, so the ankle flexes inside it the way an
        // ankle flexes inside a boot. The one piece of footwear here the crowd tier keeps.
        shape('cyl', kn, 0, -SHIN + 0.160, 0, 0.126 * W, 0.220, 0.134 * W, lk.SHOE, BOOT_LEATHER);
        if (lod === 0)
          shape('capsule', kn, 0, -SHIN + 0.266, 0, 0.138 * W, 0.036, 0.146 * W,
            cut.SHOED, BOOT_LEATHER);
      }
      // The instep strap is the one thing here that is not trim: without it a sandal is a person
      // standing barefoot on a sole, which is a worse mistake at any distance than a missing seam.
      if (trim && sandal)
        R.draw('capsule', M.mul(foot, M.mul(M.trans(0, 0.052, 0.055 * F),
          M.mul(M.rotZ(Math.PI / 2), M.scale(0.026, 0.176 * F, 0.024)))),
          lk.SHOE, BOOT_LEATHER);
      if (lod === 0) {
        if (sandal) {
          // And one over the toes. Drawn along its own Y and laid across the foot by the model
          // matrix, as the satchel strap in figure.js is.
          R.draw('capsule', M.mul(foot, M.mul(M.trans(0, 0.036, 0.150 * F),
            M.mul(M.rotZ(Math.PI / 2), M.scale(0.024, 0.166 * F, 0.022)))),
            lk.SHOE, BOOT_LEATHER);
        } else if (kind === 'leather') {
          // The toe seam, where the vamp is stitched to the cap. Half-buried in the upper, so it
          // is a line rather than a welt — and it is the line that says leather rather than
          // moulded.
          R.draw('capsule', M.mul(foot, M.mul(M.trans(0, 0.026, 0.180 * F),
            M.mul(M.rotZ(Math.PI / 2), M.scale(0.010, 0.150 * F, 0.010)))),
            cut.SHOED, BOOT_LEATHER);
        } else {
          // The binding round the opening. A cloth shoe and a slipper are both a soft upper with
          // a bound edge, and without it the mouth of the shoe reads as a cut.
          R.draw('capsule', M.mul(foot, M.mul(M.trans(0, 0.048, 0.112 * F),
            M.mul(M.rotZ(Math.PI / 2), M.scale(0.022, 0.150 * F, 0.020)))),
            cut.SHOED, BOOT_CLOTH);
        }
      }
    }
  }

  oneLeg(-0.098, pose.thighL, pose.kneeL, pose.ankleL);
  oneLeg(0.098, pose.thighR, pose.kneeR, pose.ankleR);
};

// ---------------------------------------------------------------- what this file still needs
//
// 1. Two keys through `makeLook`, which is the whole ask:
//        trouser: o.trouser || null,     // 'long' | 'crop' | 'wide' | 'short'
//        footwear: o.footwear || null,   // 'sneaker' | 'leather' | 'cloth' | 'sandal'
//                                        // | 'boot' | 'slipper'
//    Everything above already reads them and prefers them to the hash, so this is additive and
//    changes nothing for a roster entry that does not use them. It matters most for the slipper:
//    interiors in this country are slipper-wearing and there is a flat in this game, but nothing
//    in the context object says which side of a doorway somebody is on, so today a slipper can
//    only be given to the oldest of the cast and hoped for.
//
// 2. A taper mesh with a gentler ratio, or `round` honoured on `taper`. A long A-line skirt is
//    the one garment here that could not be built: the top of the panel has to match the width of
//    the panel above it exactly or there is a hard ring at mid-thigh — the failure already
//    documented in figure.js — and the only mesh that grows downward goes 0.36 to 0.5 over its
//    length, which from hip width is a traffic cone. A `taper` taking its top ratio as an option,
//    the way `softBox` takes `round`, would give this file a flared skirt that survives a stride,
//    and would give the scene files a lampshade that is not always the same lampshade.
//
// 3. `studio.html` loads three scripts — math, gl, figure — and none of the seven fig-*.js files.
//    So the one page in this project built for judging a figure cannot see any garment any of us
//    writes, and neither can `.figsheet.js`, which drives it. Everything above was checked by
//    fetching this file over XHR and eval-ing it into the page from a `.shot.js` snippet, which
//    is not a thing the next person should have to work out. One line each beside the others:
//        <script src="js/fig-face.js"></script>   ... and the other six.
//
// 4. Nothing is wrong with FABRIC.
