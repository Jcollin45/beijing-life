# Agent Army — Build Plan for 北京生活

A concrete layout for a fleet of AI coding agents that complete `UPGRADES.md` (603 items) in parallel *without breaking each other*. Designed against the real structure of this codebase — not a generic template.

> **The worker role in this document now exists as a real, reusable agent:** `.claude/agents/coder.md`.
> It carries the engine's collision/geometry traps, the self-verification protocol and the render-gate
> discipline, so a worker no longer depends on whoever writes its brief getting those facts right —
> which has gone wrong before. Spawn it by name (`coder`) instead of hand-writing a briefing.

The central problem is **contention**: 13 scene files are independent, but `game.js` (the `USE` table, `NPCS` array, main loop) is the one file nearly everything touches. A naive "give every agent the whole repo" approach means two agents rewrite `game.js` at once and you get a merge nightmare. The design below solves that with a **divide-by-file-ownership + a serial hub for the contention point + a verification gate**.

---

## The shape of the problem (why this design)

Verified facts about the codebase that drive the layout:

1. **`game.js` is the single chokepoint.** The `USE` table (~440 lines) and `NPCS` array (~560 lines) live there. Almost every gameplay/content item in `UPGRADES.md` needs to add a row to one of them. This file **cannot be edited in parallel**.
2. **The 13 scene files are independent** (`world.js`, `street.js`, `shop.js`, `diner.js`, `office.js`, `park.js`, `campus.js`, `classroom.js`, `metro.js`, `rail.js`, `airport.js`, `train.js`, `shanghai.js`). Each owns its own props and `thing()` calls. **These can all be edited in parallel.**
3. **`vocab.js` is the second chokepoint** — adding dictionary entries. Most content items touch it. Also serial.
4. **There is a working verification oracle already: `.audit.js`** renders any scene to a PNG via headless Chrome and reports JS/WebGL errors. This is the gate that lets agents work unsupervised — an agent can render its own scene, inspect the PNG, and know it didn't break anything, *without a human*.
5. **There is no git repo.** So there is no rollback. This makes the verification gate and the serialization discipline *more* important, not less — a bad parallel merge can't be `git reset`.

Implication: the architecture is a **hub-and-spoke with a serial queue at the hub.** Spokes (scene agents) run fully in parallel; the hub (one game.js/vocab.js agent) processes contention edits serially; a verification agent gates every merge.

---

## The roster (9 agent roles)

### Tier 0 — Command (1 agent, you-supervised)

#### 🎖️ The Foreman (orchestrator)
- **Owns:** nothing. Touches no code.
- **Job:** Read `UPGRADES.md`, split it into batches, dispatch batches to worker agents, collect their work, run the Verifier, accept/reject, and maintain the master task board (`TODO.md`).
- **Runs:** always-on, single instance. Every other agent reports to it.
- **Key discipline:** never lets two workers edit the same file in the same batch. It holds a **file-lock ledger** — before dispatching a task it marks the target files busy and won't dispatch a conflicting task until the lock clears.
- **Why a separate agent:** so you talk to one thing, not nine. You say "do §11 street.js" and it handles the rest.

### Tier 1 — Parallel workers (run many at once, file-scoped)

#### 🏗️ Scene Builders (×13, one per scene file)
- **Owns:** exactly one `js/<scene>.js` file. Read-only access to `build.js`/`gl.js` for reference.
- **Job:** the prop-by-prop items in §11 for that scene, plus that scene's share of §7. e.g. the `street.js` agent does all 40 street items: tuck the breakfast stools, fix the baozi, add the 鸟 thing, vary the CBD cladding.
- **Hands off:** any item that needs a `USE`/`NPCS`/`vocab` row → posts a **request ticket** to the Foreman's queue (see Hub agent). Does **not** edit `game.js`/`vocab.js` itself.
- **Verifies locally:** runs `node .audit.js <its-scene-shots>` after each batch and inspects the PNGs.
- **Parallelism:** all 13 run at once. Zero contention — each owns a distinct file.
- **Example task:** "§11 street.js items 1–10" → 10 prop edits in `street.js` only.

