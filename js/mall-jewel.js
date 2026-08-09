// 珠宝店 · 金瑞珠宝 · JINRUI JEWELLERY — floor 1
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
//   A.put(a,b,da,db,h,y,colour,opt)  a box: size along a, size along b, height, centre height
//   A.cyl / A.ball / A.taper (a,b,y,...,colour,opt)
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)  one of the eight the shader can hold
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What a jeweller actually is
//
// Every other trade in this building is a room with stock in it. A jeweller is the opposite: it
// is a room with almost nothing in it, and what little there is has been put behind glass and
// lit harder than anything else in the building. Four things carry that and nothing else does:
//
//   * the counters are cases. Glazed on three sides, mirrored on the fourth, with the light
//     inside them rather than above them. Lit from within, a case is a lantern at waist height
//     and it is the first thing the eye lands on from the door — which is the entire point of
//     the shop.
//   * a horseshoe. Cases down both sides and across the back, staff inside the U and customers
//     outside it, with a 60 cm staff aisle behind. That plan is not a style choice, it is what
//     you get when everything in the shop has to be locked and handed over one piece at a time,
//     and it is what every jeweller in every mall in China looks like.
//   * one piece per stand. Not heaps. A run of pads with three or four objects on it and a lot
//     of empty velvet between them reads as expensive; the same run filled edge to edge reads
//     as a bead shop.
//   * contrast, and only contrast. The joinery is near-black, the pads are near-black, the
//     case decks are cream and the pieces are gold. Everything legible in this room is a small
//     bright thing on a large dark one. The first pass of this fit had pale busts on a pale
//     deck in front of a pale blue mirror and the whole run measured beige at three metres:
//     a jeweller whose stock you cannot see is a shelf of putty.
//
// The elevation the shell builds — slatted timber, backlit cove, 金瑞珠宝 in gold at 1.95 —
// occupies the middle 3.36 m of an 8 m wall and nothing else. (Its own framed graphics at ±3.09
// are suppressed on a unit this wide: `Math.abs(b)+.7 > len/2-.3` is true here, so that whole
// flank is bare plaster unless the tenant builds something.) Two lit wall cases fill it, and the
// staff door and the safe go outboard of those. Nothing in the room stands taller than 1.78, so
// the gold name floats clear above the whole shopfit.
//
// Two things are registered from here, in one shared block scope. `MallFit['珠宝店']` is the
// fit-out. `MallFit['珠宝店:win']` is the window, which js/mall.js asks for separately through
// `o.win` — a different and much smaller api, called before the fit and before the glazing goes
// in — and which a tenant that does not supply one gets filled by the shell with whatever GOODS
// entry its trade maps to. For this trade that is `jar`, the cosmetics pot, six of them a bay:
// the shopfront of a jeweller is the one part of it every player in the building walks past, and
// it was showing face cream. The colon in the key is deliberate — it can never collide with a
// shop kind, so the `MallFit[o.kind]` lookup never finds it by accident.
{
  const acc = C('#d8ad48');   // = col.gold in js/mall.js, which is what this shop's spec passes
                              //   in as A.acc. Named here because the window dressing below is
                              //   handed an api that has one too, and both must be the same gold.

  // ---- palette -------------------------------------------------------------------------------
  // Two different things happen to a colour here and they are worth keeping straight.
  //
  // A lit surface (mode 0) comes out close to what it is painted: the near-black lacquer below is
  // authored #241c14 and measures #27170d on the case front. A mode-1 surface does not. Mode 1 is
  // `lin2srgb(tonemap(colour))` with no lighting on it, which treats the authored value as linear
  // and lifts it a very long way — #5b7180 on a mirror comes back as #9bb9c7, a pale sky blue,
  // which is how the first pass ended up with a swimming pool behind the jewellery. Every mode-1
  // colour here is therefore written as the value that *arrives*, with the display colour beside
  // it, and anything unlit is picked two to three stops darker than it looks in a swatch.
  const c = {
    lacq:  C('#201810'),   // near-black lacquered joinery, the carcasses
    lacqL: C('#332818'),   // the stiles and rails standing proud of them
    shadow:C('#0d0f12'),   // toe recesses and door reveals
    trim:  C('#20242a'),
    brass: C('#8a6a2c'),   // brasswork. No material on any of it — see the note at MS below
    brassL:C('#d8bb6e'),
    // mode 1. Authored dark, arrives as a warm bronze mirror at #6a5842 — darker than the deck
    // in front of it and darker than every piece standing on it, which is the only arrangement
    // in which a mirrored case back holds the goods instead of swallowing them.
    //
    // Every mirror in this file is also drawn at gloss .55, and the exact number matters. In mode
    // 1 `uGloss > 0.6` is the shader's signal for "this is a window" (js/gl.js, the 玻璃 sheen):
    // above it, a surface reflects the sky with a fresnel term, and you look along a case at a
    // grazing angle almost all of the time. At .70 the mirrors were a flat pale sky-grey panel
    // wherever the run was seen down its length — the corner where the back run meets the left
    // return was a blank white rectangle a metre wide. A mirror is not a window; below .6 it
    // never asks for the sky. The glazing keeps .92 because it is glass and should.
    mirror:C('#1c150e'),   // -> #6a5842
    mirrorL:C('#2d2114'),  // -> #8a7454, the band where the front strip falls on it
    glassC:C('#749dad'),   // -> #c8d6da, the glazing. Kept thin: at alpha .17 and near-white the
                           //    first pass laid a blue wash over the entire contents of the case.
    deckC: C('#a89b7e'),   // cream stone, the floor of a case
    shelfC:C('#9a8b6b'),   // the same thing in a wall case, warmer and a stop darker: four of
                           //  these stacked up a lit bay are the brightest thing on the wall,
                           //  and at the deck's own value they beat every piece standing on them
    stoneT:C('#cfc7b2'),   // the quartz wrap-desk top
    warm:  C('#ffeccd'),   // every strip and cove in the shop
    backlit:C('#2e1e0e'),  // -> a warm amber, the back of a wall case
    velN:  C('#12161f'),   // navy velvet pads
    velR:  C('#240e13'),   // wine velvet. Two stops down from where it started: lit from 40 cm
                           //  by a strip, #33141b came back a bright maroon and every riser in
                           //  the shop read as a brick
    bust:  C('#282622'),   // warm charcoal velvet busts — gold has to lie on something dark, and
                           //  something dark and *neutral*: at #2b2c33 the busts went navy and
                           //  the run read as a row of little policemen
    bustR: C('#2c1219'),
    card:  C('#c4b89c'),   // the little price cards
    rug:   C('#161b24'),
    steelD:C('#7d868d'),
    silver:C('#d9dfe4'), pearl:C('#f4eee0'),
    jade:  C('#5fae94'), jadeL:C('#8fd0b8'),
    ruby:  C('#b23a4c'), sapph:C('#3f72b4'),
    goldL: C('#f0d489'),
    // 促销 red, and the only saturated colour in the room that is not a stone. Every printed
    // panel in this shop is one of these two and none of them emits: a promotional board is a
    // sheet of paper under the shop's lights, and at the sizes these are — the two counter
    // boards are 0.20 m² each — any glow at all makes a lightbox. Only the gold characters on
    // them are mode 1, and thin strokes at .08–.10, which is the readable-face band.
    //
    // Authored well below pillar-box: this is a lit surface, so it arrives close to what it is
    // painted, and #c8202c under a 1.00/0.94/0.80 lamp at 30 cm came back a fluorescent orange
    // that pulled the eye off every piece of gold in the shop. The whole point of putting red in
    // a jeweller is that the gold still wins.
    promoR:C('#8f1a22'),
    promoD:C('#5e1016'),   // the darker red of a ribbon and a hanging tag's back
    acryl: C('#ded8c8'),   // the frosted acrylic of a counter 台卡
    leafD: C('#28563a'), leaf:C('#356b45'), leafL:C('#417f52'),   // 发财树
    bark:  C('#5c4a30'),
  };
  // matScale is the real size of the thing photographed, not a tiling knob.
  //
  // Two of the house materials are the wrong photograph for this shop and are simply not used.
  // `steel` is corrugated cladding (js/assets.js says so in as many words) and puts ribs across
  // every brass fillet in the room; `metal` is near-featureless but measures 4.37x, which would
  // take near-black lacquer to mid grey. So all the brass and steel here is colour and gloss
  // alone, which is what a 20 mm polished fillet looks like anyway. `paving` is 5 cm setts and
  // cobbles anything stone at any scale, so the case decks and the quartz desk take `concrete`,
  // which is the substitution js/assets.js recommends for exactly this.
  const MW = {mat:'wood',     matScale:.90,  matAmt:.20, nrmAmt:.30};  // lacquered timber
  const MF = {mat:'fabric',   matScale:.34,  matAmt:.20, nrmAmt:.30};  // velvet and suede
  const MC = {mat:'concrete', matScale:1.10, matAmt:.16, nrmAmt:.30};  // case decks, quartz top

  // Heights, shared by every case and by the wrap desk so the U reads as one continuous line of
  // joinery rather than three pieces of furniture that happen to be near each other.
  const yToe=.12, yTop=.90, yDeck=.94, yGl=1.32, yCap=1.360;

  // ---- a local frame ---------------------------------------------------------------------------
  // (u,v): u runs along a piece of joinery, v across it, and the customer stands at increasing v
  // when `fc` is +1 — the side that gets the glass and the front lighting; the far side gets the
  // mirror. Every display piece in this file is written in these, so the same necklace is built
  // the same way on the back run, on the left return and inside a wall case facing the other way.
  // Getting this wrong is how a case ends up facing its own back wall.
  //
  // `X` is whichever api this is being built through — the fit's or the window's. They both draw
  // in the shop's own (a,b) and carry the same four primitives, so a bust built through one is
  // the same bust built through the other.
  function frame(X, ca, cb, axis, fc) {
    const AX = axis === 'a';
    const P = (u,v) => AX ? [ca+u, cb+v] : [ca+v, cb+u];
    const S = (su,sv) => AX ? [su,sv] : [sv,su];
    return { fc, P,
      put:(u,v,su,sv,h,y,cc,o={})=>{const p=P(u,v),s=S(su,sv);
        return X.put(p[0],p[1],s[0],s[1],h,y,cc,o);},
      ball:(u,v,y,ru,rh,rv,cc,o={})=>{const p=P(u,v),s=S(ru,rv);
        return X.ball(p[0],p[1],y,s[0],rh,s[1],cc,o);},
      tap:(u,v,y,su,h,sv,cc,o={})=>{const p=P(u,v),s=S(su,sv);
        return X.taper(p[0],p[1],y,s[0],h,s[1],cc,o);},
      cyl:(u,v,y,r,h,cc,o={})=>{const p=P(u,v);return X.cyl(p[0],p[1],y,r,h,cc,o);} };
  }

  // ---- the stock -------------------------------------------------------------------------------
  // Five kinds, and the rule for all of them is the same: whatever is meant to be seen is gold or
  // a stone, and whatever it stands on is nearly black. Sizes are the real ones scaled up about a
  // fifth — a 2 mm chain link is a third of a pixel from the customer side of a case, and a run of
  // correctly-sized jewellery is an empty case with some dust in it.
  const T = '项链';
  // 项链 — a velvet bust with a chain over its shoulders and a stone at the throat. The chain is
  // eleven overlapping beads on a shallow curve, lowest in the middle: a straight line of beads is
  // the single fastest way to make jewellery read as a row of buttons.
  //
  // How far in front of the bust the chain hangs is the whole piece, and it is easy to get wrong
  // by a centimetre and lose it completely. A taper is widest at its base, so a chain drooping to
  // its lowest point at the *chest* is at the bust's deepest section, and the first pass had the
  // beads 6 cm off the axis of a bust 8.4 cm deep: every one of them was inside the cone and all
  // that showed was the two end beads poking out sideways past the shoulders. The bust is 10 cm
  // deep now — which is what a bust is — and nothing on the chain sits closer in than 5.6.
  const necklace = (F,u,v,y,cc) => {
    const fc=F.fc;
    F.put(u,v,.170,.140,.016,y+.008,c.bustR,{mode:7,round:.010,tag:T,...MF});
    F.tap(u,v,y+.140,.152,.245,.100,c.bust,{gloss:.10,tag:T,...MF});
    for(let k=0;k<11;k++) {
      const t=(k-5)/5;
      F.ball(u+t*.060, v+fc*(.068-Math.abs(t)*.012),
             y+.118+(1-Math.cos(t*1.32))*.128, .0125,.0125,.0125, cc,{gloss:.90,tag:T});
    }
    F.ball(u, v+fc*.072, y+.090, .017,.024,.017, cc,{gloss:.92,tag:T});
    F.ball(u, v+fc*.074, y+.064, .010,.012,.010, c.jadeL,{gloss:.92,tag:T});
  };
  // 戒指 — three on posts down a navy pad, which is how a ring is shown and how a ring in a heap
  // is not. Each is a band and a stone, sixteen millimetres across.
  const rings = (F,u,v,y,cc) => {
    F.put(u,v,.225,.145,.026,y+.013,c.velN,{mode:7,round:.010,...MF});
    for(let k=-1;k<=1;k++) {
      F.cyl(u+k*.060,v,y+.052,.0060,.052,c.brass,{gloss:.62});
      F.cyl(u+k*.060,v,y+.084,.0165,.009,k?c.goldL:acc,{gloss:.88});
      F.ball(u+k*.060,v,y+.097,.0095,.0110,.0095,[c.sapph,cc,c.ruby][k+1],{gloss:.94});
    }
  };
  // 手镯 — bangles ridden down a cone, the way they are stored and the way they are shown.
  const bangles = (F,u,v,y) => {
    F.tap(u,v,y+.062,.090,.124,.090,c.bust,{gloss:.10,...MF});
    F.cyl(u,v,y+.026,.052,.011,acc,{gloss:.82});
    F.cyl(u,v,y+.050,.044,.011,c.jade,{gloss:.76});
    F.cyl(u,v,y+.074,.035,.010,acc,{gloss:.82});
    F.cyl(u,v,y+.096,.026,.009,c.jadeL,{gloss:.76});
  };
  // 手表 — on a cushion with the strap falling either side, because a watch case on its own is a
  // coin lying on a table.
  const watch = (F,u,v,y,cc) => {
    F.put(u,v,.115,.096,.052,y+.029,c.velN,{mode:7,round:.020,...MF});
    for(const s of [-1,1]) F.put(u+s*.078,v,.066,.026,.013,y+.034,cc,{mode:7,round:.010});
    F.cyl(u,v,y+.074,.030,.020,c.silver,{gloss:.84});
    F.cyl(u,v,y+.087,.024,.006,c.pearl,{gloss:.55});
    F.cyl(u,v,y+.092,.007,.004,acc,{gloss:.92});
  };
  // 耳环 — pairs on a standing card, the only piece in the shop displayed vertically, which is
  // what stops a case of flat pads reading as a tray of samples. The card is dark: built cream
  // with a dark inset it was a 13 cm white rectangle standing on end in a black case, and every
  // bay that had one read as a small television with two gold dots on it.
  const earrings = (F,u,v,y,cc) => {
    const fc=F.fc;
    F.put(u,v,.140,.066,.010,y+.007,c.velN,{mode:7,round:.010,...MF});
    F.put(u,v,.112,.016,.094,y+.059,c.bust,{hard:true,gloss:.14,...MF});
    F.put(u,v+fc*.010,.100,.004,.080,y+.057,c.bustR,{hard:true,gloss:.12,...MF});
    for(const s of [-1,1]) {
      F.ball(u+s*.030, v+fc*.017, y+.088,.0095,.0095,.0095,cc,{gloss:.92});
      F.ball(u+s*.030, v+fc*.017, y+.060,.0125,.0175,.0125,cc,{gloss:.92});
    }
  };
  const kinds=[necklace,rings,bangles,watch,earrings];
  // Weighted to gold. Pearl and plain silver on a cream deck are two pale things at three and a
  // half metres and the run goes to beige; the metal a Chinese jeweller mostly sells is 黄金
  // anyway, and one warm run with a stone in it reads at any distance.
  const tone=[acc,c.goldL,acc,c.silver,acc,c.jade];
  // A price card, leaning at the front of a pad. It is four square centimetres of cream and it is
  // the single cheapest thing that makes a case look like stock rather than a museum vitrine.
  const card = (F,u,v,y) => F.put(u,v,.046,.007,.030,y+.016,c.card,{hard:true,gloss:.18});

// =================================================================================================
// The fit-out.
MallFit['珠宝店'] = A => {

  // One deterministic seven-day quote is the source for both the retained standee and the verbs
  // at the foot of the fit-out. `minutes` reaches the existing motion callback, but the calendar
  // day does not, so this is the same narrow published seam used by the mall programme board.
  const PRICE_WAVE = [
    { g:0,  p:0,  s:0.0 }, { g:8,  p:6,  s:0.2 }, { g:3,  p:-4, s:-0.1 },
    { g:-4, p:3,  s:0.3 }, { g:6,  p:-2, s:0.0 }, { g:-2, p:5,  s:0.2 },
    { g:4,  p:1,  s:-0.2 },
  ];
  const priceDay = () => {
    try { return Math.max(1, window.__game.state().day | 0); } catch (_) { return 1; }
  };
  const quoteForDay = rawDay => {
    const day = Math.max(1, rawDay | 0), i = (day - 1) % PRICE_WAVE.length;
    const w = PRICE_WAVE[i], before = PRICE_WAVE[(i + PRICE_WAVE.length - 1) % PRICE_WAVE.length];
    const gold = 628 + w.g, platinum = 385 + w.p, silver = +(9.6 + w.s).toFixed(1);
    const level = d => d >= 5 ? 3 : d >= 0 ? 2 : 1;
    return { day, gold, platinum, silver, goldBars:level(w.g), platinumBars:level(w.p),
      direction:Math.sign(gold - (628 + before.g)) || 1 };
  };
  // The published game state builds a small snapshot object. Poll it at one-second boundaries (or
  // whenever game minutes advance), then let both the motion and display-rate getters read this
  // scalar cache. A daily board does not justify sixty state snapshots a second.
  const priceCalendar = { day:priceDay() };
  const priceBars = [], priceDirections = [], PRICE_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);

  // ---- a run of glazed cases -------------------------------------------------------------------
  // (ca,cb) is the centre, `len` the length along the run, `dep` across it, `axis` the shop axis
  // it travels down.
  //
  // `only` is one kind index per bay, and it turns a mixed run into a single-product counter: every
  // piece in that bay is the same thing in a different metal, which is what a counter with 手表 on
  // the plate in front of it has to contain. It also drops the third piece — three of the *same*
  // kind at the run's own spacing interpenetrate, because the spacing was set for three different
  // ones and a ring pad is half as wide again as an earring card.
  function caseRun(ca, cb, len, dep, axis, fc, bays, skipMid, only) {
    const F = frame(A, ca, cb, axis, fc);
    const {put, ball, tap, cyl, P} = F;
    const bw = len / bays;

    // ---- the carcass. A recessed toe, a lacquered body, and a brass band at the top of it that
    // catches every light in the room and draws the line the whole shop is set out on.
    //
    // The body is 78 cm of one dark colour and it fills the bottom third of the frame from the
    // door. Left plain it is a slab — the first pass measured a single flat #27170d rectangle
    // 6.4 m long — so it is framed up the way joinery actually is: a stile on every bay line and
    // a rail top and bottom, all standing 8 mm proud in a lighter lacquer, with a brass bead
    // under the top rail. That rhythm, not the colour, is the difference between a shopfit and a
    // painted plinth.
    put(0,0,len-.12,dep-.14,yToe,yToe/2,c.shadow,{hard:true,gloss:.16});
    put(0,0,len,dep,yTop-yToe,(yTop+yToe)/2,c.lacq,{hard:true,gloss:.30,...MW});
    const ff = fc*(dep/2+.008);
    for(let i=0;i<=bays;i++)
      put(-len/2+i*bw,ff,.090,.016,yTop-yToe-.006,(yTop+yToe)/2,c.lacqL,{hard:true,gloss:.34,...MW});
    put(0,ff,len,.016,.090,yTop-.052,c.lacqL,{hard:true,gloss:.34,...MW});
    put(0,ff,len,.016,.080,yToe+.046,c.lacqL,{hard:true,gloss:.34,...MW});
    put(0,fc*(dep/2+.019),len-.02,.010,.014,yTop-.104,c.brass,{hard:true,gloss:.58});
    // A light in the toe recess washing the carpet under the overhang, which is why a case looks
    // like it is floating rather than standing. It has to sit outboard of the toe and inboard of
    // the body above it — put on the body's own face it is simply buried inside the box.
    put(0,fc*(dep/2-.045),len-.34,.020,.024,yToe-.030,c.warm,{hard:true,mode:1,glow:.14});
    put(0,0,len+.022,dep+.022,yDeck-yTop,(yDeck+yTop)/2,c.brass,{hard:true,gloss:.46});

    // ---- the glass box. Front and both ends are glazed; the back is a mirror, because a case
    // with a mirrored back holds twice as much as it contains and that is the oldest trick in
    // the trade.
    //
    // Neither the deck nor the mirror emits. `glow` is what the shader hands the bloom pass —
    // `fragLight = frag.rgb * min(1.6, glow*2.6)` — so six square metres of deck and mirror at
    // glow 0.20 does not read as a bright case. It clips both to flat white, loses every piece
    // standing on them, and lays a blurred photograph of the shop across the ceiling and the
    // concourse beyond the shopfront. A case is bright because the strip lighting it is bright
    // and everything under it is pale, not because the joinery emits.
    const gh = yGl - yDeck, gy = (yGl + yDeck) / 2;
    put(0,0,len-.09,dep-.09,.034,yDeck-.017,c.deckC,{hard:true,gloss:.44,...MC});
    put(0,-fc*(dep/2-.026),len-.10,.016,gh,gy,c.mirror,{hard:true,mode:1,gloss:.55});
    put(0,-fc*(dep/2-.040),len-.12,.012,.055,yDeck+.075,c.mirrorL,{hard:true,mode:1,gloss:.55});
    put(0, fc*(dep/2-.012),len-.10,.013,gh,gy,c.glassC,{hard:true,mode:1,alpha:.12,gloss:.92});
    for(const e of [-1,1])
      put(e*(len/2-.012),0,.013,dep-.10,gh,gy,c.glassC,{hard:true,mode:1,alpha:.10,gloss:.92});
    put(0,0,len-.09,dep-.09,.013,yGl+.007,c.glassC,{hard:true,mode:1,alpha:.08,gloss:.92});
    put(0,0,len+.016,dep+.016,yCap-yGl-.014,(yCap+yGl+.014)/2,c.brass,{hard:true,gloss:.46});
    // The lamps inside it: a strip tucked under the front rail aimed down at the goods, and a
    // dimmer one behind, so the mirror has something to hold.
    put(0, fc*(dep/2-.055),len-.16,.020,.024,yGl-.040,c.warm,{hard:true,mode:1,glow:.30});
    put(0,-fc*(dep/2-.060),len-.16,.018,.020,yGl-.046,c.warm,{hard:true,mode:1,glow:.18});

    // ---- what is in it. One bay each in rotation, never more than three objects in a bay, and
    // one of the three lifted onto a riser: the eye needs two levels in a case or the whole run
    // is one flat plane of velvet.
    for(let i=0;i<bays;i++) {
      const u = -len/2 + (i+.5)*bw;
      // The mullion goes in before the skip, not after it. Drawn inside the dressing loop it was
      // lost along with the bay it belonged to, and the tower bay is the *middle* one — so the
      // one gap in an otherwise even rhythm of brass uprights was 46 cm left of centre, directly
      // under the hero case, which is the last place in the run to have something not line up.
      if(i) put(-len/2+i*bw, fc*(dep/2-.012),.024,.024,gh,gy,c.brass,{hard:true,gloss:.62});
      if(skipMid && Math.abs(u) < .02) continue;               // the tower bay dresses itself
      put(u,0,bw*.80,dep-.20,.014,yDeck+.007,c.velN,{mode:7,round:.010,...MF});
      const ru = u - bw*.19, rv = -fc*(dep*.13);
      put(ru,rv,bw*.27,dep*.30,.046,yDeck+.037,i%2?c.velR:c.bustR,{mode:7,round:.010,...MF});
      const q = only ? only[i%only.length] : null;
      kinds[q===null ? i%5 : q](F, ru, rv, yDeck+.060, tone[i%6]);
      kinds[q===null ? (i+2)%5 : q](F, u + bw*.14, fc*.030, yDeck+.014, tone[(i+3)%6]);
      if(bw>.80 && q===null)
        kinds[(i+4)%5](F, u + bw*.34, -fc*.045, yDeck+.014, tone[(i+1)%6]);
      card(F, u - bw*.30, fc*(dep/2-.075), yDeck+.014);
      card(F, u + bw*.24, fc*(dep/2-.075), yDeck+.014);
    }
    const p0=P(-len/2,-dep/2), p1=P(len/2,dep/2);
    A.stop(Math.min(p0[0],p1[0]),Math.max(p0[0],p1[0]),Math.min(p0[1],p1[1]),Math.max(p0[1],p1[1]));
    return F;
  }

  // ---- the plan --------------------------------------------------------------------------------
  // A horseshoe with a pair of islands closing the mouth of it: 6.4 m across the back, a 2.3 m run
  // down the left, the wrap desk facing it on the right, and two 1.63 m island cases reaching in
  // from each arm to within 85 cm of the shop's centre line. The unit is 8.0 wide and 4.8 deep, the
  // partitions are at ±3.92, and the shell's own window platform owns everything past a = 3.65 — so
  // the joinery stops at 3.56.
  //
  //   a 0.76 .. 1.34   the back run
  //   a 1.34 .. 2.06   the serving aisle, 72 cm, where the staff stand
  //   a 2.06 .. 2.64   the two islands, b ±0.85 .. ±2.48
  //   a 2.64 .. 3.65   the customer floor, stools, and the way to the till
  //
  // Two numbers in that are not free. The aisle has to clear 0.60 or nobody can stand in it: the
  // clamp in js/build.js expands every collider by the walker's radius, 0.28 for an NPC and 0.30
  // for the player, so 72 cm leaves 36 mm of daylight round a person and 60 cm would have wedged
  // the staff into the case fronts. And the gap between the two islands has to clear the same
  // twice over, because it is the only way into the aisle and the only way to the tower; at 1.70 m
  // it is a doorway you can see the hero case through from the shopfront, which is the one sight
  // line the whole plan is set out on.
  //
  // A wool rug inside the U first. The shell lays this unit with blue carpet, which is the right
  // floor for a mall and the wrong one for the inside of a jeweller's horseshoe; 12 square metres
  // of near-black wool is what puts the room at the value the cases are lit against.
  //
  // Its top has to clear y0+0.02, which is where shop() lays the carpet quad (js/mall.js, `flat`
  // in the shop shell). Built 20 mm thick off the floor it is exactly coplanar with it, the two
  // z-fight, and the carpet wins: the first pass of this rug measured #4e5d69 across every pixel
  // of it, which is the carpet's own colour to within a shade.
  A.put(2.36, 0, 2.42, 5.14, .024, .018, c.rug,   {hard:true, gloss:.05, ...MF});
  A.put(2.36, 0, 2.18, 4.90, .024, .024, c.velN,  {hard:true, gloss:.05, ...MF});
  caseRun(1.05, 0.00, 6.40, .58, 'b',  1, 7, true);
  caseRun(2.40,-2.88, 2.30, .58, 'a',  1, 3, false);
  // The islands. One product a bay, named on a plate standing on the brass cap in front of it, so
  // that four of the five things MALL_GOODS says this shop sells are legible as themselves from
  // the door rather than being small gold shapes in a mixed case. 项链 is the fifth and it is the
  // tower's, which is why neither island carries one.
  //
  // They stop short of the arms rather than butting them, and how short is set by the widest thing
  // on the arm rather than by its carcass: a case's own deck cap oversails 11 mm a side and the
  // wrap desk's quartz top 60, so measured off the carcass faces these clear by 100 mm on the left
  // and by 39 on the right. Anything flush would be two pieces of joinery sharing a plane at 0.90,
  // which is the z-fight the whole file is written to avoid.
  caseRun(2.35,-1.665, 1.63, .58, 'b', 1, 2, false, [2,4]);
  caseRun(2.35, 1.665, 1.63, .58, 'b', 1, 2, false, [1,3]);
  // The plates. 10 cm of near-black standing on the brass cap with the word on it in gold, which is
  // what a Chinese jeweller puts in front of every bay, and the cheapest thing in the room that
  // turns a case of small gold shapes into a counter that sells something with a name.
  //
  // Standing on the cap rather than hung above it, for two reasons. It puts them at 1.36–1.46,
  // which from the shopfront is the eye line, and the only thing they take out of the shot at that
  // height is the strip of bare plaster between the wall cases' sills at 1.20 and their bottom
  // shelves at 1.44 — a sign hung at 1.60 measured out a whole shelf of stock instead. And the cap
  // is the only surface here they can sit on: the case top is glass and 4 cm lower, and the plates
  // were first drawn at a 2.61 off the islands' old centre line, which after they moved forward
  // left all four of them buried inside their own front panes.
  for(const [pb,w] of [[-2.0725,'手镯'],[-1.2575,'耳环'],[1.2575,'戒指'],[2.0725,'手表']]) {
    A.put(2.600, pb, .014, .27, .100, yCap+.048, c.lacq,  {hard:true, gloss:.30, ...MW});
    A.put(2.604, pb, .020, .29, .012, yCap+.100, c.brass, {hard:true, gloss:.56});
    A.glyph(2.612, pb, yCap+.046, w, {size:.072, gap:.026, color:c.goldL, mode:1, glow:.10});
  }

  // ---- the tower ------------------------------------------------------------------------------
  // One piece, alone, at eye height, dead in the middle of the back run and directly under the
  // gold name. A shop this size gets exactly one of these and everything else in the room is
  // arranged so that it is what you see from the door. Its cornice tops out at 1.794; the name is
  // centred on 1.95 at 26 cm tall, so it starts at 1.82 and the two never touch — and they have to
  // be checked in the render rather than in the arithmetic, because the tower stands 60 cm nearer
  // the eye than the wall the name is on and rises against it faster than its own height suggests.
  {
    const ta=1.05, tw=.82, td=.50, y1=1.695, y0=yCap;
    const gh=y1-y0, gy=(y0+y1)/2;
    const F = frame(A, ta, 0, 'b', 1);
    A.put(ta,0,td+.07,tw+.07,.032,y0+.018,c.brass,{hard:true,gloss:.46});           // sill
    // Wine velvet rather than the cream stone the run gets. One piece alone on a dark floor is
    // the whole grammar of a hero case, and the light on it here is a hand's width away — a pale
    // deck this close to the lamp simply clips. It is also the narrowest thing in the shop: at
    // 1.06 m a case holding one 15 cm bust is a bus shelter, and the piece has to be big in its
    // own box before it can be the thing you see from the door.
    A.put(ta,0,td-.05,tw-.05,.022,y0+.045,c.velR,{hard:true,gloss:.08,...MF});      // its floor
    A.put(ta-td/2+.022,0,.016,tw-.06,gh,gy,c.mirror,{hard:true,mode:1,gloss:.55});
    A.put(ta-td/2+.036,0,.012,tw-.10,.060,y0+.150,c.mirrorL,{hard:true,mode:1,gloss:.55});
    A.put(ta+td/2-.012,0,.013,tw-.06,gh,gy,c.glassC,{hard:true,mode:1,alpha:.12,gloss:.92});
    for(const s of [-1,1]) {
      A.put(ta,s*(tw/2-.012),td-.06,.013,gh,gy,c.glassC,{hard:true,mode:1,alpha:.10,gloss:.92});
      for(const e of [-1,1])
        A.put(ta+e*(td/2-.018),s*(tw/2-.018),.026,.026,gh,gy,c.brass,{hard:true,gloss:.62});
    }
    A.put(ta,0,td-.05,tw-.05,.013,y1-.006,c.glassC,{hard:true,mode:1,alpha:.08,gloss:.92});
    A.put(ta,0,td+.06,tw+.06,.038,y1+.020,c.brass,{hard:true,gloss:.50});           // cornice
    A.put(ta+td/2-.055,0,.020,tw-.14,.024,y1-.050,c.warm,{hard:true,mode:1,glow:.36});
    A.put(ta-td/2+.062,0,.018,tw-.14,.022,y1-.054,c.warm,{hard:true,mode:1,glow:.22});
    // and the piece: a wine plinth, a tall charcoal bust, a collar of gold and a jade drop. It is
    // the same necklace the run is full of, built half as big again and given a metre of nothing
    // on all four sides, which is the only reason anybody looks at it.
    A.put(ta,0,.24,.26,.040,y0+.076,c.velR,{mode:7,round:.010,...MF});              // a plinth
    A.put(ta,0,.26,.28,.012,y0+.102,c.brass,{hard:true,gloss:.50});                 // and its edge
    A.taper(ta,0,y0+.199,.118,.205,.164,c.bust,{gloss:.10,tag:T,...MF});
    A.put(ta,0,.150,.210,.016,y0+.128,c.bustR,{mode:7,round:.010,tag:T,...MF});
    for(let k=0;k<13;k++) {
      const t=(k-6)/6;
      A.ball(ta+.080-Math.abs(t)*.010, t*.082,
             y0+.170+(1-Math.cos(t*1.26))*.118, .0145,.0145,.0145, acc,{gloss:.92,tag:T});
    }
    A.ball(ta+.084,0,y0+.145,.021,.031,.021,acc,{gloss:.94,tag:T});
    A.ball(ta+.086,0,y0+.113,.014,.017,.014,c.jadeL,{gloss:.94,tag:T});
    // The one bay of the back run underneath it, which would otherwise be the only empty metre of
    // deck in the shop and reads as a gap in the stock rather than as restraint.
    F.put(0,0,.80,.38,.014,yDeck+.007,c.velN,{mode:7,round:.010,...MF});
    bangles(F,-.30,-.030,yDeck+.014);
    watch(F, .00, .030,yDeck+.014,c.goldL);
    rings(F, .30,-.030,yDeck+.014,acc);
    card(F,-.30,.215,yDeck+.014); card(F,.30,.215,yDeck+.014);
  }

  // ---- two lit wall cases ----------------------------------------------------------------------
  // The shell's timber feature panel is 3.36 m of an 8 m wall and its own framed graphics are
  // suppressed at this width, so without these the flanks of the best elevation in the building
  // are 1.4 m of bare plaster each, running from the case tops to the ceiling — which is exactly
  // what the first pass rendered. A jeweller fills that with wall cases, lit from behind, and
  // they are the only thing in the shot above waist height that is not the shell's.
  //
  // Depth runs outward: the wall face is at a = 0.21, so the carcass is built forward of it and
  // the glass is the piece with the *largest* a. Built the other way round the bay hides its own
  // contents behind its own back.
  function wallCase(cb) {
    const w=1.28, y0=1.20, y1=2.78, hy=(y0+y1)/2, hh=y1-y0;
    const F = frame(A, .46, cb, 'b', 1);
    // Carcass: a back board, two jambs, a head and a sill, all in the same lacquer as the cases.
    A.put(.27,cb,.12,w+.16,hh+.16,hy,c.lacq,{hard:true,gloss:.26,...MW});
    for(const s of [-1,1])
      A.put(.42,cb+s*(w/2+.040),.42,.080,hh+.16,hy,c.lacq,{hard:true,gloss:.26,...MW});
    A.put(.42,cb,.42,w+.16,.090,y1+.075,c.lacq,{hard:true,gloss:.26,...MW});
    A.put(.42,cb,.42,w+.16,.090,y0-.075,c.lacq,{hard:true,gloss:.26,...MW});
    // The warm back. Dim: this is a lit panel a customer stands a metre from, not a lamp, and a
    // square and a half of it at any real glow hangs a haze over the whole back of the shop.
    A.put(.345,cb,.020,w-.04,hh-.05,hy,c.backlit,{hard:true,mode:1,glow:.07});
    // Shelves, with a strip under the front lip of each so the goods are lit from the front and
    // the shelf below is not a shadow.
    for(let i=0;i<4;i++) {
      const y = y0 + .24 + i*((hh-.40)/3);
      A.put(.47,cb,.26,w-.09,.022,y,c.shelfC,{hard:true,gloss:.46,...MC});
      A.put(.585,cb,.018,w-.20,.018,y-.030,c.warm,{hard:true,mode:1,glow:.20});
      // The velvet runner sits forward of a = 0.39. Laid at 0.345 it ran a centimetre into the lit
      // back panel behind it and the two shared a plane down the whole shelf.
      A.put(.475,cb,.17,w-.13,.012,y+.017,c.velN,{mode:7,round:.010,...MF});
      const g = y + .023;
      if(i%2) { necklace(F,-.30,-.03,g,i>1?c.goldL:acc); bangles(F,.30,-.02,g);
                card(F,.02,.115,g); }
      else    { rings(F,-.31,-.02,g,acc); watch(F,.05,-.02,g,c.goldL);
                earrings(F,.35,-.02,g,i?acc:c.goldL); }
    }
    // A brass reveal round the opening, and the glass in front of everything. The jambs stand
    // clear of the pane at ±(w/2 + .020): set at +.008 they were half buried in it.
    for(const s of [-1,1])
      A.put(.60,cb+s*(w/2+.020),.055,.026,hh+.02,hy,c.brass,{hard:true,gloss:.58});
    A.put(.60,cb,.055,w+.08,.026,y1+.021,c.brass,{hard:true,gloss:.58});
    A.put(.60,cb,.055,w+.08,.026,y0-.021,c.brass,{hard:true,gloss:.58});
    A.put(.615,cb,.013,w,hh,hy,c.glassC,{hard:true,mode:1,alpha:.11,gloss:.92});
  }
  wallCase(-2.36); wallCase(2.36);

  // ---- the wrap desk -------------------------------------------------------------------------
  // The right arm of the U. Same carcass and the same brass band as the cases, but solid and with
  // a quartz top instead of glass: this is where a piece is boxed and paid for, and it is the one
  // surface in the room you are allowed to put your elbows on.
  //
  // 20 cm longer than it was and pulled 12 cm inboard, both for the same reason: the aisle behind
  // it is where the cashier stands, and at db 3.00 that aisle measured 61 cm against a partition
  // whose own collider starts at 3.90. A 0.28 walker in 61 cm has 25 mm to spare on each side and
  // slides out of it on the first frame. At 2.88 it is 73 cm and she stays where she was put.
  {
    const da=2.45, db=2.88, dl=2.10, dd=.58;
    A.put(da,db,dl-.12,dd-.14,yToe,yToe/2,c.shadow,{hard:true,gloss:.16});
    A.put(da,db,dl,dd,yTop-yToe,(yTop+yToe)/2,c.lacq,{hard:true,gloss:.28,...MW});
    for(const k of [-1,-.334,.334,1])
      A.put(da+k*(dl/2-.045),db-dd/2-.008,.090,.016,yTop-yToe-.006,(yTop+yToe)/2,
        c.lacqL,{hard:true,gloss:.34,...MW});
    A.put(da,db-dd/2-.008,dl,.016,.090,yTop-.052,c.lacqL,{hard:true,gloss:.34,...MW});
    A.put(da,db-dd/2-.008,dl,.016,.080,yToe+.046,c.lacqL,{hard:true,gloss:.34,...MW});
    A.put(da,db,dl+.026,dd+.026,.032,yTop+.016,c.brass,{hard:true,gloss:.50});
    A.put(da,db,dl+.10,dd+.12,.070,yDeck-.001,c.stoneT,{hard:true,gloss:.46,...MC});
    A.put(da,db-dd/2+.012,dl-.34,.020,.026,yToe+.035,c.warm,{hard:true,mode:1,glow:.12});
    // The till. A shop you cannot pay in is a diorama, so this is the one fitting here that is
    // not decoration: the 收银台 thing below is what USE_AT.mall keys the whole purchase off.
    //
    // It sits at the door end of the desk now rather than the back of it. The islands took the
    // inboard 1.2 m of this arm's customer side, so the only stretch of counter anybody can stand
    // at is a 2.64 .. 3.56 — and a till at a 1.93 was a metre behind the last place a customer
    // could reach, with the cashier serving the wall.
    A.put(da+.62,db+.10,.30,.26,.24,yDeck+.155,c.trim,{hard:true,gloss:.35});
    const tillScreen=A.put(da+.61,db-.05,.03,.20,.18,yDeck+.175,C('#1d3350'),
      {hard:true,mode:1,glow:.14});
    A.put(da+.30,db-.17,.20,.13,.045,yDeck+.058,c.steelD,{hard:true,gloss:.55});   // card reader
    const readerScreen=A.put(da+.30,db-.17,.10,.08,.010,yDeck+.086,C('#2a4468'),
      {hard:true,mode:1,glow:.10});
    if(A.powerDisplay)A.powerDisplay([tillScreen,readerScreen],{id:'till'});
    // A gable at the door end carrying the word, because glyphs in this frame can only face the
    // shopfront — a sign on the desk's long side would be drawn edge-on and read as nothing.
    A.put(da+dl/2+.03,db,.055,dd+.10,.62,yDeck+.245,c.lacqL,{hard:true,gloss:.28,...MW});
    A.put(da+dl/2+.062,db,.010,dd+.02,.030,yDeck+.500,acc,{hard:true,gloss:.6});
    A.glyph(da+dl/2+.065,db,yDeck+.215,'收银台',
      {size:.115,gap:.035,color:c.goldL,mode:1,glow:.14,tag:'收银台'});
    // A desk lamp, a ring tray under it, and a boxed piece waiting to be handed over. The shade is
    // brass rather than the joinery lacquer: a dark cone on a dark counter is a bollard, and the
    // only reason to build a lamp at all is that it is the one warm point on this side of the room.
    A.cyl(da-.06,db+.14,yDeck+.012,.062,.020,c.brass,{gloss:.6});
    A.cyl(da-.06,db+.14,yDeck+.150,.011,.280,c.brass,{gloss:.6});
    A.taper(da-.06,db+.14,yDeck+.335,.150,.115,.150,c.brass,{gloss:.44});
    A.cyl(da-.06,db+.14,yDeck+.282,.062,.016,c.warm,{mode:1,glow:.34});
    A.put(da-.06,db-.14,.20,.15,.022,yDeck+.046,c.velR,{mode:7,round:.010,...MF});
    for(let k=-1;k<=1;k++) A.cyl(da-.06+k*.055,db-.14,yDeck+.068,.0150,.008,
      k?c.silver:c.goldL,{gloss:.86});
    // Three wrapped boxes waiting to be handed over, at the end the customer never reaches.
    for(let k=0;k<3;k++) {
      A.put(da-.95+k*.155,db+.13-k*.010,.13,.13,.055,yDeck+.062,
        [C('#4a1822'),C('#3a2412'),C('#4a1822')][k],{mode:7,round:.010,...MF});
      A.put(da-.95+k*.155,db+.13-k*.010,.135,.030,.060,yDeck+.064,c.goldL,{mode:7,round:.010});
    }
    // A counter mirror on a brass swivel — the piece of a jeweller's desk that says what the desk
    // is for. Its foot goes under the mirror and not 42 cm along the counter from it, which is
    // where an earlier arithmetic slip (`da-1.35+.42` for the foot, `da-.93+.42` for the frame)
    // had been leaving it: a mirror standing on nothing, and a brass coaster on its own.
    A.cyl(da-.51,db+.12,yDeck+.012,.070,.020,c.brass,{gloss:.6});
    for(const s of [-1,1])
      A.put(da-.51,db+.12+s*.115,.020,.020,.240,yDeck+.132,c.brass,{hard:true,gloss:.62});
    A.put(da-.51,db+.12,.026,.220,.230,yDeck+.150,c.brass,{hard:true,gloss:.50});
    A.put(da-.495,db+.12,.010,.190,.200,yDeck+.150,c.mirror,{hard:true,mode:1,gloss:.55});
    A.stop(da-dl/2,da+dl/2+.06,db-dd/2,db+dd/2);
  }

  // ---- stools ----------------------------------------------------------------------------------
  // Jewellery is bought sitting down. One at each island and one at the left arm, all on the
  // customer floor at a ≈ 3.12 and none of them in the 1.70 m gap between the islands, which is the
  // way through to the tower and the serving aisle and has to stay clear for both the player and
  // the staff. They used to stand at a 2.05, which is now inside the islands.
  for(const [a,b] of [[3.12,-2.30],[3.12,-1.50],[3.12,1.50]]) {
    A.cyl(a,b,.024,.195,.048,c.trim,{gloss:.35});
    A.cyl(a,b,.030,.205,.014,c.brass,{gloss:.55});
    A.cyl(a,b,.300,.030,.500,c.brass,{gloss:.58});
    A.cyl(a,b,.180,.115,.018,c.brass,{gloss:.55});                     // footrest
    A.cyl(a,b,.578,.180,.058,c.velR,{mode:7,...MF});
    A.cyl(a,b,.614,.166,.016,c.velR,{mode:7,...MF});
    A.cyl(a,b,.549,.170,.012,c.brass,{gloss:.55});
    A.stop(a-.19,a+.19,b-.19,b+.19);
  }

  // ---- back wall, outboard of the wall cases ---------------------------------------------------
  // The two things a jeweller's back wall has to have, and both go where they actually go: past
  // the ends of the display run, in the staff aisle, reachable from inside the U without anybody
  // leaving it. They are 45 cm off the partitions, which is the only space left once the wall
  // cases have taken the flanks of the feature panel.
  A.put(.27,-3.45,.12,.90,2.22,1.11,c.shadow,{hard:true,gloss:.18});          // reveal
  A.put(.33,-3.45,.045,.78,2.08,1.04,c.lacq,{hard:true,gloss:.30,...MW});     // leaf
  A.put(.356,-3.45,.010,.62,.030,.320,c.brass,{hard:true,gloss:.50});         // kicking plate
  A.put(.356,-3.45,.010,.62,.030,1.92,c.brass,{hard:true,gloss:.50});
  A.put(.356,-3.45,.012,.030,1.02,1.16,c.brassL,{hard:true,gloss:.66});       // the pull
  A.put(.360,-3.12,.018,.070,.105,1.16,c.trim,{hard:true,gloss:.32});         // card reader
  A.put(.368,-3.12,.008,.040,.040,1.17,c.jadeL,{hard:true,mode:1,glow:.16});

  // 保险柜. Chest high on the wall behind the counter, where a jeweller's actually is, and the one
  // object in the room the customer is meant to notice and not think about.
  A.put(.27,3.45,.12,.78,.72,1.66,c.trim,{hard:true,gloss:.30});              // body
  A.put(.345,3.45,.045,.66,.60,1.66,c.steelD,{hard:true,gloss:.44});          // its door
  A.cyl(.395,3.45,1.66,.062,.055,c.trim,{rz:Math.PI/2,gloss:.40});            // dial boss
  A.cyl(.410,3.45,1.66,.042,.030,c.brassL,{rz:Math.PI/2,gloss:.66});          // and the dial
  A.put(.402,3.70,.075,.046,.180,1.66,c.brassL,{hard:true,gloss:.60});        // handle
  A.put(.368,3.45,.012,.62,.026,1.94,c.brass,{hard:true,gloss:.50});
  A.put(.285,3.45,.010,.74,.028,2.06,acc,{hard:true,gloss:.55});

  // ---- back of house ---------------------------------------------------------------------------
  // The packing bench, in the dead end of the aisle behind the wrap desk between the safe and the
  // desk's back corner. Every piece sold in here leaves in a box with a ribbon on it and somebody
  // has to tie it, and this is the only square metre of the unit no customer can see into: the
  // desk hides it from the shop floor and the partition hides it from the neighbour.
  //
  // It closes the back end of that aisle, which is deliberate — the cashier stands at a ≈ 2.90,
  // outboard of the desk, and the 45 cm of aisle behind the bench was never wide enough to be
  // anything but somewhere to get stuck.
  // Every `y` in here is a centre, not a base — A.cyl(a,b,y,r,h) puts half the height either side
  // of it, which is how the stool bases in this file are written and the one thing that decides
  // whether a bench is laid out or hovering a centimetre over its own worktop. The stone is
  // 0.800–0.838 with a brass lip to 0.852, so everything standing on it starts at 0.838.
  A.put(1.02,3.54,.66,.64,.80,.40,c.lacq,{hard:true,gloss:.26,...MW});
  A.put(1.02,3.54,.70,.68,.038,.819,c.stoneT,{hard:true,gloss:.44,...MC});
  A.put(1.02,3.54,.72,.70,.014,.845,c.brass,{hard:true,gloss:.46});
  for(let k=0;k<3;k++)                                                 // ribbon, three colours
    A.cyl(1.26,3.32+k*.19,.862,.052,.048,[acc,c.ruby,c.jade][k],{gloss:.24,...MF});
  A.put(.86,3.36,.20,.20,.100,.888,c.velR,{mode:7,round:.014,...MF});  // a tray of empty boxes
  for(let k=0;k<4;k++)
    A.put(.80+(k%2)*.115,3.30+((k/2)|0)*.115,.10,.10,.048,.962,
      k%2?C('#3a2412'):C('#4a1822'),{mode:7,round:.008,...MF});
  A.put(.86,3.74,.16,.12,.070,.873,c.steelD,{hard:true,gloss:.50});    // the scales
  A.put(.86,3.74,.10,.08,.008,.912,C('#2a4468'),{hard:true,mode:1,glow:.10});
  A.cyl(1.30,3.80,.850,.030,.024,c.brass,{gloss:.6});                  // and a task lamp
  A.cyl(1.30,3.80,1.010,.009,.300,c.brass,{gloss:.6});
  A.taper(1.30,3.80,1.185,.110,.086,.110,c.brass,{gloss:.44});
  A.put(1.30,3.80,.070,.070,.014,1.146,c.warm,{hard:true,mode:1,glow:.26});
  A.stop(.69,1.35,3.22,3.86);

  // A full-height mirror on each partition, out at the ends of the arms where a customer holding
  // something up can actually stand in front of one. Same value as every other mirror in the shop
  // and the same gloss, for the reason set out at `mirror` in the palette: above .6 the shader
  // starts treating a flat panel as a window and hands it the sky.
  //
  // It has exactly 68 cm of wall to live on. The shell hangs its own lit graphic on each partition
  // from a 1.63 to 2.97 whenever the unit is 5 m or wider (js/mall.js, `if(len>=5.0)`) and the
  // window platform starts at 3.655, so anything between those two is free and anything overlapping
  // either is two boxes sharing a volume. And the three planes here are 24 and 26 mm apart rather
  // than flush: a mirror whose back face lands on the frame's front face is a coplanar pair.
  for(const s of [-1,1]) {
    A.put(3.31,s*3.900,.60,.030,1.74,1.24,c.brass,{hard:true,gloss:.50});
    A.put(3.31,s*3.876,.53,.034,1.66,1.24,c.mirror,{hard:true,mode:1,gloss:.55});
    A.put(3.31,s*3.850,.55,.012,.024,2.13,c.brassL,{hard:true,gloss:.62});
  }

  // ---- 促销 · what makes this a Beijing gold shop and not a Bond Street one -------------------
  // Everything above this line is the joinery, and the joinery of a jeweller is much the same in
  // any country. What is not the same is the print. A Chinese 金店 is dense with promotional
  // paper in a way a western one never is, and the four things below are the ones that carry it:
  // the day's gold price on a board behind the counter, red tags hung on the glass, 吊旗 over the
  // floor, and a money tree by the door. Leave them out and this is a generic jeweller with
  // Chinese words on it.
  //
  // Two rules hold for all of them. None of the red emits — see `promoR` in the palette; a
  // printed board is a lit surface and the only mode-1 things here are the gold characters on it.
  // And every character in this room faces the shopfront, because `A.glyph` can only be turned to
  // the shop's own yaw or its opposite (js/mall.js, the api's `glyph`), so a sign is either read
  // from the door or not read at all.

  // 今日金价 and 以旧换新, one board each side of the tower, standing on the back run's cap.
  //
  // This is the single most recognisable fitting in a Chinese jeweller and there is nowhere else
  // it goes: gold is sold by the gram at a price that moves daily, so the price is on a board and
  // not on the pieces. Both boards are inside the 0.65 m of frontage either side of the hero case
  // and stop at 1.738 — the sight line from the door to the shell's 金瑞珠宝 at 1.82 passes 8 cm
  // over the top of them, which was checked in the render and not in the arithmetic, because the
  // boards stand 60 cm nearer the eye than the wall the name is on.
  const board = (bb, head, l2, l3) => {
    A.put(1.050, bb, .030, .60, .018, 1.369, c.brass,  {hard:true, gloss:.52});   // foot
    A.put(1.045, bb, .022, .56, .360, 1.558, c.promoR, {hard:true, gloss:.24});   // the print
    A.put(1.050, bb, .030, .60, .020, 1.748, c.brass,  {hard:true, gloss:.52});   // cap
    A.put(1.064, bb, .010, .40, .008, 1.600, c.goldL,  {hard:true, gloss:.60});   // rule
    A.glyph(1.066, bb, 1.648, head, {size:.072, gap:.024, color:c.goldL, mode:1, glow:.10});
    A.glyph(1.066, bb, 1.542, l2,   {size:.044, gap:.014, color:c.goldL, mode:1, glow:.08});
    A.glyph(1.066, bb, 1.448, l3,   {size:.044, gap:.014, color:c.goldL, mode:1, glow:.08});
  };
  board(-0.95, '今日金价', '足金·每日更新', '铂金·到店看牌');
  board( 0.95, '以旧换新', '旧金折价换新款', '满三千减三百');

  // Red 吊牌 hung on the outside of the glass. Two characters each, which is all a tag that size
  // can carry, and they go on the *front* of the pane rather than in the case: a promotion is
  // aimed at somebody who has not come in yet.
  //
  // Where the front of the pane is takes some care. The glass of a run is at its centre + 0.278,
  // and the deck cap and the top cap oversail to 0.301 — so a tag hung at the glass line is half
  // inside the brasswork above and below it. These sit at +0.322, a clear 21 mm proud of the
  // widest thing on the carcass, which is what a tag on a hook actually does.
  const tag = (ca, bb, w) => {
    A.put(ca+.046, bb, .008, .010, .112, 1.283, c.brass,  {hard:true, gloss:.58});  // the hook
    A.put(ca+.044, bb, .012, .175, .115, 1.170, c.promoR, {hard:true, gloss:.26});
    A.put(ca+.048, bb, .010, .190, .012, 1.234, c.goldL,  {hard:true, gloss:.55});
    A.glyph(ca+.055, bb, 1.170, w, {size:.058, gap:.018, color:c.goldL, mode:1, glow:.11});
  };
  for(const [bb,w] of [[-2.743,'特惠'],[-0.914,'热销'],[0.914,'新品'],[2.743,'精选']])
    tag(1.328, bb, w);                                   // the back run's pane
  tag(2.628,-1.2575,'特惠'); tag(2.628, 1.2575,'热销');   // and one on each island

  // 吊旗. Two banners on a rail over the customer floor, read downward the way a Chinese banner
  // is. `glyphs` in js/build.js takes `vertical`, which stacks the characters down the quad
  // instead of across it — one call rather than four, and the spacing then comes off the same
  // `size + gap` the horizontal case uses, so a four-character banner cannot drift out of its
  // own cloth the way four hand-placed glyphs can.
  //
  // Hung at a 2.55 and 2.38–3.38 high. That is deliberately clear of two things: the ceiling
  // downlight grid, which the shell puts at a 1.35 and 3.05 with its lenses at 3.50, and the
  // sight line from anywhere on the customer floor to the wall cases — a banner at b ±1.15 cut
  // the top shelf of the left bay in half from the doorway.
  for(const [bb,word] of [[-1.45,'以旧换新'],[1.45,'足金特惠']]) {
    A.put(2.550, bb, .020, .58, .020, 3.400, c.brass, {hard:true, gloss:.55});     // the rail
    for(const s of [-1,1])
      A.put(2.550, bb+s*.26, .014, .014, .150, 3.475, c.steelD, {hard:true, gloss:.5});
    A.put(2.550, bb, .014, .44, 1.00, 2.880, c.promoR, {mode:7, round:.006, ...MF});
    A.put(2.572, bb, .018, .48, .020, 3.365, c.goldL, {hard:true, gloss:.55});
    A.put(2.572, bb, .018, .48, .020, 2.395, c.goldL, {hard:true, gloss:.55});
    A.glyph(2.560, bb, 2.905, word,
      {size:.128, gap:.022, vertical:true, color:c.goldL, mode:1, glow:.10});
  }

  // 发财树, in a red pot, beside the door on the way in. There is one of these in every second
  // shop in the country and it is the cheapest thing in this file that says which country the
  // shop is in. Two 福 cards hang off it on red cord.
  //
  // It stands at a 3.42, b -1.88, which is a 5 cm gap from the stool that serves the left arm and
  // 70 cm off the centre line the player walks in on. Its foliage reaches a 3.71 — past the front
  // of the shop floor and over the shell's window platform — but the platform's top is at 0.34
  // and the lowest leaf is at 0.56, so the two never meet.
  {
    const ta=3.42, tb=-1.88;
    A.cyl(ta,tb,.115,.170,.230,c.promoR,{gloss:.30});
    A.cyl(ta,tb,.208,.178,.028,c.goldL,{gloss:.52});
    A.cyl(ta,tb,.234,.150,.020,C('#241d16'),{gloss:.06});
    for(const [dx,dz] of [[0,0],[.022,.014],[-.020,-.016]])
      A.cyl(ta+dx,tb+dz,.430,.030,.400,c.bark,{gloss:.14});
    A.put(ta,tb,.075,.075,.050,.300,c.promoR,{mode:7,round:.014,...MF});          // the cord
    A.ball(ta,     tb,     .720,.300,.160,.300,c.leaf, {gloss:.14});
    A.ball(ta-.080,tb+.080,.860,.240,.140,.240,c.leafL,{gloss:.14});
    A.ball(ta+.080,tb-.070,.880,.210,.130,.210,c.leafD,{gloss:.14});
    A.ball(ta,     tb,     1.000,.180,.120,.180,c.leaf,{gloss:.14});
    for(const [bo,yo] of [[.075,.660],[-.090,.600]]) {
      A.put(ta+.150,tb+bo,.010,.070,.090,yo,c.promoD,{hard:true,gloss:.30});
      A.put(ta+.148,tb+bo,.006,.006,.110,yo+.100,c.promoR,{hard:true,gloss:.30});
      A.glyph(ta+.158,tb+bo,yo,'福',{size:.052,color:c.goldL,mode:1,glow:.11});
    }
    A.stop(ta-.18,ta+.18,tb-.18,tb+.18);
  }

  // ---- the till, the way a Chinese till is dressed ---------------------------------------------
  // Three acrylic 台卡 on the customer edge of the quartz, at the three points a customer standing
  // at the desk actually looks: the QR by the till, the membership card halfway along, and the
  // 温馨提示 at the far end where somebody waiting reads it.
  //
  // The 二维码 is the one that cannot be left out. Nobody in this country pays a jeweller in cash
  // and a counter with no 收款码 on it reads as a shop that has been shut since 2012. The code is
  // real geometry rather than a texture — three finder squares and a scatter of modules on a
  // frosted card — because at 10 cm across from a metre away that is exactly what one looks like.
  //
  // All three stand on the quartz, whose top is at 0.975, and all three face the shopfront: the
  // customer comes at this desk from +a, so a card turned to the desk's long side would be drawn
  // edge-on and read as a line.
  {
    const qa=3.02, qb=2.66;
    A.put(qa,qb,.075,.130,.012,.981,c.brass,{hard:true,gloss:.50});
    A.put(qa,qb,.010,.125,.165,1.070,c.acryl,{hard:true,gloss:.34});
    A.put(qa+.007,qb,.004,.090,.090,1.086,C('#f4f1e8'),{hard:true,gloss:.30});
    for(const [db,dy,s] of [[-.028,.028,.022],[.028,.028,.022],[-.028,-.028,.022],
                            [0,0,.011],[.014,-.012,.011],[-.013,.006,.011],
                            [.026,-.028,.011],[-.026,-.006,.011],[.008,.022,.009]])
      A.put(qa+.010,qb+db,.003,s,s,1.086+dy,C('#211d18'),{hard:true,gloss:.20});
    A.glyph(qa+.012,qb,1.006,'扫码支付',{size:.024,gap:.006,color:c.trim,mode:0,glow:0});

    A.put(2.22,2.64,.060,.200,.010,.981,c.brass,{hard:true,gloss:.50});
    A.put(2.22,2.64,.010,.190,.105,1.028,c.acryl,{hard:true,gloss:.34});
    A.glyph(2.230,2.64,1.052,'入会有礼',{size:.036,gap:.010,color:c.promoR,mode:0,glow:0});
    A.glyph(2.230,2.64,1.004,'办卡享9折',{size:.026,gap:.007,color:c.trim,mode:0,glow:0});

    A.put(1.72,2.64,.060,.225,.010,.981,c.brass,{hard:true,gloss:.50});
    A.put(1.72,2.64,.010,.215,.095,1.023,c.acryl,{hard:true,gloss:.34});
    A.glyph(1.730,2.64,1.046,'温馨提示',{size:.034,gap:.010,color:c.promoR,mode:0,glow:0});
    A.glyph(1.730,2.64,1.000,'店员为您取拿',{size:.026,gap:.007,color:c.trim,mode:0,glow:0});
  }

  // ---- 窗贴 · the promotion in the two windows ------------------------------------------------
  // Built from here rather than from the window function at the foot of this file, for the reason
  // set out there: the api the shell hands a window has no `glyph` on it. This one does, and it
  // draws in the same (a, b), so the panel simply reaches out onto the window backdrop the window
  // function put up a moment earlier.
  //
  // This is the most-looked-at square foot of the whole tenancy — everybody walking the west
  // aisle passes two of these and most of them never come in — so if one surface in this shop has
  // to say which country it is in, it is this one. A gold shop advertises three things and only
  // three: the day's price, the trade-in, and the threshold discount.
  //
  // Depth is fiddly here and worth writing down. The backdrop's face is at 3.805, its brass
  // capping reaches 3.815, the brass rail 3.822 and the gold bar above it 3.828, and the wash
  // that lights all of it is a strip at 3.821–3.839 sitting at y 1.339–1.361. The panel therefore
  // starts at 3.835 and tops out at 1.17, and its two brass rails are pushed to 3.841 — inside
  // the panel's own volume rather than flush on its face, which is an intersection and not the
  // coplanar pair that flickers.
  //
  // b: each window bay is centred on ±2.75 and its backdrop runs ±1.06 either side of that. The
  // gold bar takes the half nearer the partition, so this takes the half nearer the door.
  for(const pb of [-2.13, 2.13]) {
    A.put(3.842,pb,.014,.58,.34,1.000,c.promoR,{hard:true,gloss:.24});
    A.put(3.848,pb,.014,.62,.018,1.178,c.brass,{hard:true,gloss:.52});
    A.put(3.848,pb,.014,.62,.018,0.822,c.brass,{hard:true,gloss:.52});
    A.glyph(3.850,pb,1.100,'以旧换新',{size:.080,gap:.026,color:c.goldL,mode:1,glow:.10});
    A.glyph(3.850,pb,0.980,'足金今日价',{size:.044,gap:.014,color:c.goldL,mode:1,glow:.08});
    A.glyph(3.850,pb,0.885,'满三千减三百',{size:.044,gap:.014,color:c.goldL,mode:1,glow:.08});
  }

  // =============================================================================================
  // The service side of a jeweller.
  //
  // Everything above this line is stock behind glass. What a gold shop in this country actually
  // sells across that glass is a list of *services*, and none of them was here: sizing a ring,
  // trying a piece on, comparing the day's metal prices, engraving it, cleaning it, repairing it,
  // and boxing it with a certificate and a warranty card. Six fixtures below, and the constraint
  // they are all built against is the same one that set the plan in the first place.
  //
  // This unit has no spare floor. Expand every collider in it by the player's 0.30 m radius and
  // three pockets are left: the 1.70 m gap between the islands (a 1.64..2.94, b -0.55..0.55), the
  // band in front of the wrap desk (a 2.94..3.61, b 1.80..2.29), and the doorway. That is all. So
  // nothing here stands on the floor — it stands on the brass caps of the two islands, on the
  // quartz of the wrap desk, and on the packing bench, and every label's focus is one of those
  // three pockets, put by hand rather than derived.
  //
  // The one cost of using the island caps is worth writing down rather than discovering later.
  // From the doorway at (4.8, 0) the right wall case's 1.28 m opening projects onto b 1.07..1.87
  // at the island's own depth, so anything standing on that cap above 1.36 takes a bite out of the
  // case's bottom shelf. The existing 戒指 and 耳环 plates already do; these are kept to 0.26 m so
  // the bite is the bottom shelf's lower half and never the two above it.

  // ---- a label whose approach point is chosen rather than derived --------------------------
  // `A.th` puts the focus at a + 1.15 on the same b, which is right for something you walk up to
  // head-on and wrong for everything in a horseshoe: the piece is behind glass on your left and
  // you are standing in the gap. The thing is returned, so the circle is simply set.
  const lab = (hz, a, b, zh, en, note, reach, y, fa, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(fa, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };

  // ---- 量指围 · ring sizing, on the left island's cap ----------------------------------------
  // The two things a jeweller measures with, and they are different instruments: a stepped mandrel
  // the ring is ridden down until it stops, and a hoop of steel gauge rings you put on the finger
  // instead. Both are here because a customer uses one and the staff use the other.
  //
  // The mandrel is a `taper`, which narrows upwards — a ring sizer is exactly that shape and this
  // is the one place in the file where the mesh's own bias is the right way up to begin with.
  const sizerRings = [];
  {
    const sa = 2.30, sb = -1.665, y0 = yCap + .004;
    A.put(sa, sb, .30, .46, .014, y0 + .007, c.velN, { mode: 7, round: .010, ...MF });
    A.put(sa, sb, .32, .48, .010, y0, c.brass, { hard: true, gloss: .50 });
    // The mandrel, on a weighted foot, with four bands ridden down it — 12 号 to 18 号, which is
    // the run a Chinese counter quotes in.
    A.cyl(sa, sb - .150, y0 + .020, .052, .026, c.brass, { gloss: .58 });
    A.taper(sa, sb - .150, y0 + .128, .046, .190, .046, c.brassL, { gloss: .66 });
    for (let k = 0; k < 4; k++)
      A.cyl(sa, sb - .150, y0 + .052 + k * .038, .0295 - k * .0042, .010,
        k % 2 ? c.silver : acc, { gloss: .86 });
    // The gauge hoop: eight steel rings on a ring, on a low post, turning. Three orbit visibly
    // and the rest sit still — see the motion block; a turntable is only read as one if what is
    // on it passes something that is not.
    A.cyl(sa, sb + .095, y0 + .012, .078, .020, c.brass, { gloss: .56 });
    A.cyl(sa, sb + .095, y0 + .038, .012, .034, c.brass, { gloss: .60 });
    A.cyl(sa, sb + .095, y0 + .058, .066, .008, c.brassL, { gloss: .64 });
    for (let k = 0; k < 6; k++) {
      const th = k * Math.PI / 3;
      const p = A.cyl(sa + Math.cos(th) * .050, sb + .095 + Math.sin(th) * .050,
        y0 + .074, .0165, .009, k % 2 ? c.silver : c.goldL, { gloss: .88 });
      A.dynamic(p, sa, sb + .095, y0 + .074, .22);
      sizerRings.push({ p, th });
    }
    // And the card that says what the numbers mean. 指围 is the circumference in millimetres and
    // the 号 is derived from it, which is the whole of what a sizing conversation is about.
    A.put(sa - .16, sb + .21, .012, .175, .115, y0 + .066, c.acryl, { hard: true, gloss: .34 });
    A.put(sa - .155, sb + .21, .060, .080, .010, y0 + .005, c.brass, { hard: true, gloss: .50 });
    A.glyph(sa - .148, sb + .21, y0 + .098, '量指围', { size: .036, gap: .011, color: c.trim,
      mode: 0, glow: 0 });
    A.glyph(sa - .148, sb + .21, y0 + .046, '12号-18号', { size: .026, gap: .007, color: c.promoR,
      mode: 0, glow: 0 });
    // A watch beside it on a strap-sizing block, because a bracelet and a strap are the same
    // question asked of the wrist rather than the finger, and 手表 had nothing of its own.
    A.put(sa + .13, sb + .17, .11, .14, .046, y0 + .030, c.velN, { mode: 7, round: .014, ...MF });
    watch(frame(A, sa + .13, sb + .17, 'b', 1), 0, 0, y0 + .053, c.silver);
    for (let k = 0; k < 3; k++)
      A.cyl(sa + .13, sb - .02 + k * .028, y0 + .014, .0075, .022, c.steelD, { gloss: .55 });
  }

  // ---- 试戴台 · trying a piece on, on the right island's cap ---------------------------------
  // The counter a jeweller actually hands things across: a raked velvet arm pad, a forearm form
  // wearing a bangle and a ring, a neck form with a chain on it, a card of earrings standing up,
  // and a small mirror on a brass yoke tilted at whoever is sitting there. Four of the five things
  // MALL_GOODS says this shop sells are on this one pad, being worn rather than displayed, which
  // is the difference the brief for this shop was after.
  //
  // The island cap gives 0.545 m of clear frontage between its two name plates (which stand at
  // b 1.2575 and 2.0725 and are 0.27 wide), and 0.27 m outboard of the far one. Everything on the
  // pad is laid out inside the first of those and the mirror takes the second, because a piece of
  // furniture that straddles a plate is a piece of furniture standing on a sign.
  const tryIndicators = [];
  const tryIndicator = (hz, a, b, y) => {
    const p = A.put(a, b, .026, .050, .008, y, acc,
      { hard:true, mode:1, glow:0, alpha:.001, gloss:.36 });
    p.mallJewelTryOn = hz;
    tryIndicators.push(p);
    return p;
  };
  {
    const ta = 2.26, tb = 1.665, y0 = yCap + .004;
    const F2 = frame(A, 2.52, tb, 'b', 1);
    A.put(ta, tb, .30, .48, .010, y0, c.brass, { hard: true, gloss: .50 });
    A.put(ta, tb, .28, .46, .020, y0 + .012, c.velR, { mode: 7, round: .012, ...MF });
    // The forearm, laid along the frontage. `A.cap` sizes in WORLD axes and does NOT go through
    // `dim`, so on this west-wall unit sx is the size along a and sz along b; rx turns the
    // capsule's own long axis (its y) onto z, which here is b. A capsule is the one primitive
    // that is right for this: each hemisphere cap is a quarter of the length, so an arm gets a
    // wrist and an elbow for free where a cylinder would give it two cut ends.
    A.cap(ta - .02, tb - .065, y0 + .062, .066, .240, .066, c.bust,
      { rx: Math.PI / 2, gloss: .10, ...MF });
    A.put(ta - .02, tb + .080, .062, .085, .046, y0 + .062, c.bust,
      { mode: 7, round: .018, ...MF });                                   // the back of the hand
    for (let k = 0; k < 4; k++)                                           // and four fingers
      A.put(ta - .048 + k * .019, tb + .145, .017, .058, .017, y0 + .059, c.bust,
        { mode: 7, round: .007, ...MF });
    A.cyl(ta - .02, tb - .165, y0 + .062, .046, .016, acc, { rx: Math.PI / 2, gloss: .88 });
    A.cyl(ta - .02, tb - .140, y0 + .062, .044, .012, c.jade, { rx: Math.PI / 2, gloss: .80 });
    A.cyl(ta - .010, tb + .150, y0 + .059, .0135, .010, c.goldL, { rx: Math.PI / 2, gloss: .90 });
    A.ball(ta - .010, tb + .150, y0 + .072, .009, .010, .009, c.ruby, { gloss: .94 });
    // A second, shallower pad nearer the customer with the two pieces that are not worn on an
    // arm: a card of earrings standing up, and a chain lying out of its case the way one is put
    // in front of somebody rather than hung on a bust.
    A.put(2.52, tb, .14, .40, .012, y0 + .008, c.velN, { mode: 7, round: .010, ...MF });
    earrings(F2, -.110, 0, y0 + .020, c.goldL);
    for (let k = 0; k < 9; k++)
      A.ball(2.52, tb + .080 + (k - 4) * .019, y0 + .028 + (k % 2) * .003,
        .0105, .0105, .0105, acc, { gloss: .90, tag: T });
    // The mirror, on the 0.27 m of cap outboard of the far plate, on a brass yoke and tilted back
    // at whoever is sitting at this island. This is the piece the try-on is actually for: the
    // shop's other mirrors are full-height ones on the partitions, four metres from the stock.
    A.cyl(2.30, 2.33, y0 + .012, .052, .018, c.brass, { gloss: .60 });
    for (const s of [-1, 1])
      A.put(2.30, 2.33 + s * .078, .016, .016, .140, y0 + .090, c.brass,
        { hard: true, gloss: .62 });
    A.put(2.30, 2.33, .020, .150, .145, y0 + .102, c.brass, { hard: true, gloss: .50, rz: .26 });
    A.put(2.312, 2.33, .008, .126, .122, y0 + .104, c.mirror,
      { hard: true, mode: 1, gloss: .55, rz: .26, tag: '镜子' });
    A.put(2.12, 2.33, .012, .140, .080, y0 + .058, c.acryl, { hard: true, gloss: .34 });
    A.glyph(2.128, 2.33, y0 + .058, '免费试戴',
      { size: .030, gap: .008, color: c.promoR, mode: 0, glow: 0 });

    // One locator sits beside each exact silhouette instead of washing the entire pad equally.
    // Four belong to this cap; the watch locator sits beside the watch form already built on the
    // facing island. They share one retained box signature and remain steady under reduced motion.
    tryIndicator('手镯', ta + .095, tb - .150, y0 + .032);
    tryIndicator('戒指', ta + .095, tb + .150, y0 + .032);
    tryIndicator('耳环', 2.575, tb - .110, y0 + .022);
    tryIndicator('项链', 2.575, tb + .080, y0 + .022);
    tryIndicator('手表', 2.490, -1.495, yCap + .068);
    A.dynamicVisual(tryIndicators);
  }

  // ---- 今日金价对比 · what the metals cost, side by side --------------------------------------
  // The two boards on the back run give the day's price for 足金 and 铂金 in gold letters two
  // metres away. What a customer standing at the desk asks is narrower than that — 金的和银的差
  //多少 — so it gets its own standee at the counter, with three rows, a retained daily bar layer,
  // and a sample of each metal lying under its own line. The samples are the point: a price board
  // is print, a price board with the actual chain beside each row is a comparison.
  {
    const qa = 2.05, qb = 2.64;
    A.put(qa, qb, .075, .260, .012, .981, c.brass, { hard: true, gloss: .50 });
    A.put(qa, qb, .012, .250, .180, 1.078, c.acryl, { hard: true, gloss: .34 });
    A.put(qa + .007, qb, .004, .232, .020, 1.148, c.promoR, { hard: true, gloss: .20 });
    A.glyph(qa + .012, qb, 1.148, '金银对比', { size: .030, gap: .009, color: c.card,
      mode: 0, glow: 0 });
    ['足金', '铂金', '白银'].forEach((m, i) => {
      const y = 1.104 - i * .040;
      A.glyph(qa + .012, qb - .072, y, m, { size: .024, gap: .006, color: c.trim, mode: 0, glow: 0 });
    });
    // Six retained segments make the two headline prices physical: three for gold and three for
    // platinum. Four more retained bars form the rising/falling stair marker. All ten use the same
    // opaque box signature, so the whole changing layer is one dynamic draw and no glyph atlas is
    // rebuilt when a forced day changes.
    const segment = (key, level, b, y, color) => {
      const p = A.put(qa + .014, b, .004, .018, .010, y, color,
        { hard:true, mode:1, glow:.12, gloss:.30, tag:'今日金价' });
      p.mallJewelPriceMetal = key; p.mallJewelPriceSegment = level;
      priceBars.push({ key, level, p, rest:p.m }); p.m = PRICE_GONE;
    };
    for (let k = 0; k < 3; k++) {
      segment('gold', k + 1, qb + .018 + k * .023, 1.104, acc);
      segment('platinum', k + 1, qb + .018 + k * .023, 1.064, c.silver);
    }
    const directionPart = (direction, k, b, y) => {
      const p = A.put(qa + .014, b, .004, .010, .010, y,
        direction === 'up' ? c.promoR : c.leaf,
        { hard:true, mode:1, glow:.12, gloss:.30, tag:'今日金价' });
      p.mallJewelPriceDirection = direction; p.mallJewelDirectionPart = k + 1;
      priceDirections.push({ direction, p, rest:p.m }); p.m = PRICE_GONE;
    };
    directionPart('up', 0, qb + .088, 1.079);
    directionPart('up', 1, qb + .100, 1.091);
    directionPart('down', 0, qb + .088, 1.091);
    directionPart('down', 1, qb + .100, 1.079);
    A.dynamicVisual(priceBars.map(q => q.p), priceDirections.map(q => q.p));
    // Three short lengths of chain on a velvet strip in front of it, one per row, so the words
    // 足金 · 铂金 · 白银 have something to point at.
    A.put(qa + .105, qb, .085, .240, .012, .983, c.velN, { mode: 7, round: .008, ...MF });
    [acc, c.silver, c.pearl].forEach((cc, i) => {
      const bb = qb - .078 + i * .078;
      for (let k = 0; k < 5; k++)
        A.ball(qa + .105, bb + (k - 2) * .016, .996 + (k % 2) * .003, .0095, .0095, .0095, cc,
          { gloss: .90 });
    });
  }

  // ---- 证书 · certificate, warranty, box and ribbon -------------------------------------------
  // Nothing leaves a Chinese gold shop loose. It leaves in a box, in a bag, with a 鉴定证书 in a
  // sleeve and a 保修卡 stapled to the receipt, and the whole of that ritual happens on the
  // customer's side of this desk while they watch. So: an open certificate folder with its seal
  // showing, a warranty card standing behind it, and the wrap tier — spools of ribbon, a finished
  // bow and the shears — at the end of the run.
  {
    const ca = 1.60, cb = 2.70;
    A.put(ca, cb, .190, .260, .014, .982, c.lacq, { hard: true, gloss: .30, ...MW });
    // The folder, open, one leaf flat and one raked up: a closed folder is a book and reads as
    // one, and what makes this a certificate is the gold seal and the ruled lines on the page.
    A.put(ca - .04, cb, .120, .180, .008, .993, c.card, { hard: true, gloss: .16 });
    A.put(ca + .062, cb, .118, .180, .008, 1.032, c.card, { hard: true, gloss: .16, rz: -.62 });
    for (let k = 0; k < 4; k++)
      A.put(ca - .04, cb, .002, .130, .003, .999 + k * .000, C('#8d8570'),
        { hard: true, gloss: .10 });
    A.cyl(ca - .075, cb + .058, 1.000, .017, .006, acc, { gloss: .78 });          // the seal
    A.glyph(ca + .068, cb, 1.036, '鉴定证书', { size: .026, gap: .007, color: c.promoR,
      mode: 0, glow: 0 });
    // The warranty card, standing behind it in a small brass clip.
    A.put(ca - .085, cb - .13, .050, .080, .010, .983, c.brass, { hard: true, gloss: .52 });
    A.put(ca - .085, cb - .13, .008, .085, .105, 1.040, c.promoD, { hard: true, gloss: .22 });
    A.glyph(ca - .080, cb - .13, 1.040, '保修卡', { size: .024, gap: .007, color: c.goldL,
      mode: 1, glow: .08 });
    // The wrap tier. Three spools on a common brass spindle with the tails hanging, a tied bow
    // sitting beside the empty boxes the packing bench already keeps, and a pair of shears.
    A.put(ca + .24, cb + .30, .200, .300, .016, .983, c.lacq, { hard: true, gloss: .30, ...MW });
    A.cap(ca + .24, cb + .30, 1.028, .012, .270, .012, c.brass, { rx: Math.PI / 2, gloss: .60 });
    for (let k = 0; k < 3; k++) {
      const bb = cb + .30 + (k - 1) * .085, cc = [c.promoR, acc, c.jade][k];
      A.cyl(ca + .24, bb, 1.028, .038, .050, cc, { rx: Math.PI / 2, gloss: .26, ...MF });
      A.put(ca + .24, bb, .010, .046, .085, .1 + .905, cc, { hard: true, gloss: .24 });
    }
    A.put(ca + .24, cb + .11, .075, .075, .036, 1.001, c.promoD, { mode: 7, round: .010, ...MF });
    for (const s of [-1, 1])
      A.put(ca + .24, cb + .11 + s * .045, .050, .058, .018, 1.020, c.promoR,
        { mode: 7, round: .009, ry: s * .5, ...MF });
    A.cap(ca + .35, cb + .34, .996, .006, .120, .006, c.steelD, { rx: Math.PI / 2, rz: .30, gloss: .55 });
    A.cap(ca + .35, cb + .30, .996, .006, .120, .006, c.steelD, { rx: Math.PI / 2, rz: -.30, gloss: .55 });
  }

  // ---- 清洗 · the ultrasonic bath, and the repair the 师傅 does behind it ---------------------
  // The one service in this shop that happens in front of you rather than in three days: a small
  // steel tub of solution that a ring goes into for ninety seconds and comes back out of looking
  // new. It sits on the staff half of the quartz — the customer edge is b 2.59 and everything on
  // this desk that a hand touches is inboard of it — with a lid propped open, a lit bath, a wire
  // basket on the rim and a fine curl of vapour off the surface.
  let bathLamp = null;
  {
    const ua = 2.66, ub = 3.02;
    A.put(ua, ub, .200, .165, .100, 1.025, c.steelD, { hard: true, gloss: .50 });
    A.put(ua, ub, .215, .180, .014, 1.082, c.steelD, { hard: true, gloss: .55 });
    A.put(ua - .10, ub, .010, .170, .095, 1.128, c.steelD, { hard: true, gloss: .50, rz: -.42 });
    A.put(ua, ub, .150, .120, .012, 1.070, C('#2c5a68'), { hard: true, mode: 1, alpha: .55, gloss: .82 });
    bathLamp = A.dynamicVisual(
      A.put(ua, ub, .130, .105, .008, 1.062, C('#3f7f8c'), { hard: true, mode: 1, glow: .16 }));
    for (const s of [-1, 1])
      A.put(ua + s * .078, ub, .010, .120, .026, 1.086, c.steelD, { hard: true, gloss: .58 });
    A.put(ua + .105, ub - .055, .012, .034, .014, 1.012, C('#3fa070'),
      { hard: true, mode: 1, glow: .16 });                                        // the run lamp
    A.steam(ua, ub, 1.10, { n: 3, height: .22, spread: .07, alpha: .18, speed: .11, duty: .48 });
    // The repair side of the same service: three pieces already tagged, hanging on a small rail
    // at the back of the desk where a customer can see that other people's things are here too.
    A.cap(1.90, 3.10, 1.145, .008, .300, .008, c.brass, { rx: Math.PI / 2, gloss: .58 });
    for (const s of [-1, 1])
      A.put(1.90, 3.10 + s * .150, .012, .012, .150, 1.070, c.brass, { hard: true, gloss: .58 });
    for (let k = 0; k < 3; k++) {
      const bb = 3.10 + (k - 1) * .095;
      A.cyl(1.90, bb, 1.118, .0085, .048, c.steelD, { gloss: .60 });
      A.put(1.905, bb, .010, .050, .034, 1.078, c.promoD, { hard: true, gloss: .24 });
      A.cyl(1.90, bb, 1.048, .022, .008, k % 2 ? c.silver : acc, { rx: Math.PI / 2, gloss: .86 });
    }
    A.put(2.34, 2.62, .060, .200, .010, .981, c.brass, { hard: true, gloss: .50 });
    A.put(2.34, 2.62, .010, .190, .095, 1.023, c.acryl, { hard: true, gloss: .34 });
    A.glyph(2.350, 2.62, 1.046, '清洗保养', { size: .034, gap: .010, color: c.promoR, mode: 0, glow: 0 });
    A.glyph(2.350, 2.62, 1.000, '免费 · 当场取', { size: .024, gap: .006, color: c.trim, mode: 0, glow: 0 });
  }

  // ---- 刻字 · engraving, on the packing bench --------------------------------------------------
  // A gold shop engraves, and it engraves what you tell it to: a name, a date, 平安 on the inside
  // of a bangle. The machine goes on the packing bench in the cashier's aisle, which is the one
  // square metre of this unit that is genuinely back-of-house — and the *sample* goes on the desk
  // where a customer can read what the service produces, because a machine nobody can see is not
  // an advertisement for anything.
  //
  // The spindle is what moves. See the motion block: it strokes 14 mm up and down, which is what
  // an engraver's head does, and it is the only moving part in this shop that is a tool rather
  // than a display.
  let spindle = null, spindleTip = null;
  {
    const ea = 1.08, eb = 3.42;
    A.put(ea, eb, .190, .240, .022, .863, c.trim, { hard: true, gloss: .40 });      // the bed
    A.put(ea - .06, eb, .050, .230, .180, .964, c.trim, { hard: true, gloss: .35 }); // the column
    A.put(ea + .01, eb, .080, .150, .040, 1.052, c.steelD, { hard: true, gloss: .50 }); // the head
    spindle = A.cyl(ea + .03, eb, .996, .014, .072, c.steelD, { gloss: .58 });
    spindleTip = A.cyl(ea + .03, eb, .958, .005, .020, c.brassL, { gloss: .70 });
    A.dynamic(spindle, ea + .03, eb, .996, .18);
    A.dynamic(spindleTip, ea + .03, eb, .958, .18);
    // The vice, with a bangle clamped in it face up, and the offcuts tray.
    A.put(ea + .03, eb, .090, .130, .026, .887, c.steelD, { hard: true, gloss: .52 });
    A.cyl(ea + .03, eb, .906, .046, .012, acc, { gloss: .86 });
    A.put(ea - .04, eb - .16, .080, .070, .020, .884, c.steelD, { hard: true, gloss: .48 });
    A.put(ea - .085, eb, .012, .150, .030, 1.038, C('#3fa070'), { hard: true, mode: 1, glow: .12 });
    // And the sample, on the customer's side of the wrap desk: a small gold plate with four
    // characters cut into it and the price of doing it underneath.
    A.put(2.86, 2.62, .060, .150, .010, .981, c.brass, { hard: true, gloss: .50 });
    A.put(2.86, 2.62, .012, .140, .070, 1.021, c.lacq, { hard: true, gloss: .30, ...MW });
    A.put(2.868, 2.62, .006, .120, .052, 1.023, acc, { hard: true, gloss: .70 });
    A.glyph(2.874, 2.62, 1.026, '平安喜乐', { size: .024, gap: .005, color: c.lacq, mode: 0, glow: 0 });
    A.glyph(2.874, 2.62, .984, '刻字 ¥30/字', { size: .020, gap: .005, color: c.promoR,
      mode: 0, glow: 0 });
  }

  // ---- the shop's clock -------------------------------------------------------------------------
  // Filled by the motion tick below, read by the verbs at the foot of this function. `mins` is the
  // game's minutes-of-day, which moves every time the player does anything at all — so the offered
  // piece can change without this file keeping a counter of its own. Daily prices use the calendar
  // seam above and therefore stay honest for the whole day rather than rolling between questions.
  const clock = { mins: 12 * 60 };
  // A try-on consumes eight game minutes. Using that same slot for both the card and the retained
  // locator guarantees that completing one try-on advances to a different physical silhouette.
  const TRY_SLOT = 8;

  // ---- motion ---------------------------------------------------------------------------------
  // One callback for the whole tenancy, culled by floor and by distance from the middle of the
  // unit, so none of it costs anything from another deck or the far end of the concourse. Absolute
  // seconds in, so both rigs resume at the right phase after being skipped rather than catching up
  // through an accumulator that is not there.
  //
  // Three things move and all three are equipment. Nothing on display moves: a rotating necklace
  // in a case reads as a museum, and the whole argument of this shop is that it is a working
  // counter with people behind it.
  A.motion('service', (t, state, P, minutes) => {
    // The shop's own copy of the clock, read here because the tick is already handed it for
    // nothing. The verbs at the foot of this function are pure getters called at display rate, so
    // everything they say that varies — which metal is quoted first, which box is on the counter —
    // is derived from this number rather than from a clock read of their own.
    if (Number.isFinite(minutes)) clock.mins = minutes;
    // The gauge hoop, 0.55 rad/s. Slow enough to be a turntable and not a fan.
    const q = t * .55;
    for (const r of sizerRings) {
      const th = r.th + q;
      const w = A.at(2.30 + Math.cos(th) * .050, -1.570 + Math.sin(th) * .050);
      r.p.m[12] = w[0]; r.p.m[14] = w[1];
    }
    // The engraving head. A 1.9 Hz stroke with a hard bottom — an engraver dwells at the cut and
    // returns quickly, so the curve is biased rather than a plain sine.
    const s = Math.pow(.5 - .5 * Math.cos(t * 11.9), 1.7) * .014;
    spindle.m[13] = A.y0 + .996 - s;
    spindleTip.m[13] = A.y0 + .958 - s;
    // The bath. A 40-second cycle with the cavitation flutter on top of it, because an ultrasonic
    // tank does not glow steadily and a constant emitter at this size reads as a lamp.
    bathLamp.glow = .10 + .09 * (.5 + .5 * Math.sin(t * .157)) + .02 * Math.sin(t * 9.3);
    const offered = PIECES[Math.floor(clock.mins / TRY_SLOT) % PIECES.length];
    let selectedIndicators = 0;
    for (const p of tryIndicators) {
      const selected = p.mallJewelTryOn === offered.hz;
      if (selected) selectedIndicators++;
      p.alpha = selected ? 1 : .001;
      p.glow = selected ? .20 : 0;
    }
    const pricePoll = Math.floor(t);
    if (pricePoll !== state.pricePoll || clock.mins !== state.priceMinute) {
      priceCalendar.day = priceDay();
      state.pricePoll = pricePoll;
      state.priceMinute = clock.mins;
    }
    const quote = quoteForDay(priceCalendar.day);
    if (quote.day !== state.priceDay) {
      let visibleBars = 0;
      for (const q of priceBars) {
        const visible = q.level <= quote[`${q.key}Bars`];
        q.p.m = visible ? q.rest : PRICE_GONE;
        q.p.mallJewelPrice = quote[q.key];
        if (visible) visibleBars++;
      }
      const direction = quote.direction > 0 ? 'up' : 'down';
      for (const q of priceDirections) q.p.m = q.direction === direction ? q.rest : PRICE_GONE;
      state.priceDay = quote.day;
      state.priceGold = quote.gold;
      state.pricePlatinum = quote.platinum;
      state.priceSilver = quote.silver;
      state.priceDirection = direction;
      state.priceBars = priceBars.length;
      state.priceBarsVisible = visibleBars;
      state.priceDirectionBars = 2;
      state.priceProps = priceBars.length + priceDirections.length;
      state.priceDraws = 1;
    }
    state.hoop = +((q % (Math.PI * 2))).toFixed(2);
    state.engraver = +s.toFixed(4);
    state.tryOn = offered.hz;
    state.tryOnIndicators = selectedIndicators;
  }, { far: 24 });

  // ---- light ------------------------------------------------------------------------------------
  // Three, and all three are aimed at glass. The shell already hangs one at the fascia, the
  // ceiling grid above is its own, and only eight lights reach the shader — so a tenant that
  // declares more than it needs simply pushes the concourse's out of range for no gain.
  //
  // Standing them off the back wall matters as much as the power does: at a = 1.35 this room's
  // centre lamp was one metre from three and a half square metres of slatted timber and the whole
  // shot went orange behind the glass. Out at 1.9 it lights the case fronts instead, which is the
  // surface it is meant to be lighting.
  // The two flank lamps used to stand at a 2.45 and 2.55, which is now inside the islands. A point
  // light buried in a case lights the inside of its own carcass and nothing else in the room.
  A.light(1.74, 0.00, 1.50, [1.00,0.94,0.80], .32, 2.8);   // the aisle, the back run and the tower
  A.light(3.06,-2.20, 1.46, [1.00,0.93,0.79], .26, 2.5);   // the left arm and the left island
  A.light(3.06, 2.20, 1.44, [1.00,0.95,0.84], .26, 2.5);   // the wrap desk and the right island

  // ---- what there is to say --------------------------------------------------------------------
  // Only the words the game has actions for. `inReach` in js/game.js measures from the player to
  // `focus`, not to the label, and `th` puts focus 1.15 m further into the shop than the thing —
  // so every one of these has to have open floor at (a + 1.15, b) after the clamp expands every
  // collider in the room by the player's 0.30. Two of the four below used to fail that: 项链 at
  // (2.20, -2.45) is now inside the left island, and its focus at (3.35, -2.45) is inside the
  // stool that serves the left arm.
  //
  //   珠宝店  focus (4.00, 0.00)   the doorway — this is the browse action, off MALL_GOODS
  //   项链    focus (2.70, 0.00)   the gap between the islands, looking down it at the tower
  //   收银台  focus (3.60, 2.45)   the open end of the wrap desk, opposite the till
  //
  // The first two land on clear floor and are not clamped at all; the third is 16 cm inside the
  // desk's expanded box and the player stops that far short of it, which its 1.8 reach swallows.
  // The second 项链 that used to sit on the left arm is gone: after the islands went in, every
  // focus that pointed at that side of the room either landed inside a case or 60 cm out on the
  // window platform, and a label the player can never satisfy is worse than no label.
  //
  // USE_AT.mall carries 珠宝店 and 收银台 here and the global table carries 项链; a label pointing
  // at a verb that does not exist is a dead prop.
  A.th('珠宝店', 5.15, 0, '这条项链多少钱？','How much is this necklace?','珠宝 jewellery + 店 shop.',2.2,2.5);
  A.th('项链', 1.55, 0.00, '金的还是银的？','Gold or silver?','项 neck + 链 chain.',1.8,1.45);
  A.th('收银台', 2.45, 2.45, '这个多少钱？','How much is this one?',
       '收银 to take payment + 台 counter.',1.8,1.22);

  // ---- two more labels, and the two free standing spots they had to be aimed at ---------------
  // The customer floor in here is nearly all stool. The three stools sit at a 3.12 with a 0.19
  // half-extent, and `clampMove` grows every collider by the player's 0.30 — so they occupy
  // a 2.63..3.61 at b -2.79..-1.81, -1.99..-1.01 and 1.01..1.99, which between them is most of the
  // frontage of both islands. Once the wrap desk's own box (a 1.10..3.86, b 2.29..3.47 expanded)
  // and the shell's window platform (everything past a 3.35 except the 3 m doorway) are taken out,
  // what is left to stand on is exactly three things: the 1.10 m walk-through on the centre line,
  // a 0.46 m pocket at b -1.01..-0.55, and a 0.46 m pocket at b 0.55..1.01, plus a 0.30 m slot at
  // b 1.99..2.29 that the till's own focus already leans on. So both focus points below are put
  // into the two pockets, one each side, 1.64 m apart — which is also what keeps them from
  // shouting over 项链, whose focus is on the centre line between them.
  lab('件', 2.30, 1.665, '这件我可以试戴一下吗？', 'May I try this piece on?',
    '件 is the measure word a shop uses for a piece of jewellery as well as for a garment: ' +
    '一件首饰. A necklace on its own is 一条, a ring 一枚.', 1.7, 1.42, 3.02, 0.82);
  lab('促销', 1.05, -0.95, '今天金价多少钱一克？', 'What is gold a gram today?',
    '促 to urge + 销 to sell — a promotion. 足金 is pure gold, 铂金 platinum, 白银 silver, ' +
    'and all three are sold 一克 at a time off the board.', 2.1, 1.72, 3.05, -0.82);

  // ---- the four the brass plates have been naming all along -----------------------------------
  // 耳环, 手镯, 戒指 and 手表 are set in gold leaf on the island caps at a 2.61 (the loop at
  // js/mall-jewel.js:399), and until now not one of them could be walked up to, because none had a
  // row in js/vocab.js and .thingcheck.js:131 fails a label whose headword has no reading. The rows
  // landed 2026-08-08; these are the labels they were for. MALL-TODO item 19.
  //
  // Focus points go in the walkable pockets this shop's own note above measures — b -1.01..-0.55,
  // b 0.55..1.01 and the 0.30 m slot at b 1.99..2.29 — never at `A.th`'s derived a+1.15, which in a
  // horseshoe puts the player inside an island. Two labels share each of the near pockets; the
  // outer two carry a longer reach because their plate is about 1.3 m along the cap from the pocket
  // the player can actually stand in. Reach is measured plate-to-focus, not eyeballed:
  //   手镯 (2.61,-2.0725) → (3.05,-0.82) = 1.33   耳环 (2.61,-1.2575) → (3.05,-0.82) = 0.62
  //   戒指 (2.61, 1.2575) → (3.02, 0.82) = 0.60   手表 (2.61, 2.0725) → (3.05, 2.14) = 0.45
  const yPlate = yCap + .046;
  lab('手镯', 2.61, -2.0725, '这个手镯是银的吗？', 'Is this bangle silver?',
    '手 hand + 镯 bracelet. A bangle is 一只 — the same measure word as one of a pair.',
    1.5, yPlate, 3.05, -0.82);
  lab('耳环', 2.61, -1.2575, '有没有小一点的耳环？', 'Do you have smaller earrings?',
    '耳 ear + 环 ring. A pair is 一副, because they come two at a time.',
    0.9, yPlate, 3.05, -0.82);
  lab('戒指', 2.61, 1.2575, '这枚戒指多少钱？', 'How much is this ring?',
    '戒指 takes 枚, the measure word for small flat round things — a ring, a coin, a stamp.',
    0.9, yPlate, 3.02, 0.82);
  lab('手表', 2.61, 2.0725, '这块手表防水吗？', 'Is this watch waterproof?',
    '手 hand + 表 gauge. A watch is 一块, the same word as a piece or a lump.',
    0.8, yPlate, 3.05, 2.14);

  // ---- and what Q does ---------------------------------------------------------------------------
  // Rows in `USE_AT.mall`, installed as getters — the pattern js/mall-digital.js:1272 sets out.
  // `USE_AT` is a top-level `const` in js/data.js, which loads long before anybody walks into this
  // building, so by the time a fit-out runs it is a plain global lexical binding a tenant can add
  // to. The guard is for a harness that loads this file on its own.
  //
  // Two limits decided which words are here, and both are worth knowing before adding a third.
  //
  //  * `USE_AT.mall` is ONE table for eighteen shops, so a verb belongs to a *word*, not to a
  //    room. 干净 would have been the right word for the ultrasonic bath and 名字 for the
  //    engraver — but the pet shop already stands a label on 干净 (js/mall-pets.js:1106) and the
  //    flower shop on 名字 (js/mall-flowers.js:979), and a 清洗 action reached through a tank of
  //    goldfish is worse than a word with nothing behind it. Every key below was checked against
  //    every other js/mall-*.js first.
  //  * A tenant cannot add a *dictionary* row, and a thing whose headword has none fails
  //    .thingcheck.js. 耳环, 手镯, 戒指 and 手表 — the four goods this shop's island plates name,
  //    all four in MALL_GOODS — have no row in js/vocab.js, and neither do 指围, 刻字 or 清洗.
  //    So ring sizing, engraving and the ultrasonic bath are built, lit and staffed here and still
  //    have nothing on Q. See the request at the foot of this file.
  //
  // The getters run every frame the walk-up prompt is drawn, so each builds one small object
  // literal off one read of `clock.mins` and touches nothing else.
  const verb = (hz, get) => {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, { configurable: true, enumerable: true, get });
  };
  // A getter is called every frame the walk-up prompt is drawn. Each of these depends on one
  // integer — which slot of the clock we are in — so the literal is built when that integer changes
  // and handed back unchanged the rest of the time. Nothing downstream mutates a def, so returning
  // the same object twice is safe.
  const memo = (per, build) => {
    let at = '', def = null;
    return () => {
      const i = Math.floor(clock.mins / per), key = `${priceCalendar.day}:${i}`;
      if (key !== at) { at = key; def = build(i); }
      return def;
    };
  };

  // What is on the try-on pad, in the order it is laid out: the bangle and the ring on the forearm
  // form, the chain out of its case, the card of earrings standing behind them. Which one the
  // assistant has in her hand depends on when you ask, because they are on a pad rather than in a
  // menu — and each carries the measure word a Chinese counter would actually use for it.
  const PIECES = [
    { hz: '手镯', py: 'shǒuzhuó', en: 'a bangle', mw: '只', price: 1880 },
    { hz: '戒指', py: 'jièzhi', en: 'a ring', mw: '枚', price: 960 },
    { hz: '项链', py: 'xiàngliàn', en: 'a necklace', mw: '条', price: 1450 },
    { hz: '耳环', py: 'ěrhuán', en: 'a pair of earrings', mw: '副', price: 620 },
    { hz: '手表', py: 'shǒubiǎo', en: 'a watch', mw: '块', price: 2400 },
  ];
  // The three metals on the comparison standee. Their descriptive copy is stable; their prices
  // come exclusively from `quoteForDay`, which also fills the retained physical bars above.
  const METALS = [
    { key:'gold', hz: '足金', py: 'zújīn', en: 'pure gold' },
    { key:'platinum', hz: '铂金', py: 'bójīn', en: 'platinum' },
    { key:'silver', hz: '白银', py: 'báiyín', en: 'silver' },
  ];
  const WRAP_PRICE = 20;
  const pick = (arr, per) => arr[Math.floor(clock.mins / per) % arr.length];

  verb('件', memo(TRY_SLOT, () => {
    const p = pick(PIECES, TRY_SLOT);
    return { zh: '试戴一下', py: 'shìdài yíxià', secs: 2.6, mins: 8, gain: { mood: 12 },
      pose: { type: 'reach' },
      en: `try ${p.en} on at the mirror — 一${p.mw}${p.hz} (${p.py}), ¥${p.price}`,
      done: `一${p.mw}${p.hz}，戴上照照镜子。`,
      doneTr: `One ${p.en} — put it on and look in the mirror.` };
  }));
  verb('促销', memo(13, () => {
    // Two things the board answers, and they alternate because they are two different questions:
    // what a gram costs today, and what the same piece costs in the cheaper metal. The second is
    // the comparison the standee at the counter was built for.
    const m = pick(METALS, 13), quote = quoteForDay(priceCalendar.day);
    if (Math.floor(clock.mins / 13) % 2) {
      const g = quote.gold, s = quote.silver;
      return { zh: '比金银', py: 'bǐ jīn yín', secs: 2.4, mins: 6, gain: { mood: 5 },
        pose: { type: 'stand' },
        en: `compare the metals — 足金 ¥${g} a gram against 白银 ¥${s}, about ${Math.round(g / s)} times`,
        done: `金的比银的贵六十多倍，一样的款式。`,
        doneTr: 'Gold is sixty-odd times silver by weight, for the same design.' };
    }
    return { zh: '问金价', py: 'wèn jīnjià', secs: 2.2, mins: 5, gain: { mood: 4 },
      pose: { type: 'talk' },
      en: `ask today's price — ${m.en} (${m.hz} ${m.py}) at ¥${quote[m.key]} a gram`,
      done: `今天${m.hz}${quote[m.key]}块一克。`,
      doneTr: `${m.en} is ${quote[m.key]} kuai a gram today.` };
  }));
  verb('证书', memo(17, () => {
    // Nothing leaves a Chinese gold shop loose, and the ritual is three separate pieces of paper
    // and a box. The wrap is the one part of it that costs anything, so it is the one part that
    // is a choice: the plain box is free and the ribbon is twenty.
    if (Math.floor(clock.mins / 17) % 2)
      return { zh: '包装一下', py: 'bāozhuāng yíxià', secs: 2.8, mins: 7, pay: -WRAP_PRICE,
        gain: { mood: 9 }, pose: { type: 'open' },
        en: `have it boxed and ribboned as a gift — ¥${WRAP_PRICE}, the plain box is free`,
        done: '盒子包好了，丝带给您系上。',
        doneTr: 'Boxed, with the ribbon tied on.' };
    return { zh: '看证书', py: 'kàn zhèngshū', secs: 2.4, mins: 6, gain: {},
      pose: { type: 'reach' },
      en: 'read the assay certificate and the guarantee card that come with the piece',
      done: '鉴定证书和保修卡都在盒子里。',
      doneTr: 'The certificate and the guarantee card both go in the box. ' +
              '鉴定 is assay; 保修 is the guarantee.' };
  }));
};

