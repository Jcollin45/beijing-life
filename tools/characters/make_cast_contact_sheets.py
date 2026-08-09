#!/usr/bin/env python3
"""Compose paired LOD0/LOD2 character renders and compute conservative image sanity metrics."""

from __future__ import annotations

import json
import math
import statistics
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat


THUMB_W = 280
THUMB_H = 436
COLS = 5
ROWS = 4
PER_SHEET = COLS * ROWS
PAD = 8
LABEL_H = 42
CELL_W = THUMB_W * 2 + PAD * 2
CELL_H = THUMB_H + LABEL_H + 30
HEADER_H = 54


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
             "/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/System/Library/Fonts/SFNS.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size)
            except OSError:
                pass
    return ImageFont.load_default()


TITLE_FONT = font(26, bold=True)
ID_FONT = font(16, bold=True)
SMALL_FONT = font(13)


def fit_image(source: Image.Image) -> Image.Image:
    image = source.convert("RGB")
    image.thumbnail((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
    result = Image.new("RGB", (THUMB_W, THUMB_H), (22, 24, 28))
    result.paste(image, ((THUMB_W - image.width) // 2, (THUMB_H - image.height) // 2))
    return result


def image_metrics(lod0: Image.Image, lod2: Image.Image) -> dict[str, float]:
    a = lod0.convert("RGB").resize((90, 140), Image.Resampling.LANCZOS)
    b = lod2.convert("RGB").resize((90, 140), Image.Resampling.LANCZOS)
    difference = ImageChops.difference(a, b)
    diff_stat = ImageStat.Stat(difference)
    mean_abs = statistics.fmean(diff_stat.mean) / 255.0
    rms = math.sqrt(statistics.fmean(value * value for value in diff_stat.rms)) / 255.0

    gray0 = a.convert("L")
    gray2 = b.convert("L")
    stat0 = ImageStat.Stat(gray0)
    stat2 = ImageStat.Stat(gray2)
    return {
        "lodMeanAbsoluteDifference": round(mean_abs, 5),
        "lodRmsDifference": round(rms, 5),
        "lod0LumaMean": round(stat0.mean[0], 2),
        "lod0LumaStdDev": round(stat0.stddev[0], 2),
        "lod2LumaMean": round(stat2.mean[0], 2),
        "lod2LumaStdDev": round(stat2.stddev[0], 2),
    }


def compose(output: Path) -> None:
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    pairs = manifest.get("pairs", [])
    metrics = []
    warnings = []

    for pair in pairs:
        lod0_path = output / pair["lod0"]
        lod2_path = output / pair["lod2"]
        if not lod0_path.exists() or not lod2_path.exists():
            warnings.append(f"{pair['id']}: missing PNG")
            continue
        with Image.open(lod0_path) as lod0, Image.open(lod2_path) as lod2:
            values = image_metrics(lod0, lod2)
        values["id"] = pair["id"]
        metrics.append(values)
        # The two tiers are rendered with an identical camera and materials. A very large frame
        # difference is therefore a useful triage signal for a missing garment or identity swap,
        # while the final decision remains visual.
        if values["lodMeanAbsoluteDifference"] > 0.09:
            warnings.append(
                f"{pair['id']}: high LOD image delta {values['lodMeanAbsoluteDifference']:.3f}"
            )
        if min(values["lod0LumaStdDev"], values["lod2LumaStdDev"]) < 4.0:
            warnings.append(f"{pair['id']}: nearly blank/flat render")

    sheet_paths = []
    page_count = math.ceil(len(pairs) / PER_SHEET)
    for page in range(page_count):
        page_pairs = pairs[page * PER_SHEET:(page + 1) * PER_SHEET]
        sheet = Image.new(
            "RGB",
            (COLS * CELL_W + PAD * 2, HEADER_H + ROWS * CELL_H + PAD),
            (12, 14, 18),
        )
        draw = ImageDraw.Draw(sheet)
        draw.text(
            (PAD + 4, 12),
            f"Production cast {page + 1}/{page_count} — exact identity at LOD0 | LOD2",
            fill=(239, 236, 227),
            font=TITLE_FONT,
        )
        for slot, pair in enumerate(page_pairs):
            row, col = divmod(slot, COLS)
            x = PAD + col * CELL_W
            y = HEADER_H + row * CELL_H
            draw.rounded_rectangle(
                (x + 2, y + 2, x + CELL_W - 4, y + CELL_H - 4),
                radius=8,
                fill=(27, 30, 36),
                outline=(64, 69, 80),
                width=1,
            )
            label = f"{pair['index']:02d}  {pair['id']}"
            if draw.textlength(label, font=ID_FONT) > CELL_W - 20:
                label = label[:66] + "…"
            draw.text((x + 10, y + 9), label, fill=(238, 235, 225), font=ID_FONT)
            top = y + LABEL_H
            with Image.open(output / pair["lod0"]) as source:
                left = fit_image(source)
            with Image.open(output / pair["lod2"]) as source:
                right = fit_image(source)
            sheet.paste(left, (x + PAD, top))
            sheet.paste(right, (x + PAD + THUMB_W, top))
            draw.line((x + PAD + THUMB_W, top, x + PAD + THUMB_W, top + THUMB_H),
                      fill=(100, 105, 116), width=2)
            draw.text((x + PAD + 6, top + THUMB_H + 5), "LOD0 · near", fill=(181, 208, 186),
                      font=SMALL_FONT)
            draw.text((x + PAD + THUMB_W + 7, top + THUMB_H + 5), "LOD2 · distance",
                      fill=(181, 208, 186), font=SMALL_FONT)

        sheet_path = output / f"cast-lod-contact-sheet-{page + 1:02d}.png"
        sheet.save(sheet_path, optimize=True)
        sheet_paths.append(sheet_path.name)

    report = {
        "expectedPairs": manifest.get("expected"),
        "renderedPairs": len(pairs),
        "imagesReviewedByMetrics": len(metrics) * 2,
        "sheets": sheet_paths,
        "warnings": warnings,
        "metrics": metrics,
    }
    (output / "image-metrics.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "pairs": len(pairs),
        "images": len(pairs) * 2,
        "sheets": len(sheet_paths),
        "metricWarnings": len(warnings),
    }))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: make_cast_contact_sheets.py OUTPUT_DIR")
    compose(Path(sys.argv[1]).resolve())