#### 🎨 Engine Surgeon (×1–2, owns `gl.js`/`build.js`/`figure.js`/`math.js`/`perf.js`)
- **Owns:** the five engine files. One agent, or two with a strict file split (one on `gl.js`, one on the other four).
- **Job:** §1 items — matrix pooling, instancing, LOD, SSAO normals, context-loss recovery.
- **Special:** these are high-risk, high-regression. This agent runs the **full** audit suite (`node .audit.js` with no args = all ~200 shots) after every change, not just its own.
- **Throttle:** one change at a time, gated by the Verifier. No batching blind — each engine edit is a checkpoint.

#### 🧹 Janitor (×1, owns cleanup, read-mostly)
- **Owns:** deletions and gitignore — `_probe.html`, unused palette entries, the 188 `.audit-*.png`, scratch dirs.
- **Job:** §13 dead-code + cleanup items.
- **Why separate:** deletion is the riskiest operation (no git to undo). Isolating it means a mistake can't take down a feature branch. Runs **only** when no other agent is active, and renders the full audit suite before reporting done.

#### 🔧 Refactor Mech (×1, owns the dedup cluster)
- **Owns:** the cross-file dedup — extracting `setNight`/`litten`/`rnd`/`pick`/`clamp`/`col` into shared helpers across all 11–14 files.
- **Job:** §8 + §13 inconsistency items.
- **Special:** this is the **only agent allowed to edit multiple scene files** (because its whole job is "change the same thing everywhere"). Runs **alone** — the Foreman pauses all Scene Builders while the Mech does a refactor pass, then they resume. Otherwise the Mech's "change setNight in street.js" collides with the street Scene Builder.
- **Cadence:** one refactor at a time (e.g. "extract `rnd` everywhere"), full audit, then next.

### Tier 1.5 — The serial hubs (one at a time, never parallel)

#### 📝 The Hub — content/state agent (owns `game.js` + `vocab.js`)
- **Owns:** `js/game.js` (the `USE` table, `NPCS` array, needs/economy) and `js/vocab.js` (the dictionary). **The only agent that touches these two files.**
- **Job:** processes a **ticket queue** fed by all the other agents. When the street agent needs a `USE['包子']` entry and a `vocab.js` row for 豆浆, it posts a ticket; the Hub serializes them into `game.js`/`vocab.js`.
- **Why serial:** `game.js` cannot be merge-concurrently-edited. One agent, one edit at a time, in arrival order.
- **Throughput trick:** the Hub **batches** — it collects tickets for N minutes (or until the queue hits a size), then applies them as one coherent edit, runs the boot + a broad audit, and clears the batch. This is the difference between "100 tiny edits, each verified" (slow) and "100 tickets → 1 consolidated edit, verified once" (fast).
- **Also owns:** the big §2 gameplay systems that live in game.js (save state, economy sinks, career tree) — because it's the only one safe in that file.

#### 🗣️ Scribe (owns `talk.js` + dialogue content)
- **Owns:** `js/talk.js` and dialogue lines.
- **Job:** §12 NPC conversation items — extend the 5 scripted NPCs, add conversations for the 15 bark-only ones.
- **Why split from the Hub:** `talk.js` is independent of `game.js`, so the Scribe can run in parallel with the Hub as long as it doesn't also touch `game.js` NPCS (it posts NPC-roster-change tickets to the Hub instead).
- **Pairs well with:** the §12 vocabulary agent below.

#### 📖 Lexicographer (owns `vocab.js` content, coordinated with Hub)
- **Owns:** raw dictionary content in `vocab.js` — but shares the file with the Hub, so **runs in lockstep with the Hub**, not independently.
- **Job:** §12 vocabulary gaps — add 一…十, family terms, weather, body parts, the ~45 missing HSK words, etc.
- **Why a distinct role:** the volume is huge (hundreds of entries) and it's pure data, so it deserves a specialist prompt. But it queues through the Hub because the file is shared.

### Tier 2 — The gate (runs after every change, no exceptions)