// =================================================================================================
// The window, one bay at a time. `cb` is the centre of this bay along the frontage — the shell
// calls this once per side with ±2.75 — and `side` is its sign.
//
// What the shell has already built underneath, and what it has not:
//   the platform  a  3.655 .. 4.705, top at y 0.34, 2.2 m of it, in the shell's own warm timber
//   the riser     a  4.71  .. 4.85,  the stone kerb at the pavement line
//   the glazing   a  4.78,  in slim bays with steel mullions, and a spot in the ceiling above
// so everything here stands on 0.34 and stays inboard of about a = 4.66. There is no backdrop:
// without one you look straight past the display into the side of the shop, which is why a real
// window has a panel behind it at about a metre, low enough to see the shopfit over the top.
MallFit['珠宝店:win'] = (W, cb, side) => {
  const wa = 4.18, y = .34;                       // the platform's centre and its top
  const F = frame(W, wa, cb, 'b', 1);             // u along the frontage, v out toward the glass

  // A velvet deck over the shell's timber, and a low lacquer backdrop with a brass capping.
  // 4 mm is the smallest step that does not z-fight, and this one is 14.
  W.put(wa,cb,1.00,2.12,.024,y+.014,c.velN,{hard:true,gloss:.06,...MF});
  W.put(3.76,cb,.09,2.12,1.06,y+.530,c.lacq,{hard:true,gloss:.28,...MW});
  W.put(3.76,cb,.11,2.12,.028,y+1.074,c.brass,{hard:true,gloss:.50});
  W.put(3.815,cb,.014,1.94,.020,y+.760,c.brass,{hard:true,gloss:.58});
  // and a wash down the front of it, which is the only light in the bay below the ceiling spot.
  W.put(3.830,cb,.018,1.80,.022,y+1.010,c.warm,{hard:true,mode:1,glow:.26});

  // Three plinths of three heights, the oldest window trick there is: one tall piece, one at
  // half height and one on the deck reads as a composition, and three of anything at one height
  // reads as a shelf. The tall one carries the same collar the tower inside does.
  const tall = .74, mid = .40;
  for(const [u,h] of [[-.62,mid],[0,tall],[.60,.20]]) {
    W.put(wa,cb+u,.30,.30,h,y+h/2+.012,c.lacq,{hard:true,gloss:.30,...MW});
    W.put(wa,cb+u,.33,.33,.020,y+h+.022,c.brass,{hard:true,gloss:.50});
    W.put(wa,cb+u,.27,.27,.014,y+h+.039,c.velR,{hard:true,gloss:.08,...MF});
  }
  necklace(F, 0, .00, y+tall+.046, acc);
  bangles (F,-.62, .00, y+mid +.046, acc);
  rings   (F, .60,-.02, y+ .20 +.046, acc);
  earrings(F, .60, .12, y+ .20 +.046, c.goldL);
  card(F,-.62,.115,y+mid+.046); card(F,.06,.120,y+tall+.046);
  // Two more groups out at the ends. The deck is 2.12 m long and the three plinths above occupy
  // the middle 1.2 of it, so each end had 45 cm of bare velvet on it — which from the concourse,
  // where this window is the only part of the shop most people ever see, reads as a display that
  // has been half cleared out. Set at a third the tall plinth's height so they stay under the
  // composition rather than competing with it.
  for(const u of [-.98,.98]) {
    W.put(wa,cb+u,.26,.26,.26,y+.142,c.lacq,{hard:true,gloss:.30,...MW});
    W.put(wa,cb+u,.29,.29,.018,y+.281,c.brass,{hard:true,gloss:.50});
    W.put(wa,cb+u,.23,.23,.012,y+.296,c.velR,{hard:true,gloss:.08,...MF});
  }
  watch   (F,-.98,-.01, y+.302, c.goldL);
  earrings(F, .98, .00, y+.302, acc);
  card(F,-.98,.100,y+.302); card(F,.98,.100,y+.302);

  // A small standing price rail at the front edge, and the trade's word on the backdrop in gold,
  // facing the concourse — the one place in this shop a glyph is read from outside the building.
  W.put(4.56,cb,.020,1.70,.014,y+.034,c.brass,{hard:true,gloss:.58});
  W.put(3.822,cb+side*.62,.012,.52,.070,y+.880,acc,{hard:true,mode:1,glow:.08});
  // The promotion goes on the other half of this backdrop, but it is built from the fit-out and
  // not from here — see 窗贴 below. The api the shell hands a window is the short one (js/mall.js,
  // `winApi`): at, dim, put, y0, cyl, ball, taper, cap and mannequin, and no `glyph` at all. That
  // is why the trade's word above is a gold bar and not the characters it looks like it should
  // be. The fit's api draws in the same (a, b) as this one and does carry glyphs, so anything in
  // this window with writing on it has to be drawn from over there.
};

