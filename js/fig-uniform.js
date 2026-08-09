// Registered into FigureFit (declared at the top of js/figure.js). The call site at the end of
// drawFigure documents the context object and the rules: additive only, correct frame, LOD-gated.
//
// ============================================================================== 制服 uniforms
//
// Sixty-four people in this city have a job, and until now not one of them was dressed for it.
// The pharmacist behind her counter, the guard on his patrol, the ground crew on the apron and
// the man who hands you a bowl of noodles were all wearing whatever the roster happened to give
// them that morning, which is to say: a shirt and a pair of trousers, like everybody else.
//
// A uniform is the one thing that makes a stranger legible in a single glance, and it does that
// before you are close enough to read a label or hear a line of dialogue. It is also the cheapest
// characterisation in the game — a navy tunic with a gold bar on each shoulder is four draws and
// it tells you who to ask about a lost bag. So this file is about *legibility at range*, not about
// tailoring: every kit is built out of a colour block you can read at fifteen metres and a handful
// of trim pieces that only exist when somebody is standing next to you.
//
// ---- how a person gets into uniform
//
// `lk.uniform`. That is the whole interface, and it is the field this file adds to a look:
//
//     look: { …, uniform: 'guard' }        the kit by name
//     look: { …, uniform: '保安' }          or the job, which resolves to the same kit
//
// `makeLook` builds a fixed object out of the keys it knows about and drops the rest, so an
// unknown `uniform:` in a roster entry would never reach the rig. Rather than editing figure.js —
// which is fifteen people's shared file — the field is carried through by wrapping `makeLook`
// below. The wrapper chains, so it costs nothing and coexists with anybody else's.
//
// And because writing `uniform:` into sixty-four roster rows is sixty-four other people's work,
// the job is *also* read straight off the NPC's `hz` — the one-word role every roster row already
// carries. A row that says nothing gets dressed anyway; a row that says `uniform:` overrides. So
// the roster does not have to change for this to work, and it can change to override it.
//
// ---- what each kit is
//
//   guard    保安              navy tunic, epaulettes, peaked cap and badge, red brassard, 工牌
//   screen   安检员            the same cut in screening blue, no brassard
//   transit  售票员 站务员      dark tunic, shoulder tabs, cap badge, red armband, 工牌
//   cabin    空乘 登机员        fitted jacket, silk neck scarf, wings, no lanyard (crew wear a pin)
//   chef     厨师              white double-breasted jacket, tall toque, neckerchief
//   kitchen  帮厨              skull cap, apron, waist towel
//   waiter   服务员            apron over the shirt, waist tie, order pad and pen
//   vendor   摊主 老板         work apron and a money pouch at the waist
//   coat     药剂师 医护       white coat to mid-thigh, lapels, chest pocket, 工牌
//   ramp     地勤              hi-vis, reflective bands, ear defenders, 工牌
//   rider    外卖员            「鹊送」 livery: helmet stripe and chest mark over the insulated box
//   courier  快递员            「云驿」 livery: cap, waist pouch, chest mark, 工牌
//   retail   导购员 收银员      shop scarf and a 工牌
//   keeper   饲养员            olive work jacket, cap, keeper's pouch, 工牌
//   sweeper  扫地的            sanitation orange, reflective bands, cap, armband
//   staff    老师 同事 照相的   the 工牌 alone, which is what an office and a school actually wear
//   manager  经理              工牌 and a lapel pin
//
// ---- additive, and polite about it
//
// Every part checks what figure.js has already been told to draw. Somebody the roster has already
// put in a hi-vis gilet does not get a second one on top — the gilet's own colour becomes the
// uniform's, and only the trim is added. A rider who already has `hat:'hard'` gets the livery
// stripe painted on that helmet rather than a second helmet inside it. A roster that names a
// `badge:` has said this person already has a name plate, so the lanyard is left off.
//
// ---- the two things that go wrong here, and what is done about them
//
// **Depth.** A badge is a flat plate laid against a curved chest, and if its face lands on the
// cloth's face the two z-fight and the badge flickers as stripes. The body is drawn from `body`,
// whose profile is a known table (`makeBody` in gl.js), so `frontZ` below reconstructs where the
// front of the outermost garment actually *is* at a given height and everything mounted on the
// chest is stepped a clear centimetre out from that face — not from the shape's centre, which is
// where this goes wrong. The same table is what sizes the hems and the reflective bands, so they
// stand proud of the shell by a known amount instead of by a guessed one.
//
// **Curvature.** A shoulder is an arc and an epaulette is a bar, and a bar laid over an arc either
// floats at its ends or sinks in the middle — there is no third option and no amount of nudging
// finds one. So every band that has to follow a round surface is built the way figure.js builds
// its beards: the shape underneath, redrawn a few millimetres larger in the directions the band
// should show and *smaller* in the directions it should not. Where the shell tapers back inside
// the body it simply stops being drawn, and that is what draws the band's own edge. An epaulette,
// a helmet stripe and a set of ear defenders are one draw each this way.
//
// ---- budget
//
// A plain figure is ~100 draws at lod 0 and ~50 at lod 2, and lod 2 is the tier a hall full of
// people is drawn at. So the split is hard: at lod 2 a uniform is allowed the colour block and the
// headwear and nothing else — 1 to 3 draws. Everything that is trim (epaulettes, badges, armbands,
// lanyards, buttons, cuffs, pockets) is behind `trim`, which is `lod < 2`, and the last few
// millimetres of detail are behind `lod === 0`. The heaviest kit is 14 draws at lod 0.
(() => {
  if (typeof FigureFit === 'undefined') return;

  // ------------------------------------------------------------------ the wardrobe, as data
  //
  // One row per kit. The builder below walks these keys, and a key is worth a known number of
  // draws, so the cost of a kit can be read off its row rather than found by counting code.
  //
  //   col          the uniform's own colour — the tunic, coat or tabard. Only used when the
  //                roster has not already put an outer layer on this person.
  //   long         the shell runs past the hip to mid-thigh: a white coat rather than a jacket.
  //   hem          a band round the bottom edge of the shell.
  //   ep           epaulettes, in this colour.
  //   bands        two reflective bands round the body. Hi-vis is unreadable without them.
  //   cap          a peaked cap in this colour, if the roster has not given one already.
  //   capBadge     a badge on the front of the cap band.
  //   toque        the chef's tall hat.
  //   skullcap     the low white cap a kitchen hand wears.
  //   brassard     an armband high on the left arm, in this colour.
  //   tag          a 工牌 on a lanyard, the card in this colour.
  //   apron        an apron in this colour, if the roster has not given one.
  //   pouch        a pouch at the waist.
  //   pad          an order pad and pen on the chest.
  //   towel        a cloth tucked at the waist.
  //   scarf        a silk neck scarf.
  //   wings        a cabin-crew pin over the left breast.
  //   breast       a double-breasted front: two plackets and two rows of buttons.
  //   pocket       a patch pocket on the chest.
  //   lapel        two lapels down the opening.
  //   ears         ear defenders, in this colour.
  //   mark         a livery mark on the chest, and a stripe over the helmet if one is worn.
  //   pin          a small lapel pin.
  //
  // No real company appears anywhere in here. The two delivery liveries are invented: 「鹊送」,
  // magpie-post, in a courier green, and 「云驿」, cloud-relay, in a parcel blue. Neither is a
  // real firm and neither carries any text — a brand at this scale is a colour and a mark.
  const KITS = {
    // A lanyard cord is three centimetres of colour lying on a chest, so it is picked against the
    // uniform under it rather than to match it: a navy cord on a navy tunic is two dark seams and
    // reads as damage to the cloth, which is exactly how the first pass came out.
    guard:   { col:'#26394e', hem:1, ep:'#c9a94e', cap:'#1c2b3b', capBadge:'#c9a94e',
               brassard:'#a63a30', tag:'#ece6d8', cord:'#8f2f28' },
    screen:  { col:'#2f5a7e', hem:1, ep:'#cdd7de', cap:'#22415c', capBadge:'#d7dee4',
               tag:'#ece6d8', cord:'#c3ccd4' },
    transit: { col:'#2b3948', hem:1, ep:'#b9c3cc', cap:'#1f2b37', capBadge:'#c9a94e',
               brassard:'#a63a30', tag:'#ece6d8', cord:'#a63a30' },
    cabin:   { col:'#27354c', hem:1, ep:'#c9a94e', scarf:'#a8433c', wings:'#c9a94e' },
    chef:    { col:'#eceae2', toque:1, breast:'#cdcabf', scarf:'#39445a' },
    kitchen: { skullcap:'#eceae2', apron:'#8d97a0', towel:'#ded7c4' },
    waiter:  { apron:'#3c4a58', pad:'#f0ebdd', tag:'#ece6d8', cord:'#8a6f4e' },
    vendor:  { apron:'#6f6a5c', pouch:'#4a4038' },
    coat:    { col:'#f0efe8', long:1, lapel:'#dcdbd2', pocket:'#dcdbd2',
               tag:'#e4ecef', cord:'#5b6f7a' },
    ramp:    { col:'#d6c23a', bands:1, ears:'#c9552b', tag:'#ece6d8', cord:'#3a4048' },
    rider:   { col:'#2f8a68', mark:'#f2f0e6', hem:1 },
    courier: { col:'#3f6f9c', cap:'#2f5680', mark:'#e8d86a', pouch:'#33445a',
               tag:'#ece6d8', cord:'#dbe2e8' },
    retail:  { scarf:'#a8443c', tag:'#ece6d8', cord:'#4a4f57' },
    keeper:  { col:'#4f6b46', hem:1, cap:'#3d5638', pouch:'#5b4a35', tag:'#ece6d8',
               cord:'#c9b07a' },
    sweeper: { col:'#cf6420', bands:1, cap:'#bd591b', brassard:'#e0a93a' },
    staff:   { tag:'#ece6d8', cord:'#4a4f57' },
    manager: { tag:'#ece6d8', cord:'#39414d', pin:'#c9a94e' },
  };

  // The job, as the roster already writes it, to the kit. Everything not in here — passengers,
  // shoppers, neighbours, children, the old men at the chess board — wears its own clothes, which
  // is the point: a uniform only reads as one when most people are not in it.
  const ROLE = {
    '保安':'guard', '安检员':'screen',
    '售票员':'transit', '站务员':'transit',
    '空乘':'cabin', '登机员':'cabin', '地勤':'ramp',
    '厨师':'chef', '帮厨':'kitchen', '服务员':'waiter',
    '摊主':'vendor', '老板':'vendor',
    '药剂师':'coat', '医护':'coat', '医生':'coat', '护士':'coat',
    '导购员':'retail', '收银员':'retail',
    '外卖员':'rider', '快递员':'courier',
    '饲养员':'keeper', '扫地的':'sweeper',
    '老师':'staff', '同事':'staff', '照相的':'staff', '经理':'manager',
  };
  // 空乘二, 地勤二, 摊主三 — the roster numbers its duplicates, and a second flight attendant is
  // still a flight attendant.
  const NUM = /[一二三四五六七八九十]+$/;
  const roleKit = hz => {
    if (!hz) return null;
    return ROLE[hz] || ROLE[String(hz).replace(NUM, '')] || null;
  };

  // ------------------------------------------------------------------ carrying the field
  //
  // `makeLook` returns a fixed object; an unknown key in the spec never survives it. Wrapped here
  // rather than edited there, because figure.js is shared and this is one field. The wrapper
  // chains onto whatever is already installed and marks itself, so loading twice is harmless and
  // another file wrapping for its own field still works.
  try {
    if (typeof makeLook === 'function' && !makeLook.__uniform) {
      const inner = makeLook;
      const wrap = function (o) {
        const lk = inner(o);
        if (o && o.uniform) lk.uniform = o.uniform;
        return lk;
      };
      wrap.__uniform = true;
      globalThis.makeLook = wrap;
    }
  } catch (e) { /* someone froze the binding; the hz path below still dresses the cast */ }

  // The other half: the job off the roster row. A look does not know whose it is, but `NPCS` does,
  // and after `initNPC` has run each row's `look` *is* the resolved look object this file is handed
  // — so one pass over the roster is a map from look to job. Rebuilt only when the roster grows,
  // which it does when a room generates its own crowd, and resolved once per person: the answer is
  // cached on the look itself, so the steady-state cost of this is one property read per figure.
  let seen = -1, byLook = null;
  function jobOf(lk) {
    let roster = null;
    try { roster = (typeof NPCS !== 'undefined' && Array.isArray(NPCS)) ? NPCS : null; }
    catch (e) { return null; }                      // data.js has not run yet
    if (!roster) return null;
    if (roster.length !== seen) {
      seen = roster.length;
      byLook = new WeakMap();
      for (const n of roster)
        if (n && n.look && n.hz && !n.animal) byLook.set(n.look, n.hz);
    }
    return byLook.get(lk) || null;
  }

  const HEX = {};
  const col = h => HEX[h] || (HEX[h] = C(h));

  function kitOf(lk) {
    if (lk.__uni !== undefined) return lk.__uni;
    let name = lk.uniform || null;
    if (name) name = KITS[name] ? name : roleKit(name);
    else name = roleKit(jobOf(lk));
    const kit = (name && KITS[name]) || null;
    // Non-enumerable, so a look that gets serialised or copied does not carry a private cache
    // field into somebody else's save file.
    try { Object.defineProperty(lk, '__uni', { value: kit, writable: true, configurable: true }); }
    catch (e) { /* sealed look: resolve again next frame, which is only a map lookup */ }
    return kit;
  }

  // ------------------------------------------------------------------ where the cloth actually is
  //
  // `makeBody`'s own profile, in the mesh's local units: half-width and half-depth at twelve
  // heights up the torso. Copied rather than imported because gl.js keeps it inside a closure, and
  // it is the difference between placing a badge against the front of a chest and placing it at a
  // depth that looked about right on one figure and sank into the next one's coat.
  const PROF = [[-.50,.300,.230], [-.46,.335,.250], [-.38,.345,.255], [-.26,.340,.250],
                [-.12,.345,.250], [ .02,.360,.255], [ .16,.385,.258], [ .28,.400,.252],
                [ .37,.402,.238], [ .44,.368,.212], [ .48,.285,.168], [ .50,.175,.112]];
  function prof(t) {
    if (t <= PROF[0][0]) return PROF[0];
    for (let i = 1; i < PROF.length; i++) {
      const a = PROF[i - 1], b = PROF[i];
      if (t <= b[0]) {
        const k = (t - a[0]) / (b[0] - a[0]);
        return [t, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      }
    }
    return PROF[PROF.length - 1];
  }

  // ------------------------------------------------------------------ the builder
  FigureFit['uniform'] = X => {
    const lk = X.lk;
    const kit = kitOf(lk);
    if (!kit) return;

    const { shape, R, M, tint, mixc, F, lod, trim, torso, head, W, BODY, FABRIC } = X;
    const CLOTH = { mode: 7, gloss: 0.07 };         // the same weave figure.js gives a garment
    const PLATE = { mode: 1, gloss: 0.26, round: 0.008 };  // enamel: a badge, a name card
    const METAL = { gloss: 0.44 };

    // The outermost torso shell as figure.js left it: the shirt, or the gilet over it, or the
    // coat over that. Every measurement below is taken against this, and drawing a shell of my
    // own moves it — so a hem, a band or a badge added afterwards is placed against the garment
    // it is actually sitting on rather than against the shirt three layers down.
    let SX = lk.JACK ? .522 : lk.VEST ? .518 : .50;
    let SY = (lk.JACK || lk.VEST) ? .634 : .62;
    let SZ = lk.JACK ? .505 : lk.VEST ? .502 : .48;
    let CY = (lk.JACK || lk.VEST) ? .312 : .31, CZ = (lk.JACK || lk.VEST) ? -.002 : 0;
    // An apron is a flat panel hung 118 mm off the sternum and it is 27.5 mm thick, so anything
    // pinned to the chest of somebody wearing one has to clear 145 mm, not the 122 mm of the
    // chest underneath. figure.js draws it from `lk.apron`; this file may add one below.
    let apronTo = lk.apron ? .1455 : 0;

    const at = y => prof((y / BODY - CY) / SY);      // the profile row for a torso-space height
    const halfW = y => at(y)[1] * SX * W;
    const halfD = y => at(y)[2] * SZ * W;
    // The front face of the cloth at this height — the number a badge is stepped out from.
    const frontZ = y => {
      const z = CZ + halfD(y);
      return (apronTo && y > 0.03 && y < 0.57) ? Math.max(z, apronTo) : z;
    };

    // ---- shells ---------------------------------------------------------------------------
    //
    // The uniform's colour block, and the only part of any kit that survives to lod 2. Skipped
    // outright when the roster has already dressed this person in an outer layer: a second gilet
    // inside the first is three draws that nobody can see, and the roster's colour is a decision
    // somebody made on purpose. That colour then becomes the uniform's, so the trim matches it.
    const outer = lk.JACK || lk.VEST || null;
    let SHELL = outer;                               // what the trim should be keyed to
    function shell(c, long) {
      SX += .024; SZ += .024; CZ = -.002;
      if (long) { SY = .794; CY = .252; SX = Math.max(SX, .545); }
      else { SY += .006; CY += .001; }
      shape('body', torso, 0, CY * BODY, CZ, SX * W, SY * BODY, SZ * W, c, FABRIC);
    }
    // The sleeves and the shoulder balls belong to whichever layer figure.js resolved for the
    // arm, and that frame is not handed out — so a uniform cannot reach the sleeve. What it can
    // do is cap the shoulder, four millimetres proud of the deltoid, which lands the uniform's
    // colour on the top of the arm and leaves the rest of the sleeve reading as the shirt worn
    // under it. That is what a tabard, a tunic worn open and a chef's jacket all actually look
    // like from twelve metres, and it costs two draws at conversational range and none at all
    // in a crowd.
    function shoulders(c) {
      for (const s of [-1, 1])
        shape('ball', torso, s * 0.148 * W, 0.500 * BODY, -0.004,
              0.183 * W, 0.193 * BODY, 0.213 * W, c, FABRIC);
    }
    // A band round the body at a given height, standing `out` metres proud of whatever the
    // outermost shell is there. Hems and reflective bands are the same object.
    function girth(y, out, thick, c, mat) {
      shape('capsule', torso, 0, y, CZ, 2 * halfW(y) + out * 2, thick,
            2 * halfD(y) + out * 2, c, mat || CLOTH);
    }
    // An epaulette: the shoulder again, taller and much shallower, so it emerges only as a strip
    // along the top of the arm and disappears where it sinks back inside the ball. Narrower in x
    // than the shoulder it sits on as well — given the width too it comes out as a gold wedge on
    // the outside of the arm rather than as a bar along the top of it.
    function epaulettes(c) {
      for (const s of [-1, 1])
        shape('ball', torso, s * 0.150 * W, 0.500 * BODY, -0.004,
              0.176 * W, 0.210 * BODY, 0.150 * W, c, CLOTH);
    }
    // 袖章. High on the arm, where the swing has barely moved it: forty millimetres below the
    // shoulder joint a walking arm carries the cloth about fourteen millimetres, well inside the
    // band's own bore, so it does not saw through the sleeve at the top of a stride. Lower down
    // the arm — where an armband would sit on a real uniform — it would, and there is no forearm
    // frame in the context object to hang it from instead.
    function brassard(c, s) {
      shape('capsule', torso, s * 0.225 * W, 0.455 * BODY, 0,
            0.132 * W, 0.062 * BODY, 0.142 * W, c, CLOTH);
    }

    // ---- the 工牌 ---------------------------------------------------------------------------
    //
    // The one thing almost every job in this city has in common. Two cords from the neck down to
    // a card at the sternum: the cords are laid four millimetres into the cloth so they read as
    // lying on the chest rather than hovering over it, and the card is stepped a clear eleven
    // millimetres out from the front face of whatever is under it — the shirt, the coat, or the
    // apron, which is two centimetres further out again.
    function lanyard(cardC, cordC) {
      const cy = 0.455 * BODY, cz = (frontZ(0.545 * BODY) + frontZ(0.375 * BODY)) / 2 - 0.003;
      for (const s of [-1, 1])
        R.draw('capsule', M.mul(torso, M.mul(M.trans(s * 0.046, cy, cz),
          M.mul(M.rotZ(-s * 0.30), M.scale(0.018, 0.190 * BODY, 0.014)))), cordC, FABRIC);
      const by = 0.332 * BODY, bz = frontZ(by) + 0.016;
      shape('softBox', torso, 0, by, bz, 0.064, 0.088, 0.010, cardC, PLATE);
      // The card's coloured header. Four millimetres, not the centimetre the chest gets: both
      // faces here are ones this file placed itself and neither is an estimate of where somebody
      // else's curved surface came out, so the step only has to beat the depth buffer.
      if (lod === 0)
        shape('softBox', torso, 0, by + 0.026, bz + 0.004, 0.058, 0.028, 0.010,
              tint(cordC, 1.15), PLATE);
    }

    // ---- headwear -------------------------------------------------------------------------
    //
    // Only ever when the roster has not put a hat on this person already. When it has, the cap
    // gets the uniform's band and badge instead of a second cap inside the first.
    // How much room a hat has to leave for what is under it. `makeHair` grows its shell up to
    // 0.036 of the head's own units *outside* the skull — so a full head of hair reaches about
    // 96 mm across, 121 mm above centre and 100 mm in front of it, and a face seed can add
    // another five per cent to each. figure.js's own crowns were sized against the skull rather
    // than against that, which is invisible while the hat is nearly the colour of the hair and
    // very visible the moment it is white or orange: a ring of cloth with the fringe standing
    // through the top of it. Everything below is sized against the hair, with the crown pushed
    // 6 mm forward as well, because the shell's largest overhang is at the hairline.
    const hatted = !!lk.cap;
    function peakCap(c) {
      const HL = tint(c, 1.10), HD = tint(c, 0.88);
      shape('ball', head, 0, 0.040, 0.010, 0.240, 0.202, 0.234, c, { gloss: 0.10 });
      R.draw('softBox', M.mul(head, M.mul(M.trans(0, 0.062, 0.118),
        M.mul(M.rotX(0.26), M.scale(0.176, 0.020, 0.108)))), HD,
        { gloss: 0.10, round: 0.02 });
      if (trim) shape('ball', head, 0, 0.094, 0.010, 0.208, 0.092, 0.204, HL, { gloss: 0.10 });
    }
    // The band round a peaked cap, and the badge on the front of it.
    //
    // Both of these are placed off the cap figure.js actually draws rather than off the head: the
    // crown is an ellipsoid 117 mm across and 99 mm tall centred 40 mm above head centre, and the
    // peak hinges out of it at 62. The band therefore belongs at 48 — the base of the crown, just
    // under the peak — where the cap's own surface has only come in to 116.6 and a band at 122
    // stands five millimetres proud of it the whole way round. The first version put it at 16,
    // which is two millimetres above the eye: a navy ring straight across both eyes, and the
    // badge hung off the front of it floated over the bridge of the nose. A cap band is not
    // where the cap ends, it is where the *crown* ends.
    // `mine` says whether the crown under this band is the one `peakCap` just drew or the one
    // figure.js drew from `hat: 'cap'`, which is 6 mm further back and a little smaller. The band
    // and the badge are placed against whichever it is: a fixed pair of numbers fits one of them
    // and is either buried in or floating off the other.
    function capBand(c, badge, mine) {
      const zc = mine ? 0.010 : 0.004, rx = mine ? 0.120 : 0.117, rz = mine ? 0.117 : 0.114;
      shape('capsule', head, 0, 0.048, zc, 2 * (rx + 0.006), 0.038, 2 * (rz + 0.006), c, CLOTH);
      // And the badge above the peak, not below it. The peak's upper face runs from y 86 at the
      // hinge out to 58 at its tip, so anything on the front of the crown has to clear 95 — and
      // at 95 the crown has already come in to 84% of its waist, which is where the front is.
      if (badge)
        shape('softBox', head, 0, 0.095, zc + rz * 0.839 + 0.018, 0.046, 0.032, 0.016, badge,
              { mode: 1, gloss: 0.42, round: 0.008 });
    }
    // 厨师帽. A band round the skull and a straight-sided crown standing 120 mm above it, with
    // the puff on top at anything but the crowd tier. Tall is the whole point of the hat: pulled
    // down to a skull cap it is a kitchen hand's, which is a different job and is below.
    function toque(c) {
      shape('capsule', head, 0, 0.048, 0.010, 0.246, 0.052, 0.242, c, CLOTH);
      shape('cyl', head, 0, 0.132, 0.010, 0.240, 0.190, 0.236, c, CLOTH);
      if (trim) shape('ball', head, 0, 0.232, 0.010, 0.268, 0.112, 0.260, tint(c, 1.05), CLOTH);
    }
    // The kitchen hand's cap. Everything the toque is except the height, and the height is the
    // whole difference in rank. Its band sits at the same 48 as a peaked cap's: at 20 — which is
    // six millimetres above the eye — it came out as a white blindfold.
    function skullCap(c) {
      shape('ball', head, 0, 0.046, 0.010, 0.234, 0.200, 0.230, c, CLOTH);
      if (trim) shape('capsule', head, 0, 0.048, 0.010, 0.246, 0.034, 0.242, tint(c, .92), CLOTH);
    }
    // 耳罩. The headband is the skull again — wider and taller than the head, and only fifty
    // millimetres deep, so what emerges is an arc from one ear over the crown to the other and
    // nothing across the face or the back of the neck.
    function earDefenders(c) {
      shape('ball', head, 0, -0.004, F.headZ, 0.230, 0.264, 0.052, c, METAL);
      for (const s of [-1, 1])
        shape('ball', head, s * 0.100, F.earY + 0.006, -0.004, 0.072, 0.094, 0.080, c, METAL);
    }

    // ---- aprons, pouches and the small things ------------------------------------------------
    //
    // The apron is figure.js's own geometry, to the millimetre, so a roster entry that names
    // `apron:` and a kit that supplies one produce the same garment and neither has to know which
    // of them did it. Only the ties and the pocket below are new.
    function apron(c) {
      shape('softBox', torso, 0, 0.300 * BODY, 0.118, 0.360 * W, 0.560 * BODY, 0.055, c, CLOTH);
      apronTo = .1455;
      if (trim) {
        shape('capsule', torso, 0, 0.575 * BODY, 0.088, 0.150 * W, 0.030 * BODY, 0.030, c, CLOTH);
        // The waist tie, passing round the back: it is drawn narrower than the apron's own front
        // face on purpose, so it disappears behind the bib where a tie actually goes.
        girth(0.285 * BODY, 0.010, 0.034 * BODY, tint(c, 0.84));
      }
    }
    function pouch(c) {
      shape('softBox', torso, 0.052 * W, 0.115 * BODY, frontZ(0.115 * BODY) + 0.020,
            0.190, 0.115, 0.080, c, { mode: 7, round: 0.020 });
      if (lod === 0)
        shape('softBox', torso, 0.052 * W, 0.150 * BODY, frontZ(0.115 * BODY) + 0.026,
              0.180, 0.040, 0.074, tint(c, 1.14), { mode: 7, round: 0.014 });
    }

    // =========================================================================== the kits
    const c = h => col(h);

    // The colour block. `SHELL` ends up as whatever the uniform's colour actually is, so a guard
    // the roster already dressed in its own blue gets his epaulettes on that blue.
    if (kit.col && !outer) { SHELL = c(kit.col); shell(SHELL, kit.long); }
    else if (kit.col) SHELL = outer;
    if (kit.col && !outer && trim) shoulders(SHELL);
    if (kit.hem && SHELL && trim) girth(0.055 * BODY, 0.007, 0.034 * BODY, tint(SHELL, 0.82));

    // Hi-vis is not a colour, it is a colour with retroreflective banding on it: without the
    // bands the ground crew read as a man in a yellow shirt.
    if (kit.bands && trim) {
      const band = mixc(SHELL || c('#d6c23a'), c('#e9edf0'), 0.72);
      girth(0.200 * BODY, 0.008, 0.040 * BODY, band, { mode: 7, gloss: 0.40 });
      girth(0.330 * BODY, 0.008, 0.040 * BODY, band, { mode: 7, gloss: 0.40 });
    }

    // 双排扣. The chef's front: two plackets down the chest and the buttons on them. Nothing
    // else in this game says "kitchen" as economically, and it is the reason a white jacket
    // reads as a chef's rather than as a lab coat.
    if (kit.breast && trim) {
      const bz = frontZ(0.400 * BODY);
      for (const s of [-1, 1]) {
        shape('capsule', torso, s * 0.062, 0.400 * BODY, bz - 0.004,
              0.026, 0.300 * BODY, 0.020, c(kit.breast), CLOTH);
        if (lod === 0) for (const y of [0.300, 0.400, 0.500])
          shape('ball', torso, s * 0.062, y * BODY, frontZ(y * BODY) + 0.012,
                0.026, 0.026, 0.014, tint(c(kit.breast), 0.80), METAL);
      }
    }
    if (kit.lapel && trim) {
      // Against the coat's own opening rather than out on the chest, which is where a lapel
      // stops being a lapel and becomes a pair of pads.
      const lz = frontZ(0.450 * BODY);
      for (const s of [-1, 1])
        R.draw('softBox', M.mul(torso, M.mul(M.trans(s * 0.082, 0.450 * BODY, lz - 0.006),
          M.mul(M.rotZ(s * 0.20), M.scale(0.088, 0.300 * BODY, 0.024)))), c(kit.lapel),
          { mode: 7, round: 0.010 });
    }
    if (kit.pocket && trim)
      shape('softBox', torso, -0.098 * W, 0.290 * BODY, frontZ(0.290 * BODY) + 0.014,
            0.110, 0.110, 0.020, c(kit.pocket), { mode: 7, round: 0.010 });

    if (kit.ep && trim) epaulettes(c(kit.ep));
    if (kit.brassard && trim) brassard(c(kit.brassard), -1);

    // Headwear. The cap band only goes on a cap — put on a beanie or a sun hat it is a stripe
    // across a shape that has no band, and on a hard hat it is a stripe across the brim.
    if (kit.cap && !hatted) {
      peakCap(c(kit.cap));
      if (trim) capBand(tint(c(kit.cap), 0.80), kit.capBadge && c(kit.capBadge), true);
    } else if (kit.cap && lk.hat === 'cap' && trim)
      capBand(tint(c(kit.cap), 0.80), kit.capBadge && c(kit.capBadge), false);
    else if (kit.capBadge && lk.hat === 'cap' && trim)
      capBand(tint(SHELL || c('#2b3948'), 0.72), c(kit.capBadge), false);
    if (kit.toque && !hatted) toque(c(kit.col));
    if (kit.skullcap && !hatted) skullCap(c(kit.skullcap));
    if (kit.ears && trim) earDefenders(c(kit.ears));

    // 围巾. The cabin-crew scarf and the shop assistant's are the same object: a silk band at the
    // throat with the knot off to one side. It is deliberately much smaller than figure.js's
    // winter scarf, which is wound twice round the neck and hangs to the waist.
    if (kit.scarf && !lk.SCARF && trim) {
      const s = c(kit.scarf);
      shape('capsule', torso, 0, (F.collarY + 0.028) * BODY, 0.006, 0.106, 0.038, 0.108, s, CLOTH);
      shape('ball', torso, -0.030, (F.collarY + 0.008) * BODY, 0.062, 0.052, 0.048, 0.044,
            tint(s, 0.92), CLOTH);
    }
    if (kit.wings && lod === 0)
      shape('softBox', torso, 0.078 * W, 0.470 * BODY, frontZ(0.470 * BODY) + 0.014,
            0.062, 0.020, 0.012, c(kit.wings), { mode: 1, gloss: 0.50, round: 0.006 });
    if (kit.pin && lod === 0)
      shape('ball', torso, 0.070 * W, 0.470 * BODY, frontZ(0.470 * BODY) + 0.012,
            0.026, 0.026, 0.014, c(kit.pin), METAL);

    // 工牌. Left off anybody the roster already gave a `badge:` to — that is a name plate on the
    // chest and this would be a second one hanging under it — and off anybody js/fig-acc.js is
    // already hanging one on, which it does from `acc: 'lanyard'`. Two cards on one chest is the
    // one failure mode a shared wardrobe has that a single file does not.
    const wornTag = lk.BADGE || (lk.ACC && lk.ACC.lanyard);
    if (kit.tag && !wornTag && trim) lanyard(c(kit.tag), c(kit.cord || '#4a4f57'));

    // Same rule as the 工牌: figure.js draws one from `lk.apron` and js/fig-acc.js draws one from
    // `acc: 'apron'`, and either of those is this person's apron already.
    if (kit.apron && !lk.apron && !(lk.ACC && lk.ACC.apron)) apron(c(kit.apron));
    else if (kit.apron) apronTo = .1455;
    if (kit.pouch && trim) pouch(c(kit.pouch));
    if (kit.towel && trim)
      shape('softBox', torso, -0.130 * W, 0.140 * BODY, 0.070, 0.130, 0.190, 0.045,
            c(kit.towel), { mode: 7, round: 0.020 });
    // 点菜本. The pad rides on the apron if there is one, which is 27 mm further out than the
    // chest — hence the pocket depth being asked for rather than assumed.
    if (kit.pad && lod === 0) {
      const pz = frontZ(0.250 * BODY);
      shape('softBox', torso, 0.120 * W, 0.250 * BODY, pz + 0.014, 0.090, 0.120, 0.018,
            c(kit.pad), { mode: 7, round: 0.006 });
      shape('capsule', torso, 0.150 * W, 0.290 * BODY, pz + 0.020, 0.014, 0.090, 0.014,
            c('#2b3138'), METAL);
    }

    // ---- livery -----------------------------------------------------------------------------
    //
    // 「鹊送」 and 「云驿」, both invented. A brand at this size is a colour and a mark: a stripe
    // over the helmet and a chevron on the chest, which is what you can actually see of a rider
    // going past the end of an alley. The stripe is the helmet redrawn narrow and slightly
    // larger — a straight bar laid over that dome floats at both ends.
    if (kit.mark && trim) {
      const m = c(kit.mark);
      if (lk.hat === 'hard')
        shape('ball', head, 0, 0.090, 0.004, 0.072, 0.184, 0.242, m, { gloss: 0.34 });
      const mz = frontZ(0.430 * BODY);
      for (const s of [-1, 1])
        R.draw('softBox', M.mul(torso, M.mul(M.trans(s * 0.026, 0.430 * BODY, mz + 0.014),
          M.mul(M.rotZ(s * 0.62), M.scale(0.062, 0.020, 0.012)))), m,
          { mode: 1, gloss: 0.20, round: 0.006 });
    }
  };

  // Handles for the roster owners and for anybody debugging this from a console. Hung off the
  // builder rather than added to `FigureFit`, whose every value is called as a builder.
  FigureFit['uniform'].kits = KITS;
  FigureFit['uniform'].roles = ROLE;
})();
