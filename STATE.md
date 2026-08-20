# Where the work is

Read this first in a fresh session. It holds only what dies with a conversation — what is in
flight, what was just decided, what is half-finished. Everything durable lives elsewhere:

| question | file |
|---|---|
| what am I building next | `MALL-TODO.md` (numbered; briefs cite ranges) |
| how do I write a mall tenant | `MALL-TENANT.md` |
| what will the engine do to me | `.claude/agents/coder.md` |
| how is work verified | `.claude/agents/gatekeeper.md` |
| what does it look like | `ART.md` |
| how do the agents divide up | `AGENT_ARMY.md` |

Keep this file short. If something here stops changing, it belongs in one of the files above.

---

## NOW — read this and stop; the rest of the file is history

This block exists because reading the whole of this file costs about 12,300 tokens, and a lead that
opens it unwindowed pays that on every remaining turn of the session. Measured 2026-08-15. Everything
below this section is kept for its **disproved** levers, which are worth not re-deriving; none of it
is a current instruction. Read it with `offset`/`limit`, and only when you are about to touch the
thing it describes.

**The learning wave (2026-08-15) — four lanes landed and gate-passed, ONE LANE LEFT.** Contract is
`LEARNING-PLAN.md`; it also holds the measured gap list that started this, which is the part worth
reading before adding to the learning layer.

| lane | file | state |
|---|---|---|
| A produce | `js/vocab.js` | **gate PASS** — typed `type` quiz kind, pinyin/tone normaliser, `gradeTyped`, `toneOf`, v3 save migrating v2 and v1. `.typecheck.js` 141/141 |
| C talk | `js/talk.js` | **gate PASS** — 97 written asks re-served instead of retiring for good, plus 26 generated renderings / 58 new clips, all baked. `.talkcheck.js` 4 (all pre-existing `js/data.js` collisions) |
| D survive | `js/survive.js` | **gate PASS** — rent/eviction, hunger→health→collapse, illness, dismissal. `.survivecheck.js` 30-day sim, every fail state reachable and escapable |
| R roster | `js/data.js` | 1 of 5 collisions fixed, 4 referred — `.reports/R-roster.md` |
| P pantry | `js/pantry.js` + dict rows | **gate PASS** — a spoiled lot is reachable, `.spoilcheck.js` 24/24 and failable at 9/24. Dictionary 1,930 → 1,935 |
| W wiring | `js/game.js` | landed: typed card + guard, three-state tone feedback, 打字 and 难度 settings, `Survive.tick`/`rollDay`, health bar, 规矩 panel, escape routes, spoiled-food branch |

**Decisions taken by the lead on 2026-08-15, when the owner handed over all of them:**
1. **`SURVIVE.mode` defaults to `'real'`** (`js/survive.js:98`); `'gentle'` intact and switchable in
   settings. `real.rent.flat` deliberately left at 450 — lane D's own 700–900 suggestion was
   declined and then withdrawn on evidence.
2. **同事 was NOT consolidated.** It would have saved 44 bake lines and cost 48 of 62 clips, leaving
   four named colleagues silent.
3. **`bake_person` no longer re-renders a whole person for one new line** (`.bake-voices.py:403`),
   so a bake is additive by construction rather than by someone checking it against HEAD by hand.

## What this wave learned the hard way — do not re-derive

- **`.speechcheck.js` CANNOT FAIL on a silent generated line.** `missed` only records lines a run
  actually asks for, and generated asks sit behind `GEN_GAP` (150 s) after authored turns are
  exhausted. It returned `fails:[]` over 26 silent NPCs. Use `.talkcheck.js` plus direct manifest
  enumeration for anything generated.
- **The voice bake is not reproducible run to run.** One line measures 2.164 s at HEAD, 1.056 s in
  `.audio-bake/before/`, and 1.258 s in this bake. The cause of the shortening is named —
  `trim(a, floor=0.008, pad=0.03)` at `.bake-voices.py:134`, where `pad` is exactly the 0.031 s
  lead-in against HEAD's 0.52 s — but *why* it differs from the version that produced HEAD is
  unprovable, because **`.bake-voices.py` is untracked**. A build tool that can silently rewrite
  1,313 audio files is not under version control. `给你。` moved more than trimming explains
  (speech span 0.712 → 0.441 s) and is still unexplained.
- **27 clips lost their uncommitted working-tree content and it is not recoverable** — no Time
  Machine destination is configured on this machine. They now hold their committed content, which
  is what the live site already serves, so nothing player-facing was lost. Cause: a `--force` bake
  run whose cleanup used `git checkout --` on a path list mixing tracked and untracked files, which
  git refuses wholesale. **Never clean up a bake with `git checkout` on a mixed path list.**
- **Judge whether a file moved by hashing, never by mtime.** The Desktop is iCloud-synced and `bird`
  runs at ~43% CPU, so timestamps churn on their own. An earlier reading of this as "a second
  session is writing `js/game.js`" was wrong and held a lane back for nothing.

**Verified before any push:** every one of the 1,365 manifest entries matches its file's real
duration to within 50 ms, 0 files missing; no leading-slash asset paths in `index.html` or `js/*.js`;
`.nojekyll` present.

**STILL NOT DONE, and both are the next actions:**
1. **Nothing has been pushed.** `git log -1` is `60d6dca`, so **no behaviour in this wave has been
   read off `https://jcollin45.github.io/beijing-life/`** — which is the only place this project
   counts a thing as verified.
2. **Frame rate is unmeasured for the whole wave.** The machine has been on battery power, which
   `.fpscheck.js` refuses to measure on, at load averages between 15 and 55 on 8 cores. Gate 2's
   86 fps and 58 fps readings are **void, not noisy**. "60 fps or above, everywhere" is standing
   constraint 1 and it is currently unverified for `js/game.js`'s new per-interaction work.

**Owed and not measured:** a frame-rate number for the street district and an emissive-quad census
(tickets E1/E2 in `STOREFRONT-UPGRADES.md`); the `uploadRig` budget fix of 2026-08-14 has **no frame
time behind it at all**; per-word audio for a tone drill does not exist and would need an offline
bake.

**Hand off at ~400 turns or 150k context, whichever comes first**, and do the big orientation reads
inside a subagent — a lead that reads pays for it on every later turn.

---

## Standing constraints

1. **60 fps or above, everywhere.** The owner's first requirement; outranks any visual gain.
2. **No real brand names**, either language, anywhere. Invented Chinese names only.
3. **No git.** No rollback. Back up before bulk edits; never leave a file unparseable.

## Current state — 2026-08-08

### TRELLIS.2 offline asset authoring — 2026-08-13

The requested integration targets **TRELLIS.2**, not the original TRELLIS. The official source is
cached outside the runtime tree at `.cache/trellis-src/TRELLIS.2`, pinned to
`75fbf0183001ed9876c8dbb35de6b68552ee08bd`; model weights are deliberately not cached on this
Apple M3 machine. `tools/trellis/` now provides pinned download, Linux/NVIDIA generation, and a
fail-closed PBR GLB-to-game-glTF staging bridge. It ships no model, CUDA code, inference, or network
dependency to players. `npm run trellis:check` is the browser/GPU-free contract gate.

No TRELLIS.2 output is in `Assets.MANIFEST`. Candidates remain under
`assets/_staging/trellis/`, marked `productionEligible:false`, with source/GLB hashes and revision
provenance. The stock generator is research-only for this project: BRIA RMBG-2.0, nvdiffrast/
nvdiffrec, and the cubvh path have commercial-use/license blockers or unresolved scope. Promotion
requires licensed/replaced worker dependencies plus the normal visual, topology, collision,
interaction, image, triangle, and isolated PLAY-performance reviews. The official ZeroGPU demo was
tried with an unbranded generated helmet reference but timed out before inference because no GPU was
available; a real pilot GLB still needs a supported Linux/NVIDIA 24GB+ worker or authenticated hosted
GPU. Do not bypass the generation sidecar or importer review flags to fake that result.

