// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ------------------------------------------------------------------------------ 发型 hair
//
// figure.js owns ten styles — short, tousled, buzz, bald, bun, bob, long, ponytail, braid, perm —
// and for every one of them that is not `bald` it has already drawn the shell: the skull again at
// `hairGrow` larger, displaced along its own normal so the hairline is simply where the two
// surfaces cross. That shell is the base of everything in this file. Nothing here redraws it,
// nothing here draws it at a larger scale, and nothing here answers to a name figure.js already
// knows; this file adds six more names, and each one is the shared shell plus the two or three
// shapes that make it that particular haircut.
//
// The six are chosen for what a street here actually looks like rather than for variety:
//
//   set       the blow-dried, lacquered 定型 a woman of fifty leaves the hairdresser with — higher
//             and smoother than the existing `perm`, which is curls
//   bowl      a schoolchild's 锅盖头: blunt round the sides, blunt across the fringe
//   undercut  长发盖剃青 — length on top, the sides and the nape taken back to stubble
//   thinning  an older man's crown, where the hair has gone from the top and stayed at the sides
//   clasp     a low bun in a 香蕉夹, which is most of the women over forty on a bus
//   plaits    双辫 on a child, one over each shoulder, with a tie on the end of each
//
// ---- the one rule everything here is built to
//
// A lump whose centre sits *inside* a convex surface pokes only a sliver of itself back out, and
// that sliver's normals are turned almost ninety degrees away from the surface it emerges from. On
// the top of a head, where the shell faces the sky, the sliver loses the whole sky term and
// renders as a dark ellipse: a dent, not a lock. figure.js already carries this note against the
// beard — "seven tidy lumps along the jaw rendered as a few dark seams and five clean-shaven men"
// — and it is still live in the `tousled` locks, which is where the dark circles on the crown come
// from. It cost this file two goes to learn the same thing.
//
// So no lump here is positioned by eye. `on` below puts a lump's centre *on* the surface it is
// meant to sit on, which makes it stand exactly its own radius proud from every angle and on every
// size of head — no arithmetic, no tangency, nothing to re-tune when a face seed moves the skull.
// The only shapes not placed that way are the ones that are not lumps: a mass with its own
// silhouette (a bowl, a bun, a plait), and a change of *colour* over a broad, shallow patch — a
// faded nape, a bare crown — where a soft edge is what the real thing has anyway.
//
// And every number is a multiple of the shell's own half-extents rather than a measurement in
// metres, so a child's proportionally larger skull carries its haircut with it instead of wearing
// an adult's three sizes too small.
FigureFit['hair'] = ctx => {
  const { shape, R, M, C, tint, mixc, lk, F, lod, trim, head, surf, SKINM, HAIRM2 } = ctx;

  const hs = lk.hairStyle;
  // Ten names belong to figure.js and one of those — 'bald' — means draw nothing at all. Anything
  // not on this list is somebody else's or nobody's, and this returns before it costs a test.
  if (hs !== 'set' && hs !== 'bowl' && hs !== 'undercut'
      && hs !== 'thinning' && hs !== 'clasp' && hs !== 'plaits') return;

  const HX = F.headW, HY = F.headH, HZ = F.headD, HC = F.headZ, GROW = F.hairGrow;
  // The half-extents of the shell figure.js has already put on this head. The skull mesh is an
  // ellipsoid of (0.44, 0.50, 0.455) in its own units and the hair mesh displaces it a further
  // 0.036 along the normal, all on the grown scale — so these three numbers are where the hair
  // already is, and every offset below is a fraction of them.
  const SX = 0.476 * (HX + GROW), SY = 0.536 * (HY + GROW), SZ = 0.491 * (HZ + GROW);
  const CY = -0.004, CZ = HC;                        // the shell's centre, in head space

  // Where the ray in direction (ux, uy, uz) leaves the ellipsoid centred (cx, cy, cz) with
  // half-extents (hx, hy, hz). The direction does not have to be normalised — only its shape
  // matters — so a lock can be aimed in round numbers and still land on the surface.
  const on = (cx, cy, cz, hx, hy, hz, ux, uy, uz) => {
    const t = 1 / Math.hypot(ux / hx, uy / hy, uz / hz);
    return [cx + ux * t, cy + uy * t, cz + uz * t];
  };
  // The z of the *shell* straight in front of (x, y). `surf` is the skull; a fringe laid against
  // `surf` is a fringe underneath the hair, which is to say a fringe nobody can see.
  const shellZ = (x, y) => {
    const z0 = surf(x, y);
    return z0 + 0.036 * (HZ + GROW) * (z0 - HC) / (0.455 * HZ);
  };

  const HAIR = lk.HAIR, HAIRD = lk.HAIRD, age = lk.age || 0;
  // Grey does not arrive all at once and it does not arrive evenly — it starts at the temples and
  // at the edge of a set, which is why a woman at the market can have black hair and a white rim.
  // The roster and `stranger()` already pick a grey hex outright for the oldest people, so this
  // leans on whatever colour the person was given rather than overriding it.
  const grey = t => age <= 0.34 ? HAIR
    : mixc(HAIR, C('#d6d1c7'), Math.min(1, (age - 0.34) / 0.66) * t);
  const EDGE = grey(0.55);
  // Scalp is skin — a shade darker and glossier than a cheek, because it is skin that has been out
  // in the sun with nothing on it. Not a pale hair colour at any strength: pale hair on a bald
  // crown reads as very short hair, which is a different man entirely.
  const SCALP = mixc(lk.SKIN, lk.SKIND, 0.30), SCALPM = { ...SKINM, gloss: 0.24 };
  // Skin with hair coming through it, mixed well past halfway toward the hair — the same recipe
  // and the same reason as figure.js's stubble: a shell standing proud of the skull faces the key
  // light more squarely than the skin beside it, and renders brighter than the arithmetic says.
  const STUBBLE = mixc(lk.SKIN, HAIRD, 0.62);

  // Anything on the crown is under the hat, and every crown in figure.js is deliberately wider
  // than the shell so that hair does not poke out round it. A visor has nothing over the top, so
  // it is the one hat the hair still shows under.
  const capped = !!lk.cap && lk.hat !== 'visor';

  // ------------------------------------------------------------------ 定型 a set perm
  //
  // Not the existing `perm`, which is curls: this one has been blown out over a round brush and
  // lacquered, so it is smooth, it is higher than the head, and it holds an outline. The outline is
  // the whole of it at distance — one dome a clear centimetre proud of the shell all round, sitting
  // back off the forehead the way a set does — and that is the only draw it costs on the crowd tier.
  if (hs === 'set' && !capped) {
    const DX = SX * 1.05, DY = SY * 0.80, DZ = SZ * 0.98;       // the dome's own half-extents
    const DCY = CY + SY * 0.34, DCZ = CZ - SZ * 0.20;
    shape('ball', head, 0, DCY, DCZ, DX * 2, DY * 2, DZ * 2, HAIR, HAIRM2);
    // The roll over each ear. rotX turns the capsule's own axis from vertical to along the head's
    // z, which is the way a roll off a brush actually runs, and it is placed a centimetre outboard
    // of the dome rather than on it — a roll that hugs the dome is a seam in it.
    if (trim)
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(head, M.mul(M.trans(s * SX * 0.94, CY + SY * 0.22, CZ - SZ * 0.04),
          M.mul(M.rotX(Math.PI / 2), M.scale(SX * 0.42, SZ * 1.16, SY * 0.44)))), EDGE, HAIRM2);
    // Five curls round the front edge, sitting *on* the dome so each one stands its own radius
    // proud of it, and spaced by bearing rather than in a row — five identical balls in a line
    // across a forehead is a tiara. Greyed harder than the mass: the edge of a set is the first
    // place a woman goes grey and the last place she dyes.
    if (lod === 0)
      for (let i = 0; i < 5; i++) {
        const a = (i / 4 - 0.5) * 2.0;
        const [x, y, z] = on(0, DCY, DCZ, DX, DY, DZ,
          Math.sin(a), 0.62 - Math.abs(a) * 0.20, Math.cos(a) * 0.86);
        shape('ball', head, x, y, z, SX * 0.50, SY * 0.36, SZ * 0.48, EDGE, HAIRM2);
      }
  }

  // ------------------------------------------------------------------ 锅盖头 a bowl cut
  //
  // Two blunt edges and a round top, and it is the edges that make it — a bowl cut with a soft
  // outline is just short hair. The mass is one ball well proud of the shell and pulled back clear
  // of the face; everything that comes forward over the forehead is the fringe, which is its own
  // piece and is placed against the shell rather than against the skull.
  if (hs === 'bowl') {
    if (!capped)
      shape('ball', head, 0, CY + SY * 0.30, CZ - SZ * 0.26,
        SX * 2.16, SY * 1.58, SZ * 1.94, HAIR, HAIRM2);
    // The cut line round the sides and the back: a shallow cylinder, so it has a genuine flat
    // underside. That horizontal edge across the top of the ears is the single thing that says
    // "bowl", and no amount of rounding off will give it to you.
    if (trim && !capped)
      shape('cyl', head, 0, CY - SY * 0.26, CZ - SZ * 0.26,
        SX * 2.24, SY * 0.20, SZ * 2.00, HAIRD, HAIRM2);
    if (trim) {
      // The fringe: straight across, blunt at the bottom, and standing 8 mm off the forehead so it
      // is hair in front of a head rather than a stripe painted on one. Its lower edge is cut to
      // the eyebrow, which is where a school barber puts it and a millimetre lower is a child who
      // cannot see out.
      const fy = F.browY + 0.020, fh = SY * 0.54;
      shape('softBox', head, 0, fy, shellZ(0, fy) + 0.008 - SZ * 0.34,
        SX * 1.62, fh, SZ * 0.68, HAIR, { ...HAIRM2, round: 0.030 });
      // The two corners, where the fringe turns off the forehead and runs back into the mass.
      // Placed on the shell so each stands its own radius proud instead of denting it.
      if (lod === 0)
        for (const s of [-1, 1]) {
          const [x, y, z] = on(0, CY, CZ, SX, SY, SZ, s * 0.80, 0.46, 0.62);
          shape('ball', head, x, y, z, SX * 0.54, SY * 0.44, SZ * 0.50, HAIR, HAIRM2);
        }
    }
  }

  // ------------------------------------------------------ 剃青 shaved sides, length on top
  //
  // The shell is already short hair over the whole head, so the shell *is* the shaved part and
  // nothing has to be taken away — which is fortunate, because nothing here can take anything
  // away. What gets added is the length: one mass sitting well up on the crown, and then the nape
  // in stubble, which is the half of this cut you actually see, since in play a person is mostly
  // walking away from you.
  if (hs === 'undercut') {
    const MX = SX * 0.93, MY = SY * 0.65, MZ = SZ * 0.90;
    const MCX = SX * 0.10, MCY = CY + SY * 0.50, MCZ = CZ - SZ * 0.28;
    if (!capped)
      shape('ball', head, MCX, MCY, MCZ, MX * 2, MY * 2, MZ * 2, HAIR, HAIRM2);
    // The nape, taken back to skin. One broad, shallow ellipsoid rather than a lump: it stands a
    // centimetre proud at the back of the head and feathers to nothing at the sides and at the
    // ears, which is a fade, and it is deliberately kept short of the face — its front reach is
    // a centimetre inside the cheek, and that margin is the whole safety of it.
    if (trim)
      shape('ball', head, 0, CY - SY * 0.22, CZ - SZ * 0.14,
        SX * 1.87, SY * 1.10, SZ * 1.88, STUBBLE, SKINM);
    // Three locks swept back off the parting, each sitting on the mass and each smaller than the
    // last. Balls and not capsules: a straight capsule laid on a dome either buries its ends and
    // dents the dome, or floats them off it.
    if (lod === 0 && !capped)
      for (let i = 0; i < 3; i++) {
        const t = i / 2;
        const [x, y, z] = on(MCX, MCY, MCZ, MX, MY, MZ, -0.30 - t * 0.55, 1.0, 0.55 - t * 0.85);
        shape('ball', head, x, y, z,
          SX * (0.46 - t * 0.10), SY * (0.40 - t * 0.08), SZ * (0.44 - t * 0.10), EDGE, HAIRM2);
      }
  }

  // --------------------------------------------------------- 谢顶 a thinning crown
  //
  // Hair goes from the top and stays at the sides, and the shell figure.js drew is the sides. What
  // is missing is the top, and the only way to have it is to put the scalp back *over* the shell:
  // an ellipsoid narrower than the head but half again as tall, so it emerges through the crown
  // alone and its edge is simply where the two surfaces cross. A centimetre and a half proud at
  // the apex and nothing at the rim — which is what a receding hairline is, a soft edge, and the
  // one place in this file where a shallow crossing is the right answer rather than the bug.
  //
  // It comes out at about 9 cm across with its front edge high on the forehead, which is the shape
  // that reads as sixty from the other side of a courtyard, and it costs one draw to do it.
  if (hs === 'thinning' && !capped) {
    const PX = SX * 0.76, PY = SY * 1.13, PZ = SZ * 0.86, PCZ = CZ - SZ * 0.06;
    shape('ball', head, 0, CY, PCZ, PX * 2, PY * 2, PZ * 2, SCALP, SCALPM);
    // What is left of it, over each ear. A comb-over was tried here first and thrown away: three
    // straight capsules laid across a dome either bury their ends in it — the dark-ellipse failure
    // at the top of this file — or lift clear of it and read as wire. A tuft placed *on* the shell
    // cannot do either, and two of them either side of a bare crown say the same thing about the
    // man for one draw less.
    if (lod === 0) {
      const WISP = grey(0.80);
      for (const s of [-1, 1]) {
        const [x, y, z] = on(0, CY, CZ, SX, SY, SZ, s * 0.92, 0.34, -0.10);
        shape('ball', head, x, y, z, SX * 0.52, SY * 0.42, SZ * 0.60, WISP, HAIRM2);
      }
    }
  }

  // ------------------------------------------------------- 香蕉夹 a bun with a clasp
  //
  // Lower and flatter than figure.js's `bun`, which is gathered high and tied with a band. This one
  // is folded up at the nape and held with a claw clip, and the clip is the point of it: a pale
  // horn plate across a dark bun is visible the length of a bus, which is more than can be said for
  // the bun. Nothing here is on the crown, so a hat changes none of it.
  if (hs === 'clasp') {
    const BX = SX * 0.54, BY = SY * 0.30, BZ = SZ * 0.38;
    const [bx, by, bz] = on(0, CY, CZ, SX, SY, SZ, 0, -0.55, -0.84);
    shape('ball', head, bx, by, bz, BX * 2, BY * 2, BZ * 2, HAIR, HAIRM2);
    // Horn, mixed off this person's own dark tone so it always sits *against* their hair rather
    // than being one shared beige for the whole city.
    const CLASP = mixc(HAIRD, C('#e9dcc0'), 0.66);
    if (trim) {
      const [cx, cy, cz] = on(bx, by, bz, BX, BY, BZ, 0, 0.12, -1);
      shape('softBox', head, cx, cy, cz, SX * 0.62, SY * 0.22, SZ * 0.20,
        CLASP, { gloss: 0.42, round: 0.020 });
    }
    if (lod === 0) {
      // The ridge down the middle of the clip, and the one wisp that never goes in. One, not two:
      // two is a hairstyle.
      const [rx, ry, rz] = on(bx, by, bz, BX, BY, BZ, 0, 0.12, -1);
      shape('capsule', head, rx, ry + SY * 0.02, rz + SZ * 0.06,
        SX * 0.10, SY * 0.20, SZ * 0.10, tint(CLASP, 0.82), HAIRM2);
      const [wx, wy, wz] = on(0, CY, CZ, SX, SY, SZ, 0.62, -0.68, -0.42);
      shape('capsule', head, wx, wy - SY * 0.14, wz,
        SX * 0.16, SY * 0.54, SZ * 0.16, HAIRD, HAIRM2);
    }
  }

  // ------------------------------------------------------------------ 双辫 plaits
  //
  // Two of them, gathered behind the ear and falling forward past the jaw, which is where a
  // child's go and is also the only place they can be seen from the front — a single braid down
  // the spine already exists and this is not another one.
  //
  // They are deliberately *short*. Everything here lives in the head's frame, so a plait long
  // enough to look like an adult's runs straight through the top of the shoulder — and a ball
  // half-buried in a sleeve emerges as the same dark crescent this whole file is written to avoid.
  // Stopping them at the jaw keeps them in clear air at every height, every build and every pose,
  // and stubby plaits are what a six-year-old actually has.
  //
  // At the crowd tier each side is one lump: two dark masses either side of a small head is the
  // whole signal and it costs two draws. Closer in, the same plait is a gather and two segments
  // narrowing into a tie, because a plait is a shape that steps down and a smooth taper is a rope.
  if (hs === 'plaits') {
    // A tie is red as often as not on a child, and two centimetres of colour on a person who is
    // otherwise the same brown as everybody else is worth its draw.
    const TIE = lk.youth ? C('#c8443c') : HAIRD;
    for (const s of [-1, 1]) {
      const [gx, gy, gz] = on(0, CY, CZ, SX, SY, SZ, s * 0.88, -0.16, -0.10);
      if (!trim) {
        shape('ball', head, gx + s * SX * 0.06, gy - SY * 0.32, gz + SZ * 0.16,
          SX * 0.56, SY * 1.14, SZ * 0.52, HAIR, HAIRM2);
        continue;
      }
      shape('ball', head, gx, gy, gz, SX * 0.58, SY * 0.46, SZ * 0.54, HAIR, HAIRM2);
      shape('ball', head, gx + s * SX * 0.08, gy - SY * 0.34, gz + SZ * 0.22,
        SX * 0.46, SY * 0.44, SZ * 0.42, HAIR, HAIRM2);
      if (lod === 0)
        shape('ball', head, gx + s * SX * 0.13, gy - SY * 0.64, gz + SZ * 0.38,
          SX * 0.34, SY * 0.38, SZ * 0.32, HAIRD, HAIRM2);
      shape('capsule', head,
        gx + s * SX * (lod === 0 ? 0.16 : 0.11),
        gy - SY * (lod === 0 ? 0.86 : 0.56),
        gz + SZ * (lod === 0 ? 0.44 : 0.30),
        SX * 0.24, SY * 0.18, SZ * 0.24, TIE, { gloss: 0.18 });
    }
  }
};
