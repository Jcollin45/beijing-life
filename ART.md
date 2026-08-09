# 美术方向 · Art Direction

The one visual language every room is built against. Written 2026-08-07, at the point where the
individual assets were better than the combined picture.

## The target, stated precisely

**Sims 3 *staging*, rendered with the engine we actually have.**

Semi-realistic and domestic: believable proportions, textured everyday surfaces, muted interior
palette, furniture that reads instantly at orbit distance, wall cutaway so a room is legible from
outside it. Selective red/jade/gold accents, never a red room.

Two things that follow from "staging, not fidelity":

- **We are not copying Sims 3's renderer.** It is a 2009 DX9 forward renderer with diffuse/specular
  materials. `gl.js` already does packed occlusion/roughness/metal, normal maps, a dedicated light
  buffer so only real lights bloom, and depth-based corner darkening. Aiming at 2009 would aim
  *below* the engine.
- **We are not copying its faults.** Sims 3 is washed out and low-contrast because it spent its
  budget on a seamless open world. "Interiors wash toward white" is the fault we are fixing, and it
  is a Sims 3 characteristic. Contrast and grounding are targets, not side effects.

**Not** the Overwatch/PvZ shape language (considered and rejected — it would invalidate the 82
realistic rigs and the character brief). **Not** photoreal. The frozen character direction in
`art/character-concepts/CHARACTER-DESIGN-BRIEF.md` stands as written and is compatible with this.

## Surfaces: the material kit

The eleven tiling materials registered in `js/assets.js` (`MATERIALS`) are read triplanar in world
space, so primitives need no UVs. The call shape, proven in `js/market.js`:

```js
const FLOOR = { mat: 'tile', matScale: .78, matAmt: .30 };
const STEEL = { mat: 'steel', matScale: .55, matAmt: .28, nrmAmt: .55 };
// …and on a prop: { mat:'concrete', matScale:2.9, matAmt:.15, gloss:.13 }
```

- `matScale` — **metres per repeat**, not per feature. `Tiles141` carries a 6×6 grid inside one
  repeat, so a 30 cm domestic tile wants `matScale: 1.8`, not `0.3`. Get this wrong and a bathroom
  reads as mosaic or as a single slab.
- `matAmt` — how far the colour map may move the surface. **Detail, not lift.** If a wall gets
  *brighter* rather than textured, `matAmt` is too high for that albedo.
- `nrmAmt` — the height. On `plaster`, which is nearly uniform in colour, this is the channel that
  does the work; colour barely matters.

### Starting values — verify and tune, do not trust

Domestic interior. These are starting points derived from `market.js`'s measured values, not
finished numbers. Render your own view and tune; record what you changed and why.

| Surface | mat | matScale | matAmt | also |
|---|---|---|---|---|
| Bathroom / kitchen floor + splashback | `tile` | 1.8 | .28 | `gloss: .16` |
| Living / bedroom floor (board) | `wood` | 1.2 | .32 | `gloss: .12` |
| Painted interior wall | `plaster` | 2.4 | .26 | `nrmAmt: .55` |
| Ceiling | `plaster` | 2.4 | .18 | flatter than walls |
| Upholstery, bedding, curtains | `fabric` | .50 | .28 | `nrmAmt: .30` |
| Cabinet / wardrobe / table carcass | `wood` | .9 | .30 | `gloss: .14` |
| Appliance, fitting, handle, frame | `metal` | .55 | .26 | `nrmAmt: .50` |
| Balcony, utility, unfinished | `concrete` | 2.9 | .15 | `gloss: .13` |

**`uMatMean` is global.** It is the measured linear mean that keeps a texture adding detail rather
than lifting value, and changing it re-tunes every textured surface in the game. Two agents have
already independently mistaken it for a per-room knob. Do not touch it.

### Value range comes first, and a material cannot fix it

Measured 2026-08-07 on `14-kitchen`, before and after a correct 7-material pass: **the change was
close to invisible.** Not because the values were wrong — because the room sits at 85–95% luminance
on every surface. Texture needs headroom to be seen in; against white it is crushed.

The order that follows from this:

1. **Base albedo and key light first.** No interior surface should sit above ~80% luminance except
   an actual light fitting or a specular hit. A white-painted wall is 0.72–0.78, not 0.95.
2. **Contact shadow second.** Grounding reads at any distance; texture does not.
3. **Material third**, into the headroom the first two created.

**Do not raise `matAmt` to make a texture visible in a washed-out room.** That is the "brighter
rather than textured" failure, and it produces a muddy surface *and* a brighter room. If your
material is applied at the values in the table above and you cannot see it, the fault is the value
range, which is a lighting and base-colour problem — not yours to fix from a room file. Apply the
material correctly, say in your report that it does not read yet and why, and stop.

## Ownership — who applies what

The failure this section exists to prevent is recorded at the top of `js/home-walls.js`: ten agents
were each given a room's contents, the shell owner was given the envelope, and **nobody owned what
goes between them**. Rooms undefined, furniture reading as sprawled, pictures hanging in mid-air —
one fault, three symptoms.

| Surface class | Owner |
|---|---|
| Building outer walls, corridor wall, lift shaft | `buildShell` in `js/world.js` |
| Flat interior partitions, **skirting, door reveals, window reveals** | `js/home-walls.js` |
| Floor and ceiling of a room | that room's own file |
| Furniture, fixtures, appliances, soft goods | that room's own file |
| Anything a room shares with the room next door | `js/home-walls.js`, not either room |

If you are unsure whether a surface is yours, it is the shell's. Say so and stop; do not texture it
speculatively.

### The hotel has the same table, with its own names

京华大酒店 (`js/hotel.js` + thirteen floor modules) is the largest building in the game and runs the
same ownership rule under different labels. Its material kit is **not** a second art direction: it is
a fixed `A.col` palette handed to every floor builder, so the whole tower is one architect's work.

| Surface class | Owner |
|---|---|
| Floor plate, perimeter walls, ceiling, cove lighting | the shell, `js/hotel.js`. Flagged `nocut`. |
| Lift bank, service-lift portal, fire-stair vestibule, floor directory | the shell |
| Interior partitions, door openings, jambs, heads, reveals | that floor's `js/hotel-f<n>.js` |
| Furniture, fixtures, soft goods, signage inside a room | that floor's fit-out module |

Four fields per floor vary — `accent`, `wall`, `floor`, `dark`, from `HOTEL_FLOORS`
(`js/hotel.js:24-77`). Everything else in `A.col` is **shared across all thirteen floors and must not
be re-tinted**: `wallD ceiling stoneL bronze bronzeD bronzeL walnut walnutL lacquer celadon jade ink
glass glassD warm white steel red green water carpet`. Use `A.C('#rrggbb')` only for something
genuinely local to one room.

The register is contemporary Chinese luxury: warm limestone, dark walnut, restrained lacquer red,
aged bronze, celadon, silk, ink-wash art, ginkgo and lattice geometry — avoiding both anonymous
international-hotel beige and theme-park pastiche. The full brief is `HOTEL.md`; the per-floor
contract, including the reserved collider footprints, is `HOTEL-TENANT.md`. Read one of those rather
than opening a 15–55 KB floor module.

### 高层公寓 — measured material baseline, 2026-08-08

The contract is `APARTMENT.md` (coordinates, room owners, how to verify) and the per-floor brief is
`APARTMENT-TENANT.md`, which is what a floor agent reads instead of a 2,000-line module. `TOWER.md`
holds the file-ownership map.

十八号楼 (`js/world.js` shell + twenty-one `js/home-*.js` modules) runs the same ownership rule as the
hotel, and this is where it currently stands. These are counts, not impressions, so the next pass can
prove it moved rather than claim it did. Reproduce them with:

```sh
P='(^|[^A-Za-z0-9_])(A\.)?(box|softBox|cyl|capsule|cone|sphere|quad|disc|tube|plane|prism|torus|wedge|slab|panel)\('
grep -ohE "mat: *'[a-z0-9]+'" js/home-*.js js/world.js | wc -l     # 116
grep -ohE "$P" js/home-*.js js/world.js | wc -l                    # 4511
```

