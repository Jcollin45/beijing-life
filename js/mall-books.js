// 书店 · 墨香书店 · MOXIANG BOOKS — floor 2
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box, sized in shop-local axes
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.rail(a,b,len,colours[,tag,y])  a hanging clothes rail
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.table(a,b[,seats,r])           a table with chairs, collider included
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// Leave this as `null` and the shop keeps whatever js/mall.js already builds for it.

// One source of truth for the poster, the retained event dressing and the author's actual roster
// hours. Career numbers weekdays Monday=0, so Sunday is 6; using the same arithmetic here keeps
// this tenant truthful even in a narrow harness where Career is not loaded yet.
const BooksSigning = window.BooksSigning = {
  weekday: 6, start: 10.5 * 60, end: 12.5 * 60,
  day() {
    const g = window.__game;
    try { return g && g.state ? Math.max(1, g.state().day | 0) : 1; } catch (_) { return 1; }
  },
  weekdayOf(day) { return (((day | 0) - 1) % 7 + 7) % 7; },
  isDay(day) { return this.weekdayOf(day) === this.weekday; },
  active(day, minutes) {
    return this.isDay(day) && Number.isFinite(minutes) && minutes >= this.start && minutes < this.end;
  },
};
// MV-047 · the fit-out is presentation; the till in game.js remains the commerce authority.
// `mallBookOffer()` returns the exact `bookPromoOff()` result for the live basket.  The fallback
// exists only for isolated fit-out previews and is source-checked against that production copy,
// so even a preview never invents a price or a tenant.
const BooksPromotion = window.BooksPromotion = {
  fallback:Object.freeze({ id:'books-2-plus-1', tenant:'墨香书店', claim:'中文书买二送一',
    ready:'可用', applied:'已减', eligible:0, off:0, active:true,
    phase:'ready', signature:'0:0' }),
  current() {
    try {
      const g = window.__game;
      const offer = g && g.mallBookOffer ? g.mallBookOffer() : null;
      return offer && offer.id === 'books-2-plus-1' ? offer : this.fallback;
    } catch (_) { return this.fallback; }
  },
};
// `awake()` in game.js reads spot hours every time it evaluates a person. Getters make the author
// genuinely absent on the other six days without adding a tenant-specific branch to shared NPC
// code; on Sunday the poster's exact 10:30–12:30 window becomes live again.
const BOOKS_AUTHOR_SPOT = {
  // 24/24 is an empty ordinary window. 25/25 looks empty, but the shared scheduler interprets
  // every end greater than 24 as an overnight wrap and therefore made the author appear 00:00–
  // 01:00 on all six off-days.
  get h0() { return BooksSigning.isDay(BooksSigning.day()) ? BooksSigning.start / 60 : 24; },
  get h1() { return BooksSigning.isDay(BooksSigning.day()) ? BooksSigning.end / 60 : 24; },
  at:[-19.10, 10.50], face:Math.PI, act:'wait',
};
//
// ---------------------------------------------------------------------------------------------
// What a bookshop is, and what the inline fit was missing.
//
// Two things make a room full of books read as a bookshop rather than as a wall with coloured
// tiles on it: density and variety. The old fit had the density — spines edge to edge, which was
// right — but every book in the room was one of five saturated hues, one width, one depth and
// one of two heights, so a whole bay averaged out to a stripe of red-blue-green. Real spines are
// mostly muted; the bright ones are the exception that makes the muted ones read. And a real
// shelf is not only spines: there are covers turned face out, piles lying flat, and a gap where
// somebody lifted one down with the neighbour fallen into it.
//
// The other half of what was missing is everything that is not a book. A shop has fixtures — bays
// with uprights, a lit pelmet, section signs you navigate by, a table of new titles inside the
// door, a till with somewhere to put the bags, a chair, a stool for the top shelf, a trolley of
// returns. Those are what say "shop" rather than "archive", and they are most of this file.
MallFit['书店'] = A => {
  // ---------------------------------------------------------------- palette and surfaces
  const K = {
    trim:    C('#2f3236'),   // matte black trim, the shell's own line
    walnut:  C('#5c4635'),   // carcasses and uprights
    walnutD: C('#3f2f22'),   // shelf backs, which want to be darker than the books
    oak:     C('#8a6a4a'),   // shelf boards
    oakL:    C('#a5825d'),   // table and counter tops
    cream:   C('#efe7d4'),
    warm:    C('#ffeccd'),
    gold:    C('#f3d47b'),
    brass:   C('#bb9440'),
    steel:   C('#6e7981'),
    seat:    C('#33463c'),   // the fabric map brightens this by about a third
    rug:     C('#4c3a34'),
    floor:   C('#4e463d'),   // the tenant's own carpet, laid over the shell's slate blue
    leaf:    C('#3f6b4a'),
    card:    C('#a98a63'),
    paper:   C('#d9cfba'),
    counter: C('#4a4038'),
  };
  // The shell's own material settings, repeated rather than reached for, so this file stands on
  // its own. Every amount here is low: the wood map averages well above the 0.22 the shader
  // divides by, so a high amount does not add grain, it bleaches the colour it is put on.
  //
  // `nrmAmt` is the one number that is not the shell's. It defaults to 1, and at full strength
  // the relief map on a two-metre carcass resolves as a soft grey cloud rather than as grain —
  // the same artefact that reads as dirt on the hall's own walls. A third of it keeps the
  // texture and loses the cloud. It also splits these four off into batches of their own, which
  // costs four draw calls and is worth it at the several hundred props hanging on them.
  const TIMBER = { mode:6, mat:'wood',   matScale:.90, matAmt:.30, nrmAmt:.30 };
  const BOARD  = { mode:6, mat:'wood',   matScale:.55, matAmt:.24, nrmAmt:.30 };
  const METAL  = { mat:'steel',  matScale:.50, matAmt:.28, nrmAmt:.30 };
  const CLOTH  = { mode:7, mat:'fabric', matScale:.50, matAmt:.18, nrmAmt:.30 };

  // Spines, weighted the way a shelf actually is: mostly earths, inks and papers, with a handful
  // of saturated ones scattered through to carry the eye along the run.
  //
  // These are darker and greyer than they look written down, because everything they are put on
  // is lit from a metre away by six warm strips and then run through the woven shading mode. The
  // first pass at this room used the values a designer would pick off a screen and the shelves
  // came out as a toy shop: pure hues at full chroma, eight of them repeating, no two adjacent
  // books the same family. A shelf reads as books when most of it is one muted range.
  const SPINE = ['#7d3830','#96492f','#a35d36','#b28a3f','#6d7845','#365d48','#2b5f77','#33486e',
                 '#4e4069','#743e55','#948b7d','#bdb2a0','#cdc1a9','#31363c','#5f5549','#22394a',
                 '#652830','#436d60','#8a784e','#43505f','#7b6245','#c1b295','#535f68','#9c4229']
                .map(C);
  // Children's and periodicals. Brighter than the rest of the room, because they are — but only
  // half the entries are a hue at all: the paper tones between them are what keep a bay of picture
  // books from reading as a rack of plastic ring-binders, which is exactly what it did at eight
  // saturated colours evenly shuffled.
  const KIDS = ['#b8503d','#c07f39','#c0a747','#4d8351','#39718f','#6b5788','#b0687e',
                '#d8cdae','#c3bda6','#a99f8b','#e0d8c0']
               .map(C);
  const TEXT = ['#cdc1a9','#b8ab93','#33486e','#2b5f77','#535f68','#31363c','#7d3830','#948b7d']
               .map(C);
  const MAGS = ['#ad4231','#bd7b2c','#c6ac44','#2f7566','#33628c','#6b4f85','#ab5a72',
                '#d8cfb6','#bdb49c','#9f9784','#e2dac2']
               .map(C);
  // Spine text. Four values, mostly the paper the block is printed on and the foil a publisher
  // stamps a series in — never white, which at this exposure is the brightest thing in the room.
  const LABEL = [C('#d5c9ae'), C('#c2a355'), C('#b9ad96'), C('#2b2f34')];

  // One deterministic stream, so two renders of this shop are the same shop.
  let s = 20260803;
  const R  = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const RR = (lo, hi) => lo + (hi - lo) * R();
  const P  = arr => arr[(R() * arr.length) | 0];

  // ---------------------------------------------------------------- the goods
  // A spine standing on a shelf, ranked along b with its front edge on the plane `af`. `lean`
  // tilts it in the b/y plane, which on this wall is a rotation about world x — and the axis
  // matters. Rotated about z instead, a leaning book tips out of the shelf towards the aisle
  // rather than against its neighbour, and a whole bay looks like it is being blown over.
  function spine(af, b, y, w, h, d, c, lean, band) {
    // Pushed back a random centimetre or so. Every book placed with its front edge on exactly the
    // same plane gives a bay one hard vertical line of colour with a shadow behind it, and that
    // one plane is what read as printed wallpaper rather than as stock: nobody shelves books
    // flush, and the eye knows it. Applied to `af` before anything else uses it, so the title
    // block goes back with its own book.
    af -= RR(0, .024);
    A.put(af - d / 2, b, d, w, h, y + h / 2 + .003, c, { hard:true, mode:7, rx:lean });
    if (band) {
      // The title block rides on the front edge, so it has to be put where the rotation leaves
      // it: an offset dy above the centre lands at (dy·cos, dy·sin) in (y, b).
      //
      // Small, and at a different height on every book. The first version stamped a block a
      // sixth of the spine high at two-thirds its width at the same place on every second
      // volume, and a bay of that is not lettering, it is a row of identical stickers — the one
      // thing that gave the shelves away as tiling rather than stock.
      const dy = h * (.10 + .22 * R());
      A.put(af - .007, b + dy * Math.sin(lean), .014, w * .78, h * .075,
            y + h / 2 + dy * Math.cos(lean) + .003, band, { hard:true, mode:7, rx:lean });
    }
  }
  // A cover turned face out, leaning back on its heels. rz tips the top towards the wall; the
  // label has to be carried round the same rotation or it slides off the cover.
  //
  // Two marks on it rather than one. A single pale rectangle over half the jacket is a sheet of
  // paper standing on a shelf; a title band up near the head and a short rule under it, both
  // narrower than the cover, is a book — and it is the pair that does it, because it is the gap
  // between them the eye reads as typography.
  function faced(af, b, y, w, h, c, tilt) {
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const ca = af - .016 * ct, cy = y + h / 2 * ct + .004, da = .022;
    const mark = P(LABEL);
    A.put(ca, b, .032, w, h, cy, c, { hard:true, mode:7, rz:tilt });
    for (const [fy, fw, fh] of [[.26, .60, .085], [.05, .34, .038]]) {
      const dy = h * fy;
      A.put(ca + (da * ct - dy * st), b, .009, w * fw, h * fh, cy + (da * st + dy * ct),
            mark, { hard:true, mode:7, rz:tilt });
    }
  }
  // Books lying flat. One prop each and a little out of true, which is the whole point of a pile.
  // Returns its own height, so the next thing can be stood on top of it.
  function pile(a, b, y, n, dep, wid, cs) {
    for (let i = 0; i < n; i++)
      A.put(a + RR(-.010, .010), b + RR(-.010, .010), dep - i * .004, wid - i * .003, .028,
            y + .015 + i * .030, P(cs || SPINE), { hard:true, mode:7, ry:RR(-.07, .07) });
    return .015 + n * .030;
  }

  // ---------------------------------------------------------------- the floor
  // The shell hands this tenant `carpetB`, a slate blue, and it is the one colour a room made of
  // warm timber and paper cannot take: it turned every view of this shop cold from the ankles
  // down and put a cast on the underside of everything standing on it. So the tenant lays its
  // own — a dark warm neutral, which is what a bookshop floor is, and which lets the spines be
  // the only colour in the room.
  //
  // It stops short of the shell's threshold board, which is where a shop's own floor finish stops
  // in a real unit — the last 70 cm out to the concourse belongs to the building, and leaving it
  // makes the shop read as carpet laid inside a stone floor rather than as a rectangle of a
  // different colour. It sits 6 mm over the shell's own plane: enough that the two cannot
  // z-fight, far too little to be a step.
  A.put(2.13, 0, 3.86, 9.24, .012, .032, K.floor, { hard:true, gloss:.05, ...CLOTH });
  // A darker band along the leading edge: the strip a shop's own carpet takes the traffic on,
  // and the line that stops the floor reading as one flat field the whole depth of the room.
  A.put(3.96, 0, .12, 9.24, .012, .048, C('#3a342e'), { hard:true, gloss:.05, ...CLOTH });

  // ---------------------------------------------------------------- wall shelving
  // A run is a carcass with real uprights every 0.9 m, six boards, a dark back, a lit pelmet over
  // the top and a section sign on it. Depth runs outward here — the boards and the books sit at a
  // *larger* a than the back panel, or the bay hides its own contents.
  const RUN = { a0:.19, a1:.62, top:2.46, af:.585 };
  const LEVEL = [.16, .55, .94, 1.33, 1.72, 2.11];      // the top face of each board
  function shelfRun(b0, b1, bays) {
    const len = b1 - b0, bc = (b0 + b1) / 2, mid = (RUN.a0 + RUN.a1) / 2, dep = RUN.a1 - RUN.a0;
    // The back is deep enough to swallow the shell's own framed panels, which would otherwise
    // show through the gap behind the books at two points along each run.
    A.put(.30, bc, .22, len, RUN.top - .10, (RUN.top - .10) / 2 + .10, K.walnutD,
          { hard:true, gloss:.14, ...TIMBER });
    A.put(mid + .02, bc, dep - .06, len, .12, .06, K.trim, { hard:true, gloss:.26 });
    for (let i = 0; i <= bays; i++)
      A.put(mid, b0 + i * (len / bays), dep, .058, RUN.top - .10, (RUN.top - .10) / 2 + .10,
            K.walnut, { hard:true, gloss:.20, ...TIMBER });
    A.put(mid + .02, bc, dep + .05, len + .05, .09, RUN.top + .04, K.walnut,
          { hard:true, gloss:.22, ...TIMBER });                                       // cornice
    A.put(RUN.a1 - .01, bc, .04, len, .03, RUN.top - .03, K.trim, { hard:true, gloss:.2 });
    for (const y of LEVEL) {
      A.put(mid + .01, bc, dep - .04, len - .10, .038, y - .019, K.oak,
            { hard:true, gloss:.20, ...BOARD });
      // The strip under each board is what makes a bay look lit rather than lit-up: a thin warm
      // line at the front edge, six of them stacked, instead of one wash off the ceiling.
      A.put(RUN.a1 - .005, bc, .04, len - .16, .015, y - .050, K.warm,
            { hard:true, mode:1, glow:.19 });
    }
    A.stop(RUN.a0 - .06, RUN.a1 + .05, b0, b1);
  }
  // The pelmet over a run, and the section sign hung on its face.
  function pelmet(b0, b1) {
    const len = b1 - b0, bc = (b0 + b1) / 2;
    A.put(.46, bc, .46, len, .18, 2.71, K.walnut, { hard:true, gloss:.20, ...TIMBER });
    A.put(.60, bc, .18, len - .10, .022, 2.615, K.warm, { hard:true, mode:1, glow:.24 });
  }
  function sign(b, text) {
    A.put(.705, b, .022, 1.34, .19, 2.71, K.trim, { hard:true, gloss:.30 });
    A.glyph(.720, b, 2.71, text, { size:.145, gap:.055, color:K.gold, glow:.20 });
  }
  // Filling one bay of one shelf: runs of spines with piles, faced copies and the odd gap between
  // them, and the last book before a gap fallen into it.
  function fillShelf(b0, b1, y, clear, style) {
    const cs = style === 'kids' ? KIDS : style === 'text' ? TEXT : style === 'mag' ? MAGS : SPINE;
    const cap = clear - .05;
    let b = b0 + .045;
    const end = b1 - .045;
    while (b < end - .045) {
      const roll = R();
      if ((style === 'mag' || (style === 'kids' && y < 1.0)) && roll > .22) {
        // Magazines and picture books are mostly faced: the cover is the whole product. Not all
        // of them, though — a rack in which every single copy is turned out is a display stand,
        // and a shop shelves its back numbers spine-on like everything else. A quarter of the
        // run is left to the ordinary branch below, which breaks the wall of covers up.
        const w = Math.min(RR(.175, .215), end - b);
        if (w < .15) break;
        faced(RUN.af, b + w / 2, y, w - .015, Math.min(cap, RR(.225, .275)), P(cs), .12);
        b += w + .012;
      } else if (roll < .07) {
        b += RR(.05, .11);                                        // one has been lifted out
      } else if (roll < .15 && end - b > .24) {
        pile(RUN.af - .10, b + .11, y, 3 + (R() * 3 | 0), .19, .155, cs);
        b += .23;
      } else if (roll < .23 && end - b > .23) {
        faced(RUN.af, b + .11, y, .195, Math.min(cap, RR(.25, .30)), P(cs), .13);
        b += .22;
      } else {
        const n = 3 + (R() * 8 | 0);
        for (let i = 0; i < n && b < end - .03; i++) {
          const w = RR(.028, .058), h = Math.min(cap, RR(.20, .33)), d = RR(.13, .19);
          const last = i === n - 1 && R() < .34 && end - b > .12;
          spine(RUN.af, b + w / 2, y, w, h, d, P(cs), last ? RR(.13, .21) : 0,
                R() < .55 ? P(LABEL) : null);
          b += w + .004 + (last ? .055 : 0);
        }
        b += .01;
      }
    }
  }

  // ---------------------------------------------------------------- back wall
  // Two runs, with the middle 2.3 m left to the shell's own slatted feature panel so the gold
  // name on it still reads. Four sections, signed, so the room can be navigated like a shop.
  shelfRun(1.16, 4.84, 4);
  shelfRun(-4.84, -1.16, 4);
  pelmet(1.16, 4.84);
  pelmet(-4.84, -1.16);
  sign(2.08, '小说');
  sign(3.92, '教材');
  sign(-2.08, '童书');
  sign(-3.92, '杂志');
  for (let i = 0; i < LEVEL.length; i++) {
    const y = LEVEL[i], clear = (i === LEVEL.length - 1 ? RUN.top : LEVEL[i + 1]) - y - .038;
    for (let k = 0; k < 4; k++) {
      fillShelf(1.16 + k * .92 + .03, 1.16 + (k + 1) * .92 - .03, y, clear,
                k < 2 ? 'novel' : 'text');
      fillShelf(-4.84 + k * .92 + .03, -4.84 + (k + 1) * .92 - .03, y, clear,
                k < 2 ? 'mag' : 'kids');
    }
  }

  // ---------------------------------------------------------------- new titles, under the name
  // A stepped ramp of faced copies in front of the feature panel, kept low enough that the slats
  // and the shop's own name are still the first thing you see walking in.
  A.put(.94, 0, .58, 2.16, .58, .29, K.walnut, { hard:true, gloss:.20, ...TIMBER });
  A.put(.96, 0, .50, 2.02, .12, .06, K.trim, { hard:true, gloss:.26 });
  A.put(.94, 0, .64, 2.30, .05, .605, K.oakL, { hard:true, gloss:.26, ...BOARD });
  A.put(.70, 0, .06, 2.16, .30, .78, K.walnut, { hard:true, gloss:.18, ...TIMBER });    // riser
  for (let i = 0; i < 7; i++)
    faced(1.10, -.90 + i * .30, .63, RR(.20, .25), RR(.28, .34), P(SPINE), .17);
  pile(1.05, -1.02, .63, 4, .21, .17);
  pile(1.05, 1.02, .63, 5, .21, .17);
  A.put(1.20, .74, .02, .34, .20, .76, K.trim, { hard:true, gloss:.3 });                // card
  A.glyph(1.22, .74, .77, '新书', { size:.105, gap:.035, color:K.gold, glow:.16 });
  A.stop(.62, 1.28, -1.12, 1.12);

  // ---------------------------------------------------------------- gondola end displays
  // These used to be two free-standing plinths in the only pair of turns into the rear aisle.
  // Each occupied b .64 after collision and left less than a body between the centre display and
  // the gondola. Their stock now sits on the gondola tops; the six plinth/trim pieces disappear and
  // there is no second footprint or hidden carcass inside the shelving.
  const GONDOLA = { a:1.92, rear:1.59, front:2.25, inner:2.10 };
  for (const sgn of [-1, 1]) {
    const b = sgn * 2.18;
    const t1 = pile(GONDOLA.a - .08, b - .08, 1.18, 8, .23, .145);
    const t2 = pile(GONDOLA.a + .10, b + .08, 1.18, 5, .22, .140);
    faced(GONDOLA.a + .08, b - .08, 1.18 + t1, .16, .28, P(SPINE), .10);
    A.put(GONDOLA.a + .10, b + .08, .17, .110, .05, 1.18 + t2 + .03, P(SPINE),
          { hard:true, mode:7, ry:.5 });
  }

  // ---------------------------------------------------------------- mid-room gondolas
  // Low double-sided cases, so the shop has shelving you walk between and not only shelving you
  // stand in front of. Kept under chest height: any taller and they wall off the back of the room.
  //
  // The carcasses occupy a 1.59–2.25.  The back-wall stop ends at a .67, so the rear aisle is a
  // measured .92 m before body-radius expansion, over the .90 m circulation minimum.  Their inner
  // ends stop at b +/-2.10: the centre display ends at +/-1.12, leaving a .98 m nominal turn into
  // that aisle.  The left one still ends at b -3.30 to preserve 白婉's till pocket.
  const GY = [.16, .48, .80];
  for (const sgn of [-1, 1]) {
    const b0 = sgn > 0 ? GONDOLA.inner : -3.30;
    const b1 = sgn > 0 ? 3.95 : -GONDOLA.inner;
    const len = b1 - b0, bc = (b0 + b1) / 2, kind = sgn > 0 ? SPINE : KIDS;
    // A double-sided case is a *spine* with shelves off both faces, not a block. Built as a solid
    // 0.72-deep carcass — which is what this was — every book stood inside its own cabinet:
    // both faces were bare walnut with a lit strip under each shelf and nothing on it, in every
    // view of this room, and roughly four hundred props were being drawn where nobody could ever
    // see them. The panel is 10 cm through the middle; the goods live outside it.
    A.put(GONDOLA.a, bc, .10, len, 1.02, .61, K.walnutD, { hard:true, gloss:.16, ...TIMBER });
    A.put(GONDOLA.a, bc, .60, len - .10, .12, .06, K.trim, { hard:true, gloss:.26 });
    A.put(GONDOLA.a, bc, GONDOLA.front - GONDOLA.rear, len + .06, .06, 1.15, K.oakL,
          { hard:true, gloss:.26, ...BOARD });
    for (const bb of [b0, bc, b1])
      A.put(GONDOLA.a, bb, .62, .055, 1.00, .62, K.walnut,
            { hard:true, gloss:.22, ...TIMBER });
    for (const y of GY) {
      A.put(GONDOLA.a, bc, .62, len - .10, .036, y - .018, K.oak,
            { hard:true, gloss:.20, ...BOARD });
      for (const d of [1, -1])
        A.put(GONDOLA.a + d * .31, bc, .04, len - .14, .014, y - .046, K.warm,
              { hard:true, mode:1, glow:.15 });
    }
    // Both faces stocked. The one turned away from the door is what somebody standing in the back
    // aisle is looking at, and an empty back is what gives a pretend gondola away.
    for (const y of GY) for (const d of [1, -1]) {
      const af = GONDOLA.a + d * .30;
      let b = b0 + .07;
      while (b < b1 - .09) {
        const roll = R();
        if (roll < .06) { b += RR(.05, .10); continue; }
        if (roll < .17) {
          pile(af - d * .10, b + .11, y, 3 + (R() * 3 | 0), .19, .155, kind); b += .23; continue;
        }
        const n = 3 + (R() * 6 | 0);
        for (let i = 0; i < n && b < b1 - .05; i++) {
          const w = RR(.028, .056), h = Math.min(.27, RR(.19, .29)), dp = RR(.13, .18);
          if (d > 0) spine(af, b + w / 2, y, w, h, dp, P(kind),
                           i === n - 1 && R() < .3 ? .16 : 0, R() < .5 ? P(LABEL) : null);
          else A.put(af + dp / 2, b + w / 2, dp, w, h, y + h / 2 + .003, P(kind),
                     { hard:true, mode:7 });
          b += w + .004;
        }
        b += .01;
      }
    }
    // The top is a display surface, which is the reason a gondola is 1.15 tall and not 1.8.
    for (let i = 0; i < 4; i++) {
      const b = b0 + .34 + i * ((len - .68) / 3);
      if (i % 2) {
        pile(GONDOLA.a - .06, b, 1.18, 4 + (R() * 3 | 0), .22, .175);
        faced(GONDOLA.a + .06, b, 1.18, .19, .26, P(SPINE), .12);
      } else {
        for (let k = 0; k < 5; k++)
          spine(GONDOLA.a + .22, b - .10 + k * .05, 1.18, .046, RR(.21, .27), .17, P(SPINE), 0,
                R() < .5 ? P(LABEL) : null);
        A.put(GONDOLA.a + .06, b + .17, .17, .022, .16, 1.26, K.steel,
              { hard:true, gloss:.5, ...METAL });
      }
    }
    A.stop(GONDOLA.rear, GONDOLA.front, b0 - .04, b1 + .04);
  }

  // ---------------------------------------------------------------- new-titles table
  // The table a bookshop puts inside its own door: low, waxed, and covered in faced copies and
  // short piles rather than one book every half metre.
  A.put(2.55, 0, .90, 1.50, .12, .74, K.oakL, { hard:true, gloss:.30, ...BOARD });
  A.put(2.55, 0, .82, 1.38, .06, .66, K.trim, { hard:true, gloss:.24 });
  for (const da of [-.32, .32]) for (const db of [-.60, .60])
    A.put(2.55 + da, db, .075, .075, .64, .32, K.walnut, { hard:true, gloss:.22, ...TIMBER });
  A.put(2.55, 0, .70, 1.24, .04, .30, K.walnut, { hard:true, gloss:.20, ...TIMBER });
  for (let i = 0; i < 4; i++) {
    const b = -.52 + i * .35;
    pile(2.72, b, .80, 3 + (R() * 4 | 0), .23, .185);
    if (i % 2) faced(2.42, b, .80, .21, .29, P(SPINE), .13);
    else {
      const t = pile(2.40, b, .80, 2 + (R() * 3 | 0), .22, .175);
      faced(2.40, b, .80 + t, .18, .25, P(SPINE), .11);
    }
  }
  A.put(2.30, -.66, .02, .30, .17, .90, K.trim, { hard:true, gloss:.3 });
  A.glyph(2.32, -.66, .91, '推荐', { size:.095, gap:.03, color:K.gold, glow:.16 });
  A.stop(2.12, 2.98, -.74, .74);

  // ---------------------------------------------------------------- till and back of house
  // A.counter brings the till, the 收银台 tag, the card machine and the collider with it. Two
  // things then have to be done to it.
  //
  // Its body takes the shell's plaster finish, which multiplies whatever colour it is handed by
  // about 1.4 and puts a render texture over it, and its top is cream stone with the paving map
  // on it — together, from two metres, a dark walnut counter came out as a block of white
  // masonry. So it is clad: a timber front, two returns and a timber top, which is what a counter
  // in a shop fitted out in walnut is anyway.
  //
  // And the 1.30-high back fitting that used to stand 3 cm behind it is gone. Nobody could have
  // stood in a 3 cm gap, and there was no depth left to widen it into — this unit is 4.8 m from
  // the back wall to the glass and the plan had already spent all of it on shelving. Back of
  // house went to the side wall instead, where a metre and a half of it was doing nothing.
  // The original 1.94 m run covered the whole front face of the left gondola.  The cashier used
  // only its west half, so keep that end at b -4.37 and shorten the customer end to -3.05.  That
  // exposes .95 m of the gondola face without moving the staff pocket, interaction, or service
  // depth.  A compact 1.32 m bookshop till is still wider than the worker and terminal together.
  const TILL = { a:3.08, b:-3.71, wid:1.32, dep:.82 };
  A.counter(TILL.a, TILL.b, TILL.wid, TILL.dep, K.counter);
  A.put(3.50, TILL.b, .06, TILL.wid + .08, .76, .52, K.walnut,
        { hard:true, gloss:.22, ...TIMBER });
  for (const e of [-1, 1])
    A.put(TILL.a, TILL.b + e * (TILL.wid / 2 + .04), .84, .06, .76, .52, K.walnut,
          { hard:true, gloss:.22, ...TIMBER });
  A.put(TILL.a, TILL.b, .96, TILL.wid + .16, .046, 1.007, K.oakL,
        { hard:true, gloss:.30, ...BOARD });
  A.put(3.555, TILL.b, .03, TILL.wid + .08, .035, .27, K.brass,
        { hard:true, gloss:.55, ...METAL });
  // The shell hangs its own 收银台 label off the back of the counter facing the wall, where it
  // cannot be seen from inside the shop. This is the one the customer reads.
  A.glyph(3.545, TILL.b, .58, '收银', { size:.105, gap:.04, color:K.gold, glow:.14 });
  // The shell's till monitor puts its lit face at a *smaller* depth than the housing it belongs
  // to — inside it, in a frame where depth runs outward — so what stands on every counter in the
  // building is a matte black cube. This is the customer display on the outside of it, which is
  // what a till has facing this way anyway.
  const TILL_SCREEN_B = TILL.b + TILL.wid / 2 - .02;
  const customerDisplay=[
    A.put(3.117, TILL_SCREEN_B, .012, .34, .19, 1.125, C('#1d3549'),
          { hard:true, mode:1, glow:.13 }),
    A.put(3.123, TILL_SCREEN_B, .010, .22, .035, 1.155, K.gold,
          { hard:true, mode:1, glow:.09 }),
  ];
  // A compact printed promotion card at the free end of the till.  All twelve parts are retained:
  // the seven-character claim is made once from the production contract, while the existing
  // postcard callback swaps only two two-character status groups when the receipt discount turns
  // positive.  Its flush 18 mm face adds no obstruction and no powered display.
  const bookPromo = BooksPromotion.current(), bookPromoFx = [];
  A.put(3.574, -4.08, .018, .48, .34, 1.28, K.walnutD,
    {hard:true, mode:7, gloss:.18, tag:'书店优惠'});
  A.glyph(3.588, -4.08, 1.335, bookPromo.claim,
    {size:.036, gap:.008, color:K.gold, mode:0, glow:0, tag:'书店优惠'});
  const bookPromoReady = [].concat(A.glyph(3.588, -4.08, 1.225, bookPromo.ready,
    {size:.050, gap:.014, color:K.cream, mode:1, glow:0, tag:'书店优惠'}) || []);
  const bookPromoApplied = [].concat(A.glyph(3.588, -4.08, 1.225, bookPromo.applied,
    {size:.050, gap:.014, color:K.cream, mode:1, glow:0, alpha:.001, tag:'书店优惠'}) || []);
  A.dynamicVisual(bookPromoReady, bookPromoApplied);
  bookPromoFx.push({ready:bookPromoReady, applied:bookPromoApplied});
  if(A.powerDisplay)A.powerDisplay(customerDisplay,{id:'customer-display'});
  // Back of house: a low run against the side wall with the wrapped stock, the bags and the
  // shop's plant on it. Kept under 1.30 so it passes below the shell's lightbox on that wall.
  A.put(2.90, -4.76, 1.40, .32, 1.24, .62, K.walnut, { hard:true, gloss:.18, ...TIMBER });
  A.put(2.90, -4.74, 1.30, .28, .10, .06, K.trim, { hard:true, gloss:.26 });
  A.put(2.90, -4.74, 1.44, .36, .05, 1.265, K.oakL, { hard:true, gloss:.28, ...BOARD });
  for (const d of [-.35, .35]) {
    A.put(2.90 + d, -4.585, .64, .03, .98, .66, K.oak, { hard:true, gloss:.22, ...BOARD });
    A.put(2.90 + d, -4.565, .09, .018, .018, 1.02, K.brass, { hard:true, gloss:.6, ...METAL });
  }
  for (let i = 0; i < 3; i++) pile(2.42 + i * .40, -4.74, 1.29, 3 + (R() * 3 | 0), .21, .17);
  // Flat-packed carrier bags, and a roll of till paper standing on its end beside them.
  for (let i = 0; i < 5; i++)
    A.put(3.44, -4.80 + i * .045, .26, .038, .32, 1.45, i % 2 ? K.card : C('#8d7250'),
          { hard:true, mode:7, rx:.05 });
  A.cyl(3.50, -4.62, 1.33, .036, .075, K.cream, { gloss:.2 });
  A.cyl(2.24, -4.72, 1.37, .085, .16, C('#9a6f4e'), { gloss:.25 });
  for (let i = 0; i < 5; i++)
    A.ball(2.24 + RR(-.07, .07), -4.72 + RR(-.07, .07), 1.55 + RR(-.03, .06),
           .085, .075, .085, K.leaf, { mode:7, gloss:.14 });
  // A stool for whoever is on the till, pushed under the back run.
  A.cyl(2.44, -4.28, .43, .17, .05, K.oakL, { gloss:.28, ...BOARD });
  for (const d of [-1, 1]) for (const e of [-1, 1])
    A.cyl(2.44 + d * .10, -4.28 + e * .10, .21, .018, .42, K.steel, { gloss:.5, ...METAL });
  // The reading-club sign-up, on the inboard end of the counter top where the queue passes it.
  // 白婉 already offers the club in her second line; this is the thing she is pointing at, and it
  // is where the 星期六 label below hangs. A board, a clipped sheet and the times on it.
  const CLUB_B = TILL.b + TILL.wid / 2 - .18;
  A.put(3.03, CLUB_B, .05, .34, .26, 1.16, K.trim, { hard:true, gloss:.28 });
  A.put(3.058, CLUB_B, .010, .28, .21, 1.155, C('#f1e9d6'), { hard:true, mode:7, gloss:.06 });
  A.put(3.064, CLUB_B, .008, .09, .022, 1.245, K.brass, { hard:true, gloss:.55, ...METAL });
  A.glyph(3.070, CLUB_B, 1.196, '读书会', { size:.048, gap:.016, color:C('#3f5347'), glow:0 });
  A.glyph(3.070, CLUB_B, 1.118, '每周六 三点', { size:.032, gap:.011, color:K.trim, glow:0 });
  A.stop(2.18, 3.64, -4.94, -4.56);

  // ---------------------------------------------------------------- reading corner
  // One chair, a lamp and something to put a cup on. Somewhere to sit is the difference between a
  // shop that wants you to browse and a warehouse that wants you gone.
  A.put(3.00, 4.02, 1.74, 1.72, .014, .052, K.rug, { hard:true, ...CLOTH });
  A.put(3.00, 4.02, 1.52, 1.50, .010, .062, C('#5e463c'), { hard:true, ...CLOTH });  // rug border
  A.put(3.00, 4.16, .74, .72, .17, .40, K.seat, { round:.07, ...CLOTH });
  A.put(3.00, 4.50, .70, .13, .56, .70, K.seat, { round:.05, rx:.11, ...CLOTH });
  for (const d of [-1, 1])
    A.put(3.00 + d * .32, 4.20, .10, .64, .15, .57, K.seat, { round:.045, ...CLOTH });
  for (const d of [-1, 1]) for (const e of [-1, 1])
    A.cyl(3.00 + d * .29, 4.16 + e * .28, .16, .028, .32, K.walnut, { gloss:.3, ...TIMBER });
  // A loose seat cushion and one in the corner of it. Without them the chair is one green block
  // with two green blocks stuck on the sides — the silhouette of an armchair with none of the
  // seams that say it is upholstered rather than carved.
  A.put(3.00, 4.20, .66, .62, .10, .535, C('#3d5346'), { round:.05, ...CLOTH });
  A.put(2.84, 4.41, .28, .25, .11, .645, C('#8a6a44'), { round:.05, ...CLOTH });
  A.put(3.16, 4.06, .21, .16, .035, .603, P(SPINE), { hard:true, mode:7, ry:.4 });
  // The side table, moved from b 3.30 and shrunk from a 0.48 top to a 0.31 one. At its old size
  // and place it was standing *inside* the stationery island added below — the island runs
  // b 2.60–3.60 at a 2.87–3.43 and the table's top swept a 2.81–3.29, b 3.06–3.54, so a third of
  // it and the whole of the pile on it were buried in the island's carcass. b 3.74 is the 0.28 m
  // of floor between the island's end and the chair's near arm at b 3.88, and 0.155 is the widest
  // radius that fits in it. Found by measuring the two neighbours, not from any render: a prop
  // inside another prop is invisible in every shot of the room and still costs its draw.
  A.cyl(3.05, 3.74, .40, .155, .05, K.oakL, { gloss:.3, ...BOARD });
  A.cyl(3.05, 3.74, .21, .032, .38, K.walnut, { gloss:.3, ...TIMBER });
  A.cyl(3.05, 3.74, .015, .12, .03, K.walnut, { gloss:.3, ...TIMBER });
  pile(3.05, 3.74, .425, 3, .19, .155);
  A.cyl(2.62, 4.62, .70, .022, 1.40, K.steel, { gloss:.5, ...METAL });
  A.cyl(2.62, 4.62, .02, .16, .04, K.steel, { gloss:.5, ...METAL });
  A.taper(2.62, 4.62, 1.52, .30, .24, .30, K.cream, { mode:1, glow:.16 });
  A.stop(2.58, 3.42, 3.78, 4.62);

  // ---- the signing, which happens in this corner and nowhere else
  // The 签售会 poster on the back wall promises an author on Sunday morning. A shop that advertises
  // one and has no table for it is a shop with a lie printed on the wall, and the corner where a
  // signing actually happens is the corner with the chair in it.
  //
  // It is dressed rather than built as a second table, deliberately. Outside the real Sunday
  // window the chair, lamp and ordinary three-book pile above remain a quiet reading corner. At
  // 10:30, two signing copies, 林致远's tent card and one painted queue point appear; the author
  // himself is the fourth cue, driven by BOOKS_AUTHOR_SPOT below. The blank cover over the card is
  // a neutral face-out notebook on ordinary days and physically occludes the three static glyphs,
  // because A.glyph intentionally returns no references to animate.
  //
  // Eight retained props, two signatures: five dynamic hard mode-7 boxes and three static glyph
  // quads. No event furniture, collider, light or second callback is introduced.
  const signingFx = [], SIGNING_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);
  const signingBox = (a, b, dp, w, h, y, color, extra = {}) => {
    const p = A.put(a, b, dp, w, h, y, color,
      {hard:true, mode:7, gloss:.08, tag:'签售会', ...extra});
    A.dynamic(p, a, b, y, .42); signingFx.push(p); return p;
  };
  const signingBooks = [
    signingBox(3.05, 3.73, .190, .150, .024, .532, C('#7d4a3c'), {ry:.035}),
    signingBox(3.05, 3.75, .184, .146, .024, .560, C('#3f5d68'), {ry:-.030}),
  ];
  const nameCard = signingBox(3.150, 3.70, .018, .240, .130, .520, K.paper);
  A.glyph(3.165, 3.70, .520, '林致远',
    {size:.036, gap:.014, color:K.trim, mode:1, glow:0, tag:'签售会'});
  const cardCover = signingBox(3.175, 3.70, .010, .240, .130, .520, K.walnutD);
  const queuePoint = signingBox(3.82, 3.50, .38, .26, .008, .048, K.gold, {gloss:.10});
  nameCard.mallBooksNameCard = '林致远';
  cardCover.mallBooksOrdinaryCover = 1;
  signingBooks.forEach((p, i) => { p.mallBooksSigningBook = i + 1; });
  queuePoint.mallBooksQueuePoint = 1;
  const signingRest = signingFx.map(p => p.m), coverIx = signingFx.indexOf(cardCover);
  signingFx.forEach(p => { p.m = SIGNING_GONE; });
  cardCover.m = signingRest[coverIx];

  // ---------------------------------------------------------------- floor pieces
  // The props that say somebody works here: a stool for the top shelf, and a trolley of returns
  // waiting to go back on it with the carton they came out of still open on the floor.
  A.put(1.30, .62, .40, .44, .05, .43, K.oakL, { hard:true, gloss:.26, ...BOARD });
  A.put(1.38, .62, .24, .44, .05, .22, K.oakL, { hard:true, gloss:.26, ...BOARD });
  for (const d of [-1, 1]) for (const e of [-1, 1])
    A.cyl(1.30 + d * .14, .62 + e * .17, .21, .022, .42, K.steel, { gloss:.5, ...METAL });
  A.put(1.24, -.78, .44, .62, .04, .78, K.oakL, { hard:true, gloss:.26, ...BOARD });
  A.put(1.24, -.78, .44, .62, .04, .40, K.oakL, { hard:true, gloss:.26, ...BOARD });
  for (const d of [-1, 1]) for (const e of [-1, 1]) {
    A.cyl(1.24 + d * .19, -.78 + e * .27, .42, .020, .74, K.steel, { gloss:.55, ...METAL });
    A.cyl(1.24 + d * .19, -.78 + e * .27, .045, .045, .07, K.trim, { gloss:.4 });
  }
  for (let i = 0; i < 7; i++)
    spine(1.42, -1.03 + i * .062, .80, .050, RR(.20, .27), .19, P(SPINE),
          i === 6 ? .19 : 0, P(LABEL));
  pile(1.20, -.60, .80, 4, .22, .175);
  pile(1.20, -.90, .42, 5, .22, .175);
  A.put(1.16, -1.46, .40, .40, .30, .15, K.card, { hard:true, mode:7, gloss:.10 });
  for (const d of [-1, 1])
    A.put(1.16 + d * .22, -1.46, .04, .40, .28, .40, C('#b8996f'),
          { hard:true, mode:7, rz:d * .55 });
  pile(1.16, -1.46, .30, 3, .22, .18);

  // ---------------------------------------------------------------- the two side walls
  // The shell hangs a lightbox on each partition — a 1.34 by 1.30 sheet of the tenant's accent
  // colour behind a black frame, at 1.40 to 2.70. In a shop whose accent is blue that is a
  // switched-off television on each side wall, and it is the largest object in three of the four
  // views into this unit. A tenant is expected to cover it with something of its own.
  //
  // A hanging scroll, which is what is on the wall of a bookshop and cannot be anything else:
  // roller at the head and the foot, a silk mount two shades darker than the paper, an ink mass
  // low and left, and the seal. No characters on it — a glyph in this frame can only face along
  // the depth axis, so nothing written can be hung on a wall that runs the same way.
  for (const s of [-1, 1]) {
    const wb = q => s * q;                                     // toward the room is *smaller* |b|
    A.put(2.30, wb(4.783), 1.30, .016, 1.30, 2.05, C('#3b2f26'),
          { hard:true, gloss:.20, ...TIMBER });
    A.put(2.30, wb(4.767), 1.14, .016, 1.20, 2.05, C('#6d5a44'),
          { hard:true, gloss:.14, ...CLOTH });
    A.put(2.30, wb(4.752), .94, .016, .96, 2.03, K.paper, { hard:true, gloss:.10, ...CLOTH });
    // The rollers lie along the wall, so they turn about world z — which on this side of the
    // building is the depth axis. `rx` would lay them along the wall's own thickness and leave
    // two 3 cm studs sticking out of the plaster.
    for (const ry of [2.685, 1.415])
      A.cyl(2.30, wb(4.767), ry, .026, 1.34, C('#2e251d'),
            { rz:Math.PI / 2, gloss:.30, ...TIMBER });
    // The painting: a low ink shore with a range standing off it, and the seal below the corner
    // of it. Nothing here overlaps anything else — the whole composition shares one plane 5 mm
    // into the paper, and two coplanar faces that cover each other is the one arrangement this
    // renderer cannot resolve. Laid out as bands that touch nowhere, it never has to.
    A.put(2.28, wb(4.744), .78, .010, .055, 1.775, C('#4c5450'), { hard:true, mode:7 });
    for (const [pa, pw, ph, pc] of [[1.99, .22, .30, '#828d86'], [2.19, .16, .20, '#9aa19a'],
                                    [2.40, .22, .42, '#6f7a75'], [2.61, .16, .26, '#969d96']])
      A.put(pa, wb(4.744), pw, .010, ph, 1.805 + ph / 2, C(pc), { hard:true, mode:7 });
    A.put(1.905, wb(4.744), .07, .010, .07, 1.655, C('#8f3b32'), { hard:true, mode:7 });
    // A picture light over it: bracket off the wall, a brass tube, and the lamp under the tube.
    // What makes a scroll on a white wall read as hung rather than printed on it — and the lamp
    // has to be small and dim, because a glow in this renderer is a sprite and a 13 cm one at
    // .20 hanging clear of its own fitting is a yellow sticky note stuck over the frame.
    A.put(2.30, wb(4.828), .05, .18, .032, 2.80, K.brass, { hard:true, gloss:.45, ...METAL });
    A.cyl(2.30, wb(4.736), 2.802, .032, .34, K.brass, { rz:Math.PI / 2, gloss:.45, ...METAL });
    A.put(2.30, wb(4.736), .30, .046, .012, 2.766, K.warm, { hard:true, mode:1, glow:.12 });
  }
  // Forward of the scrolls, where each side wall runs three and a half metres to the glass with
  // nothing on it at all: a pair of small framed prints, hung at the shell's own lightbox height
  // so the two walls read as one hang rather than as two unrelated decisions.
  for (const s of [-1, 1]) for (const [fa, fh, fy] of [[3.62, .52, 2.26], [3.62, .38, 1.62]]) {
    A.put(fa, s * 4.783, fh + .10, .016, fh + .10, fy, C('#3b2f26'),
          { hard:true, gloss:.20, ...TIMBER });
    A.put(fa, s * 4.762, fh, .016, fh, fy, K.paper, { hard:true, gloss:.10, ...CLOTH });
    A.put(fa, s * 4.750, fh * .62, .010, fh * .30, fy + fh * .10, C('#7c8580'),
          { hard:true, mode:7 });
    A.put(fa - fh * .18, s * 4.750, fh * .22, .010, fh * .16, fy - fh * .22, C('#8a7a5e'),
          { hard:true, mode:7 });
  }

  // ---------------------------------------------------------------- the ladder
  // Leaning on the 小说 bay, which is the one prop that says "these shelves go up to two and a
  // half metres and somebody gets things down off them". Tipped about the b axis, so it leans
  // *into* the shelving rather than out across the aisle: `rz` here rotates in the depth/height
  // plane, and a stile 2.35 long tipped 0.19 rad puts its head on the bay's front edge at 2.30
  // and its feet 22 cm out into the aisle.
  {
    const LB = 2.45, LEAN = .19, sl = Math.sin(LEAN), cl = Math.cos(LEAN);
    for (const e of [-1, 1])
      A.put(.87, LB + e * .19, .055, .05, 2.35, 1.15, K.walnut,
            { hard:true, gloss:.24, rz:LEAN, ...TIMBER });
    for (const u of [-.95, -.50, -.05, .40, .85])
      A.put(.87 - u * sl, LB, .045, .40, .035, 1.15 + u * cl, K.oak,
            { hard:true, gloss:.22, rz:LEAN, ...BOARD });
    A.put(.87 - 1.13 * sl, LB, .09, .44, .028, 1.15 + 1.13 * cl, K.brass,
          { hard:true, gloss:.5, rz:LEAN, ...METAL });
    // Deliberately no collider. The rebuilt rear aisle is .92 m nominal, but a stop inflated by
    // the 0.30 m player radius around these projecting feet would still cut it in two. A prop you
    // can brush through is a smaller price than walling off the 小说 and 教材 bays again.
  }

  // ---------------------------------------------------------------- the front of the shop
  // The former magazine rack and bargain bin were two more full-depth stops between the door and
  // the gondola faces.  Magazines already fill the signed back-wall bays, so duplicating their
  // carcass here spent both props and the route.  Today's papers stay as the dated, face-out cue,
  // folded over the accessible inner end of the left gondola.  The loose bargain stock is already
  // represented by piles on both gondola tops and needs no third crate on the floor.
  const PAPER_B = -2.36;
  for (let i = 0; i < 3; i++)
    A.put(GONDOLA.front + .015, PAPER_B + i * .012, .26, .24, .012, 1.202 + i * .014,
          C('#cfc7b4'),
          { hard:true, mode:7, gloss:.06, ry:.05 * (i - 1) });
  A.put(GONDOLA.front + .025, PAPER_B, .022, .18, .028, 1.252, K.trim,
        { hard:true, gloss:.24 });
  A.glyph(GONDOLA.front + .038, PAPER_B, 1.252, '今日报纸',
          { size:.036, gap:.012, color:K.gold, glow:.14 });

  // A stack of baskets beside it, which is the first thing in a shop and the last thing anybody
  // models. Nested, so it is six rims round one body rather than six boxes.
  A.put(3.48, -2.66, .30, .23, .44, .28, C('#6d5942'), { hard:true, mode:7, gloss:.12 });
  for (let i = 0; i < 6; i++)
    A.put(3.48, -2.66, .34, .27, .022, .075 + i * .074, i % 2 ? K.card : C('#8d7250'),
          { hard:true, mode:7 });

  // Window merchandising is registered below through `书店:win`, allowing shop() to skip the
  // generic plinths and cartons instead of making this fit-out build over them.

  // ---------------------------------------------------------------- shelf-edge directory
  // A section sign over a bay says which department you are in front of. It does not say what is
  // on which board, and that is the whole of how a bookshop is actually searched: you read the
  // sign from across the room, then you read the shelf-edge tickets from a metre away. Three per
  // bay at the three heights a standing adult reads first, twenty-four across the room, and every
  // one of them two characters a learner can carry out of the shop.
  //
  // The ticket stands at a .625 — 4 cm proud of the books' own front plane at .585 and 1 cm proud
  // of the board's front lip, so it fights neither — and hangs 8.6 cm below the board it belongs
  // to, which is the fascia of the shelf under it and where a ticket rail really is.
  const shelfTicket = (b, y, text) => {
    A.put(.625, b, .020, .215, .046, y - .086, K.trim, { hard:true, gloss:.32 });
    A.glyph(.636, b, y - .086, text, { size:.046, gap:.016, color:K.gold, glow:.16 });
  };
  // Bay by bay, in the order the runs were filled above: two novel bays, two textbook bays on the
  // right; two magazine bays, two children's bays on the left. The subdivisions are what the
  // section signs promise and the shelves never delivered.
  for (const [b0, b1, names] of [
    [ 1.16,  2.08, ['名著', '散文', '诗歌']],
    [ 2.08,  3.00, ['悬疑', '科幻', '武侠']],
    [ 3.00,  3.92, ['汉语', '词典', '课本']],
    [ 3.92,  4.84, ['练习', '考试', '留学']],
    [-4.84, -3.92, ['时尚', '旅行', '汽车']],
    [-3.92, -3.00, ['美食', '摄影', '家居']],
    [-3.00, -2.08, ['绘本', '童话', '拼音']],
    [-2.08, -1.16, ['科普', '漫画', '儿歌']]])
    names.forEach((t, i) => shelfTicket((b0 + b1) / 2, LEVEL[i + 1], t));

  // ---------------------------------------------------------------- the directory boards
  // Two boards hung over the aisles facing the door, so a shopper can find a section from the
  // threshold rather than by walking the room twice. They are hung rather than fixed to a side
  // wall because a glyph in this frame can only face along the depth axis: anything lettered has
  // to look out towards the concourse or in towards the back wall, and a sign on a wall that runs
  // the same way as the text is a sign nobody can read.
  //
  // Bottom edge at 2.45, which clears the tallest thing under either of them — the ladder's head
  // rail at 2.33 — and top at 2.91, under the shell's own valance at 3.44.
  const dirBoard = (b, top, where) => {
    for (const e of [-1, 1])
      A.cyl(2.62, b + e * .56, 3.17, .010, .52, K.steel, { gloss:.55, ...METAL });
    A.put(2.62, b, .05, 1.30, .46, 2.68, K.trim, { hard:true, gloss:.30 });
    A.put(2.648, b, .012, 1.22, .40, 2.68, C('#1e252a'), { hard:true, mode:7, gloss:.14 });
    A.glyph(2.660, b, 2.775, top,   { size:.108, gap:.038, color:K.gold,  glow:.20 });
    A.glyph(2.660, b, 2.598, where, { size:.086, gap:.032, color:K.cream, glow:.13 });
  };
  dirBoard( 2.55, '小说 教材', '在 右 边');
  dirBoard(-2.55, '童书 杂志', '在 左 边');

  // ---------------------------------------------------------------- what the shop has on
  // Two event posters on the strip of back wall above the pelmets — the one band of this room
  // that was bare plaster from 2.80 to the valance, and the only place in a shop this full where
  // a poster can be a poster rather than another thing standing on a shelf.
  //
  // A bookshop here runs two things and prints both: a weekly 读书会, and a 签售会 when it can get
  // an author. Printed, not lit: the paper is an ordinary surface and only the rules on it emit,
  // because a 0.8 m² emissive field hung on a back wall is a lamp, not a poster.
  const poster = (b, tint, line1, line2, line3) => {
    A.put(.44, b, .04, 1.28, .70, 3.08, K.trim, { hard:true, gloss:.24 });
    A.put(.472, b, .012, 1.20, .62, 3.08, tint, { hard:true, mode:7, gloss:.10 });
    for (const oy of [-.255, .255])
      A.put(.482, b, .010, 1.06, .010, 3.08 + oy, K.gold, { hard:true, mode:1, glow:.16 });
    A.glyph(.490, b, 3.235, line1, { size:.125, gap:.042, color:K.gold,  glow:.15 });
    A.glyph(.490, b, 3.075, line2, { size:.082, gap:.028, color:K.cream, glow:.10 });
    A.glyph(.490, b, 2.945, line3, { size:.070, gap:.024, color:K.cream, glow:.08 });
  };
  poster( 2.30, C('#3d3227'), '读书会', '每周六 下午三点', '本店二楼 免费参加');
  poster(-2.30, C('#3b2a2a'), '签售会', '本周日 十点半', '作者 林致远 · 新书签名');

  // ---------------------------------------------------------------- 店员推荐, and something to read
  // The single most useful thing a bookshop can put in a language game is a page of Chinese you
  // can stand in front of and read, and the fixture that carries it in a real shop is the
  // handwritten card the staff prop against a recommended title. Three of them stand along the
  // front edge of the new-titles table, written vertically the way a shop card is, each one an
  // excerpt short enough to be read at a glance and pitched a level apart: the first is bare
  // subject-verb, the second adds a time word and a place, the third a clause.
  //
  // They stand at a 2.88 on a top whose surface is .80, and they lean back 0.12 rad so the card
  // faces up towards somebody standing at the table rather than straight out at their knees.
  // The cards keep their titles and nothing else. An earlier pass of this had a second column of
  // running text on each of the three, which is 28 more glyph quads in the heaviest room in the
  // game for prose you would have to put your face in the table to read at 3 cm. The excerpts
  // belong in one place large enough to be read — the 试读板 below — and in full in the word
  // cards, which are HTML and cost nothing to draw. This is the fixture, not the text.
  const pickCard = (b, tint, title, h) => {
    A.put(2.86, b, .052, .17, .012, .806, K.brass, { hard:true, gloss:.5, ...METAL });
    A.put(2.885, b, .010, .185, h, .81 + h / 2, tint, { hard:true, mode:7, gloss:.10, rz:.12 });
    A.glyph(2.898, b, .81 + h / 2, title,
            { size:.040, gap:.014, color:K.trim, glow:0, vertical:true });
  };
  pickCard(-.54, K.paper,      '风又起了',   .30);
  pickCard( .00, C('#e6dcc4'), '他等到天亮', .34);
  pickCard( .54, K.paper,      '她把信收好', .34);

  // ---- 试读板, the page you can stand and read -----------------------------------------------
  // The one thing this room did not have and the most useful thing a bookshop can hold in a
  // language game: a piece of Chinese long enough to be prose, hung where somebody can stand still
  // in front of it. Four short lines, set vertically and running right to left the way a printed
  // page does, on a board standing on the back edge of the new-titles table facing the door.
  //
  // It stands on the table and not on a wall for a measured reason. `A.th` walks the player to
  // 1.15 m out in +a, and the only floor in this shop a body can reach in front of this table is
  // the door aisle — a 3.35 to 4.15 between b −0.95 and +1.15, flood-filled with the room's own
  // Mall.clampUpper at the walking radius of 0.30. A page hung on the back wall at a 0.44 is a
  // page nobody can ever walk up to. On the table it is 1.1 m from the reader, which is reading
  // distance. Top at 1.62, which clears nothing above it until the directory board at 2.45.
  // Centred on b −0.05 and 1.10 wide, not b +0.10 and 1.22. Two small signs already stand on this
  // table 6 cm in front of the board — 推荐 at b −0.66 and 店员推荐 at b +0.62, both 0.34 across —
  // and at the first size the right-hand one covered the first column of the excerpt. The columns
  // now sit between b −0.478 and +0.328, which clears both by 2 cm at the narrowest.
  A.put(2.20, -.05, .05, 1.10, .78, 1.19, K.trim, { hard:true, gloss:.26 });
  A.put(2.228, -.05, .012, 1.02, .70, 1.19, C('#efe7d4'), { hard:true, mode:7, gloss:.06 });
  A.put(2.236, -.05, .008, 1.02, .012, 1.400, K.brass, { hard:true, mode:1, glow:.14 });
  A.glyph(2.242, -.28, 1.480, '本周试读', { size:.068, gap:.023, color:K.trim, glow:0 });
  [['天黑了', .30], ['风又起了', .05], ['他还在走', -.20], ['路上没有人', -.45]]
    .forEach(([line, bb]) =>
      A.glyph(2.242, bb, 1.150, line,
              { size:.056, gap:.019, color:C('#3a332c'), glow:0, vertical:true }));

  // ---- and the one fixture in this shop that reads the player --------------------------------
  // A staff recommendation is only a recommendation if it is pitched at somebody. `Vocab.count()`
  // is how many headwords the player has met at all, so the ribbon goes on the card at their
  // level instead of always on the same one: under forty words the bare subject-verb card, under
  // a hundred and twenty the middle one, past that the two-clause one. Read once at build time —
  // this fit runs every time the player walks into the mall, so it is current without any tick —
  // and a scene built before the dictionary exists falls back to the middle card rather than
  // throwing, which is the same guard js/mall-books.js needs anywhere else it reaches out of file.
  const knownWords = (typeof Vocab !== 'undefined' && Vocab.count) ? Vocab.count() : 60;
  const pickB = knownWords < 40 ? -.54 : knownWords < 120 ? .00 : .54;
  // At a 2.78, behind the cards rather than through them: the card's own brass holder occupies
  // a 2.834–2.886, so the first placement at 2.84 stood the ribbon inside it.
  A.cyl(2.78, pickB, 1.06, .007, .46, K.brass, { gloss:.5, ...METAL });
  A.put(2.78, pickB, .05, .30, .052, 1.31, K.trim, { hard:true, gloss:.3 });
  A.put(2.808, pickB, .010, .26, .040, 1.31, K.gold, { hard:true, mode:1, glow:.20 });
  A.glyph(2.816, pickB, 1.312, '为你推荐', { size:.030, gap:.010, color:K.trim, glow:0 });
  A.put(2.30, .62, .02, .34, .17, .90, K.trim, { hard:true, gloss:.3 });
  A.glyph(2.32, .62, .91, '店员推荐', { size:.078, gap:.026, color:K.gold, glow:.16 });

  // ---------------------------------------------------------------- 文具 · 明信片 · 工具书
  // The half of a bookshop that is not books, and which this room did not sell at all: stationery,
  // postcards, dictionaries and the exam and language material students come in for. It stands in
  // the one metre of front-of-house this plan had spare — between the gondola and the reading
  // chair — as a low island the front lane passes in front of.
  //
  // Its front face is at a 3.43, which leaves 3.73–4.15 of walking lane, and its back at 2.87,
  // which leaves 0.62 m to the gondola. That is not claimed as a through aisle: both gondola faces
  // are entered at their 0.98 m inner turn. The 1.02 m front lane is the circulation constraint.
  const ST = { a:3.15, b:3.10, dep:.56, wid:1.00, top:.86 };
  A.put(ST.a, ST.b, ST.dep, ST.wid, .80, .40, K.walnut, { hard:true, gloss:.20, ...TIMBER });
  A.put(ST.a, ST.b, ST.dep - .10, ST.wid - .12, .12, .06, K.trim, { hard:true, gloss:.26 });
  A.put(ST.a, ST.b, ST.dep + .06, ST.wid + .06, .05, ST.top - .025, K.oakL,
        { hard:true, gloss:.30, ...BOARD });
  A.put(ST.a + ST.dep / 2 + .012, ST.b, .02, ST.wid - .16, .052, .62, K.trim,
        { hard:true, gloss:.30 });
  A.glyph(ST.a + ST.dep / 2 + .020, ST.b, .62, '文具 · 明信片',
          { size:.048, gap:.017, color:K.gold, glow:.16 });
  // On the top, west end: the reference shelf. Thick blocks lying flat with a slip of paper in
  // one of them, because that is what a dictionary looks like and a thin one does not.
  for (let i = 0; i < 4; i++)
    A.put(ST.a - .10, 2.78, .195, .145, .062, ST.top + .031 + i * .064,
          [C('#2c3f55'), C('#5c3630'), C('#3c4a3a'), C('#4a4058')][i],
          { hard:true, mode:7, gloss:.14, ry:RR(-.05, .05) });
  A.put(ST.a - .08, 2.78, .05, .10, .006, ST.top + .285, K.cream, { hard:true, mode:7 });
  A.put(ST.a + .16, 2.78, .012, .13, .085, ST.top + .095, K.trim, { hard:true, gloss:.28 });
  A.glyph(ST.a + .172, 2.78, ST.top + .095, '词典', { size:.052, gap:.018, color:K.gold, glow:.16 });
  // Pens and brushes standing in three pots, and notebooks stacked flat beside them. A pen pot is
  // the one object that reads as a stationery counter from four metres and costs four cylinders.
  for (let k = 0; k < 3; k++) {
    const pb = 3.30 + k * .16;
    A.cyl(ST.a - .14, pb, ST.top + .055, .038, .11, [K.steel, K.brass, K.walnut][k],
          { gloss:.45, ...METAL });
    for (let i = 0; i < 5; i++)
      A.cap(ST.a - .14 + Math.sin(i * 1.7) * .014, pb + Math.cos(i * 1.7) * .014,
            ST.top + .145, .005, .15, .005, [C('#2b3138'), C('#8d3a32'), K.gold, C('#2f5063'),
            C('#4a5b3c')][i], { rz:.09 * (i - 2), gloss:.35 });
  }
  for (let i = 0; i < 4; i++)
    A.put(ST.a + .13, 3.46, .17, .125, .020, ST.top + .012 + i * .022,
          [C('#c9b48c'), C('#7f8a6d'), C('#a8654f'), C('#5f6f80')][i],
          { hard:true, mode:7, gloss:.10, ry:RR(-.06, .06) });
  A.stop(ST.a - ST.dep / 2, ST.a + ST.dep / 2, ST.b - ST.wid / 2, ST.b + ST.wid / 2);

  // ---- the postcard spinner, and the one thing in this shop that moves.
  // A 转架 turns. That is the whole appeal of it in a real shop and the reason a child stands in
  // front of one for two minutes: it is the only fixture in a bookshop you are allowed to touch.
  // Four wings off a central post, three cards to a wing, drifting round at about eleven seconds
  // a turn — slow enough to read the fronts, fast enough to be obviously alive.
  //
  // Built once at a 0.0 rad and then driven entirely from the callback: each part remembers only
  // how far out along its own wing it sits, so the whole rig is one angle and sixteen matrices.
  // R is 0.24 and not a centimetre more: the wings sweep a circle of that radius about a 3.15,
  // and the island's own collider stops at a 3.43. A rack that reached past it would be a solid
  // object turning through the walking lane at chest height with nothing to stop a body entering
  // it, which is worse than a rack that is slightly small.
  const SPIN = { a:ST.a, b:ST.b - .02, y:ST.top, R:.24, H:.30 };
  const spinW = A.at(SPIN.a, SPIN.b);
  const spinParts = [];
  const spinPart = (u, y, len, thick, h, cc, o = {}) => {
    const p = A.put(SPIN.a + u, SPIN.b, len, thick, h, y, cc, { hard:true, ...o });
    A.dynamic(p, SPIN.a, SPIN.b, SPIN.y + .30, SPIN.R + .20);
    spinParts.push({ p, u, y, sx:len, sy:h, sz:thick });
  };
  A.cyl(SPIN.a, SPIN.b, SPIN.y + .30, .022, .60, K.steel, { gloss:.55, ...METAL });
  A.cyl(SPIN.a, SPIN.b, SPIN.y + .012, .085, .024, K.trim, { gloss:.40 });
  A.cap(SPIN.a, SPIN.b, SPIN.y + .615, .05, .05, .05, K.brass, { gloss:.55, ...METAL });
  const CARDS = [C('#b4553f'), C('#3f6a7d'), C('#8a7a4a'), C('#4f6d52'),
                 C('#7a4a63'), C('#a8763c'), C('#3f4a63'), C('#96553b')];
  for (let k = 0; k < 4; k++) {
    spinPart(SPIN.R / 2, SPIN.y + .32, SPIN.R, .010, .58, K.walnutD, { gloss:.18, ...TIMBER });
    for (let i = 0; i < 3; i++)
      spinPart(.075 + (i % 2) * .085, SPIN.y + .13 + i * .17, .095, .006, .145,
               CARDS[(k * 3 + i) % CARDS.length], { mode:7, gloss:.08 });
  }
  // Absolute time, so a spinner the player has walked away from resumes at the right angle
  // instead of catching up. The rig sleeps entirely when this unit is off-floor or far away.
  let bookPromoAt = -1e9, bookPromoSig = '';
  A.motion('postcards', (time, state, player, minutes) => {
    const base = time * .56;
    spinParts.forEach((q, i) => {
      const phi = base + Math.floor(i / 4) * (Math.PI / 2);
      q.p.m = M.trs(spinW[0] + Math.cos(phi) * q.u, A.y0 + q.y,
                    spinW[1] - Math.sin(phi) * q.u, phi, q.sx, q.sy, q.sz);
    });
    state.turn = +(base % (Math.PI * 2)).toFixed(3);
    state.parts = spinParts.length;
    const eventDay = BooksSigning.day();
    const signing = BooksSigning.active(eventDay, Number.isFinite(minutes) ? minutes : 12 * 60);
    if (state.signing === undefined || signing !== !!state.signing) {
      signingFx.forEach((p, i) => { p.m = signing ? signingRest[i] : SIGNING_GONE; });
      cardCover.m = signing ? SIGNING_GONE : signingRest[coverIx];
      state.signing = signing ? 1 : 0;
    }
    state.signingDay = eventDay;
    state.signingProps = 8;
    state.author = signing ? '林致远' : '';
    state.queuePoint = signing ? 1 : 0;
    // Basket changes happen through the catalogue panel, never continuously.  Four small reads a
    // second are enough to make the till respond immediately, and only a signature edge writes the
    // four retained glyph alphas.  No text, arrays or props are built in this callback.
    if (time - bookPromoAt >= .25) {
      bookPromoAt = time;
      const offer = BooksPromotion.current();
      if (offer.signature !== bookPromoSig) {
        bookPromoSig = offer.signature;
        const on = offer.phase === 'applied' && offer.off > 0;
        bookPromoFx.forEach(r => {
          r.ready.forEach(p => { p.alpha = on ? .001 : 1; });
          r.applied.forEach(p => { p.alpha = on ? 1 : .001; });
        });
        state.promotion = on ? 1 : 0;
        state.promotionEligible = offer.eligible | 0;
        state.promotionOff = offer.off | 0;
      }
    }
  }, { far: 18 });

  // ---------------------------------------------------------------- light
  // Three of its own, all warm and all low down among the shelves. A bookshop is lit by whatever
  // is close to the books; the shell already hangs a bright plane on the ceiling.
  A.light(1.05, 0, 1.85, [1.00, 0.89, 0.72], .40, 3.1);
  A.light(1.15, 2.60, 1.55, [1.00, 0.91, 0.75], .34, 3.3);
  A.light(1.15, -2.60, 1.55, [1.00, 0.91, 0.75], .34, 3.3);

  // ---------------------------------------------------------------- what there is to learn here
  //
  // ---- where these are allowed to stand, which is not where the objects are
  // `A.th` walks the player to a + 1.15 and then needs them within `reach` of the label, so a
  // word can only hang on something whose focus point is floor a body can actually stand on AND
  // get to. Before the circulation rebuild, four labels focused inside the old a 1.48–2.26
  // gondolas and the bargain bin walled the till focus off from the door. Measured with the room's
  // own colliders at 0.30 m, that version of the shop had one usable word in it.
  //
  // What is reachable, and what every focus point below is checked against:
  //   the front lane      a 3.79–4.15 across the whole frontage
  //   the centre aisle    b −1.0 to +1.1, in from the door as far as a 3.28
  //   the two turns       .98 m nominal between the centre display and each gondola inner end
  //   the rear aisle      .92 m nominal between wall shelving and both gondolas
  // A 0.30 m-radius flood from the door now reaches both faces of both cases and the reading-chair
  // approach.  Those are geometry claims: keep the GONDOLA edges and the stops above in agreement.
  A.th('书店', 5.15, 0, '书店里很安静，说话的人都放低了声音。',
       'It is quiet inside the bookshop; everyone lowers their voice.',
       '书 book + 店 shop.', 2.2, 2.5);
  // ---- and the three that were dead, measured rather than argued about ----------------------
  // 书, 小说 and 书架 were hung on the back-wall bays at a 1.70, which puts their focus points at
  // a 2.85 between b +1.6 and +3.1. In the former plan the old right-gondola and magazine-rack
  // stops met after body-radius expansion, so the fill found nothing standable in that band.
  // Three of this shop's ten words could not be walked up to. They now hang on the three fixtures
  // that face the door aisle, which is the floor the fill does find.
  A.th('书', 2.24, -.05, '天黑了，他还在走。',
       'It had gone dark, and he was still walking.',
       '书 means book. This is the opening line on the 试读板 in front of you — read it, then the ' +
       'next one along.', 1.8, 1.30);
  A.th('小说', 2.90, .00, '早上七点，他到了火车站。',
       'At seven in the morning he reached the station.',
       '小 small + 说 to tell. The middle card: one step up, with a time and a place in it.',
       1.7, 1.05);
  A.th('看书', 2.24, -.50, '他看完了那些书，就回家了。',
       'He finished those books, and then went home.',
       '看 to look + 书 book — to read. The third line adds a second clause: 就 joins them.',
       1.8, 1.15);
  A.th('书架', 2.62, 2.90, '小说在右边，教材在里面那排书架上。',
       'Fiction is on the right; the textbooks are on the shelves further in.',
       '书 book + 架 rack. The board over your head is the shop directory; the small gold tickets ' +
       'on each shelf edge say what is on that board.', 1.8, 2.05);
  A.th('杂志', 1.42, -2.54, '新杂志刚刚送到，还没上架。',
       'The new magazines have just arrived and are not out yet.',
       '杂 mixed + 志 record.', 1.7, 1.30);
  A.th('报纸', 1.42, PAPER_B, '今天的报纸在最上面一格。',
       "Today's paper is in the top slot.",
       '报 to report + 纸 paper.', 1.7, 1.35);
  // The stationery island, three words along it and none of them further than 0.5 m apart in b,
  // which is enough: the picker takes whichever focus point the player is standing nearest.
  A.th('词典', 3.00, 2.78, '这本词典有八万个词，学生都用它。',
       'This dictionary has eighty thousand entries; the students all use it.',
       '词 word + 典 canon — a book you look words up in.', 1.7, 1.10);
  A.th('明信片', 3.00, 3.10, '明信片一张三块，寄到国外五块。',
       'Postcards are three yuan each, five to send abroad.',
       '明 clear + 信 letter + 片 slip — a letter anyone can read.', 1.7, 1.15);
  A.th('地图', 3.00, 3.44, '北京地图在文具那边，跟明信片放在一起。',
       'The Beijing maps are over by the stationery, next to the postcards.',
       '地 ground + 图 picture.', 1.7, 1.05);
  // The reading club. The card is what you sign up with, so the word is hung at the till, where
  // 白婉 is standing and where you would actually ask.
  A.th('会员卡', 2.95, -4.05, '办一张会员卡就能参加周六的读书会。',
       'Take out a membership card and you can join the Saturday reading club.',
       '会员 member + 卡 card. 读书会 is the reading club on the poster.', 1.7, 1.05);
  // The reading club, on the sign-up board at the inboard end of the till, where 白婉 points you.
  A.th('星期六', 2.90, CLUB_B, '读书会每个星期六下午三点，在这儿报名。',
       'The reading club is at three every Saturday afternoon; you sign up here.',
       '星期 week + 六 six — the sixth day, so Saturday. 星期天 is Sunday, the one exception.',
       1.7, 1.28);
  // The signing. 名字 rather than 签名, which the dictionary does not carry: what an author does at
  // one of these is write their name in your copy, and that is the same word you have already met
  // being asked yours at a hotel desk.
  A.th('名字', 2.85, 4.30, '作者会在书上写下自己的名字。',
       'The author will write his name inside your copy.',
       '名字 is a name. 签名 — to sign — is the same idea with 签, to inscribe.', 1.7, 1.20);
};

