# The learning layer — what is missing, and the contract for fixing it

Written 2026-08-15 by the lead, from measurement, not from reading the design docs. Every number
below was taken off the source in this checkout. This file is the contract lanes read; it replaces
a briefing, and it is the place to record what a lane could not do.

## What is already good

The bones are better than the gap list suggests, and none of this should be rebuilt:

- **1,931 dictionary rows**, HSK-banded 1–6, with a closed twelve-value `topic` axis
  (`js/vocab.js:52`).
- **A real spaced-repetition schedule** — familiarity 0–9, `IV_FIRST 75s · IV_MUL 2.3 · IV_MAX 90d`,
  per-stage interval floors, miss penalty (`js/vocab.js:2530-2543`). This is not a toy.
- **Listening comprehension as the review event**: answering a spoken question moves the words in
  it toward mastery (`js/talk.js`), which is stronger evidence than picking a gloss.
- **Vocabulary gates the career** (`js/career.js`) and **understanding drives relationships**
  (`js/story.js`). Both refuse to be ground out.
- **1,314 baked voice clips**, keyed `voice|sentence` in `audio/voice/manifest.json`.

## The five gaps, measured

1. **The game is recognition-only.** All three quiz kinds — `meaning`, `pinyin`, `produce` — build
   four options and ask you to pick one (`js/vocab.js:2789-2830`). `produce` shows the English and
   asks you to pick the hanzi; that is recognition wearing production's name. **A player can reach
   `mastered` on all 1,931 words without ever producing one.** This is the single biggest gap
   between this and a good learning game.

2. **Tones are never tested.** They exist as diacritics in the pinyin column and as a `.dictcheck.js`
   lint (`js/vocab.js:916`). Nothing anywhere asks for one. Tone is the first thing a learner of
   Chinese gets wrong and the last thing they fix.

3. **The listening surface is finite and small.** 25 scripts, 91 `ask` turns, and `Talk.next`
   retires a turn permanently once you answer it. `js/story.js` states the ceiling in its own
   comment: **twenty-six understood conversations exist in the whole game.** The premise is "learn
   the language by living here"; the living runs out in an afternoon.

4. **Survival has no teeth.** Five needs drain with the clock (`js/game.js:8420-8480`). `toilet`
   hitting zero resets itself to 65 and costs 14 mood. Nothing else has a floor consequence: no
   rent, no eviction, no starvation, no illness from neglect, no losing the job for not turning up.
   Money cannot go negative — unaffordable rows are greyed out (`js/game.js:9412`). **You cannot
   lose**, so nothing forces you into the shop, the bank or the conversation you are avoiding.

5. **The world only half-bends to the review queue.** `Vocab.dueByTopic` has exactly two consumers,
   `js/disrupt.js:488` and `js/home-life.js:619`. Shops, the market, the career and the story never
   ask what is due.

## The wave — four lanes, disjoint files

One writer per file. Do not edit a file you do not own; if you need a change in someone else's,
write the request into `.reports/<lane>-wiring.md` and say so in your return value.

| lane | owns | job |
|---|---|---|
| **A · produce** | `js/vocab.js` | typed production + tone grading + v3 storage |
| **C · talk** | `js/talk.js` | generative asks, so listening stops running out |
| **D · survive** | `js/survive.js` (new) | rent, eviction, hunger, losing the job |
| **W · wiring** | `js/game.js` | applies every lane's hook; owns the HUD and the modals |

`js/data.js` and `js/vocab.js`'s dictionary rows stay lead-owned for content; lane A owns the
*code* in `js/vocab.js` but must not add or remove dictionary rows.

---

## Lane A — production recall and tones (`js/vocab.js`)

The point: a word is not learned until you can produce it from nothing. Add a fourth quiz kind that
takes typed input, and make tone part of the grade.

**New API, and nothing existing may change signature:**

```
Vocab.quiz(hz, kind)      // kind optional; existing random behaviour when omitted.
                          // kind 'type' returns { kind:'type', hz, prompt: e.en, expect: e.py }
                          // and NO options array.
Vocab.gradeTyped(hz, text)// → { correct, toneCorrect, expected, got }
                          // then calls the same grade() path so one answer moves one schedule.
Vocab.toneOf(hz)          // → [2,1] etc. from the pinyin diacritics. Neutral tone is 5.
                          // Toneless entries return [] and are never tone-tested. NOTE, and this
                          // corrects an error in the first draft of this plan: '#' is the comment
                          // character in RAW, not a particle mark. The real mark is a bracketed
                          // gloss (.dictcheck.js:126), which is what toneOf implements.
```

**Typed answers must accept what a learner actually types.** All of these are the same answer for
你好: `nihao`, `ni hao`, `ni3hao3`, `nǐhǎo`, `nǐ hǎo`, `NiHao`. Strip spaces, apostrophes and case;
map diacritics to tone digits; compare the toneless letters first. Then:

- letters wrong → `correct:false`. That is a miss, and it costs the interval as a miss does today.
- letters right, no tones given → `correct:true, toneCorrect:null`. Do not punish it. A learner
  who types `nihao` knows the word.
- letters right, tones given and wrong → `correct:true, toneCorrect:false`. Counts as a hit for the
  schedule and **not** for production.

**Storage bumps to `bjlife.knowledge.v3`.** Migrate v2 (and the existing v1 path) rather than
dropping it — losing somebody's ninety-day intervals is not acceptable. Two new per-word counters:
`p` (typed correct) and `t` (typed correct *with* correct tones).

