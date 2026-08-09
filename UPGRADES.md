# 北京生活 · Beijing Life — Upgrade Roadmap

> ## Progress
>
> Struck-through items are done and verified. The marks mean different things and the difference is
> the point:
>
> - **DONE** — implemented, and checked by something that would have failed if it were broken.
> - **PARTLY DONE** — the useful half landed; the note says what is left and why.
> - **WONT** — deliberately not done, with the reasoning. One item so far, and the reasoning is that
>   the prescribed remedy would have had no effect.
>
> **32 marked** so far, out of roughly 290 in Part A and 400 in Part B. Everything else is untouched.
>
> Where the state lives: `.agent-ledger.json` holds the baselines, the finished work, and the open
> tickets between agents. `node .verify.js` runs all fourteen harnesses against `.baseline.json`;
> `node .verify.js --list` says what each one proves. `.kiro/agents/` holds the agent roster from
> `AGENT_ARMY.md`, each scene agent permission-scoped to its own single file.
>
> ### One correction to the performance items below
>
> Several of them, and a claim I made myself, assumed the renderer is fill-rate bound on decals —
> the large additive floor glows in particular. **That is measurably false.** `.viewcost.js` holds a
> named view for 45 frames and reports frame time beside the drawn-prop count, and it says:
>
> - the rail hall with **every** floor glow and contact shadow switched off costs the same as with
>   them on (247.9 ms vs 249.8 ms);
> - one spot on the street costs the same facing 547 drawn props as facing 5,187 (129.2 ms both
>   ways), so prop count is not the driver either;
> - hiding all of rail's geometry only halves it, so what covers the screen does matter — shaded
>   pixels, not primitives.
>
> The residue is the post chain and fragment shading. Both are cheap on real hardware and expensive
> under the software rasteriser these numbers come from, and the absolute figures here disagree with
> the game's own frame counter, so trust the comparisons and not the milliseconds. **No optimisation
> was done on the strength of them**, and none should be until somebody measures a real GPU.

A comprehensive, code-verified list of upgrade opportunities across the whole project. Every item references real files and real current behavior (no invented problems). ~290 items, organized into 10 sections.

**Effort key:** `S` ≈ hours · `M` ≈ 1–3 days · `L` ≈ 1+ week

---

## ★ The highest-leverage items (if only a few land)

These came up independently across multiple audits and would unlock the most follow-on work:

1. ~~**Save game state.** Currently *nothing* persists except vocab/settings/talk. Reload = day 1, ¥260, home, 14:00 every time. (`game.js` `let` state at lines 93–100, 3228… is never written to localStorage.) — **L**~~  **DONE** — saves clock, day, wallet, fridge, light, all five needs, every fixture, job, travel card, station and position. Autosave every 6 s plus visibilitychange and beforeunload. In-flight states (a ride, an order, a booked flight) are deliberately not saved. New harness `.savecheck.js`, 8/8, does a real reload
2. **GPU instancing in `gl.js`.** Zero instanced draws today; ~135 draw calls/character, ~3,500 props/street. Unblocks glyph batching, rug batching, crowd LOD, and any serious foliage/sign detail. — **L**
3. **Pool `Float32Array` allocations in `math.js`.** Figure rig rebuilds the full bone-matrix tree per frame per character → tens of thousands of 16-float allocs/frame for a crowd. The single biggest GC pressure source. — **M**
4. **Touch controls.** Game is desktop-only despite responsive CSS: no virtual joystick, no on-screen E/Q/R. Unplayable on phones. (`#keys` is `display:none` under 640px, `index.html:536`.) — **L**
5. **Real SRS.** The scheduler is a fixed-multiplier heuristic capped at 6 hours (`vocab.js:530`) — a word can never be scheduled "tomorrow." Switch to SM-2/FSRS with per-word ease and multi-day intervals. — **M**
6. **Split `game.js`** (6,398 lines) + extract `USE` table (~440 lines) and `NPCS` (~560 lines) to data. Every other item becomes easier. — **L**
7. ~~**Lift `rail.js` to parity with `airport.js`.** The thinnest transit scene (389 lines/6 things vs airport's 1,352/22): no toilets, no café, 1 usable bench of 24 seats built, a permanently-closed gate. Airport's `toilets()`/`seatRun()`/`trolley()` helpers are written to be lifted. — **M–L**~~  **DONE** — 421 -> 574 props, 7 -> 34 things. Live board, gates on a timetable, all 24 seats sittable, 洗手间, 问询处, 充电站, 行李车, 消防栓, live clock hands

---

## 1. Rendering & Engine — `gl.js`, `build.js`, `figure.js`, `math.js`, `perf.js`

### Render features
- **2-cascade shadow map.** Currently one fixed-direction ortho box centred on the player (`gl.js:1697`); near shadows swim, distant ones over-tessellate. Split near/far, sampled by viewport region; the 4-tap PCF kernel is already there (`gl.js:181`). — **L**
- **Per-prop `cast: true/false` opt** instead of the global 6.5 m `castMax` cap (`gl.js:27, 1769`). Lets awnings/signs cast without lifting the cap for whole buildings. — **S**
- **Mesh LOD.** Every prop draws full-index mesh at every distance; `makeRoundedBox` alone is 10×10 verts × 6 faces (`gl.js:679`). Generate 2–3 LOD index buffers, pick by camera distance build.js already stores per prop. — **M**
- **Screen-space reflections.** Glass (`mode 18`) and water (`mode 16`) fake reflection with a Fresnel-tinted sky term only (`gl.js:418, 392`). Half-res SSR reading `reTex` (already allocated, `gl.js:1328`) gives puddles/polished floors something real. — **L**
- **Indoor point-light shadows.** Indoors has no shadows at all (`gl.js:1737 noShadow()`, `sunVisible` short-circuits). A small shadow cube for the `bulb` light (which already has real falloff, `gl.js:552`) lets a desk lamp cast the mug beside it. — **L**
- **Multiple punctual lights.** One global `bulb` for the whole frame (`gl.js:7, 1676`). A forward-loop over 2–4 lights in the fragment shader gives rooms with lamp + desk + TV glow. — **M**
- **Auto-exposure.** `uExpose` is one hand-tuned-per-scene global (`gl.js:16, 1515`); ACES is hard-coded (`gl.js:133`). Sample average luminance from the resolved frame to stop nights being too dark / noon blown out. — **M**
- **Expose bloom/AO on the settings panel.** `bloomCut=0.985` is a single global (`gl.js:1071`); `setPost` sets amounts (`gl.js:1645`) with no UI hook. Let users tune. — **S**
- **GPU instancing** (cross-cutting — see ★2). `drawElements` once per prop (`gl.js:1780, 1796`). Best candidates: glyphs (one quad/char), foliage, rugs. — **L**
- **Per-material uniform batching.** ~11 uniforms set per draw call (`gl.js:1778`), many constant per material. A UBO keyed by material hash cuts GL traffic. — **M**

### Shader / material
- ~~**Finish the half-built SSAO.** The geom buffer packs distance into RG only (`gl.js:230`), so SSAO reconstructs normals from `dFdx/dFdy` of depth (`gl.js:1197`) — causes grazing-angle self-occlusion. Pack view-space normal into the BA channels (currently `0, gsolid`). — **M**~~  **DONE** — PARTLY. The grazing-angle self-occlusion is fixed — occlusion is measured against the plane taken from the depth gradient instead of the centre depth, and pixels darkened by more than 16 levels went from 21.5% of the frame to 0.6%. Also made the occlusion blur depth-aware (it was smearing a dark copy of every object onto whatever was behind it) and tightened the occluder cut from 0.65 m to 0.26 m. NOT done as prescribed: the BA channels are not free — alpha is a blend gate that stops transparent props overwriting the depth, so packing a normal needs a 12-bit depth + 12-bit octahedral repack. Left as the remaining gain is small
- ~~**Per-place SSAO radius.** `aoRadius=0.42` is fixed (`gl.js:1067`); indoor 3.5 m rooms and outdoor streets share it. Flows through `setAO` already (`gl.js:1653`). — **S**~~  **DONE** — carried on `setEnv`; indoor 0.26 m, outdoor 0.42 m, and a place may override
- **Water refraction + depth colour.** Mode 16 (`gl.js:392`) has no refraction, no shallow-to-deep shift, no flowmap. Lake edges and Bund water read flat. Sample resolved scene through the water quad. — **M**
- **God-rays / volumetric light shafts outdoors.** The indoor analytic beam (`gl.js:164`) has no outdoor equivalent. Screen-space radial blur centred on the projected sun disc (`gl.js:263`) for dawn/dusk between towers. — **M**
- ~~**Feed moonlight into ambient.** Moon disc + glow drawn (`gl.js:290`) but `uSky`/`uGround` come from `setDaylight` (`gl.js:1520`) with no moon term — a full moon should lift ambient. — **S**~~  **DONE** — `setDaylight` takes a moon term and lifts the sky colour by phase
- ~~**Foliage translucency under the bulb.** 透光 (`gl.js:599`) fires for the sun only; a houseplant by a lamp looks dead at night. Add a second `through` term from `uBulb`. — **S**~~  **DONE** — second `through` term off `uBulb`, falling off with distance
- **Parallax on brick/tile/paving.** Modes 9/11/13 (`gl.js:357`) are pure colour noise; brick joints flatten at grazing angles. 4-tap parallax-occlusion on the existing noise. — **M**
- **Height fog / smog gradient.** Fog is exponential single-colour (`gl.js:137`). A two-colour vertical gradient (ground→sky) tracked to view ray `d.y` gives Beijing haze a base. — **S**

### Performance
- **Strip the shadow vertex path.** Depth pass reuses the full rounded-box VS (`gl.js:1451`), re-resolving corners that don't matter for depth. A stripped shadow VS halves vertex cost on the depth pass. — **S**
- **Quarter-res AO.** Post chain runs 4 full-screen blur passes at half-res (`gl.js:1594`); the bilateral edge-aware blur (`gl.js:1152`) would hide quarter-res. — **S**
- **Blue-noise dither texture.** `hash()` called 3× per fragment (`gl.js:316, 595, 1242`); a single blue-noise fetch replaces it. Minor. — **S**

### Robustness / capability
- **WebGL context-loss recovery without reload.** Currently `location.reload()` (`gl.js:1412`). Factor `init` to be re-callable so game state survives. — **L**
- **GL object teardown on context loss.** `gl.js:1412` only sets UI; leaked handles pile up. — **M**
- ~~**Debounce `resize`.** Rebuilds the whole post FBO chain (`postSize`, `gl.js:1280`) on every canvas size change. 150 ms debounce. — **S**~~  **DONE** — 150 ms settle before the chain is rebuilt; it was rebuilding six targets 60x a second during a window drag
- ~~**`powerPreference:'high-performance'` + `preserveDrawingBuffer`** at context creation (`gl.js:1398`). Helps dual-GPU laptops pick the discrete GPU; helps the screenshot harness. — **S**~~  **DONE** — both set at context creation
- **Renderer `captureFrame()` API.** `debugLight` exists for the harness (`gl.js:1748`) but there's no blob-returning capture. `readPixels` on `reTex` after `present()`. — **S**
- **Try/catch around post-shader compiles.** `postInit` sets `postFail` on link failure (`gl.js:1249`) but `compile` throws (`gl.js:618`), killing init instead of degrading gracefully. — **S**
- **Named enum for the 18 material modes** (documented only in a comment, `gl.js:79`). Factor each mode into its own function. — **M**
- ~~**De-duplicate `GEOM_FAR=64.0`** (`gl.js:118` and `:1091` with a "must match" comment — a live landmine) and other magic numbers (`SMAP`, `castMax`, `shadowPx`). — **S**~~  **DONE** — one JS constant interpolated into both shaders. `SMAP`/`castMax`/`shadowPx` left alone

### `build.js` (scene primitives)
- **Expose frustum cull helper here.** `finish()` computes `cx/cy/cz/r` (`build.js:158`) and `tagBox` AABBs (`:163`) but the cull math lives nowhere in these files — reimplemented per scene. — **M**
- **BVH/spatial hash for `pick`.** `pick` iterates every prop linearly (`build.js:178`); 3,500 slab tests/click. — **M**
- **Broad-phase for `clampMove`.** O(solids) per move (`build.js:213`); a grid bucket helps dense scenes. — **S**
- **`glyphs` instancing** — a 20-char sign is 20 draws (`build.js:63`). Top instancing candidate. — **M**
- **`wall`/`flat` skip `material()` wood-inference and `ob` population** (`build.js:49`) — a `wall(...)` can't be picked and won't get wood mode. Inconsistent with other primitives. — **S**
- **Polygonal walkable zones** — currently axis-aligned rectangles only (`build.js:150`); diagonal corridors need stepped approximations. — **M**
- **`transform` out-param** (`build.js:11`) to avoid per-call `Float32Array(16)` alloc (see math.js). — **S**

### `figure.js` (character rig)
- **Pool scratch matrices.** ~135 draws × several matrices each = hundreds of `Float32Array(16)` allocs/character/frame. Biggest GC source. — **M**
- **Whole-figure frustum/distance cull** — `drawFigure` (`figure.js:434`) has no early-out if off-screen or beyond `npcFar`. — **S**
- **Billboard/capsule far-LOD.** LOD is 3 levels (`lod<2`, `figure.js:443`) but far still draws full body + 6k-tri hair shell. — **M**
- **Gate hair/beard mesh behind `lod<2`** (`makeHair` seg=48/ring=64, `gl.js:898`). — **S**
- **Cache `armTo` IK** when pose is static (`figure.js:388`); re-solves every frame even when sitting still. — **S**
- **Precompute `surf()` lookup** — called ~30×/face with a `Math.sqrt` each (`figure.js:756`). — **S**
- **Dev-assert `FACE_VARY` keys exist in `FACE`** (`figure.js:118`) — a typo silently no-ops. — **S**
- **Per-look material override** (`FABRIC`/`SKINM` are module globals, `figure.js:33`). — **S**
- **Factor the 630-line `drawFigure`** into head/torso/arms/legs/wardrobe functions. — **M**

### `math.js`
- **In-place `mul`/`trans`/`scale`/`rot*` variants** — every call allocates `Float32Array(16)` (`math.js:7`). Root cause of figure.js GC storm. — **M**
- **`vec3` namespace** — cross/dot/normalize inlined everywhere with raw indexing. — **S**
- ~~**Arbitrary-up `lookAt`** with fallback axis (`math.js:56`) — currently hardcoded up=(0,1,0), NaN if parallel. — **S**~~  **DONE** — sideways-up fallback when the view is exactly vertical, which previously gave a matrix of NaNs and a blank canvas with no error
- ~~**Remove dead `lookAt` lines** (`math.js:59`, immediately overwritten at `:61`). — **S**~~  **DONE** — three lines computing a basis from a hardcoded zero vector, overwritten before ever being read
- **Quaternion support** for joint chains (cheaper, avoids gimbal at the shoulder). — **M**
- **`mat4` inverse** for CPU-side normal extraction / culling. — **S**
- **Reverse-Z-friendly `persp`** (`math.js:49`) — forward-looking; would help shadow acne and z-fighting on large outdoor scenes. — **M**

### `perf.js` (adaptive quality)
- **GPU timer queries** (`gl.beginQuery`) on shadow/scene passes — the ladder only watches frame `ms` (`perf.js:93`), can't tell vertex- vs fill- vs draw-call-bound. — **L**
- **"Ultra" tier** for high-DPI/120 Hz — tops out at `scale:1.00` (`perf.js:24`); `setRenderScale` allows >1 (`gl.js:1527`) but no level uses it. — **S**
- **Expose sub-settings independently** (shadow res / bloom / AO separately, not just whole levels). — **M**
- **Vertex-vs-fill detection** for smarter mobile ladder (lowering fill `scale` does nothing if vertex-bound by crowds). — **L**
- ~~**Scale `STALL_MS` by `floorMs`** (`perf.js:62`) — a 144 Hz stall is much shorter absolute time than 30 Hz. — **S**~~  **DONE** — now 15 frames of the learned floor with a 120 ms floor
- ~~**Cap `FLOOR_CREEP` drift** (`perf.js:59`) — unconditional upward creep means long sessions slowly decay quality. — **S**~~  **DONE** — may drift to 1.35x the best frame ever measured and no further
- ~~**Re-arm warmup on `visibilitychange`** — stale timestamps on tab return. — **S**~~  **DONE** — timestamps and the sample window reset when the tab comes back
- ~~**Re-probe blocked levels** — after `GIVE_UP_AFTER=3` (`perf.js:137`) a level is blocked until place-change; a warmed-up/throttling-lifted machine never re-tries. — **S**~~  **DONE** — a level written off for good gets another chance on tab return
- **Watch `performance.memory`** for OOM-prevention prop reduction. — **M**

---

## 2. Gameplay Systems — economy, needs, clock, dialogue, progression

- **Game-state save** (★1). Persist money/day/place/needs/stock/job/ticket/flight/basket/order/delivery/flat. — **L**
- **Mid-game money sinks.** Beyond rent (¥60, `game.js:97`) + food there's nothing to save for except flights. Add bike purchase, rent upgrades, phone-data bill. — **L**
- **Office progression.** `job` resets to null every shift (`game.js:5747`); the ¥260 加班 task is available from day 1 (`office.js:52`). Add XP/rank/promotion/skill-gating. — **L**
- **Attendance streak.** Bonus is binary ¥20 if before 09:30 (`game.js:5273`); `clockedDay` tracks last day only. Add a weekly 全勤 streak. — **M**
- **Needs difficulty selector.** Flat per-hour decay rates (`game.js:3161`); no casual/steady/hard toggle. — **M**
- **Make the toilet "accident" visible.** Silently clamps `clean` to 12, mood −14 (`game.js:3170`); no lasting consequence, no warning modal. — **S**
- **Alarm-time sleep choice.** Sleep always wakes exactly 7 h later (`game.js:4572`) regardless of when you slept — 18:00 sleep wakes at 01:00. — **M**
- **Recipe depth for cooking.** `厨房` is strictly dominated by fridge/diner (`game.js:4554`); shop sells 米/水果/方便面 (`game.js:3338`) but cooking needs no ingredients. Add ingredient-gated recipes. — **L**
- **SRS daily goal / streak / XP / level.** `dueList()` is unbounded (`vocab.js:608`); no targets, no progression meta. — **L**
- **Review-session mode.** `R` opens one due word only (`game.js:1824`); finishing doesn't queue the next. Chain all due words. — **M**
- **Extend `Talk` to all ~21 speaking NPCs.** Only 5 have full Q&A (`talk.js:26`); the rest just bark rotating lines (`game.js:5625`). — **L**
- **Deeper phone (手机).** Only 外卖 + 跑腿 (`game.js:3466`); no contacts, map app, notebook app, settings — under-uses the metaphor. — **L**
- **Delivery variety.** Always 28 min / ¥4 (`game.js:3345`); no surge, vendor choice, or tip. — **M**
- **Subway ride activity.** 6 stops = ~2 real minutes idle (`LEG_SECS=7`, `game.js:4116`). Add "read your notes" to advance SRS during the ride. — **M**
- **Commute planner.** `travelBlocked()` (`game.js:3683`) just refuses; no "next train / fare home" preview. — **M**
- **Flat-state HUD indicator.** Plant/bin/dishes/outfit decay silently (`game.js:3196`); invisible until you notice the verb. — **S**
- **Minigames.** 工作/学习/下棋/打球 are all time-bars (`game.js:5759`). A typing minigame for 打字, stroke-order for 汉字, tone-matching for 听力. — **L**
- **Stats / achievements.** No record of words mastered, days survived, money earned, trips taken, conversations had. No badges. — **L**
- **Manual save / load / slots.** Only "RESET WORDS" exists (`index.html:665`). Appropriate once autosave lands. — **M**

---

## 3. HUD / UI / Onboarding — `index.html`, HUD panels

### Onboarding / discoverability
- **First-run coach.** Nothing guides after PLAY (`started`, `game.js:1576`); only static `#howto` text (`index.html:704`). Contextual nudges (low food → "go to 超市", first due word → "press R"). — **M**
- **`#keys` is `display:none` under 640px** (`index.html:536`) — no control reminder on mobile. Move into a collapsible `?` button. — **S**
- **Re-surface "HOW TO PLAY".** The link (`index.html:686`) is easy to miss and never reappears. Persistent `?` in `#hud`. — **S**
- **Intro pillars hidden on small screens** (`index.html:525`). The three gameplay promises vanish when mobile users need them. Stack them. — **S**
- **Discoverability of M / Tab / R.** Only in small `#keys` block (`index.html:617`). One-time toasts. — **M**
- **"Today's goal" surface.** Many verbs, no single "what to do next" hint. — **M**
- **Title screen never explains the learning loop.** Promises "learn by living" but doesn't say gold dot = review, pinyin disappears. — **S**

### HUD
- **Numeric needs values.** Bars only (`index.html:127`); can't tell 18% from 22% (the `crit` threshold, `game.js:3205`). — **S**
- **Sort needs by urgency.** Fixed order (`game.js:3140`); when three are red you scan all five. — **S**
- **Default `#perf` chip off.** Always in HUD (`index.html:554`); debug noise for a learner. Surface only when degraded. — **S**
- **Clock: weekday / day-phase.** Day N is a bare counter (`index.html:545`); rent-due-each-morning (`game.js:3185`) is illegible. Add 星期 or morning/afternoon/evening. — **S**
- **Money: net / low warning.** Only current cash (`index.html:546`); no today's delta, no red tint under ¥30. — **S**
- **Make `#revw` chip clickable** to call `review()` (`game.js:6291`). — **S**
- **Show in-game time + gain in `#doing`.** Static hint only (`index.html:569`); show "吃饭 · +42 food · 3.4 s". — **S**
- **Keep a "queued next" hint while `doing`.** `#prompt` hides entirely during an action (`game.js:6181`). — **S**

### Cards / notebook / map
- **Audio button on the word card.** Conversations get 再听一遍 (`index.html:597`) but a single clicked word (`#card`, `:576`) is silent. — **M**
- **Replay hearing in quiz.** `ask()` renders once (`game.js:1731`); no re-listen for audio prompts. — **M**
- **Notebook search / filter / sort tabs** (复习 due / 已掌握 / 全部). Currently a flat insertion-ordered list (`game.js:1967`). — **M**
- **Keyboard-navigable notebook rows.** Only `.row.due` is clickable (`game.js:1978`); no arrow keys, no `aria`. — **M**
- **Collapsible / responsive `#map`.** Fixed 298 px (`index.html:138`); overlaps panels on small screens. — **S**
- **Map legend.** No explanation that red = current, dimmed = locked (`index.html:160`). — **S**
- **Fast-travel 回家 from anywhere.** `DOORS` only lists local-station doors (`game.js:3653`); from the airport/Bund you must walk the whole chain back. — **M**
- **Toast queue.** `toast()` clears the previous toast (`game.js:1958`); overlapping events overwrite. — **S**
- **Settings gaps in `#pause`:** no volume, music toggle, font-size, colorblind, language toggle. (`index.html:628`). — **M**

---

## 4. Accessibility & i18n

- **Tab-cycle nearby things.** E only hits `activeThing` (`game.js:1434`); physical Tab is hardcoded to notebook (`game.js:1406`). — **M**
- **Screen-reader support for 3D labels.** `.lbl` divs have no `role`/`aria-label` (`game.js:6144`); `aria-live` exists only for `#card .fb`/`#talk .fb` (`index.html:588, 601`). Add `aria-live` for `#prompt`. — **M**
- **Font-size setting.** Every `font-size` is fixed px (`index.html:15`); add a `--font-scale` CSS var + slider. — **M**
- **Colorblind-safe palette toggle.** Needs bars jade→amber→red, quiz green/red (`index.html:239`) — worst pair for deuteranopia. — **M**
- **High-contrast / reduced-motion mode.** `prefers-reduced-motion` not respected; `pip`/`pulseBar`/title camera always run (`index.html:102`). — **M**
- **Granular pinyin/English assist.** `SET.assist` is all-or-nothing (`game.js:1277`); no "always pinyin, hide English" or immersion mode. — **S**
- **"Chinese only" immersion UI mode.** Everything is bilingual by default; hiding the English half is the obvious SRS end-state. — **M**
- **Gloss consistency.** Conversations gloss replies fully but quiz feedback sometimes shows English only on miss (`game.js:1786`). — **S**
- **Subtitle size control.** Subtitles share small `#toast` styling (`index.html:355`). — **S**

---

## 5. Persistence & Robustness

- ~~**Save game state** (★1, repeated). — **L**~~  **DONE** — see ★1
- **Persist in-flight actions.** `tickUse`'s `doing.t` is in-memory only (`game.js:5759`); a refresh mid-3-min-工作 loses it. `pagehide` bound only in `talk.js:173`. — **M**
- **Runtime error catch in `frame()`.** A throw stops rAF silently (`game.js:5771`). Wrap + recoverable toast. — **M**
- **Save-corruption notice.** `Vocab.load()` silently returns `{}` on bad parse (`vocab.js:535`); `SET` parse silent (`game.js:1244`). Surface "your save was reset." — **S**
- **Unify save patterns.** Vocab debounced 150 ms (`vocab.js:562`), Talk debounced (`talk.js:161`), settings sync (`game.js:1247`) — three different patterns. — **S**
- **Storage-quota-failure signal.** Swallowed everywhere (`vocab.js:565`, `game.js:1249`); user gets no warning progress isn't saving. — **S**

---

## 6. Mobile / Touch

- **Virtual joystick + D-pad.** Movement is WASD only (`game.js:5781`); no on-screen controls. Game is unplayable on touch. — **L**
- **Floating E/Q/R action buttons** bound to `startUse`/`interact`/`review`. Long-press exists (`game.js:1484`) only for "click word." — **L**
- **Pinch-zoom.** Wheel-only (`game.js:1513`); pinch arrives as ctrl+wheel on trackpads only. — **M**
- **Adapt `#talk` / `#pick` for small screens.** Only `#card`/`.chip` are adapted (`index.html:532`); `#talk`/`#pick` overflow. — **M**
- **Allow text selection in `#book` / `#talk`.** Global `user-select:none` (`index.html:20`) blocks copying words to a dictionary. — **S**
- **Reduce CSS effects path.** `backdrop-filter:blur` on every panel (`index.html:53`) is costly on mobile GPUs; perf system only scales render res, not CSS. — **M**

---

## 7. Scene Content — per-place gaps (richest → thinnest)

Ranking by richness (things / lines): airport 22/1352, world 34/916, street 23/2277, shanghai 15/660, campus 16/740, park 10/575, shop 9/821, office 9/436, metro 6/1523, diner 6/721, train 4/904, rail 6/389 (thinnest), classroom 4/237.

### `rail.js` — biggest gap vs peers (389 lines, 6 things)
- ~~**Add 洗手间** — lift `airport.js:798` `toilets()` factory. — **S**~~  **DONE** — two doors in a tiled surround with 男/女 pictograms and a lit sign
- **Add a 餐厅/茶水 kiosk** with a steam rig (`diner.js:440`). — **M**
- ~~**Make all 24 seats usable** — `seatRun` builds 24 chairs (`rail.js:47`) but only 1 `thing('座位')` exists (`:301`). airport tags every run. — **S**~~  **DONE** — one `thing()` per pan, the way the carriage does it
- ~~**Open 检票口 on a timetable** — permanently closed (`rail.js:242`); airport gates open on a flow (`airport.js:1297`). — **M**~~  **DONE** — flaps swing, lamp goes jade, sign and spoken line change when a service is called
- ~~**Live 电子屏** — 6 hardcoded trains, no clock state (`rail.js:165`); metro's `writeBoard()`/`trainAt()` (`metro.js:1142`) is a pure clock function. — **M**~~  **DONE** — six services on a day-long timetable, state computed from the clock: 正点 / 晚点 / 正在检票 / 停止检票 / 已开
- ~~**Add 行李 trolleys/suitcases** — airport has `trolley()`/`suitcase()` (`airport.js:173`); rail has 0. — **S**~~  **DONE** — three trolleys, two nested by the door and one abandoned mid-floor
- ~~**Add ATM / 充电站** — airport `charger()` (`airport.js:833`). — **S**~~  **DONE** — a charging bench with six sockets and a shelf
- **Add 问询处 / 服务窗口** — metro has 服务中心 + clerk silhouette (`metro.js:595`). — **M**
- **Wall clock** — every other interior has 钟; rail (a place you wait) has none. — **S**
- **Signage dressing** — 禁止吸烟 / 消防栓 (metro has both, `metro.js:942`). — **S**
- **Vocab:** 站台, 行李托运, 晚点, 候车室, 软座/硬座, 出租车 rank. — **S** each
- **Seated passengers + gate queue NPCs.** — **M**
- **Live board recomputation per frame** (airport `setBoard`, `airport.js:1262`). — **M**
- **Glimpse of a platform/carriage through the gate** (metro car `metro.js:861`). — **L**

### `classroom.js` (237 lines, 4 things)
- **投影仪 / projector screen.** — **S**
- **Teacher's computer on the 讲台** (`office.js:78` workstation). — **S**
- **Bookshelves along the back wall.** — **M**
- **班级牌 door signage** (street.js gateHouse plaques). — **S**
- **Student backpacks.** — **S**
- ~~**`tick` for wall-clock hands** (static now; `metro.js:1262`). — **S**~~  **PARTLY DONE** — PARTLY — rail's hands are driven by the game clock now, and the same fix found that a clock face on a +z wall is read mirrored, so nine o'clock pointed at the three. metro's and the flat's are untouched and probably have the same bug
- **A plant** — every other interior has greenery. — **S**
- **Vocab:** 课程表, 同学, 数学/语文/英语 subjects, 粉笔 separate from 黑板. — **S** each

### `shop.js` (821 lines, 9 things — rich, polish only)
- **Back office / 冷库 door** — the pallet (`shop.js:759`) implies a stockroom. — **M**
- **NPC cashier behind 收银台** — the stool is empty (`shop.js:592`); metro clerk silhouette pattern (`metro.js:611`). — **M**
- **生鲜 / meat-fish counter** — model on 水果 (`shop.js:488`). — **M**
- **A 秤 / scale** on the trestle — 水果 says 多少钱一斤 but there's no scale prop. — **S**
- **Vocab:** 烟酒 counter, 塑料袋 thing, 收银 as a teachable verb. — **S** each

### `diner.js` (721 lines, 6 things — best-in-class interior logic)
- **外卖 / takeaway window** facing the street. — **M**
- ~~**男/女 toilet signage** (airport `toilets()`). — **S**~~  **DONE** — part of the 洗手间 block
- **烟灰桶 outside the door.** — **S**
- **A 师傅 silhouette behind the range** (metro clerk pattern). — **M**
- **Vocab:** 老板/服务员 as person things, 小费, 打包 verb. — **S** each

### `office.js` (436 lines, 9 things)
- **Break-room 冰箱 / 微波炉** beyond the 咖啡 point (`office.js:334`). — **S**
- **Printer paper tray visible** — 打印机 is a closed box. — **S**
- **Vocab:** 老板, 同事, 会议室 (room vs 桌), 加班 project 展板. — **S** each
- **Port the TASKS time-window pattern** (`office.js:52`) to shop restock and rail timetable. — **M**

### `park.js` (575 lines, 10 things)
- **Make all 8 benches sit-able** — only 1 `thing('长椅')` exists (same disease as rail). — **S**
- **Add 小卖部 kiosk** (rail has one, `rail.js:314`). — **S**
- **Add 厕所** (shanghai has 公共厕所, `shanghai.js:435`). — **S**
- **跑步 / 太极 practitioner NPCs** (street `homes` walking pattern). — **M**
- **喂鸭 verb** — 鸭子 exists but isn't a thing. — **S**
- **儿童乐园 / slide.** — **M**

### `campus.js` (740 lines, 16 things)
- **宿舍 / dormitory facade** along one edge. — **M**
- **操场 / running track** (篮球场 exists, no track). — **M**
- **Enterable 食堂** — currently a facade + price board; diner table/kitchen pattern. — **L**
- **Vocab:** 礼堂, 校长, 毕业生, 学期. — **S** each

### `street.js` (2277 lines, 23 things — gold standard)
- **ATM / 银行** — 14 SHOPNAMES (`street.js:71`) but no bank. — **S**
- **公交站 / bus stop** (shanghai has 机场大巴, `shanghai.js:573`). — **M**
- **Enterable gatehouses** — facades with plaques (`street.js:166`) you can't enter. — **L**
- **Moving vendor carts** beyond campus's 煎饼 and shanghai's stalls. — **M**

### `world.js` (916 lines, 34 things — most interactive)
- **阳台 / balcony.** — **M**
- **邻居 NPC** (sound/figure next door). — **M**
- **洗衣机** — bathroom has 淋浴/马桶/洗手池 but no washer. — **S**
- **Wall 日历 / calendar** with the office TASKS pattern (`office.js:52`). — **M**

### `metro.js` (1523 lines, 6 things — best machinery, thin content)
- **便利店 on the concourse** (airport has one, `airport.js:756`). — **S**
- **ATM.** — **S**
- **A 商店 signage thing** for buying (ad panels are decorative, `metro.js:927`). — **M**
- **扶梯 / escalator** — only stairs (`metro.js:472`). — **L**
- **Vocab:** 换乘 thing (term is in help text `metro.js:918` but not teachable), 安全检查. — **S** each

### `train.js` (904 lines, 4 things — sophisticated, narrow)
- **More interactive things** — 餐车 cart, 行李 shelf (signage is built but not interactive, `train.js:700`). — **S**
- **乘务员 NPC** (metro clerk pattern). — **M**
- **Other passengers** — 爱心专座 exist but are empty. — **M**
- **Wi-Fi / 充电 socket thing** (airport `charger()` model). — **S**

### `shanghai.js` (660 lines, 15 things — rich, a few gaps)
- **南京路 street-name signs** (street gatehouse plaques). — **S**
- **Tourist NPCs** — 外滩 is always crowded. — **M**
- **Enterable 和平饭店** stub. — **L**
- **黄浦江 ferry boarding thing** — 轮渡 is a prop (`shanghai.js:368`) but not boardable. — **M**

---

## 8. Cross-Scene Patterns to Extract (shared code, currently duplicated)

- **`toilets()`** — only in `airport.js:798`. Move to `build.js`; enables rail/diner/park/shop. — **S**
- **`seatRun()`** — in `airport.js:150` and `rail.js:47` near-identical; unify + auto-tag `thing('座椅')`. — **S**
- **`trolley()`/`suitcase()`/`queueLine()`** — airport-only (`airport.js:173`); reusable for rail/metro/train. — **S**
- **`palm()`/`planter()`** — airport-only (`airport.js:240`); campus/street/shanghai would use them. — **S**
- **`bench()`** — implemented 3× differently (metro/park/shanghai); one `bench(style)` helper. — **M**
- **`setNight(k)` smoothstep + `litProps`/`litten()`** — copy-pasted in 11 files. Extract `Build.nightHook()`. — **M**
- **`steamRigs`** — world.js and diner.js (`diner.js:38`) implement rising steam independently; one `Build.steam(x,y,z)`. — **S**
- **Timetable pattern** — metro `trainAt(clock)` (`metro.js:1142`) is the right model; generalize into a `Schedule` helper for rail/airport. — **M**
- **NPC walk-route helpers** — street `homes` (`street.js:83`) and metro `WALK` (`metro.js:100`) are two takes on collider-aware routing; a shared `walkGraph` enables NPCs in rail/classroom/park/shanghai. — **L**

---

## 9. Learning Core — SRS, dictionary, quiz, content (`vocab.js`, `glyphs.js`)

### SRS algorithm
- **Switch to SM-2 / FSRS.** Current is a fixed-multiplier heuristic (`IV_MUL=2.3`, `vocab.js:530`) with no per-word ease factor. — **M**
- **Remove the 6-hour interval cap.** `IV_MAX=6*3600` (`vocab.js:530`) means a word can never be scheduled "tomorrow" — defeats the point of SRS. — **M**
- **Reset help level on lapse.** A miss subtracts only 1.5 (`vocab.js:677`); a mastered word (`n=7`) forgotten drops to 5.5 — still stage 2, English still hidden. — **S**
- **Make `brush()` (passive exposure) drive the queue.** Capped at `BRUSH_CAP=4` (`vocab.js:692`), never reschedules — reading a sentence 30× never retires a word. — **S**
- **Add Anki-style learning steps** (1m→10m→1d). `introduce()` schedules +75 s only (`vocab.js:614`). — **S**
- **Expose stage thresholds (3/7) and MAX (9) in settings** (`vocab.js:525`). — **S**

### Quiz
- **More than 4-option MC.** `Vocab.quiz()` (`vocab.js:624`) only does MC. Add typed hanzi recall, pinyin typing, audio→meaning, meaning→hanzi. — **M**
- **Keep quiz distractors to met words.** Currently tops up from the whole dictionary (`vocab.js:644`) — surfaces unknown glosses. — **S**
- **Deeper distractor filtering.** `usable()` (`vocab.js:633`) only catches exact-gloss/substring overlaps; near-synonyms (花/花园/花生) slip through. — **S**

### Dictionary / content
- **Sentence examples per entry.** `DICT[hz]={hz,py,en}` only (`vocab.js:519`); words never shown in authored context sentences. — **M**
- **Link 量词 to nouns** — 件/张/条/只/盆 are orphan entries (`vocab.js:108,449,473`); no "一杯茶" exercise. — **M**
- **Radicals (部首) + character decomposition.** Zero radical data anywhere; no path from char→components. — **L**
- **HSK level tagging.** Dictionary grouped only by in-game place; no HSK 1/2/3 marker or curriculum filter. — **M**
- **POS / grammar-point tagging.** Entries are `hz|py|en`; 了/把/被/得 present as words but never taught as grammar. — **M**
- **Frequency ordering** — words introduced in place order, not frequency. — **S**
- **Handwriting / 笔顺 (stroke-order) practice.** Zero stroke-order code in `js/`. Highest-value hanzi feature, entirely absent. — **L**
- **Tone-identification drill.** Tones encoded (`voice.js:152`) but no "which tone is 门?" exercise. — **M**
- **Static `Talk` turns** — `talk.js:SCRIPTS` hand-authored once; "吃了吗" is always identical. Add templating/branching. — **M**
- **`Talk.score()` bypasses SRS** (`talk.js:198`) — credits exposure without scheduling. Route through `Vocab.grade()`. — **S**
- **Audio for every word** — dictionary words have no TTS path; `openWord()` (`game.js:1792`) never pronounces. — **M**
- **Unknown-char learning path** — `tokenize()` (`vocab.js:701`) makes unknown chars bare `{e:null}`, never enters SRS. — **S**
- **Progress export/import (CSV/Anki) + cloud sync.** localStorage only (`vocab.js:535`). — **M**
- **Per-word "forget this" + undo** — `reset()` is all-or-nothing (`vocab.js:732`). — **S**

### Glyph rendering (`glyphs.js`)
- **Higher atlas resolution.** `CELL=72` (`glyphs.js:13`); signs upscale soft on Retina. 128–192 px is materially sharper. — **S**
- **Ship a font.** Stack is macOS-only (`glyphs.js:49`); Windows/Android/Linux falls back to tofu. — **M**
- **Multiple weights.** Only `700` (`glyphs.js:49`); can't render light couplets or thin modern fascias. — **S**
- **Stroke-order data + animation** (pairs with handwriting item). — **L**
- **Sized `RGBA8` internalformat** for `setAtlas` (`gl.js:1509`) + sRGB handling. — **S**
- **Refresh atlas at runtime.** Built once (`glyphs.js:72`); a runtime-composed station name draws tofu. — **M**
- **Detect missing glyphs** — `build()` (`glyphs.js:45`) doesn't check the font has the char; silently renders tofu. — **S**
- **Atlas cell padding** — packed edge-to-edge (`glyphs.js:46`); `LINEAR_MIPMAP_LINEAR` (`gl.js:1511`) bleeds at small mips. — **S**

---

## 10. Audio & Dev Tooling

### Audio (`speech.js`, `train-audio.js`, `voice.js`, `audio/`)
- **TTS fallback for unbaked lines.** By design, unbaked = total silence + console error (`speech.js:23`). The full procedural synth in `voice.js` (959 lines) is offline — reuse it as a coverage backstop. — **M**
- **Lighten the bake toolchain.** `.bake-voices.py` stubs spacy, pulls Kokoro+Torch+HF, downloads a 103-voice checkpoint — hard to onboard contributors. — **L**
- **Bake all station names** — only 6 are baked; new ones are silent until a rebuild. — **S**
- **Voice variety** — every NPC is the same Kokoro model pitch-shaped (`.bake-voices.py` CAST). — **M**
- **Ambient sound beds beyond the subway platform.** `train-audio.js:308` builds one; home/street/shop/diner/office/park/campus/rail/airport have none. — **L**
- **SFX for interactions.** Only metro doors/gate/passing (`train-audio.js:282`); home door, shop checkout, diner order have none. — **M**
- **Music beyond the platform.** Three programmes exist (`train-audio.js:380`) played only there; no music elsewhere, no toggle. — **M**
- **Volume controls.** Settings has only `speech:true` (`game.js:1243`); no master/music/SFX/voice sliders. Gains hardcoded. — **M**
- **Delete dead `audio/train/*.wav`** — 12 files / ~3.3 MB, zero references (replaced by synthesis). — **S**
- **Audio format fallback** — clips are AAC/m4a only; some Firefox/Edge/Linux decode poorly. — **S**
- **Cross-bus ducking** — `duckMusic()` (`train-audio.js:840`) only affects music; NPC speech over a PA announcement gets no duck. — **M**
- **Richer PA lines** — `lines()` returns only the station name (`train-audio.js:1002`); fuller sentences removed to cut reverb smear, losing listening practice. — **S**
- **HRTF / elevation for NPC spatialisation** — `place()` (`speech.js:342`) is distance+pan only. — **M**

### Dev tooling / build integrity
- **Fix vexp indexer** — over its node limit (`WARN Node limit reached 2058/2000` in `.vexp/vexp.log`); ~170 files unindexed, manifest lists only 6. — **S**
- **Document `.vexp/`** — undocumented, always-on, 17 MB and growing. — **S**
- ~~**Add `package.json` + unified test runner + CI.** ~12 standalone `.*check.js` scripts, no manifest, no `npm test`. — **M**~~  **DONE** — `npm test` runs `.verify.js`, which runs all 14 harnesses in order, never two at once, and checks them against a recorded `.baseline.json`. FAIL blocks, CHANGED informs
- ~~**Stop hardcoding the macOS Chrome path** in every harness (`.audit.js:10`, `.perfcheck.js:5`, …). — **S**~~  **DONE** — resolved by `.harness-env.js`, which walks a candidate list and honours a CHROME env var. All 20 harnesses share it
- ~~**Fix port mismatch** — `serve.py` defaults 5173, every harness hits 8000. — **S**~~  **DONE** — `serve.py` defaults to 8000, the port every harness has always asked for, and honours GAME_PORT
- **Bundler / build step.** 24 `<script>` tags + `?v=Date.now()` (`index.html:746`); no minify/tree-shake/sourcemaps/prod build. — **L**
- **Behavior-level NEEDS check.** `index.html:752` validates module surface only; a stub defining the keys passes. — **S**
- **Better boot overlay** — only RELOAD; add copy-error, telemetry. — **S**
- **Init a git repo** — working dir is not a git repo despite 200+ screenshots. No history/diff/rollback. — **S**
- **Guard dev workbenches** — `voice.html`/`studio.html`/`_probe.html` ship in the served folder, publicly accessible. — **S**
- **De-duplicate `_probe.html`** — ~17 KB copy of the full game HTML/CSS; can drift from `index.html`. — **M**
- **Coverage analysis for `.audit.js` SHOTS** — ~200 hand-maintained entries, no report of uncovered scenes/words. — **M**
- **Live reload** — just `no-store` headers + manual refresh; no websocket/HMR. — **M**
- **Document the bake pipeline** — `node .dumplines.js && .venv-tts/bin/python .bake-voices.py` has no Makefile/README. — **S**
- ~~**Dictionary integrity check** — malformed `hz|py|en` lines silently dropped (`vocab.js:513`); `node --check` only proves parse. — **S**~~  **DONE** — new `.dictcheck.js` reads the list the way `vocab.js` does and fails on a missing bar, a full-width bar, an unmarked tone or a duplicate headword. 2946 checks, no browser needed. It found nothing wrong with the data and one bug in itself
- **README for loose utilities** — `.hearme.js`/`.whyrobot.js`/`.figsheet.js`/`.dumplines.js`/`.voicegaps.js` have zero discoverability. — **S**

---

# Part B — Deep-dive additions

The four sections below come from a second, deeper pass: prop-by-prop scene micro-upgrades, vocabulary/content depth, polish/bugs/consistency, and new-feature ideas. Items that merely repeated Part A were dropped; ~400 net-new items remain.

## 11. Prop-by-prop scene micro-upgrades

Granular, per-prop items verified line-by-line. Two cross-cutting patterns first (highest leverage):

- **The "missing person" pattern (all scenes).** Detailed furniture is built for people who are absent: the street vendor behind the steamers, the mahjong players at the 4 stools, the metro clerk silhouette, the 5 airport check-in agents, the gate agent, the info agent, the barista, the shop assistant, the empty gate-queue line. A single lightweight seated/standing NPC prop (or reusing the figure rig) fixes dozens of "vacated set" reads at once. — **M**
- **The "blank-screen" pattern (all scenes).** Every screen in the game — `world.js:414` phone, `:405` laptop, `airport.js:701` kiosks, `:931` X-ray, `:1112` gate display, `metro.js:534` ticket machine — is a flat emissive glow with no UI. One shared "fake-UI glyph" helper upgrades all of them. — **M**

### `street.js`
- **Tuck the 早餐 stools under** the folding table (`street.js:1199`) — they sit alongside, not under the lip; the diner tucks stools, this should too. — **S**
- **The 5 "baozi" in the wok** (`:1177`) read as 汤圆 (wok-fried); baozi are steamed. Move them into an open steamer basket. — **M**
- **No 豆浆 visual** though the thing text promises it (`:1211`) — add a tall stainless thermos with a spigot + teach 豆浆. — **S**
- **Bare folding table** (`:1199`) — add a half-eaten baozi on a plate, a paper 豆浆 cup with straw, disposable 筷子 (reading practice for 杯/筷子). — **S**
- **No price board** at the stall — a handwritten cardboard list (包子 一元 / 豆浆 两元) teaches numbers + 元. — **S**
- **Comment promises "someone behind the steamers"** (`:1894`) but no vendor body exists — add a standing vendor. — **M**
- **Mahjong table has no 麻将 thing** (`:1391`) — add the word; rename the thermos a 暖壶. — **S**
- **14 mahjong "tiles" lie flat** (`:1399`) reading as crackers — stand a row on edge as a wall. — **M**
- **No neighbours at the 4 stools** (`:1913` comment) — the table reads as abandoned. — **M**
- **修车 pitch teaches no 充气/轮胎/内胎** (`:2013`) — add a 轮胎 thing on the wall wheels. — **S**
- **The bike being repaired has both wheels on** (`:2013`) though one is the spare on the wall — inconsistent. — **S**
- **4 e-scooters built, only 1 电动车 thing** (`:2045`) — none interactive (can't sit on, can't ring). — **M**
- **Sleeping dog has no water bowl** (`:2052`) — strays always have one; teaches 碗/水. — **S**
- **2 pigeon lofts, no 鸽子 thing** (`:1993`) — birds visible but untaught. — **S**
- **Birdcages have birds but no 鸟/鸟笼 thing** (`:1912`, `:2136`). — **S**
- **Lion's ball-under-paw renders only for `s>0`** (`:538`) — only the right lion has it; traditional pairs are symmetric. — **S**
- **报刊亭 magazines are blank coloured rectangles** (`:1957`) — add 报纸/杂志 things + fake 汉字 mastheads. — **S**
- **Washing line** (`:644`) has shirts/trousers/towels but no 晾衣服/衣服/衬裤 vocab. — **S**
- **5 potted flowers, one 花 thing** (`:1254`) — the 花盆 (pot) isn't taught; only the blooms. — **S**
- **A broom leans on the wall** (`:1280`) — no 扫帚 vocab. — **S**
- **3 垃圾桶 built** (`:1272`) — but street.js has no 垃圾桶 thing (world.js and airport.js both teach it). — **S**
- **快递 trike is detailed** (`:1236`) but has no courier figure. — **M**
- **Cabbage greens differ in colour** between the wall stack and the trike-load (`:2074` vs `:1254`) — inconsistent produce. — **S**
- **老李面馆 has no readable 面馆 sign** (`:1020`) — only 入口. — **M**
- **超市 display windows are empty glass** (`:943`) — should show stacked goods behind the glass. — **M**
- **Water-bottle stack is one blue box** (`:992`) — break into 6–8 瓶 + teach 瓶. — **S**
- **8 letterboxes, none with mail** (`:921`) — add a couple of envelopes sticking out. — **S**
- **Notice board slips are blank** (`:925`) — add fake 通知/汉 copy. — **S**
- **Bus has no route number/destination** on its pane (`:1667`) — no 公交车 thing. — **S**
- **Traffic light hardcoded red** (`:1692`), never cycles — no 红绿灯 thing. — **M**
- **5 detailed cars, no 汽车 vocab thing** (`:1677`). — **S**
- **Rooftop billboard ad panels are blank** (`:1836`) — add fake ad copy. — **S**
- **公厕 sign points into the void** (`:2173`) — no actual toilet doorway. — **M**
- **AC units on every facade, no 空调 thing on street** (`:432`) — world.js has it. — **S**
- **Fire hose cabinet + hydrant built** (`:2100`) — no 消防栓/消防 vocab (metro teaches 消防). — **S**
- **12 sparrows on power lines, no 麻雀 vocab** (`:1925`). — **S**
- **34 CBD towers all `col.renderD`** (`:2186`) — vary cladding tone (blue-glass/white/warm-grey). — **M**
- **Tapered landmark tower has no name label** (`:2207`). — **S**
- **Office lobby entrance is a flat dark panel through the glass** (`:1789`). — **M**
- **Stairwell opening is a flat charcoal box** (`:887`) — no receding steps visible. — **M**

### `world.js` (apartment)
- **No 床头柜 / phone charger / 闹钟 by the bed** (`:196`). — **M**
- **No 被子 thing** (`:205`) — only 床/枕头 are taught. — **S**
- **Suitcase at wardrobe bottom, no 行李箱 vocab** (`:246`). — **S**
- **5 shirts on the rail are identical silhouettes** (`:236`) — add a dress/coat/jacket. — **M**
- **TV console side compartments empty** (`:271`) — add a 机顶盒/游戏机. — **S**
- **No 遥控器 anywhere** (`:279`). — **S**
- **Coffee table sparse** (`:299`) — add coaster, remote, 水果. — **S**
- **The "book" is a flat box** (`:307`) — reads as a coaster; give it pages + spine. — **S**
- **Teacup well-modeled but no 茶 thing on it** (`:304`) — 茶 only in 茶几 text. — **S**
- **Sofa cushions symmetric, no throw blanket** (`:312`). — **S**
- **Plant pot has no drainage saucer** (`:342`). — **S**
- **No laptop cable / no mouse** (`:373`). — **S**
- **Laptop base is a blank slab** (`:396`) — no keyboard/trackpad. — **S**
- **Phone screen is a flat green glow** (`:414`) though text references 房租 — add a fake message glyph. — **S**
- **Desk lamp has no switch on the base** (`:418`). — **S**
- **Desk chair is a 4-legged dining chair** (`:427`) — a real desk chair has 5 casters + swivels. — **M**
- **Bookshelf spines are blank cloth** (`:438`) — add 3–4 readable 汉字 titles. — **M**
- **Fridge has no 鸡蛋 / no 蔬菜** (`:491`) — add an egg carton. — **S**
- **Fridge door has no 冰箱贴** (`:495`) — a missed character-detail classic. — **S**
- **Only one burner** (`:555`) — Beijing flats usually have 2–4; add a second ring or 电饭锅. — **M**
- **Pot lid lifts but no food visible** (`:559`) — add dumplings/noodles. — **S**
- **No 洗洁精 bottle on the counter** (`:566`). — **S**
- **Bin has no 垃圾袋 liner folded over the rim** (`:591`). — **S**
- **Backpack non-interactive** (`:606`) — can't pick up / open. — **S**
- **AC remote "missing" per thing text** (`:621`) — make it a findable prop that unlocks 26°C. — **M**
- **Clock has no 秒针** (`:628`). — **S**
- **Only one framed 家 calligraphy** (`:648`) — add a photo / 日历 / second picture. — **S**
- **Ceiling pendant "flickers" per text but not implemented** (`:654`). — **M**
- **Windowsill bare** (`:112`) — add a potted herb / knick-knack. — **S**
- **Front door opens to a flat dark panel** (`:169`) — no corridor. — **M**
- **Bathroom vanity has no product shelf** (`:696`) — no 洗发水/护肤素. — **S**
- **Mirror light bar casts no glow on the face** (`:716`). — **S**
- **牙膏 lumped into the 牙刷 prop** (`:723`) — split it. — **S**
- **Soap bar has no dish** (`:729`). — **S**
- **No 卫生纸 roll anywhere** (`:735`). — **S**
- **No 洗发水/沐浴露 bottles** in the shower (`:755`). — **S**
- **Only one 毛巾** (`:775`) — real bathrooms have 2–3. — **S**
- **Takeaway bag brilliant but singular** (`:795`) — no size/content variation. — **S**
- **Skyline towers have no readable signage** (`:122`) — add a distant neon sign. — **S**

### `metro.js`
- **No 刷卡 vocab thing separate from 闸机** (`:253`). — **S**
- **Ticket-machine screen shows only a tiny 买票 glyph + line map** (`:534`) — no station-select/fare UI. — **M**
- **Fare table excellent but no physical 交通卡 prop** (`:561`). — **S**
- **Service-window clerk is a static silhouette** (`:611`) — mannequin in an otherwise-animated scene. — **M**
- **4 在建 stations are grey dots with no destinations** (`:665`). — **S**
- **4 columns identical and bare** (`:712`) — real columns carry ad panels/maps. — **S**
- **Benches have no passenger / discarded newspaper** (`:713`). — **S**
- **Platform-door piers have no door numbers (1–5)** (`:735`). — **S**
- **Next-train boards show no destination** (`:797`) — add 本次终点站. — **S**
- **No floor-tile inlay repeating the station name** (`:827`) — real Beijing platforms have tile names set in floor. — **S**
- **Ad panels are civic copy, not product ads** (`:927`) — add 1–2 product ads (手机/银行/饮料). — **M**
- **禁止吸烟 signs only high on walls** (`:943`) — add one at face height by the benches. — **S**
- **Fire cabinet glass dark** (`:962`) — no hose reel/extinguisher visible. — **S**
- **Wall clock has no 秒针 and no numerals** (`:976`). — **S**
- **Bins single-stream** (`:987`) — Beijing mandates 可回收/其他 split. — **S**
- **"Sprinklers" are plain red cylinders** (`:433`) — no sprinkler-head shape. — **S**
- **Tactile 盲道 paving has no 盲道/无障碍 vocab thing** (`:1006`). — **S**
- **Floor-reflection pools don't reflect columns/benches** (`:1031`). — **M**
- **Train destination blind is a blank yellow strip** (`:903`) — no 下一站/terminus text. — **S**
- **Train interior has no passengers/ads/wall line-map** (`:861`). — **M**
- **Train windows read as one long stripe** (`:887`) — no frame divisions. — **S**
- **No 信号 vocab thing** (`:312`). — **S**
- **Stairwell daylight is a flat emissive quad** (`:492`) — no actual sky/street at the top. — **M**
- **Lit coves are glowing lines with no fixture housing** (`:998`). — **S**
- **Tunnel mouths never move** (`:302`) — no receding signal lights / second-train glimpse. — **S**

### `airport.js`
- **5 check-in agent stools all empty** (`:634`). — **M**
- **2 flights (东京/曼谷) have no desk** (`:648`) — orphaned by the 5-position build. — **S**
- **No bag sits on any belt scale** (`:611`) — suitcases offset to the side. — **S**
- **Tag printer / boarding-card stack are blank boxes** (`:630`). — **S**
- **Oversize belt never animates** (`:668`). — **M**
- **4 self-service kiosks are flat blue glow** (`:692`) — no UI. — **M**
- **No 航班/航班信息 thing on the board** (`:715`). — **S**
- **Information desk has no agent** (`:527`). — **M**
- **Ticket office has no clerk silhouette** (`:551`) (unlike metro's). — **M**
- **Ticket-office glass has no service-window speak-hole** (`:567`). — **S**
- **便利店 has no products on counter / no 店员** (`:756`). — **M**
- **Noodle-shelf cups identical shapes, no logos** (`:773`). — **S**
- **Chiller empty inside** (`:769`). — **S**
- **Toilet blocks show nothing behind doors** (`:798`). — **M**
- **Charging benches have no phones on them** (`:833`). — **S**
- **Security officer desk empty** (`:893`). — **M**
- **X-ray has no bag passing / no scan-image screen** (`:924`). — **M**
- **Trays are plain charcoal boxes** (`:935`) — real airports label trays. — **S**
- **Smoking room empty, no haze** (`:987`). — **M**
- **Duty-free: no prices, no clerk** (`:1008`). — **S**
- **Duty-free bottles all same shape, varied only by colour** (`:1020`) — no gift boxes/ribboned baijiu. — **S**
- **Café has no 咖啡师 / no queue** (`:1045`). — **M**
- **Café tables bare, no customers** (`:1069`). — **S**
- **Price board has no 蛋糕/三明治 row** (`:1063`). — **S**
- **Gate podium has no agent** (`:1089`). — **M**
- **Gate queue line built but empty** (`:1145`). — **S**
- **Airbridge windows dark** (`:1152`) — no interior light. — **S**
- **45 airside seats, zero passengers/luggage** (`:1164`). — **M**
- **Planter troughs too small** (`:1169`) — terminals have statement greenery. — **S**
- **Airside bins single-stream** (`:1175`). — **S**
- **~11 trolleys, none interactive** (`:1203`) — a 推 (push) interaction. — **M**
- **Suitcases fixed** (`:1177`) — can't drag despite 行李托运 text. — **S**
- **Apron has no follow-me taxi lines / other stand numbers** (`:366`). — **S**
- **Aircraft livery says only 中国** (`:389`) — no airline name / registration (B-XXXX). — **S**
- **L1 door closed** (`:407`) — real boarding has it open with jetbridge sealed. — **M**
- **Second distant aircraft identical livery** (`:471`). — **S**
- **2 tugs + baggage carts static, no drivers** (`:453`). — **M**
- **Catering lift raised but no carts loading** (`:464`). — **S**
- **16 cones but no GPU cart / pushback tractor / water service** (`:466`). — **S**
- **Curtain-wall glass 20% alpha** (`:494`) — may show void at shallow angles. — **S**
- **Dark inlay guide has no directional arrows (→ 登机口)** (`:337`). — **S**
- **Rooflights are emissive panels, not skylights** (`:340`) — no sky overhead. — **S**
- **Gantry signs have no English subtitles** (`:1229`) — unlike real Chinese airports. — **S**
- **No 国际/国内 split signage** (`:1220`). — **S**
- **Landside + airside seats identical** (`:1197`) — no style variation. — **S**
- **Subway lobby implies a train behind a dark opening** (`:498`). — **S**

## 12. Vocabulary & content depth

The dictionary (`vocab.js` RAW, ~440 entries) is **place-themed, not curriculum-themed** — dense on scene-object nouns, almost empty on the grammatical core of HSK 1–3. Every missing word below was grepped to confirm absence.

### Vocabulary gaps by category
- **Numbers:** 一…十 almost entirely absent (fragments only); add 百/千/万/第一. — **S**
- **Money units:** only 块/元 exist; add 毛/角/分/零钱/找钱 (every scene transacts money). — **S**
- **Time:** add 星期/星期一…日/周/周末/月/年/号/昨天/早上/上午/下午/半夜; seasons 春/秋/冬 (夏 exists); duration adverbs 一直/已经/还要/再/又/才/刚/刚才/经常/有时候/从来. — **M**
- **Family (entire category missing):** 爸爸/妈妈/哥哥/姐姐/弟弟/妹妹/儿子/女儿/家/爷爷/奶奶/丈夫/妻子/孩子. — **S**
- **Colors:** only 红/黑 present; add 黄/绿/蓝/白/灰/棕/颜色. — **S**
- **Weather (entire category missing):** 雨/下雨/雪/下雪/风/刮风/云/阴/晴/太阳/月亮/星/热/冷/暖和/凉快/舒服. — **M**
- **Directions:** 东/南/西/北/左/右/前/后/旁边/中间/里面/外面/楼上/楼下/附近 (对面 exists). — **S**
- **Body parts (entire category missing):** 头/手/脚/脸/眼睛/嘴/耳朵/头发/牙齿/肚子. — **S**
- **Clothing:** only 衣服/件; add 裤子/鞋/袜子/帽子/裙子/外套/T恤/穿/脱/戴. — **S**
- **Food — ingredients (thin):** dishes are well-covered (17) but add 牛肉/猪肉/鸡肉/鸡蛋/鱼/蔬菜/西红柿/土豆/黄瓜/葱/鸭/肉. — **M**
- **Fruits:** only the mass noun 水果; add 苹果/香蕉/西瓜/橘子/葡萄/草莓/梨/桃. — **M**
- **Drinks:** add 牛奶/果汁/矿泉水/酒/红酒 (茶/啤酒/可乐/饮料/豆浆/咖啡/白酒/汤 exist). — **S**
- **Breakfast/staple:** add 饺子/面包/馒头/粥/三明治/早饭/午饭/晚饭 (早餐 exists). — **S**
- **Verbs of motion:** add 跑/飞/回/到/进/出/上/下/爬/跳/站/停/搬/带走/带来 (走/来/去/坐/骑 exist). — **M**
- **Other high-frequency verbs:** 听/读/写 (看/说 exist), 唱/跳/笑/哭/玩/卖 (买 exists), 帮/帮忙/喜欢/爱/觉得/知道/希望/懂/记得/问/答/告诉/穿/脱/戴/起/起床/洗脸 (洗手/洗澡 exist). — **L**
- **Adjectives:** 大/长/短/高/低/厚/薄/远/近/早/晚/快/慢/漂亮/好看/帅/聪明/勤快/马虎/旧/便宜/贵/免费/舒服/生气/难过/开心/紧张/有意思/可爱/冷/热/凉. — **L**
- **Measure words (almost none, badly paired):** add 本/支/把/双/份/碗(measure)/盒/节/辆/台; pair 碗 explicitly with noodles/rice/soup (来一碗 uses it but 碗 is taught only as a noun). — **M**
- ~~**Question words / pronouns:** add 谁/怎么/怎么样/为什么/哪里; pronouns 她/我们/你们/他们/它/大家/自己 (我/你/他 exist). **The game cannot say "she" despite ~half the NPCs being women.** — **S**~~  **PARTLY DONE** — PARTLY — 我们, 大家, 自己 and 哪个 are in. 她, 你们, 他们, 它, 谁, 怎么样 are deliberately NOT: they appear in no line anywhere in the game, and a dictionary row is only ever reached through a thing or a spoken sentence, so adding them changes nothing until somebody writes a line. Ticketed to the dialogue owner instead
- **Conjunctions / particles:** add 因为/所以/虽然/但是/还是/或者/如果/然后/不但/而且/因此; particles 得/把/被/让/啊/呀/着(拿着 is used but 着 untaught)/过(吃过/去过). — **M**
- **Room names:** add 卧室/客厅/餐厅/书房/阳台/楼梯/电梯/地板/天花板/墙/屋顶/房子/楼上 (厨房/洗手间/房间 exist). — **M**
- **Institutions:** add 学校/银行/医院/药店/邮局/警察局/市场/商店/旅馆/酒店/饭馆/电影院/动物园/博物馆/宿舍/操场/出租车/的士/公交 — almost all absent. — **L**

### HSK coverage estimate
Dictionary is place-themed, not HSK-aligned. Rough coverage: **HSK 1** ~40–50%, **HSK 2** ~25–30%, **HSK 3** ~10%, **HSK 4** near-zero (only scattered airport/rail words). ~45 specific high-frequency HSK words confirmed missing by grep: 一…十, 谁, 怎么/怎么样, 为什么/因为/所以, 喜欢/爱好, 几岁/多大, 星期/月/年/号, 上午/下午/昨天, 热/冷/凉快/暖和, 漂亮/好看, 红/黄/绿/蓝/白, 爸爸/妈妈/哥哥/姐姐/弟弟/妹妹/家, 朋友/先生/太太/小姐, 看/听/读/写/字/汉字, 块/毛/分/角, 坐/站/跑, 便宜/贵, 虽然/但是/还是/或者/如果, 觉得/知道/希望/发现, 得/把/被, 玩/游戏/有意思/有用/舒服, 一直/已经/经常/有时候/从来/刚才, 自己/别人/大家/它/我们/你们/他们/她, 关系/影响/解决/经验/适合/要求, 考试/成绩/复习/练习/作业/课文/词汇/语法/发音/错. — **M**

### Sentence / grammar-pattern gaps
The `thing()` sentences and `talk.js` replies are mostly one short declarative; they rarely model grammar. Add authored sentences modelling each: **没有** (我没有钱/时间/伞); **得 complements** (说得好/跑得快 — 豆豆 already says 你说得很好 but the pattern isn't taught); **了** change-of-state (下雨了/他来了/我吃饱了/票卖完了/天黑了); **了** duration (我学了两年了/我住这儿三年了); **把** (把身份证给我/把碗放在桌子上/把门关上 — entirely absent); **被** passive (票被卖完了/自行车被修好了 — absent); **因为…所以**; **虽然…但是**; **如果**; **比** comparatives (地铁比公交快); **最** superlatives (最好吃的); **想要+ noun** (我想要不辣的); **能/会/可以** distinction (你能帮我吗/这里可以抽烟吗); **疑问词+都/也** (什么都不想吃); **V+一下** softening; **V+过** experience (你吃过饺子吗); **V+着** continuous (门开着); **是…的** focus (我是去年来北京的); **了 vs 过 contrast**; **就/才** (八点就到了 vs 十点才到); **太…了**; **给/为** (给我一杯茶); **一边…一边**; **呢** questions (你呢); **怎么样** (身体怎么样). Also: lengthen the 5–7-char `done:` lines in the USE table into pattern-rich sentences. — **S–M** each

~~### NPC dialogue depth (barkers → conversations)~~  **PARTLY DONE** — PARTLY — five given conversations (小林 at the shop till, 王经理 and 同事 小赵 in the office, 王师傅 at the ticket window, 小雨 in the diner): 5 scripts/11 turns to 10/26, all 69 new lines voiced. Four more turned out to be unreachable rather than unwritten and were fixed in `game.js`: 李大妈, 陈老师, 小周 and 小李 had 22 lines between them and no USE verb reached any of them
Only 5 NPCs have full `talk.js` conversations (王阿姨/李师傅/超市老板/小陈/豆豆). The other ~15 only bark. Suggested conversation topics per NPC:
- **服务员 (小雨, diner):** ordering & dietary (要不要辣/我不吃辣/有没有素的), paying (扫码还是现金/用微信/找你两块), complaints (这个面太咸了). — **L**
- **收银员 (小林, shop):** payment (扫码还是现金/可以刷卡吗/用支付宝), bag fee (要袋子吗), refunds (这个能退吗). — **M**
- **经理 (王经理, office):** deadlines (报告什么时候交/明天上午), overtime (今天加班吗), feedback (做得怎么样). — **M**
- **同事 (小赵, office):** lunch (中午吃什么/一起去食堂吧), gossip (经理今天心情不好), help (这个表格怎么做). — **M**
- **售票员 (王师傅, rail):** classes (二等座还是一等座), time (几点的车/还有票吗), ID/booking (身份证带了吗). — **M**
- **地勤 (小许, airport):** baggage (行李要托运吗/几公斤), seat (靠窗还是靠走廊), gate/time (几号登机口/几点登机). — **M**
- **安检员 (刘警官, airport):** liquids (水能带吗), electronics (电脑拿出来/充电宝呢), body scan (请抬手). — **M**
- **登机员 (小赵, airport):** boarding (登机牌给我看一下), priority (老人小孩先上), final call (最后一次广播). — **M**
- **售票员 (陈姐, airport):** one-way vs return (单程还是往返), destination (去哪儿/上海最早一班), price (多少钱). — **M**
- **学生 (小周/小李, campus):** classes (你选了几门课), food (食堂排队吗), directions (图书馆在哪儿), hurry/sports. — **M**
- **老师 (陈老师, campus):** homework (作业交了吗), pronunciation (这个字怎么念), progress (你的发音进步了). — **M**
- **大妈 (李大妈, park):** invitation (一起跳舞吗/我教你), schedule (每天几点来), exercise (锻炼身体很重要). — **M**
- **照相的 (老周, bund):** pricing (多少钱一张), posing (往左一点/笑一个), delivery (微信发给你). — **M**
- **阿婆 (陆阿婆, bund):** food rec (小笼包在哪儿买), history (你从小住这儿吗), Shanghainese (侬好是什么意思). — **M**
- **外卖员 (小周, home door):** handover (这是我的外卖吗), fee (配送费多少), rating (给我个好评). — **M**

### Per-scene vocab not taught
- **Home:** 卧室/客厅/阳台/书房, 闹钟, 钥匙, 衣架, 拖鞋, 牙膏, 洗发水, 卫生纸, 垃圾袋, 水龙头, 窗台, 插座. — **S**
- **Street/hutong:** 路灯, 人行道, 斑马线, 井盖, 出租车, 行人, 街坊, 早餐摊, 杂货店. — **M**
- **Shop/超市:** 价格/价钱, 便宜/贵, 打折, 收据, 发票, 购物车, 称/公斤/斤/两, 零食, 调料, 盐/糖/油/酱油/醋, 面包/牛奶/鸡蛋/酸奶. — **L**
- **Diner/餐馆:** 辣/不辣/微辣, 加, 份, 打包, 埋单/结账, 找钱/找零, 小费, 筷子/勺子/盘子/杯子, 空位, 推荐, 特色菜. — **M**
- **Office/公司:** 工资, 邮件, 会议室, 项目, 客户, 合同, 报告/总结, 计划, 预算, 请假, 迟到/早退, 面试, 微信/钉钉, 显示器, 键盘, 鼠标, U盘. — **L**
- **Park/公园:** 草/叶子, 鸭子, 鱼, 鸟, 跑步, 散步, 太极/太极拳, 慢跑, 小路, 喷泉, 草地, 儿童/孩子, 玩具. — **M**
- **Campus/大学城:** 课/第一节课, 考试, 成绩, 作业, 学期/学年, 专业, 选课, 学分, 宿舍, 校园, 操场, 足球场/网球场, 教授, 同学, 粉笔, 课本. — **L**
- **Metro/地铁站:** 高峰, 挤, 末班车/首班车, 方向, 终点站, 转, A出口/B出口, 号线, 站台, 屏蔽门. — **M**
- **Rail/火车站:** 硬座/硬卧/软卧, 高铁/动车, 站台, 候车室, 列车长, 乘务员, 失物招领, 广播, 时刻表, 退票, 身份证, 学生票/儿童票. — **M**
- **Airport/机场:** 签证, 行李箱, 超重, 称重, 登机时间, 起飞/降落时间, 航站楼, 廊桥, 空姐/乘务员, 机长, 行李牌, 中转, 直飞, 取消. — **M**
- **Train/车厢:** 乘务员, 餐车, 卧铺, 行李架, 小桌板, 窗/窗户, 终点站, 请勿吸烟, 紧急出口, 按钮. — **M**
- **Bund/外滩:** 东/西, 江边, 堤, 拍照, 游船, 纪念品, 地方, 有名/著名, 漂亮, 历史. — **M**

### Cross-cutting content notes
- ~~**Pronoun gap is the most embarrassing:** cannot say 她 despite ~half the NPCs being women; nor 我们/你们/他们. HSK1; fix first. — **S**~~  **WONT — see note** — DISAGREED, and deliberately not done. The remedy as written — add the row — has no effect: 她 occurs in no line in the game, and `introduce()` only ever fires off a thing you touched or a sentence you heard. The row would be unreachable. What is needed is a line, which is a dialogue job, and it is ticketed as one
- **Learning-game meta-vocabulary missing:** 考试/成绩/作业/复习/练习/语法/词汇/发音/错 — a Chinese-learning game that can't talk about learning Chinese. 陈老师 is the vehicle. — **M**
- **The 5 talk.js conversations reuse a tiny grammar core** (是/有/要/叫/在/去) — never 比/把/被/得/因为…所以/虽然…但是/如果/越…越/一边…一边. One scripted turn per pattern is high-value. — **M** each
- **Dish/menu vocab is excellent and deep** (17 dishes); the gap is the *ordering* language around it (份/加/辣/推荐/打包/埋单). — **M**
- **Money/numbers pervasive** but 1–10, 百/千/万, 毛/角/分, 便宜/贵, 找钱 all absent — fixing this one category makes ~half the existing sentences comprehensible. — **S**, high impact

## 13. Polish, bugs & consistency

### Dead code / unused / orphan
- **`js/voice.js` (55 KB)** — loaded only by `voice.html`, not in `index.html:746` FILES; `speech.js:31` admits it's "no longer in the game's audio path." — **S**
- **`_probe.html` (17 KB)** — stale partial copy of `index.html`, ships in served root, referenced nowhere. — **M**
- **7 ungoverned dev scripts** — `.hearme.js`/`.whyrobot.js`/`.voicegaps.js`/`.figsheet.js`/`.dumplines.js`/`.readingaudit.py`/`.tts-compare.py`, zero cross-references. — **S**
- **`.tts-compare.py:4` references `.tts-probe.py`** — file does not exist; stale pointer. — **S**
- **`.audio-compare/` (5.5 MB, 45 files)** — one-time TTS comparison output, no script reads it. — **S**
- **Scratch dirs committed to root** — `.look/` (3.4 MB), `.figshots/` (26 MB, 67 PNGs), `.audio-music/`, `.audio-bake/before/`. — **S**
- **188 `.audit-*.png` (~180 MB+)** in repo root — should be gitignored output, not source. — **S**
- **Large one-off screenshots** — `.studio-shot.png`, `.talk-shot.png`, `.voice-studio.png`, `.crop-board.png`. — **S**
- **Unused palette entries** — `shop.js col.black` (0 refs), `metro.js col.ballast` (0 refs), `diner.js col.amber`/`office.js col.binder`/`classroom.js col.board` (def only). — **S**
- **`NEEDS` checker** doesn't validate that `voice.js` is intentionally excluded from FILES. — **S**
- **`.claude/CLAUDE.md`** is a generic vexp/MCP guide, not project docs. — **S**

### Magic numbers & tunables (centralize)
- **`NEEDS[].rate`** decay (6.0/8.0/4.5/3.5/3.0) hardcoded inline (`game.js:3140`). — **S**
- **`FARES=[3,3,4,4,5]`** bare literal (`game.js:3519`). — **S**
- **`RIDER_WAIT=180`** mixes in-game minutes into a file otherwise in real seconds (`game.js:3320`). — **S**
- **Travel costs named but scattered** — `FLIGHT_HOURS/COACH/HOTEL/CHANGE` (`game.js:4022`) sit 700 lines from `RENT=60`/`money=260`; no single economy block. — **M**
- **Mixed units** — `LEG_SECS/DWELL_SECS` (real seconds, `game.js:4116`) vs `RIDE_BOARD/RIDE_LEG` (in-game minutes, `:3661`) in the same file. — **M**
- **`GEOM_FAR=64.0` appears twice** (`gl.js:118` & `:1091`) — manually synced, comment says "Must match." Fragile. — **S**
- **Shadow map size triple-sourced** — `SMAP=1536` (`gl.js:21`), `shadow:1536` (`perf.js:29`), and the `[0,0,6.5,24]` box (`gl.js:28`) duplicates `castMax=6.5` + `shadowHalf:24`. — **S**
- **`PP_SCRATCH=7`** texture unit hardcoded (`gl.js:1270`). — **S**
- **Camera `far:` a bare magic number per scene** (40/60/190/620/700) with no constant. — **M**
- **Daylight curve constants inline** — `clamp((amt-0.14)/1.3,…)` (`game.js:3133`). — **S**
- **Per-row `secs`(real) vs `mins`(in-game)** co-exist in `MENU`/`TASKS`/`FLIGHTS` rows, easy to swap. — **M**

### Inconsistencies (the biggest category)
- **`setNight(k)` copy-pasted across 11 files** (`street.js:2221`, `office.js:411`, `metro.js:1476`, `rail.js:374`, `park.js:559`, `diner.js:687`, `campus.js:702`, `shop.js:806`, `shanghai.js:636`, `classroom.js:220`, `airport.js:1324`) — bodies byte-identical except a trailing `.22/.24/.26/.30/.34/.95` multiplier and `street.js`'s extra `skyRefl` arg. One helper taking `(k, weight)`. — **L**
- **`litProps`/`litten(p,k)` redefined in all 11 files** — identical pattern, ~11 copies. — **M**
- **`smoothstep k*k*(3-2*k)` inlined in 9 `setNight` bodies** — `figure.js:31`/`game.js:2132` already have `smooth01`/`smoothstep`, never reused. — **M**
- **The LCG `rnd` duplicated ~14 times across 13 files** — `street.js:75`, `shop.js:44`, `diner.js:45`, `office.js:41`(+`trnd`), `park.js:48`, `campus.js:73`, `classroom.js:105`(`tr`), `rail.js:41`, `airport.js:112`, `shanghai.js:61`, `metro.js:181`, `world.js:126`(`wrnd`)+`:443`. `math.js` is the natural home. — **L**
- **`pick = a => a[(rnd()*a.length)|0]` duplicated in 9 files** (`game.js:786` has a different `pick`). — **S**
- **`clamp` defined 3×** — `math.js:82`, `speech.js:95`, `voice.js:504`. — **S**
- **Two RNG strategies coexist:** seeded LCG vs `Math.random()` at 7+ `game.js` sites (`1104,1151,1635,4253,4265,4343,4380,5963`) + `vocab.js:585` — some decide boarding counts, defeating the seeded determinism. — **M**
- **`SKYKEYS` duplicated** between `game.js:3073` and `studio.html:415` — the studio copy is *truncated* (drops fields), silently drifting. — **L**
- **Every scene redefines its own `const col={…}`** — same key names resolve to *different* hex values across files, no shared base palette. — **L**
- **Three localStorage schemas in three modules** — `settings.v1`/`talk.v1`/`knowledge.v2`+`OLDKEY`; no central persistence module. — **M**
- **`steam` implemented twice** — `steamRig()`/`setSteam()` (`world.js:29,877`) plus parallel `steamPot`/`steamShower` keys (`game.js:4995,…`) with inline `now/1000` vs `now/1400`. — **M**
- **`window.__game` test API** (`game.js:6312`, ~80 lines, 40+ methods) undocumented, consumed by 7 test scripts, no stability contract. — **M**
- **RNG naming split** — `rnd`/`wrnd`/`trnd`/`tr` for the same LCG. — **S**
- **Comment density varies 5×** — `math.js` 0.08, `rail.js` 0.15, `build.js` 0.17 (sparse) vs `perf.js` 0.44, `figure.js` 0.39 (heavy). — **S**
- **`FLIGHTS[].price` / `DUTYFREE[].price` bare numbers** while `RENT`/`FARES` are named — inconsistent within one file. — **S**

### Likely bugs / fragile code
- ~~**Port mismatch (headline bug):** `serve.py:21` defaults **5173**, all 19 dev scripts hardcode **8000** — `node .audit.js` after `python3 serve.py` fails "page did not load." — **M**~~  **DONE** — same fix — see section 10
- **Hardcoded Chrome path in 19 scripts** — breaks on Linux/Windows / non-default installs. — **M**
- **Zero TODO/FIXME/XXX/HACK markers** anywhere — no residual-work trail. — **S**
- **Headless-render assumption hardcoded** (`game.js:6345`) — the `__game` tick-by-hand strategy breaks if the driver switches to Playwright/Firefox. — **M**
- **`const box=[…]` mutated** at `gl.js:1717` — a `const` array as mutable light-box state. — **S**
- **Error-swallowing `catch(_){}` in 12 places** (`talk.js:158,164,257`; `speech.js:361,362`; `train-audio.js` ×9) — recurring disconnect bugs invisible. — **S**
- **Quota errors swallowed** (`vocab.js:565`) — user loses progress silently. — **S**
- **`train-audio.js` has 22 catch blocks** (most of any file), almost all swallowing; only a `lastError` string. — **M**
- **`NEEDS` verifier runs only on `last.onload`** (`index.html:779`) — a script that loads but throws at parse is caught by a window handler that regex-munges `/js/` paths, fragile under reverse-proxy. — **S**
- **`var v=Date.now()` cache-buster** (`index.html:786`) defeats the browser cache always — no path to a cached production build. — **M**
- **`TITLE_SHOTS` loop** (`game.js:1642`) safe today but infinite-loops if any entry ever has `secs:0`. — **S**
- **`World.tvGlow` null contract inconsistent** (`game.js:5056` checks, `:5946` assumes). — **S**
- **`webkitAudioContext` fallback dead** on every modern browser (`speech.js:34`, `train-audio.js:5`). — **S**
- **`serve.py` binds 127.0.0.1 only** with no shared host/port config with the dev scripts. — **S**
- **No `package.json`/`Makefile`/npm scripts** — the only way to discover the workflow is reading each `.foo.js` header. — **M**

### Documentation gaps
- **No `README.md`** in root; only doc is `UPGRADES.md` (an audit, not a setup guide). — **S**
- **19 `.foo.js` dev scripts not collected** — you must `head` each one. — **S**
- **`.claude/CLAUDE.md`** describes vexp, not the game — misleadingly named. — **S**
- **No architecture doc** — module graph only inferable from the `NEEDS` array. — **M**
- **`__game` API has no contract doc** (40+ methods, 7 consumers). — **M**
- **`math.js`/`rail.js`/`build.js`** under-commented core files. — **S**
- **No CONTRIBUTING / code-style guide.** — **S**
- **Inline GLSL in `gl.js`** has no doc linking uniform names to JS setters. — **M**
- **188 `.audit-*.png` not indexed** — no manifest maps shot name → scene/camera. — **S**

### CSS / markup (`index.html`)
- **`<html lang="en">`** (`:2`) — content is bilingual with Chinese primary; `zh-CN` is more correct and lets AT use a Chinese voice for hanzi. — **S**
- **~30 hex colors hardcoded in CSS** instead of vars (`:63,64,75,92,96,…`), many duplicating `:root` `--gold/--red/--jade-l`. — **M**
- **99 `rgba()` literals** — several re-state root vars inline (`rgba(255,255,255,.11)` = `--line`). — **S**
- **10 `<button>`s lack `type="button"`** (`:662-686,719,726`) — safe today, would submit if ever form-wrapped. — **S**
- **`<canvas id="cv">` has no `role="img"`/`aria-label`** describing the 3D viewport. — **S**
- **`#keys` has no `aria-label` and is hidden on small screens** (`:536`) — mobile loses the whole controls reference. — **S**
- **`<i>` restyled to `font-style:normal`** (`:61`) — semantic mismatch in `#perf`. — **S**
- **`.lbl` divs are clickable but not buttons** — no keyboard focus, no `role`. — **S**
- **`#intro` has no `role="dialog"`/`aria-modal`** (`:674`). — **S**
- **Inconsistent border-radius** — 9/10/11/12/13/14/16/17/18/20/999px all appear, no scale; compare `--shadow` which is a var. — **S**
- **`_probe.html` carries a full duplicate of this CSS** — every issue exists twice. — **M**
- **`viewport-fit=cover` missing** (`:5`) — notch/safe-area unhandled for mobile. — **S**

### Localization hardcoding
- **52 inline `say(...)` dialogue calls in `game.js`** (`:166,174,202,236,…`) — every NPC line a string literal at the call site, no `t()` helper. — **L**
- **Bilingual pairs are positional `[zh,en]` tuples** — order by convention only, a swap is a silent bug. — **M**
- **UI chrome strings inline in markup** — chips (`:545-554`), map label (`:560`), notebook (`:604`), pause (`:626`); no English-only or Chinese-only build. — **L**
- **Lexicon has no single source** — `MENU`/`GOODS`/`TASKS`/`FLIGHTS` carry `hz/py/en` inline; the same word can appear there and in `vocab.js` with different pinyin. — **M**
- **No `i18n`/`locale`/`STRINGS` symbol anywhere in `js/`.** — **L**
- **`.bake-voices.py`/`.dumplines.js` extract speech lines** into `lines.json` — a ready path for speech, but written UI strings have no equivalent. — **M**
- **Hardcoded units in strings** — `¥${RENT}块` / `Rent is ¥${RENT} kuai` (`game.js:3189`) mix glyph + transliterated unit. — **S**

## 14. New feature ideas (plausible, none already existing)

### Learning features
- **Handwriting canvas with stroke-order checking** — trace hanzi, score against a stroke DB; gates mastery past the `stage 2` ceiling `brush()` can't reach. — **L**
- **Tone-identification drill** + **tone-pair minimal drill** (mā/má/mǎ/mà, shì/shí) — surfaces the `voice.js` tone table as a trainer. — **M**
- **Radical (部首) lessons + character decomposition tree** (休→亻+木) + **etymology cards** (oracle→modern). — **L** / **M** / **M**
- **Stroke-animation playback** via the `glyphs.js` atlas + path data. — **L**
- **Pronunciation scoring via mic** — `getUserMedia` + pitch tracking vs the synth reference. — **L**
- **Dictation mode** — hear a word, type pinyin/hanzi. — **M**
- **Listening-comprehension drills** from the baked sentence bank; **reading-comprehension passages** (graded paragraphs with ruby + questions). — **M**
- **Conversation practice with feedback** — free-form mic reply, NPC reacts to tone intelligibility. — **L**
- **HSK test mode** + **HSK-gated curriculum track** ("your next 20 words to HSK 3"). — **M**
- **Word-family clusters** (花/花园/花生) + **measure-word trainer** + **chengyu (成语) collection book**. — **M** / **M** / **L**
- **SRS minigames:** subway flashcards during the ride; market speed-pricing; kitchen recipe dictation. — **M**
- **Spaced dictation warm-up each morning** on waking (3-word drill → +mood buff). — **S**
- **Grammar-point cards (了/把/被/得)** as fill-in-the-blank patterns. — **M**

### Gameplay / life-sim
- **Weather system** (rain/snow/fog → sky, puddles enable SSR, NPC barks change). — **L**
- **Four seasons** (foliage color, NPC clothing, seasonal menus). — **L**
- **Calendar with weekdays + month names** + **lunar holidays (春节/中秋/端午/元宵)** with themed dressing/barks/word sets. — **S** / **L**
- **Spring Festival event** — red couplets, midnight fireworks SFX, 包饺子 cooking. — **M**
- **Cooking minigame with real recipes** (ingredient-gated) + **recipe book**. — **L** / **M**
- **Balcony garden** (grow 葱/薄荷 on the wilt mechanic). — **M**
- **Pet ownership** — adopt the decorative 猫/狗, feed/walk needs, teaches 摸/喂/遛. — **L**
- **Per-NPC friendship meter** unlocking deeper turns + gifts. — **M**
- **Diary/journal phone app** auto-logging the day's events; re-reading brushes those words. — **M**
- **Side-quests/errands board** (find 阿姨's missing 猫) + **a 5-chapter story arc**. — **L** / **L**
- **Career tree** (实习生→正式员工→经理) + **attendance streak rewards.** — **L** / **M**
- **Hobbies:** calligraphy (stroke-order + scroll output), tai chi (join the 6am 大爷 routine), a musical instrument. — **M**
- **Home decoration/furniture placement** + **wall-paint customization** (money sinks; teaches 颜色). — **L** / **S**
- **Roommate/partner NPC** with own schedule + relationship arc. — **L**
- **Time-limited daily events** + **money sinks** (phone-data bill, bike purchase, rent upgrades). — **M** / **L**
- **Bike ownership** for faster hutong travel. — **M**
- **Sleep-alarm choice** (set wake time, teaches 早上/几点). — **M**

### Social / world
- **Async message board (街坊群)** phone app + **NPC schedules that react to you.** — **M**
- **Reputation system** (街坊 score rises with greetings/on-time rent/quests). — **M**
- **Branching dialogue consequences** (a wrong branch locks a quest). — **M**
- **Extend Talk to all ~21 speaking NPCs** (only 5 have Q&A). — **L**
- **Multiplayer co-op study room** (WebRTC, no server). — **L**
- **Weekly leaderboards** (ship as "vs last week's you" first). — **L**
- **Shared vocabulary deck** export/import with a friend. — **M**
- **NPC gifting** (送/给) + **NPC mood that affects their lines.** — **S** / **M**
- **Romance/deep-friendship ending** at the Bund. — **L**

### Engine / UX
- **In-game photo mode** (phone "camera" app → `captureFrame()` blob) + **photo album** with caption brushing. — **M** / **S**
- **Replay/share a conversation** as text+audio. — **M**
- **Glossary hotkey** (press G, type pinyin/hanzi/English). — **S**
- **Bookmark words in-world** (3D pin on a prop's word). — **S**
- **Voice commands** (打开手机 / 去厨房 via mic). — **L**
- **AR mode** (WebXR/camera passthrough on phones). — **L**
- **Annotatable map** (drop pins/notes, teaches station names). — **S**
- **Multiple save slots/profiles** + **kids mode** (larger UI, no money pressure, pinyin always on) + **tourist mode** (no SRS decay, pure exploration). — **M** / **M** / **S**

### Content / region
- **Xi'an** (兵马俑/城墙, 历史/朝代/皇帝 vocab) + **Chengdu** (熊猫/茶馆/麻辣 hotpot) as flyable cities. — **L**
- **Regional dialect encounter** — 侬好 already a vocab entry; generalize into 上海话/四川话/广东话 dialect notes; dialect-aware Bund NPC barks. — **M**
- **Subway map that grows** as you visit cities; teaches 换乘/终点站. — **M**
- **Historical Beijing "文化" tab** on word cards for 石狮子/胡同/四合院/灯笼. — **S**
- **Enterable 四合院 courtyard** (影壁/正房/厢房) + **temple/古刹 scene** (香/拜/佛/钟楼). — **M** / **L**
- **Night market scene** (time-gated post-19:00; 小吃摊/烧烤/糖葫芦) + **museum scene** (label-reading-heavy). — **M** / **L**
- **Seasonal menu rotation** at the diner + **regional recipe drops** from cities visited. — **S** / **M**
- **Street-sign reading drills** (readable 招牌 along the hutong via `glyphs.js`). — **M**
- **Fuller PA safety sentences** for listening practice (cut to reduce reverb smear). — **S**
- **Newsstand/newspaper reading thing** — a generated paragraph using only stage-appropriate words, daily-refreshed. — **M**

---

## How this was produced

**Part A (§1–10, ~290 items):** four parallel read-only audits of the actual source — engine/renderer, gameplay/UI/UX/persistence, all 14 scene files head-to-head, learning core/audio/tooling.

**Part B (§11–14, ~400 net-new items after dedup):** four deeper parallel audits — prop-by-prop scene micro-upgrades (line-verified per object), vocabulary/content depth (missing words by category + HSK estimate + grammar patterns + per-NPC topics, every missing word grepped), polish/bugs/consistency (dead code, magic numbers, cross-file duplication, fragile code, doc/CSS/i18n gaps), and new-feature ideas (dedup-tagged against Part A).

Every item was verified against real code with file:line references; overlaps between all eight audits were merged. ~690 distinct items total. No source files were modified.