// ---------------------------------------------------------------------------------------------
// Editorial shopfront: a walnut campaign wall and three face-out jackets on a low library table.
// The window api intentionally has no glyphs, so colour blocks suggest title furniture without
// competing with the tenant name directly above. Twelve primitives per bay, twenty-four total.
MallFit['书店:glass'] = { alpha: .21, gloss: .88 }; // softer reflection keeps covers readable
MallFit['书店:win'] = (W, bc, side) => {
  const walnut = C('#4a382b'), oak = C('#8d6d4e'), paper = C('#ddd3bd');
  const warm = C('#e4bd73');
  const jackets = side > 0
    ? [C('#8b4338'), C('#315f68'), C('#b28a3f')]
    : [C('#3d526d'), C('#6d4a62'), C('#56704d')];

  // The inset is 7 mm clear of the carcass and the light rail another 8 mm forward: three clean
  // depth planes, never coplanar. The platform remains visible as a deliberate timber border.
  W.put(3.74, bc, .08, 2.52, 1.40, 1.04, walnut, { hard:true, gloss:.20 });
  W.put(3.794, bc, .014, 2.30, 1.18, 1.04, paper, { hard:true, gloss:.10 });
  W.put(3.815, bc, .012, 2.08, .025, .43, warm, { hard:true, mode:1, glow:.13 });

  W.put(4.14, bc, .50, 2.20, .08, .58, oak, { hard:true, gloss:.28 });
  for (const u of [-.88, .88])
    W.put(4.14, bc + u, .14, .14, .20, .44, walnut, { hard:true, gloss:.20 });

  for (let i = 0; i < 3; i++) {
    const b = bc + (i - 1) * .68;
    W.put(4.24, b, .08, .36, .50, .87, jackets[i], { hard:true, mode:7, gloss:.12 });
    W.put(4.291, b, .014, .26, .06, .82 + i * .08, i === 1 ? warm : paper,
      { hard:true, gloss:.18 });
  }
};