**A fourth stage, above `mastered`.** `stage()` returns 0/1/2 today and callers depend on that;
leave it alone and add `Vocab.produced(hz)` → true when `p >= 2` and at least one of those was a
different day. `Vocab.toned(hz)` when `t >= 2`. `mastered` keeps meaning exactly what it means now.

**Typing is a setting, not a wall.** Lane W puts the toggle in the options panel. Default on.
When off, `quiz()` never returns kind `'type'` and everything behaves as it does today. Production
stage may gate *optional* things (a story chapter, the top career rank) and must never gate core
progress — a player who will not type must still be able to finish the game.

**Check to leave behind:** `.typecheck.js` — assert the normaliser on a table of at least twenty
real answers including all six 你好 spellings above, assert `toneOf` against ten known words
including a neutral-tone one and a toneless bracketed-gloss row, and assert that a v2 save loads into v3 with its
intervals intact. It must fail if the normaliser is loosened to the point of accepting `nahao`.

## Lane C — the listening surface stops running out (`js/talk.js`)

The hand-written scripts are the good ones and none of them changes. What is needed is a second
source of asks so the game still has something to say to you on day forty.

**Templated asks over the dictionary.** A vendor asks a price or a quantity; a coworker asks what
day or what time; a neighbour asks where you are going. The slots are filled from
`Vocab.dueByTopic(topic)` and `Vocab.dueByBand(max)`, so **what you are asked is what you owe** —
which is gap 5 fixed for the one system best placed to fix it.

Constraints, and they are hard:

- **A line with no baked clip makes no sound and is reported** (`js/speech.js`, `missed` in
  `status()`; `.speechcheck.js` fails on it). So a generated ask must be assembled only from
  sentences that are already in `audio/voice/manifest.json`, **or** the lane must write the new
  lines to `.reports/C-bake.md` as a bake list and not ship them silent. Do not invent a fallback
  synthesiser; one was removed on purpose.
- Templated asks must never displace a hand-written one that is still unretired. They fill the
  space *after* a person has run out.
- Keep `Talk.next`'s retire-on-correct behaviour for authored turns. A generated turn is not
  retired; it is regenerated with different slots.

**Check:** extend `.talkcheck.js` — every generated ask resolves to a clip that exists in the
manifest, or the run fails naming the missing line. It must fail if a template is added whose
sentence was never baked.

## Lane D — survival with teeth (`js/survive.js`, new)

State and rules only. **It draws nothing, it knows about no room, it never touches the HUD** — the
same contract `js/career.js`, `js/pantry.js` and `js/story.js` all keep. It answers questions and
reports what happened; lane W turns that into a toast, a diary line or a number going down.

What it owns:

- **Rent.** Due on a fixed day of the week, a real number against `money`. Miss it once and the
  landlord asks — in Chinese, through Talk, which makes the words load-bearing. Miss it three times
  and you are out.
- **Hunger with a floor.** `needs.food` at zero stops resetting itself and starts costing health.
  Health is the new number and it is the one that can end a run.
- **Illness.** Neglected `clean`, cold weather without the right clothes, or bad food from
  `js/pantry.js`'s dated lots. The hospital already exists and is unreachable-by-consequence today.
- **Losing the job.** `js/career.js` already has an attendance record that remembers. Wire the
  consequence: enough missed days and the rank goes down, then the job goes.

**Losing must be recoverable and legible.** Eviction sends you to the cheap room, not to a game-over
screen; being fired sends you back to the whiteboard at rank 1. **State every rule the player is
being held to, in the language they are learning it in.** A survival system you cannot read is a
difficulty setting, not a lesson.

**Difficulty is the owner's call and is not yours to assume:** ship the numbers in one table at the
top of the file with a `SURVIVE.mode` of `'gentle' | 'real'`, default `'gentle'`, and put the real
numbers in `.reports/D-survive.md` for a decision.

**Check:** `.survivecheck.js` — simulate thirty days at fixed inputs and assert each fail state is
reachable *and* escapable. It must fail if a rule is added that makes a run unrecoverable.

## Lane W — wiring (`js/game.js`)

Nobody else edits this file. W applies each lane's hook after that lane's module lands and parses:

- the typed-answer input in the quiz modal, and the setting that turns it off;
- the health bar beside the five needs, and the toasts for rent, illness and dismissal;
- `Survive.tick()` on the same clock that already advances needs (`js/game.js:8483`);
- `Perf.setPlace(name)` beside `Perf.forget()` at `js/game.js:11675` — a one-line change owed since
  2026-08-08 (`STATE.md`, item 422) and W is the lane that owns the file.

W is also the only lane allowed to touch `#needs`, `#goals` or the modal stack.

## Standing rules for every lane

- **60 fps outranks everything.** None of this is allowed to add a per-frame cost. It is all state,
  rules and modals.
- **No real brand names**, either language.
- **Verify against the live site** — `https://jcollin45.github.io/beijing-life/`, not `:8000`.
  Headless harnesses and `node --check` are exempt; anything a player would *look at* is not.
- **At ~150 turns, write your state to `.reports/<lane>.md` and stop.** A fresh agent resumes from
  it more cheaply than you continue.
- **Return five lines**: verdict, the number you measured, `file:line`, what you did not verify,
  what you need from another lane. Detail goes in the report file, and write the report *before*
  you run out — a report written only at the end is a report that does not get written.
