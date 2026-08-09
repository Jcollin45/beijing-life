#!/usr/bin/env python3
"""Resolve and validate the frozen 82-person Beijing Life production cast.

This module deliberately has no Blender or MPFB imports.  It is both a small
command-line audit tool and the data adapter used by build_mpfb_character.py.
The original 20 hand-authored presets remain the source of truth for those
characters; the other 62 production identities are expanded deterministically
from cast_designs.json and carry the final ``generated`` roster status.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROSTER = ROOT / "art" / "character-concepts" / "NPC-ROSTER-82.json"
DEFAULT_DESIGNS = Path(__file__).with_name("cast_designs.json")
DEFAULT_BUILDER = Path(__file__).with_name("build_mpfb_character.py")


class CastValidationError(ValueError):
    """Raised when roster, design, asset, or license contracts disagree."""


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CastValidationError(f"Could not read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise CastValidationError(f"Expected a JSON object in {path}")
    return value


def _stable_unit(seed: str, character_id: str, field: str, attempt: int = 0) -> float:
    payload = f"{seed}\0{character_id}\0{field}\0{attempt}".encode("utf-8")
    integer = int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")
    return integer / ((1 << 64) - 1)


def _stable_pick(
    values: Sequence[Any], seed: str, character_id: str, field: str, attempt: int = 0
) -> Any:
    if not values:
        raise CastValidationError(f"No choices available for {character_id}.{field}")
    index = int(_stable_unit(seed, character_id, field, attempt) * len(values))
    return values[min(index, len(values) - 1)]


def _between(bounds: Sequence[float], unit: float, digits: int = 5) -> float:
    if len(bounds) != 2 or float(bounds[0]) > float(bounds[1]):
        raise CastValidationError(f"Invalid numeric range: {bounds!r}")
    return round(float(bounds[0]) + (float(bounds[1]) - float(bounds[0])) * unit, digits)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _pascal_id(character_id: str) -> str:
    words = [word for word in re.split(r"[^a-zA-Z0-9]+", character_id) if word]
    return "".join(word[:1].upper() + word[1:] for word in words)


def _find_profile(character: Mapping[str, Any], rules: Sequence[Mapping[str, Any]]) -> Mapping[str, Any]:
    character_id = str(character["id"])
    place = str(character["place"])
    role = str(character["role_zh"])
    for rule in rules:
        has_filter = False
        matched = True
        if rule.get("places"):
            has_filter = True
            matched = matched and place in rule["places"]
        if rule.get("place_prefix"):
            has_filter = True
            matched = matched and any(place.startswith(prefix) for prefix in rule["place_prefix"])
        if rule.get("role_contains"):
            has_filter = True
            matched = matched and any(token in role for token in rule["role_contains"])
        if rule.get("id_contains"):
            has_filter = True
            matched = matched and any(token in character_id for token in rule["id_contains"])
        if matched and (has_filter or rule is rules[-1]):
            return rule
    raise CastValidationError(f"No role profile matched {character['id']}")


def _age_band(character_id: str, age_bands: Mapping[str, Mapping[str, Any]]) -> str:
    for name, definition in age_bands.items():
        if character_id in definition.get("ids", ()):
            return name
    if "adult" not in age_bands:
        raise CastValidationError("age_bands must contain an adult default")
    return "adult"


def _skin_for(gender: str, age_band: str) -> str:
    age_prefix = {
        "young": "young",
        "adult": "young",
        "mature": "middleage",
        "senior": "old",
    }[age_band]
    return f"{age_prefix}_asian_{gender}.mhmat"


def _face_details(
    designs: Mapping[str, Any],
    seed: str,
    character_id: str,
    face_shape: Mapping[str, Any],
) -> list[list[Any]]:
    details: list[list[Any]] = []
    face = designs["east_asian_face"]
    for index, target in enumerate(face["symmetric_targets"]):
        weight = _between(
            target["range"], _stable_unit(seed, character_id, f"face-target-{index}")
        )
        for path in target["paths"]:
            details.append([path, weight])

    details.append(
        [
            face_shape["target"],
            _between(
                face_shape["range"], _stable_unit(seed, character_id, "face-shape-weight")
            ),
        ]
    )

    asymmetries = list(face["asymmetry_targets"])
    start = int(_stable_unit(seed, character_id, "asymmetry-start") * len(asymmetries))
    for offset in range(3):
        path = asymmetries[(start + offset * 2) % len(asymmetries)]
        details.append(
            [
                path,
                _between(
                    face["asymmetry_range"],
                    _stable_unit(seed, character_id, f"asymmetry-{offset}"),
                ),
            ]
        )
    return details


def _outfit_pieces(outfit: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Normalize a simple one-piece outfit or a compact layered role outfit."""

    if outfit.get("pieces"):
        return [dict(piece) for piece in outfit["pieces"]]
    return [
        {
            "asset": outfit["asset"],
            "suffix": "uniform",
            "color": "primary",
            "budget": "garment",
            "format": "JPEG",
            "transparent": False,
        }
    ]