#### 🔬 The Verifier (read-only, owns nothing)
- **Owns:** nothing. Read-only access to everything.
- **Job:** the gate every other agent must pass before reporting "done." Three levels:
  - **L1 syntax:** `node --check` on the changed file. Seconds.
  - **L2 boot:** headless Chrome loads `index.html`, confirms `typeof R === 'object'` and the boot overlay stays off, captures any `Runtime.exceptionThrown`. ~5 s.
  - **L3 render:** `node .audit.js <relevant shots>` + an `analyze_image` pass on the output PNGs to confirm the scene isn't black/broken and the intended change is visible. ~30–60 s per shot.
- **Authority:** if the Verifier fails, the change is **rejected back to the originating agent** for a fix. Nothing the Verifier hasn't blessed reaches the "done" column.
- **Why a separate agent:** the workers are optimistic and will claim "done" too early (I watched this happen with the vending-machine `cyl` bug this session). An independent, skeptical Verifier is the only reliable gate.

### Tier 3 — Quality (background, intermittent)

#### 👁️ Reviewer (read-only, intermittent)
- **Owns:** nothing.
- **Job:** periodic passes over merged work — code review, naming, comment density (§13 flagged `math.js`/`rail.js` as under-commented), consistency with the file's existing style. Reports issues back to the Foreman as new tasks.
- **When:** after every major batch, not per-edit. Catches the things the Verifier can't (the Verifier checks "does it run"; the Reviewer checks "is it good").

---

## How a task actually flows through the army

Worked example: **"add a 豆浆 (soy milk) thing to the street breakfast stall"** (§11 street.js item 3 + §12 vocab).

1. **Foreman** reads the item, sees it touches `street.js` (a scene) + `game.js` (`USE`) + `vocab.js`. Creates two sub-tasks, locks `street.js` to the street agent.
2. **Street agent** edits `street.js`: adds the thermos prop + `thing('豆浆', …)`. Runs its local audit (`.audit.js 24-stall`). Inspects the PNG. ✓. Reports done + posts a ticket: *"need USE['豆浆'] row + vocab entry for 豆浆."*
3. **Foreman** unlocks `street.js`, routes the ticket to the **Hub**.
4. **Hub** picks up the ticket (batched with others), adds `'豆浆|dòujiāng|soy milk'` to `vocab.js` and a `USE['豆浆']` entry to `game.js`. Hands to Verifier.
5. **Verifier** runs L1+L2 (game.js/vocab.js changed → boot check) + L3 (`.audit.js 24-stall` again). ✓. Reports back.
6. **Foreman** marks the item done.

Total wall-clock: the street agent and 12 other scene agents were running the whole time. The Hub serialized only the ~30 s of game.js/vocab.js work. **The contention point never blocked the parallel work.**

---

## Batch plan (the order the Foreman should dispatch)

Sequenced for safety (low-risk, high-payoff first) and to respect dependencies:

### Wave 0 — Foundation (serial, before anything else)
- **Janitor:** §13 cleanup — delete `_probe.html`, gitignore the 188 PNGs, remove dead palette entries. (Clears noise so diffs are readable.)
- **Hub:** the ★ #6 "split game.js" is **not** Wave 0 — it's risky and would invalidate every other agent's file offsets. Defer to a dedicated later wave. Wave 0 Hub instead adds the **save-state** stub (★ #1) so in-progress work isn't lost to a crash.

### Wave 1 — Content blast (fully parallel, lowest risk, highest volume)
- **Lexicographer** (via Hub): §12 vocabulary — add the ~200 missing dictionary entries. Pure data.
- **Scribe:** §12 dialogue — extend talk.js for the 15 bark-only NPCs.
- **Scene agents:** each handles its own scene's vocab-display items (§7/§11 "add a thing() for the visible-but-untaught word").
- *Why first:* it's the biggest item count, it's data not logic, and it doesn't touch the engine. Safest place to let agents run hot.

### Wave 2 — Scene prop polish (fully parallel)
- **Scene agents (×13):** §11 prop-by-prop fixes, each in its own file. Run `.audit.js <scene>` after each batch.
- *Risk control:* visual regressions caught by the per-scene render gate.

### Wave 3 — Refactors (serial, alone)
- **Refactor Mech:** §8/§13 dedup — one extraction at a time (`rnd` → `setNight` → `litten` → `clamp` → `col`). **All Scene Builders paused during each pass.** Full audit between each.
- *Why now:* Waves 1–2 have settled the file contents; refactoring against a stable target.