// ---------------------------------------------------------------------------------------------
// Who is in here. Local (a, b) unrolls to world x = a − 23, z = b + 6.4, because this unit is
// shop('W', 6.4, 10) — and a body is a 0.28 m radius that `Mall.clampUpper` pushes out of every
// collider in the room, so each of these was placed against the collider list and not by eye.
//
// `face` is a world yaw with 0 looking along +z. On this side of the building +a is +x, so a
// member of staff turned to face the room is at +π/2 and a customer facing the back wall at −π/2.
if (typeof MallCast !== 'undefined') MallCast.push(
  // ---- 白婉, on the till. She stands in the 1.06 m of staff floor that shortening the left
  // gondola created; before that the gap behind this counter was 0.41 m and nobody fitted in it.
  { hz:'收银员', name:'白婉', py:'Bái Wǎn', place:'mall', mallFloor:2,
    rig:'mall-books-cashier-bai-wan', temper:'steady',
    look:{ skin:'#e3b58c', hair:'#241d1a', hairStyle:'bun', top:'#e7dfcd', pants:'#3d4450',
      shoe:'#2b3034', vest:'#3f5347', collar:'shirt', glasses:true, tall:.97, faceSeed:9101 },
    spots:[{ h0:9, h1:22, at:[-20.65, 2.74], face:Math.PI / 2, act:'vend' }],
    lines:[['一共四十八，要开发票吗？', 'Forty-eight altogether — do you need a receipt?'],
           ['办张会员卡吧，买书打九折。', 'Take out a member card — ten percent off books.'],
           ['周六下午有读书会，您可以来听听。',
            'There is a reading club on Saturday afternoon; you would be welcome.']] },
  // ---- 林小舟 on the floor, in front of the stationery island. A bookseller stands on the
  // customer's side of a display and not behind it, and this is also the one pocket of the front
  // lane wide enough to put a body in without it touching the island or the shopfront collider.
  { hz:'店员', name:'林小舟', py:'Lín Xiǎozhōu', place:'mall', mallFloor:2,
    rig:'mall-books-clerk-lin-xiaozhou', temper:'genial',
    look:{ skin:'#cf9d73', hair:'#2b2320', hairStyle:'short', top:'#dcd5c4', pants:'#39414b',
      shoe:'#e7dfd0', vest:'#3f5347', collar:'shirt', tall:1.03, faceSeed:9102 },
    spots:[{ h0:9, h1:22, at:[-19.15, 9.50], face:-Math.PI / 2, act:'wait' }],
    lines:[['您想找哪一类？小说在右边。', 'What sort are you after? Fiction is on the right.'],
           ['这本词典学生用得最多。', 'This is the dictionary the students use most.'],
           ['明信片一张三块，可以在这儿写。',
            'Postcards are three yuan; you can write them here.']] },
  // ---- 林致远, the author on the 签售会 poster, at his table in the reading corner on the day.
  // He is here 10:30–12:30 on Sunday and nowhere else in the roster, so the corner is empty the
  // rest of the week and the poster is telling the truth either way. His foot point is out in the lane at
  // a 3.90, which the flood fill reports as reachable floor, and he faces −b — down the shop
  // towards the door, which is the direction a queue for a signing comes from.
  { hz:'作者', name:'林致远', py:'Lín Zhìyuǎn', place:'mall', mallFloor:2,
    rig:'mall-books-author-lin-zhiyuan', temper:'genial',
    look:{ skin:'#d3a179', hair:'#2e2622', hairStyle:'short', top:'#3c4a5c', pants:'#2f353d',
      shoe:'#2a2f34', collar:'shirt', glasses:true, tall:1.02, faceSeed:9105 },
    spots:[BOOKS_AUTHOR_SPOT],
    lines:[['您想让我写谁的名字？', 'Whose name would you like me to write?'],
           ['这本是新的，上个月刚出。', 'This one is new — it only came out last month.'],
           ['谢谢您来，慢慢看。', 'Thank you for coming; take your time looking round.']] },
  // ---- two shoppers on the reachable floor. Both are checked against the same collider list:
  // the first stands at the recommendation table, the second reads the left gondola's periodicals.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'patient',
    look:{ skin:'#e7bb92', hair:'#332b26', hairStyle:'bob', top:'#8c7085', pants:'#3b4552',
      shoe:'#e0d9cb', bag:'tote', bagColor:'#9d7d4e', tall:.98, faceSeed:9103 },
    spots:[{ h0:10, h1:21, at:[-19.60, 6.90], face:-Math.PI / 2, act:'wait' }] },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bored',
    look:{ skin:'#c08a61', hair:'#1f1a17', hairStyle:'tousled', top:'#4f6a7d', pants:'#333a42',
      shoe:'#262b2e', collar:'hood', pack:true, packColor:'#3d5a70', tall:1.05, youth:.35,
      faceSeed:9104 },
    spots:[{ h0:10, h1:21, at:[-20.42, 4.04], face:-Math.PI / 2, act:'read' }] },
);
