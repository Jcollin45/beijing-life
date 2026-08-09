# The standing graphics pass

A loop runs a graphics agent against this file. Each iteration picks up where the last left off,
so the brief lives here rather than in the prompt: an iteration that re-derives its own orientation
has spent its budget before it renders anything.

## The goal

Make 北京生活 look better, everywhere, continuously — not one room polished to death while the rest
stay flat. `ART.md` is the visual language and the material kit; this file is only the loop's
working discipline.

## The rule that outranks the goal

**Frame rate beats looks.** A 4K texture that costs frames loses to a 1K one that does not. This is
the owner's standing instruction and it is not negotiable by an agent that thinks its shot looks
nicer.

Where that stands right now, measured: the flat is **GPU-bound at p95 50.6 ms against a 16.7 ms
target** — 3× over — with gpuMed 22.9 against cpuMed 7.9, and roughly 835 props were added across
the tower in one day. So for the apartment specifically, **making it cheaper *is* improving the
graphics**, and a pass that only adds is the wrong pass.

`STATE.md` lists frame-rate theories that have already been **disproved**. Read it before forming a
fifth. In particular, do not answer a frame problem by deleting props wholesale — that one is dead.

## Measuring, so the number means something

- `node .fpscheck.js <scene>` with `--use-angle=metal` and `PLAY=1`. SwiftShader cannot time a
  frame; a number taken under it is not a number.
- **Exclusive, or not at all.** A contended reading is worse than none, because it gets quoted. If
  the control scene reads above its documented quiet figure, throw the sample away and say so.
- **Never queue two exclusive `.fpscheck.js` runs at once.** Each needs all three slots; they block
  each other, and this has already deadlocked the pool.
- Before *and* after, same session, same flags. A single after-number proves nothing.

## Measure the image without the gate

Frame *timing* needs a browser. Image *quality* does not, and this is the loop's way around the
three-slot pool that has starved every other lane on this project.

The first iteration built a **pure-node luminance histogram** — its own PNG decoder, no browser, no
render slot, immune to load — and used it to compare every outdoor scene at once. It found the
street was the darkest district in the game (mean .266, 88% of frame under 40% luminance, nothing
above 70%, against park .328 and campus .347) and it **overturned that same agent's own reading of
the frames**: it had looked at four shots and concluded a near-white board was the problem, when in
fact nothing in any street frame exceeds 80% luminance. The district was crushed downward, not
blown out.

So: **look at the frame to judge it, and measure the image to check your judgement.** Eyes decide
what is wrong; the histogram decides whether you were right. A change justified by one and
contradicted by the other is not ready.

## Render-gate etiquette

`.render-gate.js` is a three-slot pool shared with every other lane. It has been the binding
constraint on this project for a full working day and has stopped four separate lanes from
verifying anything.

- One slot at a time. Long exclusive batches starve everyone; split a shot list rather than holding
  the pool for twenty minutes.
- Prefer a pure-node check that needs no slot at all. `.beamcheck.js`, `.winreg.js`,
  `.floorusecheck.js`, `.homelifecheck.js`, `.roomgate.js` and `.homeweek.js` are the idiom, and
  several of them carry real negative controls.
- If the queue is deep, do source work this iteration and render next time. Waiting in a queue is
  not work.

## The iteration budget — hard

Measured 2026-08-08: the first iteration ran **3h07m and 119 tool calls for one changed line**,
costing about what fourteen checklist items cost, and returned a change it could only score as
`none — sample void`. The images were not the expense; length alone was.

- **Stop at ~40 tool calls.** Write the ledger row and finish, even mid-thought. An unfinished
  iteration that logged what it learned is worth more than a complete one nobody could afford.
- **No before-number, no change.** If the scene cannot be measured this iteration — contended GPU,
  gate saturated, control scene off its documented quiet figure — then **do not change it**. Log the
  attempt, say what blocked it, and stop. This is the cheaper rule *and* the more rigorous one.
- **Finish what the last iteration left.** Read the ledger's open-debt lines first. The street
  iteration raised daylight exposure and never rendered the night frames, while
  `js/game.js:14167` scales outdoor exposure by `1 + 0.35*twilight` — so night silently took the
  same rise, untested. Clearing that outranks starting a new scene.

## What an iteration does

1. Read `.reports/graphics-ledger.md`. Take the scene with the **oldest** entry — that is what keeps
   this a pass over everything rather than a pass over whatever is most fun.
2. Render its cameras from the `.audit.js` registry and **look at the frames**. Not a grep. Two
   lanes this week caught their own errors only on a render — a door leaf folded flat into a vanity
   carcass, another filling half the frame and hiding the appliances it had just fixed — and both
   would have passed every automated check in the repo.
3. Pick **one** thing. A material, a light, a palette, a silhouette, one surface off `ART.md`'s
   ownership table. One change per iteration, measured, is worth more than five unmeasured.
4. Make it, measure it, view it, and write the ledger row.

## What must not regress

- `node .bootcheck.js` — it asks the GPU whether the game actually started, which `node --check`
  cannot. Three lanes have taken the boot overlay up with changes that parsed cleanly.
- `node .flatcheck.js --full` — currently 154/155, all ten rooms reached, 112/112 interactables. The
  flat's geometry was expensive; `clampMove` inflates every collider by the 0.30 m body radius, so a
  prop moved for looks can seal a room.
- `node .checklist.js --file APARTMENT-TODO.md` — the board only goes up.

## Assets

The owner's download grant is standing and global: if it is free and it makes the work look really
good, take it — no accounts, no email, no card. Two project constraints survive it because they are
about this engine, not licensing: **stage, don't overwrite**, and **account for boot cost before
touching the eager preload contract in `js/assets.js`**. Record any required attribution where the
project keeps it.

## The ledger

Append one row per iteration to `.reports/graphics-ledger.md`:

```
| date | scene | what changed | before p95 | after p95 | frame viewed? | notes |
```

Honesty rules that make the ledger worth keeping: if no number was taken, write **none**, not a
guess. If the render was not viewed, write **no**. If the change was reverted because it cost
frames, that is a successful iteration and it goes in the ledger as one — a pass that finds a
pretty change is too expensive has done its job.

## Scenes in rotation

home (the tower, twelve decks), street, mall, hotel, metro, airport, shop, diner, shanghai, campus,
park, office, rail, train, classroom, bank, hospital, zoo, cabin, chengdu.
