// 🚇 闸机 Turnstiles — The five-cabinet / four-lane gate line — THE SPINE OF THE STATION
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    the gate line, z = -1.55 (GATEZ)
//   camera  94-gates, 94b-gateopen
//
// The five-cabinet / four-lane gate line — THE SPINE OF THE STATION. Concourse is z < GATEZ,
// platform is z > GATEZ. Owns the 刷卡/闸机 verbs and the green/red lane lamps. 94b-gateopen's
// `pre` block calls the real Metro.openGate, so that shot IS your acceptance test.
//
// ---------------------------------------------------------------------------------------------
// WHAT IS ALREADY IN js/metro.js, AND WHY THIS FILE IS ADDITIVE
//
// METRO.md's roster says this agent "builds the 5-cabinet / 4-lane gate line". IT IS ALREADY
// BUILT — Wave 0's split left the whole gate line in the shell, and the plan was never corrected.
// Measured, not assumed (line numbers as of this writing):
//
//   metro.js:280  cabinet(cx)  — plinth, fluted stainless carcass, recessed side panels, chrome
//                                cap, slab top, and a solid(cx±.22, GATEZ±.52) collider.
//   metro.js:303  lane(cx, inbound) — two glass flap leaves per side (alpha .30, mode 1) plus
//                                their chrome edge rails; the 刷卡 reader pod with its lit gold
//                                target; a dark display box carrying a two-bar chevron whose
//                                COLOUR is swapped between LAMP_SHUT and LAMP_OPEN by the shell's
//                                own tick; and `bar`, the solid(cx±.55, GATEZ±.34) that opens.
//   metro.js:1235 the railing either side — solid from |x| 3.20 out to 6.40.
//   metro.js:1248 for (const cx of CABX) cabinet(cx);   CABX = [-3.00,-1.50,0,1.50,3.00]
//   metro.js:1249 LANEX.forEach((cx, i) => lane(cx, i < 2));  LANEX = [-2.25,-.75,.75,2.25]
//   metro.js:1250 the hanging 进站 / 出站 banners, on the ceiling over each half.
//   metro.js:1263 thing('闸机') and metro.js:1271 thing('刷卡') — both verbs already exist.
//   metro.js:2190 openGate(entering, px, t) — picks the nearest lane facing the right way, sets
//                                `open`, `bar.open`, and `until = t + GATE_HOLD` (6 s).
//   metro.js:2633 the shell's tick — slides the flaps along x from their `m0`, recolours the
//                                chevrons, and refuses to shut a lane on a body standing in it.
//
// So NOTHING in this file rebuilds a cabinet, a flap, a reader or a barrier. Duplicating any of
// them would put a second carcass inside the first and double the draw cost of the one object in
// this room the player has to walk through. What was genuinely missing is what is here:
//
//   1. the 进站 / 出站 arrows ON THE FLOOR — the shell has the ceiling banners only, and a
//      banner tells you which half of the line to use, not which way to walk through it;
//   2. a real green-arrow / red-cross lane indicator on the face you actually approach — the
//      shell's chevron is a recoloured chevron, and a red chevron is not a ✕;
//   3. the 请刷卡 notice — nowhere in the station, and it is the one instruction a gate gives;
//   4. the 无障碍 lane — nowhere in the station.
//
// ---------------------------------------------------------------------------------------------
// THE 无障碍 LANE, AND THE HONEST LIMIT ON IT
//
// A wide accessible lane cannot be CUT here. The gate line is closed from wall to wall:
// railing solid -6.40..-3.20, five cabinet solids covering -3.22..+3.22 with four 1.06 m gaps,
// railing solid 3.20..6.40. Every one of those colliders is created in js/metro.js, which this
// agent may not write, and `solid` only ever adds — there is no way from `A` to widen a gap.
//
// So the accessible lane is DESIGNATED AND SIGNED rather than physically widened, which is the
// truthful thing to do and is also not much of a lie: the shell's own comment (metro.js:271) says
// the lanes were made 1.10 m clear — twice a real turnstile aisle — precisely so a 0.30 m body
// radius could steer them, and 1.06 m of clear run is already wider than the 90 cm a Chinese
// 无障碍闸机 is built to. What it lacks is the marking, and that is what this file adds.
//
// Lane 0 (x = -2.25, 进站) is the one chosen, for a measured reason: lane 1 (x = -0.75) already
// has the shell's 盲道 tactile path running down the middle of it (metro.js:1991, a .24 m strip
// from z -3.10 through the gate line to the platform). 盲道 and 无障碍 are different provisions
// for different passengers, and stacking a wheelchair marking on top of a blind-guidance path
// would have hidden both. So: blind passengers keep lane 1, wheelchairs are signed to lane 0,
// which is exactly how a Beijing station splits them.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE
//
// Every prop this file animates changes `color` and `glow` ONLY. Neither touches a matrix, and
// metro.js:203 is explicit that those two are the fields that cost nothing to change. Nothing
// here slides, so nothing here can be snapped back to a matrix nobody meant. They are still all
// registered through `A.rest` — registering a prop that never moves is a no-op, and the next
// person to make one of these move should not have to remember to add the call.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
// Budget 160 props, 8 translucent. This zone spends ~68 props and **zero** translucent: the only
// glass on the gate line is the shell's eight flap panes, and eight is the whole translucent
// budget for the room already. Everything here is opaque, and it batches:
//
//   * the floor chevrons and inlay bands are `flat` quads with no `mode` and no `mat`, so they
//     join the same quad batch as the platform's yellow line and the station-name inlays;
//   * the indicator panels, arrows and crosses are `hard` boxes at `mode: 1` with no `mat`,
//     which is the same batch key as the shell's own chevron lamps — five identical cabinets
//     are one draw call and so are twenty lamps in two colours, because colour, gloss, alpha
//     and glow all travel per instance;
//   * every character is real Chinese through the glyph atlas, which batches.
//
// ---------------------------------------------------------------------------------------------

