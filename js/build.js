// Shared scene construction. A chair and a six-storey block are described the same way:
// primitives with a world transform, plus colliders, walkable zones and pick data. Both the
// apartment and the neighbourhood outside are built through this.
const Build = (() => {
  // Stable small integers for GL texture objects, so a batch key can be a string. WeakMap
  // because the keys are GL objects and a room that is thrown away should take its entries
  // with it.
  const texIds = new WeakMap();
  const pendingTexIds = new Map();
  let texSeq = 0;
  // ---- the doll's-house partition, in one place for every building
  //
  // An interior wall is built as TWO pieces so the walls-down setting can take the upper one and
  // leave a low kerb standing. `SET.wallsOff` reads the `partition` property in `hiddenProp`
  // (js/game.js:2417) and that is a DRAW test only — no collider anywhere is touched, so a wall
  // with its top half hidden is still a wall you walk into. The kerb is the only thing that then
  // says where the doorways are, which is the whole complaint the feature answers: "I don't know
  // where the doors are so I run into them". A doorway needs no marking of its own — it is simply
  // a stretch where the caller built no partition, so it comes out as a gap in the kerb.
  //
  // 0.40 m, chosen by looking in flat 202 and shared from here so no two buildings can disagree
  // about it. Lower — 0.11, the skirting's own height — reads as a line painted on the floor from
  // a raised camera and is invisible at walking height. Higher, past about 0.55, and the kerb
  // starts hiding what the setting exists to show: a bed deck sits at 0.55, a sofa seat at 0.42,
  // and every counter and low table is under that.
  const PARTITION_STUB = 0.40;
  // `make(yCentre, height, opts)` builds one piece however the caller already builds walls —
  // A.box, A.wall, a scene's own wrapper — and merges `opts` into its option object. This owns
  // the split, the height and the flag, and nothing else, so a caller never hand-splits again.
  //
  // Only the UPPER piece is flagged. Flagging the stub deletes the thing the stub exists to be.
  // The flag is a plain property and deliberately not a tag: `tagBox` is scene-wide across all
  // twelve storeys of the tower, so one shared tag would average its group centre through the
  // middle of the building and hide every floor's walls at once.
  //
  // `lap` overlaps the upper piece 2 mm down into the stub. Two coincident horizontal faces at
  // one y is the coplanar z-fight this repo has taken outages from; 2 mm cannot fight and costs
  // nothing. A caller building with QUADS passes lap 0 — an upright quad has no horizontal face
  // to fight with, and two coplanar quads overlapping in y would z-fight over the overlap band
  // instead. Edge to edge is right there and 2 mm is right for solids.
  //
  // A wall no taller than the stub comes back whole and unflagged: there is nothing above kerb
  // height to hide, and half a piece is worse than one.
  function partitionSplit(baseY, height, make, lap = 0.002) {
    const stub = Math.min(PARTITION_STUB, height);
    const lo = make(baseY + stub / 2, stub, {});
    if (height - stub <= 0) return [lo, null];
    const hi = make(baseY + (stub - lap + height) / 2, height - stub + lap, { partition: true });
    return [lo, hi];
  }
  const texId = t => {
    const objectKey=(typeof t==='object'&&t!==null)||typeof t==='function';
    const ids=objectKey?texIds:pendingTexIds;
    return ids.get(t)||(ids.set(t,++texSeq),texSeq);
  };


  function scene(cfg = {}) {
    const props = [], things = [], solids = [], shadows = [], glows = [], blockers = [];
    const lights = [];
    const wood = cfg.wood || new Set();
    const fabricGloss = cfg.fabricGloss === undefined ? .03 : cfg.fabricGloss;

    function transform(x, y, z, sx, sy, sz, o = {}) {
      let r = M.ident();
      if (o.ry) r = M.mul(r, M.rotY(o.ry));
      if (o.rx) r = M.mul(r, M.rotX(o.rx));
      if (o.rz) r = M.mul(r, M.rotZ(o.rz));
      return M.mul(M.trans(x, y, z), M.mul(r, M.scale(sx, sy, sz)));
    }
    // Wood is common enough to be worth inferring from the colour, so every table leg does
    // not have to repeat `mode: 6`.
    function material(color, o) {
      if (o.mode !== undefined) return o;
      return wood.has(color) ? { ...o, mode: 6 } : o;
    }
    function shape(mesh, x, y, z, sx, sy, sz, color, o = {}) {
      const opt = material(color, o);
      const p = {
        mesh, m: transform(x, y, z, sx, sy, sz, opt), color,
        ob: { x, y, z, ry: opt.ry || 0, sx, sy, sz }, ...opt,
      };
      props.push(p); return p;
    }
    // Furniture defaults to a genuinely rounded silhouette. `hard:true` is reserved for
    // architectural trim, screens, books, brickwork and intentionally machined panels.
    function box(x, y, z, sx, sy, sz, color, o = {}) {
      return shape(o.hard ? 'box' : 'softBox', x, y, z, sx, sy, sz, color, o);
    }
    function cyl(x, y, z, r, h, color, o = {}) {
      return shape('cyl', x, y, z, r * 2, h, r * 2, color, o);
    }
    function ball(x, y, z, rx, ry, rz, color, o = {}) {
      return shape('ball', x, y, z, rx * 2, ry * 2, rz * 2, color, o);
    }
    function capsule(x, y, z, sx, sy, sz, color, o = {}) {
      return shape('capsule', x, y, z, sx, sy, sz, color, o);
    }
    // A downloaded mesh, placed the way a primitive is placed (js/assets.js). Differences from
    // everything above, all of which come from the model having a shape of its own rather than
    // being a unit cube the caller scales:
    //
    //  - `s` is a straight multiplier on the model's real size in metres, not a dimension.
    //  - It stands on `y` rather than being centred on it, because that is what a scene knows:
    //    the floor is at 0, so a stool goes at 0. `anchor:'mid'` centres it instead, for the
    //    things that hang — a clock, a fan.
    //  - The bounding sphere is measured, not derived from the transform, so `finish` is told
    //    to leave it alone. Deriving it would assume a unit cube and cull the model wrongly.
    //
    // Returns null if the model is missing, so a scene can fall back to the primitives it used
    // before rather than losing the prop altogether.
    function model(name, x, y, z, s = 1, o = {}) {
      const src = typeof Assets === 'undefined' ? null : Assets.get(name);
      if (!src) return null;
      const parts = Assets.upload(name);
      if (!parts) return null;
      const ry = o.ry || 0, c = Math.cos(ry), sn = Math.sin(ry);
      // Lift so the requested anchor lands exactly on y.
      const lift = -(o.anchor === 'mid' ? src.mid[1] : src.lo[1]) * s;
      const m = transform(x, y + lift, z, s, s, s, { ry });
      const mx = src.mid[0] * s, my = src.mid[1] * s + lift, mz = src.mid[2] * s;
      const out = [];
      for (const p of parts) {
        const q = {
          mesh: p.mesh, m, color: o.color || p.color, tex: p.tex, nrm: p.nrm,
          mode: o.mode === undefined ? 0 : o.mode,
          gloss: o.gloss === undefined ? 0.18 : o.gloss,
          alpha: o.alpha === undefined ? 1 : o.alpha,
          glow: o.glow || 0, tag: o.tag,
          ob: { x, y, z, ry, sx: s, sy: s, sz: s },
          fixed: true,
          cx: x + (c * mx + sn * mz), cy: y + my, cz: z + (-sn * mx + c * mz),
          r: src.r * s,
        };
        props.push(q); out.push(q);
      }
      return out;
    }
    function taper(x, y, z, sx, sy, sz, color, o = {}) {
      return shape('taper', x, y, z, sx, sy, sz, color, o);
    }
    // `wall` and `flat` both return the prop they pushed, the same way `shape()` and everything
    // built on it (box, cyl, ball, capsule, taper) already did. The inconsistency between five
    // helpers that return and two that did not was itself the bug: `const p = flat(...)` reads
    // correct at the call site, passes `node --check`, and throws at scene-build time on the next
    // line. It cost floor 4 a build. Nothing has ever relied on either returning undefined.
    function wall(x, y, z, w, h, yaw, color, o = {}) {
      const m = M.mul(M.trans(x, y, z),
        M.mul(M.rotY(yaw), M.mul(M.rotX(Math.PI / 2), M.scale(w, 1, h))));
      const p = { mesh: 'quad', m, color, ...o };
      props.push(p); return p;
    }
    function flat(x, y, z, w, d, color, o = {}) {
      const p = { mesh: 'quad', m: M.trs(x, y, z, o.ry || 0, w, 1, d), color, ...o };
      props.push(p); return p;
    }
    // Writing on a surface. One textured quad per character, standing off the face of whatever
    // it is written on by `lift` so it never fights the board for the same pixels.
    //
    // The chain is translate · yaw · offset · stand-up · scale. Standing the quad up maps its
    // local +z to world -y, which means v = 0 is the top of the glyph — the same way round as
    // the canvas the atlas was drawn on, so no flip is needed anywhere.
    function glyphs(x, y, z, yaw, text, o = {}) {
      const size = o.size || 0.26;
      const gap = o.gap === undefined ? size * 0.14 : o.gap;
      const chars = [...Glyphs.need(text)];
      const primarySign = Glyphs.role(text, size, o) === 'primary';
      // Most legacy signs were composed on a square CJK grid, so retain that as the default.
      // Interior information screens opt into proportional advances: a Latin letter is not a
      // full-width Han cell and a word space is not an empty square.  The textured quads may
      // overlap in their transparent margins; only their ink writes colour/depth.
      const proportional = o.proportional === true;
      const widthFor = ch => !proportional ? 1 : ch === ' ' ? .34 :
        /[A-Za-z0-9]/.test(ch) ? .68 : /[.,:;!?'"()\-]/.test(ch) ? .42 : 1;
      const advances = chars.map(ch => widthFor(ch) * size);
      const span = advances.reduce((sum, advance) => sum + advance, 0) +
        Math.max(0, chars.length - 1) * gap;
      const lift = o.lift === undefined ? 0.012 : o.lift;
      const out = [];
      // Legacy square-grid text historically starts half a gap to the right of the mathematically
      // centred cursor. Preserve those exact world positions unless proportional layout is the
      // explicit opt-in; streets and older interiors must not move when university copy improves.
      let cursor = -span / 2 + (proportional ? 0 : gap / 2);
      chars.forEach((ch, i) => {
        const advance = advances[i], t = cursor + advance / 2;
        cursor += advance + (i + 1 < chars.length ? gap : 0);
        if (ch === ' ') return;
        const ox = o.vertical ? 0 : t, oy = o.vertical ? -t : 0;
        const m = M.mul(M.trans(x, y, z), M.mul(M.rotY(yaw),
          M.mul(M.trans(ox, oy, lift),
            M.mul(M.rotX(Math.PI / 2), M.scale(size, 1, size)))));
        const p = { mesh: 'quad', m, color: o.color, ch,
          // Only the Han cells opt into distance stabilisation. A mixed Chinese/English board
          // therefore keeps its Latin subtitle and punctuation exactly as before.
          glyphPrimary: primarySign && Glyphs.isHan(ch),
          glyphProportional: proportional, glyphAdvance: advance,
          mode: o.mode === undefined ? 0 : o.mode,
          gloss: o.gloss === undefined ? 0.10 : o.gloss,
          glow: o.glow || 0, alpha: o.alpha === undefined ? 1 : o.alpha, tag: o.tag };
        props.push(p); out.push(p);
      });
      return out;
    }
    // Blocks the body. Axis-aligned in xz, which is all a walking sim needs.
    // Handed back, so a scene can keep a reference and set `open` on it later. A barrier that
    // opens is the difference between a turnstile you are teleported through and one you walk
    // through, and nothing else in the collider needs to know the difference.
    // A real light in the room, as opposed to `glow`, which paints a pool on the floor and
    // lights nothing. The two are complementary and both are usually wanted: this one makes
    // the surfaces near it respond, that one draws the soft patch under it that no point light
    // in a renderer without global illumination will ever produce on its own.
    //
    // Handed back so a scene can keep the reference and switch it with the hour: `l.on = false`
    // is a lamp that is off, and the frame loop simply stops submitting it.
    function light(x, y, z, col, power = 1, radius = 2.2) {
      const l = { x, y, z, col, power, radius, on: true };
      lights.push(l); return l;
    }
    function solid(x0, x1, z0, z1) {
      const s = { x0, x1, z0, z1, open: false };
      solids.push(s); return s;
    }
    // Blocks the camera only: building masses the eye must not slide inside, since every
    // surface is single-sided and the eye would otherwise see straight through the block.
    // `top` matters — a single-storey courtyard should not stop a camera that has already
    // risen above its roof, or looking across a narrow alley would be impossible.
    function blocker(x0, x1, z0, z1, top = 400, opts) {
      const b = { x0, x1, z0, z1, top };
      if (opts && Number.isFinite(opts.pad) && opts.pad >= 0) b.pad = opts.pad;
      blockers.push(b);
      return b;
    }
    // Sits above any rug layers below, so furniture shadows fall *onto* a rug instead of
    // being swallowed by it.
    function shade(x, z, w, d, a = .42, y = .020) {
      const s = { m: M.trs(x, y, z, 0, w, 1, d), a };
      shadows.push(s);
      return s;
    }
    // Concentric woven bands plus a fringe on the short ends. Lit, not emissive: a rug has
    // to pick up the same sun and lamp light as the floor it lies on, or it reads as a
    // sticker pasted onto the room.
    function rug(x, z, w, d, bands, fringe) {
      bands.forEach(([inset, color], i) => {
        flat(x, .005 + i * .0035, z, w - inset, d - inset, color, { mode: 7, gloss: fabricGloss });
      });
      if (fringe === false) return;
      const n = Math.max(6, Math.round(w / .075));
      for (let i = 0; i < n; i++) {
        const fx = x - w / 2 + (i + .5) * (w / n);
        for (const s of [-1, 1])
          box(fx, .010, z + s * (d / 2 + .028), w / n * .62, .015, .055,
            bands[0][1], { mode: 7, gloss: fabricGloss, ry: (i % 3 - 1) * .05 });
      }
    }
    // `sun:true` marks a pool of daylight, so it can fade with the clock.
    function glow(m, color, a, sun, mode) {
      const g = { m, color, a, sun: !!sun, mode };
      glows.push(g); return g;
    }
    function thing(hz, x, y, z, sentence, tr, note, o = {}) {
      const th = { hz, pos: [x, y, z], sentence, tr, note, tag: o.tag || hz,
        focus: o.focus || [x, z], reach: o.reach || 1.5 };
      things.push(th); return th;
    }

    function hitBox(o, d, b) {
      const c = Math.cos(b.ry), s = Math.sin(b.ry);
      const px = o[0] - b.x, py = o[1] - b.y, pz = o[2] - b.z;
      const L = [c * px - s * pz, py, s * px + c * pz];
      const D = [c * d[0] - s * d[2], d[1], s * d[0] + c * d[2]];
      const h = [b.sx / 2, b.sy / 2, b.sz / 2];
      let t0 = -Infinity, t1 = Infinity;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(D[i]) < 1e-9) { if (Math.abs(L[i]) > h[i]) return null; continue; }
        let ta = (-h[i] - L[i]) / D[i], tb = (h[i] - L[i]) / D[i];
        if (ta > tb) { const q = ta; ta = tb; tb = q; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t1 < t0) return null;
      }
      if (t1 < 0) return null;
      return t0 > 0 ? t0 : t1;
    }

    // Seals the scene: derives per-prop cull data, one box per labelled object, and hands
    // back the public object the game loop talks to.
    function finish(extra = {}) {
      const zones = extra.zones || [];
      const tagBox = {};
      // Props whose material could not be resolved yet — see the note further down.
      const pendingMat = [];
      for (const p of props) {
        const m = p.m;
        // `mat:'tile'` names a tiling surface texture (js/assets.js); the renderer wants the GL
        // texture itself. It is resolved here rather than in `shape` because `flat`, `wall` and
        // `rug` push straight into `props` without going through it — which is how the first
        // version of this shipped a string to bindTexture and threw on the first frame. This
        // loop is the one place every prop passes through, whatever built it.
        // Resolving a material means uploading a texture, which needs a GL context. Scene builders
        // are also used by boot-time registries and tooling, so that context is not guaranteed yet.
        //
        // So resolution is *attempted* here and recorded if it cannot happen yet. Anything left
        // pending is resolved by `resolveMats` below, which the travel code calls on arrival —
        // by which time the renderer certainly exists. Keeping the name on the prop until then
        // means nothing is lost, only deferred.
        if (typeof p.mat === 'string') {
          if (p.matScale === undefined) p.matScale = 1;
          // Assets may already have decoded bitmaps while the renderer itself has not been
          // initialised yet. Upload only when a live GL context exists; otherwise retain the
          // name for resolveMats() on arrival.
          const glReady = typeof R !== 'undefined' && !!R.gl;
          const t = glReady && typeof Assets !== 'undefined' ? Assets.material(p.mat) : null;
          if (t) {
            if (p.nrm === undefined) p.nrm = Assets.materialNormal(p.mat);
            p.mat = t;
          } else pendingMat.push(p);
        }
        // A loaded model measured its own bounds when it was placed (`model` above). The
        // figures below assume a unit mesh centred on the transform's origin, which a glTF
        // asset is not, so recomputing here would move its centre and shrink its radius —
        // and the draw loop would cull it while it was still on screen.
        if (!p.fixed) {
          const sx = Math.hypot(m[0], m[1], m[2]);
          const sy = Math.hypot(m[4], m[5], m[6]);
          const sz = Math.hypot(m[8], m[9], m[10]);
          // Centre and bounding radius, so the draw loop can drop what cannot be on screen.
          p.cx = m[12]; p.cy = m[13]; p.cz = m[14];
          p.r = .5 * Math.hypot(sx, sy, sz);
        }
        // The cutaway hides a fixture as a whole, so a cabinet can never disappear while its
        // own door panel and the soap on top of it keep rendering.
        //
        // `nocut` props are excluded, and this is the only thing tagBox feeds — `hiddenProp`
        // (js/game.js) is its single consumer. A prop that has opted out of the cutaway must not
        // get a vote in the cutaway decision of the props that share its tag. The hotel showed why:
        // its shell envelope is four exterior walls all tagged 墙, so the group's centre landed at
        // the middle of the floor plate, and once the walls opted out with `nocut` they went on
        // dominating that centre anyway — dragging every partition an agent had tagged 墙 into
        // hiding or showing as one, judged by a point none of them occupies. One floor had 124
        // walls hanging off it.
        //
        // This narrows the group to props that can actually be cut; it does not make a wide tag
        // group correct. A tag shared by props metres apart is still being judged by a point
        // nothing sits at — see js/home-walls.js:184 for the pattern that avoids it, giving each
        // wall stretch its own tag so the group is the wall plus its own skirting.
        if (!p.tag || !p.ob || p.nocut) continue;
        const b = tagBox[p.tag] ||
          (tagBox[p.tag] = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
        b.x0 = Math.min(b.x0, p.ob.x); b.x1 = Math.max(b.x1, p.ob.x);
        b.z0 = Math.min(b.z0, p.ob.z); b.z1 = Math.max(b.z1, p.ob.z);
      }
      for (const k in tagBox) {
        const b = tagBox[k];
        b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2;
      }

      // ---- batches, for the instanced draw path (js/gl.js).
      //
      // Props are grouped by everything the shader reads as a uniform, because that is exactly
      // what a single instanced call cannot vary: the mesh, the mode, the corner radius and
      // bevel, and any bound textures. Everything that does vary — matrix, colour, gloss,
      // alpha, glow — travels per instance.
      //
      // Most see-through geometry stays out, because batching reorders drawing and transparency
      // is the one thing in this renderer that depends on order. There is one deliberately narrow
      // exception: tagged mode-1 panes belonging to the same authored fixture. A jewellery case's
      // five pieces of glass (or a shopfront's repeated bays) are already one visual object, retain
      // their construction order inside the batch, and share a tag that prevents them being mixed
      // with the next shop. Those groups are appended after every opaque batch, exactly where the
      // old loose pass drew them, and turn hundreds of tiny mall glass calls into a few dozen.
      //
      // Glyphs used to be excluded too, on the grounds that the atlas cell had to be a uniform.
      // It does not any more: it is an instance attribute now (see `iRect` in js/gl.js), which is
      // what lets a shop board's dozen characters come out as one call instead of a dozen. They
      // are still keyed apart from everything else — `ch` is in the key below — for one reason:
      // a glyph must not cast a shadow, the plain path has always refused to let it, and the
      // depth pass drops whole batches rather than individual props. Mixing a character in with
      // the sign it is painted on would put its silhouette on the wall behind.
      const batches = [], byKey = new Map(), alphaBatches = [], alphaByKey = new Map();
      for (const p of props) {
        const translucent = p.alpha !== undefined && p.alpha < 0.999;
        // Mode 1 is the renderer's pane/emitter material. Requiring a tag keeps the grouping local
        // to one authored fixture; untagged steam, haze and decorative translucency keep the exact
        // loose draw order they had before.
        // `alphaGroup` lets a deliberately unified unpickable layer (for example the zoo's
        // switchable accessible-route overlay) share the same safe local ordering without
        // pretending to be an interaction tag.
        const alphaGroup = p.tag || p.alphaGroup;
        const alphaBatchable = translucent && (p.mode || 0) === 1 && !!alphaGroup;
        if (translucent && !alphaBatchable) { p.batch = null; continue; }
        const list = alphaBatchable ? alphaBatches : batches;
        const map = alphaBatchable ? alphaByKey : byKey;
        // World-space movers get their own otherwise-identical batch. Mixing them into the street's
        // enormous static box/ball batches would make one changing car invalidate thousands of
        // cached facade and paving visibility tests every frame.
        const key = (p.dynamic ? 'dynamic|' : 'static|') +
          (alphaBatchable ? 'alpha|' + alphaGroup + '|' : '') +
          (p.ch ? 'ch|' : '') + (p.mesh || 'box') + '|' + (p.mode || 0) + '|' +
          (p.round === undefined ? 'd' : p.round) + '|' + (p.bevel === undefined ? 'd' : p.bevel) +
          '|' + (p.tex ? texId(p.tex) : 0) + '|' + (p.mat ? texId(p.mat) : 0) +
          '|' + (p.nrm ? texId(p.nrm) : 0) + '|' + (p.matScale || 0) + '|' +
          (p.matAmt === undefined ? 'd' : p.matAmt) + '|' + (p.nrmAmt === undefined ? 'd' : p.nrmAmt);
        let b = map.get(key);
        if (!b) {
          b = { mesh: p.mesh || 'box', props: [], glyph: !!p.ch, alpha:alphaBatchable,
                dynamic: !!p.dynamic,
                opt: { mode: p.mode || 0, round: p.round, bevel: p.bevel, tex: p.tex,
                       mat: p.mat, nrm: p.nrm, matScale: p.matScale, matAmt: p.matAmt,
                       nrmAmt: p.nrmAmt } };
          map.set(key, b); list.push(b);
        }
        b.props.push(p); p.batch = b;
      }
      // A batch of one is a draw call either way and costs an instance upload on top, so those
      // go back to the plain path.
      const keptOpaque = batches.filter(b => b.props.length > 1);
      const keptAlpha = alphaBatches.filter(b => b.props.length > 1);
      for (const b of batches.concat(alphaBatches))
        if (b.props.length <= 1) for (const p of b.props) p.batch = null;
      // Transparent groups come last, preserving the renderer's opaque-before-glass contract.
      const kept = keptOpaque.concat(keptAlpha);
      extra.batches = kept;

      // ---- the cull inputs, packed, and the props that are not in any batch.
      //
      // The draw loop asks the same four questions of every prop, every frame, twice over: where
      // is its centre, how big is its bounding sphere, is it in front of the eye, is it on screen.
      // Reading those off the prop objects is where the frame was going. There are 204 distinct
      // object shapes among the shopping centre's 31,955 props — every builder file in the game
      // assembles its props with a slightly different set of fields, so `p.cx` is a megamorphic
      // property load that V8 cannot cache and cannot inline. Measured on an M3, one pass over
      // the mall: 7.76 ms reading the objects as the loop did, 3.43 ms reading the same numbers
      // out of one Float32Array. Both passes run every frame, so that is most of eight
      // milliseconds of a sixteen-millisecond budget, recovered by changing nothing but where
      // four numbers are stored.
      //
      // Safe to precompute for ordinary fixtures because these four stay fixed after build time.
      // An in-place animation — a lift door or shop shutter — moves inside the bounding sphere it
      // was built with, which is what the loop was already culling against. A world-space mover is
      // different and marks itself `dynamic`; its packed centre is refreshed by the small table
      // below while its radius remains the conservative build-time bound.
      // The instance data proper (matrix, colour, alpha, glow) is NOT packed here: those do
      // change while the game runs, and they are only read for props that survive the cull.
      const dynamicCullBatches = [];
      for (const b of kept) {
        const n = b.props.length, c = new Float32Array(n * 4);
        let dynamicCulls = null;
        for (let i = 0; i < n; i++) {
          const p = b.props[i], o = i * 4;
          c[o] = p.cx; c[o + 1] = p.cy; c[o + 2] = p.cz; c[o + 3] = p.r;
          // Most props really are fixed after `finish`, but traffic and other world-space movers
          // update both their matrix and their derived centre every frame. Keep the tiny moving
          // subset alongside its packed slot so the draw loop can refresh exactly these values;
          // scanning or invalidating every static batch would give back the CPU time this packing
          // was introduced to save.
          if (p.dynamic) (dynamicCulls || (dynamicCulls = [])).push({ p, o });
        }
        b.cull = c;
        if (dynamicCulls) {
          b.dynamicCulls = dynamicCulls;
          b.dynamicCullEpoch = 0;
          dynamicCullBatches.push(b);
        }
      }
      // And the ones no batch took — glyphs and anything see-through. The draw loop used to find
      // them by walking all 31,955 props and skipping the 29,769 it had already drawn; this is
      // the same 2,186 props without the walk.
      const loose = props.filter(p => !p.batch);
      const lc = new Float32Array(loose.length * 4);
      for (let i = 0; i < loose.length; i++) {
        const p = loose[i], o = i * 4;
        lc[o] = p.cx; lc[o + 1] = p.cy; lc[o + 2] = p.cz; lc[o + 3] = p.r;
      }
      extra.loose = loose; extra.looseCull = lc;

      // Refresh packed cull centres before either the shadow or colour pass. A per-batch epoch lets
      // the renderer rebuild only the visibility list that can actually have changed; unrelated
      // static batches retain their camera-cell cache.
      function syncDynamicCulls() {
        for (const b of dynamicCullBatches) {
          const c = b.cull;
          let changed = false;
          for (const q of b.dynamicCulls) {
            const p = q.p, o = q.o;
            if (c[o] === p.cx && c[o + 1] === p.cy && c[o + 2] === p.cz) continue;
            c[o] = p.cx; c[o + 1] = p.cy; c[o + 2] = p.cz;
            changed = true;
          }
          if (changed) b.dynamicCullEpoch++;
        }
      }

      return {
        props, things, solids, shadows, glows, blockers, lights, zones, tagBox,
        syncDynamicCulls,
        // Finish any material that could not be uploaded when the room was built. Safe to call
        // as often as you like: it empties its own list, and a room with nothing pending does
        // no work at all.
        resolveMats() {
          if (!pendingMat.length || typeof Assets === 'undefined' ||
              typeof R === 'undefined' || !R.gl) return;
          for (let i = pendingMat.length - 1; i >= 0; i--) {
            const p = pendingMat[i];
            if (typeof p.mat !== 'string') { pendingMat.splice(i, 1); continue; }
            const name = p.mat, t = Assets.material(name);
            if (!t) continue;                       // still not ready; try again next arrival
            if (p.nrm === undefined) p.nrm = Assets.materialNormal(name);
            p.mat = t;
            // Batches may have been sealed while `mat` was still its string name. They remain the
            // right grouping; only the uniform values need replacing with the uploaded textures.
            if (p.batch) { p.batch.opt.mat=t; p.batch.opt.nrm=p.nrm; }
            pendingMat.splice(i, 1);
          }
        },
        indoor: true, cutaway: true, near: .05, far: 60, expose: 1,
        ...extra,
        // One build-time bit keeps the saved walls preference from forcing per-prop visibility
        // work in large outdoor scenes that have nothing it can lower. Derived after `extra` so a
        // caller cannot accidentally claim a value that disagrees with the sealed prop list.
        hasPartitions: props.some(p => p.partition === true),

        pick(origin, dir, skip) {
          let bestT = Infinity, best = null, bestProp = null;
          for (const p of props) {
            if (!p.ob || p.renderHidden || (skip && skip(p))) continue;
            const t = hitBox(origin, dir, p.ob);
            if (t === null || t >= bestT) continue;
            bestT = t; best = p.tag || null; bestProp = p;
          }
          if (!best) return null;
          // A word can be attached to more than one object in a room — two sets of 洗手间, a
          // charging bench each side of security, forty 座位 in a carriage. Taking the first
          // one out of the list sends the player to whichever happened to be built first, so
          // the hit point picks: of the things wearing this tag, the nearest to where the ray
          // actually landed.
          const hit = [origin[0] + dir[0] * bestT, origin[2] + dir[2] * bestT];
          let found = null, fd = Infinity;
          for (const th of things) {
            if (th.tag !== best) continue;
            // Stacked scenes reuse both labels and x/z coordinates. The ray has already selected
            // a visible prop on the current apartment deck; do not then resolve its shared tag to
            // a same-named thing ten floors above or below merely because that focus is a few
            // centimetres nearer in the ground plane.
            if (bestProp && bestProp.deck !== undefined && bestProp.deck >= 0 &&
                th.deck !== undefined && th.deck >= 0 && th.deck !== bestProp.deck) continue;
            const d = (th.focus[0] - hit[0]) ** 2 + (th.focus[1] - hit[1]) ** 2;
            if (d < fd) { fd = d; found = th; }
          }
          return found;
        },

        // Keep the body inside the union of walkable zones. Only zones the body already
        // occupies are candidates, so a diagonal step cannot cut the corner of a wall.
        clampMove(px, pz, x, z, r) {
          const here = zones.filter(q => px >= q.x0 && px <= q.x1 && pz >= q.z0 && pz <= q.z1);
          let bd = Infinity, bx = x, bz = z;
          for (const q of (here.length ? here : zones)) {
            const cx = clamp(x, q.x0 + r, q.x1 - r), cz = clamp(z, q.z0 + r, q.z1 - r);
            const d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
            if (d < bd) { bd = d; bx = cx; bz = cz; }
          }
          x = bx; z = bz;
          for (const s of solids) {
            if (s.open) continue;
            if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) {
              const dl = x - (s.x0 - r), dr = (s.x1 + r) - x;
              const db = z - (s.z0 - r), df = (s.z1 + r) - z;
              const mn = Math.min(dl, dr, db, df);
              if (mn === dl) x = s.x0 - r;
              else if (mn === dr) x = s.x1 + r;
              else if (mn === db) z = s.z0 - r;
              else z = s.z1 + r;
            }
          }
          return [x, z];
        },
      };
    }

    return { props, things, solids, shadows, glows, blockers, lights,
             transform, material, shape, box, cyl, ball, capsule, taper, model, wall, flat, glyphs,
             solid, blocker, shade, rug, glow, light, thing, finish,
             partition: partitionSplit };
  }

  // ---- doll's house: which scenes may drop their walls, and how far the eye may then go
  //
  // The setting is `SET.wallsOff`; the predicate that reads this table is `dollHouse()` in
  // js/game.js. A scene appears here only once somebody has reasoned about what is ABOVE the eye
  // when the pitch clamp is released, because that is the failure that was seen in production:
  // with the release gated on `place` alone, V in 一楼·大堂 craned the eye up into the underside
  // of the street slab and filled the frame with its top face, player included.
  //
  // Deck 2 of the tower is safe because an upper floor's slab carries a deck stamp and is culled
  // when drawDeck is 2. Deck 0 is not, because the shell's own envelope is `deck: undefined`, is
  // never culled, and is opaque from above. **A single-storey scene has the deck-0 problem and no
  // deck stamp to save it** — its roof or soffit is one uncullable slab over the whole plan. That
  // is the question to answer before adding a key here, and it is not answered by the room
  // looking right with the walls up.
  //
  // `levels` are the values of `scene.level()` that qualify; omit it for a scene with no levels.
  // `far` is the released wheel cap and is a FOOTPRINT number, not a constant: 10.5 m at the
  // indoor lens frames the flat's 12.00 x 8.20 m with margin and no more, past which the figure
  // stops being findable. A 46 m mall hall needs its own number. `pitch` is the released pitch
  // clamp in radians, against the walking camera's 1.05.
  //
  // Adding a key here enables the **camera** half only. The geometry half is already global:
  // `js/game.js`'s `if (SET.wallsOff && p.partition) return true;` is not gated on `place`, so
  // any building whose interior walls route through `partition()` above drops them the moment
  // the owner presses V, with its ordinary walking camera. That is deliberate — the walls are
  // the useful half and they are safe everywhere; craning the eye upward is the half that needs
  // a per-scene decision, because a floor roofed by one nocut, deck-undefined slab will simply
  // show you the top of it. The hotel and the office are in exactly that position today.
  const DOLLHOUSE = {
    home: { levels: [2], far: 10.5, pitch: 1.45 },
  };

  return { scene, partition: partitionSplit, PARTITION_STUB, DOLLHOUSE };
})();
