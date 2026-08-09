// 🛄 Baggage belt — The 行李托运 oversize belt
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -2.0 .. -0.5  (landside)
//   camera  D-belt
//
// What stood here before this file: a 1.90 x 2.20 housing with a slatted bed, a plain box hood
// with 行李托运 written on it, and two cases sliding into a translucent black rectangle. The
// bones were right, so this file does not rebuild them — it is the rest of the machine, butted
// onto the shell's geometry rather than replacing any of it:
//
//   磅秤 the infeed      a roller-and-scale deck bolted to the near end (z 4.00 .. 4.70) with a
//                        pedestal head that reads the weight of whatever is on the plate
//   the strip curtain    nine overlapping rubber strips across the hood mouth, on an opaque
//                        backing, that lift and swing as a case pushes under them and settle back
//   the guard rail       the chrome rail down the passenger side, carrying the scale head
//   the signage          超大行李 / 限重32公斤 on a hanging blade over the loading deck
//   three more cases     a long canvas parcel, a strapped hardshell and a taped carton, riding
//                        the two side lanes the shell's own pair leaves empty
//
// ---------------------------------------------------------------------------------------------
// TWO THINGS THAT ARE NOT OBVIOUS AND COST A DAY EACH IF GOT WRONG
//
// 1. A MOVING PROP NEEDS ITS OWN CULL SPHERE. `Build.finish` packs every prop's centre and
//    bounding radius into one Float32Array per batch and the draw loop culls against THAT — so
//    writing `p.cy = -99` on a moving prop, the way the shell's `beltTick` does, has no effect
//    at all once the prop is batched, and a prop that travels further than its own radius is
//    culled while it is still on screen. Every case here therefore sets `p.fixed = true` and
//    writes its own `cx/cy/cz/r` covering the whole 3.00 m run — the same escape hatch build.js
//    gives a loaded model. The bug this prevents is a case that blinks out near one end of the
//    belt, from some angles only.
//
// 2. THE HOOD HAS NO HOLE IN IT. The shell's hood is a solid box whose front face is opaque pale
//    plaster at z 6.60, with a *translucent* black panel painted over the mouth. At alpha .85 a
//    case behind it stayed 15% visible, which is why it had to be collapsed early. An opaque
//    backing at z 6.585 is added here instead: it is what actually swallows a case, it costs one
//    batched draw where the see-through panel costs an unbatched one, and it means a case can be
//    eaten by the hole progressively instead of vanishing while still in view.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
// The tick runs every frame, so it allocates nothing: matrices are written in place out of each
// prop's own `m0`, the curtain keeps two floats per strip, and the scratch the curtain reads is
// one Float64Array sized at build. There is no `M.mul` anywhere below the builder.
//
// Batching: every prop here reuses a mesh + mode + material combination the hall already draws —
// the deck housing joins the shell's housing (same col.slab, same M_METAL, same matScale .70),
// the rollers join the hall's cylinders, the writing joins the hall's mode-1 glyphs. NOTHING in
// this zone is translucent.

// ---- the moving parts, shared between the builder and the tick ------------------------------
// Out here rather than inside the builder because the tick is a sibling of the builder, not a
// closure inside it: the shell calls `AirFit['belt'].tick` long after the builder has returned.
const BeltCases = [];      // the three cases this file rides: see rideCase()
const BeltStrips = [];     // the curtain: { p, sx, sz, len0, cx0, py, pz, k, v }
const BeltShell = [];      // the shell's own two cases — READ ONLY, for the curtain's trigger
const BeltRun = { RUN0: 4.30, RUN1: 7.30, PERIOD: 8.6, MOUTH: 6.545 };
// The z range a contact patch is allowed to occupy: the top of the scale deck at one end, the
// curtain at the other. Nothing carries a shadow off the end of the machine. See the tick.
const SH_Z0 = 4.03, SH_Z1 = 6.53;
// x, half-width, front z, back z for every case visible on the belt this frame. Sized once so
// the curtain can ask "is anything coming through above me" without allocating.
const BeltLive = new Float64Array(8 * 4);
let BeltLiveN = 0, BeltLastT = -1;
let BeltLamp = null, BeltScale = null;