// The four colours and two glow levels the indicator swaps between, built ONCE at load rather
// than per lane or per frame. `C` is gl.js's global colour helper and gl.js loads long before
// this file, so there is no ordering hazard in making them out here — and out here is where the
// tick can reach them without closing over the builder's scope.
//
// A lamp that is off is not black. An unlit segment on a dark panel still catches the room, and
// a panel with one symbol simply absent reads as a broken display rather than as a gate saying
// no — so `openOff` and `shutOff` are the dark tints of the two lit colours, not the absence
// of them.
const GATE_LAMP = {
  open: C('#4fd68c'), openOff: C('#1d332a'),   // the shell's own LAMP_OPEN, and it unlit
  shut: C('#c8452f'), shutOff: C('#33201c'),   // the shell's own LAMP_SHUT, and it unlit
  on: .58, off: .03,
};

MetroFit['gates'] = A => {
  // The shell already owns 闸机 and 刷卡; this zone contributes the signed accessible lane.
  const { box, flat, glyphs, rest, thing } = A;
  const { C, col } = A;

  const GZ = A.GATEZ;                     // -1.55, the spine

  // The lane centres, taken from the shell's own walk graph rather than retyped. `A` does not
  // export LANEX, but WALK.inLane and WALK.outLane ARE LANEX split in two (metro.js:145) — so
  // this is the shell's number, not a copy of it that can drift out of step.
  const LANEX = [...A.WALK.inLane, ...A.WALK.outLane];       // [-2.25, -.75, .75, 2.25]
  // Half the lane pitch, which is also the offset from a lane centre to the cabinet either side
  // of it. Derived, so that moving the gate line in metro.js moves this with it.
  const HALF = (LANEX[1] - LANEX[0]) / 2;                    // .75
  const IN_N = A.WALK.inLane.length;                         // lanes below this index are 进站

  // Characters lying flat on the floor. `glyphs()` stands its quads up — the chain ends in
  // rotX(π/2) — which is right for a wall and wrong for the ground, so floor characters are
  // built the way metro.js:1538 builds the station-name inlays: registered with the atlas, then
  // given a matrix of translate · rotY · scale and pushed straight into the prop list.
  //
  // `pd` is the direction the reader is WALKING, and it decides both the yaw and which end of
  // the run the first character goes at. For somebody walking +z the viewer's left is world +x,
  // so the name has to run DOWN in x or it reads backwards — the trap metro.js:1536 names. For
  // somebody walking -z it is the other way, and both are mirror images of the same rule.
  function floorText(cx, y, z, text, size, color, pd) {
    const chars = [...Glyphs.need(text)];
    const step = size * 1.18, span = (chars.length - 1) * step;
    const out = [];
    chars.forEach((ch, i) => {
      const t = -span / 2 + step * i;
      const p = {
        mesh: 'quad', ch, color, mode: 0, gloss: .28, alpha: 1,
        m: M.mul(M.trans(cx - pd * t, y, z),
             M.mul(M.rotY(pd > 0 ? Math.PI : 0), M.scale(size, 1, size))),
      };
      A.props.push(p); out.push(p);
    });
    return out;
  }

  // A chevron painted on the floor, as two bars meeting at a point. Two bars, not three: the
  // shell's own note at metro.js:351 is that three stacked bars of decreasing width read as a
  // hamburger menu rather than as an arrow, and the same is true lying down. `pd` is the way it
  // points, which on the approach side of the line is always TOWARDS the line.
  //
  // The tips are worked out rather than eyeballed: a bar of length .48 whose centre sits .17
  // off the axis and .14 up it, turned 45°, puts its far end at exactly (cx, zz + .31) — so the
  // two halves meet at a point instead of crossing or leaving a notch.
  function chevron(cx, zz, pd, c) {
    for (const s of [-1, 1])
      flat(cx + s * .17, .0045, zz + pd * .14, .11, .48, c,
        { ry: -s * pd * Math.PI / 4, gloss: .14 });
  }

  // ---------------------------------------------------------------- 地面箭头 the floor arrows
  // The 进站/出站 split, put where somebody walking actually looks. The shell hangs two banners
  // from the ceiling over the two halves of the line, which answers "which half" and not "which
  // way": a banner is read from ten metres away and then never again, and the last three metres
  // up to a turnstile are walked looking at the floor.
  //
  // Green for 进站 and gold for 出站, the same two colours the banners overhead are painted, so
  // the floor and the ceiling are saying one thing rather than two.
  //
  // The distances from the line are measured against what is already on this floor, not chosen:
  // metro.js:2030 lays a contact-shadow band 1.30 m deep across the whole gate line (GZ ± .65),
  // and the shell's tactile paving crosses the concourse at z -3.10. So the near chevron sits at
  // .80 m out — far enough that its tail is only just into the shadow, which is where a painted
  // marking near a machine belongs — and the far one at 1.35 m, short of the tactile crossing.
  for (let i = 0; i < LANEX.length; i++) {
    const cx = LANEX[i], inbound = i < IN_N;
    // Which side of the line you approach this lane from, and therefore which way its arrow
    // points. -1 is the concourse. `pd` is the walking direction: the opposite of the side you
    // stand on, because you are walking at the gate, not away from it.
    const dir = inbound ? -1 : 1, pd = -dir;
    const c = inbound ? col.jade : col.gold;
    chevron(cx, GZ + dir * .80, pd, c);
    chevron(cx, GZ + dir * 1.35, pd, c);
  }

  // 进站 / 出站 on the floor as well as overhead, one band per half rather than one per lane.
  // A granite inlay with the characters cut pale into it, which is the idiom this station already
  // uses for its own name (metro.js:1531) — so the two read as the same station's signwriting.
  //
  // Both bands are placed off the lane centres on purpose. -1.45 keeps the 进站 band clear of the
  // 盲道 strip at x -.87..-.63 AND of lane 0's accessible plate at x -2.57..-1.93; +1.50 at
  // z .42 keeps the 出站 band clear of the platform column, whose base runs x 1.11..1.69 and
  // z .66..1.24. Neither was eyeballed; both were measured off the props already standing there.
  for (const [bx, bz, txt, pd] of [[-1.45, GZ - 2.37, '进站', 1], [1.50, GZ + 1.97, '出站', -1]]) {
    flat(bx, .0042, bz, .88, .42, col.granite, { gloss: .30 });
    flat(bx, .0046, bz, .78, .32, C('#565a60'), { gloss: .34 });
    floorText(bx, .0054, bz, txt, .26, col.floorL, pd);
  }

  // ---------------------------------------------------------------- 通行灯 the go / no-go panel
  // What a gate owes you before you commit to walking into it. The shell has a chevron that turns
  // from red to green, which is most of the way there and stops short of the thing a real gate
  // does: a green ARROW when it will let you through and a red CROSS when it will not. A red
  // chevron is an arrow that has changed its mind about colour; a ✕ is a different word.
  //
  // Side by side on one dark panel rather than stacked in one place. Two symbols sharing a
  // position have to be drawn on top of each other, and the unlit one then sits as a dark shape
  // across the lit one — which on a 34 by 22 cm panel is the difference between a gate saying no
  // and a gate looking broken. Beside each other, the lit one is unambiguous and the dark one
  // reads as the segment that is simply off.
  //
  // On the END FACE of the cabinet carrying that lane's reader, on the side you approach from —
  // the same cabinet your card goes on, so the thing you touch and the thing that answers you
  // are one object.
  //
  // WHICH end face, exactly, is worth measuring rather than assuming, and getting it wrong is
  // invisible in a render from any angle but a grazing one. A cabinet is FOUR stacked boxes of
  // two different depths (metro.js:282-297): the plinth, the chrome cap and the slab top are all
  // .99 deep, so they end at GZ ± .495 — but the CARCASS, the part standing between y .11 and
  // y 1.01 and the only part anything at chest height can be mounted on, is .95 deep and ends at
  // GZ ± .475. Hanging this off .495 would have floated the whole indicator 2 cm in front of the
  // steel it is supposed to be set into, lit, with a shadow gap behind it.
  //
  // So: bezel on the face at .480, panel .010 proud of that, symbols .012 proud of the panel.
  // Three layers in the order a real inset display stacks, each clear of the one behind it —
  // the bezel is the biggest and goes FURTHEST BACK, or it covers the panel it is framing.
  const ind = [];
  for (let i = 0; i < LANEX.length; i++) {
    const cx = LANEX[i], inbound = i < IN_N;
    const dir = inbound ? -1 : 1;
    const cbx = cx + HALF;                       // the cabinet the reader pod is already on
    const zB = GZ + dir * .480;                  // bezel, sitting on the carcass face
    const zF = GZ + dir * .490;                  // the dark panel
    const zS = GZ + dir * .502;                  // the lit symbols, clear of the panel front
    const T = { tag: '闸机' };

    // A thin bright surround first, so the panel reads as an inset display rather than as a black
    // sticker on a steel box. Behind the panel and wider than it, so what shows is a rim.
    box(cbx, .74, zB, .37, .25, .010, col.steelD, { ...T, hard: true, gloss: .40 });
    box(cbx, .74, zF, .34, .22, .012, col.black, { ...T, hard: true, mode: 1, gloss: .22 });

    // ✕ on the left, as two bars crossed at 45°. Both turn about z, which for a bar standing up
    // in the xy plane is the only rotation that does anything.
    // Built in the state the gate is actually in at build time — shut. A lane whose indicator
    // starts lit green and is corrected on the first tick is a gate that says yes for one frame.
    const cross = [-1, 1].map(s => rest(box(cbx - .085, .74, zS, .035, .17, .010, GATE_LAMP.shut,
      { ...T, hard: true, mode: 1, glow: GATE_LAMP.on, rz: s * Math.PI / 4 })));
    // ↑ on the right: a shaft and two barbs meeting over it. The barbs turn by ∓45° — a bar
    // whose long axis is +y, turned by rz, points at (-sin rz, cos rz), so the barb on the
    // right of the shaft needs +45° to lean back in towards the tip and the left one -45°.
    const arrow = [rest(box(cbx + .085, .715, zS, .038, .13, .010, GATE_LAMP.openOff,
      { ...T, hard: true, mode: 1, glow: GATE_LAMP.off }))];
    for (const s of [-1, 1])
      arrow.push(rest(box(cbx + .085 + s * .038, .795, zS, .038, .085, .010, GATE_LAMP.openOff,
        { ...T, hard: true, mode: 1, glow: GATE_LAMP.off, rz: s * Math.PI / 4 })));

    // 请刷卡 under the panel, printed straight onto the stainless the way a gate carries its one
    // instruction. Yaw π on the -z face and 0 on the +z face, which is the shell's own rule for
    // two-sided signwriting (metro.js:1253) and the reason the characters do not come out
    // mirrored: `glyphs` lays its run along local +x, and rotY(π) maps that to world -x, which is
    // where a +z-walking reader's first character has to be.
    // Straight onto the carcass face, not onto the bezel: at y .50 this run is below the panel,
    // whose rim starts at y .615. `glyphs` lifts its quads .012 along its own +z, which after
    // rotY(π) is world -z and after rotY(0) is world +z — so on both faces the lift carries the
    // characters AWAY from the steel, which is the whole point of it.
    glyphs(cbx, .50, GZ + dir * .478, dir < 0 ? Math.PI : 0, '请刷卡',
      { size: .072, gap: .020, color: col.white, mode: 1, glow: .12, tag: '闸机' });

    ind.push({ cx, cross, arrow });
  }

  // ---------------------------------------------------------------- 无障碍 the accessible lane
  // Lane 0, and the reason it is lane 0 rather than lane 1 is in the header: lane 1 already
  // carries the shell's 盲道 tactile path, and a wheelchair marking laid over a blind-guidance
  // path hides both provisions instead of signing either.
  //
  // Two flanking bars rather than a filled blue field. A field would have had to carry the green
  // 进站 chevrons on top of it, and jade on blue is two dark colours arguing; bars down the edges
  // leave the chevrons on bare stone where they read, and a lane edged in blue is what the
  // marking means anyway. x ±.47 puts them just inside the cabinet faces at -2.78 and -1.72, so
  // the lane is edged to its true width and nothing is painted where a cabinet stands.
  const ACC = LANEX[0];
  for (const s of [-1, 1])
    flat(ACC + s * .47, .0034, GZ - 1.30, .12, 2.10, col.blue, { gloss: .18 });
  // The plate at the head of the lane. .64 wide, which is what keeps it clear of the 进站 band
  // beside it at x -1.89..-1.01, and at the same distance out as that band so the two read as one
  // row of floor signing rather than as two things that missed each other.
  flat(ACC, .0042, GZ - 2.37, .64, .42, col.blue, { gloss: .22 });
  floorText(ACC, .0054, GZ - 2.37, '无障碍', .17, col.white, 1);

  // And the same word standing up, on the one cabinet end face in the run that carries nothing:
  // -3.00 is the outer cabinet, and it is the only one with no reader panel on its concourse
  // face, because the lane it serves takes its reader from the cabinet on the other side.
  // Signed at eye-line as well as on the floor, since the floor plate is the first thing under a
  // queue and the plate on the cabinet is what is left when somebody is standing on it.
  // Same .475 carcass face as the indicators, for the same reason — the plinth and cap are .99
  // deep and the part you can mount anything on is not.
  const accBx = ACC - HALF;
  box(accBx, .80, GZ - .484, .30, .22, .012, col.blue, { tag: '闸机', hard: true, gloss: .26 });
  glyphs(accBx, .80, GZ - .492, Math.PI, '无障碍',
    { size: .073, gap: .018, color: col.white, mode: 1, glow: .10, tag: '闸机' });

  // Reach is deliberately short: the shell's 闸机 verb has a broad reach at the line itself and
  // must keep winning there, while this word is learned by walking up to the marked lane.
  thing('无障碍', ACC, 1.02, GZ - 1.30, '这个闸机是无障碍通道。',
    'This gate is the accessible lane.',
    '无 without + 障碍 obstacle.', { focus: [ACC, GZ - 1.55], reach: 1.5 });

  // ---------------------------------------------------------------- what the tick has to know
  // Handed to the tick as a closed-over array built ONCE, here. The tick allocates nothing.
  MetroFit['gates'].lanes = ind;
};

