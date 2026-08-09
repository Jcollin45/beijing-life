# Writing a mall tenant

Read this instead of reading another tenant module. Every `js/mall-*.js` file is 40–75 KB and most
of that is one shop's own millwork; the contract underneath is on this page. Read a sibling module
only when you need a worked example of something specific this page names.

## The registration

```js
MallFit['书店'] = A => { /* fit the unit out */ };     // keyed by shop KIND, not shop name
```

The shell calls it once when the unit is built, passing `A` — the tenant api below. Registration
happens at load time; the shell asserts all 18 expected kinds are present and complains loudly if
one is missing rather than silently falling back (js/mall.js, `tenantMissing`).

Two sibling keys, same object, colon-separated so they can never collide with a shop kind:

| key | meaning |
|---|---|
| `MallFit['<kind>']` | the fit-out. A function. |
| `MallFit['<kind>:glass']` | shopfront glass override — `{glassAlpha, glassGloss}` |
| `MallFit['<kind>:win']` | window display. A function to dress it, or **`false`** to leave it bare. |

`:win` has three states and the third is the point: register nothing and the shell dresses the
window from its generic `WINGOODS` (which is why a jeweller's window used to have face cream in
it); register a function and you dress it; register `false` and the shell keeps out.

## The frame

Everything you draw is in the **shop's own frame**, not world space. `a` is across the unit, `b` is
depth into it from the shopfront, `y` is height from your own deck. The shell rotates and places
it. Never write world coordinates in a tenant file.

Three shared heights hold the row of shops together as one architect's work: **0.15 plinth,
0.90 working top, 2.20 top of joinery**, with a matte black trim line.

## The api

```
at(a,b) → [x,z]     dim  put  rect  th  y0  yaw  tag  acc  f  len
stop(a0,a1,b0,b1)   body collider          block(rect)  same from a rect
cyl(a,b,y,r,h,c,o)  ball(a,b,y,rx,ry,rz,c,o)  cap(...)  taper(...)
table(a,b,seats,r)  places a table AND its collider
glyph(a,b,y,text,opt)   opt.back flips it to face out of the shop
light(a,b,y,c,power,radius)
rail(a,b,len,cs,tag,y)  island(a,b,w,dp,fill)  counter(a,b,w,dp,c,till)
motion(name,fn,opt)     dynamic(p,a,b,y,r)
```

`counter(...)` with `till=true` makes the shop's **first** counter its till — that is where an item
in your hands becomes yours. One per shop; the api tracks `A.hasTill`.

`rail`, `island`, `counter` are the shared millwork. Use them. Eighteen shops built from the same
four pieces is what makes the row read as one building instead of eighteen sketches.

## Motion

```js
const state = A.motion('spinner', (t, state, player, minutes, night) => { … }, { far: 24 });
```

- `t` is **absolute seconds**, so a machine that was culled resumes at the right phase. There is no
  per-frame accumulator to catch up — do not add one.
- Culled twice: by floor, then by distance from the middle of the unit (`far`, default 24 m).
  `{always:true}` opts out — needs a reason.
- A primitive that *moves* must be marked with `A.dynamic(p,a,b,y,r)` before `Build.finish` packs
  its cull sphere, or it will be culled against a sphere it has left.
- A glow/alpha/colour animation whose transform never moves does **not** need `dynamic` but does
  need to opt out of the retained static instance record — see the note beside `api.motion`.

## Interaction

`thing(...)` makes something interactable and `tag` wires the card. **A tag is interaction wiring,
not a label** — renaming one silently kills that object's card. Anything the player can pick up,
try on, order or buy needs pinyin and an English gloss in the house format.

## The rules that get broken

- **Frame budget.** The mall measured ~35,650 props on 2026-08-08; the 4,976 in BIG-UPDATES.md is ~7x stale.
  +60 props per shop is still the ceiling — it is a delta, so the stale baseline does not excuse it. LOD-gate anything repeated; UI in the interaction card is free, geometry is not.
- **No real brand names.** Ever, in either language, including on packaging and screens. Invented
  Chinese names only. House style: `一间咖啡`, `云裳美妆`, `墨香书店`, `四季花坊` — evocative
  two-or-three characters, then the category.
- **Figures are the most expensive thing you can add.** A visible queue is 3–5 people. Animals are
  skinned rigs too.

The engine traps that bite hardest here — `hard:true` is not collision, `A.cyl` versus `capsule`,
`clampMove` returning an array, single-sided surfaces — are in `.claude/agents/coder.md` and are
not repeated on this page. You have already read them.