// =================================================================================================
// Who is in here. Pushed onto MallCast (js/mall.js) rather than into the NPCS call in js/game.js,
// for the reason set out at that declaration: eighteen tenants editing one argument list is
// eighteen chances to take the whole game down while improving one shop.
//
// ---- coordinates. These are the mall's, not this file's. Everything above is written in (a, b)
// with a measured inward from the outside wall and b along the frontage; the roster wants world
// (x, z). This unit is shop('W', -12.6, 8.0) and the W frame in js/mall.js is
// base [-RX,0] with n [1,0], t [0,1] — so for this shop and only this shop:
//
//     x = a - 23        z = b - 12.6
//
// ---- facing. `face` is a yaw whose direction is (sin, cos), so 0 looks along +z, Math.PI/2 along
// +x and -Math.PI/2 along -x. Here that makes +a (out towards the concourse) Math.PI/2, the back
// wall -Math.PI/2, and the two partitions 0 and Math.PI. Turning a member of staff the wrong way
// round puts her facing the mirror on the back of her own counter.
//
// ---- where a person may stand. `clampMove` in js/build.js expands every collider by the walker's
// radius — 0.28 for these, 0.30 for the player — and pushes anything inside the result out to the
// nearest face, on the frame after it is placed. So a spot is not "not inside a case", it is
// "outside every case grown by 28 cm", and the three staff spots below sit in the two aisles the
// plan was widened to hold them: the 72 cm serving aisle at a 1.34–2.06 and the 73 cm cashier's
// aisle at b 3.17–3.90. Each has about 80 mm of daylight round the body. Anything tighter and the
// clamp slides them out through the front of a counter on the first frame of the first render.
MallCast.push(
  // Two behind the islands, which is where the staff of every jeweller in every mall in China
  // stand: inside the horseshoe, facing the door, with the stock locked between them and you.
  // From the shopfront their heads and shoulders clear the case caps at 1.36 and nothing else of
  // them shows, which is the correct amount of a shop assistant to be able to see.
  { hz:'售货员', name:'陈美琪', py:'Chén Měiqí', place:'mall', mallFloor:1,
    rig:'mall-jewelry-sales-chen-meiqi', temper:'genial',
    look:{skin:'#e8bb92',hair:'#241d1a',hairStyle:'bun',top:'#f2ead9',pants:'#2f333a',
      shoe:'#26292e',vest:'#7d1f2b',collar:'shirt',scarf:'#d8ad48',tall:.96,faceSeed:4821},
    spots:[{h0:10,h1:22,at:[-21.30,-14.22],face:Math.PI/2,act:'vend'}],
    lines:[['这条项链是足金的，您可以试戴。','This necklace is solid gold — you are welcome to try it on.'],
           ['手镯和耳环都在这个柜台里。','The bangles and the earrings are both in this counter.'],
           ['买满两千送保养卡。','Spend two thousand and the care card comes free.']] },
  { hz:'导购员', name:'高志远', py:'Gāo Zhìyuǎn', place:'mall', mallFloor:1,
    rig:'mall-jewelry-guide-gao-zhiyuan', temper:'brisk',
    look:{skin:'#d2a077',hair:'#1f1b18',hairStyle:'short',top:'#efe6d4',pants:'#2c3038',
      shoe:'#23262b',jacket:'#3a2f3c',collar:'shirt',tall:1.06,faceSeed:4822},
    spots:[{h0:10,h1:22,at:[-21.30,-11.02],face:Math.PI/2,act:'vend'}],
    lines:[['戒指和手表都在这边，您慢慢看。','The rings and the watches are over here — take your time.'],
           ['中间那个柜子里的是店里最贵的。','The piece in the middle case is the most expensive in the shop.'],
           ['这块表可以刻字，三天就好。','We can engrave this watch — three days.']] },
  // The cashier, in the aisle behind the wrap desk. The till moved to the door end of that desk so
  // that she and the customer paying at it are on opposite sides of the same 90 cm of quartz.
  { hz:'收银员', name:'王丽娟', py:'Wáng Lìjuān', place:'mall', mallFloor:1,
    rig:'mall-jewelry-cashier-wang-lijuan', temper:'patient',
    look:{skin:'#f0c39d',hair:'#2b221e',hairStyle:'bob',top:'#f2ead9',pants:'#33373f',
      shoe:'#2a2d32',vest:'#7d1f2b',collar:'shirt',tall:.99,faceSeed:4823},
    spots:[{h0:10,h1:22,at:[-20.10,-9.07],face:Math.PI,act:'vend'}],
    lines:[['一共八百九十块，扫码还是刷卡？','Eight hundred and ninety altogether — scan or card?'],
           ['要开发票吗？','Would you like a receipt?'],
           ['我给您包起来，盒子和证书都在里面。','I will wrap it for you — box and certificate inside.']] },

  // The customers. Two of them stand still, because a shop where everybody is walking reads as a
  // corridor: one at the counter being served, one out in the middle of the floor looking down the
  // gap between the islands at the tower, which is the sight line the whole plan is set out on.
  // Neither is given a name or a line — the file's own convention for anonymous shoppers, and the
  // same one js/game.js uses for the crowd on the benches.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
    look:{skin:'#dbb086',hair:'#2a2320',hairStyle:'ponytail',top:'#8b6f86',pants:'#3d4652',
      shoe:'#e7e0d3',bag:'shoulder',bagColor:'#5a4636',tall:1.00,faceSeed:4824},
    spots:[{h0:10,h1:22,at:[-19.95,-10.38],face:0,act:'buy'}] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'steady',
    look:{skin:'#c99a70',hair:'#312722',hairStyle:'short',top:'#5f7386',pants:'#343b44',
      shoe:'#272c30',jacket:'#46586a',tall:1.07,faceSeed:4825},
    spots:[{h0:10,h1:22,at:[-20.38,-12.14],face:-Math.PI/2,act:'wait'}] },
  // And one who actually comes in and goes out again. The route enters through the 3 m opening —
  // the glazing's collider covers a 4.45–4.95 everywhere except |b| < 1.5, so the doorway legs are
  // all on b = 0 — walks the customer floor in front of both islands, turns into the gap to look
  // at the tower, and leaves along the concourse in front of the window.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
    look:{skin:'#eec39a',hair:'#231e1b',hairStyle:'bob',top:'#c4a05f',pants:'#414855',
      shoe:'#eae3d6',bag:'tote',bagColor:'#8f5f4a',tall:.97,faceSeed:4826},
    patrol:[[-18.35,-12.60],[-19.65,-12.60],[-19.75,-13.55],[-20.50,-12.85],[-19.70,-11.75],
            [-18.35,-12.60],[-17.20,-13.90],[-17.05,-11.10],[-18.35,-12.60]], speed:.94 },
);

