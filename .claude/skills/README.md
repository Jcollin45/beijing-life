# Third-party skills

Not written here. Two upstream plugins, vendored as plain skill directories rather than installed
through `/plugin`, because the machine that installed them was an ephemeral container: a plugin
lives in `~/.claude/plugins/` and would have been destroyed with it, while `.claude/` is tracked by
this repo (see the `!.claude/` exception in `.gitignore`) and survives a push.

| source | version | commit | licence |
|---|---|---|---|
| https://github.com/obra/superpowers | 6.3.0 | `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | MIT — `LICENSES/superpowers-LICENSE` |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 2.13.0 | `8a1a6d857332da32252d77365da90c3f6293b47b` | MIT — `LICENSES/ui-ux-pro-max-LICENSE` |

**From superpowers** (14): `brainstorming`, `dispatching-parallel-agents`, `executing-plans`,
`finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`,
`subagent-driven-development`, `systematic-debugging`, `test-driven-development`,
`using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`,
`writing-skills`.

**From ui-ux-pro-max** (7): `banner-design`, `brand`, `design`, `design-system`, `slides`,
`ui-styling`, `ui-ux-pro-max`.

## What was NOT vendored, and what it costs

`superpowers` ships a `SessionStart` hook that points a fresh session at its `using-superpowers`
skill. Hooks are plugin machinery, not skill files, so it is not here — the skills all work, but
nothing announces them at session start. Invoke `using-superpowers` yourself, or read it once.

`ui-ux-pro-max` also ships a `cli/`, `src/` and `stack/` tree (11 MB) that its README describes as
the generator side of the project. Only `.claude/skills/` was taken. If a skill turns out to shell
out to something under `cli/`, that is the reason it is missing.

## Updating

Re-clone the repo, copy `skills/` (superpowers) or `.claude/skills/` (ui-ux-pro-max) over the top,
and update the commit hashes above. There is no update command — vendoring is the trade for
surviving the container.

## The name collision to know about

`design` here is ui-ux-pro-max's. Claude Code also ships a first-party `design` skill (the canvas
editor). A project skill and a plugin skill with the same bare name are distinguished by their
plugin prefix in the listing, but a bare `/design` is ambiguous. Type the prefixed form if you mean
the first-party one.