def _generated_build(
    character: Mapping[str, Any],
    designs: Mapping[str, Any],
    gender: str,
    age_band: str,
    profile: Mapping[str, Any],
    body_name: str,
    face_shape: Mapping[str, Any],
    hair_asset: str,
    outfit: Mapping[str, Any],
    palette: Mapping[str, Any],
) -> dict[str, Any]:
    character_id = str(character["id"])
    seed = str(designs["seed"])
    body = designs["body_styles"][body_name]
    texture = designs["texture_budget"]

    values = dict(designs["ethnicity_contract"]["macros"])
    values["gender"] = _between(
        [0.02, 0.08] if gender == "female" else [0.92, 0.98],
        _stable_unit(seed, character_id, "gender-macro"),
    )
    values["age"] = _between(
        designs["age_bands"][age_band]["range"],
        _stable_unit(seed, character_id, "age-macro"),
    )
    for macro, spread in (("weight", 0.045), ("muscle", 0.05), ("height", 0.04), ("proportions", 0.03)):
        jitter = (_stable_unit(seed, character_id, f"body-{macro}") - 0.5) * spread * 2.0
        values[macro] = round(_clamp(float(body[macro]) + jitter), 5)

    brow_number = 1 + int(_stable_unit(seed, character_id, "eyebrows") * 12)
    brows = f"eyebrow{brow_number:03d}.mhclo"
    shoe_number = 1 + int(_stable_unit(seed, character_id, "shoes") * 6)
    shoes = f"shoes{shoe_number:02d}.mhclo"
    hair_grade = _stable_pick(designs["hair"]["grades"], seed, character_id, "hair-grade")
    skin_grade = [
        round(0.965 + 0.03 * _stable_unit(seed, character_id, "skin-r"), 4),
        round(0.945 + 0.035 * _stable_unit(seed, character_id, "skin-g"), 4),
        round(0.925 + 0.04 * _stable_unit(seed, character_id, "skin-b"), 4),
    ]
    grey_amount = 0.0
    if age_band == "mature":
        grey_amount = _between([0.12, 0.34], _stable_unit(seed, character_id, "grey-hair"), 4)
    elif age_band == "senior":
        grey_amount = _between([0.62, 0.88], _stable_unit(seed, character_id, "grey-hair"), 4)

    clothing_pieces: list[list[Any]] = []
    flat_colors: dict[str, Any] = {"shoes": palette["secondary"]}
    texture_tints: dict[str, Any] = {}
    mesh_offsets: dict[str, float] = {}
    material_matches: dict[str, list[str]] = {}
    for piece in _outfit_pieces(outfit):
        suffix = str(piece["suffix"])
        budget = str(piece.get("budget", "garment"))
        color_slot = piece.get("color")
        tint_slot = piece.get("tint")
        if color_slot and tint_slot:
            raise CastValidationError(
                f"Outfit {outfit['id']} piece {piece['asset']} requests both flat colour and tint"
            )
        if color_slot:
            flat_colors[suffix] = palette[str(color_slot)]
        if tint_slot:
            texture_tints[suffix] = palette[str(tint_slot)]
        if piece.get("offset"):
            mesh_offsets[suffix] = float(piece["offset"])
        if piece.get("matches"):
            material_matches[suffix] = [str(token) for token in piece["matches"]]
        clothing_pieces.append(
            [
                "clothes",
                piece["asset"],
                "Clothes",
                suffix,
                int(texture[budget]),
                str(piece.get("format", "JPEG")),
                bool(piece.get("transparent", False)),
            ]
        )

    object_name = _pascal_id(character_id)
    build: dict[str, Any] = {
        "display_name": f"{character['name_zh']} ({character['role_zh']})",
        "description": f"{age_band} {gender} Chinese {character['role_zh']}",
        "object_name": object_name,
        "output_name": f"{object_name}.glb",
        "values": values,
        "details": _face_details(designs, seed, character_id, face_shape),
        "skin": _skin_for(gender, age_band),
        "skin_texture_size": int(texture["skin"]),
        "texture_grades": {
            "skin": skin_grade,
            "hair": hair_grade,
            "brows": hair_grade,
        },
        "texture_flat_colors": flat_colors,
        "pieces": [
            ["eyes", "high-poly.mhclo", "Eyes", "eyes", int(texture["eyes"]), "PNG", True],
            ["eyebrows", brows, "Eyebrows", "brows", int(texture["eyebrows"]), "PNG", True],
            ["hair", hair_asset, "Hair", "hair", int(texture["hair"]), "PNG", True],
            *clothing_pieces,
            ["clothes", shoes, "Clothes", "shoes", int(texture["shoes"]), "JPEG", False],
        ],
        "design": {
            "roster_id": character_id,
            "identity": "Chinese / East Asian",
            "gender": gender,
            "age_band": age_band,
            "body_style": body_name,
            "face_shape": face_shape["id"],
            "hair": hair_asset,
            "outfit": outfit["id"],
            "palette": palette["id"],
            "profile": profile["id"],
            "role_signal": profile.get("required_signal", profile["id"]),
        },
    }
    asset_catalog = _asset_catalog(designs)
    referenced = [(piece[0], piece[1]) for piece in build["pieces"]]
    referenced.append(("skins", build["skin"]))
    build["license_sources"] = sorted(
        {asset_catalog[key]["id"] for key in referenced if key in asset_catalog}
    )
    if grey_amount:
        build["grey_hair"] = {"hair": grey_amount}
    if texture_tints:
        build["texture_tints"] = texture_tints
    if mesh_offsets:
        build["mesh_offsets"] = mesh_offsets
    if material_matches:
        build["material_matches"] = material_matches
    return build