**Mall wave 1 in flight.** Seven coder agents, one writer per file, across `js/mall.js` and the
eighteen `js/mall-*.js` tenant modules. A gatekeeper agent is auditing them *and* the lead's own
work. `js/game.js`, `js/data.js`, `js/vocab.js` are lead-owned and must not be edited by tenants.

**Landed and verified:** real trademarks removed from the PA and voice re-baked (316 clips, 0
failed); "40 restaurants" corrected to five; three duplicate dictionary headwords removed
(`鸳鸯锅`, `份`, `瓶` — the latter two were not on the original list); cinema tickets and full
itemised receipts now survive save/load; an unpaid basket deliberately does not, and says so; the
mall ATM is wired to the bank account.

**Written but not yet green:** `.patruth.js` — checks every PA claim against the building
(trademarks, a baked clip per line, floor claims, weekday gating). Expect the weekday assertions to
fail until the shell agent lands the gate; that failure is correct.

**THE MALL IS AT 42 FPS.** Corrected 2026-08-08. The earlier "30 fps, GPU-bound on rig memory"
reading was taken with `SETTLE_MS=1800`, while two rigs were still streaming, so it sampled load-in
as steady state. At `SETTLE_MS=9000`: med 33.3 → **23.8 ms**, p95 114.6 → **43.4 ms**, gpuMed
42.15 → 20.33. **The rig-memory theory is dead** — `rigGpuMiB` sits at 310–318 in every config,
including the ones that hit 75 fps, so it is not what is costing the frame. Still short of the
16.7 ms the 60 fps requirement needs, by about 7 ms. Board task #16.

Two cautions on that harness, both learned the hard way:
- **Single runs cannot resolve less than about 4 ms.** A minPx ladder came out non-monotonic
  (3 → 63 fps, 6 → 54, 9 → 57, 12 → 70), which is impossible if real, so anything under ~5 ms of
  separation is noise. Repeat before trusting a small delta.
- **`gpuMedMs` is not a serialized per-frame number.** In the no-NPC run it read 23.21 ms against a
  13.7 ms frame — the timer queries pipeline across frames. Use it as relative signal; `med ms` is
  the trustworthy column.

**What the frame is made of** — 3 repeats each, medians, and this table replaces an earlier
single-sample one that was substantially wrong:

| ablation | runs (med ms) | verdict |
|---|---|---|
| **baseline** | 15.2 · 16.7 · 16.9 · 18.2 · 21.9 · 30.9 | **wildly bimodal — 2× on one config** |
| no props (0 of 35,805) | 12.6 · 12.4 · 9.8 | **real**, ~4–6 ms, tight across repeats |
| no NPCs | 13.0 · 12.6 · 10.8 | **real**, ~4–6 ms, tight |
| scene tick off | 14.9 · 18.4 | **NOISE — straddles the baseline** |
| AO off *and* post off | 19.9 · 14.5 | **NOISE — does not reproduce** |
| minPx 6 / minPx 12 | 18.4 · 18.9 · 19.3 / 20.7 · 19.2 · 18.1 | **NOISE**, ~1 ms from baseline |

**The odd thing worth chasing: removing *either* props or NPCs collapses the variance.** Baseline
ranges 15.2–30.9 ms on an identical configuration, but both ablations are tight (9.8–12.6 and
10.8–13.0). Whatever makes a bad frame bad needs both populations present. Nobody has explained
that yet, and it is the most interesting thread left.

**p95 never approaches 16.7 ms in any configuration measured** — not with zero props, not with the
tick off, not with no NPCs (24.7, 22.4, 26.9, 23.7). The harness's own pass criterion is
`p95Ms <= TARGET_MS`, so on that criterion the mall does not pass by removing content, and the
median is not the thing standing in the way.

**The quality ladder does not rescue p95 either.** Measured across three tiers, `LEVEL` 0/1/2:

| tier | med ms | p95 ms |
|---|---|---|
| 0 (max) | 17.2 · 15.6 | 24.2 · 21.9 |
| 1 | 14.0 · 15.4 | 20.0 · 24.2 |
| 2 | 11.5 | 18.8 |

Dropping two whole quality tiers buys about 5 ms of median and **almost nothing on p95** — 24 ms
down to 19 ms, still above the 16.7 ms bar. So the spikes are not made of the things the ladder
turns down (render scale, shadow size, bloom, AO). Whatever produces them survives every content
ablation and every quality tier, which is the single most useful fact in this whole investigation
and the thing the next person should chase. Do not go back to shaving geometry.

**And it is not the machine.** `library` on the same box, same harness, same settings: med 4.4 and
3.4 ms, p95 9.1 and 10.4 ms. The 16.7 ms bar is comfortably reachable here, so the mall's p95 is
the mall's, not a laptop that cannot hold a frame.

### The whole-game sweep, and what it means for "60 fps everywhere"

All twenty places, one pass, 2026-08-08. **Nineteen of twenty fail. `library` is the only room in
the game that passes.** Worst p95 first:

| place | med ms | p95 ms | props | calls |
|---|---|---|---|---|
| mall | 27.5 | **79.8** | 35,805 | 327 |
| airport | 20.5 | 66.5 | 5,629 | 209 |
| cabin | 21.5 | 58.9 | 1,826 | 168 |
| street | 28.9 | 58.6 | 15,141 | 393 |
| metro | 19.6 | 57.4 | 2,509 | 172 |
| home | 21.1 | 53.2 | 22,353 | 165 |
| market · park · zoo · bund | 18.6–20.1 | 49–53 | 1,187–2,661 | 47–255 |
| train · nightmarket · office | 17.3–18.9 | 40–47 | 1,040–1,594 | 61–358 |
| diner · rail · campus · classroom · shop | 7.8–15.4 | 36–40 | 334–1,504 | 50–191 |
| **library** | **3.9** | **14.4** | 400 | 58 |

**Read this as a ranking, not as absolutes.** A back-to-back sweep thermally degrades the machine
even with the harness's cooldown — the mall reads 27.5 ms here against 15.6–17.2 ms measured on its
own minutes earlier, and `park` 19.8 against 11.6. `.fpscheck.js` documents this in the comment
beside `setRenderScale(0.1)` and it is the reason that cooldown exists. **Isolated runs are the
only trustworthy absolutes.** The ranking survives, and on it the mall is genuinely the worst room
in the game for spikes.

**So "the mall misses 60 fps" was never a mall problem.** On the harness's own criterion
(`p95Ms <= 16.7`, vsync off, ladder frozen at tier 0) every room but one misses it, including a
classroom with 334 props at 65 fps median. Three things follow, and the owner should decide the
first:

1. ~~Is p95-at-tier-0-with-vsync-off the right bar?~~ **Owner decided, 2026-08-08: measure real
   play first, then re-baseline every room.** `PLAY=1` now does that — see below.
2. **This is an engine question, not a room question.** Nineteen rooms do not have nineteen
   separate content problems. Shaving props out of the mall cannot fix `classroom`.
3. **The mall is still the worst of them**, and its 35,805 props are more than twice the next
   heaviest room. That is worth acting on regardless of how the bar is settled.

### ✅ THE ANSWER: the mall holds 60 fps in play, at the lowest quality tier

Measured 2026-08-08 in `PLAY` mode on a verified-quiet machine (no other headless browser running):

