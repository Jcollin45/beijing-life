# 北京生活 — Big Updates

A checklist of **large** changes, written 2026-08-03 against the code as it stands after PLAN.md
items 1, 2, 3, 大超市, 药店 and the street's sound bed. Micro-polish lives in `UPGRADES.md`;
`CHECKLIST.md` is machine-generated filler and should be deleted. Nothing here is a tweak — every
item is a week or more, and most of them change what the game *is*.

Each item states what is true now before it states what to do, because half of these look obvious
until you find out the code already does them.

Buildings large enough to have their own contract keep it in their own file, and those files are the
current truth where this one has drifted: `HOTEL.md` + `HOTEL-TENANT.md` + `HOTEL-TODO.md`
(京华大酒店, fourteen scenes — see **N8**), `MALL-TENANT.md` + `MALL-TODO.md`, `TOWER.md`,
`METRO.md`, `AIRPORT.md`, `APARTMENT.md`.

---

## What is actually there (measured, 2026-08-03)

| | |
|---|---|
| JavaScript | 45,596 lines across 38 files, ~2.4 MB uncompressed, no build step |
| Rooms | 18, thirteen built lazily on first entry (`js/lazy.js`) |
| Heaviest rooms | mall 4,976 props · 大超市 2,859 props |
| Renderer | WebGL2, forward, 15 procedural mesh primitives, **no textures** except the glyph atlas |
| Draw submission | one `drawElements` + ~10 uniform uploads + a VAO bind **per prop, per pass**, two passes |
| Culling | per-prop `M.project` frustum test each pass, linear scan of `scene.props`, no spatial index |
| LOD | three tiers on figures and animals; **none on props** — a prop is full geometry or absent |
| Dictionary | 958 rows |
| Interactables | 332 things |
| Dialogue | 26 understood conversations, longest script 3 turns |
| Quiz formats | 1 — multiple choice (recognise, or pick the hanzi) |
| SRS ceiling | interval maxes at **6 hours**; a word retires permanently at n=9 |
| Input | mouse/keyboard only — no mic, no touch controls, no gamepad |
| Save | one slot, `bjlife.save.v1`, localStorage |

Two facts from that table are the whole argument for the two headline items below: a Chinese game
that **cannot hear you**, and a room that spends ten thousand draw calls a frame to draw four
thousand boxes.

---

## The ten that matter most

If only ten of the ~160 items below ever land, these:

1. **G1** — instanced draw submission. 10k draw calls → ~40.
2. **L1** — an SRS that survives the night. Six hours is not spaced repetition.
3. **C1** — speech recognition. The game teaches you to read and listen and never once asks you to speak.
4. **G12** — materials. Fifteen untextured primitives is the single biggest thing between this and looking real.
5. **C4** — dialogue volume. 26 conversations cannot carry a game about talking to people.
6. **L4** — production recall (typing pinyin/hanzi), not four buttons.
7. **G6** — a spatial index. The frustum scan is O(props) twice a frame.
8. **S1** — a city that keeps its own hours everywhere, not just at the breakfast stall.
9. **U1** — onboarding. Nothing teaches the player what the game wants from them.
10. **X1** — a release build. 2.4 MB of plain files is a dev decision shipped as a product decision.

---

# Part 1 — Graphics & renderer

The renderer is good-looking and structurally naïve. Everything below is about the second half.

## 1.1 Draw submission — the big one

- [ ] **G1** — **Instanced rendering.** Every prop is its own `drawElements` with ~10 uniform
  uploads (`gl.js:1940`), and the scene is walked twice (shadow + main, `game.js:7692`). The mall
  is 4,976 props. Group by `(mesh, mode)`, push model/color/scale/alpha into a per-instance buffer,
  draw with `drawArraysInstanced`. Target: **under 50 draw calls per pass** in the heaviest room.
- [ ] **G2** — **Static merge per room chunk.** Most props never move. Bake immobile props of one
  material into merged VBOs at build time, chunked spatially so culling still works. Complements G1;
  do it after, and only where G1 leaves cost on the table.