AirFit['belt'] = A => {
  const { box, cyl, ball, cap, taper, wall, flat, glyphs, solid, blocker, glow, thing } = A;
  const { C, G, col } = A;

  // ---- the datums. Restated from the shell rather than exported by it, and every one is a
  // number the existing fitting is already built on: CKZ is the check-in counter line, OX the
  // belt's centreline, BEDY the top of the slats a case rides on, HALF half the slatted width,
  // MOUTH the plane the curtain hangs in (the hood's own face is 0.055 behind it, at CKZ+.40).
  const CKZ = A.RZ - 2.30;          // 6.20
  const OX = -.60;
  const BEDY = 1.09;
  const HALF = .79;
  const MOUTH = BeltRun.MOUTH;      // 6.545
  const DECKZ = 4.35, DECKD = .70;  // the 磅秤 deck: z 4.00 .. 4.70, butted to the housing
  const T = '行李托运';             // the cutaway tag the whole fitting already shares
  const { RUN0, RUN1 } = BeltRun;

  // A case appears on the roller deck and is carried up the slats at 0.35 m/s, which is what a
  // check-in belt actually runs at. RUN1 is past the last point any case is still visible, so
  // the collapse never happens on screen; each case works out its own hide point from its depth.
  const RUNMID = (RUN0 + RUN1) / 2, RUNR = (RUN1 - RUN0) / 2;

  Glyphs.need('0123456789');        // the scale head swaps digits at run time — pre-register

  // ============================================================ 磅秤 the infeed / scale deck
  // The belt used to begin at a cut edge: 1.90 m of slats, then nothing, with a case simply
  // existing at the near end of them. A real oversize position has a free-roller deck in front
  // of the powered section — that is where the passenger sets the bag down, and it is the scale.
  //
  // Same box, same material, same matScale as the shell's housing, so the two read as one
  // machine and draw as one batch instead of two boxes that happen to touch.
  box(OX, .50, DECKZ, 1.90, 1.00, DECKD, col.slab,
    { tag: T, gloss: .24, ...A.M_METAL, matScale: .70 });
  box(OX, 1.00, DECKZ, 1.70, .10, DECKD - .04, col.charcoal, { tag: T, hard: true, gloss: .28 });
  // The rollers, sunk into the deck plate so only the top third of each shows — which is what a
  // roller bed looks like, a row of bright arcs rather than a row of pipes on a table.
  for (let i = 0; i < 8; i++)
    cyl(OX, BEDY - .042, 4.09 + i * .075, .042, 1.50, col.chrome,
      { tag: T, rz: Math.PI / 2, gloss: .46 });
  // the transition plate over the seam onto the powered belt, and the toe strip along the bottom
  box(OX, BEDY - .004, 4.72, 1.60, .012, .11, col.chrome, { tag: T, hard: true, gloss: .50 });
  box(OX, .09, 3.995, 1.86, .18, .03, col.steelD, { tag: T, hard: true, gloss: .40 });

  // ============================================================ the side guides
  // Sheet-steel skirts along both edges of the powered section, 0.14 proud of the slats. A
  // conveyor without them is a table with rollers on it; with them a case cannot leave the belt
  // sideways, and that is most of what makes the eye read it as machinery.
  for (const s of [-1, 1])
    box(OX + s * (HALF + .025), 1.16, 5.72, .05, .14, 1.90, col.steelD,
      { tag: T, hard: true, gloss: .34 });

  // ============================================================ the guard rail + 磅秤 head
  // Only the first 1.2 m of the belt has floor beside it — the check-in counter runs across
  // everything past z 5.55 — so the rail is as long as it can be, which is the length that
  // matters: it fences the loading deck off from the queue. The scale head rides the front post
  // rather than standing on a pedestal of its own, the way the readouts on the five check-in
  // scales sit on the end of each scale.
  cyl(-1.70, .73, 4.17, .032, 1.46, col.chrome, { tag: T, gloss: .46 });
  cyl(-1.70, .64, 5.36, .028, 1.28, col.chrome, { tag: T, gloss: .46 });
  cyl(-1.70, 1.26, 4.765, .026, 1.19, col.chrome, { tag: T, rx: Math.PI / 2, gloss: .46 });
  box(-1.70, 1.62, 4.17, .46, .32, .18, col.charcoal, { tag: T, hard: true, gloss: .30 });
  box(-1.70, 1.62, 4.070, .40, .26, .012, C('#0d1a14'),
    { tag: T, hard: true, mode: 1, gloss: .08 });
  // Two big digits and 公斤 under them. Built with real characters at full alpha so they batch
  // with the rest of the hall's writing; the tick only ever swaps `ch`, which is a per-instance
  // atlas cell and costs nothing at all.
  const kgD = glyphs(-1.70, 1.655, 4.058, Math.PI, '00',
    { size: .15, gap: .03, color: col.lime, mode: 1, glow: .30, tag: T });
  glyphs(-1.70, 1.535, 4.058, Math.PI, '公斤',
    { size: .07, gap: .015, color: C('#5f8f78'), mode: 1, glow: .18, tag: T });
  BeltLamp = box(-1.70, 1.82, 4.17, .07, .07, .05, col.lime,
    { tag: T, hard: true, mode: 1, glow: .28 });
  BeltScale = { d: kgD, kg: -1, want: 0, until: 0, on: C('#ffd27a'), off: col.lime };

  // ============================================================ 超大行李 the blade sign
  // The one thing the fitting never said out loud. 行李托运 on the hood is the verb; this is what
  // the position is FOR — oversize — with the weight limit under it, which is the number every
  // passenger standing at an oversize desk is actually looking for. Hung on the same short
  // capsule stubs the five 值机 signs use.
  // Hung at 2.56 and not the 2.44 it was first built at, and the 0.12 is geometry rather than
  // taste. A sign over the belt axis between the camera and the hood projects into the top of the
  // frame, and whether it eats the hood depends on one test: its bottom edge has to sit above the
  // sight line from the eye to the top of the hood. From D-belt's camera that line passes y 2.20
  // at this sign's depth, and a 2.24 bottom edge grazed it.
  box(OX, 2.56, 4.20, 1.40, .40, .07, col.blueSign, { tag: T, hard: true, gloss: .26 });
  glyphs(OX, 2.64, 4.150, Math.PI, '超大行李',
    { size: .20, gap: .07, color: col.white, mode: 1, glow: .22, tag: T });
  box(OX, 2.45, 4.152, 1.06, .17, .014, C('#e6d791'), { tag: T, hard: true, mode: 1, gloss: .12 });
  glyphs(OX, 2.45, 4.140, Math.PI, '限重32公斤',
    { size: .105, gap: .038, color: col.navy, mode: 1, tag: T });
  for (const s of [-1, 1])
    cap(OX + s * .56, 2.93, 4.20, .014, .34, .014, col.steelD, { tag: T, gloss: G.metal });

  // ============================================================ the hood mouth and its curtain
  // The backing first (see note 2 at the top of this file): opaque, black, and 0.015 in front of
  // the hood's own face. It is what actually swallows a case, and what the strips hang against.
  box(OX, 1.20, 6.585, 1.58, .88, .012, C('#0a0c0d'), { tag: T, hard: true, gloss: .04 });
  box(OX, 1.695, 6.550, 1.62, .04, .05, col.steelD, { tag: T, hard: true, gloss: .38 });
  // Nine strips in two staggered ranks — which is how a strip curtain is really hung, and also
  // why the 15 mm overlap that leaves no gap to see through does not put two coplanar faces in
  // the same pixels. They hang from the bar at y 1.665 down to 0.01 above the slats.
  // Grey rubber, not black rubber. Painted the #2b2e30 a strip curtain actually is, nine strips
  // against a near-black backing came out as one undifferentiated hole: the mouth is the least
  // lit surface in the hall, there is no bounce in this renderer, and dark-on-dark at four metres
  // is dark. At #4e5356 with a little more gloss they read as separate strips and the fact that
  // some of them are lifted is legible, which is the entire point of building them.
  const RUB = [C('#4e5356'), C('#464b4e'), C('#565b5e')];
  for (let i = 0; i < 9; i++) {
    const sx = OX + (i - 4) * .175, sz = (i & 1) ? 6.545 : 6.558;
    const p = box(sx, 1.3825, sz, .19, .565, .012, RUB[i % 3],
      { tag: T, hard: true, gloss: .26 });
    BeltStrips.push({ p, sx, sz: .012, len0: .565, cx0: sx, py: 1.665, pz: sz, k: 0, v: 0 });
  }
  // the eyebrow lamp over the mouth, so the curtain is lit and the hole under it is not
  box(OX, 1.79, 6.50, 1.30, .04, .07, C('#ffe3b4'), { tag: T, hard: true, mode: 1, glow: .34 });
  box(OX, 1.845, 6.50, 1.34, .06, .09, col.steelD, { tag: T, hard: true, gloss: .30 });

  // ============================================================ the marking
  // The keep-clear marking belongs on the machine rather than across the shared check-in approach:
  // a yellow line along the leading lip stays visible without painting through the queue route.
  box(OX, 1.053, 4.025, 1.70, .008, .05, col.yellow, { tag: T, hard: true, gloss: .16 });

  // ============================================================ the cases that ride in
  // Three, in the two lanes the shell's pair leaves empty on a 1.58 m belt — which is what a belt
  // this wide is for. A long soft parcel down the left, and a hardshell and a taped carton
  // sharing the right lane a third of a cycle apart.
  //
  // `m0` is snapshotted here, before `finish`, exactly the way the shell snapshots the runway
  // aircraft's: `finish` reads `m`, it never writes it.
  function rideCase(o) {
    const c = { props: o.props, m0s: o.props.map(p => Float32Array.from(p.m)),
                x: o.x, halfW: o.halfW, halfD: o.halfD, kg: o.kg, ph: o.ph,
                zHide: 6.60 + o.halfD, z: RUN0, hidden: false,
                sh: null, shw: o.halfW * 2 + .13, shd: o.halfD * 2 + .13 };
    for (const p of c.props) {
      p.fixed = true;                      // see note 1 at the top of this file
      p.cx = o.x; p.cy = 1.28; p.cz = RUNMID;
      p.r = RUNR + o.halfD + .25;
    }
    // The contact patch, on the belt bed rather than on the floor: a case rides 1.09 m up on top
    // of an opaque housing, so a shadow at y 0.02 would be under the machine where nobody can
    // see it. At 1.095 it is the dark line between the case and the slats, and it travels with
    // the case — which is what stops the case floating after dark, when the sun's shadow map is
    // off and these painted ones are the only shadows there are.
    c.sh = A.shade(o.x, RUN0, c.shw, c.shd, .22, 1.098);
    BeltCases.push(c);
  }

  // 长条包裹 — a rolled canvas parcel, strapped at both ends. The thing that will not go on a
  // check-in scale, which is the entire reason this position exists.
  rideCase({ x: -1.12, halfW: .124, halfD: .45, kg: 18, ph: 0, props: [
    cyl(-1.12, BEDY + .115, RUN0, .115, .90, C('#8a8471'),
      { tag: T, rx: Math.PI / 2, gloss: .14 }),
    cyl(-1.12, BEDY + .115, RUN0 - .26, .124, .05, C('#3b3f45'),
      { tag: T, rx: Math.PI / 2, gloss: .24 }),
    cyl(-1.12, BEDY + .115, RUN0 + .26, .124, .05, C('#3b3f45'),
      { tag: T, rx: Math.PI / 2, gloss: .24 }),
  ] });

  // 硬壳箱 — a hardshell with a hold-all strap round its middle
  rideCase({ x: -.05, halfW: .21, halfD: .26, kg: 31, ph: .30, props: [
    box(-.05, BEDY + .17, RUN0, .40, .34, .52, C('#2f6157'), { tag: T, gloss: .36 }),
    box(-.05, BEDY + .17, RUN0, .42, .36, .07, C('#c06a2c'), { tag: T, hard: true, gloss: .18 }),
    cap(-.05, BEDY + .35, RUN0 - .10, .020, .22, .020, col.charcoal,
      { tag: T, rz: Math.PI / 2, gloss: .28 }),
  ] });

  // 纸箱 — a taped carton, which is half of what actually goes down an oversize belt
  rideCase({ x: -.05, halfW: .225, halfD: .23, kg: 23, ph: .72, props: [
    box(-.05, BEDY + .165, RUN0, .44, .33, .46, C('#b08a5a'), { tag: T, hard: true, gloss: .10 }),
    box(-.05, BEDY + .335, RUN0, .09, .012, .47, C('#d8d2be'),
      { tag: T, hard: true, gloss: .16 }),
    box(-.05, BEDY + .335, RUN0, .45, .012, .09, C('#d8d2be'),
      { tag: T, hard: true, gloss: .16 }),
  ] });

  // ---- the shell's own two cases, so the curtain reacts to them as well as to these three.
  // Read-only, and found rather than reached for: at the moment this builder runs, the only
  // props in the room carrying an `m0` are the two the shell's `beltTick` drives — the runway
  // aircraft and the desk agents are snapshotted after `finish`, which is after this. If that
  // ever stops being true the curtain quietly loses two of its five triggers and nothing else
  // changes. See the tickets: the right end state is `beltTick` moving into this file.
  for (const p of A.props)
    if (p.tag === T && p.m0 && BeltShell.length < 4) BeltShell.push(p);

  // The deck stands 0.70 m further into the hall than the housing did, and the collider has to
  // follow it or the player walks through a weighing machine.
  solid(-1.62, .42, 3.96, 4.84);

  // What the position is for, in words, where you stand to use it. The shell's own 行李托运
  // thing stays where it is; this one teaches the sign that is now over your head.
  thing('超大行李', OX, 1.90, 4.20, '超大行李在这边托运。',
    'Oversize baggage is checked in over here.',
    '超大 oversize + 行李 baggage. 限重 the weight limit — 每件限重三十二公斤.',
    { tag: T, focus: [OX, 3.30], reach: 2.2 });
};

