#!/usr/bin/env python3
"""Build and validate the generated production cast with Blender.

The command is deliberately resumable.  A character is skipped only when both
its source GLB and its same-identity three-tier LOD bundle pass their validators.
New files are built beside the destination and atomically renamed after they
pass, so an interrupted batch never turns a partial export into a game asset.

Examples:

    python3 tools/characters/build_cast_batch.py --workers 2
    python3 tools/characters/build_cast_batch.py --place mall --force
    python3 tools/characters/build_cast_batch.py --shard 0/2
"""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import shutil
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent
RIGS = ROOT / "assets" / "rigs"
LOGS = ROOT / ".cast-build"
DEFAULT_BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
PRINT_LOCK = threading.Lock()


@dataclass(frozen=True)
class Character:
    character_id: str
    place: str
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
    parser.add_argument("--place", action="append", default=[], help="Build only this place (repeatable).")
    parser.add_argument("--ids", help="Comma-separated roster IDs to build.")
    parser.add_argument("--shard", help="Zero-based I/N deterministic shard, for example 0/2.")
    parser.add_argument("--force", action="store_true", help="Rebuild valid existing outputs.")
    parser.add_argument("--list", action="store_true", help="List the selected build set and exit.")
    parser.add_argument("--max", type=int, default=None, help="Limit selected identities (diagnostics).")
    return parser.parse_args(argv)


def blender_path(requested: Path | None) -> Path:
    if requested:
        result = requested.expanduser().resolve()
    elif DEFAULT_BLENDER.is_file():
        result = DEFAULT_BLENDER
    else:
        found = shutil.which("blender")
        result = Path(found).resolve() if found else DEFAULT_BLENDER
    if not result.is_file():
        raise SystemExit(f"Blender executable not found: {result}")
    return result


def generated_characters() -> list[Character]:
    if str(TOOLS) not in sys.path:
        sys.path.insert(0, str(TOOLS))
    from resolve_cast import resolve_and_validate  # pylint: disable=import-outside-toplevel

    records, _report = resolve_and_validate()
    result = []
    for record in records:
        if record["status"] != "generated":
            continue
        result.append(
            Character(
                character_id=str(record["id"]),
                place=str(record["place"]),
                output_name=str(record["build"]["output_name"]),
            )
        )
    return result


def select_characters(characters: Iterable[Character], args: argparse.Namespace) -> list[Character]:
    selected = sorted(characters, key=lambda item: item.character_id)
    if args.place:
        places = set(args.place)
        selected = [item for item in selected if item.place in places]
    if args.ids:
        requested = {value.strip() for value in args.ids.split(",") if value.strip()}
        known = {item.character_id for item in selected}
        unknown = requested - {item.character_id for item in characters}
        if unknown:
            raise SystemExit(f"Unknown generated roster IDs: {', '.join(sorted(unknown))}")
        selected = [item for item in selected if item.character_id in requested]
        missing_from_filter = requested - known
        if missing_from_filter:
            raise SystemExit(
                "IDs excluded by --place: " + ", ".join(sorted(missing_from_filter))
            )
    if args.shard:
        try:
            index_text, count_text = args.shard.split("/", 1)
            index, count = int(index_text), int(count_text)
        except (ValueError, TypeError) as exc:
            raise SystemExit("--shard must be written as zero-based I/N, e.g. 0/2") from exc
        if count < 1 or not 0 <= index < count:
            raise SystemExit("--shard requires N >= 1 and 0 <= I < N")
        selected = [item for position, item in enumerate(selected) if position % count == index]
    if args.max is not None:
        if args.max < 0:
            raise SystemExit("--max cannot be negative")
        selected = selected[: args.max]
    return selected


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


def valid(command: list[str], log, label: str) -> bool:
    try:
        run(command, log, label)
    except RuntimeError:
        return False
    return True


def temporary_path(final: Path, character_id: str) -> Path:
    # Blender's glTF exporter appends `.glb` when the requested path does not already end in that
    # suffix. Keep the temporary marker *before* the real suffix so the written path is exact.
    return final.with_name(
        f".{final.stem}.building-{os.getpid()}-{character_id}{final.suffix}"
    )