### Wave 4 — Engine (serial, gated)
- **Engine Surgeon:** §1 — matrix pooling first (biggest GC win), then instancing, then LOD. Each change is one Verifier cycle with the full audit suite.
- *Why last:* highest risk, and benefits from the cleaner code Waves 1–3 produced.

### Wave 5 — Gameplay systems (mostly Hub, some parallel)
- **Hub:** §2 — save state (real, not the Wave-0 stub), economy sinks, career tree, SRS session mode.
- **Scribe:** deeper `Talk` branching, friendship meters.
- *Why last substantive wave:* these are the design-heavy items where the human drives and the agent implements; least parallel, most judgment.

### Wave 6 — Features (parallel where possible)
- **§14 new features**, dispatched by subsystem ownership. Photo mode → Engine Surgeon (`captureFrame`); handwriting canvas → a specialist agent; weather → Engine + all Scene agents (coordinated through Foreman). New scenes (Xi'an/Chengdu) → fresh Scene Builder agents.

---

## Concurrency model — what runs at once

At any moment during Waves 1–2, a healthy steady state looks like:

```
Foreman (orchestrating)
├── 13 × Scene Builders     ← PARALLEL (distinct files)
├── Scribe (talk.js)        ← PARALLEL (independent file)
├── Hub (game.js+vocab.js)  ← SERIAL queue, draining tickets
├── Verifier                ← shared, request-driven
└── Reviewer                ← background, every N merges
```

That's **~16 agents live**, but only **one editing `game.js` at a time**. The file-lock ledger is what makes this safe. Peak parallelism on this codebase is ~14 (13 scenes + Scribe); the Hub is the throughput limiter by design.

---

## Cost / time estimate (rough)

Assume each agent-edit averages ~3 min wall (generate + verify cycle on a single machine; in reality agents queue on whatever concurrency your runtime allows):

| Wave | Items | Serial cost | Parallel speedup | Est. wall-clock |
|---|---|---|---|---|
| 0 Foundation | ~25 | high (Janitor serial) | low | half a day |
| 1 Content | ~220 | low (data) | **13×** | 1–2 days |
| 2 Scene props | ~150 | low | **13×** | 1–2 days |
| 3 Refactors | ~40 | high (Mech alone) | none | 1 day |
| 4 Engine | ~50 | high (Surgeon gated) | none | 2–3 days |
| 5 Gameplay | ~40 | medium | 2–3× | 2 days |
| 6 Features | ~80 | mixed | 3–5× | open-ended |

**Rough total to clear the 603-item list: ~2 weeks of agent wall-clock** with a human reviewing the Verifier's rejected items and steering Wave 5–6 design. That's versus an estimated **3–6 months** for a solo human — the speedup is real but not magical, and the verification gate is where most of the actual time goes.

The honest ceiling: **content (Wave 1) and scene props (Wave 2) — ~370 items, ~60% of the list — are where you'll see the dramatic "overnight" speedup.** The engine and gameplay waves are closer to a 2–3× assist because the human-in-the-loop design decisions dominate.

---

## The three rules that make this not collapse

1. **One file, one writer.** Enforced by the Foreman's lock ledger. The only exception is the Refactor Mech, which runs with everything else paused.
2. **Nothing merges without passing the Verifier.** The Verifier is skeptical and independent. Workers are not allowed to self-certify.
3. **The hub serializes contention.** `game.js`/`vocab.js` edits queue to one agent. This is the single most important rule — without it, parallel agents produce unreconcilable diffs.

Break any of these and the army turns into a merge-conflict factory. Honour them and ~14 agents can genuinely work this repo at once.

---

## Minimum viable version (if you don't want 16 agents)

You can capture ~70% of the benefit with a 4-agent core:
- **Foreman** (you + one agent)
- **2× Scene Builders** working the highest-value scenes (`street.js`, `world.js`)
- **Hub** (handles game.js/vocab.js serially)
- **Verifier** (the `.audit.js` harness, run by hand or scripted)

Run them in the wave order above. Skip the Engine Surgeon and Refactor Mech until the content/prop waves are done — they're force-multipliers for later, not blockers for the first 60% of the work.
