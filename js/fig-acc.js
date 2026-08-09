// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ---------------------------------------------------------------- 配件 what a person carries
//
// Clothes say what somebody owns; accessories say what they are doing. A woman in a plum cardigan
// is a woman in a plum cardigan, but put sleeve protectors on her forearms and an apron over the
// front of her and she is behind a stall, and you knew it before you read her name. That is the
// whole argument for this file: it is the cheapest legibility in the project, a couple of draws a
// head, and the cast had almost none of it.
//
// Everything here is opt-in and nothing here is automatic. A builder that decided by itself who
// wears a mask would be editing sixty-six people's characters from a file none of their authors
// read, so a person gets an accessory when their roster row asks for one and never otherwise.
//
// Two rules govern every shape below, and both were learnt the hard way elsewhere in the rig.
// The first is that depths are computed, not guessed: on the head against `surf()`, on the chest
// against the body mesh's own profile (see BODY_F) or against the garment being tied onto, never
// at a number that looked right once in one screenshot. The other is the draw budget: a plain
// figure is ~120 draws at lod 0 and ~50 at lod 2, and lod 2 is the tier a station concourse is
// drawn at, so a watch — invisible past about three metres and still a whole draw — is gated to
// lod 0, and only what changes a silhouette (a mask, a trolley, an umbrella up) survives to the
// crowd tier. Measured, per accessory, per tier: see the table at the foot of this file.
(() => {

// ---- how an accessory is asked for.
//
// `makeLook` builds the resolved look from a roster row and hands back a fixed set of fields; it
// does not know about anything here, so this file resolves its own. Each key below can be given
// as `true` for the default colour or as a hex of its own, `<key>Color` overrides the colour when
// the key itself is carrying a kind ('up', 'furled', 'belt'), and `acc: 'mask watch bangle'`
// names several at once for the common case of a roster row that just wants a few small things.
//
//   { top:'#9c4b45', apron:'#cfd3cc', sleeves:'#8494a4', acc:'thermos bangle' }
//
// The defaults are Beijing street colours rather than pure hues: surgical masks are white or the
// pale blue-green of the disposable ones, sleeve protectors are printed cotton or grey nylon, and
// jade is a grey-green stone and not a jewel.
const DEF = {
  mask:     '#e9edf1',   // 口罩
  sleeves:  '#cfd6dc',   // 袖套
  apron:    '#cfd3cc',   // 围裙 — also understood by makeLook, which resolves it to lk.apron
  thermos:  '#8f979e',   // 保温杯
  phone:    '#23262b',
  umbrella: '#3d5a70',   // 伞
  fan:      '#ddd2b6',   // 扇子
  trolley:  '#8d4038',   // 买菜小推车
  earbuds:  '#f1efe9',
  watch:    '#33363b',
  lanyard:  '#2b3542',   // and the 工牌 hanging off it
  bottle:   '#dbe6ea',
  kidpack:  '#d9743f',
  bangle:   '#7fae90',   // 玉镯
  wedding:  '#d8c079',
  earrings: '#d8c079',
};
const HEX = /^#[0-9a-fA-F]{6}$/;

function namesOf(o) {
  const named = {}, list = o.acc;
  if (typeof list === 'string') { for (const w of list.split(/[,\s]+/)) if (w) named[w] = true; }
  else if (list && typeof list === 'object') Object.assign(named, list);
  return named;
}

function accOf(o) {
  const A = {};
  const named = namesOf(o);
  for (const k in DEF) {
    const v = o[k] !== undefined ? o[k] : named[k];
    if (v === undefined || v === null || v === false || v === 'none') continue;
    const col = o[k + 'Color'];
    // A string that is not a colour is a kind: `umbrella:'furled'`, `thermos:'belt'`.
    if (typeof v === 'string' && !HEX.test(v)) A[k + 'Kind'] = v;
    A[k] = C(HEX.test(col || '') ? col
          : typeof v === 'string' && HEX.test(v) ? v : DEF[k]);
  }
  return A;
}

// `makeLook` is a global function declaration in figure.js, so it is a property of the global
// object and can be wrapped from here. This is the seam that lets this file own its own wardrobe
// fields without a second author editing the same forty lines of figure.js — the same reason
// FigureFit exists at all. It adds a field and changes nothing that was already resolved; if
// makeLook ever grows an `ACC` of its own this wrapper should simply be deleted.
(function () {
  if (typeof makeLook !== 'function' || makeLook.__acc) return;
  const base = makeLook;
  function withAcc(o) {
    let spec = o || {};
    try {
      // The apron is the one entry here whose garment is not drawn by this file: figure.js has
      // its own `apron:` and its own panel, and this file only adds the ties to it. So an apron
      // asked for through `acc:` is forwarded to makeLook rather than drawn twice.
      const named = namesOf(spec);
      if (!spec.apron && named.apron)
        spec = { ...spec, apron: HEX.test(named.apron) ? named.apron : DEF.apron };
    } catch (e) { spec = o || {}; }
    const lk = base(spec);
    try { lk.ACC = accOf(spec); } catch (e) { lk.ACC = {}; }
    return lk;
  }
  withAcc.__acc = 1;
  try { globalThis.makeLook = withAcc; } catch (e) { /* frozen global: the apron still works */ }
})();

// ---- materials. Built once: R.draw reads an options object per call and a fresh one per draw on
// a per-frame path is garbage for nothing.
const CLOTH  = { mode: 7, gloss: 0.05 };
const CLOTHD = { mode: 7, gloss: 0.05, round: 0.020 };
const KNIT   = { mode: 7, gloss: 0.03 };
const STEEL  = { gloss: 0.52 };
const PLAS   = { gloss: 0.36 };
const SHINY  = { gloss: 0.62 };
const STONE  = { gloss: 0.55 };
const FLAT   = { mode: 1, gloss: 0.18, round: 0.006 };
const SCREEN = { mode: 1, glow: 0.30 };
const P2 = Math.PI / 2;

// The body mesh's own front at the chest, as a fraction of its z scale: the s = 1 point of the
// deepest ring in makeBody's profile, `zc + rz * (1 + e)` at y = .175. Read off that table rather
// than guessed, because it has been retuned once already — the torso is an egg now and not an
// ellipse, half a centimetre deeper at the breastbone than it was — and a guessed depth would have
// gone stale with it, leaving every cord and strap in this file buried inside the shirt.
const BODY_F = { chest: 0.315 };

FigureFit['acc'] = ctx => {
  const { shape, R, M, C, tint, lk, F, pose, lod, trim, holder, surf,
          root, torso, head, W, T, BODY, HAND, HIP } = ctx;
  const A = lk.ACC || {};
  // figure.js owns the apron's panel and its neck strap; what is added here are its ties. Read off
  // `lk.apron` rather than off `A.apron`, because that is the one field that decides whether the
  // panel this ties onto was drawn at all.
  const apron = lk.apron;
  if (!A.mask && !A.sleeves && !apron && !A.thermos && !A.phone && !A.umbrella && !A.fan
      && !A.trolley && !A.earbuds && !A.watch && !A.lanyard && !A.bottle && !A.kidpack
      && !A.bangle && !A.wedding && !A.earrings) return;

  const near = lod === 0;
  const HX = F.headW, HY = F.headH, HZ = F.headD, HC = F.headZ;
  // Which layer is the outermost one on the chest, and therefore what anything worn over it has
  // to clear. The coat is the same body mesh a few millimetres bigger; the plain shirt is 0.48.
  const SZ = (lk.JACK ? 0.505 : lk.VEST ? 0.502 : 0.480) * W;
  const chestF = BODY_F.chest * SZ;

  // The arms, rebuilt. `drawFigure` computes a wrist frame per arm and hands it to `holder`, but
  // not to a FigureFit builder, so the two joints are recomputed here from the same pose channels
  // and the same constants. It has to be exactly the same arithmetic: a watch a centimetre off the
  // wrist is a watch floating beside the hand. Lazily, because most people are wearing none of
  // this and four matrix chains a head across a crowd is not free.
  //
  // `lv` is the levelled wrist — the arm's accumulated pitch undone — which is what game.js's
  // carrier does and the only way a bottle stays upright through a walk cycle. It does not undo
  // the shoulder's splay or the hand's twist, so anything that must be plumb (an umbrella, a
  // trolley) hangs off the torso instead, exactly as the shop basket does.
  let cached = null;
  const arms = () => {
    if (cached) return cached;
    const up = 0.31 * T, lo = 0.29 * T;
    const one = (x, sh, splay, elb, tw) => {
      const shoulder = M.mul(torso, M.mul(M.trans(x * W, 0.495 * BODY, 0),
        M.mul(M.rotZ(splay || 0), M.rotX(sh || 0))));
      const el = M.mul(shoulder, M.mul(M.trans(0, -up + 0.018, 0), M.rotX(elb || 0)));
      const wr = M.mul(el, M.mul(M.trans(0, -lo + 0.025, 0), M.rotY(tw || 0)));
      const lv = M.mul(wr, M.rotX(-((sh || 0) + (elb || 0) + (pose.torsoPitch || 0)
        + (pose.recline || 0))));
      return { el, wr, lv };
    };
    return (cached = {
      L: one(-0.225, pose.shL, pose.shLz, pose.elbL, pose.twL),
      R: one( 0.225, pose.shR, pose.shRz, pose.elbR, pose.twR),
      up, lo,
    });
  };
  // Whether the hands are already full. `holder` is the callback figure.js has just used to draw
  // whatever this person is carrying — a tray, a shop basket, a takeaway bag — so its presence is
  // the one honest test of whether there is a hand free for a phone or a flask. Two objects in one
  // fist is worse than no object at all.
  const handsFree = !holder;
  // Claimed before anything is drawn, so the big props win the hand rather than whichever one this
  // file happens to build first: nobody carries an umbrella and a flask in the same fist.
  let leftFull = !!A.trolley, rightFull = !!A.umbrella;

  // ---------------------------------------------------------------- 口罩 the face mask
  //
  // The most-worn object in the country and the hardest thing on this list to place, because the
  // face is convex and a nose sticks 13 mm out of it: any smooth cover wide enough to reach both
  // cheeks and deep enough to clear the nose stands four centimetres off the chin and reads as a
  // snout. So it is not one shape, it is the two the face is actually made of.
  //
  // The lower half is the beard shell. figure.js's beard is the skull's own surface, displaced
  // 26 thousandths outward where a beard grows and 38 inward where it does not, and its comment
  // warns that drawing it on a larger scale "puts a mask over the face". This is that mask. Eleven
  // millimetres of growth stands the grown part about a centimetre off the mouth and chin while
  // the tucked part is still ~3 mm under the skin, so the shell keeps its own edge along the jaw
  // instead of swallowing the head — and it fits every face in the roster for free, because it is
  // built from the same head the face is.
  if (A.mask) {
    const MK = A.mask, MKD = tint(MK, 0.84);
    shape('beard', head, 0, -0.004, HC, HX + 0.011, HY + 0.011, HZ + 0.011, MK, CLOTH);
    // And the bridge over the nose, which the beard line runs underneath. Sized from the nose it
    // has to cover: the front of the tip is `surf` at the tip's height plus half the tip's depth,
    // and the dome is pushed forward until it clears that by 4 mm at exactly that height. Its top
    // is 12 mm under the eye — where the dome crosses back inside the cheek, which is where the
    // mask's visible edge lands, about 9 mm clear of the lower lid — and its bottom runs well down
    // inside the shell, so the two overlap rather than meeting at a seam that opens on a turn.
    const tipF = surf(0, F.tipY) - 0.002 + F.tipD * 0.5;
    const yTop = F.eyeY - 0.012, yBot = F.tipY - 0.034;
    const yc = (yTop + yBot) * 0.5, hh = (yTop - yBot) * 0.5, c = 0.052;
    const dy = (F.tipY - yc) / hh;
    const z0 = tipF + 0.004 - c * Math.sqrt(Math.max(0.25, 1 - dy * dy));
    shape('ball', head, 0, yc, z0, 0.098, hh * 2, c * 2, MK, CLOTH);
    // The wire along the top edge, pinched over the nose. On the dome's own surface at the height
    // where the dome comes out of the cheek — half buried in the mask, so it reads as a fold in it
    // rather than as a rod lying across the face, which is what it was one centimetre higher.
    const wk = 0.55;
    if (trim)
      R.draw('capsule', M.mul(head, M.mul(
        M.trans(0, yc + hh * wk, z0 + c * Math.sqrt(1 - wk * wk)),
        M.mul(M.rotZ(P2), M.scale(0.008, 0.046, 0.008)))), MKD, CLOTH);
    // The ear loops. A loop actually follows the cheek round to the ear, which a straight capsule
    // cannot: drawn inside the skull's half width it is buried and only its two ends show, drawn
    // clear of it it floats a centimetre off the face. Laid along the silhouette instead — at the
    // widest the head is at that height — it grazes the cheek and reads as the line it is.
    if (near) for (const s of [-1, 1])
      R.draw('capsule', M.mul(head, M.mul(M.trans(s * (F.earX + 0.006), F.earY + 0.006, 0.016),
        M.mul(M.rotX(P2), M.scale(0.007, 0.064, 0.007)))), MKD, CLOTH);
  }

  // ---------------------------------------------------------------- 袖套 sleeve protectors
  //
  // The forearm a few millimetres bigger, in cotton, with an elastic at each end: what a market
  // trader, a cleaner and anybody sorting vegetables all day wears over their good sleeves. On the
  // elbow's frame and stopping at the elbow — figure.js puts the half-sleeve's hem on the upper
  // arm for the same reason, that a cuff carried across a joint swings off the arm the moment the
  // joint bends.
  if (A.sleeves) {
    const SL = A.sleeves, SLD = tint(SL, 0.76);
    const fore = lk.sleeve === 'long';
    const a = arms(), lo = 0.29 * T;
    const rw = (fore ? 0.080 : 0.072) * W, rd = (fore ? 0.088 : 0.078) * W;
    for (const s of [a.L, a.R]) {
      shape('limb', s.el, 0, -lo * 0.50, 0, rw + 0.014, lo + 0.052, rd + 0.014, SL, KNIT);
      if (trim)                                            // the elastic at the wrist
        shape('capsule', s.el, 0, -lo + 0.028, 0, rw * 0.66 + 0.026, 0.026,
          rd * 0.66 + 0.026, SLD, KNIT);
      if (near)                                            // and the one below the elbow
        shape('capsule', s.el, 0, -0.010, 0, rw + 0.024, 0.028, rd + 0.024, SLD, KNIT);
    }
  }

  // ---------------------------------------------------------------- 围裙 the apron's ties
  //
  // The apron itself is figure.js's: `apron:` on a roster row draws a panel down the front of the
  // torso and a strap over the neck, and drawing a second one here would be two aprons on one
  // person. What it has not got is the thing that makes an apron read as tied on rather than hung
  // on — so this adds the waist tie, the two ends of it coming round from the back, and the pocket
  // across the front. `acc: 'apron'` is forwarded to makeLook by the wrapper above, so either
  // spelling produces the same garment with the same ties on it.
  //
  // Every depth here comes off figure.js's own panel: it is centred 118 mm out and is 55 mm thick,
  // so its front face is at 145.5 mm and a tie has to be stepped out from *that*, not from the
  // chest 25 mm behind it. The panel is not scaled by `W`, so neither are these.
  if (apron) {
    const APD = tint(apron, 0.76);
    const AF = 0.1455;                                     // the front face of figure.js's panel
    if (trim)
      shape('softBox', torso, 0, 0.268 * BODY, AF - 0.006, 0.368 * W, 0.050 * BODY, 0.040,
        APD, CLOTHD);
    if (near) {
      // The two ends of the tie, coming round the waist from the knot at the back. Angled in as
      // they go, or they read as a pair of tabs stuck on the ribs.
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.138 * W, 0.268 * BODY, 0.010),
          M.mul(M.rotZ(s * 1.42), M.scale(0.022, 0.086, 0.020)))), APD, CLOTH);
      shape('softBox', torso, 0, 0.128 * BODY, AF - 0.002, 0.190 * W, 0.120 * BODY, 0.030,
        APD, CLOTHD);
    }
  }

  // ---------------------------------------------------------------- 工牌 lanyard and name badge
  //
  // A cord round the neck and a card on the end of it: the one thing every office, hospital and
  // exhibition hall in the city puts on a person. Distinct from `badge`, which figure.js pins to
  // the breast as an enamel plate — one is issued, the other is worn.
  if (A.lanyard && trim) {
    const LN = A.lanyard, CARD = C('#f0ece0');
    // The chest is an egg and the cord lies on it: at 60 mm off the centre line the surface is
    // still nine tenths of its deepest, and a cord set at the breastbone's own depth vanishes
    // inside the shirt. Every strap in this file is placed as a fraction of `chestF` for that
    // reason, and the fractions are the surface at that person's own width, not a guess.
    for (const s of [-1, 1])
      R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.055, 0.520 * BODY, chestF * 0.90),
        M.mul(M.rotZ(s * 0.34), M.scale(0.010, 0.270 * BODY, 0.009)))), LN, CLOTH);
    // Standing clear of whatever is under it — a card on a lanyard hangs, it is not stuck on —
    // and clear of the apron's panel, which is 145.5 mm out and a good deal further forward than
    // the chest, if this person is wearing one.
    const cz = Math.max(chestF, apron ? 0.1455 : 0) + 0.012;
    shape('softBox', torso, 0, 0.330 * BODY, cz, 0.072, 0.098, 0.010, CARD, FLAT);
    if (near) shape('softBox', torso, 0, 0.386 * BODY, cz, 0.026, 0.028, 0.012,
      tint(LN, 1.7), PLAS);
  }

  // ---------------------------------------------------------------- 保温杯 the thermos
  //
  // A steel flask with a screw lid, in the hand if there is one free and clipped at the hip if
  // there is not. Everybody over about forty carries one and half the people under it do.
  //
  // The lid and the grip band go behind `trim`: they are a three-centimetre step in a shade of the
  // same grey, which is a thing you can see across a room and not across a concourse.
  if (A.thermos) {
    const TH = A.thermos, THD = tint(TH, 0.74);
    const belt = A.thermosKind === 'belt' || !handsFree || rightFull;
    if (belt) {
      // On the waistband, at the back of the right hip where a bag strap is not.
      shape('cyl', root, 0.175 * W, HIP - 0.045, -0.075, 0.070, 0.185, 0.070, TH, STEEL);
      if (trim) {
        shape('cyl', root, 0.175 * W, HIP + 0.062, -0.075, 0.074, 0.036, 0.074, THD, PLAS);
        shape('capsule', root, 0.175 * W, HIP + 0.030, -0.075, 0.080, 0.020, 0.080, THD, PLAS);
      }
    } else {
      rightFull = true;
      const lv = arms().R.lv;
      shape('cyl', lv, 0, -0.030, 0.030, 0.072, 0.230, 0.072, TH, STEEL);
      if (trim) {
        shape('cyl', lv, 0, 0.104, 0.030, 0.076, 0.040, 0.076, THD, PLAS);
        shape('capsule', lv, 0, 0.070, 0.030, 0.082, 0.020, 0.082, THD, PLAS);
      }
    }
  }

  // ---------------------------------------------------------------- the phone
  //
  // Held up in the left hand and lit, because that is how it is carried down every pavement in
  // Beijing. Gated behind `trim`: seven centimetres of black glass is nothing at all at the far
  // LOD and still costs two draws on every person in a crowd.
  if (A.phone && trim && handsFree && !leftFull) {
    leftFull = true;
    const lv = arms().L.lv;
    shape('softBox', lv, 0, -0.028, 0.056, 0.076, 0.144, 0.012, A.phone, PLAS);
    shape('softBox', lv, 0, -0.028, 0.064, 0.064, 0.126, 0.004, C('#8fd9c4'), SCREEN);
  }

  // ---------------------------------------------------------------- 伞 the umbrella
  //
  // Up, it is the largest thing a person in this game carries and the one accessory that changes
  // the silhouette from across a street, so it survives to the crowd tier. Hung off the torso and
  // not off a wrist: `lv` undoes the arm's pitch but not the shoulder's splay or the hand's twist,
  // and a shaft that leans a different way every stride is worse than no umbrella. The shaft tilts
  // inward so the canopy ends up over the head rather than over the shoulder holding it.
  if (A.umbrella) {
    const UM = A.umbrella, UMD = tint(UM, 0.72);
    if (A.umbrellaKind === 'furled') {
      if (trim) {
        R.draw('capsule', M.mul(torso, M.mul(M.trans(0.235 * W, -0.140, 0.030),
          M.mul(M.rotZ(0.16), M.scale(0.052, 0.660, 0.052)))), UM, CLOTH);
        shape('capsule', torso, 0.198 * W, 0.170, 0.030, 0.028, 0.090, 0.028, UMD, PLAS);
      }
    } else {
      R.draw('capsule', M.mul(torso, M.mul(M.trans(0.170 * W, 0.545 * T, 0.060),
        M.mul(M.rotZ(0.115), M.scale(0.024, 1.190 * T, 0.024)))), UMD, PLAS);
      // The canopy: `taper` is wide at the bottom and narrow at the top, which is the shape of a
      // dome held up on ribs and needs no rotation. Set high enough to clear a sun hat's brim —
      // the head is at 0.800 T and its crown a further 0.115, so a canopy whose rim is at 1.02 T
      // is over the person rather than through them.
      shape('taper', torso, 0.105 * W, 1.135 * T, 0.060, 0.880, 0.230, 0.880, UM, CLOTH);
      if (trim) {
        shape('capsule', torso, 0.105 * W, 1.285 * T, 0.060, 0.020, 0.100, 0.020, UMD, PLAS);
        shape('capsule', torso, 0.196 * W, -0.038 * T, 0.060, 0.030, 0.110, 0.030, UMD, PLAS);
      }
    }
  }

  // ---------------------------------------------------------------- 扇子 the folding fan
  //
  // An older man's, held in the right hand in front of the chest. The blade is `taper` turned over
  // so the narrow end is the pivot, flattened to nothing in z — a fan is a sector of a circle and
  // has no thickness worth drawing.
  if (A.fan && trim && handsFree && !rightFull) {
    rightFull = true;
    const FA = A.fan;
    R.draw('taper', M.mul(arms().R.wr, M.mul(M.trans(0, -0.170, 0.030),
      M.mul(M.rotX(0.34), M.mul(M.rotZ(Math.PI), M.scale(0.260, 0.230, 0.014))))), FA, CLOTH);
    shape('capsule', arms().R.wr, 0, -0.070, 0.026, 0.024, 0.080, 0.018, tint(FA, 0.58), PLAS);
  }

  // ---------------------------------------------------------------- 买菜小推车 the trolley
  //
  // The two-wheeled shopping trolley every grandmother in the city takes to the market, pulled
  // along behind the left hip. On the root frame, because it stands on the floor: hung off the
  // torso it would lean over every time she did.
  //
  // At the crowd tier it is the bag and nothing else. Built whole it is seven draws — a seventh of
  // everything a person at fifteen metres is allowed — and at that range the frame is two pixels
  // of dark and the wheels are none. A coloured box at hip height beside somebody is the entire
  // read, and it costs one.
  if (A.trolley) {
    // Out to the side as much as behind. Tucked in directly astern it spends most of every frame
    // hidden by the legs, and a prop nobody can see is seven draws of nothing.
    const TR = A.trolley, TRD = tint(TR, 0.66), FRAME = C('#5b626b');
    const tx = -0.360, tz = -0.235;
    shape('softBox', root, tx, 0.355, tz, 0.300, 0.460, 0.230, TR, CLOTHD);
    if (trim) {
      shape('softBox', root, tx, 0.590, tz, 0.310, 0.062, 0.240, TRD, CLOTHD);
      for (const s of [-1, 1])
        shape('capsule', root, tx + s * 0.098, 0.590, tz - 0.070, 0.024, 0.540, 0.024,
          FRAME, PLAS);
      R.draw('capsule', M.mul(root, M.mul(M.trans(tx, 0.855, tz - 0.070),
        M.mul(M.rotZ(P2), M.scale(0.028, 0.220, 0.028)))), FRAME, PLAS);
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(root, M.mul(M.trans(tx + s * 0.132, 0.090, tz - 0.030),
          M.mul(M.rotZ(P2), M.scale(0.170, 0.042, 0.170)))), C('#26282c'), PLAS);
    }
  }

  // ---------------------------------------------------------------- the small backpack
  //
  // A child's, and only when there is no bag already: the daypack in figure.js is an adult's and
  // on a seven-year-old it reaches the backs of the knees. Skipped outright if the roster has
  // given this person any other bag, because two bags is a mistake and never a choice.
  if (A.kidpack && !lk.bag) {
    const PK = A.kidpack, PKD = tint(PK, 0.74);
    shape('softBox', torso, 0, 0.300 * BODY, -0.175 * W, 0.190, 0.240 * BODY, 0.130,
      PK, CLOTHD);
    if (trim) {
      shape('softBox', torso, 0, 0.395 * BODY, -0.180 * W, 0.160, 0.070, 0.120, PKD, CLOTHD);
      // Over the shoulder, on the daypack's own line: high enough up the trapezius that the front
      // half of the capsule comes out through the chest instead of running inside it.
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.104, 0.560 * BODY, 0.000),
          M.mul(M.rotX(P2), M.scale(0.030, 0.230, 0.022)))), PKD, CLOTH);
    }
  }

  // ---------------------------------------------------------------- the water bottle
  //
  // Slung across the body on a webbing strap: left hip to right shoulder, which is the satchel's
  // own diagonal in figure.js — and why this is suppressed under one, since two straps crossing the
  // same chest at the same angle is one strap with a seam in it.
  if (A.bottle && trim && lk.bag !== 'shoulder') {
    const BT = A.bottle, BTD = tint(BT, 0.62);
    R.draw('capsule', M.mul(torso, M.mul(M.trans(-0.055, 0.395 * BODY, chestF * 0.74),
      M.mul(M.rotZ(-0.72), M.scale(0.026, 0.560, 0.022)))), BTD, CLOTH);
    shape('cyl', torso, -0.215 * W, 0.090, 0.020, 0.076, 0.230, 0.076, BT, PLAS);
    shape('cyl', torso, -0.215 * W, 0.220, 0.020, 0.052, 0.040, 0.052, BTD, PLAS);
  }

  // ---------------------------------------------------------------- the small things
  //
  // Everything below is under three centimetres of object. None of it changes a silhouette and all
  // of it is a full draw, so it is lod 0 only — a wedding ring on the ninetieth person in a
  // concourse is ninety draws of nothing.
  if (near) {
    if (A.earbuds) for (const s of [-1, 1])
      shape('ball', head, s * (F.earX - 0.008), F.earY - 0.004, -0.002, 0.018, 0.020, 0.018,
        A.earbuds, PLAS);
    if (A.earrings) for (const s of [-1, 1])
      shape('ball', head, s * (F.earX + 0.002), F.earY - F.earH * 0.5 - 0.008, -0.012,
        0.014, 0.016, 0.014, A.earrings, SHINY);
    if (A.watch) {
      // On the left wrist, above the shirt cuff and not under it: figure.js lays a 96 mm cuff
      // across the wrist frame from -33 to +23 mm, and the first version of this sat a 64 mm band
      // at +16, which is a watch worn inside a sleeve. The face goes on -z, because the palm looks
      // along the wrist frame's +z and a watch is read off the back of the hand.
      const w = arms().L.wr;
      shape('cyl', w, 0, 0.046, 0, 0.072, 0.024, 0.068, A.watch, CLOTH);
      shape('ball', w, 0, 0.046, -0.034, 0.034, 0.032, 0.014, tint(A.watch, 2.6), SHINY);
    }
    if (A.bangle)
      // A ring and not a disc, so the wrist inside it is genuinely open — the same reason the
      // spectacle rims in figure.js are rings. Its axis is the mesh's +z, which rotX turns onto
      // the forearm.
      R.draw('ring', M.mul(arms().L.wr, M.mul(M.trans(0, 0.052, 0),
        M.mul(M.rotX(P2), M.scale(0.086, 0.086, 0.016)))), A.bangle, STONE);
    if (A.wedding) {
      // On the third finger of the left hand, on the same knuckle frame figure.js builds the
      // fingers from — grip and all, so it stays on the finger while the hand closes.
      const grip = pose.grip || 0;
      const fx = 0.5 * 0.019 * HAND;
      const kn = M.mul(arms().L.wr, M.mul(M.trans(fx, -0.092 * HAND, 0.004),
        M.rotX(-0.62 - grip * 0.85)));
      R.draw('ring', M.mul(kn, M.mul(M.trans(0, -0.021 * HAND, 0),
        M.mul(M.rotX(P2), M.scale(0.026 * HAND, 0.026 * HAND, 0.008 * HAND)))),
        A.wedding, SHINY);
    }
  }
};