- [ ] **G3** — **Sort by state.** Consecutive props with the same mesh still rebind the VAO. Even
  without instancing, sorting `scene.props` once at build time by `(mesh, mode)` is a free win and a
  prerequisite for G1.
- [ ] **G4** — **Uniform buffer objects.** Per-frame constants (view, projection, light, weather,
  daylight, time) are re-uploaded per draw. One UBO bound once per pass.
- [ ] **G5** — **Cheaper frustum test.** `M.project` is a full 4×4 multiply per prop per pass.
  Extract six planes once per frame and test the bounding sphere against them.

## 1.2 Spatial structure

- [ ] **G6** — **Spatial index.** `scene.props` is a flat array scanned end to end, twice a frame,
  in every room. A uniform grid (rooms are boxes; a 4 m grid is enough) turns both passes into a
  visit of the cells that intersect the frustum / light box.
- [ ] **G7** — **Portal or room-graph occlusion.** The mall's atrium can see six shopfronts it
  cannot see into. Interiors behind a shopfront, carriages behind a bulkhead, and the flat's other
  rooms are all drawn and then overdrawn. Cheap and very large in the mall and the terminal.
- [ ] **G8** — **Prop LOD.** Distance culling exists (`smallFar`/`smallR`) but it is binary — a
  chair is fully detailed or gone. Two tiers per prop family (a shelf of 168 boxes at 20 m is one
  box) would let the small-prop cull distance go much further out, which is what makes the big
  rooms feel big.
- [ ] **G9** — **Impostors for the far city.** The skyline, the campus blocks and the far end of the
  road could be a handful of billboards regenerated on movement instead of geometry.
- [ ] **G10** — **Persistent culling results.** The camera moves slowly and props do not. Cache
  visibility per grid cell and re-test only cells near the frustum edge.

## 1.3 Materials & surface

- [ ] **G12** — **Textures.** There are none. Every surface is a flat colour shaped by one of ~18
  `uMode` branches in the fragment shader (`gl.js:257–692`). This is why the game reads as
  beautifully-lit cardboard. A single 2K albedo+roughness atlas covering the twenty surfaces the
  city is actually made of — brick, grey render, concrete, asphalt, tile, wood, painted steel,
  laminate, fabric, glass, paper — with a `rect` per material exactly like the glyph atlas already
  does, is the highest-value visual change in the project.
- [ ] **G13** — **Normal maps.** Brick, roof tile and paving read as flat under the existing shadow
  and AO because they are flat. Tangent-space normals off the same atlas.
- [ ] **G14** — **Roughness/metalness split.** `uGloss` is one scalar per draw. Steel, wet asphalt,
  glazed tile and painted plaster all need it to vary across a surface.
- [ ] **G15** — **Triplanar world-space detail.** Cheapest possible route to G12 for large surfaces:
  no UVs required, and the meshes have none.
- [ ] **G16** — **Decals.** Grime at the base of walls, tyre marks, kerb wear, painted road
  markings, posters, shop grilles. A decal system is what makes procedural cities stop looking new.
- [ ] **G17** — **Emissive materials as a first-class mode.** Neon, LED boards, fluorescent tubes
  and shop windows all currently borrow `mode 1` and a `glow` scalar. Making emission a material
  channel would let the night city grade properly.

## 1.4 Lighting & shadows

- [ ] **G18** — **Cascaded shadow maps.** One map, one box, one caster-height cap that deliberately
  discards anything above 2-ish metres (`gl.js:1960`, and the comment explains why). Two or three
  cascades remove the cap, so the six-storey block casts the shadow it should, with better
  resolution near the camera.
- [ ] **G19** — **Local lights.** There is one directional sun and one `setBulb`. A night market,
  a metro platform, a shop interior and a cabin are all lit by dozens of local sources being
  faked. Clustered forward shading (a froxel grid) is the standard answer and fits this renderer.
- [ ] **G20** — **Shadow-casting local lights** for the few that matter — the bulb in the flat,
  the cabin's reading lights, the market's overheads.
- [ ] **G21** — **Real ambient occlusion.** There is a screen-space AO (`setAO`) plus hand-placed
  fake contact shadows (`mode 2/5/8`). Bake per-room AO into the merged geometry from G2 and the
  faked discs can go.