// ---------------------------------------------------------------------------------------------
// Anything that moves registers here and the shell dispatches it once a frame. `t` is wall-clock
// seconds, `body` is the player, `clock` is the game clock in minutes.
//
// Nothing below allocates. A case is a translation on z, so only the twelve entries of its linear
// part and `m[14]` move; a curtain strip is a rotation about the bar it hangs from plus a change
// of length, which for a prop built with no rotation of its own is nine writes and a pivot.
AirFit['belt'].tick = (t, body, clock) => {
  // A pinned time, for the shot harness. Headless Chrome renders at one to three frames a second,
  // so a screenshot of a wall-clock animation catches whatever moment it happens to land on;
  // `AirFit.belt.pin = 5.4` freezes the cycle at a chosen point so the camera can be aimed at a
  // case going under the curtain rather than at an empty belt.
  const pin = AirFit['belt'].pin;
  if (typeof pin === 'number') t = pin;

  let dt = BeltLastT < 0 ? 1 / 60 : t - BeltLastT;
  BeltLastT = t;
  // Clamped, not trusted: a backgrounded tab, a place change or a pinned time hands this a step
  // of any size at all, and the curtain's spring is only stable for small ones.
  if (!(dt > 0)) dt = 1 / 60;
  else if (dt > .02) dt = .02;

  const RUN0 = BeltRun.RUN0, D = BeltRun.RUN1 - RUN0, MOUTH = BeltRun.MOUTH;
  BeltLiveN = 0;

  // ---- the cases
  let onPlate = 0;
  for (let ci = 0; ci < BeltCases.length; ci++) {
    const c = BeltCases[ci];
    let k = (t / BeltRun.PERIOD + c.ph) % 1;
    if (k < 0) k += 1;
    const z = RUN0 + k * D;
    c.z = z;
    // `zHide` is 6.60 plus the case's own half-depth: at that point its TRAILING edge is level
    // with the hood face, every millimetre of it is behind the opaque backing, and the collapse
    // is not an event anybody can see. So each case vanishes at its own z, not at a shared one —
    // which is why a 0.90 m parcel and a 0.46 m carton can share the same belt.
    const hidden = z > c.zHide;
    c.hidden = hidden;
    const s = hidden ? 0 : 1, dz = z - RUN0;
    for (let i = 0; i < c.props.length; i++) {
      const m = c.props[i].m, m0 = c.m0s[i];
      for (let j = 0; j < 12; j++) m[j] = m0[j] * s;
      m[12] = m0[12]; m[13] = m0[13]; m[14] = m0[14] + dz;
    }
    // The contact patch travels with the case, collapses with it, and is CLIPPED to the belt.
    // The clip is not tidiness. A contact shadow is drawn as a plain quad at a fixed height with
    // no surface test of any kind, so the moment a case reaches either end of the run its patch —
    // which is deliberately a little larger than the case, or it would be invisible under it —
    // hangs off the end of the machine and rasterises as a hard black rectangle floating in the
    // air 1.1 m above the floor. It is very obvious and it looks like a hole in the world.
    const sh = c.sh;
    if (sh) {
      let z0 = z - c.shd / 2, z1 = z + c.shd / 2;
      if (z0 < SH_Z0) z0 = SH_Z0;
      if (z1 > SH_Z1) z1 = SH_Z1;
      const on = !hidden && z1 > z0;
      sh.m[0] = on ? c.shw : 0;
      sh.m[10] = on ? z1 - z0 : 0;
      sh.m[14] = (z0 + z1) / 2;
    }
    if (!hidden) {
      const o = BeltLiveN * 4;
      BeltLive[o] = c.x; BeltLive[o + 1] = c.halfW;
      BeltLive[o + 2] = z + c.halfD; BeltLive[o + 3] = z - c.halfD;
      BeltLiveN++;
      if (z > 4.05 && z < 4.66) onPlate = c.kg;      // on the weighing deck
    }
  }

  // ---- the shell's two cases, read for the curtain only. `beltTick` runs after this dispatch,
  // so these are one frame stale, which at a third of a metre a second is five millimetres.
  for (let i = 0; i < BeltShell.length && BeltLiveN < 8; i++) {
    const z = BeltShell[i].m[14];
    if (z < 1) continue;                     // collapsed to scale(0,0,0) inside the hood
    const o = BeltLiveN * 4;
    BeltLive[o] = -.60; BeltLive[o + 1] = .26;
    BeltLive[o + 2] = z + .28; BeltLive[o + 3] = z - .28;
    BeltLiveN++;
  }

  // ---- the strip curtain
  // Each strip asks whether anything is coming through beneath it, longitudinally and laterally,
  // and springs toward that. A spring rather than a ramp because what sells a rubber curtain is
  // the flap back: it overshoots, swings past vertical and settles, and none of that has to be
  // authored. A pushed strip both swings and SHORTENS — the shortening is what keeps a rigid
  // strip from spearing the case it is supposed to be riding over, and it reads as the curtain
  // being lifted, which is what is really happening.
  for (let si = 0; si < BeltStrips.length; si++) {
    const st = BeltStrips[si];
    let want = 0;
    for (let i = 0, o = 0; i < BeltLiveN; i++, o += 4) {
      const cx = BeltLive[o], hw = BeltLive[o + 1], fr = BeltLive[o + 2], bk = BeltLive[o + 3];
      // fully open before the leading face is under the strip; starts falling once the trailing
      // face is through, so the strip never closes onto a case that is still passing
      let g = (fr - (MOUTH - .30)) / .26;
      if (g <= 0) continue;
      if (g > 1) g = 1;
      let e = ((MOUTH + .10) - bk) / .26;
      if (e <= 0) continue;
      if (e > 1) e = 1;
      if (e < g) g = e;
      // 0.26 rather than the case's own width, so the curtain lifts with a shoulder either side
      // instead of three strips snapping up and the fourth staying down.
      let lat = 1 - (Math.abs(st.sx - cx) - hw) / .26;
      if (lat <= 0) continue;
      if (lat > 1) lat = 1;
      const v = g * lat;
      if (v > want) want = v;
    }
    st.v += ((want - st.k) * 70 - st.v * 9) * dt;
    st.k += st.v * dt;
    let kc = st.k; if (kc < 0) kc = 0; else if (kc > 1) kc = 1;
    let ka = st.k; if (ka < -.22) ka = -.22; else if (ka > 1.12) ka = 1.12;
    const len = st.len0 * (1 - .585 * kc), a = -.30 * ka;
    const ca = Math.cos(a), sa = Math.sin(a), dy = -len / 2;
    // m0 is translate * scale with no rotation of its own, so the whole transform is rotX(a)
    // about the hanging bar at y 1.665 and it is nine numbers written straight into the matrix.
    const m = st.p.m;
    m[0] = .19; m[1] = 0; m[2] = 0;
    m[4] = 0; m[5] = ca * len; m[6] = sa * len;
    m[8] = 0; m[9] = -sa * st.sz; m[10] = ca * st.sz;
    m[12] = st.cx0;
    m[13] = st.py + ca * dy;
    m[14] = st.pz + sa * dy;
  }

  // ---- the 磅秤 head
  // A scale holds its reading for a moment after the load comes off it, which is the only reason
  // a display a bag crosses in a second is readable at all.
  const sc = BeltScale;
  if (sc) {
    if (onPlate) { sc.want = onPlate; sc.until = t + 2.4; }
    else if (t > sc.until) sc.want = 0;
    const w = sc.want | 0;
    if (w !== sc.kg) {
      sc.kg = w;
      const s = w < 10 ? '0' + w : String(w);
      sc.d[0].ch = s[0]; sc.d[1].ch = s[1];
      if (BeltLamp) BeltLamp.color = w ? sc.on : sc.off;
    }
    if (BeltLamp) BeltLamp.glow = w ? .30 + .16 * Math.sin(t * 6.2) : .26;
  }
};

// Where everything is, so the movement can be measured rather than watched — the same affordance
// `Airport.flierAt()` gives the runway aircraft, and for the same reason: an animation nobody can
// check is an animation that quietly stops working.
//
//   AirFit.belt.at()        -> { cases, shell, strips, kg }
//   AirFit.belt.pin = 5.4   -> freeze the cycle there, for a screenshot
AirFit['belt'].pin = null;
AirFit['belt'].at = () => ({
  cases: BeltCases.map(c => ({ x: c.x, z: +c.z.toFixed(3), hidden: c.hidden,
                               m14: +c.props[0].m[14].toFixed(3) })),
  shell: BeltShell.map(p => +p.m[14].toFixed(3)),
  strips: BeltStrips.map(s => +s.k.toFixed(3)),
  kg: BeltScale ? BeltScale.kg : null,
});
