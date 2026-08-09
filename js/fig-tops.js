// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ------------------------------------------------------------------ 上衣 tops, collars, sleeves
//
// This file is the cloth.
//
// figure.js has the *vocabulary* right — six collars, four sleeve lengths, a coat, a gilet, an
// apron, a yoke — and every one of them still comes out as smooth plastic, because a garment there
// is the body mesh in a different colour. Nothing hangs, nothing gathers, nothing has an edge. That
// is a large part of why the figures read as moulded rather than dressed, and none of it is fixed
// by adding a seventh collar: it is fixed by the half-dozen things that say "cloth" before you have
// read anything else. An edge that hangs below the waist and breaks over the trousers. A placket
// with buttons down it. A sleeve rolled back on itself. A fold where the fabric is bigger than the
// person inside it. A patch pocket. A rib set into the neck of a knitted shirt.
//
// Three rules run through all of it.
//
//   * **Additive.** The body, the six collars and the four sleeves belong to figure.js. Nothing
//     here redraws them; every piece is a new shape placed against what is already there. Where a
//     detail wants to be *proud* of an existing one — the roll of a turned-back sleeve around the
//     hem capsule figure.js already draws at the cut — it is drawn a few millimetres larger and
//     concentric with it, which is what a rolled sleeve is.
//
//   * **Nothing coplanar.** Every surface is one-sided and the depth buffer has no answer for two
//     faces in the same plane: a placket laid flat on the chest at the chest's own depth is not a
//     placket, it is a column of flickering stripes. So the front of the body is *measured* — at
//     the height and at the sideways offset the panel actually sits at, because the chest is an
//     ellipse in plan and eight centimetres off the centre line it has already fallen a centimetre
//     back — the panel's front face is put a clear centimetre in front of that, and the panel is
//     made thick enough that its *back* face is buried well inside the body. `facePanel` is the one
//     place that arithmetic lives, and every flat piece in this file goes through it. Round pieces
//     (hems, rolls, ribs) are concentric tubes around what they sit on and cannot be coplanar with
//     anything.
//
//   * **The draw budget.** lod 2 is the tier a crowd is drawn at. Exactly one thing here survives
//     to it — the hem, one capsule, and the only addition that changes the silhouette rather than
//     the surface. Plackets, pockets, cuffs, folds and the kangaroo pouch are behind `trim`
//     (lod < 2); buttons, stitch lines, pocket flaps and the collar's ribbing are lod 0 only.
//
// Wrapped in an IIFE so that loading this file twice — which is one stray script tag away, given
// that studio.html and index.html keep their own lists — re-registers the builder instead of
// throwing a redeclaration error and taking the page down with it.
(() => {

// ---- where the body actually is.
//
// A mirror of the `body` mesh's profile in js/gl.js (`makeBody`): height, half-width, half-depth
// and the section's fore-aft bias, in the mesh's own units, before the scale drawFigure applies to
// it. A ring is `x = rx·cos a`, `z = rz·(sin a + e·sin²a)` — so `e` is what gives the trunk a
// fuller seat behind and a flatter chest in front, and the front of the body at that height is
// `rz·(1 + e)` and the back `−rz·(1 − e)`.
//
// It is copied rather than derived because the mesh is triangles by the time anybody outside
// gl.js can see it, and every garment in this file has to know where the surface is to within a
// millimetre or it is either buried in the body or floating off it. If that profile is ever
// reshaped this table has to move with it — see the note at the bottom of this file about what
// would be better handed over instead. Last checked against gl.js: the fourteen-ring table with
// a real waist at -.060 and the .126 neck opening.
const BODYP = [
  [-.500, .300, .212, -.019], [-.452, .338, .250, -.048], [-.380, .352, .270, -.067],
  [-.290, .354, .268, -.060], [-.180, .344, .258, -.031], [-.060, .332, .246,  .016],
  [ .060, .352, .255,  .012], [ .175, .384, .267, -.019], [ .275, .399, .265, -.042],
  [ .350, .404, .255, -.043], [ .412, .384, .234, -.035], [ .458, .330, .196, -.020],
  [ .484, .238, .150,  .010], [ .500, .126, .086,  .030],
];

// Cloth, exactly as figure.js defines it — `gloss`, `mode` and the weave's `matScale` / `matAmt`
// are FABRIC's own numbers and are not second-guessed here — plus the one thing a flat panel needs
// that a capsule does not: a corner radius, so a placket or a pocket has a rolled edge rather than
// a milled one. The texture is reached through a getter for the same reason FABRIC does it: this
// object is built while the file loads, which is long before there is a GL context to make a
// texture in.
const clothPanel = round => ({
  gloss: 0.04, mode: 7, round, matScale: 0.16, matAmt: 0.26,
  get mat() { return FABRIC.mat; },
});
const PANELM = clothPanel(0.010);     // plackets, zips, the kangaroo pouch, an open shirt front
const PATCHM = clothPanel(0.016);     // a patch pocket, whose corners are visibly rounded
// A button is not cloth. Shell or plastic, small, and the one thing on a shirt allowed a highlight.
const BUTTONM = { gloss: 0.34 };
const SHELL = [0.93, 0.91, 0.86];
const lum = c => c[0] * 0.30 + c[1] * 0.59 + c[2] * 0.11;

FigureFit['tops'] = C => {
  const { shape, R, M, tint, mixc, lk, F, pose, lod, trim,
          torso, W, T, BODY, YOUTH, FABRIC } = C;

  // ---- which garment is the outer one, and what shape it is.
  //
  // figure.js draws the coat and the gilet as the same `body` mesh a few millimetres larger, over
  // the shirt. So the surface every panel here is placed against is that layer's, not the shirt's,
  // and these are the scales it is drawn at. `oy`/`oz` are where its centre sits in the torso frame.
  const LAY = lk.JACK
    ? { col: lk.JACK, dk: lk.JACKD, lt: lk.JACKL, sx: .462, sz: .505, sy: .634, oy: .312, oz: -.002 }
    : lk.VEST
    ? { col: lk.VEST, dk: lk.VESTD, lt: lk.VEST,  sx: .458, sz: .502, sy: .630, oy: .312, oz: -.002 }
    : { col: lk.TOP,  dk: lk.TOPD,  lt: lk.TOPL,  sx: .440, sz: .480, sy: .620, oy: .310, oz: 0 };

  // The profile ring at a torso-frame height: [half-width, half-depth, bias] in metres, where the
  // section's own centre sits at `halfZ * bias` in front of the torso's.
  const ring = y => {
    const py = (y - LAY.oy * BODY) / (LAY.sy * BODY);
    let a = BODYP[0], b = BODYP[0], t = 0;
    if (py >= 0.5) { a = b = BODYP[BODYP.length - 1]; }
    else if (py > -0.5) {
      let i = 1;
      while (i < BODYP.length - 1 && BODYP[i][0] < py) i++;
      a = BODYP[i - 1]; b = BODYP[i];
      t = (py - a[0]) / (b[0] - a[0]);
    }
    return [(a[1] + (b[1] - a[1]) * t) * LAY.sx * W,
            (a[2] + (b[2] - a[2]) * t) * LAY.sz * W,
             a[3] + (b[3] - a[3]) * t];
  };
  // How far forward the front of the body is at a height and a distance off the centre line. The
  // chest is an ellipse in plan, not a slab: this is the single number that decides whether a
  // pocket sits on a man or hovers beside him.
  const frontZ = (y, x = 0) => {
    const r = ring(y);
    const t = Math.min(1, Math.abs(x) / Math.max(1e-4, r[0]));
    const s = Math.sqrt(1 - t * t);
    return r[1] * (s + r[2] * s * s) + LAY.oz;
  };
  // And which way that section faces there, so a panel off the centre line turns with the ribs
  // instead of lifting its outer edge off them. Outward normal of the ring above, as an angle from
  // straight ahead: (rz·cos a·(1 + 2e·sin a), rx·sin a).
  const faceYaw = (y, x) => {
    const r = ring(y);
    const c = Math.max(-0.94, Math.min(0.94, x / Math.max(1e-4, r[0])));
    const s = Math.sqrt(1 - c * c);
    return Math.atan2(r[1] * c * (1 + 2 * r[2] * s), r[0] * s);
  };

  // ---- a flat panel laid down the front of the torso, between two heights.
  //
  // `out` is how far its front face stands in front of the body's own — a centimetre, which is the
  // step below which near-coplanar faces start to flicker. `halfD` is thick enough that the back
  // face lands well *inside* the body, so the panel is a ridge in the cloth rather than a board
  // hung in front of it. The panel also leans back with the chest and turns with it.
  const facePanel = (y0, y1, x, halfW, halfD, out, colour, mat) => {
    // The part of the panel nearest the centre line is the part that has to clear the body.
    const xn = Math.max(0, Math.abs(x) - halfW) * (x < 0 ? -1 : 1);
    const z0 = frontZ(y0, xn), z1 = frontZ(y1, xn), cy = (y0 + y1) / 2;
    const lean = Math.atan2(z0 - z1, Math.max(1e-4, y1 - y0));
    R.draw('softBox', M.mul(torso,
      M.mul(M.trans(x, cy, (z0 + z1) / 2 + out - halfD),
        M.mul(M.mul(M.rotY(faceYaw(cy, x)), M.rotX(-lean)),
              M.scale(2 * halfW, y1 - y0, 2 * halfD)))), colour, mat);
  };

  // ---- what this person is actually wearing.
  const col = lk.collar;
  const KNIT = col === 'turtle' || col === 'hood';       // a jumper: knitted body, ribbed edges
  const TEE = col === 'crew' || col === 'vneck';         // a t-shirt: no opening at all
  const SHIRTY = col === 'shirt' || col === 'polo';      // buttons down the front
  // 北京, a warm afternoon: a shirt worn open over the vest underneath, which is what the gilet
  // layer can be made to mean without a new roster key. Only a *shirt* collar does this — the work
  // tabards and hi-vis in the roster are crew-necked, and they go on reading as tabards.
  const overshirt = SHIRTY && !!lk.VEST && !lk.JACK;
  // A school tracksuit top: a zip and a stripe down each sleeve. Nobody in this city much over
  // sixteen wears one, so it keys off the same `youth` that shapes the skull.
  const TRACK = !!lk.JACK && YOUTH > 0.40;
  // The chest is spoken for if there is an apron or a scarf hanging down it; anything drawn there
  // would be behind them, which is draws spent on nothing.
  const chestFree = !lk.apron && !lk.SCARF;

  // Tucked in, or hanging out. An apron is worn over a tucked shirt; a name badge means a job and
  // a job means tucked; past middle age a man tucks his shirt into trousers worn at the navel,
  // which is half of what makes the older half of a cast read as older. Everyone else is a coin
  // toss off the face seed, so a given neighbour is always the same way round. A t-shirt is never
  // tucked, a jumper never is, and a shirt worn open over a vest cannot be.
  const seed = lk.faceSeed || 0;
  const tucked = !lk.JACK && !KNIT && !overshirt
    && (!!lk.apron || (SHIRTY && (lk.age > 0.42 || !!lk.BADGE || (seed * 7 + 3) % 5 < 3)));

  // The colour of the shirt itself, which is not the outer layer's when the shirt *is* the outer
  // layer, worn open over a gilet.
  const shirtC = overshirt ? lk.TOP : LAY.col;
  const shirtD = overshirt ? lk.TOPD : LAY.dk;
  // Buttons have to read against the shirt or they are not there: dark horn on a pale shirt,
  // shell on a dark one.
  const btn = lum(shirtC) > 0.45 ? tint(shirtC, 0.70) : mixc(shirtC, SHELL, 0.62);

  // ---------------------------------------------------------------- the hem
  //
  // The one addition that survives to lod 2, and the one worth it. Until now a top simply stopped
  // at the waistband: the `body` mesh ends level with the hip, the hem capsule figure.js draws at
  // 0.055 above it is narrower than the body is at that height and sits inside it, and the result
  // is a torso running into a pair of trousers with no edge between them — which is exactly the
  // join a moulded toy has and a dressed person does not.
  //
  // So: a band that hangs *below* the body, breaking over the waistband. Its girth is measured at
  // the hip crest — the fullest ring of the lower trunk, not the bottom one, because the trunk
  // necks in again below that and a hem cut to the bottom ring would end up narrower than the hips
  // it has to hang over and vanish inside the pelvis. A shirt does not neck in there either: it
  // hangs from the widest thing it touches, which is exactly this ring.
  //
  // It rides in the torso frame because that is what it is attached to, and it sits close enough
  // under the hip that a stoop or a bank swings it the few millimetres a real one would swing.
  const hem = lk.JACK ? { c: lk.JACK, d: lk.JACKD, drop: 0.112, out: 0.013 }
            : (lk.VEST && !overshirt) ? { c: lk.VEST, d: lk.VESTD, drop: 0.072, out: 0.012 }
            : tucked ? null
            // A knitted hem is a band that grips: shorter, and only just proud of the body.
            : KNIT ? { c: lk.TOP, d: lk.TOPD, drop: 0.064, out: 0.010 }
            : { c: shirtC, d: shirtD, drop: TEE ? 0.098 : 0.110, out: 0.012 };
  if (hem) {
    // Over a skirt the band has to stop short: the skirt panel is 0.161 W across and its rounded
    // top only necks in for the first three centimetres, so a hem hanging past that would be
    // running a few millimetres outside it over a long overlap, which is the near-coplanar case.
    const top = 0.026, bot = top - Math.min(hem.drop, lk.SKIRT ? 0.088 : 9),
          r = ring(0.100 * BODY);
    // The trunk's sections are not centred on the spine — the seat is fuller than the chest — so
    // the band is offset to sit on the same axis rather than cutting into the back of the figure.
    const cz = r[1] * r[2] + LAY.oz;
    shape('capsule', torso, 0, (top + bot) / 2, cz,
      2 * (r[0] + hem.out), top - bot, 2 * (r[1] + hem.out), hem.c, FABRIC);
    // The doubled-over edge at the bottom, which is what stops the band reading as a cut pipe.
    if (trim)
      shape('capsule', torso, 0, bot + 0.011, cz,
        2 * (r[0] + hem.out + 0.003), 0.015, 2 * (r[1] + hem.out + 0.003), hem.d, FABRIC);
  } else if (trim && !lk.apron) {
    // Tucked: no hanging edge, but the cloth still has to go somewhere. A shirt pushed into a
    // waistband blouses a little just above the belt, and that slight swell — sitting clear above
    // the waistband rather than over it, so the belt still shows — is the whole tell.
    const r = ring(0.098 * BODY);
    shape('capsule', torso, 0, 0.098 * BODY, r[1] * r[2] + LAY.oz,
      2 * (r[0] + 0.011), 0.050, 2 * (r[1] + 0.011), mixc(LAY.col, LAY.dk, 0.28), FABRIC);
  }

  // ---------------------------------------------------------------- the front opening
  //
  // A placket: the doubled strip of cloth a shirt's buttons go through, and the strongest single
  // signal that a garment is a shirt and not a pullover with a collar drawn on it. Full length on
  // a shirt; on a polo it stops a hand's width below the collar, which is the difference between
  // the two.
  const yTop = 0.582 * BODY;
  const yBot = col === 'polo' ? 0.408 * BODY : (tucked ? 0.086 : 0.026) * BODY;
  if (SHIRTY && !lk.JACK && chestFree && trim) {
    facePanel(yBot, yTop, 0, 0.017, 0.016, 0.010, mixc(shirtC, LAY.lt, 0.18), PANELM);
    if (lod === 0) {
      // Buttons, half sunk into the placket's face so that they meet it along a circle rather than
      // resting on it along a plane. Spaced as they are on a real shirt: the top one under the
      // collar, then a hand's width apart down the chest.
      const gap = (col === 'polo' ? 0.078 : 0.124) * BODY;
      for (let i = 0; i < (col === 'polo' ? 2 : 4); i++) {
        const y = yTop - 0.050 * BODY - i * gap;
        if (y < yBot + 0.02) break;
        shape('ball', torso, 0, y, frontZ(y, 0) + 0.010, 0.013, 0.013, 0.011, btn, BUTTONM);
      }
    }
  }
  // The same shirt worn open over the vest underneath. Not a button band lying on the chest: the
  // two hanging front edges of the shirt, out at the sides where the silhouette is, with a hand's
  // width of vest showing down the middle between them. Wide panels here — the first version was
  // 12 cm each — close that gap and the pair of them read as one slab bolted to the man's chest.
  // The sleeves need nothing: with a gilet and no coat, `ARM` is already the shirt.
  if (overshirt && trim)
    for (const s of [-1, 1])
      facePanel(0.030 * BODY, 0.545 * BODY, s * 0.098 * W, 0.040 * W, 0.016, 0.010,
        lk.TOP, PANELM);

  // A chest pocket. Every work shirt and every school shirt in this city has one, and it is the
  // cheapest thing on the figure that makes a plain front look made rather than moulded. Wearer's
  // left, which is -x here. Skipped under a pack, whose chest straps run through the same place.
  if (col === 'shirt' && !lk.JACK && chestFree && trim
      && lk.bag !== 'pack' && lk.bag !== 'delivery') {
    facePanel(0.390 * BODY, 0.468 * BODY, -0.068 * W, 0.036 * W, 0.014, 0.011, shirtC, PATCHM);
    // and its flap, standing proud of the pocket's own face rather than level with it
    if (lod === 0)
      facePanel(0.456 * BODY, 0.480 * BODY, -0.068 * W, 0.039 * W, 0.011, 0.021,
        tint(shirtC, 0.90), PATCHM);
  }

  // A hoodie's kangaroo pouch, as two panels with the seam between them: one wide panel across a
  // chest this curved would stand three centimetres off the ribs at its corners.
  if (col === 'hood' && !lk.JACK && !lk.VEST && chestFree && trim)
    for (const s of [-1, 1])
      facePanel(0.104 * BODY, 0.232 * BODY, s * 0.062 * W, 0.058 * W, 0.016, 0.011,
        mixc(LAY.col, LAY.dk, 0.22), PANELM);

  // A tracksuit's zip, down the middle of the jacket.
  if (TRACK && trim)
    facePanel(0.070 * BODY, 0.578 * BODY, 0, 0.011, 0.014, 0.011, tint(lk.JACKD, 0.84), PANELM);

  // ---------------------------------------------------------------- drape
  //
  // A t-shirt is cut bigger than the person inside it, and the two soft swells running down from
  // the ribs toward the hem are where that extra cloth goes. They are ridges half sunk into the
  // body rather than sausages laid on it — the capsule's centre is a couple of millimetres in
  // front of the measured surface, so its back is buried and only the swell shows — and they stand
  // further clear toward the hem, which is where the cloth actually leaves the body.
  //
  // Drawn in the shirt's own colour and not a darker one. A fold is a shape, and it is already lit
  // as one: tinted down as well it stops reading as cloth and starts reading as a line scored into
  // the front of the figure, which was the first version of this and was worse than nothing.
  if (TEE && !lk.JACK && !lk.VEST && chestFree && trim)
    for (const s of [-1, 1]) {
      const y = 0.165 * BODY, x = s * 0.058 * W;
      R.draw('capsule', M.mul(torso,
        M.mul(M.trans(x, y, frontZ(y, Math.abs(x) - 0.016) + 0.002),
          M.mul(M.mul(M.rotY(faceYaw(y, x)), M.rotZ(s * 0.30)),
                M.scale(0.034, 0.170 * BODY, 0.030)))), LAY.col, FABRIC);
    }

  // ---------------------------------------------------------------- the collar rib
  //
  // A crew neck, a polo's neckband and a turtleneck are all knitted rib set into a jersey body,
  // and the join is a real edge you can see across a room. The seam goes in at `trim`; the ribs
  // themselves — short verticals around the front of the band, three millimetres proud of it —
  // only at lod 0, where they cost four draws on the one or two people ever that close.
  const NECK = lk.TOPL;
  if ((col === 'crew' || col === 'polo' || col === 'turtle') && !lk.JACK && !lk.SCARF) {
    if (trim)
      shape('capsule', torso, 0, (F.collarY - 0.026) * BODY, 0.004,
        0.132, 0.014 * BODY, 0.136, tint(NECK, 0.86), FABRIC);
    if (lod === 0)
      for (const a of [-0.62, -0.21, 0.21, 0.62])
        shape('capsule', torso, Math.sin(a) * 0.064, F.collarY * BODY,
          0.004 + Math.cos(a) * 0.066, 0.011, 0.038 * BODY, 0.011,
          tint(NECK, 0.94), FABRIC);
  }

  // ---------------------------------------------------------------- sleeves
  //
  // The arm frames are rebuilt here rather than handed over, because the context object carries
  // `torso` but not the shoulder, elbow and wrist. This is a deliberate mirror of `arm()` in
  // figure.js and has to be kept in step with it — see the note at the bottom of this file.
  if (lk.sleeve !== 'none' && (trim || lod === 0)) {
    const upper = 0.31 * T, lower = 0.29 * T, slv = lk.sleeve;
    const STRIPE = mixc(lk.JACKL || LAY.lt, [1, 1, 1], 0.55);
    // A cuff button reads against the *sleeve*, which under a coat or a raglan yoke is not the
    // colour the front of the shirt is.
    const cbtn = lum(lk.ARM) > 0.45 ? tint(lk.ARM, 0.70) : mixc(lk.ARM, SHELL, 0.62);
    for (const s of [-1, 1]) {
      const L = s < 0;
      const shoulder = M.mul(torso, M.mul(M.trans(s * 0.225 * W, 0.495 * BODY, 0),
        M.mul(M.rotZ(L ? pose.shLz : pose.shRz), M.rotX(L ? pose.shL : pose.shR))));
      if (slv === 'half') {
        // Rolled, not merely cut. figure.js already puts a hem capsule at the cut; a roll is that
        // hem with the cloth turned back over it — a fatter band below it showing the lighter
        // inside face of the fabric, and a thin edge above where the turn begins. Concentric with
        // the hem, so the three of them read as one thickness of cloth folded twice.
        if (trim)
          shape('capsule', shoulder, 0, -upper + 0.026, 0,
            0.134 * W, 0.036, 0.142 * W, lk.ARML, FABRIC);
        if (lod === 0)
          shape('capsule', shoulder, 0, -upper + 0.050, 0,
            0.126 * W, 0.014, 0.134 * W, lk.ARMD, FABRIC);
      } else if (slv === 'short') {
        // A t-shirt sleeve hangs off the shoulder rather than gripping the arm, so its opening is
        // wider than the arm inside it and tipped outward: the gap between cloth and bicep is the
        // whole difference between a shirt and a coat of paint.
        // Kept close to the hem figure.js already draws at the cut: pushed much wider than this it
        // stops being an opening the arm hangs inside and becomes an armband strapped round it.
        const cut = upper * 0.46;
        if (trim)
          R.draw('capsule', M.mul(shoulder, M.mul(M.trans(0, -cut - 0.012, 0.002),
            M.mul(M.rotZ(s * 0.15), M.scale(0.126 * W, 0.030, 0.136 * W)))), lk.ARM, FABRIC);
        if (lod === 0)
          R.draw('capsule', M.mul(shoulder, M.mul(M.trans(0, -cut - 0.024, 0.002),
            M.mul(M.rotZ(s * 0.15), M.scale(0.130 * W, 0.012, 0.140 * W)))), lk.ARMD, FABRIC);
      } else {
        // Long: the sleeve is gathered into the cuff, which is a ring of cloth just above the cuff
        // figure.js draws, and a button on the outside of it.
        const el = M.mul(shoulder, M.mul(M.trans(0, -upper + 0.018, 0),
          M.rotX(L ? pose.elbL : pose.elbR)));
        const wrist = M.mul(el, M.mul(M.trans(0, -lower + 0.025, 0),
          M.rotY((L ? pose.twL : pose.twR) || 0)));
        if (trim) shape('capsule', wrist, 0, 0.026, 0, 0.106, 0.016, 0.114, lk.ARM, FABRIC);
        if (lod === 0)
          shape('ball', wrist, s * 0.031, -0.006, 0.040, 0.012, 0.012, 0.010, cbtn, BUTTONM);
      }
      // A stripe down the outside seam of each sleeve: half sunk into it, so it is a taped seam
      // and not a pipe strapped to the arm.
      if (TRACK && trim)
        shape('capsule', shoulder, s * 0.050 * W, -upper * 0.52, 0.004,
          0.022, upper * 0.86, 0.018, STRIPE, FABRIC);
    }
  }
};

// ---- what would be better handed over than reconstructed.
//
// Two things in here are copies of figure.js internals, and both would be a line in the context
// object rather than a hostage to fortune:
//
//   * `BODYP`, the `body` mesh's profile. Every panel in this file is placed against the measured
//     front of the torso, and the only way to measure it from out here is to hold the same table
//     gl.js built the mesh from. `R.profile('body')`, or the ring function itself, would do.
//   * the shoulder / elbow / wrist frames. `arm()` in figure.js already computes all six; the
//     context passes `torso` but not those, so a cuff has to rebuild the chain from `pose` and
//     re-derive the same 0.225 / 0.495 / 0.31 / 0.29 / 0.018 / 0.025 constants. Anything worn on
//     an arm — a cuff, a watch, a sleeve badge, a rolled shirt — needs them.
//
// Also noticed while measuring, all of it in figure.js and none of it touched from here:
//
//   * the placket capsule at `0.305 * BODY, 0.118` does not scale with `W`. Its front face lands
//     at a fixed z 0.124 while the chest's is at 0.126 * W, so on anyone with `wide` above about
//     0.98 — which is most of a roster, since an unset `wide` is seeded between 0.94 and 1.14 —
//     it is inside the body and draws nothing, and on the rest it protrudes by a millimetre or
//     two, which is a coplanar-face flicker waiting for a camera angle.
//   * the hem capsule at `0.055 * BODY` is 0.150 W across where the trunk is 0.152 W, and 0.1175 W
//     deep where the trunk's front is 0.120 W. Two millimetres inside the surface along its whole
//     length: invisible if the depth test wins and a flickering ring if it does not. (The hem in
//     this file hangs below the body instead, so the two do not fight.)
//   * the shoulder bag's cross-body strap, `trans(-0.055, 0.395, 0.010)`, sits at z 0.010 in a
//     torso a little over 0.12 deep, so the strap across the chest is buried in it. Only the bag
//     and its flap on the hip are ever seen.
})();