def _legacy_presets_from_ast(builder_path: Path = DEFAULT_BUILDER) -> dict[str, dict[str, Any]]:
    """Read only the literal PRESETS assignment without importing bpy."""

    try:
        tree = ast.parse(builder_path.read_text(encoding="utf-8"), filename=str(builder_path))
    except (OSError, SyntaxError) as exc:
        raise CastValidationError(f"Could not parse legacy presets in {builder_path}: {exc}") from exc
    for node in tree.body:
        if (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and node.target.id == "PRESETS"
        ):
            try:
                value = ast.literal_eval(node.value)
            except (TypeError, ValueError) as exc:
                raise CastValidationError("PRESETS must begin as a literal dictionary") from exc
            if not isinstance(value, dict):
                break
            return value
    raise CastValidationError(f"No literal PRESETS dictionary found in {builder_path}")


def _asset_catalog(designs: Mapping[str, Any]) -> dict[tuple[str, str], Mapping[str, Any]]:
    catalog: dict[tuple[str, str], Mapping[str, Any]] = {}
    for source in designs["asset_sources"]:
        for subdir, filenames in source["assets"].items():
            for filename in filenames:
                key = (str(subdir), str(filename))
                if key in catalog:
                    raise CastValidationError(f"Asset declared by multiple sources: {subdir}/{filename}")
                catalog[key] = source
    return catalog


