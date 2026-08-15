// 服装店 · 悦己时装 · YUEJI FASHION — floor 1
//
// This tenant's fit-out. Registering a function here overrides the inline `fit` still sitting in
// js/mall.js (see MallFit at the top of that file), so the two can be compared and the old one
// stays as the fallback until this is better than it.
//
// The callback is handed `A`, the shop's own local frame and toolkit. Coordinates are (a, b):
// `a` is depth measured inward from the outside wall, 0 at the back and 4.8 at the shopfront;
// `b` runs along the frontage, 0 at the centre and +/- half the unit's length at the ends. `y`
// is height above this shop's own floor, so the same numbers work on any deck.
//
//   A.put(a,b,wa,wb,h,y,colour,opt)  a box: wa is its size along a, wb its size along b
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)  — these size in WORLD axes, so
//                                    anything not square in plan goes through R3() below
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)  a real light; the eight nearest the eye reach the shader
//   A.th(hz,a,b,zh,en,note,reach,y)  an interactable word; its approach point is a +/- 1.15
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------- the plan, and why it is this
//
// The unit is 10 m of frontage by 4.8 m deep, which is a shallow shop: everything is read from
// one place, the doorway at a = 4.8, b = 0. So the plan is the standard one every clothes shop
// on earth uses, arranged so that standing in that doorway you see all of it at once —
//
//   back left    two curtained fitting rooms and a full-height mirror, in one run of joinery
//   back centre  a feature plinth with a dressed form on it, under the shop's own name
//   back right   the cash desk, with the till, a card machine and a trolley of carrier bags
//   both sides   double-hung rails against the side walls, a stock shelf over them, on track
//   middle       a folding island of knitwear, a four-way rack and two display tables
//   the door     two dress forms on plinths, one either side of the way in
//
// The centre line from the threshold to the back wall is left clear, because the one thing a
// shop must have is a way in you can see the back of the shop down. Everything else is set out
// left and right of it, and the aisle between the back joinery and the mid-floor fixtures is
// held at about 0.8 m, which is what makes a fitting room usable rather than decorative.
//
// Three facts about the shell decide where the joinery may go, and all three come from reading it
// rather than guessing. The back wall carries a slatted timber feature panel with the shop's name
// across b -2.10..2.10 and a lit graphic in a frame at b +/-3.80, y 1.05..2.67. Each side wall
// carries a 1.34 x 1.30 lightbox at a 1.63..2.97, y 1.40..2.70. And the window platform behind
// the glass begins at a 3.655 and |b| 1.65. So the wall bays are posts and rails with nothing
// behind them — the lightbox shows through above the merchandise, which is exactly what a lit
// lifestyle graphic over a double-hang bay looks like — the posts stand at a 1.45 and 3.56, clear
// of the lightbox at both ends, and the stock shelf goes above it at 2.80 rather than across it.
MallFit['服装店'] = A => {
  // ---- the frame ------------------------------------------------------------------------
  // `a` maps to world x on the east and west walls and to world z on the north and south ones.
  // `A.put` is told its two horizontal sizes in shop axes and sorts that out itself; the round
  // primitives are not, so anything with different sizes on the two horizontal axes — a sleeve,
  // a rail, a torso — is handed its dimensions through `R3`. This shop is on the west wall, but
  // the arithmetic costs nothing and the fit-out then reads the same anywhere.
  const EW = A.dim(1, 0)[0] === 1;
  const R3 = (ra, ry, rb) => { const d = A.dim(ra, rb); return [d[0], ry, d[1]]; };
  const alongA = EW ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 };  // lay a capsule along a
  const alongB = EW ? { rx: Math.PI / 2 } : { rz: Math.PI / 2 };  // ... and along b

  // ---- palette --------------------------------------------------------------------------
  // mall.js keeps its own `col` inside the room's closure, so a tenant file names its colours
  // again. These are the same shopfit greys and timbers, plus the two merchandise stories.
  const c = {
    trim: C('#2f3236'), steel: C('#aeb7bd'), steelD: C('#6e7981'),
    wood: C('#9b7a56'), woodD: C('#5c4635'), walnut: C('#4a382b'), oak: C('#b08a5e'),
    stone: C('#e5decc'), stoneD: C('#cec6b2'), cream: C('#eee2cc'),
    warm: C('#ffeccd'), goldL: C('#f3d47b'), card: C('#f2ecdd'), sale: C('#8c342b'),
    curtain: C('#7a3730'), curtainD: C('#5c2823'), fabric: C('#8c7666'), dust: C('#c9bda9'),
    cabin: C('#232830'), occupied: C('#d75b4e'), free: C('#66ad75'),
    // What a mirror in this shop has in it, top to bottom: the lit ceiling, the mid-tone timber
    // and stock of the room, and the pale stone floor. Deliberately a couple of steps darker
    // than the real surfaces they stand for — a mirror never returns as much light as it takes,
    // and a panel as bright as the room around it stops being a mirror and becomes a window.
    mirrorT: C('#8d8b84'), mirrorM: C('#5b5952'), mirrorB: C('#77736a'),
  };
  // The material tuples are copied from MAT in js/mall.js *exactly*, value for value. build.js
  // batches on (mesh, mode, radius, textures, matScale, matAmt, nrmAmt), so a tenant that agrees
  // with the shell to two decimal places shares its instanced calls, and one that is a hundredth
  // out silently opens a second batch for every surface it touches.
  const MET = { mat: 'metal', matScale: .50, matAmt: .30, nrmAmt: .30 };
  const TIM = { mat: 'wood', matScale: .90, matAmt: .30 };
  const CLO = { mat: 'fabric', matScale: .55, matAmt: .32 };
  // MAT.slab is the shop-floor stone at a 0.72 m repeat, which is right underfoot and wrong on a
  // display top: a 1 m table wearing it is a mosaic of cobbles the size of a hand. MAT.stone is
  // the same photograph at a 1.15 m repeat, so a metre of table gets most of one slab, which is
  // what a stone worktop looks like. Same texture, so still the same batch as the concourse.
  const STN = { mat: 'paving', matScale: 1.15, matAmt: .30, nrm: null };

  // A shop merchandises by colour story, not by cycling every hue it owns through every fixture.
  // One wall is the neutral wall — oat, camel, charcoal, bone — and the other carries the colour.
  // That is most of the difference between "a clothes shop" and "a bag of sweets on poles".
  const NEUTRAL = [C('#e2d7c3'), C('#c3ac8b'), C('#9c7648'), C('#5f5b54'),
                   C('#2b2f35'), C('#8e9498'), C('#d3c7ae'), C('#584f46')];
  // Knocked back towards grey after looking at the first render: eight fully saturated hues one
  // per hanger is a paint chart, and it was the loudest thing in the building.
  const COLOUR = [C('#7e3b30'), C('#345c52'), C('#324862'), C('#8f6a79'),
                  C('#5b6240'), C('#9a7740'), C('#524860'), C('#834a36')];
  // Stock does not arrive one garment per colour. It arrives as a size run: two or three of the
  // same thing together, then the next thing. Hanging them alternating is the single clearest
  // tell that a rail was generated rather than merchandised, so colours come off here in runs.
  const runs = (cs, n, seed) => {
    const out = [];
    for (let i = 0, k = seed; out.length < n; i++, k += 3)
      for (let r = 0, m = 2 + ((k * 7) % 2); r < m && out.length < n; r++) out.push(cs[k % cs.length]);
    return out;
  };
  // Hangers are not all one colour in a real shop: black plastic on the outerwear, blonde timber
  // on the knitwear, brushed wire on the sale rail. Grouped by rail, with the odd stray, which is
  // how stockrooms actually work.
  const HANG = { black: C('#26292d'), oak: C('#b08a5e'), wire: C('#aeb7bd') };
  const pale = k => [Math.min(1, k[0] * 1.16 + .05), Math.min(1, k[1] * 1.16 + .05),
                     Math.min(1, k[2] * 1.16 + .05)];
  const dark = k => [k[0] * .58, k[1] * .58, k[2] * .58];

  // Four authored merchandising stories, keyed to the game's Weather season rather than to frame
  // time.  The shop's invented 悦己 identity stays on the feature card in all four states; only
  // the collection palette changes.  Dark and pale companions are made once here, not allocated
  // in the motion callback.
  const SEASON_STORIES = [
    { key: 'spring', hz: '春', hero: C('#617b68'), card: C('#b86f68'), accessory: C('#c78b68') },
    { key: 'summer', hz: '夏', hero: C('#2f6670'), card: C('#6c91a1'), accessory: C('#c26959') },
    { key: 'autumn', hz: '秋', hero: C('#8c5037'), card: C('#aa7635'), accessory: C('#76515d') },
    { key: 'winter', hz: '冬', hero: C('#34445c'), card: C('#73363d'), accessory: C('#788997') },
  ].map(s => ({ ...s, heroDark: dark(s.hero), accessoryPale: pale(s.accessory) }));
  const seasonIndex = () => {
    const w = typeof Weather !== 'undefined' && Weather.now ? Weather.now : null;
    const key = w && w.season && w.season.key;
    const found = SEASON_STORIES.findIndex(s => s.key === key);
    if (found >= 0) return found;
    // The fallback follows the same ten-day cadence as Weather.seasonOf.  It is mainly for the
    // isolated source harness; a built game always has Weather.now.season.
    const day = w && Number.isFinite(Number(w.day)) ? Number(w.day) : 1;
    return Math.floor(Math.max(0, day - 1) / 10) % SEASON_STORIES.length;
  };
  const initialStory = SEASON_STORIES[seasonIndex()];
  const seasonalHero = [], seasonalAccessories = [], seasonalVisuals = [];

  const reducedMotion = () => {
    try {
      if (typeof window !== 'undefined' && window.MotionSafety && window.MotionSafety.reduced)
        return !!window.MotionSafety.reduced();
      return typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };

  // ---- one garment on a hanger ------------------------------------------------------------
  // A hanger sits on the tube with its shoulder bar *across* the rail, so a packed rail is read
  // edge-on: what you see from the aisle is the thickness of each garment, not its front.
  //
  // That is also where the first two attempts went wrong. `taper` is a cone that is wide at the
  // bottom and narrow at the top, so a body built out of one is the wrong way up for a garment
  // on a hanger; with a rounded shoulder cap over it and two stubs poking out under the hem, an
  // entire shop of them read as a rack of coloured bowling pins. What actually says "clothing"
  // is four things, in this order: a hanger bar *wider* than the garment and visible above it, a
  // shoulder that is the widest part of the cloth, sleeves standing proud of the body down each
  // side, and a hem nearly as wide as the shoulder rather than flared away to a skirt. All five
  // boxes are softBox / mode 7 / one corner radius, so the whole shop's stock — several hundred
  // boxes — is one instanced draw call rather than several hundred.
  //
  // Two numbers then decide whether it is a garment or a bolster, and the second render got both
  // wrong. The corner radius is the first: 25 mm on a box 105 mm tall rounds away half its height,
  // and a rail of those is a rail of pillows. It is 12 mm now, which softens the arris and leaves
  // the box. The second is that the body and the hem must *overlap*, not stack: two boxes of the
  // same colour meeting edge to edge draw a seam across the garment at the join and it reads as
  // segments, so the hem is sunk two thirds of its own height into the body and only the step in
  // width shows — which is exactly what the hem of a coat is.
  const GO = { mode: 7, round: .012, tag: '衣服' };
  const garment = (a, b, y, drop, cc, hc, ax, jit = 0, cut = 0) => {
    // `sh` runs across the shoulders, `th` through the body. For a rail along b the shoulder is
    // along a, and the other way round for a rail along a — a hanger always sits across its tube.
    const P = (sh, th) => ax === 'b' ? [sh, th] : [th, sh];
    const at = d => ax === 'b' ? [a + d, b] : [a, b + d];
    const sh = cut === 2 ? .360 : cut === 3 ? .330 : .340;
    const th = cut === 3 ? .180 : cut === 2 ? .165 : .148;
    // Nothing on a real rail is square on the tube. A yaw jitter says so without shearing the
    // parts away from one another, which is what tipping each box about a horizontal axis does
    // to a garment that is stacked out of five of them rather than welded into one.
    const ry = jit;
    const bar = P(sh * 1.09, .026), yk = P(sh, th), bd = P(sh * .86, th * .94);
    const hem = P(sh * (cut === 2 ? 1.00 : .94), th * (cut === 2 ? .99 : .96));
    const top = y - .215;                             // where the cloth starts, under the hanger
    const hemH = drop * .30;
    A.cap(a, b, y - .035, .012, .10, .012, hc, { tag: '衣架', gloss: .45 });        // the hook
    A.put(a, b, bar[0], bar[1], .018, y - .098, hc, { hard: true, gloss: .42, tag: '衣架', ry });
    A.put(a, b, yk[0], yk[1], .105, top - .045, cc, { ...GO, ry });                  // shoulders
    A.put(a, b, bd[0], bd[1], drop, top - drop / 2, cc, { ...GO, ry });              // body, one box
    A.put(a, b, hem[0], hem[1], hemH, top - drop + hemH * .34, cc, { ...GO, ry });   // hem, sunk in
    // Both sleeves, out at the *ends* of the shoulder bar. The first version put them at 0.115
    // along a shoulder axis whose own half-extent is 0.17, which buried them inside the body:
    // every garment in the shop was a smooth pipe because the one detail that says "clothing"
    // was sitting inside it. Standing 2 cm proud of the body they read as two soft edges.
    const sl = P(.064, th * .72);
    for (const k of [-1, 1]) {
      const q = at(k * (sh / 2 - .022));
      A.put(q[0], q[1], sl[0], sl[1], drop * .62, top - .04 - drop * .31, cc, { ...GO, ry });
    }
  };
  // An empty hanger, for the stock of spares every rail carries at its quiet end.
  const spare = (a, b, y, hc, ax) => {
    const p = ax === 'b' ? [.30, .024] : [.024, .30];
    A.cap(a, b, y - .035, .012, .10, .012, hc, { tag: '衣架', gloss: .45 });
    A.put(a, b, p[0], p[1], .026, y - .100, hc, { hard: true, gloss: .42, tag: '衣架' });
  };
  // A folded garment is a stack of thin leaves with a pale crease along the edge you see, not one
  // thick block. Depth runs outward, so the crease goes on the *larger* a — the face towards the
  // door — and it stands a few millimetres proud of that face, or it is inside the leaf and there
  // is nothing to see. `y` is the surface it sits on.
  const fold = (a, b, y, n, cc, wa = .29, wb = .36) => {
    const F = { mode: 7, round: .009, tag: '衣服' };
    for (let j = 0; j < n; j++) {
      const sk = ((j * 7) % 3 - 1) * .009, ty = y + .015 + j * .029, ry = ((j * 5) % 3 - 1) * .026;
      A.put(a + sk, b + sk * .6, wa - j * .006, wb - j * .011, .026, ty, cc, { ...F, ry });
      A.put(a + sk + wa / 2 - .002, b + sk * .6, .010, wb - .05 - j * .011, .019, ty, pale(cc),
        { ...F, ry });
    }
  };
  // A price ticket: a small card on a wire, which is the thing that says the stock is for sale.
  // A glyph run is `size + gap` wide per character, so a four-character price has to be set at
  // 4.5 cm on a 22 cm card or it runs off both ends of the card it is printed on.
  const ticket = (a, b, y, text) => {
    A.cap(a - .008, b, y - .075, .005, .15, .005, c.steelD, { gloss: .5 });
    A.put(a, b, .010, .225, .105, y, c.card, { hard: true, gloss: .18, tag: '价格' });
    A.glyph(a + .010, b, y + .002, text, { size: .045, gap: .012, color: c.trim, glow: 0 });
  };
  // A tent card standing on a table top beside a stack. A glyph quad is always upright — there is
  // no lying-flat option in `glyphs` — so a price laid flat on the table would be a blank rectangle
  // and nothing else. It stands up, which is what a shelf-edge card does anyway.
  const tent = (a, b, y, text, w = .26) => {
    A.put(a, b, .055, w, .012, y + .088, c.card, { hard: true, gloss: .16, tag: '价格' });   // spine
    A.put(a - .022, b, .010, w, .085, y + .046, c.card, { hard: true, gloss: .16, tag: '价格' });
    A.put(a + .022, b, .010, w, .085, y + .046, c.card, { hard: true, gloss: .16, tag: '价格' });
    A.glyph(a + .030, b, y + .048, text, { size: .046, gap: .013, color: c.trim, glow: 0 });
  };

  // ---- a label whose approach point is chosen, not derived ---------------------------------
  // `A.th` puts a thing's focus at a + 1.15 — one step further out from the back wall, on the
  // same b. That is right for a fixture you walk up to head-on and wrong for every fixture in a
  // shop, because a shop is walked along an aisle and read sideways: the rail is at the wall and
  // you stand in the aisle beside it, not in front of it. Anchoring by a + 1.15 alone is how the
  // mirror in this shop ended up with its approach circle inside the folding island, and how the
  // till's landed in a 35 cm slot between a display table and the window platform. Both passed a
  // reading of the code and neither worked.
  //
  // The thing is returned, so the focus can simply be set: the word hangs where the merchandise
  // is and the circle lands where a customer actually stands, which for almost everything here is
  // the cross aisle at a ≈ 1.95. Every one of these is checked against the collision map rather
  // than reasoned about — see the numbers in the comment above MallCast at the bottom.
  const lab = (hz, a, b, zh, en, note, reach, y, fa, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(fa, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };

  // ---- trousers on a clip hanger ------------------------------------------------------------
  // Two legs off a clamp bar, which is the one silhouette that cannot be read as anything else.
  // Folded on a table they are a jumper; hung from the waist they are trousers.
  const trouser = (a, b, y, drop, cc, hc, ax) => {
    const P = (sh, th) => ax === 'b' ? [sh, th] : [th, sh];
    const at = d => ax === 'b' ? [a + d, b] : [a, b + d];
    A.cap(a, b, y - .035, .012, .10, .012, hc, { tag: '衣架', gloss: .45 });
    const bar = P(.30, .022);
    A.put(a, b, bar[0], bar[1], .030, y - .105, hc, { hard: true, gloss: .42, tag: '衣架' });
    const leg = P(.115, .105);
    for (const k of [-1, 1]) {
      const q = at(k * .068);
      A.put(q[0], q[1], leg[0], leg[1], drop, y - .13 - drop / 2, cc,
        { mode: 7, round: .014, tag: '衣服' });
    }
    // The seat, one box across the top of both legs, so the pair reads as one garment.
    const seat = P(.255, .118);
    A.put(a, b, seat[0], seat[1], .17, y - .195, cc, { mode: 7, round: .014, tag: '衣服' });
  };
  // ---- a skirt on a hanger -------------------------------------------------------------------
  // Narrow at the waist, wide at the hem, and nothing above the waistband but the bar it hangs
  // from: that gap between the hanger and the top of the cloth is the whole difference between a
  // skirt and a very short dress. Two boxes rather than a taper, because a `taper` is round in
  // plan and would leave the batch every other garment in the shop is drawn in.
  const skirt = (a, b, y, drop, cc, hc, ax) => {
    const P = (sh, th) => ax === 'b' ? [sh, th] : [th, sh];
    const S = { mode: 7, round: .014, tag: '衣服' };
    A.cap(a, b, y - .035, .012, .10, .012, hc, { tag: '衣架', gloss: .45 });
    const bar = P(.28, .022);
    A.put(a, b, bar[0], bar[1], .026, y - .102, hc, { hard: true, gloss: .42, tag: '衣架' });
    const wai = P(.225, .105), hem = P(.325, .148);
    A.put(a, b, wai[0], wai[1], .13, y - .245, cc, S);                       // waistband
    A.put(a, b, hem[0], hem[1], drop, y - .28 - drop / 2, cc, S);            // the skirt itself
  };
  // ---- a scarf ------------------------------------------------------------------------------
  // Folded in half and laid over itself: a doubled band with the loop at one end and two tails at
  // the other. Three boxes, and the step between the band and the tails is the whole read.
  const scarf = (a, b, y, cc, ax = 'b', s = 1, seasonal = null) => {
    const P = (al, ac) => ax === 'b' ? [ac, al] : [al, ac];
    // The one seasonal accessory uses the hero outfit's .018 soft-box key, so all colour-changing
    // stock remains one dynamic draw.  Every ordinary scarf keeps its original .020 silhouette.
    const S = { mode: 7, round: seasonal ? .018 : .020, tag: '衣服' };
    const keep = (p, tone) => { if (seasonal) seasonal.push({ p, tone }); return p; };
    const band = P(.40 * s, .17 * s), tail = P(.20 * s, .155 * s);
    keep(A.put(a, b, band[0], band[1], .055, y + .028, cc, S), 'base');
    const d = ax === 'b' ? [0, .16 * s] : [.16 * s, 0];
    keep(A.put(a + d[0], b + d[1], tail[0], tail[1], .048, y + .072, pale(cc), S), 'pale');
    keep(A.put(a - d[0] * .9, b - d[1] * .9, tail[0], tail[1], .048, y + .068, cc, S), 'base');
  };

  // ---- a dress form -----------------------------------------------------------------------
  // What makes one read as a figure rather than a bollard is the shoulder. Three ellipsoids
  // stacked up — which is what the shell's own window mannequin is, and what the first version
  // of this was — blend into a single one-metre egg the moment you stand next to it, because
  // nothing in that silhouette is flat and nothing is horizontal. A shoulder plate across the top
  // of the chest fixes it: a dress form is wide and flat across the shoulder and drawn in at the
  // waist, and those two facts are the whole read.
  //
  // And a dress form in a shop is *wearing something*, so the outfit is built to cover the body
  // rather than to sit inside it. The first version's coat was a cone narrower than the torso it
  // was supposed to be on, so the bare form showed through it everywhere and the pair of them
  // came out as a cream egg with a stripe round it.
  const form = (a, b, y, cc, outfit, s = 1, seasonal = null) => {
    const t = { mode: 7, gloss: .06, tag: '服装店' };
    A.cyl(a, b, y + .028, .225 * s, .055, c.steelD, { gloss: .5, tag: '服装店', ...MET });
    A.cyl(a, b, y + .32 * s, .028 * s, .60 * s, c.steelD, { gloss: .5, tag: '服装店' });
    A.ball(a, b, y + .76 * s, ...R3(.108 * s, .140 * s, .152 * s), cc, t);          // hips
    A.ball(a, b, y + .95 * s, ...R3(.090 * s, .115 * s, .122 * s), cc, t);          // waist
    A.ball(a, b, y + 1.17 * s, ...R3(.112 * s, .150 * s, .174 * s), cc, t);         // chest
    A.put(a, b, .200 * s, .345 * s, .085 * s, y + 1.29 * s, cc,
      { ...t, round: .05 });                                                        // shoulders
    A.cyl(a, b, y + 1.38 * s, .040 * s, .12 * s, c.cream, { gloss: .16, tag: '服装店' });
    if (!outfit) return;
    // The outfit: one long coat over the torso, a hem sunk into the bottom of it, sleeves standing
    // clear of the body and a collar at the neck.
    //
    // One box for the body, not three. Three boxes of the same colour stacked end to end draw two
    // horizontal seams straight across the front of the coat, and with a vertical opening strip
    // down the middle of them the render came out as a totem pole of blocks with a cross carved
    // in it. Only the *steps in width* are allowed to show, so the hem overlaps the body by two
    // thirds of its own height and the shoulders overlap the top of it.
    const o = { mode: 7, round: .018, gloss: .09, tag: '衣服' };
    const keep = (p, tone) => { if (seasonal) seasonal.push({ p, tone }); return p; };
    const yTop = y + 1.325 * s, len = .80 * s;                       // shoulder line to hem
    keep(A.put(a, b, .240 * s, .372 * s, len, yTop - len / 2, outfit, o), 'base');   // body
    keep(A.put(a, b, .252 * s, .408 * s, .26 * s, yTop - len + .085 * s, outfit, o),
      'base');                                                                       // hem, flared
    for (const k of [-1, 1])                                                        // sleeves
      keep(A.put(a, b + k * .190 * s, .112 * s, .078 * s, .54 * s,
        yTop - .30 * s, outfit, o), 'base');
    // The front opening: a narrow strip of the darker inside down the middle, which is the one
    // mark that says the coat is a coat and not a shell moulded round a torso.
    keep(A.put(a + .104 * s, b, .040 * s, .046 * s, .70 * s,
      yTop - .38 * s, dark(outfit), o), 'dark');
    A.put(a, b, .150 * s, .196 * s, .075 * s, yTop + .020 * s, pale(outfit),
      { ...o, round: .02 });                                                        // collar
  };

  // ---- side-wall double-hang bays ---------------------------------------------------------
  // The one thing the old fit did not have and every clothes shop does: rails at two heights on
  // the side walls, long garments above and short below, a stock shelf over the top of them and
  // a track of spots washing the lot. The wall is then merchandised from the skirting to head
  // height instead of carrying one rail marooned in the middle of it.
  //
  // Deliberately a post-and-rail system rather than a boarded panel: the shell's own lit graphic
  // sits on this wall at a 1.63..2.97, y 1.40..2.70, and a back would bury it. The posts stand at
  // a 1.45 and 3.56, outside it at both ends, the shelf goes above it at 2.80, and everything in
  // between is air.
  //
  // The two rail heights are not a taste decision: the bottom rail has to clear the hem of
  // everything above it, and the top rail has to be high enough that what hangs from it is a
  // garment rather than a cushion. At 1.72 over 0.98 with full-length drops the first render hung
  // the upper garments straight through the lower tube, which put a black bar across the middle of
  // every one of them; pulled back to 1.92 they cleared it but the drops left to fit were 0.46 —
  // a coat as tall as it is wide, which is a bolster. 2.02 over 0.90 takes drops of 0.58–0.74 on
  // top (hem at 1.07) and 0.40–0.52 below (hem at 0.17), and still leaves 15 cm of daylight
  // between the upper hems and the lower hangers.
  const A0 = 1.45, A1 = 3.56;
  const wallBay = (s, cs, hcTop, hcBot) => {
    const post = s * 4.86, rail = s * 4.62, mid = (A0 + A1) / 2, span = A1 - A0;
    for (const a of [A0, A1]) {
      A.put(a, post, .07, .09, 2.94, 1.47, c.steelD, { hard: true, gloss: .48, ...MET });
      A.put(a, post - s * .02, .13, .15, .05, .05, c.trim, { hard: true, gloss: .35 });   // foot
    }
    for (const y of [2.02, .90]) {
      A.cap(mid, rail, y, .026, span - .07, .026, c.steelD, { ...alongA, gloss: .55, ...MET });
      for (const a of [A0, A1])                                                      // bracket
        A.put(a, post - s * .195, .045, .30, .040, y + .035, c.steelD,
          { hard: true, gloss: .5, ...MET });
    }
    // The stock shelf over the bay, above the top of the shell's lightbox at 2.70. Boxes and
    // folded spares live up there in every shop that has ever run out of stockroom.
    A.put(mid, s * 4.73, span + .10, .38, .045, 2.80, c.oak, { hard: true, gloss: .22, ...TIM });
    A.put(mid, s * 4.905, span + .10, .04, .17, 2.885, c.trim, { hard: true, gloss: .3 });
    for (let i = 0; i < 4; i++) {
      const a = A0 + .30 + i * ((span - .60) / 3);
      if (i % 2) fold(a, s * 4.70, 2.8205, 3, cs[(i * 3 + 1) % cs.length], .26, .30);
      else {
        A.put(a, s * 4.70, .30, .34, .26, 2.955, i ? c.dust : c.stoneD,
          { hard: true, gloss: .12, tag: '服装店' });
        A.put(a, s * 4.70, .24, .28, .012, 3.092, c.card, { hard: true, gloss: .2, tag: '服装店' });
      }
    }
    // Track and three heads, at ceiling height and clear of both the shell's cove at 3.46 and its
    // downlight grid, which sits at b +/-4.20 with a 160 mm lens.
    A.put(mid, s * 4.05, span - .10, .07, .07, 3.30, c.trim, { hard: true, gloss: .35 });
    for (let i = 0; i < 3; i++) {
      const a = A0 + .34 + i * ((span - .68) / 2);
      A.put(a, s * 4.05, .10, .10, .12, 3.19, c.trim, { hard: true, gloss: .3 });
      A.put(a, s * 4.11, .105, .105, .05, 3.115, c.warm, { hard: true, mode: 1, glow: .28 });
    }
    // Eleven on the long rail, nine on the short one and two bare hangers at the quiet end of it.
    // A rail is packed: the thickness of one garment is the pitch of the next, and a rail with a
    // hand's width of daylight between every piece is a museum case rather than a shop.
    const n = 11, step = (span - .40) / (n - 1);
    const top = runs(cs, n, 0), bot = runs(cs, n, 3);
    for (let i = 0; i < n; i++) {
      const a = A0 + .20 + i * step, jit = (((i * 13) % 5) - 2) * .045;
      garment(a, rail, 2.02 - ((i * 5) % 3) * .012, .58 + ((i * 7) % 3) * .08, top[i],
        (i % 7 === 3) ? HANG.wire : hcTop, 'a', jit, (i % 4 === 1) ? 2 : (i % 3 === 0) ? 1 : 0);
      if (i < n - 2) garment(a, rail, .90 - ((i * 7) % 3) * .010, .40 + ((i * 5) % 3) * .06,
        bot[i], (i % 5 === 2) ? HANG.wire : hcBot, 'a', -jit * .8, (i % 3 === 2) ? 3 : 0);
      else spare(a, rail, .90, hcBot, 'a');
    }
    A.stop(A0 - .08, A1 + .08, s > 0 ? 4.32 : -4.96, s > 0 ? 4.96 : -4.32);
  };
  wallBay(-1, NEUTRAL, HANG.black, HANG.oak);
  wallBay(+1, COLOUR, HANG.wire, HANG.black);

  // ---- the clearance end of the neutral bay -------------------------------------------------
  // Every shop of this kind has one, and it is never a fixture of its own: it is the far end of a
  // wall run with a red card over it and the tickets changed. That is also the only way one fits
  // in here — the mid-floor line runs from wall to wall with 0.34 to 0.43 m of aisle in front of
  // it, so a free-standing rail would have to eat the circulation the whole plan is built on.
  //
  // The card hangs on the door-end post at a 3.56, facing +a, because that is the one direction a
  // glyph on this wall can face. It stands inside the bay's own collider (a 1.37..3.64) so it adds
  // nothing to walk round, and the three tags below it go on the lower rail where the marked-down
  // stock hangs. Ten props, and 打折 at the foot of this function is what they are for.
  {
    // a 3.48 and not 3.50: the post's own front face is at 3.525 and two coplanar faces z-fight,
    // so the card stands 2 cm proud of it. b -4.80 and 0.30 wide rather than -4.86 and 0.40, which
    // reached b -5.06 and put a corner of it through the side partition at 5.0.
    const pa = 3.48, pb = -4.80;
    A.put(pa, pb, .05, .30, .28, 1.46, C('#6d2620'), { hard: true, gloss: .2, tag: '服装店' });
    A.put(pa + .026, pb, .012, .26, .018, 1.335, c.goldL, { hard: true, mode: 1, glow: .10, tag: '服装店' });
    A.glyph(pa + .029, pb, 1.500, '清仓特价', { size: .050, gap: .015, color: c.cream, glow: .10 });
    // The tickets, on the short rail, where a reduced garment carries one.
    for (let i = 0; i < 3; i++) {
      A.put(1.90 + i * .70, -4.60, .012, .085, .060, .845, c.sale,
        { hard: true, gloss: .20, tag: '服装店' });
      A.cap(1.90 + i * .70, -4.60, .888, .003, .036, .003, c.steel, { gloss: .55, tag: '服装店' });
    }
  }

  // ---- fitting rooms and the mirror -------------------------------------------------------
  // One run of joinery across the back left: two curtained cubicles and a full-height mirror at
  // the end of them, which is where you stand when you come out of one.
  //
  // Built as a carcass with two holes in it, not as a solid block. The first version drew each
  // cubicle as one dark box a 0.22..1.38 and then put the bench at a 0.52, the hooks at a 0.34
  // and the light at a 0.60 — every one of them inside that block, so the fitting room the player
  // can see into contained nothing at all. Two divisions, a lining, a soffit and an open middle
  // costs four more boxes and is an actual room.
  //
  // 1.16 m deep rather than 1.32, which is small for a fitting room and right for this shop: the
  // aisle between this run and the mid-floor fixtures is the only circulation the back half has,
  // and every centimetre the joinery takes comes straight out of it.
  const CUB = [-4.165, -2.725], MIR = -1.36;
  const RUN0 = -4.90, RUN1 = -0.82, DEEP = 1.16, FRONT = 1.38;
  {
    const midRun = (RUN0 + RUN1) / 2, lenRun = RUN1 - RUN0;
    // The two ends and the two divisions between the three bays.
    for (const [b, w] of [[RUN0 + .06, .12], [-3.45, .20], [-2.00, .20]])
      A.put(.80, b, DEEP, w, 2.34, 1.17, c.woodD, { hard: true, gloss: .18, tag: '试衣间', ...TIM });
    // The lining behind the cubicles, and the soffit over them.
    A.put(.28, -3.45, .12, 2.90, 2.34, 1.17, c.cabin, { hard: true, gloss: .10, tag: '试衣间' });
    A.put(.80, -3.45, DEEP, 2.90, .14, 2.27, c.cabin, { hard: true, gloss: .10, tag: '试衣间' });
    // The mirror bay is solid joinery — there is nothing behind a mirror.
    A.put(.80, MIR, DEEP, 1.08, 2.34, 1.17, c.woodD, { hard: true, gloss: .18, tag: '镜子', ...TIM });
    A.put(.80, midRun, DEEP + .06, lenRun + .06, .09, 2.385, c.trim,
      { hard: true, gloss: .30, tag: '试衣间' });                                    // capping
    A.put(1.33, midRun, .10, lenRun, .15, .075, c.trim,
      { hard: true, gloss: .26, tag: '试衣间' });                                    // toe kick
  }
  // The only thing in this shop that moves, collected as it is built. See the motion block.
  const cubicleCurtain = [];
  CUB.forEach((b, i) => {
    // Inside: a bench, three hooks, a mirror on the back and a light in the soffit. All of it in
    // open air now, and all of it visible through the cubicle that is standing open.
    A.put(.52, b, .38, 1.04, .10, .455, c.fabric, { mode: 7, round: .035, tag: '试衣间', ...CLO });
    A.put(.52, b, .32, .96, .34, .19, c.woodD, { hard: true, gloss: .2, tag: '试衣间' });
    for (const k of [-.32, 0, .32])
      A.cap(.375, b + k, 1.56, .014, .09, .014, c.steel, { tag: '试衣间', gloss: .5 });
    A.put(.80, b, .34, .70, .035, 2.178, c.warm, { hard: true, mode: 1, glow: .26, tag: '试衣间' });
    A.put(.353, b, .012, .52, 1.34, 1.33, c.mirrorM, { hard: true, gloss: .52, tag: '试衣间' });
    A.put(.366, b, .010, .46, .40, 1.84, c.mirrorT, { hard: true, gloss: .52, tag: '试衣间' });
    // The curtain, on a track. The first cubicle is in use and drawn right across; the second
    // stands open with the curtain bunched to one side, which is what tells you at a glance that
    // one of them is free — and lets the lit inside of it show.
    A.cap(1.34, b, 2.14, .022, 1.32, .022, c.steelD, { ...alongB, gloss: .5, tag: '试衣间', ...MET });
    const CU = { mode: 7, round: .055, tag: '试衣间', ...CLO };
    if (i === 0) for (let k = 0; k < 7; k++) {
      const p = A.put(1.325 + (k % 2) * .022, b - .555 + k * .185, .11, .175, 1.98, 1.115,
        k % 2 ? c.curtain : c.curtainD, CU);
      // Three of the seven move — see the motion block. Not seven, and the reason is measured
      // rather than assumed: `Build.finish` keys a batch on `(p.dynamic ? 'dynamic|' : 'static|')`
      // plus mesh and material (js/build.js:318), so world-space movers form their own batch and
      // three panels of one mesh and one material are ONE extra draw call, not three. What they do
      // cost per frame is a `dynamicCulls` entry each, refreshed while the batch is on screen. Three
      // is the number that reads: a curtain that stirs in the middle and hangs still at its edges is
      // what a curtain with somebody behind it looks like, and the four still panels stay in the
      // static batch they were already in.
      if (k >= 2 && k <= 4) {
        A.dynamic(p, 1.325 + (k % 2) * .022, b - .555 + k * .185, 1.115, .34);
        cubicleCurtain.push({ p, a: 1.325 + (k % 2) * .022, b: b - .555 + k * .185, k });
      }
    }
    else for (let k = 0; k < 4; k++)
      A.put(1.325 + (k % 2) * .026, b - .585 + k * .105, .155, .125, 1.98, 1.115,
        k % 2 ? c.curtain : c.curtainD, CU);
  });
  // The mirror, recessed into the end of the same run so it reads as one piece of joinery.
  //
  // A mirror this renderer cannot reflect through has to be *read* as one, and there are three
  // wrong ways to reach for it, all of which this shop has now been through. White is the first:
  // a pale, glossy, half-transparent panel picks up the glass sheen and comes out as a lit fog
  // panel with the ambient occlusion blotching across it. Two translucent panels layered up is
  // the second, and that came out as a venetian blind. The third is subtler and was what the
  // render before this one showed: opaque and banded, but *paler than the room around it*, with
  // a bright lamp down each edge — a bright rectangle in a dark surround is a window, and it read
  // as one, complete with a horizon across the middle of it.
  //
  // So: opaque, banded ceiling / room / floor the way a mirror in a room actually is, every band
  // a couple of steps darker than the surface it stands for, moderate gloss rather than a chrome
  // sheen, and the edge lamps dimmed to a hairline. Darker than its own frame is the whole trick.
  // The bands have to *abut*, not overlap. The pass before this one had the middle band running
  // 0.74..1.76 and the top one 1.56..2.10 at the same depth, so 20 cm of the two of them fought
  // for the same pixels and the whole panel resolved to one flat grey — a blank dark screen in a
  // timber surround. Set edge to edge they read as three things, which is what a mirror is.
  A.put(1.34, MIR, .06, 1.16, 2.08, 1.15, c.woodD, { hard: true, gloss: .3, tag: '镜子', ...TIM });
  A.put(1.362, MIR, .012, 1.06, 1.98, 1.15, c.trim, { hard: true, gloss: .45, tag: '镜子' });
  A.put(1.375, MIR, .012, .98, .52, 1.87, c.mirrorT, { hard: true, gloss: .52, tag: '镜子' });
  A.put(1.375, MIR, .012, .98, .98, 1.12, c.mirrorM, { hard: true, gloss: .52, tag: '镜子' });
  A.put(1.375, MIR, .012, .98, .46, .40, c.mirrorB, { hard: true, gloss: .52, tag: '镜子' });
  // And two things in it: the cove over the fitting rooms coming back off the top of the glass,
  // and the dark column of whoever is standing in front of it. Between them they are the whole
  // difference between a panel that is grey and a panel that is showing you something.
  A.put(1.382, MIR, .008, .90, .030, 2.05, c.warm, { hard: true, mode: 1, glow: .10, tag: '镜子' });
  A.put(1.381, MIR + .06, .006, .30, 1.34, 1.06, C('#42403c'), { hard: true, gloss: .3, tag: '镜子' });
  for (const s of [-1, 1])
    A.put(1.372, MIR + s * .545, .018, .022, 1.86, 1.18, c.warm,
      { hard: true, mode: 1, glow: .16, tag: '镜子' });
  // The header band, carrying both cubicle numbers and the sign, on the face you can read.
  A.put(1.36, -2.86, .06, 4.08, .30, 2.18, C('#6d2620'), { hard: true, gloss: .26, tag: '试衣间' });
  A.put(1.395, -2.86, .015, 4.00, .020, 2.015, c.goldL, { hard: true, mode: 1, glow: .12, tag: '试衣间' });
  CUB.forEach((b, i) => A.glyph(1.396, b, 2.18, String(i + 1),
    { size: .14, color: c.goldL, glow: .16, tag: '试衣间' }));
  A.glyph(1.396, MIR, 2.18, '试衣间', { size: .125, gap: .042, color: c.cream, glow: .12, tag: '试衣间' });
  // Five static retained parts make the occupancy legible without animation or text: cubicle one
  // carries a red double bar (occupied), cubicle two a green upright (free).  Shape carries the
  // distinction if colour does not, and neither indicator pulses or rewrites under reduced motion.
  for (const b of CUB)
    A.put(1.407, b, .018, .31, .15, 1.925, c.trim,
      { hard: true, gloss: .30, tag: '试衣间' });
  for (const y of [1.895, 1.955])
    A.put(1.419, CUB[0], .012, .16, .026, y, c.occupied,
      { hard: true, mode: 1, glow: .13, tag: '试衣间' });
  A.put(1.419, CUB[1], .012, .045, .105, 1.925, c.free,
    { hard: true, mode: 1, glow: .13, tag: '试衣间' });
  // ---- the size and colour board, on the division between cubicle two and the mirror ----------
  // The one thing a fitting room always has beside it and this one did not: the chart you point at
  // when the assistant asks 您穿多大号. Six boxes and two glyph runs, hung on joinery that already
  // exists, so it adds no collider and no fixture — the division at b -2.00 is 0.20 m of carcass
  // whose door-facing face at a 1.38 was blank.
  //
  // It has to go on a face that points at the door. `A.glyph` can only be turned to the shop's own
  // yaw or its opposite (js/mall.js, the api's `glyph`), which on this west-wall unit means +a or
  // -a and nothing else — a chart on the side of a cubicle would be drawn edge-on and read as a
  // line. That single fact decides where every sign in this shop is, and it is why the size run is
  // on the division's front rather than inside the cubicle where you would want it.
  {
    const sa = 1.40, sb = -2.00;
    A.put(sa, sb, .04, .17, .58, 1.52, c.card, { hard: true, gloss: .18, tag: '试衣间' });
    A.put(sa + .021, sb, .012, .155, .022, 1.775, C('#6d2620'), { hard: true, gloss: .2, tag: '试衣间' });
    A.glyph(sa + .024, sb, 1.772, '尺码', { size: .046, gap: .014, color: c.cream, glow: 0 });
    ['S', 'M', 'L', 'XL'].forEach((n, i) =>
      A.glyph(sa + .024, sb, 1.660 - i * .085, n, { size: .050, color: c.trim, glow: 0 }));
    // And the colour story the rails are merchandised on, as four chips under it: the four are the
    // shop's own palette, so what is on the board is what is actually on the wall behind you.
    [NEUTRAL[0], NEUTRAL[4], COLOUR[1], COLOUR[5]].forEach((cc, i) =>
      A.put(sa + .022, sb - .050 + i * .034, .010, .028, .046, 1.310, cc,
        { hard: true, gloss: .22, tag: '试衣间' }));
  }
  A.stop(.18, FRONT + .06, RUN0, RUN1);

  // ---- the feature plinth, back centre ----------------------------------------------------
  // The slatted panel with 悦己时装 on it is the best surface in the unit and the plan leaves the
  // centre line open all the way to it, so something has to stand at the end of that view or the
  // shop's best sightline ends on an empty floor. One dressed form on a low plinth, under the
  // shop's own name, with two stacks of stock beside it: the picture a clothes shop puts in its
  // own doorway.
  A.put(.95, .55, .90, 1.10, .28, .14, c.woodD, { hard: true, gloss: .22, tag: '服装店', ...TIM });
  A.put(.95, .55, .94, 1.14, .045, .30, c.stone, { hard: true, gloss: .38, tag: '服装店', ...STN });
  form(.92, .72, .3225, c.cream, initialStory.hero, 1, seasonalHero);
  fold(1.10, .12, .3205, 4, NEUTRAL[1], .26, .30);
  ticket(1.36, .05, .58, '¥459');
  // One season-coloured card, still carrying the shop's invented 悦己 identity.  Its rounded
  // mode-7 box deliberately matches the outfit and scarf key; the two glyphs join the glyph batch
  // the shop already has, so MV-117 adds three props but only one dynamic draw signature.
  const seasonCard = A.put(1.432, .55, .018, .38, .22, .61, initialStory.card,
    { mode: 7, round: .018, gloss: .16, tag: '季节' });
  A.glyph(1.444, .55, .622, '悦己',
    { size: .072, gap: .022, color: c.cream, glow: 0, tag: '季节' });
  seasonalVisuals.push({ p: seasonCard, tone: 'card' });
  A.stop(.50, 1.42, -.02, 1.12);

  // ---- the cash desk, and the back of house ------------------------------------------------
  // Back right, under the shell's own framed graphic, which then works as the backdrop every
  // till point has. `counter` hangs its 收银台 sign a hand's width behind the desk at y 1.16 —
  // above the 0.98 top, so it clears the body, but in mid-air unless something is put behind it.
  // So there is: a signboard across the bottom of the graphic, which is what a till point has.
  //
  // The counter is built with `counter`'s own till suppressed and the till written out here
  // instead. Not for the furniture — the screen and the card reader are the same two boxes
  // either way — but for the label. `counter` anchors 收银台 at a + dp/2 + .85 and puts the
  // approach circle a further 1.15 out, which for a desk at a 1.05 lands it at a 3.49: in this
  // shop that is a 35 cm slot between a display table and the raised window platform, and a
  // customer who cannot stand somewhere cannot pay there. Written here the word hangs over the
  // front edge of the desk and the circle sits in the cross aisle, where the queue actually is.
  A.put(.545, 3.35, .06, 1.70, .26, 1.155, c.walnut, { hard: true, gloss: .22, tag: '收银台', ...TIM });
  A.put(.578, 3.35, .012, 1.62, .018, 1.028, c.goldL, { hard: true, mode: 1, glow: .10, tag: '收银台' });
  A.counter(1.05, 3.35, 2.40, .88, c.walnut, false);
  A.glyph(.58, 3.35, 1.16, '收银台', { size: .13, gap: .04, color: c.goldL, glow: .12, tag: '收银台' });
  // A monitor on the staff side, the card reader out on the customer edge of the top where a hand
  // can reach it, and the dish of small change every counter in the country keeps beside it.
  A.put(.93, 3.66, .30, .42, .26, 1.11, c.trim, { hard: true, gloss: .35, tag: '收银台' });
  const tillScreen=A.put(.93, 3.66, .04, .34, .20, 1.24, c.cabin,
    { hard: true, mode: 1, glow: .16, tag: '收银台' });
  A.put(1.30, 3.02, .22, .30, .10, 1.03, c.steel, { hard: true, gloss: .5, tag: '收银台', ...MET });
  const readerScreen=A.put(1.30, 3.02, .12, .17, .014, 1.087, c.cabin,
    { hard: true, gloss: .35, tag: '收银台' });
  if(A.powerDisplay)A.powerDisplay([tillScreen,readerScreen],{id:'till'});
  A.cyl(1.24, 3.52, 1.005, .072, .05, c.stoneD, { gloss: .30, tag: '收银台' });
  A.cyl(1.24, 3.52, 1.028, .050, .012, c.goldL, { gloss: .55, tag: '收银台' });
  // A folded-shirt pyramid at the quiet end of the desk, where a shop puts the thing it wants in
  // your hands while you are already paying.
  fold(1.05, 4.28, .983, 3, NEUTRAL[0], .26, .30);
  fold(1.05, 4.28, 1.070, 2, COLOUR[1], .21, .25);

  // ---- back of house ------------------------------------------------------------------------
  // The edge every real shop has and no game shop ever does: the door the stock comes through.
  // It goes in the one piece of back wall the shell leaves free — between the slatted feature
  // panel, which ends at b 2.10, and the framed graphic, which starts at b 3.22 — so it needs no
  // negotiation with either. Behind the counter, so it is staff-side, and 2.16 m tall against a
  // 0.98 m counter top, which means what the customer sees of it is the top metre and the sign.
  //
  // The skirting's front face is at a 0.27 and coplanar faces z-fight, so the frame starts at
  // 0.30 rather than sitting on it.
  A.put(.35, 2.66, .10, 1.08, 2.16, 1.08, c.walnut, { hard: true, gloss: .20, tag: '员工', ...TIM });
  A.put(.395, 2.66, .02, .92, 2.02, 1.01, c.cabin, { hard: true, gloss: .06, tag: '员工' });
  // The strip curtain in the opening. Bunched, not even: a doorway somebody has just walked
  // through has a gap in the strips and the two beside it swung out of line.
  //
  // Opaque, though a real PVC strip is not. build.js keeps anything with alpha < 0.999 out of the
  // instanced path entirely, because batching reorders drawing and transparency is the one thing
  // in this renderer that depends on order — so seven translucent strips are seven draw calls and
  // seven opaque ones are one. Against a black recess there is nothing to see through them anyway.
  for (let k = 0; k < 8; k++) {
    if (k === 4) continue;
    const off = (k === 3 ? -.030 : k === 5 ? .034 : 0);
    A.put(.412 + (k % 2) * .010, 2.66 - .385 + k * .110 + off, .012, .098, 1.96, 1.00,
      k % 2 ? C('#c9c3b4') : C('#b8b2a3'), { mode: 7, round: .006, tag: '员工' });
  }
  A.put(.425, 2.66, .015, .52, .14, 2.26, c.trim, { hard: true, gloss: .30, tag: '员工' });
  A.glyph(.436, 2.66, 2.26, '员工通道', { size: .072, gap: .022, color: c.goldL, glow: .10, tag: '员工' });
  // The stockroom shelf over the door, and what is always on it: cartons that came in this
  // morning and the folded overstock nobody has put out yet.
  A.put(.45, 2.66, .30, 1.24, .045, 2.44, c.oak, { hard: true, gloss: .22, tag: '员工', ...TIM });
  for (let i = 0; i < 3; i++) {
    const b = 2.66 - .40 + i * .40;
    if (i === 1) fold(.45, b, 2.4625, 3, NEUTRAL[3], .24, .28);
    else {
      A.put(.45, b, .26, .32, .24, 2.585, i ? c.dust : c.stoneD,
        { hard: true, gloss: .12, tag: '员工' });
      A.put(.45, b, .21, .26, .012, 2.711, c.card, { hard: true, gloss: .2, tag: '员工' });
    }
  }
  // Delivery still on the floor at the far end of the staff side, behind the desk.
  for (let i = 0; i < 3; i++) {
    const ba = .40 + (i === 2 ? .02 : 0), bb = 4.24 + (i % 2) * .04;
    A.put(ba, bb, .34, .40, .30, i === 2 ? .46 : .15, i === 1 ? c.dust : c.stoneD,
      { hard: true, gloss: .12, tag: '员工', ry: (i - 1) * .06 });
    A.put(ba, bb, .28, .34, .012, (i === 2 ? .46 : .15) + .156, c.card,
      { hard: true, gloss: .2, tag: '员工', ry: (i - 1) * .06 });
  }
  // What sits on it and beside it: a bag stand, wrapping tissue, a ribbon spool and a scan-to-pay
  // card. A desk with nothing but a screen on it is a desk nobody has ever worked at.
  A.put(1.40, 4.26, .05, .26, .24, 1.10, c.card, { hard: true, gloss: .2, tag: '收银台' });
  A.put(1.40, 4.26, .07, .06, .30, .965, c.steelD, { hard: true, gloss: .45, tag: '收银台' });
  A.glyph(1.428, 4.26, 1.115, '扫码', { size: .075, gap: .024, color: c.trim, glow: 0, tag: '收银台' });
  A.put(1.20, 2.42, .24, .32, .085, 1.022, c.cream, { mode: 7, round: .015, tag: '收银台' });  // tissue
  A.put(1.20, 2.42, .22, .28, .035, 1.082, c.dust, { mode: 7, round: .015, tag: '收银台' });
  A.cyl(1.16, 2.86, 1.045, .065, .11, C('#7f4a3c'), { gloss: .3, tag: '收银台' });   // ribbon spool
  A.cyl(1.16, 2.86, 1.045, .022, .13, c.steelD, { gloss: .55, tag: '收银台' });
  // Paper carrier bags in a low trolley at the end of the desk — the thing the shop hands you.
  A.put(1.00, 1.78, .46, .54, .13, .095, c.trim, { hard: true, gloss: .3 });
  A.put(1.00, 1.78, .40, .48, .42, .38, c.walnut, { hard: true, gloss: .22, ...TIM });
  for (let i = 0; i < 4; i++) {
    const ba = 1.00 - .045 + (i % 2) * .09, bb = 1.78 - .165 + i * .11, ry = ((i * 5) % 3 - 1) * .05;
    const bag = i % 2 ? c.cream : C('#8e4038');
    A.put(ba, bb, .225, .072, .36, .765, bag, { mode: 7, round: .012, tag: '购物袋', ry });
    A.put(ba - .002, bb, .215, .078, .06, .885, pale(bag), { mode: 7, round: .012, tag: '购物袋', ry });
    for (const k of [-1, 1])
      A.cap(ba + k * .052, bb, .985, ...R3(.008, .11, .008), c.cream, { tag: '购物袋', ry });
  }
  A.stop(.74, 1.28, 1.48, 2.08);

  // ---- the mid-floor line ------------------------------------------------------------------
  // Everything from here to the window stands on one line at a 3.03, and that number is the whole
  // circulation plan rather than a taste decision.
  //
  // The back half of this unit is joinery — fitting rooms across the left, the feature plinth in
  // the middle, the cash desk across the right — and none of it can be reached except along one
  // cross aisle running the width of the shop in front of it. The joinery's front faces are at
  // a 1.44 (fitting rooms) and a 1.49 (counter), so with a body radius of 0.30 that aisle only
  // exists between a 1.79 and whatever the mid-floor fixtures put in its way. At a 2.72, where
  // these fixtures used to stand, the deepest of them reached back to 2.14 and left 35 cm of
  // walkable aisle at the counter and 10 cm beside the fitting rooms — which is why the mirror's
  // approach circle was inside the folding island and the till's was in a slot by the window.
  // Moved out to 3.03 the same fixtures leave 0.34–0.43 m of free centre-line the whole way
  // across, and the front of the line lands at 3.55 against the shell's window platform at 3.655.
  //
  // Across b the line is continuous from the left wall to the right, broken once: the entry, at
  // b -0.53..1.44, on the sightline from the threshold to the shop's own name on the back wall.
  // A clothes shop is a wall of stock with one way through it, not four islands in a field.
  //
  //   -3.94  round table    围巾 scarves and accessories
  //   -2.90  trouser table  裤子, folded above and hung below
  //   -1.48  folding island 毛衣 knitwear
  //    ENTRY
  //    1.98  four-way       裙子 on two arms, 衬衫 on the other two
  //    3.28  long-hang rail 大衣, the one fixture in here with full-length drops on it
  const MIDA = 3.03;

  // ---- the folding island -----------------------------------------------------------------
  // Stacks of knitwear, in a proper grid with the colour story running across it rather than one
  // stack per corner, and a riser down the middle so the whole thing is not one flat plane.
  //
  // Built here rather than through `A.island`, for one reason: the shell's island wears MAT.slab
  // on its top, which is the shop-floor stone at a 0.72 m repeat. Underfoot that is right; on a
  // 1.9 m display top it is a mosaic of cobbles the size of a hand, and it was the only surface
  // in this shop you could not look at. Everything else about it is the shell's island — the same
  // three pieces, the same heights, the same recessed black plinth.
  const ISL = { a: MIDA, b: -1.48, w: 1.90, dp: .95 };
  A.put(ISL.a, ISL.b, ISL.dp, ISL.w, .72, .51, c.wood, { hard: true, gloss: .24, ...TIM });
  A.put(ISL.a, ISL.b, ISL.dp - .12, ISL.w - .14, .14, .09, c.trim, { hard: true, gloss: .3 });
  A.put(ISL.a, ISL.b, ISL.dp + .08, ISL.w + .10, .07, .88, c.stone,
    { hard: true, gloss: .40, ...STN });                                     // top, surface .915
  A.put(ISL.a, ISL.b, .40, .74, .155, .9925, c.stoneD, { hard: true, gloss: .36, ...STN });
  A.stop(ISL.a - ISL.dp / 2, ISL.a + ISL.dp / 2, ISL.b - ISL.w / 2, ISL.b + ISL.w / 2);
  {
    const y = .913;                              // a fold lifts its bottom leaf 15 mm off this
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) {
      const a0 = ISL.a + (k - .5) * .36, b0 = ISL.b - .70 + i * .465;
      const cc = [NEUTRAL[0], NEUTRAL[0], COLOUR[1], COLOUR[1],
                  NEUTRAL[4], NEUTRAL[4], COLOUR[5], COLOUR[5]][(i * 2 + k) % 8];
      if (Math.abs(b0 - ISL.b) < .30) continue;  // the riser stands here
      fold(a0, b0, y, 3 + ((i + k) % 3), cc, .28, .34);
    }
    fold(ISL.a - .09, ISL.b - .16, 1.068, 5, NEUTRAL[2], .25, .27);
    fold(ISL.a - .09, ISL.b + .17, 1.068, 4, COLOUR[0], .25, .27);
    fold(ISL.a + .13, ISL.b, 1.068, 3, NEUTRAL[6], .25, .30);
    ticket(ISL.a + .49, ISL.b - .66, 1.035, '¥199');
    ticket(ISL.a + .49, ISL.b + .64, 1.035, '¥259');
  }

  // ---- a four-way rack --------------------------------------------------------------------
  // Four arms at four heights off one post: the fixture that fills the middle of a shop floor
  // and shows the front of a garment instead of its shoulder. Stepping the arm heights is what
  // stops it reading as a square hedge.
  //
  // Two arms carry skirts and two carry shirts, because a four-way in a real shop is a coordinate
  // — the outfit, not one style four times — and because 裙子 and 衬衫 are both things this shop
  // sells and neither had anything standing for it anywhere in the room.
  const fourway = (a0, b0, cs, hc, kind) => {
    A.put(a0, b0, .92, .09, .055, .035, c.trim, { hard: true, gloss: .35 });
    A.put(a0, b0, .09, .92, .055, .035, c.trim, { hard: true, gloss: .35 });
    A.cyl(a0, b0, .84, .042, 1.58, c.steelD, { gloss: .5, ...MET });
    [['a', +1, 1.50], ['b', -1, 1.38], ['a', -1, 1.26], ['b', +1, 1.44]].forEach(([ax, dir, ay], k) => {
      const da = ax === 'a' ? dir : 0, db = ax === 'b' ? dir : 0;
      A.cap(a0 + da * .29, b0 + db * .29, ay, .018, .56, .018, c.steelD,
        { ...(ax === 'a' ? alongA : alongB), gloss: .55, ...MET });
      A.cap(a0 + da * .565, b0 + db * .565, ay + .045, .015, .09, .015, c.steelD, { gloss: .5 });
      // One style per arm, in one colour, which is what a promotional four-way actually carries.
      const cc = cs[(k * 3 + 1) % cs.length];
      const skirtArm = kind && (k === 1 || k === 3);
      for (let i = 0; i < 3; i++) {
        const t = .16 + i * .165;
        if (skirtArm)
          skirt(a0 + da * t, b0 + db * t, ay, .46 + ((i + k) % 3) * .05,
            cc, i === 2 ? HANG.wire : hc, ax);
        else
          garment(a0 + da * t, b0 + db * t, ay, .52 + ((i + k) % 3) * .06,
            cc, i === 2 ? HANG.wire : hc, ax, (((i + k) % 3) - 1) * .05, 0);
      }
    });
    A.put(a0, b0, .05, .30, .16, 1.70, c.card, { hard: true, gloss: .18, tag: '价格' });
    A.glyph(a0 + .030, b0, 1.705, '¥299', { size: .056, gap: .014, color: c.sale, glow: 0 });
    A.stop(a0 - .46, a0 + .46, b0 - .46, b0 + .46);
  };
  fourway(MIDA, 1.98, COLOUR, HANG.oak, true);

  // ---- the accessory table ------------------------------------------------------------------
  // Folded stock at two heights with a bust form on top, and a tier of scarves round the lower
  // deck. Discs are kept 50–90 mm thick — a very thin cyl skews its own normals and shades as if
  // the top face pointed sideways.
  const round = (a0, b0, cs, price, scarves, seasonal = null) => {
    A.cyl(a0, b0, .27, .50, .54, c.woodD, { gloss: .22, tag: '服装店', ...TIM });
    A.cyl(a0, b0, .565, .555, .07, c.stone, { gloss: .40, tag: '服装店', ...STN });
    A.cyl(a0, b0, .755, .265, .31, c.woodD, { gloss: .22, tag: '服装店', ...TIM });
    A.cyl(a0, b0, .945, .315, .07, c.stone, { gloss: .40, tag: '服装店', ...STN });
    for (let i = 0; i < 4; i++) {
      const th = i * Math.PI / 2 + .78;
      const ta = a0 + Math.cos(th) * .335, tb = b0 + Math.sin(th) * .335;
      if (scarves && i % 2) scarf(ta, tb, .598, cs[i], Math.abs(Math.cos(th)) > .5 ? 'a' : 'b',
        1, seasonal && i === 1 ? seasonal : null);
      else fold(ta, tb, .598, 3 + (i % 2), cs[i], .25, .28);
    }
    fold(a0 - .11, b0 - .02, .978, 3, cs[0], .21, .24);
    form(a0 + .13, b0 + .01, .98, c.cream, cs[3], .46);
    ticket(a0 + .40, b0 - .30, .74, price);
    A.stop(a0 - .56, a0 + .56, b0 - .56, b0 + .56);
  };
  round(MIDA, -3.94, [NEUTRAL[1], initialStory.accessory, NEUTRAL[4], COLOUR[2]],
    '¥68', true, seasonalAccessories);

  // ---- the scarf tree ------------------------------------------------------------------------
  // 围巾 is the cheapest thing the shop sells and the one it wants in your hand on the way past,
  // so it gets its own stand at the end of the accessory table as well as a tier on it.
  {
    const a0 = MIDA - .06, b0 = -3.94;
    A.cyl(a0, b0 + .40, .04, .20, .08, c.trim, { gloss: .35, tag: '服装店' });
    A.cyl(a0, b0 + .40, .62, .022, 1.10, c.steelD, { gloss: .5, tag: '服装店', ...MET });
    for (let i = 0; i < 4; i++) {
      const y = .70 + i * .13, r = .155 - i * .020, ax = i % 2 ? 'a' : 'b', dir = i < 2 ? 1 : -1;
      const da = ax === 'a' ? dir * r : 0, db = ax === 'b' ? dir * r : 0;
      A.cap(a0 + da * .5, b0 + .40 + db * .5, y, .014, r, .014, c.steelD,
        { ...(ax === 'a' ? alongA : alongB), gloss: .5, tag: '服装店' });
      scarf(a0 + da, b0 + .40 + db, y - .075,
        [COLOUR[0], NEUTRAL[2], COLOUR[3], NEUTRAL[5]][i], ax, .72);
    }
  }

  // ---- the trouser table ---------------------------------------------------------------------
  // Folded above and hung below, which is how every shop on earth merchandises trousers: the
  // stack on the top says the colour, the pairs on the clip rail underneath say the length. And
  // it is the one fixture in the shop that is not a rail or a round table, which the mid-floor
  // line needs or it reads as four of the same thing in a row.
  {
    const a0 = MIDA, b0 = -2.90, w = .92, dp = 1.00;
    A.put(a0, b0, dp, w, .17, .105, c.trim, { hard: true, gloss: .30 });                 // plinth
    for (const s of [-1, 1]) for (const t of [-1, 1])
      A.put(a0 + s * (dp / 2 - .10), b0 + t * (w / 2 - .09), .07, .07, .74, .56,
        c.steelD, { hard: true, gloss: .48, ...MET });                                   // legs
    A.put(a0, b0, dp - .06, w - .06, .045, .625, c.woodD,
      { hard: true, gloss: .22, tag: '服装店', ...TIM });                                 // low shelf
    A.put(a0, b0, dp + .06, w + .06, .07, .945, c.stone,
      { hard: true, gloss: .40, tag: '服装店', ...STN });                                 // top
    A.stop(a0 - dp / 2 - .03, a0 + dp / 2 + .03, b0 - w / 2 - .03, b0 + w / 2 + .03);
    // Folded on top, in two rows of two, with the colour story running across rather than round.
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++)
      fold(a0 + (k - .5) * .40, b0 + (i - .5) * .42, .978,
        3 + ((i + k) % 3), [NEUTRAL[3], NEUTRAL[6], COLOUR[4], NEUTRAL[7]][i * 2 + k], .30, .34);
    tent(a0 + .40, b0 + .42, .983, '¥130');
    // The clip rail under the top, running along b, four pairs on it.
    A.cap(a0, b0, .84, .020, w - .14, .020, c.steelD,
      { ...alongB, gloss: .55, tag: '服装店', ...MET });
    for (let i = 0; i < 4; i++)
      trouser(a0, b0 - .30 + i * .20, .84, .40 + (i % 2) * .05,
        [COLOUR[4], NEUTRAL[7], COLOUR[6], NEUTRAL[3]][i], i % 3 === 1 ? HANG.wire : HANG.black, 'b');
  }

  // ---- the long-hang rail ---------------------------------------------------------------------
  // 大衣 is the most expensive thing in the shop at ¥420 and there was nowhere in the room a coat
  // that length could hang: the wall bays are double-hung, so nothing on them can drop more than
  // 0.74 without going through the rail below it. One free-standing single rail at head height,
  // with 1.05 m drops on it, and it is the only block of full-length garments in the unit — which
  // is exactly what a coat rail looks like on a shop floor.
  {
    const a0 = MIDA, b0 = 3.28, half = .53;
    for (const s of [-1, 1]) {
      A.put(a0, b0 + s * half, .46, .09, .05, .03, c.trim, { hard: true, gloss: .35 });
      A.cyl(a0, b0 + s * half, .90, .032, 1.78, c.steelD, { gloss: .5, ...MET });
      A.put(a0, b0 + s * half, .10, .10, .045, 1.80, c.steelD, { hard: true, gloss: .5, ...MET });
    }
    A.cap(a0, b0, 1.79, .026, half * 2 - .04, .026, c.steelD,
      { ...alongB, gloss: .55, tag: '服装店', ...MET });
    const cs = [COLOUR[6], COLOUR[6], NEUTRAL[4], NEUTRAL[4], NEUTRAL[3],
                COLOUR[2], COLOUR[2], NEUTRAL[7]];
    for (let i = 0; i < 8; i++)
      garment(a0, b0 - .42 + i * .12, 1.79 - ((i * 5) % 3) * .010, 1.02 + ((i * 7) % 3) * .06,
        cs[i], (i % 5 === 3) ? HANG.wire : HANG.black, 'b', (((i * 13) % 5) - 2) * .04, 2);
    A.put(a0 + .30, b0, .04, .34, .18, 1.94, c.card, { hard: true, gloss: .18, tag: '价格' });
    A.glyph(a0 + .322, b0, 1.955, '¥420', { size: .062, gap: .016, color: c.sale, glow: 0 });
    A.stop(a0 - .53, a0 + .53, b0 - half - .06, b0 + half + .06);
  }

  // ---- dress forms either side of the way in ----------------------------------------------
  // Standing just inside the opening, on low plinths, so the shop has a face from the concourse
  // as well as from the window and the threshold has something to walk between. Set inside the
  // 3 m door gap, which leaves 1.5 m of clear floor to walk in through, and pulled back to a 3.40
  // so the plinths clear the shell's raised window platform, which begins at a 3.655.
  for (const s of [-1, 1]) {
    const b = s * 1.42;
    A.cyl(3.40, b, .085, .34, .17, c.woodD, { gloss: .26, tag: '服装店', ...TIM });
    A.cyl(3.40, b, .185, .355, .04, c.trim, { gloss: .4, tag: '服装店' });
    form(3.40, b, .205, c.cream, s < 0 ? NEUTRAL[1] : COLOUR[0]);
    ticket(3.58, b + s * .24, .40, s < 0 ? '¥499' : '¥399');
    A.stop(3.02, 3.78, b - .38, b + .38);
  }

  // ---- a hanging banner over the aisle ----------------------------------------------------
  // Signage a shop actually has: something above head height with this season's line on it, hung
  // on two drop wires off the ceiling, facing the door. Centred on the open aisle rather than on
  // a fixture, so it is the first thing read on the way in and the last on the way out.
  for (const s of [-1, 1]) A.cap(2.62, .58 + s * .82, 3.26, .008, .56, .008, c.steelD, { gloss: .5 });
  A.put(2.62, .58, .035, 1.94, .42, 2.77, C('#6d2620'), { hard: true, gloss: .2, tag: '服装店' });
  A.put(2.640, .58, .015, 1.86, .018, 2.60, c.goldL, { hard: true, mode: 1, glow: .10, tag: '服装店' });
  A.glyph(2.642, .58, 2.81, '本季新品', { size: .155, gap: .05, color: c.cream, glow: .14, tag: '服装店' });

  // ---- the returns rail, back wall ---------------------------------------------------------
  // Between the end of the fitting-room run at b -0.82 and the feature plinth at b -0.02 there
  // is 0.80 m of back wall the old fit left bare — the one blank patch in the room, and the one
  // place a shop with two fitting rooms in front of it always puts the same thing: the rail
  // everything that came back out of them hangs on until somebody re-sizes it. It is under the
  // shop's own name on the slatted panel, so the rail is kept to 1.52 and the garments to 1.42
  // and the lettering at 1.95 stays clear above them.
  {
    const a0 = .92, b0 = -.42;
    for (const s of [-1, 1]) {
      A.cyl(a0, b0 + s * .34, .60, .026, 1.20, c.steelD, { gloss: .5, tag: '服装店', ...MET });
      A.cyl(a0, b0 + s * .34, .035, .075, .07, c.trim, { gloss: .4, tag: '服装店' });
      A.cyl(a0, b0 + s * .34, .035, .05, .05, c.steelD, { gloss: .55, tag: '服装店' });
    }
    A.cap(a0, b0, 1.20, .022, .70, .022, c.steelD, { ...alongB, gloss: .55, tag: '服装店', ...MET });
    const cs = [NEUTRAL[2], COLOUR[3], COLOUR[3], NEUTRAL[5], NEUTRAL[0]];
    for (let i = 0; i < 5; i++)
      garment(a0, b0 - .26 + i * .13, 1.20 - ((i * 7) % 3) * .012, .50 + ((i * 5) % 3) * .07,
        cs[i], i % 2 ? HANG.wire : HANG.black, 'b', (((i * 11) % 5) - 2) * .05, i % 3);
    A.put(a0 - .02, b0, .05, .26, .11, 1.46, c.card, { hard: true, gloss: .18, tag: '服装店' });
    A.glyph(a0 + .006, b0, 1.462, '待整理', { size: .052, gap: .016, color: c.trim, glow: 0 });
    // ---- and what the rail is really for: the alterations bench --------------------------------
    // A returns rail is where the exchanges land, and in a Chinese clothes shop the same square
    // metre takes the hems: 改裤长 is free with the trousers and two days without them. So the
    // rail gets the tools of that trade under it — a tape measure coiled on a shelf, a pin
    // cushion, a stick of tailor's chalk and a pair of shears — and a second card under the
    // 待整理 one saying what the corner does. Nine props inside the rail's own collider, so it
    // adds no fixture and no approach of its own.
    //
    // The shelf top is 0.437, and that number is set by what hangs over it rather than by what
    // stands on it. The five garments on this rail hang from y 1.20 with drops of 0.50 to 0.64, so
    // their hems are at 0.56 at the lowest — a shelf at working height would have gone straight
    // through them, which is the shape of mistake a plan view never shows.
    A.put(a0 + .04, b0, .30, .74, .030, .422, c.woodD, { hard: true, gloss: .22, tag: '服装店', ...TIM });
    A.cyl(a0 + .02, b0 - .24, .452, .055, .022, c.cream, { gloss: .30, tag: '服装店' });
    A.cyl(a0 + .02, b0 - .24, .464, .020, .014, c.goldL, { gloss: .55, tag: '服装店' });
    A.ball(a0 + .04, b0 - .04, .466, .048, .034, .048, COLOUR[0],
      { gloss: .14, tag: '服装店', ...CLO });
    for (let k = 0; k < 4; k++)
      A.cap(a0 + .04 + (k - 1.5) * .022, b0 - .04, .500, .004, .026, .004, c.steel,
        { gloss: .6, tag: '服装店' });
    A.put(a0 + .06, b0 + .16, .022, .080, .020, .447, c.cream, { hard: true, gloss: .12, tag: '服装店' });
    for (const s of [-1, 1])
      A.cap(a0 + .02, b0 + .30, .446, .005, .150, .005, c.steel,
        { ...alongB, gloss: .55, rz: s * .22, tag: '服装店' });
    A.put(a0 - .02, b0, .05, .26, .085, 1.335, C('#6d2620'), { hard: true, gloss: .2, tag: '服装店' });
    A.glyph(a0 + .008, b0, 1.335, '退换改衣', { size: .040, gap: .012, color: c.cream, glow: 0 });
    A.stop(a0 - .30, a0 + .30, b0 - .44, b0 + .44);
  }

  // ---- dressing the window ------------------------------------------------------------------
  // The shell builds a raised platform behind the glass — a 3.655..4.705, top at y 0.34 — and
  // asks this tenant's `服装店:win` route to stand two dress forms in each bay on it. Two things
  // about that need answering here: the platform runs 3.2 m along the frontage and holds two
  // figures, which is a shop that has dressed a tenth of its own window; and `mannequin` is
  // handed y0 + 0.46 while the platform it stands on is 0.34 high, so all four of them float
  // twelve centimetres. Both are fixed by adding rather than by changing: a display plinth under
  // each figure, which is a thing window displays actually have and which lands its foot exactly
  // on the deck, and enough stock either side of them to fill the run.
  //
  // Everything below is set out as an offset from the bay's own centre line, because the two
  // figures the shell stands are at fixed offsets of -0.45 and +0.50 from it whichever side of
  // the door the bay is on. With a 0.26 m foot each they take -0.71..-0.19 and +0.24..+0.76, so
  // the bay's three free runs are the 0.89 m outside one of them, the 0.43 m between them and the
  // 0.84 m outside the other — and every number here is one of those three, measured rather than
  // eyeballed, because there is no forgiveness in a 3.2 m window that already has two people in it.
  const MANN = [[4.05, -.45], [4.25, .50]];       // where the colon window stands them, relative to b_c
  for (const s of [-1, 1]) {
    const bc = s * 3.25;                                     // the bay's own centre line
    const rb = bc + s * 1.16, rb2 = bc - s * 1.16;           // coats outboard, folded stock inboard
    // The plinths, which are also what stops the four figures hovering.
    for (const [ma, mo] of MANN) {
      A.put(ma, bc + mo, .52, .52, .12, .40, c.trim, { hard: true, gloss: .30, tag: '服装店' });
      A.put(ma, bc + mo, .56, .56, .02, .47, c.stoneD,
        { hard: true, gloss: .38, tag: '服装店', ...STN });
    }
    // A rail of full-length coats at the outboard end of the bay, standing on the platform.
    for (const k of [-1, 1]) {
      A.cyl(3.90, rb + k * .30, 1.10, .028, 1.52, c.steelD, { gloss: .5, tag: '服装店', ...MET });
      A.put(3.90, rb + k * .30, .30, .09, .04, .36, c.trim, { hard: true, gloss: .35 });
    }
    A.cap(3.90, rb, 1.84, .024, .62, .024, c.steelD,
      { ...alongB, gloss: .55, tag: '服装店', ...MET });
    for (let i = 0; i < 5; i++)
      garment(3.90, rb - .22 + i * .11, 1.84 - ((i * 5) % 3) * .010, .92 + ((i * 7) % 3) * .06,
        s < 0 ? [NEUTRAL[3], NEUTRAL[3], NEUTRAL[7], COLOUR[6], COLOUR[6]][i]
              : [COLOUR[2], COLOUR[2], NEUTRAL[4], NEUTRAL[4], COLOUR[7]][i],
        i % 4 === 2 ? HANG.wire : HANG.black, 'b', (((i * 13) % 5) - 2) * .04, 2);
    // A low riser of folded stock at the inboard end, and a crate between the two figures.
    A.put(4.20, rb2, .52, .78, .20, .44, c.woodD, { hard: true, gloss: .22, tag: '服装店', ...TIM });
    A.put(4.20, rb2, .56, .82, .04, .56, c.stone, { hard: true, gloss: .36, tag: '服装店', ...STN });
    fold(4.20, rb2 - .21, .578, 4, s < 0 ? COLOUR[0] : NEUTRAL[0], .26, .30);
    fold(4.20, rb2 + .05, .578, 3, s < 0 ? NEUTRAL[6] : COLOUR[4], .26, .30);
    scarf(4.20, rb2 + .28, .578, s < 0 ? COLOUR[3] : COLOUR[5], 'b');
    tent(4.20, rb2 - .21, .583, s < 0 ? '¥98' : '¥145', .24);
    const b = bc + .025;                                      // the 0.43 m run between the figures
    A.put(4.46, b, .36, .34, .26, .47, c.woodD, { hard: true, gloss: .22, tag: '服装店', ...TIM });
    A.put(4.46, b, .40, .36, .04, .62, c.stone, { hard: true, gloss: .36, tag: '服装店', ...STN });
    fold(4.46, b, .638, 4, s < 0 ? NEUTRAL[2] : COLOUR[1], .24, .24);
    // The card against the glass, and a hanging sign over the coats.
    A.put(4.44, s * 2.60, .035, .40, .32, .52, c.card, { hard: true, gloss: .2, tag: '服装店' });
    A.put(4.44, s * 2.60, .05, .09, .32, .34, c.steelD, { hard: true, gloss: .4 });
    A.glyph(4.462, s * 2.60, .55, '新品8折', { size: .076, gap: .020, color: c.sale, glow: 0 });
    A.cap(4.10, rb, 2.98, .006, 1.12, .006, c.steelD, { gloss: .5 });
    A.put(4.10, rb, .030, .74, .30, 2.27, C('#6d2620'), { hard: true, gloss: .2, tag: '服装店' });
    // Both faces. A glyph quad is one-sided and the default normal points out at the concourse,
    // which is right for a window sign and means the shop floor behind it sees a blank red board.
    A.glyph(4.118, rb, 2.30, s < 0 ? '大衣' : '新款', { size: .115, gap: .04, color: c.cream,
      glow: .12, tag: '服装店' });
    A.glyph(4.082, rb, 2.30, s < 0 ? '大衣' : '新款', { size: .115, gap: .04, color: c.cream,
      glow: .12, tag: '服装店', back: true });
  }

  // All nine colour-changing pieces have the same retained soft-box signature.  Marking them
  // after every fixture is authored keeps them out of the static instance cache without giving
  // the seasonal feature a second callback or a second dynamic draw key.
  A.dynamicVisual([...seasonalHero, ...seasonalAccessories, ...seasonalVisuals].map(q => q.p));

  // ---- motion, and the shop's copy of the clock ---------------------------------------------
  // This unit had none at all, which for a clothes shop is the wrong thing to have none of: the
  // sound of the room is somebody changing behind a curtain. Three panels of cubicle one's curtain
  // sway, and nothing else moves — no rotating fixture, no marquee, no lit sign pulsing. A shop
  // floor is still; a fitting room is not.
  //
  // The callback is culled twice by the shell, first by deck and then by distance from the middle
  // of the unit, so on another floor or at the far end of the concourse it costs nothing. `far` is
  // pulled in to 18 from the default 24 because the fitting rooms are at the back of the unit and
  // there is no angle from the concourse where a 2 cm sway is resolvable.
  //
  // Absolute seconds in. The three panels are one phase apart and the curve is a plain sine — a
  // curtain is a pendulum on a track, and anything sharper reads as a flag.
  const clock = { mins: 12 * 60 };
  A.motion('fitting', (t, state, P, minutes) => {
    // Read here rather than in the verbs, which are getters called every frame the walk-up prompt
    // is drawn: this is the one place the number is already being handed over for free.
    if (Number.isFinite(minutes)) clock.mins = minutes;

    // A season crossing is the only time these nine retained mode-7 props are rewritten.  Hero,
    // feature card and selected accessory therefore change as one coherent collection, and an
    // unchanged frame performs no colour work at all.
    const si = seasonIndex(), story = SEASON_STORIES[si];
    if (si !== state.season) {
      for (const q of seasonalHero)
        q.p.color = q.tone === 'dark' ? story.heroDark : story.hero;
      for (const q of seasonalAccessories)
        q.p.color = q.tone === 'pale' ? story.accessoryPale : story.accessory;
      for (const q of seasonalVisuals) q.p.color = story.card;
      state.season = si; state.seasonKey = story.key; state.seasonHz = story.hz;
      state.heroPalette = story.key; state.featureCard = story.key;
      state.accessoryPalette = story.key;
    }

    const reduced = reducedMotion();
    if (reduced) {
      // Reset exactly once on entry to reduced mode, then retain the authored matrices untouched.
      if (state.curtainMode !== 0) for (const q of cubicleCurtain) {
        const w = A.at(q.a, q.b); q.p.m[12] = w[0]; q.p.m[14] = w[1];
      }
      state.curtainMode = 0; state.sway = 0;
    } else {
      for (let i = 0; i < cubicleCurtain.length; i++) {
        const q = cubicleCurtain[i];
        const s = Math.sin(t * 1.35 + i * 1.9) * .022 + Math.sin(t * 2.7 + i) * .006;
        const w = A.at(q.a, q.b + s);
        q.p.m[12] = w[0]; q.p.m[14] = w[1];
      }
      state.curtainMode = 1;
      state.sway = +(Math.sin(t * 1.35) * .022).toFixed(4);
    }
    state.reduced = reduced ? 1 : 0; state.occupied = 1; state.free = 2;
    state.occupancyIndicators = 5; state.seasonParts = 9;
  }, { far: 18 });

  // ---- light ------------------------------------------------------------------------------
  // Brighter over the stock than over the floor, which is the whole trick of shop lighting. Four
  // of them: the island in the middle, both side walls' rails where the money is, and the
  // fitting-room end, which is otherwise the darkest corner of the unit. Eight lights reach the
  // shader and the nearest win, so standing in here these are the ones.
  A.light(2.95, -.40, 2.10, [1.00, 0.94, 0.82], .30, 3.4);
  A.light(2.60, -4.05, 2.10, [1.00, 0.93, 0.80], .28, 2.9);
  A.light(2.30, 3.90, 2.10, [1.00, 0.92, 0.78], .28, 3.0);
  A.light(1.70, -2.30, 2.15, [1.00, 0.95, 0.85], .24, 2.7);

  // ---- what there is to talk about, and what can be bought ---------------------------------
  // Every one of these is a word the game knows. `openWord` looks the label up in Vocab and
  // quietly returns if it is not there, so a thing hung on a word with no row is a prop the
  // player can walk up to, be prompted by, press E on, and get silence from — and a *thing* whose
  // headword has no row is worse than that: game.js reads `Vocab.get(best.hz).en` to build the
  // walk-up prompt, with no fallback, so it throws on the first frame the player stands near it
  // and takes the whole game down. Four of the seven garments this shop sells — 衬衫, 裤子, 大衣
  // and 围巾 — have no row in js/vocab.js. They are all merchandised on the floor and all four are
  // buyable through the 服装店 browse action, which reads MALL_GOODS and not the dictionary; what
  // they cannot have, until somebody adds the rows, is a label of their own.
  //
  // 服装店 and 收银台 are the two that matter: game.js generates a browse action for every
  // MALL_GOODS key and a pay action for 收银台, so those two labels are the shop's whole
  // transaction. There are two 服装店 anchors, one out on the concourse where a passer-by meets
  // it and one on the mid-floor line where somebody already inside does; whichever is nearer
  // relative to its own reach wins, so having both costs nothing and means the shop can be
  // shopped from inside it.
  //
  // Every focus below is a measured point in the cross aisle or the entry, not a + 1.15 guess.
  A.th('服装店', 5.15, 0, '这件外套可以试穿吗？', 'Can I try this coat on?',
    '服装 is clothing; 试穿 means to try clothes on.', 2.2, 2.5);
  lab('服装店', 3.05, -.44, '这件外套可以试穿吗？', 'Can I try this coat on?',
    '服装 is clothing; 试穿 means to try clothes on.', 1.9, 1.35, 2.95, .25);
  lab('收银台', 1.58, 3.55, '这个多少钱？', 'How much is this one?',
    '收银 to take payment + 台 counter.', 1.9, 1.15, 1.98, 3.55);
  lab('衣服', 2.20, -4.45, '先看看颜色和尺码。', 'Look at the colours and sizes first.',
    '衣服 means clothes.', 1.9, 1.55, 1.95, -3.90);

  // ---- the four garments the fixtures have been merchandising unnamed ------------------------
  // 衬衫, 裤子, 围巾 and 大衣 are each on a fixture of their own (the map above `MIDA`), and none of
  // them could be walked up to, because none had a row in js/vocab.js and .thingcheck.js:131 fails
  // a label whose headword has no reading. The rows landed 2026-08-08 — this file had already
  // written them out at js/mall-fashion.js:1317 waiting for somebody to hold that file.
  // MALL-TODO item 21.
  //
  // Every fixture stands on the line at `MIDA` 3.03 and the walkable cross aisle starts at a 1.79,
  // so each focus goes at a 1.95 on the fixture's own b — 1.08 m out, inside a 1.3 reach. That is
  // the same point the note above uses for everything else here, and it is why none of these is
  // left at `A.th`'s a + 1.15, which would put the circle inside the fixture it names.
  lab('围巾', MIDA, -3.94, '这条围巾多少钱？', 'How much is this scarf?',
    '围 to surround + 巾 a cloth. A scarf is 一条, the long-thin measure word — same as a road.',
    1.3, 0.95, 1.95, -3.94);
  lab('裤子', MIDA, -2.90, '这条裤子有别的尺码吗？', 'Do these trousers come in another size?',
    '裤子 is also 一条, because trousers are long — and the pair is one thing in Chinese, not two.',
    1.3, 1.05, 1.95, -2.90);
  lab('衬衫', MIDA, 1.98, '这件衬衫可以试穿吗？', 'Can I try this shirt on?',
    '衬 to line + 衫 a light garment. Anything you wear on the top half is 一件.',
    1.3, 1.45, 1.95, 1.98);
  lab('大衣', MIDA, 3.28, '这件大衣有点长。', 'This overcoat is a little long.',
    '大衣 is the full-length coat, the one fixture in here with the drops for it. ' +
    '外套 is the shorter jacket — both are 一件.',
    1.3, 1.55, 1.95, 3.28);
  lab('外套', 2.20, 4.45, '这件外套多少钱？', 'How much is this jacket?',
    '外 outer + 套 a cover — what goes on over everything else.', 1.9, 1.55, 1.95, 3.90);
  lab('毛衣', 3.05, -1.48, '这件毛衣有别的颜色吗？', 'Does this jumper come in another colour?',
    '毛 wool + 衣 garment.', 1.8, 1.20, 1.95, -1.48);
  lab('裙子', 3.03, 1.98, '这条裙子有小号的吗？', 'Do you have this skirt in a small?',
    '裙 skirt + 子, the noun ending half the wardrobe takes.', 1.9, 1.95, 1.95, 1.98);
  lab('试衣间', 1.50, -2.725, '试衣间现在空着。', 'The fitting room is free now.',
    '试 to try + 衣 clothes + 间 room.', 1.9, 1.60, 1.95, -2.725);
  lab('镜子', 1.50, MIR, '穿上以后照照镜子。', 'Check the mirror after putting it on.',
    '照镜子 means to look in a mirror.', 1.9, 1.70, 1.95, -1.36);

  // ---- four more, and the four pockets of floor they had to be aimed at -----------------------
  // The cross aisle at a ≈ 1.95 is the only continuous standing room in the unit — the joinery's
  // front faces are at 1.44 and 1.49 and the mid-floor line's colliders begin at 2.41 once
  // `clampMove` has grown them by the player's 0.30 — so every focus in this shop is on it, and
  // the whole job of placing a new label here is finding a metre of that line nobody has claimed.
  // Taken already: b -3.90, -2.725, -1.48, -1.36, 1.98 and 3.55. The four below sit in the four
  // gaps left, none closer than 0.55 m to its neighbour, because two labels sharing a pocket means
  // one of them can never be the nearest and is therefore never reachable at all.
  //
  //   打折  focus (1.95, -3.30)  between the round table and the fitting rooms
  //   换    focus (1.90, -0.42)  in front of the returns rail; a 1.90 is the far edge of the
  //                              folding island's expanded box at b -0.42, and 1.52 is the near
  //                              edge of the rail's own, so this pocket is 0.38 m deep
  //   服装  focus (2.00,  0.72)  in front of the feature plinth, under the shop's own name
  //   季节  focus (1.95,  1.35)  between the plinth and the four-way
  // Hung over the marked-down stock on the lower rail rather than on the 清仓特价 card at the end
  // of the bay. The card is the right thing to look at and the wrong thing to hang the label on:
  // at a 3.50, b -4.86 it measured 2.20 m from this focus against a 1.70 reach, so the word lit up
  // and could never be used. `A.th` sets `dist` from the label to the focus and `inReach` compares
  // that to `reach` — a label further from its own focus than its reach is simply dead.
  lab('打折', 2.60, -4.66, '这一排全部打折。', 'This whole run is reduced.',
    '打折 is to discount: 八折 is twenty percent off, not eighty. 清仓 is a clearance.',
    1.7, 1.10, 1.95, -3.30);
  lab('换', 0.90, -0.42, '不合适可以换吗？', 'Can I exchange it if it does not fit?',
    '换 is to change one thing for another — 退 is to give it back for money. 改衣 is alteration.',
    1.6, 1.34, 1.90, -0.42);
  lab('服装', 0.92, 0.72, '这一身怎么搭配？', 'How would you put this outfit together?',
    '服装 is clothing as a category — what the shop sells, rather than 衣服, what you have on.',
    1.7, 1.50, 2.00, 0.72);
  lab('季节', 2.62, 0.58, '这是本季的新款。', 'These are this season’s new lines.',
    '季 season + 节 period. 本季 is this season; 换季 is the changeover, when last season goes out.',
    1.6, 2.30, 1.95, 1.35);

  // ---- and what Q does at each of them ---------------------------------------------------------
  // Rows in `USE_AT.mall`, installed as getters — the pattern js/mall-digital.js:1272 sets out.
  // `USE_AT` is a top-level `const` in js/data.js, which loads long before anybody walks into this
  // building, so by the time a fit-out runs it is a plain global lexical binding a tenant can add
  // to. The guard is for a harness that loads this file on its own. The note further up this
  // function — that the four unglossed garments "cannot have a label until somebody adds the rows"
  // — is still true and is about js/vocab.js, which is a different file and genuinely not ours.
  //
  // `USE_AT.mall` is ONE table for eighteen shops, so a verb belongs to a word and not to a room.
  // 打折, 换, 服装 and 季节 are labelled nowhere else in js/mall-*.js; that was checked before they
  // were chosen, and it is why the alterations bench is 换 rather than 修 (the shoe shop's) and
  // why nothing in here is hung on 干净 (the pet shop's) or 名字 (the flower shop's).
  //
  // 试衣间 is the one existing row this file replaces rather than adds to. Its row in js/data.js is
  // a fine generic 试穿衣服; what it cannot be is a size and a colour, because those change, and it
  // cannot carry `wear` because no other shop in the mall should change what you have on. Only this
  // shop labels 试衣间, so replacing it affects this shop and nothing else — but it *is* a
  // replacement, and if the owner of js/data.js would rather keep that row, deleting the getter
  // below restores it exactly.
  const verb = (hz, get) => {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, { configurable: true, enumerable: true, get });
  };
  // A getter is called every frame the walk-up prompt is drawn. Each of these depends on one
  // integer — which slot of the clock we are in — so the object literal is built when that integer
  // changes and handed back unchanged the rest of the time. Twelve fields and four template
  // strings per frame per label is not a stall, but it is also not necessary. Nothing downstream
  // mutates a def, so returning the same object twice is safe; a variant can invalidate it when
  // something other than the clock changes the offer.
  const memo = (per, build, variant) => {
    let at = -1, variantAt, def = null;
    return () => {
      const i = Math.floor(clock.mins / per);
      const nextVariant = variant ? variant() : 0;
      if (i !== at || nextVariant !== variantAt) {
        at = i; variantAt = nextVariant; def = build(i, nextVariant);
      }
      return def;
    };
  };
  // The sizes on the board beside the fitting rooms, and the four colours the rails are run in.
  // 号 is the size and 码 the number on the ticket; a Chinese shop says 中号 as often as M.
  const SIZES = [
    { hz: '小号', py: 'xiǎohào', en: 'small', tag: 'S' },
    { hz: '中号', py: 'zhōnghào', en: 'medium', tag: 'M' },
    { hz: '大号', py: 'dàhào', en: 'large', tag: 'L' },
  ];
  const HUES = [
    { hz: '米色', py: 'mǐsè', en: 'beige' },
    { hz: '灰色', py: 'huīsè', en: 'grey' },
    { hz: '藏青', py: 'zàngqīng', en: 'navy' },
    { hz: '酒红', py: 'jiǔhóng', en: 'wine red' },
  ];
  // What the plinth under the shop's own name is wearing, as an outfit rather than as four
  // garments: this is the recommendation, and it is the thing 服装 asks about.
  const LOOKS = [
    { hz: '毛衣配裙子', py: 'máoyī pèi qúnzi', en: 'the jumper with the skirt', price: 458 },
    { hz: '衬衫配裤子', py: 'chènshān pèi kùzi', en: 'the shirt with the trousers', price: 429 },
    { hz: '大衣配围巾', py: 'dàyī pèi wéijīn', en: 'the coat with the scarf', price: 518 },
  ];
  // The four seasons, and what goes out on the floor in each. 换季 — the changeover — is the word
  // the clearance rail exists for, so the two verbs below share it.
  const SEASONS = [
    { hz: '春装', py: 'chūnzhuāng', en: 'the spring range', of: '风衣', ofEn: 'trench coats' },
    { hz: '夏装', py: 'xiàzhuāng', en: 'the summer range', of: '短袖', ofEn: 'short sleeves' },
    { hz: '秋装', py: 'qiūzhuāng', en: 'the autumn range', of: '毛衣', ofEn: 'knitwear' },
    { hz: '冬装', py: 'dōngzhuāng', en: 'the winter range', of: '大衣', ofEn: 'coats' },
  ];
  const ALTER_PRICE = 20, TRY_MINS = 14;
  // `__game.state()` deliberately returns copies of several large collections, so polling it from
  // a walk-up getter every frame would turn one price check into needless allocation. Ownership can
  // only change after an action advances the clock; refresh once per game minute, which still makes
  // the included alteration appear immediately after the five-minute till action completes.
  let ownedAt = -1, owned = [];
  const ownsMallItem = hz => {
    const at = Math.floor(clock.mins);
    if (at !== ownedAt) {
      ownedAt = at; owned = [];
      const g = window.__game;
      if (g && typeof g.state === 'function') {
        try {
          const bought = g.state().bought;
          if (Array.isArray(bought)) owned = bought;
        } catch (_) {}
      }
    }
    return owned.includes(hz);
  };

  // Trying something on. This is the one verb in the building that changes what the player looks
  // like, and it does it with `wear`, which js/game.js:11837 already implements as
  // `wearFromRail(flat.outfit++ % World.rail.length)` — one swap of the `TOP` colour on the rig
  // that is already being drawn. No preview figure, no second body, no per-frame re-skin.
  //
  // The ceiling on that, stated rather than hidden: what you end up wearing is the next thing off
  // your own wardrobe rail at home, not the garment named in the prompt, because `TOP` and
  // `PLAYER` are module-scoped in js/game.js and `wearFromRail` is the only thing that writes
  // them. The shirt visibly changes and the change persists; which colour it changes to is not
  // this shop's to choose. One line in game.js — `if (def.wearColor) setTop(def.wearColor)` — is
  // the whole of what it would take, and it is in the request at the foot of this file.
  // ponytail: colour comes off the home rail, not the garment; needs a setter exported from game.js.
  verb('试衣间', memo(TRY_MINS, i => {
    const sz = SIZES[i % SIZES.length], hue = HUES[(i * 3) % HUES.length];
    return { zh: '试穿', py: 'shìchuān', secs: 3.3, mins: TRY_MINS, gain: { mood: 14 },
      pose: { type: 'open' }, wear: true,
      en: `take a ${sz.en} (${sz.hz} ${sz.py}, ${sz.tag}) in ${hue.en} (${hue.hz} ${hue.py}) into the cubicle`,
      done: `${sz.hz}的${hue.hz}正好，就穿着吧。`,
      doneTr: `The ${sz.en} in ${hue.en} fits — you keep it on.` };
  }));
  verb('服装', memo(9, i => {
    const l = LOOKS[i % LOOKS.length];
    return { zh: '问搭配', py: 'wèn dāpèi', secs: 2.6, mins: 7, gain: { mood: 8 },
      pose: { type: 'talk' },
      en: `ask what goes with what — she puts up ${l.en} (${l.hz}) at ¥${l.price}`,
      done: `${l.hz}，一套下来${l.price}。`,
      doneTr: `${l.en} — ${l.price} for the pair. 搭配 dāpèi is to put an outfit together.` };
  }));
  verb('季节', memo(31, i => {
    const s = SEASONS[i % SEASONS.length];
    return { zh: '看新款', py: 'kàn xīnkuǎn', secs: 2.4, mins: 6, gain: { mood: 7 },
      pose: { type: 'stand' },
      en: `look over ${s.en} (${s.hz} ${s.py}) — the new line is ${s.ofEn}`,
      done: `本季主推${s.of}，上个月刚到。`,
      doneTr: `${s.ofEn} lead this season — they came in last month.` };
  }));
  verb('打折', memo(19, i => {
    // The discount moves, because a clearance rail's does. 八折 is twenty percent off in Chinese —
    // the number is what you pay, not what you save, and that is the single most useful thing this
    // label teaches.
    const off = [8, 7, 5][i % 3], last = SEASONS[(i + 3) % SEASONS.length];
    return { zh: '看特价', py: 'kàn tèjià', secs: 2.2, mins: 5, gain: { mood: 6 },
      pose: { type: 'reach' },
      en: `the clearance end — ${last.of} at ${off} tenths of the ticket, ` +
          `which is ${(10 - off) * 10}% off`,
      done: `清仓${off}折，${last.of}都在这一排。`,
      doneTr: `Clearance at ${off} tenths — ${(10 - off) * 10} percent off. The ${last.ofEn} are all on this run.` };
  }));
  verb('换', memo(23, (i, trousersIncluded) => {
    // Three things happen at this rail and they are genuinely different transactions: giving it
    // back for money, swapping it for another size, and having a hem taken up. Which one is on
    // offer rotates, because it is one counter and one member of staff.
    const k = i % 3;
    if (k === 0)
      return { zh: '换个号', py: 'huàn ge hào', secs: 2.6, mins: 7, gain: { mood: 6 },
        pose: { type: 'open' },
        en: 'exchange it for another size — seven days, with the receipt and the tag on',
        done: '换大一号，小票带着就行。',
        doneTr: 'One size up. Keep hold of the receipt.' };
    if (k === 1)
      return { zh: '退货', py: 'tuìhuò', secs: 2.8, mins: 8, gain: { mood: 4 },
        pose: { type: 'talk' },
        en: 'return it for a refund — seven days, unworn, tag on',
        done: '七天之内可以退，钱原路退回。',
        doneTr: 'Seven days to return it; the money goes back the way it came. 退 is to return, 换 to exchange.' };
    return { zh: '改裤长', py: 'gǎi kùcháng', secs: 3.0, mins: 10,
      ...(trousersIncluded ? {} : { pay: -ALTER_PRICE }), gain: { mood: 7 },
      pose: { type: 'reach' },
      en: trousersIncluded
        ? 'have your trousers hemmed — included with the purchase, ready in two days'
        : `have the hem taken up — ¥${ALTER_PRICE}, ready in two days`,
      done: trousersIncluded ? '这条裤子免费改，后天来取。' : '裤长给您改一下，二十块，后天来取。',
      doneTr: trousersIncluded
        ? 'The alteration is included with your trousers — ready the day after tomorrow.'
        : 'The hem taken up — twenty kuai, ready the day after tomorrow.' };
  }, () => ownsMallItem('裤子')));
};

