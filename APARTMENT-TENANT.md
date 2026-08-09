# APARTMENT-TENANT.md — the brief for one floor of 十八号楼

**Read this instead of a sibling module.** The tower is 22 `js/home-*.js` files at 1,100–2,100 lines
each and almost all of that is one room's own millwork. The whole contract — registration, the
coordinate frame, the toolkit, colliders, culling and vocabulary — is on this page. Open a sibling
only for a worked example of something named here.

Companion docs: `APARTMENT.md` is the coordinate contract and the acceptance section.
`TOWER.md` is the file-ownership map. `TOWER-STATE.md` is what has already landed.
`ART.md` is the material kit every surface is built against. **Read `ART.md` before any visual work.**

---

## 1. The registration seam

A floor is a function on one global object, exactly as a mall tenant is a `MallFit` entry:

```js
FlatFit['bath'] = A => { … };            // js/home-bath.js:6
FlatFit['f7']   = A => { … };            // js/home-f7.js
```

`FlatFit` is declared at `js/world.js:78`, outside the IIFE, so a module's top-level assignment is
all the wiring there is. There is no registry call, no manifest, no `index.html` order to respect —
except that the file must be in `index.html`'s script list to run at all.

**The key decides the deck**, through `DECK_OF` (`js/world.js:1031`):

```js
const DECK_OF = { lobby: 0, lift: 0, corridor: 2 };
for (let n = 3; n <= FLOORS - 1; n++) DECK_OF['f' + n] = n;
DECK_OF.roof = FLOORS;
```

Every key not in that map builds on **deck 2 — your living room**. A new floor with a key `DECK_OF`
does not know about does not fail; it silently lands on top of the flat. `f3`..`f11` are generated,
so `FlatFit['f6']` needs no edit. Anything else does, and `js/world.js` is contended — queue it.

## 2. Build order, and why `walls` is last

`js/world.js:1156-1157`:

```js
const order = Object.keys(FlatFit).filter(k => k !== 'walls');
if (FlatFit.walls) order.push('walls');
```

Every key runs first, in script order; `walls` runs last, deliberately and explicitly rather than by
relying on `index.html`'s tag order. `js/home-walls.js` lays the flat's partitions between the rooms
**as they were actually built** — it reads `roomBoxes`, the measured x/z extents of each room's
props, which do not exist until every other builder has run.

Two consequences a new agent gets wrong:

- **No room file builds a partition.** If your room needs a wall between it and its neighbour, it is
  `js/home-walls.js`'s wall. A wall placed by fiat goes through somebody's bed — that is how the
  主卧 ended up in the lobby.
- **Real extents, not centres.** `roomBoxes` is the AABB of every prop the room made, summing the
  absolute row terms of each matrix, so it is correct for rotated props. Centres were tried and are
  not good enough: the 主卧's southernmost prop centre and the 次卧's northernmost are 0.07 m apart,
  which says nothing about whether a 0.10 m partition between them clears a wardrobe.

A builder that throws is caught and logged (`console.error('FlatFit ' + k + …)`), not rethrown — so
**a room that crashes half way through renders half built and boots clean.** `.bootcheck.js` reads
`errors:[]`, which is what catches this. Never take a clean render as proof your builder finished.

## 3. The coordinate frame

Your builder receives one object, `A`. Everything on it is **world y**, not floor-relative.

- `A.y0` — the y of the deck you are being built for. Add your own heights to it: `A.y0 + 0.75`.
- `A.deck` — which deck that is. Both are getters over `curDeck`; do not cache them.
- `A.DECK` — the 13-entry array. `A.STOREY` 3.10, `A.FLOORS` 12.
- `A.LOBBY`, `A.CORR`, `A.FLAT`, `A.LIFT`, `A.LIFT_B` — the room boxes, from `APARTMENT.md`.
- `A.CAR` — the lift car's inside faces, for `js/home-lift.js`. Derived, never re-measured: that
  file had drifted 0.35 m in z, 0.07 in y and 0.20 in door width by being written in literals.
- `A.frontDoor` — flat 202's opening. `top` is already in world y.

x and z are **shared by all twelve storeys**. Deck 7 and deck 2 occupy the same footprint; only y
and the deck stamp tell them apart. This is the single fact behind sections 4 and 5.

## 4. The two calls that decide whether a floor exists at all

```js
A.zone({ id, x0, x1, z0, z1, light, ceil, near });   // js/world.js:1108 — REQUIRED
A.deckH(h);                                          // js/world.js:1103 — required above deck 2
```

**`A.zone` is not optional.** `clampMove` keeps the body inside the union of a deck's zones, so a
floor with no zone is a floor you cannot stand on and `setFloor` refuses it. `id` is what `roomAt`
hands back, which is also what names the room's lamp. Both default to the deck being built.

**`A.deckH` is effectively required above deck 2.** It sets the room-box height `R.setRoom` uses on
that deck; omit it and the shader is handed deck 2's room box and **the floor renders flat grey.**
This has looked like a missing-texture bug and been debugged as one more than once.

## 5. Deck stamping — the cull, and how to opt out

