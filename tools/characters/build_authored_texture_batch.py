#!/usr/bin/env python3
"""Atomically rebuild the 20 original rigs with the production texture profile.

Candidates are built and fully validated beside the live files.  The current
base rig is also compared accessor-for-accessor with its candidate so this job
cannot silently change a face, body, wardrobe mesh, UV layout, skin weight, or
skeleton while repacking textures.

    python3 tools/characters/build_authored_texture_batch.py --workers 2
    python3 tools/characters/build_authored_texture_batch.py --ids xiaochen,wang_ayi
"""

from __future__ import annotations

import argparse
import ast
import concurrent.futures
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent
RIGS = ROOT / "assets" / "rigs"
ROSTER = ROOT / "art" / "character-concepts" / "NPC-ROSTER-82.json"
BUILDER = TOOLS / "build_mpfb_character.py"
LOGS = ROOT / ".legacy-texture-repack"
DEFAULT_BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
PRINT_LOCK = threading.Lock()


@dataclass(frozen=True)
class Character:
    preset: str
    output_name: str

    @property
    def base(self) -> Path:
        return RIGS / self.output_name

    @property
    def lod(self) -> Path:
        return self.base.with_name(self.base.stem + ".lod.glb")


def arguments(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blender", type=Path, default=None)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--ids", help="Comma-separated authored preset IDs.")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--list", action="store_true")
    return parser.parse_args(argv)


def blender_path(requested: Path | None) -> Path:
    result = (requested or DEFAULT_BLENDER).expanduser().resolve()
    if not result.is_file():
        found = shutil.which("blender")
        if found:
            result = Path(found).resolve()
    if not result.is_file():
        raise SystemExit(f"Blender executable not found: {result}")
    return result


def literal_presets() -> dict[str, dict[str, object]]:
    tree = ast.parse(BUILDER.read_text(encoding="utf-8"))
    for node in tree.body:
        if (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and node.target.id == "PRESETS"
        ):
            value = ast.literal_eval(node.value)
            if isinstance(value, dict):
                return value
    raise RuntimeError(f"Could not find literal PRESETS in {BUILDER}")


def authored_characters() -> list[Character]:
    roster = json.loads(ROSTER.read_text(encoding="utf-8"))["characters"]
    presets = literal_presets()
    result = []
    for row in roster:
        if row["status"] != "authored":
            continue
        preset = str(row["preset"])
        if preset not in presets:
            raise RuntimeError(f"Authored roster preset is not literal: {preset}")
        result.append(Character(preset, str(presets[preset]["output_name"])))
    if len(result) != 20:
        raise RuntimeError(f"Expected 20 original authored rigs, found {len(result)}")
    return result


