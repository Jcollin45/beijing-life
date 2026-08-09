// A skeleton, posed.
//
// This is the piece that decides whether changing the character rig costs weeks or months. The
// primitive rig in figure.js is not really "a way of drawing people" — most of it is a way of
// *posing* people, and that part is worth keeping whatever the geometry turns out to be:
//
//   gaitPose      a walk cycle with stride length, foot plant and hip sway solved against speed
//   armTo         a two-bone IK solve that puts a hand on a door handle or a bowl
//   activityPose  twenty-six things a person can be doing — eating, reading, sitting, reaching
//   traitPose     the mannerisms that make one neighbour read differently from another
//
// Every one of those produces *joint angles*. A skeleton consumes joint angles. So the geometry
// can be replaced without any of that being thrown away, which is the whole argument for doing
// this rather than starting again.
//
// What this file does is the arithmetic in between: local joint transforms up the parent chain
// into world space, then multiplied by each joint's inverse bind matrix, which is the matrix the
// shader wants. Nothing here knows what a leg is; that mapping lives with the poses.
const Rig = (() => {

  // glTF stores a joint's rest transform on its node and its parent in the node tree. A pose is
  // therefore a set of *overrides*: give this joint a different local matrix and everything
  // below it in the chain follows, which is exactly how a skeleton is supposed to behave.
  //
  // `over` is an optional array of 16-float local matrices, indexed the same as rig.joints.
  // A hole in it means "use the rest transform for this joint", so a pose that only knows about
  // the legs leaves the arms where the artist put them.
  function matrices(rig, over, out) {
    const n = rig.bones;
    out = out || new Float32Array(n * 16);
    // These matrices used to be allocated twice per bone, per posed resident, per frame: once
    // for the parent/local product and once for its inverse-bind product. A dozen 65-bone street
    // residents therefore produced more than ninety thousand short-lived typed arrays a second,
    // and the collector pauses showed up as intermittent slow frames. The arithmetic and order
    // stay identical; only the destinations now live with the rig and are reused.
    const world = rig._world || (rig._world = []);
    for (let i = world.length; i < n; i++) world[i] = new Float32Array(16);
    const skin = rig._skinScratch || (rig._skinScratch = new Float32Array(16));
    // Parents before children. glTF does not promise the joint list is in topological order, and
    // a child resolved before its parent silently inherits last frame's transform — which looks
    // like a limb lagging one frame behind the body and is very hard to see and very hard to
    // explain. So the order is computed once and kept.
    const order = rig._order || (rig._order = topo(rig.parent));
    for (const i of order) {
      const local = (over && over[i]) || rig.local[i];
      const p = rig.parent[i], w = world[i];
      if (p >= 0) M.mul(world[p], local, w);
      else w.set(local);
      M.mul(w, rig.ibm[i], skin);
      out.set(skin, i * 16);
    }
    return out;
  }

  function topo(parent) {
    const n = parent.length, done = new Uint8Array(n), order = [];
    let guard = 0;
    while (order.length < n && guard++ < n + 2) {
      for (let i = 0; i < n; i++) {
        if (done[i]) continue;
        const p = parent[i];
        if (p < 0 || done[p]) { done[i] = 1; order.push(i); }
      }
    }
    // A cycle would loop forever; take what resolved and let the rest fall back to rest pose.
    for (let i = 0; i < n; i++) if (!done[i]) order.push(i);
    return order;
  }

  // Rest pose: every joint at the transform the model was authored in. Multiplied by the inverse
  // bind matrix this is the identity, so the mesh comes out exactly as the artist built it —
  // which makes it the right thing to draw first, because anything wrong at this point is a
  // parsing or upload bug rather than a posing one.
  function bind(rig) { return matrices(rig, null); }

  // A joint rotation, in the local frame, as the poses already express them. Kept here so a
  // pose never has to build a matrix itself.
  const rotX = a => M.rotX(a), rotY = a => M.rotY(a), rotZ = a => M.rotZ(a);
  // Rest transform with a rotation applied on top of it, which is what "bend this joint by x"
  // means on a skeleton whose bones are not axis-aligned in the first place.
  function bend(rig, i, rot) { return M.mul(rig.local[i], rot); }

  // Rotation about an arbitrary unit axis, which M does not have and which exactly one thing
  // here needs: the twist of a forearm about its own length. Column-major, same convention as
  // the rest of M. A zero-length axis returns null rather than the degenerate matrix the
  // Rodrigues form produces for one, because that matrix scales the limb instead of turning it.
  // Turn a joint about an axis given in its *parent's* orientation, pivoting on the joint's own
  // origin. Post-multiplying turns a joint about itself but only about its own rolled axes;
  // pre-multiplying gets the axis right and the pivot catastrophically wrong — it swings the
  // whole bone around its parent's origin, so a shoulder brought down through 74 degrees takes
  // the arm off the body and hangs it in the air beside it, with the bone pointing the correct
  // way the entire time. That is the failure this exists to avoid, and it is invisible in any
  // test that measures directions rather than positions.
  function turnAt(m, ax, a) {
    if (!a) return m;
    const q = rotAbout(ax[0], ax[1], ax[2], a);
    if (!q) return m;
    const m0 = Float32Array.from(m);
    m0[12] = m0[13] = m0[14] = 0;              // the joint's rest rotation and scale, no offset
    const out = M.mul(q, m0);
    out[12] = m[12]; out[13] = m[13]; out[14] = m[14];
    return out;
  }
  function rotAbout(x, y, z, a) {
    const l = Math.hypot(x, y, z);
    if (l < 1e-9) return null;
    x /= l; y /= l; z /= l;
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c, o = new Float32Array(16);
    o[0] = t * x * x + c;     o[1] = t * x * y + s * z; o[2] = t * x * z - s * y;
    o[4] = t * x * y - s * z; o[5] = t * y * y + c;     o[6] = t * y * z + s * x;
    o[8] = t * x * z + s * y; o[9] = t * y * z - s * x; o[10] = t * z * z + c;
    o[15] = 1;
    return o;
  }

  // ---------------------------------------------------------------- which joint is which
  //
  // A skeleton arrives with names, not roles, and every exporter names things differently. This
  // matches by pattern once per rig and caches the result, so the poses can talk about "the left
  // knee" without knowing what this particular artist called it.
  //
  // A role that does not match is -1 and is simply skipped, so a rig with no toes, or with a
  // three-bone spine where this one has two, still poses as far as it can rather than throwing.
  // Mixamo names every skeleton it produces identically — `mixamorig:LeftUpLeg`, `LeftLeg`,
  // `LeftFoot`, `LeftArm`, `LeftForeArm`, `Spine`/`Spine1`/`Spine2`, `Neck`, `Head`. That is a
  // documented convention rather than one artist's habit, so it is worth matching for directly:
  // any character exported from there poses correctly the moment it is dropped in, with no
  // per-asset mapping work at all. Tried first because its names are unambiguous.
  //
  // `handL`/`handR` are matched not to be posed but to be measured: the hand's rest offset is
  // what says which way the forearm runs, and that is the axis a wrist twist turns about.
  // `eyeL`/`eyeR` are absent from Mixamo and present on a Ready Player Me avatar, which is the
  // whole difference between a figure that can look at you and one that cannot.
  const MIXAMO = {
    pelvis: /Hips$/i,      spine: /Spine1$/i,     chest: /Spine2$/i,
    neck:   /Neck$/i,      head:  /Head$/i,
    thighL: /LeftUpLeg$/i, kneeL: /LeftLeg$/i,    ankleL: /LeftFoot$/i,
    thighR: /RightUpLeg$/i,kneeR: /RightLeg$/i,   ankleR: /RightFoot$/i,
    shoulderL: /LeftArm$/i,  elbowL: /LeftForeArm$/i,  handL: /LeftHand$/i,
    shoulderR: /RightArm$/i, elbowR: /RightForeArm$/i, handR: /RightHand$/i,
    eyeL: /LeftEye$/i, eyeR: /RightEye$/i,
    // Not posed — measured. Which way a character faces is not written down anywhere in a glTF
    // file, and every arm correction below depends on knowing it. The toe is forward of the
    // ankle on every biped there has ever been, and that is the whole of the test.
    toeL: /LeftToe(Base|_End)$/i,
  };
  // The finger chains, as a list rather than as roles: `grip` is one number and it closes all of
  // them at once, so there is nothing to be gained by naming twenty joints. `4` is the tip on a
  // Mixamo hand and has no bone below it to bend, so it is matched out — curling it kinks the
  // hand at the fingernail.
  const FINGER = /Hand(Thumb|Index|Middle|Ring|Pinky)([123])$/i;

  // ---------------------------------------------------------------- how the arms are bound
  //
  // `armAxis: 'z', armDrop: 1.30` was a measured number: somebody rendered a character, looked at
  // it, and turned the shoulders about one guessed axis until the arms were by its sides. That
  // works exactly once, and it did — on the soldier it was measured against. Run the arithmetic
  // on the woman the game would actually cast and rotating her shoulder about its local z by 1.30
  // moves the world direction of her upper arm from (1.00, -0.02, 0.01) to (1.00, 0.01, 0.01).
  // Her arms do not come down at all. They sweep round in the horizontal plane, because that
  // export rolled the arm bones differently and z is very nearly *along* her humerus. The
  // T-pose fix was never fixed for her; it was fixed for him, and she has been standing in the
  // diner with an arm out ever since.
  //
  // None of this has to be guessed at. The bind pose contains the answer to all of it:
  //
  //   which way the character faces      the toe is in front of the ankle. Every biped, always.
  //   how far the arm is from hanging    the angle between the humerus and straight down
  //   which axis brings it down          the cross product of those two, which is a line, not
  //                                      one of three letters somebody has to pick between
  //   which axis it swings fore and aft  up × forward, the body's own left-right line
  //   which axis the elbow hinges on     the same line, carried into the corrected arm's frame
  //   which axis the forearm twists on   the hand's rest offset *is* the forearm
  //
  // Measured once per rig at load, applied by pre-multiplication, because every one of those axes
  // is fixed in the *body* rather than in the arm: a shoulder already swung forward still abducts
  // about the same line through the collarbone. Verified against all three real skeletons in the
  // project — a Mixamo T-pose facing +z, another facing −z, and a Ready Player Me A-pose — and all
  // three come out holding their arms at (±0.26, −0.97, 0), which is what a hanging arm is.
  //
  // An arm at rest is not perfectly vertical, but the old fifteen-degree clearance read as a
  // permanent half-raised pose once realistic shoulder widths replaced the primitive body. Keep
  // a modest eight degrees so hands clear coats and hips while visibly resting beside the body.
  // Nearly vertical. The previous eight-degree clearance was still visible across a crowd as a
  // mild T/zombie pose; two degrees keeps hands clear of the hip without holding elbows out.
  const REST_OUT = 0.035;                    // radians an arm hangs away from the body at rest
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
                           a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1;
                      return [v[0] / l, v[1] / l, v[2] / l]; };
  const posOf = m => [m[12], m[13], m[14]];
  // A world direction written in the frame of a joint. The rotation columns are normalised first
  // so this stays correct on the uniform scale every one of these skeletons carries above its
  // root — a centimetre armature under a metre scene, most often.
  function inFrame(m, v) {
    const a = norm([m[0], m[1], m[2]]), b = norm([m[4], m[5], m[6]]),
          c = norm([m[8], m[9], m[10]]);
    return [dot(a, v), dot(b, v), dot(c, v)];
  }
  // One arm. `rest`/`abd` and `swing` are in the shoulder's parent frame; `hinge` is in the upper
  // arm's frame once the rest correction is in it, which is where the forearm's own transform
  // hangs. Returns null when the skeleton has not got the joints to measure from.
  function measureArm(rig, shoulder, elbow, left, forward) {
    if (shoulder < 0 || elbow < 0) return null;
    const W = rig._world;
    const s = posOf(W[shoulder]), e = posOf(W[elbow]);
    const d = norm(sub(e, s));
    // Out from the body, along the ground: an arm bound straight down has no such direction of
    // its own, so it borrows the side it is on.
    let h = [d[0], 0, d[2]];
    h = Math.hypot(h[0], 0, h[2]) < 1e-4 ? (dot(d, left) >= 0 ? left : left.map(v => -v)) : norm(h);
    const c = Math.cos(REST_OUT), sn = Math.sin(REST_OUT);
    const target = norm([h[0] * sn, -c, h[2] * sn]);
    const rest = Math.acos(Math.max(-1, Math.min(1, dot(d, target))));
    const abdW = norm(cross(d, target));
    const above = rig.parent[shoulder] >= 0 ? W[rig.parent[shoulder]] : null;
    const par = above || M.ident(new Float32Array(16));
    const abd = inFrame(par, abdW), swing = inFrame(par, left);
    // Where the upper arm ends up once the correction is in, so the elbow's hinge can be written
    // in the frame it will actually be turning in.
    const armW = M.mul(par, turnAt(rig.local[shoulder], abd, rest));
    return { abd, rest, swing, hinge: inFrame(armW, left), forward };
  }
  // Both arms, plus the facing they are measured against.
  function measureArms(rig, R) {
    matrices(rig, null);                     // fills rig._world with the bind pose
    let forward = [0, 0, 1];
    if (R.ankleL >= 0 && R.toeL >= 0) {
      const d = sub(posOf(rig._world[R.toeL]), posOf(rig._world[R.ankleL]));
      d[1] = 0;
      if (Math.hypot(d[0], 0, d[2]) > 1e-5) forward = norm(d);
    }
    const left = norm(cross([0, 1, 0], forward));
    return { L: measureArm(rig, R.shoulderL, R.elbowL, left, forward),
             R: measureArm(rig, R.shoulderR, R.elbowR, left, forward) };
  }

  function roles(rig) {
    if (rig._roles) return rig._roles;
    const f = re => rig.names.findIndex(n => re.test(n));
    const fingers = [];
    rig.names.forEach((n, i) => {
      const m = FINGER.exec(n);
      if (m) {
        const side = /LeftHand/i.test(n) ? 'L' : /RightHand/i.test(n) ? 'R' : null;
        fingers.push({ i, n: +m[2], thumb: /thumb/i.test(m[1]),
          digit:m[1].toLowerCase(), side });
      }
    });
    // The middle metacarpal runs down the centre of the palm. Its first finger joint is the
    // knuckle end of that line; halfway from the wrist joint to it is therefore a skeleton-scaled
    // palm centre, independent of hand size, export scale or which way the rig faces.
    const palmBase = side => {
      const fg = fingers.find(v => v.side === side && v.n === 1 && v.digit === 'middle');
      return fg ? fg.i : -1;
    };
    const palmBaseL = palmBase('L'), palmBaseR = palmBase('R');
    // A Mixamo rig announces itself in its bone names; take that map whole rather than trying
    // the generic patterns, which would match some of its bones and not others.
    //
    // The second test is the one that matters for anything that did not come out of Mixamo. A
    // Ready Player Me avatar carries exactly the same bone *suffixes* without the `mixamorig:`
    // prefix, so the same map fits it perfectly — but the prefix test above is a substring match
    // on that prefix, so it fell through to the Cesium patterns and matched not one single joint.
    // Every role was -1, every `set` was skipped, and the avatar rendered in its bind pose no
    // matter what pose it was handed. Recognising a humanoid by its skeleton rather than by its
    // exporter's watermark is what fixes it, and it is what will fit the next one too.
    if (rig.names.some(n => /mixamorig/i.test(n)) ||
        (f(/^Hips$/i) >= 0 && f(/^Spine2$/i) >= 0 && f(/^LeftForeArm$/i) >= 0)) {
      const out = { fingers, palmBaseL, palmBaseR };
      for (const k in MIXAMO) out[k] = f(MIXAMO[k]);
      // This family binds with the arms out — a T-pose from Mixamo, an A-pose from Ready Player
      // Me — and this project's poses are swings added to arms that already hang. That is a
      // property of how the asset was authored rather than of any one character, so the family
      // gets the correction by default, measured off its own bind pose.
      //
      // Merged into whatever axis config the loader already put there, not substituted for it.
      // assets.js sets `axis` unconditionally — `RIG_AXIS[name] || {bend:'x',sign:1}` — so a rig
      // always arrives with one, and a guard of the form `if (!rig.axis)` can never fire. That is
      // why the first character to reach this code still stood in a T-pose after the fix that was
      // supposed to drop its arms: the default was written and never read.
      //
      // An explicit `armDrop` still wins outright and still takes the old one-axis path, because
      // a number somebody measured against a picture is worth keeping the moment it disagrees
      // with this — and because two harness probes are written in those terms.
      const ax0 = rig.axis || (rig.axis = {});
      if (ax0.armDrop === undefined && !ax0.armRest) ax0.armRest = measureArms(rig, out);
      return (rig._roles = out);
    }
    return (rig._roles = {
      fingers, palmBaseL, palmBaseR,
      pelvis: f(/torso.*_1$/i),  spine: f(/torso.*_2$/i),  chest: f(/torso.*_3$/i),
      neck:   f(/neck.*_1$/i),   head:  f(/neck.*_2$/i),
      thighL: f(/leg.*L_1$/i),   kneeL: f(/leg.*L_2$/i),   ankleL: f(/leg.*L_3$/i),
      thighR: f(/leg.*R_1$/i),   kneeR: f(/leg.*R_2$/i),   ankleR: f(/leg.*R_3$/i),
      shoulderL: f(/arm.*L__4_$/i), elbowL: f(/arm.*L__3_$/i), handL: f(/arm.*L__2_$/i),
      shoulderR: f(/arm_joint_R$/i), elbowR: f(/arm.*R__2_$/i), handR: f(/arm.*R__3_$/i),
      eyeL: -1, eyeR: -1,
    });
  }

  // ---------------------------------------------------------------- which axis is which
  //
  // "Bend the knee" is a rotation about whichever local axis *this* skeleton's knee happens to
  // use, and one letter for the whole rig only holds while every joint agrees. On Mixamo they
  // do: every bone is exported with a near-identity local rotation, so a bone's own frame is x
  // across, y along the bone and z forward, all the way down the chain. That is a property of
  // one exporter, though, and a rig whose forearms twist about y and whose knees bend about -z
  // has had no way at all to say so.
  //
  // So a channel is named by what the angle *means* rather than by an axis:
  //   bend   flexion — a knee, an elbow, a thigh swinging forward, a torso leaning
  //   turn   yaw — a head looking left, the shoulders turning under it, the hips
  //   tilt   roll — a torso banking into a corner
  // and each resolves in three steps, most specific first:
  //   ax.joint.kneeL.bend / .bendSign    this joint, this channel
  //   ax.bend / ax.sign                  the rig
  //   'x', +1                            the default, which is what Mixamo wants
  //
  // `bend` and `sign` keep their old names because the loader, both audit probes and every
  // caller already write them; `turn`/`turnSign` and `tilt`/`tiltSign` are the new pair.
  const AXIS = { x: rotX, y: rotY, z: rotZ };
  const CHAN = { bend: ['x', 'sign'], turn: ['y', 'turnSign'], tilt: ['z', 'tiltSign'] };
  function chan(ax, role, kind) {
    const d = CHAN[kind] || CHAN.bend;
    const per = role && ax.joint && ax.joint[role];
    const letter = (per && per[kind]) || ax[kind] || d[0];
    const sgn = per && per[kind + 'Sign'] !== undefined ? per[kind + 'Sign']
              : ax[d[1]] !== undefined ? ax[d[1]] : 1;
    const fn = AXIS[letter] || AXIS[d[0]];
    return a => fn(a * sgn);
  }

  // ---------------------------------------------------------------- a pose, onto a skeleton
  //
  // The whole point of the exercise. `p` is a pose straight out of figure.js — gaitPose,
  // activityPose, whatever produced it — and every field it carries is a joint angle, so this is
  // a lookup and a rotation rather than a rewrite of anything.
  //
  // `axis` is per-rig and has to be found by looking, not reasoning: the bones of a downloaded
  // skeleton point wherever the artist left them, so "bend the knee" is a rotation about
  // whichever local axis that rig happens to use. It is a property of the asset, not of the pose,
  // which is why it lives beside the role map and not in the poses.
  function fromPose(rig, p, axis) {
    const R = roles(rig), over = [], ax = axis || rig.axis || {};
    // Resolved once per call rather than once per joint. Three closures a frame is nothing;
    // twenty-five of them per figure per frame is garbage for a street full of people. A rig
    // with a per-joint table pays for the joints it actually overrides and no others.
    const gBend = chan(ax, null, 'bend'), gTurn = chan(ax, null, 'turn'),
          gTilt = chan(ax, null, 'tilt'), perJoint = ax.joint;
    const C = (role, kind) => perJoint && perJoint[role] ? chan(ax, role, kind)
            : kind === 'turn' ? gTurn : kind === 'tilt' ? gTilt : gBend;
    const set = (slot, role, a) => {
      if (slot >= 0 && a) over[slot] = M.mul(rig.local[slot], C(role, 'bend')(a));
    };
    // Legs. figure.js's convention, stated in its own comment: a negative thigh swings the leg
    // forward and a negative knee bends it, so the knee arrives already negated.
    set(R.thighL, 'thighL', -p.thighL); set(R.kneeL, 'kneeL', p.kneeL);
    set(R.ankleL, 'ankleL', p.ankleL);
    set(R.thighR, 'thighR', -p.thighR); set(R.kneeR, 'kneeR', p.kneeR);
    set(R.ankleR, 'ankleR', p.ankleR);

    // The root, which is not a bend at all.
    //
    // `bob`, `sway` and `hipYaw` are what the pelvis does *in the world* — the vault up over the
    // stance leg, the weight going out over the stance foot, the hips rotating with the swinging
    // leg — and in the primitive figure they live on the model matrix. Here the model matrix
    // belongs to the caller, so they go on the pelvis instead, and they go on it *before* its own
    // transform rather than after: `rig.local[pelvis]` already carries whatever plain nodes sat
    // above the skeleton in the file (a Z-up correction, an armature quarter-turn, a centimetre
    // scale), so post-multiplying would apply a metre of sway in whatever frame those left
    // behind — sideways, upside down or a hundred times too far. Pre-multiplying puts it in the
    // file's scene space, which glTF fixes as Y-up and metres.
    //
    // `unit` is the one thing that does not carry over for free. `bob` is derived in figure.js
    // from *its* thigh and shin lengths, so a rig with longer legs rises slightly too little over
    // its stance leg. It is a few millimetres across a stride and one scalar per asset fixes it.
    //
    // Sway and hip yaw share a sign with `turn`, and share it on purpose: a skeleton authored
    // facing the other way needs its yaw and its lateral shift flipped together, and one knob
    // that cannot be set inconsistently is worth more than two that can.
    const turnS = ax.turnSign === undefined ? 1 : ax.turnSign;
    const unit = ax.unit === undefined ? 1 : ax.unit;
    const lift = ((p.bob || 0) - (p.rootDrop || 0)) * unit;
    const sway = (p.sway || 0) * unit * turnS, hipYaw = (p.hipYaw || 0) * turnS;
    if (R.pelvis >= 0 && (lift || sway || hipYaw)) {
      let pre = M.trans(0, lift, 0);
      if (hipYaw) pre = M.mul(pre, M.rotY(hipYaw));
      if (sway) pre = M.mul(pre, M.trans(sway, 0, 0));
      over[R.pelvis] = M.mul(pre, rig.local[R.pelvis]);
    }

    // Arms, and the reason they need more than `set`.
    //
    // `set` leaves a joint at its rest transform when the pose has nothing to say about it, which
    // is right for a leg and wrong for a downloaded arm. A downloadable character is bound with
    // its arms out — a T-pose from Mixamo, an A-pose from Ready Player Me — and figure.js's poses
    // were written against this project's own rig, whose arms hang at rest, so `shL` and `shR` are
    // small swings *added to a hanging arm*. Apply them to a T-pose and you get a T-pose with a
    // small swing in it, which is exactly what the first render of a real character showed: legs
    // walking correctly under a man holding his arms straight out.
    //
    // So the arm needs a rest *offset* before the pose is applied. Where that offset comes from is
    // the whole argument of the block above: measured off the bind pose per arm, about an axis
    // that is a line rather than a letter. `ax.armRest` is that measurement.
    //
    // The twist of the forearm — `twL`/`twR`, the joint that decides which way a palm faces — is
    // the other thing that arrives here for the first time. `armTo` already solves it, because the
    // shoulder and elbow are both spent getting the hand to a place and the twist is the only
    // freedom left that says how it is turned when it gets there, and nothing has ever read it.
    // Its axis is not guessed at either: the hand's rest translation *is* the forearm, written in
    // the forearm's own frame, so normalising it gives the axis exactly on any rig. It is the one
    // rotation here that is post-multiplied, because a twist is about the limb and not the body.
    const AR = ax.armDrop === undefined ? ax.armRest : null;
    const mir = ax.armMirror ? -1 : 1;
    const twS = ax.twistSign === undefined ? 1 : ax.twistSign;
    // The measured path. Every angle goes in with figure.js's own sign and no per-rig correction,
    // which is the point of measuring: the axes were derived from the body's own front, so
    // "positive swings the arm backward" is true of any skeleton rather than of one export.
    //
    // Splay — `shLz`/`shRz`, how far the arm is held out from the body — has been ignored until
    // now, which is why every reach this rig has done has put the hand at the right height and the
    // wrong distance out from the shoulder. figure.js writes outward as −shLz on the left and
    // +shRz on the right. The right-hand caller mirrors that value so both arms arrive here with
    // outward negative; adding it to the measured drop leaves the upper arm farther from vertical.
    const armMeasured = (r, shoulder, elbow, hand, splayOut, swing, elb, tw) => {
      if (!r || shoulder < 0) return false;
      // figure.js writes outward splay as negative on the left and positive on the right.  The
      // caller mirrors the right value into that same signed frame, so adding it here preserves
      // the authored direction.  Subtracting it inverted every imported shoulder: a pose asking
      // an arm to clear the torso drove it inward instead, which made ordinary activity blends
      // bunch both forearms unnaturally in front of the body.
      over[shoulder] = turnAt(turnAt(rig.local[shoulder], r.abd, r.rest + splayOut), r.swing, swing);
      if (elbow < 0 || (!elb && !tw)) return true;
      let f = rig.local[elbow];
      if (tw && hand >= 0) {
        const h = rig.local[hand], q = rotAbout(h[12], h[13], h[14], tw);
        if (q) f = M.mul(f, q);
      }
      over[elbow] = turnAt(f, r.hinge, elb);
      return true;
    };
    // The measured-off path, kept for a rig that names an `armDrop` outright. One angle about one
    // cardinal axis, mirrored between the sides by `armMirror` — which has to be a setting rather
    // than an assumption, because whether mirroring is right depends on whether the exporter
    // mirrored the local frames of the two arm bones, and Mixamo does not. Also the path a rig
    // with no measurement at all takes, where the drop is zero and this is a plain swing: that is
    // what the axis-probe skeleton does, and it behaves exactly as it did before any of this.
    const armFixed = (slot, role, drop, splay, swing) => {
      if (slot < 0) return;
      const armRot = AXIS[ax.armAxis] || rotZ, s = drop + splay;
      if (!s && !swing) return;
      let m = rig.local[slot];
      if (s) m = M.mul(m, armRot(s));
      if (swing) m = M.mul(m, C(role, 'bend')(swing));
      over[slot] = m;
    };
    const foreFixed = (slot, hand, role, e, tw) => {
      if (slot < 0 || (!e && !tw)) return;
      let m = rig.local[slot];
      if (e) m = M.mul(m, C(role, 'bend')(e));
      if (tw && hand >= 0) {
        const h = rig.local[hand], q = rotAbout(h[12], h[13], h[14], tw);
        if (q) m = M.mul(m, q);
      }
      over[slot] = m;
    };
    if (!armMeasured(AR && AR.L, R.shoulderL, R.elbowL, R.handL,
                     p.shLz || 0, p.shL || 0, p.elbL || 0, (p.twL || 0) * twS)) {
      const dRaw = ax.armDrop;
      const dropL = Array.isArray(dRaw) ? (dRaw[0] || 0)
                  : dRaw && typeof dRaw === 'object' ? (dRaw.L || 0) : (dRaw || 0);
      armFixed(R.shoulderL, 'shoulderL', dropL, p.shLz || 0, p.shL || 0);
      foreFixed(R.elbowL, R.handL, 'elbowL', p.elbL || 0, (p.twL || 0) * twS);
    }
    if (!armMeasured(AR && AR.R, R.shoulderR, R.elbowR, R.handR,
                     -(p.shRz || 0), p.shR || 0, p.elbR || 0, (p.twR || 0) * twS)) {
      const dRaw = ax.armDrop;
      const dropR = Array.isArray(dRaw) ? (dRaw.length > 1 ? (dRaw[1] || 0) : (dRaw[0] || 0) * mir)
                  : dRaw && typeof dRaw === 'object'
                    ? (dRaw.R === undefined ? (dRaw.L || 0) * mir : dRaw.R)
                  : (dRaw || 0) * mir;
      armFixed(R.shoulderR, 'shoulderR', dropR, (p.shRz || 0) * -mir, p.shR || 0);
      foreFixed(R.elbowR, R.handR, 'elbowR', p.elbR || 0, (p.twR || 0) * -mir * twS);
    }

    // Fingers. `grip` is one number, 0 open to 1 shut, and every skeleton worth downloading
    // carries the three-bone chains to spend it on — sixty of Michelle's sixty-five joints are
    // hand. Curling them costs one rotation each and is the whole difference between a hand round
    // a bowl and a hand through it. The middle bone takes slightly the most and the last the
    // least, which is the shape a hand closes in; a thumb opposes rather than curls, so it takes
    // about half. Mixamo/MakeHuman finger chains flex toward the palm in the positive local bend
    // direction. The old negative default opened them backwards, leaving every relaxed hand
    // spread like a mannequin; an unusual export can still override this with `gripSign`.
    if (p.grip && R.fingers && R.fingers.length) {
      const gs = ax.gripSign === undefined ? 1 : ax.gripSign;
      for (const fg of R.fingers) {
        const a = p.grip * gs * (fg.thumb ? 0.55 : 1) *
                  (fg.n === 1 ? 0.95 : fg.n === 2 ? 1.05 : 0.85);
        over[fg.i] = M.mul(rig.local[fg.i], gBend(a));
      }
    }

    // The torso: pitch, yaw and roll, shared between the two spine joints rather than all applied
    // at one, which is what stops a leaning figure hinging at the waist like a deckchair.
    // `recline` rides with the pitch because that is where figure.js puts it — the two are added
    // together into one rotX there — and without it a skinned figure sits bolt upright in a chair
    // that the primitive one leans back in. The order matches figure.js's own torso matrix,
    // rotY then rotZ then rotX, so the same three numbers produce the same posture.
    const tp = (p.torsoPitch || 0) + (p.recline || 0);
    const ty = (p.torsoYaw || 0) * turnS, tr = (p.torsoRoll || 0);
    if (tp || ty || tr) {
      const spineJoints = [];
      if (R.spine >= 0) spineJoints.push([R.spine, 'spine']);
      if (R.chest >= 0) spineJoints.push([R.chest, 'chest']);
      const k = spineJoints.length ? 1 / spineJoints.length : 0;
      for (const [slot, role] of spineJoints) {
        let m = rig.local[slot];
        if (ty) m = M.mul(m, C(role, 'turn')(ty * k));
        if (tr) m = M.mul(m, C(role, 'tilt')(tr * k));
        if (tp) m = M.mul(m, C(role, 'bend')(tp * k));
        over[slot] = m;
      }
    }

    // Head and neck. figure.js turns one head joint because its own rig has one bone there; a
    // real skeleton has a neck under the skull, and taking the whole turn at the skull is the
    // difference between somebody looking round and an owl. The neck takes the smaller share.
    // `headYaw` has been ignored entirely until now, which is the literal reason a skinned figure
    // could not look at you: gaitPose stabilises the gaze against the shoulders every frame and
    // the number went nowhere.
    const hy = (p.headYaw || 0) * turnS, hp = (p.headPitch || 0);
    if (hy || hp) {
      const share = R.neck >= 0 && R.head >= 0
        ? [[R.neck, 'neck', 0.45], [R.head, 'head', 0.55]]
        : R.head >= 0 ? [[R.head, 'head', 1]]
        : R.neck >= 0 ? [[R.neck, 'neck', 1]] : [];
      for (const [slot, role, k] of share) {
        let m = rig.local[slot];
        if (hy) m = M.mul(m, C(role, 'turn')(hy * k));
        if (hp) m = M.mul(m, C(role, 'bend')(hp * k));
        over[slot] = m;
      }
    }

    // Eyes, if the skeleton has any. Mixamo does not; a Ready Player Me avatar does. A rig
    // without them skips this rather than folding the angle into the head, because a glance
    // spent as a head-turn reads as a twitch — and it is better for the figure to hold its gaze
    // than to nod every second and a half.
    const ey = (p.eyeYaw || 0) * turnS, ep = (p.eyePitch || 0);
    if (ey || ep) for (const [slot, role] of [[R.eyeL, 'eyeL'], [R.eyeR, 'eyeR']]) {
      if (slot < 0) continue;
      let m = rig.local[slot];
      if (ey) m = M.mul(m, C(role, 'turn')(ey));
      if (ep) m = M.mul(m, C(role, 'bend')(ep));
      over[slot] = m;
    }
    // `blink` has nowhere to go and is the one channel that cannot be retargeted at all here. An
    // eyelid closes by moving vertices, not by turning a joint — no downloadable humanoid rigs an
    // eyelid bone — so it needs morph targets, which means the loader reading a primitive's
    // `targets` and the skinned shader taking the weights. Neither exists. Worth knowing before
    // anyone asks for it: the one avatar in the project that ships morph targets at all, the
    // Ready Player Me one, ships exactly two of them and they are `mouthOpen` and `mouthSmile`.
    // Blinking would need a face that has the shape authored, not only a pipeline that can read
    // one.
    return over;
  }

  // ---------------------------------------------------------------- which part is which
  //
  // `makeLook` is how this game already turns one body into sixty-four people, and it works in
  // colours: TOP, PANTS, SHOE, SKIN, HAIR. A downloaded character arrives as a set of primitives
  // with a texture each and nothing saying which of them is a jumper. glTF *does* say — the
  // material is named `Wolf3D_Outfit_Top` in as many words — but assets.js keeps only the image
  // off the material and drops the name, so it is gone by the time it reaches here.
  //
  // What does survive is the skinning. Every vertex carries the joints it is weighted to, and a
  // pair of trousers is weighted to legs. So a part is classified by where on the skeleton its
  // weight actually lands: one pass over the weights, once per rig, cached. It is an inference
  // and it is worth saying so plainly — `zones` is public so a harness can print what it decided
  // — but it is an inference from the geometry rather than from a filename, and it is right on
  // every rig in the project.
  const ZONE = [
    [/Toe|Foot|_5$/i,                'foot'],
    [/UpLeg|Leg\d*$|leg_joint/i,     'leg'],
    [/Eye|Head|Neck/i,               'head'],
    [/Hand/i,                        'hand'],
    [/Arm|Shoulder|Clavicle/i,       'arm'],
    [/Hips|Spine|Pelvis|torso/i,     'torso'],
  ];
  // What a part is, decided by where its weight sits relative to the waist rather than by which
  // single zone happens to be biggest. Biggest-wins was the obvious rule and it is wrong on real
  // assets in both directions, measured on the three in this project:
  //
  //   Ready Player Me trousers   hips 0.53, legs 0.44 — biggest-wins calls them a torso garment,
  //                              because the waistband is bound to the pelvis and the pelvis is
  //                              where the mesh is densest
  //   its top                    arms 0.40, chest 0.33, neck 0.22 — no single zone reaches half,
  //                              so biggest-wins gives up and calls a jumper "unclassifiable"
  //   Michelle                   head 0.55, because her hair is two large ponytails — one mesh
  //                              of a whole woman, one vertex in eight of it above her eyebrows
  //
  // What actually separates them is what a garment does *not* touch. Trousers have no weight
  // above the waist at all. A top has essentially none below it. A whole body has plenty of both,
  // and that is the test — the hips are ignored on the way, because everything is bound to the
  // hips a little and they say nothing about what a part is.
  const SMALL = 200;         // below this a part is an eyeball, a tooth or a visor: leave it be
  function zones(rig) {
    if (rig._zones) return rig._zones;
    const jz = rig.names.map(n => {
      for (const [re, z] of ZONE) if (re.test(n)) return z;
      return 'torso';
    });
    const out = rig.parts.map(part => {
      const w = part.weight, j = part.joint, acc = {};
      let tot = 0, cy = 0;
      const verts = part.pos.length / 3;
      if (w && j) for (let i = 0; i < w.length; i++) {
        const wt = w[i];
        if (wt <= 0) continue;
        const z = jz[j[i]] || 'torso';
        acc[z] = (acc[z] || 0) + wt; tot += wt;
      }
      for (let i = 1; i < part.pos.length; i += 3) cy += part.pos[i];
      const at = k => (acc[k] || 0) / (tot || 1);
      const above = at('head') + at('arm') + at('hand'), below = at('leg') + at('foot');
      let zone, share = Math.max(above, below);
      if (!tot) { zone = 'body'; share = 0; }
      // Weight on both sides of the waist: this is a person, not a garment.
      else if (Math.min(above, below) > 0.10) { zone = 'body'; share = Math.min(above, below); }
      // Nothing above it: trousers, a skirt, shoes. Whatever hip weight it has is a waistband.
      else if (above < 0.02 && below > 0.15) zone = at('foot') > at('leg') ? 'foot' : 'leg';
      // Nothing below it: a top, or — if it is nearly all skull — hair, a hat or a face.
      else if (below < 0.05)
        zone = at('head') >= 0.5 ? 'head' : at('hand') >= 0.5 ? 'hand' : 'torso';
      else { zone = 'body'; share = Math.min(above, below); }
      return { zone, verts, cy: verts ? cy / verts : 0, share };
    });
    return (rig._zones = out);
  }

  // A look's colours are absolute: what the primitive figure paints a jumper. Here they are
  // multipliers over a texture that already has a colour of its own, and multiplying two colours
  // together gives mud — a navy top over a navy texture comes out black. So the hue is taken at
  // full strength and the brightness only partly: divide the peak channel out, then put a
  // fraction of it back, which keeps a dark garment dark without driving it to nothing.
  function asTint(c) {
    if (!c) return null;
    const m = Math.max(c[0], c[1], c[2], 1e-3), v = 0.55 + 0.45 * Math.min(1, m);
    return [c[0] / m * v, c[1] / m * v, c[2] / m * v];
  }
  // What a whole-body mesh gets instead. A fraction of this person's own top colour over
  // everything: enough that a street of them is not one woman printed sixty-four times, small
  // enough that it reads as the light falling on her rather than as a repaint of her face.
  const CAST = 0.20;
  const WHITE = [1, 1, 1];
  const tintCache = new WeakMap();          // look -> { rigName: [[r,g,b] per part] }
  // Animation LOD, keyed by the stable pose object owned by an NPC. A far body is about a hundred
  // pixels tall or less; updating its skeleton at 30 Hz while its world translation remains 60 Hz
  // is visually continuous and halves retarget/matrix work for the largest part of a crowd.
  const farPoseCache = new WeakMap();
  const instRuntimeWarned = new Set();

  // A prop is collected before its skinned owner is submitted, so its attachment cannot read
  // `rig._world` after Rig.draw: in an instanced crowd that scratch contains whichever person was
  // posed last anyway.  Measure the requested joint chain independently instead.  The scratch is
  // owned by the decoded rig, only ancestors of the two hands are touched, and callers may retain
  // their output object to make the query allocation-free after its first use.
  function nextAttachmentStamp(rig) {
    const mark = rig._attachmentMark ||
      (rig._attachmentMark = new Uint32Array(rig.bones | 0));
    let stamp = ((rig._attachmentStamp || 0) + 1) >>> 0;
    if (!stamp) { mark.fill(0); stamp = 1; }
    rig._attachmentStamp = stamp;
    return stamp;
  }
  function attachmentJointWorld(rig, over, slot, stamp) {
    if (!(slot >= 0)) return null;
    const world = rig._attachmentWorld || (rig._attachmentWorld = []);
    const mark = rig._attachmentMark;
    if (mark[slot] === stamp) return world[slot];
    const w = world[slot] || (world[slot] = new Float32Array(16));
    const local = (over && over[slot]) || rig.local[slot], p = rig.parent[slot];
    if (p >= 0) M.mul(attachmentJointWorld(rig, over, p, stamp), local, w);
    else w.set(local);
    mark[slot] = stamp;
    return w;
  }

  // `world` is a glTF joint transform before inverse bind. Put it under the same model transform
  // Rig.draw uses without allocating translation/rotation matrices merely to multiply them once.
  function placeAttachment(world, x, y, z, yaw, out) {
    out = out || new Float32Array(16);
    x = x || 0; y = y || 0; z = z || 0;
    const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0);
    for (let k = 0; k < 16; k += 4) {
      const ax = world[k], ay = world[k + 1], az = world[k + 2], aw = world[k + 3];
      out[k] = c * ax + s * az + x * aw;
      out[k + 1] = ay + y * aw;
      out[k + 2] = -s * ax + c * az + z * aw;
      out[k + 3] = aw;
    }
    return out;
  }

  // Preserve the posed hand's orientation and move only its origin to the anatomical centre of
  // the palm: halfway along the rig's own wrist-to-middle-knuckle segment. A skeleton without a
  // recognised middle base keeps the wrist origin, which is the conservative previous behaviour.
  function palmAttachment(hand, middleBase, out) {
    out = out || new Float32Array(16);
    out.set(hand);
    if (middleBase) {
      out[12] = (hand[12] + middleBase[12]) * 0.5;
      out[13] = (hand[13] + middleBase[13]) * 0.5;
      out[14] = (hand[14] + middleBase[14]) * 0.5;
    }
    return out;
  }

  // Keep the pre-inverse-bind hand transforms beside a far pose's palette. An attachment query
  // and the later draw therefore observe the same held 30 Hz skeleton even though the character's
  // model translation continues at display rate. These are allocated once per far pose identity,
  // not once per frame.
  function captureFarHands(rig, cache, R) {
    const world = rig._world;
    if (R.handL >= 0) {
      const dst = cache.handL || (cache.handL = new Float32Array(16));
      dst.set(world[R.handL]);
      palmAttachment(world[R.handL], R.palmBaseL >= 0 ? world[R.palmBaseL] : null,
        cache.palmL || (cache.palmL = new Float32Array(16)));
    } else cache.handL = cache.palmL = null;
    if (R.handR >= 0) {
      const dst = cache.handR || (cache.handR = new Float32Array(16));
      dst.set(world[R.handR]);
      palmAttachment(world[R.handR], R.palmBaseR >= 0 ? world[R.palmBaseR] : null,
        cache.palmR || (cache.palmR = new Float32Array(16)));
    } else cache.handR = cache.palmR = null;
  }

  // Shared by the direct and instanced paths so animation LOD is identical whichever route a
  // crowd takes. In particular, a person does not restart or phase-shift their walk merely because
  // a second copy of the same rig entered view and made the group eligible for instancing.
  function poseBones(rig, name, pose, animFar) {
    // Mesh density and animation cadence are separate choices. Basic quality may legitimately use
    // the resident's LOD2 mesh only six metres away; holding that close skeleton at 30 Hz while
    // its root translates at 60 Hz makes the limbs visibly stutter. Callers identify genuinely
    // distant animation explicitly, matching game.js's fifteen-metre pose-work boundary.
    const farAnimated = !!(pose && typeof pose === 'object' && animFar);
    if (farAnimated) {
      const at = performance.now();
      let c = farPoseCache.get(pose);
      const generation = rig.generation || 0;
      if (!c || c.name !== name || c.generation !== generation || at - c.at >= 32) {
        if (!c || c.name !== name || c.generation !== generation)
          c = { name, generation, at:-Infinity, out:new Float32Array(rig.bones * 16) };
        // Resolve role names before the posed matrix pass. The first lookup may measure a rig's
        // bind arms and consequently fill `_world`; doing it afterwards would replace an array
        // pose's freshly evaluated hand transforms with bind transforms before they were copied.
        const handRoles = roles(rig);
        const over = !Array.isArray(pose) ? fromPose(rig, pose) : pose;
        matrices(rig, over, c.out);
        captureFarHands(rig, c, handRoles);
        c.at = at; farPoseCache.set(pose, c);
      }
      return c.out;
    }
    const over = pose && !Array.isArray(pose) ? fromPose(rig, pose) : pose;
    return matrices(rig, over, rig._out || (rig._out = new Float32Array(rig.bones * 16)));
  }

  function resolvedLod(rig, wanted) {
    const lods = rig.lods && rig.lods.length ? rig.lods : [0];
    let lod = lods[0];
    for (const candidate of lods)
      if (Math.abs(candidate - wanted) < Math.abs(lod - wanted)) lod = candidate;
    return lod;
  }

      // Per-part colour multipliers for one look on one rig. `rig.tintMap` overrules the inference
      // outright — an array of colours or nulls, one per part — for the case where an asset is worth
  // hand-annotating and the zones got it wrong.
  function tintFor(rig, lk) {
    if (!lk) return null;
    if (rig.tintMap) return rig.tintMap;
    let byRig = tintCache.get(lk);
    if (!byRig) tintCache.set(lk, byRig = {});
    if (byRig[rig.name]) return byRig[rig.name];
    const z = zones(rig);
    // Among the parts sitting on the head, the one whose vertices average highest is hair or a
    // hat rather than a face: a head mesh runs down into the neck, so its centre is always the
    // lower of the two. Only worth deciding when there is more than one of them — a lone head
    // part is the face. Anything small up there is an eyeball, a tooth or a beard card, and a
    // skin tint across those turns the whites of the eyes beige, so they are left alone.
    let hair = -1, hy = -Infinity, heads = 0;
    for (let i = 0; i < z.length; i++) {
      if (z[i].zone !== 'head' || z[i].verts < 400) continue;
      heads++;
      if (z[i].cy > hy) { hy = z[i].cy; hair = i; }
    }
    if (heads < 2) hair = -1;
    const cast = asTint(lk.TOP);
    const out = z.map((s, i) => {
      // An eyeball, a tooth, a beard card, a visor. A skin tint across the whites of somebody's
      // eyes turns them beige, and none of these is what makes one neighbour another.
      if (s.verts < SMALL) return WHITE;
      if (s.zone === 'body')
        return cast ? [1 + (cast[0] - 1) * CAST, 1 + (cast[1] - 1) * CAST,
                       1 + (cast[2] - 1) * CAST] : WHITE;
      if (i === hair) return asTint(lk.HAIR) || WHITE;
      if (s.zone === 'head' || s.zone === 'hand') return asTint(lk.SKIN) || WHITE;
      if (s.zone === 'foot') return asTint(lk.SHOE) || WHITE;
      if (s.zone === 'leg') return asTint(lk.SKIRT || lk.PANTS) || WHITE;
      if (s.zone === 'arm') return asTint(lk.ARM || lk.TOP) || WHITE;
      return asTint(lk.TOP) || WHITE;
    });
    return (byRig[rig.name] = out);
  }

  return {
    matrices, bind, bend, rotX, rotY, rotZ, rotAbout, roles, fromPose, chan,
    // What the weights say each part of a loaded rig is, and what a look turns that into. Public
    // so a harness can print the classification rather than infer it from a picture.
    zones: name => { const r = typeof Assets !== 'undefined' && Assets.rig(name); return r ? zones(r) : null; },
    tintFor: (name, look) => { const r = typeof Assets !== 'undefined' && Assets.rig(name); return r ? tintFor(r, look) : null; },
    // World-space hand frames for a loaded imported character, taken from the posed hand bones
    // before inverse bind. `left`/`right` retain the wrist-joint API; `palmLeft`/`palmRight` retain
    // the same orientation at the skeleton-derived palm centre. `out` may be retained on an NPC;
    // all four Float32Arrays are then reused (read each side only when its matching has flag is
    // true). Returns null when the named rig is not resident or has neither recognised hand.
    // Pass `{animFar:true}` whenever the later draw does so the prop shares its held 30 Hz pose.
    handFrames(name, x, y, z, yaw, pose, out, opt) {
      if (typeof Assets === 'undefined') return null;
      const rig = Assets.rig(name);
      if (!rig) return null;
      const R = roles(rig);
      if (R.handL < 0 && R.handR < 0) return null;
      let handL = null, handR = null, palmL = null, palmR = null;
      const far = !!(pose && typeof pose === 'object' && opt && opt.animFar);
      if (far) {
        // This also prepares/reuses the exact palette draw/drawMany will consume later.
        poseBones(rig, name, pose, true);
        const cached = farPoseCache.get(pose);
        handL = cached && cached.handL;
        handR = cached && cached.handR;
        palmL = cached && cached.palmL;
        palmR = cached && cached.palmR;
      } else {
        const over = pose && !Array.isArray(pose) ? fromPose(rig, pose) : pose;
        // One stamp covers both chains so their common pelvis/spine work is reused.
        const stamp = nextAttachmentStamp(rig);
        handL = attachmentJointWorld(rig, over, R.handL, stamp);
        handR = attachmentJointWorld(rig, over, R.handR, stamp);
        const baseL = attachmentJointWorld(rig, over, R.palmBaseL, stamp);
        const baseR = attachmentJointWorld(rig, over, R.palmBaseR, stamp);
        if (handL) palmL = palmAttachment(handL, baseL,
          rig._attachmentPalmL || (rig._attachmentPalmL = new Float32Array(16)));
        if (handR) palmR = palmAttachment(handR, baseR,
          rig._attachmentPalmR || (rig._attachmentPalmR = new Float32Array(16)));
      }
      out = out || {};
      out.hasLeft = !!handL; out.hasRight = !!handR;
      if (handL) out.left = placeAttachment(handL, x, y, z, yaw,
        out.left || new Float32Array(16));
      if (handR) out.right = placeAttachment(handR, x, y, z, yaw,
        out.right || new Float32Array(16));
      if (palmL) out.palmLeft = placeAttachment(palmL, x, y, z, yaw,
        out.palmLeft || new Float32Array(16));
      if (palmR) out.palmRight = placeAttachment(palmR, x, y, z, yaw,
        out.palmRight || new Float32Array(16));
      out.palmLeftMeasured = !!handL && R.palmBaseL >= 0;
      out.palmRightMeasured = !!handR && R.palmBaseR >= 0;
      out.rig = name; out.generation = rig.generation || 0;
      return out;
    },
    // Draw a loaded rig at a place in the world. `pose` is the override array or null for rest.
    // Returns false if the rig is not loaded or the renderer has no skinned program, so a caller
    // can fall back to the primitive figure without checking anything first.
    draw(name, x, y, z, yaw, pose, colour, opt) {
      if (typeof Assets === 'undefined') return false;
      const rig = Assets.rig(name);
      if (!rig) return false;
      if (typeof Assets.touchRig === 'function') Assets.touchRig(name, opt && opt.frame);
      const parts = Assets.uploadRig(name, opt && opt.lod !== undefined ? opt.lod : 0);
      if (!parts || !parts.length) return false;
      // A pose object straight out of figure.js is retargeted here; an array is taken as an
      // override list already built. Anything else means bind pose. Far skeletons use animation
      // LOD (never identity LOD): same mesh, face and clothes, simply evaluated every other 60 Hz
      // frame while their model position keeps moving each frame.
      const bones = poseBones(rig, name, pose, !!(opt && opt.animFar));
      const model = M.mul(M.trans(x, y, z), M.rotY(yaw || 0));
      let drew = false;
      // Casting one downloaded body as many different people.
      //
      // A character's own texture is its skin and its clothes, so the base colour is white and the
      // map comes through untouched — that is right for showing the asset as its artist made it,
      // and wrong for a game with sixty-four named neighbours in it. Downloading sixty-four
      // characters is not the answer either: it would be well over a hundred megabytes, and it
      // would throw away `makeLook`, which is how this game already makes one body into a crowd.
      //
      // So a caller may pass `opt.look` — a makeLook straight off a neighbour — and the parts are
      // coloured from it by what the weights say they are. `opt.tint` is the same thing written
      // out by hand and still wins, and neither costs anything to a caller that passes neither.
      //
      // Be clear about the limit, because it is not small: this shifts *colour*. It cannot move a
      // hairline, change a face or take off a pair of headphones — those are painted into the
      // albedo and built into the mesh. Tinting turns one woman into that woman in another
      // jacket. Making her somebody else needs either a repainted texture or another body. And on
      // a character built as one mesh — Michelle, and most of what is downloadable — it cannot
      // even do that: there is one part, so there is one colour, and all a look can buy is a
      // whole-body cast that keeps a crowd of her from being identical.
      const tint = (opt && opt.tint) || (opt && opt.look && tintFor(rig, opt.look));
      // Model, bones and all scene lighting are identical for every material part.  Bracket the
      // character so the renderer uploads those once; only texture/material state changes from a
      // face to a shirt or a shoe. Older renderer builds retain the one-part path for diagnostics.
      const bracketed = typeof R.beginSkinned === 'function' && R.beginSkinned(model, bones);
      // Production callers change only the LOD. Material response belongs to the uploaded part and
      // can therefore be cached with it; allocating eight spread objects per resident per frame
      // otherwise becomes a steady stream of short-lived garbage on a populated mall floor.
      const materialOverride = !!(opt && (opt.tex || opt.alpha !== undefined ||
        opt.cutout !== undefined || opt.doubleSided !== undefined || opt.gloss !== undefined ||
        opt.mode !== undefined || opt.glow !== undefined));
      try {
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          const baseOpt = p._drawOpt || (p._drawOpt = {
            tex:p.tex, cutout:p.alphaCutoff || 0, doubleSided:p.doubleSided,
            gloss:p.gloss, mode:p.mode
          });
          const o = p.tex ? (materialOverride ? { ...baseOpt, ...(opt || {}), tex:p.tex,
            cutout:baseOpt.cutout, doubleSided:baseOpt.doubleSided,
            // Per-part authored response. An explicit diagnostic override still wins, which keeps
            // the studio and shader probes useful without making production callers restate this.
            gloss:opt && opt.gloss !== undefined ? opt.gloss : p.gloss,
            mode:opt && opt.mode !== undefined ? opt.mode : p.mode } : baseOpt) : (opt || {});
          const c = p.tex ? (Array.isArray(tint) ? (Array.isArray(tint[0]) ? (tint[i] || tint[0]) : tint)
                                                : WHITE)
                          : (colour || [0.82, 0.78, 0.72]);
          drew = (bracketed ? R.drawSkinnedPart(p.mesh, c, o)
                            : R.drawSkinned(p.mesh, model, c, bones, o)) || drew;
        }
      } finally { if (bracketed) R.endSkinned(); }
      return drew;
    },

    // Many visible residents, grouped without changing who they are. Only instances with the
    // exact same loaded rig generation and resolved authored LOD share a draw. Different stable
    // identities therefore never share geometry or textures, and moving from LOD0 to LOD2 still
    // selects that resident's own validated lower-density mesh rather than a crowd stand-in.
    //
    // `items` are the records already queued by game.js: `{n,lod}`, where n owns rig/x/z/lift/
    // yaw/pose/look. Successful records get `item.drawn=true`; when opt.frame is present the NPC
    // also gets `_rigDrawFrame`, making procedural fallback deterministic without relying on a
    // draw-call estimate. The returned status counts complete people, never material parts.
    drawMany(items, colour, opt = {}) {
      items = Array.isArray(items) ? items : [];
      const status = { ok:false, total:items.length, drawn:0, instanced:0, direct:0,
        failed:0, groups:0, failedItems:[] };
      if (!items.length) { status.ok = true; return status; }
      if (typeof Assets === 'undefined') {
        status.failed = items.length; status.failedItems = items.slice(); return status;
      }

      const groups = new Map();
      for (const item of items) {
        item.drawn = false;
        const n = item && item.n, name = n && n.rig;
        const rig = name && Assets.rig(name);
        if (!n || !name || !rig) { status.failedItems.push(item); continue; }
        const lod = resolvedLod(rig, item.lod === undefined ? 0 : item.lod);
        const key = name + '|' + (rig.generation || 0) + '|lod' + lod;
        let g = groups.get(key);
        if (!g) groups.set(key, g = { key, name, rig, lod, items:[] });
        g.items.push(item);
        if (typeof Assets.touchRig === 'function') Assets.touchRig(name, opt.frame);
      }
      status.groups = groups.size;

      const mark = item => {
        item.drawn = true;
        if (opt.frame !== undefined) item.n._rigDrawFrame = opt.frame;
        status.drawn++;
      };
      const direct = (item, g) => {
        const n = item.n, directOpt = { ...opt, lod:g.lod,
          animFar:item.animFar === undefined ? item.d > 15 : !!item.animFar };
        // `look:true` is an opt-in request to use each NPC's palette, but authored named
        // identities keep their photographed texture untouched unless the cast record explicitly
        // marks the rig as tintable. This guard also prevents passing boolean true into tintFor's
        // WeakMap on the direct fallback path.
        if (opt.look === true) {
          if (n.rigTint === true && n.look) directOpt.look = n.look;
          else delete directOpt.look;
        }
        const ok = this.draw(g.name, n.x, n.lift || 0, n.z, n.yaw, n.pose,
          colour || WHITE, directOpt);
        if (ok) { mark(item); status.direct++; }
        else status.failedItems.push(item);
      };

      for (const g of groups.values()) {
        const parts = Assets.uploadRig(g.name, g.lod);
        const canInstance = (g.items.length > 1 || opt.forceInstanced === true) &&
          parts && parts.length &&
          typeof R.drawSkinnedMany === 'function' && R.skinning && R.skinning.instanced;
        let submitted = 0;
        if (canInstance) {
          try {
            const count = g.items.length, boneCount = g.rig.bones | 0;
            // Scratch belongs to the decoded rig and is therefore collected when the asset cache
            // disposes that rig. Stable crowd sizes allocate once and produce no per-frame matrix
            // or palette garbage.
            const allScratch = g.rig._instScratch || (g.rig._instScratch = {});
            let scratch = allScratch[g.lod];
            if (!scratch || scratch.count !== count || scratch.bones !== boneCount) {
              scratch = allScratch[g.lod] = { count, bones:boneCount,
                models:new Float32Array(count * 16),
                palette:new Float32Array(count * boneCount * 16), colors:[] };
            }
            for (let j = 0; j < count; j++) {
              const n = g.items[j].n, o = j * 16, a = n.yaw || 0;
              const c = Math.cos(a), s = Math.sin(a), m = scratch.models;
              m[o] = c; m[o+1] = 0; m[o+2] = -s; m[o+3] = 0;
              m[o+4] = 0; m[o+5] = 1; m[o+6] = 0; m[o+7] = 0;
              m[o+8] = s; m[o+9] = 0; m[o+10] = c; m[o+11] = 0;
              m[o+12] = n.x; m[o+13] = n.lift || 0; m[o+14] = n.z; m[o+15] = 1;
              const item = g.items[j];
              scratch.palette.set(poseBones(g.rig, g.name, n.pose,
                item.animFar === undefined ? item.d > 15 : !!item.animFar),
                j * boneCount * 16);
            }

            const materialOverride = !!(opt && (opt.tex || opt.alpha !== undefined ||
              opt.cutout !== undefined || opt.doubleSided !== undefined ||
              opt.gloss !== undefined || opt.mode !== undefined || opt.glow !== undefined));
            const drawParts = [];
            for (let i = 0; i < parts.length; i++) {
              const p = parts[i];
              const baseOpt = p._drawOpt || (p._drawOpt = {
                tex:p.tex, cutout:p.alphaCutoff || 0, doubleSided:p.doubleSided,
                gloss:p.gloss, mode:p.mode
              });
              const po = p.tex ? (materialOverride ? { ...baseOpt, ...opt, tex:p.tex,
                cutout:baseOpt.cutout, doubleSided:baseOpt.doubleSided,
                gloss:opt.gloss !== undefined ? opt.gloss : p.gloss,
                mode:opt.mode !== undefined ? opt.mode : p.mode } : baseOpt) : opt;

              let first = null, same = true, colors = scratch.colors[i];
              if (!colors || colors.length !== count * 3)
                colors = scratch.colors[i] = new Float32Array(count * 3);
              for (let j = 0; j < count; j++) {
                const n = g.items[j].n;
                let tint = opt.tint || null;
                if (!tint && opt.look === true && n.rigTint === true && n.look)
                  tint = tintFor(g.rig, n.look);
                else if (!tint && opt.look && opt.look !== true)
                  tint = tintFor(g.rig, opt.look);
                let pc;
                if (p.tex) pc = Array.isArray(tint)
                  ? (Array.isArray(tint[0]) ? (tint[i] || tint[0]) : tint) : WHITE;
                else pc = colour || [0.82, 0.78, 0.72];
                if (!first) first = pc;
                else if (pc[0] !== first[0] || pc[1] !== first[1] || pc[2] !== first[2]) same = false;
                colors[j*3] = pc[0]; colors[j*3+1] = pc[1]; colors[j*3+2] = pc[2];
              }
              drawParts.push({ mesh:p.mesh, color:same ? first : colors, opt:po });
            }
            submitted = R.drawSkinnedMany(drawParts, scratch.models, scratch.palette,
              boneCount, count);
          } catch (e) {
            if (!instRuntimeWarned.has(g.key)) {
              instRuntimeWarned.add(g.key);
              console.error('rig.js: GPU-skinned crowd draw failed for ' + g.key +
                '; using direct characters.\n' + String(e && (e.stack || e.message) || e));
            }
            submitted = 0;
          }
        }
        if (submitted === g.items.length) {
          for (const item of g.items) mark(item);
          status.instanced += submitted;
        } else {
          // No partial groups are reported by R. A disabled shader, oversized palette texture or
          // disposed mesh therefore becomes the exact direct renderer already used by Rig.draw.
          for (const item of g.items) direct(item, g);
        }
      }
      // Invalid records were collected before grouping; direct failures were appended above.
      status.failed = status.failedItems.length;
      status.ok = status.drawn === status.total;
      return status;
    },
  };
})();