**116 `mat:` applications against 4,511 primitive calls — 2.6% of the building is textured.** The
kit in use is `wood` 27, `plaster` 17, `tile` 24, `fabric` 21, `metal` 14, `paving` 7, `concrete` 5,
`slab` 1 (both quoting styles, `mat: 'x'` and `mat:'x'`, counted together).

Where the coverage actually is, `mat:` against primitive calls per module:

| Module | `mat:` | primitives | note |
|---|---|---|---|
| `world.js` (shell) | 23 | 417 | the deck plates and the envelope |
| `home-f11.js` | 13 | 410 | the only well-covered neighbour |
| `home-f8.js` | 8 | 350 | |
| `home-bath.js` / `home-bedroom.js` / `home-living.js` | 7 each | 52 / 73 / 108 | Flat 202's best rooms |
| `home-f4.js` | 7 | 266 | |
| `home-lobby.js` | 7 | 204 | |
| `home-kitchen.js` | 6 | 71 | |
| `home-f3.js` / `home-f7.js` | 6 each | 410 / 422 | 老李家, 老师家 — the two largest flats in the tower |
| `home-entry.js` | 5 | 73 | |
| `home-corridor.js` | 4 | 180 | the most-walked surface in the building |
| `home-second.js` | 3 | 127 | |
| `home-walls.js` | 2 | 5 | |
| `home-dining.js` | 1 | 68 | |
| `home-f5.js` / `home-f6.js` / `home-f9.js` / `home-f10.js` | 1 each | 363 / 319 / 272 / 175 | whole flats in flat colour |
| `home-lift.js` | **0** | 18 | the one interior seen on every journey |
| `home-roof.js` | **0** | 124 | the only place the city is seen from |

The ownership split is the hotel's: the shell (`js/world.js`) owns deck plates, the perimeter
envelope, the glazing and the lift shaft; each `js/home-f<n>.js` owns its own partitions, fit-out and
soft goods; Flat 202 splits per room across `home-entry/living/dining/kitchen/bedroom/second/bath/
walls`. A surface inside a room module is that module's to material, not the shell's.

## Lighting and grounding

- One deliberate key per room with a stated colour temperature. Interiors must not resolve toward
  white; the flat currently does.
- **Contact shadow is not optional.** Furniture that does not sit on the floor is the single
  loudest "unfinished" signal, louder than an untextured wall.
- Bloom only on things that are lights. The engine already separates this — do not threshold the
  finished image.

## Camera

- FOV 0.90 indoor / 0.98 outdoor (`FOV = 0.95` base, eased per place). Do not author per-shot FOV
  to work around a framing bug — fix the framing.
- Cutaway is already implemented (`scene.cutaway`, `hiddenProp`, `hideX`/`hideZ`). Known open bug:
  the low-ceiling limiter collapses a requested overview distance to a close-up, currently worked
  around with hand-picked per-floor camera targets in `.audit.js`. Those workarounds disappearing
  is the regression test for the fix.

## Asset downloads — standing permission

Granted by the project owner on 2026-08-07: **assets that would improve the graphics may be
downloaded without asking each time.** No per-download approval needed.

Four limits, which are about licence and boot safety rather than permission:

1. **CC0 or public domain only.** AmbientCG and Poly Haven are the established sources — the
   original eleven materials came from AmbientCG, and `assets.js` already references Poly Haven
   export conventions. CC-BY and anything more restrictive is **not** covered by this permission:
   it puts attribution or redistribution obligations on a shipped game, and that is the owner's
   call, not a download.
2. **Art assets only** — textures, materials, models, HDRIs, audio. Never executables, and never
   an archive because of code inside it. Nothing downloaded gets run.
3. **Stage first, never overwrite live assets in place.** Overwriting a texture that a harness or
   an in-flight before/after comparison is reading destroys the evidence. Promoting staged files
   into `assets/` is a separate, deliberate step.
4. **Downloading is not preloading.** `js/assets.js:120-132` records that the eager preload broke
   the game at 73 MB — everything in `MATERIALS` is fetched and decoded *before the first game
   script runs*, and two harnesses gave up and reported the dev server down. Files on disk are
   free; naming one in the preload contract is not, and stays a deliberate act with a cost.

Keep a manifest of what was fetched and under what licence, so shipping stays auditable.

