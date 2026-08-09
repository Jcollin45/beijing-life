## The game is read off the live site, not off this machine

**Canonical URL: https://jcollin45.github.io/beijing-life/** — the only place the game is read from.
Owner's instruction, 2026-08-09, chosen with the cost below stated: **verify against the live site,
not against localhost.** A screenshot, a frame-rate number, a console check or a "works now" claim
taken off `serve.py` on :8000 does not count and must not be reported as verification. Push, wait
for the build, then look.

- **Publishing is `git push`.** Repo `git@github.com:Jcollin45/beijing-life.git`, branch `main`,
  Pages serves `main` at `/ (root)`. Measured 2026-08-09: the site went live 60 s after the branch
  landed. Commit and push as part of finishing work, not as a separate errand afterwards.
- **Every asset path must stay relative.** The site is served from the `/beijing-life/` subpath, so
  a leading-slash path like `/assets/foo.glb` resolves locally and 404s in production. Verified
  clean at the initial commit; it is the easiest way to break the deploy and it will not show up
  on :8000.
- **`.nojekyll` must stay at the root.** Without it Jekyll drops `assets/_staging/` and
  `_probe.html` for their leading underscores — silently, with no build error.
- **`.gitignore` ships only `index.html`, `js/`, `assets/`, `audio/` and the docs.** `art/` (783 MB
  of concept art) and every root dot-directory (3.9 GB of caches and QA output) are excluded. A new
  runtime asset placed outside those four paths will be missing in production and present locally —
  check `git status` before assuming a push carried it.
- **The loop costs a push plus roughly a minute of build, every time.** That is the accepted price,
  not a reason to fall back to :8000. It changes how you batch: land a whole coherent change, push
  once, verify once. Do not push a line at a time — that is where the minute starts to hurt.
- **`.render-gate.js` and the harnesses still run locally.** The strict rule is about *reading the
  game* — screenshots, visual checks, frame rate, anything the owner would look at. Headless
  harnesses, unit checks and `git status` are not affected; they never described the live site.
- **A verification claim must name the origin it was taken from.** `jcollin45.github.io` or it did
  not happen. If the build had not finished when you looked, say so rather than reporting the
  previous deploy's behaviour as the new one.

Measured payload 2026-08-09: 723 MB in the repo, 5.6 MB to reach the title screen, 28.9 MB to boot
into gameplay with 9 rigs streamed. Rigs load on demand (`js/assets.js:1092`), so repo size is not
first-load size. Pages caps a published site at 1 GB — `art/` cannot be added back.

## Art direction and asset downloads
See `ART.md` at the repo root. It is the single visual language every room is built against
(target: Sims 3 *staging*, not Sims 3 fidelity), and it holds the material kit, the surface
ownership table, and the measured findings behind both.

The download grant is global (`~/.claude/CLAUDE.md`). Two constraints here are about this engine,
not about licensing, and survive it: **stage, don't overwrite**; and **account for boot cost before
touching the `js/assets.js` preload contract**. Frame rate still outranks looks.

## Agent dispatch

The gate rule is global — see `~/.claude/CLAUDE.md`. Here the gate agent is `gatekeeper`, and the
shared resource it keeps moving is the render-gate queue (`.render-gate.js`): several lanes
contend for one harness queue and no lane can see it from inside itself.

## The token audit is always up

**Standing rule: a `token-auditor` is running whenever this project is being worked.** Same shape
as the gate rule above — it is spawned as part of dispatching work, not decided on afterwards.

- **One auditor per wave**, spawned alongside the first coder, exactly like `gatekeeper`. It audits
  the wave that is running, not last week's.
- **It also runs at the boundaries that cost nothing when idle**: before a compaction, at session
  end, and any time a session passes roughly 200 turns. A compaction is itself the signal that a
  session got expensive — audit at that moment, not after the evidence is summarised away.
- **It reads the live transcript, never the running session's context.** Its findings come back as
  a few lines; the detail goes to `~/.claude/TOKEN-LEDGER.md`.
- **Rule edits land at a *session* start, not a wave boundary.** Measured 2026-08-08: `CLAUDE.md` is
  snapshotted when the lead session starts and inherited by every subagent, so a mid-session edit is
  inert — it changes nothing this session and does not break the cache either. Stage in the ledger.
- **The auditor audits itself.** If a run costs more than the waste it prevented, it says so and
  the rule gets cut back. An always-on auditor that pays for itself is the point; one that does not
  is the exact leak it exists to catch.

## Token economy — the project-specific half

The rule and the general levers are in `~/.claude/CLAUDE.md`. Not repeated here; only what is
particular to this repo:

- **`STATE.md` lists what has been disproved.** Read it before touching frame rate — four separate
  "findings" died on repeat in one session — and add to it when the next theory dies.
- **Contracts to read instead of files:** `MALL-TENANT.md`, `HOTEL-TENANT.md`, `ART.md`, and each
  module's own header comment. Opening a 4,000-line file to learn one signature is the most
  expensive mistake available here.
- **Never a bare `ls` here.** The repo root holds 1,136 dotfiles — 26 KB, ~15,900 tokens, and paths
  tokenize at 1.7 B/tok, not 4. `ls *.md`, `ls js/home-*.js`.
- **Harnesses go silent on success down a pipe.** `.checklist.js` is the pattern — exit status is
  the verdict, the table is for a human at a TTY. ~600 tokens to ~40 a run, paid by every agent on
  every verification. Do this to any harness agents run repeatedly.
- **Agents write detail to `.reports/`** and return a few lines. They frequently stop before writing
  the file, so the number you need must be in the return value.

## Context strategy <!-- vexp v2.3.1 -->

Local daemon, local index in `.vexp/`; nothing leaves the machine. Treat it as a build tool.

- **One `run_pipeline` call at the start of a multi-file task** — context + impact + memory in one.
  Do not chain calls per turn; call again only when the task moves to a new area.
- **Anchor on real identifiers or paths**, not questions: `"fix JWT expiry in AuthService.validateToken"`,
  not `"why does login fail?"`. A bare question falls back to weak text ranking.
- **Literal sweeps — strings, config keys, log lines — go to Grep/Glob**, never through vexp.
- **`get_skeleton` for files you only need to understand; `Read` only what you will edit.**
- Runtime logs, build output and anything outside the workspace: Bash/Read. vexp indexes source only.
- Presets: `debug`, `refactor`. Params: `max_tokens`, `include_tests`, `include_file_content`.
  `index_status` for health; run `vexp index` if the coverage header does not match this repo.
- Subagents may call it — pass the task description.

**If the vexp tools are not in your tool list the MCP server is not attached.** Do not go looking
for them. Fall back to Grep/Glob for anything literal, and to a declaration sweep
(`grep -nE "^(function|const [A-Z]|class )"`) for structure.