def build_one(character: Character, blender: Path, force: bool) -> tuple[str, str, float]:
    started = time.monotonic()
    LOGS.mkdir(parents=True, exist_ok=True)
    RIGS.mkdir(parents=True, exist_ok=True)
    log_path = LOGS / f"{character.character_id}.log"
    base_tmp = temporary_path(character.base, character.character_id)
    lod_tmp = temporary_path(character.lod, character.character_id)
    for path in (base_tmp, lod_tmp):
        path.unlink(missing_ok=True)

    try:
        with log_path.open("w", encoding="utf-8") as log:
            base_valid = character.base.is_file() and valid(
                ["node", str(ROOT / ".rigcheck.js"), str(character.base)],
                log,
                "existing base validation",
            )
            lod_valid = character.lod.is_file() and valid(
                ["node", str(ROOT / ".riglodcheck.js"), str(character.lod)],
                log,
                "existing LOD validation",
            )
            if base_valid and lod_valid and not force:
                return character.character_id, "skipped", time.monotonic() - started

            if force or not base_valid:
                run(
                    [
                        str(blender),
                        "--background",
                        "--python",
                        str(TOOLS / "build_mpfb_character.py"),
                        "--",
                        "--preset",
                        character.character_id,
                        "--output",
                        str(base_tmp),
                    ],
                    log,
                    "character build",
                )
                run(
                    ["node", str(ROOT / ".rigcheck.js"), str(base_tmp)],
                    log,
                    "base validation",
                )
                os.replace(base_tmp, character.base)
            else:
                log.write(f"REUSE validated base {character.base}\n")

            run(
                [
                    str(blender),
                    "--background",
                    "--python",
                    str(TOOLS / "build_rig_lods.py"),
                    "--",
                    str(character.base),
                    str(lod_tmp),
                ],
                log,
                "LOD build",
            )
            run(
                ["node", str(ROOT / ".riglodcheck.js"), str(lod_tmp)],
                log,
                "LOD validation",
            )
            os.replace(lod_tmp, character.lod)
        return character.character_id, "built", time.monotonic() - started
    except Exception:
        for path in (base_tmp, lod_tmp):
            path.unlink(missing_ok=True)
        raise


def main(argv: Sequence[str] | None = None) -> int:
    args = arguments(argv)
    if args.workers < 1 or args.workers > 4:
        raise SystemExit("--workers must be between 1 and 4")
    characters = generated_characters()
    selected = select_characters(characters, args)
    if args.list:
        for character in selected:
            print(f"{character.character_id}\t{character.place}\t{character.lod.name}")
        print(f"CAST_BATCH selected={len(selected)}")
        return 0
    if not selected:
        print("CAST_BATCH selected=0")
        return 0

    blender = blender_path(args.blender)
    failures: list[tuple[str, str]] = []
    counts = {"built": 0, "skipped": 0}
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        future_to_character = {
            pool.submit(build_one, character, blender, args.force): character
            for character in selected
        }
        for future in concurrent.futures.as_completed(future_to_character):
            character = future_to_character[future]
            try:
                character_id, result, elapsed = future.result()
                counts[result] += 1
                with PRINT_LOCK:
                    print(
                        f"CAST_BATCH {result.upper()} {character_id} "
                        f"{elapsed:.1f}s ({counts['built'] + counts['skipped']}/{len(selected)})",
                        flush=True,
                    )
            except Exception as exc:  # keep the independent identities moving
                failures.append((character.character_id, str(exc)))
                with PRINT_LOCK:
                    print(
                        f"CAST_BATCH FAILED {character.character_id}: {exc} "
                        f"(see {LOGS / (character.character_id + '.log')})",
                        file=sys.stderr,
                        flush=True,
                    )

    elapsed = time.monotonic() - started
    print(
        f"CAST_BATCH complete selected={len(selected)} built={counts['built']} "
        f"skipped={counts['skipped']} failed={len(failures)} seconds={elapsed:.1f}"
    )
    if failures:
        for character_id, error in failures:
            print(f"  {character_id}: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