```
ok   mall    0% late   0/599 frames   tier 3   worst 19.8 ms   181 calls  35,802 props
ok   library 0% late   0/489 frames   tier 0   worst 19.9 ms    58 calls     400 props
```

**The mall never drops a frame for a player.** A perfect 60 Hz lock across 599 consecutive frames,
worst frame 19.8 ms — not one missed refresh. The 60 fps requirement is met.

**It gets there by falling to tier 3, the lowest quality tier.** The library holds the same 60 fps
at tier 0. That is the whole finding: the mall's cost is real and the ladder is paying it in
picture quality rather than in frames.

**And tier 3 is one tier lower than it needs to be.** `PLAY=1 LEVEL=n` pins the tier with vsync on,
which asks the only question that matters: what is the best quality this room can actually hold?

| mall, vsync on, tier pinned | late | frames |
|---|---|---|
| tier 0 高 | 68.9% | 244/354 |
| tier 1 中 | 73.6% | 254/345 — *suspect, see below* |
| **tier 2 低** | **0%** | **0/599, worst 20.4 ms** |

**Tier 2 holds a perfect 60 Hz lock, and the ladder is settling at 3 anyway.** That is not a
cosmetic difference: tier 2 keeps a 768 shadow map, tier 3 has **`shadow: 0` — no shadows at all** —
plus render scale 0.70 against 0.50 and `minPx` 4.2 against 18.0. `ART.md` calls contact shadow "not
optional… the single loudest unfinished signal", and the flagship room is currently running without
any.

Why the ladder undershoots is probably `BLOCK_MIN = 20000` (js/perf.js:157): one failed climb blocks
that tier for twenty seconds, and three failures inside four seconds block it until `forget()`
(js/perf.js:230). During load-in the mall drops several tiers fast — `BAD_RUN` is 2 windows of
500 ms — and a climb attempted while the scene is still streaming fails, which then locks the good
tier out. **This is a guess with a mechanism, not a measurement. Do not write it up as fact** — that
is the exact mistake made four times earlier on this page.

**The block theory above is WRONG, and instrumenting the ladder is what showed it.** `Perf.blocked`
and `Perf.log` were added (js/perf.js) and `.fpscheck.js` now prints the ladder's own decisions
under every `PLAY` row. The mall came back `no block` — the block mechanism never fired — and the
ladder was not stuck at tier 3 at all:

```
mall  tier 3  no block  floor 16.3  raise 18.26
ladder: +8.6s→1(slow 21.76) +10.6s→2(slow 19.11) +15.1s→1(fast 16.64) +18.7s→0(fast 16.67)
        +20.2s→1(slow 25.84 JUST-CLIMBED) +21.8s→2(slow 25 JUST-CLIMBED) +23.3s→3(slow 19.87)
        +26.8s→2(fast) +30.4s→1(fast) +40.6s→1(slow) +42.1s→2(slow) +46.6s→3 +50.2s→2 +55.2s→3
```

**It oscillates across all four tiers roughly every twenty seconds and never settles.** "Settles at
tier 3" was simply where a 25-second sampling window happened to land. Every earlier conclusion on
this page about *which* tier the mall runs at describes one moment of a limit cycle.

### Two real bugs in `js/perf.js`, both fixed 2026-08-08

**1. A single stray short frame poisoned the display floor, permanently.** `floorMs` took the
shortest frame ever seen, guarded only by `ms > 4`. A resumed tab, a scene-build burst or two rAF
callbacks in one tick produces something over 4 ms and far under what the screen can deliver;
`floorBest` moved with it and caps the creep at `floorBest * 1.35`, so nothing walked it back. Since
`raiseAt = floorMs * RAISE_OF_FLOOR`, a floor poisoned to 5 ms asks for a **5.6 ms frame on a
display whose best is 16.7** — unreachable, so the ladder stops climbing for good.
Replayed deterministically, 600 frames at 16.7 ms with one 5 ms frame among them:

| | floorMs | raiseAt | can climb at 60 Hz |
|---|---|---|---|
| before | 6.75 | 13.20 | **no** |
| after | 16.70 | 18.71 | yes |

Fixed by requiring a new floor to be corroborated by a second similar frame, plus `forget()` (which
already runs on every room change) now re-learning the floor, so the worst case is "wrong until the
player walks through a door" rather than "wrong until the tab closes". A genuine 144 Hz display
still learns 6.94 ms unchanged.

**2. The hysteresis was inverted, which is what actually caused the oscillation.** Under vsync a
window average is not continuous: with a fraction *p* of frames missing a refresh it is
`floor * (1 + p)` — 16.7 at p=0, 18.4 at p=0.1. Against the old thresholds that meant **drop above
6.6% late frames, raise below 12%** — the raise band was *wider* than the drop band, so a room
losing 7% of its frames was simultaneously good enough to climb and bad enough to drop. Clamping
`raiseAt` below `DROP_MS` restores a dead zone: raise under 1.3%, drop over 6.6%.

| scenario | floor | raise before | raise after | |
|---|---|---|---|---|
| 60 Hz vsync | 16.7 | 18.70 | 16.91 | **inverted → fixed** |
| slow uncapped | 20 | 22.40 | 16.91 | **inverted → fixed** |
| 144 Hz uncapped | 6.94 | 13.20 | 13.20 | unchanged |

**A third bug, introduced by the second fix and caught by the diagnostic it was meant to serve.**
The clamp went into the decision inside `tick()` while the `raiseMs` accessor kept the old
expression, so a run reported `raise 17.84` while the ladder was actually using 16.91. Both now call
one `raiseThreshold()`. A readout that contradicts the logic it describes is worse than none — it is
precisely what the log was added to stop.

### ⚠ NOT verified — one run said tier 2, the next said tier 3

**Read the retraction below before quoting the tier-2 run.** It was a single sample and this page
has already been wrong four times that way.

### The tier-2 run (30 s settle, quiet machine)

```
foreign browsers at start: 0
mall  1.5% late  9/588 frames  tier 2  blocked 2/0ms x1  floor 16.28  raise 16.91  worst 36.4 ms
ladder: +9.1s→1(slow 143.32) +10.8s→2(slow 25.01) +13.8s→3(slow 19.87)
        +17.4s→2(fast 16.66) +20.4s→3(slow 27.78 JUST-CLIMBED) +42.3s→2(fast 16.67)
```

**Tier 2 instead of tier 3, and it stays there.** The shadows are back: tier 2 keeps a 768 shadow
map where tier 3 has `shadow: 0`. The ladder now makes six moves during load-in and then holds from
+42.3 s to the end, against a pre-fix run that cycled all four tiers every twenty seconds for the
whole measurement. `raise 16.91` confirms the clamp is live and sits below `DROP_MS` 17.8, so the
hysteresis is the right way round.

### …and the 60-second-settle run that contradicts it

```
foreign browsers at start: 0
mall  7.2% late  40/553 frames  tier 3  floor 16.54  raise 16.91  worst 39.3 ms
ladder: … +36.0s→3(slow 18.53) +39.5s→2(fast 16.7)
        +44.3s→3(slow avg 125.2) +48.3s→2(fast 16.68) +49.9s→3(slow avg 43.14 JUST-CLIMBED)
```

Same machine, nothing else rendering, four minutes apart. **One run ends at tier 2, the next at
tier 3.** The tier-2 result was one sample and must not be quoted as the outcome.

**What the second run does establish, and it is the more useful finding: the mall has severe
intermittent hitches.** Those are *window averages* of **125.2 ms and 43.14 ms** on an idle machine
— a 500 ms window averaging 125 ms contains several frames over 100 ms. The ladder is not
misbehaving when it drops on those; it is doing its job. **The remaining problem is the hitch, not
the ladder**, and no amount of threshold tuning will fix a 125 ms frame.