def _resolve_generated(
    generated_characters: Sequence[Mapping[str, Any]], designs: Mapping[str, Any]
) -> dict[str, dict[str, Any]]:
    seed = str(designs["seed"])
    gender_by_id: dict[str, str] = {}
    for gender in ("female", "male"):
        for character_id in designs["demographics"][gender]:
            if character_id in gender_by_id:
                raise CastValidationError(f"Gender assigned twice: {character_id}")
            gender_by_id[character_id] = gender

    outfits = {outfit["id"]: outfit for outfit in designs["outfits"]}
    used_signatures: set[tuple[str, ...]] = set()
    resolved: dict[str, dict[str, Any]] = {}
    for character in generated_characters:
        character_id = str(character["id"])
        try:
            gender = gender_by_id[character_id]
        except KeyError as exc:
            raise CastValidationError(f"No explicit gender assignment for {character_id}") from exc
        age_band = _age_band(character_id, designs["age_bands"])
        profile = _find_profile(character, designs["profile_rules"])
        if profile.get("palette_ids"):
            requested_palettes = set(profile["palette_ids"])
            palette_pool = [
                palette for palette in designs["palettes"] if palette["id"] in requested_palettes
            ]
        else:
            palette_pool = [
                palette
                for palette in designs["palettes"]
                if profile["palette_tag"] in palette["tags"]
            ]
        outfit_pool = [outfits[name] for name in profile[f"{gender}_outfits"]]
        hair_pool = designs["hair"][gender]

        # Resolve rare categorical collisions by a deterministic retry.  This
        # guarantees that no generated cast member is merely another person's
        # age/body/face/hair/outfit/palette combination.
        for attempt in range(256):
            body_name = _stable_pick(profile["bodies"], seed, character_id, "body-style", attempt)
            face_shape = _stable_pick(designs["face_shapes"], seed, character_id, "face-shape", attempt)
            hair_asset = _stable_pick(hair_pool, seed, character_id, "hair", attempt)
            outfit = _stable_pick(outfit_pool, seed, character_id, "outfit", attempt)
            palette = _stable_pick(palette_pool, seed, character_id, "palette", attempt)
            signature = (
                gender,
                age_band,
                body_name,
                str(face_shape["id"]),
                str(hair_asset),
                str(outfit["id"]),
                str(palette["id"]),
            )
            if signature not in used_signatures:
                used_signatures.add(signature)
                break
        else:
            raise CastValidationError(f"Could not make a unique design signature for {character_id}")

        resolved[character_id] = _generated_build(
            character,
            designs,
            gender,
            age_band,
            profile,
            body_name,
            face_shape,
            hair_asset,
            outfit,
            palette,
        )
    return resolved