### Design tools — standing permission, added 2026-08-08

Granted by the project owner: **whatever tools produce the best design work may be downloaded, so
long as they are free.** No per-tool approval needed.

This deliberately relaxes limit 2 above, which forbids executables. That limit was written about
*assets* — an archive fetched for a texture has no business containing code. A design tool is a
different thing and the owner has said so. The rest of the limits stand, plus three more:

5. **Free means free.** Open-source or genuinely no-cost. Not paid, not trial-limited, not cracked.
6. **Nothing that needs an account or a credential.** Creating accounts and entering passwords or
   API keys is off the table regardless of this permission, so a tool gated behind a signup is not
   covered — flag it to the owner instead.
7. **60 fps still outranks the picture.** A tool that makes a room prettier and the frame slower is
   not an improvement. Prove it either way with `.fpscheck.js`, remembering that this machine has
   ±5 ms of run-to-run spread and single runs establish nothing (see `STATE.md`).

And the standing one that applies to every bulk operation here: **there is no git and no rollback.**
Back up before letting a tool rewrite anything in bulk.

### Staged 2026-08-07, not yet promoted

32 AmbientCG materials at 1K-JPG, 82 MB, in the session scratchpad under `tex-staging/`.
Colour + NormalGL + **Roughness** for all 32 (roughness is the channel `uArm` never had on the
triplanar path), AO for 10, Metalness for 2.

- **The eleven already in the project, refetched.** The shipped copies are savagely
  over-compressed — `Tiles141_Color` is 74 KB on disk against 1109 KB from source, and
  `Metal049A_NormalGL` is 5 KB. That is a third cause of the invisible material pass, alongside
  value range and sub-pixel grout.
- **Twenty-one new, filling the domestic gaps:** Wood094/092/051/066, Tiles139/140/143,
  Plaster001/007, Fabric061/066/083, Plastic013A/010 (for moulded ABS — two agents correctly
  declined to put `metal` on an air conditioner), Marble012/016 (worktops), Carpet016/012,
  Wallpaper001A/001B/002A (patterned walls are most of the Sims 3 domestic read).

#### What promoting one of these costs at boot — measured 2026-08-08 (APARTMENT-TODO item 415)

Record this before promoting any of the 32, because the promotion is not a texture swap: every
name in `MATERIALS` is in `EAGER_MATERIALS` (`js/assets.js`, `Object.keys(MATERIALS)` — there is no
per-material opt-out), and `preload()` fetches *and* `createImageBitmap`-decodes all of them before
`index.html` appends the first game script. The first version of that list preloaded 73 MB and
broke the boot outright; two harnesses reported the dev server down.

| | files | bytes |
|---|---|---|
| eleven shipped materials, colour + NormalGL, on disk | 22 | **695 KB** — 63 KB each |
| the same eleven as recorded in `js/assets.js` | | "740 KB after repacking" |
| one staged 1K-JPG material, unrepacked, from `82 MB / 32` | 3–5 | **~2.6 MB** |

So a single un-repacked promotion is about **38× the current per-material boot cost**, and adds a
third map (`Roughness`) that the eager path does not fetch today — `preload()` asks for `_Color`
and `_NormalGL` only, so promoting one without touching that loop silently ships the old roughness.
Promoting all 21 new ones unrepacked is 55 MB of blocking boot, i.e. three quarters of the way back
to the 73 MB that already broke it once.

Repacked to the shipped compression the same 21 are ~1.3 MB and the whole eager set ~2.0 MB, which
is affordable. **The gate is therefore repacking, not licensing or disk.** State the measured
before/after KB in this table when any of them is promoted.

No `Glass` category exists on AmbientCG, and glass is correctly an alpha/shader material here
rather than a texture — the flat's glazing already runs at alpha .15.

## Verification

Nothing here is done because it was applied. It is done when a picture proves it.

- Render your own views: `AUDIT_PORT=<your port> node .audit.js <shot names>`, then look at the PNG.
- Keep the before image. Every claim is a pair.
- **Do not edit `.audit.js`.** It is shared. Needing a new named view is a request, not an edit.
- **Do not run `.verify.js`.** It is the full suite and must never run while source is being edited.