### What five runs actually show

| settle | late | settled tier | blocked tier | browsers |
|---|---|---|---|---|
| 30 s | 1.5% | 2 | 2 | 0 |
| 60 s | 7.2% | 3 | 2 | 0 |
| 45 s | 1.5% | 3 | 2 | 2 |
| 45 s | 3.5% | 2 | 1 | 2 |
| 45 s | 3.1% | **1** | 0 | 2 |

**The settled tier is always exactly one below whichever tier got blocked.** That is the ladder
working as designed — probe up, fail, block, settle beneath — and it is the thing the fixes bought:
before them it cycled all four tiers every twenty seconds and never settled at all.

**Which tier gets blocked is decided by whether a hitch lands during that particular probe**, so the
outcome is stochastic: tier 3, 2, 3, 2, 1 across five runs, median 2. It reached tier 1 once, better
than the tier 2 that pinned measurement says is comfortably holdable (0% late over 599 frames).

So: the ladder is fixed and now converges. **The mall's tier is set by the hitches, and that is the
open problem.** No threshold tuning fixes a 125 ms frame. Look during scene settle rather than during
the hold window — `worst` inside the sampled window was only 33–68 ms while the ladder saw 125 ms
averages earlier. Candidates not eliminated: rig/asset streaming arriving late, GC, shader or
pipeline compilation on first sight of a material.

The best contended reading so far, for reference rather than as a verdict —
`ok mall 1% late 6/588 frames tier 3 blocked 2/0ms x1 floor 15.93` — is worth two observations.
It **passes** the late-frame bar even against eight competing browsers. And the block mechanism is
now firing where it previously reported `no block`: the gap from `+52.1s→3` to `+73.4s→2` is 21.3 s,
which is `BLOCK_MIN` to the second. Under that load tier 2 genuinely fails (windows of 18.45 and
19.14 ms measured *at* tier 2), so dropping is correct behaviour there and says nothing about a
quiet machine. Contention also pulled `floorMs` down to 15.93, which narrows the hysteresis
inversion to 0.04 ms, so that run cannot demonstrate the second fix in either direction.

**A second session sharing this machine is a hazard nobody had accounted for, and it is worse than
GPU contention.** The render gate serialises harnesses within one session; it does not stop a
different session's agents from rendering, and this one saturated four to eight browser slots for
hours. Any timing number taken without checking for foreign browsers first is worthless.
`.fpscheck.js` now warns about them at startup, but it will not refuse to run — read the warning.

**And one long holder throttles the whole pool.** Measured 2026-08-08: `.liftcheck.js` held slot 0
continuously for 26 minutes — it acquires early and releases late, across a real-time lift sequence
— while an exclusive `.fpscheck.js` accumulated the other two slots waiting for it. Net effect: a
three-slot pool reduced to **one usable slot**, queue depth 6–7, and with `WAIT_MS` at 60 minutes an
exclusive request can sit for an hour holding two thirds of the pool idle. That is the design meeting
a pathologically long holder rather than a defect, but it is worth an owner decision: should
`.liftcheck.js` hold a slot while it waits on real-time sequences, or acquire per-render?

**It also edits source while you measure.** A run late on 2026-08-08 came back with the game not
booting at all:

```
TypeError: Cannot read properties of undefined (reading 'js')   at js/vocab.js:1878
ReferenceError: Vocab is not defined                            at paintLabel (js/game.js:1481)
ReferenceError: __game is not defined
```

`js/vocab.js` had been written one minute earlier and parsed cleanly by the time it was read — the
harness had simply caught it mid-write. Nine files were being edited concurrently
(`vocab.js`, `data.js`, `talk.js`, `cast-catalog.js`, six hotel modules). This is the
[[harness-runs]] rule — never edit source while a harness runs — violated *across sessions*, where
neither side can see the other. **A boot failure during a measurement is not necessarily your bug.
Check `find js -name "*.js" -mmin -15` before believing one.**

*The tier 1 row is suspect and needs a re-run.* 73.6% late is **worse** than tier 0's 68.9%, which
is backwards and cannot be true — two other harnesses (`hotelcheck`, `chinesegame-audit`) were on
the GPU during it. The tier 2 row is safe regardless: contention can only make a result worse, never
manufacture a clean 599-frame lock.

So the owner's question is no longer "is the mall fast enough" — it is, and always was. It is
**whether the mall should look like tier 2 rather than tier 3**, and the answer to that looks like
yes, because tier 2 is free.

### The hitch has a named mechanism: a rig tier is uploaded inside one frame — 2026-08-14

Found by reading, not by timing, and it matches the tags the hitch log already caught.

`Assets.uploadRig` (js/assets.js:1298) hands **every part of a tier to WebGL in one call** — an
`R.skinMesh` per part plus a `texImage2D` and a `generateMipmap` per source image
(js/gl.js:3333-3334), all synchronous. It is called from the draw path, on the frame that first
needs that person: `js/rig.js:897` inside `draw()`, `js/rig.js:1015` inside the instanced path, and
`js/game.js:1497` from the load promise, whose `.finally` immediately pumps the next of
`MAX_RIG_LOADS = 2`. Nothing anywhere budgets it.

The gate's own reproduced records are that shape: `wallMs 86, tex 6, mesh 6` walking into the mall
cold, and `wallMs 193.9` with `assets:["MallOpticalCashierMaLijuan.lod.glb"]`. Six textures with
mipmap generation in one frame is a 100 ms frame, and a cast streaming in behind
`MAX_RIG_LOADS = 2` produces a run of them — which is what a 500 ms window averaging 125 ms is
made of.

**It also survives every ablation and every quality tier, which is the property this page says the
answer must have.** The ladder turns down render scale, shadow size, bloom and AO; none of those
change what an upload costs. Dropping props does not remove rig uploads. It explains the *no-NPC*
arm of the variance collapse (no rigs, no uploads, tight repeats) and **not** the no-props arm,
which is still unexplained.

**Fixed, and NOT YET MEASURED.** `uploadRig` now spends at most `UPLOAD_MS = 4` a frame across all
rigs and resumes on the next one, returning `null` until a tier is whole — which `rig.js:892`
already handles by drawing the procedural figure. `opt.whole` bypasses it for the offline harnesses
(`.castruntimecheck.js`, `.fullcastvisual.js`) which ask for three tiers inside one page
evaluation. Check: `.rigmemorycheck.js` — `PASS upload budget · a costly tier took 6 frames, one
part each`, and it fails with `a costly tier uploaded inside one frame` when `UPLOAD_MS` is raised
to 4000, so it can fail. `node .bootcheck.js` clean.

**What is not verified: any frame-time claim at all.** No `.fpscheck.js` run, nothing off
jcollin45.github.io, and the change is unpushed. The machine was not measurable while this was
written — `busyCores 5.58 of 8` against the harness's own 5.00 quiet bar, with another session's
`chinesegame-audit` headless Chrome holding ~295% CPU. The measurement that settles it is a `PLAY`
hitch census on a quiet machine, comparing the `mesh`/`texture` tag counts and worst `wallMs`
before and after.

Everything above this heading is the old, frozen-ladder investigation. It is kept because its
disproved levers are still worth not re-deriving, but **it was answering the wrong question.**

### `PLAY=1` — the mode that measures the game a player runs

Added 2026-08-08 on the owner's decision. It leaves `--disable-gpu-vsync` and
`--disable-frame-rate-limit` off, never calls `perfHold`, and never forces a tier, so the game is
vsync-locked and free to adapt exactly as in play. It reports two numbers instead of a percentile:

- **`latePct`** — frames longer than 25 ms, i.e. that missed a refresh. This is the thing a player
  actually perceives. Pass is ≤ 1%, about one hitch every two seconds. **A rate needs a sample:**
  `PLAY` defaults `HOLD_MS` to 10 s (~600 frames, one frame = 0.17%) rather than the sweep's 2600 ms
  (~155 frames, one frame = 0.65%, at which a 1% threshold is measuring rounding). The first run
  reported "1.9% late" off three frames before this was fixed. `SETTLE_MS` defaults to 15 s for the
  same reason on the other side — the ladder is restarted from tier 0 for every room and has to be
  given time to find its tier before anyone reads it.
- **`settledLevel`** — the quality tier the ladder fell to in order to hold that. A room that keeps
  60 fps at tier 0 and one that keeps it by dropping to tier 3 are both "60 fps" and are not the
  same result. It is reported beside the verdict and never gates it: whether tier 3 looks good
  enough is a judgement, not a threshold.

**Trap, and it was mine: `__game.perfLevel()` turns the ladder off.** The first `PLAY` runs had the
library — the lightest room in the game — coming back `0% late` but at **tier 3**, and a 30-second
settle did not move it. The reason was not slow adaptation. `__game.perfLevel()` is
`Perf.setLevel()`, which sets `auto = false` (js/perf.js:275); the harness calls it after each
cooldown to restore the render scale, so `PLAY` was freezing the ladder at whatever tier the
previous room's load-in had driven it to and then reporting that as the settled tier. The mode was
measuring the exact thing it exists to avoid.

Fixed by restoring through `Perf.setAuto(true)` instead (js/perf.js:284), which re-applies the
current quality, resets to tier 0 and re-arms the warmup clock, so each room is judged from a clean
start. **If a `PLAY` result ever shows a suspiciously low `settledLevel` in a light room, suspect
the ladder has been switched off before suspecting the room.** Quote `settledLevel` with every play
result, and if it has not converged, say so.

