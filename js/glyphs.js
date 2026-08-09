// Real characters on the signs.
//
// Every board, banner and couplet in this game used to spell its text with coloured blocks —
// one square per character — because there was no way to draw a glyph. That is fine at forty
// metres and a lie at two: the whole point of the place is that it is covered in writing you
// are learning to read, and a shop called ■■ teaches nobody anything.
//
// There is no font file to ship. macOS already has the CJK faces, so the atlas is drawn at
// startup into an offscreen canvas — one cell per character — and handed to the renderer as a
// single texture. Ink colour comes from the prop, not the sheet, so the same atlas serves gold
// characters on red paper and black ones on a white shop board. The sheet carries two masks:
// crisp ink in red and a slightly wider edge in green. That gives bright writing a dark keyline
// without a second texture lookup, while dark print stays dark and clean on pale boards.
const Glyphs = (() => {
  const CELL = 72;                    // sampled pixels per character
  const GUTTER = 5;                   // black mip-safe border around every sampled cell
  const PITCH = CELL + GUTTER * 2;
  const COLS = 16;
  // A concourse name or destination board is authored at fourteen centimetres or larger. Shelf
  // tickets, prices, operating hours and other close reading stay below that. Keeping the rule
  // here gives every Build scene the same classification and still leaves an explicit escape
  // hatch (`glyphRole:'primary'` / `'micro'`) for an unusual sign. Only Han cells in a qualifying
  // sign carry the role bit; Latin subtitles and punctuation keep the ordinary atlas path.
  const PRIMARY_SIGN_MIN = 0.14;
  const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
  const order = [];                   // characters, in the order they were first asked for
  const slot = new Map();
  let canvas = null, built = false;
  let version = 0, uploadedVersion = -1, uploadQueued = false;

  // One [u, v, du, dv] per character, kept rather than rebuilt. `rect` is called once per glyph
  // per draw — around a thousand a frame out on the street, where nearly every unbatched prop is
  // a character on a shop board — and it used to allocate a fresh four-element array each time.
  // Cleared only when a new atlas row changes every vertical coordinate.
  const cache = new Map();
  // The stable form is the same atlas cell with a negative height. The shader takes abs(height)
  // for UVs and reads the sign as one role bit, so this costs no new texture, instance float,
  // material signature or draw call. Kept separately because base rect arrays are shared.
  const stableCache = new Map();

  function rows() { return Math.max(1, Math.ceil(order.length / COLS)); }

  // Lazy rooms normally upload synchronously from game.js as soon as their build completes. A
  // few animated street systems can register writing later than that, though, so keep one
  // microtask in reserve. The version guard makes this free when the scene already uploaded and
  // folds a whole burst of newly registered characters into one texture transfer when it did not.
  function scheduleUpload() {
    if (uploadedVersion < 0 || uploadQueued) return;
    uploadQueued = true;
    Promise.resolve().then(() => {
      uploadQueued = false;
      if (version === uploadedVersion) return;
      if (typeof R === 'object' && R && R.setAtlas) upload();
    });
  }

  // Registers characters and hands back nothing: callers ask for the text they intend to draw,
  // the sheet is laid out once at the end, and `rect` then resolves each one.
  function need(text) {
    const oldRows = rows();
    let changed = false;
    for (const ch of text) {
      if (ch === ' ' || slot.has(ch)) continue;
      slot.set(ch, order.length); order.push(ch); changed = true;
    }
    if (changed) {
      built = false;
      version++;
      if (rows() !== oldRows) { cache.clear(); stableCache.clear(); }
      scheduleUpload();
    }
    return text;
  }

  // Draw the sheet. Bold, because signage is, and because a thin stroke at a dozen pixels
  // disappears entirely once the character is a metre up a wall and lit from one side.
  function build() {
    if (built) return canvas;
    const h = rows() * PITCH;
    if (!canvas) canvas = document.createElement('canvas');
    canvas.width = COLS * PITCH; canvas.height = h;
    const c = canvas.getContext('2d');
    // Opaque black is intentional. Transparent RGB gets implementation-dependent colour when
    // browsers downsample it for mipmaps; black gutters give every cell a stable zero instead.
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    c.fillRect(0, 0, canvas.width, h);
    c.lineJoin = 'round';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    order.forEach((ch, i) => {
      const cx = (i % COLS) * PITCH + PITCH / 2;
      const cy = ((i / COLS) | 0) * PITCH + PITCH / 2;
      // Latin letters and digits are narrower than a 汉字 and want more of the cell.
      const wide = /[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(ch);
      c.font = `700 ${Math.round(CELL * (wide ? 0.80 : 0.72))}px ` +
        `"PingFang SC","Hiragino Sans GB","Heiti SC","Noto Sans CJK SC",sans-serif`;
      const y = cy + (wide ? CELL * 0.02 : 0);
      // Green is the wider edge mask. It reaches only a few pixels past the real ink but is enough
      // for the shader to key pale text against a pale sky, glass reflection or display bloom.
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#0f0';
      c.strokeStyle = '#0f0';
      c.lineWidth = wide ? 8.0 : 6.8;
      c.strokeText(ch, cx, y);
      c.fillText(ch, cx, y);
      // Add the real ink into red without erasing green. One filtered lookup then returns both
      // masks, and their difference is the edge ring.
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = '#f00';
      c.strokeStyle = '#f00';
      c.lineWidth = wide ? 3.4 : 2.8;
      c.strokeText(ch, cx, y);
      c.fillText(ch, cx, y);
    });
    c.globalCompositeOperation = 'source-over';
    built = true;
    return canvas;
  }

  // Named separately rather than only as an object-method shorthand: scheduleUpload runs outside
  // the returned object and needs the same function when an animated system adds text mid-frame.
  function upload() {
    if (version === uploadedVersion) return false;
    R.setAtlas(build());
    uploadedVersion = version;
    return true;
  }

  return {
    need,
    isHan(ch) { return HAN.test(ch); },
    role(text, size, opt = {}) {
      if (opt.glyphRole === 'primary' || opt.glyphRole === 'micro') return opt.glyphRole;
      return size >= PRIMARY_SIGN_MIN && [...text].some(ch => HAN.test(ch))
        ? 'primary' : 'micro';
    },
    // The cell for one character: [u, v, du, dv], ready for uTexRect. The array handed back is
    // shared and must not be written to.
    rect(ch, stable = false) {
      let r = cache.get(ch);
      if (r === undefined) {
        const i = slot.get(ch);
        if (i === undefined) { cache.set(ch, null); return null; }
        const w = COLS * PITCH, h = rows() * PITCH;
        r = [((i % COLS) * PITCH + GUTTER) / w,
          (((i / COLS) | 0) * PITCH + GUTTER) / h, CELL / w, CELL / h];
        cache.set(ch, r);
      }
      if (!stable || !r) return r;
      let s = stableCache.get(ch);
      if (s === undefined) {
        s = [r[0], r[1], r[2], -r[3]];
        stableCache.set(ch, s);
      }
      return s;
    },
    // Called after initial registration and after a lazy scene adds new writing. Repeated calls
    // at the same version are deliberately no-ops: game.js and late street systems can both be
    // conservative without causing the large sheet to cross the CPU/GPU boundary twice.
    upload,
    get count() { return order.length; },
    // Retained instance buffers cache atlas UVs. A lazy room can add a row and move every old
    // vertical coordinate, so consumers need the allocation generation without creating the
    // diagnostic `stats` object once per batch.
    get version() { return version; },
    get policy() { return { primaryMin: PRIMARY_SIGN_MIN, distance: [8, 15] }; },
    get stats() {
      return { count: order.length, rows: rows(), width: COLS * PITCH,
        height: rows() * PITCH, version, uploadedVersion };
    },
  };
})();