def resolve_cast(
    roster_path: Path = DEFAULT_ROSTER,
    designs_path: Path = DEFAULT_DESIGNS,
    legacy_presets: Mapping[str, Mapping[str, Any]] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    roster = _read_json(roster_path)
    designs = _read_json(designs_path)
    legacy = dict(legacy_presets) if legacy_presets is not None else _legacy_presets_from_ast()
    characters = roster.get("characters", [])
    generated_characters = [
        character for character in characters if character.get("status") == "generated"
    ]
    generated_builds = _resolve_generated(generated_characters, designs)

    records: list[dict[str, Any]] = []
    for character in characters:
        character_id = str(character["id"])
        status = character.get("status")
        if status == "authored":
            preset_name = character.get("preset")
            if preset_name not in legacy:
                raise CastValidationError(
                    f"Authored roster entry {character_id} has no legacy preset {preset_name!r}"
                )
            build = dict(legacy[preset_name])
            source = "authored-preset"
        elif status == "generated":
            build = generated_builds[character_id]
            source = "cast-design-resolver"
        else:
            raise CastValidationError(f"Unknown status {status!r} for {character_id}")
        records.append(
            {
                "id": character_id,
                "name_zh": character["name_zh"],
                "place": character["place"],
                "role_zh": character["role_zh"],
                "status": status,
                "source": source,
                "build": build,
            }
        )
    return records, roster, designs


def discover_asset_root() -> Path | None:
    candidates: list[Path] = []
    explicit = os.environ.get("MPFB_ASSET_ROOT")
    if explicit:
        candidates.append(Path(explicit).expanduser())
    home = Path.home()
    patterns = (
        "Library/Application Support/Blender/*/extensions/.user/blender_org/mpfb/data",
        ".config/blender/*/extensions/.user/blender_org/mpfb/data",
        ".local/share/blender/*/extensions/.user/blender_org/mpfb/data",
    )
    for pattern in patterns:
        candidates.extend(sorted(home.glob(pattern), reverse=True))
    for candidate in candidates:
        if (candidate / "skins").is_dir() and (candidate / "clothes").is_dir():
            return candidate.resolve()
    return None


def _license_from_header(path: Path) -> str | None:
    try:
        header = path.read_bytes()[:8192].decode("utf-8", errors="ignore")
    except OSError:
        return None
    if re.search(r"\bCC0\b", header, re.IGNORECASE):
        return "CC0-1.0"
    by_match = re.search(r"\bCC[ _-]*BY(?:[ _-]*(\d(?:\.\d)?))?\b", header, re.IGNORECASE)
    if by_match:
        return f"CC-BY-{by_match.group(1)}" if by_match.group(1) else "CC-BY-unversioned"
    return None


def _license_allowed(license_id: str, allowed: Iterable[str]) -> bool:
    allowed_values = set(allowed)
    if license_id == "CC0-1.0":
        return license_id in allowed_values
    return license_id.startswith("CC-BY-") and any(item.startswith("CC-BY-") for item in allowed_values)


def _find_installed_asset(asset_root: Path, subdir: str, filename: str) -> Path | None:
    directory = asset_root / subdir
    if not directory.is_dir():
        return None
    matches = sorted(directory.glob(f"*/{filename}"))
    if not matches:
        matches = sorted(directory.rglob(filename))
    return matches[0] if matches else None


def _validate_source_contract(
    roster: Mapping[str, Any], designs: Mapping[str, Any], legacy: Mapping[str, Any]
) -> None:
    characters = roster.get("characters")
    if not isinstance(characters, list):
        raise CastValidationError("Roster characters must be an array")
    ids = [character.get("id") for character in characters]
    if len(ids) != len(set(ids)):
        raise CastValidationError("Roster IDs are not unique")
    counts = Counter(character.get("status") for character in characters)
    expected = roster.get("counts", {})
    if len(characters) != 82 or counts != Counter({"authored": 20, "generated": 62}):
        raise CastValidationError(
            f"Frozen roster must be 82 = 20 authored + 62 generated + 0 queued, got {counts}"
        )
    if expected != {"total": 82, "authored": 20, "generated": 62, "queued": 0}:
        raise CastValidationError(f"Roster count declaration drifted: {expected}")

    for character in characters:
        character_id = character["id"]
        if character.get("rig") != character_id:
            raise CastValidationError(
                f"Production roster rig must equal stable identity ID: {character_id}"
            )
        if character.get("preset") != character_id:
            raise CastValidationError(
                f"Production roster preset must equal stable identity ID: {character_id}"
            )

    authored_presets = {character["preset"] for character in characters if character["status"] == "authored"}
    if authored_presets != set(legacy):
        missing = sorted(authored_presets - set(legacy))
        extra = sorted(set(legacy) - authored_presets)
        raise CastValidationError(f"Legacy authored preset drift: missing={missing}, extra={extra}")

    generated_ids = {
        character["id"] for character in characters if character["status"] == "generated"
    }
    female = set(designs["demographics"]["female"])
    male = set(designs["demographics"]["male"])
    if female & male:
        raise CastValidationError(f"Gender lists overlap: {sorted(female & male)}")
    if female | male != generated_ids:
        raise CastValidationError(
            f"Demographic assignments differ from generated roster: "
            f"missing={sorted(generated_ids - female - male)}, "
            f"extra={sorted((female | male) - generated_ids)}"
        )

    age_seen: set[str] = set()
    for definition in designs["age_bands"].values():
        ids_in_band = set(definition.get("ids", ()))
        if age_seen & ids_in_band:
            raise CastValidationError(f"Age-band assignments overlap: {sorted(age_seen & ids_in_band)}")
        if not ids_in_band <= generated_ids:
            raise CastValidationError(
                f"Age band names unknown IDs: {sorted(ids_in_band - generated_ids)}"
            )
        age_seen |= ids_in_band

    macros = designs["ethnicity_contract"]["macros"]
    if macros != {"asian": 1.0, "caucasian": 0.0, "african": 0.0}:
        raise CastValidationError(f"Ethnicity macro contract changed: {macros}")
    if any("_asian_" not in skin for skin in designs["ethnicity_contract"]["allowed_skins"]):
        raise CastValidationError("The generated-cast skin allowlist contains a non-Asian skin")

    requested_budget = designs["texture_budget"]
    hard_limits = {
        "skin": 1024,
        "eyes": 512,
        "eyebrows": 512,
        "hair": 512,
        "garment": 512,
        "accessory": 256,
        "shoes": 256,
    }
    for kind, hard_limit in hard_limits.items():
        if int(requested_budget[kind]) > hard_limit:
            raise CastValidationError(
                f"Generated {kind} texture budget exceeds {hard_limit}px: {requested_budget[kind]}"
            )

    allowed = designs["license_policy"]["allowed_spdx"]
    catalog = _asset_catalog(designs)
    for source in designs["asset_sources"]:
        if not _license_allowed(source["license"], allowed):
            raise CastValidationError(f"Disallowed source license: {source['id']}={source['license']}")
    outfits_by_id = {outfit["id"]: outfit for outfit in designs["outfits"]}
    outfit_ids = set(outfits_by_id)
    for outfit in designs["outfits"]:
        for piece in _outfit_pieces(outfit):
            if ("clothes", piece["asset"]) not in catalog:
                raise CastValidationError(
                    f"Outfit asset is absent from the license catalog: {piece['asset']}"
                )
            budget = piece.get("budget", "garment")
            if budget not in requested_budget:
                raise CastValidationError(f"Outfit {outfit['id']} uses unknown texture budget {budget}")
            if piece.get("color") not in (None, "primary", "secondary", "accent"):
                raise CastValidationError(
                    f"Outfit {outfit['id']} uses unknown palette slot {piece.get('color')}"
                )
            if piece.get("tint") not in (None, "primary", "secondary", "accent"):
                raise CastValidationError(
                    f"Outfit {outfit['id']} uses unknown tint slot {piece.get('tint')}"
                )
            if piece.get("color") and piece.get("tint"):
                raise CastValidationError(
                    f"Outfit {outfit['id']} cannot flat-colour and tint the same piece"
                )
            if piece.get("format", "JPEG") not in ("JPEG", "PNG"):
                raise CastValidationError(
                    f"Outfit {outfit['id']} uses unsupported texture format {piece.get('format')}"
                )
            if piece.get("matches") is not None and not all(
                isinstance(token, str) and token for token in piece["matches"]
            ):
                raise CastValidationError(f"Outfit {outfit['id']} has invalid material aliases")
    palette_tags = {tag for palette in designs["palettes"] for tag in palette["tags"]}
    palette_ids = {palette["id"] for palette in designs["palettes"]}
    for rule in designs["profile_rules"]:
        if rule.get("palette_ids"):
            unknown_palettes = set(rule["palette_ids"]) - palette_ids
            if unknown_palettes:
                raise CastValidationError(
                    f"Profile {rule['id']} references unknown palettes: {unknown_palettes}"
                )
        elif rule.get("palette_tag") not in palette_tags:
            raise CastValidationError(f"Profile {rule['id']} has no licensed palette group")
        for gender in ("female", "male"):
            unknown = set(rule[f"{gender}_outfits"]) - outfit_ids
            if unknown:
                raise CastValidationError(f"Profile {rule['id']} references unknown outfits: {unknown}")
            for outfit_id in rule[f"{gender}_outfits"]:
                outfit = outfits_by_id[outfit_id]
                if outfit["gender"] != gender:
                    raise CastValidationError(
                        f"Profile {rule['id']} assigns {outfit_id} to the wrong gender"
                    )
                required_signal = rule.get("required_signal")
                if required_signal and required_signal not in outfit.get("signals", ()):
                    raise CastValidationError(
                        f"Profile {rule['id']} allows {outfit_id} without required "
                        f"role signal {required_signal}"
                    )
                if rule["id"] != "fitness-safety" and any(
                    piece["asset"] == "female_sportsuit01.mhclo"
                    for piece in _outfit_pieces(outfit)
                ):
                    raise CastValidationError(
                        f"Crop-top sportsuit leaked into non-athletic profile {rule['id']}"
                    )


def validate_cast(
    records: Sequence[Mapping[str, Any]],
    roster: Mapping[str, Any],
    designs: Mapping[str, Any],
    *,
    asset_root: Path | None = None,
    check_installed: bool = True,
) -> dict[str, Any]:
    # Roster preset names currently equal authored IDs; retain a general mapping
    # so a future display-ID rename does not weaken this audit.
    preset_legacy = {
        character["preset"]: next(
            record["build"] for record in records if record["id"] == character["id"]
        )
        for character in roster["characters"]
        if character["status"] == "authored"
    }
    _validate_source_contract(roster, designs, preset_legacy)

    allowed_skins = set(designs["ethnicity_contract"]["allowed_skins"])
    generated_signatures: set[tuple[Any, ...]] = set()
    age_values: set[float] = set()
    object_names: set[str] = set()
    output_names: set[str] = set()
    catalog = _asset_catalog(designs)
    outfits_by_id = {outfit["id"]: outfit for outfit in designs["outfits"]}
    profiles_by_id = {profile["id"]: profile for profile in designs["profile_rules"]}
    allowed_licenses = designs["license_policy"]["allowed_spdx"]
    asset_refs: set[tuple[str, str, str]] = set()
    role_signaled = 0

    for record in records:
        build = record["build"]
        if build["object_name"] in object_names or build["output_name"] in output_names:
            raise CastValidationError(f"Duplicate build/output name for {record['id']}")
        object_names.add(build["object_name"])
        output_names.add(build["output_name"])
        values = build["values"]
        if (
            float(values.get("asian", -1.0)) != 1.0
            or float(values.get("caucasian", -1.0)) != 0.0
            or float(values.get("african", -1.0)) != 0.0
        ):
            raise CastValidationError(f"Non-Asian macro values in {record['id']}: {values}")
        if build["skin"] not in allowed_skins:
            raise CastValidationError(f"Non-Asian or undeclared skin in {record['id']}: {build['skin']}")

        if record["status"] == "generated":
            design = build["design"]
            expected_gender = design["gender"]
            if not build["skin"].endswith(f"_{expected_gender}.mhmat"):
                raise CastValidationError(
                    f"Skin/gender mismatch in {record['id']}: {build['skin']} vs {expected_gender}"
                )
            if (expected_gender == "female" and float(values["gender"]) >= 0.5) or (
                expected_gender == "male" and float(values["gender"]) <= 0.5
            ):
                raise CastValidationError(f"Gender macro mismatch in {record['id']}")
            outfit_contract = outfits_by_id[design["outfit"]]
            profile_contract = profiles_by_id[design["profile"]]
            required_signal = profile_contract.get("required_signal")
            if required_signal:
                if (
                    design.get("role_signal") != required_signal
                    or required_signal not in outfit_contract.get("signals", ())
                ):
                    raise CastValidationError(
                        f"Resolved role signal mismatch in {record['id']}: {required_signal}"
                    )
                role_signaled += 1
            signature = tuple(
                design[key]
                for key in ("gender", "age_band", "body_style", "face_shape", "hair", "outfit", "palette")
            )
            if signature in generated_signatures:
                raise CastValidationError(
                    f"Duplicate generated design signature: {record['id']} {signature}"
                )
            generated_signatures.add(signature)
            age = float(values["age"])
            if age in age_values:
                raise CastValidationError(f"Duplicate exact age macro in generated cast: {age}")
            age_values.add(age)

            if int(build.get("skin_texture_size", 99999)) > 1024:
                raise CastValidationError(f"Generated skin texture exceeds 1024: {record['id']}")
            for piece in build["pieces"]:
                subdir, filename, _kind, suffix, size, _format, _transparent = piece
                limit = 512
                if subdir == "eyebrows":
                    limit = 512
                elif suffix in ("cap", "glasses"):
                    limit = 256
                elif subdir == "clothes" and str(filename).startswith("shoes"):
                    limit = 256
                if int(size) > limit:
                    raise CastValidationError(
                        f"Generated texture exceeds {limit}px: "
                        f"{record['id']} {subdir}/{filename}={size}"
                    )
                source = catalog.get((subdir, filename))
                if source is None:
                    raise CastValidationError(
                        f"Generated asset is not in the license catalog: "
                        f"{record['id']} {subdir}/{filename}"
                    )
                asset_refs.add((subdir, filename, source["license"]))
            skin_source = catalog.get(("skins", build["skin"]))
            if skin_source is None:
                raise CastValidationError(
                    f"Generated skin is not in the license catalog: {build['skin']}"
                )
            asset_refs.add(("skins", build["skin"], skin_source["license"]))
            expected_sources = {
                catalog[(piece[0], piece[1])]["id"] for piece in build["pieces"]
            }
            expected_sources.add(skin_source["id"])
            if set(build.get("license_sources", ())) != expected_sources:
                raise CastValidationError(
                    f"License-source manifest mismatch in {record['id']}: "
                    f"{build.get('license_sources')} vs {sorted(expected_sources)}"
                )
        else:
            asset_refs.add(("skins", build["skin"], "authored-header"))
            for piece in build["pieces"]:
                asset_refs.add((piece[0], piece[1], "authored-header"))

    found_root = asset_root.resolve() if asset_root else discover_asset_root()
    license_counts: Counter[str] = Counter()
    if check_installed:
        if found_root is None:
            raise CastValidationError(
                "Could not discover installed MPFB assets; pass --asset-root or --skip-installed-check"
            )
        for subdir, filename, declared_license in sorted(asset_refs):
            path = _find_installed_asset(found_root, subdir, filename)
            if path is None:
                raise CastValidationError(f"Licensed asset is not installed: {subdir}/{filename}")
            actual_license = _license_from_header(path)
            if actual_license is None:
                raise CastValidationError(f"No CC0/CC-BY license header in installed asset: {path}")
            if not _license_allowed(actual_license, allowed_licenses):
                raise CastValidationError(f"Disallowed installed asset license {actual_license}: {path}")
            if declared_license != "authored-header" and declared_license == "CC0-1.0" and actual_license != "CC0-1.0":
                raise CastValidationError(
                    f"Catalog says CC0 but installed header says {actual_license}: {subdir}/{filename}"
                )
            license_counts[actual_license] += 1
    else:
        license_counts.update(declared for _, _, declared in asset_refs)

    counts = Counter(record["status"] for record in records)
    generated_records = [record for record in records if record["status"] == "generated"]
    return {
        "total": len(records),
        "authored": counts["authored"],
        "generated": counts["generated"],
        "queued": counts["queued"],
        "unique_generated_designs": len(generated_signatures),
        "distinct_generated_ages": len(age_values),
        "role_signaled_generated": role_signaled,
        "diversity": {
            field: len({record["build"]["design"][field] for record in generated_records})
            for field in ("gender", "age_band", "body_style", "face_shape", "hair", "outfit", "palette")
        },
        "asset_root": str(found_root) if found_root else None,
        "licensed_asset_files": sum(license_counts.values()),
        "licenses": dict(sorted(license_counts.items())),
        "texture_budget": designs["texture_budget"],
    }


def resolve_and_validate(
    roster_path: Path = DEFAULT_ROSTER,
    designs_path: Path = DEFAULT_DESIGNS,
    legacy_presets: Mapping[str, Mapping[str, Any]] | None = None,
    *,
    asset_root: Path | None = None,
    check_installed: bool = True,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    records, roster, designs = resolve_cast(roster_path, designs_path, legacy_presets)
    report = validate_cast(
        records, roster, designs, asset_root=asset_root, check_installed=check_installed
    )
    return records, report


def load_generated_build_presets(
    legacy_presets: Mapping[str, Mapping[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Return deterministic generated-cast builds consumed by the Blender script."""

    records, _report = resolve_and_validate(legacy_presets=legacy_presets)
    generated = {
        str(record["id"]): dict(record["build"])
        for record in records
        if record["status"] == "generated"
    }
    collisions = set(legacy_presets) & set(generated)
    if collisions:
        raise CastValidationError(
            f"Generated designs would replace authored presets: {sorted(collisions)}"
        )
    return generated


def _arguments(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--roster", type=Path, default=DEFAULT_ROSTER)
    parser.add_argument("--designs", type=Path, default=DEFAULT_DESIGNS)
    parser.add_argument("--asset-root", type=Path, default=None)
    parser.add_argument(
        "--skip-installed-check",
        action="store_true",
        help="Validate catalog policy without checking the local MPFB installation.",
    )
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument(
        "--dry-run", action="store_true", help="Validate and list all generated outputs."
    )
    actions.add_argument("--count", action="store_true", help="Print the validated count report as JSON.")
    actions.add_argument("--id", dest="character_id", help="Print one fully resolved cast record as JSON.")
    actions.add_argument("--json", action="store_true", help="Print all fully resolved records as JSON.")
    actions.add_argument("--emit", type=Path, help="Write all resolved records to a JSON file.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _arguments(argv)
    try:
        records, report = resolve_and_validate(
            args.roster,
            args.designs,
            asset_root=args.asset_root,
            check_installed=not args.skip_installed_check,
        )
    except CastValidationError as exc:
        print(f"CAST_INVALID {exc}", file=sys.stderr)
        return 2

    if args.character_id:
        record = next((item for item in records if item["id"] == args.character_id), None)
        if record is None:
            print(f"CAST_INVALID unknown roster id: {args.character_id}", file=sys.stderr)
            return 2
        print(json.dumps(record, ensure_ascii=False, indent=2))
    elif args.json:
        print(json.dumps({"report": report, "characters": records}, ensure_ascii=False, indent=2))
    elif args.emit:
        args.emit.parent.mkdir(parents=True, exist_ok=True)
        args.emit.write_text(
            json.dumps({"report": report, "characters": records}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"CAST_VALID wrote={args.emit} total={report['total']}")
    elif args.dry_run:
        print(
            "CAST_DRY_RUN "
            f"total={report['total']} authored={report['authored']} "
            f"generated={report['generated']} queued={report['queued']} "
            f"unique={report['unique_generated_designs']} licensed={report['licensed_asset_files']}"
        )
        for record in records:
            if record["status"] != "generated":
                continue
            design = record["build"]["design"]
            print(
                f"GENERATED {record['id']} -> {record['build']['output_name']} "
                f"{design['gender']}/{design['age_band']}/{design['body_style']}/"
                f"{design['face_shape']}/{design['hair']}/{design['outfit']}/{design['palette']}"
            )
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