Which leaves a genuinely odd shape, and it is worth stating plainly because it is where the next
session should start: **the mall's p95 is about 22–25 ms no matter what you take out of it.** Props
gone: 24.7. NPCs gone: 26.9. Whole scene tick gone (which also silences the PA, the fountain show
and every tenant's motion): 22.4. Two quality tiers down: 18.8. Baseline: 21.9–24.2. Every one of
those removals changes the *median* and none of them changes the *spike*. Whatever is costing the
mall its bad frames is not in `scene.props`, not in `scene.batches`, not the cast, not the tick,
and not anything the quality ladder controls.

The one population never ablated is `scene.things` — the interactable hotspots, of which the mall
has more than any other room. `FPS_THINGS=0` exists in the harness and had not been used. That is
the next thing to try, and if it comes back clean the search should move outside the rAF callback
entirely: `cpuMedMs` only measures what happens *inside* the frame callback, so work scheduled
elsewhere would show up in `medMs` and `p95Ms` while leaving `cpuMedMs` looking innocent — which is
exactly the pattern here (cpuMed ~10 ms against a p95 of 24).

**The real problem is variance, not a missing 17 ms.** The mall's median frame is already 16.7 ms.
It oscillates 46–66 fps, so it fails the requirement by dipping, not by sitting slow. Chasing
median frame time is the wrong hunt; find what makes the bad frames bad.

**Two claims made during this investigation were WRONG and are recorded so nobody rebuilds them:**

- *"AO and post are super-additive, 10.4 ms, an offscreen framebuffer round-trip."* Noise. One
  sample. Re-ran it: 19.9 ms then 14.5 ms. There is no reliable AO/post saving. Do not rewrite the
  renderer on this. (For reference if it is ever measured properly: `js/gl.js:2651` does add a third
  full-size multisampled colour attachment when AO is on, so a cost is plausible — it just is not
  the 10.4 ms that was claimed.)
- *"minPx=12 gives 70 fps."* Noise. A minPx ladder came out non-monotonic (3 → 63 fps, 6 → 54,
  9 → 57, 12 → 70), which is impossible if real. Repeats put every minPx value within ~1 ms of
  baseline. minPx is not a lever.
- *"The mall's per-frame tick is the spike source."* Noise. One run showed 30.9 → 14.9 ms, which
  looked decisive until the next baseline came in at 16.9 and the next tick-off run at 18.4. The
  30.9 ms baseline was the outlier, not the tick-off run the win.
- *"The quality ladder reverts overrides mid-run."* Also wrong, in the other direction — it cannot.
  `.fpscheck.js:206` calls `perfHold(true)` and `js/perf.js:202` returns early on `hold`.

**Every number in this section was taken with the quality ladder FROZEN AT TIER 0.** `.fpscheck.js`
calls `perfHold(true)` and `LEVEL` defaults to 0, so the harness measures the mall at maximum
quality with adaptation switched off — the worst case the game can produce, and not what a player
sees. In real play `Perf` drops a tier when frames are slow. Before anyone rewrites the renderer,
establish what tier the mall settles at in play and whether that tier looks acceptable; "the mall
misses 60 fps" and "the mall misses 60 fps at tier 0 with the ladder held" are different claims and
only the second one has been measured.

**METHOD RULE, learned expensively: this machine has ±5 ms of run-to-run spread, a quarter of the
whole 16.7 ms budget.** One baseline run came in at 10.1 ms and another at 21.9 ms. A single
`.fpscheck.js` run cannot establish anything smaller than about 5 ms. Three repeats minimum, quote
the spread, and never report a lone sample as a finding. Batches of more than ~8 runs exceed a
10-minute Bash timeout; split them.

**⚠ AND SOME OF THAT SPREAD WAS SELF-INFLICTED. Read this before trusting any number above.** At
the end of the session two orphaned headless Chromes were found that had been running for
**41 minutes**, spanning most of the measurements on this page. They were leftovers from batches
killed mid-run: **a killed `.fpscheck.js` leaves its tab alive with the game's rAF loop still
going, and because the harness disables vsync that tab renders flat out forever.** An orphan does
not idle. It competes.

So the ±5 ms spread and the bimodal baseline (15.2 ms against 30.9 ms on an identical config) are
**partly contamination and not purely thermal**, and the ablation table above should be re-run on a
quiet machine before any of its smaller deltas are trusted. The conclusions that survive regardless
are the large ones: the disproved levers were each disproved by a *repeat that contradicted them*,
which contamination makes more likely rather than less. The disproved list is safe. Any positive
finding is not.

Two rules follow, and both are now in `.fpscheck.js`:
- **Before any timing run, check for orphans:** `ps -eo pid,etime,command | grep "[C]hrome.*headless"`.
  Anything older than the current run is stealing the GPU. `pkill -f "remote-debugging-port"` is
  the blunt version, but do not use it while an agent is rendering.
- **Killing Chrome's parent is not enough** — it respawns a renderer from the same profile
  directory. Kill the whole tree by profile dir with `-9`.
- **Never `pkill -f fpscheck`.** It matches the *wrapper shells* of every background batch, so
  concurrent batches kill each other and themselves, which is what created these orphans in the
  first place. Kill by PID, or match `"node .fpscheck.js"`.

**Three of four agents stopped without filing.** The shell agent (#3) and the two tenant waves
(#6 jewellery/fashion/shoes, #10 books/toys/sport/home/beauty) all ended with `.reports/` empty.
**Their edits ARE on disk** — every one of the 21 mall files parses, so nothing was left
half-written — but nobody has verified any of it, including its author.

*The coffee-overlap agent did finish and did file* (`.reports/coffee-overlap.md`), after about 65
minutes. It was declared stopped here twice on the strength of an empty `.reports/` and a briefly
absent browser, and both times that was wrong: **a long-running agent looks identical to a dead one
between harness runs.** Wait for the notification rather than inferring from the filesystem.

Treat this as the normal case rather than as bad luck, and plan for it:

- **A stopped agent's work is landed-but-unproven.** Check the source for what changed rather than
  waiting for a report that is not coming. The coffee agent, for instance, did move the counter:
  `CT` in `js/mall-coffee.js` went from `{b:-2.28, wid:3.52}` (west end −4.04) to
  `{b:-2.00, wid:2.96}` (west end −3.48). Whether that actually clears the jewellers' glass at
  x −18.2425…−18.1975 is **still unverified.**
- **Ask for the measurement in the return value, not only in the report file.** A few lines that
  come back through the agent's own result survive; a report file written at the end does not get
  written if the agent never reaches the end.
- **Never resume tenant work while a timing run is in flight** — and the reverse now matters more,
  because an agent's harness will void an `.fpscheck.js` reading. Two of them (`hotelcheck`,
  `chinesegame-audit`) corrupted the pinned tier-1 measurement above.

**Known open risks:**
- Frame time has **not** been measured since the wave began. Baseline is 4,976 props, the heaviest
  room in the game; the wave ceiling is +60 props per shop. `.fpscheck.js` readings taken while
  other browsers render are void, not merely noisy — measure quiet. This is board task #12.
- `clampMove` tunnelling: several walls are thinner than the 0.1434 m maximum step. Latent at
  60 fps, reachable below 20. Flagged, not actioned.
- Office WCs: ~2,250 cells sealed at z ≥ 4.7 on every floor; unresolved whether toilets with two
  authored doors should be reachable.
- ~~`步步高鞋城`~~ **Renamed 2026-08-08 to `千里鞋城` / QIANLI SHOES**, from 千里之行，始于足下. It
  was not really a question: 步步高 is a real electronics company and the no-real-brands rule is
  absolute in both languages, so this was applying the rule rather than making a call. The new name
  keeps the walking pun, taken from the Laozi line instead of from a firm. Nothing was baked to
  voice under the old name, so no re-bake. **The four characters stay in the Spring Festival
  couplets in `js/home-f3/f5/f11/corridor.js` (万事如意步步高)** — that is the classical idiom the
  company was named after, not a trademark use, and a blanket search-and-replace would have
  vandalised four apartments. Any future brand sweep needs to keep that distinction.

## Dead toolchain

This repo was previously driven by **Kiro**, and `Kiro.app` has been deleted from the machine.
Two things still point at it and should not be trusted or read:

- `CHECKLIST.md` — 533 KB of generated filler for `.kiro/agents/foreman.json`, ~130k tokens if
  opened. Excluded from search in `.ignore`; regenerable with `generate_checklist.py`.
- `.kiro/` — the foreman and sub-agent configs it dispatched from. Superseded by
  `.claude/agents/coder.md` and `.claude/agents/gatekeeper.md`.

vexp was the third casualty: it launched through a Kiro helper binary and was silently dead until
repaired on 2026-08-08 to run under `node`.

## Closing a task

**A task closes on the gatekeeper's verdict, not on the worker's report.** "The agent stopped" and
"the work is verified" are different claims, and on 2026-08-08 the lead closed three tenant tasks
on reports that said, in their own text, that verification had not finished — one agent was still
queued on the gate for its frame times, one had asked for a boot re-run it never got, and one
stated outright that its fps table was invalid.

That is exactly the failure the gatekeeper exists to catch, committed at the board level by the
person running the board. If a report contains the words "once the gate frees up", "needs a
re-run", or "I am not claiming these are valid", the task is not done.

## Session hygiene

Context is the cost that compounds over a long session, because it is re-sent every turn.

- Agents write their reports to `.reports/<agent>.md` and return **a few lines**, not the report.
  A returned report lands in the lead's context and stays there.
- The lead orchestrates and delegates reading. A file the lead opens is permanent; a file an agent
  opens dies with the agent.
- vexp (`run_pipeline`, `get_skeleton`) was found dead on 2026-08-08 — launched via a deleted
  `Kiro.app` helper — and repaired to run under `node`. If those tools vanish from the tool list
  again, check `~/.claude.json` first.

---

## 高层公寓 十八号楼 — performance and assets (APARTMENT-TODO section L, lane 10b, 2026-08-08)

**Budgets, so that a change can be rejected for exceeding one.** Neither existed before; the sweep
row `| home | 21.1 | 53.2 | 22,353 | 165 |` was a measurement, not a ceiling.

- **Draw-call budget for the `home` scene: 200 calls.** Measured 165 at the sweep, so 21% headroom
  for the twelve decks the cast lane is populating. Counts are hardware-independent
  (`.framecost.js:8-11`), so this is enforceable under SwiftShader in the standing suite and does
  not need the Metal harness. Item 416.
- **Per-deck primitive target: 3,200; hard budget: 3,500 built, floor-owned props.** The old 380 ceiling counted source
  spellings of `box(`/`cyl(`/etc., so extracting an unchanged helper made a floor look cheaper and
  glyph expansion was invisible. `.towercheck.js` now measures the primitives that actually reach
  the renderer after every builder and loop has run. The accepted spread is **1,057–3,122**: F2 is
  the peak at 3,122, followed by F12 at 3,024 and F7 at 3,007. The extra 378 props at the current
  peak are reserved for measured, interactive additions; the draw-call and frame-time budgets still
  apply independently, because one transparent or animated prop can cost more than many batched
  opaque ones. A 2026-08-13 `PLAY=1 .fpscheck.js homeF0 homeF2 homeF7 homeRoof` run held F0, F2
  and F7 at tier 0 with 0 late frames. Nine ordered alpha groups then batched the roof's skyline
  washes without changing its 3,024 props: calls fell from 144 to 99, late frames from 2.6% to 0%,
  and the roof returned from tier 1 to tier 0. The 3,500 ceiling therefore applies uniformly; it is
  still guarded independently by draw-call and live frame-time checks. Item 417.
- **Whole-game authored-scene headroom is proportional, not a global 3,500.** Street keeps its
  existing 22,000-prop ceiling (19,556 current), and the mall keeps its per-tenant reviewed-growth
  limits. `nonstreet-scene-static-check.js` now catalogues all other 77 authored scenes against
  built renderer primitives: each gets 15% reviewed growth, rounded to 50 props and bounded to
  100–600, while any older tighter owner cap remains the effective maximum. That leaves small
  rooms such as Library at 665/765, large general scenes such as Airport at 5,627/6,227, and Zoo
  deliberately frozen at its existing 5,580 blueprint ceiling. Office1 and Office3 use their last
  reviewed exact prop inventories rather than canonising unrelated wall-ownership drift in the
  dirty checkout. This is only safe spend for static detail that joins existing opaque batches;
  new transparency, draw batches, movers/callbacks, lights or NPC rigs still require their own
  reviewed limit and an isolated PLAY run.

  An isolated 2026-08-13 PLAY sample of the heaviest representative destinations confirmed
  **0 late frames and tier 0** for Airport (216 calls), Zoo (224), Campus (142), Metro (175),
  Hotel F1 (90), Hospital F1 (180), FireStation (114), and Office F4 (78). This validates the
  policy as controlled headroom, not permission to spend every scene to its ceiling at once.

**Asset boot cost, measured and then cut.** `preload()` is awaited before the first game script
runs, so anything in `ROOMS` for a `BOOT_ROOMS` room blocks the boot.

- **Five dead `ROOMS` declarations were removed**, and the branded imported cooker was later
  replaced by code-native geometry. A sweep of every literal `model('…'` call now finds **four**
  downloaded names placed in the game — `chinese_stool`, `wall_clock`,
  `plastic_monobloc_chair`, and `wok`; only the first three eager room names total about 560 KB.
- Removing the five dead declarations and the cooker's 588 KB runtime fetch cuts the
  **blocking** boot set from **5,268 KB to about 560 KB (9.4× smaller)**:
  `potted_plant_02` 2,124 KB, `exterior_aircon_unit` 1,356 KB and `ceiling_fan` 640 KB were all in
  boot rooms. `potted_plant_01` (5,612 KB) and `steel_frame_shelves` were background-only.
  The licensed cooker source and attribution remain auditable on disk but have zero runtime refs.
- `Assets.warm()` once fetched **all manifest entries, ~15 MB**. It now follows the declarations
  (`ROOMS` ∪ `DECK_ROOMS`) — four runtime names totaling about 863 KiB. The manifest keeps unused
  neutral assets deliberately: deleting a name from it does not merely stop a fetch, it makes `Assets.get`
  return nothing and `js/build.js:73-75` return null **silently**, which is exactly the failure that
  left the kitchen with a floating spatula for a day (item 411).
- **Eager materials: 695 KB measured on disk** for the eleven, colour + NormalGL (`js/assets.js`
  records 740 KB after repacking). What promoting a staged 1K material costs is now in `ART.md`
  under "What promoting one of these costs at boot": ~2.6 MB unrepacked, ~38× the current
  per-material cost. Item 415.

**Do not re-derive these in the apartment either** (item 429). The disproved list above was written
against the mall and every entry applies here unchanged, because it is the same renderer:
`BLOCK_MIN = 20000` blocking the good tier is **wrong**; `__game.perfLevel()` silently freezes the
ladder (`js/perf.js` `setLevel` sets `auto = false`) and produces a false low tier in a light room;
`minPx` is not a lever; AO/post are not super-additive; the per-frame scene tick is not the spike.
And the standing one from `STATE.md`'s own conclusion: **do not answer a frame problem by deleting
props.** `home` is GPU-bound (gpu med 11.29 against cpu med 3.2), and no content ablation ever moved
the mall's p95.

**`minPx` 18.0 at tier 最低 is now capped to 4.2 indoors** for `home` (`js/perf.js`, `PLACE_MIN_PX`).
Eighteen pixels indoors is the cutlery, the switches, the bowls and the door handles — most of what
makes a flat read as somebody's home — while the expensive levers of that tier (`scale` 0.50,
`shadow` 0) are untouched. **The cap is inert until one line lands in `js/game.js`:**
`Perf.setPlace(name)` beside the existing `Perf.forget()` at `js/game.js:11675`. Queued to the
engine lane as item 422.

**Still unmeasured, and nobody should quote a number for these until they are:** what the
`p.deck`/`hiddenProp` cull costs per frame now that there are twelve decks (item 418); which tier
the flat settles at in `PLAY` (items 423/424); a lift ride (425); the eleven decks other than
deck 2 (426); the `goFloor` hitch (428).

**`home` settled tier — STILL UNMEASURED, and one attempt was aborted rather than
quoted (items 423/424, 2026-08-08, lane 10c).** `PLAY=1 LEVEL=3 SETTLE_MS=15000 HOLD_MS=10000 node
.fpscheck.js home` was queued at **load average 62.92** with **8 foreign headless Chromes already on
the GPU**; it was still waiting for the pool (exclusive, 6 waiting) six minutes later at **load
131.64**, and was killed at **134.11** without ever launching a browser. Nothing was measured and
nothing should be inferred — a run taken at that load would have been the second half of the pair
`STATE.md` already records as *two readings 2× apart from contention alone*. **Do not fill this in
from a contended sample.** The tier question needs the machine quiet, and quiet has to be verified
by load average, not by the absence of a `ps` match.

**What did land is the instrumentation those two items need** (lane 10c, harnesses only, no `js/`
source touched):

- `.fpscheck.js` now has apartment place keys beyond `home`: **`homeF0`, `homeF3`…`homeF12`,
  `homeRoof`** (item 426) and **`homeLift`** (item 425). They are not `setPlace` destinations — the
  tower is one scene — so a row is `home` followed by `World.setFloor(f)` **and** `P.lift`
  together, the pairing `.towercheck.js:245` uses, because `setFloor` swaps the zone and collider
  lists but does not move the body's y. `homeLift` rides repeatedly on a 500 ms interval rather
  than once: `rideSecs` caps at 7.5 s against a 10 s hold, so a single `goFloor` would spend the
  last two and a half seconds measuring a parked car and report it as the ride. The interval is
  cleared before every subsequent place, or it would ride the lift underneath every later reading.
- `.framecost.js` splits every count by `p.deck` (item 430) — `byDeck`, with `shell` (`undefined`)
  and `rides` (`-1`) kept as their own keys so the never-culled populations are not blamed on a
  floor — and instruments the deck change (item 428): `builtProps`, the growth of `scene.props`
  across a `setFloor`/`goFloor`, which is hardware-independent and is the direct test of "a deck is
  being built mid-ride". Its wall clock is **not** a frame time: that harness is SwiftShader, where
  the rasteriser is on the CPU.
- `.framecost.js` **had never taken the render gate** in its whole life, while launching headless
  Chrome. It does now. That is 1 of the 43 ungated Chrome harnesses closed, and it was silently
  invalidating any timing run it happened to overlap.

**Item 419 (defer a deck until `goFloor` asks) cannot be done in `js/world.js` alone, and the
mechanism is worth writing down before somebody else tries it.** `B.finish()` (`js/build.js:226`)
is what turns loose props into the arrays the draw loop actually reads: it assigns `p.batch`,
builds `extra.batches`, packs the cull inputs and computes `extra.loose`/`extra.looseCull`
(`js/build.js:353-407`). `js/world.js:3097` calls it exactly once. **A prop appended after
`finish()` is in no batch and in no packed cull array, so it is not drawn at all** — a lazily built
deck would be an invisible floor, not a cheaper one. Deferring therefore requires a re-`finish`
path, which means re-batching the whole ~22k-prop scene on arrival (a far worse burst than the one
419 is trying to avoid) and a new `api` object that `js/game.js` already holds a reference to.
`js/build.js` and `js/game.js` are not the performance lane's files. **419 is a `js/build.js`
change, not a `js/world.js` change**, and the TODO entry's `@check` — which greps `js/world.js`
for `buildDeck` — points at the wrong file.

---

## Session handoff — the street re-plan (708 turns, and that is the finding)

**Split this session.** The token audit measured it: 708 turns, 408.7k mean context, 781.9k peak,
**289.3M input-equivalents — 98.2% of everything spent today.** The wave of six agents was 1.8%.
Context crossed 150k at turn 102 and ran 606 more turns above it; turns 401–708 alone are 191.1M,
so splitting at 400 with this handoff saves ~128.7M at identical work. The threshold was already
written in `.claude/CLAUDE.md` and was still missed, because nothing fired on it.

**Where the street is.** `STREET-BLUEPRINT.md` Part 4 is CLOSED — 31 action items, 20 built,
11 struck each with the number that struck it, 0 open. Doors on the x 41.60 line went 7 → 3;
frontage orientations 2 → 5; corners 0 → 2; crossings 1 → 2. `STREET-PLAN.html` is the as-built
drawing set. `STREET-TENANT.md` is new and is the contract to read instead of `js/street.js`.

**In flight at handoff:** four `coder` lanes + a `gatekeeper` + this audit, against
`STOREFRONT-UPGRADES.md`. Lanes own disjoint files — street.js / street-retail.js / street-lane.js /
(street-civic.js + street-road.js). Reports land in `.reports/L*.md` and `.reports/GATE-storefronts.md`.

**Disproved this session — do not re-derive:**
- The 夜市 cannot move to x 17.60: it needs a GAP in the courtyard wall and 3.2–6.0 is one; 17.60 is
  mid-run in `brickRun(15.2, 24.0)`.
- The 报刊亭 cannot go on the west footway: the kiosk is 2.10 m in x and the footway is 3.28 m clear.
- The lock-up terrace cannot shift 1.5 m west: `wallJunk` at −16.07..−15.00 and a gas riser at −16.28.
- 五金电器 has no west return: the corner block's west face abuts your block at 11.5 / 12.0.
- The 步行街 holds FOUR units, not twenty — north is 8.80 m clear of the mall, south 6.40 m of the
  hypermarket, and a fifth anywhere is under 1.5 m of frontage.
- The four `wait` NPCs wait 1–3 hours, not eleven. One genuinely waited 05:00–14:00 at a cart that
  trades 05:00–10:30; that one is fixed.

**Not measured, and owed:** a frame-rate number for the district, and an emissive-quad census.
Both are tickets E1/E2 in `STOREFRONT-UPGRADES.md` and both are the gatekeeper's.

---

## Graphics wave, 2026-08-19 — interior ambient and the phone HUD

**Landed and verified:** `3b03e0f` + `be892cc` (index.html, HUD collision fixes, gate PASS off
jcollin45.github.io), `9bf4ca6` + `abe2c45` (js/gl.js, directional interior ambient plus the window
wall recovery). Reports: `.reports/renderer-graphics.md`, `.reports/gate-graphics.md`,
`.reports/gate-graphics-r2.md`, `.reports/gate-graphics-r3.md`.

**Disproved this session — do not re-derive:**
- The flat's corridor was **not overexposed**. Nothing in the frame exceeded 80% luminance; 91% of
  it sat in one 0.4-wide band. It was *compressed*, and the cause was that on a vertical surface
  `up` and `down` are both 0, so the surviving ambient term had no dependence on facing and every
  wall in every interior rendered at one identical value.
- **The luminance-split metric is confounded and should not be rebuilt.** Frames are not
  geometrically symmetric and the HUD contaminates two bands. Round 2 established this after
  round 1 leaned on it.
- **A CSS max-height on `#goals,#map` cannot bound the phone's bottom band.**
  `#map:not(.is-collapsed)` at index.html:1185 is (0,2,0) and beats a bare `#map` at (0,1,0)
  regardless of source order. The band is bounded by the accordion in `setPanel` instead — under
  760px, opening one of needs/goals/map/keys collapses the other three — so the prompt yields to
  an open panel rather than the panel being capped.
- **`env(safe-area-inset-*)` was dead for the whole stylesheet** until `viewport-fit=cover` was
  added to the viewport meta. Nine references were silently resolving to 0 and falling back to
  their px floors, so every offset tuned against them was tuned against a fallback.
- **`js/mall.js` is not missing a `WIN`.** It declares one at `js/mall.js:223` and exports it by
  ES6 shorthand at 5853; a `grep "WIN *:"` misses shorthand. Recorded because it was reported as
  missing once already.

**Traps worth keeping:**
- A check that cannot fail is the default outcome, not the exception. Round 2's first opacity test
  passed in **every** state including the control, because `index.html:237`'s
  `transition:opacity .15s` makes an immediate computed read return the pre-transition value.
  Break the thing before trusting the check.
- The render harness **cannot hold the cabin**. Three attempts across two rounds ejected to
  `bund`/`diner`/`home`; a frame named for a room is not evidence it is that room, so validate
  `where()` on both sides of every capture.
- `.audit.js` never echoes its URL and defaults to `127.0.0.1:8000` (`.audit.js:2296`), so a PNG
  on disk carries no proof of origin. Same for `.fpscheck.js:850` and `.bootcheck.js:125`, the
  last of which has no override at all.
- `window.__game.light` exists but is **not a function**; a round-3 script died on that assumption.

**Frame rate cannot be measured reliably on this machine, and that is the wave's real blocker.**
Load average hit **59.84 / 44.50 / 22.56** on 8 cores during measurement, and a bare `ps -Aro` took
over 120 s to return. Three contributors, in the order they actually mattered — the first was
misdiagnosed here at first and the correction is the useful part:
- **Orphaned headless Chrome from the harness itself.** One `--headless=new` process at **75.7%**
  with its node parent already gone, plus a helper at 38.3%. `.fpscheck.js` does not always reap
  its browser. **Check `pgrep -f headless` and kill strays BEFORE measuring** — a previous run's
  leak is the most likely reason a fresh run looks slow.
- **Unrelated user work on the same box.** A `zgen.py` job at 20.6% for 14+ minutes. Nothing to do
  with this repo; it simply means the machine is not always available for timing, and the harness's
  `machineStable`/`windowQuiet` conjuncts are what catch it.
- **iCloud, but only in spikes, not sustained.** The repo sits on an iCloud-synced Desktop and
  `bird` was caught at **65.9%** right after this session restored 1,372 `.m4a` files in one
  `git checkout -- audio/voice/`. It fell back to **0.0%** while load stayed high, so `bird` is a
  spike on large writes, **not** the standing cause. An earlier version of this entry blamed iCloud
  for the whole thing; that was wrong and is corrected here so nobody re-derives it.
- Do **not** suspend `bird` — it hangs other apps at launch. Wait out the spike instead.
- Do not run `brctl status` to check sync progress; it blocks indefinitely when the provider is
  busy and it hung a shell here.

**`REPEATS` is the wrong knob for warm rows.** `REPEATS=3` runs three windows inside ONE browser —
the harness calls it "the cheap band, not the exit criterion's isolated runs" — so `warm` stays
`n=0` and every row comes back `windowQuiet:false`. It *removes* trustworthiness rather than adding
it. Warm/isolated rows need `RELOAD`/`WINDOWS`, not `REPEATS`.

**Certification is `pass && trustworthy`, and battery was never the only blocker.** `.fpscheck.js`
:1465. `trustworthy` is eight conjuncts — quiet, machineStable, windowQuiet, rigsSettled, onMains,
notSoftwareRenderer, notInjected, pinHeldIfAsked. Both a coder lane and a gate this session read
`certified:false` as "on battery" and stopped there; on mains it was still false, from
`rigsSettled:false` (home), `machineStable:false` (mall), and `pass:false` everywhere.

**The one trustworthy row of the session**, live origin, `REPEATS` unset, load1 4.66, `bird` not yet
saturated: **street `trustworthy:true`, `pass:false`, med 17.8 ms, p95 24.2 ms, 4.3% late.** It is a
COLD row (`warm:n=0`), so it carries shader compile and streaming, and there is no before/after — it
establishes the live site misses budget on the street, not that the ambient change caused it. It
does refute Lane A's "0 late frames in 2,495"; the gate was right to reject that claim.

**Not measured, and still owed:** any **certified** frame number. The machine was on battery for the
whole wave and `.fpscheck.js` refuses to certify on battery, correctly. Live-origin uncertified
readings: home med 7.3 / p95 15.2, street 8.7 / 17.4, mall 11.7 / 26.1. Lane A reported 0 late
frames in 2,495; the gate measured 4 late in the mall and did not accept the claim. Also owed: a
visual check of the cabin, and of the firestation/hospital east-west wall pair.
