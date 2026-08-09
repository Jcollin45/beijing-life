#!/usr/bin/env python3
"""Generate a ~10,000-item hierarchical checklist for 北京生活 development."""

CHECKLIST_PATH = "CHECKLIST.md"

# Each section is (prefix, title, category_count, items_per_category)
# e.g. 20 categories × 50 items = 1000 items per section
# Total ≈ 10,000

SECTIONS = [
    # ENGINE & RENDERER — 1000 items
    ("A", "ENGINE & RENDERER — gl.js, build.js, figure.js, math.js, perf.js, glyphs.js", 20, 50),  # 1000

    # 13 SCENES — 3900 items
    ("B", "STREET SCENE (street.js, 2277 lines)", 15, 40),
    ("C", "WORLD / APARTMENT (world.js, 916 lines)", 8, 40),
    ("D", "METRO SCENE (metro.js, 1523 lines)", 10, 40),
    ("E", "AIRPORT SCENE (airport.js, 1352 lines)", 10, 40),
    ("F", "SHOP SCENE (shop.js, 821 lines)", 7, 40),
    ("G", "DINER SCENE (diner.js, 721 lines)", 6, 40),
    ("H", "SHANGHAI / BUND SCENE (shanghai.js, 660 lines)", 6, 40),
    ("I", "CAMPUS SCENE (campus.js, 740 lines)", 6, 40),
    ("J", "PARK SCENE (park.js, 575 lines)", 6, 40),
    ("K", "OFFICE SCENE (office.js, 436 lines)", 6, 40),
    ("L", "RAIL SCENE (rail.js, 574 lines)", 6, 40),
    ("M", "TRAIN SCENE (train.js, 904 lines)", 6, 40),
    ("N", "CLASSROOM SCENE (classroom.js, 237 lines)", 5, 44),  # 220

    # GAMEPLAY SYSTEMS — 700 items
    ("P", "GAMEPLAY SYSTEMS — economy, needs, clock, travel, achievements, minigames", 14, 50),

    # VOCABULARY & LEARNING CORE — 1000 items
    ("Q", "VOCABULARY & LEARNING CORE — SRS, quiz, dictionary, HSK, grammar, characters", 20, 50),

    # DIALOGUE & NPCS — 800 items
    ("R", "DIALOGUE & NPCS — talk.js scripts, conversations, bark-to-conversation upgrades", 16, 50),

    # UI, HUD & ONBOARDING — 600 items
    ("S", "UI, HUD & ONBOARDING — index.html, CSS, HUD panels, settings, map, mobile", 12, 50),

    # AUDIO & VOICE — 500 items
    ("T", "AUDIO & VOICE — speech.js, train-audio.js, voice.js, baking pipeline, music, SFX", 10, 50),

    # NEW FEATURES — 800 items
    ("U", "NEW FEATURES — weather, seasons, holidays, cooking, pets, quests, story, new cities", 16, 50),

    # CLEANUP, BUGS & TOOLING — 700 items
    ("V", "CLEANUP, BUGS & TOOLING — dead code, magic numbers, refactoring, docs, tests, devops", 14, 50),
]

def generate_section(prefix, title, cat_count, items_per_cat):
    lines = [f"## {title}\n"]
    total = 0
    for cat in range(1, cat_count + 1):
        for i in range(1, items_per_cat + 1):
            code = f"{prefix}{cat:02d}.{i:03d}"
            lines.append(f"- [ ] **{code}** — {title.split(' — ')[0].split('(')[0].strip()} cat.{cat} item {i}")
            total += 1
    lines.append("")
    return "\n".join(lines), total

def generate():
    lines = [
        "# 北京生活 · Beijing Life — Master Checklist (10,000 Items)\n",
        "",
        "> **Hierarchical task board** for the Agent Army (see `AGENT_ARMY.md`, `.kiro/agents/`).",
        "> The **Foreman** (`.kiro/agents/foreman.json`) reads this to dispatch work to sub-agents.",
        "> Scene agents own exactly one file each; the Hub owns `game.js` + `vocab.js`; the Scribe owns `talk.js`.",
        "> The Verifier gates every merge. No item is done until the Verifier passes it.",
        "",
        "### Key",
        "- `[ ]` = pending dispatch",
        "- `[x]` = done, verified by the Verifier",
        "- `[~]` = in progress (assigned to an agent, not yet verified)",
        "- `[-]` = wontfix (rationale noted in `.agent-ledger.json`)",
        "",
        "### Agent ownership legend",
        "- **Scene Builder** (e.g. `scene-street`) → owns exactly its scene file",
        "- **Hub** → owns `game.js`, `vocab.js`",
        "- **Scribe** → owns `talk.js`",
        "- **Engine Surgeon** → owns `gl.js`, `build.js`, `figure.js`, `math.js`, `perf.js`",
        "- **Lexicographer** → queues through Hub for `vocab.js`",
        "- **Janitor** → owns deletion/cleanup tasks",
        "- **Refactor Mech** → owns cross-file dedup/refactoring",
        "- **Reviewer** → read-only code review passes",
        "",
        "---",
        "",
    ]
    total = 0
    for prefix, title, cat_count, items_per_cat in SECTIONS:
        section_text, section_total = generate_section(prefix, title, cat_count, items_per_cat)
        lines.append(section_text)
        total += section_total

    lines.append(f"\n---\n*{total} total items across {len(SECTIONS)} sections.*\n")
    return "\n".join(lines)

def main():
    content = generate()
    with open(CHECKLIST_PATH, "w") as f:
        f.write(content)
    total = sum(1 for line in content.split("\n") if line.startswith("- [ ]"))
    print(f"Generated {CHECKLIST_PATH} with {total} checklist items")

if __name__ == "__main__":
    main()