// The indicators follow the lanes. Colour and glow only — no matrix is touched, nothing is
// allocated, and every prop is written in place.
//
// The lane state is read back through the shell's own `Metro.gateOpen()` rather than guessed at
// from a timer of our own, so the panel cannot disagree with the barrier it is describing: the
// same call that reports a lane open is the one the collider is keyed off. That is also what
// makes 94b-gateopen a real acceptance test — its `pre` block calls the REAL `Metro.openGate`,
// and if the arrow below does not light, the state machine is broken rather than the camera.
//
// `gateOpen()` builds a small array each call, which is the one allocation in this path and it
// belongs to the shell, not here. It is at most four numbers and it is the only lane-state read
// the shell exports; a non-allocating one is a ticket, not a reason to keep a second copy of the
// gate's state in this file and let the two drift apart.
MetroFit['gates'].tick = () => {
  const lanes = MetroFit['gates'].lanes;
  if (!lanes || typeof Metro === 'undefined') return;
  const open = Metro.gateOpen();
  for (let i = 0; i < lanes.length; i++) {
    const L = lanes[i];
    // `openGate` hands back lane centres, so a centre is the identity here too. An exact match
    // is safe — both sides are the same number out of the same array — but the tolerance costs
    // nothing and survives somebody moving a lane by a millimetre.
    let isOpen = false;
    for (let k = 0; k < open.length; k++)
      if (Math.abs(open[k] - L.cx) < .01) { isOpen = true; break; }
    for (let k = 0; k < L.arrow.length; k++) {
      L.arrow[k].color = isOpen ? GATE_LAMP.open : GATE_LAMP.openOff;
      L.arrow[k].glow = isOpen ? GATE_LAMP.on : GATE_LAMP.off;
    }
    for (let k = 0; k < L.cross.length; k++) {
      L.cross[k].color = isOpen ? GATE_LAMP.shutOff : GATE_LAMP.shut;
      L.cross[k].glow = isOpen ? GATE_LAMP.off : GATE_LAMP.on;
    }
  }
};