// The shell builds the window before it invokes the fit above, so the two figures use the shared
// colon-key route.  These are the exact two mannequin calls formerly written inline on the
// mall.js shop spec: same centres, colours and window toolkit, hence zero geometry/draw/collider
// change while giving the storefront one unambiguous tenant owner.
MallFit['服装店:win'] = (W, b, side) => {
  W.mannequin(4.05, b - .45, C('#eee2cc'));
  W.mannequin(4.25, b + .50, C('#792923'));
};

// ---------------------------------------------------------------- who works and shops here
//
// Pushed onto MallCast (js/mall.js), which game.js folds into NPCS before the world is built, so
// eighteen tenants can staff themselves without eighteen people editing one argument list.
//
// `at` and `patrol` are the mall's own world coordinates. This unit is shop('W', -2.2, 10.0) on
// the west wall, which makes the conversion exactly:
//
//     x = -23 + a          z = -2.2 + b
//
// and a yaw of 0 looks along +z (= +b), π/2 along +x (= +a, out towards the concourse).
//
// Every position below was checked against the collision map with a body radius of 0.28 rather
// than read off the plan, because the two are not the same thing: the aisle in front of the cash
// desk is 0.98 m of floor and 0.38 m of standing room, and a shopper placed by eye in the middle
// of it is a shopper standing in a display table. The free centre-line of the cross aisle runs
// a 1.74–2.17 the width of the shop; the entry runs b -0.23–0.74 in front of the door and opens
// out to b -0.23–1.22 once past the dress forms. Everything here is on one of those two.
if (typeof MallCast !== 'undefined') MallCast.push(
  // Behind the till, which in this shop is a 0.40 m strip between the back wall and the counter
  // — she stands at a 0.44, close enough that the counter reads as hers, and faces the customer.
  { hz: '收银员', name: '王雪', py: 'Wáng Xuě', place: 'mall', mallFloor: 1,
    rig: 'mall-wang-xue', temper: 'genial',
    look: { skin: '#e8bb92', hair: '#201c1a', hairStyle: 'bun', top: '#ece5d6', vest: '#363b42',
            pants: '#2f343a', shoe: '#26292d', collar: 'shirt', tall: .96, faceSeed: 8611 },
    spots: [{ h0: 10, h1: 22, at: [-22.56, 1.52], face: Math.PI / 2, act: 'vend' }],
    lines: [['一共三百二十块，扫码还是刷卡？', 'Three hundred and twenty altogether — scan or card?'],
            ['要不要给您装袋子？', 'Shall I put it in a bag for you?'],
            ['小票在这儿，七天内可以换。', 'Here is your receipt — you can exchange within seven days.']] },
  // On the floor at the fitting-room end, turned back towards the door so she sees who comes in.
  // This is where the fitting-room attendant stands in every clothes shop in the country: at the
  // mouth of the cubicles, between the mirror and the aisle.
  { hz: '导购员', name: '陈佳', py: 'Chén Jiā', place: 'mall', mallFloor: 1,
    rig: 'mall-fashion-guide-chen-jia', temper: 'brisk',
    look: { skin: '#dfae85', hair: '#241f1c', hairStyle: 'ponytail', top: '#31363d',
            pants: '#3c4450', shoe: '#e6dfd2', scarf: '#8c3a33', tall: 1.00, faceSeed: 8612 },
    spots: [{ h0: 10, h1: 22, at: [-21.10, -3.25], face: .77, act: 'vend' }],
    lines: [['您好，随便看看，有需要叫我。', 'Hello — have a look round, just call me if you need anything.'],
            ['这件还有米色和黑色，要试试吗？', 'This also comes in beige and black — want to try it?'],
            ['试衣间在这边，二号是空的。', 'The fitting rooms are this way — number two is free.'],
            ['大衣今天八折，会员再减二十。', 'Coats are twenty percent off today, twenty more for members.']] },
  // Four shoppers who come in rather than walk past. Each route starts and ends out on the
  // concourse and turns into the shop through the 3 m opening, so at any moment some of them are
  // inside and some are on their way, which is what a shop at two in the afternoon looks like.
  //
  // The rails, then out: down the entry, along the cross aisle to the fitting-room end, back.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'steady',
    look: { skin: '#dbaa83', hair: '#29211d', hairStyle: 'bob', top: '#8d6f7c', pants: '#3c4756',
            shoe: '#ece6da', bag: 'tote', bagColor: '#c9a45c', tall: .99, faceSeed: 8613 },
    patrol: [[-17.10, -2.60], [-18.90, -2.10], [-20.10, -1.85], [-21.05, -2.00], [-21.05, -3.80],
             [-21.05, -5.10], [-21.05, -3.80], [-21.05, -2.00], [-20.10, -1.85], [-18.90, -2.50],
             [-17.10, -1.60]], speed: .94 },
  // In to try something on: through the door, along to the fitting rooms, and back out again.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'patient',
    look: { skin: '#c99269', hair: '#302622', hairStyle: 'short', top: '#5f7688', pants: '#333a42',
            shoe: '#262b2e', jacket: '#455f6c', tall: 1.06, faceSeed: 8614 },
    patrol: [[-17.40, 0.20], [-18.80, -1.60], [-20.05, -1.90], [-21.08, -3.50], [-21.08, -5.40],
             [-21.08, -3.50], [-20.05, -1.90], [-18.80, -1.60], [-17.40, -4.60]], speed: .88 },
  // The one who is actually buying: entry, cross aisle, the coat rail, the till, and away.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bustling',
    look: { skin: '#edbc94', hair: '#2a211e', hairStyle: 'tousled', top: '#7189a0',
            pants: '#4a4554', shoe: '#e9e2d5', bag: 'shoulder', bagColor: '#4d4238', tall: 1.02,
            faceSeed: 8615 },
    // b 0.45 and not 0.80 on the way through: the dress form beside the door blocks b 1.04–1.80
    // from a 3.02 to 3.78, and a waypoint at b 0.80 puts a 0.28 m body 4 cm inside it.
    patrol: [[-17.30, 1.80], [-18.90, -1.10], [-20.05, -1.75], [-21.05, -0.30], [-21.05, 1.35],
             [-21.05, 1.70], [-21.05, -0.30], [-20.05, -1.75], [-18.90, -1.10], [-17.30, 1.80]],
    speed: 1.04 },
  // And one who never comes in: the window is the part of a shop most people only ever look at,
  // and a frontage with nobody stopped in front of it is a frontage nobody is looking at.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bored',
    look: { skin: '#d09b72', hair: '#36312e', hairStyle: 'short', top: '#6b7d70', pants: '#3a4149',
            shoe: '#252a2e', pack: true, packColor: '#8a5f3e', tall: 1.04, faceSeed: 8616 },
    patrol: [[-16.80, -5.40], [-17.30, -3.70], [-17.30, -0.70], [-16.80, 1.00], [-17.30, -1.90],
             [-16.80, -5.40]], speed: .86 },
  // Sitting on the bench inside the open cubicle, waiting for whoever is in the other one. The
  // bench is built at a 0.33–0.71 with its pan top at 0.505, so `seatY` is that number and not a
  // guess; cubicle two is the one whose curtain is bunched to the side, so she can be seen.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'patient', seatY: .505,
    look: { skin: '#e3b58b', hair: '#2b2320', hairStyle: 'bob', top: '#a8636f', pants: '#454b56',
            shoe: '#2c3135', bag: 'tote', bagColor: '#b9884d', tall: .97, faceSeed: 8617 },
    spots: [{ h0: 10, h1: 22, at: [-22.44, -4.925], face: Math.PI / 2, act: 'sit' }] },
);