`hiddenProp` in `js/game.js` culls on **x and z only**. Twelve floors share one footprint, so before
deck stamping every deck's geometry was drawn on every other deck: measured from deck 10, **822
props belonging to that floor and 15,136 belonging to other floors in the same draw list**, none of
them translucent — a pale second building smeared through the one you are standing in, at twelve
times the geometry per frame.

`js/world.js:1187-1190` therefore stamps `prop.deck` and `thing.deck` on everything your builder
made, after it returns. It is automatic. Three values, and only three:

| `deck` | meaning | how you get it |
|---|---|---|
| your deck number | culled on every other floor | the default — do nothing |
| `-1` | **never cull.** For anything handed to `A.rides()`, which travels with the car past decks it does not belong to | set it yourself before returning |
| `undefined` | never cull. The shell's own envelope, which is everybody's | shell only — not yours |

**Do not leave a floor prop unstamped to "make sure it shows".** That is the 15,136-prop bug, one
prop at a time. If a prop is genuinely everywhere, it belongs to the shell, and the shell is
`js/world.js`.

`inReach` and `hiddenProp` both respect the stamp, so a correctly stamped interactable on deck 9 is
neither drawn nor pickable from deck 2. An interactable that is reachable from the wrong floor is
almost always an unstamped `thing`.

## 6. Where a floor may add colliders

```js
A.stop(x0, x1, z0, z1, f);   // per-deck collider; f defaults to the deck being built
```

That is the only one. **Do not call `solid()` or `blocker()` from a floor module** — they are
`build.js`'s scene-global calls with no deck, so a pillar you stop on deck 8 stops the body on all
twelve. Engine facts that still apply inside `A.stop`:

- `clampMove(px, pz, x, z, r)` returns an **array `[x, z]`**, and is a *destination* clamp, not a
  swept test. Max real step is 0.1434 m, so a collider thinner than that is passable whenever the
  frame rate sags. Standard partitions here are 0.14–0.16 m — the margin is millimetres.
- A collider stops the **body**. The chase camera is a separate concern, and every surface in this
  renderer is single-sided, so a wall the camera can pass shows the player its unlit back.
- **Never place a wall, door or gap by eye.** Flood-fill it: `node .flatcheck.js`,
  `node .towercheck.js`. Note that flood fill *understates* — a room packed tight enough that no
  cell has four open neighbours reads as blocked, so "0 stranded" means something only beside
  "every registered room has measurable reachable area."

## 7. The shell, and what it does *not* give you

`buildShafts` runs over **`SHAFT_DECKS`** (`js/world.js:229-230`) — deck 0 and decks 2..12 — so every
deck gets a shaft enclosure, a landing, doors, a call panel and a floor indicator. `STAIR_DECKS`
(`js/world.js:235`) is a copy of it, and the stairwell deliberately has **no walkable zone**: both
fire doors never open, and a zone behind a shut leaf is either dead props or a bug.

`A.shellLanding` is `true`. Ten floor files built a stand-in landing while it was false and each is
gated on the flag; a new floor should stand down rather than double-build.

> **Known stale — do not build to it.** `js/home-f3.js:10-12` still tells the reader that
> `buildShell` and `buildShafts` run "for decks 0 and 2 only". That was the claim ten floor files
> were written around; `TOWER-STATE.md` records it as fixed and `SHAFT_DECKS` is the proof. The
> comment was never updated. If a sibling module's header contradicts this page, **trust the code**.

## 8. Registering an interactable — and the alias trap

`A.th(hz, x, y, z, …)` registers a touchable thing. Most floor modules wrap it:

```js
const TH = (hz, x, y, z, ...) => A.th(hz, x, A.y0 + y, z, ...);   // js/home-f7.js:167, ×11 siblings
```

**That wrapper made 432 of the tower's 548 registration call sites invisible to `.dictcheck.js`.**
The scan matched `th(` / `A.th(` / `thing(` case-sensitively and missed `TH(`, so for as long as the
check existed it read about a fifth of the building and reported the result as if it were the whole.
Seven real registrations — 地漏 灰尘 平面图 档案 意见箱 借书 棋牌 — were never once checked, and the
undercount it produced (17 missing headwords rather than 24) is the number a whole wave planned
against. A harness that silently sees less than it claims is worse than one that fails loudly,
because its clean output gets quoted into plans.

`.dictcheck.js` now matches `th|TH|thing|Thing`, optionally `A.`-qualified, **and** flags any
identifier called in bulk with a Chinese string as its first argument, with an explicit
`NOT_REGISTRATIONS` allow-list. Two rules follow:

1. **If you alias `A.th`, alias it to a name the scan knows** — `th` or `TH`. A third spelling is a
   new blind spot, and it will pass silently.
2. **Every headword needs a `js/vocab.js` row.** `js/vocab.js` is contended: queue the row, do not
   edit it. Run `node .dictcheck.js --home` — pure node, ~2 s, no render slot.

Tags are interaction wiring, not labels: `hiddenProp` judges a tagged prop by the centre of its
whole `tagBox` group, and `tagBox` is **scene-wide across all twelve storeys**. Four neighbour flats
writing `tag: '照片'` put the group centre in the wrong place and left five frames hanging in mid-air
after a cutaway. **Make a tag local** — `tag: '客厅照片'` (`js/home-living.js:537`).