- [ ] **G22** — **Sky-light irradiance probes.** Interiors take their ambient from a global sky
  colour, so a windowless room is lit by a sky it cannot see. A handful of probes per room, baked
  at build time.
- [ ] **G23** — **Bounce light.** One cheap approximation (a hemispherical ground-colour term
  already exists in `setDaylight`) extended to per-room dominant colour.

## 1.5 Post & atmosphere

- [ ] **G24** — **Volumetric light.** Beijing haze, a metro tunnel, low sun down the hutong, the
  cabin's window shafts. The depth buffer already exists for AO.
- [ ] **G25** — **Depth of field** on the card/talk/notebook overlays. The UI currently floats over
  a fully sharp world.
- [ ] **G26** — **Proper tonemapping and a colour grade per hour.** Sky keys exist (`SKYKEYS`), but
  the grade is not separated from the lighting, so dawn and dusk cannot be pushed without moving the
  physical light.
- [ ] **G27** — **TAA or FXAA.** MSAA on the scene target is expensive and does nothing for the
  specular shimmer on the glyph atlas and the thin geometry the mall is full of.
- [ ] **G28** — **Screen-space reflections** for wet asphalt, polished mall floor, shop glass.
  Currently faked per-surface.
- [ ] **G29** — **Weather as visuals, not just audio and a wind scalar.** Rain streaks and puddle
  accumulation, snow settling on horizontal faces, fog density by hour and season.