// ---- what each of these costs, measured rather than estimated.
//
// Counted by running `drawFigure` with `R.draw` replaced by a tally, one accessory at a time, on a
// plain figure in the studio. The baseline that person costs is 119 / 84 / 51 draws at lod 0 / 1 / 2
// with every wardrobe file loaded; the numbers below are what each accessory adds on top.
//
//   mask        5 / 3 / 2      thermos     3 / 3 / 1      earbuds     2 / 0 / 0
//   sleeves     6 / 4 / 2      phone       2 / 2 / 0      watch       2 / 0 / 0
//   apron*      5 / 2 / 1      umbrella up 4 / 4 / 2      bangle      1 / 0 / 0
//   lanyard     4 / 3 / 0      · furled    2 / 2 / 0      wedding     1 / 0 / 0
//   bottle      3 / 3 / 0      fan         2 / 2 / 0      earrings    2 / 0 / 0
//   kidpack     4 / 4 / 1      trolley     7 / 7 / 1
//
// * the apron's own panel is figure.js's two draws; the ties added here are the rest of it, and
//   fig-tops.js drops a shirt detail when one is worn, which is why the total is not 2 + 4.
//
// Nobody wears all of them. A realistic worker — mask, sleeve protectors, apron, flask — is 19 / 12
// / 6, and at the crowd tier that six is a white face patch, two pale forearms and an apron, which
// is exactly the set of things still legible at fifteen metres.

})();