## 9. Frame budget

23,729 props across the tower, at **med 21.1 ms / p95 27.7 ms** against a 16.67 ms target, GPU-bound.
**This building does not meet the 60 fps rule today.** Your floor is not the place to spend more.

- **LOD-gate anything repeated** — shelf stock, seats, display rows, railings. `js/street.js`
  publishes `FACADE_LOD = 3`: bays above the third storey drop their railings, laundry and AC boxes.
- **Figures are the most expensive thing in any room.** A visible queue is 3–5 people, not everyone.
- **Nothing per-frame that can be per-second**, and **nothing ticking when the player is elsewhere.**
  A loop left running on deck 9 costs the same as one in front of you.
- **UI is cheaper than geometry.** Notices, lists, excerpts and previews belong in the card.
- Report prop count **before and after, per floor**, so one offender stays visible.
- Measure with `node .fpscheck.js`. Read **`ms` and `p95Ms`**, never `fps`; read `gpuP95Ms` and
  `cpuP95Ms` separately before blaming geometry. `hotelLift` is the control at 3.0 / 5.0 ms quiet —
  a lift reading above ~13 ms proves the sample is contended whatever else it says.

## 10. Before you report

| command | proves | cost |
|---|---|---|
| `node --check js/home-<yours>.js` | **after every edit**, not once at the end | seconds |
| `node .dictcheck.js --home` | every headword teaches a word | pure node |
| `node .bootcheck.js` | `bootOverlay:false, fails:[], errors:[]` — catches the caught-and-logged builder crash | ~300 s |
| `node .flatcheck.js` | flood-fills flat 202; the only thing that catches a leaf hung across its own opening | gate |
| `node .towercheck.js` | every deck 0 and 2..12 has floor, ceiling, shell and a reachable landing | gate, ~110 s |
| `AUDIT_PORT=<unique> node .audit.js APT-F` | renders it. **Open the PNGs** | gate |

Anything that launches headless Chrome takes the 3-slot semaphore first — including a one-off
harness you wrote yourself. An ungated browser does not slow other agents down, it **invalidates
their measurements**.

```js
const GATE = require('/Users/jonahcollins/Desktop/Chinesegame/.render-gate.js');
await GATE.acquire('what I am doing');
try { /* … */ } finally { GATE.release(); }
```

**A render proves nothing about walkability.** A fixture can look perfectly placed in a shot and be
unreachable. Only the flood fills answer that.

## 11. Standing rules that outrank anything above

1. **60 fps or above, in every location.** A room that looks better and drops frames is a regression.
2. **No real brand names or logos, ever.** Invented Chinese names only, placeholders included.
3. **There is no git and no rollback.** Copy a file to the scratchpad before any bulk edit, and
   dry-run every scripted replace against a counted expectation before writing.
4. **One file, one writer.** `js/game.js` and `js/vocab.js` are contended by the whole game — report
   the request, do not make the change.
5. **Never leave a file unparseable, even for one edit.** The page is served live.

## Two traps that make a render lie

**A screenshot can be of a game that never started.** `window.__game` is published *before* the
title card is dismissed, so a harness that waits on it, calls `setPlace('home')` and captures will
return clean, plausible PNGs of the title screen — `setPlace` silently no-ops and `World.level()`
reads **−1**. This cost a lane five frames it briefly believed. **Press `#start` first**, the way
`.bootcheck.js:196` does, and assert `World.level()` is the deck you asked for before you trust a
single pixel.

**`camNear` and `nocut` are a pair, and one without the other deletes the floor.** Declaring camera
rooms (`js/home-walls.js:570-576` sets `camNear`) is the exact trigger `js/game.js:2100-2113`
documents for the hotel: once a floor has camera rooms, `hiddenAt` judges every prop by a single
point, and a floor slab or ceiling judged by its centre is culled from any room that does not
straddle it. `js/world.js` set `nocut` **zero times**, so nine of flat 202's ten rooms deleted the
whole floor when the eye stepped outside a wall. **Any location that adds camera rooms must set
`nocut: true` on its floor, ceilings and shell in the same change.**

## A harness sweep is not a look

Verified 2026-08-09, on the live site: the cutaway failure the owner reported was **still present in
production** after two rounds of fixes that every local sweep called clean. Standing in the 玄关 and
dragging the camera twice put 70% of the screen behind blank plaster with the player hidden, and
world labels — 热水壶, 茶, 钥匙, 鞋柜 — rendered *on top of* that wall, for objects on its far side.

The reason no harness caught it: **a sweep parks the camera where the author expected it to be.**
The 书房 orbit test passed honestly; the corridor/entry seam was never in any shot list. A camera
bug lives in the angles nobody thought to write down, which is exactly the set a scripted sweep
cannot contain.

So: harnesses prove the things they assert, and nothing else. When the question is *how it looks*,
walk it on `https://jcollin45.github.io/beijing-life/` — push, wait about a minute for the build,
then drag the camera around like a player would. Name the origin in any claim you make.