// ===============================================================================================
// REQUESTS · what this shop still needs from files it does not own
//
//  * js/vocab.js — four garments this shop merchandises on the floor and sells through MALL_GOODS
//    have no dictionary row, so none of them can carry a label: a `thing` with no row fails
//    .thingcheck.js. They are the four the note above the labels already names.
//
//        衬衫|chènshān|shirt|clothing        裤子|kùzi|trousers|clothing
//        大衣|dàyī|coat|clothing             围巾|wéijīn|scarf|clothing
//
//    With those four rows this file can hang a label and a verb on each of them itself — the wall
//    bays, the trouser table, the long-hang rail and the scarf tree are all already built and all
//    four already carry the stock.
//
//  * js/game.js — one line, and the try-on stops lying about what it put on you. `def.wear` at
//    js/game.js:11837 is `wearFromRail(flat.outfit++ % World.rail.length)`, which takes the next
//    shirt off the player's own wardrobe rail at home. That is right for the wardrobe and wrong
//    for a shop: the prompt here names a size and a colour, and what you walk out in is whatever
//    was next on the rail. `TOP`, `TOPL`, `TOPD` and `PLAYER` are all module-scoped, so no tenant
//    can set them. A single exported setter — or `if (def.wearColor) { TOP = def.wearColor;
//    TOPL = tint(TOP, 1.24); TOPD = tint(TOP, 0.76); }` beside the existing `def.wear` branch —
//    would let the getter above pass the colour it is already naming, at no per-frame cost: it is
//    the same one-off swap on the same rig, not a preview figure and not a re-skin.