- [ ] **G30** — **Particles as a system.** Steam, dust, exhaust, litter, falling leaves, breath in
  cold air are all bespoke per site (the stall's steamers, `street.js`). One instanced particle pass.

## 1.6 Characters

- [ ] **G31** — **Instanced/batched figures.** Each figure is tens of `R.draw` calls, one per body
  part and garment, with three LOD tiers (`figure.js:460`). In a crowded terminal or carriage that
  is the frame. Batch a figure into one draw per LOD, or skin it properly (below).
- [ ] **G32** — **Real skinning.** The rig is rigid boxes and capsules posed by matrices. A skinned
  mesh with a proper skeleton would fix every joint seam at once and make G31 trivial.
- [ ] **G33** — **Animation blending.** Poses are computed procedurally per frame (`computePose`,
  `activityPose`) with no crossfade, so transitions pop. A small state machine with blends.
- [ ] **G34** — **Faces that do something.** Heads carry hair, beard and glasses but the face does
  not move. Blink, gaze at the player, mouth shapes on the baked speech — the game is about people
  talking and their mouths are still.
- [ ] **G35** — **Hands.** Fingers exist at LOD 0 only and do not close. Every carried object is
  attached to a wrist.
- [ ] **G36** — **Cloth motion.** Coats, skirts, bags and the washing (already swinging) share one
  cheap verlet solver.
- [ ] **G37** — **Crowd variety.** Wardrobe is generated but silhouettes are not — everybody is the
  same height class and build. Body-type variation costs nothing at the rig level.

## 1.7 Camera & presentation

- [ ] **G38** — **Camera collision that slides** rather than hides. Props between eye and player
  are culled (`hiddenProp`), which is a good fallback and a poor default.
- [ ] **G39** — **First-person mode.** For a language game the object you are reading is usually at
  arm's length; the third-person camera fights that constantly.
- [ ] **G40** — **A photo mode.** The project already has twenty screenshot harnesses; the player
  has none.
- [ ] **G41** — **Cinematic framing for conversations.** Talk is a DOM panel over a static camera.
  A two-shot with the speaker framed would cost nothing and change the whole register.

---

# Part 2 — The learning core

This is a game about learning Chinese, and the learning half is the thinnest half.

## 2.1 Scheduling

- [ ] **L1** — **A real SRS.** `IV_FIRST 75s, IV_MUL 2.3, IV_MAX 6h` (`vocab.js:1181`) is a
  within-session drill, not spaced repetition: the longest a word can ever be away is six hours, so
  nothing is ever scheduled for tomorrow, and the schedule is meaningless across sessions. Move to
  day-scale intervals (FSRS or SM-2), keep the in-session drill as a separate short-term queue.
- [ ] **L2** — **Stop retiring words for good.** At n=9 a word leaves review permanently
  (`MAX = 9`). Retirement should mean a long interval, not deletion — a word met three weeks ago and
  never seen since is exactly the word to test.
- [ ] **L3** — **Per-card difficulty.** One global multiplier for every word. 的 and 报销 are not the
  same card.
- [ ] **L4** — **Production recall.** The only question format is four buttons (`game.js:1619`).
  Add: type the pinyin, type/choose the tone, assemble the hanzi from components, write the
  character on a canvas. Recognition-only study is why people can read a menu and not order from it.
- [ ] **L5** — **Listening-only cards.** The voices are all baked already. A card that plays audio
  and asks what was said is the single cheapest new format in the file.
- [ ] **L6** — **Cloze from real sentences.** The game has hundreds of NPC lines; none of them are
  used as study material.
- [ ] **L7** — **Leech handling.** A word failed six times should change treatment, not just come
  back sooner.
- [ ] **L8** — **Separate the four skills.** Reading 药 and hearing 药 and saying 药 are three
  different pieces of knowledge stored as one number (`n`).

## 2.2 Content depth

- [ ] **L9** — **Grammar as content.** 958 rows and they are almost all nouns and set phrases.
  Measure words, 了/过/着, 把, 被, resultative complements, 的/得/地 — the machinery that turns words
  into sentences is not taught anywhere.
- [ ] **L10** — **Sentence patterns as first-class items** with their own SRS records, taught the
  way the vocabulary is taught: from the situation that needs them.
- [ ] **L11** — **Tone drilling.** Tones are displayed and never tested. This is the single most
  common failure mode for learners and the game is silent on it.
- [ ] **L12** — **Character components.** Radical/component breakdown, stroke order, and the
  "you already know two of these three parts" moment that makes hanzi learnable.
- [ ] **L13** — **HSK mapping.** Tag every row with its HSK level so the player can see where they
  stand against a real syllabus, and so gaps are visible to whoever adds rows next.
- [ ] **L14** — **Traditional characters** as a display option.
- [ ] **L15** — **Formal/informal register.** 您 vs 你 is taught nowhere despite being the first
  thing a shopkeeper's line depends on.
- [ ] **L16** — **A vocabulary target per place**, so a room knows what it exists to teach and the
  audit can say when it is incomplete.

## 2.3 Progress made visible

- [ ] **L17** — **A real progress screen.** Words met/mastered/retired exists as counters; there is
  no history, no retention curve, no per-category breakdown, no "you have not seen these twelve
  words in a fortnight".
- [ ] **L18** — **Session summaries.** What you learned today, what you got wrong, what is due
  tomorrow.
- [ ] **L19** — **Export.** Anki deck, CSV. Learners have existing tools and losing this data to a
  cleared localStorage is a real risk (see X5).
- [ ] **L20** — **Difficulty settings for the language, not the game** — how much English help,
  whether pinyin shows, how fast NPCs speak.

---

# Part 3 — Speaking, and characters worth speaking to

## 3.1 The missing half of the language

- [ ] **C1** — **Speech recognition.** There is no `getUserMedia` and no `SpeechRecognition`
  anywhere in the project. The player can never say a word out loud. Web Speech API (`zh-CN`) is
  free and in the browser; scoring can start as crude as "did the recogniser hear the right word".
- [ ] **C2** — **Pronunciation scoring.** Beyond recognition: pitch contour against the baked
  reference for tones, which is the thing learners cannot self-assess.
- [ ] **C3** — **Speak-to-act.** Ordering at the noodle shop by saying it, not clicking it. This is
  the single change that would most justify the whole 3D world existing.

## 3.2 Dialogue

- [ ] **C4** — **Ten times the dialogue.** 26 conversations, longest script three turns
  (`talk.js`), and `Talk.next` retires a turn permanently once answered. PLAN.md item 3 already
  found this: affinity rungs had to be lowered to 1/2/3 because the content could not support
  higher. Everything about relationships is gated on this number.
- [ ] **C5** — **Affinity-reactive lines.** The relationship is tracked, persisted, surfaced in the
  notebook and gates the story — and nobody says anything different at 老朋友 than at 陌生
  (PLAN.md's own stated gap).
- [ ] **C6** — **Context-reactive lines.** NPCs know nothing about the weather, the hour, what you
  are carrying, where you have just been, whether you turned up to work, or what you bought.
  `Story` already records all of it.
- [ ] **C7** — **LLM dialogue** (PLAN.md item 4), constrained to known vocabulary, with the
  scripted trees as the no-key fallback. Note this is the only item that sends anything off the
  machine, and the key-handling decision is still open.
- [ ] **C8** — **Streamed TTS** for anything the model invents; baked audio stays for fixed lines.
- [ ] **C9** — **Conversation as a scored exercise** — did you understand, did you reply
  appropriately, did you use a word you are learning — feeding the same SRS.
- [ ] **C10** — **Group conversation.** Every conversation is one-to-one. A dinner table, a queue,
  a classroom.
- [ ] **C11** — **Accents and speech rate.** One register for everybody. A 北京 taxi driver, a
  20-year-old, and an airport announcement should not sound the same.
- [ ] **C12** — **Interruption and repair.** 你说什么？慢一点。再说一遍。— the actual survival
  vocabulary of a conversation you are losing.

## 3.3 People

- [ ] **C13** — **NPCs with full days.** Routines exist for diner guests and residents
  (`updateDinerGuestRoutine`, `updateHomeRoutine`); most people are static. Give the whole roster a
  home, a workplace, a commute and a schedule.
- [ ] **C14** — **Named recurring characters** you see in more than one place. The neighbour on the
  subway is a stronger memory hook than any flashcard.
- [ ] **C15** — **NPC-to-NPC interaction.** Nobody talks to anybody but you.
- [ ] **C16** — **Relationships that can go somewhere** — a favour, an invitation, a job lead, an
  argument — rather than a rung on a counter.

---

# Part 4 — The simulation

## 4.1 The city's day

- [ ] **S1** — **Opening hours everywhere.** 早餐 now keeps hours (PLAN.md item 6) and it exposed
  how odd everything else is: the bank of shops, the office, the library, the market and the
  pharmacy are all open at 04:00. Hours belong on the thing, checked in one place.
- [ ] **S2** — **The day's shape on the street** — the school run, deliveries, 广场舞 in the
  evening, shutters coming down one by one. Named as still-to-do in PLAN.md.
- [ ] **S3** — **Weekly rhythm.** The week exists now (`career.js`) and the world ignores it.
  Saturday should look different.
- [ ] **S4** — **Seasons.** Weather has wet/snow/wind. Beijing's year — the heat, the dust in
  spring, the winter — is a huge amount of free variety and vocabulary.
- [ ] **S5** — **Festivals.** 春节, 中秋, 国庆. Decorations, closures, greetings, food. The highest
  culture-per-line-of-code content in the project.
- [ ] **S6** — **Crowd density by hour, everywhere.** The station does this properly
  (`stationBusy`, `STAGES = 7`, `game.js:387`); nowhere else does.

## 4.2 Living there

- [ ] **S7** — **Money with pressure.** Rent is a constant (`RENT = 60`). Bills, a deposit, a phone
  plan, running out — a survival game about a foreign city with no financial pressure is a sandbox.
- [ ] **S8** — **Needs with consequences.** Five bars decay and warn (`NEEDS`, `game.js:3297`);
  what happens if food hits zero should be more than a bar being red.
- [ ] **S9** — **Health and illness.** 药店 taught the words and deliberately shipped without a
  system behind them. Catching a cold in the rain, and the words being what fixes it, closes the
  loop that room opened.
- [ ] **S10** — **Cooking.** The flat has a kitchen. Buying ingredients at 大超市 and cooking them
  is the obvious use of the biggest room in the game.
- [ ] **S11** — **Inventory and a fridge.** `carry` is a single slot.
- [ ] **S12** — **The flat as yours** — furniture bought, moved, upgraded; a reason to earn money
  beyond the number going up.
- [ ] **S13** — **Transport with friction.** A metro card that runs out, a bike with a lock, a
  taxi that requires you to say the destination, being late because you took the wrong line.
- [ ] **S14** — **Consequences for the career.** Attendance and rank exist (`career.js`); being
  sacked does not.
- [ ] **S15** — **Bureaucracy.** Visa, residence registration, a bank account, a SIM card. This is
  what actually happens to a person who moves to Beijing and it is entirely absent — and it is
  where the hardest, most useful language lives.

## 4.3 Traversal

- [ ] **S16** — **A continuous street.** Rooms are discrete scenes reached through doors. Whether
  the hutong and the road should be one traversable space is the biggest open question about the
  game's shape — worth deciding deliberately rather than by accretion.
- [ ] **S17** — **A city map that is a map**, not a station list.
- [ ] **S18** — **Bicycles.** The single most Beijing form of transport, absent.
- [ ] **S19** — **Getting lost as a mechanic.** Asking for directions is the classic language
  exercise and there is no situation in the game that requires it.

---

# Part 5 — Structure and progression

- [ ] **Q1** — **More than five chapters.** The arc closes (`story.js`) and then there is nothing.
- [ ] **Q2** — **Quests with steps.** "Three rotating daily goals" plus chapter gates read from
  counters. Nothing sends you across the city to do a specific thing for a specific person.
- [ ] **Q3** — **Failure states.** Nothing can be lost. Missing the flight is the one exception
  (`误机`) and it is the most memorable moment in the game — that is not a coincidence.
- [ ] **Q4** — **Time pressure that is real.** An appointment at 3pm, a shop that shuts at 6.
- [ ] **Q5** — **Difficulty curve.** The airport is available on day one with a day-one vocabulary.
- [ ] **Q6** — **Achievements/milestones** framed as language milestones, not game ones — "you
  ordered a meal without English help".
- [ ] **Q7** — **New Game+ / a second character** with the vocabulary carried and the world reset.
- [ ] **Q8** — **A tutorial arc** — arriving at the airport with no Chinese is the natural opening
  and the game currently starts in a flat you already live in.

---

# Part 6 — Places still missing

Each is `Build.scene` + dictionary rows + baked voices + `Data.USE`, the pattern six rooms already
follow. PLAN.md item 5 lists the first two; the rest are mine.

- [ ] **N1** — **医院.** Registration (挂号), departments, a doctor, a prescription. The other half
  of 药店, and the harder half.
- [ ] **N2** — **银行.** Numbers under pressure, forms, ID, an account. Named in PLAN.md item 5.
- [ ] **N3** — **邮局.** Addresses, parcels, forms.
- [ ] **N4** — **派出所 / 出入境.** Registration and visas — see S15.
- [ ] **N5** — **理发店.** Explaining what you want to somebody holding scissors is a genuine
  language test and everybody remembers their first one.
- [ ] **N6** — **KTV.** Named as optional in PLAN.md. Reading along to lyrics is a real reading
  exercise disguised as the least serious room in the game.
- [ ] **N7** — **健身房.** Named as optional in PLAN.md.
- [~] **N8** — **A hotel.** Checking in, room problems, checking out.
  **The building is built; the loop is not.** 京华大酒店 exists as fourteen registered scenes
  (`hotelB1`, `hotel`, `hotel2`…`hotel12`, `hotelLift`) across eighteen script files, with a real
  ride-state lift, a fire stair, a street seam and a nine-department roster. What N8 actually asked
  for — checking in, room problems, checking out — is still absent: check-in is one `HotelUse` row
  granting `mood:4` (`js/hotel-public.js:1512`), and no hotel key appears in `disrupt.js`,
  `story.js`, `career.js` or `pantry.js`. Remaining work is `HOTEL-TODO.md` section **F** (the stay
  loop: booking, key card, the night, room problems, check-out — a new `js/stay.js`, not more
  `game.js`) and section **G** (cross-location consequence). Contract: `HOTEL.md`. Per-floor brief:
  `HOTEL-TENANT.md`.
- [ ] **N9** — **A neighbour's flat.** Being a guest — the etiquette language 客气 / 别客气 exists
  for, with no situation to use it in.
- [ ] **N10** — **A temple or a museum.** Where the written language gets old and hard on purpose.
- [ ] **N11** — **A wet market** distinct from 大超市 — haggling, weights, the language of
  bargaining, which the game does not teach at all.
- [ ] **N12** — **Depth in the thin rooms first.** `rail.js` (610 lines, 6 things),
  `classroom.js` (327), `library.js` (304), `office.js` (461) are thin against `street.js` (3,326).
  A thin room is cheaper to fill than a new room is to build.

---

# Part 7 — UI, onboarding, accessibility

- [ ] **U1** — **Onboarding.** There is an intro and a how-to panel and nothing that teaches by
  doing. A new player does not know that walking up to things is the game.
- [ ] **U2** — **Explain the SRS to the player.** Familiarity, stages, retirement and due counts
  are all invisible machinery driving what the game shows them.
- [ ] **U3** — **A better notebook.** Search, filter by category/place/HSK, sort, "words I keep
  getting wrong", the sentence a word was learned in.
- [ ] **U4** — **Subtitles with control** — off / pinyin / hanzi / English, per-line replay,
  slower playback. Currently a fixed policy driven by familiarity.
- [ ] **U5** — **Accessibility.** 14 `aria`/`role` attributes in the entire markup, no keyboard
  path through the card and talk panels, no focus management, no screen-reader labels on the HUD.
  Colour-blind-safe need bars. Font scaling — a game about reading small characters.
- [ ] **U6** — **Dyslexia and low-vision options** — glyph size, line spacing, contrast.
- [ ] **U7** — **Full remapping.** Controls are documented, not rebindable.
- [ ] **U8** — **Interface language.** English is hardcoded throughout the UI; the game is for
  learners of every first language.
- [ ] **U9** — **A HUD that can be turned off** for a screenshot or a purist run.
- [ ] **U10** — **Better feedback on being wrong.** "It comes back in 40 s" is a schedule, not a
  teaching moment — say *why* it was wrong when the distractor was near.

---

# Part 8 — Platform & delivery

- [ ] **X1** — **A release build.** 31 files, 2.4 MB, uncompressed, no build step — a deliberate
  dev-loop decision (`package.json`, `index.html`, `serve.py`, ~20 harnesses depend on it) that has
  become the shipping story too. Concatenate + minify + gzip for release, leave the plain-file dev
  path untouched. PLAN.md item 1 flagged exactly this and stopped short of it.
- [ ] **X2** — **Touch controls.** Four media queries exist; input is `pointerdown` plus keyboard.
  There is no way to walk on a phone. A large share of language learners study on a phone.
- [ ] **X3** — **Mobile performance tier.** The quality ladder has four tiers (`perf.js`) tuned on
  desktop.
- [ ] **X4** — **PWA / offline.** A local static page that cannot be installed or run offline.
- [ ] **X5** — **Save robustness.** One slot, one localStorage key (`bjlife.save.v1`), and the
  vocabulary history under another (`bjlife.knowledge.v2`). Clearing site data destroys months of
  study. Multiple slots, export/import, and an autosave rotation.
- [ ] **X6** — **Optional cloud sync**, once X5 exists.
- [ ] **X7** — **Gamepad support.** None.
- [ ] **X8** — **Asset streaming for audio.** `audio/voice/` is 363 entries loaded eagerly.

---

# Part 9 — Tooling and debt

- [ ] **T1** — **Delete `CHECKLIST.md`.** 532 KB of generated placeholders ("ENGINE & RENDERER cat.1
  item 1" × 10,000) from `generate_checklist.py`. It is noise in every search over this repo.
- [ ] **T2** — **One harness runner.** 52 dot-scripts in the root, each spawning its own Chrome, each
  with its own conventions. `node .verify.js` is the gate; make it the only entry point.
- [ ] **T3** — **Fix the stale harnesses.** `.shoptest.js` fails seven subway checks because the
  line grew a seventh station (商务区) on 2026-08-01 — and PLAN.md notes two of those failures hint
  the fare table and exits may genuinely not have been updated for it. Worth a look on its own.
- [ ] **T4** — **The two real cabin regressions** PLAN.md deliberately left failing: the captain's
  briefing no longer overlaps the belt check (8.8 s / 30.9 s vs 27.1 s), and the belt check no
  longer takes the pose away.
- [ ] **T5** — **The `pa` convolver failure** — no reverb on the first announcement. Long-standing.
- [ ] **T6** — **Talk-key collisions, measured.** The item used to read "ten unbaked 小林 clips",
  and a first correction of it — including an earlier version of this entry — blamed a 小林 key
  collision. A run of `.talkcheck.js` with a collision detector in it says both were wrong:

  **小林 is not a talk-key collision, and no 小林 line reports a missing clip.** That part of the
  item appears already resolved; nothing here needs a rebake.

  What the run does find is 4 collisions and 16 missing clips, and the two are the same story.
  `keyFor` (`js/talk.js:1403`) resolves a person to a talk key by name first, so everybody sharing
  a name collapses onto one script and one set of baked clips:

  - `咖啡师` — 阿文 @ office1 and the unnamed barista @ airport. **This is the one costing clips:**
    all 16 "no baked clip" failures are 咖啡师 lines.
  - `同事` — five people: 小赵 @ office, 叶帆 and 钟诚 @ office6, 周妍 and 骆宇 @ officeRoof.
  - `李师傅` — 师傅 @ street and 饲养员 @ zoo.
  - `王师傅` — 师傅 @ diner and 售票员 @ rail.

  Which person owns each name is a data decision in `js/data.js`, so `.talkcheck.js` detects and
  reports the collision rather than picking a winner.
- [ ] **T7** — **Split `game.js`.** 8,229 lines holding the loop, the camera, the UI, the player,
  the NPCs, the needs, the goals, the phone, the subway, the flight, and the save. The scene split
  is done; the hub is not.
- [ ] **T8** — **Split `data.js` and `metro.js` data from geometry**, which is what still forces
  Diner, Zoo and Metro to be built at boot (PLAN.md item 1).
- [ ] **T9** — **Automated visual regression.** 238 `.audit-*.png` in the root are compared by eye.
  `.pixdiff.js` exists; wire it to a baseline set and a threshold.
- [ ] **T10** — **A perf budget in CI.** `.perfcheck.js` walks the quality ladder; nothing fails a
  run when a room gets slower.
- [ ] **T11** — **Move the 238 audit PNGs out of the project root.** The directory is 790 MB and
  almost none of it is source.
- [ ] **T12** — **Type checking.** 45k lines of untyped JS. JSDoc + `tsc --checkJs` needs no build
  step and no source changes, which is exactly the constraint this project works under.
- [ ] **T13** — **Unit tests for pure logic** — `Vocab`, `Career`, `Story`, `Data` — none of which
  need a browser, all of which are currently tested only by driving Chrome.
- [ ] **T14** — **Document the render mode table.** ~18 `uMode` branches are the material system and
  they are documented only by the code that reads them.

---

# Sequencing

The order is not preference; it is what each item makes cheaper for the ones after it.

**First — the two that unblock everything else.**
`G1` + `G3` + `G6` together (instancing, state sort, spatial index): they are one piece of work in
practice, they are the prerequisite for every other graphics item, and the frame budget they free is
what pays for G12, G19 and the crowds. Then `L1`+`L2`: every content item downstream assumes the
learning core actually schedules, and fixing it later means invalidating everybody's history.

**Second — the two that change what the game is.**
`C1` (speak) and `G12` (materials). Both are visible from the first second of play, and neither
depends on the other.

**Third — content, once the platforms hold it.**
`C4` dialogue volume → `C5`/`C6` reactive lines → `C7` LLM. In that order: the LLM item exists to
solve the volume problem, but shipping it before the scripted fallback is good makes the no-key path
worse, and the no-key path is the game.

**Fourth — the world's own logic.** `S1` hours, `S2` the street's day, `S6` density, then the
survival systems `S7`–`S9`.

**Always, alongside.** `T1`–`T6` are small and they are the difference between a green board and a
board nobody reads. `X5` (save robustness) should jump the queue the first time anybody loses a
save.

**Working rules, unchanged:** `node .verify.js` is the gate; never edit source while it runs; every
item ends with the harnesses green, not with "it looked right".