// =================================================================================================
// REQUESTS · what this shop still needs from a file it does not own
//
// Three fixtures in here are built, lit, staffed and completely dead on Q, and all three are dead
// for the same reason: a `thing` whose headword has no row in js/vocab.js fails .thingcheck.js, and
// js/vocab.js is not this file's to edit. Nothing below is a code change to this file; each is one
// line of dictionary and one row of USE_AT.mall (which this file could then install itself, so only
// the dictionary line is strictly needed).
//
//   量指围 · the ring sizer on the left island's cap, a 2.30, b -1.665. Wants 指围|zhǐwéi|ring size
//     (finger circumference). A ring is sold by 号 here, 12号 to 18号, derived from the millimetres
//     round the finger — the same "the number is arithmetic" lesson the shoe shop teaches with
//     鞋码. 号码 would have done and is already the shoe shop's.
//   刻字 · the engraver on the packing bench, a 1.08, b 3.42, with its sample plate on the customer
//     edge at a 2.86. Wants 刻字|kèzì|to engrave. 名字 would have done and is already the flower
//     shop's, on the gift card at js/mall-flowers.js:979.
//   清洗 · the ultrasonic bath on the wrap desk, a 2.66, b 3.02, with the repair rail behind it.
//     Wants 清洗|qīngxǐ|to clean. 干净 would have done and is already the pet shop's, on the tank
//     at js/mall-pets.js:1106.
//
// And the four goods the island plates name. All four are in MALL_GOODS['珠宝店'] and none is in
// js/vocab.js, so the counter says 手镯 · 耳环 · 戒指 · 手表 in gold leaf on four brass plates and
// not one of them can be a label:
//
//   耳环|ěrhuán|earrings          手镯|shǒuzhuó|bangle, bracelet
//   戒指|jièzhi|ring              手表|shǒubiǎo|watch
//
// Until they exist the try-on label 件 stands in for all four: it names whichever piece is on the
// pad, with the measure word that goes with it, so the words are at least *said*. It is not the
// same as being able to walk up to the ring case and press Q on 戒指.
}