def run(command: list[str], log, label: str) -> None:
    log.write(f"\n$ {' '.join(command)}\n")
    log.flush()
    result = subprocess.run(
        command,
        cwd=ROOT,
        stdout=log,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(f"{label} exited with status {result.returncode}")


def validator_commands(character: Character, base: Path, lod: Path) -> list[tuple[list[str], str]]:
    base_check = ["node", str(ROOT / ".rigcheck.js"), str(base)]
    if character.preset == "doudou":
        base_check.append("--child")
    return [
        (base_check, "base rig validation"),
        (["node", str(ROOT / ".riglodcheck.js"), str(lod)], "LOD validation"),
        ([
            "node", str(TOOLS / "audit_rig_textures.js"), "--production",
            "--soft-mib", "12", "--hard-mib", "16", str(lod),
        ], "production texture validation"),
    ]


def already_production(character: Character, log) -> bool:
    if not character.base.is_file() or not character.lod.is_file():
        return False
    try:
        for command, label in validator_commands(character, character.base, character.lod):
            run(command, log, f"existing {label}")
    except RuntimeError:
        return False
    return True


def candidate_path(final: Path, preset: str) -> Path:
    # Keep .glb as the final suffix: Blender otherwise appends it and the
    # validator looks at a different path than the exporter wrote.
    return final.with_name(f".{final.stem}.production-{os.getpid()}-{preset}.glb")


def install_pair(character: Character, base_candidate: Path, lod_candidate: Path, log) -> None:
    backup_dir = Path(tempfile.mkdtemp(prefix=f"chinesegame-{character.preset}-rollback-"))
    base_backup, lod_backup = backup_dir / character.base.name, backup_dir / character.lod.name
    shutil.copy2(character.base, base_backup)
    shutil.copy2(character.lod, lod_backup)
    try:
        os.replace(base_candidate, character.base)
        os.replace(lod_candidate, character.lod)
        for command, label in validator_commands(character, character.base, character.lod):
            run(command, log, f"installed {label}")
    except Exception:
        shutil.copy2(base_backup, character.base)
        shutil.copy2(lod_backup, character.lod)
        raise
    finally:
        shutil.rmtree(backup_dir, ignore_errors=True)


def build_one(character: Character, blender: Path, force: bool) -> tuple[str, str, float]:
    started = time.monotonic()
    LOGS.mkdir(parents=True, exist_ok=True)
    log_path = LOGS / f"{character.preset}.log"
    base_candidate = candidate_path(character.base, character.preset)
    lod_candidate = candidate_path(character.lod, character.preset)
    base_candidate.unlink(missing_ok=True)
    lod_candidate.unlink(missing_ok=True)
    try:
        with log_path.open("w", encoding="utf-8") as log:
            if not force and already_production(character, log):
                return character.preset, "skipped", time.monotonic() - started
            run([
                str(blender), "--background", "--python", str(BUILDER), "--",
                "--preset", character.preset,
                "--texture-profile", "production",
                "--output", str(base_candidate),
            ], log, "production character build")
            base_check = ["node", str(ROOT / ".rigcheck.js"), str(base_candidate)]
            if character.preset == "doudou":
                base_check.append("--child")
            run(base_check, log, "candidate base validation")
            run([
                "node", str(TOOLS / "audit_rig_textures.js"), "--production",
                "--soft-mib", "12", "--hard-mib", "16", str(base_candidate),
            ], log, "candidate texture validation")
            run([
                "node", str(TOOLS / "compare_rig_identity.js"),
                str(character.base), str(base_candidate),
            ], log, "identity preservation validation")
            run([
                str(blender), "--background", "--python", str(TOOLS / "build_rig_lods.py"),
                "--", str(base_candidate), str(lod_candidate),
            ], log, "LOD build")
            run(["node", str(ROOT / ".riglodcheck.js"), str(lod_candidate)],
                log, "candidate LOD validation")
            run([
                "node", str(TOOLS / "audit_rig_textures.js"), "--production",
                "--soft-mib", "12", "--hard-mib", "16", str(lod_candidate),
            ], log, "candidate LOD texture validation")
            install_pair(character, base_candidate, lod_candidate, log)
        return character.preset, "built", time.monotonic() - started
    except Exception:
        base_candidate.unlink(missing_ok=True)
        lod_candidate.unlink(missing_ok=True)
        raise


def main(argv: Sequence[str] | None = None) -> int:
    args = arguments(argv)
    if not 1 <= args.workers <= 4:
        raise SystemExit("--workers must be between 1 and 4")
    characters = authored_characters()
    if args.ids:
        requested = {value.strip() for value in args.ids.split(",") if value.strip()}
        known = {character.preset for character in characters}
        unknown = requested - known
        if unknown:
            raise SystemExit("Unknown authored IDs: " + ", ".join(sorted(unknown)))
        characters = [character for character in characters if character.preset in requested]
    if args.list:
        for character in characters:
            print(f"{character.preset}\t{character.base.name}\t{character.lod.name}")
        print(f"AUTHORED_TEXTURE_BATCH selected={len(characters)}")
        return 0

    blender = blender_path(args.blender)
    failures: list[tuple[str, str]] = []
    counts = {"built": 0, "skipped": 0}
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        future_to_character = {
            pool.submit(build_one, character, blender, args.force): character
            for character in characters
        }
        for future in concurrent.futures.as_completed(future_to_character):
            character = future_to_character[future]
            try:
                preset, status, elapsed = future.result()
                counts[status] += 1
                with PRINT_LOCK:
                    print(f"{status.upper():7} {preset:28} {elapsed:6.1f}s", flush=True)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                failures.append((character.preset, str(exc)))
                with PRINT_LOCK:
                    print(f"FAILED  {character.preset:28} {exc} (see {LOGS / (character.preset + '.log')})",
                          flush=True)
    elapsed = time.monotonic() - started
    print(f"AUTHORED_TEXTURE_BATCH built={counts['built']} skipped={counts['skipped']} "
          f"failed={len(failures)} elapsed={elapsed:.1f}s")
    if failures:
        for preset, message in failures:
            print(f"  {preset}: {message}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
